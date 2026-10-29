// M2-23: waking writes the save; a reload offers Continue and restores the run.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=5', 'save');
  await page.evaluate(`localStorage.clear()`);
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: 3.4, y: 0, z: 0.2 }); g.input.yaw = 2.33; g.input.pitch = -0.7; g.runFrames(5); })()`);
  const t = await page.evaluate('window.__cq.game.state.target');
  if (t !== 'mattress') { fail('save', `target ${t}`); await page.close(); return; }
  await page.evaluate(`(() => { const g = window.__cq.game; g.input.cmds.push({ c: 'act', name: 'sleep', arg: 6 }); g.runFrames(2); })()`);
  const saved = await page.evaluate(`JSON.parse(localStorage.getItem('cq2038.save') || 'null')`);
  if (!saved || saved.state.seed !== 5) { fail('save', 'no save written on waking'); await page.close(); return; }
  await page.goto(page.url().split('?')[0], { waitUntil: 'load' });
  await page.waitForFunction('window.__cq && window.__cq.ready');
  const btn = await page.$('#boot .cont');
  if (!btn) { fail('save', 'no Continue on boot'); await page.close(); return; }
  await btn.click();
  const s = await page.evaluate('[window.__cq.game.state.seed, window.__cq.game.state.time]');
  if (s[0] !== 5 || s[1] !== saved.state.time) fail('save', `continued ${s}`);
  await page.evaluate(`localStorage.clear()`);
  await page.close();
}
