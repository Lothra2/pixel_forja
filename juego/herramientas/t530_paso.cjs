// El paso fino (16 rumbos) y la palanca analógica: suave camina, a fondo corre. Mide además cuánto se cruza el cuerpo
// respecto de su rumbo con y sin el paso fino.
const { entrar } = require('./comun');
(async () => {
  const { b, p, errs, L } = await entrar('movil', process.argv[2] || 'berserker', 12);
  await p.evaluate(() => window.__ir('a1_paramo')); await p.waitForTimeout(4500);
  await p.evaluate(() => { const j = window.__juego(); j.monstruos.forEach((m) => { if (!m.dueno) { m.muerto = true; m.vida = 0; m.tMuerto = 999; } }); j.heroe.vida = j.heroe.vidaMax = 1e6; });
  // esperar el paso fino
  let listo = 0; const t0 = Date.now();
  const cdp = await p.context().newCDPSession(p);
  const toque = async (tipo, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: tipo === 'touchEnd' ? [] : [{ x: L.l + x * L.k, y: L.t + y * L.k }] });
  const x0 = L.W * 0.16, y0 = L.H * 0.72;
  const medir = async (r, ang, ms) => {
    await toque('touchStart', x0, y0); await p.waitForTimeout(60);
    for (let i = 1; i <= 6; i++) { await toque('touchMove', x0 + Math.cos(ang) * r * i / 6, y0 + Math.sin(ang) * r * i / 6); await p.waitForTimeout(30); }
    const m = []; const t1 = Date.now();
    while (Date.now() - t1 < ms) { await p.waitForTimeout(120); m.push(await p.evaluate(() => { const h = window.__juego().heroe; return { acc: h.acc, correr: h.correr, fino: window.__fino, dir: h.dir, rumbo: h.rumbo, x: h.x, y: h.y }; })); }
    await toque('touchEnd', 0, 0); await p.waitForTimeout(500);
    return m;
  };
  const res = {};
  for (let k = 0; k < 400; k++) { await p.waitForTimeout(1000); listo = await p.evaluate(() => window.__finos || 0); if (listo >= 16) break; }
  console.log('paso fino', listo, 'de 16 tras', ((Date.now() - t0) / 1000).toFixed(0), 's');
  const suave = await medir(20, 1.0, 2200), fondo = await medir(70, 1.0, 2200);
  const vel = (m) => { const a = m[2], z = m[m.length - 1]; return +(Math.hypot(z.x - a.x, z.y - a.y) / ((m.length - 3) * 0.12)).toFixed(2); };
  console.log('suave', suave[5].acc, 'vel', vel(suave), '| a fondo', fondo[5].acc, 'vel', vel(fondo));
  // cuánto se cruza el cuerpo: ángulo entre el rumbo real y el rumbo dibujado, en 12 direcciones de palanca
  const D8 = ['se', 's', 'so', 'o', 'no', 'n', 'ne', 'e'];
  let c8 = [], c16 = [];
  for (let k = 0; k < 12; k++) { const m = await medir(70, k * 0.5236 + 0.2, 1500);
    for (const q of m.slice(4)) { if (q.rumbo === undefined || (q.acc !== 'correr' && q.acc !== 'caminar')) continue; const g = ((q.rumbo * 180 / Math.PI) + 360) % 360; const d8 = Math.abs(((g - D8.indexOf(q.dir) * 45 + 540) % 360) - 180); c8.push(d8); c16.push(q.fino >= 0 ? Math.abs(((g - q.fino * 22.5 + 540) % 360) - 180) : d8); } }
  const med = (a) => (a.reduce((s, v) => s + v, 0) / a.length).toFixed(1), mx = (a) => Math.max(...a).toFixed(1);
  console.log('cuerpo cruzado, 8 rumbos: medio', med(c8), 'máx', mx(c8), '| 16 rumbos: medio', med(c16), 'máx', mx(c16), 'muestras', c8.length);
  await toque('touchStart', x0, y0); for (let i = 1; i <= 6; i++) await toque('touchMove', x0 + 60 * i / 6 * 0.5, y0 + 60 * i / 6 * 0.86); await p.waitForTimeout(900);
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/paso.png' }); await toque('touchEnd', 0, 0);
  console.log('huellas', await p.evaluate(() => window.__huellas), errs.slice(0, 3));
  await b.close();
})();
