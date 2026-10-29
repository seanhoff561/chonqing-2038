// M1-21: eye height follows posture.
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=1', 'camera');
  await page.evaluate('window.__cq.runFrames(30)');
  const stand = await page.evaluate('window.__cq.game.view.fp.cam.position.y');
  await page.keyboard.down('ControlLeft');
  await page.evaluate('window.__cq.runFrames(60)');
  const crouch = await page.evaluate('window.__cq.game.view.fp.cam.position.y');
  await page.keyboard.up('ControlLeft');
  if (Math.abs(stand - 1.62) > 0.05) fail('camera', `standing eye ${stand}`);
  if (Math.abs(crouch - 0.98) > 0.08) fail('camera', `crouched eye ${crouch}`);
  await page.close();
}
