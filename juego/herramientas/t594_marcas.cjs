// Las tres marcas del piso (escarcha, quemadura, veneno) en campo abierto, a 1 s y a 4 s.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'arcanista', 30);
  await p.evaluate(() => window.__ir(process?.x || 'a1_paramo')).catch(() => {}); await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; window.__sinLluvia = true; let mejor = null;
    for (let y = 12; y < z.H - 12; y += 2) for (let x = 12; x < z.W - 12; x += 2) { let ok = true; for (let dy = -7; dy <= 7 && ok; dy++) for (let dx = -7; dx <= 7; dx++) if (z.bloq[(y + dy) * z.W + x + dx]) { ok = false; break; } if (ok) { mejor = [x, y]; break; } }
    if (mejor) { h.x = mejor[0] + 0.5; h.y = mejor[1] + 0.5; h.camino = null; } j.monstruos = j.monstruos.filter((o) => o.dueno); j.manchas.length = 0; h.vida = h.vidaMax = 1e6;
    j.manchas.push({ x: h.x + 2.6, y: h.y - 2.6, r: 1.2, color: '#a8d8f0', t: 0, tipo: 'hielo' }, { x: h.x + 3.4, y: h.y + 0.2, r: 1.1, color: '#120c06', t: 0, tipo: 'quemado' }, { x: h.x + 0.4, y: h.y + 3.2, r: 0.4, rmax: 1.2, color: '#3a7a14', t: 0, tipo: 'veneno' }); });
  for (const [i, ms] of [[0, 1200], [1, 3000]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/marca_${i}.png`, clip: { x: 640 - 130, y: 310 - 120, width: 330, height: 220 } }); }
  console.log(errs.slice(0, 3)); await b.close();
})();
