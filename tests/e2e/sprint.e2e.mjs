// M1-29: sprinting reads clearly (FOV kick).
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=1', 'sprint');
  await page.evaluate('Object.assign(window.__cq.player().pos, { x: -60, y: 0, z: 60 }); window.__cq.game.input.yaw = 0; window.__cq.runFrames(5)');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 20; i++) await page.evaluate('window.__cq.runFrames(3)');
  const jog = await page.evaluate('window.__cq.game.view.fp.cam.fov');
  await page.keyboard.down('ShiftLeft');
  for (let i = 0; i < 30; i++) await page.evaluate('window.__cq.runFrames(3)');
  const sprint = await page.evaluate('window.__cq.game.view.fp.cam.fov');
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  if (!(sprint - jog >= 6)) fail('sprint', `fov jog ${jog} sprint ${sprint}`);
  await page.close();
}
