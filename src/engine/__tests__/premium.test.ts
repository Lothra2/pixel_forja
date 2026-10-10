import { describe, it, expect } from 'vitest';
import { familyFicha, renderPlan, renderClip, posesFor, EIGHT_VIEWS, migrateFicha, FICHA_VERSION, exportFiles, type HumanFicha, type CellSize, type ExportPlan } from '../index';
import { buildGameKit } from '../kit/gamekit';
import { PREMIUM } from '../anim/premium';
import { ATHLETICS_PREMIUM } from '../anim/athletics';

const premium = (id: 'rick' | 'steph' | 'sophie' | 'alana', rpg = true): HumanFicha => ({ ...familyFicha(id, rpg), movementProfile: 'premium' });
const ATH = ATHLETICS_PREMIUM.map((a) => a.name);
// las de héroe (con espada y escudo); el atletismo se prueba con ropa de calle
const NAMES = PREMIUM.map((a) => a.name).filter((n) => !ATH.includes(n));

describe('movimiento premium', () => {
  it('toda la familia pasa el control de calidad en 8 direcciones a 48 px (y Rick también a 32 y 64)', () => {
    const runs: [HumanFicha, CellSize][] = [
      [premium('rick'), 48], [premium('steph'), 48], [premium('sophie'), 48], [premium('alana'), 48], [premium('rick'), 32], [premium('rick'), 64],
    ];
    for (const [f, cell] of runs) {
      const { qa, missing } = renderPlan(f, { cell, anims: NAMES, views: EIGHT_VIEWS, props: true });
      expect(missing, f.name).toEqual([]);
      expect(qa.filter((r) => !r.ok).map((r) => `${f.name} ${cell} ${r.clip}`)).toEqual([]);
    }
  }, 300_000);

  it('el pivote no se mueve entre acciones: el pie de apoyo queda en el centro de la celda', () => {
    const f = premium('rick');
    for (const a of NAMES) {
      const c = renderClip(f, 48, a, 'side', { props: true });
      expect(c.profile, a).toBe('premium');
      // la cadera del primer cuadro (todas empiezan de pie) cae en la columna del pivote
      expect(Math.abs(c.joints![0].hip[0] - 24), a).toBeLessThanOrEqual(2);
    }
  });

  it('caminar y correr traen pasos y cuánto avanzan sin patinar; atacar y bloquear traen el golpe', () => {
    const f = premium('rick');
    const walk = renderClip(f, 48, 'walk', 'side');
    expect(walk.events?.filter((e) => e.type === 'paso')).toHaveLength(2);
    expect(walk.stride).toBeGreaterThan(6);
    const run = renderClip(f, 48, 'run', 'side');
    expect(run.stride).toBeGreaterThan(walk.stride!);
    expect(renderClip(f, 48, 'attack', 'side').events?.[0]).toMatchObject({ type: 'impacto' });
    expect(renderClip(f, 48, 'block_shield', 'side').events?.[0]).toMatchObject({ type: 'impacto' });
    // hechizo y poción sueltan su efecto, morir marca el golpe contra el piso
    expect(renderClip(f, 48, 'cast', 'side').events?.[0]).toMatchObject({ type: 'suelta' });
    expect(renderClip(f, 48, 'use_item', 'side').events?.[0]).toMatchObject({ type: 'suelta' });
    expect(renderClip(f, 48, 'die', 'side').events?.[0]).toMatchObject({ type: 'impacto' });
    expect(renderClip(f, 48, 'attack_heavy', 'side').events?.[0]).toMatchObject({ type: 'impacto' });
    // las articulaciones vienen en coordenadas de la celda, también en las vistas espejo
    for (const v of ['side', 'left'] as const) for (const j of renderClip(f, 48, 'walk', v).joints!) for (const [x, y] of Object.values(j)) {
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(48); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(48);
    }
    const r = renderClip(f, 48, 'walk', 'side').joints![0].hip[0], l = renderClip(f, 48, 'walk', 'left').joints![0].hip[0];
    expect(r + l).toBe(47);
  });

  it('las fichas clásicas quedan igual y las viejas se migran como clásicas', () => {
    const classic = familyFicha('rick', true);
    const a = renderClip(classic, 48, 'walk', 'side'), b = renderClip({ ...classic, movementProfile: 'classic' }, 48, 'walk', 'side');
    expect(a.profile).toBe('classic');
    expect(a.events).toBeUndefined();
    expect(Buffer.from(a.frames[3].data).equals(Buffer.from(b.frames[3].data))).toBe(true);
    // con premium la caminata es otra
    expect(Buffer.from(renderClip(premium('rick'), 48, 'walk', 'side').frames[1].data).equals(Buffer.from(a.frames[1].data))).toBe(false);
    const old = { ...structuredClone(classic), version: 2 } as Record<string, unknown>;
    delete old.movementProfile;
    const m = migrateFicha(old);
    expect(m.version).toBe(FICHA_VERSION);
    expect(m.movementProfile).toBe('classic');
  });

  it('el arma se balancea solo si hay arma corta; sin equipo no aparece ninguna', () => {
    const casual = premium('rick', false);
    expect(posesFor(casual, 48, 'walk').every((p) => !(p.props ?? []).length)).toBe(true);
    const armed = posesFor(premium('rick'), 48, 'walk');
    const angles = armed.map((p) => p.props!.find((q) => q.at === 'handNear')!.angles!.side!);
    expect(new Set(angles).size).toBeGreaterThan(3);
    // el báculo de Steph no baila: va como siempre
    expect(posesFor(premium('steph'), 48, 'walk').every((p) => !p.props?.some((q) => q.angles))).toBe(true);
  });

  it('una animación del editor hecha a 48 px se escala al exportarla a 32 y 64', () => {
    const base = posesFor(familyFicha('rick'), 48, 'idle').slice(0, 2).map((p) => ({ ...p, x: 6, legs: { near: { ...p.legs.near, x: 4 }, far: { ...p.legs.far } } }));
    const f: HumanFicha = { ...familyFicha('rick'), customAnims: [{ name: 'mia', fps: 8, loop: true, inBetweens: 0, keys: base, authoredCell: 48 }] };
    expect(posesFor(f, 48, 'mia')[0].x).toBeCloseTo(6);
    expect(posesFor(f, 64, 'mia')[0].x).toBeCloseTo(8);
    expect(posesFor(f, 32, 'mia')[0].legs.near.x).toBeCloseTo(4 * 32 / 48);
  });

  it('los exportadores llevan el perfil, los pasos, el golpe y el avance; los clásicos no cambian', () => {
    const text = (b: Uint8Array) => JSON.parse(new TextDecoder().decode(b));
    const plan: ExportPlan = { cell: 48, anims: ['walk', 'attack'], views: ['side'], props: true };
    const sheet = exportFiles(premium('rick'), 'sheet', plan);
    const sj = text(sheet.find((f) => f.name.endsWith('_48.json'))!.bytes);
    expect(sj.perfil_movimiento).toBe('premium');
    expect(sj.anims.walk.eventos.map((e: { tipo: string; cuadro: number }) => [e.tipo, e.cuadro])).toEqual([['paso', 0], ['paso', 4]]);
    expect(sj.anims.walk.avance).toBeGreaterThan(6);
    expect(sj.anims.attack.eventos[0]).toMatchObject({ tipo: 'impacto', cuadro: 3 });
    // hoja agrandada: el avance se mide en pixeles de esa hoja
    const x2 = text(exportFiles(premium('rick'), 'sheet', { ...plan, scale: 2 }).find((f) => f.name.endsWith('.json') && !f.name.includes('movimiento'))!.bytes);
    expect(x2.anims.walk.avance).toBeCloseTo(sj.anims.walk.avance * 2, 1);
    // los formatos sin lugar para eso llevan el archivo de movimiento al lado, con articulaciones por cuadro
    for (const kind of ['aseprite', 'godot', 'gif', 'frames'] as const) {
      const mov = exportFiles(premium('rick'), kind, plan).find((f) => f.name.endsWith('.movimiento.json'));
      expect(mov, kind).toBeDefined();
      const m = text(mov!.bytes);
      expect(m.anims.walk.articulaciones).toHaveLength(m.anims.walk.cuadros);
    }
    // clásico: sin perfil ni archivo extra
    const classic = exportFiles(familyFicha('rick', true), 'sheet', plan);
    expect(classic.some((f) => f.name.includes('movimiento'))).toBe(false);
    const cj = text(classic.find((f) => f.name.endsWith('_48.json'))!.bytes);
    expect(cj.perfil_movimiento).toBeUndefined();
    expect(cj.anims.walk.eventos).toBeUndefined();
  });

  it('el kit del juego anota el perfil premium y el avance en el manifiesto', () => {
    const files = buildGameKit({ heroes: [], enemies: [], thorTiers: [], quick: true, fichas: { rick: premium('rick') } });
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    const rick = m.personajes.rick;
    expect(rick.perfil_movimiento).toBe('premium');
    expect(rick.anims.walk.avance).toBeGreaterThan(6);
    expect(rick.anims.walk.eventos).toHaveLength(2);
    expect(rick.anims.attack.eventos[0].tipo).toBe('impacto');
    expect(m.personajes.minotauro.perfil_movimiento).toBeUndefined();
  }, 120_000);

  it('atletismo: toda la familia pasa el control en 8 direcciones y 3 tamaños', () => {
    const casual = (id: 'rick' | 'steph' | 'sophie' | 'alana') => premium(id, false);
    const runs: [HumanFicha, CellSize][] = [
      [casual('rick'), 48], [casual('steph'), 48], [casual('sophie'), 48], [casual('alana'), 48], [casual('rick'), 32], [casual('alana'), 32], [casual('rick'), 64],
    ];
    for (const [f, cell] of runs) {
      const { qa, missing } = renderPlan(f, { cell, anims: ATH, views: EIGHT_VIEWS, props: true });
      expect(missing, f.name).toEqual([]);
      expect(qa.filter((r) => !r.ok).map((r) => `${f.name} ${cell} ${r.clip}`)).toEqual([]);
    }
  }, 600_000);

  it('garrocha y salto largo: el juego recibe la elevación, despegue y aterrizaje; de frente usa la diagonal', () => {
    const f = premium('rick', false);
    const pv = renderClip(f, 48, 'pole_vault', 'side', { props: true });
    expect(Math.max(...pv.rise!)).toBeGreaterThan(30);
    expect(pv.events!.map((e) => e.type)).toEqual(['paso', 'despegue', 'suelta', 'aterriza']);
    // donde aterriza ya no sube
    const land = Math.floor(pv.events!.find((e) => e.type === 'aterriza')!.phase * pv.frames.length);
    expect(pv.rise![land]).toBe(0);
    const lj = renderClip(f, 48, 'long_jump', 'side', { props: true });
    expect(Math.max(...lj.rise!)).toBeGreaterThan(6);
    // de frente se dibuja la diagonal de abajo: los mismos cuadros que se
    const front = renderClip(f, 48, 'pole_vault', 'front', { props: true }), se = renderClip(f, 48, 'pole_vault', 'se', { props: true });
    expect(Buffer.from(front.frames[5].data).equals(Buffer.from(se.frames[5].data))).toBe(true);
    // la bala sale de la mano en el cuadro de la suelta y la jabalina igual
    const sp = renderClip(f, 48, 'shot_put', 'side', { props: true });
    expect(sp.events![0].type).toBe('suelta');
    expect(renderClip(f, 48, 'javelin', 'side', { props: true }).events!.some((e) => e.type === 'suelta')).toBe(true);
  });

  it('la elevación viaja en la hoja y en el archivo de movimiento', () => {
    const files = exportFiles(premium('rick', false), 'sheet', { cell: 48, anims: ['pole_vault'], views: ['side'], props: true });
    const sj = JSON.parse(new TextDecoder().decode(files.find((x) => x.name.endsWith('_48.json'))!.bytes));
    expect(sj.anims.pole_vault.elevacion.length).toBe(sj.anims.pole_vault.frames);
    expect(Math.max(...sj.anims.pole_vault.elevacion)).toBeGreaterThan(30);
  });
});
