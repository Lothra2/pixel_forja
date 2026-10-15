import { Pix } from '../../fx/pix';
import { makeRamp } from '../../color/ramp';
import { createRaster, blit, type Raster } from '../../core/raster';
import { renderHuman, reachArm } from '../../render/human';
import { makeCtx, P, type Ctx } from '../../anim/types';
import { dimsFor } from '../../rig/dims';
import { defaultAvatar } from '../../head3d/avatar';
import { fichaFromAvatar } from '../../sheet/build';
import type { HumanFicha } from '../../sheet/ficha';
import type { Pose } from '../../rig/pose';

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

// ------------------------------------------------------------------ la gente a escala de atleta (lote D3)

/** Cómo se viste uno que maneja: piel, pelo, franela, pantalón y el gorro (el casco del color de la moto, el nón lá). */
interface Pinta { piel: string; pelo: string; ropa: string; pantalon: string; gorro?: { id: string; color: string }; manga?: 'short' | 'long' }

/** Una persona del motor (la misma de los atletas), a 48: el conductor del alto de un atleta, no un muñequito. */
function fichaConductor(nombre: string, t: Pinta): HumanFicha {
  const av = defaultAvatar();
  const a = { ...av, skin: t.piel, hair: { ...av.hair, color: t.pelo }, lpc: { ...av.lpc!, ...(t.gorro ? { hat: t.gorro.id, hatColor: t.gorro.color } : {}) } };
  const f = fichaFromAvatar(nombre, a, { sleeves: t.manga ?? 'short', bottom: 'pants', socks: 'low' }) as HumanFicha;
  return { ...f, palette: { ...f.palette, top: makeRamp(t.ropa), bottom: makeRamp(t.pantalon) }, movementProfile: 'premium' } as HumanFicha;
}

const ctx48 = (f: HumanFicha): Ctx => makeCtx(dimsFor(48, f.body.proportions), f.body.proportions.build, 'side');

/** El espejo de un cuadro: el motor dibuja de lado mirando a la derecha y los vehículos van a la izquierda. */
function espejo(r: Raster): Raster {
  const o = createRaster(r.w, r.h);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const a = (y * r.w + x) * 4, b = (y * r.w + (r.w - 1 - x)) * 4; for (let k = 0; k < 4; k++) o.data[b + k] = r.data[a + k]; }
  return o;
}

/** La cadera de las poses sentadas sobre el piso del cuadro: solo cambia dónde queda el piso, la cadera se pega al asiento. */
const CADERA = 12;

/**
 * Pinta a la persona sentada con la cadera en el punto de mundo (x, y, z) del vehículo, mirando a la izquierda. Sale
 * del mismo dibujo que un atleta (el cuadro grande del motor, a 48: del mismo alto y con el mismo pixel), sin recortar a
 * la celda, porque sentado en un vehículo alto los pies y la cabeza no caben en 48.
 */
function sentar(o: Obl, f: HumanFicha, pose: Pose, x: number, y: number, z: number) {
  const b = renderHuman(f, 48, pose, 'side', { props: true }), hip = b.joints!.hip;
  const [hx, hy] = o.s(x, y, z);
  // el motor dibuja de lado mirando a la derecha: espejado, la cadera queda en w - 1 - x
  blit(o.p.r, espejo(b.raster), hx - (b.raster.w - 1 - Math.round(hip[0])), hy - Math.round(hip[1]));
}

/**
 * Sentado en la moto: la cadera en el asiento, los muslos adelante, los pies en los posapiés y las manos al manubrio.
 * `torso` lo echa adelante (frenando), `pito` levanta el brazo de atrás reclamando y abre la boca.
 */
function poseMoto(c: Ctx, o: { torso?: number; pito?: boolean; bob?: number } = {}): Pose {
  const t = o.torso ?? 8, mano = reachArm(c.d, t, [16, -7]);
  return P(c, {
    torso: t, hipH: CADERA + (o.bob ?? 0), head: { tilt: -Math.round(t / 3), dx: 0, dy: 0 },
    legs: { near: { x: 11, y: 11, toe: 10 }, far: { x: 9, y: 11, toe: 10 } },
    arms: { near: mano, far: o.pito ? { shoulder: 150, elbow: 60 } : { ...mano } },
    face: o.pito ? { eyes: 'angry', mouth: 'open' } : { eyes: 'open', mouth: 'smile' },
  });
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
 * Moto con conductor (casco del color de la moto), de frente a la izquierda como en los layouts del hẻm. A escala de
 * atleta (lote D3): 52 de largo y el conductor es una persona del motor, de unos 40 px parada (32 sentada con el casco).
 * `andando`: ruedas que giran, el conductor rebota y sale humito. `frenando`: la trompa baja, el conductor se va
 * adelante, la luz de freno y el polvo de la rueda. `corneta`: pita con el brazo arriba y salen las rayitas del pito.
 */
export function moto(color: MotoColor, k = K_INCLINACION): VehiculoHoja {
  const L = 52, D = 12, c = R(MOTO_COLORES[color]);
  const ropa = { rojo: '#f2efe6', azul: '#e8c25a', amarillo: '#5a6e8c', verde: '#c8503c' }[color];
  const f = fichaConductor(`motorizado_${color}`, { piel: '#c58a62', pelo: '#2a2018', ropa, pantalon: '#2c3346', gorro: { id: 'casco_ciclista', color: MOTO_COLORES[color] } });
  const cx = ctx48(f);
  const dibuja = (o: Obl, fase: number, opts: { bob?: number; frena?: boolean; pito?: number; humo?: number }) => {
    const nose = opts.frena ? 2 : 0, negro = R('#2a2a30'), metal = R('#9aa0aa');
    // la rueda de atrás y la de adelante, con el guardafango de adelante encima
    o.rueda(43, D / 2, 8, 8, fase + 0.3);
    o.rueda(9, D / 2, 8 - nose, 8, fase);
    o.prism(3, 3, 12, D - 6, 15 - nose, 17 - nose, c);
    // la horquilla del manubrio, del eje de adelante hasta el faro
    const [ax, ay] = o.s(9, D / 2, 8 - nose), [bx0, by0] = o.s(14, D / 2, 27 - nose);
    o.p.thick(ax, ay, bx0, by0, 1, '#5a5e66');
    // el escudo de las piernas y el piso bajo donde van los pies (la moto de paso bajo de Saigón)
    o.prism(13, 2, 6, D - 4, 10 - nose / 2, 26 - nose, c);
    o.prism(18, 2, 11, D - 4, 8, 11, negro);
    // la carrocería de atrás, que sube hasta el asiento, la parrilla y la luz
    o.prism(27, 2, 20, D - 4, 9, 17, c);
    o.prism(31, 2, 17, D - 4, 17, 19, c);
    o.prism(25, 2, 20, D - 4, 19, 22, negro); // asiento
    o.prism(44, 2, 6, D - 4, 22, 23, metal); // parrilla
    o.prism(38, 10, 13, 2, 6, 8, metal); // escape
    // el faro con su capota sobre el manubrio, y el manubrio de lado a lado
    o.prism(10, 2, 9, D - 4, 26 - nose, 31 - nose, c);
    o.prism(15, 0, 2, D, 30 - nose, 31 - nose, negro);
    const [fx, fy] = o.s(9, D / 2, 30 - nose); o.p.rect(fx - 2, fy, 3, 3, '#ffe9a0');
    const [lx, ly] = o.s(L - 2, D / 2, 18); o.p.rect(lx, ly, 3, 2, opts.frena ? '#ff3a2a' : '#8a2a22');
    // el conductor sentado, con los pies en el piso de la moto y las manos al manubrio
    sentar(o, f, poseMoto(cx, { torso: opts.frena ? 20 : 8, pito: !!opts.pito, bob: opts.bob }), 33, D / 2, 22 + (opts.bob ?? 0));
    // humo del escape
    if (opts.humo) { const [hx, hy] = o.s(L + 2 + opts.humo * 2, 10, 7 + opts.humo); o.p.disc(hx, hy, 1 + opts.humo, '#c9c6c0'); }
    // el pito: rayitas delante de la moto
    if (opts.pito) { const [px, py] = o.s(-1, D / 2, 28); for (let j = 0; j < opts.pito; j++) { o.p.line(px - 2 - j * 4, py - 4 + j, px - 6 - j * 4, py - 6 - j, '#fff6c8'); o.p.line(px - 2 - j * 4, py + 2 + j, px - 6 - j * 4, py + 4 + j, '#fff6c8'); } }
    // polvo de la frenada
    if (opts.frena) { const [dx, dy] = o.s(L - 6, D, 0); o.p.disc(dx + 5, dy - 2, 3, '#d8c8a8'); o.p.disc(dx + 10, dy - 4, 2, '#e8dcc4'); }
  };
  const W = 84, H = 70, anc: [number, number] = [14, 54];
  return hoja(`moto_${color}`, W, H, anc, { w: L, d: D, z: 46 }, [
    ['andando', 4, true, (i, o) => dibuja(o, i / 4, { bob: i % 2 ? 0 : 1, humo: (i % 4) + 1 > 3 ? 0 : (i % 4) + 1 }), 12],
    ['frenando', 3, false, (i, o) => dibuja(o, 0.1 * i, { frena: true }), 10],
    ['corneta', 4, true, (i, o) => dibuja(o, i / 4, { pito: 1 + (i % 3), bob: i % 2 }), 10],
  ], k, -1);
}

// ------------------------------------------------------------------ xích lô

/**
 * Xích lô de frente a la izquierda, a escala de atleta (lote D3): 68 de largo. El pasajero va adelante en su asiento con
 * capota, entre las dos ruedas de adelante, y el que pedalea atrás, con nón lá, sobre la rueda de atrás. Los dos son
 * personas del motor, del alto de un atleta. `andando`: ruedas y pedaleo.
 */
export function xichLo(k = K_INCLINACION): VehiculoHoja {
  const L = 68, D = 20, azul = R('#2f5fa8'), crema = R('#efe2c0'), rojo = R('#b8322a');
  const pasajera = fichaConductor('pasajera_xich_lo', { piel: '#e0b08a', pelo: '#3a2418', ropa: '#e06a8a', pantalon: '#f2efe6' });
  const chofer = fichaConductor('chofer_xich_lo', { piel: '#a8704a', pelo: '#1e1418', ropa: '#4a6a3a', pantalon: '#2c3346', gorro: { id: 'non_la', color: '#e6c77a' }, manga: 'long' });
  const cp = ctx48(pasajera), cc = ctx48(chofer);
  // la pasajera recostada: las manos en las piernas y los pies en el reposapiés de adelante
  const sentada = P(cp, { torso: -10, hipH: CADERA, head: { tilt: 4, dx: 0, dy: 0 }, legs: { near: { x: 10, y: 8, toe: 20 }, far: { x: 8, y: 8, toe: 20 } }, arms: { near: { shoulder: 40, elbow: 80 }, far: { shoulder: 30, elbow: 90 } }, face: { eyes: 'happy', mouth: 'smile' } });
  // el que pedalea: los pies en los pedales que giran y las manos en el manubrio de atrás de la capota
  const pedalea = (i: number) => {
    const a = (i / 4) * Math.PI * 2, mano = reachArm(cc.d, 16, [13, -3]);
    return P(cc, { torso: 16, hipH: CADERA, head: { tilt: -4, dx: 0, dy: 0 },
      legs: { near: { x: 6 + Math.cos(a) * 4, y: 17 + Math.sin(a) * 4, toe: 10 }, far: { x: 6 - Math.cos(a) * 4, y: 17 - Math.sin(a) * 4, toe: 10 } },
      arms: { near: mano, far: { ...mano } }, face: { eyes: 'open', mouth: 'line' } });
  };
  const W = 104, H = 84, anc: [number, number] = [14, 62];
  return hoja('xich_lo', W, H, anc, { w: L, d: D, z: 52 }, [
    ['andando', 4, true, (i, o) => {
      const f = i / 4;
      // la rueda de adelante del otro lado (lejos), atrás de todo, y la de atrás
      o.rueda(10, 2, 10, 10, f);
      o.rueda(L - 8, D / 2, 10, 10, f + 0.25);
      // el asiento de la pasajera: la caja azul, el respaldo crema, los costados y la capota roja que la cubre
      o.prism(0, 2, 30, D - 4, 10, 22, azul);
      o.prism(24, 2, 6, D - 4, 22, 44, crema);
      o.prism(4, 1, 26, D - 2, 50, 54, rojo);
      o.prism(26, 1, 4, D - 2, 44, 50, rojo);
      // el reposapiés de adelante
      o.prism(-2, 3, 6, D - 6, 6, 8, R('#5a5e66'));
      sentar(o, pasajera, sentada, 16, D / 2, 23);
      // la rueda de adelante de este lado, delante de la caja y de las piernas
      o.rueda(10, D - 2, 10, 10, f);
      // el cuadro de la bici de atrás: del asiento de la pasajera al eje de atrás y al sillín
      const [ax, ay] = o.s(24, D / 2, 16), [bx, by] = o.s(L - 8, D / 2, 10), [sx, sy] = o.s(L - 16, D / 2, 28);
      o.p.thick(ax, ay, bx, by, 1.4, '#2a2a30'); o.p.thick(bx, by, sx, sy, 1.4, '#2a2a30'); o.p.rect(sx - 4, sy - 2, 8, 2, '#2a2a30');
      const [px, py] = o.s(L - 22, D / 2, 11); o.p.disc(px, py, 2, '#5a5e66');
      sentar(o, chofer, pedalea(i), L - 16, D / 2, 30 + (i % 2));
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
