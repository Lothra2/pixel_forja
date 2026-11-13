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
export function estadosPfx(e: { congelado: number; frio: number; veneno: number; sangrado: number; aturdido: number; miedo: number; maldicion?: unknown; quema?: number; marca?: number }): string[] {
  const out: string[] = [];
  // (la quema ya arde con el fuego de Doom sobre el cuerpo: no se le suma fx_ardiendo)
  if (e.congelado > 0 || e.frio > 0) out.push('fx_congelado');
  if (e.veneno > 0) out.push('fx_envenenado');
  if (e.maldicion) out.push('fx_maldito');
  if (e.sangrado > 0) out.push('fx_sangrando');
  if (e.aturdido > 0) out.push('fx_aturdido');
  if (e.miedo > 0) out.push('fx_confundido');
  // la presa marcada por la cazadora: el corazón que late sobre la cabeza (no tiñe: va último)
  if ((e.marca ?? 0) > 0) out.push(usosPfx.estado.get('marca') ?? 'fx_presa_marcada');
  return out;
}

type Rol = 'proyectil' | 'impacto' | 'area' | 'lanzador' | 'blanco';
export interface UsoHab { proy?: string; area?: string; impacto?: string; lanzador?: string; blanco?: string }

/** Poderes de pixelfx por habilidad y por monstruo: los llena render/pfx.ts al bajar el índice. */
export const usosPfx = {
  hab: new Map<string, UsoHab>(),
  mon: new Map<string, string>(),
  /** proyectil -> lo que pasa donde pega (solo cuando la habilidad no declara su impacto) */
  impacto: new Map<string, string>(),
  /** estado del juego (quema, marca, veneno...) -> efecto en bucle */
  estado: new Map<string, string>(),
  /** subir_nivel, mision_cumplida, critico, aviso -> efecto */
  evento: new Map<string, string>(),
  /** Transiciones a pantalla completa pedidas por el juego (las dibuja render/pfx_mundo.ts). */
  pantalla: [] as { id: string; t0: number }[],
};
/** Pide una transición a pantalla completa (corte al jefe, muerte, entrar a la catedral ahogada...). */
export const transicionPfx = (id: string) => { usosPfx.pantalla.push({ id, t0: performance.now() / 1000 }); };

/**
 * Reparte los efectos de cada habilidad por su papel. Lo declarado con `rol` en el catálogo de la Forja manda; lo que no
 * lo declara se deduce como antes (los que vuelan en bucle son proyectil, el resto área) y solo llena huecos.
 */
export function armarUsosPfx(efectos: { id: string; uso?: any[]; luz?: { enVuelo?: boolean }; direccional: boolean; soloCinematica?: boolean }[]) {
  const declarado = new Map<string, Partial<Record<Rol, string>>>(), deducido = new Map<string, Partial<Record<Rol, string>>>();
  const poner = (m: typeof declarado, h: string, r: Rol, id: string) => { const x = m.get(h) ?? {}; if (!x[r]) x[r] = id; m.set(h, x); };
  for (const e of efectos) if (!e.soloCinematica) for (const u of e.uso ?? []) {
    if (u.tipo === 'poder') for (const h of u.habilidades ?? []) {
      if (u.rol) poner(declarado, h, u.rol, e.id);
      else poner(deducido, h, e.luz?.enVuelo ? 'proyectil' : 'area', e.id);
    }
    if (u.tipo === 'monstruo' && e.luz?.enVuelo) for (const m of u.monstruos ?? []) if (!usosPfx.mon.has(m)) usosPfx.mon.set(m, e.id);
    if (u.tipo === 'estado' && !usosPfx.estado.has(u.estado)) usosPfx.estado.set(u.estado, e.id);
    if (u.tipo === 'evento' && !usosPfx.evento.has(u.evento)) usosPfx.evento.set(u.evento, e.id);
  }
  for (const h of new Set([...declarado.keys(), ...deducido.keys()])) {
    const d = declarado.get(h) ?? {}, x = deducido.get(h) ?? {};
    const proy = d.proyectil ?? x.proyectil, impacto = d.impacto, area = d.area ?? (impacto ? undefined : x.area);
    // `area` sigue siendo lo que el juego dibuja donde cae o donde pega: el impacto declarado si no hay área propia
    usosPfx.hab.set(h, { proy, area: area ?? impacto, impacto, lanzador: d.lanzador, blanco: d.blanco });
    if (proy && (impacto ?? area) && !usosPfx.impacto.has(proy)) usosPfx.impacto.set(proy, (impacto ?? area)!);
  }
}

