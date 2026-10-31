// M3-19: the Li family flat on a run, by day: the room turned over, his father's badge and the phone on the floor;
// the phone, used, plays its voicemail in subtitles.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=run&seed=1', 'liflat');
  const r = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state, t = g.world.teleports.find(q => q.name === 'Li family flat');
    if (!t) return null;
    s.time = 14 * 3600; s.flags.clear = true;
    const b = s.dropped.find(d => d.stack.id === 'badge');
    Object.assign(s.player.pos, { x: t.x, y: t.y - 1.45, z: t.z }); s.player.fallFrom = s.player.pos.y;
    const dx = b.x - t.x, dz = b.z - t.z; g.input.yaw = Math.atan2(-dx, -dz); g.input.pitch = -Math.atan2(1.5, Math.hypot(dx, dz));
    window.__cq.runFrames(40);
    return { items: s.dropped.map(d => d.stack.id).sort().join(','), mode: s.player.mode }; })()`);
  if (!r) { fail('liflat', 'no Li family flat teleport'); await page.close(); return; }
  if (r.items !== 'badge,phone') fail('liflat', `on the floor: ${r.items}`);
  await screenshot(page, 'liflat');
  // Into the backpack, then used: the subtitles carry the voicemail.
  const subs = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state, i = s.dropped.findIndex(d => d.stack.id === 'phone'), st = s.dropped.splice(i, 1)[0].stack;
    Object.assign(st, { x: 9, y: 0 }); s.inv.pack.items.push(st); g.input.cmds.push({ c: 'use', uid: st.uid }); window.__cq.runFrames(30);
    return document.querySelector('#hud .subs').textContent; })()`);
  if (!subs.includes('爸爸')) fail('liflat', `no voicemail in the subtitles: "${subs}"`);
  await screenshot(page, 'liflat-voicemail');
  await page.close();
}
