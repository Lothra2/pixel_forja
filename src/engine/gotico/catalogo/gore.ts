import { registrar, type Arma } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, hash3, bulto, LUZ, type Comp, type Escena, type Pieza, type V3 } from '../render';
import { G, raiz, bajoTierra } from '../kit_muerte';

/**
 * Kit de sangre y vísceras (para un jugador adulto): manchas que quedan en el piso y en las paredes, pedazos que
 * vuelan cuando un monstruo revienta por exceso de daño y el reventón mismo. Todo es masa orgánica (bultos chatos que
 * se funden con unión suave), con su luz, su brillo húmedo y su sombra propia: nada de calcomanías planas.
 *
 * Manchas de piso (`plano`, sin sombra, no bloquean; el ancla es el centro de la mancha en el piso):
 *   gore_salpicadura   salpicadura direccional: <superficie>_<rumbo> (4 superficies × 8 rumbos) y icor negro o verde
 *   gore_charco        charco que crece en 8 cuadros (de chico a grande, no se repite): una variante por superficie
 *   gore_gotas         gotas sueltas o una hilera (quien sangra caminando)
 *   gore_rastro        rastro de arrastre (cuerpo arrastrado, con dedos que arañan) en 8 rumbos
 *   gore_huellas       huellas de bota ensangrentadas que se van gastando, en 8 rumbos
 *   gore_sangre_seca   sangre vieja: mancha con anillo oscuro o costra cuarteada
 * Superficies: `piedra` (piedra oscura, fresca y brillante), `tierra` (se embebe: mate y con halo de barro), `nieve`
 * (rojo vivo con el halo rosado de la nieve derretida) y `madera` (se corre a lo largo de la veta, eje x).
 *
 * Manchas de pared (el ancla es el pie de la cara de la pared; `x` corre a lo largo de x con la cara hacia +y, `der`
 * a lo largo de y con la cara hacia +x, como los muros del taller):
 *   gore_pared_salpicadura, gore_pared_chorreado, gore_pared_mano
 *
 * Pedazos (8 cuadros = 8 giros de 45° alrededor de un eje de vuelta propio de la semilla; el ancla es el centro del
 * pedazo, sin sombra: el juego pone la suya en el piso). Paletas: `rojo` (humano o demonio), `no_muerto` (oscuro, con
 * mucho hueso) y `bestia` (bicho o insecto, icor verde amarillento). Variantes `<paleta>`:
 *   gore_gib_torso, gore_gib_brazo, gore_gib_pierna, gore_gib_costillas, gore_gib_craneo, gore_gib_tripas,
 *   gore_gib_astillas, gore_gib_trozo
 *   gore_reventon      el estallido (10 cuadros, no se repite): el cuerpo se hincha, revienta y llueve
 *
 * `cuerpo()` arma un cadáver con pose (lo usa horror.ts).
 */

const T = 'misterio' as const;
const M = MATERIALES;
const TAU = Math.PI * 2;

// ================================================================== vectores
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mul3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nor3 = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mid3 = (a: V3, b: V3, t = 0.5): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** La parte de `v` perpendicular a `d` (unitario), normalizada; si casi no queda nada, `otro`. */
const perp = (v: V3, d: V3, otro: V3): V3 => { const p = sub3(v, mul3(d, dot3(v, d))); return Math.hypot(...p) < 0.15 ? nor3(sub3(otro, mul3(d, dot3(otro, d)))) : nor3(p); };

// ================================================================== materiales
/** Celdas de Worley en el plano: grietas de la sangre seca (la distancia al borde entre dos celdas). */
function grietas(x: number, y: number, paso: number): number {
  const gx = Math.floor(x / paso), gy = Math.floor(y / paso);
  let d1 = 1e9, d2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = (gx + i + hash3(gx + i, gy + j, 3)) * paso, cy = (gy + j + hash3(gx + i, gy + j, 7)) * paso;
    const d = Math.hypot(x - cx, y - cy);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2 - d1;
}
const vetaX = (p: V3) => (ruido(p[0] * 0.06, p[1] * 1.1, 2) - 0.5) * 0.26;
const grumo = (k: number, e: number) => (p: V3) => (ruido(p[0] * e, p[1] * e, p[2] * e) - 0.5) * k;
/** Sangre fresca: honda en el medio, con brillo húmedo en los bordes que miran a la luz. */
M.gore_sangre = { rampa: ['#0a0101', '#160203', '#240405', '#340607', '#460909', '#590c0d', '#6c1112', '#7e1817', '#90211e'], ruido: 0.1, escala: 0.5, brillo: 1.1, patron: grumo(0.16, 0.18) };
M.gore_sangre_oscura = { rampa: ['#080101', '#110303', '#1c0505', '#280707', '#350a09', '#430e0b', '#52130e'], ruido: 0.14, escala: 0.5, brillo: 0.7, patron: grumo(0.14, 0.2) };
M.gore_sangre_tierra = { rampa: ['#0a0202', '#140404', '#200606', '#2c0908', '#390c0a', '#47100c', '#55150f'], ruido: 0.32, escala: 0.6, brillo: 0.3, patron: grumo(0.2, 0.4) };
M.gore_sangre_nieve = { rampa: ['#1a0205', '#300408', '#4b070d', '#670b13', '#841119', '#9e1a20', '#b42529', '#c63334', '#d44443'], ruido: 0.1, escala: 0.5, brillo: 1, patron: grumo(0.14, 0.2) };
M.gore_sangre_madera = { rampa: ['#090202', '#150404', '#220606', '#310908', '#410c0a', '#52110d', '#641710'], ruido: 0.16, escala: 0.6, brillo: 0.55, patron: vetaX };
M.gore_barro_sangre = { rampa: ['#0b0605', '#130a08', '#1b0e0b', '#24120e', '#2d1611', '#371b14'], ruido: 0.55, escala: 0.5, patron: grumo(0.25, 0.3) };
M.gore_nieve_rosa = { rampa: ['#4a3236', '#614548', '#7a5a5c', '#937172', '#ab898a', '#c2a3a2', '#d6bcb9', '#e6d2cf'], ruido: 0.22, escala: 0.7, patron: grumo(0.2, 0.25) };
M.gore_sangre_seca = { rampa: ['#070202', '#0f0404', '#170606', '#200908', '#290c0a', '#33100c', '#3d140e'], ruido: 0.12, escala: 0.4, brillo: 0.15, patron: (p) => (grietas(p[0], p[1], 6) < 0.55 ? -0.3 : 0) + grumo(0.12, 0.15)(p) };
M.gore_icor_negro = { rampa: ['#030204', '#07050a', '#0c0910', '#130e18', '#1b1422', '#241b2c', '#2f2438', '#3b2e46'], ruido: 0.1, escala: 0.5, brillo: 1.1, patron: grumo(0.14, 0.2) };
M.gore_icor_verde = { rampa: ['#050701', '#0b1003', '#131a05', '#1c2507', '#26310a', '#313d0e', '#3d4a13', '#4b5819', '#5b6721'], ruido: 0.1, escala: 0.5, brillo: 1, patron: grumo(0.16, 0.2) };
// carne y pedazos
const fibra = (p: V3) => Math.sin((p[0] + p[1] * 0.7 + p[2] * 0.3) * 2.4 + ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) * 5) * 0.07;
M.gore_piel = { rampa: ['#110908', '#1f110f', '#2e1a16', '#3e241e', '#4f2f27', '#603b31', '#71483c', '#825648'], ruido: 0.12, escala: 1, brillo: 0.15, patron: grumo(0.1, 0.5) };
M.gore_carne = { rampa: ['#120203', '#220506', '#350909', '#4a0e0d', '#601511', '#771d16', '#8d281d', '#a23626'], ruido: 0.18, escala: 0.9, brillo: 0.8, patron: fibra };
M.gore_grasa = { rampa: ['#2a2010', '#433519', '#5e4c24', '#7a6431', '#937c40', '#a99352'], ruido: 0.3, escala: 1.4, brillo: 0.5 };
M.gore_tripa = { rampa: ['#170708', '#290e11', '#3d171a', '#512124', '#652c2e', '#79393a', '#8c4746', '#9c5653'], ruido: 0.14, escala: 1, brillo: 1.1 };
M.gore_organo = { rampa: ['#0d0304', '#1a0608', '#28090c', '#370d10', '#471215', '#58181a', '#6a1f20'], ruido: 0.12, escala: 0.8, brillo: 0.9 };
M.gore_hueso = { rampa: ['#241c15', '#3c3024', '#574735', '#73604a', '#8e7a60', '#a69276', '#bba98d', '#cbbca1'], ruido: 0.18, escala: 0.8 };
M.gore_carne_podrida = { rampa: ['#0c0608', '#170b0f', '#231117', '#30171f', '#3e1e27', '#4c2630', '#5a2f38'], ruido: 0.35, escala: 0.9, brillo: 0.45, patron: fibra };
M.gore_hueso_viejo = { rampa: ['#17130d', '#2a2318', '#3f3524', '#554832', '#6b5c41', '#807050', '#948461', '#a69872'], ruido: 0.28, escala: 0.9 };
M.gore_tripa_podrida = { rampa: ['#100a0c', '#1e1418', '#2d1f23', '#3d2a2e', '#4d363a', '#5e4347', '#6f5154'], ruido: 0.25, escala: 0.9, brillo: 0.7 };
M.gore_moho = { rampa: ['#14160c', '#232614', '#33381d', '#454c27', '#576032', '#6a733e'], ruido: 0.5, escala: 1.6 };
M.gore_quitina = { rampa: ['#070804', '#10120a', '#1a1d10', '#252916', '#31361d', '#3e4425', '#4d542f', '#5e653a'], ruido: 0.1, escala: 0.6, brillo: 1.1 };
M.gore_carne_bestia = { rampa: ['#0f1004', '#1d1f08', '#2d300d', '#3e4213', '#50551a', '#636823', '#777b2e', '#8b8e3b'], ruido: 0.22, escala: 0.9, brillo: 0.7, patron: fibra };
M.gore_pus = { rampa: ['#2a2408', '#433a10', '#5f5219', '#7b6c24', '#968632', '#ae9e44'], ruido: 0.25, escala: 1.2, brillo: 0.9 };
M.gore_tripa_bestia = { rampa: ['#13120a', '#232013', '#36301d', '#4a4228', '#5f5434', '#746740', '#887b4d'], ruido: 0.15, escala: 1, brillo: 1 };
M.gore_cartilago = { rampa: ['#1e1c12', '#34301f', '#4d472e', '#675f3f', '#817851', '#9a9164', '#b0a878'], ruido: 0.18, escala: 0.9, brillo: 0.4 };
// cadáveres (horror.ts)
/** Hacia la cámara (la vista del taller al revés) y de dónde viene el relleno: la cara +x que la luz deja a oscuras. */
const HACIA_CAMARA = nor3([1, 1, 1 / Math.sqrt(1.5)]);
const DIR_RELLENO = nor3([0.7, 0.55, 0.45]);
/**
 * Luz propia de la carne muerta: un relleno suave desde la cara +x (la que la luz del taller deja negra y hace que
 * el cuerpo se lea como un maniquí plano) y un borde que recorta la silueta contra el fondo oscuro. Solo levanta las
 * sombras: la luz sigue viniendo del mismo lado.
 */
const relleno = (n: V3, k = 1) => k * (0.2 * Math.max(0, dot3(n, DIR_RELLENO)) + 0.12 * Math.pow(1 - Math.max(0, dot3(n, HACIA_CAMARA)), 3)) * (1 - 0.85 * Math.max(0, dot3(n, LUZ)));
/**
 * Piel muerta: manchas lívidas grandes (la rampa va del morado al verde ceniza y al amarillo de cera, así que la mancha
 * oscura tira a moretón), el marmolado de las venas (hilos oscuros que se ramifican) y el poro.
 */
const marmol = (k = 1) => (p: V3) => {
  const m = ruido(p[0] * 0.21 + 7, p[1] * 0.21, p[2] * 0.21) - 0.5, m2 = ruido(p[0] * 0.62, p[1] * 0.62 + 3, p[2] * 0.62) - 0.5;
  const vena = Math.abs(ruido(p[0] * 0.48 + 11, p[1] * 0.48, p[2] * 0.48 + 5) - 0.5);
  return k * (m * 0.3 + m2 * 0.1 + (vena < 0.03 ? -0.12 : 0));
};
M.gore_piel_cadaver = { rampa: ['#0c090c', '#171117', '#21191f', '#2b2226', '#352c2c', '#3e3631', '#474136', '#514c3e', '#5c5848', '#696553', '#78745f', '#89866f', '#9d9b84'], ruido: 0.05, escala: 1, brillo: 0.1, patron: (p, n) => marmol()(p) + relleno(n) - 0.08 };
/** Lividez: la sangre que se juntó en lo más bajo del cuerpo (pies y pantorrillas del colgado, la cara del que cuelga cabeza abajo) y las manos. */
M.gore_piel_livida = { rampa: ['#0c080e', '#161019', '#201723', '#2a1f2c', '#332734', '#3c303b', '#453a42', '#4f454a', '#5a5153', '#665e5d'], ruido: 0.06, escala: 1, brillo: 0.1, patron: (p, n) => marmol(0.8)(p) + relleno(n) };
M.gore_piel_muerta = { rampa: ['#0b0a0c', '#151416', '#1e1f1d', '#282b26', '#32362f', '#3d4138', '#484c42', '#54584d', '#616458', '#6f7164', '#7f8072'], ruido: 0.07, escala: 1, brillo: 0.08, patron: (p, n) => marmol()(p) + relleno(n) - 0.08 };
/** El verde de la podredumbre que empieza en el vientre y en las ingles. */
M.gore_piel_podre = { rampa: ['#0b0c09', '#151812', '#1f241a', '#293021', '#333c28', '#3d4730', '#485238', '#545e42', '#616a4d', '#6f7759'], ruido: 0.08, escala: 1, brillo: 0.15, patron: (p, n) => marmol(0.7)(p) + relleno(n) };
/** Piel vieja y seca, de cuero, pegada al hueso: arrugas finas y la mancha de la podredumbre seca. */
M.gore_piel_momia = { rampa: ['#0b0706', '#160e0b', '#211610', '#2c1e15', '#37271b', '#423021', '#4d3a29', '#584531', '#64513b', '#715e48', '#7f6c56'], ruido: 0.22, escala: 1.2, brillo: 0.05, patron: (p, n) => (Math.sin(p[2] * 2.3 + ruido(p[0] * 0.9, p[1] * 0.9, p[2] * 0.5) * 9) > 0.8 ? -0.08 : 0) + marmol(0.8)(p) + relleno(n) - 0.05 };
M.gore_piel_quemada = { rampa: ['#040303', '#080606', '#0d0a09', '#14100e', '#1b1613', '#241d19', '#2e2620', '#3a3129'], ruido: 0.35, escala: 1.1, brillo: 0.35, patron: (p, n) => (grietas(p[0] + p[2], p[1] - p[2], 2.6) < 0.3 ? -0.25 : 0) + (ruido(p[0] * 0.4, p[1] * 0.4, p[2] * 0.4) > 0.7 ? 0.12 : 0) + relleno(n, 0.45) };
/** Tendón y cartílago a la vista (cuello, muñecas, el borde de lo arrancado). */
M.gore_tendon = { rampa: ['#1a0f0e', '#2c1a17', '#422822', '#593a30', '#704d3f', '#876250', '#9c7763'], ruido: 0.16, escala: 1.4, brillo: 0.5, patron: (p, n) => fibra(p) + relleno(n, 0.7) };
/** Trapo de lino sucio: trama gruesa, la mugre que se juntó en los pliegues. */
M.gore_trapo = { rampa: ['#0e0b09', '#1a1611', '#27211a', '#352d23', '#43392c', '#524636', '#615441', '#70624c', '#7f7058'], ruido: 0.3, escala: 1.6, patron: (p, n) => (Math.sin(p[0] * 5.1 + p[1] * 2.3) * Math.sin(p[2] * 5.4 - p[1] * 2.1) > 0.55 ? -0.07 : 0) + (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) - 0.5) * 0.32 + relleno(n, 0.8) };
M.gore_moreton = { rampa: ['#0c0a10', '#16121c', '#211a28', '#2d2334', '#3a2d40', '#48384c'], ruido: 0.3, escala: 0.8 };
M.gore_mugre = { rampa: ['#0d0b08', '#18140f', '#241e17', '#312820', '#3e3329'], ruido: 0.6, escala: 1.4 };
M.gore_pelo = { rampa: ['#060505', '#0e0b0a', '#171210', '#211a16', '#2b221c', '#362b23'], ruido: 0.45, escala: 2.2, brillo: 0.25, patron: (p, n) => (Math.sin((p[0] - p[1]) * 3.3 + ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) * 4) > 0.6 ? -0.08 : 0.03) + relleno(n, 0.6) };
/** Lo que brilla: runas de sangre, ojos en lo oscuro, sangre que hierve. */
M.gore_runa_sangre = { rampa: ['#2a0303', '#4a0505', '#700a08', '#981410', '#bc241a', '#d84030', '#ee6a50'], ruido: 0.35, escala: 0.4, emite: true };
M.gore_brillo_sangre = { rampa: ['#3a0505', '#5c0a08', '#86140e', '#ac2416', '#cc3a22', '#e65a36'], ruido: 0.5, escala: 0.5, emite: true };

/** Giro de `v` alrededor del eje unitario `e` (Rodrigues). */
export function rotar(v: V3, e: V3, ang: number): V3 {
  const c = Math.cos(ang), s = Math.sin(ang), k = cruz3(e, v), d = dot3(e, v);
  return [v[0] * c + k[0] * s + e[0] * d * (1 - c), v[1] * c + k[1] * s + e[1] * d * (1 - c), v[2] * c + k[2] * s + e[2] * d * (1 - c)];
}
/** Rumbo de cada dirección del juego (grados en el piso, como en figura.ts: se = +x, s = +x+y). */
export const RUMBO: Record<string, number> = { se: 0, s: 45, so: 90, o: 135, no: 180, n: 225, ne: 270, e: 315 };
export const DIR8 = ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'];
const r2 = (a: Arma, k = 1) => (a.r() - 0.5) * 2 * k;

// ================================================================== registro
type Res = Pieza[] | Escena | void;
interface Def {
  id: string; nombre: [string, string]; variantes: string[]; huella?: [number, number]; bloquea?: boolean; cuadros?: number; t?: number; plano?: boolean;
  /** sin el corte de lo que queda bajo el piso (los pedazos que vuelan, con el ancla en su centro) */
  sinCorte?: boolean;
  /** muestras por lado fijas: las manchas finas se pintan siempre con 2 (sin el picado de la sombra sobre lo chato) */
  ss?: number;
  armar: (v: string, f: number, g: G, a: Arma) => Res;
}
/** Registra con el grupo raíz de kit_muerte; corta lo que quedó bajo el piso salvo `sinCorte`. */
export function reg(...ds: Def[]) {
  for (const d of ds) registrar({
    id: d.id, nombre: d.nombre, tema: T, variantes: d.variantes, huella: d.huella ?? [1, 1], bloquea: d.bloquea ?? false, cuadros: d.cuadros, t: d.t, plano: d.plano,
    armar: (v, f, a) => {
      const { ps, g } = raiz(a), r = d.armar(v, f, g, a);
      if (!d.sinCorte) bajoTierra(ps);
      const e: Escena = !r ? { piezas: ps } : Array.isArray(r) ? { piezas: r } : r;
      return d.ss ? { ...e, ss: d.ss } : e;
    },
  });
}

// ================================================================== superficies y manchas de piso
export type Sup = 'piedra' | 'tierra' | 'nieve' | 'madera' | 'negro' | 'verde';
export const SUPERFICIES: Sup[] = ['piedra', 'tierra', 'nieve', 'madera'];
export interface SupDef { mat: string; halo?: string; seca: string; sx: number; sy: number; alto: number }
export const SUP: Record<Sup, SupDef> = {
  piedra: { mat: 'gore_sangre', seca: 'gore_sangre_seca', sx: 1, sy: 1, alto: 1 },
  tierra: { mat: 'gore_sangre_tierra', halo: 'gore_barro_sangre', seca: 'gore_sangre_seca', sx: 1, sy: 1, alto: 0.75 },
  nieve: { mat: 'gore_sangre_nieve', halo: 'gore_nieve_rosa', seca: 'gore_sangre_oscura', sx: 1, sy: 1, alto: 0.9 },
  madera: { mat: 'gore_sangre_madera', seca: 'gore_sangre_seca', sx: 1.35, sy: 0.8, alto: 0.85 },
  negro: { mat: 'gore_icor_negro', seca: 'gore_icor_negro', sx: 1, sy: 1, alto: 1 },
  verde: { mat: 'gore_icor_verde', seca: 'gore_icor_verde', sx: 1, sy: 1, alto: 1.05 },
};
const supDe = (v: string): Sup => (v.split('_')[0] as Sup) in SUP ? (v.split('_')[0] as Sup) : 'piedra';

/**
 * Mancha en el piso: cada gota es un bulto aplastado (alto `h`) que se funde con las vecinas. La superficie estira
 * la mancha (la madera la corre a lo largo de la veta) y le pone un halo debajo (barro, nieve derretida).
 */
export class Mancha {
  cs: Comp[] = [];
  hs: Comp[] = [];
  constructor(readonly g: G, readonly s: SupDef, readonly mat = s.mat) {}
  gota(x: number, y: number, rl: number, rt: number, ang: number, h = 0.6, tono = 0, halo = true) {
    const s = this.s, c = Math.cos(ang), sn = Math.sin(ang);
    const ax = c * s.sx, ay = sn * s.sy, L = Math.hypot(ax, ay), T2 = Math.hypot(-sn * s.sx, c * s.sy);
    const R: V3 = [Math.max(0.35, rl * L), Math.max(0.35, rt * T2), h * s.alto];
    this.cs.push(this.g.bu([x * s.sx, y * s.sy, 0.15], R, { eje: [ax, ay, 0], tono }));
    if (halo && s.halo && rl > 0.7) this.hs.push(this.g.bu([x * s.sx, y * s.sy, -0.2], [R[0] * 1.2 + 1.4, R[1] * 1.2 + 1.4, 0.45], { eje: [ax, ay, 0] }));
  }
  /** Mancha orgánica de radio R: un centro y lóbulos de largo desparejo, con gotitas sueltas alrededor. */
  charco(x: number, y: number, R: number, a: Arma, h = 0.8, lobulos = 9, sueltas = 6, crece = 1) {
    this.gota(x, y, R * 0.72, R * 0.66, a.r() * TAU, h, -0.1);
    const n = lobulos + Math.floor(a.r() * 4), f0 = a.r() * TAU;
    for (let i = 0; i < n; i++) {
      const th = f0 + (i / n) * TAU + r2(a, 0.25), d = R * (0.42 + a.r() * 0.38) * crece, t = R * (0.24 + a.r() * 0.26);
      this.gota(x + Math.cos(th) * d, y + Math.sin(th) * d, t * 1.25, t * 0.85, th, h * 0.92, r2(a, 0.04));
      // dedo que se escurre más allá del borde
      if (a.r() < 0.35) { const d2 = d + t * (1 + a.r()); this.gota(x + Math.cos(th) * d2, y + Math.sin(th) * d2, t * 0.7, t * 0.4, th, h * 0.75, 0.04); }
    }
    for (let i = 0; i < sueltas; i++) {
      const th = a.r() * TAU, d = R * (1.05 + a.r() * 0.6) * crece, t = 0.45 + a.r() * R * 0.06;
      this.gota(x + Math.cos(th) * d, y + Math.sin(th) * d, t * (1 + a.r() * 0.6), t, th, 0.45, 0.05);
    }
  }
  cerrar(suave = 1.4) {
    if (this.hs.length) this.g.masa(this.hs, { mat: this.s.halo!, suave: 0.5 });
    if (this.cs.length) this.g.masa(this.cs, { mat: this.mat, suave });
  }
}

/**
 * Salpicadura que sale hacia el rumbo `ang` (radianes en el piso): el golpe, el abanico de gotas que se estiran más
 * cuanto más lejos van (la cola apunta hacia adelante), espinas que salen del golpe y la niebla fina del borde.
 */
function salpicar(m: Mancha, ang: number, a: Arma, k = 1) {
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
  const P = (s: number, t: number): [number, number] => [ux * s + vx * t, uy * s + vy * t];
  // el golpe: un charco corrido hacia atrás
  const [bx, by] = P(-6 * k, r2(a, 1.5));
  m.charco(bx, by, 8.5 * k, a, 0.85, 7, 0);
  // espinas: dedos que salen del golpe en abanico
  const ne = 3 + Math.floor(a.r() * 3);
  for (let i = 0; i < ne; i++) {
    const da = r2(a, 0.38), L = (6 + Math.pow(a.r(), 1.5) * 22) * k, c = Math.cos(ang + da), s = Math.sin(ang + da);
    const n = Math.ceil(L / 2.2);
    for (let j = 0; j <= n; j++) { const t = j / n, w = (1.6 - t * 1.15) * k; m.gota(bx + c * (4 * k + t * L), by + s * (4 * k + t * L), 1.6 * k, Math.max(0.35, w), ang + da, 0.6 - t * 0.2); }
    // la gota de la punta
    m.gota(bx + c * (5 * k + L + 1.5), by + s * (5 * k + L + 1.5), 1.1 * k, 0.9 * k, ang + da, 0.5);
  }
  // el abanico de gotas: más grandes cerca, más chicas y estiradas lejos
  const ng = Math.round((26 + a.r() * 14) * k);
  for (let i = 0; i < ng; i++) {
    const s = (6 + Math.pow(a.r(), 0.8) * 46) * k, abre = (0.15 + (s / (52 * k)) * 0.45) * r2(a, 1), q = 1 - s / (60 * k);
    const [x, y] = P(s * Math.cos(abre), s * Math.sin(abre));
    const r = Math.max(0.45, (0.4 + a.r() * 1.5) * q * k), est = 1 + (s / (14 * k)) * (0.4 + a.r() * 0.5), dir = ang + abre * 0.8;
    m.gota(x, y, r * est, r, dir, 0.5 + r * 0.12);
    // cola fina hacia adelante
    if (r > 0.7 && a.r() < 0.7) m.gota(x + Math.cos(dir) * r * est * 1.3, y + Math.sin(dir) * r * est * 1.3, r * est * 0.8, r * 0.38, dir, 0.4);
  }
  // niebla: puntitos sueltos a los costados
  for (let i = 0; i < 14 * k; i++) { const s = (4 + a.r() * 40) * k, t = r2(a, 14 + s * 0.4) * k; const [x, y] = P(s, t); m.gota(x, y, 0.45, 0.4, ang, 0.35); }
}

/** Charco en el cuadro `f` de `n`: los lóbulos avanzan a su propio ritmo (no crece como un círculo que se infla). */
function charcoQueCrece(m: Mancha, a: Arma, f: number, n: number, Rmax: number) {
  const t = Math.min(1, f / (n - 1)), e = 1 - Math.pow(1 - t, 2.2);
  const R = Rmax * (0.22 + 0.78 * e), h = 0.35 + 0.45 * e;
  m.gota(0, 0, R * 0.7, R * 0.64, a.r() * TAU, h, -0.14);
  const nl = 11, f0 = a.r() * TAU;
  for (let i = 0; i < nl; i++) {
    const vel = 0.55 + a.r() * 0.75, th = f0 + (i / nl) * TAU + r2(a, 0.2), tam = 0.26 + a.r() * 0.22;
    const d = Rmax * (0.15 + 0.62 * Math.min(1, e * vel)), w = R * tam;
    m.gota(Math.cos(th) * d, Math.sin(th) * d, w * 1.3, w * 0.9, th, h * 0.9, r2(a, 0.04));
    const mid = d * 0.55; m.gota(Math.cos(th) * mid, Math.sin(th) * mid, w * 1.2, w, th, h * 0.95, -0.06);
    // el frente del lóbulo rápido se adelanta en un dedo
    const dedo = a.r();
    if (dedo < 0.4 && e > 0.3) { const d2 = d + w * (0.7 + e); m.gota(Math.cos(th) * d2, Math.sin(th) * d2, w * 0.75, w * 0.42, th, h * 0.75, 0.05); }
  }
  // gotas que cayeron antes (siempre en el mismo lugar)
  for (let i = 0; i < 5; i++) { const th = a.r() * TAU, d = Rmax * (0.9 + a.r() * 0.5), r = 0.5 + a.r() * 0.9; m.gota(Math.cos(th) * d, Math.sin(th) * d, r, r * 0.9, th, 0.5); }
}

/**
 * Media suela de bota en coordenadas de la suela: `u` hacia la punta, `v` hacia el lado de afuera del pie. Devuelve
 * dónde cae (0 afuera; 1 la puntera y la planta; 2 el taco), con el hueco del arco entre las dos.
 */
function suela(u: number, v: number): number {
  if (u >= -0.6 && u <= 5.8) {
    // la planta: angosta en la cintura, ancha en el metatarso, la puntera redonda y corrida hacia el dedo gordo
    const c = -0.3 * Math.min(1, (u + 0.6) / 5), an = u < 2.8 ? 1.12 + 0.63 * Math.sin(((u + 0.6) / 3.4) * Math.PI / 2) : 1.75 * Math.sqrt(Math.max(0, 1 - ((u - 2.8) / 3.05) ** 2.4));
    return Math.abs(v - c) <= an ? 1 : 0;
  }
  if (u >= -5.3 && u <= -2.6) {
    // el taco: el frente recto y la parte de atrás redonda
    const an = u > -4.3 ? 1.45 : 1.45 * Math.sqrt(Math.max(0, 1 - ((u + 4.3) / 1.0) ** 2));
    return Math.abs(v + 0.05) <= an ? 2 : 0;
  }
  return 0;
}
/** Las ranuras de la suela (tacos de goma de la planta y del taco): bandas transversales más hundidas. */
const ranura = (u: number) => [0.9, 2.1, 3.3, 4.5, -3.4, -4.5].some((r) => Math.abs(u - r) < 0.22);
/**
 * Huella de bota con sangre: la planta y el taco separados por el arco, con las ranuras de la suela. `gasto` (0 a 1)
 * es cuánta sangre le queda a la suela: se pierde primero el medio de la planta y la cintura y quedan el borde de la
 * puntera y el talón, que pisan más fuerte; se gasta a manchones (ruido), no a granos.
 */
function huellaBota(m: Mancha, x: number, y: number, ang: number, lado: number, gasto: number, a: Arma) {
  // la suela va un poco más grande que la de verdad: a la escala del juego tiene que leerse planta, arco y taco
  const c = Math.cos(ang), s = Math.sin(ang), sem = a.r() * 50, K = 1.6;
  const P = (u: number, v: number): [number, number] => [x + (c * u - s * v * lado) * K, y + (s * u + c * v * lado) * K];
  const paso = 0.5;
  for (let u = -5.3; u <= 5.8; u += paso) for (let v = -2; v <= 2; v += paso) {
    const q = suela(u, v);
    if (!q) continue;
    // cuánto pisa este punto: la puntera, el borde de la planta y el fondo del taco más; el medio menos
    const borde = Math.max(Math.abs(v) / 1.7, q === 1 ? Math.max(0, (u - 3.8) / 2) : Math.max(0, (-u - 4) / 1.3));
    const pisa = 0.55 + 0.45 * borde + (q === 2 ? 0.15 : 0);
    const n = ruido(u * 0.55 + sem, v * 0.55, sem);
    if (n * 0.9 + (1 - pisa) * 0.45 < gasto * 1.05 - 0.05) continue;
    const [px, py] = P(u + r2(a, 0.06), v + r2(a, 0.06));
    m.gota(px, py, 0.42 * K, 0.42 * K, ang, 0.36 - gasto * 0.12, (ranura(u) ? -0.28 : 0) + gasto * 0.05 + r2(a, 0.02), false);
  }
  // la sangre espesa que se corre al despegar el pie: una lengua corta desde la punta (solo las primeras)
  if (gasto < 0.35) { const [px, py] = P(6.2 + a.r() * 0.8, -0.2); m.gota(px, py, 0.9 * K, 0.45 * K, ang, 0.3, 0.04, false); }
}

// ------------------------------------------------------------------ manchas de pared
/** Mancha en la cara de una pared (plano x-z en y = 0, la cara hacia +y del grupo). */
export class ManchaPared {
  cs: Comp[] = [];
  constructor(readonly g: G, readonly mat = 'gore_sangre', readonly tono = 0) {}
  /** Gota en (u, z) estirada a lo largo de `ang` (0 = a lo largo de x, -90° = hacia abajo). */
  gota(u: number, z: number, rl: number, rt: number, ang: number, h = 0.5, tono = 0) {
    const e: V3 = [Math.cos(ang), 0, Math.sin(ang)];
    this.cs.push(this.g.bu([u, h * 0.45, z], [Math.max(0.35, rl), h, Math.max(0.35, rt)], { eje: e, tono: tono + this.tono }));
  }
  /** Chorreado: baja de (u, z) hasta z1, angosto y ondulado, con la gota gorda de la punta. */
  chorro(u: number, z: number, z1: number, w: number, a: Arma) {
    const n = Math.max(2, Math.ceil((z - z1) / 1.1)), fase = a.r() * TAU, amp = 0.25 + a.r() * 0.5;
    let x = u;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      x = u + Math.sin(fase + t * 5) * amp * t + r2(a, 0.05);
      this.gota(x, z - (z - z1) * t, 1, Math.max(0.3, w * (1 - t * 0.35) * (0.85 + 0.15 * Math.sin(fase * 2 + t * 13))), -Math.PI / 2, 0.32 + (1 - t) * 0.08);
    }
    this.gota(x, z1 - 0.5, 1.1, w * 1.25 + 0.2, -Math.PI / 2, 0.55, 0.06);
  }
  /** Mancha redonda irregular en la pared. */
  mancha(u: number, z: number, R: number, a: Arma, h = 0.6) {
    this.gota(u, z, R * 0.7, R * 0.65, a.r() * TAU, h, -0.06);
    const n = 7 + Math.floor(a.r() * 4);
    for (let i = 0; i < n; i++) { const th = (i / n) * TAU + r2(a, 0.3), d = R * (0.4 + a.r() * 0.4), t = R * (0.25 + a.r() * 0.22); this.gota(u + Math.cos(th) * d, z + Math.sin(th) * d, t * 1.2, t * 0.8, th, h * 0.9); }
  }
  cerrar(suave = 1.1) { if (this.cs.length) this.g.masa(this.cs, { mat: this.mat, suave }); }
}
/** Variantes de pared: `x` a lo largo de x (cara +y) y `der` a lo largo de y (cara +x). */
const caraPared = (g: G, v: string) => (v.startsWith('der') ? g.sub(0, 0, 0, -90) : g);
/** La cara `der` queda en la sombra de la luz del taller: se aclara un poco para que se lea. */
const tonoPared = (v: string) => (v.startsWith('der') ? 0.16 : 0.06);

// ================================================================== registro: manchas
const SUP_DIR = [...SUPERFICIES.flatMap((s) => DIR8.map((d) => `${s}_${d}`)), ...DIR8.map((d) => `negro_${d}`), ...DIR8.map((d) => `verde_${d}`)];
const rumboDe = (v: string) => (RUMBO[v.split('_').pop()!] ?? 45) * (Math.PI / 180);

reg(
  {
    id: 'gore_salpicadura', ss: 2, nombre: ['Salpicadura de sangre', 'Blood spatter'], variantes: SUP_DIR, huella: [4, 4], plano: true,
    armar: (v, _f, g, a) => { const m = new Mancha(g, SUP[supDe(v)]); salpicar(m, rumboDe(v), a, 0.9 + a.r() * 0.25); m.cerrar(1.3); },
  },
  {
    id: 'gore_charco', ss: 2, nombre: ['Charco de sangre que crece', 'Spreading blood pool'], variantes: [...SUPERFICIES, 'negro', 'verde'], huella: [3, 3], plano: true, cuadros: 8, t: 4,
    armar: (v, f, g, a) => { const m = new Mancha(g, SUP[supDe(v)]); charcoQueCrece(m, a, f, 8, 19 + a.r() * 5); m.cerrar(2); },
  },
  {
    id: 'gore_gotas', ss: 2, nombre: ['Gotas de sangre', 'Blood drops'], variantes: SUPERFICIES.flatMap((s) => [`${s}_dispersas`, `${s}_hilera_x`, `${s}_hilera_y`]), huella: [3, 3], plano: true,
    armar: (v, _f, g, a) => {
      const m = new Mancha(g, SUP[supDe(v)]);
      const corona = (x: number, y: number, r: number) => {
        m.gota(x, y, r, r * (0.85 + a.r() * 0.15), a.r() * TAU, 0.55 + r * 0.1, -0.05);
        // la corona: gotitas pegadas al borde de cada gota que cayó de alto
        const n = 4 + Math.floor(a.r() * 5);
        for (let i = 0; i < n; i++) { const th = a.r() * TAU, d = r * (1.05 + a.r() * 0.5); m.gota(x + Math.cos(th) * d, y + Math.sin(th) * d, 0.5 + a.r() * 0.4, 0.4, th, 0.4); }
      };
      if (v.endsWith('dispersas')) for (let i = 0; i < 16; i++) corona(r2(a, 22), r2(a, 18), 0.7 + Math.pow(a.r(), 2) * 2.4);
      else {
        // quien sangra caminando: gotas cada medio paso, que se corren hacia adelante
        const eje = v.endsWith('_y') ? Math.PI / 2 : 0, c = Math.cos(eje), s = Math.sin(eje);
        for (let i = 0; i < 13; i++) { const u = -30 + i * 5 + r2(a, 1.4), w = Math.sin(i * 1.3) * 2 + r2(a, 1.5); const r = 0.7 + a.r() * 1.5; corona(c * u - s * w, s * u + c * w, r); if (a.r() < 0.5) m.gota(c * (u + r * 1.6) - s * w, s * (u + r * 1.6) + c * w, r * 0.9, r * 0.35, eje, 0.4); }
      }
      m.cerrar(1);
    },
  },
  {
    id: 'gore_rastro', ss: 2, nombre: ['Rastro de arrastre', 'Drag trail'], variantes: SUPERFICIES.flatMap((s) => DIR8.map((d) => `${s}_${d}`)), huella: [5, 5], plano: true,
    armar: (v, _f, g, a) => {
      const m = new Mancha(g, SUP[supDe(v)]), ang = rumboDe(v), c = Math.cos(ang), s = Math.sin(ang);
      const P = (u: number, w: number): [number, number] => [c * u - s * w, s * u + c * w];
      // donde quedó tirado: el charco de partida
      const [x0, y0] = P(-30, 0); m.charco(x0, y0, 10, a, 0.85, 8, 3);
      // la banda arrastrada: hebras paralelas que se cortan y se secan hacia el final
      const nh = 9;
      for (let k = 0; k < nh; k++) {
        const w = -6 + (k / (nh - 1)) * 12 + r2(a, 0.5), corta = 0.35 + a.r() * 0.65, grueso = 0.6 + a.r() * 0.9;
        let ondula = r2(a, 1);
        for (let u = -24; u < -24 + 64 * corta; u += 1.8) {
          const t = (u + 24) / 64, seca = t * t * 1.2;
          if (a.r() < seca * 0.7) continue;
          ondula += r2(a, 0.15);
          const [x, y] = P(u, w + ondula + Math.sin(u * 0.08) * 1.6);
          m.gota(x, y, 1.6, grueso * (1 - t * 0.5), ang, 0.55 - t * 0.2, t * 0.06);
        }
      }
      // el medio, más cargado
      for (let u = -24; u < 6; u += 2.2) { const [x, y] = P(u, r2(a, 1.2) + Math.sin(u * 0.08) * 1.6); m.gota(x, y, 2.2, 3.2 - (u + 24) * 0.06, ang, 0.65); }
      // dedos que arañan a los costados (alguien se agarró del piso)
      for (const lado of [-1, 1]) {
        const u0 = -20 + a.r() * 26, w0 = lado * (9 + a.r() * 3);
        for (let d = 0; d < 4; d++) for (let u = 0; u < 7 + a.r() * 6; u += 1.3) { const [x, y] = P(u0 + u, w0 + d * 1.25 * lado - u * 0.12 * lado); m.gota(x, y, 0.9, 0.42, ang, 0.4); }
      }
      m.cerrar(1.1);
    },
  },
  {
    id: 'gore_huellas', ss: 2, nombre: ['Huellas ensangrentadas', 'Bloody footprints'], variantes: SUPERFICIES.flatMap((s) => DIR8.map((d) => `${s}_${d}`)), huella: [5, 5], plano: true,
    armar: (v, _f, g, a) => {
      const m = new Mancha(g, SUP[supDe(v)]), ang = rumboDe(v), c = Math.cos(ang), s = Math.sin(ang);
      const P = (u: number, w: number): [number, number] => [c * u - s * w, s * u + c * w];
      // pisó el charco: la mancha de donde salió, corrida hacia adelante, con el resbalón del primer pie
      const [x0, y0] = P(-62, 0.5); m.charco(x0, y0, 7, a, 0.7, 7, 4);
      // paso tras paso, izquierdo y derecho alternados a lo ancho de la marcha, la punta un poco abierta hacia afuera,
      // y cada vez con menos sangre en la suela
      const n = 6, largo = 21;
      for (let i = 0; i < n; i++) {
        const lado = i % 2 ? 1 : -1, u = -46 + i * largo + r2(a, 0.8), w = lado * (3.6 + r2(a, 0.3));
        const [x, y] = P(u, w);
        huellaBota(m, x, y, ang + lado * (0.12 + r2(a, 0.04)), lado, 0.02 + i * 0.14, a);
      }
      m.cerrar(0.45);
    },
  },
  {
    id: 'gore_sangre_seca', ss: 2, nombre: ['Sangre seca', 'Dried blood'], variantes: SUPERFICIES.flatMap((s) => [`${s}_mancha`, `${s}_costra`]), huella: [3, 3], plano: true,
    armar: (v, _f, g, a) => {
      const sd = SUP[supDe(v)], m = new Mancha(g, { ...sd, halo: undefined }, sd.seca);
      if (v.endsWith('mancha')) {
        m.charco(0, 0, 13, a, 0.45, 10, 5);
        // el anillo más oscuro del borde (donde se secó primero)
        const n = 30;
        for (let i = 0; i < n; i++) { const th = (i / n) * TAU, d = 11 + ruido(Math.cos(th) * 2, Math.sin(th) * 2, a.seed) * 4; m.gota(Math.cos(th) * d, Math.sin(th) * d, 1.6, 0.9, th + Math.PI / 2, 0.5, -0.12); }
      } else for (let i = 0; i < 7; i++) m.charco(r2(a, 14), r2(a, 11), 2 + a.r() * 4, a, 0.5, 6, 2);
      m.cerrar(1.2);
    },
  },
  {
    id: 'gore_pared_salpicadura', ss: 2, nombre: ['Salpicadura en la pared', 'Wall blood spatter'], variantes: ['x', 'der', 'x_baja', 'der_baja'], huella: [5, 1], plano: true,
    armar: (v, _f, g0, a) => {
      const g = caraPared(g0, v), m = new ManchaPared(g, 'gore_sangre', tonoPared(v)), z0 = v.endsWith('baja') ? 16 : 34;
      // chorro arterial: latidos de gotas que barren la pared en arco (gordas al latir, finas entre latido y latido)
      const lado = a.r() < 0.5 ? -1 : 1, f0 = a.r() * 3;
      let prev: [number, number] = [-lado * 20, z0];
      for (let i = 0; i < 46; i++) {
        const t = i / 45, u = lado * (-20 + t * 44), z = z0 + 8 * Math.sin(t * 3.4 + f0) + t * 5 + r2(a, 0.8);
        const late = Math.pow(0.5 + 0.5 * Math.cos(t * 6 * TAU), 3), ang = Math.atan2(z - prev[1], u - prev[0]);
        prev = [u, z];
        if (a.r() < 0.25 + (1 - late) * 0.3) continue;
        const r = (0.45 + late * 1.6 * (1 - t * 0.55)) * (0.7 + a.r() * 0.5);
        m.gota(u, z, r * (1.4 + a.r()), r, ang, 0.45);
        if (r > 0.8 && a.r() < 0.35) m.gota(u + Math.cos(ang) * r * 2.4, z + Math.sin(ang) * r * 2.4, r * 1.2, r * 0.35, ang, 0.35);
        if (r > 1.1 && a.r() < 0.4) m.chorro(u, z - r * 0.5, z - r - 3 - Math.pow(a.r(), 1.5) * 20, 0.35 + r * 0.15, a);
      }
      // el golpe donde empezó
      m.mancha(-lado * 22, z0 - 1, 4.5, a);
      for (let i = 0; i < 4; i++) m.chorro(-lado * 22 + r2(a, 4), z0 - 3, Math.max(1.5, z0 - 6 - Math.pow(a.r(), 1.3) * 26), 0.4 + a.r() * 0.45, a);
      // salpicón fino
      for (let i = 0; i < 40; i++) { const u = r2(a, 30), z = z0 + r2(a, 15), r = 0.3 + Math.pow(a.r(), 2.5) * 0.9; m.gota(u, z, r * (1 + a.r()), r, a.r() * TAU, 0.35); }
      m.cerrar(1);
    },
  },
  {
    id: 'gore_pared_chorreado', ss: 2, nombre: ['Sangre que chorrea por la pared', 'Blood running down a wall'], variantes: ['x', 'der', 'x_espeso', 'der_espeso'], huella: [4, 2], plano: true,
    armar: (v, _f, g0, a) => {
      const g = caraPared(g0, v), m = new ManchaPared(g, 'gore_sangre', tonoPared(v)), espeso = v.endsWith('espeso');
      const zt = 42 + a.r() * 12, n = espeso ? 14 : 8, ancho = espeso ? 20 : 14;
      // la mancha de arriba, de donde baja todo (una grieta o algo que sangra del otro lado)
      for (let i = 0; i < 6; i++) m.mancha(r2(a, ancho * 0.8), zt + r2(a, 2.5), 1.6 + a.r() * 2.4, a, 0.5);
      const hilos: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const u = r2(a, ancho), w = 0.35 + Math.pow(a.r(), 2) * (espeso ? 0.9 : 0.6), L = 6 + Math.pow(a.r(), 0.7) * (zt - 8);
        const z0 = zt - 1 - Math.pow(a.r(), 2) * 7 + Math.cos(u * 0.3) * 1.5; m.chorro(u, z0, Math.max(1, z0 - L), w, a); hilos.push([u, z0 - L]);
      }
      // hilos que se abren de otro hilo a mitad de camino
      for (let i = 0; i < n / 3; i++) { const [u, zf] = hilos[i]; const z = zf + (zt - zf) * (0.3 + a.r() * 0.4); m.chorro(u + r2(a, 0.5), z, Math.max(1, z - 4 - a.r() * 10), 0.3, a); }
      m.cerrar(1.2);
      // el charco que se junta al pie de la pared (en el piso, delante de la cara)
      const p = new Mancha(g, SUP.piedra);
      p.charco(0, 6, espeso ? 9 : 6, a, 0.8, 8, 3);
      p.cerrar(1.6);
    },
  },
  {
    id: 'gore_pared_mano', ss: 2, nombre: ['Mano ensangrentada en la pared', 'Bloody handprint'], variantes: ['x', 'der', 'x_arrastre', 'der_arrastre', 'x_varias', 'der_varias'], huella: [3, 1], plano: true,
    armar: (v, _f, g0, a) => {
      const g = caraPared(g0, v), m = new ManchaPared(g, 'gore_sangre', tonoPared(v));
      const mano = (u: number, z: number, giro: number, k: number, arrastre: number) => {
        const R = (du: number, dz: number): [number, number] => [u + du * Math.cos(giro) - dz * Math.sin(giro), z + du * Math.sin(giro) + dz * Math.cos(giro)];
        const sube = Math.PI / 2 + giro;
        let [x, y] = R(0, 0); m.gota(x, y, 2.6 * k, 2.2 * k, sube, 0.55, -0.05);
        [x, y] = R(0, -2 * k); m.gota(x, y, 1.6 * k, 2 * k, sube, 0.5);
        const largos = [2.9, 3.5, 3.3, 2.5];
        for (let i = 0; i < 4; i++) {
          const du = (-1.8 + i * 1.2) * k, L = largos[i] * k, ab = (i - 1.5) * 0.14;
          for (let j = 0; j <= 3; j++) { [x, y] = R(du + Math.sin(ab) * L * j / 3, 2.3 * k + Math.cos(ab) * L * j / 3); m.gota(x, y, 0.6 * k, 0.42 * k, sube + ab, 0.42); }
          // la yema más cargada
          [x, y] = R(du + Math.sin(ab) * L, 2.4 * k + L); m.gota(x, y, 0.62 * k, 0.6 * k, sube, 0.55, 0.04);
          // los dedos que resbalan hacia abajo
          if (arrastre > 0) { [x, y] = R(du, 1); m.chorro(x, y, y - arrastre * (0.6 + a.r() * 0.5), 0.55 * k, a); }
        }
        // pulgar abierto
        for (let j = 0; j <= 3; j++) { [x, y] = R(2.3 * k + j * 0.7 * k, -0.2 * k + j * 0.75 * k); m.gota(x, y, 0.7 * k, 0.6 * k, sube - 0.8, 0.48); }
        if (arrastre > 0) { [x, y] = R(0, -2); m.chorro(x, y, y - arrastre, 1.4 * k, a); }
      };
      const k = 1.75;
      if (v.endsWith('varias')) for (let i = 0; i < 4; i++) mano(-18 + i * 12 + r2(a, 2), 16 + a.r() * 24, r2(a, 0.4), k * (0.9 + a.r() * 0.2), a.r() < 0.4 ? 8 + a.r() * 10 : 0);
      else mano(0, 32, r2(a, 0.25), k, v.endsWith('arrastre') ? 20 + a.r() * 8 : 0);
      if (!v.endsWith('varias')) for (let i = 0; i < 10; i++) m.gota(r2(a, 8), 32 + r2(a, 8), 0.4 + a.r() * 0.4, 0.4, a.r() * TAU, 0.4);
      m.cerrar(0.6);
    },
  },
);

// ================================================================== paletas de carne
export interface Paleta { nombre: string; piel: string; carne: string; grasa: string; hueso: string; tripa: string; sangre: string; organo: string }
export const PALETAS: Record<string, Paleta> = {
  rojo: { nombre: 'rojo', piel: 'gore_piel', carne: 'gore_carne', grasa: 'gore_grasa', hueso: 'gore_hueso', tripa: 'gore_tripa', sangre: 'gore_sangre', organo: 'gore_organo' },
  no_muerto: { nombre: 'no_muerto', piel: 'gore_piel_muerta', carne: 'gore_carne_podrida', grasa: 'gore_moho', hueso: 'gore_hueso_viejo', tripa: 'gore_tripa_podrida', sangre: 'gore_icor_negro', organo: 'gore_carne_podrida' },
  bestia: { nombre: 'bestia', piel: 'gore_quitina', carne: 'gore_carne_bestia', grasa: 'gore_pus', hueso: 'gore_cartilago', tripa: 'gore_tripa_bestia', sangre: 'gore_icor_verde', organo: 'gore_carne_bestia' },
};
export const NOMBRES_PALETA = ['rojo', 'no_muerto', 'bestia'];
/** Paleta de la variante (`rojo`, `no_muerto_...`, `bestia_...`). */
export const paletaDe = (v: string): Paleta => PALETAS[NOMBRES_PALETA.find((p) => v === p || v.startsWith(p + '_')) ?? 'rojo'];

/** Borde arrancado: bultos de carne desparejos, un muñón de hueso y hebras de sangre que cuelgan. */
function desgarro(g: G, cs: Comp[], c: V3, n: V3, R: number, p: Paleta, a: Arma, hueso = true) {
  const u = perp([0, 0, 1], n, [1, 0, 0]), w = cruz3(n, u);
  cs.push(g.bu(c, [R * 0.35, R * 0.85, R * 0.85], { mat: p.carne, eje: n }));
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * TAU + r2(a, 0.4), d = R * (0.3 + a.r() * 0.6);
    const q = add3(add3(add3(c, u, Math.cos(th) * d), w, Math.sin(th) * d), n, R * (0.05 + a.r() * 0.3));
    cs.push(g.bu(q, [R * (0.3 + a.r() * 0.3), R * (0.22 + a.r() * 0.15), R * 0.25], { mat: a.r() < 0.55 ? p.carne : p.sangre, eje: nor3(add3(n, [r2(a, 0.6), r2(a, 0.6), r2(a, 0.6)])) }));
  }
  if (a.r() < 0.6) cs.push(g.bu(add3(c, u, R * 0.3), [R * 0.3, R * 0.5, R * 0.18], { mat: p.grasa, eje: n }));
  if (hueso) cs.push(g.hu(add3(c, n, -R * 0.5), add3(add3(c, n, R * (0.5 + a.r() * 0.5)), u, r2(a, R * 0.2)), R * 0.26, R * 0.18, { mat: p.hueso, k: 0.3 }));
}
/** Hebras que cuelgan de un borde (sangre espesa o tendones). */
function hebras(cs: Comp[], g: G, c: V3, n: number, largo: number, p: Paleta, a: Arma) {
  for (let i = 0; i < n; i++) { const q: V3 = [c[0] + r2(a, 2), c[1] + r2(a, 2), c[2]]; const e: V3 = [q[0] + r2(a, 1.5), q[1] + r2(a, 1.5), q[2] - largo * (0.5 + a.r() * 0.6)]; cs.push(g.hu(q, e, 0.55, 0.3, { mat: p.sangre, k: 0.6 }), g.bu(e, [0.55, 0.55, 0.7], { mat: p.sangre })); }
}

/**
 * Sangre que mancha la piel cerca de la herida: esferas metidas casi enteras bajo la piel de un tramo (de `desde` a
 * `hacia`, de radio `R`); asoma solo el casquete, así tiñen la superficie sin hacer granos.
 */
function ensangrentar(cs: Comp[], g: G, desde: V3, hacia: V3, n: number, R: number, p: Paleta, a: Arma) {
  const d = nor3(sub3(hacia, desde));
  for (let i = 0; i < n; i++) {
    const t = Math.pow(a.r(), 1.5), r = 1.2 + a.r() * 1.6 * (1 - t * 0.6), th = a.r() * TAU;
    const u = perp([Math.cos(th), Math.sin(th), r2(a, 1)], d, [0, 0, 1]);
    const q = add3(add3(desde, sub3(hacia, desde), t), u, R - r + 0.7);
    cs.push(g.bu(q, [r * 1.3, r, r], { mat: a.r() < 0.85 ? p.sangre : p.carne, eje: d, k: 0.2 }));
  }
}
// ------------------------------------------------------------------ pedazos (centrados en el origen)
type Gib = (g: G, p: Paleta, a: Arma) => void;
const gibTorso: Gib = (g, p, a) => {
  const cs: Comp[] = [];
  // pecho: la caja torácica con su piel (o placas de caparazón)
  cs.push(g.bu([0, 0, 2], [4.4, 7.6, 4.8], { mat: p.piel }), g.bu([1.8, 0, 3.2], [2.6, 6.4, 3.2], { mat: p.piel, tono: 0.04 }), g.bu([-1.8, 0, 3.8], [2.4, 6.6, 3.4], { mat: p.piel, tono: -0.03 }));
  for (const s of [-1, 1]) cs.push(g.bu([0.5, s * 6.2, 3.6], [3, 2.8, 2.8], { mat: p.piel }));
  if (p.nombre === 'bestia') for (let i = 0; i < 4; i++) cs.push(g.bu([1 - i * 1.2, 0, 6 - i * 0.8], [2.2, 6.8 - i * 0.6, 1.4], { mat: p.piel, tono: 0.08 - i * 0.03, k: 0.35 }));
  // abajo, arrancado: carne, la columna, puntas de costillas
  desgarro(g, cs, [0, 0, -2.2], [0, 0, -1], 6, p, a, false);
  cs.push(g.hu([-3, 0, 1], [-3.2 + r2(a, 0.5), r2(a, 0.6), -7], 1.3, 1.1, { mat: p.hueso, k: 0.5 }));
  for (let i = 0; i < 3; i++) cs.push(g.bu([-3.2, 0, -2 - i * 1.8], [1.4, 1.6, 0.8], { mat: p.hueso, k: 0.3 }));
  // costillas partidas que asoman por abajo (arcos que siguen la curva del pecho y se cortan)
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x0 = -2.6 + i * 1.5, L = 2.5 + a.r() * 3, an = 0.5 + i * 0.12;
    cs.push(g.hu([x0, s * 5.6, -0.5], [x0 + Math.sin(an) * 1.2, s * (6.4 - i * 0.3), -0.5 - L], 0.5, 0.3, { mat: p.hueso, k: 0.2 }));
  }
  // el hombro: el muñón del brazo de un lado
  const lh = a.r() < 0.5 ? -1 : 1;
  desgarro(g, cs, [0.4, lh * 8.4, 3.6], [0, lh, 0.15], 2.2, p, a);
  // muñón del cuello
  desgarro(g, cs, [0.5, 0, 6.2], [0.15, 0, 1], 2.4, p, a);
  hebras(cs, g, [0, 0, -4], 3, 4, p, a);
  ensangrentar(cs, g, [0, 0, -2], [1, 0, 6], 10, 5.6, p, a);
  // un tajo abierto en el costado, con dos costillas a la vista
  const ld = a.r() < 0.5 ? -1 : 1;
  cs.push(g.bu([1.5, ld * 6.2, 1.5], [2.6, 1.2, 2.2], { mat: p.carne, k: 0.4 }));
  for (let i = 0; i < 2; i++) cs.push(g.hu([0.2, ld * 6.6, 0.4 + i * 1.8], [3.2, ld * 6.2, 0.8 + i * 1.8], 0.5, 0.5, { mat: p.hueso, k: 0.25 }));
  g.masa(cs, { mat: p.piel, suave: 1.1 });
};
/** Brazo arrancado a lo largo de x: hombro en -x, mano en +x. */
const gibBrazo: Gib = (g, p, a) => {
  const cs: Comp[] = [], codo: V3 = [1, 0, 0], dob = 0.4 + a.r() * 0.6, mano: V3 = [1 + Math.cos(dob) * 9.5, 0, Math.sin(dob) * 9.5];
  cs.push(g.hu([-10, 0, 0], codo, 2.4, 1.8, { mat: p.piel }), g.bu([-5, 0, 0.4], [3.6, 2.5, 2.3], { mat: p.piel, eje: [1, 0, 0] }));
  cs.push(g.hu(codo, mano, 1.75, 1.2, { mat: p.piel }), g.bu([1 + Math.cos(dob) * 3, 0, Math.sin(dob) * 3], [3, 2, 1.9], { mat: p.piel, eje: [Math.cos(dob), 0, Math.sin(dob)] }));
  const dm: V3 = [Math.cos(dob), 0, Math.sin(dob)], pm = add3(mano, dm, 1.4);
  cs.push(g.bu(pm, [1.7, 1.6, 0.9], { mat: p.piel, eje: dm }));
  // dedos que se cierran (garras en la bestia)
  const garra = p.nombre === 'bestia';
  for (let i = 0; i < 4; i++) { const y = -1.2 + i * 0.8, q1 = add3(add3(pm, dm, 1.6), [0, y, 0]), q2 = add3(add3(q1, dm, 1.2), [0, 0, -1.4]); cs.push(g.hu(add3(pm, [0, y, 0]), q1, 0.5, 0.42, { mat: p.piel, k: 0.3 }), g.hu(q1, q2, 0.42, garra ? 0.12 : 0.34, { mat: garra ? p.hueso : p.piel, k: 0.3 })); }
  cs.push(g.hu(add3(pm, [0, 1.4, 0]), add3(add3(pm, dm, 1.5), [0, 2.4, -0.8]), 0.5, 0.4, { mat: p.piel, k: 0.3 }));
  desgarro(g, cs, [-10.5, 0, 0], [-1, 0, 0], 2.8, p, a);
  hebras(cs, g, [-10, 0, -1], 2, 3.5, p, a);
  ensangrentar(cs, g, [-10, 0, 0], codo, 7, 2.2, p, a);
  if (p.nombre === 'no_muerto') cs.push(g.hu([-6, 0, 2.3], [0, 0, 1.8], 0.7, 0.6, { mat: p.hueso, k: 0.4 }));
  g.masa(cs, { mat: p.piel, suave: 1 });
};
/** Pierna arrancada: cadera en -x, pie en +x. */
const gibPierna: Gib = (g, p, a) => {
  const cs: Comp[] = [], rod: V3 = [2, 0, 0], dob = -(0.3 + a.r() * 0.6), d: V3 = [Math.cos(dob), 0, Math.sin(dob)], tob = add3(rod, d, 12);
  cs.push(g.hu([-12, 0, 0], rod, 3.6, 2.5, { mat: p.piel }), g.bu([-6, 0, 0.6], [5, 3.6, 3.2], { mat: p.piel, eje: [1, 0, 0] }));
  cs.push(g.bu(rod, [2.4, 2.4, 2.3], { mat: p.piel }), g.hu(rod, tob, 2.4, 1.4, { mat: p.piel }), g.bu(add3(rod, d, 3.5), [3.4, 2.1, 2.4], { mat: p.piel, eje: d }));
  const pie = add3(tob, [-d[2], 0, d[0]], -4);
  cs.push(g.hu(tob, pie, 1.5, 1.2, { mat: p.piel }), g.bu(add3(tob, [-d[2], 0, d[0]], -1.5), [2.6, 1.6, 1.2], { mat: p.piel, eje: [-d[2], 0, d[0]] }));
  desgarro(g, cs, [-12.5, 0, 0], [-1, 0, 0], 3.9, p, a);
  hebras(cs, g, [-12, 0, -2], 3, 4, p, a);
  ensangrentar(cs, g, [-12, 0, 0], rod, 8, 3.3, p, a);
  if (p.nombre !== 'rojo') cs.push(g.hu([-9, 0, -2.8], [-2, 0, -2.2], 0.9, 0.8, { mat: p.hueso, k: 0.4 }));
  g.masa(cs, { mat: p.piel, suave: 1.1 });
};
/** Costillar: un tramo de columna (a lo largo de y) con cuatro costillas que se curvan. */
const gibCostillas: Gib = (g, p, a) => {
  const cs: Comp[] = [];
  for (let i = 0; i < 5; i++) { const y = -6 + i * 3; cs.push(g.bu([-3, y, 0], [1.6, 1.3, 1.5], { mat: p.hueso }), g.hu([-3, y, 0], [-4.6, y, 0.4], 0.7, 0.4, { mat: p.hueso, k: 0.3 })); }
  cs.push(g.hu([-3, -7, 0], [-3, 7, 0], 1, 1, { mat: p.hueso }));
  for (let i = 0; i < 4; i++) {
    const y = -4.5 + i * 3, R = 6 + i * 0.4, rota = a.r() < 0.25, fin = rota ? 2 + Math.floor(a.r() * 2) : 5;
    let prev: V3 = [-3, y, 0];
    for (let k = 1; k <= fin; k++) { const th = (k / 5) * 2.3, q: V3 = [-3 + Math.sin(th) * R, y + k * 0.25, -Math.cos(th) * R * 0.7 + R * 0.7 - 0.5]; cs.push(g.hu(prev, q, 0.75, 0.65, { mat: p.hueso, k: 0.3 })); prev = q; }
    // carne entre las costillas
    if (i < 3 && a.r() < 0.75) cs.push(g.bu([-3 + R * 0.55, y + 1.5, R * 0.45], [2.4, 1.2, 1.4], { mat: a.r() < 0.5 ? p.carne : p.sangre, eje: [1, 0, 0.6] }));
  }
  if (p.nombre === 'bestia') cs.push(g.bu([-1.5, 0, -1.2], [4, 8, 1.2], { mat: p.piel, tono: 0.06 }));
  hebras(cs, g, [0, 0, -1], 3, 3, p, a);
  g.masa(cs, { mat: p.hueso, suave: 0.7 });
};
/**
 * Cráneo (más grande que el resto de los pedazos en proporción: tiene que leerse a la escala del juego): la bóveda,
 * la frente con el arco de las cejas, pómulos, cuencas hondas, el agujero de la nariz, la fila de dientes y a veces la
 * mandíbula todavía colgada; de un lado le queda carne y cuero cabelludo arrancado a medias (en el no muerto, jirones
 * secos y moho). La bestia: cabeza de bicho con mandíbulas y ojos compuestos.
 */
const gibCraneo: Gib = (g0, p, a) => {
  const cs: Comp[] = [];
  if (p.nombre === 'bestia') {
    const g = g0.esc(1.3);
    cs.push(g.bu([0, 0, 0], [4.6, 3.8, 3.4], { mat: p.piel }), g.bu([2.8, 0, -0.6], [2.6, 2.6, 2.2], { mat: p.piel, tono: 0.05 }));
    for (const s of [-1, 1]) {
      cs.push(g.bu([2.6, s * 2.8, 1], [1.6, 1.3, 1.6], { mat: p.piel, tono: -0.12 }));
      const b: V3 = [4.6, s * 1.6, -1.6], m1: V3 = [7.2, s * 2.6, -1.4], m2: V3 = [8.8, s * 0.5, -1.2];
      cs.push(g.hu(b, m1, 1, 0.65, { mat: p.hueso, k: 0.3 }), g.hu(m1, m2, 0.65, 0.15, { mat: p.hueso, k: 0.2 }));
      cs.push(g.hu([-1, s * 2, 3], [-4.5 - a.r() * 2, s * 5, 6.5 + a.r() * 2], 0.45, 0.15, { mat: p.piel, k: 0.2 }));
    }
    desgarro(g, cs, [-4.2, 0, -0.5], [-1, 0, -0.2], 3, p, a, false);
    g.masa(cs, { mat: p.piel, suave: 0.9 });
    for (const s of [-1, 1]) g.elip(2.9, s * 2.9, 1.2, 1.1, 0.8, 1.2, { mat: 'gore_quitina', tono: 0.2 });
    return;
  }
  // la cara mira casi a lo largo del eje de vuelta (y): al girar sigue de frente y la calavera se lee en casi todos los cuadros
  const g = g0.sub(0, 0, 0, 70).esc(1.45), H = p.hueso, mand = a.r() < 0.6;
  // la bóveda, la nuca y el arco de las cejas
  cs.push(g.bu([-0.3, 0, 1.4], [4.5, 3.4, 3.5], { mat: H }), g.bu([-2.4, 0, 0.2], [2.4, 3, 3], { mat: H }), g.bu([3, 0, 0.85], [1, 3, 0.85], { mat: H, tono: 0.08, k: 0.5 }));
  // los pómulos y el maxilar, con la fila de dientes
  for (const s of [-1, 1]) cs.push(g.bu([2.8, s * 2.35, -0.9], [1.3, 0.9, 0.9], { mat: H, tono: 0.05, k: 0.5 }), g.hu([0.6, s * 3, -0.6], [2.4, s * 2.5, -0.9], 0.6, 0.55, { mat: H, k: 0.4 }));
  cs.push(g.bu([2.9, 0, -1.9], [1.4, 1.9, 1.1], { mat: H }));
  for (let i = 0; i < 6; i++) { const t = (i / 5 - 0.5) * 2.2; cs.push(g.bu([3.85 - t * t * 0.25, t * 1.25, -2.9], [0.42, 0.34, 0.6], { mat: H, tono: 0.1, k: 0.1 })); }
  // cuencas, la nariz y la boca: huecos negros
  for (const s of [-1, 1]) cs.push(g.bu([3.3, s * 1.4, -0.2], [0.95, 1.15, 1.1], { mat: 'negro', k: 0.15 }));
  cs.push(g.bu([3.95, 0, -1.2], [0.65, 0.55, 0.85], { mat: 'negro', k: 0.15 }));
  if (mand) {
    // la mandíbula floja, caída de un lado
    const cae = 0.6 + a.r() * 0.5, ch: V3 = [3.4 - cae, 0.3, -4.2 - cae];
    for (const s of [-1, 1]) cs.push(g.hu([0.3, s * 2.6, -1.4], [ch[0] - 0.6, s * 1.4 + 0.3, ch[2] + 0.4], 0.65, 0.55, { mat: H, k: 0.3 }));
    cs.push(g.bu(ch, [0.9, 1.5, 0.75], { mat: H, k: 0.3 }), g.bu([ch[0] + 0.1, 0.3, ch[2] + 1.2], [0.6, 1.3, 0.9], { mat: 'negro', k: 0.15 }));
    for (let i = 0; i < 5; i++) { const t = (i / 4 - 0.5) * 2; cs.push(g.bu([ch[0] + 0.4 - t * t * 0.2, t * 1.1 + 0.3, ch[2] + 0.8], [0.36, 0.3, 0.5], { mat: H, tono: 0.08, k: 0.1 })); }
  } else cs.push(g.bu([3.3, 0, -3.1], [0.7, 1.5, 0.4], { mat: p.sangre, k: 0.2 }));
  // lo que le queda: carne y cuero cabelludo de un lado, jirones colgando
  const lado = a.r() < 0.5 ? -1 : 1, vivo = p.nombre === 'rojo';
  const n = vivo ? 7 : 4;
  for (let i = 0; i < n; i++) cs.push(g.bu([r2(a, 2.6) - 0.8, lado * (2.5 + a.r() * 0.9), r2(a, 1.8) + 0.4], [1.8, 0.9, 1.6], { mat: i % 3 === 2 ? p.sangre : vivo ? (i % 2 ? p.piel : p.carne) : p.piel, eje: [a.r() - 0.5, 0, 1], k: 0.4 }));
  for (let i = 0; i < 3; i++) { const q: V3 = [r2(a, 2) - 0.5, lado * 3.1, -0.5 - a.r()]; cs.push(g.hu(q, [q[0] + r2(a, 0.6), lado * 3.4, q[2] - 2 - a.r() * 2], 0.5, 0.2, { mat: vivo ? p.carne : p.piel, k: 0.3 })); }
  if (!vivo) for (let i = 0; i < 4; i++) cs.push(g.bu([r2(a, 3), r2(a, 2.5), 3.2 + a.r() * 1.2], [1, 0.9, 0.5], { mat: p.grasa, k: 0.3 }));
  // la base del cráneo arrancada: carne, la vértebra y hebras de sangre
  desgarro(g, cs, [-1, 0, -2.8], [-0.4, 0, -1], 2.4, p, a);
  hebras(cs, g, [-0.5, 0, -3.4], 2, 3, p, a);
  // una raja en la bóveda
  for (let i = 0; i < 4; i++) cs.push(g.bu([-1.2 + i * 0.9, -lado * (0.4 + i * 0.35), 4.85 - i * 0.12], [0.55, 0.22, 0.25], { mat: 'negro', k: 0.05, eje: [1, -lado * 0.4, -0.1] }));
  g.masa(cs, { mat: H, suave: 0.75 });
  // pelo pegado al cuero cabelludo que queda (el no muerto, unas hebras sucias)
  const pc: Comp[] = [g.bu([-1.8, lado * 2.2, 2.4], [2.6, 1.4, 1.9], { k: 0.4 })];
  for (let i = 0; i < (vivo ? 5 : 3); i++) { const r0: V3 = [-2.5 + a.r() * 2, lado * (2.3 + a.r() * 1.2), 1.5 + a.r() * 2]; pc.push(g.hu(r0, [r0[0] - 1.5 - a.r() * 2, r0[1] + lado * a.r() * 1.5, r0[2] - 2 - a.r() * 3], 0.55, 0.15, { k: 0.3 })); }
  g.masa(pc, { mat: 'gore_pelo', suave: 0.6 });
};
/** Tripas: un lazo de intestino que se enrosca y una víscera oscura. */
const gibTripas: Gib = (g, p, a) => {
  const cs: Comp[] = [];
  // un tramo de intestino que serpentea suelto: rumbo que gira de a poco, con estrangulamientos cada tanto
  let q: V3 = [r2(a, 2), r2(a, 2), 0], rumbo = a.r() * TAU, sube = 0;
  for (let i = 0; i < 22; i++) {
    rumbo += (a.r() < 0.5 ? 1 : -1) * (0.5 + a.r() * 0.6); sube = Math.max(-0.6, Math.min(0.6, sube + r2(a, 0.4)));
    const d = nor3([Math.cos(rumbo), Math.sin(rumbo), sube]), n = add3(q, d, 1.7);
    // que no se aleje del centro
    if (Math.hypot(n[0], n[1]) > 7 || Math.abs(n[2]) > 3.5) { rumbo += Math.PI * 0.8; continue; }
    const r = i % 3 === 0 ? 1 : 1.35 + a.r() * 0.2;
    cs.push(g.hu(q, n, r, i % 3 === 2 ? 1 : 1.35, { mat: p.tripa, k: 0.45 }));
    q = n;
  }
  cs.push(g.bu([r2(a, 1.5), r2(a, 1.5), -1.2], [3.6, 2.6, 1.8], { mat: p.organo, giro: a.r() * 180 }));
  ensangrentar(cs, g, [0, 0, -1], [0, 0, 1], 5, 1.2, p, a);
  hebras(cs, g, [0, 0, -2], 3, 3.5, p, a);
  g.masa(cs, { mat: p.tripa, suave: 0.7 });
};
/**
 * Astillas de hueso: cuatro lanzas largas y quebradas que se cruzan (la silueta en estrella se lee de lejos), con
 * los cortes en bisel, el tuétano oscuro en la boca partida, la cabeza articular de una y sangre.
 */
const gibAstillas: Gib = (g0, p, a) => {
  const g = g0.esc(1.25), cs: Comp[] = [], th0 = a.r() * TAU;
  for (let i = 0; i < 4; i++) {
    const th = th0 + (i / 4) * Math.PI + r2(a, 0.25), d = nor3([Math.cos(th), Math.sin(th), r2(a, 0.45)]), L = 7 + a.r() * 4.5, w = 0.85 + a.r() * 0.35;
    const lat2 = perp([0, 0, 1], d, [1, 0, 0]), o: V3 = add3([r2(a, 1), r2(a, 1), r2(a, 0.6)], d, -L * 0.45);
    // la caña: tres tramos con quiebres, cada vez más finos, que terminan en punta
    let q = o;
    const pts: V3[] = [o];
    for (let j = 1; j <= 3; j++) { q = add3(add3(q, d, L / 3), lat2, r2(a, 0.45)); pts.push(q); }
    for (let j = 0; j < 3; j++) cs.push(g.hu(pts[j], pts[j + 1], w * (1 - j * 0.28), j === 2 ? 0.08 : w * (1 - (j + 1) * 0.28), { mat: p.hueso, k: 0.12, tono: j === 0 ? -0.02 : 0.03 }));
    // una esquirla que se abre de la caña
    if (a.r() < 0.6) { const b = mid3(pts[1], pts[2]); cs.push(g.hu(b, add3(add3(b, d, 2.2), lat2, 1.3 * (a.r() < 0.5 ? -1 : 1)), 0.4, 0.06, { mat: p.hueso, k: 0.1 })); }
    // la boca partida: el tuétano oscuro y la sangre; la primera conserva la cabeza de la articulación
    if (i === 0) cs.push(g.bu(add3(o, d, -0.6), [1.5, 1.35, 1.25], { mat: p.hueso, eje: d, k: 0.3, tono: 0.04 }));
    else { cs.push(g.bu(add3(o, d, -0.15), [0.3, w * 0.65, w * 0.65], { mat: p.organo, eje: d, k: 0.1, tono: -0.1 })); if (a.r() < 0.6) cs.push(g.bu(add3(o, d, 0.6), [0.9, w * 0.8, w * 0.75], { mat: p.sangre, eje: d, k: 0.2 })); }
  }
  // un grumo de carne con sangre donde se juntan
  cs.push(g.bu([r2(a, 0.5), r2(a, 0.5), 0], [1.2, 1, 0.8], { mat: p.carne, k: 0.3 }), g.bu([0.4, 0.2, 0.3], [0.8, 0.7, 0.6], { mat: p.sangre, k: 0.3 }));
  g.masa(cs, { mat: p.hueso, suave: 0.3 });
};
/** Trozo de carne suelto: músculo, una tira de piel, grasa y una esquirla. */
const gibTrozo: Gib = (g, p, a) => {
  const cs: Comp[] = [];
  for (let i = 0; i < 6; i++) cs.push(g.bu([r2(a, 2.2), r2(a, 2.2), r2(a, 1.4)], [1.6 + a.r() * 1.4, 1.4 + a.r(), 1.2 + a.r()], { mat: i < 4 ? p.carne : p.sangre, giro: a.r() * 180 }));
  cs.push(g.bu([0, 0, 1.8], [3, 2.4, 0.8], { mat: p.piel, giro: a.r() * 180 }), g.bu([1, 0.5, 1.1], [2, 1.6, 0.6], { mat: p.grasa }));
  cs.push(g.hu([r2(a, 1), r2(a, 1), 0], [r2(a, 1) + 3, r2(a, 1), r2(a, 1)], 0.6, 0.2, { mat: p.hueso, k: 0.3 }));
  ensangrentar(cs, g, [0, 0, -0.5], [0, 0, 1], 3, 2.4, p, a);
  g.masa(cs, { mat: p.carne, suave: 1 });
};
export const GIBS: Record<string, [Gib, [string, string]]> = {
  torso: [gibTorso, ['Pedazo de torso', 'Torso chunk']], brazo: [gibBrazo, ['Brazo arrancado', 'Torn arm']], pierna: [gibPierna, ['Pierna arrancada', 'Torn leg']],
  costillas: [gibCostillas, ['Costillar', 'Ribcage chunk']], craneo: [gibCraneo, ['Cráneo', 'Skull']], tripas: [gibTripas, ['Tripas', 'Entrails']],
  astillas: [gibAstillas, ['Astillas de hueso', 'Bone shards']], trozo: [gibTrozo, ['Trozo de carne', 'Meat chunk']],
};
/** Grupo girado: el pedazo da vueltas alrededor de su eje propio (`f` × 45°). */
function girado(g: G, a: Arma, f: number): G {
  const eje = nor3([r2(a, 1), 0.6 + a.r() * 0.4, r2(a, 0.5)]), ang = (f / 8) * TAU + a.r() * 0.6;
  return new G(a, g.ps, [rotar([1, 0, 0], eje, ang), rotar([0, 1, 0], eje, ang), rotar([0, 0, 1], eje, ang)], [0, 0, 0]);
}
for (const [k, [fn, nombre]] of Object.entries(GIBS)) reg({
  id: `gore_gib_${k}`, nombre, variantes: [...NOMBRES_PALETA], cuadros: 8, t: 2, plano: true, sinCorte: true,
  armar: (v, f, g, a) => { fn(girado(g, a, f), paletaDe(v), a); },
});

// ------------------------------------------------------------------ el reventón
/**
 * El estallido de un cuerpo (centro a 22 de alto, la altura del pecho de un monstruo mediano): 0 se hincha y se
 * raja, 1 revienta en una nube de sangre, 2..9 vuelan pedazos y gotas (estiradas por la velocidad, unidas en hilos
 * cuando van cerca) que caen y salpican el piso.
 */
function reventon(g: G, p: Paleta, f: number, a: Arma) {
  const C: V3 = [0, 0, 22], t = f / 9, gr = 62;
  if (f === 0) {
    const cs: Comp[] = [g.bu(C, [9.5, 9.5, 10.5], { mat: p.piel })];
    for (let i = 0; i < 9; i++) { const d = nor3([r2(a, 1), r2(a, 1), r2(a, 1)]); cs.push(g.bu(add3(C, d, 7.5 + a.r() * 2), [3 + a.r() * 2, 3, 2.4], { mat: a.r() < 0.5 ? p.piel : p.carne, eje: d })); }
    for (let i = 0; i < 6; i++) { const d = nor3([r2(a, 1), r2(a, 1), r2(a, 0.8)]); cs.push(g.hu(add3(C, d, 8), add3(add3(C, d, 10.6), [r2(a, 3), r2(a, 3), r2(a, 3)]), 0.9, 0.5, { mat: p.sangre, k: 0.4 })); }
    g.masa(cs, { mat: p.piel, suave: 2.2 });
    return;
  }
  const gotas: Comp[] = [];
  // nube del golpe (cuadros 1 a 3): se abre y se deshace
  if (f <= 3) {
    const k = f === 1 ? 1 : f === 2 ? 0.6 : 0.3;
    for (let i = 0; i < 16; i++) { const d = nor3([r2(a, 1), r2(a, 1), r2(a, 0.9) + 0.2]); gotas.push(g.bu(add3(C, d, (4 + a.r() * 7) * (0.6 + f * 0.7)), [5 * k + a.r() * 3 * k, 3.4 * k + 0.6, 3.4 * k + 0.6], { eje: d })); }
  } else for (let i = 0; i < 16 * 5; i++) a.r();
  // chorros: cada uno es una tira de gotas con la misma dirección y velocidades distintas, que a medida que vuela se
  // estira en un hilo y se corta en gotas (la unión suave las deja pegadas mientras van cerca)
  const gota = (d: V3, vel: number, r0: number) => {
    const tt = t * 0.95 + 0.05, v: V3 = [d[0] * vel, d[1] * vel, d[2] * vel - gr * tt];
    const z = C[2] + d[2] * vel * tt - 0.5 * gr * tt * tt;
    if (z <= 0.4) {
      // cayó: mancha chata en el piso, corrida hacia donde iba
      const tc = (d[2] * vel + Math.sqrt(Math.max(0, (d[2] * vel) ** 2 + 2 * gr * C[2]))) / gr, q: V3 = [C[0] + d[0] * vel * tc, C[1] + d[1] * vel * tc, 0.1];
      gotas.push(g.bu(q, [r0 * 2.4, r0 * 1.5, 0.45], { eje: [d[0], d[1], 0.0001] }));
      return;
    }
    const q: V3 = [C[0] + d[0] * vel * tt, C[1] + d[1] * vel * tt, z], est = 1 + Math.min(1.6, Math.hypot(...v) * 0.02);
    gotas.push(g.bu(q, [r0 * est, r0, r0], { eje: v }));
  };
  for (let j = 0; j < 11; j++) {
    const d = nor3([r2(a, 1), r2(a, 1), r2(a, 0.6) + 0.45]), vmax = 34 + a.r() * 40, grueso = 0.6 + a.r() * 1;
    for (let i = 0; i < 9; i++) { const k = 1 - i / 9; gota(nor3(add3(d, [r2(a, 0.04), r2(a, 0.04), r2(a, 0.04)])), vmax * (0.45 + 0.55 * k), grueso * (0.55 + 0.6 * (1 - Math.abs(k - 0.7))) * (0.8 + a.r() * 0.4)); }
  }
  // goterones sueltos y la llovizna fina
  for (let i = 0; i < 8; i++) gota(nor3([r2(a, 1), r2(a, 1), r2(a, 0.5) + 0.5]), 18 + a.r() * 26, 1.6 + a.r() * 1.2);
  for (let i = 0; i < 30; i++) gota(nor3([r2(a, 1), r2(a, 1), r2(a, 0.8) + 0.2]), 30 + a.r() * 50, 0.4 + a.r() * 0.35);
  g.masa(gotas, { mat: p.sangre, suave: 1.6 });
  // pedazos: salen más lentos y dan vueltas
  const piezas = [gibTrozo, gibTrozo, gibAstillas, gibTripas, gibTrozo, p.nombre === 'bestia' ? gibCraneo : gibCostillas, gibTrozo, gibAstillas];
  piezas.forEach((fn, i) => {
    const d = nor3([r2(a, 1), r2(a, 1), r2(a, 0.6) + 0.45]), vel = 18 + a.r() * 22, eje = nor3([r2(a, 1), r2(a, 1), r2(a, 1)]), vr = 6 + a.r() * 8;
    const tt = t * 0.9;
    const q: V3 = [C[0] + d[0] * vel * tt, C[1] + d[1] * vel * tt, Math.max(2.4, C[2] + d[2] * vel * tt - 0.5 * gr * tt * tt)];
    const k = i === 5 ? 0.85 : 0.8 + a.r() * 0.35, ang = tt * vr;
    const sg = new G(a, g.ps, [rotar([k, 0, 0], eje, ang), rotar([0, k, 0], eje, ang), rotar([0, 0, k], eje, ang)], q);
    fn(sg, p, a);
  });
}
reg({ id: 'gore_reventon', nombre: ['Reventón', 'Gore burst'], variantes: [...NOMBRES_PALETA], cuadros: 10, t: 2, huella: [3, 3], plano: true, armar: (v, f, g, a) => { reventon(g, paletaDe(v), f, a); } });

// ================================================================== cadáveres con pose (para horror.ts)
/**
 * Pose de un cuerpo de pie mirando +x (grados). Brazos: `alza` 0 colgando, 90 hacia adelante, 180 arriba; `abre`
 * hacia el costado. `codo` y `rodilla` doblan. Piernas: `adelante` levanta el muslo. `columna` dobla el torso hacia
 * adelante y `cabeza` = [hacia adelante, ladeo].
 */
export interface Pose {
  brazos: [[number, number, number], [number, number, number]];
  piernas: [[number, number, number], [number, number, number]];
  columna?: number; cabeza?: [number, number];
}
export const POSES: Record<string, Pose> = {
  colgando: { brazos: [[8, 12, 15], [5, 8, 10]], piernas: [[6, 4, 12], [2, 3, 18]], columna: 8, cabeza: [35, 12] },
  munecas: { brazos: [[172, 18, 5], [172, 18, 8]], piernas: [[4, 3, 10], [-3, 4, 20]], columna: -4, cabeza: [42, -10] },
  cruz: { brazos: [[90, 88, 4], [90, 88, 4]], piernas: [[0, 2, 4], [0, 2, 4]], columna: 0, cabeza: [-30, 15] },
  sentado: { brazos: [[22, 18, 60], [12, 26, 40]], piernas: [[85, 14, 95], [70, 20, 70]], columna: 28, cabeza: [45, 20] },
  tirado: { brazos: [[40, 60, 30], [150, 35, 50]], piernas: [[10, 12, 15], [35, 8, 50]], columna: 5, cabeza: [-15, 30] },
};
export interface Juntas { pelvis: V3; pecho: V3; cuello: V3; cabeza: V3; arriba: V3; adelante: V3; hombros: [V3, V3]; codos: [V3, V3]; manos: [V3, V3]; caderas: [V3, V3]; rodillas: [V3, V3]; tobillos: [V3, V3]; pies: [V3, V3] }
const R = Math.PI / 180;
export function juntas(p: Pose): Juntas {
  const c = (p.columna ?? 0) * R, up: V3 = [Math.sin(c), 0, Math.cos(c)], fw: V3 = [Math.cos(c), 0, -Math.sin(c)];
  const pelvis: V3 = [0, 0, 32], pecho = add3(pelvis, up, 12), cuello = add3(pelvis, up, 20);
  const [ha, hl] = p.cabeza ?? [0, 0];
  const hd = nor3([Math.sin(c + ha * R), Math.sin(hl * R), Math.cos(c + ha * R)]), cabeza = add3(cuello, hd, 4.4);
  const out = { pelvis, pecho, cuello, cabeza, arriba: hd, adelante: fw } as Juntas;
  out.hombros = [0, 0] as never; out.codos = [0, 0] as never; out.manos = [0, 0] as never; out.caderas = [0, 0] as never; out.rodillas = [0, 0] as never; out.tobillos = [0, 0] as never; out.pies = [0, 0] as never;
  [1, -1].forEach((s, i) => {
    const [al, ab, co] = p.brazos[i].map((x) => x * R), hom = add3(add3(cuello, up, -2.2), [0, s * 6.2, 0]);
    const d = nor3([Math.sin(al) * Math.cos(ab), s * Math.sin(ab), -Math.cos(al) * Math.cos(ab)]), codo = add3(hom, d, 11);
    const fp = perp([1, 0, 0.2], d, [0, 0, 1]), ante = nor3(add3(mul3(d, Math.cos(co)), fp, Math.sin(co)));
    out.hombros[i] = hom; out.codos[i] = codo; out.manos[i] = add3(codo, ante, 10);
    const [pa, pb, ro] = p.piernas[i].map((x) => x * R), cad = add3(pelvis, [0, s * 3.4, -1]);
    const dl = nor3([Math.sin(pa) * Math.cos(pb), s * Math.sin(pb), -Math.cos(pa) * Math.cos(pb)]), rod = add3(cad, dl, 15);
    const bp = perp([-1, 0, 0], dl, [0, 0, -1]), canilla = nor3(add3(mul3(dl, Math.cos(ro)), bp, Math.sin(ro))), tob = add3(rod, canilla, 14);
    out.caderas[i] = cad; out.rodillas[i] = rod; out.tobillos[i] = tob; out.pies[i] = add3(tob, perp([1, 0, 0], canilla, [0, 0, 1]), 4.2);
  });
  return out;
}
export interface OpcCuerpo {
  piel?: string; flaco?: number;
  /** herida abierta en el vientre (con las costillas y las tripas que cuelgan hacia `abajo`) */
  abierto?: boolean;
  /** hacia dónde cae lo que cuelga, en las coordenadas del grupo */
  abajo?: V3;
  sinCabeza?: boolean; sinBrazo?: 0 | 1; trapo?: string | null; heridas?: number;
  /** la cabeza: con mechones de pelo o pelada con el cráneo a la vista (por omisión, al azar) */
  cabeza?: 'pelo' | 'craneo';
}
/** Bulto con sus ejes dados en las coordenadas del grupo: `ex` (radio x) y `ey` (se endereza contra `ex`). */
function bx(g: G, c: V3, r: V3, ex: V3, ey: V3, o: { mat?: string; tono?: number; k?: number } = {}): Comp {
  const s = Math.hypot(...g.D([1, 0, 0])), X = nor3(ex), Y = perp(ey, X, Math.abs(X[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]), Z = cruz3(X, Y);
  const w = (v: V3) => nor3(g.D(v));
  return bulto(g.P(...c), [r[0] * s, r[1] * s, r[2] * s], { ...o, ejes: [w(X), w(Y), w(Z)] });
}
/** Hacia la cámara en las coordenadas del grupo (para que las heridas caigan del lado que se ve). */
const camaraEn = (g: G): V3 => nor3([0, 1, 2].map((i) => dot3(g.m[i], HACIA_CAMARA)) as V3);

/**
 * Un cadáver en una pose, que se lea como un muerto y no como un maniquí: piel lívida y marmolada (la sangre bajada a
 * los pies del colgado o a la cara del que cuelga cabeza abajo), costillas, clavículas y tendones que se marcan (más en
 * el flaco), rodillas y codos huesudos, manos con dedos que se encogen, la cabeza con cuencas hundidas, pómulos, la
 * mandíbula caída y mechones de pelo que cuelgan (o pelada, con el cráneo a la vista), trapos rotos en jirones, tajos
 * con la sangre que se corrió pegada a la piel y, si `abierto`, el vientre abierto con las costillas y las tripas.
 * Devuelve las juntas (en las coordenadas del grupo).
 */
export function cuerpo(g: G, pose: Pose, o: OpcCuerpo = {}): Juntas {
  const a = g.a, J = juntas(pose), piel = o.piel ?? 'gore_piel_cadaver', k = o.flaco ?? 1, cs: Comp[] = [], abajo = nor3(o.abajo ?? [0, 0, -1]);
  const up = nor3(sub3(J.cuello, J.pelvis)), fw = J.adelante, hd = J.arriba, lat: V3 = [0, 1, 0], cam = camaraEn(g);
  const quemado = piel === 'gore_piel_quemada';
  // cuánto se marca el hueso: algo en todos (días colgado, hambre) y mucho en el flaco
  const hueso = Math.max(0.45, Math.min(1, (1.08 - k) / 0.3));
  // lividez: la sangre bajó a lo más bajo según cómo quedó el cuerpo
  const lividable = piel === 'gore_piel_cadaver' || piel === 'gore_piel_muerta';
  const livida = lividable ? 'gore_piel_livida' : piel;
  const haciaPies = nor3(sub3(mid3(J.tobillos[0], J.tobillos[1]), J.pelvis));
  const livPies = lividable && dot3(haciaPies, abajo) > 0.45, livCara = lividable && dot3(up, abajo) < -0.45;
  const mPies = livPies ? livida : piel, mCara = livCara ? livida : piel;

  // ---- tronco: la pelvis, el vientre hundido, el pecho angosto y las nalgas
  const Cp = add3(J.pecho, up, 1.5), Ry = 6.2 * k, Rz = 3.6 * k;
  cs.push(g.bu(J.pelvis, [4 * k, 5.2 * k, 3.4 * k], { eje: up }), g.hu(J.pelvis, J.pecho, 3.8 * k, 4.5 * k));
  cs.push(g.bu(Cp, [5.6, Ry, Rz], { eje: up }), g.bu(add3(add3(J.pelvis, up, 4.6), fw, -0.5 - hueso * 0.3), [4.2, 4.4 * k, 2.8 * k], { eje: up }));
  for (const s of [-1, 1]) cs.push(g.bu(add3(add3(J.pelvis, fw, -2.2), lat, s * 2.4), [2.8, 2.6, 3], { eje: up }));
  // costillas: arcos que bajan del costado hacia el esternón, apenas por fuera de la piel (se leen las hendiduras)
  for (let i = 0; i < 5; i++) {
    const hc = 3 - i * 1.45, rr = 0.45 + 0.22 * hueso, sale = 0.96 + 0.05 * hueso;
    /** punto del arco: `th` desde el costado hacia el esternón, `dz` corre la altura (para el surco de abajo) */
    const P = (th: number, dz: number, f: number, j: number): V3 => {
      const h = hc + dz - j * (0.9 + i * 0.15), e = Math.sqrt(Math.max(0.2, 1 - (h / 5.8) ** 2));
      return add3(add3(add3(Cp, up, h), lat, Math.cos(th) * Ry * e * f), fw, Math.sin(th) * Rz * e * f);
    };
    for (const s of [-1, 1]) {
      for (let j = 0; j < 4; j++) {
        const t0 = -0.32 * Math.PI + (j / 4) * 0.74 * Math.PI, t1 = t0 + 0.185 * Math.PI, m = (q: V3): V3 => [q[0], q[1] * s, q[2]];
        // la costilla (un poco por fuera, más clara) y el surco de abajo (pegado a la piel, más oscuro)
        const a0 = P(t0, 0, sale, j / 4), a1 = P(t1, 0, sale, (j + 1) / 4);
        cs.push(g.hu(s > 0 ? a0 : m(a0), s > 0 ? a1 : m(a1), rr, rr * (j === 3 ? 0.8 : 1), { k: 0.3, tono: 0.07 }));
        const b0 = P(t0, -0.72, 0.965, j / 4), b1 = P(t1, -0.72, 0.965, (j + 1) / 4);
        if (i < 4) cs.push(g.hu(s > 0 ? b0 : m(b0), s > 0 ? b1 : m(b1), 0.38, 0.32, { k: 0.15, tono: -0.1 }));
      }
    }
  }
  // esternón, clavículas y las crestas de la cadera
  cs.push(g.hu(add3(add3(Cp, up, 3.2), fw, Rz * 0.92), add3(add3(Cp, up, -1.8), fw, Rz * 0.97), 0.55, 0.45, { k: 0.4, tono: 0.04 }));
  [0, 1].forEach((i) => {
    const s = i ? -1 : 1;
    cs.push(g.hu(add3(add3(add3(J.cuello, up, -2.6), fw, 1.7), lat, s * 0.9), add3(add3(J.hombros[i], fw, 0.6), up, 0.5), 0.62, 0.55, { k: 0.35, tono: 0.06 }));
    if (hueso > 0.6) cs.push(g.bu(add3(add3(add3(J.pelvis, lat, s * 3.6 * k), fw, 1.2), up, 1.8), [1.7, 0.75, 0.7], { eje: nor3(add3(fw, up, 0.7)), k: 0.4, tono: 0.05 }));
  });

  // ---- cuello y cabeza
  const pelado = quemado || (o.cabeza ? o.cabeza === 'craneo' : a.r() < 0.4);
  let boca: V3 | null = null;
  const lt = perp(lat, hd, lat), fr = cruz3(lt, hd), C = J.cabeza;
  /** punto de la cabeza: x hacia la cara, y al costado, z hacia la coronilla */
  const H = (x: number, y: number, z: number): V3 => add3(add3(add3(C, fr, x), lt, y), hd, z);
  if (!o.sinCabeza) {
    cs.push(g.hu(add3(J.cuello, up, -1), H(-0.7, 0, -2.4), 1.55 * Math.max(0.85, k), 1.35));
    // los tendones del cuello: de detrás de la oreja al hueco del esternón
    for (const s of [-1, 1]) cs.push(g.hu(H(-0.5, s * 1.65, -1.3), add3(add3(add3(J.cuello, up, -2.1), fw, 1.4), lat, s * 0.65), 0.5, 0.42, { k: 0.3, tono: 0.04 }));
    // el cráneo, la frente, los pómulos (las mejillas hundidas quedan solas), la nariz y el maxilar
    cs.push(bx(g, H(-0.5, 0, 0.8), [3.15, 2.65, 2.95], fr, lt));
    cs.push(bx(g, H(2.05, 0, 0.95), [0.9, 2.2, 0.75], fr, lt, { k: 0.5, tono: 0.05, mat: mCara }));
    for (const s of [-1, 1]) cs.push(bx(g, H(1.85, s * 1.65, -0.55), [0.9, 0.7, 0.72], fr, lt, { k: 0.4, tono: 0.06, mat: mCara }));
    cs.push(g.hu(H(2.75, 0, 0.35), H(3.3, 0, -0.75), 0.4, 0.55, { k: 0.3, mat: mCara }));
    cs.push(bx(g, H(1.95, 0, -1.55), [1, 1.45, 0.75], fr, lt, { k: 0.5, mat: mCara }));
    // la mandíbula caída: gira en la bisagra de la oreja
    const ab = (16 + a.r() * 24) * R, jx = 2.6 * Math.cos(ab) - 1.5 * Math.sin(ab), jz = -2.6 * Math.sin(ab) - 1.5 * Math.cos(ab);
    const ch = H(-0.2 + jx, 0, -1.25 + jz);
    for (const s of [-1, 1]) cs.push(g.hu(H(-0.3, s * 1.8, -1.2), H(-0.2 + jx * 0.82, s * 1.0, -1.25 + jz * 0.82), 0.62, 0.52, { k: 0.35, mat: mCara }));
    cs.push(bx(g, ch, [0.75, 1.1, 0.68], fr, lt, { k: 0.4, tono: 0.04, mat: mCara }));
    // la boca abierta (un hueco oscuro entre el maxilar y el mentón) con la fila de dientes de arriba
    const abre = Math.sin(ab);
    boca = H(2.15 + jx * 0.04, 0, -2.15 - abre * 0.9);
    cs.push(bx(g, boca, [0.65, 0.95, 0.35 + abre * 0.85], fr, lt, { mat: 'negro', k: 0.15 }));
    for (const y of [-0.66, -0.22, 0.22, 0.66]) cs.push(bx(g, H(2.38, y, -1.95), [0.26, 0.2, 0.3], fr, lt, { mat: 'gore_hueso_viejo', k: 0.08 }));
    // cuencas hundidas: el ojo se fue, queda el hueco con el borde amoratado
    for (const s of [-1, 1]) {
      cs.push(bx(g, H(1.65, s * 1.12, 0.2), [0.9, 0.95, 0.85], fr, lt, { mat: livida, k: 0.3, tono: -0.05 }));
      cs.push(bx(g, H(2.2, s * 1.12, 0.15), [0.62, 0.66, 0.6], fr, lt, { mat: 'negro', k: 0.15 }));
    }
    if (pelado) {
      // la coronilla pelada: el hueso asoma entre la piel desgarrada
      cs.push(bx(g, H(-0.3, 0.3, 2.5), [1.9, 1.6, 0.9], fr, lt, { mat: 'gore_hueso_viejo', k: 0.4 }));
      for (let i = 0; i < 7; i++) { const t = (i / 7) * TAU; cs.push(bx(g, H(-0.3 + Math.cos(t) * 1.9, 0.3 + Math.sin(t) * 1.6, 2.2), [0.6, 0.5, 0.45], fr, lt, { mat: a.r() < 0.5 ? 'gore_carne_podrida' : 'gore_sangre_oscura', k: 0.25 })); }
    }
  } else desgarro(g, cs, add3(J.cuello, up, 0.5), up, 2.6, PALETAS.rojo, a);

  // ---- brazos y manos
  [0, 1].forEach((i) => {
    if (o.sinBrazo === i) { desgarro(g, cs, J.hombros[i], nor3(sub3(J.hombros[i], J.pecho)), 2.4, PALETAS.rojo, a); return; }
    const s = i ? -1 : 1, hom = J.hombros[i], codo = J.codos[i], mano = J.manos[i], dm = nor3(sub3(mano, codo)), dh = nor3(sub3(codo, hom));
    cs.push(g.bu(add3(hom, up, -0.5), [2 * k, 1.9 * k, 1.9 * k]), g.hu(add3(add3(J.cuello, up, -0.8), lat, s * 1.2), add3(hom, up, 0.3), 1.4 * k, 1.2 * k), g.hu(hom, codo, 1.85 * k, 1.25 * k), g.hu(codo, mano, 1.35 * k, 0.88 * k));
    cs.push(g.bu(add3(hom, dh, 4), [3.6, 1.65 * k, 1.6 * k], { eje: dh }), g.bu(add3(codo, dh, 0.2), [1.05, 1, 1], { k: 0.4, tono: 0.05 }));
    // los tendones del antebrazo que llegan a la muñeca
    const pa = perp(fw, dm, lat), ld = perp([0, s, 0], dm, fw);
    for (const q of [-0.45, 0.45]) cs.push(g.hu(add3(add3(add3(codo, dm, 3.5), pa, 1.05 * k), ld, q), add3(add3(add3(mano, dm, -0.4), pa, 0.75), ld, q * 0.7), 0.38, 0.3, { k: 0.3, tono: 0.04 }));
    // la mano: palma, cuatro dedos que se encogen en dos falanges y el pulgar (amoratada)
    const pal = cruz3(dm, ld);
    cs.push(bx(g, add3(mano, dm, 1.2), [1.55, 1.3, 0.62], dm, ld, { mat: livida, k: 0.5 }));
    for (let d = 0; d < 4; d++) {
      const c1 = 0.3 + a.r() * 0.55, L1 = 1.4 - Math.abs(d - 1.5) * 0.18;
      const b0 = add3(add3(mano, dm, 2.45), ld, (d - 1.5) * 0.62);
      const d1 = nor3(add3(mul3(dm, Math.cos(c1)), pal, Math.sin(c1))), d2 = nor3(add3(mul3(dm, Math.cos(c1 * 2.3)), pal, Math.sin(c1 * 2.3)));
      const b1 = add3(b0, d1, L1), b2 = add3(b1, d2, L1 * 0.8);
      cs.push(g.hu(b0, b1, 0.42, 0.36, { mat: livida, k: 0.12 }), g.hu(b1, b2, 0.36, 0.27, { mat: livida, k: 0.1 }));
    }
    const t0 = add3(add3(mano, dm, 0.9), ld, 1.15), t1 = add3(t0, nor3(add3(add3(dm, ld, 0.8), pal, 0.4)), 1.3);
    cs.push(g.hu(t0, t1, 0.45, 0.38, { mat: livida, k: 0.15 }), g.hu(t1, add3(t1, nor3(add3(dm, pal, 0.7)), 1), 0.38, 0.28, { mat: livida, k: 0.1 }));
  });

  // ---- piernas y pies (la sangre bajada amorata pantorrillas y pies del que quedó de pie)
  [0, 1].forEach((i) => {
    const s = i ? -1 : 1, cad = J.caderas[i], rod = J.rodillas[i], tob = J.tobillos[i], pie = J.pies[i], dc = nor3(sub3(tob, rod)), dmu = nor3(sub3(rod, cad)), dp = nor3(sub3(pie, tob));
    cs.push(g.hu(cad, rod, 3.15 * k, 1.85 * k), g.bu(add3(cad, dmu, 5.5), [5.5, 2.55 * k, 2.6 * k], { eje: dmu }));
    cs.push(g.bu(add3(rod, perp(fw, dmu, fw), 0.9 * k + 0.3), [1.25, 1.2, 1.1], { k: 0.4, tono: 0.05 }));
    const m = add3(rod, dc, 6.5);
    cs.push(g.hu(rod, m, 1.9 * k, 1.45 * k), g.hu(m, tob, 1.45 * k, 1 * k, { mat: mPies }), g.bu(add3(add3(rod, dc, 4.2), perp(fw, dc, fw), -0.6), [3.6, 1.7 * k, 1.8 * k], { eje: dc, mat: mPies }));
    for (const q of [-1, 1]) cs.push(g.bu(add3(tob, lat, q * 0.85), [0.6, 0.55, 0.6], { mat: mPies, k: 0.3, tono: 0.04 }));
    cs.push(g.hu(tob, pie, 1.3, 1.05, { mat: mPies }), bx(g, add3(tob, sub3(pie, tob), 0.45), [2.4, 1.35, 0.95], dp, lat, { mat: mPies }));
    for (let d = 0; d < 4; d++) { const b0 = add3(add3(pie, dp, 0.6), lat, s * (d - 1.2) * 0.5); cs.push(g.hu(b0, add3(b0, dp, 0.9 - d * 0.1), 0.38 - d * 0.03, 0.3, { mat: mPies, k: 0.15 })); }
  });

  // ---- moretones, mugre y sangre seca: casquetes que asoman de cada tramo (tiñen sin hacer granos)
  type Tramo = [V3, V3, number, number];
  const tramos: Tramo[] = [[J.pelvis, add3(J.pecho, up, 2), 5.6 * k, 3.4 * k], [J.caderas[0], J.rodillas[0], 2.7 * k, 2.7 * k], [J.caderas[1], J.rodillas[1], 2.7 * k, 2.7 * k], [J.rodillas[0], J.tobillos[0], 1.6 * k, 1.6 * k], [J.rodillas[1], J.tobillos[1], 1.6 * k, 1.6 * k], [J.hombros[0], J.codos[0], 1.7 * k, 1.7 * k], [J.hombros[1], J.codos[1], 1.7 * k, 1.7 * k], [J.codos[0], J.manos[0], 1.2 * k, 1.2 * k], [J.codos[1], J.manos[1], 1.2 * k, 1.2 * k]];
  /** radio del tramo en la dirección `u` (el tronco es más ancho que hondo) */
  const radio = (T: Tramo, u: V3) => { const y = dot3(u, lat) / T[2], z = dot3(u, fw) / T[3], x = 1 - dot3(u, lat) ** 2 - dot3(u, fw) ** 2; return 1 / Math.sqrt(y * y + z * z + Math.max(0, x) / (T[3] * T[3])); };
  const MANCHAS = ['gore_moreton', 'gore_moreton', 'gore_mugre', 'gore_mugre', 'gore_sangre_oscura', 'gore_sangre_oscura', 'gore_sangre_oscura', livida, lividable ? 'gore_piel_podre' : livida, livida];
  for (let i = 0; i < 22; i++) {
    const T = tramos[i < 5 ? 0 : Math.floor(a.r() * tramos.length)], t = a.r(), th = a.r() * TAU, d = nor3(sub3(T[1], T[0]));
    const u = perp([Math.cos(th), Math.sin(th), r2(a, 1)], d, [0, 0, 1]), R0 = radio(T, u), r = Math.min(R0 * 0.75, 0.8 + a.r() * 1.4);
    cs.push(g.bu(add3(mid3(T[0], T[1], t), u, R0 - r + 0.3), [r * 1.6, r, r], { mat: MANCHAS[i % MANCHAS.length], eje: d, k: 0.3 }));
  }
  // ---- tajos que sangran: labios de carne, el fondo oscuro y la sangre que se corre pegada a la piel hacia abajo
  const nh = o.heridas ?? 3;
  for (let i = 0; i < nh; i++) {
    const T = tramos[i % 3 === 0 ? 0 : Math.floor(a.r() * tramos.length)], d = nor3(sub3(T[1], T[0]));
    // del lado que mira a la cámara (si no, nadie la ve)
    let u = perp(add3(cam, [r2(a, 0.8), r2(a, 0.8), r2(a, 0.8)]), d, fw), t = 0.25 + a.r() * 0.55;
    const S = (tt: number, uu: V3, h = 0) => add3(mid3(T[0], T[1], tt), uu, radio(T, uu) + h);
    const cruza = nor3(cruz3(u, d)), tj = nor3(add3(cruza, d, r2(a, 0.6)));
    cs.push(bx(g, S(t, u, -0.15), [1.7, 0.6, 0.45], tj, cruz3(u, tj), { mat: 'gore_carne', k: 0.25 }), bx(g, S(t, u, 0.05), [1.3, 0.22, 0.3], tj, cruz3(u, tj), { mat: 'gore_organo', k: 0.1, tono: -0.1 }));
    // la sangre baja: a lo largo del tramo y gira alrededor hacia el lado de abajo
    const sg = Math.sign(dot3(abajo, d)) || 1, bajo = perp(abajo, d, u), fresca = a.r() < 0.6 ? 'gore_sangre' : 'gore_sangre_oscura';
    for (let j = 0; j < 9; j++) {
      t += sg * (0.035 + Math.abs(dot3(abajo, d)) * 0.03); u = nor3(add3(u, bajo, 0.12));
      if (t < 0.02 || t > 0.98) break;
      const rr = 0.62 - j * 0.035;
      cs.push(g.bu(S(t, u, -rr * 0.55), [rr * 1.4, rr, rr], { mat: fresca, eje: d, k: 0.2 }));
    }
  }
  // la sangre que salió por la boca y la nariz
  if (boca && !quemado) for (let j = 0; j < 4; j++) cs.push(g.bu(add3(add3(boca, abajo, 0.7 + j * 0.65), fr, 0.55 - j * 0.1), [0.55, 0.5 - j * 0.05, 0.4], { mat: 'gore_sangre_oscura', k: 0.2 }));
  g.masa(cs, { mat: piel, suave: 1.3 });

  // ---- el pelo: un casquete sucio y mechones que caen hacia abajo
  if (!o.sinCabeza && !quemado) {
    const pc: Comp[] = [];
    if (!pelado) pc.push(bx(g, H(-0.95, 0, 1.25), [3.05, 2.85, 2.65], fr, lt));
    const nm = pelado ? 3 : 10;
    for (let i = 0; i < nm; i++) {
      const ph = (0.42 + (i / Math.max(1, nm - 1)) * 1.16) * Math.PI + r2(a, 0.12), raiz = H(-0.6 + Math.cos(ph) * 2.6, Math.sin(ph) * 2.55, 0.9 + a.r() * 1.1);
      const sale = nor3(sub3(raiz, H(0, 0, 0.5))), L = (pelado ? 2 : 4) + a.r() * (pelado ? 2 : 6);
      const dir = nor3(add3(abajo, sale, 0.45)), m1 = add3(add3(raiz, dir, L * 0.5), [r2(a, 0.5), r2(a, 0.5), r2(a, 0.5)]), m2 = add3(add3(m1, nor3(add3(abajo, sale, 0.15)), L * 0.5), [r2(a, 0.6), r2(a, 0.6), 0]);
      pc.push(g.hu(raiz, m1, 0.7, 0.42, { k: 0.4 }), g.hu(m1, m2, 0.42, 0.18, { k: 0.3 }));
    }
    g.masa(pc, { mat: 'gore_pelo', suave: 0.9 });
  }

  // ---- trapos rotos: la faja en la cintura con jirones que cuelgan, manchas de sangre y mugre, y a veces un harapo de camisa
  if (o.trapo !== null) {
    const tc: Comp[] = [], tm = o.trapo ?? 'gore_trapo', Tc: Tramo = [J.pelvis, J.pecho, 5.3 * k + 0.35, 3.6 * k + 0.35];
    const cae = nor3(add3(mul3(up, -0.5), abajo, 0.7));
    for (let j = 0; j < 10; j++) {
      const th = (j / 10) * TAU, u = nor3(add3(mul3(lat, Math.cos(th)), fw, Math.sin(th))), R0 = radio(Tc, u), tg = cruz3(up, u);
      tc.push(bx(g, add3(add3(J.pelvis, up, 0.9), u, R0), [1.9, 1.5, 0.55], tg, up, { k: 0.4 }));
      // jirones: más largos adelante y atrás, cortados desparejos
      if (a.r() < 0.75) {
        const L = 3 + a.r() * (2 + 6 * Math.abs(Math.sin(th))), w = 0.9 + a.r() * 0.8, base = add3(add3(J.pelvis, up, -0.2), u, R0 + 0.15);
        const d1 = nor3(add3(cae, u, 0.25)), p1 = add3(base, d1, L * 0.3), p2 = add3(add3(base, d1, L * 0.78), u, 0.3);
        tc.push(bx(g, p1, [L * 0.32 + 0.4, w, 0.32], d1, tg, { k: 0.3 }), bx(g, p2, [L * 0.24 + 0.2, w * 0.6, 0.28], d1, tg, { k: 0.25, tono: -0.03 }));
      }
    }
    // sangre y mugre que empaparon la tela
    for (let j = 0; j < 5; j++) { const th = a.r() * TAU, u = nor3(add3(mul3(lat, Math.cos(th)), fw, Math.sin(th))); tc.push(g.bu(add3(add3(J.pelvis, up, r2(a, 1.2)), u, radio(Tc, u) - 0.2), [1.4 + a.r(), 1 + a.r() * 0.6, 0.6], { mat: j < 3 ? 'gore_sangre_oscura' : 'gore_mugre', eje: up, k: 0.3 })); }
    // harapo de camisa colgado de un hombro (el otro lado del pecho queda desnudo, con las costillas)
    if (tm !== 'tela_roja' && a.r() < 0.55) {
      const s = a.r() < 0.5 ? 1 : -1, Tp: Tramo = [J.pelvis, add3(J.pecho, up, 2.5), Ry + 0.35, Rz + 0.4];
      for (let j = 0; j < 7; j++) {
        const th = s * (0.15 + a.r() * 0.75) * Math.PI * (a.r() < 0.7 ? 0.5 : 1.1), h = 0.55 + a.r() * 0.45;
        const u = nor3(add3(mul3(lat, Math.cos(th) * s), fw, Math.abs(Math.sin(th)) * (a.r() < 0.75 ? 1 : -1)));
        tc.push(bx(g, add3(mid3(Tp[0], Tp[1], h), u, radio(Tp, u)), [1.9 + a.r(), 1.6, 0.4], cruz3(up, u), up, { k: 0.4, tono: r2(a, 0.04) }));
      }
      tc.push(g.hu(add3(add3(J.hombros[s > 0 ? 0 : 1], up, 1), fw, 0.4), add3(add3(add3(J.cuello, up, -1), fw, 2.2), lat, -s * 1.5), 0.7, 0.6, { k: 0.4 }));
      for (let j = 0; j < 3; j++) { const u = nor3(add3(mul3(lat, s * 0.6), fw, 0.8)), b0 = add3(add3(J.pecho, up, -2 - j * 0.8), u, radio(Tp, u) + 0.1), L = 3 + a.r() * 4; tc.push(bx(g, add3(b0, cae, L * 0.5), [L * 0.5, 0.7, 0.3], cae, cruz3(up, u), { k: 0.3 })); }
    }
    g.masa(tc, { mat: tm, suave: 0.6 });
  }
  if (o.abierto) {
    // el vientre abierto: se cava, se pinta el hueco por dentro, las costillas cruzan y las tripas caen
    const c = add3(add3(J.pelvis, up, 8), fw, 3.4);
    g.elip(...c, 3.2, 3.4, 5, { mat: piel, resta: true });
    g.elip(...add3(c, fw, -1.6), 3.2, 3.6, 5, { mat: 'gore_organo', tono: -0.15 });
    for (let i = 0; i < 3; i++) g.palo(add3(add3(c, up, 2.8 - i * 1.6), [0, -3.2, 0]), add3(add3(add3(c, up, 2.4 - i * 1.6), fw, 0.4), [0, 3.2, 0]), 0.45, { mat: 'gore_hueso' });
    const tr: Comp[] = [];
    let prev = add3(c, fw, -0.5);
    for (let i = 1; i <= 9; i++) { const q = add3(add3(add3(c, abajo, i * 1.6), fw, 1.2 + Math.sin(i * 1.3) * 1.2), [Math.cos(i * 1.7) * 1.4, Math.sin(i * 1.1) * 1.6, 0]); tr.push(g.hu(prev, q, 1.15, 1.1, { k: 0.5 })); prev = q; }
    tr.push(g.bu(add3(c, fw, 0.6), [2, 2.2, 1.8], { mat: 'gore_carne' }));
    // los bordes del tajo: labios de carne y sangre
    for (let i = 0; i < 8; i++) { const t = (i / 8) * TAU; tr.push(g.bu(add3(add3(c, up, Math.cos(t) * 4.6), lat, Math.sin(t) * 3.1), [1.2, 0.8, 0.7], { mat: i % 2 ? 'gore_carne' : 'gore_sangre', eje: up, k: 0.3 })); }
    g.masa(tr, { mat: 'gore_tripa', suave: 0.8 });
  }
  return J;
}
