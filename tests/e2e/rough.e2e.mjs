// M3-27 (U-013): a new run has supplies in the backpack (and since U-018 starts in the friends' hideout); out in
// the street, holding E on open floor opens the rough-sleep menu, and sleeping rough saves the run.
export default async function ({ open, fail }) {
  const page = await open('?scenario=run&seed=3', 'rough');
  await page.evaluate('localStorage.clear()');
  const start = await page.evaluate(`(() => { const s = window.__cq.game.state; return { n: s.inv.pack.items.length, shelters: s.shelters.map(h => h.id) }; })()`);
  if (start.n < 5 || start.shelters.join() !== 'airraid-mattress') fail('rough', `start ${JSON.stringify(start)}`);
  await page.evaluate(`(() => { const g = window.__cq.game, T = n => g.world.teleports.find(t => t.name === n), s = T('jiaochangkou'); Object.assign(g.state.player.pos, { x: s.x, y: s.y - 1.45, z: s.z }); g.input.pitch = -1.2; window.__cq.runFrames(20); })()`);
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
