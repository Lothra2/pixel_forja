import { describe, it, expect } from 'vitest';
import { familyFicha, renderPlan, renderClip, posesFor, EIGHT_VIEWS, migrateFicha, FICHA_VERSION, exportFiles, type HumanFicha, type CellSize, type ExportPlan } from '../index';
import { buildGameKit } from '../kit/gamekit';
import { buildSportsKit, SPORT_PACKS } from '../kit/sportskit';
import { heroFicha, heroCell, HEROES } from '../rpg/heroes';
import { PREMIUM } from '../anim/premium';
import { ATHLETICS_PREMIUM } from '../anim/athletics';
import { SWIM_PREMIUM } from '../anim/swim';
import { NET_PREMIUM } from '../anim/net';
import { FIGHT_PREMIUM } from '../anim/fight';
import { FOOTBALL_PREMIUM } from '../anim/footballPremium';

const premium = (id: 'rick' | 'steph' | 'sophie' | 'alana', rpg = true): HumanFicha => ({ ...familyFicha(id, rpg), movementProfile: 'premium' });
const ATH = ATHLETICS_PREMIUM.map((a) => a.name);
const SWIM = SWIM_PREMIUM.map((a) => a.name);
const NET = NET_PREMIUM.map((a) => a.name);
const FIGHT = FIGHT_PREMIUM.map((a) => a.name);
// las de héroe (con espada y escudo); el atletismo se prueba con ropa de calle
const NAMES = PREMIUM.map((a) => a.name).filter((n) => !ATH.includes(n) && !SWIM.includes(n) && !NET.includes(n) && !FIGHT.includes(n));

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

  it('el avance cuenta el vuelo de la carrera: medido en los pixeles, el pie que pisa no patina', () => {
    // se mide en lo dibujado (las articulaciones de la celda), no en las poses: el pie apoyado retrocede en la celda
    // lo mismo que el juego tiene que mover el sprite
    for (const id of ['rick', 'sophie'] as const) for (const anim of ['walk', 'run', 'sprint']) {
      const f = premium(id, false);
      const c = renderClip(f, 48, anim, 'side');
      const poses = posesFor(f, 48, anim, 'side');
      const steps: number[] = [];
      for (let i = 0; i < poses.length; i++) {
        const a = poses[i], b = poses[(i + 1) % poses.length];
        const s = a.support === 'near' || a.support === 'far' ? a.support : null;
        if (!s || b.support !== s) continue;
        const key = s === 'near' ? 'footNear' : 'footFar';
        steps.push(c.joints![i][key][0] - c.joints![(i + 1) % poses.length][key][0]);
      }
      const measured = (steps.reduce((t, d) => t + d, 0) / steps.length) * poses.length;
      expect(Math.abs(c.stride! - measured) / measured, `${id} ${anim}`).toBeLessThan(0.15);
    }
  });

  it('las acciones que avanzan traen su desplazamiento; las que pegan en el lugar, no', () => {
    const f = premium('sophie', false);
    const sprint = renderClip(f, 48, 'sprint', 'side').stride!;
    for (const anim of ['sprint_start', 'long_jump', 'pole_vault', 'javelin', 'dive', 'spike', 'vb_dive', 'flying_kick']) {
      const t = renderClip(f, 48, anim, 'side').travel!;
      expect(t, anim).toBeDefined();
      expect(t[0]).toBe(0);
      for (let i = 1; i < t.length; i++) expect(t[i], `${anim} ${i}`).toBeGreaterThanOrEqual(t[i - 1]);
    }
    // el salto largo cubre más que una zancada de sprint
    expect(renderClip(f, 48, 'long_jump', 'side').travel!.at(-1)).toBeGreaterThan(sprint);
    for (const anim of ['jab', 'forehand', 'vb_set']) expect(renderClip(f, 48, anim, 'side').travel, anim).toBeUndefined();
    // nadar y las vallas no tienen pie que mida: traen su avance igual
    for (const anim of ['swim', 'swim_back', 'swim_breast', 'swim_fly', 'hurdles']) expect(renderClip(f, 48, anim, 'side').stride, anim).toBeGreaterThan(5);
  });

  it('las fichas clásicas quedan igual y las viejas se migran como clásicas', () => {
    // la familia viene en premium: aquí se la pone en clásico a propósito
    const classic: HumanFicha = { ...familyFicha('rick', true), movementProfile: 'classic' };
    const a = renderClip(classic, 48, 'walk', 'side'), b = renderClip({ ...classic, movementProfile: undefined }, 48, 'walk', 'side');
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
    const classic = exportFiles({ ...familyFicha('rick', true), movementProfile: 'classic' }, 'sheet', plan);
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

  it('natación: toda la familia pasa el control en 8 direcciones y 3 tamaños, con el agua puesta', () => {
    const casual = (id: 'rick' | 'steph' | 'sophie' | 'alana') => premium(id, false);
    const runs: [HumanFicha, CellSize][] = [[casual('rick'), 48], [casual('steph'), 48], [casual('sophie'), 48], [casual('alana'), 48], [casual('rick'), 32], [casual('sophie'), 32], [casual('rick'), 64]];
    for (const [f, cell] of runs) {
      const { qa, missing } = renderPlan(f, { cell, anims: SWIM, views: EIGHT_VIEWS, props: true });
      expect(missing, f.name).toEqual([]);
      expect(qa.filter((r) => !r.ok).map((r) => `${f.name} ${cell} ${r.clip}`)).toEqual([]);
    }
  }, 600_000);

  it('el agua tiñe lo de abajo y deja la cabeza afuera; espalda avanza con la cabeza primero', () => {
    const f = premium('rick', false);
    const crawl = renderClip(f, 48, 'swim', 'side');
    const row = crawl.waterRows![0]!;
    // abajo de la superficie todo es más azul que rojo (tinte), arriba queda la cabeza con su color
    const fr = crawl.frames[0];
    let below = 0, blue = 0;
    for (let y = row + 2; y < 48; y++) for (let x = 0; x < 48; x++) { const i = (y * 48 + x) * 4; if (fr.data[i + 3]) { below++; if (fr.data[i + 2] > fr.data[i]) blue++; } }
    expect(below).toBeGreaterThan(20);
    expect(blue / below).toBeGreaterThan(0.8);
    // ciclo sin rebote: la superficie queda en la misma fila
    expect(new Set(crawl.waterRows).size).toBe(1);
    // espalda: de lado se dibuja con la vista espejo (cabeza adelante, boca arriba)
    const back = renderClip(f, 48, 'swim_back', 'side'), left = renderClip({ ...f }, 48, 'swim_back', 'left');
    expect(Buffer.from(back.frames[0].data).equals(Buffer.from(left.frames[0].data))).toBe(false);
    // el clavado entra con salpicadura y se marca el golpe con el agua
    const dive = renderClip(f, 48, 'dive', 'side');
    expect(dive.events!.map((e) => e.type)).toEqual(['despegue', 'impacto']);
    expect(dive.rise![0]).toBeGreaterThan(5);
  });

  it('vóley y tenis: toda la familia pasa el control en 8 direcciones y 3 tamaños', () => {
    const casual = (id: 'rick' | 'steph' | 'sophie' | 'alana') => premium(id, false);
    const runs: [HumanFicha, CellSize][] = [[casual('rick'), 48], [casual('steph'), 48], [casual('sophie'), 48], [casual('alana'), 48], [casual('rick'), 32], [casual('alana'), 32], [casual('steph'), 64]];
    for (const [f, cell] of runs) {
      const { qa, missing } = renderPlan(f, { cell, anims: NET, views: EIGHT_VIEWS, props: true });
      expect(missing, f.name).toEqual([]);
      expect(qa.filter((r) => !r.ok).map((r) => `${f.name} ${cell} ${r.clip}`)).toEqual([]);
    }
  }, 600_000);

  it('cada golpe trae su impacto y los saltos su elevación', () => {
    const f = premium('rick', false);
    for (const a of ['vb_bump', 'vb_set', 'spike', 'serve', 'forehand', 'backhand', 'tennis_serve', 'tn_volley', 'tn_smash'])
      expect(renderClip(f, 48, a, 'side', { props: true }).events!.some((e) => e.type === 'impacto'), a).toBe(true);
    expect(Math.max(...renderClip(f, 48, 'spike', 'side', { props: true }).rise!)).toBeGreaterThan(10);
  });

  it('peleas: toda la familia pasa el control, cada golpe trae impacto y chispa', () => {
    const casual = (id: 'rick' | 'steph' | 'sophie' | 'alana') => premium(id, false);
    const runs: [HumanFicha, CellSize][] = [[casual('rick'), 48], [casual('steph'), 48], [casual('sophie'), 48], [casual('alana'), 48], [casual('rick'), 32], [casual('sophie'), 64]];
    for (const [f, cell] of runs) {
      const { qa, missing } = renderPlan(f, { cell, anims: FIGHT, views: EIGHT_VIEWS, props: true });
      expect(missing, f.name).toEqual([]);
      expect(qa.filter((r) => !r.ok).map((r) => `${f.name} ${cell} ${r.clip}`)).toEqual([]);
    }
    const f = casual('rick');
    for (const a of ['jab', 'punch', 'hook', 'uppercut', 'low_kick', 'kick_martial', 'flying_kick']) {
      const poses = posesFor(f, 48, a);
      const hitAt = Math.floor(renderClip(f, 48, a, 'side', { props: true }).events!.find((e) => e.type === 'impacto')!.phase * poses.length);
      expect(poses[hitAt].props?.some((p) => p.kind === 'spark'), a).toBe(true);
    }
  }, 600_000);

  it('el kit deportivo trae hojas de 8 direcciones y un manifiesto con eventos, elevación y agua', () => {
    const files = buildSportsKit({ athletes: { rick: premium('rick', false) }, packs: ['natacion', 'atletismo'], quick: true });
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.direcciones).toHaveLength(8);
    const nat = m.atletas.rick.deportes.natacion, atl = m.atletas.rick.deportes.atletismo;
    expect(nat.dive.agua.some((v: number | null) => v !== null)).toBe(true);
    expect(nat.dive.eventos.map((e: { tipo: string }) => e.tipo)).toEqual(['despegue', 'impacto']);
    expect(Math.max(...atl.javelin.elevacion ?? [0])).toBe(0);
    expect(atl.javelin.eventos.some((e: { tipo: string }) => e.tipo === 'suelta')).toBe(true);
    // la jabalina avanza y de frente va en diagonal: el rumbo le dice al juego hacia dónde moverla
    expect(atl.javelin.desplazamiento.at(-1)).toBeGreaterThan(5);
    expect(atl.javelin.rumbo[m.direcciones.indexOf('down')]).toBe('down_right');
    expect(atl.javelin.rumbo[m.direcciones.indexOf('up')]).toBe('up_right');
    expect(atl.javelin.rumbo[m.direcciones.indexOf('left')]).toBe('left');
    expect(nat.dive.desplazamiento.at(-1)).toBeGreaterThan(5);
    // la suelta dice de dónde sale la jabalina en cada fila: de la mano, arriba del piso y cerca del cuerpo
    const rel = atl.javelin.eventos.find((e: { tipo: string }) => e.tipo === 'suelta').punto;
    expect(rel).toHaveLength(8);
    for (const [x, y] of rel) { expect(Math.abs(x)).toBeLessThan(24); expect(y).toBeLessThan(-4); }
    // cada hoja: 8 filas de celda 48
    const png = files.find((f) => f.name === nat.dive.archivo)!;
    expect(png.bytes.length).toBeGreaterThan(100);
  }, 120_000);

  it('los 6 superhéroes pasan el control en todos los deportes y 8 direcciones (con y sin arma)', () => {
    const anims = [...new Set(Object.values(SPORT_PACKS).flat())];
    for (const id of HEROES) for (const armed of [false, true]) {
      const { qa, missing } = renderPlan(heroFicha(id, armed), { cell: heroCell(id), anims, views: EIGHT_VIEWS, props: true });
      expect(missing, id).toEqual([]);
      expect(qa.filter((r) => !r.ok).map((r) => `${id} ${armed} ${r.clip}`)).toEqual([]);
    }
    // Hulk va en celda grande, el resto en 48
    expect(heroCell('hulk')).toBe(64);
    expect(HEROES.filter((h) => heroCell(h) === 48)).toHaveLength(5);
  }, 1_800_000);

  it('fútbol premium: toda la familia pasa el control en 8 direcciones y 3 tamaños; cada contacto trae su golpe', () => {
    const names = FOOTBALL_PREMIUM.map((a) => a.name);
    for (const id of ['rick', 'steph', 'sophie', 'alana'] as const) for (const cell of [32, 48, 64] as CellSize[]) {
      const { qa, missing } = renderPlan(premium(id, false), { cell, anims: names, views: EIGHT_VIEWS, props: true });
      expect(missing, id).toEqual([]);
      expect(qa.filter((r) => !r.ok).map((r) => `${id} ${cell} ${r.clip}`)).toEqual([]);
    }
    const f = premium('rick', false);
    for (const a of ['shot', 'pass', 'chip', 'volley', 'header', 'trap', 'tackle', 'keeper_punt', 'run_ball']) {
      expect(renderClip(f, 48, a, 'side').events?.some((e) => e.type === 'impacto'), a).toBe(true);
    }
    for (const a of ['throw_in', 'keeper_throw']) expect(renderClip(f, 48, a, 'side').events?.some((e) => e.type === 'suelta'), a).toBe(true);
    // la conducción avanza como correr y el tiro trae la carrera de aproximación
    expect(renderClip(f, 48, 'run_ball', 'side').stride).toBeGreaterThan(10);
    expect(renderClip(f, 48, 'shot', 'side').travel!.at(-1)).toBeGreaterThan(3);
    // el clásico (el preajuste del juego de fútbol con fichas clásicas) no cambia: sigue en 8 cuadros
    expect(renderClip({ ...f, movementProfile: 'classic' }, 48, 'shot', 'side').frames).toHaveLength(8);
  }, 600_000);

  it('los emblemas se dibujan en el pecho de frente y no de espalda', () => {
    for (const id of ['spiderman', 'batman'] as const) {
      const f = heroFicha(id);
      const sin = { ...f, outfit: { ...f.outfit, emblem: null } };
      const px = (r: { data: Uint8ClampedArray | Uint8Array }) => Array.from(r.data).join(',');
      expect(px(renderClip(f, 48, 'idle', 'front').frames[0]), id).not.toBe(px(renderClip(sin, 48, 'idle', 'front').frames[0]));
      expect(px(renderClip(f, 48, 'idle', 'back').frames[0]), id).toBe(px(renderClip(sin, 48, 'idle', 'back').frames[0]));
    }
  });

  it('la familia viene en premium, también con su clase de RPG', () => {
    for (const id of ['rick', 'steph', 'sophie', 'alana'] as const) {
      expect(familyFicha(id).movementProfile, id).toBe('premium');
      expect(familyFicha(id, true).movementProfile, id).toBe('premium');
    }
  });
});
