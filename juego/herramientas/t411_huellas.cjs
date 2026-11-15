const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'berserker', 8);
  await p.evaluate(() => window.__ir('a2_dunas')); await p.waitForTimeout(5000);
  await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe, M = window.__mundo; z.oscuridad = 0.15; j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } });
    // un claro de arena
    busca: for (let y = 20; y < z.H - 20; y++) for (let x = 20; x < z.W - 20; x++) { let ok = z.pisos[Math.floor(y / 5) * z.tw + Math.floor(x / 5)]?.id === 'arena'; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 9; dx++) if (z.bloq[(y + dy) * z.W + x + dx] || z.pisos[Math.floor((y + dy) / 5) * z.tw + Math.floor((x + dx) / 5)]?.id !== 'arena') { ok = false; break; } if (ok) { h.x = x + 0.5; h.y = y + 0.5; h.camino = null; M.caminarA(j, x + 8.5, y + 0.5); break busca; } } });
  await p.waitForTimeout(2600);
  const [x, y] = await p.evaluate(() => { const h = window.__juego().heroe; return window.__aPant(h.x, h.y); });
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/t411.png', clip: { x: Math.max(0, x - 330), y: Math.max(0, y - 150), width: 420, height: 260 } });
  console.log('huellas', await p.evaluate(() => window.__huellas), 'errs', errs.slice(0, 3));
  await b.close();
})();
