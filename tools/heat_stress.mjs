// Thin AgentFoundry tool wrapper over lib/heat.js assessHour (frozen radiation-gated WBGT).
import { assessHour, BOM_MIN_SW_WM2 } from '../lib/heat.js';

export const toolDef = {
  name: 'heat_stress',
  description: 'Estimate WBGT heat stress from forecast conditions.',
  inputSchema: {
    type: 'object',
    properties: {
      tC: { type: 'number', description: 'Air temperature °C' },
      rh: { type: 'number', description: 'Relative humidity %' },
      wind10kmh: { type: 'number', description: '10 m wind km/h' },
      ghi: { type: 'number', description: 'Shortwave / GHI W/m²' },
      direct: { type: 'number', description: 'Direct radiation W/m²' },
      diffuse: { type: 'number', description: 'Diffuse radiation W/m²' },
      pHpa: { type: 'number', description: 'Surface pressure hPa' },
      utcMs: { type: 'number', description: 'UTC epoch ms for the hour' },
      lat: { type: 'number' },
      lon: { type: 'number' },
      workload: { type: 'string', description: 'easy|moderate|hard' },
    },
    required: ['tC', 'rh', 'utcMs', 'lat', 'lon'],
  },
};

/**
 * @param {object} args
 */
export async function run(args) {
  const a = assessHour({
    tC: Number(args.tC),
    rh: Number(args.rh),
    wind10kmh: Number(args.wind10kmh || 0),
    ghi: Number(args.ghi || 0),
    direct: args.direct,
    diffuse: args.diffuse,
    pHpa: args.pHpa,
    utcMs: Number(args.utcMs),
    lat: Number(args.lat),
    lon: Number(args.lon),
  }, args.workload || 'moderate');
  const data = {
    ok: true,
    bomMinSwWm2: BOM_MIN_SW_WM2,
    wbgt: a.wbgt,
    wbgtGlobe: a.wbgtGlobe,
    wbgtBom: a.wbgtBom,
    wbgtSource: a.wbgtSource,
    category: a.category,
    strongSun: a.strongSun,
    workRest: a.workRest,
    tw: a.tw,
    hi: a.hi,
    hiOutOfRange: a.hiOutOfRange,
  };
  return { content: [{ type: 'text', text: JSON.stringify(data) }], data };
}

export default { toolDef, run };
