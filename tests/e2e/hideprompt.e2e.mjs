// U-021: a hiding spot in reach shows its prompt like everything else he can use; the sleep menu opened by
// holding E stays open until E is pressed again.
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym', 'hideprompt');
  const text = await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: -7.7, y: 0.05, z: 25.6 }); g.input.yaw = 0; g.input.pitch = -0.3; window.__cq.runFrames(10); return document.querySelector('#hud .prompt, .prompt').textContent; })()`);
  if (!/Hide/.test(text)) fail('hideprompt', `no hide prompt by the gym's box: "${text}"`);
  // Hold E on open floor until the rough-sleep menu opens, then a key repeat of E must not close it.
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: 0, y: 0.05, z: 0 }); g.input.pitch = -1.2; window.__cq.runFrames(10); })()`);
  await page.keyboard.down('KeyE');
  for (let i = 0; i < 12; i++) await page.evaluate('window.__cq.runFrames(10)');
  await page.evaluate(`dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', repeat: true }))`);
  const stillOpen = await page.evaluate(`getComputedStyle(document.getElementById('sleep')).display !== 'none'`);
  if (!stillOpen) fail('hideprompt', 'a held E closed the sleep menu');
  await page.keyboard.up('KeyE');
  await page.close();
}
