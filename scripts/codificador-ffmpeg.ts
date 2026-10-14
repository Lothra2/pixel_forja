/**
 * Codificador de audio con ffmpeg para el kit a medida (`audio.formato: "comprimido"`).
 * OGG Vorbis y M4A (AAC) en mono, sin metadatos y en modo exacto: el mismo WAV da siempre los mismos bytes.
 * Si la máquina no tiene ffmpeg, `codificadorFfmpeg()` devuelve undefined y el kit avisa.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { join } from 'node:path';
import type { Codificador, CodificadorLote } from '../src/engine/kit/custom.ts';

const CODEC = { ogg: 'libvorbis', m4a: 'aac' } as const;

export function hayFfmpeg(): boolean {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.includes('libvorbis') && /\baac\b/.test(r.stdout);
}

/** Los argumentos de ffmpeg para un archivo: siempre los mismos, así el lote y el de a uno dan los mismos bytes. */
const args = (i: string, o: string, formato: 'ogg' | 'm4a', kbps: number) => [
  '-y', '-hide_banner', '-loglevel', 'error', '-i', i, '-ac', '1', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
  '-c:a', CODEC[formato], '-b:a', `${kbps}k`, ...(formato === 'm4a' ? ['-movflags', '+faststart'] : []), o,
];

function carpeta(): string {
  const dir = mkdtempSync(join(tmpdir(), 'forja-audio-'));
  process.once('exit', () => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

export function codificadorFfmpeg(): Codificador | undefined {
  if (!hayFfmpeg()) return undefined;
  const dir = carpeta();
  let n = 0;
  return (wav, formato, kbps) => {
    const i = join(dir, `${n}.wav`), o = join(dir, `${n++}.${formato}`);
    writeFileSync(i, wav);
    const r = spawnSync('ffmpeg', args(i, o, formato, kbps));
    try { return r.status === 0 ? new Uint8Array(readFileSync(o)) : null; } finally { rmSync(i, { force: true }); rmSync(o, { force: true }); }
  };
}

/**
 * El mismo codificador, por lote: escribe todos los WAV y corre varios ffmpeg a la vez (uno por núcleo), en tandas,
 * con un solo `sh`. Da los mismos bytes que el de a uno (ffmpeg en modo exacto) en mucho menos tiempo.
 */
export function codificadorLoteFfmpeg(paralelos = Math.max(1, cpus().length)): CodificadorLote | undefined {
  if (!hayFfmpeg()) return undefined;
  const dir = carpeta();
  let n = 0;
  return (pedidos) => {
    // el mismo WAV se escribe una vez aunque se pida en dos formatos
    const wavDe = new Map<Uint8Array, string>();
    const salidas = pedidos.map(({ wav, formato, kbps }) => {
      let i = wavDe.get(wav);
      if (!i) { i = join(dir, `${n++}.wav`); writeFileSync(i, wav); wavDe.set(wav, i); }
      return { i, o: join(dir, `${n++}.${formato}`), formato, kbps };
    });
    const q = (a: string) => `'${a.replace(/'/g, `'\\''`)}'`;
    const lineas: string[] = [];
    for (let k = 0; k < salidas.length; k += paralelos)
      lineas.push(salidas.slice(k, k + paralelos).map((x) => `ffmpeg ${args(x.i, x.o, x.formato, x.kbps).map(q).join(' ')} &`).join(' ') + ' wait');
    spawnSync('sh', ['-c', lineas.join('\n')]);
    const out = salidas.map(({ o }) => { try { return new Uint8Array(readFileSync(o)); } catch { return null; } finally { rmSync(o, { force: true }); } });
    for (const i of wavDe.values()) rmSync(i, { force: true });
    return out;
  };
}
