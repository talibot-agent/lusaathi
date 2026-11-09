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
L.append("Four WBGT rules, computed in the same run from the same data: the **permissive baseline** (always the "
         "sun/globe-model WBGT G; the app's rule before 9 Nov 2026), **strict** (the higher of G and the BoM WBGT B at "
         "every hour), **daylight-only** (the higher of G and B while the sun is up, else G) and **radiation-gated 600** "
         "(the app's default: the higher of G and B when the hour's shortwave radiation is ≥ 600 W/m², else G).\n")
pc = lambda n, d: f"{n} ({100*n/d:.1f}%)"
W, AH = t["work_hours"], t["all_hours"]
V = ["permissive", "strict", "daylight", "gated600"]
L.append("| Metric | Permissive (always G) | Strict (always max) | Daylight-only | **Radiation-gated 600 (default)** |\n|---|---|---|---|---|")
L.append(f"| City-days meeting the IMD heat-wave criterion (single point) | {t['hw_days']} | same | same | same |")
L.append(f"| …of which severe | {t['severe_days']} | same | same | same |")
L.append(f"| City-days meeting it on 2 consecutive days | {t['hw_days_2day']} | same | same | same |")
for lab, key, d in (("Work-hours (06–18 IST) at Category 4–5", "work_cat4plus", W), ("Work-hours at Category 5", "work_cat5", W),
                    ("All 24 hours at Category 4–5", "all_cat4plus", AH), ("All 24 hours at Category 5", "all_cat5", AH)):
    L.append(f"| {lab} | " + " | ".join(pc(t[key][v], d) for v in V) + " |")
L.append(f"| Work-hours where B may be used | 0 | {W} | {W - t['sun_down_work_hours']} (sun up) | {t['strong_sun_work_hours']} (≥ 600 W/m²) |")
L.append(f"| Work-hours where B was higher and drove the answer (default rule) | – | {t['bom_higher_work_hours']} | – | {t['bom_driven_hours']} |\n")
L.append("**Threshold sensitivity (radiation gate at 500 / 600 / 700 W/m²), ERA5 reference:**\n")
L.append("| Metric | 500 W/m² | **600 W/m² (default)** | 700 W/m² |\n|---|---|---|---|")
G3 = ["gated500", "gated600", "gated700"]
for lab, key, d in (("Work-hours at Category 4–5", "work_cat4plus", W), ("Work-hours at Category 5", "work_cat5", W),
                    ("All 24 hours at Category 5", "all_cat5", AH)):
    L.append(f"| {lab} | " + " | ".join(pc(t[key][v], d) for v in G3) + " |")
L.append("")
L.append("### B. Forecast skill (day+1 unless noted)\n")
L.append("Heat-wave alerts and Tmax do not depend on WBGT, so they are identical under all rules.\n")
L.append("| Forecast source | Heat-wave alert P / R / F1 (single day) | P / R / F1 (2-day rule) | Tmax MAE °C | Tmax bias °C |\n|---|---|---|---|---|")
for k in ["best_match_day1", "ecmwf_ifs025_day1", "historical_forecast_day0"]:
    s_ = R["summary"][k]
    a, b = s_["day_alert_single_day"], s_["day_alert_two_consecutive_days"]
    L.append(f"| {NAMES[k]} | {f(a['precision'])} / {f(a['recall'])} / {f(a['f1'])} (TP {a['tp']}, FP {a['fp']}, FN {a['fn']}) "
             f"| {f(b['precision'])} / {f(b['recall'])} / {f(b['f1'])} | {f(s_['tmax_mae_c'])} | {f(s_['tmax_bias_c'], 2)} |")
L.append("\n**Dangerous work-hour flag (Category 4–5): P / R / F1 (hours flagged; missed dangerous hours = FN).** "
         "\"Own\" = judged against a reference computed with the same rule; \"vs old\" = judged against the permissive "
         "(always-G) definition of a dangerous hour.\n")
RN = {"permissive": "Permissive (always G)", "strict": "Strict (always max)", "daylight": "Daylight-only",
      "gated500": "Radiation-gated 500", "gated600": "**Radiation-gated 600 (default)**", "gated700": "Radiation-gated 700"}
cell = lambda h: f"{f(h['precision'])} / {f(h['recall'])} / {f(h['f1'])} ({h['tp'] + h['fp']} h; FN {h['fn']})"
for k in ["best_match_day1", "ecmwf_ifs025_day1", "historical_forecast_day0"]:
    L.append(f"\n{NAMES[k]}:\n")
    L.append("| Rule | Own | Vs old |\n|---|---|---|")
    for v in ["permissive", "strict", "daylight", "gated500", "gated600", "gated700"]:
        F = R["summary"][k]["flags"]
        L.append(f"| {RN[v]} | {cell(F[v + '_own'])} | {cell(F[v + '_vs_old'])} |")
L.append("\n### C. Per city (reference ERA5 + best_match day+1)\n")
L.append("Cat 5 profile = mean conditions in the city's Category 5 work-hours under the default rule; G/B = mean "
         "sun/globe-model and BoM WBGT in those hours.\n")
L.append("| City | Region (auto) | ERA5 max Tmax °C | HW days ERA5 / forecast | Work-h ≥ 600 W/m² | Cat 5 work-h, default (share) | Cat 5 work-h: permissive / daylight-only | Cat 4–5 work-h, default | Cat 5 profile: T °C / RH % / Tw °C / G / B | Tmax MAE °C |\n|---|---|---|---|---|---|---|---|---|---|")
for c in sorted(R["cities"], key=lambda c: -c["work_cat5"]["gated600"]):
    s = c["sources"]["best_match_day1"]
    p = c["default_cat5_work_hours_profile"]
    prof = (f"{p['mean_t']:.1f} / {p['mean_rh']:.0f} / {p['mean_tw']:.1f} / {p['mean_wbgt_globe']:.1f} / {p['mean_wbgt_bom']:.1f}"
            if p["n"] else "–")
    L.append(f"| {c['city']} | {c['region']} | {c['truth_max_tmax']:.1f} | {c['truth_hw_days']} / {s['forecast_hw_days']} | "
             f"{c['strong_sun_work_hours']} | {pc(c['work_cat5']['gated600'], c['work_hours'])} | "
             f"{c['work_cat5']['permissive']} / {c['work_cat5']['daylight']} | {c['work_cat4plus']['gated600']} | {prof} | {f(s['tmax_mae'])} |")
block = "\n".join(L)
p = os.path.join(HERE, "..", "VALIDATION.md")
doc = open(p).read()
a, b = doc.index("<!-- AUTO:BEGIN -->"), doc.index("<!-- AUTO:END -->")
open(p, "w").write(doc[:a] + "<!-- AUTO:BEGIN -->\n" + block + "\n" + doc[b:])
print(block)
