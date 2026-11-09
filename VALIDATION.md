# LuSaathi — Validation (BACKTEST, not field data)

> **Label: retrospective backtest.** Everything below compares archived weather-model forecasts with the
> ERA5 reanalysis for the 2024 Indian heat season. It is **not** deployment, user or health-outcome data.
> No numbers here were typed by hand: the tables are rendered from [`validation/results.json`](validation/results.json)
> by [`validation/make_report.py`](validation/make_report.py), and that JSON is produced by
> [`validation/backtest.py`](validation/backtest.py).

## Question

If LuSaathi had been running in **April–June 2024**, the season in which India's Union Health Ministry recorded
110 confirmed heat-stroke deaths and 40,272 heat-stroke cases by 18–19 June
([Indian Express, 20 Jun 2024](https://indianexpress.com/article/india/heatwave-deaths-heatstroke-cases-union-health-ministry-9404094/)),
would its **day-ahead** alerts have caught the heat-wave days and the dangerous work-hours?

## Method

* **Cities (25):** Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Ahmedabad, Pune, Jaipur, Lucknow, Kanpur,
  Nagpur, Indore, Bhopal, Patna, Varanasi, Prayagraj, Agra, Ludhiana, Jodhpur, Raipur, Bhubaneswar, Visakhapatnam,
  Vijayawada, Shimla. Coordinates from the Open-Meteo geocoding API.
* **Forecasts:** Open-Meteo [Previous Runs API](https://open-meteo.com/en/docs/previous-runs-api) `*_previous_day1`
  variables, i.e. what the model predicted **one day earlier** (true day+1 lead), for (a) the default `best_match`
  model mix — the same default the live app requests from the Forecast API — and (b) ECMWF IFS 0.25°. As a short-lead
  reference we also score the [Historical Forecast API](https://open-meteo.com/en/docs/historical-forecast-api)
  (stitched from the first hours of successive runs).
* **Reference ("truth"):** ERA5 reanalysis via the Open-Meteo [Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) (`models=era5`).
* **Normals:** ERA5 daily Tmax 1991–2020, mean over a ±7-day window around each calendar day (same code as the app).
* **Heat-wave rule:** IMD criteria as implemented in `lib/imd.js` / `python/lusaathi_core/imd.py`, applied to the
  same grid point for forecast and reference (single-point simplification; also scored with IMD's 2-consecutive-day rule).
* **Work-hour heat stress:** for every hour 06:00–18:00 IST (and, for category shares, all 24 hours), the app's
  default **radiation-gated rule**: when the hour's shortwave radiation is ≥ 600 W/m² (`BOM_MIN_SW_WM2`), the higher
  of the sun/globe WBGT G (Dimiceli–Piltz globe + Stull wet-bulb, OSHA outdoor weights) and the BoM WBGT
  approximation B; otherwise G. "Dangerous" = TB MED 507 Category 4–5. The **strict** rule (higher of G and B at all
  hours), the **daylight-only** rule (higher while the solar elevation is > 0°), the old **permissive baseline**
  (always G) and the gate at 500 and 700 W/m² are computed in the same run from the same data.
* **Daily Tmax** = maximum of the 24 hourly values (local day) for both forecast and reference.

## Results

<!-- AUTO:BEGIN -->
Period **2024-04-01 → 2024-06-30**, **25 cities**, 2275 city-days, 29575 city work-hours (06:00–18:00 IST). Generated 2026-11-09T16:27Z by `validation/backtest.py`.

### A. Reference (ERA5) — what happened in 2024

Four WBGT rules, computed in the same run from the same data: the **permissive baseline** (always the sun/globe-model WBGT G; the app's rule before 9 Nov 2026), **strict** (the higher of G and the BoM WBGT B at every hour), **daylight-only** (the higher of G and B while the sun is up, else G) and **radiation-gated 600** (the app's default: the higher of G and B when the hour's shortwave radiation is ≥ 600 W/m², else G).

| Metric | Permissive (always G) | Strict (always max) | Daylight-only | **Radiation-gated 600 (default)** |
|---|---|---|---|---|
| City-days meeting the IMD heat-wave criterion (single point) | 125 | same | same | same |
| …of which severe | 20 | same | same | same |
| City-days meeting it on 2 consecutive days | 92 | same | same | same |
| Work-hours (06–18 IST) at Category 4–5 | 5249 (17.7%) | 19767 (66.8%) | 19625 (66.4%) | 10463 (35.4%) |
| Work-hours at Category 5 | 2191 (7.4%) | 17151 (58.0%) | 17039 (57.6%) | 8202 (27.7%) |
| All 24 hours at Category 4–5 | 5332 (9.8%) | 31225 (57.2%) | 20155 (36.9%) | 10546 (19.3%) |
| All 24 hours at Category 5 | 2195 (4.0%) | 26194 (48.0%) | 17423 (31.9%) | 8206 (15.0%) |
| Work-hours where B may be used | 0 | 29575 | 29032 (sun up) | 12261 (≥ 600 W/m²) |
| Work-hours where B was higher and drove the answer (default rule) | – | 29575 | – | 12261 |

**Threshold sensitivity (radiation gate at 500 / 600 / 700 W/m²), ERA5 reference:**

| Metric | 500 W/m² | **600 W/m² (default)** | 700 W/m² |
|---|---|---|---|
| Work-hours at Category 4–5 | 11613 (39.3%) | 10463 (35.4%) | 9178 (31.0%) |
| Work-hours at Category 5 | 9454 (32.0%) | 8202 (27.7%) | 6821 (23.1%) |
| All 24 hours at Category 5 | 9458 (17.3%) | 8206 (15.0%) | 6825 (12.5%) |

### B. Forecast skill (day+1 unless noted)

Heat-wave alerts and Tmax do not depend on WBGT, so they are identical under all rules.

| Forecast source | Heat-wave alert P / R / F1 (single day) | P / R / F1 (2-day rule) | Tmax MAE °C | Tmax bias °C |
|---|---|---|---|---|
| Open-Meteo best_match, day+1 (Previous Runs API) — **the model mix the live app uses** | 0.45 / 0.96 / 0.61 (TP 120, FP 148, FN 5) | 0.44 / 0.97 / 0.61 | 1.23 | 0.47 |
| ECMWF IFS 0.25°, day+1 (Previous Runs API) | 0.57 / 0.75 / 0.65 (TP 94, FP 70, FN 31) | 0.62 / 0.77 / 0.69 | 1.12 | 0.13 |
| Historical Forecast API (stitched short-lead, ~day 0 reference) | 0.55 / 0.85 / 0.66 (TP 106, FP 88, FN 19) | 0.63 / 0.88 / 0.73 | 1.06 | 0.41 |

**Dangerous work-hour flag (Category 4–5): P / R / F1 (hours flagged; missed dangerous hours = FN).** "Own" = judged against a reference computed with the same rule; "vs old" = judged against the permissive (always-G) definition of a dangerous hour.


Open-Meteo best_match, day+1 (Previous Runs API) — **the model mix the live app uses**:

| Rule | Own | Vs old |
|---|---|---|
| Permissive (always G) | 0.73 / 0.73 / 0.73 (5274 h; FN 1397) | 0.73 / 0.73 / 0.73 (5274 h; FN 1397) |
| Strict (always max) | 0.96 / 0.91 / 0.94 (18685 h; FN 1749) | 0.28 / 1.00 / 0.44 (18685 h; FN 5) |
| Daylight-only | 0.96 / 0.91 / 0.94 (18557 h; FN 1733) | 0.28 / 1.00 / 0.44 (18557 h; FN 15) |
| Radiation-gated 500 | 0.89 / 0.85 / 0.87 (11099 h; FN 1726) | 0.41 / 0.86 / 0.55 (11099 h; FN 716) |
| **Radiation-gated 600 (default)** | 0.87 / 0.84 / 0.86 (10003 h; FN 1712) | 0.44 / 0.84 / 0.58 (10003 h; FN 851) |
| Radiation-gated 700 | 0.85 / 0.82 / 0.83 (8826 h; FN 1673) | 0.49 / 0.82 / 0.61 (8826 h; FN 961) |

ECMWF IFS 0.25°, day+1 (Previous Runs API):

| Rule | Own | Vs old |
|---|---|---|
| Permissive (always G) | 0.76 / 0.53 / 0.63 (3676 h; FN 2455) | 0.76 / 0.53 / 0.63 (3676 h; FN 2455) |
| Strict (always max) | 0.99 / 0.83 / 0.90 (16618 h; FN 3397) | 0.31 / 0.99 / 0.48 (16618 h; FN 48) |
| Daylight-only | 0.98 / 0.83 / 0.90 (16509 h; FN 3364) | 0.31 / 0.99 / 0.48 (16509 h; FN 58) |
| Radiation-gated 500 | 0.92 / 0.76 / 0.83 (9615 h; FN 2814) | 0.43 / 0.79 / 0.56 (9615 h; FN 1099) |
| **Radiation-gated 600 (default)** | 0.90 / 0.72 / 0.80 (8313 h; FN 2944) | 0.47 / 0.75 / 0.58 (8313 h; FN 1310) |
| Radiation-gated 700 | 0.88 / 0.68 / 0.77 (7067 h; FN 2954) | 0.51 / 0.69 / 0.59 (7067 h; FN 1613) |

Historical Forecast API (stitched short-lead, ~day 0 reference):

| Rule | Own | Vs old |
|---|---|---|
| Permissive (always G) | 0.79 / 0.53 / 0.64 (3525 h; FN 2453) | 0.79 / 0.53 / 0.64 (3525 h; FN 2453) |
| Strict (always max) | 0.98 / 0.84 / 0.91 (17007 h; FN 3083) | 0.31 / 0.99 / 0.47 (17007 h; FN 35) |
| Daylight-only | 0.98 / 0.84 / 0.91 (16892 h; FN 3054) | 0.31 / 0.99 / 0.47 (16892 h; FN 45) |
| Radiation-gated 500 | 0.92 / 0.76 / 0.83 (9598 h; FN 2800) | 0.43 / 0.78 / 0.55 (9598 h; FN 1167) |
| **Radiation-gated 600 (default)** | 0.91 / 0.72 / 0.81 (8299 h; FN 2909) | 0.46 / 0.73 / 0.57 (8299 h; FN 1402) |
| Radiation-gated 700 | 0.89 / 0.68 / 0.77 (7006 h; FN 2953) | 0.50 / 0.67 / 0.58 (7006 h; FN 1718) |

### C. Per city (reference ERA5 + best_match day+1)

Cat 5 profile = mean conditions in the city's Category 5 work-hours under the default rule; G/B = mean sun/globe-model and BoM WBGT in those hours.

| City | Region (auto) | ERA5 max Tmax °C | HW days ERA5 / forecast | Work-h ≥ 600 W/m² | Cat 5 work-h, default (share) | Cat 5 work-h: permissive / daylight-only | Cat 4–5 work-h, default | Cat 5 profile: T °C / RH % / Tw °C / G / B | Tmax MAE °C |
|---|---|---|---|---|---|---|---|---|---|
| Varanasi | plains | 46.0 | 9 / 20 | 559 | 456 (38.5%) | 199 / 772 | 601 | 39.4 / 36 / 26.6 / 31.7 / 35.9 | 1.57 |
| Bhubaneswar | plains | 41.1 | 1 / 17 | 453 | 445 (37.6%) | 173 / 1084 | 543 | 35.5 / 56 / 28.1 / 31.7 / 36.7 | 1.81 |
| Prayagraj | plains | 46.7 | 12 / 23 | 548 | 442 (37.4%) | 223 / 754 | 574 | 40.0 / 34 / 26.4 / 31.9 / 35.9 | 1.39 |
| Visakhapatnam | coastal | 37.7 | 0 / 0 | 459 | 437 (36.9%) | 6 / 1114 | 475 | 33.7 / 61 / 27.4 / 30.3 / 35.5 | 0.87 |
| Vijayawada | plains | 43.0 | 0 / 3 | 387 | 433 (36.6%) | 183 / 1134 | 518 | 37.2 / 47 / 27.7 / 31.9 / 36.6 | 0.97 |
| Kolkata | plains | 42.9 | 6 / 19 | 411 | 430 (36.3%) | 167 / 1048 | 587 | 35.3 / 58 / 28.1 / 31.7 / 36.7 | 1.78 |
| Patna | plains | 44.3 | 9 / 15 | 525 | 429 (36.3%) | 224 / 771 | 586 | 37.7 / 45 / 27.5 / 31.9 / 36.6 | 1.16 |
| Chennai | coastal | 36.5 | 0 / 28 | 411 | 413 (34.9%) | 6 / 1145 | 430 | 33.3 / 63 / 27.4 / 30.3 / 35.3 | 2.85 |
| Nagpur | plains | 44.0 | 0 / 2 | 480 | 401 (33.9%) | 121 / 816 | 520 | 37.7 / 39 / 26.3 / 31.4 / 35.1 | 1.18 |
| Raipur | plains | 45.8 | 4 / 1 | 475 | 400 (33.8%) | 109 / 845 | 507 | 38.0 / 38 / 26.1 / 31.1 / 35.0 | 1.29 |
| Lucknow | plains | 45.8 | 17 / 25 | 563 | 385 (32.5%) | 160 / 679 | 518 | 39.5 / 35 / 26.4 / 31.7 / 35.8 | 1.22 |
| Kanpur | plains | 46.3 | 16 / 23 | 554 | 375 (31.7%) | 152 / 689 | 496 | 40.2 / 32 / 26.0 / 31.6 / 35.5 | 1.21 |
| Ahmedabad | plains | 44.1 | 0 / 6 | 524 | 364 (30.8%) | 76 / 753 | 501 | 38.2 / 38 / 26.3 / 31.2 / 35.3 | 1.26 |
| Mumbai | coastal | 37.4 | 2 / 4 | 432 | 353 (29.8%) | 0 / 903 | 399 | 32.8 / 63 / 26.9 / 29.8 / 34.7 | 0.78 |
| Agra | plains | 45.8 | 9 / 23 | 541 | 344 (29.1%) | 120 / 623 | 446 | 40.1 / 31 / 25.9 / 31.5 / 35.4 | 1.70 |
| Ludhiana | plains | 45.4 | 17 / 23 | 565 | 344 (29.1%) | 129 / 542 | 437 | 40.0 / 32 / 26.1 / 31.7 / 35.6 | 1.18 |
| Jodhpur | plains | 48.0 | 7 / 7 | 538 | 330 (27.9%) | 43 / 609 | 380 | 39.9 / 30 / 25.3 / 31.0 / 34.8 | 0.66 |
| Delhi | plains | 45.5 | 12 / 25 | 560 | 320 (27.0%) | 86 / 585 | 410 | 39.7 / 32 / 25.8 / 31.3 / 35.3 | 1.15 |
| Hyderabad | plains | 42.1 | 0 / 0 | 421 | 282 (23.8%) | 3 / 569 | 380 | 36.2 / 41 / 25.2 / 30.0 / 33.7 | 0.95 |
| Jaipur | plains | 46.2 | 4 / 3 | 538 | 249 (21.0%) | 8 / 488 | 315 | 40.0 / 27 / 24.6 / 30.5 / 34.2 | 0.90 |
| Bhopal | plains | 43.8 | 0 / 0 | 497 | 211 (17.8%) | 2 / 442 | 287 | 37.6 / 36 / 25.1 / 30.2 / 34.0 | 1.14 |
| Indore | plains | 43.4 | 0 / 0 | 462 | 183 (15.5%) | 0 / 368 | 239 | 37.2 / 36 / 24.9 / 29.9 / 33.6 | 0.93 |
| Pune | plains | 39.7 | 0 / 0 | 395 | 172 (14.5%) | 1 / 302 | 270 | 34.6 / 45 / 25.0 / 29.3 / 33.1 | 1.11 |
| Bengaluru | plains | 37.3 | 0 / 0 | 424 | 4 (0.3%) | 0 / 4 | 44 | 33.6 / 47 / 24.5 / 29.2 / 32.3 | 0.92 |
| Shimla | hills | 29.9 | 0 / 1 | 539 | 0 (0.0%) | 0 / 0 | 0 | – | 0.90 |
<!-- AUTO:END -->

## How to read this

* **Heat-wave alerts:** with the model mix the app uses, day-ahead alerts caught almost all ERA5 heat-wave
  city-days (high recall) at the cost of false alarms (lower precision) — in a safety tool, a missed heat-wave day is
  worse than an extra advisory, but the false-alarm rate is a real limitation. ECMWF alone is more precise but misses more.
* **Dangerous work-hours:** the hour-level Cat 4–5 flag drives work/rest schedules. Since 9 Nov 2026 the app uses the
  radiation-gated rule (600 W/m²). Judged against the old (permissive) definition of a dangerous hour, **precision
  falls from 0.73 to 0.44** while recall rises from 0.73 to 0.84 (851 missed hours instead of 1,397): we accept more
  false alarms to miss fewer dangerous hours. Judged against its own definition it scores P 0.87 / R 0.84.
* **Category 5 is still common: 27.7 % of work-hours** under the default (7.4 % with G alone). The cause the numbers
  show is the BoM formula in strong sun: B exceeded G in every one of the 12,261 strong-sun work-hours, and 6,011 of
  the 8,202 Category 5 hours (73 %) are Category 5 only because of B. Humid coastal air is not the main driver: the
  three coastal cities give 15 % of those hours and 65 % of them had RH below 50 %; the highest shares are on the
  Gangetic plain and in the east (Varanasi 38.5 %, Bhubaneswar 37.6 %; table C, docs/METHODS.md §3b).
* **Threshold:** 500 W/m² gives a better own-rule F1 (0.87 vs 0.86) and 135 fewer missed old-definition hours; 700 W/m²
  gives better precision and F1 against the old definition (0.49 / 0.61) and a lower Category 5 share (23.1 %). 600 is
  the middle setting, not the winner on every metric (table A and B).
* **Tmax MAE** (~1 °C) is the forecast's day+1 daily-maximum error against ERA5.

## Limitations (read before quoting)

1. **ERA5 is not station data.** A 0.25° reanalysis cell smooths peaks; ERA5 Tmax is typically lower than IMD
   station Tmax in extreme heat, so the reference almost certainly under-counts heat-wave days compared with IMD bulletins (several hot cities,
   e.g. Nagpur and Ahmedabad, show 0 ERA5 heat-wave days here). The validation measures *forecast-vs-reanalysis*
   agreement, not agreement with IMD bulletins.
1. **Coastal false alarms.** At Chennai the best_match day+1 forecast ran ~2.8 °C warmer than ERA5 (table C),
   producing many coastal heat-wave alerts that ERA5 does not confirm. This is the largest single source of false alarms.
2. **Single-point criteria.** IMD declares a heat wave when the criteria hold at ≥2 stations of a meteorological
   sub-division on 2 consecutive days; we evaluate one grid point.
3. **Region type** (plains / coastal / hills) is auto-classified from elevation (≥1000 m → hills) and distance to the
   Natural Earth coastline (≤40 km → coastal). IMD uses designated stations. Bengaluru (920 m) is therefore "plains".
4. **WBGT is modelled, not measured.** The sun/globe model's psychrometric (Stull) wet-bulb tends to *under*-estimate
   WBGT in strong sun and low wind; the BoM formula ignores actual sun and wind and gives far more Cat 4–5 hours
   (table A). In strong sun (≥ 600 W/m²) the app uses the higher of the two (BoM in every such backtest work-hour), so
   its strong-sun counts are an upper-end estimate; the true number likely lies in between. The hard threshold makes
   a step between neighbouring hours (docs/METHODS.md §3a). No on-site WBGT meter data was used.
5. **No health outcomes.** We did not (and cannot, from public data) link flagged hours to heat-illness cases.
6. Work-hours are **city-hours**, not person-hours: one flagged hour in Delhi counts once regardless of how many
   people were working outdoors.

## Reproduce

```bash
python3 validation/backtest.py      # ~110 API calls to Open-Meteo (free, no key); caches raw JSON in validation/cache/
python3 validation/make_report.py   # re-renders the tables above from results.json
```
