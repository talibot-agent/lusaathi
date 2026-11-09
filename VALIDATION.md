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
  default **daylight-only rule**: while the sun is up (solar elevation > 0° at that place and hour, NOAA equations)
  the higher of the sun/globe WBGT G (Dimiceli–Piltz globe + Stull wet-bulb, OSHA outdoor weights) and the BoM WBGT
  approximation B; when the sun is down, G. "Dangerous" = TB MED 507 Category 4–5. The **strict** rule (higher of G
  and B at all hours) and the old **permissive baseline** (always G) are computed in the same run from the same data.
* **Daily Tmax** = maximum of the 24 hourly values (local day) for both forecast and reference.

## Results

<!-- AUTO:BEGIN -->
Period **2024-04-01 → 2024-06-30**, **25 cities**, 2275 city-days, 29575 city work-hours (06:00–18:00 IST). Generated 2026-11-09T16:18Z by `validation/backtest.py`.

### A. Reference (ERA5) — what happened in 2024

Three WBGT rules, computed in the same run from the same data: **daylight-only** (the app's default: the higher of the sun/globe-model WBGT G and the BoM WBGT B while the sun is up, G when it is down), **strict** (the higher of G and B at every hour) and the **permissive baseline** (always G, the app's rule before 9 Nov 2026).

| Metric | Daylight-only (default) | Strict (all hours) | Permissive baseline |
|---|---|---|---|
| City-days meeting the IMD heat-wave criterion (single point) | 125 | same | same |
| …of which severe | 20 | same | same |
| City-days meeting it on 2 consecutive days | 92 | same | same |
| Work-hours (06–18 IST) at Category 4–5 | 19625 (66.4%) | 19767 (66.8%) | 5249 (17.7%) |
| Work-hours at Category 5 | 17039 (57.6%) | 17151 (58.0%) | 2191 (7.4%) |
| All 24 hours at Category 4–5 | 20155 (36.9%) | 31225 (57.2%) | 5332 (9.8%) |
| All 24 hours at Category 5 | 17423 (31.9%) | 26194 (48.0%) | 2195 (4.0%) |
| Work-hours with the sun down (G used under daylight-only) | 543 of 29575 | – | – |
| Work-hours where B was higher and drove the answer | 29032 | 29575 | 0 |
| Highest hourly WBGT estimate (work-hours) | 42.8 °C | – | 36.7 °C |

### B. Forecast skill (day+1 unless noted)

Heat-wave alerts and Tmax do not depend on WBGT, so they are identical under all three rules.

| Forecast source | Heat-wave alert P / R / F1 (single day) | P / R / F1 (2-day rule) | Tmax MAE °C | Tmax bias °C |
|---|---|---|---|---|
| Open-Meteo best_match, day+1 (Previous Runs API) — **the model mix the live app uses** | 0.45 / 0.96 / 0.61 (TP 120, FP 148, FN 5) | 0.44 / 0.97 / 0.61 | 1.23 | 0.47 |
| ECMWF IFS 0.25°, day+1 (Previous Runs API) | 0.57 / 0.75 / 0.65 (TP 94, FP 70, FN 31) | 0.62 / 0.77 / 0.69 | 1.12 | 0.13 |
| Historical Forecast API (stitched short-lead, ~day 0 reference) | 0.55 / 0.85 / 0.66 (TP 106, FP 88, FN 19) | 0.63 / 0.88 / 0.73 | 1.06 | 0.41 |

**Dangerous work-hour flag (Category 4–5): P / R / F1, hours flagged, missed dangerous hours (FN).** "Own" = judged against a reference computed with the same rule; "old" = judged against the permissive (always-G) definition of a dangerous hour.

| Forecast source | Daylight-only, own | Daylight-only vs old | Strict, own | Strict vs old | Permissive (own = old) |
|---|---|---|---|---|---|
| Open-Meteo best_match, day+1 (Previous Runs API) — **the model mix the live app uses** | 0.96 / 0.91 / 0.94 (18557 h; FN 1733) | 0.28 / 1.00 / 0.44 (18557 h; FN 15) | 0.96 / 0.91 / 0.94 (18685 h; FN 1749) | 0.28 / 1.00 / 0.44 (18685 h; FN 5) | 0.73 / 0.73 / 0.73 (5274 h; FN 1397) |
| ECMWF IFS 0.25°, day+1 (Previous Runs API) | 0.98 / 0.83 / 0.90 (16509 h; FN 3364) | 0.31 / 0.99 / 0.48 (16509 h; FN 58) | 0.99 / 0.83 / 0.90 (16618 h; FN 3397) | 0.31 / 0.99 / 0.48 (16618 h; FN 48) | 0.76 / 0.53 / 0.63 (3676 h; FN 2455) |
| Historical Forecast API (stitched short-lead, ~day 0 reference) | 0.98 / 0.84 / 0.91 (16892 h; FN 3054) | 0.31 / 0.99 / 0.47 (16892 h; FN 45) | 0.98 / 0.84 / 0.91 (17007 h; FN 3083) | 0.31 / 0.99 / 0.47 (17007 h; FN 35) | 0.79 / 0.53 / 0.64 (3525 h; FN 2453) |

### C. Per city (reference ERA5 + best_match day+1)

| City | Region (auto) | ERA5 max Tmax °C | HW days (ERA5) | HW days forecast | Cat 4–5 work-h | Cat 5 work-h | Cat 4–5 work-h (strict) | Cat 4–5 work-h (permissive) | Cat 4–5 hours, all 24 h: day / night | Max WBGT °C | Tmax MAE °C |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Delhi | plains | 45.5 | 12 | 25 | 654 | 585 | 654 | 237 | 699 / 0 | 39.6 | 1.15 |
| Mumbai | coastal | 37.4 | 2 | 4 | 998 | 903 | 1068 | 21 | 1049 / 0 | 38.0 | 0.78 |
| Kolkata | plains | 42.9 | 6 | 19 | 1119 | 1048 | 1139 | 445 | 1155 / 13 | 41.5 | 1.78 |
| Chennai | coastal | 36.5 | 0 | 28 | 1169 | 1145 | 1183 | 88 | 1169 / 0 | 38.6 | 2.85 |
| Bengaluru | plains | 37.3 | 0 | 0 | 68 | 4 | 68 | 0 | 68 / 0 | 32.5 | 0.92 |
| Hyderabad | plains | 42.1 | 0 | 0 | 833 | 569 | 833 | 51 | 833 / 0 | 36.0 | 0.95 |
| Ahmedabad | plains | 44.1 | 0 | 6 | 852 | 753 | 861 | 276 | 912 / 0 | 39.5 | 1.26 |
| Pune | plains | 39.7 | 0 | 0 | 604 | 302 | 616 | 6 | 625 / 0 | 37.4 | 1.11 |
| Jaipur | plains | 46.2 | 4 | 3 | 606 | 488 | 606 | 86 | 642 / 0 | 37.7 | 0.90 |
| Lucknow | plains | 45.8 | 17 | 25 | 797 | 679 | 797 | 303 | 797 / 6 | 39.6 | 1.22 |
| Kanpur | plains | 46.3 | 16 | 23 | 787 | 689 | 787 | 300 | 797 / 4 | 39.4 | 1.21 |
| Nagpur | plains | 44.0 | 0 | 2 | 952 | 816 | 952 | 301 | 952 / 1 | 39.4 | 1.18 |
| Indore | plains | 43.4 | 0 | 0 | 538 | 368 | 538 | 17 | 571 / 0 | 36.3 | 0.93 |
| Bhopal | plains | 43.8 | 0 | 0 | 613 | 442 | 613 | 53 | 638 / 0 | 37.3 | 1.14 |
| Patna | plains | 44.3 | 9 | 15 | 887 | 771 | 887 | 380 | 887 / 36 | 42.8 | 1.16 |
| Varanasi | plains | 46.0 | 9 | 20 | 878 | 772 | 878 | 392 | 878 / 8 | 41.7 | 1.57 |
| Prayagraj | plains | 46.7 | 12 | 23 | 860 | 754 | 860 | 387 | 860 / 6 | 40.4 | 1.39 |
| Agra | plains | 45.8 | 9 | 23 | 714 | 623 | 714 | 273 | 751 / 0 | 40.3 | 1.70 |
| Ludhiana | plains | 45.4 | 17 | 23 | 625 | 542 | 625 | 280 | 666 / 1 | 40.0 | 1.18 |
| Jodhpur | plains | 48.0 | 7 | 7 | 663 | 609 | 663 | 174 | 715 / 0 | 38.3 | 0.66 |
| Raipur | plains | 45.8 | 4 | 1 | 962 | 845 | 962 | 261 | 962 / 3 | 38.6 | 1.29 |
| Bhubaneswar | plains | 41.1 | 1 | 17 | 1119 | 1084 | 1127 | 410 | 1119 / 0 | 40.8 | 1.81 |
| Visakhapatnam | coastal | 37.7 | 0 | 0 | 1159 | 1114 | 1159 | 106 | 1159 / 0 | 38.8 | 0.87 |
| Vijayawada | plains | 43.0 | 0 | 3 | 1168 | 1134 | 1177 | 402 | 1168 / 5 | 40.3 | 0.97 |
| Shimla | hills | 29.9 | 0 | 1 | 0 | 0 | 0 | 0 | 0 / 0 | 26.9 | 0.90 |
<!-- AUTO:END -->

## How to read this

* **Heat-wave alerts:** with the model mix the app uses, day-ahead alerts caught almost all ERA5 heat-wave
  city-days (high recall) at the cost of false alarms (lower precision) — in a safety tool, a missed heat-wave day is
  worse than an extra advisory, but the false-alarm rate is a real limitation. ECMWF alone is more precise but misses more.
* **Dangerous work-hours:** the hour-level Cat 4–5 flag drives work/rest schedules. Since 9 Nov 2026 the app uses the
  daylight-only rule. Judged against the old (permissive) definition of a dangerous hour, **precision falls from 0.73
  to 0.28** while recall rises from 0.73 to 1.00 (15 missed hours instead of 1,397): we accept more false alarms to
  avoid missing a dangerous hour. Judged against its own definition it scores P 0.96 / R 0.91, partly because BoM uses
  only temperature and humidity (easier to forecast than sun and wind) and because two thirds of work-hours are
  Category 4–5 under it. Within work-hours daylight-only and strict are nearly identical (the sun is up in 29,032 of
  29,575); they differ at night (all-24-hour Category 4–5 share 36.9 % vs 57.2 %). See docs/METHODS.md §3b.
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
   (table A). While the sun is up the app uses the higher of the two (BoM in every sun-up backtest work-hour), so its
   daytime counts are an upper-end estimate; the true number likely lies in between. No on-site WBGT meter data was used.
5. **No health outcomes.** We did not (and cannot, from public data) link flagged hours to heat-illness cases.
6. Work-hours are **city-hours**, not person-hours: one flagged hour in Delhi counts once regardless of how many
   people were working outdoors.

## Reproduce

```bash
python3 validation/backtest.py      # ~110 API calls to Open-Meteo (free, no key); caches raw JSON in validation/cache/
python3 validation/make_report.py   # re-renders the tables above from results.json
```
