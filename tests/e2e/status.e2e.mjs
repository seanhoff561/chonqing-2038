// M3-30 (U-014): the body status indicator shows a sprained leg, light bleeding and thirst, and dims when he's fine.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'status');
  const read = js => page.evaluate(`(() => { const g = window.__cq.game; ${js}; window.__cq.runFrames(3); const el = document.getElementById('status'); return { legs: el.querySelector('[data-part=legs]').getAttribute('fill'), pulse: !!el.querySelector('.pulse'), needs: el.querySelector('.needs').textContent, opacity: Number(el.style.opacity) }; })()`);
  const hurt = await read(`const b = g.state.body; b.leg = 'sprain'; b.legHealAt = g.state.time + 1e6; b.lightBleed = 0; b.hydration = 20`);
  if (hurt.legs !== '#d9a520' || !hurt.pulse || !hurt.needs.includes('thirsty') || hurt.opacity < 0.9) fail('status', JSON.stringify(hurt));
  await screenshot(page, 'status-hurt');
  const fine = await read(`const b = g.state.body; b.leg = 'ok'; b.lightBleed = -1; b.hydration = 90; g.status.update(g.state, 10)`);
  if (fine.pulse || fine.needs !== '' || fine.opacity > 0.3) fail('status', `fine: ${JSON.stringify(fine)}`);
  await page.close();
}
