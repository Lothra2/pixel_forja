import { registrar, conVarianteY, type Pieza, type V3 } from '../objeto';
import {
  G, raiz, bloque, ojiva, altoOjiva, letras, grieta, tierra, monticulo, matas, musgo, hiedra, cascotes, calavera, huesoLargo, huesos, huesito,
  esqueleto, costillar, mirar, vela, llama, cadena, voluta, punta, cuervo, arbolMuerto, figuraVelada, rr, elegir, onda, GR, type P2,
} from '../kit_muerte';

/**
 * Cementerio, segunda tanda: lápidas de muchos estilos (cruz celta alta, ángel que llora sobre la piedra, columna
 * truncada, losa hundida, rota, comida por el musgo, con nombre tallado, cruces de madera y de hierro, tumba de
 * niño), mausoleos familiares de tres tamaños con puertas de hierro, tumbas abiertas desde adentro, ataúdes
 * desenterrados, verjas de hierro forjado (tramo, esquina, portón y cerco de parcela), faroles, árboles muertos con
 * cuervos, coronas marchitas, dolientes de piedra, osarios al aire libre, fosa común, palas clavadas, la carreta del
 * enterrador, cuervos que se mueven, velas en las tumbas, la capilla en ruinas y la parca.
 */

const T = 'cementerio' as const;
type Arm = (v: string, f: number, g: G, a: G['a']) => Pieza[] | { piezas: Pieza[]; resplandor?: { c: V3; r: number; color: string } } | void;
/** Registra un objeto armado sobre un grupo raíz (la función puede devolver la escena con su luz). */
function obj(id: string, nombre: [string, string], variantes: string[], huella: [number, number], bloquea: boolean, armar: Arm, extra: { cuadros?: number; t?: number; huellaPor?: Record<string, [number, number]>; plano?: boolean } = {}) {
  registrar({
    id, nombre, tema: T, variantes, huella, bloquea, ...extra,
    armar: (v, f, a) => { const { ps, g } = raiz(a); const r = armar(v, f, g, a); return r ? r : ps; },
  });
}
const PIEDRAS = ['mu_piedra', 'mu_piedra_fria', 'mu_piedra_clara', 'mu_granito'];

// ================================================================== lápidas
/** Cruz celta alta: basa escalonada, fuste con paneles de nudos, anillo y brazos con remate. */
function cruzCelta(g: G, m: string, h: number) {
  const a = g.a;
  bloque(g, 0, 0, 0, 20, 15, 5, { mat: m, tono: -0.06, b: 1.4, j: 0.8, arriba: 0.9 });
  bloque(g, 0, 0, 5, 14, 10, 4, { mat: m, tono: -0.03, b: 1.1, j: 0.6, arriba: 0.88 });
  const zc = h - 10, R = 9.5;
  bloque(g, 0, 0, 9, 7.6, 4.6, zc - 9 + 2, { mat: m, b: 0.8, j: 0.4, arriba: 0.82 });
  // paneles de nudos tallados en la cara del frente
  for (let i = 0; i < 4; i++) { const z = 12 + i * ((zc - 18) / 4); for (const s of [-1, 1]) g.caja(s * 1.3, 2.4, z + (s > 0 ? 1.4 : 0), 1.6, 1.2, 2.4, { mat: m, resta: true, giro: 0 }); g.caja(0, 2.3, z + 3, 4.4, 1.2, 0.8, { mat: m, resta: true }); }
  // anillo
  g.cil(0, -2, zc, R, 4, { mat: m, eje: [0, 1, 0] });
  g.cil(0, -3, zc, R - 2.4, 6, { mat: m, resta: true, eje: [0, 1, 0] });
  // brazos con las puntas ensanchadas
  bloque(g, 0, 0, zc - 2.4, 28, 4.4, 4.8, { mat: m, b: 0.7, j: 0.3 });
  for (const s of [-1, 1]) bloque(g, s * 13.4, 0, zc - 3.2, 2.6, 5, 6.4, { mat: m, b: 0.6, j: 0.3, tono: 0.03 });
  bloque(g, 0, 0, zc, 5, 4.4, 12.5, { mat: m, b: 0.7, j: 0.3, arriba: 0.9 });
  bloque(g, 0, 0, zc + 12, 6.4, 5.2, 2.4, { mat: m, b: 0.6, j: 0.3, tono: 0.04 });
  g.cil(0, 1.6, zc, 2.6, 1.6, { mat: m, tono: 0.08, eje: [0, 1, 0] });
  for (const [x, z] of [[0, 6], [0, -6], [6, 0], [-6, 0]] as P2[]) g.cil(x, 1.8, zc + z, 1, 0.9, { mat: m, tono: 0.06, eje: [0, 1, 0] });
  void a;
}
obj('cem2_cruz_celta_alta', ['Cruz celta alta', 'Tall Celtic high cross'], ['intacta', 'rota', 'inclinada', 'musgo', 'liquen'], [1, 1], true, (v, _f, g, a) => {
  const m = v === 'musgo' ? 'cem_lapida_musgo' : elegir(a, PIEDRAS), h = 50 + a.r() * 8;
  tierra(g, 13, 11, 4);
  const gu = g.sub(0, 0, v === 'inclinada' ? -1.5 : 0, (a.r() - 0.5) * 30, v === 'inclinada' ? (a.r() < 0.5 ? -1 : 1) * (8 + a.r() * 7) : (a.r() - 0.5) * 3, a.r() < 0.5 ? 'x' : 'y');
  cruzCelta(gu, m, h);
  if (v === 'rota') {
    const c = h * (0.42 + a.r() * 0.15);
    gu.poli([[-30, -30, c - 4], [30, -30, c + 3], [-30, 30, c - 1], [30, 30, c + 5], [-30, -30, 99], [30, -30, 99], [-30, 30, 99], [30, 30, 99]], { mat: m, resta: true });
    gu.poli([[-4, -6, c - 5], [4, -6, c - 1], [0, 6, c - 3], [-2, 0, c + 6], [3, 0, c + 7]], { mat: m, resta: true });
    // la cabeza de la cruz tirada al costado
    const ca = g.sub(15 + a.r() * 4, 12 + a.r() * 4, 2.6, -30 + a.r() * 40, 86, 'x');
    const sub = ca.sub(0, 0, -(h - 10));
    cruzCelta(sub, m, h);
    sub.caja(0, 0, -5, 80, 80, h - 22 + 5, { mat: m, resta: true });
    cascotes(g, 5, 9, 8, m, 6, 6);
  }
  if (v === 'musgo') { musgo(gu, 9, -9, 9, 2.6, 6, h * 0.7); for (let i = 0; i < 4; i++) gu.elip(rr(a, -8, 8), 0, h - 10 + rr(a, 3, 5), 2.6, 2.4, 1.1, { mat: 'mu_musgo' }); }
  if (v === 'liquen') musgo(gu, 12, -12, 12, 2.5, 4, h * 0.9, 'mu_liquen');
  matas(g, 4, 11, 10);
});

/** Ala plegada que cae hacia atrás: plumas que se funden en una lámina con el borde festoneado (figura mirando +x). */
function ala(g: G, s: number, zh: number, mat: string, k = 1) {
  const S: V3 = [-1.8, s * 2.6, zh - 4 * k], E: V3 = [-4.5, s * 4.6, zh + 3.5 * k], W: V3 = [-7.5, s * 4.4, zh + 1 * k];
  const cs = [g.hu(S, E, 1.6 * k, 1.3 * k), g.hu(E, W, 1.3 * k, 1 * k)];
  for (let i = 0; i < 6; i++) { const t = i / 5, o: V3 = [S[0] + (W[0] - S[0]) * t, S[1] + (W[1] - S[1]) * t, (S[2] + (E[2] - S[2]) * Math.sin(t * Math.PI) * 1.2 + (W[2] - S[2]) * t)]; cs.push(g.hu(o, [o[0] - 2 - t * 3, o[1] + s * 0.5, zh - (12 + t * 10) * k], 1.5 * k, 0.55 * k)); }
  g.masa(cs, { mat, tono: 0.06, suave: 1.1 * k });
}
/** Lápida de hombros: cuerpo, hombros redondeados y arco al centro. Devuelve el alto. */
function lapidaHombros(g: G, m: string, w: number, h: number, d: number) {
  bloque(g, 0, 0, 0, w + 4, d + 4, 2.6, { mat: m, tono: -0.06, b: 0.8, j: 0.6 });
  bloque(g, 0, 0, 2.4, w, d, h - 2.4 - w * 0.28, { mat: m, b: 0.7, j: 0.35 });
  g.cil(0, -d / 2, h - w * 0.28 - 0.4, w * 0.28, d, { mat: m, eje: [0, 1, 0] });
  for (const s of [-1, 1]) g.cil(s * w * 0.36, -d / 2, h - w * 0.28 - 2.2, w * 0.14, d, { mat: m, eje: [0, 1, 0] });
  return h;
}
obj('cem2_lapida_angel', ['Lápida con ángel que llora', 'Tombstone with weeping angel'], ['intacta', 'decapitada', 'musgo', 'hiedra'], [2, 1], true, (v, _f, g, a) => {
  const m = v === 'musgo' ? 'cem_lapida_musgo' : elegir(a, ['mu_piedra', 'mu_piedra_fria']), mf = v === 'musgo' ? 'cem_lapida_musgo' : 'mu_marmol';
  tierra(g, 18, 12, 4);
  const gu = g.sub(-2, -2, 0, (a.r() - 0.5) * 16);
  lapidaHombros(gu, m, 17, 27, 4.2);
  letras(gu, -5, 5, 2.4, 15, 4, m);
  gu.cil(0, 1.6, 21, 2.4, 1.4, { mat: m, resta: true, eje: [0, 1, 0] });
  // el ángel arrodillado de costado, con la cara escondida en el brazo sobre la piedra
  const an = gu.sub(10.5, 4, 0, 160 + (a.r() - 0.5) * 10);
  const zh = figuraVelada(an, 30, { mat: mf, pose: 'cubre_cara', tono: -0.05 });
  if (v === 'decapitada') { an.elip(1.4, 0, zh + 0.5, 3.4, 3.4, 3, { mat: mf, resta: true }); gu.elip(15, 9, 1.8, 2.2, 2, 2, { mat: mf, tono: 0.02 }); cascotes(g, 3, 5, 3, mf, 14, 9, 1.6); }
  for (const s of [-1, 1]) ala(an, s, zh, mf);
  if (v === 'musgo') { musgo(gu, 8, -8, 8, 2.4, 3, 20); musgo(an, 6, -4, 4, 4, 4, zh); }
  if (v === 'hiedra') { hiedra(gu, [[-9, 3, 0], [-8, 2.8, 8], [-6, 2.6, 16], [-2, 2.4, 24], [3, 1, 27.5]], 4); hiedra(g, [[6, 8, 0], [10, 6, 2], [14, 4, 0.5]], 3); }
  matas(g, 4, 16, 10);
});

/** Columna truncada, urna velada, esfera y obelisco caído: los monumentos del que se fue antes de tiempo. */
obj('cem2_obelisco_velado', ['Monumento velado', 'Draped monument'], ['columna_rota', 'urna_velada', 'esfera', 'caido'], [1, 1], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_marmol', 'mu_piedra_clara', 'mu_piedra']);
  tierra(g, 13, 13, 4);
  const gu = g.sub(0, 0, 0, (a.r() - 0.5) * 20);
  bloque(gu, 0, 0, 0, 17, 17, 4, { mat: m, tono: -0.07, b: 1.2, j: 0.8 });
  bloque(gu, 0, 0, 4, 13, 13, 10, { mat: m, tono: -0.02, b: 0.9, j: 0.5 });
  bloque(gu, 0, 0, 14, 15, 15, 2.4, { mat: m, tono: 0.03, b: 0.8, j: 0.4 });
  letras(gu, -4.5, 4.5, 6.6, 11, 3, m);
  if (v === 'columna_rota') {
    const H = 18 + a.r() * 8;
    gu.cil(0, 0, 16.4, 5.4, 2, { mat: m, r1: 4.8 });
    for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; gu.cil(Math.cos(t) * 4.6, Math.sin(t) * 4.6, 18, 0.9, H, { mat: m, tono: 0.04 }); }
    gu.cil(0, 0, 18, 4.5, H, { mat: m });
    gu.poli([[-9, -9, 18 + H - 3], [9, -9, 18 + H + 2], [-9, 9, 18 + H], [9, 9, 18 + H + 5], [-9, -9, 99], [9, -9, 99], [-9, 9, 99], [9, 9, 99]], { mat: m, resta: true });
    // el paño que cae sobre la columna rota
    const cs = [gu.bu([0, 0, 18 + H - 1], [5.6, 5.6, 2.4]), gu.hu([3, 3, 18 + H - 2], [5, 5.5, 18 + H - 14], 2.2, 1.4), gu.hu([-2, 4, 18 + H - 2], [-3, 5.6, 18 + H - 10], 2, 1.2), gu.hu([4, -1, 18 + H - 2], [5.6, -1.8, 18 + H - 9], 1.8, 1.1)];
    gu.masa(cs, { mat: 'mu_marmol', tono: 0.06, suave: 1.6 });
    cascotes(g, 3, 8, 8, m, 10, 6, 2);
  } else if (v === 'urna_velada' || v === 'esfera') {
    const zt = 40 + a.r() * 8;
    gu.poli([[-4, -4, 16.4], [4, -4, 16.4], [-4, 4, 16.4], [4, 4, 16.4], [-2.8, -2.8, zt], [2.8, -2.8, zt], [-2.8, 2.8, zt], [2.8, 2.8, zt]], { mat: m });
    gu.poli([[-2.8, -2.8, zt], [2.8, -2.8, zt], [-2.8, 2.8, zt], [2.8, 2.8, zt], [0, 0, zt + 2.5]], { mat: m, tono: 0.04 });
    gu.caja(0, 0, zt + 1, 5, 5, 1.6, { mat: m, tono: 0.05 });
    if (v === 'esfera') gu.esf(0, 0, zt + 6.5, 4.4, { mat: elegir(a, ['mu_marmol_negro', 'mu_granito', m]) });
    else {
      const u = gu.sub(0, 0, zt + 2.4);
      u.cil(0, 0, 0, 2.6, 1.4, { mat: m, r1: 1.6 });
      const cs = [u.bu([0, 0, 6], [4.2, 4.2, 4.6]), u.hu([0, 0, 9], [0, 0, 12], 2.2, 2.8)];
      for (let i = 0; i < 5; i++) { const t = a.r() * 6.28; cs.push(u.hu([Math.cos(t) * 2, Math.sin(t) * 2, 11], [Math.cos(t) * 4.8, Math.sin(t) * 4.8, 2 + a.r() * 3], 1.2, 0.8)); }
      u.masa(cs, { mat: m, tono: 0.05, suave: 1.5 });
    }
    gu.caja(0, 3, 24, 3, 2, 4, { mat: m, resta: true });
  } else {
    // obelisco caído en dos pedazos al lado de la basa
    const L = 30 + a.r() * 6;
    const o = g.sub(7, 4, 3.4, -10 + a.r() * 30, -90, 'y').sub(0, 0, -8);
    o.poli([[-3.8, -3.8, 8], [3.8, -3.8, 8], [-3.8, 3.8, 8], [3.8, 3.8, 8], [-2.8, -2.8, 8 + L * 0.55], [2.8, -2.8, 8 + L * 0.55], [-2.8, 2.8, 8 + L * 0.55], [2.8, 2.8, 8 + L * 0.55]], { mat: m });
    const p = g.sub(26 + a.r() * 4, -2 + a.r() * 8, 2.6, -20 + a.r() * 30, -88, 'y');
    p.poli([[-2.8, -2.8, 0], [2.8, -2.8, 0], [-2.8, 2.8, 0], [2.8, 2.8, 0], [-2.2, -2.2, L * 0.35], [2.2, -2.2, L * 0.35], [-2.2, 2.2, L * 0.35], [2.2, 2.2, L * 0.35], [0, 0, L * 0.35 + 3]], { mat: m, tono: -0.03 });
    gu.poli([[-4, -4, 16.4], [4, -4, 16.4], [-4, 4, 16.4], [4, 4, 16.4], [-4, -4, 19], [4, -4, 22], [-4, 4, 20]], { mat: m });
    cascotes(g, 6, 12, 10, m, 14, 2, 2);
  }
  musgo(gu, 3, -6, 6, 7, 1, 10);
  matas(g, 3, 12, 12);
});

/** Losa sepulcral que se hundió en la tierra. */
obj('cem2_losa_hundida', ['Losa hundida', 'Sunken grave slab'], ['hundida', 'partida', 'musgo', 'levantada', 'hiedra'], [1, 2], false, (v, _f, g, a) => {
  const m = v === 'musgo' ? 'cem_lapida_musgo' : elegir(a, PIEDRAS);
  tierra(g, 13, 21, 3, 'mu_tierra');
  const inc = v === 'levantada' ? 0 : 4 + a.r() * 5;
  const gu = g.sub(0, 0, v === 'levantada' ? 0 : -1.4, (a.r() - 0.5) * 14, (a.r() < 0.5 ? -1 : 1) * inc, a.r() < 0.5 ? 'x' : 'y');
  const cruz = (s: G) => { s.caja(0, -3, 3.2, 2, 14, 2, { mat: m, resta: true }); s.caja(0, -6.5, 3.2, 8, 2, 2, { mat: m, resta: true }); for (let i = 0; i < 2; i++) s.caja(0, 9 + i * 2.4, 3.2, 7 - i * 2, 1.1, 2, { mat: m, resta: true }); };
  if (v === 'partida') {
    const c = (a.r() - 0.5) * 8;
    bloque(gu, 0, -15 + (c + 15) / 2 - 0.5, 0, 15, c + 15 - 1, 4, { mat: m, b: 0.9, j: 0.8 });
    const s2 = gu.sub(0, 0, -1.6, (a.r() - 0.5) * 8, -6, 'x');
    bloque(s2, 0, c + (15 - c) / 2 + 0.6, 0, 15, 15 - c, 4, { mat: m, b: 0.9, j: 0.8, tono: -0.04 });
    cruz(gu);
    cascotes(gu, 3, 6, 1.5, m, 0, c, 1.6);
    gu.elip(0, c + 0.4, 0.3, 7, 1.4, 1, { mat: 'negro' });
  } else if (v === 'levantada') {
    // la losa corrida de lado deja ver el hueco negro de la tumba
    gu.elip(0, 0, 0.1, 7.5, 14, 0.6, { mat: 'negro' });
    gu.caja(0, 0, 0.2, 16, 30, 0.3, { mat: 'negro' });
    for (const s of [-1, 1]) bloque(gu, s * 8.6, 0, -0.5, 2.2, 32, 2, { mat: m, tono: -0.1, b: 0.5 });
    for (const s of [-1, 1]) bloque(gu, 0, s * 15.6, -0.5, 18, 2.2, 2, { mat: m, tono: -0.1, b: 0.5 });
    const t = gu.sub(10, 6, 0, 14 + a.r() * 20, -16, 'y');
    bloque(t, 0, 0, 0, 15, 30, 4, { mat: m, b: 0.9, j: 0.8 }); cruz(t);
    gu.palo([-6, -8, 0.4], [3, 10, 0.4], 0.9, { mat: 'mu_madera' });
  } else {
    bloque(gu, 0, 0, 0, 15, 30, 4, { mat: m, b: 1, j: 0.9 });
    cruz(gu);
    grieta(gu.sub(0, 0, 0, 90, 90, 'x'), (a.r() - 0.5) * 8, 4, -12, 12, m);
  }
  if (v === 'musgo') for (let i = 0; i < 9; i++) gu.elip(rr(a, -7, 7), rr(a, -14, 14), 3.6, 2 + a.r() * 2.5, 2 + a.r() * 3, 0.8, { mat: 'mu_musgo', giro: a.r() * 90 });
  if (v === 'hiedra') hiedra(gu, [[-8, -12, 1], [-5, -6, 4.2], [-2, 2, 4.2], [3, 6, 4.3], [6, 14, 4.2], [9, 17, 0.5]], 5);
  // borde de tierra que traga la losa
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; g.elip(Math.cos(t) * 9, Math.sin(t) * 16.5, 0.2, 2 + a.r() * 1.5, 2.4 + a.r() * 1.5, 1 + a.r() * 0.8, { mat: 'mu_tierra', tono: 0.04, giro: a.r() * 90 }); }
  matas(g, 4, 9, 17);
});

/** Lápida partida: queda el pie en la tierra y los pedazos alrededor. */
obj('cem2_lapida_rota', ['Lápida rota', 'Broken tombstone'], ['mitad', 'astillada', 'caida', 'base_sola', 'pedazos'], [1, 1], false, (v, _f, g, a) => {
  const m = elegir(a, PIEDRAS), w = 13 + a.r() * 4, d = 4.2, h = 22 + a.r() * 6;
  tierra(g, 11, 10, 4);
  const gu = g.sub(0, -1, 0, (a.r() - 0.5) * 24, (a.r() - 0.5) * 6, 'x');
  const cuerpo = (s: G) => { bloque(s, 0, 0, 0, w + 3, d + 3, 2.6, { mat: m, tono: -0.06, b: 0.8, j: 0.6 }); bloque(s, 0, 0, 2.4, w, d, h - w / 2, { mat: m, b: 0.6, j: 0.4 }); s.cil(0, -d / 2, h - w / 2 + 2.2, w / 2, d, { mat: m, eje: [0, 1, 0] }); };
  if (v === 'caida') {
    // la lápida entera de espaldas sobre el pasto, con la base arrancada
    const s = g.sub(2, 4, 2.2, (a.r() - 0.5) * 40, -86, 'x').sub(0, 0, -h * 0.5);
    cuerpo(s); letras(s, -w / 2 + 3, w / 2 - 3, d / 2, h - 9, 4, m);
    monticulo(g, 9, 4, 2.2, 'mu_tierra', 3, 0, -h * 0.5 - 2, 3);
  } else {
    cuerpo(gu);
    letras(gu, -w / 2 + 3, w / 2 - 3, d / 2, h - 9, 4, m);
    const c = v === 'base_sola' ? 4 + a.r() * 2 : v === 'astillada' ? h * 0.65 : h * (0.35 + a.r() * 0.2);
    const sx = (a.r() - 0.5) * 0.6;
    gu.poli([[-20, -20, c - 20 * sx], [20, -20, c + 20 * sx], [-20, 20, c - 20 * sx], [20, 20, c + 20 * sx], [-20, -20, 99], [20, -20, 99], [-20, 20, 99], [20, 20, 99]], { mat: m, resta: true });
    for (let i = 0; i < (v === 'astillada' ? 4 : 2); i++) { const x = rr(a, -w / 2, w / 2); gu.poli([[x - 3, -5, c + x * sx - 3], [x + 3, -5, c + x * sx - 1], [x, 5, c + x * sx - 4], [x, 0, c + x * sx + 6]], { mat: m, resta: true }); }
    if (v !== 'base_sola') grieta(gu, rr(a, -3, 3), d / 2, 3, c - 1, m);
    // el pedazo de arriba en el piso
    if (v !== 'base_sola' || a.r() < 0.5) {
      const p = g.sub(rr(a, 8, 14) * (a.r() < 0.5 ? 1 : -1), rr(a, 6, 11), d / 2 - 0.5, a.r() * 180, 86, 'x').sub(0, 0, -c - 1);
      cuerpo(p);
      p.poli([[-20, -20, c - 20 * sx], [20, -20, c + 20 * sx], [-20, 20, c - 20 * sx], [20, 20, c + 20 * sx], [-20, -20, -9], [20, -20, -9], [-20, 20, -9], [20, 20, -9]], { mat: m, resta: true });
    }
  }
  cascotes(g, v === 'pedazos' ? 9 : 4, 11, 9, m, 3, 5, v === 'pedazos' ? 2.6 : 1.8);
  musgo(gu, 3, -w / 2, w / 2, d / 2, 2, 8);
  matas(g, 4, 10, 9);
});

/** Lápida tragada por el musgo: un manto verde que la cubre y le cae por los costados. */
obj('cem2_lapida_musgo', ['Lápida cubierta de musgo', 'Moss-covered tombstone'], ['redonda', 'ojival', 'cruz_baja', 'hundida'], [1, 1], true, (v, _f, g, a) => {
  const m = 'cem_lapida_musgo', w = 13 + a.r() * 3, d = 4.6;
  tierra(g, 11, 10, 3, 'mu_tierra');
  const gu = g.sub(0, 0, v === 'hundida' ? -7 : 0, (a.r() - 0.5) * 26, (a.r() - 0.5) * (v === 'hundida' ? 22 : 8), a.r() < 0.5 ? 'x' : 'y');
  let h = 22 + a.r() * 5;
  if (v === 'ojival') { bloque(gu, 0, 0, 0, w + 3, d + 3, 2.6, { mat: m, b: 0.8, j: 0.7 }); gu.prisma(ojiva(w, h - 2.6 - altoOjiva(w, 0, 0.8), 0.8, 4, 2.6), -d / 2, d / 2, { mat: m }); }
  else if (v === 'cruz_baja') { h = 26 + a.r() * 4; bloque(gu, 0, 0, 0, 11, 9, 4, { mat: m, b: 1, j: 0.7 }); bloque(gu, 0, 0, 4, 4.6, 4, h - 4, { mat: m, b: 0.6, j: 0.4 }); bloque(gu, 0, 0, h * 0.62, 15, 4, 4.4, { mat: m, b: 0.6, j: 0.4 }); }
  else { bloque(gu, 0, 0, 0, w + 3, d + 3, 2.6, { mat: m, b: 0.8, j: 0.7 }); bloque(gu, 0, 0, 2.4, w, d, h - w / 2 - 2.4, { mat: m, b: 0.6, j: 0.4 }); gu.cil(0, -d / 2, h - w / 2, w / 2, d, { mat: m, eje: [0, 1, 0] }); }
  // manto de musgo: cojines sobre el canto y lenguas que bajan
  const cs = [];
  const top = v === 'cruz_baja' ? h * 0.62 + 4.4 : h;
  for (let i = 0; i < 5; i++) { const x = rr(a, -w / 2 + 1, w / 2 - 1); cs.push(gu.bu([x, 0, (v === 'cruz_baja' ? top : top - Math.abs(x) * (v === 'ojival' ? 0.7 : 0.3)) - 0.6], [2.6 + a.r() * 1.5, d * 0.62, 1.4 + a.r() * 0.6])); }
  for (let i = 0; i < 4; i++) { const x = rr(a, -w / 2 + 1, w / 2 - 1), L = rr(a, 4, top * 0.6); cs.push(gu.hu([x, d / 2 - 0.2, top - 2], [x + rr(a, -1.5, 1.5), d / 2 + 0.2, top - 2 - L], 1.3, 0.7)); }
  for (let i = 0; i < 4; i++) cs.push(gu.bu([rr(a, -w / 2, w / 2), rr(a, -d, d), 1], [3 + a.r() * 2, 2.5 + a.r() * 2, 1.6 + a.r() * 1.5]));
  gu.masa(cs, { mat: 'mu_musgo', suave: 1.4 });
  musgo(gu, 6, -w / 2, w / 2, d / 2 + 0.2, 1, top * 0.7, 'mu_liquen');
  for (let i = 0; i < 6; i++) { const t = a.r() * 6.28; g.elip(Math.cos(t) * 8, Math.sin(t) * 7, 0.4, 3 + a.r() * 2, 2 + a.r() * 2, 1.4, { mat: 'mu_musgo', giro: a.r() * 90 }); }
  matas(g, 6, 10, 9);
});

/** Lápidas con el nombre tallado: hombros, frontón, libro abierto, pergamino y la doble del matrimonio. */
obj('cem2_lapida_nombre', ['Lápida con nombre tallado', 'Engraved name tombstone'], ['hombros', 'fronton', 'libro', 'pergamino', 'doble'], [1, 1], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_piedra', 'mu_piedra_fria', 'mu_marmol', 'mu_granito', 'mu_marmol_negro']), d = 4.2;
  tierra(g, 11, 10, 3);
  const gu = g.sub(0, -1, 0, (a.r() - 0.5) * 22, (a.r() - 0.5) * 5, 'y');
  if (v === 'hombros') { lapidaHombros(gu, m, 15, 25, d); letras(gu, -4.5, 4.5, d / 2, 18, 5, m); gu.cil(0, d / 2 - 0.8, 21.5, 1.6, 1.4, { mat: m, resta: true, eje: [0, 1, 0] }); }
  else if (v === 'fronton') {
    bloque(gu, 0, 0, 0, 18, 8, 3, { mat: m, tono: -0.05, b: 0.8, j: 0.6 });
    bloque(gu, 0, 0, 3, 14, d, 16, { mat: m, b: 0.6, j: 0.3 });
    for (const s of [-1, 1]) bloque(gu, s * 6.5, 0.6, 3, 2.4, d + 1.4, 16, { mat: m, tono: 0.04, b: 0.5, j: 0.2 });
    gu.prisma([[-9, 19], [9, 19], [0, 25.5]], -d / 2 - 0.6, d / 2 + 0.6, { mat: m, tono: 0.03 });
    gu.caja(0, 0, 18.5, 17, d + 1.6, 1.4, { mat: m, tono: 0.06 });
    for (const x of [-8.5, 0, 8.5]) gu.esf(x, 0, x ? 20 : 26, 1.2, { mat: m, tono: 0.06 });
    gu.prisma([[-5.6, 20.2], [5.6, 20.2], [0, 23.8]], d / 2 - 0.4, d / 2 + 2, { mat: m, resta: true });
    letras(gu, -4.2, 4.2, d / 2, 15.5, 5, m);
  } else if (v === 'libro') {
    bloque(gu, 0, 0, 0, 16, 11, 5, { mat: m, tono: -0.05, b: 1, j: 0.7, arriba: 0.9 });
    for (const s of [-1, 1]) {
      const p = gu.sub(s * 0.4, 0, 5, 0, s * -22, 'y');
      bloque(p, s * 5, 0, 0, 10, 9, 2.2, { mat: m, b: 0.5, j: 0.3 });
      for (let i = 0; i < 4; i++) p.caja(s * 5, -2.6 + i * 1.8, 2, 7 * (i === 0 ? 1 : 0.6 + a.r() * 0.3), 0.7, 0.6, { mat: m, resta: true });
    }
    gu.cil(0, -4.6, 6, 1.4, 9.2, { mat: m, eje: [0, 1, 0], tono: 0.04 });
  } else if (v === 'pergamino') {
    bloque(gu, 0, 0, 0, 17, 8, 3, { mat: m, tono: -0.05, b: 0.8, j: 0.6 });
    bloque(gu, 0, 0, 3, 13, d, 17, { mat: m, b: 0.5, j: 0.3 });
    for (const z of [20.4, 4.6]) { gu.cil(-7.5, 0, z, 2, 15, { mat: m, eje: [1, 0, 0], tono: 0.05 }); for (const s of [-1, 1]) gu.cil(s * 7.6 - (s > 0 ? 0.4 : 0), -2.2, z, 0.9, 4.4, { mat: m, resta: true, eje: [0, 1, 0] }); }
    letras(gu, -4.5, 4.5, d / 2, 16.5, 5, m);
  } else {
    // doble: dos arcos juntos sobre una sola basa, con un corazón
    bloque(gu, 0, 0, 0, 30, 8, 3, { mat: m, tono: -0.05, b: 0.8, j: 0.6 });
    bloque(gu, 0, 0, 3, 26, d, 14, { mat: m, b: 0.5, j: 0.3 });
    for (const s of [-1, 1]) gu.cil(s * 6.5, -d / 2, 17, 6.5, d, { mat: m, eje: [0, 1, 0] });
    for (const s of [-1, 1]) letras(gu, s * 6.5 - 3.6, s * 6.5 + 3.6, d / 2, 16, 4, m);
    gu.esf(-0.7, d / 2, 18.6, 1.2, { mat: m, tono: 0.08 }); gu.esf(0.7, d / 2, 18.6, 1.2, { mat: m, tono: 0.08 }); gu.poli([[-1.8, d / 2, 18.4], [1.8, d / 2, 18.4], [0, d / 2, 16], [0, d / 2 + 0.9, 18]], { mat: m, tono: 0.08 });
  }
  if (a.r() < 0.6) musgo(gu, 4, -7, 7, d / 2 + 0.1, 2, 9, a.r() < 0.5 ? 'mu_musgo' : 'mu_liquen');
  if (a.r() < 0.5) { const c = g.sub(rr(a, -6, 6), 7, 0, a.r() * 180); c.palo([0, 0, 0.6], [5, 1, 0.8], 0.4, { mat: 'mu_hoja_seca' }); c.esf(5.4, 1, 1, 1.3, { mat: 'mu_flor' }); }
  matas(g, 3, 10, 9);
});

/** Cruz de madera clavada en la tierra: la tumba de los que no pagaron piedra. */
obj('cem2_cruz_madera', ['Cruz de madera', 'Wooden grave cross'], ['simple', 'con_trapo', 'torcida', 'con_casco', 'con_rosario'], [1, 2], false, (v, _f, g, a) => {
  monticulo(g, 9, 20, 4 + a.r() * 2, 'mu_tierra', 5, 0, 4, 6);
  const c = g.sub(0, -15, 0, (a.r() - 0.5) * 30, v === 'torcida' ? 14 + a.r() * 8 : (a.r() - 0.5) * 8, a.r() < 0.5 ? 'x' : 'y');
  const h = 28 + a.r() * 8, mat = a.r() < 0.5 ? 'mu_madera' : 'madera_vieja';
  const tabla = (x: number, z: number, w: number, d: number, hh: number, giro = 0) => { c.caja(x, 0, z, w, d, hh, { mat, giro, tono: (a.r() - 0.5) * 0.1 }); };
  tabla(0, -3, 3.2, 2.6, h + 3);
  const zb = h * 0.66;
  tabla(0, zb, 15 + a.r() * 3, 2.4, 3, (a.r() - 0.5) * 8);
  c.caja(0, 0, zb + 0.4, 3.6, 3.2, 2.2, { mat: 'cuerda' });
  c.poli([[-1.6, -1.3, h], [1.6, -1.3, h], [-1.6, 1.3, h], [1.6, 1.3, h], [0, -1.3, h + 1.6], [0, 1.3, h + 1.6]], { mat });
  c.caja(0, 1.3, zb - 4, 2, 0.6, 2.4, { mat: 'madera_vieja', tono: 0.12 });
  if (v === 'con_trapo') { const cs = [c.hu([4, 1.6, zb + 1], [6, 2.4, zb - 9], 1.4, 0.8), c.hu([4.6, 1.6, zb + 1], [8, 1.6, zb - 6], 1.2, 0.6)]; c.masa(cs, { mat: 'tela_roja', tono: -0.15, suave: 1.2 }); }
  if (v === 'con_casco') { const k = c.sub(0, 0, h - 1, (a.r() - 0.5) * 30, 12); k.elip(0, 0, 1.2, 4.2, 4.2, 3.6, { mat: 'mu_oxido' }); k.elip(0, 0, 0.6, 4.2, 4.2, 3, { mat: 'mu_oxido', resta: true }); k.cil(0, 0, 0.4, 4.8, 0.7, { mat: 'mu_oxido', tono: 0.05 }); }
  if (v === 'con_rosario') { for (let i = 0; i < 12; i++) { const t = (i / 11) * Math.PI; c.esf(Math.cos(t) * 2.4, 1.8, zb - 1 - Math.sin(t) * 6, 0.55, { mat: 'mu_madera', tono: 0.15 }); } c.caja(0, 2, zb - 9, 1.1, 0.5, 2.4, { mat: 'mu_hierro' }); c.caja(0, 2, zb - 8, 2, 0.5, 0.6, { mat: 'mu_hierro' }); }
  if (v === 'torcida' || a.r() < 0.4) { const p = g.sub(rr(a, -4, 4), rr(a, 6, 14), 0.8, a.r() * 180); p.elip(0, 0, 0, 3, 2, 1, { mat: 'mu_flor', tono: -0.1 }); p.palo([0, 0, 0.4], [4, 1, 0.6], 0.4, { mat: 'mu_hoja_seca' }); }
  matas(g, 5, 9, 18, 0, 3);
});

/** Cruz de hierro forjado con volutas, sobre un dado de piedra. */
obj('cem2_cruz_hierro', ['Cruz de hierro forjado', 'Wrought iron grave cross'], ['recta', 'inclinada', 'oxidada', 'con_corona'], [1, 1], true, (v, _f, g, a) => {
  const m = v === 'oxidada' ? 'mu_oxido' : 'mu_hierro', ms = elegir(a, PIEDRAS);
  tierra(g, 9, 9, 3);
  const b = g.sub(0, 0, 0, (a.r() - 0.5) * 30);
  bloque(b, 0, 0, 0, 10, 10, 5, { mat: ms, b: 1, j: 0.7, arriba: 0.86 });
  const c = b.sub(0, 0, 5, 0, v === 'inclinada' ? 12 + a.r() * 8 : (a.r() - 0.5) * 4, 'y');
  const h = 38 + a.r() * 6, zb = h * 0.68;
  c.caja(0, 0, 0, 1.8, 1.8, h, { mat: m }); c.caja(0, 0, zb, 18, 1.8, 1.8, { mat: m });
  for (const [x, z] of [[0, h], [-9, zb + 0.9], [9, zb + 0.9]] as P2[]) { const dir = x === 0 ? [0, 1] : [Math.sign(x), 0]; c.poli([[x - 1.6 * (dir[1] ? 1 : 0), -0.8, z + (dir[1] ? 0 : -1.6)], [x + 1.6 * (dir[1] ? 1 : 0), -0.8, z + (dir[1] ? 0 : 1.6)], [x - 1.6 * (dir[1] ? 1 : 0), 0.8, z + (dir[1] ? 0 : -1.6)], [x + 1.6 * (dir[1] ? 1 : 0), 0.8, z + (dir[1] ? 0 : 1.6)], [x + dir[0] * 3, 0, z + dir[1] * 3]], { mat: m }); }
  // volutas en los cuatro ángulos y un aro al centro
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) voluta(c, sx * 3.4, zb + 0.9 + sz * 3.4, 2.4, 1.1, sx, 0.45, m);
  c.cil(0, -0.6, zb + 0.9, 4.4, 1.2, { mat: m, eje: [0, 1, 0] }); c.cil(0, -1, zb + 0.9, 3.6, 2, { mat: m, resta: true, eje: [0, 1, 0] });
  c.caja(0, 0, 4, 6, 1.6, 6, { mat: m, tono: 0.05 }); letras(c, -2, 2, 0.8, 8.4, 2, m, 1.8, 0.8);
  for (const s of [-1, 1]) voluta(c, s * 3, 2.4, 2, 0.9, -s, 0.45, m);
  if (v === 'con_corona') { for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2; c.elip(Math.cos(t) * 4.2, 1.8, zb - 5 + Math.sin(t) * 4.2, 1.5, 1, 1.5, { mat: i % 3 ? 'mu_hoja_seca' : 'mu_flor', tono: (a.r() - 0.5) * 0.15, giro: t * 57 }); } c.palo([0, 1.6, zb + 0.5], [0, 1.8, zb - 1], 0.3, { mat: 'cuerda' }); }
  if (v === 'oxidada') for (let i = 0; i < 4; i++) b.elip(rr(a, -3, 3), 5.2, rr(a, 1, 4), 1, 0.4, 1.8, { mat: 'mu_oxido', tono: -0.1 });
  matas(g, 4, 9, 9);
});

/** Tumba de niño: piedra chica con un cordero, un angelito o un corazón, y juguetes viejos. */
obj('cem2_tumba_nino', ['Tumba de niño', "Child's grave"], ['cordero', 'angelito', 'corazon', 'muneca'], [1, 2], false, (v, _f, g, a) => {
  const m = elegir(a, ['mu_marmol', 'mu_piedra_clara']);
  monticulo(g, 7, 13, 3, 'mu_tierra', 4, 0, 4, 4);
  for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2; g.elip(Math.cos(t) * 8, 4 + Math.sin(t) * 14, 0.8, 1.6 + a.r(), 1.6 + a.r(), 1.4, { mat: 'mu_piedra_clara', tono: (a.r() - 0.5) * 0.2, giro: a.r() * 90 }); }
  const s = g.sub(0, -11, 0, (a.r() - 0.5) * 18, (a.r() - 0.5) * 8);
  bloque(s, 0, 0, 0, 11, 7, 6, { mat: m, b: 0.8, j: 0.5, arriba: 0.9 });
  letras(s, -3, 3, 3.5, 4, 2, m, 1.8, 0.8);
  if (v === 'cordero') {
    const c = s.sub(0, 0, 6, 70 + (a.r() - 0.5) * 30);
    const cs = [c.bu([0, 0, 3.2], [4.4, 2.8, 2.6]), c.bu([4, 0, 5], [1.8, 1.4, 1.9], { eje: [1, 0, -0.4] }), c.bu([-0.5, 0, 0.8], [3.8, 2.6, 1.2])];
    for (const sx of [-1, 1]) cs.push(c.bu([4.3, sx * 1.4, 5.8], [0.9, 0.4, 0.5]));
    c.masa(cs, { mat: m, tono: 0.08, suave: 1 });
  } else if (v === 'angelito') {
    const c = s.sub(0, 0, 6, 75);
    const cs = [c.bu([0, 0, 2.5], [3, 3, 2.6]), c.hu([0, 0, 3], [0, 0, 8], 2.4, 2), c.bu([0.4, 0, 10.2], [2.2, 2.2, 2.3])];
    for (const sx of [-1, 1]) cs.push(c.hu([0.5, sx * 2, 7.5], [2.2, sx * 0.6, 6], 0.9, 0.8));
    c.masa(cs, { mat: m, tono: 0.08, suave: 1 });
    for (const sx of [-1, 1]) c.poli([[-1, sx * 1.5, 8.5], [-1.2, sx * 1.5, 5], [-3, sx * 5, 11], [-3.5, sx * 4.6, 6.5]], { mat: m, tono: 0.12 });
  } else if (v === 'corazon') {
    const c = s.sub(0, 0, 6);
    for (const sx of [-1, 1]) c.cil(sx * 2.2, -1.2, 6.5, 3.1, 2.4, { mat: m, eje: [0, 1, 0], tono: 0.05 });
    c.poli([[-5.2, -1.2, 6], [5.2, -1.2, 6], [-5.2, 1.2, 6], [5.2, 1.2, 6], [0, -1.2, 0], [0, 1.2, 0]], { mat: m, tono: 0.05 });
  } else {
    bloque(s, 0, 0, 6, 8, 4, 6, { mat: m, b: 0.6, j: 0.3 }); s.cil(0, -2, 12, 4, 4, { mat: m, eje: [0, 1, 0] });
    // una muñeca de trapo apoyada en la piedra
    const d = g.sub(3, -5, 0, 200 + (a.r() - 0.5) * 30);
    const cs = [d.bu([0, 0, 3], [1.6, 2, 2.6]), d.bu([0.4, 0, 6.4], [1.5, 1.5, 1.6])];
    for (const sx of [-1, 1]) cs.push(d.hu([0, sx * 1.6, 4.4], [1.6, sx * 3, 2.4], 0.6, 0.5), d.hu([0.6, sx * 0.9, 1], [3.6, sx * 1.4, 0.5], 0.7, 0.6));
    d.masa(cs, { mat: 'mu_mortaja', suave: 0.8 });
    for (const sx of [-1, 1]) d.esf(1.8, sx * 0.6, 6.6, 0.35, { mat: 'negro' });
  }
  for (let i = 0; i < 3; i++) { const p = g.sub(rr(a, -5, 5), rr(a, -2, 12), 2.5 + a.r(), a.r() * 180); p.palo([0, 0, 0], [3.5, 0.5, 0.5], 0.35, { mat: 'mu_hoja_seca' }); p.esf(3.8, 0.5, 0.6, 1, { mat: 'mu_flor', tono: (a.r() - 0.5) * 0.2 }); }
  matas(g, 4, 8, 14, 0, 2);
});

// ================================================================== hierro forjado: hojas de puerta y rejas
const altoArco = (x: number, w: number, hr: number, k: number) => { const r = k * w, cx = w / 2 - r, ax = Math.abs(x); return hr + Math.sqrt(Math.max(0, r * r - (ax - cx) ** 2)); };
/**
 * Hoja de hierro forjado en el plano x-z (y = 0): de x0 a x1, el alto de cada barrote lo da `alto(x)`. Marco,
 * barrotes, travesaños, volutas en el paño bajo y la cerradura.
 */
function hojaHierro(g: G, x0: number, x1: number, alto: (x: number) => number, m: string, o: { paso?: number; puntas?: boolean; cerradura?: number } = {}) {
  const paso = o.paso ?? 2.6, n = Math.max(2, Math.round(Math.abs(x1 - x0) / paso));
  let prev: V3 | null = null;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, h = alto(x), borde = i === 0 || i === n;
    g.palo([x, 0, 0.6], [x, 0, h], borde ? 0.75 : 0.5, { mat: m });
    if (o.puntas && !borde) punta(g, x, 0, h, 3, 1.2, m);
    const top: V3 = [x, 0, h - (o.puntas ? 0 : 0.4)];
    if (prev) g.palo(prev, top, 0.6, { mat: m });
    prev = top;
  }
  const xm = (x0 + x1) / 2, w = Math.abs(x1 - x0);
  for (const z of [1, 9, Math.min(alto(x0), alto(x1)) * 0.62]) g.caja(xm, 0, z, w, 1, 1.1, { mat: m });
  for (let i = 0; i < Math.max(1, Math.round(w / 6)); i++) { const cx = Math.min(x0, x1) + (i + 0.5) * (w / Math.max(1, Math.round(w / 6))); voluta(g, cx - 1.2, 5, 1.6, 1, 1, 0.38, m); voluta(g, cx + 1.2, 5, 1.6, 1, -1, 0.38, m); }
  if (o.cerradura !== undefined) { g.caja(o.cerradura, 0.4, 12, 2.6, 1.4, 4, { mat: m, tono: 0.08 }); g.cil(o.cerradura, 0.8, 13, 0.5, 0.6, { mat: 'negro', eje: [0, 1, 0] }); }
}
/** Puerta de hierro de dos hojas en un vano en arco: abierta 0..1 (las hojas giran hacia afuera, +y). */
function puertaHierro(g: G, w: number, hr: number, k: number, abierta: number, m: string, forzada = false) {
  const a = g.a, alto = (x: number) => altoArco(x, w, hr, k) - 0.4;
  for (const s of [-1, 1]) {
    const ang = abierta * (70 + a.r() * 20) * s * -1;
    const h = forzada && s > 0 ? g.sub(s * w / 2, 2, -1.4, ang - s * 20, 14, 'y') : g.sub(s * w / 2, 0, 0, abierta ? ang : 0);
    // en el marco local de la hoja el gozne está en x = 0 y la hoja va hacia el centro del vano
    hojaHierro(h, 0, -s * w / 2 + s * 0.4, (x) => alto(s * w / 2 + x), m, { paso: 2.4, cerradura: s < 0 ? -s * (w / 2 - 1.6) : undefined });
  }
}

// ================================================================== mausoleos
type EstadoMau = 'cerrado' | 'abierto' | 'forzado' | 'hiedra' | 'en_ruinas' | 'profanado';
/** Vano de puerta con la oscuridad adentro y escalones que bajan. */
function vano(g: G, y: number, w: number, hr: number, k: number, m: string, prof = 10) {
  g.sub(0, y, 0).prisma(ojiva(w, hr, k, 5, 0), -prof, 3, { mat: m, resta: true });
  g.caja(0, y - prof + 0.6, 0, w + 2, 1.2, altoOjiva(w, hr, k) + 1, { mat: 'negro' });
  for (let i = 0; i < 3; i++) g.caja(0, y - prof + 2 + i * 2.6, 0, w - 1, 2.8, 0.5 + (2 - i) * -0 + 0.4, { mat: 'negro', tono: 0.12 + i * 0.08 });
}
function sucio(g: G, W: number, D: number, m: string) {
  const a = g.a;
  for (let i = 0; i < 4; i++) g.elip(rr(a, -W / 2, W / 2), D / 2 + 0.3, rr(a, 2, 10), 2.2 + a.r() * 2, 0.8, 1.6 + a.r() * 2, { mat: 'mu_musgo', tono: -0.05 });
  for (let i = 0; i < 3; i++) g.elip(W / 2 + 0.3, rr(a, -D / 2, D / 2), rr(a, 2, 8), 0.8, 2.2 + a.r() * 2, 1.6 + a.r() * 2, { mat: 'mu_musgo', tono: -0.1 });
  cascotes(g, 4, W / 2, 4, m, 0, D / 2 + 8, 1.8);
}
/** Mausoleo chico: una celda con techo a dos aguas, frontón y reja de hierro. */
function mausoleoChico(g: G, est: EstadoMau) {
  const a = g.a, m = elegir(a, ['mu_bloques', 'mu_piedra']), mt = elegir(a, ['mu_piedra_fria', 'pizarra', 'mu_piedra']), W = 34 + a.r() * 4, D = 34, H = 34 + a.r() * 6;
  tierra(g, W * 0.7, D * 0.75, 5, 'tierra', 0, 4);
  bloque(g, 0, 0, 0, W + 8, D + 8, 3, { mat: 'mu_piedra', tono: -0.08, b: 1.2, j: 1 });
  for (let i = 0; i < 2; i++) bloque(g, 0, D / 2 + 6 - i * 3, 0, 22 - i * 2, 6, 1.6 + i * 1.6, { mat: 'mu_piedra', tono: -0.04 + i * 0.03, b: 0.6, j: 0.6 });
  bloque(g, 0, 0, 3, W, D, H, { mat: m, b: 1.4, j: 0.6 });
  for (const sx of [-1, 1]) bloque(g, sx * (W / 2 - 2), D / 2 - 1, 3, 5.4, 4, H + 1, { mat: 'mu_piedra', tono: 0.03, b: 0.7, j: 0.5 });
  vano(g, D / 2, 15, 15, 0.5, m, 12);
  // cornisa, frontón con la cruz y el techo de losas
  bloque(g, 0, 0, H + 3, W + 3, D + 3, 2.4, { mat: 'mu_piedra', tono: 0.04, b: 0.7, j: 0.4 });
  const zr = H + 5.4, hr = 14 + a.r() * 3;
  g.prisma([[-W / 2 - 1, zr], [W / 2 + 1, zr], [0, zr + hr]], -D / 2, D / 2 + 1, { mat: m, tono: 0.02 });
  for (const s of [-1, 1]) g.poli([[s * (W / 2 + 2.5), -D / 2 - 2, zr - 0.6], [s * (W / 2 + 2.5), D / 2 + 3, zr - 0.6], [0, -D / 2 - 2, zr + hr + 1.4], [0, D / 2 + 3, zr + hr + 1.4], [s * (W / 2 + 2.5), -D / 2 - 2, zr + 1], [s * (W / 2 + 2.5), D / 2 + 3, zr + 1]], { mat: mt, tono: s > 0 ? -0.02 : 0.04 });
  g.cil(0, D / 2 + 1.5, zr + hr * 0.4, 3, 1.4, { mat: m, eje: [0, 1, 0], tono: 0.05 }); g.cil(0, D / 2 + 1.8, zr + hr * 0.4, 2, 2, { mat: m, resta: true, eje: [0, 1, 0] });
  const c = g.sub(0, D / 2 + 1, zr + hr + 1);
  bloque(c, 0, 0, 0, 2.8, 2.8, 11, { mat: 'mu_piedra', b: 0.4, j: 0.3 }); bloque(c, 0, 0, 6, 8, 2.8, 2.6, { mat: 'mu_piedra', b: 0.4, j: 0.3 });
  letras(g, -8, 8, D / 2 + 0.6, H - 1, 1, m, 2, 1.4);
  const mh = elegir(a, ['mu_hierro', 'mu_oxido']);
  if (est === 'en_ruinas' || est === 'profanado') return;
  puertaHierro(g.sub(0, D / 2 + 0.5, 0), 15, 15, 0.5, est === 'abierto' || est === 'forzado' ? 1 : 0, mh, est === 'forzado');
  if (est === 'hiedra') { hiedra(g, [[-W / 2, D / 2 + 1, 0], [-W / 2 + 2, D / 2 + 1, 12], [-W / 2 + 6, D / 2 + 1.5, 26], [-4, D / 2 + 2, H + 6], [4, D / 2 + 2, zr + hr - 2]], 6); hiedra(g, [[W / 2 + 1, D / 2 - 4, 0], [W / 2 + 1, 4, 16], [W / 2 + 1.5, -6, H]], 5); }
  sucio(g, W, D, m);
}
obj('cem2_mausoleo_chico', ['Mausoleo chico', 'Small mausoleum'], ['cerrado', 'abierto', 'forzado', 'hiedra', 'cerrado_der', 'abierto_der'], [3, 3], true, (v, _f, g, a) => {
  mausoleoChico(g.sub(0, 0, 0, v.endsWith('_der') ? -90 : 0).sub(0, -2, 0), v.replace('_der', '') as EstadoMau); void a;
});

/** Mausoleo familiar: pórtico de dos columnas, cúpula sobre tambor y puerta doble de hierro. */
function mausoleoFamiliar(g: G, est: EstadoMau) {
  const a = g.a, m = elegir(a, ['mu_bloques', 'mu_piedra_clara', 'mu_piedra']), ml = elegir(a, ['mu_marmol', 'mu_piedra_clara']), W = 46, D = 42, H = 40;
  const ruina = est === 'en_ruinas';
  tierra(g, W * 0.7, D * 0.75, 6, 'tierra', 0, 4);
  bloque(g, 0, 2, 0, W + 10, D + 16, 3.4, { mat: 'mu_piedra', tono: -0.08, b: 1.2, j: 1 });
  for (let i = 0; i < 3; i++) bloque(g, 0, D / 2 + 10 - i * 2.6, 0, 26 - i * 2, 4.6, 1.4 + i * 1.3, { mat: ml, tono: -0.06 + i * 0.03, b: 0.6, j: 0.6 });
  bloque(g, 0, -2, 3.4, W, D - 4, H, { mat: m, b: 1.4, j: 0.6 });
  vano(g, D / 2 - 4, 18, 22, 0.5, m, 12);
  // pórtico: columnas, arquitrabe y frontón bajo
  for (const sx of [-1, 1]) { const x = sx * 14; bloque(g, x, D / 2 + 4, 3.4, 6, 6, 2.4, { mat: ml, b: 0.6, j: 0.3 }); g.cil(x, D / 2 + 4, 5.8, 2.4, H - 6, { mat: ml, r1: 2.1 }); for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; g.cil(x + Math.cos(t) * 2.2, D / 2 + 4 + Math.sin(t) * 2.2, 5.8, 0.5, H - 6, { mat: ml, tono: 0.05 }); } bloque(g, x, D / 2 + 4, H - 0.2, 6, 6, 2.4, { mat: ml, b: 0.6, j: 0.3, tono: 0.04 }); }
  if (!ruina || a.r() < 0.5) {
    bloque(g, 0, D / 2 + 1, H + 2.2, 36, 10, 3.6, { mat: ml, tono: 0.03, b: 0.6, j: 0.4 });
    g.prisma([[-19, H + 5.8], [19, H + 5.8], [0, H + 13]], D / 2 - 4, D / 2 + 6, { mat: ml, tono: 0.05 });
    letras(g, -10, 10, D / 2 + 6, H + 4.4, 1, ml, 2, 1.2);
  }
  // cornisa, tambor y cúpula
  bloque(g, 0, -2, H + 3.4, W + 3, D - 1, 2.6, { mat: 'mu_piedra', tono: 0.04, b: 0.7, j: 0.4 });
  const zt = H + 6;
  if (!ruina) {
    g.cil(0, -3, zt, 15, 8, { mat: m });
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; g.sub(Math.cos(t) * 15, -3 + Math.sin(t) * 15, zt + 1.5, t / GR + 90).prisma(ojiva(3, 2, 0.5, 3, 0), -1.5, 1.5, { mat: m, resta: true }); }
    g.elip(0, -3, zt + 8, 15.5, 15.5, 14, { mat: elegir(a, ['mu_bronce', 'mu_piedra_fria', 'pizarra']) });
    g.cil(0, -3, zt + 21, 2, 3, { mat: ml }); g.esf(0, -3, zt + 25.5, 2.4, { mat: ml, tono: 0.05 });
    bloque(g, 0, -3, zt + 27, 1.8, 1.8, 7, { mat: 'mu_hierro', b: 0.2, j: 0 }); g.caja(0, -3, zt + 31, 5.4, 1.4, 1.4, { mat: 'mu_hierro' });
  } else {
    g.cil(0, -3, zt, 15, 5, { mat: m });
    g.poli([[-15, -18, zt + 5], [15, -18, zt + 5], [-15, 12, zt + 5], [8, 12, zt + 5], [-10, -10, zt + 13], [4, -14, zt + 9]], { mat: m, tono: -0.03 });
    cascotes(g, 10, 18, 10, m, 18, 22, 3.2);
    g.palo([-6, D / 2 + 12, 1], [10, D / 2 + 4, 2], 1.2, { mat: 'mu_madera' });
  }
  if (!ruina && est !== 'profanado') puertaHierro(g.sub(0, D / 2 - 3.5, 0), 18, 22, 0.5, est === 'abierto' || est === 'forzado' ? 1 : 0, elegir(a, ['mu_hierro', 'mu_oxido']), est === 'forzado');
  else { const h = g.sub(-6, D / 2 + 12, 0.6, 20 + a.r() * 40, -88, 'x'); hojaHierro(h, 0, 9, (x) => altoArco(x - 9, 18, 22, 0.5), 'mu_oxido'); }
  if (est === 'hiedra' || ruina) hiedra(g, [[W / 2 + 1, D / 2 - 6, 0], [W / 2 + 1, 6, 14], [W / 2 + 2, -6, 30], [W / 2, -14, H + 4], [10, -10, zt + 10]], 6);
  sucio(g, W, D - 4, m);
}
obj('cem2_mausoleo_familiar', ['Mausoleo familiar', 'Family mausoleum'], ['cerrado', 'abierto', 'en_ruinas', 'hiedra', 'cerrado_der', 'abierto_der'], [4, 4], true, (v, _f, g) => {
  mausoleoFamiliar(g.sub(0, 0, 0, v.endsWith('_der') ? -90 : 0).sub(0, -4, 0), v.replace('_der', '') as EstadoMau);
});

/** Mausoleo gótico grande: contrafuertes, techo empinado, rosetón, pináculos y espadaña. */
function mausoleoGotico(g: G, est: EstadoMau) {
  const a = g.a, m = elegir(a, ['mu_bloques', 'mon_piedra', 'mu_piedra']), mt = elegir(a, ['pizarra', 'mu_piedra_fria']), W = 52, D = 60, H = 52;
  tierra(g, W * 0.75, D * 0.7, 7, 'tierra', 0, 4);
  bloque(g, 0, 2, 0, W + 12, D + 14, 3.6, { mat: 'mu_piedra', tono: -0.08, b: 1.2, j: 1 });
  for (let i = 0; i < 3; i++) bloque(g, 0, D / 2 + 9 - i * 2.6, 0, 28 - i * 2, 4.6, 1.4 + i * 1.4, { mat: 'mu_piedra', tono: -0.05 + i * 0.03, b: 0.6, j: 0.6 });
  bloque(g, 0, 0, 3.6, W, D, H, { mat: m, b: 1.4, j: 0.6 });
  // contrafuertes escalonados en las esquinas y a los lados
  const contra = (x: number, y: number, giro: number) => { const c = g.sub(x, y, 3.6, giro); bloque(c, 0, 0, 0, 7, 9, H * 0.6, { mat: m, b: 0.8, j: 0.5, tono: 0.03 }); bloque(c, 0, -1, H * 0.6, 6, 7, H * 0.32, { mat: m, b: 0.7, j: 0.5, tono: 0.05, arriba: 0.8 }); c.poli([[-3, -4.5, H * 0.92], [3, -4.5, H * 0.92], [-3, 2.5, H * 0.92], [3, 2.5, H * 0.92], [0, -1, H * 0.92 + 9]], { mat: m, tono: 0.07 }); };
  for (const sx of [-1, 1]) { contra(sx * (W / 2 + 1), D / 2 - 1, sx * 45); contra(sx * (W / 2 + 2), -2, sx > 0 ? -90 : 90); contra(sx * (W / 2 + 1), -D / 2 + 1, sx * 135 + 0); }
  // ventanas ojivales en el costado que se ve (+x)
  for (const y of [-14, 12]) { g.sub(W / 2, y, 0, 90).prisma(ojiva(7, 22, 0.85, 4, 16), -2, 2, { mat: m, resta: true }); g.sub(W / 2 - 1.4, y, 0, 90).prisma(ojiva(7, 22, 0.85, 4, 16), -0.4, 0.4, { mat: 'vidrio', tono: -0.25 }); g.caja(W / 2 - 1.2, y, 16, 0.8, 0.8, 26, { mat: 'mu_hierro' }); }
  // fachada: puerta ojival con arquivoltas y el rosetón
  for (let i = 2; i >= 0; i--) g.sub(0, D / 2 + i * 1.2, 0).prisma(ojiva(20 + i * 3.6, 22, 0.85, 5, 3.6), -1.2, 1.2, { mat: m, tono: 0.04 * (3 - i) });
  vano(g.sub(0, 0, 3.6), D / 2 + 3, 19, 21, 0.85, m, 14);
  g.cil(0, D / 2 - 2, H - 4, 8, 4, { mat: m, eje: [0, 1, 0], tono: 0.05 }); g.cil(0, D / 2 - 4, H - 4, 6.4, 8, { mat: m, resta: true, eje: [0, 1, 0] });
  g.cil(0, D / 2 - 2.6, H - 4, 6.4, 0.8, { mat: 'vidrio', eje: [0, 1, 0], tono: -0.15 });
  for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI; g.palo([Math.cos(t) * 6.2, D / 2 - 1.2, H - 4 + Math.sin(t) * 6.2], [-Math.cos(t) * 6.2, D / 2 - 1.2, H - 4 - Math.sin(t) * 6.2], 0.5, { mat: m, tono: 0.1 }); }
  g.cil(0, D / 2 - 1.5, H - 4, 1.6, 1.6, { mat: m, eje: [0, 1, 0], tono: 0.1 });
  // techo empinado a dos aguas con la cumbrera a lo largo de y, frontón y espadaña
  const zr = H + 3.6, hr = 30;
  bloque(g, 0, 0, zr - 0.4, W + 3, D + 3, 2.4, { mat: m, tono: 0.04, b: 0.7, j: 0.4 });
  const ruina = est === 'en_ruinas' || est === 'profanado';
  g.prisma([[-W / 2, zr + 2], [W / 2, zr + 2], [0, zr + 2 + hr]], D / 2 - 3, D / 2 + 1, { mat: m, tono: 0.03 });
  for (const s of [-1, 1]) {
    const pts: V3[] = [[s * (W / 2 + 3), -D / 2 - 2, zr + 1], [s * (W / 2 + 3), D / 2 - 2, zr + 1], [0, -D / 2 - 2, zr + 3 + hr], [0, D / 2 - 2, zr + 3 + hr], [s * (W / 2 + 3), -D / 2 - 2, zr + 3], [s * (W / 2 + 3), D / 2 - 2, zr + 3]];
    g.poli(pts, { mat: mt, tono: s > 0 ? -0.03 : 0.04 });
  }
  if (ruina) { g.poli([[W / 2 - 4, -8, zr + 6], [W / 2 + 6, 10, zr + 6], [8, -8, zr + 30], [8, 10, zr + 30], [20, -2, zr + 12]], { mat: mt, resta: true }); g.poli([[W / 2 - 6, -6, zr + 2], [W / 2 - 6, 8, zr + 2], [10, -6, zr + 24], [10, 8, zr + 24]], { mat: 'negro' }); cascotes(g, 8, 14, 10, mt, W / 2 + 12, 0, 2.6); }
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6; g.poli([[s * (W / 2) * (1 - t) - 1.4, D / 2 + 1, zr + 2 + hr * t], [s * (W / 2) * (1 - t) + 1.4, D / 2 + 1, zr + 2 + hr * t], [s * (W / 2) * (1 - t), D / 2 + 2.6, zr + 2 + hr * t], [s * (W / 2) * (1 - t), D / 2, zr + 5 + hr * t]], { mat: m, tono: 0.1 }); }
  const e = g.sub(0, D / 2 - 1, zr + hr + 1);
  bloque(e, 0, 0, 0, 9, 5, 14, { mat: m, b: 0.6, j: 0.4 }); e.sub(0, 0, 0).prisma(ojiva(5, 4, 0.85, 3, 3), -4, 4, { mat: m, resta: true });
  e.elip(0, 0, 6.5, 1.8, 1.8, 2.4, { mat: 'mu_bronce' });
  e.poli([[-4.5, -2.5, 14], [4.5, -2.5, 14], [-4.5, 2.5, 14], [4.5, 2.5, 14], [0, 0, 22]], { mat: mt });
  e.caja(0, 0, 22, 1.2, 1.2, 6, { mat: 'mu_hierro' }); e.caja(0, 0, 25.5, 4, 1.2, 1.2, { mat: 'mu_hierro' });
  if (est === 'cerrado' || est === 'abierto' || est === 'hiedra') puertaHierro(g.sub(0, D / 2 + 1.5, 3.6), 19, 21, 0.85, est === 'abierto' ? 1 : 0, elegir(a, ['mu_hierro', 'mu_oxido']));
  if (est === 'profanado') { const h = g.sub(-14, D / 2 + 14, 0.6, 30 + a.r() * 30, -88, 'x'); hojaHierro(h, 0, 9.5, (x) => altoArco(x - 9.5, 19, 21, 0.85), 'mu_oxido'); huesos(g, 6, 10, 5, 0, D / 2 + 16); calavera(g.sub(8, D / 2 + 16, 0, mirar(a)), 3.3); g.elip(0, D / 2 + 6, 0.3, 6, 4, 0.4, { mat: 'mu_sangre_seca' }); }
  sucio(g, W, D, m);
  if (est === 'hiedra') { hiedra(g, [[W / 2 + 1, D / 2 - 10, 0], [W / 2 + 1, D / 2 - 18, 20], [W / 2 + 2, 0, 38], [W / 2 + 3, -10, H + 4]], 7); hiedra(g, [[-W / 2 + 6, D / 2 + 1, 0], [-W / 2 + 8, D / 2 + 1.5, 18], [-W / 2 + 14, D / 2 + 2, 40], [-10, D / 2 + 2, H + 10]], 6); }
}
obj('cem2_mausoleo_gotico', ['Mausoleo gótico', 'Gothic mausoleum'], ['cerrado', 'abierto', 'profanado', 'hiedra', 'cerrado_der', 'abierto_der'], [5, 6], true, (v, _f, g) => {
  mausoleoGotico(g.sub(0, 0, 0, v.endsWith('_der') ? -90 : 0).sub(0, -6, 0), v.replace('_der', '') as EstadoMau);
}, { huellaPor: { cerrado_der: [6, 5], abierto_der: [6, 5] } });
