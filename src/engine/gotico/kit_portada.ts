import { zipSync, zlibSync } from 'fflate';
import type { Raster } from '../core/raster';
import { lamina, degradado, encima, escalar, aRaster, grilla, hex, recortar, type Lamina } from './cine';
import { capasTitulo, reducirCapas, cuadroTitulo, CUADROS_TITULO, FPS_TITULO, type CapasTitulo, type IdiomaTitulo } from './titulo';
import { pintarPortada, componerPortada, capaVineta, BASE, CAPA, FOCO_X, RELAMPAGO_SEC, CUADROS_RELAMPAGO, type Portada } from './portada';
import { cartaActo, ACTOS_CARTA, ZONAS_CARTA, W_CARTA, H_CARTA } from './cartas_actos';
import { exportarCinematicas, LEEME_CINE, type Plano } from './cinematicas';

/**
 * Kit de la portada de Réquiem de Ceniza: el título (fijo, animado y su revelado, en español e inglés), el fondo en
 * capas de paralaje con su ceniza y sus relámpagos, las siete cartas de los actos y las cinemáticas de cierre de cada
 * acto (sección `cinematicas`), con `portada.json` que dice qué es cada archivo y cómo se dibuja. Mismo camino que la interfaz (`paqueteHud`): PNG + JSON + LEEME, en carpeta o en
 * un .zip. Ninguna textura pasa de 4096 px.
 */

export const MAX_TEX = 4096;
/** Tamaño de los cuadros del título: grande (escritorio) y chico (teléfono). La maestra fija es el doble del grande. */
export const TITULO_G = { w: 800, h: 480 }, TITULO_C = { w: 400, h: 240 };
export const CUADROS_REVELAR = 20;
const COLS_G = 5, POR_HOJA_G = 25, COLS_C = 8;

// ------------------------------------------------------------------ PNG con filtro por fila
// (el codificador de siempre no filtra: con degradados y resplandores los PNG salen tres o cuatro veces más grandes)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function trozo(tipo: string, datos: Uint8Array): Uint8Array {
  const o = new Uint8Array(12 + datos.length), v = new DataView(o.buffer);
  v.setUint32(0, datos.length);
  for (let i = 0; i < 4; i++) o[4 + i] = tipo.charCodeAt(i);
  o.set(datos, 8);
  v.setUint32(8 + datos.length, crc32(o.subarray(4, 8 + datos.length)));
  return o;
}
/** PNG RGBA de 8 bits con el mejor filtro por fila (ninguno, sub, arriba, promedio o Paeth) y deflate al 9. */
export function pngFiltrado(r: Raster): Uint8Array {
  const { w, h, data } = r, fila = w * 4, crudo = new Uint8Array((fila + 1) * h), prueba = new Uint8Array(fila);
  const paeth = (a: number, b: number, c: number) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < h; y++) {
    const o = y * fila;
    let mejor = 0, costo = Infinity;
    for (let f = 0; f < 5; f++) {
      let s = 0;
      for (let i = 0; i < fila; i++) {
        const x = data[o + i], a = i >= 4 ? data[o + i - 4] : 0, b = y ? data[o - fila + i] : 0, c = y && i >= 4 ? data[o - fila + i - 4] : 0;
        const v = (f === 0 ? x : f === 1 ? x - a : f === 2 ? x - b : f === 3 ? x - ((a + b) >> 1) : x - paeth(a, b, c)) & 255;
        prueba[i] = v; s += v < 128 ? v : 256 - v;
        if (s >= costo) break;
      }
      if (s < costo) { costo = s; mejor = f; }
    }
    const d = y * (fila + 1); crudo[d] = mejor;
    for (let i = 0; i < fila; i++) {
      const x = data[o + i], a = i >= 4 ? data[o + i - 4] : 0, b = y ? data[o - fila + i] : 0, c = y && i >= 4 ? data[o - fila + i - 4] : 0;
      crudo[d + 1 + i] = (mejor === 0 ? x : mejor === 1 ? x - a : mejor === 2 ? x - b : mejor === 3 ? x - ((a + b) >> 1) : x - paeth(a, b, c)) & 255;
    }
  }
  const ihdr = new Uint8Array(13), v = new DataView(ihdr.buffer);
  v.setUint32(0, w); v.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
  const partes = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', ihdr), trozo('IDAT', zlibSync(crudo, { level: 7 })), trozo('IEND', new Uint8Array(0))];
  const out = new Uint8Array(partes.reduce((t, p) => t + p.length, 0));
  let k = 0; for (const p of partes) { out.set(p, k); k += p.length; }
  return out;
}

/** Caja de las letras (alfa > 0.5) dentro del cuadro, en pixeles de ese tamaño. */
function cajaLetras(c: CapasTitulo) {
  let x0 = c.w, y0 = c.h, x1 = 0, y1 = 0;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.m.d[y * c.w + x] > 0.5) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
/** El título fijo sobre un fondo oscuro (para usarlo como imagen suelta). */
function sobreFondo(fr: Lamina): Raster {
  const L = lamina(fr.w, fr.h);
  degradado(L, [[0, hex('#120d12')], [0.55, hex('#0b080b')], [1, hex('#040304')]]);
  encima(L, fr);
  return aRaster(L, true);
}

export interface Archivo { nombre: string; bytes: Uint8Array }
export interface OpcKit {
  idiomas?: IdiomaTitulo[];
  /** sin el modelo de la catedral (pruebas) y menos cuadros */
  rapido?: boolean;
  sinCartas?: boolean;
  /** sin las cinemáticas de cierre (son lo más lento del kit) */
  sinCinematicas?: boolean;
  /** solo estas cinemáticas (claves acto_1 ... acto_7_corona_fria) */
  cinematicas?: string[];
  /** recibe cada carta y cada plano compuestos (vistas de control) */
  vistaCarta?: (n: number, r: Raster) => void;
  vistaCine?: (clave: string, n: number, p: Plano, valor: string | undefined, L: Lamina) => void;
  aviso?: (s: string) => void;
  /** recibe cada archivo apenas está listo (así no se juntan todos en memoria) */
  guardar?: (a: Archivo) => void;
}
export interface ResultadoKit { manifiesto: Record<string, unknown>; archivos: Archivo[]; portada: Portada; titulo: Partial<Record<IdiomaTitulo, { capasG: CapasTitulo; capasC: CapasTitulo; fijoG: Lamina }>> }

/** Arma todo el kit. Lento la primera vez (la catedral se pinta con el modelo, unos 10 a 80 s). */
export function kitPortada(o: OpcKit = {}): ResultadoKit {
  const av = o.aviso ?? (() => {}), archivos: Archivo[] = [];
  const poner = (nombre: string, r: Raster) => {
    if (r.w > MAX_TEX || r.h > MAX_TEX) throw new Error(`${nombre}: ${r.w}x${r.h} pasa de ${MAX_TEX}`);
    const a = { nombre, bytes: pngFiltrado(r) };
    if (o.guardar) { o.guardar(a); archivos.push({ nombre, bytes: new Uint8Array(0) }); } else archivos.push(a);
  };
  const N = o.rapido ? 4 : CUADROS_TITULO, NR = o.rapido ? 3 : CUADROS_REVELAR;
  // ---------------- el título
  const titulos: Record<string, unknown> = {}, guardados: ResultadoKit['titulo'] = {};
  for (const idi of o.idiomas ?? (['es', 'en'] as IdiomaTitulo[])) {
    av(`título ${idi}: capas`);
    const maestra = capasTitulo(idi, TITULO_G.w * 2, TITULO_G.h * 2);
    const fijoM = cuadroTitulo(maestra, { t: 0.7, barrido: false });
    poner(`titulo/titulo_${idi}_1600.png`, aRaster(fijoM));
    const capasG = reducirCapas(maestra, 2), capasC = reducirCapas(maestra, 4);
    const fijoG = escalar(fijoM, TITULO_G.w, TITULO_G.h);
    poner(`titulo/titulo_${idi}_800.png`, aRaster(fijoG));
    poner(`titulo/titulo_${idi}_400.png`, aRaster(escalar(fijoM, TITULO_C.w, TITULO_C.h)));
    poner(`titulo/titulo_${idi}_800_fondo.png`, sobreFondo(fijoG));
    // el bucle: 48 cuadros a 12 por segundo (4 s): la brasa late, suben chispas y pasa el barrido de luz
    av(`título ${idi}: ${N} cuadros`);
    const grandes: Raster[] = [], chicos: Raster[] = [];
    for (let f = 0; f < N; f++) { const L = cuadroTitulo(capasG, { t: f / N }); grandes.push(aRaster(L)); chicos.push(aRaster(escalar(L, TITULO_C.w, TITULO_C.h))); }
    const hojasG: string[] = [];
    for (let h = 0; h * POR_HOJA_G < N; h++) { const nombre = `titulo/titulo_${idi}_anim_800_${'abcdef'[h]}.png`; poner(nombre, grilla(grandes.slice(h * POR_HOJA_G, (h + 1) * POR_HOJA_G), COLS_G)); hojasG.push(nombre); }
    poner(`titulo/titulo_${idi}_anim_400.png`, grilla(chicos, COLS_C));
    // el revelado: primero se encienden las grietas, después aparece el hierro (se toca una vez y sigue el bucle)
    av(`título ${idi}: revelado`);
    const rev: Raster[] = [], revC: Raster[] = [];
    for (let f = 0; f < NR; f++) { const L = cuadroTitulo(capasG, { t: 0, aparicion: (f + 1) / NR, barrido: false }); rev.push(aRaster(L)); revC.push(aRaster(escalar(L, TITULO_C.w, TITULO_C.h))); }
    poner(`titulo/titulo_${idi}_revelar_800.png`, grilla(rev, COLS_G));
    poner(`titulo/titulo_${idi}_revelar_400.png`, grilla(revC, COLS_C));
    titulos[idi] = {
      fijo: { '1600': `titulo/titulo_${idi}_1600.png`, '800': `titulo/titulo_${idi}_800.png`, '400': `titulo/titulo_${idi}_400.png`, fondo_oscuro: `titulo/titulo_${idi}_800_fondo.png` },
      anim: {
        '800': { hojas: hojasG, w: TITULO_G.w, h: TITULO_G.h, cuadros: N, por_hoja: POR_HOJA_G, columnas: COLS_G, fps: FPS_TITULO, loop: true },
        '400': { hojas: [`titulo/titulo_${idi}_anim_400.png`], w: TITULO_C.w, h: TITULO_C.h, cuadros: N, por_hoja: N, columnas: COLS_C, fps: FPS_TITULO, loop: true },
      },
      revelar: {
        '800': { hojas: [`titulo/titulo_${idi}_revelar_800.png`], w: TITULO_G.w, h: TITULO_G.h, cuadros: NR, por_hoja: NR, columnas: COLS_G, fps: FPS_TITULO, loop: false },
        '400': { hojas: [`titulo/titulo_${idi}_revelar_400.png`], w: TITULO_C.w, h: TITULO_C.h, cuadros: NR, por_hoja: NR, columnas: COLS_C, fps: FPS_TITULO, loop: false },
      },
      letras: { '800': cajaLetras(capasG), '400': cajaLetras(capasC) },
    };
    guardados[idi] = { capasG, capasC, fijoG };
  }
  // ---------------- el fondo
  av('fondo');
  const p = pintarPortada({ rapida: o.rapido, aviso: (s) => av(`fondo: ${s}`) });
  const capas = [];
  for (const c of p.capas) {
    if (c.id === 'relampago') { capas.push({ id: c.id, z: c.z, archivo: 'fondo/relampago.png', paralaje: c.paralaje, mezcla: c.mezcla, anim: { tipo: 'cuadros', ver: 'relampago' } }); continue; }
    poner(`fondo/${c.id}.png`, c.img);
    // una tira (anim 'cuadros' con x, y) mide lo de un cuadro; las demás cubren la capa entera
    const tira = c.anim?.tipo === 'cuadros' && c.x !== undefined, a = c.anim as { w: number; h: number } | undefined;
    capas.push({ id: c.id, z: c.z, archivo: `fondo/${c.id}.png`, ...(tira ? { x: c.x, y: c.y } : {}), w: tira ? a!.w : c.img.w, h: tira ? a!.h : c.img.h, paralaje: c.paralaje, mezcla: c.mezcla, ...(c.anim ? { anim: c.anim } : {}), ...(c.notas ? { notas: c.notas } : {}) });
  }
  poner('fondo/vineta.png', aRaster(capaVineta()));
  capas.push({ id: 'vineta', z: 20, archivo: 'fondo/vineta.png', w: BASE.w, h: BASE.h, paralaje: 0, mezcla: 'normal', notas: 'Fija, estirada a toda la pantalla, encima de todo menos del título y los botones.' });
  poner('fondo/relampago.png', grilla(p.relampago, 2));
  poner('fondo/ceniza.png', p.ceniza);
  // ---------------- las cartas
  const cartas = [];
  if (!o.sinCartas) for (const a of ACTOS_CARTA) {
    av(`carta ${a.n}`);
    const rc = cartaActo(a.n);
    poner(`cartas/acto_${a.n}.png`, rc);
    o.vistaCarta?.(a.n, rc);
    cartas.push({ n: a.n, id: a.id, es: a.es, en: a.en, archivo: `cartas/acto_${a.n}.png`, color_titulo: a.luz });
  }
  // ---------------- las cinemáticas de cierre
  const cinematicas = o.sinCinematicas ? undefined : exportarCinematicas({ poner, aviso: av, claves: o.cinematicas, vista: o.vistaCine });
  const puerta = [Math.round(p.puerta[0] - CAPA.mx), Math.round(p.puerta[1] - CAPA.my)];
  const manifiesto = {
    formato: 'pixelforja-gotico-portada', version: 1,
    leeme: 'Coordenadas en pixeles de la pantalla base de 1280x720 salvo que se diga otra cosa. Los cuadros de una hoja van en grilla: cuadro i en la columna i % columnas, fila floor(i / columnas). Las capas que dicen mezcla "sumar" se dibujan con globalCompositeOperation = "lighter".',
    base: BASE,
    titulo: {
      ...titulos,
      colocacion: {
        escritorio: { ancho_rel: 0.54, centro_y_rel: 0.235, usar: '800', notas: 'el cuadro de 800x480 escalado a 0.54 del ancho de pantalla, centrado en x: las agujas de la catedral asoman detrás de CENIZA' },
        movil_vertical: { ancho_rel: 0.96, centro_y_rel: 0.2, usar: '400', notas: 'el cuadro de 400x240 escalado a 0.96 del ancho' },
      },
      notas: 'Los cuadros son transparentes y ya traen el halo de ascua, el contorno negro y la sombra: dibujarlos con mezcla normal. El revelado se toca una vez y empalma con el cuadro 0 del bucle.',
    },
    fondo: {
      capa: { w: CAPA.w, h: CAPA.h, margen_x: CAPA.mx, margen_y: CAPA.my, notas: 'La pantalla base va en (margen_x, margen_y) de cada capa. Con la cámara corrida (cx, cy) la capa se dibuja en (-margen_x - cx * paralaje, -margen_y - cy * paralaje), todo por la escala de pantalla.' },
      capas,
      camara: { deriva_x: 40, periodo_x_s: 46, deriva_y: 8, periodo_y_s: 31, raton: 24, notas: 'cx = sin(2πt/periodo_x) * deriva_x + (raton_x - 0.5) * 2 * raton; cy igual con y. Nunca más de 100 px en x ni 30 en y (el margen de la capa de paralaje 1 es 128 x 40).' },
      foco: { x: FOCO_X, puerta, notas: 'En pantallas angostas (teléfono vertical) centrar la vista en foco.x para que se vea la catedral y su puerta.' },
      relampago: { archivo: 'fondo/relampago.png', w: CAPA.w, h: 560, cuadros: CUADROS_RELAMPAGO, columnas: 2, fps: RELAMPAGO_SEC.fps, destello: RELAMPAGO_SEC.destello, cada_s: [7, 16], espejar: 'al azar', y_capa: 0,
        notas: 'Se dibuja sobre la capa nubes con su paralaje (sumar), arriba de la capa (y 0). En cada cuadro, además, un rectángulo blanco azulado a toda la pantalla con alfa = destello[i] (sumar). Mientras dura, catedral_luz baja a 0.5 y el trueno suena 0.4 a 1.2 s después.' },
      ceniza: {
        archivo: 'fondo/ceniza.png', celda: 32, columnas: 8, fps: 10, filas: { copo: 0, copo2: 1, brasa: 2, chispa: 3 },
        particulas: [
          { fila: 'copo', cantidad: 60, despues_de: 'niebla', paralaje: 0.6, escala: [0.35, 0.7], vel_x: [-16, -4], vel_y: [10, 24], vaiven: 10, alfa: [0.3, 0.6], mezcla: 'normal' },
          { fila: 'brasa', cantidad: 16, despues_de: 'catedral_luz', paralaje: 0.45, escala: [0.4, 0.8], vel_x: [-8, 8], vel_y: [-28, -10], vaiven: 14, alfa: [0.6, 1], mezcla: 'sumar', nacen_en: puerta, notas: 'suben desde la puerta de la catedral y se apagan a los 2 a 4 s' },
          { fila: 'copo2', cantidad: 22, despues_de: 'cementerio', paralaje: 1.25, escala: [0.9, 1.6], vel_x: [-40, -14], vel_y: [28, 60], vaiven: 18, alfa: [0.45, 0.85], mezcla: 'normal' },
          { fila: 'chispa', cantidad: 24, despues_de: 'cementerio', paralaje: 1.1, escala: [0.6, 1.1], vel_x: [-20, 10], vel_y: [-45, -15], vaiven: 12, alfa: [0.5, 1], mezcla: 'sumar' },
        ],
        notas: 'Cada partícula toma un cuadro de su fila que avanza a fps (con desfase al azar) y se mueve con su velocidad en px/s más un vaivén senoidal en x. Al salir por un borde vuelve a entrar por el opuesto.',
      },
    },
    cartas: { w: W_CARTA, h: H_CARTA, zonas: ZONAS_CARTA, actos: cartas, notas: 'Opacas. El título del acto va centrado en zonas.titulo (color_titulo con contorno negro) y la narración en zonas.narracion, en hueso claro. Entrar con fundido de 0.8 s y un acercamiento lento (escala 1.0 a 1.04 en 8 s).' },
    ...(cinematicas ? { cinematicas } : {}),
    secuencia: [
      { t: 0, que: 'negro; empieza la música' },
      { t: 0.2, que: 'fundido del fondo (cielo y ruinas primero) en 1.6 s; la cámara ya deriva' },
      { t: 1.4, que: 'un relámpago (forzado) que deja ver la catedral; catedral_luz sube de 0 a 1 en 1 s' },
      { t: 2.2, que: 'revelar del título (20 cuadros a 12 fps, 1.7 s) y al terminar el bucle anim desde el cuadro 0' },
      { t: 4.0, que: 'aparecen los botones del menú (fundido 0.5 s), en la franja oscura de abajo' },
    ],
  };
  const txt = new TextEncoder();
  archivos.push({ nombre: 'portada.json', bytes: txt.encode(JSON.stringify(manifiesto, null, 1)) });
  archivos.push({ nombre: 'LEEME.txt', bytes: txt.encode(LEEME) });
  if (o.guardar) { o.guardar(archivos[archivos.length - 2]); o.guardar(archivos[archivos.length - 1]); }
  return { manifiesto, archivos, portada: p, titulo: guardados };
}

const LEEME = `Portada de Réquiem de Ceniza (PixelForja, taller gótico). Todo pintado por el motor: letras propias, nada importado.

portada.json dice qué es cada archivo, el orden de las capas, su paralaje, sus animaciones y la secuencia de entrada.
titulo/   el título en español (es) e inglés (en): fijo a 1600, 800 y 400 (transparente) y sobre fondo oscuro;
          bucle de 48 cuadros a 12 fps (4 s) en grillas; revelado de 20 cuadros.
fondo/    capas de 1536x800 (la pantalla base de 1280x720 va en 128, 40), viñeta fija, relámpago (6 cuadros que se
          suman) y la hoja de ceniza (8 x 4 celdas de 32 px).
cartas/   las siete cartas de los actos, 1280x720, con lugar para el título arriba y la narración abajo.
` + LEEME_CINE;

/** Todo el kit en un .zip. */
export function paquetePortada(o: OpcKit = {}): Uint8Array {
  const { archivos } = kitPortada({ ...o, guardar: undefined });
  const f: Record<string, Uint8Array> = {};
  for (const a of archivos) f[a.nombre] = a.bytes;
  return zipSync(f, { level: 6 });
}

// ------------------------------------------------------------------ vistas de control (QA)
/**
 * La portada como la vería el jugador: fondo compuesto con la cámara en `cam`, viñeta y el título encima según
 * `colocacion` del manifiesto. Para teléfono vertical recorta la base alrededor del foco y escala a la altura.
 */
export function vistaPortada(p: Portada, titulo: Lamina, pantalla: { w: number; h: number }, o: { cam?: [number, number]; relampago?: number; focoX?: number } = {}): Raster {
  const base = componerPortada(p, { cam: o.cam, relampago: o.relampago });
  const vertical = pantalla.h > pantalla.w;
  let fondo: Lamina;
  if (vertical) {
    const s = pantalla.h / BASE.h, ancho = Math.round(pantalla.w / s), fx = o.focoX ?? FOCO_X;
    const x0 = Math.max(0, Math.min(BASE.w - ancho, Math.round(fx - ancho / 2)));
    fondo = escalar(recortar(base, x0, 0, ancho, BASE.h), pantalla.w, pantalla.h);
  } else fondo = escalar(base, pantalla.w, pantalla.h);
  const col = vertical ? { ancho_rel: 0.96, centro_y_rel: 0.2 } : { ancho_rel: 0.54, centro_y_rel: 0.235 };
  const tw = Math.round(pantalla.w * col.ancho_rel), th = Math.round((titulo.h * tw) / titulo.w);
  const t = escalar(titulo, tw, th);
  encima(fondo, t, Math.round((pantalla.w - tw) / 2), Math.round(pantalla.h * col.centro_y_rel - th / 2));
  return aRaster(fondo, true);
}
