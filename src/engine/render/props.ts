import { Part, stroke, blob, polygon, rot } from './part';
import { SHADOW, BASE, LIGHT } from '../color/ramp';
import type { PropKind } from '../rig/pose';

/**
 * Implementos dibujados con código, con grosor fijo. Se dibujan en coordenadas del lienzo
 * a partir de un punto de enganche y un ángulo. u = escala (1 a 48 px).
 */
export function ballSize(kind: PropKind, u: number): number {
  const base = kind === 'basketball' || kind === 'volleyball' ? 7 : kind === 'soccer' ? 6 : kind === 'shot' ? 4 : kind === 'baseball' ? 3 : 3;
  return Math.max(kind === 'tennisball' || kind === 'baseball' ? 2 : kind === 'shot' ? 3 : 4, Math.round(base * u));
}

export function isBall(kind: PropKind): boolean {
  return kind === 'soccer' || kind === 'basketball' || kind === 'volleyball' || kind === 'tennisball' || kind === 'baseball' || kind === 'shot';
}

/** Dibuja un balón con centro en c. */
export function drawBall(part: Part, kind: PropKind, c: [number, number], u: number) {
  const s = ballSize(kind, u);
  const main = kind === 'basketball' ? 'p_orange' : kind === 'tennisball' ? 'p_lime' : kind === 'shot' ? 'p_iron' : 'p_white';
  blob(part, c, s, main, BASE);
  const r = (s - 1) / 2;
  const ox = Math.round(c[0] - r), oy = Math.round(c[1] - r);
  // luz arriba a la derecha, sombra abajo a la izquierda
  for (const [x, y, p] of [...part.entries()]) {
    if (p.mat !== main) continue;
    const dx = x - ox - r, dy = y - oy - r;
    if (dx - dy < -r * 0.9) part.set(x, y, main, SHADOW);
    else if (dx - dy > r * 1.1 && s >= 5) part.set(x, y, main, LIGHT);
  }
  if (s < 4) {
    if (kind === 'baseball' && s >= 3) part.set(ox + 1, oy + 1, 'p_red');
    return;
  }
  const mid = Math.round(r);
  if (kind === 'soccer') {
    // parches negros
    part.set(ox + mid, oy + mid, 'p_black');
    part.set(ox + mid - 1, oy + mid, 'p_black');
    if (s >= 6) { part.set(ox + 1, oy + 1, 'p_black'); part.set(ox + s - 2, oy + s - 2, 'p_black'); part.set(ox + s - 2, oy + 1, 'p_black'); }
  } else if (kind === 'basketball') {
    for (let i = 0; i < s; i++) { if (part.has(ox + mid, oy + i)) part.set(ox + mid, oy + i, 'p_black'); if (part.has(ox + i, oy + mid)) part.set(ox + i, oy + mid, 'p_black'); }
  } else if (kind === 'volleyball') {
    for (let i = 0; i < s; i++) {
      if (part.has(ox + i, oy + mid)) part.set(ox + i, oy + mid, 'p_blue');
      if (i < mid && part.has(ox + mid, oy + i)) part.set(ox + mid, oy + i, 'p_yellow');
    }
  } else if (kind === 'baseball') {
    part.set(ox + 1, oy + mid, 'p_red');
    part.set(ox + s - 2, oy + mid, 'p_red');
  }
}

/**
 * La punta del implemento en la mano, donde la dibuja `drawHeld`: la de la jabalina, la de la garrocha, la del bate.
 * null si el implemento no tiene una punta que el juego necesite (la raqueta, la espada).
 */
export function heldTip(kind: PropKind, at: [number, number], angle: number, u: number): [number, number] | null {
  const nn = (v: number) => Math.max(1, Math.round(v * u));
  const along = kind === 'javelin' ? nn(26) * 0.58 : kind === 'pole' ? nn(40) : kind === 'bat' ? Math.round(13 * u) : null;
  if (along === null) return null;
  const [x, y] = rot([along, 0], angle);
  return [at[0] + x, at[1] + y];
}

/**
 * Implementos que se sostienen: el ángulo dice hacia dónde apunta (0 = derecha, 90 = abajo).
 * at = punto de agarre (mano).
 */
export function drawHeld(part: Part, kind: PropKind, at: [number, number], angle: number, u: number, rest = false, bend = 0) {
  const dir = (len: number): [number, number] => {
    const [x, y] = rot([len, 0], angle);
    return [at[0] + x, at[1] + y];
  };
  const t = Math.max(1, Math.round(u));
  const nn = (v: number) => Math.max(1, Math.round(v * u));
  if (kind === 'javelin') {
    // jabalina: vara fina y larga tomada por el medio (la empuñadura de cuerda), punta de metal adelante
    const len = nn(26);
    stroke(part, dir(-len * 0.42), dir(len * 0.58), 1, () => 'p_metal', LIGHT);
    stroke(part, dir(-nn(1.5)), dir(nn(1.5)), t, () => 'p_leather');
    stroke(part, dir(len * 0.58 - nn(3)), dir(len * 0.58), 1, () => 'p_steel', SHADOW);
    return;
  }
  if (kind === 'pole') {
    // garrocha: muy larga, tomada cerca de una punta; se dobla en un arco cuando se clava
    const len = nn(40), k = bend * u, segs = 12;
    let prev = dir(-nn(3));
    for (let i = 1; i <= segs; i++) {
      const s = i / segs, along = -nn(3) + (len + nn(3)) * s;
      const off = k * Math.sin(Math.PI * s);
      const [bx, by] = rot([along, off], angle);
      const cur: [number, number] = [at[0] + bx, at[1] + by];
      stroke(part, prev, cur, t, () => (s > 0.92 ? 'p_black' : 'p_yellow'), s < 0.5 ? LIGHT : BASE);
      prev = cur;
    }
    return;
  }
  if (kind === 'racket') {
    const handle = Math.round(5 * u), head = Math.max(4, Math.round(6 * u)), wide = Math.max(3, Math.round(5 * u));
    stroke(part, dir(-1), dir(handle), t, () => 'p_black');
    // cabeza ovalada: marco y cuerdas
    const c = dir(handle + head / 2);
    const pts: [number, number][] = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const [x, y] = rot([(Math.cos(a) * head) / 2, (Math.sin(a) * wide) / 2], angle);
      pts.push([c[0] + x, c[1] + y]);
    }
    polygon(part, pts, 'p_white', BASE);
    for (let k = 0; k < pts.length; k++) stroke(part, pts[k], pts[(k + 1) % pts.length], 1, () => 'p_red');
  } else if (kind === 'bat') {
    const len = Math.round(13 * u);
    stroke(part, dir(-1), dir(len * 0.45), t, () => 'p_wood', SHADOW);
    stroke(part, dir(len * 0.45), dir(len), t + 1, () => 'p_wood', BASE);
  } else if (kind === 'sword') {
    const len = Math.round(12 * u);
    stroke(part, dir(-2), dir(1), t, () => 'p_brown');
    const g1 = rot([0, -2 * u], angle), g2 = rot([0, 2 * u], angle);
    const gc = dir(1);
    stroke(part, [gc[0] + g1[0], gc[1] + g1[1]], [gc[0] + g2[0], gc[1] + g2[1]], 1, () => 'p_gold');
    stroke(part, dir(2), dir(len), t, () => 'p_metal', LIGHT);
  } else if (kind === 'shield') {
    const w = Math.max(4, Math.round(7 * u)), h = Math.max(5, Math.round(9 * u));
    const pts: [number, number][] = [
      [at[0] - w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] + h * 0.15], [at[0], at[1] + h / 2], [at[0] - w / 2, at[1] + h * 0.15],
    ];
    polygon(part, pts, 'p_shieldc', BASE);
    stroke(part, [at[0], at[1] - h / 2 + 1], [at[0], at[1] + h / 2 - 1], 1, () => 'p_gold');
  } else if (kind === 'potion') {
    const s = Math.max(3, Math.round(4 * u));
    blob(part, [at[0], at[1] - 1], s, 'p_pink');
    part.set(Math.round(at[0]), Math.round(at[1] - 1 - s / 2), 'p_glass');
    part.set(Math.round(at[0]), Math.round(at[1] - 2 - s / 2), 'p_brown');
  } else if (kind === 'spark') {
    // chispa de impacto: una estrella blanca con centro amarillo, un poco adelante del puño
    const c = dir(Math.max(2, Math.round(2.5 * u)));
    const r = Math.max(2, Math.round(3 * u)), q = Math.max(1, Math.round(2 * u));
    const cx = Math.round(c[0]), cy = Math.round(c[1]);
    for (let k = 1; k <= r; k++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) part.set(cx + dx * k, cy + dy * k, k === r ? 'p_yellow' : 'p_white', LIGHT);
    for (let k = 1; k <= q; k++) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) part.set(cx + dx * k, cy + dy * k, 'p_yellow', BASE);
    part.set(cx, cy, 'p_yellow', LIGHT);
  } else if (kind === 'spray') {
    // lata de spray en el puño, con la tapa de color y el chorrito de pintura que sale adelante
    const h = nn(5), w = Math.max(2, nn(2));
    const top: [number, number] = [at[0], at[1] - h];
    for (let k = 0; k < h; k++) for (let i = 0; i < w; i++) part.set(Math.round(at[0] - w / 2 + i), Math.round(at[1] - k), 'p_metal', i === 0 ? LIGHT : BASE);
    part.set(Math.round(top[0]), Math.round(top[1]), 'p_pink', LIGHT);
    if (!rest) for (let k = 1; k <= nn(3); k++) part.set(Math.round(top[0] + k), Math.round(top[1] - (k > 1 ? 1 : 0)), 'p_pink', LIGHT);
  } else if (kind === 'campana') {
    // campanita de bronce con su mango: el vendedor la sacude
    const s = Math.max(2, nn(2.5));
    stroke(part, at, dir(nn(2)), 1, () => 'p_wood');
    const c = dir(nn(2) + s);
    for (let j = 0; j <= s; j++) for (let i = -j; i <= j; i++) part.set(Math.round(c[0] + i), Math.round(c[1] - s + j), 'p_gold', i < 0 ? LIGHT : BASE);
    part.set(Math.round(c[0]), Math.round(c[1] + 1), 'p_brown');
  } else if (kind === 'microfono') {
    // micrófono negro con la cabeza gris
    stroke(part, dir(-1), dir(nn(3)), 1, () => 'p_black');
    blob(part, dir(nn(4)), Math.max(2, nn(2)), 'p_grey');
  } else if (kind === 'paleta') {
    // paleta de mango biche: el palito y el hielo amarillo con verde
    stroke(part, at, dir(nn(2)), 1, () => 'p_wood');
    const c = dir(nn(4));
    blob(part, c, Math.max(2, nn(3)), 'p_yellow');
    part.set(Math.round(c[0]), Math.round(c[1]) - 1, 'p_lime', LIGHT);
  } else if (kind === 'tambor') {
    // tambora colgada adelante, entre las dos manos: el cuero claro arriba y el aro rojo
    const w = Math.max(5, nn(8)), h = Math.max(3, nn(5));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) part.set(Math.round(at[0] - w / 2 + i), Math.round(at[1] + j), j === 0 ? 'p_cream' : j === h - 1 || j === 1 ? 'p_red' : 'p_wood', i === 0 ? LIGHT : BASE);
  } else if (kind === 'peine') {
    // peine de bolsillo rojo (que se vea sobre el pelo): el lomo a lo largo de la mano y los dientes de un lado
    const len = Math.max(3, nn(4));
    stroke(part, dir(-1), dir(len - 1), 1, () => 'p_red');
    for (let k = 0; k < len; k += 2) { const p = dir(k - 1), q = rot([0, 1], angle); part.set(Math.round(p[0] + q[0]), Math.round(p[1] + q[1]), 'p_white'); }
  } else if (kind === 'glove') {
    blob(part, at, Math.max(3, Math.round(4 * u)), 'p_brown');
  } else drawWeapon(part, kind, at, angle, u, dir, t, rest);
}

/** Armas y mano libre del RPG. dir(len) = punto a lo largo del arma desde la mano. */
function drawWeapon(part: Part, kind: PropKind, at: [number, number], angle: number, u: number, dir: (len: number) => [number, number], t: number, rest: boolean) {
  const side = (p: [number, number], d: number): [number, number] => { const [x, y] = rot([0, d], angle); return [p[0] + x, p[1] + y]; };
  const n = (v: number) => Math.max(1, Math.round(v * u));
  if (kind === 'dagger') {
    stroke(part, dir(-1), dir(1), t, () => 'p_leather');
    stroke(part, side(dir(1), -1), side(dir(1), 1), 1, () => 'p_gold');
    stroke(part, dir(2), dir(n(6)), t, () => 'p_steel', LIGHT);
  } else if (kind === 'greatsword') {
    const len = n(17);
    stroke(part, dir(-3), dir(1), t, () => 'p_leather');
    stroke(part, side(dir(1), -n(3)), side(dir(1), n(3)), t, () => 'p_gold');
    stroke(part, dir(2), dir(len), t + 1, () => 'p_steel', BASE);
    stroke(part, dir(3), dir(len - 1), 1, () => 'p_steel', LIGHT);
  } else if (kind === 'axe' || kind === 'scythe') {
    const len = n(kind === 'scythe' ? (rest ? 24 : 16) : 11);
    stroke(part, dir(-2), dir(len), t, () => 'p_wood', SHADOW);
    if (kind === 'axe') {
      // hoja en media luna hacia un lado
      const h = dir(len - n(2));
      polygon(part, [side(h, -n(1)), side(dir(len - n(5)), -n(5)), side(dir(len + n(1)), -n(5)), side(dir(len), -n(1))], 'p_steel', BASE);
      stroke(part, side(dir(len - n(5)), -n(5)), side(dir(len + n(1)), -n(5)), 1, () => 'p_steel', LIGHT);
    } else {
      // hoja curva de la guadaña, hacia atrás
      const tip = dir(len);
      const pts: [number, number][] = [];
      for (let k = 0; k <= 6; k++) { const a = (k / 6) * 1.6; pts.push(side(dir(len - Math.sin(a) * n(4)), -Math.cos(a - 0.2) * n(8) + n(1))); }
      for (let k = 0; k < pts.length - 1; k++) stroke(part, pts[k], pts[k + 1], t, () => 'p_bone', LIGHT);
      part.set(Math.round(tip[0]), Math.round(tip[1]), 'p_iron');
    }
  } else if (kind === 'club') {
    // garrote de tronco: mango fino que engorda hasta una cabeza nudosa
    const len = n(12);
    stroke(part, dir(-1), dir(len * 0.4), t, () => 'p_wood', SHADOW);
    stroke(part, dir(len * 0.35), dir(len * 0.75), t + 1, () => 'p_wood');
    const c = dir(len);
    blob(part, dir(len * 0.72), n(3.5), 'p_wood');
    blob(part, c, n(5), 'p_wood');
    blob(part, side(c, -n(1)), n(2.5), 'p_wood', LIGHT);
    // nudos oscuros
    for (const [a, d] of [[len * 0.8, n(1.5)], [len + n(1), -n(1.5)]] as const) { const k = side(dir(a), d); part.set(Math.round(k[0]), Math.round(k[1]), 'p_wood', SHADOW); }
  } else if (kind === 'mace') {
    const len = n(8);
    stroke(part, dir(-1), dir(len), t, () => 'p_iron');
    const c = dir(len + n(1.5));
    blob(part, c, n(4), 'p_steel');
    if (kind === 'mace') for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) part.set(Math.round(c[0] + dx * n(2.5)), Math.round(c[1] + dy * n(2.5)), 'p_iron');
  } else if (kind === 'hammer') {
    const len = n(11);
    stroke(part, dir(-2), dir(len), t, () => 'p_wood', SHADOW);
    const h = dir(len);
    polygon(part, [side(dir(len - n(2)), -n(3)), side(dir(len - n(2)), n(3)), side(dir(len + n(2)), n(3)), side(dir(len + n(2)), -n(3))], 'p_iron', BASE);
    stroke(part, side(h, -n(3)), side(h, n(3)), 1, () => 'p_steel', LIGHT);
  } else if (kind === 'spear') {
    const len = n(rest ? 23 : 16);
    stroke(part, dir(-n(6)), dir(len), t, () => 'p_wood', SHADOW);
    polygon(part, [side(dir(len), -n(1.5)), dir(len + n(5)), side(dir(len), n(1.5))], 'p_steel', LIGHT);
  } else if (kind === 'staff') {
    const len = n(rest ? 23 : 13);
    stroke(part, dir(-n(7)), dir(len), t, () => 'p_wood', SHADOW);
    // cabeza del báculo: horquilla con una gema que brilla
    stroke(part, side(dir(len), -n(2)), side(dir(len + n(2)), -n(2)), 1, () => 'p_wood');
    stroke(part, side(dir(len), n(2)), side(dir(len + n(2)), n(2)), 1, () => 'p_wood');
    blob(part, dir(len + n(2)), n(3), 'p_glow', LIGHT);
  } else if (kind === 'wand') {
    stroke(part, dir(-1), dir(n(6)), t, () => 'p_leather');
    blob(part, dir(n(7)), n(2) + 1, 'p_glow', LIGHT);
  } else if (kind === 'bow') {
    // arco vertical respecto al brazo: la cuerda pasa por la mano
    const R = n(8);
    const pts: [number, number][] = [];
    for (let k = 0; k <= 8; k++) { const a = -1.15 + (k / 8) * 2.3; pts.push(side(dir(Math.cos(a) * n(3)), Math.sin(a) * R)); }
    for (let k = 0; k < pts.length - 1; k++) stroke(part, pts[k], pts[k + 1], t, () => 'p_wood', k === 4 ? LIGHT : BASE);
    stroke(part, pts[0], pts[pts.length - 1], 1, () => 'p_white', SHADOW);
  } else if (kind === 'arrow') {
    stroke(part, dir(-n(4)), dir(n(6)), 1, () => 'p_wood');
    part.set(Math.round(dir(n(7))[0]), Math.round(dir(n(7))[1]), 'p_steel', LIGHT);
    part.set(Math.round(side(dir(-n(4)), 1)[0]), Math.round(side(dir(-n(4)), 1)[1]), 'p_white');
  } else if (kind === 'claws') {
    for (const d of [-1, 0, 1]) stroke(part, side(dir(1), d * n(1.2)), side(dir(n(6)), d * n(1.6)), 1, () => 'p_steel', LIGHT);
    blob(part, at, n(3), 'p_iron');
  } else if (kind === 'orb') {
    const c: [number, number] = [at[0], at[1] - n(3)];
    blob(part, c, n(5), 'p_glow', BASE);
    part.set(Math.round(c[0] - n(1)), Math.round(c[1] - n(1)), 'p_white');
  } else if (kind === 'tome') {
    const w = n(5), h = n(6);
    polygon(part, [[at[0] - w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] + h / 2], [at[0] - w / 2, at[1] + h / 2]], 'p_purple', BASE);
    stroke(part, [at[0] - w / 2 + 1, at[1] - h / 2], [at[0] - w / 2 + 1, at[1] + h / 2], 1, () => 'p_gold');
  } else if (kind === 'shield_round') {
    const s = n(8);
    blob(part, at, s, 'p_wood', BASE);
    blob(part, at, Math.max(2, s - 4), 'p_shieldc', BASE);
    blob(part, at, n(2), 'p_steel', LIGHT);
  } else if (kind === 'shield_kite') {
    const w = n(7), h = n(11);
    polygon(part, [[at[0] - w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] - h / 2], [at[0] + w / 2, at[1]], [at[0], at[1] + h / 2], [at[0] - w / 2, at[1]]], 'p_shieldc', BASE);
    stroke(part, [at[0], at[1] - h / 2 + 1], [at[0], at[1] + h / 2 - 2], 1, () => 'p_gold');
    stroke(part, [at[0] - w / 2 + 1, at[1] - h / 4], [at[0] + w / 2 - 1, at[1] - h / 4], 1, () => 'p_gold');
  } else if (kind === 'shield_tower') {
    const w = n(8), h = n(13);
    polygon(part, [[at[0] - w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] + h / 2], [at[0] - w / 2, at[1] + h / 2]], 'p_iron', BASE);
    polygon(part, [[at[0] - w / 2 + 1, at[1] - h / 2 + 1], [at[0] + w / 2 - 1, at[1] - h / 2 + 1], [at[0] + w / 2 - 1, at[1] + h / 2 - 1], [at[0] - w / 2 + 1, at[1] + h / 2 - 1]], 'p_shieldc', BASE);
    blob(part, at, n(2), 'p_gold', LIGHT);
  }
}

/** Escala de la bici: a 32 px (u < 0.8) va más chica, si no el ciclista con la bici no cabe en la celda (la cabeza chibi es grande). */
export const bikeU = (u: number) => (u < 0.8 ? u * 0.7 : u);

/**
 * Cuánto se baja la cadera del ciclista (pixeles, negativo) para que la cabeza quepa en la celda: el asiento a
 * `seatH`, el torso y la cabeza encima. Con un chibi normal da 0; con un cuerpo alto (los héroes) baja lo justo.
 */
export function bikeDrop(d: { cell: number; torsoH: number; headW: number }, seatH: number): number {
  const top = seatH + d.torsoH + Math.round(d.headW * 0.95) + 3;
  return Math.min(0, d.cell - 3 - top);
}

/** Implementos en el piso: skate, bici, valla. x = centro, groundY = fila del piso. */
export function drawGround(part: Part, kind: PropKind, x: number, groundY: number, u: number, phase = 0, lay = 0) {
  if (kind === 'skate') {
    const len = Math.round(18 * u), h = Math.max(1, Math.round(u));
    const y = groundY - Math.max(2, Math.round(2 * u)) - h;
    for (let i = 0; i < len; i++) for (let j = 0; j < h; j++) part.set(Math.round(x - len / 2 + i), y + j, 'p_blue', j === 0 ? LIGHT : BASE);
    part.set(Math.round(x - len / 2) - 1, y - 1, 'p_blue');
    part.set(Math.round(x + len / 2), y - 1, 'p_blue');
    const wr = Math.max(2, Math.round(2 * u));
    blob(part, [x - len / 2 + 3 * u, groundY - wr / 2], wr, 'p_yellow');
    blob(part, [x + len / 2 - 3 * u, groundY - wr / 2], wr, 'p_yellow');
  } else if (kind === 'bike') {
    u = bikeU(u);
    const R = Math.round(7 * u), sep = Math.round(17 * u);
    // acostada (caída): todo se aplasta contra el piso, como una bici tirada de lado vista desde el costado
    const k = 1 - 0.78 * Math.max(0, Math.min(1, lay));
    const P = lay > 0 ? (p: [number, number]): [number, number] => [p[0], groundY - (groundY - p[1]) * k] : (p: [number, number]) => p;
    const c1: [number, number] = [x - sep / 2, groundY - R], c2: [number, number] = [x + sep / 2, groundY - R];
    for (const c of [c1, c2]) {
      const pts: [number, number][] = [];
      for (let q = 0; q < 16; q++) { const a = (q / 16) * Math.PI * 2; pts.push(P([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R])); }
      for (let q = 0; q < 16; q++) stroke(part, pts[q], pts[(q + 1) % 16], Math.max(1, Math.round(u)), () => 'p_black');
      // rayos que giran
      for (let s = 0; s < 2; s++) {
        const a = phase * Math.PI * 2 + (s * Math.PI) / 2;
        stroke(part, P([c[0] - Math.cos(a) * (R - 1), c[1] - Math.sin(a) * (R - 1)]), P([c[0] + Math.cos(a) * (R - 1), c[1] + Math.sin(a) * (R - 1)]), 1, () => 'p_metal');
      }
    }
    const seat: [number, number] = [x - 3 * u, groundY - R * 2.3];
    const crank: [number, number] = [x, groundY - R];
    const bar: [number, number] = [x + sep / 2 - 1 * u, groundY - R * 2.5];
    const t = Math.max(1, Math.round(u));
    stroke(part, P(c1), P(crank), t, () => 'p_red');
    stroke(part, P(crank), P(seat), t, () => 'p_red');
    stroke(part, P(seat), P([bar[0], seat[1] + 1]), t, () => 'p_red');
    stroke(part, P(c2), P(bar), t, () => 'p_red');
    stroke(part, P([seat[0] - 2 * u, seat[1] - 1]), P([seat[0] + 2 * u, seat[1] - 1]), t + 1, () => 'p_black');
    stroke(part, P([bar[0] - 1, bar[1]]), P([bar[0] + 2 * u, bar[1] - 1]), t, () => 'p_black');
  } else if (kind === 'hurdle') {
    const h = Math.round(12 * u), w = Math.round(3 * u);
    stroke(part, [x, groundY - 1], [x, groundY - h], Math.max(1, Math.round(u)), () => 'p_grey');
    for (let i = 0; i < 2 * u; i++) stroke(part, [x - w, groundY - h + i], [x + w, groundY - h + i], 1, () => (i < u ? 'p_white' : 'p_red'));
  }
}

/** Centro de la rueda delantera, pedal y asiento de la bici (para poner al ciclista). */
export function bikeGeometry(x: number, groundY: number, u: number) {
  u = bikeU(u);
  const R = Math.round(7 * u);
  return { seat: [x - 3 * u, groundY - R * 2.3] as [number, number], crank: [x, groundY - R] as [number, number], bar: [x + Math.round(17 * u) / 2 - 1 * u, groundY - R * 2.5] as [number, number], crankR: Math.max(2, Math.round(3 * u)) };
}

/**
 * Armas del piso de la pelea callejera: objetos sueltos que el juego pone en el piso, se recogen, se llevan en la mano
 * o sobre la cabeza y se tiran. Todos se dibujan con código, en su postura de piso, con la base (centro de abajo) en
 * (0, 0) y hacia arriba. u = escala (1 a 48 px).
 */
export const FLOOR_PROP_KINDS = [
  'chancleta', 'silla_plastica', 'non_la', 'coco', 'tubo', 'llanta', 'pote_basura', 'cono', 'escoba', 'piedra',
  'paraguas', 'abanico', 'termo', 'furro', 'broomstick', 'balon_goma', 'chapa', 'tejo', 'volante_dacau',
] as const;
export type FloorPropKind = (typeof FLOOR_PROP_KINDS)[number];

/** Cómo se usa cada arma del piso: qué animación de quien la agarra le toca. */
export type FloorPropUse = 'swing' | 'heavy' | 'throw' | 'block' | 'gust';

export interface FloorPropInfo {
  nombre: { es: string; en: string };
  peso: 'liviano' | 'medio' | 'pesado';
  /** gira en el aire cuando se lanza */
  rota: boolean;
  uso: FloorPropUse;
  /** variantes de color (la primera es la de siempre) */
  colores?: string[];
}

export const FLOOR_PROPS: Record<FloorPropKind, FloorPropInfo> = {
  chancleta: { nombre: { es: 'Chancleta', en: 'Flip-flop' }, peso: 'liviano', rota: true, uso: 'throw', colores: ['#2bb3a3', '#e0466a', '#f2c94c'] },
  silla_plastica: { nombre: { es: 'Silla plástica', en: 'Plastic chair' }, peso: 'pesado', rota: true, uso: 'heavy', colores: ['#d23c3c', '#3d6fd6', '#4caf50'] },
  non_la: { nombre: { es: 'Nón lá', en: 'Conical hat' }, peso: 'liviano', rota: true, uso: 'throw' },
  coco: { nombre: { es: 'Coco', en: 'Coconut' }, peso: 'medio', rota: true, uso: 'throw' },
  tubo: { nombre: { es: 'Tubo', en: 'Pipe' }, peso: 'medio', rota: true, uso: 'swing' },
  llanta: { nombre: { es: 'Llanta', en: 'Tire' }, peso: 'pesado', rota: true, uso: 'heavy' },
  pote_basura: { nombre: { es: 'Pote de basura', en: 'Trash can' }, peso: 'pesado', rota: true, uso: 'heavy' },
  cono: { nombre: { es: 'Cono', en: 'Traffic cone' }, peso: 'medio', rota: true, uso: 'heavy' },
  escoba: { nombre: { es: 'Escoba', en: 'Broom' }, peso: 'medio', rota: true, uso: 'swing' },
  piedra: { nombre: { es: 'Piedra', en: 'Rock' }, peso: 'liviano', rota: true, uso: 'throw' },
  paraguas: { nombre: { es: 'Paraguas', en: 'Umbrella' }, peso: 'medio', rota: true, uso: 'swing', colores: ['#24305e', '#d23c3c', '#2bb3a3'] },
  abanico: { nombre: { es: 'Abanico', en: 'Hand fan' }, peso: 'liviano', rota: true, uso: 'gust', colores: ['#d23c3c', '#8a4fd6', '#e2b23c'] },
  termo: { nombre: { es: 'Termo de tinto', en: 'Coffee flask' }, peso: 'liviano', rota: true, uso: 'throw' },
  furro: { nombre: { es: 'Furro', en: 'Furro drum' }, peso: 'pesado', rota: true, uso: 'heavy' },
  broomstick: { nombre: { es: 'Palo de escoba', en: 'Broomstick' }, peso: 'medio', rota: true, uso: 'swing' },
  balon_goma: { nombre: { es: 'Balón de goma', en: 'Rubber ball' }, peso: 'liviano', rota: true, uso: 'throw' },
  chapa: { nombre: { es: 'Chapa', en: 'Bottle cap' }, peso: 'liviano', rota: true, uso: 'throw', colores: ['#d23c3c', '#3d6fd6', '#e2b23c'] },
  tejo: { nombre: { es: 'Tejo', en: 'Tejo disc' }, peso: 'liviano', rota: true, uso: 'throw' },
  volante_dacau: { nombre: { es: 'Volante de đá cầu', en: 'Đá cầu shuttlecock' }, peso: 'liviano', rota: true, uso: 'throw' },
};

export interface FloorPropOpts {
  /** pote con la tapa puesta (si no, sin tapa) */
  lid?: boolean;
  /** paraguas y abanico abiertos */
  open?: boolean;
  /** material de color de la variante (la ficha de colores del objeto) */
  color?: string;
  /** cuadro de una animación propia (vapor del termo, plumas del volante) */
  phase?: number;
}

/**
 * Dónde se agarra cada objeto, desde su base (x a la derecha, y hacia abajo): ahí va la mano y ahí gira en la mano.
 * Los largos se toman de un extremo; los chicos, del centro; los pesados, del borde de arriba.
 */
export function floorPropGrip(kind: FloorPropKind, u: number, opts: FloorPropOpts = {}): [number, number] {
  const n = (v: number) => Math.max(1, Math.round(v * u));
  switch (kind) {
    case 'tubo': case 'broomstick': return [-n(7), -n(1)];
    case 'escoba': return [-n(6), -n(2)];
    case 'paraguas': return opts.open ? [0, -n(2)] : [-n(7), -n(1)];
    case 'abanico': return opts.open ? [0, -1] : [-n(3), -1];
    case 'silla_plastica': return [-n(3), -n(13)];
    case 'llanta': return [0, -n(11)];
    case 'pote_basura': return [0, -n(12)];
    case 'cono': return [0, -n(10)];
    case 'furro': return [0, -n(10)];
    case 'termo': return [0, -n(5)];
    case 'volante_dacau': return [0, -1];
    default: return [0, -Math.max(1, Math.round(floorPropSize(kind, u)[1] / 2))];
  }
}

/** Ancho y alto aproximados de cada objeto parado en el piso (para centrar y agarrar). */
export function floorPropSize(kind: FloorPropKind, u: number): [number, number] {
  const n = (v: number) => Math.max(1, Math.round(v * u));
  const S: Record<FloorPropKind, [number, number]> = {
    chancleta: [9, 3], silla_plastica: [11, 14], non_la: [14, 6], coco: [7, 7], tubo: [18, 2], llanta: [12, 12], pote_basura: [11, 14],
    cono: [9, 11], escoba: [18, 4], piedra: [6, 4], paraguas: [18, 3], abanico: [8, 2], termo: [4, 10], furro: [10, 11],
    broomstick: [18, 2], balon_goma: [7, 7], chapa: [3, 2], tejo: [6, 2], volante_dacau: [5, 6],
  };
  const [w, h] = S[kind];
  return [n(w), n(h)];
}

/** Dibuja un objeto del piso con la base en `base` (centro de abajo). */
export function drawFloorProp(part: Part, kind: FloorPropKind, base: [number, number], u: number, opts: FloorPropOpts | boolean = {}) {
  const o: FloorPropOpts = typeof opts === 'boolean' ? { lid: opts } : opts;
  const n = (v: number) => Math.max(1, Math.round(v * u));
  const bx = Math.round(base[0]), by = Math.round(base[1]);
  const color = o.color ?? 'p_color0';
  /** rectángulo con luz a la izquierda y sombra a la derecha */
  const box = (x0: number, y0: number, w: number, h: number, mat: string, shade = true) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const t = i / Math.max(1, w - 1);
      part.set(x0 + i, y0 + j, mat, !shade ? BASE : t < 0.3 ? LIGHT : t > 0.75 ? SHADOW : BASE);
    }
  };
  const rod = (len: number, t: number, mat: string, x0 = bx - Math.floor(len / 2)) => {
    for (let j = 0; j < t; j++) for (let i = 0; i < len; i++) part.set(x0 + i, by - j, mat, j === t - 1 && t > 1 ? LIGHT : BASE);
  };
  switch (kind) {
    case 'pote_basura': {
      const h = n(12), wb = n(8), wt = n(10);
      for (let j = 0; j < h; j++) {
        // un poco más ancho arriba (cónico, como los de lata); las canaletas cada 3 pixeles, más oscuras
        const w = Math.round(wb + ((wt - wb) * j) / Math.max(1, h - 1));
        const y = by - j, x0 = bx - Math.floor(w / 2);
        for (let i = 0; i < w; i++) {
          const t = i / Math.max(1, w - 1);
          let slot = t < 0.3 ? LIGHT : t > 0.75 ? SHADOW : BASE;
          if (i > 0 && i < w - 1 && i % 3 === 1 && slot !== SHADOW) slot = slot === LIGHT ? BASE : SHADOW;
          part.set(x0 + i, y, 'p_steel', slot);
        }
      }
      for (const k of [0.3, 0.72]) {
        const y = by - Math.round(h * k), w = Math.round(wb + (wt - wb) * k);
        for (let i = 0; i < w; i++) part.set(bx - Math.floor(w / 2) + i, y, 'p_iron', i < w * 0.3 ? BASE : SHADOW);
      }
      if (o.lid === false) return;
      drawPoteLid(part, [bx, by - h], u);
      return;
    }
    case 'chancleta': {
      // de costado: suela gruesa con la tira en V arriba
      const w = n(9);
      box(bx - Math.floor(w / 2), by - n(1) + 1, w, n(1), 'p_white', false);
      box(bx - Math.floor(w / 2), by - n(2) + 1, w, 1, color);
      const sx = bx - Math.floor(w / 2) + Math.round(w * 0.35);
      part.set(sx, by - n(2), color, LIGHT); part.set(sx + 1, by - n(3), color, LIGHT); part.set(sx + n(3), by - n(2), color, BASE); part.set(sx + n(2), by - n(3), color, BASE);
      return;
    }
    case 'silla_plastica': {
      // silla monobloc de lado: patas abiertas, asiento y respaldo inclinado
      const h = n(14), seatY = by - n(7), w = n(9);
      const x0 = bx - Math.floor(w / 2);
      stroke(part, [x0, by], [x0 + n(1), seatY], 1, () => color, SHADOW);
      stroke(part, [x0 + w - 1, by], [x0 + w - 2, seatY], 1, () => color, SHADOW);
      box(x0, seatY - n(1) + 1, w, n(1) + 1, color);
      stroke(part, [x0, seatY], [x0 - n(2), by - h], n(1) + (u >= 1 ? 1 : 0), () => color, BASE);
      stroke(part, [x0 - n(2), by - h], [x0 - n(2), by - h + n(3)], n(1) + 1, () => color, LIGHT);
      return;
    }
    case 'non_la': {
      // sombrero cónico de lado: triángulo de paja con las rayas del tejido
      const w = n(14), h = n(6);
      const pts: [number, number][] = [[bx - w / 2, by], [bx + w / 2, by], [bx, by - h]];
      polygon(part, pts, 'p_straw', BASE);
      for (let k = 1; k < 3; k++) { const y = by - Math.round((h * k) / 3); const half = Math.round((w / 2) * (1 - k / 3)); for (let i = -half; i <= half; i++) if (part.has(bx + i, y)) part.set(bx + i, y, 'p_straw', SHADOW); }
      for (let i = 0; i < w; i++) part.set(bx - Math.floor(w / 2) + i, by, 'p_straw', SHADOW);
      return;
    }
    case 'coco': {
      const s = n(7);
      blob(part, [bx, by - (s - 1) / 2], s, 'p_brown', BASE);
      for (const [x, y, p] of [...part.entries()]) if (p.mat === 'p_brown' && x < bx && y < by - s / 2) part.set(x, y, 'p_brown', LIGHT);
      // los tres ojitos del coco
      part.set(bx - 1, by - Math.round(s * 0.6), 'p_black'); part.set(bx + 1, by - Math.round(s * 0.6), 'p_black'); part.set(bx, by - Math.round(s * 0.4), 'p_black');
      return;
    }
    case 'tubo': rod(n(18), Math.max(2, n(2)), 'p_metal'); part.set(bx + Math.floor(n(18) / 2) - 1, by - 1, 'p_iron'); return;
    case 'broomstick': rod(n(18), Math.max(1, n(1.5)), 'p_wood'); return;
    case 'escoba': {
      const len = n(13), x0 = bx - n(9);
      rod(len, Math.max(1, n(1.5)), 'p_wood', x0);
      // cerdas en abanico al final del palo
      const bw = n(5), bh = n(4);
      for (let i = 0; i < bw; i++) for (let j = 0; j < bh; j++) if (j <= (i * bh) / bw + 1) part.set(x0 + len + i, by - j + Math.floor(bh / 2) - 1, 'p_straw', i % 2 ? SHADOW : BASE);
      return;
    }
    case 'llanta': {
      const R = n(6);
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
        const d = Math.hypot(x, y);
        if (d <= R + 0.3 && d >= R * 0.45) part.set(bx + x, by - R + y, 'p_black', d > R * 0.8 ? SHADOW : x + y < 0 ? LIGHT : BASE);
        else if (d < R * 0.45 && d >= R * 0.25) part.set(bx + x, by - R + y, 'p_grey', BASE);
      }
      return;
    }
    case 'cono': {
      const h = n(10), w = n(9);
      box(bx - Math.floor(w / 2), by, w, 1, 'p_orange');
      for (let j = 1; j <= h; j++) {
        const half = Math.max(0, Math.round((w / 2 - 1) * (1 - j / h)));
        const band = j > h * 0.35 && j < h * 0.55;
        for (let i = -half; i <= half; i++) part.set(bx + i, by - j, band ? 'p_white' : 'p_orange', i < 0 ? LIGHT : i > half / 2 ? SHADOW : BASE);
      }
      return;
    }
    case 'piedra': {
      const w = n(6), h = n(4);
      for (let j = 0; j < h; j++) { const ww = w - (j === h - 1 ? 2 : j === 0 ? 0 : 0); for (let i = 0; i < ww; i++) part.set(bx - Math.floor(w / 2) + i + (j === h - 1 ? 1 : 0), by - j, 'p_grey', i < ww * 0.4 && j > 0 ? LIGHT : j === 0 ? SHADOW : BASE); }
      return;
    }
    case 'paraguas': {
      if (o.open) {
        // abierto, de frente al golpe: copa en media luna con varillas y el mango hacia abajo
        const R = n(8);
        for (let y = -R; y <= 0; y++) for (let x = -R; x <= R; x++) if (x * x + y * y * 2.2 <= R * R) part.set(bx + x, by - n(4) + y, color, y > -2 ? SHADOW : Math.abs(x) % n(4) === 0 ? SHADOW : x < 0 ? LIGHT : BASE);
        stroke(part, [bx, by - n(4)], [bx, by], 1, () => 'p_black');
        part.set(bx + 1, by, 'p_black');
        return;
      }
      // cerrado y acostado: mango en gancho a la izquierda, tela enrollada que se afina hacia la punta
      const len = n(16), x0 = bx - Math.floor(len / 2);
      rod(len, 1, 'p_black', x0);
      for (let i = Math.round(len * 0.35); i < len - 1; i++) { const t = Math.round(2 * (1 - (i - len * 0.35) / (len * 0.65))) + 1; for (let j = 0; j < t; j++) part.set(x0 + i, by - j, color, j === t - 1 ? LIGHT : BASE); }
      part.set(x0 - 1, by - 1, 'p_black'); part.set(x0 - 1, by - 2, 'p_black'); part.set(x0, by - 2, 'p_black');
      return;
    }
    case 'abanico': {
      if (o.open) {
        // abierto: media rueda de varillas con la tela pintada
        const R = n(6);
        for (let y = -R; y <= 0; y++) for (let x = -R; x <= R; x++) { const d = Math.hypot(x, y); if (d <= R && d >= 1.5) part.set(bx + x, by + y, color, Math.round((Math.atan2(y, x) * 180) / Math.PI / 20) % 2 ? BASE : LIGHT); }
        part.set(bx, by, 'p_wood');
        return;
      }
      rod(n(7), Math.max(1, n(1.5)), color, bx - n(3)); part.set(bx - n(3), by, 'p_wood');
      return;
    }
    case 'termo': {
      // termo de tinto: cuerpo a cuadros con tapa y vapor que sube (4 cuadros)
      const w = n(4), h = n(9);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) part.set(bx - Math.floor(w / 2) + i, by - j, (i + j) % 3 === 0 ? 'p_cream' : 'p_red', i === 0 ? LIGHT : i === w - 1 ? SHADOW : BASE);
      box(bx - Math.floor(w / 2), by - h, w, 1, 'p_black', false);
      if (o.phase !== undefined) {
        const ph = o.phase % 4;
        for (let k = 0; k < 3; k++) { const y = by - h - 2 - k * 2 - (ph % 2); const x = bx + ((k + ph) % 2 ? 1 : -1); part.set(x, y, 'p_white', LIGHT); }
      }
      return;
    }
    case 'furro': {
      // furro: tambor de madera con el cuero arriba amarrado con cuerdas en zigzag y el palo de frotar
      const w = n(9), h = n(10);
      box(bx - Math.floor(w / 2), by - h + 1, w, h, 'p_wood');
      box(bx - Math.floor(w / 2), by - h, w, 1, 'p_cream', false);
      for (let j = 1; j < h - 1; j += 2) { const x = bx - Math.floor(w / 2) + ((j / 2) % 2 ? 1 : w - 2); part.set(x, by - j, 'p_white', BASE); }
      stroke(part, [bx, by - h], [bx + n(1), by - h - n(4)], 1, () => 'p_brown');
      return;
    }
    case 'balon_goma': {
      const s = n(7);
      blob(part, [bx, by - (s - 1) / 2], s, 'p_red', BASE);
      for (const [x, y, p] of [...part.entries()]) if (p.mat === 'p_red' && x - bx < -(by - s / 2 - y) * 0.3 - 1) part.set(x, y, 'p_red', LIGHT);
      for (let i = -Math.floor(s / 2); i <= Math.floor(s / 2); i++) if (part.has(bx + i, by - Math.floor(s / 2))) part.set(bx + i, by - Math.floor(s / 2), 'p_white', BASE);
      return;
    }
    case 'chapa': {
      const w = n(3);
      box(bx - Math.floor(w / 2), by, w, 1, color);
      box(bx - Math.floor(w / 2), by - 1, w, 1, 'p_metal', false);
      return;
    }
    case 'tejo': {
      const w = n(6);
      box(bx - Math.floor(w / 2), by, w, 1, 'p_iron');
      box(bx - Math.floor(w / 2) + 1, by - 1, w - 2, 1, 'p_steel', false);
      return;
    }
    case 'volante_dacau': {
      // base pesada de goma y plumas de colores en abanico (se mueven con `phase`)
      box(bx - 1, by - n(1) + 1, 3, n(1), 'p_black', false);
      const cols = ['p_red', 'p_yellow', 'p_green', 'p_blue', 'p_pink'];
      const sway = o.phase !== undefined && o.phase % 2 ? 1 : 0;
      for (let k = 0; k < 5; k++) stroke(part, [bx, by - n(1)], [bx - 2 + k + (k > 2 ? sway : -sway), by - n(5)], 1, () => cols[k], LIGHT);
      return;
    }
  }
}

/** La tapa del pote sola (sale volando cuando el pote pega), con la base en `base`. */
export function drawPoteLid(part: Part, base: [number, number], u: number) {
  const n = (v: number) => Math.max(1, Math.round(v * u));
  const bx = Math.round(base[0]), ly = Math.round(base[1]);
  const lw = n(10) + 2;
  for (let i = 0; i < lw; i++) part.set(bx - Math.floor(lw / 2) + i, ly, 'p_steel', i < lw * 0.35 ? LIGHT : BASE);
  const dw = lw - n(3);
  for (let i = 0; i < dw; i++) part.set(bx - Math.floor(dw / 2) + i, ly - 1, 'p_steel', i < dw * 0.4 ? LIGHT : BASE);
  const hw = Math.max(2, n(3));
  for (let i = 0; i < hw; i++) part.set(bx - Math.floor(hw / 2) + i, ly - 2 - (u >= 1.2 ? 1 : 0), 'p_iron', BASE);
  part.set(bx - Math.floor(hw / 2), ly - 2, 'p_iron', BASE);
  part.set(bx - Math.floor(hw / 2) + hw - 1, ly - 2, 'p_iron', BASE);
}

/** Gira una pieza `deg` grados alrededor de (0, 0), muestreando hacia atrás (sin agujeros, sin colores nuevos). */
export function rotatePart(src: Part, deg: number): Part {
  const k = ((Math.round(deg) % 360) + 360) % 360;
  if (!k) return src;
  const out = new Part();
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of src.entries()) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const X = (x + dx - 0.5) * c - (y + dy - 0.5) * s, Y = (x + dx - 0.5) * s + (y + dy - 0.5) * c;
    x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
  }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    const sx = Math.round(x * c + y * s), sy = Math.round(-x * s + y * c);
    const p = src.get(sx, sy);
    if (p) out.set(x, y, p.mat, p.slot);
  }
  return out;
}

/**
 * Un arma del piso en la mano: el agarre en `grip` y el objeto girado `angle` grados (0 = hacia la derecha, como en el
 * piso; los largos apuntan hacia donde mira el ángulo).
 */
export function drawHeldFloorProp(part: Part, kind: FloorPropKind, grip: [number, number], angle: number, u: number, opts: FloorPropOpts = {}) {
  const tmp = new Part();
  const [gx, gy] = floorPropGrip(kind, u, opts);
  drawFloorProp(tmp, kind, [-gx, -gy], u, opts);
  const rot = rotatePart(tmp, angle);
  for (const [x, y, p] of rot.entries()) part.set(Math.round(grip[0]) + x, Math.round(grip[1]) + y, p.mat, p.slot);
}
