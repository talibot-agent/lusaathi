#!/usr/bin/env python3
"""Render validation/results.json into the tables of VALIDATION.md (between the AUTO markers)."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, "results.json")))
NAMES = {"best_match_day1": "Open-Meteo best_match, day+1 (Previous Runs API) — **the model mix the live app uses**",
         "ecmwf_ifs025_day1": "ECMWF IFS 0.25°, day+1 (Previous Runs API)",
         "historical_forecast_day0": "Historical Forecast API (stitched short-lead, ~day 0 reference)"}


def f(x, n=2):
    return "–" if x is None else f"{x:.{n}f}"


L = []
t = R["truth"]
L.append(f"Period **{R['period'][0]} → {R['period'][1]}**, **{R['n_cities']} cities**, {t['city_days']} city-days, "
         f"{t['work_hours']} city work-hours ({R['work_hours_local'][0]:02d}:00–{R['work_hours_local'][1]:02d}:00 IST). "
         f"Generated {R['generated_utc']} by `validation/backtest.py`.\n")
L.append("### A. Reference (ERA5) — what happened in 2024\n")
L.append("| Metric | Value |\n|---|---|")
L.append(f"| City-days meeting the IMD heat-wave criterion (single point) | {t['hw_days']} |")
L.append(f"| …of which severe | {t['severe_days']} |")
L.append(f"| City-days meeting it on 2 consecutive days | {t['hw_days_2day']} |")
L.append(f"| Work-hours at WBGT Category 4–5 (moderate work needs ≥30 min rest/hour) | {t['cat4plus_hours']} ({100*t['cat4plus_hours']/t['work_hours']:.1f}% of work-hours) |")
L.append(f"| Work-hours at Category 5 (moderate work: 20 min work / 40 min rest) | {t['cat5_hours']} |")
L.append(f"| Same Cat 4–5 count with the simpler BoM WBGT approximation | {t['cat4plus_hours_bom']} |")
L.append(f"| Highest hourly sun-exposed WBGT estimate | {t['max_wbgt']:.1f} °C |\n")
L.append("### B. Forecast skill (day+1 unless noted)\n")
L.append("| Forecast source | Heat-wave alert P / R / F1 (single day) | P / R / F1 (2-day rule) | Cat 4–5 hour flag P / R / F1 | Hours flagged Cat 4–5 | Tmax MAE °C | Tmax bias °C |\n|---|---|---|---|---|---|---|")
for k in ["best_match_day1", "ecmwf_ifs025_day1", "historical_forecast_day0"]:
    s = R["summary"][k]
    a, b, h = s["day_alert_single_day"], s["day_alert_two_consecutive_days"], s["dangerous_hour_flag_cat4plus"]
    L.append(f"| {NAMES[k]} | {f(a['precision'])} / {f(a['recall'])} / {f(a['f1'])} (TP {a['tp']}, FP {a['fp']}, FN {a['fn']}) "
             f"| {f(b['precision'])} / {f(b['recall'])} / {f(b['f1'])} | {f(h['precision'])} / {f(h['recall'])} / {f(h['f1'])} "
             f"| {h['tp'] + h['fp']} | {f(s['tmax_mae_c'])} | {f(s['tmax_bias_c'], 2)} |")
L.append("\n### C. Per city (reference ERA5 + best_match day+1)\n")
L.append("| City | Region (auto) | ERA5 max Tmax °C | HW days (ERA5) | HW days forecast | Cat 4–5 work-h | Cat 5 work-h | Max WBGT °C | Tmax MAE °C |\n|---|---|---|---|---|---|---|---|---|")
for c in R["cities"]:
    s = c["sources"]["best_match_day1"]
    L.append(f"| {c['city']} | {c['region']} | {c['truth_max_tmax']:.1f} | {c['truth_hw_days']} | {s['forecast_hw_days']} | "
             f"{c['truth_cat4plus_work_hours']} | {c['truth_cat5_work_hours']} | {c['truth_max_wbgt']:.1f} | {f(s['tmax_mae'])} |")
block = "\n".join(L)
p = os.path.join(HERE, "..", "VALIDATION.md")
doc = open(p).read()
a, b = doc.index("<!-- AUTO:BEGIN -->"), doc.index("<!-- AUTO:END -->")
open(p, "w").write(doc[:a] + "<!-- AUTO:BEGIN -->\n" + block + "\n" + doc[b:])
print(block)
