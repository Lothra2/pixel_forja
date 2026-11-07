// Berserker: probabilidad de acertar contra los monstruos reales de su zona (la tirada de danar) y prueba en vivo.
const { entrar } = require('./comun_pruebas.cjs');
const CASOS = [[1, ['a1_paramo', 'a1_guarida']], [10, ['a1_abadia2', 'a1_cata1']], [30, ['a3_templo2', 'a4_picos']]];
(async () => {
  const filas = [];
  for (const [nivel, zonas] of CASOS) {
    const { b, p, errs } = await entrar('pc', 'berserker', nivel);
    for (const z of zonas) {
      await p.evaluate((z) => window.__ir(z), z); await p.waitForTimeout(2500);
      const r = await p.evaluate(() => {
        const j = window.__juego(), h = j.heroe, ps = [];
        for (const m of j.monstruos) {
          if (m.muerto || m.dueno) continue;
          const pr = h.c.precision, def = m.defensa;
          ps.push({ p: Math.max(5, Math.min(95, (pr / (pr + def)) * 2 * h.d.nivel / (h.d.nivel + m.nivel) * 100)), q: window.__mundo.aciertoHeroe(pr, def, h.d.nivel, m.nivel), nivel: m.nivel, def, cal: m.calidad });
        }
        const prom = ps.reduce((a, q) => a + q.p, 0) / ps.length, peor = Math.min(...ps.map((q) => q.p));
        const prom2 = ps.reduce((a, q) => a + q.q, 0) / ps.length, peor2 = Math.min(...ps.map((q) => q.q));
        const niveles = [...new Set(ps.map((q) => q.nivel))].sort((a, b) => a - b);
        return { precision: h.c.precision, des: h.c.des, n: ps.length, antes: +prom.toFixed(1), antesPeor: +peor.toFixed(1), despues: +prom2.toFixed(1), despuesPeor: +peor2.toFixed(1), defMedia: Math.round(ps.reduce((a, q) => a + q.def, 0) / ps.length), niveles: niveles.join(',') };
      });
      filas.push({ nivel, zona: z, ...r });
    }
    await b.close();
  }
  console.table(filas);
})();
