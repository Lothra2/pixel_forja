// Poderes por toque de verdad: en teléfono o iPad, cada medallón del arco (Poder y atajos) se toca con el dedo y se
// comprueba qué habilidad salió, si gastó maná y si hizo daño o efecto. Uso: node t490_tactil_poderes.cjs <clase> <vista> <nivel>
const { entrar } = require('./comun');
(async () => {
  const clase = process.argv[2] || 'arcanista', vista = process.argv[3] || 'movil', nivel = +(process.argv[4] || 3);
  const { b, p, errs, L } = await entrar(vista, clase, nivel);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4000);
  // aprende hasta 6 activas de su clase que su nivel permite, como en el panel: van a Poder y a los atajos
  const ids = await p.evaluate(async () => { const C = await import('/src/datos/clases.ts'); const j = window.__juego(), h = j.heroe, d = h.d;
    const act = C.HABILIDADES.filter((x) => x.clase === d.clase && x.tipo !== 'pasiva' && x.tipo !== 'aura' && (x.nivelReq ?? 1) <= Math.max(6, d.nivel)).slice(0, 12);
    for (const x of act) { d.habs[x.id] = 1; if (!d.atajos.includes(x.id)) { const i = d.atajos.findIndex((a) => !a); if (i >= 0) d.atajos[i] = x.id; } }
    window.__mundo.recalc && window.__mundo.recalc(j); return { der: d.der, atajos: d.atajos.filter(Boolean), mana: Math.round(h.mana), manaMax: Math.round(h.c.manaMax) }; });
  console.log('estado', JSON.stringify(ids));
  const res = [];
  // se prueban todas: cada una pasa por el botón Poder y por el primer atajo
  for (const id of ids.atajos) for (const boton of ['poder', 'hab1']) {
    await p.evaluate(async ([id, boton]) => { const j = window.__juego(), h = j.heroe, d = h.d, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
      const otro = d.atajos.find((a) => a && a !== id) || 'ataque';
      if (boton === 'poder') { d.der = id; d.atajos = [otro, ...d.atajos.filter((a) => a && a !== id && a !== otro), id, ...Array(10).fill(null)].slice(0, 10); } else { d.der = otro; d.atajos = [id, ...d.atajos.filter((a) => a && a !== id && a !== otro), otro, ...Array(10).fill(null)].slice(0, 10); }
      h.vida = h.vidaMax = 1e6; h.mana = h.c.manaMax; h.recargas = {}; h.acc = 'quieto'; h.furia = 100; h.frascos = 9; h.salto = null; h.objetivo = null; h.camino = null;
      j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
      const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 3, h.x + 2.2, h.y + 0.6, 0, 0); m.vida = m.vidaMax = 9000; m.vel = 0.01; j.monstruos.push(m); window.__m = m; window.__usos = []; window.__mana0 = h.mana; }, [id, boton]);
    await p.waitForTimeout(350);
    const r = await p.evaluate((boton) => { const t = (window.__toques || []).find((q) => q.id === boton); return t ? t.r : null; }, boton);
    if (!r) { res.push({ id, boton, falla: 'sin medallón' }); continue; }
    await p.touchscreen.tap(L.l + (r[0] + r[2] / 2) * L.k, L.t + (r[1] + r[3] / 2) * L.k);
    await p.waitForTimeout(1700);
    const d = await p.evaluate(() => { const j = window.__juego(), h = j.heroe, m = window.__m; return { usos: window.__usos, mana: Math.round(window.__mana0 - h.mana), dano: Math.round(m.vidaMax - Math.max(0, m.vida)), estado: !!(m.frio || m.veneno || m.aturdido || m.congelado || m.maldicion || m.miedo || m.sangrado || m.marca), mios: j.monstruos.filter((q) => q.dueno && !q.muerto).length, buffs: Object.keys(h.buffs).length }; });
    const ok = d.usos[0] === id && (d.dano > 0 || d.estado || d.mios > 0 || d.buffs > 0 || d.mana > 0);
    res.push({ id, boton, ok, primero: d.usos[0], mana: d.mana, dano: d.dano });
  }
  const malos = res.filter((r) => !r.ok);
  console.log(JSON.stringify({ clase, vista, nivel, probadas: res.length, malos, errs: errs.slice(0, 3) }));
  if (process.env.TODO) console.log(JSON.stringify(res));
  await b.close();
})();
