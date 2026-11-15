// Guardar y seguir: en medio de un mundo, Pausa > Guardar partida, se recarga la página y Continuar vuelve al mismo lugar.
// Y el clic en un menú: apretar sobre un panel que se cierra bajo el cursor, con el botón todavía apretado, no hace caminar.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs, L } = await entrar('pc', 'berserker', 12);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4200);
  // camina a un punto libre lejos de la entrada
  const antes = await p.evaluate(() => { const j = window.__juego(), z = j.zona, h = j.heroe; let m = null; for (let y = 10; y < z.H - 10; y += 3) for (let x = 10; x < z.W - 10; x += 3) { if (z.bloq[y * z.W + x]) continue; const d = Math.hypot(x - h.x, y - h.y); if (d > 30 && d < 45 && (!m || d > m[2])) m = [x + 0.5, y + 0.5, d]; } h.x = m[0]; h.y = m[1]; h.camino = null; h.vida = h.vidaMax = 1e6; return { zona: z.id, x: h.x, y: h.y, oro: (h.d.oro += 1234) }; });
  await p.waitForTimeout(500);
  // Pausa (Escape) y el botón Guardar partida
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const pausa = await p.evaluate(() => { const j = window.__juego(); const t0 = j.t; return new Promise((r) => setTimeout(() => r({ panel: window.__U.ui.izq, mundoQuieto: Math.abs(j.t - t0) < 0.001 }), 600)); });
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/pausa.png' });
  await p.evaluate(() => { window.__U.ui.guardarAhora = true; }); await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/guardado.png', clip: { x: 340, y: 120, width: 600, height: 200 } });
  const guardado = await p.evaluate(() => { const hs = JSON.parse(localStorage.getItem('marca.heroes')); return { zona: hs[0].zona, pos: hs[0].pos, oro: hs[0].oro }; });
  // recarga y Continuar
  await p.reload(); for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
  await p.waitForTimeout(5500);
  const c = await p.evaluate(() => window.__menuFilas && window.__menuFilas.continuar); await p.mouse.click(L.l + c[0] * L.k, L.t + c[1] * L.k);
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado() === 'juego')) break; }
  await p.waitForTimeout(1500);
  const despues = await p.evaluate(() => { const j = window.__juego(), h = j.heroe; return { zona: j.zona.id, x: +h.x.toFixed(2), y: +h.y.toFixed(2), oro: h.d.oro, cerca: j.monstruos.filter((m) => !m.muerto && !m.dueno && Math.hypot(m.x - h.x, m.y - h.y) < 9).length, explorado: j.zona.explorado.reduce((s, v) => s + (v ? 1 : 0), 0) }; });
  console.log('antes', JSON.stringify(antes)); console.log('pausa', JSON.stringify(pausa)); console.log('guardado', JSON.stringify(guardado)); console.log('despues', JSON.stringify(despues));
  console.log('MISMO LUGAR', despues.zona === antes.zona && Math.hypot(despues.x - antes.x, despues.y - antes.y) < 2, 'ORO', despues.oro === antes.oro);
  // ---- el clic en un menú no hace caminar
  await p.evaluate(() => { const j = window.__juego(); j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } }); });
  const res = {};
  for (const modo of ['con el arreglo']) {
    await p.keyboard.press('i'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const c = document.getElementById('juego'); return { W: c.width, H: c.height, der: window.__U.ui.der }; });
    const x0 = await p.evaluate(() => { const h = window.__juego().heroe; h.camino = null; h.destino = null; return [h.x, h.y]; });
    await p.mouse.move(L.l + (r.W - 150) * L.k, L.t + 300 * L.k); await p.waitForTimeout(150);
    await p.mouse.down(); await p.waitForTimeout(120);
    await p.evaluate(() => { window.__U.ui.der = null; window.__U.ui.izq = null; }); // el panel se cierra bajo el cursor con el botón apretado
    await p.waitForTimeout(900);
    const x1 = await p.evaluate(() => { const h = window.__juego().heroe; return [h.x, h.y, h.camino ? h.camino.length : 0]; });
    await p.mouse.up(); await p.waitForTimeout(300);
    // y un clic normal en el mundo sí camina
    await p.mouse.click(L.l + (r.W / 2 + 140) * L.k, L.t + (r.H / 2 - 40) * L.k); await p.waitForTimeout(700);
    const x2 = await p.evaluate(() => { const h = window.__juego().heroe; return [h.x, h.y]; });
    res[modo] = { panel: r.der, seMovioApretado: +Math.hypot(x1[0] - x0[0], x1[1] - x0[1]).toFixed(2), camino: x1[2], clicNormalCamina: +Math.hypot(x2[0] - x1[0], x2[1] - x1[1]).toFixed(2) };
  }
  console.log(JSON.stringify(res), errs.slice(0, 3));
  await b.close();
})();
