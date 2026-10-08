import { describe, it, expect } from 'vitest';
import {
  defaultAvatar, withHairStyle, modelFromAvatar, renderHeadModel, fichaFromAvatar, validateFicha, renderPlan, FFGG_PLAN, randomAvatar,
  HEAD_STYLES, HAIR_STYLE_IDS, EYE_STYLE_IDS, BEARD_STYLE_IDS, GLASSES_STYLE_IDS, BROW_STYLE_IDS, type Avatar,
} from '../index';

const look = (a: Avatar, name: string) => {
  const m = modelFromAvatar(a);
  for (const width of [14, 20, 26])
    for (const yaw of [0, 62, 180]) {
      const h = renderHeadModel(m, { width, yaw, style: HEAD_STYLES[a.look] });
      const filled = [...h.img.idx].filter((i) => i >= 0).length;
      expect(filled, `${name} ${width}px yaw ${yaw}`).toBeGreaterThan(width * width * 0.4);
      expect(h.anchor.y).toBeGreaterThan(h.img.h * 0.5);
      expect(h.anchor.y).toBeLessThan(h.img.h);
    }
};

describe('avatar', () => {
  it('cada peinado se dibuja en 3 tamaños y 3 ángulos', () => {
    for (const s of HAIR_STYLE_IDS) look(withHairStyle(defaultAvatar(), s), s);
  }, 120000);
  it('ojos, cejas, barbas y lentes se dibujan', () => {
    const a = defaultAvatar();
    for (const s of EYE_STYLE_IDS) look({ ...a, eyes: { ...a.eyes, style: s } }, s);
    for (const s of BROW_STYLE_IDS) look({ ...a, brows: { style: s } }, s);
    for (const s of BEARD_STYLE_IDS) look({ ...a, beard: { style: s, color: '#3a2a20', gray: 0.5 } }, s);
    for (const s of GLASSES_STYLE_IDS) look({ ...a, glasses: { style: s, color: '#1d1d24' } }, s);
  }, 120000);
  it('los lentes cambian los pixeles de la cara', () => {
    const a = defaultAvatar();
    const st = HEAD_STYLES.stardew;
    const p = renderHeadModel(modelFromAvatar(a), { width: 20, yaw: 0, style: st });
    const q = renderHeadModel(modelFromAvatar({ ...a, glasses: { style: 'cuadrados', color: '#1d1d24' } }), { width: 20, yaw: 0, style: st });
    expect(q.pal.some((e) => e.mat === 'accessory')).toBe(true);
    expect(p.pal.some((e) => e.mat === 'accessory')).toBe(false);
  });
  it('un personaje desde cero es válido y pasa el control de calidad del juego', () => {
    for (const a of [defaultAvatar(), withHairStyle({ ...defaultAvatar(), beard: { style: 'completa', color: '#4a3a33', gray: 0.6 }, glasses: { style: 'cuadrados', color: '#e2e7ea' } }, 'corto'), withHairStyle(defaultAvatar(), 'colitas'), withHairStyle(defaultAvatar(), 'largo')]) {
      const f = fichaFromAvatar('x', a);
      expect(validateFicha(JSON.parse(JSON.stringify(f)))).toEqual([]);
      const bad = renderPlan(f, FFGG_PLAN).qa.filter((r) => !r.ok).map((r) => `${a.hair.style}: ${r.clip} ${r.items.filter((i) => i.severity === 'error').map((i) => i.check).join(',')}`);
      expect(bad).toEqual([]);
    }
  }, 180000);
  it('sorpréndeme da avatares distintos y siempre dibujables', () => {
    const seen = new Set<string>();
    for (let s = 1; s <= 6; s++) { const a = randomAvatar(s); seen.add(JSON.stringify(a)); look(a, `random ${s}`); }
    expect(seen.size).toBe(6);
  }, 120000);
});
