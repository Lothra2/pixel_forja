import { createRaster, blit, type Raster } from '../core/raster';
import { Pix } from '../fx/pix';
import { packAtlas, type TexturePackerHash } from '../export/atlas';

/**
 * Comida que cae en la pelea y cura al que la come (lote P1): arepa, tequeño, empanada, bánh mì y pan de bono. Cada una
 * en una celda de 16 x 16, legible a ese tamaño, con contorno, su sombra en el piso y un humito de 4 cuadros. La base
 * (el centro de abajo, donde va la sombra) queda en el pivote (8, 14), como un personaje: el juego la pone en el piso
 * sin hacer cuentas.
 */

export const COMIDAS = ['arepa', 'tequeno', 'empanada', 'banh_mi', 'pan_de_bono'] as const;
export type Comida = (typeof COMIDAS)[number];
export const COMIDA_CELDA = 16;
export const COMIDA_PIVOTE: [number, number] = [8, 14];

/** Nombre, cuánto cura (de 1 a 3, el juego lo traduce a vida) y para qué sirve. */
export const COMIDA_INFO: Record<Comida, { nombre: { es: string; en: string }; cura: number; uso: string }> = {
  arepa: { nombre: { es: 'Arepa', en: 'Arepa' }, cura: 3, uso: 'La reina pepiada. Cura mucho.' },
  tequeno: { nombre: { es: 'Tequeño', en: 'Tequeño' }, cura: 1, uso: 'Dos tequeños. Cura poquito y rápido.' },
  empanada: { nombre: { es: 'Empanada', en: 'Empanada' }, cura: 2, uso: 'Empanada de maíz. Cura la mitad.' },
  banh_mi: { nombre: { es: 'Bánh mì', en: 'Bánh mì' }, cura: 3, uso: 'El pan de Saigón. Cura mucho.' },
  pan_de_bono: { nombre: { es: 'Pan de bono', en: 'Pan de bono' }, cura: 1, uso: 'Tres bolitas de queso. Cura poquito.' },
};

const BORDE = '#3a2414';

/** Contorno de 1 px alrededor de lo pintado. */
function contorno(p: Pix) {
  const marcar: [number, number][] = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (p.has(x, y)) continue;
    if (p.has(x - 1, y) || p.has(x + 1, y) || p.has(x, y - 1) || p.has(x, y + 1)) marcar.push([x, y]);
  }
  for (const [x, y] of marcar) p.px(x, y, BORDE);
}

/** Óvalo relleno (rx, ry). */
function ovalo(p: Pix, cx: number, cy: number, rx: number, ry: number, c: (x: number, y: number) => string | null) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
    const col = c(x, y);
    if (col) p.px(x, y, col);
  }
}

const DIBUJO: Record<Comida, (p: Pix) => void> = {
  // la arepa abierta: tapa dorada con manchas de budare, la reina pepiada (pollo y aguacate) asomando y el borde tostado
  arepa: (p) => {
    // el disco gordo: la tapa con las manchas del budare y el canto con el relleno saliendo por la abertura
    ovalo(p, 7.5, 10, 6.5, 4, (_x, y) => (y >= 12.5 ? '#b07a2a' : y >= 11 ? '#d9a441' : y <= 7.5 ? '#f6dc8a' : '#f2c96a'));
    for (const [x, y] of [[4, 8], [9, 7], [11, 9], [6, 9], [8, 10], [3, 10]]) p.px(x, y, '#8a5418');
    for (let x = 2; x < 14; x++) p.px(x, 12, x % 3 === 0 ? '#5f9e3a' : x % 3 === 1 ? '#f4efe0' : '#e0c070');
    p.px(14, 12, '#f4efe0'); p.px(1, 12, '#7ab84a');
    p.px(5, 7, '#fffbe6'); p.px(6, 7, '#fffbe6');
  },
  // dos tequeños: palitos de masa frita enrollada, con el queso blanco saliendo de la punta
  tequeno: (p) => {
    const palito = (y0: number, x0: number) => {
      for (let x = x0; x < x0 + 11; x++) for (let y = y0; y < y0 + 3; y++) p.px(x, y, y === y0 ? '#f2c96a' : (x + y) % 3 === 0 ? '#b07a2a' : '#d9a441');
      p.px(x0 + 11, y0 + 1, '#f4efe0'); p.px(x0 + 12, y0 + 1, '#f4efe0'); p.px(x0 + 11, y0 + 2, '#e8e0c8');
    };
    palito(7, 3); palito(11, 1);
  },
  // empanada venezolana de maíz: media luna anaranjada y frita, con el borde marcado con el tenedor y burbujitas
  empanada: (p) => {
    ovalo(p, 7.5, 13, 6.5, 6, (_x, y) => (y > 13 ? null : y <= 8 ? '#f6b45a' : '#e8943c'));
    for (let a = 0.15; a < Math.PI - 0.1; a += 0.32) p.px(Math.round(7.5 + Math.cos(a) * 5.4), Math.round(13 - Math.sin(a) * 5), '#b8641c');
    for (const [x, y] of [[5, 10], [9, 9], [10, 11], [7, 12]]) p.px(x, y, '#ffd28a');
    for (let x = 2; x < 14; x++) p.px(x, 13, '#c87428');
  },
  // bánh mì: la baguette con la corteza rayada, abierta arriba con cilantro, ají, cerdo y zanahoria
  banh_mi: (p) => {
    for (let x = 1; x < 15; x++) for (let y = 9; y < 13; y++) {
      const borde = x === 1 || x === 14;
      if (borde && (y === 9 || y === 12)) continue;
      p.px(x, y, y === 9 ? '#f2b860' : y === 12 ? '#a86a28' : (x + 1) % 4 === 0 && y === 10 ? '#c8843a' : '#e0a050');
    }
    // el relleno asomando por la abertura de arriba
    for (let x = 3; x < 13; x++) p.px(x, 8, x % 4 === 0 ? '#e86a8a' : x % 4 === 1 ? '#ff9a3c' : x % 4 === 2 ? '#f4efe0' : '#e8b0a0');
    for (const [x, y] of [[4, 7], [5, 6], [8, 7], [9, 6], [11, 7]]) p.px(x, y, '#4caf50');
    p.px(10, 7, '#d23c3c'); p.px(6, 7, '#2f8a3a');
  },
  // pan de bono: tres bolitas de queso doradas, dos abajo y una arriba, con su brillo
  pan_de_bono: (p) => {
    // cada bolita lleva su raya oscura abajo, así las tres se separan y no se vuelven un pan solo
    const bola = (cx: number, cy: number) => {
      ovalo(p, cx, cy, 3.4, 3, (x, y) => ((((x - cx) / 3.4) ** 2 + ((y - cy) / 3) ** 2 > 0.62 && y > cy) ? '#9a6420' : y >= cy + 1.2 ? '#c58a3a' : y <= cy - 1.2 ? '#f6dc8a' : '#e8b85a'));
      p.px(Math.round(cx - 1), Math.round(cy - 1), '#fffbe6');
    };
    bola(4.5, 11); bola(10.5, 11);
    for (let y = 10; y <= 13; y++) p.px(y < 12 ? 8 : 7, y, '#9a6420'), p.px(8, y, '#9a6420');
    bola(7.5, 7.5);
  },
};

/** La sombra en el piso: un óvalo oscuro y medio transparente debajo, centrado en el pivote. */
function sombra(r: Raster) {
  const [cx, cy] = COMIDA_PIVOTE;
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = 0; x < r.w; x++) {
    if (((x + 0.5 - cx) / 6.5) ** 2 + ((y - cy) / 1.2) ** 2 > 1) continue;
    const i = (y * r.w + x) * 4;
    if (r.data[i + 3]) continue;
    r.data[i] = 20; r.data[i + 1] = 12; r.data[i + 2] = 16; r.data[i + 3] = 110;
  }
}

/** El humito: tres hilos que suben ondulando desde arriba de la comida. `k` de 0 a 3. */
function humito(p: Pix, k: number) {
  for (let h = 0; h < 3; h++) {
    const x0 = 4 + h * 4, fase = k + h * 1.3;
    for (let j = 0; j < 5; j++) {
      const y = 6 - j - ((k + h) % 2), x = x0 + Math.round(Math.sin((j + fase) * 1.4));
      if (y < 0) continue;
      p.px(x, y, j < 2 ? '#ffffff' : '#d8d8e2');
    }
  }
}

/** Un cuadro de la comida: 0 quieta, 1 a 4 con el humito. */
export function comidaSprite(id: Comida, cuadro = 0): Raster {
  const p = new Pix(COMIDA_CELDA, COMIDA_CELDA);
  DIBUJO[id](p);
  contorno(p);
  if (cuadro > 0) humito(p, cuadro - 1);
  const r = p.r;
  sombra(r);
  return r;
}

/** La hoja de la comida: una fila por comida, la columna 0 quieta y las 1 a 4 con el humito. */
export function comidaHoja(ids: readonly Comida[] = COMIDAS): { png: Raster; filas: Record<string, number> } {
  const png = createRaster(COMIDA_CELDA * 5, COMIDA_CELDA * ids.length), filas: Record<string, number> = {};
  ids.forEach((id, row) => {
    filas[id] = row;
    for (let k = 0; k < 5; k++) blit(png, comidaSprite(id, k), k * COMIDA_CELDA, row * COMIDA_CELDA);
  });
  return { png, filas };
}

/** La entrada de una comida en `objetos` del manifiesto, al lado de las armas: `peso: 'comida'` y lo que cura. */
export interface ComidaEntry {
  atlas: string; w: number; h: number; agarre: [number, number]; peso: 'comida'; rota: false; cura: number; uso: string;
  nombre: { es: string; en: string }; anims: Record<string, number>;
}

/**
 * Atlas de la comida (JSON Hash de TexturePacker, como el de las armas) y la entrada de cada una. Cuadros
 * `<id>_quieto_0` y `<id>_humito_0..3`, en celdas de 16 con la base en el pivote (8, 14).
 */
export function buildComidaAtlas(image = 'comida.png', ids: readonly Comida[] = COMIDAS): { png: Raster; json: TexturePackerHash; objetos: Record<string, ComidaEntry> } {
  const frames: { name: string; raster: Raster }[] = [];
  const objetos: Record<string, ComidaEntry> = {};
  for (const id of ids) {
    frames.push({ name: `${id}_quieto_0`, raster: comidaSprite(id, 0) });
    for (let k = 0; k < 4; k++) frames.push({ name: `${id}_humito_${k}`, raster: comidaSprite(id, k + 1) });
    // medida de la comida sin la sombra ni el humito
    const q = new Pix(COMIDA_CELDA, COMIDA_CELDA);
    DIBUJO[id](q); contorno(q);
    let x0 = COMIDA_CELDA, x1 = -1, y0 = COMIDA_CELDA, y1 = -1;
    for (let y = 0; y < COMIDA_CELDA; y++) for (let x = 0; x < COMIDA_CELDA; x++) if (q.has(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const { nombre, cura, uso } = COMIDA_INFO[id];
    objetos[id] = {
      atlas: image.replace(/\.png$/, '.json'), w: x1 - x0 + 1, h: y1 - y0 + 1, agarre: [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)],
      peso: 'comida', rota: false, cura, uso, nombre, anims: { quieto: 1, humito: 4 },
    };
  }
  const { png, json } = packAtlas(frames, COMIDA_CELDA, image, COMIDA_PIVOTE);
  return { png, json, objetos };
}
