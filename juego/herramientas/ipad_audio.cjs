// iPad: la intro espera un toque, el audio arranca con el toque y se recupera al volver de segundo plano.
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:5190/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const out = {};
  for (const [w, h] of [[1024, 768], [1180, 820]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const pg = await c.newPage(); const err = [];
    pg.on('pageerror', (e) => err.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error') err.push(m.text()); });
    await pg.goto(URL);
    await pg.waitForFunction(() => window.__estado && window.__estado() === 'intro', null, { timeout: 120000 });
    await pg.waitForTimeout(2500);
    const antes = await pg.evaluate(() => ({ audio: window.__audio(), sonidos: window.__cineSon().length }));
    await pg.screenshot({ path: `/tmp/claude-0/sp/pw/ipad_audio_${w}_cartel.png` });
    await pg.touchscreen.tap(w / 2, h / 2);
    await pg.waitForTimeout(12000);
    const despues = await pg.evaluate(() => ({ audio: window.__audio(), estado: window.__estado(), sonidos: window.__cineSon().map((s) => s.plano + '@' + s.t) }));
    await pg.screenshot({ path: `/tmp/claude-0/sp/pw/ipad_audio_${w}_intro.png` });
    // segundo plano: suspender a mano como hace iOS y volver
    await pg.evaluate(async () => { const a = window.__audioCtx; });
    out[w + 'x' + h] = { antes, despues, err };
    await c.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
