// Campamento y pelea con escala entera. Uso: DPR=2 node t220_escala.js <clase> <vista>
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const clase = process.argv[2] || 'templario', vista = process.argv[3] || 'ipad11';
  const { b, p, errs } = await entrar(vista, clase, 12);
  await p.waitForTimeout(3000);
  const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { W: c.width, H: c.height, cssW: r.width, dpr: devicePixelRatio, k: r.width * devicePixelRatio / c.width }; });
  await p.screenshot({ path: `/tmp/claude-0/sp/pw/esc_campo_${vista}.png` });
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(3500);
  await p.evaluate(async () => { const j = window.__juego(), h = j.heroe, M = window.__mundo; h.vida = h.vidaMax = 1e6; h.d.agresivo = true;
    const D = await import('/src/datos/monstruos.ts'); [0,1,2].forEach((i) => { const m = M.crearMonstruo(D.MONSTRUOS['zombi'], 8, h.x + 2 + i, h.y - 1 + i, 0, 0); j.monstruos.push(m); }); });
  await p.waitForTimeout(2500); await p.screenshot({ path: `/tmp/claude-0/sp/pw/esc_pelea_${vista}.png` });
  await p.keyboard.press('i'); await p.waitForTimeout(800); await p.screenshot({ path: `/tmp/claude-0/sp/pw/esc_bolsa_${vista}.png` });
  console.log(JSON.stringify({ L, errs: errs.slice(0, 3) }));
  await b.close();
})();
