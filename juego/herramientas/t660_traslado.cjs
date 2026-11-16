// La partida viaja: se saca como código en un navegador y entra por enlace (#partida=) en otro limpio; con partida ya puesta pide confirmar.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const nueva = async (init) => { const c = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); if (init) await p.addInitScript(init); return p; };
  const aMenu = async (p) => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } };
  const p = await nueva(() => localStorage.setItem('marca.intro', '1'));
  await p.goto('http://127.0.0.1:5190/'); await aMenu(p); await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
  await p.evaluate(() => { const d = window.__T.H.nuevoHeroe('berserker', 'Rick'); d.nivel = 37; d.oro = 4321; localStorage.setItem('marca.heroes', JSON.stringify([d])); localStorage.setItem('marca.cofre', JSON.stringify([{ id: 'x' }])); });
  const { cod, orig } = await p.evaluate(async () => { const m = await import('/src/ui/traslado.ts'); return { cod: await m.codigoPartida(), orig: localStorage.getItem('marca.heroes') }; });
  console.log('código', cod.slice(0, 12), cod.length, 'bytes de', orig.length);
  // navegador limpio: entra sola
  const q = await nueva(); await q.goto('http://127.0.0.1:5190/#partida=' + cod); await q.waitForTimeout(6000);
  const r = await q.evaluate(() => ({ h: localStorage.getItem('marca.heroes'), c: localStorage.getItem('marca.cofre'), hash: location.hash }));
  console.log('limpio: igual', r.h === orig, 'cofre', r.c, 'hash', JSON.stringify(r.hash));
  // navegador con otra partida: pregunta, y al aceptar deja respaldo
  const s = await nueva(() => { if (!localStorage.getItem('marca.heroes')) localStorage.setItem('marca.heroes', JSON.stringify([{ nombre: 'Otro', clase: 'monje', nivel: 3 }])); localStorage.setItem('marca.intro', '1'); });
  await s.goto('http://127.0.0.1:5190/#partida=' + cod); await s.waitForTimeout(5000);
  const antes = await s.evaluate(() => JSON.parse(localStorage.getItem('marca.heroes'))[0].nombre);
  await s.screenshot({ path: '/tmp/claude-0/sp/pw/out/traslado.png' });
  await s.getByText('Cargar esta partida').click(); await s.waitForTimeout(5000);
  const t = await s.evaluate(() => ({ h: localStorage.getItem('marca.heroes'), resp: JSON.parse(localStorage.getItem('marca.respaldo') || 'null') }));
  console.log('con partida: antes', antes, 'después igual', t.h === orig, 'respaldo', t.resp && JSON.parse(t.resp.d['marca.heroes'])[0].nombre);
  // código malo
  console.log('malo:', await p.evaluate(async () => { const m = await import('/src/ui/traslado.ts'); return [await m.leerCodigo('hola'), await m.leerCodigo('REQ2.AAAA')]; }));
  console.log('errores', errs.slice(0, 3)); await b.close();
})();
