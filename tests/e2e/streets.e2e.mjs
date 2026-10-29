// M3-54 (U-022): streets along their real lines: a main road, a lane, a junction from above and the Eighteen Stairs,
// to compare with docs/reference/places (jiefangbei-3, old-housing-1, shibati-2).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'streets');
  const views = [['road', 'jiefangbei', 0.2, 0, -0.15], ['lane', 'Grand Tunnel entrance', 0.2, 2.2, -0.2], ['junction', 'jiaochangkou', 30, 0, -1.2], ['stairs', 'shibati', 0.2, 2.42, -0.2]];
  for (const [name, tp, up, yaw, pitch] of views) {
    const n = await page.evaluate(`(() => { const g = window.__cq.game, s = g.world.teleports.find(t => t.name === ${JSON.stringify(tp)}); g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true;
      Object.assign(g.state.player.pos, { x: s.x, y: s.y - 1.45 + ${up}, z: s.z }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(8); return g.world.streets.length; })()`);
    if (n < 500) fail('streets', `only ${n} streets drawn`);
    await screenshot(page, `streets-${name}`);
  }
}
