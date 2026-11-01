import { registrar, type Arma, type ObjetoDef, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, type Escena } from '../render';

/**
 * Templos de la selva: pirámides escalonadas, muros con bandas de glifos, columnas de serpiente, ídolos, jaguares de
 * piedra, altares, escalinatas, puertas con dintel, pedestales con orbe, braseros, calzadas y ruinas con musgo. Diseños
 * originales de inspiración mesoamericana, gastados por la humedad.
 */

const junta = (v: number, paso: number, grosor = 1) => { const m = ((v % paso) + paso) % paso; return m < grosor ? 1 : 0; };
function bloques(largo: number, alto: number) {
  return (p: V3, n: V3) => {
    const fila = Math.floor(p[2] / alto);
    if (Math.abs(n[2]) > 0.7) {
      const corre = (Math.floor(p[1] / alto) % 2) * largo * 0.5;
      return junta(p[1], alto) || junta(p[0] + corre, largo) ? -0.3 : (ruido(Math.floor((p[0] + corre) / largo) * 3.1, p[1] / alto, 7) - 0.5) * 0.16;
    }
    const corre = (fila % 2) * largo * 0.5;
    const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
    if (junta(p[2], alto)) return -0.32;
    if (junta(u + corre, largo)) return -0.28;
    const b = Math.floor((u + corre) / largo);
    // manchas de humedad y musgo que bajan
    const hum = ruido(u * 0.08, p[2] * 0.03, 11) > 0.62 ? -0.12 : 0;
    return (ruido(b * 1.7, fila * 2.3, 3) - 0.5) * 0.2 + hum;
  };
}
MATERIALES.templo_selva_caliza = { rampa: ['#13140f', '#212319', '#313426', '#434635', '#565944', '#6a6c55', '#7f8068'], ruido: 0.3, escala: 0.18, patron: bloques(20, 10) };
MATERIALES.templo_selva_lisa = { rampa: ['#13140f', '#212319', '#313426', '#434635', '#565944', '#6a6c55', '#7f8068'], ruido: 0.3, escala: 0.15, patron: (p) => (ruido(p[0] * 0.06, p[1] * 0.06, p[2] * 0.04) > 0.64 ? -0.12 : 0) };
MATERIALES.templo_selva_musgo = { rampa: ['#0b1109', '#141d10', '#1d2a17', '#28381e', '#334626', '#3f552f'], ruido: 0.6, escala: 0.5 };
MATERIALES.templo_selva_follaje = { rampa: ['#060b07', '#0c150d', '#132013', '#1a2c19', '#223920', '#2c4728', '#375632'], ruido: 0.55, escala: 0.45, patron: (p) => (ruido(p[0] * 0.55, p[1] * 0.55, p[2] * 0.55) > 0.68 ? -0.35 : (ruido(p[0] * 1.7, p[1] * 1.7, p[2] * 1.7) - 0.5) * 0.3) };
MATERIALES.templo_selva_jade = { rampa: ['#05110c', '#0a1d15', '#11291f', '#18372a', '#214636', '#2b5643', '#386852'], ruido: 0.25, escala: 0.15, brillo: 0.55 };

const PI2 = Math.PI * 2;
const deg = (r: number) => (r * 180) / Math.PI;
const jit = (a: Arma, k: number) => (a.r() - 0.5) * 2 * k;
const frente = (phi: number, R: number, lado: number, z: number, cx = 0, cy = 0): V3 => [cx + Math.cos(phi) * R - Math.sin(phi) * lado, cy + Math.sin(phi) * R + Math.cos(phi) * lado, z];
const C = 'templo_selva_caliza', L = 'templo_selva_lisa', M = 'templo_selva_musgo';

/** Gira todas las piezas `g` grados alrededor del eje vertical (el origen queda en su lugar). */
function rotarZ(ps: Pieza[], g: number): Pieza[] {
  const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180);
  const R = (v: V3): V3 => [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, d]) => [R(n), d] as [V3, number]), pts: p.pts.map(R) };
    if (p.k === 'cono') return { ...p, o: R(p.o), ex: R(p.ex), ey: R(p.ey), ez: R(p.ez) };
    if (p.k === 'elip') return { ...p, c: R(p.c), ex: R(p.ex), ey: R(p.ey), ez: R(p.ez) };
    return p;
  });
}
/** Agrega a cada variante su gemela a lo largo del eje y (`<variante>_y`): las mismas piezas giradas -90°. */
const EJE_Y = ['tem_muro_glifos', 'tem_puerta', 'tem_calzada', 'tem_muro_musgo', 'tem_escalinata'];
const conEjes = (...ds: ObjetoDef[]) => ds.map((d) => (EJE_Y.includes(d.id) ? dosEjes(d) : d));
function dosEjes(d: ObjetoDef): ObjetoDef {
  const hp = d.huellaPor ? Object.fromEntries(Object.entries(d.huellaPor).flatMap(([k, [w, h]]) => [[k, [w, h]], [k + '_y', [h, w]]])) as Record<string, [number, number]> : undefined;
  return {
    ...d, huellaPor: hp, variantes: [...d.variantes, ...d.variantes.map((v) => v + '_y')],
    armar: (v, f, a) => {
      if (!v.endsWith('_y')) return d.armar(v, f, a);
      const r = d.armar(v.slice(0, -2), f, a);
      if (Array.isArray(r)) return rotarZ(r, -90);
      const e: Escena = { ...r, piezas: rotarZ(r.piezas, -90) };
      if (r.resplandor) { const [x, y, z] = r.resplandor.c; e.resplandor = { ...r.resplandor, c: [y, -x, z] }; }
      return e;
    },
  };
}
/**
 * Banda de glifos tallada en una cara: `cara` 'y' es la cara +y (corre a lo largo de x, en y = c), 'x' la cara +x.
 * Sobresale un poco y tiene cartuchos con huecos al azar.
 */
function banda(a: Arma, ps: Pieza[], cara: 'x' | 'y', c: number, desde: number, hasta: number, z: number, h: number, paso = 9) {
  const largo = hasta - desde, m = (desde + hasta) / 2;
  ps.push(cara === 'y' ? a.caja(m, c, z, largo, 3, h, { mat: L, tono: 0.03 }) : a.caja(c, m, z, 3, largo, h, { mat: L, tono: 0.03 }));
  const n = Math.max(1, Math.floor(largo / paso));
  for (let i = 0; i < n; i++) {
    const u = desde + (i + 0.5) * (largo / n), w = Math.min(paso - 2.5, h - 2.5);
    const at = (du: number, dz: number, ww: number, hh: number, dd: number, o: { mat: string; tono?: number; resta?: boolean }) =>
      ps.push(cara === 'y' ? a.caja(u + du, c + 1.5, z + dz, ww, dd, hh, o) : a.caja(c + 1.5, u + du, z + dz, dd, ww, hh, o));
    at(0, 1.2, w, w, 1.6, { mat: L, tono: 0.09 });
    const k = Math.floor(a.r() * 4);
    if (k === 0) { at(0, 1.2 + w * 0.3, w * 0.4, w * 0.4, 2.6, { mat: L, resta: true }); }
    else if (k === 1) { at(-w * 0.2, 1.2 + w * 0.2, w * 0.25, w * 0.6, 2.6, { mat: L, resta: true }); at(w * 0.2, 1.2 + w * 0.2, w * 0.25, w * 0.6, 2.6, { mat: L, resta: true }); }
    else if (k === 2) { at(0, 1.2 + w * 0.55, w * 0.7, w * 0.2, 2.6, { mat: L, resta: true }); at(0, 1.2 + w * 0.15, w * 0.3, w * 0.3, 2.6, { mat: L, resta: true }); }
    else { at(-w * 0.18, 1.2 + w * 0.5, w * 0.25, w * 0.25, 2.6, { mat: L, resta: true }); at(w * 0.18, 1.2 + w * 0.15, w * 0.25, w * 0.25, 2.6, { mat: L, resta: true }); }
  }
}
function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, f: number, mat = 'fuego') {
  const fr = (k: number) => Math.sin((f / 6) * PI2 + k * 2.1);
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * PI2 + f * 0.5;
    ps.push(a.cilindro(x + Math.cos(ang) * s * 0.5, y + Math.sin(ang) * s * 0.5, z, s * (0.95 - k * 0.12), s * (2.3 + fr(k) * 0.7 + k * 0.5), { mat, r1: 0.25 }));
  }
  ps.push(a.elipsoide(x, y, z + s * 0.3, s * 1.2, s * 1.2, s * 0.6, { mat, tono: 0.2 }));
}
function craneo(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, phi = Math.PI / 4) {
  ps.push(a.elipsoide(x, y, z, s, s * 0.95, s * 0.95, { mat: 'hueso', giro: deg(phi) }));
  const q = (R: number, l: number, zz: number) => frente(phi, R, l, z + zz, x, y);
  const m = q(s * 0.55, 0, -s * 0.75); ps.push(a.caja(m[0], m[1], m[2], s * 0.9, s, s * 0.5, { mat: 'hueso', giro: deg(phi) + 90 }));
  for (const l of [-0.38, 0.38]) { const e = q(s * 0.72, l * s, s * 0.02); ps.push(a.esfera(e[0], e[1], e[2], s * 0.3, { mat: 'negro' })); }
}
/** Escombros: bloques sueltos alrededor de un punto. */
function escombros(a: Arma, ps: Pieza[], x: number, y: number, r: number, n: number, mat = C) {
  for (let i = 0; i < n; i++) {
    const g = a.r() * PI2, d = a.r() * r, s = 4 + a.r() * 6;
    ps.push(a.caja(x + Math.cos(g) * d, y + Math.sin(g) * d, 0, s * 1.4, s, s * 0.8, { mat, giro: a.r() * 90, incl: jit(a, 12), tono: jit(a, 0.08) }));
  }
}
/** Musgo sobre una superficie horizontal. */
function musgo(a: Arma, ps: Pieza[], x: number, y: number, z: number, r: number, n = 3) {
  for (let i = 0; i < n; i++) ps.push(a.elipsoide(x + jit(a, r), y + jit(a, r), z, 4 + a.r() * 4, 3 + a.r() * 3, 1.6, { mat: M, giro: a.r() * 180 }));
}
/** Liana que cae por un borde: de p hacia abajo `largo`. */
function liana(a: Arma, ps: Pieza[], p: V3, largo: number, sale: V3 = [0, 1, 0]) {
  const q: V3 = [p[0] + sale[0] * 2 + jit(a, 1.5), p[1] + sale[1] * 2 + jit(a, 1.5), Math.max(1, p[2] - largo)];
  ps.push(a.palo(p, q, 0.9, { mat: 'templo_selva_musgo', r1: 0.7 }));
  for (let k = 1; k <= 3; k++) { const t = k / 4; ps.push(a.elipsoide(p[0] + (q[0] - p[0]) * t + sale[0], p[1] + (q[1] - p[1]) * t + sale[1], p[2] + (q[2] - p[2]) * t, 2, 2, 1.6, { mat: 'templo_selva_follaje', tono: 0.08 })); }
}

registrar(...conEjes(
  // ------------------------------------------------------------------ pirámide escalonada
  {
    id: 'tem_piramide', nombre: ['Pirámide escalonada', 'Stepped pyramid'], tema: 'templo_selva', variantes: ['entera', 'en_ruinas'], huella: [15, 15], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ruina = v === 'en_ruinas';
      const tamanos = [224, 186, 148, 112, 78], hT = 24;
      tamanos.forEach((s, i) => {
        const z0 = i * hT, h = s / 2;
        // talud (inclinado) y tablero (vertical, con cornisa)
        ps.push(a.poliedro([[-h, -h, z0], [h, -h, z0], [-h, h, z0], [h, h, z0], [-h + 6, -h + 6, z0 + 14], [h - 6, -h + 6, z0 + 14], [-h + 6, h - 6, z0 + 14], [h - 6, h - 6, z0 + 14]], { mat: C, tono: -0.02 }));
        ps.push(a.caja(0, 0, z0 + 14, s - 12, s - 12, 8, { mat: C, tono: 0.02 }), a.caja(0, 0, z0 + 21, s - 10, s - 10, 3, { mat: L, tono: 0.07 }));
        // glifos en el tablero, en las caras que se ven, a los lados de la escalera
        if (i < 3) {
          banda(a, ps, 'y', h - 6, -h + 14, -28, z0 + 15, 6, 24);
          banda(a, ps, 'y', h - 6, 28, h - 14, z0 + 15, 6, 24);
          banda(a, ps, 'x', h - 6, -h + 14, h - 14, z0 + 15, 6, 30);
        }
      });
      const top = tamanos.length * hT;
      // escalinata al frente (+y)
      const nE = 18, yb = 116, yt = tamanos[tamanos.length - 1] / 2;
      for (let i = 0; i < nE; i++) {
        if (ruina && (i === 5 || i === 6 || i === 12)) { ps.push(a.caja(jit(a, 8), yb - (yb - yt) * (i / nE) - 4, (top * i) / nE, 30, 6, 2, { mat: C, tono: -0.1, giro: jit(a, 6) })); continue; }
        const y = yb - (yb - yt) * (i / nE), z = (top * i) / nE;
        ps.push(a.caja(0, y / 2, z, 40, y, top / nE + 0.2, { mat: L, tono: i % 2 ? -0.02 : 0.03 }));
      }
      for (const s of [-1, 1]) {
        ps.push(a.poliedro([[s * 20, yb + 2, 0], [s * 26, yb + 2, 0], [s * 20, yb + 2, 9], [s * 26, yb + 2, 9], [s * 20, yt, top + 3], [s * 26, yt, top + 3], [s * 20, yt - 2, top - 2], [s * 26, yt - 2, top - 2]], { mat: C, tono: 0.04 }));
        // cabezas de serpiente al pie de la escalera
        const hx = s * 23, hy = yb + 6;
        ps.push(a.elipsoide(hx, hy, 6, 5, 8, 5, { mat: L, tono: 0.06 }), a.caja(hx, hy + 5, 1, 9, 6, 4, { mat: L, tono: 0.02 }));
        ps.push(a.esfera(hx - 3, hy + 3, 8.5, 1.4, { mat: 'negro' }), a.esfera(hx + 3, hy + 3, 8.5, 1.4, { mat: 'negro' }));
        for (const dx of [-2.5, 2.5]) ps.push(a.poliedro([[hx + dx - 0.8, hy + 7.5, 5], [hx + dx + 0.8, hy + 7.5, 5], [hx + dx, hy + 8, 2]], { mat: 'hueso' }));
      }
      // santuario en la cima
      const zs = top;
      ps.push(a.caja(0, -4, zs, 54, 44, 4, { mat: L }));
      ps.push(a.caja(0, -6, zs + 4, 48, 36, 30, { mat: C }));
      for (const x of [-14, 0, 14]) ps.push(a.caja(x, 12.5, zs + 4, 9, 6, 20, { mat: C, resta: true }), a.caja(x, 10, zs + 4, 8.5, 1, 19.5, { mat: 'negro' }));
      ps.push(a.caja(0, -6, zs + 34, 54, 42, 4, { mat: L, tono: 0.05 }));
      banda(a, ps, 'y', 15, -26, 26, zs + 26, 7, 10);
      banda(a, ps, 'x', 24, -22, 10, zs + 26, 7, 10);
      if (!ruina) {
        ps.push(a.poliedro([[-24, -26, zs + 38], [24, -26, zs + 38], [-24, 14, zs + 38], [24, 14, zs + 38], [-18, -16, zs + 48], [18, -16, zs + 48], [-18, 4, zs + 48], [18, 4, zs + 48]], { mat: C }));
        // crestería calada
        ps.push(a.caja(0, -6, zs + 48, 40, 5, 26, { mat: L }));
        for (const x of [-12, 0, 12]) ps.push(a.caja(x, -6, zs + 54, 6, 8, 12, { mat: L, resta: true }));
        ps.push(a.caja(0, -6, zs + 74, 44, 7, 3, { mat: L, tono: 0.06 }));
      } else {
        ps.push(a.poliedro([[-24, -26, zs + 38], [24, -26, zs + 38], [-24, 14, zs + 38], [24, 14, zs + 38], [-18, -16, zs + 46], [8, -16, zs + 48], [-18, 4, zs + 44]], { mat: C }));
        ps.push(a.caja(-8, -6, zs + 44, 22, 5, 16, { mat: L, incl: 6 }), a.caja(-12, -6, zs + 50, 5, 8, 8, { mat: L, resta: true }));
      }
      if (ruina) {
        // bordes rotos, escombros y la selva que lo cubre
        for (let i = 0; i < 7; i++) {
          const t = Math.floor(a.r() * 4), h = tamanos[t] / 2, s = a.r() < 0.5 ? 1 : -1;
          const x = a.r() < 0.5 ? h * s : jit(a, h * 0.8), y = x === h * s ? jit(a, h * 0.8) : h;
          if (Math.abs(x) < 34 && y > 0) continue;
          ps.push(a.caja(x, y, t * hT + 4, 30 + a.r() * 20, 30 + a.r() * 20, 40, { mat: C, resta: true, giro: a.r() * 90 }));
        }
        escombros(a, ps, 90, 100, 26, 7);
        escombros(a, ps, 108, -20, 24, 6);
        escombros(a, ps, -60, 112, 18, 5);
        for (let i = 0; i < 7; i++) { const t = Math.floor(a.r() * 4), h = tamanos[t] / 2 - 4, s = a.r() < 0.5; const x = s ? jit(a, h) : h, y = s ? h : jit(a, h); if (Math.abs(x) < 30 && y === h) continue; ps.push(a.elipsoide(x, y, t * hT + 24, 10 + a.r() * 8, 10 + a.r() * 8, 5 + a.r() * 3, { mat: 'templo_selva_follaje', tono: jit(a, 0.06) - 0.04 })); }
        for (let i = 0; i < 4; i++) { const t = Math.floor(a.r() * 4), h = tamanos[t] / 2 - 8; musgo(a, ps, h * 0.6 + jit(a, h * 0.3), h, t * hT + 24, 6, 1); musgo(a, ps, h, -h * 0.5 + jit(a, h * 0.4), t * hT + 24, 6, 1); }
        for (let i = 0; i < 5; i++) {
          const t = Math.floor(a.r() * 4), h = tamanos[t] / 2 - 6;
          const p: V3 = a.r() < 0.5 ? [jit(a, h * 0.9), h + 1, t * hT + 24] : [h + 1, jit(a, h * 0.9), t * hT + 24];
          if (Math.abs(p[0]) < 30 && p[1] > h) continue;
          liana(a, ps, p, 14 + a.r() * 18, p[1] > h ? [0, 1, 0] : [1, 0, 0]);
        }
        // un árbol que creció en una grada
        const tx = 70, ty = -40, tz = 2 * hT;
        ps.push(a.cilindro(tx, ty, tz, 5, 4, { mat: 'corteza', r1: 3 }), a.palo([tx, ty, tz], [tx + 4, ty + 2, tz + 50], 3, { mat: 'corteza', r1: 2 }));
        for (let i = 0; i < 4; i++) { const g = a.r() * PI2; ps.push(a.palo([tx, ty, tz + 1], [tx + Math.cos(g) * 14, ty + Math.sin(g) * 14, tz - 6], 1.4, { mat: 'corteza', r1: 0.8 })); }
        for (let i = 0; i < 6; i++) { const g = a.r() * PI2; ps.push(a.elipsoide(tx + 4 + Math.cos(g) * 12, ty + 2 + Math.sin(g) * 12, tz + 48 + jit(a, 5), 12, 12, 7, { mat: 'templo_selva_follaje', tono: jit(a, 0.08) })); }
        ps.push(a.elipsoide(tx + 4, ty + 2, tz + 56, 14, 14, 8, { mat: 'templo_selva_follaje', tono: 0.05 }));
      } else {
        // braseros apagados a los lados de la puerta y estandartes
        for (const s of [-1, 1]) ps.push(a.cilindro(s * 30, 22, zs, 3.5, 8, { mat: L, r1: 5 }), a.cilindro(s * 30, 22, zs + 8, 4.4, 0.6, { mat: 'negro' }));
        for (const x of [-60, 60]) ps.push(a.caja(x, 72, hT * 2 + 3, 10, 1, 16, { mat: 'tela_roja', tono: -0.05 }));
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ muro con glifos
  {
    id: 'tem_muro_glifos', nombre: ['Muro de glifos', 'Glyph wall'], tema: 'templo_selva', variantes: ['entero', 'roto', 'esquina'], huella: [5, 2], huellaPor: { esquina: [5, 5] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const H = 92;
      ps.push(a.caja(0, 0, 0, 84, 20, 8, { mat: L, tono: -0.03 }));
      ps.push(a.caja(0, 0, 8, 80, 14, H - 8, { mat: C }));
      if (v === 'esquina') ps.push(a.caja(-33, -27, 0, 20, 60, 8, { mat: L, tono: -0.03 }), a.caja(-33, -27, 8, 14, 56, H - 8, { mat: C }));
      banda(a, ps, 'y', 7, -38, 38, 48, 9, 10);
      banda(a, ps, 'y', 7, -38, 38, 20, 6, 8);
      if (v === 'esquina') banda(a, ps, 'x', -26, -54, -8, 48, 9, 10);
      ps.push(a.caja(0, 0, H, 86, 18, 5, { mat: L, tono: 0.06 }));
      if (v === 'esquina') ps.push(a.caja(-33, -27, H, 18, 58, 5, { mat: L, tono: 0.06 }));
      // almenas escalonadas
      const almenas = v === 'esquina' ? [-30, -10, 10, 30] : [-30, -10, 10, 30];
      for (const x of almenas) ps.push(a.caja(x, 0, H + 5, 12, 8, 6, { mat: L }), a.caja(x, 0, H + 11, 6, 6, 6, { mat: L, tono: 0.04 }));
      if (v === 'roto') {
        ps.push(a.poliedro([[6, -12, 60], [44, -12, 50], [44, 12, 50], [6, 12, 60], [20, -12, 120], [44, -12, 120], [20, 12, 120], [44, 12, 120]], { mat: C, resta: true }));
        ps.push(a.caja(-40, 0, 70, 14, 20, 40, { mat: C, resta: true, giro: 20 }));
        ps.push(a.caja(12, 7, 18, 3, 3, 30, { mat: C, resta: true, giro: 20, incl: 15 }));
        escombros(a, ps, 22, 22, 16, 6);
        musgo(a, ps, 26, 0, 52, 8, 3);
      }
      for (let i = 0; i < 3; i++) liana(a, ps, [-30 + a.r() * 60, 9, H + 4], 20 + a.r() * 30);
      musgo(a, ps, jit(a, 20), 0, H + 5, 20, 3);
      return ps;
    },
  },
  // ------------------------------------------------------------------ columna de serpiente
  {
    id: 'tem_columna_serpiente', nombre: ['Columna de serpiente', 'Serpent column'], tema: 'templo_selva', variantes: ['entera', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const phi = (60 * Math.PI) / 180, G = deg(phi);
      const q = (R: number, l: number, z: number) => frente(phi, R, l, z);
      ps.push(a.caja(0, 0, 0, 30, 30, 4, { mat: L, giro: G }));
      // la cabeza en la base, con las fauces abiertas
      const hc = q(10, 0, 4);
      ps.push(a.elipsoide(hc[0], hc[1], 10, 14, 10, 7, { mat: L, giro: G, tono: 0.04 }));
      ps.push(a.poliedro([q(8, -9, 10), q(8, 9, 10), q(24, -6, 12), q(24, 6, 12), q(22, -5, 18), q(22, 5, 18), q(8, -8, 18), q(8, 8, 18)], { mat: L, tono: 0.06 }));
      ps.push(a.poliedro([q(8, -8, 4), q(8, 8, 4), q(22, -6, 4), q(22, 6, 4), q(20, -5, 8), q(20, 5, 8), q(8, -8, 8), q(8, 8, 8)], { mat: L, tono: 0.02 }));
      ps.push(a.caja(q(17, 0, 8)[0], q(17, 0, 8)[1], 8, 8, 10, 3.5, { mat: 'negro', giro: G }));
      for (const l of [-4, 4]) { const f = q(22.5, l, 7.5); ps.push(a.poliedro([[f[0], f[1], 12], [f[0] + 1, f[1], 12], [f[0], f[1] + 1, 12], [f[0] + 0.5, f[1] + 0.5, 7]], { mat: 'hueso' })); }
      for (const l of [-5.5, 5.5]) { const e = q(16, l, 17); ps.push(a.esfera(e[0], e[1], e[2], 1.8, { mat: 'negro' }), a.caja(e[0], e[1], e[2] + 1.5, 5, 2.5, 1.6, { mat: L, giro: G, tono: 0.08 })); }
      // plumas sobre la nuca
      for (let k = -2; k <= 2; k++) { const b = q(0, k * 4, 14); ps.push(a.poliedro([b, [b[0], b[1], b[2] + 2], q(-6, k * 5.5, 22), q(-5, k * 5.5 + 1.5, 21)], { mat: L, tono: -0.02 })); }
      // el cuerpo: fuste con anillos de escamas
      const H = v === 'rota' ? 46 : 84;
      ps.push(a.cilindro(0, 0, 4, 8, H - 4, { mat: L }));
      for (let z = 22; z < H - 4; z += 7) ps.push(a.cilindro(0, 0, z, 8.8, 2.5, { mat: L, tono: -0.06 + ((z / 7) % 2) * 0.08 }));
      for (let z = 24; z < H - 6; z += 14) for (let k = 0; k < 6; k++) { const g = (k / 6) * PI2 + z; ps.push(a.elipsoide(Math.cos(g) * 8.5, Math.sin(g) * 8.5, z + 4, 2.2, 2.2, 2.6, { mat: L, giro: deg(g), tono: 0.08 })); }
      if (v === 'entera') {
        // capitel con cascabel de plumas
        ps.push(a.cilindro(0, 0, H, 9, 4, { mat: L, r1: 12, tono: 0.04 }));
        for (let k = 0; k < 10; k++) { const g = (k / 10) * PI2; ps.push(a.poliedro([[Math.cos(g) * 9, Math.sin(g) * 9, H + 4], [Math.cos(g + 0.3) * 9, Math.sin(g + 0.3) * 9, H + 4], [Math.cos(g + 0.15) * 14, Math.sin(g + 0.15) * 14, H], [Math.cos(g + 0.15) * 10, Math.sin(g + 0.15) * 10, H - 6]], { mat: L, tono: 0.02 })); }
        ps.push(a.caja(0, 0, H + 4, 28, 28, 7, { mat: C, giro: G }), a.caja(0, 0, H + 11, 32, 32, 3, { mat: L, giro: G, tono: 0.06 }));
        liana(a, ps, [6, 9, H + 10], 30, [0.6, 0.8, 0]);
      } else {
        ps.push(a.poliedro([[-8, 0, H], [8, 0, H], [0, -8, H], [0, 8, H], [-4, 2, H + 6], [3, 5, H + 3]], { mat: L, tono: -0.05 }));
        ps.push(a.cilindro(-26, 6, 8, 8.4, 20, { mat: L, eje: [0.3, 1, 0], tono: -0.03 }), a.cilindro(-30, -14, 0, 9, 7, { mat: L, eje: [1, 0.2, 0.1] }));
        escombros(a, ps, -14, 18, 10, 3, L);
        musgo(a, ps, -26, 10, 16, 6, 2);
      }
      musgo(a, ps, 0, 0, 4, 12, 3);
      return ps;
    },
  },
  // ------------------------------------------------------------------ cabeza de ídolo
  {
    id: 'tem_idolo', nombre: ['Ídolo de piedra', 'Stone idol'], tema: 'templo_selva', variantes: ['piedra', 'ojos_brillantes', 'jade'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const mat = v === 'jade' ? 'templo_selva_jade' : L;
      const phi = (55 * Math.PI) / 180, G = deg(phi);
      const q = (R: number, l: number, z: number) => frente(phi, R, l, z);
      // pedestal escalonado
      ps.push(a.caja(0, 0, 0, 58, 58, 6, { mat: C, giro: G }), a.caja(0, 0, 6, 48, 48, 8, { mat: C, giro: G, tono: 0.03 }));
      banda(a, ps, 'y', 24 * Math.SQRT1_2 + 3, -10, 10, 7, 6, 7);
      const z0 = 14;
      // máscara: bloque de la cara
      ps.push(a.poliedro([q(-10, -22, z0), q(-10, 22, z0), q(-10, -24, z0 + 50), q(-10, 24, z0 + 50), q(14, -20, z0), q(14, 20, z0), q(16, -22, z0 + 48), q(16, 22, z0 + 48), q(18, -10, z0 + 2), q(18, 10, z0 + 2)], { mat }));
      // tocado: banda con glifos, abanico de plumas y orejeras grandes
      const tb = q(10, 0, z0 + 44); ps.push(a.caja(tb[0], tb[1], tb[2], 52, 16, 12, { mat, giro: G + 90, tono: 0.05 }));
      for (let k = -2; k <= 2; k++) { const g = q(18.2, k * 9, z0 + 47); ps.push(a.caja(g[0], g[1], g[2], 6, 1.6, 6, { mat, giro: G + 90, tono: 0.12 }), a.caja(g[0], g[1], g[2] + 1.5, 2.5, 2.5, 3, { mat, giro: G + 90, resta: true })); }
      for (let k = 0; k < 9; k++) {
        const t = (k / 8 - 0.5) * 2.4, b = q(2, Math.sin(t) * 10, z0 + 54), e = q(-2 - Math.abs(t) * 2, Math.sin(t) * 34, z0 + 56 + Math.cos(t) * 30);
        ps.push(a.palo(b, e, 2.6, { mat, r1: 4.2, tono: k % 2 ? -0.04 : 0.05 }), a.esfera(e[0], e[1], e[2], 4.2, { mat, tono: k % 2 ? 0 : 0.08 }));
      }
      for (const s of [-1, 1]) {
        const o = q(0, s * 25, z0 + 26), e: V3 = [-Math.sin(phi) * s, Math.cos(phi) * s, 0];
        ps.push(a.cilindro(o[0], o[1], o[2], 9, 4, { mat, eje: e, tono: 0.03 }), a.cilindro(o[0] + e[0] * 1, o[1] + e[1] * 1, o[2], 4, 4, { mat: 'negro', eje: e }));
        const c = q(4, s * 26, z0 + 12); ps.push(a.cilindro(c[0], c[1], c[2], 3, 8, { mat, eje: [0, 0, -1] }));
      }
      // cejas, ojos, nariz, boca con colmillos
      for (const s of [-1, 1]) {
        const ce = q(17, s * 9, z0 + 37); ps.push(a.caja(ce[0], ce[1], ce[2], 16, 5, 4, { mat, giro: G + 90 - s * 8, tono: 0.07 }));
        const e = q(17.2, s * 9, z0 + 30); ps.push(a.elipsoide(e[0], e[1], e[2], 3, 7, 4.5, { mat, giro: G, tono: 0.04 }));
        const e2 = q(19.6, s * 9, z0 + 30);
        if (v === 'ojos_brillantes') ps.push(a.elipsoide(e2[0], e2[1], e2[2], 1.5, 4.5, 2.6, { mat: 'fuego_verde', giro: G }));
        else if (v === 'jade') ps.push(a.elipsoide(e2[0], e2[1], e2[2], 1.5, 4.5, 2.6, { mat: 'oro', giro: G }));
        else ps.push(a.elipsoide(e2[0], e2[1], e2[2], 1.3, 4.2, 2.2, { mat: 'negro', giro: G }));
      }
      ps.push(a.poliedro([q(18, -3, z0 + 33), q(18, 3, z0 + 33), q(19, -8, z0 + 20), q(19, 8, z0 + 20), q(24, -5, z0 + 21), q(24, 5, z0 + 21), q(21, 0, z0 + 30)], { mat, tono: 0.06 }));
      const bo = q(17, 0, z0 + 6); ps.push(a.caja(bo[0], bo[1], bo[2], 26, 10, 10, { mat, giro: G + 90, resta: true }));
      const bo2 = q(13.5, 0, z0 + 6); ps.push(a.caja(bo2[0], bo2[1], bo2[2], 25, 1, 9.5, { mat: v === 'ojos_brillantes' ? 'fuego_verde' : 'negro', giro: G + 90, tono: -0.25 }));
      for (const l of [-9, 9]) { const f = q(17, l, z0 + 16); ps.push(a.poliedro([[f[0], f[1], f[2]], [f[0] + 1.6, f[1], f[2]], [f[0], f[1] + 1.6, f[2]], [f[0] + 0.8, f[1] + 0.8, f[2] - 7]], { mat: 'hueso' })); }
      for (const l of [-4, 0, 4]) { const f = q(17, l, z0 + 16); ps.push(a.caja(f[0], f[1], f[2] - 2, 2, 2, 2, { mat: 'hueso', giro: G })); }
      const lb = q(17, 0, z0 + 3); ps.push(a.caja(lb[0], lb[1], lb[2], 28, 6, 3, { mat, giro: G + 90, tono: 0.06 }));
      if (v !== 'jade') { musgo(a, ps, -4, -4, z0 + 86, 10, 3); for (let i = 0; i < 3; i++) liana(a, ps, q(8, -20 + a.r() * 40, z0 + 56), 20 + a.r() * 30, [Math.cos(phi), Math.sin(phi), 0]); }
      if (v === 'ojos_brillantes') return { piezas: ps, resplandor: { c: q(24, 0, z0 + 28), r: 34, color: '#7af06a' } };
      return ps;
    },
  },
  // ------------------------------------------------------------------ estatua de jaguar
  {
    id: 'tem_estatua_jaguar', nombre: ['Estatua de jaguar', 'Jaguar statue'], tema: 'templo_selva', variantes: ['piedra', 'jade', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const mat = v === 'jade' ? 'templo_selva_jade' : L;
      const phi = (50 * Math.PI) / 180, G = deg(phi);
      const q = (R: number, l: number, z: number) => frente(phi, R, l, z);
      ps.push(a.caja(0, 0, 0, 34, 26, 6, { mat: C, giro: G }), a.caja(0, 0, 6, 30, 22, 4, { mat: C, giro: G, tono: 0.05 }));
      const z0 = 10;
      // ancas, pecho y patas delanteras (sentado)
      const an = q(-5, 0, z0 + 8); ps.push(a.elipsoide(an[0], an[1], an[2], 10, 11, 8, { mat, giro: G }));
      for (const s of [-1, 1]) { const m = q(-2, s * 8, z0 + 5); ps.push(a.elipsoide(m[0], m[1], m[2], 8, 4, 6, { mat, giro: G, tono: 0.03 })); const p = q(5, s * 8, z0); ps.push(a.elipsoide(p[0], p[1], p[2] + 1.5, 5, 3, 2, { mat, giro: G })); }
      const pe = q(3, 0, z0 + 20); ps.push(a.elipsoide(pe[0], pe[1], pe[2], 7, 8.5, 13, { mat, giro: G, incl: 0 }));
      for (const s of [-1, 1]) { const b = q(6, s * 5, z0 + 18), c = q(9, s * 5, z0 + 1); ps.push(a.palo(b, c, 2.8, { mat, r1: 2.4 }), a.elipsoide(c[0], c[1], c[2] + 1.4, 3.6, 3, 2, { mat, giro: G })); }
      // cabeza
      const roto = v === 'rota';
      if (!roto) {
        const h = q(6, 0, z0 + 36); ps.push(a.elipsoide(h[0], h[1], h[2], 7.5, 8, 7, { mat, giro: G }));
        const ho = q(12, 0, z0 + 33); ps.push(a.elipsoide(ho[0], ho[1], ho[2], 4, 5, 3.6, { mat, giro: G, tono: 0.04 }));
        const na = q(15.5, 0, z0 + 34.5); ps.push(a.esfera(na[0], na[1], na[2], 1.4, { mat: 'negro' }));
        for (const s of [-1, 1]) {
          const o = q(3, s * 5.5, z0 + 42.5); ps.push(a.elipsoide(o[0], o[1], o[2], 2, 2.6, 3, { mat, giro: G }));
          const e = q(12, s * 3.4, z0 + 38); ps.push(a.elipsoide(e[0], e[1], e[2], 1, 1.8, 1, { mat: v === 'jade' ? 'oro' : 'negro', giro: G }));
          const c = q(14, s * 2.2, z0 + 30.5); ps.push(a.poliedro([[c[0], c[1], c[2] + 1], [c[0] + 0.9, c[1], c[2] + 1], [c[0], c[1] + 0.9, c[2] + 1], [c[0] + 0.4, c[1] + 0.4, c[2] - 2.5]], { mat: 'hueso' }));
        }
      } else {
        ps.push(a.poliedro([q(2, -6, z0 + 28), q(2, 6, z0 + 28), q(8, -5, z0 + 29), q(8, 5, z0 + 29), q(4, 0, z0 + 34)], { mat, tono: -0.05 }));
        const h = q(18, 10, 0); ps.push(a.elipsoide(h[0], h[1], 6, 7.5, 8, 7, { mat, giro: G + 70, incl: 80, inclEje: 'y' }));
        escombros(a, ps, -14, 16, 6, 2, L);
      }
      // cola enroscada al costado
      const t0 = q(-13, 4, z0 + 2), t1 = q(-8, 13, z0 + 1), t2 = q(4, 15, z0 + 1), t3 = q(9, 12, z0 + 3);
      ps.push(a.palo(t0, t1, 2, { mat, r1: 1.8 }), a.palo(t1, t2, 1.8, { mat, r1: 1.5 }), a.palo(t2, t3, 1.5, { mat, r1: 1.2 }));
      // manchas de jaguar
      for (let i = 0; i < 9; i++) { const g = a.r() * PI2, zz = z0 + 4 + a.r() * 22; const p = zz > z0 + 14 ? q(3 + Math.cos(g) * 7, Math.sin(g) * 8, zz) : q(-5 + Math.cos(g) * 10, Math.sin(g) * 11, zz); ps.push(a.esfera(p[0], p[1], p[2], 1.3, { mat: v === 'jade' ? 'negro' : mat, tono: -0.3 })); }
      if (v !== 'jade') musgo(a, ps, 0, 0, 10, 12, 2);
      return ps;
    },
  },
  // ------------------------------------------------------------------ altar ritual
  {
    id: 'tem_altar', nombre: ['Altar de sacrificios', 'Ritual altar'], tema: 'templo_selva', variantes: ['limpio', 'con_sangre'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const sangre = v === 'con_sangre';
      ps.push(a.caja(0, 0, 0, 52, 36, 3, { mat: C, tono: -0.03 }));
      ps.push(a.caja(0, 0, 3, 38, 22, 14, { mat: L }));
      banda(a, ps, 'y', 11, -17, 17, 6, 7, 8.5);
      banda(a, ps, 'x', 19, -9, 9, 6, 7, 9);
      ps.push(a.caja(0, 0, 17, 44, 28, 4, { mat: L, tono: 0.06 }));
      // canal y cuencos
      ps.push(a.caja(0, 0, 20, 34, 3, 2, { mat: L, resta: true }), a.caja(20.5, 0, 19, 4, 3, 3, { mat: L, resta: true }));
      for (const [x, y] of [[-30, 14], [30, -12]]) ps.push(a.cilindro(x, y, 0, 4, 5, { mat: L, r1: 5.5 }), a.cilindro(x, y, 4.2, 4.6, 0.8, { mat: sangre ? 'sangre' : 'negro' }));
      ps.push(a.caja(-6, -4, 21, 10, 7, 1.6, { mat: L, tono: -0.1, giro: 10 }));
      if (sangre) {
        ps.push(a.caja(0, 0, 19.5, 33, 2.6, 1, { mat: 'sangre', tono: 0.1 }), a.elipsoide(6, 3, 21, 8, 5, 0.6, { mat: 'sangre', giro: 20 }), a.elipsoide(-10, -2, 21, 5, 4, 0.5, { mat: 'sangre' }));
        ps.push(a.palo([22.5, 0, 20], [22.6, 0.5, 6], 0.9, { mat: 'sangre', r1: 0.7 }), a.elipsoide(25, 2, 0.5, 6, 5, 0.6, { mat: 'sangre' }));
        for (const x of [-12, 4, 14]) ps.push(a.palo([x, 14.2, 21], [x + 0.2, 14.4, 12 + a.r() * 5], 0.7, { mat: 'sangre', r1: 0.5 }));
        ps.push(a.elipsoide(4, 22, 0.5, 9, 4, 0.5, { mat: 'sangre' }));
        craneo(a, ps, -24, 18, 3, 3, 1.1); craneo(a, ps, 26, 14, 3, 2.8, 0.5);
        ps.push(a.poliedro([[-4, -5, 21.6], [6, -3, 21.6], [-4, -3, 21.6], [6, -5, 22.4]], { mat: 'roca' }), a.caja(-7, -4.5, 21.6, 5, 2, 1.4, { mat: 'madera', giro: 10 }));
      } else {
        for (const [x, y] of [[-14, -8], [14, 8]]) ps.push(a.cilindro(x, y, 21, 1.4, 5, { mat: 'cera' }), a.cilindro(x, y, 26, 0.7, 1.8, { mat: 'luz_vela' }));
        musgo(a, ps, 10, -6, 21, 8, 2);
      }
      return ps;
    },
  },
));

registrar(...conEjes(
  // ------------------------------------------------------------------ escalinata de piedra
  {
    id: 'tem_escalinata', nombre: ['Escalinata de piedra', 'Stone stairs'], tema: 'templo_selva', variantes: ['entera', 'rota'], huella: [3, 4], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const roto = v === 'rota';
      const n = 9, prof = 64, alto = 44;
      for (let i = 0; i < n; i++) {
        const y = prof / 2 - (prof / n) * i, z = (alto / n) * i;
        const prf = y + prof / 2;
        if (roto && (i === 3 || i === 6)) { ps.push(a.caja(jit(a, 8), y + 3, 0, 18, 5, alto / n, { mat: L, giro: jit(a, 15), tono: -0.06 })); ps.push(a.caja(0, (y - prof / 2) / 2 - 3, z, 40, prf - 6, alto / n + 0.2, { mat: L, tono: -0.05 })); continue; }
        ps.push(a.caja(0, (y - prof / 2) / 2, z, 40, prf, alto / n + 0.2, { mat: L, tono: i % 2 ? -0.02 : 0.03 }));
      }
      for (const s of [-1, 1]) ps.push(a.poliedro([[s * 20, prof / 2 + 2, 0], [s * 26, prof / 2 + 2, 0], [s * 20, prof / 2 + 2, 8], [s * 26, prof / 2 + 2, 8], [s * 20, -prof / 2, alto + 4], [s * 26, -prof / 2, alto + 4], [s * 20, -prof / 2, 0], [s * 26, -prof / 2, 0]], { mat: C, tono: 0.03 }));
      if (roto) { ps.push(a.caja(26, 6, 18, 10, 30, 30, { mat: C, resta: true, giro: 15 })); escombros(a, ps, 30, 24, 10, 4, L); }
      for (let i = 0; i < 3; i++) musgo(a, ps, jit(a, 14), jit(a, 24), alto * a.r(), 4, 1);
      return ps;
    },
  },
  // ------------------------------------------------------------------ puerta del templo
  {
    id: 'tem_puerta', nombre: ['Puerta del templo', 'Temple gate'], tema: 'templo_selva', variantes: ['dintel', 'arco_falso'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'dintel') {
        for (const s of [-1, 1]) {
          ps.push(a.caja(s * 24, 0, 0, 20, 20, 6, { mat: C }), a.caja(s * 24, 0, 6, 15, 15, 60, { mat: C }));
          for (let k = 0; k < 4; k++) { ps.push(a.caja(s * 24, 7.8, 12 + k * 13, 9, 1.4, 9, { mat: L, tono: 0.1 }), a.caja(s * 24 + jit(a, 1.5), 8.4, 14 + k * 13 + a.r() * 2, 3.5, 2, 4, { mat: L, resta: true })); }
        }
        ps.push(a.caja(0, 0, 66, 70, 18, 14, { mat: L, tono: 0.02 }));
        banda(a, ps, 'y', 9, -32, 32, 68, 9, 9);
        ps.push(a.caja(0, 0, 80, 74, 20, 4, { mat: L, tono: 0.06 }));
        // pequeño remate escalonado y cráneo tallado al centro
        ps.push(a.caja(0, 0, 84, 30, 12, 6, { mat: C }), a.caja(0, 0, 90, 14, 8, 6, { mat: L, tono: 0.04 }));
        craneo(a, ps, 0, 6, 89, 3.6, Math.PI / 2);
      } else {
        ps.push(a.caja(0, 0, 0, 84, 18, 6, { mat: L, tono: -0.03 }), a.caja(0, 0, 6, 80, 14, 86, { mat: C }));
        ps.push(a.poliedro([[-14, -12, 6], [14, -12, 6], [-14, 12, 6], [14, 12, 6], [-14, -12, 42], [14, -12, 42], [-14, 12, 42], [14, 12, 42], [-3, -12, 70], [3, -12, 70], [-3, 12, 70], [3, 12, 70]], { mat: C, resta: true }));
        ps.push(a.caja(0, 0, 70, 14, 15, 4, { mat: L, tono: 0.05 }));
        banda(a, ps, 'y', 7, -38, -18, 50, 10, 10);
        banda(a, ps, 'y', 7, 18, 38, 50, 10, 10);
        ps.push(a.caja(0, 0, 92, 86, 18, 5, { mat: L, tono: 0.06 }));
        for (const x of [-30, -10, 10, 30]) ps.push(a.caja(x, 0, 97, 12, 8, 6, { mat: L }), a.caja(x, 0, 103, 6, 6, 5, { mat: L, tono: 0.04 }));
        for (let i = 0; i < 3; i++) liana(a, ps, [-34 + a.r() * 68, 9, 96], 18 + a.r() * 30);
      }
      musgo(a, ps, jit(a, 20), 0, v === 'dintel' ? 84 : 97, 20, 3);
      return ps;
    },
  },
  // ------------------------------------------------------------------ pedestal con orbe
  {
    id: 'tem_pedestal_orbe', nombre: ['Pedestal del orbe', 'Orb pedestal'], tema: 'templo_selva', variantes: ['verde', 'morado', 'apagado'], huella: [2, 2], bloquea: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 30, 30, 4, { mat: C }), a.caja(0, 0, 4, 22, 22, 4, { mat: C, tono: 0.04 }));
      ps.push(a.cilindro(0, 0, 8, 7, 24, { mat: L, r1: 6 }));
      for (let k = 0; k < 4; k++) { const g = (k / 4) * PI2 + Math.PI / 4; ps.push(a.caja(Math.cos(g) * 6.4, Math.sin(g) * 6.4, 12, 3, 3, 16, { mat: L, giro: deg(g), tono: 0.08 })); }
      ps.push(a.cilindro(0, 0, 32, 6, 4, { mat: L, r1: 10 }), a.cilindro(0, 0, 35.5, 8.6, 0.6, { mat: 'negro' }));
      for (let k = 0; k < 4; k++) { const g = (k / 4) * PI2; ps.push(a.poliedro([[Math.cos(g) * 9, Math.sin(g) * 9, 35], [Math.cos(g + 0.25) * 9, Math.sin(g + 0.25) * 9, 35], [Math.cos(g + 0.12) * 10, Math.sin(g + 0.12) * 10, 39.5]], { mat: L, tono: 0.05 })); }
      musgo(a, ps, 0, 0, 8, 10, 2);
      if (v === 'apagado') { ps.push(a.esfera(0, 0, 41.5, 6.5, { mat: 'marmol_negro' })); return ps; }
      const m = v === 'verde' ? 'fuego_verde' : 'magia', col = v === 'verde' ? '#7af06a' : '#b46ae8';
      const ph = (f / 6) * PI2, zo = 47 + Math.sin(ph) * 1.5;
      ps.push(a.esfera(0, 0, zo, 7, { mat: m, tono: -0.12 + Math.sin(ph) * 0.08 }), a.esfera(1.5, 3.5, zo + 2.5, 2.6, { mat: m, tono: 0.3 }));
      for (let k = 0; k < 3; k++) { const g = ph + (k / 3) * PI2; ps.push(a.esfera(Math.cos(g) * 10, Math.sin(g) * 10, zo + Math.sin(g * 2) * 3, 1, { mat: m, tono: 0.15 })); }
      return { piezas: ps, resplandor: { c: [0, 0, zo], r: 30, color: col } };
    },
  },
  // ------------------------------------------------------------------ brasero de piedra
  {
    id: 'tem_brasero', nombre: ['Brasero de piedra', 'Stone brazier'], tema: 'templo_selva', variantes: ['cuenco', 'cabeza'], huella: [1, 1], bloquea: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      let zf: number;
      if (v === 'cuenco') {
        ps.push(a.caja(0, 0, 0, 18, 18, 3, { mat: C }), a.cilindro(0, 0, 3, 5, 18, { mat: L, r1: 4 }), a.cilindro(0, 0, 21, 4, 7, { mat: L, r1: 10 }));
        for (let k = 0; k < 6; k++) { const g = (k / 6) * PI2; ps.push(a.caja(Math.cos(g) * 8.8, Math.sin(g) * 8.8, 24, 2.4, 2.4, 2.4, { mat: L, giro: deg(g), tono: 0.1 })); }
        ps.push(a.cilindro(0, 0, 27.5, 8.6, 0.6, { mat: 'negro' }));
        zf = 28;
      } else {
        const phi = Math.PI / 4, G = deg(phi);
        const q = (R: number, l: number, z: number) => frente(phi, R, l, z);
        ps.push(a.caja(0, 0, 0, 20, 20, 4, { mat: C, giro: G }), a.caja(0, 0, 4, 15, 15, 10, { mat: L, giro: G }));
        ps.push(a.elipsoide(0, 0, 22, 10, 10, 9, { mat: L, giro: G }));
        for (const s of [-1, 1]) { const e = q(9, s * 3.6, 23); ps.push(a.esfera(e[0], e[1], e[2], 2, { mat: 'negro' })); const o = q(0, s * 10, 21); ps.push(a.cilindro(o[0], o[1], o[2], 3, 2, { mat: L, eje: [-Math.sin(phi) * s, Math.cos(phi) * s, 0] })); }
        const b = q(8.5, 0, 16.5); ps.push(a.caja(b[0], b[1], b[2], 9, 4, 3, { mat: 'negro', giro: G + 90 }));
        const n = q(10, 0, 19.5); ps.push(a.esfera(n[0], n[1], n[2], 1.6, { mat: L, tono: 0.08 }));
        ps.push(a.cilindro(0, 0, 27, 8, 6, { mat: L, resta: true }), a.cilindro(0, 0, 27.5, 7.5, 0.6, { mat: 'negro' }));
        zf = 28;
      }
      llama(a, ps, 0, 0, zf, 4.6, f);
      return { piezas: ps, resplandor: { c: [0, 0, zf + 6], r: 36, color: '#ff9a3a' } };
    },
  },
  // ------------------------------------------------------------------ calzada
  {
    id: 'tem_calzada', nombre: ['Calzada de piedra', 'Stone causeway'], tema: 'templo_selva', variantes: ['entera', 'rota'], huella: [5, 3], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const roto = v === 'rota';
      ps.push(a.caja(0, 0, 0, 96, 60, 0.6, { mat: 'tierra' }), a.caja(0, 0, 0, 92, 54, 1.2, { mat: 'agua_sucia' }));
      for (const x of [-30, 0, 30]) ps.push(a.caja(x, 0, 0, 14, 38, 18, { mat: C, tono: -0.04 }));
      ps.push(a.caja(0, 0, 18, 84, 38, 6, { mat: C }));
      for (const x of [-15, 15]) ps.push(a.poliedro([[x - 8, -20, 0], [x + 8, -20, 0], [x - 8, 20, 0], [x + 8, 20, 0], [x - 8, -20, 8], [x + 8, -20, 8], [x - 8, 20, 8], [x + 8, 20, 8], [x - 2, -20, 15], [x + 2, -20, 15], [x - 2, 20, 15], [x + 2, 20, 15]], { mat: C, resta: true }));
      for (const s of [-1, 1]) ps.push(a.caja(0, s * 17.5, 24, 84, 3, 4, { mat: L, tono: 0.06 }));
      banda(a, ps, 'y', 19, -40, 40, 18, 5.5, 10);
      if (roto) {
        ps.push(a.poliedro([[14, -25, 10], [48, -25, 6], [14, 25, 10], [48, 25, 6], [20, -25, 40], [48, -25, 40], [20, 25, 40], [48, 25, 40]], { mat: C, resta: true }));
        ps.push(a.caja(36, 8, 0, 20, 12, 6, { mat: C, giro: 25, incl: 12, tono: -0.05 }), a.caja(28, -12, 0, 14, 10, 5, { mat: L, giro: -10, tono: -0.05 }));
      }
      for (let i = 0; i < 3; i++) musgo(a, ps, -30 + a.r() * 50, jit(a, 10), 24, 4, 1);
      for (let i = 0; i < 2; i++) liana(a, ps, [-30 + a.r() * 40, 20, 24], 14 + a.r() * 8);
      return ps;
    },
  },
  // ------------------------------------------------------------------ muro en ruinas con musgo
  {
    id: 'tem_muro_musgo', nombre: ['Ruina cubierta de musgo', 'Mossy ruin wall'], tema: 'templo_selva', variantes: ['bajo', 'alto', 'con_raices'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const nc = 5, bw = 16, bh = 10;
      const altos: number[] = [];
      for (let c = 0; c < nc; c++) {
        const max = v === 'bajo' ? 2 + Math.floor(a.r() * 3) : 4 + Math.floor(a.r() * 5);
        altos.push(max);
        for (let r = 0; r < max; r++) {
          const corre = r % 2 ? bw * 0.5 : 0;
          const x = -40 + bw / 2 + c * bw + corre - (r % 2 && c === nc - 1 ? bw * 0.5 : 0);
          const w = r % 2 && c === nc - 1 ? bw * 0.5 - 0.4 : bw - 0.4;
          const ult = r === max - 1;
          ps.push(a.caja(x + (ult ? jit(a, 1.5) : 0), ult ? jit(a, 1.5) : 0, r * bh, w, 14, bh - 0.3, { mat: L, giro: ult ? jit(a, 5) : 0, tono: jit(a, 0.07) }));
        }
        musgo(a, ps, -40 + bw / 2 + c * bw, 0, max * bh, 4, 2);
      }
      ps.push(a.caja(0, 0, 0, 84, 18, 3, { mat: C, tono: -0.05 }));
      escombros(a, ps, 14, 18, 14, 4, L);
      for (let i = 0; i < 4; i++) { const c = Math.floor(a.r() * nc); liana(a, ps, [-40 + bw / 2 + c * bw + jit(a, 5), 8, altos[c] * bh], altos[c] * bh * (0.4 + a.r() * 0.5)); }
      for (let i = 0; i < 6; i++) ps.push(a.elipsoide(-40 + a.r() * 80, 10 + a.r() * 4, 0.5, 4 + a.r() * 3, 3, 3, { mat: 'templo_selva_follaje', tono: jit(a, 0.1) }));
      if (v === 'con_raices') {
        const c = 2, zt = altos[c] * bh;
        const t: V3 = [-40 + bw / 2 + c * bw, -2, zt];
        ps.push(a.cilindro(t[0], t[1], t[2], 5, 4, { mat: 'corteza', r1: 3.5 }), a.palo(t, [t[0] + 3, t[1] - 2, zt + 44], 3.5, { mat: 'corteza', r1: 2.2 }));
        for (let i = 0; i < 6; i++) {
          const s = i % 2 ? 1 : -1, d = 8 + a.r() * 18;
          const p1: V3 = [t[0] + jit(a, d), t[1] + s * 8, zt - 4], p2: V3 = [p1[0] + jit(a, 6), t[1] + s * (12 + a.r() * 8), 0];
          ps.push(a.palo([t[0], t[1], zt + 2], p1, 2, { mat: 'corteza', r1: 1.7 }), a.palo(p1, p2, 1.7, { mat: 'corteza', r1: 1.2 }));
        }
        for (let i = 0; i < 6; i++) { const g = a.r() * PI2; ps.push(a.elipsoide(t[0] + 3 + Math.cos(g) * 12, t[1] - 2 + Math.sin(g) * 12, zt + 42 + jit(a, 5), 12, 12, 7, { mat: 'templo_selva_follaje', tono: jit(a, 0.08) })); }
        ps.push(a.elipsoide(t[0] + 3, t[1] - 2, zt + 50, 14, 14, 8, { mat: 'templo_selva_follaje', tono: 0.05 }));
      }
      return ps;
    },
  },
));
