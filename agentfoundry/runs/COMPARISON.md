# IDE LLM baseline vs tool-wired agent

Date: 2026-11-09 (America/New_York). Method frozen at `328ed36`.

## Advisor runs (three prompts)

| Prompt | IDE SMART-Code (no tools) | Tool-wired agent (`npm run replay`) |
|---|---|---|
| Delhi, today 3 pm, heavy construction | No forecast; vague 38–42 °C summer guess; misread as site visit; **no 108/112**; **no IMD**; no concrete work/rest | **Cat 5**, Delhi 2024-05-28 15:00, workload `hard`, lang=en. Uses fixture forecast numbers. IMD level 1. 108/112: yes. Verdict: Answer: High risk – the guideline allows only 10 min of work in this hour; move the work to a cooler time. |
| कल दोपहर 3 बजे जयपुर में छत पर काम… | Hindi apology; doesn't know the date; asks user to check local forecast; **no 108/112**; **no IMD** | **Cat 5**, Jaipur 2024-05-29 15:00, workload `moderate`, lang=**hi**. Forecast + IMD level 1. 108/112: yes. Verdict: जवाब: जोखिम अधिक – इस घंटे में सिर्फ़ 20 मिनट काम की सीमा है; काम ठंडे समय पर करें। |
| Kolkata tomorrow 1 pm, moderate work, humid | "Typical conditions"; suggests weather.gov.in; **no live forecast**; **no 108/112**; **no IMD** | **Cat 5**, Kolkata 2024-05-29 13:00, workload `moderate`, lang=en. Humid-day fixture numbers. IMD level 0. 108/112: yes. Verdict: Answer: High risk – the guideline allows only 20 min of work in this hour; move the work to a cooler time. |

### Checklist (tool-wired)

| Run | Uses forecast? | 108/112? | IMD line? | Right language? | Concrete verdict? |
|---|---|---|---|---|---|
| delhi | yes (fixture `delhi_2024-05-28.json`) | yes | yes (level 1) | en | yes |
| jaipur-hi | yes (fixture `jaipur_2024-05-28.json`) | yes | yes (level 1) | hi | yes |
| kolkata | yes (fixture `kolkata_2024-05-28.json`) | yes | yes (level 0) | en | yes |

IDE baseline fails all five columns on every run (see `ide-baseline.md`).

## Parser evals

| Path | Result |
|---|---|
| In-IDE Evals (SMART-Code LLM, no `parse_intent` tool) | **22 / 40** (22 pass / 17 fail / 1 empty) — `docs/agentfoundry/08-evals-parser.png` |
| CLI `npm run evals` (real `tools/parse_intent.mjs`) | **40 / 40** — `agentfoundry/evals/parser-results.md` |

## Why the gap

AgentFoundry Trace/Runs invoked the hosted SMART-Code model with an empty tool list (and a generic security system prompt). The paid Anthropic Agent SDK kit that would bind tools was removed deliberately. The replay harness in `scripts/replay-runs.mjs` is the honest substitute: same six tools, offline fixtures, step traces committed under `agentfoundry/runs/`.
