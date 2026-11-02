import { conVarianteY, TEMAS, type Tema, type V3 } from '../objeto';
import {
  G, hacerObj, bloque, ojiva, altoOjiva, letras, grieta, tierra, monticulo, musgo, hiedra, cascotes, calavera, calaveraSimple, huesoLargo, huesos, huesito,
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
  for (const s of [-1, 1]) bloque(g, s * 37, 1, 0, 8, 14, H + 2, { mat: m, tono: 0.05, b: 0.9, j: 0.4 });
  bloque(g, 0, 0.6, H, 82, 15, 3, { mat: m, tono: 0.04, b: 0.8, j: 0.4 });
  const hueco = (x: number, z: number) => (b === 'roseton' && Math.hypot(x, z - 52) < 17) || (b === 'arco' && Math.abs(x) < 13 && z < 46 + Math.sqrt(Math.max(0, 169 - x * x)) * 0.4);
  // hileras: cráneos, después una banda de cabezas de fémur
  for (let f = 0; f < 11; f++) {
    const z = 6 + f * 8, craneos = f % 2 === 0;
    for (let x = -31; x <= 31; x += craneos ? 6.2 : 3) {
      if (hueco(x, z + 2)) continue;
      if (craneos) calaveraSimple(g.sub(x + rr(a, -0.4, 0.4), 3.4, z, 90 + rr(a, -12, 12)), 2.6, 'mu_hueso', -0.05);
      else { g.esf(x, 3.6, z + 1.6, 1.5, { mat: 'mu_hueso', tono: -0.08 + a.r() * 0.08 }); g.esf(x + 0.9, 3.4, z + 2.6, 1.2, { mat: 'mu_hueso', tono: -0.12 }); }
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
    const m = v === 'marmol_negro' ? 'mu_marmol_negro' : v === 'dorado' ? 'mu_marmol' : v === 'musgo' ? 'cem_lapida_musgo' : elegir(a, SARC);
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
  cadena(s, [0, 0, 0], [0, 0, -(110 - z) + 8], 0, 'mu_hierro', 0.9);
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
