import type { ExportFile } from '../export/bundle';
import { FRAME_DATA_FIELDS, ROW_NAMES, type FrameDataField } from '../export/frameData';
import { HUMAN_ANIMS } from '../anim/registry';
import { FLOOR_PROP_KINDS, type FloorPropKind } from '../render/props';
import { isHuman, CELL_SIZES, type AnimalFicha, type CellSize, type Ficha, type HumanFicha } from '../sheet/ficha';
import { familyFicha, FAMILY, thorFicha } from '../rpg/family';
import { heroFicha, heroCell, HEROES } from '../rpg/heroes';
import { buildSportsKit, compactJson } from './sportskit';
import { generarEscenario } from '../world/oblique';
import { EFFECT_NAMES, expandEffects, renderEffect, effectSheet } from '../fx/catalog';
import { SFX_NAMES, MUSIC_NAMES, renderSfx, renderMusic, encodeWav, RATE, type SfxName, type MusicName } from '../audio/sfx';
import { ambience, AMBIENCE_NAMES, type AmbienceName } from '../audio/ambience';
import { encodePng } from '../export/png';
import { COMIDAS, type Comida } from '../render/comida';
import { publicoHoja } from '../render/publico';
import { vehiculosD2, VEHICULOS_D2, K_INCLINACION } from '../world/oblique/vehiculos';
import { createRaster, blit } from '../core/raster';
import { vsFondo, vsLetras, coloresVs, VS_NEUTRO } from '../ui/vs';

/**
 * Kit a medida: el juego describe en un kit.config.json qué personajes, packs de animaciones, objetos, animales y
 * fuentes necesita, y PixelForja arma el kit del contrato (manifest.json + atlas PNG). Sirve para cualquier juego: lo
 * propio de cada uno vive en su configuración, no en el código.
 *
 * Versión inicial: atletas (con sus packs, datos por cuadro, retratos, cabecitas y vestuario), equipos, pruebas,
 * armas del piso, animales, fuentes, efectos, los sonidos que ya tiene el motor y los escenarios oblicuos. Lo que
 * todavía no genera (público, NPC, vehículos, logo y los sonidos nuevos del lote H) se acepta y vuelve como aviso,
 * para que el juego sepa qué falta.
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
  /** retratos de 8 expresiones (sin valor: sí) */
  retratos?: boolean;
  /** cabecitas de 12 x 12 (sin valor: sí) */
  cabecitas?: boolean;
  /** armas del piso y comida de la pelea: true = todo, o la lista (ids, o "comida" para toda la comida) */
  objetos?: boolean | string[];
  /** animales: de las fichas o del motor (thor) */
  animales?: string[];
  /** fuentes, logo y la pantalla del VS (el fondo partido de cada par de equipos y las letras) */
  ui?: { fuentes?: boolean | { idiomas?: string[] }; logo?: { texto: string }; vs_fondo?: boolean };
  /** efectos del catálogo general: true = todos, o ids, bases (polvo_correr) y grupos (reaccion) */
  fx?: boolean | string[];
  /** sonidos del motor: true = todos, o la lista. Los nombres que todavía no existen vuelven como aviso (lote H) */
  audio?: { sfx?: boolean | string[]; musica?: boolean | string[]; ambientes?: boolean | string[]; [k: string]: unknown };
  // lo que todavía no genera el kit a medida (se acepta y vuelve como aviso)
  /** carpeta con *.layout.json, o la lista de layouts: salen en escenarios/<id>/ */
  escenarios?: string | string[];
  /** el público: `azoteas` (la gente de las azoteas vecinas de la pelea) ya sale; los hinchas por país llegan con C6 */
  publico?: { azoteas?: boolean | { ancho?: number; gente?: number }; [k: string]: unknown };
  npc?: unknown;
  /** vehículos y objetos de escenario en la vista inclinada (lote D2): true = todos, o ids ("moto" = los 4 colores) */
  vehiculos?: boolean | string[];
}

/** Un equipo del archivo de equipos. Lo que no se usa para armar el kit pasa al manifiesto tal cual. */
export interface TeamDef { nombre: string; atletas: string[]; mascota?: string; colores?: string[]; [k: string]: unknown }

export const INCLUDED_CAST = ['familia', 'familia_rpg', 'heroes'] as const;
export type IncludedCast = (typeof INCLUDED_CAST)[number];

export const KIT_PARTS = ['atletas', 'retratos', 'cabecitas', 'objetos', 'animales', 'fuentes', 'efectos', 'audio', 'escenarios', 'vs', 'publico', 'vehiculos'] as const;
export type KitPart = (typeof KIT_PARTS)[number];

/** Las secciones que todavía no genera el kit a medida, y el lote del pedido que las trae. */
export const PENDING_SECTIONS: Record<string, string> = {
  npc: 'NPC (lote C6)',
};
const KNOWN_KEYS = ['$schema', 'juego', 'resolucion', 'celda', 'filas', 'datos_por_cuadro', 'fichas', 'personajes_incluidos', 'equipos', 'packs', 'pruebas', 'retratos', 'cabecitas', 'objetos', 'animales', 'ui', 'fx', 'audio', 'escenarios', 'publico', 'vehiculos', ...Object.keys(PENDING_SECTIONS)];
/** Lo que se puede pedir en `objetos`: las armas, cada comida y "comida" (toda). */
const OBJETOS = [...FLOOR_PROP_KINDS, ...COMIDAS, 'comida'] as string[];
/** Reparte la lista de `objetos` en armas y comida. */
function splitObjetos(v: KitConfig['objetos']): { armas: boolean | FloorPropKind[]; comida: boolean | Comida[] } {
  if (v === true) return { armas: true, comida: true };
  if (!Array.isArray(v)) return { armas: false, comida: false };
  const armas = v.filter((o): o is FloorPropKind => (FLOOR_PROP_KINDS as readonly string[]).includes(o));
  const comida = v.includes('comida') ? true : v.filter((o): o is Comida => (COMIDAS as readonly string[]).includes(o));
  return { armas: armas.length ? armas : false, comida: comida === true || comida.length ? comida : false };
}
const ANIM_NAMES = HUMAN_ANIMS.map((a) => a.name);
const IDIOMAS = ['es', 'en', 'vi'];
/** Los sonidos que ya tiene el motor, por sección de audio. */
export const AUDIO_SECTIONS = { sfx: SFX_NAMES as string[], musica: MUSIC_NAMES as string[], ambientes: AMBIENCE_NAMES as string[] };
type AudioSection = keyof typeof AUDIO_SECTIONS;

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
/**
 * Reparte una lista de nombres: los que existen, los mal escritos (se parecen a uno que existe: error) y los que
 * todavía no existen (aviso: llegan con su lote).
 */
function sortNames(list: string[], known: readonly string[]) {
  const ok: string[] = [], typos: { i: number; name: string; hint: string }[] = [], later: string[] = [];
  list.forEach((name, i) => {
    if (known.includes(name)) ok.push(name);
    else {
      // error de dedo: a 1 letra (2 en nombres largos) de uno que existe, y no es ese nombre con algo agregado (golpe_1).
      // En nombres de 4 letras o menos no se adivina (aro no es arco)
      const hint = suggest(name, known), close = hint.split('"')[1] ?? '';
      const typo = !!close && name.length > 4 && dist(name, close) <= (name.length >= 10 ? 2 : 1) && !new RegExp(`^${close}[_0-9]`).test(name) && !new RegExp(`^${name}[_0-9]`).test(close);
      if (typo) typos.push({ i, name, hint }); else later.push(name);
    }
  });
  return { ok, typos, later };
}
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
    if (!isStrList(cfg.objetos)) e.push('objetos: true o una lista de armas del piso y comida');
    else (cfg.objetos as string[]).forEach((o, i) => { if (!OBJETOS.includes(o)) e.push(`objetos[${i}]: "${o}" no es un arma del piso ni una comida.${suggest(o, OBJETOS)}`); });
  }
  if (cfg.animales !== undefined && !isStrList(cfg.animales)) e.push('animales: tiene que ser una lista de ids');
  if (cfg.ui !== undefined) {
    if (!isObj(cfg.ui)) e.push('ui: tiene que ser un objeto');
    else {
      for (const k of Object.keys(cfg.ui)) if (!['fuentes', 'logo', 'vs_fondo'].includes(k)) e.push(`ui.${k}: clave desconocida (hay "fuentes", "logo" y "vs_fondo")`);
      if (cfg.ui.vs_fondo !== undefined && typeof cfg.ui.vs_fondo !== 'boolean') e.push('ui.vs_fondo: true o false');
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
  if (cfg.vehiculos !== undefined && typeof cfg.vehiculos !== 'boolean' && !(Array.isArray(cfg.vehiculos) && cfg.vehiculos.every((v) => typeof v === 'string'))) e.push('vehiculos: true o una lista de ids, por ejemplo ["ferry", "moto"]');
  if (cfg.publico !== undefined) {
    if (!isObj(cfg.publico)) e.push('publico: tiene que ser un objeto, por ejemplo { "azoteas": true }');
    else {
      const az = cfg.publico.azoteas;
      if (az !== undefined && typeof az !== 'boolean') {
        if (!isObj(az)) e.push('publico.azoteas: true o { "ancho": 320, "gente": 16 }');
        else for (const k of ['ancho', 'gente'] as const) if (az[k] !== undefined && !(Number.isInteger(az[k]) && (az[k] as number) > 0 && (az[k] as number) <= 2048)) e.push(`publico.azoteas.${k}: un entero entre 1 y 2048`);
      }
    }
  }
  if (cfg.escenarios !== undefined && typeof cfg.escenarios !== 'string' && !isStrList(cfg.escenarios)) e.push('escenarios: una carpeta con los *.layout.json ("data/stages/") o la lista de layouts');
  if (cfg.fx !== undefined && typeof cfg.fx !== 'boolean') {
    if (!isStrList(cfg.fx)) e.push('fx: true o una lista de efectos, bases (polvo_correr) o grupos (reaccion)');
    else for (const t of sortNames(cfg.fx as string[], EFFECT_NAMES).typos) e.push(`fx[${t.i}]: "${t.name}" no es un efecto.${t.hint}`);
  }
  if (cfg.audio !== undefined) {
    if (!isObj(cfg.audio)) e.push('audio: tiene que ser un objeto, por ejemplo { "sfx": ["golpe", "paso"] }');
    else for (const k of Object.keys(AUDIO_SECTIONS) as AudioSection[]) {
      const v = cfg.audio[k];
      if (v === undefined || typeof v === 'boolean') continue;
      if (!isStrList(v)) { e.push(`audio.${k}: true o una lista de nombres`); continue; }
      for (const t of sortNames(v as string[], AUDIO_SECTIONS[k]).typos) e.push(`audio.${k}[${t.i}]: "${t.name}" no es un sonido del motor.${t.hint}`);
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
      retratos: { type: 'boolean', description: 'Retratos de 8 expresiones en 40 y 96. Sin valor: sí.' },
      cabecitas: { type: 'boolean', description: 'Cabecitas de 12 x 12 para el minimapa. Sin valor: sí.' },
      objetos: { oneOf: [{ type: 'boolean' }, list({ enum: OBJETOS })], description: 'Armas del piso y comida de la pelea (peso "comida", con humito): true = todo, o la lista. "comida" pide toda la comida.' },
      animales: list(id, { description: 'Animales: los de las fichas y thor, que trae el motor.' }),
      ui: {
        type: 'object', additionalProperties: false,
        properties: {
          fuentes: { oneOf: [{ type: 'boolean' }, { type: 'object', additionalProperties: false, properties: { idiomas: list({ enum: IDIOMAS }) } }], description: 'Las tres fuentes bitmap (con vietnamita) en ui/fuentes.' },
          logo: { type: 'object', required: ['texto'], properties: { texto: { type: 'string' } }, description: 'Todavía no se genera: llega con el resto del lote G1.' },
          vs_fondo: { type: 'boolean', description: 'La pantalla del VS: el fondo con los colores de cada par de equipos partidos en diagonal y rayos (ui/vs/), uno neutro, y las letras VS aparte para estrellarlas.' },
        },
      },
      escenarios: { oneOf: [{ type: 'string' }, list({ type: 'string' }, { minItems: 1 })], description: 'Carpeta con los *.layout.json ("data/stages/") o la lista de layouts. Cada uno sale en escenarios/<id>/ con sus capas, objetos, vida, superficie y colisión, y pasa por las 9 pruebas. Ver docs/ESCENARIOS.md.' },
      fx: { oneOf: [{ type: 'boolean' }, list({ anyOf: [{ enum: EFFECT_NAMES }, { type: 'string' }] })], description: 'Efectos del catálogo general en fx/: true = todos, o ids, bases (polvo_correr = sus 3 tamaños) y grupos (polvo, golpe, reaccion, agua, fiesta, objetos, pantalla, clima, tecnica, ambiente). Ver docs/EFECTOS.md.' },
      audio: {
        type: 'object',
        description: 'Sonidos sintetizados del motor en audio/sfx, audio/musica y audio/ambiente (WAV). Los nombres que todavía no existen vuelven como aviso: llegan con el lote H.',
        properties: Object.fromEntries((Object.keys(AUDIO_SECTIONS) as AudioSection[]).map((k) => [k, { oneOf: [{ type: 'boolean' }, list({ anyOf: [{ enum: AUDIO_SECTIONS[k] }, { type: 'string' }] })] }])),
      },
      publico: {
        type: 'object',
        description: 'El público. "azoteas": la gente asomada en las azoteas vecinas de la pelea, en publico/azoteas.png (de día) y publico/azoteas_noche.png, con los estados quieto, celebra y abuchea. Los hinchas por país (paises, variantes) llegan con el lote C6 y vuelven como aviso.',
        properties: { azoteas: { oneOf: [{ type: 'boolean' }, { type: 'object', additionalProperties: false, properties: { ancho: { type: 'integer', minimum: 1, maximum: 2048 }, gente: { type: 'integer', minimum: 1, maximum: 2048 } } }] } },
      },
      vehiculos: { oneOf: [{ type: 'boolean' }, list({ anyOf: [{ enum: [...VEHICULOS_D2, 'moto'] }, { type: 'string' }] })], description: 'Vehículos y objetos de escenario en la vista inclinada (px = x + 0.35 y), en vehiculos/<id>.png: una tira de cuadros con sus animaciones, el ancla (la esquina de atrás a la izquierda de la huella, en el piso) y la huella. true = todos, o ids ("moto" = los 4 colores). Los que todavía no existen vuelven como aviso.' },
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
  /** los layouts de escenarios ya leídos, por nombre de archivo */
  escenarios?: Record<string, unknown>;
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
  for (const k of Object.keys(cfg.publico ?? {})) if (k !== 'azoteas') warnings.push(`publico.${k}: todavía no se genera, llegan los hinchas por país con el lote C6`);
  // animales pedidos que no tienen ficha: llegan con el lote C7 (especies nuevas) o falta su ficha
  const wantedAnimals = [...new Set([...(cfg.animales ?? []), ...Object.values(inputs.equipos ?? {}).map((t) => t.mascota).filter((m): m is string => !!m)])];
  const missing = wantedAnimals.filter((a) => !animals[a]);
  if (missing.length) warnings.push(`animales sin ficha (se saltan; las especies nuevas llegan con el lote C7): ${missing.join(', ')}`);
  const fxList = cfg.fx === true ? true : Array.isArray(cfg.fx) ? cfg.fx : [];
  if (Array.isArray(fxList)) { const later = sortNames(fxList, EFFECT_NAMES).later; if (later.length) warnings.push(`fx: todavía no existen (se saltan): ${later.join(', ')}`); }
  const sounds: Partial<Record<AudioSection, string[]>> = {};
  if (cfg.audio) {
    for (const k of Object.keys(cfg.audio)) if (!(k in AUDIO_SECTIONS)) warnings.push(`audio.${k}: todavía no se genera, llega con el audio (lote H)`);
    for (const k of Object.keys(AUDIO_SECTIONS) as AudioSection[]) {
      const v = cfg.audio[k];
      if (!v) continue;
      const sorted = sortNames(v === true ? AUDIO_SECTIONS[k] : (v as string[]), AUDIO_SECTIONS[k]);
      sounds[k] = sorted.ok;
      if (sorted.later.length) warnings.push(`audio.${k}: todavía no existen, llegan con el lote H: ${sorted.later.join(', ')}`);
    }
  }

  const parts = new Set<KitPart>(opts.solo?.length ? opts.solo : KIT_PARTS);
  const keptAnimals = Object.fromEntries(wantedAnimals.filter((a) => animals[a]).map((a) => [a, animals[a]]));
  const datos = cfg.datos_por_cuadro === undefined ? false : cfg.datos_por_cuadro;
  const obj = splitObjetos(parts.has('objetos') ? cfg.objetos : false);
  const files = buildSportsKit({
    athletes: humans, cells, cell: cfg.celda ?? 48, filas: cfg.filas, datos: parts.has('atletas') ? datos : false, atlas: true,
    packDefs: cfg.packs, packs: parts.has('atletas') ? Object.keys(cfg.packs) : [], quick: opts.quick,
    retratos: parts.has('retratos') && cfg.retratos !== false, cabecitas: parts.has('cabecitas') && cfg.cabecitas !== false,
    objetos: obj.armas, comida: obj.comida,
    animales: parts.has('animales') ? keptAnimals : undefined,
    fuentes: parts.has('fuentes') && cfg.ui?.fuentes ? inputs.fuentes : undefined,
    progress: opts.progress,
  });

  // efectos: una hoja por efecto en fx/, con su celda, cuadros, ancla y capa
  let fx: Record<string, unknown> | undefined;
  if (parts.has('efectos') && cfg.fx && (fxList === true || fxList.length)) {
    fx = {};
    const defs = expandEffects(fxList);
    for (const d of defs) {
      const r = renderEffect(d, cfg.resolucion);
      const { sheet, columnas } = effectSheet(r.frames, r.w, r.h);
      const archivo = `fx/${d.id}.png`;
      files.push({ name: archivo, bytes: encodePng(sheet), mime: 'image/png' });
      fx[d.id] = {
        archivo, w: r.w, h: r.h, ...(r.w === r.h ? { celda: r.w } : {}), cuadros: d.cuadros, columnas, fps: d.fps, loop: d.loop,
        ancla: d.pantalla ? [0, 0] : d.ancla, se_pega_a: d.se_pega_a, capa: d.capa, grupo: d.grupo, ...(d.estados ? { estados: d.estados } : {}), uso: d.uso.es,
      };
    }
    opts.progress?.(`efectos: ${defs.length}`);
  }
  // audio: WAV de 16 bits mono, siempre iguales (cada sonido arranca de la misma semilla)
  let audio: Record<string, Record<string, unknown>> | undefined;
  if (parts.has('audio') && Object.values(sounds).some((v) => v?.length)) {
    audio = {};
    const dir = { sfx: 'sfx', musica: 'musica', ambientes: 'ambiente' } as const;
    for (const k of Object.keys(sounds) as AudioSection[]) {
      if (!sounds[k]!.length) continue;
      audio[k] = {};
      for (const name of sounds[k]!) {
        const loop = k !== 'sfx';
        const samples = k === 'sfx' ? renderSfx(name as SfxName) : k === 'musica' ? renderMusic(name as MusicName) : ambience(name as AmbienceName);
        const archivo = `audio/${dir[k]}/${name}.wav`;
        files.push({ name: archivo, bytes: encodeWav(samples, RATE, k === 'ambientes'), mime: 'audio/wav' });
        audio[k][name] = { archivo, duracion: Math.round((samples.length / RATE) * 100) / 100, ...(loop ? { bucle: true } : {}) };
      }
    }
    opts.progress?.(`audio: ${Object.values(sounds).reduce((n, v) => n + (v?.length ?? 0), 0)} sonidos`);
  }

  // escenarios oblicuos: cada layout pasa por las 9 pruebas; si una falla, el kit no sale
  let escenarios: Record<string, string> | undefined;
  if (parts.has('escenarios') && inputs.escenarios && Object.keys(inputs.escenarios).length) {
    escenarios = {};
    const malos: string[] = [];
    for (const [nombre, layout] of Object.entries(inputs.escenarios)) {
      const r = generarEscenario(layout);
      for (const a of r.avisos) warnings.push(`${nombre}: ${a}`);
      if (!r.ok) { malos.push(`${nombre}:\n    ${r.errores.join('\n    ')}`); continue; }
      for (const a of r.archivos) files.push({ name: `escenarios/${r.id}/${a.nombre}`, bytes: a.bytes, mime: a.nombre.endsWith('.png') ? 'image/png' : a.nombre.endsWith('.json') ? 'application/json' : 'text/markdown' });
      escenarios[r.id!] = `escenarios/${r.id}/escenario.json`;
      opts.progress?.(`escenario ${r.id}: ${r.archivos.length} archivos, 9 pruebas en verde`);
    }
    if (malos.length) throw new Error(`Escenarios que no pasan las pruebas:\n  ${malos.join('\n  ')}`);
  }

  // la pantalla del VS: un fondo por par de equipos (en el orden del archivo de equipos), uno neutro y las letras
  let vs: Record<string, unknown> | undefined;
  if (parts.has('vs') && cfg.ui?.vs_fondo) {
    const [w, h] = cfg.resolucion ?? [640, 360];
    const pares: Record<string, string> = {};
    files.push({ name: 'ui/vs/neutro.png', bytes: encodePng(vsFondo(VS_NEUTRO[0], VS_NEUTRO[1], w, h)), mime: 'image/png' });
    const eq = Object.entries(inputs.equipos ?? {});
    for (let i = 0; i < eq.length; i++) for (let j = i + 1; j < eq.length; j++) {
      const [a, ta] = eq[i], [b, tb] = eq[j];
      const [ca, cb] = coloresVs(ta.colores ?? [VS_NEUTRO[0]], tb.colores ?? [VS_NEUTRO[1]]);
      const archivo = `ui/vs/${a}__${b}.png`;
      files.push({ name: archivo, bytes: encodePng(vsFondo(ca, cb, w, h)), mime: 'image/png' });
      pares[`${a}__${b}`] = archivo;
    }
    const letras = vsLetras();
    files.push({ name: 'ui/vs/letras.png', bytes: encodePng(letras), mime: 'image/png' });
    vs = {
      neutro: 'ui/vs/neutro.png', pares, letras: { archivo: 'ui/vs/letras.png', w: letras.w, h: letras.h }, w, h, centro: [Math.round(w / 2), Math.round(h * 0.42)],
      nota: 'Fondo del VS: el primer equipo del par a la izquierda. Si el par va al revés (b__a), voltea la imagen en x. Los rayos salen de `centro`, donde van las letras VS (estréllalas con tu rebote). Las franjas negras de arriba y abajo miden el 7 % del alto.',
    };
    opts.progress?.(`vs: ${Object.keys(pares).length + 1} fondos`);
  }
  // el público de las azoteas vecinas: de día y de noche, 3 estados de 4 cuadros
  let publico: Record<string, unknown> | undefined;
  if (parts.has('publico') && cfg.publico?.azoteas) {
    const az = isObj(cfg.publico.azoteas) ? cfg.publico.azoteas : {};
    const dia = publicoHoja({ ancho: az.ancho, gente: az.gente }), noche = publicoHoja({ ancho: az.ancho, gente: az.gente, noche: true });
    files.push({ name: 'publico/azoteas.png', bytes: encodePng(dia.png), mime: 'image/png' });
    files.push({ name: 'publico/azoteas_noche.png', bytes: encodePng(noche.png), mime: 'image/png' });
    publico = {
      azoteas: {
        archivo: 'publico/azoteas.png', archivo_noche: 'publico/azoteas_noche.png', w: dia.w, h: dia.h, cuadros: dia.cuadros, fps: dia.fps, muro: dia.muro, estados: dia.estados,
        nota: 'Una fila por estado (quieto, celebra, abuchea) y 4 cuadros de w x h por fila. El muro de la azotea vecina ocupa las `muro` filas de abajo: apoya ese borde en la azotea de tu fondo. Señalan hacia el medio de la tira. Repítela en x para llenar el ancho.',
      },
    };
  }

  // vehículos (lote D2): una tira por vehículo, en la vista inclinada del escenario
  let vehiculos: Record<string, unknown> | undefined;
  if (parts.has('vehiculos') && cfg.vehiculos) {
    const pedidos = cfg.vehiculos === true ? [...VEHICULOS_D2] : cfg.vehiculos.flatMap((v) => (v === 'moto' ? VEHICULOS_D2.filter((m) => m.startsWith('moto_')) : [v]));
    const faltan = pedidos.filter((v) => !(VEHICULOS_D2 as readonly string[]).includes(v));
    if (faltan.length) warnings.push(`vehiculos: todavía no existen (se saltan): ${faltan.join(', ')}`);
    vehiculos = {};
    for (const h of vehiculosD2().filter((v) => pedidos.includes(v.id))) {
      const tira = createRaster(h.w * h.cuadros.length, h.h);
      h.cuadros.forEach((c, i) => blit(tira, c, i * h.w, 0));
      const archivo = `vehiculos/${h.id}.png`;
      files.push({ name: archivo, bytes: encodePng(tira), mime: 'image/png' });
      vehiculos[h.id] = { archivo, w: h.w, h: h.h, cuadros: h.cuadros.length, ancla: h.ancla, huella: h.huella, anims: h.anims, ...(h.dir ? { mira: h.dir < 0 ? 'izquierda' : 'derecha' } : {}) };
    }
    if (Object.keys(vehiculos).length) vehiculos.notas = `Vista inclinada con K = ${K_INCLINACION}: el punto (x, y, z) del mundo cae en (x + K y, y - z). Cada tira tiene cuadros de w x h; el cuadro i va en x = i * w. El ancla es dónde cae en el cuadro la esquina de atrás a la izquierda de la huella, en el piso: el juego pone ahí el (x, y) del vehículo. "mira" dice hacia dónde va de frente; para el otro lado no sirve el espejo (se vería la cara de la derecha).`;
    opts.progress?.(`vehiculos: ${Object.keys(vehiculos).length - 1}`);
  }

  if (fx || audio || escenarios || vs || publico || vehiculos) {
    const ci = files.findIndex((f) => f.name === 'CREDITOS.txt');
    const line = 'Efectos, sonidos, escenarios, VS y público: dibujados y sintetizados con código por PixelForja. No usan piezas de nadie y no piden crédito.\n';
    const prev = ci >= 0 ? new TextDecoder().decode(files[ci].bytes) : '';
    const credit = { name: 'CREDITOS.txt', bytes: new TextEncoder().encode(prev ? `${prev.trimEnd()}\n\n${line}` : line), mime: 'text/plain' };
    if (ci >= 0) files[ci] = credit; else files.push(credit);
  }

  // el manifiesto del contrato: el juego arriba, equipos, atletas con su equipo y las pruebas
  const mi = files.findIndex((f) => f.name === 'manifest.json');
  const sm = JSON.parse(new TextDecoder().decode(files[mi].bytes)) as Record<string, unknown>;
  const teamOf = new Map<string, string>();
  for (const [id, t] of Object.entries(inputs.equipos ?? {})) for (const a of t.atletas) teamOf.set(a, id);
  const atletas = Object.fromEntries(Object.entries((sm.atletas ?? {}) as Record<string, Record<string, unknown>>).map(([id, a]) => {
    const { nombre, ...rest } = a;
    return [id, { nombre, ...(teamOf.has(id) ? { equipo: teamOf.get(id) } : {}), ...rest }];
  }));
  const notas = [...((sm.notas as string[]) ?? []).map((n) => n.replace('orden de `direcciones`', 'orden de `filas`')), ...(typeof sm.retratos === 'string' ? [sm.retratos] : []), ...(typeof sm.notas_objetos === 'string' ? [sm.notas_objetos] : []), ...(typeof sm.notas_comida === 'string' ? [sm.notas_comida] : [])];
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
    ...(fx ? { fx } : {}),
    ...(sm.ui || vs ? { ui: { ...((sm.ui as Record<string, unknown>) ?? {}), ...(vs ? { vs } : {}) } } : {}),
    ...(audio ? { audio } : {}),
    ...(escenarios ? { escenarios } : {}),
    ...(publico ? { publico } : {}),
    ...(vehiculos ? { vehiculos } : {}),
    ...(files.some((f) => f.name === 'CREDITOS.txt') ? { creditos: 'CREDITOS.txt' } : {}),
    ...(warnings.length ? { pendiente: warnings } : {}),
    notas,
  };
  files[mi] = { name: 'manifest.json', bytes: new TextEncoder().encode(compactJson(manifest)), mime: 'application/json' };
  return { files, warnings };
}
