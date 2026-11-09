import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))
from lusaathi_core import heat  # noqa: E402


def test_heat_index_matches_nws_table():
    # NWS heat index chart: 96°F & 65% RH -> 121°F ; 90°F & 50% -> 95°F ; 80°F & 40% -> 80°F
    assert abs(heat.c_to_f(heat.heat_index_c(heat.f_to_c(96), 65)) - 121) <= 1
    assert abs(heat.c_to_f(heat.heat_index_c(heat.f_to_c(90), 50)) - 95) <= 1
    assert abs(heat.c_to_f(heat.heat_index_c(heat.f_to_c(80), 40)) - 80) <= 1


def test_heat_index_low_humidity_adjustment():
    # NWS: for RH < 13% and 80-112°F subtract ((13-RH)/4)*sqrt((17-|T-95|)/17)
    T, R = 100.0, 10.0
    reg = (-42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R - 0.00683783 * T * T
           - 0.05481717 * R * R + 0.00122874 * T * T * R + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R)
    adj = ((13 - R) / 4) * math.sqrt((17 - abs(T - 95)) / 17)
    assert abs(heat.c_to_f(heat.heat_index_c(heat.f_to_c(T), R)) - (reg - adj)) < 1e-6


def test_heat_index_band_thresholds():
    assert heat.heat_index_band(heat.f_to_c(79.9)) == 0
    assert heat.heat_index_band(heat.f_to_c(80)) == 1
    assert heat.heat_index_band(heat.f_to_c(103)) == 3
    assert heat.heat_index_band(heat.f_to_c(125)) == 4


def test_stull_wet_bulb_reference_value():
    # Stull (2011): T=20°C, RH=50% -> Tw = 13.7°C
    assert abs(heat.wet_bulb_stull_c(20, 50) - 13.7) < 0.1
    # saturated air: Tw ~= T
    assert abs(heat.wet_bulb_stull_c(30, 99) - 30) < 0.5


def test_bom_wbgt_formula():
    # 0.567*30 + 0.393*e + 3.94 with e = 0.5*6.105*exp(17.27*30/267.7) = 21.21 hPa -> 29.29
    e = 0.5 * 6.105 * math.exp(17.27 * 30 / (237.7 + 30))
    assert abs(heat.wbgt_bom_c(30, 50) - (0.567 * 30 + 0.393 * e + 3.94)) < 1e-9
    assert abs(heat.wbgt_bom_c(30, 50) - 29.29) < 0.05


def test_globe_no_sun_equals_air_temperature_approximately():
    tg = heat.globe_temp_dimiceli_c(30, 50, 0, 0, 1, 0, 2.0)
    assert abs(tg - 30) < 0.1


def test_globe_increases_with_sun_and_decreases_with_wind():
    low = heat.globe_temp_dimiceli_c(35, 40, 300, 0.6, 0.4, 0.9, 2.0)
    high = heat.globe_temp_dimiceli_c(35, 40, 900, 0.8, 0.2, 0.9, 2.0)
    windy = heat.globe_temp_dimiceli_c(35, 40, 900, 0.8, 0.2, 0.9, 8.0)
    assert 35 < low < high
    assert windy < high


def test_dimiceli_piltz_published_case():
    # Paper test 2 (10 Sep 2010, Tulsa): Ta 93°F, Td 76°F, 754 W/m², wind ~7 mph, measured Tg 103°F
    # (paper's own estimate 102.757°F). Zenith/direct split not given in the paper -> loose tolerance.
    ta = heat.f_to_c(93)
    td = heat.f_to_c(76)
    rh = 100 * math.exp(17.625 * td / (243.04 + td)) / math.exp(17.625 * ta / (243.04 + ta))
    tg = heat.globe_temp_dimiceli_c(ta, rh, 754, 0.75, 0.25, math.cos(math.radians(45)), 7 * 0.44704)
    assert abs(heat.c_to_f(tg) - 103) < 4


def test_outdoor_wbgt_weights():
    utc_ms = 1716888600000  # 2024-05-28T09:30Z = 15:00 IST
    o = heat.wbgt_outdoor(40, 30, 10, 800, 600, 200, utc_ms, 28.6, 77.2)
    assert abs(o["wbgt"] - (0.7 * o["tw"] + 0.2 * o["tg"] + 0.1 * 40)) < 1e-9
    assert o["tg"] > 40


def test_cos_zenith_noon_and_night():
    # Delhi ~12:20 IST on 21 Jun: sun almost overhead (zenith ~5°)
    noon = heat.cos_zenith(1718952600000, 28.6, 77.2)
    assert noon > 0.99
    night = heat.cos_zenith(1718985600000, 28.6, 77.2)  # ~21:30 IST
    assert night < 0


def test_heat_category_boundaries_tbmed507():
    f = heat.f_to_c
    assert heat.heat_category(f(77.9)) == 0
    assert heat.heat_category(f(78)) == 1
    assert heat.heat_category(f(82)) == 2
    assert heat.heat_category(f(85)) == 3
    assert heat.heat_category(f(88)) == 4
    assert heat.heat_category(f(90)) == 5


def test_work_rest_table():
    assert heat.work_rest(5, "moderate")["workMin"] == 20
    assert heat.work_rest(5, "hard")["workMin"] == 10
    assert heat.work_rest(4, "easy")["noLimit"] is True
    assert heat.work_rest(2, "hard") == {"workMin": 30, "restMin": 30, "noLimit": False, "waterLph": 0.95, "inTable": True}
    assert heat.work_rest(0, "moderate")["inTable"] is False


def test_niosh_rel():
    assert abs(heat.niosh_rel(300) - 28.2) < 0.1
    assert heat.niosh_ral(300) < heat.niosh_rel(300)
