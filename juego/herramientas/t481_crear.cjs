// La pantalla de crear héroe: tres momentos de la presentación de cada clase pedida, con la presentación 'sel' o la de retrato.
const { chromium } = require('playwright');
(async () => {
  const sinSel = process.argv[2] === 'retrato', clases = +(process.argv[3] || 1);
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((s) => { localStorage.setItem('marca.intro', '1'); window.__sinSel = s; }, sinSel);
  await p.goto('http://127.0.0.1:5190/'); for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
  await p.waitForTimeout(7000);
  const L = await p.evaluate(() => { const c = document.getElementById('juego'); const r = c.getBoundingClientRect(); return { k: r.width / c.width, l: r.left, t: r.top, f: window.__menuFilas }; });
  await p.mouse.click(L.l + L.f.jugar[0] * L.k, L.t + L.f.jugar[1] * L.k); await p.waitForTimeout(1500);
  for (let n = 0; n < clases; n++) {
    for (const [i, ms] of [[0, 500], [1, 1300], [2, 2500], [3, 2500]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `/tmp/claude-0/sp/pw/out/crear_${sinSel ? 'r' : 's'}_${n}_${i}.png`, clip: { x: 300, y: 150, width: 480, height: 520 } }); }
    await p.keyboard.press('ArrowRight');
  }
  console.log(await p.evaluate(() => window.__estado()), errs.slice(0, 2));
  await b.close();
})();
