// Las cavernas: todo lo abierto se alcanza desde la entrada, y salidas, jefe y grupos caen en piso alcanzable. Muchas semillas.
const { entrar } = require('./comun');
(async () => {
  const { b, p } = await entrar('pc', 'berserker', 8);
  const r = await p.evaluate(async (N) => {
    const Z = await import('/src/mundo/zona.ts'), A = await import('/src/mundo/actos.ts'); const out = []; let malas = 0, total = 0;
    for (const id of ['a1_guarida', 'a1_pastor', 'a3_nido']) for (let s = 1; s <= N; s++) {
      total++; const z = Z.generarZona(A.ZONAS[id], s * 7919 + 13); const W = z.W, H = z.H, vis = new Uint8Array(W * H);
      const e = z.entradas.arriba ?? Object.values(z.entradas)[0]; const pila = [[Math.floor(e[0]), Math.floor(e[1])]]; let n = 0;
      if (z.bloq[pila[0][1] * W + pila[0][0]]) { out.push(id + ' ' + s + ' ENTRADA BLOQUEADA'); malas++; continue; }
      vis[pila[0][1] * W + pila[0][0]] = 1;
      while (pila.length) { const [x, y] = pila.pop(); n++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H || vis[Y * W + X] || z.bloq[Y * W + X]) continue; vis[Y * W + X] = 1; pila.push([X, Y]); } }
      let libres = 0; for (let i = 0; i < W * H; i++) if (!z.bloq[i]) libres++;
      const cerca = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (vis[(Math.floor(y) + dy) * W + Math.floor(x) + dx]) return true; return false; };
      const f = [];
      if (n < libres * 0.97) f.push(`aislado ${libres - n} de ${libres}`);
      for (const sa of z.salidas) if (!cerca(sa.cx, sa.cy)) f.push('salida ' + sa.destino);
      for (const [k, q] of Object.entries(z.entradas)) if (!cerca(q[0], q[1])) f.push('entrada ' + k);
      for (const sp of z.spawns) if (!cerca(sp.cx, sp.cy)) f.push('spawn ' + sp.tipo);
      if (!z.spawns.some((q) => q.tipo === 'jefe')) f.push('sin jefe');
      if (f.length) { malas++; if (malas < 12) out.push(id + ' ' + s + ' ' + f.join('; ') + ' abiertas ' + n); } else if (s <= 2) out.push(`${id} ${s} ok abiertas ${n} objetos ${z.objetos.length} grupos ${z.spawns.length}`);
    }
    out.push(`TOTAL ${total} malas ${malas}`); return out;
  }, +(process.argv[2] || 40));
  console.log(r.join('\n'));
  await b.close();
})();
