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
    """Return {date: {'tmax':..,'hours':{hour:(cat, cat_bom, wbgt, cat_globe, wbgt_globe, source)}}}

    cat/wbgt use the app's cautious rule (higher of sun/globe model and BoM); *_globe is the old permissive baseline.
    """
    out = {}
    for t, off, v in rows:
        date, hh = t[:10], int(t[11:13])
        day = out.setdefault(date, {"tmax": None, "hours": {}})
        if v["temperature_2m"] is None:
            continue
        day["tmax"] = v["temperature_2m"] if day["tmax"] is None else max(day["tmax"], v["temperature_2m"])
        if hh in WORK_HOURS and v["relative_humidity_2m"] is not None:
            local = datetime.strptime(t, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)
            utc_ms = (local - timedelta(seconds=off)).timestamp() * 1000
            w = heat.wbgt_cautious(v["temperature_2m"], v["relative_humidity_2m"], v["wind_speed_10m"],
                                   v["shortwave_radiation"], v["direct_radiation"], v["diffuse_radiation"],
                                   utc_ms, lat, lon, v["surface_pressure"] or 1013.25)
            day["hours"][hh] = (heat.heat_category(w["wbgt"]), heat.heat_category(w["wbgt_bom"]), w["wbgt"],
                                heat.heat_category(w["wbgt_globe"]), w["wbgt_globe"], w["source"])
    return out


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
               "hours": {"tp": 0, "fp": 0, "fn": 0}, "hours_permissive": {"tp": 0, "fp": 0, "fn": 0},
               "hours_cautious_vs_permissive_ref": {"tp": 0, "fp": 0, "fn": 0}, "abs_err": [], "err": []} for s in sources}
    truth_tot = {"city_days": 0, "hw_days": 0, "hw_days_2day": 0, "severe_days": 0, "work_hours": 0,
                 "cat4plus_hours": 0, "cat5_hours": 0, "cat4plus_hours_bom": 0, "max_wbgt": None,
                 "bom_driven_hours": 0, "permissive_cat4plus_hours": 0, "permissive_cat5_hours": 0,
                 "permissive_max_wbgt": None}
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
            # (forecast tuple index, reference tuple index): 0 = cautious category, 3 = permissive (sun/globe only)
            for key, fi, ti in (("hours", 0, 0), ("hours_permissive", 3, 3), ("hours_cautious_vs_permissive_ref", 0, 3)):
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
            "dangerous_hour_flag_cat4plus": prf(A["hours"]["tp"], A["hours"]["fp"], A["hours"]["fn"]),
            "permissive_dangerous_hour_flag_cat4plus": prf(A["hours_permissive"]["tp"], A["hours_permissive"]["fp"], A["hours_permissive"]["fn"]),
            "cautious_flag_vs_permissive_reference": prf(A["hours_cautious_vs_permissive_ref"]["tp"], A["hours_cautious_vs_permissive_ref"]["fp"], A["hours_cautious_vs_permissive_ref"]["fn"]),
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
