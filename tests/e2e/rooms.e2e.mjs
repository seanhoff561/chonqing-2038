// M3-38 (U-014): rooms with variety. Inside five kinds of room on the hollow blocks' floors: a flat's living
// room, a bedroom, a kitchen, a shop and a restaurant, each furnished from its template in some state of decay.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'rooms');
  for (const kind of ['living', 'bedroom', 'kitchen', 'shop', 'restaurant', 'office', 'workshop']) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, s = g.state.player.pos, all = g.world.features.filter(q => q.kind === 'inside:${kind}');
      // The one nearest Jiefangbei's teleport (so the shot is in the built-up centre).
      const t = g.world.teleports[0], f = all.sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z))[3];
      if (!f) return false;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      Object.assign(s, { x: f.x, y: f.y, z: f.z });
      g.input.yaw = Math.atan2(-f.nx, -f.nz); g.input.pitch = -0.3;
      window.__cq.runFrames(10);
      return true;
    })()`);
    if (!ok) { if (['living', 'bedroom', 'kitchen', 'shop', 'restaurant'].includes(kind)) fail('rooms', `no ${kind}`); continue; }
    await screenshot(page, `rooms-${kind}`);
  }
  await page.close();
}
