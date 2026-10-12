import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateLayout, collisionOf, floorAt, holeAt, boxesOf, toScreen } from '../world/oblique/layout';
import { VIETNAM_MANANA, NOMBRES } from '../world/oblique/paleta';
import { piezaVietnam, posteLuz, toldo } from '../world/oblique/calle';
import { casaTubo, casaAlto } from '../world/oblique/vietnam';
import { saigonSkyline } from '../world/oblique/skyline';
import { cielo } from '../world/oblique/cielo';
import { textWidth, drawText, LINE_H } from '../world/oblique/letras';
import { fichaArte, fichaMarkdown } from '../world/oblique/ficha';
import { Lienzo } from '../world/oblique/lienzo';
import type { Raster } from '../index';

const HEM = JSON.parse(readFileSync('docs/ejemplos/nekketsu/escenarios/saigon_hem.layout.json', 'utf8'));
const clone = () => JSON.parse(JSON.stringify(HEM));
const PAL = new Set(NOMBRES.map((n) => VIETNAM_MANANA[n].toLowerCase()));
const hex = (r: Raster, i: number) => '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('');
/** Colores fuera de la paleta y pixeles a medias. */
function fuera(r: Raster) {
  const bad = new Set<string>();
  let semi = 0;
  for (let i = 0; i < r.data.length; i += 4) {
    if (r.data[i + 3] === 0) continue;
    if (r.data[i + 3] !== 255) semi++;
    const h = hex(r, i);
    if (!PAL.has(h)) bad.add(h);
  }
  return { bad: [...bad], semi };
}

describe('layout oblicuo', () => {
  it('el layout de saigon_hem pasa sin errores ni avisos, con los campos que agregó el juego', () => {
    const r = validateLayout(HEM);
    expect(r.errores).toEqual([]);
    expect(r.avisos).toEqual([]);
    expect(r.layout!.id).toBe('saigon_hem');
  });

  it('no cambia la geometría: colision.json es el layout tal cual', () => {
    const r = validateLayout(clone());
    const col = collisionOf(r.layout!);
    for (const k of ['piso', 'huecos', 'plataformas', 'muros', 'postes', 'agua', 'bajo', 'solidos', 'carriles']) expect(col[k]).toEqual(HEM[k]);
  });

  it('un campo que no conoce pasa con aviso y se conserva', () => {
    const L = clone();
    L.plataformas[0].color_gris = '#888';
    const r = validateLayout(L);
    expect(r.errores).toEqual([]);
    expect(r.avisos.join()).toMatch(/plataformas\[0\].*color_gris/);
    expect((r.layout!.plataformas[0] as unknown as Record<string, unknown>).color_gris).toBe('#888');
  });

  it('da errores claros', () => {
    const L = clone();
    L.hora = 'madrugada';
    L.piso[0].tipo = 'lava';
    L.plataformas[0].y = 120; // y + d = 150, fuera de la franja de 130
    L.huecos[0].x1 = 1100; // x1 < x0
    L.entidades.push({ tipo: 'vehiculo', carril: 9 });
    delete L.largo;
    const r = validateLayout(L);
    expect(r.layout).toBeNull();
    const e = r.errores.join('\n');
    expect(e).toMatch(/hora.*madrugada/);
    expect(e).toMatch(/piso\[0\].*lava/);
    expect(e).toMatch(/plataformas\[0\].*y \+ d.*150/);
    expect(e).toMatch(/huecos\[0\].*x1/);
    expect(e).toMatch(/carril 9/);
    expect(e).toMatch(/falta `largo`/);
  });

  it('avisa si el piso no cubre la franja', () => {
    const L = clone();
    L.piso = [{ x0: 0, x1: 3000, tipo: 'asfalto' }];
    expect(validateLayout(L).avisos.join()).toMatch(/no cubre la franja en x 3000/);
  });

  it('piso, huecos, cajas y pantalla', () => {
    const L = validateLayout(clone()).layout!;
    expect(floorAt(L, 100, 10)).toBe('acera');
    expect(floorAt(L, 100, 60)).toBe('asfalto');
    expect(holeAt(L, 1220, 50)).toBeTruthy();
    expect(holeAt(L, 1220, 110)).toBeFalsy(); // el puentecito
    expect(toScreen(L, 800, 20, 24)).toEqual([800, 196]);
    const bs = boxesOf(L);
    expect(bs).toHaveLength(11);
    for (let i = 1; i < bs.length; i++) expect(bs[i].y + bs[i].d).toBeGreaterThanOrEqual(bs[i - 1].y + bs[i - 1].d);
  });
});

describe('arte del estilo vietnam', () => {
  it('cada caja del layout tiene su dibujo del tamaño exacto, solo con la paleta y sin mezcla', () => {
    const L = validateLayout(clone()).layout!;
    for (const b of boxesOf(L)) {
      const p = piezaVietnam(VIETNAM_MANANA, b.tipo, b.w, b.d, b.z);
      expect(p.img.w, b.tipo).toBe(b.w);
      expect(p.img.h, b.tipo).toBe(p.sobre + b.d + b.z);
      const f = fuera(p.img.r);
      expect(f.bad, b.tipo).toEqual([]);
      expect(f.semi, b.tipo).toBe(0);
      // el frente llega al piso: la última fila tiene pintura (la sombra de contacto)
      let pie = 0;
      for (let x = 0; x < b.w; x++) if (p.img.has(x, p.img.h - 1)) pie++;
      expect(pie, b.tipo).toBeGreaterThan(b.w * 0.3);
    }
  });

  it('casas, poste, toldo, cielo y ciudad lejana usan solo la paleta', () => {
    const piezas = [
      casaTubo(VIETNAM_MANANA, { w: 80, pisos: 4, pared: 'salmon', planta: 'pho', letrero: 'PHỞ 24', techo: 'ton', seed: 2 }).r,
      casaTubo(VIETNAM_MANANA, { w: 64, pisos: 5, pared: 'menta', planta: 'reja', techo: 'terraza', altar: true, seed: 3 }).r,
      posteLuz(VIETNAM_MANANA, 160).img.r,
      toldo(VIETNAM_MANANA, 120, 40).img.r,
      cielo(VIETNAM_MANANA, 320, 120).r,
      saigonSkyline(VIETNAM_MANANA, 480, 150).r,
    ];
    for (const r of piezas) expect(fuera(r)).toEqual({ bad: [], semi: 0 });
  });

  it('la casa mide lo que dice y la planta baja deja pasar a un atleta de 44', () => {
    const c = { w: 72, pisos: 3, pared: 'amarillo' as const, planta: 'tienda' as const, seed: 1 };
    expect(casaTubo(VIETNAM_MANANA, c).h).toBe(casaAlto(c));
    expect(casaAlto(c)).toBe(64 + 44 * 2 + 16);
  });

  it('el cielo y la ciudad lejana se repiten sin costura', () => {
    for (const r of [cielo(VIETNAM_MANANA, 320, 120).r, saigonSkyline(VIETNAM_MANANA, 480, 150).r]) {
      // la columna 0 tiene que poder seguir a la última: mismas filas pintadas y colores del mismo cielo
      let diff = 0;
      for (let y = 0; y < r.h; y++) if ((r.data[(y * r.w) * 4 + 3] > 0) !== (r.data[(y * r.w + r.w - 1) * 4 + 3] > 0)) diff++;
      expect(diff).toBeLessThan(r.h * 0.2);
    }
  });

  it('dibuja igual cada vez', () => {
    const a = casaTubo(VIETNAM_MANANA, { w: 88, pisos: 3, pared: 'celeste', planta: 'cafe', letrero: 'CÀ PHÊ', seed: 4 }).r;
    const b = casaTubo(VIETNAM_MANANA, { w: 88, pisos: 3, pared: 'celeste', planta: 'cafe', letrero: 'CÀ PHÊ', seed: 4 }).r;
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });
});

describe('letra de letrero', () => {
  it('compone las marcas del vietnamita arriba y el punto abajo', () => {
    const plain = new Lienzo(40, LINE_H, VIETNAM_MANANA), marked = new Lienzo(40, LINE_H, VIETNAM_MANANA);
    drawText(plain, 0, 0, 'TAP HOA', 'luz');
    drawText(marked, 0, 0, 'TẠP HÓA', 'luz');
    const rows = (L: Lienzo, y0: number, y1: number) => { let n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < 40; x++) if (L.has(x, y)) n++; return n; };
    expect(rows(plain, 0, 4)).toBe(0);
    expect(rows(marked, 0, 4)).toBeGreaterThan(0); // el acento de la Ó
    expect(rows(marked, 10, 11)).toBe(1); // el punto de la Ạ
    expect(rows(marked, 4, 9)).toBe(rows(plain, 4, 9)); // las letras son las mismas
    expect(textWidth('ĐÁ')).toBe(4 + 1 + 3);
    expect(textWidth('SỮA')).toBe(3 + 1 + 4 + 1 + 3); // la Ư lleva el cachito
  });
});

describe('ficha de arte', () => {
  it('trae 24 colores, de 8 a 12 elementos icónicos, al menos 3 de vida y un dibujo para cada caja', () => {
    const f = fichaArte(validateLayout(clone()).layout!);
    expect(f.paleta).toHaveLength(24);
    expect(new Set(f.paleta.map((c) => c.hex)).size).toBe(24);
    expect(f.iconos.length).toBeGreaterThanOrEqual(8);
    expect(f.iconos.length).toBeLessThanOrEqual(12);
    expect(f.vida.length).toBeGreaterThanOrEqual(3);
    for (const v of HEM.vida) expect(f.vida.map((x) => x.id)).toContain(v);
    expect(f.cajas.map((c) => c.tipo).sort()).toEqual(['cajas', 'carro', 'kiosco', 'mesas_plasticas', 'moto_estacionada', 'muro_alto', 'muro_bajo', 'puesto_banhmi', 'tanque_agua']);
    const md = fichaMarkdown(f);
    expect(md).toMatch(/# Ficha de arte: saigon_hem/);
    expect(md).toMatch(/`mesas_plasticas` \| 48 x 30, z 20 y 48 x 30, z 34 \| 2/);
  });
});
