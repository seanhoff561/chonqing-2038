// npm run next: the next three todo features whose dependencies are done.
import fs from 'fs';
const { features } = JSON.parse(fs.readFileSync(new URL('../features.json', import.meta.url)));
const closed = new Set(features.filter(f => f.status !== 'todo').map(f => f.id));
const ready = features.filter(f => f.status === 'todo' && f.depends_on.every(d => closed.has(d))).slice(0, 3);
if (!ready.length) console.log(features.some(f => f.status === 'todo') ? 'todo features remain but all are blocked' : 'no todo features');
for (const f of ready) {
  console.log(`${f.id} [${f.verify}] ${f.title}`);
  for (const a of f.acceptance) console.log(`  - ${a}`);
}
