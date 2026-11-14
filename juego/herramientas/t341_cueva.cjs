const { entrar } = require('./comun');
(async () => {
  const zona = process.argv[2] || 'a1_pastor';
  const { b, p, errs } = await entrar('ipad11', 'berserker', 8);
  await p.evaluate((z) => window.__ir(z), zona); await p.waitForTimeout(5000);
  const r0 = await p.evaluate(() => { const j = window.__juego(), h = j.heroe; const m = j.monstruos.find((q) => q.calidad >= 2 && q.misionUnico) ?? j.monstruos.find((q) => q.calidad >= 2); if (!m) return null; window.__m = m; h.x = m.x - 3; h.y = m.y; h.camino = null; window.__st = { tipos: {}, dano: 0 }; let ult = null, vida = h.vida;
    const tic = () => { const st = window.__st, mn = m.man; if (mn && mn !== ult) { ult = mn; st.tipos[mn.tipo] = (st.tipos[mn.tipo] || 0) + 1; } if (h.vida < vida) st.dano += vida - h.vida; h.vida = h.vidaMax = 9999; vida = h.vida; if (m.vida > m.vidaMax * 0.45 && j.t % 1 < 0.02) m.vida -= m.vidaMax * 0.04; requestAnimationFrame(tic); }; tic();
    return { nombre: m.nombre, vida: m.vidaMax, dano: m.dano, id: m.def.id }; });
  console.log(JSON.stringify(r0));
  for (let i = 0; i < 5; i++) { await p.waitForTimeout(4500); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/t341_${zona}_${i}.png` }); }
  console.log(JSON.stringify(await p.evaluate(() => ({ ...window.__st, fase: window.__m.fase, vida: Math.round(window.__m.vida), n: window.__juego().monstruos.filter((q) => !q.muerto && !q.dueno).length, msgs: window.__juego().mensajes.slice(-4).map((q) => q.txt?.[0] ?? q.txt) }))), 'errores', errs.slice(0, 3));
  await b.close();
})();
