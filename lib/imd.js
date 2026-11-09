// IMD heat-wave criteria (single-location simplification). Mirrored in python/lusaathi_core/imd.py.
// Sources:
//  IMD FAQ on Heat Wave: https://internal.imd.gov.in/section/nhac/dynamic/FAQ_heat_wave.pdf
//  NDMA Guidelines – Prevention and Management of Heat-Wave (2017), §1.2:
//    https://nidm.mha.gov.in/pdf/guidelines/new/heatwaveguidelines2017.pdf
//  - Heat wave considered only if Tmax >= 40 °C (plains), >= 37 °C (coastal), >= 30 °C (hilly).
//  - Departure from normal 4.5–6.4 °C = heat wave; > 6.4 °C = severe heat wave.
//  - Plains only: actual Tmax >= 45 °C = heat wave; >= 47 °C = severe heat wave.
//  - Coastal: departure >= 4.5 °C with actual Tmax >= 37 °C = heat wave.
//  - Official declaration needs the criteria at >= 2 stations in a met sub-division on >= 2
//    consecutive days (declared on day 2). LuSaathi works for ONE grid point; see consecutiveDays().
import { COAST } from './coast.js';

export const HILL_ELEVATION_M = 1000;  // simplification: IMD designates hill stations; we use elevation
export const COASTAL_KM = 40;          // simplification: IMD designates coastal stations; we use distance

export function haversineKm(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2
    + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// Distance to nearest coastline segment (local equirectangular projection; fine at <100 km scale).
export function coastDistanceKm(lat, lon) {
  const kx = 111.32 * Math.cos(lat * Math.PI / 180);
  const ky = 110.57;
  let best = Infinity;
  for (const line of COAST) {
    for (let i = 1; i < line.length; i++) {
      const [x1, y1] = line[i - 1];
      const [x2, y2] = line[i];
      if (Math.min(y1, y2) > lat + 2 || Math.max(y1, y2) < lat - 2
        || Math.min(x1, x2) > lon + 2 || Math.max(x1, x2) < lon - 2) continue;
      const ax = (x1 - lon) * kx; const ay = (y1 - lat) * ky;
      const bx = (x2 - lon) * kx; const by = (y2 - lat) * ky;
      const dx = bx - ax; const dy = by - ay;
      const L = dx * dx + dy * dy;
      let t = L > 0 ? -(ax * dx + ay * dy) / L : 0;
      t = Math.max(0, Math.min(1, t));
      const px = ax + t * dx; const py = ay + t * dy;
      const d = Math.sqrt(px * px + py * py);
      if (d < best) best = d;
    }
  }
  return best;
}

export function classifyRegion(lat, lon, elevationM) {
  if (elevationM != null && elevationM >= HILL_ELEVATION_M) return 'hills';
  if (coastDistanceKm(lat, lon) <= COASTAL_KM) return 'coastal';
  return 'plains';
}

/**
 * @param tmax forecast/observed daily max (°C)
 * @param normal climatological normal Tmax for the date (°C) or null if unknown
 * @param region 'plains' | 'coastal' | 'hills'
 * @returns {level: 0|1|2, basis: string|null, departure: number|null}
 *   level 0 = no heat wave, 1 = heat wave, 2 = severe heat wave
 */
export function imdHeatwave(tmax, normal, region = 'plains') {
  const dep = (normal == null || Number.isNaN(normal)) ? null : tmax - normal;
  const res = (level, basis) => ({ level, basis, departure: dep });
  if (region === 'plains') {
    if (tmax < 40) return res(0, null);
    let lvl = 0; let basis = null;
    if (tmax >= 47) { lvl = 2; basis = 'absolute'; } else if (tmax >= 45) { lvl = 1; basis = 'absolute'; }
    if (dep != null) {
      const dl = dep > 6.4 ? 2 : dep >= 4.5 ? 1 : 0;
      if (dl > lvl) { lvl = dl; basis = 'departure'; }
    }
    return res(lvl, basis);
  }
  if (region === 'coastal') {
    if (tmax < 37 || dep == null) return res(0, null);
    return dep >= 4.5 ? res(1, 'departure') : res(0, null);
  }
  // hills
  if (tmax < 30 || dep == null) return res(0, null);
  if (dep > 6.4) return res(2, 'departure');
  if (dep >= 4.5) return res(1, 'departure');
  return res(0, null);
}

/** Mark days where the single-point criterion holds on this day AND the previous day (IMD's 2-day rule). */
export function consecutiveDays(levels) {
  return levels.map((l, i) => (i > 0 && l > 0 && levels[i - 1] > 0 ? Math.min(l, levels[i - 1]) : 0));
}

/** Day-of-year in a non-leap calendar (Feb 29 -> Feb 28). */
export function noLeapDoy(isoDate) {
  const [, m, d] = isoDate.split('-').map(Number);
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return cum[m - 1] + Math.min(d, m === 2 ? 28 : 31);
}

/**
 * Normal Tmax for target date: mean of daily Tmax within ±halfWindow days (by no-leap DOY,
 * circular) over all years supplied (we use ERA5 1991–2020).
 */
export function normalTmax(dates, tmaxs, targetIso, halfWindow = 7) {
  const t = noLeapDoy(targetIso);
  let s = 0; let n = 0;
  for (let i = 0; i < dates.length; i++) {
    const v = tmaxs[i];
    if (v == null) continue;
    let dd = Math.abs(noLeapDoy(dates[i]) - t);
    dd = Math.min(dd, 365 - dd);
    if (dd <= halfWindow) { s += v; n++; }
  }
  return n ? s / n : null;
}
