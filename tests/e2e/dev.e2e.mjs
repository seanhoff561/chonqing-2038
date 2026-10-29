// M1-24: dev panel, teleports, seed parsing.
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=4242&dev=1', 'dev');
  if (!(await page.$('#dev'))) fail('dev', 'no dev panel');
  const seed = await page.evaluate('window.__cq.game.state.seed');
  if (seed !== 4242) fail('dev', `seed ${seed}`);
  await page.select('#dev .tp', '2');
  await page.evaluate('window.__cq.runFrames(5)');
  const z = await page.evaluate('window.__cq.player().pos.z');
  if (Math.abs(z - -12) > 1) fail('dev', `teleport went to z ${z}`);
  await page.click('#dev .noclip');
  const nc = await page.evaluate('window.__cq.game.state.flags.noclip');
  if (!nc) fail('dev', 'noclip toggle');
  await page.close();
}
