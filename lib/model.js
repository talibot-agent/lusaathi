// Turns raw Open-Meteo responses into LuSaathi's per-hour / per-day assessment. Pure, testable.
import { assessHour } from './heat.js';
import { imdHeatwave, consecutiveDays, normalTmax } from './imd.js';

export const HOURLY_VARS = ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'wind_speed_10m',
  'shortwave_radiation', 'direct_radiation', 'diffuse_radiation', 'surface_pressure'];
export const WORK_START = 6;
export const WORK_END = 18; // inclusive hourly stamps 06:00–18:00

export function forecastUrl(lat, lon) {
  return 'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4)
    + '&hourly=' + HOURLY_VARS.join(',') + '&timezone=Asia%2FKolkata&forecast_days=4';
}
/** Archived forecast (Open-Meteo Historical Forecast API) for 4 days from startIso – used for the replay demo. */
export function replayUrl(lat, lon, startIso) {
  const end = new Date(Date.parse(startIso + 'T00:00:00Z') + 3 * 86400000).toISOString().slice(0, 10);
  return 'https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4)
    + '&hourly=' + HOURLY_VARS.join(',') + '&timezone=Asia%2FKolkata&start_date=' + startIso + '&end_date=' + end;
}
export function normalsUrl(lat, lon) {
  return 'https://archive-api.open-meteo.com/v1/archive?latitude=' + lat.toFixed(2) + '&longitude=' + lon.toFixed(2)
    + '&start_date=1991-01-01&end_date=2020-12-31&daily=temperature_2m_max&timezone=Asia%2FKolkata&models=era5';
}
export function geocodeUrl(name, lang) {
  return 'https://geocoding-api.open-meteo.com/v1/search?count=6&countryCode=IN&format=json&language='
    + lang + '&name=' + encodeURIComponent(name);
}

/** threshold Tmax at which a normal is needed to decide IMD status */
export const needsNormal = (tmax, region) => tmax >= (region === 'hills' ? 30 : region === 'coastal' ? 37 : 40);

/**
 * @param raw Open-Meteo forecast JSON
 * @param place {name, lat, lon, region}
 * @param normals null | {dates:[], tmax:[]} ERA5 daily Tmax 1991–2020
 */
export function buildForecast(raw, place, workload = 'moderate', normals = null) {
  const H = raw.hourly;
  const off = raw.utc_offset_seconds || 19800;
  const hours = [];
  for (let i = 0; i < H.time.length; i++) {
    const t = H.time[i];
    const tC = H.temperature_2m[i];
    const rh = H.relative_humidity_2m[i];
    if (tC == null || rh == null) continue;
    const [d, hm] = t.split('T');
    const [y, mo, da] = d.split('-').map(Number);
    const hh = Number(hm.slice(0, 2));
    const utcMs = Date.UTC(y, mo - 1, da, hh) - off * 1000;
    const a = assessHour({
      tC, rh, wind10kmh: H.wind_speed_10m[i], ghi: H.shortwave_radiation[i], direct: H.direct_radiation?.[i],
      diffuse: H.diffuse_radiation?.[i], pHpa: H.surface_pressure?.[i], utcMs, lat: place.lat, lon: place.lon,
    }, workload);
    hours.push({ time: t, date: d, hour: hh, utcMs, tC, rh, app: H.apparent_temperature?.[i],
      wind: H.wind_speed_10m[i], ghi: H.shortwave_radiation[i], ...a });
  }
  const byDate = new Map();
  for (const h of hours) {
    if (!byDate.has(h.date)) byDate.set(h.date, []);
    byDate.get(h.date).push(h);
  }
  const days = [];
  for (const [date, hs] of byDate) {
    if (hs.length < 20) continue; // incomplete day at the end of the window
    const tmax = Math.max(...hs.map((h) => h.tC));
    const normal = normals ? normalTmax(normals.dates, normals.tmax, date) : null;
    const imd = imdHeatwave(tmax, normal, place.region);
    const work = hs.filter((h) => h.hour >= WORK_START && h.hour <= WORK_END);
    const peak = work.reduce((m, h) => (h.wbgt > m.wbgt ? h : m), work[0] || hs[0]);
    days.push({
      date, tmax, normal, imd, needsNormal: needsNormal(tmax, place.region) && normal == null,
      peakWbgt: peak.wbgt, peakHour: peak.hour, peakCat: peak.category, peakSource: peak.wbgtSource, peakHi: peak.hi,
      dangerousHours: work.filter((h) => h.dangerous).map((h) => h.hour),
      restrictedHours: work.filter((h) => !h.workRest.noLimit).map((h) => h.hour),
    });
  }
  const lv = consecutiveDays(days.map((d) => d.imd.level));
  days.forEach((d, i) => { d.imd2day = lv[i]; });
  return { place, workload, hours, days };
}

/** Compress a list of hours into ranges: [6,7,8,12,13] -> "06–09, 12–14" (end exclusive). */
export function hourRanges(list) {
  if (!list.length) return '';
  const out = [];
  let s = list[0]; let p = list[0];
  for (const h of list.slice(1).concat([null])) {
    if (h !== p + 1) { out.push(`${String(s).padStart(2, '0')}:00–${String(p + 1).padStart(2, '0')}:00`); s = h; }
    p = h;
  }
  return out.join(', ');
}
