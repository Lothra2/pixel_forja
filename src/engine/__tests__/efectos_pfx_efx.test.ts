import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EFECTOS_PFX, pintarEfectoPfx, olvidarEfectosPfx, claseLuz, CLASES_LUZ, type ManifiestoPfx } from '../gotico/efectos_pfx';
import { cuantizar, errorPaleta } from '../gotico/efectos_pfx_png';

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

describe('explosiones con el impacto a 25 cps', () => {
  const IDS = ['fx_gran_explosion', 'fx_explosion_chica', 'fx_explosion_barril', 'fx_meteoro', 'fx_nova_escarcha', 'fx_explosion_oscura', 'fx_golpe_piso', 'fx_explosion_tierra'];

  it('van con t 1: la ventana del impacto cuadro a cuadro y el resto repetido (el atlas no lo guarda dos veces)', () => {
    for (const id of IDS) {
      const e = efecto(id), cfg = EFECTOS_PFX.find((c) => c.id === id)!;
      expect(e.t, id).toBe(1);
      const [w0, w1] = cfg.rapido25!;
      expect(w1 - w0, id).toBeGreaterThanOrEqual(0.5);
      const cs = e.direcciones[0].cuadros!, igual = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
      // en la ventana cada cuadro es distinto del anterior; fuera de ella van de a pares (salvo el último, que se apaga)
      const i0 = Math.ceil(w0 * 12.5 - 1e-6) * 2, i1 = i0 + Math.round((w1 - w0) * 25);
      for (let f = i0 + 1; f < Math.min(i1, cs.length); f++) expect(igual(cs[f], cs[f - 1]), `${id} ${f} en la ventana`).toBe(false);
      for (let f = i1 + 1; f < cs.length - 2; f += 2) expect(igual(cs[f], cs[f - 1]) || !cs[f][3], `${id} ${f} en la cola`).toBe(true);
      // dura lo mismo que a 12.5 cps (±1 cuadro de 12.5)
      expect(Math.abs(e.cuadros / 25 - Math.ceil(e.cuadros / 2) / 12.5), id).toBeLessThanOrEqual(0.08);
    }
  });
});

describe('paleta de las hojas', () => {
  it('un velo translúcido de un color muy repetido no se come la paleta (lo opaco conserva su color)', () => {
    // 3 de cada 4 pixeles son el mismo color (el último en el canal que más varía: el corte viejo pelaba de a un color
    // la caja que lo tenía); el resto, un degradé de oscuro a claro, de translúcido a casi opaco, con ruido
    const w = 400, h = 300, data = new Uint8ClampedArray(w * h * 4);
    let s = 7;
    const az = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
    for (let i = 0; i < w * h; i++) {
      if (i % 4) data.set([200, 225, 240, 255], i * 4);
      else { const t = (i % w) / w; data.set([20 + 200 * t + az() * 12, 40 + 180 * t + az() * 12, 60 + 170 * t + az() * 12, 60 + 180 * t], i * 4); }
    }
    const img = { w, h, data }, viejo = errorPaleta(img, cuantizar(img, 255, true)), nuevo = errorPaleta(img, cuantizar(img, 255));
    expect(nuevo).toBeLessThan(3);
    expect(viejo, 'el corte viejo perdía el color de lo opaco').toBeGreaterThan(nuevo * 2);
  });

  it('el atlas exportado entra en los 15 MB', () => {
    const mb = MANIFIESTO.efectos.reduce((s, e) => s + e.paginas.reduce((t, p) => t + p.bytes, 0), 0) / 1024 / 1024;
    expect(mb).toBeLessThanOrEqual(15);
  });
});

describe('luz de los efectos de pixelfx en la escala de los fuegos del mundo', () => {
  it('cada efecto cae en el rango de su clase', () => {
    for (const c of EFECTOS_PFX) {
      const l = efecto(c.id).luz, cl = claseLuz(c);
      if (!cl || l.intensidad === 0 || c.capa === 'pantalla') continue;
      const { r, k } = CLASES_LUZ[cl];
      expect(l.radio >= r[0] && l.radio <= r[1], `${c.id} (${cl}) radio ${l.radio}`).toBe(true);
      expect(l.intensidad >= k[0] - 1e-9 && l.intensidad <= k[1] + 1e-9, `${c.id} (${cl}) intensidad ${l.intensidad}`).toBe(true);
    }
  });

  it('un golpe chico no alumbra como una fogata y solo lo enorme pasa a la explosión de siempre', () => {
    // antorcha de Doom: 146 a 177; fogata: hasta 250; explosion_fuego de siempre: 270
    const de = (cat: string) => MANIFIESTO.efectos.filter((e) => e.categoria === cat && e.luz.intensidad > 0);
    for (const e of [...de('impactos'), ...de('cuerpo_a_cuerpo'), ...de('estado'), ...de('botin'), ...de('criaturas'), ...de('agua')]) expect(e.luz.radio, e.id).toBeLessThanOrEqual(177);
    for (const id of ['fx_golpe_piso', 'fx_aterrizaje', 'fx_destello_herida', 'fx_plumas', 'fx_roca', 'fx_bomba_humo']) expect(efecto(id).luz.radio, id).toBeLessThanOrEqual(130);
    for (const e of MANIFIESTO.efectos) if (e.luz.radio > 290 && e.capa !== 'pantalla') expect(claseLuz(EFECTOS_PFX.find((c) => c.id === e.id)!), e.id).toBe('cataclismo');
    for (const id of ['fx_gran_explosion', 'fx_meteoro', 'fx_explosion_barril', 'fx_explosion_chica']) expect(efecto(id).luz.radio, id).toBeGreaterThanOrEqual(220);
    // una flecha no alumbra
    expect(efecto('fx_flecha').luz.intensidad).toBe(0);
  });
});

