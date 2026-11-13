// Héroe con equipo de nivel alto puesto: espera a que el pintor lo vista y recorta. node t250_equipo.js <clase> <nivel de objeto>
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const clase = process.argv[2] || 'templario', nv = +(process.argv[3] || 40);
  const aj = `const O = window.__T.O, D = window.__T.D; const bases = [...D.BASES, ...D.BASES_MITICAS, ...D.BASES_EPICAS, ...D.BASES_LINEA]; for (let i = 0; i < 400; i++) { const o = O.crearObjeto(${nv}, 'raro'); const b = bases.find((x) => x.id === o.base); const r = b && b.ranura; if (r && r !== 'anillo' && r !== 'amuleto' && r !== 'talisman' && !d.equipo[r] && !(r === 'izq' && d.equipo.arma && (bases.find((x) => x.id === d.equipo.arma.base) || {}).dosManos)) d.equipo[r] = o; }`;
  const { b, p, errs } = await entrar('ipad11', clase, 40, undefined, aj);
  const eq = await p.evaluate(() => Object.fromEntries(Object.entries(window.__juego().heroe.d.equipo).map(([k, o]) => [k, o.base])));
  for (let i = 0; i < 90; i++) { await p.waitForTimeout(1000); if (await p.evaluate(() => !document.title.includes('%') && !(window.__T.P.pintando && window.__T.P.pintando()))) { if (i > 25) break; } }
  const [x, y] = await p.evaluate(() => { const h = window.__juego().heroe; return window.__aPant(h.x, h.y); });
  await p.screenshot({ path: `/tmp/claude-0/sp/pw/eq_${clase}.png`, clip: { x: Math.max(0, x - 130), y: Math.max(0, y - 220), width: 260, height: 280 } });
  console.log(clase, JSON.stringify(eq), JSON.stringify(errs.slice(0, 2)));
  await b.close();
})();
