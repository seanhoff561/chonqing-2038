// M3-59 (U-031): props that make sense. Screenshots of shop signs along a street, laundry strung across an alley,
// a fallen bike, the Line 2 train on its beam, and a factory gate by day with its searchlight dark.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'sense');
  const look = (js, file, hour = 14) => page.evaluate(`(() => {
    const g = window.__cq.game, w = g.world;
    g.state.time = ${hour} * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
    const v = (${js})(w);
    if (!v) return false;
    Object.assign(g.state.player.pos, { x: v.x, y: v.y, z: v.z }); g.input.yaw = v.yaw; g.input.pitch = v.pitch ?? 0;
    window.__cq.runFrames(30);
    return true;
  })()`).then(ok => ok ? screenshot(page, `sense-${file}`) : fail('sense', `nothing to show for ${file}`));
  // From the street, back from the busiest run of signs, looking at the shop fronts.
  const signs = `(w) => { const s = w.props.filter(p => p.kind === 'neonblade' && p.text); let best = null, n = 0; for (const p of s) { const c = s.filter(q => Math.hypot(q.x - p.x, q.z - p.z) < 25).length; if (c > n) { n = c; best = p; } }
    if (!best) return null; const dx = Math.sin(best.yaw), dz = Math.cos(best.yaw), x = best.x + dx * 9 - dz * 6, z = best.z + dz * 9 + dx * 6, hf = w.ground; return { x, y: hf.y[Math.round(z / hf.cell) * hf.w + Math.round(x / hf.cell)] + 0.2, z, yaw: Math.atan2(dx - dz * 0.5, dz + dx * 0.5), pitch: 0.12 }; }`;
  await look(signs, 'signs');
  await look(signs, 'signs-night', 22);
  await look(`(w) => { const p = w.props.find(p => p.kind === 'laundry' && p.w > 2.5); if (!p) return null; const ax = Math.sin(p.yaw), az = Math.cos(p.yaw); return { x: p.x + ax * 7, y: p.y - 0.4, z: p.z + az * 7, yaw: Math.atan2(ax, az), pitch: 0.3 }; }`, 'laundry');
  await look(`(w) => { const p = w.props.find(p => p.kind === 'bike'); if (!p) return null; return { x: p.x + 2.2, y: p.y + 0.1, z: p.z + 2.2, yaw: Math.atan2(2.2, 2.2), pitch: -0.45 }; }`, 'bike');
  await look(`(w) => { const t = w.teleports.find(q => q.name === 'Line 2 stalled train'); if (!t) return null; const fx = -Math.sin(t.yaw), fz = -Math.cos(t.yaw); return { x: t.x - fx * 24 + fz * 7, y: t.y + 2.5, z: t.z - fz * 24 - fx * 7, yaw: t.yaw - 0.25, pitch: -0.12 }; }`, 'train');
  await look(`(w) => { const t = w.teleports.find(q => q.name === 'Factory gate 1'); return t && { x: t.x, y: t.y - 1.5, z: t.z, yaw: t.yaw, pitch: 0.15 }; }`, 'gate-day');
  await page.close();
}
