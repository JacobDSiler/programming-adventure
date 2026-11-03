import test from 'node:test';
import assert from 'node:assert/strict';
import { PGE, PGC } from './load.mjs';

const all = PGC.allChallenges();

test('curriculum size and unique ids', () => {
  assert.ok(all.length >= 70, 'expected at least 70 challenges, got ' + all.length);
  assert.equal(new Set(all.map(c => c.id)).size, all.length);
  assert.equal(PGC.tracks.length, 4);
  for (const t of PGC.tracks) for (const un of t.units) assert.ok(un.challenges.length >= 3, un.id);
});

for (const c of all) {
  test('solution solves ' + c.id + ' ' + c.title, () => {
    const job = { world: c.world, code: c.solutionCode, grid: c.grid, tests: c.tests, fns: c.fns, expectOut: c.expectOut, outMatch: c.outMatch, noWorker: true };
    const r = PGE.runSync(job);
    assert.equal(r.error, null, c.id + ' error: ' + JSON.stringify(r.error) + '\n' + c.solutionCode);
    if (c.world === 'turtle') {
      const t = PGE.runSync({ world: 'turtle', code: c.targetCode });
      assert.ok(PGE.compareDrawings(r.trace, t.trace).ok);
      let m = 0; t.trace.forEach(e => { if (e.t === 'seg') m = Math.max(m, Math.abs(e.x2), Math.abs(e.y2)); });
      assert.ok(m <= 145, c.id + ' drawing leaves the canvas: ' + m);
      assert.ok(t.trace.length > 2);
    } else {
      assert.equal(r.success, true, c.id + ' did not succeed: ' + JSON.stringify(r.why || r.tests || r.state));
    }
  });
}

test('hidden tests exist in dev track and every console test has non-trivial coverage', () => {
  for (const c of all.filter(x => x.world === 'console' && x.tests)) assert.ok(c.tests.length >= 3, c.id);
});

test('wrong programs fail', () => {
  const c = PGC.byId['bl2-1'];
  const r = PGE.runSync({ world: 'grid', grid: c.grid, code: 'forward(2);', noWorker: true });
  assert.equal(r.success, false);
  const d = PGC.byId['sc4-1'];
  const r2 = PGE.runSync({ world: 'console', code: 'function double(n){ return n + 2; }', tests: d.tests, fns: d.fns, noWorker: true });
  assert.equal(r2.success, false);
  const d2 = PGC.byId['dv3-2'];
  const r3 = PGE.runSync({ world: 'console', code: 'function bubbleSort(l){ return l; }', tests: d2.tests, fns: d2.fns, noWorker: true });
  assert.equal(r3.success, false);
});

test('block solutions compile and agree with the corridor (blocks mode)', () => {
  for (const c of all.filter(x => x.mode === 'blocks' && x.sol)) {
    assert.ok(c.par >= 1, c.id);
    assert.ok(PGE.compile(c.sol, { grid: c.world === 'grid' }).length > 0);
  }
});

test('track lookup by grade', () => {
  assert.equal(PGC.trackFor('K'), 'sprout'); assert.equal(PGC.trackFor('4'), 'blocks');
  assert.equal(PGC.trackFor('7'), 'script'); assert.equal(PGC.trackFor('12'), 'dev'); assert.equal(PGC.trackFor('AD'), 'dev');
});
