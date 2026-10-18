import { createRaster, type Raster } from '../core/raster';
import { type RGB, hex, mixc, clamp01, hash, vnoise, fbm, bayer, setPx, alphaAt, addLight, fillPoly, stroke, curva, ellipse, halo, contorno, pegar, canto } from './pintura';

/**
 * El Diablo pintado para las cinemáticas (encargo F13). Diseño propio: rojo oscuro, enorme, cuernos que se abren hacia
 * arriba, cejas de hueso, pómulos con espinas, colmillos que bajan sobre el labio, grietas de brasa en la piel,
 * escarcha en los cuernos, alas de murciélago rotas detrás de los hombros y garras negras. Lo que brilla adentro es
 * brasa. Las alas son las del Diablo del juego (Mundo 7, pedido de Sophie): espinas, garras y la sangre oscura que
 * cuelga de ellas. Es la única sangre del juego, y solo en las alas.
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

/** la cara, cuadro f (de 8): los ojos se abren de a poco y brillan; la escarcha de los cuernos se rompe; `goteo` (0 a 1) es la fase de la sangre de las alas */
export interface CaraDiablo { cara: Raster; ojos: [number, number][]; narices: [number, number][] }

export function caraDiablo(W: number, H: number, apertura: number, escarcha: number, semilla = 1, goteo = 0): CaraDiablo {
  const r = createRaster(W, H);
  const cx = W / 2, cy = H * 0.56, s = H / 270; // a 270 de alto, todo en pixeles del panel
  const S = (v: number) => v * s;
  // ---- detrás: las alas del juego (enormes, rotas, con espinas, garras y la sangre que gotea despacio)
  for (const side of [-1, 1]) {
    const X = (x: number, y: number): [number, number] => [cx + side * S(x), cy + S(y)];
    const ala = createRaster(W, H);
    const gotas = alaDiablo(ala, X(128, 72), X(168, -112), [X(226, -142), X(236, -62), X(228, 8), X(190, 70)], side, S(1.9), 30 + semilla + (side > 0 ? 1 : 0));
    // el canto: frío arriba (el hielo) y brasa abajo, para que se recorten contra el fondo negro
    canto(ala, [0, -1], DIABLO.frio, 0.3);
    canto(ala, [0, 1], DIABLO.brasa, 0.45);
    pegar(r, ala, 0, 0);
    sangreAlas(r, gotas, goteo);
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
 * a 0: las grietas de brasa se apagan. `caida` de 0 a 1: las alas se desploman y se rompen con él; `goteo` es la fase
 * de la sangre de las alas. `luz`: el color de la luz que le pega desde abajo (las grietas del piso).
 * (ox, oy) es el punto del piso entre las rodillas; k la escala (1 = unos 130 px de alto).
 */
export function diabloRodillas(W: number, H: number, ox: number, oy: number, k: number, brasa: number, luz: RGB, caida = 0, goteo = 0): Raster {
  let r = createRaster(W, H);
  const P = (x: number, y: number): [number, number] => [ox + x * k, oy + y * k];
  const piel = (y: number) => mixc(hex('#140405'), hex('#3a0c0a'), clamp01(0.25 + (y - oy) / (120 * k) * -0.2));
  const pielY = (_x: number, y: number) => piel(y);
  // las alas del juego, detrás: el codo arriba de los hombros y los dedos que bajan hasta el piso. Con `caida` se
  // desploman: el codo baja, los dedos se abren sobre el hielo, la piel se rompe y un dedo se parte
  const c = clamp01(caida);
  const alas = createRaster(W, H);
  const gotas: Goteo[] = [];
  for (const s of [-1, 1]) {
    const L = (a: [number, number], b: [number, number]) => lerp2(P(s * a[0], a[1]), P(s * b[0], b[1]), c);
    const tips = [L([140, -130], [166, -60]), L([156, -68], [178, -20]), L([140, -16], [146, -2]), L([96, 0], [98, 1])];
    gotas.push(...alaDiablo(alas, P(s * 40, -94), L([84, -160], [112, -106]), tips, s, k * 1.1, 60 + (s > 0 ? 1 : 0), c, oy + 1, clamp01((c - 0.55) / 0.45)));
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
  // las alas van detrás (sin las grietas de brasa: son las del juego)
  pegar(alas, r, 0, 0);
  r = alas;
  contorno(r, hex('#040102'));
  // canto de luz desde abajo y de los costados (la luz de las grietas del piso)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!alphaAt(r, x, y)) continue;
    const abajo = !alphaAt(r, x, y + 1), lado = !alphaAt(r, x - 1, y) || !alphaAt(r, x + 1, y);
    if (abajo) addLight(r, x, y, luz, 0.7);
    else if (lado) addLight(r, x, y, luz, 0.35 * clamp01((y - (oy - 140 * k)) / (140 * k)));
  }
  // la sangre de las alas, encima de todo y sin la luz del piso (gotea hasta el hielo)
  sangreAlas(r, gotas, goteo, 1, oy + 1);
  void fbm; void hash;
  return r;
}

// ---------------------------------------------------------------- las alas (las mismas del Diablo del juego)

/**
 * Las alas del Diablo pintadas para las cinemáticas: las mismas del juego (Mundo 7, pedido de Sophie). Enormes y rotas,
 * rojo vino casi negro, con desgarrones; espinas en todo el borde de adelante (brazo del ala y primer dedo) y en cada
 * dedo; garras curvas en cada punta y una grande en el codo. La sangre (lo único con sangre del juego, y solo en las
 * alas) va aparte, en `sangreAlas`, para pintarla encima de lo que tape a las alas.
 */
export const ALA = {
  piel: ['#080204', '#120307', '#1e040a', '#2c060d', '#3c0911', '#4e0d16'].map(hex),
  hueso: ['#140806', '#24100c', '#3a1e16', '#5a3426'].map(hex),
  espina: ['#1c1412', '#3a2c26', '#6a5648', '#9a8270', '#c8b49c'].map(hex),
  sangre: ['#2a0004', '#4a0008', '#6a0610', '#8a0a12'].map(hex),
  brillo: hex('#b8404a'),
};

type P2 = [number, number];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const sub2 = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const nrm2 = (v: P2): P2 => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

/** Dónde cuelga la sangre: el punto y el tamaño (k). */
export interface Goteo { p: P2; k: number; h: number }

/** Los desgarrones del juego (WING_TEARS): qué tiras faltan en cada paño (de 0 a 6 a lo largo del borde). */
const DESGARRONES: number[][][] = [[[5], [2], [2, 3]], [[4], [3, 4], [1, 2]]];

/**
 * Un ala: `root` (la raíz en el hombro), `elbow` (el codo, arriba), `tips` (las cuatro puntas de los dedos, de la de
 * arriba a la de abajo), `side` (-1 izquierda, 1 derecha) y `k` la escala (1 = el panel de 480 x 270 de cerca).
 * `rotura` de 0 a 1: más agujeros, desgarrones nuevos y pedazos que se sueltan y caen hasta `piso` (si lo hay); con
 * `quiebre` (0 a 1) el segundo dedo se parte y su punta cae al piso. Devuelve dónde cuelga la sangre.
 */
export function alaDiablo(r: Raster, root: P2, elbow: P2, tips: P2[], side: number, k: number, semilla: number, rotura = 0, piso?: number, quiebre = 0): Goteo[] {
  const goteo: Goteo[] = [];
  const lado = side > 0 ? 1 : 0;
  const tt = tips.slice();
  // el dedo que se parte: queda el muñón y la punta cae
  let punta: { a: P2; b: P2 } | null = null;
  if (quiebre > 0) {
    const corte = lerp2(elbow, tips[1], 0.55);
    if (piso !== undefined) {
      const largo = Math.hypot(...sub2(tips[1], corte));
      const caida = Math.min(1, quiebre * 1.3);
      const a = lerp2(corte, [corte[0] + side * 10 * k, piso - 2 * k], caida);
      const b = lerp2(tips[1], [a[0] + side * largo * 0.95, piso], caida);
      punta = { a, b };
    }
    tt[1] = lerp2(tips[1], corte, Math.min(1, quiebre * 1.6));
  }
  const mc: P2 = [(tt[1][0] + tt[2][0] + elbow[0] * 2) / 4, (tt[1][1] + tt[2][1] + elbow[1] * 2) / 4];
  // ---- la piel: tres paños (raíz o codo hasta dos puntas), con el borde festoneado y los desgarrones
  for (let i = 0; i < 3; i++) {
    const a = i === 0 ? root : elbow, b = tt[i], c = tt[i + 1];
    const borde: P2[] = [];
    for (let q = 0; q <= 12; q++) { const t = q / 12, e = lerp2(b, c, t); borde.push(lerp2(a, e, 1 - Math.sin(t * Math.PI) * 0.26 - (hash(q, i, semilla) - 0.5) * 0.05)); }
    // los desgarrones: una cuña desde el borde hasta cerca del hueso (queda un pedacito de piel pegado)
    const tiras = [...DESGARRONES[lado][i]];
    for (let q = 0; q < 6; q++) if (hash(q, i + 10 * lado, semilla + 5) < rotura * 0.55 && !tiras.includes(q)) tiras.push(q);
    const cunas: P2[][] = tiras.map((q) => {
      const t0 = Math.max(0, q / 6 - 0.07), t1 = Math.min(1, q / 6 + 0.07), tm = q / 6;
      const e0 = borde[Math.round(t0 * 12)], e1 = borde[Math.round(t1 * 12)], em = borde[Math.round(tm * 12)];
      const fondo = lerp2(a, em, 0.42 - rotura * 0.12);
      goteo.push({ p: lerp2(fondo, em, 0.12), k, h: hash(q, i, 71 + lado) });
      return [e0, fondo, e1];
    });
    const dentro = (p: P2, t: P2[]) => {
      const [A, B, C] = t, d = (u: P2, v: P2, w: P2) => (u[0] - w[0]) * (v[1] - w[1]) - (v[0] - w[0]) * (u[1] - w[1]);
      const d1 = d(p, A, B), d2 = d(p, B, C), d3 = d(p, C, A);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    };
    fillPoly(r, [a, ...borde], (x, y) => {
      const j = (vnoise(x, y, 3 * k, semilla + 40 + i) - 0.5) * 3 * k; // los bordes de los desgarrones, deshilachados
      if (cunas.some((t) => dentro([x + j, y - j * 0.5], t))) return null;
      const n = vnoise(x, y, 7 * k, semilla + 31 + i);
      if (n < 0.1 + rotura * 0.22) return null; // agujeros
      // cuero: arrugas finas, más oscuro hacia el borde y una vena que baja por el medio del paño
      const dist = Math.hypot(x - a[0], y - a[1]) / Math.max(1, Math.hypot(...sub2(lerp2(b, c, 0.5), a)));
      const arruga = vnoise(x, y, 2.5 * k, semilla + 50) * 0.5 + vnoise(x, y, 6 * k, semilla + 51) * 0.5;
      let l = 0.68 - dist * 0.35 + (arruga - 0.5) * 0.5 + (n < 0.16 + rotura * 0.22 ? -0.25 : 0);
      l += (bayer(x & 3, y & 3) - 0.5) * 0.18;
      return ALA.piel[Math.max(0, Math.min(ALA.piel.length - 1, Math.floor(l * ALA.piel.length)))];
    });
    // el fondo de cada desgarrón: húmedo, rojo vino (solo cerca del hueso, donde se rompió)
    for (const [e0, f, e1] of cunas) for (const e of [e0, e1]) stroke(r, f, lerp2(f, e, 0.18), 0.8 * k, ALA.sangre[1], 0.4 * k);
  }
  // ---- los huesos: el brazo del ala (grueso) y los dedos (finos)
  const hueso = (t: number, d: number) => (d > 0.75 ? ALA.hueso[0] : d < 0.35 && t < 0.8 ? ALA.hueso[3] : t < 0.5 ? ALA.hueso[2] : ALA.hueso[1]);
  curva(r, [root, lerp2(root, elbow, 0.5), elbow], (t) => (3.4 - t * 1) * k, hueso);
  tt.forEach((t, i) => { if (i < 3) stroke(r, elbow, t, 1.9 * k, hueso, 0.7 * k); });
  if (quiebre > 0) { const c = tt[1]; ellipse(r, c[0], c[1], 1.4 * k, 1.4 * k, ALA.hueso[2]); setPx(r, c[0], c[1], ALA.espina[3]); goteo.push({ p: c, k, h: 0.37 }); }
  // ---- las espinas, para afuera de la piel
  const espina = (p: P2, dir: P2, largo: number, r0: number, sangra: boolean, s: number) => {
    const bd = nrm2(dir);
    let o: P2 = [-bd[1], bd[0]];
    if ((p[0] - mc[0]) * o[0] + (p[1] - mc[1]) * o[1] < 0) o = [-o[0], -o[1]];
    const tp: P2 = [p[0] + (o[0] * largo + bd[0] * largo * 0.35) * k, p[1] + (o[1] * largo + bd[1] * largo * 0.35) * k];
    const b0: P2 = [p[0] - bd[0] * r0 * k, p[1] - bd[1] * r0 * k], b1: P2 = [p[0] + bd[0] * r0 * k, p[1] + bd[1] * r0 * k];
    fillPoly(r, [b0, tp, b1], (x, y) => { const t = clamp01(Math.hypot(x - p[0], y - p[1]) / (largo * k)); return ALA.espina[Math.min(4, Math.floor(1 + t * 3 + (hash(x, y, s) - 0.5) * 0.6))]; });
    stroke(r, b0, tp, 0.5, ALA.espina[0]);
    if (sangra) goteo.push({ p: lerp2(p, tp, 0.5), k, h: hash(s, 3, 9) });
  };
  for (let q = 1; q <= 7; q++) { const t = q / 8; espina(lerp2(root, elbow, t), sub2(elbow, root), 7 - t * 2, 1.7, q % 3 === 1, semilla + q); }
  for (let q = 1; q <= 5; q++) { const t = q / 6; espina(lerp2(elbow, tt[0], t), sub2(tt[0], elbow), 6.2 - t * 2.4, 1.4, q % 2 === 0, semilla + 10 + q); }
  for (let i = 1; i < 3; i++) for (let q = 1; q <= 3; q++) { const t = q / 4; if (i === 1 && quiebre > 0 && t > 0.5) continue; espina(lerp2(elbow, tt[i], t), sub2(tt[i], elbow), 4, 1.1, q === 2, semilla + 20 + i * 4 + q); }
  // ---- las garras curvas: en la punta de cada dedo y una grande en el codo
  const garraAla = (p: P2, dir: P2, largo: number, r0: number) => {
    const bd = nrm2(dir);
    const c1: P2 = [p[0] + bd[0] * largo * 0.5 * k, p[1] + bd[1] * largo * 0.5 * k];
    const c2: P2 = [c1[0] + bd[0] * largo * 0.2 * k, c1[1] + (bd[1] * 0.2 + 0.6) * largo * k];
    curva(r, [p, c1, c2], (t) => r0 * k * (1 - t) + 0.4, (t, d) => (d > 0.7 ? ALA.espina[0] : d < 0.3 && t < 0.6 ? ALA.espina[4] : t < 0.5 ? ALA.espina[2] : ALA.espina[1]));
    goteo.push({ p: c1, k, h: hash(Math.round(p[0]), Math.round(p[1]), 12) });
  };
  for (let i = 0; i < 3; i++) if (!(i === 1 && quiebre > 0)) garraAla(tt[i], sub2(tt[i], elbow), 8, 1.5);
  garraAla(elbow, [sub2(elbow, root)[0], sub2(elbow, root)[1] - 6], 10, 2.1);
  // ---- el dedo partido, tirado en el piso
  if (punta) {
    stroke(r, punta.a, punta.b, 1.7 * k, hueso, 0.7 * k);
    garraAla(punta.b, sub2(punta.b, punta.a), 7, 1.3);
    goteo.push({ p: punta.a, k, h: 0.81 });
  }
  // ---- pedazos de piel que se sueltan y caen (al romperse)
  if (rotura > 0.25 && piso !== undefined) for (let q = 0; q < 7; q++) {
    const a = lerp2(lerp2(tt[1], tt[2], hash(q, 1, semilla + 90)), elbow, 0.2 + hash(q, 2, semilla + 90) * 0.4);
    const cae = clamp01((rotura - 0.25 - hash(q, 3, semilla + 90) * 0.3) / 0.45);
    if (cae <= 0) continue;
    const x = a[0] + side * cae * (6 + hash(q, 4, semilla + 90) * 14) * k, y = a[1] + (piso - a[1] - 2 * k) * cae * cae;
    const s = (2.5 + hash(q, 5, semilla + 90) * 3) * k, g = hash(q, 6, semilla + 90) * 6;
    fillPoly(r, [[x - s, y], [x + Math.cos(g) * s * 0.4, y - s * 0.8], [x + s, y + Math.sin(g) * s * 0.3], [x - s * 0.2, y + s * 0.6]], ALA.piel[2 + (q % 3)]);
  }
  return goteo;
}

/**
 * La sangre de las alas: un hilo oscuro que cuelga de cada punto (desgarrón, espina, garra), con la gota gorda al final
 * y otra que se suelta y cae despacio. `t` de 0 a 1 es la fase del goteo (una vuelta = una gota por hilo); `largo`
 * agranda los hilos; con `piso` las gotas que caen hasta ahí dejan una mancha chiquita.
 */
export function sangreAlas(r: Raster, gotas: Goteo[], t: number, largo = 1, piso?: number) {
  for (const g of gotas) {
    const k = g.k, L = (5 + g.h * 10) * k * largo;
    const ondula = Math.sin(g.h * 20) * 1.2 * k;
    const fin: P2 = [g.p[0] + ondula, g.p[1] + L];
    curva(r, [g.p, [g.p[0] + ondula * 0.3, g.p[1] + L * 0.5], fin], (u) => (1.1 - u * 0.4) * k, (u, d) => (d > 0.65 ? ALA.sangre[0] : mixc(ALA.sangre[1], ALA.sangre[2], u)));
    ellipse(r, fin[0], fin[1] + 0.5 * k, 1.1 * k, 1.5 * k, (_x, _y, d) => (d > 0.7 ? ALA.sangre[1] : d > 0.35 ? ALA.sangre[2] : ALA.sangre[3]));
    setPx(r, fin[0] - Math.max(1, 0.4 * k), fin[1], ALA.brillo, 150);
    // la gota que se suelta: estira el final del hilo, cae y (si llega al piso) mancha
    const ph = (t + g.h) % 1;
    const caida = (3 + ph * ph * 30) * k;
    const yg = fin[1] + caida;
    if (g.h > 0.45) continue; // no todos los hilos sueltan gota a la vez
    if (ph < 0.85 && (piso === undefined || yg < piso)) {
      ellipse(r, fin[0], yg, 0.8 * k, 1.2 * k, ALA.sangre[1]);
      setPx(r, fin[0], yg, ALA.sangre[2]);
    } else if (piso !== undefined && fin[1] < piso) {
      ellipse(r, fin[0], piso, 2.2 * k, 0.7 * k, ALA.sangre[1], 200);
    }
  }
}
