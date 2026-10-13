import { describe, it, expect } from 'vitest';
import {
  familyFicha, renderClip, validateFicha, decodePng, EIGHT_VIEWS, VIEW_SUFFIX, createRaster,
  viewsForRows, frameDataOf, opaqueBox, ROW_NAMES, packAtlas, atlasFrameName, atlasGrid, MAX_ATLAS,
  portrait, portraitSheet, headIcon, EXPRESSIONS, PORTRAIT_BIG_SCALE, dressForPack, variantForPack, variantNames,
  buildGameKit, renderPlan, type HumanFicha, type CellSize, type Raster, type Wardrobe,
} from '../index';
import { buildSportsKit, SPORT_PACKS } from '../kit/sportskit';

const premium = (id: 'rick' | 'steph' | 'sophie' | 'alana'): HumanFicha => ({ ...familyFicha(id, false), movementProfile: 'premium' });
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const dec = (b: Uint8Array) => JSON.parse(new TextDecoder().decode(b));
const alpha = (r: Raster, x: number, y: number) => x >= 0 && y >= 0 && x < r.w && y < r.h ? r.data[(y * r.w + x) * 4 + 3] : 0;
const hex = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join(''); };

const WARDROBE: Wardrobe = {
  variants: {
    calle: { label: 'Calle' },
    banador: { label: 'Bañador', outfit: { sleeves: 'none', bottom: 'shorts', socks: 'none', shoes: 'descalzo', jacket: null, print: null }, colors: { top: '#1d5fbf', bottom: '#1d5fbf' } },
    judogi: { label: 'Judogi', outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'descalzo', jacket: null, print: null }, colors: { top: '#f2f2ee', bottom: '#f2f2ee' } },
  },
  packs: { natacion: 'banador', pelea: 'judogi' },
};

describe('filas', () => {
  it('traduce filas a vistas y avisa si una no existe o se repite', () => {
    expect(viewsForRows(FIVE)).toEqual(['side', 'se', 'ne', 'front', 'back']);
    expect(ROW_NAMES).toHaveLength(8);
    expect(() => viewsForRows(['right', 'izquierda'])).toThrow(/izquierda/);
    expect(() => viewsForRows(['right', 'right'])).toThrow(/repetidas/);
  });
});

describe('datos por cuadro', () => {
  const runs: [HumanFicha, CellSize, string][] = [];
  for (const id of ['rick', 'alana'] as const) for (const cell of [32, 48, 64] as const) for (const a of ['idle', 'walk', 'run', 'punch', 'kick', 'throw']) runs.push([premium(id), cell, a]);
  // y una animación clásica (sin perfil premium) también trae articulaciones
  runs.push([familyFicha('rick', false), 48, 'walk']);

  it('cajas encierra todo pixel opaco y nada más (el recuadro justo)', () => {
    for (const [f, cell, a] of runs) {
      const clips = viewsForRows(FIVE).map((v) => renderClip(f, cell, a, v, { props: true }));
      const { cajas } = frameDataOf(clips, ['cajas']);
      clips.forEach((c, r) => c.frames.forEach((fr, i) => {
        const box = cajas![r][i];
        const b = opaqueBox(fr);
        if (!b) { expect(box).toBeNull(); return; }
        const [x, y, w, h] = box!.map((v, k) => v + (k === 0 ? cell / 2 : k === 1 ? cell - 2 : 0));
        for (let yy = 0; yy < fr.h; yy++) for (let xx = 0; xx < fr.w; xx++) {
          if (alpha(fr, xx, yy)) expect(xx >= x && xx < x + w && yy >= y && yy < y + h, `${a} ${cell} ${FIVE[r]} ${i}`).toBe(true);
        }
        // justo: cada borde del recuadro toca un pixel opaco
        const row = (yy: number) => Array.from({ length: w }, (_, k) => alpha(fr, x + k, yy)).some(Boolean);
        const col = (xx: number) => Array.from({ length: h }, (_, k) => alpha(fr, xx, y + k)).some(Boolean);
        expect(row(y) && row(y + h - 1) && col(x) && col(x + w - 1), `${a} ${cell} ${FIVE[r]} ${i}`).toBe(true);
      }));
    }
  }, 120_000);

  it('manos, cabeza y pies caen sobre pixeles opacos en todas las filas, y la mano visible cae sobre la mano', () => {
    let seen = 0, onHand = 0;
    for (const [f, cell, a] of runs) {
      const clips = viewsForRows(FIVE).map((v) => renderClip(f, cell, a, v, { props: true }));
      const d = frameDataOf(clips, ['manos', 'cabeza', 'pies']);
      expect(d.manos && d.cabeza && d.pies).toBeTruthy();
      const skin = new Set(f.palette.skin.map((c) => c.toLowerCase()));
      const at = ([x, y]: [number, number]): [number, number] => [x + cell / 2, y + cell - 2];
      clips.forEach((c, r) => c.frames.forEach((fr, i) => {
        const tag = `${f.name} ${a} ${cell} ${FIVE[r]} ${i}`;
        for (const p of [...d.manos![r][i], d.cabeza![r][i], ...d.pies![r][i]]) expect(alpha(fr, ...at(p)), tag).toBeGreaterThan(0);
        // de lado y de frente la mano cercana se ve: cae sobre piel (o a un pixel de la piel, en el borde de la mano)
        if (FIVE[r] !== 'right' && FIVE[r] !== 'down') return;
        const [hx, hy] = at(d.manos![r][i][0]);
        seen++;
        let ok = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (alpha(fr, hx + dx, hy + dy) && skin.has(hex(fr, hx + dx, hy + dy))) ok = true;
        if (ok) onHand++;
      }));
    }
    // las pocas que no: la mano en guardia queda detrás de la barba, o sostiene la pelota
    expect(onHand / seen).toBeGreaterThan(0.97);
  }, 120_000);

  it('una vista espejo trae las articulaciones espejadas', () => {
    const f = premium('rick');
    const r = renderClip(f, 48, 'punch', 'side', { props: true }), l = renderClip(f, 48, 'punch', 'left', { props: true });
    expect(l.joints).toBeTruthy();
    r.joints!.forEach((j, i) => expect(l.joints![i].handNear[1]).toBe(j.handNear[1]));
  });
});

describe('atlas', () => {
  it('acomoda los cuadros en grilla con su nombre y su pivote, sin pasar de 4096', () => {
    const cell = 48;
    const frames = Array.from({ length: 30 }, (_, i) => {
      const r = createRaster(cell, cell);
      r.data[((i % cell) * cell + 3) * 4 + 3] = 255;
      return { name: atlasFrameName('walk', 'right', i), raster: r };
    });
    const { png, json } = packAtlas(frames, cell, 'base.png', [24, 46]);
    expect(Object.keys(json.frames)).toEqual(frames.map((f) => f.name));
    expect(json.frames.walk_right_7.pivot).toEqual({ x: 0.5, y: 46 / 48 });
    expect(json.meta).toMatchObject({ image: 'base.png', size: { w: png.w, h: png.h } });
    for (const [i, f] of frames.entries()) {
      const { x, y } = json.frames[f.name].frame;
      expect(alpha(png, x + 3, y + (i % cell))).toBe(255);
    }
    expect(atlasGrid(7225, 48).cols * 48).toBeLessThanOrEqual(MAX_ATLAS);
    expect(() => packAtlas(Array.from({ length: 7300 }, (_, i) => ({ name: `a_${i}`, raster: createRaster(48, 48) })), 48, 'x.png', [24, 46])).toThrow(/4096/);
    expect(() => packAtlas([frames[0], frames[0]], 48, 'x.png', [24, 46])).toThrow(/repetido/);
  });
});

describe('retratos y cabecitas', () => {
  it('8 expresiones en 40 y en 96; el grande es cabeza y hombros escalado x3 entero', () => {
    const f = premium('rick');
    const s = portraitSheet(f);
    expect(s.expresiones).toEqual([...EXPRESSIONS]);
    expect([s.png.w, s.png.h]).toEqual([EXPRESSIONS.length * 96, 40 + 96]);
    const small = EXPRESSIONS.map((e) => portrait(f, e, 'chico'));
    for (const p of small) { expect([p.w, p.h]).toEqual([40, 40]); expect(opaqueBox(p)).not.toBeNull(); }
    // cada expresión cambia la cara
    expect(new Set(small.map((p) => p.data.join(','))).size).toBe(EXPRESSIONS.length);
    const big = portrait(f, 'feliz', 'grande');
    expect([big.w, big.h]).toEqual([96, 96]);
    const k = PORTRAIT_BIG_SCALE;
    for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) for (let q = 0; q < 4; q++) {
      expect(big.data[(y * 96 + x) * 4 + q]).toBe(big.data[((y - y % k) * 96 + x - x % k) * 4 + q]);
    }
  });

  it('cabecita de 12 x 12, distinta para cada uno y sin colores inventados', () => {
    const icons = (['rick', 'steph', 'sophie', 'alana'] as const).map((id) => headIcon(premium(id)));
    for (const r of icons) expect([r.w, r.h]).toEqual([12, 12]);
    expect(new Set(icons.map((r) => r.data.join(','))).size).toBe(4);
    // cada color sale del retrato grande (la reducción no mezcla)
    const f = premium('rick'), src = portrait(f, 'neutral', 'chico'), colors = new Set<string>();
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (alpha(src, x, y)) colors.add(hex(src, x, y));
    const icon = headIcon(f);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (alpha(icon, x, y)) expect(colors.has(hex(icon, x, y))).toBe(true);
  });
});

describe('vestuario por pack', () => {
  it('la ficha valida sus variantes y cada pack se viste con la suya', () => {
    const f: HumanFicha = { ...premium('rick'), wardrobe: WARDROBE };
    expect(validateFicha(f)).toEqual([]);
    expect(validateFicha({ ...f, wardrobe: { variants: { 'Mal Nombre': {} }, packs: { pelea: 'kimono' } } })).toEqual(expect.arrayContaining([
      expect.stringMatching(/Mal Nombre/), expect.stringMatching(/kimono/),
    ]));
    expect(variantNames(f)).toEqual(['calle', 'banador', 'judogi']);
    expect(variantForPack(f, 'pelea')).toBe('judogi');
    expect(variantForPack(f, 'futbol')).toBeNull();
    expect(dressForPack(f, 'futbol')).toBe(f);
    const judo = dressForPack(f, 'pelea');
    expect(judo.outfit.sleeves).toBe('long');
    expect(judo.palette.top).not.toEqual(f.palette.top);
    expect(judo.palette.skin).toEqual(f.palette.skin);
  });

  it('cada variante pasa el control de calidad en las 5 filas', () => {
    const f: HumanFicha = { ...premium('rick'), wardrobe: WARDROBE };
    for (const [pack, cell] of [['pelea', 48], ['natacion', 32], ['natacion', 64]] as const) {
      const { qa, missing } = renderPlan(dressForPack(f, pack), { cell, anims: [...SPORT_PACKS[pack]], views: viewsForRows(FIVE), props: true });
      expect(missing).toEqual([]);
      expect(qa.filter((r) => !r.ok).map((r) => `${pack} ${cell} ${r.clip}`)).toEqual([]);
    }
  }, 300_000);
});

describe('kit deportivo con las opciones nuevas', () => {
  it('filas, datos, atlas, retratos, cabecitas y vestuario', () => {
    const rick: HumanFicha = { ...premium('rick'), wardrobe: WARDROBE };
    const files = buildSportsKit({ athletes: { rick, alana: premium('alana') }, packs: ['pelea', 'natacion'], quick: true, filas: FIVE, datos: true, atlas: true, retratos: true, cabecitas: true });
    const byName = new Map(files.map((f) => [f.name, f]));
    const m = dec(byName.get('manifest.json')!.bytes);
    expect(m.filas).toEqual(FIVE);
    expect(m.direcciones).toEqual(FIVE);
    const a = m.atletas.rick;
    expect(a.deportes).toBeUndefined();
    expect(a.vestuario).toEqual({ pelea: 'judogi', natacion: 'banador' });
    expect(m.atletas.alana.vestuario).toBeUndefined();
    expect(a.retratos).toMatchObject({ archivo: 'atletas/rick/retratos.png', chico: 40, grande: 96, expresiones: [...EXPRESSIONS] });
    expect(a.cabecita).toBe('ui/cabecitas.png#rick');
    expect(m.cabecitas).toEqual({ archivo: 'ui/cabecitas.png', celda: 12, orden: ['rick', 'alana'] });
    expect([decodePng(byName.get('ui/cabecitas.png')!.bytes).w, decodePng(byName.get('ui/cabecitas.png')!.bytes).h]).toEqual([24, 12]);
    for (const pack of ['pelea', 'natacion']) {
      const p = a.packs[pack];
      expect(p.atlas).toBe(`atletas/rick/${pack}.json`);
      const atlas = dec(byName.get(p.atlas)!.bytes);
      const img = decodePng(byName.get(p.imagen)!.bytes);
      expect(Math.max(img.w, img.h)).toBeLessThanOrEqual(4096);
      for (const [name, e] of Object.entries(p.anims) as [string, { cuadros: number; archivo?: string; cajas: unknown[][]; manos: unknown[][]; cabeza: unknown[][]; pies: unknown[][]; eventos?: { punto?: unknown[] }[] }][]) {
        expect(e.archivo).toBeUndefined();
        for (const row of FIVE) for (let i = 0; i < e.cuadros; i++) expect(atlas.frames[`${name}_${row}_${i}`], `${name}_${row}_${i}`).toBeTruthy();
        for (const k of ['cajas', 'manos', 'cabeza', 'pies'] as const) {
          expect(e[k]).toHaveLength(5);
          for (const row of e[k]) expect(row).toHaveLength(e.cuadros);
        }
        // punto en todas las filas pedidas
        for (const ev of e.eventos ?? []) if (ev.punto) expect(ev.punto).toHaveLength(5);
      }
    }
    const puntos = Object.values(a.packs.pelea.anims).flatMap((e) => (e as { eventos?: { punto?: unknown }[] }).eventos ?? []).filter((e) => e.punto);
    expect(puntos.length).toBeGreaterThan(0);
  }, 120_000);

  it('sin las opciones nuevas sale igual que antes; pedir las 8 filas en su orden solo agrega `filas` al manifest', () => {
    const athletes = { rick: premium('rick') };
    const base = buildSportsKit({ athletes, packs: ['pelea'], quick: true });
    const eight = buildSportsKit({ athletes, packs: ['pelea'], quick: true, filas: EIGHT_VIEWS.map((v) => VIEW_SUFFIX[v]) });
    const m = dec(base.find((f) => f.name === 'manifest.json')!.bytes);
    for (const k of ['filas', 'cabecitas', 'retratos']) expect(m[k]).toBeUndefined();
    for (const k of ['packs', 'vestuario', 'retratos', 'cabecita']) expect(m.atletas.rick[k]).toBeUndefined();
    for (const e of Object.values(m.atletas.rick.deportes.pelea) as Record<string, unknown>[]) for (const k of ['cajas', 'manos', 'cabeza', 'pies']) expect(e[k]).toBeUndefined();
    expect(eight.map((f) => f.name)).toEqual(base.map((f) => f.name));
    for (const [i, f] of base.entries()) {
      if (f.name === 'manifest.json') { const { filas, ...rest } = dec(eight[i].bytes); expect(filas).toHaveLength(8); expect(rest).toEqual(m); }
      else expect(eight[i].bytes, f.name).toEqual(f.bytes);
    }
  }, 120_000);

  it('el kit del juego también exporta solo las filas pedidas', () => {
    const files = buildGameKit({ heroes: [], enemies: [], thorTiers: [], quick: true, fichas: { rick: premium('rick') }, filas: FIVE });
    const m = dec(files.find((f) => f.name === 'manifest.json')!.bytes);
    expect(m.direcciones).toEqual(FIVE);
    const walk = decodePng(files.find((f) => f.name === m.personajes.rick.anims.walk.archivo)!.bytes);
    expect(walk.h).toBe(5 * 48);
    // el rumbo y los puntos traen una entrada por fila pedida
    for (const e of m.personajes.rick.anims.attack.eventos) if (e.punto) expect(e.punto).toHaveLength(5);
  }, 180_000);
});
