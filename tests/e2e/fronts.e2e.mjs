// M3-55 (U-022, U-024): five kinds of building from the street, to set beside docs/reference/places (old-housing-1
// and -2 for the walk-up and the open block, jiefangbei-2 for the slab and the tower, shibati-1 for the Eighteen
// Stairs' blocks, apartments since U-034).
// Each is the one of its kind nearest Jiefangbei (the walk-up, Jiaochangkou), seen from the street in front of it.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'fronts');
  const kinds = [
    ['walkup', "p.kind === 'res' && !p.route && p.wall - p.base <= 18", 'jiaochangkou'],
    ['slab', "p.kind === 'res' && !p.route && p.wall - p.base >= 30"],
    ['tower', "p.kind === 'tower'"],
    ['open', "p.kind === 'res' && !!p.route"],
    ['shibati', "p.kind === 'res' && p.wall - p.base <= 24", 'shibati'],
  ];
  for (const [name, test, near = 'jiefangbei'] of kinds) {
    const r = await page.evaluate(`(() => {
      const g = window.__cq.game, w = g.world, hf = w.ground, L = w.teleports.find(t => t.name === ${JSON.stringify(near)});
      const mid = p => p.corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4], [0, 0]);
      const inside = (p, x, z) => p.corners.every((c, i) => { const d = p.corners[(i + 1) % 4]; return (d[0] - c[0]) * (z - c[1]) - (d[1] - c[1]) * (x - c[0]) >= 0; })
        || p.corners.every((c, i) => { const d = p.corners[(i + 1) % 4]; return (d[0] - c[0]) * (z - c[1]) - (d[1] - c[1]) * (x - c[0]) <= 0; });
      const plots = w.plots.filter(p => !p.far), hy = (x, z) => hf.y[Math.round((z - hf.z0) / hf.cell) * hf.w + Math.round((x - hf.x0) / hf.cell)];
      const cands = plots.filter(p => ${test}).sort((a, b) => { const m = mid(a), n = mid(b); return Math.hypot(m[0] - L.x, m[1] - L.z) - Math.hypot(n[0] - L.x, n[1] - L.z); });
      // The clearest view: the side of the nearest few with the most open ground in front of it.
      const street = (x, z) => { let b = 99; for (const s of w.streets) for (let i = 1; i < s.pts.length; i++) {
        const [ax, az] = s.pts[i - 1], [bx, bz] = s.pts[i], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
        b = Math.min(b, Math.hypot(x - ax - vx * t, z - az - vz * t) - s.w / 2); } return Math.max(0, b); };
      let best = null;
      for (const p of cands.slice(0, 12)) {
        const [cx, cz] = mid(p);
        for (let i = 0; i < 4; i++) {
          const c = p.corners[i], d = p.corners[(i + 1) % 4], mx = (c[0] + d[0]) / 2, mz = (c[1] + d[1]) / 2;
          let nx = mx - cx, nz = mz - cz; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
          let k = 1; while (k < 18 && !plots.some(q => q !== p && inside(q, mx + nx * k, mz + nz * k))) k++;
          const dist = Math.min(k - 1, 8 + Math.hypot(c[0] - d[0], c[1] - d[1]) * 0.3);
          let rise = 0; for (let t = 1; t <= dist; t++) rise = Math.max(rise, hy(mx + nx * t, mz + nz * t) - p.base);
          // The street side: a street close in front (the door's side for an open one), the ground at the floor.
          const x = mx + nx * dist, z = mz + nz * dist, door = p.route ? Math.hypot(p.route[0].x - mx, p.route[0].z - mz) : 0;
          const score = dist - 3 * street(mx + nx * 4, mz + nz * 4) - 2 * door - 4 * Math.abs(hy(mx + nx * 3, mz + nz * 3) - p.base) - 5 * Math.max(0, rise - 0.5);
          if (dist > 5 && (!best || score > best.score)) best = { score, dist, x, z, yaw: Math.atan2(nx, nz), h: p.wall - p.base };
        }
      }
      if (!best) return null;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = false; g.state.flags.god = true;
      Object.assign(g.state.player.pos, { x: best.x, y: hy(best.x, best.z) + 0.3, z: best.z }); Object.assign(g.state.player.vel, { x: 0, y: 0, z: 0 });
      g.input.yaw = best.yaw; g.input.pitch = Math.atan2(Math.min(best.h * 0.45, 9), best.dist);
      window.__cq.runFrames(40);
      return { n: cands.length, dist: best.dist };
    })()`);
    if (!r) { fail('fronts', `no ${name} building`); continue; }
    console.log(`  fronts ${name}: ${r.n} of its kind, seen from ${r.dist.toFixed(0)} m`);
    await screenshot(page, `fronts-${name}`);
  }
}
