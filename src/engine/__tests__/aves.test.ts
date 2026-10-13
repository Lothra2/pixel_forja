import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AVES } from '../rig/ave';
import { ANIMS_AVE } from '../anim/ave';
import { dibujarAve, caderaAve } from '../render/ave';
import { aveTira, anclaAve, AVES_KIT } from '../kit/aves';
import { buildCustomKit } from '../kit/custom';
import { encodePng, decodePng, createRaster, blit, type Raster } from '../index';
import { ROOT } from './helpers';

const hex = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return r.data[i + 3] ? '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('') : null; };
const filaCon = (r: Raster, y: number, c: string) => { for (let x = 0; x < r.w; x++) if (hex(r, x, y) === c) return true; return false; };
const arriba = (r: Raster) => { for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) return y; return r.h; };
const cuadros = (id: string, a: string) => ANIMS_AVE[id].find((q) => q.nombre === a)!.poses.map((p) => dibujarAve(id, p));
const igual = (a: Raster, b: Raster) => Buffer.from(a.data).equals(Buffer.from(b.data));

describe('las aves: el gallo y la paloma (lote C7b)', () => {
  it('las animaciones son las que se acordaron con el juego, con sus eventos', () => {
    const resumen = (id: string) => ANIMS_AVE[id].map((a) => `${a.nombre}:${a.poses.length}${a.loop ? ' bucle' : ''}`);
    expect(resumen('gallo')).toEqual(['idle:4 bucle', 'picotear:4', 'cantar:6', 'asustarse:4', 'caminar:6 bucle']);
    expect(resumen('paloma')).toEqual(['idle:2 bucle', 'picotear:4', 'caminar:4 bucle', 'despegar:4', 'volar:4 bucle', 'aterrizar:4']);
    expect(ANIMS_AVE.gallo.find((a) => a.nombre === 'cantar')!.eventos).toEqual([{ tipo: 'canto', cuadro: 3 }]);
    expect(AVES.gallo.celda).toBe(32);
    expect(AVES.paloma.celda).toBe(16);
  });

  it('cada cuadro cabe en su celda, con el contorno de los atletas y solo los colores de su especie', () => {
    for (const id of AVES_KIT) {
      const E = AVES[id], pal = new Set(Object.values(E.colores).filter(Boolean));
      for (const a of ANIMS_AVE[id]) a.poses.forEach((p, i) => {
        const r = dibujarAve(id, p);
        expect([r.w, r.h]).toEqual([E.celda, E.celda]);
        const usados = new Set<string>();
        for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const c = hex(r, x, y); if (c) usados.add(c); }
        for (const c of usados) expect(pal.has(c), `${id} ${a.nombre} ${i}: ${c}`).toBe(true);
        expect(usados.has(E.colores.contorno)).toBe(true);
        // nada pegado al borde de arriba ni a los lados: el contorno entra entero
        for (let y = 0; y < r.h; y++) for (const x of [0, r.w - 1]) expect(hex(r, x, y), `${id} ${a.nombre} ${i} borde`).toBeNull();
      });
    }
  });

  it('de pie, las patas tocan el piso (fila celda - 2); en el aire, no', () => {
    for (const id of AVES_KIT) {
      const E = AVES[id], piso = E.celda - 2;
      for (const a of ANIMS_AVE[id]) a.poses.forEach((p, i) => {
        const r = dibujarAve(id, p), toca = filaCon(r, piso, E.colores.pata) || filaCon(r, piso, E.colores.pata_oscura);
        expect(toca, `${id} ${a.nombre} ${i}`).toBe(p.aire === 0);
      });
    }
  });

  it('el gallo se asusta en su sitio: salta, aletea y cae donde estaba', () => {
    const a = ANIMS_AVE.gallo.find((q) => q.nombre === 'asustarse')!;
    expect(a.eventos).toEqual([{ tipo: 'aleteo', cuadro: 1 }]);
    const x0 = caderaAve('gallo', a.poses[0]), x3 = caderaAve('gallo', a.poses[3]);
    expect(Math.abs(x0 - x3)).toBeLessThan(1);
    expect(a.poses.map((p) => p.aire)).toEqual([0, 4, 5, 0]);
    expect(a.poses[1].ala).not.toBe('plegada');
    expect(a.poses[2].ala).not.toBe('plegada');
  });

  it('el canto estira el cuello y abre el pico; picotear llega al piso', () => {
    const c = cuadros('gallo', 'cantar');
    expect(arriba(c[3])).toBeLessThan(arriba(c[0]));
    expect(igual(c[3], c[0])).toBe(false);
    expect(ANIMS_AVE.gallo.find((a) => a.nombre === 'cantar')!.poses[3].pico).toBe(1);
    for (const id of AVES_KIT) {
      const r = cuadros(id, 'picotear')[2], E = AVES[id], x0 = anclaAve(id)[0];
      // el pico (o la cabeza) baja hasta las últimas filas, adelante de las patas
      let llega = false;
      for (let y = E.celda - Math.ceil(E.celda / 5); y < E.celda; y++) for (let x = x0 + 2; x < E.celda; x++) { const h = hex(r, x, y); if (h === E.colores.pico || h === E.colores.cabeza || h === E.colores.pico_oscuro) llega = true; }
      expect(llega, id).toBe(true);
    }
  });

  it('la paloma despega subiendo, vuela con las alas que cambian y aterriza en el piso', () => {
    const d = ANIMS_AVE.paloma.find((a) => a.nombre === 'despegar')!;
    const aire = d.poses.map((p) => p.aire);
    for (let i = 1; i < aire.length; i++) expect(aire[i]).toBeGreaterThan(aire[i - 1]);
    expect(d.eventos).toEqual([{ tipo: 'aleteo', cuadro: 1 }]);
    const v = cuadros('paloma', 'volar');
    for (let i = 1; i < v.length; i++) expect(igual(v[i], v[i - 1]), `volar ${i}`).toBe(false);
    const at = ANIMS_AVE.paloma.find((a) => a.nombre === 'aterrizar')!;
    expect(at.poses[at.poses.length - 1].aire).toBe(0);
  });

  it('el kit: la tira, el ancla en las patas, el aire por cuadro y los eventos', () => {
    const g = aveTira('gallo');
    expect(g.tira.w).toBe(32 * g.entrada.cuadros);
    expect(g.entrada).toMatchObject({ tipo: 'ave', w: 32, h: 32, ancla: [17, 30], vista: 'lado', cuadros: 24 });
    expect(g.entrada.anims.asustarse).toMatchObject({ desde: 14, cuadros: 4, aire: [0, 4, 5, 0] });
    expect(g.entrada.anims.idle.aire).toBeUndefined();
    let desde = 0;
    for (const a of Object.values(g.entrada.anims)) { expect(a.desde).toBe(desde); desde += a.cuadros; }
    const p = aveTira('paloma');
    expect(p.entrada).toMatchObject({ w: 16, h: 16, ancla: [9, 14], cuadros: 22, eventos: { despegar: [{ tipo: 'aleteo', cuadro: 1 }] } });
    expect(p.entrada.anims.volar.aire).toEqual([3, 3, 4, 3]);
    // en el kit a medida: van en animales sin ficha, y un ave que no existe sigue avisando
    const { files, warnings } = buildCustomKit({ juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, animales: ['gallo', 'paloma', 'garza'] }, {}, { quick: true, solo: ['animales'] });
    expect(files.map((f) => f.name).filter((n) => n.startsWith('animales/')).sort()).toEqual(['animales/gallo.png', 'animales/paloma.png']);
    expect(warnings.join()).toMatch(/animales sin ficha.*garza/);
    expect(warnings.join()).not.toMatch(/gallo|paloma/);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.animales.gallo).toMatchObject({ imagen: 'animales/gallo.png', eventos: { cantar: [{ tipo: 'canto', cuadro: 3 }], asustarse: [{ tipo: 'aleteo', cuadro: 1 }] } });
    expect(m.notas.join()).toMatch(/tipo "ave"/);
  });

  it('imagen dorada: el gallo y la paloma, todas sus animaciones', () => {
    const filas = AVES_KIT.flatMap((id) => ANIMS_AVE[id].map((a) => ({ id, poses: a.poses })));
    const W = 6 * 34, H = filas.reduce((s, f) => s + AVES[f.id].celda + 2, 0), out = createRaster(W, H);
    let y = 0;
    for (const f of filas) { const C = AVES[f.id].celda; f.poses.forEach((p, i) => blit(out, dibujarAve(f.id, p), i * (C + 2), y)); y += C + 2; }
    const file = join(ROOT, 'golden', 'aves_c7b.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_aves_c7b.png'), encodePng(out)); }
    expect(same, 'cambió aves_c7b; mira out/golden_actual_aves_c7b.png').toBe(true);
  });
});
