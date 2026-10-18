import type { BossPose } from './rig';

/**
 * Animaciones de jefe con poses clave, como las haría un animador: cada clave dice en qué cuadro cae y el resto se
 * interpola con aceleración (lento al salir y al llegar). Dos claves iguales seguidas son una pose que se sostiene:
 * así se arma el aviso de los golpes fuertes, que dura al menos 4 cuadros para que Alana alcance a esquivar.
 */

export type BossEventType = 'paso' | 'impacto' | 'despegue' | 'aterriza' | 'grito' | 'suelta';

export interface BossEvent { type: BossEventType; frame: number; foot?: 'near' | 'far' }

export interface BossKey {
  f: number;
  pose: BossPose;
  /** cómo se llega a esta clave: 'ease' (lento-rápido-lento), 'in' (acelera: golpes), 'out' (frena), 'linear' */
  ease?: 'ease' | 'in' | 'out' | 'linear';
}

export interface BossAnimDef {
  name: string;
  fps: number;
  loop: boolean;
  frames: number;
  keys: BossKey[];
  events?: BossEvent[];
  /** cuadros del aviso (la preparación que se sostiene antes de pegar) */
  windup?: [number, number];
  /** avance por ciclo en pixeles (caminar, embestir): lo calcula quien arma la animación */
  stride?: number;
  /** temblor de esfuerzo durante el aviso (pixeles) */
  shake?: number;
  /** cuánto sube el juego el sprite sobre su sombra en cada cuadro (pixeles de una celda de 128): saltos */
  rise?: number[];
}

const easeFn = (k: BossKey['ease'], t: number): number => {
  switch (k) {
    case 'linear': return t;
    case 'in': return t * t * t;
    case 'out': return 1 - (1 - t) ** 3;
    default: return t * t * (3 - 2 * t);
  }
};

/** Mezcla dos valores de pose del mismo tipo: números se interpolan, lo demás cambia en la mitad. */
function mix(a: unknown, b: unknown, t: number): unknown {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    const out: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    for (const k of keys) {
      const va = (a as Record<string, unknown>)[k], vb = (b as Record<string, unknown>)[k];
      if (va === undefined) out[k] = typeof vb === 'number' ? vb * t : vb;
      else if (vb === undefined) out[k] = typeof va === 'number' ? va * (1 - t) : va;
      else out[k] = mix(va, vb, t);
    }
    return out;
  }
  return t < 0.5 ? a : b;
}

/** Las poses de cada cuadro. En los ciclos, la última clave vuelve a la primera. */
export function bossPoses(def: BossAnimDef): BossPose[] {
  const keys = [...def.keys].sort((x, y) => x.f - y.f);
  if (def.loop && keys[keys.length - 1].f < def.frames) keys.push({ ...keys[0], f: def.frames });
  const out: BossPose[] = [];
  for (let f = 0; f < def.frames; f++) {
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].f <= f) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const span = Math.max(1e-6, b.f - a.f);
    const t = b === a ? 0 : Math.max(0, Math.min(1, (f - a.f) / span));
    const p = mix(a.pose, b.pose, easeFn(b.ease, t)) as BossPose;
    // temblor de esfuerzo en el aviso: la cadera tiembla un pixel de un lado al otro
    if (def.shake && def.windup && f >= def.windup[0] && f <= def.windup[1]) {
      const k = (f - def.windup[0]) % 2 === 0 ? 1 : -1;
      p.root = { ...p.root, x: (p.root.x ?? 0) + k * def.shake * 0.5 };
    }
    out.push(p);
  }
  return out;
}

/** Una pose base con cambios encima (las claves se escriben como diferencias de la guardia). */
export function over(base: BossPose, patch: DeepPartial<BossPose>): BossPose {
  return merge(base, patch) as BossPose;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function merge(a: unknown, b: unknown): unknown {
  if (b === undefined) return a;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    const out: Record<string, unknown> = { ...(a as object) };
    for (const [k, v] of Object.entries(b as object)) out[k] = merge((a as Record<string, unknown>)[k], v);
    return out;
  }
  return b;
}
