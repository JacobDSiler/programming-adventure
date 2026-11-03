/* Programming Adventure - engine (no DOM): sandboxed runner, robot grid + turtle worlds, block compiler,
 * drawing comparison, helpers. Runs in the browser and in Node (tests). */
(function (root) {
  'use strict';
  const PGE = {};

  /* ================= sandbox =================
   * Self-contained on purpose: it is stringified into a Web Worker. Never reference outer variables here. */
  function sandboxMain(job) {
    var out = { ok: true, error: null, logs: [], trace: [], state: null, tests: null, success: null, why: '' };
    var ticks = 0, TICK_MAX = 400000, MAXTRACE = job.maxTrace || 3000;
    function loopErr(m) { var e = new Error(m); e.pgLoop = true; return e; }
    function guard() { if (++ticks > TICK_MAX) throw loopErr('That loop never ends! Check the part that tells it to stop.'); }
    function emit(ev) { if (out.trace.length >= MAXTRACE) throw loopErr('The program made far too many moves. Is a loop running forever?'); out.trace.push(ev); }
    function num(v) { v = Number(v); if (!isFinite(v)) throw new Error('That needs a number.'); return v; }
    var api = {}, world = job.world || 'console', G = job.grid;

    /* ---- robot grid ---- */
    var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], wallSet = {}, starSet = {}, got = {}, gotN = 0, rx = 0, ry = 0, rd = 0;
    function key(x, y) { return x + ',' + y; }
    if (world === 'grid') {
      G.walls.forEach(function (w) { wallSet[key(w[0], w[1])] = 1; });
      (G.stars || []).forEach(function (s) { starSet[key(s[0], s[1])] = 1; });
      rx = G.start[0]; ry = G.start[1]; rd = G.dir || 0;
      var blocked = function (x, y) { return x < 0 || y < 0 || x >= G.w || y >= G.h || !!wallSet[key(x, y)]; };
      var look = function (off) { var d = (rd + off + 4) % 4; return blocked(rx + DX[d], ry + DY[d]); };
      var pick = function () { var k = key(rx, ry); if (starSet[k] && !got[k]) { got[k] = 1; gotN++; emit({ t: 'star', x: rx, y: ry }); } };
      api.forward = function (n) {
        n = n === undefined ? 1 : Math.floor(num(n));
        if (n < 0 || n > 500) throw new Error('forward needs a number from 0 to 500.');
        for (var i = 0; i < n; i++) {
          guard();
          if (look(0)) { emit({ t: 'bump', x: rx, y: ry, d: rd }); var e = new Error('Ouch! The robot bumped into a wall.'); e.pgBump = true; throw e; }
          rx += DX[rd]; ry += DY[rd]; emit({ t: 'move', x: rx, y: ry, d: rd }); pick();
        }
      };
      api.left = function () { rd = (rd + 3) % 4; emit({ t: 'turn', x: rx, y: ry, d: rd }); };
      api.right = function () { rd = (rd + 1) % 4; emit({ t: 'turn', x: rx, y: ry, d: rd }); };
      api.wallAhead = function () { return look(0); };
      api.wallRight = function () { return look(1); };
      api.wallLeft = function () { return look(3); };
      api.atGoal = function () { return !!G.goal && rx === G.goal[0] && ry === G.goal[1]; };
      api.onStar = function () { return !!starSet[key(rx, ry)]; };
    }

    /* ---- turtle ---- */
    var tx = 0, ty = 0, th = 0, pen = true, col = '#2F7DE1', wid = 3;
    if (world === 'turtle') {
      var seg = function (len) {
        var r = th * Math.PI / 180, nx = tx + Math.sin(r) * len, ny = ty - Math.cos(r) * len;
        emit({ t: 'seg', x1: tx, y1: ty, x2: nx, y2: ny, pen: pen, c: col, w: wid }); tx = nx; ty = ny;
      };
      api.forward = function (d) { seg(num(d)); };
      api.back = function (d) { seg(-num(d)); };
      api.left = function (a) { th = (th - num(a === undefined ? 90 : a)) % 360; emit({ t: 'turn', h: th }); };
      api.right = function (a) { th = (th + num(a === undefined ? 90 : a)) % 360; emit({ t: 'turn', h: th }); };
      api.penUp = function () { pen = false; };
      api.penDown = function () { pen = true; };
      api.color = function (c) { col = String(c); };
      api.width = function (w) { wid = Math.max(1, Math.min(12, num(w))); };
      api.circle = function (r) { r = num(r); var step = 2 * Math.PI * r / 36; for (var i = 0; i < 36; i++) { seg(step); th = (th + 10) % 360; } emit({ t: 'turn', h: th }); };
    }

    /* ---- console ---- */
    function fmtItem(v) { if (typeof v === 'string') return "'" + v + "'"; return fmt(v); }
    function fmt(v) {
      if (typeof v === 'string') return v;
      if (v === undefined) return 'undefined';
      if (v === null) return 'null';
      if (Array.isArray(v)) return '[' + v.map(fmtItem).join(', ') + ']';
      if (typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return String(v); } }
      return String(v);
    }
    var cons = {
      log: function () { out.logs.push(Array.prototype.map.call(arguments, fmt).join(' ')); if (out.logs.length > 400) throw loopErr('Too much printed output.'); },
    };
    cons.info = cons.warn = cons.error = cons.log;

    /* ---- loop-guard injection: put __g() at the top of every for / while / do block ---- */
    function inject(code) {
      var res = '', i = 0, re = /\b(for|while)\s*\(|\bdo\s*\{/g, m;
      while ((m = re.exec(code))) {
        if (m[0].charAt(0) === 'd') { res += code.slice(i, re.lastIndex) + '__g();'; i = re.lastIndex; continue; }
        var depth = 1, j = re.lastIndex;
        while (j < code.length && depth > 0) { var c = code.charAt(j); if (c === '(') depth++; else if (c === ')') depth--; j++; }
        var k = j; while (k < code.length && /\s/.test(code.charAt(k))) k++;
        if (code.charAt(k) === '{') { res += code.slice(i, k + 1) + '__g();'; i = k + 1; re.lastIndex = k + 1; }
      }
      return res + code.slice(i);
    }
    function canon(v) {
      if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
      if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
      var j = JSON.stringify(v); return j === undefined ? 'undefined' : j;
    }
    function deepEq(a, b) { try { return canon(a) === canon(b); } catch (e) { return false; } }
    function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
    function snap() { if (world === 'grid') out.state = { x: rx, y: ry, d: rd, stars: gotN, totalStars: (G.stars || []).length, atGoal: api.atGoal() }; }
    function errInfo(e) { return { msg: String(e && e.message || e), name: e && e.name || 'Error', bump: !!(e && e.pgBump), loop: !!(e && e.pgLoop) }; }

    try {
      var names = Object.keys(api), fns = job.fns || [];
      var body = inject(job.code || '') + '\n;return {' + fns.map(function (n) { return JSON.stringify(n) + ':(typeof ' + n + '==="function"?' + n + ':undefined)'; }).join(',') + '};';
      var f = new Function(names.concat(['__g', 'console', 'print']).join(','), body);
      var ex = f.apply(null, names.map(function (n) { return api[n]; }).concat([guard, cons, cons.log]));
      snap();
      if (world === 'grid') {
        if (out.state.atGoal || !G.goal) {
          if (out.state.stars === out.state.totalStars) out.success = true;
          else { out.success = false; out.why = 'The robot did not pick up every star (' + out.state.stars + ' of ' + out.state.totalStars + ').'; }
        } else { out.success = false; out.why = 'The robot stopped before it reached the flag.'; }
      }
      if (job.tests) {
        out.tests = job.tests.map(function (t) {
          ticks = 0;
          try {
            var fn = ex[t.fn];
            if (typeof fn !== 'function') return { ok: false, label: t.fn + '(...)', why: 'There is no function called ' + t.fn + ' yet.', hide: !!t.hide };
            var args = clone(t.args || []), got2 = fn.apply(null, args);
            var label = t.fn + '(' + (t.args || []).map(fmtItem).join(', ') + ')';
            return { ok: deepEq(got2, t.ret), label: label, got: fmt(got2), want: fmt(t.ret), hide: !!t.hide };
          } catch (e) { return { ok: false, label: t.fn + '(' + (t.args || []).map(fmtItem).join(', ') + ')', why: errInfo(e).msg, hide: !!t.hide }; }
        });
        out.success = out.tests.every(function (t) { return t.ok; });
      }
      if (job.expectOut || job.outMatch) {
        var good = true, why = '';
        if (job.expectOut) { good = deepEq(out.logs.map(function (s) { return String(s).trim(); }), job.expectOut); if (!good) why = 'The printed lines are not what the mission asks for yet.'; }
        if (good && job.outMatch) job.outMatch.forEach(function (rx2) { if (good && !new RegExp(rx2, 'm').test(out.logs.join('\n'))) { good = false; why = 'The output does not look right yet.'; } });
        out.success = good; out.why = why;
      }
    } catch (e) { out.ok = false; out.error = errInfo(e); snap(); if (world === 'grid') out.success = false; }
    return out;
  }
  PGE.runSync = sandboxMain;

  /* Run a job. Uses a Web Worker (killable) in browsers, direct call elsewhere. */
  PGE.run = function (job) {
    return new Promise(function (resolve) {
      if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || job.noWorker) { resolve(sandboxMain(job)); return; }
      try {
        var src = 'self.onmessage=function(e){var r;try{r=(' + sandboxMain.toString() + ')(e.data);}catch(x){r={ok:false,error:{msg:String(x&&x.message||x)},trace:[],logs:[]};}self.postMessage(r);};';
        var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), w = new Worker(url), done = false;
        var fin = function (r) { if (done) return; done = true; clearTimeout(t); try { w.terminate(); URL.revokeObjectURL(url); } catch (e) { } resolve(r); };
        var t = setTimeout(function () { fin({ ok: false, error: { msg: 'This is taking far too long. Is a loop running forever?', loop: true }, trace: [], logs: [], success: false }); }, job.timeout || 3500);
        w.onmessage = function (e) { fin(e.data); };
        w.onerror = function () { if (!done) { done = true; clearTimeout(t); try { w.terminate(); } catch (e) { } resolve(sandboxMain(job)); } };
        w.postMessage(job);
      } catch (e) { resolve(sandboxMain(job)); }
    });
  };

  /* ================= grids ================= */
  /* rows: strings with # wall, S start, G goal, * star, . floor */
  PGE.parseGrid = function (rows, dir) {
    const walls = [], stars = []; let start = null, goal = null;
    rows.forEach((r, y) => Array.from(r).forEach((ch, x) => {
      if (ch === '#') walls.push([x, y]); else if (ch === '*') stars.push([x, y]); else if (ch === 'S') start = [x, y]; else if (ch === 'G') goal = [x, y];
    }));
    return { w: rows[0].length, h: rows.length, walls, stars, start, goal, dir: dir || 0 };
  };

  /* ================= block programs ================= */
  const B = PGE.B = {
    F: n => ({ t: 'fwd', n: n == null ? 1 : n }), K: n => ({ t: 'back', n: n == null ? 50 : n }),
    L: n => ({ t: 'left', n: n == null ? 90 : n }), R: n => ({ t: 'right', n: n == null ? 90 : n }),
    Rep: (n, ...body) => ({ t: 'repeat', n, body }),
    If: (c, body, els) => ({ t: 'if', c, body, els: els || null }),
    While: (c, ...body) => ({ t: 'while', c, body }),
    Call: () => ({ t: 'call' }), Up: () => ({ t: 'penup' }), Down: () => ({ t: 'pendown' }),
    Col: c => ({ t: 'color', c }), Wid: n => ({ t: 'width', n }), Circ: n => ({ t: 'circle', n: n == null ? 30 : n })
  };
  const COND = { wall: 'wallAhead()', path: '!wallAhead()', goal: 'atGoal()', notgoal: '!atGoal()', star: 'onStar()' };
  PGE.CONDS = COND;
  const LOOPVARS = 'ijklmn';
  function comp(list, depth, ind, out) {
    list.forEach(n => {
      const pad = '  '.repeat(ind);
      switch (n.t) {
        case 'fwd': out.push(pad + 'forward(' + n.n + ');'); break;
        case 'back': out.push(pad + 'back(' + n.n + ');'); break;
        case 'left': out.push(pad + (n.noarg ? 'left();' : 'left(' + n.n + ');')); break;
        case 'right': out.push(pad + (n.noarg ? 'right();' : 'right(' + n.n + ');')); break;
        case 'repeat': { const v = LOOPVARS.charAt(depth) || 'i' + depth; out.push(`${pad}for (let ${v} = 0; ${v} < ${n.n}; ${v}++) {`); comp(n.body || [], depth + 1, ind + 1, out); out.push(pad + '}'); break; }
        case 'while': out.push(`${pad}while (${COND[n.c] || 'true'}) {`); comp(n.body || [], depth, ind + 1, out); out.push(pad + '}'); break;
        case 'if': out.push(`${pad}if (${COND[n.c] || 'true'}) {`); comp(n.body || [], depth, ind + 1, out);
          if (n.els) { out.push(pad + '} else {'); comp(n.els, depth, ind + 1, out); } out.push(pad + '}'); break;
        case 'call': out.push(pad + 'myBlock();'); break;
        case 'penup': out.push(pad + 'penUp();'); break;
        case 'pendown': out.push(pad + 'penDown();'); break;
        case 'color': out.push(pad + 'color(' + JSON.stringify(n.c) + ');'); break;
        case 'width': out.push(pad + 'width(' + n.n + ');'); break;
        case 'circle': out.push(pad + 'circle(' + n.n + ');'); break;
      }
    });
  }
  /* prog: array (main only) or {main, fn}. noarg: grid worlds, where left/right take no number. */
  PGE.compile = function (prog, opts) {
    opts = opts || {};
    const main = Array.isArray(prog) ? prog : (prog.main || []), fn = Array.isArray(prog) ? [] : (prog.fn || []);
    const flat = list => list.map(function fix(n) { const c = Object.assign({}, n); if (opts.grid && (c.t === 'left' || c.t === 'right')) c.noarg = true; if (c.body) c.body = c.body.map(fix); if (c.els) c.els = c.els.map(fix); return c; });
    const out = [];
    if (fn.length) { out.push('function myBlock() {'); comp(flat(fn), 0, 1, out); out.push('}', ''); }
    comp(flat(main), 0, 0, out);
    return out.join('\n');
  };
  PGE.countBlocks = function (prog) {
    const cnt = l => (l || []).reduce((a, n) => a + 1 + cnt(n.body) + cnt(n.els), 0);
    return Array.isArray(prog) ? cnt(prog) : cnt(prog.main) + cnt(prog.fn);
  };
  PGE.countLines = code => String(code || '').split('\n').filter(l => { l = l.trim(); return l && l !== '}' && l !== '};' && l.slice(0, 2) !== '//'; }).length;

  /* Build a corridor maze from a path-only program (forward / turns / repeats / myBlock calls). Stars sit on chosen path cells. */
  PGE.corridor = function (prog, opts) {
    opts = opts || {};
    const code = PGE.compile(prog, { grid: true });
    let x = 0, y = 0, d = opts.dir == null ? 1 : opts.dir; const cells = [[0, 0]];
    const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
    const api = { forward: n => { for (let i = 0; i < (n === undefined ? 1 : n); i++) { x += DX[d]; y += DY[d]; cells.push([x, y]); } }, left: () => { d = (d + 3) % 4; }, right: () => { d = (d + 1) % 4; }, myBlock: null };
    const names = Object.keys(api).filter(k => k !== 'myBlock');
    new Function(names.join(','), code).apply(null, names.map(k => api[k]));
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    cells.forEach(c => { minx = Math.min(minx, c[0]); miny = Math.min(miny, c[1]); maxx = Math.max(maxx, c[0]); maxy = Math.max(maxy, c[1]); });
    const w = maxx - minx + 1, h = maxy - miny + 1, open = {};
    cells.forEach(c => { open[(c[0] - minx) + ',' + (c[1] - miny)] = 1; });
    const walls = []; for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (!open[xx + ',' + yy]) walls.push([xx, yy]);
    const at = i => [cells[i][0] - minx, cells[i][1] - miny];
    const stars = (opts.stars || []).map(i => at(i < 0 ? cells.length + i : i));
    return { w, h, walls, stars, start: at(0), goal: opts.noGoal ? null : at(cells.length - 1), dir: opts.dir == null ? 1 : opts.dir };
  };
  /* A corridor whose function-style program uses myBlock: define it for the path simulation. */
  PGE.corridorFn = function (prog, opts) {
    const p = Array.isArray(prog) ? { main: prog, fn: [] } : prog;
    const expand = l => l.reduce((a, n) => a.concat(n.t === 'call' ? p.fn.map(f => Object.assign({}, f)) : [n.body ? Object.assign({}, n, { body: expand(n.body) }) : n]), []);
    return PGE.corridor(expand(p.main), opts);
  };

  /* ================= turtle drawings ================= */
  function segsOf(trace) { return (trace || []).filter(e => e.t === 'seg' && e.pen && Math.hypot(e.x2 - e.x1, e.y2 - e.y1) > 0.01).map(e => [e.x1, e.y1, e.x2, e.y2]); }
  function samples(segs, step) {
    const pts = [];
    segs.forEach(s => { const L = Math.hypot(s[2] - s[0], s[3] - s[1]), n = Math.max(1, Math.ceil(L / step)); for (let i = 0; i <= n; i++) pts.push([s[0] + (s[2] - s[0]) * i / n, s[1] + (s[3] - s[1]) * i / n]); });
    return pts;
  }
  function distPS(px, py, s) {
    const dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - s[0]) * dx + (py - s[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (s[0] + t * dx), py - (s[1] + t * dy));
  }
  PGE.compareDrawings = function (userTrace, targetTrace) {
    const U = segsOf(userTrace), T = segsOf(targetTrace);
    if (!U.length) return { ok: false, cover: 0, extra: 1 };
    const tol = 6, TP = samples(T, 4), UP = samples(U, 4);
    const near = (p, segs) => { for (let i = 0; i < segs.length; i++) if (distPS(p[0], p[1], segs[i]) <= tol) return true; return false; };
    const cover = TP.filter(p => near(p, U)).length / (TP.length || 1);
    const extra = UP.filter(p => !near(p, T)).length / (UP.length || 1);
    return { ok: cover >= 0.93 && extra <= 0.1, cover, extra };
  };

  /* ================= friendly errors, stars ================= */
  PGE.friendly = function (err) {
    if (!err) return '';
    if (err.bump || err.loop) return err.msg;
    const m = err.msg || ''; let mm;
    if ((mm = m.match(/^(\w+) is not defined/))) return 'I do not know what "' + mm[1] + '" is. Check the spelling (capital letters matter) or create it with let first.';
    if (/is not a function/.test(m)) return 'Something you tried to run is not a function. (' + m + ')';
    if (/Unexpected token|Unexpected end|missing \)|Invalid or unexpected|Unexpected identifier|Unexpected string/.test(m)) return 'Something is typed wrong. Check every ( ) and { } has a partner, and that there is a ; or comma where it belongs. (' + m + ')';
    if (/before initialization/.test(m)) return 'You used a variable before you made it. Move the let line up. (' + m + ')';
    if (/Assignment to constant/.test(m)) return 'A const cannot change. Use let instead. (' + m + ')';
    return m;
  };
  /* kind: 'blocks' (used = block count) | 'text' (used = lines). par from the solution. */
  PGE.starsFor = function (kind, used, par, hintUsed) {
    let s = 3;
    if (par) {
      if (kind === 'blocks') s = used <= par + 1 ? 3 : used <= par + 4 ? 2 : 1;
      else s = used <= Math.ceil(par * 1.6) + 1 ? 3 : used <= Math.ceil(par * 2.5) + 2 ? 2 : 1;
    }
    if (hintUsed) s = Math.min(s, 2);
    return s;
  };

  root.PGE = PGE;
  if (typeof module !== 'undefined' && module.exports) module.exports = PGE;
})(typeof window !== 'undefined' ? window : globalThis);
