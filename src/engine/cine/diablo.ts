import { createRaster, type Raster } from '../core/raster';
import { type RGB, hex, mixc, clamp01, hash, vnoise, fbm, bayer, setPx, alphaAt, addLight, fillPoly, stroke, curva, ellipse, halo, contorno } from './pintura';

/**
 * El Diablo pintado para las cinemáticas (encargo F13). Diseño propio: rojo oscuro, enorme, cuernos que se abren hacia
 * arriba, cejas de hueso, pómulos con espinas, colmillos que bajan sobre el labio, grietas de brasa en la piel,
 * escarcha en los cuernos, alas de murciélago rotas detrás de los hombros y garras negras. Nada de sangre: lo que
 * brilla adentro es brasa.
 *
 * La cara es un relieve: una suma de bultos (frente, cejas, pómulos, hocico, nariz, mandíbula) con su altura, y la
 * luz sale de las normales de ese relieve: brasa naranja desde abajo y un canto frío desde arriba (el hielo).
 */

export const DIABLO = {
  piel: ['#120203', '#250505', '#3e0908', '#5c100d', '#801c12', '#a8301a', '#d0502a'].map(hex),
  brasa: hex('#ff6a1a'), brasaLuz: hex('#ffd06a'), ojo: hex('#ff3a14'), ojoLuz: hex('#ffe0a0'),
  cuerno: ['#0e0809', '#2a1c1a', '#4a3430', '#705048', '#a07c68'].map(hex),
  escarcha: ['#6a8cb0', '#a8c8e8', '#e4f2ff'].map(hex),
  frio: hex('#7ab8f0'),
  hueso: hex('#c8b8a0'),
  negro: hex('#060203'),
};

type Blob = { x: number; y: number; rx: number; ry: number; h: number; rot?: number; menos?: boolean };

/** altura del relieve en (x, y): unión suave de bultos, menos los huecos (ojos, boca) */
function relieve(blobs: Blob[], x: number, y: number): number {
  let h = -1e9, hueco = 0;
  for (const b of blobs) {
    const c = Math.cos(b.rot ?? 0), s = Math.sin(b.rot ?? 0);
    const dx = x - b.x, dy = y - b.y;
    const u = (dx * c + dy * s) / b.rx, v = (-dx * s + dy * c) / b.ry;
    const d2 = u * u + v * v;
    if (d2 >= 1) continue;
    const z = b.h * Math.sqrt(1 - d2);
    if (b.menos) hueco = Math.max(hueco, z);
    else h = h < -1e8 ? z : Math.max(h, z) + Math.min(h, z) * 0.12; // unión que suaviza los encuentros
  }
  return h < -1e8 ? -1 : h - hueco;
}

/** la cara, cuadro f (de 8): los ojos se abren de a poco y brillan; la escarcha de los cuernos se rompe */
export interface CaraDiablo { cara: Raster; ojos: [number, number][]; narices: [number, number][] }

export function caraDiablo(W: number, H: number, apertura: number, escarcha: number, semilla = 1): CaraDiablo {
  const r = createRaster(W, H);
  const cx = W / 2, cy = H * 0.56, s = H / 270; // a 270 de alto, todo en pixeles del panel
  const S = (v: number) => v * s;
  // ---- detrás: las alas rotas, saliendo detrás de los hombros hacia los costados
  for (const side of [-1, 1]) {
    const hombro: [number, number] = [cx + side * S(150), cy + S(95)];
    const dedos: [number, number][] = [[cx + side * S(225), cy - S(95)], [cx + side * S(245), cy - S(20)], [cx + side * S(236), cy + S(45)]];
    // la membrana: entre los dedos, con agujeros y bordes rotos
    for (let k = 0; k < dedos.length; k++) {
      const a = k === 0 ? [cx + side * S(170), cy - S(40)] as [number, number] : dedos[k - 1];
      const b = dedos[k];
      fillPoly(r, [hombro, a, [(a[0] + b[0]) / 2 - side * S(18), (a[1] + b[1]) / 2 + S(10)], b], (x, y) => {
        const n = vnoise(x, y, S(9), 31 + semilla);
        if (n < 0.18) return null; // agujeros
        const d = Math.abs(x - hombro[0]) / S(110);
        return mixc(hex('#0c0304'), hex('#260707'), clamp01(1 - d) * 0.6 + (n - 0.5) * 0.2);
      });
    }
    // los huesos de los dedos del ala
    curva(r, [hombro, [cx + side * S(185), cy - S(10)], [cx + side * S(200), cy - S(60)], dedos[0]], (t) => S(6) * (1 - t) + 1.5, hex('#240808'));
    for (const d of dedos.slice(1)) curva(r, [[cx + side * S(185), cy - S(10)], [(cx + side * S(185) + d[0]) / 2, (cy - S(10) + d[1]) / 2 - S(8)], d], (t) => S(3.5) * (1 - t) + 1, hex('#2a0a0a'));
    // garra en la punta del ala
    stroke(r, dedos[0], [dedos[0][0] + side * S(8), dedos[0][1] - S(10)], S(2.4), DIABLO.cuerno[2], 0.6);
  }
  // ---- los hombros: enormes, con espinas de hueso
  for (const side of [-1, 1]) {
    ellipse(r, cx + side * S(150), cy + S(150), S(110), S(80), (_x, y, d) => mixc(DIABLO.piel[1], DIABLO.piel[3], clamp01((1 - d) * 0.6 + (y - cy - S(80)) / S(200))));
    for (let k = 0; k < 4; k++) {
      const bx = cx + side * S(95 + k * 30), by = cy + S(82 + k * 8);
      const tip: [number, number] = [bx + side * S(14 + k * 4), by - S(34 - k * 4)];
      fillPoly(r, [[bx - S(9), by + S(4)], tip, [bx + S(9), by + S(4)]], (_x, y) => mixc(DIABLO.cuerno[1], DIABLO.cuerno[3], clamp01(1 - (y - tip[1]) / S(40)) * 0.8));
    }
  }
  // el cuello
  fillPoly(r, [[cx - S(62), cy + S(40)], [cx + S(62), cy + S(40)], [cx + S(90), cy + S(130)], [cx - S(90), cy + S(130)]], (_x, y) => mixc(DIABLO.piel[1], DIABLO.piel[2], clamp01((y - cy) / S(130))));

  // ---- la cara: contorno anguloso (frente ancha, pómulos en punta, mandíbula larga) y relieve por distancia al borde
  const eyeY = cy - S(16), eyeX = S(31);
  const mitad: [number, number][] = [[0, -96], [26, -94], [52, -86], [70, -64], [78, -38], [96, -10], [80, 8], [70, 36], [58, 62], [36, 86], [14, 100], [0, 104]];
  const contornoCara: [number, number][] = [...mitad.map(([x, y]) => [cx + S(x), cy + S(y)] as [number, number]), ...mitad.slice(1, -1).reverse().map(([x, y]) => [cx - S(x), cy + S(y)] as [number, number])];
  const mask = createRaster(W, H);
  fillPoly(mask, contornoCara, hex('#ffffff'));
  // distancia al borde (aproximada, dos pasadas)
  const D = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) D[i] = mask.data[i * 4 + 3] ? 1e6 : 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (D[i]) D[i] = Math.min(D[i], D[i - 1] + 1, D[i - W] + 1, D[i - W - 1] + 1.41, D[i - W + 1] + 1.41); }
  for (let y = H - 2; y > 0; y--) for (let x = W - 2; x > 0; x--) { const i = y * W + x; if (D[i]) D[i] = Math.min(D[i], D[i + 1] + 1, D[i + W] + 1, D[i + W + 1] + 1.41, D[i + W - 1] + 1.41); }
  const bultos: Blob[] = [
    { x: cx - S(34), y: cy - S(32), rx: S(40), ry: S(11), h: S(26), rot: 0.32 }, // cejas: bajan hacia la nariz (ceño)
    { x: cx + S(34), y: cy - S(32), rx: S(40), ry: S(11), h: S(26), rot: -0.32 },
    { x: cx - S(62), y: cy - S(6), rx: S(30), ry: S(14), h: S(20), rot: 0.5 }, // pómulos
    { x: cx + S(62), y: cy - S(6), rx: S(30), ry: S(14), h: S(20), rot: -0.5 },
    { x: cx, y: cy + S(2), rx: S(11), ry: S(30), h: S(22) }, // tabique
    { x: cx, y: cy + S(34), rx: S(42), ry: S(16), h: S(16) }, // hocico
    { x: cx, y: cy - S(66), rx: S(14), ry: S(26), h: S(10) }, // la cresta de la frente
  ];
  const huecos: Blob[] = [
    { x: cx - eyeX, y: eyeY, rx: S(21), ry: S(10), h: S(26), rot: 0.32 },
    { x: cx + eyeX, y: eyeY, rx: S(21), ry: S(10), h: S(26), rot: -0.32 },
    { x: cx - S(40), y: cy + S(20), rx: S(16), ry: S(22), h: S(8), rot: -0.4 }, // mejillas hundidas
    { x: cx + S(40), y: cy + S(20), rx: S(16), ry: S(22), h: S(8), rot: 0.4 },
  ];
  const Hm = new Float32Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!D[i]) continue;
    const dome = S(34) * Math.sqrt(Math.min(1, D[i] / S(34)));
    const b = Math.max(0, relieve(bultos, x + 0.5, y + 0.5));
    const hu = Math.max(0, relieve(huecos, x + 0.5, y + 0.5));
    Hm[i] = Math.max(0.5, dome + b - hu);
  }
  // grietas de brasa: venas finas, solo en algunas manchas (frente, mejillas, mandíbula)
  const grieta = (x: number, y: number) => {
    const n = vnoise(x, y, S(20), 77 + semilla) * 0.65 + vnoise(x, y, S(7), 78 + semilla) * 0.35;
    const mancha = vnoise(x, y, S(46), 79 + semilla);
    return mancha > 0.56 ? 1 - Math.abs(n - 0.5) * 2 : 0;
  };
  // suavizado (la distancia al borde sale facetada): dos pasadas de caja 5 x 5
  for (let pasada = 0; pasada < 2; pasada++) {
    const src = Float32Array.from(Hm);
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x;
      if (src[i] <= 0) continue;
      let sum = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const v = src[i + dy * W + dx]; sum += Math.max(0, v); n++; }
      Hm[i] = Math.max(0.5, sum / n);
    }
  }
  const L1 = [0.1, 0.8, 0.6], L2 = [-0.25, -0.9, 0.35]; // brasa desde abajo, frío desde arriba
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, h = Hm[i];
    if (h <= 0) continue;
    const hv = (q: number) => (Hm[q] > 0 ? Hm[q] : 0);
    const gx = (hv(i + 1) - hv(i - 1)) / 2, gy = (hv(i + W) - hv(i - W)) / 2;
    const bump = (vnoise(x, y, S(4), 91) - 0.5) * 0.5;
    let nx = -gx + bump, ny = -gy + bump * 0.6, nz = 1.1;
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const warm = Math.max(0, nx * L1[0] + ny * L1[1] + nz * L1[2]);
    const cold = Math.max(0, nx * L2[0] + ny * L2[1] + nz * L2[2]);
    // pliegues: donde el relieve se hunde, sombra (lo que hace que la cara se lea)
    const lap = hv(i + 1) + hv(i - 1) + hv(i + W) + hv(i - W) - 4 * h;
    const abajo = clamp01((y - (cy - S(90))) / S(190));
    let l = warm * warm * (0.35 + 0.65 * abajo) + 0.04 - Math.max(0, lap) * 0.12;
    const idx = Math.max(0, Math.min(DIABLO.piel.length - 1, Math.floor(l * DIABLO.piel.length + (bayer(x, y) - 0.5) * 0.6)));
    let c = DIABLO.piel[idx];
    if (cold > 0.8) c = mixc(c, DIABLO.frio, (cold - 0.8) * 1.6);
    const g = grieta(x, y);
    if (g > 0.955) c = g > 0.985 ? DIABLO.brasaLuz : DIABLO.brasa;
    else if (g > 0.93) c = mixc(c, DIABLO.brasa, 0.35);
    setPx(r, x, y, c);
  }
  // borde de la cara: oscuro (se recorta contra las alas y el trono)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (Hm[y * W + x] <= 0) continue;
    if (Hm[y * W + x - 1] <= 0 || Hm[y * W + x + 1] <= 0 || Hm[(y - 1) * W + x] <= 0 || Hm[(y + 1) * W + x] <= 0) setPx(r, x, y, DIABLO.negro);
  }
  // ---- espinas de los pómulos (hacia afuera y abajo) y de la mandíbula
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const bx = cx + side * S(90 - k * 12), by = cy + S(-8 + k * 24);
      const tip: [number, number] = [bx + side * S(32 - k * 7), by + S(4 + k * 6)];
      fillPoly(r, [[bx - side * S(4), by - S(5)], tip, [bx - side * S(6), by + S(6)]], (_x, y) => mixc(DIABLO.cuerno[0], DIABLO.cuerno[3], clamp01(1 - (y - by + S(5)) / S(12)) * 0.8));
    }
  }
  // ---- los cuernos: salen de las sienes, se abren y suben, con anillos, luz de brasa abajo y escarcha arriba
  for (const side of [-1, 1]) cuerno(r, [[cx + side * S(54), cy - S(80)], [cx + side * S(92), cy - S(112)], [cx + side * S(150), cy - S(122)], [cx + side * S(198), cy - S(148)], [cx + side * S(216), cy - S(200)]], S(20), escarcha, semilla + (side > 0 ? 1 : 0));
  // ---- los ojos: brasa en la cuenca; el párpado sube de a poco
  const ojos: [number, number][] = [];
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeX, ey = eyeY;
    ojos.push([ex, ey]);
    const rot = side < 0 ? 0.32 : -0.32, c = Math.cos(rot), sn = Math.sin(rot);
    for (let y = -S(12); y <= S(12); y++) for (let x = -S(24); x <= S(24); x++) {
      const u = (x * c + y * sn) / S(17), v = (-x * sn + y * c) / S(5);
      const d = Math.hypot(u, v);
      if (d > 1) continue;
      const X = ex + x, Y = ey + y;
      // el párpado: lo que está arriba de la línea queda cerrado
      const linea = 1 - apertura * 2; // de 1 (cerrado) a -1 (abierto)
      if (v < linea) { if (Math.abs(v - linea) < 0.25 && apertura > 0.02) setPx(r, X, Y, DIABLO.brasa); else setPx(r, X, Y, DIABLO.piel[0]); continue; }
      // iris de brasa, la pupila de cabra (horizontal) negra
      const pupila = Math.abs(u) < 0.09 && Math.abs(v) < 0.9;
      setPx(r, X, Y, pupila ? DIABLO.negro : d < 0.45 ? DIABLO.ojoLuz : d < 0.8 ? DIABLO.ojo : hex('#a01208'));
    }
    if (apertura > 0.05) {
      // la luz de los ojos pega abajo de las cejas y en los pómulos
      for (let y = -S(26); y <= S(30); y++) for (let x = -S(34); x <= S(34); x++) { const d = Math.hypot(x / S(34), y / S(28)); if (d < 1) addLight(r, ex + x, ey + y, DIABLO.ojo, (1 - d) ** 2 * 0.5 * apertura); }
      halo(r, ex, ey, S(22), S(9), DIABLO.ojoLuz, 0.3 * apertura);
    }
  }
  // ---- la boca: ancha, las comisuras bajan; adentro brasa (nada de sangre) y los colmillos
  const my = cy + S(54);
  const boca = (x: number) => my + S(9) * (x / S(48)) ** 2; // curva hacia abajo en las puntas
  for (let x = -S(48); x <= S(48); x++) {
    const abre = Math.max(0, S(7) * Math.sqrt(Math.max(0, 1 - (x / S(48)) ** 2)) - S(1.5));
    const y0 = boca(x);
    for (let y = -abre; y <= abre; y++) setPx(r, cx + x, y0 + y, mixc(hex('#200404'), DIABLO.brasa, clamp01(1 - Math.abs(y) / Math.max(1, abre)) * 0.55 * (1 - Math.abs(x) / S(60))));
    setPx(r, cx + x, y0 - abre - 1, DIABLO.negro); setPx(r, cx + x, y0 + abre + 1, DIABLO.negro);
    // labio de abajo con luz de la brasa
    addLight(r, cx + x, y0 + abre + 2, DIABLO.brasa, 0.25);
  }
  for (const side of [-1, 1]) {
    // colmillos de arriba: largos, bajan por encima del labio
    for (const [dx, largo, w] of [[S(13), S(26), S(4.5)], [S(28), S(16), S(3.5)], [S(40), S(10), S(2.5)]] as [number, number, number][]) {
      const x0 = cx + side * dx, y0 = boca(side * dx) - S(5);
      fillPoly(r, [[x0 - w, y0], [x0 + w, y0], [x0 + side * S(1.5), y0 + largo]], (x, y) => mixc(hex('#8a7a66'), hex('#f4ead6'), clamp01(0.3 + (side * (x0 - x)) / w * 0.5 + (y - y0) / largo * 0.3)));
      stroke(r, [x0 + side * w, y0], [x0 + side * S(1.5), y0 + largo], 0.7, hex('#2a1a12'));
    }
    // colmillos de abajo: suben desde las comisuras
    const x1 = cx + side * S(34), y1 = boca(side * S(34)) + S(7);
    fillPoly(r, [[x1 - S(4), y1], [x1 + S(4), y1], [x1 + side * S(5), y1 - S(18)]], (_x, y) => mixc(hex('#8a7a66'), hex('#e8dcc4'), clamp01((y1 - y) / S(18))));
  }
  // narices: dos huecos oscuros con brasa
  const narices: [number, number][] = [];
  for (const side of [-1, 1]) {
    const nx = cx + side * S(8), ny = cy + S(28);
    narices.push([nx, ny]);
    // ranuras de serpiente, inclinadas
    for (let t = -1; t <= 1; t += 0.1) { setPx(r, nx + side * t * S(4), ny + t * S(3), DIABLO.negro); setPx(r, nx + side * t * S(4) + 1, ny + t * S(3), DIABLO.negro); }
    addLight(r, nx, ny + S(4), DIABLO.brasa, 0.2);
  }
  return { cara: r, ojos, narices };
}

/**
 * Un cuerno: la curva por puntos, el ancho en la base y la escarcha (1 cubre todo el lado de arriba, 0 nada). Cada
 * tramo se pinta de un borde al otro con la luz de un cilindro: brasa abajo, canto frío arriba, anillos oscuros.
 */
export function cuerno(r: Raster, pts: [number, number][], base: number, escarcha: number, semilla: number) {
  const P = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  const sp: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 24; k++) {
    const t = k / 24, p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const q = (j: 0 | 1) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t * t * t);
    sp.push([q(0), q(1)]);
  }
  sp.push(pts[pts.length - 1]);
  // cada muestra de la curva: su normal (hacia arriba), su ancho y cuánto lleva recorrido
  const M: { x: number; y: number; nx: number; ny: number; w: number; u: number; largo: number }[] = [];
  let largo = 0;
  for (let i = 0; i < sp.length; i++) {
    if (i) largo += Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]);
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    let nx = -ty, ny = tx;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const u = i / (sp.length - 1);
    M.push({ x: sp[i][0], y: sp[i][1], nx, ny, w: base * (1 - u) ** 0.85 + 1.2, u, largo });
  }
  const x0 = Math.floor(Math.min(...M.map((m) => m.x - m.w))), x1 = Math.ceil(Math.max(...M.map((m) => m.x + m.w)));
  const y0 = Math.floor(Math.min(...M.map((m) => m.y - m.w))), y1 = Math.ceil(Math.max(...M.map((m) => m.y + m.w)));
  for (let y = Math.max(0, y0); y <= Math.min(r.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(r.w - 1, x1); x++) {
    // la muestra más cercana y de qué lado del eje cae el pixel
    let best = -1, bd = 1e9;
    for (let i = 0; i < M.length; i++) { const d = (x + 0.5 - M[i].x) ** 2 + (y + 0.5 - M[i].y) ** 2; if (d < bd) { bd = d; best = i; } }
    const m = M[best];
    if (Math.sqrt(bd) > m.w) continue;
    const sgn = ((x + 0.5 - m.x) * m.nx + (y + 0.5 - m.y) * m.ny) / m.w;
    const nz = Math.sqrt(Math.max(0, 1 - sgn * sgn));
    const anillo = (m.largo % 11) < 1.3 && m.u < 0.85;
    // sgn > 0: lado de arriba (frío); sgn < 0: lado de abajo (la brasa)
    let l = 0.18 + nz * 0.3 + Math.max(0, -sgn) * 0.45 - (anillo ? 0.16 : 0);
    if (Math.abs(sgn) > 0.86) l = 0.02;
    let c = DIABLO.cuerno[Math.max(0, Math.min(4, Math.floor(l * 5 + (bayer(x & 3, y & 3) - 0.5) * 0.5)))];
    if (sgn < -0.3 && !anillo) c = mixc(c, DIABLO.brasa, 0.14 * (1 - m.u));
    if (sgn > 0.45 && Math.abs(sgn) <= 0.86) c = mixc(c, DIABLO.frio, 0.3);
    if (sgn > 0.1 && vnoise(x, y, 7, 55 + semilla) < escarcha * 1.05 - 0.05 + sgn * 0.1) c = DIABLO.escarcha[sgn > 0.7 ? 2 : sgn > 0.4 ? 1 : 0];
    setPx(r, x, y, c);
  }
}

/** Una garra del Diablo sobre el brazo del trono (lado -1 izquierda, 1 derecha): dedos largos que cuelgan del borde y uñas negras */
export function garra(r: Raster, x: number, y: number, side: number, k: number, escarcha = 0) {
  // el brazo del trono: un bloque de hielo y hueso
  fillPoly(r, [[x - k * 60, y - k * 4], [x + k * 60, y - k * 8], [x + k * 64, y + k * 40], [x - k * 64, y + k * 44]], (X, Y) => mixc(hex('#0c1420'), hex('#2a4058'), clamp01(1 - (Y - y) / (k * 40)) * 0.6 + vnoise(X, Y, 6, 3) * 0.2));
  stroke(r, [x - k * 60, y - k * 4], [x + k * 60, y - k * 8], 1, mixc(DIABLO.escarcha[1], DIABLO.frio, 0.3));
  // el dorso de la mano, encima del brazo
  ellipse(r, x - side * k * 6, y - k * 10, k * 30, k * 13, (_X, Y, d) => mixc(DIABLO.piel[1], DIABLO.piel[3], clamp01(1 - d) * 0.5 + clamp01((Y - y + k * 20) / (k * 30)) * 0.4));
  // cuatro dedos que pasan por el borde del brazo y cuelgan, con nudillos marcados
  for (let f = 0; f < 4; f++) {
    const fx = x - side * k * 26 + side * f * k * 15;
    const a: [number, number] = [fx, y - k * 14], b: [number, number] = [fx + side * k * 4, y + k * 2], c: [number, number] = [fx + side * k * 3, y + k * 26];
    curva(r, [a, b, c], (t) => k * (7 - t * 1.5), (t, d) => (d > 0.86 ? DIABLO.negro : mixc(DIABLO.piel[3], DIABLO.piel[5], 0.2 + (1 - d) * 0.5 - t * 0.3)));
    ellipse(r, b[0], b[1] - k * 2, k * 3, k * 2, DIABLO.piel[4]);
    // la uña: negra, larga, curva hacia adentro
    const u: [number, number][] = [c, [c[0] - side * k * 1, c[1] + k * 8], [c[0] - side * k * 6, c[1] + k * 15]];
    curva(r, u, (t) => k * 3.6 * (1 - t) + 0.7, (t, d) => (d < 0.45 && t < 0.5 ? DIABLO.cuerno[3] : DIABLO.cuerno[0]));
    if (escarcha > 0) { setPx(r, c[0], c[1] + k * 4, DIABLO.escarcha[2]); setPx(r, c[0] + 1, c[1] + k * 4, DIABLO.escarcha[1]); }
  }
  // grietas de brasa en el dorso
  for (let i = 0; i < 5; i++) {
    const a = hash(i, 1, 5) * Math.PI * 2, d = hash(i, 2, 5) * k * 18;
    stroke(r, [x + Math.cos(a) * d, y - k * 10 + Math.sin(a) * d * 0.5], [x + Math.cos(a + 0.6) * (d + k * 7), y - k * 10 + Math.sin(a + 0.6) * (d + k * 7) * 0.5], 0.6, DIABLO.brasa);
  }
}

/**
 * El Diablo de rodillas, entero (para el cierre): de frente, la cabeza gacha (se ven los cuernos y la coronilla), los
 * hombros enormes con espinas, las dos manos apoyadas en el piso y las alas rotas caídas a los costados. `brasa` de 1
 * a 0: las grietas de brasa se apagan. `luz`: el color de la luz que le pega desde abajo (las grietas del piso).
 * (ox, oy) es el punto del piso entre las rodillas; k la escala (1 = unos 130 px de alto).
 */
export function diabloRodillas(W: number, H: number, ox: number, oy: number, k: number, brasa: number, luz: RGB): Raster {
  const r = createRaster(W, H);
  const P = (x: number, y: number): [number, number] => [ox + x * k, oy + y * k];
  const piel = (y: number) => mixc(hex('#140405'), hex('#3a0c0a'), clamp01(0.25 + (y - oy) / (120 * k) * -0.2));
  const pielY = (_x: number, y: number) => piel(y);
  // las alas: el codo arriba de los hombros y los dedos que bajan hasta el piso; la membrana entre dedo y dedo se
  // curva hacia adentro y tiene agujeros (rota)
  for (const s of [-1, 1]) {
    const hombro = P(s * 40, -94), codo = P(s * 74, -142);
    const dedos: [number, number][] = [P(s * 118, -112), P(s * 128, -60), P(s * 116, -14), P(s * 84, 0)];
    for (let i = 0; i < dedos.length; i++) {
      const a = i === 0 ? hombro : dedos[i - 1], b = dedos[i];
      const m: [number, number] = [(a[0] + b[0]) / 2 * 0.7 + codo[0] * 0.3, (a[1] + b[1]) / 2 * 0.7 + codo[1] * 0.3];
      fillPoly(r, [codo, a, m, b], (x, y) => (vnoise(x, y, 6 * k, 12 + i) < 0.2 ? null : mixc(hex('#0c0304'), hex('#2a0808'), clamp01(vnoise(x, y, 11, 4) * 0.7 + (y - codo[1]) / (200 * k)))));
    }
    curva(r, [hombro, [(hombro[0] + codo[0]) / 2, codo[1] + 10 * k], codo], (t) => 4 * k * (1 - t * 0.4), hex('#1e0606'));
    for (const d of dedos) stroke(r, codo, d, 1.4 * k, hex('#1e0606'), 0.6);
    fillPoly(r, [[codo[0] - 3 * k, codo[1]], [codo[0] + s * 4 * k, codo[1] - 12 * k], [codo[0] + 3 * k, codo[1]]], hex('#3a2a28'));
  }
  // las rodillas en el piso
  for (const s of [-1, 1]) ellipse(r, ...P(s * 22, -6), 16 * k, 9 * k, pielY);
  // el torso, inclinado hacia adelante: ancho de hombros, angosto en la cintura
  fillPoly(r, [P(-58, -98), P(58, -98), P(40, -60), P(28, -16), P(-28, -16), P(-40, -60)], pielY);
  // espinas de los hombros
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const b = P(s * (42 + i * 8), -98 + i * 4); fillPoly(r, [[b[0] - 4 * k, b[1] + 2 * k], [b[0] + s * 6 * k, b[1] - (16 - i * 3) * k], [b[0] + 4 * k, b[1] + 2 * k]], hex('#2a1c1a')); }
  // los brazos hasta las manos en el piso
  for (const s of [-1, 1]) {
    curva(r, [P(s * 52, -92), P(s * 66, -60), P(s * 60, -24), P(s * 56, -4)], (t) => (12 - t * 4) * k, (_t, d) => (d > 0.85 ? hex('#060203') : piel(oy - 60 * k)));
    // la mano con las garras sobre el hielo
    ellipse(r, ...P(s * 56, -3), 11 * k, 5 * k, piel(oy));
    for (let g = 0; g < 4; g++) stroke(r, P(s * (48 + g * 5), -1), P(s * (46 + g * 6), 4), 1.4 * k, hex('#0a0606'), 0.5 * k);
  }
  // la cabeza gacha: casi metida entre los hombros, se ve la coronilla y la frente
  ellipse(r, ...P(0, -94), 25 * k, 19 * k, (_x, y) => mixc(hex('#1e0606'), hex('#4a100c'), clamp01((y - (oy - 112 * k)) / (34 * k))));
  // las cejas de hueso (lo único de la cara que se ve, mirando al piso)
  for (const s of [-1, 1]) stroke(r, P(s * 4, -88), P(s * 20, -92), 2.6 * k, hex('#5a1810'), 1.6 * k);
  // los cuernos: salen de los costados de la cabeza, se abren y suben
  for (const s of [-1, 1]) cuerno(r, [P(s * 18, -104), P(s * 42, -124), P(s * 70, -128), P(s * 92, -146), P(s * 98, -172)], 7 * k, 0, 70 + s);
  // las grietas de brasa: pocas venas, que se apagan
  if (brasa > 0) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!alphaAt(r, x, y)) continue;
    const n = vnoise(x, y, 9 * k, 9) * 0.7 + vnoise(x, y, 4 * k, 10) * 0.3;
    const g = (1 - Math.abs(n - 0.5) * 2) * (vnoise(x, y, 30 * k, 11) > 0.45 ? 1 : 0);
    if (g > 0.97) setPx(r, x, y, mixc(hex('#3a0c0a'), g > 0.99 ? DIABLO.brasaLuz : DIABLO.brasa, brasa));
  }
  // los ojos: dos brasas chiquitas que miran al piso (se apagan)
  if (brasa > 0.15) for (const s of [-1, 1]) { const [x, y] = P(s * 8, -86); setPx(r, x, y, mixc(hex('#3a0806'), DIABLO.ojo, brasa)); setPx(r, x + s, y, mixc(hex('#3a0806'), DIABLO.ojo, brasa * 0.7)); }
  contorno(r, hex('#040102'));
  // canto de luz desde abajo y de los costados (la luz de las grietas del piso)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!alphaAt(r, x, y)) continue;
    const abajo = !alphaAt(r, x, y + 1), lado = !alphaAt(r, x - 1, y) || !alphaAt(r, x + 1, y);
    if (abajo) addLight(r, x, y, luz, 0.7);
    else if (lado) addLight(r, x, y, luz, 0.35 * clamp01((y - (oy - 140 * k)) / (140 * k)));
  }
  void fbm; void hash;
  return r;
}
