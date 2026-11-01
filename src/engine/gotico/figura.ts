import { caja, cilindro, elipsoide, esfera, palo, poliedro, type Pieza, type V3 } from './render';

/**
 * Personajes del taller gótico: un esqueleto con articulaciones (cadera, rodillas, hombros, codos) que se pone en
 * pose con ángulos y se viste con volúmenes redondeados (torso, pelvis y cabeza en elipsoides, miembros en
 * cápsulas que se afinan, manos y pies en elipsoides), la cara con cejas, ojos y nariz, el pelo, la ropa por capas
 * y el arma en la mano. La pose sale de una acción (quieto, caminar, atacar, lanzar, morir) y un cuadro, y la
 * figura gira entera para las 8 direcciones del juego.
 *
 * Proporciones de un adulto de 61 unidades (75 px): cabeza de 9 de alto, hombros a 47, cadera a 31, rodilla a 16.
 */

export type Dir = 's' | 'so' | 'o' | 'no' | 'n' | 'ne' | 'e' | 'se';
export const DIRS: Dir[] = ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'];
/** Hacia dónde mira cada dirección (en grados sobre el piso; 45 = hacia el que mira la pantalla). */
const RUMBO: Record<Dir, number> = { se: 0, s: 45, so: 90, o: 135, no: 180, n: 225, ne: 270, e: 315 };
export const NOMBRE_DIR: Record<Dir, [string, string]> = {
  s: ['Sur (de frente)', 'South (front)'], so: ['Suroeste', 'Southwest'], o: ['Oeste', 'West'], no: ['Noroeste', 'Northwest'],
  n: ['Norte (de espalda)', 'North (back)'], ne: ['Noreste', 'Northeast'], e: ['Este', 'East'], se: ['Sureste', 'Southeast'],
};

export type Accion = 'quieto' | 'caminar' | 'correr' | 'atacar' | 'lanzar' | 'herido' | 'morir';
export const CUADROS: Record<Accion, number> = { quieto: 4, caminar: 8, correr: 8, atacar: 8, lanzar: 8, herido: 4, morir: 8 };

/** Ángulos en grados. Brazos: adelante (+) / atrás (-), afuera, codo. Piernas: adelante/atrás, rodilla. */
export interface Pose {
  torso: number; // inclinación hacia adelante
  giroTorso: number; // giro del torso sobre la cadera
  cabeza: number; // cabeza hacia abajo (+)
  bajar: number; // cuánto baja la cadera (rodillas dobladas)
  avanza: number; // corrimiento hacia adelante de todo
  hombroD: [number, number, number]; hombroI: [number, number, number];
  caderaD: [number, number]; caderaI: [number, number];
  /** Tumbado (morir): cuánto se fue al piso, 0..1. */
  caida: number;
}

export function pose(acc: Accion, f: number, arma: 'una' | 'dos' | 'arco' | 'baculo' | 'garras' | 'nada' = 'una'): Pose {
  const p: Pose = { torso: 4, giroTorso: 0, cabeza: 0, bajar: 0, avanza: 0, hombroD: [8, 10, 18], hombroI: [6, 10, 16], caderaD: [2, 4], caderaI: [-2, 4], caida: 0 };
  const t = (f / CUADROS[acc]) * Math.PI * 2;
  if (acc === 'quieto') {
    const r = Math.sin(t);
    p.bajar = 0.4 + r * 0.4; p.torso = 6; p.hombroD = [14 + r * 2, 12, 28]; p.hombroI = [10 - r * 2, 12, 22];
    p.caderaD = [10, 14]; p.caderaI = [-8, 8];
    if (arma === 'dos') { p.hombroD = [30, 8, 50]; p.hombroI = [38, 14, 60]; }
    if (arma === 'arco') { p.hombroI = [55, 10, 10]; p.hombroD = [40, 18, 70]; p.giroTorso = 25; }
    if (arma === 'baculo') p.hombroD = [20, 10, 55];
  } else if (acc === 'caminar') {
    const s = Math.sin(t), c = Math.cos(t);
    p.caderaD = [s * 30, 6 + Math.max(0, -c) * 38]; p.caderaI = [-s * 30, 6 + Math.max(0, c) * 38];
    p.hombroD = [-s * 26 + 6, 8, 22 + Math.max(0, -s) * 18]; p.hombroI = [s * 26 + 6, 8, 22 + Math.max(0, s) * 18];
    p.bajar = 1.2 - Math.abs(c) * 1.2; p.torso = 8; p.giroTorso = -s * 8;
    if (arma === 'dos') { p.hombroD = [30, 8, 50]; p.hombroI = [36, 14, 58]; }
    if (arma === 'arco') { p.hombroI = [s * 18 + 10, 8, 20]; }
  } else if (acc === 'correr') {
    // zancada larga, el cuerpo adelante, brazos que bombean y una fase en el aire (cuadros 2 y 6)
    const s = Math.sin(t), c = Math.cos(t);
    p.caderaD = [s * 42 + 6, 10 + Math.max(0, -c) * 70]; p.caderaI = [-s * 42 + 6, 10 + Math.max(0, c) * 70];
    p.hombroD = [-s * 45 + 10, 10, 70]; p.hombroI = [s * 45 + 10, 10, 70];
    p.bajar = 2.6 - Math.abs(s) * 2.2; p.torso = 18; p.giroTorso = -s * 12; p.cabeza = -8;
    if (arma === 'dos') { p.hombroD = [36 - s * 6, 8, 60]; p.hombroI = [42 - s * 6, 14, 64]; }
    if (arma === 'baculo') p.hombroD = [20 - s * 8, 10, 60];
  } else if (acc === 'herido') {
    // el golpe lo echa atrás: retrocede, encoge y vuelve
    const k = [0.5, 1, 0.75, 0.3][f % 4];
    p.torso = -14 * k; p.cabeza = -16 * k; p.avanza = -2.6 * k; p.bajar = 1.6 * k; p.giroTorso = 10 * k;
    p.hombroD = [lerp(12, -25, k), lerp(12, 34, k), lerp(25, 60, k)]; p.hombroI = [lerp(10, -15, k), lerp(12, 40, k), lerp(22, 70, k)];
    p.caderaD = [lerp(8, 24, k), lerp(10, 30, k)]; p.caderaI = [lerp(-6, -14, k), lerp(6, 10, k)];
  } else if (acc === 'atacar') {
    // cuadros clave como se anima a mano: carga (0-2), arriba (3), golpe (4), seguimiento (5), vuelta (6-7)
    const K = {
      hombro: [20, 70, 125, 160, 95, 35, 15, 18], codo: [30, 45, 60, 35, 5, 8, 20, 28],
      torso: [4, -2, -8, -10, 10, 18, 12, 6], giro: [0, -14, -28, -34, 8, 26, 14, 4], avanza: [0, 0, 0, 0.5, 2.5, 3.5, 2.5, 1], bajar: [1, 1, 1.5, 1.5, 3, 3.5, 2.5, 1.5],
    };
    p.caderaD = [24, 18]; p.caderaI = [-20, 10]; p.bajar = K.bajar[f]; p.avanza = K.avanza[f];
    if (arma === 'arco') {
      const tira = Math.min(1, f / 4);
      p.hombroI = [80, 6, 6]; p.hombroD = [70, 12, 30 + tira * 110]; p.giroTorso = 30; p.torso = 4;
    } else {
      p.hombroD = [K.hombro[f], 14, K.codo[f]]; p.torso = K.torso[f]; p.giroTorso = K.giro[f];
      p.hombroI = arma === 'dos' ? [K.hombro[f] - 8, 18, K.codo[f] + 10] : [[20, 20, 30, 30, 10, 0, 10, 20][f], 16, 40];
    }
  } else if (acc === 'lanzar') {
    const k = Math.sin((f / 7) * Math.PI);
    p.hombroD = [lerp(20, 95, k), 20, lerp(30, 5, k)]; p.hombroI = [lerp(20, 85, k), 20, lerp(30, 10, k)];
    p.torso = lerp(4, 12, k); p.cabeza = -6 * k; p.caderaD = [14, 12]; p.caderaI = [-12, 8]; p.bajar = 1;
  } else {
    const k = Math.min(1, f / 6);
    p.caida = k; p.cabeza = 10 * k; p.hombroD = [lerp(10, -40, k), lerp(10, 40, k), 30]; p.hombroI = [lerp(10, 60, k), lerp(10, 30, k), 50];
    p.caderaD = [lerp(0, 20, k), lerp(4, 60, k)]; p.caderaI = [lerp(0, -10, k), lerp(4, 30, k)];
  }
  return p;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Cómo va vestido y armado un personaje. */
export interface Atuendo {
  alto?: number; ancho?: number; // escala del cuerpo (1 = adulto); ancho engorda torso y miembros
  piel: string; pelo?: string; peinado?: 'corto' | 'largo' | 'cola' | 'calvo' | 'trenzas' | 'melena';
  barba?: boolean;
  torso: string; torsoDesnudo?: boolean; piernas: string; botas: string; guantes?: string;
  hombreras?: string; casco?: 'yelmo' | 'cuernos' | 'capucha' | 'corona' | 'cofia' | 'mascara';
  cascoMat?: string;
  falda?: { mat: string; largo: number; ancho: number }; // túnica, vestido, faldón (largo hasta abajo)
  capa?: string; cinturon?: string; peto?: string; tabardo?: string;
  arma?: 'espada' | 'hacha' | 'mandoble' | 'maza' | 'baculo' | 'arco' | 'lanza' | 'daga' | 'garras' | 'orbe' | 'nada';
  armaMat?: string; escudo?: 'redondo' | 'cometa' | 'torre' | null; escudoMat?: string;
  /** Ojos que brillan (no muertos, demonios). */
  ojos?: string;
  cuernos?: boolean; joroba?: number;
  /** Esqueleto: los miembros son huesos finos. */
  hueso?: boolean;
}

/** Arma las piezas del personaje en la dirección, la acción y el cuadro. */
export function figura(at: Atuendo, dir: Dir, acc: Accion, f: number): Pieza[] {
  const ps: Pieza[] = [];
  const S = (at.alto ?? 1), A = (at.ancho ?? 1) * S;
  const tipoArma = at.arma === 'mandoble' || at.arma === 'hacha' && (at.ancho ?? 1) > 1.15 ? 'dos' : at.arma === 'arco' ? 'arco' : at.arma === 'baculo' || at.arma === 'lanza' ? 'baculo' : at.arma === 'garras' ? 'garras' : at.arma === 'nada' || !at.arma ? 'nada' : 'una';
  const P = pose(acc, f, tipoArma as 'una');
  const th = (RUMBO[dir] * Math.PI) / 180;
  const F: V3 = [Math.cos(th), Math.sin(th), 0], R: V3 = [Math.sin(th), -Math.cos(th), 0];
  // de coordenadas del cuerpo (adelante, derecha, arriba) al mundo
  const W = (fw: number, rt: number, up: number): V3 => [F[0] * fw + R[0] * rt, F[1] * fw + R[1] * rt, up];
  const rad = (g: number) => (g * Math.PI) / 180;
  // la caída de morir: todo el cuerpo se va de espaldas girando alrededor de los talones
  const caer = (q: V3): V3 => {
    if (!P.caida) return q;
    const a = rad(-82 * P.caida);
    const fw = q[0] * F[0] + q[1] * F[1], rt = q[0] * R[0] + q[1] * R[1];
    const nf = fw * Math.cos(a) - q[2] * Math.sin(a), nz = Math.max(0.5, fw * Math.sin(a) + q[2] * Math.cos(a));
    return W(nf - 4 * P.caida, rt, nz);
  };
  const Wc = (fw: number, rt: number, up: number) => caer(W(fw + P.avanza, rt, up));
  // ---- cadera y piernas
  const zc = (31 - P.bajar) * S;
  const pierna = (s: number, [hz, rod]: [number, number]) => {
    const cad: V3 = [0, s * 3.6 * A, zc];
    const a1 = rad(hz), a2 = rad(hz - rod);
    const L1 = 14.5 * S, L2 = 14 * S;
    const rodilla: V3 = [cad[0] + Math.sin(a1) * L1, cad[1], cad[2] - Math.cos(a1) * L1];
    const tobillo: V3 = [rodilla[0] + Math.sin(a2) * L2, rodilla[1], rodilla[2] - Math.cos(a2) * L2];
    const ancho = at.hueso ? 0.45 : 1;
    const m = at.piernas;
    ps.push(...capsula(Wc(...cad), Wc(...rodilla), 3.3 * A * ancho, 2.4 * A * ancho, m));
    ps.push(...capsula(Wc(...rodilla), Wc(...tobillo), 2.4 * A * ancho, 1.6 * A * ancho, at.hueso ? m : at.botas));
    if (!at.hueso) ps.push(...capsula(Wc(rodilla[0] - 0.6 * S, rodilla[1], rodilla[2] - 3 * S), Wc(tobillo[0] - 0.4 * S, tobillo[1], tobillo[2] + 4 * S), 2.5 * A, 1.9 * A, at.botas));
    // pie hacia adelante (si la pierna va atrás, el pie apunta un poco abajo)
    const pz = Math.max(1.2 * S, tobillo[2] - 1.2 * S);
    ps.push(elipsoide(...Wc(tobillo[0] + 1.6 * S, tobillo[1], pz), 3.3 * S, 1.7 * A, 1.4 * S, { mat: at.botas, giro: RUMBO[dir], ...(P.caida ? {} : {}) }));
  };
  pierna(1, P.caderaD); pierna(-1, P.caderaI);
  // ---- pelvis, falda, torso
  const tor = rad(P.torso), gir = rad(P.giroTorso);
  // un punto del torso: girado sobre la vertical (giroTorso) e inclinado hacia adelante desde la cadera
  const T = (fw: number, rt: number, up: number): V3 => {
    const f2 = fw * Math.cos(gir) - rt * Math.sin(gir), r2 = fw * Math.sin(gir) + rt * Math.cos(gir);
    const dz = up - zc;
    return Wc(f2 * Math.cos(tor) + dz * Math.sin(tor), r2, zc + dz * Math.cos(tor) - f2 * Math.sin(tor) * 0.3);
  };
  if (at.hueso) {
    ps.push(elipsoide(...Wc(0, 0, zc + 1), 2.6 * S, 4.4 * A, 2.4 * S, { mat: at.torso }));
    ps.push(...capsula(T(0, 0, zc + 2 * S), T(-0.5 * S, 0, zc + 17 * S), 1 * S, 1 * S, at.torso));
    for (let i = 0; i < 5; i++) ps.push(elipsoide(...T(0.5 * S, 0, zc + (8 + i * 2.2) * S), (3.8 - i * 0.1) * S, (5.4 - Math.abs(i - 2) * 0.3) * A, 0.7 * S, { mat: at.torso, giro: RUMBO[dir] + P.giroTorso }));
  } else {
    ps.push(elipsoide(...Wc(0, 0, zc + 0.5 * S), 3.6 * A, 5.2 * A, 4.2 * S, { mat: at.piernas, giro: RUMBO[dir] }));
    const pecho = at.torsoDesnudo ? at.piel : at.torso;
    ps.push(elipsoide(...T(0.2 * S, 0, zc + 6.5 * S), 3.4 * A, 4.7 * A, 5 * S, { mat: pecho, giro: RUMBO[dir] + P.giroTorso }));
    ps.push(elipsoide(...T(0.6 * S, 0, zc + 12.5 * S), 4.3 * A, 6.4 * A, 5.6 * S, { mat: pecho, giro: RUMBO[dir] + P.giroTorso }));
    if (at.torsoDesnudo) {
      // pectorales y abdomen marcados
      for (const s of [1, -1]) ps.push(elipsoide(...T(3.6 * A, s * 2.8 * A, zc + 13.5 * S), 1.6 * A, 2.8 * A, 2.6 * S, { mat: at.piel, tono: 0.04, giro: RUMBO[dir] + P.giroTorso }));
      for (let i = 0; i < 2; i++) for (const s of [1, -1]) ps.push(elipsoide(...T(2.9 * A, s * 1.3 * A, zc + (5.5 + i * 3) * S), 1.2 * A, 1.4 * A, 1.4 * S, { mat: at.piel, tono: 0.03 }));
    }
    if (at.peto) ps.push(elipsoide(...T(0.8 * S, 0, zc + 12 * S), 4.8 * A, 6.6 * A, 6.2 * S, { mat: at.peto, giro: RUMBO[dir] + P.giroTorso }), elipsoide(...T(0.6 * S, 0, zc + 5.5 * S), 3.9 * A, 5.2 * A, 3.6 * S, { mat: at.peto, tono: -0.05, giro: RUMBO[dir] + P.giroTorso }));
    if (at.tabardo) ps.push(caja(...T(4.4 * A + (at.peto ? 0.6 : 0), 0, zc - 9 * S), 1, 5.5 * A, 22 * S, { mat: at.tabardo, giro: RUMBO[dir] + P.giroTorso, incl: -P.torso, inclEje: 'y' }));
    if (at.cinturon) ps.push(cilindro(...Wc(0, 0, zc + 2.2 * S), 4.4 * A, 2 * S, { mat: at.cinturon, r1: 4.6 * A }), elipsoide(...Wc(4.2 * A, 0, zc + 3.2 * S), 0.8, 1.6, 1.2, { mat: 'oro', giro: RUMBO[dir] }));
    if (at.falda) ps.push(cilindro(...Wc(0, 0, zc + 3 * S - at.falda.largo * S), 4.4 * A * at.falda.ancho, at.falda.largo * S, { mat: at.falda.mat, r1: 4.6 * A }));
    if (at.joroba) ps.push(elipsoide(...T(-3 * S, 0, zc + 15 * S), 4 * S * at.joroba, 6 * A, 4 * S, { mat: pecho, giro: RUMBO[dir] }));
  }
  // ---- capa (detrás, cae hasta las corvas)
  if (at.capa) {
    const z0 = zc + 17 * S, z1 = 12 * S;
    const ondea = acc === 'caminar' ? Math.sin((f / 8) * Math.PI * 2) * 2 : 0;
    const a = T(-4.5 * S, 6.5 * A, z0), b = T(-4.5 * S, -6.5 * A, z0);
    const c = Wc(-9 * S - ondea, -8 * A, z1), d = Wc(-9 * S - ondea, 8 * A, z1);
    const e = 0.9;
    ps.push(poliedro([a, b, c, d, add(a, F, -e), add(b, F, -e), add(c, F, -e), add(d, F, -e)], { mat: at.capa }));
  }
  // ---- brazos
  const hombroZ = zc + 16.5 * S;
  const brazo = (s: number, [adel, afuera, codo]: [number, number, number]) => {
    const h0: [number, number, number] = [0, s * 6.6 * A, hombroZ];
    const a1 = rad(adel), b1 = rad(afuera) * s;
    const L1 = 11.5 * S, L2 = 10.5 * S;
    // dirección del brazo: abajo, girada hacia adelante (adel) y hacia afuera (afuera)
    const d1: V3 = [Math.sin(a1) * Math.cos(b1), Math.sin(b1), -Math.cos(a1) * Math.cos(b1)];
    const codoP: [number, number, number] = [h0[0] + d1[0] * L1, h0[1] + d1[1] * L1, h0[2] + d1[2] * L1];
    const a2 = rad(adel + codo);
    const d2: V3 = [Math.sin(a2) * Math.cos(b1 * 0.5), Math.sin(b1 * 0.5), -Math.cos(a2) * Math.cos(b1 * 0.5)];
    const mano: [number, number, number] = [codoP[0] + d2[0] * L2, codoP[1] + d2[1] * L2, codoP[2] + d2[2] * L2];
    const ancho = at.hueso ? 0.4 : 1;
    const brazoMat = at.torsoDesnudo || !at.torso ? at.piel : at.torso;
    ps.push(...capsula(T(...h0), T(...codoP), 2.4 * A * ancho, 2 * A * ancho, at.hueso ? at.torso : brazoMat));
    ps.push(...capsula(T(...codoP), T(...mano), 2 * A * ancho, 1.5 * A * ancho, at.hueso ? at.torso : at.guantes ?? at.piel));
    ps.push(esfera(...T(...mano), 1.7 * A * (at.hueso ? 0.7 : 1), { mat: at.hueso ? at.torso : at.guantes ?? at.piel }));
    if (at.hombreras) ps.push(elipsoide(...T(0, s * 6.8 * A, hombroZ + 0.8 * S), 3.4 * A, 3.2 * A, 2.4 * S, { mat: at.hombreras, giro: RUMBO[dir] + P.giroTorso }));
    else if (!at.hueso) ps.push(esfera(...T(0, s * 6.4 * A, hombroZ), 2.6 * A, { mat: at.torsoDesnudo ? at.piel : at.torso }));
    return { mano, codo: codoP, d2 };
  };
  const mD = brazo(1, P.hombroD), mI = brazo(-1, P.hombroI);
  // ---- cuello y cabeza
  const cz = hombroZ + 7.5 * S;
  const cab = (fw: number, rt: number, up: number): V3 => T(fw + Math.sin(rad(P.cabeza)) * (up - hombroZ) * 0.3, rt, up);
  ps.push(...capsula(T(0, 0, hombroZ), cab(0.4 * S, 0, cz - 3 * S), 1.9 * S, 1.8 * S, at.hueso ? at.torso : at.piel));
  const gD = RUMBO[dir] + P.giroTorso;
  ps.push(elipsoide(...cab(0.4 * S, 0, cz), 4.1 * S, 3.8 * S, 4.6 * S, { mat: at.piel, giro: gD }));
  // mandíbula y mentón
  ps.push(elipsoide(...cab(1.6 * S, 0, cz - 2.6 * S), 2.8 * S, 2.6 * S, 2.2 * S, { mat: at.piel, giro: gD }));
  // cara: cejas (sombra), ojos, nariz
  const ojo = at.ojos ?? 'negro';
  for (const s of [1, -1]) {
    ps.push(elipsoide(...cab(3.7 * S, s * 1.5 * S, cz + 0.2 * S), 0.6 * S, 0.75 * S, 0.55 * S, { mat: ojo }));
    ps.push(elipsoide(...cab(3.9 * S, s * 1.5 * S, cz + 1.1 * S), 0.7 * S, 1.3 * S, 0.45 * S, { mat: at.piel, tono: -0.05, giro: gD }));
  }
  ps.push(elipsoide(...cab(4.4 * S, 0, cz - 0.8 * S), 0.9 * S, 0.7 * S, 1.3 * S, { mat: at.piel, tono: 0.05, giro: gD }));
  if (at.hueso) ps.push(elipsoide(...cab(3.6 * S, 0, cz - 2.4 * S), 0.6 * S, 1.6 * S, 0.5 * S, { mat: 'negro' }));
  else ps.push(elipsoide(...cab(3.7 * S, 0, cz - 2.2 * S), 0.4 * S, 1.2 * S, 0.3 * S, { mat: at.piel, tono: -0.2, giro: gD }));
  if (at.barba) ps.push(elipsoide(...cab(2.4 * S, 0, cz - 3.2 * S), 2.6 * S, 3 * S, 2.6 * S, { mat: at.pelo ?? 'negro', giro: gD }));
  // pelo
  if (at.pelo && at.peinado !== 'calvo' && at.casco !== 'yelmo' && at.casco !== 'capucha') {
    // el pelo va arriba y atrás: la cara queda libre
    ps.push(elipsoide(...cab(-1.5 * S, 0, cz + 1.7 * S), 3.9 * S, 4.25 * S, 4.1 * S, { mat: at.pelo, giro: gD }));
    ps.push(elipsoide(...cab(0.8 * S, 0, cz + 3.4 * S), 3.2 * S, 3.6 * S, 1.6 * S, { mat: at.pelo, giro: gD }));
    if (at.peinado === 'largo' || at.peinado === 'melena') ps.push(elipsoide(...cab(-2.4 * S, 0, cz - 3.5 * S), 2.6 * S, (at.peinado === 'melena' ? 5.2 : 4.4) * S, 7 * S, { mat: at.pelo, giro: gD }));
    if (at.peinado === 'cola') ps.push(...capsula(cab(-3.6 * S, 0, cz + 1 * S), cab(-6 * S, 0, cz - 9 * S), 1.6 * S, 0.9 * S, at.pelo));
    if (at.peinado === 'trenzas') for (const s of [1, -1]) ps.push(...capsula(cab(-1 * S, s * 3.6 * S, cz - 1 * S), cab(0, s * 4.2 * S, cz - 11 * S), 1.1 * S, 0.8 * S, at.pelo));
  }
  // casco o tocado
  const cm = at.cascoMat ?? 'hierro';
  if (at.casco === 'yelmo') {
    ps.push(elipsoide(...cab(0.3 * S, 0, cz + 0.8 * S), 4.8 * S, 4.6 * S, 5 * S, { mat: cm, giro: gD }));
    ps.push(caja(...cab(4.6 * S, 0, cz - 0.2 * S), 1.2 * S, 6 * S, 0.9 * S, { mat: 'negro', giro: gD }));
    ps.push(caja(...cab(4.4 * S, 0, cz - 4.2 * S), 0.8 * S, 1.2 * S, 5 * S, { mat: cm, giro: gD, tono: 0.08 }));
  } else if (at.casco === 'cuernos') {
    ps.push(elipsoide(...cab(0, 0, cz + 2 * S), 4.5 * S, 4.4 * S, 3.4 * S, { mat: cm, giro: gD }));
    for (const s of [1, -1]) ps.push(palo(cab(0, s * 4 * S, cz + 2.5 * S), cab(1 * S, s * 8 * S, cz + 7 * S), 1.3 * S, { mat: 'hueso', r1: 0.2 }));
  } else if (at.casco === 'capucha') {
    ps.push(elipsoide(...cab(-0.6 * S, 0, cz + 0.6 * S), 5 * S, 4.9 * S, 5.4 * S, { mat: at.cascoMat ?? at.torso, giro: gD }));
    ps.push(elipsoide(...cab(2.4 * S, 0, cz - 0.3 * S), 2.4 * S, 3.3 * S, 3.8 * S, { mat: 'negro', giro: gD, tono: 0.1 }));
    for (const s of [1, -1]) ps.push(elipsoide(...cab(3.7 * S, s * 1.4 * S, cz + 0.2 * S), 0.55 * S, 0.7 * S, 0.5 * S, { mat: ojo }));
  } else if (at.casco === 'corona') {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ps.push(cilindro(...cab(Math.cos(a) * 3.6 * S, Math.sin(a) * 3.6 * S, cz + 3.5 * S), 0.6 * S, 2.4 * S, { mat: 'oro', r1: 0.1 })); }
    ps.push(cilindro(...cab(0, 0, cz + 3 * S), 4 * S, 1.2 * S, { mat: 'oro' }));
  } else if (at.casco === 'cofia') ps.push(elipsoide(...cab(-0.6 * S, 0, cz + 2.6 * S), 4.3 * S, 4.4 * S, 2.9 * S, { mat: cm, giro: gD }));
  else if (at.casco === 'mascara') ps.push(elipsoide(...cab(1.4 * S, 0, cz - 1.8 * S), 3.4 * S, 3.6 * S, 2.6 * S, { mat: cm, giro: gD }));
  if (at.cuernos) for (const s of [1, -1]) { ps.push(palo(cab(0.5 * S, s * 2.6 * S, cz + 3 * S), cab(-1.5 * S, s * 4 * S, cz + 7 * S), 1 * S, { mat: 'hueso', r1: 0.4 })); ps.push(palo(cab(-1.5 * S, s * 4 * S, cz + 7 * S), cab(-4 * S, s * 4.5 * S, cz + 8 * S), 0.45 * S, { mat: 'hueso', r1: 0.1 })); }
  // ---- arma en la mano derecha (sale en la dirección del antebrazo) y escudo en la izquierda
  const am = at.armaMat ?? 'acero';
  const mano = mD.mano, dd = mD.d2;
  const punto = (k: number): V3 => T(mano[0] + dd[0] * k, mano[1] + dd[1] * k, mano[2] + dd[2] * k);
  const contra = (k: number): V3 => T(mano[0] - dd[0] * k, mano[1] - dd[1] * k, mano[2] - dd[2] * k);
  switch (at.arma) {
    case 'espada': ps.push(palo(contra(3 * S), punto(0.5), 0.8 * S, { mat: 'cuero' }), palo(punto(0.5), punto(2), 2.6 * S, { mat: am, r1: 2.6 * S }), palo(punto(1.5), punto(24 * S), 1.1 * S, { mat: am, r1: 0.3 })); break;
    case 'mandoble': ps.push(palo(contra(6 * S), punto(0.5), 0.9 * S, { mat: 'cuero' }), palo(punto(0.5), punto(1.8), 3.4 * S, { mat: am, r1: 3.4 * S }), palo(punto(1.5), punto(34 * S), 1.5 * S, { mat: am, r1: 0.4 })); break;
    case 'hacha': {
      ps.push(palo(contra(4 * S), punto(20 * S), 0.9 * S, { mat: 'madera' }));
      // la hoja sale hacia adelante del mango: cuña de metal con el filo curvo
      const c = punto(17 * S), e = add(c, F, 1), dz: V3 = [dd[0], dd[1], dd[2]];
      const fw: V3 = T(mano[0] + dd[0] * 17 * S + 7 * S, mano[1] + dd[1] * 17 * S, mano[2] + dd[2] * 17 * S);
      const lado = (v: V3, k: number): V3 => add(v, R, k);
      ps.push(poliedro([lado(add(c, dz, 3 * S), 0.7), lado(add(c, dz, -3 * S), 0.7), lado(add(c, dz, 3 * S), -0.7), lado(add(c, dz, -3 * S), -0.7),
        lado(add(fw, dz, 6 * S), 0.15), lado(add(fw, dz, -6 * S), 0.15), lado(add(fw, dz, 6 * S), -0.15), lado(add(fw, dz, -6 * S), -0.15)], { mat: am }));
      void e;
      break;
    }
    case 'maza': ps.push(palo(contra(3 * S), punto(15 * S), 0.8 * S, { mat: 'madera' }), esfera(...punto(16 * S), 2.8 * S, { mat: am })); break;
    case 'lanza': ps.push(palo(contra(18 * S), punto(26 * S), 0.7 * S, { mat: 'madera_lisa' }), palo(punto(26 * S), punto(33 * S), 1.2 * S, { mat: am, r1: 0.1 })); break;
    case 'baculo': {
      // el báculo va parado en la mano, apoyado en el piso, con la gema arriba (un poco inclinado hacia adelante)
      const m = T(...mano);
      const pie: V3 = [m[0] + F[0] * 1.5, m[1] + F[1] * 1.5, Math.max(0, m[2] - 22 * S)], tope: V3 = [m[0] + F[0] * 3, m[1] + F[1] * 3, m[2] + 26 * S];
      ps.push(palo(pie, tope, 0.8 * S, { mat: 'madera_lisa', r1: 0.7 * S }), elipsoide(...tope, 1.6 * S, 1.6 * S, 2.6 * S, { mat: 'madera_lisa' }), esfera(tope[0], tope[1], tope[2] + 3 * S, 2 * S, { mat: 'magia' }));
      break;
    }
    case 'daga': ps.push(palo(contra(2 * S), punto(10 * S), 0.8 * S, { mat: am, r1: 0.2 })); break;
    case 'garras': for (const s of [-1, 0, 1]) ps.push(palo(punto(0), T(mano[0] + dd[0] * 9 * S + s * 0.8, mano[1] + dd[1] * 9 * S + s * 1.2, mano[2] + dd[2] * 9 * S), 0.4 * S, { mat: am, r1: 0.1 })); break;
    case 'orbe': ps.push(esfera(...punto(2.5 * S), 2.4 * S, { mat: 'magia' })); break;
    case 'arco': {
      // el arco en la mano izquierda, vertical; la derecha tira de la cuerda
      const mi = mI.mano;
      const c: V3 = T(...mi);
      const arr: V3 = [c[0], c[1], c[2] + 14 * S], abj: V3 = [c[0], c[1], c[2] - 14 * S];
      const comba: V3 = add(c, F, 3 * S);
      ps.push(palo(arr, add(comba, [0, 0, 7 * S]), 0.6 * S, { mat: 'madera_lisa' }), palo(add(comba, [0, 0, 7 * S]), add(comba, [0, 0, -7 * S]), 0.7 * S, { mat: 'madera_lisa' }), palo(add(comba, [0, 0, -7 * S]), abj, 0.6 * S, { mat: 'madera_lisa' }));
      ps.push(palo(arr, T(...mano), 0.15 * S, { mat: 'cuerda' }), palo(T(...mano), abj, 0.15 * S, { mat: 'cuerda' }));
      break;
    }
  }
  if (at.escudo) {
    const c = T(mI.mano[0] + 1.5 * S, mI.mano[1] - 1 * S, mI.mano[2] + 3 * S);
    const sm = at.escudoMat ?? 'madera';
    if (at.escudo === 'redondo') ps.push(cilindro(...c, 7 * S, 1.4 * S, { mat: sm, eje: F }), esfera(...add(c, F, 1.4 * S), 1.6 * S, { mat: 'hierro' }));
    else { const al = at.escudo === 'torre' ? 26 : 18; ps.push(caja(...[c[0], c[1], c[2] - al * 0.45 * S] as V3, 1.6 * S, (at.escudo === 'torre' ? 13 : 11) * S, al * S, { mat: sm, giro: RUMBO[dir] + P.giroTorso }), caja(...[c[0] + F[0] * 0.9, c[1] + F[1] * 0.9, c[2] - al * 0.1 * S] as V3, 0.4, 2 * S, al * 0.6 * S, { mat: 'oro', giro: RUMBO[dir] + P.giroTorso })); }
  }
  return ps;
}

const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
/** Cápsula: cilindro que se afina con esferas en las puntas (miembros redondeados). */
export function capsula(a: V3, b: V3, r0: number, r1: number, mat: string): Pieza[] {
  return [palo(a, b, r0, { mat, r1 }), esfera(...a, r0, { mat }), esfera(...b, r1, { mat })];
}
