import { UI, CAT, IMD, WORKLOAD, REGION, SRC, fmtDate, fmtHour, r0, r1, workRestText } from './lib/i18n.js';
import { classifyRegion } from './lib/imd.js';
import { parseQuestion, isDevanagari } from './lib/intent.js';
import { buildForecast, forecastUrl, replayUrl, normalsUrl, geocodeUrl, needsNormal, hourRanges, WORK_START, WORK_END } from './lib/model.js';
import { answer, advisoryText, waLink } from './lib/advisor.js';

const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const S = {
  lang: qs.get('lang') || localStorage.getItem('ls_lang') || ((navigator.language || '').startsWith('hi') ? 'hi' : 'en'),
  workload: qs.get('w') || localStorage.getItem('ls_w') || 'moderate',
  place: null, raw: null, normals: null, fc: null,
};
const REPLAY = /^\d{4}-\d{2}-\d{2}$/.test(qs.get('replay') || '') ? qs.get('replay') : null;
// IST wall clock in UTC fields (in replay mode: 06:00 on the replay date)
const nowLocal = () => (REPLAY ? new Date(REPLAY + 'T06:00:00Z') : new Date(Date.now() + 19800 * 1000));

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

function applyLang() {
  const T = UI[S.lang];
  document.documentElement.lang = S.lang;
  for (const k of ['title', 'tagline', 'placeLabel', 'search', 'workload', 'region', 'ask', 'askBtn', 'days', 'next72', 'disclaimer', 'forecastBy', 'sources']) {
    const el = $('t-' + k); if (el) el.textContent = T[k];
  }
  $('lang').textContent = T.lang;
  $('place').placeholder = T.placeholder; $('q').placeholder = T.askPlaceholder;
  $('wa').textContent = T.share; $('copy').textContent = T.copy;
  const ws = $('workload');
  ['easy', 'moderate', 'hard'].forEach((w, i) => { ws.options[i].textContent = WORKLOAD[S.lang][w]; });
  const rs = $('region');
  rs.options[0].textContent = T.auto;
  ['plains', 'coastal', 'hills'].forEach((r, i) => { rs.options[i + 1].textContent = REGION[S.lang][r]; });
  const rl = $('replay');
  rl.textContent = REPLAY ? T.live : T.replayLink;
  rl.href = REPLAY ? location.pathname : '?place=Delhi&replay=2024-05-28&lang=' + S.lang;
  $('banner').textContent = REPLAY ? T.replayBanner + ' (' + REPLAY + ')' : '';
  $('banner').hidden = !REPLAY;
  if (S.fc) render();
}

async function geocode(name, lang) {
  const d = await getJSON(geocodeUrl(name, lang || (isDevanagari(name) ? 'hi' : 'en')));
  return (d.results || []).filter((r) => r.country_code === 'IN');
}

async function loadNormals(place) {
  const key = `ls_n_${place.lat.toFixed(2)}_${place.lon.toFixed(2)}`;
  const cached = localStorage.getItem(key);
  let start; let tmax;
  if (cached) ({ start, tmax } = JSON.parse(cached));
  else {
    const d = await getJSON(normalsUrl(place.lat, place.lon));
    start = d.daily.time[0]; tmax = d.daily.temperature_2m_max;
    try { localStorage.setItem(key, JSON.stringify({ start, tmax })); } catch (e) { /* quota */ }
  }
  const t0 = Date.parse(start + 'T00:00:00Z');
  const dates = tmax.map((_, i) => new Date(t0 + i * 86400000).toISOString().slice(0, 10));
  return { dates, tmax };
}

function rebuild() {
  const region = $('region').value === 'auto' ? S.place.autoRegion : $('region').value;
  S.place.region = region;
  S.fc = buildForecast(S.raw, S.place, S.workload, S.normals);
}

async function loadPlace(result) {
  const T = UI[S.lang];
  $('status').textContent = T.loading;
  const place = {
    name: result.name, displayName: result.name + (result.admin1 ? ', ' + result.admin1 : ''),
    lat: result.latitude, lon: result.longitude, elevation: result.elevation,
  };
  place.autoRegion = classifyRegion(place.lat, place.lon, place.elevation);
  S.place = place;
  S.raw = await getJSON(REPLAY ? replayUrl(place.lat, place.lon, REPLAY) : forecastUrl(place.lat, place.lon));
  S.normals = null;
  rebuild();
  if (S.fc.days.some((d) => needsNormal(d.tmax, place.region))) {
    try { S.normals = await loadNormals(place); rebuild(); } catch (e) { /* departure test skipped; shown in UI */ }
  }
  localStorage.setItem('ls_last', JSON.stringify({ result, raw: S.raw, at: Date.now() }));
  $('status').textContent = '';
  const u = new URL(location.href); u.searchParams.set('place', result.name); history.replaceState(null, '', u);
  if (REPLAY) localStorage.removeItem('ls_last');
  render();
}

function render() {
  const T = UI[S.lang]; const L = S.lang; const fc = S.fc;
  $('result').hidden = false;
  $('place-title').textContent = fc.place.displayName;
  $('place-meta').textContent = `${r1(fc.place.lat)}°N ${r1(fc.place.lon)}°E · ${fc.place.elevation ?? '?'} m · ${T.region}: ${REGION[L][fc.place.region]} · ${WORKLOAD[L][S.workload]}`;
  const days = $('days'); days.innerHTML = '';
  for (const d of fc.days.slice(0, 4)) {
    const div = document.createElement('div');
    div.className = 'day b' + d.peakCat;
    const dep = d.imd.departure != null ? `${d.imd.departure >= 0 ? '+' : ''}${r1(d.imd.departure)}°C` : (d.needsNormal ? T.normalPending : '–');
    const wr = fc.hours.find((h) => h.date === d.date && h.hour === d.peakHour)?.workRest;
    div.innerHTML = `<h4>${fmtDate(d.date, L)}</h4>
      <p>${T.tmax}: <b>${r1(d.tmax)}°C</b>${d.normal != null ? ` · ${T.normal} ${r1(d.normal)}°C` : ''} · ${T.dep}: ${dep}</p>
      <p class="${d.imd.level ? 'hw' : ''}">${IMD[L][d.imd.level]}</p>
      <p>${T.peak}: <span class="pill c${d.peakCat}">${r1(d.peakWbgt)}°C · ${CAT[L][d.peakCat]}</span> @ ${fmtHour(d.peakHour)} <span class="muted">(${SRC[L][d.peakSource]})</span></p>
      <p>${T.wr}: ${wr ? workRestText(wr, L) : '–'}</p>
      <p>${T.dangerous}: ${d.dangerousHours.length ? hourRanges(d.dangerousHours) : T.none}</p>`;
    days.appendChild(div);
  }
  const th = $('hours').querySelector('thead');
  th.innerHTML = `<tr><th>${T.hour}</th><th>${T.temp}</th><th>${T.rh}</th><th>${T.tw}</th><th>${T.hi}</th><th>${T.wbgt}</th><th>${T.cat}</th><th>${T.wr}</th><th>${T.water}</th></tr>`;
  const tb = $('hours').querySelector('tbody'); tb.innerHTML = '';
  const now = nowLocal().toISOString().slice(0, 13);
  const hrs = fc.hours.filter((h) => h.time.slice(0, 13) >= now).slice(0, 72);
  let lastDate = '';
  const rows = [];
  for (const h of hrs) {
    if (h.date !== lastDate) { rows.push(`<tr class="daysep"><td colspan="9">${fmtDate(h.date, L)}</td></tr>`); lastDate = h.date; }
    const off = h.hour < WORK_START || h.hour > WORK_END;
    rows.push(`<tr class="${off ? 'off' : ''}"><td>${fmtHour(h.hour)}</td><td>${r0(h.tC)}</td><td>${r0(h.rh)}</td><td>${r1(h.tw)}</td><td>${r0(h.hi)}${h.hiOutOfRange ? '*' : ''}</td>`
      + `<td>${r1(h.wbgt)}<sup>${h.wbgtSource === 'bom' ? 'B' : 'G'}</sup></td><td><span class="pill c${h.category}">${h.category || '–'}</span></td>`
      + `<td>${h.workRest.noLimit ? T.noLimit : `${h.workRest.workMin}/${h.workRest.restMin}`}</td><td>${h.workRest.waterLph} L</td></tr>`);
  }
  tb.innerHTML = rows.join('');
  $('wbgtNote').textContent = T.wbgtNote;
  $('hiNote').textContent = T.hiNote;
  $('hiNote').hidden = !hrs.some((h) => h.hiOutOfRange);
  const share = location.origin + location.pathname + '?place=' + encodeURIComponent(fc.place.name) + '&lang=' + L + (REPLAY ? '&replay=' + REPLAY : '');
  const text = advisoryText(fc, L, S.workload, share);
  $('wa').href = waLink(text);
  $('copy').onclick = () => navigator.clipboard?.writeText(text).then(() => { $('copy').textContent = T.copied; });
}

async function searchAndLoad(name, lang) {
  const T = UI[S.lang];
  try {
    const res = await geocode(name, lang);
    if (!res.length) { $('status').textContent = T.notFound; return false; }
    await loadPlace(res[0]);
    return true;
  } catch (e) {
    $('status').textContent = T.netErr;
    return false;
  }
}

$('place-form').addEventListener('submit', (e) => { e.preventDefault(); const v = $('place').value.trim(); if (v) searchAndLoad(v); });
let sugT;
$('place').addEventListener('input', () => {
  clearTimeout(sugT);
  const v = $('place').value.trim();
  if (v.length < 3) return;
  sugT = setTimeout(async () => {
    try {
      const res = await geocode(v);
      $('place-list').innerHTML = res.map((r) => `<option value="${r.name}">${r.admin1 || ''}</option>`).join('');
    } catch (e) { /* ignore */ }
  }, 400);
});
$('workload').value = S.workload;
$('workload').addEventListener('change', () => { S.workload = $('workload').value; localStorage.setItem('ls_w', S.workload); if (S.raw) { rebuild(); render(); } });
$('region').addEventListener('change', () => { if (S.raw) { rebuild(); render(); } });
$('lang').addEventListener('click', () => { S.lang = S.lang === 'en' ? 'hi' : 'en'; localStorage.setItem('ls_lang', S.lang); applyLang(); });

async function ask() {
  const text = $('q').value.trim() || $('q').placeholder;
  const q = parseQuestion(text, nowLocal());
  const out = $('answer');
  if (q.lang !== S.lang) { S.lang = q.lang; localStorage.setItem('ls_lang', S.lang); applyLang(); }
  if (q.place && (!S.place || (q.place.toLowerCase() !== S.place.name.toLowerCase()))) {
    out.textContent = UI[q.lang].loading;
    const ok = await searchAndLoad(q.place, q.lang);
    if (!ok) { out.textContent = UI[q.lang].notFound; return; }
  }
  if (!S.fc && !q.place) await searchAndLoad(qs.get('place') || 'Nagpur');
  if (!S.fc) { out.textContent = q.lang === 'hi' ? 'पहले जगह का नाम लिखें या सवाल में जगह बताएँ।' : 'Please name a place (in the question or the box above).'; return; }
  if (q.workload && q.workload !== S.workload) { $('workload').value = q.workload; S.workload = q.workload; rebuild(); render(); }
  out.textContent = answer(q, S.fc, nowLocal(), S.workload);
}
$('t-askBtn').addEventListener('click', ask);
$('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(); });

applyLang();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
const start = qs.get('place');
const last = REPLAY ? null : JSON.parse(localStorage.getItem('ls_last') || 'null');
if (qs.get('q')) { $('q').value = qs.get('q'); if (start) $('place').value = start; ask(); } else if (start) { $('place').value = start; searchAndLoad(start); } else if (last && Date.now() - last.at < 3 * 3600e3) {
  $('place').value = last.result.name; loadPlace(last.result).catch(() => {
    S.raw = last.raw; S.place = { name: last.result.name, displayName: last.result.name, lat: last.result.latitude, lon: last.result.longitude, elevation: last.result.elevation };
    S.place.autoRegion = classifyRegion(S.place.lat, S.place.lon, S.place.elevation); rebuild(); render();
  });
} else { $('place').value = 'Nagpur'; searchAndLoad('Nagpur'); }
