// Uso: node catedral.cjs [movil] (dev en 5190). La catedral en sellada, entera y herida con __catedral, y el plano de llegada.
// Fuego de Doom en el juego: capturas de cerca y ms por cuadro. Uso: node t140_fuego.js [movil]
const { chromium, devices } = require('playwright');
const MOVIL = process.argv[2] === 'movil', URL = process.env.URL || 'http://127.0.0.1:5190/';
(async () => {
  const b = await chromium.launch();
  const c = MOVIL ? await b.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } }) : await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); });
  await p.goto(URL); for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
  await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
  await p.evaluate(async () => { const d = window.__T.H.nuevoHeroe('arcanista', 'X'); d.nivel = 40; d.misiones = { m1_hambre: 3, m1_campanas: 2 }; localStorage.setItem('marca.heroes', JSON.stringify([d])); });
  await p.reload(); for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
  await p.waitForTimeout(4800);
  const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top, W: c.width, H: c.height }; });
  const tap = async (x, y) => { if (MOVIL) await p.touchscreen.tap(L.l + x * L.k, L.t + y * L.k); else await p.mouse.click(L.l + x * L.k, L.t + y * L.k); };
  if (L.W >= 900) await tap(L.W / 2 - 333, L.H - 73); else await tap(L.W / 2, L.H * 0.62 + 19);
  await p.waitForTimeout(800); await tap(L.W / 2 + 240, L.H * 0.35 + 99);
  for (let i = 0; i < 80; i++) { await p.waitForTimeout(400); const e = await p.evaluate(() => window.__estado()); if (e === 'juego') break; if (e === 'entreacto') await tap(L.W / 2, L.H / 2); }
  const sufijo = MOVIL ? '_movil' : ''; if (process.env.SIN) await p.evaluate(() => { window.__sinFuegoDoom = true; });
  const medir = async () => p.evaluate(() => new Promise((res) => {
    const f = window.__fuegos; let n = 0, ms = 0, dib = 0, t0 = performance.now(), tmax = 0, prev = t0;
    const tic = () => { const now = performance.now(); tmax = Math.max(tmax, now - prev); prev = now; ms += f.ms; dib += f.msDibujoUlt; if (++n < 90) requestAnimationFrame(tic); else res({ vivos: f.vivos, cand: f.candidatos, msFuego: +(ms / n).toFixed(2), msDibujo: +(dib / n).toFixed(2), msCuadro: +((performance.now() - t0) / n).toFixed(1), peor: +tmax.toFixed(1) }); };
    requestAnimationFrame(tic);
  }));
  if (false) { await p.goto(URL); for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } await p.waitForTimeout(5000); await p.screenshot({ path: 'menu_tactil.png', clip: { x: 0, y: 0, width: 200, height: 120 } }); console.log('tactil al cargar', await p.evaluate(() => import('/src/nucleo/lienzo.ts').then((m) => m.E.tactil))); await b.close(); return; }
  await p.evaluate(() => window.__ir('a1_cementerio')); await p.waitForTimeout(1600);
  await p.screenshot({ path: `cat74_llegada${MOVIL ? '_movil' : ''}.png` });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const j = window.__juego(); const o = j.zona.objetos.find((o) => /abo_catedral_fachada/.test(o.id)); j.heroe.x = o.cx + 0.5; j.heroe.y = o.cy + 10; j.monstruos.forEach((m) => { if (Math.hypot(m.x - j.heroe.x, m.y - j.heroe.y) < 16) { m.vida = 0; m.muerto = true; } }); });
  for (const v of ['sellada', 'entera', 'herida']) {
    await p.evaluate((v) => window.__catedral(v), v); await p.waitForTimeout(1800);
    const vv = await p.evaluate(() => window.__juego().zona.objetos.filter((o) => /abo_catedral/.test(o.id)).map((o) => o.v).join(','));
    await p.screenshot({ path: `cat74_${v}${MOVIL ? '_movil' : ''}.png` }); console.log(v, vv, JSON.stringify(await medir()));
  }
  console.log('errores', errs.slice(0, 4));
  await b.close();
})();
