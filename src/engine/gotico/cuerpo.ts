import { caja, cilindro, elipsoide, esfera, palo, poliedro, masa, hueso, bulto, type Comp, type Pieza, type V3 } from './render';
import { MATERIALES } from './materiales';
import { ruido } from './render';
import { pose, type Dir, type Accion } from './figura';

/**
 * Cuerpos orgánicos para personajes y monstruos humanoides: el mismo esqueleto con articulaciones de figura.ts,
 * pero la carne es masa (huesos y bultos que se funden con unión suave): pelvis, glúteos, abdomen, costillar,
 * pectorales, trapecios, deltoides, bíceps, antebrazos, manos, muslos con cuádriceps, rodillas, pantorrillas,
 * pies, cuello y una cabeza con cráneo, mandíbula, pómulos, arco de las cejas, nariz y orejas.
 *
 * La ropa y la armadura van por capas sobre el mismo esqueleto: cada capa vuelve a armar las partes que cubre
 * un poco más gruesas (camisa +0.6, cuero +1, malla +0.9, placas +1.5) con su material, y lo duro (hebillas,
 * remaches, bordes, armas, escudos) va en piezas aparte. Así cualquier combinación de equipo sale bien y se
 * puede pintar cada pieza del equipo como capa.
 */

// ------------------------------------------------------------------ materiales de carne, pelo, tela y metal
const M = MATERIALES;
M.cu_piel = { rampa: ['#1d110c', '#311d14', '#4a2c1e', '#64402b', '#7e5539', '#986b49', '#b0825c', '#c49a74', '#d4b08c'], ruido: 0.06, escala: 0.35 };
M.cu_piel_clara = { rampa: ['#24170f', '#3c281c', '#5a3d2b', '#7a5640', '#986f55', '#b3886b', '#c9a084', '#dbb89e', '#e8ccb4'], ruido: 0.06, escala: 0.35 };
M.cu_piel_morena = { rampa: ['#140b07', '#22130c', '#331d12', '#46291a', '#5a3622', '#6f452c', '#845537', '#986645'], ruido: 0.06, escala: 0.35 };
M.cu_piel_palida = { rampa: ['#1d1a1a', '#332e2d', '#4c4542', '#665d58', '#81766f', '#9c9087', '#b6aba1', '#cbc2b8'], ruido: 0.06, escala: 0.35 };
M.cu_piel_verde = { rampa: ['#0e120b', '#1a2214', '#27321e', '#35432a', '#445536', '#546843', '#657a51'], ruido: 0.18, escala: 0.45 };
M.cu_piel_roja = { rampa: ['#170604', '#2c0b07', '#44110a', '#5e180e', '#792114', '#932c1a', '#aa3a23', '#c04d30'], ruido: 0.14, escala: 0.4 };
M.cu_piel_gris = { rampa: ['#121214', '#202024', '#303036', '#424149', '#55545d', '#696872', '#7e7d87'], ruido: 0.16, escala: 0.4 };
M.cu_piel_azul = { rampa: ['#0b1018', '#141d2b', '#1f2c40', '#2b3c56', '#384e6c', '#486283', '#5a779a'], ruido: 0.1, escala: 0.4 };
M.cu_ojo = { rampa: ['#060505', '#120e0c', '#201a16'], ruido: 0, escala: 1 };
M.cu_ojo_brasa = { rampa: ['#a0300c', '#e06818', '#ffb840', '#fff0a0'], ruido: 0, escala: 1, emite: true };
M.cu_ojo_hielo = { rampa: ['#2060b0', '#50a0f0', '#b0e0ff', '#f0fbff'], ruido: 0, escala: 1, emite: true };
M.cu_ojo_verde = { rampa: ['#207020', '#40c040', '#a0ff80'], ruido: 0, escala: 1, emite: true };
M.cu_pelo_negro = { rampa: ['#070505', '#110c0a', '#1c1410', '#281d17', '#36281f', '#45342a'], ruido: 0.35, escala: 1.4, patron: (p) => (ruido(p[0] * 2.5, p[1] * 2.5, p[2] * 0.4) - 0.5) * 0.25 };
M.cu_pelo_castano = { rampa: ['#110906', '#22130b', '#351e11', '#4a2b18', '#5f3a21', '#764b2c', '#8c5d39'], ruido: 0.35, escala: 1.4, patron: (p) => (ruido(p[0] * 2.5, p[1] * 2.5, p[2] * 0.4) - 0.5) * 0.25 };
M.cu_pelo_rubio = { rampa: ['#261a0b', '#433014', '#64491f', '#86642d', '#a5803d', '#c09c52', '#d6b86e'], ruido: 0.35, escala: 1.4, patron: (p) => (ruido(p[0] * 2.5, p[1] * 2.5, p[2] * 0.4) - 0.5) * 0.25 };
M.cu_pelo_rojo = { rampa: ['#1a0704', '#300e07', '#4a160b', '#651f10', '#812a16', '#9c381e', '#b34a29'], ruido: 0.35, escala: 1.4, patron: (p) => (ruido(p[0] * 2.5, p[1] * 2.5, p[2] * 0.4) - 0.5) * 0.25 };
M.cu_pelo_blanco = { rampa: ['#2e2c2a', '#4a4744', '#67635f', '#86817b', '#a49e97', '#c0bab3', '#d8d3cc'], ruido: 0.3, escala: 1.4, patron: (p) => (ruido(p[0] * 2.5, p[1] * 2.5, p[2] * 0.4) - 0.5) * 0.22 };
M.cu_malla = { rampa: ['#0f1012', '#1d1f22', '#2e3135', '#41454a', '#565b61', '#6d737a', '#868c93', '#a3a9af'], ruido: 0.1, escala: 1, brillo: 0.35, patron: (p) => { const a = Math.sin(p[0] * 2.6 + p[1] * 2.6) * Math.sin(p[2] * 3.2 + (p[0] - p[1]) * 1.3); return a > 0.35 ? 0.1 : a < -0.55 ? -0.2 : 0; } };
M.cu_cuero = { rampa: ['#120a06', '#21130b', '#331e11', '#462a18', '#5a3820', '#6e472a', '#835735', '#986842'], ruido: 0.2, escala: 0.8, brillo: 0.08 };
M.cu_cuero_negro = { rampa: ['#070606', '#0f0d0c', '#191513', '#241f1c', '#302925', '#3d3530', '#4b423c'], ruido: 0.18, escala: 0.8, brillo: 0.12 };
M.cu_placa = { rampa: ['#0c0d10', '#181b20', '#262a31', '#363c45', '#48505b', '#5d6773', '#75808d', '#909ba7', '#b3bcc6', '#d7dde3'], ruido: 0.05, escala: 0.6, brillo: 0.6 };
M.cu_placa_oscura = { rampa: ['#08080a', '#111216', '#1b1d22', '#262930', '#33373f', '#42474f', '#545a63', '#6c727b', '#8d939b'], ruido: 0.06, escala: 0.6, brillo: 0.55 };
M.cu_oro = { rampa: ['#1c1004', '#36210a', '#553711', '#77501a', '#996b25', '#b98733', '#d4a548', '#e8c46a', '#f6e2a0'], ruido: 0.04, escala: 0.6, brillo: 0.7 };
M.cu_tela_blanca = { rampa: ['#24221f', '#3b3833', '#56524b', '#726d64', '#8e887e', '#a9a398', '#c2bcb1'], ruido: 0.12, escala: 1.2 };
M.cu_tela_roja = { rampa: ['#1a0505', '#2e0909', '#460f0e', '#5f1614', '#781f1b', '#902a24', '#a5372f'], ruido: 0.12, escala: 1.2 };
M.cu_tela_azul = { rampa: ['#070b17', '#0d1528', '#14203b', '#1d2c4f', '#283b64', '#354b78', '#445d8b'], ruido: 0.12, escala: 1.2 };
M.cu_tela_verde = { rampa: ['#080e08', '#0f1a0f', '#172818', '#203722', '#2a462c', '#365637', '#436644'], ruido: 0.12, escala: 1.2 };
M.cu_tela_morada = { rampa: ['#0f0814', '#1b0f24', '#291736', '#382049', '#482b5c', '#59386f', '#6b4782'], ruido: 0.12, escala: 1.2 };
M.cu_tela_negra = { rampa: ['#060607', '#0c0c0e', '#141417', '#1d1d21', '#27272c', '#323238', '#3e3e45'], ruido: 0.12, escala: 1.2 };
M.cu_tela_parda = { rampa: ['#120d08', '#20180f', '#302417', '#413120', '#533f2a', '#654e35', '#785e41'], ruido: 0.14, escala: 1.2 };
M.cu_pelaje = { rampa: ['#100b07', '#1d150d', '#2c2015', '#3c2c1d', '#4d3926', '#5f4830', '#72583c', '#86694a'], ruido: 0.6, escala: 1.6, patron: (p) => (ruido(p[0] * 3, p[1] * 3, p[2] * 1.2) - 0.5) * 0.3 };
M.cu_pelaje_gris = { rampa: ['#0f0f0f', '#1c1c1c', '#2b2b2a', '#3c3b39', '#4e4c49', '#615e5a', '#75716c', '#8a857f'], ruido: 0.6, escala: 1.6, patron: (p) => (ruido(p[0] * 3, p[1] * 3, p[2] * 1.2) - 0.5) * 0.3 };
M.cu_hueso = { rampa: ['#1b1712', '#2f291f', '#47402f', '#615741', '#7c7055', '#978a6c', '#b0a385', '#c7bb9f', '#d9cfb6'], ruido: 0.18, escala: 0.9 };
M.cu_quitina = { rampa: ['#070608', '#100d11', '#1b161c', '#272029', '#342b37', '#433746', '#544657'], ruido: 0.12, escala: 0.7, brillo: 0.5 };
M.cu_escama = { rampa: ['#0a0c08', '#141810', '#1f2518', '#2b3321', '#38422b', '#465236', '#556342'], ruido: 0.15, escala: 0.6, brillo: 0.25, patron: (p) => { const a = Math.sin(p[0] * 1.9 + Math.sin(p[2] * 1.7) * 2) * Math.sin(p[2] * 1.9); return a > 0.6 ? -0.18 : 0; } };
M.cu_roca = { rampa: ['#0e0c0b', '#1c1916', '#2b2621', '#3b342d', '#4c443a', '#5e5448', '#706557', '#837767'], ruido: 0.45, escala: 0.35 };
M.cu_lava = { rampa: ['#7a1a04', '#c03a08', '#f07010', '#ffb030', '#fff090'], ruido: 0.4, escala: 0.5, emite: true };
M.cu_venda = { rampa: ['#221e16', '#373024', '#4f4634', '#695e47', '#83775b', '#9c9072', '#b3a88a'], ruido: 0.3, escala: 1.1, patron: (p) => ((Math.floor(p[2] * 1.1 + p[0] * 0.35 + p[1] * 0.2) % 2) ? -0.09 : 0.04) };
M.cu_sombra = { rampa: ['#12061c', '#2a0e40', '#4a1a6c', '#7a34a8', '#b070e0'], ruido: 0.45, escala: 0.5, emite: true };
M.cu_rayo = { rampa: ['#3050c0', '#6090ff', '#b0d0ff', '#f0f8ff'], ruido: 0.2, escala: 1, emite: true };
M.cu_sangre_viva = { rampa: ['#3a0204', '#6a0408', '#a00c10', '#d02820', '#ff6040'], ruido: 0.3, escala: 0.6, emite: true };
M.cu_luz_santa = { rampa: ['#806020', '#c09838', '#f0d060', '#fff4c0', '#ffffff'], ruido: 0.15, escala: 0.6, emite: true };
M.cu_ectoplasma = { rampa: ['#204a60', '#3a7a90', '#68b0c0', '#a8e0e8', '#e8ffff'], ruido: 0.3, escala: 0.4, emite: true };

// ------------------------------------------------------------------ tipos
export interface Cuerpo {
  genero?: 'h' | 'm';
  alto?: number; ancho?: number;
  /** Músculo 0..1 (marca pectorales, deltoides, bíceps, cuádriceps) y grasa 0..1 (barriga, cara llena). */
  musculo?: number; grasa?: number;
  piel: string; ojos?: string;
  pelo?: string; peinado?: 'corto' | 'rapado' | 'largo' | 'cola' | 'trenzas' | 'melena' | 'calvo' | 'cresta' | 'mono';
  barba?: 'corta' | 'larga' | 'bigote' | 'trenzada';
  orejas?: 'puntiagudas' | 'grandes';
  cuernos?: 'carnero' | 'demonio' | 'cortos';
  cola?: string;
  /** Joroba 0..1 (encorvado) y cuello hundido. */
  joroba?: number;
  /** Cabeza grande o chica (1 = normal). */
  cabeza?: number;
  /** Alas de demonio o murciélago. */
  alas?: string;
  /** Cómo se luce en la pantalla de selección (acción presentar). */
  presentacion?: import('./figura').Presentacion;
  /** Solo huesos (esqueletos): costillar, columna, cráneo y huesos largos con nudos en las articulaciones. */
  oseo?: boolean;
  /** Carne podrida o vendas: tono por parche. */
  parches?: string;
  /** Terror: boca abierta (fauces) o colmillos, costillas bajo la piel, heridas con sangre, garras largas, flota sin piernas. */
  boca?: 'fauces' | 'colmillos';
  demacrado?: boolean;
  heridas?: boolean;
  garras?: boolean;
  flota?: boolean;
}
export type Pieza_ = Pieza;
export interface Equipo {
  torso?: { tipo: 'camisa' | 'sin_mangas' | 'tunica' | 'cuero' | 'cuero_tachonado' | 'malla' | 'placas' | 'harapos' | 'vestido'; mat: string; mat2?: string };
  piernas?: { tipo: 'pantalon' | 'calzas' | 'faldon' | 'tunica_larga' | 'grebas' | 'taparrabo'; mat: string; mat2?: string };
  pies?: { tipo: 'botas' | 'botas_altas' | 'sandalias' | 'sabatones' | 'vendas'; mat: string };
  manos?: { tipo: 'guantes' | 'guanteletes' | 'vendas' | 'brazales'; mat: string };
  cabeza?: { tipo: 'capucha' | 'gorro' | 'casco' | 'yelmo' | 'gran_yelmo' | 'cuernos' | 'corona' | 'diadema' | 'mascara' | 'calavera' | 'turbante' | 'aro'; mat: string; mat2?: string };
  hombros?: { tipo: 'pieles' | 'cuero' | 'placas' | 'puas' | 'huesos'; mat: string };
  cinturon?: { mat: string; hebilla?: string };
  capa?: { mat: string; largo?: number; forro?: string };
  arma?: { tipo: TipoArma; mat?: string; mango?: string; gema?: string; encanto?: Encanto };
  izq?: { tipo: 'escudo_redondo' | 'escudo_cometa' | 'escudo_torre' | 'rodela' | 'escudo_calavera' | 'orbe' | 'libro' | 'antorcha' | 'arma'; mat?: string; mat2?: string; arma?: TipoArma };
  /** Tabardo o faldón con color de la orden. */
  tabardo?: { mat: string; borde?: string };
}
/** Armas vivas: el encantamiento arde, escarcha, chispea, gotea o humea sobre la hoja en cada cuadro. */
export type Encanto = 'fuego' | 'hielo' | 'rayo' | 'veneno' | 'sombra' | 'sagrado' | 'sangre';
export const ENCANTOS: [Encanto, string, string, string][] = [
  ['fuego', 'de fuego', 'of fire', '#ff7a20'], ['hielo', 'de escarcha', 'of frost', '#80c8ff'], ['rayo', 'del trueno', 'of thunder', '#a0c0ff'],
  ['veneno', 'de ponzoña', 'of venom', '#60e040'], ['sombra', 'de las sombras', 'of shadows', '#9040d0'], ['sagrado', 'de la luz', 'of light', '#ffe080'], ['sangre', 'sangrienta', 'of blood', '#e02020'],
];
export type TipoArma = 'espada' | 'cimitarra' | 'mandoble' | 'hacha' | 'hacha_doble' | 'maza' | 'martillo' | 'mangual' | 'lanza' | 'alabarda' | 'guadana'
  | 'baculo' | 'cetro' | 'varita' | 'daga' | 'garras' | 'arco' | 'ballesta' | 'puno' | 'nada';

const dos = (t?: TipoArma) => t === 'mandoble' || t === 'hacha_doble' || t === 'martillo' || t === 'alabarda' || t === 'guadana';

// ------------------------------------------------------------------ esqueleto en el mundo
const RUMBO: Record<Dir, number> = { se: 0, s: 45, so: 90, o: 135, no: 180, n: 225, ne: 270, e: 315 };
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const nor = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rad = (g: number) => (g * Math.PI) / 180;

type Fn = (fw: number, rt: number, up: number) => V3;
interface Pierna { s: number; cad: V3; rod: V3; tob: V3; talon: V3; punta: V3 }
interface Brazo { s: number; hom: V3; codo: V3; mun: V3; mano: V3; d1: V3; d2: V3; /** eje del arma que empuña: del puño a la punta */ eje: V3 }
export interface Esqueleto {
  S: number; A: number; F: V3; R: V3; zc: number; hombroZ: number; cz: number;
  W: Fn; T: Fn; cab: Fn; ejesT: [V3, V3, V3]; ejesCab: [V3, V3, V3];
  piernas: Pierna[]; brazos: Brazo[]; caida: number;
}
const ejesDe = (fn: Fn, o: [number, number, number]): [V3, V3, V3] => {
  const c = fn(...o), ex = nor(sub(fn(o[0] + 1, o[1], o[2]), c)), up = nor(sub(fn(o[0], o[1], o[2] + 1), c));
  const ey = nor(cruz(up, ex)), ez = cruz(ex, ey);
  return [ex, ey, ez];
};

export function esqueleto(cu: Cuerpo, dir: Dir, acc: Accion, f: number, arma: TipoArma = 'nada'): Esqueleto {
  const S = cu.alto ?? 1, A = (cu.ancho ?? 1) * S;
  const tipo = dos(arma) || arma === 'ballesta' ? 'dos' : arma === 'arco' ? 'arco' : arma === 'baculo' || arma === 'lanza' || arma === 'cetro' ? 'baculo' : arma === 'garras' || arma === 'puno' ? 'garras' : arma === 'nada' ? 'nada' : 'una';
  const P = pose(acc, f, tipo as 'una', cu.presentacion);
  const th = rad(RUMBO[dir]);
  const F: V3 = [Math.cos(th), Math.sin(th), 0], R: V3 = [Math.sin(th), -Math.cos(th), 0];
  const W: Fn = (fw, rt, up) => [F[0] * fw + R[0] * rt, F[1] * fw + R[1] * rt, up];
  const caer = (q: V3): V3 => {
    if (!P.caida) return q;
    const a = rad(-82 * P.caida);
    const fw = q[0] * F[0] + q[1] * F[1], rt = q[0] * R[0] + q[1] * R[1];
    const nf = fw * Math.cos(a) - q[2] * Math.sin(a), nz = Math.max(0.6, fw * Math.sin(a) + q[2] * Math.cos(a));
    return W(nf - 4 * P.caida, rt, nz);
  };
  const Wc: Fn = (fw, rt, up) => caer(W(fw + P.avanza, rt, up));
  // la pisada: en la marcha la cadera baja hasta que el tobillo de apoyo queda a la altura del piso (sin pies flotando)
  const extension = ([hz, rod]: [number, number]) => 14.5 * Math.cos(rad(hz)) + 14 * Math.cos(rad(hz - rod));
  const zc = P.suelo ? (Math.max(extension(P.caderaD), extension(P.caderaI)) + 2.4 + (P.vuelo ?? 0)) * S : (31 - P.bajar) * S;
  const tor = rad(P.torso + (cu.joroba ?? 0) * 18), gir = rad(P.giroTorso);
  const T: Fn = (fw, rt, up) => {
    const f2 = fw * Math.cos(gir) - rt * Math.sin(gir), r2 = fw * Math.sin(gir) + rt * Math.cos(gir);
    const dz = up - zc;
    return Wc(f2 * Math.cos(tor) + dz * Math.sin(tor), r2, zc + dz * Math.cos(tor) - f2 * Math.sin(tor));
  };
  const hombroZ = zc + 16.5 * S;
  const cz = hombroZ + 7.6 * S - (cu.joroba ?? 0) * 2 * S;
  const cabeza = rad(P.cabeza - (cu.joroba ?? 0) * 25);
  const cab: Fn = (fw, rt, up) => { const dz = up - hombroZ; return T(fw * Math.cos(cabeza) + dz * Math.sin(cabeza) + (cu.joroba ?? 0) * 3 * S, rt, hombroZ + dz * Math.cos(cabeza) - fw * Math.sin(cabeza)); };
  const piernas: Pierna[] = [];
  for (const [s, [hz, rod]] of [[1, P.caderaD], [-1, P.caderaI]] as [number, [number, number]][]) {
    const cad: V3 = [0, s * 3.6 * A, zc];
    const a1 = rad(hz), a2 = rad(hz - rod), L1 = 14.5 * S, L2 = 14 * S;
    const rodl: V3 = [cad[0] + Math.sin(a1) * L1, cad[1], cad[2] - Math.cos(a1) * L1];
    const tob: V3 = [rodl[0] + Math.sin(a2) * L2, rodl[1], rodl[2] - Math.cos(a2) * L2];
    const pz = Math.max(1.1 * S, tob[2] - 1.6 * S);
    piernas.push({ s, cad: Wc(...cad), rod: Wc(...rodl), tob: Wc(...tob), talon: Wc(tob[0] - 1.2 * S, tob[1], Math.max(1.1 * S, tob[2] - 2.2 * S)), punta: Wc(tob[0] + 4.6 * S, tob[1] * 1.04, pz - 0.2 * S) });
  }
  const brazos: Brazo[] = [];
  for (const [s, [adel, afuera, codo]] of [[1, P.hombroD], [-1, P.hombroI]] as [number, [number, number, number]][]) {
    const h0: V3 = [0, s * 6.4 * A, hombroZ];
    const a1 = rad(adel), b1 = rad(afuera) * s, L1 = 11.5 * S, L2 = 10.2 * S;
    const d1: V3 = [Math.sin(a1) * Math.cos(b1), Math.sin(b1), -Math.cos(a1) * Math.cos(b1)];
    const c: V3 = add(h0, d1, L1);
    const a2 = rad(adel + codo);
    const d2: V3 = [Math.sin(a2) * Math.cos(b1 * 0.5), Math.sin(b1 * 0.5), -Math.cos(a2) * Math.cos(b1 * 0.5)];
    const mu: V3 = add(c, d2, L2), ma: V3 = add(c, d2, L2 + 1.9 * S);
    const hW = T(...h0), cW = T(...c), mW = T(...mu), maW = T(...ma);
    brazos.push({ s, hom: hW, codo: cW, mun: mW, mano: maW, d1: nor(sub(cW, hW)), d2: nor(sub(mW, cW)), eje: [0, 0, 1] });
  }
  // ---- el agarre: la hoja sale del puño cerrado casi en ángulo recto con el antebrazo (hacia donde apunta el pulgar)
  const L1 = 11.5 * S, L2 = 10.2 * S + 1.9 * S;
  for (const b of brazos) b.eje = ejeAgarre(b.d2, F, arma, b.s);
  const der = brazos[0], izq = brazos[1];
  // armas a dos manos, lanzas y ballestas: la mano izquierda se cierra sobre el mango (cinemática inversa de dos huesos)
  const separa = arma === 'lanza' || arma === 'alabarda' || arma === 'guadana' ? 11 : dos(arma) ? 4.8 : arma === 'ballesta' ? -9 : 0;
  if (separa && !P.caida) {
    const meta = arma === 'ballesta' ? add(add(der.mano, F, 7 * S), R, 2.5 * S) : add(der.mano, der.eje, -separa * S);
    const afuera = nor(add(R, [0, 0, 0], izq.s));
    const pol = nor(add([0, 0, -1], afuera, 0.8));
    const h = izq.hom, dv = sub(meta, h), dist = Math.min(len(dv), L1 + L2 - 0.05), dir = nor(dv);
    const ca = Math.max(-1, Math.min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))), sa = Math.sqrt(1 - ca * ca);
    const per = nor(sub(pol, [dir[0] * dot3(pol, dir), dir[1] * dot3(pol, dir), dir[2] * dot3(pol, dir)]));
    const codo = add(add(h, dir, L1 * ca), per, L1 * sa), mano = add(h, dir, dist);
    const d2 = nor(sub(mano, codo));
    Object.assign(izq, { codo, mano, mun: add(mano, d2, -1.9 * S), d1: nor(sub(codo, h)), d2, eje: der.eje });
  }
  return { S, A, F, R, zc, hombroZ, cz, W: Wc, T, cab, ejesT: ejesDe(T, [0, 0, zc + 10]), ejesCab: ejesDe(cab, [0, 0, cz]), piernas, brazos, caida: P.caida };
}

const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/**
 * Eje del arma en el puño: el antebrazo girado hacia el pulgar. Una espada con el brazo colgando apunta adelante y un
 * poco abajo; en el tajo sigue al brazo. Las garras siguen el antebrazo; la lanza va casi horizontal.
 */
function ejeAgarre(d2: V3, F: V3, arma: TipoArma, s: number): V3 {
  void s;
  let pul = sub(F, [d2[0] * dot3(F, d2), d2[1] * dot3(F, d2), d2[2] * dot3(F, d2)]);
  if (len(pul) < 0.25) pul = sub([0, 0, 1], [d2[0] * d2[2], d2[1] * d2[2], d2[2] * d2[2]]);
  pul = nor(pul);
  const a = rad(arma === 'garras' || arma === 'puno' ? 0 : arma === 'lanza' || arma === 'alabarda' ? 82 : dos(arma) ? 58 : arma === 'daga' || arma === 'varita' ? 55 : 66);
  return nor(add([d2[0] * Math.cos(a), d2[1] * Math.cos(a), d2[2] * Math.cos(a)], pul, Math.sin(a)));
}

// ------------------------------------------------------------------ partes de la carne (con inflado para la ropa)
type Parte = 'pelvis' | 'abdomen' | 'pecho' | 'hombros' | 'cuello' | 'brazo' | 'antebrazo' | 'mano' | 'muslo' | 'pantorrilla' | 'pie' | 'cabeza' | 'craneo';
/** Las partes del cuerpo como componentes de masa, `inf` unidades más gruesas, con el material dado. */
function partes(e: Esqueleto, cu: Cuerpo, que: Parte[], inf: number, mat?: string, extra: { mangaCorta?: boolean; hasta?: number } = {}): Comp[] {
  const { S, A, T, cab, ejesT, ejesCab } = e;
  const mu = cu.musculo ?? 0.4, gr = cu.grasa ?? 0, mujer = cu.genero === 'm';
  const tiene = (p: Parte) => que.includes(p);
  const o = { mat };
  const cs: Comp[] = [];
  const bT = (fw: number, rt: number, up: number, r: V3, k?: number) => bulto(T(fw, rt, up), [r[0] + inf, r[1] + inf, r[2] + inf], { ejes: ejesT, mat, k });
  const zc = e.zc, hz = e.hombroZ;
  if (tiene('pelvis')) {
    cs.push(bulto(e.W(0, 0, zc + 0.6 * S), [3.7 * A + inf, (mujer ? 5.6 : 4.9) * A + inf, 4.1 * S + inf], { ejes: ejesDe(e.W, [0, 0, zc]), mat }));
    for (const s of [1, -1]) cs.push(bulto(e.W(-2.3 * A, s * 2.4 * A, zc - 0.8 * S), [2.6 * A + inf, 2.7 * A + inf, 3.2 * S + inf], { ejes: ejesDe(e.W, [0, 0, zc]), mat }));
  }
  if (tiene('abdomen')) {
    cs.push(bT(0.5 * S + gr * 1.5, 0, zc + 6.2 * S, [3.4 * A + gr * 2.2, (mujer ? 4.0 : 4.4) * A + gr * 1.2, 4.6 * S]));
    if (mu > 0.55 && inf < 0.2) for (let i = 0; i < 3; i++) for (const s of [1, -1]) cs.push(bT(3.1 * A, s * 1.25 * A, zc + (4.2 + i * 2.5) * S, [0.9 * A, 1.3 * A, 1.15 * S], 1.2));
  }
  if (tiene('pecho')) {
    cs.push(bT(0.2 * S, 0, zc + 12.3 * S, [4.0 * A + gr, (mujer ? 4.9 : 5.7 + mu * 0.6) * A, 5.4 * S]));
    if (mujer) for (const s of [1, -1]) cs.push(bT(3.3 * A, s * 2.2 * A, zc + 12.4 * S, [2.0 * A, 1.9 * A, 1.9 * S]));
    else for (const s of [1, -1]) cs.push(bT(2.7 * A, s * 2.6 * A, zc + 13.6 * S, [(1.5 + mu * 0.7) * A, (2.5 + mu * 0.6) * A, (2.1 + mu * 0.4) * S], 1.6));
  }
  if (tiene('hombros')) for (const s of [1, -1]) {
    // trapecio del cuello al hombro y el deltoides sobre la cabeza del brazo
    const b = e.brazos.find((x) => x.s === s)!;
    cs.push(hueso(T(-0.6 * S, s * 1.4 * A, hz + 3 * S), T(-0.2 * S, s * 5.4 * A, hz + 0.8 * S), (1.7 + mu * 0.6) * A + inf, (1.4 + mu * 0.3) * A + inf, o));
    cs.push(bulto(add(b.hom, b.d1, 1.4 * S), [(3.0 + mu * 0.6) * A + inf, (2.5 + mu * 0.5) * A + inf, (2.5 + mu * 0.5) * A + inf], { eje: b.d1, mat }));
  }
  if (tiene('cuello')) cs.push(hueso(T(-0.3 * S, 0, hz + 0.4 * S), cab(0.2 * S, 0, e.cz - 2.6 * S), (1.9 + mu * 0.5) * S + inf, (1.7 + mu * 0.2) * S + inf, o));
  for (const b of e.brazos) {
    if (tiene('brazo')) {
      const fin = extra.mangaCorta ? mez(b.hom, b.codo, 0.55) : b.codo;
      cs.push(hueso(b.hom, fin, 2.3 * A + inf, (extra.mangaCorta ? 2.1 : 1.75) * A + inf, o));
      if (mu > 0.2) cs.push(bulto(add(mez(b.hom, b.codo, 0.5), nor(cruz(b.d1, cruz([0, 0, 1], b.d1))), 0), [(3.4 + mu) * S + inf * 0.5, (1.4 + mu * 0.9) * A + inf, (1.4 + mu * 0.9) * A + inf], { eje: b.d1, mat }));
    }
    if (tiene('antebrazo')) {
      const fin = extra.hasta !== undefined ? mez(b.codo, b.mun, extra.hasta) : b.mun;
      const ini = extra.hasta !== undefined && extra.hasta < 0 ? b.codo : b.codo;
      cs.push(hueso(ini, fin, 1.85 * A + inf, 1.25 * A + inf, o));
      cs.push(bulto(mez(b.codo, b.mun, 0.28), [3.1 * S + inf * 0.5, (1.5 + mu * 0.5) * A + inf, (1.4 + mu * 0.4) * A + inf], { eje: b.d2, mat }));
    }
    if (tiene('mano')) {
      cs.push(bulto(b.mano, [1.9 * S + inf, 1.1 * A + inf, 1.6 * S + inf], { eje: b.d2, mat }));
      cs.push(hueso(add(b.mun, cruz(b.d2, [0, 0, 1]), 0.6 * b.s), add(b.mano, cruz(b.d2, [0, 0, 1]), 1.1 * b.s), 0.55 * S + inf, 0.5 * S + inf, o));
    }
  }
  for (const p of e.piernas) {
    if (tiene('muslo')) {
      cs.push(hueso(p.cad, p.rod, (3.5 + gr * 0.8) * A + inf, 2.3 * A + inf, o));
      const adelante = nor(cruz(cruz(nor(sub(p.rod, p.cad)), e.F), nor(sub(p.rod, p.cad))));
      void adelante;
      cs.push(bulto(mez(p.cad, p.rod, 0.45), [6.2 * S + inf * 0.5, (2.6 + mu * 0.5) * A + inf, (2.9 + mu * 0.5) * A + inf], { eje: sub(p.rod, p.cad), mat }));
      cs.push(bulto(p.rod, [1.8 * A + inf, 2.0 * A + inf, 2.0 * A + inf], { mat }));
    }
    if (tiene('pantorrilla')) {
      const fin = extra.hasta !== undefined ? mez(p.rod, p.tob, extra.hasta) : p.tob;
      cs.push(hueso(p.rod, fin, 2.2 * A + inf, 1.3 * A + inf, o));
      // gemelo atrás de la pierna
      const pa = nor(sub(p.tob, p.rod)), atras = nor(add(cruz(cruz(pa, e.F), pa), [0, 0, 0]));
      cs.push(bulto(add(mez(p.rod, p.tob, 0.3), atras, -0.6 * A), [4.4 * S + inf * 0.5, (2.0 + mu * 0.4) * A + inf, (2.1 + mu * 0.4) * A + inf], { eje: pa, mat }));
    }
    if (tiene('pie')) {
      cs.push(hueso(p.talon, p.punta, 1.6 * A + inf, 1.25 * A + inf, o));
      cs.push(bulto(p.tob, [1.5 * A + inf, 1.5 * A + inf, 1.7 * S + inf], { mat }));
    }
  }
  if (tiene('cabeza') || tiene('craneo')) {
    const H = (cu.cabeza ?? 1) * S, cz = e.cz;
    const bC = (fw: number, rt: number, up: number, r: V3, m = mat, k?: number) => bulto(cab(fw * H, rt * H, cz + up * H), [r[0] * H + inf, r[1] * H + inf, r[2] * H + inf], { ejes: ejesCab, mat: m, k });
    cs.push(bC(-0.2, 0, 0.9, [4.0, 3.55, 4.3]));
    if (tiene('cabeza')) {
      cs.push(bC(1.5, 0, -2.0, [2.9 + gr * 0.4, (mujer ? 2.5 : 2.85) + gr * 0.6, 2.4], mat, 1.6)); // mandíbula
      cs.push(bC(2.9, 0, -2.9, [1.1, mujer ? 1.2 : 1.6, 1.1], mat, 1.2)); // mentón
      for (const s of [1, -1]) cs.push(bC(2.6, s * 2.0, -0.4, [1.3, 1.1, 1.0], mat, 1)); // pómulos
      cs.push(bC(3.2, 0, 1.15, [0.9, 3.0, 0.75], mat, 0.9)); // arco de las cejas
      cs.push(hueso(cab(3.75 * H, 0, cz + 0.7 * H), cab(4.55 * H, 0, cz - 1.0 * H), 0.45 * H + inf, 0.75 * H + inf, { mat, k: 0.6 })); // nariz
      for (const s of [1, -1]) {
        if (cu.orejas === 'puntiagudas') cs.push(hueso(cab(-0.2 * H, s * 3.4 * H, cz), cab(-1.6 * H, s * 5.6 * H, cz + 2.4 * H), 0.9 * H, 0.2 * H, { mat, k: 0.6 }));
        else cs.push(bC(-0.2, s * 3.45, -0.1, cu.orejas === 'grandes' ? [1.4, 0.6, 2.2] : [1.0, 0.5, 1.5], mat, 0.6));
      }
    }
  }
  return cs;
}

// ------------------------------------------------------------------ el personaje completo
/** El personaje como escena: si su arma está encantada, la luz del encantamiento tiñe lo que tiene cerca. */
export function personajeEscena(cu: Cuerpo, eq: Equipo, dir: Dir, acc: Accion, f: number): { piezas: Pieza[]; resplandor?: { c: V3; r: number; color: string } } {
  const piezas = personaje(cu, eq, dir, acc, f);
  const en = eq.arma?.encanto;
  if (!en || !eq.arma) return { piezas };
  const e = esqueleto(cu, dir, acc, f, eq.arma.tipo);
  const [a, b] = filoDe(e, eq.arma.tipo, e.brazos[0]);
  return { piezas, resplandor: { c: mez(a, b, 0.5), r: 15 * e.S, color: ENCANTOS.find((x) => x[0] === en)![3] } };
}

export function personaje(cu: Cuerpo, eq: Equipo, dir: Dir, acc: Accion, f: number): Pieza[] {
  const tipoArma = eq.arma?.tipo ?? 'nada';
  const e = esqueleto(cu, dir, acc, f, tipoArma);
  const { S, A, T, cab, ejesCab, F, R } = e;
  const H = (cu.cabeza ?? 1) * S, cz = e.cz;
  const ps: Pieza[] = [];
  const todo: Parte[] = ['pelvis', 'abdomen', 'pecho', 'hombros', 'cuello', 'brazo', 'antebrazo', 'mano', 'muslo', 'pantorrilla', 'pie', 'cabeza'];
  // carne (o huesos)
  if (cu.oseo) ps.push(...huesos(e, cu));
  else {
    let carne = partes(e, cu, cu.flota ? todo.filter((p) => p !== 'pantorrilla' && p !== 'pie') : todo, 0);
    if (cu.parches) carne = carne.map((c, i) => (i % 3 === 1 ? { ...c, mat: cu.parches } : c));
    if (cu.demacrado) for (let k = 0; k < 5; k++) for (const s of [1, -1]) {
      // costillas que se marcan bajo la piel del pecho
      const z = e.zc + (8.6 + k * 2) * S, w = (4.9 - Math.abs(k - 2) * 0.3) * A;
      carne.push(hueso(T(-0.5 * S, s * w, z), T(3.3 * A, s * 1.2 * A, z - 2 * S), 0.55 * S, 0.45 * S, { mat: cu.piel, k: 0.5 }));
    }
    ps.push(masa(carne, { mat: cu.piel, suave: 1.6 }));
  }
  // terror: fauces con dientes, heridas, garras y jirones de ectoplasma bajo el que flota
  if (cu.boca) {
    const g = cu.boca === 'fauces';
    ps.push(elipsoide(...cab(3.55 * H, 0, cz - 2.2 * H), (g ? 1.1 : 0.7) * H, (g ? 1.9 : 1.6) * H, (g ? 1.5 : 0.5) * H, { mat: 'cu_tela_negra' }));
    const filas: [number, number][] = g ? [[-1.1, 1], [-3.2, -1]] : [[-1.7, 1]];
    for (const [z, sg] of filas) for (let k = -2; k <= 2; k++) {
      const base = cab((3.9 - Math.abs(k) * 0.25) * H, k * 0.65 * H, cz + z * H), punta = cab((3.95 - Math.abs(k) * 0.25) * H, k * 0.62 * H, cz + (z - sg * (Math.abs(k) === 2 && !g ? 1.6 : 0.9)) * H);
      ps.push(palo(base, punta, 0.28 * H, { mat: 'cu_hueso', r1: 0.04 }));
    }
  }
  if (cu.heridas) for (let k = 0; k < 5; k++) {
    const sgn = k % 2 ? 1 : -1;
    ps.push(elipsoide(...T((3.4 + (k % 3) * 0.2) * A, sgn * (1 + k * 0.5) * A, e.zc + (5 + k * 2.6) * S), 0.6 * S, 1.4 * S, (1 + (k % 2)) * S, { mat: 'sangre' }));
  }
  if (cu.garras) for (const b of e.brazos) for (const k of [-1, 0, 1]) {
    const lado = nor(cruz(b.d2, [0, 0, 1])), base = add(b.mano, lado, k * 0.9 * S);
    const medio = add(add(base, b.d2, 3 * S), lado, k * 0.6 * S), punta = add(add(add(medio, b.d2, 2.6 * S), lado, k * 0.4 * S), [0, 0, -0.9 * S]);
    ps.push(palo(base, medio, 0.4 * S, { mat: 'cu_hueso', r1: 0.3 * S }), palo(medio, punta, 0.3 * S, { mat: 'cu_hueso', r1: 0.05 }));
  }
  if (cu.flota) for (let k = 0; k < 7; k++) {
    const u = ((f + k * 1.3) % 8) / 8, an = k * 0.9 + u * 2;
    ps.push(elipsoide(...e.W(Math.cos(an) * 3 * A - u * 3 * S, Math.sin(an) * 3 * A, Math.max(1, e.zc - 14 * S - u * 6 * S)), 1.2 * S * (1 - u * 0.6), 1.2 * S * (1 - u * 0.6), 2.2 * S, { mat: 'cu_ectoplasma' }));
  }
  // ojos (un poco hundidos bajo las cejas) y boca
  const ojo = cu.ojos ?? 'cu_ojo', brilla = MATERIALES[ojo]?.emite;
  for (const s of [1, -1]) ps.push(elipsoide(...cab(3.35 * H, s * 1.45 * H, cz + 0.25 * H), (brilla ? 0.7 : 0.5) * H, 0.75 * H, (brilla ? 0.55 : 0.5) * H, { mat: ojo }));
  // ---- piernas y pies
  const pz = eq.piernas, pi = eq.pies;
  if (pz) {
    if (pz.tipo === 'pantalon' || pz.tipo === 'calzas') ps.push(masa(partes(e, cu, ['pelvis', 'muslo', 'pantorrilla'], pz.tipo === 'calzas' ? 0.35 : 0.65, pz.mat), { mat: pz.mat, suave: 1.6 }));
    else if (pz.tipo === 'grebas') {
      ps.push(masa(partes(e, cu, ['pelvis', 'muslo'], 0.7, pz.mat2 ?? 'cu_malla'), { mat: pz.mat2 ?? 'cu_malla', suave: 1.6 }));
      ps.push(masa(partes(e, cu, ['pantorrilla'], 1.1, pz.mat), { mat: pz.mat, suave: 0.8 }));
      for (const p of e.piernas) ps.push(masa([bulto(p.rod, [2.6 * A, 2.6 * A, 2.4 * S], { eje: sub(p.rod, p.cad), mat: pz.mat })], { mat: pz.mat }), masa([hueso(mez(p.cad, p.rod, 0.15), mez(p.cad, p.rod, 0.85), 3.9 * A, 2.9 * A, { mat: pz.mat })], { mat: pz.mat }));
    } else if (pz.tipo === 'taparrabo') {
      ps.push(masa(partes(e, cu, ['pelvis'], 0.5, pz.mat), { mat: pz.mat }));
      ps.push(faldon(e, pz.mat, 9, 1.05, acc, f));
    } else if (pz.tipo === 'faldon') {
      ps.push(masa(partes(e, cu, ['pelvis', 'muslo', 'pantorrilla'], 0.5, pz.mat2 ?? 'cu_tela_parda'), { mat: pz.mat2 ?? 'cu_tela_parda', suave: 1.6 }));
      ps.push(faldon(e, pz.mat, 15, 1.25, acc, f));
    } else if (pz.tipo === 'tunica_larga') ps.push(faldon(e, pz.mat, 30, 1.5, acc, f));
  }
  if (pi) {
    if (pi.tipo === 'sandalias') for (const p of e.piernas) ps.push(masa([hueso(add(p.talon, [0, 0, -0.9]), add(p.punta, [0, 0, -0.7]), 1.7 * A, 1.4 * A, { mat: pi.mat })], { mat: pi.mat }));
    else {
      const alto = pi.tipo === 'botas_altas' || pi.tipo === 'sabatones' ? 0.3 : pi.tipo === 'vendas' ? 0.55 : 0.55;
      ps.push(masa(partes(e, cu, ['pantorrilla', 'pie'], pi.tipo === 'sabatones' ? 1.2 : 0.8, pi.mat, { hasta: 1 }).filter((c) => c.f === 'hueso' ? true : true).map((c) => c), { mat: pi.mat, suave: 1.2 }));
      // la caña corta: tapa solo desde `alto` del largo de la pantorrilla hacia abajo (se recorta con la carne de arriba)
      void alto;
    }
  }
  // ---- torso
  const to = eq.torso;
  if (to) {
    const mangas = to.tipo === 'sin_mangas' || to.tipo === 'vestido' ? [] : (['brazo'] as Parte[]);
    const largo = to.tipo === 'camisa' || to.tipo === 'tunica' || to.tipo === 'malla' || to.tipo === 'harapos' ? (['antebrazo'] as Parte[]) : [];
    const inf = to.tipo === 'camisa' || to.tipo === 'sin_mangas' || to.tipo === 'vestido' ? 0.55 : to.tipo === 'malla' ? 0.85 : to.tipo === 'placas' ? 0.7 : 1;
    const base: Parte[] = ['pelvis', 'abdomen', 'pecho', 'hombros', ...mangas, ...largo];
    const matBase = to.tipo === 'placas' ? to.mat2 ?? 'cu_malla' : to.mat;
    ps.push(masa(partes(e, cu, base, inf, matBase, { mangaCorta: to.tipo === 'cuero' || to.tipo === 'cuero_tachonado' }), { mat: matBase, suave: 1.6 }));
    if (to.tipo === 'tunica' || to.tipo === 'harapos') ps.push(faldon(e, to.mat, to.tipo === 'harapos' ? 13 : 12, 1.2, acc, f));
    if (to.tipo === 'vestido') ps.push(faldon(e, to.mat, 29, 1.7, acc, f));
    if (to.tipo === 'cuero_tachonado') for (let i = 0; i < 4; i++) for (const s of [1, -1, 0]) ps.push(esfera(...T(3.9 * A + 0.6, s * 2.6 * A, e.zc + (5 + i * 3) * S), 0.5, { mat: 'cu_placa' }));
    if (to.tipo === 'placas') {
      // peto curvo, espaldar, faldares y el borde dorado
      const peto = partes(e, cu, ['abdomen', 'pecho'], 1.5, to.mat);
      ps.push(masa(peto, { mat: to.mat, suave: 2.4 }));
      for (let i = 0; i < 3; i++) ps.push(cilindro(...e.W(0, 0, e.zc - 2 * S - i * 2.6 * S), (5.6 + i * 0.35) * A, 2.4 * S, { mat: to.mat, r1: (5.3 + i * 0.35) * A, tono: -i * 0.03 }));
      ps.push(elipsoide(...T(4.9 * A, 0, e.zc + 15.2 * S), 0.6, 4.4 * A, 0.7, { mat: 'cu_oro', giro: 0 }));
      // brazos de placa: brazal superior, codera con aleta y remache, para que el brazo lea como armadura y no como maniquí
      for (const b of e.brazos) {
        const lado = nor(cruz(b.d1, [0, 0, 1]));
        ps.push(masa([hueso(mez(b.hom, b.codo, 0.28), mez(b.hom, b.codo, 0.86), 2.15 * A, 1.9 * A, { mat: to.mat })], { mat: to.mat }));
        ps.push(masa([bulto(b.codo, [2.2 * A, 2.2 * A, 2.0 * S], { eje: b.d1, mat: to.mat, tono: 0.06 }), bulto(add(add(b.codo, lado, b.s * 1.2 * A), b.d1, -0.4 * S), [0.8 * A, 2.0 * A, 1.7 * S], { eje: b.d1, mat: to.mat, tono: 0.1 })], { mat: to.mat, suave: 0.6 }));
        ps.push(esfera(...add(b.codo, lado, b.s * 2.1 * A), 0.45, { mat: 'cu_oro' }));
      }
    }
    if (to.tipo === 'cuero') ps.push(palo(T(4.2 * A, 4.5 * A, e.zc + 17 * S), T(4.4 * A, -4 * A, e.zc + 3 * S), 0.55 * S, { mat: 'cu_cuero_negro' }));
  }
  if (eq.tabardo) {
    const tb = eq.tabardo, sobre = eq.torso?.tipo === 'placas' ? 1.6 * A : 0;
    ps.push(caja(...T(4.6 * A + 1.2 + sobre, 0, e.zc - 10 * S), 0.8, 5.4 * A, 26 * S, { mat: tb.mat, giro: angulo(e.ejesT[0]), incl: -inclinacion(e.ejesT[2], e.ejesT[0]), inclEje: 'y' }));
    if (tb.borde) ps.push(caja(...T(4.6 * A + 1.4 + sobre, 0, e.zc - 10 * S), 0.5, 1.2 * A, 26 * S, { mat: tb.borde, giro: angulo(e.ejesT[0]), incl: -inclinacion(e.ejesT[2], e.ejesT[0]), inclEje: 'y' }));
  }
  if (eq.cinturon) {
    ps.push(cilindro(...e.W(0, 0, e.zc + 1.6 * S), (4.6 + (cu.grasa ?? 0) * 1.5) * A, 2.2 * S, { mat: eq.cinturon.mat, r1: (4.8 + (cu.grasa ?? 0) * 1.5) * A }));
    ps.push(caja(...e.W(4.7 * A, 0, e.zc + 1.4 * S), 0.9, 2.4 * S, 2.6 * S, { mat: eq.cinturon.hebilla ?? 'cu_oro', giro: angulo(F) }));
  }
  // ---- manos
  if (eq.manos) {
    const mn = eq.manos;
    const inf = mn.tipo === 'guanteletes' ? 0.9 : 0.45;
    ps.push(masa(partes(e, cu, ['mano', 'antebrazo'], inf, mn.mat, { hasta: 1 }), { mat: mn.mat, suave: 1.2 }));
    // guanteletes: brazal acampanado hacia el puño y nudillos de placa
    if (mn.tipo === 'guanteletes') for (const b of e.brazos) {
      ps.push(masa([hueso(mez(b.codo, b.mun, 0.25), mez(b.codo, b.mun, 1.02), 1.75 * A, 2.15 * A, { mat: mn.mat, tono: 0.04 })], { mat: mn.mat }));
      ps.push(cilindro(...add(b.mun, b.d2, -0.6 * S), 2.25 * A, 0.7 * S, { mat: mn.mat === 'cu_oro' ? 'cu_placa' : 'cu_oro', r1: 2.3 * A, eje: b.d2 }));
    }
  }
  // ---- hombreras
  if (eq.hombros) for (const b of e.brazos) {
    const h = eq.hombros, c = add(b.hom, [0, 0, 1.4 * S]);
    const fuera = nor(sub(b.hom, T(0, 0, e.hombroZ)));
    if (h.tipo === 'placas') { ps.push(masa([bulto(add(c, fuera, 0.8), [4.4 * A, 4.0 * A, 3.0 * S], { mat: h.mat }), bulto(add(c, fuera, 1.6), [3.6 * A, 3.4 * A, 2.0 * S], { mat: h.mat, tono: 0.05 })], { mat: h.mat, suave: 0.8 })); ps.push(elipsoide(...add(add(c, fuera, 3.6 * A), [0, 0, -0.6]), 0.5, 0.5, 0.5, { mat: 'cu_oro' })); }
    else if (h.tipo === 'puas') {
      ps.push(masa([bulto(add(c, fuera, 0.8 * A), [3.8 * A, 3.4 * A, 2.2 * S], { mat: h.mat }), bulto(add(add(c, fuera, 1.6 * A), [0, 0, -1.6 * S]), [3.2 * A, 3.0 * A, 1.4 * S], { mat: h.mat, tono: -0.05 })], { mat: h.mat, suave: 0.9 }));
      for (let i = 0; i < 3; i++) { const base = add(add(c, fuera, (1 + i * 1.3) * A), [0, 0, (1.2 - i * 0.6) * S]); ps.push(palo(base, add(add(base, fuera, (2.5 + i) * A), [0, 0, (6.5 - i * 1.6) * S]), (1.1 - i * 0.15) * A, { mat: h.mat === 'cu_hueso' ? 'cu_hueso' : h.mat, r1: 0.08 })); }
    }
    else if (h.tipo === 'huesos') { ps.push(masa([bulto(add(c, fuera, 0.6), [3.8 * A, 3.4 * A, 2.6 * S], { mat: 'cu_hueso' })], { mat: 'cu_hueso' })); ps.push(palo(add(c, fuera, 2), add(add(c, fuera, 4), [0, 0, 5]), 0.9, { mat: 'cu_hueso', r1: 0.2 })); }
    else ps.push(masa([bulto(add(c, fuera, 0.5), [4.4 * A, 4.2 * A, 2.8 * S], { mat: h.mat }), bulto(add(c, fuera, -0.5), [3.6 * A, 3.6 * A, 3.2 * S], { mat: h.mat })], { mat: h.mat, suave: 2.6 }));
  }
  // ---- capa: lámina de bultos planos que cuelga de los hombros y se mece al caminar
  if (eq.capa) ps.push(capa(e, eq.capa.mat, eq.capa.largo ?? 1, acc, f));
  // ---- pelo y barba
  const casco = eq.cabeza?.tipo;
  const tapaPelo = casco === 'capucha' || casco === 'yelmo' || casco === 'gran_yelmo' || casco === 'casco' || casco === 'turbante';
  if (cu.pelo && cu.peinado !== 'calvo') {
    const pc: Comp[] = [];
    const bC = (fw: number, rt: number, up: number, r: V3, k?: number) => bulto(cab(fw * H, rt * H, cz + up * H), [r[0] * H, r[1] * H, r[2] * H], { ejes: ejesCab, k });
    if (!tapaPelo) {
      if (cu.peinado === 'rapado') pc.push(bC(-0.5, 0, 1.4, [4.0, 3.7, 4.0]));
      else if (cu.peinado === 'cresta') pc.push(hueso(cab(2.2 * H, 0, cz + 4.6 * H), cab(-4.2 * H, 0, cz + 2 * H), 1.2 * H, 0.9 * H), bulto(cab(-1 * H, 0, cz + 4.8 * H), [3.8 * H, 0.9 * H, 1.8 * H], { ejes: ejesCab }));
      else {
        pc.push(bC(-0.7, 0, 1.35, [4.25, 3.9, 4.35]));
        pc.push(bC(1.4, 0, 3.3, [2.8, 3.5, 1.4], 1.4)); // flequillo arriba de la frente
        for (const s of [1, -1]) pc.push(bC(0.2, s * 3.0, 0.4, [2.6, 1.0, 2.6], 1.2)); // patillas
      }
      if (cu.peinado === 'largo' || cu.peinado === 'melena') {
        const ancho = cu.peinado === 'melena' ? 1.3 : 1;
        pc.push(hueso(cab(-2.6 * H, 0, cz + 1 * H), T(-4.4 * S, 0, e.hombroZ - (cu.peinado === 'melena' ? 4 : 8) * S), 3.6 * H * ancho, 2.6 * H * ancho));
        for (const s of [1, -1]) pc.push(hueso(cab(-0.6 * H, s * 3.4 * H, cz), T(-1.5 * S, s * 4.2 * A, e.hombroZ - 2.5 * S), 1.8 * H * ancho, 1.4 * H * ancho));
      }
      if (cu.peinado === 'cola') { const a = cab(-3.4 * H, 0, cz + 1.6 * H), b = T(-5.6 * S, 0, e.hombroZ - 2 * S), c = T(-6 * S, 0, e.hombroZ - 11 * S); pc.push(hueso(a, b, 1.6 * H, 1.3 * H), hueso(b, c, 1.3 * H, 0.5 * H)); }
      if (cu.peinado === 'trenzas') for (const s of [1, -1]) for (let i = 0; i < 4; i++) pc.push(bulto(mez(cab(-1.2 * H, s * 3.4 * H, cz - 1 * H), T(0.5 * S, s * 4.4 * A, e.hombroZ - 8 * S), i / 3.5), [1.2 * H, 1.1 * H, 1.5 * H], { k: 0.5 }));
      if (cu.peinado === 'mono') pc.push(bulto(cab(-2.8 * H, 0, cz + 3.6 * H), [2.3 * H, 2.3 * H, 2.1 * H]));
    }
    if (pc.length) ps.push(masa(pc.map((c) => ({ ...c, mat: cu.pelo })), { mat: cu.pelo, suave: 1.4 }));
  }
  if (cu.barba) {
    const bm = cu.pelo ?? 'cu_pelo_negro';
    const bc: Comp[] = [];
    const bC = (fw: number, rt: number, up: number, r: V3) => bulto(cab(fw * H, rt * H, cz + up * H), [r[0] * H, r[1] * H, r[2] * H], { ejes: ejesCab });
    if (cu.barba === 'bigote') for (const s of [1, -1]) bc.push(hueso(cab(4.1 * H, 0, cz - 1.5 * H), cab(3.6 * H, s * 2.1 * H, cz - 2.6 * H), 0.6 * H, 0.35 * H));
    else {
      bc.push(bC(1.9, 0, -2.4, [2.6, 2.95, 2.2]), bC(2.9, 0, -3.3, [1.5, 1.9, 1.6]));
      for (const s of [1, -1]) bc.push(hueso(cab(4.1 * H, 0, cz - 1.5 * H), cab(3.5 * H, s * 2.2 * H, cz - 2.4 * H), 0.6 * H, 0.45 * H));
      if (cu.barba === 'larga' || cu.barba === 'trenzada') bc.push(hueso(cab(3.0 * H, 0, cz - 3.6 * H), cab(3.9 * H, 0, cz - 9.5 * H), 2.1 * H, cu.barba === 'trenzada' ? 0.7 * H : 1.1 * H));
    }
    ps.push(masa(bc.map((c) => ({ ...c, mat: bm })), { mat: bm, suave: 1.2 }));
  }
  // ---- cuernos
  if (cu.cuernos) for (const s of [1, -1]) {
    if (cu.cuernos === 'carnero') {
      const pts: V3[] = []; for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 1.5; pts.push(cab((-0.8 - Math.sin(a) * 2.6) * H, s * (3.2 + i * 0.25) * H, cz + (3.2 + Math.cos(a) * 2.6 - 2.6) * H)); }
      ps.push(masa(pts.slice(1).map((q, i) => hueso(pts[i], q, (1.5 - i * 0.2) * H, (1.3 - i * 0.2) * H, { mat: 'cu_hueso' })), { mat: 'cu_hueso', suave: 0.8 }));
    } else {
      const largo = cu.cuernos === 'cortos' ? 0.5 : 1;
      const a = cab(0.6 * H, s * 2.4 * H, cz + 3.2 * H), b = cab(-0.6 * H, s * 4.4 * H, cz + (3.2 + 4 * largo) * H), c = cab(-2.6 * H, s * 4.8 * H, cz + (3.2 + 6.5 * largo) * H);
      ps.push(masa([hueso(a, b, 1.2 * H, 0.8 * H, { mat: 'cu_hueso' }), hueso(b, c, 0.8 * H, 0.15 * H, { mat: 'cu_hueso' })], { mat: 'cu_hueso', suave: 0.6 }));
    }
  }
  // ---- casco o tocado
  if (eq.cabeza) ps.push(...tocado(e, cu, eq.cabeza));
  // ---- cola y alas
  if (cu.cola) {
    const ondea = Math.sin((f / 8) * Math.PI * 2) * 2;
    const a = e.W(-3.5 * A, 0, e.zc), b = e.W(-9 * S, ondea, e.zc - 8 * S), c = e.W(-15 * S, -ondea, e.zc - 14 * S), d = e.W(-20 * S, ondea * 1.4, 2 * S);
    ps.push(masa([hueso(a, b, 1.8 * A, 1.3 * A, { mat: cu.cola }), hueso(b, c, 1.3 * A, 0.8 * A, { mat: cu.cola }), hueso(c, d, 0.8 * A, 0.3 * A, { mat: cu.cola })], { mat: cu.cola, suave: 1.2 }));
  }
  if (cu.alas) ps.push(...alas(e, cu.alas, acc, f));
  // ---- armas y mano izquierda
  if (eq.arma && eq.arma.tipo !== 'nada' && eq.arma.tipo !== 'puno') {
    ps.push(...arma(e, eq.arma.tipo, e.brazos[0], eq.arma.mat ?? 'cu_placa', eq.arma.mango ?? 'cu_cuero', eq.arma.gema));
    if (eq.arma.encanto) { const [a, b] = filoDe(e, eq.arma.tipo, e.brazos[0]); ps.push(...encantar(a, b, eq.arma.encanto, f, e.S, 7)); }
  }
  if (eq.izq) ps.push(...manoIzq(e, eq.izq, eq.arma?.tipo));
  void R;
  return ps;
}

/** Esqueleto de huesos: cráneo con cuencas, mandíbula, columna, costillar en arcos, pelvis y huesos largos. */
function huesos(e: Esqueleto, cu: Cuerpo): Pieza[] {
  const { S, A, T, cab, ejesCab } = e;
  const H = (cu.cabeza ?? 1) * S, cz = e.cz, m = cu.piel;
  const cs: Comp[] = [];
  // columna y pelvis
  for (let i = 0; i < 7; i++) cs.push(bulto(T(-1.2 * S, 0, e.zc + (1 + i * 2.6) * S), [1.1 * S, 1.2 * S, 1.0 * S], { mat: m, k: 0.6 }));
  cs.push(bulto(e.W(0, 0, e.zc - 0.5 * S), [2.6 * A, 4.6 * A, 2.2 * S], { mat: m }));
  for (const s of [1, -1]) cs.push(hueso(e.W(-1 * S, s * 1 * A, e.zc + 1 * S), e.W(0.5 * S, s * 4.4 * A, e.zc - 1.5 * S), 1.3 * S, 0.9 * S, { mat: m }));
  // costillar: arcos de costillas que se cierran adelante
  for (let i = 0; i < 5; i++) {
    const z = e.zc + (8.5 + i * 2.1) * S, w = (4.6 - Math.abs(i - 2.5) * 0.35) * A, d = 3.4 * A;
    for (const s of [1, -1]) {
      const p0 = T(-1.2 * S, 0, z), p1 = T(-0.5 * S, s * w, z - 0.6 * S), p2 = T(2.2 * S, s * w * 0.85, z - 1.4 * S), p3 = T(d, s * 1 * A, z - 2 * S);
      cs.push(hueso(p0, p1, 0.55 * S, 0.55 * S, { mat: m, k: 0.4 }), hueso(p1, p2, 0.55 * S, 0.5 * S, { mat: m, k: 0.4 }), hueso(p2, p3, 0.5 * S, 0.45 * S, { mat: m, k: 0.4 }));
    }
  }
  cs.push(hueso(T(3.4 * A, 0, e.zc + 18 * S), T(3.2 * A, 0, e.zc + 9 * S), 0.8 * S, 0.6 * S, { mat: m })); // esternón
  for (const s of [1, -1]) cs.push(hueso(T(0, s * 1.2 * A, e.hombroZ + 0.6 * S), T(0, s * 6.2 * A, e.hombroZ), 0.7 * S, 0.7 * S, { mat: m })); // clavículas
  // brazos y piernas: huesos largos con nudos
  for (const b of e.brazos) { cs.push(hueso(b.hom, b.codo, 0.9 * S, 0.75 * S, { mat: m }), bulto(b.codo, [1.1 * S, 1.1 * S, 1.1 * S], { mat: m }), hueso(b.codo, b.mun, 0.7 * S, 0.6 * S, { mat: m }), hueso(add(b.codo, [0, 0, 0.3]), add(b.mun, [0, 0, 0.3]), 0.5 * S, 0.5 * S, { mat: m }), bulto(b.mano, [1.5 * S, 0.6 * S, 1.2 * S], { eje: b.d2, mat: m }), bulto(b.hom, [1.5 * S, 1.5 * S, 1.5 * S], { mat: m })); }
  for (const p of e.piernas) { cs.push(bulto(p.cad, [1.4 * S, 1.4 * S, 1.4 * S], { mat: m }), hueso(p.cad, p.rod, 1.1 * S, 0.9 * S, { mat: m }), bulto(p.rod, [1.4 * S, 1.4 * S, 1.3 * S], { mat: m }), hueso(p.rod, p.tob, 0.9 * S, 0.7 * S, { mat: m }), hueso(p.talon, p.punta, 0.9 * S, 0.6 * S, { mat: m })); }
  cs.push(hueso(T(-0.8 * S, 0, e.hombroZ), cab(-0.4 * H, 0, cz - 2.6 * H), 0.9 * S, 0.8 * S, { mat: m }));
  const ps: Pieza[] = [masa(cs, { mat: m, suave: 0.7 })];
  // cráneo: bóveda, pómulos, mandíbula separada; cuencas y nariz huecas en negro
  const bC = (fw: number, rt: number, up: number, r: V3, k?: number) => bulto(cab(fw * H, rt * H, cz + up * H), [r[0] * H, r[1] * H, r[2] * H], { ejes: ejesCab, mat: m, k });
  ps.push(masa([bC(-0.2, 0, 1.2, [3.9, 3.4, 3.9]), bC(1.9, 0, -0.6, [2.4, 2.9, 2.3], 1.2), bC(1.5, 0, -2.9, [2.3, 2.5, 1.0], 0.4)], { mat: m, suave: 1.1 }));
  const ojo = cu.ojos ?? 'cu_ojo';
  for (const s of [1, -1]) { ps.push(elipsoide(...cab(3.4 * H, s * 1.4 * H, cz + 0.3 * H), 0.9 * H, 1.1 * H, 1.0 * H, { mat: 'cu_tela_negra' })); if (MATERIALES[ojo]?.emite) ps.push(esfera(...cab(3.9 * H, s * 1.4 * H, cz + 0.3 * H), 0.45 * H, { mat: ojo })); }
  ps.push(elipsoide(...cab(4.1 * H, 0, cz - 1.2 * H), 0.5 * H, 0.5 * H, 0.7 * H, { mat: 'cu_tela_negra' }));
  for (let i = -2; i <= 2; i++) ps.push(caja(...cab(3.6 * H, i * 0.55 * H, cz - 2.4 * H), 0.4 * H, 0.35 * H, 0.9 * H, { mat: m, giro: angulo(ejesCab[0]), tono: 0.08 }));
  return ps;
}

const angulo = (v: V3) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
const inclinacion = (up: V3, fw: V3) => (Math.asin(Math.max(-1, Math.min(1, -(up[0] * fw[0] + up[1] * fw[1]) / Math.hypot(fw[0], fw[1])))) * 180) / Math.PI;

/** Falda, túnica o faldón: una campana de masa que baja de la cintura y sigue las piernas al caminar. */
function faldon(e: Esqueleto, mat: string, largo: number, vuelo: number, acc: Accion, f: number): Pieza {
  const { S, A } = e;
  const cs: Comp[] = [];
  const z0 = e.zc + 2.5 * S, z1 = Math.max(1.2 * S, e.zc + 2.5 * S - largo * S);
  cs.push(hueso(e.W(0, 0, z0), e.W(0.2 * S, 0, (z0 + z1) / 2), 4.6 * A, 4.4 * A * vuelo, { mat }));
  for (const p of e.piernas) {
    // la tela baja por cada pierna hasta el largo y se abre en el ruedo
    const t = Math.min(1, (z0 - z1) / Math.max(1, z0 - p.tob[2]));
    const bajo = mez(p.cad, p.tob, Math.min(1, t));
    const ruedo: V3 = [bajo[0], bajo[1], Math.max(z1, bajo[2])];
    cs.push(hueso(p.cad, ruedo, 4.0 * A, 3.6 * A * vuelo, { mat }));
  }
  const vaiven = acc === 'caminar' ? Math.sin((f / 8) * Math.PI * 2) * 1.5 : 0;
  cs.push(hueso(e.W(-1 * S, 0, z0 - 3 * S), e.W(-2.2 * S - vaiven, 0, z1 + 1.5 * S), 3.8 * A, 4.2 * A * vuelo, { mat }));
  return masa(cs, { mat, suave: 3.2 });
}

/**
 * Capa con pliegues: franjas de tela (poliedros finos) que bajan de los hombros, se abren en el ruedo y alternan
 * hacia adentro y hacia afuera para que la luz marque los pliegues. Arriba sigue el torso, abajo cuelga y se mece.
 */
function capa(e: Esqueleto, mat: string, largo: number, acc: Accion, f: number): Pieza {
  const { S, A, T } = e;
  const ondea = acc === 'caminar' ? Math.sin((f / 8) * Math.PI * 2) * 1.6 + 2.6 : acc === 'atacar' ? 2.2 : acc === 'morir' ? 0 : 0.7;
  const zTop = e.hombroZ + 1.2 * S, zBot = Math.max(2.2 * S, e.zc - 26 * S * largo + 12 * S);
  const N = 7, cs: Comp[] = [];
  const fila = (t: number, k: number): V3 => {
    // k de -1 (derecha) a 1 (izquierda); t de 0 (hombros) a 1 (ruedo)
    const pliegue = (Math.abs(Math.round(k * 3)) % 2 ? 0.9 : -0.4) * Math.min(1, t * 2);
    if (t <= 0.25) return T(-3.8 * A - pliegue * 0.3 - t * 4, k * (4.4 + t * 2) * A, zTop - t * (zTop - e.zc - 6 * S) * 4);
    const u = (t - 0.25) / 0.75;
    const z = e.zc + 6 * S + (zBot - e.zc - 6 * S) * u;
    return e.W(-5.2 * S - (ondea + 1.2) * u - pliegue, k * (5.6 + u * 1.6) * A, z);
  };
  for (let c = 0; c < N; c++) {
    const k = -1 + (2 * c) / (N - 1);
    const pts = [0, 0.25, 0.6, 1].map((t) => fila(t, k));
    for (let i = 0; i < pts.length - 1; i++) {
      const L = len(sub(pts[i + 1], pts[i]));
      const ex = nor(sub(pts[i + 1], pts[i])), lado = nor(sub(T(0, 1, e.zc), T(0, 0, e.zc))), ez = nor(cruz(ex, lado)), ey = cruz(ez, ex);
      cs.push(bulto(mez(pts[i], pts[i + 1], 0.5), [L * 0.6, 1.25 * A, 0.6], { ejes: [ex, ey, ez], mat }));
    }
  }
  return masa(cs, { mat, suave: 1.1 });
}

function alas(e: Esqueleto, mat: string, acc: Accion, f: number): Pieza[] {
  const { S, A, T } = e;
  const bate = acc === 'caminar' || acc === 'quieto' || acc === 'correr' ? Math.sin((f / (acc === 'quieto' ? 4 : 8)) * Math.PI * 2) * 0.25 : acc === 'atacar' ? 0.35 : acc === 'morir' ? -0.6 : 0;
  const ps: Pieza[] = [];
  for (const s of [1, -1]) {
    const raiz = T(-3.6 * A, s * 3.2 * A, e.hombroZ - 0.5 * S);
    const codo = T(-8 * S, s * (9 + bate * 3) * S, e.hombroZ + (10 + bate * 6) * S);
    const mun = T(-10 * S, s * (19 + bate * 5) * S, e.hombroZ + (13 + bate * 8) * S);
    const garra = T(-9 * S, s * (21 + bate * 5) * S, e.hombroZ + (17 + bate * 9) * S);
    // dedos del ala que bajan abiertos en abanico
    const dedos = [0, 1, 2, 3].map((k) => T(-11 * S - k * 2 * S, s * (24 - k * 4.5 + bate * 4) * S, e.hombroZ + (3 - k * 6 + bate * 6) * S));
    const hs: Comp[] = [hueso(raiz, codo, 1.6 * S, 1.1 * S, { mat: 'cu_hueso' }), hueso(codo, mun, 1.1 * S, 0.8 * S, { mat: 'cu_hueso' }), hueso(mun, garra, 0.6 * S, 0.15 * S, { mat: 'cu_hueso' })];
    for (const d of dedos) hs.push(hueso(mun, d, 0.55 * S, 0.2 * S, { mat: 'cu_hueso' }));
    ps.push(masa(hs, { mat: 'cu_hueso', suave: 0.7 }));
    // membrana: paneles entre dedos con el borde de atrás recogido hacia adentro (festón)
    const borde = (a: V3, b: V3) => { const m = mez(a, b, 0.5); return mez(m, mun, 0.22); };
    const cadena = [codo, ...dedos, mez(raiz, dedos[3], 0.35), raiz];
    for (let k = 0; k < cadena.length - 1; k++) {
      const a = cadena[k], b = cadena[k + 1], m = k < dedos.length ? borde(a, b) : mez(a, b, 0.5);
      for (const [p, q] of [[a, m], [m, b]] as [V3, V3][]) {
        const n = nor(cruz(sub(p, mun), sub(q, mun)));
        ps.push(poliedro([mun, p, q, add(mun, n, 0.45), add(p, n, 0.45), add(q, n, 0.45)], { mat, tono: (k % 2 ? -0.04 : 0.03) }));
      }
    }
  }
  return ps;
}

/** Cascos y tocados. */
function tocado(e: Esqueleto, cu: Cuerpo, c: NonNullable<Equipo['cabeza']>): Pieza[] {
  const { S, cab, ejesCab } = e;
  const H = (cu.cabeza ?? 1) * S, cz = e.cz;
  const ps: Pieza[] = [];
  const bC = (fw: number, rt: number, up: number, r: V3, mat = c.mat, k?: number) => bulto(cab(fw * H, rt * H, cz + up * H), [r[0] * H, r[1] * H, r[2] * H], { ejes: ejesCab, mat, k });
  const ga = angulo(ejesCab[0]);
  switch (c.tipo) {
    case 'capucha': {
      ps.push(masa([bC(-0.8, 0, 1.0, [5.0, 4.6, 5.3]), bC(-2.4, 0, -2.2, [4.4, 4.8, 3.6]), bC(1.4, 0, 3.6, [3.2, 4.0, 1.8], c.mat, 1.5), hueso(cab(-3 * H, 0, cz - 3 * H), e.T(-4.5 * S, 0, e.hombroZ - 1 * S), 4 * H, 4.6 * H, { mat: c.mat })], { mat: c.mat, suave: 1.8 }));
      // la cara queda en sombra dentro de la capucha
      ps.push(elipsoide(...cab(3.4 * H, 0, cz - 0.3 * H), 0.6 * H, 3.2 * H, 3.6 * H, { mat: 'cu_tela_negra', giro: ga, tono: -0.2 }));
      break;
    }
    case 'gorro': ps.push(masa([bC(-0.4, 0, 2.2, [4.4, 4.1, 3.0]), bC(-0.4, 0, 1.1, [4.6, 4.3, 1.3], c.mat2 ?? c.mat)], { mat: c.mat, suave: 1 })); break;
    case 'casco': {
      // capacete puntiagudo con nasal y cota de malla que cae sobre la nuca: facetado, no una bola
      const P = (fw: number, rt: number, up: number): V3 => cab(fw * H, rt * H, cz + up * H);
      const anillo = (r: number, up: number, n = 8, fw0 = 0) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2 + Math.PI / n; return P(fw0 + Math.cos(a) * r, Math.sin(a) * r * 0.94, up); });
      ps.push(poliedro([...anillo(4.85, 0.2), ...anillo(4.5, 2.6), P(-1.4, 0, 7.4)], { mat: c.mat }));
      ps.push(poliedro([...anillo(5.0, 0.0), ...anillo(5.0, 0.9)], { mat: c.mat2 ?? c.mat, tono: 0.06 }));
      ps.push(caja(...P(4.6, 0, -3.4), 0.9 * H, 1.0 * H, 3.8 * H, { mat: c.mat, giro: ga, tono: 0.1 })); // nasal
      ps.push(masa([bulto(P(-1.6, 0, -2.6), [3.6 * H, 4.6 * H, 3.4 * H], { ejes: ejesCab, mat: 'cu_malla' }), bulto(e.T(-1.2 * S, 0, e.hombroZ + 1.4 * S), [3.4 * S, 5.6 * S, 1.6 * S], { ejes: e.ejesT, mat: 'cu_malla' })], { mat: 'cu_malla', suave: 1.4 }));
      break;
    }
    case 'yelmo': case 'gran_yelmo': {
      const g = c.tipo === 'gran_yelmo';
      const P = (fw: number, rt: number, up: number): V3 => cab(fw * H, rt * H, cz + up * H);
      const anillo = (r: number, up: number, fwk = 1, n = 8) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2 + Math.PI / n; return P(Math.cos(a) * r * fwk, Math.sin(a) * r * 0.92, up); });
      if (g) {
        // yelmo de barril: tapa plana, costado recto y una arista al frente
        ps.push(poliedro([...anillo(5.0, -4.4), ...anillo(5.1, 3.9), ...anillo(4.3, 5.2)], { mat: c.mat }));
        ps.push(poliedro([P(5.0, 0.6, -4.4), P(5.0, -0.6, -4.4), P(5.6, 0, -1), P(5.6, 0, 3.6), P(4.6, 0.6, 5.0), P(4.6, -0.6, 5.0)], { mat: c.mat, tono: 0.08 }));
        ps.push(caja(...P(5.25, 0, 0.6), 0.9 * H, 7.6 * H, 0.75 * H, { mat: 'cu_tela_negra', giro: ga }));
        for (let k = -2; k <= 2; k++) if (k) ps.push(caja(...P(5.2, k * 1.1, -2.4), 0.7 * H, 0.45 * H, 0.45 * H, { mat: 'cu_tela_negra', giro: ga }));
        if (c.mat2) ps.push(poliedro([...anillo(5.15, 3.0), ...anillo(5.15, 3.8)], { mat: c.mat2 }), caja(...P(5.55, 0, -3.6), 0.5 * H, 0.9 * H, 7 * H, { mat: c.mat2, giro: ga }));
      } else {
        // yelmo cerrado con visera en pico: facetas que agarran la luz
        ps.push(poliedro([...anillo(4.7, -4.0, 1.02), ...anillo(5.0, 0.6, 1.05), ...anillo(4.1, 4.4), P(-0.4, 0, 6.1), P(6.2, 0, -0.6)], { mat: c.mat }));
        ps.push(caja(...P(5.05, 0, 0.75), 1.2 * H, 6.6 * H, 0.7 * H, { mat: 'cu_tela_negra', giro: ga })); // ranura de los ojos
        for (let k = -1; k <= 1; k++) ps.push(caja(...P(5.0, k * 1.0, -2.4), 0.8 * H, 0.35 * H, 1.5 * H, { mat: 'cu_tela_negra', giro: ga }));
        ps.push(poliedro([P(0.6, 0.45, 6.0), P(0.6, -0.45, 6.0), P(-4.6, 0.45, 4.4), P(-4.6, -0.45, 4.4), P(2.6, 0, 6.8), P(-3.0, 0, 6.4)], { mat: c.mat2 ?? c.mat, tono: 0.12 })); // cresta
        if (c.mat2 === 'cu_oro') ps.push(poliedro([...anillo(4.95, -3.6, 1.02), ...anillo(4.95, -2.9, 1.02)], { mat: 'cu_oro' }));
      }
      break;
    }
    case 'cuernos': {
      ps.push(masa([bC(-0.3, 0, 1.6, [4.6, 4.3, 4.2])], { mat: c.mat }));
      for (const s of [1, -1]) { const a = cab(0, s * 4 * H, cz + 2.6 * H), b = cab(1.4 * H, s * 7.8 * H, cz + 5 * H), d = cab(2.6 * H, s * 8.6 * H, cz + 10 * H); ps.push(masa([hueso(a, b, 1.5 * H, 1 * H, { mat: 'cu_hueso' }), hueso(b, d, 1 * H, 0.15 * H, { mat: 'cu_hueso' })], { mat: 'cu_hueso', suave: 0.7 })); }
      break;
    }
    case 'corona': case 'diadema': case 'aro': {
      const n = c.tipo === 'corona' ? 8 : 0;
      ps.push(cilindro(...cab(-0.3 * H, 0, cz + 2.6 * H), 4.3 * H, (c.tipo === 'corona' ? 1.6 : 0.8) * H, { mat: c.mat, r1: 4.5 * H }));
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ps.push(cilindro(...cab(-0.3 * H + Math.cos(a) * 4.2 * H, Math.sin(a) * 4.2 * H, cz + 4 * H), 0.7 * H, 2.4 * H, { mat: c.mat, r1: 0.1 })); }
      if (c.tipo !== 'aro') ps.push(esfera(...cab(3.9 * H, 0, cz + 3.2 * H), 0.8 * H, { mat: c.mat2 ?? 'magia' }));
      break;
    }
    case 'mascara': ps.push(masa([bC(2.0, 0, -0.6, [2.8, 3.8, 3.8])], { mat: c.mat })); for (const s of [1, -1]) ps.push(elipsoide(...cab(4.6 * H, s * 1.4 * H, cz + 0.3 * H), 0.5 * H, 0.8 * H, 0.5 * H, { mat: 'cu_tela_negra' })); break;
    case 'calavera': ps.push(masa([bC(0, 0, 2.4, [4.6, 4.3, 3.6], 'cu_hueso'), bC(2.6, 0, 0.6, [2.6, 3.6, 2.6], 'cu_hueso')], { mat: 'cu_hueso', suave: 1 })); for (const s of [1, -1]) ps.push(elipsoide(...cab(4.9 * H, s * 1.5 * H, cz + 1.4 * H), 0.6 * H, 0.9 * H, 0.8 * H, { mat: 'cu_tela_negra' })); break;
    case 'turbante': ps.push(masa([bC(-0.5, 0, 2.0, [4.8, 4.5, 3.6]), hueso(cab(-3.5 * H, 0, cz + 1 * H), e.T(-5 * S, 0, e.hombroZ - 4 * S), 1.5 * H, 1 * H)], { mat: c.mat, suave: 1.5 })); ps.push(esfera(...cab(4 * H, 0, cz + 3 * H), 0.8 * H, { mat: c.mat2 ?? 'cu_oro' })); break;
  }
  return ps;
}

// ------------------------------------------------------------------ armas (piezas duras, salen de la mano)
function arma(e: Esqueleto, tipo: TipoArma, b: Brazo, mat: string, mango: string, gema?: string): Pieza[] {
  const { S, F } = e;
  const ps: Pieza[] = [];
  const dd = b.eje, m = b.mano;
  const en = (k: number): V3 => add(m, dd, k);
  // vector de canto de la hoja: perpendicular al mango y al frente del cuerpo
  let canto = nor(cruz(dd, F)); if (!isFinite(canto[0]) || len(cruz(dd, F)) < 0.2) canto = nor(cruz(dd, [0, 0, 1]));
  const plano = nor(cruz(canto, dd));
  const hoja = (k0: number, k1: number, ancho: number, grueso: number, punta = 0.15, curva = 0): Pieza => {
    const a = en(k0), z = add(en(k1), canto, curva);
    return poliedro([add(a, canto, ancho), add(a, canto, -ancho), add(a, plano, grueso), add(a, plano, -grueso),
      add(add(mez(a, z, 0.82), canto, ancho * 0.9 + curva * 0.5), plano, 0), add(add(mez(a, z, 0.82), canto, -ancho * 0.9 + curva * 0.5), plano, 0),
      add(mez(a, z, 0.82), plano, grueso * 0.8), add(mez(a, z, 0.82), plano, -grueso * 0.8), add(z, canto, ancho * punta)], { mat });
  };
  const gemaArriba = (p: V3, r: number) => ps.push(esfera(...p, r, { mat: gema ?? 'magia' }));
  switch (tipo) {
    case 'espada': case 'cimitarra':
      ps.push(palo(en(-3.5 * S), en(0.4), 0.75 * S, { mat: mango }), esfera(...en(-3.8 * S), 1.1 * S, { mat }));
      ps.push(palo(add(en(0.8), canto, 3.2 * S), add(en(0.8), canto, -3.2 * S), 0.7 * S, { mat }));
      ps.push(hoja(1.2, 24 * S, 1.25 * S, 0.35 * S, 0.1, tipo === 'cimitarra' ? 3 * S : 0));
      break;
    case 'mandoble':
      ps.push(palo(en(-7 * S), en(0.4), 0.8 * S, { mat: mango }), esfera(...en(-7.4 * S), 1.3 * S, { mat }));
      ps.push(palo(add(en(0.8), canto, 4.6 * S), add(en(0.8), canto, -4.6 * S), 0.9 * S, { mat }));
      ps.push(hoja(1.3, 34 * S, 1.7 * S, 0.45 * S, 0.12));
      break;
    case 'hacha': case 'hacha_doble': {
      const lg = tipo === 'hacha_doble' ? 30 : 21;
      ps.push(palo(en(-4 * S), en(lg * S), 0.85 * S, { mat: mango }));
      const c = en((lg - 3.5) * S);
      for (const sg of tipo === 'hacha_doble' ? [1, -1] : [1]) {
        const fr = add(c, plano, 7 * S * sg);
        ps.push(poliedro([add(add(c, dd, 2.6 * S), canto, 0.8), add(add(c, dd, -2.6 * S), canto, 0.8), add(add(c, dd, 2.6 * S), canto, -0.8), add(add(c, dd, -2.6 * S), canto, -0.8),
          add(add(fr, dd, 6.5 * S), canto, 0.12), add(add(fr, dd, -6 * S), canto, 0.12), add(add(fr, dd, 6.5 * S), canto, -0.12), add(add(fr, dd, -6 * S), canto, -0.12), add(fr, plano, 1.2 * sg)], { mat }));
      }
      if (tipo === 'hacha') ps.push(palo(add(c, plano, -0.5), add(add(c, plano, -4 * S), dd, -1.5 * S), 1 * S, { mat, r1: 0.15 }));
      break;
    }
    case 'maza': ps.push(palo(en(-3 * S), en(15 * S), 0.8 * S, { mat: mango })); ps.push(esfera(...en(16 * S), 2.6 * S, { mat })); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ps.push(palo(en(16 * S), add(add(en(16 * S), canto, Math.cos(a) * 4.2 * S), plano, Math.sin(a) * 4.2 * S), 1.1 * S, { mat, r1: 0.1 })); } break;
    case 'martillo': ps.push(palo(en(-5 * S), en(26 * S), 0.9 * S, { mat: mango })); ps.push(caja(...add(en(24.5 * S), dd, -3 * S), 7 * S, 4.2 * S, 6 * S, { mat, giro: angulo(plano) })); break;
    case 'mangual': { ps.push(palo(en(-3 * S), en(10 * S), 0.8 * S, { mat: mango })); const b2 = add(add(en(10 * S), [0, 0, -6 * S]), F, 3 * S); ps.push(palo(en(10 * S), b2, 0.35 * S, { mat: 'cu_placa_oscura' })); ps.push(esfera(...b2, 2.6 * S, { mat })); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ps.push(palo(b2, add(b2, [Math.cos(a) * 4 * S, Math.sin(a) * 4 * S, (i % 2 ? 2 : -2) * S]), 0.9 * S, { mat, r1: 0.1 })); } break; }
    case 'lanza': case 'alabarda': ps.push(palo(en(-18 * S), en(28 * S), 0.7 * S, { mat: mango })); ps.push(hoja(28 * S, 36 * S, 1.3 * S, 0.4 * S, 0.05)); if (tipo === 'alabarda') ps.push(poliedro([add(en(24 * S), canto, 0.5), add(en(30 * S), canto, 0.5), add(add(en(26 * S), plano, 6 * S), canto, 0.2), add(en(24 * S), canto, -0.5), add(en(30 * S), canto, -0.5), add(add(en(26 * S), plano, 6 * S), canto, -0.2)], { mat })); break;
    case 'guadana': { ps.push(palo(en(-14 * S), en(30 * S), 0.75 * S, { mat: mango })); const t = en(30 * S); const pts: V3[] = []; for (let i = 0; i <= 5; i++) { const a = (i / 5) * 1.6; pts.push(add(add(t, plano, Math.sin(a) * 14 * S), dd, (Math.cos(a) - 1) * 4 * S)); } for (let i = 0; i < 5; i++) ps.push(palo(pts[i], pts[i + 1], (1.4 - i * 0.25) * S, { mat, r1: (1.15 - i * 0.22) * S })); break; }
    case 'baculo': case 'cetro': {
      // el báculo va casi vertical en la mano, con el remate arriba
      const lg = tipo === 'cetro' ? 0.45 : 1;
      const pie: V3 = add([m[0], m[1], Math.max(0.5, m[2] - 24 * S * lg)], F, 1.2), tope: V3 = add([m[0], m[1], m[2] + 26 * S * lg], F, 2.4);
      ps.push(palo(pie, tope, 0.85 * S, { mat: mango, r1: 0.75 * S }));
      if (tipo === 'baculo') { for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; ps.push(palo(add(tope, [0, 0, -1 * S]), add(tope, [Math.cos(a) * 2.6 * S, Math.sin(a) * 2.6 * S, 3.4 * S]), 0.55 * S, { mat: mango, r1: 0.3 * S })); } gemaArriba(add(tope, [0, 0, 2.4 * S]), 2.1 * S); }
      else { ps.push(cilindro(...tope, 1.4 * S, 2 * S, { mat: 'cu_oro', r1: 2.2 * S })); gemaArriba(add(tope, [0, 0, 3.4 * S]), 1.7 * S); }
      break;
    }
    case 'varita': ps.push(palo(en(-1.5 * S), en(10 * S), 0.5 * S, { mat: mango, r1: 0.3 * S })); gemaArriba(en(10.5 * S), 1 * S); break;
    case 'daga': ps.push(palo(en(-2.6 * S), en(0.3), 0.6 * S, { mat: mango }), palo(add(en(0.5), canto, 1.8 * S), add(en(0.5), canto, -1.8 * S), 0.5 * S, { mat })); ps.push(hoja(0.8, 10 * S, 0.9 * S, 0.3 * S, 0.05)); break;
    case 'garras': for (const sg of [-1, 0, 1]) ps.push(hoja(0, 9 * S, 0.45 * S, 0.2 * S, 0.02, 0), palo(add(m, canto, sg * 1.1 * S), add(add(en(9 * S), canto, sg * 1.6 * S), plano, 1.4 * S), 0.35 * S, { mat, r1: 0.08 })); break;
    case 'arco': case 'ballesta': {
      // el arco va en la izquierda; la derecha tira de la cuerda
      const izq = e.brazos[1];
      const c = izq.mano;
      if (tipo === 'arco') {
        const arr: V3 = [c[0], c[1], c[2] + 15 * S], abj: V3 = [c[0], c[1], c[2] - 15 * S], comba = add(c, F, 3.4 * S);
        const pts = [arr, add(add(comba, [0, 0, 9 * S]), F, -0.8 * S), comba, add(add(comba, [0, 0, -9 * S]), F, -0.8 * S), abj];
        for (let i = 0; i < 4; i++) ps.push(palo(pts[i], pts[i + 1], (i === 1 || i === 2 ? 0.75 : 0.55) * S, { mat: mango, r1: (i === 1 || i === 2 ? 0.75 : 0.55) * S }));
        ps.push(palo(arr, m, 0.15 * S, { mat: 'cuerda' }), palo(m, abj, 0.15 * S, { mat: 'cuerda' }));
        ps.push(palo(m, add(comba, F, 2 * S), 0.3 * S, { mat: 'madera_lisa' }), poliedro([add(add(comba, F, 2 * S), [0, 0, 0.8]), add(add(comba, F, 2 * S), [0, 0, -0.8]), add(comba, F, 4.5 * S)], { mat }));
      } else {
        // la ballesta va al frente, entre las dos manos, apuntando hacia adelante
        const d = e.brazos[0].mano, cc = mez(c, d, 0.5), lado = nor(cruz(F, [0, 0, 1]));
        const atras = add(cc, F, -5 * S), frente = add(cc, F, 9 * S);
        ps.push(palo(atras, frente, 1.0 * S, { mat: mango }), caja(...add(atras, [0, 0, -2.4 * S]), 1.6 * S, 1.4 * S, 3 * S, { mat: mango, giro: angulo(F) }));
        const pal = add(frente, F, -1.5 * S);
        ps.push(palo(add(add(pal, lado, 7.5 * S), F, -2 * S), pal, 0.7 * S, { mat, r1: 0.9 * S }), palo(pal, add(add(pal, lado, -7.5 * S), F, -2 * S), 0.9 * S, { mat, r1: 0.7 * S }));
        ps.push(palo(add(add(pal, lado, 7.5 * S), F, -2 * S), add(cc, F, -1 * S), 0.15 * S, { mat: 'cuerda' }), palo(add(cc, F, -1 * S), add(add(pal, lado, -7.5 * S), F, -2 * S), 0.15 * S, { mat: 'cuerda' }));
        ps.push(palo(add(cc, [0, 0, 1 * S]), add(add(frente, F, 1.5 * S), [0, 0, 1 * S]), 0.35 * S, { mat: 'madera_lisa' }));
      }
      break;
    }
    default: break;
  }
  return ps;
}

/** El tramo vivo del arma (la hoja, la cabeza o la gema) desde la mano a lo largo de su eje. */
function filoDe(e: Esqueleto, tipo: TipoArma, b: Brazo): [V3, V3] {
  const S = e.S, en = (k: number) => add(b.mano, b.eje, k * S);
  switch (tipo) {
    case 'espada': case 'cimitarra': return [en(2), en(23)];
    case 'mandoble': return [en(2), en(33)];
    case 'daga': return [en(1), en(9.5)];
    case 'hacha': return [en(16), en(23)];
    case 'hacha_doble': return [en(24), en(31)];
    case 'maza': case 'mangual': return [en(13), en(18)];
    case 'martillo': return [en(21), en(27)];
    case 'lanza': case 'alabarda': return [en(26), en(36)];
    case 'guadana': return [en(24), en(31)];
    case 'garras': return [en(1), en(9)];
    case 'varita': return [en(5), en(11)];
    case 'baculo': case 'cetro': { const t: V3 = add([b.mano[0], b.mano[1], b.mano[2] + (tipo === 'cetro' ? 12 : 26) * S], e.F, 2.4); return [t, add(t, [0, 0, 4 * S])]; }
    case 'arco': case 'ballesta': { const c = e.brazos[1].mano; return [add(c, [0, 0, -12 * S]), add(c, [0, 0, 12 * S])]; }
    default: return [b.mano, en(4)];
  }
}

/**
 * Lo vivo del arma: piezas que brillan solas y cambian en cada cuadro (llamas que suben, escarcha que destella,
 * arcos que saltan, gotas que caen, humo de sombra que gira, runas de luz que laten, sangre que chorrea).
 */
export function encantar(a: V3, b: V3, en: Encanto, f: number, S = 1, semilla = 1): Pieza[] {
  const ps: Pieza[] = [];
  const h = (i: number) => { const x = Math.sin(i * 127.1 + semilla * 311.7) * 43758.5453; return x - Math.floor(x); };
  const L = len(sub(b, a)), n = Math.max(3, Math.round(L / (2.4 * S)));
  const nucleo: Record<Encanto, string> = { fuego: 'fuego', hielo: 'cu_ojo_hielo', rayo: 'cu_rayo', veneno: 'fuego_verde', sombra: 'cu_sombra', sagrado: 'cu_luz_santa', sangre: 'cu_sangre_viva' };
  // el filo brilla
  ps.push(palo(a, b, 0.42 * S, { mat: nucleo[en], r1: 0.25 * S }));
  const ciclo = (i: number) => ((f + h(i) * 8) % 8) / 8;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, p = mez(a, b, t), u = ciclo(i);
    switch (en) {
      case 'fuego': {
        // lengua de fuego que sube y se adelgaza; una brasa que se va
        const alto = (2.2 + 2.6 * Math.sin(u * Math.PI)) * S;
        ps.push(elipsoide(p[0] + (h(i + 9) - 0.5) * 0.8, p[1] + (h(i + 5) - 0.5) * 0.8, p[2] + alto * 0.55, 0.85 * S, 0.85 * S, alto * 0.55, { mat: u < 0.5 ? 'fuego' : 'lava' }));
        if (i % 2 === 0) ps.push(esfera(p[0] + (h(i + 3) - 0.5) * 3 * S, p[1] + (h(i + 4) - 0.5) * 3 * S, p[2] + (3 + u * 9) * S, 0.35 * S * (1 - u * 0.6), { mat: 'fuego' }));
        break;
      }
      case 'hielo': {
        // cristales fijos a lo largo de la hoja y un destello que recorre
        const lado: V3 = [(h(i) - 0.5), (h(i + 1) - 0.5), 0.6 + h(i + 2)];
        const tip = add(p, nor(lado), (1.6 + h(i + 3) * 1.8) * S);
        ps.push(poliedro([add(p, [0.5 * S, 0, 0]), add(p, [-0.5 * S, 0, 0]), add(p, [0, 0.5 * S, 0]), add(p, [0, -0.5 * S, 0]), tip], { mat: 'hielo' }));
        if (Math.abs(t - ((f % 8) / 8)) < 0.12) ps.push(esfera(...add(tip, [0, 0, 0.3]), 0.5 * S, { mat: 'cu_ojo_hielo' }));
        if (i % 3 === 0) ps.push(esfera(p[0] + (h(i + 7) - 0.5) * 2 * S, p[1] + (h(i + 8) - 0.5) * 2 * S, p[2] - (1 + u * 6) * S, 0.25 * S, { mat: 'cu_ojo_hielo' }));
        break;
      }
      case 'rayo': {
        // arcos en zigzag que cambian cada cuadro
        const q = mez(a, b, Math.min(1, t + 0.3));
        let prev = p;
        for (let k = 1; k <= 3; k++) {
          const m = mez(p, q, k / 3), j = (s: number) => (h(i * 17 + k * 5 + f * 31 + s) - 0.5) * 4.4 * S;
          const nx: V3 = k === 3 ? q : [m[0] + j(1), m[1] + j(2), m[2] + j(3)];
          ps.push(palo(prev, nx, 0.32 * S, { mat: 'cu_rayo' }));
          prev = nx;
        }
        break;
      }
      case 'veneno': {
        // gotas que cuelgan, se estiran y caen
        if (i % 2) break;
        const caida = u * 12 * S;
        ps.push(elipsoide(p[0], p[1], p[2] - 0.8 * S - caida, 0.5 * S, 0.5 * S, (0.7 + (u < 0.3 ? u * 2 : 0.3)) * S, { mat: 'fuego_verde' }));
        ps.push(esfera(p[0] + (h(i + 2) - 0.5) * 2 * S, p[1] + (h(i + 3) - 0.5) * 2 * S, p[2] + (1 + u * 5) * S, 0.45 * S * (1 - u), { mat: 'fuego_verde' }));
        break;
      }
      case 'sombra': {
        // jirones que giran alrededor de la hoja
        const ang = u * Math.PI * 2 + i, r = 1.8 * S;
        ps.push(elipsoide(p[0] + Math.cos(ang) * r, p[1] + Math.sin(ang) * r, p[2] + Math.sin(ang * 2) * r * 0.6 + u * 2 * S, 1.1 * S, 1.1 * S, 0.6 * S, { mat: 'cu_sombra' }));
        break;
      }
      case 'sagrado': {
        // runas que laten a lo largo de la hoja y chispas doradas
        const late = 0.5 + 0.5 * Math.sin((f / 8) * Math.PI * 2 + i * 1.3);
        ps.push(esfera(...p, (0.8 + late * 0.6) * S, { mat: 'cu_luz_santa' }));
        if (i === 0) for (let k = 0; k < 8; k++) { const an = (k / 8) * Math.PI * 2 + f * 0.4; ps.push(esfera(p[0] + Math.cos(an) * 3.2 * S, p[1] + Math.sin(an) * 3.2 * S, p[2] + Math.sin(an * 2) * 0.6 * S, 0.35 * S, { mat: 'luz_vela' })); }
        if (i % 2 === 0) ps.push(esfera(p[0] + (h(i + 1) - 0.5) * 4 * S, p[1] + (h(i + 2) - 0.5) * 4 * S, p[2] + (1 + u * 7) * S, 0.3 * S, { mat: 'luz_vela' }));
        break;
      }
      case 'sangre': {
        if (i % 2) break;
        const caida = u * 10 * S;
        ps.push(elipsoide(p[0], p[1], p[2] - 0.6 * S - caida, 0.45 * S, 0.45 * S, (0.6 + Math.min(0.6, u * 1.5)) * S, { mat: 'cu_sangre_viva' }));
        break;
      }
    }
  }
  return ps;
}

function manoIzq(e: Esqueleto, iz: NonNullable<Equipo['izq']>, derecha?: TipoArma): Pieza[] {
  const { S, F } = e;
  const b = e.brazos[1];
  const ps: Pieza[] = [];
  if (dos(derecha) || derecha === 'arco' || derecha === 'ballesta') return ps;
  const c = add(add(b.mano, F, 1.2 * S), [0, 0, 2.2 * S]);
  const mat = iz.mat ?? 'madera', m2 = iz.mat2 ?? 'cu_placa';
  const ga = angulo(F);
  switch (iz.tipo) {
    case 'escudo_redondo': case 'rodela': {
      const r = iz.tipo === 'rodela' ? 5 : 7.5;
      ps.push(cilindro(...c, r * S, 1.4 * S, { mat, eje: F }), cilindro(...add(c, F, -0.2), (r + 0.5) * S, 1.0 * S, { mat: m2, eje: F, r1: (r + 0.5) * S }));
      ps.push(esfera(...add(c, F, 1.5 * S), (iz.tipo === 'rodela' ? 1.4 : 2) * S, { mat: m2 }));
      if (iz.tipo === 'rodela') ps.push(palo(add(c, F, 1.5 * S), add(c, F, 5 * S), 0.9 * S, { mat: m2, r1: 0.1 }));
      break;
    }
    case 'escudo_cometa': case 'escudo_torre': case 'escudo_calavera': {
      const torre = iz.tipo === 'escudo_torre';
      const al = (torre ? 27 : 19) * S, an = (torre ? 13 : 11) * S, lado = nor(cruz([0, 0, 1], F));
      const top = add(c, [0, 0, al * 0.4]), bot = add(c, [0, 0, -al * 0.6]);
      const cara = (q: V3, k: number) => add(q, F, k);
      const pts: V3[] = torre
        ? [add(top, lado, an / 2), add(top, lado, -an / 2), add(bot, lado, an / 2), add(bot, lado, -an / 2)]
        : [add(top, lado, an / 2), add(top, lado, -an / 2), add(add(top, [0, 0, -al * 0.45]), lado, an / 2), add(add(top, [0, 0, -al * 0.45]), lado, -an / 2), bot];
      ps.push(poliedro([...pts.map((q) => cara(q, 0.9)), ...pts.map((q) => cara(q, -0.6)), cara(add(c, [0, 0, -al * 0.05]), 2.2)], { mat }));
      // borde y emblema
      ps.push(palo(cara(add(top, lado, an / 2), 1), cara(add(top, lado, -an / 2), 1), 0.7 * S, { mat: m2 }));
      if (iz.tipo === 'escudo_calavera') { ps.push(esfera(...cara(c, 2.6), 2.6 * S, { mat: 'cu_hueso' })); for (const s of [1, -1]) ps.push(esfera(...add(cara(add(c, [0, 0, 0.6 * S]), 4.6), lado, s * 1 * S), 0.8 * S, { mat: 'cu_tela_negra' })); }
      else { ps.push(caja(...cara(add(c, [0, 0, -al * 0.25]), 1.4), 0.8, 1.6 * S, al * 0.6, { mat: m2, giro: ga }), caja(...cara(add(c, [0, 0, al * 0.05]), 1.4), 0.8, an * 0.6, 1.6 * S, { mat: m2, giro: ga })); }
      break;
    }
    case 'orbe': ps.push(esfera(...add(b.mano, [0, 0, 3 * S]), 2.4 * S, { mat: iz.mat ?? 'magia' })); break;
    case 'libro': ps.push(caja(...add(b.mano, [0, 0, 1 * S]), 5 * S, 4 * S, 1.6 * S, { mat: iz.mat ?? 'cu_cuero', giro: ga }), caja(...add(b.mano, [0, 0, 1.3 * S]), 4.6 * S, 3.6 * S, 1.2 * S, { mat: 'cu_tela_blanca', giro: ga })); break;
    case 'antorcha': { const t = add(b.mano, [0, 0, 9 * S]); ps.push(palo(add(b.mano, [0, 0, -3 * S]), t, 0.7 * S, { mat: 'madera' }), elipsoide(...add(t, [0, 0, 1.6 * S]), 1.6 * S, 1.6 * S, 3 * S, { mat: 'fuego' })); break; }
    case 'arma': if (iz.arma) ps.push(...arma(e, iz.arma, b, iz.mat ?? 'cu_placa', iz.mat2 ?? 'cu_cuero')); break;
  }
  return ps;
}

// ------------------------------------------------------------------ armas sueltas (botín, exhibición, piso)
/**
 * Un arma sola, sin quien la empuñe: 'flota' gira despacio en el aire (8 cuadros, como el botín que se muestra),
 * 'suelo' queda tirada en el piso y 'clavada' entra de punta en la tierra. Si tiene encantamiento, arde o brilla.
 */
export function armaSuelta(tipo: TipoArma, o: { mat?: string; mango?: string; gema?: string; encanto?: Encanto; escala?: number }, pose: 'flota' | 'suelo' | 'clavada' | 'icono', f: number): { piezas: Pieza[]; resplandor?: { c: V3; r: number; color: string } } {
  const largo: Partial<Record<TipoArma, number>> = { espada: 24, cimitarra: 24, mandoble: 34, daga: 10, hacha: 23, hacha_doble: 31, maza: 18, martillo: 27, mangual: 12, lanza: 36, alabarda: 36, guadana: 31, garras: 9, varita: 11, baculo: 30, cetro: 16, arco: 30, ballesta: 16 };
  const L = largo[tipo] ?? 20;
  let mano: V3, eje: V3, F: V3 = [1, 0, 0];
  if (pose === 'flota') {
    const a = (f / 8) * Math.PI * 2;
    F = [Math.cos(a), Math.sin(a), 0];
    eje = nor([F[0] * 0.75, F[1] * 0.75, 1]);
    mano = [0, 0, 14 + Math.sin(a) * 1.5];
    if (tipo === 'baculo' || tipo === 'cetro') mano = [0, 0, 30];
  } else if (pose === 'suelo') {
    eje = nor([1, -0.35, 0]); F = nor([0.35, 1, 0]);
    mano = [-L * 0.45, L * 0.16, 1.4];
    if (tipo === 'baculo' || tipo === 'cetro') { mano = [0, 0, 30]; }
  } else if (pose === 'icono') {
    // para el inventario: de pie; las hojas de frente a la cámara, las cabezas de hacha, martillo o guadaña de perfil
    const deLado = ['hacha', 'hacha_doble', 'martillo', 'guadana', 'alabarda', 'mangual', 'maza'].includes(tipo);
    eje = [0, 0, 1]; F = deLado ? nor([1, -1, 0]) : nor([1, 1, 0]); mano = [0, 0, 0];
  } else {
    eje = [0, 0, -1]; mano = [0, 0, L * 0.72]; F = nor([1, -1, 0]);
  }
  const R: V3 = [F[1], -F[0], 0];
  // las armas cortas se muestran más grandes para que se lean como botín
  const SS = o.escala ?? (L < 14 ? 1.7 : 1);
  const b: Brazo = { s: 1, hom: mano, codo: mano, mun: mano, mano, d1: eje, d2: eje, eje };
  const e = { S: SS, A: SS, F, R, zc: 0, hombroZ: 0, cz: 0, brazos: [b, { ...b, mano: tipo === 'arco' || tipo === 'ballesta' ? mano : mano }] } as unknown as Esqueleto;
  const piezas = arma(e, tipo, b, o.mat ?? 'cu_placa', o.mango ?? 'cu_cuero', o.gema);
  if (!o.encanto) return { piezas };
  const [a, z] = filoDe(e, tipo, b);
  piezas.push(...encantar(a, z, o.encanto, f, SS, 3));
  return { piezas, resplandor: { c: mez(a, z, 0.5), r: 18, color: ENCANTOS.find((x) => x[0] === o.encanto)![3] } };
}
