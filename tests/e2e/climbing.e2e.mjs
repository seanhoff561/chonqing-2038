// M3-67 (U-032): a street pole by a building (step bolts up a concrete post) from the pavement. (The plank across to
// a line of stubs up a taller wall went with the lines, U-044.)
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'climbing');
  for (const [kind, file] of [['pole', 'pole']]) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, fs = g.world.features.filter(f => f.kind === '${kind}'), f = fs[Math.min(fs.length - 1, 20)];
      if (!f) return false;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      // The pole from 5 m out along its bolts' side, at eye height; the plank from 6 m back on the lower roof, looking up.
      const back = '${kind}' === 'pole' ? 5 : 6, up = '${kind}' === 'pole' ? 1.7 : 1.1;
      Object.assign(g.state.player.pos, { x: f.x + f.nx * back, y: f.y + up, z: f.z + f.nz * back });
      g.input.yaw = Math.atan2(f.nx, f.nz); g.input.pitch = '${kind}' === 'pole' ? 0.35 : 0.45;
      window.__cq.runFrames(10);
      return true;
    })()`);
    if (!ok) { fail('climbing', `no ${kind}`); continue; }
    await screenshot(page, `climbing-${file}`);
  }
  await page.close();
}
