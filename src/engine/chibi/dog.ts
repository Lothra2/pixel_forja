import type { ChibiLook, Talla } from './look';
import type { Pose, Render } from './body';
import type { Clip, Cuadro, Direccion } from './clips';
import { DIRECCIONES } from './clips';
import { capa, barra, elipse, pon, rect, juntar, pegar, hex, sombra, luz, mezcla, VACIO, type Capa } from './paint';

/**
 * Thor en chibi: el bóxer de la familia con cabeza grande, máscara negra, pecho y patas blancas y collar azul.
 * El cuerpo es una cápsula con cuatro patitas cortas; la cabeza (como la del humano) solo gira en cuartos de vuelta.
 */

export interface PosePerro {
  /** Corrimiento del cuerpo (x adelante, y abajo). */
  cuerpo?: [number, number];
  /** Cabeceo del cuerpo en grados (positivo: la cola sube). */
  incl?: number;
  cab?: [number, number];
  /** Patas: delantera cercana, delantera lejana, trasera cercana, trasera lejana. x desde su hombro o cadera, y alto sobre el piso. */
  dc?: [number, number]; dl?: [number, number]; tc?: [number, number]; tl?: [number, number];
  cola?: number;
  boca?: 'cerrada' | 'abierta' | 'lengua' | 'dientes';
  ojos?: 'normal' | 'cerrados' | 'ko' | 'feliz' | 'bravo';
  orejas?: 'normal' | 'arriba' | 'atras';
  sentado?: boolean;
}

declare module './body' {
  interface Pose { perro?: PosePerro }
}

type V2 = [number, number];
const NEGRO = hex('#141014');

export function pintarPerro(look: ChibiLook, talla: Talla, pose: Pose, cuadro = 0): Render {
  const S = talla === 32;
  const k = S ? 1 : 1.45;
  const W = S ? 56 : 112, H = S ? 48 : 96, piso = S ? 44 : 88;
  const pp: PosePerro = pose.perro ?? {};
  const pr = look.perro ?? { pelaje: '#b5713a', blanco: '#f0ece4', mascara: '#2a1e18', collar: '#225fd4' };
  const fur = hex(pr.pelaje), blanco = hex(pr.blanco), collar = hex(pr.collar);
  const vistaP = pose.vista ?? 'lado';
  const vista: 'lado' | 'frente' | 'espalda' = vistaP === 'frente34' ? 'frente' : vistaP === 'espalda34' ? 'espalda' : vistaP;
  const lado = vista === 'lado';
  const cx = Math.floor(W / 2) + 0.5;
  const pata = (S ? 3.2 : 4.6);
  const cuerpoL = (S ? 9 : 13), cuerpoH = (S ? 6 : 8.5);
  const off = pp.cuerpo ?? [0, 0];
  const sentado = !!pp.sentado;
  const yCuerpo = piso - pata - cuerpoH / 2 + 0.5 + off[1] * k;
  const incl = ((pp.incl ?? 0) + (sentado ? -32 : 0)) * (Math.PI / 180);
  const centro: V2 = [cx + off[0] * k - (lado ? 1 : 0), yCuerpo];
  const ejeX: V2 = [Math.cos(incl), -Math.sin(incl)];
  const hombro: V2 = [centro[0] + ejeX[0] * cuerpoL * 0.38, centro[1] + ejeX[1] * cuerpoL * 0.38];
  const cadera: V2 = [centro[0] - ejeX[0] * cuerpoL * 0.38, centro[1] - ejeX[1] * cuerpoL * 0.38];
  const rot = pose.rot ?? 0;
  const R = (p: V2): V2 => {
    if (!rot) return p;
    const r = (rot * Math.PI) / 180, s = Math.sin(r), c = Math.cos(r);
    const x = p[0] - centro[0], y = p[1] - centro[1];
    return [centro[0] + x * c - y * s, centro[1] + x * s + y * c];
  };
  const capas: Capa[] = [];
  const nueva = () => capa(W, H);

  const patita = (base: V2, rel: [number, number] | undefined, lejos: boolean, delantera: boolean, def: [number, number]): Capa => {
    const c = nueva();
    c.lejos = lejos && lado;
    const r = rel ?? def;
    let pie: V2 = [base[0] + r[0] * k, piso - 1.2 - r[1] * k];
    if (sentado && !delantera) pie = [base[0] + 1.5 * k, piso - 1.5];
    const b0 = R(base), p1 = R(pie);
    const w = S ? 3 : 4;
    barra(c, b0[0], b0[1], p1[0], p1[1], w, (t) => (t > 0.72 ? blanco : delantera && lado && t > 0.3 ? mezcla(fur, blanco, 0.0) : fur), 0.6);
    // patita blanca
    rect(c, Math.round(p1[0] - w / 2 + (lado ? 0.5 : 0)), Math.round(p1[1] - 0.5), w + (lado ? 1 : 0), S ? 2 : 3, blanco, 1);
    return c;
  };

  // patas lejanas, cuerpo, patas cercanas, cola, cabeza
  const vacio = (): Capa => nueva();
  const pD0: [number, number] = [0.5, 0], pT0: [number, number] = [-0.5, 0];
  if (lado) {
    capas.push(patita(hombro, pp.dl, true, true, [1, 0]), patita(cadera, pp.tl, true, false, [-1, 0]));
  }
  // cola
  const cola = nueva();
  if (vista !== 'frente') {
    const ang = ((pp.cola ?? 50) * Math.PI) / 180;
    const base: V2 = lado ? [cadera[0] - ejeX[0] * 2.5 * k, cadera[1] - 1.5 * k] : [centro[0], centro[1] - 1];
    const L = 3.5 * k;
    const dir: V2 = lado ? [-Math.cos(ang), -Math.sin(ang)] : [Math.sin(ang - Math.PI / 4) * 0.8, -1];
    const a0 = R(base), a1 = R([base[0] + dir[0] * L, base[1] + dir[1] * L]);
    barra(cola, a0[0], a0[1], a1[0], a1[1], S ? 2 : 3, () => fur, 0.5);
  }
  capas.push(cola);
  // cuerpo
  const cuerpo = nueva();
  const tor = nueva();
  if (lado) {
    const a = R(cadera), b = R(hombro);
    barra(tor, a[0], a[1], b[0], b[1], Math.round(cuerpoH), (t, l) => (t > 0.62 && l > 0 ? blanco : fur), 2.2);
  } else {
    elipse(tor, centro[0], centro[1] - 0.5, (S ? 4.2 : 6), cuerpoH / 2 + 0.6, fur, 1);
    if (vista === 'frente') { elipse(tor, centro[0], centro[1] + 0.5, (S ? 2.2 : 3.2), cuerpoH / 2 - 0.6, blanco, 0); }
  }
  for (let i = 0; i < tor.col.length; i++) if (tor.col[i] !== VACIO) { cuerpo.col[i] = tor.col[i]; cuerpo.som[i] = tor.som[i]; }
  // capa de superhéroe y collar
  const capaSup = nueva();
  if (pr.capa) {
    const cc = hex(pr.capa);
    const v = cuadro % 4;
    if (lado) {
      const h0 = R([hombro[0], hombro[1] - cuerpoH / 2 + 0.5]);
      const t0 = R([cadera[0] - 1.5 * k - [0, 1, 2, 1][v], cadera[1] - cuerpoH / 2 + 1 + [0, 1, 0, -1][v]]);
      for (let i = 0; i <= 6; i++) { const t = i / 6; const x = h0[0] + (t0[0] - h0[0]) * t, y = h0[1] + (t0[1] - h0[1]) * t; for (let j = 0; j < Math.round((1.5 + t * 2.5) * k); j++) pon(capaSup, x, y + j, cc, 1); }
    } else if (vista === 'espalda') elipse(capaSup, centro[0], centro[1] - 0.5, (S ? 4.5 : 6.4), cuerpoH / 2 + 1.5, cc, 1);
  }
  if (lado) capas.push(cuerpo, patita(hombro, pp.dc, false, true, pD0), patita(cadera, pp.tc, false, false, pT0));
  else {
    const sep = S ? 2 : 3;
    const dc: [number, number] = pp.dc ?? [0, 0], dl: [number, number] = pp.dl ?? [0, 0];
    capas.push(patita([centro[0] - sep, centro[1] + 1], [dl[0] * 0.3, dl[1]], false, true, [0, 0]));
    capas.push(patita([centro[0] + sep, centro[1] + 1], [dc[0] * 0.3, dc[1]], false, true, [0, 0]));
    capas.push(cuerpo);
  }
  if (pr.capa && vista !== 'frente') capas.push(capaSup);

  // cabeza
  const cab = cabezaPerro(look, talla, vista, pp, pr, vistaP === 'frente34' || vistaP === 'espalda34');
  const cuartos = Math.round(rot / 90);
  const anclaCab: V2 = lado ? R([hombro[0] + 1.5 * k + (pp.cab?.[0] ?? 0) * k, hombro[1] - cuerpoH / 2 + 1 + (pp.cab?.[1] ?? 0) * k]) : [centro[0] + (pp.cab?.[0] ?? 0) * k, centro[1] - cuerpoH / 2 + 1.5 + (pp.cab?.[1] ?? 0) * k];
  const gira = (x: number, y: number, w: number, h: number, q: number): V2 => {
    q = ((q % 4) + 4) % 4;
    if (q === 0) return [x, y]; if (q === 1) return [h - 1 - y, x]; if (q === 2) return [w - 1 - x, h - 1 - y]; return [y, w - 1 - x];
  };
  const an = gira(cab.ancla[0], cab.ancla[1], cab.c.w, cab.c.h, cuartos);
  const ch = nueva();
  pegar(ch, cab.c, Math.round(anclaCab[0] - an[0]), Math.round(anclaCab[1] - an[1]), cuartos);
  capas.push(ch);
  if (pr.capa && vista === 'frente') { /* de frente la capa queda detrás y no se ve */ }
  // collar sobre el cuello
  const col = nueva();
  if (lado) { const c0 = R([hombro[0] + 1 * k, hombro[1] - cuerpoH / 2 + 1.5 * k]); for (let j = 0; j < (S ? 3 : 4); j++) pon(col, c0[0] + (j > 1 ? 1 : 0), c0[1] + j, j === 1 ? hex('#f4c430') : collar, 0); }
  else if (vista === 'frente') for (let i = -2; i <= 2; i++) pon(col, centro[0] + i * (S ? 1 : 1.3), centro[1] - cuerpoH / 2 + 1, i === 0 ? hex('#f4c430') : collar, 0);
  col.contorno = false;
  capas.push(col);
  void vacio;

  const img = juntar(capas, W, H, 1);
  if (pose.espejo) for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) for (let c2 = 0; c2 < 4; c2++) { const a = (y * W + x) * 4 + c2, b = (y * W + W - 1 - x) * 4 + c2; const t = img.data[a]; img.data[a] = img.data[b]; img.data[b] = t; }
  // caja del cuerpo
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img.data[(y * W + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const boca: V2 = [anclaCab[0] + (lado ? 6 * k : 0), anclaCab[1] - 2 * k];
  const mx = (q: V2): [number, number] => [pose.espejo ? W - q[0] : q[0], q[1]];
  return {
    img, hurt: [x0, y0, Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1)],
    puntos: { manoD: mx(boca), manoT: mx(boca), pieD: mx([hombro[0], piso - 1]), pieT: mx([cadera[0], piso - 1]), cabeza: mx([anclaCab[0], anclaCab[1] - 6 * k]), centro: mx(centro), util: mx(boca) },
  };
}

function cabezaPerro(look: ChibiLook, talla: Talla, vista: 'lado' | 'frente' | 'espalda', pp: PosePerro, pr: NonNullable<ChibiLook['perro']>, v34: boolean): { c: Capa; ancla: V2 } {
  const S = talla === 32;
  const Wc = S ? 11 : 15, Hc = S ? 10 : 14, mg = S ? 8 : 11;
  const c = capa(Wc + mg * 2, Hc + mg * 2);
  const P = (x: number, y: number, v: number, som = 0) => pon(c, mg + x, mg + y, v, som);
  const fur = hex(pr.pelaje), blanco = hex(pr.blanco), masc = hex(pr.mascara);
  const furS = sombra(fur);
  const cortes = S ? [2, 1] : [3, 1, 1];
  const dentro = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= Wc || y >= Hc) return false;
    const ct = y < cortes.length ? cortes[y] : 0, yb = Hc - 1 - y, cb = yb < 2 ? (S ? [1, 0][yb] : [2, 1][yb]) : 0;
    const cc = Math.max(ct, cb);
    return x >= cc && x < Wc - cc;
  };
  for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) if (dentro(x, y)) P(x, y, fur, 1);
  const espalda = vista === 'espalda';
  const lado = vista === 'lado';
  const corre = v34 && vista === 'frente' ? 1 : 0;
  // orejas dobladas (oscuras en la punta)
  const oreja = pp.orejas ?? 'normal';
  const orejas = lado ? [S ? 2 : 3, S ? 6 : 8] : [S ? 1 : 1, Wc - (S ? 3 : 4)];
  for (const ox of orejas) {
    const alto = oreja === 'arriba' ? (S ? 3 : 4) : (S ? 2 : 3);
    for (let j = 0; j < alto; j++) for (let i = 0; i < (S ? 2 : 3); i++) {
      const y = oreja === 'atras' ? j : -alto + j + 1;
      P(ox + i - (oreja === 'atras' ? 1 : 0), y, j === 0 ? sombra(furS) : furS, 0);
    }
  }
  if (!espalda) {
    // el hocico negro adelante (de lado, sale a la derecha) o al centro (de frente)
    const hx = lado ? Wc - (S ? 4 : 6) : Math.floor(Wc / 2) - (S ? 2 : 3) + corre, hy = Hc - (S ? 4 : 6);
    const hw = S ? (lado ? 5 : 4) : (lado ? 7 : 6), hh = S ? 4 : 6;
    for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
      if ((y === hh - 1 || y === 0) && (x === hw - 1 || (x === 0 && !lado))) continue;
      P(hx + x, hy + y, masc, 0);
    }
    // nariz y boca
    P(hx + (lado ? hw - 1 : Math.floor(hw / 2) - 1), hy, NEGRO); if (!lado) P(hx + Math.floor(hw / 2), hy, NEGRO);
    P(hx + (lado ? hw - 2 : Math.floor(hw / 2) - 1), hy - 0 + 0, NEGRO);
    const boca = pp.boca ?? 'cerrada';
    if (boca === 'abierta' || boca === 'lengua' || boca === 'dientes') {
      for (let x = 1; x < hw - (lado ? 0 : 1); x++) P(hx + x, hy + hh - 1, hex('#5a1414'));
      if (boca === 'lengua') { P(hx + Math.floor(hw / 2), hy + hh, hex('#e86a7a')); P(hx + Math.floor(hw / 2) - 1, hy + hh, hex('#e86a7a')); }
      if (boca === 'dientes') for (let x = 1; x < hw - 1; x += 2) P(hx + x, hy + hh - 1, hex('#f4f2ee'));
    }
    // la mancha blanca de la frente
    const bx = lado ? Wc - (S ? 6 : 8) : Math.floor(Wc / 2) - 1 + corre;
    for (let y = 1; y < hy; y++) { P(bx, y, blanco); if (!S) P(bx + 1, y, blanco); }
    // ojos
    const ojos = pp.ojos ?? 'normal';
    const ey = S ? 3 : 4;
    const exs = lado ? [Wc - (S ? 7 : 10), Wc - (S ? 3 : 4)] : [Math.floor(Wc / 2) - (S ? 3 : 4) + corre, Math.floor(Wc / 2) + (S ? 2 : 3) + corre];
    for (const ex of exs) {
      if (ojos === 'cerrados') { P(ex - 1, ey + 1, NEGRO); P(ex, ey + 1, NEGRO); }
      else if (ojos === 'ko') { P(ex - 1, ey, NEGRO); P(ex, ey + 1, NEGRO); P(ex + 1, ey, NEGRO); P(ex - 1, ey + 2, NEGRO); P(ex + 1, ey + 2, NEGRO); }
      else if (ojos === 'feliz') { P(ex - 1, ey + 1, NEGRO); P(ex, ey, NEGRO); P(ex + 1, ey + 1, NEGRO); }
      else { P(ex, ey, NEGRO); P(ex, ey + 1, NEGRO); if (!S) P(ex, ey + 2, NEGRO); if (ojos === 'bravo') { P(ex - 1, ey - 1, NEGRO); P(ex + 1, ey - 2, NEGRO); } }
    }
    // antifaz de superhéroe
    if (pr.antifaz) { const af = hex(pr.antifaz); for (const ex of exs) for (let x = ex - 1; x <= ex + 1; x++) { if (c.col[(mg + ey - 1) * c.w + mg + x] !== VACIO) P(x, ey - 1, af); P(x, ey + 2, af); } P(exs[0] - 2, ey, af); }
  }
  // gorro (navidad, gorra...) reutiliza el color del look
  if (look.gorro?.estilo === 'navidad') {
    const r = hex(look.gorro.color), w2 = hex(look.gorro.color2 ?? '#f4f2ee');
    for (let x = 1; x < Wc - 1; x++) P(x, 0, w2);
    for (let y = -1; y >= -4; y--) for (let x = 2 - y; x < Wc - 2 + y; x++) P(x - 2, y, r, 1);
    elipse(c, mg - 1, mg - 3, 1.5, 1.5, w2, 0);
  }
  return { c, ancla: [mg + (lado ? Math.round(Wc * 0.35) : Math.floor(Wc / 2)), mg + Hc - 1] };
  void luz;
}

// ---------------------------------------------------------------- animaciones del perro
const P = (o: PosePerro = {}, extra: Pose = {}): Pose => ({ ...extra, perro: o });
const clip = (id: string, es: string, en: string, grupo: Clip['grupo'], loop: boolean, cuadros: Cuadro[], dir?: Direccion): Clip => ({ id, nombre: [es, en], grupo, loop, cuadros, ...(dir ? { dir } : {}) });

export function clipsPerro(): Clip[] {
  const out: Clip[] = [];
  const paso = (a: number) => ({ dc: [a, a > 0 ? 1.2 : 0] as [number, number], tl: [a, a > 0 ? 1.2 : 0] as [number, number], dl: [-a, a < 0 ? 1.2 : 0] as [number, number], tc: [-a, a < 0 ? 1.2 : 0] as [number, number] });
  out.push(clip('reposo', 'Reposo', 'Idle', 'pelea', true, [
    { p: P({ cola: 40, boca: 'lengua' }), t: 10 }, { p: P({ cola: 60, boca: 'lengua', cuerpo: [0, 0.6] }), t: 10 },
    { p: P({ cola: 40, boca: 'lengua', cuerpo: [0, 0.6] }), t: 10 }, { p: P({ cola: 60, boca: 'lengua' }), t: 10 },
  ]));
  out.push(clip('caminar', 'Caminar', 'Walk', 'pelea', true, [
    { p: P({ ...paso(1.2), cola: 45 }), t: 7, dx: 1.5 }, { p: P({ cuerpo: [0, 0.6], cola: 55 }), t: 7, dx: 1.5 },
    { p: P({ ...paso(-1.2), cola: 45 }), t: 7, dx: 1.5 }, { p: P({ cuerpo: [0, 0.6], cola: 55 }), t: 7, dx: 1.5 },
  ]));
  out.push(clip('correr', 'Correr', 'Run', 'beat', true, [
    { p: P({ dc: [2.5, 1.5], dl: [2, 1], tc: [-2.5, 1], tl: [-2, 1.5], incl: 0, orejas: 'atras', boca: 'lengua' }), t: 4, dx: 3.5, dy: 2 },
    { p: P({ dc: [-1, 0], dl: [-0.5, 0.5], tc: [1, 1], tl: [1.5, 1.5], incl: 6, orejas: 'atras', boca: 'lengua' }), t: 4, dx: 3.5 },
    { p: P({ dc: [0, 1.5], dl: [0.5, 1], tc: [2, 0], tl: [1.5, 0], incl: -6, orejas: 'atras', boca: 'lengua' }), t: 4, dx: 3.5, dy: 1 },
    { p: P({ dc: [1.5, 1], dl: [1, 1.5], tc: [0, 1], tl: [-0.5, 0.5], incl: 0, orejas: 'atras', boca: 'lengua' }), t: 4, dx: 3.5, dy: 1 },
  ]));
  out.push(clip('saltar', 'Saltar', 'Jump', 'pelea', false, [
    { p: P({ cuerpo: [0, 1.5], incl: -10, dc: [1, 0], tc: [-1, 0] }), t: 4 },
    { p: P({ incl: -20, dc: [2, 2.5], dl: [2, 2], tc: [-2, 0.5], tl: [-2, 0.5], orejas: 'atras' }), t: 8, dy: 14, dx: 2 },
    { p: P({ incl: 0, dc: [1.5, 2], dl: [1.5, 2], tc: [-1.5, 2], tl: [-1.5, 2], orejas: 'arriba' }), t: 8, dy: 18, dx: 2 },
    { p: P({ incl: 14, dc: [2, 0.5], dl: [2, 0.5], tc: [-1, 2], tl: [-1, 2] }), t: 8, dy: 10, dx: 2 },
    { p: P({ cuerpo: [0, 1.5], incl: 6 }), t: 5, fx: { id: 'polvo', en: 'pieD' } },
  ]));
  out.push(clip('sentado', 'Sentado', 'Sit', 'arriba', true, [
    { p: P({ sentado: true, cola: 20, boca: 'lengua', dc: [0.5, 0], dl: [0.5, 0] }), t: 20 },
    { p: P({ sentado: true, cola: 40, boca: 'lengua', dc: [0.5, 0], dl: [0.5, 0] }), t: 20 },
    { p: P({ sentado: true, cola: 20, ojos: 'cerrados', dc: [0.5, 0], dl: [0.5, 0] }), t: 6 },
  ]));
  out.push(clip('ladrar', 'Ladrar', 'Bark', 'pelea', false, [
    { p: P({ cab: [0, -1], boca: 'cerrada', orejas: 'arriba' }), t: 4 },
    { p: P({ cab: [1, -2], boca: 'abierta', orejas: 'arriba', ojos: 'bravo', cuerpo: [0.5, 0] }), t: 8, sonido: 'ladrido', fx: { id: 'emote_exclamacion', en: 'cabeza', dy: -4 } },
    { p: P({ cab: [0, -1], boca: 'cerrada', orejas: 'arriba' }), t: 4 },
    { p: P({ cab: [1, -2], boca: 'abierta', orejas: 'arriba', ojos: 'bravo', cuerpo: [0.5, 0] }), t: 8, sonido: 'ladrido' },
    { p: P({}), t: 6 },
  ]));
  out.push(clip('morder', 'Mordida', 'Bite', 'pelea', false, [
    { p: P({ cuerpo: [-1, 1], incl: -6, boca: 'cerrada', ojos: 'bravo', orejas: 'atras' }), t: 5 },
    { p: P({ cuerpo: [3, 0], incl: -12, cab: [2, 0], boca: 'dientes', ojos: 'bravo', orejas: 'atras', dc: [3, 2], dl: [3, 1.5], tc: [-2, 0] }), t: 6, dx: 3, dy: 3, golpe: 'manoD', sonido: 'mordida' },
    { p: P({ cuerpo: [1, 0.5], boca: 'cerrada' }), t: 8 },
  ]));
  out.push(clip('poder', 'Ladrido de trueno', 'Thunder bark', 'pelea', false, [
    { p: P({ cuerpo: [-1, 1.5], incl: -8, boca: 'cerrada', ojos: 'bravo', orejas: 'atras' }), t: 10 },
    { p: P({ cuerpo: [0.5, 0.5], cab: [1, -1], boca: 'abierta', ojos: 'bravo', orejas: 'atras' }), t: 24, fx: { id: 'poder', en: 'manoD', dx: 3 }, sonido: 'poder' },
    { p: P({}), t: 8 },
  ]));
  out.push(clip('recibir', 'Recibe golpe', 'Hit', 'pelea', false, [{ p: P({ cuerpo: [-1.5, 0.5], incl: 12, ojos: 'cerrados', orejas: 'atras', boca: 'abierta' }), t: 16, dx: -1, sonido: 'golpe' }]));
  out.push(clip('caer', 'Caer', 'Knockdown', 'pelea', false, [
    { p: P({ ojos: 'cerrados', orejas: 'atras', boca: 'abierta' }, { rot: -30 }), t: 6, dy: 10, dx: -2 },
    { p: P({ ojos: 'ko', orejas: 'atras', dc: [1, 2], dl: [1, 2], tc: [-1, 2], tl: [-1, 2] }, { rot: -180 }), t: 30, apoyar: true, dx: -2, fx: { id: 'polvo', en: 'centro' } },
  ]));
  out.push(clip('ko', 'KO', 'KO', 'pelea', false, [
    { p: P({ ojos: 'cerrados', orejas: 'atras', boca: 'abierta' }, { rot: -30 }), t: 6, dy: 10, dx: -2 },
    { p: P({ ojos: 'ko', orejas: 'atras', boca: 'lengua', dc: [2, 0], dl: [2, 0], tc: [-2, 0], tl: [-2, 0] }, { rot: -90 }), t: 90, apoyar: true, fx: { id: 'polvo', en: 'centro' } },
  ]));
  out.push(clip('mareado', 'Mareado', 'Dizzy', 'pelea', true, [
    { p: P({ ojos: 'ko', incl: 6, cab: [-1, 0] }), t: 10, fx: { id: 'mareo', en: 'cabeza' } }, { p: P({ ojos: 'ko', incl: -6, cab: [1, 0] }), t: 10 },
  ]));
  out.push(clip('victoria', 'Victoria', 'Victory', 'pelea', true, [
    { p: P({ sentado: true, cola: 10, boca: 'lengua', ojos: 'feliz', dc: [0.5, 2.5], dl: [0.5, 0] }), t: 8 },
    { p: P({ sentado: true, cola: 50, boca: 'lengua', ojos: 'feliz', dc: [0.5, 0], dl: [0.5, 2.5] }), t: 8 },
  ]));
  out.push(clip('olfatear', 'Olfatear', 'Sniff', 'arriba', true, [
    { p: P({ cab: [1, 3], incl: -8, cola: 60 }), t: 8, fx: { id: 'emote_pregunta', en: 'cabeza', dy: -2 } }, { p: P({ cab: [1.5, 3.5], incl: -8, cola: 40 }), t: 8 },
  ]));
  out.push(clip('cavar', 'Cavar', 'Dig', 'beat', true, [
    { p: P({ cab: [1, 2], incl: -12, dc: [2, 1.5], dl: [1, 0], cola: 70 }), t: 5, fx: { id: 'polvo', en: 'pieD' } }, { p: P({ cab: [1, 2], incl: -12, dc: [0, 0], dl: [2, 1.5], cola: 50 }), t: 5 },
  ]));
  out.push(clip('mover_cola', 'Mover la cola', 'Tail wag', 'arriba', true, [
    { p: P({ cola: 20, boca: 'lengua', ojos: 'feliz' }), t: 5 }, { p: P({ cola: 70, boca: 'lengua', ojos: 'feliz' }), t: 5 },
  ]));
  out.push(clip('atrapar', 'Atrapar la pelota', 'Catch the ball', 'deporte', false, [
    { p: P({ cuerpo: [0, 1.5], incl: -10 }), t: 4 },
    { p: P({ incl: -35, cab: [0.5, -1], boca: 'abierta', dc: [1.5, 3], dl: [1, 2.5], tc: [-1, 0], tl: [-1, 0] }), t: 10, dy: 12, golpe: 'manoD' },
    { p: P({ incl: 10, boca: 'cerrada', ojos: 'feliz' }), t: 8, dy: 4 }, { p: P({ boca: 'cerrada', ojos: 'feliz', cola: 70 }), t: 10 },
  ]));
  out.push(clip('nadar', 'Nadar', 'Dog paddle', 'deporte', true, [
    { p: P({ cuerpo: [0, -1], incl: 12, dc: [2, 2.5], dl: [0, 1], tc: [-1, 2], tl: [-2, 1], orejas: 'atras' }), t: 7, dx: 1, dy: 3, fx: { id: 'salpica', en: 'pieD' } },
    { p: P({ cuerpo: [0, -1], incl: 12, dc: [0, 1], dl: [2, 2.5], tc: [-2, 1], tl: [-1, 2], orejas: 'atras' }), t: 7, dx: 1, dy: 3 },
  ]));
  // vista desde arriba: quieto, caminar y correr por dirección
  for (const dir of DIRECCIONES) {
    const vista = dir === 's' ? 'frente' : dir === 'se' ? 'frente34' : dir === 'e' ? 'lado' : dir === 'ne' ? 'espalda34' : 'espalda';
    const L = vista === 'lado';
    out.push(clip(`quieto_${dir}`, `Quieto (${dir})`, `Idle (${dir})`, 'arriba', true, [{ p: P({ boca: 'lengua', cola: 40 }, { vista }), t: 16 }, { p: P({ boca: 'lengua', cola: 60, cuerpo: [0, 0.5] }, { vista }), t: 16 }], dir));
    out.push(clip(`caminar_${dir}`, `Caminar (${dir})`, `Walk (${dir})`, 'arriba', true, L ? [
      { p: P({ ...paso(1.2), cola: 45 }), t: 7, dx: 1.5 }, { p: P({ cuerpo: [0, 0.6] }), t: 7, dx: 1.5 }, { p: P({ ...paso(-1.2), cola: 55 }), t: 7, dx: 1.5 }, { p: P({ cuerpo: [0, 0.6] }), t: 7, dx: 1.5 },
    ] : [
      { p: P({ dc: [0, 1.2], dl: [0, 0], cola: 40 }, { vista }), t: 7 }, { p: P({ cuerpo: [0, 0.6] }, { vista }), t: 7 }, { p: P({ dc: [0, 0], dl: [0, 1.2], cola: 60 }, { vista }), t: 7 }, { p: P({ cuerpo: [0, 0.6] }, { vista }), t: 7 },
    ], dir));
    out.push(clip(`correr_${dir}`, `Correr (${dir})`, `Run (${dir})`, 'arriba', true, L ? [
      { p: P({ dc: [2.5, 1.5], dl: [2, 1], tc: [-2.5, 1], tl: [-2, 1.5], orejas: 'atras', boca: 'lengua' }), t: 4, dx: 3.5, dy: 2 },
      { p: P({ dc: [-1, 0], dl: [-0.5, 0.5], tc: [1, 1], tl: [1.5, 1.5], incl: 6, orejas: 'atras', boca: 'lengua' }), t: 4, dx: 3.5 },
    ] : [
      { p: P({ dc: [0, 2], dl: [0, 0], orejas: 'atras', boca: 'lengua' }, { vista }), t: 5, dy: 1 }, { p: P({ dc: [0, 0], dl: [0, 2], orejas: 'atras', boca: 'lengua' }, { vista }), t: 5, dy: 1 },
    ], dir));
  }
  return out;
}
