import { createRaster, blit, type Raster } from '../core/raster';
import { encodePng } from '../export/png';
import { creditsFor, type ExportFile } from '../export/bundle';
import { renderClip, EIGHT_VIEWS, VIEW_SUFFIX, hasAnim } from '../render/clip';
import type { Ficha, CellSize, HumanFicha } from '../sheet/ficha';
import { familyFicha, thorFicha, FAMILY, FAMILY_GG, type FamilyId } from '../rpg/family';
import { enemyFicha, enemyAnims, enemyCell, HERO_RPG_ANIMS, type EnemyId } from '../rpg/presets';
import { PET_RPG_ANIMS } from '../anim/animal';
import { renderFx, projectile8, rotate8, type FxElement } from '../fx/fx';
import { scaleRaster } from '../render/rotsprite';
import { arrowProjectile, arrowImpact } from '../fx/arrow';
import { stompWave } from '../fx/stomp';
import { exportLootIcons, exportLootWorld, lootCatalog } from '../loot/export';
import { allLoot, UNIQUE_LOOT } from '../loot/catalog';
import { isSpecial } from '../loot/render';
import { TILE } from '../world/tiles';
import { bosqueMap, bigMapToTiled, renderBigMap, cropView, CHUNK } from '../world/bosqueMap';
import { particles, lightTexture, cloudShadow } from '../world/ambient';
import { creatures, fogTexture } from '../world/atmosphere';
import { ambience, AMBIENCE_NAMES } from '../audio/ambience';
import { hudSprites, digitSheet, DIGITS, inventoryPanel } from '../ui/hud';
import { bitmapFonts, renderLogo } from '../ui/fonts';
import { appIcons } from '../ui/appIcons';
import { signIcons, hudIcons, rotateTablet, skillIcons } from '../ui/icons2';
import { SFX, SFX_NAMES, MUSIC, encodeWav } from '../audio/sfx';
import { PET_ARMOR } from '../render/pet3d';

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
}

/** Hoja de una animación en 8 direcciones: fila = dirección, columna = cuadro. */
function sheet8(f: Ficha, cell: CellSize, anim: string, k = 1): { png: Raster; frames: number; fps: number; loop: boolean } | null {
  if (!hasAnim(f, anim)) return null;
  const clips = EIGHT_VIEWS.map((v) => renderClip(f, cell, anim, v, { props: true }));
  const n = Math.max(...clips.map((c) => c.frames.length));
  const C = Math.round(cell * k);
  const png = createRaster(n * C, 8 * C);
  clips.forEach((c, row) => c.frames.forEach((fr, i) => blit(png, k === 1 ? fr : scaleRaster(fr, k), i * C, row * C)));
  return { png, frames: n, fps: clips[0].fps, loop: clips[0].loop };
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

export interface CharEntry { tipo: 'heroe' | 'enemigo' | 'jefe' | 'mascota'; nombre: string; celda: number; pivote: [number, number]; anims: Record<string, { archivo: string; cuadros: number; fps: number; loop: boolean }>; clase?: string; retrato?: string; desde_estudio?: boolean }

/** k: se dibuja en `cell` y se agranda por k a la manera de RotSprite (el jefe: 64 x 1.5 = celda 96). */
function exportChar(prefix: string, id: string, f: Ficha, cell: CellSize, anims: string[], entry: Omit<CharEntry, 'anims' | 'celda' | 'pivote'>, files: ExportFile[], log: (m: string) => void, k = 1): CharEntry {
  const C = Math.round(cell * k);
  const out: CharEntry = { ...entry, celda: C, pivote: [C / 2, Math.floor((cell - 2) * k)], anims: {} };
  for (const a of anims) {
    const s = sheet8(f, cell, a, k);
    if (!s) continue;
    const name = `${prefix}/${id}_${a}.png`;
    files.push(png(name, s.png));
    out.anims[a] = { archivo: name, cuadros: s.frames, fps: s.fps, loop: s.loop };
  }
  log(`${prefix}/${id}: ${Object.keys(out.anims).length} animaciones`);
  return out;
}

/** Arma todo el kit. Devuelve los archivos (rutas relativas a la carpeta del kit). */
export function buildGameKit(opts: KitOptions = {}): ExportFile[] {
  const log = opts.progress ?? (() => {});
  const files: ExportFile[] = [];
  const heroes = opts.heroes ?? FAMILY;
  const enemies = opts.enemies ?? (['rata', 'calabaza', 'goblin_arquero', 'trol'] as EnemyId[]);
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
    chars[id] = exportChar('personajes', id, f, 48, heroAnims, { tipo: 'heroe', nombre: f.name || fam?.name || id, ...(fam ? { clase: fam.clase } : {}), retrato: `personajes/retrato_${id}.png`, ...(custom[id] ? { desde_estudio: true } : {}) }, files, log);
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
  for (const id of enemies) {
    const f = enemyFicha(id);
    chars[id] = exportChar('enemigos', id, f, enemyCell(id), enemyAnims(id), { tipo: 'enemigo', nombre: id }, files, log);
  }
  {
    const f = enemyFicha(boss);
    // el jefe llena la pantalla: dibujado en 64 (ahí le caben los cuernos) y agrandado x1.5 a celda 96
    chars[boss] = exportChar('enemigos', boss, f, 64, [...enemyAnims(boss), 'leap'], { tipo: 'jefe', nombre: boss }, files, log, 1.5);
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
  const catalog = lootCatalog(loot) as { items: { id: string; atlas?: string }[] };
  for (const it of catalog.items) it.atlas = atlasOf.get(it.id);
  files.push(json('botin/catalogo.json', catalog));
  manifest.botin = {
    atlas, iconos: atlas.iconos, especiales: atlas.especiales,
    mundo: 'botin/mundo.json', catalogo: 'botin/catalogo.json',
    notas: 'Cada objeto del catálogo dice en qué atlas está (`atlas`). Los íconos van con su casillero (borde de la rareza). Los de 8 cuadros (animated) se animan con <icon>_0 a <icon>_7. Los que caen al piso (cae_*) son solo los únicos y el set.',
  };
  log('botín listo');

  // ---------- mundo 1: el Bosque GG grande ----------
  const big = bosqueMap();
  const tiled = bigMapToTiled(big, 'suelo');
  files.push(json('mundo/mundo1_bosque.json', tiled.json));
  files.push(png('mundo/agua.png', tiled.aguaPng));
  for (const c of tiled.chunks) files.push(png(`mundo/${c.name}`, c.img));
  // vista completa a la mitad (para mirar el mapa) y postales a tamaño real (lo que se ve en pantalla)
  const full = renderBigMap(big);
  files.push(png('mundo/mundo1_vista.png', half(renderBigMap(big, { entities: true }))));
  const postales: Record<string, string> = {};
  for (const p of big.postales) { const n = `mundo/postales/${p.nombre}.png`; files.push(png(n, cropView(full, p.x, p.y))); postales[p.nombre] = n; }
  const objManifest: Record<string, unknown> = {};
  for (const o of big.objects) {
    const anims: Record<string, unknown> = {};
    for (const [an, a] of Object.entries(o.anims)) {
      const name = `mundo/objetos/${o.name}_${an}.png`;
      files.push(png(name, strip(a.frames)));
      anims[an] = { archivo: name, cuadros: a.frames.length, fps: a.fps, loop: a.loop };
    }
    objManifest[o.name] = { w: o.w, h: o.h, apoyo: o.anchor, solido: o.solid, ...(o.solids ? { solidos: o.solids } : {}), ...(o.layer ? { capa: o.layer } : {}), ...(o.light ? { luz: o.light } : {}), anims };
  }
  const parts: Record<string, unknown> = {};
  for (const p of particles()) { const n = `mundo/particulas/${p.name}.png`; files.push(png(n, strip(p.frames))); parts[p.name] = { archivo: n, w: p.w, h: p.h, cuadros: p.frames.length, fps: p.fps }; }
  const crit: Record<string, unknown> = {};
  for (const c of creatures()) {
    const anims: Record<string, unknown> = {};
    for (const [an, a] of Object.entries(c.anims)) { const n = `mundo/criaturas/${c.name}_${an}.png`; files.push(png(n, strip(a.frames))); anims[an] = { archivo: n, cuadros: a.frames.length, fps: a.fps, loop: a.loop }; }
    crit[c.name] = { w: c.w, h: c.h, anims };
  }
  files.push(png('mundo/niebla_nubes.png', fogTexture('nubes', 256)));
  files.push(png('mundo/niebla_jirones.png', fogTexture('jirones', 256)));
  files.push(png('mundo/luz.png', lightTexture()));
  files.push(png('mundo/nube.png', cloudShadow()));
  manifest.mundo = {
    mapa: 'mundo/mundo1_bosque.json', nombre: 'Bosque GG', ancho: big.w, alto: big.h, cuadro: TILE, trozo: CHUNK,
    agua: 'mundo/agua.png', suelo: tiled.chunks.map((c) => ({ archivo: `mundo/${c.name}`, x: c.x, y: c.y })),
    vista: 'mundo/mundo1_vista.png', postales, objetos: objManifest, particulas: parts, criaturas: crit, luz: 'mundo/luz.png', nube: 'mundo/nube.png',
    niebla: { nubes: 'mundo/niebla_nubes.png', jirones: 'mundo/niebla_jirones.png', notas: 'Texturas de 256 que pegan por los 4 lados. Dibujar a escala 2, corriendo con el viento (jirones 12 px/s, nubes 7 px/s con parallax 1.15), con alfa = zona.niebla.' },
    referencia: 'tools/pixel_forja/scripts/visor/runtime.js anima todo esto en Canvas 2D: es la referencia para el juego.',
    notas: 'Orden de dibujo: agua (cuadros animados) > suelo (trozos de imagen, el agua es transparente) > objetos con capa suelo > objetos y personajes ordenados por y > luces (aditivo) > sombras de nubes. Cada zona del mapa trae musica, ambiente, luz, oscuridad y particulas.',
  };
  log('mundo listo');

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
    ui.fuentes = { ...fuentes, notas: 'BMFont XML: this.load.bitmapFont(nombre, png, fnt). fuente_ui (8 px, blanca con sombra, se tiñe con setTint; usar escala entera x2 o x3), fuente_titulo y fuente_titulo_plata (16 px, ya pintadas). Tienen ñ, tildes, ¡ y ¿.' };
  }
  manifest.ui = ui;
  // íconos de la app (PWA): Thor sobre el portal
  const app: Record<string, unknown> = {};
  for (const ic of appIcons()) { const n = `app/${ic.name}.png`; files.push(png(n, ic.img)); app[ic.name] = { archivo: n, tam: ic.size, uso: ic.purpose }; }
  manifest.app = app;

  // ---------- audio ----------
  const audio: Record<string, string> = {};
  for (const n of SFX_NAMES) { const a = `audio/${n}.wav`; files.push(file(a, encodeWav(SFX[n]()), 'audio/wav')); audio[n] = a; }
  for (const [n, fn] of Object.entries(MUSIC)) { const a = `audio/musica_${n}.wav`; files.push(file(a, encodeWav(fn()), 'audio/wav')); audio[`musica_${n}`] = a; }
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
