// M3-06: the Shibati stair street, looking down from the top and up from a landing.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'shibati');
  const at = (x, y, z, yaw, pitch) => page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; const p = g.state.player; Object.assign(p.pos, { x: ${x}, y: ${y}, z: ${z} }); p.fallFrom = ${y}; g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(40); return p.mode; })()`);
  if ((await at(470, 44.1, 404, Math.PI, -0.15)) !== 'ground') fail('shibati', 'not standing at the top of the stair street');
  await screenshot(page, 'shibati-top');
  // Drop onto the stair halfway down (god mode for the landing), then look back up.
  await page.evaluate('window.__cq.game.state.flags.god = true');
  await at(470, 60, 486, 0, 0.12);
  await page.evaluate('window.__cq.runFrames(150)');
  await screenshot(page, 'shibati-up');
  await page.close();
}
