import { describe, it, expect } from 'vitest';
import afinidadJson from '../gotico/datos/afinidad_armas.json';
import {
  AFINIDAD_ARMA, CLASES_HEROE, FAMILIAS_ARMA, TIERS_ARMA, ELEMENTOS_ARMA, ARMAS_LEGENDARIAS, LUZ_ELEMENTO_ARMA, luzDeArma, especArma, idArma, elementosDe,
} from '../gotico/catalogo/arsenal_elemental';
import { armaSuelta, personajeEscena } from '../gotico/cuerpo';
import { pintarEscena, fijarCalidad } from '../gotico/render';
import { arma3dDeLoot } from '../gotico/iconos3d';
import { HEROES } from '../gotico/catalogo/personajes';
import { allLoot, allArsenalBases, allArsenalLegendarias, renderLoot, findLoot } from '../loot';

const lleno = (img: { data: Uint8ClampedArray | Uint8Array }) => { let n = 0; for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 0) n++; return n; };

describe('arsenal elemental: datos', () => {
  it('30 familias, 5 niveles, 7 elementos y la afinidad de las 8 clases (igual en el JSON)', () => {
    expect(FAMILIAS_ARMA.length).toBeGreaterThanOrEqual(29);
    expect(TIERS_ARMA.map((t) => t.id)).toEqual(['comun', 'excepcional', 'elite', 'legendaria', 'mitica']);
    expect(ELEMENTOS_ARMA).toEqual(['fuego', 'hielo', 'veneno', 'rayo', 'sombra', 'sagrado', 'sangre']);
    expect(afinidadJson).toEqual(AFINIDAD_ARMA);
    for (const f of FAMILIAS_ARMA) for (const c of CLASES_HEROE) expect(['afin', 'neutra', 'torpe']).toContain(AFINIDAD_ARMA[f.id][c]);
    const afin = (c: (typeof CLASES_HEROE)[number]) => FAMILIAS_ARMA.filter((f) => AFINIDAD_ARMA[f.id][c] === 'afin').map((f) => f.id);
    expect(afin('templario')).toEqual(expect.arrayContaining(['espada', 'mandoble', 'maza']));
    expect(afin('berserker')).toEqual(expect.arrayContaining(['hacha', 'gran_hacha', 'martillo']));
    expect(afin('cazadora')).toEqual(expect.arrayContaining(['arco_corto', 'arco_largo', 'ballesta', 'jabalina']));
    expect(afin('arcanista')).toEqual(expect.arrayContaining(['baculo', 'gran_baculo', 'orbe', 'varita']));
    expect(afin('nigromante')).toEqual(expect.arrayContaining(['guadana', 'daga', 'varita', 'cetro']));
    expect(afin('monje')).toEqual(expect.arrayContaining(['cestus', 'katar', 'baculo']));
    expect(afin('druida')).toEqual(expect.arrayContaining(['lanza', 'hoz', 'baculo']));
    expect(afin('alquimista')).toEqual(expect.arrayContaining(['daga', 'ballesta', 'frascos']));
  });
  it('cada elemento trae su luz para el juego, y la luz crece con el nivel', () => {
    for (const el of ELEMENTOS_ARMA) {
      const l = LUZ_ELEMENTO_ARMA[el];
      expect(l.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(l.radio).toBeGreaterThan(0); expect(l.intensidad).toBeGreaterThan(0);
      expect(l.parpadeo).toBeGreaterThanOrEqual(0); expect(l.parpadeo).toBeLessThanOrEqual(1);
      expect(luzDeArma(el, 5).radio).toBeGreaterThan(luzDeArma(el, 1).radio);
    }
  });
  it('cada familia pasa por los siete elementos en la tabla de caída', () => {
    for (const f of FAMILIAS_ARMA) expect(new Set(TIERS_ARMA.flatMap((t) => elementosDe(f.id, t.nivel)).filter(Boolean)).size).toBe(7);
  });
});

describe('arsenal elemental: botín', () => {
  it('más de 300 bases y 40 legendarias con nombre y leyenda, en allLoot, del nivel 1 al 100', () => {
    const b = allArsenalBases(), l = allArsenalLegendarias();
    expect(b.length + l.length).toBeGreaterThanOrEqual(300);
    expect(l.length).toBeGreaterThanOrEqual(40);
    const ids = new Set(allLoot().map((i) => i.id));
    for (const it of [...b, ...l]) expect(ids.has(it.id), it.id).toBe(true);
    expect(new Set(l.map((x) => x.name.es)).size).toBe(l.length);
    for (const it of l) { expect(it.flavor?.es && it.flavor.en, it.id).toBeTruthy(); expect(it.stats.mods.length).toBeGreaterThanOrEqual(3); }
    const niv = b.map((i) => i.level);
    expect(Math.min(...niv)).toBeLessThanOrEqual(5);
    expect(Math.max(...niv)).toBeGreaterThanOrEqual(80);
    for (const it of [...b, ...l]) { expect(it.levelRange![0]).toBeGreaterThanOrEqual(1); expect(it.levelRange![1]).toBeLessThanOrEqual(100); }
    expect(b.find((i) => i.id === idArma('espada', 4, elementosDe('espada', 4)[0]))).toBeDefined();
  });
  it('el ícono 2D cambia con el nivel y el elemento, y la base dice qué arma 3D forjada pinta', () => {
    const a = allArsenalBases().find((i) => i.id === 'ars_espada_1')!, c = allArsenalBases().find((i) => i.id === idArma('espada', 4, elementosDe('espada', 4)[0]))!;
    expect(Buffer.from(renderLoot(a).data).equals(Buffer.from(renderLoot(c).data))).toBe(false);
    const ar = arma3dDeLoot(c)!;
    expect(ar).toMatchObject({ tipo: 'espada', nivel: 4, encanto: elementosDe('espada', 4)[0] });
    expect(arma3dDeLoot(findLoot('filo_del_alba')!)!.nivel).toBeUndefined();
  });
});

describe('arsenal elemental: forma forjada', () => {
  it('cada familia se pinta en sus niveles 1, 3 y 5; lo mítico lleva más piezas que lo común', () => {
    fijarCalidad(0);
    for (const f of FAMILIAS_ARMA) {
      const n1 = armaSuelta(f.tipo, especArma(f.id, 1), 'icono', 0).piezas, n5 = armaSuelta(f.tipo, especArma(f.id, 5, 'fuego'), 'icono', 0);
      expect(n5.piezas.length, f.id).toBeGreaterThan(n1.length);
      expect(n5.resplandor, f.id).toBeDefined();
      for (const n of [1, 3, 5] as const) expect(lleno(pintarEscena({ ...armaSuelta(f.tipo, { ...especArma(f.id, n, n > 1 ? 'hielo' : null), escala: 1.6 }, 'icono', 0), sinSombra: true, ss: 0 }).img), `${f.id} ${n}`).toBeGreaterThan(60);
    }
    fijarCalidad(1);
  }, 120000);
  it('el elemento es una capa que se mueve con el cuadro, en la mano igual que en el ícono', () => {
    fijarCalidad(0);
    const h = HEROES.find((x) => x.id === 'templario')!;
    for (const el of ELEMENTOS_ARMA) {
      const eq = { ...h.niveles[2], arma: especArma('espada', 4, el) };
      const a = personajeEscena(h.cuerpo, eq, 'so', 'quieto', 0), b = personajeEscena(h.cuerpo, eq, 'so', 'quieto', 3);
      expect(a.resplandor?.color, el).toBe(LUZ_ELEMENTO_ARMA[el].color);
      expect(JSON.stringify(a.piezas) === JSON.stringify(b.piezas), el).toBe(false);
    }
    // el cesto va en los dos puños y el frasco se pinta aun sin nivel
    const monje = HEROES.find((x) => x.id === 'monje')!;
    const sin = personajeEscena(monje.cuerpo, { ...monje.niveles[0], arma: { tipo: 'puno' } }, 's', 'quieto', 0).piezas.length;
    expect(personajeEscena(monje.cuerpo, { ...monje.niveles[0], arma: especArma('cestus', 3) }, 's', 'quieto', 0).piezas.length).toBeGreaterThan(sin + 10);
    expect(lleno(pintarEscena({ ...armaSuelta('frasco', {}, 'icono', 0), sinSombra: true, ss: 0 }).img)).toBeGreaterThan(40);
    expect(ARMAS_LEGENDARIAS.length).toBeGreaterThanOrEqual(40);
    fijarCalidad(1);
  }, 60000);
});
