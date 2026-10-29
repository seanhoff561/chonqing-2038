// M3-22 (U-009): the look across the city from Shibati toward Jiefangbei and from Jiaochangkou over Shibati
// (compare with docs/reference/look-01.jpg); stays within the Medium budget.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'look');
  const views = [['shibati', 25, -0.585, 0.05], ['jiaochangkou', 30, -2.17, -0.12]];
  for (const [i, [name, up, yaw, pitch]] of views.entries()) {
    const r = await page.evaluate(`(() => { const g = window.__cq.game, T = n => g.world.teleports.find(t => t.name === n), s = T('${name}'); g.state.time = 11 * 3600; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: s.x, y: s.y + ${up}, z: s.z }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(10); const i = g.view.renderer.info.render; return { calls: i.calls, tris: i.triangles }; })()`);
    if (r.calls > 300 || r.tris > 1.5e6) fail('look', `view ${i}: ${r.calls} calls, ${r.tris} triangles`);
    await screenshot(page, `look-shibati-${i + 1}`);
  }
  await page.close();
}
