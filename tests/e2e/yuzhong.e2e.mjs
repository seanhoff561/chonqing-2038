// M3-41b (D-016): Yuzhong at 1:1: from the air over the Yangtze, at Jiefangbei and in a street, within the Medium
// budget (300 calls, 1.5 M triangles); the world builds in its time budget.
export default async function ({ open, screenshot, fail }) {
  const t0 = Date.now();
  const page = await open('?scenario=yuzhong&seed=1', 'yuzhong');
  const boot = Date.now() - t0;
  const views = [['air', 1500, 520, 2700, 0.34, -0.38], ['jiefangbei', 906, 126, 1510, 0, 0], ['street', 1180, 74, 2056, 2.2, -0.05]];
  for (const [name, x, y, z, yaw, pitch] of views) {
    const r = await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: ${x}, y: ${y}, z: ${z} }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(8); const i = g.view.renderer.info.render; return { calls: i.calls, tris: i.triangles }; })()`);
    if (r.calls > 300 || r.tris > 1.5e6) fail('yuzhong', `${name}: ${r.calls} calls, ${r.tris} triangles`);
    await screenshot(page, `yuzhong-${name}`);
  }
  // Headless (software GL) boot is several times a real GPU's; this only catches a runaway.
  if (boot > 90000) fail('yuzhong', `boot took ${boot} ms`);
  await page.close();
}
