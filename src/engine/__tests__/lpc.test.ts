import { describe, it, expect } from 'vitest';
import {
  lpcHead, lpcCredits, LPC_HAIRS, LPC_BEARDS, LPC_MUSTACHES, LPC_GLASSES, LPC_HEADS, DEFAULT_LPC, defaultAvatar, fichaFromAvatar,
  renderPlan, FFGG_PLAN, exportFiles, hexToLab, bodyProportions, type LpcColors, type BodyType, type HumanFicha,
} from '../index';

const colors: LpcColors = { skin: '#d79d78', hair: '#2a1d16', eyes: '#3a2418', beard: '#4a3a33', glasses: '#1d1d24' };

describe('piezas dibujadas LPC', () => {
  it('cada peinado se arma de frente, de lado y de espalda', () => {
    expect(LPC_HAIRS.length).toBeGreaterThanOrEqual(80);
    for (const hair of LPC_HAIRS)
      for (const v of ['front', 'side', 'back'] as const) {
        const h = lpcHead({ ...DEFAULT_LPC, hair }, v, colors);
        expect([...h.img.idx].filter((i) => i >= 0).length, `${hair} ${v}`).toBeGreaterThan(200);
        expect(h.anchor.y).toBeLessThan(h.img.h);
      }
  });
  it('barbas, bigotes, lentes y caras también', () => {
    for (const head of LPC_HEADS) for (const beard of LPC_BEARDS) lpcHead({ ...DEFAULT_LPC, head, beard }, 'front', colors);
    for (const mustache of LPC_MUSTACHES) lpcHead({ ...DEFAULT_LPC, mustache }, 'side', colors);
    for (const glasses of LPC_GLASSES) expect(lpcHead({ ...DEFAULT_LPC, glasses }, 'front', colors).pal.some((p) => p.mat === 'accessory')).toBe(true);
  });
  it('el pelo oscuro queda oscuro (el recoloreo guarda el sombreado pero baja las luces)', () => {
    const h = lpcHead({ ...DEFAULT_LPC, hair: 'parted' }, 'front', colors);
    const hairL = h.pal.filter((p) => p.mat === 'hair').map((p) => hexToLab(p.hex)[0]);
    expect(Math.max(...hairL)).toBeLessThan(0.6);
  });
  it('las expresiones cambian la cara', () => {
    const a = lpcHead(DEFAULT_LPC, 'front', colors, 'open');
    const b = lpcHead(DEFAULT_LPC, 'front', colors, 'closed');
    expect(Buffer.from(a.img.idx.buffer).equals(Buffer.from(b.img.idx.buffer))).toBe(false);
  });
  it('los créditos salen con cada exportación', () => {
    expect(lpcCredits({ ...DEFAULT_LPC, beard: 'trimmed', glasses: 'round' }).length).toBeGreaterThanOrEqual(4);
    const f = fichaFromAvatar('x', { ...defaultAvatar(), lpc: { ...DEFAULT_LPC, hair: 'long', beard: 'basic' } });
    const files = exportFiles(f, 'ffgg', FFGG_PLAN);
    const cred = files.find((x) => x.name === 'CREDITOS.txt');
    expect(cred).toBeTruthy();
    expect(new TextDecoder().decode(cred!.bytes)).toContain('LPC');
  });
  it('personajes con piezas dibujadas pasan el control de calidad del juego', () => {
    for (const hair of ['parted2', 'long', 'pigtails', 'afro', 'high_ponytail']) {
      const f = fichaFromAvatar('x', { ...defaultAvatar(), lpc: { ...DEFAULT_LPC, hair, beard: hair === 'parted2' ? 'trimmed' : null, glasses: 'round' } });
      const bad = renderPlan(f, FFGG_PLAN).qa.filter((r) => !r.ok).map((r) => `${hair}: ${r.clip} ${r.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.where ?? ''}`).join(',')}`);
      expect(bad).toEqual([]);
    }
  }, 120000);

  it('edades, contexturas, ropa y gorros pasan el control de calidad del juego', () => {
    const cases: { body: BodyType; lpc: Record<string, unknown>; outfit: Partial<HumanFicha['outfit']> }[] = [
      { body: { age: 'nino', build: 'medio', shape: 'recto' }, lpc: { head: 'female', hair: 'pigtails' }, outfit: { bottom: 'skirt' } },
      { body: { age: 'nino', build: 'robusto', shape: 'recto' }, lpc: { hair: 'curly_short' }, outfit: { pattern: 'cuadros', pattern2: '#f2c94c', shoes: 'descalzo', socks: 'none' } },
      { body: { age: 'adolescente', build: 'delgado', shape: 'recto' }, lpc: { hair: 'messy2' }, outfit: { pattern: 'rayas', pattern2: '#ffffff', number: '10', shoes: 'guayos' } },
      { body: { age: 'adulto', build: 'robusto', shape: 'recto' }, lpc: { hair: 'buzzcut', hat: 'leather_cap' }, outfit: { jacket: '#3b3f4a', bottom: 'pants', shoes: 'botas' } },
      { body: { age: 'adulto', build: 'medio', shape: 'curvas' }, lpc: { head: 'female', hair: 'ponytail', hat: 'wizard' }, outfit: { collar: 'v' } },
      { body: { age: 'mayor', build: 'medio', shape: 'recto' }, lpc: { head: 'male_elderly', hair: 'balding', hat: 'viking' }, outfit: { pattern: 'banda', collar: 'polo' } },
    ];
    for (const c of cases) {
      let f = fichaFromAvatar('x', { ...defaultAvatar(), body: c.body, lpc: { ...DEFAULT_LPC, ...c.lpc } }, c.outfit);
      f = { ...f, body: { ...f.body, proportions: bodyProportions('chibi', c.body) } };
      const bad = renderPlan(f, FFGG_PLAN).qa.filter((r) => !r.ok).map((r) => `${c.body.age}/${String(c.lpc.hair)}: ${r.clip} ${r.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.where ?? ''}`).join(',')}`);
      expect(bad).toEqual([]);
    }
  }, 180000);
});
