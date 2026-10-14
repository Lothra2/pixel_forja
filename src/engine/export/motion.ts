import { VIEW_SUFFIX, type RenderedClip } from '../render/clip';
import type { AnimEvent } from '../anim/types';
import type { Joints } from '../render/human';

/** Evento listo para el juego: tipo, cuadro donde cae y, si es un paso, qué pie. */
export interface EventoJson {
  tipo: AnimEvent['type'];
  cuadro: number;
  fase: number;
  pie?: 'cerca' | 'lejos';
  /** paso con la mano (escalera, poste): qué mano agarra */
  mano?: 'cerca' | 'lejos';
  /**
   * Hojas de 8 direcciones, golpe, suelta y atrapa: dónde está la mano o el pie que pega (o la mano que suelta o atrapa) en ese cuadro,
   * en pixeles desde el pivote, una entrada por fila. El juego saca la pelota o el proyectil de ahí.
   */
  punto?: [number, number][];
}

/** Lo que el juego necesita para mover bien al personaje: eventos y avance (premium) y elevación de los saltos. */
export interface MovimientoAnim {
  eventos?: EventoJson[];
  avance?: number;
  elevacion?: number[];
  /**
   * Por cuadro, si el personaje está girado (lote B4B6 bis): en esos cuadros se dio vuelta (el seoi nage se mete de
   * espaldas) y el juego espeja el sprite y sus datos (cajas, manos, carga...), igual que cuando mira al otro lado.
   */
  girado?: boolean[];
  /** saltos a un muro: de 0 a 1 por cuadro (1 cuando las patas tocan arriba). Para otro muro: subida * alto_del_muro */
  subida?: number[];
  /** entre qué altos de muro (pixeles) se ve bien el salto */
  muro_min?: number;
  muro_max?: number;
  /** acciones que se desplazan: pixeles avanzados en cada cuadro desde el primero, hacia donde mira */
  desplazamiento?: number[];
  /** hojas de 8 direcciones: hacia dónde va de verdad cada fila (de frente, una prueba de campo va en diagonal) */
  rumbo?: string[];
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Eventos y avance de un clip. k: escala de la hoja (el avance se mide en pixeles de la hoja final).
 * El cuadro es el que contiene la fase, así el juego no tiene que hacer cuentas.
 */
export function motionOf(c: RenderedClip, k = 1): MovimientoAnim {
  const out: MovimientoAnim = {};
  // elevación: cuánto sube el juego el sprite sobre su sombra en cada cuadro (en pixeles de la hoja)
  if (c.rise) out.elevacion = c.rise.map((v) => r2(v * k));
  if (c.girado) out.girado = [...c.girado];
  if (c.rise && c.muro) {
    out.subida = c.rise.map((v) => r2(v / c.muro!.alto));
    out.muro_min = Math.round(c.muro.min * k);
    out.muro_max = Math.round(c.muro.max * k);
  }
  // los eventos van si el clip los trae (los premium, las clásicas con eventos de una ficha premium y los animales de ficha premium)
  if (c.events?.length) out.eventos = c.events.map((e) => ({
    tipo: e.type, cuadro: Math.min(c.frames.length - 1, Math.floor(e.phase * c.frames.length + 1e-6)), fase: r2(e.phase),
    ...(e.foot ? { pie: e.foot === 'near' ? 'cerca' as const : 'lejos' as const } : {}),
    ...(e.type === 'paso' && (e.joint === 'handNear' || e.joint === 'handFar') ? { mano: e.joint === 'handNear' ? 'cerca' as const : 'lejos' as const } : {}),
  }));
  if (c.profile !== 'premium') return out;
  if (c.stride) out.avance = r2(c.stride * k);
  if (c.travel) out.desplazamiento = c.travel.map((v) => r2(v * k));
  return out;
}

/**
 * Movimiento de una hoja de 8 direcciones (o de las filas pedidas): se mide en la vista de lado (la que piensan las
 * poses) y se agrega el rumbo. `side` es el clip de lado para medir cuando las filas pedidas no lo traen.
 */
export function motionOf8(clips: RenderedClip[], k = 1, sideClip?: RenderedClip): MovimientoAnim {
  const side = clips.find((c) => c.view === 'side') ?? sideClip ?? clips[0];
  const out = motionOf(side, k);
  const j = side.joints;
  if (j && out.eventos) {
    for (const e of out.eventos) {
      // golpes, sueltas y atrapadas; y los pasos con la mano (dónde agarra el peldaño o el poste)
      if (e.tipo !== 'impacto' && e.tipo !== 'suelta' && e.tipo !== 'atrapa' && !(e.tipo === 'paso' && e.mano)) continue;
      const name = c0joint(side, e) ?? contactJoint(j[e.cuadro], e.tipo === 'impacto' || e.tipo === 'paso' ? 'impacto' : 'suelta');
      if (!clips.every((c) => c.joints?.[e.cuadro])) continue;
      e.punto = clips.map((c) => {
        const [x, y] = c.joints![e.cuadro][name] ?? c.joints![e.cuadro].head;
        return [Math.round((x - c.cell / 2) * k), Math.round((y - (c.cell - 2)) * k)];
      });
    }
  }
  if (clips.some((c) => c.heading)) out.rumbo = clips.map((c) => VIEW_SUFFIX[c.heading ?? c.view]);
  return out;
}

/** La articulación que el evento dice que pega, si la dice. */
function c0joint(c: RenderedClip, e: EventoJson): Exclude<keyof Joints, 'carry'> | undefined {
  const ev = c.events?.find((x) => x.type === e.tipo && Math.min(c.frames.length - 1, Math.floor(x.phase * c.frames.length + 1e-6)) === e.cuadro);
  return ev?.joint as Exclude<keyof Joints, 'carry'> | undefined;
}

/** Qué pega: en un golpe, la mano o el pie que llega más adelante; en una suelta, la mano más alta (la que lanza). */
function contactJoint(j: Joints, tipo: 'impacto' | 'suelta'): 'handNear' | 'handFar' | 'footNear' | 'footFar' {
  if (tipo === 'suelta') return j.handNear[1] <= j.handFar[1] ? 'handNear' : 'handFar';
  const cands = ['handNear', 'handFar', 'footNear', 'footFar'] as const;
  return cands.reduce((a, b) => (j[b][0] > j[a][0] ? b : a));
}

/**
 * Archivo aparte con el movimiento de cada clip, para los formatos que no tienen dónde guardarlo
 * (Aseprite, Godot, GIF, cuadros sueltos). Las articulaciones van por cuadro, en pixeles de la celda.
 */
export function movimientoJson(clips: RenderedClip[]) {
  const premium = clips.filter((c) => c.profile === 'premium' || c.rise);
  if (!premium.length) return null;
  return {
    perfil_movimiento: clips.some((c) => c.profile === 'premium') ? 'premium' as const : 'clasico' as const,
    celda: clips[0].cell,
    notas: 'avance: pixeles que avanza el cuerpo en un ciclo sin que el pie patine. Ritmo de la animación = velocidad_del_juego * cuadros / (avance * fps). elevacion: pixeles que el juego sube el sprite en cada cuadro (la sombra queda en el piso).',
    anims: Object.fromEntries(premium.map((c) => [c.name, {
      cuadros: c.frames.length, fps: c.fps, loop: c.loop, ...motionOf(c),
      ...(c.profile === 'premium' && c.joints ? { articulaciones: c.joints } : {}),
    }])),
  };
}
