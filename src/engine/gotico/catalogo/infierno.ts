import { registrar, type Arma, type ObjetoDef, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, type Escena } from '../render';

/**
 * Infierno: lagos y grietas de lava, agujas de obsidiana, montañas de huesos, empalados, braseros de hierro,
 * pentagramas, sellos, pilares de luz, estatuas de demonios, cadenas, muros de carne, cercas de pinchos, almas
 * enjauladas, la forja y el portal rojo.
 */

const junta = (v: number, paso: number, grosor = 1) => { const m = ((v % paso) + paso) % paso; return m < grosor ? 1 : 0; };
function bloques(largo: number, alto: number) {
  return (p: V3, n: V3) => {
    const fila = Math.floor(p[2] / alto);
    if (Math.abs(n[2]) > 0.7) { const corre = (Math.floor(p[1] / alto) % 2) * largo * 0.5; return junta(p[1], alto) || junta(p[0] + corre, largo) ? -0.3 : 0; }
    const corre = (fila % 2) * largo * 0.5, u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
    if (junta(p[2], alto)) return -0.32;
    if (junta(u + corre, largo)) return -0.28;
    return (ruido(Math.floor((u + corre) / largo) * 1.7, fila * 2.3, 5) - 0.5) * 0.2;
  };
}
MATERIALES.infierno_obsidiana = { rampa: ['#060508', '#0d0a10', '#151019', '#1f1724', '#2a1f30', '#36283d', '#45334c'], ruido: 0.2, escala: 0.15, brillo: 0.9 };
MATERIALES.infierno_piedra = { rampa: ['#110807', '#1c0e0c', '#291511', '#371c17', '#46251e', '#562f26', '#673a2f'], ruido: 0.3, escala: 0.2, patron: bloques(16, 8) };
MATERIALES.infierno_roca = { rampa: ['#0e0807', '#1a0e0b', '#271410', '#351b15', '#44231b', '#542c22'], ruido: 0.55, escala: 0.14 };
MATERIALES.infierno_costra = { rampa: ['#0a0605', '#130b08', '#1d110c', '#281711', '#341e16', '#41271c'], ruido: 0.6, escala: 0.25, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.7 ? 0.25 : 0) };
MATERIALES.infierno_hierro = { rampa: ['#0b0807', '#151010', '#211818', '#2e2322', '#3c2e2c', '#4b3a36', '#5c4842'], ruido: 0.3, escala: 0.35, brillo: 0.35 };
MATERIALES.infierno_vena = { rampa: ['#120306', '#24070b', '#380c11', '#4e1218', '#641a1e', '#7a2424'], ruido: 0.3, escala: 0.5, brillo: 0.4 };
MATERIALES.infierno_luz = { rampa: ['#7a4a30', '#b07850', '#d8a878', '#f2d2a8', '#fff0d8', '#fffaf2'], ruido: 0.3, escala: 0.08, emite: true };

const PI2 = Math.PI * 2;
const deg = (r: number) => (r * 180) / Math.PI;
const jit = (a: Arma, k: number) => (a.r() - 0.5) * 2 * k;
const frente = (phi: number, R: number, lado: number, z: number, cx = 0, cy = 0): V3 => [cx + Math.cos(phi) * R - Math.sin(phi) * lado, cy + Math.sin(phi) * R + Math.cos(phi) * lado, z];
const P = 'infierno_piedra', O = 'infierno_obsidiana', H = 'infierno_hierro', K = 'infierno_costra';

/** Gira todas las piezas `g` grados alrededor del eje vertical (el origen queda en su lugar). */
function rotarZ(ps: Pieza[], g: number): Pieza[] {
  const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180);
  const R = (v: V3): V3 => [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, d]) => [R(n), d] as [V3, number]), pts: p.pts.map(R) };
    if (p.k === 'cono') return { ...p, o: R(p.o), ex: R(p.ex), ey: R(p.ey), ez: R(p.ez) };
    return { ...p, c: R(p.c), ex: R(p.ex), ey: R(p.ey), ez: R(p.ez) };
  });
}
/** Agrega a cada variante su gemela a lo largo del eje y (`<variante>_y`): las mismas piezas giradas -90°. */
const EJE_Y = ['inf_muro_carne', 'inf_cerca_pinchos', 'inf_cadenas', 'inf_grieta_lava'];
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
function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, f: number, mat = 'fuego') {
  const fr = (k: number) => Math.sin((f / 6) * PI2 + k * 2.1);
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * PI2 + f * 0.5;
    ps.push(a.cilindro(x + Math.cos(ang) * s * 0.55, y + Math.sin(ang) * s * 0.55, z, s * (0.95 - k * 0.1), s * (2.2 + fr(k) * 0.7 + k * 0.45), { mat, r1: 0.25 }));
  }
  ps.push(a.elipsoide(x, y, z + s * 0.3, s * 1.25, s * 1.25, s * 0.6, { mat, tono: 0.2 }));
}
function craneo(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, phi = Math.PI / 4, tono = 0) {
  ps.push(a.elipsoide(x, y, z, s, s * 0.95, s * 0.92, { mat: 'hueso', giro: deg(phi), tono }));
  const q = (R: number, l: number, zz: number) => frente(phi, R, l, z + zz, x, y);
  const m = q(s * 0.55, 0, -s * 0.72); ps.push(a.caja(m[0], m[1], m[2], s * 0.9, s, s * 0.5, { mat: 'hueso', giro: deg(phi) + 90, tono }));
  for (const l of [-0.38, 0.38]) { const e = q(s * 0.72, l * s, s * 0.02); ps.push(a.esfera(e[0], e[1], e[2], s * 0.3, { mat: 'negro' })); }
}
function hueso(a: Arma, ps: Pieza[], p: V3, q: V3, r = 1, tono = 0) {
  ps.push(a.palo(p, q, r, { mat: 'hueso', tono }), a.esfera(p[0], p[1], p[2], r * 1.6, { mat: 'hueso', tono }), a.esfera(q[0], q[1], q[2], r * 1.6, { mat: 'hueso', tono }));
}
/** Disco de piso irregular de costra quemada. */
function costra(a: Arma, ps: Pieza[], r: number) {
  ps.push(a.cilindro(0, 0, 0, r, 1.2, { mat: K, r1: r * 0.95 }));
  for (let i = 0; i < 4; i++) { const g = a.r() * PI2, d = r * (0.5 + a.r() * 0.4); ps.push(a.cilindro(Math.cos(g) * d, Math.sin(g) * d, 0, r * 0.35, 1, { mat: K })); }
}
/** Cadena colgando de p hacia abajo, eslabones alternados. */
function cadena(a: Arma, ps: Pieza[], p: V3, largo: number, mat = 'hierro') {
  const n = Math.max(2, Math.floor(largo / 3.2));
  for (let i = 0; i < n; i++) ps.push(a.elipsoide(p[0], p[1], p[2] - 1.8 - i * 3.2, 1.4, 0.6, 2.1, { mat, giro: i % 2 ? 45 : 135 }));
  return [p[0], p[1], p[2] - n * 3.2] as V3;
}

registrar(...conEjes(
  // ------------------------------------------------------------------ lago de lava
  {
    id: 'inf_lago_lava', nombre: ['Lago de lava', 'Lava pool'], tema: 'infierno', variantes: ['chico', 'grande'], huella: [4, 4], huellaPor: { grande: [6, 6] }, bloquea: true, plano: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const R = v === 'grande' ? 40 : 24, ph = (f / 6) * PI2;
      const charcos: [number, number, number][] = [[0, 0, R]];
      for (let i = 0; i < (v === 'grande' ? 4 : 2); i++) { const g = a.r() * PI2, d = R * (0.4 + a.r() * 0.3); charcos.push([Math.cos(g) * d, Math.sin(g) * d, R * (0.45 + a.r() * 0.2)]); }
      // borde de costra (anillo) antes de la lava, así el hueco no la cava
      for (const [x, y, r] of charcos) ps.push(a.cilindro(x, y, 0, r + 6, 2.6, { mat: K, r1: r + 4 }));
      for (const [x, y, r] of charcos) ps.push(a.cilindro(x, y, 1, r, 4, { mat: K, resta: true }));
      for (const [x, y, r] of charcos) ps.push(a.cilindro(x, y, 0, r + 0.5, 1.6, { mat: 'lava', tono: -0.24 + Math.sin(ph) * 0.08 }));
      // vetas calientes y costras que flotan
      for (let i = 0; i < (v === 'grande' ? 7 : 4); i++) {
        const g = a.r() * PI2, d = R * a.r() * 0.7, x = Math.cos(g) * d, y = Math.sin(g) * d, k = a.r() * PI2;
        ps.push(a.elipsoide(x, y, 1.6, 4 + a.r() * 5, 1.5 + a.r() * 1.5, 0.3, { mat: 'lava', giro: a.r() * 180, tono: 0.18 + Math.sin(ph + k) * 0.12 }));
      }
      for (let i = 0; i < (v === 'grande' ? 6 : 3); i++) {
        const g = a.r() * PI2, d = R * a.r() * 0.6, x = Math.cos(g) * d + Math.cos(f * 0.5) * 1.2, y = Math.sin(g) * d + Math.sin(f * 0.5) * 1.2, s = 2.5 + a.r() * 3.5;
        ps.push(a.poliedro([[x - s, y, 1.4], [x, y - s * 0.8, 1.4], [x + s, y + s * 0.2, 1.4], [x - s * 0.2, y + s, 1.4], [x, y, 2.6]], { mat: K }));
      }
      // burbujas que crecen y revientan
      for (let i = 0; i < 3; i++) { const g = a.r() * PI2, d = R * a.r() * 0.6, fase = (f + i * 2) % 6; if (fase < 4) ps.push(a.esfera(Math.cos(g) * d, Math.sin(g) * d, 1.4, 0.9 + fase * 0.5, { mat: 'lava', tono: 0.3 })); }
      // rocas del borde
      for (let i = 0; i < 6; i++) { const g = a.r() * PI2, [x, y, r] = charcos[Math.floor(a.r() * charcos.length)]; ps.push(a.elipsoide(x + Math.cos(g) * (r + 4), y + Math.sin(g) * (r + 4), 1, 3 + a.r() * 3, 2.5 + a.r() * 2, 2 + a.r() * 2, { mat: 'infierno_roca', giro: a.r() * 180 })); }
      return { piezas: ps, resplandor: { c: [0, 0, 4], r: R + 18, color: '#ff6a20' } };
    },
  },
  // ------------------------------------------------------------------ grieta de lava
  {
    id: 'inf_grieta_lava', nombre: ['Grieta de lava', 'Lava fissure'], tema: 'infierno', variantes: ['recta', 'ramificada'], huella: [6, 3], bloquea: false, plano: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const ph = (f / 6) * PI2;
      const tramos: [V3, V3, number][] = [];
      let p: V3 = [-44, jit(a, 6), 0], dir = jit(a, 0.3);
      for (let i = 0; i < 7; i++) { dir += jit(a, 0.6); const L = 11 + a.r() * 4; const q: V3 = [p[0] + Math.cos(dir) * L, p[1] + Math.sin(dir) * L, 0]; tramos.push([p, q, 3.4 - Math.abs(i - 3) * 0.5]); p = q; dir *= 0.6; }
      if (v === 'ramificada') for (const k of [2, 4]) { let b = tramos[k][1], d = (k === 2 ? 1 : -1) * (1 + a.r() * 0.5); for (let i = 0; i < 3; i++) { d += jit(a, 0.4); const q: V3 = [b[0] + Math.cos(d) * 10, b[1] + Math.sin(d) * 10, 0]; tramos.push([b, q, 2.2 - i * 0.5]); b = q; } }
      tramos.forEach(([p0, q, w], i) => {
        const mx = (p0[0] + q[0]) / 2, my = (p0[1] + q[1]) / 2, L = Math.hypot(q[0] - p0[0], q[1] - p0[1]) + w, g = deg(Math.atan2(q[1] - p0[1], q[0] - p0[0]));
        for (const s of [-1, 1]) { const nx = -Math.sin((g * Math.PI) / 180) * s * (w * 0.5 + 1.6), ny = Math.cos((g * Math.PI) / 180) * s * (w * 0.5 + 1.6); ps.push(a.caja(mx + nx, my + ny, 0, L + 2, 3.4 + a.r(), 1.8 + a.r() * 0.8, { mat: K, giro: g + jit(a, 4) })); }
        ps.push(a.caja(mx, my, 0, L, w, 1, { mat: 'lava', giro: g, tono: 0.05 + Math.sin(ph - i * 0.9) * 0.15 }));
      });
      for (let i = 0; i < 6; i++) { const [p0] = tramos[Math.floor(a.r() * tramos.length)]; ps.push(a.elipsoide(p0[0] + jit(a, 8), p0[1] + jit(a, 8), 0.5, 2 + a.r() * 2, 1.5 + a.r() * 2, 1.4, { mat: 'infierno_roca', giro: a.r() * 180 })); }
      return { piezas: ps, resplandor: { c: [0, 0, 2], r: 30, color: '#ff6a20' } };
    },
  },
  // ------------------------------------------------------------------ agujas de roca
  {
    id: 'inf_aguja', nombre: ['Aguja de roca', 'Rock spire'], tema: 'infierno', variantes: ['obsidiana', 'roja', 'grupo'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      costra(a, ps, 24);
      const aguja = (x: number, y: number, h: number, r: number, mat: string) => {
        const n = 5, lean: V3 = [jit(a, h * 0.08), jit(a, h * 0.08), 0], mid = h * (0.45 + a.r() * 0.15);
        const base: V3[] = [], cin: V3[] = [];
        for (let i = 0; i < n; i++) { const g = (i / n) * PI2 + a.r() * 0.5, rr = r * (0.75 + a.r() * 0.4); base.push([x + Math.cos(g) * rr, y + Math.sin(g) * rr, 0]); cin.push([x + lean[0] * 0.45 + Math.cos(g) * rr * 0.55, y + lean[1] * 0.45 + Math.sin(g) * rr * 0.55, mid]); }
        const tip: V3 = [x + lean[0], y + lean[1], h];
        ps.push(a.poliedro([...base, ...cin], { mat }), a.poliedro([...cin, tip], { mat, tono: 0.03 }));
        // lascas
        for (let i = 0; i < 2; i++) { const g = a.r() * PI2, z = h * (0.15 + a.r() * 0.3); ps.push(a.poliedro([[x + Math.cos(g) * r * 0.5, y + Math.sin(g) * r * 0.5, z], [x + Math.cos(g + 0.6) * r * 0.5, y + Math.sin(g + 0.6) * r * 0.5, z], [x + Math.cos(g + 0.3) * r * 0.6, y + Math.sin(g + 0.3) * r * 0.6, z - 6], [x + Math.cos(g + 0.3) * r * 1.1, y + Math.sin(g + 0.3) * r * 1.1, z + h * 0.25]], { mat, tono: -0.04 })); }
      };
      if (v === 'grupo') {
        aguja(0, 0, 110 + a.r() * 15, 13, O);
        aguja(16, 10, 60 + a.r() * 10, 8, 'roca_roja');
        aguja(-14, 12, 48 + a.r() * 10, 7, O);
        aguja(8, -15, 72 + a.r() * 10, 9, 'roca_roja');
        aguja(-18, -8, 34, 6, O);
      } else aguja(0, 0, (v === 'obsidiana' ? 95 : 85) + a.r() * 20, 14, v === 'obsidiana' ? O : 'roca_roja');
      for (let i = 0; i < 6; i++) { const g = a.r() * PI2, d = 14 + a.r() * 8; ps.push(a.poliedro([[Math.cos(g) * d, Math.sin(g) * d, 0], [Math.cos(g) * d + 3, Math.sin(g) * d + 1, 0], [Math.cos(g) * d, Math.sin(g) * d + 3, 0], [Math.cos(g) * d + 1, Math.sin(g) * d + 1, 3 + a.r() * 5]], { mat: v === 'roja' ? 'roca_roja' : O })); }
      // vetas de lava en la base
      for (let i = 0; i < 3; i++) { const g = a.r() * PI2; ps.push(a.caja(Math.cos(g) * 18, Math.sin(g) * 18, 0, 10, 1.2, 1.3, { mat: 'lava', giro: deg(g) + 90 + jit(a, 30), tono: -0.15 })); }
      return ps;
    },
  },
  // ------------------------------------------------------------------ huesos y cráneos
  {
    id: 'inf_huesos', nombre: ['Montón de huesos', 'Bone pile'], tema: 'infierno', variantes: ['huesos', 'craneos', 'montana'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const R = v === 'montana' ? 34 : 18, alto = v === 'montana' ? 26 : 7;
      costra(a, ps, R + 4);
      ps.push(a.elipsoide(0, 0, 0, R, R * 0.9, alto, { mat: 'infierno_roca', tono: -0.05 }), a.caja(0, 0, -60, 200, 200, 60, { mat: K, resta: true }));
      const sobre = (d: number): number => alto * Math.sqrt(Math.max(0, 1 - (d / R) ** 2));
      const nh = v === 'huesos' ? 22 : v === 'montana' ? 30 : 10;
      for (let i = 0; i < nh; i++) {
        const g = a.r() * PI2, d = a.r() * R * 0.95, x = Math.cos(g) * d, y = Math.sin(g) * d, z = sobre(d) + 0.5, gg = a.r() * PI2, L = 5 + a.r() * 6;
        hueso(a, ps, [x - Math.cos(gg) * L, y - Math.sin(gg) * L, z + jit(a, 1.5)], [x + Math.cos(gg) * L, y + Math.sin(gg) * L, z + jit(a, 2)], 0.9, jit(a, 0.1));
      }
      const nc = v === 'craneos' ? 18 : v === 'montana' ? 24 : 3;
      for (let i = 0; i < nc; i++) {
        const g = a.r() * PI2, d = Math.sqrt(a.r()) * R * 0.9, s = 2.8 + a.r() * 0.9;
        craneo(a, ps, Math.cos(g) * d, Math.sin(g) * d, sobre(d) + s * 0.6, s, Math.PI / 4 + jit(a, 1.2), jit(a, 0.1));
      }
      if (v !== 'huesos') {
        // un costillar y un cráneo con cuernos encima
        const zt = alto + 2;
        for (let k = 0; k < 4; k++) ps.push(a.palo([-4 + k * 2.5, -1, zt], [-5 + k * 2.5, 5, zt + 4], 0.7, { mat: 'hueso' }), a.palo([-5 + k * 2.5, 5, zt + 4], [-4 + k * 2.5, 9, zt - 1], 0.7, { mat: 'hueso' }));
        craneo(a, ps, 4, 2, zt + 3, 4.5, Math.PI / 4);
        for (const s of [-1, 1]) { const b = frente(Math.PI / 4, -1, s * 4, zt + 6, 4, 2), m = frente(Math.PI / 4, -3, s * 10, zt + 9, 4, 2), t = frente(Math.PI / 4, 1, s * 12, zt + 17, 4, 2); ps.push(a.palo(b, m, 1.4, { mat: 'hueso', r1: 1, tono: -0.1 }), a.palo(m, t, 1, { mat: 'hueso', r1: 0.3, tono: -0.1 })); }
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ empalados
  {
    id: 'inf_empalados', nombre: ['Empalados', 'Impaled corpses'], tema: 'infierno', variantes: ['uno', 'tres'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      costra(a, ps, 22);
      const estaca = (x: number, y: number, h: number, cuerpo: boolean) => {
        const t: V3 = [x + jit(a, 5), y + jit(a, 5), h];
        ps.push(a.cilindro(x, y, 0, 4, 4, { mat: 'infierno_roca', r1: 2.5 }), a.palo([x, y, 0], t, 2.2, { mat: H, r1: 0.3 }));
        const at = (z: number): V3 => [x + (t[0] - x) * z / h, y + (t[1] - y) * z / h, z];
        ps.push(a.palo(at(h * 0.4), at(h * 0.85), 0.6, { mat: 'sangre' }));
        if (!cuerpo) return;
        const zc = h * 0.62, c = at(zc), phi = Math.PI / 4 + jit(a, 0.6), G = deg(phi);
        const q = (R: number, l: number, z: number) => frente(phi, R, l, z, c[0], c[1]);
        // cuerpo reseco y doblado sobre la estaca: siluetas oscuras, sin detalle
        ps.push(a.elipsoide(c[0], c[1], zc, 4.2, 5.2, 8, { mat: 'cuero', giro: G, incl: 25, tono: -0.12 }));
        const hd = q(4, 0, zc + 4); ps.push(a.esfera(hd[0], hd[1], hd[2] - 2, 3, { mat: 'cuero', tono: -0.1 }));
        for (const s of [-1, 1]) {
          const hm = q(1.5, s * 4.5, zc + 4), mn = q(3 + a.r() * 2, s * 6, zc - 9);
          ps.push(a.palo(hm, mn, 1.2, { mat: 'cuero', r1: 0.9, tono: -0.12 }));
          const ca = q(-1, s * 2.2, zc - 5), pi = q(-2, s * 3.5, zc - 18 - a.r() * 3);
          ps.push(a.palo(ca, pi, 1.5, { mat: 'cuero', r1: 1, tono: -0.15 }));
        }
        ps.push(a.elipsoide(c[0], c[1], zc - 4, 4.6, 5.6, 3, { mat: 'tela', giro: G, tono: -0.15 }));
        ps.push(a.elipsoide(x + 3, y + 3, 0.4, 5, 3.5, 0.4, { mat: 'sangre' }));
      };
      if (v === 'uno') estaca(0, 0, 72, true);
      else { estaca(-10, -8, 76, true); estaca(12, -2, 64, true); estaca(-2, 14, 58, false); }
      for (let i = 0; i < 5; i++) { const g = a.r() * PI2, d = 8 + a.r() * 12; hueso(a, ps, [Math.cos(g) * d, Math.sin(g) * d, 0.8], [Math.cos(g) * d + jit(a, 6), Math.sin(g) * d + jit(a, 6), 0.8], 0.8, -0.05); }
      craneo(a, ps, 14, 14, 2.6, 2.8, 0.8);
      return ps;
    },
  },
  // ------------------------------------------------------------------ brasero del infierno
  {
    id: 'inf_brasero', nombre: ['Brasero infernal', 'Hell brazier'], tema: 'infierno', variantes: ['cuernos', 'jaula'], huella: [2, 2], bloquea: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      for (let k = 0; k < 3; k++) {
        const g = (k / 3) * PI2 + 0.5, pie: V3 = [Math.cos(g) * 12, Math.sin(g) * 12, 0], rod: V3 = [Math.cos(g) * 9, Math.sin(g) * 9, 14], arr: V3 = [Math.cos(g) * 5, Math.sin(g) * 5, 26];
        ps.push(a.palo(pie, rod, 1.6, { mat: H }), a.palo(rod, arr, 1.6, { mat: H, r1: 1.3 }), a.poliedro([[pie[0] - 1.5, pie[1], 0], [pie[0] + 1.5, pie[1], 0], [pie[0], pie[1] + 1.5, 0], [pie[0] + Math.cos(g) * 4, pie[1] + Math.sin(g) * 4, 1.5]], { mat: H }));
        ps.push(a.poliedro([[rod[0] - 1, rod[1] - 1, rod[2]], [rod[0] + 1, rod[1] + 1, rod[2]], [rod[0], rod[1], rod[2] + 2], [rod[0] + Math.cos(g) * 6, rod[1] + Math.sin(g) * 6, rod[2] + 2]], { mat: H, tono: 0.05 }));
      }
      ps.push(a.cilindro(0, 0, 24, 6, 8, { mat: H, r1: 13 }), a.cilindro(0, 0, 31, 12.5, 1.6, { mat: H, tono: 0.06 }), a.cilindro(0, 0, 32.4, 11.6, 0.6, { mat: 'negro' }));
      for (let k = 0; k < 8; k++) { const g = (k / 8) * PI2; ps.push(a.poliedro([[Math.cos(g) * 12.4, Math.sin(g) * 12.4, 31], [Math.cos(g + 0.2) * 12.4, Math.sin(g + 0.2) * 12.4, 31], [Math.cos(g + 0.1) * 11, Math.sin(g + 0.1) * 11, 31], [Math.cos(g + 0.1) * 14, Math.sin(g + 0.1) * 14, 37]], { mat: H, tono: 0.04 })); }
      if (v === 'cuernos') {
        for (const s of [-1, 1]) {
          const b: V3 = [s * 9, s * -9, 32], m: V3 = [s * 18, s * -18, 40], t: V3 = [s * 16, s * -16, 54];
          ps.push(a.palo(b, m, 2.6, { mat: 'hueso', r1: 1.8, tono: -0.12 }), a.palo(m, t, 1.8, { mat: 'hueso', r1: 0.4, tono: -0.12 }));
        }
        craneo(a, ps, 9, 9, 30, 3.4, Math.PI / 4, -0.1);
      } else {
        for (let k = 0; k < 9; k++) { const g = (k / 9) * PI2; ps.push(a.palo([Math.cos(g) * 11, Math.sin(g) * 11, 32], [Math.cos(g) * 7, Math.sin(g) * 7, 58], 0.9, { mat: H })); }
        ps.push(a.cilindro(0, 0, 57, 7.6, 2, { mat: H }), a.poliedro([[-2, -2, 59], [2, -2, 59], [-2, 2, 59], [2, 2, 59], [0, 0, 68]], { mat: H }));
      }
      llama(a, ps, 0, 0, 32.5, 6.5, f);
      return { piezas: ps, resplandor: { c: [0, 0, 42], r: 46, color: '#ff7a2a' } };
    },
  },
  // ------------------------------------------------------------------ pentagrama
  {
    id: 'inf_pentagrama', nombre: ['Pentagrama', 'Pentagram floor'], tema: 'infierno', variantes: ['rojo', 'azul'], huella: [6, 6], bloquea: false, plano: true, cuadros: 6, t: 4,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const m = v === 'rojo' ? 'portal_rojo' : 'runa', col = v === 'rojo' ? '#ff4a2a' : '#5ac8f0';
      const pul = -0.12 + Math.sin((f / 6) * PI2) * 0.14;
      const R1 = 42, R2 = 33;
      ps.push(a.cilindro(0, 0, 0, R1, 2.4, { mat: m, tono: pul }), a.cilindro(0, 0, 0, R1 - 2, 3, { mat: m, resta: true }));
      ps.push(a.cilindro(0, 0, 0, R2 + 1.6, 2.4, { mat: m, tono: pul }), a.cilindro(0, 0, 0, R2, 3, { mat: m, resta: true }));
      const pts: [number, number][] = Array.from({ length: 5 }, (_, k) => { const g = -Math.PI / 4 + (k / 5) * PI2; return [Math.cos(g) * R2, Math.sin(g) * R2]; });
      for (let k = 0; k < 5; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[(k + 2) % 5];
        ps.push(a.caja((x0 + x1) / 2, (y0 + y1) / 2, 0, Math.hypot(x1 - x0, y1 - y0), 1.8, 2.4, { mat: m, giro: deg(Math.atan2(y1 - y0, x1 - x0)), tono: pul + 0.05 }));
      }
      // runas entre los anillos
      for (let k = 0; k < 10; k++) {
        const g = (k / 10) * PI2 + 0.3, x = Math.cos(g) * (R2 + R1) / 2, y = Math.sin(g) * (R2 + R1) / 2, gr = deg(g);
        ps.push(a.caja(x, y, 0, 1.2, 4, 2.4, { mat: m, giro: gr, tono: pul }));
        if (k % 2) ps.push(a.caja(x, y, 0, 3.5, 1.2, 2.4, { mat: m, giro: gr, tono: pul })); else ps.push(a.caja(x + Math.cos(g) * 1.2, y + Math.sin(g) * 1.2, 0, 1.2, 3, 2.4, { mat: m, giro: gr + 45, tono: pul }));
      }
      // el piso de losas oscuras
      ps.push(a.cilindro(0, 0, 0, R1 + 6, 2, { mat: 'marmol_negro' }));
      for (let k = 0; k < 8; k++) { const g = (k / 8) * PI2; ps.push(a.caja(Math.cos(g) * (R1 + 4), Math.sin(g) * (R1 + 4), 0, 9, 7, 2.2, { mat: P, giro: deg(g), tono: jit(a, 0.06) })); }
      // velas en las puntas
      pts.forEach(([x, y]) => { const d = 1.15; ps.push(a.cilindro(x * d, y * d, 2, 1.4, 4 + a.r() * 3, { mat: 'cera', tono: -0.2 }), a.cilindro(x * d, y * d, 6.8, 0.6, 1.8, { mat: 'luz_vela' })); });
      ps.push(a.elipsoide(6, -4, 2, 6, 4, 0.4, { mat: 'sangre', giro: 30 }));
      return { piezas: ps, resplandor: { c: [0, 0, 2], r: 50, color: col } };
    },
  },
  // ------------------------------------------------------------------ pedestal del sello
  {
    id: 'inf_sello', nombre: ['Pedestal del sello', 'Seal pedestal'], tema: 'infierno', variantes: ['activo', 'inactivo'], huella: [3, 3], bloquea: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const activo = v === 'activo', ph = (f / 6) * PI2;
      const pent = (r: number, z: number): V3[] => Array.from({ length: 5 }, (_, k) => { const g = -Math.PI / 4 + (k / 5) * PI2; return [Math.cos(g) * r, Math.sin(g) * r, z]; });
      ps.push(a.poliedro([...pent(24, 0), ...pent(24, 5)], { mat: P }), a.poliedro([...pent(18, 5), ...pent(17, 11)], { mat: P, tono: 0.04 }));
      // cinco garras que abrazan el sello
      pent(14, 11).forEach((b, k) => {
        const g = -Math.PI / 4 + (k / 5) * PI2, m: V3 = [Math.cos(g) * 16, Math.sin(g) * 16, 30], t: V3 = [Math.cos(g) * 9, Math.sin(g) * 9, 46];
        ps.push(a.palo(b, m, 2.6, { mat: O, r1: 2 }), a.palo(m, t, 2, { mat: O, r1: 0.4 }));
      });
      ps.push(a.cilindro(0, 0, 11, 7, 16, { mat: O, r1: 5 }), a.cilindro(0, 0, 27, 5, 3, { mat: O, r1: 8 }));
      // el sello: un disco de canto mirando a la cámara
      const e: V3 = [Math.SQRT1_2, Math.SQRT1_2, 0];
      ps.push(a.cilindro(-e[0] * 1.5, -e[1] * 1.5, 39, 9, 3, { mat: H, eje: e }));
      ps.push(a.cilindro(e[0] * 1.4, e[1] * 1.4, 39, 7, 0.8, { mat: activo ? 'portal_rojo' : O, eje: e, tono: activo ? -0.05 + Math.sin(ph) * 0.12 : 0 }));
      // runa del sello (pentagrama chico)
      const pr = Array.from({ length: 5 }, (_, k) => { const g = Math.PI / 2 + (k / 5) * PI2; return [Math.cos(g) * 5.5, Math.sin(g) * 5.5] as [number, number]; });
      for (let k = 0; k < 5; k++) {
        const [u0, w0] = pr[k], [u1, w1] = pr[(k + 2) % 5];
        const p0: V3 = [e[0] * 2.3 - e[1] * u0, e[1] * 2.3 + e[0] * u0, 39 + w0], p1: V3 = [e[0] * 2.3 - e[1] * u1, e[1] * 2.3 + e[0] * u1, 39 + w1];
        ps.push(a.palo(p0, p1, 0.5, { mat: activo ? 'luz_vela' : 'negro', tono: activo ? 0.1 : 0 }));
      }
      if (activo) for (let k = 0; k < 4; k++) { const g = ph + (k / 4) * PI2; ps.push(a.caja(Math.cos(g) * 20, Math.sin(g) * 20, 34 + Math.sin(ph * 2 + k) * 4, 1.2, 1.2, 3, { mat: 'portal_rojo', tono: 0.15 })); }
      ps.push(a.cilindro(0, 0, 0, 30, 0.8, { mat: K }));
      return activo ? { piezas: ps, resplandor: { c: [e[0] * 4, e[1] * 4, 39], r: 34, color: '#ff4a2a' } } : ps;
    },
  },
  // ------------------------------------------------------------------ pilar de luz
  {
    id: 'inf_pilar_luz', nombre: ['Pilar de luz', 'Pillar of light'], tema: 'infierno', variantes: ['blanco', 'rojo'], huella: [2, 2], bloquea: false, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const m = v === 'blanco' ? 'infierno_luz' : 'portal_rojo', col = v === 'blanco' ? '#ffe0b0' : '#ff4a2a', ph = (f / 6) * PI2;
      ps.push(a.cilindro(0, 0, 0, 18, 3, { mat: P, r1: 16 }), a.cilindro(0, 0, 0, 13, 4, { mat: P, resta: true }));
      for (let k = 0; k < 6; k++) { const g = (k / 6) * PI2; ps.push(a.poliedro([[Math.cos(g) * 15, Math.sin(g) * 15, 3], [Math.cos(g + 0.3) * 15, Math.sin(g + 0.3) * 15, 3], [Math.cos(g + 0.15) * 17, Math.sin(g + 0.15) * 17, 3], [Math.cos(g + 0.15) * 15.5, Math.sin(g + 0.15) * 15.5, 14]], { mat: O })); }
      ps.push(a.cilindro(0, 0, 0, 11, 1.2, { mat: m, tono: 0.1 }));
      ps.push(a.cilindro(0, 0, 0, 10 + Math.sin(ph) * 0.6, 190, { mat: m, r1: 6, tono: -0.42 + Math.sin(ph) * 0.06 }));
      ps.push(a.palo([4.4, 4.4, 0], [2.6, 2.6, 190], 4.6, { mat: m, r1: 2.8, tono: 0.15 }), a.palo([5.6, 5.6, 0], [3.3, 3.3, 190], 2.4, { mat: m, r1: 1.4, tono: 0.35 }));
      for (let k = 0; k < 3; k++) { const z = ((f / 6 + k / 3) % 1) * 160 + 8; ps.push(a.cilindro(0, 0, z, 11 - z * 0.025, 2.2, { mat: m, tono: -0.15 })); }
      for (let k = 0; k < 4; k++) { const g = ph * 0.5 + (k / 4) * PI2, z = 10 + ((f + k * 3) % 6) * 9; ps.push(a.esfera(Math.cos(g) * 13, Math.sin(g) * 13, z, 0.9, { mat: m, tono: 0.2 })); }
      return { piezas: ps, resplandor: { c: [0, 0, 8], r: 36, color: col } };
    },
  },
));

registrar(...conEjes(
  // ------------------------------------------------------------------ estatua de demonio
  {
    id: 'inf_estatua_demonio', nombre: ['Estatua de demonio', 'Demon statue'], tema: 'infierno', variantes: ['entera', 'rota'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const rota = v === 'rota';
      const phi = (50 * Math.PI) / 180, G = deg(phi), mat = O;
      const q = (R: number, l: number, z: number) => frente(phi, R, l, z);
      ps.push(a.caja(0, 0, 0, 40, 40, 6, { mat: P, giro: G }), a.caja(0, 0, 6, 32, 32, 8, { mat: P, giro: G, tono: 0.04 }));
      for (let k = 0; k < 4; k++) { const c = frente(phi + (k * Math.PI) / 2 + Math.PI / 4, 21, 0, 14); craneo(a, ps, c[0], c[1], 16.5, 2.6, phi, -0.1); }
      const z0 = 14;
      // piernas de cabra
      for (const s of [-1, 1]) {
        const ca = q(-2, s * 6, z0 + 32), ro = q(6, s * 7, z0 + 18), to = q(-3, s * 7, z0 + 6), pe = q(1, s * 7, z0);
        ps.push(a.palo(ca, ro, 4.2, { mat, r1: 3 }), a.palo(ro, to, 2.8, { mat, r1: 2 }), a.palo(to, pe, 2, { mat, r1: 2.4 }), a.elipsoide(pe[0], pe[1], pe[2] + 1.5, 3.5, 2.5, 1.8, { mat, giro: G }));
      }
      // torso, pecho, cabeza
      const cad = q(-2, 0, z0 + 33); ps.push(a.elipsoide(cad[0], cad[1], cad[2], 7, 9, 6, { mat, giro: G }));
      const to = q(0, 0, z0 + 44); ps.push(a.elipsoide(to[0], to[1], to[2], 7.5, 11, 10, { mat, giro: G, tono: 0.03 }));
      const pe = q(3, 0, z0 + 47); ps.push(a.elipsoide(pe[0], pe[1], pe[2], 5, 9, 6, { mat, giro: G, tono: 0.06 }));
      const hd = q(3, 0, z0 + 59); ps.push(a.elipsoide(hd[0], hd[1], hd[2], 5, 4.6, 5.6, { mat, giro: G }));
      const ho = q(7, 0, z0 + 57); ps.push(a.elipsoide(ho[0], ho[1], ho[2], 2.6, 3.2, 2.6, { mat, giro: G }));
      for (const s of [-1, 1]) { const e = q(7.2, s * 2, z0 + 60); ps.push(a.esfera(e[0], e[1], e[2], 0.9, { mat: 'lava', tono: -0.1 })); }
      // cuernos
      for (const s of [-1, 1]) {
        if (rota && s === 1) { const b = q(1, s * 3.5, z0 + 63); ps.push(a.palo(b, q(-1, s * 6, z0 + 66), 1.8, { mat, r1: 1.4 })); continue; }
        const b = q(1, s * 3.5, z0 + 63), m = q(-4, s * 9, z0 + 70), t = q(-1, s * 11, z0 + 80);
        ps.push(a.palo(b, m, 2, { mat, r1: 1.4 }), a.palo(m, t, 1.4, { mat, r1: 0.3 }));
      }
      // brazos con garras
      for (const s of [-1, 1]) {
        const hom = q(0, s * 11, z0 + 50);
        if (rota && s === -1) { ps.push(a.esfera(hom[0], hom[1], hom[2], 3.5, { mat })); continue; }
        const co = q(5, s * 15, z0 + 38), mu = q(10, s * 12, z0 + 30);
        ps.push(a.esfera(hom[0], hom[1], hom[2], 3.6, { mat }), a.palo(hom, co, 2.8, { mat, r1: 2.2 }), a.palo(co, mu, 2.2, { mat, r1: 1.8 }));
        for (let k = -1; k <= 1; k++) { const g = q(13, s * 12 + k * 1.5, z0 + 26); ps.push(a.palo(mu, g, 0.7, { mat, r1: 0.2 })); }
      }
      // alas de murciélago: huesos y membrana
      for (const s of [-1, 1]) {
        if (rota && s === 1) { const b = q(-5, s * 6, z0 + 50); ps.push(a.palo(b, q(-9, s * 12, z0 + 58), 1.8, { mat, r1: 1 })); continue; }
        const b = q(-5, s * 6, z0 + 50), cod = q(-12, s * 22, z0 + 70), pu = q(-10, s * 40, z0 + 82);
        ps.push(a.palo(b, cod, 2, { mat, r1: 1.6 }), a.palo(cod, pu, 1.6, { mat, r1: 0.5 }));
        const dedos = [q(-11, s * 42, z0 + 58), q(-11, s * 36, z0 + 42), q(-9, s * 24, z0 + 36)];
        let prev = pu;
        for (const d of dedos) {
          ps.push(a.palo(cod, d, 0.9, { mat, r1: 0.4 }));
          ps.push(a.poliedro([cod, prev, d, q(-12.6, s * 22, z0 + 70), [prev[0] - Math.cos(phi) * 1.2, prev[1] - Math.sin(phi) * 1.2, prev[2]]], { mat: 'cuero', tono: -0.18 }));
          prev = d;
        }
        ps.push(a.poliedro([cod, prev, b, q(-6.5, s * 6, z0 + 50)], { mat: 'cuero', tono: -0.2 }));
      }
      // cola
      const c0 = q(-7, 0, z0 + 30), c1 = q(-16, 6, z0 + 18), c2 = q(-14, 16, z0 + 2);
      ps.push(a.palo(c0, c1, 1.8, { mat, r1: 1.3 }), a.palo(c1, c2, 1.3, { mat, r1: 0.8 }), a.poliedro([c2, [c2[0] + 2, c2[1], c2[2]], [c2[0], c2[1] + 2, c2[2]], [c2[0] + 1, c2[1] + 4, c2[2] - 1]], { mat }));
      if (rota) { ps.push(a.caja(14, 18, 0, 10, 8, 6, { mat, giro: 30, incl: 15 }), a.poliedro([[-20, 14, 0], [-12, 20, 0], [-16, 22, 0], [-16, 17, 5]], { mat })); ps.push(a.caja(0, 0, z0 + 40, 1.6, 30, 30, { mat, resta: true, giro: G + 20, incl: 30 })); }
      return ps;
    },
  },
  // ------------------------------------------------------------------ marco de cadenas
  {
    id: 'inf_cadenas', nombre: ['Marco de cadenas', 'Chain frame'], tema: 'infierno', variantes: ['cadenas', 'ganchos'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      costra(a, ps, 30);
      for (const s of [-1, 1]) {
        ps.push(a.caja(s * 30, 0, 0, 9, 9, 4, { mat: P }), a.caja(s * 30, 0, 4, 5, 5, 70, { mat: H }));
        ps.push(a.palo([s * 30, 0, 50], [s * 22, 0, 74], 1.6, { mat: H }));
        ps.push(a.palo([s * 30, 0, 4], [s * 40, s * 6, 0], 1.4, { mat: H }), a.palo([s * 30, 0, 4], [s * 38, -s * 8, 0], 1.4, { mat: H }));
      }
      ps.push(a.caja(0, 0, 72, 74, 6, 5, { mat: H }));
      for (let k = 0; k < 7; k++) ps.push(a.poliedro([[-36 + k * 12 - 1.5, -1.5, 77], [-36 + k * 12 + 1.5, -1.5, 77], [-36 + k * 12, 1.5, 77], [-36 + k * 12, 0, 84]], { mat: H, tono: 0.05 }));
      for (const s of [-1, 1]) ps.push(a.poliedro([[s * 37, -3, 72], [s * 37, 3, 72], [s * 37, -3, 77], [s * 37, 3, 77], [s * 44, 0, 80]], { mat: H }));
      const xs = [-22, -11, 0, 12, 23];
      xs.forEach((x, i) => {
        const L = 24 + a.r() * 34;
        const fin = cadena(a, ps, [x, 0, 72], L);
        if (v === 'ganchos') ps.push(a.palo(fin, [fin[0], fin[1], fin[2] - 4], 0.8, { mat: H }), a.palo([fin[0], fin[1], fin[2] - 4], [fin[0] + 3, fin[1], fin[2] - 2], 0.7, { mat: H, r1: 0.3 }));
        else if (i % 2 === 0) ps.push(a.cilindro(fin[0], fin[1], fin[2] - 3, 2.6, 2, { mat: H, eje: [0, 1, 0] }), a.cilindro(fin[0], fin[1] - 0.5, fin[2] - 3, 1.6, 3, { mat: H, resta: true, eje: [0, 1, 0] }));
      });
      if (v === 'ganchos') { const c = cadena(a, ps, [6, 0, 72], 20); craneo(a, ps, c[0] + 1, c[1], c[2] - 6, 3, Math.PI / 4, -0.05); }
      // cadenas sueltas en el suelo
      for (let i = 0; i < 6; i++) ps.push(a.elipsoide(-14 + i * 3, 8 + Math.sin(i) * 2, 0.6, 1.4, 0.6, 2.1, { mat: 'hierro', giro: i % 2 ? 0 : 90, incl: 90, inclEje: 'y' }));
      for (let i = 0; i < 4; i++) hueso(a, ps, [jit(a, 20), 10 + jit(a, 6), 0.8], [jit(a, 20), 10 + jit(a, 6), 0.8], 0.8, -0.05);
      return ps;
    },
  },
  // ------------------------------------------------------------------ muro de carne
  {
    id: 'inf_muro_carne', nombre: ['Muro de carne', 'Flesh wall'], tema: 'infierno', variantes: ['liso', 'costillas'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 80, 16, 80, { mat: 'carne', tono: -0.12 }));
      // bultos en el frente y arriba
      for (let i = 0; i < 12; i++) ps.push(a.elipsoide(-36 + a.r() * 72, 7, 6 + a.r() * 70, 6 + a.r() * 6, 3 + a.r() * 2, 5 + a.r() * 6, { mat: 'carne', tono: jit(a, 0.08) - 0.05 }));
      for (let i = 0; i < 8; i++) ps.push(a.elipsoide(-36 + i * 10.3 + jit(a, 2), jit(a, 3), 80, 7 + a.r() * 3, 9, 4 + a.r() * 5, { mat: 'carne', tono: jit(a, 0.06) - 0.06 }));
      for (let i = 0; i < 6; i++) ps.push(a.elipsoide(40.5, -6 + a.r() * 12, 6 + a.r() * 70, 2.5, 4 + a.r() * 3, 5 + a.r() * 5, { mat: 'carne', tono: -0.08 }));
      // venas que se ramifican por la cara
      for (let i = 0; i < 6; i++) {
        let p: V3 = [-36 + a.r() * 72, 9.5, 0];
        for (let k = 0; k < 5; k++) {
          const q: V3 = [p[0] + jit(a, 9), 9.5 + a.r() * 1.5, p[2] + 9 + a.r() * 9];
          if (q[2] > 82) break;
          ps.push(a.palo(p, q, 1.1 - k * 0.12, { mat: 'infierno_vena', r1: 0.9 - k * 0.12 }));
          if (a.r() < 0.4) ps.push(a.palo(q, [q[0] + jit(a, 8), 9.8, q[2] + 6], 0.6, { mat: 'infierno_vena' }));
          p = q;
        }
      }
      // pústulas y sangre que chorrea
      for (let i = 0; i < 5; i++) ps.push(a.esfera(-34 + a.r() * 68, 9.5, 10 + a.r() * 60, 1.4 + a.r() * 1.4, { mat: 'baba', tono: -0.1 }));
      for (let i = 0; i < 4; i++) { const x = -34 + a.r() * 68, z = 30 + a.r() * 40; ps.push(a.palo([x, 10, z], [x + jit(a, 1), 10.2, z - 12 - a.r() * 14], 0.7, { mat: 'sangre', r1: 0.5 })); }
      if (v === 'costillas') {
        for (let k = 0; k < 6; k++) {
          const z = 20 + k * 8;
          for (const s of [-1, 1]) {
            const b: V3 = [s * 2, 9, z + 6], m: V3 = [s * (12 + Math.min(k, 5 - k) * 2), 15, z], e: V3 = [s * (20 + Math.min(k, 5 - k) * 2.5), 9, z - 4];
            ps.push(a.palo(b, m, 1.3, { mat: 'hueso', r1: 1.1, tono: -0.05 }), a.palo(m, e, 1.1, { mat: 'hueso', r1: 0.8, tono: -0.05 }));
          }
        }
        ps.push(a.palo([0, 10, 14], [0, 10, 70], 2, { mat: 'hueso', tono: -0.08 }));
        craneo(a, ps, 0, 11, 74, 5, Math.PI / 2, -0.05);
      } else {
        // un ojo entre la carne
        ps.push(a.elipsoide(-12, 9, 46, 6, 3, 4, { mat: 'carne', tono: 0.05 }), a.esfera(-12, 10.6, 46, 3, { mat: 'hueso', tono: 0.1 }), a.esfera(-11.6, 13.2, 46, 1.4, { mat: 'negro' }));
      }
      ps.push(a.elipsoide(0, 12, 0.4, 30, 6, 0.6, { mat: 'sangre' }));
      return ps;
    },
  },
  // ------------------------------------------------------------------ cerca de pinchos
  {
    id: 'inf_cerca_pinchos', nombre: ['Cerca de pinchos', 'Spiked iron fence'], tema: 'infierno', variantes: ['entera', 'torcida'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const torcida = v === 'torcida';
      ps.push(a.caja(0, 0, 0, 84, 10, 5, { mat: P }), a.caja(0, 0, 5, 82, 8, 1.2, { mat: P, tono: 0.06 }));
      for (const s of [-1, 1]) ps.push(a.caja(s * 39, 0, 5, 6, 6, 52, { mat: H }), a.poliedro([[s * 39 - 3, -3, 57], [s * 39 + 3, -3, 57], [s * 39 - 3, 3, 57], [s * 39 + 3, 3, 57], [s * 39, 0, 66]], { mat: H }));
      for (let i = 0; i < 9; i++) {
        const x = -32 + i * 8;
        if (torcida && i === 5) continue;
        const h = 44 + (i % 2) * 5;
        let top: V3 = [x, 0, h];
        if (torcida && (i === 4 || i === 6)) { const m: V3 = [x, 0, 24]; top = [x + (i === 4 ? -6 : 7), 8, h - 6]; ps.push(a.palo([x, 0, 5], m, 1, { mat: H }), a.palo(m, top, 1, { mat: H })); }
        else ps.push(a.palo([x, 0, 5], top, 1, { mat: H }));
        const d: V3 = [top[0] - x, top[1], top[2] - (torcida && (i === 4 || i === 6) ? 24 : 5)], L = Math.hypot(...d), u: V3 = [d[0] / L, d[1] / L, d[2] / L];
        ps.push(a.poliedro([[top[0] - 2, top[1] - 1, top[2]], [top[0] + 2, top[1] - 1, top[2]], [top[0] - 2, top[1] + 1, top[2]], [top[0] + 2, top[1] + 1, top[2]], [top[0] + u[0] * 8, top[1] + u[1] * 8, top[2] + u[2] * 8]], { mat: H, tono: 0.05 }));
        ps.push(a.poliedro([[top[0] - 2.5, top[1], top[2] + 2], [top[0] + 2.5, top[1], top[2] + 2], [top[0], top[1] - 1, top[2] - 1], [top[0], top[1] + 1, top[2] - 1]], { mat: H }));
      }
      for (const z of [16, 38]) {
        if (torcida && z === 38) { ps.push(a.caja(-18, 0, z, 44, 2, 2.5, { mat: H }), a.caja(24, 2, z - 6, 24, 2, 2.5, { mat: H, incl: 0, giro: 8 })); continue; }
        ps.push(a.caja(0, 0, z, 80, 2, 2.5, { mat: H }));
      }
      craneo(a, ps, -16, 0, 49, 3, Math.PI / 2, -0.05);
      if (!torcida) craneo(a, ps, 16, 0, 49, 3, Math.PI / 3, -0.05);
      ps.push(a.palo([-16, 0, 46], [-16.2, 0.5, 30], 0.5, { mat: 'sangre' }));
      return ps;
    },
  },
  // ------------------------------------------------------------------ jaula con alma ardiendo
  {
    id: 'inf_jaula_alma', nombre: ['Jaula del alma en llamas', 'Burning soul cage'], tema: 'infierno', variantes: ['colgante', 'en_piso'], huella: [2, 2], bloquea: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const ph = (f / 6) * PI2;
      const z0 = v === 'colgante' ? 26 : 0;
      if (v === 'colgante') {
        ps.push(a.caja(-22, -14, 0, 8, 8, 3, { mat: P }), a.caja(-22, -14, 3, 4, 4, 100, { mat: H }), a.palo([-22, -14, 101], [2, 1.3, 101], 1.8, { mat: H }));
        ps.push(a.palo([-22, -14, 80], [-10, -7, 100], 1.2, { mat: H }));
        cadena(a, ps, [0, 0, 100], 26);
        costra(a, ps, 18);
      } else ps.push(a.cilindro(0, 0, 0, 15, 2, { mat: P }));
      // la jaula
      ps.push(a.cilindro(0, 0, z0, 11, 2, { mat: H }), a.cilindro(0, 0, z0 + 40, 11, 2, { mat: H }), a.cilindro(0, 0, z0 + 42, 11, 6, { mat: H, r1: 2 }), a.cilindro(0, 0, z0 + 48, 1.6, 4, { mat: H }));
      for (let k = 0; k < 12; k++) { const g = (k / 12) * PI2; ps.push(a.palo([Math.cos(g) * 10.5, Math.sin(g) * 10.5, z0 + 2], [Math.cos(g) * 10.5, Math.sin(g) * 10.5, z0 + 40], 0.75, { mat: H })); }
      ps.push(a.cilindro(0, 0, z0 + 20, 10.9, 1.2, { mat: H }));
      // el alma: silueta de fuego con los brazos en los barrotes
      const am = 'fuego', sw = Math.sin(ph) * 0.8;
      ps.push(a.elipsoide(sw * 0.4, 0, z0 + 14, 3.2, 2.6, 8, { mat: am, tono: -0.12 }));
      ps.push(a.esfera(sw * 0.6, 0, z0 + 26, 2.8, { mat: am, tono: 0.05 }));
      for (const s of [-1, 1]) {
        ps.push(a.palo([sw * 0.4 + s * 2, -s * 2, z0 + 20], [s * 7.5, -s * 7.5, z0 + 30], 1, { mat: am, tono: -0.05 }));
        ps.push(a.palo([s * 1.2, -s * 1.2, z0 + 8], [s * 2.4, -s * 2.4, z0 + 2], 1.2, { mat: am, tono: -0.15 }));
      }
      for (let k = 0; k < 4; k++) { const g = (k / 4) * PI2 + f * 0.6; ps.push(a.cilindro(Math.cos(g) * 2.5, Math.sin(g) * 2.5, z0 + 22, 2.2 - k * 0.3, 10 + Math.sin(ph + k * 1.7) * 4, { mat: am, r1: 0.2, tono: 0.1 })); }
      ps.push(a.cilindro(0, 0, z0 + 2, 6, 3, { mat: am, r1: 2, tono: 0.15 }));
      return { piezas: ps, resplandor: { c: [0, 0, z0 + 20], r: 34, color: '#ff7a2a' } };
    },
  },
  // ------------------------------------------------------------------ la forja del infierno
  {
    id: 'inf_forja', nombre: ['Forja infernal', 'Hellforge'], tema: 'infierno', variantes: ['activa', 'apagada'], huella: [5, 3], bloquea: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const activa = v === 'activa', ph = (f / 6) * PI2;
      costra(a, ps, 40);
      // bloque de la forja con su pileta de lava
      ps.push(a.caja(-6, 0, 0, 66, 40, 24, { mat: P }), a.caja(-6, 0, 24, 70, 44, 3, { mat: P, tono: 0.06 }));
      ps.push(a.caja(-18, 0, 15, 34, 30, 14, { mat: P, resta: true }));
      ps.push(a.caja(-18, 0, 15, 34, 30, 10, { mat: activa ? 'lava' : K, tono: activa ? -0.05 + Math.sin(ph) * 0.1 : 0 }));
      if (activa) for (let i = 0; i < 4; i++) { const fase = (f + i * 1.5) % 6; ps.push(a.elipsoide(-30 + i * 8, jit(a, 8), 25, 3 + (i % 2) * 2, 2, 0.4, { mat: 'lava', tono: 0.25 - fase * 0.04 })); }
      else for (let i = 0; i < 3; i++) ps.push(a.caja(-28 + i * 10, jit(a, 6), 24.5, 6, 1, 0.6, { mat: 'lava', giro: a.r() * 180, tono: -0.25 }));
      // boca de la forja con fuelle de cuernos
      ps.push(a.caja(-6, 20.5, 6, 14, 2, 10, { mat: P, resta: true }), a.caja(-6, 19.5, 6, 13, 1, 9, { mat: activa ? 'fuego' : 'negro', tono: activa ? -0.1 : 0 }));
      for (const s of [-1, 1]) { const b: V3 = [-6 + s * 30, -20, 27], m: V3 = [-6 + s * 38, -26, 44], t: V3 = [-6 + s * 34, -20, 60]; ps.push(a.palo(b, m, 3.4, { mat: O, r1: 2.4 }), a.palo(m, t, 2.4, { mat: O, r1: 0.5 })); }
      craneo(a, ps, -6, -16, 32, 6, Math.PI / 4, -0.1);
      // yunque sobre un tocón de hierro
      const ax = 18, ay = 2;
      ps.push(a.caja(ax, ay, 27, 12, 10, 4, { mat: H }), a.caja(ax, ay, 31, 7, 6, 6, { mat: H }), a.caja(ax, ay, 37, 20, 8, 5, { mat: H, tono: 0.08 }));
      ps.push(a.poliedro([[ax + 10, ay - 4, 37], [ax + 10, ay + 4, 37], [ax + 10, ay - 4, 42], [ax + 10, ay + 4, 42], [ax + 19, ay, 41]], { mat: H, tono: 0.08 }));
      ps.push(a.caja(ax - 3, ay, 42, 8, 3, 1.2, { mat: activa ? 'lava' : 'hierro_oxido', tono: activa ? 0.05 : 0 }));
      // martillo apoyado y tenazas
      ps.push(a.palo([ax + 14, ay + 22, 0], [ax + 10, ay + 22, 22], 1, { mat: 'madera_vieja' }), a.caja(ax + 10, ay + 22, 22, 8, 4, 4, { mat: H, giro: 20 }));
      ps.push(a.palo([ax - 8, ay + 4, 42.5], [ax + 6, ay - 2, 43.5], 0.6, { mat: H }), a.palo([ax - 8, ay + 5, 42.5], [ax + 6, ay - 1, 43.5], 0.6, { mat: H }));
      // cadenas que cuelgan del borde y huesos
      cadena(a, ps, [26, -20, 26], 14);
      for (let i = 0; i < 3; i++) hueso(a, ps, [30 + jit(a, 6), 18 + jit(a, 4), 0.8], [30 + jit(a, 8), 18 + jit(a, 6), 0.8], 0.8, -0.05);
      return activa ? { piezas: ps, resplandor: { c: [-18, 0, 30], r: 50, color: '#ff6a20' } } : ps;
    },
  },
  // ------------------------------------------------------------------ portal rojo
  {
    id: 'inf_portal_rojo', nombre: ['Portal rojo', 'Red portal'], tema: 'infierno', variantes: ['abierto', 'marco', 'cerrado'], huella: [3, 2], bloquea: false, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const ph = (f / 6) * PI2;
      const e: V3 = [Math.SQRT1_2, Math.SQRT1_2, 0], u: V3 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
      const at = (l: number, z: number, d = 0): V3 => [u[0] * l + e[0] * d, u[1] * l + e[1] * d, z];
      const zc = 34;
      if (v !== 'abierto') {
        // marco de obsidiana con cuernos
        ps.push(a.caja(0, 0, 0, 52, 20, 5, { mat: P, giro: -45 }));
        for (const s of [-1, 1]) {
          const b = at(s * 20, 5);
          ps.push(a.caja(b[0], b[1], 5, 8, 9, 48, { mat: O, giro: -45 }));
          const t = at(s * 20, 53), m = at(s * 30, 70), p = at(s * 26, 88);
          ps.push(a.palo(t, m, 3, { mat: O, r1: 2 }), a.palo(m, p, 2, { mat: O, r1: 0.4 }));
        }
        ps.push(a.poliedro([at(-24, 53, -4), at(24, 53, -4), at(-24, 53, 4), at(24, 53, 4), at(0, 74, -4), at(0, 74, 4)], { mat: O }));
        ps.push(a.poliedro([at(-16, 52, -6), at(16, 52, -6), at(-16, 52, 6), at(16, 52, 6), at(0, 66, -6), at(0, 66, 6)], { mat: O, resta: true }));
        craneo(a, ps, ...at(0, 64, 4).slice(0, 2) as [number, number], 64, 3.6, Math.PI / 4, -0.1);
      }
      if (v === 'cerrado') {
        ps.push(a.caja(0, 0, 5, 32, 3, 50, { mat: O, giro: -45, tono: -0.1 }));
        for (let k = 0; k < 4; k++) ps.push(a.caja(...(at(-9 + k * 6, 0, 1.8).slice(0, 2) as [number, number]), 18 + (k % 2) * 8, 2, 1, 10, { mat: 'lava', giro: -45, tono: -0.3 }));
        return ps;
      }
      // el óvalo del portal: capas de luz roja que giran
      const rx = 14, rz = 24;
      ps.push(a.elipsoide(0, 0, zc, rx + 2, 1.6, rz + 2, { mat: 'portal_rojo', giro: -45, tono: -0.28 }));
      ps.push(a.elipsoide(0, 0, zc, rx, 2.2, rz, { mat: 'portal_rojo', giro: -45, tono: -0.12 + Math.sin(ph) * 0.05 }));
      for (let k = 0; k < 5; k++) {
        const g = ph + (k / 5) * PI2, r = 6 + (k % 2) * 3;
        const c = at(Math.cos(g) * r * 0.8, zc + Math.sin(g) * r * 1.4, 1.4);
        ps.push(a.elipsoide(c[0], c[1], c[2], 4.5, 1, 2.2, { mat: 'portal_rojo', giro: -45, incl: deg(g), inclEje: 'y', tono: 0.08 + (k % 2) * 0.1 }));
      }
      ps.push(a.elipsoide(...(at(0, zc, 1.6).slice(0, 2) as [number, number]), zc, 5, 1, 9, { mat: 'portal_rojo', giro: -45, tono: 0.3 }));
      if (v === 'abierto') ps.push(a.elipsoide(0, 0, 0.5, 14, 14, 0.5, { mat: 'portal_rojo', tono: -0.3 }));
      return { piezas: ps, resplandor: { c: [e[0] * 6, e[1] * 6, zc], r: 44, color: '#ff3a2a' } };
    },
  },
));
