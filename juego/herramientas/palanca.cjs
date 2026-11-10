// Palanca táctil analógica: el héroe va en el rumbo del pulgar (no solo 8), y al soltar da un último paso frenando.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const { b, p, L, errs } = await entrar('ipad', 'berserker', 10);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(3500);
  await p.evaluate(() => { const j = window.__juego(), h = j.heroe; h.vida = h.vidaMax = 1e6; j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } }); });
  const cdp = await p.context().newCDPSession(p);
  const toque = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: L.l + x * L.k, y: L.t + y * L.k }] });
  const out = [];
  for (const ang of [20, 65, 110, 200, 290]) {
    const x0 = L.W * 0.18, y0 = L.H * 0.7, a = (ang * Math.PI) / 180;
    const antes = await p.evaluate(async () => { const Z = await import('/src/mundo/zona.ts'); const j = window.__juego(), h = j.heroe;
      // el punto más despejado del mapa: 7 casillas libres a la redonda
      if (!window.__claro) { let best = null; for (let y = 8; y < j.zona.H - 8 && !best; y += 2) for (let x = 8; x < j.zona.W - 8 && !best; x += 2) { let ok = true; for (let dy = -7; dy <= 7 && ok; dy++) for (let dx = -7; dx <= 7 && ok; dx++) if (!Z.pasable(j.zona, x + dx, y + dy)) ok = false; if (ok) best = [x + 0.5, y + 0.5]; } window.__claro = best ?? [h.x, h.y]; }
      h.x = window.__claro[0]; h.y = window.__claro[1]; h.camino = null; return [h.x, h.y]; });
    await p.waitForTimeout(700);
    await toque('touchStart', x0, y0); await p.waitForTimeout(60);
    for (let k = 1; k <= 5; k++) { await toque('touchMove', x0 + Math.cos(a) * 9 * k, y0 - Math.sin(a) * 9 * k); await p.waitForTimeout(30); }
    await p.waitForTimeout(900);
    const med = await p.evaluate(async () => { const E = await import('/src/render/escena.ts'); const h = window.__juego().heroe; return { x: h.x, y: h.y, dir: h.dir, acc: h.acc }; });
    await toque('touchEnd', 0, 0); 
    const tras = []; for (let i = 0; i < 6; i++) { await p.waitForTimeout(60); tras.push(await p.evaluate(() => window.__juego().heroe.acc)); }
    // rumbo en pantalla: sx = dx - dy, sy = (dx + dy) / 2
    const dx = med.x - antes[0], dy = med.y - antes[1], rumbo = Math.round((Math.atan2(-(dx + dy) / 2, dx - dy) * 180) / Math.PI);
    out.push({ pulgar: ang, rumboHeroe: rumbo, mira: med.dir, alSoltar: tras.join('>') });
    await p.waitForTimeout(500);
  }
  console.log(JSON.stringify(out)); console.log('errores', errs.slice(0, 3));
  await b.close();
})();
