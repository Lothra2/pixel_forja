import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { depthOf, type ObliqueLayout, type TipoPiso } from './layout';

/**
 * Piso en vista oblicua, por tipo. La imagen va de la fila `franja.atras` hasta el borde de abajo de la pantalla:
 * las primeras `D` filas son la franja jugable y las de abajo la orilla de enfrente (cuneta, bordillo y acera), que no
 * se pisa. Los patrones usan las coordenadas de mundo, así los trozos de 1280 pegan sin costura.
 */

export const ORILLA = 30; // filas debajo de la franja hasta el borde de 360

type Pintor = (L: Lienzo, x: number, y: number, seed: number) => Color;

const g = grain;

/** Losas de concreto con juntas, desgaste de ruedas y piedritas: el piso de los hẻm. Claro, para que el atleta resalte. */
const asfalto: Pintor = (_L, x, y, s) => {
  const slab = Math.floor(x / 96), jx = x % 96;
  if (jx === 0) return 'asfalto';
  if (jx === 1) return g(x, y, s) < 0.6 ? 'cemento' : 'asfalto_claro';
  if (y === 77 && x % 6 < 4) return 'asfalto';
  // losas un poco más oscuras o más gastadas
  const tono = g(slab, 0, s + 1);
  if (tono < 0.3 && bayer(x, y) < 0.09) return 'asfalto';
  if (tono > 0.75 && bayer(x + 2, y + 1) < 0.07) return 'cemento';
  // por donde pasan las motos el concreto se pule
  const rueda = Math.min(Math.abs(y - 50), Math.abs(y - 108));
  if (rueda < 4 && bayer(x, y) < 0.12 - rueda * 0.025) return 'cemento';
  // piedritas en bloques de 2 x 1
  const n = g(x >> 1, y, s + slab);
  if (n < 0.012) return 'asfalto';
  if (n > 0.988) return 'cemento';
  return 'asfalto_claro';
};

/** Baldosas de acera de 16 x 8 en hilera trabada, gastadas, con alguna rota o cambiada. */
const acera: Pintor = (_L, x, y, s) => {
  const row = Math.floor(y / 8), off = row % 2 ? 8 : 0, col = Math.floor((x + off) / 16);
  const jx = (x + off) % 16, jy = y % 8;
  if (jy === 7 || jx === 15) return 'cemento';
  const t = g(col, row, s);
  if (t < 0.025) return jy === 0 ? 'salmon' : 'terracota';
  if (t > 0.97 && jx + jy === 9) return 'cemento';
  if (jy === 0 && jx < 14) return t < 0.2 ? 'cemento_claro' : 'crema';
  if (t < 0.2 && bayer(x, y) < 0.12) return 'cemento';
  return g(x >> 1, y, s + 3) < 0.015 ? 'cemento' : 'cemento_claro';
};

/** Tierra apisonada: manchones más oscuros, piedritas y matas de pasto sueltas. */
const tierra: Pintor = (_L, x, y, s) => {
  if (g(x >> 3, y >> 2, s + 4) < 0.1 && g(x, y, s + 5) < 0.6) return (x + y) % 3 ? 'verde' : 'verde_oscuro';
  const n = g(x, y, s);
  if (n < 0.04) return 'terracota';
  if (n > 0.97) return 'crema';
  return g(x >> 2, y >> 1, s + 1) < 0.3 && bayer(x, y) < 0.5 ? 'terracota' : n > 0.85 ? 'amarillo' : 'ocre';
};
const arena: Pintor = (_L, x, y, s) => { const n = g(x, y, s); return n < 0.06 ? 'ocre' : n > 0.9 ? 'luz' : 'crema'; };
const pasto: Pintor = (_L, x, y, s) => { const n = g(x, y, s); return n < 0.1 ? 'verde_oscuro' : n > 0.92 ? 'menta' : 'verde'; };
const greda: Pintor = (_L, x, y, s) => { const n = g(x >> 1, y, s); return n < 0.1 ? 'vino' : n > 0.9 ? 'salmon' : 'terracota'; };
const madera: Pintor = (_L, x, y, s) => { const b = Math.floor(y / 5); const jy = y % 5; const jx = (x + b * 37) % 48; return jy === 4 || jx === 0 ? 'terracota' : g(x >> 2, y, s) < 0.12 ? 'terracota' : jy === 0 ? 'amarillo' : 'ocre'; };
/** Baldosa de 16 x 8 con su junta: casi todas iguales, alguna más clara y alguna gastada. */
const baldosa: Pintor = (_L, x, y, s) => {
  const jx = x % 16, jy = y % 8;
  if (jy === 7 || jx === 15) return 'cemento';
  const t = g(Math.floor(x / 16), Math.floor(y / 8), s + 11);
  if (t < 0.12) return jy === 0 || jx === 0 ? 'luz' : 'crema';
  if (t > 0.94 && bayer(x, y) < 0.25) return 'cemento';
  return jy === 0 && jx < 14 ? 'crema' : 'cemento_claro';
};
/** Lámina de zinc: ondas que corren hacia el fondo, juntas cada 60 y manchas de óxido. */
const metal: Pintor = (_L, x, y, s) => {
  if (x % 60 === 0) return 'asfalto_claro';
  // óxido que chorrea a lo largo de algunas ondas
  if (g(x >> 2, y >> 4, s + 7) < 0.05 && g(x, y, s) < 0.6) return x % 4 === 1 ? 'ocre' : 'terracota';
  const k = x % 4;
  return k === 0 ? 'cemento' : k === 1 ? 'luz' : 'cemento_claro';
};
const tatami: Pintor = (_L, x, y) => (x % 48 === 0 || y % 24 === 0 ? 'verde_oscuro' : (x + y) % 2 ? 'menta' : 'verde');
/** Pista de atletismo: tartán rojo con las líneas blancas de los carriles cada 16 filas. */
const cancha: Pintor = (_L, x, y, s) => {
  if (y % 16 === 0) return 'luz';
  const n = g(x >> 1, y, s + 2);
  return n < 0.05 ? 'vino' : n > 0.96 ? 'salmon' : 'terracota';
};
const agua: Pintor = (_L, x, y, s) => (bayer(x, y) < 0.3 && g(x >> 2, y, s) < 0.6 ? 'celeste' : 'canal');

export const PINTORES: Record<TipoPiso, Pintor> = { asfalto, acera, tierra, baldosa, madera, metal, arena, tatami, greda, cancha, pasto, agua };

/** Una grieta que camina con su rama. */
function grieta(L: Lienzo, x: number, y: number, len: number, R: () => number) {
  let cx = x, cy = y;
  for (let i = 0; i < len; i++) {
    L.p(Math.round(cx), Math.round(cy), 'asfalto');
    cx += 1; cy += R() < 0.5 ? (R() < 0.5 ? -1 : 1) * 0.6 : 0;
    if (R() < 0.08) grieta(L, cx, cy, Math.floor(len / 3), R);
  }
}

/** Tapa de alcantarilla redonda vista desde arriba (aplastada a la mitad). */
function tapa(L: Lienzo, cx: number, cy: number) {
  L.d(cx, cy, 7, 'sombra', 0.5); L.d(cx, cy, 6, 'asfalto', 0.5);
  for (let i = -4; i <= 4; i += 2) L.hl(cx - 4, cy + Math.round(i / 2), 9, 'sombra');
  L.p(cx - 3, cy - 2, 'cemento');
}

/** Rejilla de desagüe. */
function rejilla(L: Lienzo, x: number, y: number) {
  L.f(x, y, 12, 4, 'sombra');
  for (let i = 1; i < 12; i += 2) L.vl(x + i, y, 4, 'tinta');
  L.hl(x, y, 12, 'cemento');
}

export interface PisoOpts { seed?: number }

/** Pinta el piso del layout completo: franja y orilla de enfrente. Devuelve un lienzo de largo x (D + ORILLA). */
export function pintarPiso(pal: Paleta, L: ObliqueLayout, o: PisoOpts = {}): Lienzo {
  const s = o.seed ?? 3, D = depthOf(L), W = L.largo, H = D + ORILLA;
  const P = new Lienzo(W, H, pal);
  // 1. cada tipo en su rango, el último manda
  for (const p of L.piso) {
    const f = PINTORES[p.tipo];
    for (let y = p.y0 ?? 0; y < (p.y1 ?? D); y++) for (let x = p.x0; x < p.x1; x++) P.p(x, y, f(P, x, y, s));
  }
  // 2. bordes de acera: donde una acera termina y empieza otro piso, el bordillo con su sombra
  for (const p of L.piso.filter((q) => q.tipo === 'acera')) {
    const y1 = p.y1 ?? D;
    if (y1 < D) for (let x = p.x0; x < p.x1; x++) { P.p(x, y1 - 1, 'luz'); P.p(x, y1, 'cemento'); P.p(x, y1 + 1, g(x, 0, s) < 0.6 ? 'asfalto' : 'asfalto_claro'); }
    if ((p.y0 ?? 0) === 0) for (let x = p.x0; x < p.x1; x++) P.p(x, 0, 'cemento'); // sombra de las casas
  }
  // 3. detalles del concreto: remiendos, grietas, tapas, manchas de aceite y rejillas
  const R = rng(s * 11);
  const asf = L.piso.filter((q) => q.tipo === 'asfalto');
  const enAsf = (x: number, y: number) => asf.some((q) => x >= q.x0 && x < q.x1 && y >= (q.y0 ?? 0) && y < (q.y1 ?? D));
  const top = Math.max(0, ...L.piso.filter((q) => q.tipo === 'acera' && (q.y0 ?? 0) === 0).map((q) => q.y1 ?? 0)) + 3;
  for (let x = 40; x < W - 40; x += 70 + Math.floor(R() * 90)) {
    const kind = R();
    const y = top + Math.floor(R() * (D - top - 14));
    if (!enAsf(x, y) || !enAsf(x + 30, y + 10)) continue;
    if (kind < 0.25) {
      // remiendo de concreto más oscuro
      const w = 14 + Math.floor(R() * 26), h = 6 + Math.floor(R() * 10);
      // remiendo de bordes irregulares, tramado: se lee como concreto nuevo y no como sombra
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const e = Math.min(i, j, w - 1 - i, h - 1 - j);
        if (e < 2 && g(x + i, y + j, s + 9) < 0.5) continue;
        if (bayer(x + i, y + j) < 0.5) P.p(x + i, y + j, 'asfalto');
      }
    } else if (kind < 0.55) grieta(P, x, y, 12 + Math.floor(R() * 26), R);
    else if (kind < 0.68) tapa(P, x + 8, y + 4);
    else if (kind < 0.85) {
      // mancha de aceite: tramado oscuro con un brillo
      const r = 3 + R() * 5;
      for (let j = -r; j <= r; j++) for (let i = -r * 1.6; i <= r * 1.6; i++) if ((i / 1.6) ** 2 + j * j < r * r && bayer(x + i, y + j) < 0.5) P.p(Math.round(x + i), Math.round(y + j), 'asfalto');
    } else rejilla(P, x, top - 2);
  }
  // 4. huecos: canal con su pared del fondo, el agua turbia y lo que flota, o el vacío entre edificios
  for (const h of L.huecos) if (h.caida === 'vacio') vacio(P, h.x0, h.x1, h.y0 ?? 0, h.y1 ?? D, D, s);
  else canal(P, h.x0, h.x1, h.y0 ?? 0, h.y1 ?? D, D, s);
  // los pisos que cruzan un vacío (vigas, tablones) muestran su canto
  for (const p of L.piso) {
    const sobre = L.huecos.find((h) => h.caida === 'vacio' && p.x0 >= h.x0 && p.x1 <= h.x1);
    if (!sobre || p.y0 === undefined || p.y1 === undefined) continue;
    for (let x = p.x0; x < p.x1; x++) { P.p(x, p.y0, 'luz'); P.p(x, p.y1 - 1, 'asfalto_claro'); P.p(x, p.y1, 'asfalto'); P.p(x, p.y1 + 1, 'sombra'); }
    for (let x = p.x0 + 4; x < p.x1; x += 8) { P.p(x, p.y0 + 2, 'asfalto_claro'); P.p(x, p.y1 - 3, 'asfalto_claro'); }
  }
  // 5. orilla de enfrente: cuneta, bordillo y acera (o lo que diga el tema)
  orilla(P, L, D, s);
  return P;
}

/** Un canal (hueco con agua) visto desde arriba: pared del fondo, agua, bordes, jacintos y basura flotando. */
export function canal(P: Lienzo, x0: number, x1: number, y0: number, y1: number, D: number, s: number) {
  const pared = 18;
  // si el hueco llega al borde de la franja, el canal sigue hasta abajo de la pantalla
  const yEnd = y1 >= D ? P.h : y1;
  for (let y = y0; y < yEnd; y++) for (let x = x0; x < x1; x++) {
    if (y >= y1 && y < D) continue;
    const d = y - y0;
    let c: Color;
    if (d < pared && y < y1) c = d === 0 ? 'luz' : d < 3 ? 'cemento' : g(x, y, s + 4) < 0.25 + d / 40 ? 'canal' : d > pared - 4 ? 'verde_oscuro' : 'cemento';
    else {
      // agua turbia en manchones grandes, sin ruido
      c = g(x >> 3, y >> 2, s + 5) < 0.3 && bayer(x, y) < 0.5 ? 'verde_oscuro' : 'canal';
    }
    P.p(x, y, c);
  }
  // reflejos de luz en el agua: rayitas horizontales
  const R = rng(x0 + s);
  for (let k = 0; k < (x1 - x0) * (yEnd - y0) / 500; k++) {
    const x = x0 + 2 + Math.floor(R() * (x1 - x0 - 8)), y = y0 + pared + 2 + Math.floor(R() * Math.max(1, yEnd - y0 - pared - 4));
    if (y >= y1 && y < D) continue;
    P.hl(x, y, 2 + Math.floor(R() * 4), R() < 0.3 ? 'luz' : 'cielo');
  }
  // jacintos de agua (lục bình): matas verdes flotando
  for (let k = 0; k < Math.max(1, Math.floor((yEnd - y0) / 30)); k++) {
    const cx = x0 + 6 + Math.floor(R() * (x1 - x0 - 12)), cy = y0 + pared + 6 + Math.floor(R() * Math.max(1, yEnd - y0 - pared - 12));
    if (cy >= y1 - 3 && cy < D + 3) continue;
    P.d(cx, cy + 1, 7, 'verde_oscuro', 0.55); P.d(cx, cy, 6, 'verde', 0.55); P.d(cx - 3, cy - 1, 3, 'menta', 0.6); P.d(cx + 3, cy, 2, 'menta', 0.6);
    P.p(cx + 1, cy - 3, 'celeste'); P.p(cx + 2, cy - 3, 'celeste'); P.p(cx - 1, cy - 2, 'celeste');
  }
  // basura: una chancleta y una caja de anime
  const bx = x0 + 4 + Math.floor(R() * (x1 - x0 - 14)), by = y0 + pared + 10 + Math.floor(R() * 20);
  if (by < y1 - 4 || y1 >= D) { P.f(bx, by, 7, 4, 'luz'); P.hl(bx, by + 4, 7, 'cemento'); P.f(bx + 10, by + 6, 4, 2, 'rojo'); }
  // bordes: el corte del piso a los lados
  for (let y = y0; y < yEnd; y++) {
    if (y >= y1 && y < D) continue;
    P.p(x0, y, 'tinta'); P.p(x1 - 1, y, 'tinta');
    P.p(x0 - 1, y, 'cemento'); P.p(x1, y, 'cemento');
  }
  // puentecito: si el hueco no llega adelante, lo de adelante es una losa
  if (y1 < D) {
    for (let x = x0 - 2; x < x1 + 2; x++) { P.p(x, y1, 'luz'); P.p(x, y1 + 1, 'cemento_claro'); }
    for (let y = y1 + 2; y < D; y++) for (let x = x0; x < x1; x++) P.p(x, y, (x - x0) % 16 === 0 ? 'cemento' : g(x, y, s + 8) < 0.06 ? 'cemento' : 'cemento_claro');
    for (let y = y1; y < D; y++) { P.p(x0 - 1, y, 'cemento'); P.p(x1, y, 'cemento'); }
    // la losa sigue hacia la orilla, con el canal debajo
    for (let y = D; y < P.h; y++) for (let x = x0; x < x1; x++) P.p(x, y, y < D + 4 ? (y === D ? 'cemento_claro' : 'cemento') : y === D + 4 ? 'tinta' : g(x >> 1, y, s + 5) < 0.12 ? 'verde_oscuro' : 'canal');
  }
}

/**
 * Un vacío entre edificios visto desde arriba: el canto de la losa, las paredes que bajan hacia la oscuridad y, muy
 * abajo, el callejón con un bombillo. Sigue hasta abajo de la pantalla si el hueco llega al borde de la franja.
 */
export function vacio(P: Lienzo, x0: number, x1: number, y0: number, y1: number, D: number, s: number) {
  const yEnd = y1 >= D ? P.h : y1, w = x1 - x0;
  for (let y = y0; y < yEnd; y++) for (let x = x0; x < x1; x++) {
    const i = x - x0, lado = Math.min(i, w - 1 - i);
    // las dos paredes en perspectiva: la izquierda al sol, la derecha en sombra
    let c: Color = lado < 6 ? (i < w / 2 ? (lado < 2 ? 'cemento' : 'asfalto_claro') : lado < 2 ? 'asfalto' : 'sombra') : bayer(x, y) < 0.35 ? 'sombra' : 'tinta';
    if (lado >= 6 && g(x >> 2, y >> 3, s + 3) < 0.05) c = 'oro'; // ventanita prendida allá abajo
    P.p(x, y, c);
  }
  // canto de la losa y el borde de enfrente
  for (let x = x0 - 1; x <= x1; x++) if (y0 > 0) { P.p(x, y0 - 1, 'luz'); P.p(x, y0, 'cemento'); }
  for (let y = y0; y < yEnd; y++) { P.p(x0 - 1, y, 'luz'); P.p(x1, y, 'cemento'); }
  if (y1 < D) for (let x = x0 - 1; x <= x1; x++) { P.p(x, y1, 'luz'); P.p(x, y1 + 1, 'cemento_claro'); }
}

/** Qué se ve en la orilla de enfrente, por tema o por `paralaje.cerca`: una función de (x, fila de la orilla). */
export const ORILLAS: Record<string, (P: Lienzo, x: number, r: number, s: number) => Color> = {
  /** El borde de la azotea: la cornisa y la fachada que baja. */
  azoteas: (_P, x, r, s) => r === 0 ? 'asfalto' : r < 3 ? 'luz' : r < 6 ? 'cemento_claro' : r === 6 ? 'cemento' : (x % 64 > 8 && x % 64 < 30 && r > 12 && r < 26) ? (r === 13 ? 'cemento' : g(x >> 3, 0, s) < 0.3 ? 'oro' : 'asfalto') : r % 9 === 0 ? 'cemento' : 'crema',
  /** Adentro del mercado: la baldosa sigue y la canaleta del desagüe. */
  mercado_interior: (_P, x, r) => r === 2 || r === 3 ? (x % 6 < 4 ? 'asfalto_claro' : 'cemento') : baldosa(_P, x, r + 2, 0),
  /** El borde de la pista: un poco más de tartán, el bordillo blanco y el pasto de adentro. */
  gradas: (_P, x, r, s) => r < 5 ? cancha(_P, x, r + 1, s) : r < 7 ? (r === 5 ? 'luz' : 'cemento_claro') : g(x, r, s) < 0.12 ? 'verde_oscuro' : (r >> 2) % 2 ? 'verde' : g(x >> 1, r, s + 1) < 0.5 ? 'verde' : 'menta',
};

/** La orilla de enfrente: cuneta con un hilo de agua, bordillo y acera, cortada donde pasan los canales. */
function orilla(P: Lienzo, L: ObliqueLayout, D: number, s: number) {
  const W = L.largo;
  const temas = L.ranuras_deco.filter((t) => ORILLAS[t.tema]);
  const estilo = (x: number) => ORILLAS[temas.find((t) => x >= t.x0 && x < t.x1)?.tema ?? ''] ?? ORILLAS[L.paralaje?.cerca ?? ''];
  const enCanal = (x: number) => L.huecos.some((h) => x >= h.x0 && x < h.x1);
  // solo el agua que llega al borde de la franja sigue por la orilla
  const enAgua = (x: number) => L.agua.some((a) => x >= a.x0 && x < a.x1 && (a.y1 ?? D) >= D);
  for (let x = 0; x < W; x++) {
    if (enCanal(x)) continue;
    const f = estilo(x);
    if (f) { for (let y = D; y < P.h; y++) P.p(x, y, f(P, x, y - D, s)); if (!enAgua(x)) continue; }
    else for (let y = D; y < P.h; y++) {
      const r = y - D;
      let c: Color;
      if (r < 3) c = r === 0 ? 'asfalto' : g(x, y, s) < 0.3 ? 'canal' : 'asfalto';
      else if (r === 3) c = 'luz';
      else if (r < 6) c = 'cemento_claro';
      else if (r === 6) c = 'cemento';
      else c = acera(P, x, y - 7, s + 1);
      P.p(x, y, c);
    }
    if (enAgua(x)) for (let y = D; y < P.h; y++) if (bayer(x, y) < 0.7) P.p(x, y, y % 5 === 0 && g(x, y, s) < 0.3 ? 'celeste' : 'canal');
  }
  for (const h of L.huecos) if (h.caida !== 'vacio') for (let y = D; y < P.h; y++) { P.p(h.x0 - 1, y, 'cemento'); P.p(h.x1, y, 'cemento'); }
}
