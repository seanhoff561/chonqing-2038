// M2-18: the stash opens beside the backpack and items drag between them.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'stash');
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: 12.6, y: 0, z: 0.2 }); g.input.yaw = -2.75; g.input.pitch = -0.6; g.runFrames(5); })()`);
  const target = await page.evaluate('window.__cq.game.state.target');
  if (target !== 'stash') fail('stash', `looking at ${target}`);
  await page.evaluate(`window.__cq.give('crowbar')`);
  await page.keyboard.down('KeyE');
  await page.evaluate('window.__cq.runFrames(3)');
  await page.keyboard.up('KeyE');
  await page.evaluate('window.__cq.runFrames(2)');
  const panels = await page.$$('#inv .inv-panel');
  if (panels.length !== 2) { fail('stash', `${panels.length} panels`); await page.close(); return; }
  const dims = await page.evaluate('[window.__cq.game.state.containers.stash.w, window.__cq.game.state.containers.stash.h]');
  if (dims[0] !== 10 || dims[1] !== 8) fail('stash', `stash is ${dims}`);
  const item = await page.$('#inv .inv-panel .inv-item');
  const gridB = await page.$$('#inv .inv-grid');
  const a = await item.boundingBox(), b = await gridB[1].boundingBox();
  await page.mouse.move(a.x + 8, a.y + 8);
  await page.mouse.down();
  await page.mouse.move(b.x + 30, b.y + 30, { steps: 5 });
  await page.mouse.up();
  await page.evaluate('window.__cq.runFrames(2)');
  const ids = await page.evaluate('window.__cq.game.state.containers.stash.items.map(i => i.id)');
  if (!ids.includes('crowbar')) fail('stash', `stash holds ${ids}`);
  await screenshot(page, 'stash');
  await page.close();
}
