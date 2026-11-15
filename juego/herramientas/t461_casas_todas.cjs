// Todas las casas, varias semillas: cada una tiene su cofre de premio, su guardián y su libro, y el cofre se alcanza.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'berserker', 8);
  const r = await p.evaluate(async (N) => {
    const Z = await import('/src/mundo/zona.ts'), A = await import('/src/mundo/actos.ts'); let total = 0; const malas = [];
    for (const id of Object.keys(A.ZONAS)) { if (!id.includes('~c')) continue; for (let s = 1; s <= N; s++) {
      total++; const z = Z.generarZona(A.ZONAS[id], s * 7919 + 13); const c = z.objetos.find((o) => o.dato && o.dato.casa), g = z.spawns.some((q) => q.tipo === 'unico' || q.tipo === 'campeon'), l = z.objetos.some((o) => o.id === 'mis_libro_maldito');
      const f = []; if (!c) f.push('sin cofre'); if (!g) f.push('sin guardián'); if (!l) f.push('sin libro');
      if (c) { const W = z.W, e = z.entradas.arriba, vis = new Uint8Array(W * z.H), i0 = Math.floor(e[1]) * W + Math.floor(e[0]), pila = [i0]; vis[i0] = 1; while (pila.length) { const i = pila.pop(), x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= z.H) continue; const j = Y * W + X; if (!vis[j] && !z.bloq[j]) { vis[j] = 1; pila.push(j); } } }
        let ok = false; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (vis[(Math.round(c.cy) + dy) * W + Math.round(c.cx) + dx]) ok = true; if (!ok) f.push('cofre inalcanzable'); }
      if (f.length) malas.push(id + ' ' + s + ' ' + f.join(', ')); } }
    return { total, malas: malas.slice(0, 12), nMalas: malas.length };
  }, +(process.argv[2] || 6));
  console.log(JSON.stringify(r), errs.slice(0, 2)); await b.close();
})();
