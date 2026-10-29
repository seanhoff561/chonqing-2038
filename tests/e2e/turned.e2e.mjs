// M3-40 (U-017): turned solids render (with shadows) in the gym's turned-walls area.
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=gym', 'turned');
  const r = await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 15 * 3600; g.state.flags.clear = true; Object.assign(g.state.player.pos, { x: 14, y: 0.05, z: 64 }); g.input.yaw = -0.4; g.input.pitch = -0.15; window.__cq.runFrames(10); return { turned: g.world.solids.filter(s => s.rot).length, calls: g.view.renderer.info.render.calls }; })()`);
  if (r.turned < 4) fail('turned', 'no turned solids in the gym: ' + JSON.stringify(r));
  await screenshot(page, 'turned-walls');
  await page.close();
}
