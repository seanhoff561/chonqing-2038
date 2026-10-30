// M3-10: chunk meshes and canvas textures (facades by day, lit windows by night); M3-11: draw calls stay
// within the Medium budget (300) at three viewpoints in Shibati and Jiaochangkou, far chunks hidden past the fog.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'chunks');
  const view = (name, dy, yaw, pitch, hour) => page.evaluate(`(() => { const g = window.__cq.game, T = n => g.world.teleports.find(t => t.name === n), s = T("${name}"); g.state.time = ${hour} * 3600; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: s.x, y: s.y + ${dy}, z: s.z }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(10); const i = g.view.renderer.info.render; return { calls: i.calls, tris: i.triangles, fog: g.view.scene.fog.far }; })()`);
  const points = [['shibati', 30, 2.42, -0.25], ['jiaochangkou', 0.5, 0, -0.1], ['Grand Tunnel entrance', 1, 0.76, 0.1]];
  for (const [i, p] of points.entries()) {
    const r = await view(...p, 12);
    if (r.calls > 300) fail('chunks', `viewpoint ${i}: ${r.calls} draw calls`);
    if (r.tris > 1.5e6) fail('chunks', `viewpoint ${i}: ${r.tris} triangles`);
    if (i === 0) await screenshot(page, 'facades-day');
  }
  // (Chunk meshes sit in 256 m cells since M3-53, each cell a group with a rect.)
  const meshes = await page.evaluate('window.__cq.game.view.world.children.filter(c => c.userData.rect).reduce((a, c) => a + c.children.length, 0)');
  if (meshes < 50) fail('chunks', `only ${meshes} chunk meshes`);
  await view(...points[0], 21);
  await screenshot(page, 'facades-night');
  await page.close();
}
