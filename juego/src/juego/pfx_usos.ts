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
