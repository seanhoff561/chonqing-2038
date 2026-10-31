// M4-22c (U-048): the city boots within its budget, painting a loading screen first; a new run, after death or from
// the pause menu, starts in place: no reload, the same world, the view kept, a fresh run state in a moment.
const BOOT = 120000, NEW = 2000;
export default async function ({ open, fail }) {
  const page = await open('?scenario=run&seed=1', 'newrun');
  const boot = await page.evaluate('window.__cq.boot');
  if (!(boot.view > 0 && boot.view < BOOT)) fail('newrun', `boot ${JSON.stringify(boot)} over its ${BOOT} ms budget`);
  if (await page.$('#loading')) fail('newrun', 'the loading screen still up');
  // Dead (to a humanoid's rifle), then New run from the death screen.
  const after = async (how) => {
    const r = await page.evaluate(`(async () => {
      window.__mark = 1;
      const g = window.__cq.game, w = g.world, units = g.view.world.children.length;
      ${how}
      const t = performance.now();
      document.querySelector(${how.includes('kill') ? "'#death .d-new'" : "'#pause [data-a=newrun]'"}).click();
      ${how.includes('kill') ? '' : "document.querySelector('#pause [data-a=newrun]').click();"}
      const ms = performance.now() - t;
      g.runFrames(2);
      const p = g.state.player.pos, sp = g.world.spawn;
      return { ms, mark: window.__mark, same: g.world === w, kept: g.view.world.children.length === units, dead: !!g.state.dead, tick: g.state.tick,
        home: Math.hypot(p.x - sp.x, p.z - sp.z), death: !!document.querySelector('#death'), ui: g.input.uiOpen };
    })()`);
    return r;
  };
  for (const [label, how] of [['after death', "window.__cq.kill('rifle'); g.runFrames(1); if (!document.querySelector('#death')) return { nodeath: true };"], ['from the menu', 'g.pause.show();']]) {
    const r = await after(how);
    if (r.nodeath) { fail('newrun', 'no death screen'); continue; }
    if (r.mark !== 1) fail('newrun', `${label}: the page reloaded`);
    if (!r.same || !r.kept) fail('newrun', `${label}: the world was built again (same ${r.same}, view kept ${r.kept})`);
    if (r.dead || r.death || r.home > 2 || r.tick > 5) fail('newrun', `${label}: not a fresh run (${JSON.stringify(r)})`);
    if (r.ms > NEW) fail('newrun', `${label}: took ${Math.round(r.ms)} ms`);
    console.log(`newrun ${label}: ${Math.round(r.ms)} ms; boot ${JSON.stringify(boot)}`);
  }
  // (The shared page back as the other checks expect it.)
  await page.evaluate("(() => { const g = window.__cq.game; g.pause.resume(); g.load('run', 1); g.runFrames(2); })()");
  await page.close();
}
