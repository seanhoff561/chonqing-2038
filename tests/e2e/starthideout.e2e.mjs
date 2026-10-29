// M3-42 (U-018): a run starts in the friends' hideout; looking up the vent shaft at night, the grate against the
// shop neon above; the inventory lists the hideout.
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=run&seed=1', 'starthideout');
  const r = await page.evaluate(`(() => { const g = window.__cq.game; return { shelters: g.state.shelters.map(h => h.id), y: g.state.player.pos.y }; })()`);
  if (r.shelters.join() !== 'airraid-mattress') fail('starthideout', 'run did not start in the hideout: ' + JSON.stringify(r));
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 22 * 3600; g.state.flags.clear = true; Object.assign(g.state.player.pos, { x: 449.6, y: 32.05, z: 354 }); g.input.yaw = 0; g.input.pitch = 1.5; window.__cq.runFrames(10); })()`);
  await screenshot(page, 'starthideout-grate');
  await page.keyboard.press('Tab');
  await page.evaluate(`window.__cq.runFrames(3)`);
  const list = await page.evaluate(`document.querySelector('.inv-hideouts')?.textContent ?? ''`);
  if (!list.includes('Hideouts') || !list.includes('Old mattress')) fail('starthideout', 'inventory does not list the hideout: ' + list);
  await page.close();
}
