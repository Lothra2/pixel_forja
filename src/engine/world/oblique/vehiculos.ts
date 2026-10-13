import { Pix } from '../../fx/pix';
import { makeRamp } from '../../color/ramp';
import type { Raster } from '../../core/raster';

/**
 * Vehículos y objetos de escenario en la vista inclinada del juego (lote D2): ferry, xích lô, motos, thúng chai,
 * la cabina del metrocable, jacintos y fruta regada.
 *
 * La proyección es la del escenario: un punto del mundo (x, y, z) cae en pantalla en (x + K·y, y − z), con K la
 * `inclinacion` del juego (0.35). Se ve el techo, el frente y la cara izquierda. Contorno #1e1418, sombreado en bandas
 * (rampas de 4 tonos) y la luz desde la izquierda.
 *
 * Cada vehículo sale en una tira de cuadros del mismo tamaño. El `ancla` es dónde cae en el cuadro la esquina de
 * atrás a la izquierda de la huella, en el piso: el juego pone ahí el (x, y) del vehículo, como el ferry gris de hoy.
 */

export const K_INCLINACION = 0.35;
const INK = '#1e1418';
type Ramp = [string, string, string, string];
const R = (hex: string): Ramp => makeRamp(hex) as Ramp;

/** Un lienzo con el origen del mundo corrido: pinta en coordenadas de mundo con la proyección inclinada. */
class Obl {
  readonly p: Pix;
  constructor(readonly w: number, readonly h: number, readonly ox: number, readonly oy: number, readonly k = K_INCLINACION) { this.p = new Pix(w, h); }
  /** de mundo (x, y, z) a pantalla */
  s(x: number, y: number, z: number): [number, number] { return [Math.round(this.ox + x + this.k * y), Math.round(this.oy + y - z)]; }
  px(x: number, y: number, c: string) { this.p.px(x, y, c); }
  /** polígono convexo relleno, en pantalla */
  poly(pts: [number, number][], c: string) {
    const ys = pts.map((q) => q[1]);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        if ((y >= Math.min(y0, y1)) && (y <= Math.max(y0, y1)) && y0 !== y1) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        else if (y0 === y1 && y === y0) xs.push(x0, x1);
      }
      if (!xs.length) continue;
      const a = Math.round(Math.min(...xs)), b = Math.round(Math.max(...xs));
      for (let x = a; x <= b; x++) this.p.px(x, y, c);
    }
  }
  /** Prisma: huella (x, y, w, d), de z0 a z1. Techo claro, frente base, cara izquierda en sombra. */
  prism(x: number, y: number, w: number, d: number, z0: number, z1: number, r: Ramp, techo = true) {
    const a = this.s(x, y, z1), b = this.s(x + w, y, z1), c = this.s(x + w, y + d, z1), e = this.s(x, y + d, z1);
    const e0 = this.s(x, y + d, z0), c0 = this.s(x + w, y + d, z0), a0 = this.s(x, y, z0);
    this.poly([a, e, e0, a0], r[1]); // cara izquierda
    this.poly([e, c, c0, e0], r[2]); // frente
    if (techo) this.poly([a, b, c, e], r[3]); // techo
  }
  /** rueda vertical en el plano x-z (a lo largo de la marcha), centrada en (x, y, z): una elipse y su rayo que gira */
  rueda(x: number, y: number, z: number, rad: number, fase: number, llanta = '#2a2a30', rin = '#b8bcc4') {
    const [cx, cy] = this.s(x, y, z);
    this.p.disc(cx, cy, rad, llanta);
    if (rad >= 3) this.p.disc(cx, cy, rad - 2, rin);
    if (rad >= 3) this.p.disc(cx, cy, 1, llanta);
    const a = fase * Math.PI * 2;
    if (rad >= 4) this.p.line(cx - Math.round(Math.cos(a) * (rad - 2)), cy - Math.round(Math.sin(a) * (rad - 2)), cx + Math.round(Math.cos(a) * (rad - 2)), cy + Math.round(Math.sin(a) * (rad - 2)), llanta);
  }
  get raster(): Raster { return this.p.r; }
}

/** Una persona chiquita sentada o parada (conductor, pasajero), de 12 a 14 px: cabeza con casco o nón lá, torso y brazos. */
function persona(o: Obl, x: number, y: number, z: number, ropa: string, piel: string, gorro: 'casco' | 'non_la' | 'nada', gorroColor: string, opts: { brazo?: [number, number]; sentado?: boolean; mira?: -1 | 1; bob?: number } = {}) {
  const ro = R(ropa), pi = R(piel), go = R(gorroColor);
  const [hx, hy] = o.s(x, y, z + (opts.sentado ? 9 : 13) + (opts.bob ?? 0));
  // torso
  o.p.rect(hx - 2, hy + 4, 5, opts.sentado ? 5 : 7, ro[2]);
  o.p.rect(hx - 2, hy + 4, 1, opts.sentado ? 5 : 7, ro[1]);
  // piernas (paradas)
  if (!opts.sentado) { o.p.rect(hx - 2, hy + 11, 2, 3, '#2c3346'); o.p.rect(hx + 1, hy + 11, 2, 3, '#2c3346'); }
  // brazo hacia el manubrio o el pedal
  if (opts.brazo) o.p.line(hx + (opts.mira ?? -1) * 1, hy + 5, opts.brazo[0], opts.brazo[1], pi[2]);
  // cabeza
  o.p.disc(hx, hy + 1, 2, pi[2]);
  o.p.px(hx + (opts.mira ?? -1) * 2, hy + 1, pi[1]);
  if (gorro === 'casco') { o.p.disc(hx, hy, 3, go[2]); o.p.rect(hx - 3, hy, 7, 1, go[1]); o.p.px(hx - 1, hy - 2, go[3]); }
  if (gorro === 'non_la') { for (let j = 0; j < 3; j++) o.p.rect(hx - j * 2, hy - 3 + j, 1 + j * 4, 1, j === 2 ? go[1] : go[3 - (j & 1)]); }
}

export interface VehiculoHoja {
  id: string;
  /** tira de cuadros, todos de w × h */
  cuadros: Raster[];
  w: number;
  h: number;
  /** dónde cae la esquina de atrás a la izquierda de la huella, en el piso */
  ancla: [number, number];
  huella: { w: number; d: number; z: number };
  /** animaciones: primer cuadro, cuántos y fps */
  anims: Record<string, { desde: number; cuadros: number; fps: number; loop: boolean }>;
  /** hacia dónde va de frente (-1 izquierda, 1 derecha). El espejo del juego no sirve: la cara izquierda cambiaría */
  dir?: -1 | 1;
}

/** Arma la hoja con varias animaciones, todas en el mismo marco. */
function hoja(id: string, w: number, h: number, ancla: [number, number], huella: VehiculoHoja['huella'], partes: [string, number, boolean, (i: number, o: Obl) => void, number][], k = K_INCLINACION, dir?: -1 | 1): VehiculoHoja {
  const cuadros: Raster[] = [];
  const anims: VehiculoHoja['anims'] = {};
  for (const [nombre, n, loop, dibuja, fps] of partes) {
    anims[nombre] = { desde: cuadros.length, cuadros: n, fps, loop };
    for (let i = 0; i < n; i++) {
      const o = new Obl(w, h, ancla[0], ancla[1], k);
      dibuja(i, o);
      o.p.outline(INK);
      cuadros.push(o.raster);
    }
  }
  return { id, cuadros, w, h, ancla, huella, anims, ...(dir ? { dir } : {}) };
}

// ------------------------------------------------------------------ moto

export const MOTO_COLORES = { rojo: '#d43a2f', azul: '#2f6fd4', amarillo: '#e8b923', verde: '#3a9a4a' } as const;
export type MotoColor = keyof typeof MOTO_COLORES;

/**
 * Moto con conductor (casco del color de la moto), de frente a la izquierda como en los layouts del hẻm.
 * `andando`: ruedas que giran, el conductor rebota y sale humito. `frenando`: la trompa baja, la luz de freno y el
 * polvo de la rueda. `corneta`: el conductor mira atrás y salen las rayitas del pito.
 */
export function moto(color: MotoColor, k = K_INCLINACION): VehiculoHoja {
  const L = 26, D = 6, c = R(MOTO_COLORES[color]);
  const ropa = { rojo: '#f2efe6', azul: '#e8c25a', amarillo: '#5a6e8c', verde: '#c8503c' }[color];
  const dibuja = (o: Obl, fase: number, opts: { bob?: number; frena?: boolean; pito?: number; humo?: number }) => {
    const nose = opts.frena ? 1 : 0;
    // ruedas: la de adelante a la izquierda (x chico)
    o.rueda(5, D / 2, 4 - nose, 4, fase);
    o.rueda(L - 5, D / 2, 4, 4, fase + 0.3);
    // chasis: el cuerpo de la moto entre las ruedas, el asiento y el escudo de adelante
    o.prism(6, 1, L - 12, D - 2, 5 - nose, 9 - nose, c);
    o.prism(3, 1, 4, D - 2, 6 - nose, 13 - nose, c); // escudo y manubrio
    o.prism(L - 12, 1, 9, D - 2, 9, 11, R('#2a2a30')); // asiento
    o.prism(L - 4, 2, 4, 2, 5, 7, R('#9aa0aa')); // escape
    // faro y luz de freno
    const [fx, fy] = o.s(2, D / 2, 11 - nose); o.p.rect(fx, fy, 2, 2, '#ffe9a0');
    const [bx, by] = o.s(L - 2, D / 2, 9); o.p.rect(bx, by, 2, 1, opts.frena ? '#ff3a2a' : '#8a2a22');
    // conductor sentado, las manos al manubrio
    const [mx, my] = o.s(4, D / 2, 13 - nose);
    persona(o, L - 10, D / 2, 7 + (opts.bob ?? 0), ropa, '#c58a62', 'casco', MOTO_COLORES[color], { brazo: [mx + 1, my], sentado: false, mira: (opts.pito ?? 0) > 0 ? 1 : -1 });
    // humo del escape
    if (opts.humo) { const [hx, hy] = o.s(L + 1 + opts.humo, D / 2, 6 + opts.humo); o.p.disc(hx, hy, 1 + (opts.humo > 1 ? 1 : 0), '#c9c6c0'); }
    // el pito: rayitas delante de la moto
    if (opts.pito) { const [px, py] = o.s(-2, D / 2, 12); for (let j = 0; j < opts.pito; j++) { o.p.line(px - 2 - j * 3, py - 3 + j, px - 4 - j * 3, py - 4 - j, '#fff6c8'); o.p.line(px - 2 - j * 3, py + 1 + j, px - 4 - j * 3, py + 2 + j, '#fff6c8'); } }
    // polvo de la frenada
    if (opts.frena) { const [dx, dy] = o.s(L - 3, D, 0); o.p.disc(dx + 3, dy - 1, 2, '#d8c8a8'); o.p.disc(dx + 6, dy - 2, 1, '#e8dcc4'); }
  };
  const W = 44, H = 34, anc: [number, number] = [8, 28];
  return hoja(`moto_${color}`, W, H, anc, { w: L, d: D, z: 20 }, [
    ['andando', 4, true, (i, o) => dibuja(o, i / 4, { bob: i % 2 ? 0 : 1, humo: (i % 4) + 1 > 3 ? 0 : (i % 4) + 1 }), 12],
    ['frenando', 3, false, (i, o) => dibuja(o, 0.1 * i, { frena: true }), 10],
    ['corneta', 4, true, (i, o) => dibuja(o, i / 4, { pito: 1 + (i % 3), bob: i % 2 }), 10],
  ], k, -1);
}

// ------------------------------------------------------------------ xích lô

/**
 * Xích lô de frente a la izquierda: el pasajero va adelante en su asiento con capota, entre las dos ruedas de
 * adelante, y el que pedalea atrás, con nón lá, sobre la rueda de atrás. `andando`: ruedas y pedaleo.
 */
export function xichLo(k = K_INCLINACION): VehiculoHoja {
  const L = 34, D = 10, azul = R('#2f5fa8'), crema = R('#efe2c0'), rojo = R('#b8322a');
  const W = 56, H = 40, anc: [number, number] = [8, 33];
  return hoja('xich_lo', W, H, anc, { w: L, d: D, z: 26 }, [
    ['andando', 4, true, (i, o) => {
      const f = i / 4;
      o.rueda(5, D - 1, 5, 5, f); // la rueda de adelante de este lado
      o.rueda(L - 4, D / 2, 5, 5, f + 0.25); // la de atrás
      // el asiento del pasajero: la caja azul, el respaldo y la capota roja
      o.prism(1, 1, 12, D - 2, 5, 10, azul);
      o.prism(10, 1, 3, D - 2, 10, 17, crema);
      o.prism(7, 1, 7, D - 2, 17, 19, rojo);
      // el pasajero sentado, de cara a la izquierda
      persona(o, 7, D / 2, 4, '#e06a8a', '#e0b08a', 'nada', '#000000', { sentado: true, mira: -1 });
      // el cuadro de la bici de atrás
      const [ax, ay] = o.s(12, D / 2, 8), [bx, by] = o.s(L - 4, D / 2, 5), [sx, sy] = o.s(L - 8, D / 2, 14);
      o.p.thick(ax, ay, bx, by, 1, '#2a2a30'); o.p.thick(bx, by, sx, sy, 1, '#2a2a30'); o.p.rect(sx - 2, sy - 1, 4, 1, '#2a2a30');
      // el que pedalea, con nón lá, las piernas al pedal que gira
      const a = f * Math.PI * 2, [px, py] = o.s(L - 8, D / 2, 5);
      persona(o, L - 8, D / 2, 6 + (i % 2), '#4a6a3a', '#a8704a', 'non_la', '#e6c77a', { brazo: o.s(12, D / 2, 12) as [number, number], mira: -1 });
      o.p.line(sx, sy + 1, px + Math.round(Math.cos(a) * 3), py + Math.round(Math.sin(a) * 2), '#2c3346');
      o.rueda(5, 1, 5, 5, f); // la rueda de adelante del otro lado, adelante de todo
    }, 10],
  ], k, -1);
}

// ------------------------------------------------------------------ ferry

/**
 * El ferry del río, de 110 × 40 de huella y 12 de alto, como el gris del juego: casco rojo, cubierta de tablas con
 * baranda, la caseta del timón a la derecha, salvavidas y la bandera. La gente se para en la cubierta (a z = 12).
 * `andando`: la bandera flamea y la espuma corre en la proa. `atracado`: se mece despacio.
 */
export function ferry(k = K_INCLINACION): VehiculoHoja {
  const w = 110, d = 40, z = 12, kd = Math.round(k * d);
  const casco = R('#a8382c'), blanco = R('#e8e2d4'), tabla = R('#b48a5a'), azul = R('#2c4a7a');
  const W = w + kd + 10, H = d + z + 34, anc: [number, number] = [4, 30];
  const dibuja = (o: Obl, i: number, andando: boolean) => {
    const bob = andando ? 0 : (i % 2);
    const Z = (v: number) => v - bob;
    // casco: franja roja abajo y blanca arriba
    o.prism(0, 0, w, d, Z(0), Z(7), casco, false);
    o.prism(0, 0, w, d, Z(7), Z(z), blanco, false);
    // la cubierta de tablas
    const a = o.s(0, 0, Z(z)), b = o.s(w, 0, Z(z)), c = o.s(w, d, Z(z)), e = o.s(0, d, Z(z));
    o.poly([a, b, c, e], tabla[2]);
    for (let x = 6; x < w; x += 8) { const [x0, y0] = o.s(x, 0, Z(z)), [x1, y1] = o.s(x, d, Z(z)); o.p.line(x0, y0, x1, y1, tabla[1]); }
    // la baranda de atrás y la de adelante (de la de adelante solo los parales, para no tapar a la gente)
    for (let x = 0; x <= w; x += 6) { const [x0, y0] = o.s(x, 1, Z(z)); o.p.rect(x0, y0 - 5, 1, 5, '#e8e2d4'); }
    { const [x0, y0] = o.s(0, 1, Z(z) + 5), [x1, y1] = o.s(w, 1, Z(z) + 5); o.p.line(x0, y0, x1, y1, '#e8e2d4'); }
    for (let x = 0; x <= w; x += 12) { const [x0, y0] = o.s(x, d - 1, Z(z)); o.p.rect(x0, y0 - 3, 1, 3, '#c8c0b0'); }
    // la caseta del timón a la derecha, con sus ventanas
    o.prism(w - 24, 6, 20, 16, Z(z), Z(z) + 16, blanco);
    o.prism(w - 26, 4, 24, 20, Z(z) + 16, Z(z) + 18, azul);
    for (let j = 0; j < 3; j++) { const [vx, vy] = o.s(w - 22 + j * 6, 22, Z(z) + 12); o.p.rect(vx, vy, 4, 3, '#7fb3d8'); }
    // salvavidas en el costado
    for (const sx of [20, 50, 80]) { const [cx, cy] = o.s(sx, d, Z(10)); o.p.disc(cx, cy, 2, '#f08a2a'); o.p.px(cx, cy, '#e8e2d4'); }
    // el mástil con la bandera de Vietnam que flamea
    const [mx, my] = o.s(w - 14, 14, Z(z) + 18);
    o.p.rect(mx, my - 12, 1, 12, '#8a8a90');
    const ola = andando ? i % 4 : 0;
    for (let x = 0; x < 9; x++) { const yy = my - 12 + Math.round(Math.sin((x + ola * 2) * 0.8) * (andando ? 1 : 0.4)); o.p.rect(mx + 1 + x, yy, 1, 6, '#da251d'); }
    o.p.px(mx + 5, my - 10, '#ffcd00'); o.p.px(mx + 4, my - 9, '#ffcd00'); o.p.px(mx + 5, my - 9, '#ffcd00'); o.p.px(mx + 6, my - 9, '#ffcd00');
    // la espuma en la proa (a la izquierda) y la estela
    if (andando) for (let j = 0; j < 4; j++) { const [ex, ey] = o.s(-2 - ((i + j) % 4) * 2, d - j * 8, 1); o.p.rect(ex - 2, ey, 3, 1, '#f4f8fc'); }
  };
  return hoja('ferry', W, H, anc, { w, d, z }, [
    ['andando', 4, true, (i, o) => dibuja(o, i, true), 8],
    ['atracado', 2, true, (i, o) => dibuja(o, i, false), 2],
  ], k);
}

// ------------------------------------------------------------------ thúng chai

/** El thúng chai, el bote redondo de bambú tejido, con el remero de nón lá. `meciendo`: se balancea y rema. */
export function boteBambu(k = K_INCLINACION): VehiculoHoja {
  const D = 18, W = 34, H = 34, anc: [number, number] = [6, 22];
  return hoja('bote_bambu', W, H, anc, { w: D, d: D, z: 6 }, [
    ['meciendo', 4, true, (i, o) => {
      const t = [0, 1, 0, -1][i];
      const [cx, cy] = o.s(D / 2, D / 2, 2 + (i % 2));
      // el cuenco: la elipse oscura afuera y la boca más clara, con el tejido en bandas
      o.p.disc(cx, cy + 2, 10, '#5a3c22', 0.55);
      o.p.disc(cx, cy, 10, '#8a6234', 0.45);
      o.p.disc(cx, cy, 8, '#5a3c22', 0.4);
      for (let a = 0; a < 12; a++) { const ang = (a / 12) * Math.PI * 2; o.p.px(cx + Math.round(Math.cos(ang) * 9), cy + Math.round(Math.sin(ang) * 4), '#b48a5a'); }
      // el remero, el remo que entra al agua
      persona(o, D / 2 + 2, D / 2, 1 + (i % 2), '#3a6a8c', '#a8704a', 'non_la', '#e6c77a', { brazo: [cx - 8 + t * 2, cy + 3], mira: -1 });
      o.p.line(cx - 2, cy - 6, cx - 9 + t * 2, cy + 5, '#7a5a34');
    }, 6],
  ], k);
}

// ------------------------------------------------------------------ metrocable

/**
 * La cabina del metrocable de la línea J de Medellín colgando del cable: roja y blanca, con ventanas y su brazo.
 * `colgando`: se mece un poco al avanzar. El juego mueve la cabina por el cable.
 */
export function metrocable(): VehiculoHoja {
  const W = 30, H = 34, anc: [number, number] = [6, 30];
  return hoja('metrocable', W, H, anc, { w: 16, d: 10, z: 14 }, [
    ['colgando', 4, true, (i, o) => {
      const s = [0, 1, 0, -1][i];
      // el cable, en diagonal por arriba
      o.p.line(0, 4, W - 1, 0, '#2a2a30');
      // el brazo desde la polea
      o.p.rect(15, 2, 1, 14, '#5a5e66'); o.p.rect(13, 1, 5, 2, '#5a5e66');
      // la cabina, un poco corrida por el vaivén: roja abajo, blanca con ventanas y el techo rojo
      o.prism(1 + s, 1, 16, 10, 0, 6, R('#c8322a'));
      o.prism(1 + s, 1, 16, 10, 6, 13, R('#f2efe8'));
      o.prism(1 + s, 1, 16, 10, 13, 14, R('#c8322a'));
      for (let j = 0; j < 3; j++) { const [vx, vy] = o.s(3 + s + j * 5, 11, 11); o.p.rect(vx, vy, 3, 3, '#6aa0c8'); }
    }, 6],
  ]);
}

// ------------------------------------------------------------------ jacintos y fruta regada

/** Jacintos de agua que flotan: la roseta de hojas y el ramillete lila. `flotando`: suben y bajan con el agua. */
export function jacintos(): VehiculoHoja {
  const W = 26, H = 16, anc: [number, number] = [4, 12];
  return hoja('jacintos', W, H, anc, { w: 18, d: 6, z: 6 }, [
    ['flotando', 2, true, (i, o) => {
      const dy = i;
      for (const [x, y, r] of [[6, 10 + dy, 4], [12, 9 + dy, 5], [18, 10 + dy, 4]] as const) { o.p.disc(x, y, r, '#3e8a3a', 0.6); o.p.disc(x - 1, y - 1, r - 2, '#62b04a', 0.6); }
      for (const [x, y] of [[11, 4 + dy], [13, 3 + dy], [12, 5 + dy]] as const) o.p.disc(x, y, 1, '#b48ad8');
      o.p.rect(12, 6 + dy, 1, 2, '#3e8a3a');
    }, 3],
  ]);
}

/** Fruta regada en el piso (cuando se cae un puesto): mangos, naranjas, pitahayas y un racimo de cambur. Sin animación. */
export function frutasRegadas(): VehiculoHoja {
  const W = 40, H = 14, anc: [number, number] = [2, 10];
  return hoja('frutas_regadas', W, H, anc, { w: 34, d: 10, z: 4 }, [
    ['quieta', 1, false, (_i, o) => {
      const fr: [number, number, string, string][] = [[5, 9, '#f2c230', '#c88a1a'], [11, 7, '#f08a2a', '#c8601a'], [17, 10, '#e0457a', '#9a2a52'], [24, 8, '#f2c230', '#c88a1a'], [30, 10, '#f08a2a', '#c8601a'], [35, 7, '#e0457a', '#9a2a52']];
      for (const [x, y, c, s] of fr) { o.p.disc(x, y, 2, c); o.p.px(x + 1, y + 1, s); o.p.px(x - 1, y - 1, '#fff2c0'); }
      // el racimo de cambur
      for (let j = 0; j < 3; j++) o.p.rect(20 + j * 2, 3 + j, 2, 4, '#f2d44a');
      o.p.rect(20, 2, 6, 1, '#5a6a2a');
      // hojitas de la pitahaya
      o.p.px(17, 7, '#62b04a'); o.p.px(35, 4, '#62b04a');
    }, 1],
  ]);
}

/** Todos los vehículos y objetos del lote, por id. */
export function vehiculosD2(k = K_INCLINACION): VehiculoHoja[] {
  return [ferry(k), xichLo(k), ...(Object.keys(MOTO_COLORES) as MotoColor[]).map((c) => moto(c, k)), boteBambu(k), metrocable(), jacintos(), frutasRegadas()];
}
export const VEHICULOS_D2 = ['ferry', 'xich_lo', 'moto_rojo', 'moto_azul', 'moto_amarillo', 'moto_verde', 'bote_bambu', 'metrocable', 'jacintos', 'frutas_regadas'] as const;
