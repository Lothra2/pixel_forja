import { type Ramp, OUTLINE, makeRamp } from '../color/ramp';
import { packHex, type Paint } from './canvas';

/** Colores fijos de los implementos (balón, raqueta, bate...). Se dibujan con código, con su propia rampa. */
export const PROP_COLORS = {
  white: '#f2f2ee', black: '#2a2a32', orange: '#e8742a', yellow: '#f2c94c', blue: '#3d6fd6', red: '#d23c3c',
  wood: '#c8904e', metal: '#c9d3df', lime: '#cfe83a', grey: '#8a8f99', pink: '#e0466a', glass: '#bfe8ff',
  brown: '#8a5a2b', green: '#4caf50', navy: '#24305e', gold: '#e2b23c',
} as const;
export type PropColor = keyof typeof PROP_COLORS;

/** Registro de materiales de un cuadro: nombre -> rampa e id. */
export class Materials {
  private ids = new Map<string, number>();
  private ramps = new Map<string, Ramp>();
  constructor(base: Record<string, Ramp>) {
    for (const [k, r] of Object.entries(base)) this.add(k, r);
    for (const [k, hex] of Object.entries(PROP_COLORS)) this.add(`p_${k}`, makeRamp(hex));
  }
  add(name: string, ramp: Ramp) {
    if (!this.ids.has(name)) this.ids.set(name, this.ids.size);
    this.ramps.set(name, ramp);
  }
  ramp(name: string): Ramp {
    const r = this.ramps.get(name);
    if (!r) throw new Error(`material desconocido: ${name}`);
    return r;
  }
  id(name: string): number {
    return this.ids.get(name) ?? -1;
  }
  paint(name: string, slot: number): Paint {
    const r = this.ramp(name);
    return { color: packHex(r[Math.max(0, Math.min(3, slot))]), dark: packHex(r[OUTLINE]), mat: this.id(name) };
  }
  /** color libre con el tono oscuro de un material */
  custom(hex: string, darkOf: string): Paint {
    return { color: packHex(hex), dark: packHex(this.ramp(darkOf)[OUTLINE]), mat: this.id(darkOf) };
  }
}
