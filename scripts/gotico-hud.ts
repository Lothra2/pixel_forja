// Interfaz del taller gótico: pinta la pantalla de muestra (800x600) y una lámina con todas las piezas, al doble.
// Uso: npx tsx scripts/gotico-hud.ts [carpeta_de_salida]   (por defecto out/gotico-hud)
// Variables: S (escala, 2 por defecto), IDIOMA (es o en), ZIP=1 para escribir también el paquete hud.zip.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const { upscaleNearest } = await import('../src/engine/core/raster');
const { encodePng } = await import('../src/engine/export/png');
const H = await import('../src/engine/gotico/hud');
const dir = process.argv[2] ?? 'out/gotico-hud';
const S = +(process.env.S ?? 2);
const idioma = (process.env.IDIOMA === 'en' ? 'en' : 'es') as 'es' | 'en';
mkdirSync(dir, { recursive: true });
let t = Date.now();
const demo = H.pintarPantallaDemo(800, 600, idioma);
writeFileSync(join(dir, `demo_${idioma}_${S}x.png`), encodePng(upscaleNearest(demo, S)));
console.log('demo', Date.now() - t, 'ms');
t = Date.now();
const lam = H.laminaHud(idioma);
writeFileSync(join(dir, `lamina_${idioma}_${S}x.png`), encodePng(upscaleNearest(lam, S)));
console.log('lámina', lam.w, 'x', lam.h, Date.now() - t, 'ms');
if (process.env.ZIP === '1') {
  t = Date.now();
  writeFileSync(join(dir, 'hud.zip'), H.paqueteHud());
  console.log('zip', Date.now() - t, 'ms');
}
console.log('ok', dir);
