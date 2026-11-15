// Thor y su equipo: sin barda, con barda de cada tramo y con collar. Captura de cada uno y el sprite que lleva.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'berserker', 34);
  await p.evaluate(() => { window.__sinLluvia = true; const j = window.__juego(); j.zona.oscuridad = 0.15; });
  const casos = [['sin', null, null], ['barda1', 1, null], ['barda3', 3, null], ['barda5', 5, null], ['collar', 5, 'raro'], ['collar_leg', 0, 'legendario']];
  const out = [];
  for (const [nom, barda, collar] of casos) {
    await p.evaluate(async ([barda, collar]) => { const O = await import('/src/juego/objetos.ts'); const j = window.__juego(), d = j.heroe.d; d.thor = d.thor || {};
      if (barda) { const o = O.crearObjetoThor('barda', 80); o.tramo = barda; d.thor.bardaObj = o; d.thor.barda = barda; } else { d.thor.bardaObj = undefined; d.thor.barda = 0; }
      if (collar) { const o = O.crearObjetoThor('collar', 40); o.rareza = collar; d.thor.collar = o; } else d.thor.collar = undefined; }, [barda, collar]);
    await p.waitForTimeout(2600);
    const r = await p.evaluate(() => { const j = window.__juego(), h = j.heroe, t = j.monstruos.find((m) => m.dueno && m.invocaId === 'thor'); const s = window.__aPant(t.x, t.y); return { sprite: t.def.sprite, gema: t.gemaCollar || null, x: s[0], y: s[1], vidaMax: t.vidaMax }; });
    const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top }; });
    await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/thor_${nom}.png`, clip: { x: Math.max(0, L.l + r.x * L.k - 70), y: Math.max(0, L.t + r.y * L.k - 100), width: 140, height: 130 } });
    out.push({ nom, sprite: r.sprite, gema: r.gema, vida: r.vidaMax });
  }
  console.log(JSON.stringify(out), errs.slice(0, 3));
  await b.close();
})();
