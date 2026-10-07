import { zlibSync } from 'fflate';
import type { RenderedClip } from '../render/clip';
import type { SheetJson } from './sheet';

/** Escritor binario little-endian. */
class Bin {
  parts: number[] = [];
  u8(v: number) { this.parts.push(v & 255); }
  u16(v: number) { this.u8(v); this.u8(v >> 8); }
  i16(v: number) { this.u16(v < 0 ? v + 65536 : v); }
  u32(v: number) { this.u16(v & 0xffff); this.u16((v >>> 16) & 0xffff); }
  bytes(b: ArrayLike<number>) { for (let i = 0; i < b.length; i++) this.parts.push(b[i]); }
  zeros(n: number) { for (let i = 0; i < n; i++) this.parts.push(0); }
  str(s: string) { const b = new TextEncoder().encode(s); this.u16(b.length); this.bytes(b); }
  get length() { return this.parts.length; }
  out() { return Uint8Array.from(this.parts); }
}

function chunk(type: number, body: Bin): Bin {
  const c = new Bin();
  c.u32(body.length + 6);
  c.u16(type);
  c.bytes(body.parts);
  return c;
}

/**
 * Archivo .aseprite (formato oficial): una capa, un cuadro por cada cuadro de cada animación,
 * y una etiqueta (tag) por animación con su duración. Se abre en Aseprite para retocar a mano.
 */
export function encodeAseprite(clips: RenderedClip[]): Uint8Array {
  const cell = clips[0].cell;
  const frames = clips.flatMap((c) => c.frames.map((fr) => ({ fr, ms: Math.round(1000 / c.fps) })));
  const body = new Bin();
  let first = true;
  for (const { fr, ms } of frames) {
    const chunks: Bin[] = [];
    if (first) {
      const layer = new Bin();
      layer.u16(3); layer.u16(0); layer.u16(0); layer.u16(0); layer.u16(0); layer.u16(0); layer.u8(255); layer.zeros(3); layer.str('PixelForja');
      chunks.push(chunk(0x2004, layer));
      const tags = new Bin();
      tags.u16(clips.length); tags.zeros(8);
      let at = 0;
      for (const c of clips) {
        tags.u16(at); tags.u16(at + c.frames.length - 1); tags.u8(0); tags.u16(0); tags.zeros(6); tags.bytes([255, 154, 60]); tags.u8(0); tags.str(c.name);
        at += c.frames.length;
      }
      chunks.push(chunk(0x2018, tags));
      first = false;
    }
    const cel = new Bin();
    cel.u16(0); cel.i16(0); cel.i16(0); cel.u8(255); cel.u16(2); cel.i16(0); cel.zeros(5); cel.u16(cell); cel.u16(cell);
    cel.bytes(zlibSync(new Uint8Array(fr.data.buffer, fr.data.byteOffset, fr.data.byteLength)));
    chunks.push(chunk(0x2005, cel));
    const size = 16 + chunks.reduce((s, c) => s + c.length, 0);
    body.u32(size); body.u16(0xf1fa); body.u16(chunks.length); body.u16(ms); body.zeros(2); body.u32(chunks.length);
    for (const c of chunks) body.bytes(c.parts);
  }
  const head = new Bin();
  head.u32(128 + body.length); head.u16(0xa5e0); head.u16(frames.length); head.u16(cell); head.u16(cell); head.u16(32);
  head.u32(1); head.u16(100); head.u32(0); head.u32(0); head.u8(0); head.zeros(3); head.u16(0); head.u8(1); head.u8(1);
  head.i16(0); head.i16(0); head.u16(16); head.u16(16); head.zeros(84);
  const out = new Uint8Array(128 + body.length);
  out.set(head.out(), 0);
  out.set(body.out(), 128);
  return out;
}

/** JSON con el formato que exporta Aseprite (json-array con frameTags). Phaser lo carga con load.aseprite. */
export function asepriteJson(sheet: SheetJson, clips: RenderedClip[]): unknown {
  const frames: unknown[] = [];
  const frameTags: unknown[] = [];
  let i = 0;
  for (const c of clips) {
    const a = sheet.anims[c.name];
    frameTags.push({ name: c.name, from: i, to: i + c.frames.length - 1, direction: 'forward', color: '#ff9a3cff' });
    c.frames.forEach((_, k) => {
      const f = sheet.frames[`${c.name}_${k}`];
      frames.push({ filename: `${c.name} ${k}.aseprite`, frame: f.frame, rotated: false, trimmed: false, spriteSourceSize: f.spriteSourceSize, sourceSize: f.sourceSize, duration: Math.round(1000 / a.fps) });
    });
    i += c.frames.length;
  }
  return {
    frames,
    meta: { app: 'https://www.aseprite.org/', version: '1.3', image: sheet.meta.image, format: 'RGBA8888', size: sheet.meta.size, scale: '1', frameTags, layers: [{ name: 'PixelForja', opacity: 255, blendMode: 'normal' }], slices: [] },
  };
}
