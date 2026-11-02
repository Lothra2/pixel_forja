import { registrar, conVarianteY, type Pieza, type V3 } from '../objeto';
import {
  G, raiz, bajoTierra, bloque, ojiva, altoOjiva, letras, grieta, tierra, monticulo, matas, musgo, hiedra, cascotes, calavera, huesos, huesito,
  esqueleto, mirar, vela, llama, cadena, voluta, punta, cuervo, arbolMuerto, figuraVelada, rr, elegir, onda, GR, type P2,
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
    armar: (v, f, a) => { const { ps, g } = raiz(a); const r = armar(v, f, g, a); bajoTierra(ps); return r ? r : ps; },
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
  else { const h = g.sub(-6, D / 2 + 12, 0.6, 20 + a.r() * 40, -88, 'x'); hojaHierro(h, 0, 9, (x) => altoArco(x - 9, 18, 22, 0.5), 'mu_hierro'); }
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
  if (est === 'profanado') { const h = g.sub(-14, D / 2 + 14, 0.6, 30 + a.r() * 30, -88, 'x'); hojaHierro(h, 0, 9.5, (x) => altoArco(x - 9.5, 19, 21, 0.85), 'mu_hierro'); huesos(g, 6, 10, 5, 0, D / 2 + 16); calavera(g.sub(8, D / 2 + 16, 0, mirar(a)), 3.3); g.elip(0, D / 2 + 6, 0.3, 6, 4, 0.4, { mat: 'mu_sangre_seca' }); }
  sucio(g, W, D, m);
  if (est === 'hiedra') { hiedra(g, [[W / 2 + 1, D / 2 - 10, 0], [W / 2 + 1, D / 2 - 18, 20], [W / 2 + 2, 0, 38], [W / 2 + 3, -10, H + 4]], 7); hiedra(g, [[-W / 2 + 6, D / 2 + 1, 0], [-W / 2 + 8, D / 2 + 1.5, 18], [-W / 2 + 14, D / 2 + 2, 40], [-10, D / 2 + 2, H + 10]], 6); }
}
obj('cem2_mausoleo_gotico', ['Mausoleo gótico', 'Gothic mausoleum'], ['cerrado', 'abierto', 'profanado', 'hiedra', 'cerrado_der', 'abierto_der'], [5, 6], true, (v, _f, g) => {
  mausoleoGotico(g.sub(0, 0, 0, v.endsWith('_der') ? -90 : 0).sub(0, -6, 0), v.replace('_der', '') as EstadoMau);
}, { huellaPor: { cerrado_der: [6, 5], abierto_der: [6, 5] } });

// ================================================================== tumbas abiertas y ataúdes
/** Brazo de muerto que sale de la tierra (de z=0 hacia arriba), con los dedos abiertos. */
function brazoMuerto(g: G, alto: number, mat = 'mu_carne_seca', huesudo = false) {
  const a = g.a, cs = [];
  const codo: V3 = [1.5, 0.5, alto * 0.5], mano: V3 = [3, (a.r() - 0.5) * 2, alto];
  cs.push(g.hu([0, 0, -2], codo, 1.6, 1.3), g.hu(codo, mano, 1.3, huesudo ? 0.7 : 1), g.bu(mano, [1.5, 1.2, 1.5]));
  for (let k = 0; k < 4; k++) { const an = -0.9 + k * 0.6; cs.push(g.hu(mano, [mano[0] + Math.cos(an) * 1.2 + 1.2, mano[1] + Math.sin(an) * 2.2, mano[2] + 3.2 - Math.abs(k - 1.5) * 0.4], 0.45, 0.3, { k: 0.3 })); }
  cs.push(g.hu(mano, [mano[0] + 1, mano[1] - 2.2, mano[2] + 0.8], 0.5, 0.35, { k: 0.3 }));
  g.masa(cs, { mat, suave: 0.9 });
  if (!huesudo) g.elip(0.3, 0, alto * 0.25, 1.9, 1.9, 2.2, { mat: 'mu_mortaja', tono: -0.2 });
}
/** Tablas astilladas que asoman. */
function astillas(g: G, n: number, R: number, m = 'mu_madera') {
  const a = g.a;
  for (let i = 0; i < n; i++) { const t = a.r() * 6.28, q = R * (0.3 + a.r() * 0.6); const s = g.sub(Math.cos(t) * q, Math.sin(t) * q, -1, t / GR + 90, 25 + a.r() * 45); s.poli([[-1.6, -0.5, 0], [1.6, -0.5, 0], [-1.6, 0.5, 0], [1.6, 0.5, 0], [-1.2, -0.5, 6 + a.r() * 6], [0.6, -0.5, 9 + a.r() * 5], [0, 0.5, 8 + a.r() * 4]], { mat: m, tono: (a.r() - 0.5) * 0.15 }); }
}
obj('cem2_tumba_reventada', ['Tumba abierta desde adentro', 'Grave burst open from within'], ['reciente', 'con_mano', 'tapa_rota', 'con_lapida', 'charco'], [2, 3], false, (v, _f, g, a) => {
  const R = 11, L = 20;
  // la tierra salió para afuera: un anillo de terrones y la boca negra
  g.elip(0, 0, 0.15, R * 0.62, L * 0.62, 0.5, { mat: 'negro' });
  const cs = [], hueco = a.r() * 14;
  for (let i = 0; i < 14; i++) {
    if (Math.abs(i - hueco) < 1.2) continue;
    const t = (i / 14) * Math.PI * 2 + (a.r() - 0.5) * 0.4, q = 0.85 + a.r() * 0.35;
    cs.push(g.bu([Math.cos(t) * R * q, Math.sin(t) * L * q, 0.4], [3 + a.r() * 4, 3.5 + a.r() * 4.5, 1.8 + a.r() * 3.4], { giro: t / GR + (a.r() - 0.5) * 40 }));
  }
  // la tierra que salió despedida para un lado
  const lado = a.r() * 6.28;
  for (let i = 0; i < 3; i++) cs.push(g.bu([Math.cos(lado) * R * (1.4 + i * 0.3), Math.sin(lado) * L * (1.1 + i * 0.2), 0], [4 - i, 5 - i, 2.2 - i * 0.5], { giro: lado / GR }));
  g.masa(cs, { mat: 'mu_tierra', suave: 2.6 });
  for (let i = 0; i < 24; i++) { const t = a.r() < 0.5 ? lado + (a.r() - 0.5) * 1.2 : a.r() * 6.28, q = 1.05 + a.r() * 0.8; g.elip(Math.cos(t) * R * q, Math.sin(t) * L * q, 0.6 + a.r() * 1.4, 1.2 + a.r() * 1.6, 1.1 + a.r() * 1.4, 0.8 + a.r(), { mat: a.r() < 0.15 ? 'roca' : 'mu_tierra', tono: 0.06, giro: a.r() * 90 }); }
  g.elip(0, 0, -0.6, R * 0.66, L * 0.66, 1.6, { mat: 'mu_tierra', tono: -0.18 });
  g.elip(0, 0, 0.2, R * 0.48, L * 0.5, 0.6, { mat: v === 'charco' ? 'mu_agua' : 'negro' });
  if (v === 'tapa_rota' || v === 'reciente' || v === 'con_mano') astillas(g, v === 'tapa_rota' ? 6 : 3, R * 0.6);
  if (v === 'tapa_rota') { const t = g.sub(R + 4, 6, 1, 20 + a.r() * 30, 8); t.poli([[-6, -14, 0], [6, -14, 0], [-7.5, -4, 0], [7.5, -4, 0], [-5, 14, 0], [5, 14, 0], [-6, -14, 1.8], [6, -14, 1.8], [-5, 14, 1.8], [5, 14, 1.8]], { mat: 'mu_madera', tono: 0.04 }); t.poli([[-4, -2, -1], [5, 3, -1], [0, 10, -1], [-2, 2, 3], [3, 8, 3]], { mat: 'mu_madera', resta: true }); }
  if (v === 'con_mano') { brazoMuerto(g.sub(1, -3, 0, 40), 13); brazoMuerto(g.sub(-3, 6, 0, 200), 8, 'mu_hueso', true); }
  if (v === 'con_lapida') { const s = g.sub(-4, -L - 4, 1.4, 70 + a.r() * 40, 74, 'y'); bloque(s, 0, 0, 0, 14, 4, 18, { mat: 'mu_piedra', b: 0.6, j: 0.5 }); s.cil(0, -2, 18, 7, 4, { mat: 'mu_piedra', eje: [0, 1, 0] }); letras(s, -4, 4, 2, 14, 3, 'mu_piedra'); }
  if (v === 'reciente') for (let i = 0; i < 3; i++) g.elip(rr(a, -6, 6), L * 0.9 + a.r() * 6, 0.3, 2.6, 1.2, 0.3, { mat: 'mu_tierra', tono: -0.15 });
  huesos(g, v === 'charco' ? 0 : 2, R, L, 0, 0, 1.6);
  matas(g, 5, R + 6, L + 4);
});

/** Ataúd de seis lados a lo largo de y (cabeza en -y), 60 de largo. */
const PERFIL_AT = (k = 1, L = 30): P2[] => [[-7 * k, -L], [7 * k, -L], [10 * k, -L * 0.52], [5.6 * k, L], [-5.6 * k, L], [-10 * k, -L * 0.52]];
const placa = (g: G, pf: P2[], z0: number, z1: number, o: { mat: string; tono?: number; resta?: boolean }) => g.poli(pf.flatMap(([x, y]) => [[x, y, z0], [x, y, z1]] as V3[]), o);
function ataud(g: G, estado: 'cerrado' | 'entreabierto' | 'abierto' | 'podrido', m: string) {
  const a = g.a;
  placa(g, PERFIL_AT(1), 0, 10, { mat: m });
  for (const y of [-20, 0, 20]) g.caja(0, y, 4.6, 22, 0.6, 1, { mat: m, tono: -0.12 });
  if (estado === 'cerrado') { placa(g, PERFIL_AT(1.05), 10, 12.4, { mat: m, tono: 0.05 }); placa(g, PERFIL_AT(0.8, 26), 12.4, 13.4, { mat: m, tono: 0.08 }); g.caja(0, -12, 13.4, 2.2, 20, 1, { mat: 'mu_hierro' }); g.caja(0, -16, 13.4, 9, 2.2, 1, { mat: 'mu_hierro' }); }
  else {
    placa(g, PERFIL_AT(0.82, 28), 2, 14, { mat: m, resta: true });
    placa(g, PERFIL_AT(0.84, 28.5), 0, 2.4, { mat: 'tela_morada', tono: -0.38 });
  }
  for (const y of [-24, 20]) for (const s of [-1, 1]) { g.caja(s * (y < 0 ? 8.6 : 6.4), y, 4, 1.4, 3.6, 1.2, { mat: 'mu_hierro' }); g.cil(s * (y < 0 ? 9.4 : 7.2), y - 1.8, 3.4, 0.5, 3.6, { mat: 'mu_hierro', eje: [0, 1, 0] }); }
  if (estado === 'entreabierto') { const t = g.sub(3, 8, 10, -10 + (a.r() - 0.5) * 10, -6, 'y'); placa(t, PERFIL_AT(1.05), 0, 2.4, { mat: m, tono: 0.05 }); }
  if (estado === 'podrido') { g.caja(9, -6, 3, 4, 16, 12, { mat: m, resta: true }); for (let i = 0; i < 4; i++) g.caja(rr(a, -6, 10), rr(a, -26, 26), 10, 3, 14 + a.r() * 8, 1.4, { mat: m, giro: (a.r() - 0.5) * 30, incl: (a.r() - 0.5) * 20, tono: -0.08 }); }
}
obj('cem2_ataud_desenterrado', ['Ataúd desenterrado', 'Unearthed coffin'], ['cerrado', 'entreabierto', 'volcado', 'con_cadaver', 'podrido'], [2, 4], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_madera', 'madera']);
  monticulo(g, 15, 30, 2.4, 'mu_tierra', 5, 0, 0, 10);
  const s = g.sub(0, 0, 1.6, (a.r() - 0.5) * 16, (a.r() - 0.5) * 6, 'y');
  if (v === 'volcado') {
    const c = g.sub(-2, 0, 0, (a.r() - 0.5) * 16, 80, 'y').sub(-7, 0, -6);
    ataud(c, 'abierto', m);
    esqueleto(g.sub(12, 2, 0.6, (a.r() - 0.5) * 30), 2.2);
    const t = g.sub(-14, 6, 0, 10, 0); placa(t, PERFIL_AT(1.05), 0.4, 2.8, { mat: m, tono: 0.05 });
  } else ataud(s, v === 'con_cadaver' ? 'abierto' : v as 'cerrado' | 'entreabierto' | 'podrido', m);
  if (v === 'entreabierto') { const b = s.sub(6, 6, 9.5, -30); b.masa([b.hu([0, 0, 0], [3, 2, -2], 1, 0.8), b.hu([3, 2, -2], [5.5, 3, -6], 0.8, 0.6), b.bu([6, 3.2, -7], [1.2, 1, 1.2])], { mat: 'mu_hueso', suave: 0.6 }); }
  if (v === 'con_cadaver') {
    // el muerto amortajado sacado y tirado al lado, con la cara al aire
    const c = g.sub(16, 2, 0, (a.r() - 0.5) * 20);
    const cs = [c.hu([0, -22, 3], [0, 20, 2.6], 4.2, 3), c.bu([0, -6, 3.6], [5.4, 9, 3.6]), c.bu([0, 22, 2.2], [3.6, 3, 2.4]), c.bu([0, -24, 3.4], [3.2, 3.6, 3.2])];
    c.masa(cs, { mat: 'mu_mortaja', suave: 1.6 });
    for (const y of [-14, -2, 10]) c.cil(0, y, 0.2, 4.8, 0.9, { mat: 'cuerda', eje: [0, 1, 0], r1: 4.4 });
    calavera(c.sub(0, -26, 1, -90), 3, 'mu_carne_seca');
    s.elip(0, 0, 2.2, 6, 20, 1.2, { mat: 'mu_tierra', tono: -0.1 });
  }
  // cuerdas de bajarlo y la tierra pegada
  for (const y of [-14, 14]) g.palo([-14, y + rr(a, -3, 3), 0.5], [-4, y, 12], 0.5, { mat: 'cuerda' });
  for (let i = 0; i < 6; i++) s.elip(rr(a, -7, 7), rr(a, -24, 24), 13 + a.r(), 1.5 + a.r() * 1.5, 1.5 + a.r() * 1.5, 0.8, { mat: 'mu_tierra', tono: 0.05 });
  if (a.r() < 0.6) { const p = g.sub(-17, rr(a, -10, 10), 0, a.r() * 180); p.palo([0, 0, 0.6], [16, 0, 0.6], 0.8, { mat: 'mu_madera' }); p.poli([[16, -2.2, 0], [16, 2.2, 0], [21, -2, 0.2], [21, 2, 0.2], [16, -2.2, 1], [16, 2.2, 1]], { mat: 'mu_hierro' }); }
});

// ================================================================== verjas, portones y cercos
/** Poste de piedra con remate (bola, urna o calavera). */
function poste(g: G, x: number, y: number, h: number, m: string, remate: string) {
  const a = g.a;
  bloque(g, x, y, 0, 8, 8, 4, { mat: m, tono: -0.06, b: 1, j: 0.6 });
  bloque(g, x, y, 4, 6, 6, h - 6, { mat: m, b: 0.7, j: 0.4 });
  bloque(g, x, y, h - 2, 8, 8, 2.4, { mat: m, tono: 0.04, b: 0.7, j: 0.4 });
  if (remate === 'bola') g.esf(x, y, h + 2.8, 2.8, { mat: m, tono: 0.05 });
  else if (remate === 'urna') { g.cil(x, y, h + 0.4, 1.6, 1.4, { mat: m, r1: 1 }); g.elip(x, y, h + 4, 2.6, 2.6, 2.8, { mat: m, tono: 0.05 }); g.cil(x, y, h + 6.4, 1.6, 1, { mat: m }); }
  else if (remate === 'calavera') calavera(g.sub(x, y, h + 0.4, 45 + (a.r() - 0.5) * 30), 2.8, m);
  else g.poli([[x - 3, y - 3, h + 0.4], [x + 3, y - 3, h + 0.4], [x - 3, y + 3, h + 0.4], [x + 3, y + 3, h + 0.4], [x, y, h + 6]], { mat: m, tono: 0.05 });
}
/** Tramo de verja a lo largo de x entre x0 y x1, sobre un murete de piedra. */
function tramoVerja(g: G, x0: number, x1: number, h: number, m: string, mh: string, estado: string) {
  const a = g.a, L = x1 - x0;
  bloque(g, (x0 + x1) / 2, 0, 0, L, 6, 5, { mat: m, b: 0.8, j: 0.6 });
  bloque(g, (x0 + x1) / 2, 0, 4.6, L + 1, 7, 1.6, { mat: m, tono: 0.04, b: 0.5, j: 0.4 });
  const n = Math.round(L / 3.4), hueco = estado === 'rota' ? Math.floor(a.r() * (n - 4)) + 2 : -9;
  for (let i = 0; i <= n; i++) {
    const x = x0 + (L * i) / n;
    if (estado === 'rota' && i >= hueco && i < hueco + 3) { if (i === hueco) g.palo([x, 0, 6], [x + 4, 1, 6 + h * 0.4], 0.5, { mat: mh }); continue; }
    const dob = estado === 'doblada' && Math.abs(i - n / 2) < 3 ? (3 - Math.abs(i - n / 2)) * 1.6 : 0;
    const hh = h + (i % 2 ? 0 : 3);
    g.palo([x, 0, 6.2], [x, dob * 0.6, 6.2 + hh * 0.5], 0.5, { mat: mh }); g.palo([x, dob * 0.6, 6.2 + hh * 0.5], [x, dob, 6.2 + hh], 0.5, { mat: mh });
    punta(g, x, dob, 6.2 + hh, i % 2 ? 2.6 : 3.6, i % 2 ? 0.9 : 1.2, mh);
  }
  for (const z of [9, 6.2 + h - 2]) { if (estado === 'rota') { const xr0 = x0 + (L * hueco) / n, xr1 = x0 + (L * (hueco + 3)) / n; g.palo([x0, 0, z], [xr0 - 0.6, 0, z], 0.55, { mat: mh }); g.palo([xr1 + 0.6, 0, z], [x1, 0, z], 0.55, { mat: mh }); } else g.palo([x0, 0, z], [x1, 0, z], 0.55, { mat: mh }); }
  for (let x = x0 + 3.4; x < x1 - 2; x += 6.8) { if (estado === 'rota' && Math.abs(x - (x0 + (L * (hueco + 1.5)) / n)) < 6) continue; voluta(g, x - 1.5, 12, 1.5, 1, 1, 0.35, mh); voluta(g, x + 1.5, 12, 1.5, 1, -1, 0.35, mh); }
  if (estado === 'rota') { const xr = x0 + (L * (hueco + 1.5)) / n; for (let i = 0; i < 3; i++) g.palo([xr + rr(a, -5, 5), 5 + a.r() * 6, 0.5], [xr + rr(a, -8, 8), 8 + a.r() * 8, 0.6], 0.5, { mat: mh }); }
  if (estado === 'hiedra') hiedra(g, [[x0 + 4, 3, 0], [x0 + 8, 1.5, 10], [x0 + 14, 1, 18], [x0 + 22, 1, 14], [x0 + 30, 1.5, 22]], 6);
}
obj('cem2_verja_tramo', ['Verja de hierro forjado', 'Wrought iron fence'], ['x', 'x_oxidada', 'x_rota', 'x_doblada', 'x_hiedra'], [3, 1], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_piedra', 'mu_bloques', 'mu_piedra_fria']), mh = v === 'x_oxidada' ? 'mu_oxido' : 'mu_hierro';
  tierra(g, 26, 6, 4);
  tramoVerja(g, -21, 21, 22 + a.r() * 4, m, mh, v.slice(2));
  poste(g, -24, 0, 30, m, elegir(a, ['bola', 'pira', 'urna']));
  matas(g, 4, 22, 5);
});
conVarianteY('cem2_verja_tramo');
obj('cem2_verja_esquina', ['Esquina de verja', 'Iron fence corner'], ['nx_ny', 'px_ny', 'nx_py', 'px_py', 'columna'], [1, 1], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_piedra', 'mu_bloques', 'mu_piedra_fria']), mh = a.r() < 0.3 ? 'mu_oxido' : 'mu_hierro';
  tierra(g, 10, 10, 3);
  if (v !== 'columna') {
    const dx = v.startsWith('px') ? 1 : -1, dy = v.endsWith('py') ? 1 : -1;
    tramoVerja(g.sub(0, 0, 0, dx > 0 ? 0 : 180), 4, 9, 22, m, mh, 'x');
    tramoVerja(g.sub(0, 0, 0, dy > 0 ? 90 : -90), 4, 9, 22, m, mh, 'x');
  }
  poste(g, 0, 0, 34 + (v === 'columna' ? 6 : 0), m, elegir(a, ['urna', 'calavera', 'bola', 'pira']));
  if (v === 'columna') { hiedra(g, [[3, 4, 0], [4, 4, 12], [3, 4.5, 24], [-1, 4.5, 36]], 5); }
});
/** Portón de dos hojas entre pilares, con el copete de volutas arriba. */
obj('cem2_verja_porton', ['Portón de hierro del cementerio', 'Wrought iron cemetery gate'], ['cerrado', 'abierto', 'entreabierto', 'caido', 'encadenado'], [4, 1], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_piedra', 'mu_bloques', 'mu_piedra_clara']), mh = a.r() < 0.3 ? 'mu_oxido' : 'mu_hierro', W = 40, H = 34;
  tierra(g, 30, 9, 5);
  for (const s of [-1, 1]) { const x = s * (W / 2 + 5); bloque(g, x, 0, 0, 12, 12, 5, { mat: m, tono: -0.06, b: 1.2, j: 0.7 }); bloque(g, x, 0, 5, 9, 9, H + 6, { mat: m, b: 0.8, j: 0.5 }); bloque(g, x, 0, H + 11, 11, 11, 3, { mat: m, tono: 0.04, b: 0.7, j: 0.4 }); g.cil(x, 0, H + 14, 2.4, 2, { mat: m, r1: 1.4 }); g.esf(x, 0, H + 18.4, 3.4, { mat: m, tono: 0.05 }); g.caja(x, 4.6, 14, 4, 1, 12, { mat: m, resta: true }); }
  const alto = (x: number) => H - 6 + Math.cos((x / W) * Math.PI) * 6;
  const ab = v === 'abierto' ? 1 : v === 'entreabierto' ? 0.35 : 0;
  for (const s of [-1, 1]) {
    if (v === 'caido' && s > 0) { const h = g.sub(4, 12, 0.7, -12 + a.r() * 20, -88, 'x'); hojaHierro(h, 0, W / 2 - 1, (x) => alto(x), mh, { puntas: true }); continue; }
    const ang = ab * (55 + a.r() * 30) * -s;
    const h = g.sub(s * W / 2, 0, 0, ang);
    hojaHierro(h, 0, -s * (W / 2 - 0.4), (x) => alto(s * W / 2 + x), mh, { puntas: true, paso: 3 });
  }
  // copete de volutas y la cruz del arco
  if (v !== 'caido') { g.palo([-W / 2, 0, H + 6], [W / 2, 0, H + 6], 0.6, { mat: mh }); for (let i = 0; i < 9; i++) { const x = -W / 2 + 2.2 + i * 4.45; voluta(g, x, H + 8.6, 2, 1, i % 2 ? 1 : -1, 0.4, mh); } g.palo([0, 0, H + 6], [0, 0, H + 18], 0.7, { mat: mh }); g.palo([-3.4, 0, H + 15], [3.4, 0, H + 15], 0.6, { mat: mh }); for (const s of [-1, 1]) g.palo([s * W / 2, 0, H + 6], [s * W / 2, 0, H - 2], 0.6, { mat: mh }); }
  if (v === 'encadenado') { cadena(g, [-3, 1.2, 15], [3, 1.2, 15], 2.4, mh, 0.8); g.caja(0, 1.6, 10.2, 3, 1.6, 3.4, { mat: 'mu_hierro', tono: 0.1 }); g.cil(0, 1.6, 13.4, 1.2, 1.6, { mat: 'mu_hierro', eje: [0, 1, 0] }); }
  matas(g, 4, 28, 7);
});
conVarianteY('cem2_verja_porton');
/** Cerco bajo de hierro alrededor de una parcela familiar con sus tumbas adentro. */
obj('cem2_cerco_parcela', ['Parcela cercada', 'Fenced family plot'], ['con_lapida', 'con_cruz', 'doble', 'abandonada'], [3, 4], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_piedra', 'mu_piedra_fria']), mh = v === 'abandonada' ? 'mu_oxido' : 'mu_hierro', X = 18, Y = 27, h = 11;
  tierra(g, X + 4, Y + 4, 6);
  for (const [x, y] of [[-X, -Y], [X, -Y], [-X, Y], [X, Y]] as P2[]) { bloque(g, x, y, 0, 4.4, 4.4, h + 3, { mat: m, b: 0.6, j: 0.4 }); g.esf(x, y, h + 4.8, 2, { mat: m, tono: 0.05 }); }
  const lado = (p: V3, q: V3, puerta: boolean) => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), s = g.sub((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 0, Math.atan2(q[1] - p[1], q[0] - p[0]) / GR);
    bloque(s, 0, 0, 0, L - 4, 3, 2.4, { mat: m, b: 0.4, j: 0.4 });
    const n = Math.round((L - 4) / 2.6);
    for (let i = 0; i <= n; i++) { const x = -(L - 4) / 2 + ((L - 4) * i) / n; if (puerta && Math.abs(x) < 5) continue; if (v === 'abandonada' && a.r() < 0.12) continue; const inc = v === 'abandonada' ? (a.r() - 0.5) * 3 : 0; s.palo([x, 0, 2.4], [x + inc, inc, 2.4 + h - 1], 0.42, { mat: mh }); punta(s, x + inc, inc, h + 1.4, 2, 0.8, mh); }
    for (const z of [4, h]) s.palo([-(L - 4) / 2, 0, z], [(L - 4) / 2, 0, z], 0.45, { mat: mh });
    if (puerta) { const pp = s.sub(-5, 0, 0, v === 'abandonada' ? -60 : -8); hojaHierro(pp, 0, 10, () => h - 0.5, mh, { paso: 2.5 }); }
  };
  lado([-X, -Y, 0], [X, -Y, 0], false); lado([-X, -Y, 0], [-X, Y, 0], false); lado([X, -Y, 0], [X, Y, 0], false); lado([-X, Y, 0], [X, Y, 0], true);
  // adentro: tumbas
  const tumba = (x: number) => { monticulo(g, 5.5, 13, 2.6, 'mu_tierra', 3, x, 4, 3); const s = g.sub(x, -16, 0, (a.r() - 0.5) * 10, (a.r() - 0.5) * 8); if (v === 'con_cruz') { bloque(s, 0, 0, 0, 3, 3, 22, { mat: m, b: 0.4, j: 0.3 }); bloque(s, 0, 0, 14, 12, 3, 3, { mat: m, b: 0.4, j: 0.3 }); } else { bloque(s, 0, 0, 0, 12, 4, 15, { mat: m, b: 0.6, j: 0.4 }); s.cil(0, -2, 15, 6, 4, { mat: m, eje: [0, 1, 0] }); letras(s, -3.5, 3.5, 2, 13, 3, m); } };
  if (v === 'doble') { tumba(-8); tumba(8); } else tumba(0);
  if (v === 'abandonada') { matas(g, 14, X - 2, Y - 2); musgo(g, 5, -X, X, Y + 1.6, 0.5, 3); for (let i = 0; i < 5; i++) g.elip(rr(a, -X, X), rr(a, -Y, Y), 0.4, 3, 3, 1, { mat: 'mu_hoja_seca', giro: a.r() * 90 }); }
  else matas(g, 5, X + 2, Y + 2);
});
/** Jaula de hierro sobre la tumba (para que no se roben el muerto... o para que no salga). */
obj('cem2_jaula_tumba', ['Jaula de tumba', 'Mortsafe grave cage'], ['cerrada', 'forzada', 'oxidada', 'con_cadenas'], [2, 3], true, (v, _f, g) => {
  const mh = v === 'oxidada' ? 'mu_oxido' : 'mu_hierro', X = 10, Y = 19, H = 16;
  monticulo(g, X + 2, Y + 2, 3.6, 'mu_tierra', 4, 0, 0, 6);
  bloque(g, 0, -Y - 3, 0, 2 * X + 6, 5, 4, { mat: 'mu_piedra', b: 0.8, j: 0.6 });
  bloque(g, 0, -Y - 3, 4, 2 * X, 4, 16, { mat: 'mu_piedra', b: 0.6, j: 0.4 }); letras(g, -5, 5, -Y - 1, 16, 4, 'mu_piedra');
  const top = (x: number) => H + Math.cos((x / X) * Math.PI * 0.5) * 6;
  const forz = v === 'forzada';
  for (const y of [-Y, -Y / 3, Y / 3, Y]) { const n = 8; let prev: V3 | null = null; for (let i = 0; i <= n; i++) { const x = -X + (2 * X * i) / n; const p: V3 = [x, y, top(x)]; if (prev) g.palo(prev, p, 0.55, { mat: mh }); prev = p; } }
  for (let i = 0; i <= 8; i++) { const x = -X + (2 * X * i) / 8; for (const y of [-Y, Y]) { if (forz && y > 0 && Math.abs(x) < 4) { g.palo([x, y, 0], [x + (x > 0 ? 3 : -3), y + 5, top(x) * 0.6], 0.5, { mat: mh }); continue; } g.palo([x, y, 0], [x, y, top(x)], 0.5, { mat: mh }); } g.palo([x, -Y, top(x)], [x, Y, top(x)], 0.5, { mat: mh }); }
  for (const s of [-1, 1]) for (let j = 0; j <= 6; j++) { const y = -Y + (2 * Y * j) / 6; g.palo([s * X, y, 0], [s * X, y, H], 0.5, { mat: mh }); punta(g, s * X, y, H, 2.4, 0.9, mh); }
  for (const s of [-1, 1]) g.palo([s * X, -Y, 5], [s * X, Y, 5], 0.5, { mat: mh });
  if (v === 'con_cadenas') { cadena(g, [X, -6, H - 1], [X + 1, 6, H - 1], 5, mh, 0.8); g.caja(X + 1.4, 0, 6, 2.4, 2.8, 3, { mat: 'mu_hierro', tono: 0.1 }); }
  if (forz) { g.elip(0, Y - 4, 0.2, 5, 4, 0.5, { mat: 'negro' }); astillas(g.sub(0, Y - 4, 0), 3, 3); }
  matas(g, 6, X + 4, Y + 3);
});

// ================================================================== faroles
/** Linterna de los muertos: columna gótica de piedra con la cámara de la luz arriba. */
obj('cem2_linterna_muertos', ['Linterna de los muertos', 'Lantern of the dead'], ['encendida', 'apagada', 'rota', 'fuego_fatuo'], [1, 1], true, (v, f, g, a) => {
  const m = elegir(a, ['mu_piedra', 'mu_bloques', 'mu_piedra_clara']);
  tierra(g, 11, 11, 4);
  const s = g.sub(0, 0, 0, (a.r() - 0.5) * 20);
  bloque(s, 0, 0, 0, 16, 16, 4, { mat: m, tono: -0.06, b: 1.2, j: 0.8 }); bloque(s, 0, 0, 4, 12, 12, 4, { mat: m, tono: -0.03, b: 1, j: 0.6 });
  s.cil(0, 0, 8, 4.6, 46, { mat: m, r1: 3.8 });
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; s.cil(Math.cos(t) * 4.2, Math.sin(t) * 4.2, 8, 0.8, 46, { mat: m, tono: 0.04, r1: 0.6 }); }
  bloque(s, 0, 0, 54, 11, 11, 2.6, { mat: m, tono: 0.04, b: 0.7, j: 0.4 });
  const z = 56.6, H = 11;
  // cámara de la luz: cuatro pilarcitos con arcos y la llama adentro
  for (const [x, y] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]] as P2[]) bloque(s, x, y, z, 2.2, 2.2, H, { mat: m, b: 0.4, j: 0.2 });
  for (const gi of [0, 90]) { const c = s.sub(0, 0, z, gi); c.prisma([[-4.6, H - 3], [4.6, H - 3], [4.6, H + 0.6], [-4.6, H + 0.6]], -4.6, 4.6, { mat: m }); c.prisma(ojiva(5, H - 4, 0.6, 3, 0), -6, 6, { mat: m, resta: true }); }
  const rota = v === 'rota';
  if (!rota) { s.poli([[-5, -5, z + H + 0.6], [5, -5, z + H + 0.6], [-5, 5, z + H + 0.6], [5, 5, z + H + 0.6], [0, 0, z + H + 10]], { mat: m, tono: 0.05 }); s.caja(0, 0, z + H + 9, 1, 1, 5, { mat: 'mu_hierro' }); s.caja(0, 0, z + H + 11.5, 3.4, 1, 1, { mat: 'mu_hierro' }); }
  else { s.poli([[-5, -5, z + H + 0.6], [5, -5, z + H + 0.6], [-5, 5, z + H + 0.6], [2, 5, z + H + 0.6], [-3, -3, z + H + 5]], { mat: m }); cascotes(g, 6, 12, 10, m, 10, 8, 2.4); const p = g.sub(14, 4, 2.6, 30, 88, 'x'); p.poli([[-5, -5, 0], [5, -5, 0], [-5, 5, 0], [5, 5, 0], [0, 0, 9]], { mat: m }); }
  const lit = v === 'encendida' || v === 'fuego_fatuo';
  s.cil(0, 0, z, 2.4, 1.6, { mat: 'mu_hierro', r1: 2.8 });
  if (lit) { llama(s, 0, 0, z + 1.4, 1.8, 5.6, f, 4, 0, v === 'fuego_fatuo' ? 'fuego_verde' : 'fuego'); s.esf(0, 0, z + 3.8, 2.2, { mat: v === 'fuego_fatuo' ? 'fuego_verde' : 'luz_vela', tono: -0.1 + onda(f, 4) * 0.08 }); }
  musgo(s, 4, -5, 5, 5.5, 1, 14);
  matas(g, 4, 10, 10);
  return lit ? { piezas: g.ps, resplandor: { c: [0, 0, z + 4], r: 28, color: v === 'fuego_fatuo' ? '#70e08a' : '#ffb85a' } } : undefined;
}, { cuadros: 4, t: 4 });
/** Farol colgado de un poste de hierro con cayado: se mece con el viento. */
obj('cem2_farol_cayado', ['Farol de cayado', 'Hanging crook lantern'], ['encendido', 'apagado', 'roto', 'doble'], [1, 1], true, (v, f, g, a) => {
  tierra(g, 8, 8, 3);
  const s = g.sub(0, 0, 0, (a.r() - 0.5) * 40 - 45);
  bloque(s, 0, 0, 0, 8, 8, 4, { mat: elegir(a, ['mu_piedra', 'mu_granito']), b: 1, j: 0.6, arriba: 0.85 });
  s.cil(0, 0, 4, 1.5, 4, { mat: 'mu_hierro', r1: 1 }); s.cil(0, 0, 8, 1, 50, { mat: 'mu_hierro', r1: 0.8 });
  for (const z of [10, 30]) s.cil(0, 0, z, 1.5, 1, { mat: 'mu_hierro' });
  const lados = v === 'doble' ? [1, -1] : [1];
  const lit = v === 'encendido' || v === 'doble';
  for (const sg of lados) {
    // cayado: la curva de arriba
    let prev: V3 = [0, 0, 57];
    for (let i = 1; i <= 8; i++) { const t = (i / 8) * Math.PI; const p: V3 = [sg * (5 - Math.cos(t) * 5), 0, 57 + Math.sin(t) * 5]; s.palo(prev, p, 0.75, { mat: 'mu_hierro' }); prev = p; }
    voluta(s, sg * 4, 51, 2.6, 1, sg, 0.45, 'mu_hierro');
    const mece = onda(f, 6, sg) * 8;
    const l = s.sub(sg * 10, 0, 57, 0, mece, 'y');
    l.palo([0, 0, 0], [0, 0, -4], 0.35, { mat: 'mu_hierro' });
    l.poli([[-2.8, -2.8, -6], [2.8, -2.8, -6], [-2.8, 2.8, -6], [2.8, 2.8, -6], [0, 0, -3.6]], { mat: 'mu_hierro' });
    l.caja(0, 0, -14, 4.6, 4.6, 8, { mat: lit ? 'luz_vela' : 'vidrio', tono: lit ? -0.1 + onda(f, 6) * 0.06 : -0.3 });
    if (v === 'roto' && sg > 0) l.caja(1.6, 1.6, -13, 3, 3, 6, { mat: 'vidrio', resta: true });
    for (const [x, y] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]] as P2[]) l.caja(x, y, -14.4, 1, 1, 8.8, { mat: 'mu_hierro' });
    l.caja(0, 0, -15.4, 5.6, 5.6, 1.4, { mat: 'mu_hierro' }); l.cil(0, 0, -17, 1.2, 1.6, { mat: 'mu_hierro', r1: 0.4 });
  }
  if (v === 'roto') for (let i = 0; i < 4; i++) g.caja(rr(a, 4, 12), rr(a, -4, 6), 0, 1.6, 1.2, 0.3, { mat: 'vidrio', giro: a.r() * 90 });
  return lit ? { piezas: g.ps, resplandor: { c: [6, -6, 44], r: 34, color: '#ffc070' } } : undefined;
}, { cuadros: 6, t: 4 });

// ================================================================== árboles muertos y cuervos
obj('cem2_arbol_muerto', ['Árbol muerto con cuervos', 'Dead tree with crows'], ['con_cuervos', 'retorcido', 'partido', 'con_soga', 'hueco'], [2, 2], true, (v, _f, g, a) => {
  tierra(g, 18, 16, 6, 'mu_tierra');
  const alto = 110 + a.r() * 40, gr = 6.5 + a.r() * 2.5;
  const puntas = arbolMuerto(g, alto, gr, { tor: v === 'retorcido' ? 1.3 : 0.5, partido: v === 'partido', ramas: v === 'retorcido' ? 5 : 4 });
  const altas = [...puntas].sort((p, q) => q[2] - p[2]);
  const n = v === 'con_cuervos' ? 4 : v === 'partido' ? 2 : 1;
  for (let i = 0; i < n && i < altas.length; i++) { const p = altas[i * 2 % altas.length]; cuervo(g.sub(p[0], p[1], p[2] - 0.4, a.r() * 360), elegir(a, ['posado', 'grazna', 'posado'] as const), Math.floor(a.r() * 8), 8, 0.8); }
  if (v === 'con_soga') {
    const p = puntas.filter((q) => q[2] > alto * 0.45 && q[2] < alto * 0.75).sort((q, r) => Math.hypot(r[0], r[1]) - Math.hypot(q[0], q[1]))[0] ?? altas[0];
    const L = Math.min(p[2] - 26, 34);
    g.palo(p, [p[0], p[1], p[2] - L], 0.5, { mat: 'cuerda' });
    for (let i = 0; i < 10; i++) { const t0 = (i / 10) * Math.PI * 2, t1 = ((i + 1) / 10) * Math.PI * 2; g.palo([p[0] + Math.cos(t0) * 3, p[1], p[2] - L - 3 + Math.sin(t0) * 3.6], [p[0] + Math.cos(t1) * 3, p[1], p[2] - L - 3 + Math.sin(t1) * 3.6], 0.5, { mat: 'cuerda' }); }
    g.cil(p[0], p[1], p[2] - L - 1.4, 1, 2.4, { mat: 'cuerda' });
  }
  if (v === 'hueco') { g.elip(gr * 0.6, gr * 0.5, 9, 3, 2.4, 6, { mat: 'negro' }); for (let i = 0; i < 3; i++) g.elip(gr * 0.9, gr * 0.8, 9 - i * 2, 1, 1, 1, { mat: 'luz_vela', tono: -0.3 }); }
  huesos(g, v === 'con_soga' ? 4 : 1, 10, 10, 6, 6);
  matas(g, 6, 16, 14);
});
obj('cem2_tocon_raices', ['Tocón que abraza la tumba', 'Stump strangling a tombstone'], ['con_lapida', 'con_cruz', 'solo', 'con_hongos'], [2, 2], true, (v, _f, g, a) => {
  tierra(g, 16, 14, 5, 'mu_tierra');
  if (v === 'con_lapida' || v === 'con_cruz') {
    const s = g.sub(4, 6, -1, 30 + a.r() * 40, 14 + a.r() * 8, 'y'), m = elegir(a, PIEDRAS);
    if (v === 'con_lapida') { bloque(s, 0, 0, 0, 13, 4, 16, { mat: m, b: 0.6, j: 0.5 }); s.cil(0, -2, 16, 6.5, 4, { mat: m, eje: [0, 1, 0] }); letras(s, -4, 4, 2, 13, 3, m); }
    else { bloque(s, 0, 0, 0, 3.6, 3.6, 24, { mat: m, b: 0.5, j: 0.4 }); bloque(s, 0, 0, 15, 13, 3.6, 3.6, { mat: m, b: 0.5, j: 0.4 }); }
  }
  const cs = [], gr = 9 + a.r() * 2, h = 18 + a.r() * 10;
  g.cil(-6, -6, 0, gr * 1.05, h, { mat: 'mu_corteza', r1: gr * 0.85 });
  for (let i = 0; i < 6; i++) { const an = a.r() * 6.28; cs.push(g.hu([-6 + Math.cos(an) * gr * 0.6, -6 + Math.sin(an) * gr * 0.6, h - 2], [-6 + Math.cos(an) * gr * 0.7, -6 + Math.sin(an) * gr * 0.7, h + 2 + a.r() * 6], gr * 0.18, 0.4)); }
  for (let i = 0; i < 5; i++) { const an = (i / 5) * 6.28 + a.r(); cs.push(g.hu([-6 + Math.cos(an) * gr, -6 + Math.sin(an) * gr, 1], [-6 + Math.cos(an) * gr * 0.9, -6 + Math.sin(an) * gr * 0.9, h * (0.4 + a.r() * 0.4)], gr * 0.3, gr * 0.15)); }
  for (let i = 0; i < 7; i++) {
    const an = (i / 7) * 6.28 + a.r() * 0.5, L = 14 + a.r() * 10;
    const m1: V3 = [-6 + Math.cos(an) * gr * 1.1, -6 + Math.sin(an) * gr * 1.1, 4], m2: V3 = [-6 + Math.cos(an + 0.4) * L, -6 + Math.sin(an + 0.4) * L, 2.4 + a.r() * 3];
    cs.push(g.hu([-6, -6, 9], m1, gr * 0.45, gr * 0.3), g.hu(m1, m2, gr * 0.3, 1), g.hu(m2, [m2[0] + Math.cos(an + 1) * 7, m2[1] + Math.sin(an + 1) * 7, -0.5], 1, 0.4));
  }
  g.masa(cs, { mat: 'mu_corteza', suave: 2.4 });
  g.cil(-6, -6, h - 0.2, gr * 0.75, 0.6, { mat: 'madera_vieja', tono: 0.1 }); for (let i = 1; i < 4; i++) g.cil(-6, -6, h + 0.1, gr * 0.75 * (i / 4), 0.6, { mat: 'madera_vieja', tono: -0.1 + (i % 2) * 0.15 });
  if (v === 'con_hongos') for (let i = 0; i < 9; i++) { const an = a.r() * 6.28, z = rr(a, 2, h - 2); const r = gr * 0.85; g.elip(-6 + Math.cos(an) * r, -6 + Math.sin(an) * r, z, 2.4, 2.4, 0.9, { mat: 'hongo', tono: (a.r() - 0.5) * 0.2, incl: 10 }); }
  else musgo(g, 4, -12, 0, 2, 2, h, 'mu_musgo');
  matas(g, 6, 15, 13);
});
obj('cem2_cuervo', ['Cuervo', 'Crow'], ['posado', 'picotea', 'grazna', 'vuela', 'sobre_calavera', 'bandada'], [1, 1], false, (v, f, g, a) => {
  const n = 8;
  if (v === 'vuela') { cuervo(g.sub(0, 0, 18 + onda(f, n) * 2, a.r() * 360), 'vuela', f, n, 1); return { piezas: g.ps }; }
  if (v === 'bandada') { for (let i = 0; i < 4; i++) cuervo(g.sub(rr(a, -12, 12), rr(a, -12, 12), 0, a.r() * 360), elegir(a, ['posado', 'picotea', 'grazna'] as const), f + i * 2, n, 0.8 + a.r() * 0.3); huesos(g, 3, 10, 10); return; }
  if (v === 'sobre_calavera') { calavera(g.sub(0, 0, 0, 45 + a.r() * 40), 4); huesitoSuelto(g); cuervo(g.sub(-0.5, 0, 7.2, a.r() * 360), 'picotea', f, n, 0.9); return; }
  cuervo(g.sub(0, 0, 0, a.r() * 360), v as 'posado' | 'picotea' | 'grazna', f, n, 1);
  if (v === 'picotea') { const c = g.sub(6, 2, 0, 0); c.elip(0, 0, 0.6, 3, 2, 1, { mat: 'mu_carne_seca' }); huesito(c, [-2, -1, 1], [3, 1.5, 0.8], 0.6); }
}, { cuadros: 8, t: 3 });
function huesitoSuelto(g: G) { const a = g.a; for (let i = 0; i < 2; i++) { const x = rr(a, -6, 6), y = rr(a, -6, 6); huesito(g, [x, y, 0.8], [x + 4, y + rr(a, -2, 2), 0.7], 0.7); } }

// ================================================================== flores, dolientes y la parca
/** Corona de flores secas en aro. */
function corona(g: G, R: number) {
  const a = g.a;
  for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2; g.elip(Math.cos(t) * R, (a.r() - 0.5) * 0.8, Math.sin(t) * R, 1.9, 1.3, 1.9, { mat: a.r() < 0.6 ? 'mu_hoja_seca' : 'hojas', tono: (a.r() - 0.5) * 0.2 - 0.05, giro: t / GR, incl: a.r() * 40 }); }
  for (let i = 0; i < 9; i++) { const t = a.r() * 6.28; g.esf(Math.cos(t) * R, 1, Math.sin(t) * R, 1.2 + a.r() * 0.5, { mat: elegir(a, ['mu_flor', 'mu_flor', 'tela_roja', 'mu_hueso']), tono: -0.15 - a.r() * 0.1 }); }
  // la cinta que cae
  g.masa([g.hu([0, 1, -R + 0.5], [-2, 1.6, -R - 9], 1.1, 0.8), g.hu([0, 1, -R + 0.5], [2.5, 1.4, -R - 7], 1, 0.7)], { mat: elegir(a, ['tela_morada', 'negro', 'tela']), tono: -0.1, suave: 1 });
}
obj('cem2_corona_marchita', ['Corona de flores marchitas', 'Withered funeral wreath'], ['en_atril', 'en_piso', 'apoyada', 'podrida'], [1, 1], false, (v, _f, g, a) => {
  tierra(g, 9, 9, 2);
  if (v === 'en_atril') {
    const s = g.sub(0, 0, 0, -45 + (a.r() - 0.5) * 30);
    for (const [x, y] of [[-5, -2], [5, -2], [0, 4]] as P2[]) s.palo([x, y, 0], [0, -0.4, 26], 0.6, { mat: elegir(a, ['mu_madera', 'mu_hierro']) });
    corona(s.sub(0, 1.4, 19), 7.5);
  } else if (v === 'apoyada') {
    const m = elegir(a, PIEDRAS), s = g.sub(-2, -4, 0, (a.r() - 0.5) * 20);
    bloque(s, 0, 0, 0, 14, 4, 18, { mat: m, b: 0.6, j: 0.5 }); s.cil(0, -2, 18, 7, 4, { mat: m, eje: [0, 1, 0] });
    corona(s.sub(0, 5, 8.4, 0, -14), 6.5);
  } else {
    const s = g.sub(0, 0, 1.6, a.r() * 180, 86);
    corona(s, 7);
    if (v === 'podrida') { for (let i = 0; i < 8; i++) g.elip(rr(a, -10, 10), rr(a, -10, 10), 0.3, 1.6, 1.2, 0.4, { mat: 'mu_hoja_seca', tono: -0.15, giro: a.r() * 90 }); g.elip(0, 0, 0.2, 9, 8, 0.4, { mat: 'mu_tierra', tono: -0.1 }); }
  }
  matas(g, 3, 9, 9);
});
obj('cem2_doliente', ['Estatua de doliente', 'Mourner statue'], ['velada', 'arrodillada', 'llorando', 'abraza_urna', 'monje'], [1, 1], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_marmol', 'mu_piedra_clara', 'mu_piedra', 'mu_marmol_negro']), mp = elegir(a, PIEDRAS);
  tierra(g, 11, 11, 4);
  const s = g.sub(0, 0, 0, (a.r() - 0.5) * 20);
  bloque(s, 0, 0, 0, 17, 17, 4, { mat: mp, tono: -0.06, b: 1.2, j: 0.8 }); bloque(s, 0, 0, 4, 13, 13, 9, { mat: mp, b: 0.9, j: 0.5 }); bloque(s, 0, 0, 13, 15, 15, 2.2, { mat: mp, tono: 0.04, b: 0.7, j: 0.4 });
  letras(s, -4, 4, 6.5, 10, 2, mp);
  const f = s.sub(0, 0, 15.2, 45 + (a.r() - 0.5) * 30);
  const pose = v === 'velada' ? 'pie' : v === 'arrodillada' ? 'rodillas' : v === 'llorando' ? 'cubre_cara' : v === 'abraza_urna' ? 'abraza' : 'reza';
  const zh = figuraVelada(f, 36, { mat: m, pose });
  if (v === 'abraza_urna') { f.cil(6.5, -1, 0, 2.4, 1.4, { mat: m, r1: 1.6 }); f.elip(6.5, -1, 6, 3.6, 3.6, 4.6, { mat: m, tono: 0.04 }); f.cil(6.5, -1, 10, 2, 2, { mat: m, r1: 2.6 }); }
  if (v === 'monje') { f.caja(5, 0, zh - 12, 3.4, 4.4, 5, { mat: m, tono: 0.08, giro: 0, incl: -20, inclEje: 'y' }); f.palo([-3, 3, zh - 13], [-3, 3, zh - 22], 0.4, { mat: m }); }
  if (a.r() < 0.6) musgo(f, 5, -5, 5, 4, 2, zh, a.r() < 0.5 ? 'mu_musgo' : 'mu_liquen');
  musgo(s, 3, -6, 6, 6.6, 1, 10);
  matas(g, 4, 11, 11);
});
obj('cem2_parca', ['Estatua de la muerte', 'Grim reaper statue'], ['guadana', 'reloj', 'alas', 'rota'], [1, 1], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_marmol_negro', 'mu_piedra_fria', 'mu_piedra']), mp = elegir(a, PIEDRAS);
  tierra(g, 12, 12, 4);
  const s = g.sub(0, 0, 0, (a.r() - 0.5) * 16);
  bloque(s, 0, 0, 0, 19, 19, 4, { mat: mp, tono: -0.06, b: 1.2, j: 0.8 }); bloque(s, 0, 0, 4, 15, 15, 8, { mat: mp, b: 0.9, j: 0.5 }); bloque(s, 0, 0, 12, 17, 17, 2.2, { mat: mp, tono: 0.04, b: 0.7, j: 0.4 });
  for (const [x, y, gi] of [[7.6, 0, 0], [0, 7.6, 90]] as [number, number, number][]) calavera(s.sub(x, y, 5.4, gi), 2.4, mp);
  const f = s.sub(0, 0, 14.2, 45);
  const zh = figuraVelada(f, 42, { mat: m, pose: 'pie', tono: -0.04 });
  calavera(f.sub(1.4, 0, zh - 3.4, 0, 8, 'y'), 2.4, 'mu_hueso', true, -0.1);
  if (v !== 'rota') {
    // guadaña: el asta y la hoja curva
    const gu = f.sub(3, 5.5, 0);
    gu.palo([0, 0, 0], [0.5, 0, zh + 14], 0.8, { mat: 'mu_madera', tono: -0.05 });
    const hoja: V3[] = []; for (let i = 0; i <= 6; i++) { const t = i / 6; hoja.push([0.5 - Math.sin(t * 1.8) * 12, Math.cos(t * 1.2) * 2 - 2, zh + 14 - t * 5 + Math.sin(t * 3) * 1.5]); }
    for (let i = 0; i < 6; i++) gu.poli([[hoja[i][0], hoja[i][1] - 0.5, hoja[i][2]], [hoja[i + 1][0], hoja[i + 1][1] - 0.5, hoja[i + 1][2]], [hoja[i][0], hoja[i][1] + 0.5, hoja[i][2]], [hoja[i + 1][0], hoja[i + 1][1] + 0.5, hoja[i + 1][2]], [hoja[i][0] * 0.96, hoja[i][1], hoja[i][2] - 5 * (1 - i / 6)], [hoja[i + 1][0] * 0.96, hoja[i + 1][1], hoja[i + 1][2] - 5 * (1 - (i + 1) / 6)]], { mat: 'acero', tono: -0.1 });
  } else { f.palo([3, 5.5, 0], [3.2, 5.5, zh - 10], 0.8, { mat: m }); const p = g.sub(13, 8, 1, 30, 88, 'x'); p.palo([0, 0, 0], [0, 0, 20], 0.8, { mat: m }); cascotes(g, 5, 9, 7, m, 10, 6, 2); }
  if (v === 'reloj') { const r = f.sub(5.5, -2.4, zh - 13); r.cil(0, 0, 0, 1.8, 0.6, { mat: 'mu_bronce' }); r.cil(0, 0, 0.6, 1.5, 2.2, { mat: 'vidrio', r1: 0.3 }); r.cil(0, 0, 2.8, 0.3, 2.2, { mat: 'vidrio', r1: 1.5 }); r.cil(0, 0, 5, 1.8, 0.6, { mat: 'mu_bronce' }); r.cil(0, 0, 0.6, 1.2, 1, { mat: 'arena', r1: 0.5 }); }
  if (v === 'alas') for (const sg of [-1, 1]) ala(f, sg, zh + 2, m, 1.3);
  musgo(s, 4, -7, 7, 7.6, 1, 10);
  matas(g, 4, 12, 12);
});

// ================================================================== osarios, fosa común y trabajo del enterrador
obj('cem2_osario_aire', ['Osario al aire libre', 'Open-air ossuary'], ['techado', 'fosa_reja', 'muro', 'cercado'], [3, 2], true, (v, _f, g, a) => {
  tierra(g, 26, 16, 6);
  if (v === 'techado') {
    const s = g.sub(0, -4, 0);
    for (let i = -3; i <= 3; i++) s.caja(i * 6, -6, 0, 6, 2, 40, { mat: 'mu_madera', tono: (a.r() - 0.5) * 0.12 });
    for (const x of [-21, 21]) for (const y of [-6, 10]) s.caja(x, y, 0, 3, 3, y > 0 ? 34 : 42, { mat: 'mu_madera', tono: -0.05 });
    for (const z of [3, 15, 27]) { s.caja(0, 2, z, 42, 13, 1.6, { mat: 'mu_madera', tono: 0.05 }); for (let i = 0; i < 9; i++) calavera(s.sub(-18 + i * 4.5 + rr(a, -0.5, 0.5), 2 + rr(a, -2, 3), z + 1.6, 70 + rr(a, -25, 25)), 2.2); }
    s.poli([[-24, -9, 42], [24, -9, 42], [-24, 14, 33], [24, 14, 33], [-24, -9, 44], [24, -9, 44], [-24, 14, 35], [24, 14, 35]], { mat: elegir(a, ['pizarra', 'mu_madera', 'paja']), tono: -0.05 });
    huesos(g, 6, 18, 4, 0, 14);
  } else if (v === 'fosa_reja') {
    const m = elegir(a, PIEDRAS);
    bloque(g, 0, 0, 0, 44, 30, 5, { mat: m, b: 1, j: 0.8 });
    g.caja(0, 0, 1, 38, 24, 6, { mat: m, resta: true });
    g.caja(0, 0, 1, 38, 24, 0.5, { mat: 'negro' });
    g.elip(0, 0, 1, 17, 10, 3.6, { mat: 'mu_hueso', tono: -0.32 });
    for (let i = 0; i < 9; i++) calavera(g.sub(rr(a, -15, 15), rr(a, -9, 9), 2 + a.r() * 1.5, mirar(a), (a.r() - 0.5) * 40, 'y'), 2.4, 'mu_hueso', true, -0.12);
    huesos(g, 10, 15, 9, 0, 0, 3);
    for (let i = 0; i <= 10; i++) g.caja(-19 + i * 3.8, 0, 5, 1, 26, 1, { mat: 'mu_hierro' });
    for (const y of [-8, 0, 8]) g.caja(0, y, 5.8, 40, 1, 1, { mat: 'mu_hierro' });
    g.caja(0, 13, 5, 6, 1.4, 2, { mat: 'mu_hierro', tono: 0.1 });
  } else if (v === 'muro') {
    const m = elegir(a, ['mu_bloques', 'mu_piedra']);
    bloque(g, 0, -6, 0, 46, 10, 34, { mat: m, b: 1, j: 0.6 });
    bloque(g, 0, -6, 34, 48, 12, 2.4, { mat: m, tono: 0.04, b: 0.6, j: 0.4 });
    for (const x of [-15, 0, 15]) for (const z of [4, 18]) g.sub(x, -1, 0).prisma(ojiva(11, 7, 0.5, 4, z), -4, 2, { mat: m, resta: true });
    for (const x of [-15, 0, 15]) for (const z of [4, 18]) { for (let i = 0; i < 3; i++) calavera(g.sub(x - 3.4 + i * 3.4, -2 + rr(a, -0.5, 0.5), z, 80 + rr(a, -20, 20)), 1.9); calavera(g.sub(x + rr(a, -1.5, 1.5), -2.5, z + 3.6, 85), 1.9); }
    const c = g.sub(0, -6, 36.4); bloque(c, 0, 0, 0, 3, 3, 14, { mat: m, b: 0.4, j: 0.3 }); bloque(c, 0, 0, 8, 10, 3, 3, { mat: m, b: 0.4, j: 0.3 });
    huesos(g, 5, 18, 4, 0, 6); musgo(g, 5, -22, 22, -0.8, 1, 10);
  } else {
    // montón de huesos cercado con estacas
    g.elip(0, 0, 0, 18, 11, 8, { mat: 'mu_hueso', tono: -0.32 });
    for (let i = 0; i < 14; i++) { const t = a.r() * 6.28, q = a.r() * 0.85, z = 8 * Math.sqrt(1 - q * q); calavera(g.sub(Math.cos(t) * 18 * q, Math.sin(t) * 11 * q, z - 2, mirar(a), (a.r() - 0.5) * 40, 'y'), 2.3, 'mu_hueso', true, -0.08); }
    huesos(g, 14, 15, 9, 0, 0, 5);
    for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2; g.palo([Math.cos(t) * 22, Math.sin(t) * 14, 0], [Math.cos(t) * 22.5, Math.sin(t) * 14.4, 12 + a.r() * 3], 0.9, { mat: 'mu_madera', r1: 0.4 }); }
    for (const z of [4, 9]) for (let i = 0; i < 16; i++) { const t0 = (i / 16) * Math.PI * 2, t1 = ((i + 1) / 16) * Math.PI * 2; if (a.r() < 0.15) continue; g.palo([Math.cos(t0) * 22.2, Math.sin(t0) * 14.2, z], [Math.cos(t1) * 22.2, Math.sin(t1) * 14.2, z], 0.45, { mat: 'cuerda' }); }
  }
  matas(g, 5, 24, 14);
});
obj('cem2_fosa_comun', ['Fosa común', 'Mass grave'], ['llena', 'a_medio', 'cal', 'con_cuervos'], [4, 4], false, (v, f, g, a) => {
  // terraplén de tierra alrededor y la fosa con los muertos amortajados en filas
  const X = 26, Y = 24;
  g.caja(0, 0, 0, 2 * X, 2 * Y, 0.4, { mat: 'mu_tierra', tono: -0.22 });
  const cs = [];
  for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), k = 1 / Math.max(Math.abs(c) / X, Math.abs(s) / Y); cs.push(g.bu([c * k * 1.08, s * k * 1.08, 0.4], [6 + a.r() * 3, 6 + a.r() * 3, 3 + a.r() * 3], { giro: t / GR })); }
  g.masa(cs, { mat: 'mu_tierra', suave: 3 });
  const cuerpo = (x: number, y: number, giro: number) => {
    const c = g.sub(x, y, 0.4, giro);
    c.masa([c.hu([-11, 0, 2.2], [10, 0, 2], 3, 2.4), c.bu([-4, 0, 2.6], [6, 4, 2.6]), c.bu([-12.5, 0, 2.6], [2.8, 2.6, 2.6])], { mat: 'mu_mortaja', tono: (a.r() - 0.5) * 0.15, suave: 1.2 });
    for (const xx of [-6, 2]) c.cil(xx, 0, 2.2, 2.9, 0.8, { mat: 'cuerda', eje: [1, 0, 0] });
  };
  const n = v === 'a_medio' ? 4 : 8;
  for (let i = 0; i < n; i++) cuerpo(rr(a, -8, 8), -16 + (i % 4) * 10 + rr(a, -1, 1), (i < 4 ? 0 : 180) + rr(a, -20, 20));
  if (v === 'a_medio') { monticulo(g, 16, 12, 5, 'mu_tierra', 5, 4, 12, 8); const p = g.sub(12, 14, 6, 20, -22, 'y'); p.palo([0, 0, -6], [0, 0, 24], 0.9, { mat: 'mu_madera' }); p.poli([[-3, -0.6, -6], [3, -0.6, -6], [-3, 0.6, -6], [3, 0.6, -6], [-2.6, -0.5, -14], [2.6, -0.5, -14], [0, 0, -16]], { mat: 'mu_hierro' }); }
  if (v === 'cal') for (let i = 0; i < 12; i++) g.elip(rr(a, -18, 18), rr(a, -18, 18), 3 + a.r() * 2, 4 + a.r() * 5, 3 + a.r() * 4, 1.4, { mat: 'mu_cal', giro: a.r() * 90 });
  if (v === 'con_cuervos') for (let i = 0; i < 4; i++) cuervo(g.sub(rr(a, -14, 14), rr(a, -14, 14), 4.5, a.r() * 360), elegir(a, ['picotea', 'grazna', 'posado'] as const), f + i * 3, 8, 0.85);
  calavera(g.sub(X + 4, rr(a, -10, 10), 0, mirar(a)), 3);
  matas(g, 6, X + 6, Y + 6);
  return { piezas: g.ps };
}, { cuadros: 8, t: 3 });
obj('cem2_pala_clavada', ['Pala clavada', 'Shovel in the dirt'], ['pala', 'pico', 'pala_farol', 'rota', 'horca'], [1, 1], false, (v, f, g, a) => {
  monticulo(g, 12, 10, 2.4 + a.r() * 1.4, 'mu_tierra', 4, 0, 0, 9);
  const s = g.sub(rr(a, -1, 1), rr(a, -1, 1), 13, a.r() * 360, rr(a, 8, 22), a.r() < 0.5 ? 'x' : 'y');
  const L = v === 'rota' ? 14 : 30;
  s.palo([0, 0, -6], [0, 0, L], 0.9, { mat: elegir(a, ['mu_madera', 'madera']) });
  if (v !== 'rota') { s.caja(0, 0, L, 5.4, 1.4, 1.4, { mat: 'mu_madera' }); s.palo([0, 0, L - 2], [-2.4, 0, L], 0.5, { mat: 'mu_madera' }); s.palo([0, 0, L - 2], [2.4, 0, L], 0.5, { mat: 'mu_madera' }); }
  else { s.poli([[-1, -1, L], [1, -1, L], [0, 1, L], [0.6, 0, L + 3], [-0.4, 0.3, L + 2]], { mat: 'mu_madera', tono: 0.1 }); const p = g.sub(9, 4, 0.9, 40, 88, 'x'); p.palo([0, 0, 0], [0, 0, 16], 0.9, { mat: 'mu_madera' }); p.caja(0, 0, 16, 5.4, 1.4, 1.4, { mat: 'mu_madera' }); }
  if (v === 'pico') s.poli([[-9, -0.8, -5], [9, -0.8, -5], [-9, 0.8, -5], [9, 0.8, -5], [0, -1.4, -3], [0, 1.4, -3], [0, 0, -7]], { mat: 'mu_hierro' });
  else if (v === 'horca') for (let i = -1; i <= 1; i++) s.palo([i * 2.6, 0, -4], [i * 3, 0, -12], 0.45, { mat: 'mu_hierro' });
  else s.poli([[-3.6, -0.6, -6], [3.6, -0.6, -6], [-3.6, 0.6, -6], [3.6, 0.6, -6], [-3, -0.5, -14], [3, -0.5, -14], [0, 0, -17]], { mat: 'mu_hierro' });
  if (v === 'pala_farol') {
    const l = g.sub(-9, 6, 0, a.r() * 90);
    l.cil(0, 0, 0, 2.8, 1, { mat: 'mu_hierro' }); l.caja(0, 0, 1, 4, 4, 6, { mat: 'luz_vela', tono: -0.1 + onda(f, 4) * 0.08 });
    for (const [x, y] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]] as P2[]) l.caja(x, y, 1, 0.8, 0.8, 6.4, { mat: 'mu_hierro' });
    l.poli([[-2.6, -2.6, 7.2], [2.6, -2.6, 7.2], [-2.6, 2.6, 7.2], [2.6, 2.6, 7.2], [0, 0, 9.6]], { mat: 'mu_hierro' });
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI; l.palo([Math.cos(t) * 2, 0, 9.6 + Math.sin(t) * 2.6], [Math.cos(t + 0.39) * 2, 0, 9.6 + Math.sin(t + 0.39) * 2.6], 0.3, { mat: 'mu_hierro' }); }
    return { piezas: g.ps, resplandor: { c: [-9, 6, 5], r: 24, color: '#ffb35a' } };
  }
  matas(g, 3, 10, 9);
  return { piezas: g.ps };
}, { cuadros: 4, t: 4 });
/** Rueda de carro de rayos en el plano x-z. */
function rueda(g: G, R: number, m = 'mu_madera') {
  const n = 14;
  for (let i = 0; i < n; i++) { const t0 = (i / n) * Math.PI * 2, t1 = ((i + 1) / n) * Math.PI * 2; g.palo([Math.cos(t0) * R, 0, Math.sin(t0) * R], [Math.cos(t1) * R, 0, Math.sin(t1) * R], 1.1, { mat: m }); }
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; g.palo([0, 0, 0], [Math.cos(t) * R, 0, Math.sin(t) * R], 0.55, { mat: m }); }
  g.cil(0, -1.4, 0, 2, 2.8, { mat: m, eje: [0, 1, 0], tono: 0.05 }); g.cil(0, -1.6, 0, 0.9, 3.2, { mat: 'mu_hierro', eje: [0, 1, 0] });
}
obj('cem2_carreta_enterrador', ['Carreta del enterrador', "Gravedigger's cart"], ['vacia', 'con_cuerpos', 'con_ataud', 'volcada'], [3, 4], true, (v, _f, g, a) => {
  tierra(g, 20, 30, 5);
  const volc = v === 'volcada';
  const s = volc ? g.sub(-2, 0, 0, 10 + a.r() * 20, -66, 'x').sub(0, 0, -11) : g.sub(0, 0, 0, (a.r() - 0.5) * 20);
  const R = 11, zc = R, m = elegir(a, ['mu_madera', 'madera_vieja']);
  for (const sx of [-1, 1]) rueda(s.sub(sx * 15, 4, zc, 90 + (volc ? 0 : 0)), R, m);
  s.palo([-16, 4, zc], [16, 4, zc], 1, { mat: m });
  // caja de tablas
  s.caja(0, 0, zc + 1, 26, 40, 1.6, { mat: m });
  for (const sx of [-1, 1]) s.caja(sx * 12.6, 0, zc + 2.6, 1.4, 40, 7, { mat: m, tono: 0.04 });
  for (const sy of [-1, 1]) s.caja(0, sy * 19.4, zc + 2.6, 26, 1.4, sy > 0 ? 6 : 8, { mat: m, tono: -0.02 });
  for (const sx of [-1, 1]) for (const y of [-14, 0, 14]) s.caja(sx * 13.4, y, zc + 1, 1.4, 1.8, 9, { mat: m, tono: -0.06 });
  // varas para tirar
  for (const sx of [-1, 1]) s.palo([sx * 8, -20, zc + 1.6], [sx * 6, -44, volc ? zc : 4], 1, { mat: m });
  if (!volc) { s.palo([0, 18, zc + 1], [0, 26, 0], 1, { mat: m }); }
  if (v === 'con_cuerpos' || volc) {
    for (let i = 0; i < (volc ? 2 : 3); i++) { const c = (volc ? g.sub(14 + i * 8, rr(a, -14, 14), 0, 80 + rr(a, -30, 30)) : s.sub(rr(a, -4, 4), -10 + i * 9, zc + 2.6 + (i === 1 ? 3 : 0), 90 + rr(a, -10, 10))); c.masa([c.hu([-12, 0, 2.4], [11, 0, 2.2], 3.1, 2.5), c.bu([-4, 0, 2.8], [6, 4.2, 2.8]), c.bu([-13, 0, 2.8], [2.8, 2.6, 2.7])], { mat: 'mu_mortaja', tono: (a.r() - 0.5) * 0.2, suave: 1.2 }); }
    if (!volc) { const b = s.sub(10, -12, zc + 6); b.masa([b.hu([0, 0, 0], [5, 3, -4], 0.9, 0.7), b.bu([5.6, 3.4, -5], [1.2, 0.9, 1.2])], { mat: 'mu_carne_seca', suave: 0.6 }); }
  }
  if (v === 'con_ataud') { const c = s.sub(0, 0, zc + 2.6, 0); c.poli([[-7, -18, 0], [7, -18, 0], [9, -8, 0], [5, 18, 0], [-5, 18, 0], [-9, -8, 0], [-7, -18, 10], [7, -18, 10], [9, -8, 10], [5, 18, 10], [-5, 18, 10], [-9, -8, 10]], { mat: 'mu_madera', tono: -0.08 }); c.caja(0, -6, 10, 2, 14, 0.8, { mat: 'mu_hierro' }); c.caja(0, -9, 10, 7, 2, 0.8, { mat: 'mu_hierro' }); }
  if (v === 'vacia') { const p = s.sub(4, 0, zc + 2.6, 20); p.palo([-12, 0, 0.8], [10, 0, 0.8], 0.8, { mat: 'mu_madera' }); p.poli([[10, -2.2, 0], [10, 2.2, 0], [16, -2, 0.2], [16, 2, 0.2], [10, -2.2, 1.4], [10, 2.2, 1.4]], { mat: 'mu_hierro' }); s.palo([-8, 10, zc + 2.6], [6, 16, zc + 3.4], 0.6, { mat: 'cuerda' }); }
  matas(g, 4, 20, 28);
});

// ================================================================== velas, campana, trampilla y banco
obj('cem2_velas_tumba', ['Velas sobre la tumba', 'Candles on the grave'], ['sobre_losa', 'en_calavera', 'farolillos', 'derretidas', 'altarcito'], [1, 1], false, (v, f, g, a) => {
  const n = 4; let zc = 8;
  tierra(g, 10, 10, 2);
  if (v === 'sobre_losa') {
    const s = g.sub(0, 0, 0, a.r() * 40);
    bloque(s, 0, 0, 0, 22, 15, 3, { mat: elegir(a, PIEDRAS), b: 0.8, j: 0.6 });
    for (let i = 0; i < 7; i++) vela(s, rr(a, -8, 8), rr(a, -5, 5), 3, 3 + a.r() * 9, 1 + a.r() * 0.6, f, n, i);
    zc = 12;
  } else if (v === 'en_calavera') {
    calavera(g.sub(0, 0, 0, 45), 4.2);
    vela(g, -0.4, 0, 7.4, 6, 1.3, f, n, 0);
    for (let i = 1; i < 4; i++) vela(g, rr(a, -8, 8), rr(a, -8, 8), 0, 4 + a.r() * 8, 1.3, f, n, i);
    zc = 14;
  } else if (v === 'farolillos') {
    for (let i = 0; i < 4; i++) { const x = rr(a, -8, 8), y = rr(a, -8, 8); g.cil(x, y, 0, 1.8, 0.5, { mat: 'mu_hierro' }); g.cil(x, y, 0.5, 1.6, 4.4, { mat: 'tela_roja', tono: -0.05 + onda(f, n, i) * 0.06 }); g.cil(x, y, 1, 0.8, 2.4, { mat: 'luz_vela', tono: -0.1 + onda(f, n, i) * 0.1 }); g.cil(x, y, 4.9, 1.8, 0.6, { mat: 'mu_hierro', r1: 1 }); }
    g.elip(0, 0, 0.1, 9, 9, 0.3, { mat: 'mu_flor', tono: -0.2 });
    zc = 6;
    return { piezas: g.ps, resplandor: { c: [0, 0, zc], r: 20, color: '#ff7a4a' } };
  } else if (v === 'derretidas') {
    g.elip(0, 0, 0, 10, 8, 1.4, { mat: 'mu_cera', tono: -0.05 });
    for (let i = 0; i < 6; i++) g.elip(rr(a, -8, 8), rr(a, -6, 6), 0.6, 2 + a.r() * 2, 1.6 + a.r() * 2, 1.2, { mat: 'mu_cera', tono: 0.05 });
    for (let i = 0; i < 3; i++) vela(g, rr(a, -6, 6), rr(a, -5, 5), 1, 1.5 + a.r() * 2.5, 1.5, f, n, i, i < 2);
    zc = 6;
  } else {
    const s = g.sub(0, -2, 0, (a.r() - 0.5) * 20), m = elegir(a, PIEDRAS);
    bloque(s, 0, 0, 0, 16, 9, 9, { mat: m, b: 0.8, j: 0.5 }); s.caja(0, 4.6, 2, 8, 1.6, 5, { mat: m, resta: true });
    vela(s, 0, 4, 2, 3, 1, f, n, 3);
    for (let i = 0; i < 4; i++) vela(s, -6 + i * 4, rr(a, -2, 2), 9, 3 + a.r() * 6, 1.1, f, n, i);
    s.elip(4, 2, 9.4, 1.5, 1.5, 1, { mat: 'mu_flor' });
    zc = 15;
  }
  return { piezas: g.ps, resplandor: { c: [0, 0, zc], r: 24, color: '#ffb35a' } };
}, { cuadros: 4, t: 3 });
obj('cem2_campana_tumba', ['Campana del enterrado vivo', 'Safety coffin bell'], ['quieta', 'sonando', 'oxidada', 'cuerda_rota'], [1, 2], false, (v, f, g, a) => {
  monticulo(g, 8, 17, 3.4, 'mu_tierra', 4, 0, 4, 5);
  const s = g.sub(0, -13, 0, (a.r() - 0.5) * 20);
  const m = v === 'oxidada' ? 'mu_oxido' : elegir(a, ['mu_madera', 'mu_hierro']);
  s.palo([0, 0, 0], [0, 0, 30], 1, { mat: m }); s.palo([0, 0, 29], [7, 0, 29], 0.8, { mat: m }); s.palo([0, 0, 22], [5, 0, 29], 0.6, { mat: m });
  const ang = v === 'sonando' ? onda(f, 6) * 28 : 0;
  const b = s.sub(6, 0, 28.4, 0, ang, 'y');
  b.cil(0, 0, -6, 3.2, 5.4, { mat: v === 'oxidada' ? 'mu_oxido' : 'bronce', r1: 1.6, tono: -0.1 }); b.cil(0, 0, -6.4, 3.4, 0.6, { mat: v === 'oxidada' ? 'mu_oxido' : 'bronce', tono: -0.1 }); b.cil(0, 0, -6.6, 2.8, 4.5, { mat: 'negro', r1: 1.2 }); b.esf(0, 0, -6.8, 0.9, { mat: 'mu_hierro' });
  if (v !== 'cuerda_rota') { const fin: V3 = [7 + Math.sin(ang * GR) * 7, 0, 21]; b.palo([0, 0, -6.4], [Math.sin(-ang * GR) * 0.5, 0, -8], 0.3, { mat: 'cuerda' }); s.palo(fin, [2, 8, 3], 0.35, { mat: 'cuerda' }); s.palo([2, 8, 3], [1, 10, 0], 0.35, { mat: 'cuerda' }); }
  else s.palo([6, 0, 21], [7, 1, 14], 0.35, { mat: 'cuerda' });
  s.cil(1, 10, 0, 1.4, 1.4, { mat: 'mu_hierro' });
  if (v === 'sonando') brazoMuerto(g.sub(3, 4, 0, 30), 5, 'mu_carne_seca');
  matas(g, 4, 9, 16, 0, 2);
}, { cuadros: 6, t: 3 });
obj('cem2_trampilla_cripta', ['Trampilla de cripta', 'Crypt hatch'], ['cerrada', 'abierta', 'rota', 'encadenada'], [2, 2], false, (v, _f, g, a) => {
  const m = elegir(a, PIEDRAS);
  tierra(g, 17, 16, 5);
  bloque(g, 0, 0, 0, 30, 28, 4, { mat: m, b: 1, j: 0.8 });
  g.caja(0, 0, 0.6, 22, 20, 6, { mat: m, resta: true });
  g.caja(0, 0, 0.5, 22, 20, 0.4, { mat: 'negro' });
  for (let i = 0; i < 3; i++) g.caja(0, 6 - i * 4, 0.6, 20, 4, 3 - i, { mat: m, tono: -0.25 - i * 0.08 });
  const hoja = (s: G, sx: number) => { s.caja(sx * 5.4, 0, 0, 10.6, 20, 2, { mat: 'mu_madera', tono: (a.r() - 0.5) * 0.1 }); for (const y of [-6, 6]) s.caja(sx * 5.4, y, 2, 10.8, 2, 0.6, { mat: 'mu_hierro' }); s.cil(sx * 1.6, 0, 2, 1.4, 0.8, { mat: 'mu_hierro' }); };
  if (v === 'cerrada' || v === 'encadenada') { for (const sx of [-1, 1]) hoja(g.sub(0, 0, 2.2), sx); if (v === 'encadenada') { cadena(g, [-1.6, -8, 4.6], [1.6, 8, 4.6], -0.6, 'mu_hierro', 0.8); g.caja(0, 9, 3.4, 3, 3, 3.2, { mat: 'mu_hierro', tono: 0.1 }); } }
  else if (v === 'abierta') { for (const sx of [-1, 1]) hoja(g.sub(sx * 11, 0, 4, 0, sx * -100, 'y'), -sx * 0 + sx * -1 * -1); }
  else { hoja(g.sub(0, 0, 2.2), -1); const p = g.sub(18, 6, 0.6, 30, 6); p.caja(0, 0, 0, 7, 14, 2, { mat: 'mu_madera' }); astillas(g.sub(4, 0, 2), 3, 4); }
  musgo(g, 3, -14, 14, 14.2, 0.5, 3);
  matas(g, 5, 16, 15);
});
obj('cem2_banco_piedra', ['Banco de piedra', 'Stone mourning bench'], ['entero', 'roto', 'musgo', 'con_ofrenda'], [2, 1], false, (v, _f, g, a) => {
  const m = v === 'musgo' ? 'cem_lapida_musgo' : elegir(a, PIEDRAS);
  tierra(g, 18, 9, 3);
  const s = g.sub(0, 0, 0, (a.r() - 0.5) * 10);
  for (const sx of [-1, 1]) { bloque(s, sx * 10, 0, 0, 4, 9, 8, { mat: m, b: 0.6, j: 0.5 }); s.sub(sx * 10, 0, 0, 90).prisma([[-3.6, 0], [3.6, 0], [3.6, 2], [-3.6, 2]], -2, 2, { mat: m, resta: true }); }
  if (v === 'roto') { const p = s.sub(-3, 0, 8, 0, -16, 'y'); bloque(p, 0, 0, 0, 14, 10, 2.8, { mat: m, b: 0.5, j: 0.5 }); const q = s.sub(10, 2, 0, 20, 30, 'y'); bloque(q, -3, 0, 2, 10, 10, 2.8, { mat: m, b: 0.5, j: 0.5 }); cascotes(g, 4, 6, 4, m, 4, 6); }
  else bloque(s, 0, 0, 8, 28, 10, 2.8, { mat: m, b: 0.6, j: 0.5 });
  if (v === 'musgo') { for (let i = 0; i < 6; i++) s.elip(rr(a, -12, 12), rr(a, -4, 4), 10.8, 2.5, 2, 0.8, { mat: 'mu_musgo' }); hiedra(s, [[-13, 5, 0], [-12, 5.2, 6], [-8, 5, 10.5], [-2, 4, 11]], 4); }
  if (v === 'con_ofrenda') { vela(s, 8, 0, 10.8, 4, 1.1, 0, 4, 0, false); s.sub(-6, 0, 10.8, 30).palo([0, 0, 0.6], [6, 1, 0.6], 0.4, { mat: 'mu_hoja_seca' }); s.esf(0.4, 1, 11.6, 1.4, { mat: 'mu_flor' }); calavera(s.sub(-1, 0, 10.8, 60), 2.4); }
  matas(g, 4, 16, 7);
});

// ================================================================== capilla en ruinas
/** Muro roto a lo largo de x (cara +y): rebanadas de alto desparejo, así el borde de arriba queda mellado. */
function muroRoto(g: G, x0: number, x1: number, gro: number, alto: (x: number) => number, m: string) {
  const a = g.a, paso = 6;
  for (let x = x0; x < x1 - 0.1; x += paso) { const w = Math.min(paso, x1 - x), h = Math.max(4, alto(x + w / 2) + (a.r() - 0.5) * 6); bloque(g, x + w / 2, 0, 0, w + 0.3, gro, h, { mat: m, b: 0.5, j: 0.9 }); if (a.r() < 0.4 && h > 12) bloque(g, x + w / 2 + rr(a, -1, 1), rr(a, -1, 1), h - 0.5, w * 0.6, gro * 0.8, 2 + a.r() * 3, { mat: m, b: 0.5, j: 1, giro: rr(a, -10, 10) }); }
}
obj('cem2_capilla_ruinas', ['Capilla en ruinas', 'Ruined chapel'], ['fachada', 'nave', 'abside', 'campanario'], [5, 5], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_bloques', 'mon_piedra', 'mu_piedra']), mc = 'mu_piedra';
  tierra(g, 42, 40, 10);
  if (v === 'fachada') {
    const s = g.sub(0, -6, 0), H = 92;
    bloque(s, 0, 0, 0, 76, 16, 4, { mat: mc, tono: -0.06, b: 1, j: 1 });
    muroRoto(s.sub(0, 0, 4), -34, 34, 10, (x) => Math.max(10, H - Math.abs(x) * 1.3 - (x > 8 ? (x - 8) * 1.6 : 0)), m);
    for (const sx of [-1, 1]) { bloque(s, sx * 34, 3, 4, 9, 16, sx > 0 ? 40 : 60, { mat: m, b: 0.8, j: 0.6, tono: 0.03 }); bloque(s, sx * 34, 5, sx > 0 ? 44 : 64, 7, 12, 8, { mat: m, b: 0.8, j: 0.8, arriba: 0.7 }); }
    for (let i = 3; i >= 0; i--) s.sub(0, 5 + i * 1.2, 4).prisma(ojiva(22 + i * 4, 26, 0.85, 5, 0), -1.2, 1.2, { mat: m, tono: 0.04 * (4 - i) });
    s.sub(0, 0, 4).prisma(ojiva(20, 25, 0.85, 5, 0), -8, 10, { mat: m, resta: true });
    s.cil(0, -6, 60, 10, 14, { mat: m, resta: true, eje: [0, 1, 0] });
    for (let i = 0; i < 4; i++) { const t = (i / 8) * Math.PI * 2 + 0.3; s.palo([0, 0, 60], [Math.cos(t) * 9.6, 0, 60 + Math.sin(t) * 9.6], 0.8, { mat: m, tono: 0.08 }); }
    s.cil(0, -0.5, 60, 2.2, 1, { mat: m, eje: [0, 1, 0], tono: 0.08 });
    for (let i = 0; i < 6; i++) { const t = (i / 12) * Math.PI * 2; s.palo([Math.cos(t) * 9.8, -1, 60 + Math.sin(t) * 9.8], [Math.cos(t + 0.52) * 9.8, -1, 60 + Math.sin(t + 0.52) * 9.8], 0.9, { mat: m, tono: 0.06 }); }
    hiedra(s, [[-28, 6, 0], [-26, 6, 18], [-20, 6.5, 34], [-12, 6, 52], [-6, 6.5, 70]], 7);
    cascotes(g, 16, 30, 12, m, 0, 22, 3.4);
    s.palo([16, 18, 1], [-2, 30, 6], 2, { mat: 'mu_madera' });
  } else if (v === 'nave') {
    for (const sx of [-1, 1]) {
      const s = g.sub(sx * 30, 0, 0, 90);
      bloque(s, 0, 0, 0, 74, 12, 3, { mat: mc, tono: -0.06, b: 1, j: 1 });
      muroRoto(s.sub(0, 0, 3), -35, 35, 8, (y) => (sx > 0 ? 30 : 64) - Math.abs(y + (sx > 0 ? 10 : -6)) * 0.7 + Math.sin(y * 0.2) * 6, m);
      for (const y of [-18, 6]) s.sub(y, 0, 3).prisma(ojiva(9, 24, 0.85, 4, 12), -6, 6, { mat: m, resta: true });
      for (const y of [-30, -6, 18]) bloque(s, y, -6 * sx * -1, 3, 6, 6, sx > 0 ? 26 : 50, { mat: m, b: 0.6, j: 0.6, tono: 0.04 });
    }
    // un arco que queda en pie y vigas del techo caídas
    const ar = g.sub(0, -24, 0);
    for (const sx of [-1, 1]) bloque(ar, sx * 22, 0, 0, 7, 7, 46, { mat: m, b: 0.7, j: 0.5 });
    ar.prisma(ojiva(52, 46, 0.7, 6, 0), -3, 3, { mat: m });
    ar.prisma(ojiva(38, 46, 0.7, 6, 0), -4, 4, { mat: m, resta: true });
    ar.caja(0, 0, 0, 38, 10, 46, { mat: m, resta: true });
    for (let i = 0; i < 3; i++) g.palo([rr(a, -26, -10), rr(a, -20, 20), rr(a, 0, 30)], [rr(a, 10, 26), rr(a, -20, 20), 1], 1.8, { mat: 'mu_madera', tono: (a.r() - 0.5) * 0.1 });
    for (let i = 0; i < 3; i++) { const b = g.sub(rr(a, -10, 10), 4 + i * 10, 0, rr(a, -15, 15)); b.caja(0, 0, 0, 18, 3, 6, { mat: 'mu_madera', tono: -0.08 }); b.caja(0, -2, 6, 18, 1.4, 4, { mat: 'mu_madera', tono: -0.04 }); }
    cascotes(g, 18, 22, 28, m, 0, 0, 3);
  } else if (v === 'abside') {
    const R = 32;
    for (let i = 0; i <= 8; i++) {
      const t = Math.PI + (i / 8) * Math.PI, x = Math.cos(t) * R, y = Math.sin(t) * R * 0.95 + 10;
      const s = g.sub(x, y, 0, t / GR + 90);
      const h = 40 + Math.sin(i * 1.7) * 18 + a.r() * 10;
      bloque(s, 0, 0, 0, 13.4, 8, h, { mat: m, b: 0.6, j: 0.9 });
      if (i % 2 === 1 && h > 34) s.prisma(ojiva(5, 18, 0.85, 4, 10), -6, 6, { mat: m, resta: true });
      if (i % 2 === 0) bloque(s, 0, 4, 0, 5, 6, h * 0.8, { mat: m, b: 0.6, j: 0.5, tono: 0.04 });
    }
    bloque(g, 0, 0, 0, 30, 18, 4, { mat: mc, tono: -0.05, b: 0.8, j: 0.8 });
    bloque(g, 0, -2, 4, 22, 10, 12, { mat: elegir(a, ['mu_marmol', m]), b: 0.8, j: 0.6 });
    bloque(g, 0, -2, 16, 26, 12, 2.4, { mat: elegir(a, ['mu_marmol', m]), tono: 0.05, b: 0.5, j: 0.4 });
    for (let i = 0; i < 3; i++) vela(g, -8 + i * 8, -2, 18.4, 2 + a.r() * 5, 1.1, 0, 4, i, false);
    const c = g.sub(0, -8, 18.4, 0, -60 + a.r() * 20, 'x'); c.caja(0, 0, 0, 2.4, 2.4, 22, { mat: 'mu_madera' }); c.caja(0, 0, 14, 12, 2.4, 2.4, { mat: 'mu_madera' });
    g.elip(0, 10, 0.2, 10, 6, 0.4, { mat: 'tela_roja', tono: -0.3 });
    cascotes(g, 14, 30, 16, m, 0, 6, 3);
  } else {
    const s = g.sub(0, -4, 0), W = 30;
    bloque(s, 0, 0, 0, W + 8, W + 8, 4, { mat: mc, tono: -0.06, b: 1, j: 1 });
    for (const [x, y, gi, alto] of [[0, W / 2 - 4, 0, 96], [W / 2 - 4, 0, 90, 70], [0, -W / 2 + 4, 0, 110], [-W / 2 + 4, 0, 90, 104]] as [number, number, number, number][]) {
      const w = s.sub(x, y, 4, gi);
      muroRoto(w, -W / 2, W / 2, 8, (u) => alto - Math.abs(u - (gi ? 6 : -4)) * 1.4, m);
      if (alto > 80) { w.prisma(ojiva(8, 12, 0.85, 4, 56), -6, 6, { mat: m, resta: true }); w.prisma(ojiva(6, 10, 0.85, 4, 20), -6, 6, { mat: m, resta: true }); }
    }
    s.sub(0, W / 2 - 4, 4).prisma(ojiva(12, 16, 0.85, 4, 0), -6, 6, { mat: m, resta: true });
    s.caja(0, W / 2 - 8, 4, 12, 0.6, 22, { mat: 'negro' });
    // la campana caída, rajada, con su yugo
    const c = g.sub(W / 2 + 10, W / 2 + 6, 6, a.r() * 180, 70, 'x');
    c.cil(0, 0, -7, 7, 13, { mat: 'bronce', r1: 3.6, tono: -0.12 }); c.cil(0, 0, -7.6, 7.6, 1.2, { mat: 'bronce', tono: -0.1 }); c.cil(0, 0, -7.4, 5.8, 11, { mat: 'negro', r1: 2.4 });
    c.palo([0, -9, 7], [0, 9, 7], 1.6, { mat: 'mu_madera' });
    cascotes(g, 16, 24, 20, m, 6, 10, 3.4);
  }
  matas(g, 10, 38, 36);
});
