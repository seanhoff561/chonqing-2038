// Browser smoke test: serves dist/, boots every scenario in headless Chrome with software WebGL,
// fails on console errors, then runs the checks in tests/e2e/*.e2e.mjs.
// Each failure prints one grep-able line: "SMOKE FAIL <where>: <message>".
import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = fs.existsSync(p) && fs.statSync(p).isFile() ? p : path.join(root, 'index.html');
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const fails = [];
let passes = 0;

async function open(query, where) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540 });
  page.on('console', m => { if (m.type() === 'error') fails.push(`${where}: console ${m.text().slice(0, 200)}`); });
  page.on('pageerror', e => fails.push(`${where}: pageerror ${String(e.message).split('\n')[0].slice(0, 200)}`));
  await page.goto(base + query, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction('window.__cq && window.__cq.ready', { timeout: 240000 });
  return page;
}

const ctx = { open, base, fail: (w, m) => fails.push(`${w}: ${m}`), screenshot: (page, name) => page.screenshot({ path: `logs/${name}.png` }) };
try {
  // Boot every scenario.
  const first = await open('?dev=1', 'boot');
  const scenarios = await first.evaluate('window.__cq.scenarios');
  await first.close();
  passes++;
  for (const s of process.env.SMOKE_ONLY ? [] : scenarios) {
    const page = await open(`?scenario=${s}`, `scenario ${s}`);
    await page.evaluate('window.__cq.runFrames(30)');
    await page.close();
    passes++;
  }
  // Feature checks.
  const dir = path.resolve('tests/e2e');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.e2e.mjs') && f.includes(process.env.SMOKE_ONLY ?? '')).sort()) {
    const mod = await import(path.join(dir, f));
    const before = fails.length;
    try { await mod.default(ctx); } catch (e) { fails.push(`${f}: ${String(e.message ?? e).split('\n')[0]}`); }
    if (fails.length === before) passes++;
  }
} catch (e) {
  fails.push(`harness: ${String(e.message ?? e).split('\n')[0]}`);
}
await browser.close();
server.close();
for (const f of fails) console.log(`SMOKE FAIL ${f}`);
if (fails.length) fs.appendFileSync('logs/smoke-fails.log', fails.map(f => `${new Date().toISOString()} ${f}\n`).join(''));
console.log(`smoke: ${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
