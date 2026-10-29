// M1-38: held items show in the right hand as 3D models.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'held');
  await page.waitForFunction('window.__cq.game.hands.ready', { timeout: 20000 });
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; Object.assign(g.state.player.pos, { x: -60, y: 0, z: 60 }); g.input.yaw = 0; })()`);
  for (const [i, id] of ['crowbar', 'water', 'pistol'].entries()) {
    await page.evaluate(`(() => { const g = window.__cq.game; window.__cq.give('${id}'); const st = g.state.inv.pack.items.find(x => x.id === '${id}'); g.input.cmds.push({ c: 'bind', slot: ${i}, uid: st.uid }); g.runFrames(2); })()`);
    await page.keyboard.press('Digit' + (i + 1));
    await page.evaluate('window.__cq.runFrames(30)');
    const n = await page.evaluate('window.__cq.game.hands.heldSlot(1).children.length');
    if (n !== 1) fail('held', `${id}: ${n} models in hand`);
    await screenshot(page, `held-${id}`);
  }
  await page.close();
}
