import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { bajadaPanels, nieveFrente, logoHielo, type CinePanel } from '../cine/bajada';
import { finPanels, logoFin, primeraLuz } from '../cine/fin';
import { GUION_BAJADA, GUION_FIN } from '../cine/kit';
import { textoMascara } from '../ui/fonts';
import { cineBajadaMusica, cineFinMusica, cineRugido } from '../audio/sintesis';
import { RATE } from '../audio/sfx';
import type { Raster } from '../core/raster';

/** el panel armado (todas las capas en su primer o último cuadro) */
function armar(p: CinePanel, ultimo = false): Raster {
  const f = { w: p.w, h: p.h, data: new Uint8ClampedArray(p.w * p.h * 4) };
  for (const c of p.capas) { const s = c.frames[ultimo ? c.frames.length - 1 : 0]; for (let i = 0; i < p.w * p.h; i++) { const a = s.data[i * 4 + 3] / 255; if (a) for (let q = 0; q < 3; q++) f.data[i * 4 + q] = f.data[i * 4 + q] * (1 - a) + s.data[i * 4 + q] * a; } }
  return f;
}
const luz = (r: Raster) => { let s = 0; for (let i = 0; i < r.w * r.h; i++) s += (r.data[i * 4] + r.data[i * 4 + 1] + r.data[i * 4 + 2]) / 3; return s / (r.w * r.h); };
const tiras = (p: CinePanel) => p.capas.every((c) => c.frames.length * p.w <= 4096);

function formato(panels: CinePanel[], ids: string[], altos: Record<string, number>) {
  expect(panels.map((p) => p.id)).toEqual(ids);
  for (const p of panels) {
    expect([p.w, p.h], p.id).toEqual([480, altos[p.id] ?? 270]);
    expect(p.capas.length, p.id).toBeGreaterThanOrEqual(2);
    expect(p.capas.length, p.id).toBeLessThanOrEqual(4);
    expect(tiras(p), `${p.id}: una tira pasa de 4096`).toBe(true);
    for (const c of p.capas) {
      expect(c.paralaje, `${p.id} ${c.nombre}`).toBeGreaterThan(0);
      for (const f of c.frames) expect([f.w, f.h], `${p.id} ${c.nombre}`).toEqual([p.w, p.h]);
      if (c.por_heroina) {
        expect(Object.keys(c.por_heroina).sort(), p.id).toEqual(['alana', 'rick', 'sophie', 'steph']);
        for (const fr of Object.values(c.por_heroina)) expect(fr).toHaveLength(c.frames.length);
      }
    }
    // el fondo tapa todo; algo se mueve (alguna capa con más de un cuadro)
    let op = 0; for (let i = 3; i < p.capas[0].frames[0].data.length; i += 4) if (p.capas[0].frames[0].data[i] === 255) op++;
    expect(op / (p.w * p.h), p.id).toBeGreaterThan(0.99);
    expect(p.capas.some((c) => c.frames.length > 1), p.id).toBe(true);
    expect(p.notas.length, p.id).toBeGreaterThan(40);
  }
}

describe('la cinemática de bajada (F13, parte 1)', () => {
  const panels = bajadaPanels();
  it('seis paneles en el formato del intro (la escalera 480 x 540, con la heroína de cada perfil)', () => {
    formato(panels, ['bajada_puerta', 'bajada_escalera', 'bajada_lago', 'bajada_ladrona', 'bajada_diablo', 'bajada_titulo'], { bajada_escalera: 540 });
    expect(panels[1].capas.some((c) => c.por_heroina)).toBe(true);
  });
  it('lo más oscuro del juego: ningún panel pasa de un brillo medio bajo, y el Diablo abre los ojos', () => {
    for (const p of panels) expect(luz(armar(p, true)), p.id).toBeLessThan(70);
    // los ojos: en el último cuadro hay mucho más rojo encendido que en el primero
    const d = panels[4], rojo = (r: Raster) => { let n = 0; for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4] > 230 && r.data[i * 4 + 1] < 120) n++; return n; };
    expect(rojo(d.capas[1].frames[7])).toBeGreaterThan(rojo(d.capas[1].frames[0]) + 50);
  });
  it('nieve de adelante y logo de hielo', () => {
    const nv = nieveFrente();
    expect(nv).toHaveLength(8);
    for (const f of nv) expect([f.w, f.h]).toEqual([128, 128]);
    const fuente = 'node_modules/@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff';
    if (!existsSync(fuente)) return;
    const b = readFileSync(fuente), bold = b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer;
    const lh = logoHielo([textoMascara(bold, 'EL CORAZÓN', 6), textoMascara(bold, 'HELADO', 6)]);
    expect(lh).toHaveLength(16);
    expect(lh[0].w * 4).toBeLessThanOrEqual(4096);
    expect(lh[0].w).toBeLessThanOrEqual(480);
    // se arma: el primer cuadro casi sin hielo claro, el último con las grietas rojas
    const rojo = (r: Raster) => { let n = 0; for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4 + 3] === 255 && r.data[i * 4] > 200 && r.data[i * 4 + 2] < 80) n++; return n; };
    expect(rojo(lh[15])).toBeGreaterThan(rojo(lh[0]) + 30);
  });
  it('guion y audio: cinco subtítulos, la música de 60 s y el rugido grave', () => {
    expect(GUION_BAJADA.filter((g) => g.subtitulo)).toHaveLength(5);
    expect(GUION_BAJADA.map((g) => g.panel)).toEqual(panels.map((p) => p.id));
    expect(cineBajadaMusica().length / RATE).toBeCloseTo(60, 0);
    const rug = cineRugido();
    expect(rug.length / RATE).toBeLessThan(4);
    // grave: casi toda la energía por debajo de ~300 Hz (cruces por cero pocos)
    let cruces = 0; for (let i = 1; i < rug.length; i++) if ((rug[i] >= 0) !== (rug[i - 1] >= 0)) cruces++;
    expect(cruces / (rug.length / RATE) / 2).toBeLessThan(300);
  }, 60000);
});

describe('la cinemática de cierre (F13, parte 2)', () => {
  const panels = finPanels();
  it('seis paneles en el formato del intro (los pisos 480 x 540, las alas para cada heroína)', () => {
    formato(panels, ['fin_cae', 'fin_llama', 'fin_pisos', 'fin_amanecer', 'fin_alas', 'fin_titulo'], { fin_pisos: 540 });
    expect(panels[4].capas.some((c) => c.por_heroina)).toBe(true);
  });
  it('de terror a esperanza: empieza oscura y el amanecer y las alas son mucho más claros que la caída', () => {
    const l = panels.map((p) => luz(armar(p, true)));
    expect(l[0]).toBeLessThan(50);
    expect(l[3]).toBeGreaterThan(l[0] * 2.5);
    expect(l[4]).toBeGreaterThan(l[0] * 2.5);
    // los pisos se prenden: el último cuadro mucho más claro que el primero
    expect(luz(panels[2].capas[1].frames[7])).toBeGreaterThan(luz(panels[2].capas[1].frames[0]) + 10);
  });
  it('la Primera Luz es de luz: dorada y blanca cuando ya se volvió luz', () => {
    const r = primeraLuz(1.6, 0, 1);
    let claros = 0, total = 0;
    for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4 + 3] === 255) { total++; if (r.data[i * 4] > 220 && r.data[i * 4 + 1] > 180) claros++; }
    expect(claros / total).toBeGreaterThan(0.5);
  });
  it('logo de "Fin" y "¿o no?", guion y música', () => {
    expect(GUION_FIN.filter((g) => g.subtitulo)).toHaveLength(5);
    expect(GUION_FIN.map((g) => g.panel)).toEqual(panels.map((p) => p.id));
    const s = cineFinMusica().length / RATE;
    expect(s).toBeGreaterThanOrEqual(60);
    expect(s).toBeLessThanOrEqual(75);
    const fuente = 'node_modules/@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff';
    if (!existsSync(fuente)) return;
    const b = readFileSync(fuente), bold = b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer;
    const lf = logoFin(textoMascara(bold, 'Fin', 8), textoMascara(bold, '¿o no?', 2));
    expect(lf).toHaveLength(16);
    // "¿o no?" no está en el primer cuadro y sí en el último (abajo)
    const abajo = (r: Raster) => { let n = 0; for (let y = Math.floor(r.h * 0.72); y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3] === 255 && r.data[(y * r.w + x) * 4] > 200) n++; return n; };
    expect(abajo(lf[0])).toBeLessThan(5);
    expect(abajo(lf[15])).toBeGreaterThan(20);
  }, 60000);
});
