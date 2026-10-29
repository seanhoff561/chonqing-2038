// M3-33 (U-014): a street of mixed blocks whose painted windows all read shut (barred, glazed, shuttered,
// boarded, caged, bricked up), beside a hollow block with real openings.
export default async function ({ open, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'closed');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: 470, y: 50, z: 330 }); g.input.yaw = Math.PI / 2; g.input.pitch = -0.05; window.__cq.runFrames(10); })()`);
  await screenshot(page, 'closed-facades');
  await page.close();
}
