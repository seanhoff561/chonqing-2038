// M3-56b (U-028): the green city: a park, a wooded bank and grass on open ground, each where its marks gather
// thickest, seen from 14 m off at eye height.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'green');
  for (const [name, kind] of [['park', 3], ['wood', 2], ['verge', 4]]) {
    const r = await page.evaluate(`(() => {
      const g = window.__cq.game, w = g.world, mk = w.marks, hf = w.ground;
      if (!mk) return null;
      const hy = (x, z) => hf.y[Math.round(z / hf.cell) * hf.w + Math.round(x / hf.cell)];
      // The cell with the most of its kind round it (a 9 x 9 window), on every third cell for speed.
      let best = null;
      for (let j = 4; j < mk.h - 4; j += 3) for (let i = 4; i < mk.w - 4; i += 3) {
        if (mk.m[j * mk.w + i] !== ${kind}) continue;
        let n = 0;
        for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) n += mk.m[(j + b) * mk.w + i + a] === ${kind} ? 1 : 0;
        if (!best || n > best.n) best = { n, x: (i + 0.5) * mk.cell, z: (j + 0.5) * mk.cell };
      }
      if (!best) return null;
      // Stand 14 m off on the side with the lowest ground, looking back at it.
      const dirs = [0, 1, 2, 3].map(k => [Math.cos(k * Math.PI / 2), Math.sin(k * Math.PI / 2)]);
      const [dx, dz] = dirs.sort((a, b) => hy(best.x + a[0] * 14, best.z + a[1] * 14) - hy(best.x + b[0] * 14, best.z + b[1] * 14))[0];
      const x = best.x + dx * 14, z = best.z + dz * 14;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      Object.assign(g.state.player.pos, { x, y: Math.max(hy(x, z), hy(best.x, best.z)) + 0.4, z });
      g.input.yaw = Math.atan2(dx, dz); g.input.pitch = -0.12;
      window.__cq.runFrames(10);
      return best;
    })()`);
    if (!r) { fail('green', `no ${name} marked`); continue; }
    console.log(`  green ${name}: ${r.n} cells of it round ${r.x.toFixed(0)},${r.z.toFixed(0)}`);
    await screenshot(page, `green-${name}`);
  }
}
