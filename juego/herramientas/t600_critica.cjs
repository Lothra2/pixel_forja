// Capturas para la crítica de arte: el héroe en combate en varias zonas, a pantalla completa.
const { entrar } = require('./comun');
(async () => {
  const clase = process.argv[2] || 'berserker';
  const { b, p, errs } = await entrar('pc', clase, 30);
  const zonas = (process.argv[3] || 'a1_refugio,a1_paramo,a1_guarida,a2_dunas,a3_selva,a5_infierno').split(',');
  const ids = await p.evaluate(async () => { const A = await import('/src/mundo/actos.ts'); return Object.keys(A.ZONAS); });
  let n = 0;
  for (const zq of zonas) { const z = ids.includes(zq) ? zq : ids.find((x) => x.startsWith(zq.slice(0, 3)) && !x.includes('~')); if (!z) continue;
    await p.evaluate((z) => window.__ir(z), z); await p.waitForTimeout(6000);
    await p.evaluate(() => { const j = window.__juego(), h = j.heroe; h.vida = h.vidaMax = 1e6; window.__sinLluvia = false; });
    // caminar un trecho hacia el centro para ver mundo y monstruos
    await p.evaluate(() => { const j = window.__juego(), z = j.zona, M = window.__mundo; M.caminarA(j, z.W / 2, z.H / 2); }); await p.waitForTimeout(3500);
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/cr_${n}.png` }); console.log(n, z); n++; }
  console.log(errs.slice(0, 3)); await b.close();
})();
