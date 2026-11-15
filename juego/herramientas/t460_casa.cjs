// Casas abandonadas: la fachada en el mundo abierto, el interior (muebles, guardián, cofre) y el viaje de ida y vuelta.
const { entrar } = require('./comun');
(async () => {
  const zona = process.argv[2] || 'a1_paramo';
  const { b, p, errs } = await entrar('pc', 'berserker', 30);
  await p.evaluate((z) => window.__ir(z), zona); await p.waitForTimeout(4200);
  const fuera = await p.evaluate(() => { window.__sinLluvia = true; const j = window.__juego(), z = j.zona, h = j.heroe; z.oscuridad = Math.min(z.oscuridad, 0.2); z.explorado.fill(1); j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } });
    const cs = z.salidas.filter((s) => s.destino.includes('~c')); const s = cs[0]; if (!s) return null; const e = z.entradas['salida_' + s.destino]; h.x = e[0] + 0.5; h.y = e[1] + 0.5; h.camino = null;
    return { casas: cs.map((q) => [q.destino, q.cx, q.cy, q.obj && q.obj.id]), escondidos: z.objetos.filter((o) => o.dato && o.dato.escondido).length, libre: !z.bloq[Math.floor(h.y) * z.W + Math.floor(h.x)] }; });
  console.log('fuera', JSON.stringify(fuera));
  await p.waitForTimeout(1300); await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/casa_fuera.png', clip: { x: 160, y: 20, width: 960, height: 620 } });
  if (!fuera) { await b.close(); return; }
  for (const i of [0, 1]) {
    await p.evaluate((z) => window.__ir(z), zona + '~c' + i); await p.waitForTimeout(4200);
    const dentro = await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; z.oscuridad = Math.min(z.oscuridad, 0.25); z.explorado.fill(1);
      const c = z.objetos.find((o) => o.dato && o.dato.casa); const r = { id: z.id, tam: [z.tw, z.th], vivos: j.monstruos.filter((m) => !m.muerto && !m.dueno).length, calidades: j.monstruos.filter((m) => !m.dueno).map((m) => m.calidad).filter((q) => q > 0), cofre: !!c, salida: z.salidas.map((s) => s.destino), muebles: z.objetos.filter((o) => o.id.startsWith('mue_')).length };
      j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } }); return r; });
    console.log('dentro', JSON.stringify(dentro));
    await p.waitForTimeout(1200); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/casa_dentro${i}.png`, clip: { x: 160, y: 20, width: 960, height: 620 } });
    if (i === 0) { await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; const c = z.objetos.find((o) => o.dato && o.dato.casa); h.x = c.cx + 0.5; h.y = c.cy + 2.5; h.camino = null; }); await p.waitForTimeout(900); await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/casa_cofre.png', clip: { x: 160, y: 20, width: 960, height: 620 } }); }
  }
  console.log('errs', errs.slice(0, 3));
  await b.close();
})();
