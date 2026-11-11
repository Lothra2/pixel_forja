// El mismo héroe en la misma cripta: sin realce, 'lighter' 0,95 y 'screen'. node t204_tres.js <clase> <nivel>
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const [clase = 'templario', nivel = '20'] = process.argv.slice(2);
  const { b, p, errs } = await entrar('ipad11', clase, +nivel);
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(4500);
  const pos = await p.evaluate(() => { const j = window.__juego(); j.heroe.vida = j.heroe.vidaMax = 1e6; j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } }); return 0; });
  const tam = p.viewportSize(), clip = { x: tam.width / 2 - 110, y: tam.height / 2 - 190, width: 220, height: 220 };
  const v = [['sin', { __sinRealce: true }], ['lighter', { __sinRealce: false, __realceModo: 'lighter', __realce: 0.95 }], ['screen', { __sinRealce: false, __realceModo: 'screen', __realce: 1 }]];
  for (const [n, o] of v) { await p.evaluate((o) => Object.assign(window, o), o); await p.waitForTimeout(500); await p.screenshot({ path: `/tmp/claude-0/sp/pw/tres_${clase}_${n}.png`, clip }); }
  console.log(JSON.stringify({ clase, errs: errs.slice(0, 2) }));
  await b.close();
})();
