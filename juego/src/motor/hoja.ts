// Dónde está la hoja del arma en cada cuadro (en pixeles relativos al ancla del sprite): de la mano a la punta.
// Sirve para que las armas vivas ardan, congelen o chispeen justo sobre la hoja.
const LARGO: Record<string, [number, number]> = {
  espada: [3, 25], cimitarra: [3, 23], mandoble: [4, 36], hacha: [8, 22], hacha_doble: [10, 32], maza: [9, 22], martillo: [14, 32], mangual: [6, 20],
  lanza: [20, 48], alabarda: [24, 46], guadana: [24, 42], baculo: [16, 34], cetro: [10, 22], varita: [4, 13], daga: [2, 11], garras: [1, 7],
  arco: [-8, 10], ballesta: [2, 14], puno: [0, 2], nada: [0, 1],
};
type V3 = [number, number, number];
export function hojaDe(esqueleto: any, aPantalla: (p: V3) => [number, number], cuerpo: any, equipo: any, dir: string, acc: string, f: number): number[] {
  const tipo = equipo.arma?.tipo ?? 'nada';
  const e = esqueleto(cuerpo, dir, acc, f, tipo);
  const b = e.brazos[0];
  const [l0, l1] = LARGO[tipo] ?? [2, 20];
  const S = e.S;
  const p0: V3 = [b.mano[0] + b.eje[0] * l0 * S, b.mano[1] + b.eje[1] * l0 * S, b.mano[2] + b.eje[2] * l0 * S];
  const p1: V3 = [b.mano[0] + b.eje[0] * l1 * S, b.mano[1] + b.eje[1] * l1 * S, b.mano[2] + b.eje[2] * l1 * S];
  const a = aPantalla(p0), c = aPantalla(p1);
  return [Math.round(a[0]), Math.round(a[1]), Math.round(c[0]), Math.round(c[1])];
}
