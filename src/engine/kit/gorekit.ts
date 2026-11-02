import { createRaster, type Raster } from '../core/raster';
import { encodePng } from '../export/png';
import type { ExportFile } from '../export/bundle';
import { objeto, pintarObjeto, huellaDe, limpiarCache, type ObjetoDef } from '../gotico/objeto';
import { calidad, fijarCalidad } from '../gotico/render';
import '../gotico/catalogo/gore';
import { LUCES_HORROR, veloSangre, VELO_NIVELES } from '../gotico/catalogo/horror';

/**
 * El kit de sangre, vísceras y horror para el juego: atlas PNG (formato JSON Hash de Phaser, con el ancla de cada
 * cuadro en `anchor`), el velo rojo de pantalla y en el manifiesto lo que el juego necesita de cada asset (grupo,
 * cuadros, fps, si se repite, huella, semillas, luz).
 *
 * Los atlas van de a 60 entradas como mucho (una entrada = un asset en una variante y una semilla, con todos sus
 * cuadros) y ninguna hoja pasa de 4096 px: si no entra, se abre otra hoja.
 */

const MAX_TEX = 4096;
const POR_ATLAS = 60;
const enc = new TextEncoder();

export type GrupoGore = 'decales' | 'pedazos' | 'ambientacion' | 'miedo';
/** Qué va en cada grupo, cuántas semillas por variante y si la animación se repite. */
export const GRUPOS_GORE: Record<GrupoGore, { ids: string[]; semillas: number; uso: string }> = {
  decales: {
    ids: ['gore_salpicadura', 'gore_charco', 'gore_gotas', 'gore_rastro', 'gore_huellas', 'gore_sangre_seca', 'gore_pared_salpicadura', 'gore_pared_chorreado', 'gore_pared_mano'],
    semillas: 3,
    uso: 'Persistentes: capa de suelo (debajo de personajes y objetos, encima del piso), sin sombra ni colisión. Elegir la variante por la superficie de la zona (piedra, tierra, nieve, madera; negro para no muertos, verde para bestias e insectos) y el rumbo del golpe; semilla al azar. gore_charco se reproduce una vez y queda en el último cuadro. Las de pared van pegadas al pie de la cara del muro (x: muro a lo largo de x, cara +y; der: a lo largo de y, cara +x). Para no llenar la memoria: tope de ~150 en el mapa, las más viejas se borran con un fundido de 2 s.',
  },
  pedazos: {
    ids: ['gore_gib_torso', 'gore_gib_brazo', 'gore_gib_pierna', 'gore_gib_costillas', 'gore_gib_craneo', 'gore_gib_tripas', 'gore_gib_astillas', 'gore_gib_trozo', 'gore_reventon'],
    semillas: 3,
    uso: 'Al matar con exceso de daño (overkill): gore_reventon en el centro del monstruo (no se repite) con la paleta de su sangre (rojo humano/demonio, no_muerto, bestia), y 5 a 9 pedazos con física simple: velocidad inicial hacia afuera y arriba (60-160 px/s), gravedad, el cuadro de giro avanza con la velocidad angular (8 cuadros = una vuelta). El ancla es el centro del pedazo; el juego dibuja su sombra en el piso. Al caer: rebote corto, queda en un cuadro al azar y deja una gore_salpicadura en el rumbo en que venía. Se desvanecen a los 20-40 s.',
  },
  ambientacion: {
    ids: ['hor_empalado', 'hor_jaula', 'hor_colgados', 'hor_pila_cadaveres', 'hor_altar', 'hor_mesa_tortura', 'hor_pared_carne', 'hor_nido_huesos', 'hor_crucificado', 'hor_cabezas_picas', 'hor_cuervos_cadaver', 'hor_foso_sangre', 'hor_escritura_sangre'],
    semillas: 2,
    uso: 'Objetos del mapa ordenados por y como el resto; bloquean según `bloquea` y `huella` (celdas de 32x16). Por acto: 1 (pueblo y cementerio) cabezas en picas, cuervos, colgados, empalados viejo; 2 (catacumbas y criptas) jaulas, mesa de tortura, nido de huesos, pila de cadáveres; 3 (catedral profanada) altar, crucificado, escritura de sangre; 4 y 5 (infierno y abismo) pared de carne, foso de sangre, pila quemada, empalados con brasero. Los que tienen luz la declaran en `luz` (y en `luces`).',
  },
  miedo: {
    ids: ['hor_ojos', 'hor_sombra', 'hor_manos', 'hor_susurro'],
    semillas: 1,
    uso: 'Sustos: ojos en zonas sin luz (desaparecen si la heroína se acerca a menos de 4 celdas), sombra que pasa en el borde de la pantalla (una vez, alfa ya horneado), manos que salen del piso cerca de la heroína (una vez, después vuelven a la tierra), susurro como niebla que se arrastra (alfa horneado; dibujar en modo pantalla o normal).',
  },
};
/** Las animaciones que se reproducen una sola vez (el resto se repite). */
const UNA_VEZ = new Set(['gore_charco', 'gore_reventon', 'hor_sombra', 'hor_manos']);
/** Las que llevan el alfa horneado (humo y sombra: el render previo no tiene transparencia). */
const ALFA: Record<string, { max: number; luz?: boolean }> = { hor_sombra: { max: 0.8 }, hor_susurro: { max: 0.85, luz: true } };

export interface GoreKitOpts {
  /** calidad de los render (0 a 3; por omisión 1) */
  calidad?: number;
  /** pocas variantes y una semilla (para pruebas) */
  rapido?: boolean;
  /** solo estos ids */
  ids?: string[];
  progress?: (m: string) => void;
}

interface Entrada { id: string; v: string; seed: number; cuadros: Raster[]; ancla: [number, number] }
/** Recorta los cuadros de una animación a la caja común de lo que tiene pixeles (el ancla se corre igual). */
function recortar(cs: Raster[], ancla: [number, number]): { cuadros: Raster[]; ancla: [number, number] } {
  const w = cs[0].w, h = cs[0].h;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (const c of cs) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (c.data[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { cuadros: cs, ancla };
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  return {
    ancla: [ancla[0] - x0, ancla[1] - y0],
    cuadros: cs.map((c) => { const o = createRaster(W, H); for (let y = 0; y < H; y++) o.data.set(c.data.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x0 + W) * 4), y * W * 4); return o; }),
  };
}
/** Alfa horneado: la sombra o el humo pasan a ser translúcidos, con el borde suavizado. */
function hornearAlfa(r: Raster, max: number, porLuz: boolean): Raster {
  const { w, h } = r, a = new Float32Array(w * h), o = createRaster(w, h);
  for (let i = 0; i < w * h; i++) { if (!r.data[i * 4 + 3]) continue; const l = (r.data[i * 4] * 0.3 + r.data[i * 4 + 1] * 0.5 + r.data[i * 4 + 2] * 0.2) / 255; a[i] = (porLuz ? Math.min(1, 0.25 + l * 4) : 1) * (r.data[i * 4 + 3] / 255); }
  // dos pasadas de caja 3x3: el borde se abre un par de pixeles
  let b = a;
  for (let k = 0; k < 2; k++) {
    const n = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; s += b[Y * w + X]; c++; } n[y * w + x] = s / c; }
    b = n;
  }
  for (let i = 0; i < w * h; i++) {
    const al = Math.min(a[i] || b[i], b[i]) * max;
    if (al < 0.01) continue;
    // donde no había pixel se toma el color del vecino (el humo es parejo, la sombra casi negra)
    const src = r.data[i * 4 + 3] ? i : -1;
    o.data[i * 4] = src >= 0 ? r.data[i * 4] : porLuz ? 40 : 4; o.data[i * 4 + 1] = src >= 0 ? r.data[i * 4 + 1] : porLuz ? 46 : 4; o.data[i * 4 + 2] = src >= 0 ? r.data[i * 4 + 2] : porLuz ? 54 : 6;
    o.data[i * 4 + 3] = Math.round(al * 255);
  }
  return o;
}

/** Hojas de atlas de a lo sumo 60 entradas y 4096 px: cada entrada es un bloque con sus cuadros en filas. */
function empacar(es: Entrada[], nombre: string) {
  const hojas: { png: Raster; json: Record<string, unknown>; archivo: string }[] = [];
  const pendientes = [...es].sort((a, b) => b.cuadros[0].h - a.cuadros[0].h);
  while (pendientes.length) {
    const lote: { e: Entrada; x: number; y: number; cols: number }[] = [];
    let x = 0, y = 0, alto = 0, ancho = 0;
    for (let i = 0; i < pendientes.length && lote.length < POR_ATLAS;) {
      const e = pendientes[i], w = e.cuadros[0].w + 1, h = e.cuadros[0].h + 1;
      const cols = Math.max(1, Math.min(e.cuadros.length, Math.floor(MAX_TEX / w))), bw = cols * w, bh = Math.ceil(e.cuadros.length / cols) * h;
      if (x + bw > MAX_TEX) { x = 0; y += alto; alto = 0; }
      if (y + bh > MAX_TEX) { if (!lote.length) throw new Error(`${e.id} no entra en ${MAX_TEX} px`); break; }
      lote.push({ e, x, y, cols }); x += bw; alto = Math.max(alto, bh); ancho = Math.max(ancho, x);
      pendientes.splice(i, 1);
    }
    const H = y + alto, png = createRaster(ancho, H), frames: Record<string, unknown> = {};
    for (const { e, x: bx, y: by, cols } of lote) e.cuadros.forEach((c, f) => {
      const px = bx + (f % cols) * (c.w + 1), py = by + Math.floor(f / cols) * (c.h + 1);
      for (let yy = 0; yy < c.h; yy++) png.data.set(c.data.subarray(yy * c.w * 4, (yy + 1) * c.w * 4), ((py + yy) * ancho + px) * 4);
      frames[`${e.id}/${e.v}/${e.seed}/${f}`] = { frame: { x: px, y: py, w: c.w, h: c.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: c.w, h: c.h }, sourceSize: { w: c.w, h: c.h }, anchor: { x: +(e.ancla[0] / c.w).toFixed(4), y: +(e.ancla[1] / c.h).toFixed(4) }, ancla: e.ancla };
    });
    const archivo = `gore_horror/${nombre}${hojas.length ? `_${hojas.length + 1}` : ''}`;
    hojas.push({ png, archivo, json: { frames, meta: { app: 'PixelForja', image: `${archivo.split('/').pop()}.png`, format: 'RGBA8888', size: { w: ancho, h: H }, scale: '1' } } });
  }
  return hojas;
}

/** Arma el kit. Devuelve los archivos (rutas relativas a la carpeta del kit) y la parte del manifiesto. */
export function exportarGoreHorror(o: GoreKitOpts = {}): { files: ExportFile[]; manifest: Record<string, unknown> } {
  const log = o.progress ?? (() => {});
  const antes = calidad();
  fijarCalidad(o.calidad ?? 1);
  const files: ExportFile[] = [];
  const assets: Record<string, unknown> = {}, atlas: Record<string, string[]> = {};
  try {
    for (const [grupo, def] of Object.entries(GRUPOS_GORE) as [GrupoGore, (typeof GRUPOS_GORE)[GrupoGore]][]) {
      const ids = def.ids.filter((id) => !o.ids || o.ids.includes(id));
      if (!ids.length) continue;
      const es: Entrada[] = [];
      for (const id of ids) {
        const d: ObjetoDef = objeto(id), vs = o.rapido ? d.variantes.slice(0, 2) : d.variantes, sem = o.rapido ? 1 : def.semillas, n = d.cuadros ?? 1;
        for (const v of vs) for (let s = 1; s <= sem; s++) {
          const rs = Array.from({ length: n }, (_, f) => pintarObjeto(id, v, f, s));
          let { cuadros, ancla } = recortar(rs.map((r) => r.img), rs[0].ancla);
          const al = ALFA[id];
          if (al) cuadros = cuadros.map((c) => hornearAlfa(c, al.max, !!al.luz));
          es.push({ id, v, seed: s, cuadros, ancla });
        }
        const luces = LUCES_HORROR.filter((l) => l.id === id);
        assets[id] = {
          grupo, nombre: d.nombre, variantes: vs, semillas: Array.from({ length: sem }, (_, i) => i + 1), cuadros: n, fps: +(25 / (d.t ?? 4)).toFixed(2), loop: n > 1 && !UNA_VEZ.has(id),
          plano: !!d.plano, bloquea: !!d.bloquea, huella: Object.fromEntries(vs.map((v) => [v, huellaDe(d, v)])),
          cuadro: `${id}/<variante>/<semilla>/<cuadro>`, ...(ALFA[id] ? { alfa_horneado: true } : {}), ...(luces.length ? { luz: luces } : {}),
        };
        limpiarCache();
        log(`gore_horror: ${id} (${vs.length} variantes × ${sem} semillas × ${n} cuadros)`);
      }
      const hojas = empacar(es, grupo);
      atlas[grupo] = [];
      for (const h of hojas) {
        files.push({ name: `${h.archivo}.png`, bytes: encodePng(h.png), mime: 'image/png' });
        files.push({ name: `${h.archivo}.json`, bytes: enc.encode(JSON.stringify(h.json)), mime: 'application/json' });
        atlas[grupo].push(`${h.archivo}.json`);
      }
      for (const id of ids) (assets[id] as Record<string, unknown>).atlas = [...new Set(hojas.filter((h) => Object.keys(h.json.frames as object).some((k) => k.startsWith(id + '/'))).map((h) => `${h.archivo}.json`))];
    }
  } finally { fijarCalidad(antes); }
  // el velo rojo de la pantalla
  const velo: Record<string, unknown> = {};
  if (!o.ids) for (const n of VELO_NIVELES) { const a = `gore_horror/velo_sangre_${n}.png`, r = veloSangre(n); files.push({ name: a, bytes: encodePng(r), mime: 'image/png' }); velo[n] = { archivo: a, w: r.w, h: r.h }; }
  const manifest = {
    atlas, assets, luces: LUCES_HORROR,
    ...(Object.keys(velo).length ? { velo_sangre: { niveles: velo, uso: 'Capa de pantalla entera encima de todo (debajo del HUD), con alfa propio. Nivel 1 con vida < 40 %, 2 con < 25 %, 3 con < 12 %; cruzar los niveles con un fundido de 0.4 s y hacerlo latir (alfa 0.85-1.0) al ritmo del corazón cuando está en 3.' } } : {}),
    grupos: Object.fromEntries(Object.entries(GRUPOS_GORE).map(([k, v]) => [k, v.uso])),
    notas: 'Atlas JSON Hash de Phaser: this.load.atlas(clave, png, json). Cada cuadro se llama <id>/<variante>/<semilla>/<cuadro> y trae `anchor` (ancla normalizada: setOrigin) y `ancla` en px; el ancla es el punto del piso donde se apoya el asset (en los pedazos, su centro). Luces: color, radio en px, intensidad 0-1, parpadeo 0-1 con su ritmo (vela, brasa, latido, ojos), centro en unidades del mundo y `pantalla` en px desde el ancla: el juego pone ahí una luz que ilumina y hace sombra.',
  };
  return { files, manifest };
}
