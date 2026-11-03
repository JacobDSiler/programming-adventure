/* Programming Adventure - quick games: Predict It, Pattern Cracker, Bug Hunt, Binary Bits, Sort Sprint.
 * Levels 1-4 match the four tracks (Robot Pals, Block Builders, Script Squad, Dev Studio). */
(function () {
  'use strict';
  const PG = window.PG, PGC = window.PGC, PGE = window.PGE, h = PG.h, rand = PG.rand, pick = PG.pick, shuffle = PG.shuffle;
  const LEVELS = ['sprout', 'blocks', 'script', 'dev'], LEVEL_NAMES = ['Robot Pals', 'Block Builders', 'Script Squad', 'Dev Studio'];
  const starsFor = (right, total) => right >= total ? 3 : right >= total - 1 ? 2 : 1;
  const run = code => { const r = PGE.runSync({ world: 'console', code, noWorker: true }); return r.ok ? r.logs.join(' ') : 'error'; };

  /* ---------- multiple-choice frame ---------- */
  function mcq(gen, rounds) {
    return function (level, body, done) {
      let i = 0, right = 0;
      function next() {
        if (i >= rounds) { done(starsFor(right, rounds), right + ' of ' + rounds + ' right'); return; }
        const q = gen(level); i++;
        body.innerHTML = '';
        const opts = h('div', { class: 'opts' }), fb = h('div'), card = h('div', { class: 'card' });
        card.append(h('div', { class: 'small muted' }, 'Question ' + i + ' of ' + rounds), h('h3', { class: 'mt8' }, q.title || ''));
        if (q.code) card.append(h('pre', { class: 'codeview' }, q.code));
        card.append(h('p', { class: 'goal mt8' }, q.q), opts, fb);
        let locked = false;
        q.options.forEach((o, k) => {
          const b = h('button', { class: 'opt', onclick: () => {
            if (locked) return; locked = true;
            const ok = k === q.answer; if (ok) right++;
            b.classList.add(ok ? 'right' : 'wrong'); opts.childNodes[q.answer].classList.add('right');
            ok ? PG.sfx.ok() : PG.sfx.bad();
            fb.append(h('p', { class: 'mt12 ' + (ok ? 'goodtxt' : 'badtxt') }, ok ? '✅ Yes! ' + (q.explain || '') : '❌ Not quite. ' + (q.explain || '')), h('button', { class: 'btn mt8', onclick: next }, i >= rounds ? 'Finish' : 'Next ▶'));
          } }, o);
          opts.append(b);
        });
        body.append(card);
      }
      next();
    };
  }
  const numOpts = (ans, extra) => {
    const set = [ans]; (extra || []).forEach(v => { if (set.indexOf(v) < 0) set.push(v); });
    let d = 1; while (set.length < 4) { [ans + d, ans - d].forEach(v => { if (set.length < 4 && v >= 0 && set.indexOf(v) < 0) set.push(v); }); d++; }
    const four = set.slice(0, 4); if (four.indexOf(ans) < 0) four[3] = ans;
    return shuffle(four);
  };
  /* Run the real code; distractors come from running mutated versions of it. */
  function codeQ(title, code, mutants, q, explain) {
    const ans = run(code), opts = [ans];
    (mutants || []).forEach(m => { const v = run(m); if (v !== 'error' && opts.indexOf(v) < 0) opts.push(v); });
    const n = Number(ans); let d = 1;
    while (opts.length < 4) { const v = isFinite(n) && ans !== '' ? String(n + (d % 2 ? d : -d)) : ans + '!'.repeat(d); if (opts.indexOf(v) < 0) opts.push(v); d++; }
    const o = shuffle(opts.slice(0, 4)); if (o.indexOf(ans) < 0) o[0] = ans;
    return { title, code, q: q || 'What does this print?', options: o, answer: o.indexOf(ans), explain: explain || 'It prints ' + ans + '.' };
  }

  /* ---------- Predict It ---------- */
  function predictGen(level) {
    if (level === 1) {
      const it = pick([['👏', 'claps'], ['🦘', 'jumps'], ['⭐', 'stars'], ['🍎', 'apples']]), n = 2 + rand(3), k = 1 + rand(3), ans = n * k;
      const o = numOpts(ans, [n + k, ans + 1, ans - 1]);
      return { title: '🔁 Repeat ' + n + ' times', code: 'repeat ' + n + ' times:\n  ' + it[0].repeat(k), q: 'How many ' + it[1] + ' in all?', options: o.map(String), answer: o.indexOf(ans), explain: n + ' × ' + k + ' = ' + ans + '.' };
    }
    if (level === 2) {
      const s0 = rand(5), n = 2 + rand(4), k = 1 + rand(3), ans = s0 + n * k, o = numOpts(ans, [s0 + (n - 1) * k, s0 + k, n * k]);
      return { title: 'Follow the blocks', code: 'x = ' + s0 + '\nrepeat ' + n + ' times:\n  x = x + ' + k + '\nsay x', q: 'What does it say?', options: o.map(String), answer: o.indexOf(ans), explain: 'Start at ' + s0 + ' and add ' + k + ', ' + n + ' times.' };
    }
    if (level === 3) {
      const N = 3 + rand(4), A = 5 + rand(20), W = 6 + rand(40), L = [2 + rand(6), 1 + rand(9), 3 + rand(5), 2 + rand(8)];
      return pick([
        () => codeQ('Loop and add', 'let total = 0;\nfor (let i = 1; i <= ' + N + '; i++) {\n  total += i;\n}\nconsole.log(total);', ['let total = 0;\nfor (let i = 1; i < ' + N + '; i++) {\n  total += i;\n}\nconsole.log(total);', 'let total = 0;\nfor (let i = 0; i <= ' + N + '; i++) {\n  total += 2;\n}\nconsole.log(total);'], null, 'It adds 1 + 2 + ... + ' + N + '.'),
        () => codeQ('Even or odd?', 'let x = ' + A + ';\nif (x % 2 === 0) {\n  x = x / 2;\n} else {\n  x = x * 3 + 1;\n}\nconsole.log(x);', ['let x = ' + A + ';\nconsole.log(x / 2);', 'let x = ' + A + ';\nconsole.log(x * 3);'], null, '% 2 === 0 asks “is it even?”.'),
        () => codeQ('Array positions', 'const a = [' + L.join(', ') + '];\nconsole.log(a[1] + a[a.length - 1]);', ['const a = [' + L.join(', ') + '];\nconsole.log(a[0] + a[a.length - 1]);', 'const a = [' + L.join(', ') + '];\nconsole.log(a[1] + a[a.length]);'], null, 'Lists start counting at 0, so a[1] is the second item.'),
        () => codeQ('Halving', 'let n = ' + W + ';\nlet steps = 0;\nwhile (n > 1) {\n  n = Math.floor(n / 2);\n  steps++;\n}\nconsole.log(steps);', ['let n = ' + W + ';\nlet steps = 0;\nwhile (n > 0) {\n  n = Math.floor(n / 2);\n  steps++;\n}\nconsole.log(steps);'], null, 'Count how many times you can halve it.'),
        () => codeQ('Text length', 'let s = "";\nfor (let i = 0; i < ' + N + '; i++) {\n  s += "ab";\n}\nconsole.log(s.length);', ['let s = "";\nfor (let i = 0; i < ' + N + '; i++) {\n  s += "a";\n}\nconsole.log(s.length);'], null, 'Each time it adds 2 letters.')
      ])();
    }
    const N = 3 + rand(5), w = pick(['code', 'robot', 'array', 'loop']), nums = [2 + rand(5), 3 + rand(6), 4 + rand(5), 5 + rand(5), 1 + rand(4)];
    return pick([
      () => codeQ('Recursion', 'function f(n) {\n  if (n === 0) return 1;\n  return 2 * f(n - 1);\n}\nconsole.log(f(' + N + '));', ['function f(n) {\n  if (n === 0) return 1;\n  return 2 + f(n - 1);\n}\nconsole.log(f(' + N + '));', 'console.log(' + N + ' * 2);'], null, 'f(n) doubles n times: 2 to the power ' + N + '.'),
      () => codeQ('Filter, map, reduce', 'const nums = [' + nums.join(', ') + '];\nconsole.log(nums.filter(n => n % 2 === 0).map(n => n * 3).reduce((a, b) => a + b, 0));', ['const nums = [' + nums.join(', ') + '];\nconsole.log(nums.filter(n => n % 2 === 1).map(n => n * 3).reduce((a, b) => a + b, 0));', 'const nums = [' + nums.join(', ') + '];\nconsole.log(nums.filter(n => n % 2 === 0).reduce((a, b) => a + b, 0));'], null, 'Keep the even numbers, triple them, add them up.'),
      () => codeQ('String tricks', 'console.log("' + w + '".split("").reverse().join("-"));', ['console.log("' + w + '".split("").join("-"));', 'console.log("' + w + '".split("").reverse().join(""));', 'console.log("' + w + '".toUpperCase().split("").join("-"));'], null, 'split makes letters, reverse flips them, join glues them with -.'),
      () => codeQ('Closure', 'function counter() {\n  let c = 0;\n  return () => ++c;\n}\nconst next = counter();\nnext();\nnext();\nconsole.log(next());', ['function counter() {\n  let c = 0;\n  return () => c++;\n}\nconst next = counter();\nnext();\nnext();\nconsole.log(next());'], null, 'The function remembers c between calls.'),
      () => codeQ('Objects', 'const o = { a: ' + N + ', b: 2 };\no.c = o.a + o.b;\nconsole.log(Object.keys(o).length, o.c);', ['const o = { a: ' + N + ', b: 2 };\no.c = o.a * o.b;\nconsole.log(Object.keys(o).length, o.c);'], null, 'Three keys now: a, b and c.')
    ])();
  }

  /* ---------- Pattern Cracker ---------- */
  function patternGen(level) {
    if (level === 1) {
      const sets = [['🔴', '🔵'], ['🍎', '🍌', '🍇'], ['⭐', '🌙'], ['🐱', '🐶', '🐰']], em = pick(sets).slice();
      const unit = pick([[0, 1], [0, 0, 1], [0, 1, 2]]).map(i => em[i % em.length]);
      const seq = []; for (let i = 0; i < 7; i++) seq.push(unit[i % unit.length]);
      const ans = unit[7 % unit.length], opts = shuffle(Array.from(new Set(em.concat([ans]))));
      while (opts.length < 3) opts.push(pick(['🟢', '🟡', '🟣']));
      return { title: 'What comes next?', code: seq.join(' ') + '  ❓', q: 'Pick the next one.', options: opts, answer: opts.indexOf(ans), explain: 'The pattern repeats: ' + unit.join(' ') + '.' };
    }
    let seq, ans, why;
    if (level === 2) { const s0 = 1 + rand(9), d = 2 + rand(5); seq = Array.from({ length: 5 }, (_, i) => s0 + i * d); ans = s0 + 5 * d; why = 'It goes up by ' + d + ' each time.'; }
    else if (level === 3) {
      const k = rand(4);
      if (k === 0) { const s0 = 2 + rand(5), d = 3 + rand(7); seq = Array.from({ length: 5 }, (_, i) => s0 + i * d); ans = s0 + 5 * d; why = 'Add ' + d + ' each time.'; }
      else if (k === 1) { const m = 2 + rand(2); seq = Array.from({ length: 5 }, (_, i) => Math.pow(m, i + 1)); ans = Math.pow(m, 6); why = 'Multiply by ' + m + ' each time.'; }
      else if (k === 2) { seq = [1, 2, 3, 4, 5].map(i => i * i); ans = 36; why = 'Square numbers: 1×1, 2×2, 3×3...'; }
      else { const s0 = 1 + rand(4); seq = [s0]; for (let i = 1; i < 5; i++) seq.push(seq[i - 1] + i + 1); ans = seq[4] + 6; why = 'The jump grows: +2, +3, +4, +5, +6.'; }
    } else {
      const k = rand(5);
      if (k === 0) { seq = [1, 1, 2, 3, 5, 8]; ans = 13; why = 'Fibonacci: add the last two.'; }
      else if (k === 1) { seq = [2, 3, 5, 7, 11, 13]; ans = 17; why = 'The prime numbers.'; }
      else if (k === 2) { seq = [1, 3, 6, 10, 15, 21]; ans = 28; why = 'Triangular numbers: +2, +3, +4, +5, +6, +7.'; }
      else if (k === 3) { seq = [1, 2, 4, 8, 16, 32]; ans = 64; why = 'Powers of two. Binary place values!'; }
      else { const a = 2 + rand(4); seq = [a]; for (let i = 1; i < 6; i++) seq.push(i % 2 ? seq[i - 1] * 2 : seq[i - 1] + 1); ans = seq[5] + 1; why = 'Alternate: double, add 1, double, add 1...'; }
    }
    const o = numOpts(ans, [ans + 1, ans - 1, ans + 2]);
    return { title: 'What comes next?', code: seq.join(', ') + ', ❓', q: 'Which number goes next?', options: o.map(String), answer: o.indexOf(ans), explain: why };
  }

  /* ---------- Bug Hunt (tap the buggy line) ---------- */
  const BUGS = [
    [ // level 1: a silly step
      { title: 'Brush your teeth', lines: ['Pick up the toothbrush', 'Put toothpaste on it', 'Brush your teeth', 'Eat the toothbrush'], bug: 3, why: 'We never eat the toothbrush!' },
      { title: 'Get dressed', lines: ['Put on your socks', 'Put on your shoes', 'Tie the laces', 'Put your socks on over your shoes'], bug: 3, why: 'Socks go on BEFORE shoes.' },
      { title: 'Make toast', lines: ['Put bread in the toaster', 'Press the lever', 'Wait for the pop', 'Put the toast back in the toaster'], bug: 3, why: 'The toast is done. Time to eat!' },
      { title: 'Plant a seed', lines: ['Dig a small hole', 'Put the seed in', 'Cover it with soil', 'Take the seed out again'], bug: 3, why: 'The seed needs to stay in the soil.' },
      { title: 'Cross the road', lines: ['Stop at the kerb', 'Look both ways', 'Cross when it is safe', 'Run across with your eyes shut'], bug: 3, why: 'Always keep your eyes open and stay safe!' }
    ],
    [ // level 2: block pseudo-code
      { title: 'Draw a square', lines: ['repeat 4 times:', '  forward 80', '  turn right 45'], bug: 2, why: 'A square needs 90 degree turns.' },
      { title: 'Count to 5', lines: ['x = 1', 'repeat 5 times:', '  say x', '  x = x + 2'], bug: 3, why: 'Add 1 to count 1, 2, 3, 4, 5.' },
      { title: 'Go to the flag', lines: ['while not at flag:', '  if wall ahead:', '    turn right', '  else:', '    turn right'], bug: 4, why: 'When there is no wall, the robot should move forward.' },
      { title: 'Three stars', lines: ['repeat 3 times:', '  draw a star', '  clear the screen'], bug: 2, why: 'Clearing the screen erases the star you just drew.' },
      { title: 'Hello 4 times', lines: ['repeat 4 times:', 'say hello'], bug: 1, why: '“say hello” is not inside the repeat, so it only happens once.' }
    ],
    [ // level 3: JavaScript
      { title: 'Add 1 to 5', lines: ['let total = 0;', 'for (let i = 1; i <= 5; i++) {', '  total = i;', '}', 'console.log(total);'], bug: 2, why: 'total = i replaces the total. Use total += i.' },
      { title: 'Double it', lines: ['function double(n) {', '  n * 2;', '}', 'console.log(double(4));'], bug: 1, why: 'There is no return, so it gives back undefined.' },
      { title: 'Compare names', lines: ['let name = "Ada";', 'if (name = "Bo") {', '  console.log("Hi Bo");', '}'], bug: 1, why: 'One = assigns. Use === to compare.' },
      { title: 'Print a list', lines: ['const list = [10, 20, 30];', 'for (let i = 0; i <= list.length; i++) {', '  console.log(list[i]);', '}'], bug: 1, why: 'It runs one time too many. Use i < list.length.' },
      { title: 'Countdown', lines: ['let x = 5;', 'while (x > 0) {', '  console.log(x);', '  x++;', '}'], bug: 3, why: 'x++ makes x bigger forever. Use x-- to count down.' },
      { title: 'Even or not', lines: ['function isEven(n) {', '  return n % 2 === 1;', '}'], bug: 1, why: 'Even numbers leave remainder 0, not 1.' },
      { title: 'Shout it', lines: ['let s = "hello";', 's.toUpperCase();', 'console.log(s);'], bug: 1, why: 'Strings never change in place. Use s = s.toUpperCase().' }
    ],
    [ // level 4: dev
      { title: 'Factorial', lines: ['function factorial(n) {', '  return n * factorial(n - 1);', '}'], bug: 1, why: 'No base case, so it calls itself forever. Add if (n <= 1) return 1.' },
      { title: 'Sum a list', lines: ['function sumList(list) {', '  let total;', '  for (const x of list) total += x;', '  return total;', '}'], bug: 1, why: 'total starts as undefined, so the answer is NaN. Start at 0.' },
      { title: 'Find the biggest', lines: ['function findMax(list) {', '  let max = 0;', '  for (const x of list) if (x > max) max = x;', '  return max;', '}'], bug: 1, why: 'If every number is negative, 0 wins wrongly. Start with list[0].' },
      { title: 'Binary search', lines: ['function search(a, t) {', '  let lo = 0, hi = a.length - 1;', '  while (lo < hi) {', '    const mid = Math.floor((lo + hi) / 2);', '    if (a[mid] === t) return mid;', '    if (a[mid] < t) lo = mid + 1; else hi = mid - 1;', '  }', '  return -1;', '}'], bug: 2, why: 'lo < hi skips one-item ranges. It must be lo <= hi.' },
      { title: 'Copy a list', lines: ['const copy = original;', 'copy.push("new");', '// we hope original is unchanged'], bug: 0, why: 'This does not copy: both names point at the same list. Use original.slice().' },
      { title: 'Delayed prints', lines: ['for (var i = 0; i < 3; i++) {', '  setTimeout(() => console.log(i), 0);', '}', '// we want 0 1 2'], bug: 0, why: 'var is shared by every callback, so it prints 3 three times. Use let.' },
      { title: 'Add numbers', lines: ['function add(a, b) {', '  return a + b;', '}', 'console.log(add("2", 3));  // we want 5'], bug: 3, why: '"2" is text, so + joins them into "23". Convert with Number("2").' }
    ]
  ];
  PG.BUGS = BUGS;
  function bugGame(level, body, done) {
    const bank = shuffle(BUGS[level - 1]).slice(0, 5), rounds = bank.length; let i = 0, right = 0;
    (function next() {
      if (i >= rounds) { done(starsFor(right, rounds), right + ' of ' + rounds + ' found'); return; }
      const q = bank[i++]; body.innerHTML = '';
      const card = h('div', { class: 'card' }), fb = h('div'); let locked = false;
      card.append(h('div', { class: 'small muted' }, 'Puzzle ' + i + ' of ' + rounds), h('h3', { class: 'mt8' }, '🐛 ' + q.title), h('p', { class: 'goal mt8' }, level === 1 ? 'One step is silly. Tap it!' : 'One line has a bug. Tap it!'));
      const box = h('div', { class: 'buglines' });
      q.lines.forEach((ln, k) => box.append(h('button', { class: 'bugline', onclick: e => {
        if (locked) return; locked = true; const ok = k === q.bug; if (ok) right++;
        e.currentTarget.classList.add(ok ? 'right' : 'wrong'); box.childNodes[q.bug].classList.add('right'); ok ? PG.sfx.ok() : PG.sfx.bad();
        fb.append(h('p', { class: 'mt12 ' + (ok ? 'goodtxt' : 'badtxt') }, (ok ? '✅ Bug squashed! ' : '❌ The bug was the highlighted line. ') + q.why), h('button', { class: 'btn mt8', onclick: next }, i >= rounds ? 'Finish' : 'Next ▶'));
      } }, h('span', { class: 'ln' }, k + 1), h('code', null, ln))));
      card.append(box, fb); body.append(card);
    })();
  }

  /* ---------- Binary Bits ---------- */
  function binaryGame(level, body, done) {
    const bits = [3, 4, 6, 8][level - 1], rounds = 5, max = Math.pow(2, bits) - 1; let i = 0, wrong = 0;
    (function next() {
      if (i >= rounds) { done(wrong <= 1 ? 3 : wrong <= 4 ? 2 : 1, wrong + ' wrong check' + (wrong === 1 ? '' : 's')); return; }
      i++; body.innerHTML = '';
      const target = 1 + rand(max), card = h('div', { class: 'card center' }), fb = h('div');
      card.append(h('div', { class: 'small muted' }, 'Number ' + i + ' of ' + rounds));
      if (level >= 2 && i % 2 === 0) {
        // read binary -> pick the decimal
        const bin = target.toString(2).padStart(bits, '0'), o = numOpts(target, [target + 1, target - 1, parseInt(bin.split('').reverse().join(''), 2)]).map(String); let locked = false;
        card.append(h('h3', { class: 'mt8' }, 'Read the bits'), h('div', { class: 'bigbin' }, bin), h('p', { class: 'goal' }, 'Which number is this in binary?'));
        const opts = h('div', { class: 'opts' });
        o.forEach(v => opts.append(h('button', { class: 'opt', onclick: e => {
          if (locked) return; locked = true; const ok = Number(v) === target; if (!ok) wrong++;
          e.currentTarget.classList.add(ok ? 'right' : 'wrong'); ok ? PG.sfx.ok() : PG.sfx.bad();
          fb.append(h('p', { class: 'mt12 ' + (ok ? 'goodtxt' : 'badtxt') }, (ok ? '✅ ' : '❌ It is ' + target + '. ') + 'Add the place values that have a 1.'), h('button', { class: 'btn mt8', onclick: next }, i >= rounds ? 'Finish' : 'Next ▶'));
        } }, v)));
        card.append(opts, fb); body.append(card); return;
      }
      const state = Array(bits).fill(0), sum = h('div', { class: 'sumline' });
      const vals = state.map((_, k) => Math.pow(2, bits - 1 - k)), row = h('div', { class: 'bitrow' });
      const total = () => state.reduce((a, b, k) => a + b * vals[k], 0);
      const upd = () => { sum.textContent = vals.map((v, k) => state[k] ? v : null).filter(v => v != null).join(' + ') || '0'; sum.textContent += ' = ' + total(); };
      vals.forEach((v, k) => { const b = h('button', { class: 'bit', onclick: () => { state[k] = state[k] ? 0 : 1; b.classList.toggle('on', !!state[k]); b.lastChild.textContent = state[k]; upd(); PG.sfx.click(); } }, h('small', null, v), h('b', null, '0')); row.append(b); });
      card.append(h('h3', { class: 'mt8' }, 'Make the number ' + target), h('p', { class: 'muted small' }, 'Tap the bits to switch them on (1) or off (0). Each bit is worth the number above it.'), row, sum,
        h('button', { class: 'btn mint mt12', onclick: () => {
          if (total() === target) { PG.sfx.ok(); fb.innerHTML = ''; fb.append(h('p', { class: 'mt12 goodtxt' }, '✅ ' + target + ' is ' + state.join('') + ' in binary!'), h('button', { class: 'btn mt8', onclick: next }, i >= rounds ? 'Finish' : 'Next ▶')); }
          else { wrong++; PG.sfx.bad(); fb.innerHTML = ''; fb.append(h('p', { class: 'mt12 badtxt' }, '❌ That makes ' + total() + '. Try again!')); }
        } }, 'Check'), fb);
      upd(); body.append(card);
    })();
  }

  /* ---------- Sort Sprint ---------- */
  function sortGame(level, body, done) {
    const n = [4, 5, 6, 7][level - 1], rounds = 3; let r = 0, over = 0;
    (function next() {
      if (r >= rounds) { done(over === 0 ? 3 : over <= 4 ? 2 : 1, over === 0 ? 'Perfect swaps!' : over + ' extra swap' + (over === 1 ? '' : 's')); return; }
      r++; body.innerHTML = '';
      let arr; do { const pool = Array.from({ length: level === 1 ? 9 : 40 }, (_, k) => k + 1); arr = shuffle(pool).slice(0, n); } while (arr.every((v, k) => k === 0 || arr[k - 1] < v));
      let inv = 0; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (arr[a] > arr[b]) inv++;
      let sel = -1, swaps = 0; const row = h('div', { class: 'cardrow' }), info = h('div', { class: 'sumline' }), fb = h('div'), mx = Math.max.apply(null, arr);
      const sorted = () => arr.every((v, k) => k === 0 || arr[k - 1] < v);
      function draw() {
        row.innerHTML = '';
        arr.forEach((v, k) => row.append(h('button', { class: 'sortcard' + (k === sel ? ' sel' : ''), style: { '--hgt': (30 + Math.round(70 * v / mx)) + 'px' }, onclick: () => tap(k) }, h('i'), h('b', null, v))));
        info.textContent = 'Swaps so far: ' + swaps + '  ·  Fewest possible: ' + inv;
      }
      function tap(k) {
        if (sorted()) return;
        if (sel < 0) { sel = k; draw(); PG.sfx.click(); return; }
        if (Math.abs(sel - k) === 1) { const t = arr[sel]; arr[sel] = arr[k]; arr[k] = t; swaps++; sel = -1; PG.sfx.step(); draw(); if (sorted()) finish(); }
        else { sel = k === sel ? -1 : k; draw(); }
      }
      function finish() {
        const extra = Math.max(0, swaps - inv); over += extra; PG.sfx.ok();
        fb.append(h('p', { class: 'mt12 goodtxt' }, '✅ Sorted in ' + swaps + ' swaps!' + (extra ? ' The fewest possible is ' + inv + '.' : ' That is the fewest possible!') + (level >= 3 ? ' You just did a bubble sort by hand.' : '')), h('button', { class: 'btn mt8', onclick: next }, r >= rounds ? 'Finish' : 'Next ▶'));
      }
      body.append(h('div', { class: 'card center' }, h('div', { class: 'small muted' }, 'Round ' + r + ' of ' + rounds), h('h3', { class: 'mt8' }, 'Sort smallest to biggest'), h('p', { class: 'muted small' }, 'Tap a card, then tap its neighbour to swap them.'), row, info, fb));
      draw();
    })();
  }

  /* ---------- registry + screens ---------- */
  const GAMES = [
    { id: 'predict', emoji: '🔮', title: 'Predict It', desc: 'Read the code. What will it do?', run: mcq(predictGen, 5) },
    { id: 'pattern', emoji: '🧩', title: 'Pattern Cracker', desc: 'Spot the pattern. What comes next?', run: mcq(patternGen, 5) },
    { id: 'bug', emoji: '🐛', title: 'Bug Hunt', desc: 'Find the line with the bug.', run: bugGame },
    { id: 'binary', emoji: '💾', title: 'Binary Bits', desc: 'Count like a computer: 1s and 0s.', run: binaryGame },
    { id: 'sort', emoji: '🃏', title: 'Sort Sprint', desc: 'Sort the cards with the fewest swaps.', run: sortGame }
  ];
  PG.GAMES = GAMES; PG.predictGen = predictGen; PG.patternGen = patternGen;
  const levelFor = () => Math.max(1, LEVELS.indexOf((PG.P() || {}).band) + 1);

  PG.screens.games = function () {
    const wrap = h('div', null, PG.topbar('🎮 Games', '/', PG.starPill())), pr = PG.PR(), lvl = levelFor();
    wrap.append(h('p', { class: 'muted small mt8' }, 'Five-round puzzles. Your level: ' + LEVEL_NAMES[lvl - 1] + '. You can change it inside each game.'));
    GAMES.forEach(g => { const best = (pr.games[g.id] || {}).stars || 0; wrap.append(h('button', { class: 'card gamecard', onclick: () => PG.go('/game/' + g.id) }, h('span', { class: 'em' }, g.emoji), h('span', { class: 'tx' }, h('b', null, g.title), h('span', { class: 'small muted' }, g.desc)), PG.starsEl(best))); });
    return wrap;
  };
  PG.screens.game = function (parts) {
    const g = GAMES.find(x => x.id === parts[1]); if (!g) return h('div', null, PG.topbar('Game', '/games'), h('div', { class: 'card' }, 'Game not found.'));
    let lvl = levelFor();
    const wrap = h('div', null, PG.topbar(g.emoji + ' ' + g.title, '/games', PG.starPill())), body = h('div', { class: 'gamebody' });
    const picker = h('div', { class: 'wrapx mt8' });
    const intro = () => {
      body.innerHTML = ''; picker.innerHTML = '';
      LEVEL_NAMES.forEach((nm, k) => picker.append(h('button', { class: 'chip btnlike' + (lvl === k + 1 ? ' on' : ''), onclick: () => { lvl = k + 1; intro(); } }, (k + 1) + ' · ' + nm)));
      body.append(h('div', { class: 'card center' }, h('div', { class: 'bigem' }, g.emoji), h('h3', null, g.title), h('p', { class: 'muted mt8' }, g.desc), h('p', { class: 'small muted mt8' }, 'Level:'), picker,
        h('button', { class: 'btn mint big mt16', onclick: () => g.run(lvl, body, finish) }, 'Play')));
    };
    const finish = (stars, summary) => {
      PG.recordGame(g.id, stars); body.innerHTML = ''; PG.confetti(); PG.sfx.win();
      body.append(h('div', { class: 'card center' }, h('div', { class: 'bigem' }, '🏆'), h('h3', null, 'Round complete!'), PG.starsEl(stars), h('p', { class: 'muted mt8' }, summary),
        h('div', { class: 'row mt16', style: { justifyContent: 'center' } }, h('button', { class: 'btn ghost', onclick: () => PG.go('/games') }, 'All games'), h('button', { class: 'btn mint', onclick: () => g.run(lvl, body, finish) }, 'Play again'))));
    };
    wrap.append(body); intro(); return wrap;
  };
})();
