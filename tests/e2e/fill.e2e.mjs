// M3-56 (U-022): three of the open spaces between buildings that stood empty in PT-008 (the biggest stretches of
// open ground on the marks, far apart), filled; seen from 12 m off at eye height.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'fill');
  const spots = await page.evaluate(`(() => {
    const mk = window.__cq.game.world.marks, all = [];
    for (let j = 4; j < mk.h - 4; j += 2) for (let i = 4; i < mk.w - 4; i += 2) {
      if (mk.m[j * mk.w + i] !== 4) continue;
      let n = 0;
      for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) n += mk.m[(j + b) * mk.w + i + a] === 4 ? 1 : 0;
      all.push({ n, x: (i + 0.5) * mk.cell, z: (j + 0.5) * mk.cell });
    }
    all.sort((a, b) => b.n - a.n);
    const out = [];
    for (const s of all) if (out.length < 3 && out.every(o => Math.hypot(o.x - s.x, o.z - s.z) > 300)) out.push(s);
    return out;
  })()`);
  if (spots.length < 3) fail('fill', `only ${spots.length} open spaces`);
  for (const [n, s] of spots.entries()) {
    await page.evaluate(`(() => {
      const g = window.__cq.game, hf = g.world.ground, hy = (x, z) => hf.y[Math.round(z / hf.cell) * hf.w + Math.round(x / hf.cell)];
      const dirs = [0, 1, 2, 3].map(k => [Math.cos(k * Math.PI / 2), Math.sin(k * Math.PI / 2)]).sort((a, b) => hy(${s.x} + a[0] * 12, ${s.z} + a[1] * 12) - hy(${s.x} + b[0] * 12, ${s.z} + b[1] * 12));
      const [dx, dz] = dirs[0], x = ${s.x} + dx * 12, z = ${s.z} + dz * 12;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      Object.assign(g.state.player.pos, { x, y: Math.max(hy(x, z), hy(${s.x}, ${s.z})) + 0.3, z });
      g.input.yaw = Math.atan2(dx, dz); g.input.pitch = -0.1;
      window.__cq.runFrames(10);
    })()`);
    console.log(`  fill ${n}: ${s.n} cells of open ground round ${s.x.toFixed(0)},${s.z.toFixed(0)}`);
    await screenshot(page, `fill-${n}`);
  }
}
