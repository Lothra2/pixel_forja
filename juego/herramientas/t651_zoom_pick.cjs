// Con el mundo acercado, el clic sobre un monstruo lo marca y lo ataca, y la etiqueta del botín se puede tocar.
const { chromium } = require('playwright');
(async () => {
  for (const vista of [1, 2]) {
    const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((v) => { localStorage.setItem('marca.intro', '1'); localStorage.setItem('marca.opciones', JSON.stringify({ general: 0, musica: 0, efectos: 0, horror: 0, idioma: 0, brillo: 1, vista: v })); }, vista);
    const aMenu = async () => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } };
    await p.goto('http://127.0.0.1:5190/'); await aMenu(); await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
    await p.evaluate(() => { const d = window.__T.H.nuevoHeroe('berserker', 'Rick'); d.nivel = 20; d.misiones = { m1_hambre: 3 }; localStorage.setItem('marca.heroes', JSON.stringify([d])); });
    await p.reload(); await aMenu(); await p.waitForFunction(() => window.__menuFilas && window.__menuFilas.continuar, null, { timeout: 60000 });
    const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); const v = window.__vista(); return { k: r.width / v.W, l: r.left, t: r.top, ...v, f: window.__menuFilas }; });
    await p.mouse.click(L.l + L.f.continuar[0] * L.k, L.t + L.f.continuar[1] * L.k);
    for (let i = 0; i < 80; i++) { await p.waitForTimeout(400); const e = await p.evaluate(() => window.__estado()); if (e === 'juego') break; if (e === 'entreacto') await p.mouse.click(600, 400); }
    await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(6000);
    // trae un monstruo a 3 casillas, quieto, y le hace clic en el cuerpo
    await p.evaluate(async () => { const j = window.__juego(), h = j.heroe, M = window.__mundo; j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
      const D = await import('/src/datos/monstruos.ts'); const m = M.crearMonstruo(D.MONSTRUOS.zombi, 10, h.x + 2.5, h.y + 0.5, 0, 0); m.vida = m.vidaMax = 99999; m.vel = 0; m.dano = [0, 0]; j.monstruos.push(m); });
    await p.waitForTimeout(600);
    const pos = await p.evaluate(() => { const j = window.__juego(), h = j.heroe; const m = j.monstruos.filter((x) => !x.muerto && !x.dueno).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0]; const a = window.__aPant(m.x, m.y), s = window.__aPant(m.x - 1, m.y - 1); return { a, alto: a[1] - s[1] }; });
    const cx = pos.a[0], cy = pos.a[1] - pos.alto * 1.2;
    await p.mouse.move(cx, cy); await p.waitForTimeout(400);
    await p.mouse.down(); await p.waitForTimeout(2500); await p.mouse.up();
    const r = await p.evaluate(() => { const j = window.__juego(), h = j.heroe; const m = j.monstruos.filter((x) => !x.muerto && !x.dueno).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0]; return { vida: m.vida, d: Math.hypot(m.x - h.x, m.y - h.y) }; });
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/zoom_pick_${vista}.png` });
    console.log('vista', vista, 'ZM', L.ZM, 'daño hecho', 99999 - Math.round(r.vida), 'distancia', r.d.toFixed(2), errs.slice(0, 2)); await b.close();
  }
})();
