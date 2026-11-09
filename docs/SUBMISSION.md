# Code for a Billion 2026 — submission fields (paste-ready)

**Status: DRAFT — do not file** until the AgentFoundry paragraph in *What you built* is real and filled in and the
AF checkbox can be ticked honestly. Requirements and sources: [`CFAB_CHECKLIST.md`](CFAB_CHECKLIST.md).

Form: https://github.com/karlmehta/code-for-a-billion/issues/new?template=submission.yml
(file through the **web form**, signed in as `talibot-agent`, so the `submission` label is applied).

Each block below maps 1:1 to a form field. Copy the text inside the fence.

---

### Issue title
```
[Submission] LuSaathi (लू साथी) — heat-stress safety agent for India's outdoor workers
```

### Team / Project name
```
LuSaathi (लू साथी) — heat-safety agent for India's outdoor workers
```

### Team members (names + GitHub handles)
```
Mykel Nelson (@talibot-agent) — solo; built with AI agent assistance (disclosed below)
```

### Problem statement
```
Up to 380 million Indians, about 75% of the workforce, do heat-exposed work: construction, street vending, farm labour, delivery. In the 2024 season the Health Ministry confirmed 110 heat-stroke deaths and 40,272 heat-stroke cases, and heat cost India 181 billion potential labour hours in 2023. IMD warns on air temperature, but what injures a worker is heat stress (temperature + humidity + sun + wind + workload), and NDMA guidance ("increase rest breaks", "schedule strenuous jobs to cooler times") never says which hours or how long. Workers, small contractors, site supervisors and ASHA workers have no WBGT meter and no practical work/rest rule in their own language. LuSaathi gives them an hour-by-hour, place-specific work/rest and water schedule, free, on any phone, in English or Hindi.
```

### What you built
```
**Summary.** LuSaathi is a free, open-source (MIT) heat-safety agent that turns a free weather forecast into hour-by-hour work/rest and water schedules for any place in India, answers questions in English, Hindi or Hinglish, and produces a WhatsApp advisory a supervisor, contractor, ASHA worker or panchayat can forward in one tap. Live: https://talibot-agent.github.io/lusaathi/

**Key features**
- Any Indian place, typed in English or Devanagari (e.g. "जयपुर").
- 72-hour hourly heat stress: air temperature, humidity, Stull wet-bulb, NWS heat index (marked * where the formula is out of range) and two WBGT estimates, a sun/globe model (Dimiceli–Piltz globe + Stull wet-bulb, OSHA outdoor weighting) and the BoM approximation. Cautious rule: the app always uses the higher estimate and shows which one drove the answer.
- Work/rest minutes and litres of water per hour for light / moderate / heavy work (US Army TB MED 507 heat categories 1–5), plus NDMA's 12–3 pm advice on heat-wave days.
- IMD heat-wave criteria (plains / coastal / hills thresholds, departure from an ERA5 1991–2020 normal), with automatic region classification.
- Ask in your language: "Can I work on the roof at 2pm tomorrow in Nagpur?" / "कल दोपहर जयपुर में छत पर काम करना सुरक्षित है?" → the agent extracts place, day, hour and work type, fetches the forecast, and answers with the numbers, a verdict, the work/rest schedule, a safer time that day and the IMD status, in the same language.
- One-tap WhatsApp advisory (3-day peak WBGT, hours needing breaks, water, IMD status, 108/112 reminder).
- Replay of the May 2024 heat wave from archived forecasts: https://talibot-agent.github.io/lusaathi/?place=Delhi&replay=2024-05-28
- Works offline after first load (service worker), ~30 kB gzipped, no login, no API key, no server, mobile-first.

**The 2024 Jaipur replay at 46 °C comes out as Category 5.** On 29 May 2024 at 14:00 the archived forecast was 45.9 °C with only 7 % humidity, so the Stull (2011) wet-bulb is just 20.1 °C and the sun/globe WBGT model gives 29.0 °C (Category 2), while the BoM approximation gives 32.7 °C. LuSaathi uses the higher of the two, so the answer is "High risk": Category 5, 20 min work / 40 min rest for moderate work, with the BoM formula named as the source. The NWS heat index (41.7 °C) is outside the range that formula is defined for at this humidity, so the app marks it with * and does not use it. Details: docs/METHODS.md §3a–3b.

**Tech.** Static HTML/CSS + vanilla ES modules on GitHub Pages; Open-Meteo geocoding, forecast, ERA5 archive and historical-forecast APIs (CC BY 4.0, called from the browser). The agent is deterministic and rule-based (no paid LLM; nothing leaves the phone except the weather API calls), so every answer is explainable and traceable to a cited formula in docs/METHODS.md. The same math is implemented in Python (python/lusaathi_core) and a cross-check test asserts JS == Python. 48 automated tests (24 pytest + 24 node:test); GitHub Actions runs both suites before every Pages deploy. Reproducible 2024 backtest in validation/ → VALIDATION.md.

**How we used AgentFoundry (AF).** <<FILL IN ONLY AFTER IT HAPPENS — dated, specific, checkable; see docs/AGENTFOUNDRY.md. Must state plainly that the first version (9 Nov 2026) was built outside AF with an AI coding agent, and what was then built in AF.>>

**AI authorship.** LuSaathi's code, docs and backtest were written by an AI coding agent working under the author's direction; the author reviewed it, and every number comes from the scripts in the repo or the cited sources. This submission text was also drafted with AI assistance.

Full write-up: https://github.com/talibot-agent/lusaathi#readme · Methods: https://github.com/talibot-agent/lusaathi/blob/main/docs/METHODS.md · Backtest: https://github.com/talibot-agent/lusaathi/blob/main/VALIDATION.md
CFI impact area: 06 Health (occupational heat illness); form track: Climate.
```

### GitHub repository URL
```
https://github.com/talibot-agent/lusaathi
```

### Demo URL (live app or video)
```
Live app: https://talibot-agent.github.io/lusaathi/ · 2024 heat-wave replay: https://talibot-agent.github.io/lusaathi/?place=Delhi&replay=2024-05-28 · Hindi Q&A: https://talibot-agent.github.io/lusaathi/?lang=hi&place=Jaipur&replay=2024-05-28&q=%E0%A4%95%E0%A4%B2%20%E0%A4%A6%E0%A5%8B%E0%A4%AA%E0%A4%B9%E0%A4%B0%202%20%E0%A4%AC%E0%A4%9C%E0%A5%87%20%E0%A4%9C%E0%A4%AF%E0%A4%AA%E0%A5%81%E0%A4%B0%20%E0%A4%AE%E0%A5%87%E0%A4%82%20%E0%A4%9B%E0%A4%A4%20%E0%A4%AA%E0%A4%B0%20%E0%A4%95%E0%A4%BE%E0%A4%AE%20%E0%A4%95%E0%A4%B0%E0%A4%A8%E0%A4%BE%20%E0%A4%B8%E0%A5%81%E0%A4%B0%E0%A4%95%E0%A5%8D%E0%A4%B7%E0%A4%BF%E0%A4%A4%20%E0%A4%B9%E0%A5%88%3F
```
(If a demo video is recorded, add: `· Video: <link>`.)

### Scale & severity of the problem
```
**Scale**
- Up to **75% of India's workforce — ~380 million people — depend on heat-exposed labour**, which produces nearly half of GDP (World Bank 2022, *Climate Investment Opportunities in India's Cooling Sector*: https://documents1.worldbank.org/curated/en/099920011222212474/pdf/P15743300f4cc10380b9f6051f8e7ed1147.pdf).
- In 2023 each person in India was exposed to moderate-or-higher heat-stress risk for ~2,400 hours (≈100 days) during light outdoor activity (Lancet Countdown 2024 India: https://lancetcountdown.org/wp-content/uploads/2024/10/Lancet-Countdown-2024_INDIA.pdf).

**Severity — economic loss**
- **181 billion potential labour hours lost to heat in 2023** (+50% vs 1990s) and **US$141 billion potential income loss**, US$71.9 bn of it in agriculture (Lancet Countdown 2024 India, link above).
- ILO projects India will lose **5.8% of working hours in 2030 — the equivalent of 34 million full-time jobs** — to heat stress, mostly in agriculture and increasingly construction (ILO 2019, *Working on a Warmer Planet*: https://www.ilo.org/sites/default/files/wcmsp5/groups/public/@dgreports/@dcomm/@publ/documents/publication/wcms_711919.pdf).

**Severity — human suffering**
- 2024 heat season: **110 confirmed heat-stroke deaths and 40,272 heat-stroke cases** (Union Health Ministry data, 1 Mar–~19 Jun 2024; UP 36, Bihar 17, Rajasthan 16 deaths) (Indian Express, 20 Jun 2024: https://indianexpress.com/article/india/heatwave-deaths-heatstroke-cases-union-health-ministry-9404094/). Different agencies reported 143, 209 or 448 deaths — heat deaths are under-counted (Economic Times: https://economictimes.indiatimes.com/news/india/summer-of-deaths-143-209-or-448-whats-the-real-death-toll-in-india-due-to-heatwave/articleshow/111181962.cms).
- Our own backtest (ERA5 reanalysis, 25 cities, Apr–Jun 2024, cautious WBGT rule): **19,767 of 29,575 city work-hours (66.8%) were at WBGT Category 4–5** (5,249 / 17.7% with the less cautious sun/globe model alone) — conditions in which moderate work should be limited to ≤30 min per hour — and 17,151 (58.0%) at Category 5 (2,191 with the sun/globe model alone).
```

### Deployment & impact data
```
**Backtest (retrospective, not field data):** run on archived day-ahead forecasts for 25 Indian cities, 1 Apr–30 Jun 2024, scored against ERA5 reanalysis. LuSaathi's day-ahead IMD heat-wave alerts caught **120 of 125 heat-wave city-days (recall 0.96, precision 0.45, F1 0.61)** with the Open-Meteo best_match model mix the app uses. Its day-ahead dangerous-work-hour flag (WBGT Category 4–5, cautious rule) flagged 18,685 city work-hours and scored **precision 0.96, recall 0.91, F1 0.94** against a reference computed the same way. Against the older, less cautious definition of a dangerous hour it caught **5,244 of 5,249 (recall 1.00) at precision 0.28**: we deliberately accept more false alarms to avoid missing a dangerous hour (the old rule scored P = R = 0.73). Reproducible scripts: validation/ → https://github.com/talibot-agent/lusaathi/blob/main/VALIDATION.md

- ECMWF IFS alone: heat-wave alerts precision 0.57, recall 0.75, F1 0.65; dangerous-hour flag (cautious rule) precision 0.99, recall 0.83.
- Day+1 Tmax mean absolute error: 1.23 °C (best_match), 1.12 °C (ECMWF IFS).
- Caveats (in VALIDATION.md and docs/METHODS.md §3b): ERA5 smooths peaks compared with IMD stations; IMD criteria applied at a single point; WBGT is modelled, not measured, and the cautious rule (BoM-driven in every backtest work-hour) puts 58% of 2024 work-hours at Category 5, so it restricts more hours than a WBGT meter likely would; warm forecast bias at coastal Chennai; heat-wave alerts trade precision for recall (148 false-alarm city-days).

**Deployment:** live on GitHub Pages since 9 Nov 2026 (https://talibot-agent.github.io/lusaathi/), open source (MIT), free, no login; works on low-end phones and slow connections.

**Field data:** none yet. No users, outcomes or before/after measurements have been collected; we do not claim any.
```

### Track / category
`Climate` (dropdown)

### Contact email
```
talibot@mail.grokbot.com
```

### Confirmations
- [ ] Built using AgentFoundry (AF), the official IDE — **tick only when docs/AGENTFOUNDRY.md documents real AF work**
- [x] Our repository is public and includes a README with setup steps
- [x] The demo link works and is accessible to judges
