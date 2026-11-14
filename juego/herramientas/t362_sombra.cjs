const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'berserker', 8);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(6000);
  await p.evaluate(async () => { const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts'); h.x += 6; h.y += 9; h.camino = null; for (const [id, dx] of [['lobo_sombrio', 3], ['ogro', -3], ['esqueleto', 5]]) { const m = M.crearMonstruo(D.MONSTRUOS[id], 3, h.x + dx, h.y - 2, 0, 0); m.estado = 'dormido'; m.aturdido = 99; j.monstruos.push(m); } });
  await p.waitForTimeout(1500);
  const [x, y] = await p.evaluate(() => { const h = window.__juego().heroe; return window.__aPant(h.x, h.y); });
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/t362_sombra.png', clip: { x: x - 300, y: y - 220, width: 600, height: 380 } });
  console.log(errs.slice(0, 2));
  await b.close();
})();
