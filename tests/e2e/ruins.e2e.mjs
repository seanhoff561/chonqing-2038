// M3-56c (U-028, U-030): three spots where the fighting left its ruins: the tallest broken walls (each a collapsed
// building's corner), seen from 9 m off downhill at eye height.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'ruins');
  const spots = await page.evaluate(`(() => {
    const w = window.__cq.game.world, walls = w.props.filter(p => p.kind === 'halfwall').sort((a, b) => (b.h || 0) - (a.h || 0)), out = [];
    for (const p of walls) if (out.length < 3 && out.every(q => Math.hypot(q.x - p.x, q.z - p.z) > 300)) out.push({ x: p.x, z: p.z, yaw: p.yaw, h: p.h });
    return out;
  })()`);
  if (spots.length < 3) fail('ruins', `only ${spots.length} collapsed buildings`);
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
    console.log(`  ruins ${n}: a ${s.h.toFixed(1)} m wall at ${s.x.toFixed(0)},${s.z.toFixed(0)}`);
    await screenshot(page, `ruins-${n}`);
  }
}
