import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { introPanels, fuegoPared, humoGrande, logoFuego } from '../intro/intro';
import { renderLogo } from '../ui/fonts';
import { SFX, MUSIC, RATE } from '../audio/sfx';

describe('el intro cinematográfico (parte 4)', () => {
  const panels = new Map(introPanels().map((p) => [p.id, p]));

  it('los cinco paneles pintados, con sus capas, cuadros y fps del encargo', () => {
    const want: Record<string, [number, number, [string, number, number][]]> = {
      intro_bosque_noche: [480, 270, [['fondo', 1, 1], ['medio', 1, 1], ['frente', 4, 6]]],
      intro_corte_abismo: [480, 540, [['fondo', 1, 1], ['frente', 1, 1]]],
      intro_ojos: [480, 270, [['medio', 8, 8]]],
      intro_guardianes: [480, 270, [['fondo', 1, 1], ['frente', 4, 6]]],
      intro_familia: [480, 270, [['fondo', 1, 1], ['medio', 1, 1], ['frente', 6, 8]]],
    };
    for (const [id, [w, h, capas]] of Object.entries(want)) {
      const p = panels.get(id)!;
      expect([p.w, p.h], id).toEqual([w, h]);
      expect(p.capas.map((c) => [c.nombre, c.frames.length, c.fps]), id).toEqual(capas);
      for (const c of p.capas) for (const f of c.frames) expect([f.w, f.h], `${id} ${c.nombre}`).toEqual([w, h]);
      // el fondo tapa todo; las capas de adelante dejan ver lo de atrás
      const opaque = (r: { data: Uint8ClampedArray }) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i] === 255) n++; return n / (r.data.length / 4); };
      expect(opaque(p.capas[0].frames[0]), id).toBeGreaterThan(0.99);
      if (p.capas.length > 1) expect(opaque(p.capas[p.capas.length - 1].frames[0]), id).toBeLessThan(0.7);
    }
  });

  it('paleta oscura con el fuego como única luz fuerte: lo claro es cálido y abajo pesa más que arriba', () => {
    for (const p of panels.values()) {
      if (p.id === 'intro_corte_abismo') continue; // el corte tiene los cristales y el mar
      // el panel armado (todas las capas, primer cuadro)
      const f = { w: p.w, h: p.h, data: new Uint8ClampedArray(p.w * p.h * 4) };
      for (const c of p.capas) { const s = c.frames[0]; for (let i = 0; i < p.w * p.h; i++) { const a = s.data[i * 4 + 3] / 255; if (a) for (let q = 0; q < 3; q++) f.data[i * 4 + q] = f.data[i * 4 + q] * (1 - a) + s.data[i * 4 + q] * a; } }
      let warm = 0, bright = 0, top = 0, bottom = 0;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const i = (y * f.w + x) * 4, l = (f.data[i] + f.data[i + 1] + f.data[i + 2]) / 3;
        if (y < f.h / 3) top += l; else if (y > (f.h * 2) / 3) bottom += l;
        if (l > 110) { bright++; if (f.data[i] > f.data[i + 2]) warm++; }
      }
      // en la familia el fuego está detrás de ellas (el portal), no abajo: ahí la regla es el contraluz
      if (p.id !== 'intro_familia') expect(bottom, `${p.id}: la luz sale de abajo`).toBeGreaterThan(top);
      if (bright > 50) expect(warm / bright, `${p.id}: lo claro es fuego`).toBeGreaterThan(0.8);
    }
  });

  it('los ojos se abren de a poco, miran y parpadean', () => {
    const fr = panels.get('intro_ojos')!.capas[0].frames;
    const red = (r: { data: Uint8ClampedArray }) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i] > 180 && r.data[i + 1] < 140) n++; return n; };
    const v = fr.map(red);
    expect(v[1]).toBeGreaterThan(v[0]);
    expect(v[2]).toBeGreaterThan(v[1]);
    expect(v[4]).toBeGreaterThan(v[3]);
    expect(v[6]).toBeLessThan(v[5] * 0.5); // el parpadeo
    expect(v[7]).toBeGreaterThan(v[6]);
  });

  it('la pared de fuego pega de lado a lado y en el tiempo, sin piedras; el humo se desvanece', () => {
    const fp = fuegoPared();
    expect([fp.length, fp[0].w, fp[0].h]).toEqual([8, 128, 96]);
    const alpha = (r: { data: Uint8ClampedArray; w: number }, x: number, y: number) => r.data[(y * r.w + x) * 4 + 3];
    for (const f of fp) {
      let seam = 0, inner = 0;
      for (let y = 0; y < 96; y++) { seam += Math.abs(alpha(f, 127, y) - alpha(f, 0, y)); inner += Math.abs(alpha(f, 64, y) - alpha(f, 63, y)); }
      expect(seam).toBeLessThanOrEqual(inner * 3 + 255 * 4);
    }
    // sin piedras: nada gris en la base, todo es llama (rojo mayor que azul)
    for (let x = 0; x < 128; x++) { const i = (95 * 128 + x) * 4; expect(fp[0].data[i] > fp[0].data[i + 2], `x ${x}`).toBe(true); }
    const hm = humoGrande();
    expect([hm.length, hm[0].w, hm[0].h]).toEqual([6, 128, 128]);
    const sum = (r: { data: Uint8ClampedArray }) => { let s = 0; for (let i = 3; i < r.data.length; i += 4) s += r.data[i]; return s; };
    for (let k = 1; k < hm.length; k++) expect(sum(hm[k])).toBeLessThan(sum(hm[k - 1]));
  });

  it('el logo con fuego: el doble del logo de hoy, 16 cuadros', () => {
    const fontFile = 'node_modules/@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff';
    if (!existsSync(fontFile)) return;
    const b = readFileSync(fontFile);
    const logo = renderLogo(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)[0];
    const lf = logoFuego(logo);
    expect(lf.length).toBe(16);
    expect(lf[0].w).toBe(logo.w * 2);
    expect(lf[0].h).toBeGreaterThanOrEqual(logo.h * 2);
  });

  it('la música del intro: 27 s, golpes en 9, 13 y 23 s y medio segundo de silencio antes del título; el latido de 1.2 s', () => {
    const m = MUSIC.intro();
    expect(m.length / RATE).toBeCloseTo(27, 1);
    const rms = (t0: number, t1: number) => { let s = 0, n = 0; for (let i = Math.floor(t0 * RATE); i < Math.floor(t1 * RATE); i++) { s += m[i] * m[i]; n++; } return Math.sqrt(s / n); };
    for (const t of [9, 13, 23]) expect(rms(t, t + 0.3), `golpe en ${t}`).toBeGreaterThan(rms(t - 0.5, t - 0.05) * 1.5);
    expect(rms(22.55, 22.98)).toBeLessThan(0.001);
    let peak = 0;
    for (const v of m) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThanOrEqual(0.61);
    expect(SFX.latido().length / RATE).toBeCloseTo(1.2, 1);
  });
}, 300_000);
