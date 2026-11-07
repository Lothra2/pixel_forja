// Todas las salidas de todas las zonas: el umbral es pisable, se llega caminando desde la entrada, no hay dos pegadas,
// y el borde mismo (lo que dispara sin elegirla) queda a menos de una casilla de piso. Más 3 capturas en iPad.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const vista = process.argv[2] || 'ipad';
  const { b, p, errs } = await entrar(vista, 'templario', 20);
  const r = await p.evaluate(async () => {
    const A = await import('/src/mundo/actos.ts'), Z = await import('/src/mundo/zona.ts');
    const filas = [], malos = [];
    for (const [id, def] of Object.entries(A.ZONAS)) {
      const z = Z.generarZona(def, 12345);
      const ent = Object.entries(z.entradas).find(([k]) => !k.startsWith('salida_'))?.[1] ?? Object.values(z.entradas)[0];
      let obj = 0, borde = 0;
      for (const s of z.salidas) {
        s.obj ? obj++ : borde++;
        const [ux, uy] = Z.puntoSalida(z, s);
        const pisable = Z.pasable(z, ux, uy);
        const camino = ent ? !!Z.buscarCamino(z, ent[0] + 0.5, ent[1] + 0.5, ux, uy, 20000) : false;
        let bordeOk = true;
        if (!s.obj) { bordeOk = false; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (Math.hypot(dx, dy) < 0.85 + 0.71 && Z.pasable(z, s.cx + 0.5 + dx * 0.5, s.cy + 0.5 + dy * 0.5)) bordeOk = true; }
        const pegada = z.salidas.some((o) => o !== s && Math.hypot(o.cx - s.cx, o.cy - s.cy) < 3);
        if ((!pisable && !s.obj) || !camino || !bordeOk || pegada) malos.push({ zona: id, destino: s.destino, puerta: !!s.obj, pisable, camino, bordeOk, pegada });
      }
      filas.push([id, z.tipo, z.salidas.length, obj, borde]);
    }
    return { zonas: filas.length, salidas: filas.reduce((a, f) => a + f[2], 0), conPuerta: filas.reduce((a, f) => a + f[3], 0), deBorde: filas.reduce((a, f) => a + f[4], 0), malos };
  });
  console.log(JSON.stringify(r, null, 1));
  // tres ejemplos: borde de exterior, escalera de mazmorra, salida del pueblo
  const ej = [['a1_bosque', 'a1_cementerio', 'borde'], ['a1_paramo', 'a1_guarida', 'mazmorra'], ['a1_refugio', 'a1_paramo', 'pueblo']];
  for (const [zona, destino, nom] of ej) {
    await p.evaluate((z) => window.__ir(z), zona); await p.waitForTimeout(3500);
    const ok = await p.evaluate(async ([destino]) => {
      const Z = await import('/src/mundo/zona.ts'); const j = window.__juego(), h = j.heroe; h.vida = h.vidaMax = 1e6;
      const s = j.zona.salidas.find((q) => q.destino === destino) ?? j.zona.salidas[0]; if (!s) return 'sin salida';
      const [ux, uy] = Z.puntoSalida(j.zona, s);
      // el héroe a unas 5 casillas, hacia adentro
      const ent = j.zona.entradas['salida_' + s.destino] ?? [ux, uy];
      let best = null; for (let r = 4; r <= 6 && !best; r += 0.5) for (let a = 0; a < 6.28; a += 0.3) { const x = ux + Math.cos(a) * r, y = uy + Math.sin(a) * r; if (Z.pasable(j.zona, x, y) && Math.hypot(x - ent[0], y - ent[1]) < r) { best = [x, y]; break; } }
      if (!best) for (let a = 0; a < 6.28; a += 0.3) { const x = ux + Math.cos(a) * 5, y = uy + Math.sin(a) * 5; if (Z.pasable(j.zona, x, y)) { best = [x, y]; break; } }
      if (best) { h.x = best[0]; h.y = best[1]; } h.camino = null; h.destino = null;
      j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
      return s.nombre[0] + ' a ' + Math.hypot(h.x - ux, h.y - uy).toFixed(1);
    }, [destino]);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/salida_${nom}_${vista}.png` });
    console.log(nom, ok);
  }
  console.log('errores', errs.slice(0, 3));
  await b.close();
})();
