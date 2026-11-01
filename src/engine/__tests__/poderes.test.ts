import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { PODERES, pintarPoder, paquetePoderes, DIRS_PODER } from '../gotico/poderes';

const opacos = (d: Uint8ClampedArray) => { let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n; };
const igual = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.length === b.length && a.every((x, i) => x === b[i]);

describe('poderes del taller gótico', () => {
  it('hay al menos 40, con ids únicos y datos válidos', () => {
    expect(PODERES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(PODERES.map((p) => p.id)).size).toBe(PODERES.length);
    for (const p of PODERES) {
      expect(p.nombre[0].length && p.nombre[1].length, p.id).toBeTruthy();
      expect(p.cuadros, p.id).toBeGreaterThanOrEqual(4);
      expect(p.t, p.id).toBeGreaterThanOrEqual(1);
    }
    expect(PODERES.find((p) => p.id === 'portal_regreso')?.nombre[0]).toBe('Portal de regreso');
  });

  it('cada poder pinta cuadros con pixeles, todos del mismo tamaño y con el ancla adentro', () => {
    for (const p of PODERES) {
      const [w, h] = p.celda;
      const dirs = p.direccional ? [0, 3, 6] : [0];
      let vacios = 0;
      for (const d of dirs)
        for (let f = 0; f < p.cuadros; f++) {
          const r = pintarPoder(p.id, d, f);
          expect([r.img.w, r.img.h], `${p.id} ${d} ${f}`).toEqual([w, h]);
          expect(r.ancla, p.id).toEqual(p.ancla);
          if (opacos(r.img.data) < 15) vacios++;
        }
      // los que pasan una vez pueden terminar casi vacíos en el último cuadro
      expect(vacios, `${p.id} cuadros vacíos`).toBeLessThanOrEqual(p.bucle ? 0 : 1);
      expect(opacos(pintarPoder(p.id, 0, p.bucle ? 0 : Math.floor(p.cuadros / 3)).img.data), p.id).toBeGreaterThan(30);
      expect(p.ancla[0] >= 0 && p.ancla[0] < w && p.ancla[1] >= 0 && p.ancla[1] < h, p.id).toBe(true);
    }
  });

  it('los direccionales cambian con la dirección y es determinista', () => {
    const dir = PODERES.filter((p) => p.direccional);
    expect(dir.length).toBeGreaterThanOrEqual(10);
    for (const p of dir) {
      const imgs = DIRS_PODER.map((_, d) => pintarPoder(p.id, d, 0).img.data);
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(igual(imgs[i], imgs[j]), `${p.id} ${DIRS_PODER[i]}=${DIRS_PODER[j]}`).toBe(false);
    }
    const a = pintarPoder('bola_fuego', 'se', 3), b = pintarPoder('bola_fuego', 7, 3);
    expect(igual(a.img.data, b.img.data)).toBe(true);
    expect(igual(pintarPoder('nova_escarcha', 0, 0).img.data, pintarPoder('nova_escarcha', 0, 5).img.data)).toBe(false);
  });

  it('la escala sigue a la persona de 75 px', () => {
    // la nova de escarcha llega a ~120 px de radio
    const nova = PODERES.find((p) => p.id === 'nova_escarcha')!;
    expect(nova.celda[0]).toBeGreaterThan(230);
    expect(nova.celda[0]).toBeLessThan(290);
    // el pilar de luz mide ~140 px sobre el piso
    const pilar = PODERES.find((p) => p.id === 'pilar_luz')!;
    expect(pilar.ancla[1]).toBeGreaterThan(130);
    expect(pilar.ancla[1]).toBeLessThan(200);
  });

  it('el paquete es un zip con una tira por poder y el json', () => {
    const z = paquetePoderes();
    expect(z[0]).toBe(0x50); // P
    expect(z[1]).toBe(0x4b); // K
    const files = unzipSync(z);
    const j = JSON.parse(strFromU8(files['poderes.json']));
    expect(j.poderes.length).toBe(PODERES.length);
    for (const p of j.poderes) {
      expect(files[p.archivo], p.id).toBeDefined();
      expect(p.celda.length).toBe(2);
      expect(typeof p.direccional).toBe('boolean');
      expect(p.elemento && p.tipo).toBeTruthy();
    }
  }, 120_000);
});
