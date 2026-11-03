// Runs every test file; exits non-zero if any fails. Used by the push script (blocks bad pushes).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url));
let fail = 0;
for (const f of ['engine.test.mjs', 'content.test.mjs', 'ui.test.mjs']) {
  const r = spawnSync(process.execPath, ['--test', path.join(dir, f)], { encoding: 'utf8' });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.status !== 0) fail++;
}
process.exit(fail ? 1 : 0);
