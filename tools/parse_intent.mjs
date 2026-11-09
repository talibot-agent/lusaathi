// Thin AgentFoundry tool wrapper over lib/intent.js (no paid SDK).
// Converted from AgentFoundry Visual Tool Builder .ts stub (which required
// @anthropic-ai/claude-agent-sdk + zod) to .mjs + JSDoc — repo has no TS build.
import { parseQuestion } from '../lib/intent.js';

/** Tool signature scanned by AgentFoundry studio.scanTools. */
export const toolDef = {
  name: 'parse_intent',
  description: "Parse the worker's place, requested hour, language and advisory intent.",
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Free-text question from the worker' },
      nowIso: { type: 'string', description: 'Optional ISO timestamp for "now" / day offsets (UTC)' },
    },
    required: ['text'],
  },
};

/**
 * @param {{ text: string, nowIso?: string }} args
 * @returns {Promise<{ content: Array<{type:string,text:string}>, data: object }>}
 */
export async function run(args) {
  const text = String(args?.text ?? '');
  const now = args?.nowIso ? new Date(args.nowIso) : new Date();
  const data = parseQuestion(text, now);
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    data,
  };
}

export default { toolDef, run };
