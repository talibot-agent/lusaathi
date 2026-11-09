# LuSaathi — methods and sources

All guidance shown in the app comes from the published sources below. LuSaathi does **not** invent thresholds;
where we had to simplify, it is listed under *Simplifications*.

## 1. Weather data (no API key, called directly from the browser)

| Purpose | Endpoint | Notes |
|---|---|---|
| Place search (English + Hindi names) | `geocoding-api.open-meteo.com/v1/search?countryCode=IN&language=hi|en` | Hindi queries such as `जयपुर` resolve directly |
| 72-h forecast | `api.open-meteo.com/v1/forecast` (`best_match`) | hourly temperature_2m, relative_humidity_2m, apparent_temperature, wind_speed_10m, shortwave/direct/diffuse radiation, surface_pressure; `timezone=Asia/Kolkata`, 4 days |
| Climate normal for IMD departure | `archive-api.open-meteo.com/v1/archive?models=era5` | ERA5 daily Tmax 1991–2020; fetched **only** when a day reaches the IMD base threshold, then cached in `localStorage` |
| Replay demo | `historical-forecast-api.open-meteo.com/v1/forecast` | archived forecast for a past date (`?replay=2024-05-28`) |

Open-Meteo terms: free for non-commercial use, attribution required (CC BY 4.0 data) — https://open-meteo.com/en/terms

## 2. Heat-stress indices (`lib/heat.js`, mirrored in `python/lusaathi_core/heat.py`)

* **Heat index** — US NWS Rothfusz regression incl. low/high-humidity adjustments,
  https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml . Bands at 80/90/103/125 °F (Caution / Extreme caution / Danger / Extreme danger).
  Shown for information only. Flagged `*` (`heatIndexOutOfRange`) when RH < 13 % and T > 112 °F, where NWS defines no adjustment.
  The hourly table also shows the Stull wet-bulb; `wetBulbInRange` checks Stull's stated range (RH 5–99 %, −20…50 °C).
* **Outdoor WBGT** = 0.7·T<sub>nwb</sub> + 0.2·T<sub>g</sub> + 0.1·T<sub>db</sub> (OSHA Technical Manual Sec. III Ch. 4,
  https://www.osha.gov/otm/section-3-health-hazards/chapter-4).
  * **Globe temperature T<sub>g</sub>** — Dimiceli & Piltz (NWS Tulsa), *Estimation of Black Globe Temperature for
    Calculation of the WBGT Index*, eq. 10, https://www.weather.gov/media/tsa/pdf/WBGTpaper2.pdf
    (inputs: air temperature, vapour pressure → atmospheric emissivity, global irradiance and its direct/diffuse
    split, solar zenith angle, wind in m/h). The authors report agreement within ~0.5 °F in three field tests.
  * **Natural wet-bulb T<sub>nwb</sub>** — approximated by the psychrometric wet-bulb of Stull (2011),
    *Wet-Bulb Temperature from Relative Humidity and Air Temperature*, J. Appl. Meteor. Climatol. 50:2267–2269,
    https://doi.org/10.1175/JAMC-D-11-0143.1 .
  * **Solar zenith** — NOAA General Solar Position Calculations, https://gml.noaa.gov/grad/solcalc/solareqns.PDF ,
    evaluated at mid-hour because Open-Meteo radiation is the mean of the preceding hour.
  * **Direct/diffuse split** — taken from Open-Meteo `direct_radiation`/`diffuse_radiation`; fallback Erbs et al. (1982) decomposition.
  * **2 m wind** from 10 m wind — FAO-56 eq. 47, https://www.fao.org/4/x0490e/x0490e07.htm
* **Second WBGT estimate** — Australian Bureau of Meteorology approximation
  0.567·T + 0.393·e + 3.94, https://www.bom.gov.au/info/thermal_stress/ (assumes moderate sun, light wind).
* **Radiation-gated cautious rule (default since 9 Nov 2026; method frozen, see end of §3b).** For every hour the app
  computes both WBGT estimates and reads the forecast's shortwave (global horizontal) radiation for that hour.
  * **Strong sun (shortwave ≥ 600 W/m², constant `BOM_MIN_SW_WM2`):** use the **higher** of the sun/globe model (G)
    and the BoM approximation (B).
  * **Otherwise:** use **G**. The BoM formula assumes strong sunshine (and light wind), so it is used only when the
    forecast actually shows strong sun. This also covers night (radiation 0) and the low sun of early morning and late
    afternoon; G already handles weak sun and darkness through its globe term.
  The hourly table marks each WBGT value **G** or **B**, and answers name the estimate that drove them, or say that
  the forecast sunshine (W/m²) is below 600 so BoM is not used. Code: `radiationGatedWbgt` / `assessHour` in
  `lib/heat.js`, `radiation_gated_wbgt` / `wbgt_cautious` in `python/lusaathi_core/heat.py`; a cross-check test asserts
  JS == Python for the rule (including inputs at 599 and 600 W/m²) and all WBGT values. In the 2024 backtest B was the
  higher estimate in every strong-sun work-hour, so in strong sun the rule amounts to "use B, and show G next to it".
* **Earlier rules, kept for comparison in the backtest only:** permissive (always G, before 9 Nov 2026), strict
  (always the higher of G and B) and daylight-only (the higher while the solar elevation is > 0°, NOAA equations,
  `daylightWbgt` / `solarElevationDeg`). See §3b.

## 3. Risk bands and work/rest schedule

US Army **TB MED 507 Work/Rest and Water Consumption Table** (distribution unlimited),
https://home.army.mil/bavaria/4215/3926/1059/Safety_Water_Consumption.pdf — heat-acclimated, average-size worker:

| Heat cat. | WBGT °F (°C) | Easy work | Moderate work | Hard work |
|---|---|---|---|---|
| 1 | 78–81.9 (25.6–27.7) | no limit, ½ qt/h | no limit, ¾ qt/h | 40/20 min, ¾ qt/h |
| 2 | 82–84.9 (27.8–29.4) | no limit, ½ | 50/10, ¾ | 30/30, 1 |
| 3 | 85–87.9 (29.4–31.0) | no limit, ¾ | 40/20, ¾ | 30/30, 1 |
| 4 | 88–89.9 (31.1–32.2) | no limit, ¾ | 30/30, ¾ | 20/40, 1 |
| 5 | > 90 (> 32.2) | 50/10, 1 | 20/40, 1 | 10/50, 1 |

Table caps: hourly fluid ≤ 1½ qt (≈1.4 L), daily ≤ 12 qt (≈11.4 L). 1 US qt = 0.946 L. Rest = minimal activity in shade.
Below Category 1 the table imposes no limit. LuSaathi maps "light / moderate / heavy work" to the table's Easy / Moderate / Hard columns
(examples in the table: Easy ≈ walking on hard surface at 2.5 mph with < 30 lb; Moderate ≈ walking at 3.5 mph with < 40 lb;
Hard ≈ walking at 3.5 mph with ≥ 40 lb).

For reference, the **NIOSH (2016)** recommended limits are also implemented (`nioshREL`, `nioshRAL`):
REL = 56.7 − 11.5·log<sub>10</sub>M, RAL = 59.9 − 14.1·log<sub>10</sub>M (WBGT °C, M = metabolic rate in W), *Criteria for a
Recommended Standard: Occupational Exposure to Heat and Hot Environments*, DHHS (NIOSH) 2016-106,
https://www.cdc.gov/niosh/docs/2016-106/pdfs/2016-106.pdf . OSHA notes un-acclimatised workers need 7–14 days of
gradually increasing exposure (OSHA OTM above).

## 3a. Worked example: the 2024 Jaipur replay — 14:00 and 06:00

Archived forecast (Open-Meteo Historical Forecast API) for Jaipur (26.92° N, 75.79° E), **29 May 2024**, computed by
`lib/heat.js` (`assessHour`) and pinned by tests in `tests/js/heat_imd.test.mjs` and `tests/test_heat.py`.

| Hour (IST) | Air °C / RH % | Shortwave W/m² | G (sun/globe) | B (BoM) | Used | Category → moderate work |
|---|---|---|---|---|---|---|
| 02:00 | 33.4 / 29 | 0 (night) | 24.5 °C | 28.7 °C | **G** 24.5 °C | below Cat 1 → no limit |
| **06:00** | 33.7 / 40 | **31** (sun 4.6° up) | 26.5 °C | 31.2 °C | **G** 26.5 °C | **Cat 1 → no limit** (daylight-only rule: B, Cat 4) |
| 09:00 | 38.1 / 33 | 533 | 30.0 °C | 34.1 °C | **G** 30.0 °C | Cat 3 → 40 min work / 20 min rest |
| 10:00 | 40.9 / 24 | 701 | 30.5 °C | 34.4 °C | **B** 34.4 °C | Cat 5 → 20/40 |
| **14:00** | 45.9 / 7 | **786** | 29.0 °C | 32.7 °C | **B** 32.7 °C | **Cat 5 → 20 min work / 40 min rest, ~0.95 L/h** |
| 16:00 | 45.0 / 8 | 499 | 28.4 °C | 32.5 °C | **G** 28.4 °C | Cat 2 → 50/10 |
| 20:00 | 37.9 / 20 | 0 | 26.3 °C | 30.6 °C | **G** 26.3 °C | Cat 1 → no limit |

At 14:00: Stull (2011) wet-bulb 20.1 °C (within Stull's stated range, RH 5–99 %, −20…50 °C; fit at sea-level
pressure, Jaipur ~949 hPa); globe 51.7 °C; G = 0.7·20.1 + 0.2·51.7 + 0.1·45.9 = 29.0 °C (Category 2 on its own).
B = 0.567·T + 0.393·e + 3.94 = 32.7 °C. The forecast shows strong sun (786 W/m² ≥ 600), so the app uses the higher
value: **"High risk — the guideline allows only 20 min of work in this hour; move the work to a cooler time"**, naming
the BoM formula as the source. The NWS heat index (41.7 °C, 107 °F) is outside the range NWS defines that formula for
(RH < 13 % above 112 °F; NWS: "not valid for extreme temperature and relative humidity conditions beyond the range of
data considered by Steadman"), so it is marked `*` and not used.

At 06:00 the sun is up but delivers only 31 W/m², far from the strong sun BoM assumes, so the app uses G: Category 1,
no work limit (the daylight-only rule gave B, Category 4). The BoM estimate applies from 10:00 to 15:00 that day.
Caveat: a hard threshold makes a step. At 16:00 (499 W/m², 45 °C) the answer drops from Category 5 to Category 2,
although the air is barely cooler; the step is the price of a simple, testable rule.

## 3b. Four WBGT rules side by side (2024 backtest)

The two WBGT estimates disagree, and neither has been checked against an on-site WBGT meter in India. Missing a
dangerous hour can mean heat stroke; a false alarm costs work time. The app's default is the **radiation-gated (600
W/m²)** rule; the **permissive baseline** (always G, the rule before 9 Nov 2026), **strict** (always the higher of G and
B) and **daylight-only** (the higher of G and B while the sun is up) are kept for comparison. Data: 25 cities, 1 Apr–30
Jun 2024, Open-Meteo best_match day+1 forecasts vs ERA5 (`validation/`, VALIDATION.md). Heat-wave-day alerts (P 0.45 /
R 0.96 / F1 0.61) and Tmax error (1.23 °C) do not depend on WBGT and are the same under all four.

| Metric | Permissive (always G) | Strict (always max) | Daylight-only | **Radiation-gated 600 (default)** |
|---|---|---|---|---|
| ERA5 work-hours (06–18 IST) at Category 4–5 | 5,249 / 29,575 (17.7 %) | 19,767 (66.8 %) | 19,625 (66.4 %) | **10,463 (35.4 %)** |
| ERA5 work-hours at Category 5 | 2,191 (7.4 %) | 17,151 (58.0 %) | 17,039 (57.6 %) | **8,202 (27.7 %)** |
| ERA5 hours at Category 4–5, all 24 hours | 5,332 / 54,600 (9.8 %) | 31,225 (57.2 %) | 20,155 (36.9 %) | **10,546 (19.3 %)** |
| ERA5 hours at Category 5, all 24 hours | 2,195 (4.0 %) | 26,194 (48.0 %) | 17,423 (31.9 %) | **8,206 (15.0 %)** |
| Work-hours flagged Cat 4–5 one day ahead | 5,274 | 18,685 | 18,557 | **10,003** |
| Flag judged by its own rule — P / R / F1 | 0.73 / 0.73 / 0.73 | 0.96 / 0.91 / 0.94 | 0.96 / 0.91 / 0.94 | **0.87 / 0.84 / 0.86** |
| Missed dangerous work-hours, own rule | 1,397 of 5,249 | 1,749 of 19,767 | 1,733 of 19,625 | **1,712 of 10,463** |
| Flag judged against the old (permissive) definition — P / R / F1 | 0.73 / 0.73 / 0.73 | 0.28 / 1.00 / 0.44 | 0.28 / 1.00 / 0.44 | **0.44 / 0.84 / 0.58** |
| Missed dangerous work-hours, old definition (of 5,249) | 1,397 | 5 | 15 | **851** |

Threshold tested at 500 and 700 W/m² (600 in brackets): work-hour Category 5 share 32.0 % / 23.1 % (27.7 %); flag by
its own rule P/R/F1 0.89/0.85/0.87 / 0.85/0.82/0.83 (0.87/0.84/0.86); against the old definition 0.41/0.86/0.55 /
0.49/0.82/0.61 (0.44/0.84/0.58); missed old-definition dangerous hours 716 / 961 (851). Neither alternative is worse on
everything: 500 is better on its own F1 and misses 135 fewer old-definition dangerous hours; 700 has the best precision
and F1 against the old definition and the lowest Category 5 share. 600 sits between them; it was chosen as the
middle setting, not because it wins every metric.

How to read it, plainly:

* **Work-hours in Category 5 are still high: 27.7 % (8,202 of 29,575) under the default**, down from 57.6 %
  (daylight-only), against 7.4 % with G alone. The numbers point to **the BoM formula in strong pre-monsoon sun across
  the plains**, not mainly to humid coastal air:
  * B was higher than G in **every one** of the 12,261 work-hours with ≥ 600 W/m² (by 4.3 °C on average in the
    Category 5 hours). 7,598 of the 8,202 Category 5 work-hours (93 %) are strong-sun hours, and 6,011 (73 %) are
    Category 5 only because of B.
  * B reaches the Category 5 line (32.2 °C) at about 36 °C air with 35 % humidity, or about 31 °C with 60 %. Sunny
    April–June middays on India's plains routinely meet the first; humid places meet the second.
  * Humid air is part of it, not most of it: 2,833 of the Category 5 hours (35 %) had RH ≥ 50 %; on average they
    were 37.5 °C air at 42 % humidity. The three coastal cities (Mumbai, Chennai, Visakhapatnam) contribute 1,203
    hours (15 %, for 12 % of the cities). **Mumbai** ranks 14th of 25 at 29.8 % (353 hours, all daytime, 32.8 °C /
    63 % / wet-bulb 26.9 °C on average; G alone gives Mumbai 0 Category 5 hours). Humidity explains why coastal and
    eastern cities reach Category 5 at 33–36 °C air; the dry Gangetic plain reaches it at 39–40 °C.
  * The highest shares are on the Gangetic plain and in the east: Varanasi 38.5 %, Bhubaneswar 37.6 %, Prayagraj
    37.4 %, Visakhapatnam 36.9 %, Vijayawada 36.6 %, Kolkata and Patna 36.3 %. Lowest: Bengaluru 0.3 % (920 m
    altitude, mild), Shimla 0 %.
  * With no on-site WBGT meter data we cannot say whether B or G is closer to the truth; the default is an upper-end
    estimate in strong sun.
* **Precision falls** when the flag is judged against the old definition of a dangerous hour: from 0.73 to **0.44**
  (5,605 extra flags), while recall against the same reference rises from 0.73 to **0.84** (851 missed hours instead of
  1,397). Strict and daylight-only reached recall 1.00, but at precision 0.28 and with more than half of all daytime
  hours in Category 5; the gate gives up some recall to stop rating weak-sun hours by a strong-sun formula.
* Judged against its own definition the flag scores P 0.87 / R 0.84. That is not evidence the rule is "more
  accurate": B uses only temperature and humidity, which forecasts get right more often than sun and wind.

Per-city breakdown (ERA5 reference, 1,183 work-hours per city, default rule):

| City | Region | Cat 5 work-h, default (share of 1,183) | Same, permissive (G only) | Work-h ≥ 600 W/m² | Cat 5 hours: mean air °C / RH % / wet-bulb °C | Cat 5 hours: mean G / B °C |
|---|---|---|---|---|---|---|
| Varanasi | plains | 456 (38.5 %) | 199 | 559 | 39.4 / 36 / 26.6 | 31.7 / 35.9 |
| Bhubaneswar | plains | 445 (37.6 %) | 173 | 453 | 35.5 / 56 / 28.1 | 31.7 / 36.7 |
| Prayagraj | plains | 442 (37.4 %) | 223 | 548 | 40.0 / 34 / 26.4 | 31.9 / 35.9 |
| Visakhapatnam | coastal | 437 (36.9 %) | 6 | 459 | 33.7 / 61 / 27.4 | 30.3 / 35.5 |
| Vijayawada | plains | 433 (36.6 %) | 183 | 387 | 37.2 / 47 / 27.7 | 31.9 / 36.6 |
| Kolkata | plains | 430 (36.3 %) | 167 | 411 | 35.3 / 58 / 28.1 | 31.7 / 36.7 |
| Patna | plains | 429 (36.3 %) | 224 | 525 | 37.7 / 45 / 27.5 | 31.9 / 36.6 |
| Chennai | coastal | 413 (34.9 %) | 6 | 411 | 33.3 / 63 / 27.4 | 30.3 / 35.3 |
| Nagpur | plains | 401 (33.9 %) | 121 | 480 | 37.7 / 39 / 26.3 | 31.4 / 35.1 |
| Raipur | plains | 400 (33.8 %) | 109 | 475 | 38.0 / 38 / 26.1 | 31.1 / 35.0 |
| Lucknow | plains | 385 (32.5 %) | 160 | 563 | 39.5 / 35 / 26.4 | 31.7 / 35.8 |
| Kanpur | plains | 375 (31.7 %) | 152 | 554 | 40.2 / 32 / 26.0 | 31.6 / 35.5 |
| Ahmedabad | plains | 364 (30.8 %) | 76 | 524 | 38.2 / 38 / 26.3 | 31.2 / 35.3 |
| Mumbai | coastal | 353 (29.8 %) | 0 | 432 | 32.8 / 63 / 26.9 | 29.8 / 34.7 |
| Agra | plains | 344 (29.1 %) | 120 | 541 | 40.1 / 31 / 25.9 | 31.5 / 35.4 |
| Ludhiana | plains | 344 (29.1 %) | 129 | 565 | 40.0 / 32 / 26.1 | 31.7 / 35.6 |
| Jodhpur | plains | 330 (27.9 %) | 43 | 538 | 39.9 / 30 / 25.3 | 31.0 / 34.8 |
| Delhi | plains | 320 (27.0 %) | 86 | 560 | 39.7 / 32 / 25.8 | 31.3 / 35.3 |
| Hyderabad | plains | 282 (23.8 %) | 3 | 421 | 36.2 / 41 / 25.2 | 30.0 / 33.7 |
| Jaipur | plains | 249 (21.0 %) | 8 | 538 | 40.0 / 27 / 24.6 | 30.5 / 34.2 |
| Bhopal | plains | 211 (17.8 %) | 2 | 497 | 37.6 / 36 / 25.1 | 30.2 / 34.0 |
| Indore | plains | 183 (15.5 %) | 0 | 462 | 37.2 / 36 / 24.9 | 29.9 / 33.6 |
| Pune | plains | 172 (14.5 %) | 1 | 395 | 34.6 / 45 / 25.0 | 29.3 / 33.1 |
| Bengaluru | plains | 4 (0.3 %) | 0 | 424 | 33.6 / 47 / 24.5 | 29.2 / 32.3 |
| Shimla | hills | 0 (0.0 %) | 0 | 539 | – | – |

**Method frozen** at git tag `method-freeze-2026-11-09` (9 Nov 2026): the WBGT rule, the 600 W/m² threshold, the
categories and the backtest above are fixed for the Code for a Billion 2026 submission.

## 4. IMD heat-wave criteria (`lib/imd.js`)

From the IMD FAQ on Heat Wave (https://internal.imd.gov.in/section/nhac/dynamic/FAQ_heat_wave.pdf) and NDMA
*Guidelines for Preparation of Action Plan – Prevention and Management of Heat-Wave* (2017) §1.2
(https://nidm.mha.gov.in/pdf/guidelines/new/heatwaveguidelines2017.pdf):

* Considered only if Tmax ≥ 40 °C (plains), ≥ 37 °C (coastal), ≥ 30 °C (hilly regions).
* Departure from normal 4.5–6.4 °C → heat wave; > 6.4 °C → severe heat wave.
* Plains, actual Tmax: ≥ 45 °C → heat wave; ≥ 47 °C → severe heat wave.
* Coastal: departure ≥ 4.5 °C with actual Tmax ≥ 37 °C → heat wave.
* Declared when met at ≥ 2 stations of a met sub-division on ≥ 2 consecutive days (declared on day 2).

**NDMA Do's & Don'ts** used in answers (same 2017 guideline, Annexure): avoid going out in the sun 12:00–15:00;
employers: provide cool drinking water, caution workers to avoid direct sunlight, schedule strenuous jobs to cooler
times of the day, increase frequency and length of rest breaks, give additional attention to pregnant workers and
workers with a medical condition.

## 5. Simplifications (honest list)

1. IMD criteria are applied at **one grid point** (not ≥2 stations); the 2-consecutive-day rule is computed and shown in
   the backtest but the app labels a single day as "criterion met", not "IMD declared".
2. **Region type**: elevation ≥ 1000 m → hills; ≤ 40 km from the Natural Earth 1:50m coastline → coastal; else plains.
   IMD designates stations individually; users can override the region in the UI.
3. **Normal Tmax** = ERA5 1991–2020 mean in a ±7-day window (IMD uses station normals).
4. **Natural wet-bulb ≈ psychrometric wet-bulb**, which can underestimate WBGT in full sun / still air; that is one
   reason the app uses the higher BoM estimate when the forecast shows strong sun (≥ 600 W/m², §3b). BoM, in turn,
   assumes strong sun and light wind and ignores the actual sun, so it is used only in strong sun, and there it can
   still overstate heat stress in shade. The hard threshold makes a step (Jaipur 15:00 → 16:00, §3a). The DNI derived from GHI·f<sub>db</sub>/cos z is capped at 1100 W/m² and wind is floored at 1 mph
   (lower end of the range studied by Dimiceli & Piltz) to keep low-sun hours stable.
5. Forecast grid (~9–25 km) does not see local effects: tin roofs, asphalt, kilns, shade, indoor heat sources.
6. TB MED 507 was written for acclimatised soldiers in uniform; it is a conservative, public-domain work/rest scheme,
   not an Indian legal standard.

## 6. Q&A agent (`lib/intent.js`, `lib/advisor.js`)

Rule-based, deterministic, runs in the browser — no LLM, no server, no data leaves the device except the weather API calls.
Extracts **place** (built-in gazetteer of ~65 Indian cities with English/Hindi/Hinglish aliases, else "in X" / "X में"
patterns → geocoder), **day** (today/tomorrow/day-after, आज/कल/परसों, weekdays in both languages), **hour**
(2pm, 14:00, "at 4", दोपहर/सुबह/शाम/रात + बजे, Devanagari digits), and **workload** (keywords such as bricks/ईंट/ढोना → heavy).
Answers are composed only from the computed forecast numbers, in the language of the question.
