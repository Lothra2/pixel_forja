// Ficha táctil: tocar un objeto de la tienda no lo compra; la ficha compara con lo equipado y Comprar va aparte. Igual en la bolsa.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const vista = process.argv[2] || 'ipad';
  const { b, p, tap, errs } = await entrar(vista, 'berserker', 12, undefined, 'd.oro = 50000;');
  await p.evaluate(() => window.__ir('a1_refugio')); await p.waitForTimeout(3000);
  await p.evaluate(() => { const U = window.__U, j = window.__juego(); U.abrirTienda(j, 'herrero'); U.ui.izq = 'tienda'; U.ui.der = 'inv'; });
  await p.waitForTimeout(600);
  const celda = async (lado, gx, gy, it) => p.evaluate(async ([lado, gx, gy, it]) => {
    const Hd = await import('/@fs/home/user/pixel_forja/src/engine/gotico/hud.ts'); const C = Hd.CELDA_INV;
    const [x0, y0, w] = window.__U.rectPanel(lado), k = w / 320;
    return [x0 + (gx + (it.x + it.o.w / 2) * C) * k, y0 + (gy + (it.y + it.o.h / 2) * C) * k];
  }, [lado, gx, gy, it]);
  // un arma de la tienda
  const it = await p.evaluate(() => { const t = window.__U.ui.tienda; const e = t.find((q) => q.o.tipo === 'equipo' && q.o.dano) ?? t[0]; window.__it = e; return { x: e.x, y: e.y, o: { w: e.o.w, h: e.o.h } }; });
  const oro0 = await p.evaluate(() => window.__juego().heroe.d.oro);
  const [sx, sy] = await celda('izq', 15, 44, it);
  await tap(sx, sy); await p.waitForTimeout(500);
  const r1 = await p.evaluate(() => ({ ficha: !!window.__U.ui.ficha, oro: window.__juego().heroe.d.oro, sigueEnTienda: window.__U.ui.tienda.includes(window.__it) }));
  await p.screenshot({ path: `/tmp/claude-0/sp/pw/ficha_tienda_${vista}.png` });
  // el botón Comprar: el primero de la fila de abajo de la ficha
  const btn = await p.evaluate(() => { const c = document.getElementById('juego'); return null; });
  // buscar el botón leyendo la ficha armada: se repite la cuenta del layout pidiendo un cuadro
  const comprado = await p.evaluate(async () => { return true; });
  // Comprar: el botón aparte compra de verdad
  const bt = await p.evaluate(() => window.__ficha());
  const L2 = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width }; });
  const cb = bt.find((q) => /Comprar|Buy/.test(q.txt));
  await tap(cb.r[0] + cb.r[2] / 2, cb.r[1] + cb.r[3] / 2); await p.waitForTimeout(500);
  const r2 = await p.evaluate(() => ({ oro: window.__juego().heroe.d.oro, ficha: !!window.__U.ui.ficha, sigueEnTienda: window.__U.ui.tienda.includes(window.__it), enBolsa: window.__juego().heroe.d.bolsa.some((q) => q.o === window.__it.o) }));
  console.log(JSON.stringify({ vista, tocarNoCompra: r1, oroAntes: oro0, botones: bt.map((q) => q.txt), trasComprar: r2 }));
  // la bolsa sola, con el arma recién comprada: Equipar y comparación
  await p.evaluate(() => { const U = window.__U; U.ui.izq = null; U.ui.der = 'inv'; U.ui.ficha = null; });
  await p.waitForTimeout(400);
  const nb = await p.evaluate(() => { const e = window.__juego().heroe.d.bolsa.find((q) => q.o === window.__it.o); return e ? { x: e.x, y: e.y, o: { w: e.o.w, h: e.o.h } } : null; });
  if (nb) { const Hd = await p.evaluate(async () => { const H = await import('/@fs/home/user/pixel_forja/src/engine/gotico/hud.ts'); return H.BOLSA; }); const [bx, by] = await celda('der', Hd.x, Hd.y, nb); await tap(bx, by); await p.waitForTimeout(500); await p.screenshot({ path: `/tmp/claude-0/sp/pw/ficha_arma_${vista}.png` }); console.log('ficha arma', JSON.stringify(await p.evaluate(() => window.__ficha()?.map((q) => q.txt)))); }
  await p.evaluate(() => { const U = window.__U; U.ui.ficha = null; U.ui.izq = 'tienda'; U.ui.der = 'inv'; }); await p.waitForTimeout(300);
  // reabrir otra ficha para la prueba de tocar fuera
  await tap(sx, sy); await p.waitForTimeout(300);
  // tocar fuera cierra; luego en la bolsa
  await tap(20, 20); await p.waitForTimeout(400);
  const cerrada = await p.evaluate(() => !window.__U.ui.ficha);
  const itb = await p.evaluate(() => { const d = window.__juego().heroe.d; const e = d.bolsa.find((q) => q.o.tipo === 'equipo') ?? d.bolsa[0]; window.__itb = e; return e ? { x: e.x, y: e.y, o: { w: e.o.w, h: e.o.h }, b: e.b ?? 0 } : null; });
  let rb = null;
  if (itb) {
    const Hd = await p.evaluate(async () => { const H = await import('/@fs/home/user/pixel_forja/src/engine/gotico/hud.ts'); return H.BOLSA; });
    const [bx, by] = await celda('der', Hd.x, Hd.y, itb);
    await tap(bx, by); await p.waitForTimeout(500);
    rb = await p.evaluate(() => ({ ficha: !!window.__U.ui.ficha, mano: !!window.__U.ui.mano }));
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/ficha_bolsa_${vista}.png` });
  }
  console.log(JSON.stringify({ cerradaAlTocarFuera: cerrada, bolsa: rb, errs: errs.slice(0, 3) }));
  await b.close();
})();
