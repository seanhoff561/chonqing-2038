// M3-68 (U-032): the underground made real. Screenshots of the metro's running tunnel along its track, the stalled
// train, Jiefangbei's platform, an air-raid shelter on the old tunnel, the market room, and a street stepping down
// off the street into the city, from its mouth.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'metro');
  // [teleport or feature kind, along the yaw (m), up (m), turn, pitch, file]
  const shots = [['Metro tunnel', 0, 0, 0, -0.05, 'tunnel'], ['trainCar', -14, 1.6, 0, -0.1, 'train'], ['Metro station Jiefangbei', 0, 0, 0, -0.05, 'station'],
    ['Air-raid shelter', 0, 0, 0, -0.1, 'shelter'], ['room:market', -6, 1.6, 0, -0.15, 'market'], ['Stepped street down', 0, 0.5, 0, -0.45, 'descent']];
  for (const [name, along, up, turn, pitch, file] of shots) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, w = g.world, tp = w.teleports.find(q => q.name === ${JSON.stringify(name)}), f = w.features.find(q => q.kind === ${JSON.stringify(name)});
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      if (tp) { Object.assign(g.state.player.pos, { x: tp.x, y: tp.y - 1.5 + ${up}, z: tp.z }); g.input.yaw = tp.yaw + ${turn}; }
      else if (f) {
        // Along the run it's on (the longer of x and z to the next feature of its kind).
        const n = w.features.filter(q => q.kind === f.kind && q !== f).sort((a, b) => Math.hypot(a.x - f.x, a.z - f.z) - Math.hypot(b.x - f.x, b.z - f.z))[0];
        const ax = n && Math.abs(n.x - f.x) > Math.abs(n.z - f.z) ? 1 : 0, az = 1 - ax;
        Object.assign(g.state.player.pos, { x: f.x + ax * ${along}, y: f.y + ${up}, z: f.z + az * ${along} });
        g.input.yaw = Math.atan2(ax, az) + ${turn};
      } else return false;
      g.input.pitch = ${pitch};
      window.__cq.runFrames(10);
      return true;
    })()`);
    if (!ok) { fail('metro', `no ${name}`); continue; }
    await screenshot(page, `metro-${file}`);
  }
  await page.close();
}
