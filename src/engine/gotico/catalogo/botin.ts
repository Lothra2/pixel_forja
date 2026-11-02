import { registrar } from '../objeto';
import { MATERIALES } from '../materiales';
import { caja, cilindro, elipsoide, esfera, palo, poliedro, masa, hueso, bulto, ruido, hash3, KZ, type Pieza, type V3, type Escena, type Comp } from '../render';

/**
 * Botín: cofres que se abren (con estallido de luz y monedas que saltan), montones de oro que relucen, monedas que
 * caen y rebotan, gemas en el piso, pilares de luz por rareza para lo que cae al piso y el ajuar de las salas del
 * tesoro (pilas de oro con copas y coronas, jarrones, cálices, sacos de monedas).
 *
 * Todo el azar sale de `azar(semilla, clave)`: cada cosa tiene su propia corriente, así un cuadro y el siguiente de
 * una animación arman lo mismo y solo cambia lo que se mueve.
 */

// ------------------------------------------------------------------ materiales
const M = MATERIALES;
const fr = (v: number, p: number) => ((v % p) + p) % p;

/** Madera de tablas: en las caras de pie las tablas van acostadas (juntas en z); arriba corren a lo largo de `eje`. */
function madera(eje: 0 | 1, alto = 3.3, ancho = 3.6, gasto = 0) {
  return (p: V3, n: V3) => {
    const pie = Math.abs(n[2]) < 0.62;
    const u = pie ? (Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]) : p[eje];
    const w = pie ? p[2] : p[1 - eje];
    const paso = pie ? alto : ancho, m = fr(w, paso);
    if (m < 0.36) return -0.34;
    const t = Math.floor(w / paso);
    const tabla = (hash3(t, 7, eje) - 0.5) * 0.18;
    const veta = (ruido(u * 0.11 + t * 5.1, w * 1.9, t) - 0.5) * 0.36;
    const fina = (ruido(u * 0.6, w * 5, t + 3) - 0.5) * 0.12;
    const canto = m > paso - 0.55 ? 0.07 : m < 0.75 ? -0.08 : 0;
    // nudos y desgaste
    const nudo = ruido(u * 0.35, w * 0.35, 11) > 0.83 ? -0.16 : 0;
    const gastado = gasto ? (ruido(u * 0.3, w * 0.5, 4) > 0.7 ? -gasto : 0) : 0;
    return tabla + veta + fina + canto + nudo + gastado;
  };
}
/** Pila de monedas: discos que se tapan unos a otros, con huecos más hondos y alguna que agarra la luz. */
function patronMonedas(p: V3) {
  const C = 2.5, x = p[0] / C, y = p[1] / C, z = (p[2] / C) * 1.5;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let d1 = 9, d2 = 9, id = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const cx = xi + i, cy = yi + j, cz = zi + k;
    const dx = cx + hash3(cx, cy, cz) - x, dy = cy + hash3(cy, cz, cx + 9) - y, dz = cz + hash3(cz, cx, cy + 17) - z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < d1) { d2 = d1; d1 = d; id = cx * 73 + cy * 151 + cz * 31; } else if (d < d2) d2 = d;
  }
  const r = 0.62;
  if (d1 > r) return -0.3;
  if (d2 < r && d2 - d1 < 0.09) return -0.26;
  const h = hash3(id, 3, 5);
  let s = (h - 0.5) * 0.24;
  if (d1 > r - 0.13) s -= 0.12; else if (d1 > r - 0.24) s += 0.07;
  if (h > 0.87) s += 0.32;
  return s;
}
const ORO = ['#110802', '#221203', '#381e05', '#502d08', '#6a400c', '#855511', '#a06b17', '#b9821f', '#cf9b2a', '#e2b43a', '#f0cb52', '#f9e07e', '#fff0b4'];
M.bt_oro = { rampa: ORO, ruido: 0.05, escala: 0.6, brillo: 0.95 };
M.bt_oro_monedas = { rampa: ORO, ruido: 0.06, escala: 0.6, brillo: 0.3, patron: (p) => patronMonedas(p) * 1.3 - 0.17 };
M.bt_oro_viejo = { rampa: ['#100a04', '#1f1407', '#32210b', '#473010', '#5e4116', '#78561e', '#936c28', '#ac8536', '#c4a04a'], ruido: 0.16, escala: 0.7, brillo: 0.55 };
M.bt_laton = { rampa: ['#110c04', '#211808', '#35270d', '#4b3813', '#634b1a', '#7c6023', '#96772e', '#ae8f3c', '#c5a851', '#dcc477', '#eedfa8'], ruido: 0.07, escala: 0.6, brillo: 0.75 };
M.bt_hierro = { rampa: ['#060709', '#0d0f12', '#15181c', '#1e2227', '#282d33', '#33393f', '#3f464e', '#4d555e', '#5f6872', '#78828c', '#9aa3ac'], ruido: 0.2, escala: 0.9, brillo: 0.38, patron: (p) => (ruido(p[0] * 0.7, p[1] * 0.7, p[2] * 0.7) - 0.5) * 0.16 };
M.bt_hierro_negro = { rampa: ['#050406', '#0b0a0d', '#131116', '#1c1920', '#26222b', '#312c37', '#3e3845', '#4f4857', '#665e6f'], ruido: 0.16, escala: 0.9, brillo: 0.45 };
M.bt_oxido = { rampa: ['#0e0806', '#1c0f09', '#2c180d', '#3e2211', '#512d16', '#653a1c', '#7a4824'], ruido: 0.5, escala: 0.8, brillo: 0.1 };
M.bt_hueso = { rampa: ['#17130e', '#2a241b', '#403829', '#584e3a', '#71654c', '#8a7d60', '#a39676', '#bbaf8f', '#d1c7aa', '#e2dbc4'], ruido: 0.18, escala: 0.9 };
M.bt_piedra = { rampa: ['#0e0d0c', '#1a1817', '#272422', '#35312e', '#443f3b', '#544e49', '#655e58', '#78716a', '#8c857d', '#a39c93'], ruido: 0.28, escala: 0.35, patron: (p) => (ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.08) - 0.5) * 0.18 + (ruido(p[0] * 1.3, p[1] * 1.3, p[2] * 1.3) > 0.78 ? -0.12 : 0) };
M.bt_esmalte = { rampa: ['#100203', '#1f0405', '#320809', '#470c0c', '#5d1211', '#741a17', '#8c241e', '#a43328', '#bc4836'], ruido: 0.05, escala: 0.6, brillo: 0.55 };
M.bt_terciopelo = { rampa: ['#0c0203', '#180406', '#260709', '#350b0d', '#451012', '#561617', '#681d1c'], ruido: 0.12, escala: 1.2 };
M.bt_cuero = { rampa: ['#0e0806', '#1a0f0a', '#28170f', '#372015', '#472a1b', '#583522', '#6a412a', '#7d4e33'], ruido: 0.22, escala: 0.9, brillo: 0.12 };
M.bt_arpillera = { rampa: ['#110a06', '#1e130b', '#2e1e12', '#402a19', '#523721', '#66452a', '#7a5534', '#8f6640', '#a2794f'], ruido: 0.3, escala: 1.6, patron: (p) => (Math.sin(p[0] * 3.1 + p[1] * 3.1) * Math.sin(p[2] * 3.4) > 0.3 ? 0.06 : -0.03) + (ruido(p[0] * 0.4, p[1] * 0.4, p[2] * 0.4) - 0.5) * 0.18 };
M.bt_cuerda = { rampa: ['#1a140c', '#2e2416', '#453721', '#5d4b2e', '#76603d', '#8e754d'], ruido: 0.4, escala: 1.4, patron: (p) => (fr(p[0] + p[1] + p[2] * 1.7, 1.1) < 0.35 ? -0.18 : 0) };
M.bt_vino = { rampa: ['#0a0103', '#160307', '#24050c', '#350912', '#4a0e19'], ruido: 0.05, escala: 0.5, brillo: 0.9 };
M.bt_negro = { rampa: ['#030203', '#070506', '#0c090a', '#120e0e'], ruido: 0.1, escala: 0.5 };
// maderas (con su versión _y: las vetas de arriba corren a lo largo de y)
const MADERAS: Record<string, [string[], number, number]> = {
  bt_mad_vieja: [['#0c0907', '#16110d', '#211912', '#2d2318', '#3a2d1f', '#483827', '#57442f', '#675139', '#785f44'], 0.14, 0.12],
  bt_mad_roble: [['#0d0805', '#180f08', '#25170c', '#332011', '#422a16', '#52351c', '#634123', '#754e2c', '#885c36'], 0.12, 0],
  bt_mad_caoba: [['#0c0404', '#170807', '#240d0b', '#33130f', '#431914', '#54211a', '#662a20', '#783428', '#8a4031'], 0.1, 0],
  bt_mad_ebano: [['#080506', '#100a0b', '#191112', '#231819', '#2e2021', '#3a2829', '#473233', '#553d3c', '#644846'], 0.08, 0],
};
for (const [id, [rampa, rui, gasto]] of Object.entries(MADERAS)) {
  M[id] = { rampa, ruido: rui, escala: 0.5, brillo: id === 'bt_mad_vieja' ? 0.04 : 0.18, patron: madera(0, 3.3, 3.6, gasto) };
  M[id + '_y'] = { ...M[id], patron: madera(1, 3.3, 3.6, gasto) };
}
// gemas (con brillo propio en su versión _luz)
const GEMAS: Record<string, string[]> = {
  rubi: ['#140105', '#29030a', '#450612', '#650a1a', '#8a1224', '#b11e30', '#d63a44', '#f2716a', '#ffc2b8'],
  zafiro: ['#01061a', '#030d30', '#061a4e', '#0b2a72', '#143f9a', '#2058c2', '#3a7ee0', '#74abf6', '#c4e0ff'],
  esmeralda: ['#010e06', '#031c0d', '#063018', '#0a4824', '#106432', '#1a8444', '#2ea65c', '#62cc84', '#b8f4c8'],
  amatista: ['#0b0314', '#170628', '#260c42', '#38145e', '#4e1e7e', '#682c9e', '#8644bc', '#ad72d8', '#e2c0f6'],
  topacio: ['#140902', '#2a1504', '#462608', '#663a0c', '#8a5212', '#b06c1a', '#d48c28', '#eeb450', '#ffe2a0'],
  diamante: ['#0c0f14', '#1a2029', '#2c3541', '#435060', '#5f6f82', '#8294a6', '#a9bac8', '#d2dee6', '#ffffff'],
};
for (const [g, rampa] of Object.entries(GEMAS)) {
  M['bt_' + g] = { rampa, ruido: 0.12, escala: 1.4, brillo: 1.1, patron: (p) => (ruido(p[0] * 1.7, p[1] * 1.7, p[2] * 1.7) > 0.62 ? 0.14 : 0) };
  M['bt_' + g + '_luz'] = { rampa: rampa.slice(4), ruido: 0.1, escala: 0.8, emite: true };
}
// luces (brillan solas)
M.bt_destello = { rampa: ['#7a5418', '#b88a2c', '#e8c060', '#fbe6a0', '#fff8dc', '#ffffff'], ruido: 0, escala: 1, emite: true };
M.bt_chispa = { rampa: ['#5a6070', '#8a92a4', '#c0c8d8', '#e8eef8', '#ffffff'], ruido: 0, escala: 1, emite: true };
M.bt_luz_oro = { rampa: ['#2c1603', '#552c06', '#80460c', '#a86414', '#cc8820', '#e8ae38', '#f8d068', '#ffeaa8', '#fff8e4'], ruido: 0.18, escala: 0.35, emite: true };
M.bt_luz_maldita = { rampa: ['#100218', '#230532', '#3a0a50', '#561472', '#762494', '#9a3cb8', '#c068d8', '#e4a8f2', '#f8e4ff'], ruido: 0.25, escala: 0.35, emite: true };
M.bt_luz_santa = { rampa: ['#24200e', '#46401e', '#706636', '#9c9056', '#c6bc80', '#e4dcac', '#f6f0d4', '#fffdf2', '#ffffff'], ruido: 0.12, escala: 0.35, emite: true };
M.bt_ojo = { rampa: ['#2a0201', '#520603', '#820e05', '#b42008', '#e04210', '#fa7a22', '#ffb850', '#fff0b0'], ruido: 0.15, escala: 1.6, emite: true };
M.bt_brasa = { rampa: ['#3a0802', '#701604', '#a42c08', '#d24c10', '#f27a1e', '#ffac44', '#ffdc8c', '#fff6d8'], ruido: 0.2, escala: 0.8, emite: true };
/** Haces por rareza: de lo apagado (casi el piso) a lo blanco. */
const HACES: Record<string, string[]> = {
  normal: ['#121214', '#1e1e22', '#2c2c32', '#3e3e46', '#55555e', '#70707a', '#8e8e98', '#b0b0b8', '#d8d8de'],
  magico: ['#040818', '#08122e', '#0e1e4a', '#162e6c', '#22448e', '#325eb4', '#4a80d8', '#78aaf4', '#c4dcff'],
  raro: ['#141002', '#281e04', '#403008', '#5c460c', '#7c6012', '#a0801c', '#c8a42e', '#ead054', '#fff4b4'],
  conjunto: ['#031204', '#062408', '#0c3c10', '#145818', '#1e7822', '#2c9a30', '#46bc44', '#7ee272', '#d0ffc8'],
  unico: ['#160a02', '#2e1604', '#4c2608', '#6e3a0c', '#925214', '#b86e1e', '#da9030', '#f4b852', '#ffe6a6', '#fffaea'],
  legendario: ['#1a0302', '#360804', '#5a1006', '#841c08', '#ae2e0c', '#d64812', '#f46c1e', '#ff9a3e', '#ffcc80', '#fff2d4'],
};
for (const [r, rampa] of Object.entries(HACES)) M['bt_haz_' + r] = { rampa, ruido: 0.14, escala: 0.25, emite: true };

// ------------------------------------------------------------------ utilidades
const azar = (seed: number, k: number) => { let i = 0; return () => hash3(seed * 131 + k * 7 + 3, i++ * 17 + k, 5711 + k); };
type M3 = [V3, V3, V3];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mulM = (m: M3, v: V3): V3 => [dot3(m[0], v), dot3(m[1], v), dot3(m[2], v)];
/** Matriz de giro de `g` grados alrededor de `e`. */
function rotM(e: V3, g: number): M3 {
  const l = Math.hypot(e[0], e[1], e[2]), x = e[0] / l, y = e[1] / l, z = e[2] / l;
  const a = (g * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), C = 1 - c;
  return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]];
}
const mulMM = (a: M3, b: M3): M3 => { const bt: M3 = [[b[0][0], b[1][0], b[2][0]], [b[0][1], b[1][1], b[2][1]], [b[0][2], b[1][2], b[2][2]]]; return a.map((f) => [dot3(f, bt[0]), dot3(f, bt[1]), dot3(f, bt[2])]) as M3; };
/** Mueve piezas ya armadas: p' = m·p + t (m ortonormal). */
function transformar(ps: Pieza[], m: M3, t: V3): Pieza[] {
  const P = (v: V3): V3 => { const q = mulM(m, v); return [q[0] + t[0], q[1] + t[1], q[2] + t[2]]; };
  const D = (v: V3) => mulM(m, v);
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, d]) => { const n2 = D(n); return [n2, d + dot3(n2, t)] as [V3, number]; }), pts: p.pts.map(P) };
    if (p.k === 'cono') return { ...p, o: P(p.o), ex: D(p.ex), ey: D(p.ey), ez: D(p.ez) };
    if (p.k === 'elip') return { ...p, c: P(p.c), ex: D(p.ex), ey: D(p.ey), ez: D(p.ez) };
    const comps = p.comps.map((q): Comp => (q.f === 'hueso' ? hueso(P(q.a), P(q.b), q.r0, q.r1, { mat: q.mat, tono: q.tono, k: q.k }) : { ...q, c: P(q.c), sc: P(q.sc), ex: D(q.ex), ey: D(q.ey), ez: D(q.ez) }));
    return masa(comps, { mat: p.mat, tono: p.tono, suave: p.suave });
  });
}
/** Gira piezas `g` grados alrededor del eje `e` que pasa por `piv`. */
function rotarEn(ps: Pieza[], e: V3, g: number, piv: V3): Pieza[] {
  const m = rotM(e, g), q = mulM(m, piv);
  return transformar(ps, m, [piv[0] - q[0], piv[1] - q[1], piv[2] - q[2]]);
}
/** Cambia materiales (para la versión a lo largo de y: maderas con vetas giradas). */
function recolor(ps: Pieza[], f: (m: string) => string): Pieza[] {
  return ps.map((p): Pieza => (p.k === 'masa' ? masa(p.comps.map((c) => ({ ...c, mat: c.mat && f(c.mat) })), { mat: f(p.mat), tono: p.tono, suave: p.suave }) : { ...p, mat: f(p.mat) }));
}
const aY = (m: string) => (M[m + '_y'] ? m + '_y' : m);
/** Versión a lo largo de y: girada -90° (el frente queda hacia +x, a la vista) y con las vetas acomodadas. */
function ejeY(e: Escena): Escena {
  const m = rotM([0, 0, 1], -90);
  return { ...e, piezas: recolor(transformar(e.piezas, m, [0, 0, 0]), aY), resplandor: e.resplandor && { ...e.resplandor, c: mulM(m, e.resplandor.c) } };
}

/** Destello de cuatro puntas (cruz de luz que se ve igual de larga en pantalla) de tamaño `s` (px de brazo). */
function estrella(ps: Pieza[], x: number, y: number, z: number, s: number, mat = 'bt_destello') {
  if (s < 0.5) return;
  const v = s / KZ, h = s / 1.414;
  ps.push(caja(x, y, z - v, 0.75, 0.75, 2 * v, { mat }));
  ps.push(caja(x, y, z - 0.32, 2 * h, 0.64, 0.64, { mat, giro: -45 }));
  if (s > 2.4) { const d = s * 0.3; ps.push(caja(x, y, z - 0.28, 2 * d, 0.56, 0.56, { mat, tono: -0.2 }), caja(x, y, z - 0.28, 2 * d, 0.56, 0.56, { mat, giro: 90, tono: -0.2 })); }
  ps.push(esfera(x, y, z, 0.5 + s * 0.13, { mat, tono: 0.2 }));
}
/** Moneda con centro (x,y,z) y normal `n`. */
function moneda(ps: Pieza[], x: number, y: number, z: number, n: V3 = [0, 0, 1], tono = 0, r = 1.75, mat = 'bt_oro') {
  const l = Math.hypot(n[0], n[1], n[2]) || 1, e: V3 = [n[0] / l, n[1] / l, n[2] / l];
  // canto algo más oscuro y la cara un poco más chica encima: así se lee el borde de la moneda
  ps.push(cilindro(x - e[0] * 0.36, y - e[1] * 0.36, z - e[2] * 0.36, r, 0.72, { mat, eje: e, tono: tono - 0.16 }));
  ps.push(cilindro(x + e[0] * 0.3, y + e[1] * 0.3, z + e[2] * 0.3, r * 0.74, 0.14, { mat, eje: e, tono: tono - 0.02 }));
}
/** Normal de una moneda inclinada `inc` grados hacia el rumbo `rumbo` (grados). */
const normalInc = (inc: number, rumbo: number): V3 => { const a = (inc * Math.PI) / 180, b = (rumbo * Math.PI) / 180; return [Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)]; };
/** Monedas sueltas en el piso alrededor de (x,y): algunas apiladas, alguna de canto. */
function monedasPiso(ps: Pieza[], R: () => number, n: number, x: number, y: number, r0: number, r1: number, sesgo: V3 = [0, 0, 0]) {
  for (let i = 0; i < n; i++) {
    const ang = R() * Math.PI * 2, d = r0 + Math.sqrt(R()) * (r1 - r0);
    const px = x + Math.cos(ang) * d + sesgo[0] * R(), py = y + Math.sin(ang) * d + sesgo[1] * R();
    const tipo = R(), inc = R() * 14, rum = R() * 360, tono = (R() - 0.5) * 0.2;
    if (tipo < 0.12) { moneda(ps, px, py, 1.3, normalInc(78, rum), tono); continue; }
    moneda(ps, px, py, 0.4, normalInc(inc, rum), tono);
    if (tipo > 0.8) moneda(ps, px + (R() - 0.5), py + (R() - 0.5), 1.1, normalInc(R() * 20, R() * 360), tono + 0.05);
  }
}
/** Tierra y polvo bajo algo apoyado. */
function mancha(ps: Pieza[], R: () => number, rx: number, ry: number, n = 3, mat = 'tierra') {
  ps.push(elipsoide(0, 0, 0, rx, ry, 1.1, { mat, giro: (R() - 0.5) * 20, tono: -0.05 }));
  for (let i = 0; i < n; i++) {
    const ang = R() * Math.PI * 2, d = 0.8 + R() * 0.3;
    ps.push(elipsoide(Math.cos(ang) * rx * d, Math.sin(ang) * ry * d, 0.3, 1 + R() * 1.4, 0.9 + R(), 0.7 + R() * 0.6, { mat: 'piedra', giro: R() * 180, tono: (R() - 0.5) * 0.2 }));
  }
}
/** Medio cilindro facetado a lo largo de x (tapas de duelas): centro del eje (yc, zc), radios ry y rz, n duelas. */
function medioCil(x0: number, x1: number, yc: number, zc: number, ry: number, rz: number, n: number, mat: string, tono = 0): Pieza {
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI; for (const x of [x0, x1]) pts.push([x, yc + Math.cos(t) * ry, zc + Math.sin(t) * rz]); }
  return poliedro(pts, { mat, tono });
}
/** Prisma recto con base poligonal en el plano xz (de y0 a y1): escudos, placas, letras. */
function prismaXZ(pts: [number, number][], y0: number, y1: number, mat: string, tono = 0): Pieza {
  return poliedro(pts.flatMap(([x, z]) => [[x, y0, z], [x, y1, z]] as V3[]), { mat, tono });
}
/** Gema tallada: corona con mesa, filetín y pabellón. `corte` cambia el contorno. Inclinada `inc` hacia `rumbo`. */
type Corte = 'redondo' | 'oval' | 'esmeralda' | 'pera' | 'marquesa';
function gema(ps: Pieza[], c: V3, r: number, mat: string, corte: Corte = 'redondo', inc = 0, rumbo = 0, tono = 0) {
  const n = corte === 'esmeralda' ? 8 : 10;
  const contorno = (t: number): [number, number] => {
    if (corte === 'oval') return [Math.cos(t) * 1.25, Math.sin(t) * 0.85];
    if (corte === 'pera') return [Math.cos(t) * (1.05 + 0.35 * Math.cos(t)) - 0.2, Math.sin(t) * 0.85 * (1 - 0.25 * Math.cos(t))];
    if (corte === 'marquesa') return [Math.cos(t) * 1.45, Math.sin(t) * 0.7 * Math.pow(Math.abs(Math.sin(t)), 0.15)];
    if (corte === 'esmeralda') { const k = Math.cos(t), s = Math.sin(t); return [Math.sign(k) * Math.min(1.25, Math.abs(k) * 1.8), Math.sign(s) * Math.min(0.85, Math.abs(s) * 1.4)]; }
    return [Math.cos(t), Math.sin(t)];
  };
  const loc: V3[] = [];
  for (let i = 0; i < n; i++) {
    const t = ((i + (corte === 'esmeralda' ? 0.5 : 0)) / n) * Math.PI * 2, [u, w] = contorno(t);
    loc.push([u * r, w * r, 0], [u * r * 0.58, w * r * 0.58, r * 0.42]);
    if (corte === 'esmeralda') loc.push([u * r * 0.7, w * r * 0.7, -r * 0.55]);
  }
  if (corte !== 'esmeralda') loc.push([0, 0, -r * 0.85]);
  const m = mulMM(rotM([0, 0, 1], rumbo), rotM([0, 1, 0], inc));
  ps.push(poliedro(loc.map((q) => { const w = mulM(m, q); return [w[0] + c[0], w[1] + c[1], w[2] + c[2]] as V3; }), { mat, tono }));
}
/** Trayectoria de una moneda lanzada desde p0 con velocidad v (unidades por cuadro), gravedad g, rebotes en `piso`. */
function vuelo(p0: V3, v: V3, g: number, t: number, piso = 0.4, rest = 0.36): { p: V3; aire: boolean; vel: V3 } {
  let [x, y, z] = p0, [vx, vy, vz] = v, tt = Math.max(0, t);
  for (let b = 0; b < 5; b++) {
    const disc = vz * vz + 2 * g * (z - piso), s = (vz + Math.sqrt(Math.max(0, disc))) / g;
    if (tt < s) return { p: [x + vx * tt, y + vy * tt, z + vz * tt - (g * tt * tt) / 2], aire: true, vel: [vx, vy, vz - g * tt] };
    x += vx * s; y += vy * s; z = piso; vz = -(vz - g * s) * rest; vx *= 0.45; vy *= 0.45; tt -= s;
    if (vz < 0.7) return { p: [x + vx * Math.min(tt, 1), y + vy * Math.min(tt, 1), piso], aire: false, vel: [0, 0, 0] };
  }
  return { p: [x, y, piso], aire: false, vel: [0, 0, 0] };
}
/** Calavera mirando a la cámara. */
function calavera(ps: Pieza[], x: number, y: number, z: number, r: number, ojo = 'bt_negro', mat = 'bt_hueso') {
  const fx = Math.SQRT1_2, fy = Math.SQRT1_2, px = -fy, py = fx;
  ps.push(elipsoide(x, y, z, r, r * 0.92, r * 0.95, { mat, giro: 45 }));
  ps.push(caja(x + fx * r * 0.42, y + fy * r * 0.42, z - r * 0.98, r * 1.05, r * 0.85, r * 0.62, { mat, giro: 45, tono: -0.06 }));
  for (const s of [-1, 1]) ps.push(esfera(x + fx * r * 0.8 + px * s * r * 0.38, y + fy * r * 0.8 + py * s * r * 0.38, z - r * 0.1, r * 0.3, { mat: ojo }));
  ps.push(esfera(x + fx * r * 0.93, y + fy * r * 0.93, z - r * 0.52, r * 0.15, { mat: 'bt_negro' }));
}

// ------------------------------------------------------------------ copas, coronas, jarrones (se arman de pie en el origen)
function caliz(s: number, gemaMat = 'bt_rubi', mat = 'bt_oro', vino: boolean | 'oro' = true): Pieza[] {
  const ps: Pieza[] = [];
  ps.push(cilindro(0, 0, 0, 2.3 * s, 0.6 * s, { mat, r1: 2.0 * s }), cilindro(0, 0, 0.6 * s, 1.9 * s, 1.0 * s, { mat, r1: 0.6 * s, tono: 0.04 }));
  ps.push(cilindro(0, 0, 1.5 * s, 0.55 * s, 3.2 * s, { mat }), esfera(0, 0, 3.0 * s, 0.95 * s, { mat, tono: 0.08 }));
  ps.push(cilindro(0, 0, 4.6 * s, 0.7 * s, 1.0 * s, { mat, r1: 1.9 * s }), cilindro(0, 0, 5.5 * s, 1.9 * s, 2.6 * s, { mat, r1: 2.5 * s, tono: 0.05 }));
  ps.push(cilindro(0, 0, 7.9 * s, 2.55 * s, 0.35 * s, { mat, tono: 0.12 }));
  if (vino === 'oro') ps.push(elipsoide(0, 0, 8.0 * s, 2.2 * s, 2.2 * s, 0.9 * s, { mat: 'bt_oro_monedas', tono: 0.05 }));
  else if (vino) ps.push(cilindro(0, 0, 7.95 * s, 2.15 * s, 0.32 * s, { mat: 'bt_vino' }));
  for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + Math.PI / 4; ps.push(esfera(Math.cos(t) * 2.2 * s, Math.sin(t) * 2.2 * s, 6.6 * s, 0.5 * s, { mat: gemaMat })); }
  return ps;
}
function corona(s: number, mat = 'bt_oro', gemas = ['bt_rubi', 'bt_zafiro', 'bt_esmeralda'], gorro = 'bt_terciopelo'): Pieza[] {
  const ps: Pieza[] = [], R = 3.2 * s, n = 14;
  if (gorro) ps.push(elipsoide(0, 0, 1.4 * s, R * 0.86, R * 0.86, 2.6 * s, { mat: gorro }));
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; ps.push(caja(Math.cos(t) * R, Math.sin(t) * R, 0, 0.8 * s, 2 * R * Math.sin(Math.PI / n) + 0.2, 1.9 * s, { mat, giro: (t * 180) / Math.PI, tono: 0.04 })); }
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2 + 0.3, c = Math.cos(t), si = Math.sin(t), w = 1.1 * s, tc = Math.cos(t + Math.PI / 2), ts = Math.sin(t + Math.PI / 2);
    const b = (k: number, z: number, dr = 0): V3 => [c * (R + dr) + tc * k, si * (R + dr) + ts * k, z];
    ps.push(poliedro([b(-w, 1.8 * s, -0.35), b(w, 1.8 * s, -0.35), b(-w, 1.8 * s, 0.35), b(w, 1.8 * s, 0.35), b(0, 4.3 * s, 0)], { mat }));
    ps.push(esfera(c * R, si * R, 4.5 * s, 0.5 * s, { mat, tono: 0.1 }));
    ps.push(esfera(c * (R + 0.4), si * (R + 0.4), 1.0 * s, 0.55 * s, { mat: gemas[i % gemas.length] }));
  }
  return ps;
}
/** Jarrón de oro: perfil torneado, asas y una faja de gemas. Alto ~16·s. */
function jarron(s: number, mat = 'bt_oro'): Pieza[] {
  const prof: [number, number][] = [[0, 2.2], [0.7, 2.4], [1.3, 1.5], [2.2, 2.6], [4.5, 4.0], [6.8, 4.5], [8.8, 4.0], [10.8, 2.6], [12.4, 1.6], [14.2, 1.5], [15.0, 2.3], [15.8, 2.4]];
  const ps: Pieza[] = [];
  for (let i = 0; i + 1 < prof.length; i++) { const [z0, r0] = prof[i], [z1, r1] = prof[i + 1]; ps.push(cilindro(0, 0, z0 * s, r0 * s, (z1 - z0) * s, { mat, r1: r1 * s, tono: i % 3 === 1 ? 0.04 : 0 })); }
  ps.push(cilindro(0, 0, 15.5 * s, 1.7 * s, 0.35 * s, { mat: 'bt_negro' }));
  // faja con gemas y el borde del hombro
  ps.push(cilindro(0, 0, 8.6 * s, 4.15 * s, 0.7 * s, { mat, r1: 4.05 * s, tono: 0.12 }));
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; ps.push(esfera(Math.cos(t) * 4.45 * s, Math.sin(t) * 4.45 * s, 6.6 * s, 0.6 * s, { mat: i % 2 ? 'bt_zafiro' : 'bt_rubi' })); }
  // asas
  for (const sg of [-1, 1]) {
    const pts: V3[] = [[sg * 3.9, 0, 9.4], [sg * 5.6, 0, 10.6], [sg * 5.9, 0, 12.6], [sg * 4.6, 0, 14.0], [sg * 2.0, 0, 14.2]];
    for (let i = 0; i + 1 < pts.length; i++) ps.push(palo(pts[i].map((v) => v * s) as V3, pts[i + 1].map((v) => v * s) as V3, 0.55 * s, { mat }));
  }
  return ps;
}
const colocar = (ps: Pieza[], pos: V3, giro = 0, inc = 0, rumboInc = 0) => transformar(ps, mulMM(rotM([0, 0, 1], rumboInc), mulMM(rotM([0, 1, 0], inc), rotM([0, 0, 1], giro - rumboInc))), pos);

// ------------------------------------------------------------------ cofres
interface Ctx { L: number; W: number; H: number; z0: number; zt: number; R: (k: number) => () => number; f: number; fase: Fase; seed: number }
type Fase = 'cerrado' | 'abriendo' | 'abierto' | 'vacio';
interface TipoCofre {
  id: string; nombre: [string, string];
  L: number; W: number; H: number; z0: number; pared: number;
  /** material del interior (lo que se ve por dentro) y de la luz que sale */
  luz: string; color: string;
  /** cómo se abre: bisagra atrás (ángulo) o tapa que se corre (sarcófago) */
  corre?: boolean;
  cuerpo: (ps: Pieza[], c: Ctx) => void;
  tapa: (c: Ctx) => Pieza[];
  /** lo que hay adentro además del oro */
  adentro?: (ps: Pieza[], c: Ctx) => void;
  /** encima de todo, cuadro a cuadro (ojos, cadenas, destellos de la cerradura) */
  vivo?: (ps: Pieza[], c: Ctx, ang: number) => void;
  /** dónde cae el destello del cofre cerrado */
  brilloCerrado?: V3;
  /** luz propia con la tapa cerrada (el ojo del maldito) */
  luzCerrado?: (c: Ctx) => Escena['resplandor'];
  /** cuántas monedas saltan */
  saltan?: number;
}
const ANG_ABRIENDO = [0, 5, 17, 44, 78, 100, 111, 104];
const CORRE = [0, 1.2, 3.5, 7, 10.5, 13, 14.6, 14.2];

function armarCofre(T: TipoCofre, v0: string, f: number, seed: number): Escena {
  const enY = v0.endsWith('_y'), fase = (enY ? v0.slice(0, -2) : v0) as Fase;
  const { L, W, H, z0, pared } = T, zt = z0 + H;
  const c: Ctx = { L, W, H, z0, zt, R: (k) => azar(seed, k), f, fase, seed };
  const ps: Pieza[] = [];
  const ang = fase === 'cerrado' ? 0 : fase === 'abriendo' ? ANG_ABRIENDO[f] : 104;
  const corre = fase === 'cerrado' ? 0 : fase === 'abriendo' ? CORRE[f] : 14.2;
  const abierto = T.corre ? corre > 0 : ang > 0;
  /** la tapa del sarcófago se corre hacia -x (en la versión y, hacia +x: así lo abierto queda a la vista) */
  const sx = enY ? 1 : -1;
  T.cuerpo(ps, c);
  const lleno = fase !== 'vacio';
  if (abierto) {
    ps.push(caja(0, 0, z0 + 2, L - pared * 2, W - pared * 2, H + 0.6, { mat: 'bt_negro', resta: true }));
    ps.push(caja(0, 0, z0 + 1.9, L - pared * 2, W - pared * 2, 0.4, { mat: 'bt_negro' }));
    const ri = c.R(40);
    if (lleno) {
      const rx = L / 2 - pared - 0.2, ry = W / 2 - pared - 0.2;
      ps.push(elipsoide(0, 0, zt - 2.8, rx, ry, 4.0, { mat: 'bt_oro_monedas' }));
      ps.push(elipsoide(rx * 0.25, -ry * 0.2, zt - 1.5, rx * 0.55, ry * 0.6, 3.2, { mat: 'bt_oro_monedas', tono: 0.03 }));
      for (let i = 0; i < 9; i++) {
        const x = (ri() - 0.5) * 2 * rx * 0.85, y = (ri() - 0.5) * 2 * ry * 0.8;
        const k = Math.max(0, 1 - (x / rx) ** 2 - (y / ry) ** 2);
        moneda(ps, x, y, zt - 2.8 + 4 * Math.sqrt(k) + 0.25, normalInc(10 + ri() * 30, ri() * 360), (ri() - 0.5) * 0.2);
      }
      T.adentro?.(ps, c);
    } else {
      // saqueado: polvo, una moneda olvidada
      for (let i = 0; i < 2; i++) moneda(ps, (ri() - 0.5) * (L - 8), (ri() - 0.5) * (W - 7), z0 + 2.5, normalInc(ri() * 15, ri() * 360), -0.1);
    }
  }
  // la tapa
  let tapa = T.tapa(c);
  if (T.corre) {
    if (corre > 0) {
      const m = rotM([0, 0, 1], sx * corre * 0.75);
      tapa = transformar(tapa, m, [sx * corre, -corre * 0.25, corre > 1 ? 0.3 : 0.6]);
    }
  } else if (ang > 0) tapa = rotarEn(tapa, [1, 0, 0], ang, [0, -W / 2, zt]);
  ps.push(...tapa);
  T.vivo?.(ps, c, ang);
  // luz y estallido
  let resplandor: Escena['resplandor'];
  const centro: V3 = T.corre ? [-sx * L * 0.2, 0, zt + 1] : [0, 0, zt + 1];
  if (fase === 'abriendo' && f >= 1 && lleno) {
    // la rendija de luz y los haces que suben
    if (f <= 3) ps.push(caja(0, 0, zt - 1.6, L - pared * 2 - 0.6, W - pared * 2 - 0.6, 1.4, { mat: T.luz, tono: 0.15 }));
    const largo = [0, 0, 9, 20, 28, 31, 25, 0][f], br = [0, 0, 0.2, 0.22, 0.14, 0, -0.18, 0][f];
    const rr = c.R(50);
    if (largo > 0) for (let i = 0; i < 9; i++) {
      const t = -0.95 + (i / 8) * 1.9 + (rr() - 0.5) * 0.18, ln = largo * (0.55 + rr() * 0.55), inc = Math.abs(t);
      const b: V3 = [centro[0] + t * (L / 2 - pared - 2) * 0.9, centro[1] + (rr() - 0.5) * 3, zt - 0.5];
      const d: V3 = [Math.sin(t * 0.75) * 0.9, -0.15 - inc * 0.1, Math.cos(t * 0.75) * 1.0];
      const at = (k: number): V3 => [b[0] + d[0] * ln * k, b[1] + d[1] * ln * k, b[2] + d[2] * ln * k];
      const ancho = 0.32 + rr() * 0.22;
      ps.push(palo(b, at(0.35), ancho, { mat: T.luz, r1: ancho * 1.5, tono: br + 0.12 }));
      ps.push(palo(at(0.35), at(0.7), ancho * 1.5, { mat: T.luz, r1: ancho * 2, tono: br - 0.2 }));
      ps.push(palo(at(0.7), at(1), ancho * 2, { mat: T.luz, r1: ancho * 2.3, tono: br - 0.42 }));
    }
    // el núcleo de luz en la boca del cofre
    if (f >= 2 && f <= 6) ps.push(elipsoide(centro[0], 0, zt + 0.6, (L / 2 - pared) * [0, 0, 0.6, 0.85, 0.9, 0.75, 0.5][f], (W / 2 - pared) * 0.7, [0, 0, 1.5, 2.6, 2.8, 2.0, 1.2][f], { mat: T.luz, tono: 0.18 }));
    // monedas que saltan
    const rm = c.R(60), n = T.saltan ?? 8;
    for (let i = 0; i < n; i++) {
      const p0: V3 = [centro[0] + (rm() - 0.5) * (L - 10), centro[1] + (rm() - 0.5) * 4, zt + 0.5];
      const v: V3 = [(rm() - 0.5) * 2.4, 1.0 + rm() * 1.5, 3.2 + rm() * 1.6];
      const enCofre = rm() < 0.3, giroV = 70 + rm() * 80, ph = rm() * 360;
      const t = f - 1.6;
      if (t <= 0) continue;
      const q = vuelo(p0, enCofre ? [v[0] * 0.3, v[1] * 0.2, v[2] * 0.7] : v, 2.2, t, enCofre ? zt + 0.8 : 0.4);
      const nrm = q.aire ? normalInc(ph + giroV * t, ph * 2) : normalInc(8, ph);
      moneda(ps, q.p[0], q.p[1], q.p[2], nrm, 0.08);
    }
    // destellos
    const rd = c.R(70);
    for (let i = 0; i < 6; i++) {
      const x = centro[0] + (rd() - 0.5) * (L + 6), y = (rd() - 0.3) * (W + 6), z = zt + 2 + rd() * 18, ph = Math.floor(rd() * 3);
      const k = f - 3 - ph, s = k === 0 ? 2.2 : k === 1 ? 3.6 : k === 2 ? 1.6 : 0;
      if (s) estrella(ps, x, y, z, s);
    }
    if (f === 3) estrella(ps, centro[0], 2, zt + 5, 5.5);
    resplandor = { c: [centro[0], 0, zt + 6], r: [0, 12, 19, 25, 29, 27, 23, 19][f], color: T.color };
  } else if (fase === 'abierto') {
    const k = f % 4;
    resplandor = { c: [centro[0], 0, zt + 6], r: [17, 18.5, 19.5, 18.5][k], color: T.color };
    // monedas que ya saltaron y quedaron en el piso
    const rm = c.R(60), n = T.saltan ?? 8;
    for (let i = 0; i < n; i++) {
      const p0: V3 = [centro[0] + (rm() - 0.5) * (L - 10), centro[1] + (rm() - 0.5) * 4, zt + 0.5];
      const v: V3 = [(rm() - 0.5) * 2.4, 1.0 + rm() * 1.5, 3.2 + rm() * 1.6];
      const enCofre = rm() < 0.3; rm(); const ph = rm() * 360;
      const q = vuelo(p0, enCofre ? [v[0] * 0.3, v[1] * 0.2, v[2] * 0.7] : v, 2.2, 40, enCofre ? zt + 0.8 : 0.4);
      moneda(ps, q.p[0], q.p[1], q.p[2], normalInc(8, ph), 0.05);
    }
    // brillo suave: destellos que se turnan
    const rd = c.R(80);
    for (let i = 0; i < 4; i++) {
      const x = centro[0] + (rd() - 0.5) * (L - 8), y = (rd() - 0.5) * (W - 7), z = zt + 1.5 + rd() * 2;
      const s = [[2.6, 1.2, 0, 0], [0, 2.6, 1.2, 0], [0, 0, 2.6, 1.2], [1.2, 0, 0, 2.6]][i][k];
      if (s) estrella(ps, x, y, z, s);
    }
  } else if (fase === 'abriendo' && f >= 1) {
    resplandor = undefined;
  }
  if (fase === 'cerrado' && T.brilloCerrado && (f === 3 || f === 4)) estrella(ps, ...T.brilloCerrado, f === 3 ? 2.2 : 1.2);
  if (!resplandor && T.luzCerrado && (fase === 'cerrado' || fase === 'vacio' || (fase === 'abriendo' && f === 0))) resplandor = T.luzCerrado(c);
  const e: Escena = { piezas: ps, resplandor };
  return enY ? ejeY(e) : e;
}

// ------------------------------------------------------------------ tipos de cofre
/** Escuadras de las esquinas, de pie. */
function esquineros(ps: Pieza[], L: number, W: number, z0: number, h: number, mat: string, a = 3, g = 0.7) {
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    ps.push(caja(sx * (L / 2 - a / 2 + g / 2), sy * (W / 2 + g / 2 - 0.05), z0, a, g, h, { mat }));
    ps.push(caja(sx * (L / 2 + g / 2 - 0.05), sy * (W / 2 - a / 2 + g / 2), z0, g, a, h, { mat }));
  }
}
/** Remaches en fila a lo largo de un segmento. */
function remaches(ps: Pieza[], a: V3, b: V3, n: number, mat = 'bt_hierro', r = 0.55) {
  for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); ps.push(esfera(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, r, { mat, tono: 0.18 })); }
}

const COFRES: TipoCofre[] = [];

// -- madera gastada con zunchos de hierro
COFRES.push({
  id: 'cofre_madera', nombre: ['Cofre de madera gastada', 'Worn wooden chest'], L: 24, W: 14, H: 9, z0: 0, pared: 1.5,
  luz: 'bt_luz_oro', color: '#ffb84a', brilloCerrado: [0, 8.2, 6], saltan: 6,
  cuerpo: (ps, c) => {
    const { L, W, H, R } = c, r = R(1);
    mancha(ps, r, L / 2 + 4, W / 2 + 4, 3);
    ps.push(caja(0, 0, 0, L, W, H, { mat: 'bt_mad_vieja' }));
    // zócalo y canto de arriba
    ps.push(caja(0, 0, 0, L + 0.6, W + 0.6, 1.2, { mat: 'bt_mad_vieja', tono: -0.1 }));
    // zunchos: dos bandas que dan la vuelta
    for (const x of [-L / 2 + 4.5, L / 2 - 4.5]) {
      ps.push(caja(x, 0, -0.01, 2.0, W + 0.7, H + 0.05, { mat: 'bt_hierro', tono: -0.05 }));
      remaches(ps, [x, W / 2 + 0.4, 1.8], [x, W / 2 + 0.4, H - 1.4], 3);
    }
    // esquineros con algo de óxido
    esquineros(ps, L, W, 0, H, 'bt_hierro', 2.6, 0.6);
    ps.push(caja(L / 2 - 1, W / 2 + 0.4, 0.4, 1.6, 0.3, 2.5, { mat: 'bt_oxido' }));
    // placa de cerradura
    ps.push(caja(0, W / 2 + 0.25, H - 5.2, 4.2, 0.7, 4.6, { mat: 'bt_hierro', tono: 0.06 }));
    ps.push(caja(0, W / 2 + 0.55, H - 3.9, 0.9, 0.4, 1.8, { mat: 'bt_negro' }), esfera(0, W / 2 + 0.6, H - 2.8, 0.6, { mat: 'bt_negro' }));
    // tabla rota y astillas al pie
    ps.push(caja(-L / 2 + 8.5, W / 2 + 0.05, 2.9, 4.5, 0.3, 1.1, { mat: 'bt_negro', tono: 0.05 }));
    ps.push(caja(-L / 2 - 2, W / 2 + 2, 0, 4, 0.9, 0.6, { mat: 'bt_mad_vieja', giro: 25, tono: -0.05 }));
    // asas de cuerda a los lados
    for (const s of [-1, 1]) ps.push(palo([s * (L / 2 + 0.5), -2.5, H - 2.6], [s * (L / 2 + 1.2), 0, H - 4], 0.5, { mat: 'bt_cuerda' }), palo([s * (L / 2 + 1.2), 0, H - 4], [s * (L / 2 + 0.5), 2.5, H - 2.6], 0.5, { mat: 'bt_cuerda' }));
  },
  tapa: (c) => {
    const { L, W, zt } = c, ps: Pieza[] = [];
    ps.push(medioCil(-L / 2, L / 2, 0, zt, W / 2, 5, 7, 'bt_mad_vieja', 0.04));
    ps.push(caja(0, 0, zt - 0.01, L, W, 0.5, { mat: 'bt_mad_vieja', tono: -0.18 }));
    for (const x of [-L / 2 + 4.5, L / 2 - 4.5]) {
      ps.push(medioCil(x - 1, x + 1, 0, zt, W / 2 + 0.35, 5.35, 7, 'bt_hierro', -0.05));
      remaches(ps, [x, W / 2 * Math.cos(1.2) + 0.3, zt + 5 * Math.sin(1.2) + 0.3], [x, -W / 2 * Math.cos(1.2) - 0.3, zt + 5 * Math.sin(1.2) + 0.3], 3);
    }
    for (const s of [-1, 1]) ps.push(medioCil(s * L / 2 - 0.5, s * L / 2 + 0.5, 0, zt, W / 2 + 0.2, 5.2, 7, 'bt_mad_vieja', -0.12));
    // aldaba que baja a la cerradura
    ps.push(caja(0, W / 2 + 0.3, zt - 2.3, 2.0, 0.6, 3.6, { mat: 'bt_hierro', tono: 0.1 }));
    return ps;
  },
});

// -- herrado: tablas de roble bajo flejes de hierro remachados y un candado pesado
M.bt_cuero_rojo = { rampa: ['#0c0203', '#190507', '#28080b', '#390d10', '#4b1215', '#5e181a', '#722020', '#872a28'], ruido: 0.18, escala: 1.1, brillo: 0.22 };
/** Tapa achaflanada (de baúl): base en zt, alto h, con el techo `dentro` más angosto por lado. */
function tapaBisel(x0: number, x1: number, W: number, zt: number, h: number, dentro: number, mat: string, tono = 0, d = 0): Pieza {
  return poliedro([[x0, -W / 2 - d, zt], [x1, -W / 2 - d, zt], [x1, W / 2 + d, zt], [x0, W / 2 + d, zt],
    [x0, -W / 2 + dentro - d * 0.5, zt + h + d], [x1, -W / 2 + dentro - d * 0.5, zt + h + d], [x1, W / 2 - dentro + d * 0.5, zt + h + d], [x0, W / 2 - dentro + d * 0.5, zt + h + d]], { mat, tono });
}
function candado(ps: Pieza[], x: number, y: number, z: number, abierto = false, inc = 0) {
  const loc: Pieza[] = [];
  loc.push(caja(0, 0, -4.4, 4.2, 1.8, 3.8, { mat: 'bt_hierro', tono: 0.08 }));
  loc.push(cilindro(0, -0.95, -2.9, 0.55, 1, { mat: 'bt_negro', eje: [0, 1, 0] }), caja(0, 0.95, -3.6, 0.5, 0.3, 1.3, { mat: 'bt_negro' }));
  const ab = abierto ? 1.6 : 0;
  loc.push(palo([-1.4, 0, -0.6], [-1.4, 0, 1.4 + ab], 0.5, { mat: 'bt_hierro', tono: 0.15 }), palo([1.4, 0, -0.6 + ab], [1.4, 0, 1.4 + ab], 0.5, { mat: 'bt_hierro', tono: 0.15 }));
  loc.push(palo([-1.5, 0, 1.4 + ab], [0, 0, 2.3 + ab], 0.5, { mat: 'bt_hierro', tono: 0.15 }), palo([0, 0, 2.3 + ab], [1.5, 0, 1.4 + ab], 0.5, { mat: 'bt_hierro', tono: 0.15 }));
  ps.push(...transformar(loc, rotM([1, 0, 0], inc), [x, y, z]));
}
COFRES.push({
  id: 'cofre_hierro', nombre: ['Cofre herrado', 'Iron-bound chest'], L: 28, W: 16, H: 11, z0: 0, pared: 1.8,
  luz: 'bt_luz_oro', color: '#ffb84a', brilloCerrado: [1.2, 10.2, 5.4], saltan: 9,
  cuerpo: (ps, c) => {
    const { L, W, H, R } = c, r = R(1);
    mancha(ps, r, L / 2 + 4, W / 2 + 4, 3);
    ps.push(caja(0, 0, 0, L, W, H, { mat: 'bt_mad_roble' }));
    // flejes: zócalo, borde de arriba y cuatro de pie
    ps.push(caja(0, 0, 0, L + 0.8, W + 0.8, 1.8, { mat: 'bt_hierro', tono: -0.04 }), caja(0, 0, H - 1.6, L + 0.7, W + 0.7, 1.6, { mat: 'bt_hierro' }));
    for (const x of [-L / 2 + 4, -4.6, 4.6, L / 2 - 4]) {
      ps.push(caja(x, 0, 0, 2.4, W + 0.75, H, { mat: 'bt_hierro', tono: -0.02 }));
      remaches(ps, [x, W / 2 + 0.45, 2.8], [x, W / 2 + 0.45, H - 2.6], 3);
    }
    remaches(ps, [-L / 2 + 1.5, W / 2 + 0.45, H - 0.8], [L / 2 - 1.5, W / 2 + 0.45, H - 0.8], 10);
    remaches(ps, [L / 2 + 0.45, -W / 2 + 1.5, H - 0.8], [L / 2 + 0.45, W / 2 - 1.5, H - 0.8], 5);
    // esquineros gruesos con remaches
    esquineros(ps, L, W, 0, H, 'bt_hierro', 3.4, 0.9);
    for (const sx of [-1, 1]) remaches(ps, [sx * (L / 2 - 1.6), W / 2 + 0.95, 2.4], [sx * (L / 2 - 1.6), W / 2 + 0.95, H - 2.4], 3);
    // placa de la cerradura
    ps.push(poliedro([[-3.4, W / 2, H - 1.4], [3.4, W / 2, H - 1.4], [3.4, W / 2, H - 6], [0, W / 2, H - 8.2], [-3.4, W / 2, H - 6],
      [-3.4, W / 2 + 0.7, H - 1.4], [3.4, W / 2 + 0.7, H - 1.4], [3.4, W / 2 + 0.7, H - 6], [0, W / 2 + 0.7, H - 8.2], [-3.4, W / 2 + 0.7, H - 6]], { mat: 'bt_hierro', tono: 0.1 }));
    remaches(ps, [-2.6, W / 2 + 0.85, H - 2.2], [2.6, W / 2 + 0.85, H - 2.2], 2, 'bt_hierro', 0.6);
    // asas de los costados
    for (const s of [-1, 1]) {
      ps.push(caja(s * (L / 2 + 0.6), 0, H - 4.5, 1.2, 4.5, 1.4, { mat: 'bt_hierro' }));
      ps.push(palo([s * (L / 2 + 1.3), -2.4, H - 4], [s * (L / 2 + 1.6), -2.4, H - 7], 0.55, { mat: 'bt_hierro' }), palo([s * (L / 2 + 1.6), -2.4, H - 7], [s * (L / 2 + 1.6), 2.4, H - 7], 0.55, { mat: 'bt_hierro' }), palo([s * (L / 2 + 1.6), 2.4, H - 7], [s * (L / 2 + 1.3), 2.4, H - 4], 0.55, { mat: 'bt_hierro' }));
    }
  },
  tapa: (c) => {
    const { L, W, zt } = c, ps: Pieza[] = [];
    ps.push(tapaBisel(-L / 2, L / 2, W, zt, 5, 3.4, 'bt_mad_roble', 0.03, 0.3));
    ps.push(tapaBisel(-L / 2 - 0.3, L / 2 + 0.3, W, zt, 1.6, 1.1, 'bt_hierro', -0.02, 0.45));
    for (const x of [-L / 2 + 4, -4.6, 4.6, L / 2 - 4]) {
      ps.push(tapaBisel(x - 1.2, x + 1.2, W, zt, 5, 3.4, 'bt_hierro', 0, 0.42));
      remaches(ps, [x, -W / 2 + 3.6, zt + 5.6], [x, W / 2 - 3.6, zt + 5.6], 3);
    }
    for (const s of [-1, 1]) ps.push(tapaBisel(s * L / 2 - (s > 0 ? 3.2 : 0), s * L / 2 + (s < 0 ? 3.2 : 0), W, zt, 5, 3.4, 'bt_hierro', 0.04, 0.45));
    // aldaba
    ps.push(caja(0, W / 2 + 0.5, zt - 3.4, 2.4, 0.8, 4.6, { mat: 'bt_hierro', tono: 0.12 }), caja(0, W / 2 + 0.9, zt - 3.2, 1.0, 0.8, 1.8, { mat: 'bt_negro' }));
    return ps;
  },
  vivo: (ps, c) => {
    const { W, zt, fase, f } = c;
    if (fase === 'cerrado' || (fase === 'abriendo' && f === 0)) candado(ps, 0, W / 2 + 1.9, zt - 2.4);
    else if (fase === 'abriendo' && f === 1) candado(ps, 0.5, W / 2 + 3.2, zt - 5.5, true, 30);
    else candado(ps, 3.5, W / 2 + 4.5, 0.9, true, 88);
  },
  adentro: (ps, c) => {
    // una espada metida en el oro
    const { zt } = c;
    ps.push(palo([-6, 2, zt - 1], [-8.5, -1, zt + 6], 0.55, { mat: 'bt_cuero' }), palo([-8.7, -1.2, zt + 6], [-9, -1.5, zt + 6.6], 0.9, { mat: 'bt_laton' }));
    ps.push(palo([-4.3, -0.4, zt + 0.4], [-7.6, 4.2, zt + 1.4], 0.45, { mat: 'bt_laton', tono: 0.1 }));
  },
});

// -- noble: caoba tallada con molduras de oro y gemas
COFRES.push({
  id: 'cofre_noble', nombre: ['Cofre noble tallado', 'Carved noble chest'], L: 26, W: 15, H: 10, z0: 2.6, pared: 1.5,
  luz: 'bt_luz_oro', color: '#ffc458', brilloCerrado: [0, 9.6, 8.2], saltan: 8,
  cuerpo: (ps, c) => {
    const { L, W, H, z0, zt, R } = c, r = R(1);
    mancha(ps, r, L / 2 + 3, W / 2 + 3, 2);
    // patas de garra con bola
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      ps.push(esfera(sx * (L / 2 - 1.8), sy * (W / 2 - 1.8), 1.4, 1.6, { mat: 'bt_oro' }));
      ps.push(cilindro(sx * (L / 2 - 1.8), sy * (W / 2 - 1.8), 1.9, 1.3, 1.2, { mat: 'bt_oro', r1: 2.0, tono: -0.05 }));
    }
    ps.push(caja(0, 0, z0, L, W, H, { mat: 'bt_mad_caoba' }));
    // paneles tallados (rehundidos) al frente y al costado
    for (const x of [-7, 7]) ps.push(caja(x, W / 2, z0 + 2.2, 8.4, 1.4, H - 4.6, { mat: 'bt_mad_caoba', resta: true }));
    ps.push(caja(L / 2, 0, z0 + 2.2, 1.4, W - 5, H - 4.6, { mat: 'bt_mad_caoba', resta: true }));
    for (const x of [-7, 7]) {
      // filete de oro alrededor del panel y una roseta tallada
      ps.push(caja(x, W / 2 - 0.25, z0 + 1.8, 9.2, 0.6, 0.5, { mat: 'bt_oro' }), caja(x, W / 2 - 0.25, z0 + H - 2.4, 9.2, 0.6, 0.5, { mat: 'bt_oro' }));
      for (const s of [-1, 1]) ps.push(caja(x + s * 4.4, W / 2 - 0.25, z0 + 1.8, 0.5, 0.6, H - 3.7, { mat: 'bt_oro' }));
      ps.push(cilindro(x, W / 2 - 0.7, z0 + H / 2 - 0.1, 1.6, 0.6, { mat: 'bt_mad_caoba', eje: [0, 1, 0], tono: 0.1 }), esfera(x, W / 2 - 0.1, z0 + H / 2 - 0.1, 0.75, { mat: 'bt_oro' }));
      for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + Math.PI / 4; ps.push(elipsoide(x + Math.cos(t) * 1.9, W / 2 - 0.5, z0 + H / 2 - 0.1 + Math.sin(t) * 1.9, 0.8, 0.5, 0.8, { mat: 'bt_mad_caoba', tono: 0.14 })); }
    }
    ps.push(caja(L / 2 - 0.25, 0, z0 + 1.8, 0.6, W - 4.2, 0.5, { mat: 'bt_oro' }), caja(L / 2 - 0.25, 0, z0 + H - 2.4, 0.6, W - 4.2, 0.5, { mat: 'bt_oro' }));
    // molduras de oro: zócalo y borde, esquinas
    ps.push(caja(0, 0, z0 - 0.4, L + 1, W + 1, 1.4, { mat: 'bt_oro', tono: -0.06 }), caja(0, 0, zt - 1.1, L + 0.8, W + 0.8, 1.1, { mat: 'bt_oro' }));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(cilindro(sx * (L / 2), sy * (W / 2), z0 + 0.6, 0.9, H - 1.6, { mat: 'bt_oro', tono: 0.04 }));
    // escudo de la cerradura con un rubí
    ps.push(poliedro([[-2.8, W / 2, zt - 1], [2.8, W / 2, zt - 1], [2.8, W / 2, zt - 5], [0, W / 2, zt - 7.6], [-2.8, W / 2, zt - 5],
      [-2.8, W / 2 + 0.8, zt - 1], [2.8, W / 2 + 0.8, zt - 1], [2.8, W / 2 + 0.8, zt - 5], [0, W / 2 + 0.8, zt - 7.6], [-2.8, W / 2 + 0.8, zt - 5]], { mat: 'bt_oro', tono: 0.05 }));
    gema(ps, [0, W / 2 + 1.0, zt - 3.4], 1.35, 'bt_rubi', 'oval', 90, 90);
    ps.push(caja(0, W / 2 + 0.7, zt - 6.6, 0.6, 0.3, 1.3, { mat: 'bt_negro' }));
  },
  tapa: (c) => {
    const { L, W, zt } = c, ps: Pieza[] = [];
    ps.push(medioCil(-L / 2, L / 2, 0, zt, W / 2, 4.6, 9, 'bt_mad_caoba', 0.03));
    for (const x of [-L / 2, -0.9, L / 2 - 1.8]) ps.push(medioCil(x - 0.1, x + 1.9, 0, zt, W / 2 + 0.35, 4.95, 9, 'bt_oro'));
    // gemas en las bandas del arco
    for (const x of [-L / 2 + 0.85, 0, L / 2 - 0.85]) gema(ps, [x, W / 2 * Math.cos(1.0) + 0.5, zt + 4.6 * Math.sin(1.0) + 0.5], 0.95, x === 0 ? 'bt_esmeralda' : 'bt_zafiro', 'redondo', 50, 90);
    // tallado en arco sobre la tapa
    for (const x of [-6.5, 6.5]) ps.push(medioCil(x - 3.5, x + 3.5, 0, zt, W / 2 + 0.12, 4.72, 9, 'bt_mad_caoba', 0.12));
    ps.push(caja(0, W / 2 + 0.4, zt - 1.6, 2.2, 0.7, 2.6, { mat: 'bt_oro', tono: 0.1 }));
    return ps;
  },
  adentro: (ps, c) => {
    const { zt } = c;
    ps.push(...colocar(caliz(0.75, 'bt_rubi', 'bt_oro', 'oro'), [-6, -1.5, zt - 0.3], 0, 8, 30));
    gema(ps, [4, 1.5, zt + 1.3], 1.3, 'bt_zafiro', 'esmeralda', 25, 40);
    gema(ps, [7.5, -1.5, zt + 0.9], 1.2, 'bt_rubi', 'pera', 30, 120);
    gema(ps, [0.5, 2.5, zt + 1.5], 1.0, 'bt_esmeralda', 'redondo', 20, 200);
  },
});

// -- maldito: hierro negro, costillas de hueso, cadenas y un ojo que late en la cerradura
/** Eslabones de cadena a lo largo de puntos (alternan de plano). */
function cadena(ps: Pieza[], pts: V3[], mat = 'bt_hierro', paso = 2.0) {
  let k = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d), n = Math.max(1, Math.round(l / paso));
    for (let j = 0; j < n; j++, k++) {
      const t = (j + 0.5) / n, cpos: V3 = [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t];
      const e: V3 = [d[0] / l, d[1] / l, d[2] / l];
      // eslabón: elipsoide largo en la dirección de la cadena, aplanado alternando
      const up: V3 = Math.abs(e[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
      const s1: V3 = [e[1] * up[2] - e[2] * up[1], e[2] * up[0] - e[0] * up[2], e[0] * up[1] - e[1] * up[0]];
      const l1 = Math.hypot(...s1); const n1: V3 = [s1[0] / l1, s1[1] / l1, s1[2] / l1];
      const n2: V3 = [e[1] * n1[2] - e[2] * n1[1], e[2] * n1[0] - e[0] * n1[2], e[0] * n1[1] - e[1] * n1[0]];
      const [ax, ay] = k % 2 ? [n1, n2] : [n2, n1];
      ps.push({ k: 'elip', c: cpos, ex: e, ey: ax, ez: ay, r: [paso * 0.64, 1.15, 0.5], mat, tono: k % 2 ? 0.14 : -0.08 } as Pieza);
    }
  }
}
const pulso = (f: number) => 0.5 + 0.5 * Math.sin((f / 8) * Math.PI * 2);
COFRES.push({
  id: 'cofre_maldito', nombre: ['Cofre maldito', 'Cursed chest'], L: 26, W: 15, H: 10, z0: 1.2, pared: 1.6,
  luz: 'bt_luz_maldita', color: '#8a3cc0', saltan: 7,
  luzCerrado: (c) => ({ c: [0, c.W / 2 + 3, c.z0 + 5.2], r: 8 + pulso(c.f) * 5, color: '#ff5a18' }),
  cuerpo: (ps, c) => {
    const { L, W, H, z0, zt, R } = c, r = R(1);
    mancha(ps, r, L / 2 + 4, W / 2 + 4, 4, 'tierra');
    // zócalo de hierro y el cajón
    ps.push(caja(0, 0, 0, L + 1.6, W + 1.6, z0 + 0.6, { mat: 'bt_hierro_negro', tono: -0.04 }));
    ps.push(caja(0, 0, z0, L, W, H, { mat: 'bt_hierro_negro' }));
    // costillas de hueso al frente y al costado
    for (const x of [-10, -6, 6, 10]) ps.push(masa([hueso([x, W / 2 + 0.3, z0 + 0.8], [x + (x > 0 ? 0.6 : -0.6), W / 2 + 0.7, z0 + H / 2], 0.75, 0.95), hueso([x + (x > 0 ? 0.6 : -0.6), W / 2 + 0.7, z0 + H / 2], [x, W / 2 + 0.3, zt - 0.4], 0.95, 0.7)], { mat: 'bt_hueso', suave: 0.6 }));
    for (const y of [-3.5, 3.5]) ps.push(palo([L / 2 + 0.3, y, z0 + 0.8], [L / 2 + 0.6, y, zt - 0.4], 0.8, { mat: 'bt_hueso', r1: 0.7 }));
    // calaveras en las esquinas del frente y púas
    for (const sx of [-1, 1]) {
      calavera(ps, sx * (L / 2 - 0.4), W / 2 - 0.2, zt - 2.2, 2.3, 'bt_ojo');
      ps.push(poliedro([[sx * L / 2 - 1, -W / 2 - 0.6, zt], [sx * L / 2 + 1, -W / 2 - 0.6, zt], [sx * L / 2, -W / 2 - 0.6, zt + 1], [sx * L / 2, -W / 2 - 1.4, zt + 0.3], [sx * (L / 2 + 1.5), -W / 2 - 2.4, zt + 4]], { mat: 'bt_hierro_negro', tono: 0.08 }));
    }
    // el ojo de la cerradura: cuenca de hierro, globo, iris que late, pupila de gato
    const zE = z0 + 5.2, yE = W / 2;
    ps.push(cilindro(0, yE - 0.3, zE, 3.9, 1.0, { mat: 'bt_hierro_negro', eje: [0, 1, 0], tono: 0.14 }));
    for (let i = 0; i < 7; i++) { const t = (i / 7) * Math.PI * 2 + 0.26; ps.push(poliedro([[Math.cos(t) * 3.6, yE + 0.6, zE + Math.sin(t) * 3.6], [Math.cos(t + 0.3) * 3.6, yE + 0.6, zE + Math.sin(t + 0.3) * 3.6], [Math.cos(t + 0.15) * 5.4, yE + 0.3, zE + Math.sin(t + 0.15) * 5.4], [Math.cos(t + 0.15) * 3.7, yE + 0.1, zE + Math.sin(t + 0.15) * 3.7]], { mat: 'bt_hierro_negro', tono: 0.08 })); }
    const pul = pulso(c.f), parpado = c.fase === 'cerrado' && c.f === 6 ? 1 : c.fase === 'vacio' ? 0.55 : 0;
    ps.push(elipsoide(0, yE + 0.6, zE, 3.2, 1.6, 2.7, { mat: 'bt_hueso', tono: 0.16 }));
    // venitas
    for (const [a0, a1] of [[0.4, 0.9], [2.5, 2.1], [3.6, 4.0], [5.5, 5.1]]) ps.push(palo([Math.cos(a0) * 2.9, yE + 1.35, zE + Math.sin(a0) * 2.3], [Math.cos(a1) * 1.9, yE + 1.95, zE + Math.sin(a1) * 1.7], 0.22, { mat: 'bt_ojo', tono: -0.55 }));
    ps.push(cilindro(0, yE + 1.75, zE - 0.1, 1.65 + pul * 0.2, 0.5, { mat: 'bt_ojo', eje: [0, 1, 0], tono: -0.05 + pul * 0.22 }));
    ps.push(cilindro(0, yE + 2.0, zE - 0.1, 1.0, 0.35, { mat: 'bt_ojo', eje: [0, 1, 0], tono: 0.1 + pul * 0.15 }));
    ps.push(caja(0, yE + 2.3, zE - 1.25, 0.5 + (1 - pul) * 0.35, 0.2, 2.3, { mat: 'bt_negro' }));
    ps.push(elipsoide(0, yE + 0.75, zE + 2.4 - parpado * 2.2, 3.5, 1.9, 1.0 + parpado * 1.2, { mat: 'bt_hierro_negro', tono: 0.12 }));
    ps.push(elipsoide(0, yE + 0.75, zE - 2.5, 3.3, 1.8, 0.7, { mat: 'bt_hierro_negro', tono: 0.08 }));
  },
  tapa: (c) => {
    const { L, W, zt } = c, ps: Pieza[] = [];
    ps.push(medioCil(-L / 2, L / 2, 0, zt, W / 2, 6, 9, 'bt_hierro_negro'));
    ps.push(caja(0, 0, zt - 0.01, L + 0.4, W + 0.4, 0.9, { mat: 'bt_hierro_negro', tono: 0.06 }));
    // costillar de hueso sobre la tapa y el espinazo
    for (const x of [-10, -6, -2, 2, 6, 10]) ps.push(medioCil(x - 0.8, x + 0.8, 0, zt + 0.1, W / 2 + 0.55, 6.5, 9, 'bt_hueso', Math.abs(x) < 4 ? 0.04 : 0));
    ps.push(palo([-L / 2 - 1, 0, zt + 6.4], [L / 2 + 1, 0, zt + 6.4], 0.9, { mat: 'bt_hueso', tono: -0.05 }));
    for (let x = -L / 2; x <= L / 2; x += 3.3) ps.push(elipsoide(x, 0, zt + 7, 1.2, 1.4, 0.9, { mat: 'bt_hueso', tono: 0.06 }));
    return ps;
  },
  vivo: (ps, c) => {
    const { L, W, z0, zt, fase, f } = c;
    const ent = fase === 'cerrado' || (fase === 'abriendo' && f === 0);
    for (const x of [-L / 4 - 1, L / 4 + 1]) {
      if (ent) {
        // dos cadenas en cruz sobre la tapa
        const s = Math.sign(x), pts: V3[] = [[-s * (L / 2 - 2.5), W / 2 + 1.1, z0 + 1.5]];
        for (let i = 0; i <= 6; i++) { const t = (i / 6) * Math.PI; pts.push([-s * (L / 2 - 2.5) + s * (L - 5) * (0.1 + 0.8 * i / 6), Math.cos(t) * (W / 2 + 1.3), zt + Math.sin(t) * 7.3]); }
        pts.push([s * (L / 2 - 2.5), -W / 2 - 1.1, z0 + 1.5]);
        cadena(ps, pts);
      } else if (fase === 'abriendo' && f === 1) {
        // la cadena revienta: eslabones que saltan
        const rr = c.R(x > 0 ? 91 : 92);
        for (let i = 0; i < 9; i++) { const t = rr() * Math.PI; ps.push(elipsoide(x + (rr() - 0.5) * 6, Math.cos(t) * (W / 2 + 4), zt + Math.sin(t) * 9 + 2, 1.1, 0.9, 0.42, { mat: 'bt_hierro', giro: rr() * 180, incl: rr() * 90 })); }
      } else {
        // cadena rota en el piso, al frente
        const rr = c.R(x > 0 ? 93 : 94), pts: V3[] = [[x - 1, W / 2 + 1.2, 0.5]];
        for (let i = 1; i < 5; i++) pts.push([x + (rr() - 0.5) * 5 + i * 0.6, W / 2 + 1.5 + i * 1.4, 0.5]);
        cadena(ps, pts);
      }
    }
  },
  adentro: (ps, c) => {
    const { zt } = c;
    calavera(ps, -5.5, 0.5, zt + 1.6, 2.2, 'bt_luz_maldita');
    gema(ps, [5, 1, zt + 1.4], 1.5, 'bt_amatista', 'marquesa', 25, 30);
    gema(ps, [8, -1.5, zt + 1], 1.1, 'bt_amatista_luz', 'redondo', 15, 70);
  },
});

// -- relicario de piedra: sarcófago del tesoro con arcadas y tapa a dos aguas que se corre
COFRES.push({
  id: 'cofre_sarcofago_tesoro', nombre: ['Relicario de piedra', 'Stone reliquary'], L: 34, W: 18, H: 12, z0: 3, pared: 2.2, corre: true,
  luz: 'bt_luz_santa', color: '#fff0c4', brilloCerrado: [6, 1, 24.5], saltan: 7,
  cuerpo: (ps, c) => {
    const { L, W, H, z0, zt, R } = c, r = R(1);
    mancha(ps, r, L / 2 + 5, W / 2 + 5, 4, 'tierra');
    ps.push(caja(0, 0, 0, L + 5, W + 5, 1.6, { mat: 'bt_piedra', tono: -0.06 }), caja(0, 0, 1.6, L + 3, W + 3, 1.4, { mat: 'bt_piedra', tono: -0.02 }));
    ps.push(caja(0, 0, z0, L, W, H, { mat: 'bt_piedra' }));
    // arcadas: nichos con arco al frente (4) y al costado (2)
    const nicho = (u: number, ancho: number, frente: boolean) => {
      const zb = z0 + 1.6, h = H - 5.2;
      if (frente) ps.push(caja(u, W / 2, zb, ancho, 1.6, h, { mat: 'bt_piedra', resta: true }), cilindro(u, W / 2 - 0.8, zb + h, ancho / 2, 1.6, { mat: 'bt_piedra', resta: true, eje: [0, 1, 0] }));
      else ps.push(caja(L / 2, u, zb, 1.6, ancho, h, { mat: 'bt_piedra', resta: true }), cilindro(L / 2 - 0.8, u, zb + h, ancho / 2, 1.6, { mat: 'bt_piedra', resta: true, eje: [1, 0, 0] }));
    };
    for (const u of [-11.4, -3.8, 3.8, 11.4]) nicho(u, 5, true);
    for (const u of [-4, 4]) nicho(u, 5, false);
    // en cada nicho, un sol de oro; columnitas entre nichos
    for (const u of [-11.4, -3.8, 3.8, 11.4]) { ps.push(cilindro(u, W / 2 - 0.85, z0 + 6.6, 1.25, 0.5, { mat: 'bt_oro', eje: [0, 1, 0] })); for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; ps.push(palo([u + Math.cos(t) * 1.3, W / 2 - 0.6, z0 + 6.6 + Math.sin(t) * 1.3], [u + Math.cos(t) * 2.1, W / 2 - 0.6, z0 + 6.6 + Math.sin(t) * 2.1], 0.3, { mat: 'bt_oro', r1: 0.1 })); } }
    for (const u of [-15.6, -7.6, 0, 7.6, 15.6]) ps.push(cilindro(u, W / 2 + 0.1, z0 + 1, 0.85, H - 3.2, { mat: 'bt_piedra', tono: 0.08 }));
    // cornisa con filete de oro
    ps.push(caja(0, 0, zt - 1.6, L + 1.4, W + 1.4, 1.6, { mat: 'bt_piedra', tono: 0.06 }), caja(0, 0, zt - 2.1, L + 0.9, W + 0.9, 0.5, { mat: 'bt_oro', tono: -0.08 }));
    ps.push(caja(0, 0, z0, L + 1.2, W + 1.2, 1.2, { mat: 'bt_piedra', tono: 0.03 }));
    // grietas y musgo
    ps.push(caja(-13, W / 2 + 0.2, z0 + 3, 0.35, 0.8, 4, { mat: 'bt_negro', tono: 0.1 }), elipsoide(L / 2 + 0.5, W / 2 - 2, z0 + 0.5, 2.5, 3, 1.2, { mat: 'musgo' }));
  },
  tapa: (c) => {
    const { L, W, zt } = c, ps: Pieza[] = [], a = L / 2 + 0.9, b = W / 2 + 0.9, h1 = 1.6, h2 = 6;
    ps.push(caja(0, 0, zt, 2 * a, 2 * b, h1, { mat: 'bt_piedra', tono: 0.04 }));
    ps.push(poliedro([[-a + 0.6, -b + 0.6, zt + h1], [a - 0.6, -b + 0.6, zt + h1], [a - 0.6, b - 0.6, zt + h1], [-a + 0.6, b - 0.6, zt + h1], [-a + 0.6, 0, zt + h1 + h2], [a - 0.6, 0, zt + h1 + h2]], { mat: 'bt_piedra', tono: 0.02 }));
    // tejas talladas: costillas a lo ancho del faldón
    for (let x = -a + 3.5; x < a - 2; x += 4.2) ps.push(poliedro([[x - 0.5, -b + 0.4, zt + h1], [x + 0.5, -b + 0.4, zt + h1], [x - 0.5, b - 0.4, zt + h1], [x + 0.5, b - 0.4, zt + h1], [x - 0.5, 0, zt + h1 + h2 + 0.45], [x + 0.5, 0, zt + h1 + h2 + 0.45]], { mat: 'bt_piedra', tono: 0.1 }));
    // cresta de oro y remates
    ps.push(palo([-a + 0.4, 0, zt + h1 + h2 + 0.2], [a - 0.4, 0, zt + h1 + h2 + 0.2], 0.75, { mat: 'bt_oro' }));
    for (const s of [-1, 1]) {
      ps.push(caja(s * (a - 1), 0, zt + h1 + h2 - 0.2, 0.9, 0.9, 4.2, { mat: 'bt_oro' }), caja(s * (a - 1), 0, zt + h1 + h2 + 2.2, 0.9, 3.0, 0.9, { mat: 'bt_oro' }));
      for (const sy of [-1, 1]) ps.push(poliedro([[s * a - 1.6 * s, sy * b, zt + h1], [s * a, sy * b, zt + h1], [s * a, sy * (b - 1.6), zt + h1], [s * a - 0.8 * s, sy * (b - 0.8), zt + h1 + 2.6]], { mat: 'bt_piedra', tono: 0.12 }));
    }
    ps.push(cilindro(a, 0, zt + h1 + 2.0, 1.6, 0.4, { mat: 'bt_oro', eje: [1, 0, 0] }));
    ps.push(caja(0, b - 0.1, zt + h1 - 0.5, 2 * a - 1, 0.4, 0.5, { mat: 'bt_oro', tono: -0.05 }));
    return ps;
  },
  adentro: (ps, c) => {
    const { zt } = c, x0 = -c.L * 0.2;
    ps.push(...colocar(corona(0.85), [x0 - 4 * Math.sign(x0 || 1), 1.5, zt + 0.6], 20, 18, 120));
    // cruz relicario
    ps.push(...colocar([caja(0, 0, 0, 1.2, 1.2, 8, { mat: 'bt_oro' }), caja(0, 0, 5, 4.4, 1.2, 1.2, { mat: 'bt_oro' }), esfera(0, 0.7, 5.6, 0.8, { mat: 'bt_rubi' })], [x0 + 5 * Math.sign(x0 || 1), -2, zt - 0.5], 10, 35, 100));
  },
});

// -- el cofre de la casa GG: ébano, cuero rojo, latón y el escudo con las dos G entrelazadas
/** Una G de trazo redondo en el plano del frente (y fija): centro (cx, cz), radio `ro`. */
function letraG(ps: Pieza[], cx: number, y: number, cz: number, ro: number, t: number, mat: string, tono = 0.08) {
  const rm = ro - t / 2, n = 12, a0 = (48 * Math.PI) / 180, a1 = Math.PI * 2;
  let prev: V3 | null = null;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n, p: V3 = [cx + Math.cos(a) * rm, y, cz + Math.sin(a) * rm];
    if (prev) ps.push(palo(prev, p, t / 2, { mat, tono }));
    ps.push(esfera(p[0], p[1], p[2], t / 2, { mat, tono }));
    prev = p;
  }
  ps.push(palo([cx + rm, y, cz - t * 0.15], [cx + ro * 0.15, y, cz - t * 0.15], t / 2, { mat, tono: 0.06 }), esfera(cx + ro * 0.15, y, cz - t * 0.15, t / 2, { mat }));
}
COFRES.push({
  id: 'cofre_gg', nombre: ['Cofre de la casa GG', 'House GG chest'], L: 32, W: 17, H: 14, z0: 1.6, pared: 1.6,
  luz: 'bt_luz_oro', color: '#ffbe50', brilloCerrado: [4.2, 10.6, 13.6], saltan: 10,
  cuerpo: (ps, c) => {
    const { L, W, H, z0, zt, R } = c, r = R(1);
    mancha(ps, r, L / 2 + 3, W / 2 + 3, 2);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(cilindro(sx * (L / 2 - 1.6), sy * (W / 2 - 1.6), 0, 1.5, z0 + 0.2, { mat: 'bt_laton', r1: 1.9 }));
    ps.push(caja(0, 0, z0, L, W, H, { mat: 'bt_mad_ebano' }));
    ps.push(caja(0, 0, z0, L + 0.8, W + 0.8, 1.3, { mat: 'bt_laton', tono: -0.06 }), caja(0, 0, zt - 1.2, L + 0.7, W + 0.7, 1.2, { mat: 'bt_laton' }));
    esquineros(ps, L, W, z0, H, 'bt_laton', 3, 0.6);
    for (const sx of [-1, 1]) {
      remaches(ps, [sx * (L / 2 - 1.5), W / 2 + 0.7, z0 + 2.6], [sx * (L / 2 - 1.5), W / 2 + 0.7, zt - 2.4], 3, 'bt_laton', 0.5);
      // flejes de latón a cada lado del escudo
      ps.push(caja(sx * 11.6, 0, z0, 1.8, W + 0.6, H, { mat: 'bt_laton', tono: -0.04 }));
    }
    // el escudo: borde de latón, campo de esmalte rojo, GG de latón
    const y0 = W / 2, w = 17, top = zt - 0.2, h = H - 0.1;
    const forma = (s: number, dz = 0): [number, number][] => [[-w / 2 * s, top - dz], [w / 2 * s, top - dz], [w / 2 * s, top - h * 0.48], [w * 0.36 * s, top - h * 0.76], [w * 0.17 * s, top - h * 0.92 + dz * 0.5], [0, top - h + dz], [-w * 0.17 * s, top - h * 0.92 + dz * 0.5], [-w * 0.36 * s, top - h * 0.76], [-w / 2 * s, top - h * 0.48]];
    ps.push(prismaXZ(forma(1), y0 - 0.2, y0 + 0.9, 'bt_laton', 0.05));
    ps.push(prismaXZ(forma(0.86, 1.0), y0, y0 + 1.15, 'bt_esmalte', -0.06));
    const ro = 3.7, cz = top - h * 0.4, sep = ro * 0.8;
    letraG(ps, -sep, y0 + 1.4, cz, ro, 1.4, 'bt_laton');
    letraG(ps, sep, y0 + 1.75, cz, ro, 1.4, 'bt_laton');
    ps.push(caja(0, y0 + 1.1, top - h * 0.82, 0.6, 0.3, 1.4, { mat: 'bt_negro' }));
    // en los costados: placa de latón con un anillo para cargarlo
    for (const s of [-1, 1]) {
      ps.push(caja(s * (L / 2 + 0.2), 0, z0 + 2.5, 0.6, W - 6, H - 5, { mat: 'bt_laton', tono: -0.08 }), caja(s * (L / 2 + 0.35), 0, z0 + 3.3, 0.6, W - 7.6, H - 6.6, { mat: 'bt_esmalte' }));
      ps.push(cilindro(s * (L / 2 + 0.6), 0, zt - 4.6, 1.2, 0.8, { mat: 'bt_laton', eje: [1, 0, 0], tono: 0.1 }));
      const k = s * (L / 2 + 1.1);
      ps.push(palo([k, -2, zt - 4.6], [k, -2.2, zt - 7.3], 0.45, { mat: 'bt_laton' }), palo([k, -2.2, zt - 7.3], [k, 2.2, zt - 7.3], 0.45, { mat: 'bt_laton' }), palo([k, 2.2, zt - 7.3], [k, 2, zt - 4.6], 0.45, { mat: 'bt_laton' }));
    }
  },
  tapa: (c) => {
    const { L, W, zt } = c, ps: Pieza[] = [];
    ps.push(medioCil(-L / 2, L / 2, 0, zt, W / 2, 5.2, 9, 'bt_cuero_rojo'));
    ps.push(caja(0, 0, zt - 0.01, L + 0.4, W + 0.4, 0.8, { mat: 'bt_laton', tono: -0.05 }), caja(0, 0, zt - 0.06, L - 1.6, W - 1.6, 0.8, { mat: 'bt_terciopelo' }));
    for (const x of [-L / 2 - 0.2, L / 2 - 1.2]) ps.push(medioCil(x, x + 1.4, 0, zt, W / 2 + 0.35, 5.55, 9, 'bt_laton'));
    for (const x of [-11.6, 11.6]) ps.push(medioCil(x - 0.9, x + 0.9, 0, zt, W / 2 + 0.3, 5.5, 9, 'bt_laton', -0.04));
    // tachuelas de latón por el borde del cuero
    for (let x = -L / 2 + 2.6; x <= L / 2 - 2.5; x += 2.2) if (Math.abs(Math.abs(x) - 11.6) > 1.4) ps.push(esfera(x, W / 2 + 0.15, zt + 1.1, 0.48, { mat: 'bt_laton', tono: 0.15 }), esfera(x, 0, zt + 5.4, 0.48, { mat: 'bt_laton', tono: 0.15 }));
    // asa de latón arriba
    ps.push(palo([-3, 0, zt + 5.3], [-2.5, 0, zt + 6.8], 0.45, { mat: 'bt_laton' }), palo([-2.5, 0, zt + 6.8], [2.5, 0, zt + 6.8], 0.45, { mat: 'bt_laton' }), palo([2.5, 0, zt + 6.8], [3, 0, zt + 5.3], 0.45, { mat: 'bt_laton' }));
    return ps;
  },
  adentro: (ps, c) => {
    const { L, W, zt } = c;
    // forro de terciopelo en los bordes de adentro
    ps.push(caja(0, -W / 2 + 1.9, zt - 2.5, L - 3.6, 0.5, 2.4, { mat: 'bt_terciopelo' }), caja(-L / 2 + 1.9, 0, zt - 2.5, 0.5, W - 3.6, 2.4, { mat: 'bt_terciopelo' }));
    ps.push(...colocar(corona(0.7), [-6.5, -1, zt + 0.4], 0, 14, 60));
    ps.push(...colocar(caliz(0.72, 'bt_esmeralda', 'bt_oro', 'oro'), [6, -1.8, zt - 0.4], 0, 0, 0));
    gema(ps, [1, 2.5, zt + 1.4], 1.2, 'bt_rubi', 'oval', 20, 30);
  },
});

// ------------------------------------------------------------------ registrar cofres
const VARIANTES_COFRE = ['cerrado', 'abriendo', 'abierto', 'vacio'];
for (const T of COFRES) {
  registrar({
    id: T.id, nombre: T.nombre, tema: 'comun', variantes: [...VARIANTES_COFRE, ...VARIANTES_COFRE.map((v) => v + '_y')],
    cuadros: 8, t: 3, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => armarCofre(T, v, f, a.seed),
  });
}

// ------------------------------------------------------------------ oro en el piso
type Bulto = [number, number, number, number, number];
/** Alto de un montón (varios bultos de elipsoide) en (x, y). */
const alto = (bs: Bulto[], x: number, y: number) => { let z = 0; for (const [cx, cy, rx, ry, rz] of bs) { const k = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2; if (k > 0) z = Math.max(z, rz * Math.sqrt(k)); } return z; };
const normalMonton = (bs: Bulto[], x: number, y: number): V3 => { const e = 0.6, dx = (alto(bs, x + e, y) - alto(bs, x - e, y)) / (2 * e), dy = (alto(bs, x, y + e) - alto(bs, x, y - e)) / (2 * e); const l = Math.hypot(dx, dy, 1); return [-dx / l, -dy / l, 1 / l]; };
/** El montón: bultos de monedas recortados al piso, monedas sueltas encima con la pendiente. */
function monton(ps: Pieza[], bs: Bulto[], R: () => number, nSup: number, mat = 'bt_oro_monedas') {
  for (const [cx, cy, rx, ry, rz] of bs) ps.push(elipsoide(cx, cy, 0, rx, ry, rz, { mat, giro: 0 }));
  ps.push(caja(0, 0, -30, 200, 200, 30, { mat: 'bt_negro', resta: true }));
  for (let i = 0; i < nSup; i++) {
    const [cx, cy, rx, ry] = bs[Math.floor(R() * bs.length)], ang = R() * Math.PI * 2, d = Math.sqrt(R()) * 0.92;
    const x = cx + Math.cos(ang) * rx * d, y = cy + Math.sin(ang) * ry * d, n = normalMonton(bs, x, y);
    const z = alto(bs, x, y), j = R();
    moneda(ps, x, y, z + 0.15, [n[0] + (j - 0.5) * 0.6, n[1] + (R() - 0.5) * 0.6, n[2]], (R() - 0.5) * 0.24);
  }
}
/** Columna de monedas apiladas (algo corridas). */
function pila(ps: Pieza[], R: () => number, x: number, y: number, n: number) {
  for (let i = 0; i < n; i++) moneda(ps, x + (R() - 0.5) * 0.5, y + (R() - 0.5) * 0.5, 0.4 + i * 0.74, normalInc(R() * 6, R() * 360), (R() - 0.5) * 0.15 + (i === n - 1 ? 0.06 : 0));
}
/** Destellos que se turnan en `sitios` a lo largo de un ciclo de `n` cuadros. */
function centelleo(ps: Pieza[], sitios: V3[], f: number, n: number, mat = 'bt_destello', escala = 1) {
  const curva = [1.3, 3.1, 1.7, 0.6];
  sitios.forEach((p, i) => { const k = (f - Math.floor((i * n) / sitios.length) + n * 4) % n; if (k < curva.length) estrella(ps, p[0], p[1], p[2], curva[k] * escala, mat); });
}
const sitiosEn = (bs: Bulto[], R: () => number, n: number): V3[] => Array.from({ length: n }, () => { const [cx, cy, rx, ry] = bs[Math.floor(R() * bs.length)], a = R() * Math.PI * 2, d = Math.sqrt(R()) * 0.8, x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d; return [x + 0.6, y + 0.6, alto(bs, x, y) + 1.2] as V3; });

const MONTONES: Record<string, Bulto[]> = {
  pequeno: [[0, 0, 4.6, 4.0, 2.2], [1.2, -1, 2.6, 2.3, 3.0]],
  mediano: [[0, 0, 8, 7, 3.6], [1.8, -1.5, 4.6, 4.1, 5.0], [-3.2, 2.2, 3.6, 3.1, 3.0]],
  grande: [[0, 0, 12, 10.5, 5.4], [2.6, -2, 7, 6, 7.6], [-4.8, 3.4, 5.2, 4.5, 5.0], [5.2, 5.0, 4.2, 3.6, 3.2], [-6, -4, 4, 3.5, 3.4]],
};
registrar({
  id: 'oro_monton', nombre: ['Montón de oro', 'Gold pile'], tema: 'comun', variantes: ['pequeno', 'mediano', 'grande'], cuadros: 6, t: 4,
  huella: [1, 1], huellaPor: { grande: [2, 2] }, bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], bs = MONTONES[v] ?? MONTONES.pequeno, k = v === 'grande' ? 2 : v === 'mediano' ? 1 : 0;
    const R = azar(a.seed, 1), rx = bs[0][2];
    monton(ps, bs, R, [9, 22, 40][k]);
    monedasPiso(ps, R, [7, 14, 24][k], 0, 0, rx * 0.85, rx + [4, 6, 8][k]);
    if (k >= 1) { pila(ps, R, rx + 1.5, -2, 4 + k); gema(ps, [-1.5, 3.5, alto(bs, -1.5, 3.5) + 0.8], 1.2, 'bt_rubi', 'oval', 25, 60); }
    if (k === 2) {
      pila(ps, R, -rx * 0.4, rx * 0.9, 3); pila(ps, R, rx * 0.7, rx * 0.6, 6);
      gema(ps, [4, 1, alto(bs, 4, 1) + 0.8], 1.3, 'bt_zafiro', 'redondo', 30, 200);
      gema(ps, [-6, -1, alto(bs, -6, -1) + 0.7], 1.1, 'bt_esmeralda', 'esmeralda', 25, 20);
      ps.push(...colocar(caliz(0.8, 'bt_zafiro'), [-7.5, 6.5, 2.4], 30, 78, 120));
    }
    centelleo(ps, sitiosEn(bs, azar(a.seed, 2), [2, 3, 5][k]), f, 6);
    return ps;
  },
});

registrar({
  id: 'oro_caida', nombre: ['Oro que cae', 'Gold drop'], tema: 'comun', variantes: ['pocas', 'muchas'], cuadros: 8, t: 2, huella: [1, 1], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], R = azar(a.seed, 3), n = v === 'muchas' ? 16 : 8;
    // el estallido al soltar
    if (f === 0) { estrella(ps, 0, 0, 4, 5.5); ps.push(esfera(0, 0, 2, 2.2, { mat: 'bt_luz_oro', tono: 0.1 })); }
    if (f === 1) { estrella(ps, 0.5, 0.5, 6, 3); ps.push(esfera(0, 0, 1.4, 1.2, { mat: 'bt_luz_oro', tono: -0.05 })); }
    for (let i = 0; i < n; i++) {
      const ang = R() * Math.PI * 2, vr = 0.6 + R() * 0.85, vz = 4.0 + R() * 1.5, giroV = 70 + R() * 70, ph = R() * 360, t0 = R() * 0.6;
      const q = vuelo([Math.cos(ang) * 0.8, Math.sin(ang) * 0.8, 1.6], [Math.cos(ang) * vr, Math.sin(ang) * vr, vz], 2.0, f + 0.6 - t0, 0.4, 0.3);
      moneda(ps, q.p[0], q.p[1], q.p[2], q.aire ? normalInc(ph + giroV * (f + 1), ph * 1.7) : normalInc(4 + (i % 3) * 5, ph), q.aire ? 0.06 : 0);
      // al caer, una chispa
      if (!q.aire && f < 7) { const qa = vuelo([Math.cos(ang) * 0.8, Math.sin(ang) * 0.8, 1.6], [Math.cos(ang) * vr, Math.sin(ang) * vr, vz], 2.0, f - 0.4 - t0, 0.4, 0.3); if (qa.aire && i % 2 === 0) estrella(ps, q.p[0] + 0.5, q.p[1] + 0.5, 1.8, 2.2); }
    }
    return ps;
  },
});

registrar({
  id: 'oro_moneda', nombre: ['Moneda que gira', 'Spinning coin'], tema: 'comun', variantes: ['oro'], cuadros: 8, t: 3, huella: [1, 1], bloquea: false,
  armar: (_v, f) => {
    const ps: Pieza[] = [], th = (f / 8) * Math.PI + Math.PI / 4, z = 5.0 + Math.sin((f / 8) * Math.PI * 2) * 0.8;
    const e: V3 = [Math.cos(th), Math.sin(th), 0];
    ps.push(cilindro(-e[0] * 0.55, -e[1] * 0.55, z, 3.4, 1.1, { mat: 'bt_oro', eje: e, tono: 0.1 }));
    ps.push(cilindro(-e[0] * 0.68, -e[1] * 0.68, z, 2.5, 1.36, { mat: 'bt_oro', eje: e, tono: 0.2 }));
    ps.push(cilindro(-e[0] * 0.76, -e[1] * 0.76, z, 1.0, 1.52, { mat: 'bt_oro', eje: e, tono: -0.05 }));
    // de frente a la cámara: el destello
    if (f === 0) estrella(ps, 1.6, 1.6, z + 1.2, 3.2);
    if (f === 1) estrella(ps, 1.6, 1.6, z + 1.2, 1.4);
    return ps;
  },
});

const CORTES: Record<string, Corte> = { rubi: 'oval', zafiro: 'redondo', esmeralda: 'esmeralda', amatista: 'pera', topacio: 'marquesa', diamante: 'redondo' };
registrar({
  id: 'gema_suelo', nombre: ['Gema en el piso', 'Dropped gem'], tema: 'comun', variantes: Object.keys(CORTES), cuadros: 6, t: 4, huella: [1, 1], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], R = azar(a.seed, 5), g = v in CORTES ? v : 'rubi', r = g === 'diamante' ? 2.6 : 3.0;
    const inc = 20 + R() * 15, rumbo = 30 + R() * 40, pul = Math.sin((f / 6) * Math.PI * 2);
    gema(ps, [0, 0, r * 0.62], r, 'bt_' + g, CORTES[g], inc, rumbo, 0.03 + pul * 0.05);
    // el fuego de adentro asoma por la mesa
    const m = mulMM(rotM([0, 0, 1], rumbo), rotM([0, 1, 0], inc)), top = mulM(m, [0, 0, r * 0.42]);
    ps.push(esfera(top[0], top[1], top[2] + r * 0.62 - 0.25, 0.75 + pul * 0.12, { mat: 'bt_' + g + '_luz', tono: pul * 0.12 }));
    const s = [0, 0, 1.4, 3.4, 1.6, 0.6][f];
    if (s) estrella(ps, top[0] + 0.9, top[1] + 0.9, top[2] + r * 0.62 + 0.6, s, g === 'diamante' || g === 'zafiro' ? 'bt_chispa' : 'bt_destello');
    return ps;
  },
});

// ------------------------------------------------------------------ pilares de luz bajo lo que cae al piso
const PILARES: Record<string, { n: number; H: number; base: number; motas: number; brasas?: number; orbita?: boolean }> = {
  normal: { n: 5, H: 52, base: -0.32, motas: 0 },
  magico: { n: 8, H: 68, base: -0.1, motas: 4 },
  raro: { n: 9, H: 74, base: -0.06, motas: 5 },
  conjunto: { n: 9, H: 74, base: -0.06, motas: 6 },
  unico: { n: 11, H: 88, base: 0, motas: 6, orbita: true },
  legendario: { n: 13, H: 108, base: 0.04, motas: 6, brasas: 12 },
};
registrar({
  id: 'botin_pilar', nombre: ['Pilar de luz del botín', 'Loot light pillar'], tema: 'comun', variantes: Object.keys(PILARES), cuadros: 8, t: 3,
  huella: [1, 1], bloquea: false, plano: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], P = PILARES[v] ?? PILARES.normal, mat = 'bt_haz_' + (v in PILARES ? v : 'normal'), R = azar(a.seed, 7), ciclo = f / 8;
    // haces: rayas de pie que suben a trozos y se apagan arriba
    for (let i = 0; i < P.n; i++) {
      const ang = i * 2.39996 + R() * 0.5, rho = 0.6 + Math.sqrt(R()) * 4.4, Hi = P.H * (0.55 + R() * 0.45), w = 0.42 + R() * 0.3;
      const per = 14 + R() * 12, llena = 0.55 + R() * 0.3, ph = R();
      const x = Math.cos(ang) * rho, y = Math.sin(ang) * rho;
      for (let k = -1; k < Hi / per + 1; k++) {
        const z0 = (k + ph + ciclo) * per, z1 = z0 + per * llena, a0 = Math.max(0, z0), a1 = Math.min(Hi, z1);
        if (a1 - a0 < 0.8) continue;
        const zm = (a0 + a1) / 2, tono = P.base + 0.14 - 0.62 * Math.pow(zm / Hi, 1.25) - (rho / 5) * 0.12;
        ps.push(palo([x, y, a0], [x, y, a1], w * (1 - (0.4 * zm) / Hi), { mat, tono }));
      }
    }
    // el núcleo
    ps.push(palo([0, 0, 0], [0, 0, P.H * 0.35], 1.0, { mat, r1: 0.7, tono: P.base + 0.22 }), palo([0, 0, P.H * 0.35], [0, 0, P.H * 0.7], 0.7, { mat, r1: 0.35, tono: P.base - 0.18 }));
    // en el piso: anillo fijo y una onda que se abre
    const anillo = (r: number, tono: number, n = 22) => { for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; ps.push(caja(Math.cos(t) * r, Math.sin(t) * r, 0, 0.7, (2 * Math.PI * r) / n + 0.15, 0.3, { mat, giro: (t * 180) / Math.PI, tono })); } };
    anillo(5.2, P.base + 0.1);
    anillo(2.5 + ciclo * 7, P.base + 0.22 - ciclo * 0.6, 26);
    ps.push(cilindro(0, 0, 0, 3.2, 0.25, { mat, tono: P.base - 0.05 }));
    // motas que suben
    for (let i = 0; i < P.motas; i++) {
      const ang = R() * Math.PI * 2, rho = 1.5 + R() * 4, ph = R(), u = (ph + ciclo) % 1, z = u * P.H * 0.8;
      const a2 = ang + u * 1.4;
      ps.push(esfera(Math.cos(a2) * rho, Math.sin(a2) * rho, z, 0.55 + R() * 0.3, { mat, tono: P.base + 0.25 - u * 0.55 }));
    }
    // único: dos destellos que orbitan
    if (P.orbita) for (let i = 0; i < 2; i++) { const t = ciclo * Math.PI * 2 + i * Math.PI, z = P.H * (0.3 + 0.15 * i); estrella(ps, Math.cos(t) * 5.5, Math.sin(t) * 5.5, z, 1.4 + (Math.sin(t) + 1) * 0.9, mat); }
    // legendario: brasas que suben con vaivén y llamitas en la base
    if (P.brasas) {
      for (let i = 0; i < P.brasas; i++) {
        const ang = R() * Math.PI * 2, rho = 2 + R() * 5.5, ph = R(), u = (ph + ciclo) % 1, z = u * P.H * 0.9, va = Math.sin((u * 3 + ph) * Math.PI * 2) * 1.6;
        ps.push(esfera(Math.cos(ang) * rho + va, Math.sin(ang) * rho - va, z, 0.5 + (1 - u) * 0.35, { mat: 'bt_brasa', tono: 0.15 - u * 0.5 }));
      }
      for (let i = 0; i < 9; i++) {
        const t = (i / 9) * Math.PI * 2 + R() * 0.3, h = 3 + 3 * Math.abs(Math.sin(ciclo * Math.PI * 4 + i * 1.7)), r = 5.4;
        ps.push(palo([Math.cos(t) * r, Math.sin(t) * r, 0], [Math.cos(t) * (r - 0.4), Math.sin(t) * (r - 0.4), h], 0.9, { mat: 'bt_brasa', r1: 0.15, tono: 0.05 }));
      }
      anillo(8, P.base - 0.1, 30);
    }
    return ps;
  },
});

// ------------------------------------------------------------------ ajuar de la sala del tesoro
const PILAS: Record<string, Bulto[]> = {
  chica: [[0, 0, 10, 9, 5], [2.5, -2, 6, 5.5, 7.2], [-4, 3, 5, 4.2, 4.2], [5, 4, 4, 3.5, 3], [-5, -4, 4, 3.4, 3.2]],
  grande: [[0, 0, 17, 15, 8], [3, -3, 11, 9.5, 11.5], [-6, 5, 8, 7, 7], [8, 7, 6, 5, 5], [-8, -6, 7.5, 6, 6.5], [1, -9, 6, 5, 7.5], [10, -3, 5, 4.5, 4.5]],
};
/** Collar de cuentas tendido sobre el montón, de `a` a `b` con una panza. */
function collar(ps: Pieza[], bs: Bulto[], a: [number, number], b: [number, number], panza: number, mat: string, n = 12, dije?: string) {
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t + Math.sin(t * Math.PI) * panza, y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * panza;
    ps.push(esfera(x, y, alto(bs, x, y) + 0.4, 0.5, { mat, tono: i % 2 ? 0.08 : 0 }));
    if (dije && i === Math.round(n / 2)) gema(ps, [x + 0.6, y + 0.6, alto(bs, x, y) + 0.7], 1.0, dije, 'pera', 70, 45);
  }
}
function espadaClavada(ps: Pieza[], x: number, y: number, z: number, inc: number, rumbo: number) {
  const loc: Pieza[] = [
    caja(0, 0, -6, 1.6, 0.5, 6, { mat: 'acero' }),
    caja(0, 0, 0, 6, 1.0, 0.9, { mat: 'bt_oro', tono: 0.05 }), esfera(-3, 0, 0.45, 0.7, { mat: 'bt_oro' }), esfera(3, 0, 0.45, 0.7, { mat: 'bt_oro' }),
    cilindro(0, 0, 0.9, 0.55, 4, { mat: 'bt_cuero' }), esfera(0, 0, 5.4, 1.0, { mat: 'bt_oro', tono: 0.1 }), esfera(0, 0.75, 5.4, 0.45, { mat: 'bt_rubi' }),
  ];
  ps.push(...colocar(loc, [x, y, z], rumbo, inc, rumbo + 90));
}
registrar({
  id: 'tesoro_pila', nombre: ['Pila del tesoro', 'Treasure hoard'], tema: 'comun', variantes: ['chica', 'grande'], cuadros: 6, t: 4,
  huella: [2, 2], huellaPor: { grande: [3, 3] }, bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], g = v === 'grande', k = g ? 1 : 0.62, bs = g ? PILAS.grande : PILAS.chica, R = azar(a.seed, 11), rx = bs[0][2];
    const z = (x: number, y: number) => alto(bs, x, y);
    // atrás (antes del oro, que les tapa el pie): un escudo redondo apoyado y un jarrón de pie
    {
      const n: V3 = [0.5, 0.62, 0.6], c: V3 = [-9.5 * k, -9.5 * k, 5.8 * k], u: V3 = [0.78, -0.63, 0], w: V3 = [-0.38, -0.47, 0.8];
      const at = (p: V3, q: V3, t: number): V3 => [p[0] + q[0] * t, p[1] + q[1] * t, p[2] + q[2] * t];
      ps.push(cilindro(...at(c, n, -0.5), 6.9 * k, 0.8, { mat: 'bt_oro', eje: n, tono: -0.1 }), cilindro(...c, 6.3 * k, 0.9, { mat: 'bt_esmalte', eje: n, tono: -0.05 }));
      for (const q of [u, w]) ps.push(palo(at(at(c, q, -5.9 * k), n, 0.7), at(at(c, q, 5.9 * k), n, 0.7), 0.7 * k + 0.2, { mat: 'bt_oro' }));
      ps.push(cilindro(...at(c, n, 0.6), 2.2 * k, 1.4, { mat: 'bt_oro', eje: n, r1: 1.0 * k, tono: 0.1 }));
    }
    ps.push(...colocar(jarron(g ? 1.0 : 0.72), [7 * k, -11 * k, z(7 * k, -11 * k) - 4 * k], 20, 6, 120));
    monton(ps, bs, R, g ? 55 : 28);
    monedasPiso(ps, R, g ? 34 : 16, 0, 0, rx * 0.8, rx + (g ? 9 : 6));
    for (let i = 0; i < (g ? 4 : 2); i++) { const ang = 0.4 + i * 1.6 + R() * 0.6, d = rx + 2 + R() * 3; pila(ps, R, Math.cos(ang) * d, Math.sin(ang) * d, 3 + Math.floor(R() * 4)); }
    // arriba la espada clavada; al frente la corona, la copa y los collares
    espadaClavada(ps, -2 * k, -3 * k, z(-2 * k, -3 * k) - 0.8, 18, 30);
    const cx = 6.5 * k, cy = 6.5 * k;
    ps.push(...colocar(corona(1.45 * k + 0.25, 'bt_oro', ['bt_rubi', 'bt_zafiro', 'bt_esmeralda'], ''), [cx, cy, z(cx, cy) - 0.6], 15, 18, 45));
    ps.push(...colocar(caliz(1.25 * k + 0.2, 'bt_zafiro', 'bt_oro', 'oro'), [-7 * k, 6 * k, z(-7 * k, 6 * k) - 0.7], 0, 8, 90));
    if (g) ps.push(...colocar(caliz(1.0, 'bt_esmeralda'), [15, -3, 2.6], 40, 80, 20));
    collar(ps, bs, g ? [-13, -1] : [-8, 0], g ? [-1, 11] : [-1, 7], 2.5 * k, 'bt_hueso', g ? 15 : 10, 'bt_rubi');
    if (g) collar(ps, bs, [9, -6], [13, 3], 1.8, 'bt_oro', 9, 'bt_esmeralda');
    const gemas = ['bt_rubi', 'bt_zafiro', 'bt_esmeralda', 'bt_amatista', 'bt_topacio', 'bt_diamante', 'bt_rubi'], cortes: Corte[] = ['oval', 'redondo', 'esmeralda', 'pera', 'marquesa'];
    for (let i = 0; i < (g ? 7 : 4); i++) {
      const ang = -0.6 + (i / (g ? 7 : 4)) * 2.9 + R() * 0.3, d = (0.35 + R() * 0.5) * rx, x = Math.cos(ang) * d + 2, y = Math.sin(ang) * d + 2;
      gema(ps, [x, y, z(x, y) + 1.0], 1.5 + R() * 0.6, gemas[i], cortes[i % cortes.length], 25 + R() * 25, 30 + R() * 30);
    }
    centelleo(ps, sitiosEn(bs, azar(a.seed, 12), g ? 8 : 5), f, 6, 'bt_destello', g ? 1.15 : 1);
    return ps;
  },
});

registrar({
  id: 'jarron_oro', nombre: ['Jarrón de oro', 'Golden vase'], tema: 'comun', variantes: ['de_pie', 'volcado'], huella: [1, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], R = azar(a.seed, 13);
    mancha(ps, R, 7, 6, 2);
    if (v === 'volcado') {
      // acostado con la boca hacia la derecha de la pantalla, el oro saliendo
      const d: V3 = [0.92, -0.38, 0], l = 0.95;
      ps.push(...transformar(jarron(l), rotM([-d[1], d[0], 0], 84), [-d[0] * 8, -d[1] * 8, 4.1]));
      const bx = d[0] * 9.5 + 1.5, by = d[1] * 9.5 + 1.5;
      const bs: Bulto[] = [[bx, by, 5, 4.5, 2.0], [bx - 2, by + 0.8, 3, 2.8, 2.6]];
      monton(ps, bs, R, 10);
      monedasPiso(ps, R, 12, bx + 1, by + 1, 3, 9);
      gema(ps, [bx + 2, by - 2.5, 1.6], 1.4, 'bt_rubi', 'oval', 25, 10);
    } else {
      ps.push(...jarron(1.0));
      monedasPiso(ps, R, 6, 0, 0, 5.5, 9);
    }
    return ps;
  },
});

registrar({
  id: 'caliz', nombre: ['Cáliz de oro', 'Golden chalice'], tema: 'comun', variantes: ['de_pie', 'volcado'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], R = azar(a.seed, 14);
    if (v === 'volcado') {
      // tumbado con la copa hacia la derecha de la pantalla y el vino derramado
      ps.push(elipsoide(11, -2, 0, 5.5, 4.5, 0.35, { mat: 'bt_vino', giro: -20 }), elipsoide(14, 2.5, 0, 2.4, 1.6, 0.3, { mat: 'bt_vino', giro: 30 }));
      ps.push(...transformar(caliz(1.45, 'bt_rubi', 'bt_oro', false), rotM([0.38, 0.92, 0], 76), [-5, 2.0, 3.1]));
      monedasPiso(ps, R, 3, 2, 2, 4, 8);
    } else {
      ps.push(...caliz(1.45));
      monedasPiso(ps, R, 3, 0, 0, 4, 7);
    }
    return ps;
  },
});

registrar({
  id: 'corona_suelo', nombre: ['Corona en el piso', 'Fallen crown'], tema: 'comun', variantes: ['oro', 'oscura', 'con_calavera'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], R = azar(a.seed, 15);
    if (v === 'con_calavera') {
      calavera(ps, 0, 0, 3.6, 3.8);
      ps.push(...colocar(corona(1.15, 'bt_oro', ['bt_rubi', 'bt_zafiro', 'bt_esmeralda'], ''), [0.2, -0.2, 5.4], 10, 12, 200));
      for (let i = 0; i < 3; i++) ps.push(palo([3 + R() * 3, -4 + R() * 3, 0.5], [7 + R() * 3, -1 + R() * 4, 0.5], 0.7, { mat: 'bt_hueso', r1: 0.55 }));
      monedasPiso(ps, R, 5, 0, 0, 5, 9);
    } else {
      const oscura = v === 'oscura';
      ps.push(...colocar(corona(1.4, oscura ? 'bt_hierro' : 'bt_oro', oscura ? ['bt_rubi_luz'] : ['bt_rubi', 'bt_zafiro', 'bt_esmeralda'], oscura ? '' : 'bt_terciopelo'), [0, 0, 3.0], 20, 62, 210));
      monedasPiso(ps, R, oscura ? 0 : 4, 0, 0, 5, 8);
      if (oscura) gema(ps, [4, 4, 0.9], 1.0, 'bt_rubi_luz', 'pera', 70, 30);
    }
    return ps;
  },
});

registrar({
  id: 'saco_monedas', nombre: ['Saco de monedas', 'Coin sack'], tema: 'comun', variantes: ['cerrado', 'derramado'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], R = azar(a.seed, 16), m = 'bt_arpillera';
    /** Volante de la boca: bultos en anillo alrededor del eje `e` en el centro `c`. */
    const volante = (c: V3, e: V3, r: number, n: number, abierto: boolean): Comp[] => {
      const up: V3 = Math.abs(e[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], l = Math.hypot(e[1] * up[2] - e[2] * up[1], e[2] * up[0] - e[0] * up[2], e[0] * up[1] - e[1] * up[0]);
      const u: V3 = [(e[1] * up[2] - e[2] * up[1]) / l, (e[2] * up[0] - e[0] * up[2]) / l, (e[0] * up[1] - e[1] * up[0]) / l], w: V3 = [e[1] * u[2] - e[2] * u[1], e[2] * u[0] - e[0] * u[2], e[0] * u[1] - e[1] * u[0]];
      return Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2, rr = r * (abierto ? 1.25 : 1); const q: V3 = [c[0] + (u[0] * Math.cos(t) + w[0] * Math.sin(t)) * rr, c[1] + (u[1] * Math.cos(t) + w[1] * Math.sin(t)) * rr, c[2] + (u[2] * Math.cos(t) + w[2] * Math.sin(t)) * rr]; return bulto(q, [1.5, 0.8, 1.2], { eje: [q[0] - c[0] + e[0] * 0.8, q[1] - c[1] + e[1] * 0.8, q[2] - c[2] + e[2] * 0.8], mat: m, tono: (i % 2 ? 0.06 : -0.04) }); });
    };
    if (v === 'derramado') {
      // tumbado con la boca hacia la derecha de la pantalla y el oro saliendo
      const d: V3 = [0.92, -0.38, 0], P = (t: number, h: number): V3 => [d[0] * t, d[1] * t, h];
      ps.push(masa([
        bulto(P(-3.5, 4.0), [6.2, 5.4, 4.2], { eje: d, mat: m }), bulto(P(-6.5, 3.4), [3.4, 4.4, 3.4], { eje: d, mat: m, tono: -0.04 }),
        bulto(P(-2.5, 1.8), [4.0, 5.6, 2.0], { eje: d, mat: m }), hueso(P(1.6, 4.0), P(4.2, 3.6), 3.4, 2.3, { mat: m }),
        ...volante(P(5.4, 3.6), d, 2.4, 8, true),
      ], { mat: m, suave: 1.8 }));
      ps.push(caja(0, 0, -20, 80, 80, 20, { mat: 'bt_negro', resta: true }));
      ps.push(cilindro(...P(3.2, 3.7), 2.55, 0.9, { mat: 'bt_cuerda', eje: d }));
      // pliegues
      for (const t of [-5, -2.5, 0]) ps.push(palo(P(t, 7.9), P(t + 1.2, 6.4), 0.35, { mat: m, tono: -0.2 }));
      const bx = d[0] * 8.5 + 1.5, by = d[1] * 8.5 + 1.5;
      ps.push(elipsoide(...P(5.6, 3.6), 1.0, 2.0, 2.0, { mat: 'bt_oro_monedas', giro: -22 }));
      const bs: Bulto[] = [[bx, by, 4.6, 4.2, 1.9], [bx - 1.8, by + 0.6, 2.8, 2.6, 2.6]];
      monton(ps, bs, R, 9);
      monedasPiso(ps, R, 14, bx + 1, by + 1, 3, 9);
      gema(ps, [bx + 1.5, by - 3, 1.5], 1.3, 'bt_zafiro', 'redondo', 30, 0);
      ps.push(palo(P(3, 0.4), [bx - 2, by + 4.5, 0.4], 0.4, { mat: 'bt_cuerda' }));
    } else {
      ps.push(masa([
        bulto([0, 0, 3.6], [6.0, 5.6, 4.4], { mat: m }),
        bulto([2.6, 2.4, 2.6], [3.4, 3.2, 2.8], { mat: m, tono: 0.04 }), bulto([-3.0, 1.6, 2.4], [3.0, 3.2, 2.6], { mat: m, tono: -0.03 }), bulto([0.6, -3.0, 2.6], [3.2, 3.0, 2.6], { mat: m }),
        bulto([0.3, 0.2, 6.8], [4.4, 4.1, 3.2], { mat: m }),
        hueso([0.2, 0.2, 8.8], [0.1, 0.1, 10.6], 2.5, 1.5, { mat: m }),
        ...volante([0, 0, 11.6], [0, 0, 1], 1.7, 7, false),
      ], { mat: m, suave: 1.8 }));
      ps.push(caja(0, 0, -20, 80, 80, 20, { mat: 'bt_negro', resta: true }));
      ps.push(cilindro(0.1, 0.1, 10.0, 1.8, 0.85, { mat: 'bt_cuerda' }), palo([1.5, 1.2, 10.3], [2.4, 2.3, 7.4], 0.42, { mat: 'bt_cuerda' }), palo([2.4, 2.3, 7.4], [2.9, 2.0, 5.6], 0.38, { mat: 'bt_cuerda' }));
      // pliegues que bajan del cuello
      for (const t of [0.2, 1.1, 2.0, 3.6, 4.6]) ps.push(palo([Math.cos(t) * 2.6, Math.sin(t) * 2.6, 9.2], [Math.cos(t) * 4.6, Math.sin(t) * 4.6, 6.4], 0.32, { mat: m, tono: -0.18 }));
      // remiendo
      ps.push(caja(3.2, 4.1, 3.0, 2.6, 0.6, 2.4, { mat: 'bt_cuero', giro: -40, incl: -18, tono: 0.04 }));
      moneda(ps, -0.3, 0.5, 12.6, normalInc(35, 60), 0.05);
      monedasPiso(ps, R, 7, 3, 3, 4, 9);
      moneda(ps, 5.0, 3.2, 2.2, normalInc(62, 30), 0.04);
    }
    return ps;
  },
});
