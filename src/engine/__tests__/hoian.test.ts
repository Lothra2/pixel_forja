import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generarEscenario } from '../world/oblique';
import { validateLayout } from '../world/oblique/layout';
import { renderEscena, postal } from '../world/oblique/escena';
import { estiloDe } from '../world/oblique/ficha';
import { VIETNAM_HOIAN_NOCHE } from '../world/oblique/hoianPaleta';
import { NOMBRES, paletaVietnam, VIETNAM_MANANA, VIETNAM_MEDIODIA, VIETNAM_TARDE_DORADA, VIETNAM_TARDE_AGUACERO, VIETNAM_TORMENTA, VIETNAM_ATARDECER } from '../world/oblique/paleta';
import { PUENTE, LUNA, BALCONES, BOTE } from '../world/oblique/hoian';
import { encodePng, decodePng, createRaster, blit, type Raster } from '../index';
import { ROOT } from './helpers';

const RAW = JSON.parse(readFileSync('docs/ejemplos/nekketsu/escenarios/hoian.layout.json', 'utf8'));
const L = validateLayout(RAW).layout!;
const E = renderEscena(L, 42, 0.35);
const FT = L.franja.atras, D = L.franja.adelante - L.franja.atras;
const hex = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return r.data[i + 3] ? '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('') : null; };
const es = (r: Raster, x: number, y: number, c: keyof typeof VIETNAM_HOIAN_NOCHE) => hex(r, x, y) === VIETNAM_HOIAN_NOCHE[c];
const iguales = (a: Raster, b: Raster) => Buffer.from(a.data).equals(Buffer.from(b.data));

describe('Hội An de noche con el Tama-wari (lote E3c)', () => {
  it('pasa las 9 pruebas, sin avisos, y la ficha es vietnam_hoian de noche', () => {
    const r = generarEscenario(RAW, { ficha: true });
    expect(r.errores).toEqual([]);
    expect(r.avisos).toEqual([]);
    expect(r.pruebas.map((p) => p.ok)).toEqual(Array(9).fill(true));
    expect(E.ficha).toMatchObject({ estilo: 'vietnam_hoian', hora: 'noche' });
    expect(E.ficha.paleta.map((c) => c.hex)).toEqual(NOMBRES.map((n) => VIETNAM_HOIAN_NOCHE[n]));
    expect(E.ficha.iconos).toHaveLength(12);
    expect(E.ficha.letreros).toEqual(['ĐÈN LỒNG', 'CAO LẦU', 'MAY ĐO']);
    expect(E.ficha.vida.map((v) => v.id)).toEqual(['faroles_meciendose', 'velitas_rio', 'botes_con_faroles', 'publico']);
    for (const v of E.ficha.vida) expect(v.detalle, v.id).not.toMatch(/Sin dibujo/);
    expect(E.ficha.cajas).toEqual([expect.objectContaining({ tipo: 'base_poste', cuantas: 2 })]);
  });

  it('la paleta de Saigón no cambia ni una hora: solo la noche de Vietnam es la de Hội An', () => {
    expect(paletaVietnam('manana')).toBe(VIETNAM_MANANA);
    expect(paletaVietnam('mediodia')).toBe(VIETNAM_MEDIODIA);
    expect(paletaVietnam('tarde')).toBe(VIETNAM_TARDE_DORADA);
    expect(paletaVietnam('tarde', ['aguacero'])).toBe(VIETNAM_TARDE_AGUACERO);
    expect(paletaVietnam('tarde', ['aguacero'], 'azoteas')).toBe(VIETNAM_TORMENTA);
    expect(paletaVietnam('atardecer')).toBe(VIETNAM_ATARDECER);
    expect(paletaVietnam('noche')).toBe(VIETNAM_HOIAN_NOCHE);
    // los tramos de Saigón siguen con su estilo vietnam
    for (const id of ['saigon_hem', 'saigon_benthanh', 'saigon_rio', 'saigon_azoteas', 'saigon_estadio']) {
      const l = validateLayout(JSON.parse(readFileSync(`docs/ejemplos/nekketsu/escenarios/${id}.layout.json`, 'utf8'))).layout!;
      expect(estiloDe(l), id).toBe('vietnam');
    }
  });

  it('Hội An de otra hora no se pinta con la noche: queda pendiente y dice qué horas hay', () => {
    const r = generarEscenario({ ...RAW, hora: 'manana' });
    expect(r).toMatchObject({ ok: false, pendiente: true });
    expect(r.errores.join()).toMatch(/vietnam_hoian" todavía no tiene arte de manana \(hoy pinta: noche\)/);
  });

  it('los dos postes del Tama-wari en x 110 y 530: la punta con el gancho en el z de la bola, antes que la bola y la base', () => {
    const postes = E.objetos.filter((o) => o.tipo === 'poste_tamawari');
    expect(postes).toHaveLength(2);
    const bolas = L.entidades.filter((e) => e.npc === 'bola_tama');
    for (const [i, x] of [110, 530].entries()) {
      const p = postes[i], b = bolas[i];
      expect(b).toMatchObject({ x, y: 49, z: 170 });
      // el gancho del yugo: donde el juego pone el ancla de la bola_tama (16, 0)
      expect(p.gancho).toEqual([Math.round(x + 0.35 * 49), FT + 49 - 170]);
      // el pie de la caña en el piso (no encima de la base)
      expect(p.y + 170 + 5).toBe(FT + 49);
      // se dibuja antes que la bola (que va en su y) y antes que la base, que le tapa el pie
      expect(p.orden).toBeLessThan(49);
      const base = E.objetos.find((o) => o.id === `base_poste_${i}`)!;
      expect(base.orden).toBeGreaterThan(p.orden);
    }
    // el collar va del color del equipo de la bola: la Familia azul y el Instituto rojo
    const colores = (o: (typeof postes)[number]) => { const s = new Set<string>(); for (let y = 36; y < 39; y++) for (let x = 0; x < o.img.w; x++) s.add(hex(o.img.r, x, y) ?? ''); return s; };
    expect(colores(postes[0]).has(VIETNAM_HOIAN_NOCHE.celeste)).toBe(true);
    expect(colores(postes[1]).has(VIETNAM_HOIAN_NOCHE.rojo)).toBe(true);
    expect(colores(postes[1]).has(VIETNAM_HOIAN_NOCHE.celeste)).toBe(false);
    // y en objetos.json el juego encuentra el gancho
    const r = generarEscenario(RAW);
    const ob = JSON.parse(new TextDecoder().decode(r.archivos.find((a) => a.nombre === 'objetos.json')!.bytes));
    expect(ob.objetos.filter((o: { gancho?: number[] }) => o.gancho).map((o: { gancho: number[] }) => o.gancho)).toEqual([[127, 125], [547, 125]]);
  });

  it('el Tama-wari no es una carrera: ni pancartas ni línea de meta, aunque el layout traiga salida y meta', () => {
    expect(E.objetos.some((o) => o.tipo === 'pancarta')).toBe(false);
    for (let y = 0; y < D; y++) for (let i = 0; i < 8; i++) expect(es(E.piso.r, 580 + i + Math.round(0.35 * y), y, 'tinta'), `meta ${y}`).toBe(false);
  });

  it('las cuerdas de faroles van de poste en poste, y los faroles se mecen en la vida (sin quedar dobles)', () => {
    const c = E.objetos.find((o) => o.tipo === 'cuerdas_faroles')!;
    expect(c).toMatchObject({ origen: 'bajo', orden: 98 });
    // las cuerdas se amarran en los dos postes de faroles (z 110) y en los del Tama-wari (z 124)
    const mecen = E.vida.find((v) => v.id === 'faroles_cuerda_0')!;
    expect(mecen).toMatchObject({ capa: 'objeto', x: c.x, y: c.y, orden: 98.05, fps: 3 });
    expect(mecen.cuadros).toHaveLength(4);
    expect(iguales(mecen.cuadros[0].r, mecen.cuadros[2].r)).toBe(true);
    expect(iguales(mecen.cuadros[0].r, mecen.cuadros[1].r)).toBe(false);
    // con la vida, el objeto lleva solo las cuerdas: ningún farol dorado pintado ahí
    let oro = 0;
    for (let y = 0; y < c.img.h; y++) for (let x = 0; x < c.img.w; x++) if (es(c.img.r, x, y, 'oro')) oro++;
    expect(oro).toBe(0);
    // sin la vida, los faroles van quietos en el objeto
    const quietos = renderEscena(validateLayout({ ...RAW, vida: [] }).layout!, 42, 0.35);
    const cq = quietos.objetos.find((o) => o.tipo === 'cuerdas_faroles')!;
    let oroQ = 0;
    for (let y = 0; y < cq.img.h; y++) for (let x = 0; x < cq.img.w; x++) if (es(cq.img.r, x, y, 'oro')) oroQ++;
    expect(oroQ).toBeGreaterThan(50);
    expect(quietos.vida).toEqual([]);
  });

  it('la vida: el cuadro 0 de cada pieza sobre lo pintado es igual a lo pintado, y los otros cambian', () => {
    const por = (t: string) => E.vida.filter((v) => v.tipo === t);
    const calza = (capa: Raster, v: (typeof E.vida)[number], dy = 0) => {
      const c = v.cuadros[0].r;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.data[(y * c.w + x) * 4 + 3]) expect(hex(c, x, y), `${v.id} ${x},${y}`).toBe(hex(capa, v.x + x, v.y + y - dy));
    };
    const pub = por('publico');
    expect(pub).toHaveLength(BALCONES.length);
    for (const v of pub) { calza(E.cerca.r, v); expect(iguales(v.cuadros[0].r, v.cuadros[1].r)).toBe(false); }
    const bote = por('botes_con_faroles');
    expect(bote.map((v) => v.capa)).toEqual(['cerca', 'lejos']);
    calza(E.cerca.r, bote[0]);
    expect(bote[0].x).toBeLessThan(BOTE.x);
    expect(bote[1].recorrido).toMatchObject({ segundos: 45 });
    const velas = por('velitas_rio');
    expect(velas).toHaveLength(1);
    expect(velas[0]).toMatchObject({ capa: 'objeto', y: FT + D + 5 });
    calza(E.piso.r, velas[0], FT);
    expect(iguales(velas[0].cuadros[0].r, velas[0].cuadros[1].r)).toBe(false);
    // los faroles de los dos postes de faroles
    expect(por('faroles_meciendose').map((v) => v.id)).toEqual(['faroles_cuerda_0', 'faroles_poste_0', 'faroles_poste_1']);
  });

  it('las luces: los faroles de las puertas, los puestos, los postes y las cuerdas, todas prendidas y sin pasarse', () => {
    expect(E.luces.length).toBeGreaterThanOrEqual(8);
    expect(E.luces.length).toBeLessThanOrEqual(12);
    expect(E.luces.every((l) => l.encendida)).toBe(true);
    expect(E.particulas.filter((p) => p.fx === 'petalo_buganvilla')).toHaveLength(2);
  });

  it('el puente japonés y la luna en la capa lejos, el puente debajo del marcador con el zoom de la pelea', () => {
    const yLejos = FT - 30 - E.lejos.h;
    // el techo del templito (la placa dorada) cae en la fila 135 o más abajo
    let arriba = Infinity;
    for (let y = 0; y < E.lejos.h; y++) for (let x = PUENTE.x; x < PUENTE.x + PUENTE.w; x++) if (es(E.lejos.r, x, y, 'oro') || es(E.lejos.r, x, y, 'terracota')) arriba = Math.min(arriba, y);
    expect(yLejos + arriba).toBeGreaterThanOrEqual(135);
    expect(es(E.lejos.r, LUNA.x - 1, LUNA.y - 1, 'luz')).toBe(true);
    // la calle de piedra está seca: nada del reflejo del neón
    let violeta = 0;
    for (let y = 0; y < D; y++) for (let x = 0; x < 640; x++) if (es(E.piso.r, x, y, 'canal') || es(E.piso.r, x, y, 'salmon')) violeta++;
    expect(violeta).toBe(0);
  });

  it('las postales de un mundo de una pantalla van a 0, 2 y 4 segundos', () => {
    const r = generarEscenario(RAW, { postales: true });
    const ej = JSON.parse(new TextDecoder().decode(r.archivos.find((a) => a.nombre === 'escenario.json')!.bytes));
    expect(ej.postales).toEqual({ inicio: { archivo: 'postales/inicio.png', x: 0 }, medio: { archivo: 'postales/medio.png', x: 17 }, final: { archivo: 'postales/final.png', x: 34 } });
    const [a, b] = ['inicio', 'medio'].map((n) => decodePng(r.archivos.find((f) => f.nombre === `postales/${n}.png`)!.bytes));
    expect(iguales(a, b)).toBe(false);
  });

  it('imagen dorada: Hội An de noche y con la vida a los 3 segundos', () => {
    const out = createRaster(640, 360 * 2);
    blit(out, postal(E, 0, [], 640, 360, 0), 0, 0);
    blit(out, postal(E, 34, [], 640, 360, 3), 0, 360);
    const file = join(ROOT, 'golden', 'hoian_e3c.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_hoian_e3c.png'), encodePng(out)); }
    expect(same, 'cambió hoian_e3c; mira out/golden_actual_hoian_e3c.png').toBe(true);
  });
});
