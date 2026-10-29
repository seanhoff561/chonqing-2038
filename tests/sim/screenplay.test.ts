// M8-25 (U-018): every shot of the intro screenplay is ready to generate, every line is bilingual, and the
// trailer cut uses real shots.
import { describe, it, expect } from 'vitest';
import fs from 'fs';

const doc = fs.readFileSync('docs/cinematics/INTRO.md', 'utf8');
const shots = doc.split(/\n### /).slice(1).map(b => ({ id: b.slice(0, 6), body: b.split(/\n## /)[0] }));

describe('intro screenplay', () => {
  it('has the scenes and enough shots', () => {
    expect(shots.length).toBeGreaterThanOrEqual(40);
    for (const s of ['S00', 'S01', 'S02', 'S03', 'S04', 'S05', 'S06']) expect(shots.some(x => x.id.startsWith(s)), s).toBe(true);
    const total = shots.reduce((a, s) => a + Number(/- Duration: (\d+) s/.exec(s.body)?.[1] ?? 0), 0);
    expect(total).toBeGreaterThan(240);
  });
  it('gives every shot a duration, camera, action, prompt, negative and consistency note', () => {
    for (const s of shots) for (const f of ['Duration: \\d+ s', 'Camera: \\S', 'Action: \\S', 'Prompt: .{40,}', 'Negative: \\S', 'Consistency: \\S']) expect(new RegExp(`\\n- ${f}`).test(s.body), `${s.id} ${f}`).toBe(true);
    for (const s of shots) expect(Number(/- Duration: (\d+) s/.exec(s.body)![1]), s.id).toBeLessThanOrEqual(10);
  });
  it('writes every line in Chinese and English', () => {
    const lines = shots.flatMap(s => [...s.body.matchAll(/\n- Line: ([^\n]*)/g)].map(m => m[1].split(' | ')));
    expect(lines.length).toBeGreaterThan(25);
    for (const l of lines) {
      expect(l.length, l.join('|')).toBe(3);
      expect(/[一-鿿]/.test(l[1]), l[1]).toBe(true);
      expect(/[A-Za-z]{2}/.test(l[2]), l[2]).toBe(true);
    }
  });
  it('cuts the trailer from shots that exist', () => {
    const rows = [...doc.split('## Trailer cut')[1].matchAll(/\n\| \d+ \| (S\d\d-\d\d|card) \| (\d+) \|/g)];
    expect(rows.length).toBeGreaterThan(15);
    for (const r of rows) if (r[1] !== 'card') expect(shots.some(s => s.id === r[1]), r[1]).toBe(true);
    const secs = rows.reduce((a, r) => a + +r[2], 0);
    expect(secs).toBeGreaterThan(60);
    expect(secs).toBeLessThan(120);
  });
});
