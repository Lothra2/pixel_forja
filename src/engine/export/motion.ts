import type { RenderedClip } from '../render/clip';

/** Evento listo para el juego: tipo, cuadro donde cae y, si es un paso, qué pie. */
export interface EventoJson { tipo: 'paso' | 'impacto' | 'suelta'; cuadro: number; fase: number; pie?: 'cerca' | 'lejos' }

/** Lo que el juego necesita para mover bien al personaje (solo perfil premium). */
export interface MovimientoAnim { eventos?: EventoJson[]; avance?: number }

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Eventos y avance de un clip. k: escala de la hoja (el avance se mide en pixeles de la hoja final).
 * El cuadro es el que contiene la fase, así el juego no tiene que hacer cuentas.
 */
export function motionOf(c: RenderedClip, k = 1): MovimientoAnim {
  if (c.profile !== 'premium') return {};
  const out: MovimientoAnim = {};
  if (c.events?.length) out.eventos = c.events.map((e) => ({
    tipo: e.type, cuadro: Math.min(c.frames.length - 1, Math.floor(e.phase * c.frames.length + 1e-6)), fase: r2(e.phase),
    ...(e.foot ? { pie: e.foot === 'near' ? 'cerca' as const : 'lejos' as const } : {}),
  }));
  if (c.stride) out.avance = r2(c.stride * k);
  return out;
}

/**
 * Archivo aparte con el movimiento de cada clip, para los formatos que no tienen dónde guardarlo
 * (Aseprite, Godot, GIF, cuadros sueltos). Las articulaciones van por cuadro, en pixeles de la celda.
 */
export function movimientoJson(clips: RenderedClip[]) {
  const premium = clips.filter((c) => c.profile === 'premium');
  if (!premium.length) return null;
  return {
    perfil_movimiento: 'premium' as const,
    celda: clips[0].cell,
    notas: 'avance: pixeles que avanza el cuerpo en un ciclo sin que el pie patine. Ritmo de la animación = velocidad_del_juego * cuadros / (avance * fps).',
    anims: Object.fromEntries(premium.map((c) => [c.name, {
      cuadros: c.frames.length, fps: c.fps, loop: c.loop, ...motionOf(c),
      ...(c.joints ? { articulaciones: c.joints } : {}),
    }])),
  };
}
