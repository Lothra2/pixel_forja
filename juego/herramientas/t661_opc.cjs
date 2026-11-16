const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
  for (const [nom, vp, dpr] of [['movil', { width: 844, height: 390 }, 3], ['pc', { width: 1280, height: 720 }, 1]]) {
    const c = await b.newContext({ viewport: vp, hasTouch: nom === 'movil', isMobile: nom === 'movil', deviceScaleFactor: dpr }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && errs.length < 3) { errs.push(m.text().slice(0, 300)); console.log(m.text().slice(0, 300)); } });
    await p.addInitScript(() => { localStorage.setItem('marca.intro', '1');  });
    await p.goto('http://127.0.0.1:5190/'); for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
    await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 }); await p.evaluate(() => { const d = window.__T.H.nuevoHeroe('berserker', 'Rick'); localStorage.setItem('marca.heroes', JSON.stringify([d])); }); await p.reload(); await p.waitForFunction(() => window.__menuFilas && window.__menuFilas.opciones, null, { timeout: 60000 });
    const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); const v = window.__vista(); return { k: r.width / v.W, l: r.left, t: r.top, f: window.__menuFilas }; });
    console.log(nom, Object.keys(L.f));
    const tap = async (x, y) => { if (nom === 'movil') await p.touchscreen.tap(L.l + x * L.k, L.t + y * L.k); else await p.mouse.click(L.l + x * L.k, L.t + y * L.k); };
    for (let i = 0; i < 3 && (await p.evaluate(() => window.__estado())) === 'menu'; i++) { await tap(L.f.opciones[0], L.f.opciones[1]); await p.waitForTimeout(1500); }
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/opc_${nom}.png` });
    const P = await p.evaluate(() => window.__pantalla); await tap(P.partida0[0], P.partida0[1]); await p.waitForTimeout(1500);
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/opc_${nom}_exp.png` }); console.log(errs);
    await c.close(); }
  await b.close(); })();
