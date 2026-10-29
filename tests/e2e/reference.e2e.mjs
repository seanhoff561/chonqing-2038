// M3-23: the reference hillside from the vantage roof at the photo's framing (compare with docs/reference/look-01.jpg),
// and the pause menu offers it.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=reference&seed=1', 'reference');
  await page.setViewport({ width: 540, height: 652 });
  const r = await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; g.view.fp.baseFov = 30; g.input.yaw = 0; g.input.pitch = 0; window.__cq.runFrames(60); g.hands.group.visible = false; g.view.render(); return { y: g.view.fp.cam.position.y, mode: g.state.player.mode, calls: g.view.renderer.info.render.calls }; })()`);
  if (Math.abs(r.y - 34.62) > 0.05 || r.mode !== 'ground') fail('reference', `vantage eye ${r.y} ${r.mode}`);
  await screenshot(page, 'reference-vantage');
  await page.setViewport({ width: 960, height: 540 });
  await page.evaluate(`(() => { const g = window.__cq.game; g.view.fp.baseFov = 75; window.__cq.runFrames(10); })()`);
  await screenshot(page, 'reference-play');
  await page.evaluate(`window.__cq.game.switchTo('gym'); window.__cq.game.pause.show()`);
  const has = await page.evaluate(`!!document.querySelector('#pause button[data-a="game"]')`);
  await page.evaluate(`window.__cq.game.pause.resume(); window.__cq.game.switchTo('hideout'); window.__cq.game.pause.show()`);
  const ref = await page.evaluate(`!!document.querySelector('#pause button[data-a="reference"]')`);
  if (!has || !ref) fail('reference', 'pause menu lacks the reference hillside button');
  await page.close();
}
