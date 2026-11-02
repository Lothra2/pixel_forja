import { registrar, conVarianteY, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso as hM, bulto, ruido, type Comp } from '../render';
import { armaSuelta, type Cuerpo, type Equipo } from '../cuerpo';
import type { Dir } from '../figura';
import {
  PI, rad, add, mez, onda, entre, forma, suelo, mover, pena, piedras, rocaComps, roca, espeleo, prisma, viga, cuerda, cadena,
  calavera, huesoL, llama, farol, cadaver, recorte, semisDe, contornoOrg, penasco, paredRoca,
} from './subterraneo';

/**
 * Cuevas, segunda parte: lo que hace que una cueva no se repita. Espeleotemas en grupos (estalagmitas, estalactitas
 * que cuelgan de cornisas y arcos, columnas, coladas), cristales que alumbran, charcas con reflejo y lagos de agua
 * negra, hongos gigantes que brillan, raíces que bajan del techo, nidos de huesos, telarañas gruesas con capullos,
 * aventureros muertos con su equipo, campamentos de expedición, grietas con vapor, simas, puentes de cuerda y los
 * bordes de un abismo. Cada objeto cambia de forma con la semilla.
 */

const M = MATERIALES;
M.c2_agua = { rampa: ['#05090c', '#0a1218', '#101c24', '#182832', '#223644', '#2e4656', '#3e5a6a'], ruido: 0.2, escala: 0.08, brillo: 1 };
M.c2_agua_turquesa = { rampa: ['#041012', '#081c20', '#0e2a30', '#163c42', '#205056', '#2e666a', '#428082'], ruido: 0.2, escala: 0.08, brillo: 1 };
M.c2_agua_negra = { rampa: ['#020203', '#050507', '#09090c', '#0f0f13', '#16161c', '#202028'], ruido: 0.12, escala: 0.06, brillo: 1.1 };
M.c2_reflejo = { rampa: ['#141a1e', '#1e282e', '#2a363e', '#38464e', '#4a5a62', '#5e6e74'], ruido: 0.4, escala: 0.25, brillo: 0.6, patron: (p) => Math.sin((p[0] - p[1]) * 0.9) * 0.08 };
M.c2_gour = { rampa: ['#16130f', '#262119', '#373025', '#4a4132', '#5e5341', '#746752', '#8b7c64'], ruido: 0.3, escala: 0.2, brillo: 0.35, patron: (p) => Math.sin(p[2] * 3 + (p[0] + p[1]) * 0.15) * 0.05 };
M.c2_tallo = { rampa: ['#24211c', '#3a352d', '#524b40', '#6c6454', '#867d6a', '#a09682', '#b8af9a'], ruido: 0.3, escala: 0.5, patron: (p) => Math.sin(p[2] * 0.6 + Math.atan2(p[1], p[0]) * 7) * 0.04 };
M.c2_sombrero = { rampa: ['#0e0c12', '#1a1620', '#282230', '#383042', '#4a4056', '#5e526a'], ruido: 0.35, escala: 0.35, brillo: 0.15 };
M.c2_sombrero_rojo = { rampa: ['#140808', '#240e0c', '#371612', '#4c2019', '#632b21', '#7a382b'], ruido: 0.35, escala: 0.35, brillo: 0.2 };
M.c2_laminas_azul = { rampa: ['#0a2a3c', '#124262', '#1c5e88', '#2e82b0', '#56aad4', '#9cd2ee', '#dcf2fc'], ruido: 0.5, escala: 0.6, emite: true, patron: (p) => Math.sin(Math.atan2(p[1], p[0]) * 18) * 0.1 };
M.c2_laminas_verde = { rampa: ['#0a2e16', '#124a24', '#1e6a36', '#30904c', '#5cb874', '#a0e0b0', '#e0fae8'], ruido: 0.5, escala: 0.6, emite: true, patron: (p) => Math.sin(Math.atan2(p[1], p[0]) * 18) * 0.1 };
M.c2_laminas_ambar = { rampa: ['#3a1e06', '#5c320c', '#844e14', '#ac6e20', '#d09838', '#ecc670', '#fcecc0'], ruido: 0.5, escala: 0.6, emite: true, patron: (p) => Math.sin(Math.atan2(p[1], p[0]) * 18) * 0.1 };
M.c2_raiz = { rampa: ['#0d0a08', '#1a1410', '#291f18', '#392b21', '#4a382b', '#5c4635', '#6e5541'], ruido: 0.45, escala: 0.4, patron: (p) => (ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.15) - 0.5) * 0.35 };
M.c2_huevo = { rampa: ['#1c1814', '#2e2820', '#443b2e', '#5c503e', '#766850', '#908164', '#a89a7c'], ruido: 0.3, escala: 0.6, brillo: 0.35, patron: (p) => (ruido(p[0] * 1.2, p[1] * 1.2, p[2] * 1.2) > 0.7 ? -0.15 : 0) };
M.c2_seda = { rampa: ['#2a2926', '#3d3b37', '#55524c', '#6e6a62', '#88837a', '#a29c92', '#bab4aa'], ruido: 0.35, escala: 1.2, patron: (p) => Math.sin((p[0] + p[1]) * 2.4 + p[2] * 1.7) * 0.07 };
M.c2_lona = { rampa: ['#17140f', '#272219', '#3a3225', '#4e4432', '#645740', '#7a6b50', '#908062'], ruido: 0.25, escala: 0.6, patron: (p) => Math.sin(p[2] * 1.4) * 0.03 + (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.78 ? -0.12 : 0) };
M.c2_azufre = { rampa: ['#1e1a06', '#34300c', '#4e4812', '#6a641c', '#888228', '#a6a03a', '#c4bc56'], ruido: 0.55, escala: 0.4 };
M.c2_vapor_azufre = { rampa: ['#2e2c1c', '#403e26', '#565232', '#6e6a40', '#888252', '#a29c6a'], ruido: 0.55, escala: 0.22, emite: true };
M.c2_brasa = { rampa: ['#2a0802', '#501206', '#80220a', '#b03c10', '#d86020', '#f4943a', '#ffcc70'], ruido: 0.6, escala: 0.3, emite: true };
M.c2_fondo = { rampa: ['#000000', '#030304', '#060609'], ruido: 0.2, escala: 0.2 };

/** Color de la luz y materiales de cada tinte de cristal u hongo. */
const TINTE: Record<string, { cr: string; luz: string; lam: string; col: string }> = {
  azul: { cr: 'sub_cristal_azul', luz: 'sub_luz_azul', lam: 'c2_laminas_azul', col: '#5aaef0' },
  verde: { cr: 'sub_cristal_verde', luz: 'sub_luz_verde', lam: 'c2_laminas_verde', col: '#5ad88e' },
  rojo: { cr: 'sub_cristal_rojo', luz: 'sub_luz_roja', lam: 'c2_laminas_ambar', col: '#f05a48' },
  ambar: { cr: 'sub_cristal_rojo', luz: 'sub_luz_ambar', lam: 'c2_laminas_ambar', col: '#f0b050' },
};

/** Estalagmitas de un grupo según la forma que tocó: [x, y, alto, radio, curva]. */
function grupoEstal(a: Arma, fm: number): [number, number, number, number, number][] {
  const g: [number, number, number, number, number][] = [];
  const j = () => (a.r() - 0.5) * 4;
  if (fm === 0) { g.push([0, 0, entre(a, 46, 58), 8, 0.2]); for (let i = 0; i < 4; i++) { const t = (i / 4) * 2 * PI + a.r(), d = entre(a, 10, 15); g.push([Math.cos(t) * d, Math.sin(t) * d, entre(a, 9, 24), entre(a, 3, 5), 0.4]); } }
  else if (fm === 1) { g.push([-6 + j(), -4, entre(a, 44, 54), 7, 0.25], [7 + j(), 5, entre(a, 36, 48), 6.5, 0.3], [12, -9, entre(a, 10, 16), 3.5, 0.4], [-14, 9, entre(a, 7, 12), 3, 0.4]); }
  else if (fm === 2) { for (let i = 0; i < 6; i++) { const u = i / 5; g.push([-20 + u * 40 + j(), (a.r() - 0.5) * 8, 48 * Math.pow(1 - Math.abs(u - 0.35) * 1.2, 1.2) + 8, 6.5 - Math.abs(u - 0.35) * 5, 0.25]); } }
  else if (fm === 3) { for (let i = 0; i < 8; i++) { const t = (i / 8) * 2 * PI + a.r() * 0.6, d = i === 0 ? 0 : entre(a, 7, 17); g.push([Math.cos(t) * d, Math.sin(t) * d, i === 0 ? entre(a, 30, 38) : entre(a, 12, 30), i === 0 ? 6 : entre(a, 3, 5), 0.5]); } }
  else if (fm === 4) { g.push([0, 0, entre(a, 34, 42), 8, 0.15], [11, -8, entre(a, 30, 40), 3.2, 0.2], [-10, 10, entre(a, 24, 32), 2.8, 0.25], [9, 11, 9, 3.5, 0.3]); }
  else { const lado = a.r() < 0.5 ? 1 : -1; for (let i = 0; i < 3; i++) g.push([-8 + i * 8 + j(), lado * (i - 1) * 4, entre(a, 30, 50) - i * 6, 6 - i, 1.1]); g.push([14, -10, 12, 3.5, 0.4], [-14, 6, 8, 3, 0.4]); }
  return g;
}

registrar(
  {
    id: 'cue2_estalagmitas', nombre: ['Grupo de estalagmitas', 'Stalagmite cluster'], tema: 'cueva', variantes: ['seca', 'alta', 'humeda', 'quebrada'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const fm = forma(a, 6), ps: Pieza[] = [], cs: Comp[] = [];
      const k = v === 'alta' ? 1.55 : 1, mat = v === 'humeda' ? 'sub_caliza' : a.r() < 0.5 ? 'sub_caliza' : 'sub_roca';
      const g = grupoEstal(a, fm);
      for (const [x, y, h, r, cu] of g) {
        const rota = v === 'quebrada' && h > 18 && a.r() < 0.8 ? entre(a, 0.3, 0.6) : 0;
        cs.push(...espeleo(a, [x, y, 0], h * k, r * (k > 1 ? 1.15 : 1), { mat, curva: cu, rota }));
        if (rota) { const t = a.r() * 2 * PI, L = h * k * rota; const p: V3 = [x + Math.cos(t) * (r + 4), y + Math.sin(t) * (r + 4), r * 0.4]; ps.push(masa([hM(p, [p[0] + Math.cos(t + 0.4) * L, p[1] + Math.sin(t + 0.4) * L, r * 0.3], r * 0.75, 0.6)], { mat, suave: 1 })); }
      }
      // derrame de colada que une los pies
      cs.push(bulto([0, 0, 0], [entre(a, 16, 22), entre(a, 14, 19), 2], { mat, giro: a.r() * 180 }));
      ps.push(masa(cs, { mat, suave: 2 }));
      if (v === 'humeda') {
        for (let i = 0; i < 3; i++) { const t = a.r() * 2 * PI, d = entre(a, 14, 22); ps.push(a.elipsoide(Math.cos(t) * d, Math.sin(t) * d, 0, entre(a, 4, 8), entre(a, 3, 6), 0.9, { mat: 'c2_agua', giro: a.r() * 180 })); }
      }
      piedras(a, ps, 5, 26, mat);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue2_estalactitas', nombre: ['Cornisa con estalactitas', 'Ledge with stalactites'], tema: 'cueva', variantes: ['cornisa', 'arco', 'cortina'], cuadros: 6, t: 4, huella: [5, 2], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 6), ps: Pieza[] = [], cs: Comp[] = [];
      const mat = fm % 2 ? 'sub_roca' : 'sub_roca_humeda', H = entre(a, 84, 104) + (fm === 4 ? 16 : 0);
      const puntas: V3[] = [];
      if (v === 'arco') {
        // arco natural: dos patas de lajas que se juntan arriba; las estalactitas cuelgan del intradós
        const ab = entre(a, 22, 28), pz = H * 0.72;
        const arcoP = (t: number): V3 => [-Math.cos(t) * (ab + 9), 0, Math.pow(Math.sin(t), 0.7) * pz];
        const nucleo: Comp[] = [];
        for (let i = 0; i < 8; i++) nucleo.push(hM(arcoP((i / 8) * PI), arcoP(((i + 1) / 8) * PI), 9.5 - Math.sin((i / 8) * PI) * 2.5, 9.5 - Math.sin(((i + 1) / 8) * PI) * 2.5, { mat }));
        for (const l of [-1, 1]) nucleo.push(bulto([l * (ab + 10), 0, 4], [14, 12, 8], { mat }));
        ps.push(masa(nucleo, { mat, suave: 3, tono: -0.06 }));
        for (let i = 0; i <= 16; i++) {
          const t = (i / 16) * PI, p = arcoP(t), r = 10 - Math.sin(t) * 2.5;
          ps.push(pena(a, p[0] + (a.r() - 0.5) * 3, (a.r() - 0.5) * 4, p[2] + (a.r() - 0.5) * 3, r + 1, 10.5, r * 0.85, { mat, giro: (a.r() - 0.5) * 40, tono: (a.r() - 0.5) * 0.12, n: 12 }));
        }
        for (let i = 0; i < 3; i++) penasco(a, ps, [-14 + i * 14, 0, pz + 12], [11, 9, 7], { mat, n: 2, tono: 0.04 });
        const n = 4 + (fm % 3);
        for (let i = 0; i < n; i++) { const x = -ab + 8 + (i / (n - 1)) * (ab * 2 - 16) + (a.r() - 0.5) * 4, zt = Math.sqrt(Math.max(0, 1 - (x / (ab + 8)) ** 2)) * pz - 4, h = entre(a, 8, 22) * (1 - Math.abs(x) / (ab * 1.6)); cs.push(...espeleo(a, [x, (a.r() - 0.5) * 6, zt], h, entre(a, 2, 3.5), { mat: 'sub_caliza', dir: -1, curva: 0.1 })); puntas.push([x, 0, zt - h]); }
        piedras(a, ps, 6, 34, mat);
      } else {
        // pared de roca con la cornisa que sobresale hacia la cámara
        paredRoca(a, ps, [[-36, -6], [36, -6]], H, 12, mat, 14);
        const sal = v === 'cortina' ? 12 : entre(a, 13, 20), zc = H * entre(a, 0.66, 0.78);
        for (let i = 0; i < 5; i++) { const x = -30 + i * 15 + (a.r() - 0.5) * 6; ps.push(pena(a, x, sal * 0.55, zc + 2, 11, sal * 0.75 + 4, 5 + a.r() * 2, { mat, giro: (a.r() - 0.5) * 20, tono: 0.02, n: 12 })); }
        if (v === 'cortina') {
          // colada en cortina: láminas onduladas que caen de la cornisa
          for (let i = 0; i < 10; i++) { const x = -28 + i * 6.2 + (a.r() - 0.5) * 2, h = entre(a, 16, zc - 16), y = sal * 0.95 + Math.sin(i * 1.3) * 2; cs.push(hM([x, y, zc - 1], [x + (a.r() - 0.5) * 2, y + 1, zc - h], 2.2, 0.7, { mat: 'sub_caliza' }), bulto([x, y - 0.5, zc - h * 0.45], [2, 1.4, h * 0.45], { mat: 'sub_caliza', k: 1.5 })); puntas.push([x, y, zc - h]); }
        } else {
          const n = 5 + fm;
          for (let i = 0; i < n; i++) { const x = -28 + (i / (n - 1)) * 56 + (a.r() - 0.5) * 5, y = sal * (0.6 + a.r() * 0.6), h = entre(a, 10, 34) * (fm === 3 ? 1.3 : 1), r = entre(a, 2.2, 4.5); cs.push(...espeleo(a, [x, y, zc], h, r, { mat: 'sub_caliza', dir: -1, curva: 0.15 })); puntas.push([x, y, zc - h]); }
        }
        // estalagmitas que crecen debajo, donde gotea
        for (let i = 0; i < 3; i++) { const p = puntas[Math.floor(a.r() * puntas.length)]; cs.push(...espeleo(a, [p[0] + (a.r() - 0.5) * 2, p[1] + 2, 0], entre(a, 5, 16), entre(a, 2.5, 4), { mat: 'sub_caliza', curva: 0.2 })); }
        piedras(a, ps, 5, 30, mat, 0, 16);
      }
      ps.push(masa(cs, { mat: 'sub_caliza', suave: 2.2 }));
      // la gota que cae de una punta y la charquita con su onda
      const p = puntas[Math.floor(a.r() * puntas.length)], u = (f % 6) / 6;
      ps.push(a.elipsoide(p[0], p[1] + 2, 0, 6, 5, 0.6, { mat: 'c2_agua' }));
      if (u < 0.66) ps.push(a.elipsoide(p[0], p[1], p[2] - (p[2] - 1) * Math.pow(u / 0.66, 1.6), 0.8, 0.8, 1.3, { mat: 'c2_agua', tono: 0.35 }));
      else ps.push(a.cilindro(p[0], p[1] + 2, 0.6, 1.5 + (u - 0.66) * 12, 0.3, { mat: 'c2_agua', tono: 0.3 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue2_estalactitas_caidas', nombre: ['Estalactitas caídas', 'Fallen stalactites'], tema: 'cueva', variantes: ['clavada', 'rotas', 'montón'], huella: [3, 2], bloquea: false,
    armar: (v, _f, a) => {
      const fm = forma(a, 5), ps: Pieza[] = [], mat = fm % 2 ? 'sub_caliza' : 'sub_roca_humeda';
      if (v === 'clavada') {
        // la punta se hundió en el piso y lo rajó
        const h = entre(a, 34, 50), r = entre(a, 6, 9), inc = entre(a, 6, 22), g = a.r() * 360;
        ps.push(...mover([masa(espeleo(a, [0, 0, 0], h, r, { mat, curva: 0.1 }).slice(1), { mat, suave: 2 })], [0, 0, h - 8], g, 180 - inc));
        for (let i = 0; i < 7; i++) { const t = (i / 7) * 2 * PI + a.r() * 0.5, d = entre(a, 6, 12); ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, 0.6, entre(a, 2.5, 5), entre(a, 2, 4), entre(a, 1.2, 2.4), { mat: 'sub_roca', giro: (t * 180) / PI })); }
        for (let i = 0; i < 4; i++) { const t = a.r() * 2 * PI; ps.push(a.caja(Math.cos(t) * 8, Math.sin(t) * 8, 0.05, 0.9, entre(a, 8, 14), 0.3, { mat: 'negro', giro: (t * 180) / PI + 90 })); }
      } else {
        const n = v === 'montón' ? 6 + fm : 3 + fm % 3;
        for (let i = 0; i < n; i++) {
          const L = entre(a, 12, 30) * (v === 'montón' ? 0.8 : 1), r = entre(a, 2.5, 5.5), t = a.r() * 2 * PI, d = Math.sqrt(a.r()) * (v === 'montón' ? 12 : 20);
          const c: V3 = [Math.cos(t) * d, Math.sin(t) * d, r * 0.75 + (v === 'montón' ? Math.max(0, 8 - d * 0.6) : 0)], g = a.r() * PI;
          const p0: V3 = [c[0] - Math.cos(g) * L / 2, c[1] - Math.sin(g) * L / 2, c[2]], p1: V3 = [c[0] + Math.cos(g) * L / 2, c[1] + Math.sin(g) * L / 2, Math.max(r * 0.4, c[2] - 1)];
          ps.push(masa([hM(p0, p1, r, 0.5), bulto(p0, [r * 0.6, r, r], { eje: [p1[0] - p0[0], p1[1] - p0[1], 0], tono: 0.12 })], { mat, suave: 1.2, tono: (a.r() - 0.5) * 0.1 }));
        }
        piedras(a, ps, 8, 22, mat, 0, 0, 1.2);
      }
      ps.push(a.elipsoide(0, 0, 0, entre(a, 18, 24), entre(a, 13, 18), 0.8, { mat: 'sub_tierra', giro: a.r() * 180 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue2_columna', nombre: ['Columna de caliza', 'Limestone column'], tema: 'cueva', variantes: ['gruesa', 'fina', 'doble', 'quebrada'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const fm = forma(a, 5), ps: Pieza[] = [], cs: Comp[] = [], mat = fm === 2 ? 'sub_roca_humeda' : 'sub_caliza';
      const H = entre(a, 104, 124), k = v === 'fina' ? 0.6 : v === 'gruesa' ? 1.25 : 1;
      const cintura = H * entre(a, 0.45, 0.62), rc = (fm === 4 ? 3 : entre(a, 4, 6.5)) * k, lean = (a.r() - 0.5) * 8;
      const tallo = (x: number, y: number, s: number, rota: boolean) => {
        // hebras de colada que se funden: anchas al pie y arriba, finas en la cintura
        const n = 5;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * 2 * PI + a.r(), d0 = 9 * k * s, dw = rc * s * 0.5;
          const pie: V3 = [x + Math.cos(t) * d0, y + Math.sin(t) * d0, 0], w: V3 = [x + lean + Math.cos(t) * dw, y - lean * 0.5 + Math.sin(t) * dw, cintura + entre(a, -8, 8)];
          const top: V3 = [x + Math.cos(t + 0.5) * d0 * 1.1, y + Math.sin(t + 0.5) * d0 * 1.1, H];
          cs.push(hM(pie, w, entre(a, 7, 10) * k * s, rc * s * 0.7, { mat }));
          if (!rota) cs.push(hM(w, top, rc * s * 0.7, entre(a, 7, 11) * k * s, { mat }));
        }
        if (rota) cs.push(bulto([x + lean, y - lean * 0.5, cintura + 2], [rc * s * 1.5, rc * s * 1.4, 4], { mat, tono: 0.12 }));
        for (let i = 0; i < 3; i++) cs.push(bulto([x + lean * 0.8 + (a.r() - 0.5) * 4, y + (a.r() - 0.5) * 4, cintura + entre(a, -14, 14)], [rc * s * 1.4, rc * s * 1.2, entre(a, 3, 7)], { mat, k: 2.5, giro: a.r() * 180 }));
      };
      if (v === 'doble') { tallo(-9, -5, 0.8, false); tallo(10, 7, 0.65, a.r() < 0.4); }
      else tallo(0, 0, 1, v === 'quebrada');
      cs.push(bulto([0, 0, 0], [24 * k, 21 * k, 4], { mat, giro: a.r() * 180 }));
      ps.push(masa(cs, { mat, suave: 4 }));
      if (v !== 'quebrada') for (let i = 0; i < 6; i++) { const t = (i / 6) * 2 * PI + a.r(); penasco(a, ps, [Math.cos(t) * 13 * k, Math.sin(t) * 13 * k, H + 2 + a.r() * 5], [entre(a, 11, 16) * k, entre(a, 9, 13) * k, entre(a, 4, 7)], { mat: 'sub_roca', n: 1, tono: -0.06 }); }
      if (v === 'quebrada') {
        // el tramo de abajo partido y el pedazo tumbado
        const t = a.r() * PI * 0.5 + PI * 0.25;
        ps.push(masa([hM([Math.cos(t) * 14, Math.sin(t) * 14, 7], [Math.cos(t) * 44, Math.sin(t) * 44 - 6, 5], 8 * k, 5 * k), bulto([Math.cos(t) * 14, Math.sin(t) * 14, 7], [7, 8, 8], { tono: 0.1 })], { mat, suave: 2 }));
        piedras(a, ps, 10, 30, mat, Math.cos(t) * 20, Math.sin(t) * 20, 1.4);
      } else piedras(a, ps, 4, 26, mat);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue2_pilar_roca', nombre: ['Pilar de roca', 'Rock pillar'], tema: 'cueva', variantes: ['bajo', 'alto', 'musgo', 'cristales'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const fm = forma(a, 6), ps: Pieza[] = [];
      const mat = fm % 3 === 0 ? 'sub_roca' : fm % 3 === 1 ? 'sub_roca_humeda' : 'sub_caliza';
      const H = v === 'bajo' ? entre(a, 40, 56) : entre(a, 90, 130), capas = Math.round(H / 11);
      let x = 0, y = 0, z = 0;
      for (let i = 0; i < capas; i++) {
        const u = i / capas, r = (22 - u * 8 + (fm === 5 ? Math.sin(u * PI) * 7 : 0)) * entre(a, 0.9, 1.1), hz = entre(a, 8, 12);
        x += (a.r() - 0.5) * 5; y += (a.r() - 0.5) * 5;
        // cada estrato: una laja ancha y chata con otra corrida, aristas vivas
        ps.push(pena(a, x, y, z + hz * 0.85, r, r * entre(a, 0.75, 0.95), hz, { mat, tono: (a.r() - 0.5) * 0.12 - u * 0.04, n: 14 }));
        if (a.r() < 0.7) ps.push(pena(a, x + (a.r() - 0.5) * r, y + (a.r() - 0.5) * r, z + hz * 0.9, r * 0.65, r * 0.55, hz * 0.8, { mat, tono: (a.r() - 0.5) * 0.15, n: 10 }));
        z += hz * entre(a, 1.05, 1.25);
      }
      // el núcleo que une los estratos
      ps.push(masa([hM([0, 0, 0], [x * 0.8, y * 0.8, z * 0.9], 16, 9), bulto([0, 0, 4], [24, 22, 7], { giro: a.r() * 180 })], { mat, suave: 4, tono: -0.1 }));
      piedras(a, ps, 8, 30, mat, 0, 0, 1.3);
      let luz: { c: V3; r: number; color: string } | undefined;
      if (v === 'musgo') for (let i = 0; i < 16; i++) { const t = entre(a, -0.6, 2.2), zz = a.r() * z * 0.9, rr = 20 - (zz / z) * 8; ps.push(a.elipsoide(Math.cos(t) * rr, Math.sin(t) * rr, zz, entre(a, 3, 6), entre(a, 2, 3), entre(a, 2, 5), { mat: 'musgo', giro: (t * 180) / PI + 90, tono: -0.1 })); }
      if (v === 'cristales') {
        const ti = TINTE[['azul', 'verde', 'rojo'][fm % 3]], pulso = 0.05;
        for (let i = 0; i < 8; i++) { const t = entre(a, -0.6, 2.2), z = entre(a, 6, H * 0.8), dir: V3 = [Math.cos(t), Math.sin(t), entre(a, 0.2, 1.2)]; ps.push(prisma(a, [Math.cos(t) * 15, Math.sin(t) * 15, z], dir, entre(a, 8, 18), entre(a, 1.8, 3.2), i % 3 ? ti.cr : ti.luz, i % 3 ? 0 : pulso)); }
        luz = { c: [16, 10, H * 0.35], r: 32, color: ti.col };
      }
      ps.push(suelo(a));
      return luz ? { piezas: ps, resplandor: luz } : ps;
    },
  },
);

/** Charco hecho de varios óvalos de agua que se funden (orilla orgánica, no un óvalo solo). */
type Ovalo = [number, number, number, number, number];
const dentro = (os: Ovalo[], x: number, y: number, m = 0.9) => os.some(([cx, cy, rx, ry, g]) => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)), dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / rx, w = (-dx * s + dy * c) / ry; return u * u + w * w < m * m; });
function charco(a: Arma, ps: Pieza[], os: Ovalo[], mat: string, borde = 'c2_gour', z = 1) {
  for (const [cx, cy, rx, ry, g] of os) ps.push(a.elipsoide(cx, cy, z - 1.6, rx + 2.2, ry + 2.2, 1.6, { mat: 'sub_tierra', giro: g, tono: -0.05 }));
  // labio de colada (gour) alrededor: bultos chatos fundidos que siguen la orilla
  const cs: Comp[] = [];
  for (const [cx, cy, rx, ry, g] of os) {
    const n = Math.round((rx + ry) / 3.5), c = Math.cos(rad(g)), s = Math.sin(rad(g));
    for (let i = 0; i < n; i++) { const t = (i / n) * 2 * PI, lx = Math.cos(t) * (rx + 0.8), ly = Math.sin(t) * (ry + 0.8), x = cx + lx * c - ly * s, y = cy + lx * s + ly * c; if (dentro(os, x, y, 0.97)) continue; cs.push(bulto([x, y, z - 0.2], [entre(a, 2.2, 3.6), entre(a, 1.6, 2.4), entre(a, 0.9, 1.6)], { giro: (t * 180) / PI + g + 90 })); }
  }
  if (cs.length) ps.push(masa(cs, { mat: borde, suave: 1.4 }));
  for (const [cx, cy, rx, ry, g] of os) ps.push(a.elipsoide(cx, cy, z - 0.8, rx, ry, 0.8, { mat, giro: g }));
}
/** El reflejo de un espeleotema en el agua: en pantalla queda espejado hacia abajo, en el piso corre hacia +x+y. */
function reflejo(a: Arma, ps: Pieza[], os: Ovalo[], bx: number, by: number, h: number, r: number, f: number, mat = 'c2_reflejo', z = 1.02) {
  const K = Math.sqrt(1.5), n = Math.max(3, Math.round(h / 4));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, d = u * h * K, rr = Math.max(0.5, r * Math.pow(1 - u, 0.85)), w = Math.sin(f * 1.3 + i * 0.9) * 0.6 * u;
    const x = bx + d + w, y = by + d - w;
    if (!dentro(os, x, y, 0.92)) continue;
    ps.push(a.elipsoide(x, y, z, (h * K) / n * 0.75, rr, 0.08, { mat, giro: 45, tono: -u * 0.1 }));
  }
}

registrar(
  {
    id: 'cue2_drusa', nombre: ['Geoda de cristales', 'Crystal geode'], tema: 'cueva', variantes: ['azul', 'verde', 'rojo'], cuadros: 4, t: 5, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 4), ti = TINTE[v], ps: Pieza[] = [], pulso = onda(f, 4) * 0.1;
      const R = entre(a, 14, 19), mat = fm % 2 ? 'sub_roca' : 'sub_roca_humeda';
      const boca: V3 = fm === 2 ? [0.25, 0.25, 1] : fm === 1 ? [0.2, 1, 0.45] : [1, 0.3, 0.45];
      const bl = Math.hypot(...boca), bn: V3 = [boca[0] / bl, boca[1] / bl, boca[2] / bl];
      const c: V3 = [0, 0, R * 0.7];
      if (fm === 3) {
        // partida en dos mitades que se abrieron
        for (const l of [-1, 1]) {
          const o: V3 = [l * 9, -l * 4, R * 0.6];
          ps.push(roca(a, o, [R * 0.7, R * 0.8, R * 0.7], { mat, n: 4 }));
          ps.push(a.elipsoide(o[0] + l * 3, o[1] - l * 1, o[2] + 1, R * 0.62, R * 0.62, R * 0.6, { mat, resta: true }));
          ps.push(a.elipsoide(o[0] + l * 4, o[1] - l * 1, o[2] + 1, R * 0.55, R * 0.55, R * 0.52, { mat: ti.luz, tono: -0.25 + pulso }));
          for (let i = 0; i < 9; i++) { const t = a.r() * 2 * PI, w = a.r() * 2 - 1, q = Math.sqrt(1 - w * w), d: V3 = [Math.cos(t) * q, Math.sin(t) * q, w]; ps.push(prisma(a, [o[0] + l * 4 + d[0] * R * 0.5, o[1] - l + d[1] * R * 0.5, o[2] + 1 + d[2] * R * 0.5], [-d[0], -d[1], -d[2] + 0.3], entre(a, 4, 8), entre(a, 1.2, 2.2), i % 3 ? ti.cr : ti.luz, i % 3 ? 0 : pulso)); }
        }
      } else {
        ps.push(roca(a, c, [R, R * 0.9, R * 0.8], { mat, n: 5 }));
        // la boca: un hueco que se abre hacia la cámara, tapizado de cristales que miran hacia afuera
        const hc = add(c, bn, R * 0.75);
        ps.push(a.elipsoide(hc[0], hc[1], hc[2], R * 0.72, R * 0.72, R * 0.62, { mat, resta: true }));
        ps.push(a.elipsoide(...add(c, bn, R * 0.45), R * 0.42, R * 0.42, R * 0.38, { mat: ti.luz, tono: -0.2 + pulso }));
        for (let i = 0; i < 16; i++) {
          const t = a.r() * 2 * PI, w = a.r() * 2 - 1, q = Math.sqrt(1 - w * w), d: V3 = [Math.cos(t) * q, Math.sin(t) * q, w];
          if (d[0] * bn[0] + d[1] * bn[1] + d[2] * bn[2] > 0.55) continue;
          const b = add(hc, d, R * 0.66);
          ps.push(prisma(a, b, [bn[0] - d[0] * 0.8, bn[1] - d[1] * 0.8, bn[2] - d[2] * 0.8 + 0.2], entre(a, 5, 11), entre(a, 1.4, 2.6), i % 4 === 0 ? ti.luz : ti.cr, i % 4 === 0 ? pulso : (a.r() - 0.5) * 0.15));
        }
      }
      piedras(a, ps, 6, 24, mat);
      for (let i = 0; i < 3; i++) { const t = a.r() * 2 * PI; ps.push(prisma(a, [Math.cos(t) * 20, Math.sin(t) * 20, 0], [Math.cos(t) * 0.5, Math.sin(t) * 0.5, 1], entre(a, 3, 6), 1.2, ti.cr)); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: add(c, bn, R * 1.1), r: 32, color: ti.col } };
    },
  },
  {
    id: 'cue2_cristal_gigante', nombre: ['Cristal gigante', 'Giant crystal'], tema: 'cueva', variantes: ['azul', 'verde', 'rojo'], cuadros: 4, t: 5, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 5), ti = TINTE[v], ps: Pieza[] = [], pulso = onda(f, 4) * 0.1;
      const L = entre(a, 58, 88) * (fm === 4 ? 0.7 : 1), r = entre(a, 7, 10), inc = fm === 1 ? 26 : entre(a, 3, 14), g = a.r() * 360;
      const dir: V3 = [Math.cos(rad(g)) * Math.sin(rad(inc)), Math.sin(rad(g)) * Math.sin(rad(inc)), Math.cos(rad(inc))];
      // la roca madre de donde brota
      for (let i = 0; i < 5; i++) { const t = (i / 5) * 2 * PI + a.r(); penasco(a, ps, [Math.cos(t) * 12, Math.sin(t) * 11, 3], [entre(a, 8, 12), entre(a, 7, 10), entre(a, 5, 8)], { mat: 'sub_roca', n: 1 }); }
      ps.push(prisma(a, [0, 0, -2], dir, L, r, ti.cr));
      if (fm === 4) ps.push(prisma(a, [3, -2, -2], [dir[0] + 0.4, dir[1] - 0.3, 1], L * 0.8, r * 0.8, ti.cr, 0.05));
      // vetas de luz adentro: prismas finos emisivos que asoman por las caras
      ps.push(prisma(a, add([0, 0, 4], dir, 2), dir, L * 0.82, r * 0.38, ti.luz, pulso - 0.15));
      const n = 6 + fm;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 2 * PI + a.r() * 0.7, d = entre(a, 6, 15), s = entre(a, 0.3, 0.9);
        ps.push(prisma(a, [Math.cos(t) * d, Math.sin(t) * d, 1], [Math.cos(t) * s + dir[0], Math.sin(t) * s + dir[1], 1], entre(a, 10, 30), entre(a, 2, 4.5), i % 3 === 1 ? ti.luz : ti.cr, i % 3 === 1 ? pulso : (a.r() - 0.5) * 0.1));
      }
      for (let i = 0; i < 6; i++) { const t = a.r() * 2 * PI, d = entre(a, 18, 26); ps.push(a.caja(Math.cos(t) * d * 0.5, Math.sin(t) * d * 0.5, 0.05, 0.8, d * 0.6, 0.25, { mat: 'negro', giro: (t * 180) / PI + 90 })); }
      piedras(a, ps, 6, 28);
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: add([0, 0, 10], dir, L * 0.35), r: 48, color: ti.col } };
    },
  },
  {
    id: 'cue2_cristales_suelo', nombre: ['Cristales entre las grietas', 'Crystals in floor cracks'], tema: 'cueva', variantes: ['azul', 'verde', 'rojo'], cuadros: 4, t: 5, huella: [3, 3], bloquea: false,
    armar: (v, f, a) => {
      const fm = forma(a, 4), ti = TINTE[v], ps: Pieza[] = [], pulso = onda(f, 4) * 0.12;
      // grietas que se ramifican y en ellas brotan los cristales bajos
      const ramas = 3 + fm;
      for (let i = 0; i < ramas; i++) {
        let p: [number, number] = [(a.r() - 0.5) * 10, (a.r() - 0.5) * 10], t = a.r() * 2 * PI;
        for (let k = 0; k < 4; k++) {
          const L = entre(a, 6, 10), q: [number, number] = [p[0] + Math.cos(t) * L, p[1] + Math.sin(t) * L];
          ps.push(a.caja((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 0.02, L + 1, 1.6 - k * 0.25, 0.35, { mat: ti.luz, giro: (t * 180) / PI, tono: -0.3 + pulso }));
          for (const l of [-1, 1]) ps.push(pena(a, (p[0] + q[0]) / 2 - Math.sin(t) * l * 2, (p[1] + q[1]) / 2 + Math.cos(t) * l * 2, 0.2, L * 0.5, 1.8, 0.8, { mat: 'sub_roca', giro: (t * 180) / PI, n: 6 }));
          if (a.r() < 0.7) for (let j = 0; j < 2; j++) { const u = a.r(), b: V3 = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, -1]; ps.push(prisma(a, b, [(a.r() - 0.5) * 1.2, (a.r() - 0.5) * 1.2, 1], entre(a, 4, 11), entre(a, 1, 2.2), a.r() < 0.3 ? ti.luz : ti.cr, pulso * 0.5)); }
          p = q; t += (a.r() - 0.5) * 1.2;
        }
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 4], r: 34, color: ti.col } };
    },
  },
  {
    id: 'cue2_charca', nombre: ['Charca subterránea', 'Underground pool'], tema: 'cueva', variantes: ['clara', 'turquesa', 'cristal'], cuadros: 6, t: 4, huella: [4, 4], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 5), ps: Pieza[] = [];
      const mat = v === 'turquesa' ? 'c2_agua_turquesa' : 'c2_agua';
      const os: Ovalo[] = [[0, 0, entre(a, 20, 26), entre(a, 14, 18), a.r() * 180]];
      for (let i = 0; i < 2 + (fm % 3); i++) { const t = a.r() * 2 * PI; os.push([Math.cos(t) * 14, Math.sin(t) * 11, entre(a, 8, 14), entre(a, 6, 10), a.r() * 180]); }
      charco(a, ps, os, mat);
      // espeleotemas en la orilla del fondo: se reflejan en el agua
      const cs: Comp[] = [];
      const ref: [number, number, number, number][] = [];
      for (let i = 0; i < 2 + (fm % 3); i++) {
        const t = entre(a, PI * 1.05, PI * 1.55), [cx, cy, rx, ry] = os[0], bx = cx + Math.cos(t) * (rx + 3), by = cy + Math.sin(t) * (ry + 3);
        const h = entre(a, 14, 44), r = entre(a, 3, 6);
        cs.push(...espeleo(a, [bx, by, 0], h, r, { mat: 'sub_caliza', curva: 0.2 }));
        ref.push([bx, by, h, r]);
      }
      ps.push(masa(cs, { mat: 'sub_caliza', suave: 2 }));
      for (const [bx, by, h, r] of ref) reflejo(a, ps, os, bx, by, h, r, f);
      let luz: { c: V3; r: number; color: string } | undefined;
      if (v === 'cristal') {
        const [cx, cy, rx, ry] = os[0], bx = cx - rx * 0.5, by = cy + ry + 2;
        for (let i = 0; i < 4; i++) ps.push(prisma(a, [bx + (a.r() - 0.5) * 6, by + (a.r() - 0.5) * 4, 0], [(a.r() - 0.5) * 0.8, (a.r() - 0.2) * 0.6, 1], entre(a, 8, 20), entre(a, 1.6, 3), i % 2 ? 'sub_luz_azul' : 'sub_cristal_azul'));
        reflejo(a, ps, os, bx, by, 16, 2.4, f, 'sub_luz_azul', 1.03);
        luz = { c: [bx, by, 8], r: 40, color: '#5aaef0' };
      }
      // ondas de una gota y destellos que se corren
      const [cx, cy] = os[1] ?? os[0], R = 1 + (f % 6) * 2.4;
      ps.push(a.cilindro(cx, cy, 0.9, R, 0.2, { mat, tono: 0.3 - (f % 6) * 0.05 }), a.cilindro(cx, cy, 0.9, Math.max(0.3, R - 1), 0.25, { mat }));
      for (let i = 0; i < 3; i++) { const x = (a.r() - 0.5) * 20 + Math.sin(f * 1.05 + i) * 2, y = (a.r() - 0.5) * 14; if (dentro(os, x, y, 0.8)) ps.push(a.elipsoide(x, y, 1, 3.5, 0.7, 0.06, { mat, tono: 0.35, giro: -45 })); }
      piedras(a, ps, 7, 34, 'sub_roca');
      ps.push(suelo(a));
      return luz ? { piezas: ps, resplandor: luz } : ps;
    },
  },
  {
    id: 'cue2_lago_negro', nombre: ['Lago de agua negra', 'Black water lake'], tema: 'cueva', variantes: ['orilla', 'isla', 'ojos', 'barca'], cuadros: 8, t: 4, huella: [9, 7], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [], mat = 'c2_agua_negra';
      const os: Ovalo[] = [[0, 0, entre(a, 48, 58), entre(a, 34, 42), entre(a, -15, 15)]];
      for (let i = 0; i < 3 + fm; i++) { const t = (i / (3 + fm)) * 2 * PI + a.r(); os.push([Math.cos(t) * 34, Math.sin(t) * 24, entre(a, 16, 26), entre(a, 12, 18), a.r() * 180]); }
      charco(a, ps, os, mat, 'sub_roca_humeda', 0.6);
      // la orilla: peñascos, estalagmitas que se reflejan y lajas que entran al agua
      const cs: Comp[] = [];
      for (let i = 0; i < 14; i++) {
        const t = (i / 14) * 2 * PI + a.r() * 0.3, [, , rx, ry] = os[0], R = 1.18 + a.r() * 0.15, x = Math.cos(t) * rx * R, y = Math.sin(t) * ry * R;
        if (dentro(os, x, y, 1.02)) continue;
        if (t > PI * 0.9 && t < PI * 1.7 && a.r() < 0.6) { const h = entre(a, 14, 46), r = entre(a, 3, 6); cs.push(...espeleo(a, [x, y, 0], h, r, { mat: 'sub_caliza' })); reflejo(a, ps, os, x, y, h, r, f, 'c2_reflejo', 0.62); }
        else penasco(a, ps, [x, y, 2], [entre(a, 5, 10), entre(a, 4, 8), entre(a, 3, 7)], { mat: a.r() < 0.5 ? 'sub_roca_humeda' : 'sub_roca', n: 1 });
      }
      if (cs.length) ps.push(masa(cs, { mat: 'sub_caliza', suave: 2 }));
      // brillos lentos sobre el agua quieta
      for (let i = 0; i < 6; i++) { const x = (a.r() - 0.5) * 70 + Math.sin(f * 0.8 + i) * 3, y = (a.r() - 0.5) * 50; if (dentro(os, x, y, 0.85)) ps.push(a.elipsoide(x, y, 0.62, entre(a, 3, 7), 0.5, 0.05, { mat: 'c2_reflejo', giro: -45, tono: -0.1 })); }
      let luz: { c: V3; r: number; color: string } | undefined;
      if (v === 'isla') {
        penasco(a, ps, [6, -4, 3], [16, 13, 6], { mat: 'sub_roca_humeda', n: 3 });
        ps.push(...cadaver({ piel: 'cu_hueso', oseo: true }, { torso: { tipo: 'harapos', mat: 'cu_tela_parda' } }, 'e', [4, -6, 7], a.r() * 40));
        ps.push(a.cilindro(-4, -10, 6, 1, 14, { mat: 'madera_vieja' }), a.cilindro(-4, -10, 18, 1.6, 2, { mat: 'hierro' }));
        luz = { c: [-4, -10, 22], r: 30, color: '#ffa040' };
        llama(a, ps, -4, -10, 19.5, f, 8, 0.8);
      } else if (v === 'ojos') {
        // algo grande y quieto bajo el agua: un lomo, dos ojos que parpadean y la onda que deja
        const x = entre(a, -10, 10), y = entre(a, -6, 6), ab = (f % 8) === 5 ? 0.15 : 1;
        ps.push(masa([bulto([x - 10, y - 4, -2], [16, 9, 4.5], { giro: 30 }), bulto([x + 2, y + 2, -1.5], [7, 6, 3.2])], { mat: 'cu_quitina', suave: 3 }));
        for (const l of [-1, 1]) ps.push(a.elipsoide(x + 5 + l * 2.2, y + 4 - l * 2.2, 1.4, 1.3, 1.3, 0.9 * ab, { mat: 'cu_ojo_verde' }));
        const R = 6 + (f % 8) * 3;
        ps.push(a.cilindro(x, y, 0.55, R, 0.15, { mat: 'c2_reflejo', tono: 0.1 - (f % 8) * 0.03 }), a.cilindro(x, y, 0.55, R - 1, 0.2, { mat }));
        luz = { c: [x + 5, y + 4, 4], r: 18, color: '#60e070' };
      } else if (v === 'barca') {
        // un bote podrido medio hundido, con el remo flotando
        const g = entre(a, -30, 30), b: Pieza[] = [];
        b.push(masa([bulto([0, 0, 2], [16, 6, 4]), bulto([12, 0, 3], [6, 4, 4])], { mat: 'madera_vieja', suave: 2 }));
        b.push(a.elipsoide(0, 0, 4.5, 14, 4.8, 3, { mat: 'madera_vieja', resta: true }), a.elipsoide(0, 0, 1.5, 13, 4.2, 1, { mat: 'c2_agua_negra' }));
        for (let i = 0; i < 3; i++) b.push(viga(a, [-8 + i * 7, -5, 4], [-8 + i * 7, 5, 4], 2.4, 1.2, 'madera_vieja'));
        ps.push(...mover(b, [-6, 6, -1.2], g, 12));
        ps.push(viga(a, [10, 18, 0.7], [26, 10, 0.7], 1.6, 0.8, 'madera_vieja'), a.elipsoide(25, 10, 0.8, 3, 1.6, 0.5, { mat: 'madera_vieja', giro: -27 }));
      }
      ps.push(suelo(a));
      return luz ? { piezas: ps, resplandor: luz } : ps;
    },
  },
);

/** Hongo gigante: tallo curvo de masa, sombrero con láminas que brillan debajo y manchas. */
function hongo(a: Arma, ps: Pieza[], x: number, y: number, h: number, R: number, ti: { lam: string; luz: string }, tipo: number) {
  const cs: Comp[] = [], dx = (a.r() - 0.5) * h * 0.35, dy = (a.r() - 0.5) * h * 0.35, top: V3 = [x + dx, y + dy, h];
  const mid: V3 = [x + dx * 0.3 + (a.r() - 0.5) * 4, y + dy * 0.3 + (a.r() - 0.5) * 4, h * 0.5];
  const rt = Math.max(2, R * 0.17);
  cs.push(bulto([x, y, 1.5], [rt * 2.2, rt * 2, rt * 1.4]), hM([x, y, 1], mid, rt * 1.5, rt * 1.05), hM(mid, top, rt * 1.05, rt * 0.9));
  for (let i = 0; i < 4; i++) { const t = a.r() * 2 * PI; cs.push(hM([x, y, 1.5], [x + Math.cos(t) * rt * 3.4, y + Math.sin(t) * rt * 3.4, 0], rt * 0.8, rt * 0.3)); }
  ps.push(masa(cs, { mat: 'c2_tallo', suave: rt * 0.9 }));
  // anillo del tallo
  ps.push(a.elipsoide(...mez(mid, top, 0.7), rt * 2, rt * 2, rt * 0.4, { mat: 'c2_tallo', tono: -0.08 }));
  const capH = tipo === 1 ? R * 0.75 : tipo === 2 ? R * 0.35 : R * 0.5;
  const cap = masa([bulto([top[0], top[1], top[2] + capH * 0.25], [R, R * 0.94, capH], { giro: a.r() * 180 }), bulto([top[0] + (a.r() - 0.5) * R * 0.4, top[1] + (a.r() - 0.5) * R * 0.4, top[2] + capH * 0.6], [R * 0.6, R * 0.55, capH * 0.6])], { mat: tipo === 2 ? 'c2_sombrero_rojo' : 'c2_sombrero', suave: R * 0.25 });
  ps.push(cap);
  // las láminas: un disco que brilla bajo el ala (se ve porque el ala es más angosta abajo)
  ps.push(a.elipsoide(top[0], top[1], top[2] + capH * 0.12, R * 0.94, R * 0.88, capH * 0.22, { mat: ti.lam }));
  for (let i = 0; i < 6 + Math.round(R / 3); i++) { const t = a.r() * 2 * PI, d = Math.sqrt(a.r()) * R * 0.75; ps.push(a.esfera(top[0] + Math.cos(t) * d, top[1] + Math.sin(t) * d, top[2] + capH * 0.25 + capH * Math.sqrt(Math.max(0, 1 - (d / R) ** 2)) * 0.95, entre(a, 0.6, 1.3) * (R / 14 + 0.5), { mat: ti.luz, tono: -0.1 })); }
  return top;
}

registrar(
  {
    id: 'cue2_hongo_gigante', nombre: ['Hongos gigantes luminosos', 'Giant glowing mushrooms'], tema: 'cueva', variantes: ['azul', 'verde', 'ambar'], cuadros: 6, t: 4, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 5), ti = TINTE[v], ps: Pieza[] = [];
      const lista: [number, number, number, number][] = fm === 0 ? [[0, 0, entre(a, 62, 78), entre(a, 18, 24)]]
        : fm === 1 ? [[-6, -4, entre(a, 54, 66), 17], [12, 8, entre(a, 30, 40), 11]]
          : fm === 2 ? [[-8, 2, entre(a, 46, 58), 14], [9, -9, entre(a, 36, 46), 12], [8, 13, 18, 7]]
            : fm === 3 ? [[0, 0, entre(a, 40, 48), 22]] : [[-10, -6, 70, 15], [6, 4, 44, 12], [14, -10, 24, 8], [-4, 14, 14, 6]];
      let alto: V3 = [0, 0, 0];
      for (const [x, y, h, R] of lista) { const t = hongo(a, ps, x, y, h, R, ti, fm === 3 ? 2 : a.r() < 0.4 ? 1 : 0); if (t[2] > alto[2]) alto = t; }
      // esporas que suben despacio
      for (let i = 0; i < 9; i++) { const ox = (a.r() - 0.5) * 40, oy = (a.r() - 0.5) * 40, ph = a.r(), u = (ph + f / 6) % 1; ps.push(a.esfera(ox + Math.sin(u * 6 + i) * 2, oy, 6 + u * alto[2] * 1.1, 0.6 + (1 - u) * 0.4, { mat: ti.luz, tono: -u * 0.3 })); }
      piedras(a, ps, 5, 26);
      ps.push(a.elipsoide(0, 0, 0, 22, 19, 0.8, { mat: 'sub_tierra' }));
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [alto[0], alto[1], alto[2] * 0.75], r: 52, color: ti.col } };
    },
  },
  {
    id: 'cue2_hongos_luz', nombre: ['Alfombra de hongos luminosos', 'Glowing mushroom patch'], tema: 'cueva', variantes: ['azul', 'verde', 'ambar'], huella: [3, 3], bloquea: false,
    armar: (v, _f, a) => {
      const fm = forma(a, 4), ti = TINTE[v], ps: Pieza[] = [];
      ps.push(a.elipsoide(0, 0, 0, 24, 20, 1, { mat: 'sub_tierra', giro: a.r() * 180 }));
      if (fm % 2 === 0) {
        // un tronco podrido o una raíz caída con hongos de repisa
        const g = a.r() * 180, L = entre(a, 28, 40);
        const p: V3 = [-Math.cos(rad(g)) * L / 2, -Math.sin(rad(g)) * L / 2, 3.5], q: V3 = [Math.cos(rad(g)) * L / 2, Math.sin(rad(g)) * L / 2, 3];
        ps.push(masa([hM(p, q, 4.5, 3.8), bulto(p, [3, 6, 6], { eje: [q[0] - p[0], q[1] - p[1], 0] })], { mat: 'c2_raiz', suave: 2 }));
        for (let i = 0; i < 7; i++) { const u = a.r(), c = mez(p, q, u), t = rad(g) + (a.r() < 0.5 ? PI / 2 : -PI / 2) + (a.r() - 0.5); ps.push(a.elipsoide(c[0] + Math.cos(t) * 4.2, c[1] + Math.sin(t) * 4.2, c[2] + entre(a, -1, 2.5), entre(a, 2, 3.5), entre(a, 2, 3.5), 0.8, { mat: i % 2 ? ti.lam : 'c2_sombrero', giro: (t * 180) / PI })); }
      } else penasco(a, ps, [(a.r() - 0.5) * 8, (a.r() - 0.5) * 8, 4], [10, 8, 7], { mat: 'sub_roca_humeda', n: 2 });
      const n = 16 + fm * 3;
      for (let i = 0; i < n; i++) {
        const t = a.r() * 2 * PI, d = 4 + Math.sqrt(a.r()) * 18, x = Math.cos(t) * d, y = Math.sin(t) * d, h = entre(a, 2.5, 8), R = entre(a, 1.2, 3.2);
        const dx = (a.r() - 0.5) * 2, dy = (a.r() - 0.5) * 2;
        ps.push(a.palo([x, y, 0], [x + dx, y + dy, h], R * 0.28, { mat: 'c2_tallo', r1: R * 0.22 }));
        ps.push(a.elipsoide(x + dx, y + dy, h, R, R, R * (a.r() < 0.5 ? 0.45 : 0.8), { mat: a.r() < 0.55 ? ti.luz : 'c2_sombrero', tono: -0.15 }));
        ps.push(a.elipsoide(x + dx, y + dy, h - R * 0.15, R * 0.9, R * 0.9, R * 0.2, { mat: ti.lam, tono: -0.1 }));
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 5], r: 34, color: ti.col } };
    },
  },
);
