/**
 * Codificador de audio con ffmpeg para el kit a medida (`audio.formato: "comprimido"`).
 * OGG Vorbis y M4A (AAC) en mono, sin metadatos y en modo exacto: el mismo WAV da siempre los mismos bytes.
 * Si la máquina no tiene ffmpeg, `codificadorFfmpeg()` devuelve undefined y el kit avisa.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Codificador } from '../src/engine/kit/custom.ts';

const CODEC = { ogg: 'libvorbis', m4a: 'aac' } as const;

export function hayFfmpeg(): boolean {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.includes('libvorbis') && /\baac\b/.test(r.stdout);
}

export function codificadorFfmpeg(): Codificador | undefined {
  if (!hayFfmpeg()) return undefined;
  const dir = mkdtempSync(join(tmpdir(), 'forja-audio-'));
  process.once('exit', () => rmSync(dir, { recursive: true, force: true }));
  let n = 0;
  return (wav, formato, kbps) => {
    const i = join(dir, `${n}.wav`), o = join(dir, `${n++}.${formato}`);
    writeFileSync(i, wav);
    const r = spawnSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error', '-i', i, '-ac', '1', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
      '-c:a', CODEC[formato], '-b:a', `${kbps}k`, ...(formato === 'm4a' ? ['-movflags', '+faststart'] : []), o,
    ]);
    try { return r.status === 0 ? new Uint8Array(readFileSync(o)) : null; } finally { rmSync(i, { force: true }); rmSync(o, { force: true }); }
  };
}
