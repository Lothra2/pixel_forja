const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const { b, p, errs } = await entrar('ipad11', 'arcanista', 20);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  await p.evaluate(async () => {
    const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
    h.d.habs.arco_voltaico = 5; h.mana = h.manaMax; h.recargas = {}; h.acc = 'quieto';
    j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    [0, 1, 2].forEach((i) => { const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 10, h.x + 4 + i * 0.6, h.y - 4 - i * 0.5, 0, 0); m.vida = m.vidaMax = 5000; m.estado = 'quieto'; m.aturdido = 9; j.monstruos.push(m); });
    window.__log = []; const t0 = performance.now();
    const tic = () => { const a = j.efectos.filter((e) => e.id === 'arco_cadena'); if (a.length) window.__log.push({ ms: Math.round(performance.now() - t0), n: a.length, t: +a[0].t.toFixed(2), dur: a[0].dur, x2: a[0].x2 !== undefined, dx: +(a[0].x2 - a[0].x).toFixed(1) }); if (performance.now() - t0 < 2500) requestAnimationFrame(tic); }; requestAnimationFrame(tic);
    window.__dbgR = true; window.__U.ui.tactilHabId = 'arco_voltaico';
  });
  for (let i = 0; i < 80; i++) { if (await p.evaluate(() => { const a = window.__juego().efectos.filter((e) => e.id === 'arco_cadena'); a.forEach((e) => { e.dur = 6; e.t = 0.05; }); return a.length > 0; })) break; await p.waitForTimeout(20); }
  const [x, y] = await p.evaluate(() => { const h = window.__juego().heroe; return window.__aPant(h.x, h.y); });
  await p.waitForTimeout(300); await p.screenshot({ path: '/tmp/claude-0/sp/pw/arco.png', clip: { x: Math.max(0, x - 200), y: Math.max(0, y - 300), width: 700, height: 420 } });
  await p.waitForTimeout(1500);
  console.log(JSON.stringify(await p.evaluate(() => 1)), JSON.stringify(errs.slice(0, 2)));
  await b.close();
})();
