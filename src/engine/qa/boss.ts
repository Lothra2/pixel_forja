import type { Raster } from '../core/raster';

/**
 * Control de calidad de los jefes grandes (96, 128 y 192):
 * - cabe: nada se sale de la celda en ninguna dirección ni cuadro, y nada toca el borde (señal de que se cortó);
 * - pies en el pivote: en reposo, el centro de los pies cae cerca del pivote;
 * - contorno de 1 pixel: el borde nunca es de 2 pixeles del mismo color oscuro;
 * - sin escalado: no hay columnas o filas repetidas ni bloques de 2x2 o 3x3 del mismo color en todo el cuerpo, que
 *   delatan un sprite chico agrandado;
 * - silueta: reducida al 50 % sigue teniendo forma (cuernos, brazos, arma que sobresalen), no es una mancha.
 */

export interface BossQAItem { check: 'cabe' | 'borde' | 'pies' | 'contorno' | 'escalado' | 'silueta'; ok: boolean; value: string; where?: string }

const op = (r: Raster, x: number, y: number) => x >= 0 && y >= 0 && x < r.w && y < r.h && r.data[(y * r.w + x) * 4 + 3] > 0;
const px = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return (r.data[i] << 16) | (r.data[i + 1] << 8) | r.data[i + 2]; };

/** Pixeles opacos en el borde de la celda. */
export function edgePixels(r: Raster): number {
  let n = 0;
  for (let x = 0; x < r.w; x++) { if (op(r, x, 0)) n++; if (op(r, x, r.h - 1)) n++; }
  for (let y = 1; y < r.h - 1; y++) { if (op(r, 0, y)) n++; if (op(r, r.w - 1, y)) n++; }
  return n;
}

/**
 * Bordes gruesos: de cada paso de vacío a lleno (en las 4 direcciones), cuántas veces el segundo pixel repite el color
 * del primero. Un contorno de 1 px casi nunca lo repite; uno de 2 px, siempre.
 */
export function thickOutline(r: Raster): number {
  let edges = 0, thick = 0;
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      if (op(r, x, y)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x1 = x + dx, y1 = y + dy, x2 = x + 2 * dx, y2 = y + 2 * dy;
        if (!op(r, x1, y1) || !op(r, x2, y2)) continue;
        // con 3 de grosor como mínimo (si no, es una punta de 1 o 2 px y no cuenta)
        if (!op(r, x + 3 * dx, y + 3 * dy)) continue;
        // en las diagonales el contorno hace escalera y el vecino también es contorno: eso no es grosor. Cuenta solo
        // si el segundo pixel ya es de adentro (no toca el vacío) y repite el color del contorno
        const inside = op(r, x2 + 1, y2) && op(r, x2 - 1, y2) && op(r, x2, y2 + 1) && op(r, x2, y2 - 1);
        if (!inside) continue;
        edges++;
        if (px(r, x1, y1) === px(r, x2, y2)) thick++;
      }
    }
  return edges ? thick / edges : 0;
}

/**
 * Señal de escalado: proporción de columnas (y filas) vecinas idénticas dentro del cuerpo, y de bloques de 2x2 y
 * 3x3 alineados de un solo color. Agrandar x1.5 repite una de cada tres columnas; x2, una de cada dos.
 */
export function scaleSignal(r: Raster): { dupCols: number; dupRows: number; block2: number; block3: number } {
  const dup = (horizontal: boolean) => {
    const A = horizontal ? r.w : r.h, B = horizontal ? r.h : r.w;
    let pairs = 0, same = 0;
    for (let a = 0; a < A - 1; a++) {
      let filled = 0, eq = true;
      for (let b = 0; b < B; b++) {
        const [x0, y0, x1, y1] = horizontal ? [a, b, a + 1, b] : [b, a, b, a + 1];
        const o0 = op(r, x0, y0), o1 = op(r, x1, y1);
        if (o0 || o1) filled++;
        if (o0 !== o1 || (o0 && px(r, x0, y0) !== px(r, x1, y1))) { eq = false; }
      }
      if (filled < 6) continue;
      pairs++;
      if (eq) same++;
    }
    return pairs ? same / pairs : 0;
  };
  const blocks = (k: number) => {
    let best = 0;
    for (let oy = 0; oy < k; oy++)
      for (let ox = 0; ox < k; ox++) {
        let n = 0, uni = 0;
        for (let y = oy; y + k <= r.h; y += k)
          for (let x = ox; x + k <= r.w; x += k) {
            let all = true, c = -1, full = true;
            for (let j = 0; j < k && full; j++) for (let i = 0; i < k; i++) {
              if (!op(r, x + i, y + j)) { full = false; break; }
              const v = px(r, x + i, y + j);
              if (c < 0) c = v; else if (v !== c) all = false;
            }
            if (!full) continue;
            n++;
            if (all) uni++;
          }
        if (n > 20) best = Math.max(best, uni / n);
      }
    return best;
  };
  return { dupCols: dup(true), dupRows: dup(false), block2: blocks(2), block3: blocks(3) };
}

/** Solidez de la silueta reducida al 50 %: área sobre el área de su envoltura convexa (1 = mancha, menos = forma). */
export function silhouetteSolidity(r: Raster): number {
  const w = Math.floor(r.w / 2), h = Math.floor(r.h / 2);
  const pts: [number, number][] = [];
  let area = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c = 0;
      for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (op(r, x * 2 + i, y * 2 + j)) c++;
      if (c >= 2) { area++; pts.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]); }
    }
  if (!area) return 1;
  // envoltura convexa (cadena monótona)
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: number[][] = [], upper: number[][] = [];
  for (const p of pts) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  let ha = 0;
  for (let i = 0; i < hull.length; i++) { const a = hull[i], b = hull[(i + 1) % hull.length]; ha += a[0] * b[1] - b[0] * a[1]; }
  return area / Math.max(1, Math.abs(ha) / 2);
}

/** Centro de los pies: promedio x de las 6 filas más bajas del dibujo. */
export function feetCenter(r: Raster): { x: number; bottom: number } | null {
  let bottom = -1;
  for (let y = r.h - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < r.w; x++) if (op(r, x, y)) { bottom = y; break; }
  if (bottom < 0) return null;
  let sx = 0, n = 0;
  for (let y = Math.max(0, bottom - 5); y <= bottom; y++) for (let x = 0; x < r.w; x++) if (op(r, x, y)) { sx += x; n++; }
  return { x: sx / n, bottom };
}

/**
 * Control de un jefe: frames[dirección][cuadro] por animación, con el pivote de la hoja. `rest` es la animación de
 * reposo (para medir los pies).
 */
export function bossQA(anims: { name: string; frames: Raster[][]; overflow: number; feet?: [number, number][] }[], pivot: [number, number], rest = 'idle'): BossQAItem[] {
  const items: BossQAItem[] = [];
  const over = anims.filter((a) => a.overflow > 0);
  items.push({ check: 'cabe', ok: !over.length, value: over.length ? over.map((a) => `${a.name}: ${a.overflow} px`).join(', ') : 'todo adentro' });
  const edged: string[] = [];
  let worstThick = 0, worstAt = '';
  let sig = { dupCols: 0, dupRows: 0, block2: 0, block3: 0 }, sigAt = '';
  let solid = 0, solidAt = '';
  for (const a of anims)
    a.frames.forEach((row, d) => row.forEach((fr, f) => {
      if (edgePixels(fr)) edged.push(`${a.name} d${d} c${f}`);
      const t = thickOutline(fr);
      if (t > worstThick) { worstThick = t; worstAt = `${a.name} d${d} c${f}`; }
      // la señal de escalado y la silueta se miden en el primer cuadro de cada dirección (alcanza y es rápido)
      if (f === 0) {
        const s = scaleSignal(fr);
        if (Math.max(s.dupCols, s.dupRows, s.block2, s.block3) > Math.max(sig.dupCols, sig.dupRows, sig.block2, sig.block3)) { sig = s; sigAt = `${a.name} d${d}`; }
        const so = silhouetteSolidity(fr);
        if (so > solid) { solid = so; solidAt = `${a.name} d${d}`; }
      }
    }));
  items.push({ check: 'borde', ok: !edged.length, value: edged.length ? `${edged.length} cuadros tocan el borde` : 'ninguno toca el borde', where: edged.slice(0, 4).join(', ') });
  const r2 = (v: number) => Math.round(v * 100) / 100;
  items.push({ check: 'contorno', ok: worstThick <= 0.06, value: `${r2(worstThick * 100)} % de borde doble (máx 6 %)`, where: worstAt });
  // calibrado: el minotauro viejo (de 64 agrandado x1.5) da 43 a 51 % de bloques 2x2 y 24 a 29 % de 3x3; uno nativo, menos de 30 y 10
  const scaled = sig.dupCols > 0.2 || sig.dupRows > 0.2 || sig.block2 > 0.38 || sig.block3 > 0.18;
  items.push({ check: 'escalado', ok: !scaled, value: `columnas repetidas ${r2(sig.dupCols * 100)} %, filas ${r2(sig.dupRows * 100)} %, bloques 2x2 ${r2(sig.block2 * 100)} %, 3x3 ${r2(sig.block3 * 100)} %`, where: sigAt });
  items.push({ check: 'silueta', ok: solid < 0.9, value: `solidez al 50 % ${r2(solid)} (una mancha da más de 0.9)`, where: solidAt });
  const r = anims.find((a) => a.name === rest);
  if (r?.feet) {
    // los pies (el medio de los tobillos, en el piso) tienen que caer en el pivote en todas las direcciones
    const w = r.frames[0]?.[0]?.w ?? 128;
    const bad = r.feet.map((f, d) => (Math.abs(f[0]) > w * 0.08 || Math.abs(f[1]) > w * 0.08 ? `d${d}: ${f.join(',')}` : '')).filter(Boolean);
    items.push({ check: 'pies', ok: !bad.length, value: bad.length ? `lejos del pivote: ${bad.join('; ')}` : `los pies caen en el pivote ${pivot.join(',')} (a menos de ${Math.round(w * 0.08)} px en las 8 direcciones)` });
  }
  return items;
}
