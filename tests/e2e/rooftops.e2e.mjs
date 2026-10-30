// M3-80 (U-044): urban rooftops from above: tanks, drums, condensers, sheds, crates and heaters, no gardens.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'rooftops');
  const r = await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player.pos; g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; p.y += 45; g.input.yaw = 0.4; g.input.pitch = -1.0; window.__cq.runFrames(10); const i = g.view.renderer.info.render; return { calls: i.calls, tris: i.triangles }; })()`);
  if (r.calls > 300 || r.tris > 1.5e6) fail('rooftops', `${r.calls} calls, ${r.tris} triangles`);
  await screenshot(page, 'rooftops');
  await page.close();
}
