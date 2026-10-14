import { createRaster, type Raster } from '../core/raster';
import { renderClip } from '../render/clip';
import { familyFicha, thorFicha, FAMILY, type FamilyId } from '../rpg/family';
import { type RGB, hex, mixc, clamp01, hash, vnoise, fbm, setPx, alphaAt, addLight, vgrad, glow, halo, fillPoly, stroke, curva, ellipse, contorno, canto, pegar, agrandar } from './pintura';
import { diabloRodillas, DIABLO } from './diablo';
import { alasCuadro, aureolaCuadro } from '../celestial/alas';
import { ladrona, type CinePanel } from './bajada';
import { tunicaFicha } from '../celestial/kit';

/**
 * La cinemática de cierre (encargo F13, parte 2): de terror a esperanza. Empieza oscura (el Diablo cae) y termina con
 * el amanecer más lindo del juego. Mismo formato que la bajada.
 */

const W = 480, H = 270;
const ORO = { hondo: hex('#c8902a'), oro: hex('#ffd45a'), claro: hex('#fff2b0'), blanco: hex('#ffffff') };

// ---------------------------------------------------------------- la Primera Luz

/**
 * La Primera Luz: una niña hecha de luz dorada y blanca. Cabeza grande y redonda (como las heroínas), dos colitas,
 * un vestidito acampanado, las manos juntas adelante y los ojos cerrados contentos (dos arquitos). Brilla sola.
 * `k` escala (1 = 40 px de alto), `f` el cuadro (respira y titila), `forma` de 0 (todavía sombra) a 1 (luz).
 */
export function primeraLuz(k: number, f: number, forma = 1): Raster {
  const S = Math.round(64 * k);
  const r = createRaster(S, S);
  const cx = S / 2, bob = Math.sin(f * 0.8) * k;
  const top = S * 0.18 + bob;
  const luz = (x: number, y: number, cx0: number, cy0: number, R: number): RGB => {
    const d = Math.hypot(x - cx0, y - cy0) / R;
    return mixc(ORO.blanco, ORO.oro, clamp01(d * 0.9 - 0.15));
  };
  const sombra = hex('#0e0b16');
  const col = (c: RGB) => mixc(sombra, c, forma);
  // el vestido: campana desde los hombros
  fillPoly(r, [[cx - 5 * k, top + 20 * k], [cx + 5 * k, top + 20 * k], [cx + 12 * k, top + 38 * k], [cx - 12 * k, top + 38 * k]], (x, y) => col(luz(x, y, cx, top + 26 * k, 16 * k)));
  // los piecitos
  for (const s of [-1, 1]) ellipse(r, cx + s * 4 * k, top + 39 * k, 2.4 * k, 1.4 * k, col(ORO.claro));
  // la cabeza y las colitas
  for (const s of [-1, 1]) ellipse(r, cx + s * 11 * k, top + 6 * k, 4 * k, 4.6 * k, col(luz(cx + s * 11 * k, top + 6 * k, cx, top + 10 * k, 14 * k)));
  ellipse(r, cx, top + 10 * k, 10 * k, 10 * k, (x, y) => col(luz(x, y, cx - 2 * k, top + 7 * k, 13 * k)));
  // las manos juntas adelante
  ellipse(r, cx, top + 25 * k, 3 * k, 2.4 * k, col(ORO.blanco));
  // la carita: ojos cerrados contentos y mejillas
  if (forma > 0.5) {
    for (const s of [-1, 1]) {
      for (let t = -1; t <= 1; t += 0.25) setPx(r, cx + s * 4 * k + t * 2 * k, top + 11 * k - Math.sqrt(1 - t * t) * 1.2 * k, ORO.hondo);
      ellipse(r, cx + s * 6 * k, top + 14 * k, 1.6 * k, 1 * k, hex('#ffb8a0'));
    }
    for (let t = -1; t <= 1; t += 0.25) setPx(r, cx + t * 1.6 * k, top + 15 * k + Math.sqrt(1 - t * t) * 0.8 * k, ORO.hondo);
  } else for (const s of [-1, 1]) setPx(r, cx + s * 4 * k, top + 11 * k, mixc(hex('#ff4a32'), ORO.claro, forma * 2));
  contorno(r, mixc(hex('#05040a'), ORO.oro, forma));
  // el brillo alrededor (sin pintar donde no hay nada: suma luz con alfa)
  if (forma > 0) {
    halo(r, cx, top + 20 * k, 28 * k, 30 * k, ORO.claro, 0.5 * forma * (0.9 + 0.1 * Math.sin(f)));
    for (let i = 0; i < 6; i++) if (hash(i, f, 400) > 0.5) { const a = hash(i, 1, 401) * Math.PI * 2, d = (14 + hash(i, 2, 401) * 12) * k; setPx(r, cx + Math.cos(a) * d, top + 20 * k + Math.sin(a) * d, ORO.blanco); }
  }
  return r;
}

/** espejo horizontal */
function espejo(src: Raster): Raster {
  const o = createRaster(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) o.data.set(src.data.subarray((y * src.w + x) * 4, (y * src.w + x) * 4 + 4), (y * src.w + src.w - 1 - x) * 4);
  return o;
}

// ---------------------------------------------------------------- 1. el Diablo cae

function grietasDeLuz(r: Raster, cx: number, cy: number, largo: number, seed: number, n = 9) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + hash(k, 1, seed) * 0.5;
    let x = cx, y = cy, ang = a;
    const pts: [number, number][] = [[x, y]];
    for (let s = 0; s < 8 && Math.hypot(x - cx, y - cy) < largo; s++) {
      ang += (hash(k, s, seed + 1) - 0.5) * 0.7;
      x += Math.cos(ang) * 16; y += Math.sin(ang) * 16 * 0.35;
      pts.push([x, y]);
    }
    curva(r, pts, (t) => 2.2 * (1 - t) + 0.6, (t, d) => (d < 0.5 ? ORO.blanco : t < 0.5 ? ORO.claro : ORO.oro));
  }
}

function cae(): CinePanel {
  const HZ = 128;
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#020307'], [0.45, '#060a14'], [0.47, '#0a1220'], [1, '#04070e']]);
  // columnas de hielo rotas alrededor de la arena, lejos
  for (let k = 0; k < 9; k++) {
    const x = 20 + k * 56, alto = 50 + hash(k, 1, 410) * 60, w = 8 + hash(k, 2, 410) * 8;
    fillPoly(fondo, [[x - w, HZ + 4], [x - w * 0.8, HZ - alto], [x, HZ - alto - 10 + hash(k, 3, 410) * 14], [x + w * 0.7, HZ - alto + 6], [x + w, HZ + 4]], (xx) => (xx < x ? hex('#1a3048') : hex('#0a1626')));
  }
  // el piso de hielo
  for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) setPx(fondo, x, y, mixc(hex('#060c16'), hex('#14263c'), clamp01((y - HZ) / 160 + vnoise(x * 0.1, y, 4, 411) * 0.15)));
  const medio: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H);
    const t = f / 7;
    // las grietas de luz se abren desde él, cada vez más largas y más brillantes
    grietasDeLuz(r, 240, 214, 40 + t * 240, 412, 11);
    halo(r, 240, 214, 60 + t * 160, 18 + t * 40, ORO.claro, 0.2 + t * 0.4);
    const d = diabloRodillas(W, H, 240, 222, 0.95, 1 - t * 0.8, mixc(ORO.oro, ORO.blanco, t));
    pegar(r, d, 0, 0);
    // luz desde abajo en el piso alrededor
    medio.push(r);
  }
  const frente: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(W, H);
    // pedazos de hielo que saltan y chispas de luz que suben
    for (let i = 0; i < 24; i++) {
      const fase = (hash(i, 1, 413) + f / 6) % 1;
      const a = -Math.PI / 2 + (hash(i, 2, 413) - 0.5) * 2.4;
      const x = 240 + Math.cos(a) * fase * 200, y = 214 + Math.sin(a) * fase * 120 + fase * fase * 60;
      if (i % 3) setPx(r, x, y, ORO.claro, Math.round(230 * (1 - fase)));
      else fillPoly(r, [[x - 2, y], [x, y - 3], [x + 3, y + 1], [x, y + 2]], hex('#8ab8e0'), Math.round(255 * (1 - fase)));
    }
    frente.push(r);
  }
  return { id: 'fin_cae', w: W, h: H, notas: 'El Diablo cae de rodillas en la arena. Las grietas de su piel se apagan y el hielo se rompe alrededor con grietas de luz que se abren (8 cuadros a 6 fps, sin bucle). Delante saltan pedazos de hielo y chispas.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.4 },
    { nombre: 'medio', frames: medio, fps: 6, paralaje: 0.8, bucle: false },
    { nombre: 'frente', frames: frente, fps: 10, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 2. la última llama vuelve: la Primera Luz

function llama(): CinePanel {
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#020307'], [0.5, '#070b16'], [1, '#0a1220']]);
  for (let y = 170; y < H; y++) for (let x = 0; x < W; x++) setPx(fondo, x, y, mixc(hex('#060c16'), hex('#122236'), clamp01((y - 170) / 100)));
  // el Diablo caído a la izquierda, ya apagado
  const dia = diabloRodillas(W, H, 120, 226, 0.78, 0.06, hex('#3a4a6a'));
  pegar(fondo, dia, 0, 0);
  // la llama viaja en un arco del pecho del Diablo a las manos de la Ladrona, y ella se vuelve luz
  const N = 8, ini: [number, number] = [120, 170], fin: [number, number] = [372, 176];
  const medio: Raster[] = [];
  for (let f = 0; f < N; f++) {
    const r = createRaster(W, H);
    const viaje = clamp01(f / 4), luz = clamp01((f - 4) / 3);
    // la Ladrona (encapuchada, mirando hacia la llama) se deshace y queda la Primera Luz
    if (luz < 1) {
      const lad = espejo(ladrona(f, 1.3, false).r);
      pegar(r, lad, 372 - lad.w * 0.55, 212 - lad.h, 1 - luz);
    }
    if (luz > 0) {
      const pl = primeraLuz(1.6, f, 1);
      pegar(r, pl, 372 - pl.w / 2, 210 - pl.h * 0.84, luz);
    }
    if (luz > 0) halo(r, 372, 172, 140 * luz, 110 * luz, ORO.claro, 0.35 * luz);
    // la llama y su estela
    if (f <= 4) {
      const pos = (u: number): [number, number] => [ini[0] + (fin[0] - ini[0]) * u, ini[1] + (fin[1] - ini[1]) * u - Math.sin(u * Math.PI) * 90];
      for (let s = 0; s < 14; s++) { const u = Math.max(0, viaje - s * 0.02); const [x, y] = pos(u); setPx(r, x, y, mixc(ORO.blanco, ORO.hondo, s / 14), Math.round(255 * (1 - s / 14))); }
      const [x, y] = pos(viaje);
      halo(r, x, y, 26, 26, ORO.oro, 0.6);
      ellipse(r, x, y, 4, 5, ORO.blanco);
      ellipse(r, x, y - 3, 2, 3, ORO.claro);
    }
    medio.push(r);
  }
  const frente: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(W, H);
    for (let i = 0; i < 30; i++) { const fase = (hash(i, 1, 420) + f / 6) % 1; setPx(r, hash(i, 2, 420) * W, H - fase * H * 0.8, ORO.claro, Math.round(160 * Math.sin(fase * Math.PI))); }
    frente.push(r);
  }
  return { id: 'fin_llama', w: W, h: H, notas: 'La última llama sale del pecho del Diablo (ya apagado, a la izquierda) y vuela en un arco hasta la Ladrona, que se vuelve luz: la Primera Luz, una niña de luz dorada y blanca con los ojos cerrados contentos (8 cuadros a 4 fps, sin bucle: 0 a 4 la llama viaja, 5 a 7 ella se ilumina).', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.5 },
    { nombre: 'medio', frames: medio, fps: 4, paralaje: 0.85, bucle: false },
    { nombre: 'frente', frames: frente, fps: 8, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 3. las luces suben por los siete pisos

function pisos(): CinePanel {
  const H2 = 540;
  // de abajo (el Corazón Helado) para arriba (el Bosque): cada piso con su color de luz
  const lista: { y: number; nombre: string; luz: string }[] = [
    { y: 490, nombre: 'corazon', luz: '#bfe4ff' }, { y: 420, nombre: 'fragua', luz: '#ff8a3a' }, { y: 350, nombre: 'ciudad', luz: '#ffd890' },
    { y: 280, nombre: 'faro', luz: '#7ac8ff' }, { y: 210, nombre: 'galerias', luz: '#c89aff' }, { y: 140, nombre: 'catedral', luz: '#7af0d8' }, { y: 70, nombre: 'bosque', luz: '#9aff8a' },
  ];
  const cx = (y: number) => 240 + Math.sin(y * 0.022) * 50;
  const fondo = createRaster(W, H2);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W; x++) {
    const n = fbm(x, y, 430), strata = Math.sin((y + n * 40) * 0.11) > 0.62 ? 1 : 0;
    setPx(fondo, x, y, mixc(hex('#07060a'), hex('#14121a'), strata * 0.5 + (n - 0.5) * 0.3));
  }
  // el cielo arriba, ya clareando, y el pozo que une los pisos
  vgrad(fondo, [[0, '#1a1a3a'], [1, '#3a2a4a']], 0, 30);
  for (let y = 30; y < H2; y++) { const c = cx(y); for (let dx = -8; dx <= 8; dx++) setPx(fondo, c + dx, y, hex('#030205')); }
  const silueta = (r: Raster, p: (typeof lista)[number], c: RGB) => {
    const x0 = cx(p.y), base = p.y + 14;
    if (p.nombre === 'bosque') for (let i = 0; i < 10; i++) { const x = x0 - 140 + i * 30, h = 16 + hash(i, 1, 431) * 12; fillPoly(r, [[x - 8, base], [x, base - h], [x + 8, base]], c); }
    if (p.nombre === 'catedral') for (let i = 0; i < 6; i++) { const x = x0 - 110 + i * 44; fillPoly(r, [[x - 3, base], [x - 3, base - 26], [x + 3, base - 26], [x + 3, base]], c); if (i < 5) curva(r, [[x, base - 26], [x + 22, base - 38], [x + 44, base - 26]], () => 1.6, c); }
    if (p.nombre === 'galerias') for (let i = 0; i < 12; i++) { const x = x0 - 130 + i * 23, h = 6 + hash(i, 2, 432) * 12; fillPoly(r, [[x - 3, base], [x, base - h], [x + 3, base]], c); }
    if (p.nombre === 'faro') { fillPoly(r, [[x0 + 60, base], [x0 + 64, base - 40], [x0 + 72, base - 40], [x0 + 76, base]], c); for (let x = x0 - 150; x < x0 + 150; x++) setPx(r, x, base - 2 + Math.sin(x * 0.3) * 1.5, c); }
    if (p.nombre === 'ciudad') for (let i = 0; i < 10; i++) { const x = x0 - 130 + i * 28, h = 12 + hash(i, 3, 433) * 22; fillPoly(r, [[x - 9, base], [x - 9, base - h], [x, base - h - 7], [x + 9, base - h], [x + 9, base]], c); }
    if (p.nombre === 'fragua') for (let i = 0; i < 5; i++) { const x = x0 - 110 + i * 55; fillPoly(r, [[x - 12, base], [x - 8, base - 12], [x + 8, base - 12], [x + 12, base]], c); }
    if (p.nombre === 'corazon') { fillPoly(r, [[x0 - 14, base], [x0 - 12, base - 26], [x0, base - 34], [x0 + 12, base - 26], [x0 + 14, base]], c); }
  };
  // medio: 8 cuadros; en cada uno se prende un piso más, de abajo para arriba, y una columna de luz sube por el pozo
  const medio: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H2);
    lista.forEach((p, k) => {
      const prendido = k < f, ahora = k === f - 1;
      const c0 = cx(p.y), cw = 170, ch = 30;
      const L = hex(p.luz);
      for (let y = p.y - ch; y <= p.y + ch; y++) for (let x = c0 - cw; x <= c0 + cw; x++) {
        const d = Math.hypot((x - c0) / cw, (y - p.y) / ch) + (vnoise(x, y, 10, 434 + k) - 0.5) * 0.2;
        if (d >= 1) continue;
        const up = clamp01((y - (p.y - ch)) / (2 * ch));
        setPx(r, x, y, prendido ? mixc(hex('#0a0810'), L, (0.25 + 0.45 * up) * (1 - d * 0.6)) : mixc(hex('#050408'), hex('#14121e'), (1 - d) * 0.6));
      }
      silueta(r, p, prendido ? hex('#020203') : hex('#0a0910'));
      if (prendido) { glow(r, c0, p.y + 6, cw, ch * 1.4, L, ahora ? 0.9 : 0.45); halo(r, c0, p.y, cw * 0.9, ch * 1.6, L, ahora ? 0.35 : 0.15); }
    });
    // la columna de luz que sube por el pozo hasta el piso que se prende
    const hasta = f > 0 ? lista[Math.min(lista.length - 1, f - 1)].y : H2;
    for (let y = hasta; y < H2; y++) { const c = cx(y); for (let dx = -5; dx <= 5; dx++) setPx(r, c + dx, y, mixc(ORO.blanco, ORO.oro, Math.abs(dx) / 5), Math.round(200 * (1 - Math.abs(dx) / 6))); }
    if (f > 0) halo(r, cx(hasta), hasta, 30, 30, ORO.blanco, 0.7);
    medio.push(r);
  }
  const frente = createRaster(W, H2);
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1, y0 = 30 + hash(i, 1, 435) * 480, len = 40 + hash(i, 2, 435) * 80, x0 = side < 0 ? 0 : W - 1;
    for (let t = 0; t < len; t++) { const x = x0 - side * (t * 0.8 + Math.sin(t * 0.08 + i) * 6), y = y0 + t * 0.6, w = 4 * (1 - t / len) + 1; for (let d = -w; d <= w; d++) setPx(frente, x, y + d, hex('#0a0606')); }
  }
  for (let y = 0; y < H2; y++) for (const side of [0, 1]) { const w = 16 + fbm(side * 99, y, 436) * 24; for (let x = 0; x < w; x++) setPx(frente, side ? W - 1 - x : x, y, hex('#070508')); }
  return { id: 'fin_pisos', w: W, h: H2, notas: 'El abismo en corte, como en el intro, pero al revés: una columna de luz sube por el pozo desde el Corazón Helado y cada piso se prende con su color (8 cuadros a 3 fps, sin bucle: el Corazón, la Fragua, la Ciudad, el Faro, las Galerías, la Catedral y el Bosque). 480 x 540: la cámara sube de abajo a arriba.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.8 },
    { nombre: 'medio', frames: medio, fps: 3, paralaje: 0.9, bucle: false },
    { nombre: 'frente', frames: [frente], fps: 1, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 4. amanece en el Bosque GG

function casa(r: Raster, x: number, base: number) {
  // una casita de madera con techo de dos aguas, chimenea con humito y ventanas tibias
  fillPoly(r, [[x - 40, base], [x - 40, base - 34], [x + 40, base - 34], [x + 40, base]], (xx, yy) => ((yy - base) % 5 === 0 ? hex('#4a2a1a') : mixc(hex('#6a3c22'), hex('#a8643a'), clamp01((xx - x + 40) / 80) * 0.5)));
  fillPoly(r, [[x - 48, base - 32], [x, base - 62], [x + 48, base - 32]], (xx) => (xx < x ? hex('#5a2a2a') : hex('#8a3a32')));
  stroke(r, [x - 48, base - 32], [x, base - 62], 1, hex('#ffb07a'));
  fillPoly(r, [[x + 18, base - 52], [x + 18, base - 68], [x + 27, base - 68], [x + 27, base - 46]], hex('#5a4a44'));
  for (const wx of [x - 24, x + 22]) { fillPoly(r, [[wx - 7, base - 24], [wx + 7, base - 24], [wx + 7, base - 12], [wx - 7, base - 12]], hex('#ffd890')); stroke(r, [wx, base - 24], [wx, base - 12], 0.6, hex('#6a3c22')); stroke(r, [wx - 7, base - 18], [wx + 7, base - 18], 0.6, hex('#6a3c22')); halo(r, wx, base - 18, 18, 14, hex('#ffc070'), 0.3); }
  fillPoly(r, [[x - 6, base], [x - 6, base - 20], [x + 6, base - 20], [x + 6, base]], hex('#3a2010'));
  for (let i = 0; i < 6; i++) ellipse(r, x + 23 + Math.sin(i) * 3 + i * 2, base - 72 - i * 7, 3 + i * 0.6, 2.4 + i * 0.5, hex('#e8d8e8'), Math.round(160 * (1 - i / 6)));
}

function amanecer(): CinePanel {
  const HZ = 168;
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#1a2a5a'], [0.3, '#5a4a8a'], [0.5, '#e87a8a'], [0.62, '#ffb070'], [0.68, '#ffe0a0']], 0, HZ + 10);
  vgrad(fondo, [[0, '#5a8a4a'], [1, '#2a5a3a']], HZ + 10, H);
  // el sol asomando detrás de las lomas, con rayos largos
  const SX = 250, SY = HZ - 26;
  for (let k = 0; k < 14; k++) { const a = Math.PI + (k / 13) * Math.PI; for (let d = 30; d < 260; d++) if (hash(k, Math.round(d / 4), 440) > 0.1) addLight(fondo, SX + Math.cos(a) * d, SY + Math.sin(a) * d, hex('#fff0c0'), 0.12 * (1 - d / 260)); }
  glow(fondo, SX, SY, 180, 90, hex('#ffd890'), 0.6);
  ellipse(fondo, SX, SY, 26, 26, (_x, _y, d) => mixc(hex('#ffffff'), hex('#fff0a0'), d));
  // nubes rosadas
  for (const [x, y, w] of [[90, 60, 70], [380, 44, 90], [200, 96, 50]] as [number, number, number][]) for (let i = 0; i < 6; i++) ellipse(fondo, x + (i - 2.5) * w * 0.25, y + Math.sin(i * 2) * 3, w * 0.22, 7, (_xx, yy) => mixc(hex('#ffc8b0'), hex('#c87a9a'), clamp01((yy - y + 4) / 12)));
  const medio = createRaster(W, H);
  // las lomas del Bosque: la de atrás azul rosado, la de adelante verde con el canto dorado del sol
  for (let x = 0; x < W; x++) {
    const a = HZ - 10 - fbm(x * 1.5, 0, 441) * 30, b = HZ + 18 - fbm(x, 9, 442) * 26;
    for (let y = Math.floor(a); y < H; y++) setPx(medio, x, y, mixc(hex('#6a5a8a'), hex('#4a4a7a'), clamp01((y - a) / 40)));
    for (let y = Math.floor(b); y < H; y++) setPx(medio, x, y, y < b + 2 ? hex('#ffd890') : mixc(hex('#4a8a4a'), hex('#2a5a3a'), clamp01((y - b) / 90)));
  }
  // árboles del Bosque GG a los costados, con canto dorado
  const arbol = (x: number, base: number, h: number, seed: number) => {
    stroke(medio, [x, base], [x, base - h * 0.4], h * 0.05 + 1, hex('#3a2418'));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, d = h * 0.18; ellipse(medio, x + Math.cos(a) * d, base - h * 0.62 + Math.sin(a) * d * 0.6, h * 0.22, h * 0.18, (xx, yy) => mixc(hex('#2a6a3a'), hex('#5aa04a'), clamp01((x + 20 - xx) / 60 + vnoise(xx, yy, 5, seed) * 0.3))); }
  };
  for (const [x, h] of [[30, 120], [80, 90], [420, 110], [466, 130], [130, 60]] as [number, number][]) arbol(x, HZ + 30, h, Math.round(x));
  canto(medio, [0, -1], hex('#ffd890'), 0.5);
  casa(medio, 370, HZ + 24);
  // frente: la familia y Thor, de frente, mirando el amanecer con nosotros (8 cuadros de respirar)
  const ids: FamilyId[] = ['rick', 'steph', 'sophie', 'alana'];
  const clips = ids.map((id) => renderClip(familyFicha(id, true), 48, 'idle', 'front', { props: false }).frames);
  const thor = renderClip(thorFicha(0), 48, 'wag', 'se').frames;
  const frente: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H);
    // el pasto de adelante con florcitas
    for (let x = 0; x < W; x++) { const h = 12 + vnoise(x, 0, 6, 443) * 14; for (let y = 0; y < h; y++) setPx(r, x + Math.sin(y * 0.3 + f * 0.6 + x) * (y / h), H - 1 - y, y > h - 2 ? hex('#8ad06a') : hex('#2a5a2a')); }
    for (let i = 0; i < 24; i++) setPx(r, hash(i, 1, 444) * W, H - 4 - hash(i, 2, 444) * 18, i % 3 ? hex('#ffe070') : hex('#ff9ac0'));
    // la familia: Rick, Steph, Sophie y Alana (los más grandes atrás), al doble
    const pos: [number, number][] = [[178, 228], [220, 226], [262, 234], [300, 238]];
    clips.forEach((c, i) => { const s = agrandar(c[(f + i * 2) % c.length], 2); canto(s, [0, -1], hex('#ffd890'), 0.35, 2); pegar(r, s, pos[i][0] - s.w / 2, pos[i][1] - s.h + 6); });
    const ts = agrandar(thor[f % thor.length], 2);
    canto(ts, [0, -1], hex('#ffd890'), 0.35, 2);
    pegar(r, ts, 340 - ts.w / 2, 246 - ts.h + 8);
    // luciérnagas que se van con el día y pétalos
    for (let i = 0; i < 10; i++) { const fase = (hash(i, 1, 445) + f / 8) % 1; setPx(r, hash(i, 2, 445) * W + fase * 40, 140 + hash(i, 3, 445) * 60 - fase * 30, hex('#fff0a0'), Math.round(200 * Math.sin(fase * Math.PI))); }
    frente.push(r);
  }
  return { id: 'fin_amanecer', w: W, h: H, notas: 'Amanece en el Bosque GG: el sol asoma detrás de las lomas, nubes rosadas, la casa con las ventanas tibias y el humito. La familia (Rick, Steph, Sophie y Alana, como sus personajes) y Thor moviendo la cola, de frente, en el pasto (8 cuadros a 6 fps).', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.3 },
    { nombre: 'medio', frames: [medio], fps: 1, paralaje: 0.6 },
    { nombre: 'frente', frames: frente, fps: 6, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 5. la Primera Luz le da las alas a la heroína

function alasPanel(): CinePanel {
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#2a2a5a'], [0.5, '#8a5a8a'], [1, '#ffc890']]);
  // rayos de luz desde atrás de la heroína
  for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2; for (let d = 20; d < 300; d++) if ((k % 2 === 0)) addLight(fondo, 220 + Math.cos(a) * d, 150 + Math.sin(a) * d, hex('#fff0c0'), 0.16 * (1 - d / 300)); }
  glow(fondo, 220, 150, 200, 160, hex('#fff0c0'), 0.4);
  // la heroína al triple: las alas se abren cuadro a cuadro (8 cuadros a 5 fps, sin bucle). Una capa por heroína
  const porHeroina: Record<string, Raster[]> = {};
  const K = 3;
  for (const id of FAMILY as readonly FamilyId[]) {
    const f0 = familyFicha(id, true);
    const fic = { ...tunicaFicha(f0), gear: f0.gear };
    const clip = renderClip(fic, 48, 'idle', 'front', { props: true, joints: true });
    porHeroina[id] = Array.from({ length: 8 }, (_, f) => {
      const fr = clip.frames[f % clip.frames.length], j = clip.joints![f % clip.frames.length];
      const t = clamp01(f / 6);
      const al = alasCuadro(fr, j, 'front', { abre: 0.15 + t * 0.85, aleteo: t * 20 - 4 }, 0.86);
      const cuerpo = createRaster(48, 48);
      pegar(cuerpo, al.detras, 0, 0, clamp01(t * 1.5 + 0.2));
      pegar(cuerpo, fr, 0, 0);
      pegar(cuerpo, al.delante, 0, 0);
      if (f >= 5) pegar(cuerpo, aureolaCuadro(48, 48, j, 6, f, 8), 0, 0, (f - 4) / 3);
      const big = agrandar(cuerpo, K);
      const r = createRaster(W, H);
      halo(r, 220, 140, 110, 120, ORO.claro, 0.25 + t * 0.3);
      pegar(r, big, 220 - big.w / 2, 252 - big.h);
      // la Primera Luz flotando a su lado, con la mano extendida
      const pl = primeraLuz(1.7, f, 1);
      pegar(r, pl, 330 - pl.w / 2, 70 + Math.sin(f) * 2);
      // chispas que van de la Primera Luz a las alas
      for (let i = 0; i < 10; i++) { const u = (hash(i, 1, 450) + f / 8) % 1; const x = 330 + (220 - 330) * u, y = 120 + (130 - 120) * u - Math.sin(u * Math.PI) * 30; setPx(r, x, y, ORO.blanco, Math.round(220 * (1 - u * 0.5))); }
      return r;
    });
  }
  const frente: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(W, H);
    // plumas de luz que caen
    for (let i = 0; i < 14; i++) {
      const fase = (hash(i, 1, 451) + f / 6) % 1, x = hash(i, 2, 451) * W + Math.sin(fase * 6 + i) * 8, y = fase * H;
      stroke(r, [x, y], [x + 3, y + 5], 1, ORO.blanco, 0.4, Math.round(200 * Math.sin(fase * Math.PI)));
    }
    frente.push(r);
  }
  return { id: 'fin_alas', w: W, h: H, notas: 'La Primera Luz le da las alas a la heroína: de frente, al triple, con la túnica celestial; las alas de luz se abren de a poco y en el cuadro 5 aparece la aureola (8 cuadros a 5 fps, sin bucle). La capa `heroina` trae `por_heroina`: usar la del perfil. Con `celestial_despierta`.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.4 },
    { nombre: 'heroina', frames: porHeroina.sophie, fps: 5, paralaje: 0.8, por_heroina: porHeroina, bucle: false },
    { nombre: 'frente', frames: frente, fps: 8, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 6. "Fin"

function tituloPanel(): CinePanel {
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#0a0a1e'], [0.6, '#1a1230'], [1, '#3a1e2a']]);
  glow(fondo, W / 2, H / 2, 220, 90, hex('#ffd890'), 0.25);
  const frente: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(W, H);
    for (let i = 0; i < 50; i++) { const fase = (hash(i, 1, 460) + f / 6) % 1; setPx(r, hash(i, 2, 460) * W, H - fase * H, ORO.claro, Math.round(180 * Math.sin(fase * Math.PI))); }
    frente.push(r);
  }
  return { id: 'fin_titulo', w: W, h: H, notas: '"Fin" en letras doradas que brillan, sobre un cielo que ya clarea. El logo va aparte (`logo_fin`, centrado): primero brilla "Fin" y en el cuadro 8 aparece abajo, chiquito, "¿o no?". Después, la pregunta del Ciclo 2 y los créditos LPC.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.6 },
    { nombre: 'frente', frames: frente, fps: 8, paralaje: 1 },
  ] };
}

export function finPanels(): CinePanel[] {
  return [cae(), llama(), pisos(), amanecer(), alasPanel(), tituloPanel()];
}

/**
 * `logo_fin` (16 cuadros, grilla de 4 x 4): "Fin" en oro con un brillo que lo recorre y chispas; desde el cuadro 8
 * aparece abajo, chiquito, "¿o no?". Del 8 al 15 va en bucle.
 */
export function logoFin(fin: { w: number; h: number; mask: Uint8Array }, ono: { w: number; h: number; mask: Uint8Array }): Raster[] {
  const pad = 16, gap = 12;
  const LW = Math.max(fin.w, ono.w) + pad * 2, LH = fin.h + gap + ono.h + pad * 2;
  const fx = Math.round((LW - fin.w) / 2), ox = Math.round((LW - ono.w) / 2), oy = pad + fin.h + gap;
  const enFin = (x: number, y: number) => { const X = x - fx, Y = y - pad; return X >= 0 && Y >= 0 && X < fin.w && Y < fin.h && fin.mask[Y * fin.w + X] === 1; };
  const enOno = (x: number, y: number) => { const X = x - ox, Y = y - oy; return X >= 0 && Y >= 0 && X < ono.w && Y < ono.h && ono.mask[Y * ono.w + X] === 1; };
  const RAMPA = ['#fff6c8', '#ffe07a', '#ffc83a', '#e89a28', '#b0661a'].map(hex);
  const out: Raster[] = [];
  for (let f = 0; f < 16; f++) {
    const r = createRaster(LW, LH);
    const barrido = ((f % 8) / 8) * (LW + 80) - 40;
    const onoA = clamp01((f - 7) / 2);
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
      const a = enFin(x, y), b = enOno(x, y) && onoA > 0;
      if (a || b) {
        const yy = a ? (y - pad) / fin.h : (y - oy) / ono.h;
        let c = RAMPA[Math.min(4, Math.floor(yy * 5))];
        // el brillo que pasa en diagonal
        if (a && Math.abs(x - barrido + (y - pad) * 0.6) < 6) c = mixc(c, ORO.blanco, 0.75);
        if ((a && !enFin(x, y - 1)) || (b && !enOno(x, y - 1))) c = mixc(c, ORO.blanco, 0.6);
        setPx(r, x, y, c, b ? Math.round(255 * onoA) : 255);
      } else if (enFin(x - 1, y) || enFin(x + 1, y) || enFin(x, y - 1) || enFin(x, y + 1)) setPx(r, x, y, hex('#3a1e08'));
      else if (enFin(x - 2, y - 2)) setPx(r, x, y, hex('#000000'), 150);
      else if (onoA > 0 && (enOno(x - 1, y) || enOno(x + 1, y) || enOno(x, y - 1) || enOno(x, y + 1))) setPx(r, x, y, hex('#3a1e08'), Math.round(255 * onoA));
    }
    // chispas alrededor de las letras
    for (let i = 0; i < 8; i++) if (hash(i, f, 470) > 0.4) {
      const x = pad + hash(i, 1, 471) * (LW - pad * 2), y = pad * 0.5 + hash(i, 2, 471) * (fin.h + pad);
      setPx(r, x, y, ORO.blanco); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) setPx(r, x + dx, y + dy, ORO.claro, 200);
      if (hash(i, f, 472) > 0.7) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) setPx(r, x + dx, y + dy, ORO.oro, 140);
    }
    out.push(r);
  }
  return out;
}

void alphaAt; void fbm; void DIABLO;
