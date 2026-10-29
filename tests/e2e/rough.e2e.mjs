// M3-27 (U-013): a new run starts in Shibati with supplies in the backpack and no shelter; holding E on open
// floor opens the rough-sleep menu, and sleeping rough saves the run.
export default async function ({ open, fail }) {
  const page = await open('?scenario=run&seed=3', 'rough');
  await page.evaluate('localStorage.clear()');
  const start = await page.evaluate(`(() => { const s = window.__cq.game.state; return { n: s.inv.pack.items.length, shelter: s.shelter.id, y: s.player.pos.y }; })()`);
  if (start.n < 5 || start.shelter !== '') fail('rough', `start ${JSON.stringify(start)}`);
  await page.evaluate(`(() => { const g = window.__cq.game; g.input.pitch = -1.2; window.__cq.runFrames(20); })()`);
  await page.keyboard.down('KeyE');
  for (let i = 0; i < 12; i++) await page.evaluate('window.__cq.runFrames(10)');
  await page.keyboard.up('KeyE');
  const menu = await page.evaluate(`getComputedStyle(document.getElementById('sleep')).display !== 'none' && document.getElementById('sleep').textContent.includes('ROUGH')`);
  if (!menu) fail('rough', 'holding E did not open the rough-sleep menu');
  await page.evaluate(`(() => { const g = window.__cq.game; g.input.cmds.push({ c: 'act', name: 'sleep', arg: 12 }); g.sleep.toggle(false); g.runFrames(2); })()`);
  const saved = await page.evaluate(`JSON.parse(localStorage.getItem('cq2038.save') || 'null')`);
  if (!saved || saved.scenario !== 'run') fail('rough', 'sleeping rough did not save the run');
  await page.evaluate('localStorage.clear()');
  await page.close();
}
