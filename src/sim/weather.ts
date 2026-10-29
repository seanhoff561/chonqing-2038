// Weather (M3-12): a seeded schedule of fog and rain, a pure function of the run seed and the hour, so it
// costs no sim randomness and every save sees the same skies. Chongqing is the fog city: most mornings start
// in fog, some in thick fog; rain comes in spells of one to five hours.
import type { SimState } from './types';
import { makeRng, rand, randInt, hashString } from './rng';
import { dayOf, hourOf } from './clock';

export interface Weather { fog: number; rain: number }

const W = { morningFog: 0.65, heavyFog: 0.3, fogEnd: [9, 12], spells: [0, 2], spellLen: [1, 5], rainyDay: 0.45 };

interface Day { fog: number; fogEnd: number; spells: { start: number; end: number; rain: number }[] }

function day(seed: number, d: number): Day {
  const r = makeRng(hashString(`weather:${seed}:${d}`));
  const foggy = rand(r) < W.morningFog;
  const fog = foggy ? (rand(r) < W.heavyFog ? 0.85 + rand(r) * 0.15 : 0.35 + rand(r) * 0.3) : 0.05 + rand(r) * 0.1;
  const fogEnd = W.fogEnd[0] + rand(r) * (W.fogEnd[1] - W.fogEnd[0]);
  const spells: Day['spells'] = [];
  if (rand(r) < W.rainyDay) {
    for (let i = 0, n = 1 + randInt(r, W.spells[1]); i < n; i++) {
      const start = rand(r) * 24, len = W.spellLen[0] + rand(r) * (W.spellLen[1] - W.spellLen[0]);
      spells.push({ start, end: start + len, rain: 0.3 + rand(r) * 0.7 });
    }
  }
  return { fog, fogEnd, spells };
}

/** Fog and rain at a game time, 0 to 1, easing in and out over an hour. */
export function weatherAt(seed: number, time: number): Weather {
  const d = dayOf(time), h = hourOf(time), today = day(seed, d), ease = (x: number) => Math.max(0, Math.min(1, x));
  // Night and morning fog thickens from midnight and burns off by late morning; a little haze all day.
  const fog = h < today.fogEnd ? today.fog * ease(today.fogEnd - h) : today.fog * 0.15;
  let rain = 0;
  for (const s of today.spells) rain = Math.max(rain, s.rain * ease(Math.min(h - s.start, s.end - h) + 0.5));
  // Rain thickens the air too.
  return { fog: Math.max(fog, rain * 0.4), rain };
}

export function stepWeather(s: SimState) {
  const w = weatherAt(s.seed, s.time);
  s.weather.fog = w.fog;
  s.weather.rain = Math.max(w.rain, s.flags.rain);
}
