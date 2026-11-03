import { rng } from '../core/rng';
import { mascara, rellenar, trazo, disco, polilinea, desenfocar, desenfocada, pintar, brillo, halo, mezcla, sat, suave, fbm, rayo, type Lamina, type Mascara, type C3, type P2 } from './cine';
import { perfil, aguja, ruina, pino, encapuchado } from './siluetas';
import {
  contraluz, niebla, reflejo, chorreado, charco, salpicar, pintarSangre, haces, estela, sillares, cajaPose, mascaraPose, emiteFuego, emiteMar, emiteOro, losas, grietas,
  type Luz,
} from './estudio';
import {
  CW, CH, CX, Toma, alumbrar, sombraVertical, granoOpaco, cielo, lomas, pintarConRuido, pasto, fogata, figura, figuraEsc, modelo, heroe, npc, barco, brillosAgua,
} from './cine_toma';

/**
 * Pintores de los planos de los actos 4 a 6 (Hrimgard, la Herida, Ysmeral). Coordenadas de la capa de 1408 x 792.
 * El plano 2 del acto 4 lleva capas con `soloSi` (vigdis_viva / vigdis_muerta) y el plano 2 del acto 5 con
 * brasa_destruir / brasa_absorber: el juego dibuja solo las de la bandera encendida.
 */

const M = () => mascara(CW, CH);
const HIELO: C3 = [0.6, 0.82, 1], BRASA: C3 = [1, 0.42, 0.1], MAR: C3 = [0.3, 1, 0.75];
/** Suelo de adelante, más alto a los lados (enmarca). */
const suelo = (base: number, amp: number, s: number): P2[] => [[-10, CH + 5], ...Array.from({ length: 100 }, (_, k) => { const x = -10 + (k / 99) * (CW + 20); return [x, base - amp * Math.abs((x - CX) / CX) ** 2 * 2 + (fbm(x / 120, 1, 4, s) - 0.5) * amp] as P2; }), [CW + 10, CH + 5]];
/** Columna de hielo con un muerto adentro (máscaras de hielo y de cuerpo). */
function columnaHielo(L: Lamina, x: number, y: number, hh: number, ww: number, s: number) {
  const col = M(), dentro = M();
  rellenar(col, [[x - ww / 2, y], [x - ww * 0.58, y - hh * 0.7], [x - ww * 0.2, y - hh], [x + ww * 0.25, y - hh * 0.92], [x + ww * 0.55, y - hh * 0.6], [x + ww / 2, y]]);
  encapuchado(dentro, x, y - hh * 0.12, hh * 0.68, { capa: 0 });
  pintarConRuido(L, col, [0.2, 0.34, 0.46], 0.3, 10, s);
  pintar(L, dentro, [0.04, 0.05, 0.08], 0.8);
  const sg = M(); chorreado(sg, x, y - hh * 0.62, ww * 0.3, hh * 0.4, s); for (let i = 0; i < CW * CH; i++) sg.d[i] *= dentro.d[i] > 0.2 ? 1 : 0; pintar(L, sg, [0.3, 0.02, 0.03], 0.6);
  const filo = M(); rellenar(filo, [[x - ww * 0.2, y - hh], [x - ww * 0.1, y - hh * 0.95], [x - ww * 0.35, y - hh * 0.3], [x - ww * 0.45, y - hh * 0.32]]);
  pintar(L, filo, [0.6, 0.85, 1], 0.5, 'luz'); contraluz(L, col, -2, 0, HIELO, 0.8); contraluz(L, col, 2, 0, [0.2, 0.3, 0.45], 0.4);
}

// ================================================================== ACTO 4: HRIMGARD
/** El Trono de Hjaldur: el rey cae de rodillas, el hacha se parte, muertos en columnas de hielo detrás. */
function a4p1(t: Toma) {
  const F = t.capa('fondo', 0, 0.25, 'normal', { opaca: true });
  cielo(F, [[0, '#03060c'], [0.5, '#0b1624'], [1, '#03050a']]);
  // la sala de hielo: muro de bloques azules, el trono de esquirlas en el centro
  const muro = M(), juntas = M(); rellenar(muro, [[-10, -10], [CW + 10, -10], [CW + 10, 640], [-10, 640]]); sillares(juntas, -10, -10, CW + 10, 640, 64, 128, 401);
  pintarConRuido(F, muro, [0.07, 0.11, 0.16], 0.35, 30, 402); pintar(F, juntas, [0.01, 0.02, 0.04], 0.7);
  const tr = M(), r = rng(403);
  for (let k = 0; k < 15; k++) { const x = CX + (k - 7) * 30, h = 260 + (7 - Math.abs(k - 7)) * 34 + r() * 50; rellenar(tr, [[x - 20, 600], [x - 8, 600 - h], [x + 4, 600 - h - 30], [x + 18, 600]]); }
  rellenar(tr, [[CX - 170, 640], [CX - 160, 520], [CX + 160, 520], [CX + 170, 640]]);
  pintarConRuido(F, tr, [0.16, 0.26, 0.36], 0.3, 12, 404); contraluz(F, tr, -2, -1, HIELO, 0.9);
  for (const [x, hh, ww] of [[200, 520, 120], [430, 420, 96], [980, 430, 96], [1210, 540, 124]] as [number, number, number][]) columnaHielo(F, x, 650, hh, ww, x);
  losas(F, 640, CH, [0.12, 0.18, 0.24], 405, [CX, 640], 7);
  sombraVertical(F, 0, 640, 0.4, false);
  alumbrar(F, CX, 200, 800, [0.6, 0.9, 1.4], 0.9, 0.9);
  granoOpaco(F, 0.02, 406);
  const Lu = t.capa('luz_alta', 1, 0.3, 'sumar', { anim: { tipo: 'latir', alfa: [0.7, 1], periodo_s: 4 } });
  haces(Lu, CX, -80, Math.PI / 2, 0.3, 900, [0.5, 0.75, 1], 0.6, 407, 18);
  // el rey cae de rodillas
  const R = t.capa('rey', 2, 0.6), RL = t.capa('rey_luz', 3, 0.6, 'sumar', { anim: { tipo: 'titilar', alfa: [0.6, 1], hz: 5 } });
  const luzR: Luz = { amb: [0.45, 0.5, 0.62], desat: 0.3, clave: { dir: [-0.5, -1], k: 0.8, c: [0.9, 1, 1.25] }, bordes: [{ dx: -1, dy: -1, c: [0.7, 0.9, 1.2], k: 1.1, ancho: 1.5 }, { dx: 1, dy: 0, c: [0.8, 0.2, 0.15], k: 0.4 }], emite: (c) => (c[2] > 0.75 && c[2] > c[0] * 1.3 ? sat((c[2] - 0.7) * 3) : 0), cEmite: [0.6, 0.85, 1] };
  const rey = figura(R, RL, modelo('jefe_rey_escarcha_morir', 's', 5, 3.2), CX, 720, 470, luzR);
  const rb = cajaPose(rey, CX, 720), rh = rb.y1 - rb.y0;
  const sg = M(); chorreado(sg, CX - 6, rb.y0 + rh * 0.3, 40, rh * 0.45, 408); const mr = mascaraPose(CW, CH, rey, CX, 720); for (let i = 0; i < CW * CH; i++) sg.d[i] *= mr.d[i] > 0.3 ? 1 : 0;
  charco(sg, CX + 20, 728, 170, 22, 409); salpicar(sg, CX + 80, 724, 220, 0.1, 40, 410);
  pintarSangre(R, sg, [1, 0.6, 0.6], 0.95, 0.6);
  // el hacha de hielo que se parte: esquirlas que vuelan y grietas en el piso
  const es = M(); for (let k = 0; k < 26; k++) { const x = CX + 120 + r() * 240, y = 520 + r() * 180, l = 6 + r() * 22, a = r() * Math.PI; rellenar(es, [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l], [x + Math.cos(a + 0.3) * l * 0.4, y + Math.sin(a + 0.3) * l * 0.4 + 4]]); }
  pintar(R, es, [0.45, 0.65, 0.85]); brillo(RL, desenfocada(es, 4), HIELO, 0.6);
  const gr = M(); grietas(gr, CX + 60, 730, 200, 7, 411, 2.4, 0.25); pintar(R, gr, [0.02, 0.04, 0.07], 0.9); brillo(RL, desenfocada(gr, 3), [0.4, 0.7, 1], 0.4);
  // adelante: carámbanos que cuelgan y un muerto congelado
  const Fr = t.capa('frente', 5, 1);
  const ca = M(); for (let x = -10; x < CW + 10; x += 14 + r() * 24) { const l = 30 + r() * 140 * (Math.abs(x - CX) / CX + 0.2); rellenar(ca, [[x - 8, -10], [x + 8, -10], [x + 1, l]]); }
  pintarConRuido(Fr, ca, [0.1, 0.16, 0.24], 0.3, 8, 412); contraluz(Fr, ca, -1, 2, HIELO, 0.6);
  const luzF: Luz = { amb: [0.3, 0.36, 0.46], desat: 0.5, clave: { dir: [-1, -1], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: HIELO, k: 0.8 }] };
  figura(Fr, undefined, modelo('ahg_marino_ahogado', 'tendido', 0, 3), 230, 790, 180, luzF);
  const s2 = M(); charco(s2, 260, 790, 130, 16, 413); pintarSangre(Fr, s2, [1, 0.6, 0.6], 0.9, 0.5);
  t.particulas = 'nieve';
  t.efecto({ tipo: 'sprite', hoja: 'goteo_sangre', en: [[CX + 4, rb.y0 + rh * 0.55, 1.2]], mezcla: 'normal', despues_de: 'rey_luz', paralaje: 0.6 });
}

/** El Fortín de Vel al amanecer: Vigdis en la puerta con su farol (viva) o su tumba junto a la muralla (muerta). */
function a4p2(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  const sx = 1000, sy = 420, luzX = (x: number) => 0.3 + Math.exp(-(((x - sx) / 380) ** 2));
  cielo(C, [[0, '#0a0e18'], [0.35, '#2a3046'], [0.52, '#7a6070'], [0.58, '#c08a70'], [0.62, '#5a5060'], [1, '#141820']], {
    fuente: [sx, sy, 520, [1, 0.7, 0.5], 0.5],
    nubes: [{ y0: 40, y1: 400, seed: 421, escala: 200, cubre: 0.5, estira: 3, masa: [0.1, 0.1, 0.14], panza: [0.9, 0.55, 0.45], filo: [0.5, 0.5, 0.6], luzX }],
  });
  lomas(C, 450, 90, 422, [0.22, 0.24, 0.32], { escala: 170, picos: 0.85, filo: [1, 0.75, 0.6], kFilo: 0.7, dx: 2, dy: 0 });
  const nie = M(); rellenar(nie, perfil(CW, CH, 450, 90, 422, { escala: 170, picos: 0.85 })); for (let i = 0; i < CW * CH; i++) { const y = Math.floor(i / CW); nie.d[i] *= suave(0.55, 0.68, fbm((i % CW) / 14, y / 40, 4, 423)) * (1 - suave(380, 470, y)); }
  pintar(C, nie, [0.75, 0.72, 0.8], 0.6);
  niebla(C, 400, 540, [0.45, 0.42, 0.5], 0.6, 424, 200);
  granoOpaco(C, 0.015, 425);
  // el fortín: empalizada, torres de piedra con techos de nieve, ventanas encendidas
  const Fo = t.capa('fortin', 1, 0.35), FoL = t.capa('fortin_luz', 2, 0.35, 'sumar', { anim: { tipo: 'titilar', alfa: [0.75, 1], hz: 4 } });
  const fo = M(), ven = M(), techo = M();
  rellenar(fo, perfil(CW, CH, 560, 14, 426, { escala: 300 }));
  for (let x = 300; x < 1120; x += 16) rellenar(fo, [[x, 560], [x, 470 + (x % 3) * 4], [x + 7, 460 + (x % 3) * 4], [x + 14, 470 + (x % 3) * 4], [x + 14, 560]]);
  for (const [x, w, h] of [[340, 70, 150], [700, 110, 210], [1080, 76, 160]] as [number, number, number][]) {
    rellenar(fo, [[x - w / 2, 562], [x - w / 2, 560 - h], [x + w / 2, 560 - h], [x + w / 2, 562]]);
    rellenar(techo, [[x - w / 2 - 12, 560 - h + 4], [x, 560 - h - w * 0.7], [x + w / 2 + 12, 560 - h + 4]]);
    for (let k = 0; k < 2; k++) rellenar(ven, [[x - 6, 560 - h * (0.45 + k * 0.28)], [x + 6, 560 - h * (0.45 + k * 0.28)], [x + 6, 560 - h * (0.35 + k * 0.28)], [x - 6, 560 - h * (0.35 + k * 0.28)]]);
  }
  rellenar(ven, [[690, 560], [690, 520], [700, 510], [710, 520], [710, 560]]);
  pintarConRuido(Fo, fo, [0.06, 0.06, 0.08], 0.3, 20, 427); pintar(Fo, techo, [0.55, 0.55, 0.65]); contraluz(Fo, fo, 2, 0, [1, 0.7, 0.5], 0.6);
  pintar(Fo, ven, [0.9, 0.55, 0.25]); brillo(FoL, ven, [1, 0.6, 0.25], 1); brillo(FoL, desenfocada(ven, 8), [1, 0.5, 0.2], 1.2);
  niebla(Fo, 520, 610, [0.5, 0.45, 0.52], 0.4, 428, 200);
  t.efecto({ tipo: 'sprite', hoja: 'humo', en: [[700, 330, 1.2], [340, 400, 0.9], [1080, 390, 0.9]], mezcla: 'normal', despues_de: 'fortin_luz', paralaje: 0.35, alfa: 0.55 });
  // la nieve de adelante con las huellas que van a la puerta
  const N = t.capa('nieve', 3, 0.7);
  const nv = M(); rellenar(nv, suelo(640, 40, 429)); pintarConRuido(N, nv, [0.5, 0.52, 0.64], 0.12, 60, 430);
  const so = M(); for (let i = 0; i < CW * CH; i++) so.d[i] = nv.d[i] * suave(0.4, 0.7, fbm((i % CW) / 140, Math.floor(i / CW) / 30, 4, 431)) * 0.5; pintar(N, so, [0.15, 0.17, 0.28], 0.8);
  contraluz(N, nv, -2, -2, [1, 0.8, 0.65], 0.6);
  const hu = M(); for (let k = 0; k < 20; k++) { const u = k / 19, x = 700 + Math.sin(u * 4) * 60 - u * 0 + (k % 2 ? 9 : -9) * (1 - u), y = 790 - u * 220, s2 = 9 * (1 - u * 0.6); rellenar(hu, [[x - s2 * 0.5, y], [x - s2 * 0.4, y - s2 * 1.6], [x + s2 * 0.4, y - s2 * 1.6], [x + s2 * 0.5, y]]); }
  pintar(N, hu, [0.18, 0.2, 0.3], 0.7);
  const sgN = M(); for (let k = 0; k < 7; k++) disco(sgN, 700 + Math.sin(k) * 50, 780 - k * 30, 3 + (k % 3)); pintar(N, sgN, [0.35, 0.02, 0.03], 0.8);
  const pinos = M(); for (const [x, h] of [[60, 460], [170, 340], [1300, 420], [1380, 320]] as [number, number][]) pino(pinos, x, 790, h, x);
  pintar(N, pinos, [0.02, 0.025, 0.035]); contraluz(N, pinos, 2, 0, [1, 0.75, 0.55], 0.6);
  // VIVA: Vigdis en la puerta, con el farol encendido
  const V = t.capa('vigdis', 4, 0.7, 'normal', { soloSi: 'vigdis_viva' }), VL = t.capa('vigdis_farol', 5, 0.7, 'sumar', { soloSi: 'vigdis_viva', anim: { tipo: 'titilar', alfa: [0.75, 1], hz: 5 } });
  const luzV: Luz = { amb: [0.5, 0.48, 0.55], desat: 0.2, clave: { dir: [1, 0], k: 0.7, c: [1.3, 1, 0.8] }, bordes: [{ dx: 1, dy: -1, c: [1, 0.8, 0.6], k: 1 }, { dx: -1, dy: 0, c: [1, 0.55, 0.25], k: 0.6 }] };
  const vg = figura(V, undefined, npc('vigdis', 's', 'quieto', 0, 6), 600, 720, 330, luzV);
  const vb = cajaPose(vg, 600, 720), fx = vb.x0 + 8, fy = vb.y0 + (vb.y1 - vb.y0) * 0.5;
  halo(VL, fx, fy, 150, [1, 0.55, 0.2], 0.7, 1, true); halo(VL, fx, fy, 22, [1, 0.85, 0.5], 1.2, 1, true);
  t.efecto({ tipo: 'sprite', hoja: 'fuego', en: [[fx, fy + 8, 0.18]], mezcla: 'sumar', despues_de: 'vigdis_farol', paralaje: 0.7, soloSi: 'vigdis_viva' });
  // MUERTA: su tumba junto a la muralla: piedras, la cruz con su chal azul y el farol encima
  const T = t.capa('tumba', 4, 0.7, 'normal', { soloSi: 'vigdis_muerta' }), TL = t.capa('tumba_farol', 5, 0.7, 'sumar', { soloSi: 'vigdis_muerta', anim: { tipo: 'titilar', alfa: [0.75, 1], hz: 5 } });
  const tm = M(), chal = M(), r = rng(432);
  for (let k = 0; k < 22; k++) { const a = Math.PI + (k / 21) * Math.PI, x = 600 + Math.cos(a) * 110 * (0.5 + r() * 0.5), y = 728 + Math.sin(a) * 50 * (0.4 + r() * 0.6); rellenar(tm, Array.from({ length: 10 }, (_, j) => { const b = (j / 10) * Math.PI * 2, rr = 12 + r() * 10; return [x + Math.cos(b) * rr, y + Math.sin(b) * rr * 0.7] as P2; })); }
  trazo(tm, 600, 700, 600, 470, 12, 9, 1, 'max', false); trazo(tm, 548, 540, 652, 534, 10, 10, 1, 'max', false);
  rellenar(chal, [[556, 538], [646, 532], [660, 620], [630, 600], [610, 640], [584, 596], [552, 616]]);
  pintarConRuido(T, tm, [0.14, 0.14, 0.17], 0.4, 10, 433); pintar(T, chal, [0.08, 0.14, 0.3]); contraluz(T, tm, 1, -1, [1, 0.75, 0.55], 0.7); contraluz(T, chal, 1, 0, [0.7, 0.75, 1], 0.6);
  const ns = M(); for (let i = 0; i < CW * CH; i++) ns.d[i] = tm.d[i] * suave(0.55, 0.62, fbm((i % CW) / 9, Math.floor(i / CW) / 6, 3, 434)); pintar(T, ns, [0.7, 0.72, 0.82], 0.8);
  halo(TL, 600, 456, 150, [1, 0.55, 0.2], 0.7, 1, true); halo(TL, 600, 456, 20, [1, 0.85, 0.5], 1.2, 1, true);
  const farol = M(); rellenar(farol, [[588, 470], [612, 470], [608, 444], [592, 444]]); pintar(T, farol, [0.04, 0.03, 0.03]);
  t.efecto({ tipo: 'sprite', hoja: 'fuego', en: [[600, 466, 0.18]], mezcla: 'sumar', despues_de: 'tumba_farol', paralaje: 0.7, soloSi: 'vigdis_muerta' });
  t.particulas = 'nieve';
}

/** La Herida al sur, sobre los picos: el cielo abierto como una boca; cuatro brasas vuelan hacia ella. */
function bocaHerida(L: Lamina, LL: Lamina, cx: number, y0: number, y1: number, ancho: number, s: number) {
  const boca = mascara(L.w, L.h), r = rng(s), izq: P2[] = [], der: P2[] = [];
  for (let k = 0; k <= 40; k++) { const u = k / 40, y = y0 + (y1 - y0) * u, a = Math.sin(u * Math.PI) ** 0.8 * ancho, j = (r() - 0.5) * 16 * Math.sin(u * Math.PI); izq.push([cx - a + j + Math.sin(u * 9) * 6, y]); der.push([cx + a + (r() - 0.5) * 16 * Math.sin(u * Math.PI) + Math.sin(u * 7) * 6, y]); }
  rellenar(boca, [...izq, ...der.reverse()]);
  for (let y = Math.max(0, y0); y < Math.min(L.h, y1); y++) for (let x = Math.max(0, Math.floor(cx - ancho * 1.3)); x < Math.min(L.w, cx + ancho * 1.3); x++) {
    const i = y * L.w + x, a = boca.d[i]; if (a <= 0) continue;
    const u = Math.abs(x - cx) / ancho, v = fbm(x / 14, y / 50, 4, s + 1), k = (1 - u) * 0.7 + v * 0.6, j = i * 4;
    const c = mezcla([0.9, 0.2, 0.03], [1.6, 1.1, 0.6], sat(k - 0.2));
    L.d[j] = L.d[j] * (1 - a) + c[0] * a; L.d[j + 1] = L.d[j + 1] * (1 - a) + c[1] * a; L.d[j + 2] = L.d[j + 2] * (1 - a) + c[2] * a;
  }
  const dientes = mascara(L.w, L.h);
  der.reverse();
  for (let k = 2; k < 39; k += 2) for (const lado of [1, -1]) {
    const p = lado > 0 ? izq[k] : der[k], q = lado > 0 ? izq[k + 1] : der[k + 1], l = (8 + r() * 22) * Math.sin((k / 40) * Math.PI) * (ancho / 70);
    rellenar(dientes, [[p[0] - lado * 3, p[1] - 2], [q[0] - lado * 3, q[1] + 2], [p[0] + lado * l, (p[1] + q[1]) / 2 + 3]]);
  }
  pintar(L, dientes, [0.07, 0.015, 0.01]);
  brillo(LL, desenfocada(boca, 22), [1, 0.4, 0.08], 1.2);
  halo(LL, cx, (y0 + y1) / 2, (y1 - y0) * 1.2, [1, 0.3, 0.05], 0.5, 0.9, true);
}
function a4p3(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  const cx = 760, luzX = (x: number) => 0.15 + 1.5 * Math.exp(-(((x - cx) / 300) ** 2));
  cielo(C, [[0, '#050102'], [0.4, '#1c0503'], [0.62, '#4a0e04'], [0.7, '#1a0503'], [1, '#050101']], {
    fuente: [cx, 300, 560, [0.9, 0.25, 0.05], 0.8],
    nubes: [{ y0: -20, y1: 520, seed: 441, escala: 170, cubre: 0.6, masa: [0.05, 0.015, 0.012], panza: [1, 0.35, 0.08], filo: [0.5, 0.15, 0.05], luzX }],
  });
  const BL = t.capa('herida_luz', 2, 0.08, 'sumar', { anim: { tipo: 'latir', alfa: [0.7, 1], periodo_s: 2.4, notas: 'la boca respira' } });
  bocaHerida(C, BL, cx, 120, 460, 80, 442);
  granoOpaco(C, 0.015, 443);
  const E = t.capa('brasas', 1, 0.1, 'sumar', { anim: { tipo: 'titilar', alfa: [0.8, 1], hz: 3 } });
  for (const [x0, y0, cv] of [[80, 120, 0.6], [1380, 90, -0.5], [200, 520, 0.3], [1300, 480, -0.2]] as [number, number, number][]) {
    const pts: P2[] = Array.from({ length: 30 }, (_, k) => { const u = k / 29; return [x0 + (cx - x0) * u * 0.85, y0 + (290 - y0) * u * 0.85 - Math.sin(u * Math.PI) * 120 * cv] as P2; });
    estela(E, pts, 4, BRASA, 1);
  }
  // los picos de Hrimgard a contraluz, encendidos de rojo
  const P = t.capa('picos', 3, 0.3);
  lomas(P, 560, 120, 444, [0.05, 0.03, 0.035], { escala: 140, picos: 0.9, filo: [1, 0.3, 0.08], kFilo: 1, dx: 0, dy: 3 });
  const nvp = M(); rellenar(nvp, perfil(CW, CH, 560, 120, 444, { escala: 140, picos: 0.9 })); for (let i = 0; i < CW * CH; i++) nvp.d[i] *= suave(0.55, 0.65, fbm((i % CW) / 10, Math.floor(i / CW) / 30, 4, 445)) * 0.6;
  pintar(P, nvp, [0.35, 0.2, 0.22], 0.7);
  niebla(P, 520, 660, [0.25, 0.08, 0.06], 0.6, 446, 200);
  // el héroe en el borde de la roca, de espaldas, mirando la Herida
  const H = t.capa('heroe', 4, 0.75), HL = t.capa('marca', 5, 0.75, 'sumar', { anim: { tipo: 'latir', alfa: [0.4, 1], periodo_s: 0.9, notas: 'la Marca late más rápido' } });
  const roca = M(); rellenar(roca, [[-10, CH + 5], [-10, 640], [200, 610], [420, 600], [620, 630], [760, 700], [820, CH + 5]]);
  pintarConRuido(H, roca, [0.04, 0.025, 0.025], 0.4, 30, 447); contraluz(H, roca, 0, 3, [1, 0.3, 0.08], 0.9);
  const he = figura(H, undefined, heroe('n', 'quieto', 0, 6), 400, 612, 330, { amb: [0.28, 0.2, 0.2], desat: 0.3, clave: { dir: [0.5, -1], k: 0.6 }, bordes: [{ dx: 1, dy: -1, c: [1.2, 0.4, 0.1], k: 1.4, ancho: 1.5 }, { dx: -1, dy: 0, c: [1, 0.3, 0.08], k: 0.6 }] });
  const hb = cajaPose(he, 400, 612); halo(HL, hb.x1 - 14, hb.y0 + (hb.y1 - hb.y0) * 0.5, 40, [1, 0.3, 0.08], 1, 1, true);
  figura(H, undefined, modelo('nie2_piedra_runica', 'sangre', 0, 3), 1180, 800, 300, { amb: [0.25, 0.18, 0.18], desat: 0.4, bordes: [{ dx: -1, dy: -1, c: [1, 0.3, 0.08], k: 1.2 }] });
  t.particulas = 'ceniza';
}

// ================================================================== ACTO 5: LA HERIDA
/** Caverna de fragua: obsidiana con grietas de lava, cascadas de lava y cadenas. */
function fragua(F: Lamina, s: number, k = 1) {
  cielo(F, [[0, '#040101'], [0.5, '#160403'], [1, '#050101']]);
  const muro = M(); rellenar(muro, [[-10, -10], [CW + 10, -10], [CW + 10, 660], [-10, 660]]);
  pintarConRuido(F, muro, [0.06, 0.035, 0.035], 0.5, 40, s);
  const gr = M(); for (let j = 0; j < 14; j++) grietas(gr, (j / 13) * CW, 60 + (j % 4) * 140, 160, 4, s + j, 2.6);
  for (let i = 0; i < CW * CH; i++) gr.d[i] *= muro.d[i];
  pintar(F, gr, [1.2 * k, 0.4 * k, 0.08 * k], 1);
  const la = M(); for (const x of [180, 1230]) polilinea(la, Array.from({ length: 16 }, (_, j) => [x + Math.sin(j * 0.7) * 10, -10 + j * 44] as P2), 22, 46);
  for (let i = 0; i < CW * CH; i++) la.d[i] *= 0.7 + 0.5 * fbm((i % CW) / 12, Math.floor(i / CW) / 40, 3, s + 50);
  pintar(F, la, [1.4 * k, 0.55 * k, 0.12 * k], 1);
  const cad = M(); for (const [x0, x1] of [[300, 620], [800, 1120]]) polilinea(cad, Array.from({ length: 20 }, (_, j) => { const u = j / 19; return [x0 + (x1 - x0) * u, -10 + Math.sin(u * Math.PI) * 220] as P2; }), 7, 7);
  pintar(F, cad, [0.03, 0.015, 0.015]);
  losas(F, 660, CH, [0.08, 0.03, 0.025], s + 3, [CX, 660], 6);
  sombraVertical(F, 0, 660, 0.4, false);
  alumbrar(F, CX, 700, 760, [1.8, 0.6, 0.2], 1.1, 0.7);
}
function a5p1(t: Toma) {
  const F = t.capa('fondo', 0, 0.25, 'normal', { opaca: true });
  fragua(F, 501); granoOpaco(F, 0.02, 502);
  const FL = t.capa('lava_luz', 1, 0.25, 'sumar', { anim: { tipo: 'titilar', alfa: [0.75, 1], hz: 3 } });
  halo(FL, 180, 300, 260, [1, 0.3, 0.05], 0.5, 1.6, true); halo(FL, 1230, 300, 260, [1, 0.3, 0.05], 0.5, 1.6, true);
  // Ozmaren revienta en fuego
  const O = t.capa('ozmaren', 2, 0.55), OL = t.capa('ozmaren_luz', 3, 0.55, 'sumar', { anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 7 } });
  const luzO: Luz = { amb: [0.5, 0.35, 0.3], desat: 0.15, clave: { dir: [0, -1], k: 0.5 }, bordes: [{ dx: 0, dy: -1, c: [1.3, 0.6, 0.2], k: 1.2, ancho: 1.5 }, { dx: -1, dy: 0, c: [1, 0.3, 0.06], k: 0.6 }], abajo: { c: [1, 0.35, 0.08], k: 0.8 }, emite: emiteFuego, cEmite: [1, 0.5, 0.12], kEmite: 1.6 };
  const oz = figura(O, OL, modelo('jefe_ozmaren_morir', 's', 2, 2.4), CX, 720, 600, luzO);
  const ob = cajaPose(oz, CX, 720), oh = ob.y1 - ob.y0;
  const pecho: P2 = [CX, ob.y0 + oh * 0.48];
  haces(OL, pecho[0], pecho[1], -Math.PI / 2, 1.2, 700, [1, 0.45, 0.12], 0.45, 503, 24);
  halo(OL, pecho[0], pecho[1], 220, [1, 0.5, 0.15], 0.8, 1, true);
  t.rayos('rayos', 3.5, 0.5, 3, pecho[0], pecho[1], 0.6, 0.5);
  // el lago de lava de adelante y los quemados
  const Fr = t.capa('frente', 5, 1), FrL = t.capa('frente_luz', 6, 1, 'sumar', { anim: { tipo: 'latir', alfa: [0.7, 1], periodo_s: 1.6 } });
  const lago = M(); charco(lago, CX, 800, 620, 70, 504, 0);
  for (let i = 0; i < CW * CH; i++) { const v = lago.d[i]; if (v <= 0) continue; const x = i % CW, y = Math.floor(i / CW), k = 0.6 + 0.6 * fbm(x / 26, y / 7, 4, 505), j = i * 4; FrL.d[j] += 1 * k * v; FrL.d[j + 1] += 0.38 * k * k * v; FrL.d[j + 2] += 0.06 * v; }
  const luzF: Luz = { amb: [0.22, 0.14, 0.12], desat: 0.4, clave: { dir: [0, 1], k: 0.6 }, bordes: [{ dx: 1, dy: 0, c: BRASA, k: 1 }, { dx: 0, dy: 1, c: [1, 0.3, 0.06], k: 0.6 }] };
  figura(Fr, undefined, modelo('hor_pila_cadaveres', 'quemada', 0, 3), 160, 820, 320, luzF);
  figura(Fr, undefined, modelo('inf2_empalado', 'craneos', 0, 3), 1270, 830, 470, { ...luzF, bordes: [{ dx: -1, dy: 0, c: BRASA, k: 1 }] });
  t.particulas = 'brasas';
  t.efecto({ tipo: 'sprite', hoja: 'fuego', en: [[CX - 200, 730, 1.2], [CX + 230, 740, 1.4], [CX - 40, 760, 1], [180, 690, 0.9], [1240, 700, 0.9]], mezcla: 'sumar', despues_de: 'ozmaren_luz', paralaje: 0.55 });
}

/** La elección: el héroe sobre la ceniza de Ozmaren con la Brasa en el puño (se apaga o entra en él). */
function a5p2(t: Toma) {
  const F = t.capa('fondo', 0, 0.25, 'normal', { opaca: true });
  fragua(F, 511, 0.55); granoOpaco(F, 0.02, 512);
  const O = t.capa('ceniza_ozmaren', 1, 0.4);
  figura(O, undefined, modelo('jefe_ozmaren_morir', 's', 7, 2.2), CX, 620, 380, { amb: [0.22, 0.2, 0.2], desat: 0.85, bordes: [{ dx: 0, dy: -1, c: [0.9, 0.35, 0.12], k: 0.7 }], niebla: { c: [0.08, 0.04, 0.04], k: 0.35 } });
  niebla(O, 520, 700, [0.12, 0.06, 0.05], 0.5, 513, 200);
  // el héroe de frente, con la mano cerrada
  const luzBase = (fuego: boolean): Luz => fuego
    ? { amb: [0.5, 0.3, 0.26], desat: 0.2, clave: { dir: [0.3, 1], k: 0.7, c: [1.4, 0.8, 0.6] }, bordes: [{ dx: 0, dy: 1, c: [1.3, 0.4, 0.1], k: 1.3, ancho: 1.5 }, { dx: -1, dy: -1, c: [1, 0.3, 0.08], k: 0.8 }], abajo: { c: [1, 0.3, 0.06], k: 0.9 } }
    : { amb: [0.4, 0.42, 0.48], desat: 0.7, clave: { dir: [-0.5, -1], k: 0.6, c: [0.9, 0.95, 1.1] }, bordes: [{ dx: -1, dy: -1, c: [0.6, 0.68, 0.8], k: 1, ancho: 1.5 }, { dx: 1, dy: 0, c: [0.4, 0.42, 0.5], k: 0.4 }] };
  for (const [flag, fuego] of [['brasa_destruir', false], ['brasa_absorber', true]] as [string, boolean][]) {
    const H = t.capa(fuego ? 'heroe_fuego' : 'heroe_gris', 2, 0.7, 'normal', { soloSi: flag });
    const HL = t.capa(fuego ? 'brasa_viva' : 'brasa_apagada', 3, 0.7, 'sumar', { soloSi: flag, anim: fuego ? { tipo: 'latir', alfa: [0.6, 1], periodo_s: 0.8 } : { tipo: 'latir', alfa: [0.3, 0.6], periodo_s: 3 } });
    const he = figura(H, undefined, heroe('s', 'quieto', 0, 6), CX + 40, 800, 560, luzBase(fuego));
    const hb = cajaPose(he, CX + 40, 800), mano: P2 = [hb.x0 + (hb.x1 - hb.x0) * 0.18, hb.y0 + (hb.y1 - hb.y0) * 0.5];
    if (fuego) {
      // venas de fuego por todo el cuerpo y los ojos encendidos
      const ve = M(), mh = mascaraPose(CW, CH, he, CX + 40, 800);
      grietas(ve, mano[0], mano[1], 260, 6, 514, 2.2, 1.2); grietas(ve, (hb.x0 + hb.x1) / 2, hb.y0 + (hb.y1 - hb.y0) * 0.35, 180, 6, 515, 1.8);
      for (let i = 0; i < CW * CH; i++) ve.d[i] *= mh.d[i];
      pintar(H, ve, [1, 0.5, 0.15], 1); brillo(HL, desenfocada(ve, 5), [1, 0.35, 0.08], 1.1); brillo(HL, ve, [1, 0.7, 0.3], 0.8);
      halo(HL, mano[0], mano[1], 120, [1, 0.4, 0.08], 1.1, 1, true); halo(HL, mano[0], mano[1], 18, [1, 0.9, 0.6], 1.6, 1, true);
      halo(HL, (hb.x0 + hb.x1) / 2, hb.y0 + (hb.y1 - hb.y0) * 0.12, 30, [1, 0.5, 0.1], 0.9, 1, true);
      halo(HL, (hb.x0 + hb.x1) / 2, hb.y1, 260, [0.9, 0.2, 0.04], 0.5, 0.3, true);
    } else {
      halo(HL, mano[0], mano[1], 60, [0.6, 0.62, 0.7], 0.5, 1, true);
      t.efecto({ tipo: 'sprite', hoja: 'humo', en: [[mano[0], mano[1] - 40, 0.8], [mano[0] + 10, mano[1] - 100, 1.1]], mezcla: 'normal', despues_de: 'brasa_apagada', paralaje: 0.7, alfa: 0.6, soloSi: flag });
    }
  }
  t.particulas = 'ceniza';
}

/** El mar del norte se parte en dos bajo un rayo; agujas de una ciudad salen del fondo con luz verde. */
function a5p3(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  cielo(C, [[0, '#020406'], [0.4, '#0a1418'], [0.55, '#16262a'], [1, '#030607']], {
    nubes: [{ y0: -30, y1: 400, seed: 531, escala: 210, cubre: 0.7, masa: [0.035, 0.05, 0.055], panza: [0.2, 0.45, 0.38], filo: [0.25, 0.3, 0.32], luzX: (x) => 0.2 + Math.exp(-(((x - CX) / 260) ** 2)) }],
  });
  const mar = 470, gx = CX;
  // el mar con la grieta: dos paredes de agua que se abren
  const agua = M(); for (let y = mar; y < CH; y++) for (let x = 0; x < CW; x++) agua.d[y * CW + x] = 1;
  reflejo(C, mar, [0.02, 0.04, 0.045], 0.45, 532, agua);
  granoOpaco(C, 0.015, 533);
  const R = t.capa('relampago', 1, 0.06, 'sumar', { anim: { tipo: 'latir', alfa: [0, 1], periodo_s: 3.1, notas: 'un fogonazo por ciclo; acompaña la sacudida' } });
  const rm = M(); for (const tr of rayo(gx + 60, 0, gx + 10, mar - 40, rng(534), 0.3, 4)) polilinea(rm, tr.pts, 2.4 * tr.w, 1 * tr.w);
  brillo(R, rm, [0.85, 0.95, 1], 1.2); brillo(R, desenfocada(rm, 10), [0.4, 0.6, 0.8], 1.2); halo(R, gx, 200, 500, [0.3, 0.45, 0.5], 0.4, 0.8, true);
  const G = t.capa('grieta', 2, 0.3), GL = t.capa('grieta_luz', 3, 0.3, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 2.2 } });
  const hueco = M(); rellenar(hueco, [[gx - 40, mar + 2], [gx + 40, mar + 2], [gx + 200, CH + 5], [gx - 200, CH + 5]]);
  pintar(G, hueco, [0.01, 0.03, 0.03]);
  for (const lado of [-1, 1]) {
    const pared = M(); rellenar(pared, [[gx + lado * 40, mar - 6], [gx + lado * 70, mar - 60], [gx + lado * 130, mar - 50], [gx + lado * 240, mar + 10], [gx + lado * 360, CH + 5], [gx + lado * 200, CH + 5]]);
    for (let y = mar - 70; y < CH; y++) for (let x = 0; x < CW; x++) { const i = y * CW + x; if (pared.d[i] <= 0) continue; pared.d[i] *= 0.75 + 0.25 * fbm(x / 8, y / 40, 4, 535 + lado); }
    pintarConRuido(G, pared, [0.03, 0.08, 0.08], 0.4, 16, 536 + lado); contraluz(G, pared, -lado * 3, 0, MAR, 0.9); contraluz(G, pared, 0, -3, [0.75, 0.9, 0.9], 0.8);
  }
  // las agujas que suben
  const ag = M(); for (const [x, w, h] of [[gx - 60, 18, 170], [gx + 10, 26, 240], [gx + 80, 16, 140], [gx - 120, 12, 90]] as [number, number, number][]) aguja(ag, x, mar + 60, w, h);
  for (let y = mar + 30; y < CH; y++) for (let x = 0; x < CW; x++) ag.d[y * CW + x] *= hueco.d[y * CW + x];
  pintar(G, ag, [0.03, 0.06, 0.06]); contraluz(G, ag, 0, 2, MAR, 1);
  const vg = M(); for (const [x, y] of [[gx + 10, mar - 90], [gx - 60, mar - 30], [gx + 80, mar - 10], [gx + 10, mar - 20]] as P2[]) rellenar(vg, [[x - 3, y + 12], [x - 3, y], [x, y - 5], [x + 3, y], [x + 3, y + 12]]);
  brillo(GL, vg, MAR, 1.3); brillo(GL, desenfocada(hueco, 30), [0.1, 0.5, 0.4], 0.5); brillo(GL, desenfocada(vg, 8), MAR, 1.2);
  // adelante: la costa de piedra con un ahogado
  const Fr = t.capa('frente', 5, 1);
  const co = M(); rellenar(co, [[-10, CH + 5], [-10, 660], [160, 640], [320, 690], [430, 760], [470, CH + 5]]); rellenar(co, [[1000, CH + 5], [1100, 720], [1260, 650], [1420, 630], [1420, CH + 5]]);
  pintarConRuido(Fr, co, [0.03, 0.04, 0.045], 0.4, 20, 537); contraluz(Fr, co, 0, -3, [0.5, 0.75, 0.7], 0.6);
  figura(Fr, undefined, modelo('ahg_marino_ahogado', 'contra_ancla', 0, 3), 1200, 690, 220, { amb: [0.22, 0.28, 0.28], desat: 0.5, bordes: [{ dx: -1, dy: -1, c: [0.5, 0.9, 0.8], k: 0.9 }] });
  t.particulas = 'lluvia';
}

/** La catedral ahogada (máscaras): cuerpo inclinado, dos torres con campanario y rosetón. Devuelve las ventanas. */
function catedralAhogada(L: Lamina, cx: number, mar: number, s: number, inc: number): { cuerpo: Mascara; ven: Mascara } {
  const gi = (pts: P2[]) => pts.map(([x, y]) => { const c = Math.cos(inc), sn = Math.sin(inc); return [cx + (x - cx) * c - (y - mar) * sn, mar + (x - cx) * sn + (y - mar) * c] as P2; });
  const cat = mascara(L.w, L.h), ven = mascara(L.w, L.h);
  rellenar(cat, gi([[cx - 170 * s, mar + 10], [cx - 170 * s, mar - 140 * s], [cx - 120 * s, mar - 190 * s], [cx + 120 * s, mar - 190 * s], [cx + 170 * s, mar - 140 * s], [cx + 170 * s, mar + 10]]));
  for (const [dx, hh] of [[-120, 300], [110, 260]] as [number, number][]) {
    const tw = 62 * s, x = cx + dx * s, h = hh * s;
    rellenar(cat, gi([[x - tw / 2, mar], [x - tw / 2, mar - h], [x - tw * 0.6, mar - h - 6], [x, mar - h - 110 * s], [x + tw * 0.6, mar - h - 6], [x + tw / 2, mar - h], [x + tw / 2, mar]]));
    rellenar(ven, gi([[x - 16 * s, mar - h + 60 * s], [x - 16 * s, mar - h + 20 * s], [x, mar - h + 6 * s], [x + 16 * s, mar - h + 20 * s], [x + 16 * s, mar - h + 60 * s]]));
    for (let k = 0; k < 3; k++) rellenar(ven, gi([[x - 7 * s, mar - h * (0.3 + k * 0.17)], [x - 7 * s, mar - h * (0.3 + k * 0.17) - 26 * s], [x, mar - h * (0.3 + k * 0.17) - 32 * s], [x + 7 * s, mar - h * (0.3 + k * 0.17) - 26 * s], [x + 7 * s, mar - h * (0.3 + k * 0.17)]]));
  }
  for (let k = 0; k < 5; k++) { const x = cx + (-100 + k * 50) * s; rellenar(ven, gi([[x - 9 * s, mar - 60 * s], [x - 9 * s, mar - 120 * s], [x, mar - 134 * s], [x + 9 * s, mar - 120 * s], [x + 9 * s, mar - 60 * s]])); }
  disco(ven, cx + 4 * s, mar - 155 * s, 22 * s);
  pintarConRuido(L, cat, [0.05, 0.075, 0.075], 0.35, 14, 601);
  const al = mascara(L.w, L.h); for (let i = 0; i < L.w * L.h; i++) al.d[i] = cat.d[i] * suave(0.6, 0.7, fbm((i % L.w) / 10, Math.floor(i / L.w) / 30, 3, 602)); pintar(L, al, [0.04, 0.12, 0.08], 0.8);
  contraluz(L, cat, -3, 0, [0.35, 0.55, 0.5], 0.8);
  return { cuerpo: cat, ven };
}
function a5p4(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  cielo(C, [[0, '#040707'], [0.35, '#0f1a19'], [0.58, '#2a3a36'], [0.63, '#3a4a44'], [1, '#060909']], {
    fuente: [480, 360, 520, [0.4, 0.55, 0.5], 0.4],
    nubes: [{ y0: -30, y1: 420, seed: 541, escala: 210, cubre: 0.66, masa: [0.04, 0.055, 0.055], panza: [0.25, 0.45, 0.4], filo: [0.25, 0.3, 0.3], luzX: (x) => 0.2 + Math.exp(-(((x - 480) / 260) ** 2)) }],
  });
  const mar = 500;
  const lejos = M(); for (const [x, w, h] of [[90, 14, 90], [170, 10, 60], [1200, 12, 70], [1260, 16, 104]] as [number, number, number][]) aguja(lejos, x, mar + 2, w, h);
  ruina(lejos, null, 120, mar + 2, 80, 30, 5); ruina(lejos, null, 1170, mar + 2, 90, 34, 7);
  pintar(C, lejos, [0.075, 0.11, 0.105]); contraluz(C, lejos, -2, 0, [0.2, 0.35, 0.32], 0.5);
  granoOpaco(C, 0.015, 542);
  const Ca = t.capa('catedral', 1, 0.25), CaL = t.capa('catedral_luz', 2, 0.25, 'sumar', { anim: { tipo: 'latir', alfa: [0.55, 1], periodo_s: 2.6, notas: 'cada pico, un golpe de campana' } });
  const ca = catedralAhogada(Ca, 560, mar, 1.15, -0.06);
  for (let i = 0; i < CW * CH; i++) ca.ven.d[i] *= 0.55 + 0.45 * fbm((i % CW) / 5, Math.floor(i / CW) / 5, 2, 543);
  brillo(CaL, ca.ven, [0.2, 0.75, 0.55], 0.9); brillo(CaL, desenfocada(ca.ven, 14), [0.12, 0.6, 0.45], 1.2);
  // el agua que todavía le chorrea por los muros
  const ch = M(); for (let k = 0; k < 30; k++) chorreado(ch, 400 + k * 11, mar - 180 - (k % 5) * 30, 6, 160, 544 + k); for (let i = 0; i < CW * CH; i++) ch.d[i] *= ca.cuerpo.d[i]; pintar(Ca, ch, [0.15, 0.25, 0.24], 0.5);
  const ag = M(); for (let y = mar; y < CH; y++) for (let x = 0; x < CW; x++) ag.d[y * CW + x] = 1;
  const plano = t.plano(1); Ca.d.set(plano.d);
  reflejo(Ca, mar, [0.03, 0.06, 0.06], 0.5, 545, ag);
  for (let i = 0; i < CW * CH; i++) if (Math.floor(i / CW) < mar && ca.cuerpo.d[i] <= 0) { Ca.d[i * 4] = Ca.d[i * 4 + 1] = Ca.d[i * 4 + 2] = Ca.d[i * 4 + 3] = 0; }
  const Bl = t.capa('brillos', 3, 0.25, 'sumar', { anim: { tipo: 'titilar', alfa: [0.5, 1], hz: 2 } }); brillosAgua(Bl, mar + 4, CH, 560, 120, [0.3, 0.8, 0.6], 0.4, 546);
  // el barco varado y escorado en las rocas de la derecha
  const B = t.capa('barco', 4, 0.55);
  const bc = M(); const tmp = M(); barco(tmp, 1080, 640, 420, 547);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const a = -0.14, dx = x - 1080, dy = y - 640, sx = Math.round(1080 + dx * Math.cos(a) - dy * Math.sin(a)), sy = Math.round(640 + dx * Math.sin(a) + dy * Math.cos(a)); if (sx >= 0 && sy >= 0 && sx < CW && sy < CH) bc.d[y * CW + x] = tmp.d[sy * CW + sx]; }
  rellenar(bc, perfil(CW, CH, 690, 30, 548, { escala: 120 }).map(([x, y]) => [x, x < 820 ? CH + 5 : y] as P2));
  pintar(B, bc, [0.015, 0.02, 0.022]); contraluz(B, bc, -2, -1, [0.4, 0.6, 0.55], 0.8);
  const Fr = t.capa('frente', 5, 1);
  const pl = M(); rellenar(pl, suelo(770, 30, 549)); pintarConRuido(Fr, pl, [0.05, 0.055, 0.05], 0.3, 40, 550); contraluz(Fr, pl, 0, -2, [0.4, 0.6, 0.55], 0.5);
  const luzF: Luz = { amb: [0.3, 0.34, 0.32], desat: 0.5, clave: { dir: [-1, -0.5], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: [0.45, 0.8, 0.7], k: 0.9 }] };
  figura(Fr, undefined, modelo('ahg_ballena_huesos', 'costillar', 0, 2.6), 200, 800, 300, luzF);
  figura(Fr, undefined, modelo('ahg_campana_caida', 'semienterrada', 0, 3), 760, 800, 140, luzF);
  t.particulas = 'lluvia';
}

// ================================================================== ACTO 6: YSMERAL
function a6p1(t: Toma) {
  const F = t.capa('fondo', 0, 0.25, 'normal', { opaca: true });
  cielo(F, [[0, '#020505'], [0.5, '#081414'], [1, '#020404']]);
  const muro = M(), ju = M(); rellenar(muro, [[-10, -10], [CW + 10, -10], [CW + 10, 600], [-10, 600]]); sillares(ju, -10, -10, CW + 10, 600, 52, 104, 601);
  pintarConRuido(F, muro, [0.05, 0.08, 0.075], 0.4, 26, 602); pintar(F, ju, [0.01, 0.02, 0.02], 0.7);
  const ar = M(); rellenar(ar, [[360, 600], [360, 220], [480, 90], [CX, 40], [928, 90], [1048, 220], [1048, 600]]); pintar(F, ar, [0.015, 0.03, 0.03], 0.9);
  const ch = M(); for (let k = 0; k < 40; k++) chorreado(ch, (k / 40) * CW, 0, 8, 200 + (k % 7) * 40, 603 + k); pintar(F, ch, [0.1, 0.2, 0.18], 0.4);
  const alga = M(); for (let k = 0; k < 30; k++) { const x = (k / 30) * CW + 20, l = 60 + (k * 37) % 140; polilinea(alga, Array.from({ length: 9 }, (_, j) => [x + Math.sin(j + k) * 5, -10 + (j / 8) * l] as P2), 6, 2); }
  pintar(F, alga, [0.02, 0.06, 0.04]);
  // el agua del campanario hundido
  const ag = M(); for (let y = 600; y < CH; y++) for (let x = 0; x < CW; x++) ag.d[y * CW + x] = 1;
  pintar(F, ag, [0.02, 0.05, 0.05]);
  sombraVertical(F, 0, 600, 0.4, false);
  alumbrar(F, CX, 520, 720, [0.4, 1.4, 1.1], 1.1, 0.8);
  granoOpaco(F, 0.02, 604);
  // la Campana que Ahoga se raja
  const Cm = t.capa('campana', 2, 0.55), CmL = t.capa('campana_luz', 3, 0.55, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 1.2 } });
  const luzC: Luz = { amb: [0.5, 0.6, 0.56], desat: 0.2, clave: { dir: [-0.5, -1], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: [0.5, 1, 0.85], k: 1.1, ancho: 1.5 }, { dx: 1, dy: 1, c: [0.2, 0.6, 0.5], k: 0.5 }], emite: emiteMar, cEmite: MAR, kEmite: 1.5 };
  const cm = figura(Cm, CmL, modelo('jefe_campana_ahoga_morir', 's', 3, 3), CX, 650, 560, luzC);
  const cb = cajaPose(cm, CX, 650), chh = cb.y1 - cb.y0;
  const raja = M(); polilinea(raja, [[CX + 6, cb.y0 + chh * 0.45], [CX - 6, cb.y0 + chh * 0.6], [CX + 10, cb.y0 + chh * 0.75], [CX - 2, cb.y1 - 10]], 6, 2); grietas(raja, CX, cb.y0 + chh * 0.7, 60, 4, 605, 1.6);
  pintar(Cm, raja, [0.01, 0.03, 0.03]); brillo(CmL, raja, [0.6, 1, 0.9], 1.2); brillo(CmL, desenfocada(raja, 8), MAR, 1.2);
  const sg = M(); chorreado(sg, CX - 8, cb.y0 + chh * 0.18, 30, chh * 0.25, 606); const mc = mascaraPose(CW, CH, cm, CX, 650); for (let i = 0; i < CW * CH; i++) sg.d[i] *= mc.d[i]; pintarSangre(Cm, sg, [0.7, 1, 0.9], 0.9, 0.5);
  // el agua que estalla en anillos
  const sp = M(); for (let k = 0; k < 3; k++) { const rr = 200 + k * 140, pts: P2[] = []; for (let j = 0; j <= 40; j++) { const a = (j / 40) * Math.PI * 2; pts.push([CX + Math.cos(a) * rr, 660 + Math.sin(a) * rr * 0.16]); } polilinea(sp, pts, 3 - k * 0.6, 3 - k * 0.6); }
  for (let k = 0; k < 40; k++) { const a = Math.PI + (k / 39) * Math.PI, l = 60 + (k * 13) % 80; trazo(sp, CX + Math.cos(a) * 160, 650 + Math.sin(a) * 30, CX + Math.cos(a) * (160 + l * 0.6), 650 + Math.sin(a) * 30 - l, 3, 1); }
  brillo(CmL, sp, [0.6, 0.95, 0.85], 0.8);
  const Fr = t.capa('frente', 5, 1);
  const luzF: Luz = { amb: [0.24, 0.3, 0.3], desat: 0.5, clave: { dir: [1, -0.5], k: 0.6 }, bordes: [{ dx: 1, dy: -1, c: [0.45, 0.95, 0.8], k: 1 }] };
  figura(Fr, undefined, modelo('mon_ahogado_campanero_morir', 's', 5, 3), 200, 800, 300, luzF);
  figura(Fr, undefined, modelo('ahg_red_huesos', 'colgada', 0, 3), 1250, 600, 420, { ...luzF, bordes: [{ dx: -1, dy: -1, c: [0.45, 0.95, 0.8], k: 1 }] });
  t.efecto({ tipo: 'sprite', hoja: 'goteo_agua', en: [[300, 36, 1], [520, 40, 0.8], [900, 36, 1], [1100, 40, 0.9], [CX - 30, cb.y0 + 40, 1]], mezcla: 'normal', despues_de: 'frente', paralaje: 1 });
}

/** La marea vuelve de golpe: una ola enorme cae sobre las calles; ahogados y peces en la arena; el barco flota. */
function a6p2(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  cielo(C, [[0, '#050808'], [0.4, '#1a2626'], [0.6, '#40504a'], [1, '#0a0d0d']], {
    fuente: [1000, 330, 500, [0.6, 0.7, 0.62], 0.45],
    nubes: [{ y0: -20, y1: 380, seed: 621, escala: 200, cubre: 0.62, masa: [0.06, 0.08, 0.08], panza: [0.4, 0.5, 0.45], filo: [0.35, 0.42, 0.42], luzX: () => 0.7 }],
  });
  const bm = M(); barco(bm, 1060, 470, 220, 622, false); pintar(C, bm, [0.05, 0.07, 0.07]);
  const ma = M(); for (let y = 470; y < CH; y++) for (let x = 0; x < CW; x++) ma.d[y * CW + x] = 1; reflejo(C, 470, [0.04, 0.07, 0.07], 0.45, 623, ma);
  granoOpaco(C, 0.015, 624);
  // la ciudad: tejados y torres
  const Ci = t.capa('ciudad', 1, 0.3);
  const ci = M(); rellenar(ci, perfil(CW, CH, 560, 10, 625, { escala: 200 }));
  const r = rng(626); for (let x = 200; x < CW; x += 40 + r() * 50) { const h = 40 + r() * 90; rellenar(ci, [[x, 562], [x, 560 - h], [x + 20, 560 - h - 30], [x + 40, 560 - h], [x + 40, 562]]); }
  aguja(ci, 640, 520, 26, 200); aguja(ci, 980, 520, 18, 150);
  pintar(Ci, ci, [0.03, 0.045, 0.045]); contraluz(Ci, ci, 2, -1, [0.5, 0.65, 0.6], 0.6);
  // la ola: una pared de agua que se curva sobre la ciudad, con espuma
  const O = t.capa('ola', 2, 0.4);
  const ola = M(), esp = M();
  const cr: P2[] = []; for (let k = 0; k <= 40; k++) { const u = k / 40; cr.push([-20 + u * 760, 140 + Math.sin(u * Math.PI * 0.9) * -40 + u * u * 380]); }
  rellenar(ola, [[-20, CH + 5], ...cr, [760, CH + 5]]);
  for (let k = 0; k < 14; k++) { const u = k / 14, [x, y] = cr[Math.floor(u * 40)]; rellenar(ola, [[x - 20, y], [x + 30, y - 30 - (k % 3) * 12], [x + 50, y + 10]]); }
  for (let i = 0; i < CW * CH; i++) { const x = i % CW, y = Math.floor(i / CW); if (ola.d[i] <= 0) continue; esp.d[i] = suave(0.62, 0.72, fbm(x / 18, y / 30, 4, 627)) * ola.d[i]; }
  pintarConRuido(O, ola, [0.04, 0.1, 0.1], 0.5, 20, 628); contraluz(O, ola, 3, 3, [0.7, 0.9, 0.85], 1); pintar(O, esp, [0.5, 0.6, 0.58], 0.7);
  // adelante: la playa con los que dejó el mar
  const Fr = t.capa('frente', 5, 1);
  const pl = M(); rellenar(pl, suelo(720, 30, 629)); pintarConRuido(Fr, pl, [0.07, 0.065, 0.055], 0.3, 40, 630); contraluz(Fr, pl, 0, -2, [0.55, 0.65, 0.6], 0.5);
  const luzF: Luz = { amb: [0.3, 0.34, 0.32], desat: 0.5, clave: { dir: [1, -0.5], k: 0.6 }, bordes: [{ dx: 1, dy: -1, c: [0.6, 0.85, 0.8], k: 0.9 }] };
  for (const [x, y, al, v] of [[880, 760, 180, 'tendido'], [1180, 790, 220, 'boca_abajo'], [560, 790, 160, 'enredado']] as [number, number, number, string][]) {
    figura(Fr, undefined, modelo('ahg_marino_ahogado', v, 0, 3), x, y, al, luzF, { espejo: x < CX });
    const sg = M(); charco(sg, x, y, al * 0.5, al * 0.06, x); pintarSangre(Fr, sg, [0.8, 0.5, 0.4], 0.8, 0.4);
  }
  figura(Fr, undefined, modelo('ahg_peces_muertos', 'podridos', 0, 3), 1020, 800, 110, luzF);
  t.particulas = 'lluvia';
}

/** El cielo se rompe como un vidrio: grietas de luz, pedazos caídos y la escalera de oro que sube. */
export function cieloRoto(C: Lamina, CL: Lamina, cx: number, ty: number, s: number, hasta = 480) {
  const r = rng(s), gr = mascara(C.w, C.h), hu = mascara(C.w, C.h), radiales: P2[][] = [];
  for (let k = 0; k < 18; k++) {
    const ang = (k / 18) * Math.PI * 2 + r() * 0.25, pts: P2[] = [[cx + Math.cos(ang) * 50, ty + Math.sin(ang) * 50]];
    let x = pts[0][0], y = pts[0][1], a = ang;
    for (let j = 0; j < 16; j++) { a += (r() - 0.5) * 0.3; const l = 30 + r() * 45; x += Math.cos(a) * l; y += Math.sin(a) * l * 0.85; pts.push([x, y]); if (y > hasta || x < -50 || x > C.w + 50) break; }
    radiales.push(pts); polilinea(gr, pts, 2.6, 0.6);
  }
  for (let k = 0; k < radiales.length; k++) for (let j = 2; j < 9; j += 2 + Math.floor(r() * 2)) {
    const a = radiales[k][j], b = radiales[(k + 1) % radiales.length][j + (r() < 0.5 ? 0 : 1)]; if (!a || !b) continue;
    const m: P2 = [(a[0] + b[0]) / 2 + (r() - 0.5) * 20, (a[1] + b[1]) / 2 + (r() - 0.5) * 20];
    polilinea(gr, [a, m, b], 1.4, 1);
    if (r() < 0.22) { const c = radiales[k][j + 1], d = radiales[(k + 1) % radiales.length][j + 1]; if (c && d) rellenar(hu, [a, m, b, d, c]); }
  }
  desenfocar(hu.d, C.w, C.h, 1.5);
  for (let i = 0; i < C.w * C.h; i++) if (Math.floor(i / C.w) > hasta) { gr.d[i] = 0; hu.d[i] = 0; }
  pintar(C, hu, [0.9, 0.82, 0.62], 0.8);
  brillo(CL, gr, [1, 0.85, 0.5], 1.2); brillo(CL, desenfocada(gr, 6), [1, 0.6, 0.2], 1); brillo(CL, hu, [1, 0.9, 0.7], 0.3);
}
/** La escalera de oro: escalones que se angostan hacia arriba (máscaras pintadas en la lámina). */
export function escaleraOro(L: Lamina, cx: number, y0: number, y1: number, w0: number, w1: number, s: number, k = 1) {
  const esc = mascara(L.w, L.h), som = mascara(L.w, L.h), N = 30;
  const yE = (u: number) => y0 + (y1 - y0) * u ** 1.6, wE = (u: number) => w0 + (w1 - w0) * u ** 1.5;
  for (let j = 0; j < N; j++) {
    const a = j / N, b = (j + 1) / N;
    rellenar(esc, [[cx - wE(a), yE(a)], [cx + wE(a), yE(a)], [cx + wE(b), yE(b)], [cx - wE(b), yE(b)]]);
    const bo = yE(a) + (yE(b) - yE(a)) * 0.35;
    rellenar(som, [[cx - wE(a), bo], [cx + wE(a), bo], [cx + wE(b), yE(b)], [cx - wE(b), yE(b)]]);
  }
  pintarConRuido(L, esc, [0.72 * k, 0.52 * k, 0.24 * k], 0.25, 30, s);
  pintar(L, som, [0.16 * k, 0.1 * k, 0.05 * k], 0.9);
  return { esc, yE, wE };
}
function a6p3(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  const cx = CX, ty = 230;
  cielo(C, [[0, '#030306'], [0.4, '#110e18'], [0.6, '#2a2018'], [0.66, '#18201e'], [1, '#050707']], { fuente: [cx, ty, 620, [1, 0.75, 0.35], 0.6] });
  const CL = t.capa('grietas', 1, 0.05, 'sumar', { anim: { tipo: 'latir', alfa: [0.7, 1], periodo_s: 3 } });
  cieloRoto(C, CL, cx, ty, 631, 520);
  const E = t.capa('escalera', 2, 0.15), EL = t.capa('escalera_luz', 3, 0.15, 'sumar', { anim: { tipo: 'titilar', alfa: [0.8, 1], hz: 2 } });
  const e = escaleraOro(E, cx, 520, ty + 30, 120, 10, 632);
  for (let i = 0; i < CW * CH; i++) e.esc.d[i] *= 1 - suave(ty, 520, Math.floor(i / CW)) * 0.6;
  brillo(EL, desenfocada(e.esc, 6), [1, 0.7, 0.3], 0.5);
  halo(EL, cx, ty + 20, 80, [1, 0.9, 0.6], 1, 1, true);
  // el mar quieto abajo y el barco que flota otra vez
  const mar = 540, Ma = t.capa('mar', 4, 0.3);
  const base = t.plano(3), ag = M(); for (let y = mar; y < CH; y++) for (let x = 0; x < CW; x++) ag.d[y * CW + x] = 1;
  Ma.d.set(base.d); reflejo(Ma, mar, [0.03, 0.05, 0.05], 0.6, 633, ag);
  for (let i = 0; i < CW * CH; i++) if (Math.floor(i / CW) < mar) Ma.d[i * 4] = Ma.d[i * 4 + 1] = Ma.d[i * 4 + 2] = Ma.d[i * 4 + 3] = 0;
  const bm = M(); barco(bm, 380, 600, 300, 634, false); pintar(Ma, bm, [0.02, 0.025, 0.025]); contraluz(Ma, bm, 2, -1, [1, 0.8, 0.45], 0.8);
  const Fr = t.capa('frente', 5, 1);
  const co = M(); rellenar(co, [[-10, CH + 5], [-10, 700], [200, 690], [380, 730], [520, CH + 5]]); rellenar(co, [[980, CH + 5], [1100, 720], [1300, 690], [1420, 700], [1420, CH + 5]]);
  pintarConRuido(Fr, co, [0.03, 0.03, 0.03], 0.3, 30, 635); contraluz(Fr, co, 0, -2, [1, 0.8, 0.45], 0.6);
  figura(Fr, undefined, npc('oya', 'n', 'quieto', 0, 5), 1200, 712, 250, { amb: [0.3, 0.27, 0.27], desat: 0.3, bordes: [{ dx: -1, dy: -1, c: [1, 0.8, 0.45], k: 1.2 }] });
  t.particulas = 'ceniza';
}
/** Aun-Saar en su trono, la boca del pecho abierta. */
function a6p4(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  cielo(C, [[0, '#030204'], [0.5, '#120c10'], [1, '#040304']], { fuente: [CX, 300, 700, [1, 0.7, 0.3], 0.55], estrellas: 200, s: 641 });
  const CL = t.capa('grietas', 1, 0.05, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 3.3 } });
  cieloRoto(C, CL, CX, 260, 642, 560);
  granoOpaco(C, 0.015, 643);
  const Tr = t.capa('trono', 2, 0.35);
  const luzT: Luz = { amb: [0.42, 0.34, 0.26], desat: 0.3, clave: { dir: [0, -1], k: 0.6 }, bordes: [{ dx: 0, dy: -1, c: [1, 0.8, 0.4], k: 1 }], niebla: { c: [0.12, 0.08, 0.06], k: 0.2 }, emite: emiteOro, cEmite: [1, 0.8, 0.4] };
  const mR = modelo('cel_trono_respaldo', 'con_alas', 0, 3), mE = modelo('cel_trono_escalones', 'con_craneos', 0, 3), esc = 640 / mR.img.h * 0.9;
  figuraEsc(Tr, undefined, mR, CX, 700, esc, luzT); figuraEsc(Tr, undefined, mE, CX, 700, esc, luzT);
  const A = t.capa('aunsaar', 3, 0.5), AL = t.capa('aunsaar_luz', 4, 0.5, 'sumar', { anim: { tipo: 'latir', alfa: [0.5, 1], periodo_s: 1.8, notas: 'la boca del pecho respira' } });
  const luzA: Luz = { amb: [0.5, 0.45, 0.42], desat: 0.25, clave: { dir: [0, -1], k: 0.7, c: [1.2, 1, 0.8] }, bordes: [{ dx: 0, dy: -1, c: [1.2, 0.9, 0.5], k: 1.2, ancho: 1.5 }, { dx: 1, dy: 0, c: [0.6, 0.3, 0.8], k: 0.5 }], emite: emiteOro, cEmite: [1, 0.8, 0.45], kEmite: 1 };
  const au = figura(A, AL, modelo('jefe_aun_saar_quieto', 's', 0, 1.8), CX, 640, 560, luzA);
  const ab = cajaPose(au, CX, 640), bocaY = ab.y0 + (ab.y1 - ab.y0) * 0.52;
  halo(AL, CX, bocaY, 120, [0.7, 0.35, 1], 0.9, 1.4, true); halo(AL, CX, bocaY, 30, [1, 0.8, 1], 1, 1.6, true);
  // brasa_absorber: la boca brilla más roja (ya sabe que su sed viene en camino)
  const Ab = t.capa('boca_roja', 5, 0.5, 'sumar', { soloSi: 'brasa_absorber', anim: { tipo: 'latir', alfa: [0.5, 1], periodo_s: 1 } });
  halo(Ab, CX, bocaY, 160, [1, 0.25, 0.08], 0.8, 1.4, true);
  t.particulas = 'ceniza';
}

export const PINTORES_B: Record<string, (t: Toma) => void> = {
  'acto_4/p1_hjaldur': a4p1, 'acto_4/p2_fortin': a4p2, 'acto_4/p3_herida': a4p3,
  'acto_5/p1_ozmaren': a5p1, 'acto_5/p2_eleccion': a5p2, 'acto_5/p3_mar': a5p3, 'acto_5/p4_ysmeral': a5p4,
  'acto_6/p1_campana': a6p1, 'acto_6/p2_marea': a6p2, 'acto_6/p3_vidrio': a6p3, 'acto_6/p4_aunsaar': a6p4,
};
export { bocaHerida, catedralAhogada, fragua };
