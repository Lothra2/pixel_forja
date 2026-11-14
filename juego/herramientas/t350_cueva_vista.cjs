const { entrar } = require('./comun');
(async () => {
  const zona = process.argv[2] || 'a1_pastor', n = +(process.argv[3] || 3);
  const { b, p, errs } = await entrar('pc', 'berserker', 8);
  await p.evaluate((z) => window.__ir(z), zona); await p.waitForTimeout(5000);
  const pts = await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; z.oscuridad = 0.25; z.explorado.fill(1); j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } }); const jefe = z.spawns.find((s) => s.tipo === 'jefe'); return [[h.x, h.y], jefe ? [jefe.cx - 2, jefe.cy] : [h.x, h.y], [z.W / 2, z.H / 2]]; });
  for (let i = 0; i < Math.min(n, pts.length); i++) { await p.evaluate(([x, y]) => { const j = window.__juego(), z = j.zona, h = j.heroe; let bx = x, by = y, bd = 1e9; for (let yy = 0; yy < z.H; yy++) for (let xx = 0; xx < z.W; xx++) if (!z.bloq[yy * z.W + xx]) { const d = Math.hypot(xx - x, yy - y); if (d < bd) { bd = d; bx = xx + 0.5; by = yy + 0.5; } } h.x = bx; h.y = by; h.camino = null; }, pts[i]); await p.waitForTimeout(1200); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/t350_${zona}_${i}.png` }); }
  console.log('errs', errs.slice(0, 3));
  await b.close();
})();
