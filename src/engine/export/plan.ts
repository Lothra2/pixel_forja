import type { Ficha, CellSize } from '../sheet/ficha';
import { renderClip, hasAnim, VIEW_SUFFIX, type ViewName, type RenderedClip } from '../render/clip';
import { runQA, type QAReport } from '../qa/checks';
import { FFGG_ANIMS } from './ffgg';

/** Qué se exporta: animaciones, vistas, tamaño y si van los implementos. */
export interface ExportPlan {
  cell: CellSize;
  anims: string[];
  views: ViewName[];
  /** balones e implementos. Para un juego que dibuja su propio balón, apagado */
  props: boolean;
  /** escala entera de la hoja PNG (para React Native y pantallas donde no se controla el filtrado). 1 por defecto */
  scale?: number;
}

export const FFGG_PLAN: ExportPlan = { cell: 48, anims: [...FFGG_ANIMS], views: ['side'], props: false };

/** Nombre de la animación en la hoja: de lado solo, sin sufijo; en 4 direcciones, walk_down, walk_up... */
export function clipName(name: string, view: ViewName, plan: ExportPlan): string {
  return plan.views.length === 1 && view === 'side' ? name : `${name}_${VIEW_SUFFIX[view]}`;
}

export function renderPlan(f: Ficha, plan: ExportPlan): { clips: RenderedClip[]; qa: QAReport[]; missing: string[] } {
  const clips: RenderedClip[] = [];
  const qa: QAReport[] = [];
  const missing: string[] = [];
  for (const a of plan.anims) {
    if (!hasAnim(f, a)) { missing.push(a); continue; }
    for (const v of plan.views) {
      const c = renderClip(f, plan.cell, a, v, { props: plan.props });
      const named = { ...c, name: clipName(a, v, plan) };
      clips.push(named);
      qa.push(runQA(f, named));
    }
  }
  return { clips, qa, missing };
}
