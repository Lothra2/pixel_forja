import { createRaster, type Raster } from '../core/raster';
import type { ChibiLook } from './look';
import type { Gesto } from './head';
import { pintarCabezaVideo } from './cabezaVideo';
import { capa, pegar, juntar, hex, sombra, mezcla, VACIO, type Capa } from './paint';
import type { Clip, Cuadro, Punto } from './clips';
import DATA from './video/moldes.json';

/**
 * Los moldes del video: cada pose de Ryu y Ken calcada pixel por pixel del video de referencia (@DAVE.XP, chibis de
 * Street Fighter), a su resolución real (un pixel del juego eran 4 del video) y con los tiempos reales de cada
 * movimiento. Cada pixel del molde dice qué es (contorno, piel del brazo, ropa de arriba, cinturón, guante, pie,
 * pelo, cara...). Para vestir a la familia se pinta cada parte con los colores del muñeco, se quita la cabeza del
 * molde y se pone la cabeza del familiar en el mismo lugar y girada igual. Los puños quedan por delante de la cara.
 */

interface InfoCabeza { k: number; chin: [number, number]; top: number; ancho: number; espalda: boolean; cara: number; frente?: boolean }
interface Molde { w: number; h: number; filas: string[]; cabeza: InfoCabeza | null; espejo: boolean }
type CuadroMolde = [string, number, number, number, boolean];
interface Datos { poses: Record<string, Molde>; clips: Record<string, { loop: boolean; cuadros: CuadroMolde[] }>; nombres: Record<string, string>; golpes: Record<string, string[]>; extra: { poder_suelta: string } }
const D = DATA as unknown as Datos;

export const MOLDES = D.poses;
/** Celda de los moldes a 32 (ancho, alto) y la línea del piso. */
export const CELDA_VIDEO: [number, number] = [56, 48];
export const PISO_VIDEO = 44;

const CABEZA = new Set(['H', 'h', 'R', 'r', 'S', 'E', 'k']);
const NEGRO = hex('#100c14');

/** Gestos de la cara por animación (el molde no trae cara: la pone el familiar). */
const GESTOS: Record<string, Gesto> = {
  golpe_debil: 'golpe', antiaereo: 'golpe', poder: 'golpe', barrida: 'golpe', agarrar: 'esfuerzo', uppercut_corto: 'golpe', uppercut: 'golpe',
  torbellino: 'golpe', golpeado_aire: 'dolor', recibir_poder: 'dolor', salto_patada: 'golpe', patada_agachado: 'golpe', caer: 'dolor', ko: 'ko',
  victoria: 'feliz', festejo: 'feliz', levantarse: 'dolor',
  golpe_agachado: 'golpe', golpe_barril: 'golpe', patada_giro: 'golpe', shoryuken_barril: 'golpe', perfect: 'feliz',
};

/** Colores de cada parte del molde para un muñeco. */
const lum = (v: number) => ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11;
/** La ropa muy oscura se pierde contra el contorno negro: se sube hasta que se lea (como la ropa oscura de SF2). */
function legible(v: number): number {
  const l = lum(v);
  return l >= 58 ? v : mezcla(v, hex('#b8bccc'), Math.min(0.6, (58 - l) / (184 - l)));
}
/** La sombra de un color, sin caer en el negro del contorno. */
function sombraLegible(v: number): number {
  const s = sombra(v);
  return lum(s) >= 34 ? s : mezcla(v, NEGRO, 0.32);
}

function colores(look: ChibiLook): Record<string, number> {
  const piel = hex(look.piel);
  const arriba = look.arriba.estilo === 'nada' ? piel : legible(hex(look.arriba.color));
  const abajo = legible(hex(look.abajo.color));
  const zapato = look.zapatos.estilo === 'descalzo' ? piel : legible(hex(look.zapatos.color));
  const guante = look.guantes ? legible(hex(look.guantes)) : piel;
  const cint = look.accesorio?.estilo === 'cinturon' ? hex(look.accesorio.color)
    : ['gi', 'gi_sin_mangas', 'kimono'].includes(look.arriba.estilo) ? hex(look.arriba.color3 ?? '#33251c')
    : sombraLegible(abajo);
  return {
    K: NEGRO, A: piel, P: zapato, C: arriba, c: sombraLegible(arriba), D: abajo, d: sombraLegible(abajo), L: cint, B: guante,
    W: hex('#f4f2ee'), F: hex('#fbfaf2'),
  };
}

/** Punto (x, y) de la grilla derecha (cabeza arriba) llevado a la grilla original girada k veces. */
function desgirar(x: number, y: number, w: number, h: number, k: number): [number, number] {
  // la grilla derecha salió de girar la original k veces a la izquierda; se deshace girando a la derecha
  let px = x, py = y, W = w, H = h;
  // dimensiones de la grilla derecha
  if (k % 2) { W = h; H = w; }
  for (let i = 0; i < k; i++) {
    // un giro a la derecha: (x, y) -> (H - 1 - y, x), y las dimensiones se cruzan
    const nx = H - 1 - py, ny = px;
    px = nx; py = ny;
    const t = W; W = H; H = t;
  }
  return [px, py];
}

export interface PintadoMolde { img: Raster; ancla: [number, number]; puntos: Record<Punto, [number, number]>; hurt: [number, number, number, number] }

/** Borra los grupos de pixeles de menos de `min` que no tocan al grupo más grande. */
function quitarIslas(img: Raster, min: number): void {
  const { w, h, data } = img;
  const grupo = new Int32Array(w * h).fill(-1);
  const tam: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!data[i * 4 + 3] || grupo[i] >= 0) continue;
    const g = tam.length; let n = 0; const pila = [i]; grupo[i] = g;
    while (pila.length) {
      const j = pila.pop()!; n++;
      const x = j % w, y = (j - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx;
        if (data[k * 4 + 3] && grupo[k] < 0) { grupo[k] = g; pila.push(k); }
      }
    }
    tam.push(n);
  }
  const mayor = tam.indexOf(Math.max(...tam));
  for (let i = 0; i < w * h; i++) if (grupo[i] >= 0 && grupo[i] !== mayor && tam[grupo[i]] < min) data[i * 4 + 3] = 0;
}

/** Tapa los grupos de pixeles transparentes encerrados por el muñeco de hasta `max` pixeles. */
function taparHuecos(img: Raster, max: number): void {
  const { w, h, data } = img;
  const fuera = new Uint8Array(w * h);
  const pila: number[] = [];
  for (let x = 0; x < w; x++) pila.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);
  while (pila.length) {
    const i = pila.pop()!;
    if (fuera[i] || data[i * 4 + 3]) continue;
    fuera[i] = 1;
    const x = i % w, y = (i - x) / w;
    if (x > 0) pila.push(i - 1); if (x < w - 1) pila.push(i + 1); if (y > 0) pila.push(i - w); if (y < h - 1) pila.push(i + w);
  }
  const visto = new Uint8Array(w * h);
  for (let s0 = 0; s0 < w * h; s0++) {
    if (fuera[s0] || data[s0 * 4 + 3] || visto[s0]) continue;
    const grupo: number[] = []; const q = [s0]; visto[s0] = 1;
    while (q.length) {
      const i = q.pop()!; grupo.push(i);
      const x = i % w, y = (i - x) / w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && !visto[j] && !data[j * 4 + 3] && !fuera[j]) { visto[j] = 1; q.push(j); }
    }
    if (grupo.length > max) continue;
    for (const i of grupo) {
      const x = i % w, y = (i - x) / w;
      const cuenta = new Map<number, number>();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = (yy * w + xx) * 4; if (!data[j + 3]) continue;
        const v = (data[j] << 16) | (data[j + 1] << 8) | data[j + 2]; cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
      }
      let mejor = 0, n = -1; for (const [v, c] of cuenta) if (c > n) { n = c; mejor = v; }
      data[i * 4] = (mejor >> 16) & 255; data[i * 4 + 1] = (mejor >> 8) & 255; data[i * 4 + 2] = mejor & 255; data[i * 4 + 3] = 255;
    }
  }
}

/** Pinta un molde del video vestido con el muñeco, mirando a la derecha (o espejado). */
export function pintarMolde(look: ChibiLook, id: string, espejo = false, gesto: Gesto = 'normal'): PintadoMolde {
  const m = MOLDES[id];
  if (!m) throw new Error(`No hay molde "${id}"`);
  const [W, H] = CELDA_VIDEO;
  const ox = Math.round(W / 2 - m.w / 2), oy = PISO_VIDEO - m.h;
  const col = colores(look);
  const cuerpo = capa(W, H, false);
  // clase de cada pixel del cuerpo en la celda (para decidir qué va delante de la cabeza)
  const clase = new Array<string>(W * H).fill('.');
  // estampados de la ropa de arriba: rayas y cuadros siguen la grilla del molde
  const pat = look.arriba.estampado ?? 'liso';
  const c2 = hex(look.arriba.color2 ?? '#f4f2ee');
  // los estampados con dibujo (gg, número, corazón...) van como un solo emblema en el pecho: sembrados por pixel
  // salen como puntos sueltos que bailan de un cuadro a otro
  let emblema: Set<number> | null = null;
  if (pat !== 'liso' && pat !== 'rayas' && pat !== 'cuadros') {
    const pecho: [number, number][] = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.filas[y][x] === 'C') pecho.push([x, y]);
    if (pecho.length >= 8) {
      const y0 = Math.min(...pecho.map((p) => p[1]));
      const arriba = pecho.filter((p) => p[1] <= y0 + 3);
      const cx = Math.round(arriba.reduce((s, p) => s + p[0], 0) / arriba.length), cy = y0 + 1;
      emblema = new Set([[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => (cy + dy) * m.w + cx + dx));
    }
  }
  const RELLENO = new Set(['A', 'B', 'C', 'c', 'D', 'd', 'L', 'P']);
  const suelto = (x: number, y: number) => {
    const inf = m.cabeza;
    if (!inf || ((inf.k % 4) + 4) % 4 !== 0 || y >= inf.chin[1]) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (RELLENO.has(m.filas[y + dy]?.[x + dx] ?? '.')) return false;
    return true;
  };
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const ch = m.filas[y][x];
    if (ch === '.' || CABEZA.has(ch)) continue;
    // contorno suelto a la altura de la cabeza (las tiras de la cinta de Ryu): no es del cuerpo
    if (ch === 'K' && suelto(x, y)) continue;
    let v = col[ch] ?? NEGRO;
    if ((ch === 'C' || ch === 'c') && pat !== 'liso') {
      if (pat === 'rayas' && y % 3 === 0) v = ch === 'c' ? sombra(c2) : c2;
      else if (pat === 'cuadros' && (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0) v = mezcla(v, c2, 0.5);
      else if (emblema?.has(y * m.w + x)) v = ch === 'c' ? sombra(c2) : c2;
    }
    cuerpo.col[(oy + y) * W + ox + x] = v;
    clase[(oy + y) * W + ox + x] = ch;
  }
  // pixeles sueltos (restos de las tiras de la cinta del video): fuera
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (cuerpo.col[i] === VACIO) continue;
    let vecinos = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && cuerpo.col[yy * W + xx] !== VACIO) vecinos++; }
    if (!vecinos) cuerpo.col[i] = VACIO;
  }
  const capas: Capa[] = [];
  // la cabeza del familiar en el lugar y con el giro de la del molde
  const info = m.cabeza;
  if (info) {
    // cuánta cara se ve en el molde: en los giros el video muestra la cabeza de espaldas o de tres cuartos por detrás
    let pelo = 0, carne = 0;
    for (const f of m.filas) for (const ch of f) { if (ch === 'H' || ch === 'h' || ch === 'R' || ch === 'r') pelo++; else if (ch === 'S' || ch === 'E') carne++; }
    const ve = carne / Math.max(1, pelo + carne);
    const vista = info.frente ? 'frente' : info.espalda || ve < 0.07 ? 'espalda' : ve < 0.2 ? 'espalda34' : 'lado';
    const cab = pintarCabezaVideo(look, vista, gesto);
    const k = ((info.k % 4) + 4) % 4;
    const esp = info.cara < 0;
    // dónde queda el mentón del molde en la grilla original
    const [cx, cy] = desgirar(info.chin[0], info.chin[1], m.w, m.h, k);
    // el ancla de la cabeza pintada (centro de abajo), girada igual que la del molde
    const ancla = (src: Capa, ax: number, ay: number): [number, number] => {
      let x = esp ? src.w - 1 - ax : ax, y = ay, w = src.w, h = src.h;
      for (let i = 0; i < k; i++) { const nx = h - 1 - y, ny = x; x = nx; y = ny; const t = w; w = h; h = t; }
      return [x, y];
    };
    const [axr, ayr] = ancla(cab.cara, cab.cuello[0], cab.cuello[1] - 1);
    // el mentón del molde está una fila debajo de la cara; el de la cabeza pintada, en su última fila
    const dx = ox + cx - axr, dy = oy + cy - ayr - 3;
    const atras = capa(W, H); pegar(atras, cab.atras, dx, dy, k, esp);
    const cara = capa(W, H); pegar(cara, cab.cara, dx, dy, k, esp);
    capas.push(atras, cara);
  }
  // el cuerpo del molde ya trae su contorno: va encima de la cabeza (los puños tapan la cara como en el video)
  const img = juntar([...capas], W, H, 1);
  const cabezaM = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (img.data[i * 4 + 3]) cabezaM[i] = 1;
  // delante de la cabeza solo pasan brazos y puños (y su contorno); el cuello y los hombros van debajo
  const brazo = (i: number) => clase[i] === 'A' || clase[i] === 'B';
  const delante = (i: number) => {
    if (brazo(i)) return true;
    if (clase[i] !== 'K') return false;
    const x = i % W, y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && brazo(yy * W + xx)) return true;
    }
    return false;
  };
  for (let i = 0; i < W * H; i++) {
    const v = cuerpo.col[i];
    if (v === VACIO) continue;
    if (img.data[i * 4 + 3] && !delante(i)) continue;
    img.data[i * 4] = (v >> 16) & 255; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255; img.data[i * 4 + 3] = 255;
  }
  // islas chiquitas despegadas del muñeco (puntas de pelo o restos del calco al girar la cabeza): fuera
  // el cuello: lo que queda vacío entre la cabeza (arriba) y el cuerpo (abajo) se rellena con piel y su contorno
  {
    const piel = col.A;
    const op = (i: number) => img.data[i * 4 + 3] > 0;
    const marca = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (op(i)) continue;
      let arriba = false, abajo = false;
      for (let d = 1; d <= 2; d++) { if (y - d >= 0 && cabezaM[(y - d) * W + x]) arriba = true; if (y + d < H && cuerpo.col[(y + d) * W + x] !== VACIO) abajo = true; }
      if (arriba && abajo) marca[i] = 1;
    }
    for (let i = 0; i < W * H; i++) if (marca[i]) {
      const x = i % W;
      const borde = x === 0 || x === W - 1 || (!op(i - 1) && !marca[i - 1]) || (!op(i + 1) && !marca[i + 1]);
      const v = borde ? NEGRO : piel;
      img.data[i * 4] = (v >> 16) & 255; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255; img.data[i * 4 + 3] = 255;
    }
  }
  quitarIslas(img, 12);
  // huequitos encerrados (entre el mentón y los hombros, o donde el calco dejó un pixel vacío): se tapan con el color de al lado
  taparHuecos(img, 4);
  if (espejo) for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) for (let c = 0; c < 4; c++) { const a = (y * W + x) * 4 + c, b = (y * W + W - 1 - x) * 4 + c; const t = img.data[a]; img.data[a] = img.data[b]; img.data[b] = t; }
  // puntos: manos (guantes), pies y cabeza
  const busca = (chs: string, masDer: boolean): [number, number] => {
    let best: [number, number] | null = null;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (chs.includes(m.filas[y][x])) {
      if (!best || (masDer ? x > best[0] : x < best[0])) best = [x, y];
    }
    const p: [number, number] = best ? [ox + best[0], oy + best[1]] : [W / 2, PISO_VIDEO - 10];
    return espejo ? [W - p[0], p[1]] : p;
  };
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img.data[(y * W + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cabeza = busca('HhRrSE', true);
  return {
    img, ancla: [Math.floor(W / 2), PISO_VIDEO],
    puntos: { manoD: busca('B', true), manoT: busca('B', false), pieD: busca('P', true), pieT: busca('P', false), cabeza, centro: [(x0 + x1) / 2, (y0 + y1) / 2], util: busca('B', true) },
    hurt: [x0, y0, Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1)],
  };
}

/** Animaciones calcadas del video, en el formato de clips del motor (dx avance, dy altura, ticks a 60). */
export const CLIPS_VIDEO_NOMBRES: Record<string, [string, string]> = {
  reposo: ['Reposo', 'Idle'], caminar: ['Caminar', 'Walk'], caminar_guardia: ['Avanzar en guardia', 'Guard step'], caminar_atras: ['Retroceder', 'Walk back'],
  golpe_debil: ['Golpe', 'Punch'], antiaereo: ['Patada antiaérea', 'Anti-air kick'], poder: ['Poder', 'Fireball'], barrida: ['Barrida', 'Sweep'],
  agarrar: ['Agarrar y lanzar', 'Throw'], uppercut_corto: ['Gancho y patada', 'Uppercut and kick'], uppercut: ['Uppercut volador', 'Rising uppercut'],
  torbellino: ['Patada torbellino', 'Hurricane kick'], golpeado_aire: ['Golpeado en el aire', 'Juggled'], saltar: ['Saltar', 'Jump'],
  salto_adelante: ['Salto adelante', 'Forward jump'], salto_patada: ['Salto con patada', 'Jump kick'], recibir_poder: ['Recibe el poder', 'Hit by fireball'],
  patada_agachado: ['Patada agachado', 'Crouching kick'], caer: ['Caer', 'Knockdown'], levantarse: ['Levantarse', 'Get up'], ko: ['KO', 'KO'],
  victoria: ['Victoria', 'Victory'], festejo: ['Festejo', 'Celebrate'],
  // del segundo video (el bonus de los barriles)
  golpe_agachado: ['Golpe agachado', 'Crouching punch'], golpe_barril: ['Golpe al barril', 'Barrel punch'],
  patada_giro: ['Patada con giro', 'Spin kick'], shoryuken_barril: ['Uppercut al barril', 'Barrel uppercut'], perfect: ['¡Perfect!', 'Perfect!'],
};
const GOLPES = D.golpes, N = D.nombres;

let clipsCache: Clip[] | null = null;
export function clipsVideo(): Clip[] {
  if (clipsCache) return clipsCache;
  const out: Clip[] = [];
  for (const [id, c] of Object.entries(D.clips)) {
    let prevX = 0;
    const cuadros: Cuadro[] = c.cuadros.map(([pose, t, x, dy, esp], i) => {
      const dx = i === 0 ? 0 : x - prevX;
      prevX = x;
      const q: Cuadro = { p: { molde: pose, espejo: esp, gesto: GESTOS[id] }, t, dx, dy };
      if (GOLPES[id]?.includes(pose)) q.golpe = ['golpe_debil', 'uppercut', 'golpe_fuerte', 'golpe_agachado', 'golpe_barril', 'shoryuken_barril'].includes(id) || (id === 'uppercut_corto' && GOLPES[id][0] === pose) ? 'manoD' : 'pieD';
      if (id === 'poder' && pose === D.extra.poder_suelta && !c.cuadros.slice(0, i).some((x) => x[0] === pose)) q.fx = { id: 'poder', en: 'manoD', dx: 4 };
      if ((id === 'caer' || id === 'ko') && i === c.cuadros.length - 1) q.fx = { id: 'polvo', en: 'centro' };
      return q;
    });
    // en los bucles el primer cuadro devuelve lo avanzado por el ciclo
    if (c.loop && cuadros.length > 1) cuadros[0].dx = Math.max(0, c.cuadros[c.cuadros.length - 1][2] - c.cuadros[0][2]) / (c.cuadros.length - 1) || 0;
    out.push({ id, nombre: CLIPS_VIDEO_NOMBRES[id] ?? [id, id], grupo: 'pelea', loop: c.loop, cuadros });
  }
  // los que faltan en el video se arman con poses del video
  const A = (id: string, es: string, en: string, loop: boolean, fr: [string, number, Partial<Cuadro>?][], gesto?: Gesto, grupo: Clip['grupo'] = 'pelea') =>
    out.push({ id, nombre: [es, en], grupo, loop, cuadros: fr.map(([pose, t, extra]) => ({ p: { molde: pose, gesto }, t, ...(extra ?? {}) })) });
  A('agacharse', 'Agacharse', 'Crouch', false, [[N.agacharse, 4], [N.agachado, 8]]);
  A('agachado', 'Agachado', 'Crouching', true, [[N.agachado, 30]]);
  A('bloquear', 'Bloquear', 'Block', true, [[N.bloquear, 30]], 'bravo');
  A('recibir_alto', 'Recibe golpe', 'Hit', false, [[N.recibe1, 8, { dx: -2, sonido: 'golpe' }], [N.recibe2, 4, { dx: -1 }], [N.recibe3, 6]], 'dolor');
  A('golpe_fuerte', 'Golpe fuerte', 'Strong punch', false, [[N.golpef1, 4], [N.golpef2, 8, { golpe: 'manoD', sonido: 'whoosh_fuerte' }], [N.golpef3, 6]], 'golpe');
  A('patada_fuerte', 'Patada fuerte', 'Strong kick', false, [[N.patadaf1, 4], [N.patadaf2, 10, { golpe: 'pieD', sonido: 'whoosh_fuerte' }], [N.patadaf3, 6]], 'golpe');
  A('mareado', 'Mareado', 'Dizzy', true, [[N.recibe1, 10, { fx: { id: 'mareo', en: 'cabeza', dy: -6 } }], [N.recibe3, 10]], 'ko');
  A('lanzado', 'Lo lanzan', 'Thrown', false, [[N.lanz1, 6, { dy: 10, dx: -3 }], [N.lanz2, 4, { dy: 18, dx: -4 }], [N.lanz3, 4, { dy: 18, dx: -4 }], [N.lanz4, 4, { dy: 10, dx: -4 }], [N.lanz5, 20, { apoyar: true, fx: { id: 'polvo', en: 'centro' } }]], 'dolor');
  // correr: la caminata del video a doble ritmo
  const cam = out.find((c) => c.id === 'caminar');
  if (cam) out.push({ id: 'correr', nombre: ['Correr', 'Run'], grupo: 'beat', loop: true, cuadros: cam.cuadros.map((q) => ({ ...q, t: Math.max(2, Math.round(q.t / 2)), dx: (q.dx ?? 0) * 1.6 })) });
  clipsCache = out;
  return out;
}

declare module './body' {
  interface Pose { molde?: string }
}

/** Escala 2x limpia (Scale2x / EPX): para la talla grande sin perder los bordes del pixel art. */
export function escala2x(r: Raster): Raster {
  const out = createRaster(r.w * 2, r.h * 2);
  const px = (x: number, y: number) => {
    x = Math.max(0, Math.min(r.w - 1, x)); y = Math.max(0, Math.min(r.h - 1, y));
    const i = (y * r.w + x) * 4;
    return (r.data[i] << 24 | r.data[i + 1] << 16 | r.data[i + 2] << 8 | r.data[i + 3]) >>> 0;
  };
  const put = (x: number, y: number, v: number) => { const i = (y * out.w + x) * 4; out.data[i] = v >>> 24; out.data[i + 1] = (v >>> 16) & 255; out.data[i + 2] = (v >>> 8) & 255; out.data[i + 3] = v & 255; };
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const P = px(x, y), A = px(x, y - 1), B = px(x + 1, y), C = px(x - 1, y), Dd = px(x, y + 1);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (C === A && C !== Dd && A !== B) e0 = A;
    if (A === B && A !== C && B !== Dd) e1 = B;
    if (Dd === C && Dd !== B && C !== A) e2 = C;
    if (B === Dd && B !== A && Dd !== C) e3 = Dd;
    put(x * 2, y * 2, e0); put(x * 2 + 1, y * 2, e1); put(x * 2, y * 2 + 1, e2); put(x * 2 + 1, y * 2 + 1, e3);
  }
  return out;
}
