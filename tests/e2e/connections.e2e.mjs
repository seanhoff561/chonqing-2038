// M3-37a (U-034, U-035): the connections. A plank and a cable across a street, a cable bundle hung with junk between
// close buildings, bars across a narrow gap, a walkway roof to roof, a plank out of a window.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'connections');
  for (const [kind, file] of [['crossPlank', 'plank'], ['crossBeam', 'beam'], ['crossCord', 'streetcord'], ['cord', 'cord'], ['gapBar', 'bars'], ['walkway', 'walkway'], ['winPlank', 'window']]) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, t = g.world.teleports[0], fs = g.world.features.filter(f => f.kind === '${kind}').sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z));
      const f = fs[2] ?? fs[0];
      if (!f) return false;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      // Back from its end and to one side, looking along it.
      Object.assign(g.state.player.pos, { x: f.x - f.nx * 3 + f.nz * 2.5, y: f.y + 0.4, z: f.z - f.nz * 3 - f.nx * 2.5 });
      g.input.yaw = Math.atan2(-f.nx, -f.nz) + 0.35; g.input.pitch = -0.25;
      window.__cq.runFrames(12);
      return true;
    })()`);
    if (!ok) { fail('connections', `no ${kind}`); continue; }
    await screenshot(page, `connections-${file}`);
  }
  await page.close();
}
