# Builder review notes on SMART-Code output (to resolve in hand-fix pass)

## Round 1 (lib/i18n.js, Marathi strings) — SMART-Code (gpt-5-mini via "Smart"), hit 10-round tool cap, intent.js untouched
- CAT mr[0] 'कम – वर्ग 1 खाली': 'कम' is Hindi; Marathi is 'कमी'. 'खाली' (below) ok → 'कमी – वर्ग 1 पेक्षा खाली'.
- CAT 'वाढला' → 'वाढलेला' (adjective form).
- IMD 'लू' is Hindi; Marathi: 'उष्णतेची लाट' / 'तीव्र उष्णतेची लाट'.
- WORKLOAD 'हलका काम' → 'हलके काम' (काम is neuter).
- REGION 'सपाट भाग' → 'मैदानी प्रदेश'; 'किनारी' → 'किनारपट्टी'; 'डोंगर' → 'डोंगराळ'.
- askPlaceholder uses 'काल' (= yesterday) → should be 'उद्या' (tomorrow).
- wbgtNote has duplicated 'हा हा मूल्य' → 'हे मूल्य'.
- tw 'वेट-बलब' → 'वेट-बल्ब'.
- title 'लू साथी' — app name, keep as brand (LuSaathi).
- Check advisor/answer strings outside i18n.js (advisor.js, app.js) for lang branches that need 'mr'.


## Hand-fix pass (Tali Builder AI agent) — 2026-11-09

Distinguishable from SMART-Code via `agentfoundry/smartcode-diff.patch` (saved before these edits).

### SMART-Code produced (kept / base)
- `lib/i18n.js`: initial `UI.mr` / `CAT.mr` / `IMD.mr` / `WORKLOAD.mr` / `REGION.mr` / `DOW.mr` / `MON.mr` scaffold
- `lib/intent.js`: `isMarathi`, Marathi day/hour/workload keywords, first-pass `मध्ये` / locative patterns
- `tests/js/marathi.test.js`: detection + UI key completeness tests
- Transcripts/screenshots under `agentfoundry/` and `docs/agentfoundry/`

### Hand fixes (this pass)
1. **`lib/intent.js` place parsing:** Devanagari gazetteer match allows attached/spaced `मध्ये`/`में` and Marathi locatives (`पुणे`→`पुण्यात`); `foldDev` so `नागपूर` matches `नागपुर`; `resolveGazetteer` for pattern fallbacks. **Hour bug:** removed `सकाळी` from the evening period regex (it was forcing morning 10 → 22).
2. **`lib/i18n.js` wording (all REVIEW_NOTES Round 1 items):** CAT `कमी`/`वाढलेला`/`पेक्षा खाली`; IMD `उष्णतेची लाट` / `तीव्र उष्णतेची लाट`; WORKLOAD `हलके काम`; REGION `मैदानी प्रदेश`/`किनारपट्टी`/`डोंगराळ`; askPlaceholder `उद्या`; wbgtNote `हे मूल्य`; tw/`hiNote` `वेट-बल्ब`; disclaimer/replay लू→उष्णतेची लाट. Added `SRC.mr`, `workRestText` mr branch. Lang-button cycle labels: en→हिन्दी, hi→मराठी, mr→English.
3. **`lib/advisor.js`:** full `mr` answer + WhatsApp advisory branches (EN/HI strings unchanged).
4. **`app.js`:** language cycle `en → hi → mr → en`; accept `lang=mr`; Marathi “name a place” prompt.
5. **`package.json`:** `npm test` now runs `*.test.mjs` and `*.test.js` (picks up `marathi.test.js`).
6. **`sw.js`:** cache `lusaathi-v5` → `lusaathi-v6` (served JS/HTML changed).
7. **`index.html`:** meta description mentions मराठी.
8. **`tests/js/marathi.test.js`:** added advisor Marathi output test.
9. **`.codenow/`:** inspected — only `sessions/smart-code-cloud.json` (IDE chat transcript, user-specific). Gitignored `.codenow/sessions/`. Empty `agent-studio`/`agent-drafts` dirs not committed (Agent Studio manifest is AF step 3).
