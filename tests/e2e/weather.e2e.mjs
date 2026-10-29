// M3-13: weather on screen: heavy fog closes the view, rain falls in streaks and wets the surfaces; under a roof
// or underground there's no rain.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'weather');
  const set = (fog, rain, hour = 11) => page.evaluate(`(() => { const g = window.__cq.game, T = n => g.world.teleports.find(t => t.name === n), s = T('shibati'); g.state.time = ${hour} * 3600; g.state.flags.fog = ${fog}; g.state.flags.rain = ${rain}; const p = g.state.player; Object.assign(p.pos, { x: s.x, y: s.y - 1.45, z: s.z }); p.fallFrom = p.pos.y; g.input.yaw = 2.42; g.input.pitch = -0.05; window.__cq.runFrames(30); return { far: g.view.scene.fog.far, rain: g.rain.lines.visible }; })()`);
  // The afternoon is clear on this seed's schedule (fog burns off by noon).
  const clear = await set(0, 0, 15);
  const fog = await set(1, 0);
  if (!(fog.far < 200 && clear.far > 1500)) fail('weather', `fog far clear ${clear.far}, heavy ${fog.far}`);
  await screenshot(page, 'weather-fog');
  const rain = await set(0.3, 1);
  if (!rain.rain) fail('weather', 'no rain streaks in the rain');
  await screenshot(page, 'weather-rain');
  const under = await page.evaluate(`(() => { const g = window.__cq.game, T = n => g.world.teleports.find(t => t.name === n), h = T("Friends' hideout (vent grate)"); Object.assign(g.state.player.pos, { x: h.x, y: h.y, z: h.z }); window.__cq.runFrames(30); return g.rain.lines.visible; })()`);
  if (under) fail('weather', 'rain falling in the tunnel');
  await page.close();
}
