// M3-18: ?scenario=shibati and ?scenario=tunnels load (every scenario boots in the smoke test's first pass too), each
// standing him where it says: the top of the Eighteen Stairs, the Grand Tunnel's junction by the friends' stub.
export default async function ({ open, fail, screenshot }) {
  for (const [name, at] of [['shibati', 'shibati'], ['tunnels', 'Tunnel junction (hideout)']]) {
    const page = await open(`?scenario=${name}&seed=1`, `scenario-${name}`);
    const r = await page.evaluate(`(() => { const g = window.__cq.game; window.__cq.runFrames(120); const t = g.world.teleports.find(q => q.name === ${JSON.stringify(at)}), p = g.state.player.pos;
      return { scenario: g.scenario.name, mode: g.state.player.mode, off: Math.hypot(p.x - t.x, p.z - t.z) }; })()`);
    if (r.scenario !== name || r.mode !== 'ground' || r.off > 1) fail('scenarios', `${name}: ${JSON.stringify(r)}`);
    if (name === 'tunnels') await screenshot(page, 'scenario-tunnels');
    await page.close();
  }
}
