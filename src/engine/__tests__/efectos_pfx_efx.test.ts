import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EFECTOS_PFX, pintarEfectoPfx, olvidarEfectosPfx, type ManifiestoPfx } from '../gotico/efectos_pfx';

const MANIFIESTO = JSON.parse(readFileSync(fileURLToPath(new URL('../gotico/datos/efectos_pfx.json', import.meta.url)), 'utf8')) as ManifiestoPfx;
const efecto = (id: string) => MANIFIESTO.efectos.find((e) => e.id === id)!;

/** caja (ancho, alto) de lo bien visible (alfa > umbral) en un cuadro, a menos de `lejos` px del ancla (en x e y) */
function caja(id: string, f: number, umbral = 120, lejos = Infinity): [number, number] {
  const { img, ancla } = pintarEfectoPfx(id, 0, f);
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (Math.abs(x - ancla[0]) <= lejos && Math.abs(y - ancla[1]) <= lejos && img.data[(y * img.w + x) * 4 + 3] > umbral) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return [x1 - x0 + 1, y1 - y0 + 1];
}

describe('efectos de pixelfx que estaban de perfil', () => {
  it('el eclipse es solo capa de cinemática: marcado en el manifiesto, sin luz y sin usos en el mundo', () => {
    const e = efecto('fx_eclipse');
    expect(e.soloCinematica).toBe(true);
    expect(e.luz.intensidad).toBe(0);
    expect(e.uso.every((u) => u.tipo === 'cinematica')).toBe(true);
    // ningún otro efecto lleva la marca
    expect(MANIFIESTO.efectos.filter((x) => x.soloCinematica).map((x) => x.id)).toEqual(['fx_eclipse']);
    expect(MANIFIESTO.notas).toContain('soloCinematica');
  });

  it('el hoyo del ácido es una elipse 2:1 en el piso, no una línea de perfil', () => {
    // a 0.9 s: el charco ya comido, todavía con ácido (el hoyo de perfil medía ~120 x 16 a escala de juego); sin las
    // gotas que saltan lejos
    const [w, h] = caja('fx_salpicadura_acido', 11, 120, 70);
    expect(w).toBeGreaterThan(80);
    expect(h / w, `${w}x${h}`).toBeGreaterThan(0.38);
    olvidarEfectosPfx('fx_salpicadura_acido');
  }, 120_000);

  it('la ola rompe sobre una lámina de agua 2:1 y el cardumen se ve desde arriba', () => {
    // la lámina: al final de la ola queda agua con alto (de perfil era una línea de 3 px)
    const n = efecto('fx_ola').cuadros, [, h] = caja('fx_ola', Math.floor(n * 0.6), 60);
    expect(h).toBeGreaterThan(30);
    olvidarEfectosPfx('fx_ola');
    expect(EFECTOS_PFX.find((c) => c.id === 'fx_cardumen')!.notas).toMatch(/desde arriba/);
    expect(efecto('fx_ola').uso.some((u) => u.tipo === 'ambiente')).toBe(true);
  }, 120_000);
});
