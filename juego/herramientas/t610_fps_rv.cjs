const { entrar } = require('./comun');
(async () => {
  const r = {};
  for (const rv of [13, 38, 13, 38]) {
    const { b, p } = await entrar(process.argv[2] || 'pc', 'berserker', 8);
    await p.evaluate((rv) => { window.__rv = rv; }, rv);
    await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(7000);
    await p.evaluate(() => { const j = window.__juego(), z = j.zona; window.__mundo.caminarA(j, z.W / 2, z.H / 2); j.heroe.vida = j.heroe.vidaMax = 1e6; }); await p.waitForTimeout(2500);
    const f = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else res(Math.round(n / 5)); }; f(); }));
    (r[rv] ??= []).push(f); await b.close();
  }
  console.log(JSON.stringify(r));
})();
