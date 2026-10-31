// M4-01, M4-01b: the machines on their beats, drawn where the sim says: a column out of the factory, its squad in
// staggered files, seen from beside the road; and a street beat's walker.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=yuzhong&seed=1', 'units');
  const r = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state, w = g.world;
    Object.assign(s.flags, { clear: true, noclip: true, god: true }); s.time = 14 * 3600;
    // A column's lead humanoid out on the road now.
    const pose = u => window.__cq.unitPose(w, u, s.time);
    const lead = s.units.find(u => u.convoy && u.convoy.member === 0 && pose(u).active && pose(u).x > 0);
    if (!lead) return null;
    const p = pose(lead), fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    // Ahead of it and up, looking back down at the squad.
    const x = p.x + fx * 16, z = p.z + fz * 16, dx = p.x - fx * 6 - x, dz = p.z - fz * 6 - z;
    Object.assign(s.player.pos, { x, y: p.y + 9, z }); s.player.fallFrom = s.player.pos.y; g.input.yaw = Math.atan2(-dx, -dz); g.input.pitch = -0.55;
    window.__cq.runFrames(5);
    const v = new (g.view.fp.cam.position.constructor)(p.x, p.y + 1, p.z).project(g.view.fp.cam);
    const drawn = g.view.scene.children.filter(o => o.isGroup).flatMap(o => o.children).filter(m => m.isInstancedMesh).reduce((a, m) => a + m.count, 0);
    return { drawn, units: s.units.length, screen: [v.x.toFixed(2), v.y.toFixed(2), v.z.toFixed(2)], cam: [g.view.fp.cam.position.x - p.x, g.view.fp.cam.position.y - p.y, g.view.fp.cam.position.z - p.z].map(n => n.toFixed(1)) };
  })()`);
  if (!r) { fail('units', 'no column out on its road'); await page.close(); return; }
  if (r.drawn < 8) fail('units', `only ${r.drawn} machines drawn`);
  console.log(`  units: ${r.units} in the city, ${r.drawn} drawn near the column (lead on screen at ${r.screen}, camera ${r.cam} from it)`);
  await screenshot(page, 'units-column');
  await page.close();
}
