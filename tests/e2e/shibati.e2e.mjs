// M3-06 (M3-41c): the Eighteen Stairs on the real map, looking down from the top and up from halfway down; M3-14:
// down them at night, the signs lit, and a sign close up.
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
  // The same view at night, clear: the signs lit (M3-14).
  await page.evaluate('Object.assign(window.__cq.game.state.flags, { clear: true, noclip: true }); window.__cq.game.state.time = 22 * 3600; window.__cq.runFrames(30)');
  await screenshot(page, 'shibati-night');
  // A shop's sign close up, four metres out in front of it, its characters readable.
  const close = (kind, place) => page.evaluate(`(() => { const g = window.__cq.game, s = g.world.teleports.find(t => t.name === '${place}'), p = g.state.player;
    const near = g.world.props.filter(q => q.kind === '${kind}' && !(q.text || '').startsWith('lantern')).sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
    if (!near) return false;
    const fx = Math.sin(near.yaw), fz = Math.cos(near.yaw), d = 4;
    Object.assign(p.pos, { x: near.x + fx * d - fz * 1.5, y: near.y - 1.2, z: near.z + fz * d + fx * 1.5 });
    g.input.yaw = Math.atan2(fx - fz * 0.4, fz + fx * 0.4); g.input.pitch = 0.1; window.__cq.runFrames(30); return true; })()`);
  if (!(await close('neonblade', 'shibati'))) fail('shibati', 'no shop sign near the stairs');
  await screenshot(page, 'signs-close');
  // An LED ticker in Jiaochangkou, up the hill.
  if (!(await close('ledboard', 'jiaochangkou'))) fail('shibati', 'no LED ticker in Jiaochangkou');
  await screenshot(page, 'signs-ticker');
  await page.close();
}
