/* Programming Adventure - parent area: progress, weekly plan + off-screen quests, settings, about. */
(function () {
  'use strict';
  const PG = window.PG, PGC = window.PGC, h = PG.h, D = () => PG.D();
  const UNLOCK_MS = 10 * 60 * 1000;
  let tab = 'progress', sel = null;

  function unlocked() {
    try { if (PG.fromHarbor && sessionStorage.getItem('pg_harbor_parent')) return true; return Date.now() - Number(sessionStorage.getItem('pg_unlock') || 0) < UNLOCK_MS; } catch (e) { return false; }
  }
  const unlock = () => { try { sessionStorage.setItem('pg_unlock', String(Date.now())); } catch (e) { } };

  function gate() {
    const d = D(), real = d.pin || d.famPin, wrap = h('div', null, PG.topbar('🔒 Parents', '/')), msg = h('div', { class: 'feedback' });
    const inp = h('input', { class: 'inp pin', type: 'password', inputmode: 'numeric', maxlength: 4, placeholder: '••••' });
    if (!real) {
      wrap.append(h('div', { class: 'card center' }, h('div', { class: 'bigem' }, '🔑'), h('h3', null, 'Set a parent PIN'), h('p', { class: 'muted small mt8' }, 'Four digits. It keeps progress, the plan and settings for grown-ups.'), h('div', { class: 'mt12' }, inp), msg,
        h('button', { class: 'btn mint mt12', onclick: () => { if (!/^\d{4}$/.test(inp.value)) { msg.textContent = 'Please use exactly 4 digits.'; msg.className = 'feedback bad'; return; } d.pin = inp.value; PG.save(); unlock(); PG.render(); } }, 'Save PIN')));
      return wrap;
    }
    inp.addEventListener('input', () => {
      if (inp.value === d.pin || inp.value === d.famPin) { unlock(); PG.render(); }
      else if (inp.value.length === 4) { msg.textContent = 'That is not the PIN.'; msg.className = 'feedback bad'; inp.value = ''; PG.sfx.bad(); }
    });
    wrap.append(h('div', { class: 'card center' }, h('div', { class: 'bigem' }, '🔒'), h('h3', null, 'Grown-ups only'), h('p', { class: 'muted small mt8' }, 'Enter the parent PIN. If you joined a family code, the family PIN from Math Adventure also works.'), h('div', { class: 'mt12' }, inp), msg));
    setTimeout(() => inp.focus(), 50);
    return wrap;
  }

  function childPicker() {
    const d = D(); if (!sel || !d.profiles.some(p => p.id === sel)) sel = d.cur || (d.profiles[0] || {}).id;
    return h('div', { class: 'wrapx mt8' }, d.profiles.map(p => h('button', { class: 'chip btnlike' + (p.id === sel ? ' on' : ''), onclick: () => { sel = p.id; PG.render(); } }, p.avatar + ' ' + p.name)));
  }

  function progressTab() {
    const d = D(), box = h('div', null, childPicker()), p = d.profiles.find(x => x.id === sel); if (!p) return box;
    const pr = PG.PR(p.id), t = PGC.track(p.band);
    const trackSel = h('select', { class: 'inp', style: { width: 'auto', padding: '6px 10px' }, onchange: e => { p.band = e.target.value; PG.save(); PG.toast('Path changed'); PG.render(); } }, PGC.tracks.map(x => h('option', { value: x.id, selected: x.id === p.band }, x.name + ' (' + x.ages.split('·')[0].trim() + ')')));
    box.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('span', { style: { fontSize: '2.2rem' } }, p.avatar), h('div', { style: { flex: 1 } }, h('b', null, p.name), h('div', { class: 'small muted' }, '⭐ ' + PG.totalStars(p.id) + ' stars · ' + Object.keys(pr.badges).length + ' badges')), trackSel),
      h('p', { class: 'small muted mt8' }, 'Path follows the child’s grade by default. Change it any time: some children race ahead, others need a gentler start.')));
    PGC.tracks.forEach(tr => {
      const ts = PG.trackStatus(tr, p.id);
      const rows = tr.units.map(u => { const st = PG.unitStatus(u, p.id); return h('tr', null, h('td', null, u.emoji + ' ' + u.title), h('td', null, st.done + '/' + st.total), h('td', null, '⭐ ' + st.stars + '/' + st.total * 3), h('td', null, st.badge ? u.badge.emoji : '·')); });
      box.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('b', { style: { flex: 1 } }, tr.emoji + ' ' + tr.name + (tr.id === t.id ? ' (current)' : '')), h('span', { class: 'small muted' }, ts.pct + '%')),
        h('table', { class: 'tbl mt8' }, h('thead', null, h('tr', null, ['Unit', 'Done', 'Stars', 'Badge'].map(x => h('th', null, x)))), h('tbody', null, rows))));
    });
    const gs = PG.GAMES.map(g => h('span', { class: 'chip' }, g.emoji + ' ' + ((pr.games[g.id] || {}).stars || 0) + '⭐ · ' + ((pr.games[g.id] || {}).plays || 0) + ' plays'));
    box.append(h('div', { class: 'card' }, h('b', null, '🎮 Games'), h('div', { class: 'wrapx mt8' }, gs)));
    return box;
  }

  const WEEK = {
    sprout: ['Short and happy: 10 to 15 minutes, 3 or 4 times a week. Sit beside your child and let them tap.', 'Read each mission aloud if needed (the 🔊 button does it too).', 'Ask “what will the robot do next?” BEFORE pressing Run. Predicting is the skill.'],
    blocks: ['20 to 30 minutes, 3 times a week: 2 missions, 1 game.', 'Use “See the real code” once a week to connect blocks to text.', 'When stuck, ask for a plan in words first, then build it.'],
    script: ['30 minutes, 3 times a week: 2 missions, 1 game, and 1 off-screen quest each week.', 'Typing matters: letting them fix their own typos is good learning.', 'Encourage reading the error message aloud. It almost always says what is wrong.'],
    dev: ['30 to 45 minutes, 3 or 4 times a week. Hidden tests mean edge cases matter.', 'Try explaining the solution out loud afterwards (rubber-duck style).', 'Next steps beyond this app: build a small project (a quiz, a game, a to-do list) and share it.']
  };
  function planTab() {
    const d = D(), box = h('div', null, childPicker()), p = d.profiles.find(x => x.id === sel); if (!p) return box;
    const pr = PG.PR(p.id), t = PGC.track(p.band);
    box.append(h('div', { class: 'card' }, h('b', null, '📅 Suggested rhythm for ' + p.name + ' (' + t.name + ')'), h('ul', { class: 'plan mt8' }, (WEEK[t.id] || []).map(x => h('li', null, x)))));
    const items = PGC.unplugged[t.id] || [];
    box.append(h('div', { class: 'card' }, h('b', null, '🌳 Off-screen quests'), h('p', { class: 'small muted' }, 'Computer thinking without a computer. Tick them off together.'),
      h('div', { class: 'mt8' }, items.map((txt, i) => { const key = t.id + ':' + i; const on = !!pr.missions[key]; const lab = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: on ? true : null, onchange: e => { const m = PG.PR(p.id).missions; if (e.target.checked) m[key] = Date.now(); else delete m[key]; PG.save(); } }), h('span', null, txt)); return lab; }))));
    return box;
  }

  function settingsTab() {
    const d = D(), box = h('div', null);
    const tog = (label, key) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: d[key] ? true : null, onchange: e => { d[key] = e.target.checked; PG.save(); } }), h('span', null, label));
    box.append(h('div', { class: 'card' }, h('b', null, 'Sound'), tog('Sound effects', 'sound'), tog('Read-aloud button speaks missions', 'tts')));
    const msg = h('div', { class: 'feedback' });
    const code = h('input', { class: 'inp', placeholder: 'MA-AB12', maxlength: 7, value: d.fam || '', autocapitalize: 'characters', oninput: e => { e.target.value = PG.fmtFam(e.target.value); } });
    box.append(h('div', { class: 'card' }, h('b', null, '🏠 Family code'), h('p', { class: 'small muted' }, d.fam ? 'Joined ' + d.fam + '. Progress syncs when online.' : 'Join the same code as Math or Words Adventure to share coders and progress.'), h('div', { class: 'mt8' }, code),
      h('div', { class: 'row mt8' }, h('button', { class: 'btn small', onclick: async () => { msg.textContent = 'Joining…'; const r = await PG.joinFamily(code.value, true); msg.textContent = r.msg; msg.className = 'feedback ' + (r.ok ? 'good' : 'bad'); if (r.ok) setTimeout(() => PG.render(), 900); } }, d.fam ? 'Re-sync' : 'Join'),
        d.fam ? h('button', { class: 'btn ghost small', onclick: () => { PG.leaveFamily(); PG.render(); } }, 'Leave') : null), msg));
    const pin = h('input', { class: 'inp pin', type: 'password', inputmode: 'numeric', maxlength: 4, placeholder: 'New PIN' });
    box.append(h('div', { class: 'card' }, h('b', null, '🔑 Parent PIN'), h('div', { class: 'row mt8' }, pin, h('button', { class: 'btn small', onclick: () => { if (!/^\d{4}$/.test(pin.value)) { PG.toast('Use exactly 4 digits'); return; } d.pin = pin.value; PG.save(); PG.toast('PIN changed'); pin.value = ''; } }, 'Change'))));
    if (!PG.managed()) box.append(h('div', { class: 'card' }, h('b', null, '➕ Add a coder'), PG.profileForm(() => PG.render())));
    if (d.profiles.length) {
      const who = h('select', { class: 'inp' }, d.profiles.map(p => h('option', { value: p.id }, p.name)));
      box.append(h('div', { class: 'card' }, h('b', null, '🧹 Reset progress'), h('p', { class: 'small muted' }, 'Clears stars, badges and saved code for one coder on this device.'), h('div', { class: 'row mt8' }, who,
        h('button', { class: 'btn coral small', onclick: () => { const p = d.profiles.find(x => x.id === who.value); if (!p || !confirm('Reset all progress for ' + p.name + '?')) return; d.prog[p.id] = PG.emptyPR(); try { const o = JSON.parse(localStorage.getItem('pg_code_v1')) || {}; delete o[p.id]; localStorage.setItem('pg_code_v1', JSON.stringify(o)); } catch (e) { } PG.save(); PG.toast('Reset'); } }, 'Reset'))));
    }
    const ta = h('textarea', { class: 'inp', rows: 3, placeholder: 'Paste a backup here to restore' });
    box.append(h('div', { class: 'card' }, h('b', null, '💾 Backup'), h('p', { class: 'small muted' }, 'Copy your progress as text, or paste a backup to merge it back in.'),
      h('div', { class: 'row mt8' }, h('button', { class: 'btn small', onclick: () => { const txt = JSON.stringify({ profiles: d.profiles, prog: d.prog }); ta.value = txt; try { navigator.clipboard.writeText(txt); PG.toast('Copied'); } catch (e) { PG.toast('Select and copy the text'); } } }, 'Copy backup'),
        h('button', { class: 'btn ghost small', onclick: () => { try { const o = JSON.parse(ta.value); (o.profiles || []).forEach(p => { if (!d.profiles.some(x => x.id === p.id)) d.profiles.push(p); }); d.prog = PG.mergeProg(d.prog, o.prog || {}); PG.save(); PG.toast('Restored'); PG.render(); } catch (e) { PG.toast('That does not look like a backup'); } } }, 'Restore')), h('div', { class: 'mt8' }, ta)));
    return box;
  }

  function aboutTab() {
    return h('div', { class: 'card' }, h('h3', null, 'About Programming Adventure'),
      h('p', { class: 'mt8' }, 'Four paths take a child from tapping arrows at age 4 to writing tested JavaScript at 18: Robot Pals, Block Builders, Script Squad and Dev Studio. Children can wander across paths freely.'),
      h('p', { class: 'mt8' }, 'What it covers: sequencing, loops, conditions, functions, variables, arrays and objects, algorithms (searching, sorting, Euclid), recursion, debugging, binary and patterns. It is homeschool-friendly practice, not an accredited course.'),
      h('p', { class: 'mt8' }, 'Privacy: there are no accounts, ads or tracking. Code a child writes runs inside a sandbox in the browser and never leaves the device. Only stars and badges sync, and only if you join a family code.'),
      h('p', { class: 'small muted mt8' }, 'Version ' + PG.VERSION));
  }

  PG.screens.parent = function () {
    if (!unlocked()) return gate();
    const wrap = h('div', null, PG.topbar('🔒 Parents', '/'));
    const tabs = [['progress', '📈 Progress'], ['plan', '📅 Plan'], ['settings', '⚙️ Settings'], ['about', 'ℹ️ About']];
    wrap.append(h('div', { class: 'tabs' }, tabs.map(([k, l]) => h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { tab = k; PG.render(); } }, l))));
    wrap.append(tab === 'plan' ? planTab() : tab === 'settings' ? settingsTab() : tab === 'about' ? aboutTab() : progressTab());
    return wrap;
  };
})();
