// Las 11 cinemáticas de cierre (y las 4 variantes) en tiempo real: errores, archivos, sonidos, páginas y una captura por plano.
const { chromium, devices } = require('playwright');
const modo = process.argv[2] || 'pc', URL = process.env.URL || 'http://127.0.0.1:5190/';
const CASOS = [['acto_1', 1, []], ['acto_2', 2, []], ['acto_3', 3, []], ['acto_4', 4, ['vigdis_viva']], ['acto_4', 4, ['vigdis_muerta']], ['acto_5', 5, ['brasa_destruir']], ['acto_5', 5, ['brasa_absorber']], ['acto_6', 6, []], ['acto_7', 7, []], ['acto_7_vigilia', 7, []], ['acto_7_cielo', 7, []], ['acto_7_rey_ceniza', 7, []], ['acto_7_corona_fria', 7, []]];
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext(modo === 'movil' ? { ...devices['iPhone 13 landscape'] } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await c.newPage(); const errores = [], fallos = [];
  p.on('pageerror', (e) => errores.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  p.on('response', (r) => { if (r.status() >= 400) fallos.push(r.status() + ' ' + r.url()); });
  await p.addInitScript(() => { localStorage.setItem('marca.intro', '1'); });
  await p.goto(URL);
  for (let i = 0; i < 120; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__estado && window.__estado()) === 'menu') break; }
  await p.evaluate(() => window.__cine('demo', 0)); await p.waitForTimeout(500); await p.keyboard.press('Escape');
  await p.waitForFunction(() => window.__cineDatos && window.__cineDatos()?.cinematicas?.acto_1, null, { timeout: 60000 });
  for (let i = 0; i < 40; i++) { if (await p.evaluate(() => window.__estado()) === 'menu') break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  const out = [];
  for (const [clave, acto, marcas] of CASOS) {
    const planos = await p.evaluate((k) => window.__cineDatos().cinematicas[k].planos.map((q) => [q.id, q.dur, (q.sonidos ?? []).length, q.particulas ?? '-']), clave);
    const nSon0 = await p.evaluate(() => window.__cineSon().length);
    await p.evaluate(([k, a, m]) => window.__cine(k, a, m), [clave, acto, marcas]);
    const t0 = Date.now(); let acc = 0; const pags = [];
    for (const [id, dur] of planos) {
      const medio = acc + dur / 2; acc += dur;
      const falta = medio * 1000 - (Date.now() - t0); if (falta > 0) await p.waitForTimeout(falta);
      pags.push((await p.evaluate(() => window.__cineImgs())).filter((x) => /cinematicas\/(acto|intro)/.test(x[0])).map((x) => x[0].split('/').slice(-2).join('/') + (x[1] ? '' : '(cargando)')).join(' '));
      await p.screenshot({ path: `/tmp/claude-0/sp/pw/cine_${modo}_${clave}${marcas.length ? '_' + marcas[0] : ''}_${id}.png` });
    }
    await p.waitForFunction(() => window.__estado() === 'menu', null, { timeout: 15000 }).catch(() => errores.push(clave + ': no volvió'));
    const son = await p.evaluate((n) => window.__cineSon().slice(n), nSon0);
    out.push({ clave: clave + (marcas.length ? '/' + marcas[0] : ''), planos: planos.map((q) => q[0] + '(' + q[3] + ',' + q[2] + ' son)').join(' '), sonidos: son.map((s) => s.plano + ':' + s.efecto + '@' + s.t).join(' '), paginas: pags.join(' | ') });
  }
  console.log(JSON.stringify({ modo, out, errores, fallos }, null, 1));
  await b.close();
})();
