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
* **Daylight-only cautious rule (default since 9 Nov 2026).** For every hour the app computes both WBGT estimates
  and the solar elevation angle at that hour's timestamp for that place (`solarElevationDeg` / `solar_elevation_deg`,
  the same NOAA solar-position equations the globe-temperature model uses; geometric elevation, no refraction).
  * **Sun up (elevation > 0°):** use the **higher** of the sun/globe model (G) and the BoM approximation (B).
  * **Sun down (elevation ≤ 0°):** use **G**. The BoM formula assumes moderately high sunlight (and light wind), so it
    does not apply when the sun is down; G already handles darkness, because its globe term then equals roughly the air
    temperature.
  * "Sun up" is decided by the sun's actual elevation, not by clock hours, so it moves with season and longitude.
  The hourly table marks each WBGT value **G** or **B**, and answers name the estimate that drove them (or say that
  the sun is down). Code: `daylightWbgt` / `assessHour` in `lib/heat.js`, `daylight_wbgt` / `wbgt_cautious` in
  `python/lusaathi_core/heat.py`; a cross-check test asserts JS == Python for the rule, the elevation and all three
  WBGT values. In the 2024 backtest B was the higher estimate in every work-hour, so during daylight the rule
  amounts to "use B, and show G next to it".

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
Geometric sunrise that day is about 05:34 IST.

| Hour (IST) | Air °C / RH % | Solar elevation | G (sun/globe) | B (BoM) | Used | Category → moderate work |
|---|---|---|---|---|---|---|
| 02:00 | 33.4 / 29 | −36.2° (night) | 24.5 °C | 28.7 °C | **G** 24.5 °C | below Cat 1 → no limit |
| 05:00 | 32.1 / 40 | −7.5° (before sunrise) | 25.1 °C | 29.6 °C | **G** 25.1 °C | below Cat 1 → no limit |
| **06:00** | 33.7 / 40 | **+4.6° (sun already up)** | 26.5 °C | 31.2 °C | **B** 31.2 °C | **Cat 4 → 30 min work / 30 min rest** |
| **14:00** | 45.9 / 7 | +67.5° | 29.0 °C | 32.7 °C | **B** 32.7 °C | **Cat 5 → 20 min work / 40 min rest, ~0.95 L/h** |
| 20:00 | 37.9 / 20 | −9.8° (after sunset) | 26.3 °C | 30.6 °C | **G** 26.3 °C | Cat 1 → no limit |

At 14:00: Stull (2011) wet-bulb 20.1 °C (within Stull's stated range, RH 5–99 %, −20…50 °C; fit at sea-level
pressure, Jaipur ~949 hPa); globe 51.7 °C; G = 0.7·20.1 + 0.2·51.7 + 0.1·45.9 = 29.0 °C (Category 2 on its own).
B = 0.567·T + 0.393·e + 3.94 = 32.7 °C. The sun is up, so the app uses the higher value: **"High risk — the guideline
allows only 20 min of work in this hour; move the work to a cooler time"**, naming the BoM formula as the source.
The NWS heat index (41.7 °C, 107 °F) is outside the range NWS defines that formula for (RH < 13 % above 112 °F; NWS:
"not valid for extreme temperature and relative humidity conditions beyond the range of data considered by
Steadman"), so it is marked `*` and not used.

At 06:00 on 29 May the sun is already 4.6° above the horizon, so the daylight-only rule still uses B (Category 4);
in the backtest Jaipur's 06:00 hour was before sunrise on 22 of 91 days (early April), and then G is used. G is used at
05:00 and earlier, and again after sunset. Caveat: right after sunrise and just before sunset the sun is far lower
than the "moderately high sunlight" BoM assumes; the rule uses the plain elevation > 0° threshold, as decided.

## 3b. Three WBGT rules side by side (2024 backtest)

The two WBGT estimates disagree, and neither has been checked against an on-site WBGT meter in India. Missing a
dangerous hour can mean heat stroke; a false alarm costs work time. The app's default is the **daylight-only** rule;
the **permissive baseline** (always G, the rule before 9 Nov 2026) and the **strict** rule (always the higher of G
and B) are kept for comparison. Data: 25 cities, 1 Apr–30 Jun 2024, Open-Meteo best_match day+1 forecasts vs ERA5
(`validation/`, VALIDATION.md). Heat-wave-day alerts (P 0.45 / R 0.96 / F1 0.61) and Tmax error (1.23 °C) do not depend
on WBGT and are the same under all three.

| Metric | Permissive baseline (always G) | Strict (max at all hours) | **Daylight-only (default)** |
|---|---|---|---|
| ERA5 work-hours (06–18 IST) at Category 4–5 | 5,249 / 29,575 (17.7 %) | 19,767 (66.8 %) | **19,625 (66.4 %)** |
| ERA5 work-hours at Category 5 | 2,191 (7.4 %) | 17,151 (58.0 %) | **17,039 (57.6 %)** |
| ERA5 hours at Category 4–5, all 24 hours | 5,332 / 54,600 (9.8 %) | 31,225 (57.2 %) | **20,155 (36.9 %)** |
| ERA5 hours at Category 5, all 24 hours | 2,195 (4.0 %) | 26,194 (48.0 %) | **17,423 (31.9 %)** |
| Work-hours flagged Cat 4–5 one day ahead | 5,274 | 18,685 | **18,557** |
| Flag judged by its own rule — P / R / F1 | 0.73 / 0.73 / 0.73 | 0.96 / 0.91 / 0.94 | **0.96 / 0.91 / 0.94** |
| Missed dangerous work-hours, own rule | 1,397 of 5,249 | 1,749 of 19,767 | **1,733 of 19,625** |
| Flag judged against the old (permissive) definition — P / R / F1 | 0.73 / 0.73 / 0.73 | 0.28 / 1.00 / 0.44 | **0.28 / 1.00 / 0.44** |
| Missed dangerous work-hours, old definition | 1,397 of 5,249 | 5 | **15** |

How to read it, plainly:

* **Precision falls** when the new flag is judged against the old definition of a dangerous hour: from 0.73 to
  **0.28** (13,323 extra flags). We accept those false alarms to avoid missing a dangerous hour: recall against the same
  old reference rises from 0.73 to **1.00** (15 missed hours instead of 1,397).
* Judged against its own definition the flag scores higher (P 0.96 / R 0.91). That is not evidence the rule is
  "more accurate": B uses only temperature and humidity, which forecasts get right more often than sun and wind, and
  two thirds of work-hours are Category 4–5 under it, which makes high precision easier.
* **Daylight-only vs strict:** within work-hours (06–18 IST) the two are almost the same, because the sun is up in
  29,032 of the 29,575 work-hours in April–June; only 543 hours switch to G: 501 at 06:00 (Mumbai and Pune on all 91 days, Jaipur on 22,
  mostly early April) and 42 at 18:00 (mostly Kolkata, the easternmost city). The difference is at night: over all 24 hours, Category 4–5 falls from 57.2 % (strict) to 36.9 %
  (daylight-only), because B no longer rates dark hours. Daylight-only does **not** reduce the daytime share
  (57.6 % of work-hours are still Category 5).
* **Mumbai:** all 1,049 of its Category 4–5 hours under the daylight-only rule were in daylight (0 at night; 998 in
  work-hours), all driven by B. Humid coastal heat still scores as dangerous because high humidity keeps sweat from
  evaporating, so the wet-bulb stays high even at moderate air temperatures: those hours averaged only 31.3 °C air but
  70 % humidity and a 26.7 °C wet-bulb, giving B 34.1 °C on average. The sun/globe model alone put the same hours at
  29.0 °C on average (Category 2), so Mumbai's high count rests on the BoM estimate.

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
   reason the app uses the higher BoM estimate while the sun is up (§3b). BoM, in turn, assumes moderately high sun and
   light wind and ignores the actual sun, so it is not used when the sun is down, and it still overstates heat stress
   in shade and when the sun is low (just after sunrise, just before sunset). The DNI derived from GHI·f<sub>db</sub>/cos z is capped at 1100 W/m² and wind is floored at 1 mph
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
