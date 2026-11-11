import { caja, cilindro, elipsoide, esfera, palo, poliedro, masa, hueso, bulto, type Comp, type Pieza, type V3, type Iluminacion } from './render';
import { claveBaja } from './clave_baja';
import { MATERIALES } from './materiales';
import { ruido } from './render';
import { casco as cascoForjado, peto as petoForjado, malla as mallaForjada, cinto as cintoForjado } from './armadura';
import { pose, CUADROS, cuadrosDe, type Dir, type Accion, type Pose, type AngBrazo, type ManoPose } from './figura';
import { capaElemental, LUZ_ELEMENTO_ARMA } from './elementos_arma';
import { formaForjada, adornosNivel, anchoVivo, marcoIcono, tramosVivos, palaClara, type MarcoArma, type NivelForja, type OpcForja } from './forja_armas';

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

// ------------------------------------------------------------------ materiales de las líneas épicas de armadura
/**
 * Escamas superpuestas como tejas medidas en el mundo: cada escama tiene el canto de abajo redondo y claro (la luz
 * le pega) y la parte de arriba en sombra, tapada por la fila de encima; las filas se corren media escama.
 */
const escamas = (alto: number, ancho: number) => (p: V3) => {
  const v = p[2] / alto, fila = Math.floor(v);
  const local = (fv: number, u: number) => { const fu = u - Math.floor(u) - 0.5; return fv - 0.55 * (2 * fu) * (2 * fu); };
  const u0 = (p[0] - p[1]) * 0.7 / ancho + (fila & 1 ? 0.5 : 0);
  let d = local(v - fila, u0);
  if (d < 0) d = local(v - fila + 1, u0 + 0.5);
  return d < 0.16 ? 0.09 : d > 0.9 ? -0.17 : (0.45 - d) * 0.1;
};
M.cu_escama_dragon = { rampa: ['#050905', '#0b150b', '#132213', '#1b311a', '#244222', '#2e542b', '#3a6735', '#4b7c43', '#64955a', '#86b07a'], ruido: 0.03, escala: 0.6, brillo: 0.45, patron: escamas(1.9, 2.4) };
M.cu_bronce = { rampa: ['#120a04', '#231407', '#38200d', '#502f14', '#6a401c', '#845326', '#9f6a33', '#b98442', '#d2a25c', '#e8c588'], ruido: 0.05, escala: 0.6, brillo: 0.65 };
M.cu_draco = { rampa: ['#090203', '#140405', '#200709', '#2e0b0d', '#3d1012', '#4d1617', '#5f1e1e', '#742a28', '#8c3c36', '#a8584c'], ruido: 0.06, escala: 0.6, brillo: 0.6, patron: (p) => (ruido(p[0] * 0.35, p[1] * 0.35, p[2] * 0.35) - 0.5) * 0.1 };
M.cu_cuerno = { rampa: ['#0a0806', '#16110c', '#241c14', '#33281d', '#453728', '#5b4934', '#755f44', '#927a5a', '#b19a78', '#cdbb98'], ruido: 0.12, escala: 0.8, brillo: 0.3, patron: (p) => (Math.sin(p[0] * 2.3 + p[1] * 1.7 + p[2] * 3.1) > 0.6 ? -0.08 : 0.02) };
M.cu_plata_elfica = { rampa: ['#161a1c', '#262c2f', '#394144', '#4f585b', '#677174', '#818b8d', '#9ca6a7', '#b8c1c1', '#d4dbda', '#eef3f1'], ruido: 0.03, escala: 0.5, brillo: 0.8 };
M.cu_filigrana = { rampa: ['#261c0b', '#463514', '#6a521f', '#8f7230', '#b29346', '#cfb264', '#e6cf90', '#f6e8c0'], ruido: 0.03, escala: 0.6, brillo: 0.85 };
M.cu_hoja_elfica = { rampa: ['#0a120c', '#142017', '#1f3124', '#2b4332', '#3a5842', '#4c6f55', '#62886b', '#7ea386', '#a2c0a7'], ruido: 0.08, escala: 0.6, brillo: 0.4, patron: (p) => (Math.abs(Math.sin(p[0] * 1.9 - p[1] * 1.9 + p[2] * 2.6)) < 0.12 ? 0.1 : 0) };
M.cu_placa_demonio = { rampa: ['#030203', '#080606', '#0e0b0b', '#151111', '#1d1817', '#26201f', '#322a28', '#3a2a28', '#4a2e2a'], ruido: 0.05, escala: 0.6, brillo: 0.32, patron: (p) => (Math.abs(ruido(p[0] * 0.55, p[1] * 0.55, p[2] * 0.55) - 0.5) < 0.025 ? -0.22 : 0) };
M.cu_hueso_demonio = { rampa: ['#110c07', '#21180e', '#352717', '#4b3921', '#634c2d', '#7d623c', '#977a50', '#b09466', '#c8b082'], ruido: 0.2, escala: 0.9, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 2.2) - 0.5) * 0.16 };
M.cu_oro_blanco = { rampa: ['#28241e', '#433e36', '#605950', '#80786c', '#a0978a', '#beb5a6', '#d8d0c0', '#ebe5d6', '#f7f3e8', '#fffdf6'], ruido: 0.03, escala: 0.6, brillo: 0.8 };
M.cu_pluma = { rampa: ['#363432', '#55524e', '#76726c', '#96918a', '#b4afa7', '#cec9c1', '#e3dfd8', '#f3f0ea'], ruido: 0.1, escala: 0.8, patron: (p) => (Math.sin((p[0] + p[1]) * 3.4 + p[2] * 1.2) > 0.7 ? -0.06 : 0) };
M.cu_halo = { rampa: ['#6a5530', '#94784a', '#bca064', '#dcc48a', '#f2e2b8'], ruido: 0.15, escala: 0.6, emite: true };
M.cu_bronce_ahogado = { rampa: ['#061010', '#0c1b19', '#152824', '#1f382f', '#2b493a', '#3b5a43', '#536a49', '#6f7a51', '#8c8a5c', '#a89c6c'], ruido: 0.1, escala: 0.5, brillo: 0.35, patron: (p) => (ruido(p[0] * 0.45, p[1] * 0.45, p[2] * 0.45) - 0.5) * 0.4 };
M.cu_percebe = { rampa: ['#171513', '#2b2824', '#433f38', '#5e5850', '#7a736a', '#968f84', '#b1aa9e', '#c9c3b8'], ruido: 0.35, escala: 1.4 };
M.cu_alga = { rampa: ['#040905', '#09130a', '#0f1f10', '#172c16', '#1f3a1d', '#294924', '#33582c', '#40683a'], ruido: 0.3, escala: 1.2, brillo: 0.25 };
M.cu_concha = { rampa: ['#28181a', '#45292a', '#663e3c', '#875650', '#a66f66', '#c08a7e', '#d6a796', '#e8c6b6', '#f6e2d6'], ruido: 0.05, escala: 0.6, brillo: 0.35, patron: (p) => (Math.sin((p[0] - p[1]) * 3.2) > 0.55 ? -0.08 : 0.02) };

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
  /** Cómo se mueve un monstruo (si falta, sale del cuerpo: los grandes son brutos; los encorvados con garras y los chicos, bestias). */
  porte?: import('./figura').Porte;
}
/** El porte de un monstruo humanoide: el que pide el cuerpo o el que sale de su tamaño y su forma. Los héroes no tienen. */
export function porteDe(cu: Cuerpo): import('./figura').Porte | undefined {
  if (cu.presentacion) return undefined;
  if (cu.porte) return cu.porte;
  if ((cu.alto ?? 1) >= 1.5) return 'bruto';
  if ((cu.alto ?? 1) <= 0.75 || ((cu.joroba ?? 0) >= 0.6 && cu.garras)) return 'bestia';
  return undefined;
}
export type Pieza_ = Pieza;
/**
 * Líneas épicas de armadura (actos 3 a 7): cada pieza puede llevar `linea` y, sobre su forma de siempre (placas,
 * grebas, sabatones, guanteletes, yelmo, hombreras), se le suman las formas de la línea: escamas de dragón con ribetes
 * de bronce, crestas y cuernos dracónicos, filigrana y hojas élficas, grietas de lava y púas de hueso demoníacas,
 * alitas y halo celestiales, o percebes, algas y conchas de la armadura ahogada.
 */
export type LineaCuerpo = 'escamas' | 'draconica' | 'elfica' | 'demoniaca' | 'celestial' | 'ahogada';
export const LINEAS_CUERPO: LineaCuerpo[] = ['escamas', 'draconica', 'elfica', 'demoniaca', 'celestial', 'ahogada'];
export interface Equipo {
  torso?: { tipo: 'camisa' | 'sin_mangas' | 'tunica' | 'cuero' | 'cuero_tachonado' | 'malla' | 'placas' | 'harapos' | 'vestido'; mat: string; mat2?: string; linea?: LineaCuerpo; /** metal de los ribetes y remaches de la coraza (leyenda) */ adorno?: string };
  piernas?: { tipo: 'pantalon' | 'calzas' | 'faldon' | 'tunica_larga' | 'grebas' | 'taparrabo'; mat: string; mat2?: string; linea?: LineaCuerpo };
  pies?: { tipo: 'botas' | 'botas_altas' | 'sandalias' | 'sabatones' | 'vendas'; mat: string; linea?: LineaCuerpo };
  manos?: { tipo: 'guantes' | 'guanteletes' | 'vendas' | 'brazales'; mat: string; linea?: LineaCuerpo };
  cabeza?: { tipo: 'capucha' | 'gorro' | 'casco' | 'yelmo' | 'gran_yelmo' | 'cuernos' | 'corona' | 'diadema' | 'mascara' | 'calavera' | 'turbante' | 'aro'; mat: string; mat2?: string; linea?: LineaCuerpo };
  hombros?: { tipo: 'pieles' | 'cuero' | 'placas' | 'puas' | 'huesos'; mat: string; linea?: LineaCuerpo };
  cinturon?: { mat: string; hebilla?: string; linea?: LineaCuerpo };
  capa?: { mat: string; largo?: number; forro?: string };
  arma?: { tipo: TipoArma; mat?: string; mango?: string; gema?: string; encanto?: Encanto; /** nivel del arsenal elemental (1 común a 5 mítica): forma forjada y adornos */ nivel?: 1 | 2 | 3 | 4 | 5 };
  izq?: { tipo: 'escudo_redondo' | 'escudo_cometa' | 'escudo_torre' | 'rodela' | 'escudo_calavera' | 'orbe' | 'libro' | 'antorcha' | 'arma'; mat?: string; mat2?: string; arma?: TipoArma };
  /** Tabardo o faldón con color de la orden. */
  tabardo?: { mat: string; borde?: string };
}
/** Materiales de cada línea épica: la placa, lo de abajo (cota, cuero o tela), el acento (ribetes y remaches) y lo que la distingue. */
export const MAT_LINEA: Record<LineaCuerpo, { placa: string; base: string; acento: string; extra: string }> = {
  escamas: { placa: 'cu_escama_dragon', base: 'cu_cuero_negro', acento: 'cu_bronce', extra: 'cu_bronce' },
  draconica: { placa: 'cu_draco', base: 'cu_malla', acento: 'cu_cuerno', extra: 'cu_cuerno' },
  elfica: { placa: 'cu_plata_elfica', base: 'cu_tela_verde', acento: 'cu_filigrana', extra: 'cu_hoja_elfica' },
  demoniaca: { placa: 'cu_placa_demonio', base: 'cu_cuero_negro', acento: 'cu_hueso_demonio', extra: 'cu_lava' },
  celestial: { placa: 'cu_oro_blanco', base: 'cu_malla', acento: 'cu_oro', extra: 'cu_pluma' },
  ahogada: { placa: 'cu_bronce_ahogado', base: 'cu_malla', acento: 'cu_percebe', extra: 'cu_alga' },
};
/** La armadura completa de una línea épica (casco, pecho, hombreras, guanteletes, cinto, grebas y sabatones; capa desde el nivel 4). */
export function armaduraDeLinea(linea: LineaCuerpo, nivel = 3): Equipo {
  const m = MAT_LINEA[linea];
  const casco: NonNullable<Equipo['cabeza']>['tipo'] = linea === 'ahogada' ? 'gran_yelmo' : 'yelmo';
  const eq: Equipo = {
    torso: { tipo: 'placas', mat: m.placa, mat2: m.base, linea },
    piernas: { tipo: 'grebas', mat: m.placa, mat2: m.base, linea },
    pies: { tipo: 'sabatones', mat: m.placa, linea },
    manos: { tipo: 'guanteletes', mat: m.placa, linea },
    hombros: { tipo: 'placas', mat: m.placa, linea },
    cabeza: { tipo: casco, mat: m.placa, mat2: m.acento === 'cu_percebe' ? 'cu_bronce' : m.acento, linea },
    cinturon: { mat: linea === 'elfica' ? 'cu_tela_verde' : linea === 'celestial' ? 'cu_tela_blanca' : 'cu_cuero_negro', hebilla: m.acento === 'cu_percebe' ? 'cu_bronce' : m.acento, linea },
  };
  if (linea === 'celestial') eq.tabardo = { mat: 'cu_tela_blanca', borde: 'cu_oro' };
  if (nivel >= 4) eq.capa = { mat: { escamas: 'cu_tela_verde', draconica: 'cu_tela_roja', elfica: 'cu_tela_verde', demoniaca: 'cu_tela_negra', celestial: 'cu_tela_blanca', ahogada: 'cu_alga' }[linea], largo: 0.95 };
  return eq;
}
/** Armas vivas: el encantamiento arde, escarcha, chispea, gotea o humea sobre la hoja en cada cuadro. */
export type Encanto = 'fuego' | 'hielo' | 'rayo' | 'veneno' | 'sombra' | 'sagrado' | 'sangre';
export const ENCANTOS: [Encanto, string, string, string][] = [
  ['fuego', 'de fuego', 'of fire', '#ff7a20'], ['hielo', 'de escarcha', 'of frost', '#80c8ff'], ['rayo', 'del trueno', 'of thunder', '#a0c0ff'],
  ['veneno', 'de ponzoña', 'of venom', '#60e040'], ['sombra', 'de las sombras', 'of shadows', '#9040d0'], ['sagrado', 'de la luz', 'of light', '#ffe080'], ['sangre', 'sangrienta', 'of blood', '#e02020'],
];
export type TipoArma = 'espada' | 'cimitarra' | 'mandoble' | 'hacha' | 'hacha_doble' | 'maza' | 'martillo' | 'mangual' | 'lanza' | 'alabarda' | 'guadana'
  | 'baculo' | 'cetro' | 'varita' | 'daga' | 'garras' | 'arco' | 'ballesta' | 'puno' | 'nada'
  // el arsenal épico
  | 'katana' | 'estoque' | 'falcata' | 'tridente' | 'maza_estrella' | 'arco_largo' | 'arco_corto' | 'jabalina' | 'gran_baculo' | 'orbe_mano' | 'katar' | 'hoz' | 'lanza_dragon'
  // el arsenal elemental: el cesto de púgil y el frasco del alquimista (forja_armas.ts)
  | 'cestus' | 'frasco';
/** Las armas del arsenal épico (formas de masa: hojas, cabezas y cunas que se funden sin aristas duras). */
export const ARMAS_EPICAS: TipoArma[] = ['katana', 'estoque', 'falcata', 'tridente', 'maza_estrella', 'arco_largo', 'arco_corto', 'jabalina', 'gran_baculo', 'orbe_mano', 'katar', 'hoz', 'lanza_dragon'];

/** A dos manos: la izquierda se cierra sobre el mango (cinemática inversa) y no lleva escudo ni objeto. */
const dos = (t?: TipoArma) => t === 'mandoble' || t === 'hacha_doble' || t === 'martillo' || t === 'alabarda' || t === 'guadana' || t === 'tridente' || t === 'gran_baculo' || t === 'lanza_dragon';
/** Arcos: la izquierda sostiene el arco y la derecha tira de la cuerda. */
const esArco = (t?: TipoArma) => t === 'arco' || t === 'arco_largo' || t === 'arco_corto';
/** Astas que se empuñan como la lanza (pose de vara, casi horizontales en el puño). */
const asta = (t?: TipoArma) => t === 'tridente' || t === 'lanza_dragon' || t === 'jabalina';
/** Varas que se apoyan en el piso (báculo, cetro, gran báculo). */
const esVara = (t?: TipoArma) => t === 'baculo' || t === 'cetro' || t === 'gran_baculo';

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
  /** W: marco del cuerpo (mira hacia F); Pv: marco de la pelvis (sigue su giro, ladeo y corrimiento); T: del torso; cab: de la cabeza. */
  W: Fn; T: Fn; cab: Fn; ejesT: [V3, V3, V3]; ejesCab: [V3, V3, V3];
  piernas: Pierna[]; brazos: Brazo[]; caida: number;
  Pv?: Fn; pose?: Pose;
  /** Báculo: eje de la vara (del puño hacia el remate) y, si está apoyada, el punto del piso donde apoya el pie. */
  vara?: V3; varaPie?: V3;
}
const ejesDe = (fn: Fn, o: [number, number, number]): [V3, V3, V3] => {
  const c = fn(...o), ex = nor(sub(fn(o[0] + 1, o[1], o[2]), c)), up = nor(sub(fn(o[0], o[1], o[2] + 1), c));
  const ey = nor(cruz(up, ex)), ez = cruz(ex, ey);
  return [ex, ey, ez];
};
/** Cinemática inversa de dos huesos: de la raíz `a` hacia `b`, con el codo o la rodilla hacia el polo `pol`. */
function ik2(a: V3, b: V3, L1: number, L2: number, pol: V3): [V3, V3] {
  const dv = sub(b, a), dist = Math.max(0.01, Math.min(len(dv), L1 + L2 - 0.02)), dir = nor(dv);
  const ca = Math.max(-1, Math.min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))), sa = Math.sqrt(1 - ca * ca);
  let per = sub(pol, [dir[0] * dot3(pol, dir), dir[1] * dot3(pol, dir), dir[2] * dot3(pol, dir)]);
  if (len(per) < 1e-4) per = cruz(dir, [0, 0, 1]);
  per = nor(per);
  return [add(add(a, dir, L1 * ca), per, L1 * sa), add(a, dir, dist)];
}
/** Gira v alrededor del eje k (unitario) en `ang` radianes. */
const rotar = (v: V3, k: V3, ang: number): V3 => {
  const c = Math.cos(ang), s = Math.sin(ang), kv = cruz(k, v), d = dot3(k, v);
  return [v[0] * c + kv[0] * s + k[0] * d * (1 - c), v[1] * c + kv[1] * s + k[1] * d * (1 - c), v[2] * c + kv[2] * s + k[2] * d * (1 - c)];
};
/** Hasta dónde llega el arma desde el puño (para que la cabeza del arma toque el piso). */
const LARGO_ARMA: Partial<Record<TipoArma, number>> = { espada: 23, cimitarra: 23, mandoble: 33, daga: 9.5, hacha: 21, hacha_doble: 29, maza: 18, martillo: 27, mangual: 12, lanza: 36, alabarda: 36, guadana: 30, varita: 10,
  katana: 26, estoque: 27, falcata: 21, tridente: 37, maza_estrella: 19, jabalina: 28, orbe_mano: 8, katar: 13, hoz: 10, lanza_dragon: 41 };

/** Largo del mango detrás del puño (lo que dibuja arma() y armaEpica() hacia atrás desde la mano), por tipo. */
const CABO_MANGO: Partial<Record<TipoArma, number>> = { hacha: 4, hacha_doble: 4, martillo: 5, mandoble: 7, maza: 3, mangual: 3, espada: 3.5, cimitarra: 3.5,
  lanza: 18, alabarda: 18, guadana: 14, tridente: 18, lanza_dragon: 18, jabalina: 15 };

/** Qué lleva la mano izquierda, para la pose: un escudo o un objeto en la mano (si la derecha no la ocupa). */
function manoDe(arma: TipoArma, izq?: IzqTipo): ManoPose | undefined {
  if (!izq || izq === 'arma' || dos(arma) || esArco(arma) || arma === 'ballesta') return undefined;
  return izq.startsWith('escudo') || izq === 'rodela' ? 'escudo' : 'objeto';
}
type IzqTipo = NonNullable<Equipo['izq']>['tipo'];

/** Radios del hueso del pie (talón y punta) en unidades de A: el pie se apoya con la planta a ras del piso. */
const PIE_TALON = 1.6, PIE_PUNTA = 1.25;

export function esqueleto(cu: Cuerpo, dir: Dir, acc: Accion, f: number, arma: TipoArma = 'nada', izqTipo?: IzqTipo, crudo = false): Esqueleto {
  const S = cu.alto ?? 1, A = (cu.ancho ?? 1) * S;
  // (las astas y el gran báculo nuevos van con la pose de vara aunque sean a dos manos: la izquierda baja por el asta)
  // (las armas de asta largas a dos manos, la lanza y el gran báculo van con la pose a dos manos: arco grande y agarre doble)
  const tipo = arma === 'ballesta' ? 'ballesta' : arma === 'lanza' || arma === 'alabarda' ? 'asta' : arma === 'guadana' && !cu.presentacion ? 'segur' : dos(arma) ? 'dos' : asta(arma) ? 'baculo' : esArco(arma) ? 'arco' : arma === 'baculo' || arma === 'cetro' ? 'baculo' : arma === 'garras' || arma === 'puno' || arma === 'katar' || arma === 'cestus' ? 'garras' : arma === 'nada' ? 'nada' : 'una';
  let P = pose(acc, f, tipo, cu.presentacion, manoDe(arma, izqTipo), porteDe(cu));
  // los héroes entran al ataque y al conjuro desde su reposo y vuelven a él: el primer cuadro es el reposo y el último
  // también (los dos de al lado van a mitad de camino), así no saltan de postura al empezar ni al terminar
  if (!crudo && cu.presentacion && (acc === 'atacar' || acc === 'lanzar')) {
    const w = pesoReposo(f / cuadrosDe(acc, cu.presentacion));
    if (w > 0) P = reposar(cu, dir, acc, f, arma, izqTipo, P, w);
  }
  const th = rad(RUMBO[dir]);
  const F: V3 = [Math.cos(th), Math.sin(th), 0], R: V3 = [Math.sin(th), -Math.cos(th), 0];
  const W: Fn = (fw, rt, up) => [F[0] * fw + R[0] * rt, F[1] * fw + R[1] * rt, up];
  // la caída de morir: el cuerpo gira alrededor de los pies hacia caidaDir (0 adelante, 180 de espaldas, ±90 de costado)
  const cd = rad(P.caidaDir ?? 0), D: V3 = [F[0] * Math.cos(cd) + R[0] * Math.sin(cd), F[1] * Math.cos(cd) + R[1] * Math.sin(cd), 0], Q: V3 = [-D[1], D[0], 0];
  const caer = (q: V3): V3 => {
    if (!P.caida) return q;
    const a = rad(82 * P.caida);
    const al = q[0] * D[0] + q[1] * D[1], pe = q[0] * Q[0] + q[1] * Q[1];
    const na = al * Math.cos(a) + q[2] * Math.sin(a) - 4 * P.caida, nz = Math.max(0.6, -al * Math.sin(a) + q[2] * Math.cos(a));
    return [D[0] * na + Q[0] * pe, D[1] * na + Q[1] * pe, nz];
  };
  const plant = !!P.plantado && !P.caida;
  // con los pies plantados `avanza` corre la cadera (los pies quedan); si no, mueve todo el cuerpo
  const Wc: Fn = (fw, rt, up) => caer(W(fw + (plant ? 0 : P.avanza), rt, up));
  const L1 = 14.5 * S, L2 = 14 * S;
  // la pisada: en la marcha la cadera baja hasta que el tobillo de apoyo queda a la altura del piso (sin pies flotando)
  const extension = ([hz, rod]: [number, number]) => 14.5 * Math.cos(rad(hz)) + 14 * Math.cos(rad(hz - rod));
  let zc = P.suelo ? (Math.max(extension(P.caderaD), extension(P.caderaI)) + 2.4 + (P.vuelo ?? 0)) * S : (31 - P.bajar) * S;
  const zc0 = zc;
  // la carrera fija la altura de la cadera (un rebote corto y poco hondo): los pies quedan donde los pone el paso y las
  // rodillas se resuelven solas; si una pierna no llega, la cadera baja lo justo
  if (P.suelo && P.zCadera !== undefined) zc = P.zCadera * S;
  // ---- pelvis: corrimiento (el peso pasa a una pierna), giro y ladeo; los pies quedan donde están
  const adel = plant ? P.avanza * S : 0, lat = (P.lateral ?? 0) * S, gC = rad(P.giroCadera ?? 0), lC = rad(P.ladeoCadera ?? 0);
  const pvL = (fw: number, rt: number, up: number): V3 => {
    const dz = up - zc, f2 = fw * Math.cos(gC) - rt * Math.sin(gC), r2 = fw * Math.sin(gC) + rt * Math.cos(gC);
    return [f2 + adel, r2 * Math.cos(lC) - dz * Math.sin(lC) + lat, zc + r2 * Math.sin(lC) + dz * Math.cos(lC)];
  };
  const mueve = plant || P.zCadera !== undefined || !!(adel || lat || gC || lC || P.abre);
  // ---- tobillos: donde los ponen los ángulos (o plantados en el piso)
  const piso = 2.4 * S;
  const lados: [number, [number, number], number][] = [[1, P.caderaD, 0], [-1, P.caderaI, 1]];
  const tobs: V3[] = [], rods: V3[] = [];
  for (const [s, [hz, rod], i] of lados) {
    const a1 = rad(hz), a2 = rad(hz - rod);
    const rodl: V3 = [Math.sin(a1) * L1, s * 3.6 * A, zc0 - Math.cos(a1) * L1];
    let tob: V3 = [rodl[0] + Math.sin(a2) * L2, rodl[1], rodl[2] - Math.cos(a2) * L2];
    if (plant) tob = [P.pasos ? P.pasos[i] * S : tob[0], s * 3.6 * A, piso + ((P.alza?.[i] ?? 0) + (P.puntillas?.[i] ?? 0) * 2.2) * S];
    if (P.abre) tob[1] += s * P.abre[i] * S;
    tobs.push(tob); rods.push(rodl);
  }
  if (mueve) {
    // si una pierna no llega a su pie, la cadera baja (el peso se hunde) en vez de que el pie flote
    const LM = (L1 + L2) * 0.995;
    let baja = 0;
    lados.forEach(([s], i) => {
      const h = pvL(0, s * 3.6 * A, zc), t = tobs[i], hor = Math.hypot(t[0] - h[0], t[1] - h[1]);
      if (hor < LM) baja = Math.max(baja, h[2] - (t[2] + Math.sqrt(LM * LM - hor * hor)));
    });
    zc -= baja;
  }
  const tor = rad(P.torso + (cu.joroba ?? 0) * 18), gir = rad(P.giroTorso), lad = rad(P.ladeo ?? 0);
  // un punto del torso: girado sobre la vertical, ladeado e inclinado hacia adelante desde la cadera (que se corre con la pelvis)
  const Tl = (fw: number, rt: number, up: number): V3 => {
    const f2 = fw * Math.cos(gir) - rt * Math.sin(gir), r2 = fw * Math.sin(gir) + rt * Math.cos(gir);
    const dz = up - zc, r3 = r2 * Math.cos(lad) + dz * Math.sin(lad), z3 = dz * Math.cos(lad) - r2 * Math.sin(lad);
    return [f2 * Math.cos(tor) + z3 * Math.sin(tor) + adel, r3 + lat, zc + z3 * Math.cos(tor) - f2 * Math.sin(tor)];
  };
  const T: Fn = (fw, rt, up) => Wc(...Tl(fw, rt, up));
  const Pv: Fn = (fw, rt, up) => Wc(...pvL(fw, rt, up));
  const hombroZ = zc + 16.5 * S;
  const cz = hombroZ + 7.6 * S - (cu.joroba ?? 0) * 2 * S;
  const cabeza = rad(P.cabeza - (cu.joroba ?? 0) * 25), gCab = rad(P.giroCabeza ?? 0), lCab = rad(P.ladeoCabeza ?? 0);
  // la cabeza gira sobre el cuello, se ladea y cabecea; todo sobre el torso
  const cab: Fn = (fw, rt, up) => {
    const dz = up - hombroZ, f1 = fw * Math.cos(gCab) - rt * Math.sin(gCab), r1 = fw * Math.sin(gCab) + rt * Math.cos(gCab);
    const r2 = r1 * Math.cos(lCab) + dz * Math.sin(lCab), z2 = dz * Math.cos(lCab) - r1 * Math.sin(lCab);
    return T(f1 * Math.cos(cabeza) + z2 * Math.sin(cabeza) + (cu.joroba ?? 0) * 3 * S, r2, hombroZ + z2 * Math.cos(cabeza) - f1 * Math.sin(cabeza));
  };
  // ---- piernas
  const piernas: Pierna[] = [];
  lados.forEach(([s, [hz, rod], i]) => {
    let cad: V3, rodl: V3, tob: V3;
    if (mueve) {
      cad = pvL(0, s * 3.6 * A, zc); tob = tobs[i];
      // la rodilla va hacia donde apunta el pie
      const pg = rad(s * (P.pieGiro?.[i] ?? 0));
      [rodl, tob] = ik2(cad, tob, L1, L2, [Math.cos(pg), Math.sin(pg) + s * 0.12, 0]);
    } else {
      cad = [0, s * 3.6 * A, zc];
      const a1 = rad(hz), a2 = rad(hz - rod);
      rodl = [Math.sin(a1) * L1, cad[1], zc - Math.cos(a1) * L1];
      tob = [rodl[0] + Math.sin(a2) * L2, rodl[1], rodl[2] - Math.cos(a2) * L2];
    }
    // el pie: punta hacia adelante (abierta con pieGiro); en puntillas el talón sube y la punta queda en el piso, a la
    // misma altura que la de un pie plantado (no se hunde: el pie gira sobre la punta)
    // (el talón y la punta no bajan de su propio radio, el del hueso del pie en partes(): la planta queda a ras del piso;
    // la suela de la bota la suma personaje() hacia arriba, nunca hacia abajo)
    const pg = rad(s * (P.pieGiro?.[i] ?? 0)), fd: V3 = [Math.cos(pg), Math.sin(pg), 0];
    const pz = Math.max(PIE_TALON * A, tob[2] - 1.6 * S), tip = plant ? P.puntillas?.[i] ?? 0 : 0;
    const talon: V3 = [tob[0] - fd[0] * 1.2 * S, tob[1] - fd[1] * 1.2 * S, Math.max(PIE_TALON * A, tob[2] - 2.2 * S)];
    const punta: V3 = [tob[0] + fd[0] * 4.6 * S * (1 - tip * 0.25), tob[1] * 1.04 + fd[1] * 4.6 * S, Math.max(PIE_PUNTA * A, tip > 0 ? pz - 0.2 * S - tip * 2.2 * S : pz - 0.2 * S)];
    piernas.push({ s, cad: Wc(...cad), rod: Wc(...rodl), tob: Wc(...tob), talon: Wc(...talon), punta: Wc(...punta) });
  });
  // ---- brazos: por ángulos (con giro del brazo) o con la mano a un punto (cinemática inversa)
  const brazos: Brazo[] = [];
  const LB1 = 11.5 * S, LB2 = 10.2 * S;
  const brazosP: [number, AngBrazo, [number, number, number] | undefined, [number, number, number] | undefined, number][] = [[1, P.hombroD, P.manoD, P.codoD, 0], [-1, P.hombroI, P.manoI, P.codoI, 1]];
  for (const [s, ang, meta, polo, i] of brazosP) {
    const h0: V3 = [0, s * 6.4 * A, hombroZ + (P.hombros?.[i] ?? 0) * S];
    let hW: V3, cW: V3, mW: V3, maW: V3;
    if (meta) {
      const hB = Tl(...h0), obj: V3 = [meta[0] * S, meta[1] * A, meta[2] * S];
      // si el arma tiene que apoyar la cabeza en el piso y es corta, la mano baja lo justo para que llegue
      const Lp = LARGO_ARMA[arma];
      if (i === 0 && Lp && (P.pisoArma ?? 0) > 0.5 && P.armaD) { const tope = 1.2 * S + Lp * S * Math.max(0.3, -Math.cos(rad(P.armaD[0]))) * 0.97; if (obj[2] > tope) obj[2] = tope; }
      const pol: V3 = polo ? [polo[0], polo[1], polo[2]] : [-0.35, s * 0.8, -0.5];
      const [cB, maB] = ik2(hB, obj, LB1, LB2 + 1.9 * S, pol);
      const muB = add(maB, nor(sub(maB, cB)), -1.9 * S);
      hW = Wc(...hB); cW = Wc(...cB); mW = Wc(...muB); maW = Wc(...maB);
    } else {
      const [adelA, afuera, codo, giro = 0] = ang;
      const a1 = rad(adelA), b1 = rad(afuera) * s;
      const d1: V3 = [Math.sin(a1) * Math.cos(b1), Math.sin(b1), -Math.cos(a1) * Math.cos(b1)];
      const c: V3 = add(h0, d1, LB1);
      const a2 = rad(adelA + codo);
      let d2: V3 = [Math.sin(a2) * Math.cos(b1 * 0.5), Math.sin(b1 * 0.5), -Math.cos(a2) * Math.cos(b1 * 0.5)];
      if (giro) d2 = rotar(d2, d1, rad(s * giro));
      const mu: V3 = add(c, d2, LB2), ma: V3 = add(c, d2, LB2 + 1.9 * S);
      hW = T(...h0); cW = T(...c); mW = T(...mu); maW = T(...ma);
    }
    brazos.push({ s, hom: hW, codo: cW, mun: mW, mano: maW, d1: nor(sub(cW, hW)), d2: nor(sub(mW, cW)), eje: [0, 0, 1] });
  }
  // ---- el agarre: la hoja sale del puño cerrado casi en ángulo recto con el antebrazo (hacia donde apunta el pulgar)
  const L2m = LB2 + 1.9 * S;
  for (const b of brazos) b.eje = ejeAgarre(b.d2, F, arma, b.s, b.s > 0 ? P.munecaD ?? 0 : 0);
  const der = brazos[0], izq = brazos[1];
  const dirW = (v: V3): V3 => { const o = Wc(0, 0, 10), q = Wc(v[0], v[1], 10 + v[2]); return nor(sub(q, o)); };
  if (P.armaRel && !P.armaD) {
    // el arma sujeta al antebrazo: [ángulo desde el antebrazo, giro alrededor de él]. La referencia del giro es el lado
    // hacia el que dobla el codo (con un poco del frente del torso: con el brazo estirado no se pierde), así el arma
    // acompaña al brazo en todo el recorrido, sin saltos, y sigue al torso cuando gira o se inclina
    const tF = nor(sub(T(1, 0, hombroZ), T(0, 0, hombroZ)));
    const base: V3 = add([-der.d1[0], -der.d1[1], -der.d1[2]], tF, 0.45), d2 = der.d2;
    let ref = sub(base, [d2[0] * dot3(base, d2), d2[1] * dot3(base, d2), d2[2] * dot3(base, d2)]);
    if (len(ref) < 1e-3) ref = [0, 0, 1];
    ref = nor(ref);
    const fuera = cruz(d2, ref), a = rad(P.armaRel[0]), g = rad(P.armaRel[1]);
    const lado: V3 = [ref[0] * Math.cos(g) + fuera[0] * Math.sin(g), ref[1] * Math.cos(g) + fuera[1] * Math.sin(g), ref[2] * Math.cos(g) + fuera[2] * Math.sin(g)];
    der.eje = nor(add([d2[0] * Math.cos(a), d2[1] * Math.cos(a), d2[2] * Math.cos(a)], lado, Math.sin(a)));
  }
  if (P.armaD) {
    // el arma apunta a donde la pose dice; si la cabeza del arma busca el piso, se ajusta al largo del arma
    let [pa, ya] = P.armaD;
    const L = LARGO_ARMA[arma], k = Math.max(0, Math.min(1, P.pisoArma ?? 0));
    if (L && k > 0 && !P.caida) {
      const hz = der.mano[2], c = (1.2 * S - hz) / (L * S);
      if (Math.abs(c) <= 1) pa = pa + (((Math.acos(c) * 180) / Math.PI) - pa) * k;
    }
    der.eje = dirW([Math.sin(rad(pa)) * Math.cos(rad(ya)), Math.sin(rad(pa)) * Math.sin(rad(ya)), Math.cos(rad(pa))]);
  }
  // la cabeza del arma nunca se mete en el piso: si la punta queda abajo, el arma se levanta en su plano vertical
  const Lw = LARGO_ARMA[arma];
  if (Lw && !P.caida && !esVara(arma)) {
    const need = (1.2 * S - der.mano[2]) / (Lw * S);
    if (der.mano[2] + der.eje[2] * Lw * S < 1.2 * S && need >= -1 && need <= 1) {
      const h = Math.hypot(der.eje[0], der.eje[1]) || 1e-3, hz = Math.sqrt(1 - need * need);
      der.eje = [(der.eje[0] / h) * hz, (der.eje[1] / h) * hz, need];
    }
  }
  // armas a dos manos, lanzas y ballestas: la mano izquierda se cierra sobre el mango (cinemática inversa de dos huesos);
  // la pose puede correr el agarre por el mango (agarreI) o soltarlo (pegaI)
  // el báculo: casi vertical en la mano, inclinado como diga la pose o apoyado con el pie en un punto del piso
  const varaPie = P.varaPie ? Wc(P.varaPie[0] * S, P.varaPie[1] * A, P.varaPie[2] * S) : undefined;
  const vara = varaPie ? nor(sub(der.mano, varaPie)) : P.vara ? dirW([Math.sin(rad(P.vara[0])), Math.sin(rad(P.vara[1])), Math.cos(rad(P.vara[0])) * Math.cos(rad(P.vara[1]))]) : P.armaD && esVara(arma) ? der.eje : undefined;
  const separa = arma === 'lanza' || arma === 'alabarda' || arma === 'guadana' || arma === 'tridente' || arma === 'lanza_dragon' ? 11 : arma === 'gran_baculo' ? 10 : dos(arma) ? 4.8 : arma === 'ballesta' ? -9 : 0;
  // el agarre de la izquierda nunca pasa del regatón: se recorta al largo real del mango detrás del puño (el que dibuja
  // arma()) menos medio puño, así el puño cierra siempre sobre madera
  const cabo = esVara(arma) ? undefined : CABO_MANGO[arma];
  let agarre = P.agarreI ?? separa;
  if (cabo !== undefined && agarre > cabo - 0.6) agarre = cabo - 0.6;
  const pega = Math.max(0, Math.min(1, P.pegaI ?? (agarre ? 1 : 0)));
  if (agarre && pega > 0 && !P.caida && !esArco(arma) && arma !== 'nada' && arma !== 'puno') {
    const ejeMango = esVara(arma) ? vara ?? [0, 0, 1] : der.eje;
    let meta = arma === 'ballesta' ? add(add(der.mano, F, 7 * S), R, 2.5 * S) : add(der.mano, ejeMango, -agarre * S);
    // si la izquierda no llega a ese punto del mango, se corre por el mango hasta el punto más cercano que alcanza
    // (agarre negativo: la izquierda va del lado de la cabeza del arma, por delante del puño derecho)
    if (arma !== 'ballesta' && len(sub(meta, izq.hom)) > LB1 + L2m - 0.15) {
      let mejor = meta, dm = len(sub(meta, izq.hom));
      if (agarre > 0) for (let g = 2; g <= (cabo !== undefined ? cabo - 0.6 : agarre + 8); g += 0.5) { const q = add(der.mano, ejeMango, -g * S), dq = len(sub(q, izq.hom)); if (dq < dm) { dm = dq; mejor = q; } if (dq <= LB1 + L2m - 0.15) { mejor = q; break; } }
      // del lado de la cabeza: se queda lo más lejos del puño derecho que alcance (no se apila sobre él)
      else for (let g = -agarre; g >= 2; g -= 0.25) { const q = add(der.mano, ejeMango, g * S), dq = len(sub(q, izq.hom)); if (dq < dm) { dm = dq; mejor = q; } if (dq <= LB1 + L2m - 0.15) { mejor = q; break; } }
      meta = mejor;
    }
    if (pega < 1) meta = mez(izq.mano, meta, pega);
    const afuera = nor(add(R, [0, 0, 0], izq.s));
    // la pose puede mandar el codo izquierdo afuera (poloI, marco del cuerpo) para que el brazo no cruce delante de la cara
    const pol = P.poloI ? dirW(P.poloI) : nor(add([0, 0, -1], afuera, 0.8));
    const [codo, mano] = ik2(izq.hom, meta, LB1, L2m, pol);
    const d2 = nor(sub(mano, codo));
    Object.assign(izq, { codo, mano, mun: add(mano, d2, -1.9 * S), d1: nor(sub(codo, izq.hom)), d2, eje: der.eje });
  }
  // el báculo: casi vertical en la mano, o inclinado como diga la pose
  return { S, A, F, R, zc, hombroZ, cz, W: Wc, T, cab, ejesT: ejesDe(T, [0, 0, zc + 10]), ejesCab: ejesDe(cab, [0, 0, cz]), piernas, brazos, caida: P.caida, Pv, pose: P, vara, varaPie };
}

const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Cuánto pesa el reposo en el cuadro u de un ataque o un conjuro: 1 en el primero y en el último, nada en el medio. */
function pesoReposo(u: number): number {
  const ss = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const d = 2 / 12;
  return u < d ? 1 - ss(u / d) : u > 1 - 3 / 12 ? ss((u - (1 - 3 / 12)) / d) : 0;
}
/** El reposo de mitad de respiración (quieto, cuadro 2 de 8) como pose: de ahí salen y ahí vuelven el ataque y el conjuro. */
const REPOSO_CUADRO = 2;
/**
 * Mezcla la pose de la acción con la del reposo (w = 1: el reposo). Lo del cuerpo se interpola; las manos y el arma se
 * llevan a donde están de verdad en los dos esqueletos (puntos del cuerpo y dirección del arma), así se mezclan bien
 * aunque una pose las ponga por ángulos y la otra por cinemática inversa.
 */
function reposar(cu: Cuerpo, dir: Dir, acc: Accion, f: number, arma: TipoArma, izqTipo: IzqTipo | undefined, P: Pose, w: number): Pose {
  const e0 = esqueleto(cu, dir, 'quieto', REPOSO_CUADRO, arma, izqTipo, true), P0 = e0.pose!;
  if (w >= 0.999) return { ...P0, flecha: P0.flecha, tensa: P0.tensa };
  const eA = esqueleto(cu, dir, acc, f, arma, izqTipo, true);
  const S = eA.S, A = eA.A, F = eA.F, R = eA.R;
  const L = (a: number, b: number) => a + (b - a) * w;
  const out: Pose = { ...P };
  const num = ['torso', 'giroTorso', 'cabeza', 'bajar', 'avanza', 'ladeo', 'giroCadera', 'ladeoCadera', 'lateral', 'giroCabeza', 'ladeoCabeza', 'respira'] as const;
  for (const k of num) (out as unknown as Record<string, number>)[k] = L((P as unknown as Record<string, number>)[k] ?? 0, (P0 as unknown as Record<string, number>)[k] ?? 0);
  const par = ['hombros', 'pasos', 'abre', 'alza', 'puntillas', 'pieGiro', 'capa', 'pelo'] as const;
  for (const k of par) { const a = (P[k] ?? [0, 0]) as number[], b = (P0[k] ?? [0, 0]) as number[]; (out as unknown as Record<string, number[]>)[k] = [L(a[0], b[0]), L(a[1], b[1])]; }
  // si los pies cambian de lugar, el que se mueve se levanta (no se arrastra por el piso)
  const dp = [Math.abs((P.pasos?.[0] ?? 0) - (P0.pasos?.[0] ?? 0)), Math.abs((P.pasos?.[1] ?? 0) - (P0.pasos?.[1] ?? 0))];
  out.alza = [(out.alza?.[0] ?? 0) + Math.min(1.2, dp[0] * 0.4) * Math.sin(Math.PI * w), (out.alza?.[1] ?? 0) + Math.min(1.2, dp[1] * 0.4) * Math.sin(Math.PI * w)];
  out.plantado = true;
  // del mundo al marco del cuerpo (adelante, derecha, arriba) en unidades de la pose
  const cuerpo = (q: V3): [number, number, number] => [dot3(q, F) / S, dot3(q, R) / A, q[2] / S];
  const dirCuerpo = (v: V3): V3 => [dot3(v, F), dot3(v, R), v[2]];
  const mezV = (a: [number, number, number], b: [number, number, number]): [number, number, number] => [L(a[0], b[0]), L(a[1], b[1]), L(a[2], b[2])];
  const polo = (b: { hom: V3; codo: V3; mano: V3 }): [number, number, number] => { const c = dirCuerpo(nor(sub(b.codo, mez(b.hom, b.mano, 0.5)))); return [c[0], c[1], c[2]]; };
  const [dA, iA] = eA.brazos, [d0, i0] = e0.brazos;
  // a mitad de camino la mano del arma se abre un poco hacia afuera: el arma pasa por el costado, lejos de la cabeza
  out.manoD = mezV(cuerpo(dA.mano), cuerpo(d0.mano)); out.manoD[1] += 2.5 * Math.sin(Math.PI * w); out.codoD = mezV(polo(dA), polo(d0));
  // el arma: la dirección mezclada, en grados (desde arriba hacia adelante, giro a la derecha)
  const W0 = (c: V3): V3 => [F[0] * c[0] + R[0] * c[1], F[1] * c[0] + R[1] * c[1], c[2]];
  const ang = (v: V3): [number, number] => { const c = dirCuerpo(nor(v)); return [(Math.acos(Math.max(-1, Math.min(1, c[2]))) * 180) / Math.PI, (Math.atan2(c[1], c[0]) * 180) / Math.PI]; };
  // (la dirección se mezcla como vector: de atrás del hombro a adelante pasa por arriba, nunca por dentro del cuerpo)
  const ea = dirCuerpo(dA.eje), e0v = dirCuerpo(d0.eje);
  out.armaD = ang(W0(nor([L(ea[0], e0v[0]), L(ea[1], e0v[1]), L(ea[2], e0v[2])]))); delete out.munecaD; out.pisoArma = 0;
  if (eA.vara && e0.vara) {
    const va = dirCuerpo(eA.vara), v0 = dirCuerpo(e0.vara), v = nor([L(va[0], v0[0]), L(va[1], v0[1]), L(va[2], v0[2])]);
    out.vara = [(Math.asin(Math.max(-1, Math.min(1, v[0]))) * 180) / Math.PI, (Math.asin(Math.max(-1, Math.min(1, v[1]))) * 180) / Math.PI]; delete out.varaPie;
  }
  // la izquierda: libre en los dos, se mezcla; si una de las dos poses la cierra en el mango, se abre o se cierra de a poco
  const pegaA = P.pegaI ?? (P.agarreI ? 1 : 0), pega0 = P0.pegaI ?? (P0.agarreI ? 1 : 0);
  out.manoI = pegaA >= 0.5 && pega0 < 0.5 ? cuerpo(i0.mano) : pega0 >= 0.5 && pegaA < 0.5 ? cuerpo(iA.mano) : mezV(cuerpo(iA.mano), cuerpo(i0.mano));
  out.codoI = mezV(polo(iA), polo(i0));
  out.pegaI = L(pegaA, pega0);
  if (out.pegaI > 0 && !out.agarreI) out.agarreI = P0.agarreI;
  if (w > 0.5) { out.flecha = P0.flecha; out.tensa = P0.tensa; }
  return out;
}
/**
 * Eje del arma en el puño: el antebrazo girado hacia el pulgar. Una espada con el brazo colgando apunta adelante y un
 * poco abajo; en el tajo sigue al brazo. Las garras siguen el antebrazo; la lanza va casi horizontal. La muñeca suma
 * grados al ángulo del agarre (el arma se adelanta o se atrasa al antebrazo).
 */
function ejeAgarre(d2: V3, F: V3, arma: TipoArma, s: number, muneca = 0): V3 {
  void s;
  let pul = sub(F, [d2[0] * dot3(F, d2), d2[1] * dot3(F, d2), d2[2] * dot3(F, d2)]);
  if (len(pul) < 0.25) pul = sub([0, 0, 1], [d2[0] * d2[2], d2[1] * d2[2], d2[2] * d2[2]]);
  pul = nor(pul);
  const a = rad((arma === 'garras' || arma === 'puno' || arma === 'katar' || arma === 'cestus' ? 0 : arma === 'lanza' || arma === 'alabarda' || asta(arma) ? 82 : dos(arma) ? 58 : arma === 'daga' || arma === 'varita' || arma === 'orbe_mano' || arma === 'hoz' || arma === 'frasco' ? 55 : 66) + muneca);
  return nor(add([d2[0] * Math.cos(a), d2[1] * Math.cos(a), d2[2] * Math.cos(a)], pul, Math.sin(a)));
}

// ------------------------------------------------------------------ partes de la carne (con inflado para la ropa)
type Parte = 'pelvis' | 'abdomen' | 'pecho' | 'hombros' | 'cuello' | 'brazo' | 'antebrazo' | 'mano' | 'muslo' | 'pantorrilla' | 'pie' | 'cabeza' | 'craneo';
/** Las partes del cuerpo como componentes de masa, `grosor` unidades más gruesas (la prenda), con el material dado. */
function partes(e: Esqueleto, cu: Cuerpo, que: Parte[], grosor: number, mat?: string, extra: { mangaCorta?: boolean; hasta?: number; liso?: boolean } = {}): Comp[] {
  const { S, A, T, cab, ejesT, ejesCab } = e;
  const inf = grosor;
  const mu = cu.musculo ?? 0.4, gr = cu.grasa ?? 0, mujer = cu.genero === 'm';
  // la anatomía (abdominales, pectorales separados) solo se marca en la piel desnuda: como capa de ropa, o como carne
  // tapada por una prenda (`liso`), el torso es la superficie lisa de la prenda
  const desnudo = grosor < 0.2 && !extra.liso;
  const tiene = (p: Parte) => que.includes(p);
  const o = { mat };
  const cs: Comp[] = [];
  const bT = (fw: number, rt: number, up: number, r: V3, k?: number) => bulto(T(fw, rt, up), [r[0] + inf, r[1] + inf, r[2] + inf], { ejes: ejesT, mat, k });
  const zc = e.zc, hz = e.hombroZ;
  if (tiene('pelvis')) {
    const Pv = e.Pv ?? e.W, ejesP = ejesDe(Pv, [0, 0, zc]);
    cs.push(bulto(Pv(0, 0, zc + 0.6 * S), [3.7 * A + inf, (mujer ? 5.6 : 4.9) * A + inf, 4.1 * S + inf], { ejes: ejesP, mat }));
    for (const s of [1, -1]) cs.push(bulto(Pv(-2.3 * A, s * 2.4 * A, zc - 0.8 * S), [2.6 * A + inf, 2.7 * A + inf, 3.2 * S + inf], { ejes: ejesP, mat }));
  }
  if (tiene('abdomen')) {
    cs.push(bT(0.5 * S + gr * 1.5, 0, zc + 6.2 * S, [3.4 * A + gr * 2.2, (mujer ? 4.0 : 4.4) * A + gr * 1.2, 4.6 * S]));
    if (mu > 0.55 && desnudo) for (let i = 0; i < 3; i++) for (const s of [1, -1]) cs.push(bT(3.1 * A, s * 1.25 * A, zc + (4.2 + i * 2.5) * S, [0.9 * A, 1.3 * A, 1.15 * S], 1.2));
  }
  if (tiene('pecho')) {
    const rs = e.pose?.respira ?? 0;
    cs.push(bT((0.2 + rs * 0.35) * S, 0, zc + (12.3 + rs * 0.3) * S, [(4.0 + rs * 0.45) * A + gr, (mujer ? 4.9 : 5.7 + mu * 0.6 + rs * 0.3) * A, (5.4 + rs * 0.25) * S]));
    if (mujer) {
      // busto discreto: dos formas bajas y anchas que se funden en una sola bajo la prenda (nunca dos esferas)
      for (const s of [1, -1]) cs.push(bT(2.75 * A, s * 1.85 * A, zc + 12.6 * S, [1.65 * A, 1.95 * A, 1.7 * S], desnudo ? 1.6 : 2.0));
    } else if (desnudo) for (const s of [1, -1]) {
      // pectoral de hombre: una placa ancha y plana que sube hacia la axila, con el borde de abajo recto (un listón
      // horizontal la cierra) y la línea del esternón entre las dos; nunca un hemisferio
      const [ex, ey, ez] = ejesT, sube = 0.22 * s; // la placa se inclina: el borde de afuera sube hacia la axila
      const eyP = nor(add(ey, ez, sube)), ezP = nor(add(ez, ey, -sube));
      cs.push(bulto(T(2.95 * A, s * 2.8 * A, zc + 13.9 * S), [(0.7 + mu * 0.45) * A, (2.7 + mu * 0.35) * A, (1.6 + mu * 0.3) * S], { ejes: [ex, eyP, ezP], mat, k: 0.9 }));
      cs.push(hueso(T(3.4 * A, s * 0.55 * A, zc + 12.45 * S), T(3.0 * A, s * 4.4 * A, zc + 13.1 * S), 0.7 * S, 0.6 * S, { mat, k: 0.6 }));
    } else cs.push(bT(2.3 * A, 0, zc + 13.4 * S, [(1.1 + mu * 0.4) * A, (4.3 + mu * 0.5) * A, (2.3 + mu * 0.3) * S], 2.4)); // pecho ancho y liso bajo la prenda
  }
  if (tiene('hombros')) for (const s of [1, -1]) {
    // trapecio del cuello al hombro y el deltoides sobre la cabeza del brazo
    const b = e.brazos.find((x) => x.s === s)!;
    const sube = (e.pose?.hombros?.[s > 0 ? 0 : 1] ?? 0) * S;
    cs.push(hueso(T(-0.6 * S, s * 1.4 * A, hz + 3 * S + sube * 0.3), T(-0.2 * S, s * 5.4 * A, hz + 0.8 * S + sube), (1.7 + mu * 0.6) * A + inf, (1.4 + mu * 0.3) * A + inf, o));
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
      // (en el tobillo la prenda sube medio grosor, como la bota: no asoma bajo la planta)
      const fin = add(extra.hasta !== undefined ? mez(p.rod, p.tob, extra.hasta) : p.tob, [0, 0, inf * 0.5]);
      cs.push(hueso(p.rod, fin, 2.2 * A + inf, 1.3 * A + inf, o));
      // gemelo atrás de la pierna
      const pa = nor(sub(p.tob, p.rod)), atras = nor(add(cruz(cruz(pa, e.F), pa), [0, 0, 0]));
      cs.push(bulto(add(mez(p.rod, p.tob, 0.3), atras, -0.6 * A), [4.4 * S + inf * 0.5, (2.0 + mu * 0.4) * A + inf, (2.1 + mu * 0.4) * A + inf], { eje: pa, mat }));
    }
    if (tiene('pie')) {
      // la bota envuelve el pie por arriba y a los costados, pero la suela queda a ras de la planta: el hueso se sube
      // medio grosor y engorda medio grosor (si engordara entero hacia abajo, la bota se hundiría en el piso)
      const sube: V3 = [0, 0, inf * 0.5];
      cs.push(hueso(add(p.talon, sube), add(p.punta, sube), PIE_TALON * A + inf * 0.5, PIE_PUNTA * A + inf * 0.5, o));
      cs.push(bulto(add(p.tob, sube), [1.5 * A + inf, 1.5 * A + inf, 1.7 * S + inf * 0.5], { mat }));
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
export function personajeEscena(cu: Cuerpo, eq: Equipo, dir: Dir, acc: Accion, f: number): { piezas: Pieza[]; resplandor?: { c: V3; r: number; color: string }; luz: Iluminacion } {
  const piezas = personaje(cu, eq, dir, acc, f);
  // clave baja (clave_baja.ts): viaja con la escena, así el horneado del juego la recibe sin cambiar su llamada
  const luz = claveBaja(piezas);
  const en = eq.arma?.encanto;
  if (!en || !eq.arma) return { piezas, luz };
  const e = esqueleto(cu, dir, acc, f, eq.arma.tipo, eq.izq?.tipo);
  const [a, b] = filoDe(e, eq.arma.tipo, e.brazos[0]);
  if (eq.arma.nivel) return { piezas, luz, resplandor: { c: mez(a, b, 0.5), r: (11 + eq.arma.nivel * 2.2) * e.S, color: LUZ_ELEMENTO_ARMA[en].color } };
  return { piezas, luz, resplandor: { c: mez(a, b, 0.5), r: 15 * e.S, color: ENCANTOS.find((x) => x[0] === en)![3] } };
}

export function personaje(cu: Cuerpo, eq: Equipo, dir: Dir, acc: Accion, f: number): Pieza[] {
  const tipoArma = eq.arma?.tipo ?? 'nada';
  const e = esqueleto(cu, dir, acc, f, tipoArma, eq.izq?.tipo);
  const { S, A, T, cab, ejesCab, F, R } = e;
  // el cuadro llevado a un ciclo de 8 (los vaivenes de colas, jirones y adornos cierran el ciclo con cualquier cantidad de cuadros)
  const f8 = (f * 8) / cuadrosDe(acc, cu.presentacion);
  const H = (cu.cabeza ?? 1) * S, cz = e.cz;
  const ps: Pieza[] = [];
  const todo: Parte[] = ['pelvis', 'abdomen', 'pecho', 'hombros', 'cuello', 'brazo', 'antebrazo', 'mano', 'muslo', 'pantorrilla', 'pie', 'cabeza'];
  // carne (o huesos)
  if (cu.oseo) ps.push(...huesos(e, cu));
  else {
    // con una prenda en el torso la carne va lisa: ni abdominales ni pectorales que asomen por la ropa
    let carne = partes(e, cu, cu.flota ? todo.filter((p) => p !== 'pantorrilla' && p !== 'pie') : todo, 0, undefined, { liso: !!eq.torso });
    if (cu.parches) carne = carne.map((c, i) => (i % 3 === 1 ? { ...c, mat: cu.parches } : c));
    if (cu.demacrado && !eq.torso) for (let k = 0; k < 5; k++) for (const s of [1, -1]) {
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
    const u = ((f8 + k * 1.3) % 8) / 8, an = k * 0.9 + u * 2;
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
      ps.push(masa(partes(e, cu, ['pelvis', 'muslo'], 0.45, pz.mat2 ?? 'cu_malla'), { mat: pz.mat2 ?? 'cu_malla', suave: 1.6 }));
      ps.push(masa(partes(e, cu, ['pantorrilla'], 1.1, pz.mat), { mat: pz.mat, suave: 0.8 }));
      // quijote: tubo de placa que encierra el muslo de cuero con su cuádriceps, con el canto de abajo marcado; rodillera
      // en punta (copa con quilla, una lámina arriba y otra abajo y la aleta de afuera) en vez de una bola; greba con el
      // borde de arriba acampanado y la arista de la canilla. A escala de juego la pierna se lee por piezas
      const Pq = e.Pv ?? e.W, fwP = nor(sub(Pq(1, 0, e.zc), Pq(0, 0, e.zc)));
      for (const p of e.piernas) {
        const dm = nor(sub(p.rod, p.cad)), dc = nor(sub(p.tob, p.rod)), eje = nor(add(dm, dc));
        let fr = sub(fwP, mulv(eje, dot3(fwP, eje))); if (len(fr) < 0.2) fr = [0, 0, 1]; fr = nor(fr);
        const lado = nor(cruz(eje, fr)), ej: [V3, V3, V3] = [lado, fr, cruz(lado, fr)], m = pz.mat;
        ps.push(masa([hueso(mez(p.cad, p.rod, 0.15), mez(p.cad, p.rod, 0.82), 3.7 * A + 1.0 * S, 2.9 * A + 1.0 * S, { mat: m })], { mat: m }));
        ps.push(masa([hueso(mez(p.cad, p.rod, 0.76), mez(p.cad, p.rod, 0.84), 3.15 * A + 1.0 * S, 3.1 * A + 1.0 * S, { mat: m, tono: -0.16 })], { mat: m, tono: -0.16 }));
        ps.push(masa([bulto(add(p.rod, fr, 0.9 * A), [2.5 * A + 0.5, 1.9 * A + 0.6, 2.2 * A + 1.0], { ejes: ej, mat: m, tono: 0.08 }),
          hueso(add(p.rod, fr, 2.2 * A + 0.5), add(p.rod, fr, 3.5 * A + 0.9), 1.0 * S, 0.2 * S, { mat: m, tono: 0.12 })], { mat: m, suave: 0.35 * S, tono: 0.08 }));
        ps.push(masa([bulto(add(add(p.rod, dm, -2.3 * S), fr, 0.8 * A), [2.7 * A + 0.5, 1.9 * A + 0.5, 1.0 * S], { ejes: ej, mat: m, tono: -0.08 })], { mat: m, suave: 0.15 * S, tono: -0.08 }));
        ps.push(masa([bulto(add(add(p.rod, dc, 2.3 * S), fr, 0.7 * A), [2.6 * A + 0.5, 1.8 * A + 0.5, 1.0 * S], { ejes: ej, mat: m, tono: -0.08 })], { mat: m, suave: 0.15 * S, tono: -0.08 }));
        ps.push(masa([bulto(add(p.rod, lado, p.s * (2.5 * A + 0.5)), [0.6 * S, 1.8 * A, 1.9 * S], { ejes: ej, mat: m, tono: 0.12 })], { mat: m, suave: 0.15 * S, tono: 0.12 }));
        ps.push(masa([hueso(mez(p.rod, p.tob, 0.2), mez(p.rod, p.tob, 0.27), 2.75 * A + 1.25, 2.6 * A + 1.2, { mat: m, tono: -0.16 })], { mat: m, tono: -0.16 }));
        ps.push(masa([hueso(add(mez(p.rod, p.tob, 0.3), fr, 2.2 * A + 0.9), add(mez(p.rod, p.tob, 0.88), fr, 1.6 * A + 0.8), 0.6 * S, 0.4 * S, { mat: m, tono: 0.14 })], { mat: m, tono: 0.14 }));
      }
    } else if (pz.tipo === 'taparrabo') {
      ps.push(masa(partes(e, cu, ['pelvis'], 0.5, pz.mat), { mat: pz.mat }));
      ps.push(faldon(e, pz.mat, 9, 1.05, acc, f));
    } else if (pz.tipo === 'faldon') {
      ps.push(masa(partes(e, cu, ['pelvis', 'muslo', 'pantorrilla'], 0.5, pz.mat2 ?? 'cu_tela_parda'), { mat: pz.mat2 ?? 'cu_tela_parda', suave: 1.6 }));
      ps.push(faldon(e, pz.mat, 15, 1.25, acc, f));
    } else if (pz.tipo === 'tunica_larga') ps.push(faldon(e, pz.mat, 30, 1.5, acc, f));
  }
  if (pi) {
    if (pi.tipo === 'sandalias') for (const p of e.piernas) {
      // la suela: una lámina chata bajo la planta, apoyada en el piso, un poco más ancha que el pie
      const ex = nor(sub(p.punta, p.talon)), ey = nor(cruz([0, 0, 1], ex)), ez = cruz(ex, ey), L = len(sub(p.punta, p.talon));
      const planta = add(mez(p.talon, p.punta, 0.5), ez, -((PIE_TALON + PIE_PUNTA) / 2) * A + 0.45);
      ps.push(masa([bulto(planta, [L / 2 + 1.7 * A, 1.75 * A, 0.5], { ejes: [ex, ey, ez], mat: pi.mat })], { mat: pi.mat }));
      // y las tiras que cruzan el empeine
      for (const t of [0.35, 0.75]) ps.push(masa([hueso(add(add(mez(p.talon, p.punta, t), ey, 1.5 * A), ez, -0.4), add(add(mez(p.talon, p.punta, t), ey, -1.5 * A), ez, -0.4), 0.42, 0.42, { mat: pi.mat }), bulto(add(mez(p.talon, p.punta, t), ez, 0.85 * A), [0.5, 1.45 * A, 0.42], { ejes: [ex, ey, ez], mat: pi.mat })], { mat: pi.mat, suave: 0.6 }));
    }
    else {
      const alto = pi.tipo === 'botas_altas' || pi.tipo === 'sabatones' ? 0.3 : pi.tipo === 'vendas' ? 0.55 : 0.55;
      ps.push(masa(partes(e, cu, ['pantorrilla', 'pie'], pi.tipo === 'sabatones' ? 1.2 : 0.8, pi.mat, { hasta: 1 }).filter((c) => c.f === 'hueso' ? true : true).map((c) => c), { mat: pi.mat, suave: 1.2 }));
      void alto;
      for (const p of e.piernas) {
        const dc = nor(sub(p.tob, p.rod)), ex = nor(sub(p.punta, p.talon));
        if (pi.tipo === 'sabatones') {
          // escarpe de láminas: tres placas que cruzan el empeine, la punta afilada y el tobillo marcado
          const ey = nor(cruz([0, 0, 1], ex)), ez = cruz(ex, ey);
          for (let k = 0; k < 3; k++) ps.push(masa([bulto(add(mez(p.tob, p.punta, 0.3 + k * 0.26), ez, (1.0 - k * 0.3) * A), [1.0 * S, (2.1 - k * 0.15) * A + 1.0, (1.5 - k * 0.2) * A + 0.8], { ejes: [ex, ey, ez], mat: pi.mat, tono: k % 2 ? -0.12 : 0.08 })], { mat: pi.mat, suave: 0.12 * S, tono: k % 2 ? -0.12 : 0.08 }));
          ps.push(masa([hueso(add(p.punta, [0, 0, 0.3 * A]), add(add(p.punta, ex, 1.9 * S), [0, 0, -0.2 * A]), 1.3 * A + 0.6, 0.25 * S, { mat: pi.mat, tono: 0.05 })], { mat: pi.mat, tono: 0.05 }));
          ps.push(masa([hueso(add(p.tob, dc, -1.2 * S), add(p.tob, dc, -0.5 * S), 2.25 * A + 1.3, 2.2 * A + 1.3, { mat: pi.mat, tono: -0.16 })], { mat: pi.mat, tono: -0.16 }));
        } else if (pi.tipo !== 'vendas') {
          // bota: el puño vuelto arriba de la caña, la correa del tobillo y la suela oscura con su taco
          const arriba = pi.tipo === 'botas_altas' ? 0.16 : 0.42;
          ps.push(masa([hueso(mez(p.rod, p.tob, arriba), mez(p.rod, p.tob, arriba + 0.1), 2.65 * A + 1.0, 2.5 * A + 0.95, { mat: pi.mat, tono: -0.15 })], { mat: pi.mat, tono: -0.15 }));
          ps.push(masa([hueso(add(p.tob, dc, -0.9 * S), add(p.tob, dc, -0.3 * S), 2.1 * A + 0.95, 2.1 * A + 0.95, { mat: pi.mat, tono: -0.2 })], { mat: pi.mat, tono: -0.2 }));
        }
      }
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
    // el cuero claro va un tono más oscuro que la piel morena, para que el jubón no se lea como torso desnudo
    ps.push(masa(partes(e, cu, base, inf, matBase, { mangaCorta: to.tipo === 'cuero' || to.tipo === 'cuero_tachonado' }), { mat: matBase, suave: 1.6, tono: matBase === 'cu_cuero' ? -0.12 : undefined }));
    if (to.tipo === 'tunica' || to.tipo === 'harapos') ps.push(faldon(e, to.mat, to.tipo === 'harapos' ? 13 : 12, 1.2, acc, f));
    if (to.tipo === 'vestido') ps.push(faldon(e, to.mat, 29, 1.7, acc, f));
    if (to.tipo === 'cuero_tachonado') for (let i = 0; i < 4; i++) for (const s of [1, -1, 0]) ps.push(esfera(...T(3.9 * A + 0.6, s * 2.6 * A, e.zc + (5 + i * 3) * S), 0.5, { mat: 'cu_placa' }));
    if (to.tipo === 'malla' && cu.presentacion && !to.linea) ps.push(...mallaForjada(e, cu, to));
    if (to.tipo === 'placas') {
      // peto curvo, espaldar, faldares y el borde dorado
      // los héroes llevan la coraza forjada por láminas (armadura.ts); las líneas épicas y los monstruos, la de siempre
      if (cu.presentacion && !to.linea) ps.push(...petoForjado(e, cu, to, to.adorno));
      else {
        const peto = partes(e, cu, ['abdomen', 'pecho'], 1.5, to.mat);
        ps.push(masa(peto, { mat: to.mat, suave: 2.4 }));
        for (let i = 0; i < 3; i++) ps.push(cilindro(...(e.Pv ?? e.W)(0, 0, e.zc - 2 * S - i * 2.6 * S), (5.6 + i * 0.35) * A, 2.4 * S, { mat: to.mat, r1: (5.3 + i * 0.35) * A, tono: -i * 0.03 }));
        ps.push(elipsoide(...T(4.9 * A, 0, e.zc + 15.2 * S), 0.6, 4.4 * A, 0.7, { mat: acentoDe(to.linea), giro: 0 }));
      }
      // brazos de placa: brazal superior, codera con aleta y remache, para que el brazo lea como armadura y no como maniquí
      for (const b of e.brazos) {
        const lado = nor(cruz(b.d1, [0, 0, 1]));
        ps.push(masa([hueso(mez(b.hom, b.codo, 0.28), mez(b.hom, b.codo, 0.86), 2.15 * A, 1.9 * A, { mat: to.mat })], { mat: to.mat }));
        ps.push(masa([bulto(b.codo, [2.2 * A, 2.2 * A, 2.0 * S], { eje: b.d1, mat: to.mat, tono: 0.06 }), bulto(add(add(b.codo, lado, b.s * 1.2 * A), b.d1, -0.4 * S), [0.8 * A, 2.0 * A, 1.7 * S], { eje: b.d1, mat: to.mat, tono: 0.1 })], { mat: to.mat, suave: 0.6 }));
        ps.push(esfera(...add(b.codo, lado, b.s * 2.1 * A), 0.45, { mat: acentoDe(to.linea) }));
      }
    }
    if (to.tipo === 'cuero') ps.push(palo(T(4.2 * A, 4.5 * A, e.zc + 17 * S), T(4.4 * A, -4 * A, e.zc + 3 * S), 0.55 * S, { mat: 'cu_cuero_negro' }));
    if (to.tipo === 'cuero' || to.tipo === 'cuero_tachonado') {
      // el jubón se lee como prenda y no como piel (el cuero y la piel morena tienen el mismo tono): cuello alto,
      // costura de lazo al frente y ribete en el ruedo y en las mangas, en cuero oscuro
      const ribete = to.mat === 'cu_cuero_negro' ? 'cu_cuero' : 'cu_cuero_negro';
      ps.push(masa([hueso(T(-0.4 * S, 0, e.hombroZ + 0.2 * S), cab(0.1 * S, 0, e.cz - 3.6 * S), 2.75 * S, 2.45 * S, { mat: ribete })], { mat: ribete }));
      ps.push(masa([hueso(T(4.35 * A + 0.5, 0, e.zc + 15.6 * S), T(4.15 * A + 0.5, 0, e.zc + 9.5 * S), 0.42 * S, 0.42 * S, { mat: ribete }), hueso(T(4.15 * A + 0.5, 0, e.zc + 9.5 * S), T(3.85 * A + 0.5, 0, e.zc + 3.5 * S), 0.42 * S, 0.42 * S, { mat: ribete })], { mat: ribete, suave: 0.4 }));
      ps.push(cilindro(...(e.Pv ?? e.W)(0, 0, e.zc + 0.2 * S), 4.85 * A, 1.1 * S, { mat: ribete, r1: 4.75 * A }));
      for (const b of e.brazos) ps.push(cilindro(...mez(b.hom, b.codo, 0.5), 2.45 * A, 0.9 * S, { mat: ribete, r1: 2.4 * A, eje: b.d1 }));
    }
  }
  if (eq.tabardo) {
    const tb = eq.tabardo, sobre = eq.torso?.tipo === 'placas' ? 1.6 * A : 0, fw = 4.6 * A + 1.2 + sobre;
    const giro = angulo(e.ejesT[0]), incl = -inclinacion(e.ejesT[2], e.ejesT[0]);
    if (e.caida) {
      // tumbado: el tabardo entero sigue al torso
      ps.push(caja(...T(fw, 0, e.zc - 10 * S), 0.8, 5.4 * A, 26 * S, { mat: tb.mat, giro, incl, inclEje: 'y' }));
      if (tb.borde) ps.push(caja(...T(fw + 0.2, 0, e.zc - 10 * S), 0.5, 1.2 * A, 26 * S, { mat: tb.borde, giro, incl, inclEje: 'y' }));
    } else {
      // el pecho del tabardo sigue al torso; el faldón cuelga del cinto a plomo y se adelanta lo justo para pasar por
      // delante de muslos, rodillas y canillas (rígido con el torso, al inclinarse se metía entre las piernas y la pierna
      // que avanza lo atravesaba)
      ps.push(caja(...T(fw, 0, e.zc + 0.5 * S), 0.8, 5.4 * A, 15.5 * S, { mat: tb.mat, giro, incl, inclEje: 'y' }));
      if (tb.borde) ps.push(caja(...T(fw + 0.2, 0, e.zc + 0.5 * S), 0.5, 1.2 * A, 15.5 * S, { mat: tb.borde, giro, incl, inclEje: 'y' }));
      const Pv = e.Pv ?? e.W, arriba = Pv(fw, 0, e.zc + 1.2 * S);
      const fH = nor([e.ejesT[0][0], e.ejesT[0][1], 0]), lado = nor(cruz([0, 0, 1], fH)), caeZ = 11.2 * S;
      let adel = 0;
      for (const p of e.piernas) for (const [q, r] of [[mez(p.cad, p.rod, 0.5), 2.9 * A], [p.rod, 2.7 * A], [mez(p.rod, p.tob, 0.4), 2.4 * A], [p.tob, 2.0 * A]] as [V3, number][]) {
        const t = (arriba[2] - q[2]) / caeZ;
        if (t < 0.15 || t > 1.15) continue;
        adel = Math.max(adel, (dot3(sub(q, arriba), fH) + r + 0.5) / Math.min(1, t));
      }
      adel = Math.min(adel, 16 * S);
      const abajo = add(add(arriba, [0, 0, -caeZ]), fH, adel), haciaFuera = nor(cruz(nor(sub(abajo, arriba)), lado));
      const hoja = (a: V3, b: V3, ancho: number, grueso: number, mat: string) => {
        const pts: V3[] = [];
        for (const q of [a, b]) for (const sy of [-1, 1]) for (const sn of [-1, 1]) pts.push(add(add(q, lado, sy * ancho / 2), haciaFuera, sn * grueso / 2));
        return poliedro(pts, { mat });
      };
      ps.push(hoja(arriba, abajo, 5.4 * A, 0.8, tb.mat));
      if (tb.borde) ps.push(hoja(add(arriba, haciaFuera, 0.2), add(abajo, haciaFuera, 0.2), 1.2 * A, 0.5, tb.borde));
    }
  }
  if (eq.cinturon && cu.presentacion && !eq.cinturon.linea) ps.push(...cintoForjado(e, cu, eq.cinturon));
  else if (eq.cinturon) {
    ps.push(cilindro(...(e.Pv ?? e.W)(0, 0, e.zc + 1.6 * S), (4.6 + (cu.grasa ?? 0) * 1.5) * A, 2.2 * S, { mat: eq.cinturon.mat, r1: (4.8 + (cu.grasa ?? 0) * 1.5) * A }));
    const Pv = e.Pv ?? e.W;
    ps.push(caja(...Pv(4.7 * A, 0, e.zc + 1.4 * S), 0.9, 2.4 * S, 2.6 * S, { mat: eq.cinturon.hebilla ?? 'cu_oro', giro: angulo(sub(Pv(1, 0, e.zc), Pv(0, 0, e.zc))) }));
  }
  // ---- manos
  if (eq.manos) {
    const mn = eq.manos;
    const inf = mn.tipo === 'guanteletes' ? 0.9 : 0.45;
    ps.push(masa(partes(e, cu, ['mano', 'antebrazo'], inf, mn.mat, { hasta: 1 }), { mat: mn.mat, suave: 1.2 }));
    // guanteletes: brazal acampanado hacia el puño y nudillos de placa
    if (mn.tipo === 'guanteletes') for (const b of e.brazos) {
      ps.push(masa([hueso(mez(b.codo, b.mun, 0.25), mez(b.codo, b.mun, 1.02), 1.75 * A, 2.15 * A, { mat: mn.mat, tono: 0.04 })], { mat: mn.mat }));
      ps.push(cilindro(...add(b.mun, b.d2, -0.6 * S), 2.25 * A, 0.7 * S, { mat: mn.linea ? acentoDe(mn.linea) : mn.mat === 'cu_oro' ? 'cu_placa' : 'cu_oro', r1: 2.3 * A, eje: b.d2 }));
    }
  }
  // ---- hombreras: láminas solapadas que bajan por el brazo y se abren hacia afuera, cada una con su borde (nada de
  // bolas: a escala de juego se tienen que leer las capas y el canto de cada placa)
  if (eq.hombros) for (const b of e.brazos) {
    const h = eq.hombros, c = add(b.hom, [0, 0, 1.4 * S]);
    const fuera = nor(sub(b.hom, T(0, 0, e.hombroZ)));
    const ade = e.ejesT[0], Zl: V3 = [0, 0, 1];
    /** La lámina `i` (0 = la de arriba): ancho (adelante-atrás), largo (cuesta abajo) y grueso; `borde` es el material del canto de abajo. */
    const lamina = (i: number, mat: string, an: number, la: number, gr: number, tono: number, borde?: string) => {
      const n = nor(add(mulv(Zl, 1 - 0.3 * i), fuera, 0.55 + 0.45 * i));
      const ej = ejes3(ade, n), cae: V3 = ej[1][2] > 0 ? mulv(ej[1], -1) : ej[1];
      const cen = add(add(add(c, fuera, (0.7 + 1.0 * i) * A), b.d1, (i * 1.75 - 0.3) * S), Zl, 0.25 * S);
      ps.push(masa([bulto(cen, [an * A, la * S, gr * S], { ejes: ej, mat, tono })], { mat, suave: 0.2 * S }));
      const bm = borde ?? mat;
      ps.push(masa([bulto(add(add(cen, cae, la * 0.86 * S), n, -0.12 * S), [an * 1.03 * A, 0.5 * S, gr * 1.12 * S], { ejes: ej, mat: bm, tono: borde ? 0 : tono - 0.16 })], { mat: bm, suave: 0.12 * S }));
    };
    if (h.tipo === 'placas') {
      const ac = acentoDe(h.linea);
      lamina(2, h.mat, 3.3, 1.9, 0.75, -0.08, ac); lamina(1, h.mat, 3.9, 2.1, 0.8, -0.02); lamina(0, h.mat, 4.3, 2.4, 0.85, 0.06);
      // el guardacuello: una pestaña que sube del borde de adentro, y el remache
      ps.push(masa([bulto(add(add(c, fuera, -0.7 * A), Zl, 1.9 * S), [2.7 * A, 1.9 * S, 0.42 * S], { ejes: ejes3(ade, add(fuera, Zl, -0.25)), mat: h.mat, tono: -0.05 })], { mat: h.mat, suave: 0.15 * S }));
      ps.push(elipsoide(...add(add(c, fuera, 1.5 * A), Zl, 1.9 * S), 0.5, 0.5, 0.5, { mat: ac }));
    }
    else if (h.tipo === 'puas') {
      // hombrera de placa lisa con una lámina debajo y un remache (no una bola con púas en abanico, que de lejos se lee
      // como una mano abierta junto a la cara) y un solo cuerno de metal oscuro, grueso y curvo, que barre hacia atrás y
      // afuera casi horizontal: nunca sube junto a la cabeza
      const atras = mulv(e.ejesT[0], -1), Zh: V3 = [0, 0, 1];
      const lam = (k: number, z: number): V3 => add(add(c, fuera, k * A), Zh, z * S);
      ps.push(masa([bulto(lam(1.0, 0), [4.5 * A, 4.1 * A, 1.9 * S], { mat: h.mat }), bulto(lam(2.3, -1.9), [3.7 * A, 3.5 * A, 1.0 * S], { mat: h.mat, tono: -0.08 })], { mat: h.mat, suave: 0.35 }));
      ps.push(esfera(...lam(1.4, 1.75), 0.55 * S, { mat: acentoDe(h.linea) }));
      const a = add(lam(2.2, 0.6), atras, 0.8 * S), d1 = nor(add(add(fuera, atras, 0.45), Zh, 0.12)), d2 = nor(add(add(fuera, atras, 1.2), Zh, 0.02)), m = add(a, d1, 3.6 * S);
      ps.push(masa(cadenaHuesos([a, m, add(m, d2, 4.0 * S)], 1.45 * A, 0.12 * S, h.mat, -0.16), { mat: h.mat, suave: 0.3 }));
    }
    else if (h.tipo === 'huesos') {
      // dos placas de hueso y un colmillo que sube hacia afuera
      lamina(1, 'cu_hueso', 3.4, 2.0, 0.8, -0.1); lamina(0, 'cu_hueso', 3.9, 2.3, 0.9, 0.02);
      ps.push(palo(add(c, fuera, 2), add(add(c, fuera, 4), [0, 0, 5]), 0.9, { mat: 'cu_hueso', r1: 0.2 }));
    }
    else if (h.tipo === 'pieles') {
      // la piel echada al hombro: un lomo y mechones que caen desparejos por delante, por fuera y por detrás
      const cs: Comp[] = [bulto(add(c, fuera, 0.4 * A), [3.7 * A, 3.3 * A, 2.2 * S], { mat: h.mat })];
      for (let k = 0; k < 7; k++) {
        const a = rad(-78 + k * 26), sn = Math.sin(a), cn = Math.cos(a);
        const ini = add(add(add(c, ade, sn * 2.5 * A), fuera, (0.3 + cn * 1.3) * A), Zl, (0.3 + cn * 0.5) * S);
        const dir = nor(add(add(mulv(fuera, 0.35 + cn * 0.55), ade, sn * 0.75), Zl, -0.85));
        cs.push(hueso(ini, add(ini, dir, (3.3 + (k % 2) * 1.3 + (k === 3 ? 0.8 : 0)) * S), 1.45 * S, 0.22 * S, { mat: h.mat, tono: k % 2 ? -0.1 : 0.06 }));
      }
      ps.push(masa(cs, { mat: h.mat, suave: 0.55 * S }));
    }
    else {
      // cuero: dos láminas gruesas con el canto oscuro y la correa que la sujeta
      lamina(1, h.mat, 3.5, 2.1, 0.9, -0.1); lamina(0, h.mat, 4.1, 2.5, 0.95, 0.03);
      ps.push(elipsoide(...add(add(c, fuera, 1.2 * A), Zl, 2.0 * S), 0.45, 0.45, 0.45, { mat: 'hierro' }));
    }
  }
  // ---- capa: lámina de bultos planos que cuelga de los hombros y se mece al caminar
  if (eq.capa) ps.push(capa(e, eq.capa.mat, eq.capa.largo ?? 1, acc, f, pi ? (pi.tipo === 'sabatones' ? 1.2 : pi.tipo === 'sandalias' ? 0 : 0.8) : 0));
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
      // el pelo largo cuelga del cráneo y sus puntas se arrastran con la inercia (pelo de la pose)
      const [pa, pl] = e.pose?.pelo ?? [0, 0];
      const Tp = (fw: number, rt: number, up: number, k = 1) => T(fw - pa * k * S, rt + pl * k * S, up + Math.max(0, pa) * k * 0.3 * S);
      if (cu.peinado === 'largo' || cu.peinado === 'melena') {
        const ancho = cu.peinado === 'melena' ? 1.3 : 1;
        pc.push(hueso(cab(-2.6 * H, 0, cz + 1 * H), Tp(-4.4 * S, 0, e.hombroZ - (cu.peinado === 'melena' ? 4 : 8) * S), 3.6 * H * ancho, 2.6 * H * ancho));
        for (const s of [1, -1]) pc.push(hueso(cab(-0.6 * H, s * 3.4 * H, cz), Tp(-1.5 * S, s * 4.2 * A, e.hombroZ - 2.5 * S, 0.5), 1.8 * H * ancho, 1.4 * H * ancho));
      }
      if (cu.peinado === 'cola') { const a = cab(-3.4 * H, 0, cz + 1.6 * H), b = Tp(-5.6 * S, 0, e.hombroZ - 2 * S, 0.5), c = Tp(-6 * S, 0, e.hombroZ - 11 * S, 1.6); pc.push(hueso(a, b, 1.6 * H, 1.3 * H), hueso(b, c, 1.3 * H, 0.5 * H)); }
      if (cu.peinado === 'trenzas') for (const s of [1, -1]) for (let i = 0; i < 4; i++) pc.push(bulto(mez(cab(-1.2 * H, s * 3.4 * H, cz - 1 * H), Tp(0.5 * S, s * 4.4 * A, e.hombroZ - 8 * S), i / 3.5), [1.2 * H, 1.1 * H, 1.5 * H], { k: 0.5 }));
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
    const ondea = Math.sin((f8 / 8) * Math.PI * 2) * 2;
    const Pv = e.Pv ?? e.W;
    const a = Pv(-3.5 * A, 0, e.zc), b = Pv(-9 * S, ondea, e.zc - 8 * S), c = Pv(-15 * S, -ondea, e.zc - 14 * S), d = Pv(-20 * S, ondea * 1.4, 2 * S);
    ps.push(masa([hueso(a, b, 1.8 * A, 1.3 * A, { mat: cu.cola }), hueso(b, c, 1.3 * A, 0.8 * A, { mat: cu.cola }), hueso(c, d, 0.8 * A, 0.3 * A, { mat: cu.cola })], { mat: cu.cola, suave: 1.2 }));
  }
  if (cu.alas) ps.push(...alas(e, cu.alas, acc, f));
  // ---- las formas de las líneas épicas sobre cada pieza (escamas, crestas, filigrana, lava, alas, percebes...)
  ps.push(...adornos(e, cu, eq, f8));
  // ---- armas y mano izquierda
  if (eq.arma && eq.arma.tipo !== 'nada' && eq.arma.tipo !== 'puno' && nivelArma(eq.arma)) {
    // el arsenal elemental: forma forjada del nivel y capa del elemento (el cesto va en los dos puños si la izquierda está libre)
    ps.push(...armaForjadaEn(e, e.brazos[0], eq.arma, f, 7));
    if (eq.arma.tipo === 'cestus' && !eq.izq) ps.push(...armaForjadaEn(e, e.brazos[1], { ...eq.arma, encanto: undefined }, f, 9));
  } else if (eq.arma && eq.arma.tipo !== 'nada' && eq.arma.tipo !== 'puno') {
    ps.push(...arma(e, eq.arma.tipo, e.brazos[0], eq.arma.mat ?? 'cu_placa', eq.arma.mango ?? 'cu_cuero', eq.arma.gema));
    if (eq.arma.encanto) { const [a, b] = filoDe(e, eq.arma.tipo, e.brazos[0]); ps.push(...encantar(a, b, eq.arma.encanto, f, e.S, 7)); }
  }
  if (eq.izq) ps.push(...manoIzq(e, eq.izq, eq.arma?.tipo));
  if (e.pose?.objetoI === 'frasco') ps.push(...frasco(e, acc === 'presentar' ? f / CUADROS.presentar : 0));
  if (acc === 'presentar' && cu.presentacion) ps.push(...efectos(cu, eq, e, dir, f));
  if (acc === 'lanzar' && cu.presentacion === 'naturaleza') ps.push(...raices(e, f));
  void R; void F;
  return ps;
}

/** El acento de una línea épica (ribetes, remaches, puños): bronce, cuerno, filigrana, hueso, oro o percebe; oro si no hay línea. */
const acentoDe = (l?: LineaCuerpo) => (l ? MAT_LINEA[l].acento : 'cu_oro');
const mulv = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
/** Marco de un bulto chato: largo hacia `d`, la cara hacia `n` (lo más cerca posible). */
function ejes3(d: V3, n: V3): [V3, V3, V3] {
  const ex = nor(d);
  let ey = cruz(n, ex); if (len(ey) < 1e-3) ey = cruz([0, 0, 1], ex); if (len(ey) < 1e-3) ey = [0, 1, 0];
  ey = nor(ey);
  return [ex, ey, cruz(ex, ey)];
}

/**
 * Las formas de las líneas épicas sobre las piezas que las llevan: se arman después de la ropa y la armadura
 * de siempre, siguiendo el mismo esqueleto (pecho, hombros, antebrazos, rodillas, pies, cabeza y cinto).
 */
function adornos(e: Esqueleto, cu: Cuerpo, eq: Equipo, f: number): Pieza[] {
  const { S, A, T, cab } = e;
  const H = (cu.cabeza ?? 1) * S, cz = e.cz, zc = e.zc, hz = e.hombroZ, F = e.F;
  const ps: Pieza[] = [];
  const [fwd, , upT] = e.ejesT;
  const Z: V3 = [0, 0, 1];
  const late = 0.5 + 0.5 * Math.sin((f / 8) * Math.PI * 2), mece = Math.sin((f / 8) * Math.PI * 2);
  const lava = (pts: V3[], r = 0.42) => ps.push(masa(cadenaHuesos(pts, r * S, r * 0.7 * S, 'cu_lava', (late - 0.5) * 0.25), { mat: 'cu_lava', suave: 0.15 * S }));
  const un = (cs: Comp[], mat: string, suave = 0.35) => { if (cs.length) ps.push(masa(cs, { mat, suave: suave * S })); };
  const pua = (a: V3, dir: V3, L: number, r: number, mat: string, tono?: number) => hueso(a, add(a, nor(dir), L), r, 0.06 * S, { mat, tono });
  /** Racimo de percebes: conos con la boca oscura sobre la normal `n`. */
  const percebes = (c: V3, n: V3, k = 1, sem = 0) => {
    const nn = nor(n), t1 = nor(cruz(nn, Math.abs(nn[2]) > 0.9 ? [1, 0, 0] : Z)), t2 = cruz(nn, t1), cs: Comp[] = [];
    for (let i = 0; i < 4; i++) {
      const a = i * 2.1 + sem, r = (i ? 0.95 : 0) * k * S, b = add(add(c, t1, Math.cos(a) * r), t2, Math.sin(a) * r), al = (0.95 - i * 0.12) * k * S;
      cs.push(hueso(add(b, nn, -0.3 * S), add(b, nn, al), (0.6 - i * 0.06) * k * S, 0.34 * k * S, { mat: 'cu_percebe', tono: i * 0.03 }));
      ps.push(esfera(...add(b, nn, al + 0.06 * S), 0.2 * k * S, { mat: 'cu_tela_negra' }));
    }
    un(cs, 'cu_percebe', 0.3);
  };
  /** Alga que cuelga: una tira blanda que se mece más cuanto más lejos del nacimiento. */
  const alga = (pts: V3[], r = 0.45) => { const q = pts.map((p, i) => add(p, [mece * 0.7 * S * (i / pts.length), mece * 0.4 * S * (i / pts.length), 0])); un(cadenaHuesos(q, r * S, 0.16 * S, 'cu_alga'), 'cu_alga', 0.3); };
  /** Concha de vieira: costillas en abanico desde la charnela, la cara hacia `n`, abierta hacia `arriba`. */
  const concha = (c: V3, n: V3, arriba: V3, k = 1) => {
    const nn = nor(n), up = nor(sub(arriba, mulv(nn, dot3(arriba, nn)))), lado = nor(cruz(up, nn)), cs: Comp[] = [bulto(c, [0.6 * k * S, 0.5 * k * S, 0.3 * k * S], { ejes: ejes3(lado, nn), mat: 'cu_concha' })];
    for (let i = 0; i < 7; i++) { const a = rad(-63 + i * 21), d = nor(add(mulv(up, Math.cos(a)), lado, Math.sin(a))); cs.push(bulto(add(c, d, 1.15 * k * S), [1.3 * k * S, 0.42 * k * S, 0.34 * k * S], { ejes: ejes3(d, nn), mat: 'cu_concha', tono: i % 2 ? -0.07 : 0.04 })); }
    un(cs, 'cu_concha', 0.22);
  };
  /** Hoja (de árbol o de metal): bulto chato a lo largo de `d` con la cara hacia `n`. */
  const hojaB = (c: V3, d: V3, n: V3, L: number, an: number, gr: number, mat: string, tono?: number) => bulto(c, [L, an, gr], { ejes: ejes3(d, n), mat, tono });
  // el frente del torso a una altura y un corrimiento lateral (pecho o vientre), para pegar adornos a la coraza
  const frente = (rt: number, up: number) => ((up > 9 ? 0.2 * S + 5.75 * A : 0.5 * S + 5.2 * A) * Math.sqrt(Math.max(0.15, 1 - (rt / 6.6) ** 2)) + 0.12 * S);
  const Fr = (rt: number, up: number, mas = 0) => T(frente(rt, up) + mas * S, rt * A, zc + up * S);
  const normalFr = (rt: number, up: number) => nor(sub(Fr(rt, up), T(0.2 * S, 0, zc + up * S)));

  // ---------------------------------------------------------------- pecho
  const lt = eq.torso?.linea;
  if (lt === 'escamas') {
    const col: Comp[] = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; col.push(bulto(T(Math.cos(a) * 3.4 * A, Math.sin(a) * 3.9 * A, hz + 0.9 * S), [1.3 * S, 1.3 * S, 0.9 * S], { mat: 'cu_bronce' })); }
    un(col, 'cu_bronce', 0.9);
    const ruedo: Comp[] = [];
    for (let i = -3; i <= 3; i++) { const g = i * 0.3, q = T(Math.cos(g) * 5.4 * A, Math.sin(g) * 5.6 * A, zc + 2.6 * S), n = nor(sub(q, T(0, 0, zc + 2.6 * S))); ruedo.push(bulto(add(q, [0, 0, -0.4 * S]), [0.5 * S, 1.3 * S, 1.6 * S], { eje: n, mat: 'cu_escama_dragon', tono: 0.07 })); }
    un(ruedo, 'cu_escama_dragon', 0.3);
    un([bulto(Fr(0, 13, 0.1), [0.45 * S, 1.35 * S, 1.35 * S], { eje: fwd, mat: 'cu_bronce' }), bulto(Fr(0, 13, 0.45), [0.3 * S, 0.7 * S, 0.9 * S], { eje: fwd, mat: 'cu_escama_dragon', tono: 0.1 })], 'cu_bronce', 0.2);
  } else if (lt === 'draconica') {
    const cs: Comp[] = [];
    for (let i = 0; i < 3; i++) { const z = 15 - i * 3.4; cs.push(hueso(Fr(0, z, -0.3), add(Fr(0, z + 1.6, 0.9), upT, 0), 0.85 * S, 0.08 * S, { mat: 'cu_cuerno' })); }
    for (let i = 0; i < 4; i++) cs.push(pua(T(-4.4 * A, 0, zc + (17 - i * 3.3) * S), add(mulv(fwd, -1.2), upT, 0.8), (2.8 - i * 0.3) * S, 0.9 * S, 'cu_cuerno'));
    for (const s of [1, -1]) cs.push(hueso(T(1.4 * A, s * 4.2 * A, hz + 1.2 * S), T(0.3 * A, s * 5.4 * A, hz + 4.6 * S), 0.75 * S, 0.06 * S, { mat: 'cu_cuerno' }));
    un(cs, 'cu_cuerno', 0.3);
    const vientre: Comp[] = [];
    for (let k = 0; k < 3; k++) { const z = 4.4 + k * 2.2; vientre.push(...cadenaHuesos([Fr(-2.6, z), Fr(-1.2, z + 0.15), Fr(0, z + 0.2), Fr(1.2, z + 0.15), Fr(2.6, z)], 0.5 * S, 0.5 * S, 'cu_draco', -0.12)); }
    un(vientre, 'cu_draco', 0.4);
  } else if (lt === 'elfica') {
    const fil: Comp[] = [];
    for (const s of [1, -1]) {
      const pts: V3[] = [];
      for (let t = 0; t <= 16; t++) { const g = t * 0.42, r = 2.0 - t * 0.105; pts.push(Fr(s * (2.5 + Math.cos(g) * r), 12.6 + Math.sin(g) * r, 0.05)); }
      fil.push(...cadenaHuesos(pts, 0.24 * S, 0.16 * S, 'cu_filigrana'));
    }
    fil.push(...cadenaHuesos([0, 1, 2, 3, 4, 5].map((i) => Fr(Math.sin(i * 1.4) * 0.5, 16 - i * 2.4, 0.05)), 0.22 * S, 0.2 * S, 'cu_filigrana'));
    un(fil, 'cu_filigrana', 0.15);
    const hojas: Comp[] = [];
    for (let i = 0; i < 7; i++) {
      const g = -1.3 + i * 0.43, base = T(Math.cos(g) * 3.7 * A, Math.sin(g) * 4.3 * A, hz + 0.9 * S), rad0 = nor(sub(base, T(0, 0, hz + 0.9 * S))), d = nor(add(rad0, upT, -0.55));
      hojas.push(hojaB(add(base, d, 1.3 * S), d, nor(add(upT, rad0, 0.6)), 1.6 * S, 0.75 * S, 0.24 * S, i % 2 ? 'cu_filigrana' : 'cu_hoja_elfica'));
    }
    for (let i = 0; i < 4; i++) { const z = 14 - i * 2.4, s = i % 2 ? 1 : -1; hojas.push(hojaB(Fr(s * 0.9, z - 0.6, 0.15), nor(add(upT, mulv(e.R, s), 1.1)), fwd, 1.0 * S, 0.5 * S, 0.2 * S, 'cu_hoja_elfica')); }
    un(hojas, 'cu_hoja_elfica', 0.2);
  } else if (lt === 'demoniaca') {
    lava([[-0.4, 16.4], [0.9, 14.6], [-0.3, 12.8], [1.5, 11.0], [0.6, 9.2], [1.9, 7.0], [1.2, 4.8]].map(([r, z]) => Fr(r, z, 0.3)));
    lava([[-1.2, 15.4], [-2.4, 13.6], [-1.8, 11.6], [-3.2, 9.8], [-2.6, 7.6]].map(([r, z]) => Fr(r, z, 0.3)), 0.36);
    lava([[0.9, 14.6], [2.6, 15.4], [3.6, 14.2]].map(([r, z]) => Fr(r, z, 0.25)), 0.3);
    const c0 = Fr(0, 12.6, 0.2), ring: Comp[] = [];
    ps.push(esfera(...c0, 1.0 * S, { mat: 'cu_lava', tono: (late - 0.5) * 0.3 }));
    const u0 = nor(cruz(fwd, Z)), v0 = cruz(nor(fwd), u0);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; ring.push(bulto(add(add(c0, u0, Math.cos(a) * 1.55 * S), v0, Math.sin(a) * 1.55 * S), [0.55 * S, 0.55 * S, 0.55 * S], { mat: 'cu_hueso_demonio' })); }
    un(ring, 'cu_hueso_demonio', 0.4);
    const puas: Comp[] = [];
    for (const s of [1, -1]) puas.push(hueso(T(0.8 * A, s * 4.4 * A, hz + 1.2 * S), T(-0.8 * A, s * 6.6 * A, hz + 7.4 * S), 1.0 * S, 0.06 * S, { mat: 'cu_hueso_demonio' }), hueso(T(-1.6 * A, s * 3.4 * A, hz + 1.4 * S), T(-3.2 * A, s * 4.6 * A, hz + 6 * S), 0.75 * S, 0.05 * S, { mat: 'cu_hueso_demonio' }));
    for (let i = 0; i < 3; i++) puas.push(pua(T(-4.4 * A, 0, zc + (15 - i * 3.6) * S), add(mulv(fwd, -1), upT, 0.6), (3.2 - i * 0.4) * S, 0.9 * S, 'cu_hueso_demonio'));
    un(puas, 'cu_hueso_demonio', 0.3);
  } else if (lt === 'celestial') {
    const c0 = Fr(0, 12.8, 0.15), sol: Comp[] = [bulto(c0, [0.4 * S, 1.5 * S, 1.5 * S], { eje: fwd, mat: 'cu_oro' })];
    const u0 = nor(cruz(fwd, Z)), v0 = cruz(nor(fwd), u0);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, d = nor(add(mulv(u0, Math.cos(a)), v0, Math.sin(a))); sol.push(hueso(add(c0, d, 1.4 * S), add(add(c0, d, (i % 2 ? 2.7 : 3.4) * S), fwd, -0.4 * S), 0.36 * S, 0.06 * S, { mat: 'cu_oro' })); }
    un(sol, 'cu_oro', 0.2);
    ps.push(esfera(...add(c0, fwd, 0.4 * S), 0.65 * S, { mat: 'cu_luz_santa', tono: (late - 0.5) * 0.2 }));
  } else if (lt === 'ahogada') {
    percebes(Fr(-2.3, 14.4), normalFr(-2.3, 14.4), 0.85, 0);
    percebes(Fr(2.6, 6.8), normalFr(2.6, 6.8), 0.7, 1);
    percebes(Fr(3.8, 12.2), normalFr(3.8, 12.2), 0.6, 2);
    alga([T(1.5 * A, -4.6 * A, hz + 1.8 * S), Fr(-3.2, 15, 0.2), Fr(-1, 12.5, 0.2), Fr(1.2, 10, 0.2), Fr(2.6, 7.4, 0.25), Fr(3.3, 4.6, 0.25), T(5.2 * A, 3.6 * A, zc + 1 * S), T(5.0 * A, 3.8 * A, zc - 3 * S), T(4.8 * A, 3.6 * A, zc - 6 * S)]);
    alga([Fr(-3.6, 5.6, 0.2), T(5.2 * A, -3.6 * A, zc + 1.2 * S), T(5.0 * A, -3.4 * A, zc - 2.6 * S)], 0.38);
    concha(Fr(0.6, 11.6, 0.3), fwd, upT, 0.95);
  }

  // ---------------------------------------------------------------- hombreras
  const lh = eq.hombros?.linea;
  if (lh) for (const b of e.brazos) {
    const c = add(b.hom, [0, 0, 1.4 * S]), fuera = nor(sub(b.hom, T(0, 0, hz)));
    const O = (k: number, z: number, atras = 0) => add(add(add(c, fuera, k * A), Z, z * S), F, -atras * S);
    if (lh === 'escamas') {
      const cs: Comp[] = [];
      for (let i = 0; i < 3; i++) cs.push(bulto(O(0.6 + i * 1.25, 2.3 - i * 1.6), [2.6 * S, 3.0 * A, 0.75 * S], { ejes: ejes3(add(fuera, Z, -1.1), add(fuera, Z, 1.2)), mat: 'cu_escama_dragon', tono: 0.06 - i * 0.05 }));
      un(cs, 'cu_escama_dragon', 0.3);
      un([bulto(O(0.4, 3.1), [0.6 * S, 0.6 * S, 0.5 * S], { mat: 'cu_bronce' })], 'cu_bronce');
    } else if (lh === 'draconica') {
      const cs: Comp[] = [];
      for (let i = 0; i < 3; i++) { const base = O(0.5 + i * 1.3, 2.8 - i * 0.7); cs.push(...cadenaHuesos([base, add(add(add(base, fuera, 1.0 * A), Z, (2.6 - i * 0.4) * S), F, -1.2 * S), add(add(add(base, fuera, 1.4 * A), Z, (4.8 - i * 0.9) * S), F, -3.4 * S)], (1.05 - i * 0.15) * S, 0.06 * S, 'cu_cuerno')); }
      un(cs, 'cu_cuerno', 0.3);
    } else if (lh === 'elfica') {
      const d = nor(add(add(fuera, Z, -0.55), F, -0.15)), n = nor(add(fuera, Z, 1.2));
      un([hojaB(O(1.9, 0.6), d, n, 3.4 * S, 2.5 * S, 0.5 * S, 'cu_plata_elfica', 0.05), hojaB(add(O(1.6, 1.4), n, 0.35 * S), d, n, 2.4 * S, 1.5 * S, 0.35 * S, 'cu_hoja_elfica'), hueso(add(O(0.2, 2.0), n, 0.6 * S), add(O(3.6, -1.6), n, 0.4 * S), 0.2 * S, 0.12 * S, { mat: 'cu_filigrana' })], 'cu_plata_elfica', 0.2);
      const d2 = nor(add(add(Z, F, -0.7), fuera, 0.35));
      un([hojaB(add(O(0.6, 2.4, 0.8), d2, 1.6 * S), d2, nor(add(fuera, F, -0.3)), 2.0 * S, 0.8 * S, 0.22 * S, 'cu_filigrana')], 'cu_filigrana');
    } else if (lh === 'demoniaca') {
      const cs: Comp[] = [];
      for (let i = 0; i < 3; i++) cs.push(pua(O(0.4 + i * 1.3, 2.6 - i * 0.6), add(add(Z, fuera, 0.3 + i * 0.35), F, -0.2), (5.6 - i * 1.2) * S, 1.1 * S, 'cu_hueso_demonio'));
      un(cs, 'cu_hueso_demonio', 0.4);
      lava([O(0.2, 2.9), O(1.4, 2.4, 0.4), O(2.2, 1.6, -0.3), O(3.1, 0.4, 0.2)], 0.22);
    } else if (lh === 'celestial') {
      const raiz = O(0.6, 1.5, 1.6), cs: Comp[] = [];
      for (let k = 0; k < 5; k++) {
        const g = rad(10 + k * 19 + mece * 5), d = nor(add(add(mulv(Z, Math.cos(g)), fuera, Math.sin(g) * 1.2), F, -0.6)), L = (7.4 - k * 0.8) * S;
        cs.push(hojaB(add(raiz, d, L * 0.55), d, mulv(F, -1), L * 0.55, 1.05 * S, 0.28 * S, 'cu_pluma', k * 0.03));
      }
      const d0 = nor(add(add(mulv(Z, Math.cos(rad(14 + mece * 5))), fuera, Math.sin(rad(14))), F, -0.45));
      cs.push(hueso(raiz, add(raiz, d0, 5.8 * S), 0.46 * S, 0.12 * S, { mat: 'cu_oro' }));
      un(cs, 'cu_pluma', 0.35);
    } else if (lh === 'ahogada') {
      concha(O(2.1, 1.6), add(fuera, Z, 0.9), add(Z, fuera, -0.25), 1.15);
      percebes(O(0.5, 2.9, 0.6), Z, 0.75, b.s);
      alga([O(3.6, -0.6, -0.3), add(mez(b.hom, b.codo, 0.4), fuera, 2.3 * A), add(mez(b.hom, b.codo, 0.8), fuera, 2.1 * A), add(b.codo, [0, 0, -2.6 * S], 1)], 0.38);
    }
  }

  // ---------------------------------------------------------------- antebrazos y manos
  const lm = eq.manos?.linea;
  if (lm) for (const b of e.brazos) {
    const lado = nor(cruz(b.d2, Z)), out = mulv(lado, b.s), fa = (t: number, k = 1.9) => add(mez(b.codo, b.mun, t), out, k * A);
    if (lm === 'escamas') un([0.32, 0.62].map((t, i) => bulto(fa(t, 1.85), [1.8 * S, 1.45 * A, 0.45 * S], { ejes: ejes3(b.d2, out), mat: 'cu_escama_dragon', tono: 0.06 - i * 0.05 })), 'cu_escama_dragon', 0.25);
    else if (lm === 'draconica') {
      const cs: Comp[] = [0.3, 0.6].map((t) => hueso(fa(t, 1.7), add(add(fa(t, 1.7), out, 1.4 * S), b.d2, -2.2 * S), 0.62 * S, 0.05 * S, { mat: 'cu_cuerno' }));
      for (const k of [-1, 0, 1]) { const q = add(add(b.mano, b.d2, 1.3 * S), lado, k * 0.62 * S); cs.push(hueso(q, add(add(q, b.d2, 1.3 * S), Z, -0.6 * S), 0.32 * S, 0.04 * S, { mat: 'cu_cuerno' })); }
      un(cs, 'cu_cuerno', 0.2);
    } else if (lm === 'elfica') un([hojaB(fa(0.5, 1.95), b.d2, out, 3.0 * S, 1.25 * A, 0.3 * S, 'cu_hoja_elfica'), hueso(fa(0.16, 2.2), fa(0.84, 2.2), 0.18 * S, 0.12 * S, { mat: 'cu_filigrana' })], 'cu_hoja_elfica', 0.15);
    else if (lm === 'demoniaca') {
      un([0.25, 0.6].map((t, i) => pua(fa(t, 1.8), add(add(out, b.d2, -0.8), Z, 0.3), (2.9 - i * 0.6) * S, 0.72 * S, 'cu_hueso_demonio')), 'cu_hueso_demonio', 0.3);
      lava([0.15, 0.35, 0.55, 0.78].map((t, i) => add(fa(t, 2.05), Z, (i % 2 ? 0.5 : -0.4) * S)), 0.2);
    } else if (lm === 'celestial') un([hojaB(add(fa(0.62, 2.3), b.d2, -0.6 * S), nor(add(mulv(b.d2, -1), out, 0.45)), Z, 1.9 * S, 0.55 * S, 0.18 * S, 'cu_pluma'), hojaB(add(fa(0.5, 2.1), b.d2, -0.6 * S), nor(add(mulv(b.d2, -1), out, 0.2)), Z, 1.5 * S, 0.5 * S, 0.18 * S, 'cu_pluma', 0.05)], 'cu_pluma', 0.2);
    else if (lm === 'ahogada') {
      percebes(fa(0.42, 1.8), out, 0.6, b.s * 3);
      const pts: V3[] = []; for (let i = 0; i <= 6; i++) { const t = 0.15 + i * 0.12, a = i * 1.1; pts.push(add(add(mez(b.codo, b.mun, t), lado, Math.cos(a) * 2.0 * A), Z, Math.sin(a) * 1.9 * A)); }
      un(cadenaHuesos(pts, 0.3 * S, 0.24 * S, 'cu_alga'), 'cu_alga', 0.2);
    }
  }

  // ---------------------------------------------------------------- piernas y pies
  const lp = eq.piernas?.linea, lpi = eq.pies?.linea;
  for (const p of e.piernas) {
    const pa = nor(sub(p.tob, p.rod)), fk0 = sub(F, mulv(pa, dot3(F, pa))), fk = len(fk0) > 0.1 ? nor(fk0) : F, lat = nor(cruz(pa, fk));
    const K = (k: number, z = 0) => add(add(p.rod, fk, k * A), Z, z * S), sh = (t: number, k = 2.2, l = 0) => add(add(mez(p.rod, p.tob, t), fk, k * A), lat, l * S);
    if (lp === 'escamas') {
      un([hojaB(K(2.5, 0.9), nor(add(pa, fk, 0.3)), fk, 1.6 * S, 1.9 * A, 0.5 * S, 'cu_escama_dragon', 0.07), hojaB(sh(0.18, 2.4), nor(add(pa, fk, 0.3)), fk, 1.5 * S, 1.7 * A, 0.45 * S, 'cu_escama_dragon', 0.02)], 'cu_escama_dragon', 0.25);
      ps.push(esfera(...K(3.0, 1.2), 0.42 * S, { mat: 'cu_bronce' }));
    } else if (lp === 'draconica') un([pua(K(2.2, 0.4), add(fk, Z, 0.8), 3.2 * S, 0.85 * S, 'cu_cuerno'), pua(sh(0.35, 2.0), add(fk, pa, 0.9), 1.6 * S, 0.5 * S, 'cu_cuerno'), pua(sh(0.6, 1.8), add(fk, pa, 0.9), 1.3 * S, 0.45 * S, 'cu_cuerno')], 'cu_cuerno', 0.25);
    else if (lp === 'elfica') {
      un([hojaB(K(2.6, 0.6), nor(sub(p.cad, p.rod)), fk, 2.4 * S, 1.5 * S, 0.4 * S, 'cu_plata_elfica', 0.08), hojaB(K(2.9, 0.6), nor(sub(p.cad, p.rod)), fk, 1.5 * S, 0.8 * S, 0.3 * S, 'cu_hoja_elfica')], 'cu_plata_elfica', 0.2);
      un(cadenaHuesos([0.18, 0.35, 0.52, 0.7, 0.86].map((t, i) => sh(t, 2.25 - t * 0.6, Math.sin(i * 1.6) * 0.5)), 0.2 * S, 0.14 * S, 'cu_filigrana'), 'cu_filigrana', 0.15);
    } else if (lp === 'demoniaca') {
      un([pua(K(2.2, 0.3), add(fk, Z, 0.9), 4.0 * S, 1.0 * S, 'cu_hueso_demonio')], 'cu_hueso_demonio');
      lava([0.2, 0.38, 0.56, 0.74].map((t, i) => sh(t, 2.3 - t * 0.6, i % 2 ? 0.55 : -0.45)), 0.22);
    } else if (lp === 'celestial') {
      un([bulto(K(2.75, 0.3), [0.35 * S, 1.2 * S, 1.2 * S], { eje: fk, mat: 'cu_oro' })], 'cu_oro');
      ps.push(esfera(...K(3.05, 0.3), 0.45 * S, { mat: 'cu_luz_santa' }));
    } else if (lp === 'ahogada') {
      percebes(sh(0.42, 2.0), fk, 0.7, p.s);
      const tl = nor(sub(p.rod, p.cad)), lt2 = nor(cruz(tl, F)), pts: V3[] = [];
      for (let i = 0; i <= 6; i++) { const t = 0.15 + i * 0.12, a = i * 1.15 + 0.4; pts.push(add(add(mez(p.cad, p.rod, t), lt2, Math.cos(a) * 3.6 * A), F, Math.sin(a) * 3.6 * A)); }
      pts.push(add(add(p.rod, lt2, 3.0 * A), Z, -2.8 * S));
      alga(pts, 0.34);
    }
    if (lpi) {
      const fd = nor([p.punta[0] - p.talon[0], p.punta[1] - p.talon[1], 0]), latP = nor(cruz(Z, fd)), afuera = mulv(latP, -p.s);
      if (lpi === 'draconica' || lpi === 'demoniaca') {
        const mt = lpi === 'draconica' ? 'cu_cuerno' : 'cu_hueso_demonio', cs: Comp[] = [];
        for (const k of [-1, 0, 1]) { const q = add(add(add(p.punta, latP, k * 0.95 * A), fd, -0.3 * S), Z, 0.7 * S); cs.push(hueso(q, add(add(q, fd, 2.0 * S), Z, -0.9 * S), 0.5 * S, 0.05 * S, { mat: mt })); }
        if (lpi === 'demoniaca') cs.push(pua(add(p.talon, Z, 1.6 * S), add(mulv(fd, -1), Z, 0.4), 2.2 * S, 0.6 * S, mt));
        un(cs, mt, 0.2);
      } else if (lpi === 'escamas') un([bulto(add(mez(p.tob, p.punta, 0.78), Z, 0.9 * S), [1.7 * S, 1.6 * A, 1.0 * S], { eje: fd, mat: 'cu_bronce' })], 'cu_bronce');
      else if (lpi === 'elfica') un(cadenaHuesos([add(p.punta, Z, 0.7 * S), add(add(p.punta, fd, 1.4 * S), Z, 1.3 * S), add(add(p.punta, fd, 1.5 * S), Z, 2.4 * S)], 0.75 * S, 0.12 * S, 'cu_plata_elfica'), 'cu_plata_elfica', 0.3);
      else if (lpi === 'celestial') {
        const raiz = add(add(add(p.talon, Z, 2.6 * S), fd, -0.4 * S), afuera, 1.5 * A), cs: Comp[] = [];
        for (let k = 0; k < 3; k++) { const d = nor(add(add(mulv(fd, -0.85), Z, 0.45 + k * 0.35), afuera, 0.25)); cs.push(hojaB(add(raiz, d, (1.0 - k * 0.12) * S), d, afuera, (1.6 - k * 0.25) * S, 0.5 * S, 0.18 * S, 'cu_pluma', k * 0.04)); }
        un(cs, 'cu_pluma', 0.25);
      } else if (lpi === 'ahogada') percebes(add(mez(p.tob, p.punta, 0.5), Z, 1.3 * S), Z, 0.55, p.s * 5);
    }
  }

  // ---------------------------------------------------------------- cinto
  const lc = eq.cinturon?.linea;
  if (lc) {
    const Pv = e.Pv ?? e.W, adelP = nor(sub(Pv(1, 0, zc), Pv(0, 0, zc)));
    if (lc === 'ahogada') {
      for (const s of [1, -1]) alga([Pv(4.0 * A, s * 2.8 * A, zc + 1.0 * S), Pv(4.4 * A, s * 3.2 * A, zc - 2 * S), Pv(4.2 * A, s * 3.0 * A, zc - 5.5 * S), Pv(4.0 * A, s * 3.3 * A, zc - 8 * S)], 0.36);
      concha(Pv(5.5 * A, 0, zc + 1.4 * S), adelP, Z, 0.7);
    } else if (lc === 'elfica') un([hojaB(Pv(5.4 * A, 0, zc + 0.6 * S), add(Z, adelP, -0.2), adelP, 1.9 * S, 0.9 * S, 0.25 * S, 'cu_hoja_elfica'), hojaB(Pv(5.5 * A, 0.9 * A, zc + 0.2 * S), add(add(Z, adelP, -0.2), e.R, 0.8), adelP, 1.3 * S, 0.6 * S, 0.22 * S, 'cu_filigrana')], 'cu_hoja_elfica', 0.2);
    else if (lc === 'draconica') un([1, -1].map((s) => hueso(Pv(5.0 * A, s * 1.3 * A, zc + 0.3 * S), Pv(5.2 * A, s * 1.5 * A, zc - 2.6 * S), 0.45 * S, 0.04 * S, { mat: 'cu_cuerno' })), 'cu_cuerno', 0.2);
    else if (lc === 'demoniaca') un([1, -1].map((s) => hueso(Pv(0.6 * A, s * 5.0 * A, zc + 1.6 * S), Pv(-0.4 * A, s * 7.4 * A, zc + 3.8 * S), 0.6 * S, 0.05 * S, { mat: 'cu_hueso_demonio' })), 'cu_hueso_demonio', 0.2);
    else if (lc === 'celestial') { un([bulto(Pv(5.5 * A, 0, zc + 1.4 * S), [0.35 * S, 1.3 * S, 1.3 * S], { eje: adelP, mat: 'cu_oro' })], 'cu_oro'); ps.push(esfera(...Pv(5.85 * A, 0, zc + 1.4 * S), 0.45 * S, { mat: 'cu_luz_santa' })); }
  }

  // ---------------------------------------------------------------- casco
  const lk = eq.cabeza?.linea;
  if (lk) {
    const P = (fw: number, rt: number, up: number): V3 => cab(fw * H, rt * H, cz + up * H);
    const o = P(0, 0, 0), vec = (fw: number, rt: number, up: number) => nor(sub(P(fw, rt, up), o));
    if (lk === 'escamas') {
      const cs: Comp[] = [];
      for (let i = 0; i < 5; i++) cs.push(bulto(P(2.2 - i * 1.7, 0, 6.3 - Math.abs(i - 1) * 0.45 - i * 0.2), [1.5 * H, (1.5 - i * 0.12) * H, 0.32 * H], { ejes: ejes3(vec(-1, 0, 0.35), vec(0, 1, 0)), mat: 'cu_escama_dragon', tono: 0.08 - i * 0.03 }));
      un(cs, 'cu_escama_dragon', 0.25);
      const band: Comp[] = [];
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; band.push(bulto(P(Math.cos(a) * 5.15, Math.sin(a) * 4.85, -1.1), [0.85 * H, 0.85 * H, 0.5 * H], { mat: 'cu_bronce' })); }
      un(band, 'cu_bronce', 0.6);
    } else if (lk === 'draconica') {
      const cs: Comp[] = [];
      for (const s of [1, -1]) {
        cs.push(...cadenaHuesos([P(-0.4, s * 4.2, 3.0), P(-2.6, s * 5.6, 5.2), P(-5.4, s * 5.9, 6.0), P(-7.8, s * 5.3, 4.6)], 1.35 * H, 0.1 * H, 'cu_cuerno'));
        cs.push(hueso(P(0.6, s * 5.0, -1.6), P(-2.4, s * 6.3, -0.4), 0.55 * H, 0.05 * H, { mat: 'cu_cuerno' }));
      }
      for (let i = 0; i < 5; i++) { const q = P(2.6 - i * 1.9, 0, 6.0 - i * i * 0.18); cs.push(hueso(q, add(add(q, vec(-1, 0, 0), 1.0 * H), vec(0, 0, 1), 1.7 * H), 0.62 * H, 0.05 * H, { mat: 'cu_cuerno' })); }
      un(cs, 'cu_cuerno', 0.3);
    } else if (lk === 'elfica') {
      const cs: Comp[] = [];
      for (let i = 0; i < 7; i++) { const t = i - 3, d = nor(add(add(vec(0, 0, 1), vec(-1, 0, 0), 0.55), vec(0, 1, 0), t * 0.3)); cs.push(hojaB(add(P(-1.6 + Math.abs(t) * 0.2, t * 0.95, 5.2 - Math.abs(t) * 0.35), d, 1.6 * H), d, vec(-1, 0, 0), (2.0 - Math.abs(t) * 0.15) * H, 0.8 * H, 0.22 * H, i % 2 ? 'cu_filigrana' : 'cu_hoja_elfica')); }
      for (const s of [1, -1]) cs.push(hojaB(P(-1.4, s * 5.3, 2.3), vec(-1, s * 0.25, 0.8), vec(0, s, 0), 3.0 * H, 1.0 * H, 0.25 * H, 'cu_plata_elfica', 0.06));
      cs.push(...cadenaHuesos(Array.from({ length: 9 }, (_, i) => { const a = rad(-80 + i * 20); return P(Math.cos(a) * 5.25, Math.sin(a) * 5.0, 1.9 + Math.cos(a * 3) * 0.25); }), 0.26 * H, 0.26 * H, 'cu_filigrana'));
      un(cs, 'cu_hoja_elfica', 0.2);
    } else if (lk === 'demoniaca') {
      const cs: Comp[] = [];
      for (const s of [1, -1]) cs.push(...cadenaHuesos([P(0.4, s * 4.3, 3.0), P(0.2, s * 7.0, 4.6), P(1.4, s * 8.4, 8.0), P(3.4, s * 7.8, 10.4)], 1.6 * H, 0.1 * H, 'cu_hueso_demonio'));
      for (let i = 0; i < 3; i++) cs.push(pua(P(-0.5 - i * 1.8, 0, 6.0 - i * 0.4), vec(-0.3, 0, 1), (1.8 - i * 0.3) * H, 0.55 * H, 'cu_hueso_demonio'));
      un(cs, 'cu_hueso_demonio', 0.3);
      for (const s of [1, -1]) ps.push(elipsoide(...P(5.15, s * 1.3, 0.75), 0.45 * H, 0.75 * H, 0.32 * H, { mat: 'cu_lava', giro: angulo(e.ejesCab[0]), tono: (late - 0.5) * 0.3 }));
    } else if (lk === 'celestial') {
      // halo tenue: un aro fino de luz atrás y arriba de la cabeza, inclinado hacia atrás
      const hc = P(-2.4, 0, 9.0), n = vec(-0.45, 0, 1), u = vec(0, 1, 0), v = nor(cruz(n, u)), pts: V3[] = [];
      for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2; pts.push(add(add(hc, u, Math.cos(a) * 5.4 * H), v, Math.sin(a) * 5.4 * H)); }
      ps.push(masa(cadenaHuesos(pts, 0.3 * H, 0.3 * H, 'cu_halo', (late - 0.5) * 0.25), { mat: 'cu_halo', suave: 0.15 * H }));
      const cs: Comp[] = [];
      for (const s of [1, -1]) for (let k = 0; k < 3; k++) { const d = vec(-0.8, s * 0.45, 0.55 + k * 0.3); cs.push(hojaB(add(P(-0.6, s * 5.0, 2.6), d, (1.3 - k * 0.1) * H), d, vec(0, s, 0), (2.6 - k * 0.4) * H, 0.6 * H, 0.2 * H, 'cu_pluma', k * 0.04)); }
      un(cs, 'cu_pluma', 0.2);
    } else if (lk === 'ahogada') {
      percebes(P(1.2, 3.9, 4.0), vec(0.2, 0.8, 0.6), 0.7, 0);
      percebes(P(-2.4, -4.0, 1.0), vec(-0.4, -0.9, 0.1), 0.65, 2);
      concha(P(5.5, 0, 4.1), vec(1, 0, 0.3), vec(0, 0, 1), 0.6);
      for (const s of [1, -1]) alga([P(-3.4, s * 3.4, 4.0), P(-5.0, s * 3.9, 0.4), T(-3.8 * S, s * 3.6 * A, hz + 2 * S), T(-4.6 * S, s * 4.0 * A, hz - 3 * S)], 0.38);
    }
  }
  return ps;
}

/** Un frasco de vidrio con poción que brilla, en la mano izquierda; al agitarlo el líquido se mueve. */
function frasco(e: Esqueleto, u: number): Pieza[] {
  const { S } = e, b = e.brazos[1];
  const base = add(add(b.mano, [0, 0, 1.4 * S]), b.d2, 0.4 * S);
  const sacude = Math.sin(u * Math.PI * 2 * 6) * (u > 0.1 && u < 0.38 ? 1 : 0);
  const ps: Pieza[] = [];
  ps.push(esfera(...base, 1.9 * S, { mat: 'vidrio' }));
  ps.push(esfera(...add(base, [sacude * 0.4 * S, 0, -0.35 * S + Math.abs(sacude) * 0.3 * S]), 1.45 * S, { mat: 'fuego_verde' }));
  const cuello = add(base, [0, 0, 1.8 * S]);
  ps.push(palo(cuello, add(cuello, [0, 0, 1.8 * S]), 0.65 * S, { mat: 'vidrio' }), esfera(...add(cuello, [0, 0, 2.2 * S]), 0.7 * S, { mat: 'madera' }));
  return ps;
}

/**
 * Lo que acompaña la presentación de cada clase (acción secundaria): el sigilo de luz que dibuja la mano y sale
 * disparado, las almas que suben a la garra, hojas que arrastra el viento, el polvo del hachazo contra el piso,
 * burbujas del frasco agitado y el destello del saludo con la espada.
 */
function efectos(cu: Cuerpo, eq: Equipo, e: Esqueleto, dir: Dir, f: number): Pieza[] {
  const n = CUADROS.presentar, u = f / n, S = e.S, ps: Pieza[] = [];
  const tipo = eq.arma?.tipo ?? 'nada';
  const mano = (q: number, i: number) => esqueleto(cu, dir, 'presentar', q * n, tipo, eq.izq?.tipo).brazos[i].mano;
  const h = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  switch (cu.presentacion) {
    case 'conjuro': {
      // el sigilo queda escrito en el aire detrás de la mano y, al lanzarlo, vuela adelante y se apaga
      const u0 = 0.16, u1 = Math.min(u, 0.6);
      if (u < u0 || u > 0.8) break;
      const vuela = u > 0.62 ? (u - 0.62) / 0.18 : 0;
      for (let q = u0; q <= u1 + 1e-6; q += 0.0125) {
        const c = add(mano(q, 1), e.F, vuela * 16 * S);
        ps.push(esfera(...c, (0.55 - vuela * 0.35) * S * (0.7 + 0.3 * Math.sin(q * 60)), { mat: 'magia' }));
      }
      break;
    }
    case 'invoca': {
      // jirones de alma que suben en espiral desde el piso hacia la garra mientras la levanta
      if (u < 0.08 || u > 0.84) break;
      const m = e.brazos[manoDe(tipo, eq.izq?.tipo) === 'escudo' ? 0 : 1].mano, piso: V3 = [m[0], m[1], 0.8];
      const fuerza = Math.sin(Math.PI * (u - 0.08) / 0.76);
      for (let k = 0; k < 6; k++) {
        const t = ((u * 2 + k / 6) % 1), a = k * 2.1 + u * 9, r = (3.2 - t * 2.2) * S;
        const c = add(mez(piso, m, t), [Math.cos(a) * r, Math.sin(a) * r, 0]);
        ps.push(elipsoide(...c, 0.9 * S * fuerza, 0.9 * S * fuerza, 1.8 * S * fuerza, { mat: 'cu_ectoplasma' }));
      }
      break;
    }
    case 'naturaleza': {
      // hojas que el viento hace girar alrededor, más fuerte cuando abre los brazos
      const viento = 0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.1) / 0.75)));
      for (let k = 0; k < 9; k++) {
        const a = k * 0.7 + u * Math.PI * 2 * (k % 2 ? 1 : 2), r = (10 + h(k) * 6) * S * viento, z = e.zc + (-6 + h(k + 3) * 34) * S + Math.sin(a * 2) * 2 * S;
        ps.push(elipsoide(...e.W(Math.cos(a) * r, Math.sin(a) * r, z), 1.8 * S, 1 * S, 0.45 * S, { mat: k % 3 ? 'hojas' : 'hojas_otono', giro: (a * 180) / Math.PI }));
      }
      break;
    }
    case 'rugido': {
      // el hachazo contra el piso levanta polvo y piedritas que se abren y caen
      if (u < 0.54 || u > 0.78 || tipo === 'nada') break;
      const [a0, a1] = filoDe(e, tipo, e.brazos[0]), punta = mez(a0, a1, 0.5), c: V3 = [punta[0], punta[1], 0.8];
      const t = (u - 0.54) / 0.24;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + h(k), r = (2 + t * 7) * S * (0.6 + h(k + 1) * 0.6), z = (Math.sin(Math.PI * Math.min(1, t * 1.3)) * (2 + h(k + 2) * 4) + 0.6) * S;
        ps.push(esfera(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z, (k % 2 ? 0.9 : 1.4) * S * (1 - t * 0.6), { mat: k % 2 ? 'roca' : 'tierra' }));
      }
      break;
    }
    case 'frasco': {
      // burbujas que suben del frasco mientras lo agita y lo mira
      if (u < 0.12 || u > 0.7) break;
      const b = add(e.brazos[1].mano, [0, 0, 5 * S]);
      for (let k = 0; k < 4; k++) { const t = ((u * 5 + k / 4) % 1); ps.push(esfera(b[0] + (h(k) - 0.5) * 2 * S, b[1] + (h(k + 1) - 0.5) * 2 * S, b[2] + t * 6 * S, 0.45 * S * (1 - t * 0.5), { mat: 'fuego_verde' })); }
      break;
    }
    case 'guardia': {
      // destello en la punta de la espada durante el saludo
      if (u < 0.28 || u > 0.46 || tipo === 'nada') break;
      const [, punta] = filoDe(e, tipo, e.brazos[0]);
      const k = Math.sin(Math.PI * (u - 0.28) / 0.18);
      ps.push(esfera(...punta, 1.2 * S * k, { mat: 'luz_vela' }));
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + u * 6; ps.push(palo(punta, add(punta, [Math.cos(a) * 3 * S * k, Math.sin(a) * 3 * S * k, (i % 2 ? 1 : -1) * 3 * S * k]), 0.2 * S, { mat: 'luz_vela', r1: 0.05 })); }
      break;
    }
  }
  return ps;
}

/** El druida arranca raíces del piso: crecen retorcidas desde el suelo siguiendo a la mano que sube y se retraen. */
function raices(e: Esqueleto, f: number): Pieza[] {
  const u = f / cuadrosDe('lanzar', 'naturaleza'), S = e.S, m = e.brazos[1].mano;
  const crece = Math.min(1, Math.max(0, (u - 0.2) / 0.3)) * (u < 0.8 ? 1 : Math.max(0, 1 - (u - 0.8) / 0.2));
  if (crece <= 0) return [];
  const cs: Comp[] = [];
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + 0.4, base: V3 = [m[0] + Math.cos(a) * 3.2 * S, m[1] + Math.sin(a) * 3.2 * S, 0];
    const alto = Math.max(2, (m[2] - 3 * S) * crece * (0.75 + 0.15 * k));
    let prev = base;
    for (let i = 1; i <= 5; i++) {
      const t = i / 5, q: V3 = [base[0] + (m[0] - base[0]) * t * 0.7 + Math.sin(i * 1.7 + k) * 1.2 * S, base[1] + (m[1] - base[1]) * t * 0.7 + Math.cos(i * 1.3 + k) * 1.2 * S, alto * t];
      cs.push(hueso(prev, q, (1.9 - t * 1.2) * S, (1.6 - t * 1.2) * S, { mat: 'corteza' }));
      prev = q;
    }
  }
  return [masa(cs, { mat: 'corteza', suave: 0.8 })];
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
  const z0 = e.zc + 2.5 * S, z1 = Math.max(1.2 * S, e.zc + 2.5 * S - largo * S), Pv = e.Pv ?? e.W;
  cs.push(hueso(Pv(0, 0, z0), Pv(0.2 * S, 0, (z0 + z1) / 2), 4.6 * A, 4.4 * A * vuelo, { mat }));
  // las túnicas largas y los vestidos (sin calzas debajo) cierran la tela; los faldones cortos van sobre calzas
  const larga = largo >= 20;
  // un tubo de tela por la pierna: si el ruedo baja de la rodilla pasa por ella (con la rodilla doblada adelante, el
  // tubo recto de la cadera al ruedo la dejaba asomar por delante de la tela)
  // al andar la tela pesa: el ruedo no se abre más que lo justo (si no, cada pierna inflaba un saco detrás)
  const anda = acc === 'caminar' || acc === 'correr', vueloR = anda ? Math.min(vuelo, 1.2) : vuelo;
  const tubo = (cad: V3, rod: V3, ruedo: V3): Comp[] => {
    const r0 = (anda && larga ? 4.5 : 4.0) * A, r1 = 3.6 * A * vueloR;
    if (!larga || ruedo[2] >= rod[2] + 1.5 * S) return [hueso(cad, ruedo, r0, r1, { mat })];
    const l1 = len(sub(rod, cad)), l2 = len(sub(ruedo, rod)), rk = r0 + (r1 - r0) * (l1 / Math.max(0.01, l1 + l2));
    if (anda) {
      // al andar la rodilla empuja la tela pero no la estira hasta su punta: el codo de la tela queda un poco atrás de la
      // rodilla y algo más ancho, así la cubre sin que cada paso infle un bulto
      const rodT = mez([cad[0], cad[1], rod[2]], rod, 0.55), rk2 = rk + len(sub(rod, rodT)) * 0.6;
      return [hueso(cad, rodT, r0, rk2, { mat }), hueso(rodT, ruedo, rk2, r1, { mat })];
    }
    return [hueso(cad, rod, r0, rk, { mat }), hueso(rod, ruedo, rk, r1, { mat })];
  };
  const ruedos: V3[] = [];
  for (const p of e.piernas) {
    // la tela baja por cada pierna hasta el largo y se abre en el ruedo
    const t = Math.min(1, (z0 - z1) / Math.max(1, z0 - p.tob[2]));
    const bajo = mez(p.cad, p.tob, Math.min(1, t));
    let ruedo: V3 = [bajo[0], bajo[1], Math.max(z1, bajo[2])];
    if (anda) {
      // la tela sigue a la pierna con retraso y cae por su peso: el ruedo va a mitad de camino entre la pierna y la
      // caída a plomo bajo la cadera, y nunca sube más que la rodilla (la pierna que patea atrás sale por debajo)
      const plomo = Pv(0.4 * S, p.s * 2.8 * A, z1), sigue = larga ? 0.22 : 0.55;
      ruedo = mez(plomo, ruedo, sigue);
      ruedo[2] = Math.max(z1, Math.min(ruedo[2], p.rod[2] - 2 * S));
    }
    ruedos.push(ruedo);
    cs.push(...tubo(p.cad, p.rod, ruedo));
    // la pierna que se levanta adentro de una túnica larga la arrastra: la tela envuelve la canilla, ceñida y un poco
    // atrasada (no se infla), así la pierna no la atraviesa
    // (aparece de a poco a medida que el pie sube: la tela no salta de un cuadro a otro)
    const sube = Math.max(0, Math.min(1, (p.tob[2] - z1 - 0.5 * S) / (3 * S)));
    if (anda && larga && sube > 0) {
      const fin = mez(p.tob, Pv(0.4 * S, p.s * 2.8 * A, z1), 0.3 + 0.4 * (1 - sube));
      cs.push(hueso(p.rod, fin, (1.4 + 1.5 * sube) * A, (1.2 + 1.3 * sube) * A, { mat }));
    }
  }
  // la tela entre las piernas: travesaños de un tubo al otro, más finos que los tubos, que cierran el hueco sin inflar
  // el ruedo (si no, al dar el paso o al abrir las piernas asomaban los muslos desnudos por la abertura de la túnica)
  // los faldones cortos y los taparrabos al andar: una tira de tela cierra el hueco entre las dos piernas
  if (!larga && anda && ruedos.length === 2) {
    const [p0, p1] = e.piernas;
    for (const t of [0.45, 0.8]) cs.push(hueso(mez(p0.cad, ruedos[0], t), mez(p1.cad, ruedos[1], t), 1.8 * A, 1.8 * A, { mat }));
  }
  if (larga && ruedos.length === 2) {
    const [p0, p1] = e.piernas;
    const sobre = (p: Pierna, ruedo: V3, t: number): V3 => (anda || ruedo[2] >= p.rod[2] + 1.5 * S ? mez(p.cad, ruedo, t) : t < 0.5 ? mez(p.cad, p.rod, t * 2) : mez(p.rod, ruedo, t * 2 - 1));
    for (const t of [0.3, 0.55, 0.78, 1]) {
      const r = (2.0 + 1.4 * t) * A * Math.sqrt(vueloR);
      cs.push(hueso(sobre(p0, ruedos[0], t), sobre(p1, ruedos[1], t), r, r, { mat }));
    }
  }
  // la tela de atrás se arrastra con la inercia del cuerpo (capa de la pose) o se mece al caminar
  const tela = e.pose?.capa, vaiven0 = tela ? (tela[0] - 0.8) * 0.6 : acc === 'caminar' ? Math.sin((f / 8) * Math.PI * 2) * 1.5 : 0, lado = tela ? tela[1] * 0.6 : 0;
  // al andar la tela de atrás apenas se arrastra (cae por su peso): no crece detrás de la cadera
  const vaiven = anda ? Math.max(-0.5, Math.min(0.7, vaiven0 * 0.3)) : vaiven0;
  cs.push(hueso(Pv(-1 * S, 0, z0 - 3 * S), (anda ? Pv : e.W)((anda ? -1.4 : -2.2) * S - vaiven, lado * S, z1 + 1.5 * S), 3.8 * A, 4.2 * A * vueloR, { mat }));
  return masa(cs, { mat, suave: 3.2 });
}

/**
 * Capa con pliegues: franjas de tela (poliedros finos) que bajan de los hombros, se abren en el ruedo y alternan
 * hacia adentro y hacia afuera para que la luz marque los pliegues. Arriba sigue el torso, abajo cuelga y se mece.
 */
function capa(e: Esqueleto, mat: string, largo: number, acc: Accion, f: number, bota = 0): Pieza {
  const { A } = e;
  // la capa se arrastra atrás y al costado con la inercia del cuerpo (la pose la calcula); en el ruedo pesa más
  const tela = e.pose?.capa;
  const ondea0 = tela ? tela[0] : acc === 'caminar' ? Math.sin((f / 8) * Math.PI * 2) * 1.6 + 2.6 : acc === 'atacar' ? 2.2 : acc === 'morir' ? 0 : 0.7;
  // la tela no se deja atravesar por las piernas: si el talón que patea atrás al correr (o la pantorrilla) llega a la
  // capa, el vuelo crece hasta que la capa se aparta y el ruedo sube por encima del pie (la tela se abre con el golpe);
  // al correr el talón sube hasta el ruedo, así que ahí la capa se aparta con más holgura (que no lo roce)
  const piernaPts: [V3, number][] = [];
  for (const p of e.piernas) {
    for (let t = 0.3; t <= 1.001; t += 0.1) piernaPts.push([mez(p.rod, p.tob, t), (2.2 - 0.9 * t) * A + bota]);
    for (let t = 0; t <= 1.001; t += 0.25) piernaPts.push([mez(p.talon, p.punta, t), (PIE_TALON - (PIE_TALON - PIE_PUNTA) * t) * A + bota]);
  }
  const holgura = (cs: Comp[]) => {
    let m = Infinity;
    for (const [q, r] of piernaPts) for (const c of cs) if (c.f === 'bulto') m = Math.min(m, dElip(c, q) - r);
    return m;
  };
  let ondea = ondea0, cs = capaCon(e, largo, mat, ondea, tela);
  if (acc !== 'morir' && !e.caida) for (let i = 0; i < 14 && holgura(cs) < (acc === 'correr' ? 1.5 * A : 0.4); i++) cs = capaCon(e, largo, mat, (ondea += 0.6), tela);
  return masa(cs, { mat, suave: 1.1 });
}
/** Distancia aproximada de q a la superficie de un bulto (la de la masa, sin la unión suave). */
function dElip(c: Extract<Comp, { f: 'bulto' }>, q: V3): number {
  const d = sub(q, c.c), lx = dot3(d, c.ex) / c.r[0], ly = dot3(d, c.ey) / c.r[1], lz = dot3(d, c.ez) / c.r[2];
  const k0 = Math.hypot(lx, ly, lz), k1 = Math.hypot(lx / c.r[0], ly / c.r[1], lz / c.r[2]);
  return k1 < 1e-9 ? -Math.min(c.r[0], c.r[1], c.r[2]) : (k0 * (k0 - 1)) / k1;
}
/** Las franjas de la capa con un vuelo `ondea` (cuánto se aparta atrás; desde 2.5 el ruedo además sube). */
function capaCon(e: Esqueleto, largo: number, mat: string, ondea: number, tela?: [number, number]): Comp[] {
  const { S, A, T } = e;
  const ladea = tela ? tela[1] : 0;
  const zTop = e.hombroZ + 1.2 * S, zBot = Math.max(2.2 * S, e.zc - 26 * S * largo + 12 * S);
  const N = 7, cs: Comp[] = [];
  const fila = (t: number, k: number): V3 => {
    // k de -1 (derecha) a 1 (izquierda); t de 0 (hombros) a 1 (ruedo)
    const pliegue = (Math.abs(Math.round(k * 3)) % 2 ? 0.9 : -0.4) * Math.min(1, t * 2);
    if (t <= 0.25) return T(-3.8 * A - pliegue * 0.3 - t * 4, k * (4.4 + t * 2) * A, zTop - t * (zTop - e.zc - 6 * S) * 4);
    const u = (t - 0.25) / 0.75;
    const z = e.zc + 6 * S + (zBot - e.zc - 6 * S) * u;
    const pv = e.Pv ?? e.W, base = sub(pv(0, 0, e.zc), e.W(0, 0, e.zc));
    return add(e.W(-5.2 * S - (ondea + 1.2) * u - pliegue, k * (5.6 + u * 1.6) * A + ladea * u * u * S, z + Math.max(0, ondea - 2.5) * u * u * 0.8 * S), base, 1 - u * 0.5);
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
  return cs;
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
  // los héroes llevan los cascos y capuchas forjados (armadura.ts)
  if (cu.presentacion && !c.linea) { const nuevo = cascoForjado(e, cu, c); if (nuevo) return nuevo; }
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
  const [canto, plano] = marcoArma(dd, F, b.s > 0 ? b.d2 : undefined);
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
      const [pie, tope, up] = varaDe(e, m, lg);
      ps.push(palo(pie, tope, 0.85 * S, { mat: mango, r1: 0.75 * S }));
      // el remate de cuatro puntas gira sobre el eje de la vara (giroVara)
      const gv = rad(e.pose?.giroVara ?? 0);
      let ex = nor(cruz(up, F)); if (len(cruz(up, F)) < 0.2) ex = nor(cruz(up, [1, 0, 0]));
      const ey = cruz(up, ex);
      if (tipo === 'baculo') { for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + gv; ps.push(palo(add(tope, up, -1 * S), add(add(add(tope, ex, Math.cos(a) * 2.6 * S), ey, Math.sin(a) * 2.6 * S), up, 3.4 * S), 0.55 * S, { mat: mango, r1: 0.3 * S })); } gemaArriba(add(tope, up, 2.4 * S), 2.1 * S); }
      else { ps.push(cilindro(...tope, 1.4 * S, 2 * S, { mat: 'cu_oro', r1: 2.2 * S })); gemaArriba(add(tope, up, 3.4 * S), 1.7 * S); }
      break;
    }
    case 'varita': ps.push(palo(en(-1.5 * S), en(10 * S), 0.5 * S, { mat: mango, r1: 0.3 * S })); gemaArriba(en(10.5 * S), 1 * S); break;
    case 'daga': ps.push(palo(en(-2.6 * S), en(0.3), 0.6 * S, { mat: mango }), palo(add(en(0.5), canto, 1.8 * S), add(en(0.5), canto, -1.8 * S), 0.5 * S, { mat })); ps.push(hoja(0.8, 10 * S, 0.9 * S, 0.3 * S, 0.05)); break;
    case 'garras': for (const sg of [-1, 0, 1]) ps.push(hoja(0, 9 * S, 0.45 * S, 0.2 * S, 0.02, 0), palo(add(m, canto, sg * 1.1 * S), add(add(en(9 * S), canto, sg * 1.6 * S), plano, 1.4 * S), 0.35 * S, { mat, r1: 0.08 })); break;
    case 'arco': case 'arco_largo': case 'arco_corto': case 'ballesta': {
      // el arco va en la izquierda; la derecha tira de la cuerda
      const izq = e.brazos[1];
      const c = izq.mano;
      if (tipo !== 'ballesta') {
        // el puño izquierdo cierra sobre la empuñadura, en el centro del arco; las palas se curvan hacia atrás (hacia la
        // cuerda) y el arco queda en el plano vertical de la línea de tiro: de la mano que tira a la que sostiene
        const { tira, tiro, arriba } = marcoArco(e, c, m);
        const en = (k: number, atras: number): V3 => add(add(c, arriba, k * S), tiro, -atras * S);
        let arr: V3, abj: V3, atrasCuerda = 3.6;
        // (las palas en madera clara, con el filo claro en el lomo y el agarre forrado: así el arco se lee en la mano)
        const pala = palaClara(mango), lomo = (q: V3, r: number): V3 => add(q, tiro, r * 0.62);
        const agarre = (k0: number, k1: number, r: number, atras: number) => {
          ps.push(masa([hueso(en(k0, atras), en(k1, atras), r * S, r * S, { mat: 'cu_cuero' }), ...[0, 1, 2, 3, 4].map((i) => bulto(en(k0 + ((i + 0.5) / 5) * (k1 - k0), atras), [0.32 * S, (r + 0.14) * S, (r + 0.14) * S], { eje: arriba, mat: 'ar_cuerda_clara', tono: i % 2 ? 0.06 : -0.04 }))], { mat: 'cu_cuero', suave: 0.15 * S }));
        };
        if (tipo === 'arco') {
          arr = en(15, 3.6); abj = en(-15, 3.6);
          const pts = [arr, en(9, 1.2), en(2.6, -0.3), en(-2.6, -0.3), en(-9, 1.2), abj], rs = [0.6, 0.8, 1.0, 0.8, 0.6, 0.6];
          const palas: Comp[] = [];
          for (let i = 0; i < 5; i++) palas.push(hueso(pts[i], pts[i + 1], rs[i] * S, rs[i + 1] * S, { mat: pala }), hueso(lomo(pts[i], rs[i] * S), lomo(pts[i + 1], rs[i + 1] * S), rs[i] * 0.42 * S, rs[i + 1] * 0.42 * S, { mat: 'ar_filo_arco' }));
          ps.push(masa(palas, { mat: pala, suave: 0.4 * S }));
          agarre(-2.4, 2.4, 1.05, -0.3);
        } else {
          // arco largo (una D alta de madera) o corto recurvo (las palas vuelven hacia adelante en las puntas de cuerno):
          // las palas son una masa de huesos que adelgazan hacia las puntas, con el agarre forrado y las culatas de cuerno
          const largo = tipo === 'arco_largo';
          const perfil: [number, number][] = largo ? [[19.5, 4.4], [15.5, 3.1], [10, 1.4], [5, 0.2], [1.8, -0.35]] : [[12.8, 2.3], [11.4, 3.2], [8.6, 2.6], [5.2, 1.1], [2.2, -0.25]];
          const kmax = perfil[0][0];
          const pts = [...perfil.map(([k, a]) => en(k, a)), ...[...perfil].reverse().map(([k, a]) => en(-k, a))];
          const rad0 = (k: number) => ((largo ? 0.95 : 1.05) - (Math.abs(k) / kmax) * (largo ? 0.55 : 0.6)) * S;
          const ks = [...perfil.map(([k]) => k), ...[...perfil].reverse().map(([k]) => -k)];
          const palas: Comp[] = [];
          for (let i = 0; i < pts.length - 1; i++) palas.push(hueso(pts[i], pts[i + 1], rad0(ks[i]), rad0(ks[i + 1]), { mat: pala }), hueso(lomo(pts[i], rad0(ks[i])), lomo(pts[i + 1], rad0(ks[i + 1])), rad0(ks[i]) * 0.42, rad0(ks[i + 1]) * 0.42, { mat: 'ar_filo_arco' }));
          ps.push(masa(palas, { mat: pala, suave: 0.5 * S }));
          agarre(-2.6, 2.6, 1.15, -0.45);
          for (const q of [pts[0], pts[pts.length - 1]]) ps.push(masa([bulto(q, [0.75 * S, 0.62 * S, 0.62 * S], { eje: arriba, mat: 'cu_hueso' })], { mat: 'cu_hueso' }));
          arr = pts[0]; abj = pts[pts.length - 1]; atrasCuerda = perfil[0][1];
        }
        // la cuerda: una V hasta los dedos que tiran; si no tira, recta entre las puntas (del lado del cuerpo)
        const culatin = tira ? m : en(0, atrasCuerda);
        // (de lino claro y con cuerpo: tiene que verse contra la ropa)
        if (tira) ps.push(palo(arr, m, 0.26 * S, { mat: 'ar_cuerda_clara' }), palo(m, abj, 0.26 * S, { mat: 'ar_cuerda_clara' }));
        else ps.push(palo(arr, abj, 0.26 * S, { mat: 'ar_cuerda_clara' }));
        // la flecha: del culatín en la cuerda, apoyada sobre el puño izquierdo, con la punta delante del arco
        const apoyo = add(c, arriba, 1.1 * S), punta = add(apoyo, tiro, 6 * S);
        // (los arcos sueltos, sin quien los tense, no llevan la flecha que flotaría delante: el ícono va de perfil)
        if (e.pose?.flecha !== false && (tira || len(sub(m, culatin)) < 6 * S) && e.ejesT) {
          ps.push(palo(culatin, punta, 0.3 * S, { mat: 'madera_lisa' }));
          // la punta: una pirámide chata de acero (con tres puntos el poliedro es un solo plano sin cerrar y se pintaba
          // como una bola clara flotando delante del arco)
          const ala = nor(cruz(tiro, arriba));
          ps.push(poliedro([add(punta, arriba, 0.8 * S), add(punta, arriba, -0.8 * S), add(punta, ala, 0.3 * S), add(punta, ala, -0.3 * S), add(punta, tiro, 2.5 * S)], { mat }));
        }
      } else {
        // la ballesta va al frente, entre las dos manos, apuntando hacia adelante
        // con las dos manos va entre ellas apuntando adelante; con la izquierda libre cuelga de la derecha en la dirección del puño
        // (suelta en el ícono, sin torso: de pie, con las palas de frente)
        const suelta = !e.ejesT || (e.pose?.pegaI ?? 1) < 0.5, ap = suelta ? dd : F;
        const d = e.brazos[0].mano, cc = suelta ? add(d, dd, 2 * S) : mez(c, d, 0.5);
        let lado = nor(cruz(ap, [0, 0, 1])); if (len(cruz(ap, [0, 0, 1])) < 0.2) lado = nor(cruz(ap, F));
        const atras = add(cc, ap, -5 * S), frente = add(cc, ap, 9 * S);
        const tablero = palaClara(mango);
        ps.push(palo(atras, frente, 1.0 * S, { mat: tablero }), caja(...add(atras, [0, 0, -2.4 * S]), 1.6 * S, 1.4 * S, 3 * S, { mat: tablero, giro: angulo(F) }));
        // el puño forrado con vueltas de cordel claro
        for (let i = 0; i < 4; i++) ps.push(cilindro(...add(atras, ap, (1.2 + i * 0.75) * S), 1.12 * S, 0.5 * S, { mat: 'ar_cuerda_clara', eje: ap, tono: i % 2 ? 0.06 : -0.03 }));
        const pal = add(frente, ap, -1.5 * S);
        ps.push(palo(add(add(pal, lado, 7.5 * S), ap, -2 * S), pal, 0.7 * S, { mat, r1: 0.9 * S }), palo(pal, add(add(pal, lado, -7.5 * S), ap, -2 * S), 0.9 * S, { mat, r1: 0.7 * S }));
        ps.push(palo(add(add(pal, lado, 7.5 * S), ap, -2 * S), add(cc, ap, -1 * S), 0.24 * S, { mat: 'ar_cuerda_clara' }), palo(add(cc, ap, -1 * S), add(add(pal, lado, -7.5 * S), ap, -2 * S), 0.24 * S, { mat: 'ar_cuerda_clara' }));
        ps.push(palo(add(cc, [0, 0, 1 * S]), add(add(frente, ap, 1.5 * S), [0, 0, 1 * S]), 0.35 * S, { mat: 'madera_lisa' }));
      }
      break;
    }
    default: ps.push(...armaEpica(e, tipo, b, mat, mango, gema)); break;
  }
  return ps;
}

/**
 * El marco del arco en el puño izquierdo `c` (la derecha `m` tira de la cuerda): hacia dónde tira y su arriba. De pie
 * el arco queda en el plano vertical de la línea de tiro; al caer muerto se acuesta en el piso junto al cuerpo (arriba
 * y tiro horizontales), así no queda parado en el aire ni medio hundido en el suelo.
 */
function marcoArco(e: Esqueleto, c: V3, m: V3): { tira: boolean; tiro: V3; arriba: V3 } {
  const F = e.F, fT = e.ejesT ? nor([e.ejesT[0][0], e.ejesT[0][1], 0]) : F, haciaArco = sub(c, m); // (un arco suelto no tiene torso)
  const tira = e.pose?.tensa !== false && dot3(haciaArco, fT) > 6 * e.S;
  let tiro = tira ? nor(haciaArco) : nor(add(fT, F, 1));
  let arriba = nor(sub([0, 0, 1], [tiro[0] * tiro[2], tiro[1] * tiro[2], tiro[2] * tiro[2]]));
  const yace = Math.max(0, Math.min(1, ((e.caida ?? 0) - 0.55) / 0.4));
  if (yace > 0 && e.ejesT) {
    // tumbado: el arco a lo largo del cuerpo (su eje de los pies a la cabeza ya está casi horizontal)
    let ax: V3 = [e.ejesT[2][0], e.ejesT[2][1], 0]; if (len(ax) < 0.2) ax = [F[1], -F[0], 0];
    ax = nor(ax);
    let tY = nor(cruz([0, 0, 1], ax)); if (dot3(tY, tiro) < 0) tY = mulv(tY, -1);
    arriba = nor(mez(arriba, ax, yace));
    tiro = nor(mez(tiro, tY, yace));
    tiro = nor(sub(tiro, mulv(arriba, dot3(tiro, arriba))));
  }
  return { tira, tiro, arriba };
}

/** El marco de una hoja en el puño: el canto (ancho de la hoja) y el plano (hacia donde mira su cara). */
function marcoArma(dd: V3, F: V3, d2?: V3): [V3, V3] {
  // el filo mira al frente del cuerpo y hacia donde apunta el antebrazo (los nudillos): con el arma apuntando justo al
  // frente el antebrazo decide y la hoja no se da vuelta de un cuadro al otro
  const ref: V3 = d2 ? add(F, d2, 0.6) : F;
  let canto = nor(cruz(dd, ref)); if (!isFinite(canto[0]) || len(cruz(dd, ref)) < 0.2) canto = nor(cruz(dd, [0, 0, 1]));
  return [canto, nor(cruz(canto, dd))];
}
interface Ctrl { p: V3; an: number; gr: number; w: V3 }
/**
 * Lámina de masa: una línea media muestreada cada `paso` con bultos chatos orientados a su tangente (ancho hacia
 * `w`, grueso hacia la cara). Los anchos y gruesos se interpolan entre los puntos de control, así la hoja se afina,
 * se ensancha o se curva sin aristas duras: el lomo y el filo quedan como una lente.
 */
function cinta(ctrl: Ctrl[], mat: string, paso: number, tono?: number): Comp[] {
  const cs: Comp[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const A = ctrl[i], B = ctrl[i + 1], d = sub(B.p, A.p), L = len(d), n = Math.max(1, Math.round(L / paso)), t = nor(d);
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) / n, w0 = nor(mez(A.w, B.w, u));
      const w = nor(sub(w0, [t[0] * dot3(w0, t), t[1] * dot3(w0, t), t[2] * dot3(w0, t)]));
      cs.push(bulto(mez(A.p, B.p, u), [(L / n) * 1.1, A.an + (B.an - A.an) * u, A.gr + (B.gr - A.gr) * u], { ejes: [t, w, cruz(t, w)], mat, tono }));
    }
  }
  return cs;
}
/** Cadena de huesos por una polilínea, con el radio que va de r0 a r1. */
function cadenaHuesos(pts: V3[], r0: number, r1: number, mat: string, tono?: number): Comp[] {
  return pts.slice(1).map((q, i) => hueso(pts[i], q, r0 + (r1 - r0) * (i / (pts.length - 1)), r0 + (r1 - r0) * ((i + 1) / (pts.length - 1)), { mat, tono }));
}

/**
 * El arsenal épico: katana, estoque, falcata, tridente, lucero del alba, jabalina, gran báculo, orbe de mano, katar,
 * hoz y lanza del dragón (los arcos nuevos van con el arco). Todo en masa: hojas de bultos chatos que se afinan,
 * empuñaduras forradas, guardas y cunas de huesos que se funden, cabezas con púas que nacen de la bola.
 */
function armaEpica(e: Esqueleto, tipo: TipoArma, b: Brazo, mat: string, mango: string, gema?: string): Pieza[] {
  const { S, F } = e;
  const dd = b.eje, m = b.mano, ps: Pieza[] = [];
  const [canto, plano] = marcoArma(dd, F, b.s > 0 ? b.d2 : undefined);
  /** Punto en unidades de S: k a lo largo del arma, c hacia el canto, p hacia la cara. */
  const P = (k: number, c = 0, p = 0): V3 => add(add(add(m, dd, k * S), canto, c * S), plano, p * S);
  /** Hoja recta o curva por puntos [k, corrimiento de canto, ancho, grueso]. */
  const hoja = (pts: [number, number, number, number][], mt = mat, extra: Comp[] = [], suave = 0.3) => masa([...cinta(pts.map(([k, c, an, gr]) => ({ p: P(k, c), an: an * S, gr: gr * S, w: canto })), mt, 1.05 * S), ...extra], { mat: mt, suave: suave * S });
  const un = (cs: Comp[], mt: string, suave = 0.35) => masa(cs, { mat: mt, suave: suave * S });
  const ejesH: [V3, V3, V3] = [dd, canto, plano];
  const guarn = mat === 'cu_oro' ? 'cu_placa_oscura' : 'cu_oro';
  switch (tipo) {
    case 'katana': {
      // tsuka larga con el encordado en rombos, kashira, tsuba en óvalo, habaki y la hoja con su sori y su kissaki
      const tsuka: Comp[] = [hueso(P(-7.2), P(-0.3), 0.74 * S, 0.7 * S, { mat: mango })];
      for (let i = 0; i < 5; i++) tsuka.push(bulto(P(-6.4 + i * 1.3), [0.42 * S, 0.86 * S, 0.86 * S], { eje: dd, mat: mango, tono: 0.08 }));
      ps.push(un(tsuka, mango, 0.25));
      ps.push(un([bulto(P(-7.6), [0.6 * S, 0.84 * S, 0.84 * S], { eje: dd, mat: guarn }), hueso(P(0.35), P(1.7), 0.66 * S, 0.6 * S, { mat: guarn })], guarn, 0.2));
      ps.push(un([bulto(P(0.05), [0.32 * S, 2.1 * S, 1.75 * S], { ejes: ejesH, mat: 'cu_placa_oscura' }), bulto(P(0.05), [0.24 * S, 2.28 * S, 1.92 * S], { ejes: ejesH, mat: guarn })], 'cu_placa_oscura', 0.15));
      const sori = 2.0, L = 26.2;
      ps.push(hoja([0.6, 3, 8, 13, 18, 22, 24.4, 25.5, 26.2].map((k) => { const u = k / L; return [k, sori * u * u, k > 24.4 ? 0.82 - ((k - 24.4) / 1.8) * 0.74 : 0.95 - u * 0.12, 0.32 - u * 0.1]; })));
      break;
    }
    case 'estoque': {
      // pomo en gota, puño con alambre, cazoleta, gavilanes con remates, guardamano en arco y la hoja larga y fina
      const puno: Comp[] = [hueso(P(-4.6), P(-0.4), 0.55 * S, 0.62 * S, { mat: mango })];
      for (let i = 0; i < 4; i++) puno.push(bulto(P(-4 + i * 1.1), [0.3 * S, 0.68 * S, 0.68 * S], { eje: dd, mat: mango, tono: 0.08 }));
      ps.push(un(puno, mango, 0.2));
      const g: Comp[] = [bulto(P(-5.15), [0.95 * S, 0.82 * S, 0.82 * S], { eje: dd, mat }), bulto(P(0.5), [0.55 * S, 1.8 * S, 1.8 * S], { ejes: ejesH, mat }), hueso(P(0.3, 3.4), P(0.3, -3.4), 0.3 * S, 0.3 * S, { mat })];
      for (const s of [1, -1]) g.push(bulto(P(0.3 + s * 0.3, s * 3.65), [0.5 * S, 0.5 * S, 0.5 * S], { mat }));
      g.push(...cadenaHuesos(Array.from({ length: 7 }, (_, i) => { const t = i / 6; return P(0.3 - 5.2 * t, 1.7 + Math.sin(Math.PI * t) * 1.4 - t * 1.5); }), 0.28 * S, 0.24 * S, mat));
      for (const s of [1, -1]) g.push(...cadenaHuesos(Array.from({ length: 6 }, (_, i) => { const a = (i / 5) * Math.PI * 2; return P(1.2 + Math.sin(a) * 0.85, s * (1.05 + Math.cos(a) * 0.75)); }), 0.17 * S, 0.17 * S, mat));
      ps.push(un(g, mat, 0.3));
      ps.push(hoja([[0.9, 0, 0.6, 0.38], [6, 0, 0.5, 0.33], [14, 0, 0.42, 0.29], [22, 0, 0.32, 0.23], [26.2, 0, 0.17, 0.13], [27.6, 0, 0.05, 0.05]]));
      break;
    }
    case 'falcata': {
      // pomo en cabeza de ave que se cierra con el guardamano; la hoja estrecha junto al puño que se ensancha y se vence adelante
      ps.push(un([hueso(P(-4.4), P(-0.2), 0.62 * S, 0.66 * S, { mat: mango })], mango));
      const g: Comp[] = [...cadenaHuesos([P(-4.3), P(-5.3, 0.5), P(-5.8, 1.5), P(-5.4, 2.4)], 0.8 * S, 0.22 * S, mat), bulto(P(-5.5, 1.3), [0.6 * S, 0.7 * S, 0.62 * S], { mat })];
      g.push(...cadenaHuesos(Array.from({ length: 7 }, (_, i) => { const t = i / 6; return P(-0.1 - 5.0 * t, 1.2 + Math.sin(Math.PI * t) * 1.1 + t * 0.9); }), 0.3 * S, 0.26 * S, mat));
      g.push(bulto(P(0.25), [0.55 * S, 1.45 * S, 0.9 * S], { ejes: ejesH, mat }));
      ps.push(un(g, mat, 0.3));
      const ks = [0.6, 3, 6, 9, 12, 14.5, 17, 19, 20.4, 21.4], an = [0.85, 0.8, 1.05, 1.5, 1.85, 1.95, 1.7, 1.1, 0.55, 0.08], gr = [0.34, 0.33, 0.32, 0.3, 0.28, 0.26, 0.24, 0.2, 0.15, 0.06];
      ps.push(hoja(ks.map((k, i) => [k, -0.5 * Math.sin((Math.PI * k) / 21.4) + 1.7 * Math.pow(k / 21.4, 3), an[i], gr[i]])));
      // acanaladuras en las dos caras
      for (const s of [1, -1]) ps.push(un([hueso(P(2, -0.35, s * 0.27), P(13, -0.1, s * 0.25), 0.13 * S, 0.1 * S, { mat, tono: -0.2 })], mat, 0.1));
      break;
    }
    case 'tridente': {
      ps.push(un([hueso(P(-18), P(26.6), 0.72 * S, 0.66 * S, { mat: mango })], mango, 0.2));
      ps.push(un([hueso(P(-2.6), P(2.6), 0.84 * S, 0.84 * S, { mat: 'cu_cuero' }), bulto(P(-2.6), [0.4 * S, 0.95 * S, 0.95 * S], { eje: dd, mat: 'cu_cuero', tono: 0.06 }), bulto(P(2.6), [0.4 * S, 0.95 * S, 0.95 * S], { eje: dd, mat: 'cu_cuero', tono: 0.06 })], 'cu_cuero', 0.2));
      ps.push(un([bulto(P(-18.3), [1.0 * S, 0.78 * S, 0.78 * S], { eje: dd, mat })], mat));
      const c: Comp[] = [hueso(P(25.8), P(28.4), 0.8 * S, 0.98 * S, { mat }), bulto(P(26), [0.42 * S, 1.12 * S, 1.12 * S], { eje: dd, mat, tono: 0.06 }), hueso(P(28.2), P(36.4), 0.64 * S, 0.3 * S, { mat }), bulto(P(37.2), [1.5 * S, 0.88 * S, 0.3 * S], { ejes: ejesH, mat })];
      for (const s of [1, -1]) {
        c.push(...cadenaHuesos([P(28.3), P(28.7, s * 1.8), P(29.6, s * 3.1), P(31.4, s * 3.5), P(34.6, s * 3.3)], 0.66 * S, 0.32 * S, mat));
        c.push(bulto(P(35.6, s * 3.2), [1.3 * S, 0.72 * S, 0.28 * S], { ejes: ejesH, mat }));
        c.push(hueso(P(35.2, s * 3.0), P(34.0, s * 2.15), 0.3 * S, 0.08 * S, { mat }), hueso(P(36.2, s * 0.45), P(35.0, s * 1.15), 0.26 * S, 0.07 * S, { mat }));
      }
      ps.push(un(c, mat, 0.32));
      break;
    }
    case 'maza_estrella': {
      const asta: Comp[] = [hueso(P(-3), P(13.6), 0.8 * S, 0.74 * S, { mat: mango })];
      for (let i = 0; i < 4; i++) asta.push(bulto(P(-2.2 + i * 1.45), [0.36 * S, 0.92 * S, 0.92 * S], { eje: dd, mat: mango, tono: 0.08 }));
      ps.push(un(asta, mango, 0.25));
      const cab: Comp[] = [bulto(P(-3.4), [1.0 * S, 1.0 * S, 1.0 * S], { mat }), hueso(P(12.6), P(14.4), 0.95 * S, 1.25 * S, { mat }), bulto(P(16.6), [2.7 * S, 2.7 * S, 2.7 * S], { mat })];
      for (const s of [1, -1]) cab.push(hueso(P(9.4, s * 0.82), P(13.4, s * 0.95), 0.3 * S, 0.36 * S, { mat }));
      // púas repartidas en la esfera (espiral de Fibonacci), sin las que miran al mango
      const N = 14, C = P(16.6);
      for (let i = 0; i < N; i++) {
        const z = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - z * z), a = i * 2.39996;
        if (z < -0.55) continue;
        const dir = nor(add(add([dd[0] * z, dd[1] * z, dd[2] * z], canto, Math.cos(a) * r), plano, Math.sin(a) * r));
        cab.push(hueso(add(C, dir, 2.0 * S), add(C, dir, 4.9 * S), 0.78 * S, 0.06 * S, { mat }));
      }
      ps.push(un(cab, mat, 0.45));
      break;
    }
    case 'jabalina': {
      ps.push(un([hueso(P(-15), P(20.6), 0.5 * S, 0.46 * S, { mat: mango })], mango, 0.2));
      ps.push(un([hueso(P(-1.9), P(1.9), 0.64 * S, 0.64 * S, { mat: 'cu_cuero' }), ...[-1.9, 0, 1.9].map((k) => bulto(P(k), [0.3 * S, 0.74 * S, 0.74 * S], { eje: dd, mat: 'cu_cuero', tono: 0.08 }))], 'cu_cuero', 0.2));
      ps.push(un([hueso(P(-15), P(-16.6), 0.5 * S, 0.1 * S, { mat }), hueso(P(19.8), P(22), 0.52 * S, 0.64 * S, { mat })], mat, 0.2));
      ps.push(hoja([[21.6, 0, 0.55, 0.32], [23, 0, 1.15, 0.3], [24.8, 0, 1.25, 0.28], [26.5, 0, 0.9, 0.24], [27.8, 0, 0.4, 0.16], [28.6, 0, 0.06, 0.06]], mat, [hueso(P(21.6), P(27.4), 0.32 * S, 0.1 * S, { mat })]));
      break;
    }
    case 'hoz': {
      ps.push(un([hueso(P(-3.6), P(4.4), 0.66 * S, 0.62 * S, { mat: mango }), bulto(P(-3.9), [0.8 * S, 0.88 * S, 0.88 * S], { eje: dd, mat: mango, tono: -0.05 })], mango, 0.3));
      ps.push(un([hueso(P(4.0), P(5.5), 0.74 * S, 0.7 * S, { mat }), bulto(P(4.1), [0.3 * S, 0.84 * S, 0.84 * S], { eje: dd, mat, tono: 0.06 })], mat, 0.15));
      // la media luna en el plano del arma: arranca de la virola, sube y se vuelve hacia atrás afinándose (filo por dentro)
      const C = P(5.6, 0, 4.4);
      const dirG = (g: number): V3 => nor(add([-plano[0] * Math.cos(rad(g)), -plano[1] * Math.cos(rad(g)), -plano[2] * Math.cos(rad(g))], dd, Math.sin(rad(g))));
      const gs = [0, 25, 50, 80, 110, 140, 165, 190, 208], an = [1.0, 1.08, 1.05, 0.95, 0.82, 0.62, 0.42, 0.22, 0.05];
      ps.push(masa(cinta(gs.map((g, i) => ({ p: add(C, dirG(g), (4.5 - (g / 208) * 0.8) * S), an: an[i] * S, gr: (0.3 - i * 0.026) * S, w: dirG(g) })), mat, 1.0 * S), { mat, suave: 0.25 * S }));
      break;
    }
    case 'orbe_mano': {
      ps.push(un([hueso(P(-2.6), P(1.6), 0.6 * S, 0.68 * S, { mat: mango }), bulto(P(-2.9), [0.75 * S, 0.75 * S, 0.75 * S], { mat })], mango, 0.25));
      const cuna: Comp[] = [bulto(P(2.0), [0.85 * S, 1.3 * S, 1.3 * S], { eje: dd, mat })];
      for (let i = 0; i < 4; i++) {
        const a = rad(45 + i * 90), r = nor(add([canto[0] * Math.cos(a), canto[1] * Math.cos(a), canto[2] * Math.cos(a)], plano, Math.sin(a)));
        const Q = (k: number, d: number) => add(P(k), r, d * S);
        cuna.push(...cadenaHuesos([Q(2.2, 0.9), Q(4.0, 2.5), Q(6.3, 2.6), Q(8.1, 1.2)], 0.52 * S, 0.12 * S, mat));
      }
      ps.push(un(cuna, mat, 0.35));
      ps.push(esfera(...P(5.6), 2.15 * S, { mat: gema ?? 'magia' }));
      break;
    }
    case 'katar': {
      const g: Comp[] = [];
      for (const s of [1, -1]) g.push(hueso(P(-4.4, s * 1.5), P(0.9, s * 1.55), 0.38 * S, 0.4 * S, { mat }), bulto(P(-4.6, s * 1.5), [0.5 * S, 0.5 * S, 0.5 * S], { mat }));
      ps.push(un(g, mat, 0.25));
      ps.push(un([hueso(P(-1, 1.5), P(-1, -1.5), 0.5 * S, 0.5 * S, { mat: mango }), hueso(P(-2.7, 1.5), P(-2.7, -1.5), 0.45 * S, 0.45 * S, { mat: mango })], mango, 0.2));
      ps.push(hoja([[1.2, 0, 1.75, 0.42], [3, 0, 1.6, 0.4], [6, 0, 1.25, 0.34], [9, 0, 0.85, 0.26], [11.4, 0, 0.42, 0.18], [13.2, 0, 0.06, 0.06]], mat, [bulto(P(1.3), [0.8 * S, 1.9 * S, 0.62 * S], { ejes: ejesH, mat }), hueso(P(1.6), P(11.8), 0.36 * S, 0.1 * S, { mat })]));
      break;
    }
    case 'lanza_dragon': {
      ps.push(un([hueso(P(-18), P(27.8), 0.76 * S, 0.7 * S, { mat: mango }), hueso(P(-18), P(-20.6, 0.7), 0.7 * S, 0.1 * S, { mat })], mango, 0.25));
      for (const k of [-12, -6, 6, 12, 18, 24]) ps.push(un([bulto(P(k), [0.5 * S, 0.98 * S, 0.98 * S], { eje: dd, mat: 'cu_oro' })], 'cu_oro'));
      // la cabeza del dragón: cráneo, hocico y mandíbula abierta, cuernos y cresta hacia atrás, y las alas (orejetas)
      const cab: Comp[] = [
        bulto(P(28.8, 0, 0.3), [1.9 * S, 1.3 * S, 1.45 * S], { ejes: ejesH, mat }), hueso(P(29.8, 0, 0.55), P(31.6, 0, 0.35), 1.0 * S, 0.62 * S, { mat }),
        hueso(P(29.4, 0, -0.5), P(31.0, 0, -0.9), 0.7 * S, 0.4 * S, { mat }), hueso(P(28.2, 0, 1.2), P(25.8, 0, 1.5), 0.36 * S, 0.08 * S, { mat: 'cu_cuerno' }),
      ];
      for (const s of [1, -1]) {
        cab.push(...cadenaHuesos([P(28.6, s * 0.8, 1.0), P(27.4, s * 1.4, 1.8), P(26.0, s * 1.8, 2.0)], 0.5 * S, 0.08 * S, 'cu_cuerno'));
        for (let i = 0; i < 3; i++) {
          const x = nor(add([-dd[0] * 0.75, -dd[1] * 0.75, -dd[2] * 0.75], canto, s * (0.55 + i * 0.2)));
          cab.push(bulto(P(27.3 - i * 0.7, s * (2.1 + i * 0.55), -0.2), [(2.0 - i * 0.35) * S, 0.85 * S, 0.22 * S], { ejes: [x, nor(cruz(plano, x)), plano], mat, tono: -i * 0.04 }));
        }
      }
      ps.push(un(cab, mat, 0.4));
      for (const s of [1, -1]) ps.push(esfera(...P(29.9, s * 0.78, 0.85), 0.3 * S, { mat: 'cu_ojo_brasa' }));
      // la hoja flamígera sale de las fauces
      const ks = [31.2, 32.6, 34, 35.4, 36.8, 38.2, 39.6, 40.6, 41.4];
      ps.push(hoja(ks.map((k, i) => [k, 0.45 * Math.sin((k - 31.2) * 0.95), 1.35 - (i / (ks.length - 1)) * 1.0 - (i === ks.length - 1 ? 0.3 : 0), 0.34 - i * 0.034])));
      break;
    }
    case 'gran_baculo': {
      const [pie, tope, up] = varaDe(e, m, 1.06);
      let ex = nor(cruz(up, F)); if (len(cruz(up, F)) < 0.2) ex = nor(cruz(up, [1, 0, 0]));
      const ey = cruz(up, ex), gv = rad(e.pose?.giroVara ?? 0);
      // vara nudosa con un leve serpenteo y dos nudos
      const N = 7, vs: Comp[] = [];
      const Q = (t: number) => add(mez(pie, tope, t), ex, Math.sin(t * 9) * 0.3 * S * Math.sin(Math.PI * t));
      for (let i = 0; i < N; i++) vs.push(hueso(Q(i / N), Q((i + 1) / N), (0.8 + 0.12 * (i / N)) * S, (0.8 + 0.12 * ((i + 1) / N)) * S, { mat: mango }));
      for (const t of [0.36, 0.63]) vs.push(bulto(Q(t), [1.05 * S, 1.05 * S, 1.3 * S], { eje: up, mat: mango, tono: -0.05 }));
      // corona: tres ramas que suben, se abren y se cierran sobre la gema
      for (let i = 0; i < 3; i++) {
        const a = gv + rad(i * 120), r = nor(add([ex[0] * Math.cos(a), ex[1] * Math.cos(a), ex[2] * Math.cos(a)], ey, Math.sin(a)));
        const R = (h: number, d: number) => add(add(tope, up, h * S), r, d * S);
        vs.push(...cadenaHuesos([R(-0.4, 0.3), R(2.4, 2.0), R(5.2, 3.0), R(7.8, 1.9), R(9.0, 0.3)], 0.9 * S, 0.14 * S, mango));
      }
      ps.push(masa(vs, { mat: mango, suave: 0.6 * S }));
      ps.push(un([bulto(add(tope, up, -0.8 * S), [0.6 * S, 1.3 * S, 1.3 * S], { eje: up, mat }), bulto(Q(0.66), [0.5 * S, 1.2 * S, 1.2 * S], { eje: up, mat })], mat, 0.2));
      ps.push(esfera(...add(tope, up, 5.2 * S), 2.2 * S, { mat: gema ?? 'magia' }));
      break;
    }
    default: break;
  }
  return ps;
}

/** La vara del báculo o el cetro por la mano: [pie, tope, eje]; casi vertical salvo que la pose la incline. */
function varaDe(e: Esqueleto, m: V3, lg: number): [V3, V3, V3] {
  const S = e.S;
  if (e.varaPie && e.vara) {
    // apoyada: el pie queda en su punto y la vara (de largo fijo) pasa por la mano
    const L = len(sub(m, e.varaPie));
    return [e.varaPie, add(m, e.vara, Math.max(12 * S, 64 * S * lg - L)), e.vara];
  }
  if (!e.vara) return [add([m[0], m[1], Math.max(0.5, m[2] - 24 * S * lg)], e.F, 1.2), add([m[0], m[1], m[2] + 26 * S * lg], e.F, 2.4), [0, 0, 1]];
  const v = e.vara, pie = add(m, v, -24 * S * lg);
  if (pie[2] < 0.5) { const k = (m[2] - 0.5) / Math.max(0.01, m[2] - pie[2]); pie[0] = m[0] + (pie[0] - m[0]) * k; pie[1] = m[1] + (pie[1] - m[1]) * k; pie[2] = 0.5; }
  return [pie, add(m, v, 26 * S * lg), v];
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
    case 'baculo': case 'cetro': { const [, t, up] = varaDe(e, b.mano, tipo === 'cetro' ? 0.45 : 1); return [t, add(t, up, 4 * S)]; }
    case 'arco': case 'arco_largo': case 'arco_corto': case 'ballesta': { if (tipo === 'ballesta' && (e.pose?.pegaI ?? 1) < 0.5) return [b.mano, add(b.mano, b.eje, 11 * S)]; const c = e.brazos[1].mano, k = tipo === 'arco_largo' ? 17 : tipo === 'arco_corto' ? 10.5 : 12; const up: V3 = tipo === 'ballesta' || !e.caida ? [0, 0, 1] : marcoArco(e, c, b.mano).arriba; return [add(c, up, -k * S), add(c, up, k * S)]; }
    case 'katana': return [en(2), en(25)];
    case 'estoque': return [en(2), en(27)];
    case 'falcata': return [en(2), en(20.5)];
    case 'tridente': return [en(28), en(37)];
    case 'maza_estrella': return [en(14), en(20)];
    case 'jabalina': return [en(21), en(28)];
    case 'orbe_mano': return [en(3.8), en(7.6)];
    case 'katar': return [en(1.5), en(12.5)];
    case 'lanza_dragon': return [en(31), en(41)];
    case 'gran_baculo': { const [, t, up] = varaDe(e, b.mano, 1.06); return [add(t, up, 3 * S), add(t, up, 7.6 * S)]; }
    case 'hoz': {
      const [, plano] = marcoArma(b.eje, e.F, b.s > 0 ? b.d2 : undefined), C = add(en(5.6), plano, 4.4 * S);
      const arcoP = (g: number, R: number): V3 => add(add(C, plano, -Math.cos(rad(g)) * R * S), b.eje, Math.sin(rad(g)) * R * S);
      return [arcoP(50, 4.25), arcoP(185, 3.85)];
    }
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
  const { S } = e;
  const b = e.brazos[1];
  const ps: Pieza[] = [];
  if (dos(derecha) || esArco(derecha) || derecha === 'ballesta') return ps;
  // la cara del escudo mira hacia donde mira el torso y se abre hacia afuera entre 10° y 45°: la apertura se elige por
  // dirección (fija en todos los cuadros de esa dirección) para que la cámara vea la cara y nunca el canto
  let F = e.F;
  if (!e.caida) {
    const C: V3 = [Math.SQRT1_2, Math.SQRT1_2, 0], izqC = -dot3(e.R, C), adeC = dot3(e.F, C);
    let ab = 10, mejor = -1;
    for (let g = 10; g <= 45; g += 5) { const v = Math.abs(adeC * Math.cos(rad(g)) + izqC * Math.sin(rad(g))); if (v > mejor + 1e-6) { mejor = v; ab = g; } }
    const [ex, ey] = e.ejesT, fh = nor([ex[0] * Math.cos(rad(ab)) + ey[0] * Math.sin(rad(ab)), ex[1] * Math.cos(rad(ab)) + ey[1] * Math.sin(rad(ab)), 0]);
    if (isFinite(fh[0]) && len([fh[0], fh[1], 0]) > 0.5) F = fh;
  }
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
export function armaSuelta(tipo: TipoArma, o: { mat?: string; mango?: string; gema?: string; encanto?: Encanto; escala?: number; nivel?: 1 | 2 | 3 | 4 | 5; apoyado?: boolean; alzar?: number }, pose: 'flota' | 'suelo' | 'clavada' | 'icono', f: number): { piezas: Pieza[]; resplandor?: { c: V3; r: number; color: string } } {
  const largo: Partial<Record<TipoArma, number>> = { espada: 24, cimitarra: 24, mandoble: 34, daga: 10, hacha: 23, hacha_doble: 31, maza: 18, martillo: 27, mangual: 12, lanza: 36, alabarda: 36, guadana: 31, garras: 9, varita: 11, baculo: 30, cetro: 16, arco: 30, ballesta: 16,
    katana: 27, estoque: 28, falcata: 22, tridente: 38, maza_estrella: 21, arco_largo: 39, arco_corto: 26, jabalina: 29, gran_baculo: 34, orbe_mano: 11, katar: 13, hoz: 13, lanza_dragon: 42, cestus: 8, frasco: 10 };
  const L = largo[tipo] ?? 20;
  let mano: V3, eje: V3, F: V3 = [1, 0, 0];
  if (pose === 'flota') {
    const a = (f / 8) * Math.PI * 2;
    F = [Math.cos(a), Math.sin(a), 0];
    eje = nor([F[0] * 0.75, F[1] * 0.75, 1]);
    mano = [0, 0, 14 + Math.sin(a) * 1.5];
    if (esVara(tipo)) mano = [0, 0, 30];
    if (tipo === 'arco_largo') mano = [0, 0, 21];
  } else if (pose === 'suelo') {
    eje = nor([1, -0.35, 0]); F = nor([0.35, 1, 0]);
    mano = [-L * 0.45, L * 0.16, 1.4];
    if (esVara(tipo)) { mano = [0, 0, 30]; }
    // el cesto y el frasco (solo de la forja) quedan tendidos y apoyados: el cesto boca abajo con el dorso arriba, el
    // frasco acostado; se arman una vez a ras del piso y se suben lo que asome por debajo
    if (SOLO_FORJA.includes(tipo) && !o.apoyado) {
      const r = armaSuelta(tipo, { ...o, apoyado: true }, pose, f);
      const z = 0.05 - bajoDe(r.piezas);
      return armaSuelta(tipo, { ...o, apoyado: true, alzar: z }, pose, f);
    }
    if (tipo === 'cestus') F = [0, 0, 1];
    mano = [mano[0], mano[1], o.alzar !== undefined ? o.alzar : mano[2]];
  } else if (pose === 'icono') {
    // para el inventario: de pie; las hojas de frente a la cámara, las cabezas de hacha, martillo o guadaña de perfil
    // (los arcos nuevos y la hoz de perfil, para que se lea la curva de las palas y la media luna)
    // (el arco simple también de perfil: de frente se veía de canto, como un palo)
    const deLado = ['hacha', 'hacha_doble', 'martillo', 'guadana', 'alabarda', 'mangual', 'maza', 'hoz', 'arco', 'arco_largo', 'arco_corto', 'maza_estrella'].includes(tipo);
    eje = [0, 0, 1]; F = deLado ? nor([1, -1, 0]) : nor([1, 1, 0]); mano = [0, 0, 0];
    // (las del arsenal elemental: la punta un poco atrás y la cara hacia la luz)
    if (o.nivel) [eje, F] = marcoIcono(deLado);
  } else {
    eje = [0, 0, -1]; mano = [0, 0, L * 0.72]; F = nor([1, -1, 0]);
  }
  const R: V3 = [F[1], -F[0], 0];
  // las armas cortas se muestran más grandes para que se lean como botín
  const SS = o.escala ?? (L < 14 ? 1.7 : 1);
  const b: Brazo = { s: 1, hom: mano, codo: mano, mun: mano, mano, d1: eje, d2: eje, eje };
  const e = { S: SS, A: SS, F, R, zc: 0, hombroZ: 0, cz: 0, brazos: [b, { ...b, mano: tipo === 'arco' || tipo === 'ballesta' ? mano : mano }] } as unknown as Esqueleto;
  if (nivelArma({ tipo, nivel: o.nivel })) {
    // el arsenal elemental: la forma forjada, los adornos del nivel y la capa del elemento con su luz
    const piezas = armaForjadaEn(e, b, { ...o, tipo }, f, 3);
    // el frasco tirado alumbra con su poción (el juego lo toma como fuente de luz)
    if (!o.encanto && tipo === 'frasco' && pose === 'suelo') return { piezas, resplandor: { c: add(mano, eje, 4 * SS), r: 9, color: '#b46ae8' } };
    if (!o.encanto) return { piezas };
    const [a, z] = filoDe(e, tipo, b);
    return { piezas, resplandor: { c: mez(a, z, 0.5), r: 12 + (o.nivel ?? 1) * 2.5, color: LUZ_ELEMENTO_ARMA[o.encanto].color } };
  }
  const piezas = arma(e, tipo, b, o.mat ?? 'cu_placa', o.mango ?? 'cu_cuero', o.gema);
  if (!o.encanto) return { piezas };
  const [a, z] = filoDe(e, tipo, b);
  piezas.push(...encantar(a, z, o.encanto, f, SS, 3));
  return { piezas, resplandor: { c: mez(a, z, 0.5), r: 18, color: ENCANTOS.find((x) => x[0] === o.encanto)![3] } };
}

/** El punto más bajo de unas piezas (para apoyar en el piso lo que queda tendido). */
function bajoDe(ps: Pieza[]): number {
  let z = Infinity;
  const elip = (c: V3, ex: V3, ey: V3, ez: V3, r: V3) => c[2] - Math.hypot(ex[2] * r[0], ey[2] * r[1], ez[2] * r[2]);
  for (const p of ps) {
    if (p.resta) continue;
    if (p.k === 'masa') for (const c of p.comps) z = Math.min(z, c.f === 'hueso' ? Math.min(c.a[2] - c.r0, c.b[2] - c.r1) : elip(c.c, c.ex, c.ey, c.ez, c.r));
    else if (p.k === 'conv') for (const q of p.pts) z = Math.min(z, q[2]);
    else if (p.k === 'elip') z = Math.min(z, elip(p.c, p.ex, p.ey, p.ez, p.r));
    else z = Math.min(z, p.o[2] - Math.max(p.r0, p.r1), p.o[2] + p.ez[2] * p.h - Math.max(p.r0, p.r1));
  }
  return isFinite(z) ? z : 0;
}

// ------------------------------------------------------------------ el arsenal elemental (forja_armas.ts y elementos_arma.ts)
/** Las formas que solo pinta la forja: sin nivel salen comunes. */
const SOLO_FORJA: TipoArma[] = ['cestus', 'frasco'];
/** El nivel del arsenal elemental de un arma (undefined: el arma de siempre del motor). */
const nivelArma = (a: { tipo: TipoArma; nivel?: number }): NivelForja | undefined => (a.nivel ?? (SOLO_FORJA.includes(a.tipo) ? 1 : undefined)) as NivelForja | undefined;
/**
 * Un arma del arsenal elemental en la mano `b`: la forma forjada de su nivel (o la del motor con los adornos del nivel)
 * y la capa viva de su elemento sobre el tramo vivo (hoja, cabeza o gema). Sirve igual para el cuerpo y para el ícono.
 */
function armaForjadaEn(e0: Esqueleto, b: Brazo, a: { tipo: TipoArma; mat?: string; mango?: string; gema?: string; encanto?: Encanto; nivel?: number }, f: number, semilla: number): Pieza[] {
  const tipo = a.tipo, nivel = nivelArma(a) ?? 1;
  const o: OpcForja = { tipo, nivel, encanto: a.encanto, mat: a.mat ?? 'ar_acero', mango: a.mango ?? 'cu_cuero', gema: a.gema };
  // en la mano (el ícono y el arma suelta no tienen torso), lo legendario y lo mítico tienen que leerse a la escala del
  // juego: el arma crece (1.12 legendaria, 1.2 mítica), aclara, lleva los filos y las runas encendidos y gruesos y su
  // capa del elemento es un poco más fuerte
  const enMano = !!e0.ejesT, leyenda = enMano && nivel >= 4;
  const forjar = (g: number) => {
    const e: Esqueleto = g !== 1 ? { ...e0, S: e0.S * g } : e0, S = e.S;
    const mc: MarcoArma = { m: b.mano, dd: b.eje, F: e.F, S, filo: filoDe(esVara(tipo) ? e0 : e, tipo, b), f, giroVara: rad(e.pose?.giroVara ?? 0), vivo: leyenda ? 0.4 : 0.2 };
    // (la vara conserva su largo: crece el remate)
    if (esVara(tipo)) mc.vara = varaDe(e0, b.mano, tipo === 'cetro' ? 0.45 : tipo === 'gran_baculo' ? 1.06 : 1);
    if (esArco(tipo)) {
      // el arco en el puño izquierdo, como lo arma `arma`: hacia dónde tira y su arriba
      const c = e.brazos[1].mano, { tiro, arriba } = marcoArco(e, c, b.mano);
      mc.arco = { c, tiro, arriba };
    }
    if (tipo === 'ballesta') {
      // en la mano: entre las dos manos apuntando adelante (o colgando de la derecha); suelta (ícono): de pie
      const icono = !e.ejesT, suelta = icono || (e.pose?.pegaI ?? 1) < 0.5, ap = icono ? b.eje : suelta ? b.eje : e.F;
      const c = suelta ? add(b.mano, b.eje, icono ? 0 : 2 * S) : mez(e.brazos[1].mano, b.mano, 0.5);
      let lado = cruz(ap, icono ? e.F : [0, 0, 1]); if (len(lado) < 0.2) lado = cruz(ap, e.F);
      mc.ballesta = { c, ap, lado: nor(lado) };
    }
    return { e, mc, ps: formaForjada(mc, o) ?? [...arma(e, tipo, b, o.mat, o.mango, o.gema), ...adornosNivel(mc, o)] };
  };
  let r = forjar(1);
  if (leyenda) {
    // crece alrededor del puño, pero nunca se mete en el piso más de lo que ya llegaba a su tamaño (la cabeza que
    // apoya, la hoja que barre bajo): si con el tamaño nuevo bajaría más, crece solo lo que deja; al morir, tendida en
    // el suelo, vuelve de a poco a su tamaño
    const gT = 1 + ((nivel === 5 ? 1.2 : 1.12) - 1) * (1 - Math.min(1, e0.caida ?? 0));
    const z1 = bajoDe(r.ps), lim = Math.min(z1, 0);
    let rg = forjar(gT);
    const zg = bajoDe(rg.ps);
    if (zg < lim - 0.05) { const g = 1 + ((gT - 1) * (lim - z1)) / (zg - z1); rg = g > 1.01 ? forjar(g) : r; }
    r = rg;
    const realce = nivel === 5 ? 0.14 : 0.1;
    for (const p of r.ps) if (!MATERIALES[p.mat]?.emite) p.tono = (p.tono ?? 0) + realce;
  }
  const { e, mc, ps } = r;
  // (los arcos llevan la capa en las dos palas, más suave: son finas)
  if (a.encanto) for (const [p, q] of tramosVivos(mc, tipo)) {
    let capa = capaElemental(p, q, a.encanto, f, mc.S, esArco(tipo) ? Math.max(1, nivel - 1) : nivel, semilla++, esArco(tipo) ? 0.6 : anchoVivo(tipo), leyenda ? (nivel === 5 ? 1.25 : 1.15) : 1);
    // tumbado en el piso, lo que colgaría bajo el arma (carámbanos, gotas) queda dentro de la tierra
    if ((e.caida ?? 0) > 0.5) capa = capa.filter((pz) => bajoDe([pz]) > -0.8);
    ps.push(...capa);
  }
  return ps;
}

// ------------------------------------------------------------------ geometría para la QA de los cuadros
/** Una elipsoide del cuerpo (centro, ejes y radios) para medir si algo la atraviesa. */
export interface ElipQA { c: V3; ejes: [V3, V3, V3]; r: V3 }
/** Lo que mide la QA numérica en un cuadro: dónde están el mango, el cabo, la cabeza, la cara, la ingle y los pies. */
export interface GeoQA {
  e: Esqueleto;
  /** El arma de la derecha (o el arco de la izquierda): del extremo de atrás a la punta, con su grosor; cabeza: el tramo pesado. */
  arma?: { a: V3; b: V3; r: number; cabeza?: [V3, V3]; rCabeza?: number };
  /** El mango por donde la izquierda tiene que cerrar (a dos manos) y cuánto lo agarra la pose (0 suelta, 1 cerrada). */
  mango?: [V3, V3]; pega: number; dosManos: boolean;
  /** El extremo de atrás del mango (el regatón) cuando sobresale del puño. */
  cabo?: V3;
  /** Cráneo y mandíbula (la cara es la mitad de adelante). */
  craneo: ElipQA; mandibula: ElipQA;
  /** Pecho y vientre (para que las manos y el arma no los atraviesen) e ingle. */
  pecho: ElipQA; vientre: ElipQA; ingle: V3;
  piso: { talon: number; punta: number };
}
export function geometriaQA(cu: Cuerpo, eq: Equipo, dir: Dir, acc: Accion, f: number): GeoQA {
  const tipo = eq.arma?.tipo ?? 'nada';
  const e = esqueleto(cu, dir, acc, f, tipo, eq.izq?.tipo);
  const { S, A, cab, ejesCab, T, ejesT } = e, H = (cu.cabeza ?? 1) * S, der = e.brazos[0], P = e.pose;
  const en = (k: number) => add(der.mano, der.eje, k * S);
  let arma: GeoQA['arma'], mango: [V3, V3] | undefined, cabo: V3 | undefined;
  if (esVara(tipo)) {
    const [pie, tope, up] = varaDe(e, der.mano, tipo === 'cetro' ? 0.45 : tipo === 'gran_baculo' ? 1.06 : 1);
    arma = { a: pie, b: add(tope, up, 4 * S), r: 0.9 * S, cabeza: [tope, add(tope, up, 5 * S)], rCabeza: 2.4 * S };
    mango = [pie, tope];
  } else if (esArco(tipo)) {
    const c = e.brazos[1].mano, k = tipo === 'arco_largo' ? 17 : tipo === 'arco_corto' ? 11 : 14;
    const up = nor(sub(T(0, 0, e.zc + 10), T(0, 0, e.zc))), fw = e.ejesT[0];
    arma = { a: add(add(c, up, -k * S), fw, 1.5 * S), b: add(add(c, up, k * S), fw, 1.5 * S), r: 0.7 * S };
  } else if (tipo === 'ballesta') {
    arma = { a: en(-4), b: en(11), r: 1.2 * S };
  } else if (tipo !== 'nada' && tipo !== 'puno' && tipo !== 'frasco') {
    const L = LARGO_ARMA[tipo] ?? 9, cb = CABO_MANGO[tipo] ?? 1.5;
    const pesada = tipo === 'hacha' || tipo === 'hacha_doble' || tipo === 'martillo' || tipo === 'maza' || tipo === 'maza_estrella' || tipo === 'guadana' || tipo === 'alabarda';
    const [fa, fb] = filoDe(e, tipo, der);
    arma = { a: en(-cb), b: en(L), r: 0.9 * S, cabeza: [fa, fb], rCabeza: pesada ? 3.2 * S : 1.4 * S };
    const largoMango = pesada || tipo === 'lanza' || tipo === 'tridente' || tipo === 'lanza_dragon' || tipo === 'jabalina';
    mango = [en(-cb), largoMango ? fa : en(1)];
    if (cb >= 3) cabo = en(-cb);
  }
  return {
    e, arma, mango, cabo,
    pega: P?.pegaI ?? (dos(tipo) || tipo === 'lanza' ? 1 : 0),
    dosManos: dos(tipo) || tipo === 'lanza',
    craneo: { c: cab(-0.2 * H, 0, e.cz + 0.9 * H), ejes: ejesCab, r: [4.0 * H, 3.55 * H, 4.3 * H] },
    mandibula: { c: cab(1.5 * H, 0, e.cz - 2.0 * H), ejes: ejesCab, r: [2.9 * H, 2.85 * H, 2.4 * H] },
    pecho: { c: T(0.2 * S, 0, e.zc + 12.3 * S), ejes: ejesT, r: [4.0 * A, 5.7 * A, 5.4 * S] },
    vientre: { c: T(0.5 * S, 0, e.zc + 6.2 * S), ejes: ejesT, r: [3.4 * A, 4.4 * A, 4.6 * S] },
    ingle: (e.Pv ?? e.W)(1.2 * S, 0, e.zc - 3.2 * S),
    piso: { talon: PIE_TALON * A, punta: PIE_PUNTA * A },
  };
}
/** Distancia normalizada de q a una elipsoide inflada en `extra` (menos de 1: adentro). */
export function dentroElip(el: ElipQA, q: V3, extra = 0): number {
  const d = sub(q, el.c);
  return Math.hypot(dot3(d, el.ejes[0]) / (el.r[0] + extra), dot3(d, el.ejes[1]) / (el.r[1] + extra), dot3(d, el.ejes[2]) / (el.r[2] + extra));
}
/** Solo la tela que cuelga de la cintura (faldón, túnica, hábito, vestido) de un cuadro, para medir su silueta en la QA. */
export function telaQA(cu: Cuerpo, eq: Equipo, dir: Dir, acc: Accion, f: number): { piezas: Pieza[]; pelvis: V3; e: Esqueleto } {
  const e = esqueleto(cu, dir, acc, f, eq.arma?.tipo ?? 'nada', eq.izq?.tipo);
  const ps: Pieza[] = [], pz = eq.piernas, to = eq.torso;
  if (pz?.tipo === 'taparrabo') ps.push(faldon(e, pz.mat, 9, 1.05, acc, f));
  else if (pz?.tipo === 'faldon') ps.push(faldon(e, pz.mat, 15, 1.25, acc, f));
  else if (pz?.tipo === 'tunica_larga') ps.push(faldon(e, pz.mat, 30, 1.5, acc, f));
  if (to?.tipo === 'tunica' || to?.tipo === 'harapos') ps.push(faldon(e, to.mat, to.tipo === 'harapos' ? 13 : 12, 1.2, acc, f));
  if (to?.tipo === 'vestido') ps.push(faldon(e, to.mat, 29, 1.7, acc, f));
  return { piezas: ps, pelvis: (e.Pv ?? e.W)(0, 0, e.zc), e };
}
