// Qué efecto de pixelfx va en cada momento del juego (sin dibujar nada: eso está en render/pfx.ts).
import type { Elemento } from './tipos_objetos';

/** Muerte de un monstruo: el efecto según quién es y con qué murió (o null: cadáver normal, o el fuego de Doom). */
export function muertePfx(m: { def: { id: string; sprite: string }; congelado: number; calidad: number; quema?: number }, elem: Elemento | undefined, azar: number): string | null {
  const id = m.def.id, spr = m.def.sprite;
  if (/abadesa|ozmaren/.test(spr)) return 'fx_gran_explosion';
  if (/caballero_abismo/.test(id)) return 'fx_explosion_oscura';
  if (m.congelado > 0) return 'fx_muerte_helada';
  // muerto por fuego: el cadáver ya arde con el fuego de Doom
  if ((m.quema ?? 0) > 0 || elem === 'fuego') return null;
  if (/ahogado|sirena|marinero|sacerdote_marea/.test(id)) return 'fx_salpicadura';
  if (/cienaga/.test(id)) return 'fx_baba';
  if (/saqueador|bandido/.test(id)) return 'fx_monedas_caen';
  if (/murcielago|gargola|demonio_alado|cuervo/.test(id)) return 'fx_plumas';
  if (/espectro|aparecida|sin_rostro|abismo|monja_hueca/.test(id)) return 'fx_implosion';
  if (elem === 'frio' && azar < 0.5) return 'fx_muerte_helada';
  if (elem === 'sombra' || elem === 'luz' || elem === 'rayo') return 'fx_desintegrar';
  if (m.calidad >= 1 || azar < 0.2) return 'fx_alma_sube';
  return null;
}

/** Estados en bucle sobre el cuerpo, en orden de prioridad (el primero también tiñe). */
export function estadosPfx(e: { congelado: number; frio: number; veneno: number; sangrado: number; aturdido: number; miedo: number; maldicion?: unknown }): string[] {
  const out: string[] = [];
  if (e.congelado > 0 || e.frio > 0) out.push('fx_congelado');
  if (e.veneno > 0) out.push('fx_envenenado');
  if (e.maldicion) out.push('fx_maldito');
  if (e.sangrado > 0) out.push('fx_sangrando');
  if (e.aturdido > 0) out.push('fx_aturdido');
  if (e.miedo > 0) out.push('fx_confundido');
  return out;
}

/** Poderes de pixelfx por habilidad y por monstruo: los llena render/pfx.ts al bajar el índice (mientras tanto, los de siempre). */
export const usosPfx = {
  hab: new Map<string, { proy?: string; area?: string }>(),
  mon: new Map<string, string>(),
  impacto: new Map<string, string>(),
  /** Transiciones a pantalla completa pedidas por el juego (las dibuja render/pfx_mundo.ts). */
  pantalla: [] as { id: string; t0: number }[],
};
/** Pide una transición a pantalla completa (corte al jefe, muerte, entrar a la catedral ahogada...). */
export const transicionPfx = (id: string) => { usosPfx.pantalla.push({ id, t0: performance.now() / 1000 }); };
/** Reparte los efectos de cada habilidad en proyectil (el que vuela) y área (lo que pasa donde cae o donde pega). */
export function armarUsosPfx(efectos: { id: string; uso?: any[]; luz?: { enVuelo?: boolean }; direccional: boolean }[]) {
  const porHab = new Map<string, typeof efectos>();
  for (const e of efectos) for (const u of e.uso ?? []) {
    if (u.tipo === 'poder') for (const h of u.habilidades ?? []) { if (!porHab.has(h)) porHab.set(h, []); porHab.get(h)!.push(e); }
    if (u.tipo === 'monstruo' && e.luz?.enVuelo) for (const m of u.monstruos ?? []) if (!usosPfx.mon.has(m)) usosPfx.mon.set(m, e.id);
  }
  for (const [h, es] of porHab) {
    const proy = es.find((e) => e.luz?.enVuelo), area = es.find((e) => !e.luz?.enVuelo);
    usosPfx.hab.set(h, { proy: proy?.id, area: area?.id });
    if (proy && area && !usosPfx.impacto.has(proy.id)) usosPfx.impacto.set(proy.id, area.id);
  }
}
