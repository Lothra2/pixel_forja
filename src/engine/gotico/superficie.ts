import { ruido, type V3 } from './render';

/**
 * Superficie por material: el grano propio de cada uno, legible a 75 px y a ×2, como patrón procedural determinista
 * (sale de la posición: lo que no se mueve entre cuadros no titila).
 *
 * - Metal: golpeado, con manchas de valor de baja frecuencia y algún rayón claro.
 * - Cuero: rayado, con cambios de tono y vetas más oscuras.
 * - Tela: hilos verticales y una trama fina.
 * - Malla: anillas en patrón regular (filas desplazadas a medio paso), no ruido al azar.
 */
const frac = (x: number) => x - Math.floor(x);

export function metal(p: V3): number {
  const mancha = (ruido(p[0] * 0.22 + 11, p[1] * 0.22, p[2] * 0.22) - 0.5) * 0.26;
  const golpe = (ruido(p[0] * 0.9, p[1] * 0.9 + 5, p[2] * 0.9) - 0.5) * 0.1;
  const s = Math.abs(Math.sin((p[0] * 0.8 - p[1] * 0.5 + p[2] * 1.7) * 1.9 + ruido(p[0] * 0.2, p[1] * 0.2, p[2] * 0.2) * 6));
  return mancha + golpe + (s > 0.993 ? 0.12 : 0);
}
export function cuero(p: V3): number {
  const tono = (ruido(p[0] * 0.5 + 3, p[1] * 0.5, p[2] * 0.5) - 0.5) * 0.24;
  const veta = Math.abs(Math.sin((p[0] + p[1] + p[2] * 0.3) * 3.1 + ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) * 5));
  return tono + (veta > 0.986 ? -0.11 : 0);
}
export function tela(p: V3): number {
  const hilo = (ruido((p[0] + p[1]) * 2.2, 0.5, p[2] * 0.15) - 0.5) * 0.18;
  const trama = (Math.floor(p[2] * 2.4) + Math.floor((p[0] - p[1]) * 2.4)) & 1 ? 0.025 : -0.025;
  return hilo + trama;
}
export function malla(p: V3): number {
  const r = p[2] / 0.85, fila = Math.floor(r), u = frac((p[0] - p[1]) * 0.8 + (fila & 1) * 0.5), v = frac(r);
  const d = (u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5);
  return d < 0.06 ? -0.2 : d < 0.16 ? 0.07 : -0.04;
}
