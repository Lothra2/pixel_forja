import { Pix, bayer, rng } from '../fx/pix';
import { mixHex, type UiPiece } from './retro';
import GEO from './geo.json';

/**
 * El mapa de la gira: el mapa mundial del Pacífico (Asia a la izquierda, América a la derecha), los dos mapas de
 * región (Vietnam, y Colombia con Venezuela) y los sellos del pasaporte. Las costas y fronteras son de Natural Earth
 * (dominio público), simplificadas. Todo se pinta en pixel art: el mar con su profundidad, la costa con playa, la
 * tierra con su relieve y los países de la gira resaltados.
 */

type Anillo = number[];
const G = GEO as unknown as {
  mundo: Anillo[];
  paises_mundo: Record<string, Anillo[]>;
  regiones: Record<string, Record<string, Anillo[]>>;
};

/** Ciudades y lugares que conoce el motor: [longitud, latitud] y su región (para los mapas de región). */
export const LUGARES = {
  tokio: { lon: 139.69, lat: 35.69, pais: 'japon' },
  ha_noi: { lon: 105.85, lat: 21.03, pais: 'vietnam' },
  ha_long: { lon: 107.08, lat: 20.95, pais: 'vietnam' },
  hue: { lon: 107.59, lat: 16.46, pais: 'vietnam' },
  da_nang: { lon: 108.22, lat: 16.05, pais: 'vietnam' },
  hoi_an: { lon: 108.33, lat: 15.88, pais: 'vietnam' },
  nha_trang: { lon: 109.19, lat: 12.24, pais: 'vietnam' },
  da_lat: { lon: 108.44, lat: 11.94, pais: 'vietnam' },
  saigon: { lon: 106.70, lat: 10.78, pais: 'vietnam' },
  can_tho: { lon: 105.78, lat: 10.03, pais: 'vietnam' },
  bogota: { lon: -74.08, lat: 4.71, pais: 'colombia' },
  medellin: { lon: -75.57, lat: 6.25, pais: 'colombia' },
  eje_cafetero: { lon: -75.49, lat: 4.64, pais: 'colombia' },
  cali: { lon: -76.53, lat: 3.45, pais: 'colombia' },
  cartagena: { lon: -75.51, lat: 10.39, pais: 'colombia' },
  barranquilla: { lon: -74.80, lat: 10.96, pais: 'colombia' },
  santa_marta: { lon: -74.20, lat: 11.24, pais: 'colombia' },
  caracas: { lon: -66.90, lat: 10.49, pais: 'venezuela' },
  maracaibo: { lon: -71.64, lat: 10.65, pais: 'venezuela' },
  margarita: { lon: -63.86, lat: 11.14, pais: 'venezuela' },
  llanos_apure: { lon: -67.47, lat: 7.89, pais: 'venezuela' },
  merida: { lon: -71.15, lat: 8.59, pais: 'venezuela' },
  canaima: { lon: -62.85, lat: 6.24, pais: 'venezuela' },
} as const;
export type Lugar = keyof typeof LUGARES;
export const LUGARES_IDS = Object.keys(LUGARES) as Lugar[];

/** Los países que se pueden resaltar en el mapa mundial. */
export const PAISES_GIRA = ['japon', 'vietnam', 'colombia', 'venezuela'] as const;
export type PaisGira = (typeof PAISES_GIRA)[number];

// ---------------------------------------------------------------- proyección y relleno

/** Una proyección lineal: x = (lon - lon0) * kx + x0, y = (lat0 - lat) * ky. */
export interface Proyeccion { lon0: number; lat0: number; kx: number; ky: number; x0: number }
export const lugarEn = (p: Proyeccion, lon: number, lat: number): [number, number] => [Math.round((lon - p.lon0) * p.kx + p.x0), Math.round((p.lat0 - lat) * p.ky)];

/**
 * El mapa mundial usa la misma proyección que el mapa del juego (longitud este de 90 a 300 y latitud de 50 a -25 en
 * 640 x 360), corrida 80 a la derecha: la imagen tiene 800 de ancho y la parte de 640 va de 80 a 720.
 */
export const MAPA_MUNDO = { w: 800, h: 360, margen: 80, proyeccion: { lon0: 90, lat0: 50, kx: 640 / 210, ky: 360 / 75, x0: 80 } as Proyeccion };
const este = (lon: number) => (lon < 0 ? lon + 360 : lon);
/** Un lugar en el mapa mundial (la longitud oeste se pasa al este, como en el mapa del juego). */
export const enMundo = (lon: number, lat: number) => lugarEn(MAPA_MUNDO.proyeccion, este(lon), lat);

/** Rellena anillos (pares par-impar por fila, en el centro de cada pixel) en una máscara. */
function rellenar(m: Uint8Array, w: number, h: number, anillos: Anillo[], p: Proyeccion, v = 1) {
  const polys = anillos.map((a) => { const o: [number, number][] = []; for (let i = 0; i < a.length; i += 2) o.push([(a[i] / 100 - p.lon0) * p.kx + p.x0, (p.lat0 - a[i + 1] / 100) * p.ky]); return o; });
  for (let y = 0; y < h; y++) {
    const yc = y + 0.5, xs: number[] = [];
    for (const q of polys) for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
      const [x1, y1] = q[i], [x2, y2] = q[j];
      if ((y1 > yc) !== (y2 > yc)) xs.push(x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x < Math.min(w, Math.ceil(xs[k + 1] - 0.5)); x++) m[y * w + x] = v;
  }
}

/** Distancia (chamfer 3-4, en pixeles por 3) de cada pixel al otro lado de la máscara, hasta `tope` pixeles. */
function distancia(m: Uint8Array, w: number, h: number, dentro: boolean, tope: number): Float32Array {
  const INF = tope * 3, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = (m[i] > 0) !== dentro ? 0 : INF;
  const v = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? INF : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (d[i]) d[i] = Math.min(d[i], v(x - 1, y) + 3, v(x, y - 1) + 3, v(x - 1, y - 1) + 4, v(x + 1, y - 1) + 4);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (d[i]) d[i] = Math.min(d[i], v(x + 1, y) + 3, v(x, y + 1) + 3, v(x + 1, y + 1) + 4, v(x - 1, y + 1) + 4);
  }
  for (let i = 0; i < w * h; i++) d[i] = Math.min(tope, d[i] / 3);
  return d;
}

/** Ruido suave de valores, para el relieve. */
function ruido(seed: number) {
  const r = rng(seed), T = new Float32Array(64 * 64).map(() => r());
  const v = (x: number, y: number) => T[((y & 63) << 6) | (x & 63)];
  const s = (t: number) => t * t * (3 - 2 * t);
  const una = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
    const a = v(xi, yi) + (v(xi + 1, yi) - v(xi, yi)) * fx, b = v(xi, yi + 1) + (v(xi + 1, yi + 1) - v(xi, yi + 1)) * fx;
    return a + (b - a) * fy;
  };
  return (x: number, y: number, f: number) => una(x * f, y * f) * 0.6 + una(x * f * 2.3 + 17, y * f * 2.3 + 5) * 0.3 + una(x * f * 5.1 + 3, y * f * 5.1 + 29) * 0.1;
}

// ---------------------------------------------------------------- la paleta

const MAR = ['#0d2348', '#13305e', '#1a3f78', '#235194', '#2f68ae'];
const ESPUMA = '#a8dcf0', ORILLA = '#5a9ed2';
const COSTA = '#10203a', PLAYA = '#e6d49a';
const TIERRA = {
  tropico: ['#2f6a34', '#3c7f3c', '#4f9644', '#68ac52'],
  templado: ['#4a6e36', '#5a8240', '#6e964a', '#87aa58'],
  seco: ['#8a7444', '#a08a52', '#b8a264', '#ccb878'],
  monte: ['#6a5a40', '#857256', '#a08e70', '#e8e4dc'],
};
const ORO = '#ffd84a', ORO_OSC = '#b88a18';

/** Cordilleras (líneas de longitud, latitud; la longitud oeste en negativo) y qué tan altas son, para el relieve. */
const CORDILLERAS: { pts: [number, number][]; alto: number; ancho: number }[] = [
  { pts: [[73, 35], [80, 32], [86, 28.5], [92, 28], [97, 28]], alto: 1, ancho: 2.2 }, // Himalaya
  { pts: [[78, 35.5], [88, 34], [98, 33]], alto: 0.75, ancho: 3.5 }, // la meseta del Tíbet
  { pts: [[98, 27], [99, 20], [98.5, 15]], alto: 0.5, ancho: 1.2 }, // los montes de Myanmar
  { pts: [[104, 21], [106, 18], [108, 14.5], [108.4, 12]], alto: 0.55, ancho: 0.9 }, // la cordillera Annamita
  { pts: [[136.5, 34.8], [137.6, 36], [138.4, 37.5], [140.4, 39.5]], alto: 0.7, ancho: 0.8 }, // los Alpes del Japón
  { pts: [[-124, 50], [-117, 45], [-112, 40], [-108, 36], [-106, 32]], alto: 0.75, ancho: 2.4 }, // las Rocosas
  { pts: [[-106, 30], [-104, 25], [-101, 20], [-97, 17]], alto: 0.55, ancho: 1.6 }, // la Sierra Madre
  { pts: [[-72, 10.5], [-73.5, 7.5], [-76, 4], [-77.5, 1], [-78.5, -2], [-79, -5], [-77, -10], [-73, -15], [-69, -18], [-68.5, -24], [-69.5, -30]], alto: 1, ancho: 1.5 }, // los Andes
  { pts: [[-73.2, 7.2], [-72, 8.5], [-70.5, 9.5], [-67, 10.3], [-64, 10.4]], alto: 0.55, ancho: 0.8 }, // los Andes de Venezuela y la cordillera de la Costa
  { pts: [[-74.1, 11], [-73.6, 10.8]], alto: 0.8, ancho: 0.5 }, // la Sierra Nevada de Santa Marta
  { pts: [[146, -37], [148.5, -34], [151, -30], [152, -27], [148, -20]], alto: 0.45, ancho: 1.4 }, // la Gran Cordillera Divisoria
];
/** Lo seco: centro, radios en grados (longitud, latitud). */
const SECOS: { c: [number, number]; r: [number, number] }[] = [
  { c: [103, 42], r: [14, 5] }, // el Gobi
  { c: [86, 38], r: [10, 4] }, // el Taklamakán y el Tíbet seco
  { c: [71, 27], r: [5, 4] }, // el Thar
  { c: [-111, 33], r: [8, 6] }, // el suroeste de Estados Unidos
  { c: [-104, 27], r: [5, 5] }, // el norte de México
  { c: [132, -24], r: [16, 9] }, // el centro de Australia
  { c: [-71, -18], r: [2.5, 10] }, // la costa del Pacífico de Perú y Atacama
  { c: [-71.6, 11.8], r: [1.4, 0.8] }, // la Guajira
];
/** Qué tan cerca de una cordillera queda un punto (0 lejos, `alto` encima). */
function montana(lon: number, lat: number): number {
  let m = 0;
  for (const c of CORDILLERAS) for (let i = 1; i < c.pts.length; i++) {
    const [x1, y1] = c.pts[i - 1], [x2, y2] = c.pts[i];
    const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((lon - x1) * dx + (lat - y1) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(lon - x1 - t * dx, lat - y1 - t * dy) / c.ancho;
    if (d < 1) m = Math.max(m, c.alto * (1 - d * d));
  }
  return m;
}
const seco = (lon: number, lat: number) => SECOS.reduce((a, s) => Math.max(a, 1 - Math.hypot((lon - s.c[0]) / s.r[0], (lat - s.c[1]) / s.r[1])), 0);

/**
 * Pinta tierra y mar sobre `p` a partir de una máscara de tierra: el mar en bandas de profundidad con trama, la
 * orilla clara, la línea de costa oscura, la playa y la tierra con su relieve. `geo(x, y)` da la longitud (oeste en
 * negativo) y la latitud de cada pixel, para poner las cordilleras y los desiertos donde van.
 */
function pintarTierraYMar(p: Pix, tierra: Uint8Array, geo: (x: number, y: number) => [number, number], seed: number, rejilla?: (x: number, y: number) => boolean) {
  const { w, h } = p;
  const dm = distancia(tierra, w, h, false, 40), dt = distancia(tierra, w, h, true, 12);
  const n = ruido(seed), n2 = ruido(seed + 7);
  const banda = (v: number, cortes: number[], tonos: string[], x: number, y: number) => {
    // como una escalera de tonos, pero con el borde de cada escalón tramado
    for (let k = 0; k < cortes.length; k++) if (v < cortes[k]) {
      const prev = k ? cortes[k - 1] : 0, f = (v - prev) / (cortes[k] - prev);
      return f > 0.7 && bayer(x, y) < (f - 0.7) / 0.3 && k + 1 < tonos.length ? tonos[k + 1] : tonos[k];
    }
    return tonos[tonos.length - 1];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!tierra[i]) {
      const d = dm[i];
      if (d < 1.2) { p.px(x, y, COSTA); continue; }
      if (d < 2.2) { p.px(x, y, ESPUMA); continue; }
      const v = d + (n2(x, y, 0.06) - 0.5) * 8;
      let c = banda(v, [4.5, 9, 18, 30], [ORILLA, MAR[4], MAR[3], MAR[2], MAR[1]], x, y);
      if (rejilla?.(x, y)) c = mixHex(c, '#6a9ad8', 0.3);
      // olitas sueltas en mar abierto
      if (d > 10 && (x * 7 + y * 13) % 89 === 0) { p.px(x, y, '#3f7cc4'); if (x + 1 < w && !tierra[i + 1]) p.px(x + 1, y, '#3f7cc4'); continue; }
      p.px(x, y, c);
      continue;
    }
    const d = dt[i];
    if (d < 1.2) { p.px(x, y, PLAYA); continue; }
    const [lon, lat] = geo(x, y), la = Math.abs(lat) + (n2(x + 11, y, 0.04) - 0.5) * 10;
    const se = seco(lon, lat) + (n(x + 40, y, 0.05) - 0.5) * 0.5;
    const zona = se > 0.15 ? TIERRA.seco : la > 32 ? TIERRA.templado : TIERRA.tropico;
    // relieve: la cordillera sube el ruido; nieve solo en lo más alto y fuera del trópico bajo
    const alto = (X: number, Y: number) => { const q = n(X, Y, 0.11); return q * 0.45 + montana(...geo(X, Y)) * (0.2 + 0.6 * q); };
    const r = alto(x, y);
    if (r > 0.6) {
      // la ladera que mira al noroeste con luz, la otra en sombra
      const somb = alto(x - 1, y - 1) > r + 0.01;
      p.px(x, y, r > 0.94 ? TIERRA.monte[3] : TIERRA.monte[somb ? 0 : r > 0.72 ? 2 : 1]);
      continue;
    }
    const v = n(x, y, 0.07) + (bayer(x, y) - 0.5) * 0.1;
    p.px(x, y, zona[v < 0.38 ? 0 : v < 0.5 ? 1 : v < 0.62 ? 2 : 3]);
  }
}

/** Resalta un país: el borde de adentro en oro y el relleno un poco más claro. */
function resaltar(p: Pix, mask: Uint8Array) {
  const { w, h } = p;
  const d = distancia(mask, w, h, true, 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!mask[i]) continue;
    const di = d[i] < 1.2 ? 1 : d[i] < 2.2 ? 2 : 3;
    const c = p.r.data, o = i * 4;
    const cur = '#' + [c[o], c[o + 1], c[o + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    if (cur === COSTA) continue;
    if (di === 1) p.px(x, y, ORO);
    else if (di === 2) p.px(x, y, ORO_OSC);
    else p.px(x, y, mixHex(cur, '#fff2b0', 0.22));
  }
}

/** Una rosa de los vientos de radio `r`. */
function rosa(p: Pix, cx: number, cy: number, r: number) {
  p.ring(cx, cy, r, '#c8d8f0', 1, 1);
  p.ring(cx, cy, r - 3, '#7a9ac8', 1, 1);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2, largo = k % 2 ? r * 0.55 : r + 3;
    const ex = cx + Math.cos(a) * largo, ey = cy + Math.sin(a) * largo;
    const pa = a + Math.PI / 2, ancho = k % 2 ? 2 : 4;
    for (let t = 0; t <= 1; t += 1 / (largo * 1.5)) {
      const bx = cx + (ex - cx) * t, by = cy + (ey - cy) * t, an = ancho * (1 - t);
      for (let s = -an; s <= an; s += 0.5) p.px(Math.round(bx + Math.cos(pa) * s), Math.round(by + Math.sin(pa) * s), s < 0 ? (k === 0 ? '#ff5a4a' : '#f0f4ff') : k === 0 ? '#b82a20' : '#8aa0c8');
    }
  }
  p.disc(cx, cy, 2, '#f0c040');
}

// ---------------------------------------------------------------- el mapa mundial

/**
 * El mapa mundial de la gira, 800 x 360: el Pacífico con Asia y América, la rejilla cada 15 grados en el mar, la
 * rosa de los vientos al sureste y los países de `resaltados` con borde de oro.
 */
export function mapaMundo(resaltados: readonly PaisGira[] = PAISES_GIRA): UiPiece {
  const { w, h, proyeccion: pr } = MAPA_MUNDO;
  const p = new Pix(w, h);
  const tierra = new Uint8Array(w * h);
  rellenar(tierra, w, h, G.mundo, pr);
  const latDe = (y: number) => pr.lat0 - y / pr.ky;
  const geo = (x: number, y: number): [number, number] => { const e = (x + 0.5 - pr.x0) / pr.kx + pr.lon0; return [e > 180 ? e - 360 : e, latDe(y + 0.5)]; };
  const rejilla = (x: number, y: number) => {
    const lon = (x - pr.x0) / pr.kx + pr.lon0, lat = latDe(y + 0.5);
    const cerca = (v: number, k: number) => Math.abs(v / 15 - Math.round(v / 15)) * 15 < 0.5 / k;
    return (cerca(lon, pr.kx) || cerca(lat, pr.ky)) && (x + y) % 2 === 0;
  };
  pintarTierraYMar(p, tierra, geo, 41, rejilla);
  for (const id of resaltados) {
    const m = new Uint8Array(w * h);
    rellenar(m, w, h, G.paises_mundo[id] ?? [], pr);
    resaltar(p, m);
  }
  // la rosa de los vientos, en el Pacífico cerca del ecuador: arriba de la barra del pasaporte (y 311) y lejos de la ruta
  const [rx, ry] = lugarEn(pr, ROSA.lon, ROSA.lat);
  rosa(p, rx, ry, ROSA.r);
  return {
    name: 'mapa_gira', frames: [p.r], w, h,
    extra: {
      margen: MAPA_MUNDO.margen, proyeccion: pr, resaltados, rosa: [rx, ry, ROSA.r + 3],
      nota: 'Imagen de 800 x 360; la parte de 640 va de x 80 a 720 y calza con el mapa del juego (longitud este de 90 a 300, latitud de 50 a -25). Para poner un lugar: x = (lon este - 90) * kx + 80, y = (50 - lat) * ky.',
    },
  };
}

/** Dónde va la rosa de los vientos (su centro en longitud este y latitud) y su radio: el borde de abajo queda en y 258. */
export const ROSA = { lon: 232, lat: 1, r: 20 };

/** Un tramo del vuelo: un arco que sube hacia el norte, más alto cuanto más largo, con un punto cada `paso` pixeles. */
export function arco(a: [number, number], b: [number, number], paso = 5): [number, number][] {
  const [x0, y0] = a, [x1, y1] = b;
  const L = Math.hypot(x1 - x0, y1 - y0), alto = Math.min(70, L * 0.22);
  const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - alto;
  const en = (t: number): [number, number] => { const u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]; };
  // se recorre fino y se toma un punto cada `paso` de largo, así el avión va parejo por todo el arco
  const out: [number, number][] = [[x0, y0]];
  let largo = 0, prev = en(0);
  const N = Math.max(40, Math.ceil(L * 2));
  for (let i = 1; i <= N; i++) {
    const q = en(i / N);
    largo += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    prev = q;
    if (largo >= paso && i < N) { out.push([Math.round(q[0]), Math.round(q[1])]); largo = 0; }
  }
  const ult = out[out.length - 1];
  if (Math.hypot(ult[0] - x1, ult[1] - y1) < paso / 2 && out.length > 1) out.pop();
  out.push([x1, y1]);
  return out;
}

/**
 * La ruta del avión entre las paradas, en una capa aparte y transparente (800 x 360) para que el juego la vaya
 * descubriendo: rayitas blancas con borde oscuro, y un aro en cada parada. Los puntos de cada tramo van en el
 * manifiesto (`tramos`), para que el avión vuele por el mismo arco.
 */
export function rutaMundo(paradas: readonly Lugar[]): UiPiece {
  const { w, h } = MAPA_MUNDO;
  const p = new Pix(w, h);
  const pts = paradas.map((id) => enMundo(LUGARES[id].lon, LUGARES[id].lat));
  const tramos = pts.slice(1).map((b, i) => arco(pts[i], b, 5));
  for (const t of tramos) {
    // rayitas de 4 con hueco de 3, recorriendo el arco fino
    const fino = t.length > 1 ? t.flatMap(([x, y], i) => { if (!i) return [[x, y]]; const [px, py] = t[i - 1], n = Math.max(1, Math.round(Math.hypot(x - px, y - py))); return Array.from({ length: n }, (_, k) => [Math.round(px + ((x - px) * (k + 1)) / n), Math.round(py + ((y - py) * (k + 1)) / n)]); }) : [];
    fino.forEach(([x, y], i) => { if (i % 7 < 4) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!p.has(x + dx, y + dy)) p.px(x + dx, y + dy, COSTA); } });
    fino.forEach(([x, y], i) => { if (i % 7 < 4) p.px(x, y, '#ffffff'); });
  }
  for (const [x, y] of pts) { p.ring(x, y, 4, COSTA, 1, 1); p.ring(x, y, 3, ORO, 1, 1); }
  return {
    name: 'mapa_gira_ruta', frames: [p.r], w, h,
    extra: { paradas: Object.fromEntries(paradas.map((id, i) => [id, pts[i]])), orden: paradas, tramos, nota: 'Capa transparente sobre `mapa_gira`. `tramos[i]` son los puntos del vuelo de la parada i a la i + 1.' },
  };
}

// ---------------------------------------------------------------- los mapas de región

/** Las dos regiones de la gira: qué se ve (longitud, latitud) y qué país va resaltado. */
export const REGIONES = {
  vietnam: { lon: [98.4, 113.2] as [number, number], lat: [24.2, 7.4] as [number, number], resaltados: ['vietnam'] },
  colombia_venezuela: { lon: [-80.2, -59.0] as [number, number], lat: [16.6, -6.4] as [number, number], resaltados: ['colombia', 'venezuela'] },
} as const;
export type Region = keyof typeof REGIONES;
export const MAPA_REGION = { w: 320, h: 360 };

/** La proyección de una región en su imagen de 320 x 360. */
export function proyeccionRegion(id: Region): Proyeccion {
  const R = REGIONES[id], { w, h } = MAPA_REGION;
  return { lon0: R.lon[0], lat0: R.lat[0], kx: w / (R.lon[1] - R.lon[0]), ky: h / (R.lat[0] - R.lat[1]), x0: 0 };
}

/**
 * El mapa de una región, 320 x 360: los países vecinos más apagados, los de la gira resaltados, y en el manifiesto
 * dónde cae cada lugar del motor que está en la región (`lugares`), para poner ahí las medallas de las pruebas.
 */
export function mapaRegion(id: Region): UiPiece {
  const { w, h } = MAPA_REGION, pr = proyeccionRegion(id), R = REGIONES[id];
  const p = new Pix(w, h);
  const paises = G.regiones[id];
  const tierra = new Uint8Array(w * h);
  for (const anillos of Object.values(paises)) rellenar(tierra, w, h, anillos, pr);
  const geo = (x: number, y: number): [number, number] => [(x + 0.5 - pr.x0) / pr.kx + pr.lon0, pr.lat0 - (y + 0.5) / pr.ky];
  pintarTierraYMar(p, tierra, geo, id === 'vietnam' ? 53 : 67);
  // los vecinos más apagados; las fronteras en línea oscura
  const dueno = new Uint8Array(w * h);
  const nombres = Object.keys(paises);
  nombres.forEach((n, k) => rellenar(dueno, w, h, paises[n], pr, k + 1));
  const gira = new Set<string>(R.resaltados);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, k = dueno[i];
    if (!k || !tierra[i]) continue;
    const o = i * 4, c = p.r.data;
    const cur = '#' + [c[o], c[o + 1], c[o + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    if (cur === COSTA || cur === PLAYA) continue;
    const frontera = (x + 1 < w && dueno[i + 1] && dueno[i + 1] !== k) || (y + 1 < h && dueno[i + w] && dueno[i + w] !== k);
    if (frontera) { p.px(x, y, '#2a2418'); continue; }
    if (!gira.has(nombres[k - 1])) p.px(x, y, mixHex(cur, '#5a6070', 0.45));
  }
  for (const n of R.resaltados) {
    const m = new Uint8Array(w * h);
    rellenar(m, w, h, paises[n] ?? [], pr);
    resaltar(p, m);
  }
  const lugares = Object.fromEntries(LUGARES_IDS.filter((l) => (R.resaltados as readonly string[]).includes(LUGARES[l].pais)).map((l) => [l, lugarEn(pr, LUGARES[l].lon, LUGARES[l].lat)]));
  return {
    name: `mapa_${id}`, frames: [p.r], w, h,
    extra: { proyeccion: pr, lugares, resaltados: R.resaltados, nota: 'Mapa de región de 320 x 360: dos caben lado a lado en la parte de 640. `lugares` dice dónde cae cada lugar; para otro punto: x = (lon - lon0) * kx, y = (lat0 - lat) * ky.' },
  };
}

// ---------------------------------------------------------------- los sellos del pasaporte

/** Los sellos: uno por país de la gira, cada uno con su tinta y su dibujo. */
export const SELLOS = {
  japon: { tinta: '#c8283c', dibujo: 'fuji' },
  vietnam: { tinta: '#7a3aa8', dibujo: 'non_la' },
  colombia: { tinta: '#2a5ad0', dibujo: 'cafe' },
  venezuela: { tinta: '#1f8a4a', dibujo: 'tepuy' },
} as const;
export type Sello = keyof typeof SELLOS;
export const SELLO = { w: 128, h: 40, texto: [42, 7, 80, 26] as [number, number, number, number] };

/** El dibujo del sello en un círculo de radio 13 centrado en (cx, cy), en una sola tinta. */
function dibujoSello(p: Pix, cual: string, cx: number, cy: number, c: string) {
  const dentro = (x: number, y: number) => Math.hypot(x - cx, y - cy) <= 12.5;
  const px = (x: number, y: number) => { if (dentro(x, y)) p.px(x, y, c); };
  if (cual === 'fuji') {
    // el sol detrás, y el Fuji: la cima chata con la nieve hueca de borde dentado y las laderas llenas
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d <= 4.6 && d > 3.4) px(cx + 6 + x, cy - 6 + y); }
    for (let y = 0; y <= 13; y++) {
      const a = 2 + y * 0.78, Y = cy - 6 + y;
      for (let x = -a; x <= a; x++) {
        const X = Math.round(cx + x), borde = Math.abs(x) > a - 1.2;
        const nieve = y < 6 - (Math.abs(Math.round(x)) % 3 === 1 ? 1 : 0);
        if (y === 0 || borde || !nieve) px(X, Y);
      }
    }
    } else if (cual === 'non_la') {
    // el sombrero cónico con sus aros y el lazo
    for (let y = 0; y <= 9; y++) { const a = y * 1.35; for (let x = -a; x <= a; x++) { const aro = y > 2 && y % 3 === 0; if (y === 9 || Math.abs(Math.abs(x) - a) < 1 || aro) px(Math.round(cx + x), cy - 6 + y); } }
    for (let x = -10; x <= 10; x++) px(cx + x, cy + 4);
    for (let t = 0; t < 6; t++) { px(cx - 5 + t, cy + 5 + Math.round(t * 0.6)); px(cx + 5 - t, cy + 5 + Math.round(t * 0.6)); }
  } else if (cual === 'cafe') {
    // la taza de tinto con su vapor y el platico
    for (let y = 0; y <= 7; y++) for (let x = -6; x <= 6; x++) if (y === 7 || Math.abs(x) >= 5 - (y > 5 ? 1 : 0) || y === 0) px(cx - 1 + x, cy - 1 + y);
    for (let y = 1; y <= 4; y++) { px(cx + 7, cy - 1 + y); }
    px(cx + 6, cy); px(cx + 6, cy + 4);
    for (let x = -9; x <= 8; x++) px(cx - 1 + x, cy + 8);
    for (const dx of [-3, 1]) for (let y = 0; y < 7; y++) px(cx + dx + (y % 4 < 2 ? 0 : 1), cy - 3 - y);
  } else {
    // el tepuy: la mesa de paredes rectas, el Salto Ángel cayendo por el medio y la selva abajo
    for (let y = 0; y <= 9; y++) {
      const a = 9 + (y > 6 ? (y - 6) * 0.8 : 0) + (y === 0 ? -1 : 0);
      for (let x = -a; x <= a; x++) {
        const X = Math.round(cx + x), salto = Math.abs(X - (cx + 2)) < 1 && y > 0;
        if (salto) continue;
        px(X, cy - 7 + y);
      }
    }
    for (let x = -12; x <= 12; x++) { const t = Math.round(2 + Math.sin(x * 1.3) * 1.3); for (let k = 0; k < t; k++) px(cx + x, cy + 8 - k); }
    // la nubecita pegada a la mesa
    for (let x = -4; x <= 1; x++) { p.clear(cx - 6 + x, cy - 3); }
  }
}

/**
 * Un sello de pasaporte de 128 x 40 en una sola tinta: el marco doble redondeado, el dibujo del país en un círculo a
 * la izquierda y la franja `texto` vacía, donde el juego escribe el país y la gira con esa misma tinta. La tinta se
 * gasta en unos pixeles, como un sello de verdad.
 */
export function sello(cual: Sello): Pix {
  const { w, h } = SELLO, { tinta } = SELLOS[cual];
  const p = new Pix(w, h);
  const R = 6;
  const dist = (x: number, y: number) => {
    const qx = x < R ? R - x : x > w - 1 - R ? x - (w - 1 - R) : 0, qy = y < R ? R - y : y > h - 1 - R ? y - (h - 1 - R) : 0;
    return qx && qy ? R - Math.hypot(qx, qy) : Math.min(x, y, w - 1 - x, h - 1 - y);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = dist(x, y);
    if ((d >= 0 && d < 2) || (d >= 3.5 && d < 4.5)) p.px(x, y, tinta);
  }
  // el círculo del dibujo y la raya que lo separa del texto
  const cx = 21, cy = 20;
  for (let y = 0; y < h; y++) for (let x = 0; x < 40; x++) { const d = Math.hypot(x - cx, y - cy); if (d > 13.5 && d <= 14.6) p.px(x, y, tinta); }
  dibujoSello(p, SELLOS[cual].dibujo, cx, cy, tinta);
  for (let y = 9; y < h - 9; y += 2) p.px(38, y, tinta);
  // la tinta gastada: se borran unos pixeles en manchas, distintas en cada sello
  const n = ruido(cual.length * 31 + cual.charCodeAt(0));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (p.has(x, y) && n(x, y, 0.18) > 0.68 && bayer(x, y) < 0.6) p.clear(x, y);
  return p;
}

/** Los 4 sellos en una tira (un cuadro por país, en el orden de `orden`). */
export function sellos(): UiPiece {
  const orden = Object.keys(SELLOS) as Sello[];
  return {
    name: 'sellos_pasaporte', frames: orden.map((s) => sello(s).r), w: SELLO.w, h: SELLO.h,
    extra: { orden, tintas: Object.fromEntries(orden.map((s) => [s, SELLOS[s].tinta])), texto: SELLO.texto, nota: 'Un sello por país de la gira. El juego escribe el país y la gira en `texto`, con la tinta de `tintas`.' },
  };
}
