// M3-49 (U-021): the painted sky at dawn, noon, dusk and night, clear and overcast, looking out over Jiefangbei
// from 60 m up. Composed into one picture: logs/skies.png (clear on top, overcast below).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'skies');
  const shots = [];
  for (const over of [0, 1]) for (const [name, h] of [['dawn', 6.3], ['noon', 12], ['dusk', 18.2], ['night', 23]]) {
    const r = await page.evaluate(`(() => {
      const g = window.__cq.game, s = g.world.teleports.find(t => t.name === 'jiefangbei');
      g.state.time = ${h} * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.sky.overcast = ${over};
      Object.assign(g.state.player.pos, { x: s.x, y: s.y + 60, z: s.z }); g.input.yaw = ${name === 'dusk' ? -1.4 : name === 'dawn' ? 1.4 : 2.6}; g.input.pitch = 0.18;
      window.__cq.runFrames(4);
      return g.sky.dome.mesh.visible;
    })()`);
    if (!r) fail('skies', `no sky dome at ${name}`);
    const file = `skies-${over ? 'overcast' : 'clear'}-${name}`;
    await screenshot(page, file);
    shots.push(file);
  }
  await page.evaluate('window.__cq.game.sky.overcast = 0');
  console.log(`  skies: ${shots.length} shots`);
}
