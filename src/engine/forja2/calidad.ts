import type { Raster } from '../core/raster';
import { hexToLab } from '../color/oklab';
import type { Cuadro } from './movimiento';
import type { CuadroPintado } from './figura';
import type { Lado } from './esqueleto';

/**
 * Control de calidad de Forja 2, con números, por movimiento. Cada medida tiene su tope; `ok` dice si pasa.
 *
 * - pivote: la planta del pie toca la fila del piso en todos los cuadros (0 px de diferencia): el contorno de la planta
 *   cae en la fila del pivote.
 * - patina: el pie de apoyo (el que no se levanta) no se corre más de 1 px.
 * - altura: en los bucles, la coronilla sube y baja a lo sumo ±1 px.
 * - silueta: el borde de la figura se distingue de un fondo gris neutro (diferencia de luminancia ≥ 0,25).
 * - sueltos: pixeles sin ningún vecino dibujado (0).
 * - salto: cuánto cambia la silueta entre dos cuadros seguidos (pixeles que aparecen o desaparecen sobre la unión de
 *   las dos siluetas); tope 0,6. El sombreado que cambia no cuenta: lo que se nota como salto es la forma.
 * - cajas: la caja que pega está sobre el miembro que pega (al menos la mitad de la caja es figura).
 * - paleta: colores fuera de la paleta fija (rampas, contornos, la cabeza y la estela): 0.
 */
export interface Medida { nombre: string; valor: number; tope: string; ok: boolean }
export interface Informe { movimiento: string; estilo: string; cuadros: number; medidas: Medida[]; ok: boolean }

const opaco = (r: Raster, x: number, y: number) => x >= 0 && y >= 0 && x < r.w && y < r.h && r.data[(y * r.w + x) * 4 + 3] > 0;

export function controlar(nombre: string, estilo: string, cuadros: Cuadro[], pintados: CuadroPintado[], pivot: [number, number], paleta: Set<string>, cajasPega: ([number, number, number, number] | null)[] = [], bucle = false): Informe {
  const med: Medida[] = [];
  const R = pintados.map((p) => p.raster);

  // pivote: la fila más baja dibujada es la del pivote (ahí cae el contorno de la planta)
  const pisos = R.map((r) => { for (let y = r.h - 1; y >= 0; y--) for (let x = 0; x < r.w; x++) if (opaco(r, x, y)) return y; return -1; });
  const desv = Math.max(...pisos.map((y) => Math.abs(y - pivot[1])));
  med.push({ nombre: 'pivote', valor: desv, tope: '0 px', ok: desv === 0 });

  // patina: los pies que en la pose están en el piso y no se movieron desde el primer cuadro
  let patina = 0;
  for (const l of ['cerca', 'lejos'] as Lado[]) {
    const apoyo = cuadros.every((q) => q.pose.pies[l].alto <= 0.001 && q.pose.pies[l].x === cuadros[0].pose.pies[l].x);
    if (!apoyo) continue;
    const xs = pintados.map((p) => Math.round(p.j.tobillo[l][0]));
    patina = Math.max(patina, Math.max(...xs) - Math.min(...xs));
  }
  med.push({ nombre: 'patina', valor: patina, tope: '≤ 1 px', ok: patina <= 1 });

  // altura en los bucles
  if (bucle) {
    const tops = R.map((r) => { for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (opaco(r, x, y)) return y; return r.h; });
    const amp = Math.max(...tops) - Math.min(...tops);
    med.push({ nombre: 'altura', valor: amp, tope: '≤ 2 px (±1)', ok: amp <= 2 });
  }

  // silueta contra un gris neutro
  const fondo = hexToLab('#808080')[0];
  let bordes = 0, buenos = 0;
  for (const r of R)
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < r.w; x++) {
        if (!opaco(r, x, y)) continue;
        if (opaco(r, x - 1, y) && opaco(r, x + 1, y) && opaco(r, x, y - 1) && opaco(r, x, y + 1)) continue;
        bordes++;
        const i = (y * r.w + x) * 4;
        if (Math.abs(hexToLab(hex(r.data[i], r.data[i + 1], r.data[i + 2]))[0] - fondo) >= 0.25) buenos++;
      }
  const sil = bordes ? buenos / bordes : 1;
  med.push({ nombre: 'silueta', valor: round(sil), tope: '≥ 0,95', ok: sil >= 0.95 });

  // sueltos
  let sueltos = 0;
  for (const r of R)
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < r.w; x++)
        if (opaco(r, x, y) && !opaco(r, x - 1, y) && !opaco(r, x + 1, y) && !opaco(r, x, y - 1) && !opaco(r, x, y + 1)) sueltos++;
  med.push({ nombre: 'sueltos', valor: sueltos, tope: '0', ok: sueltos === 0 });

  // salto entre cuadros seguidos
  let salto = 0;
  for (let k = 1; k < R.length + (bucle ? 1 : 0); k++) {
    const a = R[k - 1], b = R[k % R.length];
    let cambia = 0, union = 0;
    for (let i = 0; i < a.w * a.h; i++) {
      const oa = a.data[i * 4 + 3] > 0, ob = b.data[i * 4 + 3] > 0;
      if (!oa && !ob) continue;
      union++;
      if (oa !== ob) cambia++;
    }
    salto = Math.max(salto, union ? cambia / union : 0);
  }
  med.push({ nombre: 'salto', valor: round(salto), tope: '≤ 0,6', ok: salto <= 0.6 });

  // cajas que pegan: sobre la figura
  let peor = 1;
  cajasPega.forEach((c, k) => {
    if (!c) return;
    const r = R[k];
    let n = 0, dentro = 0;
    for (let y = c[1]; y < c[1] + c[3]; y++) for (let x = c[0]; x < c[0] + c[2]; x++) { n++; if (opaco(r, x + pivot[0], y + pivot[1])) dentro++; }
    peor = Math.min(peor, n ? dentro / n : 0);
  });
  if (cajasPega.some(Boolean)) med.push({ nombre: 'cajas', valor: round(peor), tope: '≥ 0,5', ok: peor >= 0.5 });

  // paleta fija
  const fuera = new Set<string>();
  for (const r of R) for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4 + 3]) { const h = hex(r.data[i * 4], r.data[i * 4 + 1], r.data[i * 4 + 2]); if (!paleta.has(h)) fuera.add(h); }
  med.push({ nombre: 'paleta', valor: fuera.size, tope: '0 colores de más', ok: fuera.size === 0 });

  return { movimiento: nombre, estilo, cuadros: R.length, medidas: med, ok: med.every((x) => x.ok) };
}

const round = (v: number) => Math.round(v * 100) / 100;
export const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/**
 * Lo mismo para cualquier animación ya dibujada (también las del chibi de hoy), solo con los cuadros y las
 * articulaciones en la celda: pivote, patina (el pie que queda en el piso en todos los cuadros), altura en los bucles,
 * sueltos, salto de silueta y cuántos colores usa (el chibi no tiene paleta fija: tope 48, como el control de siempre).
 */
export function controlarCuadros(nombre: string, estilo: string, frames: Raster[], pivot: [number, number], pies: ([number, number] | undefined)[][], bucle = false): Informe {
  const med: Medida[] = [];
  const pisos = frames.map((r) => { for (let y = r.h - 1; y >= 0; y--) for (let x = 0; x < r.w; x++) if (opaco(r, x, y)) return y; return -1; });
  const desv = Math.max(...pisos.map((y) => Math.abs(y - pivot[1])));
  med.push({ nombre: 'pivote', valor: desv, tope: '0 px', ok: desv === 0 });
  // un pie es de apoyo si en todos los cuadros está a lo sumo 1 px sobre el más bajo de los dos
  let patina = 0;
  for (const k of [0, 1]) {
    const ps = pies.map((f) => f[k]);
    if (ps.some((p) => !p)) continue;
    const apoyo = pies.every((f) => Math.max(f[0]?.[1] ?? 0, f[1]?.[1] ?? 0) - f[k]![1] <= 1);
    if (!apoyo) continue;
    const xs = ps.map((p) => Math.round(p![0]));
    patina = Math.max(patina, Math.max(...xs) - Math.min(...xs));
  }
  med.push({ nombre: 'patina', valor: patina, tope: '≤ 1 px', ok: patina <= 1 });
  if (bucle) {
    const tops = frames.map((r) => { for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (opaco(r, x, y)) return y; return r.h; });
    const amp = Math.max(...tops) - Math.min(...tops);
    med.push({ nombre: 'altura', valor: amp, tope: '≤ 2 px (±1)', ok: amp <= 2 });
  }
  let sueltos = 0;
  for (const r of frames) for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++)
    if (opaco(r, x, y) && !opaco(r, x - 1, y) && !opaco(r, x + 1, y) && !opaco(r, x, y - 1) && !opaco(r, x, y + 1)) sueltos++;
  med.push({ nombre: 'sueltos', valor: sueltos, tope: '0', ok: sueltos === 0 });
  let salto = 0;
  for (let k = 1; k < frames.length + (bucle ? 1 : 0); k++) {
    const a = frames[k - 1], b = frames[k % frames.length];
    let cambia = 0, union = 0;
    for (let i = 0; i < a.w * a.h; i++) { const oa = a.data[i * 4 + 3] > 0, ob = b.data[i * 4 + 3] > 0; if (oa || ob) { union++; if (oa !== ob) cambia++; } }
    salto = Math.max(salto, union ? cambia / union : 0);
  }
  med.push({ nombre: 'salto', valor: round(salto), tope: '≤ 0,6', ok: salto <= 0.6 });
  const cols = new Set<string>();
  for (const r of frames) for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4 + 3]) cols.add(hex(r.data[i * 4], r.data[i * 4 + 1], r.data[i * 4 + 2]));
  med.push({ nombre: 'colores', valor: cols.size, tope: '≤ 48', ok: cols.size <= 48 });
  return { movimiento: nombre, estilo, cuadros: frames.length, medidas: med, ok: med.every((x) => x.ok) };
}

/**
 * Cuánto se mueve un golpe (en pixeles de la celda), para comparar dos versiones del mismo movimiento:
 * - recogido: cuánto se va para atrás el puño o el pie antes del impacto, desde donde estaba en el primer cuadro.
 * - alcance: cuánto adelante llega en el impacto.
 * - sobrepaso: cuánto sigue la cabeza hacia adelante en el cuadro después del impacto.
 * - arco: cuánto se aparta el camino del puño o del pie de la línea recta entre el primer cuadro y el impacto.
 */
export interface Golpeo { recogido: number; alcance: number; sobrepaso: number; arco: number }
export function medirGolpe(punto: [number, number][], cabeza: [number, number][], impacto: number): Golpeo {
  const p0 = punto[0], pi = punto[impacto];
  let recogido = 0, arco = 0;
  const dx = pi[0] - p0[0], dy = pi[1] - p0[1], l = Math.hypot(dx, dy) || 1;
  for (let k = 1; k < impacto; k++) {
    recogido = Math.max(recogido, p0[0] - punto[k][0]);
    arco = Math.max(arco, Math.abs(dx * (punto[k][1] - p0[1]) - dy * (punto[k][0] - p0[0])) / l);
  }
  const sobrepaso = impacto + 1 < cabeza.length ? cabeza[impacto + 1][0] - cabeza[impacto][0] : 0;
  return { recogido: round(recogido), alcance: round(dx), sobrepaso: round(sobrepaso), arco: round(arco) };
}
