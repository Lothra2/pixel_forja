import { bundleZip } from '../engine/index';
import type { ImagePayload } from './protocol';

export function download(name: string, bytes: Uint8Array | string, mime: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Varios archivos se bajan juntos en un zip (los navegadores bloquean muchas descargas seguidas). */
export function downloadFiles(files: { name: string; bytes: Uint8Array; mime: string }[], zipName: string) {
  if (files.length === 1) download(files[0].name, files[0].bytes, files[0].mime);
  else download(zipName, bundleZip(files), 'application/zip');
}

export async function fileToPayload(file: Blob): Promise<ImagePayload> {
  const buf = new Uint8Array(await file.arrayBuffer());
  // PNG: se decodifica con el mismo código que la línea de comandos (mismos pixeles)
  if (buf[0] === 0x89 && buf[1] === 0x50) return { png: buf };
  const bmp = await createImageBitmap(file);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  const d = ctx.getImageData(0, 0, bmp.width, bmp.height);
  return { rgba: d.data, w: d.width, h: d.height };
}

export function payloadTransfer(p: ImagePayload): Transferable[] {
  return [p.png?.buffer, p.rgba?.buffer].filter(Boolean) as Transferable[];
}

/** Miniatura PNG (data URL) de un cuadro, ampliada sin suavizar. */
export function thumbnail(rgba: Uint8ClampedArray, cell: number, k = 2): string {
  const c = document.createElement('canvas');
  c.width = cell * k;
  c.height = cell * k;
  const small = document.createElement('canvas');
  small.width = cell;
  small.height = cell;
  small.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), cell, cell), 0, 0);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, cell * k, cell * k);
  return c.toDataURL('image/png');
}

export function safeName(s: string): string {
  return s.replace(/[^\wáéíóúñÁÉÍÓÚÑ-]+/g, '_').slice(0, 40) || 'personaje';
}
