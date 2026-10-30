// M3-37: the route network. Looking along a main route where it crosses a street, its rags and worn path on the
// roof; and a cache's grappling anchor from the roof it's reached from.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'routes');
  const ok = await page.evaluate(`(() => {
    const g = window.__cq.game, w = g.world, rt = w.routes.find(r => r.kind === 'main' && r.ways.includes('crossCord')) ?? w.routes[0];
    if (!rt) return false;
    const k = rt.ways.findIndex(x => x === 'crossCord' || x === 'crossBeam' || x === 'crossPlank'), a = rt.pts[Math.max(0, 2 * k - 1)], b = rt.pts[2 * k + 1];
    g.state.time = 15 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
    Object.assign(g.state.player.pos, { x: a.x - (b.x - a.x) * 0.15, y: a.y + 0.6, z: a.z - (b.z - a.z) * 0.15 });
    g.input.yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z)); g.input.pitch = -0.25;
    window.__cq.runFrames(12);
    return true;
  })()`);
  if (!ok) fail('routes', 'no route');
  else await screenshot(page, 'routes-crossing');
  const gate = await page.evaluate(`(() => {
    const g = window.__cq.game, q = g.world.gates[0];
    if (!q) return false;
    Object.assign(g.state.player.pos, { x: q.from.x, y: q.from.y, z: q.from.z });
    g.input.yaw = Math.atan2(-(q.x - q.from.x), -(q.z - q.from.z)); g.input.pitch = -0.05;
    window.__cq.runFrames(12);
    return true;
  })()`);
  if (!gate) fail('routes', 'no gate');
  else await screenshot(page, 'routes-gate');
  await page.close();
}
