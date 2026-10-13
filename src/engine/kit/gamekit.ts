import { createRaster, blit, type Raster } from '../core/raster';
import { encodePng, encodePngPaleta, decodePng } from '../export/png';
import { motionOf8, type MovimientoAnim } from '../export/motion';
import { creditsFor, type ExportFile } from '../export/bundle';
import { renderClip, EIGHT_VIEWS, VIEW_SUFFIX, hasAnim } from '../render/clip';
import type { Ficha, CellSize, HumanFicha } from '../sheet/ficha';
import { familyFicha, thorFicha, FAMILY, FAMILY_GG, type FamilyId } from '../rpg/family';
import { enemyFicha, enemyAnims, enemyCell, HERO_RPG_ANIMS, type EnemyId } from '../rpg/presets';
import { merchantFicha, NPCS, NPC_ANIMS, NPC_NOMBRES } from '../rpg/npc';
import { CAPAS_VERSION, capaDeObjeto, clipsBase, hojaCapa, huella, sinEquipo, variantes, type BloqueCapa, type ClipsBase, type TipoCapa } from './capas';
import { PET_RPG_ANIMS } from '../anim/animal';
import { lanternClip } from '../render/petLantern';
import { renderFx, projectile8, rotate8, type FxElement } from '../fx/fx';
import { scaleRaster } from '../render/rotsprite';
import { arrowProjectile, arrowImpact } from '../fx/arrow';
import { stompWave, dirtDig } from '../fx/stomp';
import { exportLootIcons, exportLootWorld, lootCatalog } from '../loot/export';
import { allLoot, UNIQUE_LOOT } from '../loot/catalog';
import { isSpecial, handKindOf } from '../loot/render';
import { TILE } from '../world/tiles';
import { ESPUMA, waterExtras } from '../world/water';
import { smallCreatures } from '../world/reactions';
import { bosqueMap, bigMapToTiled, renderBigMap, cropView, CHUNK, type BigMap } from '../world/bosqueMap';
import { catedralMap } from '../world/catedralMap';
import { galeriasMap } from '../world/galeriasMap';
import { puertoMap } from '../world/puertoMap';
import { marinerEyes } from '../world/puertoObjectsB';
import { dustWarning, dustCloud, shadowEyes } from '../world/galeriasObjects';
import { POLILLA_REINA_SPEC, POLILLA_CENIZA_SPEC } from '../boss/polilla';
import { MINERO_PIEDRA_SPEC, SOMBRA_SPEC } from '../boss/mina';
import { MARINERO_NIEBLA_SPEC, CANGREJO_CENIZA_SPEC, MEDUSA_NEGRA_SPEC, CAPITAN_AHOGADO_SPEC } from '../boss/puerto';
import { introPanels, fuegoPared, humoGrande, logoFuego } from '../intro/intro';
import { particles, lightTexture, cloudShadow } from '../world/ambient';
import { creatures, fogTexture } from '../world/atmosphere';
import { ambience, AMBIENCE_NAMES } from '../audio/ambience';
import { hudSprites, digitSheet, DIGITS, inventoryPanel } from '../ui/hud';
import { bitmapFonts, renderLogo } from '../ui/fonts';
import { appIcons } from '../ui/appIcons';
import { continuara } from '../ui/continuara';
import { signIcons, hudIcons, rotateTablet, skillIcons } from '../ui/icons2';
import { SFX, SFX_NAMES, MUSIC, encodeWav } from '../audio/sfx';
import { PET_ARMOR } from '../render/pet3d';
import { renderBossSheets, clipSheet, type BossSpec, type BossCache } from '../boss/sheet';
import { MINO_SPEC } from '../boss/minotauro';
import { GUARDIAN_SPEC } from '../boss/guardian';

/**
 * Kit del juego "GG Abyss": todo lo que el juego necesita, listo para Phaser, con un manifest.json que dice qué es
 * cada archivo. Sin navegador: se genera desde la línea de comandos (scripts/game-kit.ts) o desde el estudio.
 *
 * Hojas de personajes: un PNG por animación, 8 filas (una por dirección, en el orden de `direcciones`) y una columna
 * por cuadro. Así ninguna textura pasa de 4096 px (el límite de las tablets).
 */

const enc = new TextEncoder();
const MAX_TEX = 4096;

export interface KitOptions {
  heroes?: FamilyId[];
  /**
   * Personajes editados en el estudio (Exportar ficha), por id. Si el id es de la familia reemplaza a su preset,
   * si no, se agrega como heroína nueva. Así el estudio y el juego quedan conectados.
   */
  fichas?: Record<string, HumanFicha>;
  enemies?: EnemyId[];
  boss?: EnemyId;
  /** niveles de armadura de Thor a exportar (0 = sin armadura) */
  thorTiers?: number[];
  /** menos animaciones (para pruebas rápidas) */
  quick?: boolean;
  /** archivos de Silkscreen (normal y negrita) para las fuentes bitmap; sin ellos el kit sale sin fuentes */
  fonts?: { regular: ArrayBuffer; bold: ArrayBuffer };
  /** avisa el avance (para la barra del estudio o la consola) */
  progress?: (msg: string) => void;
  /** sin capas de equipo (las heroínas salen con su arma dibujada, como antes) */
  sinCapas?: boolean;
  /** caché de capas de equipo (la línea de comandos la guarda en disco): son lentas de dibujar */
  cache?: { get: (clave: string) => { png: Uint8Array; meta: string } | undefined; set: (clave: string, v: { png: Uint8Array; meta: string }) => void };
  /** caché de cuadros de los jefes grandes (también lentos) */
  bossCache?: BossCache;
  /** sin el Mundo 3 (mapa, enemigos y la Polilla Reina): para pruebas rápidas de lo demás */
  sinMundo3?: boolean;
  /** sin el intro (paneles, fuego, humo y logo con fuego) */
  sinIntro?: boolean;
  /** sin el Mundo 4 (mapa, farol de Thor, enemigos y el Pez Farol) */
  sinMundo4?: boolean;
}

/** Hoja de una animación en 8 direcciones: fila = dirección, columna = cuadro. */
function sheet8(f: Ficha, cell: CellSize, anim: string, k = 1): { png: Raster; frames: number; fps: number; loop: boolean; premium: boolean; mov: MovimientoAnim } | null {
  if (!hasAnim(f, anim)) return null;
  const clips = EIGHT_VIEWS.map((v) => renderClip(f, cell, anim, v, { props: true }));
  const n = Math.max(...clips.map((c) => c.frames.length));
  const C = Math.round(cell * k);
  const png = createRaster(n * C, 8 * C);
  clips.forEach((c, row) => c.frames.forEach((fr, i) => blit(png, k === 1 ? fr : scaleRaster(fr, k), i * C, row * C)));
  // los pasos y el avance son los mismos en las 8 direcciones (la pose es una sola, cambia la cámara)
  return { png, frames: n, fps: clips[0].fps, loop: clips[0].loop, premium: clips[0].profile === 'premium', mov: motionOf8(clips, k) };
}

const file = (name: string, bytes: Uint8Array, mime: string): ExportFile => ({ name, bytes, mime });
const png = (name: string, r: Raster) => file(name, encodePng(r), 'image/png');
const json = (name: string, v: unknown) => file(name, enc.encode(JSON.stringify(v, null, 1)), 'application/json');

/** Imagen a la mitad (promedio de 2 x 2, para la vista del mapa). */
function half(r: Raster): Raster {
  const o = createRaster(r.w >> 1, r.h >> 1);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) for (let c = 0; c < 4; c++) {
    let v = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) v += r.data[((y * 2 + dy) * r.w + x * 2 + dx) * 4 + c];
    o.data[(y * o.w + x) * 4 + c] = v / 4;
  }
  return o;
}

/** Tira horizontal de cuadros. */
function strip(frames: Raster[]): Raster {
  const w = frames[0].w, h = frames[0].h;
  const out = createRaster(w * frames.length, h);
  frames.forEach((fr, i) => blit(out, fr, i * w, 0));
  return out;
}

/** Retrato: la cabeza del personaje de frente (para elegir personaje y para la barra). */
function portrait(f: Ficha, view: 'front' | 'se' = 'front', anim = 'idle'): Raster {
  const fr = renderClip(f, 64, anim, view).frames[0];
  let y0 = 64, x0 = 64, x1 = 0;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (fr.data[(y * 64 + x) * 4 + 3]) { y0 = Math.min(y0, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const S = 40, cx = Math.round((x0 + x1) / 2);
  const out = createRaster(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const sx = cx - S / 2 + x, sy = y0 - 1 + y;
    if (sx < 0 || sy < 0 || sx >= 64 || sy >= 64) continue;
    const s = (sy * 64 + sx) * 4, d = (y * S + x) * 4;
    for (let c = 0; c < 4; c++) out.data[d + c] = fr.data[s + c];
  }
  return out;
}

export interface CapaEntry { archivo: string; columnas: number; bloques: Record<string, BloqueCapa> }
export interface CharEntry { tipo: 'heroe' | 'enemigo' | 'jefe' | 'mascota' | 'npc'; nombre: string; celda: number; pivote: [number, number]; anims: Record<string, { archivo: string; cuadros: number; fps: number; loop: boolean } & MovimientoAnim>; perfil_movimiento?: 'premium'; clase?: string; retrato?: string; desde_estudio?: boolean;
  /** vuela: el cuerpo va en el aire y el pivote es el punto del piso debajo (donde va la sombra) */
  vuela?: boolean;
  /** capa que va encima de otro personaje, cuadro por cuadro (el farol de Thor: `capa_de: 'thor'`) */
  capa_de?: string;
  /** minijefe (el Capitán Ahogado) */
  elite?: boolean;
  /** capas de equipo (héroes): la hoja base va sin arma ni mano libre; `defecto` es lo que lleva sin nada puesto */
  capas?: { orden: TipoCapa[]; defecto: { arma: string | null; mano: string | null }; arma: Record<string, CapaEntry>; mano: Record<string, CapaEntry>; pecho: Record<string, CapaEntry>; casco: Record<string, CapaEntry> } }

/** k: se dibuja en `cell` y se agranda por k a la manera de RotSprite (el jefe: 64 x 1.5 = celda 96). */
function exportChar(prefix: string, id: string, f: Ficha, cell: CellSize, anims: string[], entry: Omit<CharEntry, 'anims' | 'celda' | 'pivote'>, files: ExportFile[], log: (m: string) => void, k = 1): CharEntry {
  const C = Math.round(cell * k);
  const out: CharEntry = { ...entry, celda: C, pivote: [C / 2, Math.floor((cell - 2) * k)], anims: {} };
  for (const a of anims) {
    const s = sheet8(f, cell, a, k);
    if (!s) continue;
    const name = `${prefix}/${id}_${a}.png`;
    files.push(png(name, s.png));
    out.anims[a] = { archivo: name, cuadros: s.frames, fps: s.fps, loop: s.loop, ...s.mov };
    if (s.premium) out.perfil_movimiento = 'premium';
  }
  log(`${prefix}/${id}: ${Object.keys(out.anims).length} animaciones`);
  return out;
}

/**
 * Las capas de equipo de una heroína: arma, mano libre, pecho y casco (ver capas.ts). Cada una es una hoja PNG con un
 * bloque por animación. Las que ya están en la caché (misma ficha, mismas animaciones, mismo dibujo base) no se redibujan.
 */
function exportCapas(id: string, f: HumanFicha, anims: string[], files: ExportFile[], log: (m: string) => void, cache?: KitOptions['cache']): NonNullable<CharEntry['capas']> {
  const out: NonNullable<CharEntry['capas']> = { orden: ['pecho', 'casco', 'arma', 'mano'], defecto: { arma: f.gear?.main ?? null, mano: f.gear?.off ?? null }, arma: {}, mano: {}, pecho: {}, casco: {} };
  // la huella del dibujo base: si cambia cómo se dibuja (el motor), cambian las capas
  const base = sinEquipo(f);
  const idle = sheet8(base, 48, 'idle');
  const firma = huella(JSON.stringify({ v: CAPAS_VERSION, anims, idle: idle ? huella(String(Array.from(idle.png.data.subarray(0, 40000)))) : '' }));
  let clips: ClipsBase | null = null;
  let hechas = 0, deCache = 0;
  for (const v of variantes(f)) {
    const clave = huella(JSON.stringify({ firma, ficha: v.ficha, base }));
    const nombre = `personajes/capas/${id}_${v.tipo}_${v.clave}.png`;
    let entrada = cache?.get(clave);
    if (entrada) deCache++;
    else {
      clips ??= clipsBase(f, anims);
      const h = hojaCapa(clips, v.ficha, anims);
      entrada = h ? { png: encodePng(h.png), meta: JSON.stringify({ columnas: h.columnas, bloques: h.bloques }) } : { png: new Uint8Array(), meta: 'null' };
      cache?.set(clave, entrada);
    }
    hechas++;
    const meta = JSON.parse(entrada.meta) as { columnas: number; bloques: Record<string, BloqueCapa> } | null;
    if (!meta) continue;
    // la caché guarda RGBA; al kit va con paleta (sin pérdida, la mitad de peso)
    files.push(file(nombre, encodePngPaleta(decodePng(entrada.png)), 'image/png'));
    out[v.tipo][v.clave] = { archivo: nombre, ...meta };
  }
  log(`personajes/${id}: ${hechas} capas de equipo (${deCache} de la caché)`);
  return out;
}

/** Jefes dibujados a su tamaño final (motor de jefes grandes, src/engine/boss). */
export const BIG_BOSSES: Partial<Record<EnemyId, BossSpec>> = { minotauro: MINO_SPEC, guardian_campana: GUARDIAN_SPEC };

const r2 = (v: number) => Math.round(v * 100) / 100;
/** efectos de sonido que suenan en bucle */
const SFX_BUCLE = new Set<string>(['carrito_rodar']);
/** músicas nuevas que suenan en bucle justo (ya traen el final pegado al principio) */
const MUSICA_BUCLE = new Set<string>(['galerias', 'jefe_polilla']);

/**
 * Un jefe grande al kit: una hoja por animación (fila = dirección, columna = cuadro), celda y pivote reales, y en el
 * manifiesto los eventos (con el punto que pega en cada dirección), el aviso de los golpes fuertes, el avance de los
 * pasos y la elevación de los saltos. quick: solo el reposo en 2 cuadros (pruebas).
 */
function exportBoss(spec: BossSpec, files: ExportFile[], log: (m: string) => void, cache?: BossCache, quick?: boolean, extra: Partial<CharEntry> = {}): CharEntry {
  const s = quick ? { ...spec, anims: spec.anims.filter((a) => a.name === 'idle').map((a) => ({ ...a, frames: 2 })) } : spec;
  const { clips, pivot } = renderBossSheets(s, cache, log);
  const ds = spec.dims(spec.cell).s, cs = spec.cell / 128;
  const out: CharEntry = { tipo: 'jefe', nombre: spec.id, celda: spec.cell, pivote: pivot, anims: {}, perfil_movimiento: 'premium', ...extra };
  for (const c of clips) {
    const name = `enemigos/${spec.id}_${c.def.name}.png`;
    files.push(png(name, clipSheet(c, spec.cell)));
    const n = c.def.frames;
    const eventos = (c.def.events ?? []).filter((e) => e.frame < n).map((e) => ({
      tipo: e.type as NonNullable<MovimientoAnim['eventos']>[number]['tipo'], cuadro: e.frame, fase: r2(e.frame / n),
      ...(e.foot ? { pie: e.foot === 'near' ? ('cerca' as const) : ('lejos' as const) } : {}),
      ...(c.strike?.[e.frame] ? { punto: c.strike[e.frame] } : {}),
    }));
    out.anims[c.def.name] = {
      archivo: name, cuadros: n, fps: c.def.fps, loop: c.def.loop,
      ...(eventos.length ? { eventos } : {}),
      ...(c.def.stride ? { avance: r2(c.def.stride * ds), velocidad_natural: r2((c.def.stride * ds * c.def.fps) / n) } : {}),
      ...(c.def.rise ? { elevacion: c.def.rise.slice(0, n).map((v) => r2(v * cs)) } : {}),
      ...(c.def.windup ? { aviso: c.def.windup } : {}),
    } as CharEntry['anims'][string];
  }
  log(`enemigos/${spec.id}: ${clips.length} animaciones a celda ${spec.cell}, pivote ${pivot.join(',')}`);
  return out;
}

/** Arma todo el kit. Devuelve los archivos (rutas relativas a la carpeta del kit). */
export function buildGameKit(opts: KitOptions = {}): ExportFile[] {
  const log = opts.progress ?? (() => {});
  const files: ExportFile[] = [];
  const heroes = opts.heroes ?? FAMILY;
  const enemies = opts.enemies ?? (['rata', 'calabaza', 'goblin_arquero', 'trol', 'guardian_cobre', 'raicita', 'vigia_raices'] as EnemyId[]);
  const boss = opts.boss ?? 'minotauro';
  const heroAnims = opts.quick ? ['idle', 'walk', 'attack', 'hit', 'die'] : [...HERO_RPG_ANIMS];
  const credits = new Set<string>();
  const manifest: Record<string, unknown> = {
    juego: 'GG Abyss', generado_con: 'PixelForja', version: 1, cuadro_mundo: TILE,
    direcciones: EIGHT_VIEWS.map((v) => VIEW_SUFFIX[v]),
    notas: 'Hojas de personajes: fila = dirección (orden de `direcciones`), columna = cuadro. El pivote es el punto de apoyo (pies).',
  };

  // ---------- héroes, mascota, enemigos y jefe ----------
  const chars: Record<string, CharEntry> = {};
  const custom = opts.fichas ?? {};
  const heroIds = [...new Set<string>([...heroes, ...Object.keys(custom)])];
  for (const id of heroIds) {
    if (!/^[a-z0-9_]+$/.test(id)) throw new Error(`id de personaje inválido: "${id}" (usa minúsculas, números y _)`);
    const fam = FAMILY_GG[id as FamilyId];
    const f = custom[id] ?? familyFicha(id as FamilyId, true);
    const c = creditsFor(f);
    if (c) credits.add(c);
    files.push(png(`personajes/retrato_${id}.png`, portrait(f)));
    const conCapas = !opts.sinCapas && !opts.quick;
    chars[id] = exportChar('personajes', id, conCapas ? sinEquipo(f) : f, 48, heroAnims, { tipo: 'heroe', nombre: f.name || fam?.name || id, ...(fam ? { clase: fam.clase } : {}), retrato: `personajes/retrato_${id}.png`, ...(custom[id] ? { desde_estudio: true } : {}) }, files, log);
    if (conCapas) chars[id].capas = exportCapas(id, f, heroAnims, files, log, opts.cache);
  }
  const tiers = opts.thorTiers ?? [0, 1, 2, 3, 4, 5];
  for (const t of tiers) {
    const f = thorFicha(t);
    // todas las armaduras con las mismas animaciones que Thor sin armadura (el juego no tiene que saber cuál lleva)
    const anims = opts.quick ? (t === 0 ? ['idle', 'walk', 'bite'] : ['idle', 'walk']) : PET_RPG_ANIMS;
    const id = t ? `thor_armadura${t}` : 'thor';
    chars[id] = exportChar('mascota', id, f, 48, anims, { tipo: 'mascota', nombre: t ? `Thor (${PET_ARMOR[t - 1].name.es})` : 'Thor' }, files, log);
  }
  files.push(png('mascota/retrato_thor.png', portrait(thorFicha(0), 'se', 'sit')));
  // el farol de Thor (Mundo 4): solo el farol, cuadro por cuadro, para dibujar encima de Thor con cualquier armadura
  if (!opts.sinMundo4 && chars.thor) {
    for (const [id, lit] of [['thor_farol', true], ['thor_farol_apagado', false]] as const) {
      const anims: CharEntry['anims'] = {};
      for (const [a, meta] of Object.entries(chars.thor.anims)) {
        const clips = EIGHT_VIEWS.map((v) => lanternClip(thorFicha(0), 48, a, v, lit));
        const n = Math.max(...clips.map((c) => c.frames.length));
        const sh = createRaster(n * 48, 8 * 48);
        clips.forEach((c, row) => c.frames.forEach((fr, i) => blit(sh, fr, i * 48, row * 48)));
        const name = `mascota/${id}_${a}.png`;
        files.push(png(name, sh));
        anims[a] = { ...meta, archivo: name };
      }
      chars[id] = { tipo: 'mascota', nombre: lit ? 'Farol de Thor' : 'Farol de Thor (apagado)', celda: chars.thor.celda, pivote: chars.thor.pivote, anims, capa_de: 'thor', ...(chars.thor.perfil_movimiento ? { perfil_movimiento: chars.thor.perfil_movimiento } : {}) };
      log(`mascota/${id}: ${Object.keys(anims).length} animaciones`);
    }
  }
  for (const id of enemies) {
    const f = enemyFicha(id);
    chars[id] = exportChar('enemigos', id, f, enemyCell(id), enemyAnims(id), { tipo: 'enemigo', nombre: id }, files, log);
  }
  // jefes: se dibujan a su tamaño final (celda 128, sin agrandar). Uno que todavía no tenga su versión grande sale
  // como antes: dibujado en 64 y agrandado x1.5 a celda 96
  for (const b of [boss, ...(opts.boss ? [] : (['guardian_campana'] as EnemyId[]))]) {
    const spec = BIG_BOSSES[b];
    if (spec) { chars[b] = exportBoss(spec, files, log, opts.bossCache, opts.quick); continue; }
    const f = enemyFicha(b);
    chars[b] = exportChar('enemigos', b, f, 64, [...enemyAnims(b), 'leap'], { tipo: 'jefe', nombre: b }, files, log, 1.5);
  }
  // el Mundo 3: enemigos y la Polilla Reina con el motor de volúmenes (a su celda, sin agrandar)
  if (!opts.sinMundo3) {
    for (const [spec, extra] of [
      [POLILLA_CENIZA_SPEC, { tipo: 'enemigo', nombre: 'Polilla de Ceniza', vuela: true }],
      [MINERO_PIEDRA_SPEC, { tipo: 'enemigo', nombre: 'Minero de Piedra' }],
      [SOMBRA_SPEC, { tipo: 'enemigo', nombre: 'Sombra' }],
      [POLILLA_REINA_SPEC, { tipo: 'jefe', nombre: 'Polilla Reina', vuela: true }],
    ] as [BossSpec, Partial<CharEntry>][]) chars[spec.id] = exportBoss(spec, files, log, opts.bossCache, opts.quick, extra);
  }
  // el Mundo 4: los enemigos del puerto y el Capitán Ahogado (a su celda, sin agrandar)
  if (!opts.sinMundo4) {
    for (const [spec, extra] of [
      [MARINERO_NIEBLA_SPEC, { tipo: 'enemigo', nombre: 'Marinero de Niebla' }],
      [CANGREJO_CENIZA_SPEC, { tipo: 'enemigo', nombre: 'Cangrejo de Ceniza' }],
      [MEDUSA_NEGRA_SPEC, { tipo: 'enemigo', nombre: 'Medusa Negra', vuela: true }],
      [CAPITAN_AHOGADO_SPEC, { tipo: 'enemigo', nombre: 'El Capitán Ahogado', elite: true }],
    ] as [BossSpec, Partial<CharEntry>][]) chars[spec.id] = exportBoss(spec, files, log, opts.bossCache, opts.quick, extra);
  }
  // los que no pelean: el mercader de las fogatas (8 direcciones, para que mire a la heroína)
  for (const id of NPCS) {
    const f = merchantFicha();
    const c = creditsFor(f);
    if (c) credits.add(c);
    chars[id] = exportChar('personajes', id, f, 48, NPC_ANIMS[id], { tipo: 'npc', nombre: NPC_NOMBRES[id] }, files, log);
  }
  manifest.personajes = chars;

  // ---------- poderes ----------
  const fx: Record<string, { archivo: string; cuadros: number; fps: number; loop: boolean; celda: number }> = {};
  const addFx = (name: string, frames: Raster[], fps: number, loop: boolean) => {
    const a = `fx/${name}.png`;
    files.push(png(a, strip(frames)));
    fx[name] = { archivo: a, cuadros: frames.length, fps, loop, celda: frames[0].w };
  };
  const elements: FxElement[] = ['fuego', 'hielo', 'sagrado', 'veneno', 'arcano', 'rayo', 'naturaleza'];
  for (const element of elements) {
    for (const { dir, clip } of projectile8({ element, cell: 48 })) addFx(`proyectil_${element}_${dir}`, clip.frames, clip.fps, clip.loop);
    for (const kind of ['impact', 'nova'] as const) { const c = renderFx({ kind, element, cell: 48 }); addFx(`${kind === 'impact' ? 'impacto' : 'nova'}_${element}`, c.frames, c.fps, c.loop); }
  }
  for (const [kind, element, name] of [['slash', 'sagrado', 'tajo'], ['heal', 'sagrado', 'curar'], ['shield', 'sagrado', 'escudo_de_thor'], ['aura', 'sagrado', 'aura_nivel'], ['buff', 'fuego', 'grito_de_guerra'], ['circle', 'arcano', 'circulo_magico']] as const) {
    const c = renderFx({ kind, element, cell: 48 });
    addFx(name, c.frames, c.fps, c.loop);
  }
  // la flecha: pintada a mano, 2 cuadros en vuelo y astillas al pegar
  for (const { dir, frames } of rotate8(arrowProjectile(48))) addFx(`proyectil_flecha_${dir}`, frames, 14, true);
  addFx('impacto_flecha', arrowImpact(48), 16, false);
  // el pisotón del minotauro: celda 96, polvo y grietas en anillo
  addFx('onda_pisoton', stompWave(96), 16, false);
  // tierra que tira Thor al cavar
  addFx('tierra_cavada', dirtDig(48), 10, false);
  // la Polilla Reina: dónde va a caer el polvo (capa suelo) y la nube que apaga la luz donde cae
  addFx('aviso_polvo', dustWarning(), 10, false);
  addFx('nube_polvo', dustCloud(), 12, false);
  manifest.fx = fx;
  log(`fx: ${Object.keys(fx).length}`);

  // ---------- botín ----------
  const loot = allLoot();
  const uniqueIds = new Set(UNIQUE_LOOT.map((i) => i.id));
  // tres atlas: normales (1 cuadro), únicos y set (8 cuadros) y armaduras de nivel 5 (8 cuadros).
  // Separados para que ninguno pase de 4096 px a 64.
  const groups: Record<string, typeof loot> = {
    iconos: loot.filter((i) => !isSpecial(i.rarity)),
    especiales: loot.filter((i) => uniqueIds.has(i.id)),
    armadura_n5: loot.filter((i) => isSpecial(i.rarity) && !uniqueIds.has(i.id)),
  };
  const atlasOf = new Map<string, string>();
  const atlas: Record<string, Record<number, string>> = {};
  for (const [g, items] of Object.entries(groups)) {
    if (!items.length) continue;
    atlas[g] = {};
    for (const it of items) atlasOf.set(it.id, g);
    for (const px of [32, 64] as const) {
      files.push(...exportLootIcons(items, px, true, `botin/${g}_${px}`));
      atlas[g][px] = `botin/${g}_${px}.json`;
    }
  }
  files.push(...exportLootWorld(UNIQUE_LOOT, 'botin/mundo'));
  const catalog = lootCatalog(loot) as { items: { id: string; atlas?: string; visual?: { capa: TipoCapa; clave: string } }[] };
  const porId = new Map(loot.map((i) => [i.id, i]));
  for (const it of catalog.items) {
    it.atlas = atlasOf.get(it.id);
    // la capa de equipo que se ve en la heroína con esto puesto
    const li = porId.get(it.id);
    const v = li ? capaDeObjeto(li as never, handKindOf(li)) : null;
    if (v) it.visual = v;
  }
  files.push(json('botin/catalogo.json', catalog));
  manifest.botin = {
    atlas, iconos: atlas.iconos, especiales: atlas.especiales,
    mundo: 'botin/mundo.json', catalogo: 'botin/catalogo.json',
    notas: 'Cada objeto del catálogo dice en qué atlas está (`atlas`). Los íconos van con su casillero (borde de la rareza). Los de 8 cuadros (animated) se animan con <icon>_0 a <icon>_7. Los que caen al piso (cae_*) son solo los únicos y el set.',
  };
  log('botín listo');

  // ---------- mundos: el Bosque GG (mundo 1), la Catedral de las Raíces (mundo 2) y las Galerías del Eco (mundo 3) ----------
  const hechos = new Set<string>();
  const once = (f: ExportFile) => { if (!hechos.has(f.name)) { hechos.add(f.name); files.push(f); } };
  const parts: Record<string, unknown> = {};
  for (const p of particles()) { const n = `mundo/particulas/${p.name}.png`; once(png(n, strip(p.frames))); parts[p.name] = { archivo: n, w: p.w, h: p.h, cuadros: p.frames.length, fps: p.fps }; }
  const crit: Record<string, unknown> = {};
  for (const c of [...creatures(), ...smallCreatures(), shadowEyes()]) {
    const anims: Record<string, unknown> = {};
    for (const [an, a] of Object.entries(c.anims)) { const n = `mundo/criaturas/${c.name}_${an}.png`; once(png(n, strip(a.frames))); anims[an] = { archivo: n, cuadros: a.frames.length, fps: a.fps, loop: a.loop }; }
    crit[c.name] = { w: c.w, h: c.h, anims };
  }
  once(png('mundo/niebla_nubes.png', fogTexture('nubes', 256)));
  once(png('mundo/niebla_jirones.png', fogTexture('jirones', 256)));
  once(png('mundo/luz.png', lightTexture()));
  once(png('mundo/nube.png', cloudShadow()));
  const exportarMundo = (big: BigMap, slug: string, nombre: string, agua: string, portal?: string) => {
    const tiled = bigMapToTiled(big, 'suelo');
    once(json(`mundo/${big.name}.json`, tiled.json));
    once(png(agua, tiled.aguaPng));
    once(png(`mundo/${big.name}_espuma.png`, tiled.espumaPng));
    for (const c of tiled.chunks) once(png(`mundo/${c.name}`, c.img));
    // vista completa a la mitad (para mirar el mapa) y postales a tamaño real (lo que se ve en pantalla)
    const full = renderBigMap(big);
    once(png(`mundo/${slug}_vista.png`, half(renderBigMap(big, { entities: true }))));
    const postales: Record<string, string> = {};
    for (const p of big.postales) { const n = `mundo/postales/${p.nombre}.png`; once(png(n, cropView(full, p.x, p.y))); postales[p.nombre] = n; }
    const objManifest: Record<string, unknown> = {};
    for (const o of big.objects) {
      const anims: Record<string, unknown> = {};
      for (const [an, a] of Object.entries(o.anims)) {
        const name = `mundo/objetos/${o.name}_${an}.png`;
        once(png(name, strip(a.frames)));
        anims[an] = { archivo: name, cuadros: a.frames.length, fps: a.fps, loop: a.loop };
      }
      // sombra horneada (mismo tamaño que el objeto): el juego la dibuja debajo de todo, en vez de la elipse
      let sombra: { sombra: string } | Record<string, never> = {};
      if (o.shadow) { const n = `mundo/objetos/${o.name}_sombra.png`; once(png(n, o.shadow)); sombra = { sombra: n }; }
      objManifest[o.name] = { w: o.w, h: o.h, apoyo: o.anchor, solido: o.solid, ...(o.solids ? { solidos: o.solids } : {}), ...(o.layer ? { capa: o.layer } : {}), ...(o.light ? { luz: o.light } : {}), ...(o.foam ? { espuma: o.foam } : {}), ...(o.base ? { base: o.base } : {}), ...sombra, anims };
    }
    return {
      mapa: `mundo/${big.name}.json`, nombre, ancho: big.w, alto: big.h, cuadro: TILE, trozo: CHUNK,
      agua, espuma: { archivo: `mundo/${big.name}_espuma.png`, capa: 'espuma', columnas: waterExtras(big).columnas, cuadros: ESPUMA.cuadros, fps: ESPUMA.fps }, reflejo: { capa: 'reflejo' },
      suelo: tiled.chunks.map((c) => ({ archivo: `mundo/${c.name}`, x: c.x, y: c.y })),
      vista: `mundo/${slug}_vista.png`, postales, objetos: objManifest, ...(portal ? { portal, portales: 'Portales premium (#40), 96 x 128 con apoyo abajo al centro: anims girar (12 a 12 fps), abrir (8), cerrar (6), y las capas sueltas arco (1) y remolino (12). `portal` es el de este mundo; portal_azul y portal_rojo siguen en todos.' } : {}), ...(big.meta?.fondo ? { fondo: big.meta.fondo.map((f) => ({ objeto: f.id, paralaje: f.paralaje })) } : {}), particulas: parts, criaturas: crit, luz: 'mundo/luz.png', nube: 'mundo/nube.png',
      niebla: { nubes: 'mundo/niebla_nubes.png', jirones: 'mundo/niebla_jirones.png', notas: 'Texturas de 256 que pegan por los 4 lados. Dibujar a escala 2, corriendo con el viento (jirones 12 px/s, nubes 7 px/s con parallax 1.15), con alfa = zona.niebla.' },
      referencia: 'tools/pixel_forja/scripts/visor/runtime.js anima todo esto en Canvas 2D: es la referencia para el juego.',
      notas: 'Orden de dibujo: capa fondo (paralaje) > agua (cuadros animados) > suelo (trozos de imagen, el agua es transparente) > objetos con capa suelo > sombras horneadas (campo sombra; si no hay, la elipse de siempre) > objetos y personajes ordenados por y > capa frente (no va en el mapa: la zona la declara en su propiedad frente y el juego la pega a los bordes de la pantalla, con paralaje 1.15) > luces (aditivo) > sombras de nube. Cada zona del mapa trae musica, ambiente, luz, oscuridad y particulas.',
    };
  };
  const bosque = exportarMundo(bosqueMap(), 'mundo1', 'Bosque GG', 'mundo/agua.png', 'portal_verde');
  log('bosque listo');
  const catedral = exportarMundo(catedralMap(), 'mundo2', 'La Catedral de las Raíces', 'mundo/mundo2_agua.png', 'portal_violeta');
  log('catedral lista');
  const galeriasBig = opts.sinMundo3 ? null : galeriasMap();
  const galerias = galeriasBig ? {
    ...exportarMundo(galeriasBig, 'mundo3', 'Las Galerías del Eco', 'mundo/mundo3_agua.png', 'portal_ambar'),
    cristales: {
      capa: 'cristales', total: galeriasBig.cristales!.filter((c) => !c.grande).length, grandes: galeriasBig.cristales!.filter((c) => c.grande).length,
      objetos: { apagado: 'cristal_apagado_<forma>', prendido: 'cristal_prendido_<forma>', prenderse: 'anim prenderse de cristal_prendido_<forma>', grande_apagado: 'cristal_grande_apagado', grande_prendido: 'cristal_grande_prendido' },
      notas: 'Capa de objetos `cristales` del mapa: cada punto es el pie del cristal (x, y) con id, color (cian, violeta, ambar), forma (0 cian, 1 violeta, 2 ámbar: forma y color van juntos) y grande. Arrancan apagados; el juego los dibuja apagados o prendidos según su estado (src/logic/abismo.ts). Son sólidos como el objeto (14 x 6 al pie; los grandes 30 x 10).',
    },
  } : null;
  if (galerias) log('galerías listas');
  // el Mundo 4: el Puerto Ahogado, con sus mareas
  const puertoBig = opts.sinMundo4 ? null : puertoMap();
  const puerto = puertoBig ? (() => {
    const ojos = marinerEyes(), anims: Record<string, unknown> = {};
    for (const [an, a] of Object.entries(ojos.anims)) { const n = `mundo/criaturas/${ojos.name}_${an}.png`; once(png(n, strip(a.frames))); anims[an] = { archivo: n, cuadros: a.frames.length, fps: a.fps, loop: a.loop }; }
    const base = exportarMundo(puertoBig, 'mundo4', 'El Puerto Ahogado', 'mundo/mundo4_agua.png', 'portal_rojo');
    return {
      ...base,
      criaturas: { ...crit, marinero_ojos: { w: ojos.w, h: ojos.h, anims } },
      marea: {
        capas: { baja: 'marea_baja', alta: 'marea_alta' }, agua: 'agua_marea', flotante: 'muelle_flotante',
        notas: 'Capas de cuadros del mapa (1 = solo se camina con esa marea). En `colision` los dos van libres: con la marea alta el juego suma marea_baja a la colisión y dibuja agua_marea en esos cuadros; con la baja suma marea_alta y deja los muelles flotantes en `abajo` (al subir: anim subir y después arriba). Desde cualquier cuadro que se camina hay camino a un farol con las dos mareas.',
      },
      faroles: { apagado: 'farol_muelle_apagado', prendido: 'farol_muelle_prendido', prenderse: 'farol_muelle_prenderse', notas: 'Entidades farol_muelle (el poste, con `punto` = id del punto_guardado). Arrancan apagados; Thor los prende. El primero (tutorial) enseña el farol de Thor.' },
      notas_luz: 'Sin sombras horneadas con dirección: los objetos traen solo la sombra de contacto al pie (campo sombra). La sombra larga la hace el juego lejos de la luz que alumbra (el farol de Thor, los faroles del muelle y el faro).',
    };
  })() : null;
  if (puerto) log('puerto listo');
  // `mundo` sigue siendo el Bosque (un juego viejo lo lee así); `mundos` trae todos en orden de bajada
  manifest.mundo = bosque;
  manifest.mundos = [{ id: 'mundo1', ...bosque }, { id: 'mundo2', ...catedral }, ...(galerias ? [{ id: 'mundo3', ...galerias }] : []), ...(puerto ? [{ id: 'mundo4', ...puerto }] : [])];
  log('mundo listo');

  let introLogo: Record<string, unknown> | null = null;
  // ---------- interfaz ----------
  const ui: Record<string, unknown> = {};
  for (const s of [...hudSprites(), ...hudIcons(), rotateTablet()]) {
    const name = `ui/${s.name}.png`;
    files.push(png(name, strip(s.frames)));
    ui[s.name] = { archivo: name, w: s.frames[0].w, h: s.frames[0].h, cuadros: s.frames.length, ...(s.slice ? { nueve: s.slice } : {}) };
  }
  const carteles: Record<string, string> = {};
  for (const s of signIcons()) { const n = `ui/carteles/${s.name}.png`; files.push(png(n, s.frames[0])); carteles[s.name] = n; }
  ui.iconos_cartel = carteles;
  const habilidades: Record<string, string> = {};
  for (const s of skillIcons()) { const n = `ui/habilidades/${s.name}.png`; files.push(png(n, s.frames[0])); habilidades[s.name] = n; }
  ui.habilidades = habilidades;
  const dg = digitSheet();
  files.push(png('ui/numeros.png', dg.png));
  ui.numeros = { archivo: 'ui/numeros.png', w: dg.cw, h: dg.ch, caracteres: DIGITS, filas: dg.colors };
  const inv = inventoryPanel();
  files.push(png('ui/inventario.png', inv.png));
  ui.inventario = { archivo: 'ui/inventario.png', w: inv.layout.w, h: inv.layout.h, cuadros: 1, layout: inv.layout };
  if (opts.fonts) {
    const fuentes: Record<string, unknown> = {};
    for (const f of bitmapFonts(opts.fonts.regular, opts.fonts.bold)) {
      files.push(png(`ui/fuentes/${f.name}.png`, f.png));
      files.push(file(`ui/fuentes/${f.name}.fnt`, enc.encode(f.fnt), 'application/xml'));
      fuentes[f.name] = { png: `ui/fuentes/${f.name}.png`, fnt: `ui/fuentes/${f.name}.fnt`, alto_linea: f.lineHeight, base: f.base };
    }
    // logo animado con la misma fuente de títulos
    const logo = renderLogo(opts.fonts.bold);
    files.push(png('ui/logo.png', strip(logo)));
    ui.logo = { archivo: 'ui/logo.png', w: 288, h: 96, cuadros: logo.length, fps: 8, loop: true };
    // el logo con fuego del intro: al doble, 16 cuadros en una grilla de 4 x 4 (una tira pasaría de 4096)
    if (!opts.sinIntro) {
      const lf = logoFuego(logo[0]), C = 4, lw = lf[0].w, lh = lf[0].h;
      const grid = createRaster(lw * C, lh * Math.ceil(lf.length / C));
      lf.forEach((fr, i) => blit(grid, fr, (i % C) * lw, Math.floor(i / C) * lh));
      files.push(png('intro/logo_fuego.png', grid));
      introLogo = { archivo: 'intro/logo_fuego.png', w: lw, h: lh, cuadros: lf.length, fps: 12, loop: true, columnas: C, notas: 'Cuadro i en la columna i % 4, fila floor(i / 4). El logo de siempre al doble, con 32 px de aire arriba para las llamas.' };
    }
    ui.fuentes = { ...fuentes, notas: 'BMFont XML: this.load.bitmapFont(nombre, png, fnt). fuente_ui (8 px, blanca con sombra, se tiñe con setTint; usar escala entera x2 o x3), fuente_titulo y fuente_titulo_plata (16 px, ya pintadas). Tienen ñ, tildes, ¡ y ¿.' };
  }
  // ---------- el intro (parte 4): paneles en capas, fuego, humo y el logo con fuego ----------
  if (!opts.sinIntro) {
    const intro: Record<string, unknown> = {};
    for (const p of introPanels()) {
      intro[p.id] = {
        w: p.w, h: p.h, notas: p.notas,
        capas: p.capas.map((c) => { const n = `intro/${p.id}_${c.nombre}.png`; files.push(png(n, strip(c.frames))); return { nombre: c.nombre, archivo: n, cuadros: c.frames.length, fps: c.fps, paralaje: c.paralaje }; }),
      };
    }
    const fp = fuegoPared(), hg = humoGrande();
    files.push(png('intro/fuego_pared.png', strip(fp)), png('intro/humo_grande.png', strip(hg)));
    intro.fuego_pared = { archivo: 'intro/fuego_pared.png', w: 128, h: 96, cuadros: fp.length, fps: 12, loop: true, notas: 'Pega de lado a lado: repetirla a lo ancho de la pantalla. Sin piedras.' };
    intro.humo_grande = { archivo: 'intro/humo_grande.png', w: 128, h: 128, cuadros: hg.length, fps: 6, loop: false, notas: 'Cruza la pantalla delante de todo y se desvanece (el último cuadro ya casi no se ve).' };
    if (introLogo) intro.logo_fuego = introLogo;
    intro.audio = { musica: 'musica_intro', latido: 'latido' };
    intro.notas = 'Paneles de 480 x 270 (el corte del abismo 480 x 540) para agrandar x2 o x3 entero. Cada capa es una tira de cuadros; dibujar fondo, medio y frente en ese orden, cada una corrida con su paralaje respecto de la cámara. La luz sale de abajo, del fuego. Momentos de GUION_INTRO: brasas y cueva > intro_bosque_noche e intro_corte_abismo, ojos > intro_ojos, guardianes > intro_guardianes, familia > intro_familia, titulo > logo_fuego sobre fuego_pared.';
    manifest.intro = intro;
    log('intro listo');
  }
  files.push(png('ui/continuara.png', continuara()));
  ui.continuara = { archivo: 'ui/continuara.png', w: 960, h: 540, cuadros: 1 };
  manifest.ui = ui;
  // íconos de la app (PWA): Thor sobre el portal
  const app: Record<string, unknown> = {};
  for (const ic of appIcons()) { const n = `app/${ic.name}.png`; files.push(png(n, ic.img)); app[ic.name] = { archivo: n, tam: ic.size, uso: ic.purpose }; }
  manifest.app = app;

  // ---------- audio ----------
  const audio: Record<string, string> = {};
  // los efectos en bucle (el carrito) no se apagan al final, como los ambientes
  for (const n of SFX_NAMES) { const a = `audio/${n}.wav`; files.push(file(a, encodeWav(SFX[n](), undefined, SFX_BUCLE.has(n)), 'audio/wav')); audio[n] = a; }
  // las músicas nuevas que van en bucle no se apagan al final (las de antes quedan como estaban)
  for (const [n, fn] of Object.entries(MUSIC)) { const a = `audio/musica_${n}.wav`; files.push(file(a, encodeWav(fn(), undefined, MUSICA_BUCLE.has(n)), 'audio/wav')); audio[`musica_${n}`] = a; }
  for (const n of AMBIENCE_NAMES) { const a = `audio/ambiente_${n}.wav`; files.push(file(a, encodeWav(ambience(n), undefined, true), 'audio/wav')); audio[`ambiente_${n}`] = a; }
  manifest.audio = audio;
  log('audio listo');

  // ---------- créditos y manifest ----------
  const creditTxt = ['GG Abyss: créditos del arte', '', 'Personajes, mundo, botín, interfaz y sonidos generados con PixelForja (código).', '', ...(opts.fonts ? ['Fuentes: Silkscreen, de Jason Kottke. SIL Open Font License 1.1 (https://openfontlicense.org).', ''] : []), ...credits].join('\n');
  files.push(file('CREDITOS.txt', enc.encode(creditTxt), 'text/plain'));
  manifest.creditos = 'CREDITOS.txt';
  // ninguna textura más grande que lo que soportan las tablets
  const tooBig: string[] = [];
  for (const f of files) if (f.mime === 'image/png') { const w = (f.bytes[16] << 24) | (f.bytes[17] << 16) | (f.bytes[18] << 8) | f.bytes[19], h = (f.bytes[20] << 24) | (f.bytes[21] << 16) | (f.bytes[22] << 8) | f.bytes[23]; if (w > MAX_TEX || h > MAX_TEX) tooBig.push(`${f.name} ${w}x${h}`); }
  if (tooBig.length) throw new Error(`Texturas más grandes que ${MAX_TEX}: ${tooBig.join(', ')}`);
  files.push(json('manifest.json', manifest));
  return files;
}
