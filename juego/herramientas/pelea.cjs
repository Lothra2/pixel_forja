// Pelea real 12 s con el modo agresivo: sin errores, el héroe pega y recibe, y captura a mitad de un golpe.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const vista = process.argv[2] || 'ipad';
  const { b, p, errs } = await entrar(vista, 'berserker', 10);
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(3500);
  await p.evaluate(async () => {
    const j = window.__juego(), h = j.heroe, M = window.__mundo; h.vida = h.vidaMax = 1e6; h.d.agresivo = true;
    j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    const D = await import('/src/datos/monstruos.ts');
    window.__ms = [0, 1, 2, 3].map((i) => { const m = M.crearMonstruo(D.MONSTRUOS[i % 2 ? 'zombi' : 'esqueleto'], 10, h.x + 3 + i, h.y - 2 + i, 0, 0); m.vida = m.vidaMax = 4000; m.estado = 'perseguir'; m.objetivo = h; j.monstruos.push(m); return m; });
  });
  let lunge = 0, sacud = 0, dirs = new Set();
  for (let i = 0; i < 60; i++) {
    await p.waitForTimeout(200);
    const s = await p.evaluate(() => { const j = window.__juego(), h = j.heroe; return { atk: window.__ms.filter((m) => m.acc === 'atacar').length + (h.acc === 'atacar' ? 1 : 0), sac: window.__ms.filter((m) => m.sacud && j.t - m.sacud.t < 0.2).length + (h.sacud && j.t - h.sacud.t < 0.2 ? 1 : 0), d: window.__ms.map((m) => m.dir).join(), v: window.__ms.map((m) => m.vel.toFixed(2)).join() }; });
    lunge += s.atk; sacud += s.sac; dirs.add(s.d); if (i === 30) { await p.screenshot({ path: `/tmp/claude-0/sp/pw/pelea_${vista}.png` }); console.log('velocidades', s.v); }
  }
  const fin = await p.evaluate(() => ({ danoHecho: window.__ms.map((m) => Math.round(m.vidaMax - m.vida)), danoRecibido: Math.round(1e6 - window.__juego().heroe.vida) }));
  console.log(JSON.stringify({ vista, muestrasAtacando: lunge, muestrasConRetroceso: sacud, ...fin, errs: errs.slice(0, 3) }));
  await b.close();
})();
