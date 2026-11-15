// Lámina de los iconos de habilidad: uno por cada glifo y todas las del berserker y la arcanista.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:5190/'); await p.waitForTimeout(4000);
  const url = await p.evaluate(async () => {
    const I = await import('/src/ui/iconos_hab.ts'), C = await import('/src/datos/clases.ts');
    const vistos = new Set(), uno = []; for (const h of C.HABILIDADES) if (!vistos.has(h.glifo)) { vistos.add(h.glifo); uno.push(h); }
    const lista = [...uno, ...C.HABILIDADES.filter((h) => h.clase === 'berserker' || h.clase === 'arcanista')];
    const S = 72, cols = 16, cv = document.createElement('canvas'); cv.width = cols * (S + 8) + 8; cv.height = Math.ceil(lista.length / cols) * (S + 8) + 8 + 60; const c = cv.getContext('2d'); c.fillStyle = '#17120e'; c.fillRect(0, 0, cv.width, cv.height);
    lista.forEach((h, i) => { const x = 8 + (i % cols) * (S + 8), y = 8 + Math.floor(i / cols) * (S + 8); c.drawImage(I.iconoPintado(h, S / 2 * 1), x, y, S, S); });
    const y2 = cv.height - 56; uno.slice(0, 12).forEach((h, i) => { c.drawImage(I.iconoPintado(h, 22, false, true), 8 + i * 52, y2, 44, 44); c.drawImage(I.iconoPintado(h, 22, true), 640 + i * 52, y2, 44, 44); });
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync('/tmp/claude-0/sp/pw/out/iconos.png', Buffer.from(url.split(',')[1], 'base64')); console.log('ok', errs.slice(0, 3)); await b.close();
})();
