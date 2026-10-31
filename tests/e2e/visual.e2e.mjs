// M4-22d (U-049): the visual pass, seen: over a district's flat roofs, along a road's worn paint, and straight down
// on a street grate, whose shaft shows dark through its bars. Screenshots tagged VISUAL_TAG (before / after).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'visual'), tag = process.env.VISUAL_TAG ?? 'after';
  const view = (js, up, yaw, pitch) => page.evaluate(`(() => {
    const g = window.__cq.game, at = (${js})(g);
    g.state.time = 13 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true;
    Object.assign(g.state.player.pos, { x: at.x, y: at.y + ${up}, z: at.z }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch};
    window.__cq.runFrames(40);
  })()`);
  const lum = `(() => { const g = window.__cq.game; g.view.render(0, {}); const gl = g.view.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, d = new Uint8Array(40 * 40 * 4); gl.readPixels((w >> 1) - 20, (h >> 1) - 20, 40, 40, gl.RGBA, gl.UNSIGNED_BYTE, d); let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; })()`;
  // Over the flat roofs by Jiaochangkou, 35 m up, looking down across them.
  await view(`g => g.world.teleports.find(t => t.name === 'jiaochangkou')`, 35, 2.2, -0.75);
  await screenshot(page, `visual-roofs-${tag}`);
  // A road's centre line and edge paint, looking along it from the pavement.
  await view(`g => g.world.teleports.find(t => t.name === 'jiaochangkou')`, 0.2, 0.3, -0.25);
  await screenshot(page, `visual-paint-${tag}`);
  // Straight down on a street grate from 1.6 m: the shaft dark under its bars, the paving round it lit.
  const grate = await page.evaluate(`(() => { const g = window.__cq.game, q = g.world.inter.find(i => String(i.id).startsWith('under-grate')); return q && { x: q.x, y: q.y, z: q.z }; })()`);
  if (!grate) { fail('visual', 'no street grate'); await page.close(); return; }
  await view(`g => (${JSON.stringify(grate)})`, 1.6, 0, -1.5);
  const over = await page.evaluate(lum);
  await screenshot(page, `visual-grate-${tag}`);
  await view(`g => (${JSON.stringify({ ...grate, x: grate.x + 2.2 })})`, 1.6, 0, -1.5);
  const beside = await page.evaluate(lum);
  if (tag === 'after' && !(over < beside * 0.7)) fail('visual', `the grate doesn't show the dark under it: ${over.toFixed(0)} over it, ${beside.toFixed(0)} beside`);
  console.log(`visual: grate ${over.toFixed(0)} vs paving ${beside.toFixed(0)}`);
  // A gutter's drain grate on a road, from above: bars over the black. (Dropped onto the road from high up, kept
  // alive, then lifted to eye height looking down at it.)
  const gutter = await page.evaluate(`(() => { const g = window.__cq.game, st = g.world.streets.find(s => ['primary', 'secondary', 'tertiary'].includes(s.kind) && s.w >= 6 && !s.bridge && Math.hypot(s.pts[1][0] - s.pts[0][0], s.pts[1][1] - s.pts[0][1]) > 20);
    if (!st) return null; const [a, b] = st.pts, l = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l, o = st.w / 2 - 0.5;
    g.state.flags.god = true; g.state.flags.noclip = false; Object.assign(g.state.player.pos, { x: a[0] + dx * 12.45 - dz * o, y: 400, z: a[1] + dz * 12.45 + dx * o }); g.state.player.vel.y = 0;
    for (let i = 0; i < 1200 && !g.state.player.onGround; i++) g.tick();
    return { ...g.state.player.pos, yaw: Math.atan2(-dx, -dz) }; })()`);
  if (gutter) {
    // Back along the kerb 6 m, looking along the gutter to its drain, the road's worn paint beside it.
    const back = { x: gutter.x + Math.sin(gutter.yaw) * 6, y: gutter.y, z: gutter.z + Math.cos(gutter.yaw) * 6 };
    await view(`g => (${JSON.stringify(back)})`, 1.6, gutter.yaw, -0.45);
    await screenshot(page, `visual-gutter-${tag}`);
  } else fail('visual', 'no road to find a gutter drain on');
  await page.close();
}
