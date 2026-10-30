// M3-73a (U-038): basements and the sewer maze, by headlamp. Down at a basement's manhole grate, along a sewer run
// from a shaft's foot, a flooded sump, and a grate into the underground city.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=yuzhong&seed=1', 'sewers');
  for (const [kind, name, pitch] of [['sewer', 'basement', -1.2], ['drain', 'sewer', -0.05], ['sump', 'sump', -0.7], ['grate', 'grate', 0]]) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, s = g.state, all = g.world.features.filter(q => q.kind === '${kind}'), fs = '${kind}' === 'drain' ? all.filter(q => all.find(p => p.group === q.group) === q) : all, f = fs[Math.floor(fs.length / 3)];
      if (!f) return false;
      s.time = 14 * 3600; s.flags.noclip = true; s.flags.god = true;
      if (!s.inv.pack.items.some(i => i.id === 'headlamp')) s.inv.pack.items.push({ uid: 9999, id: 'headlamp', n: 1, x: 7, y: 5, rot: false, charge: 100 });
      s.player.lamp = 1;
      // Along the run: its first leg runs along x from the shaft (the drains' pair names the far end).
      const o = '${kind}' === 'drain' ? g.world.features.find(q => q.kind === 'drain' && q.group === f.group && q !== f) : null;
      const yaw = o ? (o.x > f.x ? -Math.PI / 2 : Math.PI / 2) : '${kind}' === 'grate' ? Math.PI : Math.PI / 2;
      // (A few metres into a run from its shaft.)
      const into = '${kind}' === 'drain' ? 4 : 0;
      Object.assign(s.player.pos, { x: f.x - Math.sin(yaw) * into, y: f.y + 0.05, z: f.z - Math.cos(yaw) * into });
      g.input.yaw = yaw; g.input.pitch = ${pitch};
      window.__cq.runFrames(12);
      return true;
    })()`);
    if (!ok) { fail('sewers', `no ${kind}`); continue; }
    await screenshot(page, `sewers-${name}`);
  }
  await page.close();
}
