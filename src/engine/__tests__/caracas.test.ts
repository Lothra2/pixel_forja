import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generarEscenario } from '../world/oblique';
import { validateLayout } from '../world/oblique/layout';
import { renderEscena, postal } from '../world/oblique/escena';
import { camino } from '../world/oblique/verify';
import { VENEZUELA_NOCHE } from '../world/oblique/venezuelaPaleta';
import { NOMBRES } from '../world/oblique/paleta';
import { CRUZ, NEONES_CCS, AZOTEAS_PUBLICO, vacioEn } from '../world/oblique/caracas';
import { encodePng, decodePng, createRaster, blit, type Raster } from '../index';
import { ROOT } from './helpers';

const RAW = JSON.parse(readFileSync('docs/ejemplos/nekketsu/escenarios/caracas_azotea.layout.json', 'utf8'));
const L = validateLayout(RAW).layout!;
const E = renderEscena(L, 42, 0.35);
const FT = L.franja.atras;
const hex = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return r.data[i + 3] ? '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('') : null; };
const es = (r: Raster, x: number, y: number, c: keyof typeof VENEZUELA_NOCHE) => hex(r, x, y) === VENEZUELA_NOCHE[c];

describe('la azotea de Caracas (lote E3b)', () => {
  it('pasa las 9 pruebas, sin avisos, y la ficha es venezuela_ciudad de noche', () => {
    const r = generarEscenario(RAW, { ficha: true });
    expect(r.errores).toEqual([]);
    expect(r.avisos).toEqual([]);
    expect(r.pruebas.every((p) => p.ok)).toBe(true);
    expect(E.ficha).toMatchObject({ estilo: 'venezuela_ciudad', hora: 'noche' });
    expect(E.ficha.paleta.map((c) => c.hex)).toEqual(NOMBRES.map((n) => VENEZUELA_NOCHE[n]));
    expect(E.ficha.iconos).toHaveLength(12);
    expect(E.ficha.letreros).toEqual(['AREPERA LA CHAMA', 'CARACAS', 'CARACAS ES BELLA']);
    for (const v of E.ficha.vida) expect(v.detalle, v.id).not.toMatch(/Sin dibujo/);
  });

  it('Caracas de otra hora no se pinta con la noche: queda pendiente y dice qué horas hay', () => {
    const r = generarEscenario({ ...RAW, hora: 'tarde' });
    expect(r).toMatchObject({ ok: false, pendiente: true });
    expect(r.errores.join()).toMatch(/venezuela_ciudad" todavía no tiene arte de tarde \(hoy pinta: noche\)/);
  });

  it('una arena sin salida ni meta: el camino revisa que se llegue a todo el piso', () => {
    expect(camino(L)).toMatchObject({ ok: true, detalle: expect.stringMatching(/arena sin salida ni meta: se llega a todo el piso/) });
    // un muro alto de lado a lado parte la azotea en dos: ya no se llega a todo
    const partida = validateLayout({ ...RAW, muros: [{ x: 300, y: 0, w: 12, d: 98, z: 80 }] }).layout!;
    const c = camino(partida);
    expect(c.ok).toBe(false);
    expect(c.detalle).toMatch(/se llega a \d+ de \d+ celdas/);
  });

  it('El Ávila con la Cruz encendida queda debajo de la franja del marcador (filas 28 a 60)', () => {
    const yLejos = FT - 30 - E.lejos.h;
    let arriba = Infinity;
    for (let y = 0; y < E.lejos.h; y++) for (let x = CRUZ.x - 6; x <= CRUZ.x + 6; x++) if (es(E.lejos.r, x, y, 'luz')) arriba = Math.min(arriba, y);
    expect(arriba).toBeLessThan(Infinity);
    expect(yLejos + arriba).toBeGreaterThanOrEqual(64);
  });

  it('el piso mojado refleja los neones debajo de su columna, y nada más', () => {
    const P = E.piso.r, D = FT === 246 ? 98 : 0;
    const cuenta = (x0: number, x1: number, c: 'salmon' | 'menta') => { let n = 0; for (let y = 0; y < D; y++) for (let x = x0; x < x1; x++) if (es(P, x, y, c)) n++; return n; };
    const a = NEONES_CCS.arepera, k = NEONES_CCS.caracas;
    expect(cuenta(a.x, a.x + a.w, 'salmon')).toBeGreaterThan(200);
    expect(cuenta(k.x, k.x + k.w, 'menta')).toBeGreaterThan(150);
    // el público con camisas turquesa o rosadas no se refleja
    expect(cuenta(0, 380, 'salmon') + cuenta(0, 380, 'menta')).toBe(0);
  });

  it('el borde sin baranda: la franja amarilla y negra en el filo, y de ahí en adelante la ciudad allá abajo', () => {
    const P = E.piso.r, h = L.huecos[0];
    for (const y of [5, 40, 90]) {
      const fila = new Set<string>();
      for (let x = h.x0 - 9 + Math.round(0.35 * y); x < h.x0 + Math.round(0.35 * y); x++) fila.add(hex(P, x, y)!);
      expect([...fila].sort(), `fila ${y}`).toEqual(expect.arrayContaining([VENEZUELA_NOCHE.amarillo, VENEZUELA_NOCHE.tinta]));
      // pasando el canto, solo ciudad oscura con luces
      const despues = hex(P, h.x0 + Math.round(0.35 * y) + 6, y)!;
      expect([VENEZUELA_NOCHE.tinta, VENEZUELA_NOCHE.sombra, VENEZUELA_NOCHE.asfalto, VENEZUELA_NOCHE.oro, VENEZUELA_NOCHE.ocre, VENEZUELA_NOCHE.amarillo]).toContain(despues);
    }
    // el vacío del juego se repite cada 64
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) expect(vacioEn(x, y, 41)).toBe(vacioEn(x + 64, y + 128, 41));
  });

  it('exporta el filo que se desmorona y el vacío para cuando el borde avanza', () => {
    const r = generarEscenario(RAW);
    const ej = JSON.parse(new TextDecoder().decode(r.archivos.find((a) => a.nombre === 'escenario.json')!.bytes));
    expect(ej.borde).toMatchObject({ filo: { archivo: 'borde_filo.png', cuadros: 6, h: 360 - FT, ancla: [10, 0] }, vacio: { archivo: 'borde_vacio.png', w: 64, h: 64, repetir: true }, hoy: [618] });
    const tira = decodePng(r.archivos.find((a) => a.nombre === 'borde_filo.png')!.bytes);
    const w = ej.borde.filo.w;
    expect(tira.w).toBe(w * 6);
    // cada cuadro es distinto del anterior: se va desmoronando
    const cuadro = (i: number) => { const c = createRaster(w, tira.h); for (let y = 0; y < tira.h; y++) c.data.set(tira.data.subarray((y * tira.w + i * w) * 4, (y * tira.w + (i + 1) * w) * 4), y * w * 4); return Buffer.from(c.data); };
    for (let i = 1; i < 6; i++) expect(cuadro(i).equals(cuadro(i - 1)), `cuadro ${i}`).toBe(false);
    // un escenario sin borde no lo lleva
    const sin = generarEscenario({ ...RAW, huecos: [] });
    expect(JSON.parse(new TextDecoder().decode(sin.archivos.find((a) => a.nombre === 'escenario.json')!.bytes)).borde).toBeUndefined();
  });

  it('la vida: los neones que parpadean, las luces rojas, el tráfico, el avión, el helicóptero y el público', () => {
    const por = (t: string) => E.vida.filter((v) => v.tipo === t);
    const neon = por('letreros_neon');
    expect(neon.map((v) => v.id)).toEqual(['neon_arepera', 'neon_caracas']);
    for (const v of neon) {
      expect(v.cuadros).toHaveLength(4);
      expect(Buffer.from(v.cuadros[2].r.data).equals(Buffer.from(v.cuadros[0].r.data))).toBe(false);
      expect(Buffer.from(v.cuadros[1].r.data).equals(Buffer.from(v.cuadros[0].r.data))).toBe(true);
    }
    const luces = por('luces_ciudad');
    expect(luces.filter((v) => v.capa === 'cerca')).toHaveLength(2);
    expect(luces.find((v) => v.capa === 'objeto')).toMatchObject({ id: 'trafico_618', orden: -1 });
    expect(por('avion_lejos')[0]).toMatchObject({ capa: 'lejos', recorrido: { segundos: 80 } });
    const heli = por('helicoptero_reflector')[0];
    expect(heli).toMatchObject({ capa: 'lejos', fps: 8 });
    expect(heli.cuadros).toHaveLength(4);
    // el público de la vida calza pixel por pixel con el pintado en la capa cerca (cuadro 0)
    const pub = por('publico');
    expect(pub).toHaveLength(AZOTEAS_PUBLICO.length);
    for (const v of pub) {
      const c = v.cuadros[0].r;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.data[(y * c.w + x) * 4 + 3]) expect(hex(c, x, y), `${v.id} ${x},${y}`).toBe(hex(E.cerca.r, v.x + x, v.y + y));
    }
    // sin pedirlo en el layout, no sale: el layout del juego trae solo neones, luces y avión
    const juego = renderEscena(validateLayout({ ...RAW, vida: ['letreros_neon', 'luces_ciudad', 'avion_lejos'] }).layout!, 42, 0.35);
    expect(juego.vida.some((v) => v.tipo === 'publico' || v.tipo === 'helicoptero_reflector')).toBe(false);
  });

  it('las luces de la noche: neones, bombillos y las luces rojas que parpadean, todas prendidas', () => {
    expect(E.luces.length).toBeGreaterThanOrEqual(8);
    expect(E.luces.every((l) => l.encendida)).toBe(true);
    expect(E.luces.filter((l) => l.color === VENEZUELA_NOCHE.rojo).every((l) => l.parpadeo === 1)).toBe(true);
    // los fuegos artificiales caen sobre la pantalla, no más allá del mundo
    for (const p of E.particulas.filter((q) => q.tipo === 'fuegos')) expect(p.x1).toBeLessThanOrEqual(E.ancho + 40);
  });

  it('imagen dorada: la azotea de noche y con la vida a los 3 segundos', () => {
    const out = createRaster(640, 360 * 2);
    blit(out, postal(E, 0, [], 640, 360, 0), 0, 0);
    blit(out, postal(E, 34, [], 640, 360, 3), 0, 360);
    const file = join(ROOT, 'golden', 'caracas_e3b.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_caracas_e3b.png'), encodePng(out)); }
    expect(same, 'cambió caracas_e3b; mira out/golden_actual_caracas_e3b.png').toBe(true);
  });
});
