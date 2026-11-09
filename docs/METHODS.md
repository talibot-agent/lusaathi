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
* **Cross-check WBGT** — Australian Bureau of Meteorology approximation
  0.567·T + 0.393·e + 3.94, https://www.bom.gov.au/info/thermal_stress/ (assumes moderate sun, light wind).

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

## 3a. Worked example: why the 2024 Jaipur replay says "yes, with breaks" at 46 °C

Archived forecast (Open-Meteo Historical Forecast API) for Jaipur, **29 May 2024, 14:00 IST**: air 45.9 °C, relative
humidity 7 %, 10 m wind 17.1 km/h, global radiation 786 W/m², surface pressure 948.6 hPa. Computed by `lib/heat.js`
(`assessHour`); reproduced by the tests in `tests/js/heat_imd.test.mjs` and `tests/test_heat.py`:

| Quantity | Formula (source) | Value | Within the formula's stated range? |
|---|---|---|---|
| Wet-bulb T<sub>w</sub> | Stull (2011) | **20.1 °C** | Yes — Stull states RH 5–99 %, −20…50 °C (fit at sea-level pressure; Jaipur is at ~949 hPa) |
| Globe T<sub>g</sub> | Dimiceli & Piltz eq. 10 | 51.7 °C | — |
| **Outdoor WBGT** | 0.7·T<sub>w</sub> + 0.2·T<sub>g</sub> + 0.1·T = 14.1 + 10.3 + 4.6 (OSHA) | **29.0 °C (84.2 °F)** | — |
| TB MED 507 category | 82–84.9 °F | **Category 2** → moderate work 50 min work / 10 min rest, 0.71 L/h | — |
| Heat index | NWS Rothfusz regression | 41.7 °C (107 °F) | **No** — 114.6 °F with RH < 13 %: the NWS low-humidity adjustment is only defined up to 112 °F, and NWS says the regression "is not valid for extreme temperature and relative humidity conditions beyond the range of data considered by Steadman". The app marks such values with `*` and does **not** use the heat index for work/rest. |
| Cross-check WBGT | BoM approximation | 32.7 °C → Category 5 | Assumes moderate sun and light wind |

**Plain reading:** in air this dry, sweat evaporates fast, so the wet-bulb temperature is only 20.1 °C, and the wet-bulb
term carries 70 % of the WBGT weight; that keeps the sun-exposed WBGT at 29.0 °C, just 0.4 °C below the Category 3
threshold. The verdict is what the model computes, not a measured safe limit: the simpler BoM cross-check puts the same
hour in Category 5, and the psychrometric wet-bulb can underestimate the natural wet-bulb in full sun (§5, item 4), so
the app's figure is the less conservative of the two estimates.

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
4. **Natural wet-bulb ≈ psychrometric wet-bulb**, which can underestimate WBGT in full sun / still air (the BoM figure is
   shown as a higher cross-check). The DNI derived from GHI·f<sub>db</sub>/cos z is capped at 1100 W/m² and wind is floored at 1 mph
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
