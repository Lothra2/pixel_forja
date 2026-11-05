import { rng } from '../core/rng';
import { mascara, rellenar, trazo, disco, polilinea, desenfocar, desenfocada, pintar, brillo, halo, sat, fbm, type Lamina, type C3, type P2 } from './cine';
import { perfil, aguja, ruina, arbolMuerto } from './siluetas';
import { contraluz, niebla, chorreado, charco, salpicar, pintarSangre, haces, estela, sillares, cajaPose, mascaraPose, emiteOro, losas, grietas, type Luz } from './estudio';
import { CW, CH, CX, Toma, alumbrar, sombraVertical, granoOpaco, cielo, lomas, pintarConRuido, pasto, figura, figuraEsc, modelo, heroe, npc } from './cine_toma';
import { cieloRoto, escaleraOro } from './cine_planos_b';
import { catedralOria } from './cine_planos_a';
import { iluminar, poner } from './estudio';

/**
 * Pintores del acto 7: la caída de Aun-Saar y la Corona (acto_7), y los cuatro finales al entregar la Corona
 * (vigilia: a Auren; cielo: a Mira; rey_ceniza: el héroe se la queda con la Brasa adentro; corona_fria: se la queda
 * con la Brasa apagada). Coordenadas de la capa de 1408 x 792.
 */

const M = () => mascara(CW, CH);
const ORO: C3 = [1, 0.75, 0.35];
interface Paleta { cielo: [number, string][]; luz: C3; luzK: number; frio?: boolean }
const DORADA: Paleta = { cielo: [[0, '#030204'], [0.45, '#140d10'], [0.62, '#2e1e14'], [1, '#050304']], luz: ORO, luzK: 0.6 };
const ROJA: Paleta = { cielo: [[0, '#050102'], [0.45, '#1c0404'], [0.62, '#3a0a06'], [1, '#060102']], luz: [1, 0.3, 0.08], luzK: 0.7 };
const FRIA: Paleta = { cielo: [[0, '#04060a'], [0.45, '#121820'], [0.62, '#232c36'], [1, '#05070a']], luz: [0.6, 0.72, 0.9], luzK: 0.45, frio: true };

/** El cielo roto con el trono armado del catálogo (respaldo y escalones) en el centro. Devuelve el pie del trono. */
function salaTrono(t: Toma, p: Paleta, s: number, trono = true): { pie: P2; esc: number } {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  cielo(C, p.cielo, { fuente: [CX, 300, 700, p.luz, p.luzK], estrellas: p.frio ? 260 : 140, s });
  const CL = t.capa('grietas', 1, 0.05, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 3.2 } });
  cieloRoto(C, CL, CX, 190, s + 1, 520, 8 + (s % 3), p.frio ? [0.7, 0.8, 1] : p.luz[1] < 0.5 ? [1, 0.45, 0.15] : [1, 0.82, 0.5]);
  granoOpaco(C, 0.015, s + 2);
  const pie: P2 = [CX, 700];
  let esc = 1;
  if (trono) {
    const Tr = t.capa('trono', 2, 0.35);
    const luzT: Luz = p.frio
      ? { amb: [0.32, 0.34, 0.4], desat: 0.75, clave: { dir: [0, -1], k: 0.5 }, bordes: [{ dx: 0, dy: -1, c: [0.7, 0.8, 1], k: 0.9 }], niebla: { c: [0.1, 0.12, 0.15], k: 0.25 } }
      : { amb: [0.42, 0.34, 0.26], desat: 0.3, clave: { dir: [0, -1], k: 0.6 }, bordes: [{ dx: 0, dy: -1, c: [p.luz[0], p.luz[1] * 1.1, p.luz[2] * 1.2], k: 1 }], niebla: { c: [0.12, 0.08, 0.06], k: 0.2 }, emite: emiteOro, cEmite: p.luz };
    const mR = modelo('cel_trono_respaldo', 'con_alas', 0, 3), mE = modelo('cel_trono_escalones', 'con_craneos', 0, 3);
    esc = (600 / mR.img.h) * 0.9;
    figuraEsc(Tr, undefined, mR, pie[0], pie[1], esc, luzT); figuraEsc(Tr, undefined, mE, pie[0], pie[1], esc, luzT);
    if (p.frio) { const aT = M(); for (let i = 0; i < CW * CH; i++) aT.d[i] = Tr.d[i * 4 + 3]; contraluz(Tr, aT, 0, -2, [0.75, 0.82, 0.95], 0.8, undefined, 0.6); }
  }
  return { pie, esc };
}
/** La Corona: el modelo del catálogo, con su luz propia. */
function corona(capa: Lamina, luz: Lamina, x: number, y: number, alto: number, fria = false, k = 1) {
  const p = iluminar(modelo('corona_suelo', 'oro', 0, 6), alto, fria
    ? { amb: [0.55, 0.58, 0.66], desat: 0.7, clave: { dir: [-1, -1], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: [0.7, 0.8, 1], k: 1 }] }
    : { amb: [0.9, 0.75, 0.55], desat: 0.1, clave: { dir: [-0.5, -1], k: 0.7, c: [1.3, 1.1, 0.8] }, bordes: [{ dx: 0, dy: -1, c: [1.4, 1, 0.5], k: 1.4 }], emite: emiteOro, cEmite: ORO, kEmite: 1.2 });
  poner(capa, p, x, y, luz);
  if (!fria) { halo(luz, x, y - alto * 0.5, alto * 2.4, [1, 0.6, 0.2], 0.6 * k, 1, true); halo(luz, x, y - alto * 0.5, alto * 0.8, [1, 0.85, 0.5], 0.6 * k, 1, true); }
}
/** Sangre dorada (la del dios): chorros por los escalones. */
function sangreDorada(L: Lamina, x0: number, y0: number, x1: number, y1: number, n: number, s: number, c: C3 = [0.9, 0.55, 0.12]) {
  const m = M(), r = rng(s);
  for (let k = 0; k < n; k++) { const x = x0 + r() * (x1 - x0); polilinea(m, Array.from({ length: 10 }, (_, j) => [x + Math.sin(j + k) * 4, y0 + ((y1 - y0) * j) / 9] as P2), 2, 7); }
  charco(m, (x0 + x1) / 2, y1, (x1 - x0) * 0.7, 18, s + 1);
  pintar(L, m, c, 0.95); contraluz(L, m, 0, -2, [1, 0.95, 0.7], 0.8);
}

// ================================================================== ACTO 7: cae Aun-Saar, queda la Corona
function a7p1(t: Toma) {
  const { pie } = salaTrono(t, DORADA, 701);
  const A = t.capa('aunsaar', 3, 0.5), AL = t.capa('aunsaar_luz', 4, 0.5, 'sumar', { anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 6 } });
  const luzA: Luz = { amb: [0.5, 0.44, 0.4], desat: 0.25, clave: { dir: [0, -1], k: 0.7, c: [1.2, 1, 0.8] }, bordes: [{ dx: 0, dy: -1, c: [1.3, 0.95, 0.5], k: 1.3, ancho: 1.5 }, { dx: 1, dy: 0, c: [0.6, 0.3, 0.8], k: 0.5 }], emite: emiteOro, cEmite: ORO, kEmite: 1.1 };
  const au = figura(A, AL, modelo('jefe_aun_saar_morir', 's', 4, 1.8), pie[0], pie[1] - 40, 600, luzA);
  const ab = cajaPose(au, pie[0], pie[1] - 40), bocaY = ab.y0 + (ab.y1 - ab.y0) * 0.5;
  // la luz que se le escapa por la boca del pecho, partida
  haces(AL, CX, bocaY, -Math.PI / 2, 2.2, 760, [1, 0.85, 0.55], 0.6, 702, 30);
  halo(AL, CX, bocaY, 200, [1, 0.8, 0.5], 0.9, 1.2, true);
  t.rayos('rayos', 4.5, 0.45, 4, CX, bocaY, 0.55, 0.5);
  const F = t.capa('frente', 5, 1), FL = t.capa('frente_luz', 6, 1, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 2 } });
  const e = escaleraOro(F, CX, CH + 40, 640, 700, 260, 703, 0.8);
  sangreDorada(F, CX - 200, 640, CX + 200, CH, 7, 704);
  const luzS: Luz = { amb: [0.35, 0.32, 0.3], desat: 0.5, clave: { dir: [0, -1], k: 0.6 }, bordes: [{ dx: 0, dy: -1, c: ORO, k: 1 }] };
  figura(F, undefined, modelo('cel_estatua_suplica', 'tendiendo', 0, 3), 200, 820, 380, luzS);
  figura(F, undefined, modelo('cel_estatua_suplica', 'postrado', 0, 3), 1220, 810, 260, luzS, { espejo: true });
  brillo(FL, desenfocada(e.esc, 10), [1, 0.6, 0.2], 0.25);
  t.particulas = 'brasas';
}
function a7p2(t: Toma) {
  salaTrono(t, DORADA, 711);
  const F = t.capa('escalones', 3, 0.7), FL = t.capa('corona_luz', 4, 0.7, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 2.4, notas: 'la Corona late tibia' } });
  escaleraOro(F, CX, CH + 60, 600, 760, 320, 712, 0.85);
  sangreDorada(F, CX - 280, 600, CX + 240, CH, 9, 713);
  const sg = M(); charco(sg, CX + 120, 700, 160, 22, 714); salpicar(sg, CX - 60, 690, 200, Math.PI + 0.2, 30, 715); pintarSangre(F, sg, [1, 0.5, 0.3], 0.9, 0.5);
  corona(F, FL, CX, 700, 190);
  const luzP: Luz = { amb: [0.3, 0.27, 0.25], desat: 0.5, bordes: [{ dx: 0, dy: -1, c: ORO, k: 1 }] };
  figura(F, undefined, modelo('cel_halo_roto', 'partido', 0, 3), 330, 760, 140, luzP);
  figura(F, undefined, modelo('cel_halo_roto', 'uno', 0, 3), 1100, 740, 110, luzP);
  t.particulas = 'ceniza';
}

// ================================================================== vigilia: la Corona a Auren, la Iglesia la encierra
function v1(t: Toma) {
  salaTrono(t, DORADA, 721, false);
  const E = t.capa('escalera', 2, 0.3);
  escaleraOro(E, CX, CH + 20, 360, 600, 60, 722, 0.7);
  const A = t.capa('auren', 3, 0.65), AL = t.capa('corona_luz', 4, 0.65, 'sumar', { anim: { tipo: 'latir', alfa: [0.5, 0.9], periodo_s: 2.6 } });
  const luzA: Luz = { amb: [0.62, 0.6, 0.58], desat: 0.25, clave: { dir: [-0.6, -1], k: 0.7, c: [1.2, 1.05, 0.85] }, bordes: [{ dx: -1, dy: -1, c: [1.2, 1, 0.7], k: 1.1, ancho: 1.5 }, { dx: 1, dy: 0, c: [0.4, 0.4, 0.55], k: 0.4 }] };
  const au = figura(A, undefined, npc('auren', 'so', 'quieto', 0, 6), CX - 40, 770, 560, luzA);
  const b = cajaPose(au, CX - 40, 770);
  // la Corona contra el pecho, envuelta en el manto: tela con pliegues y sombras, y un pedazo de oro que asoma
  const mx = (b.x0 + b.x1) / 2 + 24, my = b.y0 + (b.y1 - b.y0) * 0.5;
  corona(A, AL, mx + 6, my + 6, 70, false, 0.5);
  const manto = M(), pl = M(), luzPl = M();
  rellenar(manto, Array.from({ length: 26 }, (_, k) => { const a = (k / 26) * Math.PI * 2, q = 1 + 0.18 * Math.sin(a * 5 + 1) + 0.1 * fbm(Math.cos(a) * 2, Math.sin(a) * 2, 2, 723); return [mx + Math.cos(a) * 62 * q, my + 26 + Math.sin(a) * 44 * q - (Math.sin(a) < -0.5 ? 18 : 0)] as P2; }));
  rellenar(manto, [[mx - 30, my + 50], [mx - 70, my + 140], [mx - 40, my + 150], [mx - 10, my + 70]]);
  for (let k = 0; k < 7; k++) { const x0 = mx - 50 + k * 16, pts: P2[] = []; for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push([x0 + Math.sin(u * 3 + k) * 8 + u * (k - 3) * 6, my - 4 + u * 80]); } polilinea(pl, pts, 3.2, 1); polilinea(luzPl, pts.map(([x, y]) => [x - 3, y] as P2), 1.4, 0.5); }
  for (let i = 0; i < CW * CH; i++) { pl.d[i] *= manto.d[i]; luzPl.d[i] *= manto.d[i]; }
  pintarConRuido(A, manto, [0.4, 0.37, 0.33], 0.15, 12, 724);
  const somb = M(); for (let i = 0; i < CW * CH; i++) somb.d[i] = manto.d[i] * sat(((Math.floor(i / CW) - my) / 120) + ((i % CW) - mx) / 160); pintar(A, somb, [0.18, 0.16, 0.16], 0.6);
  pintar(A, desenfocada(pl, 1.5), [0.2, 0.18, 0.18], 0.7); pintar(A, luzPl, [1, 0.92, 0.75], 0.5, 'luz');
  contraluz(A, manto, -2, -2, [1, 0.9, 0.7], 0.8);
  const glint = M(); trazo(glint, mx - 12, my - 4, mx + 12, my - 4, 1.4, 1.4); trazo(glint, mx, my - 16, mx, my + 8, 1.4, 1.4); disco(glint, mx, my - 4, 2.6);
  brillo(AL, glint, [1, 0.9, 0.6], 1.6); halo(AL, mx, my - 4, 40, [1, 0.7, 0.3], 0.8, 1, true);
  t.particulas = 'ceniza';
}
/** La cripta: el relicario de hierro con siete sellos, cadenas y los monjes que cantan con velas. */
function cripta(t: Toma, s: number, cerca: boolean) {
  const F = t.capa('fondo', 0, 0.25, 'normal', { opaca: true });
  cielo(F, [[0, '#040303'], [0.5, '#100b09'], [1, '#040303']]);
  const mu = M(), ju = M(); rellenar(mu, [[-10, -10], [CW + 10, -10], [CW + 10, 660], [-10, 660]]); sillares(ju, -10, -10, CW + 10, 660, 44, 88, s);
  pintarConRuido(F, mu, [0.1, 0.08, 0.07], 0.4, 24, s + 1); pintar(F, ju, [0.02, 0.015, 0.012], 0.8);
  for (const x of [240, 1168]) { const ar = M(); rellenar(ar, [[x - 150, 660], [x - 150, 260], [x - 90, 150], [x, 110], [x + 90, 150], [x + 150, 260], [x + 150, 660]]); pintar(F, ar, [0.015, 0.01, 0.01], 0.92); }
  losas(F, 660, CH, [0.08, 0.06, 0.05], s + 2, [CX, 660], 6);
  sombraVertical(F, 0, 660, 0.4, false);
  alumbrar(F, CX, 560, 720, [1.6, 1, 0.55], 1, 0.7);
  granoOpaco(F, 0.02, s + 3);
  const R = t.capa('relicario', 2, cerca ? 0.7 : 0.5), RL = t.capa('relicario_luz', 3, cerca ? 0.7 : 0.5, 'sumar', { anim: { tipo: 'latir', alfa: [0.3, 1], periodo_s: 4, notas: 'algo tibio late adentro, muy despacio' } });
  const alto = cerca ? 640 : 380, py = cerca ? 760 : 700;
  const luzR: Luz = { amb: [0.62, 0.5, 0.4], desat: 0.25, clave: { dir: [0.6, -0.6], k: 0.8, c: [1.3, 0.95, 0.65] }, bordes: [{ dx: 1, dy: -1, c: [1.2, 0.75, 0.4], k: 1.1 }, { dx: -1, dy: -1, c: [1, 0.6, 0.3], k: 0.6 }], abajo: { c: [0.6, 0.3, 0.1], k: 0.3 }, };
  const re = figura(R, RL, modelo('tum_cofre', 'piedra', 0, 4), CX, py, alto * 0.75, luzR);
  const b = cajaPose(re, CX, py), w = b.x1 - b.x0, h = b.y1 - b.y0;
  // cadenas cruzadas y siete sellos de cera roja
  const ca = M(); for (const [a0, a1] of [[[b.x0 - 40, b.y0 + h * 0.2], [b.x1 + 40, b.y1 - h * 0.2]], [[b.x1 + 40, b.y0 + h * 0.2], [b.x0 - 40, b.y1 - h * 0.2]], [[b.x0 - 50, b.y0 + h * 0.55], [b.x1 + 50, b.y0 + h * 0.55]]] as [P2, P2][]) for (let k = 0; k <= 24; k++) { const u = k / 24, x = a0[0] + (a1[0] - a0[0]) * u, y = a0[1] + (a1[1] - a0[1]) * u; disco(ca, x, y, w * 0.012 + 2); disco(ca, x, y, w * 0.006 + 1, 1, 'restar'); }
  pintar(R, ca, [0.06, 0.055, 0.055]); contraluz(R, ca, 0, -1, [1, 0.7, 0.4], 0.8);
  const se = M(); for (let k = 0; k < 7; k++) { const x = b.x0 + w * (0.12 + k * 0.127), y = b.y0 + h * (0.58 + (k % 2) * 0.05); disco(se, x, y, w * 0.035); }
  pintar(R, se, [0.35, 0.03, 0.02]); contraluz(R, se, -1, -1, [1, 0.5, 0.35], 0.8);
  const sg = M(); for (let k = 0; k < 7; k++) chorreado(sg, b.x0 + w * (0.12 + k * 0.127), b.y0 + h * (0.6 + (k % 2) * 0.05), 6, h * 0.12, s + 10 + k); pintarSangre(R, sg, [1, 0.5, 0.35], 0.9, 0.4);
  const ra = M(); trazo(ra, b.x0 + w * 0.2, b.y0 + h * 0.45, b.x1 - w * 0.2, b.y0 + h * 0.45, 2.4, 2.4, 1, 'max', false);
  brillo(RL, ra, [1, 0.6, 0.2], 1.2); halo(RL, CX, b.y0 + h * 0.45, w * 0.6, [1, 0.45, 0.12], 0.4, 0.5, true);
  return b;
}
function v2(t: Toma) {
  const b = cripta(t, 731, false);
  const Mo = t.capa('monjes', 4, 0.8), ML = t.capa('velas_luz', 5, 0.8, 'sumar', { anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 7 } });
  const luzM: Luz = { amb: [0.24, 0.2, 0.18], desat: 0.5, clave: { dir: [0, -1], k: 0.6 }, bordes: [{ dx: 0, dy: -1, c: [1, 0.65, 0.3], k: 1 }, { dx: 1, dy: 0, c: [1, 0.55, 0.25], k: 0.5 }] };
  const velas: [number, number, number][] = [];
  for (const [x, y, al, d] of [[220, 820, 380, 'ne'], [420, 800, 330, 'ne'], [1000, 800, 330, 'no'], [1200, 820, 380, 'no'], [600, 840, 300, 'n'], [820, 850, 300, 'n']] as [number, number, number, 'ne' | 'no' | 'n'][]) {
    const mo = figura(Mo, undefined, modelo('mon_penitente_quieto', d, 0, 3), x, y, al, luzM);
    const mb = cajaPose(mo, x, y), vx = d === 'ne' ? mb.x1 - 6 : d === 'no' ? mb.x0 + 6 : (mb.x0 + mb.x1) / 2 + 30, vy = mb.y0 + (mb.y1 - mb.y0) * 0.45;
    const ve = M(); trazo(ve, vx, vy, vx, vy - 26, 6, 6, 1, 'max', false); pintar(Mo, ve, [0.7, 0.62, 0.5]);
    velas.push([vx, vy - 26, 0.22]); halo(ML, vx, vy - 34, 120, [1, 0.55, 0.2], 0.5, 1, true);
  }
  void b;
  t.efecto({ tipo: 'sprite', hoja: 'fuego', en: velas, mezcla: 'sumar', despues_de: 'velas_luz', paralaje: 0.8 });
  t.particulas = 'ceniza';
}
function v3(t: Toma) {
  const b = cripta(t, 741, true);
  const V = t.capa('vela', 4, 0.9), VL = t.capa('vela_luz', 5, 0.9, 'sumar', { anim: { tipo: 'titilar', alfa: [0.6, 1], hz: 6 } });
  const vx = Math.min(CW - 120, b.x1 + 90), vy = 640, ve = M(); rellenar(ve, [[vx - 12, 820], [vx - 12, vy], [vx + 12, vy], [vx + 12, 820]]); rellenar(ve, [[vx - 40, 820], [vx + 40, 820], [vx + 30, 800], [vx - 30, 800]]);
  const ce = M(); for (let k = 0; k < 4; k++) chorreado(ce, vx - 8 + k * 5, vy + 2, 4, 30 + k * 20, 742 + k);
  pintarConRuido(V, ve, [0.62, 0.55, 0.45], 0.15, 6, 743); pintar(V, ce, [0.72, 0.65, 0.55]); contraluz(V, ve, -2, 0, [1, 0.7, 0.4], 0.9);
  halo(VL, vx, vy - 20, 260, [1, 0.5, 0.18], 0.6, 1, true);
  t.efecto({ tipo: 'sprite', hoja: 'fuego', en: [[vx, vy, 0.4]], mezcla: 'sumar', despues_de: 'vela_luz', paralaje: 0.9 });
  t.efecto({ tipo: 'sprite', hoja: 'humo', en: [[vx, vy - 80, 0.6]], mezcla: 'normal', despues_de: 'vela_luz', paralaje: 0.9, alfa: 0.4 });
}

// ================================================================== cielo: la Corona a Mira, que la rompe
function jaulasEstrellas(L: Lamina, LL: Lamina, s: number) {
  const r = rng(s), m = M(), est = M();
  for (let k = 0; k < 9; k++) {
    const x = 120 + r() * (CW - 240), y = 80 + r() * 380, rr = 22 + r() * 30;
    trazo(m, x, y - rr * 2.2, x, y - rr, 1.6, 1.6, 1, 'max', false);
    for (let j = -3; j <= 3; j++) { const u = j / 3.4; polilinea(m, Array.from({ length: 8 }, (_, q) => { const v = q / 7; return [x + u * rr * Math.sin(v * Math.PI), y - rr + v * rr * 2] as P2; }), 1.4, 1.4); }
    trazo(m, x - rr, y + rr * 0.95, x + rr, y + rr * 0.95, 2, 2, 1, 'max', false);
    disco(est, x, y, rr * 0.22);
  }
  pintar(L, m, [0.5, 0.36, 0.14]); contraluz(L, m, 0, -1, [1, 0.8, 0.4], 0.8);
  brillo(LL, est, [1, 0.95, 0.8], 1.4); brillo(LL, desenfocada(est, 10), [0.8, 0.85, 1], 1.4);
}
function c1(t: Toma) {
  salaTrono(t, DORADA, 751, false);
  const J = t.capa('jaulas', 2, 0.2), JL = t.capa('estrellas', 3, 0.2, 'sumar', { anim: { tipo: 'titilar', alfa: [0.6, 1], hz: 2 } });
  jaulasEstrellas(J, JL, 752);
  const Mi = t.capa('mira', 4, 0.65), ML = t.capa('corona_luz', 5, 0.65, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 0.7, notas: 'la Corona se raja' } });
  const piso = M(); rellenar(piso, perfil(CW, CH, 760, 12, 753, { escala: 300 })); pintarConRuido(Mi, piso, [0.3, 0.22, 0.12], 0.3, 30, 754); contraluz(Mi, piso, 0, -2, ORO, 0.6);
  const luzM: Luz = { amb: [0.55, 0.48, 0.48], desat: 0.2, clave: { dir: [0, -1], k: 0.8, c: [1.3, 1.2, 1.1] }, bordes: [{ dx: 0, dy: -1, c: [1.3, 1.25, 1.1], k: 1.3, ancho: 1.5 }, { dx: 1, dy: 0, c: [0.5, 0.4, 0.7], k: 0.4 }] };
  const mi = figura(Mi, undefined, npc('mira', 's', 'lanzar', 3, 6), CX, 770, 520, luzM);
  const b = cajaPose(mi, CX, 770);
  const cy = b.y0 - 60;
  corona(Mi, ML, CX, cy + 50, 110);
  // la Corona partida: luz blanca que sale por la rajadura
  const ra = M(); grietas(ra, CX, cy, 120, 8, 755, 2.2, 1); brillo(ML, ra, [1, 1, 0.95], 1.2); brillo(ML, desenfocada(ra, 8), [0.9, 0.95, 1], 1.2);
  haces(ML, CX, cy, -Math.PI / 2, 2.6, 600, [1, 0.97, 0.9], 0.5, 756, 30);
  t.rayos('rayos', 6, 0.6, 5, CX, cy, 0.5, 0.55);
  t.particulas = 'brasas';
}
function c2(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  cielo(C, [[0, '#0a0a10'], [0.4, '#2a2420'], [1, '#08060a']], { fuente: [CX, 260, 900, [1, 0.95, 0.85], 0.9] });
  // el desgarrón: una herida de luz blanca de lado a lado
  const de = M(), r = rng(761);
  const pts: P2[] = []; for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push([-20 + u * (CW + 40), 260 + Math.sin(u * 5) * 30 - Math.sin(u * Math.PI) * 60 + (r() - 0.5) * 20]); }
  const pts2 = pts.map(([x, y], k) => [x, y + 30 + Math.sin((k / 40) * Math.PI) * 140 + (r() - 0.5) * 20] as P2).reverse();
  rellenar(de, [...pts, ...pts2]);
  pintar(C, desenfocada(de, 30), [1.1, 1.05, 0.95], 1);
  pintar(C, de, [1.5, 1.45, 1.35], 1);
  granoOpaco(C, 0.012, 762);
  const CL = t.capa('luz_blanca', 1, 0.05, 'sumar', { anim: { tipo: 'latir', alfa: [0.7, 1], periodo_s: 2 } });
  haces(CL, CX, 330, Math.PI / 2, 1.3, 700, [1, 0.97, 0.9], 0.5, 763, 26);
  // islas de oro que caen, con estelas de fuego
  const I = t.capa('islas', 2, 0.25);
  const luzI: Luz = { amb: [0.42, 0.36, 0.3], desat: 0.3, clave: { dir: [0, -1], k: 0.7 }, bordes: [{ dx: 0, dy: -1, c: [1.3, 1.2, 1], k: 1.2 }], niebla: { c: [0.3, 0.28, 0.26], k: 0.25 } };
  for (const [x, y, al, v] of [[240, 380, 220, 'con_columnas'], [1120, 330, 260, 'con_arco'], [700, 560, 180, 'mediana']] as [number, number, number, string][]) {
    estela(CL, Array.from({ length: 20 }, (_, k) => [x - 40 + k * 2, y - 400 + k * 18] as P2), 14, [1, 0.6, 0.3], 0.6);
    figura(I, undefined, modelo('cel_isla_ruinas', v, 0, 2), x, y, al, luzI);
  }
  // un dios de piedra que cae ardiendo
  const D = t.capa('dios', 3, 0.5), DL = t.capa('dios_luz', 4, 0.5, 'sumar', { anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 5 } });
  const di = figura(D, undefined, modelo('cel_angel_caido', 'de_espaldas', 0, 3), 900, 620, 420, { amb: [0.45, 0.42, 0.4], desat: 0.5, clave: { dir: [0, -1], k: 0.7 }, bordes: [{ dx: 0, dy: -1, c: [1.3, 1.2, 1.1], k: 1.2 }, { dx: 0, dy: 1, c: [1, 0.4, 0.1], k: 0.7 }] });
  const db = cajaPose(di, 900, 620);
  const gr = M(); grietas(gr, (db.x0 + db.x1) / 2, (db.y0 + db.y1) / 2, 140, 7, 764, 2.4); const md = mascaraPose(CW, CH, di, 900, 620); for (let i = 0; i < CW * CH; i++) gr.d[i] *= md.d[i];
  pintar(D, gr, [1, 0.5, 0.15]); brillo(DL, desenfocada(gr, 6), [1, 0.4, 0.1], 1);
  estela(DL, Array.from({ length: 24 }, (_, k) => [db.x0 + 60 + k * 2, db.y0 - 360 + k * 16] as P2), 40, [1, 0.45, 0.12], 0.7);
  t.efecto({ tipo: 'sprite', hoja: 'fuego', en: [[db.x0 + 80, db.y1 - 20, 1.2], [db.x1 - 60, db.y0 + 60, 1]], mezcla: 'sumar', despues_de: 'dios_luz', paralaje: 0.5 });
  t.particulas = 'brasas';
}
function c3(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  const sx = 500, sy = 470, luzX = (x: number) => 0.3 + Math.exp(-(((x - sx) / 400) ** 2));
  cielo(C, [[0, '#2a3446'], [0.4, '#6a7488'], [0.56, '#c0b4a0'], [0.62, '#e8d8b0'], [0.66, '#8a8a88'], [1, '#2a2a2c']], {
    fuente: [sx, sy, 600, [1, 0.95, 0.8], 0.5],
    nubes: [{ y0: 40, y1: 420, seed: 771, escala: 220, cubre: 0.42, estira: 3, masa: [0.4, 0.42, 0.48], panza: [0.9, 0.85, 0.7], filo: [0.9, 0.9, 0.95], luzX, alfa: 0.7 }],
  });
  const sol = M(); disco(sol, sx, sy, 46); pintar(C, sol, [1.2, 1.15, 1]);
  lomas(C, 500, 20, 772, [0.3, 0.32, 0.36], { escala: 260 });
  niebla(C, 460, 560, [0.7, 0.68, 0.66], 0.6, 773, 200);
  granoOpaco(C, 0.012, 774);
  // la abadía lejos, callada
  const A = t.capa('abadia', 1, 0.25);
  const cat = catedralOria();
  const pc = iluminar({ img: cat.img, ancla: cat.puerta }, 260, { amb: [0.5, 0.52, 0.58], desat: 0.7, clave: { dir: [-1, 0], k: 0.5 }, bordes: [{ dx: -1, dy: -1, c: [1, 0.95, 0.8], k: 0.6 }], niebla: { c: [0.55, 0.56, 0.6], k: 0.45 } });
  poner(A, pc, 1060, 520);
  const mo = M(); rellenar(mo, perfil(CW, CH, 560, 14, 775, { escala: 300 })); pintar(A, mo, [0.22, 0.23, 0.26]);
  niebla(A, 500, 620, [0.6, 0.6, 0.62], 0.5, 776, 220);
  // el páramo con la horca vacía, la soga que se mece
  const Md = t.capa('paramo', 2, 0.55);
  lomas(Md, 640, 20, 777, [0.1, 0.1, 0.1], { escala: 300, filo: [1, 0.95, 0.8], kFilo: 0.5 });
  figura(Md, undefined, modelo('par_horca', 'simple', 0, 2.6), 360, 660, 330, { amb: [0.24, 0.24, 0.26], desat: 0.6, bordes: [{ dx: -1, dy: -1, c: [1, 0.95, 0.8], k: 0.8 }], niebla: { c: [0.4, 0.4, 0.42], k: 0.2 } });
  const pas = M(); pasto(pas, -10, CW + 10, () => 650, 500, 30, 778); pintar(Md, pas, [0.08, 0.08, 0.08]);
  const Fr = t.capa('frente', 3, 1);
  const ar = M(); arbolMuerto(ar, 1300, 820, 640, 779, { inclina: -0.1, grosor: 0.07 }); rellenar(ar, [[1040, CH + 5], [1200, 780], [1420, 760], [1420, CH + 5]]);
  pintar(Fr, ar, [0.03, 0.03, 0.035]); contraluz(Fr, ar, -2, -1, [1, 0.95, 0.8], 0.5);
  t.efecto({ tipo: 'sprite', hoja: 'cuervo', en: [[620, 320, 0.45], [680, 300, 0.4]], mezcla: 'normal', despues_de: 'abadia', paralaje: 0.25 });
}

// ================================================================== rey_ceniza: el héroe se queda la Corona con la Brasa adentro
function r1(t: Toma) {
  const { pie } = salaTrono(t, ROJA, 781);
  const H = t.capa('heroe', 3, 0.55), HL = t.capa('heroe_luz', 4, 0.55, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 1, notas: 'la Brasa le late en el pecho' } });
  const luzH: Luz = { amb: [1.05, 0.78, 0.68], desat: 0.1, clave: { dir: [0.3, 1], k: 0.75, c: [1.4, 0.95, 0.75] }, bordes: [{ dx: 0, dy: 1, c: [1.3, 0.4, 0.1], k: 1.2, ancho: 1.5 }, { dx: -1, dy: -1, c: [1.2, 0.45, 0.12], k: 1.1, ancho: 1.5 }, { dx: 1, dy: -1, c: [1, 0.8, 0.45], k: 0.9, ancho: 1.5 }], abajo: { c: [1, 0.3, 0.06], k: 0.7 }, emite: emiteOro, cEmite: [1, 0.65, 0.25], kEmite: 1 };
  const he = figura(H, HL, heroe('s', 'quieto', 0, 7, true), pie[0], pie[1] - 60, 470, luzH);
  const b = cajaPose(he, pie[0], pie[1] - 60), mh = mascaraPose(CW, CH, he, pie[0], pie[1] - 60);
  const ve = M(); grietas(ve, (b.x0 + b.x1) / 2, b.y0 + (b.y1 - b.y0) * 0.38, 110, 5, 782, 1.4); for (let i = 0; i < CW * CH; i++) ve.d[i] *= mh.d[i];
  pintar(H, ve, [1, 0.45, 0.12]); brillo(HL, desenfocada(ve, 5), [1, 0.35, 0.08], 1.1);
  halo(HL, (b.x0 + b.x1) / 2, b.y0 + (b.y1 - b.y0) * 0.38, 90, [1, 0.4, 0.08], 1.1, 1, true);
  for (const d of [-1, 1]) halo(HL, (b.x0 + b.x1) / 2 + d * 7, b.y0 + (b.y1 - b.y0) * 0.1, 12, [1, 0.5, 0.15], 1.4, 1, true);
  halo(HL, (b.x0 + b.x1) / 2, b.y0 - 10, 70, [1, 0.6, 0.2], 0.6, 1, true);
  const F = t.capa('frente', 5, 1);
  escaleraOro(F, CX, CH + 40, 640, 700, 260, 783, 0.7);
  sangreDorada(F, CX - 220, 640, CX + 220, CH, 10, 784, [0.35, 0.02, 0.015]);
  const luzS: Luz = { amb: [0.32, 0.2, 0.18], desat: 0.5, bordes: [{ dx: 0, dy: -1, c: [1, 0.4, 0.12], k: 1 }] };
  figura(F, undefined, modelo('cel_estatua_suplica', 'rodillas', 0, 3), 230, 820, 340, luzS);
  figura(F, undefined, modelo('cel_estatua_suplica', 'alzados', 0, 3), 1180, 820, 340, luzS, { espejo: true });
  t.particulas = 'brasas';
}
/** Fogata que se inclina (el fuego mira al norte, hacia el trono). */
function fogataInclinada(L: Lamina, x: number, y: number, w: number, h: number, inc: number, s: number) {
  const m = M(), r = rng(s);
  for (let i = 0; i < 4 + w / 8; i++) { const cx = x + (r() - 0.5) * w, al = h * (0.5 + r() * 0.5), an = w * (0.2 + r() * 0.2); rellenar(m, [[cx - an / 2, y], [cx - an * 0.3 + inc * al * 0.4, y - al * 0.45], [cx + inc * al, y - al], [cx + an * 0.45 + inc * al * 0.4, y - al * 0.4], [cx + an / 2, y]], 0.5 + r() * 0.5); }
  brillo(L, desenfocada(m, w * 0.35), [1, 0.4, 0.1], 1.3); brillo(L, m, [1, 0.75, 0.4], 1.1);
  halo(L, x + inc * h * 0.4, y - h * 0.4, Math.max(w, h) * 2.4, [0.9, 0.3, 0.06], 0.55, 0.8, true);
}
function r2(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  cielo(C, [[0, '#040102'], [0.5, '#1a0606'], [0.64, '#3a0c08'], [1, '#060202']], {
    fuente: [1180, 120, 500, [1, 0.3, 0.06], 0.6], estrellas: 80, s: 791,
    nubes: [{ y0: -20, y1: 380, seed: 792, escala: 200, cubre: 0.55, masa: [0.04, 0.015, 0.015], panza: [0.9, 0.25, 0.06], filo: [0.4, 0.12, 0.06], luzX: (x) => 0.3 + x / CW }],
  });
  const lu = M(); disco(lu, 1180, 120, 10); brillo(C, lu, [1, 0.6, 0.3], 1.5);
  granoOpaco(C, 0.015, 793);
  // Velmora: tejados, la torre de la abadía, y las hogueras que se inclinan al norte (a la derecha, hacia el trono)
  const Pu = t.capa('pueblo', 1, 0.3), PuL = t.capa('hogueras', 2, 0.3, 'sumar', { anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 6 } });
  const pu = M(), ven = M(), r = rng(794);
  rellenar(pu, perfil(CW, CH, 560, 12, 795, { escala: 300 }));
  for (let x = 40; x < CW; x += 60 + r() * 60) { const w = 50 + r() * 50, h = 40 + r() * 50; rellenar(pu, [[x, 562], [x, 560 - h], [x + w / 2, 560 - h - w * 0.5], [x + w, 560 - h], [x + w, 562]]); if (r() < 0.5) disco(ven, x + w * 0.3, 560 - h * 0.5, 3); }
  ruina(pu, null, 980, 562, 120, 100, 796, { torre: true }); aguja(pu, 1040, 470, 24, 160);
  pintar(Pu, pu, [0.03, 0.015, 0.015]); contraluz(Pu, pu, 2, -1, [1, 0.35, 0.1], 0.6);
  brillo(PuL, ven, [1, 0.5, 0.2], 1.2);
  for (const [x, y, w, h] of [[220, 600, 50, 110], [560, 590, 40, 90], [880, 600, 46, 100], [1260, 610, 54, 120]] as [number, number, number, number][]) fogataInclinada(PuL, x, y, w, h, 0.7, x);
  // la gente arrodillada en el barro, de espaldas, mirando al norte
  const G = t.capa('gente', 3, 0.7);
  const tierra = M(); rellenar(tierra, perfil(CW, CH, 620, 10, 797, { escala: 300 })); pintarConRuido(G, tierra, [0.04, 0.02, 0.02], 0.3, 30, 798);
  const luzG: Luz = { amb: [0.2, 0.12, 0.1], desat: 0.7, clave: { dir: [1, -0.5], k: 0.7 }, bordes: [{ dx: 1, dy: -1, c: [1, 0.4, 0.12], k: 1.1 }] };
  for (const [x, y, al] of [[300, 720, 200], [470, 700, 170], [700, 730, 210], [930, 700, 170], [1120, 720, 190], [600, 660, 120], [1000, 650, 110], [380, 650, 110]] as [number, number, number][]) figura(G, undefined, modelo('cel_estatua_suplica', x % 3 ? 'rodillas' : 'postrado', 0, 2.6), x, y, al, luzG, { espejo: x % 2 === 0 });
  const Fr = t.capa('frente', 4, 1);
  const fr = M(); rellenar(fr, [[-10, CH + 5], [-10, 680], [140, 700], [260, 760], [320, CH + 5]]); arbolMuerto(fr, 80, 720, 560, 799, { inclina: 0.12 });
  pintar(Fr, fr, [0.015, 0.008, 0.008]); contraluz(Fr, fr, 2, 0, [1, 0.35, 0.1], 0.6);
  t.efecto({ tipo: 'sprite', hoja: 'humo', en: [[260, 480, 1.2], [920, 490, 1.1], [1300, 470, 1.3]], mezcla: 'normal', despues_de: 'hogueras', paralaje: 0.3, alfa: 0.5 });
  t.particulas = 'brasas';
}

// ================================================================== corona_fria: el héroe se queda la Corona con la Brasa apagada
function f1(t: Toma) {
  const { pie } = salaTrono(t, FRIA, 801);
  const H = t.capa('heroe', 3, 0.55);
  const luzH: Luz = { amb: [0.78, 0.84, 0.98], desat: 0.55, clave: { dir: [-0.6, -1], k: 0.8, c: [0.9, 1, 1.25] }, bordes: [{ dx: -1, dy: -1, c: [0.85, 0.95, 1.2], k: 1.3, ancho: 1.5 }, { dx: 1, dy: -1, c: [0.55, 0.65, 0.85], k: 0.7, ancho: 1.5 }, { dx: 0, dy: -1, c: [0.9, 0.95, 1.1], k: 0.6 }] };
  const he = figura(H, undefined, heroe('s', 'quieto', 0, 7, true), pie[0], pie[1] - 60, 470, luzH);
  const hb = cajaPose(he, pie[0], pie[1] - 60), mh = mascaraPose(CW, CH, he, pie[0], pie[1] - 60);
  // escarcha: un filo blanco y fino solo en lo que mira arriba
  contraluz(H, mh, 0, -2, [0.75, 0.82, 0.95], 0.8, undefined, 0.6);
  // el vaho de la boca, que sube y se deshace
  const HV = t.capa('vaho', 4, 0.55, 'normal', { anim: { tipo: 'latir', alfa: [0.2, 0.7], periodo_s: 3.2, notas: 'respira despacio' } });
  const bx = (hb.x0 + hb.x1) / 2 + 6, by = hb.y0 + (hb.y1 - hb.y0) * 0.14, va = M();
  for (let k = 0; k < 7; k++) disco(va, bx + k * 6 + Math.sin(k) * 4, by - k * 9, 8 + k * 4);
  for (let i = 0; i < CW * CH; i++) va.d[i] *= 0.4 + 0.6 * fbm((i % CW) / 10, Math.floor(i / CW) / 10, 3, 805);
  pintar(HV, desenfocada(va, 7), [0.72, 0.78, 0.88], 0.45);
  const F = t.capa('frente', 5, 1);
  const e = escaleraOro(F, CX, CH + 40, 640, 700, 260, 803, 0.5);
  for (let i = 0; i < CW * CH; i++) { const j = i * 4, g = (F.d[j] + F.d[j + 1] + F.d[j + 2]) / 3; F.d[j] = F.d[j] * 0.4 + g * 0.6 * 0.9; F.d[j + 1] = F.d[j + 1] * 0.4 + g * 0.6; F.d[j + 2] = F.d[j + 2] * 0.4 + g * 0.6 * 1.2; }
  contraluz(F, e.esc, 0, -2, [0.75, 0.82, 0.95], 0.7, undefined, 0.6);
  const luzS: Luz = { amb: [0.34, 0.36, 0.42], desat: 0.8, bordes: [{ dx: 0, dy: -1, c: [0.7, 0.8, 1], k: 1 }] };
  figura(F, undefined, modelo('cel_estatua_suplica', 'encogido', 0, 3), 230, 820, 320, luzS);
  figura(F, undefined, modelo('cel_estatua_suplica', 'rodillas', 0, 3), 1180, 820, 320, luzS, { espejo: true });
  t.particulas = 'nieve';
}
function f2(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  cielo(C, [[0, '#05070c'], [0.45, '#1c2430'], [0.62, '#3a4454'], [1, '#080a0e']], {
    fuente: [520, 360, 600, [0.6, 0.68, 0.8], 0.4], estrellas: 300, s: 811,
    nubes: [{ y0: 200, y1: 520, seed: 812, escala: 180, cubre: 0.5, estira: 3, masa: [0.15, 0.17, 0.22], panza: [0.4, 0.45, 0.55], filo: [0.5, 0.55, 0.65], luzX: () => 0.6, alfa: 0.85 }],
  });
  granoOpaco(C, 0.015, 813);
  const I = t.capa('islas', 1, 0.25);
  const luzI: Luz = { amb: [0.34, 0.36, 0.42], desat: 0.8, clave: { dir: [-1, -1], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: [0.7, 0.8, 1], k: 1 }], niebla: { c: [0.25, 0.28, 0.34], k: 0.4 } };
  for (const [x, y, al, v] of [[260, 380, 200, 'con_estatua'], [620, 300, 140, 'chica'], [1150, 420, 240, 'con_columnas']] as [number, number, number, string][]) figura(I, undefined, modelo('cel_isla_ruinas', v, 0, 2), x, y, al, luzI);
  const aI = M(); for (let i = 0; i < CW * CH; i++) aI.d[i] = I.d[i * 4 + 3]; contraluz(I, aI, 0, -3, [0.8, 0.86, 1], 0.9, undefined, 0.8);
  const B = t.capa('borde', 2, 0.7);
  const bo = M(); rellenar(bo, [[560, CH + 5], [600, 700], [760, 660], [1000, 650], [1250, 670], [1420, 660], [1420, CH + 5]]);
  pintarConRuido(B, bo, [0.32, 0.26, 0.16], 0.3, 20, 815);
  const nb = M(); rellenar(nb, [[600, 702], [760, 662], [1000, 652], [1250, 672], [1420, 662], [1420, 690], [1250, 694], [1000, 676], [760, 688], [610, 724]]); desenfocar(nb.d, CW, CH, 3); pintarConRuido(B, nb, [0.62, 0.66, 0.76], 0.08, 30, 816);
  contraluz(B, bo, -2, -2, [0.7, 0.8, 1], 0.7);
  figura(B, undefined, heroe('no', 'quieto', 0, 5, true), 820, 670, 260, { amb: [0.6, 0.65, 0.78], desat: 0.5, clave: { dir: [-1, -0.5], k: 0.7, c: [0.9, 1, 1.2] }, bordes: [{ dx: -1, dy: -1, c: [0.8, 0.9, 1.15], k: 1.3 }, { dx: 0, dy: -1, c: [0.8, 0.88, 1], k: 0.6 }] });
  t.particulas = 'nieve';
}

export const PINTORES_C: Record<string, (t: Toma) => void> = {
  'acto_7/p1_cae': a7p1, 'acto_7/p2_corona': a7p2,
  'acto_7_vigilia/v1_auren': v1, 'acto_7_vigilia/v2_boveda': v2, 'acto_7_vigilia/v3_vela': v3,
  'acto_7_cielo/c1_mira': c1, 'acto_7_cielo/c2_dioses': c2, 'acto_7_cielo/c3_alba': c3,
  'acto_7_rey_ceniza/r1_trono': r1, 'acto_7_rey_ceniza/r2_mundo': r2,
  'acto_7_corona_fria/f1_trono': f1, 'acto_7_corona_fria/f2_invierno': f2,
};
