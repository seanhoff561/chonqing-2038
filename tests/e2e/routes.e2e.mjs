// M3-37, M3-76: the route network. Along a main route where it crosses between roofs (nothing marking the way, U-043),
// and where it runs through a sewer; and a cache's grappling anchor from the roof it's reached from.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'routes');
  const along = async (ways, name) => {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, w = g.world, want = ${JSON.stringify(ways)}, rt = w.routes.find(r => r.kind === 'main' && r.ways.some(x => want.includes(x)));
      if (!rt) return false;
      // A way's stretch: from where it leaves one node to where it reaches the next (two points a way, after the start).
      const k = rt.ways.findIndex(x => want.includes(x)), a = rt.pts[1 + 2 * k], b = rt.pts[2 + 2 * k];
      g.state.time = 15 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      if (!g.state.inv.pack.items.some(i => i.id === 'headlamp')) g.state.inv.pack.items.push({ uid: 9999, id: 'headlamp', n: 1, x: 7, y: 5, rot: false, charge: 100 });
      g.state.player.lamp = ${name === 'sewer' ? 1 : 0};
      Object.assign(g.state.player.pos, { x: a.x - (b.x - a.x) * 0.1, y: a.y + 0.1, z: a.z - (b.z - a.z) * 0.1 });
      g.input.yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z)); g.input.pitch = -0.15;
      window.__cq.runFrames(12);
      return true;
    })()`);
    if (!ok) fail('routes', `no route with ${ways}`);
    else await screenshot(page, `routes-${name}`);
  };
  await along(['crossBeam', 'crossPlank', 'line', 'jump'], 'crossing');
  await along(['sewer'], 'sewer');
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
