const { entrar } = require('./comun_pruebas.cjs');
(async () => {
  const { b, p } = await entrar('ipad11', 'arcanista', 5);
  await p.waitForTimeout(6000);
  const r = await p.evaluate(async () => {
    const U = await import('/src/juego/pfx_usos.ts'), C = await import('/src/datos/clases.ts');
    const hab = U.usosPfx.hab, act = C.HABILIDADES.filter((h) => h.tipo !== 'pasiva');
    const sin = act.filter((h) => !hab.get(h.id)).map((h) => `${h.clase}:${h.id}(${h.tipo}/${h.elem})`);
    const usados = new Set(); for (const v of hab.values()) { if (v.proy) usados.add(v.proy); if (v.area) usados.add(v.area); }
    const otros = Object.keys(U.usosPfx).filter((k) => k !== 'hab');
    return { activas: act.length, conPfx: act.length - sin.length, fxDistintos: usados.size, otros, sin };
  });
  console.log(JSON.stringify(r, null, 0));
  await b.close();
})();
