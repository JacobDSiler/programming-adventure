import test from 'node:test';
import assert from 'node:assert/strict';
import { PGE } from './load.mjs';
const { B } = PGE;

test('parseGrid reads S G * #', () => {
  const g = PGE.parseGrid(['S*#', '..G'], 1);
  assert.deepEqual(g.start, [0, 0]); assert.deepEqual(g.goal, [2, 1]); assert.deepEqual(g.stars, [[1, 0]]); assert.deepEqual(g.walls, [[2, 0]]);
});
test('robot bumps into walls and says so', () => {
  const g = PGE.parseGrid(['S#G'], 1);
  const r = PGE.runSync({ world: 'grid', grid: g, code: 'forward(2);' });
  assert.equal(r.error.bump, true); assert.equal(r.success, false);
});
test('missing star is reported', () => {
  const g = PGE.parseGrid(['S*G'], 1);
  const r = PGE.runSync({ world: 'grid', grid: g, code: 'forward(1); forward(1);' });
  assert.equal(r.success, true);
  const g2 = PGE.parseGrid(['S.G', '.*.'], 1);
  const r2 = PGE.runSync({ world: 'grid', grid: g2, code: 'forward(2);' });
  assert.equal(r2.success, false); assert.match(r2.why, /star/);
});
test('infinite loops are stopped (for, while, do)', () => {
  for (const code of ['while(true){}', 'for(;;){}', 'do { } while (true);', 'function f(){ f(); } f();']) {
    const r = PGE.runSync({ world: 'console', code });
    assert.equal(r.ok, false, code);
  }
  const g = PGE.parseGrid(['S...'], 1);
  const r = PGE.runSync({ world: 'grid', grid: g, code: 'while (true) { right(); }' });
  assert.equal(r.ok, false); assert.equal(r.error.loop, true);
});
test('loop guard handles nested parentheses in headers', () => {
  const r = PGE.runSync({ world: 'console', code: 'for (let i = Math.max(0, 1); i < Math.min(3, 9); i++) { console.log(i); }' });
  assert.deepEqual(r.logs, ['1', '2']);
});
test('console formatting', () => {
  const r = PGE.runSync({ world: 'console', code: 'console.log([1,"a"], {x:1}, null, true)' });
  assert.deepEqual(r.logs, ["[1, 'a'] {\"x\":1} null true"]);
});
test('tests are order-insensitive for objects, strict for arrays', () => {
  const r = PGE.runSync({ world: 'console', code: 'function f(){ return {b:2,a:1}; } function g(){ return [2,1]; }', fns: ['f', 'g'], tests: [{ fn: 'f', args: [], ret: { a: 1, b: 2 } }, { fn: 'g', args: [], ret: [1, 2] }] });
  assert.equal(r.tests[0].ok, true); assert.equal(r.tests[1].ok, false);
});
test('tests do not let functions mutate shared args', () => {
  const r = PGE.runSync({ world: 'console', code: 'function f(l){ l.push(9); return l; }', fns: ['f'], tests: [{ fn: 'f', args: [[1]], ret: [1, 9] }, { fn: 'f', args: [[1]], ret: [1, 9] }] });
  assert.equal(r.success, true);
});
test('syntax errors are caught and friendly', () => {
  const r = PGE.runSync({ world: 'console', code: 'console.log("hi"' });
  assert.equal(r.ok, false); assert.match(PGE.friendly(r.error), /typed wrong/);
  const r2 = PGE.runSync({ world: 'console', code: 'console.log(nope)' });
  assert.match(PGE.friendly(r2.error), /nope/);
});
test('compile: loops, if/else, function', () => {
  const code = PGE.compile({ main: [B.Rep(2, B.Rep(3, B.F())), B.If('wall', [B.R()], [B.F()]), B.Call()], fn: [B.F(), B.L()] }, { grid: true });
  assert.match(code, /for \(let i = 0; i < 2; i\+\+\)/); assert.match(code, /for \(let j = 0; j < 3; j\+\+\)/);
  assert.match(code, /if \(wallAhead\(\)\)/); assert.match(code, /function myBlock/); assert.match(code, /left\(\);/);
  assert.equal(PGE.countBlocks({ main: [B.Rep(2, B.F())], fn: [B.F()] }), 3);
});
test('turtle comparison: accepts equal shapes, rejects different ones', () => {
  const sq = PGE.runSync({ world: 'turtle', code: 'for (let i=0;i<4;i++){forward(80);right(90);}' });
  const sq2 = PGE.runSync({ world: 'turtle', code: 'forward(80);right(90);forward(80);right(90);forward(80);right(90);forward(80);right(90);' });
  const tri = PGE.runSync({ world: 'turtle', code: 'for (let i=0;i<3;i++){forward(80);right(120);}' });
  const half = PGE.runSync({ world: 'turtle', code: 'forward(80);right(90);forward(80);' });
  assert.equal(PGE.compareDrawings(sq.trace, sq2.trace).ok, true);
  assert.equal(PGE.compareDrawings(tri.trace, sq.trace).ok, false);
  assert.equal(PGE.compareDrawings(half.trace, sq.trace).ok, false);
  assert.equal(PGE.compareDrawings([], sq.trace).ok, false);
});
test('pen-up moves are not drawn', () => {
  const a = PGE.runSync({ world: 'turtle', code: 'penUp(); forward(100); penDown(); forward(50);' });
  assert.equal(a.trace.filter(e => e.t === 'seg' && e.pen).length, 1);
});
test('stars scale with par', () => {
  assert.equal(PGE.starsFor('blocks', 3, 3, false), 3); assert.equal(PGE.starsFor('blocks', 6, 3, false), 2);
  assert.equal(PGE.starsFor('blocks', 20, 3, false), 1); assert.equal(PGE.starsFor('blocks', 3, 3, true), 2);
  assert.equal(PGE.starsFor('text', 5, 5, false), 3);
});
test('corridor builds a walled path with stars', () => {
  const g = PGE.corridor([B.F(2), B.R(), B.F(2)], { dir: 1, stars: [2] });
  assert.equal(g.w, 3); assert.equal(g.h, 3); assert.deepEqual(g.goal, [2, 2]); assert.deepEqual(g.stars, [[2, 0]]);
});
