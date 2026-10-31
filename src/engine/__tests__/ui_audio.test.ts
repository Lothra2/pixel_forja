import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { retroUi, gameLogo, UI_PARTS, BANNERS, DEFAULT_TEAM_COLORS } from '../ui/retro';
import { MUSIC_DEPORTE, SFX_DEPORTE, blip, vozDe, BLIPS, thirdBelow } from '../audio/deporte';
import { SONIDOS, renderSound, JINGLES } from '../audio/catalogo';
import { listenPage } from '../audio/escuchar';
import { RATE } from '../audio/sfx';
import { buildCustomKit, validateKitConfig, type KitConfig, type Codificador } from '../kit/custom';
import { codificadorFfmpeg, hayFfmpeg } from '../../../scripts/codificador-ffmpeg';
import { encodePng, decodePng, createRaster, blit } from '../index';
import type { Raster } from '../core/raster';
import { ROOT } from './helpers';

const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
const D = join(ROOT, 'node_modules', '@fontsource', 'silkscreen', 'files');
const SILK = { regular: ab(join(D, 'silkscreen-latin-400-normal.woff')), bold: ab(join(D, 'silkscreen-latin-700-normal.woff')) };
const opaque = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i]) n++; return n; };
const rms = (b: Float32Array, from = 0, to = b.length) => { let s = 0; for (let i = from; i < to; i++) s += b[i] * b[i]; return Math.sqrt(s / Math.max(1, to - from)); };
const MIN: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] } };
/** Lo que pide el lote H1 (PEDIDO.md, sección 13). */
const H1_SFX = ['pistola', 'silbato', 'golpe_1', 'golpe_2', 'golpe_3', 'golpe_pesado', 'chancleta', 'silla', 'pote', 'levantar', 'lanzar', 'caer_plano', 'mareo', 'ko', 'publico_grito', 'publico_ooh'];

describe('interfaz retro (lote G1)', () => {
  const pieces = retroUi(SILK.bold);
  const by = (n: string) => pieces.find((p) => p.name === n)!;

  it('trae todo lo del pedido: diálogo, paneles en 6 colores, barras, marcos de 40 y 96, 7 banners, controles, minimapa y números', () => {
    for (const n of ['dialogo', 'dialogo_flecha', 'barra_marco', 'barra_aguante', 'barra_nekketsu', 'barra_nekketsu_llena', 'marco_retrato_40', 'marco_retrato_96', 'minimapa_barra', 'minimapa_meta', 'minimapa_salida', 'minimapa_marcador', 'numeros', 'numeros_placa'])
      expect(by(n), n).toBeDefined();
    expect(pieces.filter((p) => p.name.startsWith('panel_'))).toHaveLength(6);
    for (const b of BANNERS) expect(by(`banner_${b}`), b).toBeDefined();
    for (const c of ['palanca', 'palanca_bola', 'a', 'b', 'c', 'especial', 'pausa']) expect(by(`control_${c}`).frames, c).toHaveLength(2);
    // las 8 retro de G1; desde ahí, las del envoltorio (lote G2, ver g2.test.ts)
    expect(UI_PARTS.slice(0, 8)).toEqual(['dialogo', 'paneles', 'barras', 'marcos', 'banners', 'controles', 'minimapa', 'numeros']);
  });

  it('cada pieza: cuadros de su tamaño, nada vacío, pixeles nítidos, 9-slice con bordes que caben', () => {
    for (const p of pieces) {
      for (const f of p.frames) {
        expect([f.w, f.h], p.name).toEqual([p.w, p.h]);
        for (let i = 3; i < f.data.length; i += 4) if (f.data[i] !== 0 && f.data[i] !== 255) throw new Error(`${p.name}: alfa ${f.data[i]}`);
      }
      // la flecha titila: un cuadro vacío a propósito
      p.frames.forEach((f, k) => { if (!(p.name === 'dialogo_flecha' && k === 3)) expect(opaque(f), `${p.name} ${k}`).toBeGreaterThan(0); });
      if (p.nueve) { expect(p.nueve[0] + p.nueve[2], p.name).toBeLessThan(p.w); expect(p.nueve[1] + p.nueve[3], p.name).toBeLessThan(p.h); }
      if (p.tres) expect(p.tres[0] + p.tres[1], p.name).toBeLessThan(p.w);
    }
  });

  it('el centro de una pieza 9-slice se puede repetir: sus filas y columnas del medio son iguales', () => {
    for (const p of pieces.filter((x) => x.nueve)) {
      const f = p.frames[0], [l, t, r, b] = p.nueve!;
      const px = (x: number, y: number) => f.data.slice((y * f.w + x) * 4, (y * f.w + x) * 4 + 4).join();
      // en la franja de arriba, todas las columnas del medio son iguales (si no, al estirar se ve la costura)
      for (let y = 0; y < t; y++) for (let x = l + 1; x < f.w - r; x++) expect(px(x, y), `${p.name} (${x},${y})`).toBe(px(l, y));
      for (let x = 0; x < l; x++) for (let y = t + 1; y < f.h - b; y++) expect(px(x, y), `${p.name} (${x},${y})`).toBe(px(x, t));
    }
  });

  it('los paneles toman los colores de los equipos', () => {
    const custom = retroUi(SILK.bold, ['paneles'], { familia_gg: ['#2a5bd7', '#f2c230'] });
    expect(custom.map((p) => p.name)).toEqual(['panel_familia_gg']);
    expect(custom[0].extra?.colores).toEqual(['#2a5bd7', '#f2c230']);
    expect(DEFAULT_TEAM_COLORS).toHaveLength(6);
  });

  it('el logo sale del texto, en 320 x 112 y 160 x 56, con 8 cuadros de brillo, y cabe', () => {
    for (const [w, h] of [[320, 112], [160, 56]]) {
      const f = gameLogo(SILK.bold, 'NEKKETSU OLYMPIC GG', w, h);
      expect(f).toHaveLength(8);
      expect([f[0].w, f[0].h]).toEqual([w, h]);
      expect(opaque(f[0])).toBeGreaterThan(w * h * 0.12);
      // nada pegado al borde
      for (let x = 0; x < w; x++) { expect(f[0].data[x * 4 + 3], `arriba ${x}`).toBe(0); expect(f[0].data[((h - 1) * w + x) * 4 + 3], `abajo ${x}`).toBe(0); }
      expect(Buffer.from(f[0].data).equals(Buffer.from(f[4].data))).toBe(false);
    }
    // otro texto, otro logo
    const a = gameLogo(SILK.bold, 'GG ABYSS', 320, 112)[0], b = gameLogo(SILK.bold, 'NEKKETSU OLYMPIC GG', 320, 112)[0];
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false);
  });

  it('imagen dorada: el logo y todas las piezas', () => {
    const logo = gameLogo(SILK.bold, 'NEKKETSU OLYMPIC GG', 320, 112)[0];
    const out = createRaster(800, 640);
    blit(out, logo, 0, 0);
    let x = 330, y = 0, rowH = 0;
    for (const p of pieces) {
      if (x + p.w > 800) { x = 0; y = Math.max(y + rowH + 4, 116); rowH = 0; }
      blit(out, p.frames[0], x, y); x += p.w + 4; rowH = Math.max(rowH, p.h);
    }
    const file = join(ROOT, 'golden', 'interfaz.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_interfaz.png'), encodePng(out)); }
    expect(same, 'cambió interfaz; mira out/golden_actual_interfaz.png').toBe(true);
  });
});

describe('audio de la rebanada (lote H1)', () => {
  it('trae lo del pedido: 5 músicas y los 16 efectos', () => {
    for (const n of ['marcha_nekketsu', 'saigon_chay', 'azotea_final', 'victoria_banda', 'derrota']) expect(SONIDOS.musica, n).toContain(n);
    for (const n of H1_SFX) expect(SONIDOS.sfx, n).toContain(n);
    expect(Object.keys(SFX_DEPORTE)).toHaveLength(16);
  });

  it('la marcha dura 60 s exactos a 132 bpm, y los temas en bucle empalman sin salto', () => {
    const m = MUSIC_DEPORTE.marcha_nekketsu();
    expect(m.length / RATE).toBeCloseTo(60, 2);
    for (const n of ['marcha_nekketsu', 'saigon_chay', 'azotea_final'] as const) {
      const b = renderSound('musica', n);
      expect(b.loop, n).toBe(true);
      const s = b.samples;
      // el salto entre el último y el primer valor no es más grande que los saltos normales de la pieza
      let typ = 0; for (let i = 1; i < s.length; i += 13) typ += Math.abs(s[i] - s[i - 1]);
      typ /= s.length / 13;
      expect(Math.abs(s[0] - s[s.length - 1]), n).toBeLessThan(typ * 4 + 0.01);
      // suena todo el tiempo: ningún tramo de medio segundo en silencio
      for (let i = 0; i + RATE / 2 <= s.length; i += RATE / 2) expect(rms(s, i, i + RATE / 2), `${n} en ${i / RATE} s`).toBeGreaterThan(0.01);
    }
    for (const j of JINGLES) if (SONIDOS.musica.includes(j)) expect(renderSound('musica', j).loop, j).toBe(false);
  });

  it('los efectos son cortos, sin cola muda y no saturan', () => {
    for (const n of H1_SFX) {
      const s = renderSound('sfx', n).samples;
      expect(s.length / RATE, n).toBeLessThan(2.5);
      expect(rms(s, s.length - Math.round(0.02 * RATE)), `${n}: cola`).toBeLessThan(0.05);
      let peak = 0; for (const v of s) peak = Math.max(peak, Math.abs(v));
      expect(peak, n).toBeLessThanOrEqual(0.9);
      expect(rms(s), n).toBeGreaterThan(0.02);
    }
  });

  it('determinista: cada sonido sale igual siempre', () => {
    for (const n of ['golpe_1', 'publico_grito']) expect(Buffer.from(renderSound('sfx', n).samples.buffer).equals(Buffer.from(renderSound('sfx', n).samples.buffer))).toBe(true);
    const a = MUSIC_DEPORTE.saigon_chay(), b = MUSIC_DEPORTE.saigon_chay();
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
  });

  it('la segunda trompeta va en terceras de verdad', () => {
    expect(['Bb4', 'D5', 'F5', 'C5', 'Eb5', 'G5', 'A4'].map((n) => thirdBelow(n, 'Bb'))).toEqual(['G4', 'Bb4', 'D5', 'A4', 'C5', 'Eb5', 'F4']);
    expect(thirdBelow('Ab5', 'Eb')).toBe('F5');
  });

  it('voces en blips: tono y timbre por personaje, 4 variantes distintas', () => {
    expect(vozDe('sophie', { edad: 'nino' }).tono).toBeGreaterThan(vozDe('rick', {}).tono);
    expect(vozDe('steph', { femenina: true }).tono).toBeGreaterThan(vozDe('kenji', {}).tono);
    expect(vozDe('goro', { celda: 64 }).tono).toBeLessThan(vozDe('goro', {}).tono);
    expect(vozDe('rick')).toEqual(vozDe('rick'));
    const v = vozDe('rick');
    const bl = Array.from({ length: BLIPS }, (_, k) => blip(v, k));
    for (const b of bl) { expect(b.length / RATE).toBeCloseTo(0.075, 2); expect(rms(b)).toBeGreaterThan(0.05); }
    expect(new Set(bl.map((b) => Buffer.from(b.buffer).toString('base64'))).size).toBe(BLIPS);
  });

  it('la página para escuchar trae cada sonido y el probador de voces', () => {
    const html = listenPage('Prueba <b>', { musica: { marcha_nekketsu: { archivo: 'audio/musica/marcha_nekketsu.wav', duracion: 60, bucle: true } }, sfx: { silbato: { archivo: 'audio/sfx/silbato.wav', duracion: 0.7 } } }, { rick: { tono: 0.9, timbre: 'cuadrada', archivos: ['audio/voz/rick_0.wav'] } });
    expect(html).toContain('"musica/marcha_nekketsu.wav"');
    expect(html).toContain('"sfx/silbato.wav"');
    expect(html).toContain('"voz/rick_0.wav"');
    expect(html).toContain('Prueba &#60;b&#62;');
    expect(html).not.toContain('<b>');
  });
});

describe('kit a medida: interfaz, logo, sonidos de H1 y voces', () => {
  it('valida ui.interfaz y audio.voces con sugerencias', () => {
    expect(validateKitConfig({ ...MIN, ui: { interfaz: ['dialogo', 'banerz'] }, audio: { voces: { rick: { tono: 5, timbre: 'cuadrad' } } } } as unknown as KitConfig)).toEqual([
      'ui.interfaz[1]: "banerz" no es una pieza de interfaz. ¿Quisiste decir "banners"? Hay dialogo, paneles, barras, marcos, banners, controles, minimapa, numeros, medallas, podio, iconos, banderas, tarjetas, marco_vs, pantallas, mapa, intro, tenis, bordes',
      'audio.voces.rick.tono: un número entre 0.3 y 3 (1 = 220 Hz)',
      'audio.voces.rick.timbre: "cuadrad" no es un timbre. ¿Quisiste decir "cuadrada"? Hay cuadrada, aguda, triangulo, sierra',
    ]);
    expect(validateKitConfig({ ...MIN, ui: { logo: { texto: ' ' } } })).toEqual(['ui.logo: { "texto": "NOMBRE DEL JUEGO" }']);
    expect(() => buildCustomKit({ ...MIN, ui: { interfaz: true } })).toThrowError(/faltan los archivos de Silkscreen/);
  });

  it('el kit trae el logo, la interfaz, los sonidos, las voces y audio/escuchar.html, todo en el manifiesto', () => {
    const cfg: KitConfig = {
      ...MIN, ui: { logo: { texto: 'MI JUEGO' }, interfaz: ['dialogo', 'banners', 'controles'] },
      audio: { sfx: ['silbato', 'golpe_1'], musica: ['victoria_banda'], voces: ['rick', 'locutor'] },
    };
    const { files, warnings } = buildCustomKit(cfg, { fuentes: SILK }, { quick: true, solo: ['interfaz', 'audio', 'atletas'] });
    expect(warnings).toEqual([]);
    const names = files.map((f) => f.name);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.ui.logo).toMatchObject({ archivo: 'ui/logo.png', w: 320, h: 112, cuadros: 8, texto: 'MI JUEGO', chico: { archivo: 'ui/logo_chico.png', w: 160, h: 56 } });
    expect(decodePng(files.find((f) => f.name === 'ui/logo.png')!.bytes).w).toBe(320 * 8);
    expect(Object.keys(m.ui.interfaz)).toEqual(['dialogo', 'dialogo_flecha', ...BANNERS.map((b) => `banner_${b}`), ...['palanca', 'palanca_bola', 'a', 'b', 'c', 'especial', 'pausa'].map((c) => `control_${c}`)]);
    expect(m.ui.interfaz.control_a).toMatchObject({ cuadros: 2, estados: ['normal', 'presionado'] });
    expect(m.ui.interfaz.dialogo).toMatchObject({ nueve: [8, 8, 8, 8] });
    expect(m.ui.interfaz.banner_meta.texto).toHaveLength(4);
    for (const e of Object.values<any>(m.ui.interfaz)) {
      expect(names).toContain(e.archivo);
      // los datos extra de cada pieza no pisan los del contrato
      if (e.cuadros !== undefined) expect(typeof e.cuadros, e.archivo).toBe('number');
      expect(typeof e.w).toBe('number');
    }
    expect(m.audio.sfx.silbato).toMatchObject({ archivo: 'audio/sfx/silbato.wav' });
    expect(m.audio.musica.victoria_banda.bucle).toBeUndefined();
    expect(m.audio.voces.rick.archivos).toHaveLength(4);
    expect(m.audio.voces.locutor).toMatchObject({ tono: expect.any(Number), timbre: expect.any(String) });
    expect(m.atletas.rick.voz).toMatchObject({ tono: m.audio.voces.rick.tono, timbre: m.audio.voces.rick.timbre });
    expect(m.audio.escuchar).toBe('audio/escuchar.html');
    expect(names).toContain('audio/escuchar.html');
    for (const f of [...m.audio.voces.rick.archivos, ...m.audio.voces.locutor.archivos]) expect(names).toContain(f);
  }, 60_000);

  it('una voz se puede fijar en la configuración', () => {
    const { files } = buildCustomKit({ ...MIN, audio: { voces: { locutor: { tono: 0.7, timbre: 'sierra' } } } }, {}, { quick: true, solo: ['audio'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.audio.voces.locutor).toMatchObject({ tono: 0.7, timbre: 'sierra' });
  });
});

describe('audio comprimido para el celular (lote H1b)', () => {
  const manifest = (files: { name: string; bytes: Uint8Array }[]) => JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
  const cfg: KitConfig = { ...MIN, audio: { formato: 'comprimido', sfx: ['silbato'], musica: ['victoria_banda'], ambientes: ['viento'], voces: ['rick'] } };
  const pedidos: string[] = [];
  const falso: Codificador = (wav, formato, kbps) => { pedidos.push(`${formato}@${kbps}`); return new TextEncoder().encode(`${formato}:${kbps}:${wav.length}`); };

  it('OGG primero y M4A de respaldo, con los kbps que pidió el juego, y las voces siguen en WAV', () => {
    const { files, warnings } = buildCustomKit(cfg, {}, { quick: true, solo: ['audio'], codificar: falso });
    const m = manifest(files);
    expect(warnings).toEqual([]);
    expect(m.audio.musica.victoria_banda).toMatchObject({ archivo: ['audio/musica/victoria_banda.ogg', 'audio/musica/victoria_banda.m4a'], frecuencia: RATE });
    expect(Math.abs(m.audio.musica.victoria_banda.muestras / RATE - m.audio.musica.victoria_banda.duracion)).toBeLessThan(0.01);
    expect(m.audio.ambientes.viento).toMatchObject({ archivo: ['audio/ambiente/viento.ogg', 'audio/ambiente/viento.m4a'], bucle: true });
    expect(m.audio.sfx.silbato.archivo).toEqual(['audio/sfx/silbato.ogg', 'audio/sfx/silbato.m4a']);
    expect(pedidos.sort()).toEqual(['m4a@48', 'm4a@64', 'm4a@64', 'ogg@48', 'ogg@64', 'ogg@64']);
    expect(m.audio.voces.rick.archivos.every((a: string) => a.endsWith('.wav'))).toBe(true);
    const names = files.map((f) => f.name);
    expect(names.filter((n) => /\.(wav)$/.test(n) && !n.startsWith('audio/voz/'))).toEqual([]);
    // la página para escuchar toca el que el navegador entienda
    const html = new TextDecoder().decode(files.find((f) => f.name === 'audio/escuchar.html')!.bytes);
    expect(html).toContain('"f":["musica/victoria_banda.ogg","musica/victoria_banda.m4a"]');
    expect(html).toContain('canPlayType');
  });

  it('sin codificador: los efectos salen en WAV y la música y los ambientes quedan pendientes, no en WAV', () => {
    const { files, warnings } = buildCustomKit(cfg, {}, { quick: true, solo: ['audio'] });
    const m = manifest(files);
    expect(m.audio.sfx.silbato.archivo).toEqual(['audio/sfx/silbato.wav']);
    expect(m.audio.musica).toBeUndefined();
    expect(m.audio.ambientes).toBeUndefined();
    expect(files.some((f) => f.name.startsWith('audio/musica/') || f.name.startsWith('audio/ambiente/'))).toBe(false);
    expect(m.pendiente).toEqual(warnings);
    expect(warnings.join('\n')).toMatch(/audio\.musica\.victoria_banda: sin codificador/);
    expect(warnings.join('\n')).toMatch(/audio\.ambientes\.viento: sin codificador/);
    expect(warnings.join('\n')).toMatch(/audio\.sfx: sin codificador \(ffmpeg\) salen en WAV: silbato/);
  });

  it('el formato por defecto sigue siendo WAV con "archivo" de texto (GG Abyss no cambia)', () => {
    const { files } = buildCustomKit({ ...MIN, audio: { sfx: ['silbato'] } }, {}, { quick: true, solo: ['audio'], codificar: falso });
    expect(manifest(files).audio.sfx.silbato.archivo).toBe('audio/sfx/silbato.wav');
  });

  it('valida audio.formato con sugerencia', () => {
    expect(validateKitConfig({ ...MIN, audio: { formato: 'comprimdo' } } as unknown as KitConfig)).toEqual(['audio.formato: "comprimdo" no es un formato. ¿Quisiste decir "comprimido"? Hay wav, comprimido']);
  });

  it.skipIf(!hayFfmpeg())('con ffmpeg: la marcha de 60 s pesa cerca de 500 KB, sale igual cada vez y el bucle no se corre', () => {
    const cod = codificadorFfmpeg()!;
    const { files } = buildCustomKit({ ...MIN, audio: { formato: 'comprimido', musica: ['marcha_nekketsu'] } }, {}, { quick: true, solo: ['audio'], codificar: cod });
    const m = manifest(files).audio.musica.marcha_nekketsu;
    const ogg = files.find((f) => f.name === m.archivo[0])!.bytes, m4a = files.find((f) => f.name === m.archivo[1])!.bytes;
    expect(m.duracion).toBe(60);
    expect(ogg.length).toBeLessThan(560_000);
    expect(m4a.length).toBeLessThan(560_000);
    expect(Buffer.from(ogg).equals(Buffer.from(files2().find((f) => f.name === m.archivo[0])!.bytes))).toBe(true);
    // decodificado, el OGG trae exacto las muestras del original y el M4A a lo sumo 64 de más al final
    const largo = (b: Uint8Array, ext: string) => {
      const p = join(mkdtempSync(join(tmpdir(), 'h1b-')), `x.${ext}`);
      writeFileSync(p, b);
      return spawnSync('ffmpeg', ['-v', 'error', '-i', p, '-f', 's16le', '-'], { maxBuffer: 1 << 26 }).stdout.length / 2;
    };
    expect(largo(ogg, 'ogg')).toBe(m.muestras);
    expect(largo(m4a, 'm4a') - m.muestras).toBeGreaterThanOrEqual(0);
    expect(largo(m4a, 'm4a') - m.muestras).toBeLessThanOrEqual(64);
    function files2() { return buildCustomKit({ ...MIN, audio: { formato: 'comprimido', musica: ['marcha_nekketsu'] } }, {}, { quick: true, solo: ['audio'], codificar: codificadorFfmpeg()! }).files; }
  });
});
