import { zipSync } from 'fflate';
import type { SheetJson } from './sheet';
import type { RenderedClip } from '../render/clip';
import { encodePng } from './png';
import { hashString } from '../core/rng';

/**
 * Godot 4: un recurso SpriteFrames (.tres) que recorta la hoja con AtlasTexture.
 * Se pone junto al PNG en el proyecto y se asigna a un AnimatedSprite2D.
 */
export function godotSpriteFrames(sheet: SheetJson, pngName: string): string {
  const lines: string[] = [];
  const keys = Object.keys(sheet.frames);
  lines.push(`[gd_resource type="SpriteFrames" load_steps=${keys.length + 2} format=3]`, '');
  lines.push(`[ext_resource type="Texture2D" path="res://${pngName}" id="1_sheet"]`, '');
  keys.forEach((k, i) => {
    const f = sheet.frames[k].frame;
    lines.push(`[sub_resource type="AtlasTexture" id="AtlasTexture_${i}"]`, 'atlas = ExtResource("1_sheet")', `region = Rect2(${f.x}, ${f.y}, ${f.w}, ${f.h})`, '');
  });
  const anims = Object.entries(sheet.anims).map(([name, a]) => {
    const frames = Array.from({ length: a.frames }, (_, k) => `{\n"duration": 1.0,\n"texture": SubResource("AtlasTexture_${keys.indexOf(`${name}_${k}`)}")\n}`);
    return `{\n"frames": [${frames.join(', ')}],\n"loop": ${a.loop},\n"name": &"${name}",\n"speed": ${a.fps.toFixed(1)}\n}`;
  });
  lines.push('[resource]', `animations = [${anims.join(', ')}]`, '');
  return lines.join('\n');
}

function hex32(seed: string): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += hashString(`${seed}:${i}`).toString(16).padStart(8, '0');
  return s;
}

/**
 * Unity: el .meta de la textura con el modo "Multiple" y los recortes listos (filtro Point, sin compresión).
 * Unity cuenta la y desde abajo. Se copia junto al PNG dentro de Assets.
 */
export function unityMeta(sheet: SheetJson, pngName: string): string {
  const H = sheet.meta.size.h;
  const [px, py] = sheet.pivot;
  const cw = sheet.cell[0], ch = sheet.cell[1];
  const pivot = { x: px / cw, y: (ch - py) / ch };
  const sprites = Object.entries(sheet.frames).map(([name, f], i) => {
    const internal = (BigInt(hashString(`${pngName}:${name}`)) * 1000n + BigInt(i)).toString();
    return { name, internal, text: [
      `    - serializedVersion: 2`,
      `      name: ${name}`,
      `      rect:`, `        serializedVersion: 2`, `        x: ${f.frame.x}`, `        y: ${H - f.frame.y - f.frame.h}`, `        width: ${f.frame.w}`, `        height: ${f.frame.h}`,
      `      alignment: 9`, `      pivot: {x: ${pivot.x.toFixed(5)}, y: ${pivot.y.toFixed(5)}}`, `      border: {x: 0, y: 0, z: 0, w: 0}`,
      `      outline: []`, `      physicsShape: []`, `      tessellationDetail: 0`, `      bones: []`,
      `      spriteID: ${hex32(`${pngName}:${name}`)}`, `      internalID: ${internal}`, `      vertices: []`, `      indices: `, `      edges: []`, `      weights: []`,
    ].join('\n') };
  });
  return [
    'fileFormatVersion: 2',
    `guid: ${hex32(pngName)}`,
    'TextureImporter:',
    '  internalIDToNameTable: []',
    '  externalObjects: {}',
    '  serializedVersion: 12',
    '  mipmaps:',
    '    mipMapMode: 0',
    '    enableMipMap: 0',
    '  isReadable: 0',
    '  textureFormat: 1',
    '  maxTextureSize: 2048',
    '  textureSettings:',
    '    serializedVersion: 2',
    '    filterMode: 0',
    '    aniso: 1',
    '    mipBias: 0',
    '    wrapU: 1',
    '    wrapV: 1',
    '    wrapW: 1',
    '  nPOTScale: 0',
    '  lightmap: 0',
    '  compressionQuality: 50',
    '  spriteMode: 2',
    '  spriteExtrude: 1',
    '  spriteMeshType: 0',
    '  alignment: 9',
    `  spritePivot: {x: ${pivot.x.toFixed(5)}, y: ${pivot.y.toFixed(5)}}`,
    `  spritePixelsToUnits: ${cw}`,
    '  alphaUsage: 1',
    '  alphaIsTransparency: 1',
    '  textureType: 8',
    '  textureShape: 1',
    '  platformSettings:',
    '  - serializedVersion: 3',
    '    buildTarget: DefaultTexturePlatform',
    '    maxTextureSize: 2048',
    '    textureFormat: -1',
    '    textureCompression: 0',
    '    compressionQuality: 50',
    '  spriteSheet:',
    '    serializedVersion: 2',
    '    sprites:',
    ...sprites.map((s) => s.text),
    '    outline: []',
    '    physicsShape: []',
    '    bones: []',
    `    spriteID: ${hex32(pngName + ':sheet')}`,
    '    internalID: 0',
    '    vertices: []',
    '    indices: ',
    '    edges: []',
    '    weights: []',
    '    secondaryTextures: []',
    '    nameFileIdTable:',
    ...sprites.map((s) => `      ${s.name}: ${s.internal}`),
    '  spritePackingTag: ',
    '  pSDRemoveMatte: 0',
    '  userData: ',
    '  assetBundleName: ',
    '  assetBundleVariant: ',
    '',
  ].join('\n');
}

/** Zip con un PNG por cuadro: carpeta por animación. */
export function framesZip(clips: RenderedClip[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const c of clips) c.frames.forEach((f, i) => { files[`${c.name}/${c.name}_${String(i).padStart(2, '0')}.png`] = encodePng(f); });
  return zipSync(files, { level: 0 });
}

/** Zip de varios archivos (para bajar todo junto). */
export function bundleZip(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  return zipSync(Object.fromEntries(files.map((f) => [f.name, f.bytes])), { level: 6 });
}
