// Todas las zonas del juego, varias semillas: desde la entrada se llega a cada salida, entrada, piedra de viaje y grupo.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'berserker', 8);
  const r = await p.evaluate(async (N) => {
    const Z = await import('/src/mundo/zona.ts'), A = await import('/src/mundo/actos.ts'); globalThis.__sinEscombro = !!globalThis.__SE; const out = []; let malas = 0, total = 0, riscos = 0; const t0 = performance.now();
    for (const id of Object.keys(A.ZONAS)) for (let s = 1; s <= N; s++) {
      total++; let z; try { z = Z.generarZona(A.ZONAS[id], s * 7919 + 13); } catch (e) { malas++; out.push(id + ' ' + s + ' ERROR ' + e.message); continue; }
      const W = z.W, H = z.H, vis = new Uint8Array(W * H); const e = z.entradas.arriba ?? Object.values(z.entradas)[0]; if (!e) { out.push(id + ' sin entradas'); continue; }
      let ini = -1; for (let rad = 0; rad < 6 && ini < 0; rad++) for (let dy = -rad; dy <= rad && ini < 0; dy++) for (let dx = -rad; dx <= rad; dx++) { const X = Math.floor(e[0]) + dx, Y = Math.floor(e[1]) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && !z.bloq[Y * W + X]) { ini = Y * W + X; break; } }
      if (ini < 0) { malas++; out.push(id + ' ' + s + ' ENTRADA BLOQUEADA'); continue; }
      const pila = [ini]; vis[ini] = 1;
      while (pila.length) { const i = pila.pop(), x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (vis[j] || z.bloq[j]) continue; vis[j] = 1; pila.push(j); } }
      const cerca = (x, y) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = Math.floor(x) + dx, Y = Math.floor(y) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && vis[Y * W + X]) return true; } return false; };
      const f = [];
      for (const sa of z.salidas) if (!cerca(sa.cx, sa.cy)) f.push('salida ' + sa.destino);
      for (const [k, q] of Object.entries(z.entradas)) if (!cerca(q[0], q[1])) f.push('entrada ' + k);
      for (const sp of z.spawns) if (!cerca(sp.cx, sp.cy)) f.push('spawn ' + sp.tipo);
      for (const m of z.marcas) if (m.tipo === 'viaje' && !cerca(m.cx, m.cy)) f.push('viaje');
      const nr = z.objetos.filter((o) => o.id === 'bor_risco' || o.id === 'cue_penasco').length; riscos += nr;
      if (f.length) { malas++; if (malas < 25) out.push(id + ' ' + s + ' ' + [...new Set(f)].join('; ')); }
      else if (s === 1 && nr) out.push(`${id} ok riscos ${nr} objetos ${z.objetos.length}`);
    }
    out.push(`TOTAL ${total} malas ${malas} riscos ${riscos} en ${Math.round(performance.now() - t0)} ms`); return out;
  }, +(process.argv[2] || 3));
  console.log(r.join('\n')); console.log(errs.slice(0, 3));
  await b.close();
})();
