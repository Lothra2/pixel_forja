// Thor no recibe golpes del héroe: clic encima, botón Golpe táctil con Thor más cerca que el monstruo, y un área.
const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const vista = process.argv[2] || 'pc';
  const { b, p, tap, errs } = await entrar(vista, 'berserker', 10);
  const est = await p.evaluate(() => window.__estado()); if (est !== 'juego') { console.log('no entró', est, errs); process.exit(1); }
  await p.evaluate(() => window.__ir('a1_cementerio')); await p.waitForTimeout(3500);
  const prep = await p.evaluate(async () => {
    const j = window.__juego(), h = j.heroe, M = window.__mundo; h.vidaMax = h.vida = 1e6;
    for (let k = 0; k < 40 && !M.thorDe(j); k++) await new Promise((r) => setTimeout(r, 100));
    const thor = M.thorDe(j); if (!thor) return 'sin thor';
    j.monstruos.forEach((o) => { if (!o.dueno) { o.vida = 0; o.muerto = true; o.tMuerto = 999; } });
    thor.x = h.x + 1; thor.y = h.y; thor.vel = 0; window.__thor = thor; window.__vt = thor.vida;
    const D = await import('/src/datos/monstruos.ts');
    const m = M.crearMonstruo(D.MONSTRUOS.zombi, 10, h.x - 2.2, h.y - 2.2, 0, 0); m.vel = 0; m.cd = 99; j.monstruos.push(m); window.__z = m;
    return 'ok';
  });
  if (prep !== 'ok') { console.log(prep); process.exit(1); }
  await p.waitForTimeout(300);
  const fijar = () => p.evaluate(() => { const j = window.__juego(), h = j.heroe, t = window.__thor; t.x = h.x + 1; t.y = h.y; t.vel = 0; });
  // 1) clic o toque encima de Thor
  await fijar(); const pos = await p.evaluate(async () => { const E = await import('/src/render/escena.ts'); const t = window.__thor; const [x, y] = E.aPant(t.x, t.y); return [x, y - 20]; });
  for (let i = 0; i < 4; i++) { await fijar(); await tap(pos[0], pos[1]); await p.waitForTimeout(500); }
  const r1 = await p.evaluate(() => ({ thorVida: Math.round(window.__thor.vida), antes: Math.round(window.__vt), objetivoEsThor: window.__juego().heroe.objetivo === window.__thor }));
  // 2) botón Golpe táctil: Thor a 1 casilla, el zombi a 3
  await fijar(); await p.evaluate(() => { window.__U.ui.tactilHab = 'izq'; }); await p.waitForTimeout(80);
  const r2 = await p.evaluate(() => { const o = window.__juego().heroe.objetivo; return o ? (o === window.__thor ? 'thor' : o.def.id) : 'nadie'; });
  // 3) agresivo y un golpe de área del héroe que alcanza a Thor
  const r3 = await p.evaluate(() => { const j = window.__juego(), M = window.__mundo, t = window.__thor; const v = t.vida; const n = M.danar(j, t, { min: 50, max: 50, elem: 'fisico', deHeroe: true, fuente: j.heroe, extra: {} }); return { dano: n, igual: t.vida === v }; });
  await p.waitForTimeout(1500);
  const r4 = await p.evaluate(() => ({ thorVida: Math.round(window.__thor.vida), zombi: Math.round(window.__z.vida) + '/' + window.__z.vidaMax }));
  console.log(JSON.stringify({ vista, clicSobreThor: r1, botonGolpe: r2, areaContraThor: r3, despues: r4, errs: errs.slice(0, 3) }));
  await p.screenshot({ path: `/tmp/claude-0/sp/pw/thor_${vista}.png` });
  await b.close();
})();
