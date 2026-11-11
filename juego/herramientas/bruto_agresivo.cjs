// El héroe en modo agresivo le responde a un bruto de golpe en área que le pega desde su alcance máximo
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const { b, p, errs } = await entrar('pc', process.argv[2] || 'berserker', 12);
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(3500);
  await p.evaluate(async () => {
    const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
    h.vida = h.vidaMax = 1e6; h.d.agresivo = true;
    j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    const m = M.crearMonstruo(D.MONSTRUOS['ogro'], 8, h.x + 3, h.y, 0, 0); m.vida = m.vidaMax = 1e6; j.monstruos.push(m); window.__m = m;
    window.__n = { h: 0, m: 0, dmin: 99, acc: {} }; let ah = false, am = false, tp = 0;
    const tic = () => { const n = window.__n; if (h.acc === 'atacar' && (!ah || h.t < tp)) n.h++; ah = h.acc === 'atacar'; tp = h.t; n.acc[h.acc] = (n.acc[h.acc] ?? 0) + 1; n.dano = 1e6 - m.vida; if (m.acc === 'atacar' && !am) n.m++; am = m.acc === 'atacar'; n.dmin = Math.min(n.dmin, Math.hypot(m.x - h.x, m.y - h.y)); n.d = Math.hypot(m.x - h.x, m.y - h.y); const al = j.monstruos.filter((o) => o.dueno && !o.muerto); n.aliados = al.map((o) => (o.def?.id ?? o.tipo) + ':' + Math.hypot(m.x - o.x, m.y - o.y).toFixed(1)).join(' '); requestAnimationFrame(tic); }; requestAnimationFrame(tic);
  });
  await p.waitForTimeout(9000);
  console.log(JSON.stringify({ ...(await p.evaluate(() => ({ ...window.__n, radio: window.__m.radio }))), errs: errs.slice(0, 2) }));
  await b.close();
})();
