import { rng, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color } from './paleta';
import { drawText, textWidth, LINE_H } from './letras';
import { MAS_OSCURO, MAS_CLARO } from './tonos';

/**
 * Pinceles que comparten los lugares del lote E5 (Margarita, Đà Lạt, Barranquilla y Maracaibo): recortes para la vida,
 * letreros con la letra al doble, palmas de coco, cuerdas de banderines, la malla de una cancha y la gente chiquita del
 * fondo. Todo pinta con los nombres de la paleta del lugar.
 */

/** Recorta un pedazo de una capa (todo lo que tiene, opaco o no). */
export function recorte(src: Lienzo, x: number, y: number, w: number, h: number): Lienzo {
  const out = new Lienzo(w, h, src.pal);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx = x + i, sy = y + j;
    if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
    const a = (sy * src.w + sx) * 4;
    out.r.data.set(src.r.data.subarray(a, a + 4), (j * w + i) * 4);
  }
  return out;
}

/** Deja en `L` (puesto en x, y de la capa cerca) solo lo que cae donde la capa cerca es transparente: lo que se ve detrás de la malla o en el cielo. */
export function soloAfuera(L: Lienzo, cerca: Lienzo, x: number, y: number): Lienzo {
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) if (cerca.has(x + i, y + j)) L.clear(i, j);
  return L;
}

/** Texto con la letra del kit agrandada `k` veces, con su sombra de 1 px abajo a la derecha si se pide. */
export function textoGrande(C: Lienzo, x: number, y: number, texto: string, color: Color, k = 2, sombra?: Color) {
  const T = new Lienzo(textWidth(texto) + 2, LINE_H + 1, C.pal);
  drawText(T, 0, 0, texto, color);
  for (const [dx, c] of [...(sombra ? [[1, sombra] as const] : []), [0, color] as const]) {
    for (let j = 0; j < T.h; j++) for (let i = 0; i < T.w; i++) if (T.has(i, j)) C.f(x + i * k + dx, y + (j - 2) * k + dx, k, k, c);
  }
  return textWidth(texto) * k;
}

/** Ancho de un texto agrandado `k` veces. */
export const anchoTexto = (texto: string, k = 2) => textWidth(texto) * k;

/**
 * Una palma de coco: el tronco curvo y gris con sus anillos, que se angosta hacia arriba, el racimo de cocos y las hojas
 * que caen en arco con sus foliolos. `lado` dice hacia dónde se inclina. Devuelve la punta del tronco.
 */
export function palmaCoco(C: Lienzo, x: number, base: number, alto: number, lado: 1 | -1, seed: number, hojas: [Color, Color, Color] = ['verde_oscuro', 'verde', 'menta'], tronco: [Color, Color, Color] = ['cemento', 'asfalto_claro', 'asfalto'], inclina = 0.16) {
  const R = rng(seed);
  const xs: number[] = [];
  for (let i = 0; i <= alto; i++) {
    const t = i / alto, cx = x + lado * Math.round(t * t * alto * inclina + Math.sin(t * 3 + seed) * 2), y = base - i;
    xs.push(cx);
    const w = Math.max(3, Math.round(6 - t * 3));
    for (let k = 0; k < w; k++) {
      const anillo = (i + (seed & 3)) % 5 === 0;
      C.p(cx - Math.floor(w / 2) + k, y, k === 0 ? tronco[0] : anillo ? tronco[2] : k === w - 1 ? tronco[2] : tronco[1]);
    }
  }
  const tx = xs[alto], ty = base - alto;
  // el racimo de cocos debajo de la copa
  for (const [dx, dy] of [[-2, 3], [2, 3], [0, 5], [-3, 6], [3, 6]]) { C.d(tx + dx, ty + dy, 2, 'ocre'); C.p(tx + dx - 1, ty + dy - 1, 'amarillo'); C.p(tx + dx + 1, ty + dy + 1, 'terracota'); }
  // las hojas: arcos que salen de la punta y caen, con los foliolos a los dos lados
  const n = 11;
  for (let h = 0; h < n; h++) {
    const a = -Math.PI / 2 + ((h / (n - 1)) - 0.5) * Math.PI * 1.35 + (R() - 0.5) * 0.2, largo = 30 + Math.floor(R() * 16);
    let px = tx, py = ty;
    for (let s = 0; s < largo; s++) {
      const t = s / largo, ang = a + (Math.cos(a) >= 0 ? 1 : -1) * t * t * 1.3;
      px += Math.cos(ang); py += Math.sin(ang) + t * 0.55;
      const X = Math.round(px), Y = Math.round(py);
      C.p(X, Y, hojas[0]);
      // los foliolos: rayitas que cuelgan a los dos lados, más cortas hacia la punta
      const f = Math.max(1, Math.round((1 - t) * 6));
      if (s % 2 === 0) for (let k = 1; k <= f; k++) { C.p(X + Math.round(Math.cos(ang + 1.9) * k * 0.6), Y + k, k === 1 ? hojas[1] : hojas[0]); C.p(X - Math.round(Math.cos(ang + 1.9) * k * 0.5), Y + Math.round(k * 0.8), hojas[1]); }
      if (s % 3 === 1 && py < ty + 6) C.p(X, Y - 1, hojas[2]);
    }
  }
  C.d(tx, ty, 2, hojas[1]); C.p(tx - 1, ty - 1, hojas[2]);
  return [tx, ty] as const;
}

/**
 * Una cuerda de banderines triangulares que cuelga de (x0, y0) a (x1, y1) con su comba. `f` mece las puntas (la vida).
 * Los colores se turnan en orden.
 */
export function banderines(C: Lienzo, x0: number, y0: number, x1: number, y1: number, comba: number, colores: Color[], f = 0, paso = 9, cuerda: Color = 'sombra') {
  const n = Math.max(1, Math.round(Math.abs(x1 - x0)));
  const yEn = (i: number) => { const t = i / n; return Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * comba); };
  for (let i = 0; i <= n; i++) C.p(x0 + i * Math.sign(x1 - x0 || 1), yEn(i), cuerda);
  let k = 0;
  for (let i = 3; i < n - 3; i += paso, k++) {
    const x = x0 + i * Math.sign(x1 - x0 || 1), y = yEn(i) + 1, c = colores[k % colores.length], mece = ((k + f) % 2) * 1 - 0;
    for (let j = 0; j < 7; j++) {
      const w = Math.max(0, 3 - Math.floor(j / 2));
      for (let q = -w; q <= w; q++) C.p(x + q + (j > 3 ? mece : 0), y + j, q === w && j < 5 ? MAS_OSCURO[c] : c);
    }
  }
}

/** La malla de alambre de una cancha (en rombos): pinta solo los alambres, entre ellos queda transparente. */
export function malla(C: Lienzo, x0: number, y0: number, x1: number, y1: number, alambre: Color, paso = 6, luz?: Color) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const a = (x - x0 + (y - y0)) % paso, b = (x - x0 - (y - y0) + 1000 * paso) % paso;
    if (a === 0 || b === 0) C.p(x, y, luz && a === 0 && (y >> 1) % 3 === 0 ? luz : alambre);
  }
}

export interface Personita { ropa: Color; pant: Color; pelo: Color; piel: Color; pose?: number; alto?: number; sombrero?: Color }

/**
 * Una persona chiquita de pie, de frente (gente del fondo: más chica que los atletas). `pose` mueve los brazos: 0 abajo,
 * 1 uno arriba saludando, 2 los dos arriba, 3 aplaudiendo al frente.
 */
export function personita(C: Lienzo, x: number, base: number, p: Personita) {
  const alto = p.alto ?? 28, piernas = Math.round(alto * 0.4), torso = Math.round(alto * 0.36), cab = alto - piernas - torso;
  const ty = base - piernas - torso;
  C.f(x + 1, base - piernas, 2, piernas, p.pant); C.f(x + 5, base - piernas, 2, piernas, p.pant); C.vl(x + 6, base - piernas, piernas, MAS_OSCURO[p.pant]);
  C.hl(x, base - 1, 3, 'sombra'); C.hl(x + 5, base - 1, 3, 'sombra');
  C.f(x, ty, 8, torso, p.ropa); C.vl(x + 7, ty, torso, MAS_OSCURO[p.ropa]); C.hl(x, ty, 8, MAS_CLARO[p.ropa]);
  const hy = ty - cab;
  C.f(x + 2, hy, 5, cab, p.piel); C.hl(x + 2, hy, 5, p.pelo); C.p(x + 2, hy + 1, p.pelo); C.p(x + 5, hy + 2, 'tinta'); C.p(x + 3, hy + 2, 'tinta'); C.vl(x + 6, hy + 1, cab - 1, MAS_OSCURO[p.piel]);
  if (p.sombrero) { C.hl(x, hy, 9, p.sombrero); C.f(x + 2, hy - 2, 5, 2, p.sombrero); }
  const pose = p.pose ?? 0;
  const brazo = (bx: number, arriba: boolean, frente: boolean) => {
    if (arriba) { C.vl(bx, ty - 6, 7, p.ropa); C.p(bx, ty - 7, p.piel); }
    else if (frente) { C.ln(bx, ty + 1, x + 3 + (bx > x ? 1 : 0), ty + 5, p.ropa); C.p(x + 3 + (bx > x ? 1 : 0), ty + 5, p.piel); }
    else { C.vl(bx, ty + 1, torso - 1, MAS_OSCURO[p.ropa]); C.p(bx, ty + torso, p.piel); }
  };
  brazo(x - 1, pose === 2, pose === 3);
  brazo(x + 8, pose === 1 || pose === 2, pose === 3);
}

/** Una persona sentada, chiquita, de frente: en una banca o una grada (el asiento en la fila `asiento`). `arriba` levanta los brazos. */
export function sentadita(C: Lienzo, x: number, asiento: number, p: Personita, arriba = false) {
  const alto = p.alto ?? 18, torso = Math.round(alto * 0.5), cab = Math.max(5, alto - torso - 4);
  C.f(x - 1, asiento - 3, 10, 3, p.pant); C.f(x, asiento, 2, 6, p.pant); C.f(x + 6, asiento, 2, 6, p.pant); C.hl(x - 1, asiento + 6, 3, 'sombra'); C.hl(x + 6, asiento + 6, 3, 'sombra');
  const ty = asiento - 3 - torso;
  C.f(x, ty, 8, torso, p.ropa); C.vl(x + 7, ty, torso, MAS_OSCURO[p.ropa]); C.hl(x, ty, 8, MAS_CLARO[p.ropa]);
  const hy = ty - cab;
  C.f(x + 2, hy, 5, cab, p.piel); C.hl(x + 2, hy, 5, p.pelo); C.p(x + 2, hy + 1, p.pelo); C.p(x + 3, hy + 2, 'tinta'); C.p(x + 5, hy + 2, 'tinta'); C.vl(x + 6, hy + 1, cab - 1, MAS_OSCURO[p.piel]);
  if (p.sombrero) { C.hl(x, hy, 9, p.sombrero); C.f(x + 2, hy - 2, 5, 2, p.sombrero); }
  if (arriba) { C.vl(x - 1, ty - 6, 7, p.ropa); C.vl(x + 8, ty - 6, 7, p.ropa); C.p(x - 1, ty - 7, p.piel); C.p(x + 8, ty - 7, p.piel); }
  else { C.vl(x - 1, ty + 1, torso - 1, p.ropa); C.vl(x + 8, ty + 1, torso - 1, MAS_OSCURO[p.ropa]); }
}

/** Una sombra tramada en el piso (un óvalo aplastado), sobre lo que ya hay pintado. */
export function sombraOval(C: Lienzo, cx: number, cy: number, rx: number, ry: number, c: Color, k = 0.55) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
    if (C.has(x, y) && bayer(x, y) < k) C.p(x, y, c);
  }
}
