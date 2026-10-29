// M3-53 (U-022): the frame budget for 150 fps (6.7 ms a frame). At four Yuzhong viewpoints (a street, a rooftop,
// the tunnel, the overview) the draw calls and triangles stay in budget, and so does the CPU of a frame: a sim tick
// plus building and submitting the render. GPU time can't be measured headlessly (software WebGL); the director
// reports the real frame rate (docs/PLAYTEST.md).
// CPU in software-rendered Chrome, whose GL calls cost several times a real driver's (U-027).
const BUDGET = { calls: 250, tris: 1.2e6, cpu: 5 };

export default async function ({ open, fail }) {
  const page = await open('?scenario=shibati&seed=1', 'perf');
  // [name, teleport, up from the feet, yaw, pitch]
  const views = [['street', 'jiaochangkou', 0, 0, -0.05], ['rooftop', 'shibati', 25, -0.585, -0.1], ['tunnel', "Friends' hideout (vent grate)", 0, 0.4, 0], ['overview', 'jiefangbei', 120, 2.6, -0.35]];
  for (const [name, tp, up, yaw, pitch] of views) {
    const r = await page.evaluate(`(async () => {
      const g = window.__cq.game, s = g.world.teleports.find(t => t.name === ${JSON.stringify(tp)});
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = ${up > 0};
      Object.assign(g.state.player.pos, { x: s.x, y: s.y - 1.45 + ${up}, z: s.z }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch};
      window.__cq.runFrames(30);
      // The sim: a second of ticks standing still.
      let t0 = performance.now();
      for (let i = 0; i < 60; i++) g.tick();
      const sim = (performance.now() - t0) / 60;
      // A frame's render on the CPU, with pauses so the software GPU behind it never holds the page up; the
      // median of 25, as this machine's other work makes single frames noisy.
      const times = [];
      for (let i = 0; i < 28; i++) {
        await new Promise(res => setTimeout(res, 100));
        t0 = performance.now(); g.render(1, 1 / 60); if (i >= 3) times.push(performance.now() - t0);
      }
      const render = times.sort((a, b) => a - b)[times.length >> 1];
      const info = g.view.renderer.info.render;
      return { sim, render, calls: info.calls, tris: info.triangles };
    })()`);
    console.log(`  perf ${name}: ${r.calls} calls, ${(r.tris / 1000).toFixed(0)}k tris, sim ${r.sim.toFixed(2)} ms + render ${r.render.toFixed(2)} ms`);
    if (r.calls > BUDGET.calls) fail('perf', `${name}: ${r.calls} draw calls (budget ${BUDGET.calls})`);
    if (r.tris > BUDGET.tris) fail('perf', `${name}: ${r.tris} triangles (budget ${BUDGET.tris})`);
    if (r.sim + r.render > BUDGET.cpu) fail('perf', `${name}: ${(r.sim + r.render).toFixed(2)} ms of CPU a frame (budget ${BUDGET.cpu})`);
  }
  await page.close();
}
