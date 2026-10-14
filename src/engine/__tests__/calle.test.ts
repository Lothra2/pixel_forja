import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, runQA, migrateFicha, validateFicha, createRaster, blit, encodePng, decodePng, type HumanFicha, type Ficha } from '../index';
import { CALLE } from '../anim/calle';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';
import { npcTira, pelotaTira } from '../kit/npc';
import { ROOT } from './helpers';

const DIR = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'npc');
const RAW = Object.fromEntries(readdirSync(DIR).filter((n) => n.endsWith('.ficha.json')).map((n) => [n.replace('.ficha.json', ''), JSON.parse(readFileSync(join(DIR, n), 'utf8'))]));
const FICHAS = Object.fromEntries(Object.entries(RAW).map(([k, v]) => [k, migrateFicha(v) as HumanFicha])) as Record<string, HumanFicha>;
const CFG = JSON.parse(readFileSync(join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'kit.config.json'), 'utf8')) as KitConfig;
const MIN: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] } };

/** Lo que acordamos con el juego para C6a: cuadros, fps, bucle y eventos. */
const PEDIDO: Record<string, [number, number, boolean, string[]]> = {
  toprock: [8, 10, true, []], molino: [8, 12, true, []], reclama: [4, 8, false, []],
  espera: [4, 6, true, []], patear: [5, 12, false, ['impacto']], perdon: [4, 8, false, []],
  pintar: [6, 8, true, []], mirar: [3, 6, false, []],
  rapear: [8, 8, true, []], tamborear: [8, 8, true, []], animar: [4, 8, false, []],
  llamar: [4, 8, true, []], ofrecer: [3, 8, false, []],
};

describe('la gente de la calle (lote C6a)', () => {
  it('están las 13 animaciones con sus cuadros, fps, bucle y eventos', () => {
    expect(CALLE.map((a) => a.name).sort()).toEqual(Object.keys(PEDIDO).sort());
    const f = { ...FICHAS.bailarin_1, movementProfile: 'premium' as const };
    for (const a of CALLE) {
      const [n, fps, loop, ev] = PEDIDO[a.name];
      const c = renderClip(f, 48, a.name, 'front', { props: true });
      expect([c.frames.length, c.fps, c.loop], a.name).toEqual([n, fps, loop]);
      expect((a.events ?? []).map((e) => e.type), a.name).toEqual(ev);
    }
  });

  it('las fichas de NPC son válidas (las 9 de la Comuna 13 y la Marimonda), y los pelados son más bajitos que los adultos', () => {
    for (const [id, r] of Object.entries(RAW)) expect(validateFicha(r), id).toEqual([]);
    const alto = (id: string) => { const fr = renderClip({ ...FICHAS[id], movementProfile: 'premium' }, 48, 'idle', 'front').frames[0]; let top = fr.h; for (let i = 3; i < fr.data.length; i += 4) if (fr.data[i]) { top = Math.min(top, Math.floor((i - 3) / 4 / fr.w)); } return fr.h - top; };
    for (const p of ['pelado_1', 'pelado_2']) for (const a of ['bailarin_1', 'vendedor_paletas', 'rapero']) expect(alto(p), `${p} vs ${a}`).toBeLessThan(alto(a));
  });

  it('cada NPC del kit de Nekketsu pasa el control de calidad en su vista, en todas sus animaciones', () => {
    const bad: string[] = [];
    const vista = { frente: 'front', tres_cuartos: 'se', espalda: 'back', espalda_tres_cuartos: 'ne', lado: 'side' } as const;
    for (const [id, d] of Object.entries(CFG.npc!.personajes)) {
      // las animaciones van en lista, o como { nombre en el juego: animación del motor } (la Marimonda del lote E5)
      const pares = d.grupo ? Object.entries(d.grupo).flatMap(([fid, m]) => Object.entries(m).map(([n, a]) => [fid, n, a])) : Array.isArray(d.anims) ? d.anims.map((a) => [d.ficha ?? id, a, a]) : Object.entries(d.anims ?? {}).map(([n, a]) => [d.ficha ?? id, n, a]);
      for (const [fid, nombre, a] of pares) {
        const c = renderClip({ ...FICHAS[fid], movementProfile: 'premium' }, 48, a, vista[d.vistas?.[nombre] ?? d.vista ?? 'frente'], { props: true });
        for (const it of runQA(FICHAS[fid] as Ficha, c).items) if (it.severity === 'error') bad.push(`${id}/${fid} ${a}: ${it.check} ${it.value} ${it.where ?? ''}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('el molino gira: el cuerpo pasa por arriba (los pies quedan arriba de la cabeza en algún cuadro)', () => {
    const c = renderClip({ ...FICHAS.bailarin_2, movementProfile: 'premium' }, 48, 'molino', 'front', { props: true });
    const alturas = c.frames.map((fr) => { let n = 0; for (let i = 3; i < fr.data.length; i += 4) if (fr.data[i]) n++; return n; });
    expect(Math.min(...alturas)).toBeGreaterThan(80);
    // los cuadros cambian todos
    for (let i = 1; i < c.frames.length; i++) expect(Buffer.from(c.frames[i].data).equals(Buffer.from(c.frames[i - 1].data))).toBe(false);
  });

  it('la sección npc del kit: una tira por NPC con su ancla, sus animaciones seguidas, la patada y la pelota', () => {
    const { files, warnings } = buildCustomKit({ ...MIN, npc: CFG.npc }, { npc: FICHAS }, { quick: true, solo: ['npc'] });
    expect(warnings.filter((w) => w.startsWith('npc'))).toEqual([]);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes)).npc;
    expect(Object.keys(m).sort()).toEqual(['bailarin_1', 'bailarin_2', 'bailarin_3', 'grafitero', 'marimonda', 'musicos', 'notas', 'palenquera', 'pelado_1', 'pelado_2', 'pelota', 'vendedor_paletas']);
    expect(m.bailarin_1).toMatchObject({ archivo: 'npc/bailarin_1.png', w: 48, h: 48, ancla: [24, 46], cuadros: 20, anims: { toprock: { desde: 0, cuadros: 8, loop: true }, molino: { desde: 8, cuadros: 8 }, reclama: { desde: 16, cuadros: 4, loop: false } } });
    expect(m.pelado_1.eventos).toEqual({ patear: [{ tipo: 'impacto', cuadro: 2 }] });
    expect(m.grafitero.anims.pintar.vista).toBe('espalda_tres_cuartos');
    expect(m.vendedor_paletas.anims.llamar.vista).toBe('tres_cuartos');
    expect(m.musicos).toMatchObject({ grupo: ['rapero', 'percusionista'], anims: { tocar: { cuadros: 8, fps: 8, loop: true }, animar: { cuadros: 4 } } });
    expect(m.musicos.w).toBeGreaterThan(48 * 2);
    expect(m.pelota).toMatchObject({ w: 8, h: 8, cuadros: 4, anims: { girar: { cuadros: 4, loop: true } } });
    for (const [id, e] of Object.entries<{ archivo: string; w: number; h: number; cuadros: number }>(m)) {
      if (id === 'notas') continue;
      const png = decodePng(files.find((f) => f.name === e.archivo)!.bytes);
      expect([png.w, png.h], id).toEqual([e.w * e.cuadros, e.h]);
    }
  });

  it('valida la sección npc con sugerencias, y una ficha que falta se salta con aviso', () => {
    expect(validateKitConfig({ ...MIN, npc: { personajes: { x: { anims: ['toprok'], vista: 'frentee' as never } } } })).toEqual([
      'npc.personajes.x: la vista "frentee" no existe. ¿Quisiste decir "frente"? Hay frente, tres_cuartos, espalda, espalda_tres_cuartos, lado',
      'npc.personajes.x: "toprok" no es una animación. ¿Quisiste decir "toprock"?',
    ]);
    const { warnings } = buildCustomKit({ ...MIN, npc: { personajes: { fantasma: { anims: ['toprock'] } } } }, { npc: FICHAS }, { quick: true, solo: ['npc'] });
    expect(warnings).toContain('npc.fantasma: no hay ficha "fantasma" en la carpeta de NPC (se salta)');
  });

  it('imagen dorada: las tiras de los NPC y la pelota', () => {
    // los NPC de la Comuna 13 (la Marimonda del lote E5 y la palenquera del E6 tienen su imagen dorada en e5 y e6.test.ts)
    const tiras = Object.entries(CFG.npc!.personajes).filter(([id]) => id !== 'marimonda' && id !== 'palenquera').map(([id, d]) => (npcTira(id, d, FICHAS, 48) as { tira: ReturnType<typeof pelotaTira> }).tira);
    tiras.push(pelotaTira());
    const out = createRaster(Math.max(...tiras.map((t) => t.w)), tiras.reduce((s, t) => s + t.h, 0));
    let y = 0;
    for (const t of tiras) { blit(out, t, 0, y); y += t.h; }
    const file = join(ROOT, 'golden', 'npc_c6a.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_npc_c6a.png'), encodePng(out)); }
    expect(same, 'cambió npc_c6a; mira out/golden_actual_npc_c6a.png').toBe(true);
  });
});
