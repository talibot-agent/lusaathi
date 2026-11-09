# LuSaathi parser Evals

AgentFoundry **Evals** suite for the `parse_intent` tool (AF work-list item 5).

## Suite file

`.codenow/agent-studio/evals/lusaathi-parser.json`

Same shape as the smoke eval (`name`, `description`, `cases` with `input` + `expected_contains`). Extra fields used by the CLI runner: `id`, `lang`, `category`, `nowIso`, `expected` (partial parse object).

Coverage: English, Hindi (Devanagari), Hinglish (romanized), Marathi, plus edges (`12 am` / `12 pm`, `noon`, `midnight`, `abhi` / `now` / `आता`, `kal`, `परसों` / `parso` / `परवा`, city aliases, workload words, unknown city, empty/noise, mixed script, punctuation/emoji).

## Run in the AgentFoundry IDE

1. Open the LuSaathi project folder in AgentFoundry.
2. Open **Agents** → select **LuSaathi Heat Advisor**.
3. Open the **EVAL** / **Evals** panel.
4. Choose **`lusaathi-parser`** (also listed on the agent beside the smoke eval).
5. Run the suite. Cases that use `expected_contains` check the tool text payload; structured field checks are what the CLI enforces below.

## Run from the CLI

From the repo root:

```bash
npm run evals
# same as: node scripts/run-parser-evals.mjs
```

Writes:

- `agentfoundry/evals/parser-results.json` — full per-case results + tallies
- `agentfoundry/evals/parser-results.md` — pass rate by language/category and every failure

The node test `tests/js/parser_evals.test.mjs` (part of `npm test`) re-runs the suite and requires **100% pass**, or an explicit `KNOWN_FAILING` id with a reason (none today — parser is not frozen method logic).

Also: `python3 -m pytest -q tests && npm test && npm run evals`.

## Decisions

See `parser-decisions.md` for parser bugs fixed vs intentional behaviours.
