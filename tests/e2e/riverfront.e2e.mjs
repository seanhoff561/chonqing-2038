// M3-20: the riverfront below Shibati: the machines' prefab wall along the road, a panel down, the steps to the river.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'riverfront');
  const ok = await page.evaluate(`(() => { const g = window.__cq.game, w = g.world, b = w.features.find(f => f.kind === 'river:breach');
    if (!b) return false;
    Object.assign(g.state.flags, { clear: true, noclip: true }); g.state.time = 15 * 3600;
    // On the road, 6 m back from the wall and along it, looking at the gap.
    const ux = -b.nz, uz = b.nx, x = b.x - b.nx * 6 + ux * 8, z = b.z - b.nz * 6 + uz * 8, dx = b.x - x, dz = b.z - z;
    Object.assign(g.state.player.pos, { x, y: b.y + 0.3, z }); g.input.yaw = Math.atan2(-dx, -dz); g.input.pitch = -0.05;
    window.__cq.runFrames(30); return true; })()`);
  if (!ok) fail('riverfront', 'no breach in the wall');
  await screenshot(page, 'riverfront');
  await page.close();
}
