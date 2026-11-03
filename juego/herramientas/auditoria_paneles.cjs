// Auditoría de paneles: abre y cierra cada panel con la X, con Escape, tocando fuera y alejándose, en 4 resoluciones.
// Falla (código 1) si queda algún panel o ui.* abierto, o si la barra o los botones táctiles quedan encima de un panel.
// Además revisa encimados: Golpe, Poder, barra, botón agresivo, mensajes y nombres de salidas no se cruzan entre sí ni con un panel abierto.
// Uso: node auditoria_paneles.cjs (dev en 5190) o URL=http://127.0.0.1:5191/publicar.html node auditoria_paneles.cjs
const { chromium, devices } = require('playwright');
const RES = [[844, 390, true, 'iphone_apaisado'], [390, 844, true, 'iphone_vertical'], [1180, 820, true, 'ipad'], [1280, 720, false, 'escritorio']];
(async () => {
  const b = await chromium.launch();
  const fallas = [];
  for (const [w, h, tactil, nombre] of RES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: tactil, isMobile: tactil, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); sessionStorage.setItem('vertical-ok', '1'); });
    await p.goto('' + (process.env.URL || 'http://127.0.0.1:5190/') + '', { waitUntil: 'load' });
    // pantalla de carga: foto apenas aparece
    await p.waitForTimeout(700); await p.screenshot({ path: `aud_${nombre}_carga.png` });
    for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
    await p.waitForTimeout(5000); await p.screenshot({ path: `aud_${nombre}_portada.png` });
    // entrar con un héroe al pueblo
    await p.evaluate(async () => { for (let i = 0; i < 50 && !window.__T; i++) await new Promise((r) => setTimeout(r, 100)); const d = window.__T.H.nuevoHeroe('templario', 'X'); d.nivel = 20; d.misiones = { m1_hambre: 3 }; localStorage.setItem('marca.heroes', JSON.stringify([d])); });
    await p.reload(); for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
    await p.waitForTimeout(4800);
    const clic = async (x, y) => { if (tactil) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };
    const lienzo = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top, W: c.width, H: c.height }; });
    const aPag = (x, y) => [lienzo.l + x * lienzo.k, lienzo.t + y * lienzo.k];
    // botón Jugar (fila de abajo en anchas, columna en angostas) → lo más robusto: entrar por la API de pruebas
    const filas = lienzo.W >= 900;
    if (filas) await clic(...aPag(lienzo.W / 2 - 333, lienzo.H - 73)); else await clic(...aPag(lienzo.W / 2, lienzo.H * 0.62 + 19));
    await p.waitForTimeout(800);
    await clic(...aPag(lienzo.W / 2 + 140 + 100, lienzo.H * 0.35 + 80 + 19));
    for (let i = 0; i < 80; i++) { await p.waitForTimeout(400); const e = await p.evaluate(() => window.__estado()); if (e === 'juego') break; if (e === 'entreacto') await clic(...aPag(lienzo.W / 2, lienzo.H / 2)); }
    if (await p.evaluate(() => window.__estado()) !== 'juego') { fallas.push(`${nombre}: no entró al juego (${await p.evaluate(() => window.__estado())})`); await ctx.close(); continue; }
    await p.evaluate(() => window.__ir('a1_refugio'));
    for (let i = 0; i < 60; i++) { await p.waitForTimeout(300); if (await p.evaluate(() => window.__estado()) === 'juego') break; }
    await p.waitForTimeout(800);
    // encimados: botones táctiles, barra, agresivo, mensajes y nombres de salidas no se pueden cruzar
    {
      const cruzan = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
      await p.evaluate(() => { const j = window.__juego(); for (const t of ['Habla con el Maestro Odrán junto al fuego', 'El Refugio de los Cenicientos', 'Una tercera línea de prueba bastante larga']) j.mensajes.push({ txt: [t, t], color: '#fff', t: 0 }); });
      const sa = await p.evaluate(() => { const z = window.__juego().zona; return z.salidas.filter((s) => !s.obj).map((s) => { const a = z.entradas['salida_' + s.destino] ?? [s.cx, s.cy]; return [(s.cx + a[0]) / 2 + 0.5, (s.cy + a[1]) / 2 + 0.5]; }); });
      const vistos = new Set();
      for (const [sx, sy] of sa) for (const [dx, dy] of [[-4, 0], [-6, 0], [-3, -3], [0, -5], [-2, 2], [2, -2], [0, 0]]) {
        await p.evaluate(([x, y]) => { const h = window.__juego().heroe; h.x = x; h.y = y; window.__juego().mensajes.forEach((m) => (m.t = 0)); }, [sx + dx, sy + dy]);
        await p.waitForTimeout(700);
        const { hud, etiquetas } = await p.evaluate(() => window.__hud());
        const ks = Object.keys(hud);
        for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) if (cruzan(hud[ks[a]], hud[ks[b]])) vistos.add(`${ks[a]} cruza ${ks[b]}`);
        for (const e of etiquetas) for (const k of ks) if (cruzan(e.r, hud[k])) vistos.add(`salida "${e.txt}" cruza ${k}`);
      }
      if (tactil) { const h = await p.evaluate(() => window.__hud().hud); if (!h.golpe || !h.poder) vistos.add('no se registraron Golpe y Poder'); }
      for (const v of vistos) fallas.push(`${nombre} encimado: ${v}`);
      await p.screenshot({ path: `aud_${nombre}_hud.png` });
      await p.evaluate(() => { window.__juego().mensajes.length = 0; });
    }
    // si el primer clic ya marcó táctil
    const abrir = {
      inv: () => p.evaluate(() => { window.__U.ui.der = 'inv'; }),
      pers: () => p.evaluate(() => { window.__U.ui.izq = 'pers'; }),
      habs: () => p.evaluate(() => { window.__U.ui.izq = 'habs'; }),
      misiones: () => p.evaluate(() => { window.__U.ui.izq = 'misiones'; }),
      dialogo: () => p.evaluate(() => { const j = window.__juego(); const n = j.npcs[0]; j.heroe.x = n.x + 1; j.heroe.y = n.y + 1; window.__U.hablarCon(j, n.npc); }),
      tienda: () => p.evaluate(() => { const j = window.__juego(); const n = j.npcs.find((q) => q.npc === 'brannoc') ?? j.npcs[0]; j.heroe.x = n.x + 1; j.heroe.y = n.y + 1; window.__U.hablarCon(j, n.npc); window.__U.abrirTienda(j, 'herrero'); }),
      baul: () => p.evaluate(() => { const j = window.__juego(); const o = j.zona.objetos.find((o) => o.tag === 'baul'); j.heroe.x = o.cx + 1.5; j.heroe.y = o.cy + 1.5; window.__usar(o); }),
      viaje: () => p.evaluate(() => { const j = window.__juego(); const o = j.zona.objetos.find((o) => o.id === 'com_piedra_viaje'); j.heroe.x = o.cx + 1.5; j.heroe.y = o.cy + 1.5; window.__usar(o); }),
    };
    const estadoUi = () => p.evaluate(() => { const u = window.__U.ui; return { izq: u.izq, der: u.der, mapa: u.mapa, origen: !!u.origen, npc: u.npc, oferta: u.oferta ?? null }; });
    const abierto = (s) => s.izq || s.der || s.mapa || s.origen || s.npc || s.oferta;
    const modos = tactil ? ['x', 'fuera', 'alejarse'] : ['x', 'escape', 'alejarse'];
    for (const [pid, f] of Object.entries(abrir)) for (const modo of modos) {
      if (modo === 'alejarse' && !['dialogo', 'tienda', 'baul', 'viaje'].includes(pid)) continue;
      await f(); await p.waitForTimeout(350);
      let s = await estadoUi();
      if (!(s.izq || s.der)) { fallas.push(`${nombre} ${pid}: no abrió`); continue; }
      if (modo === 'x' || modo === 'fuera') await p.screenshot({ path: `aud_${nombre}_${pid}.png` });
      // nada encima: con pantalla baja la barra no se dibuja; los botones táctiles nunca con panel
      const lado = s.der ? 'der' : 'izq';
      {
        const cruzan = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
        await p.waitForTimeout(150);
        const { hud } = await p.evaluate(() => window.__hud());
        for (const l of ['izq', 'der']) if (s[l]) { const rp = await p.evaluate((l) => window.__U.rectPanel(l), l); for (const [k, r] of Object.entries(hud)) if (k !== 'barra' && k !== 'mensajes' && cruzan(r, rp)) fallas.push(`${nombre} ${pid}: ${k} encima del panel ${l}`); }
      }
      if (modo === 'x') {
        const r = await p.evaluate((lado) => { const [x, y, w] = window.__U.rectPanel(lado); return [x, y, w]; }, lado);
        const k = r[2] / 320, tx = tactil ? 46 : 30;
        await clic(...aPag(r[0] + (320 - tx / 2 - 4) * k, r[1] + (4 + tx / 2) * k));
        // si había dos paneles (tienda + inventario), cerrar el que quede con su X
        await p.waitForTimeout(250); s = await estadoUi();
        for (const l2 of ['izq', 'der']) if (s[l2]) { const r2 = await p.evaluate((l) => window.__U.rectPanel(l), l2); const k2 = r2[2] / 320; await clic(...aPag(r2[0] + (320 - tx / 2 - 4) * k2, r2[1] + (4 + tx / 2) * k2)); await p.waitForTimeout(250); }
      } else if (modo === 'escape') await p.keyboard.press('Escape');
      else if (modo === 'fuera') {
        const ri = await p.evaluate(() => window.__U.rectPanel('izq')); const rd = await p.evaluate(() => window.__U.rectPanel('der'));
        const x0 = s.izq ? ri[0] + ri[2] : 0, x1 = s.der ? rd[0] : lienzo.W;
        if (x1 - x0 < 20) { await p.evaluate(() => window.__U.cerrarPaneles()); continue; } // sin lugar fuera: solo queda la X (ya probada)
        await clic(...aPag((x0 + x1) / 2, lienzo.H * 0.4));
      }
      else if (modo === 'alejarse') await p.evaluate(() => { const h = window.__juego().heroe; h.x += 6; h.y += 2; });
      await p.waitForTimeout(400);
      s = await estadoUi();
      if (abierto(s)) fallas.push(`${nombre} ${pid} ${modo}: quedó abierto ${JSON.stringify(s)}`);
      await p.evaluate(() => window.__U.cerrarPaneles());
    }
    if (errs.length) fallas.push(`${nombre}: errores ${errs.slice(0, 2).join(' | ')}`);
    console.log(nombre, 'W×H lógico', lienzo.W, lienzo.H, 'compacto', await p.evaluate(() => window.__U.compacto()));
    await ctx.close();
  }
  console.log(fallas.length ? 'FALLAS:\n' + fallas.join('\n') : 'todo cerró bien en las 4 resoluciones');
  await b.close();
  process.exit(fallas.length ? 1 : 0);
})();
