import type { ChibiLook, Peinado } from './look';
import type { Gesto, Vista, CabezaPintada } from './head';
import { capa, pon, hex, sombra, luz, mezcla, VACIO, type Capa } from './paint';

/**
 * La cabeza chibi calcada del video: un bloque de 12 x 10 pixeles por dentro (14 x 12 con el contorno), mirando a la
 * derecha. Así son las de Ryu y Ken: pelo arriba hasta la fila 4 con el flequillo cortado por huecos de piel, el pelo
 * de atrás bajando hasta la oreja, cejas gruesas de 3 pixeles en la fila 6, el ojo de 1 pixel justo debajo del medio
 * de la ceja, el otro ojo pegado al borde de adelante y la boca de 3 pixeles en la fila 9.
 * Cada peinado es una máscara dibujada a mano en ese mismo idioma.
 */

// grilla ampliada: x de -4 a 15 (20 columnas), y de -5 a 12 (18 filas). El bloque de la cabeza: x 0..11, y 0..9.
const X0 = -4, Y0 = -5;
// H pelo, B pelo de atrás (va detrás del cuerpo), x piel a la fuerza (huecos del flequillo), r adorno (color 2), l brillo, h sombra
const M: Record<Peinado, string[]> = {
  corto: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '....HHHHHlHHHHHH....', '....HHHHHHHHHHHH....', '....HHHHHHxHHxHH....',
    '....HHHH............', '....HHHH............', '....HHHH............', '....HHHH............', '....HxH.............',
  ],
  raya: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '....HHHHHHHlHHHH....', '....HHHHHHHHHHHH....', '....HHHHHHHHHxxx....',
    '....HHHH.......x....', '....HHHH............', '....HHHH............', '....HHHH............', '....HxH.............',
  ],
  puntas: [
    '....................', '....................', '..........hH........', '...........H.HHH....', '....HHH.HHHHHHHHH...',
    '...HHHHHHHHHHHHHH...', '...HHHHHHHHHHHHHH...', '...HHhhHHHHHlHHH....', '...HHHHHHHHHHHHHH...', '....HHHHHHxHHHxHH...',
    '....Hhh.............', '....HH..............', '....H...............', '....................', '....................',
  ],
  erizo: [
    '....................', '......H..H..H.......', '.....HH.HH.HH.H.....', '....HHHHHHHHHHHH....', '...HHHHHHHHHHHHHH...',
    '..HHHHHHHHHHHHHHH...', '...HHHHHHHHHHHHHH...', '..HHHHHHHHHlHHHHH...', '...HHHHHHHHHHHHH....', '....HHHHHHxHHxHH....',
    '....HHH.............', '....HH..............', '....H...............', '....................', '....................',
  ],
  atras: [
    '....................', '....................', '....................', '....................', '......HHHHHH........',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '....HHHHHHHHHHlH....', '....HHHHHHHHHHHx....', '....HHHHHxxxxxxx....',
    '....HHH.............', '....HH..............', '....H...............', '....................', '....................',
  ],
  lado: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '....HHHHHHHHHlHHH...', '....HHHHHHHHHHHHH...', '....HHHHHxxxHHHH....',
    '....HHHH........H...', '....HHHH............', '....HHHH............', '....HHH.............', '....HxH.............',
  ],
  rapado: [
    '....................', '....................', '....................', '....................', '....................',
    '.....hhhhhhhhhh.....', '....hhhhhhhhhhhh....', '....hhhhhhhhhhhh....', '....hhhhhhhhhhhx....', '....hhhhxxxxxxxx....',
    '....hhh.............', '....hh..............', '....h...............', '....................', '....................',
  ],
  calvo: [
    '....................', '....................', '....................', '....................', '....................',
    '....................', '....................', '....................', '....................', '....................',
    '....HHH.............', '....HHH.............', '....HHH.............', '....HH..............', '....................',
  ],
  mohicano: [
    '....................', '....................', '.........HH.........', '........HHHH........', '.......HHHHHH.......',
    '......HHHHHHHH......', '....hhHHHHHHHhhh....', '....hhhhhhhhhhhh....', '....hhhhhhhhhhhx....', '....hhhhxxxxxxxx....',
    '....hhh.............', '....hh..............', '....................', '....................', '....................',
  ],
  afro: [
    '....................', '.......HHHHHH.......', '....HHHHHHHHHHHH....', '...HHHHHHHHHHHHHH...', '..HHHHHHHHHHHHHHHH..',
    '..HHHHHHHHHHHHHHHH..', '..HHHHHHHHHHHHHHHH..', '..HHHHHHHHHHlHHHHH..', '..HHHHHHHHHHHHHHH...', '..HHHHHHHHxHHxHH....',
    '..HHHHHH............', '..HHHHHH............', '...HHHHH............', '...HHHH.............', '....HH..............',
  ],
  rizos: [
    '....................', '....................', '.......H..H.........', '....H.HHHHHHH.H.....', '...HHHHHHHHHHHHH....',
    '..HHHHHHHHHHHHHHH...', '...HHHHHHHHHHHHHH...', '..HHHHHhHHHlHHHHH...', '...HHHHHHHHHHHHH....', '..HHHHHHHHxHHxHH....',
    '...HHHHH............', '..HHHHH.............', '...HHHHH............', '..HHHH..............', '...HH...............',
  ],
  bob: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '...HHHHHHHlHHHHH....', '...HHHHHHHHHHHHH....', '...HHHHHHHHHHHHH....',
    '...HHHHH......H.....', '...HHHHH............', '...HHHHH............', '...HHHHH............', '...HHHHH............',
    '....HHH.............',
  ],
  flequillo: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '...HHHHHHHlHHHHH....', '...HHHHHHHHHHHHH....', '...HHHHHHHHHHHHH....',
    '...HHHHHHHHHHHH.....', '...HHHHH............', '...HHHHH............', '...HHHHH............', '...HHHHH............',
    '...HHHHH............',
  ],
  ondas: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '...HHHHHHHHHlHHH....', '...HHHHHHHHHHHHH....', '...HHHHHHHxxxHHH....',
    '..BHHHHH........H...', '..BHHHHH............', '.BBHHHHH............', '..BHHHH.............', '.BBBHHH.............',
    '..BBBBB.............', '.BBBBBB.............', '..BB.BB.............',
  ],
  largo: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '...HHHHHHHHHlHHH....', '...HHHHHHHHHHHHH....', '...HHHHHHHHxxxHH....',
    '..BHHHHH............', '..BHHHHH............', '..BHHHHH............', '..BHHHHH............', '..BBHHHH............',
    '..BBBBBB............', '..BBBBBB............', '...BBBBB............',
  ],
  cola: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '..rrHHHHHHHlHHHH....', '.BBrHHHHHHHHHHHH....', '.BB.HHHHHHxHHxHH....',
    'BB..HHHH............', 'BB..HHHH............', 'B...HHHH............', 'B...HHH.............', '....HxH.............',
  ],
  colitas: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '....HHHHHHHlHHHH....', '....HHHHHHHHHHHH....', '..rrHHHHHHxHHxHH....',
    '.BBrHHHH............', 'BBB.HHHH............', 'BBB.HHHH............', '.BB.HHHH............', '.B..HxH.............',
  ],
  trenzas: [
    '....................', '....................', '....................', '....................', '....................',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '....HHHHHHHlHHHH....', '....HHHHHHHHHHHH....', '...HHHHHHHxHHxHH....',
    '...BHHHH............', '...BHHHH............', '..BhHHHH............', '..BB.HHH............', '..hB.HxH............',
    '..BB................', '..hB................', '..rr................',
  ],
  mono: [
    '.....HHHH...........', '....HHHHHH..........', '....HHHlHH..........', '.....HHHH...........', '......rr............',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '....HHHHHHHHHlHH....', '....HHHHHHHHHHHH....', '....HHHHHHHHxxxx....',
    '....HHHH............', '....HHH.............', '....HH..............', '....................', '....................',
  ],
  recogido: [
    '....................', '....................', '....................', '......HHH...........', '.....HHlHHHH........',
    '.....HHHHHHHHHH.....', '....HHHHHHHHHHHH....', '....HHHHHHHHHlHH....', '....HHHHHHHHHHxx....', '....HHHHHxxxxxxx....',
    '....HHH.............', '....HH..............', '....H...............', '....................', '....................',
  ],
};

const NEGRO = hex('#100c14');
const BOCA = hex('#3a1414');
const LENGUA = hex('#d8505a');
const BLANCO = hex('#fbfaf6');

/** Dentro del bloque de la cabeza (12 x 10, la frente de adelante se mete un pixel desde la fila 5). */
const bloque = (x: number, y: number) => y >= 0 && y <= 9 && (y === 0 ? x >= 1 && x <= 10 : y <= 4 ? x >= 0 && x <= 11 : x >= 0 && x <= 10);

export function pintarCabezaVideo(look: ChibiLook, vistaPedida: Vista, gesto: Gesto = 'normal'): CabezaPintada {
  const vista: 'lado' | 'frente' | 'espalda' = vistaPedida === 'frente34' ? 'frente' : vistaPedida === 'espalda34' ? 'espalda' : vistaPedida;
  const mg = 7;
  const W = 12 + mg * 2, H = 10 + mg * 2 + 4;
  const cara = capa(W, H), atras = capa(W, H);
  const P = (c: Capa, x: number, y: number, v: number, som = 0) => pon(c, mg + x, mg + y, v, som);
  const G = (x: number, y: number) => cara.col[(mg + y) * W + mg + x];
  const piel = hex(look.piel), pielS = sombra(piel);
  const pelo = hex(look.pelo.color), peloS = sombra(pelo), peloL = luz(pelo), acento = hex(look.pelo.color2 ?? '#e8455a');
  const mujer = ['mujer', 'nino', 'pequena', 'abuela'].includes(look.contextura) || ['pestanas', 'grandes'].includes(look.ojos.estilo);

  // el bloque de piel
  for (let y = 0; y <= 9; y++) for (let x = 0; x <= 11; x++) if (bloque(x, y)) P(cara, x, y, y === 9 && (x <= 3) ? pielS : piel, 0);

  if (vista === 'lado') {
    // la máscara del peinado
    const mask = M[look.pelo.estilo] ?? M.corto;
    mask.forEach((row, j) => row.split('').forEach((ch, i) => {
      const x = i + X0, y = j + Y0;
      if (ch === '.') return;
      if (ch === 'x') { if (bloque(x, y)) P(cara, x, y, piel); return; }
      if (ch === 'B') { P(atras, x, y, (x + y) % 5 === 0 ? peloS : pelo, 1); return; }
      const v = ch === 'r' ? acento : ch === 'l' ? peloL : ch === 'h' ? (look.pelo.estilo === 'rapado' || look.pelo.estilo === 'mohicano' ? mezcla(pelo, piel, 0.45) : peloS) : pelo;
      P(cara, x, y, v, ch === 'H' ? 1 : 0);
    }));
    // la oreja (si el pelo la deja ver)
    if (G(1, 9) === piel || G(1, 9) === pielS) P(cara, 1, 9, pielS);
    pintarCaraLado(look, gesto, mujer, (x, y, v) => P(cara, x, y, v), G, piel);
  } else if (vista === 'frente') {
    pintarFrente(look, gesto, mujer, cara, atras, mg, piel, pelo, peloS, acento, P, G);
  } else {
    // de espaldas: todo pelo, y el largo cae por la espalda (por delante del cuerpo)
    const est = look.pelo.estilo;
    const corto = ['calvo'].includes(est);
    for (let y = 0; y <= 9; y++) for (let x = 0; x <= 11; x++) if (bloque(x, y) || (y >= 5 && x === 11)) {
      if (corto && y < 6) continue;
      P(cara, x, y, y === 9 && est !== 'largo' && est !== 'ondas' && est !== 'bob' && est !== 'flequillo' ? pielS : pelo, 1);
    }
    for (const [x, y] of [[-1, 6], [12, 6]]) P(cara, x, y, piel);
    const largo = est === 'largo' || est === 'ondas' ? 13 : est === 'bob' || est === 'flequillo' ? 11 : 0;
    for (let y = 9; y < largo; y++) for (let x = 1; x <= 10; x++) P(cara, x, y, pelo, 1);
    if (est === 'cola' || est === 'trenzas') { for (let y = 4; y < 13; y++) { P(cara, 5, y, pelo, 1); P(cara, 6, y, pelo, 1); } P(cara, 5, 4, acento); P(cara, 6, 4, acento); }
    if (est === 'colitas') for (const x of [-2, 13]) for (let y = 4; y < 10; y++) { P(cara, x, y, pelo, 1); P(cara, x + (x < 0 ? 1 : -1), y, pelo, 1); }
    if (est === 'mono' || est === 'recogido') for (let y = -3; y < 0; y++) for (let x = 4; x <= 7; x++) P(cara, x, y, pelo, 1);
    if (est === 'puntas' || est === 'erizo') for (let x = 1; x <= 10; x += 2) P(cara, x, -1, pelo, 1);
    if (est === 'afro' || est === 'rizos') for (let y = -2; y <= 9; y++) { P(cara, -1, y, pelo, 1); P(cara, 12, y, pelo, 1); }
  }

  if (look.gorro) pintarGorroVideo(look, vista, (x, y, v, s = 1) => P(cara, x, y, v, s), (x, y) => { const i = (mg + y) * W + mg + x; if (i >= 0 && i < cara.col.length) cara.col[i] = VACIO; });

  return { cara, atras, cuello: [mg + 6, mg + 10], mg };
}

type Pinta = (x: number, y: number, v: number) => void;

function pintarCaraLado(look: ChibiLook, gesto: Gesto, mujer: boolean, P: Pinta, G: (x: number, y: number) => number, piel: number) {
  const ceja = mujer ? mezcla(hex(look.cejas.color ?? look.pelo.color), NEGRO, 0.4) : NEGRO;
  let est = look.cejas.estilo;
  let ojos = look.ojos.estilo;
  let boca = look.boca;
  if (gesto === 'golpe' || gesto === 'bravo') { est = 'bravas'; if (gesto === 'golpe') boca = 'abierta'; }
  if (gesto === 'feliz') { ojos = 'felices'; boca = 'abierta'; }
  if (gesto === 'triste') est = 'tristes';
  if (gesto === 'sorpresa' || gesto === 'hablar') boca = 'abierta';
  const libre = (x: number, y: number) => { const v = G(x, y); return v === piel || v === sombra(piel); };
  const Q = (x: number, y: number, v: number) => { if (libre(x, y) || v === NEGRO) P(x, y, v); };
  // marcas antes
  if (look.marca === 'panda') { for (let y = 6; y <= 8; y++) for (let x = 5; x <= 7; x++) P(x, y, hex('#26242a')); for (let y = 6; y <= 8; y++) P(10, y, hex('#26242a')); }
  if (look.marca === 'cachetes' || gesto === 'feliz') { const r = mezcla(piel, hex('#ff6f8a'), 0.5); Q(5, 8, r); Q(10, 8, r); }
  if (look.marca === 'pecas') { const p = sombra(sombra(piel)); Q(5, 8, p); Q(9, 8, p); }
  if (look.marca === 'curita') { Q(9, 8, hex('#f2d2a8')); Q(10, 8, hex('#f2d2a8')); }
  if (look.marca === 'lunar') Q(10, 9, hex('#4a2a1e'));
  // cejas: la de atrás de 3 pixeles, la de adelante de 2 pegada al borde
  const conLentes = !!look.lentes && look.lentes.estilo !== 'sol';
  if (!conLentes) {
    if (est === 'finas' || mujer) { Q(6, 6, ceja); Q(7, 6, ceja); Q(10, 6, ceja); }
    else if (est === 'bravas') { Q(5, 5, ceja); Q(6, 6, ceja); Q(7, 6, ceja); Q(9, 6, ceja); Q(10, 5, ceja); }
    else if (est === 'tristes') { Q(5, 6, ceja); Q(6, 6, ceja); Q(7, 5, ceja); Q(9, 5, ceja); Q(10, 6, ceja); }
    else { Q(5, 6, ceja); Q(6, 6, ceja); Q(7, 6, ceja); Q(9, 6, ceja); Q(10, 6, ceja); if (est === 'gruesas') { Q(6, 5, ceja); } }
  }
  // ojos
  const ojoN = look.marca === 'panda' ? BLANCO : NEGRO;
  const ojo = (x: number) => {
    if (gesto === 'ko') { P(x - 1, 6, NEGRO); P(x + 1, 6, NEGRO); P(x, 7, NEGRO); P(x - 1, 8, NEGRO); P(x + 1, 8, NEGRO); return; }
    if (gesto === 'dolor' || gesto === 'esfuerzo') { P(x - 1, 6, NEGRO); P(x, 7, NEGRO); P(x - 1, 8, NEGRO); return; }
    if (gesto === 'parpadeo' || gesto === 'dormido') { P(x - 1, 7, NEGRO); P(x, 7, NEGRO); return; }
    if (ojos === 'felices') { P(x - 1, 7, NEGRO); P(x, 6, NEGRO); P(x + 1, 7, NEGRO); return; }
    if (ojos === 'dormilones') { P(x - 1, 7, NEGRO); P(x, 7, NEGRO); return; }
    P(x, 7, ojoN);
    if (ojos === 'grandes' || gesto === 'sorpresa') { P(x, 8, look.ojos.color === '#141014' ? NEGRO : hex(look.ojos.color)); P(x, 6, NEGRO); }
    if (ojos === 'pestanas') P(x + 1, 6, NEGRO);
  };
  ojo(6);
  if (G(10, 7) !== VACIO) ojo(10);
  // barba (antes de la boca, la boca queda encima)
  if (look.barba) {
    const b = hex(look.barba.color), bS = sombra(b);
    const e = look.barba.estilo;
    const B = (x: number, y: number, v = b) => { if (libre(x, y)) P(x, y, e === 'sombra' ? mezcla(piel, b, 0.45) : v); };
    if (e === 'barba' || e === 'sombra') { for (let x = 3; x <= 10; x++) B(x, 9, x <= 4 ? bS : b); B(4, 8); B(5, 8, bS); for (let y = 6; y <= 8; y++) B(4, y, bS); }
    if (e === 'bigote' || e === 'candado' || e === 'barba') { B(7, 8); B(8, 8); B(9, 8); }
    if (e === 'candado' || e === 'chivo') { B(7, 9); B(8, 9); B(9, 9); }
  }
  // boca
  if (gesto === 'ko') { P(7, 9, BOCA); P(8, 9, NEGRO); P(9, 9, BOCA); }
  else if (gesto === 'dolor') { P(7, 9, NEGRO); P(8, 9, LENGUA); P(9, 9, NEGRO); P(8, 8, NEGRO); }
  else if (gesto === 'esfuerzo') { P(7, 9, NEGRO); P(8, 9, BLANCO); P(9, 9, NEGRO); }
  else if (boca === 'abierta') { P(8, 8, NEGRO); P(9, 8, NEGRO); P(8, 9, LENGUA); P(9, 9, NEGRO); }
  else if (boca === 'sonrisa') { P(7, 8, NEGRO); P(8, 9, NEGRO); P(9, 9, NEGRO); P(10, 8, NEGRO); }
  else if (boca === 'gato') { P(7, 9, NEGRO); P(8, 8, NEGRO); P(9, 9, NEGRO); }
  else if (mujer) { P(8, 9, BOCA); P(9, 9, BOCA); }
  else { P(7, 9, NEGRO); P(8, 9, NEGRO); P(9, 9, NEGRO); }
  // aretes
  if (look.aretes && G(1, 9) !== VACIO && !['largo', 'ondas', 'bob', 'flequillo', 'afro'].includes(look.pelo.estilo)) {
    const a = hex(look.aretes.color);
    P(1, 10, a); if (look.aretes.estilo !== 'perla') P(1, 11, a);
  }
  // lentes: marco arriba (hace de ceja), los lados y el vidrio claro; el ojo se sigue viendo
  if (look.lentes && gesto !== 'ko') {
    const fr = hex(look.lentes.color);
    const e = look.lentes.estilo;
    const vidrio = (x: number, y: number) => { if (libre(x, y)) P(x, y, e === 'sol' ? hex('#1c1a22') : mezcla(G(x, y), hex('#e8f6ff'), 0.55)); };
    for (const [a, b2] of [[5, 7], [9, 10]] as [number, number][]) {
      for (let x = a; x <= b2; x++) P(x, 6, fr);
      vidrio(a, 7); vidrio(b2, 7); if (b2 - a > 1) vidrio(a + 1, 8);
      if (e === 'cuadrados' || e === 'nerd' || e === 'sol') { P(a, 8, fr); P(b2, 8, fr); }
      if (e === 'sol') for (let x = a; x <= b2; x++) P(x, 7, hex('#1c1a22'));
      if (e === 'gato') { P(a - 1, 5, fr); P(b2 + (b2 === 10 ? 1 : 0), 5, fr); }
    }
    P(8, 6, fr);
    for (let x = 2; x <= 4; x++) if (libre(x, 6) || G(x, 6) === hex(look.pelo.color)) P(x, 6, fr);
  }
}

function pintarFrente(look: ChibiLook, gesto: Gesto, mujer: boolean, cara: Capa, atras: Capa, _mg: number, piel: number, pelo: number, peloS: number, acento: number,
  P: (c: Capa, x: number, y: number, v: number, som?: number) => void, G: (x: number, y: number) => number) {
  const est = look.pelo.estilo;
  // de frente: el pelo arriba, los lados según el largo y el flequillo con huecos
  const lado = ({ largo: 13, ondas: 13, bob: 10, flequillo: 10, afro: 9, rizos: 9 } as Record<string, number>)[est] ?? 6;
  const alto = ({ calvo: -1, rapado: 3, atras: 3, recogido: 3, mohicano: 0 } as Record<string, number>)[est] ?? 4;
  for (let y = 0; y <= 9; y++) for (let x = 0; x <= 11; x++) {
    if (!(y === 0 ? x >= 1 && x <= 10 : x >= 0 && x <= 11)) continue;
    const borde = x <= 1 || x >= 10;
    let pel = y <= alto || (borde && y <= lado);
    if (est === 'calvo') pel = borde && y >= 4 && y <= 7;
    if (est === 'mohicano') pel = y <= 1 && x >= 4 && x <= 7;
    if (y === alto && alto >= 4 && (x === 3 || x === 8)) pel = false;
    if (pel) P(cara, x, y, est === 'rapado' ? mezcla(pelo, piel, 0.45) : pelo, 1);
  }
  for (let x = 1; x <= 10; x++) P(cara, x, 9, G(x, 9) === pelo ? pelo : piel);
  // volumen
  if (est === 'puntas' || est === 'erizo') for (let x = 1; x <= 10; x += 3) { P(cara, x, -1, pelo, 1); P(cara, x + 1, -1, pelo, 1); }
  if (est === 'afro' || est === 'rizos') for (let y = -2; y <= 9; y++) for (const x of [-1, 12, -2, 13]) if (est === 'afro' || (x === -1 || x === 12)) P(cara, x, y, pelo, 1);
  if (est === 'afro' || est === 'rizos') for (let x = 0; x <= 11; x++) { P(cara, x, -1, pelo, 1); if (est === 'afro') P(cara, x, -2, pelo, 1); }
  if (est === 'mono' || est === 'recogido') for (let y = -3; y < 0; y++) for (let x = 4; x <= 7; x++) P(cara, x, y, pelo, 1);
  if (est === 'colitas') for (const x of [-2, 13]) for (let y = 3; y < 10; y++) { P(atras, x, y, pelo, 1); P(atras, x + (x < 0 ? 1 : -1), y, pelo, 1); }
  if (est === 'largo' || est === 'ondas') for (let y = 6; y < 14; y++) for (const x of [-1, 0, 11, 12]) P(atras, x, y, pelo, 1);
  if (est === 'cola') { P(cara, -1, 3, acento); P(atras, -2, 4, pelo, 1); P(atras, -2, 5, pelo, 1); }
  void peloS;
  // cara de frente: cejas en la fila 6, ojos en la 7, boca en la 9
  const ceja = mujer ? mezcla(hex(look.cejas.color ?? look.pelo.color), hex('#100c14'), 0.4) : hex('#100c14');
  const Q = (x: number, y: number, v: number) => P(cara, x, y, v);
  if (!look.lentes) { if (mujer) { Q(3, 6, ceja); Q(4, 6, ceja); Q(7, 6, ceja); Q(8, 6, ceja); } else { Q(2, 6, ceja); Q(3, 6, ceja); Q(4, 6, ceja); Q(7, 6, ceja); Q(8, 6, ceja); Q(9, 6, ceja); } }
  const NG = hex('#100c14');
  const ojo = (x: number) => {
    if (gesto === 'ko') { Q(x - 1, 6, NG); Q(x + 1, 6, NG); Q(x, 7, NG); Q(x - 1, 8, NG); Q(x + 1, 8, NG); return; }
    if (gesto === 'dolor' || gesto === 'parpadeo' || gesto === 'dormido' || gesto === 'esfuerzo') { Q(x - 1, 7, NG); Q(x, 7, NG); return; }
    if (gesto === 'feliz' || look.ojos.estilo === 'felices') { Q(x - 1, 7, NG); Q(x, 6, NG); Q(x + 1, 7, NG); return; }
    Q(x, 7, look.marca === 'panda' ? hex('#fbfaf6') : NG);
    if (look.ojos.estilo === 'grandes') Q(x, 8, NG);
  };
  if (look.marca === 'panda') for (const x of [3, 8]) for (let y = 6; y <= 8; y++) for (let dx = -1; dx <= 1; dx++) Q(x + dx, y, hex('#26242a'));
  ojo(3); ojo(8);
  if (look.marca === 'cachetes' || gesto === 'feliz') { const r = mezcla(piel, hex('#ff6f8a'), 0.5); Q(2, 8, r); Q(9, 8, r); }
  if (look.barba) { const b = hex(look.barba.color); for (let x = 1; x <= 10; x++) Q(x, 9, b); Q(1, 8, b); Q(10, 8, b); Q(5, 8, b); Q(6, 8, b); }
  if (gesto === 'golpe' || look.boca === 'abierta' || gesto === 'feliz' || gesto === 'sorpresa' || gesto === 'hablar') { Q(5, 9, NG); Q(6, 9, hex('#d8505a')); }
  else if (look.boca === 'sonrisa') { Q(4, 8, NG); Q(5, 9, NG); Q(6, 9, NG); Q(7, 8, NG); }
  else { Q(5, 9, NG); Q(6, 9, NG); }
  if (look.lentes) {
    const fr = hex(look.lentes.color);
    for (const x0 of [2, 7]) { for (let x = x0; x <= x0 + 2; x++) Q(x, 6, fr); Q(x0, 7, mezcla(piel, hex('#e8f6ff'), 0.5)); Q(x0 + 2, 7, mezcla(piel, hex('#e8f6ff'), 0.5)); if (look.lentes.estilo === 'sol') for (let x = x0; x <= x0 + 2; x++) Q(x, 7, hex('#1c1a22')); }
    Q(5, 6, fr); Q(6, 6, fr);
  }
  if (look.aretes && lado < 9) { const a = hex(look.aretes.color); Q(-1, 9, a); Q(12, 9, a); }
}

/** Gorros sobre la grilla de la cabeza (mirando a la derecha; de frente se centran). */
function pintarGorroVideo(look: ChibiLook, vista: 'lado' | 'frente' | 'espalda', P: (x: number, y: number, v: number, s?: number) => void, borra: (x: number, y: number) => void) {
  const g = look.gorro!;
  const c1 = hex(g.color), c2 = hex(g.color2 ?? '#f4f2ee');
  const lado = vista === 'lado';
  const limpiaArriba = (hasta: number) => { for (let y = -5; y < hasta; y++) for (let x = -4; x <= 15; x++) if (y < 0) borra(x, y); };
  const domo = (hasta: number, v: number) => { for (let y = -1; y < hasta; y++) for (let x = y < 0 ? 2 : y === 0 ? 1 : 0; x <= (y < 0 ? 9 : y === 0 ? 10 : 11); x++) P(x, y, v); };
  switch (g.estilo) {
    case 'gorra': case 'gorra_atras': {
      limpiaArriba(0); domo(3, c1);
      const atras = g.estilo === 'gorra_atras';
      // la visera es del color de la gorra un poco más oscura: blanca parecía un pixel suelto
      if (lado) for (let i = 0; i < 3; i++) P(atras ? -1 - i : 12 + i, 2, sombra(c1));
      else if ((vista === 'frente') !== atras) for (let x = 0; x <= 11; x++) P(x, 3, c2);
      P(lado ? 7 : 5, 0, luz(c1), 0);
      break;
    }
    case 'gorro_lana': { limpiaArriba(0); domo(4, c1); for (let x = 0; x <= 11; x++) P(x, 3, c2); P(5, -2, c2); P(6, -2, c2); break; }
    case 'navidad': {
      limpiaArriba(0); domo(3, c1);
      for (let x = 0; x <= 11; x++) P(x, 3, c2, 0);
      // la punta cae para atrás
      const cola = lado ? [[3, -2], [2, -2], [1, -1], [0, -1], [-1, 0], [-2, 1]] : [[8, -2], [9, -2], [10, -1], [11, -1], [12, 0], [13, 1]];
      for (const [x, y] of cola) { P(x, y, c1); P(x, y + 1, c1); }
      const [tx, ty] = cola[cola.length - 1];
      P(tx, ty + 2, c2, 0); P(tx - (lado ? 1 : -1), ty + 2, c2, 0); P(tx, ty + 3, c2, 0);
      break;
    }
    case 'vincha': {
      // como la de Ryu: dos filas en la frente y las tiras atrás
      for (let x = -1; x <= 12; x++) { P(x, 3, c1); P(x, 4, x % 4 === 0 ? sombra(c1) : c1); }
      // dos tiras cortas y pegadas que caen hacia atrás (sin rulos sueltos)
      if (lado) for (const [x, y, s] of [[-2, 4, 0], [-3, 5, 0], [-4, 5, 0], [-2, 5, 1], [-3, 6, 1], [-4, 7, 1]] as const) P(x, y, s ? sombra(c1) : c1);
      break;
    }
    case 'cintillo': for (let x = 0; x <= 11; x++) P(x, 1, c1, 0); break;
    case 'lazo': case 'flor': {
      const cx = lado ? 3 : 9, cy = -1;
      if (g.estilo === 'lazo') { for (const [dx, dy] of [[-2, -1], [-2, 0], [-2, 1], [-1, 0], [1, 0], [2, -1], [2, 0], [2, 1]]) P(cx + dx, cy + dy, c1); P(cx, cy, c2); }
      else { for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) P(cx + dx, cy + dy, c1); P(cx, cy, c2); }
      break;
    }
    case 'corona': { limpiaArriba(0); for (let x = 2; x <= 9; x++) { P(x, -1, c1); P(x, 0, c1); if (x % 2 === 0) P(x, -2, c1); } P(4, -3, c1); P(8, -3, c1); P(6, -1, c2, 0); break; }
    case 'tiara': { for (let x = 3; x <= 9; x++) P(x, 1, c1, 0); P(6, 0, c1); P(6, -1, c2, 0); break; }
    case 'panda': { for (const x of lado ? [2, 8] : [1, 9]) { P(x, -2, c1); P(x + 1, -2, c1); P(x, -1, c1); P(x + 1, -1, c1); } break; }
    case 'chef': { limpiaArriba(0); for (let x = 0; x <= 11; x++) { P(x, 1, c1); P(x, 2, c1); } for (let y = -5; y <= 0; y++) for (let x = 0; x <= 11; x++) if (!((y === -5) && (x < 2 || x > 9))) P(x, y, c1); break; }
    case 'fiesta': { for (let y = -5; y <= 0; y++) { const w = Math.round((y + 6) / 1.3); for (let x = 6 - w; x <= 5 + w; x++) P(x, y, (x + y) % 3 === 0 ? c2 : c1); } P(5, -6, c2); break; }
    case 'boina': { limpiaArriba(0); for (let x = lado ? 1 : 0; x <= 12; x++) { P(x, -1, c1); P(x, 0, c1); } for (let x = 3; x <= 9; x++) P(x, -2, c1); P(6, -3, c1); break; }
    case 'casco': { limpiaArriba(0); domo(5, c1); for (let y = -1; y < 5; y++) P(lado ? 6 : 5, y, c2, 0); break; }
    case 'audifonos': { for (let x = 0; x <= 11; x++) P(x, -1, c1, 0); for (const x of lado ? [1] : [-1, 12]) for (let y = 5; y <= 8; y++) P(x, y, c1); break; }
    case 'llanero': case 'paja': {
      limpiaArriba(0);
      for (let y = -3; y <= 1; y++) for (let x = 1; x <= 10; x++) P(x, y, c1);
      for (let x = 1; x <= 10; x++) P(x, 1, c2, 0);
      for (let x = -3; x <= 14; x++) P(x, 2, c1);
      if (g.estilo === 'llanero') { P(-3, 1, c1); P(14, 1, c1); }
      break;
    }
  }
}
