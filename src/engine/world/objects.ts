import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, type MatDef, type P } from '../loot/canvas';
import { glowMat, metalMat } from '../loot/materials';

/**
 * Objetos del mundo (vista de arriba tipo Stardew): árboles, rocas, cercas, cosas que se rompen, fogata, antorchas,
 * cueva, piedras de la arena del jefe, el portal y el aviso de ataque del jefe. Cada uno trae su tamaño, el punto de
 * apoyo (los pies, para ordenar por profundidad) y la caja que choca, en pixeles.
 */

export interface WorldObject {
  name: string;
  w: number;
  h: number;
  /** punto de apoyo en el sprite (x, y): se pone en la posición del mapa y ordena por profundidad */
  anchor: [number, number];
  /** caja sólida relativa al apoyo [x, y, w, h] (null = se puede atravesar) */
  solid: [number, number, number, number] | null;
  /** animaciones: nombre -> cuadros */
  anims: Record<string, { frames: Raster[]; fps: number; loop: boolean }>;
  /** cajas sólidas extra (por ejemplo las dos patas de un arco), relativas al apoyo */
  solids?: [number, number, number, number][];
  /** 'suelo' = se dibuja debajo de los personajes (puentes, piedras del vado, nenúfares). Si no, se ordena por y */
  layer?: 'suelo';
  /** luz que emite: color, radio en px, si parpadea, y altura de la luz sobre el apoyo (px hacia arriba) */
  light?: { color: string; radius: number; flicker?: boolean; pulse?: boolean; dy?: number };
}

const leaf = (hex: string): MatDef => ({ hex, kind: 'fur' });
const wood = (hex: string): MatDef => ({ hex, kind: 'wood' });
const stone = (hex: string): MatDef => ({ hex, kind: 'stone' });

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Lienzo de w x h pixeles en unidades donde 1 unidad = k pixeles (k = 2 para objetos de 64 de ancho). */
const canvas = (w: number, h: number, k = 2) => new IconCanvas(w, w / k, h);

// ---------- árboles y plantas ----------

/** Copa hecha de grupos de hojas: cada grupo es una nube con luz arriba a la izquierda. */
function canopy(c: IconCanvas, C: P, rx: number, ry: number, col: string, seed: number, n = 9) {
  const r = seeded(seed);
  c.ellipse(C, rx, ry, leaf(col), { bias: -1 });
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.62;
    const p: P = [C[0] + Math.cos(a) * rx * d, C[1] + Math.sin(a) * ry * d - 1];
    c.ellipse(p, rx * (0.32 + r() * 0.12), ry * (0.3 + r() * 0.12), leaf(col), { bias: p[1] < C[1] ? 1 : 0 });
  }
}

export function oakTree(variant = 0): WorldObject {
  const c = canvas(64, 80);
  const g = ['#4f8f34', '#5a9a3a', '#3f7f3a'][variant % 3];
  // tronco con raíces
  c.poly([[13, 39], [14, 27], [18, 27], [19, 39], [21.5, 40], [10.5, 40]], wood('#7a5232'));
  c.px1([15, 30], [15.6, 38], wood('#7a5232'), { tone: 1 }, true);
  canopy(c, [16, 17], 14.5, 13, g, 7 + variant, 11);
  // frutas en una de las variantes
  if (variant === 2) for (const [x, y] of [[10, 14], [20, 11], [22, 20], [12, 22]] as P[]) c.circle([x, y], 0.9, { hex: '#d8243e', kind: 'gem' });
  const fr = c.render({ shadow: [16, 39.5, 12, 3] });
  return { name: `arbol_roble_${variant}`, w: 64, h: 80, anchor: [32, 78], solid: [-8, -8, 16, 8], anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

export function pineTree(variant = 0): WorldObject {
  const c = canvas(48, 80, 1.5);
  const g = variant ? '#2f6a4a' : '#3a7a52';
  c.poly([[14.5, 52], [15, 44], [17, 44], [17.5, 52]], wood('#6a4428'));
  for (let i = 0; i < 4; i++) {
    const y = 10 + i * 8.5, w = 5 + i * 3.2;
    c.poly([[16, y - 7], [16 + w, y + 6], [16 + w * 0.4, y + 5], [16, y + 6.5], [16 - w * 0.4, y + 5], [16 - w, y + 6]], leaf(g), { bias: 1 - i * 0.5 });
  }
  if (variant) for (const [x, y] of [[12, 22], [20, 30], [10, 38]] as P[]) c.dot([x, y], { hex: '#f2f2ff', kind: 'cloth' }, { tone: 4 });
  const fr = c.render({ shadow: [16, 52.5, 9, 2.4] });
  return { name: `arbol_pino_${variant}`, w: 48, h: 80, anchor: [24, 78], solid: [-6, -6, 12, 6], anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

export function bush(berries = false): WorldObject {
  const c = canvas(32, 32, 1);
  canopy(c, [16, 19], 11, 8.5, '#4f8f34', berries ? 21 : 23, 7);
  if (berries) for (const [x, y] of [[10, 17], [17, 14], [22, 19], [14, 22], [20, 23]] as P[]) c.circle([x, y], 1.1, { hex: '#3a5ae0', kind: 'gem' });
  const fr = c.render({ shadow: [16, 27, 11, 2.5] });
  return { name: berries ? 'arbusto_moras' : 'arbusto', w: 32, h: 32, anchor: [16, 29], solid: [-9, -6, 18, 6], anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

export function rock(big = false): WorldObject {
  const c = big ? canvas(48, 40, 1.5) : canvas(32, 24, 1);
  const pts: P[] = big ? [[3, 22], [5, 12], [11, 6], [20, 5], [27, 10], [29, 20], [25, 24.5], [8, 25]] : [[4, 19], [6, 12], [13, 8], [21, 9], [27, 15], [26, 20], [8, 21]];
  c.poly(pts, stone('#8c8a94'));
  c.poly(big ? [[9, 12], [14, 8], [20, 8.5], [17, 13], [11, 15]] : [[9, 13], [14, 10], [19, 11], [15, 14]], stone('#8c8a94'), { bias: 1 });
  c.px1(big ? [17, 13] : [15, 14], big ? [22, 21] : [19, 19], stone('#8c8a94'), { tone: 1 }, true);
  if (big) c.ellipse([24, 21], 3, 1.6, leaf('#5a9a3a'));
  const fr = c.render({ shadow: big ? [16, 24.5, 13, 2.2] : [16, 20.5, 11, 1.8] });
  return { name: big ? 'roca_grande' : 'roca', w: c.size, h: c.h, anchor: big ? [24, 37] : [16, 21], solid: big ? [-18, -10, 36, 10] : [-10, -6, 20, 6], anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

export function stump(): WorldObject {
  const c = canvas(32, 32, 1);
  c.poly([[8, 18], [9, 12], [23, 12], [24, 18], [26, 22], [6, 22]], wood('#7a5232'));
  c.ellipse([16, 12], 7, 2.6, wood('#c09460'));
  c.ring([16, 12], 4.5, 1.6, 0.6, wood('#c09460'), { tone: 2 }, 0, 360);
  const fr = c.render({ shadow: [16, 22, 11, 2] });
  return { name: 'tocon', w: 32, h: 32, anchor: [16, 24], solid: [-8, -5, 16, 5], anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

export function logPile(): WorldObject {
  const c = canvas(48, 32, 1.5);
  for (const [x, y] of [[12, 15], [20, 15], [16, 9.6]] as P[]) {
    c.poly([[x - 4, y - 3], [x + 4, y - 3], [x + 4, y + 3], [x - 4, y + 3]], wood('#7a5232'));
    c.ellipse([x + 4, y], 1.6, 3, wood('#c09460'));
  }
  const fr = c.render({ shadow: [16, 19, 12, 1.6] });
  return { name: 'troncos', w: 48, h: 32, anchor: [24, 28], solid: [-14, -6, 28, 6], anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

export function mushrooms(): WorldObject {
  const c = canvas(32, 32, 1);
  for (const [x, y, s, col] of [[11, 22, 1, '#d8243e'], [19, 24, 1.3, '#d8243e'], [23, 19, 0.8, '#e8a040']] as [number, number, number, string][]) {
    c.poly([[x - 1.2 * s, y], [x + 1.2 * s, y], [x + 1 * s, y - 4 * s], [x - 1 * s, y - 4 * s]], { hex: '#f0e6d0', kind: 'cloth' });
    c.ellipse([x, y - 4.5 * s], 4 * s, 2.6 * s, { hex: col, kind: 'cloth' });
    c.dot([x - 1.5 * s, y - 5.4 * s], { hex: '#ffffff', kind: 'cloth' }, { tone: 4 }, true);
    c.dot([x + 1.2 * s, y - 4.6 * s], { hex: '#ffffff', kind: 'cloth' }, { tone: 4 }, true);
  }
  const fr = c.render();
  return { name: 'hongos', w: 32, h: 32, anchor: [16, 28], solid: null, anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

export function tallGrass(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(32, 32, 1);
    const sway = [0, 0.8, 1.2, 0.6][f];
    for (let i = 0; i < 9; i++) {
      const x = 7 + i * 2.2, h = 8 + ((i * 7) % 5);
      c.poly([[x - 0.9, 26], [x + 0.9, 26], [x + sway * (h / 10), 26 - h]], leaf(i % 2 ? '#5f9e3c' : '#4f8f34'), { bias: i % 3 === 0 ? 1 : 0 });
    }
    frames.push(c.render());
  }
  return { name: 'pasto_alto', w: 32, h: 32, anchor: [16, 27], solid: null, anims: { idle: { frames, fps: 4, loop: true } } };
}

export function fence(kind: 'h' | 'v' | 'post'): WorldObject {
  const c = canvas(32, 32, 1);
  const w = wood('#9a6a3e');
  if (kind === 'post' || kind === 'h') for (const x of kind === 'post' ? [16] : [4, 28]) { c.poly([[x - 1.6, 26], [x - 1.6, 13], [x, 11.6], [x + 1.6, 13], [x + 1.6, 26]], w); }
  if (kind === 'h') for (const y of [15, 21]) c.poly([[2, y], [30, y], [30, y + 2], [2, y + 2]], w, { bias: y < 18 ? 1 : 0 });
  if (kind === 'v') { c.poly([[14.4, 30], [14.4, 4], [17.6, 4], [17.6, 30]], w); c.poly([[13, 5], [19, 5], [19, 8], [13, 8]], w, { bias: 1 }); c.poly([[13, 18], [19, 18], [19, 21], [13, 21]], w, { bias: 1 }); }
  const fr = c.render({ shadow: [16, 26.5, kind === 'h' ? 14 : 3, 1.2] });
  return { name: `cerca_${kind}`, w: 32, h: 32, anchor: [16, 27], solid: kind === 'h' ? [-16, -4, 32, 4] : kind === 'v' ? [-3, -27, 6, 30] : [-3, -3, 6, 3], anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

export function signpost(): WorldObject {
  const c = canvas(32, 32, 1);
  c.poly([[15, 28], [15, 12], [17, 12], [17, 28]], wood('#7a5232'));
  c.poly([[6, 7], [24, 7], [27, 10.5], [24, 14], [6, 14]], wood('#c09460'));
  for (let x = 9; x < 22; x += 3) c.px1([x, 10.5], [x + 1.6, 10.5], wood('#5a3a22'), { tone: 1 });
  const fr = c.render({ shadow: [16, 28, 5, 1.2] });
  return { name: 'cartel', w: 32, h: 32, anchor: [16, 29], solid: [-3, -3, 6, 3], anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

// ---------- con animación ----------

export function campfire(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const c = canvas(32, 32, 1);
    for (const s of [-1, 1]) c.poly([[16 + s * 9, 25], [16 + s * 8, 22], [16 - s * 3, 26], [16 - s * 2, 28]], wood('#6a4428'));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.ellipse([16 + Math.cos(a) * 8.5, 26 + Math.sin(a) * 2.8], 1.8, 1.2, stone('#7a7880')); }
    const h = [9, 10.5, 9.5, 11, 9.2, 10.2][f];
    c.poly([[11.5, 24.5], [13 + (f % 2), 24 - h * 0.6], [15, 24 - h * 0.45], [16 + (f % 3) - 1, 24 - h], [18, 24 - h * 0.5], [19.5 - (f % 2), 24 - h * 0.7], [20.5, 24.5]], glowMat('#ff8a1e'), { tone: 3 });
    c.poly([[13.5, 24.5], [15, 24 - h * 0.45], [16.4, 24 - h * 0.62], [18.4, 24.5]], glowMat('#ffe08a'), { tone: 4 });
    const sparks: P[] = f % 2 ? [[14 + f, 10 - f * 0.4]] : [];
    frames.push(c.render({ sparkles: sparks, shadow: [16, 27, 10, 2] }));
  }
  return { name: 'fogata', w: 32, h: 32, anchor: [16, 28], solid: [-8, -4, 16, 4], anims: { idle: { frames, fps: 10, loop: true } }, light: { color: '#ffa040', radius: 120, flicker: true, dy: 8 } };
}

/**
 * Campamento de fogata (64 x 48): el punto de guardado. Fuego grande con troncos en pirámide, anillo de piedras,
 * un tronco para sentarse y brasas. Tiene que verse desde lejos al lado de árboles de 116 px.
 */
export function campfireCamp(): WorldObject {
  const frames: Raster[] = [];
  const rock = stone('#6a6874'), log = wood('#5a3a22'), seat = wood('#7a5232');
  for (let f = 0; f < 6; f++) {
    const c = canvas(64, 48);
    // tronco para sentarse (izquierda) y tocón con una olla (derecha)
    c.poly([[1.5, 18.6], [7.5, 17.2], [8.4, 19.6], [2.4, 21]], seat);
    c.ellipse([1.9, 19.8], 0.9, 1.2, wood('#c09460'), { bias: 1 });
    c.ellipse([28.6, 19], 2.4, 1.2, wood('#c09460'), { bias: 1 });
    c.poly([[26.2, 19], [31, 19], [31, 21.4], [26.2, 21.4]], seat);
    c.poly([[27.2, 17.8], [30, 17.8], [30.4, 15.6], [26.8, 15.6]], metalMat('#3a3a44'));
    // anillo de piedras: las de atrás primero
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      if (Math.sin(a) < 0) c.ellipse([16 + Math.cos(a) * 8.4, 19 + Math.sin(a) * 3], 1.5, 1.05, rock, { bias: 1 });
    }
    // brasas en el centro
    c.ellipse([16, 19.2], 6, 1.9, glowMat('#c83a12'), { tone: 2 });
    for (const [x, y] of [[13.2, 19.4], [18.6, 19.1], [15.6, 20.1]] as P[]) c.dot([x, y], glowMat('#ffb040'), { tone: 4 }, (f + Math.round(x)) % 2 === 0);
    // troncos en pirámide
    for (const [x0, x1] of [[10.4, 15.4], [21.6, 16.6], [12.8, 17.2], [19.4, 15]] as [number, number][]) c.line([x0, 20.2], [x1, 14.6], 1.3, log);
    // fuego: tres lenguas que respiran desfasadas
    const H = [11.5, 13, 12, 13.6, 11.8, 12.8][f];
    const t = (k: number) => Math.sin((f / 6) * Math.PI * 2 + k);
    c.poly([[10.6, 19.6], [11.6 + t(0) * 0.6, 19 - H * 0.55], [13.8, 19 - H * 0.42], [15.4 + t(1) * 0.8, 19 - H], [17.6, 19 - H * 0.5], [19.6 + t(2) * 0.6, 19 - H * 0.72], [20.8, 19 - H * 0.38], [21.4, 19.6]], glowMat('#ff7a1a'), { tone: 3 });
    c.poly([[12.6, 19.6], [14.2, 19 - H * 0.42], [16 + t(1) * 0.5, 19 - H * 0.7], [18.2, 19 - H * 0.36], [19.4, 19.6]], glowMat('#ffb040'), { tone: 4 });
    c.poly([[14.4, 19.6], [15.6, 19 - H * 0.3], [16.4 + t(3) * 0.3, 19 - H * 0.44], [17.6, 19.6]], glowMat('#fff0b0'), { tone: 4 });
    // anillo de piedras: las de adelante tapan la base del fuego
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      if (Math.sin(a) >= 0) c.ellipse([16 + Math.cos(a) * 8.4, 19 + Math.sin(a) * 3], 1.6, 1.15, rock, { bias: 1 });
    }
    const sparks: P[] = [[14 + f * 0.7, 6 - (f % 3)], [18.5 - f * 0.4, 4 + (f % 2) * 2]].filter((_, i) => (f + i) % 2 === 0) as P[];
    frames.push(c.render({ sparkles: sparks, shadow: [16, 21, 15, 2.4] }));
  }
  return { name: 'campamento_fogata', w: 64, h: 48, anchor: [32, 40], solid: [-14, -6, 28, 8], anims: { idle: { frames, fps: 10, loop: true } }, light: { color: '#ffa040', radius: 150, flicker: true, dy: 10 } };
}

export function torch(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(16, 48, 0.5);
    c.poly([[14.4, 92], [14.4, 34], [17.6, 34], [17.6, 92]], wood('#6a4428'));
    c.poly([[11, 34], [21, 34], [19, 28], [13, 28]], metalMat('#7d838c'));
    const h = [16, 19, 17, 20][f];
    c.poly([[11.5, 28], [13 + (f % 2) * 2, 28 - h * 0.6], [16, 28 - h], [19 - (f % 2) * 2, 28 - h * 0.55], [20.5, 28]], glowMat('#ff8a1e'), { tone: 3 });
    c.poly([[13.5, 28], [16, 28 - h * 0.6], [18.5, 28]], glowMat('#ffe08a'), { tone: 4 });
    frames.push(c.render({ shadow: [16, 92, 6, 2] }));
  }
  return { name: 'antorcha', w: 16, h: 48, anchor: [8, 46], solid: [-2, -2, 4, 2], anims: { idle: { frames, fps: 8, loop: true } }, light: { color: '#ff8a3a', radius: 90, flicker: true, dy: 40 } };
}

/** Cosas que se rompen al pegarles (como en Diablo): caja, barril y vasija, con su animación de romperse. */
export function breakable(kind: 'caja' | 'barril' | 'vasija'): WorldObject {
  const draw = (c: IconCanvas, broken: number) => {
    const r = seeded(kind.length * 17 + broken);
    if (kind === 'caja') {
      const w = wood('#a8743e');
      if (broken < 0.5) {
        c.poly([[7, 26], [7, 12], [25, 12], [25, 26]], w);
        c.poly([[7, 12], [11, 8], [29, 8], [25, 12]], w, { bias: 1 });
        c.poly([[25, 12], [29, 8], [29, 22], [25, 26]], w, { bias: -1 });
        c.px1([7, 12], [25, 26], w, { tone: 1 }, true); c.px1([25, 12], [7, 26], w, { tone: 1 }, true);
      }
    } else if (kind === 'barril') {
      const w = wood('#8a5a32');
      if (broken < 0.5) {
        c.ellipse([16, 18], 8, 9, w);
        c.ellipse([16, 9.6], 7, 2.4, wood('#a8743e'));
        for (const y of [12, 24]) c.ring([16, y], 8, 2.4, 0.9, metalMat('#5a5f68'), {}, 0, 180);
      }
    } else if (broken < 0.5) {
      c.ellipse([16, 19], 7.5, 7.5, { hex: '#b8643a', kind: 'stone' });
      c.poly([[13, 12], [19, 12], [20, 8], [12, 8]], { hex: '#b8643a', kind: 'stone' });
      c.ellipse([16, 8], 4, 1.4, { hex: '#5a2e1a', kind: 'stone' }, { tone: 1 });
      c.px1([10, 19], [22, 19], { hex: '#e8c070', kind: 'stone' }, { tone: 4 }, true);
    }
    if (broken > 0) {
      // pedazos que saltan y quedan en el piso
      const col = kind === 'vasija' ? { hex: '#b8643a', kind: 'stone' as const } : wood(kind === 'caja' ? '#a8743e' : '#8a5a32');
      for (let i = 0; i < 7; i++) {
        const a = r() * Math.PI * 2, d = 2 + broken * (6 + r() * 6);
        const p: P = [16 + Math.cos(a) * d, 22 + Math.sin(a) * d * 0.45 - (broken < 1 ? Math.sin(broken * Math.PI) * 6 * r() : 0)];
        c.poly([[p[0] - 1.6, p[1]], [p[0] + 1.2, p[1] - 1.2], [p[0] + 1.6, p[1] + 1], [p[0] - 0.6, p[1] + 1.4]], col);
      }
    }
  };
  const idle = canvas(32, 32, 1);
  draw(idle, 0);
  const frames = [0.3, 0.6, 0.85, 1, 1].map((b) => { const c = canvas(32, 32, 1); draw(c, b); return c.render({ shadow: b < 1 ? [16, 27, 9, 2] : null }); });
  return { name: kind, w: 32, h: 32, anchor: [16, 28], solid: [-8, -5, 16, 5], anims: { idle: { frames: [idle.render({ shadow: [16, 27, 9, 2] })], fps: 1, loop: true }, romper: { frames, fps: 14, loop: false } } };
}

// ---------- cueva, arena y portal ----------

export function cave(): WorldObject {
  const c = canvas(96, 80, 3);
  c.poly([[1, 26], [3, 14], [8, 6], [16, 3], [24, 6], [29, 14], [31, 26]], stone('#7a7480'));
  for (const [x, y, rx, ry] of [[7, 12, 5, 4], [16, 6, 6, 3.4], [25, 12, 5, 4], [4, 21, 3.4, 4], [28, 21, 3.4, 4]] as [number, number, number, number][]) c.ellipse([x, y], rx, ry, stone('#7a7480'), { bias: y < 10 ? 1 : 0 });
  c.poly([[9, 26], [10, 17], [13, 12.5], [19, 12.5], [22, 17], [23, 26]], stone('#141018'), { tone: 0 });
  c.poly([[11, 26], [11.6, 19], [14, 15], [18, 15], [20.4, 19], [21, 26]], stone('#0a080e'), { tone: 0 });
  for (const [x, y] of [[6, 24], [26, 24], [16, 3]] as P[]) c.ellipse([x, y], 2.6, 1.6, leaf('#4f8f34'));
  const fr = c.render({ shadow: [16, 26, 16, 1.6] });
  return { name: 'cueva', w: 96, h: 80, anchor: [48, 78], solid: [-46, -30, 92, 30], anims: { idle: { frames: [fr], fps: 1, loop: true } } };
}

/** Piedra parada de la arena del jefe; con runas que se encienden cuando empieza la pelea. */
export function standingStone(): WorldObject {
  const mk = (lit: number) => {
    const c = canvas(32, 64, 1);
    c.poly([[9, 58], [8, 20], [11, 9], [16, 6], [21, 9], [24, 20], [23, 58]], stone('#7a7480'));
    c.poly([[11, 20], [14, 10], [16, 9], [15, 24]], stone('#7a7480'), { bias: 1 });
    const g = lit ? glowMat('#ff5a3a') : stone('#4a4450');
    // runa en rombo con un trazo abajo (sin cruces: no son lápidas)
    for (const [a, b] of [[[16, 23], [20, 31]], [[20, 31], [16, 39]], [[16, 39], [12, 31]], [[12, 31], [16, 23]], [[16, 44], [16, 51]], [[13, 47], [16, 44]], [[19, 47], [16, 44]]] as [P, P][]) c.line(a, b, 1.2, g, { tone: lit ? 4 : 1 });
    c.dot([16, 31], g, { tone: lit ? 5 : 2 }, true);
    return c.render({ shadow: [16, 58, 10, 2.5], glowK: lit });
  };
  return {
    name: 'piedra_arena', w: 32, h: 64, anchor: [16, 60], solid: [-7, -5, 14, 5],
    anims: { idle: { frames: [mk(0)], fps: 1, loop: true }, encendida: { frames: [mk(0.6), mk(1), mk(0.8), mk(1)], fps: 6, loop: true } },
  };
}

/** Portal (ovalado, como el de Diablo): aparece, gira y se cierra. azul = salida, rojo = mundo del jefe. */
export function portal(color: 'azul' | 'rojo' = 'azul'): WorldObject {
  const pal = color === 'azul' ? ['#1a3a8a', '#2f62e6', '#6cb4ff', '#d8f0ff'] : ['#5a0a12', '#b8242c', '#ff6a3a', '#ffe0a0'];
  const frame = (open: number, t: number) => {
    const c = canvas(64, 96, 2);
    if (open <= 0) return c.render();
    const rx = 11 * open, ry = 19 * Math.min(1, open * 1.2);
    const C: P = [16, 26];
    c.ellipse(C, rx + 1.4, ry + 1.4, glowMat(pal[1]), { tone: 2 });
    c.ellipse(C, rx, ry, glowMat(pal[0]), { tone: 1 });
    // espiral: arcos que giran con t
    for (let k = 0; k < 4; k++) {
      const s = 1 - k * 0.22;
      const a0 = t * 70 + k * 55;
      c.ring(C, rx * s, ry * s, 1.2, glowMat(pal[k % 2 ? 2 : 1]), { tone: k % 2 ? 4 : 3 }, a0 % 360, (a0 + 150) % 360);
    }
    c.ellipse(C, rx * 0.28, ry * 0.28, glowMat(pal[3]), { tone: 5 });
    const sp: P[] = [];
    for (let i = 0; i < 3; i++) { const a = t * 1.3 + i * 2.1; sp.push([C[0] + Math.cos(a) * (rx + 3), C[1] + Math.sin(a) * (ry + 3)]); }
    return c.render({ sparkles: open >= 1 ? sp.slice(0, 1 + (Math.floor(t) % 3)) : [], aura: pal[2], auraK: open * 0.8, shadow: [16, 45, 9 * open, 1.8] });
  };
  const opening = [0.15, 0.35, 0.6, 0.85, 1, 1].map((o, i) => frame(o, i));
  const loop = Array.from({ length: 8 }, (_, i) => frame(1, i + 6));
  const closing = [1, 0.8, 0.55, 0.3, 0.1, 0].map((o, i) => frame(o, i + 14));
  return { name: `portal_${color}`, w: 64, h: 96, anchor: [32, 92], solid: null, anims: { abrir: { frames: opening, fps: 12, loop: false }, girar: { frames: loop, fps: 10, loop: true }, cerrar: { frames: closing, fps: 12, loop: false } }, light: { color: pal[2], radius: 140, pulse: true, dy: 40 } };
}

/** Aviso del ataque del jefe en el piso: un círculo que se llena (el jugador tiene tiempo de salir). */
export function telegraph(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const c = canvas(96, 48, 3);
    const fill = (f + 1) / 8;
    // rojo vivo (no marrón sobre el pasto): el fondo tenue y lo que se llena más fuerte
    c.ellipse([16, 8], 14, 6.6, glowMat('#ff2a2a'), { tone: 3 });
    c.ellipse([16, 8], 14 * fill, 6.6 * fill, glowMat('#ff3a2a'), { tone: 4 });
    c.ring([16, 8], 14, 6.6, 0.6, glowMat('#ffd0a0'), { tone: 5 }, 0, 360);
    frames.push(c.render({ noOutline: true, glowK: 0.4 }));
  }
  // semitransparente: es una marca en el piso
  for (const fr of frames) for (let i = 3; i < fr.data.length; i += 4) if (fr.data[i]) fr.data[i] = Math.min(fr.data[i], 170);
  return { name: 'aviso_jefe', w: 96, h: 48, anchor: [48, 24], solid: null, anims: { llenar: { frames, fps: 8, loop: false } } };
}

/**
 * Aviso de la carga del minotauro: un tramo de 32 x 48 que se repite a lo largo de la línea por donde va a correr
 * (apoyo en el borde izquierdo, al medio: se gira hacia donde carga). La franja se llena de rojo desde el centro y
 * las flechas corren hacia adelante. Los tramos pegan entre sí sin costura.
 */
export function chargeWarning(): WorldObject {
  const frames: Raster[] = [];
  const W = 32, H = 48, top = 12, bot = 35, mid = (top + bot) / 2;
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H);
    const put = (x: number, y: number, c: [number, number, number], a: number) => { const i = (y * W + x) * 4; r.data.set([...c, a], i); };
    const fill = (f + 1) / 8;
    for (let y = top; y <= bot; y++) for (let x = 0; x < W; x++) {
      const inner = Math.abs(y - mid) <= (bot - top) / 2 * fill;
      put(x, y, inner ? [255, 58, 42] : [190, 30, 30], inner ? 150 : 70);
    }
    // bordes claros arriba y abajo
    for (let x = 0; x < W; x++) { put(x, top, [255, 208, 160], 190); put(x, bot, [255, 208, 160], 190); }
    // flechas ">" que avanzan 2 px por cuadro (cada 16 px: pega sin costura con el tramo siguiente)
    for (let k = 0; k < 2; k++) {
      const x0 = (k * 16 + f * 2) % W;
      for (let d = 0; d <= 6; d++) for (const t of [0, 1]) {
        const x = (x0 + d + t) % W;
        put(x, Math.round(mid) - 6 + d, [255, 236, 200], 210);
        put(x, Math.round(mid) + 6 - d, [255, 236, 200], 210);
      }
    }
    frames.push(r);
  }
  return { name: 'aviso_carga', w: W, h: H, anchor: [0, 24], solid: null, layer: 'suelo', anims: { llenar: { frames, fps: 8, loop: false } } };
}

/** Todos los objetos del bosque. */
export function forestObjects(): WorldObject[] {
  return [
    oakTree(0), oakTree(1), oakTree(2), pineTree(0), pineTree(1), bush(false), bush(true), rock(false), rock(true), stump(), logPile(), mushrooms(), tallGrass(),
    fence('h'), fence('v'), fence('post'), signpost(), campfire(), campfireCamp(), chargeWarning(), torch(), breakable('caja'), breakable('barril'), breakable('vasija'), cave(), standingStone(),
    portal('azul'), portal('rojo'), telegraph(),
  ];
}
