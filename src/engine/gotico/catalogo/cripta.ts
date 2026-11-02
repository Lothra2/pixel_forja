import { conVarianteY, TEMAS, type Tema, type V3 } from '../objeto';
import {
  G, hacerObj, bloque, ojiva, altoOjiva, letras, grieta, tierra, musgo, hiedra, cascotes, calavera, calaveraSimple, huesoLargo, huesos, huesito,
  esqueleto, costillar, mirar, vela, llama, cadena, voluta, punta, figuraVelada, rr, elegir, onda, orient, base, GR, type P2,
} from '../kit_muerte';

/**
 * Cripta: el subsuelo de los muertos con nombre. Muros de nichos llenos de huesos y paredes enteras de cráneos,
 * sarcófagos tallados (el caballero yacente, el obispo, el niño), sarcófagos abiertos con su momia, arcosolios,
 * columnas de calaveras, altares de hueso, candelabros de hierro, sellos que brillan en puertas y pisos, rejas,
 * escaleras de caracol, pilas de cráneos, frescos desvaídos, telarañas, sangre seca, cadenas, lámparas de aceite
 * que cuelgan, relicarios, guardianes de piedra, la mesa de embalsamar y braseros de hueso.
 *
 * Las paredes corren a lo largo de x con la cara a +y; la variante que termina en `_der` corre a lo largo de y.
 */
const T = 'cripta' as string as Tema;
if (!TEMAS.some((t) => t[0] === T)) TEMAS.push([T, 'Cripta', 'Crypt']);
const obj = hacerObj(T);
const PIEDRA = ['mu_bloques', 'mu_bloques_frio', 'mu_bloques_frio'];
const SARC = ['mu_piedra', 'mu_piedra_fria', 'mu_marmol', 'mu_piedra_clara'];
/** Variantes de pared con su gemela a lo largo de y. */
const conDer = (vs: string[]) => [...vs, ...vs.slice(0, 2).map((v) => v + '_der')];

// ================================================================== muros
/** Muro de cripta a lo largo de x (cara +y): zócalo, cuerpo de sillares, cornisa y pilastras en las puntas. */
function muro(g: G, L: number, H: number, gro: number, m: string, pilastras = true) {
  const a = g.a;
  bloque(g, 0, 0, 0, L, gro + 4, 5, { mat: m, tono: -0.07, b: 1, j: 0.6 });
  bloque(g, 0, 0, 4.6, L, gro, H - 4.6, { mat: m, b: 1, j: 0.5 });
  bloque(g, 0, 0.6, H - 1, L + 1, gro + 3, 3, { mat: m, tono: 0.04, b: 0.8, j: 0.4 });
  if (pilastras) for (const s of [-1, 1]) bloque(g, s * (L / 2 - 4), 1.5, 0, 8, gro + 3, H + 2, { mat: m, tono: 0.05, b: 0.9, j: 0.4 });
  for (let i = 0; i < 3; i++) g.elip(rr(a, -L / 2, L / 2), gro / 2 + 0.2, rr(a, 3, H * 0.5), 1.4 + a.r() * 2, 0.6, 3 + a.r() * 6, { mat: m, tono: -0.24 });
}
obj('cri_muro', ['Muro de la cripta', 'Crypt wall'], conDer(['liso', 'agrietado', 'hornacina', 'derrumbado']), [5, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, PIEDRA), H = 92 + a.r() * 8;
  tierra(g, 40, 8, 4, 'mu_tierra', 0, 8);
  if (b === 'derrumbado') {
    const alto = (x: number) => 30 + Math.abs(Math.sin(x * 0.07 + a.r() * 3)) * 50;
    bloque(g, 0, 0, 0, 80, 16, 5, { mat: m, tono: -0.07, b: 1, j: 0.6 });
    for (let x = -40; x < 40; x += 8) bloque(g, x + 4, 0, 4.6, 8.3, 12, alto(x), { mat: m, b: 0.6, j: 1 });
    cascotes(g, 16, 34, 8, m, 0, 16, 3.4);
    return;
  }
  muro(g, 80, H, 12, m);
  if (b === 'agrietado') { for (let i = 0; i < 3; i++) grieta(g, rr(a, -28, 28), 6, rr(a, 6, 30), rr(a, 50, H - 4), m); musgo(g, 4, -36, 36, 6.2, 2, 18, 'mu_liquen'); cascotes(g, 6, 30, 3, m, 0, 11, 2); }
  if (b === 'hornacina') {
    g.sub(0, 6, 0).prisma(ojiva(18, 30, 0.85, 5, 14), -6, 2, { mat: m, resta: true });
    g.caja(0, 2.5, 14, 18, 7, 1.2, { mat: m, tono: 0.08 });
    figuraVelada(g.sub(0, 2, 15.2, 90), 26, { mat: elegir(a, ['mu_marmol', 'mu_piedra_clara']), pose: elegir(a, ['reza', 'pie', 'cubre_cara'] as const) });
  }
});
/** Pared de nichos: tres hileras de huecos con huesos, cráneos, mortajas y lápidas que los cierran. */
obj('cri_muro_nichos', ['Muro de nichos con huesos', 'Bone niche wall'], conDer(['huesos', 'calaveras', 'mixto', 'saqueado']), [5, 2], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)).sub(0, -4, 0), b = base(v), m = elegir(a, ['mu_toba', ...PIEDRA]);
  muro(g, 80, 100, 18, m);
  const filas = [7, 37, 67], cols = [-22, 0, 22];
  for (const z of filas) for (const x of cols) g.sub(x, 0, 0).prisma(ojiva(18, 12, 0.5, 4, z), -4, 12, { mat: m, resta: true });
  for (const z of filas) for (const x of cols) {
    const n = g.sub(x, 2, z);
    const c = b === 'huesos' ? 'huesos' : b === 'calaveras' ? 'calaveras' : elegir(a, ['huesos', 'calaveras', 'mortaja', 'lapida', 'huesos']);
    g.caja(x, 9.5, z - 1.4, 20, 3, 1.4, { mat: m, tono: 0.06 });
    if (b === 'saqueado' && a.r() < 0.5) { huesos(n, 2, 6, 2, 0, 0, 1); continue; }
    if (c === 'huesos') { for (let k = 0; k < 7; k++) { const y = rr(a, -5, 4), zz = 1 + (k % 3) * 2; huesito(n, [-7, y, zz], [7, y + rr(a, -1, 1), zz + rr(a, -0.6, 0.6)], 0.9, 'mu_hueso', -0.1 + a.r() * 0.1); } calaveraSimple(n.sub(rr(a, -5, 5), 3, 6.2, 80), 2.6); }
    else if (c === 'calaveras') { for (let i = 0; i < 4; i++) calaveraSimple(n.sub(-6.6 + i * 4.4, 3 + rr(a, -1, 1), 0, 80 + rr(a, -25, 25)), 2.3); for (let i = 0; i < 3; i++) calaveraSimple(n.sub(-4.4 + i * 4.4, 1.5, 4.4, 85 + rr(a, -25, 25)), 2.1); }
    else if (c === 'mortaja') { n.masa([n.hu([-8, 0, 3], [7, 0, 2.6], 3, 2.4), n.bu([-8.5, 0, 3.4], [2.6, 2.6, 2.8])], { mat: 'mu_mortaja', suave: 1, tono: -0.1 }); for (const xx of [-4, 2]) n.cil(xx, -3.2, 3, 3.1, 0.8, { mat: 'cuerda', eje: [1, 0, 0] }); }
    else { bloque(n, 0, 8.5, 0, 18, 1.8, 15, { mat: elegir(a, ['mu_marmol', 'mu_piedra']), b: 0.4, j: 0.3 }); letras(n, -5, 5, 9.4, 10, 3, 'mu_piedra', 2.2, 1); }
  }
  if (b === 'saqueado') { for (let i = 0; i < 2; i++) bloque(g.sub(rr(a, -24, 24), 20 + a.r() * 6, 1, rr(a, -30, 30), 84), 0, 0, 0, 18, 1.8, 15, { mat: 'mu_marmol', b: 0.4, j: 0.5 }); huesos(g, 10, 32, 5, 0, 20, 0.9, 3); for (let i = 0; i < 3; i++) calavera(g.sub(rr(a, -30, 30), 16 + a.r() * 8, 0, mirar(a)), 3); }
  tierra(g, 40, 9, 4, 'mu_tierra', 0, 14);
});
/** Osario de pared: la pared entera hecha de cráneos en hileras, con fémures cruzados y un rosetón de calaveras. */
obj('cri_osario_pared', ['Pared de cráneos', 'Ossuary skull wall'], conDer(['calaveras', 'huesos_cruzados', 'roseton', 'arco']), [5, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, PIEDRA), H = 96;
  bloque(g, 0, 0, 0, 80, 14, 5, { mat: m, tono: -0.07, b: 1, j: 0.6 });
  bloque(g, 0, -1, 5, 74, 9, H - 5, { mat: 'mu_osario', b: 0.6, j: 0.3 });
  for (let f = 1; f < 11; f += 2) bloque(g, 0, 2.2, 5 + f * 8, 72, 3, 6.4, { mat: 'mu_pared_huesos', b: 0.3, j: 0.3 });
  for (const s of [-1, 1]) bloque(g, s * 37, 1, 0, 8, 14, H + 2, { mat: m, tono: 0.05, b: 0.9, j: 0.4 });
  bloque(g, 0, 0.6, H, 82, 15, 3, { mat: m, tono: 0.04, b: 0.8, j: 0.4 });
  const hueco = (x: number, z: number) => (b === 'roseton' && Math.hypot(x, z - 52) < 17) || (b === 'arco' && Math.abs(x) < 13 && z < 46 + Math.sqrt(Math.max(0, 169 - x * x)) * 0.4);
  // hileras: cráneos, después una banda de cabezas de fémur
  for (let f = 0; f < 11; f++) {
    const z = 6 + f * 8, craneos = f % 2 === 0;
    for (let x = -31; x <= 31; x += craneos ? 6.2 : 3) {
      if (hueco(x, z + 2)) continue;
      if (craneos) calaveraSimple(g.sub(x + rr(a, -0.4, 0.4), 3.4, z, 90 + rr(a, -12, 12)), 2.6, 'mu_hueso', -0.05);
      else if (a.r() < 0.25) g.esf(x, 3.6, z + 1.8, 1.4, { mat: 'mu_hueso', tono: -0.06 + a.r() * 0.08 });
    }
  }
  if (b === 'huesos_cruzados') for (const x of [-18, 0, 18]) { const c = g.sub(x, 6, 48); huesoLargo(c, [-8, 0, -8], [8, 0, 8], 1.4); huesoLargo(c, [-8, 0.6, 8], [8, 0.6, -8], 1.4); calavera(c.sub(0, -0.5, -3, 90), 3.6); }
  if (b === 'roseton') {
    g.cil(0, -2, 52, 17, 6, { mat: 'negro', eje: [0, 1, 0] });
    for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; calaveraSimple(g.sub(Math.cos(t) * 13, 3.6, 52 + Math.sin(t) * 13 - 2.6, 90), 2.6); huesito(g, [Math.cos(t) * 3, 3, 52 + Math.sin(t) * 3], [Math.cos(t) * 9.6, 3, 52 + Math.sin(t) * 9.6], 0.8); }
    calavera(g.sub(0, 3, 49, 90), 3.6);
  }
  if (b === 'arco') { g.sub(0, -1, 5).prisma(ojiva(26, 34, 0.5, 6, 0), -6, 8, { mat: 'negro' }); for (let i = 0; i <= 10; i++) { const t = (i / 10) * Math.PI; calaveraSimple(g.sub(Math.cos(t) * 15.5, 4, 39 + Math.sin(t) * 15.5 - 2.6, 90), 2.4); } }
  huesos(g, 6, 34, 4, 0, 10);
});
/** Tramo de bóveda de crucería: dos pilares, arco ojival y los nervios que se van hacia atrás. */
obj('cri_arco_boveda', ['Arco de bóveda', 'Ribbed vault arch'], conDer(['entero', 'roto', 'con_calaveras']), [5, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, PIEDRA), W = 56, hr = 60;
  for (const s of [-1, 1]) {
    bloque(g, s * W / 2, 0, 0, 14, 14, 5, { mat: m, tono: -0.06, b: 1, j: 0.6 });
    bloque(g, s * W / 2, 0, 5, 10, 10, hr - 5, { mat: m, b: 0.8, j: 0.4 });
    for (const [dx, dy] of [[-5, 0], [5, 0], [0, 5], [0, -5]]) g.cil(s * W / 2 + dx, dy, 5, 1.6, hr - 5, { mat: m, tono: 0.05 });
    bloque(g, s * W / 2, 0, hr - 4, 14, 14, 4, { mat: m, tono: 0.06, b: 0.8, j: 0.4, arriba: 1.15 });
  }
  const k = 0.75, alto = altoOjiva(W, hr, k);
  g.prisma(ojiva(W + 12, hr, k, 8, 0), -5, 5, { mat: m, tono: 0.02 });
  g.prisma(ojiva(W - 2, hr, k, 8, 0), -6, 6, { mat: m, resta: true });
  g.caja(0, 0, 0, W - 2, 14, hr, { mat: m, resta: true });
  // nervios que se van hacia atrás desde los capiteles
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6; const P = (t: number): V3 => [s * W / 2 * (1 - t * 0.7), -t * 40, hr + Math.sin(t * Math.PI * 0.5) * (alto - hr) * 0.9]; g.palo(P(t0), P(t1), 1.8, { mat: m, tono: 0.04 }); }
  g.esf(0, 0, alto + 1, 3.6, { mat: m, tono: 0.08 });
  if (b === 'roto') { g.poli([[-6, -8, alto - 14], [26, -8, alto - 26], [-6, 8, alto - 14], [26, 8, alto - 26], [-6, -8, alto + 10], [30, -8, alto + 10], [-6, 8, alto + 10], [30, 8, alto + 10]], { mat: m, resta: true }); cascotes(g, 12, 18, 10, m, 8, 14, 4); }
  if (b === 'con_calaveras') { for (let i = 0; i <= 12; i++) { const t = (i / 12) * Math.PI; const r = W / 2 + 2; calaveraSimple(g.sub(Math.cos(t) * r * 0.98, 5, hr + Math.sin(t) * (alto - hr) * 0.95 - 1, 90), 2.2); } for (const s of [-1, 1]) for (let z = 10; z < hr - 6; z += 7) calaveraSimple(g.sub(s * W / 2, 5.4, z, 90), 2.2); }
  tierra(g, 38, 8, 4, 'mu_tierra');
});
/** Pilar macizo de la cripta con basa y capitel tallado. */
obj('cri_pilar', ['Pilar de la cripta', 'Crypt pillar'], ['entero', 'agrietado', 'roto', 'con_calaveras', 'con_raices'], [2, 2], true, (v, _f, g, a) => {
  const m = elegir(a, PIEDRA), H = 100;
  tierra(g, 16, 16, 4, 'mu_tierra');
  bloque(g, 0, 0, 0, 24, 24, 5, { mat: m, tono: -0.07, b: 1.2, j: 0.7 }); bloque(g, 0, 0, 5, 20, 20, 4, { mat: m, tono: -0.03, b: 1, j: 0.5 });
  const hh = v === 'roto' ? 40 + a.r() * 16 : H - 18;
  g.cil(0, 0, 9, 8, hh, { mat: m, r1: 7.4 });
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; g.cil(Math.cos(t) * 7.6, Math.sin(t) * 7.6, 9, 1.7, hh, { mat: m, tono: 0.04, r1: 1.5 }); }
  if (v === 'roto') { g.poli([[-12, -12, 9 + hh - 6], [12, -12, 9 + hh + 2], [-12, 12, 9 + hh - 2], [12, 12, 9 + hh + 6], [-12, -12, 200], [12, -12, 200], [-12, 12, 200], [12, 12, 200]], { mat: m, resta: true }); for (let i = 0; i < 3; i++) { const d = g.sub(14 + i * 9, rr(a, -6, 10), 7.4, rr(a, 0, 90), 90, 'x'); d.cil(0, 0, -6, 7.4, 12, { mat: m, tono: -0.03 }); } cascotes(g, 8, 14, 14, m, 10, 8, 3); }
  else {
    g.cil(0, 0, 9 + hh, 7.6, 3, { mat: m, r1: 11 });
    bloque(g, 0, 0, 12 + hh, 24, 24, 6, { mat: m, tono: 0.05, b: 1, j: 0.5 });
    for (const [x, y, gi] of [[12, 0, 0], [0, 12, 90]] as [number, number, number][]) calavera(g.sub(x - (x ? 1.6 : 0), y - (y ? 1.6 : 0), 11.4 + hh, gi), 2.6, m);
  }
  if (v === 'agrietado') { for (let i = 0; i < 3; i++) { const t = rr(a, -0.2, 1.8); grieta(g.sub(Math.cos(t) * 8.6, Math.sin(t) * 8.6, 0, t / GR - 90), 0, 0, 12, hh, m); } }
  if (v === 'con_calaveras') for (let z = 16; z < hh; z += 10) for (let i = 0; i < 3; i++) { const t = -0.4 + i * 0.95 + (z % 20 ? 0.45 : 0); calaveraSimple(g.sub(Math.cos(t) * 9.4, Math.sin(t) * 9.4, z, t / GR), 2.4); }
  if (v === 'con_raices') { const cs = []; for (let i = 0; i < 6; i++) { const t = a.r() * 6.28; let p: V3 = [Math.cos(t) * 9, Math.sin(t) * 9, H]; for (let k = 0; k < 4; k++) { const q: V3 = [Math.cos(t + k * 0.3) * 9.2, Math.sin(t + k * 0.3) * 9.2, p[2] - 14 - a.r() * 8]; cs.push(g.hu(p, q, 1.6 - k * 0.3, 1.3 - k * 0.3)); p = q; } } g.masa(cs, { mat: 'mu_corteza', suave: 1 }); }
});

// ================================================================== sarcófagos
/** Figura yacente a lo largo de y (cabeza en -y) apoyada en z = 0: caballero, obispo, dama o niño. */
function yacente(g: G, L: number, tipo: 'caballero' | 'obispo' | 'dama' | 'nino', m: string, tono = 0.08) {
  const s = g.esc(L / 52), cs = [];
  bloque(s, 0, -21, 0, 11, 8, 2.2, { mat: m, tono: tono - 0.04, b: 0.8, j: 0.4 });
  cs.push(s.bu([0, -21, 4.8], [2.8, 3, 2.9]), s.bu([0, -12.5, 3.6], [6, 5.6, 3.5]), s.bu([0, -4, 3.2], [5.2, 5, 3]));
  if (tipo === 'obispo' || tipo === 'dama') cs.push(s.hu([0, -2, 2.6], [0, 21, 2.2], 6, 5.6), s.bu([0, 23, 2.8], [5.4, 2.4, 2.6]));
  else for (const sx of [-1, 1]) cs.push(s.hu([sx * 2.3, 0, 2.9], [sx * 2.1, 20, 2.4], 2.8, 2.1), s.bu([sx * 2.1, 22.5, 3.6], [1.6, 1.7, 2.6]));
  for (const sx of [-1, 1]) cs.push(s.hu([sx * 5.2, -15, 3.6], [sx * 4.6, -8.6, 4.4], 1.7, 1.4), s.hu([sx * 4.6, -8.6, 4.4], [sx * 0.7, -11.4, 6.2], 1.4, 1.1));
  cs.push(s.bu([0, -11.6, 6.6], [1.4, 1.2, 2.2]));
  s.masa(cs, { mat: m, tono, suave: 1.4 });
  if (tipo === 'caballero') {
    s.poli([[-0.9, -9, 6.2], [0.9, -9, 6.2], [-0.9, 17, 5.2], [0.9, 17, 5.2], [0, 18.5, 5.2], [0, -9, 7], [0, 17, 6]], { mat: m, tono: tono + 0.06 });
    s.caja(0, -8.6, 6, 7, 1.4, 1.4, { mat: m, tono: tono + 0.06 }); s.esf(0, -11.6, 6.8, 1.1, { mat: m, tono: tono + 0.08 });
    s.elip(0, -21, 5.6, 2.9, 3.2, 2.8, { mat: m, tono: tono - 0.03 }); s.caja(0, -18.2, 5.4, 3.2, 0.8, 0.6, { mat: 'negro' });
    const p = s.sub(0, 27, 0); p.masa([p.bu([0, 0, 2.6], [4, 2.4, 2.4]), p.bu([3.6, -1, 4.2], [1.8, 1.5, 1.6]), p.hu([-3.5, 0, 2.6], [-6, 1, 1.8], 0.8, 0.5)], { mat: m, tono, suave: 1 });
  }
  if (tipo === 'obispo') {
    s.poli([[-2.4, -23.2, 4], [2.4, -23.2, 4], [-2.4, -20, 4], [2.4, -20, 4], [0, -28.5, 5.2], [-1.6, -23, 6.6], [1.6, -23, 6.6]], { mat: m, tono: tono + 0.08 });
    s.palo([6.4, -22, 3], [6.4, 20, 2.4], 0.7, { mat: m, tono: tono + 0.06 }); voluta(s.sub(6.4, -22, 3, 90, 90, 'y'), 0, 0, 2.6, 1, 1, 0.5, m);
    s.caja(0, 0, 5.6, 3, 34, 1.2, { mat: m, tono: tono + 0.12 });
  }
  if (tipo === 'dama') s.elip(0, -21.5, 5.4, 3.4, 3.4, 2, { mat: m, tono: tono - 0.04 });
}
/** Caja de sarcófago a lo largo de y con arcadas talladas en los costados que se ven. Devuelve la altura de la tapa. */
function cajaSarc(g: G, Lx: number, Ly: number, H: number, m: string) {
  bloque(g, 0, 0, 0, Lx + 4, Ly + 4, 3.4, { mat: m, tono: -0.07, b: 1, j: 0.6 });
  bloque(g, 0, 0, 3.2, Lx, Ly, H - 3.2, { mat: m, b: 0.8, j: 0.4 });
  bloque(g, 0, 0, H - 2.4, Lx + 2, Ly + 2, 2.4, { mat: m, tono: 0.03, b: 0.6, j: 0.3 });
  const n = Math.max(2, Math.round(Ly / 16));
  for (let i = 0; i < n; i++) g.sub(Lx / 2, -Ly / 2 + (Ly / n) * (i + 0.5), 0, 90).prisma(ojiva(Ly / n - 5, H * 0.32, 0.75, 3, 6), -1.4, 1.4, { mat: m, resta: true });
  g.sub(0, Ly / 2, 0).prisma(ojiva(Lx - 10, H * 0.3, 0.75, 3, 6), -1.4, 1.4, { mat: m, resta: true });
  g.cil(0, Ly / 2 + 0.2, H * 0.52, 2.6, 1.2, { mat: m, eje: [0, 1, 0], tono: 0.06 });
  return H;
}
function tapaSarc(g: G, Lx: number, Ly: number, z: number, m: string) {
  bloque(g, 0, 0, z, Lx + 3, Ly + 3, 3, { mat: m, tono: 0.04, b: 0.8, j: 0.4 });
  g.poli([[-Lx / 2, -Ly / 2, z + 3], [Lx / 2, -Ly / 2, z + 3], [-Lx / 2, Ly / 2, z + 3], [Lx / 2, Ly / 2, z + 3], [-Lx / 2 + 3, -Ly / 2 + 3, z + 5], [Lx / 2 - 3, -Ly / 2 + 3, z + 5], [-Lx / 2 + 3, Ly / 2 - 3, z + 5], [Lx / 2 - 3, Ly / 2 - 3, z + 5]], { mat: m, tono: 0.06 });
  return z + 5;
}
function sarcofagoTallado(tipo: 'caballero' | 'obispo' | 'nino') {
  return (v: string, _f: number, g: G, a: G['a']) => {
    const nino = tipo === 'nino', Lx = nino ? 18 : 28, Ly = nino ? 36 : 64, H = nino ? 14 : 19;
    const m = v === 'marmol_negro' ? 'mu_marmol_negro' : v === 'dorado' ? 'mu_marmol' : v === 'musgo' ? 'mu_piedra_musgo' : elegir(a, SARC);
    tierra(g, Lx * 0.8, Ly * 0.6, 4, 'mu_tierra');
    const s = g.sub(0, 0, 0, (a.r() - 0.5) * 6);
    cajaSarc(s, Lx, Ly, H, m);
    letras(s, -Lx / 2 + 4, Lx / 2 - 4, Ly / 2 + 1, H - 4, 1, m, 2, 1.1);
    const zt = tapaSarc(s, Lx, Ly, H, m);
    const roto = v === 'profanado' || v === 'roto';
    yacente(s.sub(0, -1, zt), nino ? 28 : 54, nino ? (a.r() < 0.5 ? 'nino' : 'dama') : tipo === 'caballero' ? 'caballero' : 'obispo', m);
    if (nino && (v === 'con_flores' || a.r() < 0.3)) for (let i = 0; i < 6; i++) s.elip(rr(a, -6, 6), rr(a, -14, 14), zt + 1.6, 1.3, 1.3, 1, { mat: elegir(a, ['mu_flor', 'mu_hoja_seca']), tono: -0.1 });
    if (v === 'dorado') { s.caja(0, Ly / 2 + 1.2, H - 2.4, Lx + 2.4, 0.6, 2.4, { mat: 'oro', tono: -0.15 }); s.caja(Lx / 2 + 1.2, 0, H - 2.4, 0.6, Ly + 2.4, 2.4, { mat: 'oro', tono: -0.2 }); s.esf(0, -22, zt + 8.2, 1.2, { mat: 'oro', tono: -0.1 }); }
    if (v === 'con_velas') { for (const [x, y] of [[-Lx / 2 - 6, -Ly / 2], [Lx / 2 + 6, -Ly / 2], [Lx / 2 + 6, Ly / 2]] as P2[]) { s.cil(x, y, 0, 2.6, 1, { mat: 'mu_hierro' }); s.cil(x, y, 1, 0.8, 18, { mat: 'mu_hierro' }); s.cil(x, y, 19, 2.2, 1, { mat: 'mu_hierro', r1: 2.8 }); vela(s, x, y, 20, 5 + a.r() * 4, 1.4, _f, 4, x + y); } }
    if (roto) { s.poli([[Lx / 2 - 6, -6, zt - 6], [Lx / 2 + 6, -12, zt - 6], [Lx / 2 + 4, 8, zt - 4], [Lx / 2 - 8, 4, zt + 10], [Lx / 2 + 4, -2, zt + 10]], { mat: m, resta: true }); s.poli([[0, -Ly / 2 - 4, zt - 3], [Lx, -Ly / 2 - 4, zt - 3], [0, -Ly / 2 + 14, zt - 1], [Lx, -Ly / 2 + 10, zt - 1], [0, -Ly / 2 - 4, zt + 12], [Lx, -Ly / 2 - 4, zt + 12], [0, -Ly / 2 + 14, zt + 12]], { mat: m, resta: true }); cascotes(g, 7, 10, 8, m, Lx / 2 + 8, 0, 2.4); }
    if (v === 'musgo') { musgo(s, 6, -Lx / 2, Lx / 2, Ly / 2 + 1.2, 2, H, 'mu_musgo'); for (let i = 0; i < 4; i++) s.elip(rr(a, -8, 8), rr(a, -20, 20), zt + 2, 3, 3, 1, { mat: 'mu_musgo' }); }
    if (v === 'profanado') { huesos(g, 4, 10, 12, Lx / 2 + 10, 0); calavera(g.sub(Lx / 2 + 8, Ly / 2, 0, mirar(a)), 3); }
    if (v !== 'con_velas') return;
    return { piezas: g.ps, resplandor: { c: [Lx / 2 + 6, 0, 24] as V3, r: 24, color: '#ffb35a' } };
  };
}
obj('cri_sarcofago_caballero', ['Sarcófago del caballero yacente', 'Effigy tomb of a knight'], ['intacto', 'musgo', 'profanado', 'marmol_negro', 'con_velas'], [2, 4], true, sarcofagoTallado('caballero'), { cuadros: 4, t: 3 });
obj('cri_sarcofago_obispo', ['Sarcófago del obispo', "Bishop's effigy tomb"], ['intacto', 'dorado', 'roto', 'con_velas'], [2, 4], true, sarcofagoTallado('obispo'), { cuadros: 4, t: 3 });
obj('cri_sarcofago_nino', ['Sarcófago de niño', "Child's sarcophagus"], ['intacto', 'con_flores', 'roto', 'musgo'], [2, 3], true, sarcofagoTallado('nino'));

/** Momia vendada a lo largo de y: tendida, o sentada que se levanta del cajón. */
function momia(g: G, sentada: boolean, mat = 'mu_venda') {
  const a = g.a, cs = [];
  const torso: V3 = sentada ? [0, -14, 12] : [0, -12, 3.2], cab: V3 = sentada ? [1, -12, 22] : [0, -21, 3.6];
  cs.push(g.bu(cab, [2.5, 2.6, 2.8]), g.bu(torso, [4.4, 4, sentada ? 6.5 : 2.6], { eje: sentada ? [0, 0.3, 1] : [0, 1, 0] }), g.bu(sentada ? [0, -10, 4] : [0, -4, 2.6], [3.8, 4.4, 2.6]));
  for (const sx of [-1, 1]) cs.push(g.hu([sx * 1.8, sentada ? -8 : 0, 2.6], [sx * 1.7, 20, 2.2], 2, 1.5), g.bu([sx * 1.7, 22, 3], [1.2, 1.4, 2]));
  if (sentada) for (const sx of [-1, 1]) { const sh: V3 = [sx * 4, -14, 17], m1: V3 = [sx * 4 + 3, -6 - a.r() * 2, 16], h: V3 = [sx * 3 + 6, 0, 17 + a.r() * 3]; cs.push(g.hu(sh, m1, 1.4, 1.2), g.hu(m1, h, 1.2, 1), g.bu(h, [1.2, 1.4, 1])); }
  else for (const sx of [-1, 1]) cs.push(g.hu([sx * 4.2, -15, 3.4], [sx * 3.6, -8, 4.4], 1.4, 1.2), g.hu([sx * 3.6, -8, 4.4], [-sx * 1.6, -12, 5.4], 1.2, 1));
  g.masa(cs, { mat, suave: 1.2 });
  for (let i = 0; i < 4; i++) { const p: V3 = sentada ? [rr(a, -3, 3), rr(a, -16, 14), rr(a, 4, 18)] : [rr(a, -3, 3), rr(a, -16, 18), 4.8]; g.masa([g.hu(p, [p[0] + rr(a, 2, 4), p[1] + rr(a, -2, 2), p[2] - rr(a, 3, 6)], 0.6, 0.3)], { mat, suave: 0.4 }); }
  const ojo = sentada ? [cab[0] + 2.2, cab[1], cab[2] + 0.4] : [cab[0], cab[1], cab[2] + 2.4];
  for (const sx of [-1, 1]) g.esf(ojo[0] + (sentada ? 0 : sx * 1), ojo[1] + (sentada ? sx * 1 : -0.6), ojo[2], 0.55, { mat: 'negro' });
}
obj('cri_sarcofago_abierto', ['Sarcófago abierto', 'Open sarcophagus'], ['momia', 'momia_sentada', 'vacio', 'esqueleto', 'tapa_rota'], [3, 4], true, (v, _f, g, a) => {
  const m = elegir(a, SARC), Lx = 26, Ly = 62, H = 18;
  tierra(g, 22, 34, 4, 'mu_tierra');
  const s = g.sub(-4, 0, 0, (a.r() - 0.5) * 8);
  cajaSarc(s, Lx, Ly, H, m);
  s.caja(0, 0, 6, Lx - 6, Ly - 6, H, { mat: m, resta: true });
  s.caja(0, 0, 5, Lx - 6, Ly - 6, 1.4, { mat: 'negro' });
  if (v === 'momia' || v === 'momia_sentada') momia(s.sub(0, 0, 5.6), v === 'momia_sentada');
  else if (v === 'esqueleto' || v === 'tapa_rota') esqueleto(s.sub(0, -1, 6.2).esc(0.92), 2);
  else { for (let i = 0; i < 5; i++) s.elip(rr(a, -8, 8), rr(a, -24, 24), 6.4, 3 + a.r() * 2, 3 + a.r() * 3, 0.6, { mat: 'mu_tierra', tono: 0.1 }); huesos(s, 2, 8, 20, 0, 0, 7); }
  if (v === 'tapa_rota') { for (let i = 0; i < 3; i++) { const t = s.sub(Lx / 2 + 8 + i * 3, -20 + i * 18, 0.4, rr(a, -30, 30), rr(a, -10, 10), 'y'); bloque(t, 0, 0, 0, Lx * 0.9, 18, 4, { mat: m, b: 0.6, j: 1.2, tono: 0.04 }); } cascotes(g, 6, 8, 20, m, Lx / 2 + 8, 0, 2.4); }
  else { const t = s.sub(Lx / 2 + 6, 6, 0, 8 + a.r() * 8, -16, 'y'); tapaSarc(t, Lx, Ly, 0, m); if (v === 'momia') yacente(t.sub(0, -1, 5), 54, 'dama', m); }
  if (v === 'momia_sentada') for (let i = 0; i < 4; i++) s.elip(rr(a, -6, 6), rr(a, -10, 10), 22 + a.r() * 6, 2, 2, 1.4, { mat: 'mu_tierra', tono: 0.15 });
});
/** Sarcófago sellado: cadenas que lo envuelven y runas que laten en la tapa. */
obj('cri_sarcofago_sellado', ['Sarcófago sellado', 'Sealed sarcophagus'], ['runa_azul', 'sello_rojo', 'sello_verde', 'roto'], [2, 4], true, (v, f, g, a) => {
  const m = elegir(a, ['mu_marmol_negro', 'mu_piedra_fria', 'mu_granito']), Lx = 28, Ly = 62, H = 19;
  const mat = v === 'runa_azul' ? 'runa' : v === 'sello_verde' ? 'mu_sello_verde' : v === 'roto' ? 'mu_sello_rojo' : 'mu_sello_rojo';
  const color = v === 'runa_azul' ? '#5ac8f0' : v === 'sello_verde' ? '#70e08a' : '#ff5a3a';
  tierra(g, 20, 34, 4, 'mu_tierra');
  cajaSarc(g, Lx, Ly, H, m);
  const zt = tapaSarc(g, Lx, Ly, H, m);
  const late = 0.5 + 0.5 * onda(f, 6), t = -0.15 + late * 0.25;
  // cadenas que cruzan la tapa
  for (const y of [-18, 6]) { cadena(g, [Lx / 2 + 2, y, H - 2], [Lx / 2 + 2, y, zt + 0.4], 0, 'mu_hierro', 0.8); cadena(g, [Lx / 2 + 1, y, zt + 0.6], [-Lx / 2 - 1, y, zt + 0.6], -0.6, 'mu_hierro', 0.8); }
  // el sello: un disco con anillo y runas alrededor de la tapa
  const c = g.sub(0, -6, zt);
  c.cil(0, 0, 0, 6.4, 0.6, { mat: 'mu_hierro', tono: 0.05 }); c.cil(0, 0, 0.5, 5.2, 0.4, { mat, tono: t }); c.cil(0, 0, 0.6, 3.6, 0.5, { mat: m });
  for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2; c.caja(Math.cos(an) * 2, Math.sin(an) * 2, 0.9, 1.2, 0.5, 0.4, { mat, tono: t, giro: an / GR }); }
  for (let i = 0; i < 10; i++) { const y = -Ly / 2 + 4 + i * ((Ly - 8) / 9); g.caja(Lx / 2 + 0.2, y, H * 0.48, 0.6, 1.6, 2.6, { mat, tono: t + ((i * 7) % 3) * 0.05 }); }
  for (let i = 0; i < 4; i++) g.caja(-Lx / 2 + 6 + i * 5, Ly / 2 + 0.2, H * 0.48, 1.6, 0.6, 2.6, { mat, tono: t });
  if (v === 'roto') { g.poli([[4, 8, zt - 4], [Lx / 2 + 2, 2, zt - 4], [Lx / 2 + 2, 20, zt - 4], [6, 14, zt + 9], [Lx / 2 + 2, 12, zt + 9]], { mat: m, resta: true }); g.elip(8, 12, zt - 2, 4, 5, 2, { mat: 'mu_sello_rojo', tono: -0.3 + late * 0.2 }); cascotes(g, 5, 6, 10, m, Lx / 2 + 8, 10, 2.2); for (let i = 0; i < 3; i++) { const p = g.sub(Lx / 2 + 6 + a.r() * 6, rr(a, -8, 20), 0.6, a.r() * 180); p.elip(0, 0, 0, 1.2, 0.5, 1.4, { mat: 'mu_hierro' }); p.elip(2, 0, 0, 1.2, 1.2, 0.5, { mat: 'mu_hierro' }); } }
  return { piezas: g.ps, resplandor: { c: [0, -6, zt + 3] as V3, r: 18 + late * 5, color } };
}, { cuadros: 6, t: 4 });
/** Arcosolio: nicho en arco dentro del muro con el sarcófago adentro y un fresco en la luneta. */
obj('cri_arcosolio', ['Arcosolio', 'Arched wall tomb'], conDer(['intacto', 'saqueado', 'con_fresco', 'con_velas']), [4, 2], true, (v, f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)).sub(0, -6, 0), b = base(v), m = elegir(a, PIEDRA), ms = elegir(a, SARC);
  muro(g, 64, 92, 18, m);
  g.sub(0, 4, 0).prisma(ojiva(46, 34, 0.5, 6, 6), -6, 12, { mat: m, resta: true });
  for (let i = 0; i < 2; i++) g.sub(0, 9 + i * 1.2, 0).prisma(ojiva(50 + i * 4, 34, 0.5, 6, 6), -0.6, 0.6, { mat: m, tono: 0.06 - i * 0.03 });
  g.sub(0, 9.6, 0).prisma(ojiva(46, 34, 0.5, 6, 6), -2, 2, { mat: m, resta: true });
  // el sarcófago en el nicho, de costado (a lo largo de x)
  const s = g.sub(0, 2, 6, 90);
  cajaSarc(s, 14, 40, 14, ms);
  if (b !== 'saqueado') { const zt = tapaSarc(s, 14, 40, 14, ms); yacente(s.sub(0, 0, zt).esc(0.7), 52, elegir(a, ['dama', 'caballero', 'obispo'] as const), ms); }
  else { s.caja(0, 0, 4, 10, 36, 12, { mat: ms, resta: true }); huesos(g, 6, 18, 4, 0, 12); calavera(g.sub(rr(a, -10, 10), 14, 0, mirar(a)), 3); bloque(g.sub(16, 18, 1, 20, 80), 0, 0, 0, 14, 40, 3, { mat: ms, b: 0.5, j: 1 }); }
  if (b === 'con_fresco') { const zf = 40; g.sub(0, 2.4, 0).prisma(ojiva(40, 0, 0.5, 6, zf), -0.4, 0.4, { mat: 'mu_revoque' }); for (let i = 0; i < 3; i++) { const x = -12 + i * 12; g.elip(x, 2.6, zf + 9, 2.6, 0.4, 5, { mat: elegir(a, ['mu_fresco_rojo', 'mu_fresco_azul', 'mu_fresco_ocre']) }); g.esf(x, 2.7, zf + 15.6, 1.8, { mat: 'mu_fresco_hueso' }); g.cil(x, 2.8, zf + 16, 2.8, 0.3, { mat: 'mu_fresco_oro', eje: [0, 1, 0] }); } }
  if (b === 'con_velas') { for (const x of [-22, 22]) vela(g, x, 4, 6, 6 + a.r() * 4, 1.4, f, 4, x); return { piezas: g.ps, resplandor: { c: [0, 8, 14] as V3, r: 22, color: '#ffb35a' } }; }
  tierra(g, 32, 8, 4, 'mu_tierra', 0, 14);
}, { cuadros: 4, t: 3, huellaPor: { intacto_der: [2, 4], saqueado_der: [2, 4] } });

// ================================================================== columnas, altares y luces
obj('cri_columna_calaveras', ['Columna de calaveras', 'Skull column'], ['entera', 'rota', 'con_velas', 'con_cadenas'], [1, 1], true, (v, f, g, a) => {
  const m = elegir(a, PIEDRA);
  tierra(g, 11, 11, 3, 'mu_tierra');
  bloque(g, 0, 0, 0, 16, 16, 5, { mat: m, tono: -0.06, b: 1, j: 0.6 });
  const H = v === 'rota' ? 34 + a.r() * 12 : 78;
  g.cil(0, 0, 5, 5.4, H, { mat: 'mu_osario' });
  // anillos de cráneos girados de a medio paso, separados por hileras de huesos
  for (let z = 6, k = 0; z < H - 2; z += 7.6, k++) { for (let i = 0; i < 7; i++) { const t = (i / 7) * Math.PI * 2 + (k % 2) * 0.45; calaveraSimple(g.sub(Math.cos(t) * 4.6, Math.sin(t) * 4.6, z, t / GR), 2.4, 'mu_hueso', -0.04); } if (k % 2) for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; g.esf(Math.cos(t) * 6, Math.sin(t) * 6, z - 1.2, 1.1, { mat: 'mu_hueso', tono: -0.12 }); } }
  if (v === 'rota') { g.poli([[-9, -9, H - 4], [9, -9, H + 2], [-9, 9, H], [9, 9, H + 6], [-9, -9, 200], [9, -9, 200], [-9, 9, 200], [9, 9, 200]], { mat: m, resta: true }); huesos(g, 8, 10, 10, 8, 6, 0.9, 2); for (let i = 0; i < 4; i++) calavera(g.sub(rr(a, 6, 14), rr(a, -4, 12), 0, mirar(a)), 2.6); return; }
  g.cil(0, 0, 5 + H, 6, 2.4, { mat: m, r1: 9 }); bloque(g, 0, 0, 7.4 + H, 18, 18, 4, { mat: m, tono: 0.05, b: 0.8, j: 0.4 });
  if (v === 'con_velas') { for (let i = 0; i < 3; i++) { const t = 0.2 + i * 0.7; vela(g, Math.cos(t) * 5, Math.sin(t) * 5, 11.4 + H, 3 + a.r() * 5, 1.2, f, 4, i); } for (let i = 0; i < 4; i++) g.elip(rr(a, 5, 8), rr(a, 5, 8), 9 + H - i * 3, 0.7, 0.7, 2, { mat: 'mu_cera' }); return { piezas: g.ps, resplandor: { c: [0, 0, H + 16] as V3, r: 22, color: '#ffb35a' } }; }
  if (v === 'con_cadenas') { for (let i = 0; i < 3; i++) { const t = 0.1 + i * 0.75; cadena(g, [Math.cos(t) * 6, Math.sin(t) * 6, H - 6 - i * 8], [Math.cos(t + 0.6) * 6.4, Math.sin(t + 0.6) * 6.4, H - 18 - i * 6], 6, 'mu_hierro', 0.8); } }
}, { cuadros: 4, t: 3 });
obj('cri_altar_huesos', ['Altar de huesos', 'Bone altar'], ['con_velas', 'con_craneo', 'sangriento', 'ofrenda'], [3, 2], true, (v, f, g, a) => {
  const m = elegir(a, ['mu_marmol_negro', 'mu_piedra_fria']);
  tierra(g, 24, 14, 4, 'mu_tierra');
  for (let i = 0; i < 2; i++) bloque(g, 0, 2 - i * 2, 0, 50 - i * 6, 30 - i * 6, 3 + i * 3, { mat: m, tono: -0.06 + i * 0.03, b: 1, j: 0.7 });
  // el cuerpo del altar: huesos apilados y fundidos con cráneos al frente
  const cs = [g.bu([0, -2, 10], [16, 8, 7])];
  for (let i = 0; i < 14; i++) { const z = rr(a, 7, 18), y = rr(a, -6, 4); cs.push(g.hu([-16, y, z], [16, y + rr(a, -2, 2), z + rr(a, -2, 2)], 1.2, 1.1)); }
  g.masa(cs, { mat: 'mu_hueso', tono: -0.18, suave: 1.6 });
  for (let i = 0; i < 6; i++) calaveraSimple(g.sub(-14 + i * 5.6, 5.6, 7.6 + (i % 2) * 5, 90 + rr(a, -15, 15)), 2.4, 'mu_hueso', -0.05);
  for (const sx of [-1, 1]) { huesoLargo(g, [sx * 17, 6, 6], [sx * 17, 6, 19], 1.4); calavera(g.sub(sx * 17, 6, 19.4, 60), 2.6); }
  bloque(g, 0, -2, 18.4, 40, 17, 3, { mat: m, b: 0.6, j: 0.4 });
  const zt = 21.4;
  if (v === 'con_craneo' || v === 'ofrenda') { calavera(g.sub(0, -2, zt, 80), 4.4, 'mu_hueso', true, 0.04); for (const sx of [-1, 1]) huesoLargo(g, [sx * 3, -6, zt + 0.8], [sx * 9, 3, zt + 0.8], 1); }
  if (v === 'sangriento') { g.elip(0, -2, zt + 0.1, 12, 6, 0.4, { mat: 'mu_sangre' }); for (let i = 0; i < 5; i++) g.elip(rr(a, -15, 15), 6.6, zt - rr(a, 2, 8), 1, 0.4, rr(a, 2, 5), { mat: 'mu_sangre_seca' }); g.elip(4, 12, 0.3, 7, 4, 0.4, { mat: 'mu_sangre_seca' }); g.poli([[-4, -3, zt], [4, -3, zt], [-4, -1, zt], [4, -1, zt], [6, -2, zt + 0.6]], { mat: 'acero' }); }
  if (v === 'ofrenda') { g.cil(10, -4, zt, 3.6, 2, { mat: 'oro', r1: 4.2, tono: -0.15 }); g.elip(10, -4, zt + 2, 3, 3, 0.5, { mat: 'mu_sangre' }); for (let i = 0; i < 4; i++) g.esf(rr(a, -16, -8), rr(a, -6, 2), zt + 1, 1.1, { mat: elegir(a, ['oro', 'cristal', 'mu_flor']), tono: -0.15 }); }
  const nv = v === 'con_velas' ? 9 : 4;
  for (let i = 0; i < nv; i++) vela(g, rr(a, -17, 17), rr(a, -8, 4), zt, 2 + a.r() * 8, 1 + a.r() * 0.5, f, 4, i);
  g.elip(rr(a, -10, 10), 4, zt - 0.4, 3, 1.6, 0.8, { mat: 'mu_cera', tono: -0.05 });
  return { piezas: g.ps, resplandor: { c: [0, -2, zt + 8] as V3, r: 26, color: '#ffb35a' } };
}, { cuadros: 4, t: 3 });
/** Candelabro de pie en hierro forjado. */
obj('cri_candelabro', ['Candelabro de hierro', 'Iron candelabrum'], ['tres', 'siete', 'corona', 'caido', 'goteado'], [1, 1], true, (v, f, g, a) => {
  const mh = elegir(a, ['mu_hierro', 'mu_hierro', 'mu_oxido']), n = 4;
  tierra(g, 8, 8, 2, 'mu_tierra');
  if (v === 'caido') {
    const s = g.sub(0, 0, 2, a.r() * 360, 84, 'x');
    for (const t of [0, 2.1, 4.2]) s.palo([0, 0, 0], [Math.cos(t) * 6, Math.sin(t) * 6, -2], 0.7, { mat: mh });
    s.palo([0, 0, 0], [0, 0, 40], 0.9, { mat: mh });
    for (const sx of [-1, 1]) { s.palo([0, 0, 34], [sx * 8, 0, 40], 0.6, { mat: mh }); s.cil(sx * 8, 0, 40, 1.8, 0.8, { mat: mh, r1: 2.4 }); }
    for (let i = 0; i < 3; i++) { const p = g.sub(rr(a, -6, 10), rr(a, 6, 14), 1.2, a.r() * 180, 88, 'x'); p.cil(0, 0, -3, 1.2, 6 + a.r() * 4, { mat: 'mu_cera' }); }
    g.elip(4, 10, 0.2, 6, 4, 0.4, { mat: 'mu_cera', tono: -0.1 });
    return;
  }
  for (const t of [0, 2.1, 4.2]) { const tt = t + a.r(); g.palo([0, 0, 6], [Math.cos(tt) * 7, Math.sin(tt) * 7, 0.6], 0.8, { mat: mh }); voluta(g.sub(Math.cos(tt) * 7, Math.sin(tt) * 7, 0, tt / GR), 1.2, 1.4, 1.4, 1, 1, 0.4, mh); }
  g.cil(0, 0, 4, 1.6, 4, { mat: mh, r1: 1 }); g.palo([0, 0, 8], [0, 0, 46], 0.9, { mat: mh });
  for (const z of [16, 30]) g.elip(0, 0, z, 1.8, 1.8, 1.2, { mat: mh });
  const puntos: V3[] = [[0, 0, 48]];
  if (v === 'siete' || v === 'goteado') for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2, r = i % 2 ? 9 : 5.5, z = i % 2 ? 42 : 45; g.palo([0, 0, 38], [Math.cos(t) * r, Math.sin(t) * r, z], 0.55, { mat: mh }); puntos.push([Math.cos(t) * r, Math.sin(t) * r, z + 1]); }
  else if (v === 'corona') { for (let i = 0; i < 12; i++) { const t0 = (i / 12) * Math.PI * 2, t1 = ((i + 1) / 12) * Math.PI * 2; g.palo([Math.cos(t0) * 10, Math.sin(t0) * 10, 42], [Math.cos(t1) * 10, Math.sin(t1) * 10, 42], 0.55, { mat: mh }); } for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + 0.4; g.palo([0, 0, 36], [Math.cos(t) * 10, Math.sin(t) * 10, 42], 0.5, { mat: mh }); } for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; puntos.push([Math.cos(t) * 10, Math.sin(t) * 10, 43]); } }
  else for (const sx of [-1, 1]) { g.palo([0, 0, 38], [sx * 9, 0, 40], 0.6, { mat: mh }); voluta(g, sx * 4.5, 36, 2, 1, sx, 0.4, mh); puntos.push([sx * 9, 0, 41.5]); }
  puntos.forEach((p, i) => { g.cil(p[0], p[1], p[2] - 1.4, 1.7, 1, { mat: mh, r1: 2.3 }); g.palo([p[0], p[1], p[2] - 1.4], [p[0], p[1], p[2] - 3], 0.5, { mat: mh }); vela(g, p[0], p[1], p[2] - 0.4, 3 + a.r() * 5 + (i === 0 ? 2 : 0), 1.1, f, n, i); if (v === 'goteado') g.elip(p[0] + 0.8, p[1] + 0.8, p[2] - 3.5, 0.6, 0.6, 3, { mat: 'mu_cera', tono: 0.05 }); });
  if (v === 'goteado') g.elip(1, 2, 0.2, 7, 6, 0.6, { mat: 'mu_cera', tono: -0.04 });
  return { piezas: g.ps, resplandor: { c: [0, 0, 46] as V3, r: 24, color: '#ffb35a' } };
}, { cuadros: 4, t: 3 });
obj('cri_candelabro_pared', ['Candelabro de pared', 'Wall candle sconce'], conDer(['dos', 'tres', 'apagado', 'con_calavera']), [3, 1], true, (v, f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, PIEDRA), mh = elegir(a, ['mu_hierro', 'mu_oxido']);
  muro(g, 48, 84, 12, m);
  const s = g.sub(0, 6, 44);
  s.caja(0, 0, -6, 6, 1.4, 14, { mat: mh }); s.cil(0, 0.8, 1, 1.8, 1, { mat: mh, eje: [0, 1, 0] });
  const xs = b === 'tres' ? [-8, 0, 8] : [-7, 7];
  if (b === 'con_calavera') calavera(s.sub(0, 1, -10, 90), 3.2);
  xs.forEach((x, i) => { s.palo([0, 0.8, -2], [x, 6, 2], 0.6, { mat: mh }); s.cil(x, 6, 2, 2.2, 0.8, { mat: mh, r1: 2.8 }); vela(s, x, 6, 2.8, 4 + a.r() * 6, 1.2, f, 4, i, b !== 'apagado'); s.elip(x + 1, 6.6, 0.2, 0.6, 0.6, 3 + a.r() * 2, { mat: 'mu_cera', tono: 0.05 }); });
  g.elip(0, 6.6, 2, 6, 2, 0.6, { mat: 'mu_cera', tono: -0.06 });
  tierra(g, 22, 6, 3, 'mu_tierra', 0, 9);
  if (b === 'apagado') return;
  const r = g.P(0, 12, 54);
  return { piezas: g.ps, resplandor: { c: r, r: 22, color: '#ffb35a' } };
}, { cuadros: 4, t: 3 });
/** Lámpara de aceite que cuelga del techo con su cadena (el techo está fuera de cuadro, a 110). */
obj('cri_lampara_aceite', ['Lámpara de aceite colgante', 'Hanging oil lamp'], ['simple', 'triple', 'de_craneo', 'rota', 'corona'], [1, 1], false, (v, f, g, a) => {
  const mh = elegir(a, ['mu_hierro', 'mu_bronce', 'bronce']), n = 6, z = 52 + a.r() * 10;
  const mece = onda(f, n) * 3;
  const s = g.sub(0, 0, 110, 0, mece, 'y');
  cadena(s, [0, 0, 0], [0, 0, -(110 - z) + 12], 0, 'mu_hierro', 0.9);
  const l = s.sub(0, 0, -(110 - z)).esc(1.5);
  const brasa = (x: number, y: number, zz: number, k: number) => { if (v === 'rota') return; llama(l, x, y, zz, 1.2, 4, f, n, k); };
  if (v === 'de_craneo') { calavera(l.sub(0, 0, -4, 45).esc(1), 4, 'mu_hueso'); for (const t of [0, 2.1, 4.2]) l.palo([Math.cos(t) * 3, Math.sin(t) * 3, 4], [0, 0, 8], 0.4, { mat: 'mu_hierro' }); brasa(0, 0, 4.2, 0); }
  else if (v === 'triple' || v === 'corona') {
    const k = v === 'corona' ? 6 : 3, R = v === 'corona' ? 11 : 8;
    for (let i = 0; i < k; i++) { const t = (i / k) * Math.PI * 2; l.palo([0, 0, 8], [Math.cos(t) * R, Math.sin(t) * R, 0], 0.4, { mat: 'mu_hierro' }); const c = l.sub(Math.cos(t) * R, Math.sin(t) * R, 0); c.cil(0, 0, -2.6, 1.2, 1.6, { mat: mh, r1: 3 }); c.elip(0, 0, -0.6, 3, 3, 0.8, { mat: mh }); brasa(Math.cos(t) * R, Math.sin(t) * R, 0, i); }
    if (v === 'corona') for (let i = 0; i < 12; i++) { const t0 = (i / 12) * Math.PI * 2, t1 = ((i + 1) / 12) * Math.PI * 2; l.palo([Math.cos(t0) * R, Math.sin(t0) * R, -0.8], [Math.cos(t1) * R, Math.sin(t1) * R, -0.8], 0.5, { mat: mh }); }
  } else {
    for (const t of [0, 2.1, 4.2]) l.palo([Math.cos(t) * 4, Math.sin(t) * 4, 0], [0, 0, 8], 0.35, { mat: 'mu_hierro' });
    l.cil(0, 0, -4, 1.4, 2, { mat: mh, r1: 4.4 }); l.elip(0, 0, -0.4, 4.6, 4.6, 1.2, { mat: mh }); l.cil(0, 0, -5, 0.6, 1.2, { mat: mh });
    if (v === 'rota') { l.poli([[1, -5, -5], [6, -5, -5], [1, 5, -5], [6, 5, -5], [1, -5, 2], [6, -5, 2]], { mat: mh, resta: true }); for (let i = 0; i < 4; i++) g.elip(rr(a, -6, 6), rr(a, -6, 6), 0.1, 1.6 + a.r() * 2, 1.4 + a.r() * 2, 0.2, { mat: 'mu_sangre_seca', tono: -0.05 }); }
    brasa(0, 0, 0.6, 0);
  }
  const res = v === 'rota' ? undefined : { c: s.P(0, 0, -(110 - z) + 3), r: 30, color: '#ffb048' };
  return { piezas: g.ps, resplandor: res };
}, { cuadros: 6, t: 4 });
obj('cri_brasero_huesos', ['Brasero de huesos', 'Bone brazier'], ['verde', 'rojo', 'azul', 'apagado'], [1, 1], true, (v, f, g, a) => {
  const n = 6, mat = v === 'verde' ? 'fuego_verde' : v === 'azul' ? 'fuego_azul' : 'fuego';
  tierra(g, 10, 10, 3, 'mu_tierra');
  for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2 + a.r(); huesoLargo(g, [Math.cos(t) * 8, Math.sin(t) * 8, 0.8], [Math.cos(t) * 3, Math.sin(t) * 3, 20], 1.3); }
  const cs = [g.bu([0, 0, 22], [8, 8, 4])];
  g.masa(cs, { mat: 'mu_hueso', tono: -0.12, suave: 1 });
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; calaveraSimple(g.sub(Math.cos(t) * 7.6, Math.sin(t) * 7.6, 20.6, t / GR), 2.2, 'mu_hueso', -0.06); }
  g.cil(0, 0, 23, 6.6, 3, { mat: 'mu_brasa', tono: v === 'apagado' ? -0.6 : -0.2 });
  if (v === 'apagado') { g.elip(0, 0, 26, 6, 6, 1.2, { mat: 'mu_cal', tono: -0.35 }); return; }
  for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + 0.4; llama(g, Math.cos(t) * 2.8, Math.sin(t) * 2.8, 25, 2.4, 9 + a.r() * 4, f, n, i, mat); }
  llama(g, 0, 0, 25, 3.2, 14, f, n, 5, mat);
  return { piezas: g.ps, resplandor: { c: [0, 0, 32] as V3, r: 28, color: v === 'verde' ? '#70e08a' : v === 'azul' ? '#6ab4ff' : '#ff9a3a' } };
}, { cuadros: 6, t: 3 });

// ================================================================== sellos, puertas, rejas y escaleras
const SELLOS: Record<string, [string, string]> = { runa: ['runa', '#5ac8f0'], sello: ['mu_sello_rojo', '#ff5a3a'], verde: ['mu_sello_verde', '#70e08a'], magia: ['magia', '#b46ae8'] };
/** Círculo de sello en el plano x-z del grupo (cara +y): anillos, runas alrededor y la estrella del centro. */
function selloCirculo(g: G, R: number, mat: string, t: number, f: number) {
  for (let i = 0; i < 24; i++) { const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2; g.palo([Math.cos(a0) * R, 0, Math.sin(a0) * R], [Math.cos(a1) * R, 0, Math.sin(a1) * R], 0.45, { mat, tono: t }); g.palo([Math.cos(a0) * R * 0.78, 0, Math.sin(a0) * R * 0.78], [Math.cos(a1) * R * 0.78, 0, Math.sin(a1) * R * 0.78], 0.35, { mat, tono: t - 0.05 }); }
  for (let i = 0; i < 5; i++) { const a0 = (i / 5) * Math.PI * 2 + Math.PI / 2, a1 = ((i + 2) / 5) * Math.PI * 2 + Math.PI / 2; g.palo([Math.cos(a0) * R * 0.76, 0, Math.sin(a0) * R * 0.76], [Math.cos(a1) * R * 0.76, 0, Math.sin(a1) * R * 0.76], 0.4, { mat, tono: t }); }
  for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2 + f * 0.05; g.caja(Math.cos(an) * R * 0.89, 0, Math.sin(an) * R * 0.89 - 0.6, 0.9, 0.6, 1.4, { mat, tono: t + 0.1, giro: 0 }); }
}
obj('cri_puerta_sellada', ['Puerta sellada de la cripta', 'Sealed crypt door'], ['runa', 'sello', 'cadenas', 'rota', 'runa_der', 'sello_der'], [5, 2], true, (v, f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)).sub(0, -4, 0), b = base(v), m = elegir(a, PIEDRA), W = 30, hr = 34;
  muro(g, 80, 100, 16, m);
  for (let i = 3; i >= 0; i--) g.sub(0, 8 + i * 1.2, 0).prisma(ojiva(W + 4 + i * 5, hr, 0.85, 6, 5), -1.2, 1.2, { mat: m, tono: 0.03 * (4 - i) });
  g.sub(0, 8, 0).prisma(ojiva(W, hr, 0.85, 6, 5), -6, 9, { mat: m, resta: true });
  const late = 0.5 + 0.5 * onda(f, 6), t = -0.15 + late * 0.25;
  const [mat, color] = SELLOS[b === 'cadenas' ? 'magia' : b === 'rota' ? 'sello' : b] ?? SELLOS.runa;
  if (b === 'rota') {
    // la losa de la puerta partida y caída hacia afuera, y el sello roto que todavía late
    for (let i = 0; i < 3; i++) { const p = g.sub(rr(a, -14, 14), 18 + i * 6, 1, rr(a, -30, 30), 80 + rr(a, -6, 6)); bloque(p, 0, 0, 0, 12 + a.r() * 6, 4, 14 + a.r() * 8, { mat: 'mu_bloques_frio', b: 0.8, j: 1.2 }); }
    g.caja(0, 2, 5, W, 1, hr + 10, { mat: 'negro' });
    selloCirculo(g.sub(4, 22, 1.2, 0, -84, 'x'), 7, mat, t - 0.1, f);
    cascotes(g, 10, 20, 8, m, 0, 24, 2.6);
    return { piezas: g.ps, resplandor: { c: g.P(4, 22, 3), r: 22, color } };
  }
  // hoja de piedra lisa con el sello grande
  const p = g.sub(0, 4, 5);
  p.prisma(ojiva(W, hr, 0.85, 6, 0), -1.6, 1.6, { mat: 'mu_marmol_negro' });
  p.caja(0, 1.4, 0, 0.8, 1, hr + 10, { mat: 'negro' });
  selloCirculo(p.sub(0, 1.8, 22), 10, mat, t, f);
  if (b === 'cadenas') { for (const z of [12, 30]) cadena(p, [-W / 2 - 4, 3, z + 4], [W / 2 + 4, 3, z - 2], 3, 'mu_hierro', 1); p.caja(0, 3.6, 16, 4, 2.2, 5, { mat: 'mu_hierro', tono: 0.08 }); for (const x of [-W / 2 - 4, W / 2 + 4]) p.cil(x, 2, 18, 1.6, 2.4, { mat: 'mu_hierro', eje: [0, 1, 0] }); }
  tierra(g, 30, 8, 4, 'mu_tierra', 0, 14);
  return { piezas: g.ps, resplandor: { c: g.P(0, 12, 27), r: 16 + late * 4, color } };
}, { cuadros: 6, t: 4, huellaPor: { runa_der: [2, 5], sello_der: [2, 5] } });
obj('cri_sello_suelo', ['Sello en el piso', 'Floor seal'], ['runa', 'sello', 'verde', 'roto', 'apagado'], [3, 3], false, (v, f, g, a) => {
  const late = 0.5 + 0.5 * onda(f, 6), t = -0.2 + late * 0.3;
  const [mat, color] = SELLOS[v === 'roto' ? 'sello' : v === 'apagado' ? 'runa' : v] ?? SELLOS.runa;
  const m = elegir(a, ['mu_marmol_negro', 'mu_granito']);
  bloque(g, 0, 0, -0.6, 46, 46, 1.4, { mat: m, b: 0.6, j: 0.5 });
  for (let i = 0; i < 4; i++) bloque(g, (i % 2 ? 1 : -1) * 11.5, (i < 2 ? 1 : -1) * 11.5, -0.4, 22.6, 22.6, 1.4, { mat: m, b: 0.5, j: 0.6, tono: (a.r() - 0.5) * 0.08 });
  const s = g.sub(0, 0, 1.2, 0, -90, 'x');
  selloCirculo(s, 18, v === 'apagado' ? 'mu_hierro' : mat, v === 'apagado' ? 0 : t, f);
  if (v === 'roto') { g.poli([[-4, -20, -1], [6, -20, -1], [2, 20, -1], [-6, 20, -1], [-4, -20, 3], [6, -20, 3], [2, 20, 3], [-6, 20, 3]], { mat: m, resta: true }); for (let i = 0; i < 4; i++) bloque(g, rr(a, -4, 4), rr(a, -18, 18), 0, 4, 5, 2.4, { mat: m, giro: a.r() * 90, b: 0.6, j: 1 }); g.elip(0, 0, 0.2, 3, 16, 0.4, { mat: 'mu_sello_rojo', tono: -0.4 + late * 0.2 }); }
  for (let i = 0; i < 5; i++) { const an = (i / 5) * Math.PI * 2 + Math.PI / 2; vela(g, Math.cos(an) * 21, Math.sin(an) * 21, 0.8, 3 + a.r() * 4, 1.1, f, 6, i, v !== 'apagado'); }
  if (v === 'apagado') return { piezas: g.ps };
  return { piezas: g.ps, resplandor: { c: [0, 0, 4] as V3, r: 30 + late * 6, color } };
}, { cuadros: 6, t: 4 });
/** Reja de cripta con barrotes cuadrados y travesaños remachados. */
obj('cri_reja', ['Reja de la cripta', 'Crypt iron grille'], ['tramo', 'puerta_cerrada', 'puerta_abierta', 'doblada'], [3, 1], true, (v, _f, g, a) => {
  const mh = elegir(a, ['mu_hierro', 'mu_hierro', 'mu_oxido']), m = elegir(a, PIEDRA), H = 64;
  for (const s of [-1, 1]) { bloque(g, s * 22, 0, 0, 7, 9, H + 6, { mat: m, b: 0.8, j: 0.5 }); bloque(g, s * 22, 0, H + 5, 9, 11, 3, { mat: m, tono: 0.05, b: 0.6, j: 0.4 }); }
  g.caja(0, 0, H - 2, 38, 2, 2.4, { mat: mh });
  for (let x = -16; x <= 16; x += 6) for (const z of [8, H - 1]) g.esf(x, 1.2, z, 0.7, { mat: mh, tono: 0.1 });
  const barras = (s: G, x0: number, x1: number) => { for (let x = x0; x <= x1 + 0.01; x += 3.2) { if (v === 'doblada' && Math.abs(x) < 6) { s.palo([x, 0, 0], [x * 1.4, 4 + (6 - Math.abs(x)) * 0.6, 26], 0.75, { mat: mh }); s.palo([x * 1.4, 4 + (6 - Math.abs(x)) * 0.6, 26], [x, 0, H - 2], 0.75, { mat: mh }); continue; } s.caja(x, 0, 0, 1.3, 1.3, H - 1, { mat: mh, giro: 45 }); } for (const z of [8, 34]) s.caja((x0 + x1) / 2, 0, z, x1 - x0 + 1.6, 1.8, 2, { mat: mh }); };
  if (v.startsWith('puerta')) {
    barras(g, -18.4, -11);
    const h = g.sub(-9.6, 0, 0, v === 'puerta_abierta' ? -70 - a.r() * 15 : 0);
    barras(h, 0.6, 19);
    h.caja(17, 1.4, 22, 3, 2, 5, { mat: mh, tono: 0.1 });
    for (const z of [8, 50]) h.cil(0, 0, z, 1.4, 4, { mat: mh });
  } else barras(g, -18.4, 18.4);
  tierra(g, 24, 6, 3, 'mu_tierra');
  if (v === 'doblada') { huesos(g, 3, 10, 4, 0, 10); g.elip(0, 12, 0.2, 6, 4, 0.4, { mat: 'mu_sangre_seca' }); }
});
conVarianteY('cri_reja');
obj('cri_escalera_caracol', ['Escalera de caracol', 'Spiral staircase'], ['sube', 'baja', 'rota', 'con_vela'], [3, 3], true, (v, f, g, a) => {
  const m = elegir(a, PIEDRA), R = 20, alto = v === 'baja' ? 0 : 96;
  if (v === 'baja') {
    // la boca en el piso con la baranda y los escalones que se hunden en lo negro
    bloque(g, 0, 0, 0, 2 * R + 10, 2 * R + 10, 3, { mat: m, b: 1, j: 0.8 });
    g.cil(0, 0, -2, R, 8, { mat: m, resta: true });
    g.cil(0, 0, -1, R, 1, { mat: 'negro' });
    for (let i = 0; i < 7; i++) { const t = (i / 7) * Math.PI * 1.4 + 0.3; const s = g.sub(0, 0, 2.2 - i * 0.4, t / GR); s.poli([[2, -1.5, -0.6], [R, -4, -0.6], [R, 4, -0.6], [2, 1.5, -0.6], [2, -1.5, 0.6], [R, -4, 0.6], [R, 4, 0.6], [2, 1.5, 0.6]], { mat: m, tono: -0.05 - i * 0.07 }); }
    g.cil(0, 0, -1, 3, 4, { mat: m, tono: -0.1 });
    for (let i = 0; i < 12; i++) { const t0 = Math.PI * 0.9 + (i / 12) * Math.PI * 1.1, t1 = Math.PI * 0.9 + ((i + 1) / 12) * Math.PI * 1.1; g.palo([Math.cos(t0) * (R + 2), Math.sin(t0) * (R + 2), 14], [Math.cos(t1) * (R + 2), Math.sin(t1) * (R + 2), 14], 0.7, { mat: 'mu_hierro' }); if (i % 2 === 0) g.palo([Math.cos(t0) * (R + 2), Math.sin(t0) * (R + 2), 3], [Math.cos(t0) * (R + 2), Math.sin(t0) * (R + 2), 14], 0.55, { mat: 'mu_hierro' }); }
    return;
  }
  g.cil(0, 0, 0, 4, alto, { mat: m });
  const n = v === 'rota' ? 14 : 22;
  for (let i = 0; i < n; i++) {
    const t = (i / 12) * Math.PI * 2, z = i * (alto / 22);
    const s = g.sub(0, 0, z, t / GR);
    s.poli([[3, -2, 0], [R, -5.4, 0], [R, 5.4, 0], [3, 2, 0], [3, -2, 4.4], [R, -5.4, 4.4], [R, 5.4, 4.4], [3, 2, 4.4]], { mat: m, tono: (a.r() - 0.5) * 0.08 });
    s.poli([[3, -2, -alto / 22 + 4.4], [R, -5.4, -alto / 22 + 4.4], [3, -2, 0.1], [R, -5.4, 0.1], [R, 5.4, 0.1], [3, 2, 0.1]], { mat: m, tono: -0.1 });
    if (i % 2 === 0) { s.palo([R - 1, 0, 4.4], [R - 1, 0, 18], 0.6, { mat: 'mu_hierro' }); }
  }
  for (let i = 0; i < n - 1; i++) { const t0 = (i / 12) * Math.PI * 2, t1 = ((i + 1) / 12) * Math.PI * 2; g.palo([Math.cos(t0) * (R - 1), Math.sin(t0) * (R - 1), i * (alto / 22) + 18], [Math.cos(t1) * (R - 1), Math.sin(t1) * (R - 1), (i + 1) * (alto / 22) + 18], 0.65, { mat: 'mu_hierro' }); }
  if (v === 'rota') { cascotes(g, 12, 16, 16, m, 8, 8, 3.4); for (let i = 0; i < 3; i++) { const s = g.sub(rr(a, 8, 24), rr(a, 0, 20), 0.6, a.r() * 180, rr(a, -20, 20), 'y'); s.poli([[0, -2, 0], [14, -5, 0], [14, 5, 0], [0, 2, 0], [0, -2, 4], [14, -5, 4], [14, 5, 4], [0, 2, 4]], { mat: m }); } }
  if (v === 'con_vela') { const t = (4 / 12) * Math.PI * 2; vela(g, Math.cos(t) * 12, Math.sin(t) * 12, 4 * (alto / 22) + 4.4, 4, 1.3, f, 4, 0); return { piezas: g.ps, resplandor: { c: [Math.cos(t) * 12, Math.sin(t) * 12, 4 * (alto / 22) + 12] as V3, r: 24, color: '#ffb35a' } }; }
}, { cuadros: 4, t: 3 });

// ================================================================== huesos, sangre, telarañas y cadenas
obj('cri_pila_craneos', ['Pila de cráneos', 'Skull heap'], ['conica', 'muro_bajo', 'desparramada', 'con_vela'], [2, 2], true, (v, f, g, a) => {
  tierra(g, 16, 15, 4, 'mu_tierra');
  if (v === 'muro_bajo') { for (let k = 0; k < 4; k++) for (let i = 0; i < 7 - k; i++) calavera(g.sub(-14 + k * 3.2 + i * 6.6 + rr(a, -0.5, 0.5), rr(a, -1, 1), k * 5.6, 70 + rr(a, -25, 25), rr(a, -6, 6)), 3.1, 'mu_hueso', true, -0.04); huesos(g, 5, 14, 4, 0, 8); return; }
  if (v === 'desparramada') { g.elip(0, 0, 0, 13, 11, 3, { mat: 'mu_hueso', tono: -0.32 }); for (let i = 0; i < 14; i++) { const t = a.r() * 6.28, q = a.r(); calavera(g.sub(Math.cos(t) * 15 * q, Math.sin(t) * 13 * q, q < 0.6 ? 1.6 : 0, mirar(a), rr(a, -40, 40), 'y'), 3, 'mu_hueso', a.r() < 0.6); } huesos(g, 10, 14, 12, 0, 0, 1, 3); return; }
  // cono de cráneos en anillos
  let z = 0;
  for (let k = 0; k < 5; k++) { const R = 12 - k * 2.8, n = Math.max(1, Math.round((2 * Math.PI * R) / 6.4)); for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 + k * 0.4; calavera(g.sub(Math.cos(t) * R, Math.sin(t) * R, z, t / GR + rr(a, -30, 30), rr(a, -8, 8)), 3.2, 'mu_hueso', k < 2, -0.06 + k * 0.03); } z += 5.4; }
  g.elip(0, 0, 0, 10, 10, z - 3, { mat: 'mu_osario' });
  if (v === 'con_vela') { vela(g, 0, 0, z, 6, 1.6, f, 4, 0); for (let i = 0; i < 5; i++) g.elip(rr(a, -3, 3), rr(a, -3, 3), z - rr(a, 1, 8), 0.8, 0.8, 2.4, { mat: 'mu_cera', tono: 0.05 }); return { piezas: g.ps, resplandor: { c: [0, 0, z + 8] as V3, r: 24, color: '#ffb35a' } }; }
}, { cuadros: 4, t: 3 });
/** Fresco desvaído en un tramo de pared: la danza de la muerte, el juicio, un santo o lo que queda. */
obj('cri_fresco', ['Fresco desvaído', 'Faded fresco'], conDer(['danza_macabra', 'juicio', 'santo', 'borrado']), [4, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, PIEDRA);
  muro(g, 64, 90, 12, m);
  const y = 6.3, z0 = 14;
  bloque(g, 0, y - 0.6, z0, 52, 1.6, 60, { mat: 'mu_revoque', b: 0.3, j: 0.4 });
  const fy = y + 0.3;
  // figuras pintadas: cuerpo (manto), cabeza y la aureola o el cráneo
  const fig = (x: number, z: number, h: number, manto: string, calaca: boolean, brazo = 0) => {
    g.poli([[x - h * 0.22, fy, z], [x + h * 0.22, fy, z], [x - h * 0.12, fy, z + h * 0.7], [x + h * 0.12, fy, z + h * 0.7], [x - h * 0.22, fy + 0.2, z], [x + h * 0.22, fy + 0.2, z]], { mat: manto, tono: (a.r() - 0.5) * 0.1 });
    g.elip(x, fy, z + h * 0.8, h * 0.11, 0.3, h * 0.12, { mat: calaca ? 'mu_fresco_hueso' : 'mu_fresco_ocre', tono: calaca ? 0.1 : 0 });
    if (calaca) for (const s of [-1, 1]) g.esf(x + s * h * 0.04, fy + 0.2, z + h * 0.82, h * 0.025, { mat: 'negro' });
    if (brazo) g.palo([x, fy, z + h * 0.62], [x + brazo * h * 0.32, fy, z + h * 0.72], h * 0.03, { mat: calaca ? 'mu_fresco_hueso' : 'mu_fresco_ocre' });
  };
  if (b === 'danza_macabra') { for (let i = 0; i < 5; i++) fig(-20 + i * 10, z0 + 8 + (i % 2) * 2, 30, i % 2 ? elegir(a, ['mu_fresco_rojo', 'mu_fresco_azul']) : 'mu_fresco_hueso', i % 2 === 0, i % 2 ? -1 : 1); g.caja(0, fy, z0 + 50, 46, 0.4, 3, { mat: 'mu_fresco_rojo', tono: -0.1 }); letras(g, -18, 18, fy + 0.2, z0 + 52.6, 1, 'mu_fresco_rojo', 2, 0.9); }
  else if (b === 'juicio') { fig(0, z0 + 22, 34, 'mu_fresco_rojo', false); g.cil(0, fy - 0.2, z0 + 50, 6, 0.4, { mat: 'mu_fresco_oro', eje: [0, 1, 0] }); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) fig(s * (12 + i * 7), z0 + 4 + (s < 0 ? 18 : 0), 16, s < 0 ? 'mu_fresco_azul' : 'mu_fresco_hueso', s > 0); g.elip(16, fy, z0 + 6, 9, 0.3, 4, { mat: 'mu_fresco_rojo', tono: 0.05 }); }
  else if (b === 'santo') { g.sub(0, fy - 0.3, 0).prisma(ojiva(28, 34, 0.5, 5, z0 + 4), -0.2, 0.2, { mat: 'mu_fresco_azul' }); fig(0, z0 + 6, 42, 'mu_fresco_rojo', false, 1); g.cil(0, fy - 0.1, z0 + 6 + 42 * 0.82, 6, 0.4, { mat: 'mu_fresco_oro', eje: [0, 1, 0] }); }
  else { fig(-10, z0 + 8, 30, 'mu_fresco_azul', false); fig(12, z0 + 6, 30, 'mu_fresco_hueso', true, -1); }
  // el revoque saltado en manchas
  for (let i = 0; i < (b === 'borrado' ? 14 : 6); i++) g.elip(rr(a, -24, 24), fy + 0.4, rr(a, z0 + 2, z0 + 58), 2 + a.r() * 5, 0.5, 2 + a.r() * 4, { mat: m, tono: -0.05 });
  for (let i = 0; i < 4; i++) g.elip(rr(a, -20, 20), 9, 0.4, 2, 1.6, 0.6, { mat: 'mu_revoque', tono: -0.1 });
  tierra(g, 30, 6, 3, 'mu_tierra', 0, 9);
});
/** Telaraña: hilos radiales y la espiral, en un plano que se ve en diagonal. */
function telarana(g: G, R: number, ang0: number, ang1: number) {
  const a = g.a, nr = 9;
  const rad: number[] = []; for (let i = 0; i < nr; i++) rad.push(ang0 + ((ang1 - ang0) * i) / (nr - 1) + (a.r() - 0.5) * 0.1);
  for (const t of rad) g.palo([0, 0, 0], [Math.cos(t) * R, 0, Math.sin(t) * R], 0.16, { mat: 'mu_telarana', tono: 0.1 });
  for (let k = 1; k < 9; k++) { const r = (R * k) / 9; for (let i = 0; i < nr - 1; i++) { const r0 = r * (0.92 + a.r() * 0.12), r1 = r * (0.92 + a.r() * 0.12); g.palo([Math.cos(rad[i]) * r0, 0, Math.sin(rad[i]) * r0], [Math.cos(rad[i + 1]) * r1, 0, Math.sin(rad[i + 1]) * r1], 0.13, { mat: 'mu_telarana' }); } }
}
obj('cri_telarana', ['Telaraña', 'Cobweb'], ['esquina', 'colgante', 'grande', 'con_arana', 'entre_columnas'], [1, 1], false, (v, f, g, a) => {
  if (v === 'esquina' || v === 'con_arana' || v === 'grande') {
    // en la esquina de atrás: el plano corta entre las dos paredes
    const R = v === 'grande' ? 34 : 22, z = 60 + a.r() * 20;
    telarana(g.sub(-8, -8, z, -45), R, -Math.PI * 0.5, -Math.PI * 0.08);
    telarana(g.sub(-8, -8, z, -45), R * 0.9, Math.PI + Math.PI * 0.08, Math.PI * 1.5);
    for (let i = 0; i < 4; i++) g.palo([-8 + rr(a, -8, 8), -8, z - rr(a, 0, 10)], [-8 + rr(a, -10, 10), -8 + rr(a, 0, 6), z - 20 - a.r() * 16], 0.14, { mat: 'mu_telarana', tono: -0.05 });
    if (v === 'con_arana') { const s = g.sub(-4, -4, z - 12 + onda(f, 8) * 1.5, 30); s.masa([s.bu([0, 0, 0], [1.6, 1.4, 1.3]), s.bu([1.8, 0, 0.2], [1, 1, 0.9])], { mat: 'negro', suave: 0.5 }); for (const sy of [-1, 1]) for (let i = 0; i < 4; i++) { const x = 1 - i * 0.8; s.palo([x, sy * 0.8, 0], [x + (i < 2 ? 1 : -1) * 1.2, sy * 3, 1.2], 0.25, { mat: 'negro' }); s.palo([x + (i < 2 ? 1 : -1) * 1.2, sy * 3, 1.2], [x + (i < 2 ? 1.8 : -1.8), sy * 4, -1.4], 0.22, { mat: 'negro' }); } for (const sy of [-1, 1]) s.esf(2.5, sy * 0.4, 0.4, 0.28, { mat: 'mu_sello_rojo' }); s.palo([0, 0, 0], [0, 0, 12], 0.1, { mat: 'mu_telarana' }); }
    g.esf(0, 0, 0.2, 0.3, { mat: 'mu_telarana' });
    return { piezas: g.ps, sinSombra: true };
  }
  if (v === 'colgante') { for (let i = 0; i < 9; i++) { const x = rr(a, -10, 10), y = rr(a, -10, 10), z = 90 + a.r() * 10, L = 20 + a.r() * 30; g.palo([x, y, z], [x + rr(a, -2, 2), y + rr(a, -2, 2), z - L], 0.25, { mat: 'mu_telarana', tono: -0.05 }); g.elip(x, y, z - L, 0.6, 0.6, 1.2, { mat: 'mu_telarana' }); } g.esf(0, 0, 0.2, 0.3, { mat: 'mu_telarana' }); return { piezas: g.ps, sinSombra: true }; }
  // entre dos columnitas: una red que cuelga con polvo
  for (const s of [-1, 1]) { bloque(g, s * 7, 0, 0, 4, 4, 36, { mat: elegir(a, PIEDRA), b: 0.5, j: 0.4 }); }
  const s = g.sub(0, 0, 34, 45);
  telarana(s.sub(-5, 0, 0), 14, -Math.PI * 0.5, 0);
  telarana(s.sub(5, 0, 0), 14, Math.PI, Math.PI * 1.5);
  return { piezas: g.ps };
}, { cuadros: 8, t: 4 });
obj('cri_sangre_seca', ['Sangre seca', 'Dried blood'], ['charco', 'rastro', 'salpicadura', 'con_huesos', 'manos'], [2, 2], false, (v, _f, g, a) => {
  const mancha = (x: number, y: number, rx: number, ry: number, fresca = false) => { g.elip(x, y, 0, rx, ry, 0.3, { mat: fresca ? 'mu_sangre' : 'mu_sangre_seca', giro: a.r() * 180 }); for (let i = 0; i < 4; i++) { const t = a.r() * 6.28; g.elip(x + Math.cos(t) * rx * 0.9, y + Math.sin(t) * ry * 0.9, 0, rx * (0.2 + a.r() * 0.3), ry * (0.2 + a.r() * 0.3), 0.25, { mat: 'mu_sangre_seca', tono: -0.05 }); } };
  if (v === 'charco' || v === 'con_huesos') { mancha(0, 0, 12 + a.r() * 4, 9 + a.r() * 4, a.r() < 0.5); g.elip(0, 0, 0.2, 6, 5, 0.25, { mat: 'mu_sangre', tono: 0.1 }); }
  if (v === 'rastro') { let x = -18, y = -12; for (let i = 0; i < 8; i++) { mancha(x, y, 3 + a.r() * 3, 2 + a.r() * 2); x += 4 + a.r() * 2; y += 3 + a.r() * 2; } }
  if (v === 'salpicadura') { mancha(0, 0, 6, 5, true); for (let i = 0; i < 18; i++) { const t = a.r() * 6.28, d = 6 + a.r() * 14; g.elip(Math.cos(t) * d, Math.sin(t) * d, 0, 0.8 + a.r() * 1.4, 0.5 + a.r(), 0.25, { mat: 'mu_sangre_seca', giro: t / GR }); } }
  if (v === 'con_huesos') { huesos(g, 5, 10, 8, 0, 0, 0.9, 2); calavera(g.sub(rr(a, -4, 4), rr(a, -4, 4), 0, mirar(a)), 3.2, 'mu_hueso', false); costillar(g.sub(6, -4, 0, a.r() * 180), 4); }
  if (v === 'manos') { mancha(0, 0, 8, 6); for (let i = 0; i < 4; i++) { const s = g.sub(rr(a, -14, 14), rr(a, -12, 12), 0, a.r() * 360); s.elip(0, 0, 0, 2.2, 1.8, 0.3, { mat: 'mu_sangre' }); for (let k = 0; k < 4; k++) s.palo([1.6, -1.4 + k * 0.9, 0.1], [4 - Math.abs(k - 1.5) * 0.4, -1.8 + k * 1.2, 0.1], 0.4, { mat: 'mu_sangre' }); s.palo([0, 1.6, 0.1], [1.8, 3.4, 0.1], 0.45, { mat: 'mu_sangre' }); } }
}, { plano: true });
obj('cri_cadenas_pared', ['Cadenas en la pared', 'Wall shackles'], conDer(['vacias', 'con_esqueleto', 'rotas', 'gancho']), [3, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, PIEDRA);
  muro(g, 48, 84, 12, m);
  const argolla = (x: number, z: number) => { g.cil(x, 6, z, 1.6, 1.2, { mat: 'mu_hierro', eje: [0, 1, 0] }); g.cil(x, 7, z - 2.4, 2, 0.9, { mat: 'mu_hierro', eje: [0, 1, 0] }); g.cil(x, 6.8, z - 2.4, 1.3, 1.6, { mat: 'mu_hierro', resta: true, eje: [0, 1, 0] }); };
  for (const x of [-10, 10]) argolla(x, 54);
  for (const x of [-7, 7]) argolla(x, 12);
  if (b === 'con_esqueleto') {
    const s = g.sub(0, 9, 0);
    calavera(s.sub(0.5, 0, 42, 90, 22, 'x'), 3.2);
    s.palo([0, -0.5, 40], [0, 0, 22], 1.1, { mat: 'mu_hueso' });
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) s.palo([0, -0.6, 37 - i * 3], [sx * 5, 0.6, 35.6 - i * 3], 0.8, { mat: 'mu_hueso', tono: -0.04 });
    s.elip(0, 0, 20.6, 4.4, 2.4, 2, { mat: 'mu_hueso' });
    for (const sx of [-1, 1]) { huesito(s, [sx * 5, -0.5, 39], [sx * 9, -1, 46], 1); huesito(s, [sx * 9, -1, 46], [sx * 10, -2.4, 52], 0.8); huesito(s, [sx * 2.4, 0, 20], [sx * 4.6, 1.6, 8], 1.2); huesito(s, [sx * 4.6, 1.6, 8], [sx * 6, 3, 1], 1); }
    for (const sx of [-1, 1]) cadena(g, [sx * 10, 7, 51.6], [sx * 10, 9, 51], 0, 'mu_hierro', 0.7);
  } else if (b === 'gancho') {
    g.palo([0, 6, 60], [0, 14, 60], 1, { mat: 'mu_hierro' }); g.palo([0, 14, 60], [0, 14, 52], 0.8, { mat: 'mu_hierro' }); g.palo([0, 14, 52], [0, 11, 49], 0.7, { mat: 'mu_hierro' });
    cadena(g, [0, 14, 51], [0, 14, 22], 0, 'mu_hierro', 0.9);
    g.cil(0, 14, 18, 3, 1.4, { mat: 'mu_hierro', eje: [0, 1, 0] });
    for (let i = 0; i < 3; i++) g.elip(rr(a, -4, 4), 13 + rr(a, -2, 2), 0.2, 3, 2, 0.3, { mat: 'mu_sangre_seca' });
  } else {
    for (const sx of [-1, 1]) { cadena(g, [sx * 10, 7, 51.6], [sx * 7 + (b === 'rotas' ? sx * 6 : 0), 9 + (b === 'rotas' ? 4 : 0), b === 'rotas' ? 36 : 30], b === 'rotas' ? 2 : 5, 'mu_hierro', 0.8); cadena(g, [sx * 7, 7, 9.6], [sx * 8, 12, 0.8], 2, 'mu_hierro', 0.8); }
    if (b === 'vacias') for (const sx of [-1, 1]) { g.cil(sx * 7, 9, 28, 2.4, 1.6, { mat: 'mu_hierro' }); g.cil(sx * 7, 9, 27, 1.6, 4, { mat: 'mu_hierro', resta: true }); }
  }
  tierra(g, 20, 6, 3, 'mu_tierra', 0, 9);
  if (b !== 'gancho') huesos(g, 2, 12, 3, 0, 10);
});

// ================================================================== tumbas del piso, relicarios y guardianes
obj('cri_lapida_suelo', ['Lápida del piso', 'Floor tomb slab'], ['bronce', 'grabada', 'rota', 'hundida', 'calavera'], [2, 3], false, (v, _f, g, a) => {
  const m = elegir(a, ['mu_marmol_negro', 'mu_piedra_fria', 'mu_marmol', 'mu_granito']);
  const s = g.sub(0, 0, v === 'hundida' ? -1.4 : 0, (a.r() - 0.5) * 6, v === 'hundida' ? 3 + a.r() * 3 : 0, 'y');
  bloque(s, 0, 0, -0.4, 22, 42, 2.4, { mat: m, b: 0.6, j: 0.5 });
  if (v === 'bronce') {
    // la efigie de bronce embutida en la losa
    s.caja(0, 0, 1.4, 16, 34, 0.6, { mat: 'mu_bronce', tono: -0.05 });
    const e = s.sub(0, 0, 2); e.elip(0, -12, 0.2, 2.4, 2.6, 0.6, { mat: 'mu_bronce', tono: 0.1 }); e.poli([[-5, -9, 0], [5, -9, 0], [-4, 14, 0], [4, 14, 0], [-5, -9, 0.6], [5, -9, 0.6], [-4, 14, 0.6], [4, 14, 0.6]], { mat: 'mu_bronce', tono: 0.06 }); e.caja(0, -4, 0.6, 1.2, 14, 0.4, { mat: 'mu_bronce', tono: 0.15 });
    for (let i = 0; i < 4; i++) s.caja(0, -16 + i * 0.1, 1.9, 14, 0.6, 0.2, { mat: 'mu_bronce', tono: 0.1 });
  } else if (v === 'calavera') { const c = s.sub(0, -8, 1.6); c.elip(0, 0, 0, 5, 5.4, 0.8, { mat: m, tono: 0.08 }); for (const sx of [-1, 1]) c.elip(sx * 2, 1, 0.5, 1.4, 1.4, 0.6, { mat: 'negro' }); for (const sx of [-1, 1]) huesito(s.sub(0, 6, 1.4), [sx * -6, -6, 0.6], [sx * 6, 6, 0.6], 0.9, m, 0.08); letras(s.sub(0, 16, 1.4, 0, -90, 'x'), -6, 6, 0, 3, 2, m, 2.4, 1); }
  else { s.caja(0, 0, 1.6, 18, 38, 0.5, { mat: m, tono: 0.05 }); s.caja(0, -8, 1.6, 2, 14, 1.2, { mat: m, resta: true }); s.caja(0, -11, 1.6, 8, 2, 1.2, { mat: m, resta: true }); for (let i = 0; i < 5; i++) s.caja(rr(a, -1, 1), 6 + i * 2.6, 1.6, 12 - (i % 2) * 4 - a.r() * 2, 1, 1.2, { mat: m, resta: true }); }
  if (v === 'rota') { s.poli([[-12, -2, -1], [12, 4, -1], [-12, 0, -1], [12, 6, -1], [-12, -2, 4], [12, 4, 4], [0, 3, 4]], { mat: m, resta: true }); s.elip(0, 2, 0.2, 9, 2, 0.4, { mat: 'negro' }); bloque(g.sub(6, 12, 1.4, 20, -12, 'y'), 0, 0, 0, 10, 8, 2.2, { mat: m, b: 0.4, j: 0.8 }); cascotes(g, 5, 10, 6, m, 4, 4, 1.6); }
  if (v === 'hundida') for (let i = 0; i < 6; i++) g.elip(rr(a, -12, 12), rr(a, -22, 22), 0.3, 2, 2, 0.6, { mat: 'mu_tierra', tono: 0.05 });
});
obj('cri_relicario', ['Relicario', 'Reliquary'], ['cerrado', 'abierto', 'dorado', 'saqueado'], [1, 1], true, (v, f, g, a) => {
  const m = elegir(a, ['mu_marmol', 'mu_piedra_clara']), mc = v === 'dorado' ? 'oro' : elegir(a, ['bronce', 'mu_bronce']);
  tierra(g, 10, 10, 2, 'mu_tierra');
  bloque(g, 0, 0, 0, 14, 14, 4, { mat: m, tono: -0.05, b: 0.8, j: 0.6 }); g.cil(0, 0, 4, 3.4, 16, { mat: m, r1: 2.6 }); for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; g.cil(Math.cos(t) * 3, Math.sin(t) * 3, 4, 0.6, 16, { mat: m, tono: 0.05, r1: 0.5 }); }
  bloque(g, 0, 0, 20, 12, 12, 2, { mat: m, tono: 0.05, b: 0.6, j: 0.3 });
  // la caja: forma de capillita con techo a dos aguas, vidrio y los huesos del santo adentro
  const c = g.sub(0, 0, 22, 45);
  c.caja(0, 0, 0, 13, 8, 1.4, { mat: mc, tono: -0.1 });
  for (const [x, y] of [[-6, -3.4], [6, -3.4], [-6, 3.4], [6, 3.4]] as P2[]) c.caja(x, y, 1.4, 1.2, 1.2, 8, { mat: mc, tono: -0.05 });
  if (v !== 'saqueado') { c.caja(0, 0, 1.4, 11, 6.6, 8, { mat: 'vidrio', tono: -0.32 }); calavera(c.sub(0, 0, 1.4, 90).esc(0.9), 2.6, 'mu_hueso'); huesito(c, [-5, 1, 2.2], [4, 1.8, 2.2], 0.6); }
  else { calavera(g.sub(8, 6, 0, mirar(a)), 2.4); for (let i = 0; i < 4; i++) g.caja(rr(a, -8, 10), rr(a, 2, 10), 0, 1.6, 1.2, 0.3, { mat: 'vidrio', giro: a.r() * 90 }); }
  const tz = v === 'abierto' ? -40 : 0;
  const t = c.sub(0, -4, 9.4, 0, tz, 'x').sub(0, 4, 0);
  t.poli([[-7, -4.6, 0], [7, -4.6, 0], [-7, 4.6, 0], [7, 4.6, 0], [-7, 0, 4], [7, 0, 4]], { mat: mc, tono: 0.04 });
  t.caja(0, 0, 3.8, 2, 0.8, 4, { mat: mc, tono: 0.1 }); t.caja(0, 0, 5.6, 0.8, 0.8, 1.6, { mat: mc, tono: 0.1 }); t.caja(0, 0, 5.4, 2.8, 0.8, 0.8, { mat: mc, tono: 0.1 });
  for (const x of [-5, 0, 5]) c.esf(x, 4.2, 5, 0.7, { mat: elegir(a, ['cristal', 'mu_sello_rojo', 'runa']), tono: -0.3 });
  if (v === 'dorado') { vela(g, -7, 7, 0, 7, 1.3, f, 4, 0); vela(g, 7, 7, 0, 5, 1.3, f, 4, 1); return { piezas: g.ps, resplandor: { c: [0, 6, 14] as V3, r: 22, color: '#ffc060' } }; }
}, { cuadros: 4, t: 3 });
obj('cri_estatua_guardian', ['Guardián de piedra', 'Stone guardian knight'], ['espada', 'escudo', 'roto', 'musgo', 'ojos'], [2, 2], true, (v, f, g, a) => {
  const m = v === 'musgo' ? 'mu_piedra_musgo' : elegir(a, ['mu_piedra', 'mu_piedra_fria', 'mu_marmol_negro']);
  tierra(g, 14, 14, 4, 'mu_tierra');
  bloque(g, 0, 0, 0, 22, 22, 5, { mat: m, tono: -0.06, b: 1, j: 0.7 }); bloque(g, 0, 0, 5, 18, 18, 7, { mat: m, b: 0.9, j: 0.5 }); bloque(g, 0, 0, 12, 20, 20, 2, { mat: m, tono: 0.04, b: 0.6, j: 0.4 });
  letras(g, -5, 5, 9, 10, 2, m);
  // caballero de pie con las manos sobre el pomo de la espada clavada adelante
  const s = g.sub(0, 0, 14, 45), k = 1.15, cs = [];
  const P = (x: number, y: number, z: number): V3 => [x * k, y * k, z * k];
  for (const sy of [-1, 1]) cs.push(s.hu(P(0, sy * 2.2, 0.6), P(0.3, sy * 2.1, 14), 2.1, 2.4), s.bu(P(1.2, sy * 2.2, 0.8), [2.4, 1.5, 1.2]));
  cs.push(s.bu(P(0, 0, 16), [3.6, 4.6, 3.2]), s.bu(P(0.3, 0, 22.5), [3.4, 5, 4.4]), s.hu(P(-0.6, 0, 15), P(-2.4, 0, 1.4), 3.6, 5.6));
  for (const sy of [-1, 1]) cs.push(s.bu(P(0, sy * 5, 25.4), [2.4, 2.2, 2]), s.hu(P(0.2, sy * 5.4, 25), P(3, sy * 4.4, 19.6), 1.6, 1.4), s.hu(P(3, sy * 4.4, 19.6), P(5.4, sy * 1, 18.6), 1.4, 1.2));
  cs.push(s.bu(P(5.6, 0, 18.4), [1.5, 2.2, 1.6]), s.hu(P(0.2, 0, 26), P(0.4, 0, 28.6), 1.4, 1.3));
  s.masa(cs, { mat: m, tono: 0.04, suave: 1.4 });
  const roto = v === 'roto';
  if (!roto) { s.elip(0.5 * k, 0, 30.6 * k, 2.8 * k, 2.6 * k, 3.2 * k, { mat: m, tono: 0.06 }); s.caja(2.8 * k, 0, 30.6 * k, 1, 3.4 * k, 0.7, { mat: 'negro' }); s.caja(0, 0, 33.4 * k, 1, 0.8, 2.6, { mat: m, tono: 0.08 }); }
  else { cascotes(g, 6, 10, 10, m, 12, 8, 2.6); const c = g.sub(16, 10, 0, 30); c.elip(0, 0, 3.2, 2.8, 2.6, 3.2, { mat: m }); }
  if (v === 'ojos' && !roto) for (const sy of [-1, 1]) s.esf(2.7 * k, sy * 1, 30.9 * k, 0.55, { mat: 'mu_sello_rojo', tono: -0.1 + onda(f, 6) * 0.2 });
  // la espada clavada en la basa
  s.poli([[6 * k, -0.4, 0], [6 * k, 0.4, 0], [6 * k - 1.2, 0, 15], [6 * k + 1.2, 0, 15], [6 * k, -0.6, 15], [6 * k, 0.6, 15]], { mat: v === 'musgo' ? m : 'acero', tono: -0.15 });
  s.caja(6 * k, 0, 15, 1.4, 8, 1.4, { mat: m, tono: 0.08 }); s.cil(6 * k, 0, 16.4, 0.7, 3, { mat: m }); s.esf(6 * k, 0, 20, 1.1, { mat: m, tono: 0.08 });
  if (v === 'escudo') { const e = s.sub(3.6 * k, -5.6 * k, 6, 0); e.poli([[0, -4, 14], [0, 4, 14], [0, -4, 4], [0, 4, 4], [0, 0, 0], [1.2, 0, 9], [1.2, -3, 13], [1.2, 3, 13]], { mat: m, tono: 0.05 }); e.caja(1.4, 0, 3, 0.4, 1, 10, { mat: m, tono: 0.15 }); e.caja(1.4, 0, 10, 0.4, 6, 1, { mat: m, tono: 0.15 }); }
  if (v === 'musgo') { musgo(s, 8, -4, 6, 6, 2, 34); hiedra(g, [[-10, 10, 0], [-8, 10.5, 6], [-4, 10.5, 12], [2, 8, 16], [4, 4, 22]], 4); }
  if (v === 'ojos') return { piezas: g.ps, resplandor: { c: s.P(4 * k, 0, 31 * k), r: 7, color: '#ff4a2a' } };
}, { cuadros: 6, t: 4 });
obj('cri_cofres_osarios', ['Cofres osarios', 'Ossuary chests'], ['pila', 'abiertos', 'caidos', 'con_nombres'], [2, 2], true, (v, _f, g, a) => {
  tierra(g, 16, 14, 4, 'mu_tierra');
  const cofre = (s: G, abierto: boolean, m: string) => {
    bloque(s, 0, 0, 0, 16, 9, 8, { mat: m, b: 0.6, j: 0.5 });
    if (abierto) { s.caja(0, 0, 1.4, 13, 6, 9, { mat: m, resta: true }); s.caja(0, 0, 1.4, 13, 6, 0.6, { mat: 'negro' }); calaveraSimple(s.sub(-3, 0, 2, 70), 2.2); for (let i = 0; i < 4; i++) huesito(s, [1, -2 + i, 2 + (i % 2)], [6, -1.6 + i, 2.4 + (i % 2)], 0.6); const t = s.sub(0, -4.6, 8, 0, -100, 'x'); bloque(t, 0, 4.6, 0, 16, 9, 2.4, { mat: m, b: 0.5, j: 0.4 }); }
    else { s.poli([[-8, -4.5, 8], [8, -4.5, 8], [-8, 4.5, 8], [8, 4.5, 8], [-8, 0, 11], [8, 0, 11]], { mat: m, tono: 0.04 }); }
    if (v === 'con_nombres') letras(s, -5, 5, 4.6, 6, 2, m, 2, 0.9); else s.caja(0, 4.4, 3, 6, 0.8, 3, { mat: m, tono: 0.1 });
  };
  const mats = ['mu_piedra', 'mu_piedra_fria', 'mu_piedra_clara', 'mu_madera'];
  if (v === 'caidos') { cofre(g.sub(-4, -4, 0, rr(a, -10, 10)), false, elegir(a, mats)); cofre(g.sub(8, 8, 2, 30, 70, 'x'), true, elegir(a, mats)); huesos(g, 8, 10, 8, 6, 12); for (let i = 0; i < 3; i++) calavera(g.sub(rr(a, 0, 14), rr(a, 6, 16), 0, mirar(a)), 2.8); return; }
  const pos: [number, number, number][] = [[-2, -6, 0], [-1, 5, 0], [-1, -1, 8 + 3]];
  pos.forEach(([x, y, z], i) => cofre(g.sub(x + rr(a, -1, 1), y, z, rr(a, -8, 8)), v === 'abiertos' && i !== 2, elegir(a, mats)));
  if (v === 'abiertos') huesos(g, 4, 10, 6, 6, 10);
});
obj('cri_cuerpo_amortajado', ['Cuerpo amortajado sobre el túmulo', 'Shrouded body on a bier'], ['mortaja', 'momia', 'putrefacto', 'con_velas'], [2, 4], true, (v, f, g, a) => {
  const m = elegir(a, ['mu_piedra', 'mu_piedra_fria', 'mu_marmol_negro']);
  tierra(g, 14, 32, 4, 'mu_tierra');
  bloque(g, 0, 0, 0, 22, 58, 4, { mat: m, tono: -0.05, b: 0.8, j: 0.6 }); bloque(g, 0, 0, 4, 18, 54, 8, { mat: m, b: 0.6, j: 0.4 }); bloque(g, 0, 0, 12, 21, 57, 2, { mat: m, tono: 0.04, b: 0.5, j: 0.3 });
  const s = g.sub(0, 0, 14);
  if (v === 'momia') momia(s, false);
  else {
    const cs = [s.hu([0, -18, 3], [0, 20, 2.6], 4.6, 3.2), s.bu([0, -8, 3.6], [6, 9, 3.6]), s.bu([0, 22, 2.6], [3.6, 3, 2.6]), s.bu([0, -22, 3.6], [3.4, 3.8, 3.4])];
    if (v === 'putrefacto') cs.push(s.bu([2, -4, 5], [3, 4, 1.6]));
    s.masa(cs, { mat: 'mu_mortaja', tono: v === 'putrefacto' ? -0.18 : 0, suave: 1.6 });
    for (const y of [-14, -2, 10]) s.cil(0, y, 0.2, 5, 0.9, { mat: 'cuerda', eje: [0, 1, 0], r1: 4.6 });
    if (v === 'putrefacto') { for (let i = 0; i < 6; i++) s.elip(rr(a, -4, 4), rr(a, -14, 14), 6, 1.6, 2, 0.6, { mat: 'mu_sangre_seca' }); s.masa([s.hu([5, -6, 3], [9, -4, 0], 1, 0.8), s.bu([9.6, -3.6, -0.4], [1.2, 1.4, 0.8])], { mat: 'mu_carne_seca', suave: 0.6 }); for (let i = 0; i < 4; i++) g.elip(rr(a, -6, 6), rr(a, 30, 36), 0.2, 2, 1.4, 0.3, { mat: 'mu_sangre_seca' }); }
  }
  if (v === 'con_velas') { for (const [x, y] of [[-14, -26], [14, -26], [14, 26], [-14, 26]] as P2[]) { g.cil(x, y, 0, 2.4, 1, { mat: 'mu_hierro' }); g.cil(x, y, 1, 0.7, 20, { mat: 'mu_hierro' }); g.cil(x, y, 21, 2, 1, { mat: 'mu_hierro', r1: 2.6 }); vela(g, x, y, 22, 5 + a.r() * 4, 1.3, f, 4, x * 3 + y); } return { piezas: g.ps, resplandor: { c: [6, 0, 26] as V3, r: 30, color: '#ffb35a' } }; }
}, { cuadros: 4, t: 3 });
obj('cri_mesa_embalsamar', ['Mesa de embalsamar', 'Embalming table'], ['herramientas', 'con_cuerpo', 'vasijas', 'sangrienta'], [2, 3], true, (v, _f, g, a) => {
  const mw = elegir(a, ['mu_madera', 'madera']), mp = elegir(a, ['mu_marmol', 'mu_piedra']);
  tierra(g, 16, 24, 4, 'mu_tierra');
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.caja(sx * 8, sy * 18, 0, 2.6, 2.6, 13, { mat: mw });
  g.caja(0, 0, 4, 18, 38, 1.2, { mat: mw, tono: -0.05 });
  bloque(g, 0, 0, 13, 22, 44, 2.6, { mat: mp, b: 0.6, j: 0.4 });
  g.caja(0, 0, 15, 16, 38, 1, { mat: mp, resta: true });
  const zt = 15.6;
  if (v === 'con_cuerpo' || v === 'sangrienta') { const s = g.sub(0, 0, zt - 0.6); const cs = [s.hu([0, -14, 2.6], [0, 14, 2], 3.8, 2.6), s.bu([0, -8, 3], [5, 6, 2.8]), s.bu([0, -18, 3], [2.6, 3, 2.6])]; for (const sx of [-1, 1]) cs.push(s.hu([sx * 4.4, -11, 2.6], [sx * 5, 4, 1.6], 1.3, 1)); s.masa(cs, { mat: 'mu_carne_seca', tono: 0.12, suave: 1.4 }); s.elip(0, -6, 5.4, 2.4, 3, 0.6, { mat: 'mu_sangre', tono: 0.05 }); s.elip(0, 8, 3.2, 5, 9, 1.4, { mat: 'mu_mortaja', tono: -0.05 }); }
  if (v === 'sangrienta') { g.elip(0, 0, zt - 0.3, 6, 12, 0.4, { mat: 'mu_sangre' }); for (let i = 0; i < 6; i++) g.elip(rr(a, -12, 12), rr(a, -26, 26), 0.2, 2 + a.r() * 3, 1.6 + a.r() * 2, 0.3, { mat: 'mu_sangre_seca' }); g.cil(10, 22, 0, 4, 6, { mat: 'mu_madera', r1: 4.6 }); g.cil(10, 22, 5.6, 3.6, 0.4, { mat: 'mu_sangre' }); }
  // herramientas sobre el borde: cuchillos, ganchos, sierra
  const s = g.sub(9.6, 0, zt - 1);
  for (let i = 0; i < 3; i++) { const y = -14 + i * 5; s.poli([[0, y - 0.5, 0], [0, y + 0.5, 0], [0, y - 0.5, 0.6], [0, y + 0.5, 0.6], [0, y, 0], [5, y + 0.2, 0.3]], { mat: 'acero', tono: -0.1 }); s.palo([0, y, 0.3], [-3, y, 0.3], 0.5, { mat: 'mu_madera' }); }
  s.palo([0, 6, 0.4], [-1, 14, 0.4], 0.4, { mat: 'mu_hierro' }); s.palo([-1, 14, 0.4], [1, 16, 0.4], 0.35, { mat: 'mu_hierro' });
  if (v === 'vasijas' || v === 'herramientas') for (let i = 0; i < 4; i++) { const x = -5 + (i % 2) * 6, y = -12 + Math.floor(i / 2) * 8 + (v === 'vasijas' ? 0 : 20); if (v === 'herramientas' && i > 1) continue; g.cil(x, y, zt - 0.6, 2, 1, { mat: elegir(a, ['mu_piedra_clara', 'mu_marmol']), r1: 2.6 }); g.elip(x, y, zt + 3.4, 2.6, 2.6, 3, { mat: elegir(a, ['mu_piedra_clara', 'mu_marmol', 'roca_roja']), tono: -0.05 }); g.elip(x, y, zt + 6.6, 1.6, 1.6, 1.2, { mat: 'mu_hueso', tono: 0.05 }); }
  g.cil(-12, -20, 0, 4.4, 9, { mat: 'mu_madera', r1: 4.8 }); g.cil(-12, -20, 8.4, 4, 0.5, { mat: 'mu_agua' });
});
obj('cri_vasijas', ['Urnas y vasijas funerarias', 'Funeral urns and jars'], ['urnas', 'tinajas', 'rotas', 'con_cenizas'], [1, 1], false, (v, _f, g, a) => {
  tierra(g, 10, 10, 3, 'mu_tierra');
  const n = 3 + Math.floor(a.r() * 3);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + a.r(), r = i === 0 ? 0 : 6 + a.r() * 2, x = Math.cos(t) * r, y = Math.sin(t) * r;
    const m = elegir(a, ['roca_roja', 'mu_piedra_clara', 'mu_marmol', 'bronce', 'mu_bronce']), h = v === 'tinajas' ? 10 + a.r() * 6 : 6 + a.r() * 5, R = h * 0.42;
    const rota = v === 'rotas' && a.r() < 0.7;
    const s = rota ? g.sub(x, y, R * 0.9, a.r() * 360, 88, 'x').sub(0, 0, -h * 0.4) : g.sub(x, y, 0, a.r() * 90);
    s.cil(0, 0, 0, R * 0.55, h * 0.12, { mat: m, r1: R * 0.7, tono: -0.05 });
    s.elip(0, 0, h * 0.45, R, R, h * 0.38, { mat: m });
    s.cil(0, 0, h * 0.78, R * 0.42, h * 0.16, { mat: m, r1: R * 0.55 });
    s.cil(0, 0, h * 0.94, R * 0.6, h * 0.06, { mat: m, tono: 0.05 });
    if (rota) { s.elip(R * 0.6, 0, h * 0.4, R * 0.8, R * 1.2, h * 0.3, { mat: m, resta: true }); s.elip(R * 1.4, 0, h * 0.2, R * 0.6, R * 0.8, 0.4, { mat: v === 'rotas' ? 'mu_cal' : 'mu_hueso', tono: -0.3 }); }
    else if (v !== 'tinajas') { s.elip(0, 0, h, R * 0.55, R * 0.55, h * 0.12, { mat: m, tono: 0.05 }); s.esf(0, 0, h * 1.1, R * 0.18, { mat: m, tono: 0.08 }); }
    if (i === 0 && v === 'con_cenizas') { s.cil(0, 0, h * 0.98, R * 0.5, 0.4, { mat: 'mu_cal', tono: -0.35 }); g.elip(x + 4, y + 4, 0.2, 4, 3, 0.4, { mat: 'mu_cal', tono: -0.4 }); calaveraSimple(g.sub(x + 6, y - 3, 0, mirar(a)), 2); }
  }
  if (v === 'rotas') cascotes(g, 7, 10, 10, 'roca_roja', 0, 0, 1.6);
});
obj('cri_pozo_huesos', ['Pozo de huesos', 'Bone pit'], ['reja', 'abierto', 'desbordado', 'con_cadena'], [3, 3], false, (v, _f, g, a) => {
  const m = elegir(a, PIEDRA), R = 16;
  bloque(g, 0, 0, 0, 46, 46, 1.4, { mat: 'mu_piedra_fria', b: 0.6, j: 0.6 });
  for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; const s = g.sub(Math.cos(t) * (R + 2), Math.sin(t) * (R + 2), 0, t / GR + 90); bloque(s, 0, 0, 0, 9.4, 5, 6 + (i % 2) * 0.6, { mat: m, b: 0.6, j: 0.6 }); }
  g.cil(0, 0, -1, R - 0.4, 3, { mat: 'negro' });
  g.elip(0, 0, 0, R - 3, R - 3, v === 'desbordado' ? 8 : 2.4, { mat: 'mu_hueso', tono: -0.36 });
  for (let i = 0; i < (v === 'desbordado' ? 14 : 6); i++) { const t = a.r() * 6.28, q = a.r() * 0.8; calaveraSimple(g.sub(Math.cos(t) * R * q, Math.sin(t) * R * q, v === 'desbordado' ? 5 * (1 - q) + 1 : 1.2, mirar(a)), 2.4, 'mu_hueso', -0.12); }
  huesos(g, v === 'desbordado' ? 12 : 6, R * 0.6, R * 0.6, 0, 0, v === 'desbordado' ? 5 : 1.6);
  if (v === 'desbordado') { huesos(g, 8, 10, 6, 14, 18, 0.9, 2); for (let i = 0; i < 3; i++) calavera(g.sub(rr(a, 8, 22), rr(a, 14, 24), 0, mirar(a)), 3); }
  if (v === 'reja' || v === 'con_cadena') { for (let i = -3; i <= 3; i++) { const L = Math.sqrt(Math.max(0, (R + 1) ** 2 - (i * 4.6) ** 2)); g.caja(i * 4.6, 0, 6, 1.4, 2 * L, 1.4, { mat: 'mu_hierro' }); g.caja(0, i * 4.6, 6.6, 2 * L, 1.4, 1.2, { mat: 'mu_hierro' }); } }
  if (v === 'con_cadena') { cadena(g, [0, 0, 110], [0, 0, 8], 0, 'mu_hierro', 1.1); g.cil(0, 0, 4, 3, 2, { mat: 'mu_hierro' }); }
});
obj('cri_atril', ['Atril con el libro de los muertos', 'Lectern with the book of the dead'], ['abierto', 'cerrado', 'sangre', 'runas'], [1, 1], true, (v, f, g, a) => {
  const m = elegir(a, ['mu_madera', 'mu_hierro', 'mu_piedra']);
  tierra(g, 9, 9, 2, 'mu_tierra');
  const s = g.sub(0, 0, 0, 45 + (a.r() - 0.5) * 20);
  if (m === 'mu_piedra') { bloque(s, 0, 0, 0, 10, 10, 3, { mat: m, b: 0.6, j: 0.5 }); s.cil(0, 0, 3, 2.6, 26, { mat: m, r1: 2 }); }
  else { for (const t of [0, 2.1, 4.2]) s.palo([0, 0, 8], [Math.cos(t) * 6, Math.sin(t) * 6, 0], 0.8, { mat: m }); s.palo([0, 0, 4], [0, 0, 28], 1, { mat: m }); }
  const l = s.sub(0, 0, 29, 0, -28, 'y');
  l.caja(0, 0, 0, 10, 13, 1.2, { mat: m, tono: 0.05 }); l.caja(-5, 0, 0.6, 1, 13, 1.6, { mat: m });
  if (v === 'cerrado') { l.caja(0.5, 0, 1.2, 8, 10, 2.6, { mat: 'cuero' }); l.caja(0.5, 0, 3.6, 8.2, 10.2, 0.3, { mat: 'mu_hierro', tono: 0.1 }); l.esf(0.5, 0, 4, 1.1, { mat: 'mu_hueso' }); }
  else {
    for (const sy of [-1, 1]) { const p = l.sub(0.5, sy * 0.2, 1.2, 0, sy * -8, 'x'); p.caja(0, sy * 2.6, 0, 8, 5.2, 1.4, { mat: 'cuero', tono: -0.05 }); p.caja(0, sy * 2.6, 1.3, 7.4, 4.8, 0.6, { mat: 'mu_mortaja', tono: 0.05 }); for (let i = 0; i < 4; i++) p.caja(-2.4 + i * 1.6, sy * 2.6, 1.85, 0.5, 3.6 * (0.6 + a.r() * 0.4), 0.1, { mat: v === 'sangre' ? 'mu_sangre' : v === 'runas' ? 'runa' : 'negro', tono: v === 'runas' ? -0.1 + onda(f, 6) * 0.2 : 0 }); }
    if (v === 'sangre') { l.elip(1.2, 1, 3, 2, 1.5, 0.3, { mat: 'mu_sangre' }); g.elip(4, 4, 0.2, 4, 3, 0.4, { mat: 'mu_sangre_seca' }); }
  }
  vela(s, 4, 6, 0, 8, 1.6, f, 6, 0); vela(s, 6, 3, 0, 5, 1.4, f, 6, 1);
  return { piezas: g.ps, resplandor: { c: v === 'runas' ? s.P(0, 0, 32) : s.P(5, 5, 12), r: v === 'runas' ? 20 : 22, color: v === 'runas' ? '#5ac8f0' : '#ffb35a' } };
}, { cuadros: 6, t: 3 });
obj('cri_estandarte', ['Estandarte fúnebre', 'Funeral banner'], ['negro', 'morado', 'rojo', 'jirones'], [1, 1], true, (v, f, g, a) => {
  const tela = v === 'morado' ? 'tela_morada' : v === 'rojo' ? 'tela_roja' : 'mu_osario';
  tierra(g, 8, 8, 2, 'mu_tierra');
  bloque(g, 0, 0, 0, 9, 9, 4, { mat: elegir(a, PIEDRA), b: 0.8, j: 0.5 });
  const s = g.sub(0, 0, 0, -45);
  s.palo([0, -1, 4], [0, -1, 74], 0.9, { mat: 'mu_madera' }); s.palo([-11, -1, 70], [11, -1, 70], 0.7, { mat: 'mu_madera' });
  punta(s, 0, -1, 74, 5, 1.6, 'mu_hierro');
  for (const x of [-11, 11]) s.esf(x, -1, 70, 1.1, { mat: 'mu_hierro' });
  const ond = (z: number, x: number) => Math.sin(x * 0.4 + z * 0.15 + (f / 8) * Math.PI * 2) * (1 + (70 - z) * 0.04);
  const cols = 8, filas = 7, jir = v === 'jirones';
  for (let i = 0; i < cols; i++) for (let k = 0; k < filas; k++) {
    const x0 = -10 + (i * 20) / cols, x1 = -10 + ((i + 1) * 20) / cols, z1 = 69 - k * 6, z0 = z1 - 6 - (k === filas - 1 ? (jir ? a.r() * 8 : (i % 2) * 3) : 0);
    if (jir && k > 3 && a.r() < 0.35) continue;
    s.poli([[x0, ond(z1, x0) - 0.3, z1], [x1, ond(z1, x1) - 0.3, z1], [x0, ond(z0, x0) - 0.3, z0], [x1, ond(z0, x1) - 0.3, z0], [x0, ond(z1, x0) + 0.3, z1], [x1, ond(z1, x1) + 0.3, z1], [x0, ond(z0, x0) + 0.3, z0], [x1, ond(z0, x1) + 0.3, z0]], { mat: tela, tono: -0.05 + (k % 2) * 0.02 });
  }
  // la calavera bordada
  const c = s.sub(0, ond(48, 0) + 0.6, 0); c.elip(0, 0, 50, 3.4, 0.4, 3.2, { mat: 'mu_hueso', tono: -0.05 }); for (const sx of [-1, 1]) c.esf(sx * 1.3, 0.3, 50, 0.8, { mat: 'negro' }); c.caja(0, 0.2, 46.4, 3, 0.4, 1.4, { mat: 'mu_hueso', tono: -0.08 });
  for (const sx of [-1, 1]) c.palo([sx * 5, 0.2, 42], [-sx * 5, 0.2, 38], 0.6, { mat: 'mu_hueso', tono: -0.1 });
}, { cuadros: 8, t: 4 });
obj('cri_jaula_colgante', ['Jaula colgante', 'Hanging gibbet cage'], ['vacia', 'con_esqueleto', 'rota', 'con_cuervo'], [1, 1], false, (v, f, g, a) => {
  const mh = elegir(a, ['mu_hierro', 'mu_oxido']), mece = onda(f, 8) * 4;
  const s = g.sub(0, 0, 110, mece * 0.5, mece, 'y');
  cadena(s, [0, 0, 0], [0, 0, -34], 0, 'mu_hierro', 1);
  const j = s.sub(0, 0, -36 - 30), R = 7, H = 30;
  for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; if (v === 'rota' && (i === 1 || i === 2)) { j.palo([Math.cos(t) * R, Math.sin(t) * R, H * 0.7], [Math.cos(t) * R * 1.6, Math.sin(t) * R * 1.6, H * 0.4], 0.5, { mat: mh }); continue; } j.palo([Math.cos(t) * R, Math.sin(t) * R, 0], [Math.cos(t) * R, Math.sin(t) * R, H], 0.5, { mat: mh }); j.palo([Math.cos(t) * R, Math.sin(t) * R, H], [0, 0, H + 6], 0.5, { mat: mh }); }
  for (const z of [0.5, H * 0.5, H]) for (let i = 0; i < 12; i++) { const t0 = (i / 12) * Math.PI * 2, t1 = ((i + 1) / 12) * Math.PI * 2; j.palo([Math.cos(t0) * R, Math.sin(t0) * R, z], [Math.cos(t1) * R, Math.sin(t1) * R, z], 0.55, { mat: mh }); }
  j.cil(0, 0, -0.5, R, 1, { mat: mh, tono: -0.05 }); j.cil(0, 0, H + 6, 1.4, 2, { mat: mh });
  if (v === 'con_esqueleto' || v === 'con_cuervo') {
    calavera(j.sub(1, 0, H - 9, 45, 30, 'y'), 2.6); j.palo([0, 0, H - 9], [-1, 0, 10], 1, { mat: 'mu_hueso' }); costillar(j.sub(0, 0, 16, 0, 90, 'y').esc(0.8), 4);
    for (const sy of [-1, 1]) { huesito(j, [0, sy * 2, 10], [3, sy * 3, 3], 1); huesito(j, [3, sy * 3, 3], [R - 1, sy * 2, 1], 0.9); huesito(j, [0, sy * 4, 22], [4, sy * 5, 14], 0.8); }
  }
  if (v === 'con_cuervo') { /* el cuervo arriba de la jaula */ const c = j.sub(0, 0, H + 7.5, 40); c.masa([c.bu([0, 0, 3], [3.4, 1.8, 2]), c.bu([3.2, 0, 4.8], [1.5, 1.2, 1.3]), c.bu([-4, 0, 2.6], [2.4, 1.2, 0.4])], { mat: 'mu_pluma', suave: 1 }); c.poli([[4.4, -0.4, 5], [4.4, 0.4, 5], [7, 0, 4.4], [4.4, 0, 4.2]], { mat: 'mu_hierro' }); }
  if (v === 'rota') huesos(g, 4, 8, 8);
  return { piezas: g.ps };
}, { cuadros: 8, t: 4 });
obj('cri_crucifijo', ['Crucifijo de la cripta', 'Crypt crucifix'], ['madera', 'piedra', 'invertido', 'caido'], [1, 1], true, (v, _f, g, a) => {
  const m = v === 'piedra' ? elegir(a, ['mu_piedra', 'mu_marmol']) : 'mu_madera', H = 64;
  tierra(g, 10, 10, 3, 'mu_tierra');
  bloque(g, 0, 0, 0, 14, 14, 4, { mat: elegir(a, PIEDRA), b: 1, j: 0.6 }); bloque(g, 0, 0, 4, 10, 10, 6, { mat: elegir(a, PIEDRA), b: 0.8, j: 0.4, arriba: 0.8 });
  const s = v === 'caido' ? g.sub(14, 8, 3, 30 + a.r() * 30, 86, 'x').sub(0, 0, -10) : g.sub(0, 0, 10, -45, 0);
  const inv = v === 'invertido';
  s.caja(0, 0, 0, 3.4, 3, H, { mat: m }); s.caja(0, 0, inv ? H * 0.22 : H * 0.7, 26, 3, 3.4, { mat: m });
  for (const z of inv ? [0] : [H]) s.caja(0, 0, z - 0.2, 4.6, 4, 2, { mat: m, tono: 0.05 });
  // el cristo tallado, flaco, con la cabeza caída
  const k = inv ? -1 : 1, zb = inv ? H * 0.22 + 1.7 : H * 0.7 + 1.7, cs = [];
  const Z = (dz: number) => zb + k * dz;
  cs.push(s.bu([0, 2.2, Z(-6)], [2.2, 1.4, 4]), s.bu([0, 2.4, Z(1.6)], [1.4, 1.4, 1.6]), s.hu([0, 2, Z(-10)], [0, 2, Z(-24)], 1.4, 1));
  for (const sx of [-1, 1]) cs.push(s.hu([sx * 2, 2, Z(-2.6)], [sx * 11, 2, Z(0.4)], 0.8, 0.6));
  s.masa(cs, { mat: v === 'piedra' ? m : 'mu_hueso', tono: v === 'piedra' ? 0.08 : -0.12, suave: 1 });
  s.elip(0, 2.4, Z(-11), 2.2, 1.2, 1.6, { mat: 'mu_mortaja', tono: -0.1 });
  if (v === 'invertido') g.elip(0, 0, 10.2, 4, 4, 0.4, { mat: 'mu_sangre' });
  if (v === 'caido') cascotes(g, 4, 6, 6, 'mu_madera', 6, 6, 2);
});
obj('cri_pila_agua', ['Pila de agua bendita', 'Holy water font'], ['agua', 'sangre', 'seca', 'rota'], [1, 1], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_marmol', 'mu_piedra_clara', 'mu_piedra']);
  tierra(g, 10, 10, 3, 'mu_tierra');
  bloque(g, 0, 0, 0, 14, 14, 3, { mat: m, tono: -0.06, b: 0.8, j: 0.5 });
  g.cil(0, 0, 3, 3, 16, { mat: m, r1: 2.4 }); for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + 0.78; g.palo([Math.cos(t) * 2.8, Math.sin(t) * 2.8, 3], [Math.cos(t) * 2.2, Math.sin(t) * 2.2, 19], 0.9, { mat: m, tono: 0.05 }); }
  const s = v === 'rota' ? g.sub(6, 6, 0, 30, 70, 'x').sub(0, 0, -19) : g;
  s.cil(0, 0, 19, 4, 3, { mat: m, r1: 9 }); s.cil(0, 0, 22, 9, 3, { mat: m, tono: 0.04 }); s.cil(0, 0, 23.4, 7.6, 3, { mat: m, resta: true });
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; s.caja(Math.cos(t) * 9, Math.sin(t) * 9, 22.6, 1, 2, 1.6, { mat: m, giro: t / GR, resta: true }); }
  if (v === 'agua') s.cil(0, 0, 23.6, 7.6, 0.6, { mat: 'mu_agua' });
  if (v === 'sangre') { s.cil(0, 0, 23.6, 7.6, 0.6, { mat: 'mu_sangre' }); for (let i = 0; i < 3; i++) { const t = 0.3 + i * 0.5; g.elip(Math.cos(t) * 9, Math.sin(t) * 9, 18, 0.7, 0.7, 4, { mat: 'mu_sangre_seca' }); } g.elip(6, 4, 0.2, 5, 4, 0.3, { mat: 'mu_sangre_seca' }); }
  if (v === 'seca') { s.cil(0, 0, 23.6, 7.4, 0.4, { mat: 'mu_cal', tono: -0.3 }); s.elip(2, 1, 24, 2, 2, 0.6, { mat: 'mu_hoja_seca' }); }
  if (v === 'rota') { g.poli([[-6, -6, 18], [6, -6, 18], [-6, 6, 18], [6, 6, 18], [-6, -6, 24], [6, -6, 21], [-6, 6, 22]], { mat: m, resta: true }); g.elip(10, 10, 0.2, 6, 4, 0.3, { mat: 'mu_agua' }); cascotes(g, 4, 5, 5, m, 4, 8, 1.8); }
});
obj('cri_tumba_abierta', ['Tumba abierta en el piso', 'Open floor tomb'], ['losa_corrida', 'vacia', 'con_cadaver', 'escalones'], [2, 3], false, (v, _f, g, a) => {
  const m = elegir(a, ['mu_piedra_fria', 'mu_marmol_negro', 'mu_granito']);
  bloque(g, 0, 0, 0, 26, 44, 2, { mat: 'mu_piedra_fria', b: 0.8, j: 0.6 });
  g.caja(0, 0, -6, 18, 36, 10, { mat: m, resta: true });
  g.caja(0, 0, 0.1, 18, 36, 0.3, { mat: 'negro' });
  for (const sx of [-1, 1]) g.caja(sx * 8.6, 0, 0, 1, 36, 2, { mat: m, tono: -0.25 });
  g.caja(0, -17.6, 0, 18, 1, 2, { mat: m, tono: -0.2 });
  if (v === 'con_cadaver') { const s = g.sub(0, 0, 0.4); s.masa([s.hu([0, -12, 1.2], [0, 12, 1], 3, 2.2), s.bu([0, -15, 1.6], [2.4, 2.6, 1.6])], { mat: 'mu_mortaja', tono: -0.25, suave: 1 }); calaveraSimple(s.sub(0, -15, 0.4, -90), 2.2, 'mu_hueso', -0.15); }
  if (v === 'escalones') for (let i = 0; i < 4; i++) g.caja(0, 10 - i * 5, 0, 16, 5, 1.6 - i * 0.35, { mat: m, tono: -0.12 - i * 0.07 });
  if (v === 'vacia') huesos(g, 3, 6, 14, 0, 0, 0.6);
  if (v !== 'vacia' || a.r() < 0.5) { const t = g.sub(16, 6, 0, 10 + a.r() * 20, 6, 'y'); bloque(t, 0, 0, 0, 20, 38, 2.6, { mat: m, b: 0.6, j: 0.5 }); t.caja(0, -6, 2.4, 2, 14, 1, { mat: m, resta: true }); t.caja(0, -9, 2.4, 8, 2, 1, { mat: m, resta: true }); }
  cascotes(g, 3, 12, 20, m, 0, 0, 1.6);
});
