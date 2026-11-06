import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as D from '../gotico/fuego_doom';

const suma = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
const FORMAS: D.Forma[] = [
  { tipo: 'llama' }, { tipo: 'boca', ancho: 10 }, { tipo: 'pira', ancho: 18 }, { tipo: 'arco' }, { tipo: 'puerta' },
  { tipo: 'anillo', radio: 12 }, { tipo: 'tira', desde: [3, 26], hasta: [20, 14] }, { tipo: 'circulo', radio: 10 }, { tipo: 'muro' },
];

describe('fuego de Doom (módulo núcleo)', () => {
  it('no importa nada: el juego lo copia tal cual', () => {
    const src = readFileSync(fileURLToPath(new URL('../gotico/fuego_doom.ts', import.meta.url)), 'utf8');
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/Math\.random/);
  });

  it('las paletas tienen 37 colores, el 0 transparente y su color de luz', () => {
    expect(D.NIVELES).toBe(37);
    for (const n of ['infierno', 'vela', 'animas', 'corona_fria', 'veneno', 'sombra', 'sagrado'] as const) expect(D.PALETAS[n], n).toBeDefined();
    for (const p of Object.values(D.PALETAS)) {
      expect(p.colores.length, p.id).toBe(37 * 4);
      expect(p.colores[3], p.id).toBe(0);
      expect(p.colores[36 * 4 + 3], p.id).toBeGreaterThan(200);
      expect(p.luz, p.id).toMatch(/^#[0-9a-f]{6}$/);
      // el alfa no baja al subir el calor
      for (let i = 1; i < 37; i++) expect(p.colores[i * 4 + 3], `${p.id} ${i}`).toBeGreaterThanOrEqual(p.colores[(i - 1) * 4 + 3]);
    }
    // el infierno es gótico: casi sin blanco en la punta
    const c = D.PALETAS.infierno.colores;
    expect(Math.min(c[144], c[145], c[146])).toBeLessThan(140);
  });

  it('es determinista con la semilla', () => {
    const o: D.OpcFuego = { ancho: 20, alto: 30, forma: { tipo: 'boca', ancho: 10 }, semilla: 7, viento: 0.3 };
    const a = D.crearFuego(o), b = D.crearFuego(o), c = D.crearFuego({ ...o, semilla: 8 });
    for (let i = 0; i < 5; i++) { D.paso(a, 1 / 25); D.paso(b, 1 / 25); D.paso(c, 1 / 25); }
    expect([...a.calor]).toEqual([...b.calor]);
    expect([...a.humo]).toEqual([...b.humo]);
    expect([...a.calor]).not.toEqual([...c.calor]);
    // paso fijo: dos medios pasos son un paso
    const d = D.crearFuego(o), e = D.crearFuego(o);
    D.paso(d, 0.02); D.paso(d, 0.02); D.paso(e, 0.04);
    expect([...d.calor]).toEqual([...e.calor]);
    expect(D.brasas(a, 3)).toEqual(D.brasas(b, 3));
  });

  it('cada forma arde, no toca los bordes de la grilla y calorMedio queda en rango', () => {
    for (const forma of FORMAS) {
      const f = D.crearFuego({ ancho: 24, alto: 30, forma, semilla: 3 });
      D.pasos(f, 30);
      expect(suma(f.calor), forma.tipo).toBeGreaterThan(200);
      for (let y = 0; y < f.h; y++) { expect(f.calor[y * f.w], `${forma.tipo} izq ${y}`).toBe(0); expect(f.calor[y * f.w + f.w - 1], `${forma.tipo} der ${y}`).toBe(0); }
      for (let x = 0; x < f.w; x++) expect(f.calor[x], `${forma.tipo} techo`).toBe(0);
      const c = D.calorMedio(f);
      expect(c.k, forma.tipo).toBeGreaterThan(0.05);
      expect(c.k, forma.tipo).toBeLessThanOrEqual(1);
      expect(c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1, forma.tipo).toBe(true);
      for (const b of D.brasas(f, 4)) expect(b.x >= 0 && b.x <= f.w && b.y >= 0 && b.y < f.h && b.calor > 0, forma.tipo).toBe(true);
    }
  });

  it('apagar mata la llama (y deja humo), encender la vuelve a prender y avivar la sube', () => {
    const f = D.crearFuego({ ancho: 16, alto: 28, forma: { tipo: 'boca', ancho: 8 }, semilla: 5, humo: 0.8 });
    const vivo = suma(f.calor);
    expect(vivo).toBeGreaterThan(100);
    D.apagar(f);
    D.pasos(f, 3);
    expect(suma(f.humo)).toBeGreaterThan(0);
    D.pasos(f, 80);
    expect(suma(f.calor)).toBe(0);
    expect(D.calorMedio(f).k).toBe(0);
    expect(D.pulsoLuz(f).k).toBe(0);
    D.encender(f);
    D.pasos(f, 40);
    expect(suma(f.calor)).toBeGreaterThan(vivo * 0.5);
    // avivar: más calor arriba
    const g = D.copiarFuego(f), h = D.copiarFuego(f);
    D.avivar(g, 2, 2);
    D.pasos(g, 20); D.pasos(h, 20);
    const arriba = (x: D.Fuego) => suma(x.calor.subarray(0, x.w * Math.floor(x.h / 2)));
    expect(arriba(g)).toBeGreaterThan(arriba(h));
  });

  it('el pulso de la luz sigue a la llama y pintar llena solo su caja', () => {
    const f = D.crearFuego({ ancho: 16, alto: 24, semilla: 9, paleta: 'animas', hueco: 0.5 });
    const ks: number[] = [];
    for (let i = 0; i < 40; i++) { D.paso(f, 1 / 25); ks.push(D.pulsoLuz(f, 0.6).k); }
    expect(Math.min(...ks)).toBeGreaterThan(0.3);
    expect(Math.max(...ks)).toBeLessThanOrEqual(1.3);
    expect(Math.max(...ks) - Math.min(...ks)).toBeGreaterThan(0.02);
    const W = 80, H = 90, buf = new Uint8ClampedArray(W * H * 4), e = 3;
    D.pintar(f, buf, W, H, e, { x: 10, y: 5 });
    let dentro = 0, fuera = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = buf[(y * W + x) * 4 + 3];
      if (x >= 10 && x < 10 + f.w * e && y >= 5 && y < 5 + f.h * e) dentro += a; else fuera += a;
    }
    expect(dentro).toBeGreaterThan(1000);
    expect(fuera).toBe(0);
    expect(D.tamanoPintado(f, e)).toEqual([48, 72]);
    expect(D.pieFuego(f, e)).toEqual([24, 72]);
  });
});
