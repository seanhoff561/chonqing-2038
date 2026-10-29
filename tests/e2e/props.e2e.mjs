// M3-34 (U-014, U-016): the props library dressing a street, an alley, the junction plaza and the stalled Line 2
// train on the beam, each view within the Medium draw-call budget.
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=shibati&seed=1', 'props');
  const views = [['street', 330, 46.05, 310, -1.47, 0], ['alley', 328, 47.2, 322, -2.4, -0.25], ['plaza', 452, 46, 330, 0.3, -0.35], ['train', 345, 55, 304, -2.0, -0.12], ['train-inside', 362, 53.45, 310, -Math.PI / 2, 0]];
  for (const [name, x, y, z, yaw, pitch] of views) {
    const r = await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: ${x}, y: ${y}, z: ${z} }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(10); return g.view.renderer.info.render.calls; })()`);
    if (r > 300) fail('props', `${name}: ${r} draw calls`);
    await screenshot(page, `props-${name}`);
  }
  const n = await page.evaluate(`window.__cq.game.world.props.length`);
  if (n < 5000) fail('props', `only ${n} props in the city`);
  await page.close();
}
