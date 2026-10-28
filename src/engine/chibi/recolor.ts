import type { ChibiLook } from './look';
import { hex, mezcla, sombra } from './paint';
import { MARGEN } from './cabezaMolde';

/**
 * Vestir un molde sin redibujarlo: cada pixel del sprite queda donde el artista lo puso y solo cambia su color según
 * lo que es (pelo, piel, ropa de arriba, de abajo, cinturón, guante, pie, cinta), como el cambio de paleta de los
 * juegos de pelea. Encima van los rasgos del familiar con uno o dos pixeles, anclados a lo que ya trae la cara:
 * lentes alrededor del ojo, barba en la fila del mentón, arete en la oreja, cola o pelo largo en la nuca, rizos en el
 * borde del pelo. Nada se reconstruye: lo que no se puede decir en dos pixeles no se dibuja.
 */

export interface MoldeRecolor { w: number; h: number; filas: string[]; cabeza: { cara: number; espalda: boolean } | null }

const NEGRO = hex('#100c14');
export const VACIO_RC = -1;
const CAB = new Set(['H', 'h', 'R', 'r', 'S', 'E', 'k']);
const PELO = new Set(['H', 'h', 'R', 'r']);
const CUBREN = new Set(['gorra', 'gorra_atras', 'gorro_lana', 'navidad', 'boina', 'casco', 'llanero', 'paja', 'chef', 'panda', 'fiesta']);
const BANDAS = new Set(['vincha', 'tiara', 'cintillo', 'corona']);

const lum = (v: number) => ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11;
/** Sube un color hasta que se lea contra el contorno (lo negro pasa a gris azulado, como en SF2). */
function subir(v: number, min: number): number {
  const l = lum(v);
  return l >= min ? v : mezcla(v, hex('#b8bccc'), Math.min(0.62, (min - l) / (186 - l)));
}
/** [claro, oscuro] de una tela: la sombra siempre se distingue de la luz y ninguna cae en el negro. */
function tela(v: number): [number, number] {
  const claro = subir(v, 62);
  let osc = sombra(claro);
  if (lum(osc) > lum(claro) * 0.8) osc = mezcla(claro, NEGRO, 0.3);
  if (lum(osc) < 36) osc = subir(osc, 36);
  return [claro, osc];
}

function girar<T>(g: T[][], k: number): T[][] {
  let a = g;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) {
    const h = a.length, w = a[0].length;
    const b: T[][] = Array.from({ length: w }, () => new Array<T>(h));
    for (let r = 0; r < w; r++) for (let c = 0; c < h; c++) b[r][c] = a[c][w - 1 - r];
    a = b;
  }
  return a;
}

/** Colores de cada clase del molde para un muñeco. */
export function paletaMolde(look: ChibiLook): Record<string, number> {
  const piel = hex(look.piel);
  const [arr, arrS] = tela(look.arriba.estilo === 'nada' ? piel : hex(look.arriba.color));
  const [aba, abaS] = tela(hex(look.abajo.color));
  const zap = look.zapatos.estilo === 'descalzo' ? piel : subir(hex(look.zapatos.color), 40);
  const gua = look.guantes ? subir(hex(look.guantes), 40) : piel;
  const cint = look.accesorio?.estilo === 'cinturon' ? subir(hex(look.accesorio.color), 36)
    : ['gi', 'gi_sin_mangas', 'kimono'].includes(look.arriba.estilo) ? subir(hex(look.arriba.color3 ?? '#33251c'), 36) : abaS;
  const calvo = look.pelo.estilo === 'calvo';
  const g = look.gorro;
  const cubre = g && CUBREN.has(g.estilo);
  const pelo = calvo ? piel : cubre ? subir(hex(g.estilo === 'panda' ? '#f0ece4' : g.color), 50) : subir(hex(look.pelo.color), 40);
  const peloH = calvo ? piel : cubre ? sombra(pelo) : mezcla(pelo, hex('#ffffff'), 0.16);
  // la cinta de Ryu: vincha o tiara del familiar; si no tiene, es pelo
  const banda = g && BANDAS.has(g.estilo) ? subir(hex(g.color), 50) : cubre && g.color2 ? subir(hex(g.color2), 50) : null;
  return {
    K: NEGRO, k: NEGRO, E: NEGRO, H: pelo, h: peloH, R: banda ?? pelo, r: banda ? sombra(banda) : pelo,
    S: piel, A: piel, P: zap, C: arr, c: arrS, D: aba, d: abaS, L: cint, B: gua, W: hex('#f4f2ee'), F: hex('#fbfaf2'),
  };
}

/**
 * Pinta el molde con los colores y rasgos del muñeco. Devuelve la grilla de colores con `MARGEN` alrededor (lo que
 * se agrega, como el pelo largo, puede salir del molde). `tinte` deja cambiar el color de un pixel del cuerpo
 * (estampados).
 */
export function recolorMolde(look: ChibiLook, m: MoldeRecolor, tinte?: (x: number, y: number, ch: string, v: number) => number): { col: number[][]; w: number; h: number } {
  const pal = paletaMolde(look);
  const W0 = m.w + 2 * MARGEN, H0 = m.h + 2 * MARGEN;
  const base: string[][] = Array.from({ length: H0 }, (_, y) => Array.from({ length: W0 }, (_, x) => {
    const yy = y - MARGEN, xx = x - MARGEN;
    return yy >= 0 && yy < m.h && xx >= 0 && xx < m.w ? m.filas[yy][xx] : '.';
  }));
  const col0: number[][] = base.map((f, y) => f.map((ch, x) => {
    if (ch === '.') return VACIO_RC;
    const v = pal[ch] ?? NEGRO;
    return tinte && !CAB.has(ch) ? tinte(x - MARGEN, y - MARGEN, ch, v) : v;
  }));
  if (!m.cabeza) return { col: col0, w: W0, h: H0 };

  // ---- la cabeza arriba: cuartos de vuelta según de dónde cuelga el cuerpo
  let hx = 0, hy = 0, hn = 0, bx = 0, by = 0, bn = 0;
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
    const ch = base[y][x];
    if (ch === '.') continue;
    if (CAB.has(ch) && ch !== 'k') { hx += x; hy += y; hn++; } else if (!CAB.has(ch)) { bx += x; by += y; bn++; }
  }
  let k = 0;
  if (hn && bn) { const vx = bx / bn - hx / hn, vy = by / bn - hy / hn; k = Math.abs(vy) >= Math.abs(vx) ? (vy > 0 ? 0 : 2) : vx > 0 ? 1 : 3; }
  const U = girar(base, k), C = girar(col0, k);
  const H = U.length, W = U[0].length;
  const en = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? U[y][x] : '.');
  const pon = (x: number, y: number, ch: string, v: number) => { if (x >= 0 && y >= 0 && x < W && y < H) { U[y][x] = ch; C[y][x] = v; } };
  const vacio = (x: number, y: number) => en(x, y) === '.';

  // medidas de la cabeza y la cara
  let x0 = W, x1 = -1, y0 = H, y1 = -1, fx0 = W, fx1 = -1, fy0 = H, fy1 = -1, fn = 0, fcx = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = U[y][x];
    if (!CAB.has(ch)) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    if (ch === 'S') { fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy0 = Math.min(fy0, y); fy1 = Math.max(fy1, y); fn++; fcx += x; }
  }
  if (x1 < 0) return { col: girar(C, (4 - k) % 4), w: W0, h: H0 };
  const espalda = fn < 6;
  // hacia dónde mira: el pelo (flequillo, patilla, colas de la cinta) queda del lado de atrás a la altura de la cara
  let izq = 0, der = 0;
  if (!espalda) for (let y = fy0; y <= fy1; y++) for (let x = x0; x <= x1; x++) if (PELO.has(U[y][x])) { if (x < (x0 + x1) / 2) izq++; else der++; }
  const frente = espalda ? 1 : izq !== der ? (izq > der ? 1 : -1) : fcx / fn >= (x0 + x1) / 2 ? 1 : -1;
  const atras = frente === 1 ? x0 : x1;
  const piel = pal.S;

  // ---- rasgos de la cara, anclados a lo que trae el sprite: cejas, ojo, boca
  if (!espalda) {
    const dentro = (x: number, y: number) => { const c = en(x, y); return c === 'E' || c === 'k' || c === 'K'; };
    const interior: [number, number][] = [];
    for (let y = fy0; y <= fy1; y++) for (let x = fx0 - 1; x <= fx1 + 1; x++) {
      if (!dentro(x, y)) continue;
      const vecinos = [en(x - 1, y), en(x + 1, y), en(x, y - 1), en(x, y + 1)];
      if (vecinos.every((c) => CAB.has(c))) interior.push([x, y]);
    }
    const cejaY = interior.length ? Math.min(...interior.map((p) => p[1])) : -1;
    let ojos = interior.filter((p) => p[1] === cejaY + 1);
    const cejas = interior.filter((p) => p[1] === cejaY);
    if (!ojos.length) ojos = cejas;
    const ojoY = ojos.length ? ojos[0][1] : -1;
    const esPiel = (x: number, y: number) => en(x, y) === 'S';
    // cejas finas: más suaves (las gruesas de Ryu quedan para los hombres)
    if (look.cejas.estilo === 'finas' && ojos !== cejas) for (const [x, y] of cejas) pon(x, y, 'E', mezcla(piel, NEGRO, 0.55));
    // ojos
    const ojo = look.ojos.estilo;
    for (const [x, y] of ojos) {
      if (ojo === 'grandes' && esPiel(x, y + 1)) pon(x, y + 1, 'E', NEGRO);
      if (ojo === 'pestanas' && esPiel(x + frente, y)) pon(x + frente, y, 'E', NEGRO);
      if (ojo === 'felices') { if (esPiel(x - 1, y + 1)) pon(x - 1, y + 1, 'E', NEGRO); if (esPiel(x + 1, y + 1)) pon(x + 1, y + 1, 'E', NEGRO); }
    }
    // lentes: a los lados del ojo el cristal, debajo el marco, y una patita hacia la oreja
    if (look.lentes) {
      const marco = hex(look.lentes.color), cristal = look.lentes.estilo === 'sol' ? marco : hex('#dbeaf8');
      for (const [x, y] of ojos) {
        for (const dx of [-1, 1]) if (esPiel(x + dx, y)) pon(x + dx, y, 'S', cristal);
        for (const dx of [-1, 0, 1]) if (esPiel(x + dx, y + 1)) pon(x + dx, y + 1, 'S', marco);
        if (esPiel(x - 2 * frente, y)) pon(x - 2 * frente, y, 'S', marco);
      }
    }
    // marcas: panda alrededor del ojo, cachetes y pecas bajo el ojo, lunar junto a la boca
    if (look.marca === 'panda') for (const [x, y] of ojos) for (const dx of [-1, 1]) if (esPiel(x + dx, y)) pon(x + dx, y, 'E', NEGRO);
    if (look.marca === 'cachetes' || look.marca === 'pecas') {
      const v = look.marca === 'cachetes' ? mezcla(piel, hex('#f06a8a'), 0.45) : mezcla(piel, NEGRO, 0.3);
      for (const [x, y] of ojos) { if (esPiel(x + 2 * frente, y + 1)) pon(x + 2 * frente, y + 1, 'S', v); if (esPiel(x - 2 * frente, y + 2)) pon(x - 2 * frente, y + 2, 'S', v); }
    }
    if (look.marca === 'lunar' && ojos.length && esPiel(ojos[0][0] + frente, fy1 - 1)) pon(ojos[0][0] + frente, fy1 - 1, 'S', mezcla(piel, NEGRO, 0.6));
    // barba: la fila del mentón y las patillas; la boca queda
    if (look.barba) {
      const b = look.barba, v = b.estilo === 'sombra' ? mezcla(piel, hex(b.color), 0.45) : subir(hex(b.color), 40);
      const cx = (fx0 + fx1) / 2;
      for (let x = fx0; x <= fx1; x++) {
        const delante = (x - cx) * frente > 0;
        if (b.estilo === 'bigote') continue;
        if (b.estilo === 'chivo' && !delante) continue;
        if (esPiel(x, fy1)) pon(x, fy1, 'S', v);
        if ((b.estilo === 'barba' || b.estilo === 'sombra') && !delante && esPiel(x, fy1 - 1) && (x - atras) * frente <= 2) pon(x, fy1 - 1, 'S', v);
      }
      if ((b.estilo === 'bigote' || b.estilo === 'candado') && ojoY >= 0) for (let x = fx0; x <= fx1; x++) if ((x - cx) * frente > 0 && esPiel(x, ojoY + 2)) pon(x, ojoY + 2, 'S', v);
    }
    // arete: en la oreja, el pixel de piel más atrás bajo el ojo
    if (look.aretes && ojoY >= 0) {
      const y = ojoY + 1;
      for (let x = frente === 1 ? fx0 : fx1; x >= fx0 && x <= fx1; x += frente) if (esPiel(x, y)) { pon(x, y, 'S', hex(look.aretes.color)); break; }
    }
  }

  // ---- pelo que se agrega detrás (solo donde no hay nada: el cuerpo tapa) y gorros
  // lo que cuelga es pelo de verdad aunque un gorro tape el de arriba
  const pelo = look.pelo.estilo === 'calvo' ? piel : subir(hex(look.pelo.color), 40), peloH = mezcla(pelo, hex('#ffffff'), 0.16);
  const nuevos: [number, number][] = [];
  const agregar = (x: number, y: number, v: number, ch = 'H') => { if (vacio(x, y)) { pon(x, y, ch, v); nuevos.push([x, y]); } };
  const atrasX = (d: number) => atras - frente * d;
  const est = look.pelo.estilo;
  // la nuca en cada fila: el último pixel de la silueta hacia atrás. Lo que cuelga sale de la nuca a la altura de la
  // cara (donde la cabeza es más ancha) y cae derecho, detrás del cuerpo
  let ultimo = atras;
  const nuca = (y: number) => {
    for (let x = frente === 1 ? 0 : W - 1; x >= 0 && x < W; x += frente) if (!vacio(x, y)) { ultimo = x; return x; }
    return ultimo;
  };
  const cuelloY = Math.min(Math.max(y0 + 3, fy0), y1);
  const ax = nuca(cuelloY);
  const colaX = (d: number) => ax - frente * d;
  /** Un adorno sobre el pelo, pegado al contorno de atrás en la fila `ty` (2×2): lazo, moño, flor. */
  const adorno = (ty: number, v: number) => { const bx = nuca(ty); for (const dx of [1, 2]) for (const dy of [0, 1]) { const x = bx + frente * dx, y = ty + dy; if (PELO.has(en(x, y))) pon(x, y, 'S', v); } };
  // lo que cuelga solo cuando la cabeza está derecha: acostado o de cabeza no hay hacia dónde colgarlo
  const derecha = k === 0;
  if (!derecha) { /* nada cuelga */ } else if (est === 'largo' || est === 'ondas' || est === 'trenzas') {
    for (let y = cuelloY; y <= Math.min(y1 + 5, H - 2); y++) {
      for (const d of [1, 2]) agregar(colaX(d), y, est === 'ondas' && (y % 2) ? peloH : pelo);
      // bajo la cabeza, la masa de pelo llena hasta la espalda (unos pixeles, no más)
      if (y > y1) for (let d = 0, x = colaX(0); d < 3 && x >= 0 && x < W && vacio(x, y); d++, x += frente) agregar(x, y, pelo);
    }
  } else if (est === 'cola' || est === 'colitas') {
    adorno(y0 + 2, hex(look.pelo.color2 ?? look.gorro?.color ?? '#e86aa0'));
    for (let y = cuelloY - 1; y <= Math.min(cuelloY + 5, H - 2); y++) for (const d of [1, 2]) agregar(colaX(d + (y >= cuelloY + 4 ? 1 : 0)), y, pelo);
  } else if (est === 'recogido' || est === 'mono') {
    const bx = nuca(y0 + 2);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = bx + frente * dx, y = y0 + 1 + dy; if (vacio(x, y)) agregar(x, y, pelo); else if (PELO.has(en(x, y)) || en(x, y) === 'k') pon(x, y, 'H', pelo); }
  } else if (est === 'rizos' || est === 'afro' || est === 'puntas' || est === 'erizo') {
    // el pelo se empuja un pixel afuera: rizos y afro quedan más redondos y grandes; puntas y erizo, en zigzag arriba
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const borde: [number, number][] = [];
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (en(x, y) !== 'k') continue;
      if (!espalda && (x - cx) * frente > 0 && y >= fy0 - 1) continue;
      const dx = x - cx, dy = y - cy;
      const ox = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0, oy = ox ? 0 : Math.sign(dy) || -1;
      if (!vacio(x + ox, y + oy)) continue;
      if ((est === 'puntas' || est === 'erizo') && oy !== -1) continue;
      if ((est === 'puntas' || est === 'erizo') && (x + y) % 2) continue;
      if (![en(x - 1, y), en(x + 1, y), en(x, y - 1), en(x, y + 1)].some((c) => PELO.has(c))) continue;
      borde.push([x, y, ox, oy] as unknown as [number, number]);
    }
    for (const [x, y, ox, oy] of borde as unknown as [number, number, number, number][]) { pon(x + ox, y + oy, 'k', NEGRO); pon(x, y, 'H', pelo); }
    // unos brillos sueltos en la parte de arriba: textura de rizos
    if (est === 'rizos' || est === 'afro') for (let y = y0; y <= (y0 + y1) / 2; y++) for (let x = x0; x <= x1; x++) if (en(x, y) === 'H' && (x * 3 + y * 2) % 7 === 0) pon(x, y, 'h', peloH);
  }
  // contorno de lo agregado
  for (const [x, y] of nuevos) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (vacio(x + dx, y + dy)) pon(x + dx, y + dy, 'K', NEGRO);
  // gorros que sobresalen: orejas de panda, punta del gorro de navidad, moño
  const g = look.gorro;
  if (g?.estilo === 'panda') for (const bx of [x0 + 1, x1 - 2]) for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 2; dy++) agregar(bx + dx, y0 - dy, NEGRO, 'K');
  if (g?.estilo === 'navidad') { const v = hex(g.color2 ?? '#f4f2ee'); for (let d = 0; d < 3; d++) agregar(atrasX(d - 1), y0 - 1 - Math.floor(d / 2), d === 2 ? v : pal.H, 'H'); }
  if ((g?.estilo === 'lazo' || g?.estilo === 'flor') && est !== 'cola' && est !== 'colitas') adorno(y0 + 2, hex(g.color));
  return { col: girar(C, (4 - k) % 4), w: W0, h: H0 };
}
