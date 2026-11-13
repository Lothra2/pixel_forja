// Captura un poder lanzado en vuelo y al pegar. node t241_bola.js <clase> <hab> [ángulo en grados]
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const clase = process.argv[2] || 'arcanista', hab = process.argv[3] || 'bola_fuego', ang = +(process.argv[4] || 20);
  const { b, p, errs } = await entrar('ipad11', clase, 20);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  await p.evaluate(async ([hab, ang]) => {
    const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
    h.d.habs[hab] = 5; h.vida = h.vidaMax = 1e6; h.mana = h.manaMax; h.recargas = {}; h.acc = 'quieto';
    j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    const a = ang / 57.3; [0, 1, 2].forEach((i) => { const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 10, h.x + Math.cos(a) * 6 + i * 0.6, h.y + Math.sin(a) * 6 - i * 0.5, 0, 0); m.vida = m.vidaMax = 5000; m.aturdido = 9; m.estado = 'quieto'; j.monstruos.push(m); });
    window.__U.ui.tactilHabId = hab;
  }, [hab, ang]);
  const [x, y] = await p.evaluate(() => { const h = window.__juego().heroe; return window.__aPant(h.x, h.y); });
  const clip = { x: Math.max(0, x - 330), y: Math.max(0, y - 250), width: 660, height: 420 };
  // espera a que salga el proyectil y saca 3 cuadros en vuelo y 2 del impacto
  for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window.__juego().proyectiles.length > 0)) break; await p.waitForTimeout(30); }
  console.log(JSON.stringify(await p.evaluate(() => { const j = window.__juego(), h = j.heroe, q = j.proyectiles[0]; return { dir: h.dir, pv: q && [q.vx.toFixed(1), q.vy.toFixed(1)], hab: h.habActual, blanco: h.blancoTactil ? [(h.blancoTactil.x - h.x).toFixed(1), (h.blancoTactil.y - h.y).toFixed(1), h.blancoTactil.def.id] : null, n: j.monstruos.filter((m) => !m.muerto && !m.dueno).map((m) => m.def.id + ':' + m.estado) }; })));
  for (let i = 0; i < 8; i++) { await p.screenshot({ path: `/tmp/claude-0/sp/pw/bola_${hab}_${i}.png`, clip }); await p.waitForTimeout(110); }
  console.log(hab, JSON.stringify(errs.slice(0, 2)));
  await b.close();
})();
