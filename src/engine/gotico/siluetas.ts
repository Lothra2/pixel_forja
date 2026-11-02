import { rng } from '../core/rng';
import {
  mascara, rellenar, trazo, disco, polilinea, desenfocar, fbm, sat, suave, mezcla, hash2,
  type Lamina, type Mascara, type P2, type C3,
} from './cine';

/**
 * Siluetas y fenómenos para las ilustraciones de cine (portada y cartas de los actos): árboles muertos, lápidas y
 * cruces, ruinas con ventanas encendidas, horcas y empalados, fuego, humo, nubes de tormenta iluminadas desde abajo,
 * perfiles de montes y suelo. Todo se dibuja en máscaras (cobertura 0..1) y la escena decide el color y la luz.
 */

/** Gira puntos alrededor de (cx, cy). */
export const girar = (pts: P2[], cx: number, cy: number, a: number): P2[] => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };

// ------------------------------------------------------------------ terreno
/** Perfil de montes o lomas: polígono cerrado hasta abajo. `amp` alto de las ondas, `rug` lo quebrado. */
export function perfil(w: number, h: number, base: number, amp: number, s: number, o: { escala?: number; rug?: number; per?: number; picos?: number } = {}): P2[] {
  const esc = o.escala ?? 260, pts: P2[] = [[-4, h + 4]];
  for (let x = -4; x <= w + 4; x += 3) {
    let v = fbm(x / esc, 0.5, 5, s, o.per ? o.per / esc : 0) - 0.5;
    if (o.picos) v = -Math.abs(v * 2) * o.picos + v * (1 - o.picos);
    v += (fbm(x / (esc * 0.12), 3.5, 3, s + 9, o.per ? o.per / (esc * 0.12) : 0) - 0.5) * (o.rug ?? 0.25);
    pts.push([x, base - v * amp * 2]);
  }
  pts.push([w + 4, h + 4]);
  return pts;
}

// ------------------------------------------------------------------ árboles
/** Árbol muerto de ramas en garra: tronco con raíces y ramas que se parten y retuercen. */
export function arbolMuerto(m: Mascara, x: number, y: number, alto: number, s: number, o: { inclina?: number; grosor?: number; abre?: number } = {}) {
  const r = rng(s * 977 + 3), g0 = (o.grosor ?? 0.075) * alto;
  // raíces
  for (let i = 0; i < 5; i++) { const lado = i % 2 ? 1 : -1, l = g0 * (1.2 + r() * 1.6); rellenar(m, [[x - g0 * 0.4 * lado, y - g0 * 1.4], [x + lado * l, y + 1 + r() * 3], [x + lado * l * 0.3, y + 2]]); }
  const rama = (x0: number, y0: number, ang: number, L: number, w: number, n: number) => {
    // cada rama es una línea quebrada de 4 tramos que se retuerce
    const pts: P2[] = [[x0, y0]];
    let a = ang, px = x0, py = y0;
    for (let k = 0; k < 4; k++) { a += (r() - 0.5) * 0.45; px += Math.cos(a) * L / 4; py += Math.sin(a) * L / 4; pts.push([px, py]); }
    polilinea(m, pts, w, w * 0.62);
    if (n <= 0 || w < 0.6) return;
    const hijos = 2 + (r() < 0.45 ? 1 : 0);
    for (let k = 0; k < hijos; k++) {
      const t = k === 0 ? 1 : 0.45 + r() * 0.5, idx = Math.min(4, Math.round(t * 4)), p = pts[idx];
      const desv = (k === 0 ? (r() - 0.5) * 0.5 : (k % 2 ? 1 : -1) * (0.45 + r() * (o.abre ?? 0.55)));
      rama(p[0], p[1], a + desv, L * (0.62 + r() * 0.2), w * 0.62, n - 1);
    }
  };
  rama(x, y, -Math.PI / 2 + (o.inclina ?? 0), alto * 0.36, g0, 6);
}
/** Pinos o abetos negros (para el norte helado). */
export function pino(m: Mascara, x: number, y: number, alto: number, s: number) {
  const r = rng(s * 31 + 1), w = alto * 0.32;
  trazo(m, x, y, x, y - alto, alto * 0.04, alto * 0.02);
  for (let k = 0; k < 7; k++) {
    const t = k / 7, yy = y - alto * (0.15 + t * 0.85), ww = w * (1 - t) * (0.8 + r() * 0.4);
    rellenar(m, [[x - ww, yy + alto * 0.08], [x + (r() - 0.5) * 3, yy - alto * 0.14], [x + ww, yy + alto * 0.08], [x, yy + alto * 0.04]]);
  }
}

// ------------------------------------------------------------------ camposanto
export type TipoLapida = 'redonda' | 'ojiva' | 'cruz' | 'celta' | 'obelisco' | 'rota';
/** Lápida o cruz de `alto` px con su pie en (x, y), inclinada `a` radianes. */
export function lapida(m: Mascara, x: number, y: number, alto: number, tipo: TipoLapida, a = 0, valor = 1) {
  const w = alto * 0.55, pol = (p: P2[]) => rellenar(m, girar(p, x, y, a), valor);
  if (tipo === 'redonda' || tipo === 'rota') {
    const p: P2[] = [[x - w / 2, y], [x - w / 2, y - alto + w / 2]];
    for (let k = 0; k <= 10; k++) { const t = Math.PI + (k / 10) * Math.PI; p.push([x + Math.cos(t) * w / 2, y - alto + w / 2 + Math.sin(t) * w / 2]); }
    p.push([x + w / 2, y]);
    if (tipo === 'rota') { p.splice(2, p.length - 3, [x - w * 0.1, y - alto * 0.62], [x + w * 0.12, y - alto * 0.78], [x + w / 2, y - alto * 0.55]); }
    pol(p);
  } else if (tipo === 'ojiva') {
    pol([[x - w / 2, y], [x - w / 2, y - alto * 0.62], [x - w * 0.3, y - alto * 0.88], [x, y - alto], [x + w * 0.3, y - alto * 0.88], [x + w / 2, y - alto * 0.62], [x + w / 2, y]]);
  } else if (tipo === 'cruz' || tipo === 'celta') {
    const g = alto * 0.13;
    pol([[x - g / 2, y], [x - g / 2, y - alto], [x + g / 2, y - alto], [x + g / 2, y]]);
    pol([[x - alto * 0.3, y - alto * 0.72], [x + alto * 0.3, y - alto * 0.72], [x + alto * 0.3, y - alto * 0.72 - g], [x - alto * 0.3, y - alto * 0.72 - g]]);
    if (tipo === 'celta') {
      const cx = x, cy = y - alto * 0.72 - g / 2, R = alto * 0.19, rr = R - g * 0.55, p: P2[] = [], q: P2[] = [];
      for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2; p.push([cx + Math.cos(t) * R, cy + Math.sin(t) * R]); q.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]); }
      rellenar(m, [girar(p, x, y, a), girar(q, x, y, a)], valor);
    }
    pol([[x - g, y], [x - g * 0.8, y - g * 0.6], [x + g * 0.8, y - g * 0.6], [x + g, y]]);
  } else {
    pol([[x - w * 0.3, y], [x - w * 0.22, y - alto * 0.85], [x, y - alto], [x + w * 0.22, y - alto * 0.85], [x + w * 0.3, y]]);
    pol([[x - w * 0.42, y], [x - w * 0.42, y - alto * 0.12], [x + w * 0.42, y - alto * 0.12], [x + w * 0.42, y]]);
  }
}
/** Verja de hierro con lanzas, de x0 a x1 sobre la línea y. */
export function verja(m: Mascara, x0: number, x1: number, y: number, alto: number, s: number) {
  const r = rng(s), paso = alto * 0.16;
  trazo(m, x0, y - alto * 0.85, x1, y - alto * 0.85, alto * 0.035, alto * 0.035, 1, 'max', false);
  trazo(m, x0, y - alto * 0.25, x1, y - alto * 0.25, alto * 0.035, alto * 0.035, 1, 'max', false);
  for (let x = x0; x <= x1; x += paso) {
    if (r() < 0.12) continue;
    const inc = (r() - 0.5) * 0.12, top: P2 = [x + Math.sin(inc) * alto, y - alto * (0.98 + r() * 0.06)];
    trazo(m, x, y, top[0], top[1], alto * 0.03, alto * 0.025, 1, 'max', false);
    rellenar(m, [[top[0] - alto * 0.035, top[1]], [top[0], top[1] - alto * 0.1], [top[0] + alto * 0.035, top[1]]]);
  }
  for (const x of [x0, x1]) rellenar(m, [[x - alto * 0.07, y], [x - alto * 0.07, y - alto * 1.05], [x, y - alto * 1.18], [x + alto * 0.07, y - alto * 1.05], [x + alto * 0.07, y]]);
}
/** Cuervo posado (de perfil, mirando a la izquierda si `dir` es -1). */
export function cuervo(m: Mascara, x: number, y: number, t: number, dir = -1) {
  const p: P2[] = [[0, 0], [0.5, -0.55], [1.4, -0.75], [2.2, -0.6], [2.8, -0.2], [3.6, 0.4], [2.6, 0.2], [1.6, 0.5], [0.6, 0.35], [-0.2, 0.15]];
  rellenar(m, p.map(([u, v]) => [x + u * t * dir * -1, y + v * t] as P2));
  disco(m, x - dir * 0.15 * t * -1, y - 0.3 * t, t * 0.42);
  rellenar(m, [[x, y - 0.35 * t], [x + dir * 0.75 * t, y - 0.2 * t], [x, y - 0.1 * t]].map(([u, v]) => [u, v] as P2));
  trazo(m, x - dir * -1 * 1.3 * t, y + 0.45 * t, x - dir * -1 * 1.3 * t, y + 1.1 * t, t * 0.12);
}

// ------------------------------------------------------------------ gente (siluetas de cuerpos)
/** Ahorcado que cuelga de (x, y) con la soga de largo `soga`, el cuerpo de alto `alto`. */
export function ahorcado(m: Mascara, x: number, y: number, soga: number, alto: number, giro = 0) {
  const cx = x + giro * alto * 0.15, top = y + soga;
  trazo(m, x, y, cx, top, alto * 0.025, alto * 0.025, 1, 'max', false);
  disco(m, cx, top + alto * 0.08, alto * 0.075);
  rellenar(m, [[cx - alto * 0.11, top + alto * 0.17], [cx + alto * 0.11, top + alto * 0.17], [cx + alto * 0.09, top + alto * 0.58], [cx - alto * 0.1, top + alto * 0.58]]);
  trazo(m, cx - alto * 0.1, top + alto * 0.2, cx - alto * 0.13 + giro * 4, top + alto * 0.5, alto * 0.05);
  trazo(m, cx + alto * 0.1, top + alto * 0.2, cx + alto * 0.12 + giro * 4, top + alto * 0.5, alto * 0.05);
  trazo(m, cx - alto * 0.05, top + alto * 0.56, cx - alto * 0.06 + giro * 3, top + alto * 0.98, alto * 0.065, alto * 0.05);
  trazo(m, cx + alto * 0.05, top + alto * 0.56, cx + alto * 0.03 + giro * 5, top + alto * 0.96, alto * 0.065, alto * 0.05);
}
/** Horca: poste, brazo y tornapunta. Devuelve el punto de donde cuelga la soga. */
export function horca(m: Mascara, x: number, y: number, alto: number, dir = 1): P2 {
  const g = alto * 0.06, brazo = alto * 0.48;
  trazo(m, x, y, x, y - alto, g, g * 0.9, 1, 'max', false);
  trazo(m, x - g * 0.6 * dir, y - alto + g * 0.4, x + brazo * dir, y - alto + g * 0.4, g * 0.85, g * 0.8, 1, 'max', false);
  trazo(m, x, y - alto * 0.72, x + brazo * 0.42 * dir, y - alto + g, g * 0.6, g * 0.6, 1, 'max', false);
  rellenar(m, [[x - g * 2, y], [x - g * 0.5, y - g * 2], [x + g * 0.5, y - g * 2], [x + g * 2, y]]);
  return [x + brazo * 0.85 * dir, y - alto + g * 0.8];
}
/**
 * Estaca con un cuerpo empalado (gore en silueta): el cuerpo cae a lo largo de la estaca, la punta le sale por el
 * hombro, la cabeza colgando hacia atrás, los brazos flojos y las piernas abiertas que cuelgan.
 */
export function empalado(m: Mascara, x: number, y: number, alto: number, s: number, a = 0) {
  const r = rng(s), ux = Math.sin(a), uy = -Math.cos(a), en = (t: number): P2 => [x + ux * alto * t, y + uy * alto * t];
  const k = alto * 0.36, nx = -uy, ny = ux, lado = r() < 0.5 ? -1 : 1;
  trazo(m, x, y, en(1)[0], en(1)[1], alto * 0.035, alto * 0.01, 1, 'max', false);
  const [hx, hy] = en(0.72), [sx, sy] = en(0.9);
  // torso a lo largo de la estaca, un poco arqueado
  rellenar(m, [[hx - nx * k * 0.11, hy - ny * k * 0.11], [sx - nx * k * 0.15, sy - ny * k * 0.15], [sx + nx * k * 0.16, sy + ny * k * 0.16], [hx + nx * k * 0.13, hy + ny * k * 0.13]]);
  // cabeza caída hacia un lado y hacia atrás
  const cab: P2 = [sx + nx * k * 0.16 * lado - ux * k * 0.02, sy + ny * k * 0.16 * lado + k * 0.06];
  trazo(m, sx, sy, cab[0], cab[1], k * 0.07, k * 0.06);
  disco(m, cab[0] + nx * k * 0.05 * lado, cab[1] + k * 0.05, k * 0.09);
  // brazos flojos con el codo doblado
  for (const sg of [-1, 1]) {
    const hom: P2 = [sx + nx * k * 0.14 * sg, sy + ny * k * 0.14 * sg], codo: P2 = [hom[0] + nx * k * 0.07 * sg, hom[1] + k * 0.24], mano: P2 = [codo[0] + (r() - 0.5) * k * 0.08, codo[1] + k * 0.2];
    polilinea(m, [hom, codo, mano], k * 0.075, k * 0.05);
  }
  // piernas que cuelgan abiertas, con la rodilla doblada
  for (const sg of [-1, 1]) {
    const cad: P2 = [hx + nx * k * 0.07 * sg, hy + ny * k * 0.07 * sg], rod: P2 = [cad[0] + nx * k * (0.04 + r() * 0.06) * sg, cad[1] + k * 0.32], pie: P2 = [rod[0] - nx * k * 0.03 * sg, rod[1] + k * 0.3];
    polilinea(m, [cad, rod, pie], k * 0.1, k * 0.06);
  }
}
/** Figura de rodillas que estira un brazo hacia arriba (los que intentaron subir, peregrinos que suplican). */
export function suplicante(m: Mascara, x: number, y: number, alto: number, dir = 1) {
  const k = alto, d = dir;
  // capa sobre las piernas dobladas y la espalda inclinada hacia adelante
  rellenar(m, [[x - d * k * 0.32, y], [x - d * k * 0.3, y - k * 0.22], [x - d * k * 0.12, y - k * 0.5], [x + d * k * 0.02, y - k * 0.64], [x + d * k * 0.12, y - k * 0.58], [x + d * k * 0.14, y - k * 0.3], [x + d * k * 0.26, y - k * 0.06], [x + d * k * 0.3, y]]);
  disco(m, x + d * k * 0.07, y - k * 0.7, k * 0.085);
  // capucha
  rellenar(m, [[x - d * k * 0.02, y - k * 0.66], [x + d * k * 0.04, y - k * 0.8], [x + d * k * 0.15, y - k * 0.66]]);
  // el brazo estirado hacia arriba y adelante, la mano abierta
  polilinea(m, [[x + d * k * 0.06, y - k * 0.56], [x + d * k * 0.2, y - k * 0.78], [x + d * k * 0.3, y - k * 1.02]], k * 0.06, k * 0.04);
  for (let j = -1; j <= 1; j++) trazo(m, x + d * k * 0.3, y - k * 1.02, x + d * k * (0.31 + j * 0.03), y - k * 1.1, k * 0.018, k * 0.012);
}
/** Figura de pie con capucha y capa (el héroe o un peregrino), de alto `alto`, con arma opcional. La capa vuela a la derecha con `capa`. */
export function encapuchado(m: Mascara, x: number, y: number, alto: number, o: { arma?: 'espada' | 'baculo' | 'lanza'; capa?: number } = {}) {
  const k = alto, capa = o.capa ?? 0.2;
  // piernas y botas (se ven debajo de la capa)
  trazo(m, x - k * 0.05, y - k * 0.34, x - k * 0.07, y - k * 0.01, k * 0.07, k * 0.06, 1, 'max', false);
  trazo(m, x + k * 0.05, y - k * 0.34, x + k * 0.09, y - k * 0.01, k * 0.07, k * 0.06, 1, 'max', false);
  rellenar(m, [[x - k * 0.12, y], [x - k * 0.1, y - k * 0.04], [x - k * 0.03, y - k * 0.04], [x - k * 0.02, y]]);
  rellenar(m, [[x + k * 0.05, y], [x + k * 0.06, y - k * 0.04], [x + k * 0.13, y - k * 0.04], [x + k * 0.15, y]]);
  // torso y capa con el ruedo roto; la capa se abre hacia el lado del viento
  const ruedo: P2[] = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8, xx = x - k * (0.2 + capa * 0.05) + t * k * (0.4 + capa * 0.55); ruedo.push([xx, y - k * (0.2 + (i % 2) * 0.05 + t * capa * 0.25)]); }
  rellenar(m, [[x - k * 0.14, y - k * 0.78], [x + k * 0.14, y - k * 0.78], [x + k * 0.16, y - k * 0.6], ...ruedo.reverse(), [x - k * 0.17, y - k * 0.55]]);
  // capucha en punta, con el hueco de la cara apenas más claro (no hace falta: queda negra)
  rellenar(m, [[x - k * 0.1, y - k * 0.76], [x - k * 0.09, y - k * 0.88], [x - k * 0.03, y - k * 1.0], [x + k * 0.07, y - k * 0.93], [x + k * 0.1, y - k * 0.78]]);
  if (o.arma === 'espada') {
    polilinea(m, [[x + k * 0.13, y - k * 0.74], [x + k * 0.2, y - k * 0.58], [x + k * 0.2, y - k * 0.46]], k * 0.06, k * 0.05);
    trazo(m, x + k * 0.2, y - k * 0.46, x + k * 0.42, y - k * 0.02, k * 0.035, k * 0.012, 1, 'max', false);
    trazo(m, x + k * 0.15, y - k * 0.5, x + k * 0.26, y - k * 0.43, k * 0.025, k * 0.025, 1, 'max', false);
  }
  if (o.arma === 'baculo') { trazo(m, x - k * 0.2, y, x - k * 0.22, y - k * 1.12, k * 0.025); disco(m, x - k * 0.22, y - k * 1.14, k * 0.04); }
  if (o.arma === 'lanza') { trazo(m, x + k * 0.2, y, x + k * 0.26, y - k * 1.25, k * 0.022); rellenar(m, [[x + k * 0.24, y - k * 1.22], [x + k * 0.265, y - k * 1.38], [x + k * 0.29, y - k * 1.22]]); }
}

// ------------------------------------------------------------------ arquitectura
/** Muro o casa en ruinas con ventanas en arco: escribe la silueta en `m` y los huecos encendidos en `luz`. */
export function ruina(m: Mascara, luz: Mascara | null, x: number, y: number, w: number, h: number, s: number, o: { torre?: boolean; techo?: boolean; ventanas?: number } = {}) {
  const r = rng(s * 13 + 7);
  const p: P2[] = [[x, y], [x, y - h * (0.7 + r() * 0.3)]];
  // borde de arriba quebrado (o techo a dos aguas partido)
  if (o.techo) { p.push([x + w * 0.5, y - h * 1.35], [x + w * (0.62 + r() * 0.1), y - h * (1.1 + r() * 0.15)], [x + w * 0.75, y - h * 1.12]); }
  else { const n = 5; for (let k = 1; k < n; k++) p.push([x + (w * k) / n, y - h * (0.55 + r() * 0.5)]); }
  p.push([x + w, y - h * (0.6 + r() * 0.4)], [x + w, y]);
  rellenar(m, p);
  if (o.torre) {
    const tw = w * 0.32, tx = x + w * (0.1 + r() * 0.5), th = h * (1.7 + r() * 0.8);
    rellenar(m, [[tx, y], [tx, y - th], [tx + tw * 0.5, y - th - tw * (1.6 + r())], [tx + tw, y - th], [tx + tw, y]]);
  }
  const nv = o.ventanas ?? 2;
  for (let k = 0; k < nv; k++) {
    const vw = w * 0.11, vx = x + w * (0.2 + (0.6 * k) / Math.max(1, nv - 1)) - vw / 2, vy = y - h * (0.32 + r() * 0.12), vh = h * 0.24;
    const arco: P2[] = [[vx, vy], [vx, vy - vh], [vx + vw / 2, vy - vh - vw * 0.7], [vx + vw, vy - vh], [vx + vw, vy]];
    rellenar(m, arco, 1, 'restar');
    if (luz) rellenar(luz, arco, 0.6 + r() * 0.4);
  }
}
/** Silueta de aguja gótica (campanario fino). */
export function aguja(m: Mascara, x: number, y: number, w: number, h: number) {
  rellenar(m, [[x - w / 2, y], [x - w / 2, y - h * 0.55], [x - w * 0.62, y - h * 0.58], [x, y - h], [x + w * 0.62, y - h * 0.58], [x + w / 2, y - h * 0.55], [x + w / 2, y]]);
  for (const sx of [-1, 1]) rellenar(m, [[x + sx * w * 0.5, y - h * 0.5], [x + sx * w * 0.66, y - h * 0.68], [x + sx * w * 0.8, y - h * 0.5]]);
}

// ------------------------------------------------------------------ fuego y humo
/** Lenguas de fuego en `m` (para pintarlas como luz) con base en (x, y), ancho w y alto h. */
export function llamas(m: Mascara, x: number, y: number, w: number, h: number, s: number, fase = 0) {
  const r = rng(s * 7 + 1), n = 3 + Math.floor(w / 10);
  for (let k = 0; k < n; k++) {
    const cx = x + (r() - 0.5) * w, alto = h * (0.4 + r() * 0.6) * (0.85 + 0.15 * Math.sin(fase * 6.283 + k * 2.1)), ancho = w * (0.18 + r() * 0.2);
    const tip: P2 = [cx + (r() - 0.5) * ancho * 1.4 + Math.sin(fase * 6.283 * 2 + k) * ancho * 0.3, y - alto];
    rellenar(m, [[cx - ancho / 2, y], [cx - ancho * 0.42, y - alto * 0.35], [tip[0] - ancho * 0.08, tip[1] + alto * 0.2], tip, [tip[0] + ancho * 0.12, tip[1] + alto * 0.3], [cx + ancho * 0.45, y - alto * 0.3], [cx + ancho / 2, y]], 0.55 + r() * 0.45);
  }
}
/**
 * Columna de humo que sube desde (x, y) hasta `alto` px, inclinada por el viento: devuelve su densidad en una
 * máscara (para pintarla oscura) y en `base` la parte de abajo (para teñirla del fuego).
 */
export function humo(m: Mascara, x: number, y: number, alto: number, ancho: number, viento: number, s: number, base?: Mascara) {
  const y0 = Math.max(0, Math.floor(y - alto)), y1 = Math.min(m.h - 1, Math.floor(y));
  for (let yy = y0; yy <= y1; yy++) {
    const t = (y - yy) / alto, cx = x + viento * alto * t * t, wd = ancho * (0.25 + t * 1.6);
    const x0 = Math.max(0, Math.floor(cx - wd * 1.4)), x1 = Math.min(m.w - 1, Math.ceil(cx + wd * 1.4));
    for (let xx = x0; xx <= x1; xx++) {
      const u = (xx - cx) / wd;
      const n = fbm(xx / (ancho * 0.7), (yy + t * 40) / (ancho * 0.7), 5, s);
      const d = sat((1 - u * u * 0.8) * 1.2 - 0.2) * suave(0.32, 0.62, n + (1 - Math.abs(u)) * 0.15) * (1 - suave(0.7, 1, t)) * suave(0, 0.06, t);
      const i = yy * m.w + xx;
      if (d > m.d[i]) m.d[i] = d;
      if (base) base.d[i] = Math.max(base.d[i], d * (1 - suave(0, 0.45, t)));
    }
  }
}

// ------------------------------------------------------------------ nubes
export interface OpcNubes {
  y0: number; y1: number; seed: number;
  /** tamaño de las nubes en px */
  escala?: number;
  /** cuánto del cielo cubren (0..1) */
  cubre?: number;
  /** color de la masa, de la panza iluminada desde abajo y del borde de arriba */
  masa?: C3; panza?: C3; filo?: C3;
  /** luz de abajo según x (0..1+), por ejemplo más fuerte sobre los incendios */
  luzX?: (x: number) => number;
  /** repetir cada `per` px en x (para capas que se enrollan) */
  per?: number;
  /** estiradas a lo ancho */
  estira?: number;
  /** opacidad máxima */
  alfa?: number;
}
/** Densidad de las nubes (0..1) en la franja y0..y1, una fila por pixel: la misma para pintar y para el relámpago. */
export function campoNubes(w: number, o: OpcNubes): { D: Float32Array; y0: number; H: number } {
  const esc = o.escala ?? 220, est = o.estira ?? 2.2, y0 = Math.max(0, Math.floor(o.y0)), H = Math.ceil(o.y1) - y0 + 1;
  // con `per` la escala se ajusta para que entren vueltas enteras (si no, queda una costura)
  const ex = o.per ? o.per / Math.max(1, Math.round(o.per / (esc * est))) : esc * est;
  const D = new Float32Array(w * H), cubre = o.cubre ?? 0.55, per = o.per ? o.per / ex : 0;
  for (let y = 0; y < H; y++) {
    const yy = y + y0, env = suave(0, 0.18, (yy - o.y0) / (o.y1 - o.y0)) * (1 - suave(0.7, 1, (yy - o.y0) / (o.y1 - o.y0)));
    for (let x = 0; x < w; x++) {
      const qx = x / ex, qy = yy / esc;
      const wx = fbm(qx * 2, qy * 1.3, 3, o.seed + 5, per ? per * 2 : 0) - 0.5;
      const v = fbm(qx + wx * 0.8, qy + wx * 0.5, 6, o.seed, per);
      D[y * w + x] = suave(1 - cubre - 0.08, 1 - cubre + 0.22, v) * env;
    }
  }
  return { D, y0, H };
}
/** Nubes de tormenta pintadas encima de la lámina (con alfa: sirven para capas transparentes). */
export function nubes(L: Lamina, o: OpcNubes) {
  const { w } = L, esc = o.escala ?? 220;
  const { D, y0, H } = campoNubes(w, o);
  const masa = o.masa ?? [0.05, 0.045, 0.06], panza = o.panza ?? [0.75, 0.22, 0.06], filo = o.filo ?? [0.22, 0.24, 0.3], alfa = o.alfa ?? 1;
  const dl = Math.max(2, Math.round(esc * 0.06));
  const sombra = new Float32Array(D); desenfocar(sombra, w, H, esc * 0.08);
  const gx = o.per ? o.per / Math.round(o.per / 18) : 18;
  for (let y = 0; y < Math.min(H, L.h - y0); y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, d = D[i]; if (d <= 0.001) continue;
    const abajo = y + dl < H ? D[i + dl * w] : 0, arriba = y - dl >= 0 ? D[i - dl * w] : 0;
    const lp = sat((d - abajo) * 2.2 + 0.15 * (1 - sombra[i])), lf = sat((d - arriba) * 1.6);
    const lx = o.luzX ? o.luzX(x) : 1, prof = (y + y0 - o.y0) / (o.y1 - o.y0);
    let c = mezcla(masa, mezcla(masa, panza, 0.35 + prof * 0.4), sat(lx * 0.5));
    c = [c[0] + panza[0] * lp * lx + filo[0] * lf * 0.6, c[1] + panza[1] * lp * lx + filo[1] * lf * 0.6, c[2] + panza[2] * lp * lx + filo[2] * lf * 0.6];
    // grumos: la textura interna de la nube
    const gr = 0.8 + 0.4 * hash2(x >> 1, (y + y0) >> 1, o.seed) * 0.25 + (fbm(x / gx, (y + y0) / 18, 3, o.seed + 9, o.per ? o.per / gx : 0) - 0.5) * 0.5;
    c = [c[0] * gr, c[1] * gr, c[2] * gr];
    const a = sat(d * 1.1) * alfa, j = ((y + y0) * w + x) * 4;
    L.d[j] = L.d[j] * (1 - a) + c[0] * a; L.d[j + 1] = L.d[j + 1] * (1 - a) + c[1] * a; L.d[j + 2] = L.d[j + 2] * (1 - a) + c[2] * a; L.d[j + 3] = L.d[j + 3] * (1 - a) + a;
  }
}

/** Una máscara vacía del tamaño de la lámina. */
export const mascaraDe = (L: Lamina) => mascara(L.w, L.h);
