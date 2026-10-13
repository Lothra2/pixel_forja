import { encodePng } from '../../export/png';
import { createRaster, type Raster } from '../../core/raster';
import { collisionOf, depthOf } from './layout';
import { NOMBRES } from './paleta';
import { fichaMarkdown } from './ficha';
import { PARALAJE, TROZO, postal, trozo, type Escena } from './escena';
import type { Lienzo } from './lienzo';

/**
 * La carpeta `escenarios/<id>/` del pedido (10.3), lista para el juego: capas en trozos de 1280, atlas de objetos y de
 * vida, superficie, colisión, luces, partículas, postales y la ficha. Todo a escala 1.
 */

export interface Archivo { nombre: string; bytes: Uint8Array }

/** Empaca imágenes en un atlas por filas de hasta `ancho` px. Devuelve el atlas y el rectángulo de cada una. */
export function empacar(imgs: Raster[], ancho = 2048) {
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  let x = 0, y = 0, fila = 0, W = 0;
  for (const im of imgs) {
    if (x + im.w > ancho && x > 0) { x = 0; y += fila + 1; fila = 0; }
    rects.push({ x, y, w: im.w, h: im.h });
    x += im.w + 1; fila = Math.max(fila, im.h); W = Math.max(W, x);
  }
  const atlas = createRaster(Math.max(1, W), Math.max(1, y + fila));
  imgs.forEach((im, i) => {
    const r = rects[i];
    for (let j = 0; j < im.h; j++) atlas.data.set(im.data.subarray(j * im.w * 4, (j + 1) * im.w * 4), ((r.y + j) * atlas.w + r.x) * 4);
  });
  return { atlas, rects };
}

const json = (o: unknown) => new TextEncoder().encode(JSON.stringify(o, null, 1));

/** Las postales del escenario: inicio, medio (el tramo con más obstáculos) y final. */
export function puntosPostal(E: Escena): Record<'inicio' | 'medio' | 'final', number> {
  const L = E.layout, W = 640;
  const salida = (L.entidades.find((e) => e.tipo === 'salida')?.x as number | undefined) ?? 0;
  const meta = (L.entidades.find((e) => e.tipo === 'meta')?.x as number | undefined) ?? L.largo;
  // el medio: la ventana de 640 con más cosas que sortear (huecos, muros y cajas)
  let mejor = Math.floor((L.largo - W) / 2), max = -1;
  for (let x = W; x <= L.largo - 2 * W; x += 32) {
    const n = L.huecos.filter((h) => h.x0 < x + W && h.x1 > x).length * 3 + L.muros.filter((m) => m.x < x + W && m.x + m.w > x).length * 3 + [...L.plataformas, ...L.solidos].filter((b) => b.x < x + W && b.x + b.w > x).length;
    if (n > max) { max = n; mejor = x; }
  }
  return { inicio: Math.max(0, Math.min(salida - 40, L.largo - W)), medio: mejor, final: Math.max(0, Math.min(meta + 50 - W, L.largo - W)) };
}

export interface OpcionesExportar {
  /** postales/inicio, medio y final (para aprobar; el juego no las carga). Por defecto, sí. */
  postales?: boolean;
  /** ficha_arte.md (para aprobar). Por defecto, sí. */
  ficha?: boolean;
}

export function exportarEscena(E: Escena, verificacion?: string, o: OpcionesExportar = {}): Archivo[] {
  const conPostales = o.postales ?? true, conFicha = o.ficha ?? true;
  const L = E.layout, FT = L.franja.atras, D = depthOf(L), out: Archivo[] = [];
  const png = (nombre: string, r: Raster) => out.push({ nombre, bytes: encodePng(r) });
  const trozos = (base: string, capa: Lienzo) => {
    const nombres: string[] = [];
    for (let x = 0, k = 0; x < capa.w; x += TROZO, k++) { const n = `${base}_${k}.png`; png(n, trozo(capa, x)); nombres.push(n); }
    return nombres;
  };
  png(`cielo_${L.hora}.png`, E.cielo.r);
  png('lejos.png', E.lejos.r);
  const cerca = trozos('cerca', E.cerca), piso = trozos('piso', E.piso), frente = trozos('frente', E.frente);
  const mojado = E.pisoMojado ? trozos('piso_mojado', E.pisoMojado) : [];
  // objetos
  const ob = empacar(E.objetos.map((o) => o.img.r));
  png('objetos.png', ob.atlas);
  out.push({
    nombre: 'objetos.json', bytes: json({
      imagen: 'objetos.png',
      nota: 'x, y: esquina de arriba a la izquierda en pantalla a escala 1 (con la inclinación ya puesta). orden: la profundidad para ordenar con los atletas (se dibuja después de todo atleta con y menor). En Phaser: setDepth(franja.atras + orden). Las caras izquierdas de las cajas (tipo *_cara) van con orden y + 0.1: detrás de quien pasa a su lado.',
      objetos: E.objetos.map((o, i) => ({ id: o.id, tipo: o.tipo, origen: o.origen, cuadro: ob.rects[i], x: o.x, y: o.y, orden: o.orden, superficie: o.superficie })),
    }),
  });
  // vida: cada cuadro en el atlas de vida
  const cuadros = E.vida.flatMap((v) => v.cuadros.map((c) => c.r));
  const vi = empacar(cuadros);
  png('vida.png', vi.atlas);
  let k = 0;
  const vida = E.vida.map((v) => ({ id: v.id, tipo: v.tipo, capa: v.capa, x: v.x, y: v.y, fps: v.fps, velocidad: v.velocidad, cada: v.cada, recorrido: v.recorrido, orden: v.orden, cuadros: v.cuadros.map(() => vi.rects[k++]) }));
  // superficie, colisión, luces y partículas
  png('superficie.png', E.superficie.img);
  out.push({ nombre: 'colision.json', bytes: json(collisionOf(L)) });
  out.push({ nombre: 'luces.json', bytes: json({ hora: L.hora, luces: E.luces }) });
  out.push({ nombre: 'particulas.json', bytes: json({ nota: 'x e y en pixeles de pantalla a escala 1 (y de pantalla = franja.atras + y del mundo). fx: nombre del efecto del catálogo (manifest.fx).', particulas: E.particulas }) });
  // postales
  const pp = puntosPostal(E);
  if (conPostales) for (const [n, x] of Object.entries(pp)) png(`postales/${n}.png`, postal(E, x));
  // ficha y verificación
  if (conFicha) out.push({ nombre: 'ficha_arte.md', bytes: new TextEncoder().encode(fichaMarkdown(E.ficha)) });
  if (verificacion) out.push({ nombre: 'verificacion.md', bytes: new TextEncoder().encode(verificacion) });
  // el escenario: layout validado y cómo va todo
  out.push({
    nombre: 'escenario.json', bytes: json({
      generado_con: 'PixelForja',
      id: L.id, nombre: L.nombre ?? L.id, escala: 1, resolucion: [640, 360],
      franja: L.franja, largo: L.largo, hora: L.hora, clima: L.clima,
      inclinacion: E.inclinacion,
      ancho: E.ancho,
      nota_inclinacion: E.inclinacion ? `vista inclinada: px = x + ${E.inclinacion} * y (lo del fondo queda a la izquierda). Las capas largas miden ${E.ancho} px (largo + ${E.inclinacion} * fondo de la franja). Los objetos ya vienen corridos: corre a los atletas igual.` : undefined,
      capas: {
        cielo: { archivo: `cielo_${L.hora}.png`, y: 0, paralaje: PARALAJE.cielo, repetir_x: true },
        lejos: { archivo: 'lejos.png', y: FT - 30 - E.lejos.h, paralaje: PARALAJE.lejos, repetir_x: true },
        tras_cerca: { nota: 'la vida con capa tras_cerca va aquí: se ve por los callejones' },
        cerca: { archivos: cerca, trozo: TROZO, y: 0, paralaje: PARALAJE.cerca },
        piso: { archivos: piso, trozo: TROZO, y: FT, paralaje: PARALAJE.piso, nota: E.inclinacion ? `las primeras ${D} filas son la franja (inclinada), las de abajo el bordillo: la cara del piso que da a la cámara` : `las primeras ${D} filas son la franja, las de abajo la orilla de enfrente` },
        ...(mojado.length ? { piso_mojado: { archivos: mojado, trozo: TROZO, y: FT, clima: 'aguacero', nota: 'va encima del piso cuando llueve' } } : {}),
        objetos: { archivo: 'objetos.json', nota: 'entre el piso y el frente, ordenados con los atletas' },
        frente: { archivos: frente, trozo: TROZO, y: E.frenteY, paralaje: PARALAJE.frente },
      },
      vida: {
        imagen: 'vida.png', piezas: vida,
        ...(vida.some((v) => v.capa === 'lejos' || v.capa === 'objeto') ? { nota: 'capa cerca y tras_cerca: x, y de pantalla, como siempre. capa lejos: x, y en pixeles de la imagen lejos (que se repite cada su ancho y corre con su paralaje); va de recorrido.desde a recorrido.hasta en recorrido.segundos y vuelve a empezar, adelantada por desfase (0 a 1). capa objeto: va encima de un objeto, con setDepth(franja.atras + orden), como los objetos.' } : {}),
      },
      callejones: E.huecos,
      superficie: { archivo: 'superficie.png', y: FT, leyenda: E.superficie.leyenda },
      colision: 'colision.json', luces: 'luces.json', particulas: 'particulas.json',
      ...(conPostales ? { postales: Object.fromEntries(Object.entries(pp).map(([n, x]) => [n, { archivo: `postales/${n}.png`, x }])) } : {}),
      paleta: NOMBRES.map((n) => ({ nombre: n, hex: E.paleta[n] })),
      ...(conFicha ? { ficha: 'ficha_arte.md' } : {}),
      ...(verificacion ? { verificacion: 'verificacion.md' } : {}),
      layout: L,
    }),
  });
  return out;
}
