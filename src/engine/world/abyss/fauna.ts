import { createRaster, type Raster } from '../../core/raster';
import type { Creature } from '../atmosphere';
import { put, rgb } from '../puertoObjects';

/**
 * Vida ambiental (abyss premium): especies chicas por mundo, como la rana y la ardilla: `quieto` en bucle y `huir`
 * cuando la heroína se acerca. Cada una trae `comportamiento` (el juego lo lee para las especies nuevas):
 * huye = radio en px al que se asusta, se_esconde = se mete en una grieta o un agujero y desaparece (si no, corre
 * fuera de la pantalla), corre = px/s al huir. Las que vuelan llevan `vuela`.
 */
export interface Comportamiento { huye: number; se_esconde: boolean; corre: number; vuela?: boolean }
export interface Especie extends Creature { comportamiento: Comportamiento; mundo: string; nota: string }

type C = number[];
const ell = (r: Raster, cx: number, cy: number, rx: number, ry: number, c: C, sh?: C, hi?: C) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
    if (u * u + v * v > 1) continue;
    put(r, x, y, sh && u + v > 0.55 ? sh : hi && u + v < -0.75 ? hi : c);
  }
};
/** contorno oscuro de 1 px (las criaturas se leen sobre cualquier piso) */
const borde = (r: Raster, c: C) => {
  const a = new Uint8Array(r.w * r.h);
  for (let i = 0; i < a.length; i++) a[i] = r.data[i * 4 + 3] > 100 ? 1 : 0;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (a[y * r.w + x]) continue;
    if ((x > 0 && a[y * r.w + x - 1]) || (x < r.w - 1 && a[y * r.w + x + 1]) || (y > 0 && a[(y - 1) * r.w + x]) || (y < r.h - 1 && a[(y + 1) * r.w + x])) put(r, x, y, c, 200);
  }
};
const P = (h: string) => rgb(h);

function especie(name: string, mundo: string, w: number, h: number, nQ: number, nH: number, comp: Comportamiento, nota: string, draw: (r: Raster, f: number, huye: boolean) => void, contorno = '#08080a'): Especie {
  const make = (n: number, run: boolean) => Array.from({ length: n }, (_, f) => { const r = createRaster(w, h); draw(r, f, run); if (contorno) borde(r, P(contorno)); return r; });
  return { name, w, h, mundo, nota, comportamiento: comp, anims: { quieto: { frames: make(nQ, false), fps: 4, loop: true }, huir: { frames: make(nH, true), fps: nH >= 8 ? 12 : 10, loop: true } } };
}

/** cuadrúpedo chico genérico de costado mirando a la derecha: cuerpo, cabeza, orejas, cola y patas que corren */
function bicho(r: Raster, f: number, run: boolean, o: { cuerpo: C; sombra: C; luz: C; ojo: C; x: number; y: number; rx: number; ry: number; cab: number; oreja?: 'punta' | 'redonda' | 'no'; cola?: 'larga' | 'peluda' | 'corta'; hocico?: C }) {
  const b = run ? (f % 2) : 0, sx = run ? (f % 4) * 0.5 : 0, x = o.x + sx, y = o.y - b;
  // cola
  if (o.cola === 'peluda') ell(r, x - o.rx - 1, y - 1 - (run ? 0 : [0, 1, 0, -1][f % 4] * 0.5), 3, 2, o.cuerpo, o.sombra, o.luz);
  else if (o.cola === 'larga') for (let k = 0; k < 5; k++) put(r, x - o.rx - k, y - 1 + Math.round(Math.sin(k * 0.8 + f) * 0.8), o.sombra);
  else if (o.cola === 'corta') put(r, x - o.rx - 1, y - 1, o.luz);
  ell(r, x, y, o.rx, o.ry, o.cuerpo, o.sombra, o.luz);
  const hx = x + o.rx - 0.5, hy = y - o.ry * 0.6;
  ell(r, hx, hy, o.cab, o.cab * 0.85, o.cuerpo, o.sombra, o.luz);
  if (o.hocico) put(r, hx + o.cab, hy + 0.5, o.hocico);
  put(r, hx + o.cab * 0.4, hy - 0.5, o.ojo);
  if (o.oreja === 'punta') { put(r, hx - 1, hy - o.cab - 1, o.sombra); put(r, hx - 1, hy - o.cab, o.cuerpo); put(r, hx + 1, hy - o.cab - 1, o.cuerpo); }
  if (o.oreja === 'redonda') ell(r, hx - 1, hy - o.cab, 1.4, 1.2, o.luz);
  // patas
  const py = Math.round(o.y + o.ry);
  const pas = run ? [[-2, 2], [1, -1], [2, -2], [-1, 1]][f % 4] : [0, 0];
  put(r, x - o.rx * 0.5 + pas[0], py, o.sombra); put(r, x + o.rx * 0.5 + pas[1], py, o.sombra);
  if (run) { put(r, x - o.rx * 0.5 + pas[1], py, o.cuerpo); put(r, x + o.rx * 0.5 + pas[0], py, o.cuerpo); }
}

/** un bichito que vuela (polilla, gaviota): alas que baten, sube y se va en diagonal al huir */
function alado(r: Raster, f: number, run: boolean, o: { ala: C; alaLuz: C; cuerpo: C; ojo?: C; x: number; y: number; envergadura: number; brillo?: C }) {
  const t = run ? f / 7 : 0, x = o.x + (run ? t * 6 : 0), y = o.y - (run ? t * 8 : Math.round(Math.sin(f * 1.6) * 0.6));
  const abierta = run ? f % 2 === 0 : f % 4 < 2;
  const E = o.envergadura;
  if (abierta) { ell(r, x - E * 0.55, y - 1, E * 0.5, 2.2, o.ala, undefined, o.alaLuz); ell(r, x + E * 0.55, y - 1, E * 0.5, 2.2, o.ala, undefined, o.alaLuz); }
  else { ell(r, x - 1.5, y - 2, 2, 3, o.ala, undefined, o.alaLuz); ell(r, x + 1.5, y - 2, 2, 3, o.ala, undefined, o.alaLuz); }
  ell(r, x, y, 1.2, 2.4, o.cuerpo);
  if (o.ojo) put(r, x + 1, y - 2, o.ojo);
  if (o.brillo) { put(r, x, y + 1, o.brillo); put(r, x, y + 2, o.brillo, 160); }
}

// ---------------------------------------------------------------- Mundo 1: el Bosque GG

const polillaLuz = () => especie('polilla_luz', 'mundo1', 16, 16, 4, 8, { huye: 70, se_esconde: false, corre: 60, vuela: true },
  'Polilla de luz: se posa en flores, hongos y velas. Al huir sube y se va en diagonal. Su panza brilla (un punto de luz chico #ffe9a8 si el juego quiere).',
  (r, f, run) => alado(r, f, run, { ala: P('#c8b890'), alaLuz: P('#f4ecc8'), cuerpo: P('#6a5a3a'), x: 8, y: 11, envergadura: 5, brillo: P('#fff2a0') }));
const erizo = () => especie('erizo', 'mundo1', 16, 16, 4, 6, { huye: 50, se_esconde: true, corre: 40 },
  'Erizo: husmea en las hojas. Al asustarse se hace bolita (cuadros 0-1 de huir) y rueda a esconderse bajo un arbusto.',
  (r, f, run) => {
    const pu = P('#5a4630'), pd = P('#2e2418'), pl = P('#8a7050'), car = P('#c8a07a');
    if (run && f < 2) { ell(r, 8, 11, 4.5, 4, pu, pd, pl); for (let k = 0; k < 8; k++) put(r, 8 + Math.round(Math.cos(k) * 5), 11 + Math.round(Math.sin(k) * 4.5), pd); return; }
    const x = run ? 4 + f : 7;
    ell(r, x, 11, 5, 3.4, pu, pd, pl);
    for (let k = 0; k < 6; k++) put(r, x - 4 + k * 1.5, 7.5 + (k % 2), pd);
    ell(r, x + 5, 12, 2.2, 1.8, car); put(r, x + 7, 12, P('#1a1010')); put(r, x + 5, 11, P('#1a1010'));
    put(r, x - 2 + (run ? f % 2 : 0), 14, pd); put(r, x + 3 - (run ? f % 2 : 0), 14, pd);
    if (!run && f % 2) put(r, x + 7, 13, P('#3a2a20'));
  });

// ---------------------------------------------------------------- Mundo 2: la Catedral de las Raíces

const ratonCatedral = () => especie('raton_catedral', 'mundo2', 16, 16, 4, 8, { huye: 60, se_esconde: true, corre: 90 },
  'Ratón de catedral: gris, con orejas grandes rosadas. Roe migas cerca de los braseros y huye a un agujero de la pared.',
  (r, f, run) => {
    bicho(r, f, run, { cuerpo: P('#6a6a72'), sombra: P('#3a3a44'), luz: P('#9a9aa4'), ojo: P('#0a0a0e'), x: 7, y: 11, rx: 3.6, ry: 2.4, cab: 2, oreja: 'redonda', cola: 'larga', hocico: P('#e0a0a8') });
    if (!run && f % 2) put(r, 12, 12, P('#e8d8a0'));
  });
const salamandrita = () => especie('salamandrita', 'mundo2', 16, 16, 4, 6, { huye: 45, se_esconde: true, corre: 70 },
  'Salamandrita del musgo: verde con pintas doradas, toma el calor de los braseros. Se mete entre las raíces.',
  (r, f, run) => {
    const x = run ? 3 + f * 1.4 : 5, cu = P('#3a7a3a'), so = P('#1e4a22'), dor = P('#e8c040');
    for (let k = 0; k < 4; k++) put(r, x - k, 11 + Math.round(Math.sin(k + f * (run ? 2 : 0.5)) * 0.8), so);
    ell(r, x + 4, 11, 4, 1.6, cu, so);
    ell(r, x + 9, 10.5, 2, 1.4, cu, so);
    put(r, x + 10, 10, P('#0a1008'));
    put(r, x + 3, 10, dor); put(r, x + 6, 11, dor);
    const pa = run ? f % 2 : 0;
    put(r, x + 2 - pa, 13, so); put(r, x + 6 + pa, 13, so); put(r, x + 2 + pa, 9, so); put(r, x + 6 - pa, 9, so);
  });

// ---------------------------------------------------------------- Mundo 3: las Galerías del Eco

const cangrejoCristal = () => especie('cangrejo_cristal', 'mundo3', 16, 16, 4, 6, { huye: 55, se_esconde: true, corre: 55 },
  'Cangrejo de cristal: lleva un cristal cian en el lomo que brilla apenas. Corre de costado y se entierra en la grava (último cuadro de huir).',
  (r, f, run) => {
    const x = run ? 5 + f * 1.2 : 8, hund = run && f >= 4 ? f - 3 : 0, cu = P('#7a4a3a'), so = P('#4a2a22');
    if (hund >= 2) { ell(r, x, 13, 4, 1.2, P('#3a3430')); put(r, x, 11, P('#76d0ea')); put(r, x, 10, P('#d0f6ff')); return; }
    for (const s of [-1, 1]) { put(r, x + s * 5, 10 - (f % 2), cu); put(r, x + s * 6, 9 - (f % 2), so); for (let k = 0; k < 3; k++) put(r, x + s * (2 + k), 13 + (k + f) % 2, so); }
    ell(r, x, 11 + hund, 4, 2.4, cu, so, P('#a86a50'));
    put(r, x - 1, 9, P('#0a0a0a')); put(r, x + 1, 9, P('#0a0a0a'));
    // el cristal
    put(r, x, 8 + hund, P('#3a9cc4')); put(r, x, 7 + hund, P('#76d0ea')); put(r, x + 1, 8 + hund, P('#1e6e98')); put(r, x, 6 + hund, P('#d0f6ff'));
  });
const topoMinero = () => especie('topo_minero', 'mundo3', 16, 16, 4, 6, { huye: 40, se_esconde: true, corre: 35 },
  'Topo minero: asoma de un montoncito de tierra con un pedacito de vela pegada en la cabeza. Al huir se hunde en su agujero.',
  (r, f, run) => {
    const tierra = P('#4a3a2a'), tl = P('#6a5440');
    ell(r, 8, 13, 6, 2.2, tierra, P('#2e241a'), tl);
    const sube = run ? Math.max(0, 4 - f) : 4 + (f % 2 ? 0 : -0.5);
    if (sube <= 0) return;
    const y = 13 - sube;
    ell(r, 8, y + 1, 3.4, 3, P('#3a3036'), P('#221c20'), P('#5a5058'));
    put(r, 7, y, P('#f0b0b0')); put(r, 9, y, P('#f0b0b0')); put(r, 8, y + 1, P('#e88a9a'));
    put(r, 6, y - 1, P('#0a0a0a')); put(r, 10, y - 1, P('#0a0a0a'));
    put(r, 8, y - 3, P('#e8e0c8')); put(r, 8, y - 4, P('#ffc040')); if (f % 2) put(r, 8, y - 5, P('#fff0a0'));
  });

// ---------------------------------------------------------------- Mundo 4: el Puerto Ahogado

const cangrejito = () => especie('cangrejito', 'mundo4', 16, 16, 4, 6, { huye: 50, se_esconde: true, corre: 65 },
  'Cangrejito del muelle: rojo apagado por la niebla, levanta las pinzas cuando lo miran y se mete en una grieta del muelle o en un balde.',
  (r, f, run) => {
    const x = run ? 4 + f * 1.4 : 8, cu = P('#a84a3a'), so = P('#6a2a22'), cl = P('#d07a60');
    const pinza = run ? 0 : f % 2;
    for (const s of [-1, 1]) { ell(r, x + s * 5, 9 - pinza, 1.6, 1.4, cu, so, cl); for (let k = 0; k < 3; k++) put(r, x + s * (2 + k), 13 + (k + f) % 2, so); }
    ell(r, x, 11, 3.6, 2.4, cu, so, cl);
    put(r, x - 1, 8, P('#0a0a0a')); put(r, x + 1, 8, P('#0a0a0a')); put(r, x - 1, 9, so); put(r, x + 1, 9, so);
  });
const gaviota = () => especie('gaviota', 'mundo4', 24, 16, 4, 8, { huye: 90, se_esconde: false, corre: 80, vuela: true },
  'Gaviota gris de la niebla: camina por los muelles y picotea redes. Al huir abre las alas y se va volando hacia el mar.',
  (r, f, run) => {
    const bl = P('#d8dcdc'), gr = P('#8a9498'), os = P('#4a5458'), pico = P('#e0a030');
    if (!run) {
      ell(r, 12, 10, 5, 3, bl, gr); ell(r, 11, 9, 4, 2, gr, os);
      const pk = f === 2 ? 2 : 0;
      ell(r, 16, 7 + pk, 2.4, 2, bl, gr); put(r, 18.5, 7 + pk, pico); put(r, 19.5, 7 + pk, pico); put(r, 17, 6 + pk, P('#0a0a0a'));
      put(r, 7, 9, os); put(r, 6, 9, os);
      put(r, 11, 13, pico); put(r, 13, 13, pico); put(r, 11, 14, pico); put(r, 13, 14, pico);
      return;
    }
    const t = f / 7, x = 8 + t * 8, y = 11 - t * 8, ab = f % 2 === 0;
    ell(r, x, y, 4, 2, bl, gr); ell(r, x + 4, y - 1, 2, 1.6, bl, gr); put(r, x + 6, y - 1, pico);
    if (ab) { for (let k = 0; k < 7; k++) { put(r, x - 2 - k, y - 2 - Math.round(k * 0.6), k > 4 ? os : gr); put(r, x + 1 + k * 0.4, y - 3 - k, k > 4 ? os : gr); } }
    else for (let k = 0; k < 6; k++) { put(r, x - 1 - k, y + Math.round(k * 0.3), gr); put(r, x + 1, y + 1 + k * 0.4, gr); }
  });

// ---------------------------------------------------------------- Mundo 5: la Ciudad Dormida

const gatoPiedra = () => especie('gato_piedra', 'mundo5', 16, 16, 4, 8, { huye: 60, se_esconde: true, corre: 85 },
  'Gato de piedra: duerme en los escalones como un gatito de estatua (gris con ojos lilas que se abren). Al acercarse se despierta y corre a esconderse detrás de una casa.',
  (r, f, run) => {
    const cu = P('#7a7a88'), so = P('#4a4a58'), cl = P('#a4a4b2'), ojo = P('#c0a0ff');
    if (!run) {
      ell(r, 8, 12, 5, 2.6, cu, so, cl); ell(r, 12, 10.5, 2.6, 2.2, cu, so, cl);
      put(r, 11, 8, so); put(r, 13, 8, so);
      const abre = f === 3;
      put(r, 12, 10, abre ? ojo : so); put(r, 13, 10, abre ? ojo : so);
      for (let k = 0; k < 4; k++) put(r, 3 + k, 13 - (k === 3 ? 1 : 0), so);
      return;
    }
    bicho(r, f, run, { cuerpo: cu, sombra: so, luz: cl, ojo, x: 7, y: 11, rx: 4, ry: 2.2, cab: 2.2, oreja: 'punta', cola: 'larga' });
  });
const palomaDormida = () => especie('paloma_dormida', 'mundo5', 16, 16, 4, 8, { huye: 70, se_esconde: false, corre: 60, vuela: true },
  'Paloma dormida: violeta gris, cabecea con la cabeza bajo el ala. Al huir se va volando torpe (sube y baja) y suelta polvo de sueño.',
  (r, f, run) => {
    const cu = P('#7a6e94'), so = P('#4a425e'), cl = P('#a89cc4'), cuello = P('#5aa088');
    if (!run) {
      ell(r, 8, 11, 4.4, 3, cu, so, cl); ell(r, 11, 9 - (f % 2 ? 0.5 : 0), 2, 1.8, cu, so); put(r, 11, 10, cuello);
      put(r, 12, 9, f === 2 ? P('#e0a0ff') : so);
      put(r, 7, 14, P('#c06070')); put(r, 9, 14, P('#c06070'));
      return;
    }
    alado(r, f, run, { ala: cu, alaLuz: cl, cuerpo: so, ojo: P('#e0a0ff'), x: 8, y: 12, envergadura: 5 });
  });

// ---------------------------------------------------------------- Mundo 6: la Fragua de las Luces

const escarabajoBrasa = () => especie('escarabajo_brasa', 'mundo6', 16, 16, 4, 6, { huye: 45, se_esconde: true, corre: 50 },
  'Escarabajo de brasa: caparazón negro con vetas naranjas que laten. Vive en las grietas tibias y se mete en ellas al huir.',
  (r, f, run) => {
    const x = run ? 4 + f * 1.3 : 8, ne = P('#1a1412'), so = P('#0a0806'), ve = f % 2 ? P('#ff8a30') : P('#c04a10');
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) put(r, x - 2 + k * 2, 11 + s * 3 + ((k + f) % 2) * s * (run ? 1 : 0), so);
    ell(r, x, 11, 4, 2.6, ne, so, P('#3a2a24'));
    put(r, x, 9, ve); put(r, x, 10, ve); put(r, x, 11, ve); put(r, x - 2, 10, ve); put(r, x + 2, 12, ve);
    ell(r, x + 4.5, 11, 1.5, 1.2, ne); put(r, x + 6, 10, so); put(r, x + 6, 12, so);
  });
const ratonHollin = () => especie('raton_hollin', 'mundo6', 16, 16, 4, 8, { huye: 60, se_esconde: true, corre: 95 },
  'Ratón de hollín: negro de ceniza con ojitos de brasa, deja una nubecita de ceniza (usar partícula ceniza) al salir corriendo.',
  (r, f, run) => {
    bicho(r, f, run, { cuerpo: P('#2e2826'), sombra: P('#161210'), luz: P('#4e4642'), ojo: P('#ff8a30'), x: 7, y: 11, rx: 3.6, ry: 2.4, cab: 2, oreja: 'redonda', cola: 'larga', hocico: P('#8a5a50') });
  });

// ---------------------------------------------------------------- Mundo 7: el Corazón Helado

const zorroNieve = () => especie('zorro_nieve', 'mundo7', 24, 16, 4, 8, { huye: 80, se_esconde: false, corre: 110 },
  'Zorro de nieve: blanco azulado, casi invisible en la nieve salvo los ojos y la punta negra de las orejas. Huye a saltos largos.',
  (r, f, run) => {
    bicho(r, f, run, { cuerpo: P('#c8d8e8'), sombra: P('#7a8aa8'), luz: P('#f0f8ff'), ojo: P('#1a1a2a'), x: 12, y: 10, rx: 5, ry: 2.8, cab: 2.6, oreja: 'punta', cola: 'peluda', hocico: P('#1a1a2a') });
    if (!run && f === 1) put(r, 17, 7, P('#1a1a2a'));
  });
const armino = () => especie('armino', 'mundo7', 16, 16, 4, 6, { huye: 55, se_esconde: true, corre: 100 },
  'Armiño: largo y blanco con la punta de la cola negra. Se para en dos patas a mirar y se mete en la nieve (se esconde) al huir.',
  (r, f, run) => {
    const bl = P('#e8f0f8'), so = P('#9aa8c0'), ne = P('#141420');
    if (!run) {
      // parado en dos patas, mira a los lados
      ell(r, 8, 10, 2.2, 4, bl, so); ell(r, 8 + (f % 2 ? 1 : 0), 5.5, 2, 1.8, bl, so);
      put(r, 9 + (f % 2 ? 1 : 0), 5, ne); put(r, 4, 13, so); put(r, 3, 13, ne);
      put(r, 7, 14, so); put(r, 9, 14, so);
      return;
    }
    const x = 3 + f * 1.6, y = 11 - Math.round(Math.sin((f / 5) * Math.PI) * 2);
    if (f >= 5) { ell(r, 8, 13, 4, 1.2, so); put(r, 4, 12, ne); return; }
    ell(r, x + 3, y, 4.6, 1.8, bl, so); ell(r, x + 8, y - 1, 1.8, 1.5, bl, so); put(r, x + 9, y - 1.5, ne);
    put(r, x - 2, y, so); put(r, x - 3, y, ne);
  });

export const FAUNA: Record<string, () => Especie[]> = {
  mundo1: () => [polillaLuz(), erizo()],
  mundo2: () => [ratonCatedral(), salamandrita()],
  mundo3: () => [cangrejoCristal(), topoMinero()],
  mundo4: () => [cangrejito(), gaviota()],
  mundo5: () => [gatoPiedra(), palomaDormida()],
  mundo6: () => [escarabajoBrasa(), ratonHollin()],
  mundo7: () => [zorroNieve(), armino()],
};
