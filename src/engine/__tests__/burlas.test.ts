import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, renderHuman, runQA, viewsForRows, migrateFicha, standPose, merge, type HumanFicha, type CellSize, type Raster, type Pose } from '../index';
import { BURLAS } from '../anim/burlas';
import { motionOf8 } from '../export/motion';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';
import { ROOT } from './helpers';

const EJ = join(ROOT, 'docs', 'ejemplos', 'nekketsu');
const CFG = JSON.parse(readFileSync(join(EJ, 'kit.config.json'), 'utf8')) as KitConfig;
const EQUIPOS = JSON.parse(readFileSync(join(EJ, 'equipos.json'), 'utf8')) as Record<string, { atletas: string[] }>;
const ficha = (id: string) => ({ ...(migrateFicha(JSON.parse(readFileSync(join(EJ, 'fichas', `${id}.ficha.json`), 'utf8'))) as HumanFicha), movementProfile: 'premium' as const });
const cellOf = (f: HumanFicha): CellSize => (f.cell ?? 48) as CellSize;
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const opacos = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i]) n++; return n; };
const igual = (a: Raster, b: Raster) => a.w === b.w && a.h === b.h && a.data.every((v, i) => v === b.data[i]);
const caja = (r: Raster) => {
  let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
};

describe('las burlas por equipo (lote C5)', () => {
  it('seis burlas sin bucle, de 6 a 8 cuadros a 8 fps, con la frase en el gesto fuerte', () => {
    expect(BURLAS.map((a) => a.name)).toEqual(['burla_pulgar', 'burla_bruce_lee', 'burla_dragon', 'burla_risa_tapada', 'burla_salsa', 'burla_hombros']);
    const f = ficha('rick');
    for (const a of BURLAS) {
      expect(a.loop, a.name).toBe(false);
      expect(a.fps, a.name).toBe(8);
      // las mismas filas que laugh y point: ninguna se limita a algunas vistas
      expect(a.views, a.name).toBeUndefined();
      const clips = viewsForRows(FIVE).map((v) => renderClip(f, 48, a.name, v));
      const n = clips[0].frames.length;
      expect(n, a.name).toBeGreaterThanOrEqual(6);
      expect(n, a.name).toBeLessThanOrEqual(8);
      const ev = motionOf8(clips).eventos!.filter((e) => e.tipo === 'frase');
      expect(ev, a.name).toHaveLength(1);
      // el gesto fuerte no es el primer cuadro y se ve distinto del de arranque
      expect(ev[0].cuadro, a.name).toBeGreaterThan(0);
      expect(igual(clips[0].frames[ev[0].cuadro], clips[0].frames[0]), a.name).toBe(false);
    }
  });

  it('la mano cambia la silueta: el pulgar sale arriba del puño, el dedo hacia adelante', () => {
    const f = ficha('rick');
    const pose = (hands?: Pose['hands'], arm = { shoulder: 50, elbow: 80 }): Pose => merge(standPose(8), { arms: { near: arm, far: { shoulder: 10, elbow: 10 } }, ...(hands ? { hands } : {}) });
    const sin = renderHuman(f, 48, pose(), 'side').raster, con = renderHuman(f, 48, pose({ near: 'pulgar' }), 'side').raster;
    expect(opacos(con)).toBeGreaterThan(opacos(sin));
    const dedoSin = renderHuman(f, 48, pose(undefined, { shoulder: 90, elbow: 0 }), 'side').raster;
    const dedo = renderHuman(f, 48, pose({ near: 'dedo' }, { shoulder: 90, elbow: 0 }), 'side').raster;
    expect(caja(dedo)[2]).toBeGreaterThan(caja(dedoSin)[2]);
  });

  it('las 24 burlas (cada atleta con la de su equipo) pasan el control de calidad en las 5 filas', () => {
    const bad: string[] = [];
    for (const [eq, t] of Object.entries(EQUIPOS)) {
      const anim = CFG.alias![`burla_${eq}`];
      expect(anim, eq).toBeTruthy();
      for (const id of t.atletas) {
        const f = ficha(id);
        for (const v of viewsForRows(FIVE)) {
          const c = renderClip(f, cellOf(f), anim, v, { props: true });
          const qa = runQA(f, c);
          if (!qa.ok) bad.push(`${id} ${anim} ${v}: ${qa.items.filter((i) => i.severity !== 'ok').map((i) => `${i.check} ${i.value} ${i.where ?? ''}`).join(', ')}`);
          if (c.frames.some((fr) => opacos(fr) < 60)) bad.push(`${id} ${anim} ${v}: un cuadro vacío`);
        }
      }
    }
    expect(bad).toEqual([]);
  }, 900_000);

  it('alias en el kit: sale con el nombre del juego y cada atleta trae solo la de su equipo', () => {
    const cfg: KitConfig = {
      juego: 'Prueba', personajes_incluidos: ['familia'], filas: FIVE, packs: { burlas: ['burla_pulgar', 'burla_bruce_lee'] },
      alias: { burla_familia_gg: 'burla_pulgar', burla_rivales: 'burla_bruce_lee' },
    };
    expect(validateKitConfig(cfg)).toEqual([]);
    const equipos = { familia_gg: { nombre: 'Familia GG', atletas: ['rick', 'steph'] }, rivales: { nombre: 'Rivales', atletas: ['sophie', 'alana'] } };
    const { files } = buildCustomKit(cfg, { equipos }, { quick: true, solo: ['atletas'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    expect(Object.keys(m.atletas.rick.packs.burlas.anims)).toEqual(['burla_familia_gg']);
    expect(Object.keys(m.atletas.alana.packs.burlas.anims)).toEqual(['burla_rivales']);
    expect(m.atletas.rick.packs.burlas.anims.burla_familia_gg.eventos.map((e: { tipo: string }) => e.tipo)).toContain('frase');
    const atlas = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'atletas/rick/burlas.json')!.bytes));
    expect(Object.keys(atlas.frames).every((k) => k.startsWith('burla_familia_gg_'))).toBe(true);
  });

  it('alias mal puestos (a algo que no existe, con el nombre de una del motor, fuera de los packs) y uno que se repite', () => {
    const base = { juego: 'Prueba', personajes_incluidos: ['familia'] };
    expect(validateKitConfig({ ...base, packs: { b: ['burla_pulgar'] }, alias: { burla_x: 'burla_pulgr' } }).join()).toMatch(/alias\.burla_x: "burla_pulgr" no es una animación del motor.*burla_pulgar/);
    expect(validateKitConfig({ ...base, packs: { b: ['idle'] }, alias: { burla_x: 'burla_pulgar' } }).join()).toMatch(/alias\.burla_x: "burla_pulgar" no está en ningún pack/);
    expect(validateKitConfig({ ...base, packs: { b: ['idle'] }, alias: { idle: 'burla_pulgar' } }).join()).toMatch(/alias\.idle: ya es una animación del motor/);
    expect(validateKitConfig({ ...base, packs: { b: ['burla_familia'] } }).join()).toMatch(/packs\.b\[0\]: "burla_familia" no es una animación/);
    // la misma animación con dos nombres (dos equipos con el mismo gesto) sale dos veces
    const { files } = buildCustomKit({ ...base, filas: ['right'], packs: { b: ['burla_salsa'] }, alias: { burla_uno: 'burla_salsa', burla_dos: 'burla_salsa' } } as KitConfig, {}, { quick: true, solo: ['atletas'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    expect(Object.keys(m.atletas.rick.packs.b.anims)).toEqual(['burla_uno', 'burla_dos']);
  });
});
