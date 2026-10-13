import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generarEscenario } from '../world/oblique';
import { validateLayout, boxesOf } from '../world/oblique/layout';
import { renderEscena, postal, sueloEn, ordenCaja } from '../world/oblique/escena';
import { COLOMBIA_MANANA } from '../world/oblique/colombiaPaleta';
import { NOMBRES } from '../world/oblique/paleta';
import { fichaMarkdown } from '../world/oblique/ficha';
import { encodePng, decodePng, createRaster, blit, type Raster } from '../index';
import { ROOT } from './helpers';
import { buildCustomKit } from '../kit/custom';

const RAW = JSON.parse(readFileSync('docs/ejemplos/nekketsu/escenarios/medellin_c13.layout.json', 'utf8'));
const L = validateLayout(RAW).layout!;
const E = renderEscena(L, 42, 0.35);
const todas = boxesOf(L);
const PAL = new Set(NOMBRES.map((n) => COLOMBIA_MANANA[n].toLowerCase()));
const hex = (r: Raster, i: number) => '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('');

describe('la Comuna 13 (lote E3a)', () => {
  it('pasa las 9 pruebas y exporta la carpeta, sin avisos', () => {
    const r = generarEscenario(RAW, { ficha: true });
    expect(r.errores).toEqual([]);
    expect(r.avisos).toEqual([]);
    expect(r.pruebas.every((p) => p.ok)).toBe(true);
    // un asta tan alta que la bandera se saldría de la pantalla se acorta y avisa
    const alta = JSON.parse(JSON.stringify(RAW));
    alta.postes.find((p: { tipo?: string }) => p.tipo === 'asta_bandera').alto = 120;
    expect(generarEscenario(alta).avisos.join()).toMatch(/asta de x 3080 pide alto 120/);
    const ej = JSON.parse(new TextDecoder().decode(r.archivos.find((a) => a.nombre === 'escenario.json')!.bytes));
    expect(ej).toMatchObject({ id: 'medellin_c13', inclinacion: 0.35, largo: 3600, ancho: 3600 + 46 });
    expect(ej.vida.nota).toMatch(/capa lejos/);
  });

  it('la ficha es del estilo colombia_ladrillo: 24 colores, 12 íconos, un dibujo por caja y letreros en español', () => {
    const f = E.ficha;
    expect(f.estilo).toBe('colombia_ladrillo');
    expect(f.paleta).toHaveLength(24);
    expect(f.iconos).toHaveLength(12);
    for (const c of f.cajas) expect(c.dibujo, c.tipo).not.toBe('Muro genérico del estilo');
    expect(f.letreros).toEqual(expect.arrayContaining(['ESTACIÓN SAN JAVIER', 'COMUNA 13', 'AQUÍ SE SUEÑA EN GRANDE', 'META']));
    expect(fichaMarkdown(f)).toMatch(/metrocable/i);
  });

  it('todas las capas, objetos y cuadros de vida usan solo la paleta de Colombia, sin mezcla', () => {
    for (const r of [E.cielo.r, E.lejos.r, E.cerca.r, E.piso.r, E.frente.r, ...E.objetos.map((o) => o.img.r), ...E.vida.flatMap((v) => v.cuadros.map((c) => c.r))])
      for (let i = 0; i < r.data.length; i += 4) {
        if (!r.data[i + 3]) continue;
        expect(r.data[i + 3]).toBe(255);
        expect(PAL.has(hex(r, i))).toBe(true);
      }
  });

  it('una caja encima de otra se dibuja de su base para arriba y después de la base', () => {
    for (const [tipo, base] of [['tanque_agua', 'terraza'], ['aire_acondicionado', 'techo_lata'], ['letras_comuna13', 'mirador']]) {
      const b = todas.find((q) => q.tipo === tipo)!, debajo = todas.find((q) => q.tipo === base && b.x >= q.x && b.x < q.x + q.w)!;
      const o = E.objetos.find((q) => q.tipo === tipo)!, ob = E.objetos.find((q) => q.id.startsWith(`${base}_`) && !q.id.endsWith('_cara') && q.x <= o.x && q.x + q.img.w > o.x)!;
      expect(o.orden, tipo).toBeGreaterThan(ob.orden);
      expect(o.orden).toBe(ordenCaja(b, todas));
      // el alto de la imagen: lo que sobresale de la base, no desde el piso
      expect(o.img.h, tipo).toBeLessThan(b.d + b.z - debajo.z + 30);
    }
  });

  it('los peldaños seguidos salen como un tramo: la pantalla más cargada no pasa de 24 objetos', () => {
    const tramos = E.objetos.filter((o) => o.id.endsWith('_tramo')).map((o) => o.tipo).sort();
    expect(tramos).toEqual(['escalera_electrica', 'escalera_electrica', 'escalera_pintada', 'escalones', 'escalones']);
    expect(E.objetos.filter((o) => o.tipo === 'escalera_electrica')).toHaveLength(2);
  });

  it('los postes se paran en la caja que tengan debajo: la antena en el techo de zinc y el asta en el mirador', () => {
    const FT = L.franja.atras;
    const ant = L.postes.find((p) => p.tipo === 'antena')!, oa = E.objetos.find((o) => o.tipo === 'antena')!;
    expect(sueloEn(L, ant.x, ant.y)).toBe(108);
    expect(oa.y).toBe(FT + ant.y - 108 - ant.alto - 5);
    const asta = E.objetos.find((o) => o.tipo === 'asta_bandera')!, bandera = E.vida.find((v) => v.tipo === 'bandera')!;
    expect(asta.y).toBeGreaterThanOrEqual(0);
    expect(bandera.y).toBeGreaterThanOrEqual(0);
    expect(bandera.cuadros).toHaveLength(4);
  });

  it('la vida: el metrocable va por la capa lejos con su recorrido, y los peldaños y la bandera van encima de su objeto', () => {
    const cab = E.vida.filter((v) => v.tipo === 'metrocable');
    expect(cab).toHaveLength(6);
    for (const c of cab) { expect(c.capa).toBe('lejos'); expect(c.recorrido!.segundos).toBe(60); expect(Math.abs(c.recorrido!.hasta[0] - c.recorrido!.desde[0])).toBe(E.lejos.w + 12); }
    const esc = E.vida.filter((v) => v.tipo === 'escalera_electrica');
    expect(esc).toHaveLength(2);
    for (const v of esc) { expect(v.capa).toBe('objeto'); expect(v.cuadros).toHaveLength(3); expect(v.orden! % 1).toBeCloseTo(0.05); }
    // los peldaños cambian de un cuadro al otro (corren)
    expect(Buffer.from(esc[0].cuadros[0].r.data).equals(Buffer.from(esc[0].cuadros[1].r.data))).toBe(false);
    // ningún banderín ni ropa sobre el mirador, donde detrás no hay casas
    for (const v of E.vida.filter((q) => q.tipo === 'banderines' || q.tipo === 'ropa_tendida')) expect(v.x, v.id).toBeLessThan(2820);
  });

  it('un lugar que todavía no tiene arte no se pinta con el de otro: el kit lo salta con aviso', () => {
    const venezuela = { ...RAW, id: 'caracas_prueba', pais: 'venezuela' }, hoian = { ...RAW, id: 'hoian_prueba', pais: 'vietnam', paralaje: { ...RAW.paralaje, lejos: 'rio_thu_bon' } };
    for (const l of [venezuela, hoian]) {
      const r = generarEscenario(l);
      expect(r.ok).toBe(false);
      expect(r.pendiente).toBe(true);
      expect(r.errores.join()).toMatch(/todavía no tiene arte/);
    }
    const { files, warnings } = buildCustomKit({ juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, escenarios: 'x/' }, { escenarios: { 'caracas.layout.json': venezuela } }, { quick: true, solo: ['escenarios'] });
    expect(warnings.join()).toMatch(/caracas_prueba: el estilo "venezuela" todavía no tiene arte.*Se salta/);
    expect(files.some((f) => f.name.startsWith('escenarios/'))).toBe(false);
  });

  it('la pancarta de META arriba del mirador va en dos palos al borde de adelante, debajo de la franja del marcador', () => {
    const p = E.objetos.find((o) => o.id === 'pancarta_META')!;
    expect(p).toBeDefined();
    expect(p.y).toBeGreaterThanOrEqual(64);
    expect(p.orden).toBeGreaterThan(ordenCaja(todas.find((b) => b.tipo === 'mirador')!, todas));
  });

  it('imagen dorada: la estación, la escalera eléctrica, los techos y el mirador', () => {
    const xs = [0, 950, 2200, 2960], out = createRaster(640 * 2, 360 * 2);
    xs.forEach((x, i) => blit(out, postal(E, x, [], 640, 360, 1), (i % 2) * 640, Math.floor(i / 2) * 360));
    const file = join(ROOT, 'golden', 'comuna13_e3a.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_comuna13_e3a.png'), encodePng(out)); }
    expect(same, 'cambió comuna13_e3a; mira out/golden_actual_comuna13_e3a.png').toBe(true);
  });
});
