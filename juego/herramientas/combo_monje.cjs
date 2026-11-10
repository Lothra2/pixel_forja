// El combo del monje: 3 golpes en los cuadros 2, 5 y 8 de 12, con el daño repartido exacto (30/30/40 por resto mayor),
// nunca un "0" flotante, y si el primero mata, el combo termina y la animación sigue. Sin Thor ni remate en la medición.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const { b, p, errs } = await entrar(process.argv[2] || 'pc', 'monje', 12);
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(3500);
  const r = await p.evaluate(async () => {
    const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
    h.vida = h.vidaMax = 1e6; h.d.thor = { descanso: 9999 };
    j.monstruos.forEach((o) => { o.vida = 0; o.muerto = true; o.tMuerto = 999; });
    const cuadro = () => new Promise((res) => requestAnimationFrame(res));
    for (let k = 0; k < 5; k++) await cuadro();
    // el reparto, del 1 al 60: suma exacta, y con 3 o más ninguno en 0
    const reparto = []; for (let T = 1; T <= 60; T++) { const s = M.repartirCombo(T); if (s.reduce((a, c) => a + c, 0) !== T || (T >= 3 && s.some((v) => v < 1)) || (T < 3 && (s[0] || s[1]))) reparto.push([T, s]); }
    const prueba = async (vida, dano) => {
      h.c.dano = [dano, dano]; h.c.critico = 0; h.c.precision = 1e6; h.combo.paso = 0; h.combo.t = -99;
      const m = M.crearMonstruo(D.MONSTRUOS.zombi, 1, h.x + 1.1, h.y, 0, 0); m.vida = m.vidaMax = vida; m.vel = 0; m.cd = 99; m.defensa = 0; m.res = {}; j.monstruos.push(m);
      for (let k = 0; k < 30 && h.acc !== 'quieto'; k++) await cuadro();
      const vistos = new Set(j.numeros), nums = [], golpes = []; let antes = m.vida, cuadrosTrasMuerte = 0;
      M.usarHabilidad(j, 'ataque', m.x, m.y, m);
      for (let k = 0; k < 300 && h.acc === 'atacar'; k++) { await cuadro(); if (m.vida < antes - 1e-6) { golpes.push({ cuadro: +((h.t / h.dur) * 12).toFixed(1), dano: +(antes - m.vida).toFixed(2) }); antes = m.vida; } if (m.muerto) cuadrosTrasMuerte++; for (const q of j.numeros) if (!vistos.has(q)) { vistos.add(q); nums.push((q.menor ? 'chico:' : q.chico ? 'falla:' : 'normal:') + q.txt); } }
      const res = { golpes: golpes.map((g) => g.cuadro + '→' + g.dano).join('  '), suma: +golpes.reduce((a, g) => a + g.dano, 0).toFixed(2), numeros: nums.join(' '), muerto: m.muerto, animSiguio: cuadrosTrasMuerte };
      m.vida = 0; m.muerto = true; m.tMuerto = 999; return res;
    };
    return { repartoMalo: reparto, dano10: await prueba(1e5, 10), dano7: await prueba(1e5, 7), dano2: await prueba(1e5, 2), dano1: await prueba(1e5, 1), dano1b: await prueba(1e5, 1), dano1c: await prueba(1e5, 1), mataAlPrimero: await prueba(1, 10), mataAlSegundo: await prueba(5, 10) };
  });
  console.log(JSON.stringify(r, null, 1)); console.log('errores', errs.slice(0, 3));
  await b.close();
})();
