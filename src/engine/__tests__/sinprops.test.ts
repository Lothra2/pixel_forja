import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { renderClip, type RenderedClip, type ViewName } from '../render/clip';
import { migrateFicha, type HumanFicha } from '../sheet/ficha';
import { familyFicha } from '../rpg/family';
import { decodePng, type Raster } from '../index';
import { buildCustomKit, validateKitConfig, packAnims, packsSinProps, type KitConfig } from '../kit/custom';
import { objetosOf, pivotOf, ROW_VIEW, PELOTAS } from '../export/frameData';
import { ROOT } from './helpers';

/**
 * Lote SP: packs sin pelotas (`sin_props`). El pack sale sin la pelota dibujada, el cuerpo queda igual pixel a pixel y
 * dónde iba la pelota sale en el dato por cuadro `objetos`.
 */

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const validator = new Ajv({ allErrors: true }).compile(readJson(join(ROOT, 'docs', 'kit-a-medida.schema.json')));
const VOLEY = ['vb_bump', 'vb_set', 'spike', 'block', 'serve', 'vb_dive'];
const FUTBOL = ['trap', 'header', 'volley', 'chilena'];
const FILAS = ['right', 'down_right', 'up_right', 'down', 'up'];
const RICK: HumanFicha = { ...familyFicha('rick', false), movementProfile: 'premium' };
const GORO: HumanFicha = { ...(migrateFicha(readJson(join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas', 'goro.ficha.json'))) as HumanFicha), movementProfile: 'premium' };
const MIN: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] } };

const px = (r: Raster, x: number, y: number) => r.data.subarray((y * r.w + x) * 4, (y * r.w + x) * 4 + 4).join(',');
/** Los pixeles que cambian entre dos cuadros. */
function diffs(a: Raster, b: Raster): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (px(a, x, y) !== px(b, x, y)) out.push([x, y]);
  return out;
}
/** Con y sin pelotas, la misma animación y fila. */
function par(f: HumanFicha, cell: 48 | 64, anim: string, view: ViewName): { con: RenderedClip; sin: RenderedClip } {
  return { con: renderClip(f, cell, anim, view, { props: true }), sin: renderClip(f, cell, anim, view, { props: true, sinPelotas: true }) };
}

describe('sin_props (lote SP): los cuadros', () => {
  it('las 10 animaciones salen sin pelota y el cuerpo no cambia ni un pixel fuera de ella', () => {
    for (const a of [...VOLEY, ...FUTBOL]) for (const fila of FILAS) {
      const { con, sin } = par(RICK, 48, a, ROW_VIEW[fila]);
      expect(sin.frames.length, a).toBe(con.frames.length);
      // lo medido es lo mismo: cajas del cuerpo, articulaciones y la pelota
      expect(sin.wholes, `${a} ${fila}`).toEqual(con.wholes);
      expect(sin.joints, `${a} ${fila}`).toEqual(con.joints);
      expect(sin.balls, `${a} ${fila}`).toEqual(con.balls);
      con.frames.forEach((fr, i) => {
        const bs = con.balls?.[i] ?? [];
        const d = diffs(fr, sin.frames[i]);
        if (!bs.length) { expect(d, `${a} ${fila} ${i}: sin pelota no cambia nada`).toEqual([]); return; }
        // todo lo que cambia está en la pelota o en su contorno (un pixel alrededor)
        for (const [x, y] of d) {
          const near = bs.some((b) => x + 1 >= b.x - b.d / 2 - 1 && x <= b.x + b.d / 2 + 1 && y + 1 >= b.y - b.d / 2 - 1 && y <= b.y + b.d / 2 + 1);
          expect(near, `${a} ${fila} ${i}: cambió (${x}, ${y}) lejos de la pelota`).toBe(true);
        }
        // y la pelota se fue: cambia casi todo su disco (lo que cae dentro de la celda)
        for (const b of bs) {
          let disco = 0, cambia = 0;
          for (let y = Math.floor(b.y - b.d / 2); y < b.y + b.d / 2; y++) for (let x = Math.floor(b.x - b.d / 2); x < b.x + b.d / 2; x++) {
            if (x < 0 || y < 0 || x >= 48 || y >= 48 || (x + 0.5 - b.x) ** 2 + (y + 0.5 - b.y) ** 2 > (b.d / 2 - 0.5) ** 2) continue;
            disco++;
            if (px(fr, x, y) !== px(sin.frames[i], x, y)) cambia++;
          }
          if (disco) expect(cambia / disco, `${a} ${fila} ${i}`).toBeGreaterThan(0.85);
        }
      });
    }
  });

  it('la posición de cada pelota es donde estaba dibujada (también en un gigante de 64 y en la chilena, que no es premium)', () => {
    let vistas = 0, exactas = 0;
    for (const [f, cell] of [[RICK, 48], [GORO, 64]] as const) for (const a of ['vb_bump', 'serve', 'header', 'volley', 'chilena']) for (const fila of FILAS) {
      const { con, sin } = par(f, cell, a, ROW_VIEW[fila]);
      con.frames.forEach((fr, i) => {
        const bs = con.balls?.[i] ?? [];
        if (bs.length !== 1) return;
        const b = bs[0];
        // solo las que caen enteras en la celda, con su contorno
        if (b.x - b.d / 2 - 1 < 0 || b.y - b.d / 2 - 1 < 0 || b.x + b.d / 2 + 1 > cell || b.y + b.d / 2 + 1 > cell) return;
        const d = diffs(fr, sin.frames[i]);
        const x0 = Math.min(...d.map((p) => p[0])), x1 = Math.max(...d.map((p) => p[0])) + 1;
        const y0 = Math.min(...d.map((p) => p[1])), y1 = Math.max(...d.map((p) => p[1])) + 1;
        // lo que se borró es el disco entero y, como mucho, su contorno (un pixel alrededor)
        const caja = `${a} ${fila} ${i}: [${x0}, ${y0}, ${x1}, ${y1}] contra la pelota en (${b.x}, ${b.y}) de ${b.d}`;
        expect(x0 <= b.x - b.d / 2 && x1 >= b.x + b.d / 2 && y0 <= b.y - b.d / 2 && y1 >= b.y + b.d / 2, caja).toBe(true);
        expect(x0 >= b.x - b.d / 2 - 1 && x1 <= b.x + b.d / 2 + 1 && y0 >= b.y - b.d / 2 - 1 && y1 <= b.y + b.d / 2 + 1, caja).toBe(true);
        // casi siempre el contorno sale entero y lo borrado queda centrado en la pelota, con d + 2 de lado
        // (cuando el contorno de un lado cae sobre la mano, ese lado no cambia)
        if ((x0 + x1) / 2 === b.x && (y0 + y1) / 2 === b.y && x1 - x0 === b.d + 2 && y1 - y0 === b.d + 2) exactas++;
        vistas++;
      });
    }
    expect(vistas).toBeGreaterThan(100);
    expect(exactas / vistas).toBeGreaterThan(0.9);
  });

  it('objetos va en [fila][cuadro] desde el pivote, con null donde no hay pelota', () => {
    const clips = FILAS.map((fila) => renderClip(RICK, 48, 'serve', ROW_VIEW[fila], { props: true, sinPelotas: true }));
    const { objetos } = objetosOf(clips);
    const [px0, py0] = pivotOf(48);
    expect(objetos).toHaveLength(FILAS.length);
    clips.forEach((c, r) => {
      expect(objetos![r]).toHaveLength(c.frames.length);
      c.frames.forEach((_, i) => {
        const b = c.balls![i];
        if (!b.length) expect(objetos![r][i]).toBeNull();
        else expect(objetos![r][i]).toEqual(b.map((q) => ({ tipo: 'pelota', clase: 'voley', x: q.x - px0, y: q.y - py0, r: q.d / 2, detras: 0 })));
      });
    });
    // block no trae pelota: no lleva objetos
    expect(objetosOf(FILAS.map((fila) => renderClip(RICK, 48, 'block', ROW_VIEW[fila], { props: true, sinPelotas: true })))).toEqual({});
    // la raqueta se queda: el tenis sin pelota sigue con raqueta, solo cambia la pelota
    const t = par(RICK, 48, 'tennis_serve', 'side');
    expect(t.sin.frames.some((fr, i) => !t.con.balls?.[i]?.length && diffs(fr, t.con.frames[i]).length)).toBe(false);
    expect(Object.values(PELOTAS)).toEqual(['futbol', 'voley', 'basquet', 'tenis', 'beisbol', 'bala']);
  });
});

describe('sin_props (lote SP): la configuración', () => {
  it('la lista de siempre y la forma objeto validan, en el motor y en el esquema', () => {
    const cfg: KitConfig = { ...MIN, packs: { base: ['idle', 'walk'], voley: { anims: VOLEY, sin_props: true }, futbol: { anims: FUTBOL }, otro: { anims: ['idle'], sin_props: false } } };
    expect(validateKitConfig(cfg)).toEqual([]);
    expect(validator(cfg), JSON.stringify(validator.errors)).toBe(true);
    expect(packsSinProps(cfg.packs)).toEqual(['voley']);
    expect(packAnims(cfg.packs.voley)).toEqual(VOLEY);
    expect(packAnims(cfg.packs.base)).toEqual(['idle', 'walk']);
  });

  it('los errores dicen el campo y sugieren el nombre correcto, en las dos formas', () => {
    const errs = validateKitConfig({ ...MIN, packs: { base: ['idle', 'wlak'], voley: { anims: ['vb_bump', 'vb_bunp'], sin_prop: true }, futbol: { anims: [], sin_props: 'si' }, nada: {} } });
    const has = (s: string) => expect(errs.some((e) => e.includes(s)), `${s}\n${errs.join('\n')}`).toBe(true);
    has('packs.base[1]: "wlak" no es una animación. ¿Quisiste decir "walk"?');
    has('packs.voley.anims[1]: "vb_bunp" no es una animación. ¿Quisiste decir "vb_bump"?');
    has('packs.voley.sin_prop: clave desconocida. ¿Quisiste decir "sin_props"?');
    has('packs.futbol.sin_props: true o false');
    has('packs.futbol.anims: tiene que ser una lista de animaciones');
    has('packs.nada.anims: tiene que ser una lista de animaciones');
    // el esquema rechaza lo mismo
    for (const p of [{ anims: ['vb_bunp'], sin_props: true }, { anims: ['spike'], sin_prop: true }, { anims: ['spike'], sin_props: 'si' }, { sin_props: true }, { anims: [] }])
      expect(validator({ ...MIN, packs: { voley: p } }), JSON.stringify(p)).toBe(false);
    expect(() => buildCustomKit({ ...MIN, packs: { voley: { anims: ['vb_bunp'], sin_props: true } } })).toThrowError(/packs\.voley\.anims\[0\]: "vb_bunp"/);
  });
});

describe('sin_props (lote SP): el kit', () => {
  const dec = (b: Uint8Array) => new TextDecoder().decode(b);
  const kit = (packs: KitConfig['packs']) => {
    const { files } = buildCustomKit({ ...MIN, personajes_incluidos: ['familia'], filas: FILAS, datos_por_cuadro: ['cajas', 'cuerpo'], packs }, {}, { solo: ['atletas'] });
    const get = (n: string) => files.find((f) => f.name === n)!;
    return { files, get, m: JSON.parse(dec(get('manifest.json').bytes)) };
  };
  const conSin = kit({ deporte: ['header', 'idle'], deporte_sin: { anims: ['header', 'idle'], sin_props: true } });
  const solo = kit({ deporte: ['header', 'idle'] });

  it('el pack sin_props trae objetos y su atlas no tiene la pelota; el pack de siempre sale idéntico', () => {
    const a = conSin.m.atletas.rick.packs;
    const h = a.deporte_sin.anims.header;
    expect(h.objetos).toHaveLength(FILAS.length);
    for (const row of h.objetos) expect(row).toHaveLength(h.cuadros);
    expect(h.objetos.flat().filter(Boolean).length).toBeGreaterThan(0);
    for (const o of h.objetos.flat().filter(Boolean).flat()) expect(o).toMatchObject({ tipo: 'pelota', clase: 'futbol', r: 3, detras: 0 });
    // idle no trae pelota, y el pack de siempre no lleva objetos
    expect(a.deporte_sin.anims.idle.objetos).toBeUndefined();
    expect(a.deporte.anims.header.objetos).toBeUndefined();
    // el pack sin sin_props sale igual que en un kit sin packs sin_props: datos y atlas, byte a byte
    expect(a.deporte).toEqual(solo.m.atletas.rick.packs.deporte);
    for (const n of ['atletas/rick/deporte.png', 'atletas/rick/deporte.json']) expect(conSin.get(n).bytes, n).toEqual(solo.get(n).bytes);
    // el cuerpo es el mismo y la caja de lo opaco ya no tiene la pelota
    expect(a.deporte_sin.anims.header.cuerpo).toEqual(a.deporte.anims.header.cuerpo);
    expect(a.deporte_sin.anims.header.cajas).not.toEqual(a.deporte.anims.header.cajas);
    // en el atlas: cada cuadro cambia solo donde estaba la pelota (desde el pivote)
    const atlasCon = readAtlas(conSin, 'deporte'), atlasSin = readAtlas(conSin, 'deporte_sin');
    const [pvx, pvy] = pivotOf(48);
    FILAS.forEach((fila, r) => {
      for (let i = 0; i < h.cuadros; i++) {
        const ca = atlasCon(`header_${fila}_${i}`), cb = atlasSin(`header_${fila}_${i}`);
        const os = h.objetos[r][i] ?? [];
        for (const [x, y] of diffs(ca, cb)) {
          const ok = os.some((o: { x: number; y: number; r: number }) => Math.abs(x + 0.5 - (o.x + pvx)) <= o.r + 1 && Math.abs(y + 0.5 - (o.y + pvy)) <= o.r + 1);
          expect(ok, `${fila} ${i}: (${x}, ${y})`).toBe(true);
        }
      }
    });
  });

  it('la forma objeto sin sin_props sale igual que la lista', () => {
    const obj = kit({ deporte: { anims: ['header', 'idle'] } });
    expect(obj.files.map((f) => f.name)).toEqual(solo.files.map((f) => f.name));
    for (const f of solo.files) expect(obj.get(f.name).bytes, f.name).toEqual(f.bytes);
  });

  it('el manifiesto lo explica en sus notas y objetos va una fila por línea', () => {
    expect(conSin.m.notas.some((n: string) => n.startsWith('sin_props (deporte_sin): ') && n.includes('objetos: [fila][cuadro]') && n.includes('Al espejar, x pasa a -x'))).toBe(true);
    expect(solo.m.notas.some((n: string) => n.startsWith('sin_props'))).toBe(false);
    const txt = dec(conSin.get('manifest.json').bytes);
    const lineas = txt.split('\n').filter((l) => /^\s+\[(null|\[\{"tipo")/.test(l));
    expect(lineas).toHaveLength(4 * FILAS.length);
  });
});

/** Lee un cuadro del atlas de un pack de Rick. */
function readAtlas(k: { get: (n: string) => { bytes: Uint8Array } }, pack: string) {
  const png = decodePng(Buffer.from(k.get(`atletas/rick/${pack}.png`).bytes));
  const json = JSON.parse(new TextDecoder().decode(k.get(`atletas/rick/${pack}.json`).bytes));
  return (name: string): Raster => {
    const { x, y, w, h } = json.frames[name].frame;
    const out = { w, h, data: new Uint8ClampedArray(w * h * 4) } as Raster;
    for (let j = 0; j < h; j++) out.data.set(png.data.subarray(((y + j) * png.w + x) * 4, ((y + j) * png.w + x + w) * 4), j * w * 4);
    return out;
  };
}
