import { registrar, conVarianteY, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso as hM, bulto } from '../render';
import {
  PI, rad, add, mez, onda, entre, forma, suelo, mover, pena, piedras, prisma, viga, cuerda, cadena, calavera, huesoL, llama, farol, cadaver,
  penasco, paredRoca, recorte, semisDe, contornoOrg, paredesHueco,
} from './subterraneo';
import type { Equipo } from '../cuerpo';
import type { Dir } from '../figura';

/**
 * Minas: vías (rectas, curvas, desvíos, cruces y topes), vagonetas llenas, volcadas y rotas, puntales y vigas
 * labradas a hacha, bocas de galería apuntaladas, montacargas con poleas sobre su pozo, tornos, faroles colgados,
 * picos y palas, vetas de oro, hierro y sangre en la roca, derrumbes, escaleras y andamios, pólvora, cajones,
 * tolvas, carretillas, el horno de fundir y los mineros que no salieron. Todo cambia con la semilla.
 */

const M = MATERIALES;
M.min_carbon = { rampa: ['#050505', '#0b0b0c', '#131315', '#1c1c20', '#28282d', '#36363c', '#4a4a52'], ruido: 0.35, escala: 0.5, brillo: 0.7 };
M.min_hierro = { rampa: ['#120806', '#22100a', '#341810', '#482216', '#5e2e1c', '#743c24', '#8c4c30'], ruido: 0.5, escala: 0.45, brillo: 0.3 };
M.min_polvora = { rampa: ['#0c0c0c', '#161616', '#212120', '#2d2c2a', '#3a3936', '#484642'], ruido: 0.7, escala: 1.4 };
M.min_lona = { rampa: ['#17140f', '#272219', '#3a3225', '#4e4432', '#645740', '#7a6b50', '#908062'], ruido: 0.25, escala: 0.6 };
M.min_grava = { rampa: ['#100e0c', '#1c1916', '#2a2621', '#38332c', '#47413a', '#57504a'], ruido: 0.8, escala: 0.9 };
M.min_pintura = { rampa: ['#2a0806', '#46100a', '#661a10', '#86281a', '#a63a26'], ruido: 0.4, escala: 0.6 };

const MAD = 'sub_madera_mina', RIEL = 'sub_hierro_viejo';
type Carga = 'carbon' | 'oro' | 'hierro' | 'sangre' | 'vacia';
/** Material de la piedra de mena, el de sus pepitas y si brilla. */
const MENA: Record<string, { roca: string; pep: string; luz?: string; col?: string }> = {
  carbon: { roca: 'min_carbon', pep: 'min_carbon' },
  oro: { roca: 'sub_roca', pep: 'oro' },
  hierro: { roca: 'min_hierro', pep: 'hierro' },
  sangre: { roca: 'sub_roca', pep: 'sub_cristal_rojo', luz: 'sub_luz_roja', col: '#e0403a' },
  plata: { roca: 'sub_roca', pep: 'acero' },
};

// ------------------------------------------------------------------ vías
/** Un riel (pie ancho, alma y cabeza) entre dos puntos del piso. */
function riel(a: Arma, ps: Pieza[], p: [number, number], q: [number, number], z = 1.2, mat = RIEL) {
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]), g = (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / PI, cx = (p[0] + q[0]) / 2, cy = (p[1] + q[1]) / 2;
  ps.push(a.caja(cx, cy, z, L, 2.4, 0.5, { mat, giro: g }), a.caja(cx, cy, z + 0.5, L, 0.9, 1, { mat, giro: g }), a.caja(cx, cy, z + 1.4, L, 1.6, 0.7, { mat, giro: g, tono: 0.08 }));
}
/** Durmiente labrado a hacha, gastado según la semilla. */
function durmiente(a: Arma, ps: Pieza[], x: number, y: number, g: number, largo = 22) {
  const t = rad(g + 90 + (a.r() - 0.5) * 8), dx = Math.cos(t) * largo * 0.5, dy = Math.sin(t) * largo * 0.5;
  ps.push(viga(a, [x - dx, y - dy, 0.6], [x + dx, y + dy, 0.6 + (a.r() - 0.5) * 0.4], 3.6, 1.4, a.r() < 0.3 ? 'madera_vieja' : MAD));
}
/** Vía recta a lo largo de x de x0 a x1 (rieles a ±7.6), con durmientes cada 10 y grava. */
function viaX(a: Arma, ps: Pieza[], x0: number, x1: number, o: { faltan?: number; grava?: boolean; hundida?: boolean } = {}) {
  for (let x = x0 + 5; x < x1; x += 10) { if (a.r() < (o.faltan ?? 0)) continue; durmiente(a, ps, x + (a.r() - 0.5) * 2, 0, 0); }
  for (const l of [-1, 1]) riel(a, ps, [x0, l * 7.6], [x1, l * 7.6], o.hundida ? 0.2 : 1.2);
  if (o.grava !== false) for (let i = 0; i < Math.abs(x1 - x0) / 5; i++) ps.push(pena(a, entre(a, x0, x1), (a.r() - 0.5) * 22, 0.2, entre(a, 1, 2), entre(a, 0.8, 1.6), 0.7, { mat: 'min_grava', n: 5 }));
}
/** Vía en arco con centro (cx, cy) y radio R de a0 a a1 (radianes). */
function viaArco(a: Arma, ps: Pieza[], cx: number, cy: number, R: number, a0: number, a1: number) {
  const n = 9;
  for (let i = 0; i < 8; i++) { const t = a0 + ((i + 0.5) / 8) * (a1 - a0); durmiente(a, ps, cx + Math.cos(t) * R, cy + Math.sin(t) * R, (t * 180) / PI + 90); }
  for (const dr of [-7.6, 7.6]) for (let i = 0; i < n; i++) {
    const t0 = a0 + (i / n) * (a1 - a0), t1 = a0 + ((i + 1) / n) * (a1 - a0), r = R + dr;
    riel(a, ps, [cx + Math.cos(t0) * r, cy + Math.sin(t0) * r], [cx + Math.cos(t1) * r, cy + Math.sin(t1) * r]);
  }
}

// ------------------------------------------------------------------ vagoneta
/** Vagoneta local a lo largo de x, con ruedas sobre los rieles (a ±7.6). Devuelve las piezas sin mover. */
function vagoneta(a: Arma, carga: Carga, rota = 0): Pieza[] {
  const ps: Pieza[] = [];
  // la caja: tablas en talud con flejes de hierro en las esquinas
  const caj = (x0: number, x1: number, yb: number, yt: number, zb: number, zt: number, xt: number): V3[] => [[x0, -yb, zb], [x1, -yb, zb], [x0, yb, zb], [x1, yb, zb], [x0 - xt, -yt, zt], [x1 + xt, -yt, zt], [x0 - xt, yt, zt], [x1 + xt, yt, zt]];
  ps.push(a.poliedro(caj(-10, 10, 6.5, 8.6, 5, 19, 2.4), { mat: MAD }));
  ps.push(a.poliedro(caj(-9, 9, 5.4, 7.5, 7, 21, 2.3), { mat: MAD, resta: true }));
  if (rota) ps.push(a.poliedro([[2, 6, 9], [9, 6, 9], [3, 9, 20], [12, 9, 20], [2, 10, 9], [12, 10, 20]], { mat: MAD, resta: true }));
  for (const x of [-10.6, -3.5, 3.5, 10.6]) for (const l of [-1, 1]) if (!(rota && l === 1 && x > 0)) ps.push(a.palo([x * (x > 9 || x < -9 ? 1 : 1), l * 6.9, 5.2], [x * 1.22, l * 8.9, 19], 0.55, { mat: RIEL }));
  for (const zz of [6, 18.6]) ps.push(a.poliedro(caj(-10.5 - (zz - 5) * 0.17, 10.5 + (zz - 5) * 0.17, 6.8 + (zz - 5) * 0.15, 6.9 + (zz - 5) * 0.15, zz, zz + 1.2, 0.2), { mat: RIEL, tono: 0.05 }));
  ps.push(a.poliedro(caj(-10.5 - 2.4, 10.5 + 2.4, 6.8 + 2.1, 6.8 + 2.1, 4.6, 5.4, 0).map(([x, y, z]) => [x, y, z] as V3), { mat: RIEL }));
  // ejes y ruedas con rayos
  for (const x of [-6.5, 6.5]) {
    ps.push(a.palo([x, -9.6, 3.6], [x, 9.6, 3.6], 0.8, { mat: RIEL }));
    for (const l of [-1, 1]) {
      if (rota && l === 1 && x > 0) continue;
      ps.push(a.cilindro(x, l * 7.6 - l * 0.8, 3.6, 3.6, 1.6, { mat: RIEL, eje: [0, l, 0] }));
      ps.push(a.cilindro(x, l * 7.6 + l * 0.6, 3.6, 2.6, 0.6, { mat: RIEL, eje: [0, l, 0], tono: -0.12 }));
      ps.push(a.cilindro(x, l * 7.6 + l * 0.9, 3.6, 1, 0.6, { mat: RIEL, eje: [0, l, 0], tono: 0.1 }));
    }
  }
  // asa y paragolpes
  for (const s of [-1, 1]) ps.push(viga(a, [s * 12.6, -5, 9], [s * 12.6, 5, 9], 2, 2.4, MAD, -0.05));
  if (carga !== 'vacia') {
    const m = MENA[carga];
    for (let i = 0; i < 14; i++) ps.push(pena(a, (a.r() - 0.5) * 18, (a.r() - 0.5) * 12, 17 + a.r() * 3.5 - Math.abs((a.r() - 0.5) * 3), entre(a, 2.4, 4), entre(a, 2, 3.4), entre(a, 2, 3), { mat: m.roca, tono: (a.r() - 0.5) * 0.1 }));
    for (let i = 0; i < 8; i++) { const p: V3 = [(a.r() - 0.5) * 16, (a.r() - 0.5) * 10, 20 + a.r() * 2.5]; ps.push(carga === 'sangre' ? prisma(a, p, [(a.r() - 0.5), (a.r() - 0.5), 1], entre(a, 3, 6), 1.2, i % 2 ? m.pep : (m.luz as string)) : pena(a, p[0], p[1], p[2], 1.4, 1.2, 1.1, { mat: m.pep })); }
  }
  return ps;
}

// ------------------------------------------------------------------ herramientas y cosas
/** Pico de minero: mango y cabeza curva de dos puntas. `at` es el pie del mango, `dir` hacia la cabeza. */
function pico(a: Arma, ps: Pieza[], at: V3, dir: V3, L = 20, lado: V3 = [0, 0, 1]) {
  const l = Math.hypot(...dir), d: V3 = [dir[0] / l, dir[1] / l, dir[2] / l], top = add(at, d, L);
  ps.push(a.palo(at, top, 0.75, { mat: 'madera', r1: 0.85 }));
  const s = Math.hypot(...lado), u: V3 = [lado[0] / s, lado[1] / s, lado[2] / s];
  for (const k of [-1, 1]) { const m = add(top, u, k * 4), p = add(add(top, u, k * 8), d, -2.2); ps.push(a.palo(top, m, 1.1, { mat: 'hierro', r1: 0.9 }), a.palo(m, p, 0.9, { mat: 'hierro', r1: 0.15 })); }
  ps.push(a.esfera(...top, 1.3, { mat: 'hierro' }));
}
/** Pala: mango con su hoja. */
function pala(a: Arma, ps: Pieza[], at: V3, dir: V3, L = 22) {
  const l = Math.hypot(...dir), d: V3 = [dir[0] / l, dir[1] / l, dir[2] / l], top = add(at, d, L);
  ps.push(a.palo(at, top, 0.7, { mat: 'madera' }));
  const t: V3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u: V3 = [d[1] * t[2] - d[2] * t[1], d[2] * t[0] - d[0] * t[2], d[0] * t[1] - d[1] * t[0]];
  const ul = Math.hypot(...u), uu: V3 = [u[0] / ul, u[1] / ul, u[2] / ul], b = add(top, d, 1), e = add(top, d, 9);
  ps.push(a.poliedro([add(b, uu, 3), add(b, uu, -3), add(e, uu, 2.6), add(e, uu, -2.6), add(add(b, uu, 3), d, 0.6), add(add(e, uu, 0), d, 1.6)].map((p, i) => (i > 3 ? add(p, [0, 0, 1], 0.6) : p)), { mat: 'hierro_oxido' }));
  ps.push(a.palo(add(at, d, -3), at, 0.6, { mat: 'madera' }), a.palo(add(add(at, d, -3), uu, -1.8), add(add(at, d, -3), uu, 1.8), 0.6, { mat: 'madera' }));
}
/** Barril con duelas abombadas y aros; `tumbado` lo acuesta a lo largo de x. */
function barril(a: Arma, ps: Pieza[], x: number, y: number, z: number, r: number, h: number, o: { tumbado?: boolean; giro?: number; mat?: string; tapa?: string } = {}) {
  const b: Pieza[] = [];
  b.push(a.cilindro(0, 0, 0, r * 0.86, h * 0.5, { mat: o.mat ?? 'madera', r1: r }), a.cilindro(0, 0, h * 0.5, r, h * 0.5, { mat: o.mat ?? 'madera', r1: r * 0.86 }));
  for (const zz of [h * 0.12, h * 0.38, h * 0.62, h * 0.88]) b.push(a.cilindro(0, 0, zz - 0.6, r * (0.9 + 0.1 * Math.sin((zz / h) * PI)) + 0.25, 1.2, { mat: RIEL }));
  b.push(a.cilindro(0, 0, h - 0.4, r * 0.8, 0.5, { mat: o.tapa ?? 'madera_vieja', tono: -0.05 }));
  ps.push(...mover(b, [x, y, z + (o.tumbado ? r * 0.95 : 0)], o.giro ?? 0, o.tumbado ? 90 : 0, 'y'));
}
/** Cajón de tablas con su marco. */
function cajon(a: Arma, ps: Pieza[], x: number, y: number, z: number, w: number, d: number, h: number, giro: number, abierto = false) {
  const b: Pieza[] = [a.caja(0, 0, 0, w, d, h, { mat: 'madera' })];
  if (abierto) b.push(a.caja(0, 0, 1.2, w - 2, d - 2, h, { mat: 'madera', resta: true }));
  for (const [p, q] of [[[-w / 2, -d / 2, h], [w / 2, -d / 2, h]], [[-w / 2, d / 2, h], [w / 2, d / 2, h]], [[-w / 2, -d / 2, 0.6], [w / 2, -d / 2, 0.6]], [[-w / 2, d / 2, 0.6], [w / 2, d / 2, 0.6]], [[-w / 2, -d / 2, 0], [-w / 2, -d / 2, h]], [[w / 2, d / 2, 0], [w / 2, d / 2, h]], [[w / 2, -d / 2, 0], [w / 2, -d / 2, h]], [[-w / 2, d / 2, 0], [-w / 2, d / 2, h]]] as [V3, V3][]) b.push(viga(a, p, q, 1.4, 1.4, MAD));
  ps.push(...mover(b, [x, y, z], giro));
}
/** Puntal de mina: dos postes, el cabezal y las cuñas; `pandeo` dobla los postes, `roto` parte el cabezal. */
function marco(a: Arma, ps: Pieza[], x: number, ancho: number, alto: number, o: { pandeo?: number; roto?: boolean; refuerzo?: boolean; y?: number } = {}) {
  const y0 = o.y ?? 0, pd = o.pandeo ?? 0;
  for (const l of [-1, 1]) {
    const pie: V3 = [x + (a.r() - 0.5) * 1.5, y0 + l * ancho * 0.5, 0], top: V3 = [x + (a.r() - 0.5) * 1.5, y0 + l * (ancho * 0.5 - 1.5), alto];
    if (pd) { const mid: V3 = [x + pd * 0.4, y0 + l * (ancho * 0.5 - pd), alto * 0.5]; ps.push(viga(a, pie, mid, 5, 5, MAD), viga(a, mid, top, 5, 5, MAD)); }
    else ps.push(viga(a, pie, top, 5, 5, MAD));
    ps.push(a.poliedro([[x - 2, y0 + l * ancho * 0.5 - l * 2.4, alto - 1], [x + 2, y0 + l * ancho * 0.5 - l * 2.4, alto - 1], [x - 2, y0 + l * ancho * 0.5 - l * 2.4, alto - 7], [x - 2, y0 + l * (ancho * 0.5 - 6), alto - 1], [x + 2, y0 + l * (ancho * 0.5 - 6), alto - 1], [x + 2, y0 + l * ancho * 0.5 - l * 2.4, alto - 7]], { mat: 'madera_vieja' }));
    if (o.refuerzo) ps.push(viga(a, [x, y0 + l * (ancho * 0.5 - 2.5), alto * 0.62], [x, y0 + l * (ancho * 0.5 - 11), alto - 2], 2.6, 2.6, 'madera_vieja'));
  }
  if (o.roto) {
    ps.push(viga(a, [x, y0 - ancho * 0.5 - 3, alto + 2.6], [x + 0.5, y0 - 1, alto - 4], 5.4, 5, MAD), viga(a, [x + 0.5, y0 + 1, alto - 5], [x, y0 + ancho * 0.5 + 3, alto + 2.6], 5.4, 5, MAD));
    for (let i = 0; i < 5; i++) ps.push(pena(a, x + (a.r() - 0.5) * 10, y0 + (a.r() - 0.5) * 10, 0.6, entre(a, 2, 4), entre(a, 2, 3), entre(a, 1.5, 3), { mat: 'sub_roca' }));
  } else ps.push(viga(a, [x, y0 - ancho * 0.5 - 3, alto + 2.6], [x + (a.r() - 0.5), y0 + ancho * 0.5 + 3, alto + 2.6 + (a.r() - 0.5)], 5.4, 5, MAD));
}
/** Mena en roca: un peñasco con una franja de pepitas o cristales sobre la cara que se ve. */
function rocaVeta(a: Arma, ps: Pieza[], c: V3, r: V3, tipo: string) {
  const m = MENA[tipo];
  penasco(a, ps, c, r, { mat: tipo === 'hierro' ? 'min_hierro' : tipo === 'carbon' ? 'min_carbon' : 'sub_roca', n: 3 });
  for (let i = 0; i < 16; i++) {
    const u = i / 15, t = -0.3 + u * 2.1 + (a.r() - 0.5) * 0.3, ph = 0.05 + u * 0.55 + (a.r() - 0.5) * 0.25;
    const d: V3 = [Math.cos(t) * Math.cos(ph), Math.sin(t) * Math.cos(ph), Math.sin(ph)], p: V3 = [c[0] + d[0] * r[0] * 0.85, c[1] + d[1] * r[1] * 0.85, c[2] + d[2] * r[2] * 0.85];
    if (tipo === 'sangre') ps.push(prisma(a, p, [d[0], d[1], d[2] + 0.6], entre(a, 4, 8), entre(a, 1.2, 2), i % 3 ? m.pep : (m.luz as string)));
    else ps.push(pena(a, p[0], p[1], p[2], entre(a, 1.4, 2.6), entre(a, 1.2, 2.2), entre(a, 1, 1.8), { mat: m.pep, tono: (a.r() - 0.3) * 0.15 }));
  }
}
/** Escalera de mano entre dos puntos (largueros y peldaños). */
function escalera(a: Arma, ps: Pieza[], p: V3, q: V3, ancho = 9, rotos = 0) {
  const d: V3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(...d);
  const h: V3 = [-d[1], d[0], 0], hl = Math.hypot(h[0], h[1]) || 1, u: V3 = [h[0] / hl * ancho * 0.5, h[1] / hl * ancho * 0.5, 0];
  for (const s of [-1, 1]) ps.push(viga(a, add(p, u, s), add(q, u, s), 1.8, 1.4, MAD));
  for (let i = 1; i < L / 6; i++) { if (a.r() < rotos) continue; const c = mez(p, q, (i * 6) / L); ps.push(a.palo(add(c, u, -1), add(c, u, 1), 0.7, { mat: 'madera_vieja' })); }
}

registrar(
  {
    id: 'min_riel', nombre: ['Vía recta', 'Straight track'], tema: 'mina', variantes: ['recto', 'gastado', 'hundido'], huella: [5, 2], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4);
      viaX(a, ps, -40, 40, { faltan: v === 'gastado' ? 0.3 : fm === 3 ? 0.12 : 0, hundida: v === 'hundido' });
      if (v === 'hundido') for (let i = 0; i < 9; i++) ps.push(pena(a, entre(a, -36, 36), (a.r() - 0.5) * 20, 0.8, entre(a, 3, 7), entre(a, 3, 5), entre(a, 1.4, 2.6), { mat: a.r() < 0.5 ? 'sub_tierra' : 'sub_roca' }));
      if (v === 'gastado' || fm === 2) for (let i = 0; i < 3; i++) ps.push(pena(a, entre(a, -36, 36), entre(a, -12, 12), 0.5, entre(a, 2, 4), entre(a, 2, 3), entre(a, 1.4, 2.4), { mat: 'sub_roca' }));
      if (fm === 1) ps.push(a.palo([entre(a, -20, 20), 12, 0.6], [entre(a, -20, 20), 18, 0.6], 0.5, { mat: 'hierro' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_riel_curva', nombre: ['Vía en curva', 'Curved track'], tema: 'mina', variantes: ['n', 'e', 's', 'o'], huella: [5, 5], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      // el centro del arco en una esquina de la baldosa: la curva une las mitades de dos lados
      const [cx, cy] = ({ n: [-40, -40], e: [40, -40], s: [40, 40], o: [-40, 40] } as Record<string, [number, number]>)[v];
      // ángulos de los dos extremos: (cx, 0) visto desde el centro y (0, cy)
      const e1 = Math.atan2(0 - cy, 0), e2 = Math.atan2(0, 0 - cx);
      let d = e2 - e1; if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI;
      viaArco(a, ps, cx, cy, 40, e1, e1 + d);
      for (let i = 0; i < 10; i++) { const t = e1 + a.r() * d, r = 40 + (a.r() - 0.5) * 20; ps.push(pena(a, cx + Math.cos(t) * r, cy + Math.sin(t) * r, 0.2, entre(a, 1, 2), entre(a, 0.8, 1.6), 0.7, { mat: 'min_grava', n: 5 })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_riel_fin', nombre: ['Fin de vía con tope', 'Track end bumper'], tema: 'mina', variantes: ['tope', 'roto', 'tierra'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      viaX(a, ps, -40, 20);
      if (v !== 'tierra') {
        // el tope: dos postes con un travesaño y un tablón de choque
        for (const l of [-1, 1]) { ps.push(viga(a, [20, l * 7, 0], [20, l * 7, v === 'roto' && l === 1 ? 6 : 11], 4, 4, MAD)); ps.push(viga(a, [28, l * 7, 0], [21, l * 7, 9], 3, 3, MAD, -0.05)); }
        if (v === 'roto') ps.push(viga(a, [19, -11, 9], [24, 12, 1.5], 4, 3, MAD), viga(a, [24, 10, 0.8], [30, 18, 0.8], 3, 2, 'madera_vieja'));
        else ps.push(viga(a, [18.5, -11, 9.5], [18.5, 11, 9.5], 4, 4.5, MAD), a.caja(17.6, 0, 7, 1, 16, 5, { mat: 'cu_cuero' in MATERIALES ? 'cu_cuero' : 'cuero', tono: -0.1 }));
      }
      // montón de tierra y piedras al final
      ps.push(masa([bulto([34, 0, 0], [12, 16, 8]), bulto([30, 8, 0], [8, 8, 5])], { mat: 'sub_tierra', suave: 3 }));
      piedras(a, ps, 8, 16, 'sub_roca', 32, 0, 1.4);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_riel_desvio', nombre: ['Desvío con palanca', 'Track switch'], tema: 'mina', variantes: ['izquierda', 'derecha'], huella: [5, 5], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], s = v === 'izquierda' ? 1 : -1;
      viaX(a, ps, -40, 40, { grava: true });
      // el ramal que se abre en curva hacia un lado
      viaArco(a, ps, 0, s * 40 + s * 0, 40, -s * PI / 2, -s * PI / 2 + s * PI * 0.32);
      // la palanca con su contrapeso
      const px = -14, py = -s * 16;
      ps.push(viga(a, [px - 4, py, 0.5], [px + 4, py, 0.5], 5, 2.5, MAD), a.cilindro(px, py, 2, 1.4, 2, { mat: RIEL }));
      const t = rad(s > 0 ? 30 : -30);
      ps.push(a.palo([px, py, 3], [px + Math.sin(t) * 4, py, 15], 0.7, { mat: RIEL }), a.esfera(px + Math.sin(t) * 4, py, 15.5, 1.3, { mat: 'min_pintura' }));
      ps.push(a.palo([px, py + s * 2, 1.6], [-4, -s * 7, 1.6], 0.5, { mat: RIEL }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_riel_cruce', nombre: ['Cruce de vías', 'Track crossing'], tema: 'mina', variantes: ['cruce', 'gastado'], huella: [5, 5], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      viaX(a, ps, -40, 40, { faltan: v === 'gastado' ? 0.25 : 0 });
      const otra: Pieza[] = [];
      for (let y = -35; y < 40; y += 10) if (Math.abs(y) > 10) durmiente(a, otra, 0, y, 90);
      for (const l of [-1, 1]) { riel(a, otra, [l * 7.6, -40], [l * 7.6, -9], 1.2); riel(a, otra, [l * 7.6, 9], [l * 7.6, 40], 1.2); riel(a, otra, [l * 7.6, -6], [l * 7.6, 6], 1.2); }
      ps.push(...otra, a.caja(0, 0, 0.4, 24, 24, 0.8, { mat: 'madera_vieja', giro: 0, tono: -0.1 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_vagoneta', nombre: ['Vagoneta cargada', 'Loaded mine cart'], tema: 'mina', variantes: ['carbon', 'oro', 'hierro', 'sangre', 'vacia'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [];
      for (const l of [-1, 1]) riel(a, ps, [-22, l * 7.6], [22, l * 7.6]);
      for (let k = 0; k < 4; k++) durmiente(a, ps, -15 + k * 10, 0, 0);
      ps.push(...mover(vagoneta(a, v as Carga), [(a.r() - 0.5) * 6, 0, 1.8], (fm - 1.5) * 2));
      if (fm >= 2 && v !== 'vacia') piedras(a, ps, 4, 18, MENA[v].roca, 0, 0, 1.2);
      ps.push(suelo(a));
      if (v === 'sangre') return { piezas: ps, resplandor: { c: [0, 0, 27], r: 18, color: '#e0403a' } };
      return ps;
    },
  },
  {
    id: 'min_vagoneta_volcada', nombre: ['Vagoneta volcada', 'Overturned mine cart'], tema: 'mina', variantes: ['carbon', 'oro', 'hierro', 'sangre'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [], m = MENA[v];
      const g = -90 + fm * 30 + entre(a, -10, 10), t = rad(g + 90);
      ps.push(...mover(vagoneta(a, 'vacia', fm === 3 ? 1 : 0), [-Math.cos(t) * 14, -Math.sin(t) * 14 - 2, 9.5], g, -95));
      // la carga derramada en abanico desde la boca
      for (let i = 0; i < 28; i++) { const d = 10 + Math.sqrt(a.r()) * 22, s = (a.r() - 0.5) * 1.2; const x = Math.cos(t + s) * d, y = Math.sin(t + s) * d - 2, r = entre(a, 1.8, 3.8) * (1 - d / 50); ps.push(pena(a, x, y, r * 0.3 + Math.max(0, 5 - d * 0.3), r, r * 0.85, r * 0.7, { mat: m.roca, tono: (a.r() - 0.5) * 0.12 })); }
      for (let i = 0; i < 12; i++) { const d = 10 + Math.sqrt(a.r()) * 20, s = (a.r() - 0.5) * 1.2, p: V3 = [Math.cos(t + s) * d, Math.sin(t + s) * d - 2, 1]; ps.push(v === 'sangre' ? prisma(a, p, [(a.r() - 0.5), (a.r() - 0.5), 0.6], entre(a, 3, 6), 1.3, i % 2 ? m.pep : (m.luz as string)) : pena(a, p[0], p[1], p[2], 1.4, 1.2, 1.1, { mat: m.pep })); }
      ps.push(suelo(a));
      if (v === 'sangre') return { piezas: ps, resplandor: { c: [Math.cos(t) * 22, Math.sin(t) * 22, 3], r: 22, color: '#e0403a' } };
      return ps;
    },
  },
  {
    id: 'min_vagoneta_rota', nombre: ['Vagoneta destrozada', 'Wrecked mine cart'], tema: 'mina', variantes: ['sin_rueda', 'astillada', 'aplastada'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 3);
      if (v === 'aplastada') {
        ps.push(...mover(vagoneta(a, 'vacia', 1), [0, 0, 1], entre(a, -20, 20), 0));
        for (let i = 0; i < 8; i++) ps.push(pena(a, (a.r() - 0.5) * 14, (a.r() - 0.5) * 10, 16 + i * 2, entre(a, 5, 9), entre(a, 4, 7), entre(a, 4, 6), { mat: 'sub_roca' }));
      } else {
        // ladeada sobre el eje que perdió la rueda
        ps.push(...mover(vagoneta(a, fm === 2 ? 'carbon' : 'vacia', 1), [0, 0, 2], entre(a, -30, 30) + fm * 40, 14));
        ps.push(...mover([a.cilindro(0, 0, 0, 3.6, 1.6, { mat: RIEL }), a.cilindro(0, 0, 1.6, 1, 0.6, { mat: RIEL, tono: 0.1 })], [entre(a, 12, 18), entre(a, 6, 12), 0.2], 0, 0));
        if (v === 'astillada') for (let i = 0; i < 6; i++) { const x = entre(a, -16, 16), y = entre(a, 8, 16), t = a.r() * PI; ps.push(viga(a, [x, y, 0.6], [x + Math.cos(t) * 9, y + Math.sin(t) * 9, 0.6 + a.r()], 2.2, 0.8, MAD)); }
      }
      piedras(a, ps, 5, 22);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_puntal', nombre: ['Puntal de mina', 'Mine timber set'], tema: 'mina', variantes: ['entero', 'reforzado', 'pandeado', 'roto'], huella: [2, 4], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4);
      const ancho = entre(a, 44, 52), alto = entre(a, 56, 66);
      marco(a, ps, 0, ancho, alto, { pandeo: v === 'pandeado' ? entre(a, 3, 5) : 0, roto: v === 'roto', refuerzo: v === 'reforzado' });
      // tablas de encostillado sobre el cabezal y cuñas
      if (v !== 'roto') for (let i = 0; i < 3 + fm; i++) ps.push(viga(a, [-9 + i * 5, -ancho * 0.4 + (a.r() - 0.5) * 4, alto + 5.4], [-9 + i * 5 + (a.r() - 0.5) * 2, ancho * 0.4, alto + 5.4], 4, 1.2, 'madera_vieja'));
      if (fm % 2) for (const l of [-1, 1]) ps.push(pena(a, 0, l * ancho * 0.5, 1, 5, 4, 3, { mat: 'sub_roca' }));
      if (fm === 2) { ps.push(a.palo([0, -ancho * 0.5 + 2.4, alto * 0.7], [3.5, -ancho * 0.5 + 2.4, alto * 0.7], 0.4, { mat: 'hierro' })); farol(a, ps, [4, -ancho * 0.5 + 2.4, alto * 0.7], 0, { apagado: true }); }
      piedras(a, ps, 4, 20);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_viga_caida', nombre: ['Vigas caídas', 'Fallen beams'], tema: 'mina', variantes: ['cruzadas', 'apoyada', 'astillada'], huella: [4, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4);
      const g = a.r() * 180;
      const rot = (x: number, y: number): [number, number] => [x * Math.cos(rad(g)) - y * Math.sin(rad(g)), x * Math.sin(rad(g)) + y * Math.cos(rad(g))];
      if (v === 'apoyada') {
        // una viga cayó de punta y quedó apoyada en un poste que sigue en pie
        ps.push(viga(a, [12, -4, 0], [12, -4, 52], 5, 5, MAD));
        ps.push(viga(a, [-26, 8, 0], [12, -2, 44], 5.4, 5, MAD));
      } else {
        for (let i = 0; i < 2 + fm % 2; i++) { const [x0, y0] = rot(-26, -6 + i * 8), [x1, y1] = rot(26, 6 - i * 6); ps.push(viga(a, [x0, y0, 2.6 + i * 4.5], [x1, y1, 2.6 + (i % 2) * 5], 5.4, 5, i === 1 ? 'madera_vieja' : MAD)); }
      }
      if (v === 'astillada') for (let i = 0; i < 7; i++) { const x = entre(a, -20, 20), y = entre(a, -14, 14), t = a.r() * PI; ps.push(a.poliedro([[x, y, 0.4], [x + Math.cos(t) * 8, y + Math.sin(t) * 8, 0.6], [x + 1, y + 1.5, 0.4], [x + Math.cos(t) * 4, y + Math.sin(t) * 4, 2]], { mat: MAD, tono: 0.08 })); }
      for (let i = 0; i < 10; i++) { const r = entre(a, 2.5, 6); ps.push(pena(a, entre(a, -26, 26), entre(a, -16, 16), r * 0.4, r, r * 0.8, r * 0.7, { mat: 'sub_roca', tono: (a.r() - 0.5) * 0.12 })); }
      ps.push(a.elipsoide(0, 0, 0, 30, 20, 1, { mat: 'sub_tierra', giro: g }));
      ps.push(suelo(a));
      return ps;
    },
  },
);

/** Boca de pozo: el hueco (con lo que se ve adentro) y el brocal de troncos. Devuelve el contorno. */
function pozo(a: Arma, ps: Pieza[], R: number, D: number, brocal = true): [number, number][] {
  const cont = contornoOrg(a, R, R * entre(a, 0.85, 1), 10);
  paredesHueco(a, ps, cont, D, 'sub_roca');
  if (brocal) for (let i = 0; i < 4; i++) { const t = (i / 4) * 2 * PI + PI / 4, t2 = t + PI / 2, r = R + 3.5; ps.push(viga(a, [Math.cos(t) * r * 1.2, Math.sin(t) * r * 1.2, 1.6 + (i % 2) * 2.6], [Math.cos(t2) * r * 1.2, Math.sin(t2) * r * 1.2, 1.6 + (i % 2) * 2.6], 3.6, 3.4, MAD)); }
  return cont;
}
/** Rueda de polea con rayos, eje a lo largo de y. */
function rueda(a: Arma, ps: Pieza[], c: V3, R: number, giro = 0, mat = RIEL) {
  const n = 14;
  for (let i = 0; i < n; i++) { const t0 = (i / n) * 2 * PI + giro, t1 = ((i + 1) / n) * 2 * PI + giro; ps.push(a.palo([c[0] + Math.cos(t0) * R, c[1], c[2] + Math.sin(t0) * R], [c[0] + Math.cos(t1) * R, c[1], c[2] + Math.sin(t1) * R], 1.1, { mat })); }
  for (let i = 0; i < 6; i++) { const t = (i / 6) * 2 * PI + giro; ps.push(a.palo(c, [c[0] + Math.cos(t) * R, c[1], c[2] + Math.sin(t) * R], 0.55, { mat })); }
  ps.push(a.cilindro(c[0], c[1] - 1.5, c[2], 1.8, 3, { mat, eje: [0, 1, 0] }));
}
const MINERO = (casco: string, luz: boolean, k = 0): Equipo => ({ torso: { tipo: k === 3 ? 'cuero' : 'camisa', mat: ['cu_tela_blanca', 'cu_tela_roja', 'cu_tela_verde', 'cu_cuero'][k % 4] }, piernas: { tipo: 'pantalon', mat: ['cu_tela_azul', 'cu_cuero_negro', 'cu_tela_parda', 'cu_tela_negra'][k % 4] }, pies: { tipo: 'botas', mat: 'cu_cuero' }, manos: { tipo: 'guantes', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero' }, cabeza: { tipo: 'casco', mat: casco, mat2: luz ? 'luz_vela' : casco } });

registrar(
  {
    id: 'min_galeria', nombre: ['Boca de galería apuntalada', 'Shored mine adit'], tema: 'mina', variantes: ['abierta', 'tapiada', 'derrumbada', 'abandonada'], huella: [6, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4);
      paredRoca(a, ps, [[-50, -8], [50, -8 + (a.r() - 0.5) * 6]], entre(a, 96, 116), 16, fm % 2 ? 'sub_roca' : 'sub_roca_humeda');
      for (const l of [-1, 1]) for (let i = 0; i < 2; i++) penasco(a, ps, [l * entre(a, 30, 36), 8, 12 + i * 22], [10, 9, 12], { mat: 'sub_roca', n: 1 });
      // la boca: se cava la roca y adentro hay oscuridad
      ps.push(a.caja(0, 6, 0, 34, 40, 54, { mat: 'sub_roca', resta: true }));
      ps.push(a.caja(0, -16, 0, 40, 4, 60, { mat: 'negro' }), a.caja(0, -4, -0.5, 30, 20, 0.6, { mat: 'sub_tierra', tono: -0.2 }));
      // el marco de entrada y otro adentro
      const fr: Pieza[] = [];
      marco(a, fr, 0, 36, 50, { roto: v === 'abandonada' && fm % 2 === 0, pandeo: v === 'abandonada' ? 2 : 0 });
      marco(a, fr, -12, 34, 48, {});
      ps.push(...mover(fr, [0, 10, 0], 90));
      let luz: { c: V3; r: number; color: string } | undefined;
      if (v === 'abierta') {
        const vias: Pieza[] = []; viaX(a, vias, -8, 40); ps.push(...mover(vias, [0, 0, 0], 90));
        ps.push(a.palo([14, 12, 46], [14, 16, 46], 0.5, { mat: 'hierro' }));
        luz = { c: farol(a, ps, [14, 16, 46], 0), r: 40, color: '#ffb050' };
      } else if (v === 'tapiada') {
        for (let i = 0; i < 5; i++) ps.push(viga(a, [-17, 11.5, 6 + i * 9 + (a.r() - 0.5) * 3], [17, 11.5, 6 + i * 9 + (a.r() - 0.5) * 3], 6, 1.4, i % 2 ? 'madera_vieja' : MAD));
        ps.push(viga(a, [-17, 13, 4], [17, 13, 44], 4.5, 1.4, MAD), viga(a, [17, 13, 4], [-17, 13, 44], 4.5, 1.4, MAD));
        calavera(a, ps, 0, 14, 22, 1, 90);
        ps.push(a.caja(0, 14, 34, 14, 0.6, 6, { mat: 'min_pintura', tono: -0.1 }));
      } else if (v === 'derrumbada') {
        for (let i = 0; i < 18; i++) { const r = entre(a, 4, 9); ps.push(pena(a, entre(a, -16, 16), entre(a, 4, 22), r * 0.5 + Math.max(0, 30 - i * 2) * a.r(), r, r * 0.8, r * 0.8, { mat: 'sub_roca', tono: (a.r() - 0.5) * 0.1 })); }
        ps.push(viga(a, [-20, 18, 2], [14, 14, 30], 5, 5, MAD));
      } else {
        // abandonada: telarañas en el marco y huesos
        for (let i = 0; i < 6; i++) ps.push(a.palo([entre(a, -18, -10), 11, entre(a, 36, 50)], [entre(a, -14, -4), 11, entre(a, 44, 52)], 0.35, { mat: 'sub_telarana' }));
        calavera(a, ps, 6, 18, 0, 0.9, 60); huesoL(a, ps, [-6, 16, 1.1], [2, 22, 1.1], 1);
      }
      piedras(a, ps, 6, 34, 'sub_roca', 0, 20);
      ps.push(suelo(a));
      return luz ? { piezas: ps, resplandor: luz } : ps;
    },
  },
  {
    id: 'min_montacargas', nombre: ['Montacargas con polea', 'Mine hoist headframe'], tema: 'mina', variantes: ['arriba', 'abajo', 'roto'], huella: [5, 5], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 3), H = entre(a, 72, 86);
      const cont = pozo(a, ps, 15, 140, false);
      // castillete: cuatro patas, travesaños, riostras y la rueda arriba
      const C = 19;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(viga(a, [sx * (C + 4), sy * (C + 4), 0], [sx * 7, sy * C * 0.6, H], 5, 5, MAD));
      for (const z of [H * 0.45, H - 2]) { const k = 1 - (z / H) * 0.5; for (const sy of [-1, 1]) ps.push(viga(a, [-(C + 4) * k - 2, sy * (C + 4) * (1 - (z / H) * 0.4), z], [(C + 4) * k + 2, sy * (C + 4) * (1 - (z / H) * 0.4), z], 4, 4, MAD)); for (const sx of [-1, 1]) ps.push(viga(a, [sx * (C + 4) * k, -(C + 4) * (1 - (z / H) * 0.4), z], [sx * (C + 4) * k, (C + 4) * (1 - (z / H) * 0.4), z], 4, 4, MAD)); }
      for (const sy of [-1, 1]) ps.push(viga(a, [-(C + 4), sy * (C + 4), 2], [(C + 4) * 0.55, sy * (C + 4) * 0.82, H * 0.45], 2.6, 2.6, 'madera_vieja'));
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) ps.push(viga(a, [sx * (C + 6), -(C + 6) + i * 2, 0], [sx * (C + 6), (C + 6) - i * 2, 0], 4, 4, 'madera_vieja'));
      const top: V3 = [0, 0, H + 8];
      ps.push(viga(a, [-6, -10, H + 2], [-6, 10, H + 2], 4, 4, MAD), viga(a, [6, -10, H + 2], [6, 10, H + 2], 4, 4, MAD));
      rueda(a, ps, top, 9, fm * 0.4);
      // el cable que baja a la jaula y el que va al torno
      const zj = v === 'abajo' ? -46 : 0;
      ps.push(a.palo([9, 0, H + 8], [9, 0, v === 'roto' ? H - 20 : zj + 30], 0.5, { mat: RIEL }));
      ps.push(a.palo([-9, 0, H + 8], [-34, 6, 10], 0.5, { mat: RIEL }));
      ps.push(viga(a, [-38, 0, 6], [-38, 12, 6], 6, 6, MAD), a.cilindro(-36, 6, 10, 5, 0.5, { mat: RIEL, eje: [1, 0, 0] }), a.cilindro(-40, -2, 4, 4, 12, { mat: MAD, eje: [0, 1, 0] }));
      ps.push(a.palo([-40, 10, 10], [-40, 14, 14], 0.6, { mat: RIEL }), a.palo([-40, 14, 14], [-36, 14, 14], 0.6, { mat: 'madera' }));
      if (v === 'roto') { ps.push(a.palo([9, 0, H - 20], [12, 3, H - 26], 0.3, { mat: RIEL }), a.palo([9, 0, H - 20], [6, -2, H - 25], 0.3, { mat: RIEL })); }
      else {
        // la jaula de vigas y barrotes
        const j: Pieza[] = [];
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) j.push(viga(a, [sx * 8, sy * 8, 0], [sx * 8, sy * 8, 26], 2.4, 2.4, MAD));
        for (const z of [0.6, 26]) { for (const sy of [-1, 1]) j.push(viga(a, [-9, sy * 8, z], [9, sy * 8, z], 2.4, 2, MAD)); for (const sx of [-1, 1]) j.push(viga(a, [sx * 8, -9, z], [sx * 8, 9, z], 2.4, 2, MAD)); }
        j.push(a.caja(0, 0, 0, 17, 17, 1.2, { mat: 'madera_vieja' }));
        for (let i = -1; i <= 1; i++) { j.push(a.palo([i * 4, 8, 1], [i * 4, 8, 26], 0.5, { mat: RIEL }), a.palo([8, i * 4, 1], [8, i * 4, 26], 0.5, { mat: RIEL })); }
        j.push(a.palo([0, 0, 26], [9, 0, 30], 0.5, { mat: RIEL }));
        ps.push(...mover(j, [0, 0, zj], 0));
      }
      ps.push(...recorte(a, semisDe(cont)));
      return ps;
    },
  },
  {
    id: 'min_torno', nombre: ['Torno sobre pozo', 'Windlass over a shaft'], tema: 'mina', variantes: ['cubo_arriba', 'cubo_abajo', 'sin_soga'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const cont = pozo(a, ps, entre(a, 9, 12), 110);
      for (const sx of [-1, 1]) { ps.push(viga(a, [sx * 18, -5, 0], [sx * 16, 0, 22], 3, 3, MAD), viga(a, [sx * 18, 5, 0], [sx * 16, 0, 22], 3, 3, MAD)); }
      ps.push(a.cilindro(-17, 0, 22, 3, 34, { mat: 'madera_vieja', eje: [1, 0, 0] }));
      ps.push(a.palo([17, 0, 22], [20, 0, 22], 0.8, { mat: RIEL }), a.palo([20, 0, 22], [20, 0, 15], 0.8, { mat: RIEL }), a.palo([20, 0, 15], [23, 0, 15], 0.9, { mat: 'madera' }));
      for (let i = 0; i < 5; i++) ps.push(a.cilindro(-6 + i * 2.4, 0, 22, 3.6, 1.2, { mat: 'sub_cuerda', eje: [1, 0, 0] }));
      if (v !== 'sin_soga') {
        const zc = v === 'cubo_abajo' ? -40 : 6;
        ps.push(a.palo([0, 3, 21], [0, 1, zc + 9], 0.5, { mat: 'sub_cuerda' }));
        ps.push(a.cilindro(0, 1, zc, 3.4, 6.5, { mat: MAD, r1: 4 }), a.cilindro(0, 1, zc + 1, 3, 6, { mat: MAD, resta: true }), a.cilindro(0, 1, zc + 1.6, 2.8, 4, { mat: 'min_carbon' }));
        ps.push(a.palo([-4, 1, zc + 6.4], [0, 1, zc + 9.5], 0.3, { mat: RIEL }), a.palo([4, 1, zc + 6.4], [0, 1, zc + 9.5], 0.3, { mat: RIEL }));
      }
      piedras(a, ps, 5, 24);
      ps.push(...recorte(a, semisDe(cont)));
      return ps;
    },
  },
  {
    id: 'min_polea', nombre: ['Polea con gancho', 'Pulley gantry'], tema: 'mina', variantes: ['gancho', 'cajon', 'cubo'], huella: [2, 4], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 3), H = entre(a, 60, 70);
      marco(a, ps, 0, 46, H, { refuerzo: fm === 1 });
      const yp = entre(a, -8, 8), top: V3 = [0, yp, H - 1];
      // el motón: dos cachetes de madera, la roldana y la cadena
      ps.push(a.palo(top, [0, yp, H - 6], 0.5, { mat: RIEL }));
      ps.push(viga(a, [-1.6, yp, H - 6], [-1.6, yp, H - 14], 4, 1.2, MAD), viga(a, [1.6, yp, H - 6], [1.6, yp, H - 14], 4, 1.2, MAD), a.cilindro(-1, yp, H - 10, 2.8, 2, { mat: RIEL, eje: [1, 0, 0] }));
      const fin = v === 'gancho' ? H * 0.35 : v === 'cajon' ? 24 : 18;
      cadena(a, ps, [0.5, yp + 2.8, H - 10], [0.5, yp + 2.8, fin], 2.6, 0.35);
      cadena(a, ps, [0.5, yp - 2.8, H - 10], [0.5, yp - 10, 1], 2.6, 0.35, { comba: 2 });
      if (v === 'gancho') ps.push(a.palo([0.5, yp + 2.8, fin], [0.5, yp + 2.8, fin - 3], 0.7, { mat: RIEL }), a.palo([0.5, yp + 2.8, fin - 3], [0.5, yp + 5.5, fin - 5], 0.7, { mat: RIEL }), a.palo([0.5, yp + 5.5, fin - 5], [0.5, yp + 6, fin - 2], 0.6, { mat: RIEL, r1: 0.2 }));
      else if (v === 'cajon') { for (const s of [-1, 1]) ps.push(a.palo([0.5, yp + 2.8, fin], [s * 5, yp + 2.8, 15], 0.4, { mat: 'sub_cuerda' })); cajon(a, ps, 0, yp + 2.8, 4, 12, 10, 10, entre(a, -20, 20)); }
      else { ps.push(a.cilindro(0.5, yp + 2.8, fin - 9, 3.4, 7, { mat: MAD, r1: 4 }), a.cilindro(0.5, yp + 2.8, fin - 8, 3, 7, { mat: MAD, resta: true }), a.palo([-3.5, yp + 2.8, fin - 2], [0.5, yp + 2.8, fin], 0.3, { mat: RIEL }), a.palo([4.5, yp + 2.8, fin - 2], [0.5, yp + 2.8, fin], 0.3, { mat: RIEL })); }
      piedras(a, ps, 4, 20);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_linterna', nombre: ['Farol de mina', 'Mine lantern post'], tema: 'mina', variantes: ['poste', 'doble', 'roca', 'apagada'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4);
      const H = entre(a, 40, 50), lean = (a.r() - 0.5) * 3;
      if (v === 'roca') penasco(a, ps, [-4, -4, 18], [10, 9, 20], { mat: 'sub_roca', n: 2 });
      else { ps.push(viga(a, [0, 0, 0], [lean, 0, H], 4, 4, MAD)); for (let i = 0; i < 3; i++) { const t = (i / 3) * 2 * PI + a.r(); ps.push(pena(a, Math.cos(t) * 4, Math.sin(t) * 4, 1, 3, 2.5, 2.5, { mat: 'sub_roca' })); } }
      const brazo = (s: number, z: number): V3 => { const x0 = v === 'roca' ? 2 : lean, end: V3 = [x0 + s * (fm % 2 ? 7 : 9), v === 'roca' ? 4 : 0, z]; ps.push(viga(a, [x0, v === 'roca' ? 2 : 0, z], end, 2, 2, MAD), viga(a, [x0, 0, z - 6], [x0 + s * 4, v === 'roca' ? 3 : 0, z - 0.5], 1.5, 1.5, 'madera_vieja')); ps.push(a.palo(end, [end[0], end[1], end[2] - 3], 0.4, { mat: RIEL })); return [end[0], end[1], end[2] - 3]; };
      const z1 = v === 'roca' ? 30 : H - 4;
      const c = farol(a, ps, brazo(1, z1), f, { apagado: v === 'apagada' });
      if (v === 'doble') farol(a, ps, brazo(-1, z1 - 2), f);
      ps.push(suelo(a));
      if (v === 'apagada') return ps;
      return { piezas: ps, resplandor: { c, r: 40, color: '#ffb050' } };
    },
  },
  {
    id: 'min_linternas_cuerda', nombre: ['Faroles en una cuerda', 'Lanterns on a rope'], tema: 'mina', variantes: ['tres', 'caida'], cuadros: 6, t: 3, huella: [5, 1], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], H = entre(a, 48, 56), sag = entre(a, 6, 10);
      for (const s of [-1, 1]) ps.push(viga(a, [s * 34, 0, 0], [s * 33, 0, H], 3.6, 3.6, MAD));
      const p: V3 = [-33, 0, H - 2], q: V3 = [33, 0, H - 2];
      cuerda(a, ps, p, q, 0.45, sag, 12);
      let c: V3 = [0, 0, H];
      for (let i = 0; i < 3; i++) {
        const u = 0.25 + i * 0.25, at: V3 = [p[0] + (q[0] - p[0]) * u, 0, p[2] - Math.sin(u * PI) * sag];
        if (v === 'caida' && i === 2) { ps.push(...mover([a.cilindro(0, 0, 0, 3, 7, { mat: RIEL }), a.cilindro(0, 0, 0.5, 2.4, 6, { mat: 'vidrio', tono: -0.2 })], [at[0] + 4, 8, 3], 30, 90)); for (let k = 0; k < 4; k++) ps.push(a.caja(at[0] + entre(a, 0, 10), entre(a, 4, 14), 0.1, 1.4, 1, 0.3, { mat: 'vidrio', giro: a.r() * 180 })); continue; }
        ps.push(a.palo(at, [at[0], 0, at[2] - 2], 0.3, { mat: RIEL }));
        c = farol(a, ps, [at[0], 0, at[2] - 2], f + i * 2, { s: 0.85 });
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, c[2]], r: 46, color: '#ffb050' } };
    },
  },
  {
    id: 'min_herramientas', nombre: ['Picos y palas', 'Picks and shovels'], tema: 'mina', variantes: ['apoyadas', 'tiradas', 'soporte'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4);
      if (v === 'apoyadas') {
        penasco(a, ps, [-6, -8, 12], [12, 9, 14], { mat: 'sub_roca', n: 2 });
        pico(a, ps, [6, 8, 0], [-0.3, -0.5, 1], 22, [1, -1, 0]);
        pala(a, ps, [10, 2, 0], [-0.25, -0.35, 1], 20);
        if (fm % 2) pico(a, ps, [-4, 10, 0], [0.1, -0.6, 1], 20, [1, 0, 0]);
      } else if (v === 'tiradas') {
        for (let i = 0; i < 2 + fm % 2; i++) { const t = a.r() * 2 * PI, x = entre(a, -10, 10), y = entre(a, -10, 10); pico(a, ps, [x, y, 1], [Math.cos(t), Math.sin(t), 0.05], 20, [Math.sin(t), -Math.cos(t), 0.2]); }
        const t = a.r() * 2 * PI; pala(a, ps, [entre(a, -8, 8), entre(a, -8, 8), 0.8], [Math.cos(t), Math.sin(t), 0.03], 20);
      } else {
        // caballete de madera con las herramientas colgadas
        for (const s of [-1, 1]) { ps.push(viga(a, [s * 14, -3, 0], [s * 14, 0, 26], 2.6, 2.6, MAD), viga(a, [s * 14, 4, 0], [s * 14, 0, 26], 2.6, 2.6, MAD)); }
        ps.push(viga(a, [-16, 0, 25], [16, 0, 25], 3, 3, MAD), viga(a, [-15, 2, 8], [15, 2, 8], 2.4, 2, 'madera_vieja'));
        for (let i = 0; i < 4; i++) { const x = -10 + i * 6.5; if (i % 2 || fm === 3) pala(a, ps, [x, 3.5, 2], [0, -0.12, 1], 22); else pico(a, ps, [x, 3.5, 2], [0, -0.1, 1], 22, [1, 0, 0]); }
      }
      piedras(a, ps, 4, 20);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_pico_clavado', nombre: ['Pico clavado en la mena', 'Pick stuck in ore'], tema: 'mina', variantes: ['oro', 'hierro', 'sangre', 'carbon'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], R = entre(a, 14, 18);
      rocaVeta(a, ps, [0, 0, R * 0.55], [R, R * 0.85, R * 0.75], v);
      const t = entre(a, 0.2, 1.3);
      pico(a, ps, [Math.cos(t) * (R + 16), Math.sin(t) * (R + 16), 6], [-Math.cos(t), -Math.sin(t), 0.55], 20, [0, 0, 1]);
      for (let i = 0; i < 7; i++) ps.push(pena(a, Math.cos(t) * (R + 2) + (a.r() - 0.5) * 10, Math.sin(t) * (R + 2) + (a.r() - 0.5) * 10, 0.6, entre(a, 1.2, 2.4), entre(a, 1, 2), 1, { mat: i % 3 ? 'sub_roca' : MENA[v].pep }));
      ps.push(suelo(a));
      if (v === 'sangre') return { piezas: ps, resplandor: { c: [R * 0.6, R * 0.4, R * 0.8], r: 30, color: '#e0403a' } };
      return ps;
    },
  },
  {
    id: 'min_veta', nombre: ['Roca con veta', 'Ore boulder'], tema: 'mina', variantes: ['oro', 'hierro', 'sangre', 'plata', 'carbon'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4), R = entre(a, 18, 26) * (fm === 3 ? 0.75 : 1);
      rocaVeta(a, ps, [0, 0, R * 0.55], [R, R * entre(a, 0.7, 0.9), R * entre(a, 0.7, 1)], v);
      if (fm === 3) rocaVeta(a, ps, [R * 0.9, R * 0.6, R * 0.35], [R * 0.6, R * 0.5, R * 0.5], v);
      if (fm >= 1) for (let i = 0; i < 6; i++) { const t = a.r() * 2 * PI; ps.push(pena(a, Math.cos(t) * (R + 6), Math.sin(t) * (R + 6), 0.6, entre(a, 1.4, 3), entre(a, 1.2, 2.4), entre(a, 1, 2), { mat: a.r() < 0.4 ? MENA[v].pep : 'sub_roca' })); }
      ps.push(suelo(a));
      if (v === 'sangre') return { piezas: ps, resplandor: { c: [R * 0.6, R * 0.4, R * 0.8], r: 36, color: '#e0403a' } };
      return ps;
    },
  },
  {
    id: 'min_pared_veta', nombre: ['Pared con veta', 'Ore vein wall'], tema: 'mina', variantes: ['oro', 'hierro', 'sangre'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], m = MENA[v], H = entre(a, 84, 104), fm = forma(a, 3);
      paredRoca(a, ps, [[-40, -4], [40, -4]], H, 13, v === 'hierro' ? 'min_hierro' : 'sub_roca');
      // la veta corre en diagonal por la cara que mira a la cámara
      const z0 = entre(a, 6, 24), z1 = z0 + entre(a, 30, 50) * (fm === 2 ? -0.4 : 1);
      for (let i = 0; i < 30; i++) {
        const u = i / 29, x = -36 + u * 72 + (a.r() - 0.5) * 4, z = z0 + (z1 - z0) * u + Math.sin(u * 7 + fm) * 5 + (a.r() - 0.5) * 6, y = 9 - Math.abs(z - H * 0.4) * 0.04;
        if (v === 'sangre') ps.push(prisma(a, [x, y, z], [(a.r() - 0.5) * 0.6, 1, (a.r() - 0.3) * 0.8], entre(a, 3, 7), entre(a, 1, 1.8), i % 3 ? m.pep : (m.luz as string)));
        else ps.push(pena(a, x, y + 1, z, entre(a, 1.6, 3), 1.2, entre(a, 1.2, 2.2), { mat: m.pep, tono: (a.r() - 0.3) * 0.15 }));
      }
      for (let i = 0; i < 5; i++) ps.push(pena(a, entre(a, -30, 30), entre(a, 12, 20), 0.6, entre(a, 1.4, 3), entre(a, 1.2, 2.5), 1.2, { mat: a.r() < 0.5 ? m.pep : 'sub_roca' }));
      ps.push(suelo(a));
      if (v === 'sangre') return { piezas: ps, resplandor: { c: [0, 16, (z0 + z1) / 2], r: 50, color: '#e0403a' } };
      return ps;
    },
  },
  {
    id: 'min_derrumbe', nombre: ['Derrumbe', 'Cave-in'], tema: 'mina', variantes: ['pequeno', 'grande', 'aplastado'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4), k = v === 'pequeno' ? 0.65 : 1;
      const Hc = 20 * k, Rc = 28 * k, alt = (d: number) => Hc * 0.6 * Math.max(0, 1 - (d / Rc) ** 2);
      ps.push(masa([bulto([-4, -4, 0], [Rc, Rc * 0.9, Hc * 0.6])], { mat: 'sub_tierra', suave: 3 }));
      for (let i = 0; i < Math.round(52 * k); i++) { const t = a.r() * 2 * PI, d = Math.sqrt(a.r()) * Rc * 1.1, r = entre(a, 3, 8) * (1 - d / (Rc * 2)) * (k + 0.25); ps.push(pena(a, Math.cos(t) * d - 4, Math.sin(t) * d - 4, alt(d) + r * 0.2, r, r * 0.85, r * 0.75, { mat: a.r() < 0.2 ? 'sub_roca_humeda' : 'sub_roca', tono: (a.r() - 0.5) * 0.12 })); }
      for (let i = 0; i < 2 + fm % 2; i++) { const t = a.r() * PI; ps.push(viga(a, [Math.cos(t) * 26 * k, Math.sin(t) * 22 * k, 2], [-Math.cos(t) * 10 * k, -Math.sin(t) * 10 * k, 22 * k], 5, 5, MAD)); }
      if (v === 'aplastado') {
        // las piernas de un minero asoman bajo las piedras
        for (const s of [-1, 1]) ps.push(masa([hM([14 + s * 2, 18, 3], [22 + s * 3, 26, 2.2], 2.6, 2.2, { mat: 'cu_tela_parda' }), bulto([23 + s * 3, 27.5, 2.4], [3.4, 2.2, 2.4], { mat: 'cu_cuero', giro: 45 })], { mat: 'cu_tela_parda', suave: 1 }));
        ps.push(a.elipsoide(20, 26, 0, 7, 4, 0.7, { mat: 'sangre', giro: 30 }));
        pico(a, ps, [28, 10, 1], [-0.4, 1, 0.05], 20, [1, 0.3, 0.2]);
      }
      piedras(a, ps, 8, 36 * k, 'sub_roca', 0, 0, 1.2);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_escalera', nombre: ['Escalera de madera', 'Wooden ladder'], tema: 'mina', variantes: ['apoyada', 'pozo', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 3);
      if (v === 'apoyada') {
        const H = entre(a, 44, 60);
        paredRoca(a, ps, [[-24, -12], [24, -12]], H, 10, fm % 2 ? 'sub_roca' : 'sub_roca_humeda', 12);
        escalera(a, ps, [entre(a, -4, 4), 10, 0], [entre(a, -4, 4), -2, H + 6], 9, 0.06);
      } else if (v === 'pozo') {
        const cont = pozo(a, ps, entre(a, 10, 13), 110, fm !== 2);
        escalera(a, ps, [-2, -4, -80], [0, -6, 14], 8);
        ps.push(...recorte(a, semisDe(cont)));
        return ps;
      } else {
        const t = a.r() * PI;
        escalera(a, ps, [Math.cos(t) * -18, Math.sin(t) * -18, 1], [Math.cos(t) * 8, Math.sin(t) * 8, 1.2], 9, 0.3);
        ps.push(viga(a, [Math.cos(t) * 12 + 4, Math.sin(t) * 12 + 6, 1], [Math.cos(t) * 26 + 6, Math.sin(t) * 26 + 4, 1.4], 1.8, 1.4, MAD));
        for (let i = 0; i < 3; i++) ps.push(a.palo([entre(a, -14, 14), entre(a, -14, 14), 0.7], [entre(a, -14, 14), entre(a, -14, 14), 0.7], 0.7, { mat: 'madera_vieja' }));
      }
      piedras(a, ps, 4, 20);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_andamio', nombre: ['Andamio contra la roca', 'Scaffold against the rock'], tema: 'mina', variantes: ['bajo', 'alto'], huella: [4, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], H = v === 'alto' ? entre(a, 44, 52) : entre(a, 24, 30), fm = forma(a, 3);
      paredRoca(a, ps, [[-36, -18], [36, -18]], H + 50, 12, 'sub_roca');
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(viga(a, [sx * 22, sy * 8 - 2, 0], [sx * 22 + (a.r() - 0.5), sy * 8 - 2, H + (sy < 0 ? 14 : 10)], 3.4, 3.4, MAD));
      for (const sy of [-1, 1]) { ps.push(viga(a, [-24, sy * 8 - 2, H - 1], [24, sy * 8 - 2, H - 1], 3, 3, MAD)); ps.push(viga(a, [-22, sy * 8 - 2, 2], [22, sy * 8 - 2, H - 3], 2, 2, 'madera_vieja')); }
      for (const sx of [-1, 1]) ps.push(viga(a, [sx * 22, -11, H - 1], [sx * 22, 7, H - 1], 3, 3, MAD));
      for (let i = 0; i < 9; i++) { if (fm === 2 && i === 6) continue; ps.push(viga(a, [-22 + i * 5.5, -11, H + 1], [-22 + i * 5.5 + (a.r() - 0.5), 7, H + 1 + (a.r() - 0.5) * 0.5], 5, 1.2, i % 3 ? MAD : 'madera_vieja')); }
      ps.push(viga(a, [-24, 7, H + 9], [24, 7, H + 9], 2, 2, 'madera_vieja'));
      escalera(a, ps, [30, 14, 0], [24, 6, H + 8], 8);
      barril(a, ps, -14, -4, H + 1.6, 4, 8, { tumbado: false, mat: MAD });
      pico(a, ps, [8, 2, H + 2], [-1, -0.2, 0.05], 18, [0, 0.4, 1]);
      ps.push(suelo(a));
      return ps;
    },
  },
);

registrar(
  {
    id: 'min_polvora', nombre: ['Barriles de pólvora', 'Gunpowder kegs'], tema: 'mina', variantes: ['uno', 'pila', 'abierto', 'mecha'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4);
      const marca = (x: number, y: number, z: number, r: number) => ps.push(a.caja(x + r * 0.62, y + r * 0.62, z, 1, r * 0.9, 2.4, { mat: 'min_pintura', giro: 45 }));
      if (v === 'pila') {
        barril(a, ps, -6, -5, 0, 5.5, 12, { giro: a.r() * 90 }); barril(a, ps, 6, -4, 0, 5.5, 12, { giro: a.r() * 90 }); barril(a, ps, 0, 6, 0, 5.5, 12, { giro: a.r() * 90 });
        barril(a, ps, 0, -1, 12, 5.2, 11.5, { giro: a.r() * 90 });
        marca(0, 6, 5, 5.5); marca(0, -1, 17, 5.2);
        if (fm % 2) barril(a, ps, 14, 10, 0, 5.4, 12, { tumbado: true, giro: entre(a, 0, 90) });
      } else {
        barril(a, ps, 0, 0, 0, 6, 13, { tumbado: v === 'abierto', giro: v === 'abierto' ? entre(a, 20, 70) : 0, tapa: v === 'abierto' ? 'min_polvora' : undefined });
        if (v !== 'abierto') marca(0, 0, 5.5, 6);
        if (fm >= 2 && v === 'uno') barril(a, ps, 11, -6, 0, 4.6, 10, { giro: 30 });
      }
      if (v === 'abierto') {
        // reguero de pólvora que sale del barril
        for (let i = 0; i < 14; i++) { const u = i / 13, x = 10 + u * 18 + Math.sin(u * 5) * 3, y = 6 + u * 10; ps.push(a.elipsoide(x, y, 0, entre(a, 1.4, 3) * (1 - u * 0.5), entre(a, 1, 2.2), 0.6, { mat: 'min_polvora', giro: a.r() * 180 })); }
        ps.push(a.elipsoide(9, 5, 0, 6, 4, 1.4, { mat: 'min_polvora' }));
      }
      if (v === 'mecha') {
        // la mecha encendida: una chispa que corre hacia el barril
        const pts: V3[] = [[5, 4, 6], [10, 8, 1], [16, 10, 0.6], [22, 6, 0.6], [26, 12, 0.6]];
        for (let i = 0; i < pts.length - 1; i++) ps.push(a.palo(pts[i], pts[i + 1], 0.45, { mat: 'sub_cuerda', r1: 0.45 }));
        const u = 1 - (f % 6) / 6 * 0.3, k = Math.floor(u * (pts.length - 1)), c = mez(pts[Math.min(k, pts.length - 2)], pts[Math.min(k + 1, pts.length - 1)], u * (pts.length - 1) - k);
        ps.push(a.esfera(...c, 1.3, { mat: 'fuego', tono: 0.2 }));
        for (let i = 0; i < 4; i++) { const t = a.r() * 2 * PI + f; ps.push(a.esfera(c[0] + Math.cos(t) * 2.2, c[1] + Math.sin(t) * 2.2, c[2] + entre(a, 1, 3), 0.4, { mat: 'fuego' })); }
        ps.push(suelo(a));
        return { piezas: ps, resplandor: { c, r: 18, color: '#ffa040' } };
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_cajones', nombre: ['Cajones de la mina', 'Mine crates'], tema: 'mina', variantes: ['pila', 'dinamita', 'rotos'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4);
      if (v === 'pila') {
        cajon(a, ps, -5, -4, 0, 14, 12, 11, entre(a, -10, 10)); cajon(a, ps, 9, 6, 0, 12, 11, 10, entre(a, 10, 30));
        cajon(a, ps, -4, -3, 11, 12, 11, 10, entre(a, -20, 20));
        if (fm % 2) cajon(a, ps, -10, 12, 0, 10, 9, 8, entre(a, -30, 30));
      } else if (v === 'dinamita') {
        cajon(a, ps, 0, 0, 0, 16, 11, 9, entre(a, -15, 15), true);
        for (let i = 0; i < 7; i++) ps.push(a.cilindro(-6 + i * 2, (a.r() - 0.5) * 2, 8, 0.9, 6, { mat: 'min_pintura', eje: [0.05, 1, 0.1] }));
        ps.push(...mover([a.caja(0, 0, 0, 16, 11, 1.2, { mat: 'madera' })], [14, 6, 1.6], 40, 10));
        for (let i = 0; i < 3; i++) ps.push(a.cilindro(entre(a, 8, 16), entre(a, 8, 14), 0.9, 0.9, 6, { mat: 'min_pintura', eje: [Math.cos(i), Math.sin(i), 0] }));
      } else {
        cajon(a, ps, -4, -4, 0, 14, 12, 6, entre(a, -20, 20), true);
        for (let i = 0; i < 9; i++) { const x = entre(a, -14, 14), y = entre(a, -10, 16), t = a.r() * PI; ps.push(viga(a, [x, y, 0.6 + a.r()], [x + Math.cos(t) * entre(a, 6, 12), y + Math.sin(t) * entre(a, 6, 12), 0.6], 2.6, 0.8, a.r() < 0.5 ? 'madera' : MAD)); }
        for (let i = 0; i < 6; i++) ps.push(pena(a, entre(a, -8, 14), entre(a, 0, 14), 0.6, 1.6, 1.3, 1.2, { mat: 'min_carbon' }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_minero_muerto', nombre: ['Minero muerto', 'Dead miner'], tema: 'mina', variantes: ['tendido', 'aplastado', 'esqueleto'], huella: [3, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 5);
      const dirs: Dir[] = ['s', 'e', 'o', 'so', 's'];
      const esq = v === 'esqueleto';
      ps.push(...cadaver({ piel: esq ? 'cu_hueso' : fm % 2 ? 'cu_piel_gris' : 'cu_piel_palida', oseo: esq, demacrado: true, barba: fm < 3 ? 'corta' : undefined, pelo: 'cu_pelo_negro', peinado: 'corto' }, MINERO(fm % 2 ? 'cu_cuero' : 'hierro_oxido', false, fm), dirs[fm], [0, 0, 0], entre(a, -30, 30)));
      if (v === 'aplastado') for (let i = 0; i < 8; i++) { const r = entre(a, 4, 8); ps.push(pena(a, entre(a, -14, 0), entre(a, -6, 10), r * 0.6 + i * 0.6, r, r * 0.8, r * 0.75, { mat: 'sub_roca' })); }
      const t = a.r() * 2 * PI;
      pico(a, ps, [entre(a, 8, 16), entre(a, -14, -6), 1], [Math.cos(t), Math.sin(t), 0.04], 20, [Math.sin(t), -Math.cos(t), 0.2]);
      farol(a, ps, [entre(a, -18, -10), entre(a, 6, 14), 15.5], 0, { apagado: true });
      if (fm >= 2) ps.push(a.elipsoide(entre(a, -4, 4), entre(a, 4, 10), 0, entre(a, 6, 10), entre(a, 4, 6), 0.8, { mat: 'sangre', giro: a.r() * 180 }));
      if (fm === 4) for (let i = 0; i < 5; i++) ps.push(pena(a, entre(a, 10, 20), entre(a, 6, 16), 0.8, 1.4, 1.2, 1.1, { mat: 'oro' }));
      piedras(a, ps, 5, 26);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_tolva', nombre: ['Tolva de mineral', 'Ore chute'], tema: 'mina', variantes: ['llena', 'vacia'], huella: [4, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], H = entre(a, 34, 42), fm = forma(a, 3);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(viga(a, [-10 + sx * 10, sy * 10, 0], [-10 + sx * 10, sy * 10, H + 4], 3.6, 3.6, MAD));
      for (const sy of [-1, 1]) ps.push(viga(a, [-22, sy * 10, H * 0.5], [2, sy * 10, H * 0.5], 2.6, 2.6, 'madera_vieja'), viga(a, [-20, sy * 10, 2], [0, sy * 10, H * 0.5], 2, 2, 'madera_vieja'));
      // el embudo de tablas y el canal que baja a la vagoneta
      ps.push(a.poliedro([[-22, -12, H + 16], [2, -12, H + 16], [-22, 12, H + 16], [2, 12, H + 16], [-14, -5, H], [-6, -5, H], [-14, 5, H], [-6, 5, H]], { mat: MAD }));
      ps.push(a.poliedro([[-21, -11, H + 17], [1, -11, H + 17], [-21, 11, H + 17], [1, 11, H + 17], [-13, -4, H + 1.5], [-7, -4, H + 1.5], [-13, 4, H + 1.5], [-7, 4, H + 1.5]], { mat: MAD, resta: true }));
      for (const zz of [H + 4, H + 12]) ps.push(a.caja(-10, 0, zz, 22 + (zz - H) * 0.9, 1, 1.2, { mat: RIEL }));
      ps.push(viga(a, [-6, 0, H + 1], [18, 0, 20], 7, 1.4, MAD), viga(a, [-6, -3.5, H + 3], [18, -3.5, 22], 1.2, 3, MAD), viga(a, [-6, 3.5, H + 3], [18, 3.5, 22], 1.2, 3, MAD));
      if (v === 'llena') {
        for (let i = 0; i < 14; i++) ps.push(pena(a, entre(a, -18, -2), entre(a, -8, 8), H + 13 + a.r() * 4, entre(a, 2.4, 4), entre(a, 2, 3.4), entre(a, 2, 3), { mat: fm === 1 ? 'min_hierro' : 'min_carbon' }));
        for (let i = 0; i < 4; i++) { const u = a.r(); ps.push(pena(a, -6 + u * 24, (a.r() - 0.5) * 4, H + 2 - u * (H - 18), 2, 1.8, 1.6, { mat: fm === 1 ? 'min_hierro' : 'min_carbon' })); }
      }
      const vg: Pieza[] = []; for (const l of [-1, 1]) riel(a, vg, [10, l * 7.6], [40, l * 7.6]);
      ps.push(...vg, ...mover(vagoneta(a, v === 'llena' ? (fm === 1 ? 'hierro' : 'carbon') : 'vacia'), [26, 0, 1.8], 0));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_carretilla', nombre: ['Carretilla', 'Wheelbarrow'], tema: 'mina', variantes: ['mineral', 'vacia', 'volcada'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const b: Pieza[] = [], fm = forma(a, 4);
      b.push(a.poliedro([[-6, -5, 6], [5, -4, 5], [-6, 5, 6], [5, 4, 5], [-9, -7.5, 13], [10, -6, 12], [-9, 7.5, 13], [10, 6, 12]], { mat: MAD }));
      b.push(a.poliedro([[-5, -4, 7], [4, -3, 6.2], [-5, 4, 7], [4, 3, 6.2], [-8.4, -6.8, 14], [9.4, -5.3, 13], [-8.4, 6.8, 14], [9.4, 5.3, 13]], { mat: MAD, resta: true }));
      for (const s of [-1, 1]) { b.push(viga(a, [-22, s * 5, 9], [10, s * 3.4, 5], 1.8, 1.8, 'madera'), viga(a, [-4, s * 4, 5.6], [-5, s * 5, 0], 1.6, 1.6, 'madera')); }
      b.push(a.cilindro(12, -1.2, 4.4, 4.4, 2.4, { mat: MAD, eje: [0, 1, 0] }), a.cilindro(12, -1.6, 4.4, 4.6, 0.8, { mat: RIEL, eje: [0, 1, 0] }), a.cilindro(12, 1.2, 4.4, 4.6, 0.8, { mat: RIEL, eje: [0, 1, 0] }));
      if (v === 'mineral') for (let i = 0; i < 8; i++) b.push(pena(a, entre(a, -6, 7), entre(a, -4, 4), 12 + a.r() * 2, entre(a, 2, 3.4), entre(a, 1.8, 2.8), entre(a, 1.6, 2.6), { mat: fm % 2 ? 'min_hierro' : 'min_carbon' }));
      const ps = v === 'volcada' ? mover(b, [0, 0, 7], a.r() * 360, 100) : mover(b, [0, 0, 0], a.r() * 360);
      if (v === 'volcada') for (let i = 0; i < 9; i++) ps.push(pena(a, entre(a, -12, 12), entre(a, -12, 12), 1, entre(a, 2, 3.4), entre(a, 1.8, 2.8), entre(a, 1.4, 2.4), { mat: fm % 2 ? 'min_hierro' : 'min_carbon' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_mineral', nombre: ['Montón de mineral', 'Ore heap'], tema: 'mina', variantes: ['carbon', 'oro', 'hierro', 'sangre'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], m = MENA[v], fm = forma(a, 4), H = entre(a, 12, 22) * (fm === 3 ? 0.6 : 1), R = entre(a, 18, 26);
      ps.push(masa([bulto([0, 0, 0], [R, R * 0.85, H]), bulto([(a.r() - 0.5) * R * 0.6, (a.r() - 0.5) * R * 0.6, 0], [R * 0.6, R * 0.55, H * 0.8])], { mat: v === 'carbon' ? 'min_carbon' : v === 'hierro' ? 'min_hierro' : 'min_grava', suave: 4 }));
      for (let i = 0; i < 34; i++) {
        const t = a.r() * 2 * PI, d = Math.sqrt(a.r()) * R * 1.05, z = H * Math.sqrt(Math.max(0, 1 - (d / R) ** 2)) * 0.95, r = entre(a, 1.8, 3.8);
        const pep = i % 4 === 0;
        if (pep && v === 'sangre') ps.push(prisma(a, [Math.cos(t) * d, Math.sin(t) * d, z], [(a.r() - 0.5), (a.r() - 0.5), 1], entre(a, 3, 7), 1.4, i % 8 ? m.pep : (m.luz as string)));
        else ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, z, r, r * 0.85, r * 0.7, { mat: pep ? m.pep : m.roca, tono: (a.r() - 0.5) * 0.15 }));
      }
      if (fm === 2) pala(a, ps, [R * 0.6, R * 0.4, 0.5], [-0.6, -0.4, 0.55], 22);
      ps.push(suelo(a));
      if (v === 'sangre') return { piezas: ps, resplandor: { c: [0, 0, H + 4], r: 34, color: '#e0403a' } };
      return ps;
    },
  },
  {
    id: 'min_cartel', nombre: ['Cartel de peligro', 'Danger sign'], tema: 'mina', variantes: ['peligro', 'barrera', 'calavera'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 3);
      if (v === 'barrera') {
        // caballete con tablas pintadas a franjas
        for (const s of [-1, 1]) { ps.push(viga(a, [s * 16, -4, 0], [s * 15, 0, 18], 2.2, 2.2, MAD), viga(a, [s * 16, 4, 0], [s * 15, 0, 18], 2.2, 2.2, MAD)); }
        for (const z of [16, 10]) { ps.push(viga(a, [-19, 1.6, z], [19, 1.6, z + (a.r() - 0.5) * 2], 4.5, 1.2, 'madera_vieja')); for (let i = 0; i < 4; i++) ps.push(a.caja(-14 + i * 9, 2.3, z - 2, 4, 0.3, 4.4, { mat: 'min_pintura', giro: 0, incl: 0, tono: -0.05 })); }
      } else {
        const lean = (a.r() - 0.5) * 6;
        ps.push(viga(a, [0, 0, 0], [lean * 0.3, 0, 40], 3, 3, MAD));
        ps.push(...mover([a.caja(0, 0, -7, 22, 1.6, 14, { mat: 'madera_vieja' }), viga(a, [-11, 0.9, -6.5], [11, 0.9, -6.5], 1.4, 1, MAD), viga(a, [-11, 0.9, 6.5], [11, 0.9, 6.5], 1.4, 1, MAD)], [lean * 0.25, 1.6, 34], fm * 6 - 6, 0));
        // calavera y dos picos cruzados pintados
        ps.push(a.elipsoide(lean * 0.25, 2.6, 30, 3.4, 0.3, 3.4, { mat: 'min_pintura' }), a.caja(lean * 0.25, 2.6, 25, 3, 0.3, 2.2, { mat: 'min_pintura' }));
        for (const s of [-1, 1]) ps.push(...mover([a.caja(0, 0, -7, 1.2, 0.3, 14, { mat: 'min_pintura' })], [lean * 0.25, 2.7, 30], 0, s * 45, 'y'));
        if (v === 'calavera') { calavera(a, ps, lean * 0.3, 0, 40, 1.1, 60); ps.push(a.palo([lean * 0.3, 0, 40], [lean * 0.3, 0, 44], 0.6, { mat: 'madera' })); }
      }
      piedras(a, ps, 4, 18);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_horno', nombre: ['Horno de fundir', 'Smelting furnace'], tema: 'mina', variantes: ['encendido', 'apagado'], cuadros: 6, t: 3, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 3), H = entre(a, 34, 42), on = v === 'encendido';
      // el cuerpo de piedras toscas que se angosta, con la boca hacia la cámara
      for (let z = 0, i = 0; z < H; i++) { const r = 16 - (z / H) * 7, n = 9; for (let k = 0; k < n; k++) { const t = (k / n) * 2 * PI + i * 0.35; ps.push(pena(a, Math.cos(t) * r, Math.sin(t) * r, z + 3.5, 5.5, 4.5, 4, { mat: a.r() < 0.2 ? 'ladrillo' : 'sub_roca', giro: (t * 180) / PI + 90, tono: (a.r() - 0.5) * 0.12 - (on && z < 14 ? -0.05 : 0), n: 8 })); } z += 6.5; }
      ps.push(a.cilindro(0, 0, 0, 13, H, { mat: 'sub_roca', r1: 7, tono: -0.2 }));
      ps.push(a.caja(10, 10, 2, 12, 12, 13, { mat: 'sub_roca', giro: 45, resta: true }));
      ps.push(a.elipsoide(6, 6, 4, 6, 6, 5, { mat: on ? 'fuego' : 'cue_carbon' in MATERIALES ? 'cue_carbon' : 'negro', tono: on ? onda(f, 6) * 0.1 : 0 }));
      if (on) llama(a, ps, 7, 7, 4, f, 6, 1);
      // la chimenea con su humo y el fuelle de cuero a un lado
      ps.push(a.cilindro(0, 0, H, 5, 14, { mat: 'ladrillo', r1: 4 }), a.cilindro(0, 0, H + 3, 3.4, 12, { mat: 'negro' }));
      if (on) for (let i = 0; i < 3; i++) { const u = ((f / 6) + i / 3) % 1; ps.push(a.elipsoide(u * 4, -u * 3, H + 16 + u * 24, 2.5 + u * 4, 2.5 + u * 4, 2 + u * 3, { mat: 'sub_vapor', tono: -0.25 - u * 0.4 })); }
      ps.push(...mover([masa([bulto([0, 0, 4], [9, 5, 2.6 + (on ? Math.abs(onda(f, 6)) * 1.4 : 0)])], { mat: 'cu_cuero' in MATERIALES ? 'cu_cuero' : 'cuero', suave: 1 }), viga(a, [0, -5, 6.6], [0, 5, 6.6], 9, 0.8, MAD), viga(a, [0, -5, 1.2], [0, 5, 1.2], 9, 0.8, MAD), a.palo([-9, 0, 4], [-15, 0, 4], 0.9, { mat: MAD }), a.palo([9, 0, 4], [13, 0, 3.5], 1, { mat: RIEL })], [-6, 20, 0], -40));
      // moldes con lingotes
      for (let i = 0; i < 2 + fm; i++) ps.push(a.caja(18 + i * 2, -8 + i * 7, 0, 8, 4, 2, { mat: 'sub_hierro_viejo', giro: 20 }), a.caja(18 + i * 2, -8 + i * 7, 1.4, 6.6, 2.6, 0.8, { mat: on && i === 0 ? 'lava' : 'hierro', giro: 20 }));
      ps.push(suelo(a));
      if (!on) return ps;
      return { piezas: ps, resplandor: { c: [12, 12, 8], r: 44, color: '#ff8030' } };
    },
  },
  {
    id: 'min_pozo', nombre: ['Pozo de mina', 'Mine shaft'], tema: 'mina', variantes: ['abierto', 'tablas', 'cadena'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 3);
      const cont = pozo(a, ps, entre(a, 13, 17), 130);
      if (v === 'tablas') for (let i = 0; i < 4 + fm; i++) { const y = -12 + i * 5 + (a.r() - 0.5) * 2; if (i === 2 && fm === 0) continue; ps.push(viga(a, [-22, y, 6.2], [22, y + (a.r() - 0.5) * 3, 6.2], 4.6, 1.2, i % 2 ? 'madera_vieja' : MAD)); }
      if (v === 'cadena') { ps.push(viga(a, [-24, 0, 7], [24, 0, 7], 4, 4, MAD)); cadena(a, ps, [2, 0, 9], [2, 0, -70], 3, 0.45); }
      if (fm === 2) for (let i = 0; i < 4; i++) ps.push(a.palo([22 + i * 2, -12, 0], [22 + i * 2, -12, 12 + (a.r() - 0.5) * 3], 0.8, { mat: MAD }));
      piedras(a, ps, 6, 30);
      ps.push(...recorte(a, semisDe(cont)));
      return ps;
    },
  },
  {
    id: 'min_mesa_capataz', nombre: ['Mesa del capataz', "Foreman's table"], tema: 'mina', variantes: ['vela', 'apagada'], cuadros: 6, t: 3, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 3), g = entre(a, -15, 15);
      const T: Pieza[] = [a.caja(0, 0, 13, 26, 14, 1.6, { mat: 'madera' })];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) T.push(viga(a, [sx * 11, sy * 5.5, 0], [sx * 11, sy * 5.5, 13], 2, 2, MAD));
      T.push(viga(a, [-11, 0, 4], [11, 0, 4], 1.4, 1.4, 'madera_vieja'));
      // libro de cuentas abierto, balanza, pepitas y la vela
      T.push(a.caja(-4, 0, 14.6, 9, 6.5, 0.8, { mat: 'cu_tela_blanca' }), a.caja(-4, 0, 14.4, 9.6, 7, 0.3, { mat: 'cu_cuero' }));
      T.push(a.cilindro(6, -2, 14.6, 1.4, 0.6, { mat: 'bronce' }), a.palo([6, -2, 15], [6, -2, 21], 0.35, { mat: 'bronce' }), a.palo([2, -2, 21], [10, -2, 21], 0.3, { mat: 'bronce' }));
      for (const x of [2, 10]) T.push(a.palo([x, -2, 21], [x, -2, 18], 0.15, { mat: 'bronce' }), a.cilindro(x, -2, 17.4, 1.8, 0.6, { mat: 'bronce', r1: 1.2 }));
      for (let i = 0; i < 4; i++) T.push(a.esfera(2 + (a.r() - 0.5), -2 + (a.r() - 0.5), 18.2, 0.6, { mat: 'oro' }));
      T.push(a.cilindro(9, 4, 14.6, 1.2, 4, { mat: 'cera' }), a.cilindro(9, 4, 14.6, 2, 0.6, { mat: 'bronce' }));
      if (v === 'vela') T.push(a.elipsoide(9, 4, 19.6 + onda(f, 6) * 0.2, 0.6, 0.6, 1.4, { mat: 'luz_vela' }));
      const ps2 = mover(T, [0, 0, 0], g);
      ps.push(...ps2);
      // taburete y cajón
      ps.push(...mover([a.cilindro(0, 0, 0, 3.6, 8, { mat: MAD, r1: 3 }), a.cilindro(0, 0, 8, 4, 1.4, { mat: 'madera' })], [entre(a, -4, 4), 14, 0], 0));
      cajon(a, ps, -20, -10, 0, 10, 9, 9, entre(a, -20, 20));
      if (fm % 2) barril(a, ps, 22, -6, 0, 4.5, 11, {});
      ps.push(suelo(a));
      if (v !== 'vela') return ps;
      const c: V3 = [9 * Math.cos(rad(g)) - 4 * Math.sin(rad(g)), 9 * Math.sin(rad(g)) + 4 * Math.cos(rad(g)), 20];
      return { piezas: ps, resplandor: { c, r: 30, color: '#ffc060' } };
    },
  },
);
registrar(
  {
    id: 'min_tren', nombre: ['Tren de vagonetas', 'Mine cart train'], tema: 'mina', variantes: ['cargado', 'mixto', 'descarrilado'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4);
      viaX(a, ps, -40, 40, { faltan: fm === 3 ? 0.15 : 0 });
      const cargas: Carga[] = v === 'cargado' ? ['carbon', 'carbon'] : [(['oro', 'hierro', 'carbon'] as Carga[])[fm % 3], 'vacia'];
      for (let i = 0; i < 2; i++) {
        const x = -15 + i * 30, des = v === 'descarrilado' && i === 1;
        ps.push(...mover(vagoneta(a, cargas[i], des ? 1 : 0), [x, des ? 6 : 0, des ? 3 : 1.8], des ? entre(a, 15, 30) : (a.r() - 0.5) * 2, des ? 12 : 0));
      }
      // el enganche: barra y cadena entre las dos
      ps.push(a.palo([-2, 0, 7], [2, 0, 7], 0.7, { mat: RIEL }));
      cadena(a, ps, [-1.5, 0, 7.4], [v === 'descarrilado' ? 4 : 1.5, v === 'descarrilado' ? 4 : 0, 7.4], 2.4, 0.35, { comba: 1 });
      if (v === 'descarrilado') piedras(a, ps, 6, 16, 'min_carbon', 20, 10);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'min_bomba', nombre: ['Bomba de agua y abrevadero', 'Water pump and trough'], tema: 'mina', variantes: ['con_agua', 'seca'], cuadros: 4, t: 5, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 3);
      // la bomba de palanca sobre su tubo y la batea de tablas
      ps.push(a.cilindro(0, 0, 0, 2.6, 22, { mat: RIEL, r1: 2.2 }), a.cilindro(0, 0, 22, 3, 3, { mat: RIEL }), a.palo([0, 0, 16], [5, 0, 16], 0.9, { mat: RIEL }), a.palo([5, 0, 16], [6, 0, 13], 0.8, { mat: RIEL }));
      const ang = rad(entre(a, 10, 35));
      ps.push(a.palo([0, 0, 24], [-Math.cos(ang) * 16, 0, 24 + Math.sin(ang) * 16], 0.8, { mat: RIEL }), a.palo([-Math.cos(ang) * 16, 0, 24 + Math.sin(ang) * 16], [-Math.cos(ang) * 18, 0, 25 + Math.sin(ang) * 16], 1.2, { mat: 'madera' }));
      const B: Pieza[] = [a.caja(0, 0, 0, 30, 12, 9, { mat: MAD }), a.caja(0, 0, 1.5, 27, 9.6, 9, { mat: MAD, resta: true })];
      for (const sx of [-15, 15]) B.push(viga(a, [sx, -6.5, 0], [sx, -6.5, 10], 2, 2, 'madera_vieja'), viga(a, [sx, 6.5, 0], [sx, 6.5, 10], 2, 2, 'madera_vieja'));
      if (v === 'con_agua') { B.push(a.caja(0, 0, 1.5, 27, 9.6, 6 + onda(f, 4) * 0.1, { mat: 'c2_agua' in MATERIALES ? 'c2_agua' : 'agua' })); }
      ps.push(...mover(B, [10, 14, 0], 0));
      if (v === 'con_agua') { const u = (f % 4) / 4; ps.push(a.esfera(6, 0, 12 - u * 4, 0.7, { mat: 'agua', tono: 0.3 })); ps.push(a.elipsoide(14, 6, 0, 10, 6, 0.6, { mat: 'agua_sucia' })); }
      if (fm >= 1) barril(a, ps, -12, 10, 0, 5, 12, {});
      if (fm === 2) ps.push(a.cilindro(-4, 14, 0, 3.4, 6.5, { mat: MAD, r1: 4 }), a.cilindro(-4, 14, 1, 3, 6, { mat: MAD, resta: true }));
      ps.push(suelo(a));
      return ps;
    },
  },
);
conVarianteY('min_tren', 'min_riel', 'min_riel_fin', 'min_riel_cruce', 'min_puntal', 'min_galeria', 'min_pared_veta', 'min_linternas_cuerda', 'min_cartel', 'min_andamio');
