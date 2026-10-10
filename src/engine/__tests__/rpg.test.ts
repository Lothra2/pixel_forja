import { describe, it, expect } from 'vitest';
import {
  HERO_CLASSES, ENEMIES, applyClass, enemyFicha, enemyAnims, enemyCell, HERO_RPG_ANIMS, fichaFromAvatar, defaultAvatar, renderPlan,
  exportFx, FX_ELEMENTS, EIGHT_VIEWS, FAMILY, FAMILY_GG, familyFicha, validateFicha, applyArmorTier, equipLoot, findLoot, ARMOR_LINES, renderClip, type HumanFicha,
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
  it('la familia corre de frente y de espaldas sin saltitos, gira el torbellino y gatea en verde', () => {
    for (const id of FAMILY)
      for (const rpg of [false, true]) {
        const f = familyFicha(id, rpg);
        const anims = rpg ? ['run', 'whirlwind', 'crawl'] : ['run', 'crawl'];
        const { qa } = renderPlan(f, { cell: 48, anims, views: EIGHT_VIEWS, props: true });
        expect(qa.filter((r) => !r.ok).map((r) => `${id}${rpg ? ' rpg' : ''} ${r.clip}`)).toEqual([]);
      }
    // de espaldas, el cuerpo de Steph no sube y baja al correr (el pie apoyado no se corre con la profundidad)
    const top = renderClip(familyFicha('steph'), 48, 'run', 'back').frames.map((fr) => { for (let i = 0; i < fr.data.length; i += 4) if (fr.data[i + 3]) return Math.floor(i / 4 / fr.w); return -1; });
    expect(Math.max(...top) - Math.min(...top)).toBeLessThanOrEqual(1);
  }, 300000);
  it('la armadura evoluciona en el héroe: 5 niveles por línea, con casco, y pasa el control de calidad', () => {
    const rick = familyFicha('rick');
    const px = (f: HumanFicha) => Buffer.from(renderClip(f, 48, 'idle', 'se').frames[0].data).toString('base64');
    for (const line of ARMOR_LINES) {
      const imgs = [1, 2, 3, 4, 5].map((t) => applyArmorTier(rick, line, t as 1));
      expect(new Set(imgs.map(px)).size, line).toBe(5);
      expect(imgs[4].outfit.armorGlow, line).toBeTruthy();
      expect(imgs[4].avatar?.lpc?.hair).toBe('swept_back');
      expect(validateFicha(imgs[4])).toEqual([]);
      const { qa } = renderPlan(imgs[4], { cell: 48, anims: ['idle', 'walk', 'attack'], views: EIGHT_VIEWS, props: true });
      expect(qa.filter((r) => !r.ok).map((r) => `${line} ${r.clip}`)).toEqual([]);
    }
    expect(applyArmorTier(rick, 'placas', 3, false).avatar?.lpc?.hat).toBeNull();
  }, 300000);
  it('equipar el botín: la legendaria va a la mano con sus colores y la pieza de armadura viste al héroe', () => {
    const rick = familyFicha('rick');
    const a = equipLoot(rick, findLoot('hoja_del_vacio')!);
    expect(a.gear).toMatchObject({ main: 'greatsword', mainLoot: 'hoja_del_vacio', off: null });
    const plain = { ...a, gear: { ...a.gear, mainLoot: null } };
    const img = (f: HumanFicha) => Buffer.from(renderClip(f, 48, 'attack', 'side', { props: true }).frames[3].data).toString('base64');
    expect(img(a)).not.toBe(img(plain));
    const b = equipLoot(equipLoot(rick, findLoot('juramento_de_rick')!), findLoot('escudo_de_la_casa_gg')!);
    expect(b.gear).toMatchObject({ main: 'sword', off: 'shield', mainLoot: 'juramento_de_rick', offLoot: 'escudo_de_la_casa_gg' });
    const c = equipLoot(rick, findLoot('coraza_del_dragon_rojo')!);
    expect(c.outfit).toMatchObject({ armor: 'placas', armorTier: 5, armorColor: '#8e2a32' });
  });
  it('exporta poderes como PNG + JSON de Phaser', () => {
    const fx = exportFx(FX_ELEMENTS.slice(0, 2), ['projectile', 'impact'], 48);
    const j = JSON.parse(new TextDecoder().decode(fx[1].bytes));
    expect(Object.keys(j.anims)).toContain('projectile_fuego_down_right');
    expect(j.anims.impact_hielo.frames).toBe(8);
  });
});
