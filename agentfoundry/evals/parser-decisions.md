# Parser eval decisions (AF item 5)

Date: 2026-11-09 (America/New_York). Method frozen at `328ed36` — parser is **not** method; WBGT/risk untouched.

Expectations are what `parse_intent` / `parseQuestion` **should** return. Where HEAD disagreed, each case was either a **parser bug** (minimal fix in `lib/intent.js` + regression) or a **kept expectation matching current intentional behaviour**.

## Parser bugs found and fixed

| Case / symptom | Bug | Fix |
|---|---|---|
| `mr-aata-now` — `आता पुण्यात काम?` had `wantsNow:false`, `lang:hi`, `hour:null` | JS `\b` is ASCII-`\w` only, so `आता\b` never matched; `आता` missing from Marathi detectors | `wantsNow` matches `अभी`/`आता` without broken `\b`; add `आता` to `MARATHI_ONLY`; hour filled from `now` when `wantsNow` |
| `en-midnight-delhi` / `en-midnight-pune` — `midnight` → hour 21 | Period regex `/night/` matched inside `midnight` | Explicit `midnight` / `मध्यरात्री` → hour `0` before period detection |
| `en-bangalore-welding` — `welding` → workload null | Moderate list had `\bweld\b` only | Add `welding` alongside `weld` |

## Intentional behaviours (not bugs)

| Case | Observation | Decision |
|---|---|---|
| `hing-kal-one-token` (`gurgaon kal 2pm bricks`) | `lang` stays `en` (Hinglish needs ≥2 romanized markers) | **Keep** — documented threshold; day/place/hour still parse |
| `hing-parson-en` (`parson in Delhi`) | `lang:en` with `dayOffset:2` | **Keep** — single token, not Hinglish reply language |
| `hi-gonda-evening` | Place stays raw `गोंडा` / `placeSource:pattern` (not in gazetteer) | **Keep** — unknown Devanagari place via `में` pattern |
| `en-unknown-bhiwandi` | `placeSource:pattern` | **Keep** — intentional fallback |
| `mixed-pune-en-time` | Devanagari → `lang:hi` even with English time words | **Keep** — script wins language |
| `kal` = tomorrow | Forecast context treats Hindi/Hinglish `kal` as tomorrow, not yesterday | **Keep** — matches comment in `findDay` and existing tests |
| Empty / emoji-only noise | All slots null, `lang:en` | **Keep** — safe no-op parse |

## Suite shape

- File: `.codenow/agent-studio/evals/lusaathi-parser.json` (same top-level schema as smoke: `name`, `description`, `cases[]` with `input` + `expected_contains`; runner also uses `id`, `lang`, `category`, `nowIso`, `expected`).
- 40 cases. Wired on the agent manifest under `evals`.
