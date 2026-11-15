// El tema del juego suena en el campamento y el presagio no rompe nada al entrar a una mazmorra.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'arcanista', 12);
  await p.mouse.click(640, 300); await p.waitForTimeout(75000);
  const a = await p.evaluate(() => ({ temas: globalThis.__temas || 0, estado: window.__estado() }));
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(6000);
  const z = await p.evaluate(() => ({ zona: window.__juego().zona.id, tipo: window.__juego().zona.tipo }));
  console.log(JSON.stringify(a), JSON.stringify(z), errs.slice(0, 3));
  await b.close();
})();
