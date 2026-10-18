import { describe, it, expect } from 'vitest';
import { MINO_SPEC } from '../boss/minotauro';
import { MINO_ANIMS } from '../boss/minotauroAnims';
import { GUARDIAN_SPEC } from '../boss/guardian';
import { renderBossSheets, type BossSpec } from '../boss/sheet';
import { bossPoses } from '../boss/anim';
import { bossQA, scaleSignal, thickOutline } from '../qa/boss';
import { createRaster, type Raster } from '../core/raster';

/** El minotauro con solo el reposo en 2 cuadros, a otra celda (para que la prueba sea rápida). */
const quick = (cell: number): BossSpec => ({ ...MINO_SPEC, cell, anims: MINO_ANIMS.filter((a) => a.name === 'idle').map((a) => ({ ...a, frames: 2 })) });

/** Agranda x2 con vecino más cercano (lo que el control tiene que atrapar). */
function nearest2(r: Raster): Raster {
  const o = createRaster(r.w, r.h);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const s = ((y >> 1) * r.w + (x >> 1) + Math.floor(r.w / 4) + Math.floor(r.h / 4) * r.w) * 4, t = (y * r.w + x) * 4;
    for (let c = 0; c < 4; c++) o.data[t + c] = r.data[s + c] ?? 0;
  }
  return o;
}

describe('jefes grandes', () => {
  for (const cell of [96, 128, 192]) {
    it(`el minotauro a celda ${cell}: cabe en las 8 direcciones, contorno de 1 px, sin escalado y pies en el pivote`, () => {
      const { clips, pivot } = renderBossSheets(quick(cell));
      expect(pivot[0]).toBe(cell / 2);
      const qa = bossQA(clips.map((c) => ({ name: c.def.name, frames: c.frames, overflow: c.overflow, feet: c.feet })), pivot);
      for (const q of qa) expect(q.ok, `${q.check}: ${q.value} ${q.where ?? ''}`).toBe(true);
      // 8 filas (direcciones) distintas entre sí
      const rows = clips[0].frames.map((r) => Array.from(r[0].data).join(','));
      expect(new Set(rows).size).toBe(8);
    }, 120_000);
  }

  it('el guardián de la campana a celda 128 pasa el mismo control, y su versión libre es turquesa', () => {
    const spec: BossSpec = { ...GUARDIAN_SPEC, anims: GUARDIAN_SPEC.anims.filter((a) => a.name === 'idle' || a.name === 'libre').map((a) => ({ ...a, frames: 2 })) };
    const { clips, pivot } = renderBossSheets(spec);
    const qa = bossQA(clips.map((c) => ({ name: c.def.name, frames: c.frames, overflow: c.overflow, feet: c.feet })), pivot);
    for (const q of qa) expect(q.ok, `${q.check}: ${q.value} ${q.where ?? ''}`).toBe(true);
    // encantado brilla violeta, libre turquesa
    const count = (r: Raster, hex: number[]) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && Math.abs(r.data[i] - hex[0]) < 8 && Math.abs(r.data[i + 1] - hex[1]) < 8 && Math.abs(r.data[i + 2] - hex[2]) < 8) n++; return n; };
    const idle = clips.find((c) => c.def.name === 'idle')!.frames[0][0], libre = clips.find((c) => c.def.name === 'libre')!.frames[0][0];
    expect(count(idle, [0xb4, 0x6c, 0xff])).toBeGreaterThan(0);
    expect(count(libre, [0x5a, 0xe0, 0xd0])).toBeGreaterThan(0);
    expect(count(libre, [0xb4, 0x6c, 0xff])).toBe(0);
  }, 120_000);

  it('el control atrapa un sprite agrandado y un contorno de 2 px', () => {
    const { clips } = renderBossSheets(quick(128));
    const fr = clips[0].frames[7][0];
    const s0 = scaleSignal(fr), s1 = scaleSignal(nearest2(fr));
    expect(s0.block2).toBeLessThan(0.38);
    expect(Math.max(s1.dupCols, s1.dupRows, s1.block2)).toBeGreaterThan(0.38);
    // engordar el contorno: cada pixel vacío pegado al dibujo se pinta del color del contorno vecino
    const fat = createRaster(fr.w, fr.h);
    fat.data.set(fr.data);
    for (let y = 1; y < fr.h - 1; y++) for (let x = 1; x < fr.w - 1; x++) {
      const i = (y * fr.w + x) * 4;
      if (fr.data[i + 3]) continue;
      for (const j of [i - 4, i + 4, i - fr.w * 4, i + fr.w * 4]) if (fr.data[j + 3]) { for (let c = 0; c < 4; c++) fat.data[i + c] = fr.data[j + c]; break; }
    }
    expect(thickOutline(fr)).toBeLessThan(0.06);
    expect(thickOutline(fat)).toBeGreaterThan(0.06);
  }, 120_000);

  it('animaciones de jefe: mismos nombres y fps que antes, aviso de 4 cuadros, muerte larga que termina liberado', () => {
    const fps = Object.fromEntries(MINO_ANIMS.map((a) => [a.name, a.fps]));
    expect(fps).toEqual({ idle: 6, walk: 10, attack: 14, hit: 12, die: 8, attack_heavy: 12, charge: 14, warcry: 10, leap: 12 });
    for (const n of ['attack_heavy', 'leap', 'warcry']) {
      const a = MINO_ANIMS.find((x) => x.name === n)!;
      expect(a.windup![1] - a.windup![0] + 1, n).toBeGreaterThanOrEqual(4);
      // el golpe llega después del aviso
      const hit = a.events?.find((e) => e.type === 'impacto' || e.type === 'grito');
      expect(hit!.frame, n).toBeGreaterThanOrEqual(a.windup![0]);
    }
    const die = MINO_ANIMS.find((x) => x.name === 'die')!;
    expect(die.frames).toBeGreaterThanOrEqual(12);
    const last = bossPoses(die).at(-1)!;
    expect(last.freed).toBe(1);
    expect(last.face?.eyes).toBe('happy');
    expect(last.aura ?? 0).toBe(0);
    // ninguna hoja pasa de 4096 px: a 128 entran 32 cuadros por fila
    for (const a of MINO_ANIMS) expect(a.frames * 128).toBeLessThanOrEqual(4096);
  });
});
