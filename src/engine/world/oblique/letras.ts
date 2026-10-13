import type { Lienzo } from './lienzo';
import type { Color } from './paleta';

/**
 * Letra de letrero de 3 x 5, en mayúsculas, con las marcas del vietnamita (y del español) compuestas encima o debajo.
 * Alto de la línea: 11 px. Filas 0 y 1 para el tono, 2 y 3 para el sombrero (^ o breve), 4 a 8 la letra y 10 el
 * punto de abajo (nặng). Sin fuente externa: sale igual en Node y en el navegador.
 */

const G: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  Đ: ['.##.', '.#.#', '####', '.#.#', '.##.'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  '/': ['..#', '..#', '.#.', '#..', '#..'], '-': ['...', '...', '###', '...', '...'], '.': ['...', '...', '...', '...', '.#.'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '¡': ['.#.', '...', '.#.', '.#.', '.#.'], ',': ['...', '...', '...', '.#.', '#..'], ':': ['...', '.#.', '...', '.#.', '...'], ' ': ['..', '..', '..', '..', '..'],
};
const MARCAS: Record<string, [number, number][]> = {
  '́': [[2, 0], [1, 1]], // sắc
  '̀': [[0, 0], [1, 1]], // huyền
  '̉': [[0, 0], [1, 0], [1, 1]], // hỏi
  '̃': [[1, 0], [3, 0], [0, 1], [2, 1]], // ngã
  '̂': [[1, 0], [0, 1], [2, 1]], // mũ
  '̆': [[0, 0], [2, 0], [1, 1]], // trăng
};
const TONOS = new Set(['́', '̀', '̉', '̃']);
export const LINE_H = 11;

/** Separa cada letra en base + marcas, con Đ, Ơ y Ư como letras propias. */
function glyphs(text: string) {
  const out: { g: string[]; marks: string[]; horn: boolean; dot: boolean }[] = [];
  for (const ch of text.toUpperCase().normalize('NFD')) {
    if (/[̀-ͯ]/.test(ch)) {
      const last = out[out.length - 1];
      if (!last) continue;
      if (ch === '̛') last.horn = true;
      else if (ch === '̣') last.dot = true;
      else last.marks.push(ch);
      continue;
    }
    const g = G[ch] ?? G[ch === 'Ð' ? 'Đ' : ' '];
    out.push({ g, marks: [], horn: false, dot: false });
  }
  return out;
}

const widthOf = (x: ReturnType<typeof glyphs>[number]) => x.g[0].length + (x.horn ? 1 : 0);

/** Ancho en pixeles de un texto (con 1 px entre letras). */
export function textWidth(text: string) {
  const gs = glyphs(text);
  return gs.reduce((s, x) => s + widthOf(x) + 1, 0) - (gs.length ? 1 : 0);
}

/** Escribe un texto con la esquina de arriba de la línea en (x, y). */
export function drawText(p: Lienzo, x: number, y: number, text: string, color: Color) {
  let cx = x;
  for (const gl of glyphs(text)) {
    gl.g.forEach((row, j) => [...row].forEach((c, i) => c === '#' && p.p(cx + i, y + 4 + j, color)));
    const hat = gl.marks.filter((m) => !TONOS.has(m));
    const tone = gl.marks.filter((m) => TONOS.has(m));
    const left = gl.g[0].length === 4 ? 1 : 0;
    for (const m of hat) for (const [i, j] of MARCAS[m]) p.p(cx + left + i, y + 2 + j, color);
    for (const m of tone) for (const [i, j] of MARCAS[m]) p.p(cx + left + i + (hat.length ? 1 : 0), y + (hat.length ? 0 : 2) + j, color);
    if (gl.horn) { p.p(cx + 3, y + 4, color); p.p(cx + 3, y + 3, color); }
    if (gl.dot) p.p(cx + left + 1, y + 10, color);
    cx += widthOf(gl) + 1;
  }
}
