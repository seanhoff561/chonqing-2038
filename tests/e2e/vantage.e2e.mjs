// M3-57a (U-023): halfway up three of the tallest climbing lines, the vantage platforms, looking out and down over
// the street far below.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'vantage');
  const spots = await page.evaluate(`(() => {
    const ts = window.__cq.game.world.teleports.filter(t => t.name.startsWith('Vantage')).sort((a, b) => b.y - a.y), out = [];
    for (const t of ts) if (out.length < 3 && out.every(q => Math.hypot(q.x - t.x, q.z - t.z) > 300)) out.push(t);
    return out;
  })()`);
  if (spots.length < 3) fail('vantage', `only ${spots.length} vantage platforms`);
  for (const [n, t] of spots.entries()) {
    await page.evaluate(`(() => {
      const g = window.__cq.game;
      g.state.time = 15 * 3600; g.state.flags.clear = true; g.state.flags.god = true;
      Object.assign(g.state.player.pos, { x: ${t.x}, y: ${t.y} - 1.6, z: ${t.z} });
      g.input.yaw = ${t.yaw}; g.input.pitch = -0.7;
      window.__cq.runFrames(20);
    })()`);
    const p = await page.evaluate('(() => { const p = window.__cq.game.state.player; return { y: p.pos.y, mode: p.mode }; })()');
    if (Math.abs(p.y - (t.y - 1.6)) > 0.3 || p.mode !== 'ground') fail('vantage', `${t.name}: not standing on it (${p.mode} at ${p.y.toFixed(1)})`);
    console.log(`  ${t.name}: ${(t.y - 1.6).toFixed(0)} m up at ${t.x.toFixed(0)},${t.z.toFixed(0)}`);
    await screenshot(page, `vantage-${n}`);
  }
}
