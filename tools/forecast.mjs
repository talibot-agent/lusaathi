// Thin AgentFoundry tool wrapper: Open-Meteo forecast → lib/model.buildForecast.
// Offline: pass `raw` (Open-Meteo JSON) — same pattern as tests/js/advisor.test.mjs.
import { buildForecast, forecastUrl } from '../lib/model.js';
import { getFetch } from './_fetch.mjs';

export const toolDef = {
  name: 'forecast',
  description: 'Retrieve forecast conditions for the place and hour.',
  inputSchema: {
    type: 'object',
    properties: {
      lat: { type: 'number', description: 'Latitude' },
      lon: { type: 'number', description: 'Longitude' },
      name: { type: 'string', description: 'Place display name' },
      region: { type: 'string', description: 'IMD region: plains|coastal|hills' },
      elevation: { type: 'number', description: 'Elevation metres' },
      workload: { type: 'string', description: 'easy|moderate|hard' },
      raw: { type: 'object', description: 'Optional pre-fetched Open-Meteo hourly JSON (offline)' },
      normals: { type: 'object', description: 'Optional ERA5 normals {dates,tmax}' },
    },
    required: ['lat', 'lon'],
  },
};

/**
 * @param {{ lat: number, lon: number, name?: string, region?: string, elevation?: number, workload?: string, raw?: object, normals?: object }} args
 */
export async function run(args) {
  const place = {
    name: args.name || 'place',
    lat: Number(args.lat),
    lon: Number(args.lon),
    elevation: args.elevation,
    region: args.region || 'plains',
  };
  let raw = args.raw;
  if (!raw) {
    const fetch = getFetch();
    const res = await fetch(forecastUrl(place.lat, place.lon));
    if (!res.ok) {
      const err = { ok: false, error: `forecast HTTP ${res.status}` };
      return { content: [{ type: 'text', text: JSON.stringify(err) }], data: err };
    }
    raw = await res.json();
  }
  const fc = buildForecast(raw, place, args.workload || 'moderate', args.normals || null);
  // Compact summary for the agent; full hours stay available via fc
  const data = {
    ok: true,
    place: fc.place,
    workload: fc.workload,
    dayCount: fc.days.length,
    hourCount: fc.hours.length,
    days: fc.days.map((d) => ({
      date: d.date,
      tmax: d.tmax,
      imdLevel: d.imd.level,
      peakCat: d.peakCat,
      peakHour: d.peakHour,
      peakWbgt: d.peakWbgt,
      dangerousHours: d.dangerousHours,
    })),
    // Retain full forecast object for downstream tools in-process
    _fc: fc,
  };
  return { content: [{ type: 'text', text: JSON.stringify({ ...data, _fc: undefined, hoursSample: fc.hours.slice(0, 2) }) }], data };
}

export default { toolDef, run };
