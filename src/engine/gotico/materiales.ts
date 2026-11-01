import { ruido, type V3 } from './render';

/**
 * Materiales del taller gótico. Cada uno es una rampa corta de colores (de la sombra a la luz, como las paletas de
 * 256 colores de la época: tonos apagados, poca saturación, negros con color), cuánto ruido mete su textura y a
 * qué escala, y un patrón opcional que sale de la posición en el mundo (juntas de piedra, vetas, tablas), así el
 * patrón sigue igual en todas las caras de la pieza.
 */
export interface Material {
  rampa: string[];
  ruido: number;
  escala: number;
  brillo?: number;
  emite?: boolean;
  patron?: (p: V3, n: V3) => number;
}

const junta = (v: number, paso: number, grosor = 1) => { const m = ((v % paso) + paso) % paso; return m < grosor ? 1 : 0; };
/** Bloques de piedra: hiladas de `alto` con juntas, cada hilada corrida media pieza. */
function bloques(largo: number, alto: number) {
  return (p: V3, n: V3) => {
    const fila = Math.floor(p[2] / alto);
    if (Math.abs(n[2]) > 0.7) {
      // cara de arriba: losas
      const fx = Math.floor((p[0] + (Math.floor(p[1] / alto) % 2) * largo * 0.5) / largo);
      return junta(p[1], alto) || junta(p[0] + (Math.floor(p[1] / alto) % 2) * largo * 0.5, largo) ? -0.32 : (ruido(fx * 3.1, p[1] / alto, 7) - 0.5) * 0.16;
    }
    const corre = (fila % 2) * largo * 0.5;
    const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
    if (junta(p[2], alto)) return -0.34;
    if (junta(u + corre, largo)) return -0.3;
    const b = Math.floor((u + corre) / largo);
    return (ruido(b * 1.7, fila * 2.3, 3) - 0.5) * 0.18;
  };
}
/** Tablas de madera a lo largo de un eje con vetas. */
function tablas(ancho: number) {
  return (p: V3, n: V3) => {
    const vertical = Math.abs(n[2]) < 0.7;
    const u = vertical ? (Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]) : p[0];
    const v = vertical ? p[2] : p[1];
    if (junta(u, ancho)) return -0.3;
    const tabla = Math.floor(u / ancho);
    return (ruido(tabla * 3.3, v * 0.08, 1) - 0.5) * 0.3 + (ruido(u * 0.9, v * 0.05, tabla) - 0.5) * 0.12;
  };
}
const vetas = (p: V3) => (ruido(p[0] * 0.15, p[1] * 0.15, p[2] * 0.9) - 0.5) * 0.25;

export const MATERIALES: Record<string, Material> = {
  // piedra
  piedra: { rampa: ['#1a1816', '#2c2925', '#423d36', '#5a544a', '#736b5e', '#8d8574', '#a69d89'], ruido: 0.35, escala: 0.18 },
  piedra_bloques: { rampa: ['#191714', '#2a2722', '#3d3830', '#544d42', '#6b6355', '#847a69', '#9c917c'], ruido: 0.22, escala: 0.2, patron: bloques(14, 7) },
  piedra_gris: { rampa: ['#16181a', '#25282b', '#373b3f', '#4c5155', '#62676b', '#7b8084', '#969a9c'], ruido: 0.3, escala: 0.22, patron: bloques(16, 8) },
  piedra_musgo: { rampa: ['#141712', '#22281d', '#333c2a', '#465039', '#5b6548', '#717a58', '#8a8f6c'], ruido: 0.4, escala: 0.2, patron: bloques(14, 7) },
  ladrillo: { rampa: ['#1c100c', '#2f1a13', '#43251a', '#5a3322', '#71432c', '#895537', '#a26b47'], ruido: 0.2, escala: 0.3, patron: bloques(8, 4) },
  marmol: { rampa: ['#2a2826', '#46423e', '#635e57', '#837d74', '#a39c91', '#c0b9ad', '#d8d1c4'], ruido: 0.18, escala: 0.08, brillo: 0.25, patron: (p) => (ruido(p[0] * 0.05 + p[2] * 0.12, p[1] * 0.05, p[2] * 0.03) > 0.72 ? -0.25 : 0) },
  marmol_negro: { rampa: ['#0c0b0d', '#18161a', '#252228', '#343038', '#46414b', '#5c5662', '#746e7a'], ruido: 0.15, escala: 0.08, brillo: 0.3, patron: (p) => (ruido(p[0] * 0.06 + p[2] * 0.1, p[1] * 0.06, 2) > 0.75 ? 0.25 : 0) },
  arenisca: { rampa: ['#2a1f14', '#45331f', '#62492c', '#7f603a', '#9b784a', '#b5905d', '#cba874'], ruido: 0.28, escala: 0.15, patron: bloques(16, 8) },
  arenisca_lisa: { rampa: ['#2a1f14', '#45331f', '#62492c', '#7f603a', '#9b784a', '#b5905d', '#cba874'], ruido: 0.25, escala: 0.12 },
  roca: { rampa: ['#121110', '#211f1c', '#33302b', '#47423b', '#5c564c', '#736b5e', '#8b8270'], ruido: 0.55, escala: 0.12 },
  roca_roja: { rampa: ['#150b09', '#261410', '#3a1d16', '#50281d', '#673526', '#804531', '#9a5a40'], ruido: 0.55, escala: 0.12 },
  hielo: { rampa: ['#162430', '#203648', '#2e4c62', '#41667e', '#5a8399', '#7aa3b6', '#a6c6d2', '#d6eaf0'], ruido: 0.25, escala: 0.1, brillo: 0.5 },
  nieve: { rampa: ['#4a5560', '#65717c', '#808c96', '#9ba6ae', '#b5bec4', '#ced5d9', '#e6eaec'], ruido: 0.15, escala: 0.1 },
  cristal: { rampa: ['#1a1030', '#2c1c50', '#422c70', '#5c4290', '#7a5cae', '#9c7ecc', '#c4aaea'], ruido: 0.2, escala: 0.1, brillo: 0.8 },
  // madera y fibras
  madera: { rampa: ['#170e08', '#26170d', '#382213', '#4b2e1a', '#5f3c22', '#744b2b', '#8a5c36'], ruido: 0.15, escala: 0.3, patron: tablas(5) },
  madera_vieja: { rampa: ['#141210', '#221e19', '#332c24', '#453b30', '#584b3c', '#6b5c49', '#7f6e58'], ruido: 0.2, escala: 0.3, patron: tablas(5) },
  madera_lisa: { rampa: ['#170e08', '#26170d', '#382213', '#4b2e1a', '#5f3c22', '#744b2b', '#8a5c36'], ruido: 0.2, escala: 0.2, patron: vetas },
  corteza: { rampa: ['#0f0c09', '#1b1610', '#2a2118', '#3a2e21', '#4b3b2b', '#5d4a37'], ruido: 0.5, escala: 0.35, patron: (p) => (ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.08) - 0.5) * 0.5 },
  corteza_muerta: { rampa: ['#121110', '#201e1b', '#302d29', '#423e38', '#55504a', '#69635b'], ruido: 0.45, escala: 0.35, patron: (p) => (ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.08) - 0.5) * 0.45 },
  paja: { rampa: ['#2a2010', '#45351a', '#614b25', '#7d6231', '#987a3f', '#b29350', '#c9ab66'], ruido: 0.5, escala: 0.5, patron: (p) => (ruido(p[0] * 1.5, p[1] * 1.5, p[2] * 0.2) - 0.5) * 0.4 },
  tela: { rampa: ['#1d1a16', '#2f2a23', '#433c32', '#595043', '#706656', '#887c6a', '#a0957f'], ruido: 0.2, escala: 0.15 },
  tela_roja: { rampa: ['#1a0807', '#2c0d0b', '#410f0d', '#581612', '#701e18', '#8a2a20', '#a5392b'], ruido: 0.2, escala: 0.15 },
  tela_azul: { rampa: ['#0a0d18', '#111728', '#18213a', '#212d4e', '#2c3a63', '#3a4a79', '#4b5c90'], ruido: 0.2, escala: 0.15 },
  tela_verde: { rampa: ['#0b120b', '#131e12', '#1c2b1a', '#273923', '#33482d', '#405838', '#4f6a45'], ruido: 0.2, escala: 0.15 },
  tela_morada: { rampa: ['#140a18', '#221128', '#321a3a', '#43234d', '#562e61', '#6a3b76', '#80498c'], ruido: 0.2, escala: 0.15 },
  cuero: { rampa: ['#170f09', '#27190f', '#3a2516', '#4e321e', '#644027', '#7a5032'], ruido: 0.25, escala: 0.4 },
  cuerda: { rampa: ['#2a2216', '#43371f', '#5e4d2c', '#78633a', '#917a4a'], ruido: 0.4, escala: 0.8 },
  // metales
  hierro: { rampa: ['#0d0e10', '#1a1c1f', '#2a2d31', '#3d4146', '#53585e', '#6b7178', '#868d94'], ruido: 0.25, escala: 0.3, brillo: 0.35 },
  hierro_oxido: { rampa: ['#120c08', '#21150d', '#331f12', '#472a18', '#5c3720', '#71462a', '#88563a'], ruido: 0.5, escala: 0.4, brillo: 0.1 },
  acero: { rampa: ['#16181b', '#272a2e', '#3b3f44', '#53585e', '#6e747a', '#8c9298', '#adb2b6', '#d0d3d5'], ruido: 0.12, escala: 0.2, brillo: 0.7 },
  oro: { rampa: ['#2a1a06', '#45300c', '#634813', '#82621b', '#a17d25', '#bf9a34', '#dbb94c', '#f0d878'], ruido: 0.15, escala: 0.2, brillo: 0.8 },
  bronce: { rampa: ['#1c120a', '#301f10', '#472e17', '#5f3f1f', '#785228', '#926633', '#ab7c42'], ruido: 0.2, escala: 0.25, brillo: 0.5 },
  // vivo y muerto
  hueso: { rampa: ['#2a261e', '#45402f', '#625a43', '#807558', '#9c9070', '#b6ab8a', '#ccc2a3'], ruido: 0.2, escala: 0.4 },
  carne: { rampa: ['#1f0b0a', '#36120f', '#4e1a15', '#68241b', '#823122', '#9c412c'], ruido: 0.4, escala: 0.4, brillo: 0.3 },
  sangre: { rampa: ['#120303', '#220606', '#350a09', '#4a0e0c', '#601411'], ruido: 0.3, escala: 0.3, brillo: 0.5 },
  hojas: { rampa: ['#0a0f08', '#121b0e', '#1b2914', '#26371b', '#314623', '#3e562c', '#4d6837'], ruido: 0.6, escala: 0.4 },
  hojas_otono: { rampa: ['#140b06', '#24130a', '#36200f', '#4b2d14', '#603b19', '#764b20', '#8d5d2a'], ruido: 0.6, escala: 0.4 },
  hojas_selva: { rampa: ['#061008', '#0b1b0e', '#112814', '#18361b', '#204523', '#2a552c', '#356736'], ruido: 0.6, escala: 0.4 },
  pino: { rampa: ['#070c0a', '#0e1612', '#15211a', '#1d2d23', '#263a2c', '#304836'], ruido: 0.5, escala: 0.5 },
  pasto: { rampa: ['#0f140b', '#1a2312', '#26321a', '#334222', '#41522b', '#506335'], ruido: 0.6, escala: 0.6 },
  musgo: { rampa: ['#0f150c', '#1a2414', '#26341c', '#334525', '#41572f'], ruido: 0.6, escala: 0.5 },
  hongo: { rampa: ['#20150f', '#3b261a', '#5a3b28', '#7a5337', '#9a6d4a'], ruido: 0.3, escala: 0.4 },
  tierra: { rampa: ['#120d09', '#1f1710', '#2e2318', '#3e3020', '#4f3e2a', '#614d35'], ruido: 0.5, escala: 0.25 },
  arena: { rampa: ['#3a2c1a', '#544028', '#6e5536', '#886b45', '#a18255', '#b99a68'], ruido: 0.3, escala: 0.3 },
  agua: { rampa: ['#060a10', '#0b1420', '#112030', '#182d42', '#213b55', '#2c4a68'], ruido: 0.25, escala: 0.1, brillo: 0.9 },
  agua_sucia: { rampa: ['#0a0c06', '#14170c', '#1f2312', '#2b3119', '#383f21'], ruido: 0.3, escala: 0.1, brillo: 0.7 },
  baba: { rampa: ['#0d1406', '#18240b', '#253610', '#344a16', '#455f1e', '#587528'], ruido: 0.35, escala: 0.2, brillo: 0.7 },
  teja: { rampa: ['#170a07', '#28120c', '#3b1b12', '#4f2519', '#653021', '#7c3d2b'], ruido: 0.2, escala: 0.3, patron: (p) => (junta(p[0] + p[1], 6) ? -0.3 : 0) + (junta(p[2] * 2 + (Math.floor((p[0] + p[1]) / 6) % 2) * 3, 6) ? -0.2 : 0) },
  pizarra: { rampa: ['#0e0f12', '#191b20', '#262930', '#343841', '#444953', '#565c67'], ruido: 0.2, escala: 0.3, patron: (p) => (junta(p[0] - p[1], 7) ? -0.3 : 0) + (junta(p[2] * 2, 5) ? -0.25 : 0) },
  vidrio: { rampa: ['#0a1018', '#14203a', '#203466', '#7a2a2a', '#c09a3a', '#d8c87a'], ruido: 0.6, escala: 0.25, brillo: 0.6 },
  // cosas que brillan (no se sombrean)
  fuego: { rampa: ['#7a1a06', '#b0340a', '#d85a10', '#f08a1e', '#fbb83a', '#ffe07a', '#fff6c8'], ruido: 0.5, escala: 0.25, emite: true },
  fuego_azul: { rampa: ['#0a1a5a', '#14309a', '#2056d0', '#3a86f0', '#6ab4ff', '#a8dcff', '#e8f6ff'], ruido: 0.5, escala: 0.25, emite: true },
  fuego_verde: { rampa: ['#0a3a0a', '#146a14', '#28a020', '#4ad03a', '#8af06a', '#ccffaa'], ruido: 0.5, escala: 0.25, emite: true },
  lava: { rampa: ['#3a0a04', '#6a1406', '#a02608', '#d0440c', '#f07a1a', '#ffb43a', '#ffe68a'], ruido: 0.6, escala: 0.12, emite: true },
  magia: { rampa: ['#2a0a4a', '#48127a', '#6a22aa', '#9040d0', '#b46ae8', '#d8a8f8', '#f4e0ff'], ruido: 0.5, escala: 0.2, emite: true },
  portal_rojo: { rampa: ['#3a0606', '#6a0c0c', '#a01818', '#d02a20', '#f05a3a', '#ff9a7a', '#ffd8cc'], ruido: 0.5, escala: 0.2, emite: true },
  luz_vela: { rampa: ['#c08a3a', '#e0b050', '#f8d878', '#fff0b8', '#fffbe8'], ruido: 0.2, escala: 0.3, emite: true },
  runa: { rampa: ['#103a5a', '#1a6a9a', '#2a9ad0', '#5ac8f0', '#a8ecff'], ruido: 0.3, escala: 0.2, emite: true },
  cera: { rampa: ['#3a3226', '#5c5040', '#807058', '#a29074', '#c0b092', '#d8cbb0'], ruido: 0.1, escala: 0.3 },
  negro: { rampa: ['#050406', '#0a090c', '#100e12'], ruido: 0.1, escala: 0.3 },
};
export const ID_MATERIALES = Object.keys(MATERIALES);
