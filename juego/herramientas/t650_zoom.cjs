// El acercamiento solo del mundo: teléfono, iPad y PC en las tres vistas. Mide el tamaño del héroe y prueba un clic en el piso.
const { chromium } = require('playwright');
(async () => {
  const solo = process.argv[2];
  for (const [nom, vp, tactil, dpr] of [['movil', { width: 844, height: 390 }, true, 3], ['ipad', { width: 1194, height: 834 }, true, 2], ['pc', { width: 1920, height: 1080 }, false, 1]]) for (const vista of [0, 1, 2]) {
    if (solo && solo !== nom) continue;
    const b = await chromium.launch(); const c = await b.newContext({ viewport: vp, hasTouch: tactil, isMobile: tactil, deviceScaleFactor: dpr }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((v) => { localStorage.setItem('marca.intro', '1'); localStorage.setItem('marca.opciones', JSON.stringify({ general: 0, musica: 0, efectos: 0, horror: 0, idioma: 0, brillo: 1, vista: v })); }, vista);
    const aMenu = async () => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } };
    await p.goto('http://127.0.0.1:5190/'); await aMenu(); await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
    await p.evaluate(() => { const d = window.__T.H.nuevoHeroe('berserker', 'Rick'); d.nivel = 20; d.misiones = { m1_hambre: 3 }; localStorage.setItem('marca.heroes', JSON.stringify([d])); });
    await p.reload(); await aMenu(); await p.waitForTimeout(5000);
    const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); const v = window.__vista(); return { k: r.width / v.W, l: r.left, t: r.top, ...v, f: window.__menuFilas }; });
    const tap = async (x, y) => { if (tactil) await p.touchscreen.tap(L.l + x * L.k, L.t + y * L.k); else await p.mouse.click(L.l + x * L.k, L.t + y * L.k); };
    await tap(L.f.continuar[0], L.f.continuar[1]);
    for (let i = 0; i < 80; i++) { await p.waitForTimeout(400); const e = await p.evaluate(() => window.__estado()); if (e === 'juego') break; if (e === 'entreacto') await tap(L.W / 2, L.H / 2); }
    await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(7000);
    // el héroe en pantalla coincide con __aPant, y un clic a su derecha lo hace caminar hacia allá
    const h0 = await p.evaluate(() => { const h = window.__juego().heroe; return { x: h.x, y: h.y, p: window.__aPant(h.x, h.y), q: window.__aPant(h.x + 3, h.y - 3) }; });
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/zoom_${nom}_${vista}.png` });
    if (!tactil) { await p.mouse.click(h0.q[0], h0.q[1]); await p.waitForTimeout(2500); }
    const h1 = await p.evaluate(() => { const h = window.__juego().heroe; return { x: h.x, y: h.y }; });
    console.log(nom, vista, JSON.stringify({ W: L.W, H: L.H, ZM: L.ZM, cw: L.cw, ch: L.ch }), 'heroe en', h0.p.map(Math.round), tactil ? '' : `caminó ${(h1.x - h0.x).toFixed(1)},${(h1.y - h0.y).toFixed(1)} (esperado ~3,-3)`, errs.slice(0, 2)); await b.close();
  }
})();
