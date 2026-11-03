# Programming Adventure

Homeschool coding for the Siler family school, kindergarten to 12th grade. A sibling of Math, Words, Electronics and Music Adventure.

- Vanilla JS PWA, no build step. Open `index.html` through any static server.
- Four paths, 77 missions, each with a reference solution that is run through the real engine by the tests:
  Robot Pals (K-1, arrow blocks), Block Builders (2-5, blocks + turtle drawing), Script Squad (6-8, JavaScript with a robot, a turtle and tested functions), Dev Studio (9-12, algorithms, recursion, maze solving with hidden tests).
- Five quick games (Predict It, Pattern Cracker, Bug Hunt, Binary Bits, Sort Sprint), free-play turtle drawing, badges, off-screen quests, a parent area with PIN, plan and backup.
- Code runs in a sandbox (Web Worker with loop guards and a timeout). Nothing a child writes leaves the device.
- Shares the family code system and Firebase project with the other apps (doc `families/{CODE}_pg`).
- Deploys to code.jacobsiler.com via GitHub Pages (`push.cmd` or the tray watcher, see `scripts/README-deploy.md`).

## Tests
`node test/run-all.mjs` runs the engine tests, verifies every mission's reference solution, and smoke-tests the UI
with a tiny DOM stand-in (every screen, every mission solved through the UI, every game played to the end).
The push script runs it first and blocks the push on failure.

## Adding a mission
Add a `C(track, unit, {...})` line in `pg-content.js` with a `sol` (block program) or `solutionCode` (JavaScript) and, for console missions, `tests`.
The test suite refuses a mission whose solution does not solve it.

Firestore rules must allow `families/{code}_pg` just like `_ea` and `_mu` (the existing `families/{id}` rule already does).
