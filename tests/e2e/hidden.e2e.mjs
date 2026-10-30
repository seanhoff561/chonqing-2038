// M3-47 (U-021): hidden, he sees the inside of what he's in, not through it: in a crate (slats and daylight), a
// dumpster (its lid propped a crack) and a wardrobe (the crack between its doors), each the one nearest Shibati.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'hidden');
  for (const kind of ['crate', 'dumpster', 'wardrobe']) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, w = g.world, s = w.teleports.find(t => t.name === 'shibati');
      let best = -1, bd = Infinity;
      w.hides.forEach((h, i) => { if (h.kind !== ${JSON.stringify(kind)}) return; const d = Math.hypot(h.inner.x0 - s.x, h.inner.z0 - s.z); if (d < bd) { bd = d; best = i; } });
      if (best < 0) return false;
      const h = w.hides[best], b = h.inner, p = g.state.player;
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.god = true;
      Object.assign(p.pos, { x: (b.x0 + b.x1) / 2, y: b.y0, z: (b.z0 + b.z1) / 2 });
      p.mode = 'hidden'; p.posture = 'hidden'; p.hideId = best; p.hideExit = { ...p.pos };
      // Facing its front (the doors, the propped lid's side), a little up.
      g.input.yaw = (h.yaw || 0) + Math.PI; g.input.pitch = ${kind === 'dumpster' ? 0.5 : 0.05};
      window.__cq.runFrames(6);
      return g.hideView.group.visible;
    })()`);
    if (!ok) fail('hidden', `no inside view in a ${kind}`);
    await screenshot(page, `hidden-${kind}`);
  }
}
