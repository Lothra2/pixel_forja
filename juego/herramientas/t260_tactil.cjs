// Cada habilidad activa por el camino REAL del táctil: se asigna al botón Poder (h.d.der) y se pulsa (ui.tactilHab),
// con un héroe del nivel que pide la habilidad, 1 punto en ella y su maná natural. Con enemigos a 5 casillas y sin enemigos.
// node t260_tactil.js <clase>
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const clase = process.argv[2] || 'arcanista';
  const { b, p, errs } = await entrar('ipad11', clase, 30);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  const habs = await p.evaluate(async () => { const C = await import('/src/datos/clases.ts'); const h = window.__juego().heroe; return C.HABILIDADES.filter((x) => x.clase === h.d.clase && x.tipo !== 'pasiva').map((x) => ({ id: x.id, tipo: x.tipo, req: x.nivelReq, forma: x.forma })); });
  const res = [];
  for (const hb of habs) for (const con of [true, false]) {
    await p.evaluate(async ([hb, con]) => {
      const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
      h.d.habs[hb.id] = 1; h.vida = h.vidaMax; h.mana = h.manaMax; h.recargas = {}; h.acc = 'quieto'; h.objetivo = null; h.furia = 100; h.frascos = 9; j.mensajes.length = 0; j.proyectiles.length = 0;
      delete h.buffs.forma_lobo; delete h.buffs.forma_oso; if (hb.forma) h.buffs[hb.forma === 'oso' ? 'forma_oso' : 'forma_lobo'] = { t: 30, bonos: {}, hab: 'x' };
      j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
      window.__ms = con ? [0, 1].map((i) => { const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 10, h.x + 3.6 + i * 0.7, h.y - 3.4 - i * 0.4, 0, 0); m.vida = m.vidaMax = 5000; m.estado = 'quieto'; m.aturdido = 9; j.monstruos.push(m); return m; }) : [];
      window.__a = { mana: h.mana, ef: j.efectos.length, mios: j.monstruos.filter((m) => m.dueno && !m.muerto).length, aura: h.d.aura, areas: j.areas.length, x: h.x, y: h.y };
      window.__vio = { acc: false, proy: 0, ef: 0, areas: 0 }; const t0 = performance.now();
      const tic = () => { const v = window.__vio; if (h.acc === 'atacar' || h.acc === 'lanzar' || h.salto) v.acc = true; v.proy = Math.max(v.proy, j.proyectiles.length); v.ef = Math.max(v.ef, j.efectos.length); v.areas = Math.max(v.areas, j.areas.length); if (performance.now() - t0 < 2300) requestAnimationFrame(tic); }; requestAnimationFrame(tic);
      h.d.der = hb.id; window.__U.ui.tactilHab = 'der';
    }, [hb, con]);
    await p.waitForTimeout(2400);
    const r = await p.evaluate((id) => { const j = window.__juego(), h = j.heroe, a = window.__a, v = window.__vio; return { mana: +(a.mana - h.mana).toFixed(1), manaMax: Math.round(h.manaMax), dano: Math.round(window.__ms.reduce((s, m) => s + (m.vidaMax - Math.max(0, m.vida)), 0)), acc: v.acc, proy: v.proy, ef: v.ef - a.ef, areas: v.areas - a.areas, mios: j.monstruos.filter((m) => m.dueno && !m.muerto).length - a.mios, buff: !!h.buffs[id], aura: h.d.aura === id, movio: Math.hypot(h.x - a.x, h.y - a.y) > 0.5, msg: j.mensajes.map((m) => m.txt[0]).join(' | ') }; }, hb.id);
    const hizo = r.acc || r.proy > 0 || r.ef > 0 || r.areas > 0 || r.mios > 0 || r.buff || r.aura || r.dano > 0 || r.movio;
    res.push({ id: hb.id, tipo: hb.tipo, con, hizo, ...r });
  }
  const malos = res.filter((r) => !r.hizo || (r.con && r.dano === 0 && !r.buff && !r.aura && r.mios <= 0 && !['buff', 'aura', 'invocar', 'grito', 'maldicion', 'teleporte', 'trampa'].includes(r.tipo)));
  console.log(JSON.stringify({ clase, total: res.length, malos: malos.map((r) => ({ id: r.id, tipo: r.tipo, con: r.con, hizo: r.hizo, mana: r.mana, de: r.manaMax, dano: r.dano, acc: r.acc, proy: r.proy, ef: r.ef, msg: r.msg })), errs: errs.slice(0, 3) }));
  await b.close();
})();
