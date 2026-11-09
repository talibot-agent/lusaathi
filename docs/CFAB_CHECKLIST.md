# Code for a Billion 2026 — requirements checklist (LuSaathi)

Status as of **9 Nov 2026**. Every requirement is quoted or paraphrased from an official source, linked in the
**Source** column. The legend: ✅ met · ⏳ pending (with owner) · ⚠️ ambiguity in the official material.

Official sources used:

* **[SITE]** Code for India hackathon page — https://codeforindia.org/hackathon
* **[HUB]** Submission hub README — https://github.com/karlmehta/code-for-a-billion/blob/main/README.md
* **[FORM]** Issue form — https://github.com/karlmehta/code-for-a-billion/blob/main/.github/ISSUE_TEMPLATE/submission.yml
* **[RUBRIC]** Judging rubric — https://github.com/karlmehta/code-for-a-billion/blob/main/JUDGING.md
* **[AF]** AgentFoundry — https://agentfoundry.me

## 1. Eligibility

| # | Requirement | Source | Status | Evidence / note |
|---|---|---|---|---|
| E1 | Built using **AgentFoundry (AF)**, the official IDE (required checkbox on the form) | [RUBRIC] Eligibility; [FORM] `confirmations` | ⏳ **pending — AF account/project (Tali)** | Not ticked yet. LuSaathi's first version was built *outside* AF with an AI coding agent. Work done in AF must be real, dated and documented (`docs/AGENTFOUNDRY.md`) before the box is ticked. Organisers have not answered whether earlier work outside AF is allowed (Discussions [#13](https://github.com/karlmehta/code-for-a-billion/discussions/13), [#18](https://github.com/karlmehta/code-for-a-billion/discussions/18), [#65](https://github.com/karlmehta/code-for-a-billion/discussions/65), all unanswered on 9 Nov). We disclose the history plainly. |
| E2 | Public GitHub repository with a README that has setup steps | [RUBRIC]; [HUB] step 2; [FORM] `confirmations` | ✅ | https://github.com/talibot-agent/lusaathi (public, MIT). README → *Setup*. |
| E3 | Demo link (live app **or** video) that judges can open | [RUBRIC]; [FORM] `demo` (required) | ✅ | Live: https://talibot-agent.github.io/lusaathi/ · replay: `?place=Delhi&replay=2024-05-28`. A 2–3 min video is optional ("A 2–3 minute video walkthrough, or a live link we can open", [SITE] step 3). |
| E4 | **Deployed on any cloud** by 15 Nov 2026 | [SITE] Timeline + FAQ | ✅ | GitHub Pages, deployed by GitHub Actions on every push to `main`. |
| E5 | **Open-sourced** under Apache-2.0 or MIT | [SITE] FAQ "Do I keep my IP?" | ✅ | `LICENSE` = MIT. The FAQ says projects are released "to the Code for India GitHub organization"; no transfer instructions have been published — act only if organisers ask. |
| E6 | Submission issue filed **before the deadline** | [RUBRIC]; [HUB] checklist | ⏳ Tali, after E1 | Must go through the web form so the `submission` label applies (issues opened via the API were not labelled and had to be re-filed — see hub issues #55→#57, #42→#58). |
| E7 | Anyone, anywhere; solo or team; free | [SITE] FAQ | ✅ | Solo entry. |
| E8 | Sign up on AgentFoundry.me and create a project in the IDE ("That's your hackathon entry") | [SITE] FAQ "How do I take part?" | ⏳ Tali | Same as E1. |
| E9 | "Register with CFI" (button on the site) | [SITE] hero | ⏳ **decision for Mykel/Tali** | Not listed as an eligibility rule in [RUBRIC] or [FORM], but the site asks for it. Earlier research noted the form asks for mobile number + address (personal data) — only the account owner should fill it. |

## 2. Submission form fields ([FORM])

Paste-ready text for every field is in [`docs/SUBMISSION.md`](SUBMISSION.md).

| Field (form id) | Required | Ready? |
|---|:-:|---|
| Issue title `[Submission] <Team / Project name>` | yes | ✅ |
| Team / Project name (`team`) | yes | ✅ |
| Team members (`members`) | yes | ✅ |
| Problem statement (`problem`, 2–5 sentences) | yes | ✅ (5 sentences) |
| What you built — incl. **how AF was used** (`solution`) | yes | ⏳ AF paragraph is a marked placeholder |
| GitHub repository URL (`repo`) | yes | ✅ |
| Demo URL (`demo`) | yes | ✅ |
| Scale & severity (`problem_scale`, "50% of your score") | yes | ✅ sourced numbers |
| Deployment & impact data (`impact`, "25%") | no | ✅ honest: backtest only, no field data yet |
| Track / category (`track`) | yes | ✅ **Climate** — see ⚠️ T1 |
| Contact email (`contact`) | yes | ✅ |
| Confirmations ×3 (all required) | yes | ⏳ AF box waits on E1; other two ✅ |

## 3. Judging ([RUBRIC], 25 % each; ties broken by Proven impact, then Size)

| Criterion | Where we answer it | Strength |
|---|---|---|
| Size of the problem | `problem_scale`: ~380 M heat-exposed workers (World Bank 2022) | strong, sourced |
| Severity | `problem_scale`: 181 bn labour hours / US$141 bn (Lancet Countdown 2024), 110 deaths + 40,272 cases (MoHFW via Indian Express) | strong, sourced |
| Quality of the solution | `solution`, README, METHODS.md (incl. the Jaipur dry-heat worked example), 54 tests, CI | strong; deterministic + explainable |
| Proven impact | `impact`: 2024 backtest (recall 0.96 heat-wave days; daylight-only dangerous-hour flag P 0.96 / R 0.91, or recall 1.00 at precision 0.28 vs the old definition) — **no field data** | **weakest** — any real usage before filing helps most |

## 4. Deadline

| Item | Official wording | Time zone |
|---|---|---|
| Submissions close / deployed by | "15 Nov 2026 — Submissions close" ([SITE] Timeline); "deployed to any cloud by 15 November 2026" ([SITE] Prizes) | ⚠️ **not stated anywhere** ([HUB] README still says "Deadline: _TBD_") |
| Winners | 5 Dec 2026 | — |

Safe reading: assume the **earliest** plausible cut-off, 15 Nov 00:00 IST (UTC+5:30) = **Sat 14 Nov 2026, 1:30 PM ET (UTC−5)**.
The likely cut-off, 15 Nov 23:59 IST, is Sun 15 Nov 1:29 PM ET. **Target: file by Sat 14 Nov, noon ET.**

## 5. Ambiguities in the official material (unanswered as of 9 Nov)

* **T1 — tracks.** The form's dropdown has 7 tracks (Agriculture, Health, Education, Financial Inclusion, Governance,
  **Climate**, Other); the site lists 10 different "impact areas" (no Climate; closest are 06 Health and 09 Livelihood).
  Prizes are "per track / category". We file under **Climate** and name the CFI impact area (06 Health — occupational
  heat illness) in the text, as another entrant did in a comment on hub issue #28.
* **P1 — prizes.** Site: ₹1.5 L / ₹1 L / ₹50 k per track (₹18 L pool). Hub README + AF page: $10k / $5k / $2.5k
  ($17.5k). Discussion [#52](https://github.com/karlmehta/code-for-a-billion/discussions/52) unanswered.
* **A1 — prior work.** Whether a project started outside AF qualifies is unanswered (#13, #18, #30, #65).
* Contact address hello@codeforindia.org reportedly bounced (#52).

## 6. Rules we hold ourselves to

* AI authorship disclosed (README → *Team, credits & AI authorship*; form `solution`).
* No fabricated impact: backtest is labelled as backtest; "Field data: none yet".
* No AF claim until it is true and documented.
* No spending: AF free plan / free SMART-Code credits only, no card.
