// LuSaathi heat-stress math. Pure functions, no DOM. Mirrored in python/lusaathi_core/heat.py
// (tests/js/crosscheck.test.mjs asserts both implementations agree).
//
// Sources (see docs/METHODS.md):
//  - Heat index: US NWS Rothfusz regression + adjustments,
//    https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
//  - Wet-bulb: Stull (2011), J. Appl. Meteor. Climatol. 50, 2267-2269, doi:10.1175/JAMC-D-11-0143.1
//  - Globe temperature: Dimiceli & Piltz (NWS Tulsa), "Estimation of Black Globe Temperature
//    for Calculation of the WBGT Index", https://www.weather.gov/media/tsa/pdf/WBGTpaper2.pdf
//  - Outdoor WBGT weighting 0.7 Tnwb + 0.2 Tg + 0.1 Tdb: OSHA Technical Manual Sec. III Ch. 4,
//    https://www.osha.gov/otm/section-3-health-hazards/chapter-4
//  - Simple WBGT approximation: Australian Bureau of Meteorology,
//    https://www.bom.gov.au/info/thermal_stress/
//  - 10 m -> 2 m wind: FAO-56 Eq. 47 (Allen et al. 1998), https://www.fao.org/4/x0490e/x0490e07.htm
//  - Solar position: NOAA General Solar Position Calculations,
//    https://gml.noaa.gov/grad/solcalc/solareqns.PDF
//  - Heat categories and work/rest: US Army TB MED 507 Work/Rest and Water Consumption Table
//    (distribution unlimited), https://home.army.mil/bavaria/4215/3926/1059/Safety_Water_Consumption.pdf

export const SIGMA = 5.67e-8;

export const cToF = (c) => c * 9 / 5 + 32;
export const fToC = (f) => (f - 32) * 5 / 9;

/** NWS heat index (°C in, °C out). */
export function heatIndexC(tC, rh) {
  const T = cToF(tC);
  const R = rh;
  let hi = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094);
  if ((hi + T) / 2 >= 80) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
      - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R
      + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
    if (R < 13 && T >= 80 && T <= 112) {
      hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (R > 85 && T >= 80 && T <= 87) {
      hi += ((R - 85) / 10) * ((87 - T) / 5);
    }
  }
  return fToC(hi);
}

/**
 * True when the NWS heat index is outside the range NWS documents for it: the low-humidity adjustment is only
 * defined for RH < 13 % at 80–112 °F, and "the Rothfusz regression is not valid for extreme temperature and
 * relative humidity conditions beyond the range of data considered by Steadman" (NWS WPC heat-index page).
 */
export function heatIndexOutOfRange(tC, rh) {
  return rh < 13 && cToF(tC) > 112;
}

/** NWS heat-index advisory bands (°F thresholds 80/90/103/125). */
export function heatIndexBand(hiC) {
  const f = cToF(hiC);
  if (f >= 125) return 4; // Extreme danger
  if (f >= 103) return 3; // Danger
  if (f >= 90) return 2;  // Extreme caution
  if (f >= 80) return 1;  // Caution
  return 0;
}

/** Stull (2011) psychrometric wet-bulb temperature (°C). RH clamped to the fit's 5–99% range. */
export function wetBulbStullC(tC, rh) {
  const R = Math.min(99, Math.max(5, rh));
  const T = tC;
  return T * Math.atan(0.151977 * Math.sqrt(R + 8.313659)) + Math.atan(T + R)
    - Math.atan(R - 1.676331) + 0.00391838 * Math.pow(R, 1.5) * Math.atan(0.023101 * R)
    - 4.686035;
}

/** Stull (2011) stated validity: RH 5–99 %, T −20…50 °C (sea-level pressure; low-RH + cold excluded). */
export function wetBulbInRange(tC, rh) {
  return rh >= 5 && rh <= 99 && tC >= -20 && tC <= 50;
}

/** Actual vapour pressure (hPa) from T (°C), RH (%), pressure (hPa) – as in Dimiceli & Piltz eq. 6. */
export function vapourPressureHpa(tC, rh, pHpa = 1013.25) {
  return (rh / 100) * (1.0007 + 0.00000346 * pHpa) * 6.112 * Math.exp(17.502 * tC / (240.97 + tC));
}

/** Australian BoM simple WBGT approximation (°C). Assumes moderate sun & light wind. */
export function wbgtBomC(tC, rh) {
  const e = (rh / 100) * 6.105 * Math.exp(17.27 * tC / (237.7 + tC));
  return 0.567 * tC + 0.393 * e + 3.94;
}

/** FAO-56 eq. 47 log-profile conversion of 10 m wind to 2 m. */
export const wind10to2 = (u10) => u10 * 4.87 / Math.log(67.8 * 10 - 5.42);

/** Cosine of solar zenith angle (NOAA general solar position equations). utcMs = epoch ms (UTC). */
export function cosZenith(utcMs, latDeg, lonDeg) {
  const d = new Date(utcMs);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const doy = Math.floor((utcMs - start) / 86400000) + 1;
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const g = 2 * Math.PI / 365 * (doy - 1 + (hour - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hour * 60 + eqt + 4 * lonDeg;
  const ha = (tst / 4 - 180) * Math.PI / 180;
  const lat = latDeg * Math.PI / 180;
  return Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
}

/** Erbs et al. (1982) diffuse fraction from clearness index (fallback when direct/diffuse split is missing). */
export function erbsDiffuseFraction(ghi, cosz) {
  if (ghi <= 0 || cosz <= 0) return 1;
  const kt = Math.min(1, ghi / (1361 * cosz));
  if (kt <= 0.22) return 1 - 0.09 * kt;
  if (kt <= 0.8) return 0.9511 - 0.1604 * kt + 4.388 * kt ** 2 - 16.638 * kt ** 3 + 12.336 * kt ** 4;
  return 0.165;
}

export const DNI_CAP = 1100;      // W/m², guards S*fdb/cos(z) blow-up at low sun angles
export const MIN_WIND_M_PER_H = 1690; // ≈1 mph, lower bound of the range analysed by Dimiceli & Piltz

/**
 * Black-globe temperature (°C), Dimiceli & Piltz eq. 10 (inputs exactly as in their algorithm:
 * Ta in °C, u in metres per hour, S in W/m², fdb/fdif fractions, cos z).
 */
export function globeTempDimiceliC(tC, rh, ghi, fdb, fdif, cosz, wind2ms, pHpa = 1013.25) {
  const ea = vapourPressureHpa(tC, rh, pHpa);
  const epsA = 0.575 * Math.pow(ea, 1 / 7);
  const u = Math.max(MIN_WIND_M_PER_H, wind2ms * 3600);
  const C = 0.315 * Math.pow(u, 0.58) / 5.3865e-8;
  let direct = 0;
  let diffuse = 0;
  if (ghi > 0 && cosz > 0) {
    const dni = Math.min(DNI_CAP, (ghi * fdb) / cosz);
    direct = dni / (4 * SIGMA);
    diffuse = (1.2 / SIGMA) * ghi * fdif;
  }
  const B = direct + diffuse + epsA * Math.pow(tC, 4);
  return (B + C * tC + 7680000) / (C + 256000);
}

/**
 * Hourly outdoor (sun-exposed) WBGT estimate.
 * h = {tC, rh, wind10kmh, ghi, direct, diffuse, pHpa, utcMs, lat, lon}
 * Radiation values from Open-Meteo are means over the preceding hour, so solar geometry is
 * evaluated at the middle of that hour (utcMs - 30 min).
 */
export function wbgtOutdoor(h) {
  const cz = cosZenith(h.utcMs - 1800000, h.lat, h.lon);
  const ghi = Math.max(0, h.ghi || 0);
  let fdb;
  let fdif;
  if (ghi > 0 && h.direct != null && h.diffuse != null && (h.direct + h.diffuse) > 0) {
    fdb = h.direct / (h.direct + h.diffuse);
    fdif = 1 - fdb;
  } else {
    fdif = erbsDiffuseFraction(ghi, cz);
    fdb = 1 - fdif;
  }
  const u2 = wind10to2((h.wind10kmh || 0) / 3.6);
  const tw = wetBulbStullC(h.tC, h.rh);
  const tg = globeTempDimiceliC(h.tC, h.rh, ghi, fdb, fdif, cz, u2, h.pHpa || 1013.25);
  const wbgt = 0.7 * tw + 0.2 * tg + 0.1 * h.tC;
  return { wbgt, tw, tg, cosz: cz };
}

/** TB MED 507 heat category from WBGT (°C). 0 = below Category 1 (<78°F). */
export function heatCategory(wbgtC) {
  const f = cToF(wbgtC);
  if (f >= 90) return 5;
  if (f >= 88) return 4;
  if (f >= 85) return 3;
  if (f >= 82) return 2;
  if (f >= 78) return 1;
  return 0;
}

// TB MED 507 Work/Rest and Water Consumption Table (heat-acclimated, average-size worker).
// work = minutes of work per hour (60 = "no limit"); water in US quarts/hour.
const TABLE = {
  easy:     [[60, 0.5], [60, 0.5], [60, 0.5], [60, 0.75], [60, 0.75], [50, 1]],
  moderate: [[60, 0.75], [60, 0.75], [50, 0.75], [40, 0.75], [30, 0.75], [20, 1]],
  hard:     [[60, 0.75], [40, 0.75], [30, 1], [30, 1], [20, 1], [10, 1]],
};
// Category 0 (<78°F) is outside the TB MED 507 table; we show "no limit" and the Category-1 water rate.
export const QT_TO_L = 0.946353;

export function workRest(category, workload = 'moderate') {
  const row = TABLE[workload] || TABLE.moderate;
  const [work, qt] = row[Math.max(0, Math.min(5, category))];
  return {
    workMin: work,
    restMin: 60 - work,
    noLimit: work === 60,
    waterLph: Math.round(qt * QT_TO_L * 100) / 100,
    inTable: category >= 1,
  };
}

/** NIOSH (2016) Recommended Exposure Limit / Recommended Alert Limit, WBGT °C, M in watts. */
export const nioshREL = (M) => 56.7 - 11.5 * Math.log10(M);
export const nioshRAL = (M) => 59.9 - 14.1 * Math.log10(M);

/**
 * Cautious rule: of the two WBGT estimates (sun/globe model vs BoM approximation) use the higher one.
 * source = 'globe' when the sun/globe model is higher or equal, 'bom' when the BoM approximation is higher.
 */
export function cautiousWbgt(wbgtGlobe, wbgtBom) {
  return wbgtBom > wbgtGlobe ? { wbgt: wbgtBom, source: 'bom' } : { wbgt: wbgtGlobe, source: 'globe' };
}

/** Full per-hour assessment. Category, work/rest and verdict use the cautious (higher) WBGT. */
export function assessHour(h, workload = 'moderate') {
  const o = wbgtOutdoor(h);
  const hi = heatIndexC(h.tC, h.rh);
  const wbgtBom = wbgtBomC(h.tC, h.rh);
  const c = cautiousWbgt(o.wbgt, wbgtBom);
  const cat = heatCategory(c.wbgt);
  return {
    ...o,
    wbgtGlobe: o.wbgt,
    wbgt: c.wbgt,
    wbgtSource: c.source,
    hi,
    hiBand: heatIndexBand(hi),
    hiOutOfRange: heatIndexOutOfRange(h.tC, h.rh),
    twInRange: wetBulbInRange(h.tC, h.rh),
    wbgtBom,
    category: cat,
    dangerous: cat >= 4,
    workRest: workRest(cat, workload),
  };
}
