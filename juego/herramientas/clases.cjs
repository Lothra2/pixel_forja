// Cada clase en una pelea real de 10 s: sin errores, y que sus dinámicas se disparen (pausa de impacto, empujón de cámara,
// cadáver despedido, sobresalto de los monstruos). Uso: node t193_clases.js <clase> [vista]
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const clase = process.argv[2] || 'berserker', vista = process.argv[3] || 'pc';
  const { b, p, errs } = await entrar(vista, clase, 12);
  await p.evaluate(() => window.__ir('a1_cripta')); await p.waitForTimeout(3500);
  const prep = await p.evaluate(async () => {
    const j = window.__juego(), h = j.heroe, M = window.__mundo, S = await import('/src/juego/sensacion.ts'), A = await import('/src/juego/anim.ts'); h.vida = h.vidaMax = 1e6; h.d.agresivo = true; h.mana = 1e5;
    j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    const D = await import('/src/datos/monstruos.ts');
    window.__ms = [0, 1, 2, 3, 4, 5].map((i) => { const m = M.crearMonstruo(D.MONSTRUOS[['zombi', 'esqueleto', 'necrofago'][i % 3]], 8, h.x + 2.5 + (i % 3), h.y - 2 + i * 0.8, 0, 0); m.vida = m.vidaMax = 30; j.monstruos.push(m); return m; });
    window.__st = { pausas: 0, pausaMax: 0, patadas: 0, lanzados: 0, alertas: 0, cuadros: new Set() }; let pt = null;
    const tic = () => { const st = window.__st; if ((j.congela ?? 0) > 0) { st.pausas++; st.pausaMax = Math.max(st.pausaMax, j.congela); } if (j.patada && j.patada !== pt) { pt = j.patada; st.patadas++; }
      st.lanzados = window.__ms.filter((m) => m.muerto && m.sacud?.lanz > 0).length; if (window.__ms.some((m) => m.alerta > 0)) st.alertas++;
      if ((h.acc === 'atacar' || h.acc === 'lanzar') && !h.combo3) { const an = A.animClase(h.d.clase, h.acc); if (an) st.cuadros.add(S.cuadroAtaque(Math.min(1, h.t / h.dur), Math.min(0.9, h.golpeEn / h.dur), an.cuadros, S.sensacionDe(h).curva, an.impacto).toString(16)); st.g = +(h.golpeEn / h.dur).toFixed(3); } else if (h.combo3 && h.acc === 'atacar') st.cuadros.add(Math.min(11, Math.floor((h.t / h.dur) * 12)).toString(16)); requestAnimationFrame(tic); };
    requestAnimationFrame(tic);
    const s = S.sensacionDe(h); return { curva: s.curva, peso: s.peso, distancia: !!h.c.distancia };
  });
  await p.waitForTimeout(5000); await p.screenshot({ path: `/tmp/claude-0/sp/pw/clase_${clase}_${vista}.png` });
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => { const st = window.__st; return { cuadrosPausa: st.pausas, pausaMaxMs: Math.round(st.pausaMax * 1000), patadas: st.patadas, lanzados: st.lanzados, cuadrosAlerta: st.alertas, cuadrosAtaqueVistos: [...st.cuadros].sort().join(''), muertos: window.__ms.filter((m) => m.muerto).length, golpeEn: st.g }; });
  console.log(JSON.stringify({ clase, vista, ...prep, ...r, errs: errs.slice(0, 2) }));
  await b.close();
})();
