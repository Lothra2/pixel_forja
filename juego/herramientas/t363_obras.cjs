const { entrar } = require('./comun');
(async () => {
  const { b, p } = await entrar('pc', 'berserker', 8);
  const r = await p.evaluate(async () => { const Z = await import('/src/mundo/zona.ts'), A = await import('/src/mundo/actos.ts'); const out = [];
    for (const id of ['a1_refugio', 'a1_paramo', 'a1_bosque']) for (let s = 1; s <= 4; s++) { const z = Z.generarZona(A.ZONAS[id], s * 991 + 5); const c = {}; for (const o of z.objetos) if (/^casa_|^camp_(carpa|pabellon)|^pue_(casa|ruina|puesto)/.test(o.id)) c[o.id] = (c[o.id] || 0) + 1; out.push(id + ' ' + s + ' ' + JSON.stringify(c)); } return out; });
  console.log(r.join('\n'));
  await b.close();
})();
