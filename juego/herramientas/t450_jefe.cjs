// Pelea con jefe: ambiente (viñeta y motas), furia (filo rojo) y caída (estallidos, onda, lluvia). Capturas de cada momento.
const { entrar } = require('./comun');
(async () => {
  const zona = process.argv[2] || 'a1_pozo';
  const { b, p, errs } = await entrar('pc', 'berserker', 30);
  await p.evaluate((z) => window.__ir(z), zona); await p.waitForTimeout(4200);
  await p.evaluate(() => { window.__sinLluvia = true; const j = window.__juego(), z = j.zona, h = j.heroe; h.vida = h.vidaMax = 1e6; const s = z.spawns.find((q) => q.tipo === 'jefe'); h.x = s.cx + 3.5; h.y = s.cy + 3.5; h.camino = null; });
  let visto = false; for (let i = 0; i < 40 && !visto; i++) { await p.waitForTimeout(300); visto = await p.evaluate(() => !!window.__juego().jefe); }
  await p.waitForTimeout(5000);
  const sh = (n) => p.screenshot({ path: `/tmp/claude-0/sp/pw/out/jefe_${n}.png`, clip: { x: 160, y: 0, width: 960, height: 640 } });
  await sh('a');
  const e1 = await p.evaluate(() => { const j = window.__juego(), m = j.jefe; if (!m) return 'sin jefe'; m.vida = m.vidaMax * 0.45; return m.def.id + ' fase ' + m.fase; });
  await p.waitForTimeout(1800); await sh('b');
  const e2 = await p.evaluate(() => { const j = window.__juego(), m = j.jefe, M = window.__mundo; if (!m) return 'sin jefe'; const f = m.fase; M.danar(j, m, { min: m.vidaMax * 2, max: m.vidaMax * 2, elem: 'fisico', deHeroe: true, fuente: j.heroe, sinFallo: true }); return 'fase ' + f + ' muerto ' + m.muerto + ' caidas ' + (j.caidas || []).length; });
  await p.waitForTimeout(1100); await sh('c'); await p.waitForTimeout(1500); await sh('d');
  console.log(visto, e1, e2, errs.slice(0, 3));
  await b.close();
})();
