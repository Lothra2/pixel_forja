import type { ChibiLook } from './look';
import { hex, sombra, luz, mezcla, legible } from './paint';

/**
 * La cabeza de cada cuadro sale del propio video: los pixeles de la cabeza de Ryu o Ken en ese molde (pelo, cara,
 * gestos, contorno) se pintan con los colores del familiar, y encima van sus rasgos (lentes, barba, peinado, gorro,
 * aretes, marcas). Así la cabeza tiene en cada cuadro el mismo tamaño, lugar, giro y gesto que en el video.
 * Todo se dibuja con la cabeza derecha (el molde se gira con su `k`) y al final se devuelve a su giro.
 */

export interface InfoCabezaMolde { k: number; chin: [number, number]; top: number; ancho: number; espalda: boolean; cara: number; frente?: boolean }
export interface MoldeConCabeza { w: number; h: number; filas: string[]; cabeza: InfoCabezaMolde | null }

/** Margen alrededor del molde para lo que sobresale de la cabeza (moños, gorros, pelo largo). */
export const MARGEN = 6;
export const CLASES_CABEZA = new Set(['H', 'h', 'R', 'r', 'S', 'E', 'k']);
const NEGRO = hex('#100c14');
const VACIO = -1;

export interface CabezaVestida {
  /** Colores en la grilla del molde agrandada con el margen (VACIO donde no hay nada). */
  col: Int32Array;
  /** 1 si el pixel va detrás del cuerpo (pelo largo, colas). */
  atras: Uint8Array;
  /** 1 si el pixel es de la cabeza del molde (no un agregado). */
  propio: Uint8Array;
  w: number;
  h: number;
}

function girar<T>(g: T[][], k: number): T[][] {
  let a = g;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) {
    const h = a.length, w = a[0].length;
    const b: T[][] = Array.from({ length: w }, () => new Array<T>(h));
    // un cuarto de vuelta a la izquierda (igual que numpy.rot90)
    for (let r = 0; r < w; r++) for (let c = 0; c < h; c++) b[r][c] = a[c][w - 1 - r];
    a = b;
  }
  return a;
}

export function vestirCabezaMolde(look: ChibiLook, m: MoldeConCabeza): CabezaVestida | null {
  const info = m.cabeza;
  if (!info) return null;
  // el calco guarda los giros de costado al revés (cuerpo arriba): para dejar la cabeza arriba se suma media vuelta
  const k0 = ((info.k % 4) + 4) % 4;
  const k = k0 % 2 === 1 ? (k0 + 2) % 4 : k0;
  const W0 = m.w + MARGEN * 2, H0 = m.h + MARGEN * 2;
  const base: string[][] = Array.from({ length: H0 }, (_, y) => Array.from({ length: W0 }, (_, x) => {
    const yy = y - MARGEN, xx = x - MARGEN;
    return yy >= 0 && yy < m.h && xx >= 0 && xx < m.w ? m.filas[yy][xx] : '.';
  }));
  const U = girar(base, k);
  const H = U.length, W = U[0].length;
  const col: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(VACIO));
  const atr: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  const pro: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  const dentro = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const clase = (x: number, y: number) => (dentro(x, y) ? U[y][x] : '.');

  // la coronilla: la primera fila con pelo o cara (lo de más arriba es solo el contorno del mechón de Ryu)
  let top = H;
  for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if ('HhRrS'.includes(U[y][x])) { top = y - 1; break; }
  // hacia dónde mira (del calco); con la media vuelta extra de los giros de costado, izquierda y derecha se cruzan
  const f = (info.cara >= 0 ? 1 : -1) * (k0 % 2 === 1 ? -1 : 1);
  const espalda = info.espalda;
  const piel = hex(look.piel);
  const pelo = legible(hex(look.pelo.color)), peloS = sombra(pelo), acento = hex(look.pelo.color2 ?? '#e8455a');
  const est = look.pelo.estilo;
  const g = look.gorro;
  const c1 = g ? legible(hex(g.color)) : 0, c2 = g?.color2 ? hex(g.color2) : sombra(c1);

  // las celdas de la cabeza: sin el mechón de Ryu (lo que sube de la coronilla) ni las tiras de su cinta
  const celdas: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (CLASES_CABEZA.has(U[y][x]) && y >= top) celdas.push([x, y]);
  const cuerpoCab = celdas.filter(([x, y]) => 'HhS'.includes(U[y][x]));
  if (!cuerpoCab.length) return null;
  const hx0 = Math.min(...cuerpoCab.map((c) => c[0])), hx1 = Math.max(...cuerpoCab.map((c) => c[0]));
  const vincha = g?.estilo === 'vincha';
  for (const [x, y] of celdas) {
    const ch = U[y][x];
    // fuera del bloque de la cabeza solo se quitan las tiras de la cinta de Ryu y su contorno suelto (el contorno que
    // toca el cuerpo se queda: une la cabeza con un brazo)
    if (!vincha && (x < hx0 - 1 || x > hx1 + 1)) {
      if (ch !== 'k') continue;
      let tocaCinta = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = clase(x + dx, y + dy); if (c === 'R' || c === 'r') tocaCinta = true; }
      if (tocaCinta) continue;
    }
    let v: number;
    if (ch === 'H') v = pelo;
    else if (ch === 'h') v = peloS;
    else if (ch === 'R') v = vincha ? c1 : pelo;
    else if (ch === 'r') v = vincha ? sombra(c1) : peloS;
    else if (ch === 'S') v = piel;
    else v = NEGRO;
    col[y][x] = v; pro[y][x] = 1;
  }
  const ys = celdas.map((c) => c[1]);
  const y1 = Math.max(...ys);
  const x0 = hx0, x1 = hx1, atrasX = f > 0 ? x0 : x1, frenteX = f > 0 ? x1 : x0;
  const esPelo = (x: number, y: number) => pro[y]?.[x] && 'HhRr'.includes(U[y][x]);

  // agregados: solo donde el molde está vacío
  const nuevos: [number, number][] = [];
  const add = (x: number, y: number, v: number, detras = false) => {
    // se puede pintar donde el molde está vacío o donde había algo de la cabeza que se quitó (las tiras de la cinta);
    // lo de atrás también bajo el cuerpo (el cuerpo lo tapa y asoma por los lados)
    if (!dentro(x, y) || col[y][x] !== VACIO || pro[y][x]) return;
    const c = clase(x, y);
    if (!(c === '.' || CLASES_CABEZA.has(c) || detras)) return;
    col[y][x] = v; atr[y][x] = detras ? 1 : 0; nuevos.push([x, y]);
  };
  const pinta = (x: number, y: number, v: number) => { if (dentro(x, y) && pro[y][x] && col[y][x] !== NEGRO) col[y][x] = v; };

  // ---- peinado
  if (est === 'calvo' || est === 'rapado') for (const [x, y] of celdas) if (esPelo(x, y)) col[y][x] = est === 'calvo' ? piel : mezcla(pelo, piel, 0.5);
  if (est === 'mohicano') { const cx = Math.round((x0 + x1) / 2); for (const [x, y] of celdas) if (esPelo(x, y) && Math.abs(x - cx) > 1) col[y][x] = mezcla(pelo, piel, 0.55); }
  // pelo que cae por la espalda: una columna por fuera de la nuca y, debajo de la cabeza, hacia adentro
  const bajo = (y0: number, y9: number, ancho: number) => {
    for (let y = y0; y <= y9; y++) for (let d = -2; d <= ancho - 2; d++) add(atrasX + f * d, y, (x0 + y) % 4 === 0 ? peloS : pelo, true);
  };
  {
    if (est === 'largo' || est === 'ondas') bajo(top + 4, y1 + 5, 4);
    if (est === 'bob' || est === 'flequillo') bajo(top + 4, y1 + 1, 3);
    if (est === 'trenzas') { bajo(top + 4, y1 + 1, 2); for (let y = y1 + 2; y <= y1 + 5; y++) add(atrasX + f, y, y % 2 ? pelo : peloS, true); add(atrasX + f, y1 + 6, acento, true); }
    if (est === 'cola') { for (let y = top + 2; y <= top + 8; y++) { add(atrasX - 2 * f, y, pelo, true); add(atrasX - 3 * f, y + 1, peloS, true); } add(atrasX - 2 * f, top + 2, acento); }
    if (est === 'colitas') { for (let y = top + 2; y <= top + 6; y++) { add(atrasX - 2 * f, y, pelo, true); add(atrasX - 3 * f, y, peloS, true); } add(atrasX - 2 * f, top + 2, acento); add(frenteX - 2 * f, top - 1, pelo); add(frenteX - 3 * f, top - 1, pelo); add(frenteX - 2 * f, top - 2, acento); }
    if (est === 'mono') { for (let y = top - 3; y < top; y++) for (let d = 1; d <= 3; d++) add(atrasX + f * d, y, d === 2 && y === top - 3 ? luz(pelo) : pelo); add(atrasX + 2 * f, top - 1, acento); }
    if (est === 'recogido') for (let y = top - 2; y < top; y++) for (let d = 1; d <= 3; d++) add(atrasX + f * d, y, pelo);
    if (est === 'puntas' || est === 'erizo') for (let x = x0 + 1; x < x1; x += 2) { add(x, top - 1, pelo); if (est === 'erizo' && (x - x0) % 4 === 1) add(x, top - 2, pelo); }
    if (est === 'afro' || est === 'rizos') {
      const borde: [number, number][] = [];
      for (const [x, y] of celdas) if (U[y][x] === 'k' && y <= y1 - 3) borde.push([x, y]);
      for (const [x, y] of borde) for (const [dx, dy] of [[0, -1], [-f, 0]]) if (est === 'afro' || (x + y) % 2 === 0) add(x + dx, y + dy, pelo);
    }
  }

  // ---- la cara (si se ve)
  // la cara es el pedazo de piel más grande: el calco deja pixeles de piel sueltos en el pelo (restos de la cinta o del
  // nudo de Ryu) que se pintan de pelo, y así los ojos y los lentes no se buscan ahí
  const caraCeldas: [number, number][] = [];
  {
    const esCara = (x: number, y: number) => pro[y]?.[x] && (U[y][x] === 'S' || U[y][x] === 'E');
    const comp = new Map<number, number>(); const trozos: [number, number][][] = [];
    for (const [x, y] of celdas) {
      if (!esCara(x, y) || comp.has(y * W + x)) continue;
      const t: [number, number][] = []; const pila: [number, number][] = [[x, y]]; comp.set(y * W + x, trozos.length);
      while (pila.length) {
        const [a, b] = pila.pop()!; t.push([a, b]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xa = a + dx, yb = b + dy; if (esCara(xa, yb) && !comp.has(yb * W + xa)) { comp.set(yb * W + xa, trozos.length); pila.push([xa, yb]); } }
      }
      trozos.push(t);
    }
    trozos.sort((a, b) => b.length - a.length);
    trozos.forEach((t, i) => {
      const suelto = i > 0 && t.length <= 3 && t.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => esPelo(x + dx, y + dy)));
      if (!suelto) { caraCeldas.push(...t); return; }
      for (const [x, y] of t) col[y][x] = U[y][x] === 'S' ? pelo : peloS;
    });
  }
  if (!espalda && caraCeldas.length) {
    const fy0 = Math.min(...caraCeldas.map((c) => c[1])), fy1 = Math.max(...caraCeldas.map((c) => c[1]));
    const fxs = caraCeldas.map((c) => c[0]);
    const fx0 = Math.min(...fxs), fx1 = Math.max(...fxs);
    const piel_ = (x: number, y: number) => pro[y]?.[x] && U[y][x] === 'S';
    // ojos: los detalles oscuros de arriba de la cara, agrupados
    // rasgo de la cara: detalle oscuro, o contorno metido adentro de la cara (no en el borde de la cabeza)
    const rasgo = (x: number, y: number) => {
      const c = clase(x, y);
      if (c === 'E') return true;
      if (c !== 'k') return false;
      return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => CLASES_CABEZA.has(clase(x + dx, y + dy)));
    };
    // los ojos se buscan desde la primera fila con cara de verdad: las celdas de piel sueltas entre el flequillo
    // corrían la ventana hacia arriba y el ojo quedaba cortado (y los lentes se volvían una mancha)
    let oy0 = fy0;
    while (oy0 < fy1 && caraCeldas.filter((c) => c[1] === oy0).length < 3) oy0++;
    const ojos: [number, number][][] = [];
    const visto = new Set<number>();
    for (const [x, y] of caraCeldas) {
      if (U[y][x] !== 'E' || y > oy0 + 2 || visto.has(y * W + x)) continue;
      const grupo: [number, number][] = []; const pila: [number, number][] = [[x, y]]; visto.add(y * W + x);
      while (pila.length) {
        const [a, b] = pila.pop()!; grupo.push([a, b]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xa = a + dx, yb = b + dy;
          if (rasgo(xa, yb) && yb <= oy0 + 2 && !visto.has(yb * W + xa)) { visto.add(yb * W + xa); pila.push([xa, yb]); }
        }
      }
      ojos.push(grupo);
    }
    const boca = caraCeldas.filter(([x, y]) => U[y][x] === 'E' && y >= fy1 - 1);
    const bx0 = boca.length ? Math.min(...boca.map((c) => c[0])) : Math.round((fx0 + fx1) / 2), bx1 = boca.length ? Math.max(...boca.map((c) => c[0])) : bx0 + 2;
    const by0 = boca.length ? Math.min(...boca.map((c) => c[1])) : fy1;

    if (look.marca === 'panda') for (const o of ojos) for (const [x, y] of o) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (piel_(x + dx, y + dy)) col[y + dy][x + dx] = hex('#26242a');
    if (look.marca === 'cachetes') { const x = frenteX - 2 * f, y = fy1 - 1; if (piel_(x, y)) col[y][x] = mezcla(piel, hex('#ff6f8a'), 0.5); }
    if (look.marca === 'pecas') for (const [x, y] of [[frenteX - 2 * f, fy1 - 1], [frenteX - 4 * f, fy1 - 1]]) if (piel_(x, y)) col[y][x] = sombra(sombra(piel));
    if (look.marca === 'curita') for (const x of [frenteX - 2 * f, frenteX - 3 * f]) if (piel_(x, fy1 - 1)) col[fy1 - 1][x] = hex('#f2d2a8');
    if (look.marca === 'lunar') { const x = frenteX - 2 * f; if (piel_(x, fy1)) col[fy1][x] = hex('#4a2a1e'); }

    // la boca de Ryu y Ken es una raya negra gruesa: en las mujeres y los niños se pinta como labios (si no, parece bigote)
    const femenina = ['mujer', 'nino', 'pequena', 'abuela'].includes(look.contextura);
    if (femenina && !look.barba) {
      const labio = mezcla(NEGRO, hex('#c04a56'), 0.55);
      for (let y = by0 - 1; y <= fy1 + 1; y++) for (let x = fx0; x <= fx1; x++) {
        const c = clase(x, y);
        if (c !== 'E' && c !== 'K' && c !== 'k') continue;
        const vecinosPiel = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => clase(x + dx, y + dy) === 'S').length;
        if (vecinosPiel >= 2) { col[y][x] = labio; pro[y][x] = 1; }
      }
    }
    if (look.barba) {
      const b = hex(look.barba.color), bS = sombra(b);
      const e = look.barba.estilo;
      const tono = (v: number) => (e === 'sombra' ? mezcla(piel, b, 0.45) : v);
      if (e === 'barba' || e === 'sombra') {
        // barba corta: la fila de la quijada y alrededor de la boca, así queda piel en los cachetes (con dos filas
        // completas más los lentes la cara se leía como un casco)
        for (const [x, y] of caraCeldas) {
          if (!piel_(x, y)) continue;
          const juntoBoca = y >= by0 - 1 && x >= bx0 - 1 && x <= bx1 + 1;
          if (y === fy1 || juntoBoca) col[y][x] = tono(f * (x - (fx0 + fx1) / 2) < 0 ? bS : b);
        }
        // la patilla: la columna de atrás de la cara, solo abajo
        const xp = f > 0 ? fx0 : fx1;
        if (!info.frente) for (let y = fy1 - 1; y <= fy1; y++) if (piel_(xp, y)) col[y][xp] = tono(bS);
      }
      if (e === 'bigote' || e === 'candado') for (let x = bx0 - 1; x <= bx1 + 1; x++) if (piel_(x, by0 - 1)) col[by0 - 1][x] = b;
      if (e === 'candado' || e === 'chivo') for (let x = bx0; x <= bx1; x++) for (let y = by0 + 1; y <= fy1 + 1; y++) if (piel_(x, y)) col[y][x] = b;
    }
    if (look.ojos.estilo === 'pestanas') for (const o of ojos) { const xe = f > 0 ? Math.max(...o.map((c) => c[0])) : Math.min(...o.map((c) => c[0])); const ye = Math.min(...o.map((c) => c[1])); if (piel_(xe + f, ye - 1)) col[ye - 1][xe + f] = NEGRO; }
    if (look.lentes) {
      const fr = hex(look.lentes.color);
      for (const o of ojos) {
        const ax = Math.min(...o.map((c) => c[0])), bx = Math.max(...o.map((c) => c[0]));
        const ay = Math.min(...o.map((c) => c[1])), by = Math.max(...o.map((c) => c[1]));
        // marco arriba y abajo; el ojo del video queda a la vista y el vidrio apenas brilla (marco alrededor de un ojo
        // oscuro se veía como lentes de sol)
        // el vidrio claro sobre el ojo, con la pupila al medio, y el marco alrededor: se lee como lentes y no como antifaz
        const vidrio = mezcla(piel, hex('#e8f4ff'), 0.55);
        const px = Math.round((ax + bx) / 2);
        // la pupila es un solo pixel abajo al medio: una columna entera de pupila se leía como dientes
        for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) if (pro[y]?.[x] && (U[y][x] === 'E' || U[y][x] === 'S' || U[y][x] === 'k')) col[y][x] = x === px && y === by ? NEGRO : vidrio;
        // marco: arriba (la ceja de la montura) y a los lados; abajo solo si el ojo es bajito, para no tapar el cachete
        for (let x = ax - 1; x <= bx + 1; x++) { if (piel_(x, ay - 1)) col[ay - 1][x] = fr; if (look.lentes.estilo !== 'redondos' && by === ay && piel_(x, by + 1)) col[by + 1][x] = fr; }
        // los lados solo en la fila de arriba: en una cara de 7 pixeles el marco completo la tapaba entera
        for (const x of [ax - 1, bx + 1]) if (piel_(x, ay)) col[ay][x] = fr;
        if (look.lentes.estilo === 'sol') for (let y = ay; y <= by; y++) for (let x = ax - 1; x <= bx + 1; x++) if (pro[y]?.[x] && (U[y][x] === 'S' || U[y][x] === 'E')) col[y][x] = hex('#1c1a22');
        if (look.lentes.estilo === 'gato') add(bx + 2, ay - 2, fr);
      }
    }
    if (look.aretes) {
      const xo = f > 0 ? fx0 : fx1, yo = fy1 + 1;
      const a = hex(look.aretes.color);
      add(xo, yo, a); if (look.aretes.estilo !== 'perla') add(xo, yo + 1, a);
    }
  }

  // ---- gorro
  // la cinta en los cuadros de Ken (que no la usa): dos filas de pelo justo encima de la cara y las tiras atrás, así
  // no aparece y desaparece en medio de una pelea
  if (vincha && !celdas.some(([x, y]) => U[y][x] === 'R' || U[y][x] === 'r')) {
    let fy = top + 1;
    while (fy < y1 && celdas.filter(([, y]) => y === fy).filter(([x, y]) => U[y][x] === 'S').length < 3) fy++;
    for (const [x, y] of celdas) if ((y === fy - 1 || y === fy - 2) && (esPelo(x, y) || (pro[y][x] && U[y][x] === 'S'))) col[y][x] = y === fy - 1 ? sombra(c1) : c1;
    if (!espalda) for (let d = 1; d <= 2; d++) { add(atrasX - f * d, fy - 2 + d - 1, c1, true); add(atrasX - f * d, fy - 1 + d - 1, sombra(c1), true); }
  }
  if (g && !vincha) {
    const tapa = (filas: number, v: number, v2?: number) => {
      for (const [x, y] of celdas) if (y < top + filas && (esPelo(x, y) || (U[y][x] === 'S' && y < top + filas - 1))) col[y][x] = y === top + filas - 1 && v2 !== undefined ? v2 : v;
    };
    switch (g.estilo) {
      case 'gorra': case 'gorra_atras': {
        tapa(4, c1, sombra(c1));
        const lado = g.estilo === 'gorra' ? 1 : -1, xv = lado > 0 ? frenteX : atrasX;
        for (let d = 1; d <= 3; d++) add(xv + f * lado * d, top + 3, c2);
        pinta(Math.round((x0 + x1) / 2), top + 1, luz(c1));
        break;
      }
      case 'gorro_lana': tapa(5, c1, c2); add(Math.round((x0 + x1) / 2), top - 1, c2); break;
      case 'navidad': {
        tapa(4, c1, c2);
        for (let d = 1; d <= 3; d++) add(atrasX - f * d, top + d, c1, true);
        add(atrasX - f * 3, top + 4, c2, true); add(atrasX - f * 4, top + 4, c2, true);
        break;
      }
      case 'boina': tapa(3, c1); add(frenteX + f, top + 2, c1); add(atrasX - f, top + 1, c1); break;
      case 'casco': { tapa(6, c1); const cx = Math.round((x0 + x1) / 2); for (let y = top; y < top + 6; y++) pinta(cx, y, c2); break; }
      case 'llanero': case 'paja': {
        tapa(3, c1, c2);
        for (let d = 1; d <= 2; d++) { add(frenteX + f * d, top + 3, c1); add(atrasX - f * d, top + 3, c1); }
        break;
      }
      case 'cintillo': for (const [x, y] of celdas) if (y === top + 2 && esPelo(x, y)) col[y][x] = c1; break;
      case 'tiara': { for (const [x, y] of celdas) if (y === top + 2 && esPelo(x, y) && f * (x - (x0 + x1) / 2) >= -1) col[y][x] = c1; add(Math.round((x0 + x1) / 2) + f, top - 1, c2); break; }
      case 'corona': for (let x = x0 + 2; x <= x1 - 2; x++) { add(x, top - 1, c1); if ((x - x0) % 2 === 0) add(x, top - 2, c1); } add(Math.round((x0 + x1) / 2), top - 1, c2); break;
      case 'lazo': case 'flor': {
        const cx = atrasX + f * 2, cy = top - 1;
        const pts = g.estilo === 'lazo' ? [[-2, -1], [-2, 0], [-1, 0], [1, 0], [2, -1], [2, 0]] : [[0, -1], [-1, 0], [1, 0], [0, 1]];
        for (const [dx, dy] of pts) { add(cx + dx, cy + dy, c1); pinta(cx + dx, cy + dy, c1); }
        add(cx, cy, c2); pinta(cx, cy, c2);
        break;
      }
      case 'panda': for (const xa of [x0 + 1, x1 - 2]) for (const [dx, dy] of [[0, -1], [1, -1], [0, -2], [1, -2]]) add(xa + dx, top + dy, c1); break;
      case 'chef': for (let y = top - 5; y < top; y++) for (let x = x0 + 1; x <= x1 - 1; x++) if (!(y === top - 5 && (x === x0 + 1 || x === x1 - 1))) add(x, y, c1); tapa(2, c1); break;
      case 'fiesta': for (let y = top - 5; y < top; y++) { const w = Math.round((y - top + 6) / 1.3); const cx = Math.round((x0 + x1) / 2); for (let x = cx - w; x <= cx + w; x++) add(x, y, (x + y) % 3 === 0 ? c2 : c1); } break;
      case 'audifonos': { for (const [x, y] of celdas) if (y === top && pro[y][x] && U[y][x] !== 'k') col[y][x] = c1; for (let y = top + 4; y <= top + 7; y++) { add(atrasX - f, y, c1); pinta(atrasX, y, c1); } break; }
      default: tapa(4, c1);
    }
  }

  // contorno de lo agregado
  for (const [x, y] of nuevos.slice()) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xa = x + dx, yb = y + dy;
      if (dentro(xa, yb) && clase(xa, yb) === '.' && col[yb][xa] === VACIO) { col[yb][xa] = NEGRO; atr[yb][xa] = atr[y][x]; }
    }
  }

  // de vuelta al giro del molde
  const back = (4 - k) % 4;
  const C = girar(col, back), A = girar(atr, back), P = girar(pro, back);
  const out: CabezaVestida = { col: new Int32Array(W0 * H0).fill(VACIO), atras: new Uint8Array(W0 * H0), propio: new Uint8Array(W0 * H0), w: W0, h: H0 };
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) { out.col[y * W0 + x] = C[y][x]; out.atras[y * W0 + x] = A[y][x]; out.propio[y * W0 + x] = P[y][x]; }
  return out;
}
