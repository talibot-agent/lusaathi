"""Heat-stress math. Python mirror of lib/heat.js -- keep the two in sync (see tests/js/crosscheck.test.mjs).

Sources: see lib/heat.js header and docs/METHODS.md.
"""
import math
from datetime import datetime, timezone

SIGMA = 5.67e-8
DNI_CAP = 1100.0
MIN_WIND_M_PER_H = 1690.0
QT_TO_L = 0.946353


def c_to_f(c):
    return c * 9 / 5 + 32


def f_to_c(f):
    return (f - 32) * 5 / 9


def heat_index_c(t_c, rh):
    T, R = c_to_f(t_c), rh
    hi = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094)
    if (hi + T) / 2 >= 80:
        hi = (-42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
              - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R
              + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R)
        if R < 13 and 80 <= T <= 112:
            hi -= ((13 - R) / 4) * math.sqrt((17 - abs(T - 95)) / 17)
        elif R > 85 and 80 <= T <= 87:
            hi += ((R - 85) / 10) * ((87 - T) / 5)
    return f_to_c(hi)


def heat_index_out_of_range(t_c, rh):
    """NWS low-RH adjustment is only defined for RH < 13 % at 80-112 F; beyond that the regression is unreliable."""
    return rh < 13 and c_to_f(t_c) > 112


def wet_bulb_in_range(t_c, rh):
    """Stull (2011) validity: RH 5-99 %, T -20..50 C."""
    return 5 <= rh <= 99 and -20 <= t_c <= 50


def heat_index_band(hi_c):
    f = c_to_f(hi_c)
    for thr, band in ((125, 4), (103, 3), (90, 2), (80, 1)):
        if f >= thr:
            return band
    return 0


def wet_bulb_stull_c(t_c, rh):
    R = min(99.0, max(5.0, rh))
    T = t_c
    return (T * math.atan(0.151977 * math.sqrt(R + 8.313659)) + math.atan(T + R)
            - math.atan(R - 1.676331) + 0.00391838 * R ** 1.5 * math.atan(0.023101 * R)
            - 4.686035)


def vapour_pressure_hpa(t_c, rh, p_hpa=1013.25):
    return (rh / 100) * (1.0007 + 0.00000346 * p_hpa) * 6.112 * math.exp(17.502 * t_c / (240.97 + t_c))


def wbgt_bom_c(t_c, rh):
    e = (rh / 100) * 6.105 * math.exp(17.27 * t_c / (237.7 + t_c))
    return 0.567 * t_c + 0.393 * e + 3.94


def wind10to2(u10):
    return u10 * 4.87 / math.log(67.8 * 10 - 5.42)


def cos_zenith(utc_ms, lat_deg, lon_deg):
    d = datetime.fromtimestamp(utc_ms / 1000, tz=timezone.utc)
    doy = d.timetuple().tm_yday
    hour = d.hour + d.minute / 60 + d.second / 3600
    g = 2 * math.pi / 365 * (doy - 1 + (hour - 12) / 24)
    eqt = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                    - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    decl = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g)
            - 0.006758 * math.cos(2 * g) + 0.000907 * math.sin(2 * g)
            - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    tst = hour * 60 + eqt + 4 * lon_deg
    ha = math.radians(tst / 4 - 180)
    lat = math.radians(lat_deg)
    return math.sin(lat) * math.sin(decl) + math.cos(lat) * math.cos(decl) * math.cos(ha)


def erbs_diffuse_fraction(ghi, cosz):
    if ghi <= 0 or cosz <= 0:
        return 1.0
    kt = min(1.0, ghi / (1361 * cosz))
    if kt <= 0.22:
        return 1 - 0.09 * kt
    if kt <= 0.8:
        return 0.9511 - 0.1604 * kt + 4.388 * kt ** 2 - 16.638 * kt ** 3 + 12.336 * kt ** 4
    return 0.165


def globe_temp_dimiceli_c(t_c, rh, ghi, fdb, fdif, cosz, wind2ms, p_hpa=1013.25):
    ea = vapour_pressure_hpa(t_c, rh, p_hpa)
    eps_a = 0.575 * ea ** (1 / 7)
    u = max(MIN_WIND_M_PER_H, wind2ms * 3600)
    C = 0.315 * u ** 0.58 / 5.3865e-8
    direct = diffuse = 0.0
    if ghi > 0 and cosz > 0:
        dni = min(DNI_CAP, ghi * fdb / cosz)
        direct = dni / (4 * SIGMA)
        diffuse = (1.2 / SIGMA) * ghi * fdif
    B = direct + diffuse + eps_a * t_c ** 4
    return (B + C * t_c + 7680000) / (C + 256000)


def wbgt_outdoor(t_c, rh, wind10kmh, ghi, direct, diffuse, utc_ms, lat, lon, p_hpa=1013.25):
    cz = cos_zenith(utc_ms - 1800000, lat, lon)
    ghi = max(0.0, ghi or 0.0)
    if ghi > 0 and direct is not None and diffuse is not None and (direct + diffuse) > 0:
        fdb = direct / (direct + diffuse)
        fdif = 1 - fdb
    else:
        fdif = erbs_diffuse_fraction(ghi, cz)
        fdb = 1 - fdif
    u2 = wind10to2((wind10kmh or 0) / 3.6)
    tw = wet_bulb_stull_c(t_c, rh)
    tg = globe_temp_dimiceli_c(t_c, rh, ghi, fdb, fdif, cz, u2, p_hpa or 1013.25)
    return {"wbgt": 0.7 * tw + 0.2 * tg + 0.1 * t_c, "tw": tw, "tg": tg, "cosz": cz}


def cautious_wbgt(wbgt_globe, wbgt_bom):
    """Use the higher (more cautious) of the two WBGT estimates. Returns (wbgt, source)."""
    return (wbgt_bom, "bom") if wbgt_bom > wbgt_globe else (wbgt_globe, "globe")


def solar_elevation_deg(utc_ms, lat_deg, lon_deg):
    """Solar elevation angle (degrees) at the instant utc_ms, from the same NOAA equations as cos_zenith."""
    return math.degrees(math.asin(max(-1.0, min(1.0, cos_zenith(utc_ms, lat_deg, lon_deg)))))


def daylight_wbgt(wbgt_globe, wbgt_bom, sun_up):
    """Daylight-only cautious rule: max of both estimates while the sun is up, sun/globe model when it is down."""
    return cautious_wbgt(wbgt_globe, wbgt_bom) if sun_up else (wbgt_globe, "globe")


# BoM assumes strong sun: it may raise the estimate only when shortwave radiation >= this (W/m^2). Same as JS.
BOM_MIN_SW_WM2 = 600


def radiation_gated_wbgt(wbgt_globe, wbgt_bom, ghi, threshold=BOM_MIN_SW_WM2):
    """Radiation-gated cautious rule: max of both estimates if ghi >= threshold, else the sun/globe model."""
    return cautious_wbgt(wbgt_globe, wbgt_bom) if (ghi or 0) >= threshold else (wbgt_globe, "globe")


def wbgt_cautious(t_c, rh, wind10kmh, ghi, direct, diffuse, utc_ms, lat, lon, p_hpa=1013.25):
    """Same as the browser's assessHour WBGT (radiation-gated rule), plus strict, daylight-only and permissive."""
    o = wbgt_outdoor(t_c, rh, wind10kmh, ghi, direct, diffuse, utc_ms, lat, lon, p_hpa)
    bom = wbgt_bom_c(t_c, rh)
    elev = solar_elevation_deg(utc_ms, lat, lon)
    sun_up = elev > 0
    sw = max(0.0, ghi or 0.0)
    w, src = radiation_gated_wbgt(o["wbgt"], bom, sw)
    return dict(o, wbgt=w, wbgt_globe=o["wbgt"], wbgt_bom=bom, wbgt_strict=max(o["wbgt"], bom), source=src,
                wbgt_daylight=daylight_wbgt(o["wbgt"], bom, sun_up)[0], shortwave=sw, strong_sun=sw >= BOM_MIN_SW_WM2,
                sun_up=sun_up, solar_elevation=elev)


def heat_category(wbgt_c):
    f = c_to_f(wbgt_c)
    for thr, cat in ((90, 5), (88, 4), (85, 3), (82, 2), (78, 1)):
        if f >= thr:
            return cat
    return 0


_TABLE = {
    "easy": [(60, 0.5), (60, 0.5), (60, 0.5), (60, 0.75), (60, 0.75), (50, 1)],
    "moderate": [(60, 0.75), (60, 0.75), (50, 0.75), (40, 0.75), (30, 0.75), (20, 1)],
    "hard": [(60, 0.75), (40, 0.75), (30, 1), (30, 1), (20, 1), (10, 1)],
}


def work_rest(category, workload="moderate"):
    row = _TABLE.get(workload, _TABLE["moderate"])
    work, qt = row[max(0, min(5, category))]
    return {"workMin": work, "restMin": 60 - work, "noLimit": work == 60,
            "waterLph": round(qt * QT_TO_L * 100) / 100, "inTable": category >= 1}


def niosh_rel(m_watts):
    return 56.7 - 11.5 * math.log10(m_watts)


def niosh_ral(m_watts):
    return 59.9 - 14.1 * math.log10(m_watts)
