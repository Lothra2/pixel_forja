// Recorte del héroe en juego (iPad ×3) en el campamento y en la cripta. node t230_heroe.js <clase> <nivel> [ajustes]
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const clase = process.argv[2], nivel = +(process.argv[3] || 1);
  const { b, p, errs } = await entrar('ipad11', clase, nivel);
  await p.waitForTimeout(6000);
  const rec = async (n) => { const [x, y] = await p.evaluate(() => { const h = window.__juego().heroe; return window.__aPant(h.x, h.y); });
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/hj_${clase}_${n}.png`, clip: { x: Math.max(0, x - 110), y: Math.max(0, y - 190), width: 220, height: 240 } }); };
  await rec('campo');
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(5000); await rec('paramo');
  console.log(clase, JSON.stringify(errs.slice(0, 2)));
  await b.close();
})();
