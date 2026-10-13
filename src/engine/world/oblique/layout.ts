/**
 * Layout de un escenario en vista oblicua (beat 'em up o deportes de lado). Lo escribe el juego y PixelForja pinta
 * encima sin mover nada.
 *
 * Medidas en pixeles de mundo: x a lo largo, y es la profundidad dentro de la franja (0 al fondo) y z la altura sobre
 * el piso. En pantalla, sin inclinación: px = x, py = franja.atras + y - z. Una caja muestra su techo (d pixeles de
 * alto) y su frente (z pixeles de alto), como en los beat 'em ups de 8 bits.
 */

export const HORAS = ['amanecer', 'manana', 'mediodia', 'tarde', 'atardecer', 'noche', 'nublado', 'aguacero'] as const;
export type Hora = (typeof HORAS)[number];
export const PISOS = ['asfalto', 'acera', 'tierra', 'baldosa', 'madera', 'metal', 'arena', 'tatami', 'greda', 'cancha', 'pasto', 'agua'] as const;
export type TipoPiso = (typeof PISOS)[number];
export const CLIMAS = ['despejado', 'aguacero', 'llovizna', 'neblina', 'nublado', 'calor', 'viento'] as const;
export const PAISES = ['vietnam', 'colombia', 'venezuela', 'japon'] as const;
export const ENTIDADES = ['salida', 'meta', 'objeto', 'npc', 'animal', 'vehiculo', 'atajo'] as const;
export const CAPAS_DECO = ['lejos', 'cerca', 'frente'] as const;
/**
 * Cómo se ve el escenario. `oblicua` (lo de siempre): la franja en profundidad, con la vista inclinada de la pelea.
 * `lado`: de lado, como Đá cầu o el Tejo: el dibujo va derecho (inclinación 0), el fondo se para en `franja.atras` y el
 * piso es una franja angosta donde el juego pone a los atletas, de `franja.atras` hasta el borde de abajo de la pantalla.
 */
export const VISTAS = ['oblicua', 'lado'] as const;

export interface Rango { x0: number; x1: number; y0?: number; y1?: number }
export interface Caja { x: number; y: number; w: number; d: number; z: number; tipo?: string; subible?: boolean; trepable?: boolean; nota?: string }
export interface Piso extends Rango { tipo: TipoPiso }
export interface Hueco extends Rango { caida: 'agua' | 'vacio'; nombre?: string }
export interface Escalera { x: number; y: number; z0: number; z1: number; tipo?: string }
export interface Poste { x: number; y: number; alto: number; tipo?: string }
export interface Agua { x0: number; x1: number; y0?: number; y1?: number; nivel: number; corriente?: number; nombre?: string }
export interface Bajo extends Rango { z: number; tipo?: string }
export interface Entidad { tipo: (typeof ENTIDADES)[number]; x?: number; y?: number; x0?: number; x1?: number; [k: string]: unknown }
export interface RanuraDeco { x0: number; x1: number; capa: (typeof CAPAS_DECO)[number]; tema: string }

export interface ObliqueLayout {
  id: string;
  nombre?: string;
  pais: (typeof PAISES)[number];
  prueba?: string;
  /** `lado` para las pruebas de lado (sin el campo, `oblicua`). */
  vista?: (typeof VISTAS)[number];
  tramo?: number;
  largo: number;
  franja: { atras: number; adelante: number };
  hora: Hora;
  clima: string[];
  paralaje: { cielo?: string; lejos?: string; cerca?: string };
  piso: Piso[];
  huecos: Hueco[];
  plataformas: Caja[];
  muros: Caja[];
  escaleras: Escalera[];
  postes: Poste[];
  agua: Agua[];
  bajo: Bajo[];
  solidos: Caja[];
  carriles: { y: number }[];
  entidades: Entidad[];
  ranuras_deco: RanuraDeco[];
  vida: string[];
}

/** Las listas de geometría: lo que `colision.json` copia tal cual. */
export const GEOMETRIA = ['piso', 'huecos', 'plataformas', 'muros', 'escaleras', 'postes', 'agua', 'bajo', 'solidos', 'carriles'] as const;

export interface LayoutResult {
  layout: ObliqueLayout | null;
  errores: string[];
  avisos: string[];
}

/** Campos que se leen, por lista. Los de `extra` los agregó un juego: se aceptan y se conservan sin aviso. */
const CAMPOS: Record<string, { req: string[]; opt: string[]; extra?: string[] }> = {
  raiz: {
    req: ['id', 'pais', 'largo', 'franja', 'hora', 'piso'],
    opt: ['prueba', 'vista', 'tramo', 'clima', 'paralaje', 'huecos', 'plataformas', 'muros', 'escaleras', 'postes', 'agua', 'bajo', 'solidos', 'carriles', 'entidades', 'ranuras_deco', 'vida'],
    extra: ['nombre', 'nota', 'version'],
  },
  piso: { req: ['x0', 'x1', 'tipo'], opt: ['y0', 'y1'], extra: ['nombre', 'nota'] },
  huecos: { req: ['x0', 'x1', 'y0', 'y1', 'caida'], opt: [], extra: ['nombre', 'nota'] },
  plataformas: { req: ['x', 'y', 'w', 'd', 'z'], opt: ['tipo', 'subible'], extra: ['nombre', 'nota'] },
  muros: { req: ['x', 'y', 'w', 'd', 'z'], opt: ['trepable'], extra: ['tipo', 'nombre', 'nota'] },
  solidos: { req: ['x', 'y', 'w', 'd', 'z'], opt: [], extra: ['tipo', 'nombre', 'nota'] },
  escaleras: { req: ['x', 'y', 'z0', 'z1'], opt: ['tipo'], extra: ['nombre', 'nota'] },
  postes: { req: ['x', 'y', 'alto'], opt: ['tipo'], extra: ['nombre', 'nota'] },
  agua: { req: ['x0', 'x1', 'nivel'], opt: ['corriente'], extra: ['nombre', 'nota', 'y0', 'y1'] },
  bajo: { req: ['x0', 'x1', 'z'], opt: ['tipo'], extra: ['y0', 'y1', 'nombre', 'nota'] },
  carriles: { req: ['y'], opt: [], extra: ['nombre', 'nota'] },
  ranuras_deco: { req: ['x0', 'x1', 'capa', 'tema'], opt: [], extra: ['nombre', 'nota'] },
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Lee y valida un layout. Nunca cambia la geometría: si algo está mal da error, y si trae campos que PixelForja no
 * usa los deja pasar con un aviso (los conocidos de los juegos, como `nombre`, `nota` o `tipo`, pasan sin aviso).
 */
export function validateLayout(raw: unknown): LayoutResult {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { layout: null, errores: ['El layout tiene que ser un objeto JSON.'], avisos };
  const L = raw as Record<string, unknown>;
  const campos = (obj: Record<string, unknown>, lista: string, donde: string) => {
    const c = CAMPOS[lista];
    for (const k of c.req) if (obj[k] === undefined) errores.push(`${donde}: falta \`${k}\`.`);
    for (const k of Object.keys(obj)) if (!c.req.includes(k) && !c.opt.includes(k) && !c.extra?.includes(k)) avisos.push(`${donde}: \`${k}\` no lo usa PixelForja. Se conserva tal cual.`);
  };
  campos(L, 'raiz', 'layout');

  if (typeof L.id !== 'string' || !/^[a-z0-9_]+$/.test(L.id)) errores.push('`id` va en minúsculas, números y guion bajo, como `saigon_hem`.');
  if (L.pais !== undefined && !PAISES.includes(L.pais as never)) errores.push(`\`pais\` "${String(L.pais)}" no existe. Van: ${PAISES.join(', ')}.`);
  if (L.vista !== undefined && !VISTAS.includes(L.vista as never)) errores.push(`\`vista\` "${String(L.vista)}" no existe. Van: ${VISTAS.join(', ')}.`);
  if (L.hora !== undefined && !HORAS.includes(L.hora as never)) errores.push(`\`hora\` "${String(L.hora)}" no existe. Van: ${HORAS.join(', ')}.`);
  const largo = isNum(L.largo) && L.largo > 0 ? L.largo : 0;
  if (L.largo !== undefined && !largo) errores.push('`largo` tiene que ser un número mayor que 0.');
  const fr = L.franja as { atras?: unknown; adelante?: unknown } | undefined;
  let D = 0;
  if (fr !== undefined) {
    if (!fr || !isNum(fr.atras) || !isNum(fr.adelante) || fr.adelante <= fr.atras) errores.push('`franja` lleva `atras` y `adelante`, con `adelante` mayor que `atras`.');
    else D = fr.adelante - fr.atras;
  }
  const clima = L.clima === undefined ? ['despejado'] : L.clima;
  if (!Array.isArray(clima) || clima.some((c) => typeof c !== 'string')) errores.push('`clima` es una lista de textos, como ["despejado", "aguacero"].');
  else for (const c of clima) if (!CLIMAS.includes(c as never)) avisos.push(`clima "${c}" no lo pinta PixelForja todavía. Van: ${CLIMAS.join(', ')}.`);

  const lista = (k: string): Record<string, unknown>[] => {
    const v = L[k];
    if (v === undefined) return [];
    if (!Array.isArray(v)) { errores.push(`\`${k}\` tiene que ser una lista.`); return []; }
    return v.map((it, i) => {
      if (!it || typeof it !== 'object' || Array.isArray(it)) { errores.push(`${k}[${i}] tiene que ser un objeto.`); return {}; }
      if (CAMPOS[k]) campos(it as Record<string, unknown>, k, `${k}[${i}]`);
      return it as Record<string, unknown>;
    });
  };
  const enX = (v: unknown, donde: string, campo: string) => { if (isNum(v) && largo && (v < 0 || v > largo)) errores.push(`${donde}: \`${campo}\` ${v} queda fuera del largo (0 a ${largo}).`); };
  const enY = (v: unknown, donde: string, campo: string) => { if (isNum(v) && D && (v < 0 || v > D)) errores.push(`${donde}: \`${campo}\` ${v} queda fuera de la franja (0 a ${D}).`); };
  const nums = (o: Record<string, unknown>, ks: string[], donde: string) => { for (const k of ks) if (o[k] !== undefined && !isNum(o[k])) errores.push(`${donde}: \`${k}\` tiene que ser un número.`); };
  const rango = (o: Record<string, unknown>, donde: string) => {
    nums(o, ['x0', 'x1', 'y0', 'y1'], donde);
    if (isNum(o.x0) && isNum(o.x1) && o.x1 <= o.x0) errores.push(`${donde}: \`x1\` tiene que ser mayor que \`x0\`.`);
    if (isNum(o.y0) && isNum(o.y1) && o.y1 <= o.y0) errores.push(`${donde}: \`y1\` tiene que ser mayor que \`y0\`.`);
    enX(o.x0, donde, 'x0'); enX(o.x1, donde, 'x1'); enY(o.y0, donde, 'y0'); enY(o.y1, donde, 'y1');
  };
  const caja = (o: Record<string, unknown>, donde: string) => {
    nums(o, ['x', 'y', 'w', 'd', 'z'], donde);
    for (const k of ['w', 'd', 'z']) if (isNum(o[k]) && (o[k] as number) <= 0) errores.push(`${donde}: \`${k}\` tiene que ser mayor que 0.`);
    enX(o.x, donde, 'x');
    if (isNum(o.x) && isNum(o.w)) enX(o.x + o.w, donde, 'x + w');
    enY(o.y, donde, 'y');
    if (isNum(o.y) && isNum(o.d)) enY(o.y + o.d, donde, 'y + d');
  };

  lista('piso').forEach((p, i) => { rango(p, `piso[${i}]`); if (p.tipo !== undefined && !PISOS.includes(p.tipo as never)) errores.push(`piso[${i}]: tipo "${String(p.tipo)}" no existe. Van: ${PISOS.join(', ')}.`); });
  if (L.piso !== undefined && Array.isArray(L.piso) && !L.piso.length) errores.push('`piso` no puede ir vacío.');
  lista('huecos').forEach((h, i) => { rango(h, `huecos[${i}]`); if (h.caida !== undefined && h.caida !== 'agua' && h.caida !== 'vacio') errores.push(`huecos[${i}]: \`caida\` es "agua" o "vacio".`); });
  for (const k of ['plataformas', 'muros', 'solidos']) lista(k).forEach((c, i) => caja(c, `${k}[${i}]`));
  lista('escaleras').forEach((e, i) => { nums(e, ['x', 'y', 'z0', 'z1'], `escaleras[${i}]`); enX(e.x, `escaleras[${i}]`, 'x'); enY(e.y, `escaleras[${i}]`, 'y'); if (isNum(e.z0) && isNum(e.z1) && e.z1 <= e.z0) errores.push(`escaleras[${i}]: \`z1\` tiene que ser mayor que \`z0\`.`); });
  lista('postes').forEach((p, i) => { nums(p, ['x', 'y', 'alto'], `postes[${i}]`); enX(p.x, `postes[${i}]`, 'x'); enY(p.y, `postes[${i}]`, 'y'); if (isNum(p.alto) && p.alto <= 0) errores.push(`postes[${i}]: \`alto\` tiene que ser mayor que 0.`); });
  lista('agua').forEach((a, i) => { rango(a, `agua[${i}]`); nums(a, ['nivel', 'corriente'], `agua[${i}]`); if (isNum(a.nivel) && a.nivel < 0) errores.push(`agua[${i}]: \`nivel\` no puede ser negativo.`); });
  lista('bajo').forEach((b, i) => { rango(b, `bajo[${i}]`); nums(b, ['z'], `bajo[${i}]`); if (isNum(b.z) && b.z <= 0) errores.push(`bajo[${i}]: \`z\` tiene que ser mayor que 0.`); });
  lista('carriles').forEach((c, i) => { nums(c, ['y'], `carriles[${i}]`); enY(c.y, `carriles[${i}]`, 'y'); });
  lista('ranuras_deco').forEach((r, i) => { rango(r, `ranuras_deco[${i}]`); if (r.capa !== undefined && !CAPAS_DECO.includes(r.capa as never)) errores.push(`ranuras_deco[${i}]: \`capa\` es ${CAPAS_DECO.join(', ')}.`); });
  const ents = lista('entidades');
  ents.forEach((e, i) => {
    if (!ENTIDADES.includes(e.tipo as never)) errores.push(`entidades[${i}]: tipo "${String(e.tipo)}" no existe. Van: ${ENTIDADES.join(', ')}.`);
    for (const k of ['x', 'x0', 'x1']) if (e[k] !== undefined) { nums(e, [k], `entidades[${i}]`); enX(e[k], `entidades[${i}]`, k); }
    if (e.y !== undefined) { nums(e, ['y'], `entidades[${i}]`); enY(e.y, `entidades[${i}]`, 'y'); }
    if (e.tipo === 'vehiculo' && isNum(e.carril) && Array.isArray(L.carriles) && (e.carril < 1 || e.carril > L.carriles.length)) errores.push(`entidades[${i}]: carril ${e.carril} no existe (hay ${L.carriles.length}).`);
  });
  if (L.vida !== undefined && (!Array.isArray(L.vida) || L.vida.some((v) => typeof v !== 'string'))) errores.push('`vida` es una lista de textos.');
  // sin salida ni meta es una arena (la pelea): el camino revisa que se llegue a todo el piso. Con solo una, falta la otra
  const conSalida = ents.some((e) => e.tipo === 'salida'), conMeta = ents.some((e) => e.tipo === 'meta');
  if (L.prueba !== undefined && ents.length && conSalida !== conMeta) for (const t of ['salida', 'meta'] as const) if (!ents.some((e) => e.tipo === t)) avisos.push(`Una prueba sin \`${t}\` en las entidades: la prueba de camino no se puede revisar.`);

  if (errores.length) return { layout: null, errores, avisos };
  const lay: ObliqueLayout = {
    ...(L as unknown as ObliqueLayout),
    clima: clima as string[],
    paralaje: (L.paralaje as ObliqueLayout['paralaje']) ?? {},
  };
  for (const k of ['huecos', 'plataformas', 'muros', 'escaleras', 'postes', 'agua', 'bajo', 'solidos', 'carriles', 'entidades', 'ranuras_deco', 'vida'] as const) (lay as unknown as Record<string, unknown>)[k] ??= [];
  // Que el piso cubra toda la franja: la prueba 3 lo exige donde no hay hueco ni agua.
  const sinPiso = uncovered(lay);
  if (sinPiso) avisos.push(`El piso no cubre la franja en x ${sinPiso[0]}, y ${sinPiso[1]}: ahí se ve el fondo.`);
  return { layout: lay, errores, avisos };
}

/** ¿El escenario va de lado? Ahí el dibujo va derecho: inclinación 0. */
export const deLado = (L: Pick<ObliqueLayout, 'vista'>) => L.vista === 'lado';

/** Alto de la franja (profundidad jugable). */
export const depthOf = (L: ObliqueLayout) => L.franja.adelante - L.franja.atras;

/** De mundo a pantalla, a escala 1. */
export const toScreen = (L: ObliqueLayout, x: number, y: number, z = 0): [number, number] => [x, L.franja.atras + y - z];

/** El tipo de piso en (x, y), con el último que cubre ganando (así la acera va encima del asfalto). */
export function floorAt(L: ObliqueLayout, x: number, y: number): TipoPiso | null {
  const D = depthOf(L);
  let t: TipoPiso | null = null;
  for (const p of L.piso) if (x >= p.x0 && x < p.x1 && y >= (p.y0 ?? 0) && y < (p.y1 ?? D)) t = p.tipo;
  return t;
}

/** Hueco en (x, y), si hay. */
export const holeAt = (L: ObliqueLayout, x: number, y: number) => L.huecos.find((h) => x >= h.x0 && x < h.x1 && y >= (h.y0 ?? 0) && y < (h.y1 ?? depthOf(L)));

/** Agua en (x, y), si hay. */
export const waterAt = (L: ObliqueLayout, x: number, y: number) => L.agua.find((a) => x >= a.x0 && x < a.x1 && y >= (a.y0 ?? 0) && y < (a.y1 ?? depthOf(L)));

/** El primer punto de la franja que no tiene piso ni hueco, o null. Se revisa cada 2 px. */
function uncovered(L: ObliqueLayout): [number, number] | null {
  const D = depthOf(L);
  for (let x = 0; x < L.largo; x += 2) for (let y = 0; y < D; y += 2) if (!floorAt(L, x, y) && !holeAt(L, x, y)) return [x, y];
  return null;
}

/** Todas las cajas con su lista de origen, en orden de dibujo (de atrás hacia adelante). */
export function boxesOf(L: ObliqueLayout): (Caja & { lista: 'plataformas' | 'muros' | 'solidos' })[] {
  return [
    ...L.plataformas.map((c) => ({ ...c, lista: 'plataformas' as const })),
    ...L.muros.map((c) => ({ ...c, lista: 'muros' as const })),
    ...L.solidos.map((c) => ({ ...c, lista: 'solidos' as const })),
  ].sort((a, b) => a.y + a.d - (b.y + b.d) || a.x - b.x);
}

/** La geometría del layout, tal cual: es `colision.json`. */
export function collisionOf(L: ObliqueLayout) {
  const out: Record<string, unknown> = { id: L.id, largo: L.largo, franja: L.franja };
  for (const k of GEOMETRIA) out[k] = L[k];
  return out;
}
