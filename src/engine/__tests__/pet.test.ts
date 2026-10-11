import { describe, it, expect } from 'vitest';
import { thorFicha, renderClip, renderPlan, EIGHT_VIEWS, PET_RPG_ANIMS, PET_ARMOR, allPetArmor, renderLoot, validateFicha, animsFor, type Raster } from '../index';

const key = (r: Raster) => Buffer.from(r.data).toString('base64');

describe('Thor, mascota ayudante', () => {
  it('es premium: pisadas, mordida, ladrido y avance sin patinar; las patas se ven trabajar al correr', () => {
    const f = thorFicha();
    expect(f.movementProfile).toBe('premium');
    const walk = renderClip(f, 48, 'walk', 'side'), run = renderClip(f, 48, 'run', 'side');
    expect(walk.events?.filter((e) => e.type === 'paso')).toHaveLength(4);
    expect(run.events?.some((e) => e.type === 'despegue')).toBe(true);
    expect(run.stride!).toBeGreaterThan(walk.stride!);
    expect(renderClip(f, 48, 'bite', 'side').events?.[0]).toMatchObject({ type: 'impacto' });
    expect(renderClip(f, 48, 'bark', 'side').events?.every((e) => e.type === 'suelta')).toBe(true);
    // el galope cambia de verdad cuadro a cuadro (antes las patas casi no se movían)
    const frames = run.frames.map(key);
    expect(new Set(frames).size).toBe(frames.length);
    // pivote fijo: todas las animaciones comparten el punto de apoyo
    expect(renderClip(f, 48, 'idle', 'side').frames[0].w).toBe(48);
  });


  it('es una ficha válida y se ve distinto en cada una de las 5 vistas (las otras 3 son espejo)', () => {
    const f = thorFicha();
    expect(validateFicha(f)).toEqual([]);
    const v = ['side', 'se', 'front', 'ne', 'back'].map((view) => key(renderClip(f, 48, 'idle', view as 'side').frames[0]));
    expect(new Set(v).size).toBe(5);
  });
  it('la armadura sube de nivel y se ve', () => {
    const imgs = [0, 1, 2, 3, 4, 5].map((b) => key(renderClip(thorFicha(b), 48, 'idle', 'se').frames[0]));
    expect(new Set(imgs).size).toBe(6);
    expect(PET_ARMOR).toHaveLength(5);
    for (let i = 1; i < 5; i++) expect(PET_ARMOR[i].defense).toBeGreaterThan(PET_ARMOR[i - 1].defense);
    for (const it of allPetArmor()) expect(renderLoot(it).w).toBe(32);
  });
  it('anima como mascota de RPG: morder, ladrar, aullar, recoger botín, golpe y caer, en su propio paquete', () => {
    const packs = animsFor(thorFicha());
    for (const a of ['bite', 'bark', 'howl', 'pickup', 'hurt', 'die']) expect(packs.find((x) => x.name === a)?.pack, a).toBe('pet');
    const pick = renderClip(thorFicha(), 48, 'pickup', 'side');
    expect(key(pick.frames[0])).not.toBe(key(pick.frames[5]));
  });
  it('pasa el control de calidad en 8 direcciones, con y sin armadura, en los 3 tamaños', () => {
    for (const b of [0, 5])
      for (const cell of [32, 48, 64] as const) {
        const { qa, missing } = renderPlan(thorFicha(b), { cell, anims: PET_RPG_ANIMS, views: EIGHT_VIEWS, props: true });
        expect(missing).toEqual([]);
        expect(qa.filter((r) => !r.ok).map((r) => `${b} ${cell} ${r.clip}`)).toEqual([]);
      }
  }, 300000);
});
