// El combo del monje: un ataque básico son 3 golpes (30/30/40) en los cuadros 2, 5 y 8 de 12, y si el blanco muere antes, termina.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const { b, p, errs } = await entrar(process.argv[2] || 'pc', 'monje', 12);
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(3500);
  const r = await p.evaluate(async () => {
    const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
    h.vida = h.vidaMax = 1e6; j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    const crear = (vida) => { const m = M.crearMonstruo(D.MONSTRUOS.zombi, 1, h.x + 1.1, h.y, 0, 0); m.vida = m.vidaMax = vida; m.vel = 0; m.cd = 99; m.defensa = 0; j.monstruos.push(m); return m; };
    const cuadro = () => new Promise((res) => requestAnimationFrame(res));
    const prueba = async (vida) => {
      const m = crear(vida); await cuadro(); const golpes = []; let antes = m.vida, n0 = j.numeros.length;
      for (let k = 0; k < 20 && h.acc !== 'quieto'; k++) await cuadro();
      M.usarHabilidad(j, 'ataque', m.x, m.y, m);
      const dur = h.dur, combo = !!h.combo3;
      for (let k = 0; k < 200 && h.acc === 'atacar'; k++) { await cuadro(); if (m.vida < antes - 0.001) { golpes.push({ cuadro: +((h.t / h.dur) * 12).toFixed(1), dano: Math.round(antes - m.vida) }); antes = m.vida; } }
      const nums = j.numeros.slice(-4).filter((q) => q.menor !== undefined).map((q) => (q.menor ? 'chico' : 'normal') + ':' + q.txt);
      const res = { combo, dur: +dur.toFixed(2), golpes, muerto: m.muerto, numeros: nums }; m.vida = 0; m.muerto = true; m.tMuerto = 999; return res;
    };
    const aguanta = [await prueba(1e5), await prueba(1e5), await prueba(1e5)], muere = await prueba(3);
    return { aguanta, muereAlPrimero: muere };
  });
  console.log(JSON.stringify(r, null, 1)); console.log('errores', errs.slice(0, 3));
  await b.close();
})();
