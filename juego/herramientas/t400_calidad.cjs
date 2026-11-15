const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('ipad11', 'berserker', 8);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(5000);
  const fps = () => p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(Math.round(n / 3)); }; f(); }));
  const r = {};
  for (const q of [2, 1, 0]) { await p.evaluate((q) => { window.__calidad = q; }, q); await p.waitForTimeout(500); r['nivel' + q] = await fps(); }
  console.log(JSON.stringify(r), 'errs', errs.slice(0, 3));
  await b.close();
})();
