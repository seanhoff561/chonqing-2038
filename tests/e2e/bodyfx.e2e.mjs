// M2-08: low health shows through vignette and colour, never as a meter.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'bodyfx');
  await page.evaluate(`(() => { const b = window.__cq.game.state.body; b.hp = 15; b.lightBleed = 0; b.hydration = 5; })()`);
  await page.evaluate('window.__cq.runFrames(10)');
  const f = await page.evaluate('window.__cq.game.view.renderer.domElement.style.filter');
  if (!f.includes('saturate')) fail('bodyfx', `no filter at low health: "${f}"`);
  const text = await page.evaluate('document.getElementById("hud").innerText');
  if (/\d/.test(text)) fail('bodyfx', `numbers on the HUD: ${text}`);
  await screenshot(page, 'low-health');
  await page.close();
}
