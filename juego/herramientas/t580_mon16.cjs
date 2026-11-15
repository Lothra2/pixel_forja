// Los monstruos caminan en 16 rumbos: cuánto se cruza el cuerpo respecto del rumbo, con 8 y con 16.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs } = await entrar('pc', 'berserker', 12);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  const r = await p.evaluate(async () => {
    const A = await import('/src/motor/assets.ts'); const j = window.__juego(), h = j.heroe; h.vida = h.vidaMax = 1e7;
    const D8 = ['se', 's', 'so', 'o', 'no', 'n', 'ne', 'e']; let c8 = [], c16 = [], sin = new Set(), con = new Set();
    for (let n = 0; n < 60; n++) { await new Promise((r) => setTimeout(r, 150));
      for (const m of j.monstruos) { if (m.muerto || m.dueno || (m.acc !== 'caminar' && m.acc !== 'correr') || m.rumbo === undefined) continue;
        const g = ((m.rumbo * 180 / Math.PI) + 360) % 360, d8 = Math.abs(((g - D8.indexOf(m.dir) * 45 + 540) % 360) - 180), k = Math.round(g / 22.5) % 16;
        let d16 = d8; if (Math.abs(((k * 22.5 - D8.indexOf(m.dir) * 45 + 540) % 360) - 180) <= 34) { const df = k % 2 ? 'r' + k * 22.5 : D8[k / 2]; if (A.cuadrosMonstruo(m.def.sprite, 'caminar', df).length) { d16 = Math.abs(((g - k * 22.5 + 540) % 360) - 180); con.add(m.def.sprite); } else sin.add(m.def.sprite); }
        c8.push(d8); c16.push(d16); } }
    const med = (a) => +(a.reduce((s, v) => s + v, 0) / Math.max(1, a.length)).toFixed(1);
    const man = A.manifiesto().m, finos = Object.keys(man).filter((k) => /\/r[\d.]+$/.test(k)).length, sprites = new Set(Object.keys(man).map((k) => k.split('/')[0])), conFino = new Set(Object.keys(man).filter((k) => /\/r[\d.]+$/.test(k)).map((k) => k.split('/')[0]));
    const hist = [0, 0, 0, 0, 0]; for (const d of c8) hist[d <= 11.3 ? 0 : d <= 22.5 ? 1 : d <= 34 ? 2 : d <= 67 ? 3 : 4]++; const est = {}; for (const m of j.monstruos) if (!m.muerto && !m.dueno && m.rumbo !== undefined) { const g = ((m.rumbo * 180 / Math.PI) + 360) % 360, d8 = Math.abs(((g - D8.indexOf(m.dir) * 45 + 540) % 360) - 180); if (d8 > 34 && (m.acc === 'caminar' || m.acc === 'correr')) est[m.estado + '/' + m.def.ia] = (est[m.estado + '/' + m.def.ia] || 0) + 1; }
    return { hist, est, muestras: c8.length, medio8: med(c8), medio16: med(c16), max16: Math.max(0, ...c16), con: [...con], sin: [...sin], clavesFinas: finos, sprites: sprites.size, spritesConFino: conFino.size, faltan: [...sprites].filter((s) => !conFino.has(s) && Object.keys(man).some((k) => k.startsWith(s + '/caminar/'))).slice(0, 12) };
  });
  console.log(JSON.stringify(r), errs.slice(0, 3));
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/mon16.png' });
  await b.close();
})();
