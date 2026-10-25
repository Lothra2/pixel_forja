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

interface InfoCabeza { k: number; chin: [number, number]; top: number; ancho: number; espalda: boolean; cara: number }
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
};

/** Colores de cada parte del molde para un muñeco. */
function colores(look: ChibiLook): Record<string, number> {
  const piel = hex(look.piel);
  const arriba = look.arriba.estilo === 'nada' ? piel : hex(look.arriba.color);
  const abajo = hex(look.abajo.color);
  const zapato = look.zapatos.estilo === 'descalzo' ? piel : hex(look.zapatos.color);
  const guante = look.guantes ? hex(look.guantes) : piel;
  const cint = look.accesorio?.estilo === 'cinturon' ? hex(look.accesorio.color)
    : ['gi', 'gi_sin_mangas', 'kimono'].includes(look.arriba.estilo) ? hex(look.arriba.color3 ?? '#33251c')
    : sombra(abajo);
  return {
    K: NEGRO, A: piel, P: zapato, C: arriba, c: sombra(arriba), D: abajo, d: sombra(abajo), L: cint, B: guante,
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

/** Pinta un molde del video vestido con el muñeco, mirando a la derecha (o espejado). */
export function pintarMolde(look: ChibiLook, id: string, espejo = false, gesto: Gesto = 'normal'): PintadoMolde {
  const m = MOLDES[id];
  if (!m) throw new Error(`No hay molde "${id}"`);
  const [W, H] = CELDA_VIDEO;
  const ox = Math.round(W / 2 - m.w / 2), oy = PISO_VIDEO - m.h;
  const col = colores(look);
  const cuerpo = capa(W, H, false);
  // estampados de la ropa de arriba: rayas y cuadros siguen la grilla del molde
  const pat = look.arriba.estampado ?? 'liso';
  const c2 = hex(look.arriba.color2 ?? '#f4f2ee');
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const ch = m.filas[y][x];
    if (ch === '.' || CABEZA.has(ch)) continue;
    let v = col[ch] ?? NEGRO;
    if ((ch === 'C' || ch === 'c') && pat !== 'liso') {
      if (pat === 'rayas' && y % 3 === 0) v = ch === 'c' ? sombra(c2) : c2;
      else if (pat === 'cuadros' && (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0) v = mezcla(v, c2, 0.5);
      else if ((pat === 'puntos' || pat === 'copos' || pat === 'flores' || pat === 'estrella' || pat === 'corazon') && (x * 3 + y * 5) % 7 === 0) v = c2;
      else if (pat === 'numero' || pat === 'gg') { if ((x + y) % 11 === 0) v = c2; }
    }
    cuerpo.col[(oy + y) * W + ox + x] = v;
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
    const vista = info.espalda ? 'espalda' : 'lado';
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
    const dx = ox + cx - axr, dy = oy + cy - ayr - 2;
    const atras = capa(W, H); pegar(atras, cab.atras, dx, dy, k, esp);
    const cara = capa(W, H); pegar(cara, cab.cara, dx, dy, k, esp);
    capas.push(atras, cara);
  }
  // el cuerpo del molde ya trae su contorno: va encima de la cabeza (los puños tapan la cara como en el video)
  const img = juntar([...capas], W, H, 1);
  for (let i = 0; i < W * H; i++) {
    const v = cuerpo.col[i];
    if (v === VACIO) continue;
    img.data[i * 4] = (v >> 16) & 255; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255; img.data[i * 4 + 3] = 255;
  }
  // islas chiquitas despegadas del muñeco (puntas de pelo o restos del calco al girar la cabeza): fuera
  quitarIslas(img, 12);
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
      if (GOLPES[id]?.includes(pose)) q.golpe = ['golpe_debil', 'uppercut', 'golpe_fuerte'].includes(id) || (id === 'uppercut_corto' && GOLPES[id][0] === pose) ? 'manoD' : 'pieD';
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
