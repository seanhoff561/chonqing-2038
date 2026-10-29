// M3-06 (M3-41c): the Eighteen Stairs on the real map, looking down from the top and up from halfway down.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'shibati');
  const at = (dx, dy, dz, yaw, pitch) => page.evaluate(`(() => { const g = window.__cq.game, T = n => g.world.teleports.find(t => t.name === n), s = T('shibati'); g.state.time = 12 * 3600; const p = g.state.player; Object.assign(p.pos, { x: s.x + ${dx}, y: s.y - 1.45 + ${dy}, z: s.z + ${dz} }); p.fallFrom = p.pos.y; g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(40); return p.mode; })()`);
  if ((await at(0, 0, 0, 2.42, -0.15)) !== 'ground') fail('shibati', 'not standing at the top of the stairs');
  await screenshot(page, 'shibati-top');
  // Drop onto the stairs halfway down (god mode for the landing), then look back up.
  await page.evaluate('window.__cq.game.state.flags.god = true');
  await at(-30, 6, 35, -0.72, 0.12);
  await page.evaluate('window.__cq.runFrames(150)');
  await screenshot(page, 'shibati-up');
  await page.close();
}
