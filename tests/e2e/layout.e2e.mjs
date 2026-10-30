// M3-60 (U-031): open ground with structure. Screenshots of a park (kerbed lawns, paths, trees, benches), a parking
// lot (marked bays, cars in them) and a plaza (paving, planters, food stalls), each from a little above, and a
// walkway's kerbed edge.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'layout');
  for (const kind of ['park', 'parking', 'plaza']) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, w = g.world, bays = w.features.filter(q => q.kind === 'bay');
      // The parking lot with the most bays; the third-biggest park; the biggest plaza.
      const score = q => '${kind}' === 'parking' ? bays.filter(b => Math.hypot(b.x - q.x, b.z - q.z) < 25).length : q.group;
      const f = w.features.filter(q => q.kind === '${kind}').sort((a, b) => score(b) - score(a))[${kind === 'park' ? 2 : 0}];
      if (!f) return false;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      // The park from a little above at an angle; the lot and the plaza from overhead.
      if ('${kind}' === 'park') { Object.assign(g.state.player.pos, { x: f.x - 14, y: f.y + 9, z: f.z + 14 }); g.input.yaw = Math.atan2(14, -14); g.input.pitch = -0.45; }
      else { Object.assign(g.state.player.pos, { x: f.x, y: f.y + 20, z: f.z + 12 }); g.input.yaw = 0; g.input.pitch = -1.0; }
      window.__cq.runFrames(10);
      return true;
    })()`);
    if (!ok) { fail('layout', `no ${kind}`); continue; }
    await screenshot(page, `layout-${kind}`);
  }
  await page.close();
}
