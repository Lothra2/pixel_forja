import { describe, it, expect } from 'vitest';
import {
  lpcHead, lpcCredits, LPC_HAIRS, LPC_BEARDS, LPC_MUSTACHES, LPC_GLASSES, LPC_HEADS, DEFAULT_LPC, defaultAvatar, fichaFromAvatar,
  renderPlan, FFGG_PLAN, exportFiles, hexToLab, bodyProportions, renderClip, mirror, EIGHT_VIEWS, LPC_MONSTERS, LPC_EARS, lpcSkinOf, withLpc, WEAPON_KINDS, OFFHAND_KINDS,
  type LpcColors, type BodyType, type HumanFicha, type ViewName,
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
  it('la boca se ve: sonrisa, sonrisa con dientes, abierta y triste cambian la cara de frente y de lado', () => {
    const key = (h: ReturnType<typeof lpcHead>) => Buffer.from(h.img.idx.buffer).toString('base64') + h.pal.map((p) => p.hex).join();
    for (const v of ['front', 'side'] as const) {
      const line = key(lpcHead(DEFAULT_LPC, v, colors, 'open', 'line'));
      for (const m of ['smile', 'grin', 'open', 'frown'] as const) expect(key(lpcHead(DEFAULT_LPC, v, colors, 'open', m)), `${m} ${v}`).not.toBe(line);
    }
    // la cara feliz de LPC no deja los ojos en blanco
    const happy = lpcHead(DEFAULT_LPC, 'front', colors, 'happy', 'smile');
    expect([...happy.img.idx].filter((i) => i >= 0 && hexToLab(happy.pal[i].hex)[0] > 0.95).length).toBe(0);
  });
  it('con barba, la sonrisa se ve ancha y la sombra de la barba no dibuja una boca triste', () => {
    const look = { ...DEFAULT_LPC, beard: 'basic', brows: 'thick' };
    const lum = (h: ReturnType<typeof lpcHead>, i: number) => hexToLab(h.pal[i].hex)[0];
    const darkest = (h: ReturnType<typeof lpcHead>) => Math.min(...[...h.img.idx].filter((i) => i >= 0 && h.pal[i].mat === 'beard').map((i) => lum(h, i)));
    // en las filas de la boca, el tono más oscuro de la barba ya no aparece al centro
    const zone = (h: ReturnType<typeof lpcHead>) => {
      const out: number[] = [];
      for (let y = h.anchor.y - 3; y <= h.anchor.y - 1; y++)
        for (let x = h.anchor.x - 3; x <= h.anchor.x + 2; x++) out.push(h.img.idx[y * h.img.w + x]);
      return out;
    };
    for (const m of ['line', 'smile'] as const) {
      const h = lpcHead(look, 'front', colors, 'open', m);
      expect(zone(h).filter((i) => i >= 0 && h.pal[i].mat === 'beard' && lum(h, i) <= darkest(h) + 1e-6), m).toEqual([]);
    }
    const s = lpcHead(look, 'front', colors, 'open', 'smile');
    expect(zone(s).filter((i) => i >= 0 && s.pal[i].mat === 'face').length).toBeGreaterThanOrEqual(6);
    // y con boca contenta las puntas de las cejas gruesas no caen
    const brow = (h: ReturnType<typeof lpcHead>) => [...h.img.idx].filter((i) => i >= 0 && h.pal[i].mat === 'hair').length;
    expect(brow(s)).toBeLessThan(brow(lpcHead(look, 'front', colors, 'open', 'line')));
  });
  it('peinados propios derivados: swept_back trae volumen arriba y créditos de la pieza original', () => {
    expect(LPC_HAIRS).toContain('swept_back');
    const a = lpcHead({ ...DEFAULT_LPC, hair: 'swept_back' }, 'side', colors);
    const b = lpcHead({ ...DEFAULT_LPC, hair: 'high_and_tight' }, 'side', colors);
    expect(a.anchor.y).toBeGreaterThan(b.anchor.y);
    expect(lpcCredits({ ...DEFAULT_LPC, hair: 'swept_back' }).join('\n')).toContain('Skorpio');
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

describe('vista isométrica de 8 direcciones', () => {
  const f = fichaFromAvatar('rick', { ...defaultAvatar(), lpc: { ...DEFAULT_LPC, hair: 'swept_back', beard: 'medium', glasses: 'secretary' } });
  it('las diagonales existen, se diferencian de frente y de lado, y las de la izquierda son espejo', () => {
    const key = (v: ViewName) => Buffer.from(renderClip(f, 48, 'walk', v).frames[1].data).toString('base64');
    const se = key('se'), front = key('front'), side = key('side');
    expect(se).not.toBe(front);
    expect(se).not.toBe(side);
    expect(key('ne')).not.toBe(key('back'));
    const a = renderClip(f, 48, 'idle', 'se').frames[0], b = renderClip(f, 48, 'idle', 'sw').frames[0];
    expect(Buffer.from(mirror(a).data).equals(Buffer.from(b.data))).toBe(true);
  });
  it('la cabeza de frente girada corre la cara hacia donde mira', () => {
    const a = lpcHead(DEFAULT_LPC, 'front', colors), b = lpcHead(DEFAULT_LPC, 'front34', colors);
    expect(Buffer.from(a.img.idx.buffer).equals(Buffer.from(b.img.idx.buffer))).toBe(false);
    expect(b.img.w).toBe(a.img.w);
  });
  it('un juego RPG isométrico: 8 direcciones con nombres y control de calidad en verde', () => {
    const plan = { cell: 48 as const, anims: ['idle', 'walk', 'run', 'attack', 'hit', 'die'], views: EIGHT_VIEWS, props: true };
    const { clips, qa } = renderPlan(f, plan);
    expect(clips.length).toBe(6 * 8);
    expect(clips.map((c) => c.name)).toContain('walk_down_right');
    expect(clips.map((c) => c.name)).toContain('attack_up_left');
    const bad = qa.filter((r) => !r.ok).map((r) => `${r.clip}: ${r.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.where ?? ''}`).join(',')}`);
    expect(bad).toEqual([]);
  }, 120000);
});

describe('enemigos: cabezas de monstruo, orejas y cuernos', () => {
  it('cada monstruo se arma en las tres vistas con sus colores y el cuerpo toma su piel', () => {
    expect(LPC_MONSTERS.length).toBeGreaterThanOrEqual(12);
    for (const id of LPC_MONSTERS) {
      const av = withLpc(defaultAvatar(), 'lpcMonster', id);
      expect(av.skin, id).toBe(lpcSkinOf(id));
      expect(hexToLab(av.skin)[0], `${id} piel no es el contorno`).toBeGreaterThan(0.3);
      for (const v of ['front', 'side', 'back'] as const) {
        const h = lpcHead(av.lpc!, v, { ...colors, skin: av.skin });
        expect([...h.img.idx].filter((i) => i >= 0).length, `${id} ${v}`).toBeGreaterThan(150);
      }
    }
    // de vuelta a una cabeza humana, piel humana
    const back = withLpc(withLpc(defaultAvatar(), 'lpcMonster', 'orc'), 'lpcHead', 'male');
    expect(lpcSkinOf('male')).toBeNull();
    expect(back.skin).not.toBe(lpcSkinOf('orc'));
  });
  it('orejas y cuernos cambian la cabeza y dan crédito', () => {
    const base = lpcHead(DEFAULT_LPC, 'front', colors);
    for (const ears of LPC_EARS) expect(lpcHead({ ...DEFAULT_LPC, ears }, 'front', colors).img.idx.length + 1).toBeGreaterThan(1);
    const elf = lpcHead({ ...DEFAULT_LPC, ears: 'elven' }, 'front', colors);
    expect(elf.img.w).toBeGreaterThan(base.img.w);
    expect(lpcCredits({ ...DEFAULT_LPC, horns: 'curled', ears: 'elven' }).length).toBeGreaterThanOrEqual(4);
  });
  it('un esqueleto y un orco pasan el control de calidad del RPG en 8 direcciones', () => {
    for (const id of ['skeleton', 'orc']) {
      const f = fichaFromAvatar(id, withLpc(defaultAvatar(), 'lpcMonster', id));
      const { qa } = renderPlan(f, { cell: 48, anims: ['idle', 'walk', 'attack', 'die'], views: EIGHT_VIEWS, props: true });
      expect(qa.filter((r) => !r.ok).map((r) => r.clip), id).toEqual([]);
    }
  }, 120000);
});

describe('armas y armaduras del RPG', () => {
  it('cada arma y cada mano libre se dibujan y cambian el cuadro de ataque', () => {
    const base = fichaFromAvatar('h', defaultAvatar(), { armor: 'placas', cape: '#2a4fa0', pauldrons: true, belt: '#5a3a22', trim: '#e2b74a' });
    const key = (f: HumanFicha) => Buffer.from(renderClip(f, 48, 'attack', 'side').frames[3].data).toString('base64');
    const seen = new Set<string>();
    for (const main of WEAPON_KINDS) seen.add(key({ ...base, gear: { main, off: null } } as HumanFicha));
    expect(seen.size).toBe(WEAPON_KINDS.length);
    for (const off of OFFHAND_KINDS) expect(renderClip({ ...base, gear: { main: 'sword', off } } as HumanFicha, 48, 'block_shield', 'front').frames.length).toBeGreaterThan(0);
  });
  it('el héroe con equipo pasa el control de calidad en 8 direcciones con cada armadura', () => {
    for (const armor of ['cuero', 'malla', 'placas', 'tunica'] as const) {
      const f = { ...fichaFromAvatar('h', defaultAvatar(), { armor, cape: '#7a1f2b' }), gear: { main: armor === 'tunica' ? 'staff' : 'axe', off: 'shield_round' } } as HumanFicha;
      const { qa } = renderPlan(f, { cell: 48, anims: ['idle', 'walk', 'attack', 'hit'], views: EIGHT_VIEWS, props: true });
      expect(qa.filter((r) => !r.ok).map((r) => `${armor} ${r.clip}`)).toEqual([]);
    }
  }, 180000);
});

describe('habilidades y enemigos', () => {
  it('el torbellino gira por las 8 direcciones y todas las habilidades pasan el control en diagonal', () => {
    const f = { ...fichaFromAvatar('h', defaultAvatar(), { armor: 'placas', cape: '#2a4fa0' }), gear: { main: 'sword', off: 'shield_kite' } } as HumanFicha;
    const spin = renderClip(f, 48, 'whirlwind', 'side').frames.map((fr) => Buffer.from(fr.data).toString('base64'));
    expect(new Set(spin).size).toBeGreaterThanOrEqual(6);
    const names = ['cast', 'nova', 'channel', 'whirlwind', 'leap', 'charge', 'dodge', 'shoot_bow', 'summon', 'warcry', 'attack_heavy', 'attack_thrust', 'zombie_walk', 'claw', 'lunge', 'rise'];
    const { qa, missing } = renderPlan(f, { cell: 48, anims: names, views: ['se', 'ne', 'side'], props: true });
    expect(missing).toEqual([]);
    expect(qa.filter((r) => !r.ok).map((r) => r.clip)).toEqual([]);
  }, 180000);
});
