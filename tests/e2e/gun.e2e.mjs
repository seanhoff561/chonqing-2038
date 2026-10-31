// M4-21b: guns made real (U-032). The pistol in his hands; aimed down the sights it comes up to the eye and the view
// zooms; a shot flashes, runs the slide back and kicks the view; E leans him round to the right. A screenshot of each.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'gun');
  await page.waitForFunction('window.__cq.game.hands.ready', { timeout: 20000 });
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; Object.assign(g.state.player.pos, { x: -60, y: 0, z: 60 }); g.input.yaw = 0; g.input.pitch = 0;
    window.__cq.give('pistol'); const st = g.state.inv.pack.items.find(x => x.id === 'pistol'); st.charge = 15; g.input.cmds.push({ c: 'bind', slot: 0, uid: st.uid }); g.runFrames(2); })()`);
  await page.keyboard.press('Digit1');
  await page.evaluate('window.__cq.runFrames(30)');
  await screenshot(page, 'gun-hip');
  const fov0 = await page.evaluate('window.__cq.game.view.fp.cam.fov');
  // Aimed: right mouse held.
  await page.evaluate(`(() => { const g = window.__cq.game; g.input.mouse = 128; g.runFrames(40); })()`);
  const aimed = await page.evaluate(`(() => { const g = window.__cq.game, m = g.heldModel, s = m.getObjectByName('slide'); m.updateWorldMatrix(true, true);
    const p = s.getWorldPosition(new (g.view.fp.cam.position.constructor)()), c = p.clone().applyMatrix4(g.view.fp.cam.matrixWorldInverse); return { ads: g.gun.ads, fov: g.view.fp.cam.fov, x: c.x, y: c.y }; })()`);
  if (aimed.ads < 0.95) fail('gun', `aiming: ads ${aimed.ads.toFixed(2)}`);
  if (aimed.fov > fov0 * 0.7) fail('gun', `aiming: fov ${aimed.fov.toFixed(1)} from ${fov0}`);
  if (Math.abs(aimed.x) > 0.02 || Math.abs(aimed.y) > 0.08) fail('gun', `aiming: slide off the middle (${aimed.x.toFixed(3)}, ${aimed.y.toFixed(3)})`);
  await screenshot(page, 'gun-aimed');
  // A shot: the flash, the slide back, the view kicked.
  const shot = await page.evaluate(`(() => { const g = window.__cq.game; g.input.mouse = 128 | 64; g.input.pressed = 64; g.runFrames(2);
    const m = g.heldModel; return { flash: m.getObjectByName('flash').visible, slide: m.getObjectByName('slide').position.z, kick: g.state.player.kick, rounds: g.state.inv.pack.items.find(x => x.id === 'pistol').charge }; })()`);
  if (!shot.flash) fail('gun', 'no muzzle flash');
  if (shot.slide < -0.05) fail('gun', `slide didn't run back (${shot.slide})`);
  if (shot.kick <= 0.02) fail('gun', `no kick (${shot.kick})`);
  if (shot.rounds !== 14) fail('gun', `rounds ${shot.rounds}`);
  await screenshot(page, 'gun-fire');
  // Leaning right with E.
  await page.evaluate(`(() => { const g = window.__cq.game; g.input.mouse = 0; g.runFrames(30); })()`);
  await page.keyboard.down('KeyE');
  await page.evaluate('window.__cq.runFrames(40)');
  const lean = await page.evaluate(`(() => { const g = window.__cq.game; return { lean: g.state.player.lean, roll: g.view.fp.cam.rotation.z }; })()`);
  if (lean.lean < 0.9) fail('gun', `lean ${lean.lean.toFixed(2)}`);
  if (lean.roll > -0.08) fail('gun', `no tilt leaning (${lean.roll.toFixed(3)})`);
  await screenshot(page, 'gun-lean');
  await page.keyboard.up('KeyE');
  await page.close();
}
