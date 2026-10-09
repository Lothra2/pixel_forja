import { describe, it, expect } from 'vitest';
import {
  HERO_CLASSES, ENEMIES, applyClass, enemyFicha, enemyAnims, enemyCell, HERO_RPG_ANIMS, fichaFromAvatar, defaultAvatar, renderPlan,
  exportFx, FX_ELEMENTS, EIGHT_VIEWS, FAMILY, FAMILY_GG, familyFicha, validateFicha, type HumanFicha,
} from '../index';

describe('RPG: clases, enemigos y exportación', () => {
  it('cada clase viste y arma al personaje sin cambiarle la cara', () => {
    const base = fichaFromAvatar('h', defaultAvatar()) as HumanFicha;
    for (const c of HERO_CLASSES) {
      const f = applyClass(base, c);
      expect(f.gear?.main, c).toBeTruthy();
      expect(f.avatar?.lpc?.hair).toBe(base.avatar?.lpc?.hair);
    }
  });
  it('cada enemigo pasa el control de calidad con sus animaciones en 8 direcciones', () => {
    for (const id of ENEMIES) {
      const f = enemyFicha(id);
      const { qa, missing } = renderPlan(f, { cell: enemyCell(id), anims: enemyAnims(id), views: EIGHT_VIEWS, props: true });
      expect(missing, id).toEqual([]);
      expect(qa.filter((r) => !r.ok).map((r) => `${id} ${r.clip}`)).toEqual([]);
    }
  }, 300000);
  it('el héroe con clase pasa el control con todas sus animaciones de RPG', () => {
    const f = applyClass(fichaFromAvatar('h', defaultAvatar()) as HumanFicha, 'paladin');
    const { qa, missing } = renderPlan(f, { cell: 48, anims: HERO_RPG_ANIMS, views: ['se', 'side', 'ne', 'front', 'back'], props: true });
    expect(missing).toEqual([]);
    expect(qa.filter((r) => !r.ok).map((r) => r.clip)).toEqual([]);
  }, 300000);
  it('la familia GG viene lista: casual y con su clase, válida, sonriendo y en verde caminando en 8 direcciones', () => {
    for (const id of FAMILY) {
      const casual = familyFicha(id), rpg = familyFicha(id, true);
      expect(validateFicha(casual), id).toEqual([]);
      expect(validateFicha(rpg), id).toEqual([]);
      expect(casual.name).toBe(FAMILY_GG[id].name);
      expect(casual.face.mouth, id).toBe('smile');
      expect(casual.gear?.main ?? null, id).toBeNull();
      expect(rpg.gear?.main, id).toBeTruthy();
      expect(rpg.avatar?.lpc?.hair).toBe(casual.avatar?.lpc?.hair);
      for (const f of [casual, rpg]) {
        const { qa, missing } = renderPlan(f, { cell: 48, anims: ['idle', 'walk'], views: EIGHT_VIEWS, props: true });
        expect(missing).toEqual([]);
        expect(qa.filter((r) => !r.ok).map((r) => `${id} ${r.clip}`)).toEqual([]);
      }
    }
    expect(familyFicha('rick').avatar?.lpc).toMatchObject({ hair: 'swept_back', glasses: 'nerd', beard: 'basic' });
    expect(familyFicha('sophie', true).gear?.main).toBe('bow');
  }, 300000);
  it('exporta poderes como PNG + JSON de Phaser', () => {
    const fx = exportFx(FX_ELEMENTS.slice(0, 2), ['projectile', 'impact'], 48);
    const j = JSON.parse(new TextDecoder().decode(fx[1].bytes));
    expect(Object.keys(j.anims)).toContain('projectile_fuego_down_right');
    expect(j.anims.impact_hielo.frames).toBe(8);
  });
});
