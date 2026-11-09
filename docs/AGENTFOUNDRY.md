# How LuSaathi was built in AgentFoundry

**History, stated plainly:** LuSaathi v1 (static app, Python/JS heat math, backtest, method freeze at commit `328ed36` / tag `method-freeze-2026-11-09`) was built on **9 Nov 2026** by an AI coding agent working under the author's direction, **outside** AgentFoundry. The work below was then done inside AgentFoundry (AF) desktop IDE **codenow 0.1.80** (Linux AppImage extracted to `/workspace/af/squashfs-root`), free plan, account `talibot@mail.grokbot.com`, on **9 Nov 2026** (America/New_York). No paid API key was used.

AI authorship: code, docs and AF evidence below were written by **Tali Builder (AI agent)** under Tali's direction; the author reviews commits before they ship.

## 1. Project

- Opened as an AF project (`+` → Open Project Folder → `/workspace/projects/code-for-a-billion/lusaathi`).
- Screenshot: `docs/agentfoundry/01-project-open.png`.

## 2. SMART-Code

| Prompt | Output file(s) | Model (AF routing) | Kept / changed by hand |
|---|---|---|---|
| Add Marathi (`mr`) strings to `lib/i18n.js` | `lib/i18n.js` (+ scaffold); transcript `agentfoundry/smartcode-marathi.txt`; screenshots `02-smartcode-marathi-*.png` | SMART-Code (gpt-5-mini via "Smart") | **Split.** SMART-Code hit its **10-round tool-use cap**, left `lib/intent.js` untouched, wrote no tests. Hand-fix (commit `1162059`) fixed Marathi wording (see `agentfoundry/REVIEW_NOTES.md`), wired `intent.js` / `advisor.js` / `app.js` / language cycle, added tests. Untouched SMART-Code diff saved as `agentfoundry/smartcode-diff.patch`. |
| Follow-ups: Marathi intent + tests | `lib/intent.js`, `tests/js/marathi.test.js`; transcripts `smartcode-marathi-intent.txt`, `smartcode-marathi-tests.txt`; screenshots `03`, `04` | SMART-Code | Cap / empty replies again; 3 of 6 SMART-Code tests failed. Hand-fixed. |
| Review every Hindi string; accept/reject table only (no edits) | `agentfoundry/hindi-review-table.md`, transcript `smartcode-hindi-review.txt`, screenshot `05-smartcode-hindi-review.png` | SMART-Code | **15 suggestions verified by hand** (commit `3a5c011`): **4 accept, 3 modify, 8 reject**. Decisions: `agentfoundry/hindi-review-decisions.md`. Notable reject: claimed missing Hindi NDMA noon line — false; present in `lib/advisor.js`. |

Transcripts: `agentfoundry/`.

## 3. Agent Studio

Manifest: `.codenow/agent-studio/agents/lusaathi-heat-advisor.json`.
Prompt: `.codenow/agent-studio/prompts/lusaathi-heat-advisor-system.md` (six-step chain + four guardrails: never override IMD/NDMA/State alerts; no medical diagnosis; always 108/112 on heat-stroke signs; no personal data).
Screenshots: `06-agent-studio-build.png`, `07-agent-studio-saved.png`.
Notes: `agentfoundry/agent-studio-notes.md`. Commit: **`ab1de4b`**.

AF draft vs final:

- AF Visual Tool Builder created six TypeScript stubs (`tools/*.ts`) importing `@anthropic-ai/claude-agent-sdk` + `zod`, but left manifest `"tools": []` (**stubs not attached**).
- Saving via the IDE editor dropped `plan` / `kit` / related fields and wrote `runsAt` / `invocationUrl` as the string `"undefined"`.
- AF also scaffolded a full `lusaathi-heat-advisor/` kit that required a paid `ANTHROPIC_API_KEY` — **removed entirely**.
- Tali Builder replaced stubs with `tools/*.mjs` wrappers over existing `lib/*.js`, wired the six tools in order, attached smoke + parser evals, kept `defenseclaw.yaml` (no secrets).

## 4. Evals

Suite: `.codenow/agent-studio/evals/lusaathi-parser.json` — 40 cases (EN 19 / HI 8 / Hinglish 6 / Marathi 7), including `"12 am"`, `"abhi"` / `आता`, aliases, midnight, welding.
CLI result: **40/40** (`npm run evals`) — `agentfoundry/evals/parser-results.md`. Commit: **`6e7b45a`**.
Parser bugs found and fixed (not method): (1) Devanagari `आता` → wantsNow + `mr`; (2) `midnight` → hour 0; (3) `welding` → moderate. Decisions: `agentfoundry/evals/parser-decisions.md`.

In-IDE Evals ran through SMART-Code (LLM) rather than `parse_intent`: **22 pass / 17 fail / 1 empty** (screenshot `08-evals-parser.png`). Smoke in-IDE: **1/6** (`08-evals-smoke.png`). Same suite via the real tool is 40/40 — see `agentfoundry/runs/COMPARISON.md`.

## 5. Runs / Replay

**IDE baseline (LLM without tools):** RUN > Runs said "No runs recorded yet" (`runs-empty.png`). EVAL > Trace stored three SMART-Code replies with **no tool calls** and a generic security system prompt (not our agent prompt). Copy JSON failed. Verbatim summaries: `agentfoundry/runs/ide-baseline.md`. Screenshots: `09-run-delhi.png`, `10-run-jaipur-hi.png`, `11-run-kolkata.png`.

**Honest substitute:** `scripts/replay-runs.mjs` (`npm run replay`) runs the real wired chain offline against archived 2024-05-28 fixtures (Delhi heat-wave day from the backtest; Jaipur / Kolkata sliced from the same season cache). Step traces: `agentfoundry/runs/{delhi,jaipur-hi,kolkata}.json`. Walkthrough: `agentfoundry/runs/REPLAY.md`. Comparison table: `agentfoundry/runs/COMPARISON.md`.

Replay results (fixture NOW = 2024-05-28T06:00Z):

| Run | Verdict | Cat | 108/112 | IMD | Language |
|---|---|---:|---|---|---|
| Delhi today 3 pm heavy | High risk — 10 min work / 50 min rest | 5 | yes | level 1 | en |
| Jaipur कल 3 बजे छत | जोखिम अधिक — 20 मिनट काम | 5 | yes | yes | **hi** |
| Kolkata tomorrow 1 pm moderate | High risk — 20 min work / 40 min rest | 5 | yes | yes | en |

Bugs fixed while building replay (not method logic):

1. Explicit English workload words `moderate` / `easy` were missing from `lib/intent.js` (activity synonyms only).
2. Q&A `answer()` omitted the 108/112 heat-stroke line that the UI disclaimer and WhatsApp advisory already had — added a one-line reminder in all three languages.

Regression: `tests/js/replay_runs.test.mjs`.

## 6. What was written by hand

- Marathi wording fixes, intent/advisor/app wiring, tests (after SMART-Code caps).
- Hindi review verification table and the three accepted-with-edits string changes.
- All `tools/*.mjs`, replay harness, parser eval CLI, docs, CI-facing test updates.
- Removal of the paid Anthropic Agent SDK kit and unattached `.ts` stubs.

## 7. IDE issues (honest list)

1. SMART-Code **10-round tool-use cap**, then **empty replies**.
2. Agent Studio **tools generated but not attached** to the agent manifest.
3. IDE editor **dropped fields** on save (`plan` / `kit`; `"undefined"` URLs).
4. **RUN > Runs** never recorded runs ("No runs recorded yet").
5. **Copy JSON** failed with "Copy failed".
6. **Evals routed to the LLM** (SMART-Code) instead of the declared tools — 22/40 vs CLI 40/40.
7. Trace used a **generic security system prompt**, not the Agent Studio prompt; **no tool calls** in Trace.
8. Integrated terminal **`execvp` failure** on some shell launches (workaround: run tests in an external shell).
9. Tool execution appears to need the **paid Agent SDK kit** — removed on purpose; free hosted model cannot bind our `.mjs` tools.

## 8. Commits (AF work on `main`)

| Item | Commit | Evidence |
|---|---|---|
| Marathi via SMART-Code + hand fixes | `1162059` | `REVIEW_NOTES.md`, `smartcode-diff.patch`, screenshots 02–04 |
| Hindi review | `3a5c011` | `hindi-review-decisions.md`, screenshot 05 |
| Agent Studio | `ab1de4b` | `agent-studio-notes.md`, screenshots 06–07, `tools/*.mjs` |
| Parser Evals | `6e7b45a` | `evals/parser-results.md`, screenshot 08 |
| Runs/Replay + docs | `09de88e` | `runs/*`, screenshots 09–11, this file |

Method freeze commit `328ed36` was **not** modified.
