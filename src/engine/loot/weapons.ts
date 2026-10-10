import { IconCanvas, Axis, type MatDef, type P } from './canvas';
import { MAT, gemMat, glowMat } from './materials';

/**
 * Armas del RPG como íconos de inventario, en diagonal (el pomo abajo a la izquierda, la punta arriba a la derecha).
 * Todo lo de Diablo 2, 3 y 4 y algo más. Cada arma tiene variantes de forma y de adornos: con eso salen
 * las bases normales, las mejoradas y los legendarios.
 */

export type WeaponIcon =
  // una mano
  | 'sword' | 'scimitar' | 'katana' | 'rapier' | 'dagger' | 'kris' | 'axe' | 'hatchet' | 'mace' | 'morning_star' | 'flail'
  | 'warhammer' | 'scepter' | 'club' | 'wand' | 'claw' | 'javelin'
  // dos manos
  | 'greatsword' | 'greataxe' | 'maul' | 'staff' | 'spear' | 'halberd' | 'scythe' | 'bow' | 'longbow' | 'crossbow';

export const WEAPON_ICONS: WeaponIcon[] = [
  'sword', 'scimitar', 'katana', 'rapier', 'dagger', 'kris', 'axe', 'hatchet', 'mace', 'morning_star', 'flail', 'warhammer', 'scepter', 'club', 'wand', 'claw', 'javelin',
  'greatsword', 'greataxe', 'maul', 'staff', 'spear', 'halberd', 'scythe', 'bow', 'longbow', 'crossbow',
];

export const TWO_HANDED: WeaponIcon[] = ['greatsword', 'greataxe', 'maul', 'staff', 'spear', 'halberd', 'scythe', 'bow', 'longbow', 'crossbow'];

export type Accent = 'none' | 'runes' | 'cracks' | 'frost' | 'flames' | 'veins' | 'stars' | 'leaves' | 'lightning' | 'holy' | 'drip';

export interface WeaponDesign {
  /** hoja, cabeza o palas del arco */
  blade?: MatDef;
  /** filo (si es distinto de la hoja) */
  edge?: MatDef;
  /** mango largo / asta */
  haft?: MatDef;
  /** empuñadura forrada */
  grip?: MatDef;
  guard?: MatDef;
  pommel?: MatDef;
  /** gema engastada (color) */
  gem?: string | null;
  /** color de lo que brilla (runas, grietas, cristal) */
  glow?: string | null;
  accent?: Accent;
  /** variante de forma de la hoja o cabeza */
  shape?: 'plain' | 'broad' | 'flame' | 'serrated' | 'crystal' | 'curved' | 'wicked' | 'holy' | 'bone';
  guardShape?: 'bar' | 'wings' | 'crescent' | 'ornate' | 'skull' | 'disc' | 'none';
  /** cristales que flotan (báculos, cetros, orbes) */
  floating?: boolean;
  /** plumas (arcos, jabalinas) */
  feather?: string | null;
}

export const DEFAULT_DESIGN: WeaponDesign = { blade: MAT.steel, haft: MAT.wood, grip: MAT.leather, guard: MAT.iron, pommel: MAT.iron, accent: 'none', shape: 'plain', guardShape: 'bar' };

type Ctx = { c: IconCanvas; A: Axis; d: Required<Pick<WeaponDesign, 'blade' | 'haft' | 'grip' | 'guard' | 'pommel'>> & WeaponDesign };

const DIAG = -45;

// ---------- piezas comunes ----------

/** hoja recta o con forma, de u0 a u1, medio ancho hw, punta de largo tip. Dos caras: la de arriba con luz. */
function blade(x: Ctx, u0: number, u1: number, hw: number, tip: number, opt: { curve?: number; taper?: number; single?: boolean } = {}) {
  const { c, A, d } = x;
  const shape = d.shape ?? 'plain';
  const n = 14;
  const curve = opt.curve ?? (shape === 'curved' ? 2.2 : 0);
  const taper = opt.taper ?? (shape === 'broad' ? 0.85 : 0.7);
  const top: P[] = [], bot: P[] = [], mid: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = u0 + (u1 - tip - u0) * t;
    const off = curve * t * t;
    let w = hw * (1 - (1 - taper) * t);
    let wb = w;
    if (shape === 'flame') { w *= 1 + 0.32 * Math.sin(t * Math.PI * 4.5); wb = hw * (1 - (1 - taper) * t) * (1 + 0.32 * Math.sin(t * Math.PI * 4.5 + Math.PI)); }
    if (shape === 'serrated' && i % 2 === 1 && i < n) w *= 1.35;
    if (opt.single) wb = Math.min(wb, 0.45);
    top.push([u, -w + off]);
    bot.push([u, wb + off]);
    mid.push([u, off + (opt.single ? 0.1 : 0)]);
  }
  const tipP: P = [u1, curve + (opt.single ? 0.2 : 0)];
  const bm = d.blade;
  const g1 = c.poly(A.pts([...top, tipP, ...[...mid].reverse()]), bm, { bias: 1 });
  c.poly(A.pts([...mid, tipP, ...[...bot].reverse()]), bm, { bias: -1, group: c.group() });
  // filo claro arriba y canal (vaceo) al centro
  const edge = d.edge ?? bm;
  for (let i = 0; i < n; i++) c.px1(A.p(...top[i]), A.p(...top[i + 1]), edge, { tone: 5, group: g1 }, true);
  if (shape !== 'crystal' && shape !== 'bone' && u1 - u0 > 8) c.px1(A.p(u0 + 1, mid[0][1]), A.p(u0 + (u1 - u0) * 0.55, curve * 0.3), bm, { tone: 2 }, true);
  if (shape === 'crystal') for (let i = 2; i < n - 2; i += 3) c.px1(A.p(...top[i]), A.p(...bot[i + 1]), bm, { tone: 5 }, true);
  return { top, bot, mid, tipP };
}

function grip(x: Ctx, u0: number, u1: number, hw: number) {
  const { c, A, d } = x;
  const g = c.poly(A.pts([[u0, -hw], [u1, -hw], [u1, hw], [u0, hw]]), d.grip);
  // vendas: rayas oscuras cruzadas
  for (let u = u0 + 0.9; u < u1 - 0.3; u += 1.4) c.px1(A.p(u, -hw), A.p(u + 0.6, hw), d.grip, { tone: 1, group: g }, true);
}

function guard(x: Ctx, u: number, w: number) {
  const { c, A, d } = x;
  const gs = d.guardShape ?? 'bar';
  if (gs === 'none') return;
  const gm = d.guard;
  if (gs === 'bar' || gs === 'ornate') {
    c.poly(A.pts([[u, -w], [u + 1.5, -w], [u + 1.5, w], [u, w]]), gm);
    if (gs === 'ornate') { c.circle(A.p(u + 0.75, -w - 0.6), 1.1, gm); c.circle(A.p(u + 0.75, w + 0.6), 1.1, gm); }
  } else if (gs === 'wings') {
    for (const s of [-1, 1]) c.poly(A.pts([[u, 0], [u + 1.6, s * 0.8], [u + 3.6, s * (w + 1.2)], [u + 1.2, s * (w + 0.4)], [u - 0.4, s * w * 0.6]]), gm);
  } else if (gs === 'crescent') {
    for (const s of [-1, 1]) c.poly(A.pts([[u - 0.2, 0], [u + 1.2, s * 0.6], [u + 2.6, s * (w + 0.6)], [u + 1.4, s * (w + 0.9)], [u - 0.6, s * w * 0.8]]), gm);
  } else if (gs === 'disc') {
    c.ellipse(A.p(u + 0.7, 0), 1, w * 0.75, gm, {}, DIAG);
  } else if (gs === 'skull') {
    c.poly(A.pts([[u, -w], [u + 1.3, -w], [u + 1.3, w], [u, w]]), gm);
    c.circle(A.p(u + 0.6, 0), 2, MAT.bone);
    c.dot(A.p(u + 1.1, -0.7), MAT.darkwood, { tone: 0 }, true);
    c.dot(A.p(u + 1.1, 0.7), MAT.darkwood, { tone: 0 }, true);
  }
  if (d.gem) c.circle(A.p(u + 0.75, 0), gs === 'skull' ? 0.6 : 0.95, gemMat(d.gem));
}

function pommel(x: Ctx, u: number, r = 1.5) {
  const { c, A, d } = x;
  c.circle(A.p(u, 0), r, d.pommel);
  if (d.gem) c.circle(A.p(u, 0), r * 0.55, gemMat(d.gem));
}

function haft(x: Ctx, u0: number, u1: number, hw: number, mat?: MatDef) {
  const { c, A, d } = x;
  const m = mat ?? d.haft;
  const g = c.poly(A.pts([[u0, -hw], [u1, -hw], [u1, hw], [u0, hw]]), m);
  // vetas de la madera
  if (m.kind === 'wood') for (let u = u0 + 2; u < u1 - 1; u += 4.5) c.px1(A.p(u, -hw * 0.2), A.p(u + 1.6, -hw * 0.2), m, { tone: 2, group: g }, true);
  return g;
}

/** anillo de metal alrededor del asta */
function band(x: Ctx, u: number, hw: number, mat: MatDef = MAT.iron) {
  x.c.poly(x.A.pts([[u, -hw - 0.3], [u + 0.9, -hw - 0.3], [u + 0.9, hw + 0.3], [u, hw + 0.3]]), mat);
}

/** adornos que brillan sobre la hoja */
function accent(x: Ctx, kind: Accent, u0: number, u1: number, hw: number, curve = 0) {
  const { c, A, d } = x;
  const glow = glowMat(d.glow ?? '#7fd8ff');
  const at = (u: number, v: number): P => { const t = (u - u0) / Math.max(1, u1 - u0); return A.p(u, v + curve * t * t); };
  if (kind === 'runes') {
    for (let u = u0 + 1.5, i = 0; u < u1 - 2; u += 2.2, i++) {
      const v = i % 2 ? -0.35 : 0.35;
      c.px1(at(u, v - 0.4), at(u + 0.9, v + 0.4), glow, { tone: 5 }, true);
    }
  } else if (kind === 'cracks' || kind === 'lightning') {
    let v = 0;
    for (let u = u0 + 0.5, i = 0; u < u1 - 1.5; u += 1.6, i++) {
      const nv = (i % 2 ? -1 : 1) * hw * 0.55;
      c.px1(at(u, v), at(u + 1.6, nv), glow, { tone: 4 }, true);
      v = nv;
    }
  } else if (kind === 'frost') {
    for (let u = u0 + 1; u < u1 - 1; u += 2.4) { c.dot(at(u, -hw * 0.7), glow, { tone: 5 }, true); c.dot(at(u + 1.2, hw * 0.6), glow, { tone: 4 }, true); }
  } else if (kind === 'flames') {
    // lenguas de fuego que suben desde la base de la hoja
    for (let i = 0; i < 3; i++) {
      const u = u0 + 0.5 + i * 1.6;
      for (const s of [-1, 1]) c.poly([at(u, s * hw * 0.3), at(u + 3.2 - i * 0.6, s * (hw + 1.1)), at(u + 1.4, s * hw * 0.4)], glow, { tone: 4 - (i % 2) });
    }
  } else if (kind === 'veins') {
    for (let u = u0 + 1; u < u1 - 2; u += 3) { c.px1(at(u, 0), at(u + 1.5, -hw * 0.6), glow, { tone: 4 }, true); c.px1(at(u + 1.5, 0), at(u + 2.6, hw * 0.6), glow, { tone: 3 }, true); }
  } else if (kind === 'stars') {
    for (let u = u0 + 1.5, i = 0; u < u1 - 1.5; u += 2.7, i++) c.dot(at(u, (i % 3) - 1 === 0 ? 0 : ((i % 3) - 1) * hw * 0.5), glow, { tone: 5 }, true);
  } else if (kind === 'holy') {
    c.px1(at(u0 + 1, 0), at(u1 - 3, 0), glow, { tone: 5 }, true);
  } else if (kind === 'drip') {
    for (let u = u0 + 2; u < u1 - 3; u += 3.5) { c.dot(at(u, hw * 0.4), glow, { tone: 4 }, true); c.dot(at(u + 0.3, hw + 0.6), glow, { tone: 3 }); }
  } else if (kind === 'leaves') {
    for (let u = u0 + 1, i = 0; u < u1; u += 3, i++) {
      const s = i % 2 ? -1 : 1;
      c.ellipse(at(u, s * (hw + 0.9)), 1.2, 0.6, glow, { tone: 3 }, DIAG + s * 35);
    }
  }
}

/** cristal que flota con sus esquirlas */
function crystal(x: Ctx, at: P, h: number, w: number, color: string) {
  const { c } = x;
  const cm = { hex: color, kind: 'crystal' as const };
  c.poly([[at[0], at[1] - h], [at[0] + w, at[1]], [at[0], at[1] + h * 0.8], [at[0] - w, at[1]]], cm);
  c.px1([at[0], at[1] - h + 0.6], [at[0], at[1] + h * 0.6], cm, { tone: 5 }, true);
}

// ---------- armas ----------

const DRAW: Record<WeaponIcon, (x: Ctx) => void> = {
  sword: (x) => {
    pommel(x, 1.6);
    grip(x, 2.6, 7.6, 1.0);
    const b = blade(x, 9.2, 31, x.d.shape === 'broad' ? 2.2 : 1.7, 4);
    guard(x, 7.6, 4.2);
    if (x.d.accent && x.d.accent !== 'none') accent(x, x.d.accent, 10, 27, 1.5);
    void b;
  },
  scimitar: (x) => {
    pommel(x, 1.6, 1.3);
    grip(x, 2.4, 7.2, 0.95);
    blade(x, 8.8, 30, 1.9, 3.5, { curve: 3.2, taper: 0.95, single: true });
    guard(x, 7.2, 2.6);
    if (x.d.accent && x.d.accent !== 'none') accent(x, x.d.accent, 10, 26, 1.2, 3.2);
  },
  katana: (x) => {
    pommel(x, 1.2, 1);
    grip(x, 1.6, 8.8, 0.95);
    // ito: rombos claros sobre el mango
    for (let u = 2.4; u < 8.4; u += 1.4) x.c.dot(x.A.p(u, 0), x.d.guard, { tone: 4 }, true);
    x.c.ellipse(x.A.p(9.4, 0), 0.7, 2.4, x.d.guard, {}, DIAG);
    blade(x, 10, 32.5, 1.25, 3.2, { curve: 1.6, taper: 0.95, single: true });
    if (x.d.accent && x.d.accent !== 'none') accent(x, x.d.accent, 11, 28, 1, 1.6);
  },
  rapier: (x) => {
    pommel(x, 1.4, 1.3);
    grip(x, 2.2, 6.6, 0.8);
    // cazoleta: cesta curva
    x.c.ring(x.A.p(7.4, 0), 2.6, 2.6, 0.7, x.d.guard, {}, 0, 360);
    blade(x, 7.8, 32, 0.75, 2, { taper: 0.8 });
    guard(x, 7.2, 3.2);
  },
  dagger: (x) => {
    const A = new Axis(x.A.p(1, 0), DIAG, 1.4);
    const y: Ctx = { ...x, A };
    pommel(y, 1.3, 1.3);
    grip(y, 2.1, 6, 0.9);
    blade(y, 7.2, 19, 1.6, 3.5, { taper: 0.75 });
    guard(y, 6, 2.8);
    if (x.d.accent && x.d.accent !== 'none') accent(y, x.d.accent, 8, 16, 1.2);
  },
  kris: (x) => {
    const A = new Axis(x.A.p(1, 0), DIAG, 1.4);
    const y: Ctx = { ...x, A, d: { ...x.d, shape: 'flame' } };
    pommel(y, 1.3, 1.4);
    grip(y, 2.1, 6, 0.95);
    blade(y, 7.2, 20, 1.5, 3, { taper: 0.75 });
    guard(y, 6, 2.6);
    if (x.d.accent && x.d.accent !== 'none') accent(y, x.d.accent, 8, 17, 1.2);
  },
  axe: (x) => {
    const { c, A, d } = x;
    haft(x, 0.5, 26, 0.95);
    grip(x, 0.5, 6, 1.05);
    // hoja en media luna hacia arriba a la izquierda, con lomo al otro lado
    const bm = d.blade;
    const pts: P[] = [[20, -0.9], [18.6, -3], [17.4, -6.2], [20.6, -7.2], [24.6, -7.4], [27.4, -6.4], [26.4, -3.4], [25.6, -0.9]];
    const g = c.poly(A.pts(d.shape === 'wicked' ? [[20, -0.9], [17.6, -4], [16.4, -8], [20.6, -6.4], [24.6, -9.2], [26.8, -6], [26.4, -3.4], [25.6, -0.9]] : pts), bm);
    c.px1(A.p(17.6, -6.4), A.p(27, -6.6), d.edge ?? bm, { tone: 5, group: g }, true);
    c.poly(A.pts([[21, 0.9], [25, 0.9], [24.2, 2.6], [21.8, 2.6]]), bm);
    band(x, 19.8, 0.95, d.guard);
    if (d.gem) c.circle(A.p(22.8, -2.6), 0.9, gemMat(d.gem));
    if (d.accent && d.accent !== 'none') accent({ ...x, A: new Axis(A.p(18.4, -5.2), DIAG + 90) }, d.accent, 0, 9, 0.9);
  },
  hatchet: (x) => {
    const { c, A, d } = x;
    haft(x, 4, 23, 0.85);
    grip(x, 4, 9, 0.95);
    const g = c.poly(A.pts([[17.4, -0.8], [16.2, -4.6], [19.6, -5.8], [23.4, -4.4], [22.4, -0.8]]), d.blade);
    c.px1(A.p(16.3, -4.7), A.p(23.2, -4.5), d.edge ?? d.blade, { tone: 5, group: g }, true);
    c.poly(A.pts([[18.2, 0.8], [21.6, 0.8], [20.8, 3.6]]), d.blade);
    band(x, 17, 0.85, d.guard);
  },
  mace: (x) => {
    const { c, A, d } = x;
    haft(x, 2, 22, 0.9, d.guard.kind === 'metal' ? d.guard : d.haft);
    grip(x, 2, 8, 1.05);
    pommel(x, 1.4, 1.3);
    // cabeza con aletas
    c.circle(A.p(24.6, 0), 3.4, d.blade);
    for (const v of [-1, 1]) c.poly(A.pts([[21.6, v * 2.2], [27.6, v * 2.2], [26.8, v * 4.6], [22.4, v * 4.6]]), d.blade);
    c.poly(A.pts([[27.4, -1.2], [30, -0.9], [30, 0.9], [27.4, 1.2]]), d.blade);
    if (d.gem) c.circle(A.p(24.6, 0), 1.2, gemMat(d.gem));
  },
  morning_star: (x) => {
    const { c, A, d } = x;
    haft(x, 2, 22, 0.9);
    grip(x, 2, 8, 1.05);
    pommel(x, 1.4, 1.3);
    const C = A.p(25, 0);
    // púas alrededor
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.poly([[C[0] + Math.cos(a - 0.25) * 3, C[1] + Math.sin(a - 0.25) * 3], [C[0] + Math.cos(a) * 5.6, C[1] + Math.sin(a) * 5.6], [C[0] + Math.cos(a + 0.25) * 3, C[1] + Math.sin(a + 0.25) * 3]], d.edge ?? MAT.steel);
    }
    c.circle(C, 3.6, d.blade);
    if (d.gem) c.circle(C, 1.3, gemMat(d.gem));
    band(x, 21, 0.9, d.guard);
  },
  flail: (x) => {
    const { c, A, d } = x;
    const B = new Axis([5, 27], -60);
    const y: Ctx = { ...x, A: B };
    haft(y, 0, 13, 0.95);
    grip(y, 0, 5, 1.1);
    pommel(y, 0, 1.2);
    // cadena de eslabones que cuelga y bola con púas
    const top = B.p(13.6, 0);
    const ball: P = [top[0] + 9.5, top[1] + 4];
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const p: P = [top[0] + (ball[0] - top[0]) * t, top[1] + (ball[1] - top[1]) * t - Math.sin(t * Math.PI) * 2];
      c.ring(p, 0.8, 0.55, 0.35, MAT.iron, {}, 0, 360);
    }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.poly([[ball[0] + Math.cos(a - 0.3) * 2.6, ball[1] + Math.sin(a - 0.3) * 2.6], [ball[0] + Math.cos(a) * 4.6, ball[1] + Math.sin(a) * 4.6], [ball[0] + Math.cos(a + 0.3) * 2.6, ball[1] + Math.sin(a + 0.3) * 2.6]], d.edge ?? MAT.steel); }
    c.circle(ball, 3, d.blade);
    if (d.glow) c.circle(ball, 1.3, glowMat(d.glow));
    void A;
  },
  warhammer: (x) => {
    const { c, A, d } = x;
    haft(x, 1, 25, 0.95);
    grip(x, 1, 7, 1.05);
    // martillo de un lado, pico del otro
    c.poly(A.pts([[21, -0.8], [26, -0.8], [26.4, -5.2], [20.6, -5.2]]), d.blade);
    c.poly(A.pts([[21.4, -5.6], [25.6, -5.6], [25.2, -6.6], [21.8, -6.6]]), d.blade, { bias: 1 });
    c.poly(A.pts([[21.6, 0.8], [25.4, 0.8], [23.8, 6.4]]), d.blade);
    c.poly(A.pts([[26, -0.9], [28.6, -0.6], [28.6, 0.6], [26, 0.9]]), d.blade);
    band(x, 20.4, 0.95, d.guard);
    if (d.gem) c.circle(A.p(23.5, -3), 0.9, gemMat(d.gem));
  },
  scepter: (x) => {
    const { c, A, d } = x;
    haft(x, 2, 22, 0.85, d.guard);
    grip(x, 3, 9, 1);
    pommel(x, 1.6, 1.4);
    // corona de aletas con una gema grande al centro
    const C = A.p(25, 0);
    for (let i = 0; i < 5; i++) {
      const a = (-45 + (i - 2) * 38) * (Math.PI / 180);
      c.poly([[C[0] + Math.cos(a - 0.35) * 1.6, C[1] + Math.sin(a - 0.35) * 1.6], [C[0] + Math.cos(a) * 5.2, C[1] + Math.sin(a) * 5.2], [C[0] + Math.cos(a + 0.35) * 1.6, C[1] + Math.sin(a + 0.35) * 1.6]], d.blade);
    }
    c.ring(C, 3.2, 3.2, 0.9, d.blade);
    c.circle(C, 2.3, gemMat(d.gem ?? '#d8243e'));
    if (d.glow) c.circle(C, 1, glowMat(d.glow));
    if (d.floating) { crystal(x, A.p(29.5, -3.5), 1.6, 0.9, d.glow ?? '#9fe8ff'); }
  },
  club: (x) => {
    const { c, A, d } = x;
    const g = c.poly(A.pts([[1, -1], [10, -1.4], [24, -3.4], [28.6, -2.6], [29.6, 0], [28.6, 2.6], [24, 3.4], [10, 1.4], [1, 1]]), d.haft);
    for (const [u, v] of [[16, -2], [21, 2.4], [25, -2.6], [26.8, 1]] as P[]) { c.dot(A.p(u, v), MAT.iron, { tone: 4 }); }
    grip(x, 1, 6, 1.15);
    void g;
  },
  wand: (x) => {
    const { c, A, d } = x;
    const B = new Axis(A.p(1, 0), DIAG, 1.45);
    const y: Ctx = { ...x, A: B };
    if (d.shape === 'bone') {
      c.poly(B.pts([[0, -0.8], [14, -0.6], [14, 0.6], [0, 0.8]]), MAT.bone);
      c.circle(B.p(0, 0), 1.3, MAT.bone);
      c.circle(B.p(16.2, 0), 2.4, MAT.bone);
      c.dot(B.p(16.8, -0.8), MAT.darkwood, { tone: 0 }, true); c.dot(B.p(16.8, 0.8), MAT.darkwood, { tone: 0 }, true);
    } else {
      haft(y, 0, 14, 0.75);
      band(y, 11.5, 0.75, d.guard);
      band(y, 2.5, 0.75, d.guard);
      // punta: gema en garras
      for (const v of [-1, 1]) c.poly(B.pts([[13.6, v * 0.5], [16.6, v * 1.9], [17.4, v * 1.1]]), d.guard);
      c.circle(B.p(16.4, 0), 1.7, gemMat(d.gem ?? '#2f62e6'));
    }
    if (d.glow) { c.circle(B.p(d.shape === 'bone' ? 16.2 : 16.4, 0), d.shape === 'bone' ? 0.8 : 0.9, glowMat(d.glow)); }
    if (d.accent && d.accent !== 'none') accent(y, d.accent, 2, 13, 0.6);
  },
  claw: (x) => {
    const { c, d } = x;
    // katar con tres cuchillas curvas sobre una empuñadura en H
    const base: P = [9, 21];
    c.poly([[base[0] - 3.4, base[1] + 3], [base[0] + 2.6, base[1] - 3], [base[0] + 4, base[1] - 1.6], [base[0] - 2, base[1] + 4.4]], d.guard);
    c.line([base[0] - 3.2, base[1] + 5.2], [base[0] - 5.4, base[1] + 3], 1.4, d.grip);
    c.line([base[0] + 4.6, base[1] - 2.8], [base[0] + 2.4, base[1] - 5], 1.4, d.grip);
    for (const k of [-1, 0, 1]) {
      const s: P = [base[0] + 0.5 + k * 1.9, base[1] + k * 1.9];
      const pts: P[] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([s[0] + t * 15 - t * t * 2, s[1] - t * 15 - t * t * 1 + Math.sin(t * Math.PI) * 1.2]); }
      for (let i = 0; i < pts.length - 1; i++) c.line(pts[i], pts[i + 1], 1.3 - i * 0.08, d.blade, { group: 900 + k });
    }
    if (d.gem) c.circle([base[0] + 0.3, base[1] + 0.3], 1, gemMat(d.gem));
    if (d.glow) for (const k of [-1, 0, 1]) c.dot([base[0] + 10 + k * 1.9, base[1] - 9.5 + k * 1.9], glowMat(d.glow), { tone: 5 }, true);
  },
  javelin: (x) => {
    const { c, A, d } = x;
    haft(x, 0, 25, 0.6);
    grip(x, 9, 13, 0.75);
    c.poly(A.pts([[24, -1.4], [28, -1.5], [32.6, 0], [28, 1.5], [24, 1.4]]), d.blade);
    c.px1(A.p(24.4, -0.2), A.p(31.6, -0.2), d.blade, { tone: 5 }, true);
    if (d.feather) for (const v of [-1, 1]) c.poly(A.pts([[0.5, 0], [4.5, v * 0.5], [3.4, v * 2.2], [0, v * 1.6]]), { hex: d.feather, kind: 'cloth' });
    if (d.accent && d.accent !== 'none') accent(x, d.accent, 3, 23, 0.5);
  },
  greatsword: (x) => {
    pommel(x, 1.4, 1.5);
    grip(x, 2.4, 8.4, 1.05);
    blade(x, 10.2, 33, x.d.shape === 'broad' ? 2.7 : 2.3, 4.2, { taper: x.d.shape === 'flame' ? 0.7 : 0.82 });
    guard(x, 8.4, 5.4);
    if (x.d.accent && x.d.accent !== 'none') accent(x, x.d.accent, 11.5, 29, 2);
  },
  greataxe: (x) => {
    const { c, A, d } = x;
    haft(x, 0.5, 29, 1);
    grip(x, 0.5, 6, 1.1);
    pommel(x, 0.3, 1.1);
    // dos hojas, a cada lado
    for (const s of [-1, 1]) {
      const pts: P[] = d.shape === 'wicked'
        ? [[21, s * 0.9], [18.4, s * 4], [16.8, s * 8.6], [21.4, s * 6.6], [26.2, s * 9.4], [28.6, s * 6], [27.6, s * 0.9]]
        : [[21, s * 0.9], [19, s * 3.4], [17.8, s * 7.4], [22.6, s * 8.2], [27.8, s * 7.6], [27.2, s * 3.4], [26.6, s * 0.9]];
      const g = c.poly(A.pts(pts), d.blade, { bias: s < 0 ? 0 : -1 });
      c.px1(A.p(pts[2][0], pts[2][1]), A.p(pts[4][0], pts[4][1]), d.edge ?? d.blade, { tone: s < 0 ? 5 : 4, group: g }, true);
    }
    band(x, 20.4, 1, d.guard);
    band(x, 27, 1, d.guard);
    if (d.gem) c.circle(A.p(23.8, 0), 1.2, gemMat(d.gem));
    if (d.accent && d.accent !== 'none') accent({ ...x, A: new Axis(A.p(18.8, -6.4), DIAG + 90) }, d.accent, 0, 12.8, 0.8);
  },
  maul: (x) => {
    const { c, A, d } = x;
    haft(x, 0.5, 23, 1.05);
    grip(x, 0.5, 6.5, 1.15);
    // cabeza grande de martillo, con caras biseladas
    c.poly(A.pts([[20.4, -6.4], [30, -6.4], [30, 6.4], [20.4, 6.4]]), d.blade);
    c.poly(A.pts([[21.4, -7.6], [29, -7.6], [30, -6.4], [20.4, -6.4]]), d.blade, { bias: 1 });
    c.poly(A.pts([[20.4, 6.4], [30, 6.4], [29, 7.6], [21.4, 7.6]]), d.blade, { bias: -1 });
    for (const v of [-3.4, 3.4]) c.poly(A.pts([[20.2, v - 1.2], [30.2, v - 1.2], [30.2, v + 1.2], [20.2, v + 1.2]]), d.guard);
    if (d.gem) c.circle(A.p(25.2, 0), 1.5, gemMat(d.gem));
    if (d.accent && d.accent !== 'none') accent({ ...x, A: new Axis(A.p(21.8, -5.2), DIAG + 90) }, d.accent, 0, 10.4, 1.2);
  },
  staff: (x) => {
    const { c, A, d } = x;
    const g = haft(x, -1, 26, 0.95);
    band(x, 10, 0.95, d.guard);
    band(x, 16, 0.95, d.guard);
    void g;
    // cabeza: rama retorcida que abraza una gema o un cristal
    const C = A.p(28.6, 0);
    c.ring(C, 3.4, 3.4, 1.1, d.shape === 'bone' ? MAT.bone : d.haft, {}, 100, 350);
    for (const s of [-1, 1]) c.line(A.p(25.6, s * 0.8), A.p(27.4, s * 2.8), 1.2, d.shape === 'bone' ? MAT.bone : d.haft);
    if (d.floating) {
      crystal(x, C, 3, 1.7, d.glow ?? d.gem ?? '#9fe8ff');
      c.dot([C[0] - 4.5, C[1] - 2], glowMat(d.glow ?? '#9fe8ff'), { tone: 5 }, true);
      c.dot([C[0] + 2.5, C[1] + 4.2], glowMat(d.glow ?? '#9fe8ff'), { tone: 4 }, true);
    } else c.circle(C, 2, gemMat(d.gem ?? '#2f62e6'));
    if (d.glow && !d.floating) c.circle(C, 0.9, glowMat(d.glow));
    if (d.accent && d.accent !== 'none') accent(x, d.accent, 4, 24, 0.9);
  },
  spear: (x) => {
    const { c, A, d } = x;
    haft(x, -1, 25, 0.75);
    grip(x, 8, 13, 0.9);
    const g = c.poly(A.pts([[24, -1.2], [26.6, -2.6], [33, 0], [26.6, 2.6], [24, 1.2]]), d.blade, { bias: 0 });
    c.px1(A.p(26.4, 0), A.p(32.2, 0), d.blade, { tone: 5, group: g }, true);
    band(x, 23.2, 0.85, d.guard);
    if (d.feather) c.poly(A.pts([[22.4, 0.8], [23, 0.8], [21, 3.6], [19.6, 3.2]]), { hex: d.feather, kind: 'cloth' });
    if (d.accent && d.accent !== 'none') accent(x, d.accent, 25, 31, 0.8);
  },
  halberd: (x) => {
    const { c, A, d } = x;
    haft(x, -1, 27, 0.8);
    grip(x, 6, 11, 0.95);
    // hacha + pico + punta
    const g = c.poly(A.pts([[20.4, -0.8], [19.4, -3.6], [19.8, -7], [23.4, -6.2], [25.6, -4], [25.6, -0.8]]), d.blade);
    c.px1(A.p(19.6, -6.8), A.p(23.4, -6.2), d.edge ?? d.blade, { tone: 5, group: g }, true);
    c.poly(A.pts([[21.6, 0.8], [24.4, 0.8], [22.6, 4.6]]), d.blade);
    c.poly(A.pts([[26.6, -1], [33, 0], [26.6, 1]]), d.blade);
    band(x, 25.6, 0.9, d.guard);
    if (d.accent && d.accent !== 'none') accent(x, d.accent, 27, 32, 0.5);
  },
  scythe: (x) => {
    const { c, d } = x;
    const B = new Axis([7, 30], -62);
    const y: Ctx = { ...x, A: B };
    haft(y, 0, 28.5, 0.85);
    for (const u of [8, 13]) { c.poly(B.pts([[u, -0.85], [u + 1, -0.85], [u + 1, -2.4], [u, -2.4]]), d.haft); }
    // hoja curva hacia atrás
    const top = B.p(27.4, 0);
    const pts: P[] = [];
    const n = 12;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([top[0] - t * 19, top[1] + 1.5 - Math.sin(t * Math.PI * 0.9) * 4.2 + t * t * 7.5]); }
    const inner: P[] = pts.map(([px, py], i) => [px, py + 3.2 * (1 - i / n) + 0.2]);
    const g = c.poly([...pts, ...inner.reverse()], d.blade);
    for (let i = 0; i < n; i++) c.px1(pts[i], pts[i + 1], d.edge ?? d.blade, { tone: 5, group: g }, true);
    band(y, 26.6, 0.85, d.guard);
    if (d.gem) c.circle(B.p(27.6, 0), 1.1, gemMat(d.gem));
    if (d.glow) for (let i = 2; i < n - 2; i += 3) c.dot([pts[i][0], pts[i][1] + 1.4], glowMat(d.glow), { tone: 4 }, true);
  },
  bow: (x) => bowDraw(x, 13.6, 1.4),
  longbow: (x) => bowDraw(x, 15.8, 1.2),
  crossbow: (x) => {
    const { c, A, d } = x;
    // culata y riel en diagonal, arco de través
    const g = c.poly(A.pts([[1.5, -1.4], [6, -1.6], [8, -1], [27, -0.8], [27, 0.8], [8, 1], [6, 2.6], [1.5, 2]]), d.haft);
    void g;
    c.poly(A.pts([[8, -0.4], [27.5, -0.4], [27.5, 0.4], [8, 0.4]]), MAT.iron, { tone: 2 });
    const C = A.p(23.5, 0);
    const pts: P[] = [];
    for (let i = 0; i <= 12; i++) { const t = -1 + (2 * i) / 12; pts.push(A.p(23.5 - (1 - t * t) * 0 - Math.abs(t) * 3.6, t * 10.6)); }
    for (let i = 0; i < 12; i++) c.line(pts[i], pts[i + 1], 1.5 - Math.abs(i - 6) * 0.08, d.blade, { group: 700 });
    c.px1(pts[0], A.p(15.6, 0), MAT.string, { tone: 4 });
    c.px1(pts[12], A.p(15.6, 0), MAT.string, { tone: 4 });
    c.poly(A.pts([[15.6, -0.5], [26.6, -0.5], [26.6, 0.5], [15.6, 0.5]]), MAT.darkwood);
    c.poly(A.pts([[26.6, -1.2], [29, 0], [26.6, 1.2]]), MAT.steel);
    c.circle(C, 1.2, d.guard);
    if (d.gem) c.circle(C, 0.7, gemMat(d.gem));
    c.poly(A.pts([[7, 1], [8.4, 1], [8.4, 3.6], [7, 3.6]]), MAT.iron);
    if (d.glow) for (const p of [pts[1], pts[11]]) c.dot(p, glowMat(d.glow), { tone: 5 });
  },
};

function bowDraw(x: Ctx, R: number, t: number) {
  const { c, d } = x;
  // arco de diagonal a diagonal, con la cuerda recta y la empuñadura forrada
  const C: P = [16, 16];
  const ax: P = [Math.SQRT1_2, -Math.SQRT1_2], nx: P = [-Math.SQRT1_2, -Math.SQRT1_2];
  const at = (s: number, bend: number): P => [C[0] + ax[0] * s + nx[0] * bend, C[1] + ax[1] * s + nx[1] * bend];
  const pts: P[] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const s = -R + (2 * R * i) / n;
    const q = s / R;
    // recurvo: la panza hacia afuera y las puntas que se vuelven
    const bend = 5.4 * (1 - q * q) - (Math.abs(q) > 0.82 ? (Math.abs(q) - 0.82) * 9 : 0) + (d.shape === 'wicked' ? 0.6 * Math.sin(q * 9) : 0);
    pts.push(at(s, bend));
  }
  for (let i = 0; i < n; i++) c.line(pts[i], pts[i + 1], t + (Math.abs(i - n / 2) < 2 ? 0.6 : 0) - Math.abs(i - n / 2) * 0.03, d.blade, { group: 800 });
  c.px1(pts[0], pts[n], MAT.string, { tone: 4 });
  // empuñadura
  c.line(at(-1.6, 5.4), at(1.6, 5.4), t + 1, d.grip);
  if (d.gem) c.circle(at(0, 6.4), 0.9, gemMat(d.gem));
  if (d.glow) { for (const i of [2, n - 2]) c.dot(pts[i], glowMat(d.glow), { tone: 5 }); c.px1(pts[0], pts[n], glowMat(d.glow), { tone: 4 }); }
  if (d.feather) for (const s of [-1, 1]) { const p = pts[s < 0 ? 1 : n - 1]; c.ellipse([p[0] + s * 0.8, p[1] + 1.4], 0.7, 1.6, { hex: d.feather, kind: 'cloth' }, {}, 30 * s); }
  if (d.accent && d.accent !== 'none' && d.glow) for (let i = 3; i < n - 2; i += 3) c.dot(pts[i], glowMat(d.glow), { tone: 4 }, true);
}

/** Dibuja un arma sobre un lienzo (sin pintar todavía). */
export function drawWeaponIcon(c: IconCanvas, kind: WeaponIcon, design: WeaponDesign = {}) {
  const d = { ...DEFAULT_DESIGN, ...design } as Ctx['d'];
  const A = new Axis([3.6, 28.4], DIAG);
  DRAW[kind]({ c, A, d });
  c.center();
}
