import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, runQA, viewsForRows, migrateFicha, createRaster, blit, encodePng, decodePng, type HumanFicha, type CellSize } from '../index';
import { ESPECIALES } from '../anim/especiales';
import { HELD_ANIMS } from '../anim/brawl';
import { motionOf8 } from '../export/motion';
import { frameDataOf } from '../export/frameData';
import { atlasGrid } from '../export/atlas';
import { AMBIENCE_NAMES } from '../audio/ambience';
import { SONIDOS, renderSound } from '../audio/catalogo';
import { RATE } from '../audio/sfx';
import { buildCustomKit, type KitConfig } from '../kit/custom';
import { ROOT } from './helpers';

const IDS = ['rick', 'steph', 'sophie', 'alana', 'kenji', 'ryu', 'goro', 'tetsu'];
const FICHAS = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const ficha = (id: string) => ({ ...(migrateFicha(JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'))) as HumanFicha), movementProfile: 'premium' as const });
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const clips5 = (id: string, a: string) => viewsForRows(FIVE).map((v) => renderClip(ficha(id), 48, a, v, { props: true }));
const mov = (id: string, a: string) => motionOf8(clips5(id, a));

/** Lo pedido en B7H8: cuadros, fps, bucle y eventos. Los súper golpes traen su impacto o su suelta. */
const PEDIDO: Record<string, [number, number, boolean, string[]]> = {
  dunk_big: [12, 14, false, ['despegue', 'impacto', 'aterriza']],
  spike_fuego: [13, 14, false, ['paso', 'despegue', 'impacto', 'aterriza']],
  shuttle_kick_back: [8, 14, false, ['despegue', 'impacto', 'aterriza']],
  shuttle_kick_back_nekketsu: [10, 14, false, ['despegue', 'impacto', 'aterriza']],
  tackle_nekketsu: [10, 14, false, ['despegue', 'impacto', 'aterriza']],
  bat_nekketsu: [10, 14, false, ['impacto']],
  javelin_rayo: [12, 14, false, ['paso', 'impacto', 'suelta']],
  dodge_throw: [6, 14, false, ['suelta']],
  dodge_hit: [6, 12, false, ['aterriza']],
  cap_pitch: [6, 14, false, ['suelta']],
  shuttle_juggle: [8, 12, true, ['impacto', 'impacto']],
  vovinam_scissor: [10, 14, false, ['despegue', 'impacto', 'aterriza']],
  vovinam_scissored: [10, 14, false, ['aterriza']],
};
const SUPER = ['dunk_big', 'spike_fuego', 'shuttle_kick_back_nekketsu', 'tackle_nekketsu', 'bat_nekketsu', 'javelin_rayo', 'vovinam_scissor'];
const NUEVOS = ['parque_tao_dan', 'barrio_caracas', 'dojo_hanoi'];

const ms = (t: number) => Math.round(t * RATE);
const rms = (b: ArrayLike<number>, from = 0, to = b.length) => { let s = 0; for (let i = from; i < to; i++) s += b[i] * b[i]; return Math.sqrt(s / Math.max(1, to - from)); };
function tono(s: Float32Array, f: number, t0: number, t1: number) {
  const w = (2 * Math.PI * f) / RATE, c = 2 * Math.cos(w);
  let a = 0, b = 0;
  for (let i = ms(t0); i < ms(t1); i++) { const x = s[i] + c * a - b; b = a; a = x; }
  return Math.sqrt(a * a + b * b - c * a * b) / (ms(t1) - ms(t0));
}
function banda(s: Float32Array, a: number, b: number) {
  let dentro = 0, total = 0;
  for (let f = 25; f < 8000; f += 25) {
    let e = 0;
    for (let t = 0.05; t < 12; t += 0.5) e += tono(s, f, t, t + 0.1) ** 2;
    total += e; if (f >= a && f < b) dentro += e;
  }
  return dentro / total;
}

describe('súper golpes, Quemado, Chapita, đá cầu, vovinam y tres ambientes (lote B7H8)', () => {
  it('cada animación trae los cuadros, los fps, el bucle y los eventos del pedido', () => {
    expect(ESPECIALES.map((a) => a.name)).toEqual(Object.keys(PEDIDO));
    for (const a of ESPECIALES) {
      const [n, fps, loop, ev] = PEDIDO[a.name];
      expect(renderClip(ficha('rick'), 48, a.name, 'side', { props: true }).frames.length, a.name).toBe(n);
      expect([a.fps, a.loop], a.name).toEqual([fps, loop]);
      expect((a.events ?? []).map((e) => e.type), a.name).toEqual(ev);
    }
  });

  it('los 8 atletas pasan el control de calidad en 32, 48 y 64, en las 5 filas', () => {
    const bad: string[] = [];
    for (const id of IDS) {
      const f = ficha(id);
      const cells: CellSize[] = f.cell ? [f.cell as CellSize] : [32, 48, 64];
      for (const cell of cells) for (const a of ESPECIALES) for (const v of viewsForRows(FIVE)) {
        const r = runQA(f, renderClip(f, cell, a.name, v, { props: true }));
        if (!r.ok) bad.push(`${id} ${cell} ${a.name} ${v}: ${r.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.value}`).join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  }, 900_000);

  it('cada súper golpe trae el cuadro donde sale el golpe, con su punto en las 5 filas', () => {
    for (const a of SUPER) {
      const m = mov('rick', a);
      const e = m.eventos!.find((x) => x.tipo === 'impacto' || x.tipo === 'suelta');
      expect(e, a).toBeDefined();
      expect(e!.punto, a).toHaveLength(5);
    }
  });

  it('los saltos Nekketsu suben más que los normales y vuelven al piso al aterrizar', () => {
    const top = (id: string, a: string) => Math.max(0, ...(mov(id, a).elevacion ?? [0]));
    for (const id of ['rick', 'alana']) {
      expect(top(id, 'spike_fuego'), id).toBeGreaterThan(top(id, 'spike') + 8);
      expect(top(id, 'shuttle_kick_back_nekketsu'), id).toBeGreaterThan(top(id, 'shuttle_kick_back') + 8);
      expect(top(id, 'dunk_big'), id).toBeGreaterThanOrEqual(20);
      for (const a of ['dunk_big', 'spike_fuego', 'shuttle_kick_back', 'shuttle_kick_back_nekketsu', 'tackle_nekketsu', 'vovinam_scissor']) {
        const m = mov(id, a), at = m.eventos!.find((e) => e.tipo === 'aterriza')!.cuadro;
        expect(m.elevacion![at], `${id} ${a}`).toBe(0);
        expect(Math.max(...m.elevacion!.slice(0, at)), `${id} ${a}`).toBeGreaterThan(4);
      }
    }
  });

  it('el batazo Nekketsu da la vuelta completa: girado en el 6 y el 7, y el palo en cada cuadro', () => {
    const c = clips5('kenji', 'bat_nekketsu');
    expect(motionOf8(c).girado).toEqual([false, false, false, false, false, false, true, true, false, false]);
    expect(HELD_ANIMS.bat_nekketsu.default).toBe('broomstick');
    const { arma } = frameDataOf(c, ['arma']);
    for (const fila of arma!) expect(fila.every((x) => x !== null)).toBe(true);
  });

  it('las pelotas salen en objetos con su clase, hasta donde las suelta o le pega', () => {
    const cfg: KitConfig = {
      juego: 'Prueba', personajes_incluidos: ['familia'],
      packs: {
        basket: { anims: ['dunk_big', 'tackle_nekketsu'], sin_props: true },
        beisbol: { anims: ['dodge_throw', 'cap_pitch'], sin_props: true },
        chapita: { anims: ['bat_nekketsu'], sin_props: true },
        futbol: { anims: ['shuttle_juggle', 'shuttle_kick_back_nekketsu'], sin_props: true },
      },
    };
    // (quick deja las dos últimas de cada pack: por eso van de a dos)
    const { files } = buildCustomKit(cfg, {}, { quick: true, solo: ['atletas'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    const p = m.atletas.rick.packs;
    const clases = (an: { objetos?: ({ clase: string }[] | null)[][] }) => an.objetos![0].map((o) => o?.[0]?.clase ?? null);
    expect(clases(p.basket.anims.dunk_big)).toEqual([...Array(7).fill('basquet'), ...Array(5).fill(null)]);
    expect(clases(p.beisbol.anims.dodge_throw)).toEqual([...Array(4).fill('voley'), null, null]);
    expect(clases(p.beisbol.anims.cap_pitch)).toEqual([...Array(4).fill('beisbol'), null, null]);
    expect(clases(p.futbol.anims.shuttle_juggle)).toEqual(Array(8).fill('futbol'));
    expect(p.basket.anims.tackle_nekketsu.objetos).toBeUndefined();
    // el palo no es una pelota: el batazo sale sin objetos y con su girado, también en un pack sin pelotas
    expect(p.chapita.anims.bat_nekketsu.objetos).toBeUndefined();
    expect(p.chapita.anims.bat_nekketsu.girado).toHaveLength(10);
  });

  it('la tijera del vovinam va con su rival cuadro a cuadro y caen juntos', () => {
    for (const id of ['rick', 'alana']) {
      const t = mov(id, 'vovinam_scissor'), r = mov(id, 'vovinam_scissored');
      expect([t.eventos!.length, r.eventos!.length]).toEqual([3, 1]);
      expect(r.eventos![0].cuadro, id).toBe(t.eventos!.find((e) => e.tipo === 'aterriza')!.cuadro);
      // las piernas cierran a la altura del cuello de un atleta de pie: arriba del pecho, abajo de la coronilla
      const e = t.eventos!.find((x) => x.tipo === 'impacto')!, alto = -(e.punto![0][1] - (t.elevacion![e.cuadro] ?? 0));
      expect(alto, id).toBeGreaterThan(12);
      expect(alto, id).toBeLessThan(38);
    }
  });

  it('el dominio del cầu da dos toques por vuelta, uno con cada pie, y la cabeza no sube ni baja', () => {
    const m = mov('sophie', 'shuttle_juggle');
    expect(m.eventos!.map((e) => [e.tipo, e.cuadro])).toEqual([['impacto', 0], ['impacto', 4]]);
  });

  it('los atlas del kit son una grilla pareja: sin recorte, un solo pivote y los cuadros en orden', () => {
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { super: ['dunk_big', 'bat_nekketsu', 'idle'], judo: { anims: ['vovinam_scissor', 'bow'], vestuario: 'judogi' } } };
    const { files } = buildCustomKit(cfg, {}, { quick: true, solo: ['atletas'] });
    const atlas = files.filter((x) => /^atletas\/.*\.json$/.test(x.name));
    expect(atlas.length).toBeGreaterThan(0);
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    for (const f of atlas) {
      const j = JSON.parse(new TextDecoder().decode(f.bytes)), cell = m.celda as number;
      const names = Object.keys(j.frames), { cols } = atlasGrid(names.length, cell);
      expect(j.meta.size.w, f.name).toBe(cols * cell);
      const piv = JSON.stringify(j.frames[names[0]].pivot);
      names.forEach((n, i) => {
        const fr = j.frames[n];
        expect(fr.frame, `${f.name} ${n}`).toEqual({ x: (i % cols) * cell, y: Math.floor(i / cols) * cell, w: cell, h: cell });
        expect([fr.trimmed, fr.rotated], n).toEqual([false, false]);
        expect(fr.spriteSourceSize, n).toEqual({ x: 0, y: 0, w: cell, h: cell });
        expect(JSON.stringify(fr.pivot), n).toBe(piv);
      });
      // el orden: animación por animación como en el manifiesto, fila por fila y cuadro por cuadro
      const [, id, pack] = f.name.match(/^atletas\/([^/]+)\/([^/]+)\.json$/)!;
      const esperado = Object.entries(m.atletas[id].packs[pack].anims as Record<string, { cuadros: number }>)
        .flatMap(([a, an]) => (m.filas as string[]).flatMap((r) => Array.from({ length: an.cuadros }, (_, k) => `${a}_${r}_${k}`)));
      expect(names, f.name).toEqual(esperado);
    }
  });

  it('los tres ambientes nuevos están en el catálogo después de los de antes, van en bucle de 12 s y suenan parejo', () => {
    expect(AMBIENCE_NAMES.slice(19)).toEqual(NUEVOS);
    for (const n of NUEVOS) {
      expect(SONIDOS.ambientes, n).toContain(n);
      const r = renderSound('ambientes', n), s = r.samples;
      expect(r.loop, n).toBe(true);
      expect(s.length, n).toBe(12 * RATE);
      let p = 0, mean = 0; for (const v of s) { p = Math.max(p, Math.abs(v)); mean += v; }
      expect(p, n).toBeCloseTo(0.5, 3);
      expect(Math.abs(mean / s.length), n).toBeLessThan(0.002);
      expect(rms(s), n).toBeGreaterThan(0.045);
      for (let t = 0; t + 0.5 <= 12; t += 0.5) expect(rms(s, ms(t), ms(t + 0.5)), `${n} en ${t} s`).toBeGreaterThan(0.015);
      // el empalme: el salto del final al principio es como cualquier otro
      const saltos: number[] = [];
      for (let i = 1; i < s.length; i++) saltos.push(Math.abs(s[i] - s[i - 1]));
      saltos.sort((a, b) => a - b);
      expect(Math.abs(s[0] - s[s.length - 1]), n).toBeLessThan(saltos[Math.floor(saltos.length * 0.99)]);
      // y se oye en un parlante de teléfono
      expect(banda(s, 150, 6000), n).toBeGreaterThan(0.5);
    }
  }, 300_000);

  it('cada ambiente tiene lo suyo: el toque del cầu en Tao Đàn, la corneta en Caracas y la campana en Hanói', () => {
    const tao = renderSound('ambientes', 'parque_tao_dan').samples, car = renderSound('ambientes', 'barrio_caracas').samples, han = renderSound('ambientes', 'dojo_hanoi').samples;
    expect(tono(tao, 520, 0.9, 0.95)).toBeGreaterThan(tono(tao, 520, 0.4, 0.8) * 2);
    expect(tono(car, 330, 4.45, 4.65)).toBeGreaterThan(tono(car, 330, 3.6, 4.2) * 3);
    expect(tono(han, 196, 0.8, 1.8)).toBeGreaterThan(tono(han, 196, 11, 11.9) * 3);
  });

  it('imagen dorada: un cuadro clave de cada una, Rick de lado en 48', () => {
    const KEY: Record<string, number> = { dunk_big: 6, spike_fuego: 8, shuttle_kick_back: 4, shuttle_kick_back_nekketsu: 5, tackle_nekketsu: 4, bat_nekketsu: 4, javelin_rayo: 3, dodge_throw: 1, dodge_hit: 1, cap_pitch: 3, shuttle_juggle: 0, vovinam_scissor: 4, vovinam_scissored: 6 };
    const out = createRaster(48 * ESPECIALES.length, 48);
    ESPECIALES.forEach((a, i) => blit(out, renderClip(ficha('rick'), 48, a.name, 'side', { props: true, ...(HELD_ANIMS[a.name] ? { held: { kind: HELD_ANIMS[a.name].default } } : {}) }).frames[KEY[a.name]], i * 48, 0));
    const file = join(ROOT, 'golden', 'b7h8.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_b7h8.png'), encodePng(out)); }
    expect(same, 'cambió b7h8; mira out/golden_actual_b7h8.png').toBe(true);
  });
});
