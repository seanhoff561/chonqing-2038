// npm run check: typecheck plus fast tests, quiet. Full output in logs/check.log.
import { spawnSync } from 'child_process';
import fs from 'fs';
fs.mkdirSync('logs', { recursive: true });
const log = [];
function run(name, cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  log.push(`== ${name}\n${out}`);
  return { ok: r.status === 0, out };
}
const tsc = run('tsc', 'npx', ['tsc', '--noEmit', '-p', '.']);
if (!tsc.ok) console.log(tsc.out.split('\n').filter(l => l.includes('error')).slice(0, 20).join('\n'));
const vt = run('vitest', 'npx', ['vitest', 'run', '--reporter=dot', '--exclude', '**/*.slow.test.ts']);
fs.writeFileSync('logs/check.log', log.join('\n'));
const plain = vt.out.replace(/\x1b\[[0-9;]*m/g, '');
if (!vt.ok) {
  const lines = plain.split('\n').filter(l => /FAIL|AssertionError|Error:|expected|✗|×/.test(l));
  console.log(lines.slice(0, 30).join('\n'));
}
const sum = plain.split('\n').find(l => /Tests\s+\d/.test(l))?.trim() ?? (vt.ok ? 'no tests' : 'vitest failed');
console.log(`check: tsc ${tsc.ok ? 'ok' : 'FAIL'} | ${sum}`);
process.exit(tsc.ok && vt.ok ? 0 : 1);
