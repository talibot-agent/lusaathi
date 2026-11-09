# Tool-wired replay (honest substitute for AgentFoundry Replay)

Generated offline by `npm run replay` against fixtures. NOW = `2024-05-28T06:00:00.000Z` (morning of the 2024 heat-wave window).
Method frozen at `328ed36` — no WBGT/risk logic changes.

IDE Runs/Trace could not exercise this chain (see `ide-baseline.md`): RUN > Runs stayed empty, EVAL > Trace ran SMART-Code with **no tool calls**. This harness is the recorded substitute.

## delhi

**Prompt:** Delhi, today 3 pm, heavy construction work — is it safe?
**Fixture:** `tests/fixtures/delhi_2024-05-28.json` · target 2024-05-28 15:00 · workload `hard`

| step | ms | notes |
|---|---:|---|
| parse_intent | 8 | lang=en, place=Delhi, hour=15, dayOffset=0, workload=hard |
| geocode | 2 | Delhi (28.65, 77.23) plains |
| forecast | 2 | 4 days / 96 hours from fixture |
| heat_stress | 0 | WBGT 32.7 °C → Cat 5 (bom) |
| imd_status | 0 | IMD level 1 · Never override IMD/NDMA/State heat-action-plan a… |
| advise | 3 | lang=en |

**Verdict summary**

- Category: **5** (bom); WBGT 32.7 °C; air 45.4 °C / RH 8%
- Work/rest: 10 min work / 50 min rest
- IMD: level 1 (absolute)
- Checks: PASS — lang=true place=true hour=true day=true workload=true 108/112=true IMD=true verdict=true

**Answer**

```
Answer: High risk – the guideline allows only 10 min of work in this hour; move the work to a cooler time.
Delhi, Tue 28 May 15:00: air 45°C, humidity 8%, wet-bulb 20.5°C, heat index 42°C (rough: formula not valid in air this dry), estimated WBGT 32.7°C (the higher of two estimates, from the BoM formula; sun/globe model 29.0°C) → Cat 5 – Extreme.
For heavy work: 10 min work / 50 min rest in shade; drink about 0.95 L water per hour (not more than ~1.4 L/hour or ~11 L/day).
Better time that day: 06:00–09:00 (Low – below Cat 1).
IMD heat-wave criterion met (normal unavailable – absolute test only) [plains]
Heat-stroke signs → call 108/112 immediately.
```

## jaipur-hi

**Prompt:** कल दोपहर 3 बजे जयपुर में छत पर काम कर सकते हैं?
**Fixture:** `tests/fixtures/jaipur_2024-05-28.json` · target 2024-05-29 15:00 · workload `moderate`

| step | ms | notes |
|---|---:|---|
| parse_intent | 1 | lang=hi, place=Jaipur, hour=15, dayOffset=1, workload=moderate |
| geocode | 1 | Jaipur (26.92, 75.79) plains |
| forecast | 1 | 4 days / 96 hours from fixture |
| heat_stress | 0 | WBGT 32.9 °C → Cat 5 (bom) |
| imd_status | 0 | IMD level 1 · Never override IMD/NDMA/State heat-action-plan a… |
| advise | 1 | lang=hi |

**Verdict summary**

- Category: **5** (bom); WBGT 32.9 °C; air 45.6 °C / RH 8%
- Work/rest: 20 min work / 40 min rest
- IMD: level 1 (absolute)
- Checks: PASS — lang=true place=true hour=true day=true workload=true 108/112=true IMD=true verdict=true

**Answer**

```
जवाब: जोखिम अधिक – इस घंटे में सिर्फ़ 20 मिनट काम की सीमा है; काम ठंडे समय पर करें।
Jaipur, बुध 29 मई 15:00: हवा 46°C, नमी 8%, वेट-बल्ब 20.6°C, हीट इंडेक्स 42°C (इतनी सूखी हवा में मोटा अनुमान), अनुमानित WBGT 32.9°C (दो अनुमानों में ज़्यादा वाला: BoM सूत्र; धूप/ग्लोब मॉडल 29.1°C) → श्रेणी 5 – अत्यधिक.
मध्यम काम के लिए: 20 मिनट काम / 40 मिनट छाँव में आराम; हर घंटे लगभग 0.95 लीटर पानी (दिन में 11 लीटर से ज़्यादा नहीं)।
उसी दिन बेहतर समय: 06:00–08:00, 17:00–19:00 (श्रेणी 1 – सावधानी)।
IMD लू (हीट वेव) मानदंड पूरा (सामान्य तापमान उपलब्ध नहीं – केवल निरपेक्ष जाँच) [मैदानी]
लू लगने के लक्षण दिखें तो तुरंत 108/112 पर कॉल करें।
```

## kolkata

**Prompt:** Kolkata tomorrow 1 pm, moderate work, humid — safe?
**Fixture:** `tests/fixtures/kolkata_2024-05-28.json` · target 2024-05-29 13:00 · workload `moderate`

| step | ms | notes |
|---|---:|---|
| parse_intent | 0 | lang=en, place=Kolkata, hour=13, dayOffset=1, workload=moderate |
| geocode | 1 | Kolkata (22.57, 88.36) plains |
| forecast | 1 | 4 days / 96 hours from fixture |
| heat_stress | 0 | WBGT 39.6 °C → Cat 5 (bom) |
| imd_status | 0 | IMD level 0 · Never override IMD/NDMA/State heat-action-plan a… |
| advise | 0 | lang=en |

**Verdict summary**

- Category: **5** (bom); WBGT 39.6 °C; air 34.7 °C / RH 74%
- Work/rest: 20 min work / 40 min rest
- IMD: level 0 (n/a)
- Checks: PASS — lang=true place=true hour=true day=true workload=true 108/112=true IMD=true verdict=true

**Answer**

```
Answer: High risk – the guideline allows only 20 min of work in this hour; move the work to a cooler time.
Kolkata, Wed 29 May 13:00: air 35°C, humidity 74%, wet-bulb 30.6°C, heat index 52°C, estimated WBGT 39.6°C (the higher of two estimates, from the BoM formula; sun/globe model 32.7°C) → Cat 5 – Extreme.
For moderate work: 20 min work / 40 min rest in shade; drink about 0.95 L water per hour (not more than ~1.4 L/hour or ~11 L/day).
Better time that day: 06:00–07:00, 17:00–19:00 (Cat 3 – High).
NDMA heat-wave guidance: avoid going out in the sun 12:00–15:00 and schedule strenuous jobs to cooler times of the day.
No IMD heat-wave criterion met [plains]
Heat-stroke signs → call 108/112 immediately.
```

