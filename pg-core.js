/* Programming Adventure - core: helpers, storage, progress, sync, router, main screens.
 * Plain JS, no build step. Engine: pg-engine.js. Curriculum: pg-content.js. Lesson UI: pg-ui.js. Games: pg-games.js. Parents: pg-parent.js. */
(function () {
  'use strict';
  const PG = window.PG = window.PG || {};
  const PGC = window.PGC, PGE = window.PGE;
  PG.screens = PG.screens || {}; PG.VERSION = '1.0.0';

  /* ================= DOM helpers ================= */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function applyProps(el, props) {
    if (!props) return;
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.slice(0, 2) === '--') el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value') el.value = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  function kids(el, list) { for (const c of list.flat(Infinity)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); } }
  const h = PG.h = (tag, props, ...list) => { const el = document.createElement(tag); applyProps(el, props); kids(el, list); return el; };
  const s = PG.s = (tag, props, ...list) => { const el = document.createElementNS(SVGNS, tag); applyProps(el, props); kids(el, list); return el; };
  const $ = PG.$ = (sel, root) => (root || document).querySelector(sel);
  PG.rand = n => Math.floor(Math.random() * n);
  PG.pick = a => a[Math.floor(Math.random() * a.length)];
  PG.shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  PG.sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ================= cleanup registry ================= */
  let cleanups = [];
  PG.onLeave = fn => { cleanups.push(fn); };
  PG.cleanup = () => { const c = cleanups; cleanups = []; c.forEach(fn => { try { fn(); } catch (e) { } }); try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } };

  /* ================= storage ================= */
  const KEY = 'pg_v1', CKEY = 'pg_code_v1';
  const defaults = () => ({ v: 1, profiles: [], cur: null, prog: {}, pin: '', fam: '', famPin: '', sound: true, tts: true });
  function load() { try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return defaults(); } }
  let D = load();
  PG.D = () => D;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { } scheduleSync(); }
  PG.save = save;
  PG.code = {
    get(pid, cid) { try { return ((JSON.parse(localStorage.getItem(CKEY)) || {})[pid] || {})[cid] || null; } catch (e) { return null; } },
    put(pid, cid, v) { try { const o = JSON.parse(localStorage.getItem(CKEY)) || {}; (o[pid] = o[pid] || {})[cid] = v; localStorage.setItem(CKEY, JSON.stringify(o)); } catch (e) { } },
    clear(pid, cid) { try { const o = JSON.parse(localStorage.getItem(CKEY)) || {}; if (o[pid]) { delete o[pid][cid]; localStorage.setItem(CKEY, JSON.stringify(o)); } } catch (e) { } }
  };

  /* ================= sound + speech ================= */
  let ac = null;
  PG.ac = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { } return ac; };
  function tone(f, t, d, type, v) {
    const a = PG.ac(); if (!a) return;
    try {
      const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(v || 0.1, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + d);
      o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + d + 0.02);
    } catch (e) { }
  }
  const snd = fn => () => { if (D.sound) fn(); };
  PG.sfx = {
    ok: snd(() => { tone(660, 0, .12, 'triangle'); tone(880, .1, .18, 'triangle'); }),
    bad: snd(() => { tone(220, 0, .22, 'sawtooth', .07); }),
    click: snd(() => tone(520, 0, .05, 'square', .04)),
    step: snd(() => tone(330, 0, .06, 'triangle', .06)),
    star: snd(() => { tone(880, 0, .1, 'sine'); tone(1320, .08, .16, 'sine'); }),
    win: snd(() => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .1, .22, 'triangle')); })
  };
  PG.say = function (text) {
    if (!D.tts) return;
    try {
      if (!window.speechSynthesis) return; speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[^\w\s,.!?'’-]/g, ' ')); u.rate = .9; u.lang = 'en-GB'; speechSynthesis.speak(u);
    } catch (e) { }
  };

  /* ================= profiles + progress ================= */
  PG.GRADES = [['PS', 'Preschool (3)'], ['PK', 'Pre-K (4)'], ['K', 'Kindergarten'], ['1', '1st grade'], ['2', '2nd grade'], ['3', '3rd grade'], ['4', '4th grade'], ['5', '5th grade'], ['6', '6th grade'], ['7', '7th grade'], ['8', '8th grade'], ['9', '9th grade'], ['10', '10th grade'], ['11', '11th grade'], ['12', '12th grade'], ['AD', 'Adult']];
  PG.AVATARS = ['🦊', '🐱', '🐶', '🦉', '🐢', '🦋', '🌟', '🤖', '🌈', '🐸', '🦄', '🐼', '🐙', '🦁', '🐧', '🌻', '🐳', '🎨', '🐝', '🦜'];
  PG.bandOf = gradeId => PGC.trackFor(gradeId);
  PG.P = () => D.profiles.find(p => p.id === D.cur) || null;
  PG.track = () => PGC.track((PG.P() || {}).band || 'blocks');
  const emptyPR = () => ({ ch: {}, badges: {}, games: {}, missions: {} });
  function PR(pid) { pid = pid || D.cur; if (!pid) return null; const p = D.prog[pid] || (D.prog[pid] = emptyPR()); p.ch = p.ch || {}; p.badges = p.badges || {}; p.games = p.games || {}; p.missions = p.missions || {}; return p; }
  PG.PR = PR; PG.emptyPR = emptyPR;
  PG.stars = (cid, pid) => ((PR(pid) || { ch: {} }).ch[cid] || {}).stars || 0;
  PG.totalStars = pid => { const pr = PR(pid); if (!pr) return 0; let n = 0; for (const k in pr.ch) n += pr.ch[k].stars || 0; for (const k in pr.games) n += pr.games[k].stars || 0; return n; };
  PG.unitStatus = (u, pid) => { const pr = PR(pid) || emptyPR(); const done = u.challenges.filter(c => (pr.ch[c.id] || {}).stars > 0).length; return { done, total: u.challenges.length, badge: !!pr.badges[u.id], stars: u.challenges.reduce((a, c) => a + ((pr.ch[c.id] || {}).stars || 0), 0) }; };
  PG.trackStatus = (t, pid) => { let done = 0, total = 0; t.units.forEach(u => { const st = PG.unitStatus(u, pid); done += st.done; total += st.total; }); return { done, total, pct: total ? Math.round(done * 100 / total) : 0 }; };
  PG.recordChallenge = function (cid, stars) {
    const pr = PR(); if (!pr) return {};
    const old = pr.ch[cid] || {}, first = !old.stars;
    pr.ch[cid] = { stars: Math.max(old.stars || 0, stars), tries: (old.tries || 0) + 1, at: Date.now() };
    const u = PGC.unitById(PGC.unitOfChallenge[cid]); let badge = null;
    if (u && !pr.badges[u.id] && PG.unitStatus(u).done === u.challenges.length) { pr.badges[u.id] = Date.now(); badge = u; }
    save(); return { first, badge };
  };
  PG.recordGame = function (gameId, stars, extra) {
    const pr = PR(); if (!pr) return;
    const old = pr.games[gameId] || { stars: 0, plays: 0 };
    pr.games[gameId] = Object.assign({}, old, extra || {}, { stars: Math.max(old.stars || 0, stars), plays: (old.plays || 0) + 1, at: Date.now() });
    save();
  };
  PG.toggleMission = function (key) { const pr = PR(); if (!pr) return false; if (pr.missions[key]) delete pr.missions[key]; else pr.missions[key] = Date.now(); save(); return !!pr.missions[key]; };

  /* ================= overlays ================= */
  let modalEl = null;
  PG.closeModal = () => { if (modalEl) { modalEl.remove(); modalEl = null; } };
  PG.modal = function (content, opts) {
    PG.closeModal();
    modalEl = h('div', { class: 'modal', onclick: e => { if (e.target === modalEl && opts && opts.dismiss) PG.closeModal(); } }, h('div', { class: 'box' }, content));
    document.body.append(modalEl); return modalEl;
  };
  PG.toast = function (msg) { const t = h('div', { class: 'toast' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2400); };
  PG.confetti = function () {
    const cols = ['#F5B83D', '#12B58C', '#F2645A', '#7A5AF8', '#2F7DE1', '#E0529C'];
    for (let i = 0; i < 40; i++) { const c = h('i', { class: 'confetti', style: { left: Math.random() * 100 + 'vw', background: cols[i % cols.length], animationDelay: (Math.random() * .6) + 's', animationDuration: (2 + Math.random() * 1.6) + 's' } }); document.body.append(c); setTimeout(() => c.remove(), 4200); }
  };
  PG.starsEl = (n, max) => { max = max || 3; const el = h('span', { class: 'stars' }); for (let i = 0; i < max; i++) el.append(h('span', { class: i < n ? '' : 'off' }, '⭐')); return el; };
  PG.badgeModal = function (u) {
    PG.confetti(); PG.sfx.win();
    PG.modal(h('div', null, h('div', { class: 'bigem' }, u.badge.emoji), h('h2', null, 'Badge earned!'),
      h('p', { class: 'mt8', style: { fontWeight: 800, fontSize: '1.2rem' } }, u.badge.name), h('p', { class: 'muted mt8' }, 'You finished “' + u.title + '”.'),
      h('div', { class: 'row mt16', style: { justifyContent: 'center' } }, h('button', { class: 'btn mint', onclick: () => PG.closeModal() }, 'Hooray! 🎉'))));
  };

  /* ================= cloud sync (optional; the app works offline) ================= */
  PG.FIREBASE = {
    apiKey: 'AIzaSyCxqGRhdCyh92LyiFvrTi6ETTiFKVhDvUM', authDomain: 'homeschool-math.firebaseapp.com', projectId: 'homeschool-math',
    storageBucket: 'homeschool-math.firebasestorage.app', messagingSenderId: '275309549483', appId: '1:275309549483:web:3c118499f22eb23e6f24ee'
  };
  let fbP = null;
  function fb() {
    if (fbP) return fbP;
    fbP = (async () => {
      try {
        const app = await import('https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js');
        const fs = await import('https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js');
        const a = app.getApps().length ? app.getApp() : app.initializeApp(PG.FIREBASE);
        return { fs, db: fs.getFirestore(a) };
      } catch (e) { console.warn('Firebase unavailable', e); fbP = null; return null; }
    })();
    return fbP;
  }
  function mergeProg(a, b) {
    const out = Object.assign({}, a);
    for (const pid of Object.keys(b || {})) {
      const x = out[pid] || emptyPR(), y = b[pid] || {};
      const m = { ch: Object.assign({}, x.ch), badges: Object.assign({}, y.badges || {}, x.badges), games: Object.assign({}, x.games || {}), missions: Object.assign({}, y.missions || {}, x.missions) };
      for (const k in (y.ch || {})) { const c = m.ch[k]; if (!c || (y.ch[k].stars || 0) > (c.stars || 0)) m.ch[k] = y.ch[k]; }
      for (const k in (y.games || {})) { const c = m.games[k]; if (!c || (y.games[k].stars || 0) > (c.stars || 0) || ((y.games[k].stars || 0) === (c.stars || 0) && (y.games[k].plays || 0) > (c.plays || 0))) m.games[k] = y.games[k]; }
      out[pid] = m;
    }
    return out;
  }
  PG.mergeProg = mergeProg;
  async function cloudPull() {
    if (!D.fam) return false; const f = await fb(); if (!f) return false;
    try {
      const snap = await f.fs.getDoc(f.fs.doc(f.db, 'families', D.fam + '_pg'));
      if (snap.exists()) { D.prog = mergeProg(D.prog, snap.data().prog || {}); try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { } }
      return true;
    } catch (e) { console.warn('pull failed', e); return false; }
  }
  async function cloudPush() {
    if (!D.fam) return false; const f = await fb(); if (!f) return false;
    try { await cloudPull(); await f.fs.setDoc(f.fs.doc(f.db, 'families', D.fam + '_pg'), { app: 'programming-adventure', prog: D.prog, ts: Date.now() }, { merge: false }); return true; }
    catch (e) { console.warn('push failed', e); return false; }
  }
  let syncT = null;
  function scheduleSync() { if (!D.fam) return; clearTimeout(syncT); syncT = setTimeout(cloudPush, 2500); }
  PG.syncNow = cloudPush;
  PG.fmtFam = v => { v = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return v.length > 2 ? v.slice(0, 2) + '-' + v.slice(2, 6) : v; };
  PG.managed = () => { try { return sessionStorage.getItem('pg_harbor_managed') === '1'; } catch (e) { return false; } };
  PG.joinFamily = async function (code, mirror) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length === 6) code = code.slice(0, 2) + '-' + code.slice(2);
    if (!/^[A-Z]{2}-[A-Z0-9]{4}$/.test(code)) return { ok: false, msg: 'That code does not look right (' + (code || 'empty') + '). A family code looks like MA-AB12.' };
    const f = await fb(); if (!f) return { ok: false, msg: 'Could not reach the cloud. Check the internet and try again.' };
    try {
      const snap = await f.fs.getDoc(f.fs.doc(f.db, 'families', code));
      if (!snap.exists()) return { ok: false, msg: 'No family found with that code.' };
      const fam = snap.data(); let added = 0;
      for (const p of (fam.profiles || [])) {
        const id = String(p.id), ex = D.profiles.find(x => x.id === id);
        if (!ex) { D.profiles.push({ id, name: p.name || 'Explorer', avatar: p.avatar || '🌟', gradeId: p.gradeId || '3', band: PG.bandOf(p.gradeId) }); added++; }
        else if (mirror) { ex.name = p.name || ex.name; ex.avatar = p.avatar || ex.avatar; if (p.gradeId) { ex.gradeId = p.gradeId; ex.band = PG.bandOf(p.gradeId); } }
      }
      if (mirror && (fam.profiles || []).length) {
        const ids = new Set((fam.profiles || []).map(p => String(p.id)));
        D.profiles.forEach(x => {
          if (ids.has(x.id) || !D.prog || !D.prog[x.id]) return;
          const m = (fam.profiles || []).find(p => String(p.name || '').trim().toLowerCase() === String(x.name || '').trim().toLowerCase());
          if (m) D.prog = mergeProg(D.prog, { [String(m.id)]: D.prog[x.id] });
        });
        D.profiles = D.profiles.filter(x => ids.has(x.id));
        if (!D.profiles.some(x => x.id === D.cur)) D.cur = D.profiles[0] ? D.profiles[0].id : null;
      }
      D.fam = code; D.famPin = fam.parentPin || '';
      if (!D.cur && D.profiles.length) D.cur = D.profiles[0].id;
      save(); await cloudPull(); save();
      return { ok: true, msg: added ? 'Joined! Added ' + added + ' coder' + (added > 1 ? 's' : '') + '.' : 'Joined! Progress synced.', added };
    } catch (e) { return { ok: false, msg: 'Something went wrong joining. Try again.' }; }
  };
  PG.leaveFamily = () => { D.fam = ''; D.famPin = ''; save(); };

  /* ================= router ================= */
  PG.go = path => { if (location.hash === '#' + path) render(); else location.hash = '#' + path; };
  PG.back = fallback => { if (history.length > 1) history.back(); else PG.go(fallback || '/'); };
  function seg() { const raw = (location.hash.slice(1) || '/'); const [path, qs] = raw.split('?'); return { parts: path.split('/').filter(Boolean), qs: new URLSearchParams(qs || '') }; }
  PG.seg = seg;
  const NAV = [['/', '🏠', 'Home'], ['/games', '🎮', 'Games'], ['/play', '🎨', 'Free play'], ['/badges', '🏅', 'Badges'], ['/parent', '🔒', 'Parents']];
  function navBar(active) { return h('nav', { class: 'nav' }, h('div', null, NAV.map(([p, e, t]) => h('button', { class: active === p ? 'on' : '', onclick: () => PG.go(p) }, h('span', { class: 'e' }, e), t)))); }
  PG.topbar = (title, backPath, right) => h('div', { class: 'topbar' }, h('button', { class: 'iconbtn', 'aria-label': 'Back', onclick: () => backPath ? PG.go(backPath) : PG.back('/') }, '←'), h('h2', null, title), right || null);
  PG.starPill = () => h('span', { class: 'starpill' }, '⭐ ' + PG.totalStars());

  function render() {
    PG.cleanup(); PG.closeModal();
    const app = $('#app'); app.innerHTML = ''; app.style.removeProperty('--c');
    document.querySelectorAll('.nav').forEach(n => n.remove());
    window.scrollTo(0, 0);
    const { parts, qs } = seg(), r = parts[0] || '';
    if (!D.profiles.length && r !== 'welcome' && r !== 'parent') return PG.go('/welcome');
    if (D.profiles.length && !PG.P()) { D.cur = D.profiles[0].id; save(); }
    let nav = null;
    const need = (k, label) => PG.screens[k] ? PG.screens[k](parts, qs) : h('p', null, label + ' missing.');
    try {
      if (r === '') { app.append(screenHome()); nav = '/'; }
      else if (r === 'welcome') app.append(screenWelcome(qs));
      else if (r === 'who') app.append(screenWho());
      else if (r === 'track') app.append(screenTrack(parts[1]));
      else if (r === 'c') app.append(need('lesson', 'Lesson'));
      else if (r === 'play') { app.append(need('play', 'Free play')); nav = '/play'; }
      else if (r === 'badges') { app.append(screenBadges()); nav = '/badges'; }
      else if (r === 'games') { app.append(need('games', 'Games')); nav = '/games'; }
      else if (r === 'game') app.append(need('game', 'Game'));
      else if (r === 'parent') { app.append(need('parent', 'Parent area')); nav = '/parent'; }
      else { app.append(screenHome()); nav = '/'; }
    } catch (e) {
      console.error(e);
      app.append(h('div', { class: 'card' }, h('h3', null, 'Oops, something broke'), h('p', { class: 'muted mt8' }, String(e && e.message || e)), h('button', { class: 'btn mt12', onclick: () => PG.go('/') }, 'Home')));
    }
    if (nav) document.body.append(navBar(nav));
  }
  PG.render = render;

  /* ================= screens ================= */
  PG.heroArt = () => s('svg', { class: 'traces', viewBox: '0 0 400 200', preserveAspectRatio: 'xMidYMid slice' },
    [['{ }', 40, 60], ['</>', 150, 130], ['( )', 270, 50], ['=>', 330, 140], ['01', 90, 175], ['[ ]', 220, 105]].map(([t, x, y]) => s('text', { x, y, fill: '#fff', 'font-size': 30, 'font-family': 'monospace', 'font-weight': 700 }, t)));
  const dayNo = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };

  function profileForm(done) {
    let av = PG.AVATARS[PG.rand(PG.AVATARS.length)];
    const name = h('input', { class: 'inp', placeholder: 'Name', maxlength: 20 });
    const grade = h('select', { class: 'inp' }, PG.GRADES.map(([v, l]) => h('option', { value: v }, l)));
    grade.value = '3';
    const picks = h('div', { class: 'wrapx mt8' });
    const draw = () => { picks.innerHTML = ''; PG.AVATARS.forEach(a => picks.append(h('button', { class: 'av' + (a === av ? ' on' : ''), onclick: () => { av = a; draw(); } }, a))); };
    draw();
    return h('div', null, h('label', { class: 'lbl' }, 'Name'), name, h('label', { class: 'lbl' }, 'Grade'), grade, h('label', { class: 'lbl' }, 'Pick a buddy'), picks,
      h('button', { class: 'btn mint wide mt16', onclick: () => {
        const nm = name.value.trim(); if (!nm) { PG.toast('Please type a name'); return; }
        const p = { id: 'p' + Date.now().toString(36) + PG.rand(99), name: nm, avatar: av, gradeId: grade.value, band: PG.bandOf(grade.value) };
        D.profiles.push(p); D.cur = p.id; save(); done();
      } }, 'Start coding!'));
  }
  PG.profileForm = profileForm;

  function screenWelcome(qs) {
    const wrap = h('div', null);
    wrap.append(h('div', { class: 'hero' }, PG.heroArt(), h('div', { class: 'brand' }, h('div', { class: 'logo' }, '💻'), h('div', null, h('h1', null, 'Programming Adventure'), h('small', null, 'Welcome, coder!')))));
    const joinMsg = h('div', { class: 'feedback' });
    const code = h('input', { class: 'inp', placeholder: 'MA-AB12 or WA-AB12', maxlength: 7, autocapitalize: 'characters', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', value: D.fam || qs.get('family') || '', oninput: e => { e.target.value = PG.fmtFam(e.target.value); } });
    const joinBtn = h('button', { class: 'btn wide mt8', onclick: async () => {
      joinBtn.disabled = true; joinMsg.textContent = 'Joining…'; joinMsg.className = 'feedback';
      const r = await PG.joinFamily(code.value); joinBtn.disabled = false; joinMsg.textContent = r.msg; joinMsg.className = 'feedback ' + (r.ok ? 'good' : 'bad');
      if (r.ok && D.profiles.length) setTimeout(() => PG.go('/'), 800);
    } }, 'Join my family');
    wrap.append(h('div', { class: 'card', style: { marginTop: '-30px', position: 'relative' } }, h('h3', null, '🏠 I have a family code'),
      h('p', { class: 'muted small mt8' }, 'Use the same code as Math Adventure or Words Adventure. Your coders and progress come along.'), h('div', { class: 'mt8' }, code), joinBtn, joinMsg));
    wrap.append(h('div', { class: 'card' }, h('h3', null, '✨ New coder'), profileForm(() => PG.go('/'))));
    return wrap;
  }

  function screenWho() {
    const wrap = h('div', null, PG.topbar('Who is coding?', '/'));
    D.profiles.forEach(p => wrap.append(h('button', { class: 'card flat whorow' + (p.id === D.cur ? ' on' : ''), onclick: () => { D.cur = p.id; save(); PG.go('/'); } },
      h('span', { class: 'bigav' }, p.avatar), h('span', null, h('b', null, p.name), h('span', { class: 'small muted' }, ' · ' + PGC.track(p.band).emoji + ' ' + PGC.track(p.band).name)), h('span', { class: 'starpill' }, '⭐ ' + PG.totalStars(p.id)))));
    if (PG.managed()) wrap.append(h('p', { class: 'muted small mt16' }, 'Add or change coders in Harbor → Parents → Children.'));
    else wrap.append(h('div', { class: 'card mt16' }, h('h3', null, '➕ Add a coder'), profileForm(() => PG.go('/'))));
    return wrap;
  }

  function trackBar(t) { const st = PG.trackStatus(t); return h('div', { class: 'bar' }, h('i', { style: { width: st.pct + '%', background: t.color } })); }

  function screenHome() {
    const p = PG.P(), t = PGC.track(p.band), wrap = h('div', null);
    wrap.style.setProperty('--c', t.color);
    const ts = PG.trackStatus(t);
    wrap.append(h('div', { class: 'hero', style: { background: 'linear-gradient(160deg,#10263f 0%,' + t.color + ' 140%)' } }, PG.heroArt(),
      h('div', { class: 'row' }, h('div', { class: 'brand' }, h('div', { class: 'logo' }, '💻'), h('div', null, h('h1', null, 'Programming Adventure'), h('small', null, t.emoji + ' ' + t.name))),
        h('button', { class: 'who', onclick: () => PG.go('/who') }, h('span', { class: 'av' }, p.avatar), p.name)),
      h('div', { class: 'hello' }, 'Hi, ' + p.name + '!', h('span', null, '⭐ ' + PG.totalStars() + ' stars · ' + ts.done + ' of ' + ts.total + ' missions done'))));
    const next = PGC.nextChallenge(t.id, id => PG.stars(id) > 0);
    if (next) {
      const u = PGC.unitById(next.unit), started = ts.done > 0;
      wrap.append(h('button', { class: 'podcard', onclick: () => PG.go('/c/' + next.id) }, h('span', { class: 'em' }, u.emoji), h('span', { class: 'tx' }, h('small', null, started ? 'CONTINUE' : 'START HERE'), h('b', null, next.title), h('span', null, u.title)), h('span', { class: 'go' }, '▶')));
    } else wrap.append(h('div', { class: 'podcard' }, h('span', { class: 'em' }, '🎉'), h('span', { class: 'tx' }, h('small', null, 'ALL DONE'), h('b', null, 'You finished ' + t.name + '!'), h('span', null, 'Try another path below, or play games.'))));
    wrap.append(h('div', { class: 'row mt16' },
      h('button', { class: 'tile', onclick: () => PG.go('/games') }, h('span', { class: 'em' }, '🎮'), h('b', null, 'Games'), h('span', { class: 'small' }, 'Quick code puzzles')),
      h('button', { class: 'tile alt', onclick: () => PG.go('/play') }, h('span', { class: 'em' }, '🎨'), h('b', null, 'Free play'), h('span', { class: 'small' }, 'Draw with code'))));
    wrap.append(h('h3', { class: 'sec' }, t.emoji + ' Your path'));
    wrap.append(h('button', { class: 'card pathcard', onclick: () => PG.go('/track/' + t.id) }, h('div', { class: 'row' }, h('b', { style: { flex: 1 } }, t.name), h('span', { class: 'small muted' }, t.ages)), trackBar(t),
      h('div', { class: 'wrapx mt8' }, t.units.map(un => { const st = PG.unitStatus(un); return h('span', { class: 'chip' + (st.badge ? ' on' : '') }, (st.badge ? un.badge.emoji : un.emoji) + ' ' + un.title + ' ' + st.done + '/' + st.total); }))));
    const list = PGC.unplugged[t.id] || [], idx = dayNo() % list.length, key = t.id + ':' + idx, doneNow = !!PG.PR().missions[key];
    wrap.append(h('h3', { class: 'sec' }, '🌳 Off-screen quest'));
    wrap.append(h('div', { class: 'card flat' }, h('p', null, list[idx]), h('div', { class: 'row mt12' },
      h('button', { class: 'chip btnlike' + (doneNow ? ' on' : ''), onclick: e => { const on = PG.toggleMission(key); e.currentTarget.className = 'chip btnlike' + (on ? ' on' : ''); e.currentTarget.textContent = on ? '✅ Done!' : 'Mark as done'; if (on) PG.sfx.star(); } }, doneNow ? '✅ Done!' : 'Mark as done'),
      h('button', { class: 'say', 'aria-label': 'Read aloud', onclick: () => PG.say(list[idx]) }, '🔊'))));
    wrap.append(h('h3', { class: 'sec' }, '🧭 Explore other paths'));
    const others = h('div', { class: 'wrapx' });
    PGC.tracks.filter(x => x.id !== t.id).forEach(x => others.append(h('button', { class: 'chip btnlike', onclick: () => PG.go('/track/' + x.id) }, x.emoji + ' ' + x.name + ' (' + PG.trackStatus(x).pct + '%)')));
    wrap.append(others);
    return wrap;
  }

  function screenTrack(id) {
    const t = PGC.track(id) || PG.track(), wrap = h('div', null, PG.topbar(t.emoji + ' ' + t.name, '/', PG.starPill()));
    wrap.style.setProperty('--c', t.color);
    wrap.append(h('div', { class: 'card flat' }, h('p', null, t.blurb), h('p', { class: 'small muted mt8' }, t.ages), trackBar(t)));
    const nextId = (PGC.nextChallenge(t.id, c => PG.stars(c) > 0) || {}).id;
    t.units.forEach(u => {
      const st = PG.unitStatus(u);
      const grid = h('div', { class: 'chgrid' }, u.challenges.map((c, i) => h('button', { class: 'chbtn' + (PG.stars(c.id) ? ' done' : '') + (c.id === nextId ? ' next' : ''), onclick: () => PG.go('/c/' + c.id), title: c.title }, h('b', null, i + 1), PG.starsEl(PG.stars(c.id)))));
      wrap.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('span', { style: { fontSize: '1.9rem' } }, u.emoji), h('div', { style: { flex: 1 } }, h('b', null, u.title), h('div', { class: 'small muted' }, st.done + ' of ' + st.total + ' done')), h('span', { class: 'badgeico' + (st.badge ? ' got' : '') }, u.badge.emoji)),
        h('p', { class: 'small muted mt8' }, u.intro), grid));
    });
    return wrap;
  }

  function screenBadges() {
    const wrap = h('div', null, PG.topbar('🏅 Badges', '/', PG.starPill())), pr = PG.PR();
    PGC.tracks.forEach(t => {
      wrap.append(h('h3', { class: 'sec' }, t.emoji + ' ' + t.name));
      const row = h('div', { class: 'badges' });
      t.units.forEach(u => { const got = !!pr.badges[u.id]; row.append(h('div', { class: 'badgecard' + (got ? ' got' : '') }, h('div', { class: 'bigem' }, got ? u.badge.emoji : '🔒'), h('b', null, u.badge.name), h('div', { class: 'small muted' }, got ? 'Earned!' : 'Finish “' + u.title + '”'))); });
      wrap.append(row);
    });
    return wrap;
  }

  PG.start = function () {
    // Harbor hand-off: ?from=harbor&family=MA-XXXX&child=<id>&view=parent
    const q = new URLSearchParams(location.search);
    PG.fromHarbor = q.get('from') === 'harbor';
    if (PG.fromHarbor) { try { sessionStorage.setItem('pg_harbor_managed', '1'); } catch (e) { } }
    const refresh = ok => { if (ok && !document.querySelector('.modal')) { const r = seg().parts[0]; if (!r || r === 'badges') render(); } };
    const boot = async () => {
      if (q.get('family') && (q.get('family') !== D.fam || PG.fromHarbor)) await PG.joinFamily(q.get('family'), PG.fromHarbor);
      if (q.get('child') && D.profiles.some(p => p.id === q.get('child'))) { D.cur = q.get('child'); save(); }
      if (q.get('view') === 'parent' && PG.fromHarbor) { try { sessionStorage.setItem('pg_harbor_parent', '1'); } catch (e) { } location.hash = '#/parent'; }
      render(); if (D.fam) cloudPull().then(refresh);
    };
    window.addEventListener('hashchange', render);
    window.addEventListener('pointerdown', () => { try { PG.ac(); } catch (e) { } }, { once: true, capture: true });
    if (q.get('family') || q.get('child') || q.get('view')) boot(); else { render(); if (D.fam) cloudPull().then(refresh); }
  };
})();
