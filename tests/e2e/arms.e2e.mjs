// M1-22: arms show while hanging.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'arms');
  await page.evaluate(`(() => { const p = window.__cq.player(); Object.assign(p.pos, { x: -10.5, y: 0.25, z: -9.7 }); p.mode = 'air'; p.onGround = false; p.vel.y = 0; })()`);
  await page.keyboard.down('KeyW');
  await page.evaluate('window.__cq.runFrames(20)');
  await page.keyboard.up('KeyW');
  await page.evaluate('window.__cq.game.input.pitch = 0.5; window.__cq.runFrames(30)');
  const mode = await page.evaluate('window.__cq.player().mode');
  if (mode !== 'hang') fail('arms', `expected hang, got ${mode}`);
  await screenshot(page, 'hang');
  await page.close();
}
