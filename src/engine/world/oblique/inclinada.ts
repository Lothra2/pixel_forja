import { grain, bayer, rng } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { depthOf, holeAt, waterAt, type Caja, type Hueco as HuecoLayout, type ObliqueLayout } from './layout';
import { pintorDe, orillaPor } from './piso';

/**
 * La vista inclinada: la misma proyección del piso de la pelea del juego. Lo que está más al fondo se corre a la
 * izquierda:
 *
 *   px = x + k * y      (k = 0.35; y = 0 al fondo de la franja, y = D adelante)
 *   py = franja.atras + y - z
 *
 * La geometría no cambia: solo el dibujo. Todo lo que toca el piso se corre `k * y`. Las cajas son volúmenes: techo en
 * paralelogramo, frente y la cara de la izquierda, que es la que queda a la vista (la luz viene de ese lado).
 */

export const INCLINACION = 0.35;

/** Cuánto se corre a la derecha la fila de fondo `y`. Siempre redondeado igual, así todo calza pixel por pixel. */
export const corre = (k: number, y: number) => Math.round(k * y);

// los tonos de al lado viven en tonos.ts (sin dependencias, así los lugares los usan sin ciclos)
export { MAS_CLARO, MAS_OSCURO } from './tonos';
import { MAS_CLARO, MAS_OSCURO } from './tonos';

/** El nombre de paleta de un pixel, o undefined si está vacío o no es de la paleta. */
export function nombreEn(L: Lienzo, x: number, y: number): Color | undefined {
  if (x < 0 || y < 0 || x >= L.w || y >= L.h) return undefined;
  const i = (y * L.w + x) * 4, d = L.r.data;
  if (!d[i + 3]) return undefined;
  const hx = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  return inversa(L.pal).get(hx);
}
const cacheInv = new WeakMap<Paleta, Map<string, Color>>();
function inversa(p: Paleta) {
  let m = cacheInv.get(p);
  if (!m) { m = new Map(Object.entries(p).map(([k, v]) => [v.toLowerCase(), k as Color])); cacheInv.set(p, m); }
  return m;
}

/** Copia un pixel de un lienzo a otro (con alfa). */
function copia(src: Lienzo, sx: number, sy: number, dst: Lienzo, dx: number, dy: number) {
  if (dx < 0 || dy < 0 || dx >= dst.w || dy >= dst.h) return;
  const i = (sy * src.w + sx) * 4;
  if (!src.r.data[i + 3]) return;
  dst.r.data.set(src.r.data.subarray(i, i + 4), (dy * dst.w + dx) * 4);
}

/**
 * Una pieza dibujada "de techo y frente" (techo de `d` filas y frente de `z`, con `sobre` filas extra arriba) puesta en
 * la vista inclinada: cada fila del techo se corre según su fondo, el frente se corre como la fila de adelante y lo de
 * arriba como la mitad del techo. Devuelve la imagen y cuánto se corre su borde izquierdo (en x de pantalla, desde la x
 * de la caja).
 */
export function volumen(src: Lienzo, sobre: number, d: number, yMundo: number, k: number): { img: Lienzo; dx: number } {
  const base = corre(k, yMundo), extra = corre(k, yMundo + d) - base;
  const img = new Lienzo(src.w + extra, src.h, src.pal);
  for (let r = 0; r < src.h; r++) {
    const s = r < sobre ? corre(k, yMundo + d / 2) - base : r < sobre + d ? corre(k, yMundo + r - sobre) - base : extra;
    for (let x = 0; x < src.w; x++) copia(src, x, r, img, x + s, r);
  }
  return { img, dx: base };
}

/** Lo que tiene pegado una caja a su izquierda, por tramos de fondo: hasta esa altura su cara de ese lado queda tapada. */
export function alLado(b: Caja, todas: Caja[]): { y0: number; y1: number; z: number }[] {
  const x = b.x - 0.5;
  const vecinos = todas.filter((o) => o !== b && x >= o.x && x < o.x + o.w && o.y < b.y + b.d && o.y + o.d > b.y);
  const cortes = [...new Set([b.y, b.y + b.d, ...vecinos.flatMap((o) => [o.y, o.y + o.d])])].filter((y) => y >= b.y && y <= b.y + b.d).sort((p, q) => p - q);
  const tramos: { y0: number; y1: number; z: number }[] = [];
  for (let i = 0; i < cortes.length - 1; i++) {
    const m = (cortes[i] + cortes[i + 1]) / 2;
    tramos.push({ y0: cortes[i], y1: cortes[i + 1], z: Math.min(b.z, Math.max(0, ...vecinos.filter((o) => m >= o.y && m < o.y + o.d).map((o) => o.z))) });
  }
  return tramos;
}

/**
 * La cara de la izquierda de una caja: un paralelogramo entre su borde de atrás y el de adelante, desde lo que tenga
 * pegado (`tramos`) hasta su techo. El material sale de la columna izquierda del frente de la pieza, un tono más claro
 * porque da a la luz. La nariz (el borde de arriba) va con luz y el pie con sombra: en un tramo de escalones esta cara es
 * la contrahuella. Devuelve null si no se ve nada. `dx` y `dy` desde (x de pantalla de la caja, fila del techo atrás).
 */
export function caraIzquierda(src: Lienzo, sobre: number, b: Caja, tramos: { y0: number; y1: number; z: number }[], k: number, alto = b.z): { img: Lienzo; dx: number; dy: number } | null {
  const d = b.d, z = b.z, base = corre(k, b.y);
  const zb = (yy: number) => Math.max(z - alto, tramos.find((t) => b.y + yy >= t.y0 && b.y + yy < t.y1)?.z ?? 0);
  if ([...Array(d).keys()].every((yy) => zb(yy) >= z)) return null;
  const ancho = corre(k, b.y + d) - base + 1, img = new Lienzo(ancho, d + z + 1, src.pal);
  // el material sale del frente: la columna avanza con el fondo, así la cara lleva la misma textura (ladrillo, repello,
  // tablas) sin repetir una sola raya; los bordes del frente (el contorno) no se usan
  const ancho0 = Math.max(1, src.w - 2);
  const material = (yy: number, h: number): Color => {
    const fila = sobre + d + (z - h), c0 = 1 + ((yy * 3) % ancho0);
    return nombreEn(src, c0, fila) ?? nombreEn(src, 1, fila) ?? nombreEn(src, Math.floor(src.w / 2), fila) ?? 'cemento';
  };
  for (let yy = 0; yy < d; yy++) {
    const c = corre(k, b.y + yy) - base, z0 = zb(yy);
    for (let h = z0 + 1; h <= z; h++) {
      const m = material(yy, Math.max(1, h)), fila = yy + (z - h);
      const tono: Color = h === z ? (MAS_CLARO[MAS_CLARO[m]]) : h === z0 + 1 && z - z0 > 2 ? MAS_OSCURO[m] : MAS_CLARO[m];
      img.p(c, fila, tono);
    }
  }
  return { img, dx: 0, dy: 0 };
}

/** El color del piso sin nada encima (para estirar los bordes del mundo, donde no hay pintura). */
export function pisoBase(L: ObliqueLayout, x: number, y: number, s: number, P: Lienzo): Color {
  const W = L.largo, xr = Math.min(W - 1, Math.max(0, x));
  let tipo: (typeof L.piso)[number]['tipo'] = 'asfalto';
  for (const p of L.piso) if (xr >= p.x0 && xr < p.x1 && y >= (p.y0 ?? 0) && y < (p.y1 ?? depthOf(L))) tipo = p.tipo;
  // los patrones repiten cada 960 (múltiplo de 16, 32, 60, 64, 96 y 320): a la izquierda del 0 se toma de más allá
  return pintorDe(L, tipo)(P, x < 0 ? x + 960 : x, y, s);
}

/**
 * El piso pintado derecho (franja de `D` filas y lo de abajo) puesto en la vista inclinada, de `largo + k * D` de ancho.
 * Lo que queda fuera del mundo a los lados se rellena con el piso que sigue. Debajo de la franja va el bordillo: la cara
 * del piso que da a la cámara.
 */
export function cizallarPiso(F: Lienzo, L: ObliqueLayout, k: number, s: number): Lienzo {
  const D = depthOf(L), W = L.largo, Wp = W + corre(k, D), P = new Lienzo(Wp, F.h, F.pal);
  for (let y = 0; y < D; y++) {
    const sy = corre(k, y);
    for (let c = 0; c < Wp; c++) {
      const x = c - sy;
      if (x >= 0 && x < W) copia(F, x, y, P, c, y);
      else P.p(c, y, pisoBase(L, x, y, s, F));
    }
  }
  bordillo(P, L, k, s);
  return P;
}

/** Los temas con bordillo propio, por x de mundo. */
function estiloBordillo(L: ObliqueLayout) {
  const temas = L.ranuras_deco.filter((t) => orillaPor(t.tema));
  return (x: number) => orillaPor(temas.find((t) => x >= t.x0 && x < t.x1)?.tema ?? '') ?? orillaPor(L.paralaje?.cerca ?? '');
}

/**
 * El bordillo de adelante: la cara del piso que da a la cámara, de la fila D hasta el borde de la pantalla. Un canto con
 * luz arriba, la cara del material del piso un poco más oscura con sus juntas (las mismas x que las del piso) y donde
 * hay agua que llega adelante, el agua que sigue.
 */
function bordillo(P: Lienzo, L: ObliqueLayout, k: number, s: number) {
  const D = depthOf(L), sD = corre(k, D), W = L.largo, estilo = estiloBordillo(L);
  for (let c = 0; c < P.w; c++) {
    const x = c - sD, xr = Math.min(W - 1, Math.max(0, x));
    const f = estilo(xr);
    const agua = L.agua.find((a) => xr >= a.x0 && xr < a.x1 && (a.y1 ?? D) >= D);
    for (let y = D; y < P.h; y++) {
      const r = y - D;
      if (agua) {
        if (agua.nivel >= 12) {
          // el río sigue hacia la cámara: más agua, con rayas de corriente que se alargan
          const raya = grain(c >> 3, y, s + 23) < 0.08;
          P.p(c, y, raya ? (grain(c, y, s) < 0.3 ? 'luz' : 'cielo') : bayer(c, y) < 0.36 ? 'azul' : grain(c >> 3, y >> 2, s + 5) < 0.12 ? 'canal' : 'celeste');
          continue;
        }
        // la calle inundada: la línea del agua con espuma sobre el bordillo, y debajo el bordillo mojado
        const nivel = Math.min(P.h - D - 4, Math.max(3, Math.round(agua.nivel / 2)));
        P.p(c, y, r === 0 ? 'luz' : r < 2 ? 'cielo' : r < nivel ? (bayer(c, y) < 0.35 ? 'celeste' : 'canal') : r === nivel ? 'cielo' : bayer(c, y) < 0.3 ? 'canal' : 'asfalto_claro');
        continue;
      }
      if (f) { P.p(c, y, f(P, x < 0 ? x + 960 : x, r, s)); continue; }
      // el bordillo de la calle: canto claro, la cara de concreto con juntas cada 32 y una rejilla de vez en cuando
      const jx = ((x % 32) + 32) % 32;
      let col: Color;
      if (r === 0) col = 'luz';
      else if (r < 3) col = 'cemento_claro';
      else if (r === 3) col = 'cemento';
      else if (jx === 0) col = 'asfalto';
      else {
        const n = grain(x >> 1, r, s + 21);
        col = r > P.h - D - 3 ? 'asfalto' : n < 0.05 ? 'asfalto' : n > 0.96 ? 'cemento_claro' : 'cemento';
        // rejilla del desagüe
        const g = ((x % 288) + 288) % 288;
        if (g > 120 && g < 140 && r > 6 && r < 14) col = (g + r) % 2 ? 'sombra' : 'tinta';
        // mancha de humedad que baja
        if (grain(x >> 3, 0, s + 22) < 0.15 && r > 8 && bayer(c, y) < 0.3) col = 'asfalto_claro';
      }
      P.p(c, y, col);
    }
  }
}

/** Huecos de la misma columna separados por una viga o una baranda: se dibujan como uno solo (abajo no hay piso). */
export function huecosJuntos(L: ObliqueLayout): HuecoLayout[] {
  const D = depthOf(L);
  return [...L.huecos].map((h) => ({ ...h, y0: h.y0 ?? 0, y1: h.y1 ?? D })).sort((p, q) => p.x0 - q.x0 || p.y0! - q.y0!).reduce<HuecoLayout[]>((acc, h) => {
    const u = acc[acc.length - 1];
    if (u && u.x0 === h.x0 && u.x1 === h.x1 && u.caida === h.caida && h.y0! - u.y1! <= 20) acc[acc.length - 1] = { ...u, y1: h.y1 };
    else acc.push({ ...h });
    return acc;
  }, []);
}

/**
 * Un hueco en la vista inclinada, sobre el piso ya cizallado. Se ve la pared del fondo (de frente), la pared del otro
 * lado (la cara izquierda del piso que sigue, inclinada y con luz) y abajo el agua del canal o el vacío entre edificios.
 * Si llega adelante, el corte sigue por el bordillo. Lo que cruza el hueco (una viga, un puentecito) se pinta después.
 */
export function huecoInclinado(P: Lienzo, L: ObliqueLayout, h: HuecoLayout, k: number, s: number) {
  const D = depthOf(L), y0 = h.y0 ?? 0, y1 = h.y1 ?? D, vacio = h.caida === 'vacio', H = vacio ? 60 : 18;
  const R = rng(h.x0 + s), yEnd = y1 >= D ? P.h : y1;
  for (let y = y0; y < yEnd; y++) {
    const yy = Math.min(y, D), sy = corre(k, yy);
    const c0 = h.x0 + sy, c1 = h.x1 + sy;
    for (let c = c0; c < c1; c++) {
      // en el bordillo (y >= D) se ve el corte: el mismo hueco visto de frente
      const fondo = y - y0; // filas desde el borde de atrás
      const cara = c >= h.x1 + corre(k, Math.max(y0, yy - H)) && y < D + 1; // la pared del otro lado
      let col: Color;
      if (cara) {
        const t = c - (h.x1 + corre(k, Math.max(y0, yy - H)));
        col = vacio ? (t === 0 ? 'cemento' : (y + t) % 9 === 0 ? 'asfalto_claro' : 'cemento_claro') : t === 0 ? 'cemento' : grain(c, y, s + 6) < 0.2 ? 'canal' : 'cemento_claro';
      } else if (fondo < H && y < D) {
        // la pared del fondo, de frente: repello con musgo (canal) o la fachada del vecino (vacío)
        const xw = c - (h.x0 + corre(k, y0));
        if (vacio) col = fondo === 0 ? 'luz' : fondo < 2 ? 'cemento' : (xw % 12 > 3 && xw % 12 < 9 && fondo % 14 > 4 && fondo % 14 < 11) ? (grain(xw >> 3, fondo >> 3, s) < 0.25 ? 'oro' : 'asfalto') : bayer(c, y) < fondo / H ? 'asfalto' : 'asfalto_claro';
        else col = fondo === 0 ? 'luz' : fondo < 3 ? 'cemento' : grain(c, y, s + 4) < 0.18 + fondo / 50 ? 'canal' : fondo > H - 4 ? 'verde_oscuro' : 'cemento';
      } else if (vacio) {
        // el vacío: oscuro con ventanitas prendidas allá abajo
        col = grain(c >> 2, y >> 3, s + 3) < 0.05 ? 'oro' : bayer(c, y) < 0.25 ? 'sombra' : 'asfalto';
      } else {
        // el agua del canal: turbia, con el cielo reflejado en rayitas
        const xw = c - corre(k, Math.max(0, yy - H));
        col = grain(xw >> 3, y >> 2, s + 5) < 0.3 && bayer(c, y) < 0.5 ? 'verde_oscuro' : 'canal';
        if (y >= D && y - D < 2) col = 'cielo';
      }
      P.p(c, y, col);
    }
    // el canto del piso a los dos lados del hueco
    if (y < D) { P.p(c0 - 1, y, 'cemento'); }
  }
  if (!vacio) {
    // reflejos y jacintos en el agua
    for (let n = 0; n < ((h.x1 - h.x0) * (yEnd - y0)) / 400; n++) {
      const y = y0 + H + 2 + Math.floor(R() * Math.max(1, yEnd - y0 - H - 4)), c = h.x0 + corre(k, Math.min(y, D)) + 3 + Math.floor(R() * Math.max(1, h.x1 - h.x0 - 14));
      if (y >= y1 && y < D) continue;
      P.hl(c, y, 2 + Math.floor(R() * 4), R() < 0.3 ? 'luz' : 'cielo');
    }
    for (let n = 0; n < Math.max(1, Math.floor((yEnd - y0) / 30)); n++) {
      const y = y0 + H + 6 + Math.floor(R() * Math.max(1, yEnd - y0 - H - 12)), cx = h.x0 + corre(k, Math.min(y, D)) + 6 + Math.floor(R() * Math.max(1, h.x1 - h.x0 - 18));
      if (y >= y1 - 3 && y < D + 3) continue;
      P.d(cx, y + 1, 6, 'verde_oscuro', 0.55); P.d(cx, y, 5, 'verde', 0.55); P.d(cx - 2, y - 1, 2.5, 'menta', 0.6); P.p(cx + 1, y - 3, 'celeste');
    }
  }
  // el borde de atrás del hueco: el canto del piso con luz
  if (y0 > 0) for (let c = h.x0 + corre(k, y0) - 1; c <= h.x1 + corre(k, y0); c++) P.p(c, y0 - 1, 'luz');
  // si el hueco no llega adelante, el borde de adelante es el canto del piso que sigue (o del puentecito)
  if (y1 < D) {
    for (let c = h.x0 + corre(k, y1) - 1; c <= h.x1 + corre(k, y1); c++) { P.p(c, y1, 'luz'); P.p(c, y1 + 1, 'cemento_claro'); }
    // debajo del puentecito el canal sigue: la alcantarilla en el bordillo, con el agua adentro
    if (!vacio) {
      const sD = corre(k, D), c0 = h.x0 + sD + 2, c1 = h.x1 + sD - 2;
      for (let y = D + 5; y < P.h - 1; y++) for (let c = c0; c < c1; c++) P.p(c, y, y === D + 5 || c === c0 || c === c1 - 1 ? 'asfalto' : y > P.h - 9 ? (bayer(c, y) < 0.4 ? 'celeste' : 'canal') : 'sombra');
    }
  }
}

/**
 * Lo que cruza un hueco (una viga, un tablón): se ve su canto de 8 px debajo del techo, de frente, con remaches.
 * El techo ya viene del piso cizallado.
 */
export function cantoSobreHueco(P: Lienzo, F: Lienzo, L: ObliqueLayout, k: number) {
  for (const p of L.piso) {
    const sobre = L.huecos.find((h) => p.x0 >= h.x0 && p.x1 <= h.x1);
    if (!sobre || p.y0 === undefined || p.y1 === undefined) continue;
    // el techo de la viga, otra vez encima del hueco
    for (let y = p.y0; y < p.y1; y++) for (let x = p.x0; x < p.x1; x++) copia(F, x, y, P, x + corre(k, y), y);
    const c0 = p.x0 + corre(k, p.y1);
    for (let r = 0; r < 8; r++) for (let x = 0; x < p.x1 - p.x0; x++) {
      const y = p.y1 + r;
      if (y >= P.h) continue;
      // viga de hierro en I, oxidada: ala de arriba con luz, alma con remaches y el ala de abajo en sombra
      P.p(c0 + x, y, r === 0 ? 'ocre' : r === 1 ? 'terracota' : r === 7 ? 'tinta' : r === 6 ? 'vino' : x % 8 === 3 && (r === 3 || r === 4) ? 'ocre' : grain(c0 + x, y, 3) < 0.15 ? 'vino' : 'terracota');
    }
    // el techo de la viga (lo que se pisa): óxido con chapa estriada, para que se lea encima del vacío
    for (let y = p.y0; y < p.y1; y++) for (let x = p.x0; x < p.x1; x++) P.p(x + corre(k, y), y, y === p.y0 ? 'ocre' : (x + y) % 4 === 0 ? 'ocre' : grain(x, y, 7) < 0.2 ? 'vino' : 'terracota');
    // la cara izquierda del canto (da a la luz)
    for (let y = p.y0; y < p.y1; y++) for (let r = 0; r < 8; r++) P.p(p.x0 + corre(k, y) - 1, y + r, r === 0 ? 'amarillo' : 'ocre');
  }
}

/** La orilla de un agua honda: la cara izquierda de la tierra que sigue a la derecha del agua, como un murito con luz. */
export function orillaAguaHonda(P: Lienzo, L: ObliqueLayout, k: number) {
  const D = depthOf(L), H = 8;
  for (const a of L.agua) {
    if (a.nivel < 12) continue;
    const y0 = a.y0 ?? 0, y1 = a.y1 ?? D;
    for (let y = y0; y < Math.min(D, y1 + H); y++) {
      const ya = Math.max(y0, y - H), ancho = corre(k, Math.min(y, y1 - 1)) - corre(k, ya);
      if (holeAt(L, a.x1, Math.min(y, D - 1)) || waterAt(L, a.x1, Math.min(y, D - 1))) continue;
      for (let t = 0; t <= ancho; t++) P.p(a.x1 + corre(k, ya) + t, y, t === ancho ? 'cemento' : (y + t) % 5 === 0 ? 'ocre' : 'amarillo');
    }
  }
}
