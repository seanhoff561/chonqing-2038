// M3-66 (U-032): the layered city. Screenshots of a vertical alley from its mouth looking up it, scaffolding on a
// tall block, a bridge between two buildings and a beam sticking out, each from the street or a roof near it, and
// the roofs in their layers from above a dense block.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'layers');
  // [feature, out along its normal (m), up (m), over the feature (else over the ground), pitch, file]: looking back at it.
  const shots = [['vAlley', 3, 1.7, false, 0.75, 'valley'], ['scaffold', 16, 2, false, 0.35, 'scaffold'], ['bridge', 14, 2, false, 0.4, 'bridge'],
    ['beam', 10, 3, true, -0.25, 'beam']];
  for (const [kind, out, up, rel, pitch, file] of shots) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, gr = g.world.ground, hAt = (x, z) => gr.y[Math.round(z / gr.cell) * gr.w + Math.round(x / gr.cell)];
      // The tenth of its kind, so not the first by the map's edge.
      const fs = g.world.features.filter(f => f.kind === '${kind}'), f = fs[Math.min(fs.length - 1, 10)];
      if (!f) return false;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      const x = f.x + f.nx * ${out}, z = f.z + f.nz * ${out};
      Object.assign(g.state.player.pos, { x, y: (${rel} ? f.y : hAt(x, z)) + ${up}, z });
      g.input.yaw = Math.atan2(f.nx, f.nz); g.input.pitch = ${pitch};
      window.__cq.runFrames(10);
      return true;
    })()`);
    if (!ok) { fail('layers', `no ${kind}`); continue; }
    await screenshot(page, `layers-${file}`);
  }
  // The roofs in their layers: from 30 m over the middle of the most crowded 200 m square, looking across them.
  await page.evaluate(`(() => {
    const g = window.__cq.game, n = new Map();
    for (const p of g.world.plots) if (!p.far) { const k = Math.floor(p.corners[0][0] / 200) + ',' + Math.floor(p.corners[0][1] / 200); n.set(k, (n.get(k) ?? 0) + 1); }
    const [k] = [...n].sort((a, b) => b[1] - a[1])[0], [i, j] = k.split(',').map(Number);
    const tops = g.world.plots.filter(p => !p.far && Math.floor(p.corners[0][0] / 200) === i && Math.floor(p.corners[0][1] / 200) === j).map(p => p.top).sort((a, b) => a - b);
    Object.assign(g.state.player.pos, { x: i * 200 + 20, y: tops[tops.length >> 1] + 30, z: j * 200 + 100 });
    g.input.yaw = -Math.PI / 2; g.input.pitch = -0.3;
    window.__cq.runFrames(10);
  })()`);
  await screenshot(page, 'layers-roofs');
  await page.close();
}
