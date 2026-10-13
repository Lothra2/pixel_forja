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
import { motionOf8 } from '../export/motion';
import { pelotaSprite } from '../render/floorProps';
import type { PropKind } from '../rig/pose';
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

/**
 * Lote SP2: los packs nuevos de Nekketsu (básquet, arquero, tenis, béisbol y lo que se sumó a fútbol y vóley), los
 * arreglos del bote, el tiro y la atrapada, y las pelotas sueltas en objetos/pelotas.png.
 */
const SP2: Record<string, { anims: string[]; clase: string | null }> = {
  basket: { anims: ['dribble', 'shoot', 'dunk'], clase: 'basquet' },
  keeper: { anims: ['keeper_ready', 'keeper_dive', 'keeper_catch'], clase: 'futbol' },
  tennis: { anims: ['tn_ready', 'forehand', 'backhand', 'tennis_serve', 'tn_volley', 'tn_smash'], clase: 'tenis' },
  futbol: { anims: ['shot', 'pass', 'slide'], clase: 'futbol' },
  voley: { anims: ['vb_ready'], clase: null },
  beisbol: { anims: ['pitch', 'catch'], clase: 'beisbol' },
};
/** Las que no traen pelota: salen iguales y sin objetos. */
const SIN_PELOTA = ['keeper_ready', 'tn_ready', 'slide', 'vb_ready'];
/** Los colores del disco de una pelota (sin el contorno) que no están en `fuera`. */
function discoDe(kind: PropKind, fuera: Set<string>): Set<string> {
  const sp = pelotaSprite(kind, 48), out = new Set<string>();
  for (let y = 1; y < sp.h - 1; y++) for (let x = 1; x < sp.w - 1; x++) if (sp.data[(y * sp.w + x) * 4 + 3] && !fuera.has(px(sp, x, y))) out.add(px(sp, x, y));
  return out;
}
const colores = (r: Raster) => { const s = new Set<string>(); for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3]) s.add(r.data.subarray(i, i + 4).join(',')); return s; };

describe('sin_props (lote SP2): los packs nuevos', () => {
  it('las 18 animaciones salen sin pelota, en las 5 filas, y el cuerpo no cambia fuera de ella', () => {
    for (const { anims } of Object.values(SP2)) for (const a of anims) for (const fila of FILAS) {
      const { con, sin } = par(RICK, 48, a, ROW_VIEW[fila]);
      // los colores del cuerpo: la misma animación dibujada sin implementos
      const cuerpo = new Set(renderClip(RICK, 48, a, ROW_VIEW[fila], { props: false }).frames.flatMap((fr) => [...colores(fr)]));
      expect(sin.frames.length, a).toBe(con.frames.length);
      expect(sin.wholes, `${a} ${fila}`).toEqual(con.wholes);
      expect(sin.joints, `${a} ${fila}`).toEqual(con.joints);
      expect(sin.balls, `${a} ${fila}`).toEqual(con.balls);
      if (SIN_PELOTA.includes(a)) expect(con.balls, `${a} no trae pelota`).toBeUndefined();
      else expect(con.balls?.some((b) => b.length), `${a} trae pelota`).toBe(true);
      con.frames.forEach((fr, i) => {
        const bs = con.balls?.[i] ?? [];
        const d = diffs(fr, sin.frames[i]);
        if (!bs.length) { expect(d, `${a} ${fila} ${i}: sin pelota no cambia nada`).toEqual([]); return; }
        for (const [x, y] of d) {
          const near = bs.some((b) => x + 1 >= b.x - b.d / 2 - 1 && x <= b.x + b.d / 2 + 1 && y + 1 >= b.y - b.d / 2 - 1 && y <= b.y + b.d / 2 + 1);
          expect(near, `${a} ${fila} ${i}: cambió (${x}, ${y}) lejos de la pelota`).toBe(true);
        }
        // la pelota se fue: no queda ningún pixel del color de su disco (el naranja del básquet, el lima del tenis...)
        const delDisco = discoDe(bs[0].kind, cuerpo);
        const quedan = [...colores(sin.frames[i])].filter((c) => delDisco.has(c));
        expect(quedan, `${a} ${fila} ${i}: quedan colores de la pelota`).toEqual([]);
      });
    }
  });

  it('la raqueta se queda dibujada en todo el tenis, y la pelota no', () => {
    for (const a of SP2.tennis.anims) for (const fila of FILAS) {
      const { con, sin } = par(RICK, 48, a, ROW_VIEW[fila]);
      // los colores del cuerpo y la ropa: los de la misma animación dibujada sin implementos
      const cuerpo = new Set<string>();
      for (const fr of renderClip(RICK, 48, a, ROW_VIEW[fila], { props: false }).frames) for (const c of colores(fr)) cuerpo.add(c);
      const lima = colores(pelotaSprite('tennisball', 48));
      // la raqueta: pixeles de colores que no son del cuerpo ni de la pelota (el marco rojo, las cuerdas)
      const raqueta = (fr: Raster) => {
        let n = 0;
        for (let k = 0; k < fr.data.length; k += 4) if (fr.data[k + 3] && !cuerpo.has(fr.data.subarray(k, k + 4).join(',')) && !lima.has(fr.data.subarray(k, k + 4).join(','))) n++;
        return n;
      };
      const conRaqueta = sin.frames.filter((fr) => raqueta(fr) >= 6).length;
      // se ve en casi todo el golpe (en el remate de algunos queda detrás de la espalda)
      expect(conRaqueta, `${a} ${fila}`).toBeGreaterThanOrEqual(Math.ceil(sin.frames.length / 2));
      // y es la misma que en el pack con pelota: solo cambia lo que tapaba la pelota
      sin.frames.forEach((fr, i) => expect(raqueta(fr), `${a} ${fila} ${i}`).toBeGreaterThanOrEqual(raqueta(con.frames[i]) - 4));
    }
  });

  it('objetos en [fila][cuadro] desde el pivote, con la clase de cada deporte; las que no traen pelota no lo llevan', () => {
    const [px0, py0] = pivotOf(48);
    for (const { anims, clase } of Object.values(SP2)) for (const a of anims) {
      const clips = FILAS.map((fila) => renderClip(RICK, 48, a, ROW_VIEW[fila], { props: true, sinPelotas: true }));
      const { objetos } = objetosOf(clips);
      if (SIN_PELOTA.includes(a)) { expect(objetos, a).toBeUndefined(); continue; }
      expect(objetos, a).toHaveLength(FILAS.length);
      clips.forEach((c, r) => {
        expect(objetos![r], `${a} ${r}`).toHaveLength(c.frames.length);
        c.frames.forEach((_, i) => {
          const b = c.balls![i];
          if (!b.length) expect(objetos![r][i], `${a} ${r} ${i}`).toBeNull();
          else expect(objetos![r][i], `${a} ${r} ${i}`).toEqual(b.map((q) => ({ tipo: 'pelota', clase, x: q.x - px0, y: q.y - py0, r: q.d / 2, detras: 0 })));
        });
      });
    }
  });

  it('el bote va debajo de la mano, del piso a la palma, en todas las filas (también en un gigante)', () => {
    for (const [f, cell] of [[RICK, 48], [GORO, 64]] as const) for (const fila of FILAS) {
      const c = renderClip(f, cell, 'dribble', ROW_VIEW[fila], { props: true });
      const piso = cell - 2;
      c.frames.forEach((_, i) => {
        const b = c.balls![i][0], mano = c.joints![i].handNear;
        expect(Math.abs(b.x - mano[0]), `${cell} ${fila} ${i}: x de la mano ${mano[0]} y del balón ${b.x}`).toBeLessThanOrEqual(1.5);
        // nunca por encima de la mano
        expect(b.y - b.d / 2, `${cell} ${fila} ${i}`).toBeGreaterThan(mano[1] - 1);
      });
      // toca el piso en el 3 (el borde de abajo en la fila del pivote, como los pies) y la palma en el 0 (el borde de arriba del balón, a un pixel o dos de la mano)
      const b3 = c.balls![3][0], b0 = c.balls![0][0];
      expect(b3.y + b3.d / 2, `${cell} ${fila}`).toBe(piso);
      // de espalda la mano queda un poco más arriba (y tapada por el cuerpo): ahí la palma va a 5 pixeles como mucho
      expect(b0.y - b0.d / 2 - c.joints![0].handNear[1], `${cell} ${fila}`).toBeLessThanOrEqual(fila.startsWith('up') ? 5 : 3);
    }
  });

  it('el tiro sube y avanza sin devolverse, y la atrapada se queda en el guante', () => {
    for (const fila of FILAS) {
      const s = renderClip(RICK, 48, 'shoot', ROW_VIEW[fila], { props: true });
      const ys = s.balls!.map((b) => b[0]?.y);
      // del set (1) a la suelta (4) siempre más arriba; en el 5 ya va al aro
      for (let i = 2; i <= 4; i++) expect(ys[i]!, `${fila} ${i}`).toBeLessThan(ys[i - 1]!);
      expect(s.balls![5]).toEqual([]);
      const k = renderClip(RICK, 48, 'catch', ROW_VIEW[fila], { props: true });
      for (let i = 3; i < 6; i++) {
        const b = k.balls![i][0], mano = k.joints![i].handNear;
        expect(Math.hypot(b.x - mano[0], b.y - mano[1]), `${fila} ${i}`).toBeLessThanOrEqual(1.5);
      }
    }
    // de lado, el tiro va hacia adelante
    const xs = renderClip(RICK, 48, 'shoot', 'side', { props: true }).balls!.slice(1, 5).map((b) => b[0].x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]);
  });

  it('las de pelota sin versión premium traen eventos, y caen donde lo dice el dibujo', () => {
    const ev = (f: HumanFicha, a: string) => {
      const clips = FILAS.map((fila) => renderClip(f, 48, a, ROW_VIEW[fila], { props: true }));
      return { clips, eventos: motionOf8(clips).eventos ?? [] };
    };
    const de = (e: { tipo: string; cuadro: number }[], tipo: string) => e.filter((x) => x.tipo === tipo).map((x) => x.cuadro);
    const lejos = (c: RenderedClip, i: number) => { const b = c.balls![i][0], m = c.joints![i].handNear; return b ? Math.hypot(b.x - m[0], b.y - m[1]) : Infinity; };
    const cerca = (c: RenderedClip, i: number) => lejos(c, i) <= 6 * c.cell / 48;
    // la suelta es el primer cuadro en que la pelota ya no va con la mano (o no se dibuja), con el punto de la mano en las 5 filas
    for (const a of ['shoot', 'dunk', 'pitch']) {
      const { clips, eventos } = ev(RICK, a);
      const [s] = de(eventos, 'suelta');
      expect(de(eventos, 'suelta'), a).toHaveLength(1);
      for (const c of clips) expect(c.balls![s - 1].length > 0 && (!c.balls![s].length || !cerca(c, s)), `${a} ${c.view} ${s}`).toBe(true);
      expect(eventos.find((e) => e.tipo === 'suelta')!.punto, a).toHaveLength(FILAS.length);
    }
    expect(de(ev(RICK, 'shoot').eventos, 'suelta')).toEqual([5]);
    expect(de(ev(RICK, 'dunk').eventos, 'suelta')).toEqual([5]);
    expect(de(ev(RICK, 'pitch').eventos, 'suelta')).toEqual([6]);
    // los saltos: en el aire entre el despegue y el aterriza
    for (const a of ['shoot', 'dunk']) {
      const { clips, eventos } = ev(RICK, a);
      const [d] = de(eventos, 'despegue'), [t] = de(eventos, 'aterriza');
      clips[0].airborne!.forEach((aire, i) => expect(aire, `${a} ${i}`).toBe(i >= d && i < t));
    }
    // la atrapada: el primer cuadro con la pelota pegada al guante (antes viene llegando: en un brazo largo de lado ya
    // casi lo toca en el 2, pero se engancha en el 3)
    const k = ev(RICK, 'catch');
    expect(de(k.eventos, 'atrapa')).toEqual([3]);
    for (const c of k.clips) {
      expect(lejos(c, 2), c.view).toBeGreaterThan(lejos(c, 3));
      for (let i = 3; i < 6; i++) expect(lejos(c, i), `catch ${c.view} ${i}`).toBeLessThanOrEqual(1.5);
    }
    // el bote: el cuadro donde el balón toca el piso
    const d = ev(RICK, 'dribble');
    expect(de(d.eventos, 'bote')).toEqual([3]);
    d.clips.forEach((c) => { const b = c.balls![3][0]; expect(b.y + b.d / 2).toBe(c.cell - 2); });
    // las atajadas también dicen `atrapa`, en el mismo cuadro del impacto de siempre
    for (const a of ['keeper_dive', 'keeper_catch']) {
      const { eventos } = ev(RICK, a);
      expect(de(eventos, 'atrapa'), a).toEqual(de(eventos, 'impacto'));
    }
    // una ficha clásica no trae eventos, como siempre
    expect(ev({ ...RICK, movementProfile: 'classic' }, 'shoot').eventos).toEqual([]);
    // y llegan al manifiesto del kit, en el pack sin pelotas
    const { files } = buildCustomKit({ ...MIN, filas: FILAS, packs: { basket: { anims: ['dribble', 'shoot'], sin_props: true } } }, {}, { quick: true, solo: ['atletas'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    const anims = m.atletas.rick.packs.basket.anims;
    expect(anims.shoot.eventos.map((e: { tipo: string; cuadro: number }) => `${e.tipo} ${e.cuadro}`)).toEqual(['despegue 2', 'suelta 5', 'aterriza 5']);
    expect(anims.dribble.eventos.map((e: { tipo: string; cuadro: number }) => `${e.tipo} ${e.cuadro}`)).toEqual(['bote 3']);
  });
});

describe('sin_props (lote SP2): las pelotas sueltas', () => {
  it('cada pelota suelta es el mismo dibujo que se quitó, con el centro exacto en el centro del cuadro', () => {
    let vistas = 0;
    for (const [f, cell] of [[RICK, 48], [GORO, 64]] as const) for (const a of ['serve', 'forehand', 'header', 'catch', 'pitch', 'dunk', 'dribble', 'keeper_catch']) {
      const { con, sin } = par(f, cell, a, 'side');
      con.frames.forEach((fr, i) => {
        for (const b of con.balls?.[i] ?? []) {
          const sp = pelotaSprite(b.kind, cell);
          expect([sp.w, sp.h]).toEqual([b.d + 2, b.d + 2]);
          const x0 = b.x - sp.w / 2, y0 = b.y - sp.h / 2;
          expect(Number.isInteger(x0) && Number.isInteger(y0)).toBe(true);
          if (x0 < 0 || y0 < 0 || x0 + sp.w > cell || y0 + sp.h > cell) continue;
          // donde no hay cuerpo debajo, pixel a pixel igual
          for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) {
            const o = ((y0 + y) * cell + x0 + x) * 4;
            if (!sp.data[(y * sp.w + x) * 4 + 3] || sin.frames[i].data[o + 3]) continue;
            expect(px(sp, x, y), `${cell} ${a} ${i} (${x}, ${y})`).toBe(px(fr, x0 + x, y0 + y));
          }
          vistas++;
        }
      });
    }
    expect(vistas).toBeGreaterThan(60);
  });

  it('el kit trae objetos/pelotas con las que se quitaron, en cada celda; sin packs sin_props no sale', () => {
    const k = kitSP2({ basket: { anims: ['dribble'], sin_props: true }, tennis: { anims: ['forehand', 'tn_ready'], sin_props: true }, pelea: ['idle'] });
    expect(k.m.pelotas).toEqual({
      balon_basket: { clase: 'basquet', atlas: 'objetos/pelotas.json', cuadros: { 48: 'balon_basket_48' } },
      pelota_tenis: { clase: 'tenis', atlas: 'objetos/pelotas.json', cuadros: { 48: 'pelota_tenis_48' } },
    });
    const json = JSON.parse(new TextDecoder().decode(k.get('objetos/pelotas.json').bytes));
    const png = decodePng(Buffer.from(k.get('objetos/pelotas.png').bytes));
    for (const [name, kind] of [['balon_basket_48', 'basketball'], ['pelota_tenis_48', 'tennisball']] as const) {
      const fr = json.frames[name];
      expect(fr.pivot).toEqual({ x: 0.5, y: 0.5 });
      const sp = pelotaSprite(kind, 48);
      expect([fr.frame.w, fr.frame.h]).toEqual([sp.w, sp.h]);
      for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) expect(px(png, fr.frame.x + x, fr.frame.y + y), name).toBe(px(sp, x, y));
    }
    expect(k.m.notas.find((n: string) => n.startsWith('sin_props'))).toContain('objetos/pelotas.json');
    const sin = kitSP2({ basket: ['dribble'] });
    expect(sin.m.pelotas).toBeUndefined();
    expect(sin.files.some((f) => f.name.startsWith('objetos/pelotas'))).toBe(false);
  });

  it('el ejemplo de Nekketsu: los packs nuevos con sin_props y las pruebas del juego', () => {
    const cfg = readJson(join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'kit.config.json')) as KitConfig;
    expect(validateKitConfig(cfg)).toEqual([]);
    expect(validator(cfg), JSON.stringify(validator.errors)).toBe(true);
    for (const [p, { anims }] of Object.entries(SP2)) {
      expect(packsSinProps(cfg.packs), p).toContain(p);
      for (const a of anims) expect(packAnims(cfg.packs[p]), `${p}: ${a}`).toContain(a);
    }
    expect(cfg.pruebas).toMatchObject({
      voley_playa: ['base', 'voley'], futbol_callejero: ['base', 'futbol', 'keeper'], da_cau: ['base', 'futbol'],
      basket: ['base', 'pelea', 'basket'], tenis: ['base', 'tennis'], chapita: ['base', 'armas', 'beisbol'], quemado: ['base', 'armas', 'beisbol'],
    });
  });
});

/** Un kit chico de Rick y la familia, solo atletas, con estos packs. */
function kitSP2(packs: KitConfig['packs']) {
  const { files } = buildCustomKit({ ...MIN, filas: FILAS, packs }, {}, { solo: ['atletas'] });
  const get = (n: string) => files.find((f) => f.name === n)!;
  return { files, get, m: JSON.parse(new TextDecoder().decode(get('manifest.json').bytes)) };
}
