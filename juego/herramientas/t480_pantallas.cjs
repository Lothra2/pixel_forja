// Pantallas de menú con tres héroes guardados: selección, crear y opciones, en PC, iPad y teléfono.
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const solo = process.argv[2];
  for (const [nom, cfg] of [['pc', { viewport: { width: 1280, height: 720 } }], ['ipad', { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true }], ['movil', { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } }]]) {
    if (solo && solo !== nom) continue;
    const c = await b.newContext({ ...cfg, deviceScaleFactor: 1 }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); });
    const aMenu = async () => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } };
    await p.goto('http://127.0.0.1:5190/'); await aMenu();
    await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
    await p.evaluate(() => { const H = window.__T.H; const a = H.nuevoHeroe('berserker', 'Rick'); a.nivel = 34; a.acto = 3; a.jugado = 9000; const b2 = H.nuevoHeroe('arcanista', 'Sophie'); b2.nivel = 12; b2.acto = 1; b2.id = a.id + 1; const c2 = H.nuevoHeroe('cazadora', 'Alana'); c2.nivel = 51; c2.acto = 6; c2.dificultad = 1; c2.id = a.id + 2; localStorage.setItem('marca.heroes', JSON.stringify([a, b2, c2])); });
    await p.reload(); await aMenu(); await p.waitForTimeout(7000);
    const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top, W: c.width, H: c.height }; });
    const tap = async (x, y) => { if (nom === 'pc') await p.mouse.click(L.l + x * L.k, L.t + y * L.k); else await p.touchscreen.tap(L.l + x * L.k, L.t + y * L.k); await p.waitForTimeout(900); };
    const fila = async (id) => { const q = await p.evaluate((id) => window.__menuFilas[id], id); await tap(q[0], q[1]); };
    const hook = async (id) => { const q = await p.evaluate((id) => (window.__pantalla || {})[id], id); if (q) await tap(q[0], q[1]); return !!q; };
    await fila('jugar'); await p.waitForTimeout(2500); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/pan_${nom}_sel.png` });
    if (await hook('heroe1')) { await p.waitForTimeout(2500); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/pan_${nom}_sel2.png` }); }
    if (await hook('crear')) { await p.waitForTimeout(2500); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/pan_${nom}_crear.png` }); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(600); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    const est = await p.evaluate(() => window.__estado());
    if (est !== 'menu') { await hook('volver'); await hook('volver'); }
    await fila('opciones'); await p.waitForTimeout(1200); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/pan_${nom}_opc.png` });
    console.log(nom, est, JSON.stringify(await p.evaluate(() => window.__pantalla || null)).slice(0, 300), errs.slice(0, 2));
    await c.close();
  }
  await b.close();
})();
