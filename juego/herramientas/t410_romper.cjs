const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'berserker', 8);
  await p.evaluate(() => window.__ir('a2_dunas')); await p.waitForTimeout(5000);
  const r = await p.evaluate(async () => {
    const j = window.__juego(), z = j.zona, h = j.heroe, M = window.__mundo; j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } });
    const RE = /barril|jarr|vasij|urna|anfora|caja|saco|canast|cantaro|tonel|heno|pertrech/;
    const cand = z.objetos.filter((o) => !o.tag && o.hw * o.hh <= 6 && RE.test(o.id));
    let o = null, pos = null;
    for (const c of cand) { for (const [dx, dy] of [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3], [1.6, 1.6]]) { const x = c.cx + dx, y = c.cy + dy; if (!z.bloq[Math.floor(y) * z.W + Math.floor(x)]) { o = c; pos = [x, y]; break; } } if (o) break; }
    if (!o) return { cand: cand.length, sin: true };
    h.x = pos[0]; h.y = pos[1]; h.camino = null; h.objetivo = null;
    const antes = z.objetos.length, oro = j.suelo.length;
    M.usarHabilidad(j, 'ataque', o.cx, o.cy, null, true);
    await new Promise((res) => setTimeout(res, 1300));
    return { cand: cand.length, id: o.id, antes, despues: z.objetos.length, sigue: z.objetos.includes(o), suelo: j.suelo.length - oro, acc: h.acc };
  });
  console.log(JSON.stringify(r));
  await p.evaluate(() => window.__ir('a4_picos')); await p.waitForTimeout(5000);
  const [x, y] = await p.evaluate(() => { const h = window.__juego().heroe; return window.__aPant(h.x + 5, h.y + 4); });
  await p.mouse.click(x, y); await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/t410_huellas.png', clip: { x: 340, y: 160, width: 600, height: 380 } });
  console.log('errs', errs.slice(0, 3));
  await b.close();
})();
