// Cada habilidad activa de una clase, usada en pelea real: devuelve si salió, maná gastado y daño hecho.
// Uso: node t223_poderes.js <clase> [vista]
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const clase = process.argv[2] || 'berserker', vista = process.argv[3] || 'pc';
  const { b, p, errs } = await entrar(vista, clase, 30);
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(3500);
  const ids = await p.evaluate(async () => { const C = await import('/src/datos/clases.ts'); const h = window.__juego().heroe; for (const x of C.HABILIDADES) if (x.clase === h.d.clase) h.d.habs[x.id] = 5; return C.HABILIDADES.filter((x) => x.clase === h.d.clase && x.tipo !== 'pasiva').map((x) => x.id); });
  const res = [];
  for (const id of ids) {
    const r = await p.evaluate(async (id) => {
      const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts'), C = await import('/src/datos/clases.ts');
      const hb = C.HABILIDADES.find((x) => x.id === id);
      h.vida = h.vidaMax = 1e6; h.mana = h.manaMax; h.recargas = {}; h.acc = 'quieto'; h.furia = 100; h.frascos = 9; h.salto = null;
      if (hb.forma) h.buffs[hb.forma === 'oso' ? 'forma_oso' : 'forma_lobo'] = { t: 30, bonos: {}, hab: 'x' };
      j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
      const ms = [0, 1, 2].map((i) => { const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 10, h.x + 1.3 + i * 0.7, h.y + 0.4 - i * 0.4, 0, 0); m.vida = m.vidaMax = 5000; j.monstruos.push(m); return m; });
      window.__ms = ms; window.__k0 = ms.map((m) => Object.keys(m).filter((k) => m[k] && typeof m[k] !== 'function').join(',')); window.__antes = { mana: h.mana, mios: j.monstruos.filter((m) => m.dueno).length, buffs: Object.keys(h.buffs).length, aura: h.d.aura };
      window.__id = id; const ok = M.usarHabilidad(j, id, ms[0].x, ms[0].y, ms[0], false);
      return { ok, tipo: hb.tipo };
    }, id);
    await p.waitForTimeout(1600);
    const d = await p.evaluate(() => { const j = window.__juego(), h = j.heroe, a = window.__antes; return { mana: Math.round(a.mana - h.mana), dano: Math.round(window.__ms.reduce((s, m) => s + (m.vidaMax - Math.max(0, m.vida)), 0)), mios: j.monstruos.filter((m) => m.dueno && !m.muerto).length - a.mios, buffs: Object.keys(h.buffs).length - a.buffs, aura: h.d.aura !== a.aura ? h.d.aura : '', buff: !!h.buffs[window.__id], estado: [...new Set(window.__ms.flatMap((m, i) => Object.keys(m).filter((k) => m[k] && typeof m[k] !== 'function' && !window.__k0[i].split(',').includes(k))))].join(' ') }; });
    res.push({ id, ...r, ...d });
  }
  const malos = res.filter((r) => !r.ok && r.tipo !== 'aura' || (r.ok && r.dano === 0 && r.mios <= 0 && !r.buff && !r.aura && !r.estado));
  console.log(JSON.stringify({ clase, total: res.length, malos, errs: errs.slice(0, 3) }));
  if (process.env.TODO) console.log(JSON.stringify(res));
  await b.close();
})();
