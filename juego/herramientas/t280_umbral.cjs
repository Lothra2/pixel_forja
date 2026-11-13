const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const { b, p, errs } = await entrar('ipad11', 'templario', 5);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(6000);
  const [x, y] = await p.evaluate(() => { const h = window.__juego().heroe; return window.__aPant(h.x, h.y); });
  for (let i = 0; i < 2; i++) { await p.screenshot({ path: `/tmp/claude-0/sp/pw/umbral_${i}.png`, clip: { x: Math.max(0, x - 260), y: Math.max(0, y - 300), width: 520, height: 420 } }); await p.waitForTimeout(700); }
  const sal = await p.evaluate(() => { const j = window.__juego(); return j.zona.salidas.map((s) => ({ d: s.destino, cx: s.cx, cy: s.cy, obj: !!s.obj })); });
  console.log(JSON.stringify(sal), JSON.stringify(errs.slice(0, 2)));
  // ir junto a otra salida (la primera que no sea el pueblo)
  const o = sal.find((s) => s.d !== 'a1_refugio');
  if (o) { await p.evaluate((o) => { const h = window.__juego().heroe; h.x = o.cx + 2.5; h.y = o.cy + 2.5; h.camino = null; }, o); await p.waitForTimeout(2500); const [x2, y2] = await p.evaluate(() => { const h = window.__juego().heroe; return window.__aPant(h.x, h.y); }); await p.screenshot({ path: '/tmp/claude-0/sp/pw/umbral_2.png', clip: { x: Math.max(0, x2 - 300), y: Math.max(0, y2 - 330), width: 520, height: 420 } }); }
  await b.close();
})();
