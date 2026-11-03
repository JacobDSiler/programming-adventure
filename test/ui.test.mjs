import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { install, byText, all } from './domshim.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { body } = install();
const require = createRequire(import.meta.url);
['pg-engine.js', 'pg-content.js', 'pg-core.js', 'pg-ui.js', 'pg-games.js', 'pg-parent.js'].forEach(f => require(path.join(root, f)));
const PG = globalThis.PG, PGC = globalThis.PGC;
PG.sleep = () => Promise.resolve();
const tick = () => new Promise(r => setImmediate(r));
const go = async p => { globalThis.location.hash = '#' + p; await tick(); };
const text = () => body.textContent;
const btn = re => byText(body, 'button', re)[0];
async function settle(sel, n = 60) { for (let i = 0; i < n; i++) { await tick(); if (all(body, sel).length) return true; } return false; }

test('boot goes to welcome, creating a coder lands on home', async () => {
  PG.start(); await tick();
  assert.match(text(), /New coder/);
  const name = all(body, 'input').find(i => i.attrs.placeholder === 'Name'); name.value = 'Rhea';
  btn(/Start coding/).click(); await tick();
  assert.equal(PG.D().profiles.length, 1);
  assert.match(text(), /Hi, Rhea!/); assert.match(text(), /Block Builders/);
});

test('every main screen renders without throwing', async () => {
  for (const p of ['/', '/who', '/games', '/play', '/badges', '/parent', ...PGC.tracks.map(t => '/track/' + t.id), ...PG.GAMES.map(g => '/game/' + g.id)]) {
    await go(p); assert.ok(!/Oops, something broke/.test(text()), 'broken screen ' + p + ': ' + text().slice(0, 200));
  }
});

test('home shows each band track for matching grades', async () => {
  const d = PG.D();
  for (const [g, name] of [['K', 'Robot Pals'], ['6', 'Script Squad'], ['11', 'Dev Studio']]) {
    d.profiles[0].gradeId = g; d.profiles[0].band = PG.bandOf(g); await go('/'); assert.match(text(), new RegExp(name));
  }
  d.profiles[0].band = 'blocks'; d.profiles[0].gradeId = '3';
});

test('every challenge renders and its reference solution completes it through the UI', async () => {
  const pid = PG.P().id; let n = 0;
  for (const c of PGC.allChallenges()) {
    body.querySelectorAll('.card.good').forEach(x => x.remove());
    PG.code.put(pid, c.id, c.mode === 'blocks' ? { prog: Array.isArray(c.sol) ? { main: c.sol, fn: [] } : c.sol } : { text: c.solutionCode });
    await go('/c/' + c.id);
    assert.ok(!/Oops, something broke/.test(text()), c.id + ' broke: ' + text().slice(0, 300));
    btn(/Run/).click();
    const ok = await settle('.card.good');
    assert.ok(ok, c.id + ' (' + c.title + ') did not complete. Page says: ' + text().slice(-400));
    assert.ok(PG.stars(c.id) >= 1); n++;
  }
  assert.ok(n >= 70);
});

test('unit badges are awarded once a unit is finished', () => {
  const pr = PG.PR(); assert.ok(Object.keys(pr.badges).length >= 15, 'badges: ' + Object.keys(pr.badges).length);
});

test('building blocks by tapping the palette works (nested repeat)', async () => {
  PG.PR().ch = {}; PG.PR().badges = {}; PG.code.clear(PG.P().id, 'sp3-1');
  await go('/c/sp3-1');
  btn(/Repeat/).click();       // adds a repeat block, cursor moves inside
  btn(/Forward/).click();      // goes inside the repeat
  const plus = all(body, 'button').filter(b => b.attrs['aria-label'] === 'more')[0];
  for (let i = 0; i < 4; i++) plus.click();   // repeat 3 -> 7
  assert.match(text(), /7 times/);
  btn(/Run/).click(); assert.ok(await settle('.card.good'), text().slice(-300));
  assert.equal(PG.stars('sp3-1'), 3);
});

test('wrong programs get friendly feedback, text editor errors too', async () => {
  const pid = PG.P().id; PG.code.put(pid, 'bl1-1', { prog: { main: [{ t: 'fwd', n: 2 }], fn: [] } });
  await go('/c/bl1-1'); btn(/Run/).click(); assert.ok(await settle('.card.bad')); assert.match(text(), /Not yet/);
  PG.code.put(pid, 'sc1-1', { text: 'console.log("hi"' });
  await go('/c/sc1-1'); btn(/Run/).click(); assert.ok(await settle('.card.bad')); assert.match(text(), /typed wrong/);
  PG.code.put(pid, 'sc4-1', { text: 'function double(n) { return n + 2; }' });
  await go('/c/sc4-1'); btn(/Run/).click(); assert.ok(await settle('.card.bad')); assert.ok(all(body, 'li.bad').length >= 1);
});

test('hint lowers the stars, start over clears the program', async () => {
  const pid = PG.P().id; PG.PR().ch = {};
  PG.code.put(pid, 'sp1-1', { prog: { main: [{ t: 'fwd', n: 1 }, { t: 'fwd', n: 1 }], fn: [] } });
  await go('/c/sp1-1'); btn(/Hint/).click(); assert.match(text(), /One tap for each square/);
  btn(/Run/).click(); assert.ok(await settle('.card.good')); assert.equal(PG.stars('sp1-1'), 2);
  btn(/Start over/).click(); assert.match(text(), /Tap a block below/);
});

test('free play renders for block and text tracks and runs', async () => {
  for (const band of ['blocks', 'script']) {
    PG.P().band = band; await go('/play'); assert.ok(!/Oops/.test(text()));
    if (band === 'script') { btn(/Run/).click(); await settle('.outview, .muted', 5); await tick(); assert.ok(!/Oops/.test(text())); }
  }
  PG.P().band = 'blocks';
});

test('games: every game can be played through to the end', async () => {
  for (const g of PG.GAMES) for (const lvl of [1, 2, 3, 4]) {
    await go('/game/' + g.id);
    byText(body, 'button', new RegExp('^' + lvl + ' · '))[0].click();
    btn(/^Play$/).click();
    for (let guard = 0; guard < 30 && !/Round complete/.test(text()); guard++) {
      if (g.id === 'binary') {
        const head = all(body, 'h3').map(h => h.textContent).find(t => /^Make the number/.test(t));
        if (head) {
          const target = Number(head.match(/\d+/)[0]), bits = all(body, '.bit'), n = bits.length;
          target.toString(2).padStart(n, '0').split('').forEach((b, k) => { if (b === '1') bits[k].click(); });
          btn(/^Check$/).click();
        } else { const opts = all(body, '.opt'); opts[0].click(); }
        const nx = btn(/Next|Finish/); if (nx) nx.click();
      } else if (g.id === 'sort') {
        const cards = () => all(body, '.sortcard'), vals = () => cards().map(c => Number(c.lastChild.textContent));
        for (let pass = 0; pass < 40; pass++) { let swapped = false; for (let k = 0; k < cards().length - 1; k++) { const v = vals(); if (v[k] > v[k + 1]) { cards()[k].click(); cards()[k + 1].click(); swapped = true; } } if (!swapped) break; }
        const nx = btn(/Next|Finish/); assert.ok(nx, 'sort did not finish a round'); nx.click();
      } else if (g.id === 'bug') {
        all(body, '.bugline')[0].click(); btn(/Next|Finish/).click();
      } else { const o = all(body, '.opt'); assert.ok(o.length >= 3, g.id + ' has options'); o[0].click(); btn(/Next|Finish/).click(); }
    }
    assert.match(text(), /Round complete/, g.id + ' level ' + lvl + ' did not finish');
  }
  assert.ok(Object.keys(PG.PR().games).length === 5);
});

test('predict/pattern generators always produce a valid answer index', () => {
  for (let i = 0; i < 300; i++) for (const lvl of [1, 2, 3, 4]) for (const gen of [PG.predictGen, PG.patternGen]) {
    const q = gen(lvl); assert.equal(q.options.length >= 3, true); assert.ok(q.answer >= 0 && q.answer < q.options.length);
    assert.equal(new Set(q.options).size, q.options.length, 'duplicate options ' + JSON.stringify(q));
  }
});

test('bug-hunt banks point at real lines', () => { PG.BUGS.forEach(l => l.forEach(b => assert.ok(b.bug >= 0 && b.bug < b.lines.length && b.why))); });

test('parent area: PIN gate, then all tabs render', async () => {
  PG.D().pin = '1234'; sessionStorage.removeItem('pg_unlock');
  await go('/parent'); assert.match(text(), /Grown-ups only/);
  const inp = all(body, 'input')[0]; inp.value = '1234'; inp.fire('input'); await tick();
  assert.match(text(), /Progress/);
  for (const t of ['Plan', 'Settings', 'About']) { btn(new RegExp(t))?.click(); await tick(); assert.ok(!/Oops/.test(text()), t); }
  btn(/Progress/).click(); await tick(); assert.match(text(), /Robot Pals/);
});

test('progress merge keeps the best stars', () => {
  const a = { p1: { ch: { x: { stars: 1 } }, badges: {}, games: {}, missions: {} } }, b = { p1: { ch: { x: { stars: 3 }, y: { stars: 2 } }, badges: { u: 1 }, games: {}, missions: {} } };
  const m = PG.mergeProg(a, b); assert.equal(m.p1.ch.x.stars, 3); assert.equal(m.p1.ch.y.stars, 2); assert.ok(m.p1.badges.u);
});
