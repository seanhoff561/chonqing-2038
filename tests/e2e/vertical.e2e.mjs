// M3-57 (U-023, U-024): the vertical city. Screenshots of a skybridge across a road (from the street and on its
// deck), a block built over a lane (from the lane under it), a street on the roof (from the street up the hill) and
// a megastructure stacked over the roofs.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'vertical');
  // [teleport, back (m), up (m), turn, pitch, file]: the camera that far behind where the turned view looks.
  const shots = [['Skybridge 2', 1, 0.2, Math.PI, -0.05, 'skybridge-deck'], ['Block over a lane 1', 8, 0, 0, 0.25, 'over-lane'],
    ['Roof street 1', 8, 0.5, Math.PI, -0.15, 'roof-street'], ['Megastructure 1', 25, -8, 0, 0.35, 'megastructure']];
  // A skybridge from the street beside it, 25 m along the road from its middle, looking up at it.
  const side = await page.evaluate(`(() => {
    const g = window.__cq.game, fs = g.world.features.filter(f => f.kind === 'skybridge'), a = fs[0], b = fs.find(f => f !== a && f.group === a.group);
    if (!b) return false;
    const ux = -a.nz, uz = a.nx, x = (a.x + b.x) / 2 + ux * 25, z = (a.z + b.z) / 2 + uz * 25;
    g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
    Object.assign(g.state.player.pos, { x, y: a.y - 8, z }); g.input.yaw = Math.atan2(ux, uz); g.input.pitch = 0.25;
    window.__cq.runFrames(8);
    return true;
  })()`);
  if (side) await screenshot(page, 'vertical-skybridge'); else fail('vertical', 'no skybridge');
  for (const [name, back, up, turn, pitch, file] of shots) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, t = g.world.teleports.find(q => q.name === ${JSON.stringify(name)});
      if (!t) return false;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      const yaw = t.yaw + ${turn}, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      Object.assign(g.state.player.pos, { x: t.x - fx * ${back}, y: t.y - 1.5 + ${up}, z: t.z - fz * ${back} });
      g.input.yaw = yaw; g.input.pitch = ${pitch};
      window.__cq.runFrames(8);
      return true;
    })()`);
    if (!ok) { fail('vertical', `no teleport ${name}`); continue; }
    await screenshot(page, `vertical-${file}`);
  }
  await page.close();
}
