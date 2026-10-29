// M3-22 (U-009): the reference look across the city, from two Shibati vantage points (compare with
// docs/reference/look-01.jpg); stays within the Medium budget.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'look');
  const views = [[500, 45, 560, 0.15, 0.05], [520, 62, 470, Math.PI * 0.85, -0.12]];
  for (const [i, [x, y, z, yaw, pitch]] of views.entries()) {
    const r = await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 11 * 3600; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: ${x}, y: ${y}, z: ${z} }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(10); const i = g.view.renderer.info.render; return { calls: i.calls, tris: i.triangles }; })()`);
    if (r.calls > 300 || r.tris > 1.5e6) fail('look', `view ${i}: ${r.calls} calls, ${r.tris} triangles`);
    await screenshot(page, `look-shibati-${i + 1}`);
  }
  await page.close();
}
