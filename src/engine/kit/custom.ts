import type { ExportFile } from '../export/bundle';
import { FRAME_DATA_FIELDS, ROW_NAMES, type FrameDataField } from '../export/frameData';
import { HUMAN_ANIMS } from '../anim/registry';
import { FLOOR_PROP_KINDS, type FloorPropKind } from '../render/props';
import { isHuman, CELL_SIZES, type AnimalFicha, type CellSize, type Ficha, type HumanFicha } from '../sheet/ficha';
import { familyFicha, FAMILY, thorFicha } from '../rpg/family';
import { heroFicha, heroCell, HEROES } from '../rpg/heroes';
import { buildSportsKit, compactJson } from './sportskit';

/**
 * Kit a medida: el juego describe en un kit.config.json qué personajes, packs de animaciones, objetos, animales y
 * fuentes necesita, y PixelForja arma el kit del contrato (manifest.json + atlas PNG). Sirve para cualquier juego: lo
 * propio de cada uno vive en su configuración, no en el código.
 *
 * Versión inicial: atletas (con sus packs, datos por cuadro, retratos, cabecitas y vestuario), equipos, pruebas,
 * armas del piso, animales y fuentes. Lo que todavía no genera (escenarios, público, NPC, vehículos, efectos, audio,
 * logo) se acepta en la configuración y vuelve como aviso, para que el juego sepa qué falta.
 */

export interface KitConfig {
  /** nombre del juego (va al manifiesto) */
  juego: string;
  /** resolución interna del juego, para el manifiesto */
  resolucion?: [number, number];
  /** celda de los atletas (un gigante usa la de su ficha) */
  celda?: CellSize;
  /** filas de las hojas, en orden (sin valor: las 8 direcciones) */
  filas?: string[];
  /** datos por cuadro: true = todos, o la lista */
  datos_por_cuadro?: boolean | FrameDataField[];
  /** carpeta con *.ficha.json (la lee la línea de comandos) */
  fichas?: string;
  /** personajes que ya trae el motor: la familia GG (de calle o con su equipo de GG Abyss) y los héroes */
  personajes_incluidos?: IncludedCast[];
  /** archivo de equipos (lo lee la línea de comandos) */
  equipos?: string;
  /** cada pack: su nombre y sus animaciones */
  packs: Record<string, string[]>;
  /** qué packs carga cada prueba del juego (se copia al manifiesto) */
  pruebas?: Record<string, string[]>;
  /** retratos de 7 expresiones (sin valor: sí) */
  retratos?: boolean;
  /** cabecitas de 12 x 12 (sin valor: sí) */
  cabecitas?: boolean;
  /** armas del piso: true = todas, o la lista */
  objetos?: boolean | string[];
  /** animales: de las fichas o del motor (thor) */
  animales?: string[];
  ui?: { fuentes?: boolean | { idiomas?: string[] }; logo?: { texto: string } };
  // lo que todavía no genera el kit a medida (se acepta y vuelve como aviso)
  escenarios?: unknown; publico?: unknown; npc?: unknown; vehiculos?: unknown; fx?: unknown; audio?: unknown;
}

/** Un equipo del archivo de equipos. Lo que no se usa para armar el kit pasa al manifiesto tal cual. */
export interface TeamDef { nombre: string; atletas: string[]; mascota?: string; colores?: string[]; [k: string]: unknown }

export const INCLUDED_CAST = ['familia', 'familia_rpg', 'heroes'] as const;
export type IncludedCast = (typeof INCLUDED_CAST)[number];

export const KIT_PARTS = ['atletas', 'retratos', 'cabecitas', 'objetos', 'animales', 'fuentes'] as const;
export type KitPart = (typeof KIT_PARTS)[number];

/** Las secciones que todavía no genera el kit a medida, y el lote del pedido que las trae. */
export const PENDING_SECTIONS: Record<string, string> = {
  escenarios: 'escenarios oblicuos (lote E)', publico: 'público (lote C6)', npc: 'NPC (lote C6)',
  vehiculos: 'vehículos (lote D2)', fx: 'efectos (lote F)', audio: 'audio (lote H)',
};
const KNOWN_KEYS = ['$schema', 'juego', 'resolucion', 'celda', 'filas', 'datos_por_cuadro', 'fichas', 'personajes_incluidos', 'equipos', 'packs', 'pruebas', 'retratos', 'cabecitas', 'objetos', 'animales', 'ui', ...Object.keys(PENDING_SECTIONS)];
const ANIM_NAMES = HUMAN_ANIMS.map((a) => a.name);
const IDIOMAS = ['es', 'en', 'vi'];

/** Distancia de edición, para sugerir el nombre correcto. */
function dist(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const suggest = (s: string, opts: readonly string[]) => {
  const best = [...opts].sort((x, y) => dist(s, x) - dist(s, y))[0];
  return best && dist(s, best) <= Math.max(2, Math.floor(s.length / 3)) ? ` ¿Quisiste decir "${best}"?` : '';
};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isStrList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * Revisa la configuración y devuelve los errores en castellano, con la ruta del campo y una sugerencia cuando hay un
 * nombre mal escrito. Lista vacía: está bien.
 */
export function validateKitConfig(cfg: unknown): string[] {
  const e: string[] = [];
  if (!isObj(cfg)) return ['la configuración tiene que ser un objeto JSON'];
  for (const k of Object.keys(cfg)) if (!KNOWN_KEYS.includes(k)) e.push(`"${k}": clave desconocida.${suggest(k, KNOWN_KEYS)}`);
  if (typeof cfg.juego !== 'string' || !cfg.juego.trim()) e.push('juego: falta el nombre del juego');
  if (cfg.resolucion !== undefined && !(Array.isArray(cfg.resolucion) && cfg.resolucion.length === 2 && cfg.resolucion.every((n) => Number.isInteger(n) && n > 0)))
    e.push('resolucion: tiene que ser [ancho, alto] en pixeles, por ejemplo [640, 360]');
  if (cfg.celda !== undefined && !CELL_SIZES.includes(cfg.celda as CellSize)) e.push(`celda: tiene que ser ${CELL_SIZES.join(', ')}`);
  if (cfg.filas !== undefined) {
    if (!isStrList(cfg.filas) || !(cfg.filas as string[]).length) e.push('filas: tiene que ser una lista de filas, por ejemplo ["right", "down_right", "up_right", "down", "up"]');
    else {
      (cfg.filas as string[]).forEach((f, i) => { if (!ROW_NAMES.includes(f)) e.push(`filas[${i}]: "${f}" no es una fila.${suggest(f, ROW_NAMES)} Se puede pedir: ${ROW_NAMES.join(', ')}`); });
      if (new Set(cfg.filas as string[]).size !== (cfg.filas as string[]).length) e.push('filas: hay filas repetidas');
    }
  }
  const dpc = cfg.datos_por_cuadro;
  if (dpc !== undefined && typeof dpc !== 'boolean') {
    if (!isStrList(dpc)) e.push(`datos_por_cuadro: true o una lista de ${FRAME_DATA_FIELDS.join(', ')}`);
    else (dpc as string[]).forEach((f, i) => { if (!FRAME_DATA_FIELDS.includes(f as FrameDataField)) e.push(`datos_por_cuadro[${i}]: "${f}" no es un dato.${suggest(f, FRAME_DATA_FIELDS)}`); });
  }
  for (const k of ['fichas', 'equipos'] as const) if (cfg[k] !== undefined && typeof cfg[k] !== 'string') e.push(`${k}: tiene que ser una ruta`);
  if (cfg.personajes_incluidos !== undefined) {
    const opts = INCLUDED_CAST.map((c) => `"${c}"`).join(', ');
    if (!isStrList(cfg.personajes_incluidos)) e.push(`personajes_incluidos: lista con ${opts}`);
    else {
      const list = cfg.personajes_incluidos as string[];
      list.forEach((p, i) => { if (!INCLUDED_CAST.includes(p as IncludedCast)) e.push(`personajes_incluidos[${i}]: "${p}" no existe (hay ${opts}).${suggest(p, INCLUDED_CAST)}`); });
      if (list.includes('familia') && list.includes('familia_rpg')) e.push('personajes_incluidos: "familia" y "familia_rpg" son los mismos cuatro, elige uno');
    }
  }
  if (!cfg.fichas && !cfg.personajes_incluidos) e.push('faltan personajes: pon "fichas" (una carpeta con *.ficha.json) o "personajes_incluidos"');
  if (!isObj(cfg.packs) || !Object.keys(cfg.packs).length) e.push('packs: falta al menos un pack, por ejemplo { "base": ["idle", "walk", "run"] }');
  else for (const [p, list] of Object.entries(cfg.packs)) {
    if (!/^[a-z0-9_]+$/.test(p)) e.push(`packs.${p}: el nombre del pack va en minúsculas, números y _`);
    if (!isStrList(list) || !(list as string[]).length) { e.push(`packs.${p}: tiene que ser una lista de animaciones`); continue; }
    (list as string[]).forEach((a, i) => { if (!ANIM_NAMES.includes(a)) e.push(`packs.${p}[${i}]: "${a}" no es una animación.${suggest(a, ANIM_NAMES)}`); });
  }
  if (cfg.pruebas !== undefined) {
    if (!isObj(cfg.pruebas)) e.push('pruebas: tiene que ser un objeto prueba -> lista de packs');
    else for (const [t, list] of Object.entries(cfg.pruebas)) {
      if (!isStrList(list)) { e.push(`pruebas.${t}: tiene que ser una lista de packs`); continue; }
      const packs = isObj(cfg.packs) ? Object.keys(cfg.packs) : [];
      (list as string[]).forEach((p, i) => { if (!packs.includes(p)) e.push(`pruebas.${t}[${i}]: el pack "${p}" no está en packs.${suggest(p, packs)}`); });
    }
  }
  for (const k of ['retratos', 'cabecitas'] as const) if (cfg[k] !== undefined && typeof cfg[k] !== 'boolean') e.push(`${k}: true o false`);
  if (cfg.objetos !== undefined && typeof cfg.objetos !== 'boolean') {
    if (!isStrList(cfg.objetos)) e.push('objetos: true o una lista de armas del piso');
    else (cfg.objetos as string[]).forEach((o, i) => { if (!FLOOR_PROP_KINDS.includes(o as FloorPropKind)) e.push(`objetos[${i}]: "${o}" no es un arma del piso.${suggest(o, FLOOR_PROP_KINDS)}`); });
  }
  if (cfg.animales !== undefined && !isStrList(cfg.animales)) e.push('animales: tiene que ser una lista de ids');
  if (cfg.ui !== undefined) {
    if (!isObj(cfg.ui)) e.push('ui: tiene que ser un objeto');
    else {
      for (const k of Object.keys(cfg.ui)) if (k !== 'fuentes' && k !== 'logo') e.push(`ui.${k}: clave desconocida (hay "fuentes" y "logo")`);
      const fu = cfg.ui.fuentes;
      if (fu !== undefined && typeof fu !== 'boolean') {
        if (!isObj(fu)) e.push('ui.fuentes: true o { "idiomas": [...] }');
        else if (fu.idiomas !== undefined) {
          if (!isStrList(fu.idiomas)) e.push('ui.fuentes.idiomas: lista de idiomas');
          else (fu.idiomas as string[]).forEach((l, i) => { if (!IDIOMAS.includes(l)) e.push(`ui.fuentes.idiomas[${i}]: "${l}" todavía no está (hay ${IDIOMAS.join(', ')})`); });
        }
      }
      if (cfg.ui.logo !== undefined && !(isObj(cfg.ui.logo) && typeof cfg.ui.logo.texto === 'string')) e.push('ui.logo: { "texto": "..." }');
    }
  }
  return e;
}

/**
 * El esquema JSON de kit.config.json (docs/kit-a-medida.schema.json). Sale de las mismas listas que usa el motor, así
 * que el editor autocompleta animaciones, filas y armas, y nunca se desfasa: una prueba revisa que el archivo coincida.
 */
export function kitConfigSchema(): Record<string, unknown> {
  const list = (items: unknown, extra: Record<string, unknown> = {}) => ({ type: 'array', items, uniqueItems: true, ...extra });
  const id = { type: 'string', pattern: '^[a-z0-9_]+$' };
  const pending = Object.fromEntries(Object.entries(PENDING_SECTIONS).map(([k, what]) => [k, { description: `Todavía no se genera: se acepta y vuelve como aviso en manifest.pendiente. Llega con ${what}.` }]));
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://github.com/Lothra2/pixel_forja/blob/main/docs/kit-a-medida.schema.json',
    title: 'kit.config.json de PixelForja',
    description: 'Lo que un juego le pide a PixelForja: personajes, packs de animaciones, objetos, animales y fuentes. npm run kit-a-medida -- <salida> --config kit.config.json. Ver docs/KIT_A_MEDIDA.md.',
    type: 'object',
    additionalProperties: false,
    required: ['juego', 'packs'],
    anyOf: [{ required: ['fichas'] }, { required: ['personajes_incluidos'] }],
    properties: {
      $schema: { type: 'string' },
      juego: { type: 'string', minLength: 1, description: 'Nombre del juego. Va al manifiesto.' },
      resolucion: { type: 'array', items: { type: 'integer', minimum: 1 }, minItems: 2, maxItems: 2, description: 'Resolución interna del juego [ancho, alto], para el manifiesto.' },
      celda: { enum: [...CELL_SIZES], description: 'Celda de los atletas en pixeles. Un gigante usa la de su ficha (cell).' },
      filas: list({ enum: ROW_NAMES }, { minItems: 1, description: 'Filas de las hojas, en orden. Sin valor: las 8 direcciones. Un juego que espeja usa ["right", "down_right", "up_right", "down", "up"].' }),
      datos_por_cuadro: { oneOf: [{ type: 'boolean' }, list({ enum: FRAME_DATA_FIELDS })], description: 'Datos por fila y cuadro en el manifiesto: true = todos, o la lista.' },
      fichas: { type: 'string', description: 'Carpeta con *.ficha.json, relativa a este archivo. El id de cada personaje es el nombre del archivo.' },
      personajes_incluidos: list({ enum: INCLUDED_CAST }, { description: 'Personajes que ya trae el motor: la familia GG de calle, la familia GG con su equipo de GG Abyss, los héroes.' }),
      equipos: { type: 'string', description: 'Archivo de equipos, relativo a este archivo: { id: { nombre, atletas, mascota?, colores?, ... } }. Pasa al manifiesto tal cual.' },
      packs: { type: 'object', minProperties: 1, propertyNames: id, additionalProperties: list({ enum: ANIM_NAMES }, { minItems: 1 }), description: 'Cada pack es un atlas por atleta: { "base": ["idle", "walk", "run"] }.' },
      pruebas: { type: 'object', additionalProperties: list({ type: 'string' }), description: 'Qué packs carga cada prueba del juego. Se copia al manifiesto.' },
      retratos: { type: 'boolean', description: 'Retratos de 7 expresiones en 40 y 96. Sin valor: sí.' },
      cabecitas: { type: 'boolean', description: 'Cabecitas de 12 x 12 para el minimapa. Sin valor: sí.' },
      objetos: { oneOf: [{ type: 'boolean' }, list({ enum: FLOOR_PROP_KINDS })], description: 'Armas del piso: true = todas, o la lista.' },
      animales: list(id, { description: 'Animales: los de las fichas y thor, que trae el motor.' }),
      ui: {
        type: 'object', additionalProperties: false,
        properties: {
          fuentes: { oneOf: [{ type: 'boolean' }, { type: 'object', additionalProperties: false, properties: { idiomas: list({ enum: IDIOMAS }) } }], description: 'Las tres fuentes bitmap (con vietnamita) en ui/fuentes.' },
          logo: { type: 'object', required: ['texto'], properties: { texto: { type: 'string' } }, description: 'Todavía no se genera: llega con el resto del lote G1.' },
        },
      },
      ...pending,
    },
  };
}

/** Revisa el archivo de equipos contra los personajes y animales que hay. */
export function validateTeams(teams: unknown, athletes: string[], animals: string[]): string[] {
  const e: string[] = [];
  if (!isObj(teams)) return ['equipos: el archivo tiene que ser un objeto id -> equipo'];
  const seen = new Map<string, string>();
  for (const [id, t] of Object.entries(teams)) {
    if (!/^[a-z0-9_]+$/.test(id)) e.push(`equipos.${id}: el id va en minúsculas, números y _`);
    if (!isObj(t)) { e.push(`equipos.${id}: tiene que ser un objeto`); continue; }
    if (typeof t.nombre !== 'string') e.push(`equipos.${id}.nombre: falta`);
    if (!isStrList(t.atletas)) { e.push(`equipos.${id}.atletas: tiene que ser una lista de ids`); continue; }
    (t.atletas as string[]).forEach((a, i) => {
      if (!athletes.includes(a)) e.push(`equipos.${id}.atletas[${i}]: no hay ficha de "${a}".${suggest(a, athletes)}`);
      if (seen.has(a)) e.push(`equipos.${id}.atletas[${i}]: "${a}" ya está en el equipo ${seen.get(a)}`);
      seen.set(a, id);
    });
    if (t.mascota !== undefined && !animals.includes(t.mascota as string)) e.push(`equipos.${id}.mascota: no hay ficha del animal "${t.mascota}".${suggest(String(t.mascota), animals)}`);
  }
  return e;
}

export interface KitInputs {
  /** fichas por id (las de la carpeta `fichas`) */
  fichas?: Record<string, Ficha>;
  /** el archivo de equipos ya leído */
  equipos?: Record<string, TeamDef>;
  /** archivos de Silkscreen, para las fuentes */
  fuentes?: { regular: ArrayBuffer; bold: ArrayBuffer };
}

export interface CustomKitOptions {
  /** 2 animaciones por pack, para probar rápido */
  quick?: boolean;
  /** solo estas partes del kit */
  solo?: KitPart[];
  progress?: (msg: string) => void;
}

/** Los personajes y animales del kit: los de las fichas y los que ya trae el motor. */
function cast(cfg: KitConfig, inputs: KitInputs) {
  const humans: Record<string, HumanFicha> = {};
  const animals: Record<string, AnimalFicha> = {};
  const cells: Record<string, CellSize> = {};
  for (const p of cfg.personajes_incluidos ?? []) {
    if (p === 'familia' || p === 'familia_rpg') for (const id of FAMILY) humans[id] = { ...familyFicha(id, p === 'familia_rpg'), movementProfile: 'premium' };
    if (p === 'heroes') for (const id of HEROES) { humans[id] = heroFicha(id); cells[id] = heroCell(id); }
  }
  for (const [id, f] of Object.entries(inputs.fichas ?? {})) {
    // los deportes y la pelea salen con el movimiento premium aunque la ficha diga clásico
    if (isHuman(f)) humans[id] = { ...f, movementProfile: 'premium' };
    else animals[id] = { ...f, movementProfile: 'premium' };
  }
  // Thor viene con el motor
  if (!animals.thor && (cfg.animales?.includes('thor') || Object.values(inputs.equipos ?? {}).some((t) => t.mascota === 'thor'))) animals.thor = thorFicha();
  return { humans, animals, cells };
}

/**
 * Arma el kit a medida. Devuelve los archivos y los avisos (lo que la configuración pide y todavía no se genera).
 * Lanza un error con todos los problemas si la configuración o los equipos están mal.
 */
export function buildCustomKit(cfg: KitConfig, inputs: KitInputs = {}, opts: CustomKitOptions = {}): { files: ExportFile[]; warnings: string[] } {
  const errs = validateKitConfig(cfg);
  const { humans, animals, cells } = cast(cfg, inputs);
  if (inputs.equipos) errs.push(...validateTeams(inputs.equipos, Object.keys(humans), Object.keys(animals)));
  if (!Object.keys(humans).length) errs.push('no hay ningún personaje: la carpeta de fichas está vacía y no hay personajes_incluidos');
  if (cfg.ui?.fuentes && !inputs.fuentes) errs.push('ui.fuentes: faltan los archivos de Silkscreen');
  if (errs.length) throw new Error(`La configuración del kit tiene ${errs.length} problema${errs.length > 1 ? 's' : ''}:\n  ${errs.join('\n  ')}`);

  const warnings: string[] = [];
  for (const [k, what] of Object.entries(PENDING_SECTIONS)) if ((cfg as unknown as Record<string, unknown>)[k] !== undefined) warnings.push(`${k}: todavía no se genera, llega con ${what}`);
  if (cfg.ui?.logo) warnings.push('ui.logo: todavía no se genera, llega con el resto del lote G1');
  // animales pedidos que no tienen ficha: llegan con el lote C7 (especies nuevas) o falta su ficha
  const wantedAnimals = [...new Set([...(cfg.animales ?? []), ...Object.values(inputs.equipos ?? {}).map((t) => t.mascota).filter((m): m is string => !!m)])];
  const missing = wantedAnimals.filter((a) => !animals[a]);
  if (missing.length) warnings.push(`animales sin ficha (se saltan; las especies nuevas llegan con el lote C7): ${missing.join(', ')}`);

  const parts = new Set<KitPart>(opts.solo?.length ? opts.solo : KIT_PARTS);
  const keptAnimals = Object.fromEntries(wantedAnimals.filter((a) => animals[a]).map((a) => [a, animals[a]]));
  const datos = cfg.datos_por_cuadro === undefined ? false : cfg.datos_por_cuadro;
  const files = buildSportsKit({
    athletes: humans, cells, cell: cfg.celda ?? 48, filas: cfg.filas, datos: parts.has('atletas') ? datos : false, atlas: true,
    packDefs: cfg.packs, packs: parts.has('atletas') ? Object.keys(cfg.packs) : [], quick: opts.quick,
    retratos: parts.has('retratos') && cfg.retratos !== false, cabecitas: parts.has('cabecitas') && cfg.cabecitas !== false,
    objetos: parts.has('objetos') && cfg.objetos ? (Array.isArray(cfg.objetos) ? (cfg.objetos as FloorPropKind[]) : true) : false,
    animales: parts.has('animales') ? keptAnimals : undefined,
    fuentes: parts.has('fuentes') && cfg.ui?.fuentes ? inputs.fuentes : undefined,
    progress: opts.progress,
  });

  // el manifiesto del contrato: el juego arriba, equipos, atletas con su equipo y las pruebas
  const mi = files.findIndex((f) => f.name === 'manifest.json');
  const sm = JSON.parse(new TextDecoder().decode(files[mi].bytes)) as Record<string, unknown>;
  const teamOf = new Map<string, string>();
  for (const [id, t] of Object.entries(inputs.equipos ?? {})) for (const a of t.atletas) teamOf.set(a, id);
  const atletas = Object.fromEntries(Object.entries((sm.atletas ?? {}) as Record<string, Record<string, unknown>>).map(([id, a]) => {
    const { nombre, ...rest } = a;
    return [id, { nombre, ...(teamOf.has(id) ? { equipo: teamOf.get(id) } : {}), ...rest }];
  }));
  const notas = [...((sm.notas as string[]) ?? []).map((n) => n.replace('orden de `direcciones`', 'orden de `filas`')), ...(typeof sm.retratos === 'string' ? [sm.retratos] : []), ...(typeof sm.notas_objetos === 'string' ? [sm.notas_objetos] : [])];
  const manifest: Record<string, unknown> = {
    juego: cfg.juego, generado_con: 'PixelForja', version: 1, tipo: 'kit a medida',
    ...(cfg.resolucion ? { resolucion: cfg.resolucion } : {}),
    celda: sm.celda, filas: sm.filas ?? sm.direcciones,
    ...(inputs.equipos ? { equipos: inputs.equipos } : {}),
    atletas,
    ...(cfg.pruebas ? { pruebas: cfg.pruebas } : {}),
    ...(sm.cabecitas ? { cabecitas: sm.cabecitas } : {}),
    ...(sm.objetos ? { objetos: sm.objetos } : {}),
    ...(sm.animales ? { animales: sm.animales } : {}),
    ...(sm.ui ? { ui: sm.ui } : {}),
    ...(sm.creditos ? { creditos: sm.creditos } : {}),
    ...(warnings.length ? { pendiente: warnings } : {}),
    notas,
  };
  files[mi] = { name: 'manifest.json', bytes: new TextEncoder().encode(compactJson(manifest)), mime: 'application/json' };
  return { files, warnings };
}
