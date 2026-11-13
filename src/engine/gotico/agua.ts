import { createRaster, type Raster } from '../core/raster';
import { KZ, LUZ, VISTA, hash3, tramo, pintarEscena, medirEscena, type Pieza, type Render, type V3 } from './render';
import { codoArco, esCodo } from './objeto';

/**
 * Agua de río pintada por pixel (el arroyo del páramo, y su tramo bajo el puente).
 *
 * Cada tramo es una baldosa de 80×80 (la del piso) que el juego dibuja como suelo, encima de la baldosa de piso. El
 * cauce se describe en coordenadas del río: `s` a lo largo de la corriente (0 a 80 de un borde de la baldosa al otro,
 * también en los codos) y `k` de lado (0 en el centro, negativo a la izquierda de la corriente). Todo lo que cruza el
 * borde de la baldosa (ruido de la superficie, ancho del cauce, espuma, corriente) se repite cada 80 en `s` y no
 * depende de la variante, así un recto pega con un codo, con el puente y con el vado sin costura.
 *
 * La superficie: un campo de ondas que la corriente arrastra (tres fases desfasadas un tercio con peso sen², que
 * suman siempre lo mismo y no laten), su normal da el reflejo. El reflejo sale del rayo de la cámara reflejado en
 * esa normal: el cielo del atardecer (gris frío), la orilla de atrás (marcha corta del rayo sobre la orilla y su
 * pasto), y en el puente, las piedras del arco (rayo contra las piezas del puente). La profundidad oscurece el
 * centro y deja ver el lecho en la orilla. Espuma en el borde, alrededor de las piedras y en su estela; barro
 * mojado con brillo, piedras mojadas con alto propio y anillos de lluvia. Nada alto: lo que pasa de 6 unidades
 * (juncos, cañas) va en un objeto aparte para que el juego lo ordene en profundidad.
 */

export const CUADROS_AGUA = 16;
const P = 80;
const PI = Math.PI, PI2 = PI * 2;
const cl = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sm = (a: number, b: number, v: number) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
type C3 = [number, number, number];
const hex = (h: string): C3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mixC = (a: C3, b: C3, t: number): C3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

// ------------------------------------------------------------------ paleta (valores bajos, un acento frío: el brillo del cielo)
const COL = {
  hondo: hex('#04070a'), medio: hex('#0a1114'), lecho: hex('#2f2b1d'), lechoOsc: hex('#17150e'),
  cieloAlto: hex('#34404a'), cieloBajo: hex('#8796a1'), brillo: hex('#b4c4cc'),
  orillaRef: hex('#0d0e0a'), piedraRef: hex('#1d1e1d'),
  espuma: hex('#a7afaa'), espumaClara: hex('#d6dcd8'), franja: hex('#a2b2bc'),
  barroMojado: hex('#17110b'), barro: hex('#2a2016'), barroSeco: hex('#33281b'),
  piedra: hex('#33312c'), piedraMojada: hex('#1f1e1b'), musgo: hex('#1f2716'), pasto: hex('#3a3420'), lenteja: hex('#1d2414'),
};

// ------------------------------------------------------------------ ruido periódico en s (cada 80) y libre en k
function vn(a: number, b: number, per: number, seed: number): number {
  const ai = Math.floor(a), bi = Math.floor(b), fa = a - ai, fb = b - bi;
  const u = fa * fa * (3 - 2 * fa), v = fb * fb * (3 - 2 * fb);
  const a0 = ((ai % per) + per) % per, a1 = (a0 + 1) % per;
  const h00 = hash3(a0, bi, seed), h10 = hash3(a1, bi, seed), h01 = hash3(a0, bi + 1, seed), h11 = hash3(a1, bi + 1, seed);
  return (h00 + (h10 - h00) * u) * (1 - v) + (h01 + (h11 - h01) * u) * v;
}
/** Ruido de valor en (s, k) con `cs` celdas cada 80 a lo largo (entero: se repite en el borde) y celdas de 80/ck de lado. */
const nsk = (s: number, k: number, cs: number, ck: number, seed: number) => vn((s / P) * cs, (k / P) * ck, cs, seed);

// ------------------------------------------------------------------ el cauce: forma y coordenadas del río
export interface FormaCauce {
  /** 'x' o 'y' (recto a lo largo de ese eje) o un codo (`codo_n/e/s/o`, ver `codoArco`). */
  eje: string;
  /** Serpenteo del recto dentro de la baldosa (0 en los bordes, con tangente recta: pega con el vecino). */
  meandro: number;
  /** Ensanche en el medio de la baldosa (vado, puente). */
  ensanche: number;
}
interface Geo { s: number; k: number; w: number }
/** Medio ancho del agua: igual en todas las variantes en los bordes de la baldosa (cada 80 en s). */
const anchoBase = (s: number) => 20 + 1.5 * Math.sin((PI2 * s) / P + 0.7) + 0.8 * Math.sin((2 * PI2 * s) / P + 2.1);
const campana = (s: number) => { const q = Math.sin((PI * cl(s, 0, P)) / P); return q * q; };

export function geometria(f: FormaCauce): { geo: (x: number, y: number) => Geo; mundo: (s: number, k: number) => [number, number]; dir: (s: number) => [number, number] } {
  const ancho = (s: number) => anchoBase(s) + f.ensanche * campana(s);
  if (!esCodo(f.eje)) {
    const enY = f.eje === 'y';
    // dirección d y normal izquierda l = [-dy, dx]
    const m = (s: number) => f.meandro * campana(s);
    return {
      geo: (x, y) => { const s = (enY ? y : x) + 40; return { s, k: (enY ? -x : y) - m(s), w: ancho(s) }; },
      mundo: (s, k) => (enY ? [-(k + m(s)), s - 40] : [s - 40, k + m(s)]),
      dir: () => (enY ? [0, 1] : [1, 0]),
    };
  }
  const C = codoArco(f.eje), e0 = C.en(0), e1 = C.en(1), [cx, cy] = C.centro;
  const a0 = Math.atan2(e0.p[1] - cy, e0.p[0] - cx);
  let dd = Math.atan2(e1.p[1] - cy, e1.p[0] - cx) - a0;
  if (dd > PI) dd -= PI2; if (dd < -PI) dd += PI2;
  return {
    geo: (x, y) => {
      let da = Math.atan2(y - cy, x - cx) - a0;
      if (da > PI) da -= PI2; if (da < -PI) da += PI2;
      const t = da / dd, q = C.en(cl(t)), s = t * P;
      return { s, k: (x - q.p[0]) * q.l[0] + (y - q.p[1]) * q.l[1], w: ancho(s) };
    },
    mundo: (s, k) => { const q = C.en(cl(s / P)); return [q.p[0] + q.l[0] * k, q.p[1] + q.l[1] * k]; },
    dir: (s) => C.en(cl(s / P)).d,
  };
}

// ------------------------------------------------------------------ piedras (alto propio) y anillos de lluvia
interface Piedra { x: number; y: number; rx: number; ry: number; g: number; h: number; s: number; k: number; r: number; musgo: number; plana: boolean }
export interface EstiloAgua {
  forma: FormaCauce;
  /** Piedras grandes dentro del agua (con espuma y estela). */
  rocas: number;
  /** Pasaderas de lado a lado (vado). */
  vado?: boolean;
  /** Lenteja de agua y tallos rotos tumbados (juncal, sin nada alto). */
  juncal?: boolean;
  semilla: number;
  /** Anillos de lluvia por bucle (0 = sin lluvia). */
  lluvia: number;
  /** Muros en el agua (estribos del puente), rectángulos [x0, x1, y0, y1] en el mundo de la baldosa: espuma contra ellos. */
  muros?: [number, number, number, number][];
}

function piedrasDe(e: EstiloAgua, g: ReturnType<typeof geometria>): Piedra[] {
  const out: Piedra[] = [];
  let n = 0;
  const r = () => hash3(n++, e.semilla, 911);
  const poner = (s: number, k: number, rad: number, h: number, plana = false, musgo = 0) => {
    const [x, y] = g.mundo(s, k);
    out.push({ x, y, rx: rad * (0.8 + r() * 0.45), ry: rad * (0.7 + r() * 0.4), g: r() * PI, h, s, k, r: rad, musgo, plana });
  };
  // guijarros mojados en las dos orillas, lejos del borde de la baldosa
  for (let i = 0; i < 38; i++) {
    const s = 6 + r() * 68, lado = r() < 0.5 ? -1 : 1, w = anchoBase(s) + e.forma.ensanche * campana(s);
    const k = lado * (w + (r() - 0.4) * 6), rad = 0.7 + r() * r() * 1.7;
    poner(s, k, rad, rad * (0.45 + r() * 0.3), false, r() < 0.25 ? 0.6 : 0);
  }
  for (let i = 0; i < e.rocas; i++) {
    const s = 14 + r() * 52, w = anchoBase(s) + e.forma.ensanche * campana(s);
    const k = (r() - 0.5) * w * 1.3, rad = 2.2 + r() * 2.3;
    poner(s, k, rad, rad * (0.6 + r() * 0.35), false, r() < 0.6 ? 0.8 : 0.2);
    if (r() < 0.6) poner(s + (r() - 0.5) * 4, k + (r() < 0.5 ? -1 : 1) * (rad + 0.8 + r()), 0.9 + r() * 0.9, 0.8 + r() * 0.5);
  }
  if (e.vado) {
    const w = anchoBase(40) + e.forma.ensanche;
    for (let kk = -w + 2.2; kk <= w - 2; kk += 4.6 + r() * 0.8) poner(40 + (r() - 0.5) * 3, kk, 2.5 + r() * 0.5, 1.5 + r() * 0.3, true, r() < 0.3 ? 0.5 : 0);
  }
  return out;
}
/** Alto de las piedras en (x, y) y cuál es (la más alta que cae ahí). */
function rejillaPiedras(ps: Piedra[]) {
  const G = 4, mapa = new Map<number, Piedra[]>();
  const key = (i: number, j: number) => (i + 512) * 1024 + (j + 512);
  for (const p of ps) {
    const R = Math.max(p.rx, p.ry) + 0.5;
    for (let j = Math.floor((p.y - R) / G); j <= Math.floor((p.y + R) / G); j++) for (let i = Math.floor((p.x - R) / G); i <= Math.floor((p.x + R) / G); i++) {
      const k = key(i, j); let l = mapa.get(k); if (!l) { l = []; mapa.set(k, l); } l.push(p);
    }
  }
  return (x: number, y: number): [number, Piedra | null, number] => {
    const l = mapa.get(key(Math.floor(x / G), Math.floor(y / G)));
    let hm = 0, cual: Piedra | null = null, dmin = 9;
    if (!l) return [0, null, 9];
    for (const p of l) {
      const dx = x - p.x, dy = y - p.y, c = Math.cos(p.g), s = Math.sin(p.g);
      const u = (dx * c + dy * s) / p.rx, v = (-dx * s + dy * c) / p.ry, d = Math.sqrt(u * u + v * v);
      if (d < dmin) dmin = d;
      if (d >= 1) continue;
      const bulto = p.plana ? Math.min(1, (1 - d) * 3.2) : Math.sqrt(1 - d * d);
      const h = p.h * bulto * (0.92 + 0.16 * hash3(Math.floor(x * 2), Math.floor(y * 2), 77));
      if (h > hm) { hm = h; cual = p; }
    }
    return [hm, cual, dmin];
  };
}

// ------------------------------------------------------------------ el reflejo del puente (o de lo que se pase)
export interface Reflejado { piezas: Pieza[]; color: C3 }

const VIS: V3 = [-VISTA[0], -VISTA[1], -VISTA[2]]; // hacia la cámara
const SOL: V3 = (() => { const v: V3 = [LUZ[0], LUZ[1], LUZ[2] * 0.55]; const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; })();
function reflejar(n: V3): V3 { const d = VISTA, k = 2 * (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]); return [d[0] - k * n[0], d[1] - k * n[1], d[2] - k * n[2]]; }
function cielo(r: V3): C3 {
  const e = cl(r[2]);
  const c = mixC(COL.cieloBajo, COL.cieloAlto, Math.pow(e, 0.55));
  // un claro apenas más tibio hacia donde cae la luz (sin pasar a otro color)
  const sol = Math.max(0, r[0] * SOL[0] + r[1] * SOL[1] + r[2] * SOL[2]);
  const b = Math.pow(sol, 6) * 0.1;
  return [c[0] + b * 1.05, c[1] + b, c[2] + b * 0.92];
}

// ------------------------------------------------------------------ pintar
export interface LienzoAgua { w: number; h: number; ax: number; ay: number }
export const LIENZO_TRAMO: LienzoAgua = { w: 160, h: 98, ax: 80, ay: 58 };
const SS = 2;

/**
 * Pinta un tramo de río (cuadro f de CUADROS_AGUA) en un lienzo; el origen del mundo (centro de la baldosa) cae en
 * (ax, ay). Lo que cae fuera del rombo de la baldosa queda transparente. `reflejo`: piezas que se ven en el agua.
 */
export function pintarAgua(e: EstiloAgua, f: number, L: LienzoAgua = LIENZO_TRAMO, reflejo?: Reflejado): Raster {
  const img = createRaster(L.w, L.h);
  const est = estatico(e, L, reflejo);
  const g = est.g, t = (((f % CUADROS_AGUA) + CUADROS_AGUA) % CUADROS_AGUA) / CUADROS_AGUA;
  // tres fases de la corriente: cada una arrastra su ruido y se desvanece al volver (pesos sen² que suman 3/2)
  const fases = [0, 1, 2].map((i) => { const ph = (t + i / 3) % 1, w = Math.sin(PI * ph) ** 2; return { ph, w: w / 1.5, o: i * 23.7 }; });
  const D = 46; // desplazamiento de cada fase en su vida (unidades)
  const vel = (k: number, w: number) => 1 - 0.6 * cl(Math.abs(k) / w) ** 2;
  const alturaOnda = (s: number, k: number, w: number) => {
    let h = 0; const v = vel(k, w);
    for (const F of fases) {
      const ss = s - D * v * F.ph + F.o;
      h += F.w * (nsk(ss, k + F.o, 6, 10, 41) * 0.6 + nsk(ss, k - F.o, 12, 30, 42) * 0.4);
    }
    return h;
  };
  const espumaCampo = (s: number, k: number, w: number) => {
    let h = 0; const v = vel(k, w);
    for (const F of fases) { const ss = s - D * v * F.ph + F.o * 1.7; h += F.w * (nsk(ss, k * 1.4 + F.o, 18, 30, 51) * 0.7 + nsk(ss, k * 1.4, 40, 60, 52) * 0.3); }
    return h;
  };
  // anillos de lluvia: posición fija en el tramo, nacen en su fase y crecen
  const anillos = est.anillos;

  for (let py = 0; py < L.h; py++) for (let px = 0; px < L.w; px++) {
    const sx0 = px - L.ax + 0.5, sy0 = py - L.ay + 0.5;
    if (Math.abs(sx0) / 81 + Math.abs(sy0) / 40.5 > 1.02 && est.alto[py * L.w + px] === 0) continue;
    let R = 0, G = 0, B = 0, A = 0;
    for (let q = 0; q < SS * SS; q++) {
      const sx = px - L.ax + ((q % SS) + 0.5) / SS, sy = py - L.ay + (Math.floor(q / SS) + 0.5) / SS;
      // la piedra más cercana a la cámara a lo largo del rayo (alto propio hasta 6)
      let hit: { x: number; y: number; z: number; p: Piedra } | null = null;
      for (let z = 6; z >= 0.05; z -= 0.25) {
        const x = (2 * (sy + z * KZ) + sx) / 2, y = (2 * (sy + z * KZ) - sx) / 2;
        const [hh, pp] = est.piedra(x, y);
        if (pp && hh >= z) { hit = { x, y, z: hh, p: pp }; break; }
      }
      const x = hit ? hit.x : (2 * sy + sx) / 2, y = hit ? hit.y : (2 * sy - sx) / 2;
      // fuera del rombo de la baldosa: nada (la piedra puede asomar arriba). Media unidad de más: el borde va entero
      // y se pisa con el vecino, que en ese punto pinta lo mismo (sin línea de costura)
      if (Math.abs(x) > 40.6 || Math.abs(y) > 40.6) continue;
      const G0 = g.geo(x, y);
      let c: C3, a = 1;
      if (hit) c = colorPiedra(est, hit.x, hit.y, hit.z, hit.p, G0);
      else {
        const ak = Math.abs(G0.k), borde = G0.w + (nsk(G0.s, G0.k, 20, 30, 61) - 0.5) * 1.6;
        if (ak < borde) c = colorAgua(est, x, y, G0, borde, alturaOnda, espumaCampo, anillos, t, { fases, D, vel });
        else { const r = colorOrilla(est, x, y, G0, borde); c = r[0]; a = r[1]; }
      }
      R += c[0] * a; G += c[1] * a; B += c[2] * a; A += a;
    }
    if (A <= 0.001) continue;
    const o = (py * L.w + px) * 4, n = SS * SS;
    // trama fina (4×4) al cuantizar: sin bandas en los degradados oscuros
    const tr = (BAYER[(py & 3) * 4 + (px & 3)] - 0.5) * 1.6;
    img.data[o] = cl((R / A) * 255 + tr, 0, 255); img.data[o + 1] = cl((G / A) * 255 + tr, 0, 255); img.data[o + 2] = cl((B / A) * 255 + tr, 0, 255);
    img.data[o + 3] = Math.round(cl(A / n) * 255);
  }
  return img;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// ------------------------------------------------------------------ lo que no cambia entre cuadros
interface Estatico {
  g: ReturnType<typeof geometria>;
  piedra: (x: number, y: number) => [number, Piedra | null, number];
  piedras: Piedra[];
  alto: Uint8Array;
  e: EstiloAgua;
  anillos: { x: number; y: number; b: number }[];
  refl: ((r: V3, x: number, y: number) => C3 | null) | null;
  cerca: (x: number, y: number) => [Piedra, number] | null;
}
const cacheEst = new Map<string, Estatico>();
function estatico(e: EstiloAgua, L: LienzoAgua, reflejo?: Reflejado): Estatico {
  const k = JSON.stringify([e, L, reflejo ? reflejo.piezas.length : 0]);
  let r = cacheEst.get(k);
  if (r) return r;
  const g = geometria(e.forma), piedras = piedrasDe(e, g), piedra = rejillaPiedras(piedras);
  const alto = new Uint8Array(L.w * L.h);
  for (const p of piedras) { const [px, py] = [p.x - p.y + L.ax, (p.x + p.y) / 2 + L.ay]; for (let y = Math.floor(py - p.h * KZ - p.r - 2); y <= py + p.r + 2; y++) for (let x = Math.floor(px - 2 * p.r - 2); x <= px + 2 * p.r + 2; x++) if (x >= 0 && y >= 0 && x < L.w && y < L.h) alto[y * L.w + x] = 1; }
  let n = 0; const rr = () => hash3(n++, e.semilla, 313);
  const anillos: { x: number; y: number; b: number }[] = [];
  for (let i = 0; i < e.lluvia; i++) { const s = 6 + rr() * 68, w = anchoBase(s) + e.forma.ensanche * campana(s), [x, y] = g.mundo(s, (rr() - 0.5) * 1.6 * (w - 3)); anillos.push({ x, y, b: rr() }); }
  // reflejo de piezas (el puente): el rayo reflejado contra cada pieza; se guarda por punto del agua
  let refl: Estatico['refl'] = null;
  if (reflejo) {
    const ps = reflejo.piezas.filter((p) => !p.resta);
    const cache = new Map<number, C3 | null>();
    refl = (rv, x, y) => {
      // se cuantiza el punto (medio pixel) para reusar el resultado entre cuadros; el rayo trae el temblor de la onda
      const qx = Math.round(x * 2), qy = Math.round(y * 2), qa = Math.round(Math.atan2(rv[1], rv[0]) * 40), qz = Math.round(rv[2] * 40);
      const key = ((qx + 400) * 1000 + (qy + 400)) * 10000 + (qa + 200) * 50 + qz;
      if (cache.has(key)) return cache.get(key)!;
      const o: V3 = [qx / 2, qy / 2, 0.05];
      let best: number = Infinity, nb: V3 | null = null;
      for (const p of ps) { const tr = tramo(p, o, rv, 0, 200); if (tr && tr.t0 >= 0 && tr.t0 < best) { best = tr.t0; nb = tr.n0; } }
      let c: C3 | null = null;
      if (nb) {
        const zHit = best * rv[2];
        // la cara de abajo del arco va en sombra; lo que mira a la luz, apenas más claro; más lejos, más tenue
        const dif = Math.max(0, nb[0] * LUZ[0] + nb[1] * LUZ[1] + nb[2] * LUZ[2]);
        const k2 = 0.35 + 0.65 * dif - Math.max(0, -nb[2]) * 0.25;
        c = [reflejo.color[0] * k2, reflejo.color[1] * k2, reflejo.color[2] * k2];
        void zHit;
      }
      cache.set(key, c);
      return c;
    };
  }
  const grandes = piedras.filter((p) => p.r >= 1.6);
  const cerca = (x: number, y: number): [Piedra, number] | null => {
    let best: [Piedra, number] | null = null;
    for (const p of grandes) {
      const dx = x - p.x, dy = y - p.y; if (Math.abs(dx) > p.rx + 3 || Math.abs(dy) > p.rx + 3) continue;
      const c = Math.cos(p.g), sn = Math.sin(p.g), u = (dx * c + dy * sn) / p.rx, v = (-dx * sn + dy * c) / p.ry, d = Math.sqrt(u * u + v * v);
      if (!best || d < best[1]) best = [p, d];
    }
    return best;
  };
  r = { g, piedra, piedras, alto, e, anillos, refl, cerca };
  cacheEst.set(k, r);
  return r;
}

// ------------------------------------------------------------------ colores
function colorAgua(est: Estatico, x: number, y: number, G0: Geo, borde: number, onda: (s: number, k: number, w: number) => number,
  espuma: (s: number, k: number, w: number) => number, anillos: Estatico['anillos'], t: number,
  flujo: { fases: { ph: number; w: number; o: number }[]; D: number; vel: (k: number, w: number) => number }): C3 {
  const { g, e } = est, { fases, vel } = flujo;
  const ak = Math.abs(G0.k);
  // profundidad: 0 en la orilla, 1 al centro, con el lecho que se mueve un poco
  const D = cl((borde - ak) / borde), Dz = flujo.D;
  const lechoN = nsk(G0.s, G0.k, 10, 16, 71);
  const prof = cl(Math.pow(D, 0.75) * (0.85 + 0.3 * lechoN));
  // normal de la onda (diferencias en el mundo)
  const ep = 0.6, h0 = onda(G0.s, G0.k, G0.w);
  const gx = g.geo(x + ep, y), gy = g.geo(x, y + ep);
  let dhx = (onda(gx.s, gx.k, gx.w) - h0) / ep, dhy = (onda(gy.s, gy.k, gy.w) - h0) / ep;
  // anillos de lluvia: una onda que crece y se apaga en un cuarto de bucle
  let anillo = 0;
  for (const r of anillos) {
    const edad = (t - r.b + 1) % 1; if (edad > 0.3) continue;
    const u = edad / 0.3, rad = 0.6 + u * 4.2, dx = x - r.x, dy = y - r.y, d = Math.hypot(dx, dy);
    if (d > rad + 1.5 || d < 0.01) continue;
    const q = Math.exp(-(((d - rad) / 0.5) ** 2)) * (1 - u) * (1 - u);
    anillo += q; dhx += (dx / d) * q * 1.2; dhy += (dy / d) * q * 1.2;
  }
  const amp = 3.4 * (0.45 + 0.55 * D); // en la orilla el agua está más quieta
  const n: V3 = [-dhx * amp, -dhy * amp, 1]; const nl = Math.hypot(n[0], n[1], n[2]); n[0] /= nl; n[1] /= nl; n[2] /= nl;
  const rv = reflejar(n);
  // fresnel (sesgado para que en la penumbra del juego el reflejo se lea)
  const cosv = Math.max(0, n[0] * VIS[0] + n[1] * VIS[1] + n[2] * VIS[2]);
  // en el centro de la corriente refleja más (el agua es más clara que el barro); en los bordes, menos
  const F = cl(0.26 + 0.8 * Math.pow(1 - cosv, 3) + 0.36 * sm(0.05, 0.7, D));
  // qué se refleja: el puente, la orilla de atrás (rayo que corre sobre la orilla y su pasto) o el cielo
  let refl: C3 | null = est.refl ? est.refl(rv, x, y) : null;
  if (!refl) {
    const hz = Math.hypot(rv[0], rv[1]) || 1, ux = rv[0] / hz, uy = rv[1] / hz, pend = rv[2] / hz;
    for (let j = 0.6; j < 16; j += 1) {
      const qx = x + ux * j, qy = y + uy * j, q = g.geo(qx, qy), sobre = Math.abs(q.k) - q.w;
      if (sobre <= 0) continue;
      const hb = 3.2 + sm(0, 2.5, sobre) * 1.2 + sm(3, 7, sobre) * 4.5 * nsk(q.s, q.k, 26, 40, 81) ** 2;
      if (hb > j * pend) { refl = mixC(COL.orillaRef, cielo(rv), cl(0.1 + (j * pend) / hb * 0.35)); break; }
    }
  }
  if (!refl) refl = cielo(rv);
  // cuerpo: el lecho en lo bajo, negro verdoso en lo hondo
  const lecho = mixC(COL.lechoOsc, COL.lecho, lechoN);
  let c = mixC(lecho, mixC(COL.medio, COL.hondo, sm(0.4, 1, prof)), sm(0.02, 0.55, prof));
  c = mixC(c, refl, F);
  // los bordes más oscuros que el centro (la orilla hace sombra y el agua baja ahí)
  const kb = (0.55 + 0.45 * sm(0.02, 0.45, D)) * (1 - 0.3 * Math.exp(-(((borde - ak) / 0.9) ** 2))); c = [c[0] * kb, c[1] * kb, c[2] * kb];
  // franja de luz: el cielo largo que se refleja en el centro de la corriente, serpentea un poco y la corriente la rompe
  {
    const kf = G0.w * (0.12 * Math.sin((PI2 * G0.s) / P + 1.3) + 0.06 * Math.sin((2 * PI2 * G0.s) / P + 0.4)) + G0.w * 0.08;
    let rot = 0; for (const Fz of flujo.fases) rot += Fz.w * nsk(G0.s - flujo.D * vel(G0.k, G0.w) * Fz.ph + Fz.o * 3.1, G0.k * 0.6 + Fz.o, 5, 30, 59);
    const fr = Math.exp(-(((G0.k - kf) / (G0.w * 0.34)) ** 2)) * sm(0.2, 0.65, rot);
    c = mixC(c, COL.franja, fr * 0.55);
  }
  // brillo frío donde la onda mira al claro del cielo
  const sb = Math.max(0, rv[0] * SOL[0] + rv[1] * SOL[1] + rv[2] * SOL[2]);
  const brillo = Math.pow(sb, 7) * 0.45 * (0.35 + 0.65 * D) + anillo * 0.06;
  c = [c[0] + COL.brillo[0] * brillo, c[1] + COL.brillo[1] * brillo, c[2] + COL.brillo[2] * brillo];
  // espuma: en la orilla, alrededor de las piedras y en su estela; se rompe con la corriente
  const fn = espuma(G0.s, G0.k, G0.w);
  let mascara = Math.exp(-(((borde - ak) / 1.9) ** 2)) * (0.25 + 1.0 * sm(0.38, 0.68, nsk(G0.s - t * P, G0.k, 9, 12, 57)));
  // contra los estribos del puente (o cualquier muro en el agua): espuma que se junta y se arrastra
  for (const [x0, x1, y0, y1] of e.muros ?? []) {
    const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1), dm = Math.hypot(dx, dy);
    if (dm > 0 && dm < 5) mascara = Math.max(mascara, Math.exp(-dm / 1.3) * 1.25);
    // estela aguas abajo del estribo: una cola de espuma que se abre y se apaga
    const qx = Math.min(x1, Math.max(x0, x)), qy = Math.min(y1, Math.max(y0, y)), d = g.dir(G0.s);
    const along = (x - qx) * d[0] + (y - qy) * d[1], across = Math.abs((x - qx) * d[1] - (y - qy) * d[0]);
    if (dm > 0 && along > 0 && along < 16) mascara = Math.max(mascara, (1 - along / 16) * sm(1.6 + along * 0.3, 0.2, across) * 1.0);
  }
  const [, pc, dPiedra] = est.piedra(x, y), grande = est.cerca(x, y);
  if (grande) mascara = Math.max(mascara, Math.exp(-(((grande[1] - 1) / 0.4) ** 2)) * (grande[0].plana ? 0.75 : 1.05));
  void pc; void dPiedra;
  for (const p of est.piedras) {
    if (p.r < 1.5) continue;
    const ds = G0.s - p.s, dk = Math.abs(G0.k - p.k);
    if (ds < 0 || ds > 18) continue;
    const ancho = p.r * 0.75 + ds * 0.22;
    if (dk > ancho + 1) continue;
    mascara = Math.max(mascara, (1 - ds / 18) * sm(ancho + 1, ancho * 0.4, dk) * (p.plana ? 0.7 : 0.95));
  }
  if (e.juncal) {
    // lenteja de agua en lo quieto de la orilla (se corre muy despacio con la corriente)
    const lj = nsk(G0.s, G0.k, 12, 40, 91) * sm(0.45, 0.0, D);
    if (lj > 0.42) c = mixC(c, COL.lenteja, sm(0.42, 0.55, lj) * 0.85);
  }
  const esp = sm(0.42, 0.72, fn + mascara * 0.45 - 0.18) * cl(mascara * 1.5);
  if (esp > 0) c = mixC(c, mixC(COL.espuma, COL.espumaClara, sm(0.7, 0.95, fn)), esp * 0.9);
  // hilos de corriente: espuma fina estirada que baja por el centro (la dirección se lee sin ver la animación)
  let hilo = 0; const vv = vel(G0.k, G0.w);
  for (const Fz of fases) hilo += Fz.w * nsk(G0.s - Dz * vv * Fz.ph * 1.15 + Fz.o * 2.3, G0.k * 1.0 + Fz.o, 3, 46, 58);
  const hl = sm(0.6, 0.72, hilo) * sm(0.15, 0.6, prof) * 0.32;
  if (hl > 0) c = mixC(c, COL.espuma, hl);
  return c;
}

function colorOrilla(est: Estatico, x: number, y: number, G0: Geo, borde: number): [C3, number] {
  const sobre = Math.abs(G0.k) - borde;
  // alto del barro (para la luz): sube desde el agua y se ondula
  const alto = (q: Geo) => { const so = Math.abs(q.k) - q.w; return sm(0, 6, so) * 1.3 + (nsk(q.s, q.k, 30, 50, 101) - 0.5) * 0.9 + (nsk(q.s, q.k, 70, 120, 102) - 0.5) * 0.35; };
  const ep = 0.7, h0 = alto(G0), hx = alto(est.g.geo(x + ep, y)), hy = alto(est.g.geo(x, y + ep));
  const n: V3 = [-(hx - h0) / ep * 1.6, -(hy - h0) / ep * 1.6, 1]; const nl = Math.hypot(n[0], n[1], n[2]); n[0] /= nl; n[1] /= nl; n[2] /= nl;
  const dif = Math.max(0, n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2]);
  const mojado = sm(5.5, 0.5, sobre + (nsk(G0.s, G0.k, 16, 24, 103) - 0.5) * 3);
  let c = mixC(mixC(COL.barroSeco, COL.barro, sm(14, 6, sobre)), COL.barroMojado, mojado);
  const luz = 0.62 + 0.62 * dif;
  c = [c[0] * luz, c[1] * luz, c[2] * luz];
  // brillo del barro mojado: el cielo en las caras que lo reflejan
  if (mojado > 0.05) {
    const rv = reflejar(n), F = 0.05 + 0.5 * Math.pow(1 - Math.max(0, n[0] * VIS[0] + n[1] * VIS[1] + n[2] * VIS[2]), 4);
    const sb = Math.pow(Math.max(0, rv[0] * SOL[0] + rv[1] * SOL[1] + rv[2] * SOL[2]), 10);
    c = mixC(c, cielo(rv), F * mojado * 0.55);
    c = [c[0] + sb * 0.12 * mojado, c[1] + sb * 0.13 * mojado, c[2] + sb * 0.14 * mojado];
  }
  // pasto ralo que asoma al alejarse del agua
  const pa = nsk(G0.s, G0.k, 40, 60, 104);
  if (sobre > 4 && pa > 0.62) c = mixC(c, COL.pasto, sm(0.62, 0.8, pa) * sm(4, 8, sobre) * 0.7);
  // se funde con el piso de abajo antes del borde de la baldosa
  const a = sm(12.5, 6, sobre + (nsk(G0.s, G0.k, 12, 18, 105) - 0.5) * 4);
  return [c, a];
}

function colorPiedra(est: Estatico, x: number, y: number, z: number, p: Piedra, G0: Geo): C3 {
  const ep = 0.25, h0 = est.piedra(x, y)[0], hx = est.piedra(x + ep, y)[0], hy = est.piedra(x, y + ep)[0];
  const n: V3 = [-(hx - h0) / ep, -(hy - h0) / ep, 1]; const nl = Math.hypot(n[0], n[1], n[2]); n[0] /= nl; n[1] /= nl; n[2] /= nl;
  const dif = Math.max(0, n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2]);
  const enAgua = Math.abs(G0.k) < G0.w + 0.5;
  // mojada abajo (y toda si está en el agua), seca y más clara arriba; musgo en la cara de arriba
  const seca = enAgua ? sm(0.55, 1, z / p.h) * 0.35 : sm(0.2, 0.9, z / Math.max(0.5, p.h));
  let c = mixC(COL.piedraMojada, COL.piedra, seca);
  const gr = hash3(Math.floor(x * 3), Math.floor(y * 3), 5) - 0.5;
  if (p.musgo && n[2] > 0.8 && nsk(x + y, x - y, 30, 30, 7) < p.musgo * 0.6) c = mixC(c, COL.musgo, 0.7);
  const luz = 0.35 + 0.95 * dif + gr * 0.12;
  c = [c[0] * luz, c[1] * luz, c[2] * luz];
  // brillo mojado: un hilo frío donde la cara mira al claro
  const rv = reflejar(n), sb = Math.max(0, rv[0] * SOL[0] + rv[1] * SOL[1] + rv[2] * SOL[2]);
  const b = Math.pow(sb, 14) * (1 - seca) * 0.55;
  // la línea del agua: más oscura en la base de la piedra mojada
  const base = enAgua ? sm(0.9, 0, z) * 0.45 : 0;
  return [c[0] * (1 - base) + COL.brillo[0] * b, c[1] * (1 - base) + COL.brillo[1] * b, c[2] * (1 - base) + COL.brillo[2] * b];
}

// ------------------------------------------------------------------ los tramos del arroyo y su render
/** Estilo de cada variante del arroyo (`recto`, `piedras`, `vado`, `juncal`, sus `_y` y los codos). */
export function estiloArroyo(v: string): EstiloAgua {
  const codo = esCodo(v), base = v.replace(/_y$/, ''), eje = codo ? v : v.endsWith('_y') ? 'y' : 'x';
  const sem: Record<string, number> = { recto: 11, piedras: 23, vado: 37, juncal: 53, puente: 67 };
  return {
    forma: { eje, meandro: codo ? 0 : base === 'piedras' ? -2 : base === 'juncal' ? 1.5 : base === 'recto' ? 2.5 : 0, ensanche: base === 'vado' ? 2.5 : base === 'puente' ? 2.5 : 0 },
    rocas: base === 'piedras' ? 6 : base === 'recto' || codo ? 1 : 0,
    vado: base === 'vado', juncal: base === 'juncal',
    semilla: (sem[base] ?? 79) + (codo ? v.charCodeAt(5) : 0),
    lluvia: 9,
  };
}
export function pintarArroyo(v: string, f: number): Render {
  return { img: pintarAgua(estiloArroyo(v), f), ancla: [LIENZO_TRAMO.ax, LIENZO_TRAMO.ay] };
}

// ------------------------------------------------------------------ agua con algo encima (el puente)
const cacheSobre = new Map<string, { L: LienzoAgua; img: Raster }>();
/**
 * Un tramo de agua con piezas encima (un puente): el agua se pinta por pixel en un lienzo que abarca las dos cosas,
 * refleja las piezas, y las piezas (con su sombra sobre el agua) se pintan una sola vez y van encima en cada cuadro.
 */
export function aguaConPiezas(clave: string, e: EstiloAgua, piezas: Pieza[], f: number, colorRef: string): Render {
  let base = cacheSobre.get(clave);
  if (!base) {
    const m = medirEscena({ piezas });
    const X0 = Math.floor(Math.min(-82, (m?.x0 ?? 0) - 3)), X1 = Math.ceil(Math.max(82, (m?.x1 ?? 0) + 3));
    const Y0 = Math.floor(Math.min(-58, (m?.y0 ?? 0) - 3)), Y1 = Math.ceil(Math.max(42, (m?.y1 ?? 0) + 3));
    const L: LienzoAgua = { w: X1 - X0, h: Y1 - Y0, ax: -X0, ay: -Y0 };
    base = { L, img: pintarEscena({ piezas }, {}, L).img };
    cacheSobre.set(clave, base);
  }
  const { L, img: top } = base;
  const agua = pintarAgua(e, f, L, { piezas, color: hex(colorRef) });
  const d = agua.data, t = top.data;
  for (let i = 0; i < d.length; i += 4) {
    // la sombra del puente sobre el agua, a la mitad: el agua de abajo no se apaga del todo
    const sombra = t[i] === 8 && t[i + 1] === 6 && t[i + 2] === 12;
    const a = (t[i + 3] / 255) * (sombra ? 0.35 : 1); if (!a) continue;
    const ad = d[i + 3] / 255, ao = a + ad * (1 - a);
    for (let k = 0; k < 3; k++) d[i + k] = (t[i + k] * a + d[i + k] * ad * (1 - a)) / ao;
    d[i + 3] = Math.round(ao * 255);
  }
  return { img: agua, ancla: [L.ax, L.ay] };
}

/**
 * Dónde van los juncos (`par_juncos_orilla`) de un tramo del arroyo: puntos sobre el borde del barro, en celdas de juego
 * (16 unidades) desde el centro de la baldosa, con la variante que conviene. El juego los pone como objetos que se
 * ordenan en profundidad (no van en el agua, que es suelo). Lejos de los bordes de la baldosa y nunca en el agua.
 */
export function juncosDeTramo(v: string, semilla = 1): { dx: number; dy: number; v: string }[] {
  const e = estiloArroyo(v), g = geometria(e.forma), base = v.replace(/_y$/, '');
  const n = base === 'juncal' ? 6 : base === 'vado' || base === 'puente' ? 0 : 2;
  const out: { dx: number; dy: number; v: string }[] = [];
  let i = 0; const r = () => hash3(i++, semilla, 4243);
  for (let j = 0; j < n; j++) {
    const s = 12 + ((j + r() * 0.8) / Math.max(1, n)) * 56, lado = r() < 0.5 ? -1 : 1, w = anchoBase(s) + e.forma.ensanche * campana(s);
    const [x, y] = g.mundo(s, lado * (w + 2.5 + r() * 2.5));
    const d = g.dir(s), aLoLargoY = Math.abs(d[1]) > Math.abs(d[0]);
    const tipo = base === 'juncal' ? (r() < 0.45 ? (aLoLargoY ? 'hilera_y' : 'hilera') : r() < 0.6 ? 'eneas' : 'mata') : r() < 0.5 ? 'seca' : 'mata';
    out.push({ dx: Math.round((x / 16) * 2) / 2, dy: Math.round((y / 16) * 2) / 2, v: tipo });
  }
  return out;
}
