# Hindi string review — decisions

Source: AgentFoundry SMART-Code table in `agentfoundry/hindi-review-table.md`
(transcript `agentfoundry/smartcode-hindi-review.txt`, screenshot `docs/agentfoundry/05-smartcode-hindi-review.png`).

Verified against `lib/i18n.js` and `lib/advisor.js` at commit before this change.
Method frozen at `328ed36` — no WBGT/risk/threshold edits.

Safety rules kept: never override IMD/NDMA/State alerts; heat-stroke signs always point to **108/112**.

| # | File | Key/Line (as claimed) | Current Text (verified) | Suggested Text | SMART-Code severity | decision | reason/evidence (file:line) |
|---|------|----------------------|-------------------------|-----------------|---------------------|----------|------------------------------|
| 1 | lib/i18n.js | IMD[hi][2] | `IMD गंभीर लू मानदंड पूरा` | `IMD गंभीर लू (सीवियर हीट-वेव) मानदंड पूरा` | med | **modify** | Quote correct at `lib/i18n.js:9`. Gloss on [0]/[1] is useful (matches bilingual IMD alerts); add the *same* gloss style to [2], not the awkward "सीवियर हीट-वेव". Applied: `IMD गंभीर लू (हीट वेव) मानदंड पूरा`. |
| 2 | lib/advisor.js | advisoryText (hi) | `लू के लक्षण दिखें तो 108/112।` (part of footer) | `लू लगने के लक्षण (गंभीरता से) दिखें तो तुरंत 108/112 पर कॉल करें।` | high | **modify** | Quote correct at `lib/advisor.js:141`. Urgency + "पर कॉल करें" is right and must match `UI.hi.disclaimer` (`lib/i18n.js:57`). Rejected "(गंभीरता से)" (wrong idiom). Applied disclaimer-aligned wording with symptom list. |
| 3 | lib/i18n.js | UI[hi].disclaimer | `…लू लगने के लक्षण (भ्रम, गर्म सूखी त्वचा, बेहोशी) दिखें तो तुरंत 108/112 पर कॉल करें।` | Same (keep) | med | **accept** | Verified at `lib/i18n.js:57`. Correct; drives the modify of row 2 for consistency. No edit to disclaimer. |
| 4 | lib/advisor.js | imdLine (hi) (claimed line 39) | Claimed: `लू लगने के लक्षण (भ्रम, गर्म सूखी त्वचा, बेहोशी)` | ✓ Correct | low | **reject** | Hallucination. `lib/advisor.js:39` is dayOffset arithmetic, not imdLine. That symptom string lives only in `UI.hi.disclaimer` (`lib/i18n.js:57`). `imdLine` hi text is departure/normal notes at `lib/advisor.js:12–16`. |
| 5 | lib/i18n.js | IMD[hi][0] | `IMD लू (हीट वेव) मानदंड पूरा नहीं` | Drop `(हीट वेव)` | med | **reject** | Quote correct at `lib/i18n.js:9`. Gloss helps workers match official IMD bilingual alerts; conflicts with fixing row 1 by *adding* consistency. Keep. |
| 6 | lib/i18n.js | IMD[hi][1] | `IMD लू (हीट वेव) मानदंड पूरा` | Drop `(हीट वेव)` | med | **reject** | Same as row 5. Keep gloss; standardize [2] toward [0]/[1] instead. |
| 7 | lib/advisor.js | advisoryText NDMA (claimed line 92) | Claimed: Not present | Add NDMA noon Hindi line | high | **reject** | Hallucination / wrong claim. Hindi NDMA noon guidance **is present** in `answer()` at `lib/advisor.js:93` (`NDMA लू दिशानिर्देश: दोपहर 12 से 3 बजे तक…`). EN (`:95`) and MR (`:94`) have the same block only in `answer()`, not in `advisoryText`. Lines 144/147 cited as "EN/MR NDMA" are the ORS/acclimatise footer, not NDMA noon text. No gap unique to Hindi. |
| 8 | lib/i18n.js | UI[hi].notFound | `…दूसरी वर्तनी आज़माएँ।` | Drop nukta → `आजमाएँ` | low | **reject** | Quote correct at `lib/i18n.js:53`. `आज़माना` with nukta (ز) is standard; removing nukta is not an improvement. |
| 9 | lib/advisor.js | high-risk verdict | `जवाब: जोखिम अधिक – … सिर्फ़ … ठंडे समय पर करें।` | `उच्च जोखिम` / `केवल` / `स्थानांतरित करें` | med | **reject** | Quote correct at `lib/advisor.js:77`. Current tone matches the app (`सिर्फ़` also in `UI.hi.wbgtNote` at `lib/i18n.js:61`) and outdoor-worker audience; "स्थानांतरित करें" is bureaucratic. |
| 10 | lib/advisor.js | imdLine deviation | `(विचलन ${dep})` | Add colon / "मानदंड" | low | **reject** | Quote correct at `lib/advisor.js:12`. Matches Marathi `(फरक …)` style without colon; not incorrect. |
| 11 | lib/advisor.js | advisoryText ORS | `ORS रखें` | Expand acronym | med | **modify** | Quote correct inside `lib/advisor.js:141` (citation to i18n/waLink was confused). Expand for workers. Applied: `ORS (नमक-चीनी का घोल) रखें` (clearer than English "oral rehydration solution" transliteration). |
| 12 | lib/advisor.js | advisory header | `🌡️ लू साथी – गर्मी सलाह: ${name}` | Keep | low | **accept** | Verified at `lib/advisor.js:115`. Natural; no change. |
| 13 | lib/i18n.js | UI[hi].sources | `तरीका, स्रोत और सीमाएँ` | Keep | low | **accept** | Verified at `lib/i18n.js:57`. Natural; no change. |
| 14 | lib/advisor.js | water guidance | Claimed: `~${wr.waterLph} लीटर पानी (दिन में 11 लीटर से ज़्यादा नहीं)` | Add `/घंटा` and `प्रति दिन` | low | **reject** | Misquoted. Actual text at `lib/advisor.js:59` already has per-hour clarity: `हर घंटे लगभग ${wr.waterLph} लीटर पानी (दिन में 11 लीटर से ज़्यादा नहीं)।` Adding `/घंटा` would be redundant. |
| 15 | lib/advisor.js | alt hour | `उसी दिन बेहतर समय: …` | Keep | low | **accept** | Verified at `lib/advisor.js:87`. Natural; no change. |

## Counts

| decision | count |
|----------|------:|
| accept (keep) | 4 |
| modify (applied with edits) | 3 |
| reject | 8 |
| **total** | **15** |

## Applied code edits

1. `lib/i18n.js` — `IMD.hi[2]` → `IMD गंभीर लू (हीट वेव) मानदंड पूरा`
2. `lib/advisor.js` — Hindi `advisoryText` footer: expand ORS; align heat-stroke line with disclaimer (symptoms + तुरंत + पर कॉल करें + 108/112)
3. `sw.js` — cache bump `lusaathi-v6` → `lusaathi-v7` (served JS changed)

No WBGT / category / threshold / IMD criterion logic changed.
