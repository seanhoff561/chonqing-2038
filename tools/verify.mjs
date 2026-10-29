// npm run verify: typecheck, all tests, production build, browser smoke test.
// One-line summary on screen; details in logs/verify.log.
import { spawnSync } from 'child_process';
import fs from 'fs';
fs.mkdirSync('logs', { recursive: true });
const log = [];
const steps = [
  ['tsc', 'npx', ['tsc', '--noEmit', '-p', '.']],
  ['tests', 'npx', ['vitest', 'run', '--reporter=dot']],
  ['build', 'npx', ['vite', 'build']],
  ['smoke', 'node', ['tools/smoke.mjs']],
];
const res = [];
let ok = true;
for (const [name, cmd, args] of steps) {
  if (!ok) { res.push(`${name} skipped`); continue; }
  const t = Date.now();
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = ((r.stdout ?? '') + (r.stderr ?? '')).replace(/\x1b\[[0-9;]*m/g, '');
  log.push(`== ${name} (${((Date.now() - t) / 1000).toFixed(1)} s)\n${out}`);
  const pass = r.status === 0;
  if (!pass) {
    ok = false;
    const lines = out.split('\n').filter(l => /FAIL|error|Error|✗|×/.test(l));
    console.log(lines.slice(0, 25).join('\n'));
  }
  let note = '';
  if (name === 'tests') note = ' ' + (out.split('\n').find(l => /Tests\s+\d/.test(l))?.trim().replace(/\s+/g, ' ') ?? '');
  if (name === 'smoke') note = ' ' + (out.split('\n').filter(l => l.startsWith('smoke:')).pop() ?? '');
  res.push(`${name} ${pass ? 'ok' : 'FAIL'}${note}`);
}
fs.writeFileSync('logs/verify.log', log.join('\n'));
console.log(`verify: ${res.join(' | ')}`);
process.exit(ok ? 0 : 1);
