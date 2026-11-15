// El retrato en grande del héroe en la portada y en «Tus héroes».
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); });
  const aMenu = async () => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; } };
  await p.goto('http://127.0.0.1:5190/'); await aMenu(); await p.waitForFunction(() => window.__T && window.__T.H, null, { timeout: 60000 });
  await p.evaluate(() => { const H = window.__T.H; const hs = [['berserker', 'Rick', 34], ['arcanista', 'Sophie', 12], ['templario', 'Alana', 51]].map(([c, n, nv]) => { const d = H.nuevoHeroe(c, n); d.nivel = nv; return d; }); localStorage.setItem('marca.heroes', JSON.stringify(hs)); });
  await p.reload(); await aMenu(); await p.waitForTimeout(5000);
  const t0 = Date.now(); for (let i = 0; i < 240; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__retratos >= 1)) break; }
  console.log('retrato listo en', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/ret_menu.png' });
  const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top, f: window.__menuFilas }; });
  await p.mouse.click(L.l + L.f.jugar[0] * L.k, L.t + L.f.jugar[1] * L.k); await p.waitForTimeout(1500);
  for (let i = 0; i < 240; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__retratos >= 1)) break; }
  await p.waitForTimeout(800); await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/ret_sel.png' });
  console.log(await p.evaluate(() => window.__estado()), errs.slice(0, 3));
  await b.close();
})();
