import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { EFFECTS, EFFECT_GROUPS, EFFECT_NAMES, expandEffects, renderEffect, effectSheet } from '../fx/catalog';
import { renderSfx, renderMusic, SFX_NAMES } from '../audio/sfx';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';
import { encodePng, decodePng, createRaster, blit } from '../index';
import type { Raster } from '../core/raster';
import { ROOT } from './helpers';

const opaque = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i]) n++; return n; };
const RENDERED = EFFECTS.map((d) => ({ d, ...renderEffect(d) }));
/** Los ids que pide el lote F (PEDIDO.md, sección 11). */
const PEDIDO = [
  'polvo_correr', 'polvo_frenar', 'polvo_caer', 'chispa_golpe_liviano', 'chispa_golpe_medio', 'chispa_golpe_pesado', 'estrellas_mareo', 'nube_ko',
  'vena_enojo', 'gota_nervios', 'sonrojo', 'exclamacion', 'interrogacion', 'lagrima_comica', 'sudor',
  'chapuzon_chico', 'chapuzon_grande', 'estela', 'ondas', 'confeti', 'serpentina', 'fuegos_artificiales', 'bola_tama', 'mecha_tejo',
  'estela_chapa', 'ventana_rota', 'pantalla_rota', 'lineas_velocidad', 'marco_corte', 'lluvia', 'salpicadura_piso', 'onda_charco', 'relampago', 'calor',
  'rayo_catatumbo', 'onda_furro', 'rafaga_abanico', 'vapor_termo', 'aura_nekketsu', 'humo_moto', 'petalo_buganvilla', 'hoja', 'arena', 'brillo_record', 'huella_mojada',
];
const MIN: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] } };

describe('catálogo de efectos (lote F)', () => {
  it('trae todo lo del pedido, con los 3 tamaños de polvo, los 3 pesos de chispa y los 4 colores de fuegos', () => {
    for (const id of PEDIDO) expect(EFFECT_NAMES, id).toContain(id);
    for (const b of ['polvo_correr', 'polvo_frenar', 'polvo_caer']) expect(expandEffects([b]).map((e) => e.id)).toEqual(['chico', 'medio', 'grande'].map((s) => `${b}_${s}`));
    expect(expandEffects(['fuegos_artificiales'])).toHaveLength(4);
    expect(expandEffects(['bola_tama']).map((e) => e.id)).toEqual(['bola_tama', 'bola_tama_explota', 'bola_tama_cartel']);
    expect(new Set(EFFECTS.map((e) => e.id)).size).toBe(EFFECTS.length);
    for (const g of EFFECT_GROUPS) expect(expandEffects([g]).length, g).toBeGreaterThan(0);
  });

  it('cada efecto: sus cuadros del tamaño de su celda, el ancla adentro, pixeles nítidos y nada que pase de 4096', () => {
    for (const { d, w, h, frames } of RENDERED) {
      expect(frames, d.id).toHaveLength(d.cuadros);
      for (const f of frames) expect([f.w, f.h], d.id).toEqual([w, h]);
      if (!d.pantalla) {
        expect(d.ancla[0], d.id).toBeGreaterThanOrEqual(0); expect(d.ancla[0], d.id).toBeLessThan(w);
        expect(d.ancla[1], d.id).toBeGreaterThanOrEqual(0); expect(d.ancla[1], d.id).toBeLessThan(h);
      }
      for (const f of frames) for (let i = 3; i < f.data.length; i += 4) if (f.data[i] !== 0 && f.data[i] !== 255) throw new Error(`${d.id}: alfa ${f.data[i]}`);
      const { sheet } = effectSheet(frames, w, h);
      expect(Math.max(sheet.w, sheet.h), d.id).toBeLessThanOrEqual(4096);
      expect(d.uso.es.length, d.id).toBeGreaterThan(10);
      expect(d.uso.en.length, d.id).toBeGreaterThan(10);
    }
  });

  it('ningún cuadro queda vacío, salvo los apagones del relámpago y el primero del corte de anime', () => {
    const allowed: Record<string, number[]> = { relampago: [2, 5], marco_corte: [0] };
    for (const { d, frames } of RENDERED)
      frames.forEach((f, k) => { if (!allowed[d.id]?.includes(k)) expect(opaque(f), `${d.id} cuadro ${k}`).toBeGreaterThan(0); });
  });

  it('los de pantalla completa toman la resolución del juego y pasan a varias filas si no caben', () => {
    const d = EFFECTS.find((e) => e.id === 'marco_corte')!;
    expect(renderEffect(d, [320, 180]).frames[3].w).toBe(320);
    const big = renderEffect(d, [1280, 720]);
    const { sheet, columnas } = effectSheet(big.frames, big.w, big.h);
    expect(columnas).toBe(3);
    expect([sheet.w, sheet.h]).toEqual([3840, 1440]);
  });

  it('es determinista: los mismos pixeles cada vez', () => {
    for (const { d, frames } of RENDERED.filter((r) => !r.d.pantalla)) {
      const again = renderEffect(d).frames;
      frames.forEach((f, k) => expect(Buffer.from(again[k].data).equals(Buffer.from(f.data)), `${d.id} ${k}`).toBe(true));
    }
  });

  it('imagen dorada: el cuadro del medio de cada efecto', () => {
    const list = RENDERED.filter((r) => !r.d.pantalla);
    const cols = 8, cw = 64, ch = 64;
    const out = createRaster(cols * cw, Math.ceil(list.length / cols) * ch + 160);
    list.forEach((r, i) => blit(out, r.frames[Math.floor(r.d.cuadros / 2)], (i % cols) * cw, Math.floor(i / cols) * ch));
    const file = join(ROOT, 'golden', 'efectos.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_efectos.png'), encodePng(out)); }
    expect(same, 'cambió efectos; mira out/golden_actual_efectos.png').toBe(true);
  });
});

describe('kit a medida: fx y audio', () => {
  it('los sonidos salen iguales pidan los que pidan (cada uno arranca de la misma semilla)', () => {
    const a = renderSfx('golpe'); renderSfx('romper');
    const b = renderSfx('golpe');
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
    renderSfx('critico');
    expect(Buffer.from(renderMusic('victoria').buffer).equals(Buffer.from(renderMusic('victoria').buffer))).toBe(true);
  });

  it('fx y audio: errores de dedo con sugerencia, nombres que llegan después como aviso', () => {
    expect(validateKitConfig({ ...MIN, fx: ['chispa_golpe_pesada'], audio: { sfx: ['ladridoo'] } })).toEqual([
      'fx[0]: "chispa_golpe_pesada" no es un efecto. ¿Quisiste decir "chispa_golpe_pesado"?',
      'audio.sfx[0]: "ladridoo" no es un sonido del motor. ¿Quisiste decir "ladrido"?',
    ]);
    // los del lote H no son errores: golpe_1 no es golpe mal escrito, aro no es arco
    expect(validateKitConfig({ ...MIN, audio: { sfx: ['golpe_1', 'aro', 'silbato'], musica: ['marcha_nekketsu'], voces: true } })).toEqual([]);
    expect(validateKitConfig({ ...MIN, audio: ['golpe'] as unknown as KitConfig['audio'] })).toEqual(['audio: tiene que ser un objeto, por ejemplo { "sfx": ["golpe", "paso"] }']);
  });

  it('el kit trae los efectos y los sonidos pedidos, con su entrada en el manifiesto', () => {
    const { files, warnings } = buildCustomKit({ ...MIN, resolucion: [320, 180], fx: ['polvo_correr', 'reaccion', 'lineas_velocidad', 'bola_tama'], audio: { sfx: ['golpe', 'paso', 'silbato'], ambientes: ['agua'], voces: ['locutor'] } }, {}, { quick: true, solo: ['efectos', 'audio'] });
    const names = files.map((f) => f.name);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(Object.keys(m.fx)).toEqual([
      'polvo_correr_chico', 'polvo_correr_medio', 'polvo_correr_grande', 'vena_enojo', 'gota_nervios', 'sonrojo', 'exclamacion', 'interrogacion',
      'lagrima_comica', 'sudor', 'bola_tama', 'bola_tama_explota', 'bola_tama_cartel', 'lineas_velocidad',
    ]);
    for (const [id, e] of Object.entries<any>(m.fx)) {
      expect(names, id).toContain(e.archivo);
      const png = decodePng(files.find((f) => f.name === e.archivo)!.bytes);
      expect(png.w, id).toBe(e.w * e.columnas);
      expect(png.h, id).toBe(e.h * Math.ceil(e.cuadros / e.columnas));
    }
    expect(m.fx.polvo_correr_medio).toMatchObject({ w: 24, h: 24, celda: 24, cuadros: 6, fps: 14, loop: false, se_pega_a: 'pies', capa: 'frente', grupo: 'polvo' });
    expect(m.fx.lineas_velocidad).toMatchObject({ w: 320, h: 180, se_pega_a: 'pantalla' });
    expect(m.fx.bola_tama.estados).toEqual(['entera', 'golpeada', 'agrietada', 'por_abrir']);
    expect(m.audio).toEqual({
      sfx: { golpe: { archivo: 'audio/sfx/golpe.wav', duracion: expect.any(Number) }, paso: { archivo: 'audio/sfx/paso.wav', duracion: expect.any(Number) } },
      ambientes: { agua: { archivo: 'audio/ambiente/agua.wav', duracion: expect.any(Number), bucle: true } },
    });
    for (const a of ['audio/sfx/golpe.wav', 'audio/sfx/paso.wav', 'audio/ambiente/agua.wav']) {
      const b = files.find((f) => f.name === a)!.bytes;
      expect(new TextDecoder().decode(b.slice(0, 4)), a).toBe('RIFF');
    }
    expect(warnings).toEqual([
      'audio.voces: todavía no se genera, llega con el audio (lote H)',
      'audio.sfx: todavía no existen, llegan con el lote H: silbato',
    ]);
    expect(m.pendiente).toEqual(warnings);
  });

  it('audio: true trae todos los sonidos del motor', () => {
    const { files } = buildCustomKit({ ...MIN, audio: { sfx: true } }, {}, { quick: true, solo: ['audio'] });
    expect(files.filter((f) => f.name.startsWith('audio/sfx/'))).toHaveLength(SFX_NAMES.length);
  });
});
