// Uso: node hud_tactil.cjs (dev en 5190). Lee los módulos con import(), así que necesita el servidor de desarrollo.
// HUD táctil: rects sin cruces, toques de 44 pt o más, 50 pt libres a los lados y toques reales.
const { chromium } = require('playwright');
const RES = [[844, 390], [932, 430], [667, 375], [844, 340]];
(async () => {
  const b = await chromium.launch(); const fallas = [];
  for (const [w, h] of RES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); sessionStorage.setItem('vertical-ok', '1'); });
    await p.goto(process.env.URL || 'http://127.0.0.1:5190/'); for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
    await p.evaluate(async () => { const d = window.__T.H.nuevoHeroe('berserker', 'X'); d.nivel = 12; d.misiones = { m1_hambre: 1 }; d.atajos = [null, null, null, null, null, null, null, null, null, null]; localStorage.setItem('marca.heroes', JSON.stringify([d])); });
    await p.reload(); for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
    await p.waitForTimeout(4800);
    const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top, W: c.width, H: c.height }; });
    const tap = (x, y) => p.touchscreen.tap(L.l + x * L.k, L.t + y * L.k);
    if (L.W >= 900) await tap(L.W / 2 - 333, L.H - 73); else await tap(L.W / 2, L.H * 0.62 + 19); await p.waitForTimeout(800); await tap(L.W / 2 + 240, L.H * 0.35 + 99);
    for (let i = 0; i < 80; i++) { await p.waitForTimeout(400); const e = await p.evaluate(() => window.__estado()); if (e === 'juego') break; if (e === 'entreacto') await tap(L.W / 2, L.H / 2); }
    await p.evaluate(() => window.__ir('a1_paramo')); for (let i = 0; i < 40; i++) { await p.waitForTimeout(300); if (await p.evaluate(() => window.__estado()) === 'juego') break; }
    await p.waitForTimeout(1500);
    const info = await p.evaluate(async () => { const HT = await import('/src/ui/hud_tactil.ts'); const HR = await import('/src/ui/hud_rects.ts'); const LZ = await import('/src/nucleo/lienzo.ts'); return { hud: { ...HR.hud }, toques: HT.toques.map((t) => ({ ...t })), esc: LZ.ESCALA, W: LZ.W }; });
    const cruzan = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
    const ks = Object.keys(info.hud).filter((k) => k !== 'barra');
    for (let i = 0; i < ks.length; i++) for (let k = i + 1; k < ks.length; k++) if (cruzan(info.hud[ks[i]], info.hud[ks[k]])) fallas.push(`${w}x${h}: ${ks[i]} cruza ${ks[k]}`);
    for (const t of info.toques) { const pw = t.r[2] * info.esc, ph = t.r[3] * info.esc; if (pw < 43.5 || ph < 43.5) fallas.push(`${w}x${h}: ${t.id} mide ${pw.toFixed(0)}x${ph.toFixed(0)} pt`); }
    const m50 = 50 / info.esc - 0.5;
    for (const k of ks) { const r = info.hud[k]; if (k === 'mensajes') continue; if (r[0] < m50 || r[0] + r[2] > info.W - m50) fallas.push(`${w}x${h}: ${k} dentro de 50 pt del borde (${r[0].toFixed(0)}..${(r[0] + r[2]).toFixed(0)} de ${info.W})`); }
    await p.screenshot({ path: `hudt_${w}x${h}.png` });
    // toques reales: poción, Golpe junto a un monstruo, Poder, y el joystick
    const centro = (r) => [r[0] + r[2] / 2, r[1] + r[3] / 2];
    const antes = await p.evaluate(() => { const j = window.__juego(); const h = j.heroe; h.vida = h.vidaMax * 0.4; return { poc: h.d.cinturon[0]?.cantidad ?? (h.d.cinturon[0] ? 1 : 0), vida: h.vida }; });
    const pc = info.hud.cinturon; await tap(pc[0] + pc[3] / 2, pc[1] + pc[3] / 2); await p.waitForTimeout(600);
    const tras = await p.evaluate(() => { const h = window.__juego().heroe; return { poc: h.d.cinturon[0]?.cantidad ?? (h.d.cinturon[0] ? 1 : 0), panel: window.__U.ui.izq || window.__U.ui.der }; });
    if (!(tras.poc < antes.poc)) fallas.push(`${w}x${h}: la poción no se bebió (${antes.poc} → ${tras.poc})`);
    const mon = await p.evaluate(() => { const j = window.__juego(); const h = j.heroe; const m = j.monstruos.find((q) => !q.muerto && !q.dueno && !q.def.surge); if (!m) return null; m.x = h.x + 1; m.y = h.y + 0.6; m.estado = 'dormido'; m.vida = m.vidaMax; return m.vida; });
    await tap(...centro(info.hud.golpe)); await p.waitForTimeout(1500);
    const golpe = await p.evaluate(() => { const j = window.__juego(); const h = j.heroe; const m = j.monstruos.filter((q) => !q.dueno).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0]; return { vida: m?.vida, max: m?.vidaMax, muerto: m?.muerto, panel: window.__U.ui.izq || window.__U.ui.der }; });
    if (!(golpe.muerto || golpe.vida < golpe.max)) fallas.push(`${w}x${h}: Golpe no le pegó al monstruo`);
    await tap(...centro(info.hud.poder)); await p.waitForTimeout(800);
    // joystick: arrastre real con eventos táctiles hacia la derecha
    const pos0 = await p.evaluate(() => { const h = window.__juego().heroe; for (const m of window.__juego().monstruos) if (!m.dueno) { m.vida = 0; m.muerto = true; } return [h.x, h.y]; });
    const cdp = await ctx.newCDPSession(p);
    const sx = L.l + L.W * 0.18 * L.k, sy = L.t + L.H * 0.75 * L.k;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy }] });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + i * 10, y: sy }] }); await p.waitForTimeout(50); }
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `hudt_joy_${w}x${h}.png` });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const pos1 = await p.evaluate(() => { const h = window.__juego().heroe; return [h.x, h.y, window.__U.ui.izq || window.__U.ui.der]; });
    const mov = Math.hypot(pos1[0] - pos0[0], pos1[1] - pos0[1]);
    if (mov < 1) fallas.push(`${w}x${h}: el joystick no movió al héroe (${mov.toFixed(2)})`);
    if (tras.panel || golpe.panel || pos1[2]) fallas.push(`${w}x${h}: se abrió un panel sin querer (${tras.panel || golpe.panel || pos1[2]})`);
    if (errs.length) fallas.push(`${w}x${h}: errores ${errs.slice(0, 2).join(' | ')}`);
    console.log(`${w}x${h} lógico ${L.W}x${L.H} escala ${info.esc.toFixed(2)} toques ${info.toques.length} poción ${antes.poc}→${tras.poc} golpe ${golpe.muerto ? 'mató' : golpe.vida + '/' + golpe.max} joystick ${mov.toFixed(1)} casillas`);
    await ctx.close();
  }
  console.log(fallas.length ? 'FALLAS:\n' + fallas.join('\n') : 'HUD táctil bien en los 4 tamaños');
  await b.close(); process.exit(fallas.length ? 1 : 0);
})();
