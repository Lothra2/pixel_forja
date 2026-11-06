// Tipos del índice de efectos de pixelfx (archivo agregado por la Forja).
import type { Pintor } from '../core/index.js';

export interface MetaPfx {
  name: string;
  desc: string;
  tags?: string[];
  /** lienzo [ancho, alto] a 1x */
  size: [number, number];
  /** pixel del lienzo donde cae (0, 0) local: pies, punto de impacto, boca */
  origin: [number, number];
  duration: number;
  loop?: boolean;
  fps?: number;
  bg?: string;
  /** 2: el efecto lee el muñeco (máscara y colores) en o.actor */
  actor?: number;
  options?: Record<string, unknown>;
}

export interface ModuloPfx {
  meta: MetaPfx;
  draw?: (p: Pintor, t: number, o: Record<string, unknown>) => void;
  drawBack?: (p: Pintor, t: number, o: Record<string, unknown>) => void;
  create?: (o: Record<string, unknown>) => unknown;
  /** visibilidad del personaje (0..1) que pide el efecto en el tiempo t */
  actorAlpha?: (t: number, o: Record<string, unknown>) => number;
  act?: unknown;
}

export const EFECTOS: Record<string, ModuloPfx>;
