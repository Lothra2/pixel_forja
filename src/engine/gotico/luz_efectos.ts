/**
 * Luz de los poderes: qué luz dinámica (con sombras) tiene que prender el juego por cada efecto del taller.
 *
 * Una entrada por id de `PODERES` (poderes.ts). Las unidades son las del juego en pantalla, a escala 1:
 * - `radio`: alcance de la luz en px de pantalla sobre el piso sin aplastar (como `Luz.r` en render/luces.ts); el juego
 *   lo multiplica por la escala del efecto.
 * - `intensidad`: tope 0..1 (como `Luz.k`); el valor de cada cuadro es `intensidad * curva[cuadro]`.
 * - `curva`: intensidad relativa 0..1 por cuadro del efecto (mismo largo que `cuadros`). En los que se repiten (bucle) la
 *   curva también se repite; en los que pasan una vez el último valor es el apagado.
 * - `altura`: altura de la fuente sobre el piso en px de pantalla (para estirar las sombras: `Luz.h`).
 * - `parpadeo`: cuánto tiembla al azar en el juego (0..1, se multiplica `1 - parpadeo * azar`), además de la curva.
 * - `enVuelo`: la luz viaja con el proyectil (se ata a su posición y no a un punto fijo).
 * Opcionales extra para cablear sin pensar:
 * - `lanzar`: fogonazo en la mano del que lanza (cuadros a 25 por segundo, cae rápido).
 * - `impacto`: id del efecto que conviene soltar al pegar (su propia entrada trae el destello).
 * - `sombra`: si esta luz debe proyectar sombras (las chicas y las que lleva el héroe no: ahorran).
 * - `prioridad`: 0 = imprescindible (explosiones, rayos), 1 = proyectiles y golpes, 2 = áreas que duran, 3 = adorno.
 * - `mezcla`: 'normal' cuando el efecto tiene mucha materia (sangre, hueso, humo, flechas) y conviene dibujarlo con
 *   alfa normal en vez de aditivo, o la sangre y el humo desaparecen.
 *
 * Todo es determinista. `luzEfectosJson()` da la copia para el juego (datos/luz_efectos.json, un test la mantiene igual).
 */

import { curvaDoom } from './poderes_doom';

export interface LuzEfecto {
  color: string;
  radio: number;
  intensidad: number;
  curva: number[];
  altura: number;
  parpadeo?: number;
  enVuelo?: boolean;
  lanzar?: { radio: number; intensidad: number; cuadros: number };
  impacto?: string;
  sombra?: boolean;
  prioridad?: 0 | 1 | 2 | 3;
  mezcla?: 'normal' | 'aditiva';
}

// ---------------------------------------------------------------------------------------------------------------
// curvas

const r2 = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 100) / 100;
const TAU = Math.PI * 2;

/** fogonazo: sube en `pico` cuadros y se apaga rápido (vida = fracción de lo que queda en que cae a ~5 %) */
function fogonazo(n: number, pico = 0, vida = 0.55): number[] {
  const out: number[] = [];
  for (let f = 0; f < n; f++) {
    if (f < pico) out.push(r2(0.35 + 0.65 * ((f + 1) / (pico + 1)) ** 1.5));
    else out.push(r2(Math.exp((-3 * (f - pico)) / Math.max(1, (n - 1 - pico) * vida))));
  }
  out[n - 1] = Math.min(out[n - 1], 0.04);
  return out;
}
/** pulso de bucle: base ± amplitud, `ciclos` vueltas por bucle (empalma sin salto) */
function pulso(n: number, base = 0.85, amp = 0.12, ciclos = 1, fase = 0): number[] {
  return Array.from({ length: n }, (_, f) => r2(base + amp * Math.sin((f / n) * TAU * ciclos + fase)));
}
/** chisporroteo de rayo: valores fijos pseudoazarosos entre lo y 1 */
function chisporroteo(n: number, lo = 0.55, semilla = 7): number[] {
  let s = semilla >>> 0;
  const az = () => ((s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0) / 4294967296);
  return Array.from({ length: n }, () => r2(lo + (1 - lo) * az()));
}
/** campana: sube hasta `a`, se sostiene hasta `b` (fracciones del largo) y se apaga al final */
function campana(n: number, a = 0.2, b = 0.55, piso = 0): number[] {
  return Array.from({ length: n }, (_, f) => {
    const t = (f + 0.5) / n;
    const k = t < a ? t / a : t < b ? 1 : 1 - (t - b) / (1 - b);
    return r2(piso + (1 - piso) * Math.sqrt(Math.max(0, k)));
  });
}
const nada = (n: number) => Array.from({ length: n }, () => 0);

// colores por elemento (un poco más vivos que COLOR_ELEM del juego: la luz se mezcla con la oscuridad)
const COL = {
  fuego: '#ff8a33', brasa: '#ff6a1e', hielo: '#78bcff', rayo: '#a8c2ff', veneno: '#86e84a', sombra: '#9a4dff',
  sagrado: '#ffd98a', sangre: '#e0262a', arcano: '#c27aff', naturaleza: '#94e06a', hueso: '#8ff0d8', fisico: '#ffd2a0',
  acero: '#dfe6ff', necro: '#7dffa0', curacion: '#9cff9c', trampa: '#ff5aa8', portal: '#5a90ff', bestia: '#ffa040',
} as const;

type Base = Omit<LuzEfecto, 'curva'>;
const proyectil = (color: string, radio: number, intensidad: number, n: number, impacto: string, extra: Partial<LuzEfecto> = {}): LuzEfecto => ({
  color, radio, intensidad, curva: pulso(n, 0.88, 0.1, n >= 8 ? 2 : 1), altura: 42, parpadeo: 0.1, enVuelo: true,
  lanzar: { radio: Math.round(radio * 0.7), intensidad: Math.min(1, intensidad * 0.9), cuadros: 4 }, impacto, sombra: true, prioridad: 1, ...extra,
});
const golpe = (b: Base, n: number, pico = 0, vida = 0.5): LuzEfecto => ({ sombra: true, prioridad: 0, ...b, curva: fogonazo(n, pico, vida) });

// ---------------------------------------------------------------------------------------------------------------
// la tabla

export const LUZ_EFECTO: Record<string, LuzEfecto> = {
  // ---- fuego
  saeta_fuego: proyectil(COL.fuego, 170, 0.85, 6, 'explosion_fuego', { parpadeo: 0.14 }),
  bola_fuego: proyectil(COL.fuego, 230, 1, 8, 'explosion_fuego', { parpadeo: 0.16, altura: 44 }),
  explosion_fuego: golpe({ color: COL.fuego, radio: 270, intensidad: 1, altura: 30, parpadeo: 0.08 }, 14, 0, 0.6),
  muro_llamas: { color: COL.fuego, radio: 150, intensidad: 0.75, curva: pulso(10, 0.82, 0.1, 2), altura: 30, parpadeo: 0.18, sombra: true, prioridad: 2 },
  // crater_ardiente arde con fuego de Doom: su curva es el calor medio de la llama en cada cuadro
  meteoro: {
    color: COL.fuego, radio: 300, intensidad: 1, altura: 34, parpadeo: 0.1, sombra: true, prioridad: 0,
    // cae (la luz baja con la roca: 0.25 a 0.6), pega en el cuadro 8 y se apaga
    curva: [0.22, 0.26, 0.3, 0.35, 0.41, 0.48, 0.55, 0.62, 1, 0.92, 0.74, 0.56, 0.42, 0.3, 0.2, 0.12, 0.06, 0.02],
  },
  crater_ardiente: { color: COL.brasa, radio: 160, intensidad: 0.6, curva: curvaDoom('crater_ardiente'), altura: 10, parpadeo: 0.14, sombra: false, prioridad: 2 },
  // aliento_infernal sopla fuego de Doom a lo largo del chorro: la curva es el calor medio de la llama en cada cuadro
  aliento_infernal: { color: COL.fuego, radio: 230, intensidad: 0.9, curva: curvaDoom('aliento_infernal'), altura: 40, parpadeo: 0.12, sombra: true, prioridad: 1 },
  // ---- hielo
  saeta_hielo: proyectil(COL.hielo, 160, 0.7, 6, 'estallido_esquirlas', { parpadeo: 0.05 }),
  estallido_esquirlas: golpe({ color: COL.hielo, radio: 190, intensidad: 0.85, altura: 30 }, 10, 0, 0.5),
  nova_escarcha: golpe({ color: COL.hielo, radio: 250, intensidad: 0.9, altura: 12 }, 14, 1, 0.75),
  ventisca: { color: COL.hielo, radio: 230, intensidad: 0.45, curva: pulso(12, 0.8, 0.15, 3), altura: 60, parpadeo: 0.12, sombra: false, prioridad: 2 },
  coraza_helada: { color: COL.hielo, radio: 120, intensidad: 0.45, curva: pulso(8, 0.85, 0.12), altura: 40, sombra: false, prioridad: 3 },
  // ---- rayo
  arco_cadena: { color: COL.rayo, radio: 220, intensidad: 1, curva: chisporroteo(6, 0.5, 3), altura: 38, parpadeo: 0.4, sombra: true, prioridad: 0 },
  relampago: proyectil(COL.rayo, 240, 1, 6, 'impacto_rayo', { curva: chisporroteo(6, 0.6, 11), parpadeo: 0.35 }),
  campo_estatico: { color: COL.rayo, radio: 180, intensidad: 0.6, curva: chisporroteo(8, 0.35, 5), altura: 12, parpadeo: 0.45, sombra: false, prioridad: 2 },
  chispa_cargada: proyectil(COL.rayo, 170, 0.85, 8, 'impacto_rayo', { curva: chisporroteo(8, 0.6, 17), parpadeo: 0.3, altura: 26 }),
  trueno: {
    color: COL.rayo, radio: 320, intensidad: 1, altura: 120, parpadeo: 0.2, sombra: true, prioridad: 0,
    // el rayo pega dos veces (cuadros 1-3 y 5-6) como en el dibujo
    curva: [0.2, 1, 0.88, 0.55, 0.14, 0.86, 0.45, 0.24, 0.14, 0.08, 0.04, 0.01],
  },
  // ---- hueso y nigromancia
  lanza_hueso: proyectil(COL.hueso, 150, 0.6, 6, 'impacto_hueso', { parpadeo: 0.05, mezcla: 'normal' }),
  prision_hueso: { color: COL.hueso, radio: 150, intensidad: 0.5, curva: campana(12, 0.25, 0.6), altura: 30, sombra: false, prioridad: 2, mezcla: 'normal' },
  circulo_invocacion: { color: COL.necro, radio: 170, intensidad: 0.6, curva: pulso(12, 0.82, 0.14), altura: 8, sombra: false, prioridad: 2 },
  estallido_cadaver: golpe({ color: '#ff5a2a', radio: 240, intensidad: 1, altura: 18, parpadeo: 0.06, mezcla: 'normal' }, 12, 0, 0.45),
  // ---- veneno
  nova_veneno: golpe({ color: COL.veneno, radio: 230, intensidad: 0.75, altura: 14 }, 14, 1, 0.8),
  nube_veneno: { color: COL.veneno, radio: 170, intensidad: 0.4, curva: pulso(12, 0.8, 0.12), altura: 20, parpadeo: 0.08, sombra: false, prioridad: 2, mezcla: 'normal' },
  // ---- sagrado
  pilar_luz: { color: COL.sagrado, radio: 290, intensidad: 1, curva: campana(14, 0.15, 0.55), altura: 100, sombra: true, prioridad: 0 },
  aura_sagrada: { color: COL.sagrado, radio: 150, intensidad: 0.5, curva: pulso(12, 0.85, 0.12), altura: 20, sombra: false, prioridad: 3 },
  castigo: golpe({ color: COL.sagrado, radio: 230, intensidad: 1, altura: 40 }, 8, 0, 0.55),
  chispas_curacion: { color: COL.curacion, radio: 130, intensidad: 0.5, curva: campana(14, 0.2, 0.5), altura: 40, sombra: false, prioridad: 3 },
  escudo_divino: { color: COL.sagrado, radio: 140, intensidad: 0.45, curva: pulso(10, 0.85, 0.12), altura: 40, sombra: false, prioridad: 3 },
  // ---- físico
  torbellino: { color: COL.acero, radio: 110, intensidad: 0.3, curva: pulso(8, 0.8, 0.2, 2), altura: 36, sombra: false, prioridad: 3 },
  onda_aterrizaje: golpe({ color: '#ffe6c0', radio: 170, intensidad: 0.45, altura: 6, sombra: false, prioridad: 1, mezcla: 'normal' }, 10, 0, 0.35),
  grito_guerra: golpe({ color: '#ff6a2a', radio: 210, intensidad: 0.7, altura: 60, sombra: false, prioridad: 1 }, 10, 0, 0.7),
  polvo_carga: { color: COL.fisico, radio: 0, intensidad: 0, curva: nada(8), altura: 0, prioridad: 3, mezcla: 'normal' },
  flecha: { color: COL.fisico, radio: 0, intensidad: 0, curva: nada(4), altura: 42, enVuelo: true, impacto: 'chispas_carne', prioridad: 3, mezcla: 'normal' },
  flecha_fuego: proyectil(COL.fuego, 120, 0.6, 6, 'explosion_fuego', { parpadeo: 0.15, mezcla: 'normal' }),
  flecha_hielo: proyectil(COL.hielo, 110, 0.5, 6, 'estallido_esquirlas', { mezcla: 'normal' }),
  abanico_flechas: golpe({ color: '#fff0d0', radio: 90, intensidad: 0.35, altura: 42, sombra: false, prioridad: 3, mezcla: 'normal' }, 6, 0, 0.25),
  lluvia_flechas: { color: COL.fisico, radio: 0, intensidad: 0, curva: nada(12), altura: 0, prioridad: 3, mezcla: 'normal' },
  // ---- sombra
  paso_sombrio: golpe({ color: COL.sombra, radio: 180, intensidad: 0.7, altura: 36 }, 10, 0, 0.6),
  tajo_garras: golpe({ color: '#ff5040', radio: 120, intensidad: 0.45, altura: 40, sombra: false, prioridad: 1 }, 6, 1, 0.6),
  glifo_trampa: { color: COL.trampa, radio: 110, intensidad: 0.5, curva: pulso(8, 0.78, 0.2), altura: 6, sombra: false, prioridad: 3 },
  // ---- naturaleza
  tornado: { color: '#c8d8c0', radio: 0, intensidad: 0, curva: nada(10), altura: 50, prioridad: 3, mezcla: 'normal' },
  estallido_enredaderas: { color: COL.naturaleza, radio: 150, intensidad: 0.5, curva: campana(12, 0.15, 0.4), altura: 16, sombra: false, prioridad: 2, mezcla: 'normal' },
  transformacion_bestia: golpe({ color: COL.bestia, radio: 210, intensidad: 0.85, altura: 40 }, 10, 0, 0.6),
  // ---- arcano y utilidades
  destello_teleporte: { color: COL.arcano, radio: 230, intensidad: 0.9, curva: campana(10, 0.32, 0.4), altura: 40, sombra: true, prioridad: 0 },
  portal_regreso: { color: COL.portal, radio: 180, intensidad: 0.8, curva: pulso(12, 0.85, 0.1, 2), altura: 50, sombra: true, prioridad: 1 },
  subida_nivel: { color: COL.sagrado, radio: 270, intensidad: 1, curva: campana(16, 0.1, 0.45), altura: 80, sombra: true, prioridad: 0 },
  haz_botin_normal: { color: '#eae6d6', radio: 80, intensidad: 0.35, curva: pulso(8, 0.85, 0.15), altura: 40, sombra: false, prioridad: 3 },
  haz_botin_magico: { color: '#5a84ff', radio: 90, intensidad: 0.45, curva: pulso(8, 0.85, 0.15), altura: 40, sombra: false, prioridad: 3 },
  haz_botin_raro: { color: '#ffe64c', radio: 100, intensidad: 0.5, curva: pulso(8, 0.85, 0.15), altura: 40, sombra: false, prioridad: 3 },
  haz_botin_unico: { color: '#dca852', radio: 110, intensidad: 0.55, curva: pulso(8, 0.85, 0.15), altura: 40, sombra: false, prioridad: 3 },
  haz_botin_conjunto: { color: '#4cff52', radio: 110, intensidad: 0.55, curva: pulso(8, 0.85, 0.15), altura: 40, sombra: false, prioridad: 3 },
  // ---- golpes y sangre
  salpicadura_sangre: golpe({ color: COL.sangre, radio: 100, intensidad: 0.3, altura: 34, sombra: false, prioridad: 2, mezcla: 'normal' }, 8, 0, 0.3),
  chispas_metal: golpe({ color: '#ffc070', radio: 120, intensidad: 0.7, altura: 44, sombra: false, prioridad: 1 }, 6, 0, 0.3),
  chispas_carne: golpe({ color: '#ff6040', radio: 80, intensidad: 0.35, altura: 40, sombra: false, prioridad: 2, mezcla: 'normal' }, 6, 0, 0.3),
  brillo_pocion_vida: { color: '#ff3a34', radio: 120, intensidad: 0.55, curva: campana(12, 0.2, 0.5), altura: 36, sombra: false, prioridad: 3 },
  brillo_pocion_mana: { color: '#4874ff', radio: 120, intensidad: 0.55, curva: campana(12, 0.2, 0.5), altura: 36, sombra: false, prioridad: 3 },
  brillo_pocion_rejuvenecer: { color: '#c64cff', radio: 120, intensidad: 0.55, curva: campana(12, 0.2, 0.5), altura: 36, sombra: false, prioridad: 3 },
  alma_ascendente: { color: COL.hueso, radio: 130, intensidad: 0.55, curva: campana(16, 0.15, 0.55), altura: 90, sombra: false, prioridad: 3 },
  // ---- nuevos (van al lado de los de siempre; ver LEEME de poderes)
  virote: { color: COL.fisico, radio: 0, intensidad: 0, curva: nada(4), altura: 42, enVuelo: true, impacto: 'chispas_carne', prioridad: 3, mezcla: 'normal' },
  saeta_sagrada: proyectil(COL.sagrado, 190, 0.9, 6, 'impacto_sagrado', { parpadeo: 0.06 }),
  saeta_veneno: proyectil(COL.veneno, 140, 0.6, 6, 'impacto_veneno', { parpadeo: 0.08, mezcla: 'normal' }),
  impacto_rayo: golpe({ color: COL.rayo, radio: 240, intensidad: 1, altura: 36, parpadeo: 0.35 }, 8, 0, 0.5),
  impacto_veneno: golpe({ color: COL.veneno, radio: 160, intensidad: 0.65, altura: 26, sombra: false, prioridad: 1, mezcla: 'normal' }, 8, 0, 0.6),
  impacto_sagrado: golpe({ color: COL.sagrado, radio: 220, intensidad: 1, altura: 36 }, 8, 0, 0.5),
  impacto_hueso: golpe({ color: COL.hueso, radio: 130, intensidad: 0.55, altura: 34, sombra: false, prioridad: 1, mezcla: 'normal' }, 8, 0, 0.4),
  nova_sangre: golpe({ color: COL.sangre, radio: 240, intensidad: 0.8, altura: 20, parpadeo: 0.05, mezcla: 'normal' }, 14, 1, 0.7),
  maldicion_sombra: { color: COL.sombra, radio: 160, intensidad: 0.55, curva: campana(14, 0.2, 0.6), altura: 24, sombra: false, prioridad: 2, mezcla: 'normal' },
  aura_furia: { color: '#ff4a2a', radio: 150, intensidad: 0.55, curva: pulso(12, 0.8, 0.18, 2), altura: 24, parpadeo: 0.1, sombra: false, prioridad: 3 },
  // ---- fuego de Doom (poderes_doom.ts): la curva es el calor medio de la llama en cada cuadro, así la luz y las
  // sombras tiemblan con la llama horneada
  muro_infierno: { color: COL.brasa, radio: 190, intensidad: 0.85, curva: curvaDoom('muro_infierno'), altura: 40, parpadeo: 0.1, sombra: true, prioridad: 2 },
  cerco_llamas: { color: COL.brasa, radio: 230, intensidad: 0.8, curva: curvaDoom('cerco_llamas'), altura: 24, parpadeo: 0.1, sombra: true, prioridad: 2 },
  suelo_ardiente: { color: COL.brasa, radio: 170, intensidad: 0.6, curva: curvaDoom('suelo_ardiente'), altura: 10, parpadeo: 0.12, sombra: false, prioridad: 2 },
  lluvia_brasas: { color: COL.brasa, radio: 240, intensidad: 0.85, curva: curvaDoom('lluvia_brasas'), altura: 20, parpadeo: 0.1, sombra: true, prioridad: 1 },
  pilar_infernal: { color: COL.fuego, radio: 300, intensidad: 1, curva: curvaDoom('pilar_infernal'), altura: 110, parpadeo: 0.06, sombra: true, prioridad: 0 },
  llanto_animas: { color: '#4fd2cc', radio: 250, intensidad: 0.85, curva: curvaDoom('llanto_animas'), altura: 16, parpadeo: 0.08, sombra: true, prioridad: 0 },
  llama_corona_fria: { color: '#cddcff', radio: 140, intensidad: 0.55, curva: curvaDoom('llama_corona_fria'), altura: 50, parpadeo: 0.05, sombra: false, prioridad: 3 },
};

/** Ids nuevos de esta tanda (no reemplazan a nadie: el juego los usa cuando los mapee). */
export const EFECTOS_NUEVOS = ['virote', 'saeta_sagrada', 'saeta_veneno', 'impacto_rayo', 'impacto_veneno', 'impacto_sagrado', 'impacto_hueso', 'nova_sangre', 'maldicion_sombra', 'aura_furia'] as const;

/** Ids nuevos con fuego de Doom (poderes_doom.ts). */
export { EFECTOS_DOOM } from './poderes_doom';

/** Color de la luz como [r, g, b] 0..255 (lo que usa `Luz.c` en el juego). */
export function rgbLuz(id: string): [number, number, number] {
  const c = LUZ_EFECTO[id]?.color ?? '#ffd2a0';
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

/**
 * Intensidad de la luz de un efecto a los `seg` segundos de empezar (a 25 cuadros por segundo con `t` ticks por
 * cuadro). Bucle: la curva se repite; si no, después del último cuadro da 0. Sin parpadeo (el juego pone su azar).
 */
export function intensidadLuz(id: string, seg: number, t: number, bucle: boolean): number {
  const l = LUZ_EFECTO[id];
  if (!l || !l.intensidad) return 0;
  const n = l.curva.length, x = (seg * 25) / t;
  if (!bucle && x >= n) return 0;
  const i = Math.floor(x), fr = x - i;
  const a = l.curva[((i % n) + n) % n], b = l.curva[bucle ? (i + 1) % n : Math.min(n - 1, i + 1)];
  return l.intensidad * (a + (b - a) * fr);
}

/** La tabla como objeto plano (lo que va en datos/luz_efectos.json). */
export function luzEfectosJson(): { formato: string; version: number; cuadros_por_segundo: number; notas: string; efectos: Record<string, LuzEfecto> } {
  const efectos: Record<string, LuzEfecto> = {};
  // claves siempre en el mismo orden (el json se compara en los tests)
  const orden: (keyof LuzEfecto)[] = ['color', 'radio', 'intensidad', 'curva', 'altura', 'parpadeo', 'enVuelo', 'lanzar', 'impacto', 'sombra', 'prioridad', 'mezcla'];
  for (const id of Object.keys(LUZ_EFECTO).sort()) {
    const l = LUZ_EFECTO[id], o: Record<string, unknown> = {};
    for (const k of orden) if (l[k] !== undefined) o[k] = l[k];
    efectos[id] = o as unknown as LuzEfecto;
  }
  return {
    formato: 'pixelforja-gotico-luz-efectos',
    version: 1,
    cuadros_por_segundo: 25,
    notas:
      'radio y altura en px de pantalla a escala 1 (multiplicar por la escala del efecto); luz del cuadro = intensidad * curva[cuadro]; ' +
      'enVuelo: la luz sigue al proyectil; lanzar: fogonazo en la mano; impacto: efecto a soltar al pegar; prioridad 0 = imprescindible; ' +
      "mezcla 'normal': dibujar con alfa (no aditivo) para que se vean la sangre, el hueso y el humo.",
    efectos,
  };
}
