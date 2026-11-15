// Matanza: 14 monstruos débiles alrededor del héroe en modo agresivo; captura a media pelea y al final. Cuenta chorros, pedazos, manchas y racha.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'berserker', 30);
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(4000);
  await p.evaluate(async () => {
    window.__sinLluvia = true; const j = window.__juego(), h = j.heroe, M = window.__mundo; j.zona.oscuridad = 0.2; h.vida = h.vidaMax = 1e6; h.d.agresivo = true;
    j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    const D = await import('/src/datos/monstruos.ts');
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28, m = M.crearMonstruo(D.MONSTRUOS[i % 3 === 0 ? 'esqueleto' : 'zombi'], 10, h.x + Math.cos(a) * 2.6, h.y + Math.sin(a) * 2.6, 0, 0); m.vida = m.vidaMax = i % 4 === 1 ? 30 : 170; m.estado = 'perseguir'; m.objetivo = h; j.monstruos.push(m); }
  });
  let max = { chorros: 0, gibs: 0, racha: 0, lente: 0 };
  for (let i = 0; i < 100; i++) {
    await p.waitForTimeout(160);
    if (i % 2 === 0) await p.evaluate((i) => { const j = window.__juego(), h = j.heroe, M = window.__mundo; const m = j.monstruos.filter((q) => !q.muerto && !q.dueno).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0]; if (m && M.danar) { const g = { min: m.vida * 0.7, max: m.vida * 0.7, elem: 'fisico', deHeroe: true, fuente: h, sinFallo: true, arma: true }; M.danar(j, m, g); if (!m.muerto) M.danar(j, m, { ...g, min: m.vida * 0.45 + 1, max: m.vida * 0.45 + 1 }); } }, i);
    const s = await p.evaluate(() => { const j = window.__juego(); return { chorros: (j.chorros || []).length, gibs: (j.gibs || []).length, racha: j.racha || 0, lente: j.lente ? 1 : 0, vivos: j.monstruos.filter((m) => !m.muerto && !m.dueno).length }; });
    for (const k of Object.keys(max)) max[k] = Math.max(max[k], s[k]);
    if (i === 5 || i === 11 || i === 19) await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/mat_${i}.png`, clip: { x: 340, y: 110, width: 600, height: 420 } });
    if (!s.vivos && i > 34) break;
  }
  const fin = await p.evaluate(() => { const j = window.__juego(); return { manchas: j.manchas.length, vivos: j.monstruos.filter((m) => !m.muerto && !m.dueno).length }; });
  console.log(JSON.stringify({ max, ...fin, errs: errs.slice(0, 3) }));
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/mat_fin.png', clip: { x: 340, y: 110, width: 600, height: 420 } });
  await b.close();
})();
