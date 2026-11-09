// Thin AgentFoundry tool wrapper over lib/advisor.js answer + advisoryText.
import { answer, advisoryText } from '../lib/advisor.js';
import { parseQuestion } from '../lib/intent.js';

export const toolDef = {
  name: 'advise',
  description: 'Provide localized heat guidance respecting official alerts.',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Original worker question (for language/hour/place)' },
      nowIso: { type: 'string', description: 'Optional ISO "now"' },
      fc: { type: 'object', description: 'Forecast object from forecast tool (_fc) or buildForecast' },
      mode: { type: 'string', description: 'answer (Q&A) | advisory (WhatsApp blurb); default answer' },
      lang: { type: 'string', description: 'Override language for advisory mode' },
      workload: { type: 'string' },
      url: { type: 'string', description: 'Optional link embedded in WhatsApp advisory' },
    },
    required: ['fc'],
  },
};

/**
 * @param {{ text?: string, nowIso?: string, fc: object, mode?: string, lang?: string, workload?: string, url?: string }} args
 */
export async function run(args) {
  const fc = args.fc;
  if (!fc || !fc.hours) {
    const err = { ok: false, error: 'fc with hours/days required (pass forecast tool data._fc)' };
    return { content: [{ type: 'text', text: JSON.stringify(err) }], data: err };
  }
  const now = args.nowIso ? new Date(args.nowIso) : new Date();
  const workload = args.workload || fc.workload || 'moderate';
  const mode = args.mode || 'answer';
  if (mode === 'advisory') {
    const lang = args.lang || 'en';
    const text = advisoryText(fc, lang, workload, args.url || '');
    const data = { ok: true, mode, lang, text };
    return { content: [{ type: 'text', text }], data };
  }
  const q = parseQuestion(args.text || 'Can I work now?', now);
  const text = answer(q, fc, now, workload);
  const data = { ok: true, mode: 'answer', lang: q.lang, text, parsed: q };
  return { content: [{ type: 'text', text }], data };
}

export default { toolDef, run };
