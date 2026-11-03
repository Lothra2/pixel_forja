import { rng } from '../core/rng';
import {
  mascara, rellenar, trazo, disco, polilinea, desenfocar, desenfocada, pintar, brillo, halo, mezcla, sat, suave, fbm, hex,
  type Lamina, type Mascara, type C3, type P2,
} from './cine';
import { arbolMuerto, lapida, aguja, ruina, type TipoLapida } from './siluetas';
import { renderCatedral } from './portada';
import {
  iluminar, poner, contraluz, niebla, lluvia, motas, reflejo, chorreado, charco, salpicar, pintarSangre, haces, estela, osario, sillares, sombraPie,
  cajaPose, mascaraPose, emiteFuego, emiteOro, losas, montonCuerpos, type Luz, type Pose, type Modelo,
} from './estudio';
import {
  CW, CH, CX, Toma, alumbrar, sombraVertical, granoOpaco, cielo, lomas, pintarConRuido, pasto, fogata, figura, modelo, heroe, npc, barco, brillosAgua,
} from './cine_toma';

/**
 * Pintores de los planos de los actos 1 a 3 (Velmora, Sahrim, Yhuantl). Coordenadas de la capa de 1408 x 792; la
 * pantalla base va en (64, 36). Cada plano pone sus capas de atrás hacia adelante y registra sus efectos animados.
 */

const ROJO: C3 = [1, 0.22, 0.06], BRASA: C3 = [1, 0.42, 0.1], FRIO: C3 = [0.38, 0.45, 0.62];
let catedral: { img: import('./cine').Lamina; puerta: P2 } | null = null;
/** La catedral de Santa Oria (el modelo del juego) una sola vez por proceso. */
export const catedralOria = () => (catedral ??= renderCatedral('herida'));
const M = () => mascara(CW, CH);

// ================================================================== ACTO 1: VELMORA
/** El Pozo de la Brasa: osario abovedado, la boca del pozo encendida y la Abadesa que cae con el pecho reventado. */
function a1p1(t: Toma) {
  const F = t.capa('fondo', 0, 0.25, 'normal', { opaca: true });
  cielo(F, [[0, '#050304'], [0.55, '#100605'], [1, '#040202']]);
  // el muro del fondo es un osario: filas de cráneos con las cuencas negras
  const cr = M(), hu = M();
  osario(cr, hu, -20, 20, CW + 20, 640, 19, 11);
  pintarConRuido(F, cr, [0.2, 0.15, 0.115], 0.3, 14, 12);
  pintar(F, hu, [0.012, 0.004, 0.004], 0.95);
  // muros laterales y el arco apuntado que abre al osario
  const muro = M(), juntas = M();
  rellenar(muro, [[-10, -10], [CW + 10, -10], [CW + 10, 700], [1080, 700], [1060, 300], [980, 150], [CX, 40], [430, 150], [350, 300], [330, 700], [-10, 700]]);
  sillares(juntas, -10, -10, CW + 10, 700, 46, 92, 13);
  for (let i = 0; i < CW * CH; i++) juntas.d[i] *= muro.d[i];
  pintarConRuido(F, muro, [0.13, 0.1, 0.095], 0.4, 26, 14);
  pintar(F, juntas, [0.02, 0.01, 0.01], 0.85);
  // nichos con calaveras en los muros laterales
  for (const [x, y] of [[150, 220], [150, 430], [1258, 220], [1258, 430]] as P2[]) {
    const n = M(); rellenar(n, [[x - 46, y + 70], [x - 46, y], [x, y - 40], [x + 46, y], [x + 46, y + 70]]); pintar(F, n, [0.02, 0.008, 0.008], 0.95);
    const c2 = M(), h2 = M(); osario(c2, h2, x - 40, y + 4, x + 40, y + 66, 13, x); for (let i = 0; i < CW * CH; i++) { c2.d[i] *= n.d[i]; h2.d[i] *= n.d[i]; }
    pintar(F, c2, [0.22, 0.17, 0.13], 0.9); pintar(F, h2, [0, 0, 0], 0.9);
  }
  contraluz(F, muro, x0dir(), 0, [0.5, 0.14, 0.05], 0.8);
  losas(F, 640, CH, [0.06, 0.035, 0.03], 15, [CX, 640], 7);
  // todo lo alumbra el pozo, de abajo hacia arriba
  sombraVertical(F, 0, 600, 0.55, false);
  alumbrar(F, CX, 660, 760, [2.2, 0.7, 0.25], 1.4, 0.8);
  alumbrar(F, CX, 660, 300, [2, 0.9, 0.4], 1, 0.5);
  granoOpaco(F, 0.02, 16);

  // la boca del pozo: anillo de piedra con el fuego adentro
  const P = t.capa('pozo', 1, 0.4);
  const cx = CX, cy = 662, rx = 250, ry = 58;
  const anillo = M(), hueco = M();
  const elipse = (m: Mascara, rx2: number, ry2: number, dy = 0, v = 1) => rellenar(m, Array.from({ length: 48 }, (_, k) => { const a = (k / 48) * Math.PI * 2; return [cx + Math.cos(a) * rx2, cy + dy + Math.sin(a) * ry2] as P2; }), v);
  elipse(anillo, rx + 34, ry + 18, 14); rellenar(anillo, [[cx - rx - 34, cy + 14], [cx + rx + 34, cy + 14], [cx + rx + 30, cy + 64], [cx - rx - 30, cy + 64]]);
  elipse(hueco, rx, ry);
  pintarConRuido(P, anillo, [0.16, 0.1, 0.085], 0.35, 12, 17);
  const piedras = M(); for (let k = 0; k < 26; k++) { const a = (k / 26) * Math.PI * 2; trazo(piedras, cx + Math.cos(a) * (rx - 4), cy + Math.sin(a) * (ry - 2), cx + Math.cos(a) * (rx + 34), cy + 14 + Math.sin(a) * (ry + 18), 2, 2, 1, 'max', false); }
  for (let x = cx - rx - 30; x < cx + rx + 30; x += 36) trazo(piedras, x, cy + 30, x + 4, cy + 64, 2, 2, 1, 'max', false);
  pintar(P, piedras, [0.02, 0.01, 0.01], 0.8);
  // adentro: negro arriba, fuego abajo
  for (let y = cy - ry; y < cy + ry; y++) for (let x = cx - rx; x < cx + rx; x++) {
    const i = y * CW + x, a = hueco.d[i]; if (a <= 0) continue;
    const u = (x - cx) / rx, v = (y - cy) / ry, k = sat(0.4 + v * 0.6) * (1 - u * u) * (0.7 + 0.6 * fbm(x / 18, y / 6, 3, 18)), j = i * 4;
    const c = mezcla([0.05, 0.005, 0.0], [1.6, 0.6, 0.2], k);
    P.d[j] = P.d[j] * (1 - a) + c[0] * a; P.d[j + 1] = P.d[j + 1] * (1 - a) + c[1] * a; P.d[j + 2] = P.d[j + 2] * (1 - a) + c[2] * a; P.d[j + 3] = Math.max(P.d[j + 3], a);
  }
  // el filo de adentro del anillo, encendido
  contraluz(P, anillo, 0, 4, [1.2, 0.4, 0.1], 1.2);
  // charcos y salpicaduras de sangre en las losas
  const sg = M(); charco(sg, cx - 340, 742, 120, 22, 19); charco(sg, cx + 320, 728, 80, 14, 20); salpicar(sg, cx + 120, 720, 160, 0.1, 30, 21);
  pintarSangre(P, sg, [1, 0.35, 0.15], 0.95, 0.7);

  const PL = t.capa('pozo_luz', 2, 0.4, 'sumar', { anim: { tipo: 'latir', alfa: [0.75, 1], periodo_s: 1.8 } });
  haces(PL, cx, cy, -Math.PI / 2, 0.42, 720, [1, 0.32, 0.08], 0.8, 22);
  halo(PL, cx, cy - 10, 330, [1, 0.3, 0.07], 0.9, 0.45, true);
  halo(PL, cx, cy, 160, [1, 0.6, 0.25], 0.8, 0.35, true);

  // la Abadesa: cae hacia atrás con los brazos abiertos, el pecho abierto por la brasa que se escapa
  const A = t.capa('abadesa', 3, 0.55), AL = t.capa('abadesa_luz', 4, 0.55, 'sumar', { anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 6 } });
  const luzAb: Luz = { amb: [0.66, 0.56, 0.58], desat: 0.2, clave: { dir: [0, 1], k: 0.55, c: [1.25, 0.85, 0.75] }, bordes: [{ dx: 0, dy: 1, c: [1.2, 0.35, 0.1], k: 1.5, ancho: 2 }, { dx: -1, dy: -1, c: FRIO, k: 0.35 }], abajo: { c: [1, 0.3, 0.08], k: 0.9 }, emite: emiteFuego };
  const ab = figura(A, AL, modelo('jefe_abadesa_morir', 's', 2, 3), cx, cy - 10, 600, luzAb);
  const b = cajaPose(ab, cx, cy - 10), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const pecho: P2 = [(b.x0 + b.x1) / 2, b.y0 + bh * 0.4];
  const sangre = M(), herida = M();
  rellenar(herida, Array.from({ length: 18 }, (_, k) => { const a = (k / 18) * Math.PI * 2, q = 0.7 + 0.5 * fbm(Math.cos(a) * 2 + 3, Math.sin(a) * 2, 2, 23); return [pecho[0] + Math.cos(a) * 22 * q, pecho[1] + Math.sin(a) * 30 * q] as P2; }));
  chorreado(sangre, pecho[0], pecho[1] + 16, 46, bh * 0.45, 24);
  chorreado(sangre, pecho[0] - bw * 0.06, b.y0 + bh * 0.2, 12, 60, 25);
  const mab = mascaraPose(CW, CH, ab, cx, cy - 10); for (let i = 0; i < CW * CH; i++) sangre.d[i] *= mab.d[i] > 0.3 ? 1 : 0.25;
  pintarSangre(A, sangre, [1, 0.3, 0.12], 0.95, 0.6);
  pintar(A, herida, [0.25, 0.02, 0.01], 1);
  brillo(AL, herida, [1, 0.5, 0.15], 1.6); halo(AL, pecho[0], pecho[1], 90, [1, 0.35, 0.08], 1, 1, true);
  // la brasa que se escapa hacia arriba, con su estela
  const pts: P2[] = []; for (let k = 0; k <= 30; k++) { const u = k / 30; pts.push([pecho[0] + Math.sin(u * 3) * 30 * u, pecho[1] - u * (pecho[1] - 70)]); }
  estela(AL, pts, 7, BRASA, 1.1);
  t.rayos('rayos', 4.5, 0.45, 4, pecho[0], pecho[1], 0.5, 0.45, { tipo: 'latir', alfa: [0.6, 1], periodo_s: 1.8 });

  // primer plano: los colgados de los ganchos a la izquierda, huesos y velas a la derecha
  t.particulas = 'brasas';
  const Fr = t.capa('frente', 5, 1);
  const luzFr: Luz = { amb: [0.34, 0.27, 0.27], desat: 0.3, clave: { dir: [1, 0.3], k: 0.7 }, bordes: [{ dx: 1, dy: 0, c: [1.1, 0.3, 0.08], k: 1.4, ancho: 2 }], abajo: { c: [0.6, 0.12, 0.03], k: 0.5 } };
  const col = figura(Fr, undefined, modelo('hor_colgados', 'ganchos', 0, 3), 170, 860, 760, luzFr);
  const cc = cajaPose(col, 170, 860);
  const go = M(); charco(go, 200, 778, 110, 18, 26); pintarSangre(Fr, go, [1, 0.3, 0.1], 0.95, 0.5);
  const hue = M(); montonCuerpos(hue, 1080, 1420, 812, 150, 27);
  const cr2 = M(), hu2 = M(); osario(cr2, hu2, 1110, 690, 1420, 800, 15, 28); for (let i = 0; i < CW * CH; i++) { cr2.d[i] *= hue.d[i] > 0.2 ? 1 : 0; hu2.d[i] *= cr2.d[i]; }
  pintar(Fr, hue, [0.03, 0.018, 0.016]); pintarConRuido(Fr, cr2, [0.2, 0.13, 0.1], 0.3, 10, 29); pintar(Fr, hu2, [0, 0, 0], 0.9);
  contraluz(Fr, hue, -2, 2, [1, 0.3, 0.08], 1);
  // candelabro de hierro con velas
  const can = M(); trazo(can, 1180, 700, 1180, 470, 7, 5); trazo(can, 1120, 520, 1240, 520, 5, 5); for (const x of [1120, 1150, 1180, 1210, 1240]) { trazo(can, x, 520, x, 500, 4, 4); rellenar(can, [[x - 6, 500], [x + 6, 500], [x + 5, 474 - (x % 3) * 6], [x - 5, 474 - (x % 3) * 6]]); }
  rellenar(can, [[1150, 712], [1210, 712], [1196, 690], [1164, 690]]);
  pintar(Fr, can, [0.025, 0.018, 0.016]); contraluz(Fr, can, -2, 1, [1, 0.35, 0.1], 0.9);
  const velas = [1120, 1150, 1180, 1210, 1240].map((x) => [x, 474 - (x % 3) * 6, 0.32] as [number, number, number]);
  t.efecto({ tipo: 'sprite', hoja: 'fuego', en: velas, fps: 12, mezcla: 'sumar', despues_de: 'frente', paralaje: 1 });
  const vl = t.capa('velas_luz', 6, 1, 'sumar', { anim: { tipo: 'titilar', alfa: [0.75, 1], hz: 8 } });
  for (const [x, y] of velas) halo(vl, x, y - 10, 70, [1, 0.5, 0.15], 0.6, 1, true);
  t.efecto({ tipo: 'sprite', hoja: 'goteo_sangre', en: [[cc.x0 + (cc.x1 - cc.x0) * 0.35, cc.y0 + (cc.y1 - cc.y0) * 0.78, 1], [cc.x0 + (cc.x1 - cc.x0) * 0.62, cc.y0 + (cc.y1 - cc.y0) * 0.72, 0.9], [pecho[0] - 8, pecho[1] + bh * 0.42, 1]], fps: 12, mezcla: 'normal', despues_de: 'frente', paralaje: 1 });
}
/** Hacia dónde mira el filo del muro (hacia el centro): se usa el lado izquierdo; el derecho lo alumbra el pozo. */
const x0dir = () => 2;

/** Afuera: la brasa sale por el campanario de Santa Oria y se va al sur; las campanas doblan; camposanto con horca. */
function a1p2(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  const sx = 860, sy = 210, luzX = (x: number) => 0.18 + 1.1 * Math.exp(-(((x - 520) / 360) ** 2));
  cielo(C, [[0, '#040408'], [0.35, '#0c0b14'], [0.6, '#24121a'], [0.7, '#3a1612'], [0.76, '#1c0b0a'], [1, '#080506']], {
    fuente: [520, 260, 520, [0.6, 0.18, 0.06], 0.55], estrellas: 160, s: 31,
    nubes: [
      { y0: -40, y1: 330, seed: 131, escala: 240, cubre: 0.6, masa: [0.03, 0.03, 0.045], panza: [0.6, 0.2, 0.08], filo: [0.22, 0.24, 0.32], luzX },
      { y0: 200, y1: 520, seed: 137, escala: 170, cubre: 0.5, estira: 3, masa: [0.05, 0.035, 0.045], panza: [0.95, 0.32, 0.1], filo: [0.2, 0.18, 0.24], luzX, alfa: 0.9 },
    ],
  });
  granoOpaco(C, 0.015, 32);
  // la estela de la brasa: sube del campanario, se curva y se va hacia el sur (izquierda)
  const E = t.capa('estela', 1, 0.1, 'sumar', { anim: { tipo: 'latir', alfa: [0.8, 1], periodo_s: 1.2 } });
  const pts: P2[] = []; for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push([sx - u * 600 - Math.sin(u * 2) * 40, sy + 120 - Math.sin(u * Math.PI * 0.9) * 230 + u * 40]); }
  estela(E, pts, 6, BRASA, 1.2);
  // la luz que deja en las nubes de abajo
  for (const [x, y] of pts.filter((_, k) => k % 6 === 0)) halo(E, x, y + 30, 150, [0.6, 0.18, 0.05], 0.18, 0.6, true);

  // la abadía: el modelo de Santa Oria, oscuro y frío, con su luz roja aparte (late con las campanas)
  const A = t.capa('abadia', 2, 0.3), AL = t.capa('abadia_luz', 3, 0.3, 'sumar', { anim: { tipo: 'latir', alfa: [0.55, 1], periodo_s: 2.2, notas: 'cada pico es un golpe de campana' } });
  const loma = lomas(A, 610, 26, 33, [0.03, 0.025, 0.03], { escala: 420, filo: [0.4, 0.14, 0.06], kFilo: 0.6, deform: (x) => -60 * Math.exp(-(((x - 900) / 330) ** 2)) });
  const cat = catedralOria();
  const pc = iluminar({ img: cat.img, ancla: cat.puerta }, 470, { amb: [0.34, 0.33, 0.42], desat: 0.55, clave: { dir: [-1, -0.3], k: 0.5 }, bordes: [{ dx: -1, dy: -1, c: [0.9, 0.35, 0.12], k: 0.9 }, { dx: 1, dy: 0, c: FRIO, k: 0.3 }], emite: emiteFuego, cEmite: [1, 0.22, 0.06], kEmite: 1.8 });
  poner(A, pc, 900, 560, AL);
  // el campanario que despide la brasa
  halo(AL, sx, sy + 120, 120, [1, 0.45, 0.12], 1.1, 1, true);
  for (let i = 0; i < CW * CH; i++) loma.d[i] = Math.max(loma.d[i], 0);
  niebla(A, 520, 640, [0.12, 0.07, 0.08], 0.55, 34, 200);

  const N = t.capa('niebla', 4, 0.5, 'normal', { anim: { tipo: 'deriva', px_por_segundo: 8, enrollar: true } });
  niebla(N, 560, 720, [0.13, 0.09, 0.1], 0.6, 35, 220, CW);

  t.particulas = 'lluvia';
  // primer plano: el camposanto con la horca de los cuervos y un árbol muerto
  const Fr = t.capa('frente', 5, 1);
  const suelo = M(), sueloEn = (x: number) => 690 - 70 * Math.abs((x - CX) / CX) ** 2.5;
  rellenar(suelo, [[-10, CH + 5], ...Array.from({ length: 80 }, (_, k) => { const x = -10 + (k / 79) * (CW + 20); return [x, sueloEn(x) + (fbm(x / 60, 1, 3, 36) - 0.5) * 16] as P2; }), [CW + 10, CH + 5]]);
  const r = rng(37);
  for (let k = 0; k < 14; k++) { const x = 60 + r() * (CW - 120); if (Math.abs(x - CX) < 160) continue; lapida(suelo, x, sueloEn(x) + 6, 50 + r() * 70 * (Math.abs(x - CX) / CX + 0.5), (['redonda', 'cruz', 'celta', 'ojiva', 'rota'] as TipoLapida[])[Math.floor(r() * 5)], (r() - 0.5) * 0.35); }
  arbolMuerto(suelo, 90, sueloEn(90) + 8, 640, 38, { inclina: 0.14, grosor: 0.07 });
  pasto(suelo, 0, CW, sueloEn, 700, 22, 39);
  pintar(Fr, suelo, [0.02, 0.014, 0.016]);
  contraluz(Fr, suelo, -2, -2, [0.7, 0.22, 0.08], 0.7);
  const luzH: Luz = { amb: [0.32, 0.27, 0.3], desat: 0.35, clave: { dir: [-1, -0.4], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: [1, 0.35, 0.1], k: 1.2, ancho: 2 }, { dx: 1, dy: 0, c: FRIO, k: 0.35 }] };
  const ho = figura(Fr, undefined, modelo('hor_cuervos_cadaver', 'horca', 0, 3), 1180, sueloEn(1180) + 30, 520, luzH);
  const hc = cajaPose(ho, 1180, sueloEn(1180) + 30);
  t.efecto({ tipo: 'sprite', hoja: 'goteo_sangre', en: [[hc.x0 + (hc.x1 - hc.x0) * 0.5, hc.y0 + (hc.y1 - hc.y0) * 0.6, 0.8]], fps: 12, mezcla: 'normal', despues_de: 'frente', paralaje: 1 });
  t.efecto({ tipo: 'sprite', hoja: 'cuervo', en: [[700, 300, 0.7], [770, 260, 0.55], [640, 250, 0.5], [820, 330, 0.6], [560, 320, 0.45]], fps: 10, mezcla: 'normal', despues_de: 'abadia_luz', paralaje: 0.4 });
}

/** El cruce del páramo: la horca, el camino al sur y la estrella roja que cae; el héroe de espaldas con la Marca. */
function a1p3(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  const hx = 470, hy = 470, luzX = (x: number) => 0.2 + 1.2 * Math.exp(-(((x - hx) / 420) ** 2));
  cielo(C, [[0, '#06080e'], [0.4, '#141826'], [0.54, '#3a2a30'], [0.6, '#7a3a24'], [0.63, '#a6522a'], [0.66, '#3a1a14'], [1, '#0a0707']], {
    fuente: [hx, hy, 560, [0.7, 0.3, 0.1], 0.5],
    nubes: [
      { y0: -30, y1: 300, seed: 141, escala: 230, cubre: 0.62, masa: [0.04, 0.045, 0.06], panza: [0.55, 0.25, 0.14], filo: [0.25, 0.27, 0.34], luzX },
      { y0: 250, y1: 470, seed: 143, escala: 140, cubre: 0.42, estira: 5, masa: [0.08, 0.05, 0.06], panza: [1, 0.45, 0.16], filo: [0.3, 0.2, 0.2], luzX, alfa: 0.85 },
    ],
  });
  granoOpaco(C, 0.015, 42);
  const B = t.capa('brasa', 1, 0.08, 'sumar', { anim: { tipo: 'latir', alfa: [0.7, 1], periodo_s: 1.4 } });
  estela(B, Array.from({ length: 24 }, (_, k) => [hx + 140 - k * 5, hy - 220 + k * 9] as P2), 4, BRASA, 1.1);
  const L1 = t.capa('lejos', 2, 0.2);
  lomas(L1, 508, 20, 44, [0.11, 0.08, 0.09], { escala: 260, filo: [0.8, 0.35, 0.12], kFilo: 0.6 });
  const ab = M(); rellenar(ab, [[1110, 506], [1110, 470], [1190, 470], [1190, 506]]); aguja(ab, 1124, 472, 14, 70); aguja(ab, 1170, 472, 12, 56);
  pintar(L1, ab, [0.09, 0.065, 0.075]); const vit = M(); for (const x of [1124, 1150, 1170]) disco(vit, x, 486, 2.2); brillo(L1, vit, ROJO, 1.4); brillo(L1, desenfocada(vit, 5), ROJO, 1.6);
  niebla(L1, 470, 560, [0.24, 0.15, 0.15], 0.6, 45, 200);
  // el páramo medio: el camino que se va al sur, la horca y las picas
  const Md = t.capa('medio', 3, 0.5);
  const tierra = lomas(Md, 600, 22, 46, [0.045, 0.035, 0.035], { escala: 300, filo: [0.9, 0.4, 0.14], kFilo: 0.7 });
  const cam = M(), ci: P2[] = [], cd: P2[] = [];
  for (let k = 0; k <= 30; k++) { const u = k / 30, y = 556 + u * 240, x = hx + 60 + Math.sin(u * 3.4) * 120 * u + u * 240, w = 4 + u * u * 160; ci.push([x - w, y]); cd.push([x + w, y]); }
  rellenar(cam, [...ci, ...cd.reverse()]); for (let i = 0; i < CW * CH; i++) cam.d[i] *= tierra.d[i];
  pintarConRuido(Md, cam, [0.09, 0.065, 0.06], 0.4, 18, 47);
  const charcos = M(); for (let i = 0; i < CW * CH; i++) charcos.d[i] = cam.d[i] * suave(0.6, 0.66, fbm((i % CW) / 40, Math.floor(i / CW) / 9, 3, 48));
  pintar(Md, charcos, [0.75, 0.38, 0.18], 0.5, 'normal');
  const luzM: Luz = { amb: [0.3, 0.26, 0.3], desat: 0.4, clave: { dir: [-1, -0.2], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: [1, 0.45, 0.15], k: 1.1, ancho: 1.5 }], niebla: { c: [0.18, 0.1, 0.1], k: 0.18 } };
  const hp = figura(Md, undefined, modelo('par_horca', 'ahorcado', 0, 2.4), 300, 640, 330, luzM);
  figura(Md, undefined, modelo('hor_cabezas_picas', 'tres', 0, 2.4), 860, 650, 230, luzM);
  const sp = M(); const hpc = cajaPose(hp, 300, 640); charco(sp, (hpc.x0 + hpc.x1) / 2 + 20, 642, 40, 7, 49, 6); pintarSangre(Md, sp, [1, 0.4, 0.15], 0.9, 0.5);
  niebla(Md, 600, 720, [0.12, 0.08, 0.09], 0.45, 50, 200);
  // el héroe, de espaldas, mirando al sur; la Marca le late en el brazo
  const Hh = t.capa('heroe', 4, 0.8), HL = t.capa('marca', 5, 0.8, 'sumar', { anim: { tipo: 'latir', alfa: [0.4, 1], periodo_s: 1.6, notas: 'la Marca: late como un corazón' } });
  const luzHe: Luz = { amb: [0.42, 0.38, 0.42], desat: 0.3, clave: { dir: [-1, -0.3], k: 0.75 }, bordes: [{ dx: -1, dy: 0, c: [1.1, 0.5, 0.18], k: 1.5, ancho: 2.2 }, { dx: 1, dy: -1, c: FRIO, k: 0.35 }] };
  const he = figura(Hh, undefined, heroe('no', 'quieto', 0, 6), 960, 818, 560, luzHe);
  const hb = cajaPose(he, 960, 818);
  const mano: P2 = [hb.x0 + (hb.x1 - hb.x0) * 0.2, hb.y0 + (hb.y1 - hb.y0) * 0.52];
  halo(HL, mano[0], mano[1], 46, [1, 0.3, 0.08], 1.1, 1, true); halo(HL, mano[0], mano[1], 10, [1, 0.7, 0.4], 1.2, 1, true);
  t.particulas = 'ceniza';
  const Fr = t.capa('frente', 6, 1);
  const fr = M(); rellenar(fr, [[-10, CH + 5], [-10, 700], [120, 690], [260, 720], [380, 760], [460, CH + 5]]); rellenar(fr, [[1240, CH + 5], [1300, 740], [1408, 700], [1420, CH + 5]]);
  pasto(fr, -10, 460, (x) => 700 + x * 0.12, 220, 40, 51); pasto(fr, 1240, 1420, () => 720, 90, 40, 52);
  const cruz = M(); trazo(cruz, 120, 700, 128, 420, 9, 7, 1, 'max', false); trazo(cruz, 80, 480, 176, 470, 7, 7, 1, 'max', false); rellenar(cruz, [[60, 470], [124, 440], [200, 456], [130, 490]]);
  pintar(Fr, fr, [0.012, 0.01, 0.012]); pintar(Fr, cruz, [0.02, 0.015, 0.016]);
  contraluz(Fr, cruz, -2, 0, [1, 0.45, 0.15], 0.9); contraluz(Fr, fr, -2, -2, [0.8, 0.35, 0.12], 0.6);
  t.efecto({ tipo: 'sprite', hoja: 'cuervo', en: [[420, 360, 0.4], [470, 330, 0.35], [380, 340, 0.3]], fps: 9, mezcla: 'normal', despues_de: 'lejos', paralaje: 0.2 });
}

export const PINTORES_A: Record<string, (t: Toma) => void> = {
  'acto_1/p1_abadesa': a1p1, 'acto_1/p2_campanas': a1p2, 'acto_1/p3_camino': a1p3,
};
