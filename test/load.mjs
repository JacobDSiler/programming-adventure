import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PGE = require(path.join(root, 'pg-engine.js'));
globalThis.PGE = PGE;
require(path.join(root, 'pg-content.js'));
export const PGC = globalThis.PGC;
