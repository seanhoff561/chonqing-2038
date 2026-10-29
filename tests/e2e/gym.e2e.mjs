// M1-23: an overview of the gym yard.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1&dev=1', 'gym');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: 6, y: 14, z: 40 }); g.input.yaw = 0.1; g.input.pitch = -0.45; })()`);
  await page.evaluate('window.__cq.runFrames(2)');
  const n = await page.evaluate('window.__cq.game.world.labels.length');
  if (n < 15) fail('gym', `only ${n} labels`);
  await screenshot(page, 'gym-overview');
  await page.close();
}
