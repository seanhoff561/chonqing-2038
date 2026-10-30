// M3-60, M3-66 (U-031, U-033): the open ground. Screenshots of a real park laid inside its outline (kerb, paths,
// trees) from a little above, and a path from a set-back door out to the street, from the street.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'layout');
  const ok = await page.evaluate(`(() => {
    const g = window.__cq.game, f = g.world.features.filter(q => q.kind === 'park').sort((a, b) => b.group - a.group)[1];
    if (!f) return false;
    g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
    Object.assign(g.state.player.pos, { x: f.x - 20, y: f.y + 14, z: f.z + 20 }); g.input.yaw = Math.atan2(20, -20); g.input.pitch = -0.45;
    window.__cq.runFrames(10);
    return true;
  })()`);
  if (ok) await screenshot(page, 'layout-park'); else fail('layout', 'no park');
  const path = await page.evaluate(`(() => {
    const g = window.__cq.game, gr = g.world.ground, s = g.world.streets.filter(q => q.kind === 'footway' && q.w === 1.8 && Math.hypot(q.pts[1][0] - q.pts[0][0], q.pts[1][1] - q.pts[0][1]) > 8)[5];
    if (!s) return false;
    const [[ax, az], [bx, bz]] = s.pts, l = Math.hypot(ax - bx, az - bz), x = bx + (bx - ax) / l * 2, z = bz + (bz - az) / l * 2;
    Object.assign(g.state.player.pos, { x, y: gr.y[Math.round(z / gr.cell) * gr.w + Math.round(x / gr.cell)] + 1.7, z });
    g.input.yaw = Math.atan2(bx - ax, bz - az); g.input.pitch = -0.1;
    window.__cq.runFrames(10);
    return true;
  })()`);
  if (path) await screenshot(page, 'layout-doorpath'); else fail('layout', 'no door path');
  await page.close();
}
