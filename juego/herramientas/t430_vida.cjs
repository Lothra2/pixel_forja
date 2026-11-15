// Vida del mapa: comprueba con contadores y capturas lo que se mueve (cuervos, viento, pasto, reflejos, ratas, bruma, motas, escalones).
const { entrar } = require('./comun');
(async () => {
  const zonas = (process.argv[2] || 'a1_paramo').split(',');
  const { b, p, errs } = await entrar('pc', 'berserker', 30);
  for (const zona of zonas) {
    await p.evaluate((z) => window.__ir(z), zona); await p.waitForTimeout(4200);
    await p.evaluate(() => { window.__sinLluvia = true; const j = window.__juego(), z = j.zona; z.oscuridad = Math.min(z.oscuridad, 0.2); z.explorado.fill(1); j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } }); });
    await p.waitForTimeout(1500);
    const a = await p.evaluate(() => { const j = window.__juego(), z = j.zona; return { amb: window.__amb, viento: window.__viento, escalones: z.objetos.filter((o) => o.id === 'dec_escalon').length, alturas: !!z.alturas }; });
    console.log(zona, JSON.stringify(a));
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/vida_${zona}_0.png`, clip: { x: 160, y: 20, width: 960, height: 620 } });
    // la bandada más cercana: una captura posados (a 6 casillas) y otra espantándolos
    const cu = await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; const hc = (x, y) => { const q = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return q - Math.floor(q); };
      let m = null; for (let by = 1; by < z.th - 1; by++) for (let bx = 1; bx < z.tw - 1; bx++) { if (hc(bx * 1.7 + z.semilla % 97, by * 2.3) > 0.045) continue; const p = z.pisos[by * z.tw + bx]; if (!p || p.id === 'agua') continue; const cx = bx * 5 + 1 + hc(bx, by * 3) * 3, cy = by * 5 + 1 + hc(bx * 3, by) * 3; if (z.bloq[Math.floor(cy) * z.W + Math.floor(cx)]) continue; const d = Math.hypot(cx - h.x, cy - h.y); if (d > 8 && (!m || d < m[2])) m = [cx, cy, d]; }
      if (!m) return null; const lib = (x, y) => !z.bloq[Math.floor(y) * z.W + Math.floor(x)]; for (let a = 0; a < 6.3; a += 0.4) { const x = m[0] + Math.cos(a) * 6, y = m[1] + Math.sin(a) * 6; if (lib(x, y)) { h.x = x; h.y = y; h.camino = null; return [m[0], m[1], a]; } } return null; });
    if (cu) {
      await p.waitForTimeout(700); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/vida_${zona}_cu0.png`, clip: { x: 320, y: 120, width: 640, height: 420 } });
      await p.evaluate(([x, y, a]) => { const h = window.__juego().heroe; h.x = x + Math.cos(a) * 3.6; h.y = y + Math.sin(a) * 3.6; }, cu);
      await p.waitForTimeout(650); console.log(' cuervos', JSON.stringify(await p.evaluate(() => window.__amb)));
      await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/vida_${zona}_cu1.png`, clip: { x: 320, y: 60, width: 640, height: 480 } });
    }
    // junto a un escalón
    const esc = await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; const o = z.objetos.filter((q) => q.id === 'dec_escalon').sort((a, b) => Math.hypot(a.cx - h.x, a.cy - h.y) - Math.hypot(b.cx - h.x, b.cy - h.y))[3]; if (!o) return false; for (let r = 1; r < 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.round(o.cx) + dx, y = Math.round(o.cy) + dy; if (!z.bloq[y * z.W + x]) { h.x = x + 0.5; h.y = y + 0.5; h.camino = null; return true; } } return false; });
    if (esc) { await p.waitForTimeout(900); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/vida_${zona}_esc.png`, clip: { x: 320, y: 120, width: 640, height: 420 } }); }
    // junto al agua
    const agua = await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; for (let by = 1; by < z.th - 1; by++) for (let bx = 1; bx < z.tw - 1; bx++) if (z.pisos[by * z.tw + bx]?.id === 'agua') for (const [dx, dy] of [[-1, 0], [0, -1]]) { const p = z.pisos[(by + dy) * z.tw + bx + dx]; if (p && p.id !== 'agua') { const x = (bx + dx) * 5 + (dx ? 4 : 2), y = (by + dy) * 5 + (dy ? 4 : 2); if (!z.bloq[y * z.W + x]) { h.x = x + 0.5; h.y = y + 0.5; h.camino = null; return true; } } } return false; });
    if (agua) { await p.waitForTimeout(900); console.log(' agua', JSON.stringify(await p.evaluate(() => window.__amb))); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/vida_${zona}_agua.png`, clip: { x: 320, y: 120, width: 640, height: 420 } }); }
  }
  console.log('errs', errs.slice(0, 3));
  await b.close();
})();
