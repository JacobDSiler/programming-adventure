/* Programming Adventure - lesson UI: robot + turtle stages, block editor, text editor, run/feedback, free play. */
(function () {
  'use strict';
  const PG = window.PG, PGC = window.PGC, PGE = window.PGE, h = PG.h, s = PG.s;

  /* ================= stages ================= */
  function gridStage(grid) {
    const S = 48, W = grid.w * S, H = grid.h * S;
    const svg = s('svg', { class: 'stage', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Robot maze' });
    const wall = new Set(grid.walls.map(w => w[0] + ',' + w[1]));
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) {
      const w = wall.has(x + ',' + y);
      svg.append(s('rect', { x: x * S + (w ? 1 : 0), y: y * S + (w ? 1 : 0), width: S - (w ? 2 : 0), height: S - (w ? 2 : 0), rx: w ? 8 : 0, fill: w ? '#33445f' : ((x + y) % 2 ? '#e9f1fa' : '#f4f8fc') }));
      if (w) svg.append(s('rect', { x: x * S + 6, y: y * S + 6, width: S - 12, height: 6, rx: 3, fill: '#4b6086' }));
    }
    const mid = (x, y) => [x * S + S / 2, y * S + S / 2];
    if (grid.goal) { const [gx, gy] = mid(grid.goal[0], grid.goal[1]); svg.append(s('text', { x: gx, y: gy + 10, 'text-anchor': 'middle', 'font-size': 30 }, '🏁')); }
    const starEls = {};
    (grid.stars || []).forEach(st => { const [sx, sy] = mid(st[0], st[1]); const t = s('text', { x: sx, y: sy + 9, 'text-anchor': 'middle', 'font-size': 26, class: 'gstar' }, '⭐'); starEls[st[0] + ',' + st[1]] = t; svg.append(t); });
    const rot = s('g', { class: 'rot' },
      s('rect', { x: -15, y: -15, width: 30, height: 30, rx: 9, fill: '#2F7DE1', stroke: '#16418a', 'stroke-width': 2 }),
      s('path', { d: 'M0 -25 L-9 -14 L9 -14 Z', fill: '#F5B83D', stroke: '#9a6b00', 'stroke-width': 1.5 }),
      s('circle', { cx: -6, cy: -3, r: 4.5, fill: '#fff' }), s('circle', { cx: 6, cy: -3, r: 4.5, fill: '#fff' }),
      s('circle', { cx: -6, cy: -4, r: 2, fill: '#10263f' }), s('circle', { cx: 6, cy: -4, r: 2, fill: '#10263f' }),
      s('rect', { x: -7, y: 6, width: 14, height: 3, rx: 1.5, fill: '#bcd6ff' }));
    const robot = s('g', { class: 'robot' }, rot);
    svg.append(robot);
    let token = 0, cumul = 0, curDir = 0;
    const place = (x, y) => { const p = mid(x, y); robot.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)'; };
    const setAng = d => { const delta = ((d - curDir) % 4 + 4) % 4; cumul += (delta === 3 ? -1 : delta) * 90; curDir = d; rot.style.transform = 'rotate(' + cumul + 'deg)'; };
    const api = {
      el: svg, kind: 'grid',
      reset() {
        token++; cumul = (grid.dir || 0) * 90; curDir = grid.dir || 0;
        robot.classList.remove('bump'); robot.classList.add('notrans'); place(grid.start[0], grid.start[1]); rot.style.transform = 'rotate(' + cumul + 'deg)';
        Object.keys(starEls).forEach(k => { starEls[k].style.opacity = 1; });
        void robot.getBoundingClientRect && robot.getBoundingClientRect(); setTimeout(() => robot.classList.remove('notrans'), 30);
      },
      async play(trace, ms) {
        const my = ++token;
        for (const ev of trace) {
          if (my !== token) return false;
          if (ev.t === 'move') { place(ev.x, ev.y); PG.sfx.step(); }
          else if (ev.t === 'turn') { setAng(ev.d); PG.sfx.click(); }
          else if (ev.t === 'star') { const e = starEls[ev.x + ',' + ev.y]; if (e) e.style.opacity = 0; PG.sfx.star(); }
          else if (ev.t === 'bump') { robot.classList.add('bump'); PG.sfx.bad(); }
          await PG.sleep(ev.t === 'star' ? ms * .4 : ms);
        }
        return my === token;
      }
    };
    api.reset();
    return api;
  }

  function turtleStage(targetTrace) {
    const R = 160, svg = s('svg', { class: 'stage turtle', viewBox: -R + ' ' + -R + ' ' + 2 * R + ' ' + 2 * R, role: 'img', 'aria-label': 'Turtle drawing' });
    svg.append(s('rect', { x: -R, y: -R, width: 2 * R, height: 2 * R, fill: '#fbfdff' }));
    for (let v = -120; v <= 120; v += 40) {
      svg.append(s('line', { x1: v, y1: -R, x2: v, y2: R, stroke: v === 0 ? '#c7d4e6' : '#e8eef6', 'stroke-width': v === 0 ? 1.4 : 1 }), s('line', { x1: -R, y1: v, x2: R, y2: v, stroke: v === 0 ? '#c7d4e6' : '#e8eef6', 'stroke-width': v === 0 ? 1.4 : 1 }));
    }
    const ghost = s('g', { opacity: .75 }); svg.append(ghost);
    (targetTrace || []).filter(e => e.t === 'seg' && e.pen).forEach(e => ghost.append(s('line', { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, stroke: '#8d9bb0', 'stroke-width': 5, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round' })));
    const drawn = s('g'); svg.append(drawn);
    const rot = s('g', { class: 'rot' }, s('path', { d: 'M0 -15 L-10 11 L0 6 L10 11 Z', fill: '#12B58C', stroke: '#06664d', 'stroke-width': 2, 'stroke-linejoin': 'round' }), s('circle', { cx: 0, cy: -8, r: 3, fill: '#fff' }));
    const tur = s('g', { class: 'robot tur' }, rot); svg.append(tur);
    let token = 0, cumul = 0, cur = 0;
    const place = (x, y) => { tur.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
    const head = hh => { const d = ((hh - cur + 540) % 360) - 180; cumul += d; cur = ((hh % 360) + 360) % 360; rot.style.transform = 'rotate(' + cumul + 'deg)'; };
    const api = {
      el: svg, kind: 'turtle',
      reset() { token++; drawn.innerHTML = ''; cumul = 0; cur = 0; tur.classList.add('notrans'); place(0, 0); rot.style.transform = 'rotate(0deg)'; setTimeout(() => tur.classList.remove('notrans'), 30); },
      async play(trace, ms) {
        const my = ++token;
        for (const ev of trace) {
          if (my !== token) return false;
          if (ev.t === 'seg') { if (ev.pen) drawn.append(s('line', { x1: ev.x1, y1: ev.y1, x2: ev.x2, y2: ev.y2, stroke: ev.c || '#2F7DE1', 'stroke-width': ev.w || 3, 'stroke-linecap': 'round' })); place(ev.x2, ev.y2); PG.sfx.step(); }
          else if (ev.t === 'turn') head(ev.h);
          await PG.sleep(ms);
        }
        return my === token;
      }
    };
    api.reset();
    return api;
  }
  PG.gridStage = gridStage; PG.turtleStage = turtleStage;

  /* ================= block editor ================= */
  const BLK = {
    fwd: { cls: 'move', icon: '⬆️', short: 'Forward', text: w => w === 'grid' ? 'Move forward' : 'Forward' },
    back: { cls: 'move', icon: '⬇️', short: 'Back', text: () => 'Back' },
    left: { cls: 'turn', icon: '↰', short: 'Left', text: () => 'Turn left' },
    right: { cls: 'turn', icon: '↱', short: 'Right', text: () => 'Turn right' },
    repeat: { cls: 'loop', icon: '🔁', short: 'Repeat', text: () => 'Repeat', container: true },
    while: { cls: 'loop', icon: '♾️', short: 'While', text: () => 'While', cond: true, container: true },
    if: { cls: 'logic', icon: '❓', short: 'If', text: () => 'If', cond: true, container: true },
    ifelse: { cls: 'logic', icon: '❓', short: 'If / else', text: () => 'If', cond: true, container: true },
    call: { cls: 'fn', icon: '🧩', short: 'My Block', text: () => 'My Block' },
    penup: { cls: 'pen', icon: '🖐️', short: 'Pen up', text: () => 'Pen up' },
    pendown: { cls: 'pen', icon: '✏️', short: 'Pen down', text: () => 'Pen down' },
    color: { cls: 'pen', icon: '🎨', short: 'Colour', text: () => 'Pen colour' },
    width: { cls: 'pen', icon: '〰️', short: 'Width', text: () => 'Pen width' }
  };
  const CONDS = { wall: 'wall ahead', path: 'path ahead', goal: 'at the flag', notgoal: 'NOT at the flag', star: 'on a star' };
  const COLORS = ['tomato', 'orange', 'gold', 'seagreen', 'dodgerblue', 'rebeccapurple', 'hotpink', 'black'];
  function pspec(t, world, fixed) {
    if (t === 'fwd') return world === 'grid' ? (fixed ? null : { min: 1, max: 9, step: 1, unit: ' steps' }) : { min: 10, max: 200, step: 10, unit: '' };
    if (t === 'back') return { min: 10, max: 200, step: 10, unit: '' };
    if (t === 'left' || t === 'right') return world === 'grid' ? null : { min: 15, max: 360, step: 15, unit: '°' };
    if (t === 'repeat') return { min: 2, max: 36, step: 1, unit: ' times' };
    if (t === 'width') return { min: 1, max: 12, step: 1, unit: '' };
    return null;
  }
  function mkNode(id, c) {
    const world = c.world, conds = c.conds || Object.keys(CONDS);
    switch (id) {
      case 'fwd': return { t: 'fwd', n: world === 'grid' ? 1 : 50 };
      case 'back': return { t: 'back', n: 50 };
      case 'left': case 'right': return { t: id, n: 90 };
      case 'repeat': return { t: 'repeat', n: 3, body: [] };
      case 'while': return { t: 'while', c: conds[0], body: [] };
      case 'if': return { t: 'if', c: conds[conds.length - 1], body: [], els: null };
      case 'ifelse': return { t: 'if', c: conds[conds.length - 1], body: [], els: [] };
      case 'call': return { t: 'call' };
      case 'penup': return { t: 'penup' }; case 'pendown': return { t: 'pendown' };
      case 'color': return { t: 'color', c: 'tomato' };
      case 'width': return { t: 'width', n: 6 };
    }
    return { t: id };
  }
  function blocksEditor(c, state, onChange, big) {
    const root = h('div', { class: 'bed' }), tabs = h('div', { class: 'tabs2' }), progBox = h('div', { class: 'prog' }), palette = h('div', { class: 'palette' + (big ? ' big' : '') });
    const world = c.world, allowed = c.allowed || ['fwd', 'left', 'right', 'repeat'], hasFn = allowed.indexOf('call') >= 0;
    const reach = (list, target) => list === target || list.some(n => (n.body && reach(n.body, target)) || (n.els && reach(n.els, target)));
    const fixCursor = () => { if (!(reach(state.prog.main, state.cursor) || reach(state.prog.fn, state.cursor))) state.cursor = state.prog[state.active]; };
    const changed = () => { fixCursor(); draw(); onChange(); };
    function zone(list, label) { const on = state.cursor === list; return h('button', { class: 'zone' + (on ? ' cur' : ''), onclick: () => { state.cursor = list; draw(); PG.sfx.click(); } }, on ? '⬇ ' + (label || 'new blocks go here') : '＋ ' + (label || 'here')); }
    function renderList(list, label) {
      const wrap = h('div', { class: 'blist' });
      list.forEach((n, i) => wrap.append(renderNode(n, list, i)));
      wrap.append(zone(list, label)); return wrap;
    }
    function renderNode(n, list, i) {
      const id = n.t === 'if' && n.els ? 'ifelse' : n.t, def = BLK[id] || { cls: 'move', icon: '▫️', text: () => n.t }, spec = pspec(n.t, world, c.fixed);
      const head = h('div', { class: 'blk ' + def.cls + (big ? ' big' : '') }, h('span', { class: 'ic' }, def.icon), h('span', { class: 'lb' }, def.text(world)));
      if (def.cond) {
        const conds = c.conds || Object.keys(CONDS);
        head.append(h('select', { class: 'csel', onchange: e => { n.c = e.target.value; changed(); } }, conds.map(k => h('option', { value: k, selected: k === n.c }, CONDS[k]))));
      }
      if (spec) {
        head.append(h('span', { class: 'step' },
          h('button', { 'aria-label': 'less', onclick: () => { n.n = Math.max(spec.min, n.n - spec.step); changed(); PG.sfx.click(); } }, '−'),
          h('b', null, n.n + spec.unit),
          h('button', { 'aria-label': 'more', onclick: () => { n.n = Math.min(spec.max, n.n + spec.step); changed(); PG.sfx.click(); } }, '+')));
      }
      if (n.t === 'color') head.append(h('select', { class: 'csel', onchange: e => { n.c = e.target.value; changed(); } }, COLORS.map(k => h('option', { value: k, selected: k === n.c }, k))));
      const ctl = h('span', { class: 'ctl' });
      if (!big) {
        if (i > 0) ctl.append(h('button', { 'aria-label': 'move up', onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; changed(); } }, '▲'));
        if (i < list.length - 1) ctl.append(h('button', { 'aria-label': 'move down', onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; changed(); } }, '▼'));
      }
      ctl.append(h('button', { class: 'x', 'aria-label': 'delete block', onclick: () => { list.splice(i, 1); changed(); PG.sfx.click(); } }, '✕'));
      head.append(ctl);
      if (!def.container) return head;
      const box = h('div', { class: 'cblock ' + def.cls }, head, h('div', { class: 'inner' }, renderList(n.body, n.els ? 'then' : 'inside')));
      if (n.els) box.append(h('div', { class: 'elsehead' }, 'else'), h('div', { class: 'inner' }, renderList(n.els, 'else')));
      return box;
    }
    function draw() {
      tabs.innerHTML = '';
      if (hasFn) [['main', 'Main program'], ['fn', '🧩 My Block']].forEach(([k, l]) => tabs.append(h('button', { class: 'tab2' + (state.active === k ? ' on' : ''), onclick: () => { state.active = k; state.cursor = state.prog[k]; draw(); } }, l)));
      progBox.innerHTML = '';
      const list = state.prog[state.active];
      if (!list.length) progBox.append(h('div', { class: 'emptyprog' }, state.active === 'fn' ? 'Build what My Block does here.' : 'Tap a block below to start your program.'));
      progBox.append(renderList(list, state.active === 'fn' ? 'My Block does this' : 'program'));
    }
    palette.append(...allowed.map(id => {
      const def = BLK[id];
      return h('button', { class: 'pal ' + def.cls, onclick: () => {
        const node = mkNode(id, c); (state.cursor || state.prog.main).push(node);
        if (node.body) state.cursor = node.body;
        PG.sfx.click(); changed();
      } }, h('span', { class: 'ic' }, def.icon), h('span', null, def.short));
    }));
    root.append(tabs, progBox, h('div', { class: 'pallabel' }, 'Blocks'), palette);
    draw();
    return { el: root, redraw: draw };
  }

  /* ================= text editor ================= */
  function textEditor(c, state, onChange, worldKey) {
    const root = h('div', { class: 'ted' });
    const ta = h('textarea', { class: 'code', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', rows: Math.max(8, Math.min(16, (state.text.split('\n').length + 3))), 'aria-label': 'Code editor', value: state.text });
    const sync = () => { state.text = ta.value; onChange(); };
    ta.addEventListener('input', sync);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); ins('  '); }
      else if (e.key === 'Enter') {
        const pos = ta.selectionStart, before = ta.value.slice(0, pos), line = before.slice(before.lastIndexOf('\n') + 1), ind = (line.match(/^\s*/) || [''])[0] + (/[{(\[]\s*$/.test(line) ? '  ' : '');
        e.preventDefault(); ins('\n' + ind);
      }
    });
    function ins(txt, cursorBack) {
      const a = ta.selectionStart || 0, b = ta.selectionEnd || 0;
      ta.value = ta.value.slice(0, a) + txt + ta.value.slice(b);
      const p = a + txt.length - (cursorBack || 0); ta.selectionStart = ta.selectionEnd = p; ta.focus(); sync();
    }
    const chips = (c.chips || PGC.chips[worldKey] || []);
    const back = t => { const i = t.indexOf('\n  \n'); return i >= 0 ? t.length - (i + 3) : (/\(\);$/.test(t) ? 2 : 0); };
    const bar = h('div', { class: 'chipbar' }, chips.map(t => h('button', { class: 'snip', onclick: () => { ins(t, back(t)); PG.sfx.click(); } }, t.split('\n')[0].replace(/\{$/, '{…}'))));
    const api = (PGC.api[worldKey] || []).concat(c.extraApi ? PGC.api.gridPlus : []);
    const sheet = h('details', { class: 'sheet' }, h('summary', null, '📖 Cheat sheet'), h('ul', null, api.map(a => h('li', null, h('code', null, a.split('  ')[0]), a.indexOf('  ') > 0 ? ' ' + a.split('  ').slice(1).join(' ') : ''))));
    root.append(bar, ta, sheet);
    return { el: root, setText(t) { ta.value = t; state.text = t; }, focus() { ta.focus(); } };
  }
  PG.blocksEditor = blocksEditor; PG.textEditor = textEditor;

  /* ================= lesson screen ================= */
  let speed = 1; try { speed = Number(localStorage.getItem('pg_speed')); if (!(speed >= 0 && speed <= 2)) speed = 1; } catch (e) { speed = 1; }
  const SPEEDS = [['🐢', 'Slow'], ['🐇', 'Normal'], ['⚡', 'Fast']];
  const stepMs = (world, n) => { const base = world === 'grid' ? [520, 300, 90] : [220, 110, 18]; let ms = base[speed]; if (n > 150) ms = Math.min(ms, 40); if (n > 500) ms = Math.min(ms, 12); return ms; };

  function buildLesson(c, free) {
    const pid = PG.P().id, track = PGC.track(c.track) || PG.track(), big = !!track.big;
    const wrap = h('div', { class: 'lesson' }); wrap.style.setProperty('--c', track.color);
    const unit = PGC.unitById(c.unit);
    const state = { prog: { main: [], fn: [] }, active: 'main', cursor: null, text: c.start || '' };
    const saved = PG.code.get(pid, c.id);
    if (saved) { if (c.mode === 'blocks' && saved.prog) state.prog = { main: saved.prog.main || [], fn: saved.prog.fn || [] }; else if (saved.text != null) state.text = saved.text; }
    state.cursor = state.prog.main;
    let hintUsed = false, running = false, codeOpen = false, saveT = null;
    const worldKey = c.world === 'grid' ? 'grid' : c.world === 'turtle' ? 'turtle' : 'console';
    const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => PG.code.put(pid, c.id, c.mode === 'blocks' ? { prog: state.prog } : { text: state.text }), 300); };

    // stage
    let stage = null, targetTrace = null;
    if (c.world === 'grid') stage = PG.gridStage(c.grid);
    else if (c.world === 'turtle') { if (!free) targetTrace = PGE.runSync({ world: 'turtle', code: c.targetCode, noWorker: true }).trace; stage = PG.turtleStage(targetTrace); }

    wrap.append(PG.topbar(free ? '🎨 Free play' : c.title, free ? '/' : '/track/' + track.id, PG.starPill()));
    const goalRow = h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, unit && !free && unit.challenges[0] === c ? h('p', { class: 'small muted' }, '💡 ' + unit.intro) : null, h('p', { class: 'goal' + (big ? ' big' : '') }, c.goal)),
      h('button', { class: 'say', 'aria-label': 'Read aloud', onclick: () => { const was = PG.D().tts; PG.D().tts = true; PG.say(c.goal); PG.D().tts = was; } }, '🔊'));
    wrap.append(h('div', { class: 'card' }, goalRow));
    if (stage) wrap.append(h('div', { class: 'card stagecard' }, stage.el));

    // editor
    let ed, blocksEd = null;
    const onChange = () => { persist(); if (codeOpen) refreshCode(); };
    if (c.mode === 'blocks') { blocksEd = blocksEditor(c, state, onChange, big); ed = blocksEd; } else ed = textEditor(c, state, onChange, worldKey);
    wrap.append(h('div', { class: 'card editor' }, ed.el));

    // controls
    const runBtn = h('button', { class: 'btn mint big', onclick: run }, '▶ Run');
    const speedBtn = h('button', { class: 'chip btnlike', onclick: () => { speed = (speed + 1) % 3; try { localStorage.setItem('pg_speed', String(speed)); } catch (e) { } speedBtn.textContent = SPEEDS[speed][0] + ' ' + SPEEDS[speed][1]; } }, SPEEDS[speed][0] + ' ' + SPEEDS[speed][1]);
    const resetBtn = h('button', { class: 'btn ghost small', onclick: () => { if (stage) stage.reset(); resultBox.innerHTML = ''; running = false; runBtn.disabled = false; } }, '↺ Reset');
    wrap.append(h('div', { class: 'row ctrl' }, runBtn, resetBtn, stage ? speedBtn : null));
    const hintBox = h('div'), codeBox = h('div'), resultBox = h('div');
    const tools = h('div', { class: 'wrapx mt8' });
    if (!free) tools.append(h('button', { class: 'chip btnlike', onclick: () => { hintUsed = true; hintBox.innerHTML = ''; hintBox.append(h('div', { class: 'card hint' }, '💡 ' + (c.hint || 'Break it into small steps.'))); PG.say(c.hint || ''); } }, '💡 Hint'));
    if (c.mode === 'blocks') tools.append(h('button', { class: 'chip btnlike', onclick: () => { codeOpen = !codeOpen; refreshCode(); } }, '👀 See the real code'));
    tools.append(h('button', { class: 'chip btnlike', onclick: () => {
      if (c.mode === 'blocks') { state.prog = { main: [], fn: [] }; state.active = 'main'; state.cursor = state.prog.main; blocksEd.redraw(); } else ed.setText(c.start || '');
      PG.code.clear(pid, c.id); if (codeOpen) refreshCode();
    } }, '🧹 Start over'));
    wrap.append(tools, hintBox, codeBox, resultBox);
    function refreshCode() {
      codeBox.innerHTML = '';
      if (codeOpen && c.mode === 'blocks') codeBox.append(h('div', { class: 'card flat' }, h('div', { class: 'small muted' }, 'This is the same program written as JavaScript:'), h('pre', { class: 'codeview' }, PGE.compile(state.prog, { grid: c.world === 'grid' }) || '// (empty)')));
    }

    function getCode() { return c.mode === 'blocks' ? PGE.compile(state.prog, { grid: c.world === 'grid' }) : state.text; }
    async function run() {
      if (running) return;
      if (c.mode === 'blocks' ? !PGE.countBlocks(state.prog) : !state.text.trim()) { PG.toast(c.mode === 'blocks' ? 'Add some blocks first!' : 'Type some code first!'); return; }
      running = true; runBtn.disabled = true; resultBox.innerHTML = ''; hintBox.innerHTML = hintBox.innerHTML; if (stage) stage.reset();
      const code = getCode();
      const res = await PGE.run({ world: c.world, code, grid: c.grid, tests: c.tests, fns: c.fns, expectOut: c.expectOut, outMatch: c.outMatch });
      let finished = true;
      if (stage) finished = await stage.play(res.trace || [], stepMs(c.world, (res.trace || []).length));
      running = false; runBtn.disabled = false;
      if (finished) outcome(res, code);
    }
    function outputPanel(res) {
      const box = h('div', { class: 'card flat' });
      if (c.world === 'console' || (res.logs && res.logs.length)) box.append(h('div', { class: 'small muted' }, 'Output'), h('pre', { class: 'outview' }, (res.logs && res.logs.length) ? res.logs.join('\n') : '(nothing printed)'));
      if (res.tests) {
        const ul = h('ul', { class: 'tests' });
        res.tests.forEach(t => ul.append(h('li', { class: t.ok ? 'ok' : 'bad' }, t.ok ? '✅ ' : '❌ ', t.hide ? (t.ok ? 'Hidden test passed' : 'A hidden test failed. Try other numbers and edge cases like 0 or empty.') : h('span', null, h('code', null, t.label), t.ok ? ' → ' + t.got : (t.why ? ' — ' + t.why : ' gave ' + t.got + ', wanted ' + t.want)))));
        box.append(ul);
      }
      return box.childNodes.length ? box : null;
    }
    function outcome(res, code) {
      let ok = false, msg = '', cmp = null;
      if (res.error) msg = PGE.friendly(res.error);
      else if (free) { msg = 'Nice! Change the code and run it again.'; }
      else if (c.world === 'turtle') { cmp = PGE.compareDrawings(res.trace, targetTrace); ok = cmp.ok; if (!ok) msg = cmp.cover < 0.93 ? 'Some of the dotted picture is still missing. Compare it with your drawing.' : 'You drew extra lines that are not in the picture.'; }
      else { ok = res.success === true; if (!ok) msg = res.why || (res.tests ? 'Some tests failed. Read them below.' : 'Not quite yet. Try again!'); }
      resultBox.innerHTML = '';
      const out = outputPanel(res);
      if (free) { if (out) resultBox.append(out); if (msg) resultBox.append(h('p', { class: 'muted small mt8' }, msg)); return; }
      if (!ok) {
        PG.sfx.bad(); if (big) PG.say('Oops! Try again.');
        resultBox.append(h('div', { class: 'card bad' }, h('b', null, '🤔 Not yet'), h('p', { class: 'mt8' }, msg))); if (out) resultBox.append(out);
        return;
      }
      const used = c.mode === 'blocks' ? PGE.countBlocks(state.prog) : PGE.countLines(code);
      const stars = c.world === 'console' || c.par == null ? (hintUsed ? 2 : 3) : PGE.starsFor(c.mode, used, c.par, hintUsed);
      const rec = PG.recordChallenge(c.id, stars);
      PG.confetti(); PG.sfx.win(); if (big) PG.say('Great job! You did it!');
      const list = PGC.allChallenges().filter(x => x.track === c.track), idx = list.findIndex(x => x.id === c.id), nx = list[idx + 1];
      const note = c.par != null && c.world !== 'console' && used > c.par + 1 ? 'You used ' + used + (c.mode === 'blocks' ? ' blocks' : ' lines') + '. Can you do it in ' + c.par + '? 🎯' : (hintUsed ? 'Try one without the hint for 3 stars!' : 'Perfect!');
      resultBox.append(h('div', { class: 'card good' }, h('div', { class: 'center' }, h('div', { class: 'bigem' }, '🎉'), h('h3', null, 'Mission complete!'), PG.starsEl(stars), h('p', { class: 'muted mt8' }, note)),
        h('div', { class: 'row mt12', style: { justifyContent: 'center' } },
          h('button', { class: 'btn ghost', onclick: () => { if (stage) stage.reset(); resultBox.innerHTML = ''; } }, 'Try again'),
          nx ? h('button', { class: 'btn mint', onclick: () => PG.go('/c/' + nx.id) }, 'Next ▶') : h('button', { class: 'btn mint', onclick: () => PG.go('/track/' + c.track) }, 'All missions ▶')))); if (out) resultBox.append(out);
      if (rec.badge) setTimeout(() => PG.badgeModal(rec.badge), 900);
    }
    if (track.id === 'sprout' && !free) setTimeout(() => PG.say(c.goal), 400);
    return wrap;
  }

  PG.screens.lesson = function (parts) {
    const c = PGC.byId[parts[1]];
    if (!c) return h('div', null, PG.topbar('Not found', '/'), h('div', { class: 'card' }, 'That mission does not exist.'));
    return buildLesson(c, false);
  };
  PG.screens.play = function () {
    const t = PG.track(), text = t.mode === 'text';
    const c = { id: 'free', track: t.id, unit: null, mode: text ? 'text' : 'blocks', world: 'turtle', free: true,
      goal: text ? 'Draw anything you like! Try loops and functions, then run it.' : 'Draw anything you like! Snap blocks together and press Run.',
      allowed: ['fwd', 'back', 'left', 'right', 'repeat', 'penup', 'pendown', 'color', 'width'], start: text ? '// Draw something amazing\nfor (let i = 0; i < 36; i++) {\n  color(i % 2 ? "tomato" : "dodgerblue");\n  forward(i * 4);\n  right(100);\n}\n' : '', chips: null };
    return buildLesson(c, true);
  };
})();
