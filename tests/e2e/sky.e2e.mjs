// M2-02: sky follows the clock.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'sky');
  const bg = h => page.evaluate(`(() => { const g = window.__cq.game; g.state.time = ${h} * 3600; g.runFrames(1); return g.view.scene.background.getHSL({}).l; })()`);
  const noon = await bg(12);
  await screenshot(page, 'sky-noon');
  const night = await bg(24);
  await screenshot(page, 'sky-midnight');
  if (!(noon > 0.3 && night < 0.05)) fail('sky', `lightness noon ${noon} midnight ${night}`);
  await page.close();
}
