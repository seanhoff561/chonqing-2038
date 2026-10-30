// M3-58 (U-023, U-024): the underground city. Screenshots of the upper deck's street of shops, the lower concourse
// under it with a void overhead, a stairway's mouth in the city above, a grate and a culvert's mouth.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'under');
  // The city below is lit the same by day and night; the ways in are shown by day.
  const look = (js, file, hour = 14) => page.evaluate(`(() => {
    const g = window.__cq.game, w = g.world, way = k => w.features.find(f => f.kind === k);
    g.state.time = ${hour} * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
    const v = (${js})(w, way);
    if (!v) return false;
    Object.assign(g.state.player.pos, { x: v.x, y: v.y, z: v.z }); g.input.yaw = v.yaw; g.input.pitch = v.pitch;
    window.__cq.runFrames(90);
    return true;
  })()`).then(ok => ok ? screenshot(page, `under-${file}`) : fail('under', `nothing to show for ${file}`));
  const T = n => `w.teleports.find(t => t.name === ${JSON.stringify(n)})`;
  await look(`(w) => { const t = ${T('Underground city deck')}; return t && { x: t.x + 6, y: t.y - 1.5, z: t.z + 2, yaw: -Math.PI / 2, pitch: -0.05 }; }`, 'deck', 21);
  await look(`(w) => { const t = ${T('Underground city deck')}; return t && { x: t.x - 2, y: t.y - 1.5 - 7, z: t.z - 40, yaw: Math.PI, pitch: 0.05 }; }`, 'concourse', 21);
  await look(`(w, way) => { const f = way('way:stairs'); return f && { x: f.x - 6, y: f.y + 1.5, z: f.z - 6, yaw: Math.atan2(6, 6), pitch: -0.35 }; }`, 'stairs');
  await look(`(w, way) => { const f = way('way:grate'); return f && { x: f.x + 4, y: f.y + 1.2, z: f.z + 4, yaw: Math.atan2(4, 4), pitch: -0.6 }; }`, 'grate');
  await look(`(w, way) => { const f = way('way:culvert'); return f && { x: f.x + f.nx * 12, y: f.y + 2, z: f.z + f.nz * 12, yaw: Math.atan2(f.nx, f.nz), pitch: -0.1 }; }`, 'culvert');
  await page.close();
}
