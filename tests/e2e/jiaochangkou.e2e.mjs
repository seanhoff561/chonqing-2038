// M3-07: the Jiaochangkou junction with the Line 2 terminus, and the beam running west.
export default async function ({ open, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'jiaochangkou');
  const at = (x, y, z, yaw, pitch) => page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 11 * 3600; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: ${x}, y: ${y}, z: ${z} }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(10); })()`);
  await at(500, 47, 372, 0.35, 0.12);
  await screenshot(page, 'jiaochangkou');
  await at(466, 55, 310.4, Math.PI / 2, -0.15);
  await screenshot(page, 'line2-beam');
  await page.close();
}
