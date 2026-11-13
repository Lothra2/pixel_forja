/**
 * La silueta de nuestro héroe a la escala de pixelfx (1x = la mitad de la pantalla), para los efectos de pixelfx que
 * leen el cuerpo (estados, muertes, auras).
 *
 * Está congelada: es la del templario veterano, quieto, mirando al sur, sin sombra, reducido a la mitad, tal como lo
 * pintaba el render de figuras cuando se exportaron los efectos (commit 96f28d64). Los archivos de personajes ahora
 * son del juego y cambian; si la silueta siguiera al render, cada retoque de un personaje cambiaría en silencio los
 * ~40 efectos de cuerpo ya horneados y el json dejaría de coincidir. `heroeReferencia` (solo para las láminas) sí
 * sigue al render de hoy.
 */
import { pintarEscena, type Render } from './render';
import { personajeEscena } from './cuerpo';
import { HEROES } from './catalogo/personajes';

export interface Silueta {
  w: number;
  h: number;
  /** 1 donde hay cuerpo */
  mask: Uint8Array;
  /** brillo 0..1 de cada pixel del cuerpo */
  luz: Float32Array;
}

let SIL: Silueta | null = null;
let FIG: Render | null = null;

/** El héroe de referencia pintado a escala de juego (con su sombra), para las láminas de control. */
export function heroeReferencia(): Render {
  if (FIG) return FIG;
  const h = HEROES.find((x) => x.id === 'templario')!;
  FIG = pintarEscena(personajeEscena(h.cuerpo, h.niveles[1], 'so', 'quieto', 0));
  return FIG;
}

/**
 * La silueta congelada: una fila por renglón, '.' sin cuerpo y un dígito hexadecimal con el brillo del cuerpo en 16
 * pasos (0 a f). Los pies van en la fila de abajo y el cuerpo centrado en x.
 */
const SILUETA_CONGELADA = [
  '..........f.........',
  '.........fd7........',
  '........fff87.......',
  '.......fffe87.......',
  '.......aefeb67......',
  '.......9933465......',
  '...ffeca7655557eeb..',
  '..ffffcb5653346bea7.',
  '.efffe9532423458a75.',
  '..8ba756f845544444..',
  '..44333bfc75554343..',
  '..774459a875544434..',
  '..a753566352344344..',
  '..97424432523444444.',
  '..86433332523433344.',
  '..75432332523433345.',
  '.ffcabcccc523334455.',
  '.983365345523334555.',
  '..62233222523444555.',
  '..22233222523344444.',
  '..23444332423444454.',
  '..22222332423444554.',
  '...2222222323333565.',
  '...22222233233337a6.',
  '...42332233233346857',
  '...63222233233347a66',
  '...6522323323333bfa.',
  '...65323233233339ed.',
  '...444333..333338fd.',
  '...553333..33333bfe.',
  '...433333..333339f..',
  '...432333..33333....',
  '...433333..33333....',
  '....3333...32233....',
  '....3333...53333....',
  '....4333...43333....',
  '....77333..3344.....',
  '....c843....3443....',
  '...6853......33.....',
  '....33..............',
];

/** La silueta del héroe a 1x, con los pies en la fila de abajo y centrada en x. */
export function siluetaHeroe(): Silueta {
  if (SIL) return SIL;
  const h = SILUETA_CONGELADA.length, w = SILUETA_CONGELADA[0].length;
  const mask = new Uint8Array(w * h), luz = new Float32Array(w * h);
  SILUETA_CONGELADA.forEach((fila, y) => {
    for (let x = 0; x < w; x++) if (fila[x] !== '.') { mask[y * w + x] = 1; luz[y * w + x] = parseInt(fila[x], 16) / 15; }
  });
  SIL = { w, h, mask, luz };
  return SIL;
}
