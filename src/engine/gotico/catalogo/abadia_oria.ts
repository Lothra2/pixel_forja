import { registrar, conVarianteY, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, hash3, type Comp } from '../render';
import {
  G, raiz, bajoTierra, bloque, ojiva, altoOjiva, tierra, monticulo, matas, musgo, hiedra, cascotes, cuervo, punta, voluta, letras,
  figuraVelada, rr, elegir, GR, type P2,
} from '../kit_muerte';

/**
 * La catedral de Santa Oria (Réquiem de Ceniza, acto 1): junto al camposanto, y por su puerta se baja a la Nave del
 * Silencio. Diseño propio: fachada oeste con dos torres de agujas caladas, rosetón y pórtico triple con santos rotos;
 * nave alta con arbotantes, pináculos y gárgolas; crucero con una aguja fina partida (la punta cayó sobre el tejado);
 * cabecera con girola y cinco capillas radiales. Piedra gris azulada y fría, y una luz roja que late detrás de todos
 * los vitrales. Variantes: `entera`, `herida` (tejado de la nave hundido con las vigas al aire y chispas, la luz más
 * fuerte) y `sellada` (antes de la misión: la puerta tapiada y los vitrales apagados).
 *
 * Es demasiado grande para un solo sprite (la prueba del catálogo pide menos de 900 px de lado), así que va en tres
 * piezas que encajan a lo largo de y, todas con la misma variante y el mismo cuadro:
 *
 *   abo_catedral_cabecera  huella 13×8   ancla en (cx, cy - 9)   crucero, transepto, aguja partida, girola y capillas
 *   abo_catedral_nave      huella 13×9   ancla en (cx, cy)       cinco tramos con arbotantes (y la punta caída de la aguja)
 *   abo_catedral_fachada   huella 13×5   ancla en (cx, cy + 7)   las dos torres, el rosetón y el pórtico triple
 *
 * (cx, cy) es la celda del centro de la nave: la huella total es 13×22 celdas, de (cx - 6, cy - 12) a (cx + 6, cy + 9).
 * La puerta central queda en la celda (cx, cy + 8) y la escalinata baja a (cx, cy + 9). El orden de dibujo por cx + cy
 * ya las pinta bien (cabecera, nave, fachada). `CATEDRAL` trae lo mismo en datos.
 *
 * Además: árbol muerto con ramas en garra, grupos de lápidas, niebla baja que se arrastra, muro del camposanto con
 * verja (y su variante a lo largo de y) y el farol de hierro de luz roja.
 */

const T = 'cementerio' as const;
const M = MATERIALES;
const TAU = Math.PI * 2;
const h1 = (a: number, b = 0, c = 0) => hash3(Math.floor(a) * 7 + 3, Math.floor(b) * 13 + 5, Math.floor(c) * 17 + 11);

// ================================================================== materiales
/**
 * Sillería irregular gastada: hiladas de alto desparejo (cada borde corrido al azar), sillares de largo distinto en
 * cada hilada y alguno partido, bisel de luz arriba y sombra abajo, piedras picadas, mugre que sube del piso y
 * chorreados que bajan.
 */
function sillarIrregular(la: number, al: number) {
  return (p: V3, n: V3) => {
    const desg = -Math.max(0, 1 - p[2] / 20) * 0.22 + (ruido(p[0] * 0.6 + p[1] * 0.2, p[1] * 0.6, p[2] * 0.03) - 0.5) * 0.22;
    if (Math.abs(n[2]) > 0.7) return desg * 0.5 + (ruido(p[0] * 0.4, p[1] * 0.4, 3) - 0.5) * 0.16;
    const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
    const k0 = Math.floor(p[2] / al), borde = (i: number) => i * al + (h1(i, 1) - 0.5) * al * 0.45;
    let fila = k0;
    if (p[2] < borde(k0)) fila = k0 - 1; else if (p[2] >= borde(k0 + 1)) fila = k0 + 1;
    const z0 = borde(fila), alto = borde(fila + 1) - z0, t = (p[2] - z0) / alto;
    const L = la * (0.7 + h1(fila, 2) * 0.6), uu = u + h1(fila, 3) * L * 3, b = Math.floor(uu / L), r = uu - b * L;
    const partido = h1(b, fila, 4) < 0.3 && Math.abs(r - L * 0.45) < 0.4;
    if (p[2] - z0 < 0.75 || r < 0.75 || partido) return -0.36 + desg * 0.4;
    const tb = h1(b, fila, 5);
    let s = (tb - 0.5) * 0.3 + desg + (t > 0.8 ? 0.05 : t < 0.2 ? -0.06 : 0);
    if (r < 1.5 || L - r < 0.8) s -= 0.05;
    if (tb > 0.85) s += (ruido(p[0] * 1.3, p[1] * 1.3, p[2] * 1.3) - 0.5) * 0.4;
    return s;
  };
}
/** Pizarra en hiladas: la sombra bajo cada hilada, juntas corridas, tejas de tono desparejo y alguna que falta. */
function pizarras(paso = 2.8, ancho = 4.4) {
  return (p: V3, n: V3) => {
    const fila = Math.floor(p[2] / paso), t = p[2] / paso - fila;
    const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
    const uu = u + (((fila % 2) + 2) % 2) * ancho * 0.5 + h1(fila, 7) * 0.9, b = Math.floor(uu / ancho), r = uu - b * ancho;
    const h = h1(b, fila, 8);
    let s = (h - 0.5) * 0.24 + (ruido(p[0] * 0.07, p[1] * 0.07, p[2] * 0.07) - 0.5) * 0.2;
    if (t > 0.8) s -= 0.3; else if (t < 0.18) s += 0.06;
    if (r < 0.55) s -= 0.16;
    if (h < 0.05) s -= 0.3;
    return s;
  };
}
M.abo_sillar = { rampa: ['#0d1014', '#161a21', '#20252e', '#2b313c', '#373e4b', '#444c5b', '#535c6c', '#646d7e', '#778194'], ruido: 0.22, escala: 0.2, patron: sillarIrregular(10, 5) };
M.abo_sillar_grueso = { rampa: ['#0d1014', '#161a21', '#20252e', '#2b313c', '#373e4b', '#444c5b', '#535c6c', '#646d7e', '#778194'], ruido: 0.24, escala: 0.18, patron: sillarIrregular(13, 6.5) };
M.abo_labra = { rampa: ['#0c0e12', '#151820', '#1f232c', '#2a2f3a', '#363c48', '#434a58', '#525a6a', '#636b7c'], ruido: 0.26, escala: 0.25, patron: (p) => -Math.max(0, 1 - p[2] / 16) * 0.18 + (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.15) > 0.7 ? -0.12 : 0) };
M.abo_estatua = { rampa: ['#0d0f12', '#171a1f', '#22262d', '#2e333b', '#3b414b', '#4a515c', '#5b636e', '#6e7682'], ruido: 0.28, escala: 0.3, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.9) > 0.68 ? -0.14 : 0) };
M.abo_pizarra = { rampa: ['#07080b', '#0d0f14', '#13161d', '#1a1e27', '#222733', '#2b313e', '#353c4b'], ruido: 0.18, escala: 0.25, patron: pizarras() };
M.abo_plomo = { rampa: ['#0b0d10', '#13161b', '#1c2027', '#262b34', '#313742', '#3d4451', '#4b5361'], ruido: 0.2, escala: 0.2, brillo: 0.25, patron: (p, n) => { const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]; return (((u % 5) + 5) % 5 < 0.6 ? -0.25 : 0) + (ruido(p[0] * 0.2, p[1] * 0.2, p[2] * 0.05) - 0.5) * 0.25; } };
M.abo_madera_quemada = { rampa: ['#090706', '#110c0a', '#1a130f', '#241a14', '#30231a', '#3d2d21'], ruido: 0.4, escala: 0.5, patron: (p) => (ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8) > 0.66 ? -0.2 : 0) };
M.abo_madera = { rampa: ['#0e0b09', '#18130f', '#231c16', '#2f261d', '#3b3025', '#493b2e'], ruido: 0.3, escala: 0.35, patron: (p, n) => { const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]; return ((((u % 4) + 4) % 4) < 0.5 ? -0.25 : 0) + (ruido(u * 0.8, p[2] * 0.06, 2) - 0.5) * 0.3; } };
M.abo_corteza = { rampa: ['#09090a', '#111113', '#1a1a1d', '#242427', '#2f2f33', '#3b3b40', '#48474d', '#56555b'], ruido: 0.45, escala: 0.35, patron: (p) => (ruido(p[0] * 0.75, p[1] * 0.75, p[2] * 0.05) - 0.5) * 0.55 - (ruido(p[0] * 2.2, p[1] * 2.2, p[2] * 0.3) > 0.72 ? 0.18 : 0) };
M.abo_hiedra = { rampa: ['#060a08', '#0b120d', '#111b13', '#17251a', '#1e3022', '#263c2a'], ruido: 0.6, escala: 0.6 };
M.abo_musgo = { rampa: ['#0a0e0b', '#111812', '#18221a', '#202d22', '#29392b'], ruido: 0.7, escala: 0.6 };
M.abo_vidrio_muerto = { rampa: ['#050608', '#0a0c11', '#10131b', '#171b26', '#1f2432', '#2a2f3d'], ruido: 0.4, escala: 0.4, brillo: 0.7 };
/** La luz roja de adentro: de brasa honda a naranja (el tono que la hace latir se pone por cuadro). */
M.abo_vitral = { rampa: ['#1e0302', '#3a0604', '#5e0c06', '#861608', '#ac250c', '#cc3a12', '#e6581c', '#f8822e', '#ffb05a'], ruido: 0.45, escala: 0.35, emite: true };
M.abo_brasa = { rampa: ['#200302', '#3e0704', '#621006', '#8c1c08', '#b8320e', '#e05518', '#ff8a34'], ruido: 0.7, escala: 0.6, emite: true };
M.abo_chispa = { rampa: ['#a83010', '#e05a18', '#ff8a2a', '#ffb850', '#ffe08a'], ruido: 0.2, escala: 0.5, emite: true };
M.abo_llama = { rampa: ['#3a0404', '#6a0806', '#9a120a', '#c82414', '#e84a22', '#ff7a40', '#ffb07a'], ruido: 0.5, escala: 0.3, emite: true };
/** Niebla: el renderer no tiene transparencias, así que es una masa muy oscura, chata y sin sombrear (no se lee como sólido). */
M.abo_niebla = { rampa: ['#050608', '#08090c', '#0b0d11', '#0f1116', '#13161c', '#181c23', '#1e222b'], ruido: 0.55, escala: 0.07, emite: true };
M.abo_lapida = { rampa: ['#0c0e10', '#15181b', '#1f2327', '#2a2f34', '#363c42', '#444a51', '#535a61', '#646b72'], ruido: 0.3, escala: 0.25, patron: (p) => -Math.max(0, 1 - p[2] / 10) * 0.2 + (ruido(p[0] * 0.25, p[1] * 0.25, p[2] * 0.6) - 0.5) * 0.24 + (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) > 0.74 ? -0.12 : 0) };
M.abo_liquen = { rampa: ['#15170f', '#232619', '#323623', '#42462e', '#52573a'], ruido: 0.7, escala: 0.8 };

// ================================================================== utilidades
type Luz = { mat: string; tono: number };
const K = 0.85;
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const crz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Viga de sección rectangular entre dos puntos (w de ancho, h de alto). */
function viga(g: G, p: V3, q: V3, w: number, h: number, o: { mat: string; tono?: number }) {
  const u = nrm(sub3(q, p));
  let s = crz(u, [0, 0, 1]); if (Math.hypot(...s) < 0.1) s = [1, 0, 0]; s = nrm(s);
  const up = crz(s, u), pts: V3[] = [];
  for (const e of [p, q]) for (const a of [-1, 1]) for (const b of [-1, 1]) pts.push([e[0] + s[0] * a * w / 2 + up[0] * b * h / 2, e[1] + s[1] * a * w / 2 + up[1] * b * h / 2, e[2] + s[2] * a * w / 2 + up[2] * b * h / 2]);
  return g.poli(pts, o);
}
/** Grupo de una cara: origen en la cara exterior a ras del piso, x a lo largo, +y hacia afuera. */
const cara = (g: G, x: number, y: number, giro: number) => g.sub(x, y, 0, giro);
/** Arco de puntos (x, z) de una ojiva, de un arranque al otro pasando por la clave. */
const arcoOjiva = (w: number, hr: number, z0: number, n = 5) => ojiva(w, hr, K, n, z0).slice(2);

/**
 * Ventanal ojival en una cara: derrame, hueco pasante, el vitral (que late con `luz`), parteluces y tracería con
 * óculos, barras de hierro, alféizar en talud y guardapolvo. `luces` es la cantidad de luces (1 a 3).
 */
function ventanal(c: G, x: number, w: number, z0: number, hr: number, Tm: number, luz: Luz, m: string, luces = 2, tapiada = false) {
  const s = c.sub(x, 0, 0), yv = -Tm * 0.55, alto = altoOjiva(w, hr, K);
  s.prisma(ojiva(w + 3.4, hr, K, 5, z0 - 1.4), -1.6, 1.5, { mat: m, resta: true });
  s.prisma(ojiva(w, hr, K, 5, z0), -Tm - 1.5, 1.5, { mat: m, resta: true });
  if (tapiada) { s.prisma(ojiva(w, hr, K, 5, z0), -Tm, -1.2, { mat: 'mu_bloques_frio', tono: -0.05 }); return; }
  s.prisma(ojiva(w, hr, K, 5, z0), yv - 0.6, yv + 0.6, luz);
  const yt = yv + 1.1;
  // parteluces y los arcos de cada luz
  const lw = w / luces;
  for (let i = 1; i < luces; i++) s.caja(-w / 2 + i * lw, yt, z0, 1.5, 1.3, hr + 1, { mat: m, tono: 0.07 });
  if (luces > 1) for (let i = 0; i < luces; i++) {
    const xa = -w / 2 + i * lw, xb = xa + lw, xm = (xa + xb) / 2, zc = z0 + hr + lw * 0.75;
    s.palo([xa + 0.3, yt, z0 + hr], [xm, yt, zc], 0.6, { mat: m, tono: 0.07 }); s.palo([xm, yt, zc], [xb - 0.3, yt, z0 + hr], 0.6, { mat: m, tono: 0.07 });
  }
  // óculo de la tracería
  if (luces > 1 && w >= 9) {
    const zo = z0 + hr + lw * 0.75 + (alto - hr - lw * 0.75) * 0.5, ro = Math.min(w * 0.2, (alto - hr - lw * 0.75) * 0.42);
    for (let i = 0; i < 6; i++) { const t0 = (i / 6) * TAU, t1 = ((i + 1) / 6) * TAU; s.palo([Math.cos(t0) * ro, yt, zo + Math.sin(t0) * ro], [Math.cos(t1) * ro, yt, zo + Math.sin(t1) * ro], 0.55, { mat: m, tono: 0.07 }); }
  }
  for (const k of [0.33, 0.66]) s.caja(0, yt - 0.3, z0 + hr * k, w, 0.6, 0.6, { mat: 'mu_hierro' });
  // alféizar en talud y guardapolvo
  s.poli([[-w / 2 - 1.6, 0, z0 - 1], [w / 2 + 1.6, 0, z0 - 1], [-w / 2 - 1.6, 2.4, z0 - 2.8], [w / 2 + 1.6, 2.4, z0 - 2.8], [-w / 2 - 1.6, 0, z0 - 3.8], [w / 2 + 1.6, 0, z0 - 3.8], [-w / 2 - 1.6, 2.4, z0 - 3.8], [w / 2 + 1.6, 2.4, z0 - 3.8]], { mat: m, tono: 0.05 });
  const arc = arcoOjiva(w + 4.2, hr, z0 - 1.4, 4);
  for (let i = 0; i < arc.length - 1; i++) s.palo([arc[i][0], 0.7, arc[i][1]], [arc[i + 1][0], 0.7, arc[i + 1][1]], 0.85, { mat: m, tono: 0.08 });
  for (const sx of [-1, 1]) s.palo([sx * (w / 2 + 2.1), 0.7, z0 + hr - 1.4], [sx * (w / 2 + 2.1), 0.7, z0 + hr - 4.5], 0.85, { mat: m, tono: 0.08 });
}
/** Rosetón calado: círculo hueco, vitral, rayos, anillo de lóbulos, cubo y moldura. Centro (x, z) en la cara. */
function roseton(c: G, x: number, z: number, R: number, Tm: number, luz: Luz, m: string, rayos = 12, tapiado = false) {
  const s = c.sub(x, 0, 0), yv = -Tm * 0.5, yt = yv + 1.2;
  s.cil(0, 1.6, z, R + 2.6, 2, { mat: m, resta: true, eje: [0, -1, 0] });
  s.cil(0, 2, z, R, Tm + 4, { mat: m, resta: true, eje: [0, -1, 0] });
  if (tapiado) { s.cil(0, -1.5, z, R, Tm - 2, { mat: 'mu_bloques_frio', tono: -0.06, eje: [0, -1, 0] }); return; }
  s.cil(0, yv + 0.6, z, R, 1.2, { ...luz, eje: [0, -1, 0] });
  const pt = (r: number, t: number): V3 => [Math.cos(t) * r, yt, z + Math.sin(t) * r];
  s.cil(0, yt + 0.8, z, R * 0.16, 1.6, { mat: m, tono: 0.1, eje: [0, -1, 0] });
  for (let i = 0; i < rayos; i++) { const t = (i / rayos) * TAU; s.palo(pt(R * 0.15, t), pt(R * 0.98, t), 0.65, { mat: m, tono: 0.08 }); }
  // anillo interior y lóbulos (arcos apuntados entre rayos)
  for (let i = 0; i < rayos; i++) { const t0 = (i / rayos) * TAU, t1 = ((i + 1) / rayos) * TAU, tm = (t0 + t1) / 2; s.palo(pt(R * 0.42, t0), pt(R * 0.42, t1), 0.55, { mat: m, tono: 0.07 }); s.palo(pt(R * 0.62, t0), pt(R * 0.86, tm), 0.5, { mat: m, tono: 0.07 }); s.palo(pt(R * 0.86, tm), pt(R * 0.62, t1), 0.5, { mat: m, tono: 0.07 }); }
  for (let i = 0; i < 16; i++) { const t0 = (i / 16) * TAU, t1 = ((i + 1) / 16) * TAU; s.palo([Math.cos(t0) * (R + 1.6), 0.9, z + Math.sin(t0) * (R + 1.6)], [Math.cos(t1) * (R + 1.6), 0.9, z + Math.sin(t1) * (R + 1.6)], 1.1, { mat: m, tono: 0.08 }); }
}
/** Pináculo: fuste, gabletes en cruz, chapitel con frondas y el remate. */
function pinaculo(g: G, x: number, y: number, z: number, w: number, h: number, m: string) {
  const zf = z + h * 0.4;
  g.caja(x, y, z, w, w, h * 0.4, { mat: m });
  for (const gi of [0, 90]) g.sub(x, y, zf - 0.3, gi).prisma([[-w / 2 - 0.3, 0], [w / 2 + 0.3, 0], [0, w * 0.85]], -w / 2 - 0.5, w / 2 + 0.5, { mat: m, tono: 0.05 });
  const r = w * 0.42, zt = z + h;
  g.poli([[x - r, y - r, zf], [x + r, y - r, zf], [x - r, y + r, zf], [x + r, y + r, zf], [x, y, zt]], { mat: m, tono: 0.04 });
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.esf(x + sx * r * 0.5, y + sy * r * 0.5, zf + (zt - zf) * 0.45, Math.max(0.9, w * 0.13), { mat: m, tono: 0.09 });
  g.esf(x, y, zt + 0.6, Math.max(1, w * 0.16), { mat: m, tono: 0.1 });
}
/** Gárgola que asoma hacia +y del grupo: cuerpo de bestia agazapada, cabeza con las fauces abiertas y alas plegadas. */
function gargola(g: G, k = 1, m = 'abo_estatua') {
  const s = g.esc(k), a = g.a, cs: Comp[] = [];
  cs.push(s.hu([0, -2, 0.5], [0, 6.5, 1.6], 2.2, 1.8), s.bu([0, 9.2, 2.4], [2, 2.6, 1.9]), s.hu([0, 9.8, 0.8], [0, 12.4, 0.6], 1.2, 0.8));
  for (const sx of [-1, 1]) cs.push(s.hu([sx * 1.2, 8.6, 3.6], [sx * 1.9, 7.2, 6 + a.r()], 0.6, 0.3), s.hu([sx * 1.6, 5.5, 0.5], [sx * 2.2, 7.6, -1.6], 0.7, 0.5));
  s.masa(cs, { mat: m, suave: 0.9 });
  s.elip(0, 11.6, 1.6, 0.9, 1.1, 0.7, { mat: 'negro' });
  for (const sx of [-1, 1]) s.poli([[sx * 1.4, 0, 2.4], [sx * 1.6, 5, 3], [sx * 4.6, 1.2, 4.6], [sx * 3.4, -1, 1.8]], { mat: m, tono: -0.03 });
}
/** Estribo escalonado en una cara: tres cuerpos con taludes, gárgola y pináculo arriba. Devuelve el alto del remate. */
function estribo(c: G, x: number, w: number, d: number, H: number, m: string, o: { pin?: number; garg?: boolean } = {}) {
  const tiers: [number, number, number][] = [[1, 0, 0.46], [0.74, 0.46, 0.76], [0.52, 0.76, 1]];
  for (const [k, f0, f1] of tiers) {
    const dd = d * k, z0 = H * f0, z1 = H * f1;
    c.caja(x, dd / 2 - 1, z0, w, dd + 1, z1 - z0, { mat: 'abo_sillar_grueso' });
    c.poli([[x - w / 2 - 0.4, -1, z1], [x + w / 2 + 0.4, -1, z1], [x - w / 2 - 0.4, dd + 0.5, z1], [x + w / 2 + 0.4, dd + 0.5, z1], [x - w / 2 - 0.4, dd + 0.5, z1 + 1.4], [x + w / 2 + 0.4, dd + 0.5, z1 + 1.4], [x - w / 2 - 0.4, -1, z1 + 5.5], [x + w / 2 + 0.4, -1, z1 + 5.5]], { mat: m, tono: 0.06 });
  }
  if (o.garg) gargola(c.sub(x, d * 0.74 - 1, H * 0.76 - 3.5, 0), 1.05);
  if (o.pin) pinaculo(c, x, d * 0.26, H + 2, w * 0.8, o.pin, m);
  return H + (o.pin ?? 0);
}
/** Arbotante: viga de coronación con su albardilla, el arco de abajo y tracería entre los dos (en el plano x-z de `c`). */
function arbotante(g: G, xp: number, xw: number, y: number, zp: number, zw: number, m: string) {
  const L = xp - xw;
  viga(g, [xp, y, zp + 4], [xw, y, zw + 5], 5, 4.4, { mat: m, tono: 0.04 });
  viga(g, [xp, y, zp + 6.6], [xw, y, zw + 7.6], 3, 1.4, { mat: m, tono: 0.1 });
  const z0 = zp - 22, rz = zw - z0 + 1, pts: V3[] = [];
  for (let i = 0; i <= 5; i++) { const t = (i / 5) * Math.PI / 2; pts.push([xw + L * Math.cos(t) * Math.sign(xp - xw) * Math.sign(L), y, z0 + rz * Math.sin(t)]); }
  for (let i = 0; i < 5; i++) viga(g, pts[i], pts[i + 1], 4.4, 3.4, { mat: m });
  for (const t of [0.3, 0.62]) { const x = xp - (xp - xw) * t, zt = zp + 4 + (zw - zp + 1) * t, zb = z0 + rz * Math.sin(Math.acos(Math.min(1, Math.abs(x - xw) / Math.abs(L)))); g.palo([x, y, zb], [x, y, zt], 0.9, { mat: m, tono: 0.07 }); }
}
/** Tejado a dos aguas con la cumbrera a lo largo de y (eje x) entre u0 y u1. `c` es la coordenada de la cumbrera. */
function tejado(g: G, ejeY: boolean, c: number, hs: number, zE: number, zR: number, u0: number, u1: number, mat = 'abo_pizarra') {
  const P = (a: number, u: number, z: number): V3 => (ejeY ? [c + a, u, z] : [u, c + a, z]);
  for (const s of [-1, 1]) g.poli([P(s * (hs + 3.5), u0, zE - 0.5), P(s * (hs + 3.5), u1, zE - 0.5), P(s * (hs + 3.5), u0, zE + 2.6), P(s * (hs + 3.5), u1, zE + 2.6), P(0, u0, zR - 1.4), P(0, u1, zR - 1.4), P(0, u0, zR + 1.4), P(0, u1, zR + 1.4)], { mat, tono: s > 0 ? 0 : 0.03 });
  g.palo(P(0, u0, zR + 1.2), P(0, u1, zR + 1.2), 1.5, { mat: 'abo_plomo', tono: -0.05 });
}
/** Hastial: el triángulo de piedra que cierra un tejado (en una cara), con albardilla, frondas y cruz arriba. */
function hastial(c: G, hs: number, zE: number, zA: number, Tm: number, m: string, cruz = true) {
  c.prisma([[-hs, zE], [hs, zE], [0, zA]], -Tm, 0, { mat: m });
  for (const sx of [-1, 1]) {
    viga(c, [sx * (hs + 1), 0.4, zE - 0.5], [0, 0.4, zA + 1.6], 3, 2.6, { mat: m, tono: 0.08 });
    for (let i = 1; i < 6; i++) { const t = i / 6; c.esf(sx * hs * (1 - t), 1.4, zE + (zA - zE) * t + 2.2, 1.3, { mat: m, tono: 0.1 }); }
  }
  if (cruz) { c.caja(0, -Tm / 2, zA, 3.4, 3.4, 4, { mat: m }); c.caja(0, -Tm / 2, zA + 4, 2.2, 2.2, 14, { mat: m, tono: 0.06 }); c.caja(0, -Tm / 2, zA + 12, 9, 2.2, 2.2, { mat: m, tono: 0.06 }); }
}
/** Ménsulas bajo un alero en una cara, de x0 a x1. */
function mensulas(c: G, x0: number, x1: number, z: number, m: string, paso = 5) {
  c.caja((x0 + x1) / 2, 1, z, x1 - x0, 2.6, 2.6, { mat: m, tono: 0.05 });
  for (let x = x0 + paso / 2; x < x1; x += paso) c.poli([[x - 1, 0, z], [x + 1, 0, z], [x - 1, 2.4, z], [x + 1, 2.4, z], [x - 0.8, 0, z - 3], [x + 0.8, 0, z - 3]], { mat: m, tono: 0.02 });
}
/** Daño en una cara: grietas que bajan, piedras que faltan, sillares que asoman y aristas comidas. */
function desgaste(c: G, x0: number, x1: number, z0: number, z1: number, m: string, n = 4) {
  const a = c.a;
  for (let i = 0; i < n; i++) {
    let x = rr(a, x0, x1), z = rr(a, z0 + (z1 - z0) * 0.3, z1);
    const fin = z - rr(a, 12, 30);
    while (z > Math.max(z0, fin)) { const dz = 2 + a.r() * 3.5, nx = x + (a.r() - 0.5) * 4; c.palo([x, 0.3, z], [nx, 0.3, z - dz], 0.5, { mat: m, resta: true }); x = nx; z -= dz; }
  }
  for (let i = 0; i < n; i++) c.caja(rr(a, x0, x1), 0, rr(a, z0, z1), 5 + a.r() * 5, 3, 3 + a.r() * 2.5, { mat: m, resta: true });
  for (let i = 0; i < n * 2; i++) c.caja(rr(a, x0 + 3, x1 - 3), 0, rr(a, z0, z1), 6 + a.r() * 6, 1.6, 3.4 + a.r() * 2.4, { mat: m, tono: (a.r() - 0.5) * 0.14, giro: (a.r() - 0.5) * 6 });
}
/** Tierra pisoteada en una franja: manchas chicas (una grande inflaría la caja del sprite). */
function suelo(g: G, x0: number, x1: number, y0: number, y1: number, n: number) {
  const a = g.a;
  for (let i = 0; i < n; i++) g.elip(rr(a, x0, x1), rr(a, y0, y1), 0, 7 + a.r() * 7, 5 + a.r() * 5, 1.1, { mat: 'mu_tierra', giro: a.r() * 180, tono: (a.r() - 0.5) * 0.1 });
}
/** Base sucia de una cara: musgo, hiedra que trepa y pasto. */
function base(c: G, x0: number, x1: number, alto: number, hie: number) {
  const a = c.a;
  musgo(c, Math.round((x1 - x0) / 7), x0, x1, 0.4, 0.5, Math.min(alto, 9), 'abo_musgo');
  for (let i = 0; i < hie; i++) {
    let x = rr(a, x0 + 4, x1 - 4), z = 0;
    const pts: V3[] = [[x, 1, 0]];
    const H = alto * (0.4 + a.r() * 0.6);
    while (z < H) { z += 6 + a.r() * 6; x += (a.r() - 0.5) * 9; pts.push([x, 1 + a.r() * 0.6, z]); }
    hiedra(c, pts, 4, 'abo_hiedra');
  }
}

// ================================================================== la catedral: medidas en coordenadas de toda la obra
/**
 * Toda la catedral se arma en un solo marco (x a lo ancho, y a lo largo con la fachada en +y) y cada pieza dibuja lo
 * suyo corrida a su centro. Medidas en unidades del mundo (16 por celda).
 */
const XC = 32;     // cara exterior de los muros altos de la nave central
const XL = 58;     // cara exterior de las naves laterales
const XE = 74;     // borde de los estribos
const TM = 6;      // grueso de los muros
const HL = 92;     // alto de las naves laterales
const HC = 210;    // alto de la nave central
const ZR = 286;    // cumbrera
const ZL = 128;    // donde el tejado de la nave lateral toca el muro alto
const YF = 118;    // frente del cuerpo central de la fachada
const YT0 = 80, YT1 = 122; // las torres (fondo y frente)
const XT = 53;     // centro de cada torre
const LT = 42;     // lado de la torre
const YX0 = -72, YX1 = -120; // crucero (entre y0 e y1)
const XB = 74;     // hastial del transepto
const YAB = -136;  // centro del ábside
const PILAS = [64, 36, 8, -20, -48];
const BAHIAS = [50, 22, -6, -34, -61];
const PIEZAS = { fachada: 112, nave: 0, cabecera: -144 } as const;
/** Cómo se colocan las tres piezas: corrimiento en celdas desde la pieza de la nave. */
export const CATEDRAL = {
  piezas: [
    { id: 'abo_catedral_cabecera', dx: 0, dy: -9, huella: [13, 8] },
    { id: 'abo_catedral_nave', dx: 0, dy: 0, huella: [13, 9] },
    { id: 'abo_catedral_fachada', dx: 0, dy: 7, huella: [13, 5] },
  ],
  /** Celda de la puerta central y del pie de la escalinata, desde la celda de la nave. */
  puerta: [0, 8], escalinata: [0, 9],
} as const;

interface Estado { v: string; f: number; luz: Luz; lit: boolean; herida: boolean; p: number }
const estado = (v: string, f: number): Estado => {
  const p = 0.5 - 0.5 * Math.cos((f / 8) * TAU), herida = v === 'herida', lit = v !== 'sellada';
  return { v, f, p, herida, lit, luz: lit ? { mat: 'abo_vitral', tono: (herida ? -0.14 : -0.3) + (herida ? 0.32 : 0.36) * p } : { mat: 'abo_vidrio_muerto', tono: 0 } };
};
const S = 'abo_sillar', SG = 'abo_sillar_grueso', L = 'abo_labra';

/** Santo de jamba sobre su ménsula, con el doselete arriba; roto de varias maneras. */
function santo(g: G, h: number, rotura: number) {
  const a = g.a;
  g.cil(0, 0, 0, 3.4, 4, { mat: L, r1: 2.6 });
  const s = g.sub(0, 0, 4);
  const zh = figuraVelada(s, h, { mat: 'abo_estatua', pose: elegir(a, ['reza', 'pie', 'pie'] as ('reza' | 'pie')[]), tono: (a.r() - 0.5) * 0.06 });
  if (rotura === 1) s.esf(1, 0, zh + 0.5, h * 0.11, { mat: L, resta: true });
  else if (rotura === 2) s.poli([[-9, -9, zh * 0.55], [9, -9, zh * 0.7], [-9, 9, zh * 0.62], [9, 9, zh * 0.5], [-9, -9, 99], [9, -9, 99], [-9, 9, 99], [9, 9, 99]], { mat: L, resta: true });
  // doselete
  g.caja(0, 0, h + 7, 7, 7, 2, { mat: L, tono: 0.05 });
  g.poli([[-3.5, -3.5, h + 9], [3.5, -3.5, h + 9], [-3.5, 3.5, h + 9], [3.5, 3.5, h + 9], [0, 0, h + 16]], { mat: L, tono: 0.07 });
}
/**
 * Portada abocinada en una cara (+y afuera): un cuerpo que sobresale `sale`, arquivoltas que se meten escalonadas,
 * dintel y tímpano tallado, santos en las jambas y la puerta según `modo` (abierta y oscura, cerrada o tapiada).
 */
function portada(c: G, w: number, hr: number, n: number, sale: number, z0: number, modo: 'abierta' | 'cerrada' | 'tapiada', st: Estado, santos = 2, gablete = 0) {
  const a = c.a, paso = 3.4, W = w + n * paso * 2 + 5, H = z0 + altoOjiva(w + n * paso * 2, hr, K) + 6;
  c.caja(0, sale / 2 - 1, 0, W, sale + 1, H, { mat: S });
  if (gablete) c.prisma([[-W / 2, H - 1], [W / 2, H - 1], [0, H + gablete]], -1, sale - 0.5, { mat: S, tono: 0.03 });
  for (let i = 0; i <= n; i++) { const wi = w + (n - i) * paso * 2; c.prisma(ojiva(wi, hr, K, 6, z0), sale - 1.8 - i * 1.9, sale + 1, { mat: S, resta: true }); }
  const fondo = sale - 1.8 - n * 1.9 - 2;
  c.prisma(ojiva(w, hr, K, 6, z0), fondo - 10, sale + 1, { mat: S, resta: true });
  // molduras de las arquivoltas (un toro en cada escalón) con frondas en la clave
  for (let i = 0; i <= n; i++) {
    const wi = w + (n - i) * paso * 2, y = sale - 1.8 - i * 1.9 + 0.2, arc = arcoOjiva(wi - 0.6, hr, z0, 5);
    for (let j = 0; j < arc.length - 1; j++) c.palo([arc[j][0], y, arc[j][1]], [arc[j + 1][0], y, arc[j + 1][1]], 0.9, { mat: L, tono: 0.06 + (i % 2) * 0.04 });
    for (const sx of [-1, 1]) c.palo([sx * (wi / 2 - 0.3), y, z0], [sx * (wi / 2 - 0.3), y, z0 + hr], 0.9, { mat: L, tono: 0.05 });
  }
  // dintel y tímpano
  const zd = z0 + hr * 0.78;
  c.prisma(ojiva(w, hr, K, 6, z0), fondo + 0.5, fondo + 2.4, { mat: L, tono: 0.02 });
  c.caja(0, fondo + 2, zd - 3, w, 3, 3, { mat: L, tono: 0.08 });
  c.elip(0, fondo + 2.5, zd + (altoOjiva(w, hr, K) - hr * 0.78) * 0.45, w * 0.13, 1, (altoOjiva(w, hr, K) - hr * 0.78) * 0.3, { mat: L, resta: true });
  c.elip(0, fondo + 2.6, zd + (altoOjiva(w, hr, K) - hr * 0.78) * 0.45, w * 0.08, 0.6, (altoOjiva(w, hr, K) - hr * 0.78) * 0.2, { mat: 'abo_estatua', tono: -0.05 });
  c.caja(0, fondo + 2.1, z0, w - 0.4, 0.8, zd - 3 - z0, { mat: L, resta: true });
  if (modo === 'abierta') {
    // adentro: la nave arde. El fondo es un muro de luz roja que late, el piso es brasa viva y una lengua de luz
    // sale por el umbral y baja por la escalinata (el resplandor de la fachada, centrado en la puerta, tiñe la piedra)
    if (st.lit) {
      c.caja(0, fondo - 6, z0, w + 4, 1, zd, { mat: 'abo_vitral', tono: -0.05 + st.p * 0.35 + (st.herida ? 0.1 : 0) });
      c.caja(0, fondo - 3.5, z0, w - 2, 5, 0.6, { mat: 'abo_brasa', tono: 0.05 + st.p * 0.35 });
      // núcleo más claro al centro del fondo: el corazón de la luz
      c.elip(0, fondo - 5, z0 + hr * 0.38, w * 0.36, 0.8, hr * 0.42, { mat: 'abo_chispa', tono: 0.05 + st.p * 0.35 });
      c.elip(0, fondo - 4.6, z0 + hr * 0.3, w * 0.18, 0.6, hr * 0.26, { mat: 'abo_chispa', tono: 0.4 + st.p * 0.3 });
      // el piso de la nave encendido, que se ve hacia adentro
      c.caja(0, fondo - 1, z0 + 0.1, w - 1, 8, 0.4, { mat: 'abo_vitral', tono: 0.1 + st.p * 0.3 });
      // umbral encendido y reflejo en el primer escalón
      c.caja(0, fondo + 2.4, z0 - 0.2, w - 1, 2.2, 0.5, { mat: 'abo_brasa', tono: -0.1 + st.p * 0.3 });
    } else {
      c.caja(0, fondo - 6, z0, w + 4, 1, zd, { mat: 'negro' });
      c.caja(0, fondo - 3.5, z0, w - 2, 5, 0.6, { mat: 'negro' });
    }
    for (const sx of [-1, 1]) { const h = c.sub(sx * (w / 2 - 0.5), fondo + 1.4, z0, sx * (st.lit ? -104 : -72)); h.caja(-sx * w / 4, -0.8, 0, w / 2 - 0.6, 1.6, zd - 3.5 - z0, { mat: 'abo_madera', tono: -0.15 }); }
  } else if (modo === 'cerrada') {
    for (const sx of [-1, 1]) { c.caja(sx * w / 4, fondo + 1.4, z0, w / 2 - 0.4, 1.6, zd - 3 - z0, { mat: 'abo_madera', tono: -0.05 + sx * 0.03 }); for (const z of [0.2, 0.5, 0.8]) c.caja(sx * w / 4, fondo + 2.4, z0 + (zd - 3 - z0) * z, w / 2 - 2, 0.6, 1.4, { mat: 'mu_hierro' }); }
    c.cil(w * 0.06, fondo + 2.6, z0 + (zd - z0) * 0.45, 1.3, 0.6, { mat: 'mu_hierro', eje: [0, 1, 0] });
  } else {
    // tapiada: sillares de otra piedra, tablas clavadas en cruz y una cadena
    c.prisma(ojiva(w, hr, K, 6, z0), fondo, fondo + 4, { mat: 'mu_bloques_frio', tono: -0.04 });
    const zt = z0 + hr * 0.5;
    for (const sx of [-1, 1]) viga(c, [-sx * w * 0.42, fondo + 5, z0 + 4], [sx * w * 0.42, fondo + 5, zt + hr * 0.3], 3.4, 1.2, { mat: 'abo_madera', tono: -0.08 });
    for (let i = 0; i < 9; i++) c.esf(-w * 0.4 + i * w * 0.1, fondo + 6, zt + Math.sin((i / 8) * Math.PI) * -4, 0.9, { mat: 'mu_hierro', tono: i % 2 ? 0.05 : -0.05 });
  }
  // santos en las jambas (rotos, uno ni está)
  for (const sx of [-1, 1]) for (let k = 0; k < santos; k++) {
    const x = sx * (w / 2 + paso * (k + 0.6)), y = sale - 1.8 - (n - k - 0.6) * 1.9 + 1.4;
    if (a.r() < 0.18) { c.cil(x, y, z0, 3.4, 4, { mat: L, r1: 2.6 }); continue; }
    santo(c.sub(x, y, z0, 90 - sx * 20), 26 + a.r() * 4, elegir(a, [0, 1, 1, 2]));
  }
}

/** Escalinata gastada: escalones de losas desparejas, alguna partida o que falta, con musgo en las juntas. */
function escalinata(g: G, y0: number, n: number, ancho: number, prof: number, sube: number, m = SG) {
  const a = g.a;
  for (let i = 0; i < n; i++) {
    const y = y0 + (n - 1 - i) * prof + prof / 2, z = i * sube, w = ancho + (n - 1 - i) * 8;
    let x = -w / 2;
    while (x < w / 2 - 1) {
      const lw = Math.min(w / 2 - x, 9 + a.r() * 10), cx = x + lw / 2;
      if (a.r() < 0.06 && i < n - 1) { x += lw; continue; }
      bloque(g, cx, y + (a.r() - 0.5) * 0.8, z - 0.6, lw - 0.4, prof + 0.6, sube + 0.6 + (a.r() - 0.5) * 0.5, { mat: m, b: 0.9, j: 1.1, tono: (a.r() - 0.5) * 0.12 - i * 0.02, giro: (a.r() - 0.5) * 3 });
      if (a.r() < 0.3) g.elip(x + lw, y + prof / 2, z + sube, 1.6, 1, 0.8, { mat: 'abo_musgo' });
      x += lw;
    }
  }
}

// ------------------------------------------------------------------ la fachada oeste con las dos torres
/**
 * Aguja calada de piedra: el esqueleto de una pirámide ochavada (ocho nervios con frondas que suben a la punta, anillos
 * de tracería a distintas alturas y parteluces en los paños), así se ve el cielo a través. `rota` le arranca la punta.
 */
function agujaCalada(g: G, x: number, y: number, z0: number, R: number, H: number, m: string, rota = 0) {
  const a = g.a, zA = z0 + H, ztop = rota ? zA - rota : zA;
  const p = (i: number, f: number): V3 => { const t = (i / 8) * TAU + TAU / 16, r = R * (1 - f); return [x + Math.cos(t) * r, y + Math.sin(t) * r, z0 + H * f]; };
  const fmax = (ztop - z0) / H;
  // base maciza y el anillo de arranque
  g.poli([...Array.from({ length: 8 }, (_, i) => p(i, 0)), ...Array.from({ length: 8 }, (_, i) => p(i, 0.06))], { mat: m });
  for (let i = 0; i < 8; i++) {
    const ft = rota && i % 3 === 1 ? fmax - 0.05 - a.r() * 0.08 : fmax;
    g.palo(p(i, 0.05), p(i, ft), 1.9, { mat: m, r1: 0.8 });
    for (let k = 1; k < 9; k++) { const f = 0.06 + k * 0.105; if (f > ft) break; const q = p(i, f), d = Math.hypot(q[0] - x, q[1] - y) + 1.4; g.elip(x + ((q[0] - x) / (d - 1.4)) * d, y + ((q[1] - y) / (d - 1.4)) * d, q[2], 1.3, 1.3, 1.7, { mat: m, tono: 0.1 }); }
  }
  // anillos de tracería: cada paño con un arquito apuntado y, en los de abajo, un óculo y su parteluz
  const anillos = [0.06, 0.24, 0.42, 0.6, 0.76, 0.88];
  anillos.forEach((f, k) => {
    if (f > fmax - 0.02) return;
    for (let i = 0; i < 8; i++) {
      const A = p(i, f), B = p((i + 1) % 8, f);
      g.palo(A, B, k === 0 ? 1.6 : 1.1, { mat: m, tono: 0.05 });
      const f2 = anillos[k + 1] ?? f + 0.1;
      if (f2 > fmax - 0.02) continue;
      const C = p(i, f2), D = p((i + 1) % 8, f2), mA = mix(A, B, 0.5), mC = mix(C, D, 0.5);
      // arquito apuntado colgado del anillo de arriba
      const pico = mix(mA, mC, 0.72), arr = mix(mA, mC, 0.45);
      g.palo(mix(mix(A, C, 0.45), arr, 0), pico, 0.6, { mat: m, tono: 0.06 }); g.palo(pico, mix(B, D, 0.45), 0.6, { mat: m, tono: 0.06 });
      if (k < 3) {
        g.palo(mA, mix(mA, mC, 0.45), 0.7, { mat: m, tono: 0.04 });
        const c = mix(mA, mC, 0.62), rr0 = Math.hypot(A[0] - B[0], A[1] - B[1]) * 0.16, u = nrm(sub3(B, A));
        for (let j = 0; j < 6; j++) { const t0 = (j / 6) * TAU, t1 = ((j + 1) / 6) * TAU; g.palo([c[0] + u[0] * Math.cos(t0) * rr0, c[1] + u[1] * Math.cos(t0) * rr0, c[2] + Math.sin(t0) * rr0], [c[0] + u[0] * Math.cos(t1) * rr0, c[1] + u[1] * Math.cos(t1) * rr0, c[2] + Math.sin(t1) * rr0], 0.5, { mat: m, tono: 0.06 }); }
      }
    }
  });
  if (rota) { for (let i = 0; i < 5; i++) g.caja(x + rr(a, -R * 0.4, R * 0.4), y + rr(a, -R * 0.4, R * 0.4), ztop - 4, 2 + a.r() * 2, 2 + a.r() * 2, 3, { mat: m, giro: a.r() * 90, incl: rr(a, -30, 30) }); return; }
  g.esf(x, y, zA - 2, 2.6, { mat: m, tono: 0.1 });
  for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU; g.elip(x + Math.cos(t) * 2.4, y + Math.sin(t) * 2.4, zA - 6, 1.6, 1.6, 2.6, { mat: m, tono: 0.12 }); }
  g.caja(x, y, zA, 1.6, 1.6, 15, { mat: 'mu_hierro' }); g.caja(x, y, zA + 9.5, 8, 1.6, 1.6, { mat: 'mu_hierro' });
}
/** Una torre de la fachada (centro x, y), cuatro cuerpos, campanario, balaustrada, pináculos y la aguja calada. */
function torre(g: G, x: number, sx: number, st: Estado) {
  const a = g.a, y = (YT0 + YT1) / 2, h = LT / 2, ZT = 318;
  g.caja(x, y, 0, LT, LT, ZT, { mat: S });
  // estribos en ángulo (frente y costado de afuera), escalonados hasta el campanario
  const fr = cara(g, x, YT1, 0), lado = cara(g, x + sx * h, y, sx > 0 ? -90 : 90);
  for (const k of [-1, 1]) {
    estribo(fr, k * (h - 1), 7, 9, 288, SG, { pin: 40, garg: k === sx });
    estribo(lado, k * (h - 1), 7, 9, 288, SG, { pin: 40 });
  }
  // fajas entre cuerpos
  for (const z of [120, 205, 262]) g.caja(x, y, z, LT + 3, LT + 3, 3, { mat: L, tono: 0.05 });
  // caras que se ven: frente (+y) y la de afuera de la torre derecha o la de adentro de la izquierda (+x)
  const caras: G[] = [fr, cara(g, x + h, y, -90)];
  caras.forEach((c, ci) => {
    const ocultaAbajo = sx < 0 && ci === 1;
    if (!ocultaAbajo) {
      desgaste(c, -h + 6, h - 6, 10, 250, S, 3);
      ventanal(c, 0, 13, 136, 44, 6, st.luz, S, 2);
      for (const k of [-1, 0, 1]) c.sub(k * 10, 0, 0).prisma(ojiva(6, 16, K, 3, 236), -1.4, 1, { mat: S, resta: true });
    }
    // campanario: dos huecos altos con las tablas (lamas) adentro
    for (const k of [-1, 1]) {
      c.sub(k * 7.5, 0, 0).prisma(ojiva(10, 34, K, 5, 268), -8, 1.5, { mat: S, resta: true });
      c.caja(k * 7.5, -7, 268, 11, 1, 44, { mat: 'negro' });
      for (let i = 0; i < 6; i++) c.caja(k * 7.5, -3.5, 271 + i * 6, 10, 1, 2.4, { mat: 'abo_madera', tono: -0.2, incl: 30 });
    }
    c.caja(0, -2, 268, 2.6, 3, 34, { mat: L, tono: 0.06 });
    const arc = arcoOjiva(27, 34, 266, 5);
    for (let i = 0; i < arc.length - 1; i++) c.palo([arc[i][0], 0.7, arc[i][1]], [arc[i + 1][0], 0.7, arc[i + 1][1]], 1, { mat: L, tono: 0.08 });
    mensulas(c, -h, h, ZT - 4, L, 4.6);
  });
  // balaustrada calada, pináculos de esquina y la aguja
  g.caja(x, y, ZT, LT + 4, LT + 4, 3, { mat: L, tono: 0.06 });
  for (const [px, py] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) pinaculo(g, x + px * (h - 1.5), y + py * (h - 1.5), ZT + 3, 7, 58, SG);
  for (const c of [cara(g, x, y + h + 2, 0), cara(g, x + h + 2, y, -90)]) {
    c.caja(0, -1, ZT + 3, LT - 6, 2, 7, { mat: L, tono: 0.04 });
    for (let i = 0; i < 5; i++) c.cil(-LT / 2 + 6 + i * 7.5, 2, ZT + 6.5, 2.2, 5, { mat: L, resta: true, eje: [0, -1, 0] });
  }
  agujaCalada(g, x, y, ZT + 3, h - 2, 206, SG, sx > 0 && st.herida ? 30 : 0);
  void a;
}
function fachada(g: G, st: Estado) {
  const a = g.a;
  suelo(g, -96, 96, YT1 + 4, YT1 + 18, 9);
  g.caja(0, (YT0 + YT1) / 2, 0, 2 * (XT + LT / 2) + 10, YT1 - YT0 + 8, 9, { mat: SG, tono: -0.08 });
  // cuerpo central: muro hasta la galería, el hastial alto y el rosetón
  g.caja(0, (YT0 + 2 + YF) / 2, 0, 2 * XC + 2, YF - YT0 - 2, 266, { mat: S });
  const fc = cara(g, 0, YF, 0);
  desgaste(fc, -XC + 4, XC - 4, 12, 170, S, 3);
  roseton(fc, 0, 202, 27, 8, st.luz, S, 12, false);
  // galería de los reyes: nichos con figuras (algunas sin cabeza)
  g.caja(0, YF + 1, 236, 2 * XC, 3, 2.4, { mat: L, tono: 0.06 });
  for (let i = 0; i < 7; i++) {
    const x = -XC + 5 + i * ((2 * XC - 10) / 6);
    fc.sub(x, 0, 0).prisma(ojiva(6.4, 14, K, 3, 239), -3, 1, { mat: S, resta: true });
    fc.cil(x, -1.6, 239, 2, 11, { mat: 'abo_estatua', r1: 1.5, tono: (a.r() - 0.5) * 0.08 });
    if (a.r() < 0.7) fc.elip(x, -1.6, 251.6, 1.4, 1.4, 1.8, { mat: 'abo_estatua' });
  }
  g.caja(0, YF + 1, 262, 2 * XC + 2, 4, 4, { mat: L, tono: 0.06 });
  hastial(cara(g, 0, YF, 0), XC + 2, 266, 330, 10, S);
  roseton(cara(g, 0, YF, 0), 0, 290, 10, 6, st.luz, S, 8, false);
  // las tres portadas: la central (la entrada) y una en el pie de cada torre
  portada(cara(g, 0, YF, 0), 30, 60, 4, 10, 9, st.v === 'sellada' ? 'tapiada' : 'abierta', st, 3, 26);
  for (const sx of [-1, 1]) portada(cara(g, sx * XT, YT1, 0), 16, 40, 2, 7, 9, st.v === 'sellada' ? 'tapiada' : 'cerrada', st, 2, 0);
  for (const sx of [-1, 1]) torre(g, sx * XT, sx, st);
  // escalinata, base sucia, sillares caídos
  escalinata(g, YF + 10, 4, 64, 3.6, 2.2);
  // el abanico de luz que sale por la puerta: sobre cada escalón y en el piso de afuera, más ancho y más tenue a medida que se aleja
  if (st.lit) {
    for (let i = 0; i < 4; i++) {
      const y = YF + 10 + (3 - i) * 3.6 + 1.8, z = (i + 1) * 2.2 + 0.05, k = (3 - i) / 3;
      g.caja(0, y, z, 26 + k * 12, 3.2, 0.25, { mat: 'abo_brasa', tono: -0.05 - k * 0.25 + st.p * 0.25 });
    }
    for (let j = 0; j < 3; j++) g.caja(0, YF + 10 + 14.4 + 3 + j * 6, 0.05, 40 + j * 14, 6, 0.2, { mat: 'abo_brasa', tono: -0.4 - j * 0.15 + st.p * 0.2 });
  }
  base(fc, -XC, XC, 60, 1);
  base(cara(g, XT, YT1 + 9, 0), -LT / 2 - 4, LT / 2 + 4, 90, 2);
  base(cara(g, XT + LT / 2 + 9, (YT0 + YT1) / 2, -90), -LT / 2, LT / 2, 120, 2);
  base(cara(g, -XT, YT1 + 9, 0), -LT / 2 - 4, LT / 2 + 4, 70, 1);
  cascotes(g, 14, 30, 6, SG, 64, YT1 + 18, 3.4);
  cascotes(g, 10, 18, 5, SG, -56, YT1 + 18, 3);
  for (let i = 0; i < 4; i++) bloque(g, rr(a, -90, 96), YT1 + rr(a, 12, 22), -0.6, 9 + a.r() * 4, 6, 5 + a.r() * 2, { mat: SG, giro: a.r() * 90, incl: rr(a, -14, 14), b: 1.2, j: 1.4 });
  if (st.herida) { const p = g.sub(98, YT1 - 10, 3, 30, 84, 'x'); pinaculo(p, 0, 0, -20, 8, 44, SG); cascotes(g, 8, 10, 8, SG, 96, YT1 - 4, 2.6); }
  matas(g, 14, 96, 10, 0, YT1 + 14);
  // la luz sale por la puerta: centro justo afuera del umbral y bajo, para teñir de rojo la escalinata, las jambas y el piso
  return { piezas: g.ps, resplandor: st.lit ? { c: [0, YF + 16, 22] as V3, r: (st.herida ? 120 : 100) + st.p * 34, color: st.p > 0.5 ? '#ff3a12' : '#d01c0a' } : undefined };
}

// ------------------------------------------------------------------ la nave: cinco tramos con arbotantes
/** Superficie de arriba del faldón +x del tejado de la nave: punto a la fracción `s` de alero a cumbrera, corrido `o` hacia afuera. */
const zEal = HC + 2 + 2.6, zCum = ZR + 1.4;
const nTecho = nrm([zCum - zEal, 0, XC + 3.5]);
const enTecho = (s: number, y: number, o: number): V3 => { const p = mix([XC + 3.5, y, zEal], [0, y, zCum], s); return [p[0] + nTecho[0] * o, p[1], p[2] + nTecho[2] * o]; };
const sobreTecho = (x: number) => zCum - (zCum - zEal) * (x / (XC + 3.5));
function nave(g: G, st: Estado) {
  const a = g.a, y0 = 84, y1 = YX0;
  suelo(g, XE - 4, XE + 16, y1, 76, 10);
  g.caja(0, (y0 + y1) / 2, 0, 2 * XL + 4, y0 - y1, 9, { mat: SG, tono: -0.08 });
  for (const s of [-1, 1]) {
    g.caja(s * (XC - TM / 2), (y0 + y1) / 2, 0, TM, y0 - y1, HC, { mat: S });
    g.caja(s * (XL - TM / 2), (y0 + y1) / 2, 0, TM, y0 - y1, HL, { mat: S });
  }
  g.caja(0, (y0 + y1) / 2, 0, 2 * XC - 2 * TM, y0 - y1, 10, { mat: 'mu_bloques_frio', tono: -0.2 });
  // daño y vitrales: altos (tres luces) y bajos en el costado que se ve
  const alto = (y: number) => cara(g, XC, y, -90), bajo = (y: number) => cara(g, XL, y, -90);
  for (const y of BAHIAS) desgaste(bajo(y), -9, 9, 6, 80, S, 1);
  desgaste(alto(10), -60, 60, 100, 200, S, 4);
  for (const y of BAHIAS) { ventanal(alto(y), 0, 17, 136, 42, TM, st.luz, S, 3); ventanal(bajo(y), 0, 12, 24, 32, TM, st.luz, S, 2, st.v === 'sellada' && (y === 22 || y === -34)); }
  // estribos y arbotantes a los dos lados
  for (const y of PILAS) {
    estribo(cara(g, XL, y, -90), 0, 6, XE - XL - 4, 184, SG, { pin: 40, garg: true });
    arbotante(g, XL + 1, XC, y, 166, 192, SG);
    estribo(cara(g, -XL, y, 90), 0, 6, XE - XL - 4, 184, SG, { pin: 40 });
    arbotante(g, -XL - 1, -XC, y, 166, 192, SG);
  }
  mensulas(cara(g, XC, (y0 + y1) / 2, -90), -(y0 - y1) / 2, (y0 - y1) / 2, HC - 3, L);
  mensulas(cara(g, XL, (y0 + y1) / 2, -90), -(y0 - y1) / 2, (y0 - y1) / 2, HL - 3, L, 6);
  // tejados: el alto (hasta el crucero) y las naves laterales en pendiente
  tejado(g, true, 0, XC, HC + 2, ZR, y1 - 4, y0);
  for (const s of [-1, 1]) g.poli([[s * (XL + 3.5), y0, HL], [s * (XL + 3.5), y1, HL], [s * (XL + 3.5), y0, HL + 3], [s * (XL + 3.5), y1, HL + 3], [s * XC, y0, ZL], [s * XC, y1, ZL], [s * XC, y0, ZL + 3], [s * XC, y1, ZL + 3]], { mat: 'abo_pizarra', tono: s > 0 ? 0.04 : 0 });
  // el tramo hundido: el agujero, las vigas al aire, lo que cayó adentro y las brasas
  const H0 = -24, H1 = 36;
  if (st.herida) {
    const hueco = (q: [number, number][]) => g.poli(q.flatMap(([s, y]) => [enTecho(s, y, -5), enTecho(s, y, 4)]), { mat: 'abo_pizarra', resta: true });
    hueco([[0.08, H0 + 8], [0.45, H0], [0.9, H0 + 10], [0.88, H0 + 34], [0.15, H0 + 36]]);
    hueco([[0.14, H0 + 30], [0.66, H0 + 28], [0.72, H1], [0.3, H1 + 2]]);
    for (let y = H0 - 2; y <= H1 + 3; y += 5.6) {
      if (a.r() < 0.25) continue;
      const sb = a.r() < 0.3 ? 1 : 0.25 + a.r() * 0.5, p0 = enTecho(-0.02, y, -3.4), p1 = enTecho(sb, y, -3.4);
      viga(g, p0, p1, 2, 2.6, { mat: 'abo_madera_quemada', tono: (a.r() - 0.5) * 0.1 });
      if (sb < 1) g.esf(p1[0], p1[1], p1[2], 1.4, { mat: 'abo_brasa', tono: -0.2 + st.p * 0.25 });
    }
    viga(g, enTecho(0.5, H0 - 6, -6.5), enTecho(0.5, H1 + 6, -6.5), 2.6, 3.2, { mat: 'abo_madera_quemada' });
    viga(g, [0, H0 - 6, zCum - 5.4], [0, H1 + 6, zCum - 5.4], 3, 3.4, { mat: 'abo_madera_quemada', tono: 0.04 });
    viga(g, [-XC + TM, H0 + 4, HC - 6], [XC - TM, H0 + 6, HC - 6], 3.4, 3.4, { mat: 'abo_madera_quemada' });
    viga(g, [-XC + TM, H0 + 24, HC - 6], [6, H0 + 20, 120], 3.4, 3.4, { mat: 'abo_madera_quemada' });
    for (let i = 0; i < 4; i++) viga(g, [rr(a, -20, 10), rr(a, H0, H1), 10.5], [rr(a, -20, 20), rr(a, H0, H1), 10 + rr(a, 2, 30)], 3, 3, { mat: 'abo_madera_quemada' });
    for (let i = 0; i < 12; i++) g.elip(rr(a, -24, 20), rr(a, H0, H1), 10.3, 3 + a.r() * 5, 2 + a.r() * 4, 1.2 + a.r() * 2, { mat: 'abo_brasa', tono: -0.3 + st.p * 0.3 + a.r() * 0.1, giro: a.r() * 90 });
    // el fuego que sigue ardiendo adentro: lenguas que suben y bajan con el pulso
    for (let i = 0; i < 7; i++) { const x = rr(a, -22, 12), y = rr(a, H0 + 4, H1 - 4), h = (24 + a.r() * 40) * (0.75 + 0.35 * Math.sin((st.f / 8) * TAU + i * 1.7)); g.cil(x, y, 10, 3 + a.r() * 3, h, { mat: 'abo_llama', r1: 0.3, tono: -0.1 + a.r() * 0.15 }); }
    cascotes(g, 12, 18, 18, 'abo_pizarra', -4, (H0 + H1) / 2, 2.4);
    for (let i = 0; i < 8; i++) { const p = enTecho(rr(a, 0.05, 0.3), rr(a, H0 + 2, H1), 1.4); g.caja(p[0], p[1], p[2], 4.4, 3.4, 0.8, { mat: 'abo_pizarra', giro: a.r() * 60, incl: rr(a, 20, 60), tono: 0.05 }); }
    cascotes(g, 10, 8, 20, 'abo_pizarra', XE + 10, (H0 + H1) / 2, 2.2);
    viga(g, [XL + 6, H0 + 4, 1], [XE + 18, H1, 4], 2.6, 2.6, { mat: 'abo_madera_quemada' });
  }
  // la punta de la aguja del crucero, caída sobre el tejado (en la herida se metió por el hueco)
  const rk = 7.9;
  const B: V3 = st.herida ? [5, -36, sobreTecho(5) + rk] : [5, -70, sobreTecho(5) + rk];
  const Ep: V3 = st.herida ? [17, 12, 200] : [27, 10, sobreTecho(27) + 1];
  const ej = sub3(Ep, B), Lp = Math.hypot(...ej);
  g.cil(B[0], B[1], B[2], rk, Lp, { mat: 'abo_plomo', r1: 0.6, eje: ej, tono: 0.03 });
  for (let i = 1; i < 4; i++) { const p = mix(B, Ep, i * 0.22); g.cil(p[0], p[1], p[2], rk * (1 - i * 0.22) + 0.5, 1.4, { mat: 'abo_plomo', eje: ej, tono: 0.08 }); }
  g.palo(Ep, [Ep[0] + ej[0] / Lp * 9, Ep[1] + ej[1] / Lp * 9 + 2, Ep[2] + 5], 0.8, { mat: 'mu_hierro' });
  if (!st.herida) cascotes(g, 7, 6, 12, 'abo_pizarra', 14, -40, 2);
  // base sucia, hiedra, sillares caídos, pasto y dos cuervos en la cumbrera
  for (const y of [50, -6]) base(cara(g, XL, y, -90), -10, 10, 70, 1);
  base(cara(g, XE, PILAS[2], -90), -4, 4, 120, 1);
  cascotes(g, 16, 10, 60, SG, XE + 12, 6, 3.4);
  for (let i = 0; i < 5; i++) bloque(g, rr(a, XE + 4, XE + 26), rr(a, -66, 66), -0.6, 9 + a.r() * 5, 6, 5 + a.r() * 2, { mat: SG, giro: a.r() * 90, incl: rr(a, -16, 16), b: 1.2, j: 1.4 });
  matas(g, 16, 18, 66, XE + 10, 4);
  for (const y of [60, -24]) cuervo(g.sub(1.6, y, ZR + 2, 30 + a.r() * 40), 'posado', 0, 8, 1);
  if (st.herida) for (let i = 0; i < 18; i++) {
    const u = (i / 18 + st.f / 8) % 1, f0 = i * 2.39;
    const x = 10 + Math.sin(f0) * 10 + u * 22, y = (H0 + H1) / 2 + Math.cos(f0 * 1.3) * 12 + Math.sin(u * 7 + f0) * 5, z = 236 + u * 120;
    g.elip(x, y, z, 1.1 * (1 - u * 0.5), 1.1 * (1 - u * 0.5), 1.8 * (1 - u * 0.4), { mat: 'abo_chispa', tono: -0.1 - u * 0.35 });
  }
  const c: V3 = st.herida ? [8, (H0 + H1) / 2, 190] : [XC + 4, 8, 150];
  return { piezas: g.ps, resplandor: st.lit ? { c, r: (st.herida ? 96 : 62) + st.p * 28, color: st.p > 0.5 ? '#ff4a1c' : '#c42410' } : undefined };
}

// ------------------------------------------------------------------ la cabecera: crucero, transepto, aguja, girola y capillas
function cabecera(g: G, st: Estado) {
  const a = g.a, R1 = XC, R2 = XL - 4, RC = 60, ya = (YX0 + YX1) / 2;
  suelo(g, XB + 2, XB + 18, YX1 - 4, YX0 + 4, 4);
  suelo(g, XE - 6, XE + 14, YAB - 50, YX1, 5);
  g.caja(0, (YX0 + YAB) / 2, 0, 2 * XL + 4, YX0 - YAB, 9, { mat: SG, tono: -0.08 });
  g.caja(0, ya, 0, 2 * XB + 4, YX0 - YX1 + 4, 9, { mat: SG, tono: -0.08 });
  g.cil(0, YAB, 0, R2 + 6, 9, { mat: SG, tono: -0.08 });
  // crucero y transepto: muros, el hastial +x con su rosetón, estribos de esquina
  for (const s of [-1, 1]) for (const y of [YX0 - TM / 2, YX1 + TM / 2]) g.caja(s * (XC + XB) / 2, y, 0, XB - XC, TM, HC, { mat: S });
  for (const s of [-1, 1]) g.caja(s * (XB - TM / 2), ya, 0, TM, YX0 - YX1, HC, { mat: S });
  const tr = cara(g, XB, ya, -90), trN = (x: number) => cara(g, x, YX0, 0);
  desgaste(tr, -20, 20, 10, 200, S, 4);
  desgaste(trN(66), -6, 6, 10, 190, S, 1);
  roseton(tr, 0, 168, 21, TM, st.luz, S, 10);
  for (const x of [-11, 11]) ventanal(tr, x, 11, 30, 64, TM, st.luz, S, 2);
  ventanal(trN(66), 0, 9, 40, 98, TM, st.luz, S, 1);
  for (const yy of [YX0, YX1]) estribo(cara(g, XB, yy, -90), 0, 10, 12, 220, SG, { pin: 44, garg: yy === YX0 });
  mensulas(cara(g, 66, YX0, 0), -8, 8, HC - 3, L);
  tejado(g, false, ya, (YX0 - YX1) / 2, HC + 2, ZR, -XB + 2, XB - 2);
  tejado(g, true, 0, XC, HC + 2, ZR, YAB, YX0 + 2);
  for (const s of [-1, 1]) hastial(cara(g, s * XB, ya, s > 0 ? -90 : 90), (YX0 - YX1) / 2 + 4, HC, ZR + 12, TM + 2, S);
  // coro: tramo recto, ábside alto y la girola baja alrededor
  for (const s of [-1, 1]) { g.caja(s * (XC - TM / 2), (YX1 + YAB) / 2, 0, TM, YX1 - YAB + 2, HC, { mat: S }); g.caja(s * (XL - TM / 2), (YX1 + YAB) / 2, 0, TM, YX1 - YAB + 2, HL, { mat: S }); }
  g.cil(0, YAB, 0, R1, HC, { mat: S });
  g.cil(0, YAB, 0, R2, HL, { mat: S });
  const radial = (r: number, t: number) => cara(g, Math.cos(t * GR) * r, YAB + Math.sin(t * GR) * r, t - 90);
  desgaste(radial(R1, -30), -10, 10, 100, 200, S, 2);
  desgaste(radial(R2, -20), -10, 10, 8, 80, S, 2);
  for (const t of [-14, -52, -90, -128, -166]) ventanal(radial(R1, t), 0, 13, 136, 42, 8, st.luz, S, 2);
  for (const t of [-36, -144]) ventanal(radial(R2, t), 0, 9, 22, 30, 8, st.luz, S, 1);
  ventanal(cara(g, XL, YAB + 8, -90), 0, 10, 24, 32, TM, st.luz, S, 1);
  // capillas radiales: cilindro con su ventanal, contrafuertes, techo cónico y remate
  for (const t of [-18, -54, -90, -126, -162]) {
    const cx = Math.cos(t * GR) * RC, cy = YAB + Math.sin(t * GR) * RC;
    g.cil(cx, cy, 0, 12, 76, { mat: S });
    g.cil(cx, cy, 74, 13.5, 3, { mat: L, tono: 0.05 });
    g.cil(cx, cy, 77, 14, 34, { mat: 'abo_pizarra', r1: 0.8 });
    g.esf(cx, cy, 112, 1.8, { mat: L, tono: 0.08 });
    if (Math.cos(t * GR) + Math.sin(t * GR) > -0.9) {
      ventanal(cara(g, cx + Math.cos(t * GR) * 12, cy + Math.sin(t * GR) * 12, t - 90), 0, 9, 18, 34, 8, st.luz, S, 1);
      for (const d of [-40, 40]) { const tt = t + d; estribo(cara(g, cx + Math.cos(tt * GR) * 11, cy + Math.sin(tt * GR) * 11, tt - 90), 0, 5, 5, 70, SG, { pin: 18 }); }
    }
  }
  // arbotantes en corona alrededor del ábside
  for (const t of [0, -36, -72, -108, -144, -180]) {
    const ct = Math.cos(t * GR), sn = Math.sin(t * GR);
    estribo(cara(g, ct * (R2 + 1), YAB + sn * (R2 + 1), t - 90), 0, 9, 18, 180, SG, { pin: 40, garg: ct + sn > -0.3 });
    arbotante(g.sub(0, YAB, 0, t), R2 + 3, R1, 0, 162, 192, SG);
  }
  // tejados del coro: medio cono del ábside, la girola en anillo y las laterales
  g.cil(0, YAB, HC + 2, XC + 4, ZR - HC - 2, { mat: 'abo_pizarra', r1: 0.6 });
  g.palo([0, YAB, ZR + 1], [0, YAB, ZR + 14], 1.2, { mat: 'mu_hierro' }); g.palo([-4, YAB, ZR + 10], [4, YAB, ZR + 10], 0.9, { mat: 'mu_hierro' });
  g.cil(0, YAB, HL, R2 + 3.5, ZL - HL, { mat: 'abo_pizarra', r1: R1 });
  for (const s of [-1, 1]) g.poli([[s * (XL + 3.5), YX1, HL], [s * (XL + 3.5), YAB, HL], [s * (XL + 3.5), YX1, HL + 3], [s * (XL + 3.5), YAB, HL + 3], [s * XC, YX1, ZL], [s * XC, YAB, ZL], [s * XC, YX1, ZL + 3], [s * XC, YAB, ZL + 3]], { mat: 'abo_pizarra', tono: 0.04 });
  for (let i = 0; i < 18; i++) { const t = -i * 10, ct = Math.cos(t * GR), sn = Math.sin(t * GR); if (ct + sn < -0.5) continue; g.caja(ct * (R1 + 1), YAB + sn * (R1 + 1), HC - 3, 3, 3, 3, { mat: L, tono: 0.05, giro: t }); }
  // la aguja del crucero: tambor de plomo con lancetas y gabletes, la aguja partida con el maderamen a la vista
  g.cil(0, ya, ZR - 22, 16, 56, { mat: 'abo_plomo' });
  for (let i = 0; i < 8; i++) { const t = (i / 8) * TAU; if (Math.cos(t) + Math.sin(t) < -0.6) continue; g.sub(Math.cos(t) * 15.5, ya + Math.sin(t) * 15.5, 0, t / GR - 90).prisma(ojiva(4.4, 14, K, 3, ZR + 6), -4, 2, { mat: 'abo_plomo', resta: true }); }
  for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU + TAU / 8; g.sub(Math.cos(t) * 16, ya + Math.sin(t) * 16, ZR + 34, t / GR - 90).prisma([[-6, 0], [6, 0], [0, 10]], -1.5, 1.5, { mat: 'abo_plomo', tono: 0.05 }); }
  for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU; pinaculo(g, Math.cos(t) * 15, ya + Math.sin(t) * 15, ZR + 34, 4, 22, 'abo_plomo'); }
  g.cil(0, ya, ZR + 34, 18, 2.4, { mat: 'abo_plomo', tono: 0.06 });
  const zb = ZR + 36, Hb = 62, rb = 12.5, rk = rb * (1 - Hb / 168);
  g.cil(0, ya, zb, rb, Hb, { mat: 'abo_plomo', r1: rk });
  for (let i = 1; i < 4; i++) g.cil(0, ya, zb + i * 15, rb * (1 - (i * 15) / 168) + 0.5, 1.4, { mat: 'abo_plomo', tono: 0.08 });
  g.poli([[-14, ya - 14, zb + Hb - 9], [14, ya - 14, zb + Hb + 2], [-14, ya + 14, zb + Hb - 2], [14, ya + 14, zb + Hb + 6], [-14, ya - 14, zb + 120], [14, ya - 14, zb + 120], [-14, ya + 14, zb + 120], [14, ya + 14, zb + 120]], { mat: 'abo_plomo', resta: true });
  for (let i = 0; i < 5; i++) { const t = a.r() * TAU, r = rk * 0.6; g.palo([Math.cos(t) * r, ya + Math.sin(t) * r, zb + Hb - 12], [Math.cos(t) * r * 1.3, ya + Math.sin(t) * r * 1.3, zb + Hb + 3 + a.r() * 9], 0.9, { mat: 'abo_madera_quemada' }); }
  // base sucia, hiedra, sillares caídos y pasto
  base(tr, -22, 22, 140, 2);
  base(trN(66), -7, 7, 110, 1);
  base(radial(RC + 12, -18), -7, 7, 60, 2);
  base(radial(RC + 12, -54), -7, 7, 60, 1);
  cascotes(g, 8, 14, 10, SG, XB + 18, ya, 3);
  cascotes(g, 14, 22, 14, SG, XE + 6, YAB + 2, 3.2);
  for (let i = 0; i < 3; i++) bloque(g, rr(a, XE, XE + 20), rr(a, YAB - 50, YX1), -0.6, 9 + a.r() * 5, 6, 5, { mat: SG, giro: a.r() * 90, incl: rr(a, -16, 16), b: 1.2, j: 1.4 });
  matas(g, 12, 30, 20, XE + 4, YAB);
  return { piezas: g.ps, resplandor: st.lit ? { c: [XC + 4, YAB + 4, 140] as V3, r: (st.herida ? 80 : 64) + st.p * 22, color: st.p > 0.5 ? '#ff4a1c' : '#c42410' } : undefined };
}

const VARIANTES = ['entera', 'herida', 'sellada'];
for (const [id, nombre, huella, armar] of [
  ['abo_catedral_fachada', ['Catedral de Santa Oria: fachada y torres', 'Saint Oria cathedral: west front and towers'], [13, 5], fachada],
  ['abo_catedral_nave', ['Catedral de Santa Oria: nave', 'Saint Oria cathedral: nave'], [13, 9], nave],
  ['abo_catedral_cabecera', ['Catedral de Santa Oria: crucero y cabecera', 'Saint Oria cathedral: crossing and chevet'], [13, 8], cabecera],
] as [string, [string, string], [number, number], (g: G, st: Estado) => { piezas: Pieza[]; resplandor?: { c: V3; r: number; color: string } }][]) {
  const yc = PIEZAS[id.replace('abo_catedral_', '') as keyof typeof PIEZAS];
  registrar({
    id, nombre, tema: T, variantes: VARIANTES, huella, bloquea: true, cuadros: 8, t: 3,
    armar: (v, f, a) => {
      const { ps, g } = raiz(a);
      const r = armar(g.sub(0, -yc, 0), estado(v, f));
      bajoTierra(ps);
      if (r.resplandor) r.resplandor = { ...r.resplandor, c: [r.resplandor.c[0], r.resplandor.c[1] - yc, r.resplandor.c[2]] };
      return { piezas: ps, resplandor: r.resplandor };
    },
  });
}

// ================================================================== acompañamiento
function obj(id: string, nombre: [string, string], variantes: string[], huella: [number, number], bloquea: boolean, armar: (v: string, f: number, g: G, a: Arma) => Pieza[] | { piezas: Pieza[]; resplandor?: { c: V3; r: number; color: string } } | void, extra: { cuadros?: number; t?: number; plano?: boolean } = {}) {
  registrar({ id, nombre, tema: T, variantes, huella, bloquea, ...extra, armar: (v, f, a) => { const { ps, g } = raiz(a); const r = armar(v, f, g, a); bajoTierra(ps); return r ? (Array.isArray(r) ? r : { ...r, piezas: ps }) : ps; } });
}

// ------------------------------------------------------------------ árbol muerto en garra
/** Curva que sale de `p` con rumbo `az`, sube con `el0` y se va doblando `curl` (se cierra como un dedo). */
function curva(p: V3, az: number, el0: number, curl: number, L: number, n: number, bamb: number, a: Arma, gira = 0): V3[] {
  const pts: V3[] = [p];
  let q = p;
  for (let i = 1; i <= n; i++) {
    const s = i / n, el = el0 - curl * s * s, az2 = az + gira * s * s + Math.sin(s * 5 + bamb) * 0.25 + (a.r() - 0.5) * 0.2;
    const d: V3 = [Math.cos(az2) * Math.cos(el), Math.sin(az2) * Math.cos(el), Math.sin(el)];
    q = [q[0] + d[0] * L / n, q[1] + d[1] * L / n, q[2] + d[2] * L / n];
    pts.push(q);
  }
  return pts;
}
function arbolGarra(g: G, alto: number, gr: number, o: { tor: number; brazos: number; inclina?: number; partido?: boolean }) {
  const a = g.a, cs: Comp[] = [], nT = 7, hT = alto * (o.partido ? 0.5 : 0.46), fase = a.r() * TAU, inc = o.inclina ?? 0, puntas: V3[] = [];
  const tr: V3[] = [];
  for (let i = 0; i <= nT; i++) { const t = i / nT; tr.push([Math.sin(t * 3 + fase) * 5 * o.tor + inc * t * t * hT, Math.cos(t * 2.4 + fase) * 4 * o.tor, t * hT - (i === 0 ? 2 : 0)]); }
  const rad = (t: number) => gr * (1 - t * 0.5 + Math.max(0, 0.25 - t) * 1.6);
  for (let i = 1; i <= nT; i++) cs.push(g.hu(tr[i - 1], tr[i], rad((i - 1) / nT), rad(i / nT)));
  // vetas que se retuercen alrededor del tronco
  for (let k = 0; k < 3; k++) for (let i = 0; i < nT; i++) {
    const t0 = i / nT, t1 = (i + 1) / nT, a0 = (k * TAU) / 3 + t0 * TAU * 0.9 * o.tor + fase, a1 = (k * TAU) / 3 + t1 * TAU * 0.9 * o.tor + fase;
    cs.push(g.hu([tr[i][0] + Math.cos(a0) * rad(t0) * 0.78, tr[i][1] + Math.sin(a0) * rad(t0) * 0.78, tr[i][2]], [tr[i + 1][0] + Math.cos(a1) * rad(t1) * 0.78, tr[i + 1][1] + Math.sin(a1) * rad(t1) * 0.78, tr[i + 1][2]], gr * 0.32 * (1 - t0 * 0.4), gr * 0.32 * (1 - t1 * 0.4), { k: gr * 0.3 }));
  }
  // raíces que agarran el piso
  const nr = 5 + Math.floor(a.r() * 3);
  for (let i = 0; i < nr; i++) { const an = (i / nr) * TAU + a.r() * 0.6, Lr = gr * (2.6 + a.r() * 1.8); const m: V3 = [Math.cos(an) * Lr * 0.5, Math.sin(an) * Lr * 0.5, gr * 0.35]; cs.push(g.hu([Math.cos(an) * gr * 0.3, Math.sin(an) * gr * 0.3, gr * 1.5], m, gr * 0.55, gr * 0.32), g.hu(m, [Math.cos(an + 0.35) * Lr, Math.sin(an + 0.35) * Lr, -0.8], gr * 0.32, 0.5)); }
  const cima = tr[nT];
  if (o.partido) for (let i = 0; i < 5; i++) { const an = a.r() * TAU; cs.push(g.hu([cima[0] + Math.cos(an) * gr * 0.3, cima[1] + Math.sin(an) * gr * 0.3, cima[2] - 2], [cima[0] + Math.cos(an) * gr * 0.35, cima[1] + Math.sin(an) * gr * 0.35, cima[2] + 4 + a.r() * 10], gr * 0.25, 0.3)); }
  // brazos: suben, se abren y en la punta se cierran en dedos ganchudos
  const nb = o.brazos;
  for (let i = 0; i < nb; i++) {
    const t = o.partido ? 0.45 + a.r() * 0.5 : 0.62 + (i / nb) * 0.38, base = tr[Math.min(nT, Math.round(t * nT))];
    const az = (i / nb) * TAU + fase + a.r() * 0.5, Lb = alto * (0.3 + a.r() * 0.12), r0 = gr * 0.58;
    const br = curva(base, az, 0.5 + a.r() * 0.35, -0.45, Lb, 4, a.r() * 6, a);
    for (let k = 1; k < br.length; k++) cs.push(g.hu(br[k - 1], br[k], r0 * (1 - (k - 1) / 4 * 0.5), r0 * (1 - k / 4 * 0.5)));
    const mano = br[br.length - 1], rd = r0 * 0.48, nd = 3 + Math.floor(a.r() * 2);
    for (let d = 0; d < nd; d++) {
      const sp = d - (nd - 1) / 2, azd = az + sp * 0.62 + (a.r() - 0.5) * 0.2;
      const dedo = curva(mano, azd, 1.05 + a.r() * 0.3, 2.3 + a.r() * 0.5, Lb * (0.62 + a.r() * 0.2), 5, a.r() * 6, a, -sp * 0.9);
      for (let k = 1; k < dedo.length; k++) cs.push(g.hu(dedo[k - 1], dedo[k], rd * (1 - (k - 1) / 5 * 0.7), Math.max(0.35, rd * (1 - k / 5 * 0.85))));
      puntas.push(dedo[2]);
    }
    // ramitas secas a mitad de brazo
    const mid = br[2], ram = curva(mid, az + (a.r() < 0.5 ? 1 : -1) * 0.9, 0.9, 1.6, Lb * 0.35, 3, 1, a);
    for (let k = 1; k < ram.length; k++) cs.push(g.hu(ram[k - 1], ram[k], r0 * 0.35 * (1 - (k - 1) / 3 * 0.6), Math.max(0.35, r0 * 0.35 * (1 - k / 3 * 0.8))));
  }
  if (!o.partido) { const top = curva(cima, fase, 1.35, 1.1, alto * 0.28, 4, 2, a); for (let k = 1; k < top.length; k++) cs.push(g.hu(top[k - 1], top[k], gr * 0.45 * (1 - (k - 1) / 4 * 0.6), Math.max(0.4, gr * 0.45 * (1 - k / 4 * 0.85)))); }
  g.masa(cs, { mat: 'abo_corteza', suave: Math.max(1.2, gr * 0.3) });
  return puntas;
}
obj('abo_arbol_muerto', ['Árbol muerto en garra', 'Clawed dead tree'], ['garra', 'retorcido', 'partido', 'inclinado', 'con_cuervos'], [2, 2], true, (v, _f, g, a) => {
  monticulo(g, 16, 14, 2.2, 'mu_tierra', 4, 0, 0, 7);
  const alto = 145 + a.r() * 50, gr = 7 + a.r() * 2.5;
  const puntas = arbolGarra(g.sub(0, 0, 0, a.r() * 360), alto, gr, { tor: v === 'retorcido' ? 1.5 : 0.7, brazos: v === 'partido' ? 3 : v === 'garra' ? 5 : 4, inclina: v === 'inclinado' ? 0.5 : 0, partido: v === 'partido' });
  if (v === 'con_cuervos') { const altas = [...puntas].sort((p, q) => q[2] - p[2]); for (let i = 0; i < 3 && i < altas.length; i++) { const p = altas[i * 2 % altas.length]; cuervo(g.sub(p[0], p[1], p[2] - 0.6, a.r() * 360), elegir(a, ['posado', 'grazna'] as const), Math.floor(a.r() * 8), 8, 0.8); } }
  musgo(g.sub(0, 0, 0, 30), 3, -5, 5, gr * 0.9, 1, 12, 'abo_musgo');
  matas(g, 7, 15, 13);
});

// ------------------------------------------------------------------ lápidas viejas
type TipoLap = 'redonda' | 'ojival' | 'cruz' | 'hombros' | 'losa' | 'rota' | 'trebol';
function lapida(g: G, tipo: TipoLap, w: number, h: number, d: number, m: string) {
  const a = g.a;
  if (tipo === 'redonda') { bloque(g, 0, 0, -3, w, d, h - w / 2 + 3, { mat: m, b: 0.6, j: 0.4 }); g.cil(0, -d / 2, h - w / 2, w / 2, d, { mat: m, eje: [0, 1, 0] }); }
  else if (tipo === 'ojival') g.prisma(ojiva(w, h - w * 0.8, K, 4, -3), -d / 2, d / 2, { mat: m });
  else if (tipo === 'cruz') { bloque(g, 0, 0, -3, w * 0.34, d, h + 3, { mat: m, b: 0.5, j: 0.3 }); bloque(g, 0, 0, h * 0.62, w * 1.05, d, w * 0.32, { mat: m, b: 0.5, j: 0.3 }); }
  else if (tipo === 'hombros') { bloque(g, 0, 0, -3, w, d, h - w * 0.3 + 3, { mat: m, b: 0.6, j: 0.4 }); g.cil(0, -d / 2, h - w * 0.3, w * 0.3, d, { mat: m, eje: [0, 1, 0] }); for (const s of [-1, 1]) g.cil(s * w * 0.36, -d / 2, h - w * 0.3 - 1.6, w * 0.15, d, { mat: m, eje: [0, 1, 0] }); }
  else if (tipo === 'trebol') { bloque(g, 0, 0, -3, w * 0.8, d, h - w * 0.4 + 3, { mat: m, b: 0.5, j: 0.4 }); for (const [x, z] of [[-w * 0.28, h - w * 0.36], [w * 0.28, h - w * 0.36], [0, h - w * 0.22]] as P2[]) g.cil(x, -d / 2, z, w * 0.24, d, { mat: m, eje: [0, 1, 0] }); }
  else if (tipo === 'losa') bloque(g, 0, 0, -2, w, d * 2.6, h * 0.25, { mat: m, b: 0.8, j: 0.6 });
  else { g.prisma(ojiva(w, h * 0.6, 0.6, 4, -3), -d / 2, d / 2, { mat: m }); g.poli([[-w, -4, h * 0.35], [w, -4, h * 0.6], [-w, 4, h * 0.4], [w, 4, h * 0.65], [-w, -4, 99], [w, -4, 99], [-w, 4, 99], [w, 4, 99]], { mat: m, resta: true }); }
  if (tipo !== 'losa' && tipo !== 'cruz') letras(g, -w * 0.3, w * 0.3, d / 2, h * (tipo === 'rota' ? 0.3 : 0.62), tipo === 'rota' ? 1 : 3, m, 2.2, 1);
  if (tipo === 'redonda' || tipo === 'ojival' || tipo === 'hombros') g.cil(0, d / 2 - 0.6, h * 0.8, w * 0.12, 1.4, { mat: m, resta: true, eje: [0, 1, 0] });
  void a;
}
obj('abo_lapidas', ['Lápidas viejas inclinadas', 'Old leaning tombstones'], ['grupo', 'hilera', 'familia', 'hundidas', 'rotas'], [3, 3], true, (v, _f, g, a) => {
  tierra(g, 26, 24, 6, 'mu_tierra');
  const n = v === 'hilera' ? 4 + Math.floor(a.r() * 2) : v === 'familia' ? 5 + Math.floor(a.r() * 3) : v === 'hundidas' ? 3 + Math.floor(a.r() * 2) : 3 + Math.floor(a.r() * 3);
  const sitios: [number, number][] = [];
  const dirG = rr(a, -25, 25);
  if (v === 'hilera') for (let i = 0; i < n; i++) sitios.push([-20 + (40 * i) / (n - 1) + rr(a, -2, 2), rr(a, -4, 4)]);
  else if (v === 'familia') { sitios.push([0, -8]); for (let i = 1; i < n; i++) { const t = Math.PI * (0.1 + (0.8 * (i - 1)) / Math.max(1, n - 2)); sitios.push([Math.cos(t) * 20, -8 + Math.sin(t) * 16]); } }
  else for (let i = 0, k = 0; i < n && k < 200; k++) { const p: [number, number] = [rr(a, -19, 19), rr(a, -19, 19)]; if (sitios.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 13)) { sitios.push(p); i++; } }
  sitios.forEach(([x, y], i) => {
    const m = elegir(a, ['abo_lapida', 'abo_lapida', 'mu_piedra_fria', 'mu_granito']);
    let tipo: TipoLap = elegir(a, ['redonda', 'ojival', 'cruz', 'hombros', 'trebol'] as TipoLap[]);
    if (v === 'familia' && i === 0) tipo = 'cruz';
    if (v === 'rotas' && a.r() < 0.6) tipo = 'rota';
    if (a.r() < 0.12) tipo = 'losa';
    const w = 11 + a.r() * 6, h = (v === 'familia' && i === 0 ? 34 : 17 + a.r() * 11) * (v === 'hundidas' ? 0.75 : 1), d = 3.4 + a.r() * 1.4;
    const incl = (v === 'hundidas' ? 12 + a.r() * 12 : 4 + a.r() * 10) * (a.r() < 0.5 ? -1 : 1);
    monticulo(g, w * 0.55, 8, 1.6, 'mu_tierra', 3, x, y + 5, 3);
    const s = g.sub(x, y, v === 'hundidas' ? -3 : -0.5, dirG + rr(a, -12, 12), incl, a.r() < 0.6 ? 'x' : 'y');
    lapida(s, tipo, w, h, d, m);
    if (a.r() < 0.6) musgo(s, 3, -w / 2, w / 2, d / 2 + 0.2, 0, h * 0.5, 'abo_musgo');
    if (a.r() < 0.5) musgo(s, 3, -w / 2, w / 2, d / 2 + 0.2, h * 0.3, h * 0.9, 'abo_liquen');
    if (tipo === 'rota') cascotes(g, 3, 4, 3, m, x + 6, y + 6, 2.2);
  });
  if (v === 'rotas') bloque(g, rr(a, -10, 10), rr(a, 8, 16), 0, 12, 4, 3, { mat: 'abo_lapida', giro: a.r() * 180, incl: 80, b: 0.6, j: 0.6 });
  matas(g, 10, 22, 22);
});

// ------------------------------------------------------------------ niebla baja
/**
 * Niebla que se arrastra: jirones chatos y muy oscuros pegados al piso, en dos capas (el velo de abajo y las hebras
 * de arriba), que entran por un lado, cruzan la baldosa y se apagan al salir (el ciclo de 8 cuadros cierra solo).
 */
obj('abo_niebla', ['Niebla baja del camposanto', 'Low graveyard mist'], ['baja', 'jirones', 'espesa', 'remanso'], [5, 5], false, (v, f, g, a) => {
  const n = v === 'espesa' ? 9 : v === 'jirones' ? 6 : v === 'remanso' ? 5 : 7, dir = rr(a, -25, 25) * GR, cd = Math.cos(dir), sd = Math.sin(dir);
  for (let i = 0; i < n; i++) {
    const ph = a.r(), vel = v === 'remanso' ? 0.5 : 1, u = (ph + (f / 8) * vel) % 1, k = Math.sin(u * Math.PI);
    const Lj = rr(a, 30, 56) * (v === 'jirones' ? 0.75 : 1), r = rr(a, 7, 12) * (v === 'espesa' ? 1.25 : 1), yy = rr(a, -30, 30);
    const xx = v === 'remanso' ? (u - 0.5) * 30 : -42 + u * 84, x = xx * cd - yy * sd, y = xx * sd + yy * cd;
    const fase = a.r() * TAU, nb = v === 'espesa' ? 34 : v === 'jirones' ? 18 : 26;
    // copos chatos repartidos en el jirón: densos en el medio y ralos en el borde (una trama, no una mancha)
    for (let q = 0; q < nb; q++) {
      const t = a.r() - 0.5, w = (a.r() + a.r() - 1) * r, dens = k * (1 - 4 * t * t) * (1 - (w / r) ** 2), tira = a.r();
      const ond = Math.sin(t * 6 + fase + (f / 8) * TAU) * r * 0.25, xx2 = cd * t * Lj - sd * (w + ond), yy2 = sd * t * Lj + cd * (w + ond);
      const tam = 2 + a.r() * 3 + dens * 3, z = 0.4 + a.r() * (1.2 + dens * 3), gi = (a.r() - 0.5) * 40, ex = a.r();
      if (tira > dens * 1.25) continue;
      g.elip(x + xx2, y + yy2, z, tam * (1.4 + ex), tam, 0.5 + dens * 0.9, { mat: 'abo_niebla', giro: dir / GR + gi, tono: -0.42 + dens * 0.22 });
    }
  }
}, { cuadros: 8, t: 4, plano: true });

// ------------------------------------------------------------------ muro del camposanto con verja
obj('abo_muro_camposanto', ['Muro del camposanto con verja', 'Graveyard wall with railing'], ['x', 'x_roto', 'x_hiedra', 'x_vencido'], [5, 1], true, (v, _f, g, a) => {
  const est = v.slice(2), H = 15, Lm = 80;
  tierra(g, 44, 9, 6, 'mu_tierra');
  const hueco = est === 'roto' ? rr(a, -10, 16) : 999;
  // muro de mampostería: hilada a hilada, piedras de largo desparejo
  for (let z = 0, f = 0; z < H; f++) {
    const al = 3.6 + a.r() * 1.8;
    let x = -Lm / 2 + (f % 2) * 3;
    if (f % 2) bloque(g, -Lm / 2 + 1.5, 0, z, 3, 8, al, { mat: 'abo_sillar_grueso', b: 0.6, j: 0.7 });
    while (x < Lm / 2 - 0.5) {
      const lw = Math.min(Lm / 2 - x, 5 + a.r() * 8), cx = x + lw / 2;
      const roto = Math.abs(cx - hueco) < 11 - z * 0.2 && z > 3;
      if (!roto) bloque(g, cx, (a.r() - 0.5) * 0.6, z, lw - 0.3, 8 + (a.r() - 0.5) * 0.8, al + 0.2, { mat: 'abo_sillar_grueso', b: 0.7, j: 0.9, tono: (a.r() - 0.5) * 0.16 });
      x += lw;
    }
    z += al;
  }
  // albardilla y pilar
  for (let x = -Lm / 2; x < Lm / 2 - 0.5; x += 10) { if (Math.abs(x + 5 - hueco) < 12) continue; bloque(g, x + 5, 0, H, 10.2, 10, 2.6, { mat: 'abo_labra', b: 0.8, j: 0.5, arriba: 0.85, tono: (a.r() - 0.5) * 0.1, giro: (a.r() - 0.5) * 3 }); }
  const px = -Lm / 2 + 4;
  bloque(g, px, 0, 0, 12, 12, 4, { mat: 'abo_labra', b: 1, j: 0.8, tono: -0.05 }); bloque(g, px, 0, 4, 9.5, 9.5, 30, { mat: 'abo_sillar', b: 0.8, j: 0.5 });
  bloque(g, px, 0, 34, 12, 12, 2.6, { mat: 'abo_labra', b: 0.7, j: 0.4, tono: 0.05 });
  g.poli([[px - 5, -5, 36.6], [px + 5, -5, 36.6], [px - 5, 5, 36.6], [px + 5, 5, 36.6], [px, 0, 45]], { mat: 'abo_labra', tono: 0.06 });
  // verja de barrotes con lanza
  const mh = elegir(a, ['mu_hierro', 'mu_oxido']), x0 = px + 6, x1 = Lm / 2, hv = 22;
  const vence = (x: number) => (est === 'vencido' ? Math.max(0, (x - x0) / (x1 - x0)) * 7 : 0);
  for (let x = x0 + 1.5; x < x1; x += 3.2) {
    if (Math.abs(x - hueco) < 12) { if (a.r() < 0.3) g.palo([x, 0, H + 2.6], [x + rr(a, -6, 6), 4 + a.r() * 6, H + hv * 0.4], 0.5, { mat: mh }); continue; }
    if (a.r() < 0.06) continue;
    const yv = vence(x), zt = H + 2.6 + hv + (Math.round(x / 3.2) % 2 ? 0 : 2.4);
    g.palo([x, 0, H + 2.6], [x, yv, zt], 0.5, { mat: mh });
    punta(g, x, yv, zt, 3, 1, mh);
  }
  for (const z of [H + 6, H + 2.6 + hv - 3]) {
    if (est === 'roto') { g.palo([x0, 0, z], [hueco - 12, 0, z], 0.55, { mat: mh }); if (hueco + 12 < x1) g.palo([hueco + 12, vence(hueco + 12) * (z - H) / hv, z], [x1, vence(x1) * (z - H) / hv, z], 0.55, { mat: mh }); }
    else g.palo([x0, 0, z], [x1, vence(x1) * (z - H) / hv, z], 0.55, { mat: mh });
  }
  for (let x = x0 + 5; x < x1 - 3; x += 9.6) { if (Math.abs(x - hueco) < 13) continue; voluta(g, x - 1.4, H + 10, 1.4, 1, 1, 0.35, mh, vence(x) * 0.4); voluta(g, x + 1.4, H + 10, 1.4, 1, -1, 0.35, mh, vence(x) * 0.4); }
  if (est === 'roto') { cascotes(g, 12, 10, 8, 'abo_sillar_grueso', hueco, 10, 3); bloque(g, hueco + 3, 11, 0, 10, 8, 4, { mat: 'abo_labra', giro: 30, incl: 20, b: 0.8, j: 0.6 }); }
  musgo(g, 8, -Lm / 2, Lm / 2, 4.2, 0.5, 8, 'abo_musgo');
  for (let i = 0; i < 6; i++) g.elip(rr(a, -Lm / 2, Lm / 2), rr(a, -3, 3), H + 2.8, 3 + a.r() * 2, 2.4, 0.8, { mat: 'abo_musgo', tono: (a.r() - 0.5) * 0.1 });
  if (est === 'hiedra') { hiedra(g, [[-20, 4.6, 0], [-16, 4.6, 8], [-10, 4.8, 15], [-2, 3, 19], [6, 1, 28], [14, 1, 36]], 6, 'abo_hiedra'); hiedra(g, [[22, 4.6, 0], [26, 4.8, 9], [32, 4.6, 16], [36, 2, 22]], 5, 'abo_hiedra'); }
  matas(g, 8, 40, 7, 0, 3);
});
conVarianteY('abo_muro_camposanto');

// ------------------------------------------------------------------ farol de hierro con luz roja
/** Farol de hierro: jaula con vidrios rojos que titilan, techito con remate y aro de colgar. Cuelga hacia -z desde el origen del grupo. */
function farol(g: G, f: number, k: number, roto: boolean) {
  const fl = 0.5 + 0.5 * Math.sin((f / 8) * TAU * 2 + k) * 0.6 + 0.2 * Math.sin((f / 8) * TAU * 3 + k * 2);
  g.palo([0, 0, 0], [0, 0, -3], 0.4, { mat: 'mu_hierro' });
  g.cil(0, 0, -3.4, 0.4, 0.6, { mat: 'mu_hierro', r1: 1.2 });
  g.poli([[-3.4, -3.4, -6.4], [3.4, -3.4, -6.4], [-3.4, 3.4, -6.4], [3.4, 3.4, -6.4], [0, 0, -3]], { mat: 'mu_hierro' });
  g.caja(0, 0, -7.2, 7.4, 7.4, 1, { mat: 'mu_hierro' });
  g.caja(0, 0, -16.4, 5.4, 5.4, 9.2, { mat: 'abo_llama', tono: (roto ? -0.4 : -0.25) + fl * 0.3 });
  if (roto) { g.caja(1.6, 2.4, -14, 3, 2, 5, { mat: 'abo_llama', resta: true }); g.caja(1.4, 1.4, -14, 2.6, 2.6, 5, { mat: 'negro' }); }
  for (const [x, y] of [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]] as P2[]) g.caja(x, y, -16.8, 1, 1, 10, { mat: 'mu_hierro' });
  for (const z of [-12, -16.8]) g.caja(0, 0, z, 6.2, 6.2, 0.8, { mat: 'mu_hierro', tono: z < -14 ? 0 : -0.1 });
  g.caja(0, 0, -18, 6.4, 6.4, 1.4, { mat: 'mu_hierro' }); g.cil(0, 0, -20, 1.3, 2, { mat: 'mu_hierro', r1: 0.3 });
  return fl;
}
obj('abo_farol_rojo', ['Farol de hierro con luz roja', 'Iron lantern with red light'], ['poste', 'cayado', 'pilar', 'roto'], [1, 1], true, (v, f, g, a) => {
  tierra(g, 9, 9, 3, 'mu_tierra');
  let fl = 0.5, cz: V3 = [0, 0, 40];
  if (v === 'poste' || v === 'roto') {
    const s = g.sub(0, 0, 0, a.r() * 90, v === 'roto' ? 9 : 0, 'y');
    bloque(s, 0, 0, 0, 8, 8, 3.4, { mat: 'abo_labra', b: 1, j: 0.6, arriba: 0.85 });
    s.cil(0, 0, 3.4, 1.6, 3, { mat: 'mu_hierro', r1: 1 }); s.cil(0, 0, 6.4, 1, 40, { mat: 'mu_hierro', r1: 0.8 });
    for (const z of [9, 30]) s.cil(0, 0, z, 1.5, 1, { mat: 'mu_hierro' });
    for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU; s.palo([0, 0, 42], [Math.cos(t) * 4.6, Math.sin(t) * 4.6, 48], 0.4, { mat: 'mu_hierro' }); }
    s.cil(0, 0, 47.6, 4.8, 0.8, { mat: 'mu_hierro' });
    const l = s.sub(0, 0, 69, 0, 0); fl = farol(l.sub(0, 0, 0), f, 1, v === 'roto'); l.caja(0, 0, -21, 6, 6, 0.6, { mat: 'mu_hierro' });
    s.cil(0, 0, 46, 2.2, 2, { mat: 'mu_hierro', r1: 3 });
    cz = [0, 0, 58];
    if (v === 'roto') { for (let i = 0; i < 4; i++) g.caja(rr(a, 3, 10), rr(a, -4, 6), 0, 1.6, 1.2, 0.3, { mat: 'abo_vidrio_muerto', giro: a.r() * 90 }); }
  } else if (v === 'cayado') {
    const s = g.sub(0, 0, 0, a.r() * 60 - 30);
    bloque(s, 0, 0, 0, 8, 8, 4, { mat: 'abo_labra', b: 1, j: 0.6, arriba: 0.85 });
    s.cil(0, 0, 4, 1.4, 4, { mat: 'mu_hierro', r1: 1 }); s.cil(0, 0, 8, 1, 54, { mat: 'mu_hierro', r1: 0.8 });
    let prev: V3 = [0, 0, 61];
    for (let i = 1; i <= 8; i++) { const t = (i / 8) * Math.PI; const p: V3 = [5 - Math.cos(t) * 5, 0, 61 + Math.sin(t) * 5]; s.palo(prev, p, 0.75, { mat: 'mu_hierro' }); prev = p; }
    voluta(s, 4, 55, 2.6, 1, 1, 0.45, 'mu_hierro');
    s.esf(0, 0, 62.4, 1.5, { mat: 'mu_hierro' });
    const mece = Math.sin((f / 8) * TAU) * 7;
    fl = farol(s.sub(10, 0, 61, 0, mece, 'y'), f, 2, false);
    cz = [7, 0, 46];
  } else {
    const s = g.sub(0, 0, 0, a.r() * 90);
    bloque(s, 0, 0, 0, 13, 13, 4, { mat: 'abo_labra', b: 1.2, j: 0.8, tono: -0.05 }); bloque(s, 0, 0, 4, 10, 10, 30, { mat: 'abo_sillar', b: 0.9, j: 0.6 });
    bloque(s, 0, 0, 34, 13, 13, 3, { mat: 'abo_labra', b: 0.8, j: 0.5, tono: 0.05 });
    letras(s, -3, 3, 5, 20, 2, 'abo_sillar');
    for (const [x, y] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]] as P2[]) s.palo([x, y, 37], [x * 0.5, y * 0.5, 41], 0.5, { mat: 'mu_hierro' });
    fl = farol(s.sub(0, 0, 61, 0), f, 3, false);
    s.palo([0, 0, 37], [0, 0, 42], 1.2, { mat: 'mu_hierro' }); s.caja(0, 0, 41.6, 6, 6, 0.8, { mat: 'mu_hierro' });
    musgo(s, 4, -5, 5, 5.2, 4, 18, 'abo_musgo');
    cz = [0, 0, 50];
  }
  matas(g, 4, 9, 9);
  return { piezas: g.ps, resplandor: { c: cz, r: (v === 'roto' ? 24 : 34) + fl * 10, color: fl > 0.5 ? '#ff3a18' : '#d4200c' } };
}, { cuadros: 8, t: 3 });
