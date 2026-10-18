import { describe, it, expect } from 'vitest';
import { familyFicha } from '../rpg/family';
import { renderClip, EIGHT_VIEWS } from '../render/clip';
import { premiumAnim } from '../anim/premium';
import { VOLAR_ELEVACION } from '../anim/celestial';
import { capasAlas, tunicaFicha, tunicaItem, retratoCelestial, escalaHeroina, VOLAR } from '../celestial/kit';
import { lanzaLuz, impactoLuz, estelaAlas, auraCelestial } from '../celestial/fx';
import { celestialSkillIcons } from '../ui/icons2';
import { sinEquipo, diferencia } from '../kit/capas';
import { alasVuelo, lanzaLuzSonido, celestialDespierta } from '../audio/sintesis';
import { RATE } from '../audio/sfx';
import type { Raster } from '../core/raster';

const opacos = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i]) n++; return n; };

describe('la heroína celestial (F13, parte 3)', () => {
  it('volar: premium, 8 cuadros en bucle, con elevación y los pies despegados (las puntas abajo)', () => {
    const def = premiumAnim(VOLAR)!;
    expect(def).toBeDefined();
    const c = renderClip(familyFicha('sophie', true), 48, VOLAR, 'side', { props: true });
    expect(c.frames).toHaveLength(8);
    expect(c.loop).toBe(true);
    expect(c.rise).toEqual(VOLAR_ELEVACION);
    expect(Math.min(...VOLAR_ELEVACION)).toBeGreaterThan(6);
  });

  it('alas y aureola: un cuadro por cuadro de la base en las 8 direcciones, y nunca tapan la cara', () => {
    for (const id of ['rick', 'alana'] as const) {
      const f = familyFicha(id, true);
      const anims = ['idle', 'attack', 'hit', 'whirlwind', VOLAR];
      const al = capasAlas(f, anims);
      for (const a of anims) {
        expect(al.detras.get(a), `${id} ${a}`).toHaveLength(8);
        EIGHT_VIEWS.forEach((v, row) => {
          const base = renderClip(sinEquipo(f), 48, a, v, { props: true, joints: true });
          expect(al.detras.get(a)![row], `${id} ${a} ${v}`).toHaveLength(base.frames.length);
          expect(al.aura.get(a)![row]).toHaveLength(base.frames.length);
          base.frames.forEach((fr, i) => {
            const d = al.detras.get(a)![row][i], e = al.delante.get(a)![row][i];
            // hay ala en cada cuadro (detrás o delante)
            expect(opacos(d) + opacos(e), `${id} ${a} ${v} ${i}`).toBeGreaterThan(20);
            // lo de delante nunca pisa la cabeza (lo que está arriba del cuello)
            const neck = Math.round(base.joints![i].neck[1]);
            for (let y = 0; y < neck; y++) for (let x = 0; x < 48; x++) {
              const k = (y * 48 + x) * 4 + 3;
              if (fr.data[k]) expect(e.data[k], `${id} ${a} ${v} ${i} (${x},${y})`).toBe(0);
            }
          });
        });
      }
      // de frente las alas van detrás; de espaldas tapan la espalda (van delante)
      const front = EIGHT_VIEWS.indexOf('front'), back = EIGHT_VIEWS.indexOf('back');
      expect(opacos(al.delante.get('idle')![front][0])).toBe(0);
      expect(opacos(al.delante.get('idle')![back][0])).toBeGreaterThan(60);
      // en el golpe se abren más que en reposo; en hit se pliegan
      // cuánta ala se ve detrás, de frente (lo abierta que está)
      const anchoDe = (a: string, i: number) => opacos(al.detras.get(a)![front][i]);
      const golpe = renderClip(f, 48, 'attack', 'front').events?.find((q) => q.type === 'impacto');
      const gi = Math.floor((golpe?.phase ?? 0.5) * renderClip(f, 48, 'attack', 'front').frames.length);
      expect(anchoDe('attack', gi), id).toBeGreaterThan(anchoDe('idle', 0));
      expect(anchoDe('hit', 2), id).toBeLessThan(anchoDe('idle', 0));
      // la aureola: arriba de la cabeza en reposo
      const au = al.aura.get('idle')![front][0];
      let top = 48;
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (au.data[(y * 48 + x) * 4 + 3] === 255) top = Math.min(top, y);
      expect(top, id).toBeLessThan(renderClip(f, 48, 'idle', 'front', { joints: true }).joints![0].head[1]);
    }
  }, 120000);

  it('Alana tiene alas más chicas que Rick', () => {
    expect(escalaHeroina(familyFicha('alana', true))).toBeLessThan(escalaHeroina(familyFicha('rick', true)));
  });

  it('la túnica: cambia el pecho de la heroína, blanca y dorada, y su objeto es legendario', () => {
    const f = familyFicha('steph', true);
    const a = renderClip(sinEquipo(f), 48, 'idle', 'front').frames[0], b = renderClip(tunicaFicha(f), 48, 'idle', 'front').frames[0];
    const d = diferencia(a, b);
    expect(d.pixeles).toBeGreaterThan(60);
    let claros = 0;
    for (let i = 0; i < 48 * 48; i++) if (d.r.data[i * 4 + 3] && d.r.data[i * 4] > 200 && d.r.data[i * 4 + 1] > 190) claros++;
    expect(claros).toBeGreaterThan(30);
    expect(tunicaItem()).toMatchObject({ id: 'tunica_celestial', rarity: 'legendary', base: { cat: 'armor', slot: 'chest' } });
    expect([retratoCelestial(f).w, retratoCelestial(f).h]).toEqual([40, 40]);
  });

  it('efectos del tamaño del encargo; la lanza pega de lado a lado', () => {
    const want: [Raster[], number, number][] = [[lanzaLuz(), 32, 6], [impactoLuz(), 48, 8], [estelaAlas(), 32, 6], [auraCelestial(), 64, 8]];
    for (const [fr, s, n] of want) { expect(fr).toHaveLength(n); for (const r of fr) expect([r.w, r.h]).toEqual([s, s]); }
    // la columna 0 y la 31 de la lanza tienen el mismo grosor (más o menos 1 px): se repite sin costura
    for (const r of lanzaLuz()) {
      const col = (x: number) => { let n = 0; for (let y = 0; y < 32; y++) if (r.data[(y * 32 + x) * 4 + 3] > 200) n++; return n; };
      expect(Math.abs(col(0) - col(31))).toBeLessThanOrEqual(2);
    }
  });

  it('íconos y audio', () => {
    expect(celestialSkillIcons().map((s) => s.name)).toEqual(['alas', 'lanza_luz', 'ciclo']);
    for (const s of celestialSkillIcons()) expect(opacos(s.frames[0])).toBeGreaterThan(400);
    const dur = (b: Float32Array) => b.length / RATE;
    expect(dur(alasVuelo())).toBeLessThan(1.2);
    expect(dur(lanzaLuzSonido())).toBeLessThan(1.5);
    const coro = celestialDespierta();
    expect(dur(coro)).toBeGreaterThan(2);
    expect(dur(coro)).toBeLessThan(5);
    for (const b of [alasVuelo(), lanzaLuzSonido(), coro]) expect(b.every((v) => Number.isFinite(v) && Math.abs(v) <= 1)).toBe(true);
  });
});
