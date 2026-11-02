// Prueba de conectividad: genera cada zona con N semillas (50 por defecto) y falla si una salida, el jefe o la piedra de
// viaje quedan aislados de la entrada, o si una piedra cae en el vacío. Necesita el servidor de desarrollo:
//   (cd juego && npx vite --port 5190) y luego: node juego/herramientas/conectividad.cjs [semillas]
// Si el Playwright del repo no encuentra su navegador, córrelo desde una carpeta fuera del repo (usa el Playwright del sistema).
// Reinicia el servidor después de muchos cambios en caliente: módulos viejos pueden esconder zonas.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:5190/', { waitUntil: 'load' });
  for (let i = 0; i < 60 && !(await p.evaluate(() => !!window.__T)); i++) await p.waitForTimeout(500);
  const SEM = +(process.argv[2] || 50);
  const r = await p.evaluate(async (SEM) => {
    const Z = await import('/src/mundo/zona.ts'); const A = await import('/src/mundo/actos.ts'); await import('/src/mundo/actos67.ts');
    const malos = {}; let total = 0, piedraVacio = 0;
    for (const [id, def] of Object.entries(A.ZONAS)) {
      for (let s = 1; s <= SEM; s++) {
        const z = Z.generarZona(def, s * 7919 + 13); total++;
        const W = z.W, H = z.H, al = new Uint8Array(W * H); const e = Object.values(z.entradas)[0];
        const pila = [e[1] * W + e[0]]; al[pila[0]] = 1;
        while (pila.length) { const i = pila.pop(), x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (al[j]) continue; const bq = z.bloq[j]; if (bq === 0 || bq === 3) { al[j] = 1; pila.push(j); } } }
        const ok = (mx, my) => { for (let r = 0; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = Math.round(mx) + dx, Y = Math.round(my) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && al[Y * W + X]) return true; } return false; };
        const fallas = [];
        z.salidas.forEach((sa) => { if (!ok(sa.cx, sa.cy)) fallas.push('salida:' + sa.destino); });
        z.spawns.filter((x) => x.tipo === 'jefe').forEach((x) => { if (!ok(x.cx, x.cy)) fallas.push('jefe'); });
        z.marcas.filter((m) => m.tipo === 'viaje').forEach((m) => { if (!ok(m.cx, m.cy)) fallas.push('piedra'); const t = z.pisos[Math.floor(m.cy / 5) * z.tw + Math.floor(m.cx / 5)]; if (!t) { piedraVacio++; fallas.push('piedra_en_vacio'); } });
        if (fallas.length) { malos[id] = malos[id] || {}; for (const f of fallas) malos[id][f] = (malos[id][f] || 0) + 1; }
      }
    }
    return { total, malos, piedraVacio };
  }, SEM);
  console.log(JSON.stringify(r, null, 1)); console.log(errs.slice(0, 3).join('\n')); await b.close();
  const malas = Object.keys(r.malos).length;
  console.log(malas || errs.length ? `FALLA: ${malas} zonas con algo aislado` : `OK: ${r.total} mapas conectados`);
  process.exit(malas || errs.length ? 1 : 0);
})();
