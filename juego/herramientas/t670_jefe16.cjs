// Tira de los 16 cuadros de caminar de dos jefes para verlos seguidos.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1800, height: 620 } });
  await p.goto('http://127.0.0.1:5190/'); await p.waitForFunction(() => window.__T, null, { timeout: 90000 });
  await p.evaluate(async () => {
    const m = await (await fetch('/assets/manifiesto.json')).json(); const c = document.createElement('canvas'); c.width = 1800; c.height = 620; c.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:#222'; document.body.appendChild(c); const g = c.getContext('2d');
    const img = (n) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = '/assets/' + n + '.webp'; });
    let y = 0; for (const [id, esc] of [['jefe_abadesa', 1.3], ['jefe_aun_saar', 0.62]]) { const q = m.m[id + '/caminar/so']; let x = 0; const alto = Math.max(...q.map((f) => f[4])) * esc;
      for (const f of q) { const im = await img(f[0]); g.drawImage(im, f[1], f[2], f[3], f[4], x + (110 - f[5] * esc) , y + alto - f[6] * esc + 10, f[3] * esc, f[4] * esc); x += 110; } y += alto + 20; }
  });
  await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/claude-0/sp/pw/out/jefe16.png' }); await b.close(); })();
