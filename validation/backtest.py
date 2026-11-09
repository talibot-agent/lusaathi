#!/usr/bin/env python3
"""LuSaathi BACKTEST (not field data): Apr-Jun 2024 Indian heat season, 25 cities.

Forecast sources (all free, no API key):
  * Open-Meteo Previous Runs API, ECMWF IFS 0.25 deg, *_previous_day1 variables = the forecast
    issued one day earlier (true day+1 lead).           https://open-meteo.com/en/docs/previous-runs-api
  * Open-Meteo Previous Runs API, default best_match model, *_previous_day1.
  * Open-Meteo Historical Forecast API (best_match), stitched from the first hours of successive
    runs, i.e. a very short-lead (~day 0) reference.  https://open-meteo.com/en/docs/historical-forecast-api
Reference ("truth"): ERA5 reanalysis via Open-Meteo Historical Weather API (models=era5).
Normals: ERA5 daily Tmax 1991-2020, +/-7-day window mean.

Run:  python validation/backtest.py      (needs network; raw responses cached in validation/cache/)
Output: validation/results.json (all numbers quoted in VALIDATION.md come from this file)
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))
from lusaathi_core import heat, imd  # noqa: E402

CACHE = os.path.join(HERE, "cache")
os.makedirs(CACHE, exist_ok=True)

CITIES = ["Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru", "Hyderabad", "Ahmedabad", "Pune",
          "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal", "Patna", "Varanasi",
          "Prayagraj", "Agra", "Ludhiana", "Jodhpur", "Raipur", "Bhubaneswar", "Visakhapatnam",
          "Vijayawada", "Shimla"]
START, END = "2024-04-01", "2024-06-30"
TZ = "Asia/Kolkata"
WORK_HOURS = range(6, 19)  # 06:00-18:00 local hourly stamps (13 h)
VARS = ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "shortwave_radiation",
        "direct_radiation", "diffuse_radiation", "surface_pressure"]


def get(url, params, tag):
    q = urllib.parse.urlencode(params)
    fn = os.path.join(CACHE, tag + ".json")
    if os.path.exists(fn):
        with open(fn) as fh:
            return json.load(fh)
    for attempt in range(6):
        try:
            req = urllib.request.Request(url + "?" + q, headers={"User-Agent": "LuSaathi-backtest/1.0"})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.load(r)
            break
        except Exception as e:  # rate-limit / transient
            print("  retry", tag, e, file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    else:
        raise RuntimeError("failed " + tag)
    with open(fn, "w") as fh:
        json.dump(data, fh)
    time.sleep(1.0)
    return data


def geocode(name):
    d = get("https://geocoding-api.open-meteo.com/v1/search",
            {"name": name, "count": 1, "countryCode": "IN", "language": "en"}, f"geo_{name}")
    r = d["results"][0]
    return {"name": name, "lat": r["latitude"], "lon": r["longitude"], "elevation": r.get("elevation"),
            "admin1": r.get("admin1")}


def hourly_rows(d, suffix=""):
    h = d["hourly"]
    off = d["utc_offset_seconds"]
    rows = []
    for i, t in enumerate(h["time"]):
        vals = {v: h.get(v + suffix, [None] * len(h["time"]))[i] for v in VARS}
        rows.append((t, off, vals))
    return rows


def assess(rows, lat, lon):
    """Return {date: {'tmax':.., 'hours': {hour: tuple}, 'all': {hour: tuple}}}

    tuple = (cat, cat_bom, wbgt, cat_globe, wbgt_globe, source, cat_strict, sun_up, t, rh, tw, wbgt_bom,
             cat_daylight, shortwave, cat_gated500, cat_gated700)
    cat/wbgt/source use the app's default radiation-gated rule (max of sun/globe model and BoM when shortwave
    radiation >= heat.BOM_MIN_SW_WM2 = 600 W/m2, else the sun/globe model); *_globe = permissive baseline (always the
    sun/globe model); cat_strict = max of both at all hours; cat_daylight = max while the sun is up (previous default);
    cat_gated500/700 = the same gate at 500 / 700 W/m2 (sensitivity). 'hours' = work hours, 'all' = all 24 hours.
    """
    out = {}
    for t, off, v in rows:
        date, hh = t[:10], int(t[11:13])
        day = out.setdefault(date, {"tmax": None, "hours": {}, "all": {}})
        if v["temperature_2m"] is None:
            continue
        day["tmax"] = v["temperature_2m"] if day["tmax"] is None else max(day["tmax"], v["temperature_2m"])
        if v["relative_humidity_2m"] is not None:
            local = datetime.strptime(t, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)
            utc_ms = (local - timedelta(seconds=off)).timestamp() * 1000
            w = heat.wbgt_cautious(v["temperature_2m"], v["relative_humidity_2m"], v["wind_speed_10m"],
                                   v["shortwave_radiation"], v["direct_radiation"], v["diffuse_radiation"],
                                   utc_ms, lat, lon, v["surface_pressure"] or 1013.25)
            tup = (heat.heat_category(w["wbgt"]), heat.heat_category(w["wbgt_bom"]), w["wbgt"],
                   heat.heat_category(w["wbgt_globe"]), w["wbgt_globe"], w["source"],
                   heat.heat_category(w["wbgt_strict"]), w["sun_up"],
                   v["temperature_2m"], v["relative_humidity_2m"], w["tw"], w["wbgt_bom"],
                   heat.heat_category(w["wbgt_daylight"]), w["shortwave"],
                   heat.heat_category(heat.radiation_gated_wbgt(w["wbgt_globe"], w["wbgt_bom"], w["shortwave"], 500)[0]),
                   heat.heat_category(heat.radiation_gated_wbgt(w["wbgt_globe"], w["wbgt_bom"], w["shortwave"], 700)[0]))
            day["all"][hh] = tup
            if hh in WORK_HOURS:
                day["hours"][hh] = tup
    return out


# rule name -> category index in the assess() tuple
VARIANTS = {"gated600": 0, "permissive": 3, "strict": 6, "daylight": 12, "gated500": 14, "gated700": 15}


def prf(tp, fp, fn):
    p = tp / (tp + fp) if tp + fp else None
    r = tp / (tp + fn) if tp + fn else None
    f = 2 * p * r / (p + r) if p and r else (0.0 if (p is not None and r is not None) else None)
    return {"tp": tp, "fp": fp, "fn": fn, "precision": p, "recall": r, "f1": f}


def main():
    cities = [geocode(c) for c in CITIES]
    base = {"latitude": None, "longitude": None, "timezone": TZ}
    sources = {
        "ecmwf_ifs025_day1": ("https://previous-runs-api.open-meteo.com/v1/forecast",
                              {"models": "ecmwf_ifs025"}, "_previous_day1"),
        "best_match_day1": ("https://previous-runs-api.open-meteo.com/v1/forecast", {}, "_previous_day1"),
        "historical_forecast_day0": ("https://historical-forecast-api.open-meteo.com/v1/forecast", {}, ""),
    }
    per_city = []
    agg = {s: {"days": {"tp": 0, "fp": 0, "fn": 0, "tn": 0}, "days2": {"tp": 0, "fp": 0, "fn": 0, "tn": 0},
               **{f"{n}_{j}": {"tp": 0, "fp": 0, "fn": 0} for n in VARIANTS for j in ("own", "vs_old")},
               "abs_err": [], "err": []} for s in sources}
    truth_tot = {"city_days": 0, "hw_days": 0, "hw_days_2day": 0, "severe_days": 0, "work_hours": 0,
                 "cat4plus_hours": 0, "cat5_hours": 0, "cat4plus_hours_bom": 0, "max_wbgt": None,
                 "bom_driven_hours": 0, "permissive_cat4plus_hours": 0, "permissive_cat5_hours": 0,
                 "permissive_max_wbgt": None, "strict_cat4plus_hours": 0, "strict_cat5_hours": 0,
                 "sun_down_work_hours": 0, "bom_higher_work_hours": 0,
                 "all_hours": 0, "all_sun_up_hours": 0,
                 "work_cat4plus": {k: 0 for k in VARIANTS}, "work_cat5": {k: 0 for k in VARIANTS},
                 "all_cat4plus": {k: 0 for k in VARIANTS}, "all_cat5": {k: 0 for k in VARIANTS},
                 "strong_sun_work_hours": 0, "strong_sun_all_hours": 0}
    for c in cities:
        lat, lon = c["lat"], c["lon"]
        p = dict(base, latitude=lat, longitude=lon)
        tag = c["name"].replace(" ", "_")
        print("city", c["name"], file=sys.stderr)
        norm = get("https://archive-api.open-meteo.com/v1/archive",
                   dict(p, start_date="1991-01-01", end_date="2020-12-31", daily="temperature_2m_max", models="era5"),
                   f"era5norm_{tag}")
        nd, nt = norm["daily"]["time"], norm["daily"]["temperature_2m_max"]
        era = get("https://archive-api.open-meteo.com/v1/archive",
                  dict(p, start_date=START, end_date=END, hourly=",".join(VARS), models="era5"), f"era5_{tag}")
        region = imd.classify_region(lat, lon, c["elevation"])
        truth = assess(hourly_rows(era), lat, lon)
        dates = sorted(truth)
        normals = {d: imd.normal_tmax(nd, nt, d) for d in dates}
        tl = [imd.imd_heatwave(truth[d]["tmax"], normals[d], region)["level"] for d in dates]
        tl2 = imd.consecutive_days(tl)
        wh = [(d, hh, v) for d in dates for hh, v in truth[d]["hours"].items()]
        row = {"city": c["name"], "state": c["admin1"], "lat": lat, "lon": lon, "elevation_m": c["elevation"],
               "region": region, "truth_hw_days": sum(1 for l in tl if l), "truth_hw_days_2day": sum(1 for l in tl2 if l),
               "truth_severe_days": sum(1 for l in tl if l == 2),
               "truth_max_tmax": max(truth[d]["tmax"] for d in dates),
               "truth_cat4plus_work_hours": sum(1 for _, _, v in wh if v[0] >= 4),
               "truth_cat5_work_hours": sum(1 for _, _, v in wh if v[0] >= 5),
               "truth_cat4plus_work_hours_bom": sum(1 for _, _, v in wh if v[1] >= 4),
               "truth_permissive_cat4plus_work_hours": sum(1 for _, _, v in wh if v[3] >= 4),
               "truth_max_wbgt": round(max(v[2] for _, _, v in wh), 2), "sources": {}}
        truth_tot["city_days"] += len(dates)
        truth_tot["hw_days"] += row["truth_hw_days"]
        truth_tot["hw_days_2day"] += row["truth_hw_days_2day"]
        truth_tot["severe_days"] += row["truth_severe_days"]
        truth_tot["work_hours"] += len(wh)
        truth_tot["cat4plus_hours"] += row["truth_cat4plus_work_hours"]
        truth_tot["cat5_hours"] += row["truth_cat5_work_hours"]
        truth_tot["cat4plus_hours_bom"] += row["truth_cat4plus_work_hours_bom"]
        truth_tot["max_wbgt"] = max(truth_tot["max_wbgt"] or -99, row["truth_max_wbgt"])
        truth_tot["bom_driven_hours"] += sum(1 for _, _, v in wh if v[5] == "bom")
        truth_tot["permissive_cat4plus_hours"] += sum(1 for _, _, v in wh if v[3] >= 4)
        truth_tot["permissive_cat5_hours"] += sum(1 for _, _, v in wh if v[3] >= 5)
        truth_tot["permissive_max_wbgt"] = round(max(truth_tot["permissive_max_wbgt"] or -99, max(v[4] for _, _, v in wh)), 2)
        truth_tot["strict_cat4plus_hours"] += sum(1 for _, _, v in wh if v[6] >= 4)
        truth_tot["strict_cat5_hours"] += sum(1 for _, _, v in wh if v[6] >= 5)
        truth_tot["sun_down_work_hours"] += sum(1 for _, _, v in wh if not v[7])
        truth_tot["bom_higher_work_hours"] += sum(1 for _, _, v in wh if v[11] > v[4])
        ah = [(d, hh, v) for d in dates for hh, v in truth[d]["all"].items()]
        truth_tot["all_hours"] += len(ah)
        truth_tot["all_sun_up_hours"] += sum(1 for _, _, v in ah if v[7])
        truth_tot["strong_sun_work_hours"] += sum(1 for _, _, v in wh if v[13] >= heat.BOM_MIN_SW_WM2)
        truth_tot["strong_sun_all_hours"] += sum(1 for _, _, v in ah if v[13] >= heat.BOM_MIN_SW_WM2)
        for name, ix in VARIANTS.items():
            truth_tot["work_cat4plus"][name] += sum(1 for _, _, v in wh if v[ix] >= 4)
            truth_tot["work_cat5"][name] += sum(1 for _, _, v in wh if v[ix] >= 5)
            truth_tot["all_cat4plus"][name] += sum(1 for _, _, v in ah if v[ix] >= 4)
            truth_tot["all_cat5"][name] += sum(1 for _, _, v in ah if v[ix] >= 5)
        row["work_hours"] = len(wh)
        row["work_cat5"] = {name: sum(1 for _, _, v in wh if v[ix] >= 5) for name, ix in VARIANTS.items()}
        row["work_cat4plus"] = {name: sum(1 for _, _, v in wh if v[ix] >= 4) for name, ix in VARIANTS.items()}
        row["strong_sun_work_hours"] = sum(1 for _, _, v in wh if v[13] >= heat.BOM_MIN_SW_WM2)
        c5 = [v for _, _, v in wh if v[0] >= 5]
        row["default_cat5_work_hours_profile"] = {
            "n": len(c5), "bom_driven": sum(1 for v in c5 if v[5] == "bom"),
            "mean_t": round(sum(v[8] for v in c5) / len(c5), 2) if c5 else None,
            "mean_rh": round(sum(v[9] for v in c5) / len(c5), 1) if c5 else None,
            "mean_tw": round(sum(v[10] for v in c5) / len(c5), 2) if c5 else None,
            "mean_wbgt_globe": round(sum(v[4] for v in c5) / len(c5), 2) if c5 else None,
            "mean_wbgt_bom": round(sum(v[11] for v in c5) / len(c5), 2) if c5 else None,
            "globe_cat5": sum(1 for v in c5 if v[3] >= 5)}
        hr = [v for _, _, v in ah if v[0] >= 4]
        row["default_cat4plus_all_hours"] = {
            "day": sum(1 for v in hr if v[7]), "night": sum(1 for v in hr if not v[7]),
            "bom_driven": sum(1 for v in hr if v[5] == "bom"),
            "work_hours_day": sum(1 for _, _, v in wh if v[0] >= 4 and v[7]),
            "work_hours_night": sum(1 for _, _, v in wh if v[0] >= 4 and not v[7]),
            "mean_t": round(sum(v[8] for v in hr) / len(hr), 2) if hr else None,
            "mean_rh": round(sum(v[9] for v in hr) / len(hr), 1) if hr else None,
            "mean_tw": round(sum(v[10] for v in hr) / len(hr), 2) if hr else None,
            "mean_wbgt": round(sum(v[2] for v in hr) / len(hr), 2) if hr else None,
            "mean_wbgt_globe": round(sum(v[4] for v in hr) / len(hr), 2) if hr else None}
        row["truth_strict_cat4plus_work_hours"] = sum(1 for _, _, v in wh if v[6] >= 4)
        for s, (url, extra, suf) in sources.items():
            hv = ",".join(v + suf for v in VARS)
            d = get(url, dict(p, start_date=START, end_date=END, hourly=hv, **extra), f"{s}_{tag}")
            fc = assess(hourly_rows(d, suf), lat, lon)
            fl = [imd.imd_heatwave(fc[x]["tmax"], normals[x], region)["level"] if fc.get(x, {}).get("tmax") is not None else 0
                  for x in dates]
            fl2 = imd.consecutive_days(fl)
            A = agg[s]
            cm = {"tp": 0, "fp": 0, "fn": 0, "tn": 0}
            for a, b in zip(fl, tl):
                k = "tp" if a and b else "fp" if a else "fn" if b else "tn"
                cm[k] += 1
                A["days"][k] += 1
            for a, b in zip(fl2, tl2):
                k = "tp" if a and b else "fp" if a else "fn" if b else "tn"
                A["days2"][k] += 1
            errs = [fc[x]["tmax"] - truth[x]["tmax"] for x in dates if fc.get(x, {}).get("tmax") is not None]
            A["abs_err"] += [abs(e) for e in errs]
            A["err"] += errs
            # each rule judged by its own reference ("own") and against the permissive (always-G) reference ("old")
            for key, fi, ti in [(f"{n}_own", ix, ix) for n, ix in VARIANTS.items()] + \
                               [(f"{n}_vs_old", ix, 3) for n, ix in VARIANTS.items()]:
                for x, hh, v in wh:
                    fv = fc.get(x, {}).get("hours", {}).get(hh)
                    if fv is None:
                        continue
                    a, b = fv[fi] >= 4, v[ti] >= 4
                    if a and b:
                        A[key]["tp"] += 1
                    elif a:
                        A[key]["fp"] += 1
                    elif b:
                        A[key]["fn"] += 1
            row["sources"][s] = {"day_alert": prf(cm["tp"], cm["fp"], cm["fn"]),
                                 "tmax_mae": round(sum(abs(e) for e in errs) / len(errs), 3) if errs else None,
                                 "tmax_bias": round(sum(errs) / len(errs), 3) if errs else None,
                                 "forecast_hw_days": sum(1 for l in fl if l),
                                 "n_days": len(errs)}
        per_city.append(row)
    summary = {}
    for s, A in agg.items():
        n = len(A["abs_err"])
        summary[s] = {
            "day_alert_single_day": dict(prf(A["days"]["tp"], A["days"]["fp"], A["days"]["fn"]), tn=A["days"]["tn"]),
            "day_alert_two_consecutive_days": dict(prf(A["days2"]["tp"], A["days2"]["fp"], A["days2"]["fn"]), tn=A["days2"]["tn"]),
            "flags": {f"{n}_{j}": prf(A[f"{n}_{j}"]["tp"], A[f"{n}_{j}"]["fp"], A[f"{n}_{j}"]["fn"])
                      for n in VARIANTS for j in ("own", "vs_old")},
            "tmax_mae_c": round(sum(A["abs_err"]) / n, 3), "tmax_bias_c": round(sum(A["err"]) / n, 3), "n_city_days": n,
        }
    out = {"label": "BACKTEST against ERA5 reanalysis - NOT field/deployment data",
           "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
           "period": [START, END], "timezone": TZ, "work_hours_local": [WORK_HOURS.start, WORK_HOURS.stop - 1],
           "n_cities": len(cities), "truth": truth_tot, "summary": summary, "cities": per_city}
    with open(os.path.join(HERE, "results.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print(json.dumps({"truth": truth_tot, "summary": summary}, indent=1))


if __name__ == "__main__":
    main()
