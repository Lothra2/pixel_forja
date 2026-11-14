// Cada habilidad activa en condiciones REALES: nivel = el que pide la habilidad (mínimo 2), 1 punto, maná natural, furia 0, por el botón Poder del táctil.
const { entrar } = require('./comun');
(async () => {
  const clase = process.argv[2] || 'berserker';
  const { b, p } = await entrar('ipad11', clase, 30);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  const habs = await p.evaluate(async () => { const C = await import('/src/datos/clases.ts'); const h = window.__juego().heroe; return C.HABILIDADES.filter((x) => x.clase === h.d.clase && x.tipo !== 'pasiva').map((x) => ({ id: x.id, tipo: x.tipo, req: x.nivelReq })); });
  const out = [];
  for (const hb of habs) for (const con of [true, false]) {
    await p.evaluate(async ([hb, con]) => {
      const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
      h.d.nivel = Math.max(2, hb.req); h.d.habs = { [hb.id]: 1 }; h.d.equipo && 0; M.recalc(j);
      h.vida = h.vidaMax; h.mana = h.manaMax; h.recargas = {}; h.acc = 'quieto'; h.objetivo = null; h.furia = 0; h.buffs = {}; j.mensajes.length = 0; j.proyectiles.length = 0; j.areas.length = 0;
      j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
      window.__ms = con ? [0, 1].map((i) => { const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 10, h.x + 3.6 + i * 0.7, h.y - 3.4 - i * 0.4, 0, 0); m.vida = m.vidaMax = 5000; m.estado = 'quieto'; m.aturdido = 9; j.monstruos.push(m); return m; }) : [];
      window.__a = { mana: h.mana, x: h.x, y: h.y, ef: j.efectos.length };
      window.__vio = { acc: false, proy: 0, ef: 0, areas: 0, buff: false };
      const tic = () => { const v = window.__vio; if (h.acc === 'atacar' || h.acc === 'lanzar' || h.salto) v.acc = true; v.proy = Math.max(v.proy, j.proyectiles.length); v.ef = Math.max(v.ef, j.efectos.length - window.__a.ef); v.areas = Math.max(v.areas, j.areas.length); if (Object.keys(h.buffs).length) v.buff = true; if (window.__vio === v) requestAnimationFrame(tic); }; tic();
      h.d.der = hb.id; window.__U.ui.tactilHab = 'der';
    }, [hb, con]);
    await p.waitForTimeout(2600);
    const r = await p.evaluate(() => { const j = window.__juego(), h = j.heroe, a = window.__a, v = window.__vio; return { mana: Math.round(a.mana), gasto: +(a.mana - h.mana).toFixed(1), dano: Math.round(window.__ms.reduce((s, m) => s + (5000 - m.vida), 0)), ...v, movio: Math.hypot(h.x - a.x, h.y - a.y) > 0.5, msg: j.mensajes.map((m) => m.txt ?? m.t ?? '').join(' / ').slice(0, 90) }; });
    out.push({ id: hb.id, tipo: hb.tipo, niv: hb.req, con, ...r });
  }
  for (const r of out) { const hizo = r.acc || r.proy || r.ef || r.areas || r.buff || r.dano; console.log((hizo ? 'ok  ' : 'NADA') + ' ' + r.id.padEnd(18) + (r.con ? 'con' : 'sin') + ` niv${r.niv} mana ${r.mana} gasto ${r.gasto} daño ${r.dano} acc ${r.acc} ef ${r.ef} buff ${r.buff} ${r.msg}`); }
  await b.close();
})();
