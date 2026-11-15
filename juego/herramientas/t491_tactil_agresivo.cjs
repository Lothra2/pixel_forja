// En modo Agresivo el héroe pega solo sin parar: un toque en un poder a mitad de golpe tiene que salir igual.
// Toca Poder y el primer atajo 6 veces cada uno, justo cuando el héroe está atacando, y cuenta cuántas veces salió el poder pedido.
const { entrar } = require('./comun');
(async () => {
  const clase = process.argv[2] || 'arcanista', vista = process.argv[3] || 'movil';
  const { b, p, errs, L } = await entrar(vista, clase, 6);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4000);
  const ids = await p.evaluate(async () => { const C = await import('/src/datos/clases.ts'), D = await import('/src/datos/monstruos.ts'); const j = window.__juego(), h = j.heroe, d = h.d, M = window.__mundo;
    const act = C.HABILIDADES.filter((x) => x.clase === d.clase && x.tipo !== 'pasiva' && x.tipo !== 'aura' && (x.nivelReq ?? 1) <= 6).slice(0, 2);
    act.forEach((x) => { d.habs[x.id] = 1; }); d.der = act[0].id; d.atajos = [act[1].id, ...Array(9).fill(null)]; d.agresivo = true; h.vida = h.vidaMax = 1e6;
    j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 3, h.x + 1.1, h.y + 0.3, 0, 0); m.vida = m.vidaMax = 1e7; m.vel = 0.01; j.monstruos.push(m); return act.map((x) => x.id); });
  await p.waitForTimeout(1500);
  const out = {};
  for (const [boton, id] of [['poder', ids[0]], ['hab1', ids[1]]]) {
    let salio = 0, enGolpe = 0;
    for (let i = 0; i < 6; i++) {
      // espera a que esté a mitad de un golpe
      for (let k = 0; k < 40; k++) { if (await p.evaluate(() => window.__juego().heroe.acc === 'atacar')) { enGolpe++; break; } await p.waitForTimeout(50); }
      await p.evaluate(() => { const h = window.__juego().heroe; h.mana = h.c.manaMax; h.recargas = {}; h.c.regenMana = 0; window.__usos = []; });
      const r = await p.evaluate((boton) => window.__toques.find((q) => q.id === boton).r, boton);
      await p.touchscreen.tap(L.l + (r[0] + r[2] / 2) * L.k, L.t + (r[1] + r[3] / 2) * L.k);
      await p.waitForTimeout(900);
      if (await p.evaluate(() => { const h = window.__juego().heroe; return h.mana < h.c.manaMax - 0.5 || Object.keys(h.recargas).length > 0; })) salio++;
    }
    out[boton] = { id, salio, de: 6, tocadoEnGolpe: enGolpe };
  }
  console.log(JSON.stringify({ clase, vista, ...out, errs: errs.slice(0, 3) }));
  await b.close();
})();
