// Thin AgentFoundry tool wrapper: gazetteer name → coordinates.
// Offline: built-in coords for common Indian cities (matches app fixtures).
// Online (optional): Open-Meteo geocoding via lib/model.geocodeUrl.
import { PLACES } from '../lib/gazetteer.js';
import { classifyRegion } from '../lib/imd.js';
import { geocodeUrl } from '../lib/model.js';
import { getFetch } from './_fetch.mjs';

/** Built-in coords so tests and Agent Studio runs do not need a network. */
export const COORDS = {
  Delhi: { lat: 28.65195, lon: 77.23149, elevation: 227 },
  Mumbai: { lat: 19.07283, lon: 72.88261, elevation: 14 },
  Kolkata: { lat: 22.57264, lon: 88.36389, elevation: 9 },
  Chennai: { lat: 13.08784, lon: 80.27847, elevation: 7 },
  Bengaluru: { lat: 12.97194, lon: 77.59369, elevation: 920 },
  Hyderabad: { lat: 17.38405, lon: 78.45636, elevation: 505 },
  Ahmedabad: { lat: 23.02579, lon: 72.58727, elevation: 53 },
  Pune: { lat: 18.51957, lon: 73.85535, elevation: 560 },
  Jaipur: { lat: 26.91962, lon: 75.78781, elevation: 431 },
  Lucknow: { lat: 26.83928, lon: 80.92313, elevation: 126 },
  Nagpur: { lat: 21.14631, lon: 79.08491, elevation: 310 },
  Indore: { lat: 22.71774, lon: 75.8689, elevation: 553 },
  Bhopal: { lat: 23.25469, lon: 77.40289, elevation: 523 },
  Patna: { lat: 25.59409, lon: 85.13563, elevation: 53 },
  Surat: { lat: 21.19555, lon: 72.83023, elevation: 13 },
  Chandigarh: { lat: 30.73629, lon: 76.7884, elevation: 321 },
  Gurugram: { lat: 28.4601, lon: 77.02635, elevation: 217 },
  Noida: { lat: 28.57, lon: 77.32, elevation: 200 },
  Dehradun: { lat: 30.3165, lon: 78.0322, elevation: 640 },
  Shimla: { lat: 31.1048, lon: 77.1734, elevation: 2276 },
  Kochi: { lat: 9.9312, lon: 76.2673, elevation: 3 },
  Visakhapatnam: { lat: 17.6868, lon: 83.2185, elevation: 45 },
  Bhubaneswar: { lat: 20.2961, lon: 85.8245, elevation: 45 },
  Ranchi: { lat: 23.3441, lon: 85.3096, elevation: 651 },
  Guwahati: { lat: 26.1445, lon: 91.7362, elevation: 55 },
  Nashik: { lat: 19.9975, lon: 73.7898, elevation: 560 },
  Aurangabad: { lat: 19.8762, lon: 75.3433, elevation: 568 },
  Jodhpur: { lat: 26.2389, lon: 73.0243, elevation: 231 },
  Bikaner: { lat: 28.0229, lon: 73.3119, elevation: 242 },
  Varanasi: { lat: 25.3176, lon: 82.9739, elevation: 80 },
  Agra: { lat: 27.1767, lon: 78.0081, elevation: 171 },
  Kanpur: { lat: 26.4499, lon: 80.3319, elevation: 126 },
};

function resolveCanonical(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  for (const [canon, aliases] of PLACES) {
    if (canon.toLowerCase() === lower) return canon;
    if (aliases.some((a) => a.toLowerCase() === lower)) return canon;
  }
  // Title-case fallback for COORDS keys
  for (const key of Object.keys(COORDS)) {
    if (key.toLowerCase() === lower) return key;
  }
  return raw;
}

export const toolDef = {
  name: 'geocode',
  description: 'Resolve the requested place to geographic coordinates.',
  inputSchema: {
    type: 'object',
    properties: {
      place: { type: 'string', description: 'Place name (EN/HI/Hinglish/Marathi)' },
      lang: { type: 'string', description: 'Language hint for online geocoding (en|hi|mr)' },
      allowNetwork: { type: 'boolean', description: 'If true and place unknown, call Open-Meteo (default false)' },
    },
    required: ['place'],
  },
};

/**
 * @param {{ place: string, lang?: string, allowNetwork?: boolean }} args
 */
export async function run(args) {
  const canon = resolveCanonical(args?.place);
  if (!canon) {
    const err = { ok: false, error: 'empty place' };
    return { content: [{ type: 'text', text: JSON.stringify(err) }], data: err };
  }
  let hit = COORDS[canon];
  let source = 'gazetteer';
  if (!hit && args?.allowNetwork) {
    const fetch = getFetch();
    const lang = args.lang || 'en';
    const res = await fetch(geocodeUrl(canon, lang));
    const d = await res.json();
    const r = (d.results || []).find((x) => x.country_code === 'IN');
    if (r) {
      hit = { lat: r.latitude, lon: r.longitude, elevation: r.elevation };
      source = 'open-meteo';
    }
  }
  if (!hit) {
    const err = { ok: false, error: 'place not in built-in gazetteer; pass allowNetwork:true to geocode online', place: canon };
    return { content: [{ type: 'text', text: JSON.stringify(err) }], data: err };
  }
  const region = classifyRegion(hit.lat, hit.lon, hit.elevation);
  const data = {
    ok: true,
    name: canon,
    lat: hit.lat,
    lon: hit.lon,
    elevation: hit.elevation,
    region,
    source,
  };
  return { content: [{ type: 'text', text: JSON.stringify(data) }], data };
}

export default { toolDef, run };
