# Agent Studio — LuSaathi Heat Advisor (AF work-list item 4)

Date: 2026-11-09 (America/New_York). Method frozen at `328ed36` — no WBGT/risk logic changes.
Builder said inference is AgentFoundry-served (Claude Sonnet 4.6); no user API key required for Studio chat.

## Known IDE issues (documented, not fixed upstream)

1. **Stubs generated but not attached.** AgentFoundry Visual Tool Builder wrote six TypeScript stubs under `tools/*.ts` (`parse_intent`, `geocode`, `forecast`, `heat_stress`, `imd_status`, `advise`) that import `@anthropic-ai/claude-agent-sdk` + `zod`, but the agent manifest kept `"tools": []`. The stubs were never listed, so Studio could not discover/bind them.
2. **Saving via the IDE editor dropped `plan` / `kit` fields.** After the guided build, the on-disk manifest lost kit/plan/memoryConfig/authMode/tags that `baseManifest()` normally writes (kit would have been `claude-agent-sdk-ts`). `runsAt` and `invocationUrl` were also saved as the string `"undefined"`. Restored sensible `runsAt` / empty `invocationUrl`; did **not** restore `kit: claude-agent-sdk-ts` because that kit requires a paid Anthropic API key, which AF_STEPS forbids keeping.

## What the IDE wrote (inventory)

| Path | Role | Disposition |
|------|------|-------------|
| `.codenow/agent-studio/agents/lusaathi-heat-advisor.json` | Agent manifest | **Kept / fixed** — tools + evals wired; `"undefined"` strings cleaned |
| `.codenow/agent-studio/prompts/lusaathi-heat-advisor-system.md` | System prompt with 6 steps + 4 guardrails | **Kept / tightened** — same guardrails, clearer tool-chain wording |
| `.codenow/agent-studio/evals/lusaathi-heat-advisor-smoke.json` | Smoke eval (was hello-world only) | **Rewritten** — cases reference real tool names + 108/Never-override |
| `tools/*.ts` (6 stubs) | Claude Agent SDK MCP tool scaffolds | **Removed** — paid SDK + empty schemas; replaced by `.mjs` wrappers |
| `lusaathi-heat-advisor/` | Full kit scaffold (`agent.ts`, `handler.ts`, `START_HERE.md`, `START_HERE` requiring an Anthropic API key env var, `@anthropic-ai/claude-agent-sdk`, `@supabase/supabase-js`, …) | **Removed entirely** — paid API key scaffold |
| `defenseclaw.yaml` | Cisco AI Defense / DefenseClaw observe-mode policy (no secrets) | **Kept** — harmless scanners + PII redact list; empty `network_allow` fine in observe mode |
| `package.json` (+ `zod`) | IDE added free but unused dep for stubs | **Reverted** to HEAD — `npm test` unchanged |
| `.gitignore` (+ `.env`, `.env.local`, `.codenow/runs/`) | Keep secrets & run JSONL out of git | **Kept** |
| `.codenow/sessions/` | IDE chat/session tokens | **Still gitignored** — never commit |
| `docs/agentfoundry/06-agent-studio-build.png`, `07-agent-studio-saved.png` | Screenshots from Studio build/save | **Kept** |

## What Tali Builder (AI agent) changed

1. Deleted `lusaathi-heat-advisor/` and the six `tools/*.ts` stubs (paid SDK / API-key path).
2. Implemented `tools/{parse_intent,geocode,forecast,heat_stress,imd_status,advise}.mjs` as thin wrappers over existing `lib/*.js` (intent, gazetteer+coords, Open-Meteo/`buildForecast`, frozen `assessHour`, `imdHeatwave`, `answer`/`advisoryText`). Shared `tools/_fetch.mjs` for injectable fetch in offline tests. Converted to `.mjs` + JSDoc because the repo has no TypeScript build step.
3. Wired manifest `"tools"` in chain order and attached the smoke eval; fixed `"undefined"` URL fields.
4. Added `tests/js/agent_studio_tools.test.mjs` (offline wrappers + manifest/prompt assertions).
5. Wrote this notes file.

## defenseclaw.yaml

Cisco-style **DefenseClaw** policy (AgentFoundry default v0.1.9): skills scanner, MCP allowlist, CodeGuard (secrets / unsafe deserialisation / weak crypto / injection), and a runtime guardrail proxy in **`observe`** mode with `fail_mode: open`. No API keys or credentials in the file. Kept as documentation of AF's safety posture; it does not change LuSaathi heat math or CI.
