// El menú de la portada con una partida guardada: captura en reposo, con el puntero sobre un renglón, y en iPad y teléfono.
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [nom, cfg] of [['pc', { viewport: { width: 1280, height: 720 } }], ['ipad', { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true }], ['movil', { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } }]]) {
    const c = await b.newContext({ ...cfg, deviceScaleFactor: 1 }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); });
    const aMenu = async () => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } };
    await p.goto('http://127.0.0.1:5190/'); await aMenu();
    await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
    await p.evaluate(() => { const d = window.__T.H.nuevoHeroe('berserker', 'Rick'); d.nivel = 34; d.acto = 3; localStorage.setItem('marca.heroes', JSON.stringify([d])); });
    await p.reload(); await aMenu(); await p.waitForTimeout(8000);
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/menu_${nom}.png` });
    if (nom === 'pc') { const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top, f: window.__menuFilas }; }); await p.mouse.move(L.l + L.f.opciones[0] * L.k, L.t + L.f.opciones[1] * L.k); await p.waitForTimeout(700); await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/menu_pc2.png' }); }
    console.log(nom, JSON.stringify(await p.evaluate(() => window.__menuFilas)), errs.slice(0, 2));
    await c.close();
  }
  await b.close();
})();
