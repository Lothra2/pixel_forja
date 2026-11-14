const { entrar } = require('./comun');
(async () => {
  const zona = process.argv[2] || 'a1_paramo';
  const { b, p } = await entrar('ipad11', 'berserker', 8);
  await p.evaluate((z) => window.__ir(z), zona); await p.waitForTimeout(4500);
  const info = await p.evaluate(() => { const j = window.__juego(), z = j.zona; return (z.puentes ?? []).map((q) => { const rows = []; for (let y = q.cy - 3.5; y <= q.cy + 3.5; y++) { let s = ''; for (let x = q.cx - 5.5; x <= q.cx + 5.5; x++) s += z.bloq[Math.floor(y) * z.W + Math.floor(x)]; rows.push(s); } return { q, rows }; }); });
  for (const i of info) { console.log(JSON.stringify(i.q)); console.log(i.rows.join('\n')); }
  if (info.length) {
    const q = info[0].q;
    for (const [dx, dy] of [[0, 0], [0, 1], [0, -1]]) {
      const r = await p.evaluate(async ([q, dy]) => { const j = window.__juego(), h = j.heroe; j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 99; } }); h.x = q.cx - 4.5; h.y = q.cy + dy; h.camino = null; h.destino = null; return [h.x, h.y]; }, [q, dy]);
      const s = await p.evaluate(([q, dy]) => window.__aPant(q.cx + 4.5, q.cy + dy), [q, dy]);
      await p.waitForTimeout(500);
      const s2 = await p.evaluate(([q, dy]) => window.__aPant(q.cx + 4.5, q.cy + dy), [q, dy]);
      await p.touchscreen.tap(s2[0], s2[1]); await p.waitForTimeout(700);
      await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/t310_${dy + 1}.png` });
      await p.waitForTimeout(3300);
      const f = await p.evaluate(() => { const h = window.__juego().heroe; return [+h.x.toFixed(2), +h.y.toFixed(2), h.acc]; });
      console.log('dy', dy, 'de', r, 'meta', [q.cx + 4.5, q.cy + dy], 'queda', f);
    }
  }
  await b.close();
})();
