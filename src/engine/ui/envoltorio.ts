import { Pix, sparkle, star5, rng, bayer } from '../fx/pix';
import { createRaster, type Raster } from '../core/raster';
import { mixHex, type UiPiece } from './retro';

/**
 * El envoltorio del juego (lote G2): lo que rodea a las pruebas. Medallas, banderas que ondean, íconos de prueba,
 * tarjetas de equipo con su escudo, el podio en el estadio, el marco del VS y los fondos de las pantallas retro.
 * Todo pixel art con código y todo sale en `ui.interfaz`, como el resto de la interfaz.
 */

const INK = '#0e0c18', WHITE = '#ffffff';

// ---------------------------------------------------------------- medallas

/** Rampas de metal: de la luz a la sombra, y el contorno al final. */
export const METALES = {
  oro: ['#fff6c2', '#ffd84a', '#e8a822', '#a86c12', '#5a3606'],
  plata: ['#ffffff', '#e6ecf4', '#b0bccc', '#6e7a8e', '#363c4c'],
  bronce: ['#ffe4c4', '#f2a868', '#c8702e', '#844014', '#421c06'],
} as const;
export type Metal = keyof typeof METALES;
export const MEDALLAS: Metal[] = ['oro', 'plata', 'bronce'];
export const TAMANOS_MEDALLA = [16, 32, 64] as const;

/**
 * Una medalla de `s` x `s`: el disco abajo, con relieve (luz arriba a la izquierda), canto, una estrella en el medio
 * y la cinta en V arriba. A 32 y 64 lleva un destello.
 */
export function medalla(metal: Metal, s: number): Pix {
  const p = new Pix(s, s);
  const m = METALES[metal];
  const k = s / 16;
  // la cinta: dos tiras que bajan de las esquinas de arriba al disco
  const cinta = ['#7a1424', '#c8283c', '#ffffff'];
  const cy = s - 1 - Math.round(5.5 * k) - (s >= 32 ? 1 : 0), rad = 5.5 * k - 0.5;
  const ancho = Math.max(1, Math.round(1.6 * k));
  for (const lado of [-1, 1]) {
    const x0 = s / 2 + lado * (s * 0.38), x1 = s / 2 + lado * (rad * 0.35);
    const y1 = cy - rad * 0.7;
    const n = Math.ceil(Math.hypot(x1 - x0, y1));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y1 * t;
      for (let w = -ancho; w <= ancho; w++) {
        const c = Math.abs(w) === ancho ? cinta[0] : s >= 32 && w === 0 ? cinta[2] : cinta[1];
        p.px(x + w, y, c);
      }
    }
  }
  // el disco con relieve: normal de una cúpula baja, luz de arriba a la izquierda
  const cx = (s - 1) / 2;
  const canto = Math.max(1, Math.round(k * 0.9));
  for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d > rad + 0.4) continue;
    // canto: un anillo más claro arriba a la izquierda y más oscuro abajo a la derecha
    if (d > rad - canto) { p.px(x, y, dx + dy < 0 ? m[1] : m[3]); continue; }
    const nx = dx / rad, ny = dy / rad, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * 1.6;
    const l = (-0.5 * nx - 0.6 * ny + 0.62 * nz) / Math.hypot(nx, ny, nz);
    p.px(x, y, l > 0.9 ? m[0] : l > 0.62 ? m[1] : l > 0.3 ? m[2] : m[3]);
  }
  // la estrella del centro en relieve: cara de luz, borde de sombra abajo a la derecha
  if (s >= 32) {
    const R = rad * 0.55, r = R * 0.45;
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
    const dentro = (x: number, y: number) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    for (let y = Math.floor(cy - R - 1); y <= Math.ceil(cy + R + 1); y++) for (let x = Math.floor(cx - R - 1); x <= Math.ceil(cx + R + 1); x++) {
      // grabada en el metal: cara un tono más oscura que el disco, borde de luz arriba a la izquierda y de sombra abajo
      if (dentro(x, y)) p.px(x, y, dentro(x - 1, y - 1) ? m[2] : m[0]);
      else if (dentro(x - 1, y - 1)) p.px(x, y, m[3]);
    }
  } else {
    p.px(Math.round(cx), Math.round(cy), m[0]);
    p.px(Math.round(cx) - 1, Math.round(cy), m[1]);
    p.px(Math.round(cx) + 1, Math.round(cy), m[1]);
    p.px(Math.round(cx), Math.round(cy) - 1, m[1]);
  }
  p.outline(m[4]);
  if (s >= 32) sparkle(p, Math.round(cx - rad * 0.55), Math.round(cy - rad * 0.55), Math.max(2, Math.round(k)), WHITE, m[0]);
  return p;
}

/** Las tres medallas en tiras de 3 cuadros (oro, plata, bronce), una por tamaño. */
export function medallas(): UiPiece[] {
  return TAMANOS_MEDALLA.map((s) => ({
    name: `medallas_${s}`, frames: MEDALLAS.map((m) => medalla(m, s).r), w: s, h: s,
    extra: { orden: [...MEDALLAS], nota: 'Un cuadro por medalla: 0 oro, 1 plata, 2 bronce. La cinta arriba, el disco abajo.' },
  }));
}

/** La tela de la cinta de participación: de la luz a la sombra, y el contorno al final. */
export const TELA_CINTA = ['#eafcff', '#8ee0ee', '#38aac4', '#1a6c86', '#0a2a3a'] as const;
export const TAMANOS_CINTA = [16, 32] as const;

/**
 * La cinta de participación de `s` x `s`, para el cuarto puesto: una escarapela de tela plisada en el mismo sitio y del
 * mismo tamaño que el disco de las medallas, con su cinta en V arriba como ellas, pero de tela turquesa y sin metal.
 * En el medio, un botón crema con una estrellita (a 32) o un punto (a 16). A 32 lleva un brillito suave, sin destello.
 */
export function cinta(s: number): Pix {
  const p = new Pix(s, s);
  const t = TELA_CINTA;
  const k = s / 16;
  // la cinta en V, igual que la de las medallas pero de la tela
  const cy = s - 1 - Math.round(5.5 * k) - (s >= 32 ? 1 : 0), rad = 5.5 * k - 0.5;
  const ancho = Math.max(1, Math.round(1.6 * k));
  for (const lado of [-1, 1]) {
    const x0 = s / 2 + lado * (s * 0.38), x1 = s / 2 + lado * (rad * 0.35);
    const y1 = cy - rad * 0.7;
    const n = Math.ceil(Math.hypot(x1 - x0, y1));
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = x0 + (x1 - x0) * u, y = y1 * u;
      for (let w = -ancho; w <= ancho; w++) p.px(x + w, y, Math.abs(w) === ancho ? t[3] : s >= 32 && w === 0 ? t[0] : t[2]);
    }
  }
  // la escarapela: el borde ondulado y los pliegues en rayos, uno claro y uno oscuro
  const cx = (s - 1) / 2;
  const pliegues = s >= 32 ? 14 : 10;
  const R = rad + 0.6;
  for (let y = Math.floor(cy - R - 1); y <= Math.ceil(cy + R + 1); y++) for (let x = Math.floor(cx - R - 1); x <= Math.ceil(cx + R + 1); x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const ond = R - (s >= 32 ? 1.3 : 0.8) * Math.abs(Math.sin((a * pliegues) / 2));
    if (d > ond) continue;
    const pl = Math.floor(((a + Math.PI) / (2 * Math.PI)) * pliegues) % 2;
    // la luz de arriba a la izquierda aclara la mitad de los pliegues
    const luz = -dx - dy > 0;
    p.px(x, y, d > ond - 1 ? (luz ? t[1] : t[3]) : pl ? (luz ? t[1] : t[2]) : luz ? t[2] : t[3]);
  }
  // el botón del medio
  const rb = rad * 0.5;
  for (let y = Math.floor(cy - rb - 1); y <= Math.ceil(cy + rb + 1); y++) for (let x = Math.floor(cx - rb - 1); x <= Math.ceil(cx + rb + 1); x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > rb + 0.3) continue;
    p.px(x, y, d > rb - 0.8 ? t[4] : (x - cx) + (y - cy) < -rb * 0.4 ? '#fffbe8' : '#f0e2b8');
  }
  if (s >= 32) star5(p, Math.round(cx), Math.round(cy), '#e8c060', '#fff4c8', '#a07a24');
  else p.px(Math.round(cx), Math.round(cy), '#c8a040');
  p.outline(t[4]);
  if (s >= 32) { p.px(Math.round(cx - R * 0.55), Math.round(cy - R * 0.55), t[0]); p.px(Math.round(cx - R * 0.55) + 1, Math.round(cy - R * 0.55), t[0]); }
  return p;
}

/** La cinta de participación en 16 y 32, una pieza por tamaño. */
export function cintas(): UiPiece[] {
  return TAMANOS_CINTA.map((s) => ({
    name: `cinta_${s}`, frames: [cinta(s).r], w: s, h: s,
    extra: { puesto: 4, nota: `La cinta de participación del cuarto puesto. Mide y se ancla igual que un cuadro de medallas_${s}: la escarapela donde va el disco y la cinta arriba.` },
  }));
}

// ---------------------------------------------------------------- banderas

export const BANDERAS = ['vietnam', 'colombia', 'venezuela', 'japon', 'bogota', 'zulia'] as const;
export type Bandera = (typeof BANDERAS)[number];
export const TAMANOS_BANDERA = [16, 32] as const;

/** El color de cada punto de la bandera de `w` x `h` (sin contorno). null: fuera. */
function colorBandera(id: Bandera, w: number, h: number): (x: number, y: number) => string {
  const fy = (y: number) => (y + 0.5) / h;
  // estrella de 5 puntas para Vietnam: punto dentro del polígono
  const estrella = (cx: number, cy: number, R: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? R * 0.4 : R; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
    return (x: number, y: number) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
  };
  switch (id) {
    case 'vietnam': {
      const st = estrella((w - 1) / 2, (h - 1) / 2 + h * 0.03, h * 0.36);
      return (x, y) => (st(x, y) ? '#ffde00' : '#da251d');
    }
    case 'colombia':
      return (_x, y) => (fy(y) <= 0.5 ? '#fcd116' : fy(y) <= 0.75 ? '#003893' : '#ce1126');
    case 'venezuela': {
      // el arco de 8 estrellas blancas en la franja azul
      const cx = (w - 1) / 2, cy = h * 0.72, R = h * 0.3;
      const est = Array.from({ length: 8 }, (_, i) => { const a = Math.PI + (Math.PI * (i + 0.5)) / 8; return [cx + Math.cos(a) * R * 1.25, cy + Math.sin(a) * R] as [number, number]; });
      const r = Math.max(0.5, h / 22);
      return (x, y) => {
        const t = fy(y);
        if (t <= 1 / 3) return '#ffcc00';
        if (t > 2 / 3) return '#cf142b';
        return est.some(([sx, sy]) => Math.hypot(x - sx, y - sy) <= r + 0.15) ? '#ffffff' : '#00247d';
      };
    }
    case 'japon':
      return (x, y) => (Math.hypot(x - (w - 1) / 2, y - (h - 1) / 2) <= h * 0.3 + 0.2 ? '#bc002d' : '#ffffff');
    case 'bogota':
      return (_x, y) => (fy(y) <= 0.5 ? '#fcd116' : '#e1251b');
    case 'zulia': {
      // azul arriba y negro abajo; en el medio el sol con sus rayos, atravesado por el rayo del Catatumbo
      const cx = (w - 1) / 2, cy = (h - 1) / 2, R = h * 0.2;
      const rayo = (x: number, y: number) => {
        // zigzag de arriba a la derecha a abajo a la izquierda
        const t = (y + 0.5) / h, xs = cx + w * 0.12 - t * w * 0.24 + (t > 0.35 && t < 0.62 ? w * 0.06 : 0);
        return Math.abs(x - xs) <= Math.max(0.5, w / 40);
      };
      return (x, y) => {
        const d = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx);
        if (w >= 32 && rayo(x, y) && d < h * 0.5) return '#ffffff';
        if (d <= R + 0.2) return '#ffd21f';
        if (w >= 32 && d <= R * 1.9 && Math.cos(a * 8) > 0.55) return '#ffd21f';
        if (w < 32 && d <= R * 1.7 && Math.cos(a * 4) > 0.8) return '#ffd21f';
        return fy(y) <= 0.5 ? '#2f7bd6' : '#111111';
      };
    }
  }
}

/**
 * Una bandera de `w` de ancho (alto w * 2 / 3), quieta o en el cuadro `f` de 8 de la ondulación. El asta va a la
 * izquierda: ahí la tela no se mueve y la onda crece hacia la punta. Contorno oscuro de un pixel.
 */
export function bandera(id: Bandera, w: number, f: number | null): Pix {
  const h = Math.round((w * 2) / 3) - (w === 16 ? 0 : 1);
  const A = w >= 32 ? 2 : 1;
  const W = w + 2, H = h + 2 + A * 2;
  const p = new Pix(W, H);
  const col = colorBandera(id, w, h);
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1);
    const fase = f === null ? 0 : (f / 8) * Math.PI * 2;
    const onda = f === null ? 0 : Math.sin(t * Math.PI * 2.2 - fase) * A * t;
    const pendiente = f === null ? 0 : Math.cos(t * Math.PI * 2.2 - fase) * t;
    const dy = Math.round(onda);
    for (let y = 0; y < h; y++) {
      let c = col(x, y);
      // los pliegues: más claro donde la tela mira a la luz, más oscuro donde se dobla
      if (pendiente > 0.45) c = mixHex(c, WHITE, 0.18);
      else if (pendiente < -0.45) c = mixHex(c, '#000000', 0.22);
      p.px(1 + x, 1 + A + y + dy, c);
    }
  }
  p.outline(INK);
  return p;
}

/** Cada bandera quieta y ondeando (8 cuadros a 10 fps), en 16 y 32 de ancho. */
export function banderas(): UiPiece[] {
  const out: UiPiece[] = [];
  for (const s of TAMANOS_BANDERA) for (const id of BANDERAS) {
    const q = bandera(id, s, null);
    out.push({ name: `bandera_${id}_${s}`, frames: [q.r], w: q.w, h: q.h, extra: { asta: 'a la izquierda: el borde de la tela que va pegado al palo' } });
    const fr = Array.from({ length: 8 }, (_, f) => bandera(id, s, f).r);
    out.push({ name: `bandera_${id}_${s}_ondea`, frames: fr, w: q.w, h: q.h, fps: 10, loop: true });
  }
  return out;
}

// ---------------------------------------------------------------- podio

/**
 * Dónde va cada cosa en el podio (lo exporta el manifiesto). La imagen mide 800 x 360 y la parte de 640 va de x 80 a
 * 720, como las canchas: el juego la pone en x -80 de su pantalla de 640. Las coordenadas son de la imagen.
 */
export const PODIO = {
  w: 800, h: 360, margen: 80,
  /** los pies del atleta en cada escalón (centro arriba del cajón), como el medallero: 320, 240 y 400 de la pantalla */
  puestos: { primero: [400, 268], segundo: [320, 284], tercero: [480, 296] } as Record<string, [number, number]>,
  /** los cajones: x, arriba y ancho (abajo todos en 328) */
  cajones: { primero: [360, 268, 80], segundo: [280, 284, 80], tercero: [440, 296, 80] } as Record<string, [number, number, number]>,
  /** los tres mástiles detrás del podio: el juego sube cada bandera de `abajo` a `arriba` (punta izquierda de la tela) */
  mastiles: [{ puesto: 'segundo', x: 300, arriba: 138, abajo: 236 }, { puesto: 'primero', x: 400, arriba: 124, abajo: 220 }, { puesto: 'tercero', x: 500, arriba: 146, abajo: 244 }],
  /** la franja de arriba queda tranquila para el título y el marcador (pantalla y 0 a 116) */
  calma: [80, 0, 640, 116] as [number, number, number, number],
};

/**
 * El podio en el estadio de noche, de 800 x 360: cielo con estrellas, torres de luz a los lados, la tribuna llena con
 * la gente de colores, la pista y la grama. En el medio los tres cajones con su número (1 al medio, 2 a la izquierda,
 * 3 a la derecha) y los tres mástiles detrás, sin bandera: la sube el juego. Arriba queda tranquilo para el título.
 * Los números se escriben con la fuente gruesa si viene.
 */
export function podio(digitos?: Glifos): UiPiece {
  const { w: W, h: H } = PODIO;
  const p = new Pix(W, H);
  const r = rng(20261015);
  // cielo de noche: degradado con un brillo bajo detrás de la tribuna
  const cielo = ['#0c0f2c', '#141a46', '#1e2860', '#2c3878', '#46468c'];
  for (let y = 0; y < 124; y++) for (let x = 0; x < W; x++) {
    const t = y / 124 + (bayer(x, y) - 0.5) * 0.12;
    p.px(x, y, cielo[Math.max(0, Math.min(4, Math.floor(t * 5)))]);
  }
  for (let i = 0; i < 90; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * 80); p.px(x, y, r() < 0.2 ? '#ffffff' : '#9aa6e0'); }
  const techo = (x: number) => 112 + Math.round(Math.cos(((x - W / 2) / W) * Math.PI) * -10);
  // el techo de la tribuna: una franja oscura con la estructura
  for (let x = 0; x < W; x++) {
    const yT = techo(x);
    for (let y = yT; y < yT + 8; y++) p.px(x, y, y === yT ? '#5a6284' : '#262a40');
    if (x % 16 === 0) p.line(x, yT + 8, x + 8, yT + 14, '#3a3e58');
  }
  // la tribuna: gradas con gente (cabezas de colores) y barandas
  const ropa = ['#e04848', '#f2c230', '#3d6fd6', '#ffffff', '#2fa86a', '#e07ad6', '#ff9a1f', '#8a5ad6', '#1a1a24'];
  const piel = ['#f0c8a0', '#c98e70', '#8a5a3c', '#5a3a28'];
  for (let y = 124; y < 206; y++) {
    const fila = Math.floor((y - 124) / 6), sub = (y - 124) % 6;
    const oscuro = 0.55 - fila * 0.04;
    for (let x = 0; x < W; x++) {
      if (y < techo(x) + 12) continue;
      if (sub === 5) { p.px(x, y, '#30344c'); continue; }
      // cada persona: 3 de ancho; cabeza en las filas 0-1, cuerpo 2-4
      const k = Math.floor((x + fila * 2) / 3), q = rhash(k, fila);
      const tono = sub < 2 ? piel[q % piel.length] : ropa[(q >>> 3) % ropa.length];
      const hueco = (q >>> 7) % 9 === 0;
      p.px(x, y, hueco ? '#1c1e30' : mixHex(tono, '#10122a', Math.max(0, oscuro)));
    }
  }
  // banderines en la tribuna
  for (let i = 0; i < 11; i++) {
    const bx = 30 + i * 70 + Math.floor(r() * 20), by = 146 + Math.floor(r() * 36);
    const c = ropa[i % 7];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 9 - y; x++) p.px(bx + x, by + y, c);
    p.line(bx, by, bx, by + 12, '#d0d0d8');
  }
  // la baranda delantera y el muro de publicidad
  p.rect(0, 206, W, 4, '#4a5070');
  p.rect(0, 210, W, 10, '#1d2a6a');
  for (let x = 0; x < W; x += 80) { p.rect(x + 6, 212, 60, 6, x % 160 ? '#f2c230' : '#e04848'); p.rect(x + 10, 214, 52, 2, '#ffffff'); }
  // la pista roja con sus líneas y la grama a franjas
  for (let y = 220; y < 244; y++) for (let x = 0; x < W; x++) p.px(x, y, (y - 220) % 6 === 5 ? '#f2e6dc' : bayer(x, y) < 0.15 ? '#a83c28' : '#c04c32');
  for (let y = 244; y < H; y++) for (let x = 0; x < W; x++) {
    const franja = Math.floor((x + (y - 244) * 0.6) / 40) % 2;
    p.px(x, y, bayer(x, y) < 0.12 ? '#2e7a3a' : franja ? '#3f9a4a' : '#378c42');
  }
  // las torres de luz en los márgenes, con su resplandor
  for (const tx of [36, W - 36]) {
    p.rect(tx - 2, 36, 4, 172, '#3a3e58');
    for (let y = 42; y < 206; y += 8) p.line(tx - 2, y, tx + 2, y + 6, '#4c5270');
    for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) p.rect(tx - 14 + i * 7, 18 + j * 6, 6, 5, '#fff6c2');
    p.rect(tx - 15, 17, 29, 1, '#8a8ea8');
    for (let y = 4; y < 60; y++) for (let x = -44; x <= 44; x++) {
      if (Math.hypot(x, (y - 26) * 1.3) > 48 || p.has(tx + x, y) === false) continue;
      if (bayer(tx + x, y) < 0.18 && !(Math.abs(x) < 16 && y > 12 && y < 38)) p.px(tx + x, y, '#5a6aa8');
    }
  }
  // los tres mástiles, detrás de los cajones
  for (const m of PODIO.mastiles) {
    p.rect(m.x - 1, m.arriba - 4, 3, 300 - (m.arriba - 4), '#c8ccd8');
    p.rect(m.x + 1, m.arriba - 4, 1, 300 - (m.arriba - 4), '#8a8ea8');
    p.disc(m.x, m.arriba - 6, 2, '#ffd84a');
  }
  // los cajones del podio: tapa arriba, cara clara, franja del metal y el número
  const piso = 328;
  for (let y = piso; y < piso + 8; y++) for (let x = 250; x < 550; x++) if (bayer(x, y) < 0.55 - (y - piso) * 0.06) p.px(x, y, '#24603a');
  const orden: [string, string, Metal][] = [['segundo', '2', 'plata'], ['tercero', '3', 'bronce'], ['primero', '1', 'oro']];
  for (const [puesto, n, metal] of orden) {
    const [x0, top, w] = PODIO.cajones[puesto], m = METALES[metal], cx = x0 + w / 2;
    p.rect(x0, top - 5, w, 5, '#f4f2ee');
    p.rect(x0, top - 5, w, 1, '#ffffff');
    for (let y = top; y < piso; y++) for (let x = x0; x < x0 + w; x++) {
      const borde = x - x0 < 3 ? '#ffffff' : x0 + w - 1 - x < 4 ? '#b8bcc8' : y - top < 5 ? m[2] : '#e4e6ec';
      p.px(x, y, y - top === 5 ? m[3] : borde);
    }
    const alto = Math.min(28, piso - top - 14);
    if (digitos) {
      const g = digitos(n, alto);
      const gx = Math.round(cx - g.w / 2), gy = Math.round(top + 8 + (piso - top - 8 - g.h) / 2);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.mask[y * g.w + x]) p.px(gx + x, gy + y, y < g.h * 0.4 ? m[1] : m[2]);
      for (let y = -1; y <= g.h; y++) for (let x = -1; x <= g.w; x++) {
        if (x >= 0 && y >= 0 && x < g.w && y < g.h && g.mask[y * g.w + x]) continue;
        const near = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([a, b]) => a >= 0 && b >= 0 && a < g.w && b < g.h && g.mask[b * g.w + a]);
        if (near) p.px(gx + x, gy + y, m[4]);
      }
    } else p.rect(cx - 3, top + 10, 6, alto, m[2]);
    p.rect(x0, piso - 1, w, 1, '#8a8ea0');
  }
  return {
    name: 'podio', frames: [p.r], w: W, h: H,
    extra: { margen: PODIO.margen, puestos: PODIO.puestos, cajones: PODIO.cajones, mastiles: PODIO.mastiles, calma: PODIO.calma,
      nota: 'Imagen de 800 x 360: la parte de 640 va de x 80 a 720 (ponla en x -80). Los pies del ganador en `puestos.primero`. Cada bandera sube por su mástil con la punta izquierda de la tela de `abajo` a `arriba`.' },
  };
}

const rhash = (a: number, b: number) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return (h ^ (h >>> 16)) >>> 0; };

// ---------------------------------------------------------------- escudos

/** Los emblemas que puede llevar un escudo. `letras` escribe `texto` (2 o 3 letras) con la fuente gruesa. */
export const EMBLEMAS = ['letras', 'llama', 'dragon', 'bicicleta', 'montana', 'rayo', 'estrella'] as const;
export type Emblema = (typeof EMBLEMAS)[number];
export interface EscudoDef { emblema: Emblema; texto?: string }
export type Glifos = (texto: string, alto: number) => { w: number; h: number; mask: Uint8Array };

/** Forma del escudo (el clásico de punta abajo): true si (x, y) cae adentro, en un escudo de w x h. */
function dentroEscudo(x: number, y: number, w: number, h: number): boolean {
  const cx = (w - 1) / 2, recto = h * 0.5;
  if (y < 0 || y >= h || x < 0 || x >= w) return false;
  // las esquinas de arriba un poco recortadas
  if (y < 2 && (x < 2 - y || x > w - 3 + y)) return false;
  if (y <= recto) return true;
  // la parte de abajo: dos arcos que se juntan en la punta
  const t = (y - recto) / (h - 1 - recto);
  const half = (w / 2) * Math.sqrt(Math.max(0, 1 - t * t * 0.98)) * (1 - t * 0.15);
  return Math.abs(x - cx) <= half;
}

/** El dibujo del emblema en un lienzo de `s` x `s`, del color `c` con su luz `luz`. */
function emblema(def: EscudoDef, s: number, c: string, luz: string, glifos?: Glifos): Pix {
  const p = new Pix(s, s);
  const k = s / 24, cx = (s - 1) / 2, cy = (s - 1) / 2;
  switch (def.emblema) {
    case 'letras': {
      const txt = (def.texto ?? '?').toUpperCase().slice(0, 3);
      if (glifos) {
        let g = glifos(txt, Math.round(s * 0.55));
        if (g.w > s - 2) g = glifos(txt, Math.round(s * 0.4));
        const gx = Math.round((s - g.w) / 2), gy = Math.round((s - g.h) / 2);
        for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.mask[y * g.w + x]) p.px(gx + x, gy + y, y < g.h * 0.45 ? luz : c);
      } else p.rect(Math.round(s * 0.25), Math.round(s * 0.25), Math.round(s * 0.5), Math.round(s * 0.5), c);
      break;
    }
    case 'llama': {
      // tres lenguas de fuego (la del medio más alta) en colores de fuego, con el corazón amarillo
      const FUEGO = ['#c0301a', '#ff7a1f', '#ffd34d'];
      const gota = (x: number, y: number, gx: number, top: number, bot: number, r: number) => {
        const v = (y - top) / (bot - top);
        if (v < 0 || v > 1) return false;
        const half = r * (v < 0.7 ? Math.pow(v / 0.7, 0.85) : Math.sqrt(Math.max(0, 1 - ((v - 0.7) / 0.3) ** 2)));
        return Math.abs(x - gx) <= half;
      };
      const bot = s * 0.94;
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const lado = gota(x + (y - bot) * 0.25, y, cx - s * 0.2, s * 0.3, bot, s * 0.2) || gota(x - (y - bot) * 0.25, y, cx + s * 0.2, s * 0.36, bot, s * 0.19);
        const medio = gota(x, y, cx, s * 0.04, bot, s * 0.3);
        if (!lado && !medio) continue;
        const nucleo = gota(x, y, cx, s * 0.45, bot - s * 0.04, s * 0.15);
        const mid = gota(x, y, cx, s * 0.22, bot - s * 0.02, s * 0.23);
        p.px(x, y, nucleo ? FUEGO[2] : mid ? FUEGO[1] : FUEGO[0]);
      }
      break;
    }
    case 'dragon': {
      // el dragón: el cuerpo en S con crestas en el lomo y la cabeza arriba a la derecha con la boca abierta
      const cuerpo: [number, number][] = [];
      for (let i = 0; i <= 48; i++) { const t = i / 48; cuerpo.push([cx - s * 0.32 + t * s * 0.62, cy + s * 0.3 - t * s * 0.42 + Math.sin(t * Math.PI * 2) * s * 0.16]); }
      cuerpo.forEach(([x, y], i) => p.disc(x, y, Math.max(0.8, (0.9 + (i / 48) * 1.6) * k), c));
      cuerpo.forEach(([x, y], i) => { if (i % 8 === 4 && i < 44) { p.px(x, y - (2.2 + i / 30) * k, c); p.px(x, y - (3.2 + i / 30) * k, luz); } });
      const [hx, hy] = cuerpo[cuerpo.length - 1];
      p.disc(hx, hy - 1 * k, 2.6 * k, c);
      // la quijada de arriba y la de abajo, abiertas hacia la derecha
      p.thick(hx, hy - 2 * k, hx + 5 * k, hy - 3 * k, Math.max(0.6, 0.9 * k), c);
      p.thick(hx, hy + 0.5 * k, hx + 4 * k, hy + 1.5 * k, Math.max(0.5, 0.7 * k), c);
      p.line(hx - 1 * k, hy - 3 * k, hx - 4 * k, hy - 7 * k, c);
      p.line(hx + 0.5 * k, hy - 3.5 * k, hx - 1 * k, hy - 7.5 * k, c);
      p.px(hx + 1 * k, hy - 2 * k, luz);
      break;
    }
    case 'bicicleta': {
      const r = 4.6 * k, y0 = cy + 3 * k, x1 = cx - 5.5 * k, x2 = cx + 5.5 * k;
      for (const x of [x1, x2]) { p.ring(x, y0, r, c, 1, Math.max(1, k * 0.8)); p.px(x, y0, c); for (let a = 0; a < 4; a++) p.line(x, y0, x + Math.cos(a * 0.8) * r * 0.8, y0 + Math.sin(a * 0.8) * r * 0.8, luz); }
      // el cuadro: triángulo del pedal al asiento y al manubrio
      const ped: [number, number] = [cx - 0.5 * k, y0], sil: [number, number] = [cx - 2.5 * k, y0 - 6 * k], man: [number, number] = [cx + 3.5 * k, y0 - 7 * k];
      for (const [a, b] of [[[x1, y0], ped], [ped, sil], [sil, [x1, y0]], [ped, man], [sil, man], [man, [x2, y0]]] as [[number, number], [number, number]][]) p.thick(a[0], a[1], b[0], b[1], Math.max(0.5, k * 0.6), c);
      p.rect(Math.round(sil[0] - 2 * k), Math.round(sil[1] - 1 * k), Math.round(4 * k), Math.max(1, Math.round(k)), luz);
      p.line(man[0], man[1], man[0] + 2 * k, man[1] - 1 * k, luz);
      break;
    }
    case 'montana': {
      // la montaña con su cresta (el Ávila) y el sol que sale detrás
      p.disc(cx + 5 * k, cy - 4 * k, 3.4 * k, luz);
      for (let x = 0; x < s; x++) {
        const u = x / (s - 1);
        const alto = s * (0.26 + 0.34 * Math.exp(-Math.pow((u - 0.42) / 0.22, 2)) + 0.12 * Math.exp(-Math.pow((u - 0.78) / 0.12, 2)));
        for (let y = Math.round(s * 0.82 - alto); y < s * 0.82; y++) p.px(x, y, c);
      }
      break;
    }
    case 'rayo': {
      // el rayo en zigzag que baja sobre una raya de agua
      const z: [number, number][] = [[cx + 4 * k, 2 * k], [cx - 3 * k, cy + 1 * k], [cx + 1.5 * k, cy + 1 * k], [cx - 4 * k, s - 5 * k]];
      for (let i = 0; i < z.length - 1; i++) p.thick(z[i][0], z[i][1], z[i + 1][0], z[i + 1][1], Math.max(1, 1.5 * k), c);
      p.line(z[0][0], z[0][1], z[1][0], z[1][1], luz);
      for (let x = Math.round(2 * k); x < s - 2 * k; x++) if (x % 3 !== 0) p.px(x, s - 3 * k, c);
      break;
    }
    case 'estrella': {
      const R = s * 0.42, r = R * 0.42;
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q + k]); }
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        let inn = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inn = !inn;
        }
        if (inn) p.px(x, y, x < cx && y < cy ? luz : c);
      }
      break;
    }
  }
  return p;
}

/**
 * El escudo de un equipo, de `w` de ancho (alto w * 7 / 6): el campo del color principal con reflejo arriba, un
 * borde del color de acento y el emblema en el medio, del color que más resalta sobre el campo.
 */
export function escudo(def: EscudoDef, colores: string[], w: number, glifos?: Glifos): Pix {
  const h = Math.round((w * 7) / 6);
  const p = new Pix(w, h);
  const campo = colores[0], borde = colores[1] ?? '#ffffff';
  const b = Math.max(1, Math.round(w / 16));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!dentroEscudo(x, y, w, h)) continue;
    let interior = true;
    for (let d = 1; d <= b && interior; d++) if (!dentroEscudo(x - d, y, w, h) || !dentroEscudo(x + d, y, w, h) || !dentroEscudo(x, y - d, w, h) || !dentroEscudo(x, y + d, w, h)) interior = false;
    if (!interior) { p.px(x, y, borde); continue; }
    // el campo con luz arriba a la izquierda y sombra abajo a la derecha
    const t = (x / w) * 0.4 + (y / h) * 0.6;
    p.px(x, y, t < 0.25 ? mixHex(campo, WHITE, 0.22) : t > 0.75 ? mixHex(campo, '#000000', 0.25) : campo);
  }
  // el emblema del color de acento (o blanco si el acento se pierde en el campo)
  const lum = (hx: string) => { const v = parseInt(hx.slice(1), 16); return ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11; };
  const tinta = Math.abs(lum(borde) - lum(campo)) > 60 ? borde : lum(campo) > 140 ? '#1a1c2a' : WHITE;
  const s = Math.round(w * 0.62);
  const e = emblema(def, s, tinta, mixHex(tinta, WHITE, 0.55), glifos);
  e.outline(mixHex(campo, '#000000', 0.55));
  p.paste(e, Math.round((w - s) / 2), Math.round(h * 0.42 - s / 2));
  p.outline(INK);
  return p;
}

// ---------------------------------------------------------------- íconos de prueba

/**
 * Los íconos de prueba (32 x 32): el sprite de un atleta del juego haciendo la jugada, pixel a pixel a celda 32, sobre
 * un cuadrito de color con borde. La silueta de un chibi no se lee como pictograma (la cabeza grande se come los
 * brazos), el sprite sí. En las de contacto va el rival recibiendo (`rival`, con su animación). `extra` dibuja lo que
 * la animación no trae (la valla, el agua, el poste).
 */
export interface IconoPrueba {
  id: string; anim: string; cuadro?: number; color: string;
  extra?: 'agua' | 'poste' | 'valla' | 'techo' | 'muro' | 'red' | 'aro' | 'chapa' | 'cau';
  /** el rival de espaldas a la derecha, en el mismo cuadro de su animación */
  rival?: string;
}
export const ICONOS_PRUEBA: IconoPrueba[] = [
  { id: 'cross_country', anim: 'sprint', color: '#2f9a4a' },
  { id: 'obstaculos', anim: 'climb_wall', color: '#e07a1f', extra: 'muro' },
  { id: 'vallas', anim: 'hurdles', color: '#1f9aa0', extra: 'valla' },
  { id: 'natacion', anim: 'swim', color: '#2a6ad7', extra: 'agua' },
  { id: 'jabalina', anim: 'javelin', color: '#b0702a' },
  { id: 'azoteas', anim: 'long_jump', color: '#7a3ae0', extra: 'techo' },
  { id: 'tamawari', anim: 'climb_pole', color: '#c0261a', extra: 'poste' },
  { id: 'da_cau', anim: 'shuttle_kick_back', color: '#6a9a1a', extra: 'cau' },
  { id: 'tejo', anim: 'tejo_throw', color: '#8a5a2b' },
  { id: 'quemado', anim: 'dodge_throw', color: '#d23c5a' },
  { id: 'chapita', anim: 'bat_swing', color: '#24305e', extra: 'chapa' },
  { id: 'voley', anim: 'spike', color: '#e0a020', extra: 'red' },
  { id: 'tenis', anim: 'forehand', color: '#2f8a5a' },
  { id: 'futbol', anim: 'shot', color: '#1d6a34' },
  { id: 'basket', anim: 'dunk', color: '#e0601f', extra: 'aro' },
  { id: 'judo', anim: 'judo_throw', color: '#3a3a9a', rival: 'judo_thrown' },
  { id: 'kachinuki', anim: 'flying_kick', color: '#9a1a2a', rival: 'hit' },
  { id: 'pelea', anim: 'hook', color: '#353c58', rival: 'hit' },
];

/**
 * Lo que el kit le pasa a los íconos: el sprite de un atleta (el `n` de la lista del kit, para variar) en un cuadro
 * de una animación, de lado, con sus implementos; 'mejor' es el cuadro más abierto que cabe en `max` x `max`.
 */
export type FiguraDe = (anim: string, cuadro: number | 'mejor', n: number, max: number) => { r: Raster; cuadro: number };

/** Un ícono de 32 x 32. */
export function iconoPrueba(def: IconoPrueba, figura: FiguraDe, n = 0): Pix {
  const S = 32, p = new Pix(S, S);
  const c = def.color;
  // el cuadrito: borde oscuro, luz arriba, sombra abajo y esquinas redondeadas
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const esquina = (x < 2 || x > S - 3) && (y < 2 || y > S - 3) && !((x === 1 || x === S - 2) && (y === 1 || y === S - 2));
    if (esquina) continue;
    const d = Math.min(x, y, S - 1 - x, S - 1 - y);
    p.px(x, y, d === 0 ? INK : d === 1 && y < S / 2 ? mixHex(c, WHITE, 0.35) : d === 1 ? mixHex(c, '#000000', 0.3) : y < 12 ? mixHex(c, WHITE, 0.08) : c);
  }
  const oscuro = mixHex(c, '#000000', 0.45);
  // lo que va detrás del atleta
  switch (def.extra) {
    case 'agua': for (let y = 20; y < S - 2; y++) for (let x = 2; x < S - 2; x++) p.px(x, y, (y - 20) % 4 === Math.round(Math.sin(x * 0.7)) + 1 ? '#9ad4ff' : mixHex(c, '#000000', 0.15)); break;
    case 'poste': p.rect(23, 3, 3, 27, '#e8d6a0'); p.rect(25, 3, 1, 27, '#b89a60'); p.disc(24, 4, 3, '#ffffff'); break;
    case 'valla': p.rect(19, 21, 11, 2, WHITE); p.rect(19, 23, 1, 7, WHITE); p.rect(29, 23, 1, 7, WHITE); break;
    case 'techo': p.rect(2, 26, 10, 4, oscuro); p.rect(22, 27, 8, 3, oscuro); break;
    case 'muro': p.rect(20, 6, 10, 24, oscuro); for (let y = 9; y < 30; y += 4) p.rect(20, y, 10, 1, mixHex(c, '#000000', 0.25)); break;
    case 'red': for (let y = 14; y < 30; y++) for (let x = 25; x < 28; x++) if ((x + y) % 2 === 0) p.px(x, y, WHITE); p.rect(25, 13, 3, 1, WHITE); break;
    case 'aro': p.rect(26, 4, 3, 10, WHITE); p.rect(21, 12, 6, 1, '#ff6a1f'); for (let y = 13; y < 17; y++) p.px(22 + (y % 2), y, WHITE); break;
  }
  const pon = (r: Raster, ox: number, oy: number, espejo: boolean) => {
    const f = new Pix(S, S);
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const i = (y * r.w + x) * 4;
      if (!r.data[i + 3]) continue;
      const X = espejo ? ox + r.w - 1 - x : ox + x;
      f.px(X, oy + y, '#' + [0, 1, 2].map((q) => r.data[i + q].toString(16).padStart(2, '0')).join(''));
    }
    p.paste(f);
  };
  // recorta al dibujo y lo apoya abajo
  const caja = (r: Raster) => {
    let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1;
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const o = createRaster(Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1));
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) for (let q = 0; q < 4; q++) o.data[(y * o.w + x) * 4 + q] = r.data[((y0 + y) * r.w + x0 + x) * 4 + q];
    return o;
  };
  const suelo = def.extra === 'agua' ? 26 : S - 3;
  if (def.rival) {
    const a = figura(def.anim, def.cuadro ?? 'mejor', n, 22);
    const b = caja(figura(def.rival, Math.min(a.cuadro, 3), n + 7, 22).r);
    pon(b, S - 2 - b.w, suelo - b.h + 1, true);
    const ra = caja(a.r);
    pon(ra, 2, suelo - ra.h + 1, false);
  } else {
    const ra = caja(figura(def.anim, def.cuadro ?? 'mejor', n, 28).r);
    const x = def.extra === 'muro' || def.extra === 'poste' || def.extra === 'red' || def.extra === 'aro' || def.extra === 'valla' ? Math.max(2, 20 - ra.w) : Math.round((S - ra.w) / 2);
    pon(ra, x, def.extra === 'agua' ? 24 - Math.round(ra.h / 2) : suelo - ra.h + 1, false);
  }
  // lo que va delante (el cầu, la chapa)
  if (def.extra === 'cau') { p.px(26, 7, '#ffd84a'); p.px(27, 7, '#ffd84a'); p.px(26, 6, '#ff4a3a'); p.px(27, 5, '#3a8aff'); p.px(26, 8, INK); p.px(27, 8, INK); }
  if (def.extra === 'chapa') { p.disc(27, 8, 1.5, '#d0d4dc'); p.px(27, 8, '#ff4a3a'); }
  return p;
}

/** Los íconos en una tira de 32 x 32 y su versión de 16 (reducida a la mitad sin mezclar colores). */
export function iconosPrueba(figura: FiguraDe, mitad: (r: Raster) => Raster, cuales: IconoPrueba[] = ICONOS_PRUEBA): UiPiece[] {
  const grandes = cuales.map((d, i) => iconoPrueba(d, figura, i).r);
  const orden = cuales.map((d) => d.id);
  return [
    { name: 'iconos_prueba', frames: grandes, w: 32, h: 32, extra: { orden, nota: 'Un cuadro por prueba, en el orden de `orden`.' } },
    { name: 'iconos_prueba_16', frames: grandes.map(mitad), w: 16, h: 16, extra: { orden, nota: 'Los mismos a 16 x 16 (cada 2 x 2 se queda con su color más repetido), para filas angostas.' } },
  ];
}

// ---------------------------------------------------------------- tarjetas de equipo

export interface EquipoTarjeta { id: string; nombre: string; colores: string[]; bandera?: Bandera; escudo?: EscudoDef }
/** Dónde va cada cosa en la tarjeta de 184 x 104 (lo exporta el manifiesto). */
export const TARJETA = {
  w: 184, h: 104,
  /** el nombre del equipo lo escribe el juego aquí: x, y, ancho, alto */
  texto: [42, 6, 104, 20] as [number, number, number, number],
  /** la franja de las caras: x, y, ancho, alto (las 4 de 40 x 40 en x 12, 52, 92, 132) */
  retratos: [8, 32, 168, 48] as [number, number, number, number],
};

/** Las iniciales de un nombre de equipo, para el escudo de letras por defecto (sin "de", "del", "los"...). */
export function iniciales(nombre: string): string {
  const w = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter((x) => x && !/^(de|del|la|las|los|el|y)$/i.test(x));
  return w.slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?';
}

/**
 * La tarjeta del equipo para la selección, de 184 x 104: el campo con los colores del equipo (en diagonal, con rayas
 * de velocidad), la bandera arriba a la izquierda, el escudo arriba a la derecha y el borde del color de acento. En
 * el medio, una franja más oscura y tranquila para las 4 caras que pone el juego. El nombre lo escribe el juego.
 */
export function tarjetaEquipo(eq: EquipoTarjeta, glifos?: Glifos): Pix {
  const { w: W, h: H } = TARJETA;
  const p = new Pix(W, H);
  const c0 = eq.colores[0] ?? '#2a5bd7', c1 = eq.colores[1] ?? '#f2c230', c2 = eq.colores[2] ?? mixHex(c0, '#000000', 0.5);
  const R = 6;
  const dentro = (x: number, y: number) => {
    const cx = x < R ? R : x > W - 1 - R ? W - 1 - R : x, cy = y < R ? R : y > H - 1 - R ? H - 1 - R : y;
    return (x - cx) ** 2 + (y - cy) ** 2 <= R * R + 0.5;
  };
  const [rx, ry, rw, rh] = TARJETA.retratos;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!dentro(x, y)) continue;
    // el borde: tinta afuera, dos de acento, uno oscuro adentro
    let d = 99;
    for (let k = 1; k <= 4 && d === 99; k++) if (!dentro(x - k, y) || !dentro(x + k, y) || !dentro(x, y - k) || !dentro(x, y + k)) d = k - 1;
    if (d === 0) { p.px(x, y, INK); continue; }
    if (d <= 2) { p.px(x, y, y < H / 2 ? mixHex(c1, WHITE, 0.25) : c1); continue; }
    if (d === 3) { p.px(x, y, mixHex(c0, '#000000', 0.5)); continue; }
    // la franja de las caras: oscura, con una trama suave
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
      const borde = y === ry || y === ry + rh - 1;
      p.px(x, y, borde ? mixHex(c1, '#000000', 0.2) : bayer(x, y) < 0.12 ? mixHex(c0, '#000000', 0.55) : mixHex(c0, '#000000', 0.68));
      continue;
    }
    // el campo: el color principal en diagonal hacia el tercero, con rayas de velocidad del acento
    const t = (x + (H - y) * 0.8) / (W + H * 0.8);
    let col = t < 0.62 ? c0 : mixHex(c0, c2, 0.55);
    if (y < H / 2) col = mixHex(col, WHITE, 0.1 * (1 - y / (H / 2)));
    const raya = ((x + y * 2) % 23 === 0 || (x + y * 2) % 23 === 1) && y > ry + rh;
    p.px(x, y, raya ? mixHex(col, c1, 0.6) : col);
  }
  // la bandera arriba a la izquierda (la de 32) y el escudo arriba a la derecha
  if (eq.bandera) p.paste(bandera(eq.bandera, 32, null), 6, 4);
  const esc = escudo(eq.escudo ?? { emblema: 'letras', texto: iniciales(eq.nombre) }, eq.colores.length >= 2 ? eq.colores : [c0, c1], 26, glifos);
  p.paste(esc, W - 6 - esc.w, 3);
  // abajo, el escudo grande como marca de agua en el color del campo
  const marca = escudo(eq.escudo ?? { emblema: 'letras', texto: iniciales(eq.nombre) }, [mixHex(c0, WHITE, 0.12), mixHex(c0, WHITE, 0.2)], 30, glifos);
  for (let y = 0; y < marca.h; y++) for (let x = 0; x < marca.w; x++) {
    const X = W - 14 - marca.w + x, Y = ry + rh + 2 + y;
    if (!marca.has(x, y) || Y >= H - 4 || !dentro(X, Y)) continue;
    if (bayer(X, Y) < 0.5) p.px(X, Y, mixHex(c0, WHITE, 0.16));
  }
  return p;
}

/** La tarjeta y el escudo (de 48) de cada equipo. */
export function tarjetas(equipos: EquipoTarjeta[], glifos?: Glifos): UiPiece[] {
  const out: UiPiece[] = [];
  for (const eq of equipos) {
    out.push({ name: `tarjeta_${eq.id}`, frames: [tarjetaEquipo(eq, glifos).r], w: TARJETA.w, h: TARJETA.h, extra: { texto: TARJETA.texto, retratos: TARJETA.retratos, ...(eq.bandera ? { bandera: eq.bandera } : {}) } });
    const e = escudo(eq.escudo ?? { emblema: 'letras', texto: iniciales(eq.nombre) }, eq.colores.length >= 2 ? eq.colores : [eq.colores[0] ?? '#2a5bd7', '#f2c230'], 48, glifos);
    out.push({ name: `escudo_${eq.id}`, frames: [e.r], w: e.w, h: e.h });
  }
  return out;
}

// ---------------------------------------------------------------- marco VS de 4

/** Dónde va cada cosa en el VS de 4 (coordenadas de la imagen de 800 x 360; la parte de 640 va de 80 a 720). */
export const VS4 = {
  w: 800, h: 360, margen: 80,
  /** los cuatro huecos de 96 x 96 para los retratos grandes: dos a la izquierda (azul) y dos a la derecha (rojo) */
  huecos: [[116, 102, 96, 96], [232, 102, 96, 96], [472, 102, 96, 96], [588, 102, 96, 96]] as [number, number, number, number][],
  /** la palabra VS grande va aquí (el juego la escribe) */
  vs: [340, 106, 120, 88] as [number, number, number, number],
  /** el nombre de la prueba cae en esta franja */
  texto: [216, 22, 368, 34] as [number, number, number, number],
  /** la fila de los nombres (y del centro) bajo cada hueco, y la de las frases */
  nombres: 246, frases: 268,
  /** la costura entre los dos equipos: de arriba a abajo, simétrica sobre el centro de la imagen (pasa por 400, 180) */
  costura: [[440, 0], [360, 360]] as [[number, number], [number, number]],
};
/** La x de la costura en la fila y. */
export const costuraVs4 = (y: number) => VS4.costura[0][0] + ((VS4.costura[1][0] - VS4.costura[0][0]) * y) / VS4.h;

const VS_AZUL = ['#0c1a4a', '#14286e', '#1a3a9a', '#2a5ad0'], VS_ROJO = ['#4a0c14', '#6e141e', '#9a1a2a', '#d02a3a'];

/**
 * El fondo de los VS: la pantalla partida en diagonal, azul a la izquierda y rojo a la derecha, con la costura
 * blanca simétrica sobre el centro de la imagen y rayas de velocidad que salen del medio.
 */
function fondoVs(p: Pix) {
  const costura = costuraVs4;
  const cx = 400, cy = 150;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const lado = x < costura(y) ? VS_AZUL : VS_ROJO;
    const d = x - costura(y);
    if (Math.abs(d) < 3) { p.px(x, y, Math.abs(d) < 1.5 ? WHITE : '#c8d4ff'); continue; }
    // rayas de velocidad que salen del centro, más claras lejos
    const a = Math.atan2(y - cy, x - cx), r = Math.hypot(x - cx, y - cy);
    const raya = Math.sin(a * 28) > 0.82 && r > 70;
    const t = Math.min(1, r / 420);
    let k = t < 0.25 ? 0 : t < 0.55 ? 1 : 2;
    if (raya) k = Math.min(3, k + 1);
    // trama de puntos en las esquinas
    if (r > 330 && bayer(x, y) < (r - 330) / 200) k = Math.max(0, k - 1);
    p.px(x, y, lado[k]);
  }
}

/** La franja del nombre de la prueba: placa oscura con borde dorado. */
function placaPrueba(p: Pix, [tx, ty, tw, th]: [number, number, number, number]) {
  for (let y = ty - 3; y < ty + th + 3; y++) for (let x = tx - 3; x < tx + tw + 3; x++) {
    const d = Math.min(x - (tx - 3), y - (ty - 3), tx + tw + 2 - x, ty + th + 2 - y);
    p.px(x, y, d === 0 ? INK : d < 3 ? (y < ty + th / 2 ? '#ffd84a' : '#e0a020') : '#0b0a1c');
  }
}

/** La placa oscura del nombre, centrada en x `cx` y en la fila `y`, de `ancho` de largo. */
function placaNombre(p: Pix, cx: number, y: number, ancho: number) {
  const x0 = cx - ancho / 2;
  for (let yy = y - 9; yy < y + 9; yy++) for (let x = x0; x < x0 + ancho; x++) {
    const d = Math.min(x - x0, yy - (y - 9), x0 + ancho - 1 - x, y + 8 - yy);
    p.px(x, yy, d === 0 ? INK : d === 1 ? '#c8d4ff' : '#0b0a1c');
  }
}

/**
 * El marco del VS de 4 (dos contra dos, los capitanes de cada lado): la pantalla partida en diagonal, azul a la
 * izquierda y rojo a la derecha, con rayas de velocidad que salen del medio, la costura blanca, cuatro marcos
 * dorados con el hueco oscuro donde el juego pone los retratos de 96, y la franja de arriba para el nombre de la
 * prueba. La palabra VS, los nombres y las frases los escribe el juego.
 */
export function marcoVs4(): UiPiece {
  const { w: W, h: H } = VS4;
  const p = new Pix(W, H);
  fondoVs(p);
  placaPrueba(p, VS4.texto);
  // los cuatro marcos: dorados, con el hueco oscuro
  for (const [hx, hy, hw, hh] of VS4.huecos) {
    for (let y = hy - 7; y < hy + hh + 7; y++) for (let x = hx - 7; x < hx + hw + 7; x++) {
      const dentroHueco = x >= hx && x < hx + hw && y >= hy && y < hy + hh;
      if (dentroHueco) { p.px(x, y, bayer(x, y) < 0.2 ? '#1a1a34' : '#10101e'); continue; }
      const d = Math.min(x - (hx - 7), y - (hy - 7), hx + hw + 6 - x, hy + hh + 6 - y);
      const c = d === 0 ? INK : d === 1 ? '#fff6c2' : d <= 4 ? (x + y < hx + hy + hw ? '#ffd84a' : '#e0a020') : d === 5 ? '#9a6410' : INK;
      p.px(x, y, c);
    }
    // remaches en las esquinas
    for (const [ex, ey] of [[hx - 4, hy - 4], [hx + hw + 3, hy - 4], [hx - 4, hy + hh + 3], [hx + hw + 3, hy + hh + 3]]) { p.px(ex, ey, WHITE); }
  }
  // placas bajo cada marco para el nombre
  for (const [hx, , hw] of VS4.huecos) placaNombre(p, hx + hw / 2, VS4.nombres, hw + 12);
  return {
    name: 'marco_vs_4', frames: [p.r], w: W, h: H,
    extra: { margen: VS4.margen, huecos: VS4.huecos, vs: VS4.vs, texto: VS4.texto, nombres: VS4.nombres, frases: VS4.frases, costura: VS4.costura,
      nota: 'Imagen de 800 x 360 (la parte de 640 de x 80 a 720). Los retratos grandes van en `huecos`: los dos primeros de un equipo, los dos últimos del otro. Los nombres centrados bajo cada hueco en y `nombres`.' },
  };
}

// ---------------------------------------------------------------- marco VS de 1 contra 1

/** Dónde va cada cosa en el VS de 1 contra 1 (coordenadas de la imagen de 800 x 360; la parte de 640 va de 80 a 720). */
export const VS2 = {
  w: 800, h: 360, margen: 80,
  /**
   * un hueco de 96 x 96 por lado, para el retrato grande a 1 (nítido, sin escalar). Los centros caen en x 230 y 570,
   * donde el VS de hoy pone los retratos (150 y 490 en la parte de 640)
   */
  huecos: [[182, 102, 96, 96], [522, 102, 96, 96]] as [number, number, number, number][],
  /** lo ancho del marco alrededor de cada hueco: por fuera mide 128 x 128 */
  marco: 16,
  vs: VS4.vs, texto: VS4.texto, nombres: VS4.nombres, frases: VS4.frases, costura: VS4.costura,
  /** lo largo de la placa del nombre bajo cada marco */
  placa: 176,
};

/**
 * El marco del VS de 1 contra 1: el mismo fondo partido en diagonal del VS de 4, con un solo marco grande por lado.
 * El marco es ancho, de 16: oro por fuera, una banda del color del lado con remaches y un filete de oro junto al
 * retrato, para que el retrato de 96 a 1 llene la pantalla sin escalarlo a un tamaño que lo emborrone.
 */
export function marcoVs2(): UiPiece {
  const { w: W, h: H, marco: M } = VS2;
  const p = new Pix(W, H);
  fondoVs(p);
  placaPrueba(p, VS2.texto);
  VS2.huecos.forEach(([hx, hy, hw, hh], i) => {
    const lado = i === 0 ? VS_AZUL : VS_ROJO;
    const x0 = hx - M, y0 = hy - M, x1 = hx + hw + M - 1, y1 = hy + hh + M - 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x >= hx && x < hx + hw && y >= hy && y < hy + hh) { p.px(x, y, bayer(x, y) < 0.2 ? '#1a1a34' : '#10101e'); continue; }
      const d = Math.min(x - x0, y - y0, x1 - x, y1 - y);
      const oro = x - x0 + (y - y0) < (x1 - x0) ? '#ffd84a' : '#e0a020';
      const c = d === 0 ? INK : d === 1 ? '#fff6c2' : d <= 5 ? oro : d === 6 ? '#9a6410' : d === 7 ? INK
        : d <= 12 ? (d === 8 ? lado[3] : y < hy + hh / 2 ? lado[2] : lado[1]) : d === 13 ? INK : d === 14 ? '#e0a020' : INK;
      p.px(x, y, c);
    }
    // remaches en la banda: en las esquinas y cada 24 por los lados
    const r0 = x0 + 10, r1 = x1 - 10, s0 = y0 + 10, s1 = y1 - 10;
    const remache = (x: number, y: number) => { p.rect(x - 1, y - 1, 3, 3, '#e0a020'); p.px(x - 1, y - 1, '#fff6c2'); p.px(x + 1, y + 1, '#9a6410'); };
    for (let x = r0; x <= r1; x += 24) { remache(x, s0); remache(x, s1); }
    for (let y = s0 + 24; y < s1; y += 24) { remache(r0, y); remache(r1, y); }
    placaNombre(p, hx + hw / 2, VS2.nombres, VS2.placa);
  });
  return {
    name: 'marco_vs_2', frames: [p.r], w: W, h: H,
    extra: { margen: VS2.margen, huecos: VS2.huecos, marco: VS2.marco, vs: VS2.vs, texto: VS2.texto, nombres: VS2.nombres, frases: VS2.frases, costura: VS2.costura,
      nota: 'Imagen de 800 x 360 (la parte de 640 de x 80 a 720). Un retrato grande por hueco, a 1: el primero del equipo de la izquierda (azul), el segundo del de la derecha (rojo). El nombre centrado bajo cada hueco en y `nombres`, la frase en y `frases`.' },
  };
}

// ---------------------------------------------------------------- pantallas retro

/** La franja tranquila de las pantallas (coordenadas de la imagen): ahí el juego escribe el título y las opciones. */
export const PANTALLAS = { w: 800, h: 360, margen: 80, calma: [180, 85, 440, 150] as [number, number, number, number] };

/**
 * Los fondos de las pantallas retro, de 800 x 360:
 * - `pausa`: un velo oscuro tramado (la pelea se ve por los huecos, sin alfa) con la placa del medio y esquineros.
 * - `se_acabo` (SE ACABÓ LA VAINA): de noche bajo la lluvia, en plata y gris, la ciudad apagada abajo.
 * - `otra_partidita` (¿OTRA PARTIDITA?): rayos de sol de arcade, el piso de cuadrícula y monedas a los lados.
 * El texto y las opciones los escribe el juego en `calma`.
 */
export function pantallaRetro(cual: 'pausa' | 'se_acabo' | 'otra_partidita'): UiPiece {
  const { w: W, h: H } = PANTALLAS;
  const p = new Pix(W, H);
  const [qx, qy, qw, qh] = PANTALLAS.calma;
  const r = rng(cual.length * 977);
  if (cual === 'pausa') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + y) % 2 === 0) p.px(x, y, '#08081a');
    // la placa del medio
    const [px0, py0, pw, ph] = [qx + 30, qy + 27, qw - 60, qh - 2];
    for (let y = py0; y < py0 + ph; y++) for (let x = px0; x < px0 + pw; x++) {
      const d = Math.min(x - px0, y - py0, px0 + pw - 1 - x, py0 + ph - 1 - y);
      p.px(x, y, d === 0 ? INK : d < 3 ? (y < py0 + ph / 2 ? '#ffd84a' : '#e0a020') : d === 3 ? '#4a3a10' : bayer(x, y) < 0.15 ? '#141634' : '#0e1028');
    }
    // dos barras de pausa a cada lado de la placa
    for (const bx of [px0 - 40, px0 + pw + 18]) for (const dx of [0, 10]) for (let y = 0; y < 30; y++) for (let x = 0; x < 6; x++) p.px(bx + dx + x, qy + 60 + y, x === 0 || y === 0 ? '#ffffff' : x === 5 || y === 29 ? '#8a8ea8' : '#dce8ff');
    // esquineros de pantalla
    for (const [ex, ey, sx, sy] of [[90, 12, 1, 1], [710, 12, -1, 1], [90, 348, 1, -1], [710, 348, -1, -1]]) for (let i = 0; i < 26; i++) { p.rect(ex + sx * i, ey, 1, 3 * sy > 0 ? 3 : 1, '#ffd84a'); p.rect(ex, ey + sy * i, 3, 1, '#ffd84a'); }
  } else if (cual === 'se_acabo') {
    const cielo = ['#0a0a14', '#12121f', '#1a1a2c', '#24243a', '#30304a'];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = y / H + (bayer(x, y) - 0.5) * 0.1;
      p.px(x, y, cielo[Math.max(0, Math.min(4, Math.floor(t * 5)))]);
    }
    // nubes bajas y pesadas arriba
    for (let i = 0; i < 26; i++) { const nx = r() * W, ny = r() * 50; for (let y = -8; y < 8; y++) for (let x = -40; x < 40; x++) if ((x / 40) ** 2 + (y / 8) ** 2 < 1 && bayer(nx + x, ny + y) < 0.5) p.px(nx + x, ny + y, '#2a2a3e'); }
    // la ciudad apagada abajo: edificios con alguna ventana prendida
    let x = 0;
    while (x < W) {
      const bw = 24 + Math.floor(r() * 40), bh = 40 + Math.floor(r() * 70);
      const top = H - bh;
      for (let y = top; y < H; y++) for (let xx = x; xx < x + bw && xx < W; xx++) p.px(xx, y, y === top ? '#3a3a52' : '#14141e');
      for (let wy = top + 6; wy < H - 6; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7) if (r() < 0.08) p.rect(wx, wy, 3, 4, '#d8c070');
      x += bw + 2;
    }
    // la lluvia en diagonal, más tenue en la franja del texto
    for (let i = 0; i < 520; i++) {
      const lx = r() * (W + 100) - 50, ly = r() * H, len = 6 + r() * 10;
      const enCalma = lx > qx && lx < qx + qw && ly > qy && ly < qy + qh;
      if (enCalma && r() < 0.7) continue;
      p.line(lx, ly, lx - len * 0.35, ly + len, enCalma ? '#3a3a58' : '#6a6e90');
    }
    // un charco que brilla abajo en el medio
    for (let y = H - 14; y < H - 4; y++) for (let xx = 300; xx < 500; xx++) if (((xx - 400) / 100) ** 2 + ((y - H + 9) / 5) ** 2 < 1) p.px(xx, y, bayer(xx, y) < 0.3 ? '#8a8eb0' : '#3a3e5a');
  } else {
    // rayos de sol de arcade desde el centro, oscuros cerca del texto
    const cx = 400, cy = 160;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = Math.atan2(y - cy, x - cx), rr = Math.hypot((x - cx) * 0.7, y - cy);
      const rayo = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 24) % 2 === 0;
      const lejos = Math.min(1, rr / 300);
      const base = rayo ? ['#141046', '#22186a', '#3a1e8a', '#5a2aa8'] : ['#0c0a30', '#140f4a', '#1e1460', '#2a1a78'];
      p.px(x, y, base[Math.max(0, Math.min(3, Math.floor(lejos * 4 + (bayer(x, y) - 0.5) * 0.4)))]);
    }
    // el piso de cuadrícula en perspectiva
    const hor = 268;
    for (let y = hor; y < H; y++) for (let x = 0; x < W; x++) {
      const z = (y - hor + 1) / (H - hor);
      const gx = ((x - cx) / (z * 4 + 0.2)) % 40;
      const lineaH = Math.floor(Math.log(z * 30 + 1) * 6) !== Math.floor(Math.log(((y - hor) / (H - hor)) * 30 + 1 + 0.15) * 6);
      p.px(x, y, Math.abs(gx) < 1.2 || lineaH ? '#ff3ac8' : y === hor ? '#ff8ae0' : '#1a0a2e');
    }
    // estrellas y monedas a los lados
    for (let i = 0; i < 40; i++) { const sx = r() < 0.5 ? r() * 170 : 630 + r() * 170, sy = r() * 250; sparkle(p, Math.round(sx), Math.round(sy), r() < 0.3 ? 2 : 1, '#ffffff', '#9ab8ff'); }
    for (const [mx, my] of [[110, 120], [150, 200], [690, 110], [650, 210], [86, 60], [716, 50]]) {
      p.disc(mx, my, 9, '#e0a020'); p.disc(mx - 1, my - 1, 7, '#ffd84a'); p.rect(mx - 1, my - 4, 2, 8, '#a86c12'); p.px(mx - 4, my - 4, '#ffffff');
      p.ring(mx, my, 9.5, INK);
    }
  }
  return { name: `pantalla_${cual}`, frames: [p.r], w: W, h: H, extra: { margen: PANTALLAS.margen, calma: PANTALLAS.calma } };
}
