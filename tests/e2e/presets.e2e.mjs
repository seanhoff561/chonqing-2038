// M3-17: graphics presets. From the pause menu Low, Medium and High each set the pixel ratio, the draw distance (the
// radius detail is drawn in), shadows and the share of litter drawn; switching between them throws no errors and
// the city keeps drawing. The same view at each, its draw calls and triangles logged.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=yuzhong&seed=1', 'presets');
  await page.evaluate(`(() => { const g = window.__cq.game, t = g.world.teleports.find(q => q.name === 'jiaochangkou');
    Object.assign(g.state.flags, { clear: true, noclip: true }); g.state.time = 15 * 3600;
    Object.assign(g.state.player.pos, { x: t.x, y: t.y - 1.45, z: t.z }); window.__cq.runFrames(10); })()`);
  const seen = {};
  for (const p of ['low', 'high', 'medium']) {
    await page.keyboard.press('Equal');
    const button = await page.$(`#pause button[data-preset="${p}"]`);
    if (!button) { fail('presets', `no ${p} button in the pause menu`); continue; }
    await button.click();
    // (The menu closes again only after 0.4 s open.)
    await new Promise(r => setTimeout(r, 450));
    await page.keyboard.press('Equal');
    const r = await page.evaluate(`(() => { const g = window.__cq.game, v = g.view; window.__cq.runFrames(20);
      let litter = 0; v.world.traverse(o => { if (o.isMesh && o.userData.detail && !o.userData.inner) litter += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; });
      return { preset: v.preset, ratio: v.renderer.getPixelRatio(), draw: g.drawDistance, shadows: v.sun.castShadow, map: v.sun.shadow.mapSize.x, litter, calls: v.renderer.info.render.calls, tris: v.renderer.info.render.triangles }; })()`);
    seen[p] = r;
    if (r.preset !== p) fail('presets', `${p}: the view is on ${r.preset}`);
    console.log(`  presets ${p}: ratio ${r.ratio}, draw ${r.draw} m, shadows ${r.shadows ? r.map : 'off'}, ${r.calls} calls, ${(r.tris / 1e6).toFixed(2)} M triangles`);
    if (p !== 'medium') await screenshot(page, `presets-${p}`);
  }
  const { low, medium, high } = seen;
  if (!low || !medium || !high) return;
  if (!(low.ratio < medium.ratio && medium.ratio <= high.ratio)) fail('presets', `pixel ratios ${low.ratio} / ${medium.ratio} / ${high.ratio}`);
  if (!(low.draw < medium.draw && medium.draw < high.draw)) fail('presets', `draw distances ${low.draw} / ${medium.draw} / ${high.draw}`);
  if (low.shadows || !medium.shadows || !high.shadows || high.map <= medium.map) fail('presets', 'shadows: off on Low, on at Medium, finer on High');
  if (!(low.litter < medium.litter && medium.litter < high.litter)) fail('presets', `small detail drawn ${low.litter} / ${medium.litter} / ${high.litter}`);
  if (medium.calls > 300 || medium.tris > 1.5e6) fail('presets', `medium over budget: ${medium.calls} calls, ${medium.tris} triangles`);
  // (Back to the default for the tests after.)
  await page.evaluate(`localStorage.removeItem('cq2038.preset')`);
  await page.close();
}
