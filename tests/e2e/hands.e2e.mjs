// M1-27: both hands gripping a ledge show at the grip; M1-31: every movement cue plays without errors.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'hands');
  // The 2.0 m mantle block: stand in front, look at the lip, hold both buttons.
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: -10.5, y: 0, z: -9.6 }); g.input.yaw = 0; g.input.pitch = 0.35; g.runFrames(5); })()`);
  await page.mouse.move(480, 270);
  await page.evaluate(`(() => { const g = window.__cq.game; g.input.mouse = 64 | 128; g.runFrames(20); })()`);
  const mode = await page.evaluate('window.__cq.player().mode');
  if (mode !== 'grip') fail('hands', `expected grip, got ${mode}`);
  const shown = await page.evaluate(`[...document.querySelectorAll('canvas.hand')].filter(c => c.style.display !== 'none' && c.dataset.pose === 'grip').length`);
  if (shown !== 2) fail('hands', `${shown} gripping hands shown`);
  await screenshot(page, 'hands-grip');
  await page.click('canvas');
  for (const id of await page.evaluate('window.__cq.cues()')) await page.evaluate(`window.__cq.playCue(${JSON.stringify(id)})`);
  await page.close();
}
