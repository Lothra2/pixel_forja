import { describe, it, expect } from 'vitest';
import { skillIcons } from '../ui/icons2';
import { hudSprites } from '../ui/hud';
import { premiumPortal, premiumPortals, PORTAL_MUNDO } from '../world/portales';
import { bosqueObjects } from '../world/bosqueMap';
import { catedralMapObjects } from '../world/catedralMap';
import { galeriasMapObjects } from '../world/galeriasMap';

/** Pendientes del juego (#38, #39 y #40). */
describe('pendientes del juego', () => {
  it('#38: el ícono de ataque, 40 x 40 redondo, con aro dorado y las espadas claras', () => {
    const at = skillIcons().find((s) => s.name === 'ataque')!;
    expect(at).toBeTruthy();
    const f = at.frames[0];
    expect([f.w, f.h]).toEqual([40, 40]);
    // redondo: las esquinas vacías
    for (const [x, y] of [[0, 0], [39, 0], [0, 39], [39, 39]]) expect(f.data[(y * 40 + x) * 4 + 3], `${x},${y}`).toBe(0);
    // el aro arriba tira a dorado claro y abajo a dorado oscuro
    const px = (x: number, y: number) => Array.from(f.data.subarray((y * 40 + x) * 4, (y * 40 + x) * 4 + 3));
    const top = px(20, 2), bottom = px(20, 37);
    expect(top[0]).toBeGreaterThan(200);
    expect(top[0] + top[1]).toBeGreaterThan(bottom[0] + bottom[1]);
    // espadas claras en el centro
    let claro = 0;
    for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) { const [r, g, b] = px(x, y); if (r > 190 && g > 190 && b > 190) claro++; }
    expect(claro).toBeGreaterThan(20);
  });

  it('#39: el cinturón nuevo de 190 x 44 con 5 casilleros de 36 y el casillero de poción', () => {
    const ui = new Map(hudSprites().map((s) => [s.name, s.frames[0]]));
    const c = ui.get('cinturon')!;
    expect([c.w, c.h]).toEqual([190, 44]);
    // los 5 casilleros son oscuros por dentro (sin números pintados)
    for (let i = 0; i < 5; i++) {
      let claros = 0;
      for (let y = 10; y < 36; y++) for (let x = 5 + i * 36 + 6; x < 5 + i * 36 + 32; x++) { const k = (y * 190 + x) * 4; if (c.data[k] > 90) claros++; }
      expect(claros, `casillero ${i}`).toBe(0);
    }
    const p = ui.get('casillero_pocion')!;
    expect([p.w, p.h]).toEqual([36, 36]);
  });

  it('#40: portales de 96 x 128 con apoyo abajo, girar de 12, abrir de 8 y cerrar de 6, luz de 160', () => {
    for (const p of premiumPortals()) {
      expect([p.w, p.h], p.name).toEqual([96, 128]);
      expect(p.anchor[0], p.name).toBe(48);
      expect(p.anchor[1], p.name).toBeGreaterThan(118);
      expect(p.anims.girar.frames.length, p.name).toBe(12);
      expect(p.anims.abrir.frames.length, p.name).toBe(8);
      expect(p.anims.cerrar.frames.length, p.name).toBe(6);
      expect(p.anims.arco.frames.length, p.name).toBe(1);
      expect(p.anims.remolino.frames.length, p.name).toBe(12);
      expect(p.light!.radius, p.name).toBe(160);
      // el remolino se mueve: dos cuadros seguidos no son iguales
      const a = p.anims.girar.frames[0].data, b = p.anims.girar.frames[1].data;
      let diff = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      expect(diff, p.name).toBeGreaterThan(500);
    }
    // al abrir, las runas se prenden de a poco: el primer cuadro casi no tiene el color de las runas y el último sí
    const rojo = premiumPortal('rojo');
    const reds = (r: { data: Uint8ClampedArray | Uint8Array }) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && r.data[i] > 200 && r.data[i + 1] < 120) n++; return n; };
    expect(reds(rojo.anims.abrir.frames[0])).toBeLessThan(reds(rojo.anims.abrir.frames[7]));
    expect(PORTAL_MUNDO).toEqual({ mundo1: 'verde', mundo2: 'violeta', mundo3: 'ambar', mundo4: 'rojo', mundo5: 'plata', mundo6: 'brasa' });
  });

  it('cada mundo trae su portal premium (y los de siempre, azul y rojo, ya premium)', () => {
    const tiene = (objs: { name: string; w: number }[], n: string) => objs.find((o) => o.name === n)?.w;
    expect(tiene(bosqueObjects(), 'portal_verde')).toBe(96);
    expect(tiene(catedralMapObjects(), 'portal_violeta')).toBe(96);
    expect(tiene(galeriasMapObjects(), 'portal_ambar')).toBe(96);
    for (const objs of [bosqueObjects(), catedralMapObjects(), galeriasMapObjects()]) { expect(tiene(objs, 'portal_azul')).toBe(96); expect(tiene(objs, 'portal_rojo')).toBe(96); }
  });
}, 120_000);
