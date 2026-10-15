import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Raster } from '../core/raster';
import { mapaMundo, rutaMundo, mapaRegion, sellos, enMundo, lugarEn, proyeccionRegion, LUGARES, LUGARES_IDS, SELLOS, SELLO, MAPA_MUNDO, REGIONES, type Lugar } from '../ui/gira';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';
import { ROOT } from './helpers';

const alpha = (r: Raster, x: number, y: number) => r.data[(y * r.w + x) * 4 + 3];
const hex = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return '#' + [r.data[i], r.data[i + 1], r.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''); };
/** Azul de mar: el azul manda sobre el rojo y el verde. */
const esMar = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return r.data[i + 2] > r.data[i] + 40 && r.data[i + 2] > r.data[i + 1] + 15; };
/** Hay tierra a 2 pixeles o menos (las ciudades de la costa caen en la playa). */
const tierraCerca = (r: Raster, x: number, y: number) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!esMar(r, x + dx, y + dy)) return true; return false; };
const ORO = '#ffd84a';
const cuenta = (r: Raster, c: string, x0 = 0, y0 = 0, x1 = r.w, y1 = r.h) => { let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (hex(r, x, y) === c) n++; return n; };

describe('el mapa de la gira', () => {
  const PARADAS: Lugar[] = ['tokio', 'saigon', 'bogota', 'caracas'];

  it('el mapa mundial mide 800 x 360 y calza con el del juego: la misma proyección corrida 80', () => {
    const m = mapaMundo(['japon', 'vietnam', 'colombia', 'venezuela']), r = m.frames[0];
    expect([m.name, r.w, r.h]).toEqual(['mapa_gira', 800, 360]);
    // el mapa del juego: x = (lon este - 90) / 210 * 640, y = (50 - lat) / 75 * 360
    const juego = (lon: number, lat: number) => [((lon < 0 ? lon + 360 : lon) - 90) / 210 * 640 + 80, (50 - lat) / 75 * 360];
    for (const id of PARADAS) {
      const { lon, lat } = LUGARES[id], [x, y] = enMundo(lon, lat), [gx, gy] = juego(lon, lat);
      expect(Math.abs(x - gx) <= 0.5 && Math.abs(y - gy) <= 0.5, id).toBe(true);
      expect(tierraCerca(r, x, y), id).toBe(true);
    }
    // el Pacífico es mar, Brasil y China son tierra, el centro de Australia es seco
    expect(esMar(r, ...enMundo(-160, 5))).toBe(true);
    expect(esMar(r, ...enMundo(-55, -10))).toBe(false);
    expect(esMar(r, ...enMundo(105, 32))).toBe(false);
    // los países de la gira llevan su borde de oro; China no
    const caja = (lon0: number, lat0: number, lon1: number, lat1: number) => { const [x0, y0] = enMundo(lon0, lat0), [x1, y1] = enMundo(lon1, lat1); return [x0, y0, x1 + 1, y1 + 1] as const; };
    expect(cuenta(r, ORO, ...caja(102, 23.5, 110, 8.5))).toBeGreaterThan(20);
    expect(cuenta(r, ORO, ...caja(-79, 12.5, -60, -4))).toBeGreaterThan(40);
    expect(cuenta(r, ORO, ...caja(130, 45, 146, 31))).toBeGreaterThan(20);
    expect(cuenta(r, ORO, ...caja(110, 40, 120, 30))).toBe(0);
    // sin países, sin oro
    expect(cuenta(mapaMundo([]).frames[0], ORO)).toBe(0);
    expect(m.extra).toMatchObject({ margen: 80, proyeccion: MAPA_MUNDO.proyeccion });
    // la rosa de los vientos queda arriba de la barra del pasaporte del juego (y 311) y lejos de la ruta
    const [rx, ry, rr] = m.extra!.rosa as [number, number, number];
    expect(ry + rr).toBeLessThanOrEqual(270);
    expect(rx - rr >= 80 && rx + rr <= 720).toBe(true);
    for (const t of rutaMundo(PARADAS).extra!.tramos as [number, number][][]) for (const [x, y] of t) expect(Math.hypot(x - rx, y - ry)).toBeGreaterThan(rr + 20);
    for (let q = 3; q < r.data.length; q += 4) expect(r.data[q]).toBe(255);
  });

  it('la ruta va en su capa transparente: un arco por tramo, de parada a parada, que sube hacia el norte', () => {
    const p = rutaMundo(PARADAS), r = p.frames[0];
    expect([p.name, r.w, r.h]).toEqual(['mapa_gira_ruta', 800, 360]);
    const tramos = p.extra!.tramos as [number, number][][];
    expect(tramos).toHaveLength(3);
    tramos.forEach((t, i) => {
      const a = enMundo(LUGARES[PARADAS[i]].lon, LUGARES[PARADAS[i]].lat), b = enMundo(LUGARES[PARADAS[i + 1]].lon, LUGARES[PARADAS[i + 1]].lat);
      expect(t[0]).toEqual(a);
      expect(t[t.length - 1]).toEqual(b);
      expect(Math.min(...t.map(([, y]) => y))).toBeLessThan(Math.min(a[1], b[1]));
      // los puntos van seguidos, sin saltos: el avión vuela parejo
      for (let k = 1; k < t.length; k++) expect(Math.hypot(t[k][0] - t[k - 1][0], t[k][1] - t[k - 1][1])).toBeLessThan(12);
    });
    expect(p.extra!.paradas).toEqual(Object.fromEntries(PARADAS.map((id) => [id, enMundo(LUGARES[id].lon, LUGARES[id].lat)])));
    // casi todo transparente: es una capa encima del mapa
    let llenos = 0;
    for (let q = 3; q < r.data.length; q += 4) if (r.data[q]) llenos++;
    expect(llenos).toBeGreaterThan(300);
    expect(llenos).toBeLessThan(800 * 360 * 0.03);
  });

  it('los mapas de región: 320 x 360, cada lugar de la región sobre tierra y el lago de Maracaibo con agua', () => {
    for (const id of Object.keys(REGIONES) as (keyof typeof REGIONES)[]) {
      const m = mapaRegion(id), r = m.frames[0];
      expect([m.name, r.w, r.h]).toEqual([`mapa_${id}`, 320, 360]);
      const lugares = m.extra!.lugares as Record<string, [number, number]>;
      const esperados = LUGARES_IDS.filter((l) => (REGIONES[id].resaltados as readonly string[]).includes(LUGARES[l].pais));
      expect(Object.keys(lugares)).toEqual(esperados);
      for (const [l, [x, y]] of Object.entries(lugares)) {
        expect(x > 4 && y > 4 && x < 316 && y < 356, l).toBe(true);
        expect(tierraCerca(r, x, y), l).toBe(true);
        expect([x, y]).toEqual(lugarEn(proyeccionRegion(id), LUGARES[l as Lugar].lon, LUGARES[l as Lugar].lat));
      }
      expect(cuenta(r, ORO)).toBeGreaterThan(200);
    }
    const cv = mapaRegion('colombia_venezuela').frames[0];
    expect(esMar(cv, ...lugarEn(proyeccionRegion('colombia_venezuela'), -71.6, 9.8))).toBe(true);
    // el delta del Mekong es tierra y el golfo de Tonkín es mar
    const vn = mapaRegion('vietnam').frames[0], pv = proyeccionRegion('vietnam');
    expect(esMar(vn, ...lugarEn(pv, 105.6, 9.9))).toBe(false);
    expect(esMar(vn, ...lugarEn(pv, 107.8, 19.5))).toBe(true);
  });

  it('los sellos: uno por país, cada uno de una sola tinta, con la franja del texto vacía', () => {
    const s = sellos();
    expect([s.name, s.w, s.h, s.frames.length]).toEqual(['sellos_pasaporte', 128, 40, 4]);
    expect(s.extra!.orden).toEqual(['japon', 'vietnam', 'colombia', 'venezuela']);
    const [tx, ty, tw, th] = SELLO.texto;
    s.frames.forEach((r, i) => {
      const tinta = SELLOS[(s.extra!.orden as (keyof typeof SELLOS)[])[i]].tinta;
      let n = 0;
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
        if (!alpha(r, x, y)) continue;
        n++;
        expect(hex(r, x, y)).toBe(tinta);
        expect(x >= tx && x < tx + tw && y >= ty && y < ty + th, `${i} ${x},${y}`).toBe(false);
      }
      expect(n).toBeGreaterThan(300);
    });
    // los cuatro dibujos son distintos
    const dib = s.frames.map((r) => { const b: number[] = []; for (let y = 0; y < 40; y++) for (let x = 6; x < 36; x++) b.push(alpha(r, x, y) ? 1 : 0); return b.join(''); });
    expect(new Set(dib).size).toBe(4);
  });

  it('en el kit a medida: la parte "mapa" y las paradas de ui.gira, con sus errores claros', () => {
    const D = join(ROOT, 'node_modules', '@fontsource', 'silkscreen', 'files');
    const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
    const SILK = { regular: ab(join(D, 'silkscreen-latin-400-normal.woff')), bold: ab(join(D, 'silkscreen-latin-700-normal.woff')) };
    const base: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, ui: { interfaz: ['mapa'], gira: { paradas: PARADAS } } };
    const leer = (cfg: KitConfig) => { const { files } = buildCustomKit(cfg, { fuentes: SILK }, { quick: true, solo: ['interfaz'] }); return { files, m: JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes)) }; };
    const { files, m } = leer(base);
    expect(Object.keys(m.ui.interfaz)).toEqual(['mapa_gira', 'mapa_gira_ruta', 'mapa_vietnam', 'mapa_colombia_venezuela', 'sellos_pasaporte']);
    expect(m.ui.interfaz.mapa_gira).toMatchObject({ archivo: 'ui/mapa_gira.png', w: 800, h: 360, resaltados: ['japon', 'vietnam', 'colombia', 'venezuela'] });
    expect(m.ui.interfaz.mapa_gira_ruta.orden).toEqual(PARADAS);
    expect(m.ui.interfaz.sellos_pasaporte).toMatchObject({ cuadros: 4, w: 128, h: 40 });
    for (const e of Object.values<{ archivo: string }>(m.ui.interfaz)) expect(files.some((f) => f.name === e.archivo), e.archivo).toBe(true);
    // sin paradas: el mapa sin países resaltados y sin ruta
    const sin = leer({ ...base, ui: { interfaz: ['mapa'] } }).m;
    expect(Object.keys(sin.ui.interfaz)).toEqual(['mapa_gira', 'mapa_vietnam', 'mapa_colombia_venezuela', 'sellos_pasaporte']);
    expect(sin.ui.interfaz.mapa_gira.resaltados).toEqual([]);
    // un lugar que no existe se dice con su sugerencia
    const errs = validateKitConfig({ ...base, ui: { interfaz: ['mapa'], gira: { paradas: ['tokio', 'bogot'] } } });
    expect(errs.join('\n')).toMatch(/ui\.gira\.paradas\[1\].*"bogot".*bogota/);
    expect(validateKitConfig({ ...base, ui: { gira: 'tokio' } as unknown as KitConfig['ui'] }).join('\n')).toMatch(/ui\.gira/);
  }, 120_000);

  it('todo sale igual cada vez', () => {
    const a = mapaRegion('vietnam').frames[0], b = mapaRegion('vietnam').frames[0];
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });
});
