// La opción de vista: el juego en las tres vistas, en PC y en iPad.
const { chromium } = require('playwright');
(async () => {
  for (const [nom, vp, tactil] of [['pc', { width: 1280, height: 720 }, false], ['ipad', { width: 1180, height: 820 }, true]]) for (const vista of [0, 1, 2]) {
    const b = await chromium.launch(); const c = await b.newContext({ viewport: vp, hasTouch: tactil, isMobile: tactil }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((v) => { localStorage.setItem('marca.intro', '1'); localStorage.setItem('marca.opciones', JSON.stringify({ general: 0, musica: 0, efectos: 0, horror: 0, idioma: 0, brillo: 1, vista: v })); }, vista);
    const aMenu = async () => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } };
    await p.goto('http://127.0.0.1:5190/'); await aMenu(); await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
    await p.evaluate(() => { const d = window.__T.H.nuevoHeroe('berserker', 'Rick'); d.nivel = 20; d.misiones = { m1_hambre: 3 }; localStorage.setItem('marca.heroes', JSON.stringify([d])); });
    await p.reload(); await aMenu(); await p.waitForTimeout(5000);
    const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top, W: c.width, H: c.height, f: window.__menuFilas }; });
    const tap = async (x, y) => { if (tactil) await p.touchscreen.tap(L.l + x * L.k, L.t + y * L.k); else await p.mouse.click(L.l + x * L.k, L.t + y * L.k); };
    await tap(L.f.continuar[0], L.f.continuar[1]);
    for (let i = 0; i < 80; i++) { await p.waitForTimeout(400); const e = await p.evaluate(() => window.__estado()); if (e === 'juego') break; if (e === 'entreacto') await tap(L.W / 2, L.H / 2); }
    await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(6000);
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/vista_${nom}_${vista}.png` });
    console.log(nom, vista, L.W, L.H, errs.slice(0, 2)); await b.close();
  }
})();
