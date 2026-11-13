// Arranque común de las pruebas: un héroe guardado y adentro del juego. Devuelve { b, p, L, tap, errs }.
const { chromium, devices } = require('playwright');
const VISTAS = { pc: { viewport: { width: 1280, height: 720 } }, ipad: { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true }, ipad11: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true }, movil: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } } };
async function entrar(vista, clase, nivel, URL = process.env.URL || 'http://127.0.0.1:5190/', ajustes = '') {
  const b = await chromium.launch(); const c = await b.newContext({ ...VISTAS[vista], deviceScaleFactor: +(process.env.DPR || 1) });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); });
  const aMenu = async () => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } };
  await p.goto(URL); await aMenu();
  await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
  await p.evaluate(([clase, nivel, ajustes]) => { const d = window.__T.H.nuevoHeroe(clase, 'Prueba'); d.nivel = nivel; d.misiones = { m1_hambre: 3, m1_campanas: 2 }; if (ajustes) new Function('d', ajustes)(d); localStorage.setItem('marca.heroes', JSON.stringify([d])); }, [clase, nivel, ajustes]);
  await p.reload(); await aMenu(); await p.waitForTimeout(4800);
  const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top, W: c.width, H: c.height }; });
  const tactil = vista !== 'pc';
  const tap = async (x, y) => { if (tactil) await p.touchscreen.tap(L.l + x * L.k, L.t + y * L.k); else await p.mouse.click(L.l + x * L.k, L.t + y * L.k); };
  if (L.W >= 760) { const bw = Math.min(210, (L.W - 120) / 4 - 12); await tap(L.W / 2 - (bw * 4 + 36) / 2 + bw / 2, L.H - 73); } else await tap(L.W / 2, L.H * 0.62 + 19);
  await p.waitForTimeout(800); await tap(L.W / 2 + 240, L.H * 0.35 + 99);
  for (let i = 0; i < 80; i++) { await p.waitForTimeout(400); const e = await p.evaluate(() => window.__estado()); if (e === 'juego') break; if (e === 'entreacto') await tap(L.W / 2, L.H / 2); }
  return { b, p, L, tap, errs, tactil };
}
module.exports = { entrar };
