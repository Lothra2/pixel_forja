// Portada de Réquiem de Ceniza: título (fijo, animado y revelado), fondo en capas de paralaje, ceniza, relámpagos y
// las siete cartas de los actos y las cinemáticas de cierre de cada acto, con portada.json. Escribe también vistas de control en <carpeta>/qa.
// Uso: npx tsx scripts/gotico-portada.ts [carpeta_de_salida]   (por defecto out/gotico-portada)
// Variables: RAPIDO=1 (sin el modelo de la catedral y con pocos cuadros), IDIOMAS=es,en, ZIP=1 (también portada.zip),
// SIN_CARTAS=1, SIN_CINE=1 (sin las cinemáticas de cierre), CINE=acto_1,acto_7_cielo (solo esas cinemáticas).
// En <carpeta>/qa/cine quedan los planos compuestos (1280x720, a mitad de su duración) y en <carpeta>/qa una hoja de
// contacto por acto (hoja_acto_N.png: la carta y sus planos; hoja_acto_7_finales.png: los cuatro finales).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const K = await import('../src/engine/gotico/kit_portada');
const T = await import('../src/engine/gotico/titulo');
const { encodePng } = await import('../src/engine/export/png');
const C = await import('../src/engine/gotico/cine');
const dir = process.argv[2] ?? 'out/gotico-portada';
const t0 = Date.now();
const guardar = (a: { nombre: string; bytes: Uint8Array }) => { const f = join(dir, a.nombre); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, a.bytes); };
// vistas chicas para las hojas de contacto (640x360) por acto
const hojas = new Map<string, import('../src/engine/core/raster').Raster[]>();
const meter = (k: string, L: import('../src/engine/gotico/cine').Lamina) => { const v = hojas.get(k) ?? []; v.push(C.aRaster(C.escalar(L, 640, 360), true)); hojas.set(k, v); };
mkdirSync(join(dir, 'qa', 'cine'), { recursive: true });
const r = K.kitPortada({
  rapido: process.env.RAPIDO === '1',
  sinCartas: process.env.SIN_CARTAS === '1',
  sinCinematicas: process.env.SIN_CINE === '1',
  cinematicas: process.env.CINE ? process.env.CINE.split(',') : undefined,
  vistaCarta: (n, rc) => { const L = C.desdeRaster(rc); meter(`acto_${n}`, L); },
  vistaCine: (clave, n, p, valor, L) => {
    writeFileSync(join(dir, 'qa', 'cine', `${clave}_${n + 1}_${p.id}${valor ? '_' + valor : ''}.png`), encodePng(C.aRaster(L, true)));
    meter(clave.startsWith('acto_7_') ? 'acto_7_finales' : clave, L);
  },
  idiomas: (process.env.IDIOMAS ?? 'es,en').split(',') as ('es' | 'en')[],
  aviso: (s) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`, s),
  guardar,
});
// vistas de control: el título sobre el fondo a 1280x720 y en un teléfono vertical de 390x844
mkdirSync(join(dir, 'qa'), { recursive: true });
for (const [idi, t] of Object.entries(r.titulo)) {
  if (!t) continue;
  const cuadro = T.cuadroTitulo(t.capasG, { t: 0.25 });
  writeFileSync(join(dir, 'qa', `portada_1280x720_${idi}.png`), encodePng(K.vistaPortada(r.portada, cuadro, { w: 1280, h: 720 }, { cam: [0, 0] })));
  const chico = C.escalar(cuadro, K.TITULO_C.w, K.TITULO_C.h);
  writeFileSync(join(dir, 'qa', `portada_390x844_${idi}.png`), encodePng(K.vistaPortada(r.portada, chico, { w: 390, h: 844 })));
  if (idi === 'es') {
    writeFileSync(join(dir, 'qa', 'portada_1280x720_relampago.png'), encodePng(K.vistaPortada(r.portada, cuadro, { w: 1280, h: 720 }, { cam: [-60, 6], relampago: 1 })));
    writeFileSync(join(dir, 'qa', 'portada_1920x1080_es.png'), encodePng(K.vistaPortada(r.portada, T.cuadroTitulo(T.capasTitulo('es', 1600, 960), { t: 0.25 }), { w: 1920, h: 1080 })));
  }
}
// hojas de contacto: 2 columnas de 640x360
for (const [k, v] of hojas) {
  const vacio = C.aRaster(C.lamina(640, 360), true);
  writeFileSync(join(dir, 'qa', `hoja_${k}.png`), encodePng(C.grilla(v.length % 2 ? [...v, vacio] : v, 2)));
}
if (process.env.ZIP === '1') writeFileSync(join(dir, 'portada.zip'), K.paquetePortada({ rapido: process.env.RAPIDO === '1' }));
console.log('ok', dir, `${((Date.now() - t0) / 1000).toFixed(1)}s`, r.archivos.length, 'archivos');
