import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';

// Desierto: el puerto de arenisca y los páramos de arena alrededor (palmeras, mercado, murallas, barcas, huesos).
MATERIALES.desierto_palma = { rampa: ['#0e1209', '#1a2010', '#283018', '#374121', '#47522b', '#586336', '#6b7444'], ruido: 0.5, escala: 0.45 };
MATERIALES.desierto_cacto = { rampa: ['#0d130f', '#18221a', '#243226', '#314232', '#3f523d', '#4f6349', '#617455'], ruido: 0.35, escala: 0.6 };
MATERIALES.desierto_barro = { rampa: ['#1e0f09', '#33190f', '#4a2616', '#62341e', '#7a4427', '#925632', '#a86a40'], ruido: 0.22, escala: 0.3 };
MATERIALES.desierto_dorada = { rampa: ['#2a1a0c', '#452c14', '#62401c', '#7f5626', '#9b6c32', '#b4843f'], ruido: 0.3, escala: 0.4 };

const PI = Math.PI;
const nrm2 = (x: number, y: number) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

/** Roca de cáscara convexa: puntos al azar sobre un elipsoide, con la base aplastada en el piso. */
function roca(a: Arma, x: number, y: number, z: number, rx: number, ry: number, rz: number, mat: string, n = 12, tono = 0): Pieza {
  const pts: V3[] = [];
  for (let i = 0; i < n; i++) {
    const u = a.r() * PI * 2, v = Math.acos(2 * a.r() - 1), k = 0.72 + a.r() * 0.28;
    pts.push([x + rx * k * Math.sin(v) * Math.cos(u), y + ry * k * Math.sin(v) * Math.sin(u), Math.max(0, z + rz * k * Math.cos(v))]);
  }
  pts.push([x, y, z + rz * 0.95]);
  return a.poliedro(pts, { mat, tono });
}
/** Lámina con grosor entre dos puntos del piso que se ensancha de w0 a w1 (hojas de palma, tiras de tela). */
function lamina(a: Arma, p: V3, q: V3, w0: number, w1: number, mat: string, tono = 0, grosor = 1): Pieza {
  const [nx, ny] = nrm2(-(q[1] - p[1]), q[0] - p[0]);
  const pts: V3[] = [];
  for (const dz of [0, grosor]) {
    pts.push([p[0] + nx * w0 / 2, p[1] + ny * w0 / 2, p[2] + dz], [p[0] - nx * w0 / 2, p[1] - ny * w0 / 2, p[2] + dz]);
    pts.push([q[0] + nx * w1 / 2, q[1] + ny * w1 / 2, q[2] + dz], [q[0] - nx * w1 / 2, q[1] - ny * w1 / 2, q[2] + dz]);
  }
  return a.poliedro(pts, { mat, tono });
}
/** Prisma de tela entre cuatro esquinas (un paño de techo), con grosor hacia abajo. */
function pano(a: Arma, c: V3[], mat: string, tono = 0, g = 1.2): Pieza {
  return a.poliedro([...c, ...c.map((p) => [p[0], p[1], p[2] - g] as V3)], { mat, tono });
}
/** Montoncito de arena al pie de las cosas (cáscara baja: su caja en pantalla es justa y pinta rápido). */
function duna(a: Arma, x: number, y: number, rx: number, ry: number, h = 2.5, giro = 0): Pieza {
  const pts: V3[] = [], g = (giro * PI) / 180, n = 10;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * PI * 2, k = 0.85 + a.r() * 0.2, c = Math.cos(t) * rx * k, s = Math.sin(t) * ry * k;
    pts.push([x + c * Math.cos(g) - s * Math.sin(g), y + c * Math.sin(g) + s * Math.cos(g), 0]);
    pts.push([x + (c * Math.cos(g) - s * Math.sin(g)) * 0.55, y + (c * Math.sin(g) + s * Math.cos(g)) * 0.55, h]);
  }
  return a.poliedro(pts, { mat: 'arena', tono: -0.14 });
}

/** Jarra de barro: cuerpo, cuello, boca y asas opcionales. */
function jarra(a: Arma, ps: Pieza[], x: number, y: number, z: number, h: number, r: number, forma: 'anfora' | 'cantaro' | 'tinaja', mat = 'desierto_barro', tono = 0) {
  if (forma === 'anfora') {
    ps.push(a.cilindro(x, y, z, 1.2, h * 0.2, { mat, r1: r * 0.8, tono }));
    ps.push(a.elipsoide(x, y, z + h * 0.45, r, r, h * 0.3, { mat, tono }));
    ps.push(a.cilindro(x, y, z + h * 0.7, r * 0.35, h * 0.24, { mat, r1: r * 0.3, tono }));
    ps.push(a.cilindro(x, y, z + h * 0.92, r * 0.45, h * 0.08, { mat, tono: tono - 0.05 }));
    for (const s of [-1, 1]) ps.push(a.palo([x + s * r * 0.35, y, z + h * 0.88], [x + s * r * 0.85, y, z + h * 0.66], 0.9, { mat, tono }));
  } else if (forma === 'cantaro') {
    ps.push(a.elipsoide(x, y, z + h * 0.38, r, r, h * 0.38, { mat, tono }));
    ps.push(a.cilindro(x, y, z + h * 0.66, r * 0.4, h * 0.26, { mat, r1: r * 0.5, tono }));
    ps.push(a.palo([x, y + r * 0.5, z + h * 0.88], [x, y + r * 0.95, z + h * 0.55], 0.9, { mat, tono }));
    ps.push(a.cilindro(x, y, z + h * 0.36, r * 1.01, h * 0.06, { mat, tono: tono - 0.18 }));
  } else {
    ps.push(a.cilindro(x, y, z, r * 0.6, h * 0.5, { mat, r1: r, tono }));
    ps.push(a.cilindro(x, y, z + h * 0.5, r, h * 0.4, { mat, r1: r * 0.75, tono }));
    ps.push(a.cilindro(x, y, z + h * 0.9, r * 0.8, h * 0.1, { mat, tono: tono - 0.08 }));
    ps.push(a.cilindro(x, y, z + h * 0.95, r * 0.62, 0.3, { mat: 'negro' }));
  }
}

/** Una palmera: tronco curvo con anillos y una copa de hojas largas que caen. */
function palmera(a: Arma, ps: Pieza[], x0: number, y0: number, alto: number, curva: number, giro: number, seca: boolean, nHojas = 11) {
  const n = 6, dx = Math.cos(giro), dy = Math.sin(giro);
  let p: V3 = [x0, y0, 0];
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / n, lean = curva * t * t;
    const q: V3 = [x0 + dx * lean, y0 + dy * lean, alto * t];
    const r0 = 3.8 - 1.5 * (i / n);
    ps.push(a.palo(p, q, r0, { mat: 'corteza', r1: r0 - 0.35, tono: i % 2 ? -0.07 : 0.06 }));
    p = q;
  }
  const top = p;
  ps.push(a.esfera(top[0], top[1], top[2], 3.4, { mat: 'corteza', tono: -0.05 }));
  // racimos de dátiles bajo la copa
  if (!seca) for (let k = 0; k < 3; k++) {
    const ang = a.r() * PI * 2;
    ps.push(a.elipsoide(top[0] + Math.cos(ang) * 3.5, top[1] + Math.sin(ang) * 3.5, top[2] - 4, 2.6, 2.6, 3.6, { mat: 'desierto_dorada' }));
  }
  const N = seca ? 8 : nHojas;
  for (let k = 0; k < N; k++) {
    const ang = (k / N) * PI * 2 + a.r() * 0.45;
    const L = (seca ? 18 : 24) + a.r() * 8, sube = seca ? 0 : 4 + a.r() * 4, cae = seca ? 20 + a.r() * 8 : 9 + a.r() * 9;
    const c = Math.cos(ang), s = Math.sin(ang);
    const p1: V3 = [top[0] + c * L * 0.38, top[1] + s * L * 0.38, top[2] + sube];
    const p2: V3 = [top[0] + c * L * 0.72, top[1] + s * L * 0.72, top[2] + sube - cae * 0.35];
    const p3: V3 = [top[0] + c * L, top[1] + s * L, top[2] + sube - cae];
    const mat = seca ? (k % 2 ? 'hojas_otono' : 'paja') : 'desierto_palma';
    const t = (a.r() - 0.5) * 0.14;
    ps.push(lamina(a, top, p1, 1, 5.5, mat, t), lamina(a, p1, p2, 5.5, 4.4, mat, t - 0.03), lamina(a, p2, p3, 4.4, 0.6, mat, t - 0.06));
  }
  // hojas secas colgando bajo la copa
  for (let k = 0; k < (seca ? 5 : 2); k++) {
    const ang = a.r() * PI * 2;
    ps.push(lamina(a, [top[0] + Math.cos(ang) * 2, top[1] + Math.sin(ang) * 2, top[2] - 1], [top[0] + Math.cos(ang) * 5, top[1] + Math.sin(ang) * 5, top[2] - 14 - a.r() * 6], 3, 1, 'paja', -0.1));
  }
}

registrar(
  {
    id: 'des_palmera', nombre: ['Palmera datilera', 'Date palm'], tema: 'desierto', variantes: ['alta', 'curva', 'doble', 'seca'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 0, 12, 10, 2.5)];
      const g = a.r() * PI * 2;
      if (v === 'alta') palmera(a, ps, 0, 0, 120 + a.r() * 20, 10, g, false);
      if (v === 'curva') palmera(a, ps, 0, 0, 96 + a.r() * 12, 30, g, false);
      if (v === 'seca') palmera(a, ps, 0, 0, 92 + a.r() * 14, 14, g, true);
      if (v === 'doble') { palmera(a, ps, -3, 2, 118, 16, PI * 0.8, false, 9); palmera(a, ps, 3, -2, 92, 22, -PI * 0.2, false, 8); }
      for (let i = 0; i < 4; i++) { const ang = a.r() * PI * 2; ps.push(a.palo([0, 0, 3], [Math.cos(ang) * 7, Math.sin(ang) * 7, 0], 1.2, { mat: 'corteza' })); }
      return ps;
    },
  },
  {
    id: 'des_cactus', nombre: ['Cactus', 'Cactus'], tema: 'desierto', variantes: ['brazos', 'tunas', 'barril'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 0, 10, 9, 2)];
      const m = 'desierto_cacto';
      if (v === 'brazos') {
        const h = 46 + a.r() * 14;
        ps.push(a.cilindro(0, 0, 0, 4.6, h, { mat: m, r1: 4.4 }), a.esfera(0, 0, h, 4.4, { mat: m }));
        for (let k = 0; k < 6; k++) { const ang = (k / 6) * PI * 2; ps.push(a.cilindro(Math.cos(ang) * 4.3, Math.sin(ang) * 4.3, 1, 0.7, h - 2, { mat: m, tono: -0.12 })); }
        const brazos = [[1, 0.15, 0.4], [-1, 0.5, 0.55]];
        for (const [sx, gy, zz] of brazos) {
          const z = h * zz + a.r() * 4, sale = 8 + a.r() * 3, sube = 10 + a.r() * 8;
          const b0: V3 = [0, 0, z], b1: V3 = [sx * sale, sx * gy * sale, z + 2], b2: V3 = [sx * sale, sx * gy * sale, z + 2 + sube];
          ps.push(a.palo(b0, b1, 3, { mat: m }), a.esfera(b1[0], b1[1], b1[2], 3, { mat: m }), a.palo(b1, b2, 3, { mat: m, r1: 2.9 }), a.esfera(b2[0], b2[1], b2[2], 2.9, { mat: m }));
        }
        if (a.r() < 0.7) ps.push(a.esfera(1, 1, h + 4, 1.6, { mat: 'tela_roja', tono: 0.15 }));
      } else if (v === 'tunas') {
        const pal = (x: number, y: number, z: number, g: number, inc: number, n: number) => {
          ps.push(a.elipsoide(x, y, z, 6, 1.6, 7.5, { mat: m, giro: g, incl: inc, tono: (a.r() - 0.5) * 0.12 }));
          if (n > 0) for (let i = 0; i < 2; i++) {
            const gg = g + (i ? 30 : -30) + (a.r() - 0.5) * 30, ang = (g * PI) / 180;
            const dx = Math.cos(ang) * (i ? 5 : -5), dy = Math.sin(ang) * (i ? 5 : -5);
            pal(x + dx, y + dy, z + 11, gg, (a.r() - 0.5) * 30, n - 1);
          }
          else if (a.r() < 0.8) ps.push(a.esfera(x, y, z + 8, 1.6, { mat: 'tela_roja', tono: 0.05 }));
        };
        pal(0, 0, 6, a.r() * 180, 0, 2);
        pal(6, 5, 5, 60 + a.r() * 40, 15, 1);
      } else {
        const n = 3 + Math.floor(a.r() * 2);
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * PI * 2 + a.r(), d = i ? 7 + a.r() * 2 : 0, r = i ? 4 + a.r() * 2 : 7;
          const x = Math.cos(ang) * d, y = Math.sin(ang) * d;
          ps.push(a.elipsoide(x, y, r * 0.9, r, r, r * 1.2, { mat: m }));
          for (let k = 0; k < 5; k++) { const b = (k / 5) * PI * 2; ps.push(a.elipsoide(x + Math.cos(b) * r * 0.8, y + Math.sin(b) * r * 0.8, r * 0.9, 0.7, 0.7, r * 1.0, { mat: m, tono: -0.14 })); }
          ps.push(a.esfera(x, y, r * 2.05, 1.5, { mat: i % 2 ? 'tela_roja' : 'desierto_dorada', tono: 0.1 }));
        }
      }
      return ps;
    },
  },
  {
    id: 'des_arbusto', nombre: ['Arbusto seco', 'Dry bush'], tema: 'desierto', variantes: ['seco', 'espinoso', 'rodante'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'rodante') {
        for (let i = 0; i < 26; i++) {
          const u1 = a.r() * PI * 2, v1 = a.r() * PI, u2 = u1 + 1 + a.r() * 2, v2 = a.r() * PI, R = 9;
          ps.push(a.palo([Math.cos(u1) * Math.sin(v1) * R, Math.sin(u1) * Math.sin(v1) * R, 9 + Math.cos(v1) * R * 0.85], [Math.cos(u2) * Math.sin(v2) * R, Math.sin(u2) * Math.sin(v2) * R, 9 + Math.cos(v2) * R * 0.85], 0.55, { mat: i % 3 ? 'corteza_muerta' : 'paja' }));
        }
        return ps;
      }
      ps.push(duna(a, 0, 0, 9, 8, 2));
      const n = v === 'seco' ? 9 : 14;
      for (let i = 0; i < n; i++) {
        const ang = a.r() * PI * 2, L = v === 'seco' ? 16 + a.r() * 10 : 9 + a.r() * 5, sube = 0.5 + a.r() * 0.4;
        const b: V3 = [Math.cos(ang) * L * (1 - sube), Math.sin(ang) * L * (1 - sube), L * sube];
        ps.push(a.palo([0, 0, 1], b, 1, { mat: 'corteza_muerta', r1: 0.6 }));
        for (let k = 0; k < 2; k++) {
          const g2 = ang + (a.r() - 0.5) * 1.6, L2 = L * 0.45;
          ps.push(a.palo(b, [b[0] + Math.cos(g2) * L2 * 0.6, b[1] + Math.sin(g2) * L2 * 0.6, b[2] + L2 * 0.7], 0.6, { mat: 'corteza_muerta', r1: 0.4 }));
        }
        if (v === 'espinoso') ps.push(a.elipsoide(b[0], b[1], b[2], 3, 3, 2.2, { mat: a.r() < 0.5 ? 'paja' : 'hojas_otono', tono: -0.08 }));
      }
      return ps;
    },
  },
  {
    id: 'des_roca', nombre: ['Rocas del desierto', 'Desert rocks'], tema: 'desierto', variantes: ['piedras', 'penasco', 'meseta'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'piedras') {
        ps.push(duna(a, 0, 0, 16, 12, 2));
        const n = 4 + Math.floor(a.r() * 3);
        for (let i = 0; i < n; i++) { const ang = a.r() * PI * 2, d = i ? 9 + a.r() * 8 : 0, r = i ? 4 + a.r() * 4 : 12; ps.push(roca(a, Math.cos(ang) * d, Math.sin(ang) * d, 0, r * 1.2, r, r * 0.9, i % 3 === 1 ? 'arenisca_lisa' : i % 2 ? 'roca' : 'roca_roja', 11)); }
      } else if (v === 'penasco') {
        ps.push(duna(a, 0, 0, 30, 24, 3));
        ps.push(roca(a, 0, 0, 0, 22, 17, 34, 'roca_roja', 16));
        ps.push(roca(a, -6, 4, 22, 14, 12, 20, 'roca_roja', 12, 0.05));
        for (let i = 0; i < 5; i++) { const ang = a.r() * PI * 2; ps.push(roca(a, Math.cos(ang) * 24, Math.sin(ang) * 20, 0, 4 + a.r() * 3, 4, 3 + a.r() * 3, 'arenisca_lisa', 10)); }
      } else {
        // meseta: farallón de estratos casi verticales sobre un talud de escombros
        ps.push(duna(a, 0, 0, 56, 48, 4));
        ps.push(roca(a, 0, 0, 0, 50, 42, 22, 'roca_roja', 18, -0.06));
        let z = 6;
        const capas = ['roca_roja', 'roca_roja', 'arenisca', 'roca_roja', 'roca_roja'];
        for (let i = 0; i < capas.length; i++) {
          const h = 12 + a.r() * 5, rx = 38 - i * 1.6, ry = 32 - i * 1.4;
          const pts: V3[] = [];
          for (let k = 0; k < 14; k++) { const t = (k / 14) * PI * 2, j = 0.86 + a.r() * 0.16; pts.push([Math.cos(t) * rx * j, Math.sin(t) * ry * j, z], [Math.cos(t) * rx * j * (0.96 + a.r() * 0.04), Math.sin(t) * ry * j * 0.97, z + h]); }
          ps.push(a.poliedro(pts, { mat: capas[i], tono: (i % 2 ? 0.02 : -0.04) + (a.r() - 0.5) * 0.05 }));
          z += h;
        }
        ps.push(roca(a, 4, -4, z - 3, 30, 24, 6, 'roca_roja', 14, 0.06));
        for (let i = 0; i < 3; i++) { const ang = a.r() * PI * 2; ps.push(a.poliedro([[Math.cos(ang) * 30, Math.sin(ang) * 26, 10], [Math.cos(ang) * 40, Math.sin(ang) * 34, z - 4], [Math.cos(ang + 0.15) * 40, Math.sin(ang + 0.15) * 34, z - 10], [Math.cos(ang) * 44, Math.sin(ang) * 37, 20]], { mat: 'negro', resta: true })); }
        for (let i = 0; i < 7; i++) { const ang = a.r() * PI * 2; ps.push(roca(a, Math.cos(ang) * 50, Math.sin(ang) * 44, 0, 5 + a.r() * 5, 5, 4 + a.r() * 4, 'roca_roja', 10)); }
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ tiendas, mercado, toldos
/** Techo a dos aguas de tela a rayas a lo largo de x: cumbrera en y=0. */
function techoRayas(a: Arma, ps: Pieza[], x0: number, x1: number, yA: number, yB: number, zA: number, zC: number, mats: string[], n: number, roto = -1) {
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    if (i === roto) continue;
    const xa = x0 + i * w, xb = xa + w, mat = mats[i % mats.length], comba = i % 2 ? -1 : 0;
    ps.push(pano(a, [[xa, yA, zA], [xb, yA, zA], [xa, 0, zC + comba], [xb, 0, zC + comba]], mat));
    ps.push(pano(a, [[xa, yB, zA], [xb, yB, zA], [xa, 0, zC + comba], [xb, 0, zC + comba]], mat, 0.02));
  }
}

registrar(
  {
    id: 'des_tienda', nombre: ['Tienda nómada', 'Nomad tent'], tema: 'desierto', variantes: ['abierta', 'cerrada', 'vieja'], huella: [4, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 0, 36, 26, 2)];
      const X = 30, Y = 19, zE = 22, zC = 36;
      const mats = v === 'vieja' ? ['tela', 'tela_verde'] : ['tela_roja', 'tela'];
      // la pared del fondo y las de los costados
      ps.push(a.caja(0, -Y + 0.6, 0, 2 * X, 1.2, zE, { mat: mats[1], tono: -0.05 }));
      for (const s of [-1, 1]) ps.push(a.poliedro([[s * X, -Y, 0], [s * X, Y, 0], [s * X, -Y, zE], [s * X, Y, zE], [s * X, 0, zC], [s * X - s * 1.2, 0, zC], [s * X - s * 1.2, -Y, 0], [s * X - s * 1.2, Y, 0], [s * X - s * 1.2, -Y, zE], [s * X - s * 1.2, Y, zE]], { mat: mats[0], tono: s > 0 ? -0.04 : 0 }));
      // adentro: alfombra y cojines
      ps.push(a.caja(0, 2, 0, 44, 26, 0.8, { mat: 'tela_roja', tono: -0.1 }), a.caja(0, 2, 0.8, 38, 20, 0.4, { mat: 'tela_azul' }));
      for (let i = 0; i < 3; i++) ps.push(a.elipsoide(-16 + i * 13, -13, 3, 5, 3.5, 3, { mat: i % 2 ? 'tela_azul' : 'tela_morada' }));
      if (v !== 'cerrada') jarra(a, ps, 20, -10, 0.8, 12, 4, 'cantaro');
      techoRayas(a, ps, -X, X, -Y, Y, zE, zC, mats, 7, v === 'vieja' ? 2 + Math.floor(a.r() * 3) : -1);
      if (v === 'cerrada') ps.push(a.caja(0, Y - 0.6, 0, 2 * X, 1.2, zE, { mat: mats[0], tono: 0.02 }), a.caja(0, Y, 0, 10, 1.4, zE - 2, { mat: mats[1] }));
      // postes
      for (const x of [-X + 1, 0, X - 1]) ps.push(a.palo([x, 0, 0], [x, 0, zC + 3], 1.1, { mat: 'madera_vieja' }));
      for (const x of [-X + 1, X - 1]) for (const y of [-Y, Y]) ps.push(a.palo([x, y, 0], [x, y, zE + 2], 1, { mat: 'madera_vieja' }));
      if (v === 'abierta') {
        // el alero delantero levantado sobre dos palos
        ps.push(pano(a, [[-X + 6, Y, zE], [X - 6, Y, zE], [-X + 6, Y + 14, zE + 3], [X - 6, Y + 14, zE + 3]], mats[0], -0.02));
        for (const x of [-X + 7, X - 7]) ps.push(a.palo([x, Y + 14, 0], [x, Y + 14, zE + 4], 0.9, { mat: 'madera_vieja' }));
      }
      if (v === 'vieja') ps.push(pano(a, [[X - 10, Y, zE], [X, Y, zE], [X - 9, Y + 4, 2], [X + 1, Y + 3, 3]], mats[0], -0.08));
      // vientos
      for (const [x, y, sx, sy] of [[-X, -Y, -1, -1], [X, -Y, 1, -1], [-X, Y, -1, 1], [X, Y, 1, 1]]) {
        ps.push(a.palo([x, y, zE], [x + sx * 8, y + sy * 6, 0], 0.4, { mat: 'cuerda' }), a.caja(x + sx * 8, y + sy * 6, 0, 1.4, 1.4, 3, { mat: 'madera' }));
      }
      return ps;
    },
  },
  {
    id: 'des_puesto', nombre: ['Puesto de mercado', 'Market stall'], tema: 'desierto', variantes: ['jarras', 'alfombras', 'frutas'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 0, 30, 20, 1.5)];
      const X = 22, Y = 12;
      // mostrador
      ps.push(a.caja(0, 5, 0, 40, 12, 13, { mat: 'madera_vieja' }), a.caja(0, 5, 13, 42, 14, 1.5, { mat: 'madera' }));
      ps.push(a.caja(0, 11.2, 2, 38, 0.6, 9, { mat: 'tela_roja', tono: -0.05 }));
      // postes y toldo inclinado hacia el frente
      for (const [x, y, h] of [[-X, -Y, 52], [X, -Y, 52], [-X, Y, 42], [X, Y, 42]]) ps.push(a.caja(x, y, 0, 2.2, 2.2, h, { mat: 'madera_vieja' }));
      const n = 6, w = (2 * X + 4) / n;
      for (let i = 0; i < n; i++) {
        const xa = -X - 2 + i * w, xb = xa + w;
        ps.push(pano(a, [[xa, -Y - 2, 53], [xb, -Y - 2, 53], [xa, Y + 4, 41], [xb, Y + 4, 41]], i % 2 ? 'tela' : (v === 'alfombras' ? 'tela_azul' : 'tela_roja')));
        ps.push(a.poliedro([[xa, Y + 4, 41], [xb, Y + 4, 41], [(xa + xb) / 2, Y + 4.5, 36], [xa, Y + 3, 41], [xb, Y + 3, 41]], { mat: i % 2 ? 'tela' : (v === 'alfombras' ? 'tela_azul' : 'tela_roja'), tono: -0.04 }));
      }
      if (v === 'jarras') {
        jarra(a, ps, -14, 4, 14.5, 12, 4, 'cantaro', 'desierto_barro', 0.05);
        jarra(a, ps, -5, 6, 14.5, 9, 3.2, 'tinaja');
        jarra(a, ps, 4, 3, 14.5, 14, 3.4, 'anfora', 'desierto_barro', -0.05);
        jarra(a, ps, 14, 6, 14.5, 8, 3.6, 'tinaja', 'bronce');
        jarra(a, ps, -26, 12, 0, 18, 6, 'tinaja');
        jarra(a, ps, 27, 8, 0, 20, 5, 'anfora');
        ps.push(a.caja(0, -9, 26, 40, 6, 1.5, { mat: 'madera' }));
        for (let i = 0; i < 5; i++) jarra(a, ps, -16 + i * 8, -9, 27.5, 7, 2.3, i % 2 ? 'cantaro' : 'tinaja', 'desierto_barro', (a.r() - 0.5) * 0.2);
      } else if (v === 'alfombras') {
        ps.push(a.palo([-X, -Y + 1, 40], [X, -Y + 1, 40], 0.8, { mat: 'madera' }));
        const cols = ['tela_roja', 'tela_azul', 'tela_morada', 'tela_roja'];
        for (let i = 0; i < 4; i++) {
          const x = -15 + i * 10;
          ps.push(a.caja(x, -Y + 1.5, 10 + a.r() * 4, 9, 0.8, 30 - a.r() * 4, { mat: cols[i] }));
          ps.push(a.caja(x, -Y + 2.1, 16, 6, 0.4, 16, { mat: cols[(i + 1) % 4], tono: 0.05 }));
        }
        for (let i = 0; i < 3; i++) ps.push(a.caja(-6 + (a.r() - 0.5) * 3, 5, 14.5 + i * 2, 24, 10, 2, { mat: cols[i], giro: (a.r() - 0.5) * 12 }));
        for (let i = 0; i < 3; i++) ps.push(a.cilindro(-28 + i * 2, 10 - i * 5, 3, 3, 14 + i * 2, { mat: cols[i + 1], eje: [0.1, 0.25, 1] }));
      } else {
        for (let i = 0; i < 4; i++) {
          const x = -14 + i * 9;
          ps.push(a.cilindro(x, 5, 14.5, 3.4, 3, { mat: 'paja', r1: 4.4 }));
          ps.push(a.elipsoide(x, 5, 17.6, 3.8, 3.8, 1.8, { mat: i % 2 ? 'desierto_dorada' : 'tela_roja', tono: i % 2 ? 0 : -0.1 }));
        }
        for (let i = 0; i < 3; i++) ps.push(a.cilindro(-25 + i * 3, 13 + (i % 2) * 6, 0, 4.5, 8, { mat: 'tela', r1: 5 }), a.elipsoide(-25 + i * 3, 13 + (i % 2) * 6, 8, 4.4, 4.4, 2.5, { mat: 'tela', tono: 0.05 }));
        for (let i = 0; i < 4; i++) ps.push(a.palo([-12 + i * 8, -Y + 1, 46], [-12 + i * 8, -Y + 1, 36], 0.3, { mat: 'cuerda' }), a.elipsoide(-12 + i * 8, -Y + 1, 34, 2, 2, 3, { mat: 'desierto_dorada' }));
      }
      return ps;
    },
  },
  {
    id: 'des_toldo', nombre: ['Toldo', 'Canopy'], tema: 'desierto', variantes: ['rayado', 'liso', 'roto'], huella: [3, 3], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const R = 21, h = 46;
      const post = (x: number, y: number, hh: number, inc = 0) => ps.push(a.caja(x, y, 0, 2.2, 2.2, hh, { mat: 'madera_vieja', incl: inc }));
      post(-R, -R, h); post(R, -R, h); post(-R, R, h);
      if (v === 'roto') post(R + 4, R, h * 0.9, 18); else post(R, R, h);
      // la tela: un paño por franja que cuelga en el medio
      const n = 5, w = (2 * R + 4) / n;
      for (let i = 0; i < n; i++) {
        const ya = -R - 2 + i * w, yb = ya + w;
        const mat = v === 'liso' ? 'tela' : i % 2 ? 'tela' : 'tela_azul';
        const sag = (y: number) => -4 * (1 - (y / R) ** 2);
        if (v === 'roto' && i >= 3) {
          ps.push(pano(a, [[-R - 2, ya, h + 1 + sag(ya)], [0, ya, h - 4 + sag(ya)], [-R - 2, yb, h + 1 + sag(yb)], [0, yb, h - 4 + sag(yb)]], mat));
          ps.push(pano(a, [[0, ya, h - 4], [0, yb, h - 4], [R + 6, ya + 2, 10 + i * 4], [R + 6, yb + 2, 8 + i * 4]], mat, -0.06));
          continue;
        }
        ps.push(pano(a, [[-R - 2, ya, h + 1 + sag(ya)], [0, ya, h - 4 + sag(ya)], [-R - 2, yb, h + 1 + sag(yb)], [0, yb, h - 4 + sag(yb)]], mat));
        ps.push(pano(a, [[0, ya, h - 4 + sag(ya)], [R + 2, ya, h + 1 + sag(ya)], [0, yb, h - 4 + sag(yb)], [R + 2, yb, h + 1 + sag(yb)]], mat, 0.02));
      }
      // flecos del frente
      for (let i = 0; i < 6; i++) ps.push(a.caja(-R + 2 + i * 8, R + 2, h - 6, 4, 0.6, 6, { mat: v === 'liso' ? 'tela' : 'tela_roja', tono: -0.04 }));
      ps.push(a.caja(0, 0, 0, 26, 20, 0.8, { mat: 'tela_roja', giro: a.r() * 20 - 10, tono: -0.12 }));
      jarra(a, ps, -10, -12, 0, 14, 4.5, 'tinaja');
      ps.push(a.elipsoide(8, -10, 3, 6, 4, 3, { mat: 'tela_morada' }));
      return ps;
    },
  },
);

// ------------------------------------------------------------------ arquitectura de arenisca
/** Arco: hueco de puerta con remate redondo, cavado en lo armado antes. En la cara +y (frente) si `ejeY`. */
function arco(a: Arma, ps: Pieza[], x: number, y: number, z: number, ancho: number, alto: number, prof: number, ejeY = true) {
  const r = ancho / 2;
  if (ejeY) ps.push(a.caja(x, y, z, ancho, prof, alto - r, { mat: 'negro', resta: true }), a.cilindro(x, y - prof / 2, z + alto - r, r, prof, { mat: 'negro', resta: true, eje: [0, 1, 0] }));
  else ps.push(a.caja(x, y, z, prof, ancho, alto - r, { mat: 'negro', resta: true }), a.cilindro(x - prof / 2, y, z + alto - r, r, prof, { mat: 'negro', resta: true, eje: [1, 0, 0] }));
}
/** Almenas sobre un muro a lo largo de x. */
function almenas(a: Arma, ps: Pieza[], x0: number, x1: number, y: number, z: number, prof: number, mat: string, paso = 13) {
  const n = Math.floor((x1 - x0) / paso);
  const sobra = (x1 - x0 - n * paso) / 2;
  for (let i = 0; i <= n; i++) {
    const x = x0 + sobra + i * paso;
    if (x < x0 + 3 || x > x1 - 3) continue;
    ps.push(a.caja(x, y, z, 7, prof, 7, { mat, tono: (a.r() - 0.5) * 0.06 }), a.poliedro([[x - 3.5, y - prof / 2, z + 7], [x + 3.5, y - prof / 2, z + 7], [x - 3.5, y + prof / 2, z + 7], [x + 3.5, y + prof / 2, z + 7], [x, y, z + 10]], { mat, tono: 0.04 }));
  }
}

registrar(
  {
    id: 'des_casa', nombre: ['Casa de arenisca', 'Sandstone house'], tema: 'desierto', variantes: ['azotea', 'cupula', 'ruina'], huella: [9, 8], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const W = 120, D = 104, H = 74, m = 'arenisca_lisa';
      const sucio = -0.05;
      ps.push(duna(a, 0, 0, 74, 64, 3));
      ps.push(a.caja(0, 0, 0, W, D, H, { mat: m, tono: sucio }));
      ps.push(a.caja(0, 0, 0, W + 3, D + 3, 6, { mat: 'arenisca', tono: -0.08 }));
      // pretil de la azotea
      ps.push(a.caja(0, D / 2 - 1.5, H, W, 3, 6, { mat: m, tono: 0.03 }), a.caja(W / 2 - 1.5, 0, H, 3, D, 6, { mat: m, tono: -0.02 }), a.caja(0, -D / 2 + 1.5, H, W, 3, 6, { mat: m }), a.caja(-W / 2 + 1.5, 0, H, 3, D, 6, { mat: m }));
      // piso alto
      const ux = -26, uy = -22;
      ps.push(a.caja(ux, uy, H, 56, 52, 32, { mat: m, tono: 0.02 }));
      ps.push(a.caja(ux, uy, H + 32, 58, 54, 3, { mat: m, tono: 0.06 }));
      // la puerta grande y ventanas arqueadas
      arco(a, ps, 18, D / 2, 0, 28, 54, 10);
      arco(a, ps, -28, D / 2, 34, 10, 18, 8);
      arco(a, ps, 46, D / 2, 38, 9, 16, 8);
      arco(a, ps, W / 2, -20, 34, 10, 18, 8, false);
      arco(a, ps, W / 2, 24, 34, 10, 18, 8, false);
      arco(a, ps, ux + 10, uy + 26, H + 8, 10, 18, 8);
      arco(a, ps, ux + 28, uy - 4, H + 8, 10, 18, 8, false);
      ps.push(a.caja(18, D / 2 - 3, 0, 26, 2, 48, { mat: 'madera', tono: -0.05 }));
      for (const z of [10, 32]) ps.push(a.caja(18, D / 2 - 1.8, z, 26, 0.6, 1.5, { mat: 'hierro' }));
      // marco de la puerta
      ps.push(a.caja(18, D / 2 + 1, 0, 36, 2, 3, { mat: 'arenisca', tono: -0.05 }));
      for (const s of [-1, 1]) ps.push(a.caja(18 + s * 16.5, D / 2 + 0.5, 0, 3, 2, 42, { mat: 'arenisca', tono: 0.05 }));
      // vigas que asoman bajo la azotea
      for (let i = 0; i < 6; i++) ps.push(a.cilindro(-W / 2 + 10 + i * 20, D / 2 - 1, H - 6, 1.4, 5, { mat: 'madera_vieja', eje: [0, 1, 0] }));
      for (let i = 0; i < 5; i++) ps.push(a.cilindro(W / 2 - 1, -D / 2 + 12 + i * 20, H - 6, 1.4, 5, { mat: 'madera_vieja', eje: [1, 0, 0] }));
      // escalera al costado derecho
      ps.push(a.poliedro([[W / 2, -40, 0], [W / 2 + 12, -40, 0], [W / 2, 36, 0], [W / 2 + 12, 36, 0], [W / 2, 36, H - 4], [W / 2 + 12, 36, H - 4]], { mat: 'arenisca', tono: -0.06 }));
      for (let i = 0; i < 7; i++) ps.push(a.caja(W / 2 + 6, -34 + i * 10, 0, 12.4, 4, 4 + (i + 1) * 8.1, { mat: 'arenisca_lisa', tono: 0.04 }));
      // toldo sobre la puerta
      ps.push(pano(a, [[0, D / 2, 62], [36, D / 2, 62], [0, D / 2 + 14, 55], [36, D / 2 + 14, 55]], 'tela_roja'));
      for (const x of [1, 35]) ps.push(a.palo([x, D / 2 + 14, 55], [x, D / 2, 59], 0.6, { mat: 'madera' }));
      jarra(a, ps, -10, D / 2 + 6, 0, 18, 5.5, 'tinaja');
      if (v === 'cupula') {
        ps.push(a.cilindro(ux, uy, H + 35, 20, 6, { mat: m, tono: 0.04 }));
        ps.push(a.elipsoide(ux, uy, H + 41, 20, 20, 20, { mat: 'arenisca_lisa', tono: 0.1 }));
        ps.push(a.palo([ux, uy, H + 59], [ux, uy, H + 70], 0.8, { mat: 'bronce' }), a.esfera(ux, uy, H + 66, 1.8, { mat: 'bronce' }));
      }
      if (v === 'azotea') {
        // ropa tendida y una palangana en la azotea
        ps.push(a.palo([10, 10, H + 18], [50, 10, H + 18], 0.3, { mat: 'cuerda' }));
        for (let i = 0; i < 2; i++) ps.push(a.caja(20 + i * 14, 10, H + 6, 10, 0.6, 11, { mat: ['tela', 'tela_azul'][i] }));
        for (const x of [10, 50]) ps.push(a.palo([x, 10, H], [x, 10, H + 19], 0.7, { mat: 'madera' }));
      }
      if (v === 'ruina') {
        ps.push(a.poliedro([[-W / 2 - 4, -D / 2 - 4, H + 40], [10, -D / 2 - 4, H + 40], [-W / 2 - 4, 10, H + 40], [-W / 2 - 4, -D / 2 - 4, H + 4], [-10, -D / 2 - 4, H + 40], [-W / 2 - 4, -D / 2 - 4, H + 24]], { mat: 'negro', resta: true }));
        ps.push(a.poliedro([[W / 2 + 4, 12, H + 8], [W / 2 + 4, D / 2 + 4, H + 8], [30, D / 2 + 4, H + 8], [W / 2 + 4, D / 2 + 4, H - 22]], { mat: 'negro', resta: true }));
        for (let i = 0; i < 6; i++) ps.push(roca(a, 40 + a.r() * 30, D / 2 + 6 + a.r() * 12, 0, 3 + a.r() * 5, 3 + a.r() * 4, 2 + a.r() * 3, i % 3 ? 'arenisca_lisa' : 'arenisca', 9));
      }
      return ps;
    },
  },
  {
    id: 'des_muralla', nombre: ['Muralla de arenisca', 'Sandstone city wall'], tema: 'desierto', variantes: ['tramo', 'tramo_der', 'torre', 'rota'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const m = 'arenisca';
      if (v === 'torre') {
        const S = 36, H = 118;
        ps.push(duna(a, 0, 0, 30, 30, 3));
        ps.push(a.caja(0, 0, 0, S + 6, S + 6, 10, { mat: m, tono: -0.06 }), a.caja(0, 0, 0, S, S, H, { mat: m }));
        ps.push(a.caja(0, 0, H - 14, S + 4, S + 4, 4, { mat: 'arenisca_lisa', tono: 0.06 }), a.caja(0, 0, H - 10, S + 4, S + 4, 10, { mat: m }));
        for (const z of [40, 76]) { ps.push(a.caja(0, S / 2, z, 3, 6, 14, { mat: 'negro', resta: true }), a.caja(S / 2, 0, z + 8, 6, 3, 14, { mat: 'negro', resta: true })); }
        arco(a, ps, 0, S / 2, 0, 16, 28, 8);
        ps.push(a.caja(0, S / 2 - 2, 0, 14, 2, 22, { mat: 'madera', tono: -0.1 }));
        almenas(a, ps, -S / 2 - 2, S / 2 + 2, S / 2, H, 4, m, 10);
        almenas(a, ps, -S / 2 - 2, S / 2 + 2, -S / 2, H, 4, m, 10);
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ps.push(a.caja(s * (S / 2), -10 + i * 10, H, 4, 7, 7, { mat: m }));
        ps.push(a.palo([0, 0, H], [0, 0, H + 36], 0.8, { mat: 'madera' }), a.poliedro([[0, 0, H + 35], [0, 0, H + 25], [16, 3, H + 33], [16, 3, H + 27], [0, 0.8, H + 35], [16, 3.8, H + 30]], { mat: 'tela_roja' }));
        return ps;
      }
      const g = v === 'tramo_der' ? 90 : 0;
      const L = 80, T = 14, H = 78;
      const rot = (x: number, y: number): [number, number] => (g ? [-y, x] : [x, y]);
      const C = (x: number, y: number, z: number, w: number, d: number, h: number, mat: string, extra: Partial<{ tono: number; resta: boolean }> = {}) => { const [rx, ry] = rot(x, y); ps.push(a.caja(rx, ry, z, w, d, h, { mat, giro: g, ...extra })); };
      ps.push(duna(a, rot(0, T / 2 + 4)[0], rot(0, T / 2 + 4)[1], 44, 10, 3, g));
      C(0, 0, 0, L, T + 4, 8, m, { tono: -0.06 });
      C(0, 0, 0, L, T, H, m);
      C(0, 1, H - 6, L, T + 3, 3, 'arenisca_lisa', { tono: 0.06 });
      for (const x of [-22, 22]) C(x, T / 2, 34, 3, 6, 14, 'negro', { resta: true });
      // almenas
      const n = 6;
      for (let i = 0; i < n; i++) {
        const x = -L / 2 + 6 + i * ((L - 12) / (n - 1));
        C(x, T / 2 - 2, H, 7, 4, 8, m, { tono: (a.r() - 0.5) * 0.06 }); C(x, -T / 2 + 2, H, 7, 4, 8, m);
      }
      if (v === 'rota') {
        const loc: V3[] = [[-12, -12, H + 12], [28, -12, H + 12], [-12, 12, H + 12], [28, 12, H + 12], [4, -12, 30], [12, 12, 26], [8, 0, 22]];
        ps.push(a.poliedro(loc.map(([x, y, z]) => { const [rx, ry] = rot(x, y); return [rx, ry, z] as V3; }), { mat: 'negro', resta: true }));
        for (let i = 0; i < 10; i++) { const [px, py] = rot(-6 + a.r() * 32, T / 2 + 3 + a.r() * 14); ps.push(roca(a, px, py, 0, 3 + a.r() * 5, 3 + a.r() * 4, 2 + a.r() * 4, i % 3 ? 'arenisca' : 'arenisca_lisa', 9)); }
      }
      return ps;
    },
  },
  {
    id: 'des_puerta_palacio', nombre: ['Puerta del palacio', 'Palace gate'], tema: 'desierto', variantes: ['cerrada', 'abierta'], huella: [10, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 10, 96, 22, 3)];
      const m = 'arenisca', ml = 'arenisca_lisa';
      // muro de la puerta
      const W = 92, T = 24, H = 112;
      ps.push(a.caja(0, 0, 0, W, T, H, { mat: m }));
      ps.push(a.caja(0, T / 2, 0, 56, 6, 96, { mat: ml, tono: 0.04 }));
      // arco de herradura: hueco y moldura
      arco(a, ps, 0, T / 2, 0, 38, 76, 40);
      ps.push(a.cilindro(0, T / 2 + 2, 57, 21.5, 2, { mat: ml, resta: false, eje: [0, 1, 0], tono: 0.1 }));
      ps.push(a.cilindro(0, T / 2, 57, 19, 6, { mat: 'negro', resta: true, eje: [0, 1, 0] }));
      ps.push(a.caja(0, T / 2 + 2, 0, 42, 4, 57, { mat: 'negro', resta: true }));
      if (v === 'cerrada') {
        ps.push(a.caja(0, 0, 0, 38, 4, 76, { mat: 'madera', tono: -0.04 }));
        ps.push(a.caja(0, 2.2, 0, 0.8, 0.6, 76, { mat: 'negro' }));
        for (let i = 0; i < 4; i++) ps.push(a.caja(0, 2, 10 + i * 16, 38, 1, 2.2, { mat: 'bronce', tono: -0.05 }));
        for (const s of [-1, 1]) ps.push(a.cilindro(s * 4, 3, 36, 2.4, 0.8, { mat: 'bronce', eje: [0, 1, 0] }));
      } else {
        ps.push(a.caja(0, -10, 0, 38, 2, 76, { mat: 'negro' }));
        for (const s of [-1, 1]) ps.push(a.caja(s * 17, 6, 0, 3, 18, 74, { mat: 'madera', tono: s > 0 ? -0.1 : 0.02 }));
        ps.push(a.caja(0, 6, 0, 34, 30, 0.5, { mat: 'arena', tono: -0.15 }));
      }
      // friso y almenas escalonadas
      ps.push(a.caja(0, T / 2 + 0.5, 86, W, 2, 4, { mat: ml, tono: 0.08 }));
      for (let i = 0; i < 6; i++) ps.push(a.caja(-40 + i * 16, T / 2 + 1.2, 88, 4, 2, 2.4, { mat: 'negro', resta: true }));
      ps.push(a.caja(0, -T / 2 + 2, H, W, 4, 5, { mat: m, tono: -0.04 }));
      for (let i = 0; i < 7; i++) {
        const x = -36 + i * 12;
        const yf = T / 2 - 2.5;
        ps.push(a.caja(x, yf, H, 8, 5, 6, { mat: m }), a.poliedro([[x - 2.5, yf - 2.5, H + 6], [x + 2.5, yf - 2.5, H + 6], [x - 2.5, yf + 2.5, H + 6], [x + 2.5, yf + 2.5, H + 6], [x - 2.5, yf - 2.5, H + 9], [x + 2.5, yf - 2.5, H + 9], [x - 2.5, yf + 2.5, H + 9], [x + 2.5, yf + 2.5, H + 9], [x, yf - 2.5, H + 12], [x, yf + 2.5, H + 12]], { mat: m }));
      }
      // torres con cúpula
      for (const s of [-1, 1]) {
        const x = s * 64, S = 38, HT = 150;
        ps.push(a.caja(x, 0, 0, S + 8, S + 8, 12, { mat: m, tono: -0.06 }));
        ps.push(a.cilindro(x, 0, 0, S / 2 + 1, HT, { mat: m, r1: S / 2 - 3 }));
        ps.push(a.cilindro(x, 0, 52, S / 2 + 0.5, 4, { mat: ml, r1: S / 2 - 0.5, tono: 0.08 }), a.cilindro(x, 0, 104, S / 2 - 1, 4, { mat: ml, r1: S / 2 - 1.5, tono: 0.08 }));
        ps.push(a.cilindro(x, 0, HT, S / 2, 8, { mat: ml, r1: S / 2 + 1, tono: 0.06 }));
        for (let i = 0; i < 8; i++) { const ang = (i / 8) * PI * 2 + 0.4; ps.push(a.caja(x + Math.cos(ang) * (S / 2 - 1), Math.sin(ang) * (S / 2 - 1), HT + 8, 5, 5, 6, { mat: m, giro: (ang * 180) / PI })); }
        ps.push(a.cilindro(x, 0, HT + 4, S / 2 - 6, 10, { mat: ml }));
        ps.push(a.elipsoide(x, 0, HT + 14, S / 2 - 6, S / 2 - 6, 20, { mat: 'bronce', tono: -0.05 }));
        ps.push(a.palo([x, 0, HT + 32], [x, 0, HT + 42], 0.8, { mat: 'oro' }), a.esfera(x, 0, HT + 38, 1.6, { mat: 'oro' }));
        for (const z of [70, 120]) arco(a, ps, x + s * 0, S / 2 - 2, z, 6, 14, 10);
        // estandarte colgado del muro
        ps.push(a.caja(s * 34, T / 2 + 1, 46, 12, 1, 40, { mat: 'tela_roja' }), a.poliedro([[s * 34 - 6, T / 2 + 0.5, 46], [s * 34 + 6, T / 2 + 0.5, 46], [s * 34, T / 2 + 0.5, 40], [s * 34 - 6, T / 2 + 1.5, 46], [s * 34 + 6, T / 2 + 1.5, 46], [s * 34, T / 2 + 1.5, 40]], { mat: 'tela_roja' }));
        ps.push(a.cilindro(s * 34, T / 2 + 1.6, 72, 3, 0.6, { mat: 'oro', eje: [0, 1, 0] }), a.palo([s * 34 - 7, T / 2 + 1.5, 86], [s * 34 + 7, T / 2 + 1.5, 86], 0.6, { mat: 'bronce' }));
      }
      return ps;
    },
  },
  {
    id: 'des_pozo', nombre: ['Pozo del desierto', 'Desert well'], tema: 'desierto', variantes: ['polea', 'techado', 'seco'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 0, 22, 20, 2)];
      ps.push(a.cilindro(0, 0, 0, 14, 13, { mat: 'arenisca', r1: 13.5 }), a.cilindro(0, 0, 13, 14.5, 2.5, { mat: 'arenisca_lisa', tono: 0.06 }));
      ps.push(a.cilindro(0, 0, 3, 10.5, 14, { mat: 'negro', resta: true }));
      if (v === 'seco') {
        ps.push(a.cilindro(0, 0, 0, 10.5, 9, { mat: 'arena' }));
        ps.push(a.poliedro([[6, 9, 16], [14, 3, 16], [16, 8, 16], [8, 14, 16], [12, 10, 8]], { mat: 'negro', resta: true }));
        ps.push(roca(a, 18, 10, 0, 4, 3, 3, 'arenisca_lisa', 9), roca(a, 14, 16, 0, 3, 3, 2, 'arenisca', 9));
        ps.push(a.cilindro(-16, 10, 3, 3.5, 7, { mat: 'madera_vieja', r1: 4.2, eje: [0.8, 0.5, 0.3] }));
        ps.push(a.palo([-8, 14, 0], [-30, 2, 0.5], 0.5, { mat: 'cuerda' }));
        return ps;
      }
      ps.push(a.cilindro(0, 0, 5, 10.5, 1, { mat: 'agua' }));
      if (v === 'polea') {
        for (const s of [-1, 1]) ps.push(a.caja(s * 12, 0, 13, 3, 3, 26, { mat: 'madera_vieja', incl: s * -3, inclEje: 'y' }));
        ps.push(a.palo([-14, 0, 37], [14, 0, 37], 1.4, { mat: 'madera' }), a.cilindro(-2, 0, 37, 3.2, 4, { mat: 'madera_lisa', eje: [1, 0, 0] }));
        ps.push(a.palo([0, 3, 37], [0, 3, 22], 0.35, { mat: 'cuerda' }));
        ps.push(a.cilindro(0, 3, 16, 3, 6, { mat: 'madera_vieja', r1: 3.6 }), a.cilindro(0, 3, 17, 3.2, 1, { mat: 'hierro' }));
        ps.push(a.palo([0, 3, 22], [-3, 3, 22], 0.3, { mat: 'hierro' }));
      } else {
        for (const [x, y] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) ps.push(a.caja(x, y, 0, 3, 3, 40, { mat: 'arenisca_lisa' }));
        ps.push(a.caja(0, 0, 40, 32, 32, 4, { mat: 'arenisca_lisa', tono: 0.05 }), a.cilindro(0, 0, 44, 12, 4, { mat: 'arenisca_lisa' }), a.elipsoide(0, 0, 48, 12, 12, 10, { mat: 'arenisca_lisa', tono: 0.08 }));
        ps.push(a.palo([0, 0, 40], [0, 0, 24], 0.35, { mat: 'cuerda' }), a.cilindro(0, 0, 18, 3, 6, { mat: 'bronce', r1: 3.5 }));
        jarra(a, ps, 18, 8, 0, 16, 4.5, 'anfora');
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ mercancía y puerto
registrar(
  {
    id: 'des_jarras', nombre: ['Jarras de barro', 'Clay jars'], tema: 'desierto', variantes: ['anfora', 'cantaro', 'grupo', 'rota'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 0, 10, 8, 1.5)];
      const t = (a.r() - 0.5) * 0.12;
      if (v === 'anfora') { ps.push(a.cilindro(0, 0, 0, 5, 2, { mat: 'arenisca_lisa' })); jarra(a, ps, 0, 0, 1, 24 + a.r() * 4, 6, 'anfora', 'desierto_barro', t); }
      if (v === 'cantaro') jarra(a, ps, 0, 0, 0, 18 + a.r() * 3, 6.5, 'cantaro', 'desierto_barro', t);
      if (v === 'grupo') {
        jarra(a, ps, -4, -4, 0, 22, 6.5, 'tinaja', 'desierto_barro', t);
        jarra(a, ps, 6, -3, 0, 18, 5.5, 'cantaro', 'desierto_barro', t + 0.06);
        jarra(a, ps, -5, 7, 0, 13, 4.5, 'cantaro', 'bronce');
        jarra(a, ps, 5, 7, 0, 9, 3.5, 'tinaja', 'desierto_barro', -0.06);
      }
      if (v === 'rota') {
        ps.push(a.cilindro(0, 0, 6.5, 6, 9, { mat: 'desierto_barro', r1: 6.5, eje: [1, 0.4, 0.15] }), a.elipsoide(-7, -2.8, 6.5, 5, 6, 6.5, { mat: 'desierto_barro', giro: 22 }));
        ps.push(a.cilindro(0, 0, 6.5, 5.2, 10, { mat: 'negro', resta: true, eje: [1, 0.4, 0.15] }));
        ps.push(a.poliedro([[2, -9, 0], [9, -3, 0], [8, -8, 0], [5, -6, 7], [10, -5, 9]], { mat: 'negro', resta: true }));
        for (let i = 0; i < 5; i++) ps.push(a.caja(8 + a.r() * 8, -2 + a.r() * 10, 0, 3 + a.r() * 2, 2 + a.r() * 2, 0.8, { mat: 'desierto_barro', giro: a.r() * 180, incl: a.r() * 20 }));
        ps.push(a.elipsoide(10, 3, 0, 6, 4, 0.6, { mat: 'paja', tono: -0.1 }));
      }
      return ps;
    },
  },
  {
    id: 'des_alfombras', nombre: ['Alfombras apiladas', 'Stacked rugs'], tema: 'desierto', variantes: ['pila', 'enrolladas'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const cols = ['tela_roja', 'tela_azul', 'tela_morada', 'tela', 'tela_roja', 'tela_verde'];
      if (v === 'pila') {
        ps.push(a.caja(0, 0, 0, 30, 20, 2, { mat: 'madera_vieja' }));
        for (let i = 0; i < 6; i++) {
          const g = (a.r() - 0.5) * 10, c = cols[(i + Math.floor(a.r() * 3)) % cols.length];
          ps.push(a.caja((a.r() - 0.5) * 2, (a.r() - 0.5) * 2, 2 + i * 2.6, 28, 18, 2.6, { mat: c, giro: g }));
          ps.push(a.caja(0, 0, 2.6 + i * 2.6, 29, 13, 0.9, { mat: cols[(i + 2) % cols.length], giro: g, tono: 0.08 }));
        }
        ps.push(a.caja(4, 9, 0, 22, 6, 0.6, { mat: 'tela_roja', giro: 8 }));
      } else {
        const R = 3.2;
        const pos: [number, number][] = [[-R * 2, 0], [0, 0], [R * 2, 0], [-R, 1], [R, 1], [0, 2]];
        pos.forEach(([y, fila], i) => ps.push(a.cilindro(-15 + (a.r() - 0.5) * 3, y, R + fila * R * 1.72, R, 30, { mat: cols[i % cols.length], eje: [1, 0, 0], tono: (a.r() - 0.5) * 0.1 })));
        pos.forEach(([y, fila], i) => ps.push(a.cilindro(15.1, y, R + fila * R * 1.72, R * 0.6, 0.4, { mat: cols[(i + 3) % cols.length], eje: [1, 0, 0] })));
        ps.push(a.cilindro(18, -10, 0, 3, 36, { mat: 'tela_azul', eje: [0.25, 0.35, 1] }), a.cilindro(22, -6, 0, 2.8, 32, { mat: 'tela_roja', eje: [0.1, 0.4, 1] }));
        ps.push(a.palo([-15, 0, R * 4], [-15, 0, R * 0.5], 0.3, { mat: 'cuerda' }));
      }
      return ps;
    },
  },
  {
    id: 'des_cajas', nombre: ['Cajas de carga', 'Cargo crates'], tema: 'desierto', variantes: ['una', 'pila', 'abierta'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const cajon = (x: number, y: number, z: number, s: number, g: number, tapa = true) => {
        ps.push(a.caja(x, y, z, s, s, s, { mat: 'madera_vieja', giro: g }));
        const ang = (g * PI) / 180, c = Math.cos(ang), sn = Math.sin(ang);
        for (const k of [-1, 1]) for (const j of [-1, 1]) ps.push(a.caja(x + (k * c - j * sn) * (s / 2 - 0.8), y + (k * sn + j * c) * (s / 2 - 0.8), z, 2, 2, s + 0.2, { mat: 'madera', giro: g, tono: -0.06 }));
        if (tapa) ps.push(a.caja(x, y, z + s - 1.8, s + 0.4, s + 0.4, 2, { mat: 'madera', giro: g }));
        else { ps.push(a.caja(x, y, z + 2, s - 2, s - 2, s, { mat: 'negro', giro: g, resta: true }), a.elipsoide(x, y, z + s - 1, s / 2 - 1, s / 2 - 1, 2.5, { mat: 'paja', giro: g })); }
      };
      if (v === 'una') { cajon(0, 0, 0, 18, (a.r() - 0.5) * 20); ps.push(a.elipsoide(-12, 8, 4, 6, 5, 5, { mat: 'tela', giro: 30, tono: -0.18 })); }
      if (v === 'pila') {
        cajon(-8, -6, 0, 18, (a.r() - 0.5) * 8); cajon(10, -4, 0, 16, 10 + a.r() * 10); cajon(-2, 10, 0, 14, -15); cajon(-6, -4, 18, 14, (a.r() - 0.5) * 20);
        ps.push(a.elipsoide(14, 12, 5, 6, 5, 5.5, { mat: 'tela', giro: 30, tono: -0.18 }), a.elipsoide(16, 12, 10.5, 1.6, 1.6, 1.2, { mat: 'cuerda' }));
      }
      if (v === 'abierta') {
        cajon(0, 0, 0, 18, (a.r() - 0.5) * 10, false);
        ps.push(a.caja(-14, 2, 0, 2, 19, 19, { mat: 'madera', incl: -8, inclEje: 'y', giro: 5 }));
        jarra(a, ps, 3, 1, 15, 9, 3.5, 'cantaro', 'bronce');
        jarra(a, ps, 12, 12, 0, 8, 3, 'anfora');
      }
      return ps;
    },
  },
  {
    id: 'des_falua', nombre: ['Faluca', 'Felucca'], tema: 'desierto', variantes: ['agua', 'arena', 'sin_vela'], huella: [6, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const enArena = v === 'arena';
      const roll = enArena ? 0.16 : 0, zb = v === 'agua' ? 1 : 0;
      // inclina en torno al eje x (escorada en la arena)
      const T = (p: V3): V3 => [p[0], p[1] * Math.cos(roll) - p[2] * Math.sin(roll), p[1] * Math.sin(roll) + p[2] * Math.cos(roll) + zb + (enArena ? 2.5 : 0)];
      if (v === 'agua') ps.push(a.elipsoide(0, 0, -1, 62, 24, 2, { mat: 'agua' }));
      else ps.push(duna(a, 0, 0, 56, 22, 3));
      const casco: V3[] = [[46, 0, 18], [-40, 0, 15], [26, 11, 12], [26, -11, 12], [-26, 10.5, 12], [-26, -10.5, 12], [0, 12.5, 12], [0, -12.5, 12], [30, 0, 1], [-28, 0, 2], [0, 5, -1], [0, -5, -1]];
      ps.push(a.poliedro(casco.map(T), { mat: 'madera_vieja' }));
      ps.push(a.poliedro(casco.map((p) => T([p[0] * 0.92, p[1] * 0.85, p[2] < 5 ? 6 : p[2] + 3])), { mat: 'negro', resta: true }));
      ps.push(a.poliedro([[-24, 9, 7], [24, 9, 7], [-24, -9, 7], [24, -9, 7], [-24, 9, 7.6], [24, 9, 7.6], [-24, -9, 7.6], [24, -9, 7.6]].map((p) => T(p as V3)), { mat: 'madera', tono: -0.05 }));
      ps.push(a.poliedro(casco.filter((p) => p[2] >= 12).map((p) => T([p[0], p[1] * 1.02, p[2] - 2])).concat(casco.filter((p) => p[2] >= 12).map((p) => T([p[0], p[1] * 1.02, p[2] - 3.5]))), { mat: 'madera', tono: 0.04 }));
      // carga
      ps.push(a.poliedro([T([-18, -5, 8]), T([-8, -5, 8]), T([-18, 5, 8]), T([-8, 5, 8]), T([-18, -5, 15]), T([-8, -5, 15]), T([-18, 5, 15]), T([-8, 5, 15])], { mat: 'madera_vieja', tono: 0.05 }));
      const sacoC = T([-2, 3, 10]);
      ps.push(a.elipsoide(sacoC[0], sacoC[1], sacoC[2], 5, 4, 3.5, { mat: 'tela' }));
      // mástil y vela latina
      const pie = T([10, 0, 7]), tope = T([10, 0, 84]);
      ps.push(a.palo(pie, tope, 1.5, { mat: 'madera', r1: 1 }));
      if (v !== 'sin_vela') {
        const y0 = T([-34, 0, 22]), y1 = T([44, 0, 98]);
        ps.push(a.palo(y0, y1, 1, { mat: 'madera' }));
        const S = (p: V3, dy: number): V3 => { const q = T([p[0], p[1] + dy, p[2]]); return q; };
        const vela: V3[] = [[-32, 0, 24], [42, 0, 96], [16, 0, 19], [-6, 2.5, 30], [18, 3, 50]];
        ps.push(a.poliedro([...vela.map((p) => S(p, 0.6)), ...vela.map((p) => S(p, -0.6))], { mat: 'tela', tono: 0.04 }));
        for (let i = 0; i < 2; i++) { const k = 0.35 + i * 0.3; ps.push(a.palo(S([-32 + 74 * k, 1.2 + 2 * k * (1 - k) * 4, 24 + 72 * k], 0), S([-32 + 74 * k + (16 + 32 - 74 * k) * 0.5, 2.5, 24 + 72 * k - (24 + 72 * k - 19) * 0.6], 0), 0.35, { mat: 'tela', tono: -0.15 })); }
        ps.push(a.palo(tope, T([44, 0, 18]), 0.3, { mat: 'cuerda' }));
      } else {
        const y0 = T([-30, 6, 13]), y1 = T([40, -4, 13]);
        ps.push(a.palo(y0, y1, 1.2, { mat: 'madera' }), a.cilindro(y0[0] + 30, y0[1] - 4, y0[2] + 1, 3, 40, { mat: 'tela', eje: [1, -0.14, 0] }));
      }
      ps.push(a.palo(tope, T([-40, 0, 16]), 0.3, { mat: 'cuerda' }));
      // timón
      ps.push(a.palo(T([-38, 0, 16]), T([-44, 0, 0]), 1, { mat: 'madera' }), a.caja(...T([-44, 0, 0]), 2, 8, 9, { mat: 'madera_vieja', giro: 90 }));
      return ps;
    },
  },
  {
    id: 'des_muelle', nombre: ['Muelle de tablas', 'Plank dock'], tema: 'desierto', variantes: ['recto', 'punta', 'roto'], huella: [5, 3], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.caja(0, 0, -2, 84, 46, 2, { mat: 'agua' })];
      const L = 84, Wd = 22;
      // pilotes
      for (const x of [-38, -12, 14, 38]) for (const s of [-1, 1]) {
        if (v === 'roto' && x === 38 && s === 1) continue;
        ps.push(a.cilindro(x, s * (Wd / 2 + 1), -2, 2.2, v === 'punta' && x === 38 ? 20 : 12, { mat: 'madera_vieja', tono: -0.05 }));
      }
      // largueros y tablas a lo ancho
      for (const s of [-1, 1]) ps.push(a.caja(0, s * (Wd / 2 - 2), 5, L, 2.5, 2.5, { mat: 'madera', tono: -0.08 }));
      const n = 19;
      for (let i = 0; i < n; i++) {
        if (v === 'roto' && (i === 12 || i === 15 || i > 16)) continue;
        const x = -L / 2 + 2.2 + i * (L / n);
        ps.push(a.caja(x, (a.r() - 0.5) * 1.5, 7.5, 3.8, Wd + (a.r() - 0.5) * 2, 1.4, { mat: 'madera_vieja', giro: (a.r() - 0.5) * 3, tono: (a.r() - 0.5) * 0.12 }));
      }
      if (v === 'roto') { ps.push(a.caja(30, 8, 1, 4, 20, 1.4, { mat: 'madera_vieja', giro: 60, incl: 12 }), a.caja(39, -2, 0, 4, 18, 1.4, { mat: 'madera_vieja', giro: -20, incl: -8 })); }
      if (v === 'punta') {
        ps.push(a.palo([38, Wd / 2 + 1, 18], [38, -Wd / 2 - 1, 18], 0.4, { mat: 'cuerda' }));
        ps.push(a.cilindro(30, -6, 9, 5, 0.6, { mat: 'cuerda', r1: 5 }), a.cilindro(30, -6, 9.6, 3.5, 1, { mat: 'cuerda' }));
        jarra(a, ps, 20, 5, 9, 12, 4, 'tinaja');
      }
      if (v === 'recto') ps.push(a.cilindro(-26, 4, 9, 4, 1.6, { mat: 'cuerda' }));
      return ps;
    },
  },
  {
    id: 'des_columnas', nombre: ['Columnas en ruinas', 'Ruined columns'], tema: 'desierto', variantes: ['entera', 'rota', 'caida', 'par'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 0, 22, 18, 2.5)];
      const col = (x: number, y: number, alto: number, rota: boolean) => {
        ps.push(a.caja(x, y, 0, 18, 18, 5, { mat: 'arenisca', tono: -0.05 }), a.cilindro(x, y, 5, 7.5, 3, { mat: 'arenisca_lisa', r1: 6.4 }));
        let z = 8, i = 0;
        while (z < alto - 0.5) { const h = Math.min(12, alto - z); ps.push(a.cilindro(x, y, z, 6, h - 0.6, { mat: 'arenisca_lisa', r1: 5.8, tono: (i % 2 ? -0.03 : 0.03) + (a.r() - 0.5) * 0.06 })); z += h; i++; }
        if (!rota) {
          ps.push(a.cilindro(x, y, z, 5.8, 5, { mat: 'arenisca_lisa', r1: 8.5, tono: 0.04 }), a.caja(x, y, z + 5, 18, 18, 4, { mat: 'arenisca', tono: 0.05 }));
        } else {
          ps.push(a.poliedro([[x - 7, y - 7, z - 6], [x + 7, y - 7, z - 2], [x - 7, y + 7, z - 4], [x + 7, y + 7, z + 1], [x, y, z + 4]], { mat: 'negro', resta: true }));
        }
        return z;
      };
      if (v === 'entera') col(0, 0, 70 + a.r() * 6, false);
      if (v === 'rota') {
        col(0, 0, 32 + a.r() * 14, true);
        for (let i = 0; i < 2; i++) ps.push(a.cilindro(10 + i * 4, 6 + i * 8, 6, 6, 11, { mat: 'arenisca_lisa', eje: [Math.cos(i * 1.4 + 0.3), Math.sin(i * 1.4 + 0.3), 0], tono: -0.04 }));
        ps.push(roca(a, -12, 10, 0, 4, 3, 3, 'arenisca', 9));
      }
      if (v === 'caida') {
        ps.push(a.caja(-16, -8, 0, 18, 18, 5, { mat: 'arenisca', tono: -0.05 }), a.cilindro(-16, -8, 5, 7.5, 3, { mat: 'arenisca_lisa', r1: 6.4 }), a.cilindro(-16, -8, 8, 6, 6, { mat: 'arenisca_lisa' }));
        for (let i = 0; i < 4; i++) ps.push(a.cilindro(-6 + i * 12.5 + (a.r() - 0.5) * 2, -4 + i * 6 + (a.r() - 0.5) * 3, 6, 6, 11.5, { mat: 'arenisca_lisa', eje: [1, 0.48 + (a.r() - 0.5) * 0.3, 0], tono: (a.r() - 0.5) * 0.08 }));
        ps.push(a.caja(38, 20, 0, 18, 18, 4, { mat: 'arenisca', giro: 30, incl: 15 }));
      }
      if (v === 'par') {
        col(-22, 0, 64, false); col(22, 0, 64, false);
        ps.push(a.caja(0, 0, 73, 66, 16, 10, { mat: 'arenisca' }), a.caja(0, 0.5, 79, 66, 17, 1.5, { mat: 'arenisca_lisa', tono: 0.08 }));
        for (let i = 0; i < 6; i++) ps.push(a.caja(-20 + i * 8, 8.2, 75, 3, 1, 4, { mat: 'negro', resta: true }));
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ santuarios, huesos y muertos
registrar(
  {
    id: 'des_santuario', nombre: ['Santuario del desierto', 'Desert shrine'], tema: 'desierto', variantes: ['sol', 'altar', 'piedras', 'nicho'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 0, 20, 16, 2)];
      if (v === 'sol') {
        ps.push(a.caja(0, 0, 0, 22, 16, 5, { mat: 'arenisca', tono: -0.06 }), a.caja(0, 0, 5, 14, 7, 40, { mat: 'arenisca_lisa' }));
        ps.push(a.poliedro([[-7, -3.5, 45], [7, -3.5, 45], [-7, 3.5, 45], [7, 3.5, 45], [0, -3.5, 52], [0, 3.5, 52]], { mat: 'arenisca_lisa' }));
        ps.push(a.cilindro(0, 3.5, 34, 5.5, 1.2, { mat: 'bronce', eje: [0, 1, 0] }));
        for (let i = 0; i < 8; i++) { const ang = (i / 8) * PI * 2; ps.push(a.palo([Math.cos(ang) * 5.5, 4.2, 39.5 + Math.sin(ang) * 5.5], [Math.cos(ang) * 8, 4.2, 39.5 + Math.sin(ang) * 8], 0.6, { mat: 'bronce' })); }
        for (let i = 0; i < 4; i++) ps.push(a.caja(0, 3.6, 12 + i * 5, 8, 1, 1.4, { mat: 'negro', resta: true }));
        ps.push(a.cilindro(-6, 10, 5, 3, 2, { mat: 'bronce', r1: 4 }), a.esfera(6, 10, 5.5, 1.6, { mat: 'desierto_dorada' }), a.esfera(8, 9, 5.2, 1.4, { mat: 'desierto_dorada' }));
      } else if (v === 'altar') {
        ps.push(a.caja(0, 0, 0, 30, 22, 3, { mat: 'arenisca', tono: -0.08 }), a.caja(0, 0, 3, 24, 15, 13, { mat: 'arenisca_lisa' }), a.caja(0, 0, 16, 27, 18, 3, { mat: 'arenisca', tono: 0.06 }));
        for (let i = 0; i < 5; i++) ps.push(a.caja(-9 + i * 4.5, 7.6, 7, 2, 1, 5, { mat: 'negro', resta: true }));
        ps.push(a.cilindro(0, 0, 19, 5, 3, { mat: 'bronce', r1: 6.5 }), a.cilindro(0, 0, 21.5, 5.5, 0.6, { mat: 'sangre' }));
        for (const [x, y, h] of [[-10, -5, 6], [-9, 4, 4], [10, -4, 5], [11, 5, 3.5]]) ps.push(a.cilindro(x, y, 19, 1.2, h, { mat: 'cera' }), a.elipsoide(x, y, 19 + h + 1, 0.7, 0.7, 1.4, { mat: 'luz_vela' }));
        ps.push(a.elipsoide(4, 10, 16.2, 6, 3, 0.4, { mat: 'sangre' }));
        ps.push(a.cilindro(12, 13, 0, 1, 0.4, { mat: 'cera' }), a.elipsoide(-12, 14, 0, 7, 4, 0.5, { mat: 'sangre', giro: 20 }));
        return { piezas: ps, resplandor: { c: [0, 0, 26], r: 22, color: '#ffc870' } };
      } else if (v === 'piedras') {
        for (let i = 0; i < 3; i++) {
          const ang = (i / 3) * PI * 2 + 0.6, x = Math.cos(ang) * 11, y = Math.sin(ang) * 9, h = 26 + a.r() * 14;
          ps.push(a.poliedro([[x - 5, y - 4, 0], [x + 5, y - 4, 0], [x - 5, y + 4, 0], [x + 5, y + 4, 0], [x - 4 + a.r(), y - 3, h - 1], [x + 4, y - 3, h - 3], [x - 4, y + 3, h], [x + 3.5, y + 3, h - 2], [x, y, h + 2]], { mat: 'roca', tono: (a.r() - 0.5) * 0.1 }));
          ps.push(a.cilindro(x, y, h * 0.6, 5.4, 2, { mat: 'cuerda', r1: 5.2 }));
          ps.push(a.caja(x + 2, y + 3, h * 0.6 - 10, 2, 0.5, 11, { mat: i % 2 ? 'tela_roja' : 'tela', incl: 5 }));
        }
        ps.push(a.esfera(0, 0, 4, 4, { mat: 'hueso' }), a.caja(0, 2.5, 3, 4, 2, 1.6, { mat: 'negro', resta: true }));
        ps.push(roca(a, 0, 0, 0, 6, 5, 2, 'arenisca', 8));
        ps.push(a.esfera(0, 0, 5, 3.6, { mat: 'hueso' }), a.esfera(-1.3, 3, 5.6, 0.9, { mat: 'negro' }), a.esfera(1.3, 3, 5.6, 0.9, { mat: 'negro' }));
      } else {
        ps.push(a.caja(0, 0, 0, 30, 22, 4, { mat: 'arenisca', tono: -0.06 }), a.caja(0, -2, 4, 24, 16, 34, { mat: 'arenisca_lisa' }));
        ps.push(a.cilindro(0, -2, 38, 9, 4, { mat: 'arenisca_lisa', tono: 0.04 }), a.elipsoide(0, -2, 42, 9, 9, 9, { mat: 'arenisca_lisa', tono: 0.08 }));
        arco(a, ps, 0, 6, 10, 12, 22, 10);
        ps.push(a.cilindro(0, 0, 10, 2.5, 2, { mat: 'bronce' }), a.elipsoide(0, 0, 15, 2, 1.8, 3.5, { mat: 'bronce' }), a.esfera(0, 0, 20, 1.8, { mat: 'bronce' }));
        ps.push(a.elipsoide(0, 7, 4.8, 2.6, 1.8, 0.9, { mat: 'desierto_barro' }), a.elipsoide(1.6, 7, 6, 0.6, 0.6, 1.2, { mat: 'luz_vela' }));
        for (let i = 0; i < 3; i++) ps.push(a.caja(-12 + i * 2, 8 + i * 3, 0, 3, 3, 1.4, { mat: 'tela_roja', giro: a.r() * 90 }));
        return { piezas: ps, resplandor: { c: [1, 7, 7], r: 14, color: '#ffc870' } };
      }
      return ps;
    },
  },
  {
    id: 'des_esqueleto', nombre: ['Esqueleto de bestia', 'Beast skeleton'], tema: 'desierto', variantes: ['costillas', 'craneo', 'enterrado'], huella: [4, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const enterrado = v === 'enterrado';
      const craneo = (x: number, y: number, z: number, g: number) => {
        const c = Math.cos((g * PI) / 180), s = Math.sin((g * PI) / 180);
        ps.push(a.elipsoide(x, y, z, 7, 5, 4.5, { mat: 'hueso', giro: g }), a.elipsoide(x + c * 7, y + s * 7, z - 1, 6, 3.2, 3, { mat: 'hueso', giro: g, tono: 0.04 }));
        for (const k of [-1, 1]) {
          ps.push(a.esfera(x + c * 2 - s * k * 3.6, y + s * 2 + c * k * 3.6, z + 1.5, 1.4, { mat: 'negro' }));
          const b: V3 = [x - c * 2 - s * k * 4, y - s * 2 + c * k * 4, z + 2];
          const m: V3 = [b[0] - s * k * 7 - c * 3, b[1] + c * k * 7 - s * 3, b[2] + 5];
          const t: V3 = [m[0] + c * 4 - s * k * 2, m[1] + s * 4 + c * k * 2, m[2] + 7];
          ps.push(a.palo(b, m, 1.6, { mat: 'hueso', r1: 1.1, tono: -0.05 }), a.palo(m, t, 1.1, { mat: 'hueso', r1: 0.3, tono: -0.05 }));
        }
      };
      if (v === 'craneo') {
        ps.push(duna(a, 0, 0, 14, 10, 1.5));
        craneo(-2, 0, 4.5, 20 + a.r() * 30);
        ps.push(a.palo([8, -8, 1], [18, -2, 1.2], 1.2, { mat: 'hueso' }), a.esfera(8, -8, 1.4, 1.8, { mat: 'hueso' }));
        return ps;
      }
      if (enterrado) ps.push(duna(a, 0, 0, 34, 16, 4));
      // espinazo curvo a lo largo de x
      const sp: V3[] = [];
      for (let i = 0; i <= 10; i++) { const x = -26 + i * 5; sp.push([x, Math.sin(i * 0.5) * 2, enterrado ? 6 + Math.sin(i / 10 * PI) * 4 : 12 + Math.sin(i / 10 * PI) * 5]); }
      for (let i = 0; i < sp.length; i++) { ps.push(a.esfera(sp[i][0], sp[i][1], sp[i][2], 1.9, { mat: 'hueso' })); if (i) ps.push(a.palo(sp[i - 1], sp[i], 1.2, { mat: 'hueso' })); }
      // costillas: arcos de dos tramos a cada lado
      for (let i = 2; i < 9; i++) {
        if (enterrado && i % 2) continue;
        const p = sp[i], L = 14 - Math.abs(i - 5) * 1.5;
        for (const s of [-1, 1]) {
          const m: V3 = [p[0] + 1, p[1] + s * L * 0.6, p[2] + 1];
          const b: V3 = [p[0] + 2, p[1] + s * L * 0.85, Math.max(0.5, p[2] - L * 0.9)];
          if (!(a.r() < 0.12)) ps.push(a.palo(p, m, 0.9, { mat: 'hueso' }), a.palo(m, b, 0.9, { mat: 'hueso', r1: 0.5 }));
        }
      }
      if (!enterrado) {
        craneo(32, 3, 5, -15);
        for (let i = 0; i < 4; i++) ps.push(a.palo([-20 + i * 14 + a.r() * 4, 14 + a.r() * 4, 1.2], [-10 + i * 12 + a.r() * 4, 20 + a.r() * 4, 1.2], 1.2, { mat: 'hueso', r1: 0.9 }));
        ps.push(a.elipsoide(-28, 2, 4, 6, 8, 3, { mat: 'hueso', tono: -0.05 }));
      } else { ps.push(a.elipsoide(28, 3, 1, 9, 7, 3.5, { mat: 'arena' })); craneo(30, 5, 2.5, -10); ps.push(a.elipsoide(31, 5, -1, 9, 8, 3, { mat: 'arena' })); }
      return ps;
    },
  },
  {
    id: 'des_empalado', nombre: ['Cadáver en la estaca', 'Corpse on a stake'], tema: 'desierto', variantes: ['envuelto', 'vacia', 'buitres'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [duna(a, 0, 0, 12, 10, 2.5)];
      const inc = (a.r() - 0.5) * 8;
      for (let i = 0; i < 6; i++) { const ang = (i / 6) * PI * 2; ps.push(roca(a, Math.cos(ang) * 5, Math.sin(ang) * 5, 0, 3, 3, 3, 'roca', 8)); }
      ps.push(a.caja(0, 0, 0, 3.4, 3.4, 78, { mat: 'madera_vieja', incl: inc }));
      const top = 78 * Math.cos((inc * PI) / 180), dy = -78 * Math.sin((inc * PI) / 180);
      const k = (z: number) => dy * (z / top);
      ps.push(a.caja(0, k(60), 60, 30, 3, 3, { mat: 'madera_vieja', incl: inc }));
      if (v === 'vacia') {
        for (const s of [-1, 1]) ps.push(a.palo([s * 12, k(61), 61], [s * 12, k(52) + 1, 50], 0.4, { mat: 'cuerda' }));
        ps.push(a.palo([0, k(30) + 1.8, 30], [1, k(26) + 2, 18], 0.4, { mat: 'cuerda' }));
        ps.push(a.elipsoide(4, 6, 0, 6, 4, 0.5, { mat: 'sangre' }), a.caja(-6, 7, 0, 10, 6, 0.8, { mat: 'tela', giro: 30, tono: -0.1 }));
        return ps;
      }
      // el cuerpo envuelto en tela, atado con cuerdas
      const yb = k(40) + 3.4;
      ps.push(a.elipsoide(0, yb, 40, 5.5, 3.5, 17, { mat: 'tela', tono: -0.04 }), a.elipsoide(0, yb + 0.4, 25, 4, 3, 7, { mat: 'tela', tono: -0.08 }));
      ps.push(a.elipsoide(0, k(60) + 3.6, 60, 3.4, 3.2, 4.2, { mat: 'tela', tono: 0.02 }));
      for (const s of [-1, 1]) ps.push(a.palo([s * 4, yb, 53], [s * 12, k(60) + 2.5, 60], 1.8, { mat: 'tela', r1: 1.4 }));
      for (const z of [28, 38, 48, 56]) ps.push(a.cilindro(0, yb, z, 5.2 - Math.abs(z - 40) * 0.08, 1, { mat: 'cuerda' }));
      ps.push(a.elipsoide(0.8, yb + 3, 44, 2.4, 0.6, 5, { mat: 'sangre', tono: 0.05 }), a.elipsoide(3, 7, 0, 6, 4, 0.5, { mat: 'sangre' }));
      if (v === 'buitres') {
        for (const s of [-1, 1]) {
          const x = s * 13, z = 63;
          ps.push(a.elipsoide(x, k(z), z + 4, 3, 2.4, 4, { mat: 'negro', tono: 0.05 }), a.esfera(x + s * 1, k(z) + 1.5, z + 9, 1.6, { mat: 'carne', tono: -0.1 }), a.palo([x + s * 1, k(z) + 1.5, z + 9], [x + s * 1.5, k(z) + 4, z + 8], 0.6, { mat: 'hueso' }));
          ps.push(a.poliedro([[x, k(z) - 2, z + 7], [x, k(z) - 2, z + 2], [x - s * 6, k(z) - 6, z + 10], [x - s * 3, k(z) - 4, z + 2], [x, k(z) - 1, z + 7]], { mat: 'negro' }));
        }
      }
      return ps;
    },
  },
);
