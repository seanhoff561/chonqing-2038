// M2-16: looking up the vent shaft at night.
export default async function ({ open, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'vent');
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: 9.6, y: 0, z: 0.2 }); g.state.time = 23 * 3600; g.input.yaw = -1.3; g.input.pitch = 1.25; g.runFrames(200); })()`);
  await screenshot(page, 'vent-night');
  await page.close();
}
