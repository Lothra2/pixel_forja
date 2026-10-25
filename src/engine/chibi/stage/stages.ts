import { zipSync } from 'fflate';
import { createRaster, type Raster } from '../../core/raster';
import { encodePng, encodePngPaleta } from '../../export/png';
import { asset, pintarAsset } from './assets';

/**
 * Escenarios por capas: cada capa tiene su parallax y sus elementos (un asset con variante, posición y semilla).
 * La posición es del ancla del asset (centro de abajo). Los fondos y pisos ocupan todo el ancho.
 * El escenario se pinta a cualquier tiempo y con la cámara corrida; se exporta como paquete para juegos.
 */

export interface Elemento { id: string; v: string; x: number; y: number; seed?: number; espejo?: boolean; desfase?: number }
export interface CapaEsc { nombre: string; parallax: number; elementos: Elemento[] }
export interface Escenario {
  id: string;
  nombre: [string, string];
  w: number; h: number;
  /** Línea del piso donde pisan los muñecos. */
  piso: number;
  capas: CapaEsc[];
}

export const NOMBRES_CAPA = ['fondo', 'lejos', 'medio', 'piso', 'frente'];

const E = (id: string, v: string, x: number, y: number, extra: Partial<Elemento> = {}): Elemento => ({ id, v, x, y, ...extra });

/** Los escenarios listos: muelle, casas de la familia, ciudades y deporte. Ancho 480, alto 180, piso en 156 (para muñecos de 32). */
export function escenarios(): Escenario[] {
  // se escriben con el alto viejo de 270 y se bajan 72 px: el muñeco ocupa un sexto de la pantalla, como en el video
  return escenarios270().map((e) => ({
    ...e, h: 180, piso: e.piso - 72,
    capas: e.capas.map((c) => ({ ...c, elementos: c.elementos.map((el) => ({ ...el, y: el.id === 'cielo' ? 180 : el.y - 72 })) })),
  }));
}
function escenarios270(): Escenario[] {
  const W = 480, Hh = 270, P = 228;
  const fondo = (cielo: string, extra: Elemento[] = []): CapaEsc => ({ nombre: 'fondo', parallax: 0.1, elementos: [E('cielo', cielo, W / 2, 160), ...extra] });
  return [
    {
      id: 'muelle', nombre: ['Muelle venezolano', 'Venezuelan dock'], w: W, h: Hh, piso: P,
      capas: [
        fondo('dia', [E('montana', 'avila', W / 2, 186)]),
        { nombre: 'lejos', parallax: 0.3, elementos: [E('mar', 'dia', W / 2, 232), E('ave', 'pelicano', 120, 70), E('ave', 'gaviota', 330, 54, { desfase: 2 }), E('barco', 'penero', 400, 196, { seed: 3 })] },
        { nombre: 'medio', parallax: 0.7, elementos: [E('barco', 'grande', 110, 206, { seed: 2 }), E('calle', 'bandera_ve', 230, 182), E('muelle', 'poste', 300, 196), E('muelle', 'poste', 470, 196)] },
        { nombre: 'piso', parallax: 1, elementos: [E('piso', 'muelle', W / 2, Hh), E('muelle', 'barril', 400, P), E('muelle', 'barril', 416, P), E('muelle', 'caja', 432, P), E('muelle', 'bita', 60, P + 6), E('muelle', 'bita', 250, P + 6)] },
        { nombre: 'frente', parallax: 1.25, elementos: [E('muelle', 'bita', 150, Hh - 4), E('muelle', 'bita', 370, Hh - 4), E('muelle', 'salvavidas', 20, Hh - 12)] },
      ],
    },
    {
      id: 'cocina_rosita', nombre: ['La cocina de Rosita (Baruta)', "Rosita's kitchen (Baruta)"], w: W, h: Hh, piso: P,
      capas: [
        { nombre: 'fondo', parallax: 0.2, elementos: [E('pared', 'cocina', W / 2, P)] },
        { nombre: 'medio', parallax: 0.8, elementos: [E('adentro', 'ventana', 150, 178), E('adentro', 'cuadro', 300, 168), E('adentro', 'cuadro', 340, 174), E('adentro', 'nevera', 40, P), E('adentro', 'cocina', 90, P), E('adentro', 'meson', 150, P), E('arbol', 'matera', 200, P)] },
        { nombre: 'piso', parallax: 1, elementos: [E('piso', 'baldosa', W / 2, Hh), E('adentro', 'mesa', 330, P), E('adentro', 'silla', 300, P), E('adentro', 'silla', 362, P, { espejo: true }), E('animal', 'gato', 420, P)] },
        { nombre: 'frente', parallax: 1.2, elementos: [] },
      ],
    },
    {
      id: 'patio_abuela', nombre: ['El patio de la abuela', "Grandma's patio"], w: W, h: Hh, piso: P,
      capas: [
        fondo('tarde', [E('montana', 'avila', W / 2, 190)]),
        { nombre: 'lejos', parallax: 0.4, elementos: [E('casa', 'colonial', 90, 196, { seed: 4 }), E('casa', 'quinta', 360, 196, { seed: 2 })] },
        { nombre: 'medio', parallax: 0.75, elementos: [E('pared', 'patio', W / 2, 212), E('arbol', 'mango', 60, 214), E('arbol', 'araguaney', 420, 214)] },
        { nombre: 'piso', parallax: 1, elementos: [E('piso', 'patio', W / 2, Hh), E('adentro', 'hamaca', 240, P - 4), E('arbol', 'matera', 150, P), E('arbol', 'matera', 168, P, { seed: 3 }), E('animal', 'gallina', 350, P), E('adentro', 'silla', 300, P)] },
        { nombre: 'frente', parallax: 1.2, elementos: [E('arbol', 'arbusto', 30, Hh), E('arbol', 'arbusto', 460, Hh, { seed: 3 })] },
      ],
    },
    {
      id: 'caracas', nombre: ['Caracas', 'Caracas'], w: W, h: Hh, piso: P,
      capas: [
        fondo('dia', [E('montana', 'avila', W / 2, 150)]),
        { nombre: 'lejos', parallax: 0.35, elementos: [E('ciudad', 'caracas', W / 2, 196)] },
        { nombre: 'medio', parallax: 0.7, elementos: [E('casa', 'tienda', 60, 210, { seed: 1 }), E('casa', 'edificio', 140, 210, { seed: 5 }), E('casa', 'colonial', 230, 210, { seed: 8 }), E('kiosko', 'normal', 320, 210), E('arbol', 'araguaney', 400, 212), E('casa', 'colonial', 460, 210, { seed: 3 })] },
        { nombre: 'piso', parallax: 1, elementos: [E('piso', 'calle', W / 2, Hh), E('calle', 'farol', 100, 218), E('calle', 'farol', 380, 218), E('vehiculo', 'buseta', 200, 256), E('animal', 'paloma', 280, 220)] },
        { nombre: 'frente', parallax: 1.3, elementos: [E('vehiculo', 'carro', 420, Hh, { seed: 7 })] },
      ],
    },
    {
      id: 'ho_chi_minh', nombre: ['Ho Chi Minh', 'Ho Chi Minh City'], w: W, h: Hh, piso: P,
      capas: [
        fondo('tarde'),
        { nombre: 'lejos', parallax: 0.35, elementos: [E('ciudad', 'hcm', W / 2, 196)] },
        { nombre: 'medio', parallax: 0.7, elementos: [E('casa', 'tubo', 40, 212, { seed: 1 }), E('casa', 'tubo', 72, 212, { seed: 4 }), E('casa', 'tubo', 104, 212, { seed: 6 }), E('arbol', 'palma', 160, 214), E('casa', 'tubo', 380, 212, { seed: 2 }), E('casa', 'tubo', 412, 212, { seed: 7 }), E('casa', 'tubo', 444, 212, { seed: 9 }), E('calle', 'farolitos', 240, 150), E('calle', 'poste', 300, 214)] },
        { nombre: 'piso', parallax: 1, elementos: [E('piso', 'calle', W / 2, Hh), E('calle', 'puesto', 230, 220), E('vehiculo', 'moto', 120, 250, { seed: 3 }), E('vehiculo', 'moto', 330, 256, { seed: 8 }), E('calle', 'bandera_vn', 460, 218)] },
        { nombre: 'frente', parallax: 1.3, elementos: [E('vehiculo', 'moto', 40, Hh, { seed: 5 })] },
      ],
    },
    {
      id: 'bogota', nombre: ['Bogotá', 'Bogotá'], w: W, h: Hh, piso: P,
      capas: [
        fondo('nublado', [E('montana', 'monserrate', W / 2, 160)]),
        { nombre: 'lejos', parallax: 0.35, elementos: [E('ciudad', 'bogota', W / 2, 196)] },
        { nombre: 'medio', parallax: 0.7, elementos: [E('casa', 'colonial', 70, 212, { seed: 10 }), E('casa', 'colonial', 150, 212, { seed: 12 }), E('casa', 'tienda', 240, 212, { seed: 3 }), E('casa', 'colonial', 330, 212, { seed: 14 }), E('arbol', 'pino', 420, 214)] },
        { nombre: 'piso', parallax: 1, elementos: [E('piso', 'calle', W / 2, Hh), E('vehiculo', 'transmilenio', 200, 258), E('calle', 'bandera_co', 440, 218), E('animal', 'paloma', 100, 222), E('animal', 'paloma', 112, 224, { desfase: 1 })] },
        { nombre: 'frente', parallax: 1.3, elementos: [E('vehiculo', 'bicicleta', 450, Hh)] },
      ],
    },
    {
      id: 'cancha', nombre: ['Cancha de fútbol', 'Football pitch'], w: W, h: Hh, piso: P,
      capas: [
        fondo('dia'),
        { nombre: 'lejos', parallax: 0.4, elementos: [E('deporte', 'gradas', 90, 196), E('deporte', 'gradas', 250, 196, { seed: 9 }), E('deporte', 'gradas', 410, 196, { seed: 4 }), E('deporte', 'marcador', 250, 150)] },
        { nombre: 'medio', parallax: 0.8, elementos: [E('deporte', 'arco', 20, 222), E('deporte', 'arco', 460, 222, { espejo: true }), E('calle', 'bandera_ve', 180, 200), E('deporte', 'banderin', 470, 226)] },
        { nombre: 'piso', parallax: 1, elementos: [E('piso', 'cancha', W / 2, Hh), E('deporte', 'balon', 250, P)] },
        { nombre: 'frente', parallax: 1.2, elementos: [E('deporte', 'cono', 120, Hh - 6), E('deporte', 'cono', 380, Hh - 6)] },
      ],
    },
    {
      id: 'piscina', nombre: ['Piscina', 'Pool'], w: W, h: Hh, piso: P,
      capas: [
        fondo('dia'),
        { nombre: 'lejos', parallax: 0.4, elementos: [E('deporte', 'gradas', 130, 180, { seed: 6 }), E('deporte', 'gradas', 330, 180, { seed: 2 }), E('arbol', 'palma', 450, 196)] },
        { nombre: 'medio', parallax: 0.8, elementos: [E('deporte', 'trampolin', 40, 218)] },
        { nombre: 'piso', parallax: 1, elementos: [E('piso', 'piscina', W / 2, Hh)] },
        { nombre: 'frente', parallax: 1.2, elementos: [] },
      ],
    },
    {
      id: 'pista', nombre: ['Pista de atletismo', 'Running track'], w: W, h: Hh, piso: P,
      capas: [
        fondo('dia', [E('montana', 'lejanas', W / 2, 180)]),
        { nombre: 'lejos', parallax: 0.4, elementos: [E('deporte', 'gradas', 90, 196, { seed: 3 }), E('deporte', 'gradas', 250, 196, { seed: 7 }), E('deporte', 'gradas', 410, 196, { seed: 11 })] },
        { nombre: 'medio', parallax: 0.8, elementos: [E('calle', 'bandera_ve', 40, 214), E('calle', 'bandera_co', 70, 214), E('calle', 'bandera_vn', 100, 214)] },
        { nombre: 'piso', parallax: 1, elementos: [E('piso', 'pista', W / 2, Hh), E('deporte', 'valla', 200, P + 10), E('deporte', 'valla', 330, P + 10)] },
        { nombre: 'frente', parallax: 1.2, elementos: [] },
      ],
    },
  ];
}

/** Dibuja un raster dentro de otro (con alfa simple), opcionalmente espejado. */
export function pegarRaster(dst: Raster, src: Raster, x0: number, y0: number, espejo = false): void {
  for (let y = 0; y < src.h; y++) {
    const ty = y0 + y;
    if (ty < 0 || ty >= dst.h) continue;
    for (let x = 0; x < src.w; x++) {
      const tx = x0 + x;
      if (tx < 0 || tx >= dst.w) continue;
      const si = (y * src.w + (espejo ? src.w - 1 - x : x)) * 4;
      const a = src.data[si + 3];
      if (!a) continue;
      const di = (ty * dst.w + tx) * 4;
      if (a === 255) { dst.data[di] = src.data[si]; dst.data[di + 1] = src.data[si + 1]; dst.data[di + 2] = src.data[si + 2]; dst.data[di + 3] = 255; }
      else { const t = a / 255; for (let k = 0; k < 3; k++) dst.data[di + k] = Math.round(dst.data[di + k] * (1 - t) + src.data[si + k] * t); dst.data[di + 3] = Math.max(dst.data[di + 3], a); }
    }
  }
}

/** El cuadro del elemento a un tiempo dado (en ticks de 60 por segundo). */
export function cuadroElemento(e: Elemento, tick: number, anchoEsc: number): Raster {
  const a = asset(e.id);
  const f = Math.floor(tick / a.t) + (e.desfase ?? 0);
  return pintarAsset(e.id, e.v, f, a.ancho ? anchoEsc : 0, e.seed ?? 1);
}
export function animado(e: Elemento): boolean { return asset(e.id).cuadros > 1; }

/** Pinta una capa entera (o el escenario) en un raster del tamaño del escenario. */
export function pintarCapa(esc: Escenario, capa: CapaEsc, tick: number, dst?: Raster, cam = 0): Raster {
  const out = dst ?? createRaster(esc.w, esc.h);
  const dx = -Math.round(cam * capa.parallax);
  for (const e of capa.elementos) {
    const img = cuadroElemento(e, tick, esc.w);
    pegarRaster(out, img, Math.round(e.x - img.w / 2) + dx, Math.round(e.y - img.h), e.espejo);
  }
  return out;
}
export function pintarEscenario(esc: Escenario, tick = 0, cam = 0, hasta?: string): Raster {
  const out = createRaster(esc.w, esc.h);
  for (let i = 0; i < out.data.length; i += 4) out.data.set([90, 168, 240, 255], i);
  for (const c of esc.capas) { pintarCapa(esc, c, tick, out, cam); if (c.nombre === hasta) break; }
  return out;
}

/**
 * El paquete del escenario para juegos: por capa, una imagen con todo lo quieto y una tira por cada elemento que se
 * mueve; escenario.json con el parallax, la línea del piso y dónde va cada cosa. Más una vista previa armada.
 */
export function paqueteEscenario(esc: Escenario): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const json: { formato: string; version: number; id: string; nombre: [string, string]; w: number; h: number; piso: number; ticks_por_segundo: number; capas: unknown[] } = {
    formato: 'pixelforja-escenario', version: 1, id: esc.id, nombre: esc.nombre, w: esc.w, h: esc.h, piso: esc.piso, ticks_por_segundo: 60, capas: [],
  };
  esc.capas.forEach((c, ci) => {
    const quietos = createRaster(esc.w, esc.h);
    const anim: unknown[] = [];
    c.elementos.forEach((e, ei) => {
      if (!animado(e)) { const img = cuadroElemento(e, 0, esc.w); pegarRaster(quietos, img, Math.round(e.x - img.w / 2), Math.round(e.y - img.h), e.espejo); return; }
      const a = asset(e.id);
      const frames = Array.from({ length: a.cuadros }, (_, f) => cuadroElemento({ ...e, desfase: (e.desfase ?? 0) + f }, 0, esc.w));
      const w = frames[0].w, h = frames[0].h;
      const tira = createRaster(w * frames.length, h);
      frames.forEach((fr, i) => pegarRaster(tira, fr, i * w, 0, e.espejo));
      const nombre = `capas/${ci}_${c.nombre}_${ei}_${e.id}_${e.v}.png`;
      files[nombre] = encodePngPaleta(tira);
      anim.push({ archivo: nombre, x: Math.round(e.x - w / 2), y: Math.round(e.y - h), w, h, cuadros: frames.length, t: a.t });
    });
    const nombreQ = `capas/${ci}_${c.nombre}.png`;
    files[nombreQ] = encodePngPaleta(quietos);
    json.capas.push({ nombre: c.nombre, parallax: c.parallax, quietos: nombreQ, animados: anim });
  });
  files['escenario.json'] = new TextEncoder().encode(JSON.stringify(json, null, 1));
  files['vista_previa.png'] = encodePng(pintarEscenario(esc));
  files['LEEME.txt'] = new TextEncoder().encode('Escenario de PixelForja.\nDibuja las capas en orden. Cada capa se corre con la cámara multiplicada por su parallax (1 = se mueve con el piso).\nLos animados son tiras horizontales: cuadro = floor(tick / t) % cuadros, con 60 ticks por segundo.\nEl piso (escenario.json.piso) es la línea donde pisan los muñecos.\n');
  return zipSync(files, { level: 6 });
}
