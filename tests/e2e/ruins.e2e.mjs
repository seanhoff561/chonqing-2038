// M3-56c, M3-61 (U-028, U-030, U-031): three spots where the fighting left its ruins: a section of the building beside
// each lying where it fell, seen from 9 m out past it, the building it came off behind it.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'ruins');
  const spots = await page.evaluate(`(() => {
    const w = window.__cq.game.world, hf = w.ground, hy = (x, z) => hf.y[Math.round(z / hf.cell) * hf.w + Math.round(x / hf.cell)], out = [];
    // (From level ground: where the ground 9 m out past it is near its own.)
    for (const f of w.features.filter(f => f.kind === 'fallen')) if (out.length < 3 && Math.abs(hy(f.x - f.nx * 9, f.z - f.nz * 9) - f.y) < 1.2 && out.every(q => Math.hypot(q.x - f.x, q.z - f.z) > 300)) out.push({ x: f.x, z: f.z, yaw: Math.atan2(f.nx, f.nz) - Math.PI / 2 });
    return out;
  })()`);
  if (spots.length < 3) fail('ruins', `only ${spots.length} fallen sections`);
  for (const [n, s] of spots.entries()) {
    await page.evaluate(`(() => {
      const g = window.__cq.game, hf = g.world.ground, hy = (x, z) => hf.y[Math.round(z / hf.cell) * hf.w + Math.round(x / hf.cell)];
      // Downhill of the wall (its +z turned by yaw is across it) and back a little, looking at it.
      const dx = Math.sin(${s.yaw} - Math.PI / 2), dz = Math.cos(${s.yaw} - Math.PI / 2), x = ${s.x} + dx * 9, z = ${s.z} + dz * 9;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      Object.assign(g.state.player.pos, { x, y: Math.max(hy(x, z), hy(${s.x}, ${s.z}) - 1) + 0.2, z });
      g.input.yaw = Math.atan2(dx, dz); g.input.pitch = -0.05;
      window.__cq.runFrames(10);
    })()`);
    console.log(`  ruins ${n}: a fallen section at ${s.x.toFixed(0)},${s.z.toFixed(0)}`);
    await screenshot(page, `ruins-${n}`);
  }
}
