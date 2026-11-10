// Movimiento natural: mide el arranque, el frenado, el giro de 180° y el retraso de la cámara, cuadro a cuadro.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const vista = process.argv[2] || 'pc';
  const { b, p, errs } = await entrar(vista, 'berserker', 10);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(3500);
  const r = await p.evaluate(async () => {
    const j = window.__juego(), h = j.heroe, M = window.__mundo, E = await import('/src/render/escena.ts'), Z = await import('/src/mundo/zona.ts');
    h.vida = h.vidaMax = 1e6; j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    // un tramo recto libre de 6 casillas
    let dirv = null; for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]]) { let ok = true; for (let k = 0.5; k <= 6; k += 0.5) if (!Z.pasable(j.zona, h.x + dx * k, h.y + dy * k)) ok = false; if (ok) { dirv = [dx, dy]; break; } }
    if (!dirv) return 'sin tramo libre';
    const x0 = h.x, y0 = h.y, muestras = [];
    const cuadro = () => new Promise((res) => requestAnimationFrame(res));
    const tomar = (fase) => { const [px, py] = E.aPant(h.x, h.y); muestras.push({ fase, t: performance.now(), x: h.x, y: h.y, dir: h.dir, acc: h.acc, px, py }); };
    M.caminarA(j, x0 + dirv[0] * 5, y0 + dirv[1] * 5);
    for (let i = 0; i < 45; i++) { await cuadro(); tomar('ida'); }
    M.caminarA(j, x0, y0);
    for (let i = 0; i < 30; i++) { await cuadro(); tomar('vuelta'); }
    for (let i = 0; i < 120 && (h.acc === 'caminar' || h.acc === 'correr'); i++) { await cuadro(); tomar('llegada'); }
    for (let i = 0; i < 40; i++) { await cuadro(); tomar('quieto'); }
    const vel = (a, b) => Math.hypot(b.x - a.x, b.y - a.y) / ((b.t - a.t) / 1000);
    const ida = muestras.filter((m) => m.fase === 'ida'), vu = muestras.filter((m) => m.fase === 'vuelta'), lle = muestras.filter((m) => m.fase === 'llegada'), qu = muestras.filter((m) => m.fase === 'quieto');
    const vs = (L) => L.slice(1).map((m, i) => +vel(L[i], m).toFixed(2));
    const dirs = (L) => L.map((m) => m.dir).filter((d, i, a) => i === 0 || d !== a[i - 1]);
    const centro = (L) => L.map((m) => Math.round(Math.hypot(m.px - muestras[0].px, m.py - muestras[0].py)));
    return { arranque: vs(ida).slice(0, 14), crucero: vs(ida).slice(30, 34), dirsVuelta: dirs([ida[ida.length - 1], ...vu]), velVuelta: vs(vu).slice(0, 12), frenado: vs(lle).slice(-10), desvioCamara: { andando: centro(ida).slice(30, 34), alParar: centro(qu).filter((_, i) => i % 6 === 0) } };
  });
  console.log(JSON.stringify(r)); console.log('errores', errs.slice(0, 3));
  await b.close();
})();
