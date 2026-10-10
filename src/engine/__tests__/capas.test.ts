import { describe, it, expect } from 'vitest';
import { clipsBase, diferencia, hojaCapa, sinEquipo, variantes } from '../kit/capas';
import { familyFicha } from '../rpg/family';
import { renderClip, EIGHT_VIEWS } from '../render/clip';
import { applyArmorTier } from '../rpg/presets';
import type { Raster } from '../core/raster';

/** Pega la capa encima de la base como lo hace el juego (los pixeles opacos de la capa tapan) */
function pegar(base: Raster, capa: Raster): Raster {
  const r = { w: base.w, h: base.h, data: new Uint8ClampedArray(base.data) };
  for (let p = 0; p < r.data.length; p += 4) if (capa.data[p + 3] > 0) for (let k = 0; k < 4; k++) r.data[p + k] = capa.data[p + k];
  return r;
}
const iguales = (a: Raster, b: Raster) => {
  let n = 0;
  for (let p = 0; p < a.data.length; p += 4) if (a.data[p + 3] !== b.data[p + 3] || (a.data[p + 3] > 0 && (a.data[p] !== b.data[p] || a.data[p + 1] !== b.data[p + 1] || a.data[p + 2] !== b.data[p + 2]))) n++;
  return n;
};

describe('capas de equipo', () => {
  const sophie = familyFicha('sophie', true);
  const base = sinEquipo(sophie);
  it('la base no lleva arma ni mano libre y las variantes cubren armas, mano libre, pecho y casco', () => {
    expect(base.gear).toMatchObject({ main: null, off: null });
    const v = variantes(sophie);
    const tipos = new Set(v.map((x) => x.tipo));
    for (const t of ['arma', 'mano', 'pecho', 'casco']) expect(tipos, t).toContain(t);
    expect(v.filter((x) => x.tipo === 'arma').length).toBeGreaterThanOrEqual(13);
    expect(v.filter((x) => x.tipo === 'pecho').length).toBeGreaterThanOrEqual(20);
  });
  it('base + capa del arma = la heroína con el arma, pixel por pixel', () => {
    for (const [arma, anim] of [['bow', 'shoot_bow'], ['sword', 'attack'], ['staff', 'walk']] as const) {
      const con = { ...base, gear: { ...base.gear, main: arma } };
      for (const v of EIGHT_VIEWS) {
        const a = renderClip(base, 48, anim, v, { props: true });
        const b = renderClip(con, 48, anim, v, { props: true });
        a.frames.forEach((fa, i) => expect(iguales(pegar(fa, diferencia(fa, b.frames[i]).r), b.frames[i]), `${arma} ${anim} ${v} ${i}`).toBe(0));
      }
    }
  }, 60000);
  it('con la armadura no queda a la vista ningún pixel de la base donde la armadura no dibuja', () => {
    const con = applyArmorTier(base, 'tunica', 2, false);
    for (const v of EIGHT_VIEWS) {
      const a = renderClip(base, 48, 'walk', v, { props: true });
      const b = renderClip(con, 48, 'walk', v, { props: true });
      a.frames.forEach((fa, i) => {
        const d = diferencia(fa, b.frames[i]);
        const p = pegar(fa, d.r);
        // donde la variante dibuja, se ve la variante; lo que sobra de la base quedó tapado con un color de la pieza
        let mal = 0;
        for (let q = 0; q < p.data.length; q += 4) if (b.frames[i].data[q + 3] > 0 && (p.data[q] !== b.frames[i].data[q] || p.data[q + 1] !== b.frames[i].data[q + 1] || p.data[q + 2] !== b.frames[i].data[q + 2])) mal++;
        expect(mal, `${v} ${i}`).toBe(0);
      });
    }
  }, 60000);
  it('la hoja de una capa no pasa de 4096 y cada bloque tiene los cuadros de su animación', () => {
    const anims = ['idle', 'walk', 'attack', 'shoot_bow'];
    const clips = clipsBase(sophie, anims);
    const h = hojaCapa(clips, { ...base, gear: { ...base.gear, main: 'bow' } }, anims)!;
    expect(h).not.toBeNull();
    expect(h.png.w).toBeLessThanOrEqual(4096);
    expect(h.png.h).toBeLessThanOrEqual(4096);
    for (const a of anims) expect(h.bloques[a]!.cuadros, a).toBe(clips.get(`${a}|${EIGHT_VIEWS[0]}`)!.frames.length);
    // una pieza que no cambia nada no da capa
    expect(hojaCapa(clips, base, anims)).toBeNull();
  }, 60000);
});

describe('PNG con paleta', () => {
  it('es sin pérdida y pesa menos que el RGBA', async () => {
    const { encodePng, encodePngPaleta, decodePng } = await import('../export/png');
    const f = familyFicha('alana', true);
    const r = renderClip(f, 48, 'walk', 'front', { props: true }).frames[2];
    const a = encodePng(r), b = encodePngPaleta(r);
    expect(b.length).toBeLessThan(a.length);
    expect(Array.from(decodePng(b).data)).toEqual(Array.from(decodePng(a).data));
  });
  it('la armadura del pecho deja lo que lleva en la cabeza', () => {
    const v = variantes(familyFicha('sophie', true)).filter((x) => x.tipo === 'pecho');
    for (const x of v) expect(x.ficha.avatar?.lpc?.hat, x.clave).toBe(familyFicha('sophie', true).avatar?.lpc?.hat);
  });
});
