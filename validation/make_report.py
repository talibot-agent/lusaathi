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
L.append("Work-hour rows use the app's **cautious rule** (the higher of the sun/globe-model WBGT and the BoM WBGT); "
         "the *permissive baseline* column is the sun/globe model alone, which the app used before 9 Nov 2026.\n")
L.append("| Metric | Cautious rule (current) | Permissive baseline (old) |\n|---|---|---|")
L.append(f"| City-days meeting the IMD heat-wave criterion (single point) | {t['hw_days']} | same |")
L.append(f"| …of which severe | {t['severe_days']} | same |")
L.append(f"| City-days meeting it on 2 consecutive days | {t['hw_days_2day']} | same |")
L.append(f"| Work-hours at WBGT Category 4–5 (moderate work needs ≥30 min rest/hour) | {t['cat4plus_hours']} ({100*t['cat4plus_hours']/t['work_hours']:.1f}%) | {t['permissive_cat4plus_hours']} ({100*t['permissive_cat4plus_hours']/t['work_hours']:.1f}%) |")
L.append(f"| Work-hours at Category 5 (moderate work: 20 min work / 40 min rest) | {t['cat5_hours']} ({100*t['cat5_hours']/t['work_hours']:.1f}%) | {t['permissive_cat5_hours']} ({100*t['permissive_cat5_hours']/t['work_hours']:.1f}%) |")
L.append(f"| Work-hours where the BoM estimate was the higher one (drove the answer) | {t['bom_driven_hours']} of {t['work_hours']} | – |")
L.append(f"| Highest hourly WBGT estimate | {t['max_wbgt']:.1f} °C | {t['permissive_max_wbgt']:.1f} °C |\n")
L.append("### B. Forecast skill (day+1 unless noted)\n")
L.append("Heat-wave alerts and Tmax do not depend on WBGT, so they are identical under both rules.\n")
L.append("| Forecast source | Heat-wave alert P / R / F1 (single day) | P / R / F1 (2-day rule) | Tmax MAE °C | Tmax bias °C |\n|---|---|---|---|---|")
for k in ["best_match_day1", "ecmwf_ifs025_day1", "historical_forecast_day0"]:
    s_ = R["summary"][k]
    a, b = s_["day_alert_single_day"], s_["day_alert_two_consecutive_days"]
    L.append(f"| {NAMES[k]} | {f(a['precision'])} / {f(a['recall'])} / {f(a['f1'])} (TP {a['tp']}, FP {a['fp']}, FN {a['fn']}) "
             f"| {f(b['precision'])} / {f(b['recall'])} / {f(b['f1'])} | {f(s_['tmax_mae_c'])} | {f(s_['tmax_bias_c'], 2)} |")
L.append("\n**Dangerous work-hour flag (Category 4–5), P / R / F1 and hours flagged:**\n")
L.append("| Forecast source | Cautious forecast vs cautious reference (current) | Permissive baseline vs permissive reference (old) | Cautious forecast vs permissive reference |\n|---|---|---|---|")
for k in ["best_match_day1", "ecmwf_ifs025_day1", "historical_forecast_day0"]:
    s_ = R["summary"][k]
    cells = []
    for kk in ["dangerous_hour_flag_cat4plus", "permissive_dangerous_hour_flag_cat4plus", "cautious_flag_vs_permissive_reference"]:
        h = s_[kk]
        cells.append(f"{f(h['precision'])} / {f(h['recall'])} / {f(h['f1'])} ({h['tp'] + h['fp']} h; FP {h['fp']}, FN {h['fn']})")
    L.append(f"| {NAMES[k]} | " + " | ".join(cells) + " |")
L.append("\n### C. Per city (reference ERA5 + best_match day+1)\n")
L.append("| City | Region (auto) | ERA5 max Tmax °C | HW days (ERA5) | HW days forecast | Cat 4–5 work-h | Cat 5 work-h | Cat 4–5 work-h (permissive) | Max WBGT °C | Tmax MAE °C |\n|---|---|---|---|---|---|---|---|---|---|")
for c in R["cities"]:
    s = c["sources"]["best_match_day1"]
    L.append(f"| {c['city']} | {c['region']} | {c['truth_max_tmax']:.1f} | {c['truth_hw_days']} | {s['forecast_hw_days']} | "
             f"{c['truth_cat4plus_work_hours']} | {c['truth_cat5_work_hours']} | {c['truth_permissive_cat4plus_work_hours']} | {c['truth_max_wbgt']:.1f} | {f(s['tmax_mae'])} |")
block = "\n".join(L)
p = os.path.join(HERE, "..", "VALIDATION.md")
doc = open(p).read()
a, b = doc.index("<!-- AUTO:BEGIN -->"), doc.index("<!-- AUTO:END -->")
open(p, "w").write(doc[:a] + "<!-- AUTO:BEGIN -->\n" + block + "\n" + doc[b:])
print(block)
