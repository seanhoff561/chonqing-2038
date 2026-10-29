// M1-40: P pauses the game and shows the controls; the menu switches to the movement gym and jumps to an area.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'pause');
  await page.evaluate('window.__cq.runFrames(5)');
  await page.keyboard.press('KeyP');
  const shown = await page.evaluate(`getComputedStyle(document.getElementById('pause')).display !== 'none' && document.querySelector('#pause .pz-keys').textContent.includes('wall-run')`);
  if (!shown) fail('pause', 'P did not open the pause menu with the controls');
  const t0 = await page.evaluate('window.__cq.game.ticks');
  await new Promise(r => setTimeout(r, 400));
  const t1 = await page.evaluate('window.__cq.game.ticks');
  if (t1 !== t0) fail('pause', `sim kept running while paused (${t0} -> ${t1})`);
  await screenshot(page, 'pause');
  await page.click('#pause button[data-a="gym"]');
  const gym = await page.evaluate(`[window.__cq.game.scenario.name, location.search, [...document.querySelectorAll('#pause button[data-tp]')].map(b => b.textContent)]`);
  if (gym[0] !== 'gym' || !gym[1].includes('scenario=gym') || gym[2].length < 5) fail('pause', `gym switch: ${JSON.stringify(gym)}`);
  const i = gym[2].indexOf('bars over the pit');
  await page.click(`#pause button[data-tp="${i}"]`);
  await page.evaluate('window.__cq.runFrames(30)');
  const at = await page.evaluate(`(() => { const p = window.__cq.player().pos; return [document.getElementById('pause').style.display, Math.hypot(p.x + 41, p.z + 9.6)]; })()`);
  if (at[0] !== 'none' || !(at[1] < 1.5)) fail('pause', `area jump: ${JSON.stringify(at)}`);
  await page.close();
}
