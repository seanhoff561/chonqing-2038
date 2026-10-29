// npm run plan: writes docs/ROADMAP.md, the whole plan by milestone (BRIEF's headline, then every feature with
// its status and acceptance criteria) from features.json.
import fs from 'fs';
const root = new URL('../', import.meta.url);
const { features } = JSON.parse(fs.readFileSync(new URL('features.json', root)));
const brief = fs.readFileSync(new URL('BRIEF.md', root), 'utf8');
const heads = Object.fromEntries([...brief.matchAll(/^- (M\d) (.+)$/gm)].map(m => [m[1], m[2]]));
const mark = { done: '[x]', todo: '[ ]', dropped: '[-]' };
const out = ['# Roadmap', '', 'Generated from features.json by `npm run plan`; do not edit by hand. [x] done, [ ] to do, [-] dropped by a director\'s note.', ''];
for (const m of [...new Set(features.map(f => f.milestone))].sort()) {
  const fs_ = features.filter(f => f.milestone === m), done = fs_.filter(f => f.status === 'done').length;
  out.push(`## ${m}: ${done} of ${fs_.length} done`, '', heads[m] ? `${m} ${heads[m]}` : '', '');
  for (const f of fs_) {
    out.push(`- ${mark[f.status]} **${f.id}** ${f.title}`);
    for (const a of f.acceptance) out.push(`  - ${a}`);
  }
  out.push('');
}
fs.writeFileSync(new URL('docs/ROADMAP.md', root), out.join('\n'));
console.log(`docs/ROADMAP.md: ${features.length} features`);
