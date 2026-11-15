// La portada en cuatro pantallas: 16:9, monitor ancho (como la captura de Rick), iPad y teléfono. Con partida guardada.
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const solo = process.argv[2];
  for (const [nom, cfg] of [['pc', { viewport: { width: 1280, height: 720 } }], ['ancha', { viewport: { width: 1911, height: 800 } }], ['ipad', { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true }], ['movil', { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } }]]) {
    if (solo && solo !== nom) continue;
    const c = await b.newContext({ ...cfg, deviceScaleFactor: 1 }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); });
    const aMenu = async () => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } };
    await p.goto('http://127.0.0.1:5190/'); await aMenu();
    await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
    await p.evaluate(() => { const d = window.__T.H.nuevoHeroe('berserker', 'Rick'); d.nivel = 34; d.acto = 3; localStorage.setItem('marca.heroes', JSON.stringify([d])); });
    await p.reload(); await aMenu(); await p.waitForTimeout(9000);
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/portada_${nom}.png` });
    const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
    console.log(nom, fps, errs.slice(0, 2)); await c.close();
  }
  await b.close();
})();
