import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  renderClip, runQA, viewsForRows, validateFicha, migrateFicha, isHuman, encodePng, decodePng, createRaster, blit,
  type HumanFicha, type AnimalFicha, type CellSize, type Raster,
} from '../index';
import { buildSportsKit } from '../kit/sportskit';
import { animsFor } from '../anim/registry';
import { ROOT } from './helpers';

/** Las fichas de ejemplo de los equipos (docs/ejemplos/nekketsu/fichas): Familia GG, Instituto Nekketsu y Thor. */
const DIR = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const load = (id: string) => migrateFicha(JSON.parse(readFileSync(join(DIR, `${id}.ficha.json`), 'utf8')));
const human = (id: string) => load(id) as HumanFicha;
const TEAMS = { familia_gg: ['rick', 'steph', 'sophie', 'alana'], instituto_nekketsu: ['kenji', 'ryu', 'goro', 'tetsu'] };
const ALL = Object.values(TEAMS).flat();
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const cellOf = (f: HumanFicha): CellSize => f.cell ?? 48;
const hex = (r: Raster, x: number, y: number) => {
  const i = (y * r.w + x) * 4;
  return r.data[i + 3] ? (r.data[i] << 16) | (r.data[i + 1] << 8) | r.data[i + 2] : -1;
};
/** pixeles de un color parecido (distancia en RGB) */
const count = (r: Raster, rgb: number, tol = 40) => {
  let n = 0;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const c = hex(r, x, y);
    if (c < 0) continue;
    const d = Math.abs((c >> 16) - (rgb >> 16)) + Math.abs(((c >> 8) & 255) - ((rgb >> 8) & 255)) + Math.abs((c & 255) - (rgb & 255));
    if (d <= tol) n++;
  }
  return n;
};
const idle = (f: HumanFicha, view: string, cell = cellOf(f)) => renderClip(f, cell, 'idle', view as never, { props: true }).frames[0];

describe('equipos: fichas de ejemplo (lote C1)', () => {
  it('las 8 fichas y Thor son válidas, y Goro trae su celda de gigante', () => {
    const files = readdirSync(DIR).filter((n) => n.endsWith('.ficha.json')).map((n) => n.replace('.ficha.json', '')).sort();
    expect(files).toEqual([...ALL, 'thor'].sort());
    for (const id of files) expect(validateFicha(JSON.parse(readFileSync(join(DIR, `${id}.ficha.json`), 'utf8'))), id).toEqual([]);
    expect(isHuman(load('thor'))).toBe(false);
    expect(human('goro').cell).toBe(64);
    expect(ALL.filter((id) => id !== 'goro').every((id) => human(id).cell === undefined)).toBe(true);
  });

  it('pasan el control de calidad en 32, 48 y 64, en las 5 filas (Goro en su celda)', () => {
    const anims = ['idle', 'walk', 'run', 'jab', 'hit', 'lift', 'carry_walk', 'throw_overhead', 'carried', 'thrown_spin', 'weapon_swing'];
    const bad: string[] = [];
    for (const id of ALL) {
      const f = human(id);
      const cells: CellSize[] = f.cell ? [f.cell] : [32, 48, 64];
      for (const cell of cells) for (const a of anims) for (const v of viewsForRows(FIVE)) {
        const r = runQA(f, renderClip(f, cell, a, v, { props: true }));
        if (!r.ok) bad.push(`${id} ${cell} ${a} ${v}: ${r.items.filter((i) => i.severity === 'error').map((i) => i.check).join(',')}`);
      }
    }
    expect(bad).toEqual([]);
  }, 900_000);

  it('cada atleta se distingue en silueta de sus compañeros (de lado, en diagonal y de frente)', () => {
    // silueta en una celda de 64 con el pivote en el mismo lugar; dos siluetas se parecen si comparten casi todo
    const mask = (f: HumanFicha, view: string) => {
      const fr = idle(f, view), c = cellOf(f), m = new Uint8Array(64 * 64);
      const ox = (64 - c) / 2, oy = 64 - c;
      for (let y = 0; y < c; y++) for (let x = 0; x < c; x++) if (fr.data[(y * c + x) * 4 + 3]) m[(y + oy) * 64 + x + ox] = 1;
      return m;
    };
    const iou = (a: Uint8Array, b: Uint8Array) => {
      let i = 0, u = 0;
      for (let k = 0; k < a.length; k++) { i += a[k] & b[k]; u += a[k] | b[k]; }
      return i / u;
    };
    const worst: string[] = [];
    for (const ids of Object.values(TEAMS)) for (const view of ['side', 'se', 'front']) {
      const ms = ids.map((id) => mask(human(id), view));
      for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
        const v = iou(ms[a], ms[b]);
        if (v > 0.85) worst.push(`${ids[a]}/${ids[b]} ${view}: ${v.toFixed(2)}`);
      }
    }
    expect(worst).toEqual([]);
  }, 120_000);

  it('gakuran: cerrado tapa la camiseta y lleva botones dorados; abierto deja ver la camiseta', () => {
    const kenji = human('kenji');
    const WHITE = 0xf2f2ee;
    const open = idle(kenji, 'front');
    const closed = idle({ ...kenji, outfit: { ...kenji.outfit, jacketClosed: true } }, 'front');
    // la camiseta blanca se ve abierto y desaparece cerrado (queda el blanco de los ojos)
    expect(count(closed, WHITE, 30)).toBeLessThanOrEqual(count(open, WHITE, 30) - 4);
    // botones dorados (en su tono claro): amarillos, que abierto no están al medio
    const yellow = (r: Raster) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && r.data[i] > 170 && r.data[i + 1] > 130 && r.data[i + 2] < 110) n++; return n; };
    expect(yellow(closed)).toBeGreaterThan(0);
    // sin mangas (Goro): los brazos son de piel, el torso del gakuran
    const goro = human('goro');
    const sleeveless = idle(goro, 'front'), sleeved = idle({ ...goro, outfit: { ...goro.outfit, jacketSleeves: 'long' } }, 'front');
    expect(Buffer.from(sleeveless.data).equals(Buffer.from(sleeved.data))).toBe(false);
  });

  it('brazalete: una franja de su color en el brazo cercano', () => {
    // rojo de verdad (también en sus tonos de sombra): mucho rojo, poco verde y azul
    const reds = (r: Raster) => {
      let n = 0;
      for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && r.data[i] > 110 && r.data[i + 1] < 70 && r.data[i + 2] < 80) n++;
      return n;
    };
    for (const id of TEAMS.instituto_nekketsu) {
      const f = human(id);
      // con brazalete hay más rojo que sin él (la boca y la sombra de la piel también son rojizas)
      for (const v of ['side', 'front', 'se']) expect(reds(idle(f, v)), `${id} ${v}`).toBeGreaterThan(reds(idle({ ...f, outfit: { ...f.outfit, armband: null } }, v)));
    }
  });

  it('"GG" en el pecho y el número atrás, enteros: nunca a medias detrás de la cabeza o los brazos', () => {
    const GOLD = 0xf2c230;
    for (const id of TEAMS.familia_gg) {
      const f = human(id);
      // de frente siempre se ve el dorado del equipo (las letras o, si no caben, el parche)
      expect(count(idle(f, 'front'), GOLD, 40), `${id} de frente`).toBeGreaterThan(1);
      // sin letras: el número va de frente
      const plain = idle({ ...f, outfit: { ...f.outfit, chestText: null } }, 'front');
      expect(Buffer.from(plain.data).equals(Buffer.from(idle(f, 'front').data))).toBe(false);
    }
    // Rick a 64: las dos G enteras (9 pixeles cada una). A 48 su barba no deja lugar y va el parche
    const rick = human('rick');
    expect(count(idle(rick, 'front', 64), GOLD, 40)).toBe(18);
    expect(count(idle(rick, 'front'), GOLD, 40)).toBe(6);
    // el 7 entero de espalda (6 pixeles); a Steph el pelo le tapa la espalda y el número no se dibuja a medias
    expect(count(idle(rick, 'back'), GOLD, 40)).toBe(6);
    expect(count(idle(human('steph'), 'back'), GOLD, 40)).toBe(0);
  });

  it('el kit respeta la celda de la ficha, trae el número y exporta la mascota con todas sus animaciones', () => {
    const thor = load('thor') as AnimalFicha;
    const files = buildSportsKit({ athletes: { goro: human('goro'), rick: human('rick') }, animales: { thor }, packs: ['pelea'], quick: true, filas: FIVE, atlas: true });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    expect(m.atletas.goro.celda).toBe(64);
    expect(m.atletas.goro.pivote).toEqual([32, 62]);
    expect(m.atletas.rick.celda).toBe(48);
    expect(m.atletas.rick.numero).toBe('7');
    expect(m.atletas.goro.numero).toBeUndefined();
    expect(Object.keys(m.animales.thor.anims)).toEqual(animsFor(thor).map((a) => a.name));
    expect(m.animales.thor.atlas).toBe('animales/thor.json');
    const atlas = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'animales/thor.json')!.bytes));
    expect(atlas.frames['bark_right_0']).toBeTruthy();
    expect(atlas.frames['run_up_0']).toBeTruthy();
    expect(files.some((x) => x.name === 'animales/thor.png')).toBe(true);
  }, 300_000);

  it('imagen dorada: los 8 de frente en idle (48, Goro en 64)', () => {
    const out = createRaster(64 * ALL.length, 64);
    ALL.forEach((id, i) => {
      const f = human(id), c = cellOf(f);
      blit(out, idle(f, 'front'), i * 64 + (64 - c) / 2, 64 - c);
    });
    const file = join(ROOT, 'golden', 'equipos_c1.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_equipos_c1.png'), encodePng(out)); }
    expect(same, 'cambió equipos_c1; mira out/golden_actual_equipos_c1.png').toBe(true);
  });
});
