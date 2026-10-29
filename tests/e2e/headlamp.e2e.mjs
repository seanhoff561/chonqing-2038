// U-019: at night the headlamp lights the street ahead: white much brighter than off, red a little.
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=shibati&seed=1', 'headlamp');
  await page.evaluate(`window.__cq.give('headlamp')`);
  const shot = async (mode, name) => {
    await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 23 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; Object.assign(g.state.player.pos, { x: 470, y: 44.05, z: 404 }); g.input.yaw = Math.PI; g.input.pitch = -0.25; g.state.player.lamp = ${mode}; window.__cq.runFrames(6); if (g.state.player.lamp !== ${mode}) throw new Error('lamp did not stay on'); })()`);
    // Read the middle of the frame straight after a render (the canvas doesn't keep its buffer).
    const lum = await page.evaluate(`(() => { const g = window.__cq.game; g.view.render(0, {}); const gl = g.view.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight; const d = new Uint8Array(200 * 100 * 4); gl.readPixels((w >> 1) - 100, (h >> 1) - 80, 200, 100, gl.RGBA, gl.UNSIGNED_BYTE, d); let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; })()`);
    await screenshot(page, name);
    return lum;
  };
  const off = await shot(0, 'headlamp-off'), white = await shot(1, 'headlamp-white'), red = await shot(2, 'headlamp-red');
  if (!(white > off * 1.6 + 4)) fail('headlamp', `white ${white.toFixed(1)} vs off ${off.toFixed(1)}`);
  if (!(red > off)) fail('headlamp', `red ${red.toFixed(1)} vs off ${off.toFixed(1)}`);
  await page.close();
}
