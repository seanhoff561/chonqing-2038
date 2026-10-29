// M3-41a (D-016): heightfield ground renders: the gym's hillside, its slope and cut retaining face.
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=gym', 'ground');
  const r = await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 15 * 3600; g.state.flags.clear = true; Object.assign(g.state.player.pos, { x: 74, y: 2, z: 14 }); g.input.yaw = -Math.PI / 2 - 0.25; g.input.pitch = -0.05; window.__cq.runFrames(40); return { ground: !!g.world.ground, y: g.state.player.pos.y }; })()`);
  if (!r.ground) fail('ground', 'the gym has no heightfield');
  await screenshot(page, 'ground-hillside');
  await page.close();
}
