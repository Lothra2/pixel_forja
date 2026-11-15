// Los efectos que envuelven al héroe (gritos, auras): con y sin partir por la línea de los pies.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs, L } = await entrar('pc', process.argv[2] || 'berserker', 30);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; for (let y = 20; y < z.H - 20; y += 2) for (let x = 20; x < z.W - 20; x += 2) { let ok = true; for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3; dx++) if (z.bloq[(y + dy) * z.W + x + dx]) { ok = false; break; } if (ok && Math.hypot(x - h.x, y - h.y) > 12) { h.x = x + 0.5; h.y = y + 0.5; h.camino = null; return; } } }); await p.waitForTimeout(1500);
  const ids = (process.argv[3] || 'grito_guerra,rugido,alarido,piel_hierro').split(',');
  const M = 'window.__T.M';
  for (const sin of [true, false]) for (const id of ids) {
    await p.evaluate(([id, sin]) => { const j = window.__juego(), h = j.heroe, M = window.__mundo; window.__sinPartir = sin; window.__sinLluvia = true; j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } }); h.vida = h.vidaMax = 1e6; h.mana = h.c.manaMax = 1e5; h.furia = 100; h.d.habs[id] = 5; h.recargas = {}; h.acc = 'quieto'; h.camino = null; M.usarHabilidad(j, id, h.x, h.y, null, false); }, [id, sin]);
    for (const [i, ms] of [[0, 380], [1, 300]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/grito_${id}_${sin ? 'antes' : 'despues'}_${i}.png` }); }
    await p.waitForTimeout(2500);
  }
  console.log(await p.evaluate(() => window.__juego().efectos.length), errs.slice(0, 3));
  await b.close();
})();
