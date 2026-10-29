// M3-24: every reference photo is credited, and every place in PLACES.md has a photo of its own or a link.
import { describe, it, expect } from 'vitest';
import fs from 'fs';

const places = fs.readFileSync('docs/reference/PLACES.md', 'utf8');
const credits = fs.readFileSync('CREDITS.md', 'utf8');
const photos = fs.readdirSync('docs/reference/places').filter(f => f.endsWith('.jpg'));

describe('place references', () => {
  it('credits every photo with its licence', () => {
    for (const f of photos) expect(credits, f).toMatch(new RegExp('`' + f.replace('.', '\\.') + '`: .* (CC|Public domain|public domain)'));
  });
  it('gives every place photos or a link', () => {
    const sections = places.split(/\n## /).slice(1).map(s => ({ slug: s.split(' ')[0], body: s }));
    expect(sections.length).toBeGreaterThanOrEqual(14);
    for (const s of sections) if (s.slug !== 'Interiors') expect(photos.some(f => f.startsWith(s.slug + '-')) || /https?:\/\//.test(s.body), s.slug).toBe(true);
    expect(photos.filter(f => f.startsWith('interior-')).length).toBeGreaterThanOrEqual(5);
  });
});
