// Las muertes por elemento: un zombi muerto por cada uno, capturado a los 0.25, 0.7 y 1.8 s.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'arcanista', 30);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; window.__sinLluvia = true; j.zona.oscuridad = 0; for (let y = 20; y < z.H - 20; y += 2) for (let x = 20; x < z.W - 20; x += 2) { let ok = true; for (let dy = -4; dy <= 4 && ok; dy++) for (let dx = -4; dx <= 4; dx++) if (z.bloq[(y + dy) * z.W + x + dx]) { ok = false; break; } if (ok && Math.hypot(x - h.x, y - h.y) > 12) { h.x = x + 0.5; h.y = y + 0.5; h.camino = null; return; } } }); await p.waitForTimeout(1200);
  const elems = ['fuego', 'frio', 'rayo', 'veneno', 'sombra', 'luz'];
  for (const el of elems) {
    await p.evaluate(async (el) => { const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
      h.vida = h.vidaMax = 1e6; j.monstruos = j.monstruos.filter((o) => o.dueno); j.particulas.length = 0; if (j.gibs) j.gibs.length = 0; if (j.chorros) j.chorros.length = 0; j.efectos.length = 0; j.manchas.length = 0;
      const m = M.crearMonstruo(D.MONSTRUOS['esqueleto'] || D.MONSTRUOS['zombi'], 10, h.x + 3.4, h.y - 0.6, 0, 0); m.estado = 'dormido'; m.vida = m.vidaMax = 400; m.def = { ...m.def, res: {} }; m.res = {}; j.monstruos.push(m);
      M.danar(j, m, { min: m.vida * 1.3, max: m.vida * 1.3, elem: el, sinFallo: true, deHeroe: true, fuente: h }); j.suelo.length = 0; j.numeros.length = 0; window.__m = m; }, el);
    for (const [i, ms] of [[0, 250], [1, 450], [2, 1100]]) { await p.waitForTimeout(ms); const c = await p.evaluate(() => { const j = window.__juego(); j.suelo.length = 0; return window.__aPant(window.__m.x, window.__m.y); }); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/mu_${el}_${i}.png`, clip: { x: Math.max(0, c[0] - 110), y: Math.max(0, c[1] - 130), width: 220, height: 180 } }); }
    await p.waitForTimeout(600);
  }
  console.log(await p.evaluate(() => JSON.stringify(window.__energia)), errs.slice(0, 3));
  await b.close();
})();
