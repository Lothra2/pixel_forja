// Arcanista de nivel bajo con los rayos: por el botón del arco (tactilHabId), enemigo a 3, 6 y 9 casillas, 6 intentos cada uno.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const { b, p, errs } = await entrar('ipad11', 'arcanista', +(process.argv[3] || 3));
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  const out = {};
  for (const hab of (process.argv[2] || 'chispa,latido_galvanico,arco_voltaico,rayo_cadena').split(',')) for (const dist of (process.env.DISTS || '3,6,9').split(',').map(Number)) {
    let pega = 0, sale = 0, msg = '';
    for (let i = 0; i < 6; i++) {
      await p.evaluate(async ([hab, dist, i]) => {
        const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
        h.d.habs[hab] = 1; h.vida = h.vidaMax; h.mana = h.manaMax; h.recargas = {}; h.acc = 'quieto'; h.objetivo = null; j.mensajes.length = 0; j.proyectiles.length = 0;
        j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
        const a = (i / 6) * Math.PI * 2 + 0.3, m = M.crearMonstruo(D.MONSTRUOS['zombi'], 3, h.x + Math.cos(a) * dist, h.y + Math.sin(a) * dist, 0, 0); m.vida = m.vidaMax = 5000; m.estado = 'quieto'; m.aturdido = 9; j.monstruos.push(m);
        window.__m = m; window.__mana = h.mana; window.__U.ui.tactilHabId = hab;
      }, [hab, dist, i]);
      await p.waitForTimeout(2300);
      const r = await p.evaluate(() => { const j = window.__juego(), h = j.heroe, m = window.__m; return { d: m.vidaMax - m.vida, mana: window.__mana - h.mana, msg: j.mensajes.map((x) => x.txt[0]).join('|') }; });
      if (r.d > 0) pega++; if (r.mana > 0.5) sale++; if (r.msg) msg = r.msg;
    }
    out[`${hab}@${dist}`] = `sale ${sale}/6 pega ${pega}/6${msg ? ' · ' + msg : ''}`;
  }
  console.log(JSON.stringify(out, null, 1)); console.log(JSON.stringify(errs.slice(0, 2)));
  await b.close();
})();
