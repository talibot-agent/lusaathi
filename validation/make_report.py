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
L.append("Three WBGT rules, computed in the same run from the same data: **daylight-only** (the app's default: the higher of "
         "the sun/globe-model WBGT G and the BoM WBGT B while the sun is up, G when it is down), **strict** (the higher "
         "of G and B at every hour) and the **permissive baseline** (always G, the app's rule before 9 Nov 2026).\n")
pc = lambda n, d: f"{n} ({100*n/d:.1f}%)"
W, AH = t["work_hours"], t["all_hours"]
L.append("| Metric | Daylight-only (default) | Strict (all hours) | Permissive baseline |\n|---|---|---|---|")
L.append(f"| City-days meeting the IMD heat-wave criterion (single point) | {t['hw_days']} | same | same |")
L.append(f"| …of which severe | {t['severe_days']} | same | same |")
L.append(f"| City-days meeting it on 2 consecutive days | {t['hw_days_2day']} | same | same |")
L.append(f"| Work-hours (06–18 IST) at Category 4–5 | {pc(t['cat4plus_hours'], W)} | {pc(t['strict_cat4plus_hours'], W)} | {pc(t['permissive_cat4plus_hours'], W)} |")
L.append(f"| Work-hours at Category 5 | {pc(t['cat5_hours'], W)} | {pc(t['strict_cat5_hours'], W)} | {pc(t['permissive_cat5_hours'], W)} |")
L.append(f"| All 24 hours at Category 4–5 | {pc(t['all_cat4plus']['daylight'], AH)} | {pc(t['all_cat4plus']['strict'], AH)} | {pc(t['all_cat4plus']['permissive'], AH)} |")
L.append(f"| All 24 hours at Category 5 | {pc(t['all_cat5']['daylight'], AH)} | {pc(t['all_cat5']['strict'], AH)} | {pc(t['all_cat5']['permissive'], AH)} |")
L.append(f"| Work-hours with the sun down (G used under daylight-only) | {t['sun_down_work_hours']} of {W} | – | – |")
L.append(f"| Work-hours where B was higher and drove the answer | {t['bom_driven_hours']} | {t['bom_higher_work_hours']} | 0 |")
L.append(f"| Highest hourly WBGT estimate (work-hours) | {t['max_wbgt']:.1f} °C | – | {t['permissive_max_wbgt']:.1f} °C |\n")
L.append("### B. Forecast skill (day+1 unless noted)\n")
L.append("Heat-wave alerts and Tmax do not depend on WBGT, so they are identical under all three rules.\n")
L.append("| Forecast source | Heat-wave alert P / R / F1 (single day) | P / R / F1 (2-day rule) | Tmax MAE °C | Tmax bias °C |\n|---|---|---|---|---|")
for k in ["best_match_day1", "ecmwf_ifs025_day1", "historical_forecast_day0"]:
    s_ = R["summary"][k]
    a, b = s_["day_alert_single_day"], s_["day_alert_two_consecutive_days"]
    L.append(f"| {NAMES[k]} | {f(a['precision'])} / {f(a['recall'])} / {f(a['f1'])} (TP {a['tp']}, FP {a['fp']}, FN {a['fn']}) "
             f"| {f(b['precision'])} / {f(b['recall'])} / {f(b['f1'])} | {f(s_['tmax_mae_c'])} | {f(s_['tmax_bias_c'], 2)} |")
L.append("\n**Dangerous work-hour flag (Category 4–5): P / R / F1, hours flagged, missed dangerous hours (FN).** "
         "\"Own\" = judged against a reference computed with the same rule; \"old\" = judged against the permissive "
         "(always-G) definition of a dangerous hour.\n")
L.append("| Forecast source | Daylight-only, own | Daylight-only vs old | Strict, own | Strict vs old | Permissive (own = old) |\n|---|---|---|---|---|---|")
for k in ["best_match_day1", "ecmwf_ifs025_day1", "historical_forecast_day0"]:
    s_ = R["summary"][k]
    cells = []
    for kk in ["dangerous_hour_flag_cat4plus", "cautious_flag_vs_permissive_reference", "strict_dangerous_hour_flag_cat4plus",
               "strict_flag_vs_permissive_reference", "permissive_dangerous_hour_flag_cat4plus"]:
        h = s_[kk]
        cells.append(f"{f(h['precision'])} / {f(h['recall'])} / {f(h['f1'])} ({h['tp'] + h['fp']} h; FN {h['fn']})")
    L.append(f"| {NAMES[k]} | " + " | ".join(cells) + " |")
L.append("\n### C. Per city (reference ERA5 + best_match day+1)\n")
L.append("| City | Region (auto) | ERA5 max Tmax °C | HW days (ERA5) | HW days forecast | Cat 4–5 work-h | Cat 5 work-h | Cat 4–5 work-h (strict) | Cat 4–5 work-h (permissive) | Cat 4–5 hours, all 24 h: day / night | Max WBGT °C | Tmax MAE °C |\n|---|---|---|---|---|---|---|---|---|---|---|---|")
for c in R["cities"]:
    s = c["sources"]["best_match_day1"]
    L.append(f"| {c['city']} | {c['region']} | {c['truth_max_tmax']:.1f} | {c['truth_hw_days']} | {s['forecast_hw_days']} | "
             f"{c['truth_cat4plus_work_hours']} | {c['truth_cat5_work_hours']} | {c['truth_strict_cat4plus_work_hours']} | {c['truth_permissive_cat4plus_work_hours']} | {c['daylight_cat4plus_all_hours']['day']} / {c['daylight_cat4plus_all_hours']['night']} | {c['truth_max_wbgt']:.1f} | {f(s['tmax_mae'])} |")
block = "\n".join(L)
p = os.path.join(HERE, "..", "VALIDATION.md")
doc = open(p).read()
a, b = doc.index("<!-- AUTO:BEGIN -->"), doc.index("<!-- AUTO:END -->")
open(p, "w").write(doc[:a] + "<!-- AUTO:BEGIN -->\n" + block + "\n" + doc[b:])
print(block)
