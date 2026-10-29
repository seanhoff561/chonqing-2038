// M2-24: death deletes the save and shows the death screen with New run.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=9', 'death');
  await page.evaluate(`localStorage.setItem('cq2038.save', JSON.stringify({ version: 1, scenario: 'hideout', savedAt: 0, state: window.__cq.game.state }))`);
  await page.evaluate(`window.__cq.kill('fall'); window.__cq.runFrames(2)`);
  if (!(await page.$('#death .d-new'))) fail('death', 'no death screen');
  const save = await page.evaluate(`localStorage.getItem('cq2038.save')`);
  if (save) fail('death', 'save not deleted');
  await screenshot(page, 'death');
  await page.close();
}
