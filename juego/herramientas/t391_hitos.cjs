const { entrar } = require('./comun');
(async () => {
  const zonas = process.argv[2].split(','), id = process.argv[3] || 'acto_hito';
  const { b, p, errs } = await entrar('pc', 'berserker', 30);
  for (const zona of zonas) {
    await p.evaluate((z) => window.__ir(z), zona); await p.waitForTimeout(4200);
    const hay = await p.evaluate((id) => { window.__sinLluvia = true; const j = window.__juego(), z = j.zona, h = j.heroe; z.oscuridad = Math.min(z.oscuridad, 0.2); z.explorado.fill(1); j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } });
      const o = z.objetos.find((q) => q.id === id); if (!o) return 0; const x = o.cx + 4, y = o.cy + 7; let bx = h.x, by = h.y, bd = 1e9; for (let yy = 0; yy < z.H; yy++) for (let xx = 0; xx < z.W; xx++) if (!z.bloq[yy * z.W + xx]) { const d = Math.hypot(xx - x, yy - y); if (d < bd) { bd = d; bx = xx + 0.5; by = yy + 0.5; } } h.x = bx; h.y = by; h.camino = null; return z.objetos.filter((q) => q.id === id).length; }, id);
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/rec_${zona}.png`, clip: { x: 160, y: 20, width: 960, height: 620 } });
    console.log(zona, hay);
  }
  console.log('errs', errs.slice(0, 3));
  await b.close();
})();
