/* Programming Adventure - curriculum. Pure data (no DOM). Every challenge carries a reference solution;
 * test/run-all.mjs runs all of them through the sandbox, so a level can never ship unsolvable. */
(function (root) {
  'use strict';
  const PGE = root.PGE, { F, K, L, R, Rep, If, While, Call, Up, Down } = PGE.B;
  const PGC = root.PGC = { tracks: [], byId: {}, unitOfChallenge: {}, unplugged: {}, bandTrack: {} };

  /* ---------- cheat sheets + snippet chips ---------- */
  PGC.api = {
    grid: ['forward(n)  move n squares', 'left()  turn left', 'right()  turn right', 'wallAhead()  true if a wall is in front', 'atGoal()  true on the flag', 'onStar()  true on a star'],
    gridPlus: ['wallLeft()  true if a wall is on the left', 'wallRight()  true if a wall is on the right'],
    turtle: ['forward(n)  draw forward n', 'back(n)', 'left(deg)  turn left', 'right(deg)  turn right', 'penUp() / penDown()', 'color("tomato")  pen colour', 'width(n)  pen width', 'circle(r)  draw a circle'],
    console: ['console.log(x)  print x', 'let x = 5;  make a variable', 'function f(a) { return a; }', 'for (let i = 0; i < n; i++) { }', 'if (a > b) { } else { }']
  };
  PGC.chips = {
    grid: ['forward(1);', 'left();', 'right();', 'for (let i = 0; i < 3; i++) {\n  \n}', 'while (!atGoal()) {\n  \n}', 'if (wallAhead()) {\n  \n} else {\n  \n}'],
    turtle: ['forward(50);', 'right(90);', 'left(90);', 'back(50);', 'penUp();', 'penDown();', 'color("tomato");', 'circle(30);', 'for (let i = 0; i < 4; i++) {\n  \n}'],
    console: ['console.log();', 'let x = 0;', 'function name(a) {\n  return a;\n}', 'for (let i = 0; i < 5; i++) {\n  \n}', 'if (x > 0) {\n  \n} else {\n  \n}']
  };

  /* ---------- builders ---------- */
  const T = (id, o) => { const t = Object.assign({ id, units: [] }, o); PGC.tracks.push(t); return t; };
  const U = (track, id, o) => { const u = Object.assign({ id, challenges: [] }, o); track.units.push(u); return u; };
  const C = (track, unit, o) => {
    const c = Object.assign({ track: track.id, unit: unit.id, mode: track.mode }, o);
    c.id = unit.id + '-' + (unit.challenges.length + 1);
    if (c.world === 'grid') {
      if (c.rows) c.grid = PGE.parseGrid(c.rows, c.dir);
      else { const pp = c.solPath || c.sol; c.grid = (pp.fn ? PGE.corridorFn : PGE.corridor)(pp, { dir: c.dir, stars: c.stars }); }
    }
    if (c.sol && !c.solutionCode) c.solutionCode = PGE.compile(c.sol, { grid: c.world === 'grid' });
    if (c.solutionCode) c.par = c.mode === 'blocks' && c.sol ? PGE.countBlocks(c.sol) : PGE.countLines(c.solutionCode);
    if (c.world === 'turtle') c.targetCode = c.solutionCode;
    if (c.world === 'console' && c.tests) c.fns = Array.from(new Set(c.tests.map(t => t.fn)));
    c.usesFn = !!(c.sol && c.sol.fn);
    unit.challenges.push(c); PGC.byId[c.id] = c; PGC.unitOfChallenge[c.id] = unit.id; return c;
  };
  const sol = (...main) => main;
  const withFn = (fn, ...main) => ({ main, fn });
  const X = (base, o) => Object.assign({}, base, o);

  /* =========================================================== 1. ROBOT PALS (K-1) */
  const sp = T('sprout', { name: 'Robot Pals', ages: 'K to 1st · ages 4–7', emoji: '🤖', color: '#F2645A', grades: ['PS', 'PK', 'K', '1'], mode: 'blocks', big: true,
    blurb: 'Tap the arrows to tell the robot where to go. No reading needed.' });
  let u = U(sp, 'sp1', { title: 'Go, Robot!', emoji: '🚶', badge: { name: 'Robot Driver', emoji: '🚗' }, intro: 'A program is a list of instructions. The robot does them one at a time, in order.' });
  const SF = { world: 'grid', allowed: ['fwd'], fixed: true };
  C(sp, u, X(SF, { title: 'Hello, Robot!', goal: 'Tap the arrow two times to take the robot to the flag.', sol: sol(F(), F()), dir: 1, hint: 'One tap for each square.' }));
  C(sp, u, X(SF, { title: 'A longer road', goal: 'Take the robot to the flag.', sol: sol(F(), F(), F(), F()), dir: 1, hint: 'Count the squares: 4 steps.' }));
  C(sp, u, X(SF, { title: 'Pick up the star', goal: 'Collect the star on the way to the flag.', sol: sol(F(), F(), F(), F()), dir: 1, stars: [2], hint: 'The robot picks up stars by walking over them.' }));
  C(sp, u, X(SF, { title: 'Down we go', goal: 'The robot is going down. Get the star and the flag.', sol: sol(F(), F(), F(), F()), dir: 2, stars: [2], hint: 'The robot always moves the way it is looking.' }));
  C(sp, u, X(SF, { title: 'Up and up', goal: 'Go up! Get both stars.', sol: sol(F(), F(), F()), dir: 0, stars: [1, 2], hint: 'Three steps up.' }));
  u = U(sp, 'sp2', { title: 'Turn!', emoji: '🔄', badge: { name: 'Turn Champ', emoji: '🌀' }, intro: 'The robot can turn left or right. Then it walks the new way.' });
  const ST = { world: 'grid', allowed: ['fwd', 'left', 'right'], fixed: true };
  C(sp, u, X(ST, { title: 'Turn right', goal: 'Walk, turn right, walk to the flag.', sol: sol(F(), R(), F()), dir: 1, hint: 'Forward, then the right-turn arrow, then forward.' }));
  C(sp, u, X(ST, { title: 'Turn left', goal: 'Now turn the other way: left!', sol: sol(F(), L(), F()), dir: 1, hint: 'The left arrow turns toward the robot’s left hand.' }));
  C(sp, u, X(ST, { title: 'Two and two', goal: 'Two steps, turn, two steps.', sol: sol(F(), F(), R(), F(), F()), dir: 1, hint: 'Forward, forward, turn, forward, forward.' }));
  C(sp, u, X(ST, { title: 'The U-turn road', goal: 'Follow the road around the bend.', sol: sol(F(), R(), F(), F(), R(), F()), dir: 1, hint: 'Two right turns.' }));
  C(sp, u, X(ST, { title: 'Star road', goal: 'Get both stars on the way to the flag.', sol: sol(F(), F(), R(), F(), F(), R(), F(), F()), dir: 1, stars: [2, 5], hint: 'It is a long U shape.' }));
  u = U(sp, 'sp3', { title: 'Again and again', emoji: '🔁', badge: { name: 'Loop Master', emoji: '🎡' }, intro: 'A repeat block does the same thing many times, so you tap less!' });
  const SR = { world: 'grid', allowed: ['fwd', 'left', 'right', 'repeat'], fixed: true };
  C(sp, u, X(SR, { title: 'Repeat the step', goal: 'Use a repeat block to walk 7 steps.', sol: sol(Rep(7, F())), dir: 1, hint: 'Put the forward arrow INSIDE the repeat block, then make it 7.' }));
  C(sp, u, X(SR, { title: 'Stairs', goal: 'Climb down the stairs with a repeat block.', sol: sol(Rep(3, F(), R(), F(), L()), F()), dir: 1, hint: 'The stairs pattern is: forward, turn right, forward, turn left.' }));
  C(sp, u, X(SR, { title: 'Round the corner', goal: 'Collect the stars. Repeat: forward, forward, turn.', sol: sol(Rep(3, F(), F(), R())), dir: 1, stars: [2, 4], hint: 'Repeat 3 times.' }));
  C(sp, u, X(SR, { title: 'Big square road', goal: 'A repeat inside a repeat! Walk 3, turn, three times.', sol: sol(Rep(3, Rep(3, F()), R())), dir: 1, stars: [3, 6], hint: 'Put one repeat block inside the other.' }));
  C(sp, u, X(SR, { title: 'Stairs up', goal: 'Climb up the stairs to the flag.', sol: sol(Rep(3, F(), L(), F(), R()), F()), dir: 1, stars: [2], hint: 'This time: forward, turn LEFT, forward, turn right.' }));

  /* =========================================================== 2. BLOCK BUILDERS (2-5) */
  const bl = T('blocks', { name: 'Block Builders', ages: '2nd to 5th · ages 7–11', emoji: '🧱', color: '#2F7DE1', grades: ['2', '3', '4', '5'], mode: 'blocks',
    blurb: 'Snap blocks together to steer the robot and draw with a turtle. Peek at the real code too!' });
  u = U(bl, 'bl1', { title: 'Maze Runner', emoji: '🧭', badge: { name: 'Maze Master', emoji: '🏁' }, intro: 'Blocks can have numbers. “Move forward 4” does four steps in one block.' });
  const BM = { world: 'grid', allowed: ['fwd', 'left', 'right'] };
  C(bl, u, X(BM, { title: 'Move forward 4', goal: 'Use ONE block to reach the flag.', sol: sol(F(4)), dir: 1, hint: 'Tap the + on the block to change the number.' }));
  C(bl, u, X(BM, { title: 'Around the corner', goal: 'Reach the flag.', sol: sol(F(2), R(), F(2)), dir: 1, hint: 'Forward 2, turn right, forward 2.' }));
  C(bl, u, X(BM, { title: 'The long U', goal: 'Collect both stars and reach the flag.', sol: sol(F(3), R(), F(2), R(), F(3)), dir: 1, stars: [4, 6], hint: 'Right, then right again.' }));
  C(bl, u, X(BM, { title: 'Snake path', goal: 'Slither to the flag. Grab the stars!', sol: sol(F(2), R(), F(2), L(), F(2), R(), F(1)), dir: 1, stars: [3, 5], hint: 'Watch for left and right turns.' }));
  C(bl, u, X(BM, { title: 'The long way round', goal: 'Plan it first, then build it.', sol: sol(F(3), L(), F(3), L(), F(2), R(), F(4)), dir: 1, stars: [3, 8], hint: 'Count each straight part, then the turns.' }));
  u = U(bl, 'bl2', { title: 'Loops', emoji: '🔁', badge: { name: 'Loop Legend', emoji: '🎡' }, intro: 'A loop repeats blocks. Programmers love loops because they save typing.' });
  const BL = { world: 'grid', allowed: ['fwd', 'left', 'right', 'repeat'], fixed: true };
  C(bl, u, X(BL, { title: 'Eight steps', goal: 'Move forward 8 times. Use a repeat block!', sol: sol(Rep(8, F())), dir: 1, hint: 'Forward is fixed at 1 step here, so repeat it.' }));
  C(bl, u, X(BL, { title: 'Staircase', goal: 'Climb down the staircase.', sol: sol(Rep(5, F(), R(), F(), L()), F()), dir: 1, stars: [3], hint: 'Spot the pattern that repeats: forward, right, forward, left.' }));
  C(bl, u, X(BL, { title: 'Loop in a loop', goal: 'Walk 4 steps, turn, three times.', sol: sol(Rep(3, Rep(4, F()), R())), dir: 1, stars: [4, 8], hint: 'A repeat can go INSIDE another repeat.' }));
  C(bl, u, X(BL, { title: 'Mow the lawn', goal: 'Mow back and forth across the field.', sol: sol(Rep(2, Rep(4, F()), R(), F(), R(), Rep(4, F()), L(), F(), L()), Rep(4, F())), dir: 1, stars: [4, 12], hint: 'One lane east, step down, one lane west, step down. Do that twice, then one more lane.' }));
  u = U(bl, 'bl3', { title: 'Draw with Code', emoji: '🎨', badge: { name: 'Code Artist', emoji: '🖼️' }, intro: 'The turtle draws a line wherever it walks. Copy the dotted picture! It starts in the middle, facing up.' });
  const BD = { world: 'turtle', allowed: ['fwd', 'back', 'left', 'right', 'repeat', 'penup', 'pendown', 'color', 'width'] };
  C(bl, u, X(BD, { title: 'Square', goal: 'Draw the square. Forward 80, turn right 90, four times.', sol: sol(Rep(4, F(80), R(90))), hint: 'Use a repeat block with 4 in it.' }));
  C(bl, u, X(BD, { title: 'Triangle', goal: 'Draw the triangle. A triangle turns 120 degrees.', sol: sol(Rep(3, F(80), R(120))), hint: 'Three sides, so repeat 3 times and turn 120.' }));
  C(bl, u, X(BD, { title: 'Hexagon', goal: 'Draw the six-sided hexagon.', sol: sol(Rep(6, F(60), R(60))), hint: '360 divided by 6 is 60.' }));
  C(bl, u, X(BD, { title: 'Star', goal: 'Draw the five-point star.', sol: sol(Rep(5, F(100), R(144))), hint: 'Turn 144 degrees each time, 5 times.' }));
  C(bl, u, X(BD, { title: 'Staircase', goal: 'Draw the staircase going up and to the right.', sol: sol(Rep(4, F(30), R(90), F(30), L(90))), hint: 'Up, right, up, right... repeat the pair.' }));
  C(bl, u, X(BD, { title: 'Square flower', goal: 'Twelve squares, each turned a little, make a flower.', sol: sol(Rep(12, Rep(4, F(50), R(90)), R(30))), hint: 'A repeat inside a repeat: draw a square, turn 30, 12 times.' }));
  u = U(bl, 'bl4', { title: 'Decisions', emoji: '🤔', badge: { name: 'Decision Maker', emoji: '🧠' }, intro: 'Programs can choose! “If there is a wall, turn.” And “while” keeps going until something is true.' });
  const WALKER = While('notgoal', If('wall', [R()], [F()]));
  C(bl, u, { title: 'Until the flag', goal: 'Use a WHILE block: keep moving forward while the robot is NOT at the flag.', world: 'grid', allowed: ['fwd', 'while'], conds: ['notgoal'], fixed: true, sol: sol(While('notgoal', F())), solPath: sol(F(6)), dir: 1, hint: 'Put “forward 1” inside the while block.' });
  C(bl, u, { title: 'Wall? Turn!', goal: 'While not at the flag: IF there is a wall ahead, turn right, ELSE move forward.', world: 'grid', allowed: ['fwd', 'right', 'while', 'ifelse'], conds: ['notgoal', 'wall'], fixed: true, sol: sol(WALKER), solPath: sol(F(2), R(), F(2)), dir: 1, hint: 'Build: while not at goal { if wall ahead { turn right } else { forward } }.' });
  C(bl, u, { title: 'One program, many roads', goal: 'The very same program will solve this longer road too!', world: 'grid', allowed: ['fwd', 'right', 'while', 'ifelse'], conds: ['notgoal', 'wall'], fixed: true, sol: sol(WALKER), solPath: sol(F(3), R(), F(2), R(), F(3)), dir: 1, hint: 'Same blocks as before. That is the power of a decision.' });
  C(bl, u, { title: 'Spiral in', goal: 'Collect the stars as the robot spirals inward.', world: 'grid', allowed: ['fwd', 'right', 'while', 'ifelse'], conds: ['notgoal', 'wall'], fixed: true, sol: sol(WALKER), solPath: sol(F(5), R(), F(4), R(), F(3), R(), F(2)), stars: [4, 9], dir: 1, hint: 'You already have the answer: reuse the idea!' });
  u = U(bl, 'bl5', { title: 'Make Your Own Block', emoji: '🧩', badge: { name: 'Block Inventor', emoji: '🔧' }, intro: 'You can invent a new block called “My Block”. Put steps inside once, then use it again and again.' });
  const BF = { world: 'turtle', allowed: ['fwd', 'left', 'right', 'repeat', 'call', 'penup', 'pendown'] };
  C(bl, u, X(BF, { title: 'Two squares', goal: 'Make My Block draw a square. Then draw two squares side by side.', sol: withFn([Rep(4, F(60), R(90))], Call(), Up(), R(90), F(80), L(90), Down(), Call()), hint: 'Draw a square, lift the pen, move right 80, put the pen down, draw again.' }));
  C(bl, u, X(BF, { title: 'Square flower', goal: 'Use My Block (a square) 8 times, turning 45 each time.', sol: withFn([Rep(4, F(50), R(90))], Rep(8, Call(), R(45))), hint: 'Repeat 8: My Block, then turn 45.' }));
  C(bl, u, X(BF, { title: 'Triangle towers', goal: 'My Block is a triangle. Draw one, move up, draw another.', sol: withFn([Rep(3, F(60), R(120))], Call(), Up(), F(60), Down(), Call()), hint: 'Define the triangle once and use it twice.' }));
  C(bl, u, { title: 'Staircase block', goal: 'My Block is one stair. Use it four times, then step to the flag.', world: 'grid', allowed: ['fwd', 'left', 'right', 'repeat', 'call'], fixed: true, sol: withFn([F(), L(), F(), R()], Rep(4, Call()), F()), dir: 1, stars: [2], hint: 'My Block: forward, left, forward, right.' });

  /* =========================================================== 3. SCRIPT SQUAD (6-8) */
  const sc = T('script', { name: 'Script Squad', ages: '6th to 8th · ages 11–14', emoji: '📜', color: '#7A5AF8', grades: ['6', '7', '8'], mode: 'text',
    blurb: 'Real JavaScript. Type it, run it, and watch the robot and the turtle obey.' });
  u = U(sc, 'sc1', { title: 'Hello, Code', emoji: '💬', badge: { name: 'Script Starter', emoji: '🌟' }, intro: 'console.log() prints a line. Variables with let remember things. Loops repeat.' });
  const SO = { world: 'console' };
  C(sc, u, X(SO, { title: 'Hello, world', goal: 'Print exactly: Hello, world!', start: '// print the message with console.log\n', solutionCode: 'console.log("Hello, world!");', expectOut: ['Hello, world!'], hint: 'console.log("Hello, world!");' }));
  C(sc, u, X(SO, { title: 'A variable', goal: 'Make a variable called name with YOUR name in it. Print: Hello, then your name, then ! (for example Hello, Rhea!)', start: 'let name = "";\n', solutionCode: 'let name = "Rhea";\nconsole.log("Hello, " + name + "!");', outMatch: ['^Hello, .+!$'], hint: 'console.log("Hello, " + name + "!");   The + joins text together.' }));
  C(sc, u, X(SO, { title: 'Computer maths', goal: 'Print the answer to 7 times 8. Let the computer work it out! (* means times)', start: '', solutionCode: 'console.log(7 * 8);', expectOut: ['56'], hint: 'console.log(7 * 8);' }));
  C(sc, u, X(SO, { title: 'Count to five', goal: 'Print the numbers 1, 2, 3, 4, 5 each on its own line, using a for loop.', start: '// for (let i = 1; i <= 5; i++) { ... }\n', solutionCode: 'for (let i = 1; i <= 5; i++) {\n  console.log(i);\n}', expectOut: ['1', '2', '3', '4', '5'], hint: 'for (let i = 1; i <= 5; i++) {  console.log(i);  }' }));
  C(sc, u, X(SO, { title: 'Countdown', goal: 'Print 5, 4, 3, 2, 1 and then Liftoff!', start: '', solutionCode: 'for (let i = 5; i >= 1; i--) {\n  console.log(i);\n}\nconsole.log("Liftoff!");', expectOut: ['5', '4', '3', '2', '1', 'Liftoff!'], hint: 'Count down with i-- and stop at i >= 1. Print Liftoff! after the loop.' }));
  u = U(sc, 'sc2', { title: 'Robot in JavaScript', emoji: '🤖', badge: { name: 'Script Robot', emoji: '🦾' }, intro: 'The robot obeys functions: forward(n), left(), right(). Ask it questions with wallAhead() and atGoal().' });
  const SG = { world: 'grid' };
  C(sc, u, X(SG, { title: 'First commands', goal: 'Write the commands that take the robot to the flag.', sol: sol(F(3), R(), F(2)), dir: 1, start: '// forward(3); right(); ...\n', hint: 'forward(3); right(); forward(2);' }));
  C(sc, u, X(SG, { title: 'A for loop', goal: 'Climb down the stairs. Use a for loop so you do not repeat yourself.', sol: sol(Rep(4, F(), R(), F(), L()), F()), dir: 1, stars: [3], start: '', hint: 'for (let i = 0; i < 4; i++) { forward(1); right(); forward(1); left(); }  then forward(1);' }));
  C(sc, u, X(SG, { title: 'While not there', goal: 'Use while (!atGoal()) to keep walking until the flag. The ! means NOT.', sol: sol(While('notgoal', F())), solPath: sol(F(7)), dir: 1, start: 'while (!atGoal()) {\n  \n}\n', hint: 'Put forward(1); inside the braces.' }));
  C(sc, u, X(SG, { title: 'If there is a wall', goal: 'One program that follows the road: while not at the goal, if a wall is ahead turn right, else go forward.', sol: sol(WALKER), solPath: sol(F(4), R(), F(3), R(), F(2)), stars: [3, 6], dir: 1, start: '', hint: 'if (wallAhead()) { right(); } else { forward(1); }' }));
  C(sc, u, X(SG, { title: 'Make a function', goal: 'Write a function called step() that does: forward, left, forward, right. Use it 4 times, then take one more step.', sol: sol(Rep(4, F(), L(), F(), R()), F()), dir: 1, stars: [2], solutionCode: 'function step() {\n  forward(1);\n  left();\n  forward(1);\n  right();\n}\nfor (let i = 0; i < 4; i++) {\n  step();\n}\nforward(1);', start: 'function step() {\n  \n}\n', hint: 'Define step first. Then loop: for (let i = 0; i < 4; i++) { step(); }' }));
  u = U(sc, 'sc3', { title: 'Turtle Art', emoji: '🐢', badge: { name: 'Script Artist', emoji: '🎨' }, intro: 'The turtle starts in the middle facing up. forward(80) draws a line. right(90) turns.' });
  const SA = { world: 'turtle' };
  C(sc, u, X(SA, { title: 'Square with a loop', goal: 'Draw the square.', solutionCode: 'for (let i = 0; i < 4; i++) {\n  forward(80);\n  right(90);\n}', start: '', hint: 'Four times: forward(80); right(90);' }));
  C(sc, u, X(SA, { title: 'polygon()', goal: 'Write a function polygon(sides, length) that draws any polygon. Call polygon(5, 70) to draw this pentagon.', solutionCode: 'function polygon(sides, length) {\n  for (let i = 0; i < sides; i++) {\n    forward(length);\n    right(360 / sides);\n  }\n}\npolygon(5, 70);', start: 'function polygon(sides, length) {\n  \n}\n', hint: 'Turn 360 / sides degrees after each side.' }));
  C(sc, u, X(SA, { title: 'Square spiral', goal: 'Each line is a little longer than the last. Draw the spiral.', solutionCode: 'for (let i = 1; i <= 20; i++) {\n  forward(i * 5);\n  right(90);\n}', start: '', hint: 'The length grows with i: forward(i * 5).' }));
  C(sc, u, X(SA, { title: 'Starburst', goal: 'Draw 12 spokes: out, back, then turn 30 degrees.', solutionCode: 'for (let i = 0; i < 12; i++) {\n  forward(80);\n  back(80);\n  right(30);\n}', start: '', hint: '12 spokes x 30 degrees = 360.' }));
  C(sc, u, X(SA, { title: 'Flower power', goal: 'Write petal() to draw a square. Use it 12 times, turning 30 each time.', solutionCode: 'function petal() {\n  for (let i = 0; i < 4; i++) {\n    forward(50);\n    right(90);\n  }\n}\nfor (let k = 0; k < 12; k++) {\n  petal();\n  right(30);\n}', start: 'function petal() {\n  \n}\n', hint: 'A loop inside a function, called from a loop.' }));
  u = U(sc, 'sc4', { title: 'Numbers & Words', emoji: '🔢', badge: { name: 'Function Fan', emoji: '🧮' }, intro: 'A function takes inputs and returns an answer. The tests below check your function with different inputs.' });
  const FT = (title, goal, name, args, solutionCode, tests, hint) => ({ world: 'console', title, goal, start: 'function ' + name + '(' + args + ') {\n  \n}\n', solutionCode, tests, hint });
  C(sc, u, FT('double', 'Write double(n) that returns n times 2.', 'double', 'n', 'function double(n) {\n  return n * 2;\n}', [{ fn: 'double', args: [3], ret: 6 }, { fn: 'double', args: [0], ret: 0 }, { fn: 'double', args: [-4], ret: -8 }, { fn: 'double', args: [10.5], ret: 21, hide: true }], 'return n * 2;'));
  C(sc, u, FT('isEven', 'Write isEven(n) that returns true for even numbers and false for odd ones.', 'isEven', 'n', 'function isEven(n) {\n  return n % 2 === 0;\n}', [{ fn: 'isEven', args: [4], ret: true }, { fn: 'isEven', args: [7], ret: false }, { fn: 'isEven', args: [0], ret: true }, { fn: 'isEven', args: [-3], ret: false, hide: true }], '% gives the remainder. Even numbers leave 0 when divided by 2.'));
  C(sc, u, FT('greet', 'Write greet(name) that returns Hello, then the name, then !', 'greet', 'name', 'function greet(name) {\n  return "Hello, " + name + "!";\n}', [{ fn: 'greet', args: ['Aoife'], ret: 'Hello, Aoife!' }, { fn: 'greet', args: ['Jane'], ret: 'Hello, Jane!' }, { fn: 'greet', args: [''], ret: 'Hello, !', hide: true }], 'return "Hello, " + name + "!";'));
  C(sc, u, FT('shout', 'Write shout(text) that returns the text in CAPITAL LETTERS with ! on the end.', 'shout', 'text', 'function shout(text) {\n  return text.toUpperCase() + "!";\n}', [{ fn: 'shout', args: ['hello'], ret: 'HELLO!' }, { fn: 'shout', args: ['Code is fun'], ret: 'CODE IS FUN!' }, { fn: 'shout', args: ['a'], ret: 'A!', hide: true }], 'text.toUpperCase() gives capitals.'));
  C(sc, u, FT('area', 'Write area(width, height) that returns the area of a rectangle.', 'area', 'width, height', 'function area(width, height) {\n  return width * height;\n}', [{ fn: 'area', args: [3, 4], ret: 12 }, { fn: 'area', args: [10, 10], ret: 100 }, { fn: 'area', args: [0, 5], ret: 0, hide: true }], 'return width * height;'));
  u = U(sc, 'sc5', { title: 'Lists', emoji: '📋', badge: { name: 'List Leader', emoji: '📜' }, intro: 'An array holds many values: [3, 5, 8]. list.length is how many. list[0] is the first.' });
  C(sc, u, FT('sum', 'Write sum(list) that adds up all the numbers.', 'sum', 'list', 'function sum(list) {\n  let total = 0;\n  for (let i = 0; i < list.length; i++) {\n    total += list[i];\n  }\n  return total;\n}', [{ fn: 'sum', args: [[1, 2, 3]], ret: 6 }, { fn: 'sum', args: [[]], ret: 0 }, { fn: 'sum', args: [[10, -4, 6]], ret: 12 }, { fn: 'sum', args: [[5]], ret: 5, hide: true }], 'Loop through the list adding each item to a total that starts at 0.'));
  C(sc, u, FT('biggest', 'Write biggest(list) that returns the largest number in the list.', 'biggest', 'list', 'function biggest(list) {\n  let best = list[0];\n  for (let i = 1; i < list.length; i++) {\n    if (list[i] > best) {\n      best = list[i];\n    }\n  }\n  return best;\n}', [{ fn: 'biggest', args: [[3, 9, 2]], ret: 9 }, { fn: 'biggest', args: [[-5, -2, -9]], ret: -2 }, { fn: 'biggest', args: [[7]], ret: 7, hide: true }], 'Start with the first item as the best so far, then compare each other item.'));
  C(sc, u, FT('countLetter', 'Write countLetter(word, letter) that counts how many times the letter appears.', 'countLetter', 'word, letter', 'function countLetter(word, letter) {\n  let n = 0;\n  for (let i = 0; i < word.length; i++) {\n    if (word[i] === letter) {\n      n++;\n    }\n  }\n  return n;\n}', [{ fn: 'countLetter', args: ['banana', 'a'], ret: 3 }, { fn: 'countLetter', args: ['hello', 'z'], ret: 0 }, { fn: 'countLetter', args: ['Mississippi', 's'], ret: 4, hide: true }], 'word[i] is the letter at position i.'));
  C(sc, u, FT('doubleAll', 'Write doubleAll(list) that returns a NEW list with every number doubled.', 'doubleAll', 'list', 'function doubleAll(list) {\n  const out = [];\n  for (let i = 0; i < list.length; i++) {\n    out.push(list[i] * 2);\n  }\n  return out;\n}', [{ fn: 'doubleAll', args: [[1, 2, 3]], ret: [2, 4, 6] }, { fn: 'doubleAll', args: [[]], ret: [] }, { fn: 'doubleAll', args: [[-1, 5]], ret: [-2, 10], hide: true }], 'out.push(x) adds x to the end of a list.'));
  C(sc, u, FT('evens', 'Write evens(list) that returns only the even numbers.', 'evens', 'list', 'function evens(list) {\n  const out = [];\n  for (let i = 0; i < list.length; i++) {\n    if (list[i] % 2 === 0) {\n      out.push(list[i]);\n    }\n  }\n  return out;\n}', [{ fn: 'evens', args: [[1, 2, 3, 4]], ret: [2, 4] }, { fn: 'evens', args: [[1, 3]], ret: [] }, { fn: 'evens', args: [[8, 6, 7, 0]], ret: [8, 6, 0], hide: true }], 'Combine the loop with an if and a push.'));

  /* =========================================================== 4. DEV STUDIO (9-12) */
  const dv = T('dev', { name: 'Dev Studio', ages: '9th to 12th · ages 14–18', emoji: '💻', color: '#12B58C', grades: ['9', '10', '11', '12', 'AD'], mode: 'text',
    blurb: 'Functions, data, algorithms and recursion in JavaScript, checked by hidden tests like a real engineer’s.' });
  u = U(dv, 'dv1', { title: 'Logic & Functions', emoji: '🧠', badge: { name: 'Logic Lord', emoji: '👑' }, intro: 'Good functions are small, take inputs, and return a result. Edge cases (0, empty, negative) are where bugs hide.' });
  C(dv, u, FT('fizzbuzz', 'fizzbuzz(n) returns "Fizz" if n divides by 3, "Buzz" if by 5, "FizzBuzz" if both, otherwise the number as a string.', 'fizzbuzz', 'n',
    'function fizzbuzz(n) {\n  if (n % 15 === 0) return "FizzBuzz";\n  if (n % 3 === 0) return "Fizz";\n  if (n % 5 === 0) return "Buzz";\n  return String(n);\n}',
    [{ fn: 'fizzbuzz', args: [3], ret: 'Fizz' }, { fn: 'fizzbuzz', args: [5], ret: 'Buzz' }, { fn: 'fizzbuzz', args: [15], ret: 'FizzBuzz' }, { fn: 'fizzbuzz', args: [7], ret: '7' }, { fn: 'fizzbuzz', args: [30], ret: 'FizzBuzz', hide: true }, { fn: 'fizzbuzz', args: [1], ret: '1', hide: true }], 'Check the divisible-by-both case FIRST. n % 3 === 0 tests divisibility.'));
  C(dv, u, FT('isLeapYear', 'A leap year divides by 4, except centuries, which must divide by 400. isLeapYear(year) returns true or false.', 'isLeapYear', 'year',
    'function isLeapYear(year) {\n  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;\n}',
    [{ fn: 'isLeapYear', args: [2024], ret: true }, { fn: 'isLeapYear', args: [2023], ret: false }, { fn: 'isLeapYear', args: [1900], ret: false }, { fn: 'isLeapYear', args: [2000], ret: true }, { fn: 'isLeapYear', args: [2100], ret: false, hide: true }], 'Use && and || together. Remember 1900 was NOT a leap year.'));
  C(dv, u, FT('clamp', 'clamp(n, lo, hi) keeps n between lo and hi: below lo gives lo, above hi gives hi.', 'clamp', 'n, lo, hi',
    'function clamp(n, lo, hi) {\n  return Math.min(hi, Math.max(lo, n));\n}',
    [{ fn: 'clamp', args: [5, 0, 10], ret: 5 }, { fn: 'clamp', args: [-3, 0, 10], ret: 0 }, { fn: 'clamp', args: [99, 0, 10], ret: 10 }, { fn: 'clamp', args: [0, 0, 0], ret: 0, hide: true }], 'Math.min and Math.max can do it in one line.'));
  C(dv, u, FT('isPalindrome', 'isPalindrome(text) is true if the text reads the same backwards. Ignore capital letters.', 'isPalindrome', 'text',
    'function isPalindrome(text) {\n  const t = text.toLowerCase();\n  return t === t.split("").reverse().join("");\n}',
    [{ fn: 'isPalindrome', args: ['level'], ret: true }, { fn: 'isPalindrome', args: ['Racecar'], ret: true }, { fn: 'isPalindrome', args: ['hello'], ret: false }, { fn: 'isPalindrome', args: [''], ret: true, hide: true }], 'split("") makes a list of letters, reverse() flips it, join("") glues it back.'));
  C(dv, u, FT('grade', 'grade(score) returns "A" for 90+, "B" for 80+, "C" for 70+, "D" for 60+, otherwise "F".', 'grade', 'score',
    'function grade(score) {\n  if (score >= 90) return "A";\n  if (score >= 80) return "B";\n  if (score >= 70) return "C";\n  if (score >= 60) return "D";\n  return "F";\n}',
    [{ fn: 'grade', args: [95], ret: 'A' }, { fn: 'grade', args: [80], ret: 'B' }, { fn: 'grade', args: [71], ret: 'C' }, { fn: 'grade', args: [60], ret: 'D' }, { fn: 'grade', args: [12], ret: 'F' }, { fn: 'grade', args: [89.9], ret: 'B', hide: true }], 'A chain of if statements, highest first. return ends the function early.'));
  u = U(dv, 'dv2', { title: 'Data', emoji: '🗂️', badge: { name: 'Data Wrangler', emoji: '📊' }, intro: 'Real programs mostly shuffle data. Arrays hold lists; objects hold labelled values like { name: "Ada", score: 9 }.' });
  C(dv, u, FT('average', 'average(list) returns the mean of the numbers. An empty list gives 0.', 'average', 'list',
    'function average(list) {\n  if (list.length === 0) return 0;\n  let t = 0;\n  for (const x of list) t += x;\n  return t / list.length;\n}',
    [{ fn: 'average', args: [[2, 4, 6]], ret: 4 }, { fn: 'average', args: [[]], ret: 0 }, { fn: 'average', args: [[1, 2]], ret: 1.5 }, { fn: 'average', args: [[-5, 5]], ret: 0, hide: true }], 'Guard the empty list first, or you divide by zero.'));
  C(dv, u, FT('wordCount', 'wordCount(text) returns an object counting each word (lowercase, words split on spaces). "a b a" gives { a: 2, b: 1 }.', 'wordCount', 'text',
    'function wordCount(text) {\n  const out = {};\n  for (const w of text.toLowerCase().split(" ")) {\n    if (w === "") continue;\n    out[w] = (out[w] || 0) + 1;\n  }\n  return out;\n}',
    [{ fn: 'wordCount', args: ['a b a'], ret: { a: 2, b: 1 } }, { fn: 'wordCount', args: ['The the THE'], ret: { the: 3 } }, { fn: 'wordCount', args: [''], ret: {}, hide: true }], 'out[w] = (out[w] || 0) + 1; adds one, starting at zero.'));
  C(dv, u, FT('topScorer', 'topScorer(players) takes a list like [{name:"Ada", score:9}] and returns the NAME of the highest scorer.', 'topScorer', 'players',
    'function topScorer(players) {\n  let best = players[0];\n  for (const p of players) {\n    if (p.score > best.score) best = p;\n  }\n  return best.name;\n}',
    [{ fn: 'topScorer', args: [[{ name: 'Ada', score: 9 }, { name: 'Bo', score: 12 }]], ret: 'Bo' }, { fn: 'topScorer', args: [[{ name: 'Cy', score: 1 }]], ret: 'Cy' }, { fn: 'topScorer', args: [[{ name: 'X', score: -4 }, { name: 'Y', score: -9 }]], ret: 'X', hide: true }], 'Keep the best player so far while you loop. Use p.score and p.name.'));
  C(dv, u, FT('unique', 'unique(list) returns the list with duplicates removed, keeping the first of each in order.', 'unique', 'list',
    'function unique(list) {\n  const out = [];\n  for (const x of list) {\n    if (!out.includes(x)) out.push(x);\n  }\n  return out;\n}',
    [{ fn: 'unique', args: [[1, 2, 2, 3, 1]], ret: [1, 2, 3] }, { fn: 'unique', args: [[]], ret: [] }, { fn: 'unique', args: [['a', 'b', 'a']], ret: ['a', 'b'], hide: true }], 'out.includes(x) asks “do I already have it?”.'));
  C(dv, u, FT('groupByLength', 'groupByLength(words) returns an object whose keys are word lengths and whose values are lists of words, e.g. ["a","bb","c"] gives {1:["a","c"], 2:["bb"]}.', 'groupByLength', 'words',
    'function groupByLength(words) {\n  const out = {};\n  for (const w of words) {\n    if (!out[w.length]) out[w.length] = [];\n    out[w.length].push(w);\n  }\n  return out;\n}',
    [{ fn: 'groupByLength', args: [['a', 'bb', 'c']], ret: { 1: ['a', 'c'], 2: ['bb'] } }, { fn: 'groupByLength', args: [[]], ret: {} }, { fn: 'groupByLength', args: [['cat', 'dog', 'emu', 'ox']], ret: { 3: ['cat', 'dog', 'emu'], 2: ['ox'] }, hide: true }], 'Make a new list the first time you see a length.'));
  u = U(dv, 'dv3', { title: 'Algorithms', emoji: '⚙️', badge: { name: 'Algorithm Ace', emoji: '🏆' }, intro: 'An algorithm is a recipe for solving a problem. Good ones are fast: binary search finds a name in a million-entry list in about 20 looks.' });
  C(dv, u, FT('binarySearch', 'binarySearch(sortedList, target) returns the index of target, or -1. Halve the search area each time instead of scanning everything.', 'binarySearch', 'sortedList, target',
    'function binarySearch(sortedList, target) {\n  let lo = 0, hi = sortedList.length - 1;\n  while (lo <= hi) {\n    const mid = Math.floor((lo + hi) / 2);\n    if (sortedList[mid] === target) return mid;\n    if (sortedList[mid] < target) lo = mid + 1; else hi = mid - 1;\n  }\n  return -1;\n}',
    [{ fn: 'binarySearch', args: [[1, 3, 5, 7, 9], 7], ret: 3 }, { fn: 'binarySearch', args: [[1, 3, 5, 7, 9], 4], ret: -1 }, { fn: 'binarySearch', args: [[], 1], ret: -1 }, { fn: 'binarySearch', args: [[2, 4, 6, 8], 2], ret: 0, hide: true }, { fn: 'binarySearch', args: [[2, 4, 6, 8], 8], ret: 3, hide: true }], 'Look at the middle item. Too small? Search the right half. Too big? The left half.'));
  C(dv, u, FT('bubbleSort', 'bubbleSort(list) returns a NEW list sorted smallest to largest. Do the swapping yourself (no .sort()): compare neighbours and swap if out of order, again and again.', 'bubbleSort', 'list',
    'function bubbleSort(list) {\n  const a = list.slice();\n  for (let i = 0; i < a.length; i++) {\n    for (let j = 0; j < a.length - 1 - i; j++) {\n      if (a[j] > a[j + 1]) {\n        const t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;\n      }\n    }\n  }\n  return a;\n}',
    [{ fn: 'bubbleSort', args: [[3, 1, 2]], ret: [1, 2, 3] }, { fn: 'bubbleSort', args: [[]], ret: [] }, { fn: 'bubbleSort', args: [[5, 5, 1]], ret: [1, 5, 5] }, { fn: 'bubbleSort', args: [[9, 8, 7, 6, 5, 4]], ret: [4, 5, 6, 7, 8, 9], hide: true }], 'list.slice() makes a copy so you do not change the original. Two loops, one inside the other.'));
  C(dv, u, FT('gcd', 'gcd(a, b) returns the greatest common divisor. Euclid’s trick: gcd(a, b) = gcd(b, a % b), stopping when b is 0.', 'gcd', 'a, b',
    'function gcd(a, b) {\n  while (b !== 0) {\n    const t = b;\n    b = a % b;\n    a = t;\n  }\n  return a;\n}',
    [{ fn: 'gcd', args: [12, 18], ret: 6 }, { fn: 'gcd', args: [7, 13], ret: 1 }, { fn: 'gcd', args: [100, 25], ret: 25 }, { fn: 'gcd', args: [0, 5], ret: 5, hide: true }], 'Repeat: replace (a, b) with (b, a % b) until b is 0.'));
  C(dv, u, FT('isPrime', 'isPrime(n) is true for primes (2, 3, 5, 7, ...). 0 and 1 are not prime. You only need to check divisors up to the square root of n.', 'isPrime', 'n',
    'function isPrime(n) {\n  if (n < 2) return false;\n  for (let d = 2; d * d <= n; d++) {\n    if (n % d === 0) return false;\n  }\n  return true;\n}',
    [{ fn: 'isPrime', args: [2], ret: true }, { fn: 'isPrime', args: [9], ret: false }, { fn: 'isPrime', args: [97], ret: true }, { fn: 'isPrime', args: [1], ret: false }, { fn: 'isPrime', args: [0], ret: false, hide: true }, { fn: 'isPrime', args: [7919], ret: true, hide: true }], 'Try d = 2, 3, 4... while d * d <= n.'));
  C(dv, u, FT('fibonacci', 'fibonacci(n): 0, 1, 1, 2, 3, 5, 8... Each number is the sum of the previous two. fibonacci(0) = 0, fibonacci(1) = 1. Use a loop (not recursion) so it is fast.', 'fibonacci', 'n',
    'function fibonacci(n) {\n  let a = 0, b = 1;\n  for (let i = 0; i < n; i++) {\n    const t = a + b;\n    a = b;\n    b = t;\n  }\n  return a;\n}',
    [{ fn: 'fibonacci', args: [0], ret: 0 }, { fn: 'fibonacci', args: [1], ret: 1 }, { fn: 'fibonacci', args: [10], ret: 55 }, { fn: 'fibonacci', args: [40], ret: 102334155, hide: true }], 'Keep two variables, a and b, and slide them forward n times.'));
  u = U(dv, 'dv4', { title: 'Recursion', emoji: '🌀', badge: { name: 'Recursion Wizard', emoji: '🧙' }, intro: 'A recursive function solves a big problem by calling itself on a smaller one, with a base case that stops it.' });
  C(dv, u, FT('factorial', 'factorial(n) = n × (n-1) × ... × 1, and factorial(0) = 1. Write it recursively.', 'factorial', 'n',
    'function factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}',
    [{ fn: 'factorial', args: [0], ret: 1 }, { fn: 'factorial', args: [5], ret: 120 }, { fn: 'factorial', args: [10], ret: 3628800 }, { fn: 'factorial', args: [1], ret: 1, hide: true }], 'Base case: n <= 1 gives 1. Otherwise n * factorial(n - 1).'));
  C(dv, u, FT('sumDigits', 'sumDigits(n) adds the digits of a whole number. sumDigits(493) = 16. Recursion idea: last digit + sumDigits of the rest.', 'sumDigits', 'n',
    'function sumDigits(n) {\n  if (n < 10) return n;\n  return (n % 10) + sumDigits(Math.floor(n / 10));\n}',
    [{ fn: 'sumDigits', args: [493], ret: 16 }, { fn: 'sumDigits', args: [7], ret: 7 }, { fn: 'sumDigits', args: [1000], ret: 1 }, { fn: 'sumDigits', args: [99999], ret: 45, hide: true }], 'n % 10 is the last digit. Math.floor(n / 10) removes it.'));
  C(dv, u, FT('power', 'power(base, exp) returns base to the power exp (exp is a whole number, 0 or more) without using ** or Math.pow. Recursion: base × power(base, exp-1).', 'power', 'base, exp',
    'function power(base, exp) {\n  if (exp === 0) return 1;\n  return base * power(base, exp - 1);\n}',
    [{ fn: 'power', args: [2, 10], ret: 1024 }, { fn: 'power', args: [5, 0], ret: 1 }, { fn: 'power', args: [3, 3], ret: 27 }, { fn: 'power', args: [-2, 3], ret: -8, hide: true }], 'Anything to the power 0 is 1. That is your base case.'));
  C(dv, u, FT('flattenDeep', 'flattenDeep(list) turns nested lists like [1, [2, [3]]] into a flat list [1, 2, 3], however deep they go. Hint: Array.isArray(x) tells you if x is a list.', 'flattenDeep', 'list',
    'function flattenDeep(list) {\n  let out = [];\n  for (const x of list) {\n    if (Array.isArray(x)) out = out.concat(flattenDeep(x));\n    else out.push(x);\n  }\n  return out;\n}',
    [{ fn: 'flattenDeep', args: [[1, [2, [3]]]], ret: [1, 2, 3] }, { fn: 'flattenDeep', args: [[]], ret: [] }, { fn: 'flattenDeep', args: [[[[[5]]], 6]], ret: [5, 6], hide: true }], 'If an item is a list, flatten it too (that is the recursive call).'));
  C(dv, u, FT('hanoiMoves', 'Towers of Hanoi: moving n discs takes moves(n) = 2 × moves(n-1) + 1 moves, and moves(0) = 0. Write hanoiMoves(n) recursively.', 'hanoiMoves', 'n',
    'function hanoiMoves(n) {\n  if (n === 0) return 0;\n  return 2 * hanoiMoves(n - 1) + 1;\n}',
    [{ fn: 'hanoiMoves', args: [0], ret: 0 }, { fn: 'hanoiMoves', args: [1], ret: 1 }, { fn: 'hanoiMoves', args: [3], ret: 7 }, { fn: 'hanoiMoves', args: [10], ret: 1023, hide: true }], 'Just turn the formula into code. Notice the answer is always 2 to the n, minus 1!'));
  u = U(dv, 'dv5', { title: 'Maze Solver', emoji: '🧭', badge: { name: 'Maze Solver', emoji: '🗺️' }, intro: 'The robot now has sensors: wallLeft(), wallRight(), wallAhead(). A famous trick, the right-hand rule, solves many mazes.' });
  const RH = 'while (!atGoal()) {\n  if (!wallRight()) {\n    right();\n    forward(1);\n  } else if (!wallAhead()) {\n    forward(1);\n  } else {\n    left();\n  }\n}';
  const DM = (title, goal, rows, hint) => ({ world: 'grid', title, goal, rows, dir: 1, start: '', hint, solutionCode: RH, extraApi: true });
  C(dv, u, DM('Right-hand rule', 'Keep your right hand on the wall. If the right is open, turn right and step. Else if ahead is open, step. Else turn left. Repeat until the flag.', ['S.#.G', '#.#.#', '#...#'], 'while (!atGoal()) { if (!wallRight()) { ... } else if (!wallAhead()) { ... } else { left(); } }'));
  C(dv, u, DM('Dead ends', 'This maze has dead ends. The same rule still works. Trust the algorithm!', ['S..#...G', '##.#.##.', '#..#.#..', '#.##.#.#', '#....#..', '######.#'], 'Same program as before. Test it!'));
  C(dv, u, DM('The big maze', 'A bigger maze. One general algorithm solves them all.', ['S.#.....#.G', '#.#.###.#.#', '#.#...#...#', '#.#####.###', '#.......#..', '#########.#'], 'If it gets stuck, check which way each turn goes.'));

  /* ---------- bands -> tracks ---------- */
  PGC.tracks.forEach(t => t.grades.forEach(g => { PGC.bandTrack[g] = t.id; }));
  PGC.trackFor = grade => PGC.bandTrack[String(grade)] || 'blocks';
  PGC.track = id => PGC.tracks.find(t => t.id === id);
  PGC.allChallenges = () => PGC.tracks.reduce((a, t) => a.concat(t.units.reduce((b, un) => b.concat(un.challenges), [])), []);
  PGC.unitById = id => { for (const t of PGC.tracks) for (const x of t.units) if (x.id === id) return x; return null; };
  PGC.nextChallenge = (trackId, isDone) => { const t = PGC.track(trackId); for (const un of t.units) for (const c of un.challenges) if (!isDone(c.id)) return c; return null; };

  /* ---------- screen-free missions, one list per track ---------- */
  PGC.unplugged = {
    sprout: ['Be the robot: a grown-up gives you arrow instructions (forward, turn left, turn right) to find a hidden toy.', 'Sandwich robot: say the steps to make a jam sandwich. Then follow them EXACTLY, silly gaps included.', 'Dance program: make a 4-move dance and repeat it 3 times. That is a loop!', 'Floor maze: lay tape or cushions as walls. Guide a toy car with cards: forward, left, right.', 'Pattern parade: red, blue, red, blue... what comes next? Patterns are the heart of loops.', 'Bug hunt: follow a grown-up’s instructions to build a block tower, and shout when an instruction is wrong.'],
    blocks: ['Draw-it-blind: describe a shape to a partner who cannot see it, using only “forward, turn” commands.', 'Human robot maze on the floor: write a program on paper, then have a sibling follow it exactly.', 'Loop hunt: find 5 things in the day that repeat (brushing teeth, stairs, laps). Write each as “repeat n times”.', 'Make a card game of blocks. Each card is a command; build programs and race a timer.', 'Decision day: write 5 “if ... then ... else” rules for your family (if it is raining, then ...).', 'Debug the recipe: swap two steps in a recipe and discuss what goes wrong.'],
    script: ['Binary bracelets: spell your initials in binary (A = 01000001) with two colours of bead.', 'Rubber-duck debugging: explain a failing program out loud to a toy, line by line.', 'Pseudocode a family chore chart: write the rules as if/else statements, then trace them for a week.', 'Cipher club: invent a Caesar cipher and write the steps as an algorithm another person can follow.', 'Sort it out: sort 8 numbered cards three different ways. Which took the fewest swaps?', 'Read a program on paper and predict the output before you run it. Check for surprises.'],
    dev: ['Whiteboard an algorithm: explain binary search to someone using only a phone book.', 'Big-O in real life: how many steps to find a name in an unsorted vs a sorted list of 1000?', 'Code review: swap code with a sibling and leave three kind, specific comments.', 'Design a tiny app on paper: what data does it store? What functions does it need?', 'Read open code: pick a short function from a library and explain every line.', 'Computing history: read about Ada Lovelace, Grace Hopper or Alan Turing and write a short note.']
  };
})(typeof window !== 'undefined' ? window : globalThis);
