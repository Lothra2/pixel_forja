// Puntería táctil: un zombi a 6 casillas en 8 ángulos; se lanza el poder por el botón táctil y se mide hacia dónde
// sale el proyectil y si le pega. node t240_punteria.js <clase> <habilidad> [quieto|camina]
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const clase = process.argv[2] || 'arcanista', hab = process.argv[3] || 'bola_fuego', camina = process.argv[4] === 'camina';
  const { b, p, errs } = await entrar('ipad11', clase, 20);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4000);
  const res = [];
  for (let i = 0; i < 8; i++) {
    const r0 = await p.evaluate(async ([i, hab, camina]) => {
      const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
      h.d.habs[hab] = 5; h.vida = h.vidaMax = 1e6; h.mana = h.manaMax; h.recargas = {}; h.acc = 'quieto'; h.objetivo = null;
      j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } }); j.proyectiles.length = 0;
      const a = (i / 8) * Math.PI * 2, m = M.crearMonstruo(D.MONSTRUOS['zombi'], 10, h.x + Math.cos(a) * 6, h.y + Math.sin(a) * 6, 0, 0); m.vida = m.vidaMax = 5000; if (!camina) { m.vel = 0; m.velocidad = 0; }
      j.monstruos.push(m); window.__m = m; window.__pa = null; if (window.__lat) cancelAnimationFrame(window.__lat); if (camina) { let t0 = performance.now(); const mv = () => { const t = performance.now(), dt = (t - t0) / 1000; t0 = t; m.x += -Math.sin(a) * 2.5 * dt; m.y += Math.cos(a) * 2.5 * dt; window.__lat = requestAnimationFrame(mv); }; mv(); } m.vel = 0; m.velocidad = 0; m.estado = 'quieto'; m.aturdido = 9;
      const tic = () => { const q = j.proyectiles[0]; if (q && window.__pa === null) window.__pa = { keys: Object.keys(q).join(','), a: Math.atan2((q.vy ?? q.dy ?? 0), (q.vx ?? q.dx ?? 0)) }; if (window.__pa === null) requestAnimationFrame(tic); }; requestAnimationFrame(tic);
      window.__U.ui.tactilHabId = hab;
      return { ang: a, dir0: h.dir };
    }, [i, hab, camina]);
    await p.waitForTimeout(2600);
    const r1 = await p.evaluate(() => { const m = window.__m, h = window.__juego().heroe; return { pa: window.__pa, dano: Math.round(m.vidaMax - m.vida), real: Math.atan2(m.y - h.y, m.x - h.x), dir: h.dir, acc: h.acc }; });
    res.push({ i, obj: +(r0.ang * 57.3).toFixed(0), sale: r1.pa ? +(r1.pa.a * 57.3).toFixed(0) : null, dano: r1.dano, dir: r1.dir, keys: i === 0 && r1.pa ? r1.pa.keys : undefined });
  }
  console.log(JSON.stringify(res)); console.log(JSON.stringify(errs.slice(0, 2)));
  await b.close();
})();
