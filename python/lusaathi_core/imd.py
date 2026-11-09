"""IMD heat-wave criteria (single-location simplification). Mirror of lib/imd.js. Sources in lib/imd.js."""
import json
import math
import os
import re

HILL_ELEVATION_M = 1000
COASTAL_KM = 40

_here = os.path.dirname(os.path.abspath(__file__))
_coast_js = os.path.join(_here, "..", "..", "lib", "coast.js")
with open(_coast_js, encoding="utf-8") as fh:
    COAST = json.loads(re.search(r"COAST = (\[.*\]);", fh.read()).group(1))


def haversine_km(lat1, lon1, lat2, lon2):
    r = math.pi / 180
    a = (math.sin((lat2 - lat1) * r / 2) ** 2
         + math.cos(lat1 * r) * math.cos(lat2 * r) * math.sin((lon2 - lon1) * r / 2) ** 2)
    return 2 * 6371 * math.asin(math.sqrt(a))


def coast_distance_km(lat, lon):
    kx = 111.32 * math.cos(math.radians(lat))
    ky = 110.57
    best = math.inf
    for line in COAST:
        for (x1, y1), (x2, y2) in zip(line, line[1:]):
            if (min(y1, y2) > lat + 2 or max(y1, y2) < lat - 2
                    or min(x1, x2) > lon + 2 or max(x1, x2) < lon - 2):
                continue
            ax, ay = (x1 - lon) * kx, (y1 - lat) * ky
            bx, by = (x2 - lon) * kx, (y2 - lat) * ky
            dx, dy = bx - ax, by - ay
            L = dx * dx + dy * dy
            t = -(ax * dx + ay * dy) / L if L > 0 else 0.0
            t = max(0.0, min(1.0, t))
            px, py = ax + t * dx, ay + t * dy
            best = min(best, math.hypot(px, py))
    return best


def classify_region(lat, lon, elevation_m):
    if elevation_m is not None and elevation_m >= HILL_ELEVATION_M:
        return "hills"
    if coast_distance_km(lat, lon) <= COASTAL_KM:
        return "coastal"
    return "plains"


def imd_heatwave(tmax, normal, region="plains"):
    dep = None if normal is None or (isinstance(normal, float) and math.isnan(normal)) else tmax - normal
    if region == "plains":
        if tmax < 40:
            return {"level": 0, "basis": None, "departure": dep}
        lvl, basis = 0, None
        if tmax >= 47:
            lvl, basis = 2, "absolute"
        elif tmax >= 45:
            lvl, basis = 1, "absolute"
        if dep is not None:
            dl = 2 if dep > 6.4 else 1 if dep >= 4.5 else 0
            if dl > lvl:
                lvl, basis = dl, "departure"
        return {"level": lvl, "basis": basis, "departure": dep}
    if region == "coastal":
        if tmax < 37 or dep is None:
            return {"level": 0, "basis": None, "departure": dep}
        return {"level": 1 if dep >= 4.5 else 0, "basis": "departure" if dep >= 4.5 else None, "departure": dep}
    if tmax < 30 or dep is None:
        return {"level": 0, "basis": None, "departure": dep}
    if dep > 6.4:
        return {"level": 2, "basis": "departure", "departure": dep}
    if dep >= 4.5:
        return {"level": 1, "basis": "departure", "departure": dep}
    return {"level": 0, "basis": None, "departure": dep}


def consecutive_days(levels):
    return [min(l, levels[i - 1]) if i > 0 and l > 0 and levels[i - 1] > 0 else 0 for i, l in enumerate(levels)]


_CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]


def no_leap_doy(iso):
    _, m, d = (int(x) for x in iso.split("-"))
    return _CUM[m - 1] + min(d, 28 if m == 2 else 31)


def normal_tmax(dates, tmaxs, target_iso, half_window=7):
    t = no_leap_doy(target_iso)
    s = n = 0
    for dt, v in zip(dates, tmaxs):
        if v is None:
            continue
        dd = abs(no_leap_doy(dt) - t)
        dd = min(dd, 365 - dd)
        if dd <= half_window:
            s += v
            n += 1
    return s / n if n else None
