// M3-71 (U-038): tight ways at ground level. Inside a squeeze in an alley (the headlamp on), a crawl space under a
// fallen floor, a hole broken low into a building, a nook in a wall on a street.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'tightways');
  for (const [kind, file, back, up, pitch, lamp] of [['squeeze', 'squeeze', 0, 0.35, 0, true], ['crawlspace', 'crawlspace', 3, 0.35, -0.05, false], ['burrow', 'burrow', 2.5, 0.6, -0.15, false], ['nook', 'nook', 3, 1.2, -0.1, false]]) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, t = g.world.teleports[0], f = g.world.features.filter(q => q.kind === '${kind}').sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z))[1];
      if (!f) return false;
      g.state.time = 15 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      const nx = f.nx ?? 1, nz = f.nz ?? 0;
      Object.assign(g.state.player.pos, { x: f.x + nx * ${back}, y: f.y + ${up} - 0.3, z: f.z + nz * ${back} });
      g.input.yaw = Math.atan2(nx, nz); g.input.pitch = ${pitch};
      if (${lamp}) g.state.lamp = 1;
      window.__cq.runFrames(12);
      return true;
    })()`);
    if (!ok) { fail('tightways', `no ${kind}`); continue; }
    await screenshot(page, `tightways-${file}`);
  }
  await page.close();
}
