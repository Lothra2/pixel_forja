// El HUD con poderes puestos: iPad (botones redondos) y PC (barra), ampliados.
const { entrar } = require('./comun');
(async () => {
  for (const [vista, clase] of [['ipad11', 'berserker'], ['ipad11', 'arcanista'], ['pc', 'berserker'], ['movil', 'nigromante']]) {
    const { b, p, errs } = await entrar(vista, clase, 30);
    await p.evaluate(async () => { const C = await import('/src/datos/clases.ts'); const j = window.__juego(), h = j.heroe; const act = C.HABILIDADES.filter((x) => x.clase === h.d.clase && x.tipo !== 'pasiva' && x.tipo !== 'aura'); for (const x of act) h.d.habs[x.id] = 3; h.d.der = act[3].id; h.d.izq = 'ataque'; h.d.atajos = [act[0].id, act[5].id, act[9].id, act[12].id, act[15].id, act[2].id, act[7].id, act[20] ? act[20].id : act[1].id, null, null]; window.__mundo.recalc && window.__mundo.recalc(j); });
    await p.waitForTimeout(1500); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/hud_${vista}_${clase}.png` }); console.log(vista, clase, errs.slice(0, 2)); await b.close();
  }
})();
