// M3-25 (U-012): the whole city shows from the highest roof through aerial haze, within the Medium budget
// (300 draw calls, 1.5 M triangles), and at street level too.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'farview');
  const look = js => page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; g.state.flags.noclip = true; const p = g.state.player; ${js}; window.__cq.runFrames(10); const i = g.view.renderer.info.render; return { calls: i.calls, tris: i.triangles, far: g.world.far.length, haze: g.view.scene.fog.far }; })()`);
  const top = await look(`const t = g.world.far.reduce((a, s) => s.y1 > a.y1 ? s : a); Object.assign(p.pos, { x: (t.x0 + t.x1) / 2, y: t.y1 + 40, z: (t.z0 + t.z1) / 2 }); g.input.yaw = Math.atan2(-(200 - p.pos.x), -(450 - p.pos.z)); g.input.pitch = -0.3`);
  if (top.far < 1000) fail('farview', `only ${top.far} far stand-ins`);
  if (top.haze < 2000) fail('farview', `haze closes at ${top.haze} m`);
  if (top.calls > 300 || top.tris > 1.5e6) fail('farview', `from the top: ${top.calls} calls, ${top.tris} triangles`);
  await screenshot(page, 'whole-city');
  const street = await look(`Object.assign(p.pos, { x: 470, y: 46, z: 392 }); g.input.yaw = Math.PI; g.input.pitch = 0`);
  if (street.calls > 300 || street.tris > 1.5e6) fail('farview', `street: ${street.calls} calls, ${street.tris} triangles`);
  await page.close();
}
