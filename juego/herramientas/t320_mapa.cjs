const { entrar } = require('./comun');
(async () => {
  const { b, p, L, tap } = await entrar('ipad11', 'berserker', 8);
  const foto = () => p.evaluate(() => { const z = window.__juego().zona; let n = 0, h = 0; for (const v of z.explorado) n += v; for (let i = 0; i < z.bloq.length; i += 7) h = (h * 31 + z.bloq[i]) >>> 0; return { id: z.id, vistos: n, de: z.explorado.length, forma: h }; });
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  for (const [x, y] of [[20, 20], [40, 40], [60, 30]]) { await p.evaluate(([x, y]) => { const h = window.__juego().heroe; h.x = x; h.y = y; h.camino = null; }, [x, y]); await p.waitForTimeout(700); }
  console.log('antes', JSON.stringify(await foto()));
  await p.evaluate(() => window.__ir('a1_refugio')); await p.waitForTimeout(4500);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  console.log('volver en la misma sesión', JSON.stringify(await foto()));
  await p.evaluate(() => window.__ir('a1_refugio')); await p.waitForTimeout(4500);
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')) || window.dispatchEvent(new Event('pagehide')));
  console.log('guardado', await p.evaluate(() => { const h = JSON.parse(localStorage.getItem('marca.heroes'))[0]; return Object.keys(h.mapas || {}).join(',') + ' ' + JSON.stringify(h.mapas || {}).length + ' bytes'; }));
  await p.reload(); for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } await p.waitForTimeout(4800);
  const bw = Math.min(210, (L.W - 120) / 4 - 12); await tap(L.W / 2 - (bw * 4 + 36) / 2 + bw / 2, L.H - 73);
  await p.waitForTimeout(800); await tap(L.W / 2 + 240, L.H * 0.35 + 99);
  for (let i = 0; i < 80; i++) { await p.waitForTimeout(400); const e = await p.evaluate(() => window.__estado()); if (e === 'juego') break; if (e === 'entreacto') await tap(L.W / 2, L.H / 2); }
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  console.log('tras recargar', JSON.stringify(await foto()));
  await b.close();
})();
