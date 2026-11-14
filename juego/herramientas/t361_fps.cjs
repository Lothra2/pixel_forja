const { entrar } = require('./comun');
(async () => {
  const { b, p } = await entrar(process.argv[2] || 'pc', 'berserker', 8);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(6000);
  const fps = () => p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round(n / 4)); }; f(); }));
  const r = {};
  r.todo = await fps();
  await p.evaluate(() => { window.__sinMatiz = true; }); r.sinMatiz = await fps();
  await p.evaluate(() => { window.__sinLluvia = true; }); r.sinMatizNiLluvia = await fps();
  await p.evaluate(() => { window.__sinMatiz = false; }); r.sinLluvia = await fps();
  await p.evaluate(() => { window.__sinLluvia = false; }); r.todo2 = await fps();
  console.log(JSON.stringify(r));
  await b.close();
})();
