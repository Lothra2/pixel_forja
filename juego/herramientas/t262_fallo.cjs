// Por qué falla un tiro a 9 casillas: dónde muere el proyectil y qué había ahí.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const { b, p } = await entrar('ipad11', 'arcanista', 3);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  const out = [];
  for (let i = 0; i < 8; i++) {
    await p.evaluate(async (i) => {
      const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
      h.mana = h.manaMax; h.recargas = {}; h.acc = 'quieto'; h.objetivo = null; j.proyectiles.length = 0;
      j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
      const a = (i / 8) * Math.PI * 2 + 0.3, z = j.zona, mx = h.x + Math.cos(a) * 9, my = h.y + Math.sin(a) * 9;
      const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 3, mx, my, 0, 0); m.vida = m.vidaMax = 5000; m.estado = 'quieto'; m.aturdido = 9; j.monstruos.push(m);
      window.__m = m; window.__info = { celdaMon: z.bloq[Math.floor(my) * z.W + Math.floor(mx)], fin: null, obj: null };
      let ult = null; const tic = () => { const q = j.proyectiles[0]; if (q) ult = { x: q.x, y: q.y, d: Math.hypot(q.x - h.x, q.y - h.y) }; else if (ult && !window.__info.fin) { window.__info.fin = ult; const nx = ult.x + (mx - h.x) / 9 * 0.3, ny = ult.y + (my - h.y) / 9 * 0.3; window.__info.b = z.bloq[Math.floor(ny) * z.W + Math.floor(nx)]; const o = z.objetos.find((o) => o.bloquea && Math.abs(o.cx - nx) <= o.hw / 2 + 0.6 && Math.abs(o.cy - ny) <= o.hh / 2 + 0.6); window.__info.obj = o ? o.id + ':' + o.v : null; } if (!window.__info.fin) requestAnimationFrame(tic); }; requestAnimationFrame(tic);
      window.__U.ui.tactilHabId = 'saeta_ignea';
    }, i);
    await p.waitForTimeout(2200);
    out.push(await p.evaluate(() => ({ pego: window.__m.vida < window.__m.vidaMax, celdaMon: window.__info.celdaMon, murioA: window.__info.fin && +window.__info.fin.d.toFixed(1), b: window.__info.b, obj: window.__info.obj })));
  }
  console.log(JSON.stringify(out)); await b.close();
})();
