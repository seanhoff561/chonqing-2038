// npm run status: feature counts per milestone and in total.
import fs from 'fs';
const { features } = JSON.parse(fs.readFileSync(new URL('../features.json', import.meta.url)));
const by = new Map();
for (const f of features) {
  const m = by.get(f.milestone) ?? { todo: 0, done: 0, dropped: 0 };
  m[f.status]++;
  by.set(f.milestone, m);
}
const t = { todo: 0, done: 0, dropped: 0 };
console.log('milestone  todo  done  dropped');
for (const [m, c] of by) {
  for (const k in t) t[k] += c[k];
  console.log(`${m.padEnd(9)} ${String(c.todo).padStart(5)} ${String(c.done).padStart(5)} ${String(c.dropped).padStart(8)}`);
}
console.log(`${'total'.padEnd(9)} ${String(t.todo).padStart(5)} ${String(t.done).padStart(5)} ${String(t.dropped).padStart(8)}`);
