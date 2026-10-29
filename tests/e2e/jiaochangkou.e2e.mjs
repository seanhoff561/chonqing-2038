// M3-07 (M3-41c): the Jiaochangkou junction, and Line 2's beam with the stalled train along the Jialing bank.
export default async function ({ open, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'jiaochangkou');
  const at = (tp, dx, dy, dz, yaw, pitch) => page.evaluate(`(() => { const g = window.__cq.game, T = n => g.world.teleports.find(t => t.name === n), s = T("${tp}"); g.state.time = 11 * 3600; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: s.x + ${dx}, y: s.y + ${dy}, z: s.z + ${dz} }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(10); })()`);
  await at('jiaochangkou', 0, 4, 0, -2.17, 0.05);
  await screenshot(page, 'jiaochangkou');
  await at('Line 2 stalled train', 30, 6, 30, 0.785, -0.15);
  await screenshot(page, 'line2-beam');
  await page.close();
}
