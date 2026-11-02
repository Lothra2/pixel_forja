import { registrar, type Arma, type ObjetoDef, type Tema } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso, bulto, ruido, type Comp, type Pieza, type V3, type Escena } from '../render';
import { TAU, PI, rad, add, sub, esc, len, nor, cruz, mez, ciclo, onda, jit, elegir, polar, rotM, transformar, roca, pena, craneo, tela, catenaria, cadena, fuego } from '../actos45';

/**
 * Acto 7, La Corona del Dios Sediento: un cielo roto. Islas de ruinas de mármol blanco y oro que flotan sobre el
 * vacío (con sus bordes en todas las orientaciones), escaleras de oro que suben al cielo, columnas partidas con
 * pedazos que giran en el aire, arcos triunfales rotos y templos caídos. Lo sagrado: los que intentaron antes,
 * hechos piedra en poses de súplica; el jardín de estatuas; fuentes de oro secas llenas de cráneos (la sed);
 * braseros de luz blanca; cadenas doradas que atan las islas; halos rotos; alas de piedra; ojos de oro en el cielo;
 * el trono sediento por partes (escalones, respaldo y la copa colosal vacía) y nubes de ceniza dorada.
 *
 * Escala: una persona mide 61 (75 px). Cada objeto tiene de 3 a 6 variantes y cambia con la semilla. Lo que flota
 * sobre el vacío no echa sombra al piso (no hay piso).
 */

const TEMA = 'celestial' as string as Tema;

// ------------------------------------------------------------------ materiales
const M = MATERIALES;
const junta = (v: number, paso: number, grosor = 1) => { const m = ((v % paso) + paso) % paso; return m < grosor ? 1 : 0; };
/** Vetas del mármol: hilos finos que serpentean (más oscuros) y alguna veta de oro que no cambia el color sino la luz. */
const veta = (p: V3) => { const v = ruido(p[0] * 0.06 + p[2] * 0.09, p[1] * 0.06, p[2] * 0.04); return Math.abs(v - 0.5) < 0.02 ? -0.16 : (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) - 0.5) * 0.06; };
function losas(largo: number, alto: number) {
  return (p: V3, n: V3) => {
    if (Math.abs(n[2]) > 0.7) return (junta(p[0], largo, 0.8) || junta(p[1], largo, 0.8) ? -0.22 : 0) + veta(p);
    const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0], fila = Math.floor(p[2] / alto), corre = (fila % 2) * largo * 0.5;
    if (junta(p[2], alto, 0.8)) return -0.24;
    if (junta(u + corre, largo, 0.8)) return -0.2;
    return veta(p);
  };
}
M.cel_marmol = { rampa: ['#262524', '#3f3d3b', '#5c5955', '#7b7771', '#9b968e', '#b9b3a9', '#d2cbc0', '#e6e0d4'], ruido: 0.12, escala: 0.1, brillo: 0.35, patron: veta };
M.cel_marmol_losas = { rampa: ['#262524', '#3f3d3b', '#5c5955', '#7b7771', '#9b968e', '#b9b3a9', '#d2cbc0', '#e6e0d4'], ruido: 0.12, escala: 0.1, brillo: 0.3, patron: losas(16, 8) };
M.cel_oro = { rampa: ['#24170a', '#3d290f', '#5a3f15', '#7a571d', '#9a7128', '#b98c36', '#d4a94a', '#ead070', '#f8eab0'], ruido: 0.12, escala: 0.25, brillo: 1.0 };
M.cel_oro_viejo = { rampa: ['#191109', '#2c1f0f', '#433016', '#5c431e', '#765727', '#906c32', '#a9823f'], ruido: 0.25, escala: 0.3, brillo: 0.7, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.65 ? -0.12 : 0) };
M.cel_piedra = { rampa: ['#1a1918', '#2d2b29', '#433f3b', '#5a5550', '#726c65', '#8b847b', '#a29a8f'], ruido: 0.35, escala: 0.35, patron: (p) => (Math.abs(ruido(p[0] * 0.2, p[1] * 0.2, p[2] * 0.2) - 0.5) < 0.025 ? -0.25 : 0) };
M.cel_roca = { rampa: ['#0e0d0c', '#1a1816', '#282521', '#37332d', '#47423a', '#585148', '#6a6256'], ruido: 0.5, escala: 0.12, patron: (p) => (Math.abs(ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.15) - 0.5) < 0.02 ? 0.25 : 0) };
M.cel_vacio = { rampa: ['#000000', '#030206', '#07050e', '#0d0918', '#150f24'], ruido: 0.6, escala: 0.4, emite: true };
M.cel_luz = { rampa: ['#8c8676', '#b8b09c', '#dcd4c0', '#f2ecdc', '#fcf8ee', '#ffffff'], ruido: 0.3, escala: 0.3, emite: true };
M.cel_luz_oro = { rampa: ['#7a5418', '#a87a26', '#d2a440', '#ecc868', '#fae4a4', '#fff6dc'], ruido: 0.3, escala: 0.3, emite: true };
M.cel_ceniza = { rampa: ['#1f1b15', '#332c22', '#493f30', '#615440', '#7a6a51', '#948265', '#ad997a'], ruido: 0.6, escala: 0.18 };
M.cel_nube = { rampa: ['#2a2724', '#423d38', '#5d564e', '#797066', '#968b7e', '#b2a696', '#cbc0ae'], ruido: 0.45, escala: 0.12 };
M.cel_ojo = { rampa: ['#6a4410', '#9a6a1c', '#c8962e', '#e8c050', '#f8e08c', '#fff4d0'], ruido: 0.25, escala: 0.6, emite: true };
M.cel_hueso = { rampa: ['#2a2620', '#443e33', '#615848', '#7f745f', '#9c9077', '#b6aa90', '#ccc1a6'], ruido: 0.25, escala: 0.5 };

const MA = 'cel_marmol', ML = 'cel_marmol_losas', OR = 'cel_oro', OV = 'cel_oro_viejo', PE = 'cel_piedra', RO = 'cel_roca';

// ------------------------------------------------------------------ ayudas
const lat = (d: V3): V3 => nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1]));
const mover = (ps: Pieza[], giro: number, t: V3 = [0, 0, 0], ix = 0, iy = 0) => transformar(ps, rotM(giro, ix, iy), t);
const ID3: [V3, V3, V3] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
/** Agrega a cada variante su gemela a lo largo de y (`<variante>_y`), con la huella girada. */
function dosEjes(d: ObjetoDef): ObjetoDef {
  const base = d.armar;
  return {
    ...d, variantes: [...d.variantes, ...d.variantes.map((v) => v + '_y')],
    armar: (v, f, a) => {
      if (!v.endsWith('_y')) return base(v, f, a);
      const r = base(v.slice(0, -2), f, a), m = rotM(90);
      if (Array.isArray(r)) return transformar(r, m);
      const e: Escena = { ...r, piezas: transformar(r.piezas, m) };
      if (r.resplandor) { const [x, y, z] = r.resplandor.c; e.resplandor = { ...r.resplandor, c: [-y, x, z] }; }
      return e;
    },
  };
}
/** Grieta con oro: vetas finas de oro que corren por una superficie (punto, normal y largo). */
function vetaOro(a: Arma, ps: Pieza[], c: V3, n: V3, largo: number, mat = OR) {
  const nn = nor(n), u = lat(nn), w = cruz(nn, u);
  let p = c, d = nor(add(esc(u, Math.cos(a.r() * TAU)), w, Math.sin(a.r() * TAU)));
  for (let i = 0; i < 4; i++) {
    d = nor(add(d, add(esc(u, jit(a, 0.6)), w, jit(a, 0.6))));
    const q = add(p, d, largo / 4);
    ps.push({ k: 'elip', c: mez(p, q, 0.5), ex: d, ey: cruz(nn, d), ez: nn, r: [largo / 8 + 0.4, 0.45, 0.5], mat } as Pieza);
    p = q;
  }
}
/** Pedazo de mármol quebrado (peña facetada de mármol) con un canto de oro. */
const lasca = (a: Arma, c: V3, r: number, mat = MA) => pena(a, c[0], c[1], c[2], r * (0.8 + a.r() * 0.4), r * (0.6 + a.r() * 0.4), r * (0.5 + a.r() * 0.4), { mat, giro: a.r() * 360 });
/** Fuste de columna clásica estriada (cilindro y estrías como baquetones finos) con basa y capitel dorado. */
function columna(a: Arma, ps: Pieza[], c: V3, alto: number, r: number, o: { roto?: number; capitel?: boolean } = {}) {
  const h = alto * (o.roto ?? 1);
  ps.push(a.caja(c[0], c[1], c[2], r * 3, r * 3, 2.5, { mat: ML }), a.cilindro(c[0], c[1], c[2] + 2.5, r * 1.35, 2.5, { mat: MA, r1: r * 1.1 }));
  ps.push(a.cilindro(c[0], c[1], c[2] + 5, r, h - 5, { mat: MA, r1: r * 0.92 }));
  for (let k = 0; k < 10; k++) { const an = (k / 10) * TAU; ps.push(a.cilindro(c[0] + Math.cos(an) * r * 0.97, c[1] + Math.sin(an) * r * 0.97, c[2] + 5, r * 0.16, h - 5.5, { mat: MA, r1: r * 0.15, tono: 0.05 })); }
  if ((o.roto ?? 1) >= 1 && o.capitel !== false) {
    ps.push(a.cilindro(c[0], c[1], c[2] + h, r * 0.95, 2, { mat: OR, r1: r * 1.2 }), a.cilindro(c[0], c[1], c[2] + h + 2, r * 1.2, 3, { mat: OR, r1: r * 1.5 }));
    for (const s of [-1, 1]) ps.push(a.cilindro(c[0] - r * 1.4, c[1] + s * r * 1.05, c[2] + h + 4, r * 0.55, r * 2.8, { mat: OR, eje: [1, 0, 0] }));
    ps.push(a.caja(c[0], c[1], c[2] + h + 5, r * 3.2, r * 3.2, 2.5, { mat: ML }));
  } else if ((o.roto ?? 1) < 1) for (let k = 0; k < 3; k++) ps.push(pena(a, c[0] + jit(a, r * 0.4), c[1] + jit(a, r * 0.4), c[2] + h - 1, r * 0.8, r * 0.7, 1.5 + a.r() * 4, { mat: MA }));
  return c[2] + h + 7.5;
}
/** Figura humana de masa: torso, cabeza, brazos, piernas y túnica; la pose da las articulaciones mirando a +x. */
interface Pose { pel: V3; pecho: V3; cab: V3; hom: [V3, V3]; codo: [V3, V3]; mano: [V3, V3]; rod: [V3, V3]; pie: [V3, V3]; tunica?: number }
function figura(p: Pose, mat: string, s = 1, o: { sinCabeza?: boolean; manto?: string; sinBrazo?: number } = {}): Pieza[] {
  const S = (v: V3): V3 => esc(v, s), cs: Comp[] = [], m = { mat };
  const pel = S(p.pel), pe = S(p.pecho), cab = S(p.cab);
  cs.push(bulto(pel, [5 * s, 6.5 * s, 4.5 * s], m), hueso(pel, pe, 5 * s, 6 * s, m), bulto(pe, [4.6 * s, 7.8 * s, 5.5 * s], m));
  if (!o.sinCabeza) cs.push(hueso(pe, mez(pe, cab, 0.6), 2.4 * s, 2.2 * s, m), bulto(cab, [3.8 * s, 3.3 * s, 4.3 * s], { ...m, eje: sub(cab, pe) }));
  else cs.push(hueso(pe, mez(pe, cab, 0.35), 2.6 * s, 2.3 * s, m));
  for (const i of [0, 1]) {
    const h = S(p.hom[i]), c = S(p.codo[i]), mn = S(p.mano[i]);
    cs.push(bulto(h, [3.1 * s, 3.1 * s, 3.1 * s], m));
    if (o.sinBrazo !== i) cs.push(hueso(h, c, 2.4 * s, 2 * s, m), hueso(c, mn, 2 * s, 1.5 * s, m), bulto(add(mn, nor(sub(mn, c)), 1.4 * s), [2.2 * s, 1.2 * s, 1.6 * s], { ...m, eje: sub(mn, c) }));
    const r = S(p.rod[i]), pi = S(p.pie[i]), cad = add(pel, [0, (i ? 1 : -1) * 4 * s, -1.5 * s]);
    cs.push(hueso(cad, r, 3.4 * s, 2.6 * s, m), hueso(r, pi, 2.5 * s, 1.7 * s, m), bulto(add(pi, [2 * s, 0, -0.6 * s]), [3.2 * s, 1.5 * s, 1.1 * s], m));
  }
  const tu = p.tunica ?? 1, tm = o.manto ?? mat;
  if (tu > 0) {
    const bajo = mez(S(p.rod[0]), S(p.rod[1]), 0.5), cint = mez(pel, pe, 0.15);
    cs.push(hueso(cint, mez(cint, bajo, 0.55), 5.6 * s, 6.2 * s, { mat: tm }), hueso(mez(cint, bajo, 0.5), add(bajo, [0, 0, -bajo[2] * 0.8 * tu]), 6.2 * s, 7.6 * s * tu + 1, { mat: tm }));
  }
  return [masa(cs, { mat, suave: 1.6 * s })];
}
const POSES: Record<string, Pose> = {
  rodillas: { pel: [-2, 0, 20], pecho: [-3.5, 0, 33], cab: [-4, 0, 42.5], hom: [[-3.5, -7.5, 36], [-3.5, 7.5, 36]], codo: [[1, -11, 45], [1, 11, 45]], mano: [[5, -8, 55], [5, 8, 55]], rod: [[7, -4.5, 3], [7, 4.5, 3]], pie: [[-11, -4, 1.4], [-11, 4, 1.4]], tunica: 0.9 },
  alzados: { pel: [0, 0, 33], pecho: [-1, 0, 46], cab: [-2.5, 0, 55.5], hom: [[-1, -8, 49], [-1, 8, 49]], codo: [[1, -12, 59], [1, 12, 59]], mano: [[4, -9, 70], [4, 9, 70]], rod: [[1, -4, 18], [1, 4, 18]], pie: [[0, -4, 1.4], [0, 4, 1.4]] },
  postrado: { pel: [-8, 0, 15], pecho: [4, 0, 12], cab: [12, 0, 6], hom: [[4, -7, 13], [4, 7, 13]], codo: [[12, -10, 5], [12, 10, 5]], mano: [[22, -8, 1.6], [22, 8, 1.6]], rod: [[-2, -4.5, 2.2], [-2, 4.5, 2.2]], pie: [[-17, -4, 1.4], [-17, 4, 1.4]], tunica: 0.6 },
  tendiendo: { pel: [0, 0, 33], pecho: [1.5, 0, 46], cab: [3.5, 0, 55], hom: [[1.5, -8, 49], [1.5, 8, 49]], codo: [[10, -8, 51], [5, 8, 40]], mano: [[19, -6, 57], [7, 3, 46]], rod: [[3, -4, 18], [-2, 4, 18]], pie: [[4, -4, 1.4], [-6, 4, 1.4]] },
  encogido: { pel: [-2, 0, 18], pecho: [2.5, 0, 30], cab: [6, 0, 37.5], hom: [[2, -7.5, 33], [2, 7.5, 33]], codo: [[7, -8, 25], [7, 8, 25]], mano: [[9, -2.4, 36], [9, 2.4, 36]], rod: [[8, -4.5, 3], [8, 4.5, 3]], pie: [[-10, -4, 1.4], [-10, 4, 1.4]], tunica: 0.9 },
  sentado: { pel: [-2, 0, 16], pecho: [-1, 0, 29], cab: [0.5, 0, 38.5], hom: [[-1, -7.5, 32], [-1, 7.5, 32]], codo: [[3, -10, 23], [3, 10, 23]], mano: [[10, -8, 20], [10, 8, 20]], rod: [[12, -5, 14], [12, 5, 14]], pie: [[14, -5, 1.4], [14, 5, 1.4]], tunica: 0.7 },
};
/** Estatua petrificada de uno que intentó antes: piedra gris con grietas de oro y alguna parte quebrada. */
function petrificado(a: Arma, pose: string, giro: number, t: V3, s = 1, o: { roto?: boolean; mat?: string } = {}): Pieza[] {
  const sinBrazo = o.roto && a.r() < 0.6 ? (a.r() < 0.5 ? 0 : 1) : undefined;
  const ps = figura(POSES[pose], o.mat ?? PE, s, { sinBrazo, sinCabeza: o.roto && sinBrazo === undefined });
  const P = POSES[pose];
  for (let i = 0; i < 3; i++) { const q = mez(P.pel, P.cab, 0.2 + a.r() * 0.6); vetaOro(a, ps, add(esc(q, s), [4.5 * s, jit(a, 3), 0]), [1, jit(a, 0.5), 0.2], 7 * s); }
  return transformar(ps, rotM(giro), t);
}

// ------------------------------------------------------------------ 1. islas que flotan y sus bordes
/**
 * Isla flotante: una losa de mármol arriba (z = 0, se camina) y debajo la roca que cuelga en cono quebrado, con
 * raíces de oro y piedras sueltas que flotan bajo ella. `r` es el radio de la losa.
 */
function isla(a: Arma, ps: Pieza[], r: number, f: number, n: number, o: { hondo?: number; x?: number; y?: number } = {}) {
  const cx = o.x ?? 0, cy = o.y ?? 0, hondo = o.hondo ?? r * 1.5, cs: Comp[] = [];
  // la roca de abajo: bultos que se angostan hacia la punta, fundidos en una masa
  for (let i = 0; i < 6; i++) { const t = i / 5, rr = r * (1 - t * 0.85), dz = -t * hondo; cs.push(bulto([cx + jit(a, r * 0.15 * t), cy + jit(a, r * 0.15 * t), dz - 2], [rr * (0.85 + a.r() * 0.2), rr * (0.75 + a.r() * 0.2), Math.max(3, hondo * 0.22)], { giro: a.r() * 180, mat: RO })); }
  for (let i = 0; i < 6; i++) { const an = a.r() * TAU, t = 0.2 + a.r() * 0.5; cs.push(bulto([cx + Math.cos(an) * r * (0.9 - t * 0.6), cy + Math.sin(an) * r * (0.8 - t * 0.6), -t * hondo], [r * 0.3, r * 0.25, hondo * 0.18], { giro: a.r() * 180, mat: RO })); }
  ps.push(masa(cs, { mat: RO, suave: r * 0.2 }));
  // la losa de mármol con el canto quebrado
  const nl = 12, pts: V3[] = [];
  for (let i = 0; i < nl; i++) { const an = (i / nl) * TAU, rr = r * (0.88 + a.r() * 0.2); pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.9, 0]); }
  ps.push(a.poliedro([...pts, ...pts.map((p) => add(p, [0, 0, -5]) as V3).map((p) => [cx + (p[0] - cx) * 0.95, cy + (p[1] - cy) * 0.95, p[2]] as V3)], { mat: ML }));
  // raíces de oro que cuelgan y piedras que flotan debajo, meciéndose
  for (let i = 0; i < 4; i++) { const an = a.r() * TAU, b: V3 = [cx + Math.cos(an) * r * 0.5, cy + Math.sin(an) * r * 0.45, -hondo * (0.3 + a.r() * 0.3)]; const cs2: Comp[] = []; let p = b; for (let k = 0; k < 4; k++) { const q = add(p, [jit(a, 3), jit(a, 3), -4 - a.r() * 4]); cs2.push(hueso(p, q, 1.1 - k * 0.2, 0.9 - k * 0.2, { mat: OV })); p = q; } ps.push(masa(cs2, { mat: OV, suave: 0.6 })); }
  for (let i = 0; i < 3; i++) { const an = a.r() * TAU, z = -hondo * (0.7 + a.r() * 0.5) + onda(f, n, i * 2) * 2; ps.push(pena(a, cx + Math.cos(an) * r * 0.6, cy + Math.sin(an) * r * 0.5, z, 2.5 + a.r() * 3, 2 + a.r() * 2.5, 2 + a.r() * 3, { mat: RO })); }
}
registrar(
  {
    id: 'cel_isla_ruinas', nombre: ['Isla de ruinas que flota', 'Floating ruin island'], tema: TEMA, variantes: ['chica', 'mediana', 'grande', 'con_columnas', 'con_arco', 'con_estatua'], cuadros: 8, t: 5, huella: [5, 5], huellaPor: { chica: [3, 3], grande: [7, 7] }, bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], r = v === 'chica' ? 22 : v === 'grande' ? 54 : 38;
      isla(a, ps, r, f, 8);
      // ruinas encima: piso roto, columnas, un arco, una estatua que suplica
      for (let i = 0; i < 4; i++) ps.push(lasca(a, [jit(a, r * 0.6), jit(a, r * 0.6), 1.5], 3 + a.r() * 3));
      if (v === 'con_columnas' || v === 'grande') for (let i = 0; i < (v === 'grande' ? 5 : 3); i++) { const p = polar(i * (360 / (v === 'grande' ? 5 : 3)) + jit(a, 20), r * 0.55); columna(a, ps, p, 46 + a.r() * 22, 3.6, { roto: a.r() < 0.6 ? 0.35 + a.r() * 0.5 : 1 }); }
      if (v === 'con_arco') { const g = a.r() * 360; const loc: Pieza[] = []; for (const s of [-1, 1]) columna(a, loc, [0, s * 14, 0], 44, 3.4); for (let i = 0; i <= 6; i++) { const an = (i / 6) * PI; loc.push(a.caja(0, -Math.cos(an) * 14, 52 + Math.sin(an) * 12, 7, 6, 5, { mat: MA, tono: jit(a, 0.05) })); } loc.push(a.caja(0, 0, 66, 8, 3, 3, { mat: OR })); ps.push(...mover(loc, g)); }
      if (v === 'con_estatua' || v === 'chica') ps.push(...petrificado(a, elegir(a, ['rodillas', 'alzados', 'encogido']), a.r() * 360, [jit(a, 6), jit(a, 6), 0], 0.95));
      if (v === 'mediana') { ps.push(a.caja(0, 0, 0, 26, 26, 3, { mat: ML }), a.caja(0, 0, 3, 20, 20, 2, { mat: ML, tono: 0.05 })); vetaOro(a, ps, [0, 0, 5.1], [0, 0, 1], 14); }
      return { piezas: ps, sinSombra: true };
    },
  },
  {
    id: 'cel_isla_borde', nombre: ['Borde de isla sobre el vacío', 'Island edge over the void'], tema: TEMA,
    variantes: ['se', 'so', 'ne', 'no', 'esquina_s', 'esquina_e', 'esquina_n', 'esquina_o'], cuadros: 8, t: 6, huella: [1, 5],
    huellaPor: { se: [1, 5], no: [1, 5], so: [5, 1], ne: [5, 1], esquina_s: [3, 3], esquina_e: [3, 3], esquina_n: [3, 3], esquina_o: [3, 3] }, bloquea: true,
    armar: (v, f, a) => {
      // se arma con el vacío hacia +x (sureste) y se gira para las demás orientaciones
      const loc: Pieza[] = [];
      const esquina = v.startsWith('esquina'), L = esquina ? 48 : 80;
      const tramo = (x0: number, largo: number, giro: number) => {
        const t: Pieza[] = [];
        // canto quebrado de la losa, la roca que cae en voladizo y las piedras que se desprenden
        const n = 6;
        for (let i = 0; i < n; i++) {
          const y = -largo / 2 + (i + 0.5) * (largo / n), sale = 1 + a.r() * 5;
          t.push(a.caja(x0 - 4 + sale / 2, y, -5, 8 + sale, largo / n + 0.3, 5, { mat: ML, tono: jit(a, 0.04) }));
          const cs: Comp[] = [bulto([x0 - 2, y, -12], [7, largo / n * 0.7, 9], { mat: RO }), bulto([x0 - 6, y + jit(a, 3), -26 - a.r() * 8], [5, largo / n * 0.5, 10], { mat: RO })];
          t.push(masa(cs, { mat: RO, suave: 3 }));
          if (a.r() < 0.5) t.push(...roca(a, [x0 + 1 + a.r() * 3, y, -6], [3, 4, 3], { mat: MA, facetas: 1, n: 2 }));
        }
        for (let i = 0; i < 3; i++) t.push(pena(a, x0 + 6 + a.r() * 10, jit(a, largo * 0.45), -14 - a.r() * 20 + onda(f, 8, i * 2.1) * 1.6, 2 + a.r() * 3, 2 + a.r() * 2, 2 + a.r() * 2.5, { mat: a.r() < 0.4 ? MA : RO }));
        // una raíz de oro que cuelga del canto
        const cs2: Comp[] = []; let p: V3 = [x0 - 2, jit(a, largo * 0.3), -14]; for (let k = 0; k < 4; k++) { const q = add(p, [1 + jit(a, 1), jit(a, 2.5), -5 - a.r() * 3]); cs2.push(hueso(p, q, 1 - k * 0.18, 0.8 - k * 0.18, { mat: OV })); p = q; }
        t.push(masa(cs2, { mat: OV, suave: 0.5 }));
        return mover(t, giro);
      };
      if (!esquina) loc.push(...tramo(4, L, 0));
      else {
        // esquina hacia afuera: dos cantos que se encuentran en punta
        loc.push(...transformar(tramo(4, L, 0), ID3, [8, -L / 2 + 16, 0]), ...transformar(tramo(4, L, 90), ID3, [-L / 2 + 16, 8, 0]));
      }
      const g = { se: 0, so: 90, no: 180, ne: 270, esquina_s: 0, esquina_o: 90, esquina_n: 180, esquina_e: 270 }[v] ?? 0;
      return { piezas: mover(loc, g), sinSombra: true };
    },
  },
  {
    id: 'cel_fragmento_flotante', nombre: ['Pedazos que flotan', 'Floating fragments'], tema: TEMA, variantes: ['rocas', 'con_ruina', 'con_escalon', 'losas'], cuadros: 8, t: 4, huella: [2, 2], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      for (let i = 0; i < 4; i++) {
        const ph = a.r() * TAU, z = 10 + a.r() * 40 + Math.sin(ciclo(f, 8) * TAU + ph) * 3, c: V3 = [jit(a, 18), jit(a, 18), z], g = a.r() * 360 + ciclo(f, 8) * 45 * (i % 2 ? 1 : -1);
        const loc: Pieza[] = [];
        if (v === 'losas' || (v === 'con_escalon' && i === 0)) { loc.push(a.caja(0, 0, 0, 14 + a.r() * 6, 8 + a.r() * 4, 3, { mat: v === 'con_escalon' ? OR : ML })); loc.push(...roca(a, [0, 0, -3], [6, 4, 4], { mat: RO, facetas: 0, n: 3 })); }
        else if (v === 'con_ruina' && i === 0) { columna(a, loc, [0, 0, 0], 22, 2.6, { roto: 0.7 }); loc.push(...roca(a, [0, 0, -2], [8, 7, 6], { mat: RO, facetas: 1, n: 4 })); }
        else loc.push(...roca(a, [0, 0, 0], [4 + a.r() * 4, 3 + a.r() * 3, 3 + a.r() * 3], { mat: elegir(a, [RO, RO, MA]), facetas: 2, n: 4 }));
        ps.push(...transformar(loc, rotM(g, jit(a, 12), jit(a, 12)), c));
      }
      return { piezas: ps, sinSombra: true };
    },
  },
);

// ------------------------------------------------------------------ 2. escaleras, columnas, arcos y templos
registrar(
  {
    id: 'cel_escalera_oro', nombre: ['Escalera de oro al cielo', 'Golden stair to the sky'], tema: TEMA, variantes: ['recta', 'espiral', 'rota', 'flotante'], cuadros: 8, t: 5, huella: [3, 5], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'espiral' ? 18 : 16;
      for (let i = 0; i < n; i++) {
        let c: V3, g = 0;
        if (v === 'espiral') { const an = i * 0.42; c = [Math.cos(an) * 16, Math.sin(an) * 16, i * 5.4]; g = (an * 180) / PI; }
        else c = [0, -30 + i * 5.2, i * 5.6];
        if (v === 'rota' && i > 9) { c = add(c, [jit(a, 4), (i - 9) * 2.5, (i - 9) * 3 + onda(f, 8, i) * 1.2]); g = jit(a, 25); }
        if (v === 'flotante') c = add(c, [0, i * 1.6, onda(f, 8, i * 0.7) * 1.5]);
        if (v === 'rota' && i === 9) continue;
        const loc: Pieza[] = [a.caja(0, 0, -2.6, 22, 7, 2.6, { mat: OR, tono: jit(a, 0.04) }), a.caja(0, -2.4, -4.4, 20, 2.6, 1.8, { mat: OV })];
        // canto tallado y un hueco de vacío donde se rajó
        if (a.r() < 0.3) loc.push(a.caja(jit(a, 8), 0, -1.2, 3 + a.r() * 4, 8, 3, { mat: OR, resta: true }));
        if (v === 'flotante' || (v === 'rota' && i > 9)) loc.push(...roca(a, [0, 0, -6], [6, 3, 3], { mat: RO, facetas: 0, n: 3 }));
        ps.push(...transformar(loc, rotM(g, 0, 0), c));
      }
      // pasamanos de oro a un costado y la luz que cae de arriba
      if (v === 'recta') for (const s of [-1, 1]) { ps.push(a.palo([s * 12, -30, 8], [s * 12, 48, 92], 0.9, { mat: OR })); for (let i = 0; i < 6; i++) { const t = i / 5; ps.push(a.palo([s * 12, -30 + t * 78, t * 84], [s * 12, -30 + t * 78, t * 84 + 8], 0.7, { mat: OR })); } }
      if (v !== 'espiral') ps.push(a.caja(0, -34, -6, 26, 8, 6, { mat: ML }));
      else ps.push(a.cilindro(0, 0, -3, 6, n * 5.4, { mat: MA }), a.cilindro(0, 0, -3, 20, 3, { mat: ML }));
      const k = 0.5 + 0.5 * onda(f, 8);
      for (let i = 0; i < 5; i++) { const u = ciclo(f + i * 1.6, 8); ps.push(a.esfera(jit(a, 12), jit(a, 30), 10 + u * 80, 0.7 * (1 - u * 0.5), { mat: 'cel_luz_oro', tono: -u * 0.3 })); }
      return { piezas: ps, resplandor: { c: [0, 10, 60], r: 40 + k * 8, color: '#f0d080' } };
    },
  },
  {
    id: 'cel_columna_rota', nombre: ['Columna rota con pedazos que giran', 'Broken column with spinning fragments'], tema: TEMA, variantes: ['corta', 'alta', 'partida', 'entera', 'caida'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], r = 4.4;
      if (v === 'caida') {
        const g = a.r() * 360, d: V3 = [Math.cos(rad(g)), Math.sin(rad(g)), 0];
        for (let i = 0; i < 4; i++) { const c = add(esc(d, -24 + i * 15), [0, 0, r]); ps.push(a.cilindro(...add(c, d, -6.5), r, 13, { mat: MA, eje: add(d, [jit(a, 0.08), jit(a, 0.08), 0]) })); }
        columna(a, ps, esc(d, 40), 18, r, { roto: 0.5 });
      } else {
        const alto = v === 'alta' || v === 'entera' ? 96 : 70;
        const roto = v === 'entera' ? 1 : v === 'corta' ? 0.35 : v === 'partida' ? 0.55 : 0.75;
        const top = columna(a, ps, [0, 0, 0], alto, r, { roto });
        vetaOro(a, ps, [r, 0, 18], [1, 0, 0], 16); vetaOro(a, ps, [0, r, 30], [0, 1, 0], 12);
        // los tambores de arriba flotan y giran lento sobre el corte
        if (v !== 'entera') {
          const nf = v === 'partida' ? 4 : 3;
          for (let i = 0; i < nf; i++) {
            const ph = ciclo(f, 8) * TAU, z = top + 8 + i * 11 + Math.sin(ph + i * 1.7) * 2, g = ph * (57 / 1) * (i % 2 ? 1 : -1) * 0.25 + i * 40;
            const loc: Pieza[] = [a.cilindro(0, 0, -4, r * 0.95, 8 - i, { mat: MA })];
            for (let k = 0; k < 3; k++) loc.push(pena(a, jit(a, r * 0.5), jit(a, r * 0.5), 4 - i, r * 0.6, r * 0.5, 1.5 + a.r() * 2, { mat: MA }));
            ps.push(...transformar(loc, rotM(g, 10 + i * 6, jit(a, 10)), [Math.sin(ph + i) * 1.5, Math.cos(ph + i) * 1.5, z]));
          }
          for (let i = 0; i < 5; i++) { const ph = ciclo(f, 8) * TAU + i * 1.25, rr = r * 2.4; ps.push(pena(a, Math.cos(ph) * rr, Math.sin(ph) * rr, top + 4 + i * 6 + Math.sin(ph * 2) * 1.5, 1.4, 1.2, 1.1, { mat: i % 2 ? MA : OR })); }
        }
      }
      ps.push(lasca(a, [8 + a.r() * 4, jit(a, 6), 1], 3), lasca(a, [jit(a, 6), 8 + a.r() * 4, 1], 2.4));
      return ps;
    },
  },
  {
    id: 'cel_arco_triunfal', nombre: ['Arco triunfal partido', 'Broken triumphal arch'], tema: TEMA, variantes: ['partido', 'entero', 'derrumbado', 'con_cadenas'], cuadros: 8, t: 5, huella: [7, 3], bloquea: true,
    armar: (v, f, a) => {
      const loc: Pieza[] = [], luz = 18, H = 70, ancho = 22;
      // dos machones con columnas adosadas, el arco de medio punto y el ático con la inscripción de oro
      for (const s of [-1, 1]) {
        if (v === 'derrumbado' && s > 0) { for (let i = 0; i < 5; i++) loc.push(lasca(a, [jit(a, 14), s * (luz + 12) + jit(a, 14), 2], 4 + a.r() * 4)); loc.push(a.caja(0, s * (luz + 9), 0, ancho, 18, 22, { mat: ML })); continue; }
        loc.push(a.caja(0, s * (luz + 9), 0, ancho, 18, H, { mat: ML }));
        for (const x of [-ancho / 2 - 2, ancho / 2 + 2]) columna(a, loc, [x, s * (luz + 9), 0], H - 8, 2.6, { capitel: true });
        loc.push(a.caja(ancho / 2 + 0.4, s * (luz + 9), 30, 1, 10, 18, { mat: OV }));
      }
      const R = luz;
      for (let i = 0; i <= 10; i++) { if ((v === 'partido' && i > 6) || (v === 'derrumbado' && i > 4)) continue; const an = (i / 10) * PI; loc.push(a.caja(0, -Math.cos(an) * R, H - 2 + Math.sin(an) * R * 0.9 - R * 0.9 + 4, ancho, 6, 6, { mat: MA, tono: jit(a, 0.04) })); }
      if (v === 'entero' || v === 'con_cadenas') { loc.push(a.caja(0, 0, H, ancho + 4, (luz + 18) * 2, 18, { mat: ML })); loc.push(a.caja(ancho / 2 + 2.2, 0, H + 5, 0.8, luz * 1.6, 7, { mat: OR })); }
      else if (v === 'partido') { loc.push(a.caja(0, -luz - 2, H, ancho + 4, luz + 18, 18, { mat: ML })); for (let i = 0; i < 4; i++) loc.push(pena(a, jit(a, 4), 6 + i * 6, H + 6 + onda(f, 8, i) * 2 + i * 7, 4, 4, 3, { mat: MA })); }
      if (v === 'con_cadenas') for (const s of [-1, 1]) { const pts = catenaria([ancho / 2, s * luz * 0.5, H + 18], [ancho / 2 + 30, s * (luz + 30), 130], -10, 8); cadena(a, loc, pts, 4.2, 0.9, OR); }
      for (let i = 0; i < 3; i++) vetaOro(a, loc, [ancho / 2 + 0.2, elegir(a, [-1, 1]) * (luz + 9), 10 + a.r() * 40], [1, 0, 0], 12);
      return mover(loc, 0);
    },
  },
  {
    id: 'cel_templo_ruina', nombre: ['Templo en ruinas', 'Ruined temple'], tema: TEMA, variantes: ['tholos', 'portico', 'derrumbado', 'cella'], huella: [8, 8], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      // gradas del podio
      for (let i = 0; i < 3; i++) ps.push(v === 'tholos' ? a.cilindro(0, 0, i * 3, 58 - i * 5, 3, { mat: ML }) : a.caja(0, 0, i * 3, 112 - i * 9, 96 - i * 9, 3, { mat: ML }));
      const z0 = 9;
      if (v === 'tholos') {
        for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU; columna(a, ps, [Math.cos(an) * 40, Math.sin(an) * 40, z0], 76, 4, { roto: a.r() < 0.4 ? 0.3 + a.r() * 0.5 : 1 }); }
        // media cúpula: anillo de entablamento y gajos que quedan
        for (let i = 0; i < 10; i++) { if (a.r() < 0.35) continue; const an = (i / 10) * TAU, an2 = ((i + 1) / 10) * TAU; ps.push(a.poliedro([[Math.cos(an) * 46, Math.sin(an) * 46, z0 + 84], [Math.cos(an2) * 46, Math.sin(an2) * 46, z0 + 84], [Math.cos(an) * 36, Math.sin(an) * 36, z0 + 84], [Math.cos(an2) * 36, Math.sin(an2) * 36, z0 + 84], [Math.cos(an) * 46, Math.sin(an) * 46, z0 + 92], [Math.cos(an2) * 46, Math.sin(an2) * 46, z0 + 92], [Math.cos(an) * 36, Math.sin(an) * 36, z0 + 92], [Math.cos(an2) * 36, Math.sin(an2) * 36, z0 + 92]], { mat: ML, tono: jit(a, 0.04) })); }
        ps.push(a.cilindro(0, 0, z0, 10, 2, { mat: OR }), a.cilindro(0, 0, z0 + 2, 6, 8, { mat: MA, r1: 4 }));
      } else {
        const xs = [-40, -20, 0, 20, 40], ys = v === 'cella' ? [-36, 36] : [-36, -12, 12, 36];
        for (const x of xs) for (const y of [-36, 36]) columna(a, ps, [x, y, z0], 80, 4, { roto: v === 'derrumbado' && a.r() < 0.6 ? 0.2 + a.r() * 0.5 : a.r() < 0.15 ? 0.5 : 1 });
        for (const y of ys) if (y !== -36 && y !== 36) columna(a, ps, [46, y, z0], 80, 4, { roto: v === 'derrumbado' ? 0.3 : 1 });
        if (v === 'cella') { ps.push(a.caja(-6, 0, z0, 60, 44, 54, { mat: ML }), a.caja(24, 0, z0, 2, 16, 34, { mat: 'negro', resta: true }), a.caja(23.5, 0, z0, 1, 18, 36, { mat: OV, resta: false })); ps.push(a.caja(23.4, 0, z0, 1, 14, 32, { mat: 'cel_vacio' })); }
        if (v === 'portico') {
          ps.push(a.caja(30, 0, z0 + 88, 36, 84, 8, { mat: ML }));
          ps.push(a.poliedro([[14, -44, z0 + 96], [14, 44, z0 + 96], [48, -44, z0 + 96], [48, 44, z0 + 96], [14, 0, z0 + 116], [48, 0, z0 + 116]], { mat: MA }));
          ps.push(a.cilindro(48.5, 0, z0 + 102, 6, 1, { mat: OR, eje: [1, 0, 0] }));
        } else if (v !== 'cella') { ps.push(a.caja(-20, -36, z0 + 88, 50, 12, 8, { mat: ML, incl: 4 })); for (let i = 0; i < 8; i++) ps.push(lasca(a, [jit(a, 40), jit(a, 34), z0 + 2], 4 + a.r() * 5)); }
      }
      for (let i = 0; i < 4; i++) vetaOro(a, ps, [jit(a, 30), jit(a, 30), z0 + 0.2], [0, 0, 1], 20);
      return ps;
    },
  },
  dosEjes({
    id: 'cel_balaustrada', nombre: ['Balaustrada de mármol', 'Marble balustrade'], tema: TEMA, variantes: ['entera', 'rota', 'con_jarron', 'caida'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], L = 80;
      ps.push(a.caja(0, 0, 0, L, 8, 3, { mat: ML }));
      const n = 13;
      for (let i = 0; i < n; i++) {
        const x = -L / 2 + 3 + i * ((L - 6) / (n - 1));
        if (v === 'rota' && i > 6 && i < 11) { if (a.r() < 0.5) ps.push(a.cilindro(x + jit(a, 4), 4 + a.r() * 6, 3.4, 2, 14, { mat: MA, eje: [jit(a, 1), 1, 0] })); continue; }
        if (v === 'caida') { ps.push(a.cilindro(x, 6 + jit(a, 2), 2, 2.2, 14, { mat: MA, eje: [0.2, 1, 0.05] })); continue; }
        ps.push(masa([hueso([x, 0, 3], [x, 0, 7], 1.6, 2.4, { mat: MA }), bulto([x, 0, 9], [2.6, 2.6, 2.6], { mat: MA }), hueso([x, 0, 11], [x, 0, 17], 1.8, 1.3, { mat: MA })], { mat: MA, suave: 1 }));
      }
      if (v !== 'caida') { if (v === 'rota') { ps.push(a.caja(-L / 4, 0, 17, L / 2, 9, 3, { mat: ML }), a.caja(L * 0.38, 0, 17, L * 0.24, 9, 3, { mat: ML })); } else ps.push(a.caja(0, 0, 17, L, 9, 3, { mat: ML })); }
      for (const x of [-L / 2, L / 2]) ps.push(a.caja(x, 0, 0, 8, 10, 22, { mat: ML }), a.caja(x, 0, 22, 10, 12, 2, { mat: OR }));
      if (v === 'con_jarron') ps.push(masa([bulto([L / 2, 0, 30], [4, 4, 5], { mat: OR }), hueso([L / 2, 0, 33], [L / 2, 0, 38], 2, 3.2, { mat: OR })], { mat: OR, suave: 1 }), a.cilindro(L / 2, 0, 24, 2, 2, { mat: OR }));
      ps.push(lasca(a, [jit(a, 30), 8, 1], 2.5));
      return ps;
    },
  }),
);

// ------------------------------------------------------------------ 3. los que intentaron antes, el jardín de estatuas y las fuentes secas
registrar(
  {
    id: 'cel_estatua_suplica', nombre: ['Estatua de los que intentaron antes', 'Statue of those who tried before'], tema: TEMA, variantes: ['rodillas', 'alzados', 'postrado', 'tendiendo', 'encogido', 'abrazados'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], g = 45 + jit(a, 40), roto = a.r() < 0.35;
      if (v === 'abrazados') {
        // dos que se aferran uno al otro de rodillas
        ps.push(...petrificado(a, 'rodillas', g + 20, [-5, -4, 0], 0.98), ...petrificado(a, 'encogido', g - 160, [6, 5, 0], 0.95));
      } else ps.push(...petrificado(a, v, g, [0, 0, 0], 1, { roto }));
      // los pedazos que se le cayeron y el polvo de oro al pie
      for (let i = 0; i < (roto ? 4 : 2); i++) ps.push(lasca(a, [jit(a, 14), jit(a, 14), 1], 1.5 + a.r() * 2, PE));
      for (let i = 0; i < 5; i++) ps.push(a.elipsoide(jit(a, 12), jit(a, 12), 0.2, 2 + a.r() * 2, 1.5 + a.r() * 1.5, 0.4, { mat: 'cel_ceniza', giro: a.r() * 180 }));
      return ps;
    },
  },
  {
    id: 'cel_jardin_estatuas', nombre: ['Jardín de estatuas', 'Statue garden'], tema: TEMA, variantes: ['tres', 'cinco', 'en_fila', 'con_arbol'], huella: [6, 6], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], n = v === 'cinco' ? 5 : v === 'en_fila' ? 4 : 3;
      // senderos de losas y canteros con arbustos dorados secos
      ps.push(a.caja(0, 0, 0, 92, 14, 1.2, { mat: ML }), a.caja(0, 0, 0, 14, 92, 1.2, { mat: ML }));
      for (let i = 0; i < n; i++) {
        const p: V3 = v === 'en_fila' ? [-36 + i * 24, 18, 0] : polar((i / n) * 360 + 45 + jit(a, 10), 30);
        ps.push(a.caja(p[0], p[1], 0, 16, 16, 6, { mat: ML }), a.caja(p[0], p[1], 6, 18, 18, 1.4, { mat: OV }));
        ps.push(...petrificado(a, elegir(a, ['rodillas', 'alzados', 'tendiendo', 'encogido', 'sentado']), (Math.atan2(-p[1], -p[0]) * 180) / PI + jit(a, 20), add(p, [0, 0, 7.4]), 0.9, { roto: a.r() < 0.3 }));
      }
      const arbusto = (c: V3, s: number) => { const cs: Comp[] = []; for (let k = 0; k < 7; k++) { const an = a.r() * TAU, q = add(c, [Math.cos(an) * s * 0.6, Math.sin(an) * s * 0.6, s * (0.5 + a.r() * 0.6)]); cs.push(hueso(c, q, 0.7, 0.3, { mat: OV }), hueso(q, add(q, [jit(a, s * 0.4), jit(a, s * 0.4), s * 0.3]), 0.35, 0.15, { mat: OV })); } ps.push(masa(cs, { mat: OV, suave: 0.4 })); };
      for (let i = 0; i < 4; i++) arbusto([elegir(a, [-1, 1]) * (14 + a.r() * 26), elegir(a, [-1, 1]) * (14 + a.r() * 26), 0], 7 + a.r() * 4);
      if (v === 'con_arbol') { const cs: Comp[] = []; const rama = (p: V3, d: V3, L: number, r: number, k: number) => { const q = add(p, nor(d), L); cs.push(hueso(p, q, r, r * 0.7, { mat: OR })); if (k > 0) for (const s of [-1, 1]) rama(q, add(nor(d), [s * 0.6 + jit(a, 0.3), jit(a, 0.6), 0.3]), L * 0.7, r * 0.68, k - 1); }; rama([0, 0, 0], [0, 0, 1], 30, 3.2, 4); ps.push(masa(cs, { mat: OR, suave: 1.2 })); }
      return ps;
    },
  },
  {
    id: 'cel_fuente_seca', nombre: ['Fuente de oro seca con cráneos', 'Dry golden fountain of skulls'], tema: TEMA, variantes: ['redonda', 'tres_tazas', 'rota', 'con_estatua'], cuadros: 8, t: 5, huella: [5, 5], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], R = 34;
      // pileta de mármol con el borde de oro; adentro, en vez de agua, un montón de cráneos y polvo dorado
      ps.push(a.cilindro(0, 0, 0, R, 10, { mat: ML }), a.cilindro(0, 0, 9, R + 0.8, 2.4, { mat: OR, r1: R + 0.2 }), a.cilindro(0, 0, 3, R - 4, 12, { mat: MA, resta: true }));
      ps.push(a.cilindro(0, 0, 3, R - 4.5, 1.4, { mat: 'cel_ceniza' }));
      for (let i = 0; i < 16; i++) { const an = a.r() * TAU, d = 8 + a.r() * (R - 14); craneo(a, ps, [Math.cos(an) * d, Math.sin(an) * d, 6 + a.r() * 2.5], 3, a.r() * 360, { mat: 'cel_hueso', incl: jit(a, 40), mandibula: a.r() < 0.3, ladeo: jit(a, 40) }); }
      // el fuste central con las tazas de oro vacías y agrietadas
      const tazas = v === 'tres_tazas' ? 3 : v === 'rota' ? 1 : 2;
      ps.push(a.cilindro(0, 0, 4, 5, 22 * tazas + 6, { mat: MA, r1: 3.5 }));
      for (let i = 0; i < tazas; i++) {
        const z = 18 + i * 22, r = 16 - i * 4;
        ps.push(a.cilindro(0, 0, z, 3, 4, { mat: OR, r1: r }), a.cilindro(0, 0, z + 4, r, 2, { mat: OR, r1: r + 1 }), a.cilindro(0, 0, z + 3, r - 1.5, 4, { mat: OR, resta: true }));
        ps.push(a.cilindro(0, 0, z + 3.2, r - 1.6, 0.6, { mat: 'cel_ceniza' }));
        // cabezas de león de oro por donde salía el agua, con la boca seca
        for (let k = 0; k < 4; k++) { const an = (k / 4) * TAU + PI / 4; ps.push(a.esfera(Math.cos(an) * (r + 0.6), Math.sin(an) * (r + 0.6), z + 4, 1.6, { mat: OV }), a.esfera(Math.cos(an) * (r + 1.8), Math.sin(an) * (r + 1.8), z + 3.6, 0.6, { mat: 'negro' })); }
      }
      if (v === 'rota') for (let i = 0; i < 4; i++) ps.push(lasca(a, [jit(a, R), jit(a, R), 12], 4 + a.r() * 3, OR));
      if (v === 'con_estatua') ps.push(...petrificado(a, 'alzados', a.r() * 360, [0, 0, 22 * tazas + 10], 0.75));
      // polvo de oro que cae de la taza más alta como si todavía goteara
      for (let i = 0; i < 6; i++) { const u = ciclo(f + i * 1.3, 8), an = (i / 6) * TAU; const r = 16 - (tazas - 1) * 4 + 1; ps.push(a.esfera(Math.cos(an) * r, Math.sin(an) * r, 18 + (tazas - 1) * 22 + 4 - u * 20, 0.6, { mat: 'cel_luz_oro', tono: -0.2 - u * 0.2 })); }
      for (let i = 0; i < 3; i++) vetaOro(a, ps, [Math.cos(i * 2) * R, Math.sin(i * 2) * R, 5], [Math.cos(i * 2), Math.sin(i * 2), 0], 8);
      return ps;
    },
  },
  {
    id: 'cel_brasero_blanco', nombre: ['Brasero de luz blanca', 'White-light brazier'], tema: TEMA, variantes: ['alto', 'cuenco', 'tripode', 'colgante', 'apagado'], cuadros: 8, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      let c: V3;
      if (v === 'alto' || v === 'apagado') { ps.push(a.cilindro(0, 0, 0, 7, 3, { mat: ML }), a.cilindro(0, 0, 3, 3, 36, { mat: OR, r1: 2.4 }), a.cilindro(0, 0, 38, 2.6, 4, { mat: OR, r1: 9 }), a.cilindro(0, 0, 42, 9, 2.5, { mat: OR }), a.cilindro(0, 0, 41, 7.5, 4, { mat: OR, resta: true })); c = [0, 0, 42]; }
      else if (v === 'cuenco') { ps.push(a.cilindro(0, 0, 0, 14, 4, { mat: ML }), a.cilindro(0, 0, 4, 8, 6, { mat: OR, r1: 16 }), a.cilindro(0, 0, 8, 13, 3, { mat: OR, resta: true })); c = [0, 0, 9]; }
      else if (v === 'tripode') { for (let k = 0; k < 3; k++) { const an = (k / 3) * TAU; ps.push(a.palo([Math.cos(an) * 12, Math.sin(an) * 12, 0], [Math.cos(an) * 4, Math.sin(an) * 4, 28], 1.2, { mat: OR })); } ps.push(a.cilindro(0, 0, 26, 4, 4, { mat: OR, r1: 10 }), a.cilindro(0, 0, 29, 8.5, 3, { mat: OR, resta: true })); c = [0, 0, 30]; }
      else { for (const y of [-14, 14]) ps.push(a.cilindro(0, y, 0, 1.6, 60, { mat: OR })); ps.push(a.palo([0, -15, 59], [0, 15, 59], 1.2, { mat: OR })); const sw = onda(f, 8) * 1.5; for (const y of [-4, 4]) ps.push(a.palo([0, y * 0.4, 59], [sw, y, 36], 0.4, { mat: OR })); ps.push(a.cilindro(sw, 0, 30, 3, 6, { mat: OR, r1: 7 }), a.cilindro(sw, 0, 34, 5.5, 3, { mat: OR, resta: true })); c = [sw, 0, 35]; }
      if (v === 'apagado') { ps.push(a.cilindro(...c, 7, 1.4, { mat: 'cel_ceniza' })); return ps; }
      fuego(a, ps, add(c, [0, 0, -1]), v === 'cuenco' ? 2.6 : 1.9, f, 8, { mat: 'cel_luz', lenguas: 4, chispas: 3, alto: 1.1 });
      const k = 0.5 + 0.5 * onda(f, 8);
      return { piezas: ps, resplandor: { c: add(c, [0, 0, 8]), r: 40 + k * 8, color: '#f4f0e0' } };
    },
  },
  {
    id: 'cel_cadena_dorada', nombre: ['Cadena dorada que ata las islas', 'Golden chain binding the islands'], tema: TEMA, variantes: ['tensa', 'floja', 'rota', 'doble', 'al_cielo'], cuadros: 8, t: 5, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], g = a.r() * 360;
      // argolla clavada en un bloque de mármol, de donde sale la cadena hacia otra isla (fuera de la imagen)
      ps.push(a.caja(0, 0, 0, 20, 20, 10, { mat: ML, giro: g }), a.caja(0, 0, 10, 16, 16, 3, { mat: OR, giro: g }));
      ps.push({ k: 'elip', c: [0, 0, 18], ex: [Math.cos(rad(g)), Math.sin(rad(g)), 0], ey: [0, 0, 1], ez: [-Math.sin(rad(g)), Math.cos(rad(g)), 0], r: [5.5, 5.5, 1.6], mat: OR } as Pieza, { k: 'elip', c: [0, 0, 18], ex: [Math.cos(rad(g)), Math.sin(rad(g)), 0], ey: [0, 0, 1], ez: [-Math.sin(rad(g)), Math.cos(rad(g)), 0], r: [3.4, 3.4, 3], mat: OR, resta: true } as Pieza);
      const d: V3 = [Math.cos(rad(g + 90)), Math.sin(rad(g + 90)), 0], sw = onda(f, 8) * 1.5;
      const tiros = v === 'doble' ? [-4, 4] : [0];
      for (const off of tiros) {
        const p0: V3 = add([0, 0, 18], d, off * 0.2);
        let pts: V3[];
        if (v === 'rota') pts = [p0, add(add(p0, d, 26), [0, 0, 18]), add(add(p0, d, 40), [sw, 0, 22]), add(add(p0, d, 46), [sw * 2, 0, 12])];
        else if (v === 'floja') pts = catenaria(p0, add(add(p0, d, 70), [0, 0, 60]), 18 + sw, 10);
        else if (v === 'al_cielo') pts = catenaria(p0, add(p0, [sw, 0, 150]), 0.5, 8);
        else pts = catenaria(p0, add(add(add(p0, d, 72), [0, 0, 70]), cruz(d, [0, 0, 1]), off * 2), 3 + sw * 0.5, 10);
        // eslabones gruesos con el ojo hueco
        const largos = [0]; for (let i = 1; i < pts.length; i++) largos.push(largos[i - 1] + len(sub(pts[i], pts[i - 1])));
        const total = largos[largos.length - 1], nE = Math.floor(total / 6.5);
        let j = 0;
        for (let i = 0; i < nE; i++) {
          const s = (i + 0.5) * (total / nE); while (j < pts.length - 2 && largos[j + 1] < s) j++;
          const t = (s - largos[j]) / Math.max(1e-6, largos[j + 1] - largos[j]), c = mez(pts[j], pts[j + 1], t), dd = nor(sub(pts[j + 1], pts[j])), l = lat(dd), w = i % 2 ? l : cruz(dd, l), Lk = total / nE;
          ps.push({ k: 'elip', c, ex: dd, ey: w, ez: cruz(dd, w), r: [Lk * 0.68, Lk * 0.42 + 0.6, 1.5], mat: OR, tono: jit(a, 0.05) } as Pieza, { k: 'elip', c, ex: dd, ey: w, ez: cruz(dd, w), r: [Lk * 0.42, Lk * 0.17, 2.4], mat: OR, resta: true } as Pieza);
        }
      }
      if (v === 'rota') for (let i = 0; i < 3; i++) ps.push(a.elipsoide(...add(d, [jit(a, 14), jit(a, 14), 1]), 3, 2, 1.2, { mat: OR, giro: a.r() * 180 }));
      return ps;
    },
  },
  {
    id: 'cel_halo_roto', nombre: ['Halo roto', 'Broken halo'], tema: TEMA, variantes: ['uno', 'partido', 'monton', 'clavado', 'que_brilla'], cuadros: 8, t: 4, huella: [2, 2], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const halo = (c: V3, R: number, m: [V3, V3, V3], desde = 0, hasta = 1, mat = OR) => {
        const n = 18;
        for (let i = Math.floor(desde * n); i < Math.ceil(hasta * n); i++) { const an = (i / n) * TAU, an2 = ((i + 1) / n) * TAU, p: V3 = [Math.cos(an) * R, Math.sin(an) * R, 0], q: V3 = [Math.cos(an2) * R, Math.sin(an2) * R, 0]; ps.push(...transformar([a.palo(p, q, R * 0.07 + 0.4, { mat })], m, c)); }
      };
      const nh = v === 'monton' ? 4 : 1;
      for (let i = 0; i < nh; i++) {
        const R = 12 + a.r() * 6, gm = rotM(a.r() * 360, jit(a, 10), jit(a, 10));
        if (v === 'clavado') halo([0, 0, R * 0.7], R, rotM(a.r() * 360, 0, 70 + jit(a, 10)), 0, 0.82);
        else if (v === 'partido') { halo([0, 0, 1], R, gm, 0, 0.45); halo([6, 4, 1], R, rotM(a.r() * 360, 4, 6), 0.55, 0.95); }
        else halo([jit(a, 10 * (nh > 1 ? 1 : 0)), jit(a, 10 * (nh > 1 ? 1 : 0)), 1 + i * 1.2], R, gm, 0, a.r() < 0.5 ? 1 : 0.8, v === 'que_brilla' ? 'cel_luz_oro' : OR);
      }
      // púas de luz que todavía salen del halo (rayos) en el que brilla
      if (v === 'que_brilla') { const k = 0.5 + 0.5 * onda(f, 8); for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; ps.push(a.palo([Math.cos(an) * 12, Math.sin(an) * 12, 1.4], [Math.cos(an) * (16 + k * 3), Math.sin(an) * (16 + k * 3), 1.4], 0.5, { mat: 'cel_luz_oro', r1: 0.1 })); } return { piezas: ps, resplandor: { c: [0, 0, 3], r: 22 + k * 5, color: '#f0d080' } }; }
      return ps;
    },
  },
  {
    id: 'cel_ala_piedra', nombre: ['Ala de piedra caída', 'Fallen stone wing'], tema: TEMA, variantes: ['entera', 'rota', 'par', 'clavada'], huella: [4, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ala = (rota: boolean): Pieza[] => {
        // ala de ángel: el hueso del brazo y tres filas de plumas que se alargan hacia la punta
        const loc: Pieza[] = [], cs: Comp[] = [hueso([0, 0, 0], [16, 0, 8], 4, 3), hueso([16, 0, 8], [40, 0, 4], 3, 2)];
        loc.push(masa(cs, { mat: MA, suave: 2 }));
        for (let fila = 0; fila < 3; fila++) for (let k = 0; k < 9; k++) {
          if (rota && k > 5 && a.r() < 0.6) continue;
          const t = k / 8, base: V3 = [t * 40, 0, 6 - t * 2 - fila * 3.5], L = (10 + fila * 9) * (0.6 + t * 0.7), an = rad(-60 - t * 40 - fila * 5);
          const tip = add(base, [Math.cos(an) * L * 0.35, jit(a, 1), Math.sin(an) * L]);
          loc.push({ k: 'elip', c: mez(base, tip, 0.5), ex: nor(sub(tip, base)), ey: [0, 1, 0], ez: nor(cruz(nor(sub(tip, base)), [0, 1, 0])), r: [L * 0.55, 1.4, 3.2 - fila * 0.4], mat: MA, tono: -fila * 0.04 + jit(a, 0.03) } as Pieza);
        }
        if (rota) for (let i = 0; i < 4; i++) vetaOro(a, loc, [10 + a.r() * 26, 1.6, -4 - a.r() * 10], [0, 1, 0], 8);
        return loc;
      };
      const ps: Pieza[] = [];
      if (v === 'clavada') ps.push(...transformar(ala(false), rotM(a.r() * 360, 0, -70), [0, 0, 38]));
      else if (v === 'par') { ps.push(...transformar(ala(false), rotM(30, 85, 0), [0, -6, 5])); ps.push(...transformar(ala(true), rotM(150, -85, 0), [6, 8, 5])); }
      else ps.push(...transformar(ala(v === 'rota'), rotM(a.r() * 360, 88, jit(a, 6)), [-14, 0, 4]));
      for (let i = 0; i < 3; i++) ps.push(lasca(a, [jit(a, 22), jit(a, 22), 1], 2 + a.r() * 2));
      return ps;
    },
  },
  {
    id: 'cel_ojo_cielo', nombre: ['Ojo de oro en el cielo', 'Golden eye in the sky'], tema: TEMA, variantes: ['abierto', 'entornado', 'triple', 'llorando'], cuadros: 8, t: 4, huella: [2, 2], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const ojo = (c: V3, R: number, fase: number) => {
        // un ojo en forma de almendra: párpados de oro que se cierran de a ratos, el iris de luz que mira y la pupila
        // vertical; alrededor, rayos como de sol
        const cic = ciclo(f + fase, 8), parp = cic > 0.75 ? Math.sin(((cic - 0.75) / 0.25) * PI) : 0, abre = Math.max(0.06, (v === 'entornado' ? 0.45 : 1) * (1 - parp));
        const mira = Math.sin(ciclo(f, 8) * TAU + fase) * R * 0.25;
        const loc: Pieza[] = [], lid: Comp[] = [];
        loc.push(a.elipsoide(0, 0, 0, R * 0.45, R * 1.5, R * 0.95 * abre + 0.3, { mat: 'cel_luz' }));
        if (abre > 0.2) loc.push(a.elipsoide(R * 0.36, mira, 0, R * 0.14, R * 0.6, Math.min(R * 0.6, R * 0.95 * abre), { mat: 'cel_ojo' }), a.elipsoide(R * 0.46, mira, 0, R * 0.08, R * 0.13, Math.min(R * 0.45, R * 0.8 * abre), { mat: 'negro' }));
        for (const s of [1, -1]) {
          let prev: V3 | null = null;
          for (let k = 0; k <= 8; k++) { const t = -1 + k / 4, q: V3 = [R * 0.2 * (1 - t * t), t * R * 1.75, s * (1 - t * t) * R * (s > 0 ? 1.05 : 0.9) * abre]; if (prev) lid.push(hueso(prev, q, R * (s > 0 ? 0.3 : 0.24), R * (s > 0 ? 0.3 : 0.24), { mat: OR })); prev = q; }
        }
        loc.push(masa(lid, { mat: OR, suave: R * 0.15 }));
        for (let k = 0; k < 12; k++) { const an = (k / 12) * TAU; loc.push(a.palo([-R * 0.1, Math.cos(an) * R * 2.2, Math.sin(an) * R * 1.5], [-R * 0.1, Math.cos(an) * R * (2.7 + (k % 2) * 0.8), Math.sin(an) * R * (1.85 + (k % 2) * 0.55)], R * 0.07, { mat: OV, r1: 0.1 })); }
        ps.push(...transformar(loc, rotM(45), c));
      };
      if (v === 'triple') { ojo([0, 0, 120], 7, 0); ojo([-14, 14, 100], 5, 3); ojo([14, -14, 104], 5, 5.5); }
      else ojo([0, 0, 110], 9, 0);
      if (v === 'llorando') for (let i = 0; i < 4; i++) { const u = ciclo(f + i * 2, 8); ps.push(a.elipsoide(4, 4, 98 - u * 60, 0.7, 0.7, 1.6, { mat: 'cel_luz_oro', tono: -u * 0.3 })); }
      const k = 0.5 + 0.5 * onda(f, 8);
      return { piezas: ps, sinSombra: true, resplandor: { c: [0, 0, 110], r: 30 + k * 6, color: '#f0d080' } };
    },
  },
  {
    id: 'cel_nube_ceniza', nombre: ['Nube de ceniza dorada', 'Golden ash cloud'], tema: TEMA, variantes: ['chica', 'grande', 'banco', 'remolino'], cuadros: 8, t: 5, huella: [4, 4], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], ph = ciclo(f, 8) * TAU, R = v === 'chica' ? 18 : v === 'grande' ? 40 : 30, z = v === 'banco' ? 6 : 26;
      // masa de bultos que respira y se arrastra, con motas de ceniza dorada que brillan y caen
      const cs: Comp[] = [], nb = v === 'grande' ? 12 : 8;
      for (let i = 0; i < nb; i++) {
        const an = (i / nb) * TAU + jit(a, 0.4) + (v === 'remolino' ? ph * 0.5 : 0), d = R * (0.3 + a.r() * 0.6), rr = R * (0.3 + a.r() * 0.25) * (1 + 0.08 * Math.sin(ph + i));
        cs.push(bulto([Math.cos(an) * d + Math.sin(ph + i) * 2, Math.sin(an) * d * (v === 'banco' ? 1.6 : 1), z + jit(a, R * 0.15) + (v === 'remolino' ? i * 3 : 0)], [rr, rr * 0.9, rr * (v === 'banco' ? 0.35 : 0.6)], { mat: a.r() < 0.5 ? 'cel_nube' : 'cel_ceniza' }));
      }
      ps.push(masa(cs, { mat: 'cel_nube', suave: R * 0.2 }));
      for (let i = 0; i < 12; i++) { const u = ciclo(f + i * 0.7, 8), an = a.r() * TAU, d = a.r() * R; ps.push(a.esfera(Math.cos(an) * d, Math.sin(an) * d, z - R * 0.3 - u * 20, 0.5 + a.r() * 0.4, { mat: 'cel_luz_oro', tono: -0.3 - u * 0.3 })); }
      return { piezas: ps, sinSombra: true };
    },
  },
);

// ------------------------------------------------------------------ 4. el trono sediento, por partes
registrar(
  {
    id: 'cel_trono_escalones', nombre: ['Trono sediento: escalones', 'Thirsting throne: steps'], tema: TEMA, variantes: ['entero', 'rajado', 'con_craneos', 'con_estatuas'], cuadros: 8, t: 5, huella: [10, 10], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      // gradas en medio círculo que suben hacia el respaldo (atrás, en -x), con los cantos de oro
      for (let i = 0; i < 6; i++) {
        const r = 78 - i * 10, z = i * 6;
        ps.push(a.cilindro(-30, 0, z, r, 6, { mat: ML }), a.caja(-30 - r / 2 - 10, 0, z - 0.1, r + 20, r * 2 + 4, 6.2, { mat: ML, resta: true }));
        ps.push(a.cilindro(-30, 0, z + 5.2, r + 0.4, 1, { mat: OR }), a.caja(-30 - r / 2 - 10, 0, z + 5, r + 20, r * 2 + 6, 1.4, { mat: OR, resta: true }));
      }
      ps.push(a.caja(-36, 0, 0, 12, 120, 40, { mat: ML }));
      if (v === 'rajado') { for (let i = 0; i < 4; i++) ps.push(a.caja(-30 + 20 + i * 8, jit(a, 30), 0, 3, 30 + a.r() * 20, 40, { mat: ML, resta: true, giro: 60 + jit(a, 30) })); for (let i = 0; i < 3; i++) ps.push(a.caja(-30 + 30 + i * 8, jit(a, 20), 0.5, 2, 20, 0.4, { mat: 'cel_vacio', giro: 60 })); }
      // vetas de oro que bajan como si algo hubiera chorreado
      for (let i = 0; i < 6; i++) { const an = jit(a, 1.2), r = 30 + a.r() * 40; vetaOro(a, ps, [-30 + Math.cos(an) * r, Math.sin(an) * r, 36 - (r - 18) * 0.6], [0, 0, 1], 12); }
      if (v === 'con_craneos') for (let i = 0; i < 14; i++) { const an = jit(a, 1.3), k = Math.floor(a.r() * 5), r = 78 - k * 10 - 4; craneo(a, ps, [-30 + Math.cos(an) * r, Math.sin(an) * r, k * 6 + 8.2], 3, (an * 180) / PI + jit(a, 30), { mat: 'cel_hueso', mandibula: false, incl: jit(a, 20) }); }
      if (v === 'con_estatuas') for (const s of [-1, 1]) ps.push(...petrificado(a, s > 0 ? 'postrado' : 'rodillas', 180 + s * 20, [-30 + 62, s * 40, 6], 1));
      // luz que cae sobre las gradas
      const k = 0.5 + 0.5 * onda(f, 8);
      for (let i = 0; i < 6; i++) { const u = ciclo(f + i * 1.3, 8); ps.push(a.esfera(-20 + jit(a, 40), jit(a, 60), 60 - u * 50, 0.6, { mat: 'cel_luz_oro', tono: -u * 0.4 })); }
      return { piezas: ps, resplandor: { c: [-30, 0, 50], r: 70 + k * 6, color: '#f0d890' } };
    },
  },
  {
    id: 'cel_trono_respaldo', nombre: ['Trono sediento: respaldo', 'Thirsting throne: backrest'], tema: TEMA, variantes: ['entero', 'partido', 'con_halo', 'con_alas'], cuadros: 8, t: 5, huella: [6, 4], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], H = v === 'partido' ? 120 : 170;
      // el respaldo colosal: losa de mármol que se afina hacia arriba en ojiva, enmarcada en oro, con la grieta de vacío
      const perf = (z: number) => (z < H * 0.7 ? 34 : 34 * Math.sqrt(Math.max(0, 1 - ((z - H * 0.7) / (H * 0.3)) ** 2)));
      const pts: V3[] = [];
      for (let i = 0; i <= 10; i++) { const z = (i / 10) * H; for (const s of [-1, 1]) { const w = Math.max(1, perf(z)); pts.push([-6, s * w, z], [6, s * w, z]); } }
      ps.push(a.poliedro(pts, { mat: ML }));
      for (const s of [-1, 1]) { let prev: V3 = [6.5, s * 34, 0]; for (let i = 1; i <= 10; i++) { const z = (i / 10) * H, q: V3 = [6.5, s * Math.max(1, perf(z)), z]; ps.push(a.palo(prev, q, 2.4, { mat: OR })); prev = q; } }
      if (v === 'partido') { for (let i = 0; i < 4; i++) ps.push(lasca(a, [10 + jit(a, 14), jit(a, 30), 3], 5 + a.r() * 5)); ps.push(a.caja(0, 18, H - 30, 20, 40, 40, { mat: ML, resta: true, giro: 30 })); }
      // la grieta del vacío que lo parte: tramos de negro emisivo que laten
      const k = 0.5 + 0.5 * onda(f, 8);
      let p: V3 = [6.6, jit(a, 6), H * 0.85];
      for (let i = 0; i < 6; i++) { const q: V3 = [6.6, p[1] + jit(a, 7), p[2] - H * 0.12]; ps.push({ k: 'elip', c: mez(p, q, 0.5), ex: nor(sub(q, p)), ey: [1, 0, 0], ez: cruz(nor(sub(q, p)), [1, 0, 0]), r: [len(sub(q, p)) * 0.6, 1, 1.6 + k * 0.6], mat: 'cel_vacio' } as Pieza); p = q; }
      // relieves: un sol de oro arriba y figuras que suplican talladas abajo
      ps.push(a.cilindro(6, 0, H * 0.72, 12, 1.4, { mat: OR, eje: [1, 0, 0] }));
      for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU; ps.push(a.palo([7, Math.cos(an) * 12, H * 0.72 + Math.sin(an) * 12], [7, Math.cos(an) * 19, H * 0.72 + Math.sin(an) * 19], 0.9, { mat: OR, r1: 0.2 })); }
      for (const s of [-1, 1]) ps.push(...transformar(figura(POSES.rodillas, MA, 0.55), rotM(0, 0, -90), [8, s * 18, 20]));
      if (v === 'con_halo') { const n = 22; for (let i = 0; i < n; i++) { if (i % 7 === 3) continue; const an = (i / n) * TAU, an2 = ((i + 1) / n) * TAU; ps.push(a.palo([-2, Math.cos(an) * 46, H + 6 + Math.sin(an) * 46], [-2, Math.cos(an2) * 46, H + 6 + Math.sin(an2) * 46], 2.2, { mat: 'cel_luz_oro', tono: -0.15 + k * 0.2 })); } }
      if (v === 'con_alas') for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const t = i / 6, base: V3 = [-4, s * 34, H * 0.55 + t * 30], tip = add(base, [-6, s * (30 + t * 18), 20 - t * 46]); ps.push({ k: 'elip', c: mez(base, tip, 0.5), ex: nor(sub(tip, base)), ey: [1, 0, 0], ez: nor(cruz(nor(sub(tip, base)), [1, 0, 0])), r: [len(sub(tip, base)) * 0.55, 1.6, 4], mat: MA, tono: -t * 0.05 } as Pieza); }
      return { piezas: ps, resplandor: { c: [10, 0, H * 0.7], r: 40 + k * 8, color: '#f0d890' } };
    },
  },
  {
    id: 'cel_trono_copa', nombre: ['Trono sediento: la copa vacía', 'Thirsting throne: the empty chalice'], tema: TEMA, variantes: ['entera', 'rajada', 'volcada', 'con_ceniza'], cuadros: 8, t: 5, huella: [5, 5], bloquea: true,
    armar: (v, f, a) => {
      const loc: Pieza[] = [];
      // pie, nudo y una copa enorme de oro labrado, seca por dentro
      const cs: Comp[] = [
        bulto([0, 0, 2], [22, 22, 4], { mat: OR }), hueso([0, 0, 4], [0, 0, 30], 9, 5, { mat: OR }), bulto([0, 0, 30], [9, 9, 6], { mat: OR }),
        hueso([0, 0, 33], [0, 0, 44], 6, 14, { mat: OR }), hueso([0, 0, 44], [0, 0, 64], 24, 30, { mat: OR }),
      ];
      loc.push(masa(cs, { mat: OR, suave: 3 }));
      loc.push(a.cilindro(0, 0, 70, 40, 30, { mat: OR, resta: true }), a.cilindro(0, 0, 44, 26, 30, { mat: OR, resta: true, r1: 30 }));
      loc.push(a.cilindro(0, 0, 66.5, 31.5, 2.4, { mat: OR, r1: 31 }), a.cilindro(0, 0, 60, 28.5, 12, { mat: OR, resta: true }));
      // relieve: anillo de cráneos alrededor del cuenco y gemas apagadas
      for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU; craneo(a, loc, [Math.cos(an) * 27, Math.sin(an) * 27, 54], 2.8, (an * 180) / PI, { mat: OV, mandibula: false }); }
      for (let i = 0; i < 6; i++) { const an = (i / 6) * TAU + 0.3; loc.push(a.esfera(Math.cos(an) * 8.6, Math.sin(an) * 8.6, 30, 1.6, { mat: 'marmol_negro' })); }
      if (v === 'con_ceniza' || v === 'entera') loc.push(a.cilindro(0, 0, 46, 24, 2, { mat: 'cel_ceniza', r1: 25 }));
      if (v === 'rajada') { loc.push(a.caja(26, 6, 40, 14, 4, 40, { mat: OR, resta: true, giro: 25 })); for (let i = 0; i < 3; i++) loc.push(lasca(a, [34 + jit(a, 6), jit(a, 12), 2], 3, OR)); }
      let ps: Pieza[] = v === 'volcada' ? transformar(loc, rotM(a.r() * 360, 0, 74), [-30, 0, 30]) : loc;
      if (v === 'volcada') { for (let i = 0; i < 10; i++) craneo(a, ps, [20 + a.r() * 26, jit(a, 20), 2.5], 3, a.r() * 360, { mat: 'cel_hueso', mandibula: false, incl: jit(a, 30) }); }
      // la sed: polvo de oro que sube del fondo y se pierde, sin llenarla nunca
      for (let i = 0; i < 8; i++) { const u = ciclo(f + i, 8), an = (i / 8) * TAU; ps.push(a.esfera(Math.cos(an) * 14 * (1 - u * 0.5), Math.sin(an) * 14 * (1 - u * 0.5), (v === 'volcada' ? 10 : 50) + u * 40, 0.7 * (1 - u * 0.6), { mat: 'cel_luz_oro', tono: -u * 0.4 })); }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ 5. restos del cielo
registrar(
  {
    id: 'cel_rayo_luz', nombre: ['Columna de luz que cae', 'Falling pillar of light'], tema: TEMA, variantes: ['fino', 'ancho', 'con_polvo'], cuadros: 8, t: 3, huella: [2, 2], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], r = v === 'ancho' ? 9 : 5, k = 0.5 + 0.5 * onda(f, 8);
      ps.push(a.cilindro(0, 0, 0, r * (0.9 + k * 0.15), 150, { mat: 'cel_luz', r1: r * 1.4, tono: -0.25 + k * 0.1 }));
      ps.push(a.cilindro(0, 0, 0, r * 0.45, 150, { mat: 'cel_luz', r1: r * 0.6, tono: 0.2 }));
      ps.push(a.cilindro(0, 0, 0, r * 2.2, 0.5, { mat: 'cel_luz_oro', tono: -0.2 + k * 0.1 }));
      for (let i = 0; i < (v === 'con_polvo' ? 14 : 6); i++) { const u = ciclo(f + i * 0.6, 8), an = a.r() * TAU, d = r * (1.2 + a.r()); ps.push(a.esfera(Math.cos(an + u) * d, Math.sin(an + u) * d, u * 60 + a.r() * 20, 0.6, { mat: 'cel_luz_oro', tono: -u * 0.3 })); }
      return { piezas: ps, sinSombra: true, resplandor: { c: [0, 0, 10], r: 26 + r + k * 6, color: '#fff4dc' } };
    },
  },
  {
    id: 'cel_esfera_armilar', nombre: ['Esfera armilar de oro', 'Golden armillary sphere'], tema: TEMA, variantes: ['sobre_pie', 'flotante', 'rota'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], R = 14, c: V3 = [0, 0, v === 'flotante' ? 46 + onda(f, 8) * 2 : 34], g = ciclo(f, 8) * 45;
      if (v !== 'flotante') ps.push(a.cilindro(0, 0, 0, 8, 3, { mat: ML }), a.cilindro(0, 0, 3, 2.2, c[2] - R - 3, { mat: OR, r1: 1.6 }));
      const aro = (m: [V3, V3, V3], rr: number, hasta = 1) => { const n = 20; for (let i = 0; i < n * hasta; i++) { const an = (i / n) * TAU, an2 = ((i + 1) / n) * TAU; ps.push(...transformar([a.palo([Math.cos(an) * rr, Math.sin(an) * rr, 0], [Math.cos(an2) * rr, Math.sin(an2) * rr, 0], 0.7, { mat: OR })], m, c)); } };
      aro(rotM(g, 90, 0), R); aro(rotM(g + 90, 90, 0), R, v === 'rota' ? 0.6 : 1); aro(rotM(0, 23, 0), R * 0.9); aro(rotM(-g * 2, 66, 20), R * 0.75);
      ps.push(a.esfera(...c, 3.4, { mat: 'cel_luz_oro' }));
      return { piezas: ps, sinSombra: v === 'flotante', resplandor: { c, r: 22, color: '#f0d080' } };
    },
  },
  {
    id: 'cel_candelabro_oro', nombre: ['Candelabro de oro', 'Golden candelabrum'], tema: TEMA, variantes: ['siete', 'tres', 'caido'], cuadros: 8, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'tres' ? 3 : 7, k = 0.5 + 0.5 * onda(f, 8);
      const loc: Pieza[] = [a.cilindro(0, 0, 0, 8, 2, { mat: OR, r1: 5 }), a.cilindro(0, 0, 2, 1.8, 40, { mat: OR, r1: 1.4 })];
      for (let i = 0; i < n; i++) {
        const o = i - (n - 1) / 2, y = o * 6, h = 40 + (n - 1) * 2 - Math.abs(o) * 4;
        if (o !== 0) { const cs: Comp[] = [hueso([0, 0, 22], [0, y * 0.6, 24 + Math.abs(o) * 0.5], 0.9, 0.9, { mat: OR }), hueso([0, y * 0.6, 24 + Math.abs(o) * 0.5], [0, y, h - 3], 0.9, 0.8, { mat: OR })]; loc.push(masa(cs, { mat: OR, suave: 0.6 })); }
        loc.push(a.cilindro(0, y, h - 3, 1.6, 2, { mat: OR, r1: 2.2 }), a.cilindro(0, y, h - 1, 0.9, 2.5, { mat: 'cera' }));
        if (v !== 'caido') loc.push(a.elipsoide(0, y, h + 2.4, 0.8, 0.8, 1.6 + k * 0.5 + 0.3 * onda(f, 8, i), { mat: 'cel_luz' }));
      }
      if (v === 'caido') ps.push(...transformar(loc, rotM(a.r() * 360, 86, 0), [0, 0, 2]));
      else ps.push(...mover(loc, 45 + jit(a, 20)));
      return v === 'caido' ? ps : { piezas: ps, resplandor: { c: [0, 0, 46], r: 34 + k * 5, color: '#f4f0e0' } };
    },
  },
  {
    id: 'cel_estandarte', nombre: ['Estandarte dorado raído', 'Tattered golden banner'], tema: TEMA, variantes: ['alto', 'caido', 'doble'], cuadros: 8, t: 4, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const asta = (x: number, y: number, incl: number) => {
        ps.push(a.cilindro(x, y, 0, 1.2, 84, { mat: OR, incl, r1: 1 }), a.caja(x, y, 0, 8, 8, 3, { mat: ML }));
        const top: V3 = [x, y - Math.sin(rad(incl)) * 80, Math.cos(rad(incl)) * 80];
        ps.push(a.palo(add(top, [0, -1, 0]), add(top, [0, 16, 0]), 0.8, { mat: OR }), a.esfera(...add(top, [0, 0, 5]), 2.4, { mat: OR }));
        tela(a, ps, { p0: add(top, [0, 0, -1]), u: [0, 1, 0], ancho: 15, alto: 44, f, n: 8, mat: 'cu_tela_blanca', jirones: 0.55, nu: 4, nv: 7, amp: 2.4, viento: 0.5, punta: true, dibujo: (u, w) => (Math.abs(u - 0.5) < 0.16 && w > 0.2 && w < 0.5 ? 'cel_oro' : w < 0.1 ? 'cel_oro_viejo' : undefined) });
      };
      if (v === 'doble') { asta(0, -10, 0); asta(0, 10, 0); }
      else if (v === 'caido') { asta(0, 0, 38); for (let i = 0; i < 2; i++) ps.push(lasca(a, [jit(a, 10), jit(a, 10), 1], 2)); }
      else asta(0, 0, jit(a, 4));
      return ps;
    },
  },
  {
    id: 'cel_grieta_vacio', nombre: ['Grieta al vacío', 'Crack into the void'], tema: TEMA, variantes: ['chica', 'larga', 'en_cruz', 'con_luz'], cuadros: 8, t: 4, huella: [4, 2], bloquea: false, plano: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], k = 0.5 + 0.5 * onda(f, 8);
      const raja = (p0: V3, d0: V3, L: number, w: number) => {
        let p = p0, d = nor(d0);
        for (let i = 0; i < 7; i++) {
          d = nor(add(d, [jit(a, 0.5), jit(a, 0.5), 0])); const q = add(p, d, L / 7), ww = w * (1 - Math.abs(i - 3) / 5);
          ps.push({ k: 'elip', c: mez(p, q, 0.5), ex: d, ey: [-d[1], d[0], 0], ez: [0, 0, 1], r: [L / 12, ww + 1.2, 0.5], mat: ML, tono: -0.1 } as Pieza);
          ps.push({ k: 'elip', c: add(mez(p, q, 0.5), [0, 0, 0.1]), ex: d, ey: [-d[1], d[0], 0], ez: [0, 0, 1], r: [L / 12, ww, 0.5], mat: 'cel_vacio' } as Pieza);
          if (v === 'con_luz' && i % 2) ps.push(a.esfera(...add(mez(p, q, 0.5), [0, 0, 1 + ciclo(f + i, 8) * 14]), 0.5, { mat: 'cel_luz_oro', tono: -ciclo(f + i, 8) * 0.4 }));
          p = q;
        }
      };
      const L = v === 'chica' ? 30 : 64;
      raja([-L / 2, jit(a, 4), 0.2], [1, jit(a, 0.3), 0], L, v === 'chica' ? 2 : 3.2);
      if (v === 'en_cruz') raja([jit(a, 4), -22, 0.2], [jit(a, 0.3), 1, 0], 44, 2.4);
      // piedritas que caen hacia adentro, y los bordes levantados
      for (let i = 0; i < 4; i++) ps.push(lasca(a, [jit(a, L / 2), jit(a, 8), 0.8], 1.6));
      return v === 'con_luz' ? { piezas: ps, resplandor: { c: [0, 0, 2], r: 20 + k * 4, color: '#f0d080' } } : ps;
    },
  },
  {
    id: 'cel_arbol_oro', nombre: ['Árbol de oro muerto', 'Dead golden tree'], tema: TEMA, variantes: ['alto', 'torcido', 'con_frutos', 'caido'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const cs: Comp[] = [], ps: Pieza[] = [];
      const rama = (p: V3, d: V3, L: number, r: number, k: number) => {
        const q = add(p, nor(d), L); cs.push(hueso(p, q, r, r * 0.7, { mat: OV }));
        if (k > 0) for (const s of [-1, 1]) rama(q, add(nor(d), [s * 0.55 + jit(a, 0.35), jit(a, 0.6), v === 'torcido' ? -0.1 : 0.25]), L * 0.72, r * 0.66, k - 1);
        else if (v === 'con_frutos' && a.r() < 0.5) ps.push(a.esfera(q[0], q[1], q[2] - 2, 1.6, { mat: 'cel_luz_oro', tono: -0.2 }));
      };
      for (let i = 0; i < 5; i++) { const an = (i / 5) * TAU; cs.push(hueso([0, 0, 4], [Math.cos(an) * 16, Math.sin(an) * 16, -1], 3, 1, { mat: OV })); }
      rama([0, 0, 0], [jit(a, 0.2), jit(a, 0.2), 1], v === 'alto' ? 42 : 30, 4.6, 4);
      let out = [masa(cs, { mat: OV, suave: 1.6 }), ...ps];
      if (v === 'caido') out = transformar(out, rotM(a.r() * 360, 80, 0), [0, 0, 4]);
      out.push(a.caja(0, 0, 0, 30, 30, 1, { mat: ML, giro: 45 }));
      return out;
    },
  },
  {
    id: 'cel_escombros_marmol', nombre: ['Escombros de mármol', 'Marble rubble'], tema: TEMA, variantes: ['pocos', 'monton', 'con_capitel', 'con_oro'], huella: [3, 3], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], n = v === 'monton' ? 14 : 7;
      for (let i = 0; i < n; i++) ps.push(lasca(a, [jit(a, 20), jit(a, 20), v === 'monton' ? a.r() * 6 : 1], 2.5 + a.r() * 5));
      if (v === 'con_capitel') { ps.push(a.cilindro(0, 0, 0, 7, 4, { mat: OR, r1: 9 }), a.caja(0, 0, 4, 18, 18, 3, { mat: ML, giro: 30, incl: 8 })); ps.push(a.cilindro(-14, 6, 4.5, 4.5, 16, { mat: MA, eje: [1, 0.4, 0] })); }
      if (v === 'con_oro') for (let i = 0; i < 10; i++) ps.push(a.cilindro(jit(a, 14), jit(a, 14), 0.4, 1.3, 0.5, { mat: OR, incl: jit(a, 25) }));
      return ps;
    },
  },
  {
    id: 'cel_anfora_oro', nombre: ['Ánforas de oro', 'Golden amphorae'], tema: TEMA, variantes: ['una', 'tres', 'volcada', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const anfora = (c: V3, m: [V3, V3, V3], rota = false) => {
        const cs: Comp[] = [hueso([0, 0, 1], [0, 0, 4], 1.4, 4.5, { mat: OR }), bulto([0, 0, 9], [6, 6, 7], { mat: OR }), hueso([0, 0, 14], [0, 0, 20], 3, 2, { mat: OR }), bulto([0, 0, 20.5], [2.8, 2.8, 1], { mat: OR })];
        for (const s of [-1, 1]) cs.push(hueso([0, s * 2.2, 19], [0, s * 5.5, 17], 0.6, 0.6, { mat: OR }), hueso([0, s * 5.5, 17], [0, s * 4.5, 13], 0.6, 0.6, { mat: OR }));
        const loc: Pieza[] = [masa(cs, { mat: OR, suave: 1.2 }), a.cilindro(0, 0, 18, 1.6, 4, { mat: OR, resta: true })];
        if (rota) loc.push(a.elipsoide(4, 2, 12, 3, 4, 4, { mat: OR, resta: true }));
        ps.push(...transformar(loc, m, c));
      };
      if (v === 'tres') { anfora([-5, -5, 0], ID3); anfora([6, 2, 0], rotM(40)); anfora([-3, 10, 4.6], rotM(20, 88, 0)); }
      else if (v === 'volcada') { anfora([0, 0, 5.8], rotM(a.r() * 360, 0, 90)); for (let i = 0; i < 6; i++) ps.push(a.elipsoide(14 + jit(a, 8), jit(a, 6), 0.3, 2.4, 1.6, 0.5, { mat: 'cel_ceniza', giro: a.r() * 180 })); }
      else anfora([0, 0, 0], rotM(a.r() * 360), v === 'rota');
      return ps;
    },
  },
  {
    id: 'cel_angel_caido', nombre: ['Ángel caído hecho piedra', 'Petrified fallen angel'], tema: TEMA, variantes: ['boca_abajo', 'de_espaldas', 'sentado', 'sin_alas'], huella: [5, 4], bloquea: true,
    armar: (v, _f, a) => {
      const pose = v === 'sentado' ? 'sentado' : 'postrado', s = 1.15, loc: Pieza[] = [...figura(POSES[pose], PE, s)];
      if (v !== 'sin_alas') for (const sd of [-1, 1]) {
        // alas de piedra que se abren desde la espalda y caen al piso
        const base: V3 = esc(add(POSES[pose].pecho, [-3, sd * 4, 3]), s);
        for (let i = 0; i < 8; i++) { const t = i / 7, tip = add(base, [-10 - t * 26, sd * (14 + t * 22), v === 'sentado' ? 10 - t * 26 : -t * 8]); loc.push({ k: 'elip', c: mez(base, tip, 0.5), ex: nor(sub(tip, base)), ey: [0, 0, 1], ez: nor(cruz(nor(sub(tip, base)), [0, 0, 1])), r: [len(sub(tip, base)) * 0.55, 3.8 - t, 1.6], mat: PE, tono: -t * 0.05 } as Pieza); }
      }
      for (let i = 0; i < 4; i++) vetaOro(a, loc, esc(add(POSES[pose].pecho, [3, jit(a, 6), 4]), s), [0.4, jit(a, 1), 1], 8);
      const ps = transformar(loc, rotM(a.r() * 360, v === 'de_espaldas' ? 180 : 0, 0), [0, 0, v === 'de_espaldas' ? 14 : 0]);
      for (let i = 0; i < 4; i++) ps.push(lasca(a, [jit(a, 26), jit(a, 26), 1], 2, PE));
      return ps;
    },
  },
  {
    id: 'cel_estatua_angel', nombre: ['Estatua de ángel que mira arriba', 'Angel statue looking up'], tema: TEMA, variantes: ['entera', 'sin_cabeza', 'con_espada', 'llorando'], cuadros: 8, t: 4, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const loc: Pieza[] = [a.caja(0, 0, 0, 24, 24, 10, { mat: ML }), a.caja(0, 0, 10, 26, 26, 2, { mat: OR })];
      loc.push(...transformar(figura(v === 'con_espada' ? POSES.tendiendo : POSES.alzados, MA, 1.05, { sinCabeza: v === 'sin_cabeza' }), ID3, [0, 0, 12]));
      for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const t = i / 6, base: V3 = [-4, s * 5, 58], tip = add(base, [-8 - t * 6, s * (10 + t * 16), 26 - t * 40]); loc.push({ k: 'elip', c: mez(base, tip, 0.5), ex: nor(sub(tip, base)), ey: [1, 0, 0], ez: nor(cruz(nor(sub(tip, base)), [1, 0, 0])), r: [len(sub(tip, base)) * 0.55, 1.4, 3.6 - t], mat: MA } as Pieza); }
      if (v === 'con_espada') loc.push(a.palo([21, -6, 70], [32, -6, 108], 1, { mat: OR, r1: 0.3 }), a.palo([20, -11, 70], [22, -1, 70], 0.8, { mat: OR }));
      if (v === 'llorando') for (let i = 0; i < 3; i++) { const u = ciclo(f + i * 2.7, 8); loc.push(a.esfera(3.5, (i - 1) * 1.6, 66 - u * 52, 0.6, { mat: 'cel_luz_oro', tono: -u * 0.3 })); }
      for (let i = 0; i < 3; i++) vetaOro(a, loc, [5, jit(a, 4), 30 + a.r() * 20], [1, 0, 0], 9);
      return mover(loc, 45 + jit(a, 30));
    },
  },
  {
    id: 'cel_cabeza_coloso', nombre: ['Cabeza de coloso caída', 'Fallen colossus head'], tema: TEMA, variantes: ['de_lado', 'boca_arriba', 'partida', 'con_corona'], huella: [5, 5], bloquea: true,
    armar: (v, _f, a) => {
      // una cabeza de mármol del tamaño de una casa, con los ojos vacíos y la boca abierta en sed
      const R = 26, cs: Comp[] = [bulto([0, 0, 0], [R * 0.95, R * 0.8, R], { mat: MA }), bulto([R * 0.55, 0, -R * 0.45], [R * 0.45, R * 0.55, R * 0.45], { mat: MA }), hueso([R * 0.8, 0, R * 0.05], [R * 1.05, 0, -R * 0.3], R * 0.14, R * 0.18, { mat: MA })];
      for (const s of [-1, 1]) cs.push(bulto([R * 0.65, s * R * 0.38, R * 0.2], [R * 0.2, R * 0.22, R * 0.12], { mat: MA }), bulto([-R * 0.05, s * R * 0.8, -R * 0.05], [R * 0.12, R * 0.08, R * 0.25], { mat: MA }));
      const loc: Pieza[] = [masa(cs, { mat: MA, suave: R * 0.12 })];
      for (const s of [-1, 1]) loc.push(a.elipsoide(R * 0.8, s * R * 0.36, R * 0.02, R * 0.12, R * 0.17, R * 0.1, { mat: 'negro', resta: true }));
      loc.push(a.elipsoide(R * 0.92, 0, -R * 0.55, R * 0.15, R * 0.3, R * 0.16, { mat: 'negro', resta: true }));
      if (v === 'con_corona') for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU; loc.push(a.palo([Math.cos(an) * R * 0.7, Math.sin(an) * R * 0.6, R * 0.7], [Math.cos(an) * R * 0.85, Math.sin(an) * R * 0.75, R * 1.2], 2.4, { mat: OR, r1: 0.6 })); }
      if (v === 'partida') loc.push(a.caja(-R * 0.4, R * 0.3, -R, R, R * 0.6, R * 2.2, { mat: MA, resta: true, giro: 20 }));
      for (let i = 0; i < 3; i++) vetaOro(a, loc, [R * 0.7, jit(a, R * 0.4), R * 0.5], [1, 0, 0.5], 12);
      const ps = v === 'boca_arriba' ? transformar(loc, rotM(a.r() * 360, 0, -80), [0, 0, R * 0.78]) : transformar(loc, rotM(a.r() * 360, 80, 0), [0, 0, R * 0.78]);
      for (let i = 0; i < 5; i++) ps.push(lasca(a, [jit(a, R * 1.4), jit(a, R * 1.4), 1], 3 + a.r() * 3));
      return ps;
    },
  },
  {
    id: 'cel_mano_estatua', nombre: ['Mano de estatua colosal', 'Colossal statue hand'], tema: TEMA, variantes: ['abierta', 'que_pide', 'puno', 'con_halo'], huella: [4, 3], bloquea: true,
    armar: (v, _f, a) => {
      // una mano de mármol que asoma del piso pidiendo, con los dedos rotos
      const cs: Comp[] = [hueso([0, 0, -6], [0, 0, 16], 8, 7, { mat: MA }), bulto([0, 0, 22], [9, 4.5, 9], { mat: MA })];
      const dedos = v === 'puno' ? 0.2 : v === 'que_pide' ? 0.65 : 1;
      for (let i = 0; i < 4; i++) {
        const y = -5.4 + i * 3.6, b: V3 = [0.5, y, 30], k = (i === 0 || i === 3 ? 0.85 : 1) * 14;
        if (a.r() < 0.2 && v !== 'puno') { cs.push(hueso(b, add(b, [0, 0, k * 0.4]), 1.7, 1.6, { mat: MA })); continue; }
        const m1 = add(b, [(1 - dedos) * k * 0.4, 0, k * 0.5 * (0.4 + dedos * 0.6)]), tip = add(m1, [(1 - dedos) * k * 0.6 + 1, 0, k * 0.5 * dedos]);
        cs.push(hueso(b, m1, 1.9, 1.7, { mat: MA }), hueso(m1, tip, 1.7, 1.3, { mat: MA }));
      }
      cs.push(hueso([2, -7, 20], [7, -12, 28], 2.4, 1.8, { mat: MA }), hueso([7, -12, 28], [9, -12, 33], 1.8, 1.4, { mat: MA }));
      const loc: Pieza[] = [masa(cs, { mat: MA, suave: 1.6 })];
      for (let i = 0; i < 3; i++) vetaOro(a, loc, [7, jit(a, 3), 5 + a.r() * 15], [1, 0, 0], 8);
      if (v === 'con_halo') { const n = 16; for (let i = 0; i < n - 3; i++) { const an = (i / n) * TAU, an2 = ((i + 1) / n) * TAU; loc.push(a.palo([Math.cos(an) * 12, Math.sin(an) * 12, 50], [Math.cos(an2) * 12, Math.sin(an2) * 12, 50], 1.1, { mat: OR })); } }
      const ps = mover(loc, 45 + jit(a, 40), [0, 0, 0], jit(a, 8), jit(a, 8));
      for (let i = 0; i < 5; i++) ps.push(lasca(a, [jit(a, 16), jit(a, 16), 1], 2 + a.r() * 2.5));
      return ps;
    },
  },
  {
    id: 'cel_corona_caida', nombre: ['Corona colosal caída', 'Fallen colossal crown'], tema: TEMA, variantes: ['de_canto', 'tumbada', 'rota'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [], R = 22, n = 9;
      loc.push(a.cilindro(0, 0, 0, R, 10, { mat: OR }), a.cilindro(0, 0, -1, R - 2.4, 13, { mat: OR, resta: true }));
      for (let i = 0; i < n; i++) { if (v === 'rota' && i > 5) continue; const an = (i / n) * TAU; loc.push(a.poliedro([[Math.cos(an - 0.22) * R, Math.sin(an - 0.22) * R, 9], [Math.cos(an + 0.22) * R, Math.sin(an + 0.22) * R, 9], [Math.cos(an - 0.22) * (R - 2.2), Math.sin(an - 0.22) * (R - 2.2), 9], [Math.cos(an + 0.22) * (R - 2.2), Math.sin(an + 0.22) * (R - 2.2), 9], [Math.cos(an) * (R - 1), Math.sin(an) * (R - 1), 26]], { mat: OR })); loc.push(a.esfera(Math.cos(an) * (R + 0.4), Math.sin(an) * (R + 0.4), 5, 1.8, { mat: i % 2 ? 'marmol_negro' : 'cel_luz_oro' })); }
      const ps = v === 'de_canto' ? transformar(loc, rotM(a.r() * 360, 0, 75), [0, 0, R * 0.95]) : transformar(loc, rotM(a.r() * 360, jit(a, 8), jit(a, 8)), [0, 0, 0]);
      for (let i = 0; i < 4; i++) ps.push(lasca(a, [jit(a, 30), jit(a, 30), 1], 2));
      return ps;
    },
  },
  {
    id: 'cel_puerta_cielo', nombre: ['Puerta del cielo', 'Gate of heaven'], tema: TEMA, variantes: ['cerrada', 'abierta', 'rota', 'al_vacio'], cuadros: 8, t: 5, huella: [5, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], k = 0.5 + 0.5 * onda(f, 8);
      for (const s of [-1, 1]) columna(a, ps, [0, s * 26, 0], 88, 5);
      ps.push(a.caja(0, 0, 96, 16, 66, 8, { mat: ML }), a.poliedro([[-8, -34, 104], [8, -34, 104], [-8, 34, 104], [8, 34, 104], [-8, 0, 124], [8, 0, 124]], { mat: MA }));
      ps.push(a.cilindro(8.5, 0, 110, 6, 1, { mat: OR, eje: [1, 0, 0] }));
      // las hojas de oro: cerradas, abiertas hacia adentro, rotas o mostrando el vacío
      for (const s of [-1, 1]) {
        const ab = v === 'abierta' ? 70 : v === 'rota' ? (s > 0 ? 85 : 8) : 0, hoja: Pieza[] = [a.caja(0, s * 10.5, 0, 2.4, 21, 84, { mat: OR })];
        for (let i = 0; i < 4; i++) hoja.push(a.caja(1.4, s * 10.5, 8 + i * 20, 0.8, 17, 14, { mat: OV }));
        if (v === 'rota' && s > 0) hoja.push(a.caja(0, s * 10, 40, 4, 12, 50, { mat: OR, resta: true, giro: 30 }));
        ps.push(...transformar(transformar(hoja, ID3, [0, -s * 21, 0]), rotM(-s * ab), [0, s * 21, 0]));
      }
      if (v === 'al_vacio' || v === 'abierta') ps.push(a.caja(-1.5, 0, 0, 1, 42, 86, { mat: v === 'al_vacio' ? 'cel_vacio' : 'cel_luz', tono: v === 'al_vacio' ? 0 : -0.25 + k * 0.1 }));
      return v === 'abierta' ? { piezas: ps, resplandor: { c: [10, 0, 40], r: 46 + k * 6, color: '#fff4dc' } } : ps;
    },
  },
  {
    id: 'cel_altar_sed', nombre: ['Altar de la sed', 'Altar of thirst'], tema: TEMA, variantes: ['vacio', 'con_cuenco', 'con_ofrendas', 'roto'], cuadros: 8, t: 4, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], k = 0.5 + 0.5 * onda(f, 8);
      ps.push(a.caja(0, 0, 0, 34, 22, 4, { mat: ML }), a.caja(0, 0, 4, 28, 16, 18, { mat: MA }), a.caja(0, 0, 22, 32, 20, 3, { mat: ML }), a.caja(14.2, 0, 8, 0.8, 12, 10, { mat: OR }));
      if (v === 'roto') { ps.push(a.caja(10, 6, 14, 16, 12, 20, { mat: MA, resta: true, giro: 30 })); for (let i = 0; i < 4; i++) ps.push(lasca(a, [18 + jit(a, 6), jit(a, 14), 1], 3)); }
      if (v === 'con_cuenco' || v === 'con_ofrendas') { ps.push(a.cilindro(0, 0, 25, 4, 3, { mat: OR, r1: 9 }), a.cilindro(0, 0, 27, 8, 3, { mat: OR, resta: true })); ps.push(a.cilindro(0, 0, 27.4, 7.6, 0.5, { mat: 'cel_ceniza' })); }
      if (v === 'con_ofrendas') { for (let i = 0; i < 3; i++) craneo(a, ps, [-9 + i * 9, 6, 27.5], 2.4, 30 + jit(a, 20), { mat: 'cel_hueso', mandibula: false }); for (let i = 0; i < 4; i++) ps.push(a.cilindro(jit(a, 12), -6 + jit(a, 2), 25, 0.8, 3 + a.r() * 3, { mat: 'cera' })); }
      for (let i = 0; i < 2; i++) vetaOro(a, ps, [14.2, jit(a, 8), 12], [1, 0, 0], 8);
      // una luz blanca muy débil sobre el cuenco vacío
      ps.push(a.esfera(0, 0, 34 + k * 2, 1 + k * 0.6, { mat: 'cel_luz', tono: -0.3 + k * 0.3 }));
      return { piezas: ps, resplandor: { c: [0, 0, 34], r: 20 + k * 4, color: '#f4f0e0' } };
    },
  },
  {
    id: 'cel_torre_ruina', nombre: ['Torre de mármol en ruinas', 'Ruined marble tower'], tema: TEMA, variantes: ['alta', 'partida', 'flotante'], cuadros: 8, t: 5, huella: [5, 5], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], H = v === 'partida' ? 90 : 160, z0 = v === 'flotante' ? 0 : 0;
      ps.push(a.cilindro(0, 0, z0, 26, 6, { mat: ML }), a.cilindro(0, 0, z0 + 6, 20, H, { mat: ML, r1: 16 }));
      for (let i = 0; i < 5; i++) { const z = 20 + i * 30; if (z > H - 10) break; ps.push(a.caja(18 - z * 0.025, 0, z0 + z, 6, 6, 14, { mat: 'negro', resta: true, giro: i * 60 + 30 })); ps.push(a.cilindro(0, 0, z0 + z - 3, 21 - z * 0.025, 2, { mat: OR, r1: 20.5 - z * 0.025 })); }
      if (v === 'partida') for (let i = 0; i < 5; i++) ps.push(pena(a, jit(a, 10), jit(a, 10), z0 + H + 2, 8, 7, 4 + a.r() * 8, { mat: MA }));
      else { ps.push(a.cilindro(0, 0, z0 + H + 6, 18, 4, { mat: OR }), a.cilindro(0, 0, z0 + H + 10, 15, 36, { mat: OR, r1: 1 })); }
      // los bloques que se soltaron y flotan alrededor girando
      for (let i = 0; i < 5; i++) { const ph = ciclo(f, 8) * TAU * 0.25 + i * 1.25, r = 32 + i * 3; ps.push(...transformar([a.caja(0, 0, 0, 10, 6, 5, { mat: ML })], rotM((ph * 180) / PI * 2, jit(a, 20), jit(a, 20)), [Math.cos(ph) * r, Math.sin(ph) * r, z0 + 40 + i * 20 + Math.sin(ph * 3) * 3])); }
      if (v === 'flotante') { const cs: Comp[] = []; for (let i = 0; i < 4; i++) cs.push(bulto([jit(a, 4), jit(a, 4), -8 - i * 14], [24 - i * 5, 22 - i * 5, 10], { mat: RO })); ps.push(masa(cs, { mat: RO, suave: 5 })); }
      return { piezas: ps, sinSombra: v === 'flotante' };
    },
  },
);

// ------------------------------------------------------------------ 6. piezas sueltas para armar el cielo roto
registrar(
  {
    id: 'cel_isla_roca', nombre: ['Isla de roca desnuda', 'Bare floating rock'], tema: TEMA, variantes: ['chica', 'mediana', 'con_raices', 'con_cadena'], cuadros: 8, t: 5, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], r = v === 'chica' ? 14 : 24, dz = onda(f, 8, a.r() * 3) * 1.5;
      isla(a, ps, r, f, 8, { hondo: r * 1.8 });
      ps.push(...roca(a, [jit(a, 4), jit(a, 4), 1], [r * 0.5, r * 0.4, r * 0.3], { mat: RO, facetas: 2 }));
      if (v === 'con_raices') for (let i = 0; i < 3; i++) { const cs: Comp[] = []; let p: V3 = [jit(a, r * 0.6), jit(a, r * 0.6), 0]; for (let k = 0; k < 5; k++) { const q = add(p, [jit(a, 4), jit(a, 4), 5]); cs.push(hueso(p, q, 1.6 - k * 0.25, 1.3 - k * 0.25, { mat: OV })); p = q; } ps.push(masa(cs, { mat: OV, suave: 0.6 })); }
      if (v === 'con_cadena') { const pts = catenaria([0, 0, 2], [60, 30, 70], 6, 8); cadena(a, ps, pts, 5, 1.1, OR); }
      return { piezas: transformar(ps, ID3, [0, 0, dz]), sinSombra: true };
    },
  },
  {
    id: 'cel_pedestal_vacio', nombre: ['Pedestal vacío', 'Empty pedestal'], tema: TEMA, variantes: ['cuadrado', 'redondo', 'con_pies', 'roto'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'redondo') ps.push(a.cilindro(0, 0, 0, 10, 3, { mat: ML }), a.cilindro(0, 0, 3, 7.5, 20, { mat: MA }), a.cilindro(0, 0, 23, 10, 3, { mat: OR }));
      else ps.push(a.caja(0, 0, 0, 20, 20, 3, { mat: ML }), a.caja(0, 0, 3, 15, 15, 20, { mat: MA }), a.caja(0, 0, 23, 19, 19, 3, { mat: OR }));
      // de la estatua solo quedan los pies, cortados en los tobillos
      if (v === 'con_pies') for (const s of [-1, 1]) ps.push(masa([bulto([1.5, s * 3.5, 27.4], [4, 1.8, 1.4], { mat: MA }), hueso([-0.5, s * 3.5, 27], [-0.5, s * 3.5, 33], 1.8, 1.6, { mat: MA })], { mat: MA, suave: 0.8 }));
      if (v === 'roto') { ps.push(a.caja(6, 6, 12, 12, 12, 20, { mat: MA, resta: true, giro: 30 })); for (let i = 0; i < 3; i++) ps.push(lasca(a, [12 + jit(a, 4), jit(a, 10), 1], 2.5)); }
      vetaOro(a, ps, [7.6, 0, 12], [1, 0, 0], 8);
      return ps;
    },
  },
  {
    id: 'cel_obelisco_oro', nombre: ['Obelisco con oro', 'Gilded obelisk'], tema: TEMA, variantes: ['entero', 'partido', 'caido', 'flotante'], cuadros: 8, t: 5, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const loc: Pieza[] = [];
      const H = v === 'partido' ? 60 : 110, b = 8, t = 5;
      loc.push(a.poliedro([[-b, -b, 0], [b, -b, 0], [-b, b, 0], [b, b, 0], [-t, -t, H], [t, -t, H], [-t, t, H], [t, t, H]], { mat: MA }));
      if (v !== 'partido') loc.push(a.poliedro([[-t, -t, H], [t, -t, H], [-t, t, H], [t, t, H], [0, 0, H + 10]], { mat: OR }));
      else for (let i = 0; i < 3; i++) loc.push(pena(a, jit(a, 3), jit(a, 3), H, 5, 4, 3 + a.r() * 4, { mat: MA }));
      // inscripciones de oro en franjas
      for (let i = 0; i < 6; i++) { const z = 14 + i * 12; if (z > H - 6) break; const w = b - (b - t) * (z / H); loc.push(a.caja(w + 0.1, 0, z, 0.6, w * 1.2, 5, { mat: OR, tono: -0.05 })); }
      let ps: Pieza[];
      if (v === 'caido') ps = transformar(loc, rotM(a.r() * 360, 0, 86), [-H / 2, 0, b]);
      else if (v === 'flotante') ps = transformar(loc, rotM(ciclo(f, 8) * 45, jit(a, 6), jit(a, 6)), [0, 0, 18 + onda(f, 8) * 2.5]);
      else ps = transformar(loc, ID3, [0, 0, 0]);
      if (v !== 'flotante') ps.push(a.caja(0, 0, 0, 22, 22, 3, { mat: ML }));
      return { piezas: ps, sinSombra: v === 'flotante' };
    },
  },
  {
    id: 'cel_lanza_angel', nombre: ['Lanzas de ángeles clavadas', 'Spears of fallen angels'], tema: TEMA, variantes: ['una', 'tres', 'con_yelmo', 'rotas'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], n = v === 'tres' || v === 'rotas' ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const base: V3 = n > 1 ? [jit(a, 12), jit(a, 12), 0] : [0, 0, 0], d = nor([jit(a, 0.35), jit(a, 0.35), 1]), L = v === 'rotas' && a.r() < 0.6 ? 26 + a.r() * 20 : 70;
        ps.push(a.palo(add(base, d, -8), add(base, d, L), 0.9, { mat: OR }));
        if (L >= 70) { const tip = add(base, d, L); ps.push(a.poliedro([add(tip, lat(d), 3), add(tip, lat(d), -3), add(add(tip, d, 18), [0, 0, 0]), add(tip, cruz(d, lat(d)), 0.8), add(tip, cruz(d, lat(d)), -0.8)], { mat: 'cel_luz_oro', tono: -0.2 })); ps.push(a.palo(add(add(tip, d, -1), lat(d), -5), add(add(tip, d, -1), lat(d), 5), 0.8, { mat: OR })); }
        ps.push(a.elipsoide(...base, 4, 4, 1, { mat: 'cel_marmol' }));
      }
      if (v === 'con_yelmo') ps.push(masa([bulto([7, 4, 5], [4.6, 4, 5], { mat: OR }), hueso([7, 4, 10], [7, 4, 15], 1, 0.4, { mat: OR })], { mat: OR, suave: 0.6 }), a.caja(11, 4, 3, 2, 5, 2.4, { mat: 'negro', resta: true }));
      return ps;
    },
  },
  {
    id: 'cel_arpa_rota', nombre: ['Arpa de oro rota', 'Broken golden harp'], tema: TEMA, variantes: ['de_pie', 'caida', 'sin_cuerdas'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [], cs: Comp[] = [];
      // marco curvo de oro, columna con un ángel tallado y cuerdas de luz que quedan
      const curva = (t: number): V3 => [0, -10 + t * 22, 8 + Math.sin(t * PI) * 10 + t * 30];
      for (let i = 0; i < 6; i++) cs.push(hueso(curva(i / 6), curva((i + 1) / 6), 1.8, 1.6, { mat: OR }));
      cs.push(hueso([0, -10, 6], [0, -10, 46], 2.2, 1.8, { mat: OR }), bulto([0, -10, 48], [2.6, 2.6, 3], { mat: OR }), hueso([0, -10, 6], [0, 12, 4], 2, 2, { mat: OR }));
      loc.push(masa(cs, { mat: OR, suave: 1 }));
      if (v !== 'sin_cuerdas') for (let i = 1; i < 9; i++) { if (a.r() < 0.35) continue; const y = -10 + i * 2.4, top = curva((y + 10) / 22); loc.push(a.palo([0, y, 5], [0, y, top[2] - 1], 0.25, { mat: 'cel_luz_oro' })); }
      loc.push(a.cilindro(0, 0, 0, 8, 2.5, { mat: ML }));
      const ps = v === 'caida' ? transformar(loc, rotM(a.r() * 360, 84, 0), [0, 0, 3]) : mover(loc, 45 + jit(a, 30));
      return ps;
    },
  },
  dosEjes({
    id: 'cel_columnata', nombre: ['Columnata de mármol', 'Marble colonnade'], tema: TEMA, variantes: ['entera', 'rota', 'caida'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      for (let i = 0; i < 4; i++) { const x = -30 + i * 20, roto = v === 'rota' && (i === 2 || a.r() < 0.3) ? 0.3 + a.r() * 0.4 : 1; if (v === 'caida' && i > 1) { ps.push(a.cilindro(x, 8, 4, 4, 60, { mat: MA, eje: [0.15, 1, 0] })); continue; } columna(a, ps, [x, 0, 0], 72, 4, { roto }); }
      if (v === 'entera') ps.push(a.caja(0, 0, 79.5, 76, 12, 8, { mat: ML }), a.caja(0, 6.1, 82, 70, 0.6, 3, { mat: OR }));
      else ps.push(a.caja(-20, 0, 79.5, 36, 12, 8, { mat: ML, incl: v === 'caida' ? 0 : 3, inclEje: 'y' }));
      for (let i = 0; i < 3; i++) ps.push(lasca(a, [jit(a, 36), 10 + jit(a, 4), 1], 3));
      return ps;
    },
  }),
  {
    id: 'cel_piso_roto', nombre: ['Piso de mármol roto', 'Broken marble floor'], tema: TEMA, variantes: ['losas', 'hundido', 'con_mosaico', 'al_vacio'], huella: [5, 5], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
        if (v === 'al_vacio' && i + j > 1) continue;
        if (a.r() < 0.18) continue;
        const z = v === 'hundido' ? -Math.max(0, 3 - Math.hypot(i, j) * 1.2) * 1.5 : 0;
        ps.push(a.caja(i * 16 + jit(a, 0.8), j * 16 + jit(a, 0.8), z, 15.2, 15.2, 1.6, { mat: (v === 'con_mosaico' && (i + j) % 2 === 0) ? 'marmol_negro' : MA, giro: jit(a, 3), incl: jit(a, 3), tono: jit(a, 0.04) }));
      }
      if (v === 'con_mosaico') { ps.push(a.cilindro(0, 0, 1.4, 12, 0.5, { mat: OR })); ps.push(a.cilindro(0, 0, 1.5, 9, 0.5, { mat: 'marmol_negro' })); }
      if (v === 'al_vacio') ps.push(a.caja(20, 20, -0.4, 50, 50, 1, { mat: 'cel_vacio', giro: 45 }));
      for (let i = 0; i < 3; i++) vetaOro(a, ps, [jit(a, 30), jit(a, 30), 1.7], [0, 0, 1], 14);
      return ps;
    },
  },
  {
    id: 'cel_relicario', nombre: ['Relicario de oro', 'Golden reliquary'], tema: TEMA, variantes: ['cerrado', 'abierto', 'volcado'], cuadros: 8, t: 4, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => {
      const loc: Pieza[] = [], k = 0.5 + 0.5 * onda(f, 8);
      // arqueta como una iglesia chica: caja, tejado a dos aguas, pináculos y el vidrio con un hueso adentro
      loc.push(a.caja(0, 0, 0, 22, 12, 2, { mat: ML }), a.caja(0, 0, 2, 20, 10, 11, { mat: OR }), a.caja(5.1, 0, 4, 0.6, 7, 7, { mat: 'vidrio' }));
      if (v !== 'abierto') loc.push(a.poliedro([[-10, -5, 13], [10, -5, 13], [-10, 5, 13], [10, 5, 13], [-10, 0, 19], [10, 0, 19]], { mat: OR }));
      else loc.push(...transformar([a.poliedro([[-10, 0, 0], [10, 0, 0], [-10, 10, 0], [10, 10, 0], [-10, 5, 6], [10, 5, 6]], { mat: OR })], rotM(0, -110, 0), [0, -5, 13]), a.esfera(0, 0, 15, 2 + k * 0.4, { mat: 'cel_luz' }));
      for (const x of [-10, 10]) for (const y of [-5, 5]) loc.push(a.cilindro(x, y, 13, 0.9, 6, { mat: OR, r1: 0.1 }));
      const ps = v === 'volcado' ? transformar(loc, rotM(a.r() * 360, 90, 0), [0, 0, 6]) : mover(loc, 45 + jit(a, 20));
      return v === 'abierto' ? { piezas: ps, resplandor: { c: [0, 0, 16], r: 20 + k * 4, color: '#f4f0e0' } } : ps;
    },
  },
);
