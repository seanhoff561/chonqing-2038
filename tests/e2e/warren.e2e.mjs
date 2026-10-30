// M3-77 (U-043): buildings as warrens. Down a corridor between its doors, in a windowless back room, and up a
// thin shaft from its foot; the draw calls and triangles in budget in among them.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'warren');
  const shots = [['inside:corridor', -0.1, 'corridor'], ['backroom', -0.2, 'backroom'], ['shaft', 1.3, 'shaft']];
  for (const [kind, pitch, name] of shots) {
    const r = await page.evaluate(`(() => {
      const g = window.__cq.game, s = g.state.player.pos, t = g.world.teleports[0];
      const f = g.world.features.filter(q => q.kind === '${kind}').sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z))[2];
      if (!f) return null;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      Object.assign(s, { x: f.x, y: f.y + (${kind === 'backroom' ? 0 : 0.05}), z: f.z });
      g.input.yaw = f.nx !== undefined ? Math.atan2(-f.nx, -f.nz) : 0; g.input.pitch = ${pitch};
      window.__cq.runFrames(12);
      const i = g.view.renderer.info.render;
      return { calls: i.calls, tris: i.triangles };
    })()`);
    if (!r) { fail('warren', `no ${kind}`); continue; }
    if (r.calls > 300 || r.tris > 1.5e6) fail('warren', `${name}: ${r.calls} calls, ${r.tris} triangles`);
    await screenshot(page, `warren-${name}`);
  }
  await page.close();
}
