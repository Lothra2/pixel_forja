import { rng } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { ObliqueLayout } from './layout';
import { ferry, tonosDe } from './skyline';
import type { VidaEscena } from './escena';

/**
 * La vida de los tramos del Cross de Saigón (lote E2), además de la del hẻm: vendedoras y toldos del mercado, el río
 * con jacintos, ferry, botes y brillos, la ropa al viento de las azoteas, y el público y las banderas del estadio.
 * Cada pieza va en la capa cerca, sobre lo pintado, en coordenadas de pantalla a escala 1.
 */
export function vidaSaigon(pal: Paleta, L: ObliqueLayout, W: number, seed: number): VidaEscena[] {
  const FT = L.franja.atras, R = rng(seed * 7 + 3), out: VidaEscena[] = [];
  const quiere = (t: string) => L.vida.includes(t);
  const rango = (tema: string) => L.ranuras_deco.filter((r) => r.tema === tema).map((r) => [r.x0, Math.min(W, r.x1 >= L.largo ? W : r.x1)] as const);
  const lienzo = (w: number, h: number) => new Lienzo(w, h, pal);

  // ---------------------------------------------------------------- mercado Bến Thành
  for (const [a, b] of rango('mercado_interior')) {
    if (quiere('toldos_viento')) for (let x = a + 20, i = 0; x < b - 60; x += 160, i++) {
      const col: Color = (['azul', 'verde', 'rojo', 'oro'] as Color[])[i % 4];
      const cuadros = [0, 1, 2].map((f) => { const c = lienzo(44, 9); cenefa(c, 0, 0, 44, col, f); return c; });
      out.push({ id: `toldo_${i}`, tipo: 'toldos_viento', capa: 'cerca', x, y: FT - 100, cuadros, fps: 3 });
    }
    if (quiere('vendedoras_pregonando')) for (let x = a + 140, i = 0; x < b - 40; x += 420 + Math.floor(R() * 120), i++) {
      const ropa: Color = (['rojo', 'celeste', 'luz', 'amarillo'] as Color[])[i % 4];
      const cuadros = [0, 1, 2, 1].map((f) => { const c = lienzo(20, 30); vendedora(c, 4, 29, ropa, f); return c; });
      out.push({ id: `vendedora_${i}`, tipo: 'vendedoras_pregonando', capa: 'cerca', x, y: FT - 30, cuadros, fps: 4 });
    }
  }

  // ---------------------------------------------------------------- río Saigón
  const bandas = [...rango('malecon_bach_dang').map(([a, b]) => ({ a, b, y0: FT - 44, y1: FT - 12 })), ...rango('rio_landmark81').map(([a, b]) => ({ a, b, y0: FT - 34, y1: FT - 2 }))];
  for (const [k, bd] of bandas.entries()) {
    if (quiere('agua_animada')) for (let x = bd.a, i = 0; x < bd.b - 64; x += 128, i++) {
      const cuadros = [0, 1, 2].map((f) => { const c = lienzo(64, bd.y1 - bd.y0); brillos(c, seed + i * 31 + f * 7, L.hora === 'tarde'); return c; });
      out.push({ id: `brillos_${k}_${i}`, tipo: 'agua_animada', capa: 'cerca', x, y: bd.y0, cuadros, fps: 3 });
    }
    if (quiere('jacintos_flotando')) for (let i = 0; i < Math.max(1, Math.round((bd.b - bd.a) / 300)); i++) {
      const cuadros = [0, 1].map((f) => { const c = lienzo(20, 8); jacintoChico(c, 10, 4 + f, seed + i); return c; });
      out.push({ id: `jacinto_${k}_${i}`, tipo: 'jacintos_flotando', capa: 'cerca', x: bd.a + Math.floor(R() * (bd.b - bd.a - 20)), y: bd.y0 + 8 + Math.floor(R() * (bd.y1 - bd.y0 - 16)), cuadros, fps: 1, velocidad: -8, cada: 0 });
    }
    if (quiere('botes_bambu')) for (let i = 0; i < 2; i++) {
      const cuadros = [0, 1].map((f) => { const c = lienzo(18, 10); thungChai(c, 9, 6 + f); return c; });
      out.push({ id: `thung_chai_${k}_${i}`, tipo: 'botes_bambu', capa: 'cerca', x: bd.a + 60 + Math.floor(R() * (bd.b - bd.a - 120)), y: bd.y1 - 12, cuadros, fps: 1 });
    }
    if (quiere('ferry') && k === 0) {
      const T = tonosDe(L.hora, false);
      const cuadros = [0, 1].map((f) => { const c = lienzo(70, 26); ferry(c, 4, 24 - f, T, 1.2); return c; });
      out.push({ id: 'ferry_lejos', tipo: 'ferry', capa: 'cerca', x: Math.min(W - 80, bd.b - 100), y: bd.y0 - 8, cuadros, fps: 1, velocidad: -14, cada: 0 });
    }
  }

  // ---------------------------------------------------------------- azoteas
  if (quiere('ropa_viento')) for (const [a, b] of rango('azoteas_cafes').concat(L.paralaje.cerca === 'azoteas' && !rango('azoteas_cafes').length ? [[0, W] as const] : [])) {
    for (let x = a + 90, i = 0; x < b - 60; x += 260 + Math.floor(R() * 120), i++) {
      const w = 34 + Math.floor(R() * 20), s = seed + i * 13;
      const cuadros = [0, 1].map((f) => { const c = lienzo(w + 6, 12); cuerdaRopa(c, 0, 1, w, s, f); return c; });
      out.push({ id: `ropa_viento_${i}`, tipo: 'ropa_viento', capa: 'cerca', x, y: FT - 76 - Math.floor(R() * 30), cuadros, fps: 2 });
    }
  }

  // ---------------------------------------------------------------- estadio
  for (const [a, b] of rango('gradas_llenas')) {
    if (quiere('publico_ondeando')) for (let x = a + 30, i = 0; x < b - 50; x += 96, i++) {
      const y = 84 + 9 * (2 + (i % 5));
      const cuadros = [0, 1, 2, 1].map((f) => { const c = lienzo(40, 10); hinchas(c, seed + i, f); return c; });
      out.push({ id: `ola_${i}`, tipo: 'publico_ondeando', capa: 'cerca', x, y, cuadros, fps: 6 });
    }
    if (quiere('banderas')) for (let x = a + 80, i = 0; x < b - 30; x += 150 + Math.floor(R() * 60), i++) {
      const cuadros = [0, 1, 2].map((f) => { const c = lienzo(24, 22); banderaOndea(c, 2, 2, f); return c; });
      out.push({ id: `bandera_${i}`, tipo: 'banderas', capa: 'cerca', x, y: 84 + 8 + Math.floor(R() * 26), cuadros, fps: 5 });
    }
  }
  return out;
}

/** La cenefa de un toldo de rayas en ondas que el viento levanta (`f` de 0 a 2). */
function cenefa(c: Lienzo, x: number, y: number, w: number, col: Color, f: number) {
  for (let i = 0; i < w; i++) {
    const raya = Math.floor(i / 4) % 2 === 0, lev = Math.round(Math.sin((i / w) * Math.PI * 2 + f * 2) * (f === 0 ? 0 : 1));
    for (let j = 0; j < 5; j++) c.p(x + i, y + j + lev, raya ? col : 'crema');
    const onda = i % 4 === 1 || i % 4 === 2;
    c.p(x + i, y + 5 + lev, onda ? (raya ? col : 'crema') : 'sombra');
    if (onda) c.p(x + i, y + 6 + lev, 'sombra');
  }
}

/** Vendedora con nón lá que pregona: el brazo sube y baja junto a la boca. Pies en (x, gy). */
function vendedora(c: Lienzo, x: number, gy: number, ropa: Color, f: number) {
  // pantalón negro y blusa
  c.f(x + 3, gy - 9, 3, 9, 'sombra'); c.f(x + 7, gy - 9, 3, 9, 'sombra');
  c.f(x + 2, gy - 19, 9, 11, ropa); c.vl(x + 10, gy - 19, 11, 'sombra');
  // cara y el nón lá
  c.f(x + 4, gy - 23, 5, 4, 'ocre'); c.p(x + 7, gy - 22, 'tinta');
  for (let j = 0; j < 5; j++) c.hl(x + 6 - j - 1, gy - 28 + j, 2 + j * 2 + 1, j === 4 ? 'ocre' : 'amarillo');
  // el brazo: abajo, a media altura o la mano en la boca para gritar
  if (f === 0) c.vl(x + 1, gy - 18, 8, ropa);
  else if (f === 1) { c.ln(x + 2, gy - 18, x - 2, gy - 14, ropa); c.p(x - 3, gy - 14, 'ocre'); }
  else { c.ln(x + 10, gy - 18, x + 12, gy - 23, ropa); c.p(x + 11, gy - 23, 'ocre'); c.p(x + 13, gy - 24, 'luz'); c.p(x + 15, gy - 25, 'luz'); }
  c.vl(x + 11, gy - 18, 7, ropa);
}

/** Brillos que tiemblan en el agua: rayitas de luz (de oro en la tarde). */
function brillos(c: Lienzo, seed: number, oro: boolean) {
  const R = rng(seed);
  for (let i = 0; i < 9; i++) { const y = Math.floor(R() * c.h), x = Math.floor(R() * (c.w - 6)), len = 2 + Math.floor(R() * 4) + Math.floor((y / c.h) * 3); c.hl(x, y, len, R() < 0.4 ? 'luz' : oro ? 'oro' : 'cielo'); }
}

/** Una isla chica de jacintos que baja con la corriente; `cy` sube y baja un pixel. */
function jacintoChico(c: Lienzo, cx: number, cy: number, seed: number) {
  const R = rng(seed);
  c.d(cx, cy + 1, 8, 'verde_oscuro', 0.35);
  for (let i = 0; i < 9; i++) { const x = Math.round(cx + (R() - 0.5) * 14), y = Math.round(cy + (R() - 0.5) * 3); c.d(x, y, 1.6, 'verde', 0.8); c.p(x - 1, y - 1, 'menta'); }
  c.p(cx - 2, cy - 3, 'salmon'); c.p(cx - 2, cy - 4, 'celeste'); c.p(cx + 3, cy - 3, 'celeste');
}

/** Thúng chai: el bote redondo de bambú que se mece. */
function thungChai(c: Lienzo, cx: number, cy: number) {
  c.d(cx, cy, 8, 'terracota', 0.45); c.d(cx, cy - 1, 7, 'ocre', 0.4); c.d(cx, cy - 1, 5, 'sombra', 0.3);
  for (let i = -6; i <= 6; i += 3) c.p(cx + i, cy + 1, 'amarillo');
  c.hl(cx - 9, cy + 3, 18, 'cielo');
}

/** Una cuerda con ropa al viento: en el cuadro 1 la ropa se va de lado. */
function cuerdaRopa(c: Lienzo, x: number, y: number, w: number, seed: number, f: number) {
  const R = rng(seed);
  c.hl(x, y, w, 'sombra');
  for (let cx = x + 2; cx < x + w - 5; cx += 7) {
    const col = (['luz', 'rojo', 'azul', 'amarillo', 'celeste'] as Color[])[Math.floor(R() * 5)], h = R() < 0.5 ? 8 : 5;
    for (let j = 0; j < h; j++) { const dx = f ? Math.floor((j * 3) / h) : 0; c.f(cx + dx, y + 1 + j, 5, 1, col); c.p(cx + dx + 4, y + 1 + j, col === 'luz' ? 'cemento_claro' : 'sombra'); }
  }
}

/** Un pedazo de tribuna que levanta los brazos (la ola): `f` 0 sentados, 1 medio, 2 arriba. */
function hinchas(c: Lienzo, seed: number, f: number) {
  const R = rng(seed);
  const ropa: Color[] = ['rojo', 'amarillo', 'luz', 'rojo', 'oro', 'azul'];
  for (let x = 0; x < c.w - 4; x += 5) {
    const col = ropa[Math.floor(R() * ropa.length)], dy = f === 2 ? -1 : 0;
    c.f(x, 5 + dy, 4, 4, col); c.d(x + 1.5, 3 + dy, 1.6, (['ocre', 'terracota', 'crema'] as Color[])[Math.floor(R() * 3)]); c.p(x + 1, 2 + dy, 'tinta');
    if (f > 0) { c.p(x, 3 - f + dy, col); c.p(x + 3, 3 - f + dy, col); if (f === 2) { c.p(x, 1 + dy, 'ocre'); c.p(x + 3, 1 + dy, 'ocre'); } }
  }
}

/** Bandera de Vietnam que ondea en su asta (3 cuadros). */
function banderaOndea(c: Lienzo, x: number, y: number, f: number) {
  c.vl(x, y, 20, 'cemento_claro');
  const fw = 18, fh = 12;
  for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) { const dy = Math.round(Math.sin((i / fw) * Math.PI * 1.6 + f * 2.1) * 1.6 * (i / fw)); c.p(x + 1 + i, y + j + dy, j === fh - 1 ? 'vino' : 'rojo'); }
  const sx = x + 1 + fw / 2, sy = y + fh / 2, wob = Math.round(Math.sin(0.5 * Math.PI * 1.6 + f * 2.1) * 0.8);
  for (const [dx, dy] of [[0, -3], [-1, -1], [0, -1], [1, -1], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [-1, 1], [0, 1], [1, 1], [-2, 2], [2, 2]]) c.p(Math.round(sx + dx), Math.round(sy + dy + wob), 'oro');
}
