// M3-31 (U-014): no game action uses Esc. The backpack closes with Tab; the sleep menu with E, right-click or its
// stay-awake button; Esc opens nothing.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=1', 'menus');
  const shown = id => page.evaluate(`getComputedStyle(document.getElementById('${id}')).display !== 'none'`);
  await page.keyboard.press('Tab');
  await page.evaluate('window.__cq.runFrames(2)');
  if (!(await page.evaluate('window.__cq.game.inv.open'))) fail('menus', 'Tab did not open the backpack');
  await page.keyboard.press('Tab');
  await page.evaluate('window.__cq.runFrames(2)');
  if (await page.evaluate('window.__cq.game.inv.open')) fail('menus', 'Tab did not close the backpack');
  const sleepMenu = () => page.evaluate(`(() => { const g = window.__cq.game; g.sleep.toggle(true); })()`);
  await sleepMenu();
  await page.keyboard.press('KeyE');
  if (await shown('sleep')) fail('menus', 'E did not close the sleep menu');
  await sleepMenu();
  await page.mouse.click(480, 270, { button: 'right' });
  if (await shown('sleep')) fail('menus', 'right-click did not close the sleep menu');
  await sleepMenu();
  await page.click('#sleep .stay');
  if (await shown('sleep')) fail('menus', 'the stay-awake button did not close the sleep menu');
  await page.keyboard.press('Escape');
  await page.evaluate('window.__cq.runFrames(2)');
  if ((await page.evaluate('window.__cq.game.pause.open')) || (await page.evaluate('window.__cq.game.inv.open'))) fail('menus', 'Esc opened something');
  await page.close();
}
