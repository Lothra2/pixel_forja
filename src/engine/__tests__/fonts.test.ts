import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { bitmapFonts, drawText, VIETNAMESE_CHARS, splitMarks, type BitmapFont } from '../ui/fonts';
import { buildSportsKit } from '../kit/sportskit';
import { familyFicha } from '../rpg/family';
import { encodePng, decodePng, createRaster, blit } from '../index';
import { ROOT } from './helpers';

const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
const D = join(ROOT, 'node_modules', '@fontsource', 'silkscreen', 'files');
const SILK = { regular: ab(join(D, 'silkscreen-latin-400-normal.woff')), bold: ab(join(D, 'silkscreen-latin-700-normal.woff')) };
const FONTS = bitmapFonts(SILK.regular, SILK.bold);
/** Las frases de prueba del pedido (G1) */
const PHRASES = ['Rồng Sài Gòn', 'Đá cầu', 'Bà Hoa', 'Tuấn', 'Trời ơi'];

type Char = { x: number; y: number; w: number; h: number; xo: number; yo: number; adv: number };
const charsOf = (f: BitmapFont) => {
  const m = new Map<string, Char>();
  for (const r of f.fnt.matchAll(/<char id="(\d+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" xoffset="(-?\d+)" yoffset="(-?\d+)" xadvance="(\d+)"/g))
    m.set(String.fromCodePoint(+r[1]), { x: +r[2], y: +r[3], w: +r[4], h: +r[5], xo: +r[6], yo: +r[7], adv: +r[8] });
  return m;
};
/** el dibujo de una letra en el atlas (alfa > 0) */
const bitmapOf = (f: BitmapFont, c: Char) => {
  let s = '';
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) s += f.png.data[((c.y + y) * f.png.w + c.x + x) * 4 + 3] ? '#' : '.';
  return `${c.w}x${c.h}@${c.xo},${c.yo}:${s}`;
};

describe('fuentes con vietnamita (lote G1)', () => {
  it('las tres fuentes traen ă, â, ê, ô, ơ, ư, đ, Đ y los 5 tonos en todas las vocales, mayúscula y minúscula', () => {
    const must = 'ăâêôơưđĐĂÂÊÔƠƯ' + 'àáảãạ' + 'ằắẳẵặ' + 'ầấẩẫậ' + 'èéẻẽẹ' + 'ềếểễệ' + 'ìíỉĩị' + 'òóỏõọ' + 'ồốổỗộ' + 'ờớởỡợ' + 'ùúủũụ' + 'ừứửữự' + 'ỳýỷỹỵ';
    for (const f of FONTS) {
      const cs = charsOf(f);
      for (const ch of [...must, ...must.toUpperCase()]) expect(cs.has(ch), `${f.name} ${ch}`).toBe(true);
    }
    // 146 letras: 12 vocales x 6 tonos x 2, más đ y Đ. Fuera de la lista quedan las 12 vocales sin nada y las 10 con
    // agudo que ya estaban (á, é, í, ó, ú en mayúscula y minúscula)
    expect(VIETNAMESE_CHARS.length).toBe(12 * 6 * 2 + 2 - 12 - 10);
    expect(splitMarks('ấ')).toEqual({ base: 'a', marks: ['circumflex', 'acute'] });
    expect(splitMarks('Đ')).toEqual({ base: 'D', marks: ['stroke'] });
  });

  it('cada tono se distingue de los otros a 8 px (y de la letra sin tono)', () => {
    const ui = FONTS[0], cs = charsOf(ui);
    for (const v of ['a', 'ă', 'â', 'e', 'ê', 'i', 'o', 'ô', 'ơ', 'u', 'ư', 'y']) {
      const forms = ['', '̀', '́', '̉', '̃', '̣'].map((t) => (v + t).normalize('NFC'));
      const bits = forms.map((ch) => bitmapOf(ui, cs.get(ch)!));
      expect(new Set(bits).size, v).toBe(6);
    }
  });

  it('ninguna letra pisa a la siguiente: lo dibujado (con la sombra) termina antes del avance', () => {
    for (const f of FONTS) {
      const pad = f.name === 'fuente_ui' ? 0 : 1, shadow = f.name === 'fuente_ui' ? 1 : 3;
      for (const [ch, c] of charsOf(f)) if (VIETNAMESE_CHARS.includes(ch)) expect(c.xo + pad + c.w - shadow, `${f.name} ${ch}`).toBeLessThanOrEqual(c.adv);
    }
  });

  it('la fuente de ui sigue nítida (solo pixeles enteros) y las frases de prueba no tienen letras de más', () => {
    const ui = FONTS[0];
    const alphas = new Set<number>(); for (let i = 3; i < ui.png.data.length; i += 4) alphas.add(ui.png.data[i]);
    expect([...alphas].sort((a, b) => a - b)).toEqual([0, 255]);
    for (const f of FONTS) { const cs = charsOf(f); for (const p of PHRASES) for (const ch of p) if (ch !== ' ') expect(cs.has(ch), `${f.name} ${ch}`).toBe(true); }
  });

  it('el kit deportivo trae las fuentes con --fuentes, con su crédito', () => {
    const files = buildSportsKit({ athletes: { rick: { ...familyFicha('rick'), movementProfile: 'premium' } }, packs: ['pelea'], quick: true, fuentes: SILK });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    for (const n of ['fuente_ui', 'fuente_titulo', 'fuente_titulo_plata']) {
      expect(m.ui.fuentes[n]).toMatchObject({ png: `ui/fuentes/${n}.png`, fnt: `ui/fuentes/${n}.fnt` });
      expect(files.some((x) => x.name === `ui/fuentes/${n}.png`)).toBe(true);
      const fnt = new TextDecoder().decode(files.find((x) => x.name === `ui/fuentes/${n}.fnt`)!.bytes);
      expect(fnt).toContain(`<char id="${'ồ'.codePointAt(0)}"`);
    }
    expect(new TextDecoder().decode(files.find((x) => x.name === 'CREDITOS.txt')!.bytes)).toContain('Silkscreen');
    // sin la opción, no hay fuentes
    const plain = buildSportsKit({ athletes: { rick: { ...familyFicha('rick'), movementProfile: 'premium' } }, packs: ['pelea'], quick: true });
    expect(plain.some((x) => x.name.startsWith('ui/'))).toBe(false);
  }, 120_000);

  it('imagen dorada: las frases de prueba en las tres fuentes', () => {
    const rows = FONTS.map((f) => drawText(f, PHRASES.join(' · ')));
    const out = createRaster(Math.max(...rows.map((r) => r.w)), rows.reduce((a, r) => a + r.h, 0));
    let y = 0; for (const r of rows) { blit(out, r, 0, y); y += r.h; }
    const file = join(ROOT, 'golden', 'fuentes_vietnamita.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_fuentes_vietnamita.png'), encodePng(out)); }
    expect(same, 'cambió fuentes_vietnamita; mira out/golden_actual_fuentes_vietnamita.png').toBe(true);
  });
});
