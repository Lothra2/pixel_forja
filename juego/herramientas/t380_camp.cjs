const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'berserker', 8);
  await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__sinLluvia = true; const z = window.__juego().zona; z.oscuridad = 0.15; });
  await p.waitForTimeout(600);
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/t380_a.png' });
  const pts = await p.evaluate(() => { const j = window.__juego(), h = j.heroe; return [[h.x - 9, h.y - 9], [h.x + 9, h.y + 7], [h.x - 10, h.y + 8]]; });
  let i = 0; for (const [x, y] of pts) { await p.evaluate(([x, y]) => { const j = window.__juego(), z = j.zona, h = j.heroe; let bx = x, by = y, bd = 1e9; for (let yy = 0; yy < z.H; yy++) for (let xx = 0; xx < z.W; xx++) if (!z.bloq[yy * z.W + xx]) { const d = Math.hypot(xx - x, yy - y); if (d < bd) { bd = d; bx = xx + 0.5; by = yy + 0.5; } } h.x = bx; h.y = by; h.camino = null; }, [x, y]); await p.waitForTimeout(1300); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/t380_${'bcd'[i++]}.png` }); }
  const c = await p.evaluate(() => { const c = {}; for (const o of window.__juego().zona.objetos) if (/^camp_|^dec_|^bor_/.test(o.id)) c[o.id] = (c[o.id] || 0) + 1; return JSON.stringify(c); });
  console.log(c, errs.slice(0, 2));
  await b.close();
})();
