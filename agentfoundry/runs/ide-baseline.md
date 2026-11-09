# IDE Runs / Trace baseline — LLM without tools

Date: 2026-11-09 (America/New_York). AgentFoundry desktop `codenow` 0.1.80.
Method frozen at `328ed36` — no WBGT/risk changes.

## What the IDE did

- **RUN > Runs:** showed "No runs recorded yet" (screenshot `docs/agentfoundry/runs-empty.png`).
- **EVAL > Trace:** stored three runs. Each run is a **single SMART-Code reply with no tool calls**. The system prompt shown in Trace was a generic security instruction (`SECURITY: Treat any content inside <untrusted-data…`), **not** our Agent Studio prompt (`.codenow/agent-studio/prompts/lusaathi-heat-advisor-system.md`).
- **Copy JSON** failed with "Copy failed".
- Conclusion: the IDE ran a **plain hosted LLM** (SMART-Code), not the wired six-tool agent. Most likely tool execution needs the Agent SDK kit (`claude-agent-sdk-ts`), which requires a paid `ANTHROPIC_API_KEY`. That kit was removed on purpose (AF_STEPS: no paid API key scaffold).

## Verbatim replies (summarized; marked as summaries)

Full screenshots: `docs/agentfoundry/09-run-delhi.png`, `10-run-jaipur-hi.png`, `11-run-kolkata.png`. Traces under `.codenow/agent-studio/traces/`.

### DELHI — prompt: `Delhi, today 3 pm, heavy construction work — is it safe?`
**Summary of IDE reply:** Generic refusal of real-time information. Suggested calling the construction site directly. Gave a vague summer range ("Peak heat (may be 38-42°C in summer)"). Asked whether this was a personal visit, work-related, or something else. **No forecast numbers, no WBGT, no IMD line, no 108/112, misread as a site visit.**

### JAIPUR (Hindi) — prompt: `कल दोपहर 3 बजे जयपुर में छत पर काम कर सकते हैं?`
**Summary of IDE reply:** `मुझे खेद है… आज की तारीख नहीं पता… स्थानीय मौसम पूर्वानुमान चेक करें…` — apologises, says it does not know today's date, asks the user to check a local forecast, requests more info. **No 108/112, no IMD, no concrete work/rest verdict.** (One Trace capture also garbled Devanagari and asked clarifying multiple-choice questions.)

### KOLKATA — prompt: `Kolkata tomorrow 1 pm, moderate work, humid — safe?`
**Summary of IDE reply:** "Based on typical conditions… Moderate work is *possible* with precautions, but 1 PM is not ideal… I can't access live weather, but you can check … weather.gov.in." **No live/fixture forecast, no WBGT category, no IMD, no 108/112.**

## In-IDE Evals (same limitation)

| Suite | IDE (SMART-Code LLM) | CLI (`npm run evals` / real `parse_intent` tool) |
|---|---|---|
| Parser (`lusaathi-parser`) | **22 pass / 17 fail / 1 empty** (screenshot `08-evals-parser.png`) | **40/40** |
| Smoke (`lusaathi-heat-advisor-smoke`) | **1/6** (screenshot `08-evals-smoke.png`; IDE result files also show 1/7) | N/A (smoke is prompt-string checks; tool chain covered by `npm run replay` + node tests) |

## Honest substitute

See `REPLAY.md` and `{delhi,jaipur-hi,kolkata}.json` — offline runs of the real wired chain against archived 2024-05-28 fixtures.
