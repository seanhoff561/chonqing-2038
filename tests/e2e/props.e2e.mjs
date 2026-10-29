// M3-34 (U-014, U-016): the props library dressing a street, Shibati's stairs, the street over the hideout and the
// stalled Line 2 train on the beam, each view within the Medium draw-call budget.
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=shibati&seed=1', 'props');
  // [shot, teleport, offset x, y, z from it, yaw, pitch]
  const views = [['street', 'jiaochangkou', 0, -1.45, 0, 0, 0], ['alley', 'shibati', 0, -1.45, 0, 2.42, -0.25], ['plaza', "Friends' hideout (vent grate)", 0, 18, 0, 0.3, -0.6],
    ['train', 'Line 2 stalled train', 12, 2, 12, 0.785, -0.12], ['train-inside', 'Line 2 stalled train', 0, 0, 0, null, 0]];
  for (const [name, tp, dx, dy, dz, yaw, pitch] of views) {
    const r = await page.evaluate(`(() => { const g = window.__cq.game, T = n => g.world.teleports.find(t => t.name === n), s = T("${tp}"); g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: s.x + ${dx}, y: s.y + ${dy}, z: s.z + ${dz} }); g.input.yaw = ${yaw ?? 's.yaw'}; g.input.pitch = ${pitch}; window.__cq.runFrames(10); return g.view.renderer.info.render.calls; })()`);
    if (r > 300) fail('props', `${name}: ${r} draw calls`);
    await screenshot(page, `props-${name}`);
  }
  const n = await page.evaluate(`window.__cq.game.world.props.length`);
  if (n < 5000) fail('props', `only ${n} props in the city`);
  await page.close();
}
