import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))
from lusaathi_core import imd  # noqa: E402


def lvl(*a):
    return imd.imd_heatwave(*a)["level"]


def test_plains_threshold_40():
    assert lvl(39.9, 30, "plains") == 0  # big departure but below 40 °C
    assert lvl(40.0, 35.5, "plains") == 1  # departure 4.5
    assert lvl(40.0, 35.6, "plains") == 0  # departure 4.4
    assert lvl(42.0, 35.5, "plains") == 2  # departure 6.5 > 6.4


def test_plains_absolute():
    assert lvl(45.0, 44.0, "plains") == 1
    assert lvl(46.9, None, "plains") == 1
    assert lvl(47.0, None, "plains") == 2
    assert lvl(44.9, None, "plains") == 0


def test_coastal():
    assert lvl(36.9, 30, "coastal") == 0
    assert lvl(37.0, 32.5, "coastal") == 1
    assert lvl(37.0, 32.6, "coastal") == 0
    assert lvl(46.0, 45.0, "coastal") == 0  # no absolute criterion for coastal stations


def test_hills():
    assert lvl(29.9, 20, "hills") == 0
    assert lvl(30.0, 25.5, "hills") == 1
    assert lvl(32.0, 25.5, "hills") == 2
    assert lvl(31.0, None, "hills") == 0


def test_consecutive_days():
    assert imd.consecutive_days([0, 1, 1, 0, 2, 2, 1]) == [0, 0, 1, 0, 0, 2, 1]


def test_region_classification():
    assert imd.classify_region(19.07, 72.88, 14) == "coastal"   # Mumbai
    assert imd.classify_region(13.08, 80.27, 6) == "coastal"    # Chennai
    assert imd.classify_region(28.65, 77.23, 216) == "plains"   # Delhi
    assert imd.classify_region(21.15, 79.08, 319) == "plains"   # Nagpur
    assert imd.classify_region(31.10, 77.17, 2200) == "hills"   # Shimla


def test_normal_window_and_leap_day():
    assert imd.no_leap_doy("2024-02-29") == imd.no_leap_doy("2023-02-28")
    assert imd.no_leap_doy("2024-03-01") == 60
    dates = ["2001-05-20", "2001-05-27", "2001-06-04", "2002-05-27", "2002-12-31"]
    vals = [40.0, 42.0, 50.0, 44.0, 10.0]
    # target 27 May, window ±7: includes 20 May, 27 May (x2); 4 Jun is 8 days away -> excluded
    assert abs(imd.normal_tmax(dates, vals, "2024-05-27") - (40 + 42 + 44) / 3) < 1e-9
    # circular window across new year
    assert imd.normal_tmax(["2001-12-30"], [5.0], "2024-01-03") == 5.0
