// Rectángulos del HUD dibujados en el último cuadro: botones táctiles, barra, botón agresivo y mensajes.
// La escena los usa para que los nombres del mundo no caigan encima, y la auditoría para comprobar que nada se cruza.
export type Rect = [number, number, number, number];
export const hud: Record<string, Rect> = {};
export const etiquetasMundo: { txt: string; r: Rect }[] = [];
export const cruzan = (a: Rect, b: Rect) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
/** Mueve el rectángulo hacia arriba hasta que no cruce ningún rectángulo del HUD. Devuelve la nueva y. */
export function esquivarHud(r: Rect): number {
  let y = r[1];
  for (let n = 0; n < 6; n++) {
    const choca = Object.values(hud).find((h) => cruzan([r[0], y, r[2], r[3]], h));
    if (!choca) break;
    y = choca[1] - r[3] - 4;
  }
  return y;
}
