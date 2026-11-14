// Maniobras de los monstruos: cada tipo, cerca del héroe quieto. Cuenta qué maniobras hace, cuánto daño mete y saca una foto del aviso.
const { entrar } = require('./comun');
(async () => {
  const ids = (process.argv[2] || 'ogro,lobo_sombrio,zombi').split(','), cal = +(process.argv[3] || 0), seg = +(process.argv[4] || 14);
  const { b, p } = await entrar('ipad11', 'berserker', 8);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  for (const id of ids) {
    await p.evaluate(async ([id, cal]) => {
      const j = window.__juego(), h = j.heroe, M = window.__mundo, D = await import('/src/datos/monstruos.ts');
      j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } else { o.x = h.x - 30; } });
      if (!window.__claro) { const z = j.zona; busca: for (let y = 12; y < z.H - 12; y++) for (let x = 12; x < z.W - 12; x++) { let ok = true; for (let dy = -8; dy <= 8 && ok; dy++) for (let dx = -8; dx <= 8; dx++) if (z.bloq[(y + dy) * z.W + x + dx]) { ok = false; break; } if (ok) { window.__claro = [x + 0.5, y + 0.5]; break busca; } } } h.x = window.__claro[0]; h.y = window.__claro[1]; h.camino = null; h.objetivo = null;
      const m = M.crearMonstruo(D.MONSTRUOS[id], 4, h.x + 6.5, h.y - 1, cal, 0); m.estado = 'perseguir'; m.objetivo = h; m.manCd = 0.3; m.vida = m.vidaMax = 99999; if (cal >= 2) m.nombre = ['El Jefe de Prueba', 'Test Boss']; j.monstruos.push(m);
      window.__m = m; window.__st = { tipos: {}, dano: 0, foto: null, golpes: 0 };
      let ult = null, vida = h.vida;
      const tic = () => { const st = window.__st, mn = m.man; if (mn && mn !== ult) { ult = mn; st.tipos[mn.tipo] = (st.tipos[mn.tipo] || 0) + 1; }
        if (h.vida < vida) { st.dano += vida - h.vida; st.golpes++; } h.vida = h.vidaMax = 9999; vida = h.vida;
        if (window.__st === st) requestAnimationFrame(tic); }; tic();
    }, [id, cal]);
    let fotos = 0; const t0 = Date.now(), vistos = new Set();
    while (Date.now() - t0 < seg * 1000) {
      const mn = await p.evaluate(() => { const mn = window.__m.man; return mn ? { tipo: mn.tipo, fase: mn.fase, k: mn.t / mn.aviso } : null; });
      if (mn && ((mn.fase === 'aviso' && mn.k > 0.55) || (mn.fase === 'accion')) && !vistos.has(mn.tipo + mn.fase) && fotos < 6) { vistos.add(mn.tipo + mn.fase); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/t340_${id}_${mn.tipo}_${mn.fase}.png`, clip: { x: 290, y: 150, width: 640, height: 480 } }); fotos++; }
      await p.waitForTimeout(60);
    }
    console.log(id, 'cal', cal, JSON.stringify(await p.evaluate(() => ({ ...window.__st, fase: window.__m.fase }))));
  }
  await b.close();
})();
