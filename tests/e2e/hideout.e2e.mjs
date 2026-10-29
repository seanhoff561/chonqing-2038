// M2-15: the hideout chamber.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'hideout');
  await page.evaluate('window.__cq.game.input.pitch = -0.05; window.__cq.runFrames(120)');
  const p = await page.evaluate('window.__cq.player()');
  if (!p.onGround || Math.abs(p.pos.y) > 0.01) fail('hideout', `not standing on the chamber floor: ${JSON.stringify(p.pos)}`);
  await screenshot(page, 'hideout');
  await page.close();
}
