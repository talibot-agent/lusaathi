// Thin AgentFoundry tool wrapper over lib/imd.js heat-wave criteria.
import { imdHeatwave, consecutiveDays, classifyRegion } from '../lib/imd.js';

export const toolDef = {
  name: 'imd_status',
  description: 'Check applicable IMD, NDMA and State heat-action-plan alerts.',
  inputSchema: {
    type: 'object',
    properties: {
      tmax: { type: 'number', description: 'Daily max temperature °C' },
      normal: { type: 'number', description: 'Climatological normal Tmax °C (optional)' },
      region: { type: 'string', description: 'plains|coastal|hills' },
      lat: { type: 'number', description: 'Optional lat to classify region' },
      lon: { type: 'number', description: 'Optional lon to classify region' },
      elevation: { type: 'number' },
      priorLevels: {
        type: 'array',
        description: 'Optional prior-day IMD levels for the 2-day rule',
        items: { type: 'number' },
      },
    },
    required: ['tmax'],
  },
};

/**
 * @param {{ tmax: number, normal?: number, region?: string, lat?: number, lon?: number, elevation?: number, priorLevels?: number[] }} args
 */
export async function run(args) {
  let region = args.region;
  if (!region && args.lat != null && args.lon != null) {
    region = classifyRegion(Number(args.lat), Number(args.lon), args.elevation);
  }
  region = region || 'plains';
  const imd = imdHeatwave(Number(args.tmax), args.normal == null ? null : Number(args.normal), region);
  const prior = Array.isArray(args.priorLevels) ? args.priorLevels.map(Number) : [];
  const levels = prior.concat([imd.level]);
  const twoDay = consecutiveDays(levels);
  const data = {
    ok: true,
    region,
    imd,
    imd2day: twoDay[twoDay.length - 1],
    note: 'Never override IMD/NDMA/State heat-action-plan alerts. NDMA advises avoiding outdoor work 12:00–15:00 during heat waves.',
  };
  return { content: [{ type: 'text', text: JSON.stringify(data) }], data };
}

export default { toolDef, run };
