// M3-19: the Li family flat. An upper floor near the top of Shibati's stair, ransacked; on a run his father's badge
// and the cracked phone lie on its floor, he picks them up with F, and the phone plays its one voicemail.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { startRun } from '../../src/sim/run';
import { heightAt } from '../../src/world/heightfield';
import { districtAt } from '../../src/world/yuzhong/lots';
import { B } from '../../src/sim/types';
import { VOICEMAIL } from '../../src/data/dialogue';
import { run, aim, LMB } from './helpers';

const w = getWorld('yuzhong'), flat = w.teleports.find(t => t.name === 'Li family flat')!, top = w.teleports.find(t => t.name === 'Shibati top')!;
const things = w.features.filter(f => f.kind.startsWith('li:'));

describe('the Li family flat (M3-19)', () => {
  it('is an upper floor in Shibati near the top of the stair', () => {
    expect(flat).toBeTruthy();
    expect(districtAt(flat.x, flat.z).district).toBe('shibati');
    expect(flat.y - 1.5).toBeGreaterThan(heightAt(w.ground!, flat.x, flat.z)! + 2.5);
    expect(Math.hypot(flat.x - top.x, flat.z - top.z)).toBeLessThan(150);
  });
  it('has been turned over', () => {
    const near = w.props.filter(p => p.kind.startsWith('f:') && Math.hypot(p.x - flat.x, p.z - flat.z) < 5 && Math.abs(p.y - (flat.y - 1.5)) < 0.2);
    expect(near.filter(p => p.text === 'fallen').length).toBeGreaterThanOrEqual(4);
    for (const k of ['f:papers', 'f:clothes', 'f:books']) expect(near.some(p => p.kind === k), k).toBe(true);
  });
  it('holds his father\'s badge and the phone; picked up, the phone plays the voicemail', () => {
    expect(things.map(f => f.kind).sort()).toEqual(['li:badge', 'li:phone']);
    const s = createState(1, w);
    startRun(s, w);
    expect(s.dropped.map(d => d.stack.id).sort()).toEqual(['badge', 'phone']);
    for (const f of things) {
      teleport(s.player, flat.x, flat.y - 1.45, flat.z);
      run(s, w, 30);
      // Walk to it (straight across the room), look down at it, F.
      teleport(s.player, f.x + 0.7, f.y + 0.02, f.z);
      run(s, w, 10);
      aim(s, f.x, f.y + 0.1, f.z);
      run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
      run(s, w, 5);
    }
    const pack = s.inv.pack.items.map(i => i.id);
    expect(pack).toContain('badge');
    expect(pack).toContain('phone');
    // In hand, the left mouse plays it.
    const phone = s.inv.pack.items.find(i => i.id === 'phone')!;
    s.inv.hotbar[0] = phone.uid; s.inv.held = 1;
    const said: string[] = [];
    run(s, w, 1, { pressed: LMB, buttons: LMB }, st => { for (const e of st.events) if (e.t === 'say') said.push(e.id); });
    expect(said).toEqual(VOICEMAIL.map(l => l.id));
  });
});
