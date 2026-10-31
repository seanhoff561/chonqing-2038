// U-025: New run in the pause menu, after a second click to confirm, drops the save and starts day 1 in the
// friends' hideout.
export default async function ({ open, fail }) {
  const page = await open('?scenario=run&seed=1', 'newrun');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time += 3 * 86400; localStorage.setItem('cq2038.save', JSON.stringify({ version: 7, scenario: 'run', savedAt: g.state.time, state: g.state })); window.__cq.runFrames(2); })()`);
  await page.keyboard.press('Equal');
  await page.click('#pause button[data-a="newrun"]');
  const asked = await page.evaluate(`document.querySelector('#pause button[data-a="newrun"]').textContent`);
  if (!asked.includes('Sure')) fail('newrun', `no confirmation: ${asked}`);
  await page.click('#pause button[data-a="newrun"]');
  await page.waitForFunction('window.__cq.game.state.time < 86400', { timeout: 240000 });
  const r = await page.evaluate(`(() => { const g = window.__cq.game; return { save: localStorage.getItem('cq2038.save'), shelters: g.state.shelters.map(h => h.id), menu: document.getElementById('pause').style.display }; })()`);
  if (r.save) fail('newrun', 'the old save is still there');
  if (r.shelters.join() !== 'airraid-mattress') fail('newrun', `not in the hideout: ${JSON.stringify(r)}`);
  if (r.menu !== 'none') fail('newrun', 'pause menu still open');
  await page.close();
}
