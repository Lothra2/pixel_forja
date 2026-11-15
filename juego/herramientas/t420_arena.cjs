// Arenas de jefe: una captura de la sala de cada jefe pedido (con luz, sin monstruos), parado en su centro.
const { entrar } = require('./comun');
(async () => {
  const zonas = process.argv[2].split(',');
  const { b, p, errs } = await entrar('pc', 'berserker', 30);
  for (const zona of zonas) {
    await p.evaluate((z) => window.__ir(z), zona); await p.waitForTimeout(4200);
    const info = await p.evaluate(() => { window.__sinLluvia = true; const j = window.__juego(), z = j.zona, h = j.heroe; z.oscuridad = Math.min(z.oscuridad, 0.15); z.explorado.fill(1);
      j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } });
      const s = z.spawns.find((q) => q.tipo === 'jefe'); if (!s) return 'sin jefe';
      h.x = s.cx + 0.5; h.y = s.cy + 0.5; h.camino = null;
      const cerca = z.objetos.filter((o) => Math.hypot(o.cx - s.cx, o.cy - s.cy) < 12 && o.bloquea && !/muro|penasco|risco/.test(o.id)).map((o) => o.id);
      const n = {}; cerca.forEach((id) => { n[id] = (n[id] || 0) + 1; }); return JSON.stringify(n); });
    console.log(zona, info);
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/rec_${zona}.png`, clip: { x: 160, y: 20, width: 960, height: 620 } });
  }
  console.log('errs', errs.slice(0, 3));
  await b.close();
})();
