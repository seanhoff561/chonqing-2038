// M1-37: 3D hands load and pose (idle, gripping); M1-31: every movement cue plays without errors.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'hands');
  await page.waitForFunction('window.__cq.game.hands.ready', { timeout: 20000 }).catch(() => fail('hands', 'hand models did not load'));
  await page.evaluate('window.__cq.game.state.time = 12 * 3600; window.__cq.runFrames(30)');
  await screenshot(page, 'hands-idle');
  // The 2.0 m mantle block: stand in front, look at the lip, hold both buttons.
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: -10.5, y: 0, z: -9.6 }); g.input.yaw = 0; g.input.pitch = 0.35; g.runFrames(5); })()`);
  await page.evaluate(`(() => { const g = window.__cq.game; g.runFrames(20); })()`);
  await screenshot(page, 'hands-ready');
  await page.evaluate(`(() => { const g = window.__cq.game; g.input.mouse = 64 | 128; g.runFrames(30); })()`);
  const mode = await page.evaluate('window.__cq.player().mode');
  if (mode !== 'grip') fail('hands', `expected grip, got ${mode}`);
  await screenshot(page, 'hands-grip');
  await page.click('canvas');
  for (const id of await page.evaluate('window.__cq.cues()')) await page.evaluate(`window.__cq.playCue(${JSON.stringify(id)})`);
  await page.close();
}
