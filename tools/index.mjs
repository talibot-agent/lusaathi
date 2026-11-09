/** Ordered tool chain for LuSaathi Heat Advisor (Agent Studio). */
export const TOOL_ORDER = [
  'parse_intent',
  'geocode',
  'forecast',
  'heat_stress',
  'imd_status',
  'advise',
];

import * as parse_intent from './parse_intent.mjs';
import * as geocode from './geocode.mjs';
import * as forecast from './forecast.mjs';
import * as heat_stress from './heat_stress.mjs';
import * as imd_status from './imd_status.mjs';
import * as advise from './advise.mjs';

export const tools = {
  parse_intent,
  geocode,
  forecast,
  heat_stress,
  imd_status,
  advise,
};

export { parse_intent, geocode, forecast, heat_stress, imd_status, advise };
