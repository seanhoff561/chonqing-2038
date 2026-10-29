// M3-46 (U-020): building variety in Yuzhong: Jiefangbei's towers, screens and neon; a residential slope;
// Shibati's roofs, to compare with docs/reference/places/jiefangbei-3, old-housing-1 and shibati-2.
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=yuzhong&seed=1', 'variety');
  const shot = async (name, x, y, z, yaw, pitch) => {
    const r = await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 15 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: ${x}, y: ${y}, z: ${z} }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(8); const i = g.view.renderer.info.render; return { calls: i.calls, tris: i.triangles }; })()`);
    if (r.calls > 300 || r.tris > 1.5e6) fail('variety', `${name}: ${r.calls} calls, ${r.tris} triangles`);
    await screenshot(page, `variety-${name}`);
  };
  await shot('jiefangbei', 880, 124, 1530, 0.6, 0.15);
  await shot('slope', 1200, 160, 1900, -0.9, -0.25);
  await shot('shibati', 600, 110, 2080, 0.3, -0.3);
  // No single colour dominates the buildings.
  const share = await page.evaluate(`(() => { const c = {}; let n = 0; for (const s of window.__cq.game.world.solids) if (s.tint !== undefined) { c[s.tint] = (c[s.tint] || 0) + 1; n++; } return Math.max(...Object.values(c)) / n; })()`);
  if (share > 0.2) fail('variety', `one colour on ${(share * 100).toFixed(0)}% of tinted solids`);
  await page.close();
}
