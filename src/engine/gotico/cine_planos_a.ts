import { rng } from '../core/rng';
import {
  mascara, rellenar, trazo, disco, polilinea, desenfocar, desenfocada, pintar, brillo, halo, mezcla, sat, suave, fbm,
  type Lamina, type Mascara, type C3, type P2,
} from './cine';
import { arbolMuerto, lapida, aguja, ruina, perfil, type TipoLapida } from './siluetas';
import { renderCatedral } from './portada';
import {
  iluminar, poner, contraluz, niebla, reflejo, chorreado, charco, salpicar, pintarSangre, haces, estela, osario, sillares,
  cajaPose, mascaraPose, emiteFuego, emiteOro, losas, montonCuerpos, grietas, modeloPersonaje as modeloPersonajeX, type Luz, type Modelo,
} from './estudio';
import {
  CW, CH, CX, Toma, alumbrar, sombraVertical, granoOpaco, cielo, lomas, pintarConRuido, pasto, figura, modelo, heroe, barco, brillosAgua,
} from './cine_toma';
import { fuegoEnVentanas, mascaraLuzPose } from './cine_ventanas';

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
  osario(cr, hu, -20, 20, CW + 20, 640, 15, 11);
  pintarConRuido(F, cr, [0.15, 0.11, 0.085], 0.45, 9, 12);
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
  sombraVertical(F, 0, 620, 0.7, false);
  const hollin = M(); for (let i = 0; i < CW * CH; i++) hollin.d[i] = suave(0.45, 0.75, fbm((i % CW) / 140, Math.floor(i / CW) / 90, 4, 161)) * 0.7; pintar(F, hollin, [0.01, 0.005, 0.005], 0.8);
  alumbrar(F, CX, 660, 640, [2.2, 0.7, 0.25], 1.25, 0.85);
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
  const ab = figura(A, AL, modelo('jefe_abadesa_morir', 's', 2, 3), cx, cy - 10, 520, luzAb);
  const b = cajaPose(ab, cx, cy - 10), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const pecho: P2 = [(b.x0 + b.x1) / 2, b.y0 + bh * 0.4];
  const sangre = M(), herida = M();
  rellenar(herida, Array.from({ length: 18 }, (_, k) => { const a = (k / 18) * Math.PI * 2, q = 0.7 + 0.5 * fbm(Math.cos(a) * 2 + 3, Math.sin(a) * 2, 2, 23); return [pecho[0] + Math.cos(a) * 13 * q, pecho[1] + Math.sin(a) * 19 * q] as P2; }));
  chorreado(sangre, pecho[0], pecho[1] + 16, 46, bh * 0.45, 24);
  chorreado(sangre, pecho[0] - bw * 0.06, b.y0 + bh * 0.2, 12, 60, 25);
  const mab = mascaraPose(CW, CH, ab, cx, cy - 10); for (let i = 0; i < CW * CH; i++) sangre.d[i] *= mab.d[i] > 0.3 ? 1 : 0.25;
  pintarSangre(A, sangre, [1, 0.3, 0.12], 0.95, 0.6);
  pintar(A, herida, [0.12, 0.01, 0.005], 1);
  const nucleo = M(); disco(nucleo, pecho[0], pecho[1] - 2, 6); brillo(AL, desenfocada(herida, 4), [1, 0.3, 0.06], 0.9); brillo(AL, nucleo, [1, 0.8, 0.5], 1.4); halo(AL, pecho[0], pecho[1], 70, [1, 0.35, 0.08], 0.8, 1, true);
  // la brasa que se escapa hacia arriba, con su estela
  const pts: P2[] = []; for (let k = 0; k <= 30; k++) { const u = k / 30; pts.push([pecho[0] + Math.sin(u * 3) * 30 * u, pecho[1] - u * (pecho[1] - 70)]); }
  estela(AL, pts, 7, BRASA, 1.1);
  t.rayos('rayos', 4.5, 0.45, 4, pecho[0], pecho[1], 0.5, 0.45, { tipo: 'latir', alfa: [0.6, 1], periodo_s: 1.8 });

  // primer plano: los colgados de los ganchos a la izquierda, huesos y velas a la derecha
  t.particulas = 'brasas';
  const Fr = t.capa('frente', 5, 1);
  const luzFr: Luz = { amb: [0.34, 0.27, 0.27], desat: 0.3, clave: { dir: [1, 0.3], k: 0.7 }, bordes: [{ dx: 1, dy: 0, c: [1.1, 0.3, 0.08], k: 1.4, ancho: 2 }], abajo: { c: [0.6, 0.12, 0.03], k: 0.5 } };
  const col = figura(Fr, undefined, modelo('hor_colgados', 'ganchos', 0, 3), 170, 860, 660, luzFr);
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
  if (!t.carta) {
    const E = t.capa('estela', 1, 0.1, 'sumar', { anim: { tipo: 'latir', alfa: [0.8, 1], periodo_s: 1.2 } });
    const pts: P2[] = []; for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push([sx - u * 600 - Math.sin(u * 2) * 40, sy + 120 - Math.sin(u * Math.PI * 0.9) * 230 + u * 40]); }
    estela(E, pts, 6, BRASA, 1.2);
    // la luz que deja en las nubes de abajo
    for (const [x, y] of pts.filter((_, k) => k % 6 === 0)) halo(E, x, y + 30, 150, [0.6, 0.18, 0.05], 0.18, 0.6, true);
  }

  // la abadía: el modelo de Santa Oria, oscuro y frío, con su luz roja aparte (late con las campanas)
  const A = t.capa('abadia', 2, 0.3), AL = t.capa('abadia_luz', 3, 0.3, 'sumar', { anim: { tipo: 'latir', alfa: [0.55, 1], periodo_s: 2.2, notas: 'cada pico es un golpe de campana' } });
  lomas(A, 640, 26, 33, [0.03, 0.025, 0.03], { escala: 420, filo: [0.4, 0.14, 0.06], kFilo: 0.6 });
  const cat = catedralOria();
  const pc = iluminar({ img: cat.img, ancla: cat.puerta }, 470, { amb: [0.34, 0.33, 0.42], desat: 0.55, clave: { dir: [-1, -0.3], k: 0.5 }, bordes: [{ dx: -1, dy: -1, c: [0.9, 0.35, 0.12], k: 0.9 }, { dx: 1, dy: 0, c: FRIO, k: 0.3 }], emite: emiteFuego, cEmite: [1, 0.22, 0.06], kEmite: 1.8 });
  poner(A, pc, 900, 560, AL);
  // detrás de los vitrales de la abadía arde fuego de Doom (tira que empalma, se suma encima de su luz)
  fuegoEnVentanas(t, 'abadia_fuego', 3.5, 0.3, mascaraLuzPose(pc, 900, 560), { paleta: 'infierno', semilla: 1201, alto_px: 18, celda: 1, fondo: { c: [0.5, 0.1, 0.03], k: 0.2 }, k: 0.8 });
  const cb = cajaPose(pc, 900, 560), monte = M();
  rellenar(monte, [[-10, CH + 4], ...Array.from({ length: 90 }, (_, k) => { const x = -10 + (k / 89) * (CW + 20), u = (x - (cb.x0 + cb.x1) / 2) / ((cb.x1 - cb.x0) * 1.1); return [x, Math.min(650, cb.y1 - 30 + Math.max(0, Math.abs(u) - 0.35) ** 1.5 * 160) + (fbm(x / 30, 2, 3, 171) - 0.5) * 14] as P2; }), [CW + 10, CH + 4]]);
  pintar(A, monte, [0.025, 0.02, 0.025]); contraluz(A, monte, 0, 3, [0.6, 0.2, 0.08], 0.7);
  const puertaL = M(); rellenar(puertaL, [[900 - 14, 560], [900 + 14, 560], [900 + 80, 660], [900 - 160, 680]]); desenfocar(puertaL.d, CW, CH, 18); for (let i = 0; i < CW * CH; i++) puertaL.d[i] *= monte.d[i];
  brillo(AL, puertaL, [0.9, 0.15, 0.04], 0.25);
  // el campanario que despide la brasa
  halo(AL, sx, sy + 120, 120, [1, 0.45, 0.12], 1.1, 1, true);
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
  const luzH: Luz = { amb: [0.17, 0.14, 0.16], desat: 0.5, clave: { dir: [-1, -0.4], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: [1, 0.35, 0.1], k: 0.7, ancho: 1 }, { dx: 1, dy: 0, c: FRIO, k: 0.2 }], niebla: { c: [0.08, 0.03, 0.03], k: 0.3 } };
  const ho = figura(Fr, undefined, modelo('hor_cuervos_cadaver', 'horca', 0, 3), 1150, sueloEn(1150) + 30, 470, luzH);
  const hc = cajaPose(ho, 1150, sueloEn(1150) + 30), sh = M(), mh = mascaraPose(CW, CH, ho, 1150, sueloEn(1150) + 30);
  for (let k = 0; k < 5; k++) chorreado(sh, hc.x0 + (hc.x1 - hc.x0) * (0.45 + k * 0.05), hc.y0 + (hc.y1 - hc.y0) * (0.3 + k * 0.06), 10, 70, 170 + k);
  for (let i = 0; i < CW * CH; i++) sh.d[i] *= mh.d[i];
  pintarSangre(Fr, sh, [0.9, 0.3, 0.12], 0.9, 0.5);
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
  const charcos = M(); for (let i = 0; i < CW * CH; i++) charcos.d[i] = cam.d[i] * suave(0.6, 0.66, fbm((i % CW) / 40, Math.floor(i / CW) / 9, 3, 48));
  pintar(Md, charcos, [0.95, 0.45, 0.2], 0.75, 'normal');
  const luzM: Luz = { amb: [0.17, 0.14, 0.16], desat: 0.5, clave: { dir: [-1, -0.2], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: [1, 0.45, 0.15], k: 1.1, ancho: 1.5 }], niebla: { c: [0.16, 0.09, 0.09], k: 0.22 } };
  const hp = figura(Md, undefined, modelo('hor_jaula', 'cadaver', 0, 2.6), 300, 640, 380, luzM);
  figura(Md, undefined, modelo('hor_cabezas_picas', 'tres', 0, 2.4), 860, 650, 230, luzM);
  const sp = M(); const hpc = cajaPose(hp, 300, 640); charco(sp, (hpc.x0 + hpc.x1) / 2 + 20, 642, 40, 7, 49, 6); pintarSangre(Md, sp, [1, 0.4, 0.15], 0.9, 0.5);
  niebla(Md, 600, 720, [0.12, 0.08, 0.09], 0.45, 50, 200);
  // el héroe, de espaldas, mirando al sur; la Marca le late en el brazo
  const Hh = t.capa('heroe', 4, 0.8), HL = t.capa('marca', 5, 0.8, 'sumar', { anim: { tipo: 'latir', alfa: [0.4, 1], periodo_s: 1.6, notas: 'la Marca: late como un corazón' } });
  const luzHe: Luz = { amb: [0.42, 0.37, 0.4], desat: 0.3, clave: { dir: [-1, -0.3], k: 0.85, c: [1.2, 0.9, 0.75] }, bordes: [{ dx: -1, dy: 0, c: [1.1, 0.5, 0.18], k: 1.5, ancho: 2.2 }, { dx: 1, dy: -1, c: FRIO, k: 0.35 }] };
  const he = figura(Hh, undefined, heroe('o', 'quieto', 0, 6), 980, 836, 500, luzHe);
  const hb = cajaPose(he, 960, 818);
  const mano: P2 = [hb.x0 + (hb.x1 - hb.x0) * 0.2, hb.y0 + (hb.y1 - hb.y0) * 0.52];
  halo(HL, mano[0], mano[1], 46, [1, 0.3, 0.08], 1.1, 1, true); halo(HL, mano[0], mano[1], 10, [1, 0.7, 0.4], 1.2, 1, true);
  t.particulas = 'ceniza';
  const Fr = t.capa('frente', 6, 1);
  const fr = M(); rellenar(fr, [[-10, CH + 5], [-10, 700], [120, 690], [260, 720], [380, 760], [460, CH + 5]]); rellenar(fr, [[1240, CH + 5], [1300, 740], [1408, 700], [1420, CH + 5]]);
  pasto(fr, -10, 460, (x) => 700 + x * 0.12, 220, 40, 51); pasto(fr, 1240, 1420, () => 720, 90, 40, 52);
  const cruz = M(); trazo(cruz, 120, 700, 128, 420, 9, 7, 1, 'max', false); trazo(cruz, 80, 480, 176, 470, 7, 7, 1, 'max', false); 
  pintar(Fr, fr, [0.012, 0.01, 0.012]); pintar(Fr, cruz, [0.02, 0.015, 0.016]);
  contraluz(Fr, cruz, -2, 0, [1, 0.45, 0.15], 0.9); contraluz(Fr, fr, -2, -2, [0.8, 0.35, 0.12], 0.6);
  t.efecto({ tipo: 'sprite', hoja: 'cuervo', en: [[420, 360, 0.4], [470, 330, 0.35], [380, 340, 0.3]], fps: 9, mezcla: 'normal', despues_de: 'lejos', paralaje: 0.2 });
}

// ================================================================== ACTO 2: SAHRIM
const ORO: C3 = [1, 0.72, 0.32];
/** El pálido que canta (Vesperio, el heraldo): flaco, de túnica blanca, sin pelo. */
const CANTOR: [import('./cuerpo').Cuerpo, import('./cuerpo').Equipo] = [{ genero: 'h', alto: 1.08, ancho: 0.82, musculo: 0, piel: 'cu_piel_palida', peinado: 'calvo' }, { torso: { tipo: 'tunica', mat: 'cu_tela_blanca' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_blanca' } }];

/** La Cámara del Rey sin Sombra: Khamer-Ul se deshace en arena bajo el haz que entra por el techo. */
function a2p1(t: Toma) {
  const F = t.capa('fondo', 0, 0.25, 'normal', { opaca: true });
  cielo(F, [[0, '#0a0604'], [0.5, '#1a0f08'], [1, '#070403']]);
  const muro = M(), glifos = M(), juntas = M();
  rellenar(muro, [[-10, -10], [CW + 10, -10], [CW + 10, 640], [-10, 640]]);
  sillares(juntas, -10, -10, CW + 10, 640, 58, 120, 201);
  const r = rng(202);
  for (let fila = 0; fila < 7; fila++) for (let x = 20; x < CW; x += 26 + r() * 10) {
    const y = 70 + fila * 80 + r() * 6, k = Math.floor(r() * 5);
    if (k === 0) disco(glifos, x, y, 6); else if (k === 1) { trazo(glifos, x - 6, y - 8, x + 6, y + 8, 2.4); trazo(glifos, x + 6, y - 8, x - 6, y + 8, 2.4); }
    else if (k === 2) rellenar(glifos, [[x - 7, y + 8], [x, y - 9], [x + 7, y + 8]]); else if (k === 3) { trazo(glifos, x, y - 9, x, y + 9, 2.6); disco(glifos, x, y - 9, 4); } else { disco(glifos, x - 3, y, 3); trazo(glifos, x, y, x + 9, y + 6, 2); }
  }
  pintarConRuido(F, muro, [0.2, 0.12, 0.07], 0.35, 30, 203);
  pintar(F, juntas, [0.04, 0.02, 0.01], 0.8); pintar(F, glifos, [0.06, 0.03, 0.015], 0.75);
  // columnas con capitel de loto
  for (const x of [170, 470, 938, 1238]) {
    const c = M(); rellenar(c, [[x - 46, 660], [x - 40, 140], [x - 70, 100], [x - 60, 70], [x + 60, 70], [x + 70, 100], [x + 40, 140], [x + 46, 660]]);
    pintarConRuido(F, c, [0.2, 0.12, 0.07], 0.3, 18, x); const b = M(); for (let y = 160; y < 650; y += 40) trazo(b, x - 44, y, x + 44, y, 2, 2, 1, 'max', false); for (let i = 0; i < CW * CH; i++) b.d[i] *= c.d[i]; pintar(F, b, [0.03, 0.015, 0.01], 0.7);
    contraluz(F, c, x < CX ? 3 : -3, 0, [1, 0.7, 0.35], 0.25);
    const sombraC = M(); rellenar(sombraC, x < CX ? [[x + 10, 660], [x + 16, 140], [x + 46, 140], [x + 46, 660]] : [[x - 46, 660], [x - 46, 140], [x - 16, 140], [x - 10, 660]]); desenfocar(sombraC.d, CW, CH, 10); pintar(F, sombraC, [0, 0, 0], 0.55);
  }
  losas(F, 640, CH, [0.12, 0.075, 0.045], 204, [CX, 640], 7);
  sombraVertical(F, 0, 700, 0.5, false);
  alumbrar(F, 760, 600, 640, [1.8, 1.1, 0.5], 1.1, 0.7);
  granoOpaco(F, 0.02, 205);
  // sarcófagos abiertos a los lados
  const S = t.capa('sarcofagos', 1, 0.4);
  const luzS: Luz = { amb: [0.42, 0.32, 0.22], desat: 0.3, clave: { dir: [0.4, -1], k: 0.7 }, bordes: [{ dx: 1, dy: -1, c: ORO, k: 0.7 }], niebla: { c: [0.12, 0.07, 0.04], k: 0.3 } };
  figura(S, undefined, modelo('tum_sarcofago', 'momia_abierto', 0, 2.5), 300, 690, 260, luzS);
  figura(S, undefined, modelo('tum_sarcofago', 'chacal_abierto', 0, 2.5), 1130, 690, 260, luzS, { espejo: true });
  // el haz que entra por el techo, con la arena que cae
  const Hz = t.capa('haz', 2, 0.35, 'sumar', { anim: { tipo: 'latir', alfa: [0.8, 1], periodo_s: 3.5 } });
  haces(Hz, 700, -60, Math.PI / 2 + 0.1, 0.17, 900, [1, 0.72, 0.36], 0.9, 206, 14);
  const cae = M(); for (let k = 0; k < 9; k++) { const x0 = 690 + (k - 4) * 9; polilinea(cae, Array.from({ length: 12 }, (_, j) => [x0 + j * 6 + Math.sin(j + k) * 2, -10 + j * 62] as P2), 1.2, 3.5); }
  brillo(Hz, desenfocada(cae, 2), [0.9, 0.62, 0.3], 0.6);
  // Khamer-Ul se deshace
  const R = t.capa('rey', 3, 0.6), RL = t.capa('rey_luz', 4, 0.6, 'sumar', { anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 5 } });
  const luzR: Luz = { amb: [0.4, 0.31, 0.22], desat: 0.3, clave: { dir: [0.2, -1], k: 0.8, c: [1.25, 1, 0.75] }, bordes: [{ dx: 0, dy: -1, c: [1.3, 0.9, 0.45], k: 1.3, ancho: 1.5 }, { dx: -1, dy: 0, c: [0.5, 0.25, 0.12], k: 0.5 }], emite: (c) => Math.max(emiteOro(c), c[1] > 0.5 && c[1] > c[0] * 1.3 ? sat((c[1] - 0.45) * 2) : 0), cEmite: [0.5, 1, 0.5] };
  const rey = figura(R, RL, modelo('jefe_rey_sin_sombra_morir', 's', 4, 3.4), 740, 712, 470, luzR);
  const rb = cajaPose(rey, 740, 712), rw = rb.x1 - rb.x0, rh = rb.y1 - rb.y0;
  // la arena que se le escurre del cuerpo y el montón a sus pies
  const ar = M();
  for (let k = 0; k < 40; k++) { const x = rb.x0 + rw * (0.2 + 0.6 * ((k * 37) % 40) / 40), y0 = rb.y0 + rh * (0.25 + ((k * 13) % 10) / 20); polilinea(ar, [[x, y0], [x + 2, y0 + (rb.y1 - y0) * 0.5], [x + 5, rb.y1 + 6]], 0.8, 2.2, 0.7); }
  rellenar(ar, Array.from({ length: 24 }, (_, k) => { const a = Math.PI + (k / 23) * Math.PI; return [740 + Math.cos(a) * rw * 0.7, 716 + Math.sin(a) * 40] as P2; }));
  pintarConRuido(R, ar, [0.5, 0.33, 0.17], 0.35, 6, 207);
  contraluz(R, ar, 0, -2, [1, 0.75, 0.4], 0.9);
  // lágrimas negras de la máscara
  const lg = M(); chorreado(lg, (rb.x0 + rb.x1) / 2 - 10, rb.y0 + rh * 0.13, 22, rh * 0.25, 208); pintarSangre(R, lg, [0.9, 0.5, 0.2], 0.9, 0.6);
  halo(RL, (rb.x0 + rb.x1) / 2, rb.y0 + rh * 0.12, 60, [0.5, 1, 0.45], 0.6, 1, true);
  // primer plano: saqueadores muertos, huesos y escarabajos
  const Fr = t.capa('frente', 5, 1);
  const luzF: Luz = { amb: [0.24, 0.17, 0.12], desat: 0.4, clave: { dir: [0.5, -1], k: 0.6 }, bordes: [{ dx: 1, dy: -1, c: [1, 0.65, 0.3], k: 0.9 }] };
  figura(Fr, undefined, modelo('hor_pila_cadaveres', 'chica', 0, 2.6), 140, 830, 300, luzF);
  figura(Fr, undefined, modelo('des2_escarabajos', 'grupo', 0, 3), 1210, 800, 150, luzF);
  const sg = M(); charco(sg, 200, 790, 140, 20, 209); salpicar(sg, 300, 770, 140, -0.2, 30, 210); pintarSangre(Fr, sg, [1, 0.6, 0.3], 0.95, 0.5);
  t.particulas = 'ceniza';
  t.efecto({ tipo: 'sprite', hoja: 'humo', en: [[700, 700, 1.6], [790, 690, 1.3]], mezcla: 'normal', despues_de: 'rey_luz', paralaje: 0.6, alfa: 0.55 });
}

/** El coloso enterrado (cara de piedra, tocado a rayas): en máscaras sobre la lámina. */
function coloso(L: Lamina, cx: number, base: number, s: number, luzK: number): Mascara {
  const rey = M(), cara = M(), rayas = M(), som = M();
  const P = (pts: number[][]) => pts.map(([x, y]) => [cx + x * s, base + y * s] as P2);
  rellenar(rey, P([[-200, 0], [-175, -90], [-118, -170], [-112, -290], [-90, -350], [-40, -380], [40, -380], [90, -350], [112, -290], [118, -170], [175, -90], [200, 0]]));
  rellenar(rey, P([[34, -392], [124, -330], [118, -276], [76, -318], [30, -350]]), 1, 'restar');
  rellenar(cara, P([[-72, -300], [72, -300], [76, -210], [60, -140], [30, -112], [-30, -112], [-60, -140], [-76, -210]]));
  rellenar(cara, P([[-22, -116], [22, -116], [18, 0], [-18, 0]]));
  for (let y = -380; y < 0; y += 16) rellenar(rayas, P([[-210, y], [210, y], [210, y + 7], [-210, y + 7]]));
  for (let i = 0; i < CW * CH; i++) rayas.d[i] *= rey.d[i] * (1 - cara.d[i]);
  pintarConRuido(L, rey, [0.2, 0.08, 0.05], 0.35, 24, 211); pintar(L, rayas, [0.07, 0.025, 0.02], 0.6); pintarConRuido(L, cara, [0.36, 0.17, 0.1], 0.3, 18, 212);
  for (const q of [[[-64, -258], [-8, -250], [-10, -236], [-62, -240]], [[64, -258], [8, -250], [10, -236], [62, -240]], [[-6, -236], [-18, -174], [-2, -170]], [[-26, -150], [26, -150], [22, -143], [-22, -143]], [[-76, -210], [-60, -140], [-30, -112], [-42, -205]]]) rellenar(som, P(q));
  pintar(L, som, [0.06, 0.02, 0.02], 0.85);
  contraluz(L, rey, Math.round(-3 * s), 0, [1, 0.5, 0.18], luzK);
  return rey;
}
/** El desierto rojo: el coloso se raja, la brasa huye al este por encima del camino de los empalados. */
function a2p2(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  const sx = 420, sy = 470, luzX = (x: number) => 0.35 + Math.exp(-(((x - sx) / 320) ** 2));
  cielo(C, [[0, '#140405'], [0.3, '#420c08'], [0.52, '#a3330f'], [0.6, '#e0701e'], [0.64, '#7a250e'], [1, '#150607']], {
    fuente: [sx, sy, 560, [1, 0.45, 0.12], 0.75],
    nubes: [{ y0: 120, y1: 470, seed: 221, escala: 110, cubre: 0.36, estira: 7, masa: [0.2, 0.05, 0.04], panza: [1, 0.45, 0.15], filo: [0.4, 0.15, 0.08], luzX, alfa: 0.85 }],
  });
  const sol = M(); disco(sol, sx, sy, 120); for (let y = 488; y < CH; y++) for (let x = 0; x < CW; x++) sol.d[y * CW + x] = 0;
  pintar(C, sol, [1, 0.62, 0.3]); halo(C, sx, sy, 230, [1, 0.5, 0.15], 0.8);
  lomas(C, 494, 12, 222, [0.4, 0.12, 0.07], { escala: 320 });
  granoOpaco(C, 0.015, 223);
  const E = t.carta ? null : t.capa('estela', 1, 0.1, 'sumar', { anim: { tipo: 'latir', alfa: [0.8, 1], periodo_s: 1.1 } });
  if (E) estela(E, Array.from({ length: 36 }, (_, k) => { const u = k / 35; return [880 + u * 440, 250 - Math.sin(u * 2.4) * 150] as P2; }), 6, BRASA, 1.2);
  const Co = t.capa('coloso', 2, 0.3), CoL = t.capa('coloso_luz', 3, 0.3, 'sumar', { anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 4 } });
  const cx = 880, base = 590, s = 1.05;
  coloso(Co, cx, base, s, 1);
  // la grieta que lo parte de arriba abajo, con la luz de la brasa adentro, y la arena que se derrama
  const gr = M(); polilinea(gr, [[cx + 30, base - 400 * s], [cx + 18, base - 330 * s], [cx + 36, base - 260 * s], [cx + 10, base - 190 * s], [cx + 28, base - 110 * s], [cx + 16, base]], 7, 3);
  grietas(gr, cx + 30, base - 300 * s, 70, 5, 224, 2);
  pintar(Co, gr, [0.03, 0.005, 0.005]);
  brillo(CoL, gr, [1, 0.5, 0.12], 1.3); brillo(CoL, desenfocada(gr, 10), [1, 0.35, 0.08], 1.4);
  const ojos = M(); for (const d of [-1, 1]) rellenar(ojos, [[cx + d * 34 * s - 14, base - 230 * s], [cx + d * 34 * s + 14, base - 232 * s], [cx + d * 34 * s + 10, base - 221 * s], [cx + d * 34 * s - 10, base - 221 * s]]);
  brillo(CoL, ojos, [1, 0.3, 0.05], 1.6); brillo(CoL, desenfocada(ojos, 9), [1, 0.2, 0.05], 2.2);
  const lag = M(); for (const d of [-1, 1]) chorreado(lag, cx + d * 34 * s, base - 222 * s, 10, 80, 225 + d); pintarSangre(Co, lag, [1, 0.5, 0.2], 0.9, 0.5);
  const D = t.capa('dunas', 4, 0.6);
  const d2 = lomas(D, 612, 30, 226, [0.12, 0.04, 0.04], { escala: 260, filo: [1, 0.4, 0.12], kFilo: 0.9, dx: 2, dy: 3 });
  const luzE: Luz = { amb: [0.2, 0.1, 0.08], desat: 0.4, clave: { dir: [-1, -0.2], k: 0.6 }, bordes: [{ dx: -1, dy: 0, c: [1, 0.42, 0.12], k: 1.1, ancho: 1 }], niebla: { c: [0.3, 0.08, 0.04], k: 0.15 } };
  const sg = M();
  for (const [x, y, al] of [[340, 640, 330], [560, 620, 240], [1130, 640, 300], [1280, 670, 380]] as [number, number, number][]) {
    const pe = figura(D, undefined, modelo('hor_empalado', 'uno', 0, 3), x, y, al, luzE, { espejo: x > CX });
    const b = cajaPose(pe, x, y); chorreado(sg, (b.x0 + b.x1) / 2, b.y0 + (b.y1 - b.y0) * 0.42, 16, (b.y1 - b.y0) * 0.4, x);
    t.efecto({ tipo: 'sprite', hoja: 'goteo_sangre', en: [[(b.x0 + b.x1) / 2 + 2, b.y0 + (b.y1 - b.y0) * 0.5, al / 340]], mezcla: 'normal', despues_de: 'dunas', paralaje: 0.6 });
  }
  for (let i = 0; i < CW * CH; i++) sg.d[i] *= 0.9;
  pintarSangre(D, sg, [1, 0.45, 0.15], 0.8, 0.4);
  figura(D, undefined, modelo('des2_buitres', 'poste', 0, 3), 760, 650, 200, luzE);
  for (let i = 0; i < CW * CH; i++) d2.d[i] = 0;
  const Fr = t.capa('frente', 5, 1);
  const fr = M(); rellenar(fr, perfil2(760, 40, 227)); const hueso = M(); disco(hueso, 190, 732, 22); rellenar(hueso, [[174, 742], [206, 742], [202, 760], [178, 760]]); disco(hueso, 181, 732, 6, 1, 'restar'); disco(hueso, 199, 732, 6, 1, 'restar'); trazo(hueso, 130, 762, 260, 752, 6, 5);
  pintarConRuido(Fr, fr, [0.07, 0.025, 0.025], 0.3, 50, 228); contraluz(Fr, fr, 0, 3, [1, 0.4, 0.12], 0.8);
  pintar(Fr, hueso, [0.36, 0.22, 0.16]); contraluz(Fr, hueso, -2, -1, [1, 0.6, 0.3], 0.6);
  t.particulas = 'ceniza';
  t.efecto({ tipo: 'sprite', hoja: 'cuervo', en: [[560, 300, 0.6], [640, 260, 0.5], [700, 320, 0.55], [1020, 280, 0.45]], mezcla: 'normal', despues_de: 'estela', paralaje: 0.15 });
}
/** Perfil de suelo de adelante (más alto a los lados). */
const perfil2 = (base: number, amp: number, s: number): P2[] => [[-10, CH + 5], ...Array.from({ length: 100 }, (_, k) => { const x = -10 + (k / 99) * (CW + 20); return [x, base - amp * Math.abs((x - CX) / CX) ** 2 * 2 + (fbm(x / 120, 1, 4, s) - 0.5) * amp] as P2; }), [CW + 10, CH + 5]];
/** El río de noche: el barco de Oyá baja hacia el este; atrás, el pálido camina sobre el agua cantando. */
function a2p3(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  const lx = 330, ly = 190, luzX = (x: number) => 0.2 + Math.exp(-(((x - lx) / 300) ** 2));
  cielo(C, [[0, '#03060a'], [0.4, '#0b1720'], [0.56, '#1d2c30'], [1, '#05080a']], {
    fuente: [lx, ly, 380, [0.45, 0.6, 0.6], 0.5], estrellas: 260, s: 231,
    nubes: [{ y0: 60, y1: 380, seed: 232, escala: 190, cubre: 0.45, estira: 3.5, masa: [0.03, 0.05, 0.06], panza: [0.25, 0.35, 0.35], filo: [0.4, 0.55, 0.58], luzX, alfa: 0.9 }],
  });
  const luna = M(); disco(luna, lx, ly, 34); pintar(C, luna, [0.85, 0.92, 0.88]); halo(C, lx, ly, 90, [0.5, 0.65, 0.6], 0.6);
  // orillas: palmeras y ruinas
  const ori = M(); rellenar(ori, perfil(CW, CH, 470, 10, 233, { escala: 200 }));
  const r = rng(234);
  for (let k = 0; k < 16; k++) { const x = r() * CW, h = 60 + r() * 120, y = 472, a = (r() - 0.5) * 0.5; trazo(ori, x, y, x + Math.sin(a) * h, y - h, 5, 3); for (let j = 0; j < 7; j++) { const an = -Math.PI / 2 + (j - 3) * 0.45 + a, l = 30 + r() * 30, tx = x + Math.sin(a) * h, ty = y - h; polilinea(ori, [[tx, ty], [tx + Math.cos(an) * l * 0.6, ty + Math.sin(an) * l * 0.6 - 4], [tx + Math.cos(an) * l, ty + Math.sin(an) * l + l * 0.35]], 4, 1); } }
  ruina(ori, null, 1060, 472, 120, 70, 235, { torre: true, ventanas: 0 });
  pintar(C, ori, [0.02, 0.035, 0.04]); contraluz(C, ori, -2, -1, [0.35, 0.5, 0.5], 0.6);
  // el agua: reflejo del cielo y de la luna
  const agua = M(); for (let y = 472; y < CH; y++) for (let x = 0; x < CW; x++) agua.d[y * CW + x] = 1;
  reflejo(C, 472, [0.02, 0.04, 0.045], 0.55, 236, agua);
  granoOpaco(C, 0.015, 237);
  const Br = t.capa('brillos', 1, 0.2, 'sumar', { anim: { tipo: 'titilar', alfa: [0.5, 1], hz: 3 } });
  brillosAgua(Br, 474, CH, lx, 140, [0.6, 0.8, 0.75], 0.6, 238);
  // el pálido, sobre el agua detrás del barco, con su reflejo
  const Pa = t.capa('cantor', 2, 0.3), PaL = t.capa('cantor_luz', 3, 0.3, 'sumar', { anim: { tipo: 'latir', alfa: [0.5, 1], periodo_s: 2.6, notas: 'respira con el canto' } });
  const luzP: Luz = { amb: [0.9, 0.95, 0.95], desat: 0.7, clave: { dir: [-1, -0.5], k: 0.5 }, bordes: [{ dx: -1, dy: -1, c: [0.6, 0.85, 0.8], k: 0.9 }], niebla: { c: [0.3, 0.42, 0.42], k: 0.35 } };
  const pa = figura(Pa, undefined, modeloPersonaje2('s'), 330, 520, 150, luzP);
  const pb = cajaPose(pa, 330, 520);
  halo(PaL, 330, (pb.y0 + pb.y1) / 2, 120, [0.5, 0.75, 0.7], 0.45, 1.2, true);
  const refl = M(); rellenar(refl, [[pb.x0 + 4, 522], [pb.x1 - 4, 522], [pb.x1 + 10, 620], [pb.x0 - 10, 620]]); desenfocar(refl.d, CW, CH, 8);
  for (let i = 0; i < CW * CH; i++) refl.d[i] *= 0.5 + 0.5 * fbm((i % CW) / 8, Math.floor(i / CW) / 2, 2, 239);
  brillo(PaL, refl, [0.45, 0.65, 0.62], 0.5);
  // el barco de Oyá, con faroles
  const B = t.capa('barco', 4, 0.55), BL = t.capa('barco_luz', 5, 0.55, 'sumar', { anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 6 } });
  const bm = M(); barco(bm, 960, 560, 460, 240);
  pintar(B, bm, [0.012, 0.016, 0.02]); contraluz(B, bm, -2, -1, [0.45, 0.6, 0.6], 0.8);
  const ref2 = M(); for (let y = 560; y < 700; y++) for (let x = 700; x < 1260; x++) { const sy = 560 - (y - 560) - 2; if (sy > 0) ref2.d[y * CW + x] = bm.d[sy * CW + Math.round(x + (fbm(x / 30, y / 4, 2, 241) - 0.5) * 14)] * 0.6 * (1 - (y - 560) / 140); }
  pintar(B, ref2, [0.01, 0.015, 0.02], 0.8);
  for (const [x, y] of [[760, 506], [1150, 500], [960, 420]] as P2[]) { halo(BL, x, y, 60, [1, 0.6, 0.25], 0.7, 1, true); halo(BL, x, y + 90, 50, [1, 0.5, 0.2], 0.25, 0.3, true); }
  t.efecto({ tipo: 'sprite', hoja: 'fuego', en: [[760, 512, 0.16], [1150, 506, 0.16], [960, 426, 0.14]], mezcla: 'sumar', despues_de: 'barco_luz', paralaje: 0.55 });
  // adelante: juncos y un ahogado boca abajo que flota
  const Fr = t.capa('frente', 6, 1);
  const luzF: Luz = { amb: [0.24, 0.3, 0.3], desat: 0.5, clave: { dir: [-1, -0.4], k: 0.6 }, bordes: [{ dx: -1, dy: -1, c: [0.5, 0.7, 0.68], k: 0.8 }] };
  figura(Fr, undefined, modelo('ahg_marino_ahogado', 'boca_abajo', 0, 3), 420, 770, 150, luzF);
  const ju = M(); pasto(ju, -10, 260, () => 800, 160, 150, 242); pasto(ju, 1180, 1420, () => 800, 160, 170, 243);
  pintar(Fr, ju, [0.008, 0.012, 0.014]); contraluz(Fr, ju, -2, 0, [0.4, 0.55, 0.55], 0.5);
  const sg = M(); charco(sg, 430, 778, 120, 12, 244, 0); for (let i = 0; i < CW * CH; i++) sg.d[i] *= 0.6; pintar(Fr, sg, [0.25, 0.02, 0.02], 0.6);
}
const modeloPersonaje2 = (dir: import('./figura').Dir) => modeloPersonajeCantor(dir);
function modeloPersonajeCantor(dir: import('./figura').Dir): Modelo { return modeloPersonajeX('cantor', CANTOR[0], CANTOR[1], dir, 'quieto', 0, 4); }

// ================================================================== ACTO 3: YHUANTL
const VERDE: C3 = [0.35, 1, 0.55];
/** El Vientre del templo: la Madre Ciénaga se abre y se hunde; huevos reventados; crucificados en las raíces. */
function a3p1(t: Toma) {
  const F = t.capa('fondo', 0, 0.25, 'normal', { opaca: true });
  cielo(F, [[0, '#030604'], [0.5, '#0c140c'], [1, '#040503']]);
  // el vientre: costillas de carne que se cierran en arco, venas, ampollas que brillan y piedra del templo abajo
  const r = rng(301), piedra = M(), juntas = M();
  rellenar(piedra, [[-10, 420], [CW + 10, 420], [CW + 10, 660], [-10, 660]]); sillares(juntas, -10, 420, CW + 10, 660, 48, 96, 303);
  pintarConRuido(F, piedra, [0.08, 0.09, 0.065], 0.4, 20, 304); pintar(F, juntas, [0.01, 0.012, 0.008], 0.8);
  const carne = M(), costillas = M(), venas = M(), ampollas = M();
  for (let y = -10; y < 470; y++) for (let x = 0; x < CW; x++) carne.d[y * CW + x] = sat((470 - y) / 40) * (0.75 + 0.25 * fbm(x / 60, y / 60, 4, 305));
  // costillas: arcos que cruzan la bóveda, cada vez más chicos hacia el fondo (un túnel de carne)
  for (let k = 0; k < 7; k++) {
    const u = k / 6, rx = 780 - u * 520, ry = 460 - u * 300, cy = 480, pts: P2[] = [];
    for (let j = 0; j <= 30; j++) { const a = Math.PI + (j / 30) * Math.PI; pts.push([CX + Math.cos(a) * rx + Math.sin(j + k) * 6, cy + Math.sin(a) * ry]); }
    polilinea(costillas, pts, 46 - u * 30, 46 - u * 30);
  }
  for (let k = 0; k < 18; k++) grietas(venas, r() * CW, r() * 440, 90, 3, 306 + k, 2.4);
  for (let k = 0; k < 16; k++) { const x = r() * CW, y = 60 + r() * 380, q = 4 + r() * 12; disco(ampollas, x, y, q); for (let j = 0; j < 3; j++) disco(ampollas, x + (r() - 0.5) * q * 4, y + (r() - 0.5) * q * 3, q * 0.4 * r()); }
  pintarConRuido(F, carne, [0.17, 0.045, 0.04], 0.5, 18, 307);
  pintarConRuido(F, costillas, [0.3, 0.1, 0.08], 0.4, 10, 308); contraluz(F, costillas, 0, 3, [0.9, 0.35, 0.25], 0.8); contraluz(F, costillas, -3, 0, [0.4, 1, 0.55], 0.4);
  pintar(F, venas, [0.07, 0.005, 0.01], 0.8);
  pintar(F, ampollas, [0.2, 0.5, 0.25], 0.9);
  losas(F, 640, CH, [0.06, 0.05, 0.03], 309, [CX, 640], 6);
  sombraVertical(F, 0, 640, 0.45, false);
  alumbrar(F, CX, 620, 720, [0.6, 1.5, 0.8], 1, 0.7);
  alumbrar(F, CX, 680, 420, [1.6, 0.4, 0.2], 0.9, 0.5);
  granoOpaco(F, 0.02, 310);
  const Am = t.capa('ampollas_luz', 0.5, 0.25, 'sumar', { anim: { tipo: 'latir', alfa: [0.4, 1], periodo_s: 2.2 } });
  brillo(Am, desenfocada(ampollas, 6), VERDE, 0.9); brillo(Am, ampollas, [0.7, 1, 0.7], 0.6);
  // el barro: charca de sangre y lodo con huevos
  const B = t.capa('barro', 1, 0.4);
  const lodo = M(); charco(lodo, CX, 700, 520, 80, 309, 30);
  pintarConRuido(B, lodo, [0.09, 0.06, 0.03], 0.4, 20, 310);
  const sang = M(); charco(sang, CX + 40, 700, 320, 50, 311, 20); pintarSangre(B, sang, [0.9, 0.5, 0.3], 0.95, 0.5);
  const huevos = M(), rotos = M();
  for (let k = 0; k < 16; k++) { const a = r() * Math.PI * 2, d = 0.55 + r() * 0.45, x = CX + Math.cos(a) * 470 * d, y = 700 + Math.sin(a) * 72 * d, rr = 16 + r() * 22; rellenar(huevos, Array.from({ length: 16 }, (_, j) => { const b = (j / 16) * Math.PI * 2; return [x + Math.cos(b) * rr * 0.75, y - rr * 0.6 + Math.sin(b) * rr] as P2; })); if (r() < 0.5) { rellenar(rotos, [[x - rr * 0.5, y - rr * 0.9], [x - rr * 0.1, y - rr * 1.3], [x + rr * 0.2, y - rr * 0.95], [x + rr * 0.5, y - rr * 1.4], [x + rr * 0.6, y - rr * 0.6], [x - rr * 0.6, y - rr * 0.5]]); } }
  pintarConRuido(B, huevos, [0.3, 0.32, 0.2], 0.3, 6, 312); pintar(B, rotos, [0.03, 0.01, 0.01]);
  contraluz(B, huevos, 0, -2, [0.7, 1, 0.6], 0.8);
  // la Madre se derrumba
  const Ma = t.capa('madre', 2, 0.55), MaL = t.capa('madre_luz', 3, 0.55, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 1.4 } });
  const luzM: Luz = { amb: [0.5, 0.58, 0.45], desat: 0.2, clave: { dir: [0, 1], k: 0.6, c: [0.9, 1.2, 0.8] }, bordes: [{ dx: 0, dy: -1, c: [0.5, 1, 0.6], k: 1, ancho: 1.5 }, { dx: 1, dy: 1, c: [1, 0.3, 0.15], k: 0.7 }], abajo: { c: [0.8, 0.2, 0.1], k: 0.5 }, emite: (c) => (c[1] > 0.45 && c[1] > c[0] * 1.4 && c[1] > c[2] * 1.3 ? sat((c[1] - 0.4) * 2.5) : 0), cEmite: VERDE };
  const ma = figura(Ma, MaL, modelo('jefe_madre_cienaga_morir', 's', 4, 3.2), CX, 700, 540, luzM);
  const mb = cajaPose(ma, CX, 712), mw = mb.x1 - mb.x0;
  const tajo = M(); polilinea(tajo, [[CX - mw * 0.12, mb.y0 + 90], [CX, mb.y0 + 150], [CX + mw * 0.1, mb.y0 + 230]], 14, 6);
  pintar(Ma, tajo, [0.15, 0.01, 0.01]); brillo(MaL, desenfocada(tajo, 8), [1, 0.25, 0.08], 0.7);
  const ch = M(); chorreado(ch, CX, mb.y0 + 200, 60, 120, 313); pintarSangre(Ma, ch, [1, 0.4, 0.3], 0.95, 0.5);
  // primer plano: crucificados en las raíces y lianas que cuelgan
  const Fr = t.capa('frente', 5, 1);
  const luzF: Luz = { amb: [0.25, 0.28, 0.22], desat: 0.45, clave: { dir: [1, 0], k: 0.6 }, bordes: [{ dx: 1, dy: 0, c: VERDE, k: 0.8 }, { dx: 0, dy: 1, c: [1, 0.3, 0.15], k: 0.4 }] };
  const cr = figura(Fr, undefined, modelo('hor_crucificado', 'madera', 0, 3), 150, 820, 560, luzF);
  const crb = cajaPose(cr, 150, 820);
  figura(Fr, undefined, modelo('hor_crucificado', 'hierro', 0, 3), 1290, 840, 480, { ...luzF, bordes: [{ dx: -1, dy: 0, c: VERDE, k: 0.8 }] }, { espejo: true });
  const li = M(); for (let k = 0; k < 14; k++) { const x = r() < 0.5 ? r() * 360 : CW - r() * 360, l = 120 + r() * 280; polilinea(li, Array.from({ length: 11 }, (_, j) => [x + Math.sin(j * 0.8 + k) * 8, -10 + (j / 10) * l] as P2), 5, 2); }
  pintar(Fr, li, [0.01, 0.02, 0.012]); contraluz(Fr, li, 2, 0, VERDE, 0.4);
  t.efecto({ tipo: 'sprite', hoja: 'goteo_sangre', en: [[(crb.x0 + crb.x1) / 2, crb.y0 + (crb.y1 - crb.y0) * 0.35, 1.1], [CX + 30, mb.y0 + 210, 1.2], [1300, 420, 1]], mezcla: 'normal', despues_de: 'frente', paralaje: 1 });
  t.efecto({ tipo: 'sprite', hoja: 'humo', en: [[CX - 200, 690, 1.8], [CX + 220, 700, 1.5]], mezcla: 'normal', despues_de: 'madre_luz', paralaje: 0.55, alfa: 0.5 });
}

/** La pirámide escalonada (con el templo arriba) en una máscara; devuelve también la escalinata. */
function piramide(m: Mascara, esc: Mascara, cx: number, base: number, s: number) {
  for (let k = 0; k < 7; k++) { const w2 = (280 - k * 34) * s, y1 = base - k * 34 * s; rellenar(m, [[cx - w2, y1], [cx - w2 + 10 * s, y1 - 34 * s], [cx + w2 - 10 * s, y1 - 34 * s], [cx + w2, y1]]); }
  rellenar(m, [[cx - 50 * s, base - 238 * s], [cx - 50 * s, base - 300 * s], [cx - 60 * s, base - 304 * s], [cx, base - 330 * s], [cx + 60 * s, base - 304 * s], [cx + 50 * s, base - 300 * s], [cx + 50 * s, base - 238 * s]]);
  rellenar(esc, [[cx - 34 * s, base], [cx - 18 * s, base - 238 * s], [cx + 18 * s, base - 238 * s], [cx + 34 * s, base]]);
}
/** Al alba: la pirámide en la niebla, el río que ya no sangra pero arrastra a sus muertos, y el barco. */
function a3p2(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  const sx = 980, sy = 330, luzX = (x: number) => 0.3 + Math.exp(-(((x - sx) / 360) ** 2));
  cielo(C, [[0, '#06100e'], [0.35, '#183028'], [0.55, '#5a6a4a'], [0.62, '#8a7a50'], [0.66, '#2a3328'], [1, '#060a08']], {
    fuente: [sx, sy, 520, [0.9, 0.8, 0.5], 0.55],
    nubes: [{ y0: -20, y1: 300, seed: 321, escala: 200, cubre: 0.5, masa: [0.05, 0.08, 0.07], panza: [0.6, 0.55, 0.35], filo: [0.4, 0.5, 0.42], luzX }],
  });
  granoOpaco(C, 0.015, 322);
  const Pi = t.capa('piramide', 1, 0.2);
  const pm = M(), em = M(); piramide(pm, em, 560, 470, 0.95);
  pintarConRuido(Pi, pm, [0.16, 0.2, 0.17], 0.35, 14, 323); pintarConRuido(Pi, em, [0.22, 0.26, 0.22], 0.3, 8, 324);
  const sang = M(); for (let k = 0; k < 4; k++) polilinea(sang, Array.from({ length: 12 }, (_, j) => [560 - 8 + k * 5 + Math.sin(j + k) * 2, 470 - 226 + j * 20] as P2), 1.4, 2.8); pintar(Pi, sang, [0.2, 0.03, 0.02], 0.7);
  contraluz(Pi, pm, 3, 0, [1, 0.9, 0.6], 0.7);
  niebla(Pi, 330, 520, [0.42, 0.48, 0.38], 0.75, 325, 200);
  const sel = M(); rellenar(sel, perfil(CW, CH, 500, 20, 326, { escala: 120 })); const r = rng(327); for (let k = 0; k < 60; k++) { const x = r() * CW; disco(sel, x, 490 - r() * 20, 14 + r() * 26); }
  pintar(Pi, sel, [0.07, 0.1, 0.08]); niebla(Pi, 440, 540, [0.4, 0.45, 0.36], 0.6, 328, 220);
  // el río: reflejo del cielo con un tinte de hierro que todavía queda
  const R = t.capa('rio', 2, 0.4);
  const base = t.plano(1), rio = M(); for (let y = 520; y < CH; y++) for (let x = 0; x < CW; x++) rio.d[y * CW + x] = 1;
  R.d.set(base.d); reflejo(R, 520, [0.08, 0.06, 0.05], 0.6, 329, rio);
  for (let i = 0; i < CW * CH; i++) { if (Math.floor(i / CW) < 520) { R.d[i * 4 + 3] = 0; R.d[i * 4] = R.d[i * 4 + 1] = R.d[i * 4 + 2] = 0; continue; } R.d[i * 4] *= 1.12; R.d[i * 4 + 1] *= 0.9; R.d[i * 4 + 2] *= 0.85; }
  const luzC: Luz = { amb: [0.3, 0.32, 0.28], desat: 0.4, clave: { dir: [1, -0.5], k: 0.6 }, bordes: [{ dx: 1, dy: -1, c: [1, 0.9, 0.6], k: 0.8 }], niebla: { c: [0.3, 0.32, 0.26], k: 0.25 } };
  for (const [x, y, al, v] of [[420, 600, 90, 'boca_abajo'], [760, 650, 120, 'tendido'], [1080, 700, 150, 'boca_abajo'], [300, 720, 160, 'enredado']] as [number, number, number, string][]) {
    figura(R, undefined, modelo('ahg_marino_ahogado', v, 0, 2.6), x, y, al, luzC, { espejo: x > 700 });
    const sg = M(); charco(sg, x, y + 4, al * 0.7, al * 0.08, x, 0); for (let i = 0; i < CW * CH; i++) sg.d[i] *= 0.5; pintar(R, sg, [0.22, 0.03, 0.02], 0.6);
  }
  // el barco de Oyá con las velas al alba (en la carta el río todavía sangra y no hay barco)
  if (t.carta) for (let i = 0; i < CW * CH; i++) { if (R.d[i * 4 + 3] <= 0) continue; R.d[i * 4] = R.d[i * 4] * 1.5 + 0.06; R.d[i * 4 + 1] *= 0.45; R.d[i * 4 + 2] *= 0.4; }
  else { const Bc = t.capa('barco', 3, 0.5); const bm = M(); barco(bm, 1100, 586, 380, 331, false); pintar(Bc, bm, [0.03, 0.035, 0.03]); contraluz(Bc, bm, -2, -1, [1, 0.9, 0.6], 0.8); }
  const Fr = t.capa('frente', 5, 1);
  const hj = M();
  const hoja = (x: number, y: number, l: number, a: number) => { const pts: P2[] = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([u * l, -Math.sin(u * Math.PI) * l * 0.22]); } for (let k = 12; k >= 0; k--) { const u = k / 12; pts.push([u * l, Math.sin(u * Math.PI) * l * 0.22]); } const c = Math.cos(a), s2 = Math.sin(a); rellenar(hj, pts.map(([u, v]) => [x + u * c - v * s2, y + u * s2 + v * c] as P2)); };
  for (const lado of [-1, 1]) { const x0 = lado < 0 ? -20 : CW + 20; for (let k = 0; k < 24; k++) hoja(x0 - lado * r() * 140, 80 + r() * 700, 140 + r() * 180, lado < 0 ? -0.9 + r() * 1.4 : Math.PI - 0.5 + r() * 1.4); }
  pintar(Fr, hj, [0.01, 0.02, 0.015]); contraluz(Fr, hj, 2, 1, [0.7, 0.75, 0.5], 0.5);
  t.efecto({ tipo: 'sprite', hoja: 'cuervo', en: [[700, 250, 0.5], [760, 220, 0.4], [820, 270, 0.45]], mezcla: 'normal', despues_de: 'piramide', paralaje: 0.2 });
}
/** La ventisca de Hrimgard: el rey de escarcha camina hacia la cámara y sus muertos lo siguen en fila. */
function a3p3(t: Toma) {
  const C = t.capa('cielo', 0, 0.05, 'normal', { opaca: true });
  cielo(C, [[0, '#05080e'], [0.4, '#1a2434'], [0.6, '#3a4658'], [1, '#0a0e14']], {
    fuente: [700, 300, 600, [0.45, 0.55, 0.7], 0.4],
    nubes: [{ y0: -20, y1: 420, seed: 341, escala: 200, cubre: 0.7, masa: [0.12, 0.14, 0.18], panza: [0.3, 0.36, 0.45], filo: [0.4, 0.45, 0.55], luzX: () => 0.8 }],
  });
  lomas(C, 470, 70, 342, [0.18, 0.21, 0.27], { escala: 160, picos: 0.8, filo: [0.6, 0.7, 0.85], kFilo: 0.5, dx: -2, dy: 0 });
  niebla(C, 380, 560, [0.4, 0.45, 0.55], 0.7, 343, 200);
  granoOpaco(C, 0.015, 344);
  // la fila de muertos que viene detrás, perdiéndose en la nieve
  const Fi = t.capa('muertos', 1, 0.3);
  const luzZ: Luz = { amb: [0.3, 0.34, 0.42], desat: 0.6, clave: { dir: [-1, -0.5], k: 0.5 }, bordes: [{ dx: -1, dy: -1, c: [0.6, 0.75, 1], k: 0.7 }], niebla: { c: [0.36, 0.41, 0.5], k: 0.5 } };
  for (let k = 0; k < 9; k++) { const u = k / 8, x = 720 + Math.sin(u * 3) * 120 + u * 200, y = 600 - u * 120, al = 150 * (1 - u * 0.7); figura(Fi, undefined, modelo('mon_zombi_caminar', k % 2 ? 'so' : 's', k % 8, 2), x, y, al, { ...luzZ, niebla: { c: [0.36, 0.41, 0.5], k: 0.35 + u * 0.5 } }); }
  niebla(Fi, 420, 640, [0.36, 0.41, 0.5], 0.45, 345, 160);
  // el rey camina hacia la cámara
  const R = t.capa('rey', 2, 0.6), RL = t.capa('rey_luz', 3, 0.6, 'sumar', { anim: { tipo: 'latir', alfa: [0.6, 1], periodo_s: 2 } });
  const luzR: Luz = { amb: [0.42, 0.48, 0.6], desat: 0.3, clave: { dir: [-1, -0.6], k: 0.7, c: [0.9, 1, 1.2] }, bordes: [{ dx: -1, dy: -1, c: [0.7, 0.85, 1.2], k: 1.1, ancho: 1.5 }, { dx: 1, dy: 0, c: [0.3, 0.35, 0.5], k: 0.4 }], niebla: { c: [0.3, 0.35, 0.45], k: 0.12 }, emite: (c) => (c[2] > 0.7 && c[2] > c[0] * 1.3 ? sat((c[2] - 0.65) * 3) : 0), cEmite: [0.6, 0.85, 1] };
  const rey = figura(R, RL, modelo('jefe_rey_escarcha_caminar', 's', 2, 3), 560, 760, 560, luzR);
  const rb = cajaPose(rey, 560, 760);
  const ojo = M(); disco(ojo, (rb.x0 + rb.x1) / 2 - 10, rb.y0 + (rb.y1 - rb.y0) * 0.16, 4); disco(ojo, (rb.x0 + rb.x1) / 2 + 10, rb.y0 + (rb.y1 - rb.y0) * 0.16, 4);
  brillo(RL, ojo, [0.7, 0.9, 1], 1.6); brillo(RL, desenfocada(ojo, 8), [0.5, 0.8, 1], 1.5);
  const Fr = t.capa('frente', 5, 1);
  const nv = M(); rellenar(nv, perfil2(790, 60, 346));
  pintarConRuido(Fr, nv, [0.42, 0.47, 0.58], 0.15, 60, 347); contraluz(Fr, nv, 0, -3, [0.8, 0.9, 1], 0.5);
  const luzF: Luz = { amb: [0.3, 0.33, 0.4], desat: 0.5, clave: { dir: [-1, -0.5], k: 0.5 }, bordes: [{ dx: -1, dy: -1, c: [0.7, 0.85, 1], k: 0.8 }] };
  figura(Fr, undefined, modelo('nie2_ventisquero', 'mano', 0, 3), 1160, 800, 200, luzF);
  const sg = M(); charco(sg, 1180, 790, 80, 12, 348); pintarSangre(Fr, sg, [1, 0.6, 0.6], 0.85, 0.5);
  t.particulas = 'nieve';
}

export const PINTORES_A: Record<string, (t: Toma) => void> = {
  'acto_1/p1_abadesa': a1p1, 'acto_1/p2_campanas': a1p2, 'acto_1/p3_camino': a1p3,
  'acto_2/p1_rey': a2p1, 'acto_2/p2_coloso': a2p2, 'acto_2/p3_rio': a2p3,
  'acto_3/p1_madre': a3p1, 'acto_3/p2_rio': a3p2, 'acto_3/p3_norte': a3p3,
};
