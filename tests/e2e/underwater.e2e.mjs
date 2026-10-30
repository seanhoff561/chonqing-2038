// M3-48 (U-021): under the river the view turns murky green-brown, short-sighted, dim, silt drifting; back above it
// clears at once. The river off Chaotianmen, a metre and a half under and over the surface, looking at the city.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'underwater');
  for (const [name, dy] of [['under', -1.5], ['over', 1.5]]) {
    const r = await page.evaluate(`(() => {
      const g = window.__cq.game, w = g.world, hf = w.ground, c = w.teleports.find(t => t.name === 'chaotianmen'), water = w.water[0];
      const hy = (x, z) => hf.y[Math.round(z / hf.cell) * hf.w + Math.round(x / hf.cell)];
      // Out from the tip of the peninsula until the riverbed is well under the surface.
      let x = c.x, z = c.z, a = Math.atan2(c.z - 1400, c.x - 1200);
      for (let k = 0; k < 400 && hy(x, z) > water.y1 - 3; k++) { x += Math.cos(a) * 2; z += Math.sin(a) * 2; }
      g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      Object.assign(g.state.player.pos, { x: x + Math.cos(a) * 20, y: water.y1 + ${dy} - 1.5, z: z + Math.sin(a) * 20 });
      g.input.yaw = Math.atan2(Math.cos(a), Math.sin(a)); g.input.pitch = 0.1;
      window.__cq.runFrames(8);
      return { murk: g.underwater.silt.visible, fog: g.view.scene.fog.far };
    })()`);
    console.log(`  underwater ${name}: murk ${r.murk}, sight ${r.fog.toFixed(0)} m`);
    if (r.murk !== (name === 'under')) fail('underwater', `${name}: murk ${r.murk}`);
    await screenshot(page, `underwater-${name}`);
  }
}
