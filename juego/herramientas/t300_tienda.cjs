// Vender en la tienda por el camino táctil real: toques de verdad sobre el comerciante y la bolsa.
const { entrar } = require('./comun');
(async () => {
  const vista = process.argv[2] || 'ipad11', cual = +(process.argv[3] || 0);
  const { b, p, errs } = await entrar(vista, 'berserker', 8);
  await p.waitForTimeout(1500);
  const est = () => p.evaluate(() => { const j = window.__juego(), h = j.heroe, u = window.__U.ui; return { izq: u.izq, der: u.der, ficha: !!u.ficha, x: +h.x.toFixed(2), y: +h.y.toFixed(2), dest: h.destino ? 1 : 0, cam: h.camino ? h.camino.length : 0, acc: h.acc, bolsa: h.d.bolsa.length, oro: h.d.oro, hablar: !!h.hablar }; });
  const cv = await p.evaluate(() => { const c = document.querySelector('canvas'), r = c.getBoundingClientRect(); return { l: r.left, t: r.top, kx: r.width / window.__T.W, ky: r.height / window.__T.H, W: window.__T.W, H: window.__T.H }; }).catch(() => null);
  console.log('cv', JSON.stringify(cv));
  const np = await p.evaluate(() => window.__juego().npcs.map((q) => window.__aPant(q.x, q.y)));
  const tap = async (x, y) => { await p.touchscreen.tap(x, y); await p.waitForTimeout(350); };
  await tap(np[cual][0], np[cual][1] - 20); await p.waitForTimeout(2500);
  console.log('tras tocar npc', JSON.stringify(await est()));
  await tap(205, 495); await p.waitForTimeout(800); console.log(JSON.stringify(await est()));
  await p.evaluate(() => { const j = window.__juego(), h = j.heroe, O = window.__T.O ?? {}; });
  await p.evaluate(async () => { const O = await import('/src/juego/objetos.ts'); const I = await import('/src/juego/inventario.ts').catch(() => null); const j = window.__juego(), h = j.heroe; window.__k = [Object.keys(O).join(','), I ? Object.keys(I).join(',') : '']; });
  console.log(await p.evaluate(() => window.__k.join(' | ')));
  await tap(205, 495); await p.waitForTimeout(800); console.log(JSON.stringify(await est()));
  await p.evaluate(async () => { const O = await import('/src/juego/objetos.ts'); const Hh = await import('/src/juego/heroe.ts'); const j = window.__juego(), h = j.heroe; let n = 0; for (let i = 0; i < 40 && n < 14; i++) { const o = O.crearObjeto(8, 0); if (o && Hh.meterEnBolsa(h.d, o)) n++; } });
  await p.waitForTimeout(400);
  const celdas = await p.evaluate(() => window.__juego().heroe.d.bolsa.map((e) => [e.x, e.y, e.o.w, e.o.h]));
  console.log('celdas', JSON.stringify(celdas));
  console.log('antes', JSON.stringify(await est()));
  const pts = [[846, 410], [884, 400], [920, 400], [960, 410], [1010, 410], [1080, 410], [1140, 410], [810, 400], [812, 440], [820, 490], [850, 490], [882, 495], [810, 520], [845, 520]];
  for (const [x, y] of pts) { await tap(x, y); const a = await est(); if (a.ficha) { await tap(453, 541); } const d = await est(); console.log(x, y, a.ficha ? 'ficha' : 'nada', JSON.stringify(d)); }
  await p.waitForTimeout(1500); console.log('fin', JSON.stringify(await est()));
  await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/t300_${cual}.png` });
  await b.close();
})();
