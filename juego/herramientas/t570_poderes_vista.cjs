// Lámina de los poderes de una clase: cada uno lanzado contra tres zombis, capturado a los 0.30 s y 0.65 s.
const { entrar } = require('./comun');
(async () => {
  const clase = process.argv[2] || 'arcanista';
  const { b, p, errs } = await entrar('pc', clase, 30);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; window.__sinLluvia = true; for (let y = 20; y < z.H - 20; y += 2) for (let x = 20; x < z.W - 20; x += 2) { let ok = true; for (let dy = -4; dy <= 4 && ok; dy++) for (let dx = -4; dx <= 4; dx++) if (z.bloq[(y + dy) * z.W + x + dx]) { ok = false; break; } if (ok && Math.hypot(x - h.x, y - h.y) > 12) { h.x = x + 0.5; h.y = y + 0.5; h.camino = null; return; } } }); await p.waitForTimeout(1200);
  const ids = await p.evaluate(async () => { const C = await import('/src/datos/clases.ts'); const h = window.__juego().heroe; for (const x of C.HABILIDADES) if (x.clase === h.d.clase) h.d.habs[x.id] = 5; return C.HABILIDADES.filter((x) => x.clase === h.d.clase && x.tipo !== 'pasiva').map((x) => x.id); });
  let n = 0;
  for (const id of ids) {
    await p.evaluate(async (id) => { const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
      h.vida = h.vidaMax = 1e6; h.mana = h.c.manaMax = 1e5; h.recargas = {}; h.acc = 'quieto'; h.furia = 100; h.frascos = 9; h.salto = null; h.dir = 'se';
      j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } }); j.efectos.length = 0; j.proyectiles.length = 0;
      const ms = [0, 1, 2].map((i) => { const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 10, h.x + 3 + i * 0.8, h.y + 0.5 - i * 0.6, 0, 0); m.vida = m.vidaMax = 5000; m.estado = 'dormido'; j.monstruos.push(m); return m; });
      M.usarHabilidad(j, id, ms[0].x, ms[0].y, ms[0], false); }, id);
    for (const [i, ms] of [[0, 330], [1, 350]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/pv_${n}_${i}.png`, clip: { x: 640 - 150, y: 310 - 150, width: 400, height: 280 } }); }
    await p.waitForTimeout(1400); n++;
  }
  console.log(JSON.stringify(ids), errs.slice(0, 2));
  await b.close();
})();
