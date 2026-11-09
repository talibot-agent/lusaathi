// Asserts the browser (JS) and backtest (Python) implementations agree on a grid of inputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as H from '../../lib/heat.js';
import * as I from '../../lib/imd.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cases = [];
// 09:30 UTC = 15:00 IST (sun up), 21:00 UTC = 02:30 IST (night), 00:10 UTC = 05:40 IST (just after sunrise at Jaipur)
for (const utcMs of [1716888600000, 1716843600000, 1716941400000]) for (const tC of [24, 31, 38, 44, 47]) for (const rh of [8, 25, 55, 85]) for (const ghi of [0, 450, 950]) {
  cases.push({ tC, rh, wind10kmh: 9, ghi, direct: ghi * 0.75, diffuse: ghi * 0.25, utcMs, lat: 26.9, lon: 75.8 });
}
test('JS == Python for WBGT (both estimates, daylight-only rule, solar elevation), heat index, category', () => {
  const py = `
import json,sys
sys.path.insert(0, ${JSON.stringify(path.join(root, 'python'))})
from lusaathi_core import heat, imd
cases=json.loads(sys.stdin.read())
out=[]
for c in cases:
    o=heat.wbgt_outdoor(c['tC'],c['rh'],c['wind10kmh'],c['ghi'],c['direct'],c['diffuse'],c['utcMs'],c['lat'],c['lon'])
    wc=heat.wbgt_cautious(c['tC'],c['rh'],c['wind10kmh'],c['ghi'],c['direct'],c['diffuse'],c['utcMs'],c['lat'],c['lon'])
    out.append([o['wbgt'],heat.heat_index_c(c['tC'],c['rh']),heat.heat_category(o['wbgt']),imd.imd_heatwave(c['tC'],c['tC']-5,'plains')['level'],heat.heat_index_out_of_range(c['tC'],c['rh']),heat.wet_bulb_in_range(c['tC'],c['rh']),wc['wbgt'],wc['source'],wc['sun_up'],wc['solar_elevation'],wc['wbgt_strict']])
print(json.dumps(out))`;
  const res = JSON.parse(execFileSync('python3', ['-c', py], { input: JSON.stringify(cases) }).toString());
  cases.forEach((c, i) => {
    const o = H.wbgtOutdoor(c);
    assert.ok(Math.abs(o.wbgt - res[i][0]) < 1e-6, `wbgt ${JSON.stringify(c)}`);
    assert.ok(Math.abs(H.heatIndexC(c.tC, c.rh) - res[i][1]) < 1e-6);
    assert.equal(H.heatCategory(o.wbgt), res[i][2]);
    assert.equal(I.imdHeatwave(c.tC, c.tC - 5, 'plains').level, res[i][3]);
    assert.equal(H.heatIndexOutOfRange(c.tC, c.rh), res[i][4]);
    assert.equal(H.wetBulbInRange(c.tC, c.rh), res[i][5]);
    const a = H.assessHour(c);
    assert.ok(Math.abs(a.wbgt - res[i][6]) < 1e-6, `cautious wbgt ${JSON.stringify(c)}`);
    assert.equal(a.wbgtSource, res[i][7]);
    assert.equal(a.sunUp, res[i][8]);
    assert.ok(Math.abs(a.solarElevation - res[i][9]) < 1e-6);
    assert.ok(Math.abs(a.wbgtStrict - res[i][10]) < 1e-6);
  });
});
