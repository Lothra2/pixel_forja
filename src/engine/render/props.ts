import { Part, stroke, blob, polygon, rot } from './part';
import { SHADOW, BASE, LIGHT } from '../color/ramp';
import type { PropKind } from '../rig/pose';

/**
 * Implementos dibujados con código, con grosor fijo. Se dibujan en coordenadas del lienzo
 * a partir de un punto de enganche y un ángulo. u = escala (1 a 48 px).
 */
export function ballSize(kind: PropKind, u: number): number {
  const base = kind === 'basketball' || kind === 'volleyball' ? 7 : kind === 'soccer' ? 6 : kind === 'baseball' ? 3 : 3;
  return Math.max(kind === 'tennisball' || kind === 'baseball' ? 2 : 4, Math.round(base * u));
}

export function isBall(kind: PropKind): boolean {
  return kind === 'soccer' || kind === 'basketball' || kind === 'volleyball' || kind === 'tennisball' || kind === 'baseball';
}

/** Dibuja un balón con centro en c. */
export function drawBall(part: Part, kind: PropKind, c: [number, number], u: number) {
  const s = ballSize(kind, u);
  const main = kind === 'basketball' ? 'p_orange' : kind === 'tennisball' ? 'p_lime' : 'p_white';
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
 * Implementos que se sostienen: el ángulo dice hacia dónde apunta (0 = derecha, 90 = abajo).
 * at = punto de agarre (mano).
 */
export function drawHeld(part: Part, kind: PropKind, at: [number, number], angle: number, u: number, rest = false) {
  const dir = (len: number): [number, number] => {
    const [x, y] = rot([len, 0], angle);
    return [at[0] + x, at[1] + y];
  };
  const t = Math.max(1, Math.round(u));
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

/** Implementos en el piso: skate, bici, valla. x = centro, groundY = fila del piso. */
export function drawGround(part: Part, kind: PropKind, x: number, groundY: number, u: number, phase = 0) {
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
    const R = Math.round(7 * u), sep = Math.round(17 * u);
    const c1: [number, number] = [x - sep / 2, groundY - R], c2: [number, number] = [x + sep / 2, groundY - R];
    for (const c of [c1, c2]) {
      const pts: [number, number][] = [];
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; pts.push([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R]); }
      for (let k = 0; k < 16; k++) stroke(part, pts[k], pts[(k + 1) % 16], Math.max(1, Math.round(u)), () => 'p_black');
      // rayos que giran
      for (let s = 0; s < 2; s++) {
        const a = phase * Math.PI * 2 + (s * Math.PI) / 2;
        stroke(part, [c[0] - Math.cos(a) * (R - 1), c[1] - Math.sin(a) * (R - 1)], [c[0] + Math.cos(a) * (R - 1), c[1] + Math.sin(a) * (R - 1)], 1, () => 'p_metal');
      }
    }
    const seat: [number, number] = [x - 3 * u, groundY - R * 2.3];
    const crank: [number, number] = [x, groundY - R];
    const bar: [number, number] = [x + sep / 2 - 1 * u, groundY - R * 2.5];
    const t = Math.max(1, Math.round(u));
    stroke(part, c1, crank, t, () => 'p_red');
    stroke(part, crank, seat, t, () => 'p_red');
    stroke(part, seat, [bar[0], seat[1] + 1], t, () => 'p_red');
    stroke(part, c2, bar, t, () => 'p_red');
    stroke(part, [seat[0] - 2 * u, seat[1] - 1], [seat[0] + 2 * u, seat[1] - 1], t + 1, () => 'p_black');
    stroke(part, [bar[0] - 1, bar[1]], [bar[0] + 2 * u, bar[1] - 1], t, () => 'p_black');
  } else if (kind === 'hurdle') {
    const h = Math.round(12 * u), w = Math.round(3 * u);
    stroke(part, [x, groundY - 1], [x, groundY - h], Math.max(1, Math.round(u)), () => 'p_grey');
    for (let i = 0; i < 2 * u; i++) stroke(part, [x - w, groundY - h + i], [x + w, groundY - h + i], 1, () => (i < u ? 'p_white' : 'p_red'));
  }
}

/** Centro de la rueda delantera, pedal y asiento de la bici (para poner al ciclista). */
export function bikeGeometry(x: number, groundY: number, u: number) {
  const R = Math.round(7 * u);
  return { seat: [x - 3 * u, groundY - R * 2.3] as [number, number], crank: [x, groundY - R] as [number, number], bar: [x + Math.round(17 * u) / 2 - 1 * u, groundY - R * 2.5] as [number, number], crankR: Math.max(2, Math.round(3 * u)) };
}
