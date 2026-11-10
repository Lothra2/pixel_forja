// La animación de cada clase según la Forja (src/engine/gotico/animacion_heroes.json): cuántos cuadros tiene cada acción,
// en qué cuadro cae el impacto y cuánto avanza por ciclo de pasos. Son datos: si la Forja cambia un número, el juego lo sigue.
import ANIM from '../../../src/engine/gotico/animacion_heroes.json';
import CORRER_MON from '../../../src/engine/gotico/datos/zancada_correr_monstruos.json';

interface Acc { cuadros: number; t: number; impacto?: number; golpeEn?: number; golpes?: number[] }
const CLASES = (ANIM as any).clases as Record<string, { estilo: string; zancada: { caminar: number; correr: number }; acciones: Record<string, Acc> }>;
/** Cuadros de los monstruos (y de todo lo que no es un héroe). */
export const CUADROS_MONSTRUO = (ANIM as any).monstruos as Record<string, number>;

export const animClase = (clase: string, acc: string): Acc | undefined => CLASES[clase]?.acciones[acc];
/** Cuadros de una acción del héroe de esa clase. */
export const cuadrosClase = (clase: string, acc: string): number => CLASES[clase]?.acciones[acc]?.cuadros ?? CUADROS_MONSTRUO[acc] ?? 8;
/** En qué fracción de la acción (0 a 1) pega: el cuadro de impacto de la clase sobre sus cuadros. */
export const golpeEnClase = (clase: string, acc: string): number => { const a = CLASES[clase]?.acciones[acc]; return a?.golpeEn ?? (a?.impacto !== undefined ? a.impacto / a.cuadros : 0.55); };
/** Casillas que avanza el héroe por ciclo de pasos (sin su alto: eso lo pone quien dibuja). Una casilla son 16 unidades del motor. */
export const zancadaClase = (clase: string, acc: 'caminar' | 'correr'): number | undefined => { const z = CLASES[clase]?.zancada?.[acc]; return z ? z / 16 : undefined; };
/** Casillas por ciclo de 'correr' de los monstruos que galopan o aletean con ritmo propio (a escala 1). */
export const zancadaCorrerMonstruo = (sprite: string): number | undefined => (CORRER_MON as Record<string, number>)[sprite];
/** Todas las acciones del héroe con sus cuadros, para pintarlo en vivo. */
export const accionesClase = (clase: string): [string, number][] => Object.entries(CLASES[clase]?.acciones ?? {}).map(([a, v]) => [a, v.cuadros]);
/** Los cuadros en que pega un combo (el monje: tres golpes en su ataque), como fracciones de la acción. Sin combo, nada. */
export const golpesClase = (clase: string, acc: string): number[] | undefined => { const a = CLASES[clase]?.acciones[acc]; return a?.golpes?.length ? a.golpes.map((c) => c / a.cuadros) : undefined; };
