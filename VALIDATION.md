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
* **Work-hour heat stress:** sun-exposed WBGT estimate (Dimiceli–Piltz globe + Stull wet-bulb, OSHA outdoor weights)
  for every hour 06:00–18:00 IST; "dangerous" = TB MED 507 Category 4–5.
* **Daily Tmax** = maximum of the 24 hourly values (local day) for both forecast and reference.

## Results

<!-- AUTO:BEGIN -->
Period **2024-04-01 → 2024-06-30**, **25 cities**, 2275 city-days, 29575 city work-hours (06:00–18:00 IST). Generated 2026-11-09T11:30Z by `validation/backtest.py`.

### A. Reference (ERA5) — what happened in 2024

| Metric | Value |
|---|---|
| City-days meeting the IMD heat-wave criterion (single point) | 125 |
| …of which severe | 20 |
| City-days meeting it on 2 consecutive days | 92 |
| Work-hours at WBGT Category 4–5 (moderate work needs ≥30 min rest/hour) | 5249 (17.7% of work-hours) |
| Work-hours at Category 5 (moderate work: 20 min work / 40 min rest) | 2191 |
| Same Cat 4–5 count with the simpler BoM WBGT approximation | 19767 |
| Highest hourly sun-exposed WBGT estimate | 36.7 °C |

### B. Forecast skill (day+1 unless noted)

| Forecast source | Heat-wave alert P / R / F1 (single day) | P / R / F1 (2-day rule) | Cat 4–5 hour flag P / R / F1 | Hours flagged Cat 4–5 | Tmax MAE °C | Tmax bias °C |
|---|---|---|---|---|---|---|
| Open-Meteo best_match, day+1 (Previous Runs API) — **the model mix the live app uses** | 0.45 / 0.96 / 0.61 (TP 120, FP 148, FN 5) | 0.44 / 0.97 / 0.61 | 0.73 / 0.73 / 0.73 | 5274 | 1.23 | 0.47 |
| ECMWF IFS 0.25°, day+1 (Previous Runs API) | 0.57 / 0.75 / 0.65 (TP 94, FP 70, FN 31) | 0.62 / 0.77 / 0.69 | 0.76 / 0.53 / 0.63 | 3676 | 1.12 | 0.13 |
| Historical Forecast API (stitched short-lead, ~day 0 reference) | 0.55 / 0.85 / 0.66 (TP 106, FP 88, FN 19) | 0.63 / 0.88 / 0.73 | 0.79 / 0.53 / 0.64 | 3525 | 1.06 | 0.41 |

### C. Per city (reference ERA5 + best_match day+1)

| City | Region (auto) | ERA5 max Tmax °C | HW days (ERA5) | HW days forecast | Cat 4–5 work-h | Cat 5 work-h | Max WBGT °C | Tmax MAE °C |
|---|---|---|---|---|---|---|---|---|
| Delhi | plains | 45.5 | 12 | 25 | 237 | 86 | 34.6 | 1.15 |
| Mumbai | coastal | 37.4 | 2 | 4 | 21 | 0 | 31.6 | 0.78 |
| Kolkata | plains | 42.9 | 6 | 19 | 445 | 167 | 34.4 | 1.78 |
| Chennai | coastal | 36.5 | 0 | 28 | 88 | 6 | 33.3 | 2.85 |
| Bengaluru | plains | 37.3 | 0 | 0 | 0 | 0 | 30.5 | 0.92 |
| Hyderabad | plains | 42.1 | 0 | 0 | 51 | 3 | 33.0 | 0.95 |
| Ahmedabad | plains | 44.1 | 0 | 6 | 276 | 76 | 33.9 | 1.26 |
| Pune | plains | 39.7 | 0 | 0 | 6 | 1 | 32.5 | 1.11 |
| Jaipur | plains | 46.2 | 4 | 3 | 86 | 8 | 33.0 | 0.90 |
| Lucknow | plains | 45.8 | 17 | 25 | 303 | 160 | 35.4 | 1.22 |
| Kanpur | plains | 46.3 | 16 | 23 | 300 | 152 | 36.4 | 1.21 |
| Nagpur | plains | 44.0 | 0 | 2 | 301 | 121 | 34.9 | 1.18 |
| Indore | plains | 43.4 | 0 | 0 | 17 | 0 | 32.2 | 0.93 |
| Bhopal | plains | 43.8 | 0 | 0 | 53 | 2 | 32.5 | 1.14 |
| Patna | plains | 44.3 | 9 | 15 | 380 | 224 | 36.2 | 1.16 |
| Varanasi | plains | 46.0 | 9 | 20 | 392 | 199 | 36.5 | 1.57 |
| Prayagraj | plains | 46.7 | 12 | 23 | 387 | 223 | 36.7 | 1.39 |
| Agra | plains | 45.8 | 9 | 23 | 273 | 120 | 35.3 | 1.70 |
| Ludhiana | plains | 45.4 | 17 | 23 | 280 | 129 | 35.1 | 1.18 |
| Jodhpur | plains | 48.0 | 7 | 7 | 174 | 43 | 34.4 | 0.66 |
| Raipur | plains | 45.8 | 4 | 1 | 261 | 109 | 34.4 | 1.29 |
| Bhubaneswar | plains | 41.1 | 1 | 17 | 410 | 173 | 34.2 | 1.81 |
| Visakhapatnam | coastal | 37.7 | 0 | 0 | 106 | 6 | 32.7 | 0.87 |
| Vijayawada | plains | 43.0 | 0 | 3 | 402 | 183 | 35.4 | 0.97 |
| Shimla | hills | 29.9 | 0 | 1 | 0 | 0 | 24.0 | 0.90 |
<!-- AUTO:END -->

## How to read this

* **Heat-wave alerts:** with the model mix the app uses, day-ahead alerts caught almost all ERA5 heat-wave
  city-days (high recall) at the cost of false alarms (lower precision) — in a safety tool, a missed heat-wave day is
  worse than an extra advisory, but the false-alarm rate is a real limitation. ECMWF alone is more precise but misses more.
* **Dangerous work-hours:** the hour-level Cat 4–5 flag is the number that drives work/rest schedules; its precision,
  recall and the total hours flagged are in table B.
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
4. **WBGT is modelled, not measured.** Natural wet-bulb is approximated by the psychrometric (Stull) wet-bulb, which
   tends to *under*-estimate WBGT in strong sun and low wind; the simpler BoM formula gives far more Cat 4–5 hours
   (table A), so the true number likely lies in between. No on-site WBGT meter data was used.
5. **No health outcomes.** We did not (and cannot, from public data) link flagged hours to heat-illness cases.
6. Work-hours are **city-hours**, not person-hours: one flagged hour in Delhi counts once regardless of how many
   people were working outdoors.

## Reproduce

```bash
python3 validation/backtest.py      # ~110 API calls to Open-Meteo (free, no key); caches raw JSON in validation/cache/
python3 validation/make_report.py   # re-renders the tables above from results.json
```
