import { objeto, herramientas } from './objeto';
import { hash3, caja, palo, poliedro, cilindro, elipsoide, esfera, hueso, bulto, masa, baseCamara, proyectar, type Pieza, type V3, type Camara, type Comp } from './render';
import { MATERIALES } from './materiales';
import { EscenaCine, Terreno, hexLin, mezclar, escalar, moverPiezas, giroEje, type Atmosfera, type C3, type Pluma, type Cartel } from './cine3d';
import type { Plano3D, Armado, Extras } from './cine3d_toma';
import { monje, vela, cadena, columna as columnaGotica, arcoMedio, fbm2 } from './cine3d_interior';
import { armarValle } from './cine3d_valle';
import * as D from './fuego_doom';
import { cuadrosDoom } from './cine_fuego';
import type { Lamina } from './cine';
import './catalogo/celestial';
import './catalogo/jefes2';
import './catalogo/pueblo';

/**
 * El acto 7 y sus cuatro finales en 3D (los planos de GUION.acto_7 y acto_7_<final>), con el método de la intro:
 * una escena entera con la cámara libre, UNA luz principal y la misma bruma en todo el cuadro (cine3d.ts).
 *
 * El escenario común es el cielo sobre las nubes, armado una vez (`armarCielo`) y mirado con otra cámara y otra hora en
 * cada plano: un mar de nubes abajo con la luna, la isla grande de mármol que flota, la escalinata de oro que sube a la
 * plataforma del Trono Sediento (asiento, respaldo en ojiva de cuatrocientas unidades con su marco de oro, la grieta
 * del vacío, alas de piedra y el halo roto), islas de ruinas que flotan lejos atadas con cadenas de oro y, arriba, las
 * estrellas enjauladas: los barrotes de oro de la jaula del cielo que van de un horizonte al otro.
 * - acto_7: Aun-Saar (`jefe_aun_saar_morir`) se parte sobre la escalinata; el trono vacío y la Corona en los escalones
 *   entre la sangre dorada, que sigue ardiendo bajito (fuego de Doom).
 * - vigilia: Auren de rodillas envuelve la Corona en su manto; la cripta del relicario de hierro con sus siete sellos y
 *   los monjes que cantan; la última vela y lo que late detrás del hierro.
 * - cielo: Mira parte la Corona contra la jaula (luz blanca); el cielo se abre y caen las islas y los dioses de piedra
 *   ardiendo; el alba sobre Velmora (el valle de la intro, en paz, con la horca vacía).
 * - rey_ceniza: el héroe en el trono con la Corona y la Brasa encendida en el pecho, la sangre por la escalinata; abajo,
 *   en Velmora, los fuegos que se inclinan hacia el norte y la gente de rodillas en el barro.
 * - corona_fria: el mismo trono en gris y azul, con escarcha; el héroe solo en el borde de la isla nevada.
 * Personajes y monstruos van siempre a contraluz (la luna detrás): solo brillan la Corona, la Brasa, las velas y la magia.
 * Medidas del taller: una persona mide 61 (una unidad ~3 cm). z hacia arriba; la isla del trono tiene su piso en z = 0.
 */

const TAU = Math.PI * 2;
const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (a: number, b: number, v: number) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Azar estable 0..1. */
const az = (i: number, k = 0) => hash3(i * 31 + 7, k * 17 + 3, 7077);
/** Dirección desde el rumbo (grados desde +x, contra reloj) y la elevación en grados. */
const dirAz = (a: number, e: number): V3 => { const A = (a * Math.PI) / 180, E = (e * Math.PI) / 180; return [Math.cos(A) * Math.cos(E), Math.sin(A) * Math.cos(E), Math.sin(E)]; };
function gradiente(paradas: [number, C3][], e: number): C3 {
  let k = 0; while (k < paradas.length - 2 && e > paradas[k + 1][0]) k++;
  const [a, ca] = paradas[k], [b, cb] = paradas[k + 1];
  return mezclar(ca, cb, suave(a, b, e));
}
/** Las piezas de un objeto del catálogo (variante, cuadro, semilla). */
function piezasDe(id: string, v: string, seed = 1, f = 0): Pieza[] {
  const a = objeto(id).armar(v, f, herramientas(seed));
  return Array.isArray(a) ? a : a.piezas;
}
/**
 * Cámara en `pos` que deja el punto `P` en (sx, sy) de la pantalla base (fracciones de 1280 x 720), con el campo
 * visual `fov` dicho para la pantalla base (la capa sale con su margen alrededor).
 */
export function camaraEncuadre(pos: V3, P: V3, fov: number, sx: number, sy: number, w = 1408, h = 792): Camara {
  const bw = (w * 1280) / 1408, bh = (h * 720) / 792, thB = Math.tan((fov * Math.PI) / 360), th = thB * (h / bh), asp = bw / bh;
  const dx = P[0] - pos[0], dy = P[1] - pos[1], dz = P[2] - pos[2];
  const azP = (Math.atan2(dy, dx) * 180) / Math.PI, elP = (Math.atan2(dz, Math.hypot(dx, dy)) * 180) / Math.PI;
  const ox = (Math.atan((2 * sx - 1) * thB * asp) * 180) / Math.PI, oy = (Math.atan((1 - 2 * sy) * thB) * 180) / Math.PI;
  const d = dirAz(azP + ox, elP - oy);
  return { pos, obj: [pos[0] + d[0] * 5000, pos[1] + d[1] * 5000, pos[2] + d[2] * 5000], fov: (Math.atan(th) * 360) / Math.PI, w, h };
}

// ================================================================== materiales
const M = MATERIALES;
/** La sangre del dios: oro líquido, muy brillante, que apenas emite (se lee en lo oscuro). */
M.a7_icor = { rampa: ['#1a0c02', '#2e1804', '#4a2808', '#6a3c0c', '#8e5612', '#b4741c', '#d49430'], ruido: 0.2, escala: 0.3, brillo: 0.7 };
M.a7_icor_luz = { rampa: ['#3a2004', '#5a3408', '#7a4a0e', '#a06818', '#c88a28'], ruido: 0.3, escala: 0.4, emite: true };
/** Sangre de hombre: roja casi negra, húmeda. */
M.a7_sangre = { rampa: ['#0c0101', '#1a0302', '#2a0604', '#3c0906', '#520e08', '#6a140a'], ruido: 0.2, escala: 0.4, brillo: 1.4 };
/** La Corona: oro viejo y gastado (el brillo lo da la luz que la toca) y el fuego bajito que la recorre. */
M.a7_corona = { rampa: ['#1c1006', '#33200b', '#4e3412', '#6c4b1a', '#8c6424', '#ab7e30', '#c89a42', '#e2bb62'], ruido: 0.18, escala: 0.6, brillo: 1.2, patron: (p) => (Math.abs(Math.sin(p[2] * 2.6 + Math.sin(p[0] * 0.9) * 1.5)) < 0.08 ? -0.15 : 0) };
M.a7_corona_ascua = { rampa: ['#5a1404', '#8a2a06', '#b84a0e', '#e07a1e', '#ffaa40'], ruido: 0.4, escala: 0.8, emite: true };
/** La Brasa en el pecho del rey de ceniza: rojo hondo que late. */
M.a7_brasa = { rampa: ['#3a0602', '#6a0e04', '#9a1c06', '#c8320a', '#ff5a14'], ruido: 0.4, escala: 0.5, emite: true };
/** La luz blanca que sale de la Corona partida (Mira). */
M.a7_luz_blanca = { rampa: ['#c8ccd8', '#dde2ee', '#eef2fa', '#fafcff', '#ffffff'], ruido: 0.2, escala: 0.4, emite: true };
/** Telas: el manto de Auren (blanco roto, sucio), el vestido de Mira, el manto negro del héroe, la armadura oscura. */
M.a7_manto_blanco = { rampa: ['#141312', '#262421', '#3a3732', '#504c45', '#68635a', '#807a6f', '#968f82'], ruido: 0.3, escala: 0.7, patron: (p) => (Math.sin(p[2] * 0.5 + Math.sin(p[0] * 0.3 + p[1] * 0.3) * 2) > 0.85 ? -0.1 : 0) };
M.a7_tela_morada = { rampa: ['#0a060c', '#140c18', '#1e1224', '#2a1932', '#372141'], ruido: 0.3, escala: 0.8 };
M.a7_tela_negra = { rampa: ['#040404', '#080707', '#0d0c0b', '#131110', '#1a1716', '#221e1c'], ruido: 0.3, escala: 0.8, patron: (p) => (Math.sin(p[2] * 0.6 + p[0] * 0.2) > 0.8 ? -0.1 : 0) };
M.a7_placa = { rampa: ['#050505', '#0b0b0c', '#141415', '#1e1e20', '#2a2a2d', '#38383c', '#48484d'], ruido: 0.2, escala: 0.5, brillo: 0.8 };
M.a7_piel = { rampa: ['#0e0806', '#1c110c', '#2c1c14', '#3e281d', '#523627'], ruido: 0.15, escala: 0.6 };
M.a7_pelo = { rampa: ['#050404', '#0b0908', '#120f0d', '#1a1613', '#231e1a'], ruido: 0.5, escala: 1.4, brillo: 0.3 };
M.a7_pelo_blanco = { rampa: ['#1a1a1c', '#2e2e32', '#46464b', '#606066', '#7c7c83', '#9a9aa2'], ruido: 0.4, escala: 1.4, brillo: 0.3 };
/** El hierro del relicario: negro azulado, con remaches y óxido. */
M.a7_hierro = { rampa: ['#030303', '#070707', '#0d0c0c', '#141312', '#1c1a18', '#26221f', '#302a26'], ruido: 0.4, escala: 0.5, brillo: 0.5, patron: (p) => (Math.sin(p[0] * 0.4 + p[2] * 0.6) > 0.7 ? 0.05 : 0) };
M.a7_lacre = { rampa: ['#120101', '#260303', '#3e0605', '#5a0b08', '#78120c', '#951c12'], ruido: 0.15, escala: 0.5, brillo: 0.6, patron: (p) => { const r = Math.hypot(p[0], p[1]); return Math.abs((r % 2.2) - 1.1) < 0.22 ? -0.18 : 0; } };
/** Lo que late detrás del hierro (la sed dormida). */
M.a7_latido = { rampa: ['#4a1004', '#7a2206', '#a8400e', '#d0661c', '#f09038'], ruido: 0.5, escala: 0.4, emite: true };
/** Las losas de mármol del piso de la isla y la plataforma: viejas, mates (el mármol del catálogo brilla como hielo de noche). */
M.a7_losas = { ...M.cel_marmol_losas, rampa: ['#121211', '#1c1b1a', '#282725', '#363431', '#45423e', '#55514b', '#65605a'], brillo: 0.06 };
/** Las nubes del mar de abajo, vistas como material (las islas de nubes sueltas). */
M.a7_nube = { rampa: ['#2c3040', '#3e4456', '#545b70', '#6c748a', '#868fa4', '#a0a8bc'], ruido: 0.4, escala: 0.02 };

// ================================================================== el mundo
/** La escalinata de oro: 28 escalones de 22 x 11 que suben del piso de la isla (z = 0) a la plataforma del trono. */
export const ESC = { y0: -120, n: 28, huella: 22, contra: 11, ancho: 200 };
/** La plataforma del trono (su piso) y el trono (el frente del asiento mira a -y, hacia la escalinata). */
export const PLAT = { y0: ESC.y0 + ESC.n * ESC.huella, y1: 860, ancho: 560, z: ESC.n * ESC.contra };
/** Los radios de las dos gradas del trono (centradas un poco detrás del asiento). */
const GRADAS = [104, 80];
export const TRONO = { x: 0, y: 590, z: PLAT.z + 20, asiento: 34, ancho: 110, fondo: 64, respaldo: 470 };
/** El alto del escalón i (su huella) y dónde empieza. */
const zEscalon = (i: number) => (i + 1) * ESC.contra;
const yEscalon = (i: number) => ESC.y0 + i * ESC.huella;
/** Un punto sobre la huella del escalón i (x, y dentro del escalón: 0..1). */
export const sobreEscalon = (i: number, x: number, f = 0.5): V3 => [x, yEscalon(i) + ESC.huella * f, zEscalon(i)];
/** El escalón que hay en la coordenada y (para apoyar cosas). */
const escalonEn = (y: number) => Math.max(0, Math.min(ESC.n - 1, Math.floor((y - ESC.y0) / ESC.huella)));

/** Mar de nubes: lomos de nube redondos (coliflor), muy abajo; la bruma baja lo funde con el aire. */
function terrenoNubes(z0: number, o: { nieve?: boolean } = {}): Terreno {
  const alto = (x: number, y: number) => {
    const wx = x + (fbm2(x / 9000, y / 9000, 3, 401) - 0.5) * 5000, wy = y + (fbm2(x / 9000 + 7, y / 9000, 3, 402) - 0.5) * 5000;
    const b = 1 - Math.abs(2 * fbm2(wx / 4200, wy / 4200, 4, 403) - 1), c = fbm2(wx / 1300, wy / 1300, 4, 404);
    return z0 + b * b * 900 + c * 520 + (fbm2(x / 380, y / 380, 3, 405) - 0.5) * 120;
  };
  return new Terreno({
    alto, techo: z0 + 1500, grillas: [[-16000, -16000, 16000, 26000, 40], [-120000, -120000, 120000, 160000, 260]],
    superficie: (p, n) => {
      const k = 0.75 + 0.25 * n[2], v = fbm2(p[0] / 700, p[1] / 700, 3, 406);
      const base: C3 = o.nieve ? [0.5, 0.53, 0.6] : [0.44, 0.47, 0.56];
      return { albedo: escalar(base, k * (0.85 + v * 0.3)), brillo: 0 };
    },
  });
}

/**
 * Isla flotante grande (coordenadas del mundo): el piso de mármol en losas (z = `z`), el canto quebrado alrededor y la
 * roca que cuelga en cono, con raíces de oro y pedazos sueltos que flotan debajo. `r` es el radio del piso.
 */
function islaGrande(cx: number, cy: number, z: number, r: number, s: number, o: { hondo?: number; piso?: boolean; ry?: number } = {}): Pieza[] {
  const ps: Pieza[] = [], hondo = o.hondo ?? r * 1.7, ry = o.ry ?? 1, cs: Comp[] = [];
  // la roca de abajo: bultos que se angostan hacia la punta (corrida, no centrada) fundidos en una masa
  const tx = (az(s, 1) - 0.5) * r * 0.5, ty = (az(s, 2) - 0.5) * r * 0.4;
  // (cada bulto queda con el tope bajo el piso: la unión suave no lo levanta por encima de las losas)
  const rz = Math.max(8, hondo * 0.16), su = Math.min(60, r * 0.06);
  for (let i = 0; i < 9; i++) { const t = i / 8, rr = r * (1.0 - t * 0.9); cs.push(bulto([cx + tx * t * t + (az(s, i + 3) - 0.5) * r * 0.12 * t, cy + ty * t * t + (az(s, i + 13) - 0.5) * r * 0.12 * t, z - 16 - su - rz - t * (hondo - rz)], [rr * (0.85 + az(s, i + 23) * 0.15), rr * ry * (0.8 + az(s, i + 33) * 0.15), rz], { giro: az(s, i + 43) * 180, mat: 'cel_roca' })); }
  for (let i = 0; i < 14; i++) { const an = az(s, i + 53) * TAU, t = 0.15 + az(s, i + 63) * 0.6, rz2 = hondo * 0.14; cs.push(bulto([cx + Math.cos(an) * r * (0.9 - t * 0.7), cy + Math.sin(an) * r * ry * (0.86 - t * 0.7), z - 16 - su - rz2 - t * hondo * 0.6], [r * 0.24, r * 0.18, rz2], { giro: az(s, i + 73) * 180, mat: 'cel_roca' })); }
  ps.push(masa(cs, { mat: 'cel_roca', suave: su }));
  // el piso: losa de mármol de borde quebrado (en gajos, para que el canto no sea un círculo)
  const nl = 18;
  for (let i = 0; i < nl; i++) {
    const a0 = (i / nl) * TAU, a1 = ((i + 1) / nl) * TAU, r0 = r * (0.93 + az(s, i + 83) * 0.1), r1 = r * (0.93 + az(s, ((i + 1) % nl) + 83) * 0.1);
    const pts: V3[] = [[cx, cy, z], [cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0 * ry, z], [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1 * ry, z]];
    ps.push(poliedro([...pts, ...pts.map((p) => [cx + (p[0] - cx) * 0.97, cy + (p[1] - cy) * 0.97, p[2] - 14] as V3)], { mat: o.piso === false ? 'cel_roca' : 'a7_losas', tono: (az(s, i + 93) - 0.5) * 0.06 }));
  }
  // raíces de oro que cuelgan del canto y piedras que se desprenden
  for (let i = 0; i < 7; i++) {
    const an = az(s, i + 103) * TAU, b: V3 = [cx + Math.cos(an) * r * 0.86, cy + Math.sin(an) * r * ry * 0.86, z - 20], cs2: Comp[] = [];
    let p = b; for (let k = 0; k < 5; k++) { const q = add(p, [(az(s, i * 7 + k) - 0.5) * 20 + Math.cos(an) * 6, (az(s, i * 7 + k + 50) - 0.5) * 20 + Math.sin(an) * 6, -18 - az(s, k + i) * 26]); cs2.push(hueso(p, q, 4.5 - k * 0.7, 3.8 - k * 0.7, { mat: 'cel_oro_viejo' })); p = q; }
    ps.push(masa(cs2, { mat: 'cel_oro_viejo', suave: 2 }));
  }
  for (let i = 0; i < 6; i++) { const an = az(s, i + 123) * TAU, rr = r * (0.5 + az(s, i + 133) * 0.6), zz = z - hondo * (0.3 + az(s, i + 143) * 0.9), R = r * (0.03 + az(s, i + 153) * 0.05); ps.push(peñasco(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * ry, zz, R, s * 11 + i)); }
  return ps;
}
/** Peñasco de roca facetado (convexo). */
function peñasco(x: number, y: number, z: number, R: number, s: number, mat = 'cel_roca'): Pieza {
  const pts: V3[] = [];
  for (let i = 0; i < 12; i++) { const a = az(s, i + 200) * TAU, e = (az(s, i + 220) * 2 - 1) * 0.9, r = R * (0.7 + az(s, i + 240) * 0.4); pts.push([x + Math.cos(a) * Math.cos(e) * r, y + Math.sin(a) * Math.cos(e) * r, z + Math.sin(e) * r * 0.8]); }
  return poliedro(pts, { mat, tono: (az(s, 260) - 0.5) * 0.1 });
}

/** La escalinata de oro con sus zancas de mármol, el pasamanos y la plataforma del trono. */
function escalinata(esc: EscenaCine, o: { rota?: boolean } = {}) {
  const ps: Pieza[] = [], { n, huella, contra, ancho } = ESC, A = ancho / 2;
  // el macizo de mármol bajo la escalinata (cuña) y las zancas a los lados, en pendiente, con su remate de oro
  const yf = yEscalon(n), zt = PLAT.z;
  ps.push(poliedro([[-A, ESC.y0, 0], [A, ESC.y0, 0], [-A, yf, 0], [A, yf, 0], [-A, yf, zt - 2], [A, yf, zt - 2], [-A, ESC.y0 + 4, 4], [A, ESC.y0 + 4, 4]], { mat: 'cel_marmol' }));
  for (const s of [-1, 1]) {
    const x = s * (A + 14);
    ps.push(poliedro([[x - 14, ESC.y0 - 30, 0], [x + 14, ESC.y0 - 30, 0], [x - 14, yf, 0], [x + 14, yf, 0], [x - 14, yf, zt + 34], [x + 14, yf, zt + 34], [x - 14, ESC.y0 - 30, 34], [x + 14, ESC.y0 - 30, 34]], { mat: 'cel_marmol_losas' }));
    // la albardilla de oro viejo en la pendiente y los pedestales con su remate al pie y arriba
    ps.push(palo([x, ESC.y0 - 30, 36], [x, yf, zt + 36], 6.5, { mat: 'cel_oro_viejo' }));
    for (const [yy, zz] of [[ESC.y0 - 40, 0], [yf + 10, zt]] as [number, number][]) {
      ps.push(caja(x, yy, zz, 40, 40, 70, { mat: 'cel_marmol' }), caja(x, yy, zz + 70, 46, 46, 6, { mat: 'cel_oro_viejo' }), cilindro(x, yy, zz + 76, 14, 22, { mat: 'cel_oro', r1: 7 }), esfera(x, yy, zz + 102, 9, { mat: 'cel_oro' }));
    }
  }
  esc.ponerMundo(ps, { nieve: 0.8 });
  // los escalones: losas de oro con su nariz redonda y la tabica de oro viejo; alguno rajado por la pelea
  const es: Pieza[] = [];
  for (let i = 0; i < n; i++) {
    const y = yEscalon(i), z = zEscalon(i), t = (az(i, 301) - 0.5) * 0.06;
    es.push(caja(0, y + huella / 2 + 1, z - contra - 1, ancho, huella + 2, contra + 1, { mat: 'cel_oro', tono: t }));
    es.push(cilindro(-A, y + 1.5, z - 2.2, 2.4, ancho, { mat: 'cel_oro', eje: [1, 0, 0], tono: t + 0.03 }));
    es.push(caja(0, y + 0.6, z - contra - 1, ancho - 1, 1.6, contra - 3, { mat: 'cel_oro_viejo', tono: t }));
    if (o.rota && az(i, 302) < 0.22) es.push(caja((az(i, 303) - 0.5) * ancho * 0.7, y + huella * 0.4, z - 3, 10 + az(i, 304) * 20, huella * 0.9, 6, { mat: 'cel_oro', resta: true, giro: (az(i, 305) - 0.5) * 50 }));
  }
  esc.ponerMundo(es, { nieve: 1 });
  // la plataforma: macizo de mármol con su canto de oro, el piso en losas
  const pl: Pieza[] = [
    caja(0, (PLAT.y0 + PLAT.y1) / 2, 0, PLAT.ancho, PLAT.y1 - PLAT.y0, zt - 3, { mat: 'a7_losas' }),
    caja(0, (PLAT.y0 + PLAT.y1) / 2, zt - 3, PLAT.ancho + 6, PLAT.y1 - PLAT.y0 + 6, 3, { mat: 'cel_oro_viejo' }),
    caja(0, (PLAT.y0 + PLAT.y1) / 2, zt, PLAT.ancho - 10, PLAT.y1 - PLAT.y0 - 10, 1, { mat: 'a7_losas' }),
  ];
  esc.ponerMundo(pl, { nieve: 1 });
}

/**
 * El Trono Sediento: dos gradas en medio círculo, el asiento de mármol con brazos de oro, el respaldo colosal en ojiva
 * enmarcado en oro con el sol de oro y la grieta del vacío, las alas de piedra a los lados y el halo roto detrás.
 */
function trono(esc: EscenaCine) {
  const T = TRONO, ps: Pieza[] = [], z0 = PLAT.z, H = T.respaldo, yb = T.y + T.fondo / 2 + 6;
  // las gradas
  ps.push(cilindro(T.x, T.y + 10, z0, GRADAS[0], 10, { mat: 'cel_marmol_losas' }), cilindro(T.x, T.y + 10, z0 + 9.6, GRADAS[0] + 2, 1.2, { mat: 'cel_oro_viejo' }));
  ps.push(cilindro(T.x, T.y + 18, z0 + 10, GRADAS[1], 10, { mat: 'cel_marmol_losas' }), cilindro(T.x, T.y + 18, z0 + 19.6, GRADAS[1] + 2, 1.2, { mat: 'cel_oro_viejo' }));
  // el asiento: un bloque con su cojín de piedra, el frente labrado y los brazos de oro que terminan en voluta
  const zs = T.z + T.asiento;
  ps.push(caja(T.x, T.y, T.z, T.ancho, T.fondo, T.asiento - 4, { mat: 'cel_marmol' }), caja(T.x, T.y - 2, zs - 4, T.ancho + 4, T.fondo + 4, 4, { mat: 'cel_oro_viejo' }));
  ps.push(caja(T.x, T.y - T.fondo / 2 - 1, T.z + 6, T.ancho - 20, 2, T.asiento - 16, { mat: 'cel_oro_viejo' }));
  for (const s of [-1, 1]) {
    const x = T.x + s * (T.ancho / 2 + 6);
    ps.push(caja(x, T.y + 4, T.z, 16, T.fondo + 8, T.asiento + 22, { mat: 'cel_marmol' }), caja(x, T.y + 2, T.z + T.asiento + 22, 20, T.fondo + 12, 4, { mat: 'cel_oro' }));
    ps.push(cilindro(x - 10, T.y - T.fondo / 2 - 4, T.z + T.asiento + 15, 9, 20, { mat: 'cel_oro', eje: [1, 0, 0] }), esfera(x, T.y - T.fondo / 2 - 6, T.z + T.asiento + 14, 6, { mat: 'cel_oro' }));
    // garras de oro: el pie del brazo
    for (let k = -1; k <= 1; k++) ps.push(palo([x + k * 4, T.y - T.fondo / 2 - 2, T.z + 14], [x + k * 5, T.y - T.fondo / 2 - 12, T.z + 1], 2.2, { mat: 'cel_oro', r1: 0.8 }));
  }
  // el respaldo: losa en ojiva que se afina hacia arriba
  const W = 86, perf = (z: number) => (z < H * 0.62 ? W - z * 0.04 : (W - H * 0.62 * 0.04) * Math.sqrt(Math.max(0, 1 - ((z - H * 0.62) / (H * 0.38)) ** 1.6)));
  const pts: V3[] = [];
  for (let i = 0; i <= 14; i++) { const z = (i / 14) * H; for (const s of [-1, 1]) { const w = Math.max(1.5, perf(z)); pts.push([T.x + s * w, yb - 10, T.z + z], [T.x + s * w, yb + 10, T.z + z]); } }
  ps.push(poliedro(pts, { mat: 'cel_marmol' }));
  // el marco de oro, con hojas que salen hacia afuera (la silueta se rompe contra el cielo)
  for (const s of [-1, 1]) {
    let prev: V3 = [T.x + s * perf(0), yb - 11, T.z];
    for (let i = 1; i <= 18; i++) {
      const z = (i / 18) * H, q: V3 = [T.x + s * Math.max(1.5, perf(z)), yb - 11, T.z + z];
      ps.push(palo(prev, q, 5, { mat: 'cel_oro' }));
      if (i % 2 === 0 && i < 18) { const out = norm([s * 1, 0, i > 11 ? 0.8 : 0.3]); ps.push(palo(q, add(q, out, 22 + (i % 4) * 8), 3.6, { mat: 'cel_oro', r1: 0.4 })); }
      prev = q;
    }
  }
  ps.push(palo([T.x, yb - 8, T.z + H], [T.x, yb - 8, T.z + H + 60], 4, { mat: 'cel_oro', r1: 0.6 }));
  // el sol de oro en relieve (arriba del que se sienta) y la grieta del vacío que parte el respaldo
  const zsol = T.z + H * 0.56;
  ps.push(cilindro(T.x, yb - 10, zsol, 34, 3, { mat: 'cel_oro', eje: [0, -1, 0] }), cilindro(T.x, yb - 12, zsol, 22, 2, { mat: 'cel_oro_viejo', eje: [0, -1, 0] }));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; ps.push(palo([T.x + Math.cos(a) * 36, yb - 11, zsol + Math.sin(a) * 36], [T.x + Math.cos(a) * (52 + (i % 2) * 14), yb - 11, zsol + Math.sin(a) * (52 + (i % 2) * 14)], 2.2, { mat: 'cel_oro', r1: 0.4 })); }
  let p: V3 = [T.x + 6, yb - 10.5, T.z + H * 0.95];
  for (let i = 0; i < 9; i++) { const q: V3 = [p[0] + (az(i, 331) - 0.5) * 22, p[1], p[2] - H * 0.075]; if (Math.abs(q[2] - zsol) > 40) ps.push(palo(p, q, 2.6, { mat: 'j2_vacio' }), palo(add(p, [0, -0.6, 0]), add(q, [0, -0.6, 0]), 3.6, { mat: 'j2_borde_vacio' })); p = q; }
  // las alas de piedra: plumas largas que abren desde atrás del respaldo
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
    const t = i / 8, base: V3 = [T.x + s * 70, yb + 14, T.z + H * 0.36 + t * 120], tip = add(base, [s * (150 + t * 70 - (t > 0.6 ? (t - 0.6) * 160 : 0)), 26, 60 - t * 190]);
    ps.push({ k: 'elip', c: lerp3(base, tip, 0.5), ex: norm(sub(tip, base)), ey: [0, 1, 0], ez: norm(cruz3(norm(sub(tip, base)), [0, 1, 0])), r: [Math.hypot(...sub(tip, base)) * 0.55, 5, 13 - t * 3], mat: 'cel_piedra', tono: -t * 0.05 } as Pieza);
  }
  // el halo roto detrás de la cabeza del respaldo: un aro de oro al que le faltan pedazos
  const ch: V3 = [T.x, yb + 30, T.z + H * 0.84], R = 130, nA = 40;
  for (let i = 0; i < nA; i++) {
    if ([5, 6, 17, 27, 28, 29].includes(i)) continue;
    const a0 = (i / nA) * TAU, a1 = ((i + 1) / nA) * TAU;
    ps.push(palo([ch[0] + Math.cos(a0) * R, ch[1], ch[2] + Math.sin(a0) * R], [ch[0] + Math.cos(a1) * R, ch[1], ch[2] + Math.sin(a1) * R], 4.2, { mat: 'cel_oro' }));
  }
  esc.ponerMundo(ps, { nieve: 1 });
}

/** Las islas de ruinas que flotan lejos (del catálogo, agrandadas) y las cadenas de oro que las atan. */
function islasLejos(esc: EscenaCine, o: { nieve?: number; sin?: number[] } = {}) {
  const lista: [number, number, number, number, string, number][] = [
    // x, y, z, escala, variante, semilla
    [-2600, 3800, 600, 9, 'con_columnas', 11], [2900, 4200, -300, 11, 'grande', 12], [-5200, 7600, 1500, 14, 'con_arco', 13],
    [5600, 8800, 900, 16, 'grande', 14], [-1200, 9800, -1200, 15, 'mediana', 15], [1500, 2200, 1100, 5, 'chica', 16], [-3800, 1200, -900, 7, 'con_estatua', 17],
    [8200, 3000, 2200, 12, 'con_columnas', 18], [-8800, 4200, 300, 13, 'grande', 19],
  ];
  const puestos: V3[] = [];
  lista.forEach(([x, y, z, k, v, s], i) => {
    if (o.sin?.includes(i)) return;
    esc.poner(piezasDe('cel_isla_ruinas', v, s), { x, y, z, giro: az(s, 7) * 360, k }, { nieve: o.nieve ?? 0.6 });
    puestos.push([x, y, z]);
  });
  // cadenas de oro de isla a isla y de la isla del trono a las de cerca (combas largas)
  const pares: [V3, V3, number][] = [[[-520, 600, -40], puestos[0], 260], [[560, 700, -60], puestos[1], 300], [puestos[0], puestos[2], 500], [puestos[1], puestos[3], 600]];
  for (const [a, b, comba] of pares) if (a && b) esc.ponerMundo(cadena(a, b, comba, 26, 'cel_oro_viejo'), { nieve: 0.3 });
}

// ================================================================== el cielo
/**
 * La atmósfera del cielo del dios: noche honda sobre el mar de nubes, la luna baja como luz principal (detrás de lo que
 * se mira: todo se recorta a contraluz) y, arriba, la jaula: barrotes de oro viejo que van de un horizonte al otro por
 * los meridianos y tres anillos que los cruzan, con las estrellas detrás. Modos:
 * - noche: la luna fría, la jaula de oro apagado;
 * - ceniza (rey de ceniza): el cielo tomado por un rojo de brasa bajo, la jaula al rojo;
 * - fria (corona fría): gris azul, sin estrellas cálidas, la jaula escarchada, la luna más alta y velada;
 * - abierta (los dioses caen): la jaula rota y una herida de luz blanca de lado a lado.
 */
export type ModoCielo = 'noche' | 'ceniza' | 'fria' | 'abierta';
export const LUNA = dirAz(96, 13);
function atmCielo(modo: ModoCielo, o: { luna?: V3 } = {}): Atmosfera {
  const L = o.luna ?? (modo === 'fria' ? dirAz(98, 22) : LUNA);
  const fria = modo === 'fria', ceniza = modo === 'ceniza', abierta = modo === 'abierta';
  const pars: [number, C3][] = fria
    ? [[-0.2, hexLin('#4a5262')], [0, hexLin('#5a6474')], [0.06, hexLin('#3c4658')], [0.2, hexLin('#222a3a')], [0.55, hexLin('#10141e')], [1.4, hexLin('#06080c')]]
    : ceniza
      ? [[-0.2, hexLin('#2a1818')], [0, hexLin('#3a2220')], [0.06, hexLin('#2a1820')], [0.2, hexLin('#16101c')], [0.55, hexLin('#090810')], [1.4, hexLin('#030306')]]
      : [[-0.2, hexLin('#2e3446')], [0, hexLin('#3a4258')], [0.06, hexLin('#262e46')], [0.2, hexLin('#141a32')], [0.55, hexLin('#080b1a')], [1.4, hexLin('#03040a')]];
  const luz = fria ? hexLin('#b4c2dc') : hexLin('#aebeff'), oroJ = fria ? hexLin('#8a96a8') : ceniza ? hexLin('#ff5a1e') : hexLin('#c89a42');
  const brilloLuna = (d: V3) => { const g = Math.max(0, dot3(d, L)); return 0.5 * Math.pow(g, 400) + 0.08 * Math.pow(g, 30) + 0.025 * Math.pow(g, 4); };
  // el resplandor rojo bajo del rey de ceniza (del lado del trono, al norte = +y)
  const brasaN = (d: V3) => (ceniza ? Math.pow(Math.max(0, d[1] * 0.9 + 0.1), 3) * Math.exp(-Math.max(0, d[2]) * 5) * 0.35 : 0);
  const kAire = (e: number) => 0.55 + 0.45 * suave(0, 0.12, e);
  const aire = (d: V3): C3 => {
    const e = Math.min(0.03, Math.max(-0.2, d[2])), b = gradiente(pars, e), k = brilloLuna(norm([d[0], d[1], Math.max(0, e)])) * kAire(e), r = brasaN(d);
    return [b[0] + luz[0] * k + r * 0.9, b[1] + luz[1] * k + r * 0.18, b[2] + luz[2] * k + r * 0.06];
  };
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2])));
    if (e < 0.03) return aire(d);
    const b = gradiente(pars, e), g = Math.max(0, dot3(d, L)), ka = kAire(e), bl = brilloLuna(d), r = brasaN(d);
    let c: C3 = [b[0] + luz[0] * bl * ka + r * 0.9, b[1] + luz[1] * bl * ka + r * 0.18, b[2] + luz[2] * bl * ka + r * 0.06];
    // la luna: disco con su borde apenas comido
    const disco = suave(0.99965, 0.99975, g);
    if (disco > 0) { const lk = fria ? 3 : 4.5; c = mezclar(c, escalar(luz, lk * (0.85 + 0.15 * fbm2(d[0] * 900, d[1] * 900, 2, 411))), disco); }
    // estrellas (más en lo alto), las cercanas a la luna se apagan
    const a = Math.atan2(d[1], d[0]), hs = hash3(Math.floor(a * 700), Math.floor(e * 700), fria ? 913 : 911);
    const umbral = fria ? 0.9988 : 0.9975;
    if (hs > umbral && g < 0.995) { const k = ((hs - umbral) / (1 - umbral)) * (fria ? 1.2 : 2.2) * suave(0.05, 0.3, e); c = [c[0] + k * 0.8, c[1] + k * 0.85, c[2] + k]; }
    // nubes altas, finas y deshilachadas, iluminadas de canto por la luna
    if (d[2] > 0.02) {
      const kk = 3200 / d[2], u = (d[0] * kk) / 5200, v = (d[1] * kk) / 2400, n = fbm2(u + (fbm2(u * 0.7, v * 0.7, 3, 414) - 0.5) * 1.3, v, 5, 415);
      const an = suave(0.55, 0.68, n) * suave(0.02, 0.1, d[2]) * (fria ? 0.9 : 0.7), lz = 0.06 + Math.pow(g, 6) * 0.9;
      if (an > 0) c = mezclar(c, [b[0] * 0.7 + luz[0] * lz * 0.5 + r * 0.6, b[1] * 0.7 + luz[1] * lz * 0.5 + r * 0.12, b[2] * 0.7 + luz[2] * lz * 0.5], an);
    }
    // la jaula: barrotes por los meridianos (cada 15 grados; los de 45, más gruesos) y tres anillos; nacen sobre el
    // horizonte y se juntan arriba en el anillo de la cumbre
    {
      const ce = Math.cos(e), paso = Math.PI / 12, m = Math.round(a / paso), dm = Math.abs(a - m * paso) * ce, grueso = m % 3 === 0 ? 0.0034 : 0.0018;
      let barra = (1 - suave(grueso * 0.5, grueso, dm)) * suave(0.06, 0.14, e) * (1 - suave(1.22, 1.3, e));
      for (const ea of [0.42, 0.78, 1.12]) barra = Math.max(barra, (1 - suave(0.0016, 0.0032, Math.abs(e - ea))) * 0.9);
      barra = Math.max(barra, (1 - suave(0.0035, 0.006, Math.abs(e - 1.3))));
      if (abierta) barra *= 1 - herida(d);
      if (barra > 0) {
        // el oro de los barrotes: tibio y apagado, con un filo de luna del lado de la luna
        const filo = Math.pow(g, 3) * 0.5, k = (ceniza ? 0.11 : fria ? 0.05 : 0.055) * (0.55 + 0.45 * fbm2(a * 30, e * 30, 2, 416)) + filo * 0.05;
        c = mezclar(c, [oroJ[0] * k, oroJ[1] * k, oroJ[2] * k], barra * 0.92);
      }
    }
    if (abierta) {
      const hr = herida(d), blanco = hexLin('#f4f2ec');
      if (hr > 0) c = mezclar(c, escalar(blanco, 2.2 + 2.5 * hr), suave(0, 1, hr));
      const gl = heridaBrillo(d); c = [c[0] + blanco[0] * gl, c[1] + blanco[1] * gl, c[2] + blanco[2] * gl * 1.05];
    }
    return c;
  };
  return {
    sol: { dir: L, c: luz, k: fria ? 1.1 : ceniza ? 0.7 : 1.2, ancho: 0.012 }, cielo, aire,
    ambCielo: escalar(fria ? hexLin('#4a5872') : ceniza ? hexLin('#3a2a3a') : hexLin('#2c3c6a'), fria ? 0.34 : 0.26), ambSuelo: escalar(fria ? hexLin('#4a505c') : hexLin('#363c4c'), 0.22),
    niebla: { densidad: 1 / 42000, baja: 1 / 2600, z0: -3000, H: 900, ruido: 0.6, escalaRuido: 0.0004 },
    borde: { c: fria ? hexLin('#c8d4ec') : hexLin('#b8c8ff'), k: 1.9 }, nieve: fria ? { albedo: [0.4, 0.43, 0.5], desde: 0.5 } : undefined, oclusion: 0.88, oclusionLargo: 60,
  };
}
/** La herida del cielo abierto (los dioses caen): una abertura ancha que va de lado a lado sobre el horizonte del norte. */
const HERIDA = { az: 262, el: 0.42 };
function herida(d: V3): number {
  const a = Math.atan2(d[1], d[0]) - (HERIDA.az * Math.PI) / 180, u = Math.atan2(Math.sin(a), Math.cos(a)), e = Math.asin(Math.max(-1, Math.min(1, d[2])));
  if (Math.abs(u) > 1.4) return 0;
  const largo = Math.pow(Math.max(0, 1 - (u / 1.3) ** 2), 0.6), ec = HERIDA.el + u * 0.12 + (fbm2(u * 6, 1, 3, 421) - 0.5) * 0.08;
  const W = (0.05 + 0.13 * fbm2(u * 2.4, 3, 3, 422)) * largo, borde = W * (0.8 + 0.5 * (fbm2(u * 40, e * 40, 3, 423) - 0.5));
  return suave(borde, borde * 0.35, Math.abs(e - ec));
}
function heridaBrillo(d: V3): number {
  const a = Math.atan2(d[1], d[0]) - (HERIDA.az * Math.PI) / 180, u = Math.atan2(Math.sin(a), Math.cos(a)), e = Math.asin(Math.max(-1, Math.min(1, d[2])));
  return Math.exp(-Math.abs(e - HERIDA.el - u * 0.12) / 0.12) * Math.exp(-((u / 1.2) ** 2)) * 0.9;
}

/** Noche: negros hondos y fríos; lo cálido lo pone solo el fuego (el mismo de la intro). */
function gradoNoche(c: C3): C3 {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], fr = (1 - Math.min(1, l * 5)) ** 2;
  return [Math.pow(Math.max(0, c[0]), 1.08), Math.pow(Math.max(0, c[1]), 1.04) + 0.003 * fr, c[2] + 0.012 * fr];
}
/** Frío: todo hacia el gris azul, los colores lavados (la corona fría). */
function gradoFrio(c: C3): C3 {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], s = 0.55;
  return [Math.max(0, l + (c[0] - l) * s - 0.004), Math.max(0, l + (c[1] - l) * s), Math.max(0, l + (c[2] - l) * s + 0.012)];
}

/**
 * El cielo del dios armado una vez: el mar de nubes, la isla grande, la escalinata, el trono y las islas lejos. Cada
 * plano le agrega lo suyo y pone su cámara. `nieve` cubre todo de nieve (la corona fría).
 */
export interface Cielo extends Armado { fuegos: Fuego[] }
export interface Fuego { p: V3; ancho: number; alto: number; semilla: number; tipo: TipoFuegoC; k?: number }
export type TipoFuegoC = 'corona' | 'vela' | 'brasa' | 'estela' | 'hoguera' | 'antorcha' | 'pecho';
function armarCielo(modo: ModoCielo, o: { nieve?: boolean; sinTrono?: boolean; luna?: V3 } = {}): { esc: EscenaCine; atm: Atmosfera; fuegos: Fuego[]; plumas: Pluma[] } {
  const esc = new EscenaCine();
  esc.terreno = terrenoNubes(-3000, { nieve: o.nieve });
  // la isla del trono: el piso en z = 0, del pie de la escalinata hacia atrás
  esc.ponerMundo(islaGrande(0, 220, 0, 980, 31, { hondo: 1900, ry: 0.92 }), { nieve: 1 });
  escalinata(esc, { rota: true });
  if (!o.sinTrono) trono(esc);
  islasLejos(esc, { nieve: o.nieve ? 1 : 0.4 });
  // las estatuas de los que intentaron antes, de rodillas a los lados de la escalinata (piedra con grietas de oro)
  for (const [x, y, g, v, s] of [[-210, -40, 20, 'rodillas', 51], [215, 60, 160, 'tendiendo', 52], [-230, 230, 10, 'encogido', 53], [-430, 140, 40, 'alzados', 54], [330, -200, 140, 'postrado', 55]] as [number, number, number, string, number][]) {
    const z = y < ESC.y0 ? 0 : 0;
    esc.poner(piezasDe('cel_estatua_suplica', v, s), { x, y, z, giro: g, k: 1.5 }, { nieve: 1 });
  }
  esc.emision.j2_vacio = { k: 0.02 }; esc.emision.j2_borde_vacio = { k: modo === 'ceniza' ? 0.6 : 0.35 };
  esc.emision.cel_vacio = { k: 0.02 }; esc.emision.cel_luz_oro = { k: 0.6 }; esc.emision.cel_luz = { k: 0.6 };
  esc.emision.a7_icor_luz = { k: 0.5 };
  return { esc, atm: atmCielo(modo, { luna: o.luna }), fuegos: [], plumas: [] };
}

// ================================================================== la Corona y los cuerpos
/**
 * La Corona del Dios Sediento (local: el centro de la base en el origen, z arriba), de radio R: el aro de oro viejo con
 * sus dos cordones, nueve rayos (largos y cortos, dos quebrados), las piedras de vacío y las vetas de ascua por donde
 * sigue ardiendo bajito. `partida` la abre en dos mitades corridas a los lados (Mira la parte con las manos).
 */
function corona(R: number, o: { partida?: number; apagada?: boolean } = {}): Pieza[] {
  const h = R * 0.55, mitad: [Pieza[], Pieza[]] = [[], []], lado = (a: number) => (Math.cos(a) >= 0 ? 0 : 1);
  const ascua = o.apagada ? 'a7_corona' : 'a7_corona_ascua';
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, l = lado((a0 + a1) / 2), q = mitad[l];
    const P = (a: number, r: number, z: number): V3 => [Math.cos(a) * r, Math.sin(a) * r, z];
    // el aro: un gajo de banda (convexo) y los cordones arriba y abajo
    q.push(poliedro([P(a0, R, 0), P(a1, R, 0), P(a0, R, h), P(a1, R, h), P(a0, R * 0.84, 0), P(a1, R * 0.84, 0), P(a0, R * 0.84, h), P(a1, R * 0.84, h)], { mat: 'a7_corona', tono: (az(i, 501) - 0.5) * 0.08 }));
    q.push(palo(P(a0, R * 1.02, 0.2), P(a1, R * 1.02, 0.2), R * 0.075, { mat: 'a7_corona', tono: 0.06 }), palo(P(a0, R * 1.02, h), P(a1, R * 1.02, h), R * 0.06, { mat: 'a7_corona', tono: 0.08 }));
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.17, largo = i % 2 ? R * 1.05 : R * 1.85, roto = i === 3 || i === 7, q = mitad[lado(a)];
    const b: V3 = [Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98, h * 0.7], L = roto ? largo * 0.45 : largo, tip: V3 = [Math.cos(a) * R * (1.12 + (roto ? 0 : 0.1)), Math.sin(a) * R * (1.12 + (roto ? 0 : 0.1)), h + L];
    q.push(palo(b, tip, R * 0.13, { mat: 'a7_corona', r1: roto ? R * 0.07 : R * 0.012 }));
    if (roto) q.push(poliedro([tip, add(tip, [R * 0.08, 0, -R * 0.2]), add(tip, [-R * 0.06, R * 0.07, -R * 0.15]), add(tip, [0, -R * 0.08, R * 0.12])], { mat: 'a7_corona' }));
    // la piedra al pie del rayo: vacío con su borde morado
    q.push(esfera(Math.cos(a) * R * 1.03, Math.sin(a) * R * 1.03, h * 0.45, R * 0.11, { mat: 'j2_vacio' }));
    // la veta de ascua que sube por el rayo
    q.push(elipsoide(Math.cos(a) * R * 1.07, Math.sin(a) * R * 1.07, h + L * 0.18, R * 0.03, R * 0.03, L * 0.22, { mat: ascua, giro: (a * 180) / Math.PI }));
  }
  // grietas de ascua en el aro
  for (let i = 0; i < 7; i++) { const a = az(i, 511) * TAU; mitad[lado(a)].push(elipsoide(Math.cos(a) * R * 1.005, Math.sin(a) * R * 1.005, h * (0.3 + az(i, 512) * 0.4), R * 0.05, R * 0.05, h * 0.3, { mat: ascua, giro: (a * 180) / Math.PI, incl: (az(i, 513) - 0.5) * 60 })); }
  const p = o.partida ?? 0;
  if (!p) return [...mitad[0], ...mitad[1]];
  // partida: cada mitad se corre a su lado y se abre como un libro
  return [...moverPiezas(mitad[0], giroEje([0, 1, 0], -p * 0.5), [R, 0, 0], [p * R * 0.9, 0, p * R * 0.3]), ...moverPiezas(mitad[1], giroEje([0, 1, 0], p * 0.5), [-R, 0, 0], [-p * R * 0.9, 0, p * R * 0.3])];
}

/** Las articulaciones de un cuerpo (local: mira a +x, y a la izquierda, z arriba; una persona de pie mide 61). */
export interface Arti { pel: V3; pecho: V3; cab: V3; hom: [V3, V3]; codo: [V3, V3]; mano: [V3, V3]; rod: [V3, V3]; pie: [V3, V3] }
export interface OpcPersona {
  piel?: string; ropa: string;
  /** falda o vestido de la cintura al ruedo (A): material, cuánto baja (1 = al piso) y cuánto abre */
  tunica?: { mat: string; largo?: number; abre?: number; viento?: V3 };
  /**
   * manto que cuelga de los hombros: `bajo(t)` y `medio(t)` dan el ruedo y el medio de cada pliegue (t de 0 = hombro
   * derecho a 1 = izquierdo, por la espalda), en coordenadas propias; `envuelve` lo cierra por delante.
   */
  manto?: { mat: string; bajo: (t: number) => V3; medio?: (t: number) => V3; n?: number; grueso?: number; capucha?: boolean };
  pelo?: { mat: string; puntas: V3[]; grueso?: number };
  corona?: number; coronaApagada?: boolean;
  /** hombreras y peto de placa (el héroe) */
  placas?: string;
  /** la Brasa encendida en el pecho */
  brasa?: boolean;
}
/** Un cuerpo de masa (para leerse en silueta a contraluz): torso, cabeza, brazos, piernas y su ropa. */
export function persona(P: Arti, o: OpcPersona): Pieza[] {
  const ropa = { mat: o.ropa }, piel = { mat: o.piel ?? 'a7_piel' }, cs: Comp[] = [], ps: Pieza[] = [];
  const pel = P.pel, pe = P.pecho, cab = P.cab, arriba = norm(sub(pe, pel)), cue = lerp3(pe, cab, 0.5);
  cs.push(bulto(pel, [5, 6.6, 4.8], { ...ropa, ejes: ejesDe(arriba) }), hueso(pel, pe, 5.4, 6.4, ropa), bulto(pe, [5.2, 7.8, 6.2], { ...ropa, ejes: ejesDe(arriba) }));
  cs.push(hueso(add(pe, arriba, 3), cue, 2.6, 2.2, piel), bulto(cab, [3.9, 3.3, 4.4], { ...piel, ejes: ejesDe(norm(sub(cab, cue))) }));
  for (const i of [0, 1]) {
    const h = P.hom[i], c = P.codo[i], m = P.mano[i], dm = norm(sub(m, c));
    cs.push(bulto(h, [3.3, 3.3, 3.3], ropa), hueso(h, c, 2.6, 2.1, ropa), hueso(c, m, 2.1, 1.6, ropa), bulto(add(m, dm, 1.3), [2.3, 1.3, 1.8], { ...piel, eje: dm }));
    const cad = add(pel, [0, i ? 3.8 : -3.8, -1.5]), r = P.rod[i], pi = P.pie[i];
    cs.push(hueso(cad, r, 3.6, 2.7, ropa), hueso(r, pi, 2.6, 1.8, ropa), bulto(add(pi, [2, 0, -0.6]), [3.3, 1.5, 1.2], ropa));
  }
  if (o.tunica) {
    // el vestido: pliegues de la cintura al ruedo, que se abren en A y se tuercen con el viento
    const T = o.tunica, cint = lerp3(pel, pe, 0.2), zr = Math.max(1, cint[2] * (1 - (T.largo ?? 1))), ab = T.abre ?? 1, v = T.viento ?? [0, 0, 0], n = 10;
    const centro: V3 = [(P.pie[0][0] + P.pie[1][0]) / 2, (P.pie[0][1] + P.pie[1][1]) / 2, zr];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU, rr = (8.5 + (k % 2) * 1.6) * ab, top: V3 = add(cint, [Math.cos(a) * 4.6, Math.sin(a) * 5.6, 0]);
      const bot: V3 = add(centro, [Math.cos(a) * rr + v[0] * (0.6 + 0.4 * Math.cos(a)), Math.sin(a) * rr * 1.1 + v[1], 0]);
      cs.push(hueso(top, lerp3(top, bot, 0.5), 2.2, 2.8, { mat: T.mat }), hueso(lerp3(top, bot, 0.5), bot, 2.8, 3.4, { mat: T.mat }));
    }
  }
  ps.push(masa(cs, { mat: o.ropa, suave: 1.5 }));
  if (o.manto) {
    // el manto: pliegues gruesos de los hombros al ruedo por la espalda, fundidos en una tela con volumen
    const Mt = o.manto, n = Mt.n ?? 11, g = Mt.grueso ?? 1, mc: Comp[] = [];
    for (let k = 0; k < n; k++) {
      // los pliegues alternan: uno sale (lomo, más grueso) y el de al lado se mete (valle): la tela se lee por sus surcos
      const t = k / (n - 1), atras = Math.sin(Math.PI * t), lomo = k % 2 === 1, sale = (lomo ? 2.6 : -0.6) * g, kr = lomo ? 1.12 : 0.8;
      const top: V3 = add(lerp3(P.hom[0], P.hom[1], t), [-2.6 - atras * 3.2, 0, 1.5 + atras * 1.2]);
      const bot = Mt.bajo(t), med = Mt.medio ? Mt.medio(t) : lerp3(top, bot, 0.45), fuera = norm([med[0] - lerp3(P.pel, P.pecho, 0.5)[0], med[1] - P.pel[1], 0.0001]);
      const medS = add(med, fuera, sale), botS = add(bot, fuera, sale * 1.4);
      mc.push(hueso(top, medS, 2.2 * g * kr, 2.9 * g * kr, { mat: Mt.mat }), hueso(medS, botS, 2.9 * g * kr, 3.6 * g * kr, { mat: Mt.mat }));
    }
    // el cuello alto y, si va, la capucha caída sobre la espalda
    mc.push(hueso(add(lerp3(P.hom[0], P.hom[1], 0.5), [-3, 0, 2]), add(cue, [-2.5, 0, 0]), 4.5 * g, 3.6 * g, { mat: Mt.mat }));
    if (Mt.capucha) mc.push(bulto(add(cab, [-1.2, 0, 0.8]), [5.4, 4.8, 5.6], { mat: Mt.mat, ejes: ejesDe(norm(sub(cab, cue))) }), hueso(add(cab, [-3, 0, 3]), add(cab, [-8, 0, -4]), 3.6, 1, { mat: Mt.mat }));
    ps.push(masa(mc, { mat: Mt.mat, suave: 1.3 * g }));
  }
  if (o.pelo) { const pc: Comp[] = [], raiz = add(cab, [-2.2, 0, 2]); for (const q of o.pelo.puntas) pc.push(hueso(raiz, lerp3(raiz, q, 0.5), 2.8 * (o.pelo.grueso ?? 1), 2 * (o.pelo.grueso ?? 1), { mat: o.pelo.mat }), hueso(lerp3(raiz, q, 0.5), q, 2 * (o.pelo.grueso ?? 1), 0.5, { mat: o.pelo.mat })); pc.push(bulto(add(cab, [-0.8, 0, 1.2]), [4.1, 3.6, 4], { mat: o.pelo.mat })); ps.push(masa(pc, { mat: o.pelo.mat, suave: 1.4 })); }
  if (o.placas) {
    for (const i of [0, 1]) { const h = P.hom[i], s = i ? 1 : -1; ps.push(elipsoide(h[0] - 0.5, h[1] + s * 1.2, h[2] + 1.6, 4.6, 4.2, 2.6, { mat: o.placas, incl: s * 22, inclEje: 'x' }), elipsoide(h[0] - 0.5, h[1] + s * 2.2, h[2] - 0.6, 4, 3.6, 2, { mat: o.placas, incl: s * 38, inclEje: 'x' })); }
    ps.push(masa([bulto(add(pe, [1.4, 0, -0.5]), [4.6, 7.4, 6], { mat: o.placas, ejes: ejesDe(arriba) })], { mat: o.placas, suave: 0.5 }));
  }
  if (o.brasa) ps.push(elipsoide(pe[0] + 5.4, pe[1], pe[2] - 1, 1.6, 2.6, 3.2, { mat: 'a7_brasa' }), elipsoide(pe[0] + 5.6, pe[1] + 0.8, pe[2] + 1.5, 0.5, 0.9, 2.4, { mat: 'a7_brasa', giro: 30 }));
  if (o.corona) { const up = norm(sub(cab, cue)); ps.push(...moverPiezas(corona(o.corona, { apagada: o.coronaApagada }), ejesFila(up), [0, 0, 0], add(cab, up, 2.6))); }
  return ps;
}
/** Ejes (x adelante, y al costado, z = `arriba`) para un bulto inclinado. */
function ejesDe(arriba: V3): [V3, V3, V3] { const y = norm(cruz3(arriba, [1, 0, 0.0001])), x = cruz3(y, arriba); return [x, y, arriba]; }
/** La matriz (en filas) que lleva z a `arriba` (para moverPiezas). */
function ejesFila(arriba: V3): [V3, V3, V3] { const [x, y, z] = ejesDe(arriba); return [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]]; }

// ================================================================== fuego de Doom
const NF = 16, FPS = 12;
const tiras = new Map<string, Lamina[]>();
/** Tira de una llama de Doom que empalma (16 cuadros a 12 cps); `viento` la tumba hacia un lado (r2: hacia el norte). */
export function tiraFuego(tipo: TipoFuegoC, semilla: number, viento?: number): Lamina[] {
  const k = `${tipo}|${semilla}|${viento ?? ''}`;
  let t = tiras.get(k);
  if (t) return t;
  const [an, al, forma, altura, v0] = (tipo === 'corona' ? [14, 30, { tipo: 'llama', ancho: 0.45, afinar: 0.55 }, 0.55, 0.04]
    : tipo === 'vela' ? [10, 24, { tipo: 'llama', ancho: 0.5, afinar: 0.6 }, 0.8, 0.03]
      : tipo === 'brasa' || tipo === 'pecho' ? [26, 48, { tipo: 'pira', ancho: 18, alto: 5 }, 0.55, 0.08]
        : tipo === 'hoguera' ? [30, 100, { tipo: 'pira', ancho: 24, alto: 7 }, 0.7, 0.12]
          : tipo === 'estela' ? [34, 120, { tipo: 'llama', ancho: 0.5, afinar: 0.35 }, 0.6, 0.16]
            : [12, 28, { tipo: 'llama', ancho: 0.55, afinar: 0.5 }, 0.75, 0.1]) as [number, number, D.Forma, number, number];
  const vv = viento ?? v0, ancho = Math.round(an * (1 + Math.abs(vv) * 1.6));
  const f = D.crearFuego({ ancho, alto: al, forma, paleta: 'infierno', semilla, decay: D.decayPara(altura, al), viento: vv, rafagas: 0.25, turbulencia: 0.5, ruido: 0.45, humo: 0, margen: 2, brillo: 1.25, pegada: 0.6 });
  D.pasos(f, 80);
  t = cuadrosDoom(f, { cuadros: NF, celda: 2, pasos: 2, filtro: 0.55, k: 1, pie: 2 });
  tiras.set(k, t);
  return t;
}
/** Cuánto late el fuego en el instante t; empalma cada NF / FPS segundos. */
const latido = (t: number) => { const u = ((t * FPS) / NF) * TAU; return 0.9 + 0.06 * Math.sin(u) + 0.04 * Math.sin(u * 3 + 1) + 0.03 * Math.sin(u * 5 + 2); };
/** Los carteles de Doom de los fuegos de una escena en el instante t (con `ladea`, la llama corrida por el viento). */
function cartelesFuego(fuegos: Fuego[], t: number, viento?: number): Cartel[] {
  const fi = Math.round(t * FPS) % NF;
  return fuegos.map((f) => {
    const v = f.tipo === 'hoguera' || f.tipo === 'antorcha' ? viento : undefined, lam = tiraFuego(f.tipo, f.semilla, v)[(fi + f.semilla * 5) % NF];
    // con viento la grilla es más ancha (la llama tumbada): el cartel se ensancha igual, y corre su pie hacia el viento
    const ancho = f.ancho * (v !== undefined ? 1 + Math.abs(v) * 1.6 : 1);
    return { p: f.p, ancho, alto: f.alto, lam, k: f.k ?? 2.2, fondo: Math.max(6, f.ancho * 1.5) };
  });
}
/** Una tira por fuego (con su luz alrededor); las que se pisan se juntan. */
function zonasFuegos(a: Armado & { fuegos: Fuego[] }, margen = 8, escala = 1) {
  const b = baseCamara(a.cam), out: { caja: [number, number, number, number]; escala: number }[] = [];
  for (const f of a.fuegos) {
    const an = f.ancho * 1.4;
    const q = [[f.p[0] - an, f.p[1], f.p[2] - 2], [f.p[0] + an, f.p[1], f.p[2] + f.alto * 1.1], [f.p[0], f.p[1] - an, f.p[2] + f.alto * 0.5], [f.p[0], f.p[1] + an, f.p[2] + f.alto * 0.5]].map((p) => proyectar(b, p as V3)).filter((p): p is [number, number, number] => !!p);
    if (q.length) out.push({ caja: [Math.min(...q.map((p) => p[0])) - margen, Math.min(...q.map((p) => p[1])) - margen, Math.max(...q.map((p) => p[0])) + margen, Math.max(...q.map((p) => p[1])) + margen], escala });
  }
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    const A = out[i].caja, B = out[j].caja;
    if (A[0] < B[2] + 6 && B[0] < A[2] + 6 && A[1] < B[3] + 6 && B[1] < A[3] + 6) { out[i].caja = [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[2], B[2]), Math.max(A[3], B[3])]; out.splice(j, 1); j = i; }
  }
  return out.filter((z) => z.caja[2] > 0 && z.caja[3] > 0 && z.caja[0] < a.cam.w && z.caja[1] < a.cam.h);
}
/** Guarda el armado por tamaño (la escena se arma una vez por hilo). */
function enCache<T>(f: (w: number, h: number) => T): (w: number, h: number) => T {
  const m = new Map<string, T>();
  return (w, h) => { const k = `${w}|${h}`; let a = m.get(k); if (!a) { a = f(w, h); m.set(k, a); } return a; };
}

// ================================================================== ACTO 7: cae Aun-Saar, queda la Corona
/** Dónde se parte Aun-Saar: sobre el escalón 13, flotando; mira a la cámara de p1 (de la izquierda, abajo). */
const DIOS = { x: -40, y: 70, k: 1.3, giro: 58 };
const CAM_P1 = { pos: [150, 430, 420] as V3, mira: [-40, 70, 350] as V3, fov: 58, sx: 0.42, sy: 0.47, luna: dirAz(240, 4) };
/** Centro (promedio) de las piezas de un material en un grupo. */
function centroMat(esc: EscenaCine, g: number, mats: string[]): V3 | null {
  let s: V3 = [0, 0, 0], n = 0;
  esc.piezas.forEach((p, i) => {
    if (esc.grupoDe[i] !== g || !mats.includes(p.mat)) return;
    const c: V3 = p.k === 'elip' ? p.c : p.k === 'cono' ? p.o : p.k === 'masa' ? (p.esf.slice(0, 3) as V3) : p.pts.reduce((a, q) => add(a, q, 1 / p.pts.length), [0, 0, 0] as V3);
    s = add(s, c); n++;
  });
  return n ? [s[0] / n, s[1] / n, s[2] / n] : null;
}
function armarP1(w: number, h: number): Cielo {
  const { esc, atm, fuegos, plumas } = armarCielo('noche', { luna: CAM_P1.luna });
  // Aun-Saar partido (el cuadro 4 de su muerte: los pedazos separados flotan, todavía no caen)
  const zD = zEscalon(escalonEn(DIOS.y)) - 30;
  const g = esc.poner(piezasDe('jefe_aun_saar_morir', 'se', 1, 4), { x: DIOS.x, y: DIOS.y, z: zD, giro: DIOS.giro, k: DIOS.k }, { nieve: 0 });
  // la boca del pecho: su luz va por el canal 1 (en el fondo, apagada; la capa de luz la apaga de a poco en el plano)
  const boca = centroMat(esc, g, ['j2_luz']) ?? [DIOS.x, DIOS.y, zD + 200];
  esc.emision.j2_luz = { k: 6, canal: 1 }; esc.emision.j2_luz_oro = { k: 0.25 };
  esc.emision.j2_borde_vacio = { k: 0.5 };
  esc.luces.push({ p: add(boca, [14, -18, 0]), c: hexLin('#ffd890'), k: 3.5, r: 55, canal: 1, sombra: true, envuelve: 0.3, halo: 0.0006 });
  // sangre dorada que chorrea de los pedazos sobre los escalones de abajo
  icor(esc, 8, 15, 120, 13);
  const C = CAM_P1;
  return { esc, atm, cam: camaraEncuadre(C.pos, C.mira, C.fov, C.sx, C.sy, w, h), fuegos, plumas };
}
/**
 * La sangre del dios en la escalinata: charcos chatos en las huellas de los escalones i0..i1 (alrededor de x = cx, de
 * ancho `an`) y los hilos que caen por las tabicas de uno al de abajo.
 */
function icor(esc: EscenaCine, i0: number, i1: number, an: number, s: number, cx = 0, mat = 'a7_icor') {
  const ps: Pieza[] = [];
  for (let i = i0; i <= i1; i++) {
    const n = 2 + Math.floor(az(s * 7 + i, 1) * 3);
    for (let k = 0; k < n; k++) {
      const x = cx + (az(s * 7 + i, k + 2) - 0.5) * an, y = yEscalon(i) + 3 + az(s * 7 + i, k + 9) * (ESC.huella - 5), z = zEscalon(i);
      const rx = 4 + az(s * 7 + i, k + 16) * 12, ry = 2.5 + az(s * 7 + i, k + 23) * 5;
      ps.push(elipsoide(x, y, z + 0.05, rx, Math.min(ry, ESC.huella * 0.45), 0.45, { mat, giro: (az(s * 7 + i, k + 30) - 0.5) * 50 }));
      // el hilo que cae por la nariz del escalón hasta la huella de abajo, con su gota al pie
      if (i > 0 && az(s * 7 + i, k + 37) < 0.6) {
        const xx = x + (az(s * 7 + i, k + 44) - 0.5) * rx;
        ps.push(palo([xx, yEscalon(i) + 1.5, z + 0.3], [xx, yEscalon(i) - 0.4, z - 2.4], 1.05, { mat, r1: 0.95 }), palo([xx, yEscalon(i) - 0.6, z - 2.4], [xx, yEscalon(i) - 0.6, z - ESC.contra + 1], 0.85, { mat, r1: 0.6 }));
        ps.push(elipsoide(xx, yEscalon(i) - 3, z - ESC.contra + 0.1, 3 + az(s, k) * 3, 2.4, 0.4, { mat }));
      }
    }
  }
  esc.ponerMundo(ps, { nieve: 0 });
}

/**
 * Charcos de sangre dorada en un piso plano (z) alrededor de `c`: manchas chatas que se pisan, con salpicaduras, y un
 * reguero que va hacia `hacia` (la sangre corre al borde y baja por la escalinata).
 */
function charcos(esc: EscenaCine, c: V3, r: number, n: number, s: number, o: { hacia?: V3; mat?: string } = {}) {
  const ps: Pieza[] = [], mat = o.mat ?? 'a7_icor';
  for (let k = 0; k < n; k++) {
    const a = az(s, k) * TAU, d = Math.sqrt(az(s, k + 40)) * r, x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d;
    const R = (k < 3 ? 8 : 2.5) + az(s, k + 80) * (k < 3 ? 8 : 5);
    ps.push(elipsoide(x, y, c[2] + 0.05, R, R * (0.5 + az(s, k + 120) * 0.4), 0.45, { mat, giro: az(s, k + 160) * 180 }));
  }
  if (o.hacia) for (let k = 0; k < 9; k++) { const t = k / 8, p = lerp3(c, o.hacia, t); ps.push(elipsoide(p[0] + (az(s, k + 200) - 0.5) * 8, p[1], c[2] + 0.05, 3 + az(s, k + 210) * 3, 9, 0.4, { mat })); }
  esc.ponerMundo(ps, { nieve: 0 });
}

/** La Corona en la grada de abajo del trono vacío, de canto contra la de arriba, entre la sangre dorada del dios. */
const CORONA_P2: V3 = [24, TRONO.y + 10 - GRADAS[0] + 12, PLAT.z + 10];
const CAM_P2 = { pos: [-56, TRONO.y - 270, PLAT.z + 62] as V3, fov: 44, sx: 0.58, sy: 0.64, luna: dirAz(70, 24) };
function armarP2(w: number, h: number): Cielo {
  const { esc, atm, fuegos, plumas } = armarCielo('noche', { luna: CAM_P2.luna });
  const R = 9, c = CORONA_P2;
  esc.ponerMundo(moverPiezas(corona(R), giroEje(norm([1, 0.25, 0]), -0.95), [0, 0, 0], add(c, [0, 0, 6])), { nieve: 0 });
  // su fuego bajito: lenguas chicas que salen del aro, y su luz cálida (canal 1, late) que moja el oro y la sangre
  for (const [dx, dy, dz, an, al, s] of [[-4, 2, 12, 4, 10, 701], [3, 4, 14, 3.4, 8, 702], [6, -1, 9, 3, 7, 703], [-7, -2, 8, 2.6, 6, 704]] as [number, number, number, number, number, number][]) fuegos.push({ p: add(c, [dx, dy, dz]), ancho: an, alto: al, semilla: s, tipo: 'corona', k: 2.4 });
  esc.luces.push({ p: add(c, [0, -8, 14]), c: hexLin('#ff9a3a'), k: 2.6, r: 22, canal: 1, sombra: true, envuelve: 0.35, halo: 0.0007 });
  esc.emision.a7_corona_ascua = { k: 3.5, canal: 1 };
  // la sangre: charcos en las gradas y en el piso de la plataforma, y el reguero que baja a la escalinata
  charcos(esc, [c[0] - 10, c[1] - 8, PLAT.z + 10], 46, 12, 31);
  charcos(esc, [c[0] - 16, c[1] - 30, PLAT.z], 30, 10, 32, { hacia: [-10, PLAT.y0 + 4, PLAT.z] });
  charcos(esc, [8, TRONO.y - 20, PLAT.z + 20], 30, 6, 33);
  icor(esc, 19, 27, 120, 21, -10);
  // el filo de contraluz encendía el piso al ras: acá, más fino
  atm.borde = { ...atm.borde, k: 1.2 };
  const cam = camaraEncuadre(CAM_P2.pos, add(c, [0, 0, 10]), CAM_P2.fov, CAM_P2.sx, CAM_P2.sy, w, h);
  return { esc, atm, cam, fuegos, plumas };
}

// ================================================================== VIGILIA: la Corona a Auren, la Iglesia la encierra
/** Auren de rodillas al pie de la escalinata (mira a -y, hacia el que le da la Corona); la cámara lo ve de perfil. */
const AUREN = { x: 40, y: -310, giro: -90, k: 1.1 };
const CAM_V1 = { pos: [290, -236, 46] as V3, mira: [26, -316, 30] as V3, fov: 30, sx: 0.4, sy: 0.56, luna: dirAz(172, 12) };
/** Auren: de rodillas sobre la derecha, la Corona envuelta contra el pecho, la cabeza gacha y vuelta (no la mira). */
function auren(): { ps: Pieza[]; bulto: V3 } {
  const P: Arti = {
    pel: [0, 0, 22], pecho: [2.4, 0, 35], cab: [3.2, -3.4, 43.2], hom: [[1.4, -7.6, 39.5], [1.4, 7.6, 39.5]],
    codo: [[6.5, -9.5, 29], [7.5, 8.5, 31.5]], mano: [[12, -2.5, 29], [11.5, 3.5, 37]], rod: [[0.5, -4, 1.6], [15, 4.6, 20]], pie: [[-15, -4, 1.4], [14.5, 4.8, 1.4]],
  };
  // el manto: cae de los hombros, se abre atrás sobre el piso en un charco de pliegues y vuelve por delante a envolver
  const ps = persona(P, {
    ropa: 'a7_manto_blanco', piel: 'a7_piel',
    manto: {
      mat: 'a7_manto_blanco', n: 19, grueso: 1.05, capucha: true,
      bajo: (t) => { const a = (t - 0.5) * Math.PI * 1.25; return [-12 - Math.cos(a) * 20 + (az(Math.round(t * 12), 601) - 0.5) * 4, Math.sin(a) * 30, 1.4 + az(Math.round(t * 12), 602) * 1.2]; },
      medio: (t) => { const a = (t - 0.5) * Math.PI * 1.1; return [-8 - Math.cos(a) * 9, Math.sin(a) * 17, 17 - Math.abs(t - 0.5) * 6]; },
    },
    pelo: { mat: 'a7_pelo_blanco', puntas: [[-4, -6, 33], [-6, -2, 31], [-5, 3, 33]], grueso: 1.1 },
  });
  // el bulto: la Corona envuelta en un pliegue del manto, apretada contra el pecho, con una rendija por donde se ve arder
  const b: V3 = [9.5, 1.5, 31];
  ps.push(masa([bulto(b, [5.6, 7, 6], { mat: 'a7_manto_blanco' }), bulto(add(b, [1.2, 3, -2]), [3.8, 4.4, 3.6], { mat: 'a7_manto_blanco' }), hueso(add(b, [-2, 5, 4]), [1.4, 7.6, 39.5], 3, 3.8, { mat: 'a7_manto_blanco' }), hueso(add(b, [0, -5, -4]), [1, -5, 20], 3.4, 4.6, { mat: 'a7_manto_blanco' }), hueso(add(b, [2, 6, -5]), [2, 9, 12], 2.6, 4.2, { mat: 'a7_manto_blanco' })], { mat: 'a7_manto_blanco', suave: 2 }));
  // la rendija por donde se ve arder (del lado de la cámara)
  ps.push(elipsoide(b[0] + 3.6, b[1] + 5.6, b[2] + 1, 2.6, 0.5, 0.9, { mat: 'a7_corona_ascua', giro: 30, incl: 15 }), elipsoide(b[0] + 4.8, b[1] + 3.8, b[2] - 2, 1.8, 0.4, 0.6, { mat: 'a7_corona_ascua', giro: 40 }));
  return { ps, bulto: b };
}
function armarV1(w: number, h: number): Cielo {
  const { esc, atm, fuegos, plumas } = armarCielo('noche', { luna: CAM_V1.luna });
  const A = AUREN, { ps, bulto: b } = auren(), g = esc.poner(ps, { x: A.x, y: A.y, z: 0, giro: A.giro, k: A.k }, { nieve: 0 });
  void g;
  const gr = (A.giro * Math.PI) / 180, bw: V3 = [A.x + (b[0] * Math.cos(gr) - b[1] * Math.sin(gr)) * A.k, A.y + (b[0] * Math.sin(gr) + b[1] * Math.cos(gr)) * A.k, b[2] * A.k];
  // la luz de la Corona que se escapa por la rendija del manto: baja, tibia, solo lame las manos y el pliegue
  esc.luces.push({ p: add(bwOut(bw, gr, 7), [0, 0, 1]), c: hexLin('#ff9a40'), k: 1.6, r: 9, canal: 1, envuelve: 0.5, halo: 0.002 });
  esc.emision.a7_corona_ascua = { k: 2.6, canal: 1 };
  icor(esc, 0, 4, 120, 41, -20);
  const C = CAM_V1;
  return { esc, atm, cam: camaraEncuadre(C.pos, C.mira, C.fov, C.sx, C.sy, w, h), fuegos, plumas };
}
/** Un punto corrido `d` hacia adelante del que mira con giro `gr` (radianes). */
const bwOut = (p: V3, gr: number, d: number): V3 => [p[0] + Math.cos(gr) * d, p[1] + Math.sin(gr) * d, p[2]];

// ---------------------------------------------------------------- la cripta del relicario
/** La cripta: nave corta de bóvedas de arista, el altar con el relicario en el medio y los monjes en media luna. */
const CRI = { lado: 260, bahia: 100, arranque: 150, col: 12 };
const RELICARIO: V3 = [0, 60, 0];
/** El relicario de hierro con sus siete sellos de lacre, sobre su altar de piedra, con las cadenas cruzadas. */
function relicario(c: V3): { ps: Pieza[]; sellos: V3[]; frente: V3 } {
  const ps: Pieza[] = [], za = 46, W = 60, P = 34, H = 40, sellos: V3[] = [];
  // el altar: bloque con su moldura y la losa de arriba
  ps.push(caja(c[0], c[1], 0, 96, 60, za - 6, { mat: 'abo_sillar' }), caja(c[0], c[1], za - 6, 104, 68, 6, { mat: 'abo_labra' }), caja(c[0], c[1], 0, 106, 70, 6, { mat: 'abo_labra' }));
  // el arca: caja de hierro con la tapa a cuatro aguas, cantoneras, bandas remachadas y una reja en el frente
  const z0 = za;
  ps.push(caja(c[0], c[1], z0, W, P, H, { mat: 'a7_hierro' }));
  ps.push(poliedro([[c[0] - W / 2 - 2, c[1] - P / 2 - 2, z0 + H], [c[0] + W / 2 + 2, c[1] - P / 2 - 2, z0 + H], [c[0] - W / 2 - 2, c[1] + P / 2 + 2, z0 + H], [c[0] + W / 2 + 2, c[1] + P / 2 + 2, z0 + H], [c[0] - W / 4, c[1], z0 + H + 16], [c[0] + W / 4, c[1], z0 + H + 16]], { mat: 'a7_hierro' }));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(caja(c[0] + sx * (W / 2 - 3), c[1] + sy * (P / 2 - 3), z0 - 1, 8, 8, H + 2, { mat: 'a7_hierro', tono: 0.08 }));
  for (const x of [-18, 0, 18]) { ps.push(caja(c[0] + x, c[1], z0 - 0.5, 5, P + 2, H + 1, { mat: 'a7_hierro', tono: 0.1 })); for (const z of [6, 20, 34]) ps.push(esfera(c[0] + x, c[1] - P / 2 - 1.2, z0 + z, 1.1, { mat: 'a7_hierro', tono: 0.15 })); }
  // la reja del frente (detrás, lo que late): el hueco y sus barrotes
  const fr: V3 = [c[0] - 9, c[1] - P / 2, z0 + 22];
  ps.push(caja(fr[0], fr[1] - 0.2, fr[2] - 7, 12, 3, 14, { mat: 'a7_hierro', resta: true }));
  for (let i = -2; i <= 2; i++) ps.push(palo([fr[0] + i * 2.4, fr[1] - 0.8, fr[2] - 7], [fr[0] + i * 2.4, fr[1] - 0.8, fr[2] + 7], 0.55, { mat: 'a7_hierro', tono: 0.1 }));
  ps.push(caja(fr[0], fr[1] + 3, fr[2] - 7, 11, 3, 14, { mat: 'a7_latido' }));
  // las cadenas que cruzan el arca de esquina a esquina y bajan al altar
  for (const s of [-1, 1]) ps.push(...cadena([c[0] - W / 2 - 4, c[1] + s * (P / 2 + 1), z0 + 2], [c[0] + W / 2 + 4, c[1] - s * (P / 2 + 1), z0 + H + 6], -10, 2.2, 'a7_hierro'));
  // los siete sellos: discos de lacre con cintas, sobre las bandas y la tapa
  const lugares: V3[] = [[-18, -P / 2 - 1.6, 30], [0, -P / 2 - 1.6, 30], [18, -P / 2 - 1.6, 30], [-18, -P / 2 - 1.6, 12], [18, -P / 2 - 1.6, 12], [-W / 4, -6, H + 9], [W / 4, -6, H + 9]];
  lugares.forEach(([x, y, z], i) => {
    const q: V3 = [c[0] + x, c[1] + y, z0 + z]; sellos.push(q);
    const n: V3 = i < 5 ? [0, -1, 0] : norm([0, -1, 1]);
    ps.push(cilindro(q[0], q[1], q[2], 3, 1.2, { mat: 'a7_lacre', eje: n }), cilindro(q[0] + n[0] * 1.2, q[1] + n[1] * 1.2, q[2] + n[2] * 1.2, 1.9, 0.5, { mat: 'a7_lacre', eje: n, tono: 0.1 }));
    for (const s of [-1, 1]) ps.push(caja(q[0] + s * 1.2, q[1] + n[1] * 0.4, q[2] - 7, 1.2, 0.4, 6, { mat: 'ci_tela_roja', giro: s * 12 }));
  });
  return { ps, sellos, frente: fr };
}
/** La nave de la cripta (bóvedas de arista sobre columnas, muros con nichos) y su aire quieto. */
function criptaRelicario(esc: EscenaCine) {
  const C = CRI, B = C.bahia, Z = C.arranque;
  esc.ponerMundo([caja(0, 0, -20, C.lado * 2 + 80, C.lado * 3 + 80, 20, { mat: 'ci_losa' })], { nieve: 0 });
  const techo: Pieza[] = [caja(0, 0, Z, C.lado * 2 + 40, C.lado * 3 + 40, 260, { mat: 'abo_sillar' })];
  for (const k of [-3, -1, 1, 3]) techo.push(cilindro(-C.lado - 40, k * B * 0.75, Z, B * 0.75, C.lado * 2 + 80, { mat: 'abo_sillar', eje: [1, 0, 0], resta: true }));
  for (const k of [-2, 0, 2]) techo.push(cilindro(k * B, -C.lado * 1.5 - 40, Z, B, C.lado * 3 + 80, { mat: 'abo_sillar', eje: [0, 1, 0], resta: true }));
  esc.ponerMundo(techo, { nieve: 0 });
  for (const x of [-B, B]) for (const y of [-150, 0, 150, 300]) { esc.ponerMundo(columnaGotica(x, y, 0, Z, C.col), { nieve: 0 }); }
  for (const x of [-B, B]) for (const y of [-150, 150]) esc.poner(arcoMedio(75 - 9, 9, 20, 'abo_labra'), { x, y: y + 0, z: Z, giro: 90 });
  for (const y of [-150, 0, 150, 300]) esc.poner(arcoMedio(B - 9, 9, 22, 'abo_labra'), { x: 0, y, z: Z, giro: 0 });
  // muros del fondo y de los lados con nichos de calaveras (osario) donde arden velas
  const muro = (x: number, y: number, giro: number, largo: number) => { const ps: Pieza[] = [caja(0, 0, -20, 40, largo, Z + 280, { mat: 'abo_sillar' })]; for (let j = -2; j <= 2; j++) ps.push(caja(-2, j * (largo / 5.5), 40, 38, 30, 44, { mat: 'abo_sillar', resta: true }), cilindro(-22, j * (largo / 5.5), 84, 15, 38, { mat: 'abo_sillar', eje: [1, 0, 0], resta: true })); esc.poner(ps, { x, y, z: 0, giro }); };
  muro(C.lado + 20, 0, 0, C.lado * 3); muro(-C.lado - 20, 0, 180, C.lado * 3); muro(0, C.lado * 1.5 + 20, 90, C.lado * 2);
}
/** Los que cantan: monjes de hábito y capucha con las manos juntas, en media luna alrededor del relicario. */
function monjesCanto(esc: EscenaCine, c: V3, R: number, n: number, a0: number, a1: number, s: number) {
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / Math.max(1, n - 1), x = c[0] + Math.cos(a) * R, y = c[1] + Math.sin(a) * R, alto = 58 + az(s + i, 1) * 8;
    const mira = (Math.atan2(c[1] - y, c[0] - x) * 180) / Math.PI;
    // las manos juntas frente al pecho (cantan), la cabeza apenas levantada
    esc.poner(monje(alto, [[9, -1.6, 41], [9, 1.6, 42]], -3 - az(s + i, 2) * 4, s + i), { x, y, z: 0, giro: mira });
  }
}
export type ArmadoCripta = Cielo & { sellos: V3[]; latido: V3 };
const CAM_V2 = { pos: [-34, -130, 40] as V3, mira: [RELICARIO[0], RELICARIO[1], 64] as V3, fov: 48, sx: 0.54, sy: 0.52 };
function armarCripta(w: number, h: number, o: { cam: 'v2' | 'v3'; latido?: boolean }): ArmadoCripta {
  const esc = new EscenaCine(), fuegos: Fuego[] = [], c = RELICARIO;
  criptaRelicario(esc);
  const r = relicario(c);
  esc.ponerMundo(r.ps, { nieve: 0 });
  // las velas: en candeleros de hierro alrededor del altar y una fila en el borde de la losa; las de los nichos
  const luzVela = hexLin('#ffa458');
  const ponerVela = (x: number, y: number, z: number, alto: number, rr: number, s: number, k: number, sombra = true) => {
    const v = vela(x, y, z, alto, rr, s); esc.ponerMundo(v.ps, { nieve: 0 });
    esc.luces.push({ p: [v.llama[0], v.llama[1], v.llama[2] + 1.5], c: luzVela, k, r: 34, sombra, envuelve: 0.25, halo: 0.0006 });
    fuegos.push({ p: [v.llama[0], v.llama[1], v.llama[2] - rr * 0.4], ancho: rr * 1.5, alto: rr * 4.2, semilla: 300 + s, tipo: 'vela', k: 2.2 });
  };
  for (const [x, y] of (o.cam === 'v3' ? [[-70, 96], [70, 96]] : [[-70, 30], [70, 30], [-70, 96], [70, 96]]) as [number, number][]) { esc.ponerMundo([cilindro(c[0] + x, c[1] + (y - 60), 0, 7, 3, { mat: 'a7_hierro' }), palo([c[0] + x, c[1] + (y - 60), 3], [c[0] + x, c[1] + (y - 60), 58], 1.3, { mat: 'a7_hierro' }), cilindro(c[0] + x, c[1] + (y - 60), 58, 4.5, 1.2, { mat: 'a7_hierro' })], { nieve: 0 }); ponerVela(c[0] + x, c[1] + (y - 60), 59.2, 12 + az(x + y, 3) * 6, 2.2, x + y + 500, 1.3); }
  // la última vela: sobre la losa del altar, frente a la reja (la de v3)
  if (o.cam === 'v3') { const x = c[0] - 34, y = c[1] - 46; esc.ponerMundo([cilindro(x, y, 0, 8, 3, { mat: 'a7_hierro' }), palo([x, y, 3], [x, y, 46], 1.3, { mat: 'a7_hierro' }), cilindro(x, y, 45, 5, 1.4, { mat: 'a7_hierro', r1: 6 })], { nieve: 0 }); ponerVela(x, y, 46.4, 11, 2.6, 801, 0.55); }
  else { ponerVela(c[0] + 14, c[1] - 26, 46, 7, 2, 801, 0.9); ponerVela(c[0] - 30, c[1] - 27, 46, 4, 1.8, 802, 0.7); }
  for (const [x, y, z] of [[CRI.lado + 2, -94, 40], [CRI.lado + 2, 47, 40], [-CRI.lado - 2, -47, 40], [-CRI.lado - 2, 94, 40], [-60, CRI.lado * 1.5 + 2, 40], [60, CRI.lado * 1.5 + 2, 40]] as V3[]) ponerVela(x, y, z + 2, 8 + az(x, y) * 8, 2.2, Math.round(x + y), 0.8, false);
  // los monjes: media luna detrás y a los lados del altar, y dos de espaldas en primer plano (siluetas contra las velas)
  monjesCanto(esc, c, 96, 5, 0.2 * Math.PI, 0.8 * Math.PI, 61);
  monjesCanto(esc, c, 104, 2, -0.08 * Math.PI, 0.06 * Math.PI, 66);
  monjesCanto(esc, c, 104, 2, 0.94 * Math.PI, 1.08 * Math.PI, 68);
  const frente: number[] = [];
  for (const [x, y, k] of [[-62, -64, 64], [54, -76, 62], [-8, -96, 63]] as [number, number, number][]) frente.push(esc.poner(monje(k, [[9, -1.6, 41], [9, 1.6, 42]], -4, 70 + x), { x: c[0] + x, y: c[1] + y, z: 0, giro: (Math.atan2(-y, -x) * 180) / Math.PI }));
  if (o.cam === 'v2') for (const g of frente) esc.frente.add(g);
  // lo que late detrás de la reja (la sed dormida): su luz por la reja y las rendijas (la variante la enciende)
  esc.emision.a7_latido = { k: o.latido ? 3 : 0.15 };
  if (o.latido) esc.luces.push({ p: add(r.frente, [0, -4, 0]), c: hexLin('#ff6a20'), k: 2.2, r: 14, envuelve: 0.3, halo: 0.003 });
  esc.emision.ci_llama = { k: 4 };
  const aire: C3 = [0.008, 0.008, 0.0095];
  const atm: Atmosfera = {
    sol: { dir: [0, 0, 1], c: [0, 0, 0], k: 0 }, cielo: () => [0, 0, 0], aire: () => aire,
    // una luz fría muy baja que baja de una tronera del techo (el único frío del cuadro)
    ambCielo: [0.0026, 0.003, 0.0045], ambSuelo: [0.001, 0.0009, 0.0009],
    niebla: { densidad: 1 / 4200, baja: 1 / 60, z0: 0, H: 9, ruido: 0.8, escalaRuido: 0.014 },
    borde: { c: luzVela, k: 0.8 }, oclusion: 0.95, oclusionLargo: 180,
  };
  esc.luces.push({ p: [-40, 200, 330], c: hexLin('#7d94c8'), k: 0.6, r: 260, envuelve: 0.1 });
  const cam = o.cam === 'v2'
    ? camaraEncuadre(CAM_V2.pos, CAM_V2.mira, CAM_V2.fov, CAM_V2.sx, CAM_V2.sy, w, h)
    : camaraEncuadre([c[0] - 40, c[1] - 92, 62], add(r.frente, [4, 0, 0]), 32, 0.62, 0.46, w, h);
  return { esc, atm, cam, fuegos, plumas: [], sellos: r.sellos, latido: r.frente };
}

// ================================================================== CIELO: Mira parte la Corona
const MIRA = { x: -40, y: -260, giro: 90 };
const CAM_C1 = { pos: [64, -404, 30] as V3, mira: [-40, -260, 70] as V3, fov: 48, sx: 0.42, sy: 0.42, luna: dirAz(124, 9) };
/** Mira de pie con los brazos arriba: las dos manos parten la Corona sobre su cabeza; el pelo y el vestido al viento. */
function mira(p: number): { ps: Pieza[]; corona: V3 } {
  const P: Arti = {
    pel: [0, 0, 33], pecho: [-1.2, 0, 46], cab: [-3, 0, 54.6], hom: [[-1.5, -7.4, 49], [-1.5, 7.4, 49]],
    codo: [[0, -10.5, 59.5], [0, 10.5, 59.5]], mano: [[1.5, -5 - p * 3, 69.5], [1.5, 5 + p * 3, 69.5]], rod: [[1.4, -3.8, 18], [-0.6, 4, 18]], pie: [[1, -4.5, 1.4], [-2, 4.5, 1.4]],
  };
  const ps = persona(P, {
    ropa: 'a7_tela_morada', piel: 'a7_piel',
    tunica: { mat: 'a7_tela_morada', largo: 1, abre: 1.1, viento: [-3, 2, 0] },
    pelo: { mat: 'a7_pelo', puntas: [[-12, 2, 47], [-15, 4, 42], [-10, -1, 44]], grueso: 1.2 },
  });
  const cor: V3 = [1.5, 0, 71];
  ps.push(...moverPiezas(corona(6.2, { partida: p }), giroEje([0, 1, 0], -0.25), [0, 0, 0], add(cor, [0, 0, -2])));
  // la grieta de luz entre las dos mitades
  ps.push(elipsoide(cor[0], cor[1], cor[2] + 3, 1.2, 1 + p * 3, 5, { mat: 'a7_luz_blanca' }));
  return { ps, corona: cor };
}
function armarC1(w: number, h: number): Cielo {
  const { esc, atm, fuegos, plumas } = armarCielo('noche', { luna: CAM_C1.luna });
  const m = mira(0.22), g = esc.poner(m.ps, { x: MIRA.x, y: MIRA.y, z: 0, giro: MIRA.giro, k: 1 }, { nieve: 0 });
  void g;
  const gr = (MIRA.giro * Math.PI) / 180, cw: V3 = [MIRA.x + m.corona[0] * Math.cos(gr) - m.corona[1] * Math.sin(gr), MIRA.y + m.corona[0] * Math.sin(gr) + m.corona[1] * Math.cos(gr), m.corona[2] + 3];
  // la luz blanca (canal 1): en el fondo, un hilo; la capa de luz la abre hasta llenar el cuadro
  esc.emision.a7_luz_blanca = { k: 6, canal: 1 };
  esc.luces.push({ p: cw, c: hexLin('#eef2ff'), k: 6, r: 60, canal: 1, sombra: true, envuelve: 0.3, halo: 0.0012 });
  esc.emision.a7_corona_ascua = { k: 1.6 };
  const C = CAM_C1;
  return { esc, atm, cam: camaraEncuadre(C.pos, C.mira, C.fov, C.sx, C.sy, w, h), fuegos, plumas };
}

// ---------------------------------------------------------------- c2: el cielo se abre y caen los dioses
const CAM_C2 = { pos: [260, -560, 30] as V3, mira: [-300, -4200, 1700] as V3, fov: 58, sx: 0.46, sy: 0.46 };
function armarC2(w: number, h: number): Cielo {
  const { esc, fuegos, plumas } = armarCielo('abierta', { luna: dirAz(HERIDA.az, 24) });
  // la luz principal es la herida blanca del cielo: todo se recorta contra ella
  const atm = atmCielo('abierta', { luna: norm(dirAz(HERIDA.az + 4, 22)) });
  atm.sol = { dir: norm(dirAz(HERIDA.az + 4, 22)), c: hexLin('#f2f0ea'), k: 1.6, ancho: 0.08 };
  atm.borde = { c: hexLin('#f4f2ec'), k: 3.4 };
  // lo que cae: islas de ruinas ladeadas y dioses de piedra (estatuas, cabezas colosales, ángeles) que arden; la
  // estela de fuego de Doom sube detrás de cada uno y su humo se tuerce
  const caen: [string, string, number, V3, number, number, number][] = [
    ['cel_isla_ruinas', 'con_columnas', 7, [700, -3300, 1500], 30, 40, 901], ['cel_isla_ruinas', 'grande', 9, [-1700, -4800, 2400], -25, 120, 902],
    ['cel_cabeza_coloso', 'partida', 7, [380, -1500, 640], 60, 300, 903], ['cel_estatua_angel', 'con_espada', 8, [1500, -3900, 2600], -40, 30, 904],
    ['cel_angel_caido', 'de_espaldas', 7, [-900, -3000, 2900], 70, 200, 905], ['cel_estatua_angel', 'entera', 6, [-2300, -2600, 1300], 20, 80, 906],
    ['cel_isla_ruinas', 'con_arco', 6, [2300, -2400, 900], 15, 250, 907],
  ];
  for (const [id, v, k, p, incl, giro, s] of caen) {
    const ps = moverPiezas(piezasDe(id, v, s), giroEje(norm([az(s, 1) - 0.5, az(s, 2) - 0.5, 0.2]), (incl * Math.PI) / 180));
    esc.poner(ps, { x: p[0], y: p[1], z: p[2], giro, k }, { nieve: 0 });
    // el fuego: varias lenguas de estela que suben del cuerpo, su luz (canal 1) y el humo
    const r = 30 * k;
    for (let j = 0; j < 4; j++) fuegos.push({ p: add(p, [(az(s, j + 3) - 0.5) * r, (az(s, j + 9) - 0.5) * r * 0.5, r * 0.2 + j * r * 0.1]), ancho: r * (0.7 + az(s, j + 15) * 0.5), alto: r * (2.6 + az(s, j + 21) * 1.6), semilla: s * 10 + j, tipo: 'estela', k: 2.6 });
    esc.luces.push({ p: add(p, [0, -r * 0.6, r * 0.4]), c: hexLin('#ff6a24'), k: 6, r: r * 1.6, canal: 1, envuelve: 0.4 });
    plumas.push({ base: add(p, [0, 0, r * 1.6]), alto: r * 9, r0: r * 0.5, r1: r * 3, viento: [0.15, 0.05, 0], dens: 0.01 / k, humo: [0.05, 0.045, 0.045], abajo: hexLin('#ff5a1a'), kAbajo: 1, semilla: s, sube: 14, escala: 1 / (24 * k), sol: 0.5 });
  }
  // la jaula rota: barrotes de oro que caen sueltos, ladeados, cerca de la herida
  for (let i = 0; i < 9; i++) { const a = (HERIDA.az - 30 + az(i, 931) * 60) * Math.PI / 180, d = 3000 + az(i, 932) * 3000, z = 1800 + az(i, 933) * 2400, p: V3 = [Math.cos(a) * d, Math.sin(a) * d, z], dir = norm([az(i, 934) - 0.5, az(i, 935) - 0.5, 1.4]); esc.ponerMundo([palo(p, add(p, dir, 900 + az(i, 936) * 900), 9, { mat: 'cel_oro' })], { nieve: 0 }); }
  const C = CAM_C2;
  return { esc, atm, cam: camaraEncuadre(C.pos, C.mira, C.fov, C.sx, C.sy, w, h), fuegos, plumas };
}

// ---------------------------------------------------------------- c3: el alba sobre Velmora
/** El alba pálida: el sol bajo y blanco detrás de la abadía, cielo lavado sin herida, la nieve tibia apenas. */
function atmAlbaPalida(): Atmosfera {
  const L = dirAz(84, 7.5), sol = hexLin('#f4e6d2');
  const pars: [number, C3][] = [[0, hexLin('#8a8c90')], [0.05, hexLin('#7a8494')], [0.16, hexLin('#5c6a84')], [0.38, hexLin('#3c4a68')], [0.9, hexLin('#1e2640')]];
  const brillo = (d: V3, e: number) => { const g = Math.max(0, dot3(d, L)); return escalar(hexLin('#f6dcc0'), (0.6 * Math.pow(g, 80) + 0.2 * Math.pow(g, 10) + 0.05 * Math.pow(g, 2)) * Math.exp(-Math.max(0, e) * 7) + 0.8 * Math.pow(g, 260)); };
  const kAire = (e: number) => 0.5 + 0.5 * suave(0, 0.12, e);
  const aire = (d: V3): C3 => { const e = Math.min(0.03, Math.max(0, d[2])), b = gradiente(pars, e), gl = brillo(norm([d[0], d[1], e]), e), k = kAire(e); return [b[0] + gl[0] * k, b[1] + gl[1] * k, b[2] + gl[2] * k]; };
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2])));
    if (e < 0.03) return aire(d);
    const b = gradiente(pars, e), gl = brillo(d, e), g = Math.max(0, dot3(d, L)), ka = kAire(e), q = 22 * Math.pow(g, 4000) + 0.8 * Math.pow(g, 300);
    let c: C3 = [b[0] + gl[0] * ka + sol[0] * q, b[1] + gl[1] * ka + sol[1] * q, b[2] + gl[2] * ka + sol[2] * q];
    if (d[2] > 0.01) {
      const k = 2600 / d[2], u = (d[0] * k) / 5200, v = (d[1] * k) / 2600, n = fbm2(u + (fbm2(u * 0.7, v * 0.7, 3, 434) - 0.5) * 1.2, v, 5, 433);
      const a = suave(0.5, 0.64, n) * suave(0.01, 0.06, d[2]), lz = 0.12 + Math.pow(g, 8) * 1.2;
      c = mezclar(c, [b[0] * 0.6 + 0.85 * lz, b[1] * 0.6 + 0.78 * lz, b[2] * 0.62 + 0.7 * lz], a * 0.8);
    }
    return c;
  };
  return {
    sol: { dir: L, c: sol, k: 2.6, ancho: 0.014 }, cielo, aire,
    ambCielo: escalar(hexLin('#5a6c94'), 0.3), ambSuelo: escalar(hexLin('#3a3a42'), 0.28),
    niebla: { densidad: 1 / 17000, baja: 1 / 7000, z0: 0, H: 90, ruido: 0.7, escalaRuido: 0.0012 },
    borde: { c: hexLin('#f8e2c8'), k: 2.2 }, nieve: { albedo: [0.72, 0.75, 0.82], desde: 0.55 }, oclusion: 0.85,
  };
}
/** La horca vacía, en el lomo del camino, a contraluz; la cámara del alba de la intro un poco más baja y abierta. */
const HORCA_C3 = { x: -150, y: -330, giro: 70, k: 1.5 };
const CAM_C3 = { pos: [40, -800, 70] as V3 };
function armarC3(w: number, h: number): Cielo {
  const v = armarValle('i01', { w, h }), esc = v.esc, ter = esc.terreno!;
  const H = HORCA_C3, z = ter.h(H.x, H.y) - 2;
  const g = esc.poner(piezasDe('pue_horca', 'vacia', 3), { x: H.x, y: H.y, z, giro: H.giro, k: H.k }, { nieve: 0.7 });
  esc.frente.add(g);
  // la abadía en silencio: sin velas en los vitrales; el pueblo con poco humo
  esc.emision.abo_vitral = { k: 0.15, color: hexLin('#ff9a4a') };
  esc.emision.casas_ventana_luz = { k: 0.6 };
  esc.luces = esc.luces.filter((l) => l.k < 1);
  const cam = camaraEncuadre([CAM_C3.pos[0], CAM_C3.pos[1], ter.h(CAM_C3.pos[0], CAM_C3.pos[1]) + CAM_C3.pos[2]], [H.x, H.y, z + 60], 30, 0.3, 0.5, w, h);
  return { esc, atm: atmAlbaPalida(), cam, fuegos: [], plumas: v.plumas.slice(0, 4) };
}

// ================================================================== REY DE CENIZA: el héroe en el trono
/** El héroe sentado en el trono (local: mira a +x; el asiento en z = 0): las manos en los brazos, la Corona puesta. */
function heroeSentado(o: { brasa?: boolean; fria?: boolean }): Pieza[] {
  const P: Arti = {
    pel: [-4, 0, 6], pecho: [-4.5, 0, 20], cab: [-3.6, 0, 29.4], hom: [[-5, -8.2, 23.5], [-5, 8.2, 23.5]],
    codo: [[-2, -11, 12.5], [-1.5, 11.5, 12.5]], mano: [[9.5, -12, 13.5], [9, 12.5, 13]], rod: [[12, -5, 7.5], [12.5, 5, 7.5]], pie: [[16, -6, -20.5], [15, 6.5, -20.5]],
  };
  const ps = persona(P, {
    ropa: 'a7_placa', piel: 'a7_piel', placas: 'a7_placa', brasa: o.brasa, corona: 4.4, coronaApagada: o.fria,
    manto: { mat: 'a7_tela_negra', n: 11, grueso: 1, bajo: (t) => { const a = (t - 0.5) * Math.PI * 1.2; return [-14 + Math.cos(a) * 3, Math.sin(a) * 14, -26]; }, medio: (t) => { const a = (t - 0.5) * Math.PI * 1.1; return [-12 - Math.cos(a) * 2, Math.sin(a) * 13, -4]; } },
  });
  // la Marca apagada: donde ardía la Brasa queda una costra gris de ceniza
  if (o.fria) ps.push(elipsoide(P.pecho[0] + 5.4, P.pecho[1], P.pecho[2] - 1, 1.5, 2.8, 3.4, { mat: 'cel_ceniza', tono: -0.1 }));
  return ps;
}
const CAM_R1 = { pos: [-60, 372, 366] as V3, fov: 40, sx: 0.56, sy: 0.44 };
/** El trono con su rey: el héroe sentado, su Corona, su Brasa (o su Marca apagada) y la sangre que baja (o la escarcha). */
function armarTrono(w: number, h: number, fria: boolean): Cielo {
  const { esc, atm, fuegos, plumas } = armarCielo(fria ? 'fria' : 'ceniza', { nieve: fria, luna: fria ? dirAz(100, 24) : dirAz(84, 30) });
  const T = TRONO, zs = T.z + T.asiento;
  esc.poner(heroeSentado({ brasa: !fria, fria }), { x: T.x, y: T.y + 4, z: zs, giro: -90, k: 1.15 }, { nieve: fria ? 0.6 : 0 });
  const pecho: V3 = [T.x, T.y + 4 - (-4.5 + 5.6) * 1.15, zs + 19 * 1.15], cabeza: V3 = [T.x, T.y + 4 + 3.6 * 1.15, zs + 32.5 * 1.15];
  if (!fria) {
    // la Brasa: su luz roja en el pecho (canal 1, late con el fuego) y la Corona que arde
    esc.emision.a7_brasa = { k: 5, canal: 1 };
    esc.luces.push({ p: add(pecho, [0, -10, 0]), c: hexLin('#ff3a10'), k: 3.2, r: 22, canal: 1, sombra: true, envuelve: 0.3, halo: 0.001 });
    esc.emision.a7_corona_ascua = { k: 4, canal: 1 };
    for (const [dx, dz, an, al, s] of [[-3, 2, 2.6, 7, 711], [2.5, 3, 2.4, 6, 712], [0, 4, 3, 9, 713]] as [number, number, number, number, number][]) fuegos.push({ p: add(cabeza, [dx, 0, dz]), ancho: an, alto: al, semilla: s, tipo: 'corona', k: 2.4 });
    fuegos.push({ p: add(pecho, [0, -7, -3]), ancho: 5, alto: 10, semilla: 714, tipo: 'pecho', k: 2 });
    // la sangre: baja del asiento por las gradas y corre por la escalinata
    charcos(esc, [T.x - 6, T.y - T.fondo / 2 - 6, PLAT.z + 20], 26, 8, 71, { mat: 'a7_sangre' });
    charcos(esc, [T.x - 10, T.y - 60, PLAT.z + 10], 40, 10, 72, { mat: 'a7_sangre', hacia: [-8, PLAT.y0 + 2, PLAT.z + 10] });
    charcos(esc, [T.x, PLAT.y0 + 30, PLAT.z], 46, 9, 73, { mat: 'a7_sangre', hacia: [-4, PLAT.y0 + 2, PLAT.z] });
    icor(esc, 8, 27, 70, 74, -6, 'a7_sangre');
  } else {
    esc.emision.a7_corona_ascua = { k: 0 };
    esc.luces.push({ p: add(cabeza, [0, -30, 30]), c: hexLin('#9ab0d8'), k: 0.5, r: 60, envuelve: 0.2 });
  }
  const C = CAM_R1, cam = camaraEncuadre(fria ? [26, 330, 352] : C.pos, [T.x, T.y, zs + 34], fria ? 36 : C.fov, fria ? 0.5 : C.sx, fria ? 0.5 : C.sy, w, h);
  return { esc, atm, cam, fuegos, plumas };
}

// ---------------------------------------------------------------- r2: los fuegos de Velmora se inclinan al norte
/** La noche de la sed: el valle sin luna, el norte rojo (de donde viene el rey), los fuegos tumbados hacia allá. */
function atmNocheRoja(): Atmosfera {
  const rojo = hexLin('#ff3a14'), N = norm([0.05, 1, 0.12]);
  const pars: [number, C3][] = [[0, hexLin('#24202a')], [0.05, hexLin('#1c2030')], [0.15, hexLin('#141a2a')], [0.4, hexLin('#0a0e1a')], [0.9, hexLin('#04060c')]];
  const resplandor = (d: V3) => { const g = Math.max(0, dot3(d, N)); return 0.3 * Math.pow(g, 60) + 0.06 * Math.pow(g, 6); };
  const aire = (d: V3): C3 => { const e = Math.min(0.03, Math.max(0, d[2])), b = gradiente(pars, e), k = resplandor(norm([d[0], d[1], e])) * 0.5; return [b[0] + rojo[0] * k, b[1] + rojo[1] * k, b[2] + rojo[2] * k]; };
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2])));
    if (e < 0.03) return aire(d);
    const b = gradiente(pars, e), rf = resplandor(d), ka = 0.5 + 0.5 * suave(0, 0.12, e);
    let c: C3 = [b[0] + rojo[0] * rf * ka, b[1] + rojo[1] * rf * ka, b[2] + rojo[2] * rf * ka];
    if (d[2] > 0.01) { const k = 2200 / d[2], n = fbm2((d[0] * k) / 2200 + 3, (d[1] * k) / 1200, 5, 441), a = suave(0.45, 0.6, n) * suave(0.01, 0.08, d[2]); c = mezclar(c, [0.02 + rojo[0] * rf * 2, 0.02 + rojo[1] * rf * 2, 0.026 + rojo[2] * rf * 2], a * 0.85); }
    return c;
  };
  return {
    sol: { dir: N, c: hexLin('#ff5a2a'), k: 0.18, ancho: 0.05 }, cielo, aire,
    ambCielo: escalar(hexLin('#2c3a5e'), 0.22), ambSuelo: escalar(hexLin('#141820'), 0.16),
    niebla: { densidad: 1 / 15000, baja: 1 / 5000, z0: 0, H: 100, ruido: 0.7, escalaRuido: 0.0012 },
    borde: { c: hexLin('#ff6a30'), k: 2.2 }, nieve: { albedo: [0.32, 0.31, 0.32], desde: 0.62 }, oclusion: 0.85,
  };
}
/** Los aldeanos de rodillas en el barro, de cara al norte: masas con su manta, la cabeza gacha. */
function aldeanoRodillas(s: number, mujer: boolean): Pieza[] {
  const r = (i: number) => (az(s, i) - 0.5);
  const P: Arti = {
    pel: [-2, 0, 19 + r(1) * 2], pecho: [3 + r(2) * 3, 0, 31], cab: [7 + r(3) * 2, 0, 37.5], hom: [[2, -7.2, 34], [2, 7.2, 34]],
    codo: [[6, -9, 24], [6, 9, 24]], mano: [[10, -3, 27 + r(4) * 6], [10, 3, 27 + r(5) * 6]], rod: [[8, -4.5, 2], [8, 4.5, 2]], pie: [[-12, -4, 1.4], [-12, 4, 1.4]],
  };
  // unos rezan con las manos juntas, otros alzan los brazos hacia el norte, otros se doblan hasta el barro
  const gesto = az(s, 9);
  if (gesto < 0.3) { P.codo = [[4, -11, 44], [4, 11, 44]]; P.mano = [[10, -8, 55], [10, 8, 55]]; P.cab = [5, 0, 38.5]; }
  else if (gesto > 0.75) { P.pecho = [10, 0, 24]; P.cab = [16, 0, 21]; P.hom = [[9, -7.2, 27], [9, 7.2, 27]]; P.codo = [[16, -9, 14], [16, 9, 14]]; P.mano = [[22, -6, 2], [22, 6, 2]]; }
  return persona(P, { ropa: mujer ? 'cu_tela_roja' : 'cu_tela_parda', piel: 'a7_piel', manto: { mat: 'cu_pelaje', n: 9, grueso: 0.8, bajo: (t) => [P.pel[0] - 10 - Math.sin(Math.PI * t) * 5, (t - 0.5) * 20, 1.5], medio: (t) => [P.pel[0] - 5 - Math.sin(Math.PI * t) * 3, (t - 0.5) * 17, 14] }, ...(mujer ? { pelo: { mat: 'a7_pelo', puntas: [[P.cab[0] - 6, 0, P.cab[2] - 10], [P.cab[0] - 5, 3, P.cab[2] - 9]] } } : {}) });
}
const VIENTO_R2 = 0.55;
function armarR2(w: number, h: number): Cielo {
  const v = armarValle('i01', { w, h }), esc = v.esc, ter = esc.terreno!, fuegos: Fuego[] = [];
  // de noche: sin ventanas, sin faroles encendidos, sin humo de chimeneas
  esc.emision.casas_ventana_luz = { k: 0.05 }; esc.emision.abo_vitral = { k: 0.1, color: hexLin('#ff5a2a') }; esc.emision.luz_vela = { k: 0.2 };
  esc.luces = [];
  esc.frente.clear();
  // la plaza del pueblo: hogueras y antorchas tumbadas hacia el norte y la gente de rodillas en el barro alrededor
  const O: V3 = [-280, 1560, 0], cam: V3 = [-760, 1380, 0];
  const fogones: [number, number, TipoFuegoC, number][] = [[-280, 1600, 'hoguera', 1.2], [-520, 1720, 'hoguera', 0.8], [-80, 1760, 'hoguera', 0.9], [-420, 1480, 'antorcha', 1], [-160, 1470, 'antorcha', 1]];
  fogones.forEach(([x, y, tipo, k], i) => {
    const z = ter.h(x, y);
    if (tipo === 'hoguera') {
      esc.poner(piezasDe('nie2_hoguera', objeto('nie2_hoguera').variantes[0], 501 + i), { x, y, z, giro: i * 40, k: 1.3 * k }, { nieve: 0 });
      fuegos.push({ p: [x, y, z + 4], ancho: 34 * k, alto: 130 * k, semilla: 820 + i, tipo: 'hoguera', k: 2.4 });
      esc.luces.push({ p: [x, y + 20 * k, z + 34 * k], c: hexLin('#ff8a3a'), k: 12 * k, r: 50 * k, canal: 1, sombra: true, envuelve: 0.4, halo: 0.0004 });
    } else {
      esc.ponerMundo([palo([x, y, z - 2], [x, y, z + 70], 1.4, { mat: 'abo_madera_quemada', r1: 1.8 }), caja(x, y, z + 68, 5, 5, 6, { mat: 'hierro' })], { nieve: 0 });
      fuegos.push({ p: [x, y, z + 73], ancho: 12, alto: 30, semilla: 830 + i, tipo: 'antorcha', k: 2.2 });
      esc.luces.push({ p: [x, y + 8, z + 80], c: hexLin('#ff8a3a'), k: 3.2, r: 30, canal: 1, sombra: true, envuelve: 0.5, halo: 0.0015 });
    }
  });
  // el barro: manchas oscuras y húmedas donde está la gente
  const barro: Pieza[] = [];
  for (let i = 0; i < 30; i++) { const x = O[0] - 360 + az(i, 851) * 620, y = O[1] - 200 + az(i, 852) * 380; barro.push(elipsoide(x, y, ter.h(x, y) + 0.3, 30 + az(i, 853) * 60, 20 + az(i, 854) * 40, 1.2, { mat: 'abo_barro', giro: az(i, 855) * 180 })); }
  esc.ponerMundo(barro, { nieve: 0 });
  let n = 0;
  for (let i = 0; i < 60 && n < 22; i++) {
    const x = O[0] - 380 + az(i, 861) * 560, y = O[1] - 200 + az(i, 862) * 330;
    if (fogones.some(([fx, fy]) => Math.hypot(fx - x, fy - y) < 60)) continue;
    const g = esc.poner(aldeanoRodillas(870 + i, az(i, 863) < 0.4), { x, y, z: ter.h(x, y) - 1, giro: 90 + (az(i, 864) - 0.5) * 24, k: 0.92 + az(i, 865) * 0.14 }, { nieve: 0 });
    if (Math.hypot(x - cam[0], y - cam[1]) < 380) esc.frente.add(g);
    n++;
  }
  const camara = camaraEncuadre([cam[0], cam[1], ter.h(cam[0], cam[1]) + 34], [O[0], O[1] + 60, ter.h(O[0], O[1]) + 40], 42, 0.52, 0.56, w, h);
  return { esc, atm: atmNocheRoja(), cam: camara, fuegos, plumas: [] };
}

// ================================================================== CORONA FRÍA: el héroe solo en el borde
/** El héroe de pie en el borde de la isla nevada, de espaldas, mirando el cielo frío; el manto al viento. */
function heroeDePie(): Pieza[] {
  const P: Arti = {
    pel: [0, 0, 33], pecho: [0.5, 0, 46.5], cab: [1.2, 0, 56], hom: [[0, -8.4, 50], [0, 8.4, 50]],
    codo: [[-0.5, -10.5, 37], [-0.5, 10.5, 37]], mano: [[1.5, -10, 25], [1.5, 10, 25]], rod: [[1, -4.2, 18], [1, 4.2, 18]], pie: [[0, -4.6, 1.4], [0, 4.6, 1.4]],
  };
  return persona(P, {
    ropa: 'a7_placa', placas: 'a7_placa', corona: 4.4, coronaApagada: true,
    manto: { mat: 'a7_tela_negra', n: 12, grueso: 1.1, bajo: (t) => [-12 - Math.sin(Math.PI * t) * 8 + t * 4, (t - 0.5) * 30 + 14, 3 + t * 8], medio: (t) => [-6 - Math.sin(Math.PI * t) * 4, (t - 0.5) * 22 + 6, 26] },
  });
}
const CAM_F2 = { pos: [-560, -170, 104] as V3, fov: 40, sx: 0.6, sy: 0.53 };
function armarF2(w: number, h: number): Cielo {
  const { esc, atm, fuegos, plumas } = armarCielo('fria', { nieve: true, luna: dirAz(150, 18) });
  // el borde oeste de la isla: el héroe a un paso del vacío, mirando las islas frías
  const p: V3 = [-850, 60, 0];
  esc.poner(heroeDePie(), { x: p[0], y: p[1], z: 0, giro: 128, k: 1.1 }, { nieve: 0.5 });
  const cam = camaraEncuadre(CAM_F2.pos, [p[0], p[1], 52], CAM_F2.fov, CAM_F2.sx, CAM_F2.sy, w, h);
  return { esc, atm, cam, fuegos, plumas };
}

// ================================================================== los planos
const REV_NOCHE: Plano3D['revelado'] = { t: 0, exposicion: 1.35, derrame: { k: 0.45, r: 4 }, bloom: { k: 0.4, umbral: 0.8 }, grado: gradoNoche };
/** Los fuegos de Doom de una escena del cielo: carteles por cuadro y el latido de su luz (canal 1). */
const conFuego = (viento?: number): Pick<Plano3D, 'flickBase' | 'cuadros' | 'fps' | 'zonas' | 'extras'> => ({
  flickBase: 0.84, cuadros: NF, fps: FPS, zonas: (a) => zonasFuegos(a as Cielo),
  extras: (a, _c, t): Extras => ({ flick: latido(t), carteles: cartelesFuego((a as Cielo).fuegos, t, viento) }),
});

const P1: Plano3D = {
  id: 'p1_cae', paralaje: 0.88, particulas: 'ceniza', armar: enCache(armarP1), revelado: REV_NOCHE,
  // la boca del pecho (canal 1) apagada en el fondo; la capa de luz la tiene encendida y se apaga cuando se parte
  flickBase: 0,
  variantes: [{ id: 'boca', flick: 1, escala: 2, anim: { tipo: 'tiempo', claves: [[0, 1], [1.6, 1], [2.2, 0.55], [2.45, 0.8], [3.1, 0.3], [3.4, 0.45], [4.6, 0]] } }],
  qa: [0.5, 2.4, 3.3, 6.5],
};
const P2: Plano3D = { id: 'p2_corona', paralaje: 0.9, particulas: 'ceniza', armar: enCache(armarP2), revelado: { ...REV_NOCHE, exposicion: 1.3 }, ...conFuego() };

const V1: Plano3D = { id: 'v1_auren', paralaje: 0.9, particulas: 'ceniza', armar: enCache(armarV1), revelado: { ...REV_NOCHE, exposicion: 1.2 }, flickBase: 1, ss: 4 };
const REV_CRIPTA: Plano3D['revelado'] = { t: 0, exposicion: 1.6, derrame: { k: 0.3, r: 3 }, bloom: { k: 0.45, umbral: 0.7 }, grado: gradoNoche };
/** Lo que late detrás del hierro: despacio, como un corazón dormido (un golpe doble cada 2,6 s). */
const LATIDO: [number, number][] = [[0, 0.15], [0.5, 1], [0.75, 0.35], [0.95, 0.7], [1.6, 0.15], [3.1, 0.15], [3.6, 1], [3.85, 0.35], [4.05, 0.7], [4.7, 0.15], [6.2, 0.15], [6.7, 1], [6.95, 0.35], [7, 0.4]];
const V2: Plano3D = {
  id: 'v2_boveda', paralaje: 0.9, particulas: 'polvo', armar: enCache((w, h) => armarCripta(w, h, { cam: 'v2' })), revelado: REV_CRIPTA, ss: 4, ao: 3,
  flickBase: 1, cuadros: NF, fps: FPS, zonas: (a) => zonasFuegos(a as Cielo), extras: (a, _c, t) => ({ flick: 1, carteles: cartelesFuego((a as Cielo).fuegos, t) }),
};
const V3_: Plano3D = {
  id: 'v3_vela', paralaje: 0.92, particulas: 'polvo', armar: enCache((w, h) => armarCripta(w, h, { cam: 'v3' })), revelado: { ...REV_CRIPTA, exposicion: 1.25 }, ss: 4, ao: 3,
  flickBase: 1, cuadros: NF, fps: FPS, zonas: (a) => zonasFuegos(a as Cielo, 10), extras: (a, _c, t) => ({ flick: 1, carteles: cartelesFuego((a as Cielo).fuegos, t) }),
  variantes: [{ id: 'latido', armar: (w, h) => armarCripta(w, h, { cam: 'v3', latido: true }), escala: 1, anim: { tipo: 'tiempo', claves: LATIDO } }],
  qa: [0.5, 1.6, 3.6, 6.7],
};
const C1: Plano3D = {
  id: 'c1_mira', paralaje: 0.9, particulas: 'polvo', armar: enCache(armarC1), revelado: REV_NOCHE, ss: 4,
  // la luz blanca: un hilo en el fondo; la capa de luz la abre hasta el blanco del corte
  flickBase: 0.03,
  variantes: [{ id: 'luz_blanca', flick: 1, escala: 2, anim: { tipo: 'tiempo', claves: [[0, 0], [2.4, 0.05], [3.6, 0.2], [4.6, 0.45], [5.6, 0.75], [6.4, 1]] } }],
  qa: [0.5, 3.6, 5.2, 6.6],
};
const C2: Plano3D = { id: 'c2_dioses', paralaje: 0.86, particulas: 'brasas', armar: enCache(armarC2), revelado: { ...REV_NOCHE, exposicion: 1.1, bloom: { k: 0.5, umbral: 0.8 } }, ...conFuego(), zonas: (a) => zonasFuegos(a as Cielo, 30, 3) };
const C3: Plano3D = { id: 'c3_alba', paralaje: 0.85, particulas: 'nieve', armar: enCache(armarC3), revelado: { t: 0, exposicion: 1.0, rayos: { k: 0.2, c: [1, 0.95, 0.88], umbral: 0.3 }, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.2, umbral: 0.9 }, grado: gradoFrio } };
const R1: Plano3D = { id: 'r1_trono', paralaje: 0.9, particulas: 'ceniza', armar: enCache((w, h) => armarTrono(w, h, false)), revelado: { ...REV_NOCHE, exposicion: 1.4 }, ...conFuego(), ss: 4 };
const R2: Plano3D = { id: 'r2_mundo', paralaje: 0.85, particulas: 'ceniza', armar: enCache(armarR2), revelado: { ...REV_NOCHE, exposicion: 1.2 }, ...conFuego(VIENTO_R2), zonas: (a) => zonasFuegos(a as Cielo, 12, 2) };
const F1: Plano3D = { id: 'f1_trono', paralaje: 0.9, particulas: 'nieve', armar: enCache((w, h) => armarTrono(w, h, true)), revelado: { ...REV_NOCHE, exposicion: 1.25, grado: gradoFrio }, ss: 4 };
const F2: Plano3D = { id: 'f2_invierno', paralaje: 0.88, particulas: 'nieve', armar: enCache(armarF2), revelado: { ...REV_NOCHE, exposicion: 1.05, grado: gradoFrio } };

/** Las escenas 3D del acto 7 y sus finales, por clave (las suma cine3d_registro.ts). */
export const PLANOS_ACTOS_C: Record<string, Plano3D[]> = {
  acto_7: [P1, P2],
  acto_7_vigilia: [V1, V2, V3_],
  acto_7_cielo: [C1, C2, C3],
  acto_7_rey_ceniza: [R1, R2],
  acto_7_corona_fria: [F1, F2],
};
