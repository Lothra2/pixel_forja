const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: +(process.env.DPR || 1), hasTouch: true, isMobile: true }); const p = await c.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); });
  await p.goto('http://127.0.0.1:5190/');
  for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
  for (const s of [6, 8, 9]) { await p.waitForTimeout(s === 6 ? 6000 : 1200); await p.screenshot({ path: `/tmp/claude-0/sp/pw/portada_${s}.png` }); }
  const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  console.log(JSON.stringify({ fps, errs: errs.slice(0, 3) }));
  await b.close();
})();
