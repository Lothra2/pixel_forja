import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, migrateFicha, validateFicha, runQA, viewsForRows, type HumanFicha, type CellSize, type Raster } from '../index';
import { lpcHead } from '../parts/lpc';
import { GORROS_PROPIOS, pixelesGorro, esGorroPropio } from '../parts/sombreros';
import { makeRamp } from '../color/ramp';
import { validateTeams } from '../kit/custom';
import { ROOT } from './helpers';

const DIR = join(ROOT, 'docs', 'ejemplos', 'nekketsu');
const FICHAS = join(DIR, 'fichas');
const raw = (id: string) => JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'));
const ficha = (id: string) => ({ ...(migrateFicha(raw(id)) as HumanFicha), movementProfile: 'premium' as const });
const EQUIPOS = JSON.parse(readFileSync(join(DIR, 'equipos.json'), 'utf8')) as Record<string, { nombre: string; colores: string[]; atletas: string[] }>;
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const NACIONALES = ['rong_sai_gon', 'rolos_de_chapinero', 'panas_de_caracas', 'maracuchos_del_lago'];
const cuadro = (f: HumanFicha, view: 'front' | 'side' | 'back' = 'front', anim = 'idle', cell: CellSize = 48) => renderClip(f, cell, anim, view, { props: true }).frames[0];
const colores = (r: Raster) => { const s = new Set<string>(); for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3]) s.add('#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('')); return s; };
const igual = (a: Raster, b: Raster) => a.w === b.w && a.h === b.h && a.data.every((v, i) => v === b.data[i]);
const cols = { skin: '#c89377', hair: '#3a2618', eyes: '#2a1c14', beard: '#3a2618', glasses: '#1e1e24' };
const look = (hat: string | null) => ({ head: 'female', hair: 'bob', brows: 'thin', nose: null, beard: null, mustache: null, glasses: null, hat, hatColor: null }) as any;

describe('equipos nacionales (lote C2)', () => {
  it('los 4 equipos del pedido con sus 4 atletas, colores y fichas válidas', () => {
    for (const id of NACIONALES) {
      const t = EQUIPOS[id];
      expect(t, id).toBeDefined();
      expect(t.atletas, id).toHaveLength(4);
      expect(t.colores.length, id).toBeGreaterThanOrEqual(2);
      for (const a of t.atletas) expect(validateFicha(raw(a)), a).toEqual([]);
    }
    const fichas = readdirSync(FICHAS).filter((n) => n.endsWith('.ficha.json')).map((n) => n.replace('.ficha.json', ''));
    expect(validateTeams(EQUIPOS, fichas, ['thor'])).toEqual([]);
    expect(EQUIPOS.rong_sai_gon.nombre).toBe('Rồng Sài Gòn');
  });

  it('Don Hernando es el gigante de los Rolos, en celda 64 como Goro', () => {
    expect(raw('don_hernando').cell).toBe(64);
    for (const id of NACIONALES.flatMap((t) => EQUIPOS[t].atletas)) if (id !== 'don_hernando') expect(raw(id).cell ?? 48, id).toBe(48);
  });

  it('los 16 pasan el control de calidad en las 5 filas del juego, en el pack base', () => {
    const bad: string[] = [];
    for (const id of NACIONALES.flatMap((t) => EQUIPOS[t].atletas)) {
      const f = ficha(id), cell = (raw(id).cell ?? 48) as CellSize;
      for (const a of ['idle', 'walk', 'run', 'jump', 'hit', 'celebrate', 'taunt']) for (const v of viewsForRows(FIVE)) {
        const c = renderClip(f, cell, a, v, { props: true });
        const qa = runQA(f, c);
        if (!qa.ok) bad.push(`${id} ${a} ${v}: ${qa.items.filter((i) => i.severity !== 'ok').map((i) => `${i.check} ${i.value} ${i.where ?? ''}`).join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  }, 600_000);
});

describe('gorros propios (catálogo C4)', () => {
  it('están los 6 del pedido y todos tienen pixeles en las 3 direcciones', () => {
    expect([...GORROS_PROPIOS]).toEqual(['non_la', 'vueltiao', 'gorra_beisbol', 'casco_ciclista', 'sombrero_gaitero', 'rolos']);
    for (const id of GORROS_PROPIOS) for (const dir of ['down', 'right', 'up'] as const) {
      expect(pixelesGorro(id, dir, { x: 20, y: 20, w: 20, h: 20 }).length, `${id} ${dir}`).toBeGreaterThan(10);
    }
    expect(esGorroPropio('non_la')).toBe(true);
    expect(esGorroPropio('headband')).toBe(false);
  });

  it('se apoyan sobre el pelo de la cabeza LPC: crecen hacia arriba y el ala del nón lá y del vueltiao es más ancha que la cabeza', () => {
    for (const view of ['front', 'side', 'back'] as const) {
      const sin = lpcHead(look(null), view, cols);
      for (const id of GORROS_PROPIOS) {
        const con = lpcHead(look(id), view, cols);
        expect(con.img.h, `${id} ${view}`).toBeGreaterThanOrEqual(sin.img.h);
        if (id === 'non_la' || id === 'vueltiao') expect(con.img.w, `${id} ${view}`).toBeGreaterThan(sin.img.w);
      }
    }
  });

  it('el sprite completo cambia con el gorro', () => {
    const f = ficha('ba_hoa');
    expect(f.avatar?.lpc?.hat).toBe('non_la');
    const sin = { ...f, avatar: { ...f.avatar!, lpc: { ...f.avatar!.lpc!, hat: null } } } as HumanFicha;
    expect(igual(cuadro(f), cuadro(sin))).toBe(false);
  });
});

describe('ropa nueva: cuello, estampados y calzado abierto', () => {
  const base = ficha('tuan');

  it('la bufanda y la pañoleta pintan su color en el cuello', () => {
    for (const kind of ['bufanda', 'panoleta'] as const) {
      const f = { ...base, outfit: { ...base.outfit, neck: { kind, color: '#2f9e44' } } } as HumanFicha;
      const r = makeRamp('#2f9e44');
      const cs = colores(cuadro(f));
      expect(r.some((c) => cs.has(c)), kind).toBe(true);
      expect(igual(cuadro(f), cuadro(base)), kind).toBe(false);
    }
  });

  it('las flores y la guayabera ponen el segundo color en la camisa', () => {
    for (const pattern of ['flores', 'guayabera'] as const) {
      const f = { ...base, outfit: { ...base.outfit, pattern, pattern2: '#7b2ff2' } } as HumanFicha;
      expect(makeRamp('#7b2ff2').some((c) => colores(cuadro(f)).has(c)), pattern).toBe(true);
    }
  });

  it('con chancletas y sandalias se ve el pie: el pie es piel y la suela del color del calzado', () => {
    const tenis = { ...base, outfit: { ...base.outfit, shoes: 'tenis' } } as HumanFicha;
    for (const shoes of ['chancletas', 'sandalias'] as const) {
      const f = { ...base, outfit: { ...base.outfit, shoes } } as HumanFicha;
      const a = cuadro(f, 'side'), b = cuadro(tenis, 'side');
      expect(igual(a, b), shoes).toBe(false);
      // hay más piel abajo, en los pies
      const piel = new Set(f.palette.skin);
      const pielAbajo = (r: Raster) => { let n = 0; for (let y = r.h - 6; y < r.h; y++) for (let x = 0; x < r.w; x++) { const i = (y * r.w + x) * 4; if (r.data[i + 3] && piel.has('#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join(''))) n++; } return n; };
      expect(pielAbajo(a), shoes).toBeGreaterThan(pielAbajo(b));
    }
  });
});

describe('la cara malandra (face.base)', () => {
  it('los 4 del Instituto traen cejas fruncidas y media sonrisa de base', () => {
    for (const id of ['kenji', 'ryu', 'goro', 'tetsu']) expect(raw(id).face.base, id).toEqual({ eyes: 'angry', mouth: 'smirk' });
  });

  it('reemplaza la cara neutra pero no la del golpe ni la de los ojos cerrados', () => {
    const f = ficha('kenji');
    const dulce = { ...f, face: { ...f.face, base: undefined } } as HumanFicha;
    // en reposo (cara neutra) cambia
    expect(igual(cuadro(f), cuadro(dulce))).toBe(false);
    // en el golpe recibido la cara es la del golpe para los dos
    expect(igual(cuadro(f, 'front', 'hit'), cuadro(dulce, 'front', 'hit'))).toBe(true);
  });

  it('en la cabeza LPC las cejas en V se dibujan encima del flequillo', () => {
    const conFlequillo = { head: 'male', hair: 'spiked', brows: 'thick', nose: null, beard: null, mustache: null, glasses: null, hat: null, hatColor: null } as any;
    const neutra = lpcHead(conFlequillo, 'front', cols, 'open', 'line');
    const malandra = lpcHead(conFlequillo, 'front', cols, 'angry', 'smirk');
    let distintos = 0;
    const n = Math.min(neutra.img.idx.length, malandra.img.idx.length);
    for (let i = 0; i < n; i++) if (neutra.img.idx[i] !== malandra.img.idx[i]) distintos++;
    expect(distintos).toBeGreaterThan(4);
  });
});
