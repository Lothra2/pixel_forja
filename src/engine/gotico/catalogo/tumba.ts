import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido } from '../render';

// Tumbas del desierto: muros tallados con bandas de signos, columnas, guardianes con cabeza de chacal,
// sarcófagos, trampas, braseros, el altar del báculo y la gran entrada.
const junta = (v: number, paso: number) => { const m = ((v % paso) + paso) % paso; return m < 1 ? 1 : 0; };
/** Sillares grandes de tumba (hiladas altas y juntas finas). */
const sillares = (largo: number, alto: number) => (p: V3, n: V3) => {
  if (Math.abs(n[2]) > 0.7) return junta(p[0] + (Math.floor(p[1] / alto) % 2) * largo * 0.5, largo) || junta(p[1], alto) ? -0.22 : 0;
  const fila = Math.floor(p[2] / alto), corre = (fila % 2) * largo * 0.5, u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
  if (junta(p[2], alto) || junta(u + corre, largo)) return -0.24;
  return (ruido(Math.floor((u + corre) / largo) * 1.7, fila * 2.3, 5) - 0.5) * 0.14;
};
MATERIALES.tumba_sillar = { rampa: ['#19130d', '#2a2017', '#3d2f21', '#52402d', '#68523a', '#7f6548', '#957858'], ruido: 0.26, escala: 0.16, patron: sillares(24, 12) };
MATERIALES.tumba_liso = { rampa: ['#19130d', '#2a2017', '#3d2f21', '#52402d', '#68523a', '#7f6548', '#957858'], ruido: 0.24, escala: 0.12 };
MATERIALES.tumba_pintura = { rampa: ['#0c1416', '#132126', '#1b3036', '#244047', '#2e5058', '#3a616a'], ruido: 0.2, escala: 0.2 };

const PI = Math.PI;
/** Montón de arena bajo (cáscara de poca altura). */
function duna(a: Arma, x: number, y: number, rx: number, ry: number, h = 2.5): Pieza {
  const pts: V3[] = [];
  for (let i = 0; i < 10; i++) { const t = (i / 10) * PI * 2, k = 0.85 + a.r() * 0.2; pts.push([x + Math.cos(t) * rx * k, y + Math.sin(t) * ry * k, 0], [x + Math.cos(t) * rx * k * 0.5, y + Math.sin(t) * ry * k * 0.5, h]); }
  return a.poliedro(pts, { mat: 'arena', tono: -0.14 });
}

/** Banda de signos tallados en una cara: tira saliente y muescas (palitos, ojos, soles, pájaros). Cara +y (eje 'x') o +x (eje 'y'). */
function glifos(a: Arma, ps: Pieza[], u0: number, u1: number, cara: number, z: number, alto: number, eje: 'x' | 'y' = 'x', mat = 'tumba_liso') {
  const C = (u: number, w: number, zz: number, h: number, d: number, o: { mat: string; tono?: number; resta?: boolean }) =>
    ps.push(eje === 'x' ? a.caja(u, cara, zz, w, d, h, o) : a.caja(cara, u, zz, d, w, h, o));
  C((u0 + u1) / 2, u1 - u0, z - 1, alto + 2, 1.6, { mat, tono: 0.08 });
  C((u0 + u1) / 2, u1 - u0, z - 1.6, 0.8, 2, { mat, tono: -0.2 });
  C((u0 + u1) / 2, u1 - u0, z + alto + 1, 0.8, 2, { mat, tono: -0.2 });
  let u = u0 + 2.5;
  const cav = { mat: 'negro', resta: true };
  while (u < u1 - 3) {
    const t = a.r();
    if (t < 0.3) { C(u, 1.6, z + 1, alto - 2, 2.4, cav); u += 3.2; }
    else if (t < 0.5) { C(u + 0.6, 3.2, z + alto * 0.45, 1.4, 2.4, cav); C(u, 1.4, z + 1, alto * 0.4, 2.4, cav); u += 4.6; }
    else if (t < 0.7) { ps.push(eje === 'x' ? a.cilindro(u + 1, cara - 1.5, z + alto / 2, 1.6, 3, { ...cav, eje: [0, 1, 0] }) : a.cilindro(cara - 1.5, u + 1, z + alto / 2, 1.6, 3, { ...cav, eje: [1, 0, 0] })); u += 4.4; }
    else if (t < 0.85) { C(u + 1, 3.4, z + alto * 0.55, 1.4, 2.4, cav); C(u + 2, 1.2, z + 1, alto * 0.55, 2.4, cav); C(u - 0.2, 1.2, z + alto * 0.7, 1.6, 2.4, cav); u += 5; }
    else { C(u + 1, 3, z + 1, 1.2, 2.4, cav); C(u + 1, 3, z + alto - 2.2, 1.2, 2.4, cav); u += 4.4; }
  }
}
/** Llama de tres lenguas que se mueve con el cuadro. */
function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, f: number, mat = 'fuego', n = 6) {
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * PI * 2 + f * 0.9, fr = Math.sin((f / n) * PI * 2 + k * 2.1);
    ps.push(a.cilindro(x + Math.cos(ang) * s * 0.35, y + Math.sin(ang) * s * 0.35, z, s * (0.55 - k * 0.08), s * (1.5 + fr * 0.4 + k * 0.3), { mat, r1: 0.2 }));
  }
  ps.push(a.elipsoide(x, y, z + s * 0.25, s * 0.7, s * 0.7, s * 0.45, { mat, tono: 0.2 }));
}
/** Cabeza de chacal mirando a lo largo de `g` (grados): cráneo, hocico largo, orejas altas y tocado. */
function chacal(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, g: number, mat = 'marmol_negro', tocado = true) {
  const c = Math.cos((g * PI) / 180), sn = Math.sin((g * PI) / 180);
  const L = (f: number, l: number, h: number): V3 => [x + c * f - sn * l, y + sn * f + c * l, z + h];
  if (tocado) ps.push(a.poliedro([L(-1, -4.2 * s, 2 * s), L(-1, 4.2 * s, 2 * s), L(-3.5 * s, -5.2 * s, -6 * s), L(-3.5 * s, 5.2 * s, -6 * s), L(0.5 * s, -4.6 * s, -6 * s), L(0.5 * s, 4.6 * s, -6 * s), L(-3 * s, 0, 3.2 * s)], { mat: 'tumba_pintura' }));
  ps.push(a.elipsoide(x, y, z, 3.2 * s, 3 * s, 3.2 * s, { mat, giro: g }));
  const h = L(4.2 * s, 0, -1 * s);
  ps.push(a.elipsoide(h[0], h[1], h[2], 3.8 * s, 1.5 * s, 1.6 * s, { mat, giro: g, incl: 0 }));
  const nz = L(7.6 * s, 0, -1.2 * s);
  ps.push(a.esfera(nz[0], nz[1], nz[2], 0.7 * s, { mat: 'negro' }));
  for (const k of [-1, 1]) {
    ps.push(a.poliedro([L(-1.2 * s, k * 1 * s, 2 * s), L(0.6 * s, k * 1.2 * s, 2.2 * s), L(-0.8 * s, k * 2.8 * s, 1.6 * s), L(-0.6 * s, k * 1.8 * s, 7.5 * s), L(-0.2 * s, k * 1.9 * s, 2 * s)], { mat }));
    const o = L(1.6 * s, k * 1.5 * s, 0.6 * s);
    ps.push(a.esfera(o[0], o[1], o[2], 0.55 * s, { mat: 'oro', tono: 0.1 }));
  }
}
/** Jarra de canopo con tapa de cabeza. */
function canopo(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, tapa: number, mat = 'marmol') {
  ps.push(a.cilindro(x, y, z, 2.4 * s, 2 * s, { mat, r1: 3.2 * s }), a.cilindro(x, y, z + 2 * s, 3.2 * s, 6 * s, { mat, r1: 2.6 * s }));
  ps.push(a.cilindro(x, y, z + 4 * s, 3.05 * s, 1.6 * s, { mat: 'tumba_pintura', r1: 2.85 * s }));
  const zt = z + 8 * s;
  ps.push(a.cilindro(x, y, zt, 2.6 * s, 0.8 * s, { mat, tono: -0.05 }));
  if (tapa === 0) chacal(a, ps, x, y, zt + 2.2 * s, 0.6 * s, 90, mat, false);
  else if (tapa === 1) { ps.push(a.esfera(x, y, zt + 2.4 * s, 2.2 * s, { mat })); ps.push(a.poliedro([[x - 0.8 * s, y + 1.6 * s, zt + 2.8 * s], [x + 0.8 * s, y + 1.6 * s, zt + 2.8 * s], [x, y + 4 * s, zt + 1.6 * s], [x, y + 1.6 * s, zt + 1.4 * s]], { mat: 'oro' })); }
  else if (tapa === 2) { ps.push(a.elipsoide(x, y, zt + 2.4 * s, 2.4 * s, 2.2 * s, 2.4 * s, { mat })); ps.push(a.elipsoide(x, y + 1.6 * s, zt + 1.8 * s, 1.5 * s, 1.2 * s, 1.1 * s, { mat, tono: -0.08 })); }
  else { ps.push(a.poliedro([[x - 2.6 * s, y - 1, zt], [x + 2.6 * s, y - 1, zt], [x - 2.2 * s, y + 1, zt], [x + 2.2 * s, y + 1, zt], [x, y, zt + 4 * s]], { mat: 'tumba_pintura' }), a.elipsoide(x, y + 0.6, zt + 2.6 * s, 1.8 * s, 1.8 * s, 2.2 * s, { mat: 'oro' })); }
}

registrar(
  {
    id: 'tum_muro', nombre: ['Muro de tumba', 'Tomb wall'], tema: 'tumba', variantes: ['liso', 'signos', 'nicho', 'roto'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const L = 80, T = 14, H = 100;
      ps.push(a.caja(0, 0, 0, L, T + 4, 6, { mat: 'tumba_liso', tono: -0.08 }), a.caja(0, 0, 0, L, T, H, { mat: 'tumba_sillar' }));
      // cornisa de gola
      ps.push(a.caja(0, 0, H, L, T + 2, 3, { mat: 'tumba_liso', tono: 0.05 }), a.poliedro([[-L / 2, -T / 2 - 1, H + 3], [L / 2, -T / 2 - 1, H + 3], [-L / 2, T / 2 + 1, H + 3], [L / 2, T / 2 + 1, H + 3], [-L / 2, -T / 2 - 4, H + 9], [L / 2, -T / 2 - 4, H + 9], [-L / 2, T / 2 + 4, H + 9], [L / 2, T / 2 + 4, H + 9]], { mat: 'tumba_liso', tono: 0.02 }));
      for (let i = 0; i < 10; i++) ps.push(a.caja(-L / 2 + 4 + i * 8, T / 2 + 2.5, H + 4, 3, 2, 5, { mat: 'tumba_pintura', tono: i % 2 ? 0.05 : -0.05 }));
      if (v === 'signos') { glifos(a, ps, -L / 2 + 3, L / 2 - 3, T / 2, 70, 12); glifos(a, ps, -L / 2 + 3, L / 2 - 3, T / 2, 46, 10); glifos(a, ps, -L / 2 + 3, L / 2 - 3, T / 2, 22, 10); }
      else glifos(a, ps, -L / 2 + 3, L / 2 - 3, T / 2, 74, 10);
      if (v === 'nicho') {
        ps.push(a.caja(0, T / 2, 8, 26, 14, 52, { mat: 'negro', resta: true }), a.poliedro([[-13, T / 2 - 7, 60], [13, T / 2 - 7, 60], [-13, T / 2 + 1, 60], [13, T / 2 + 1, 60], [0, T / 2 - 7, 66], [0, T / 2 + 1, 66]], { mat: 'negro', resta: true }));
        // una momia de pie en el nicho
        ps.push(a.elipsoide(0, 1, 30, 6, 4, 20, { mat: 'tela', tono: -0.1 }), a.elipsoide(0, 1.5, 52, 3.4, 3.2, 4.2, { mat: 'tela', tono: -0.06 }));
        for (const z of [18, 26, 34, 42]) ps.push(a.cilindro(0, 1, z, 5.8 - Math.abs(z - 30) * 0.06, 0.9, { mat: 'cuerda', tono: -0.1 }));
        ps.push(a.elipsoide(0, 3.6, 52, 1.6, 1, 1.4, { mat: 'negro' }));
      }
      if (v === 'roto') {
        ps.push(a.poliedro([[14, -T, H + 12], [L / 2 + 2, -T, H + 12], [14, T, H + 12], [L / 2 + 2, T, H + 12], [L / 2 + 2, -T, 30], [L / 2 + 2, T, 44], [26, 0, 70]], { mat: 'negro', resta: true }));
        for (let i = 0; i < 7; i++) ps.push(a.caja(20 + a.r() * 24, T / 2 + 4 + a.r() * 12, 0, 8 + a.r() * 8, 6 + a.r() * 5, 4 + a.r() * 5, { mat: 'tumba_sillar', giro: a.r() * 60 - 30, incl: (a.r() - 0.5) * 20 }));
      }
      ps.push(duna(a, -L / 2 + 10 + a.r() * 60, T / 2 + 3, 12, 4, 3));
      return ps;
    },
  },
  {
    id: 'tum_columna', nombre: ['Columna tallada', 'Carved column'], tema: 'tumba', variantes: ['papiro', 'pintada', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const H = v === 'rota' ? 40 + a.r() * 16 : 92;
      ps.push(a.cilindro(0, 0, 0, 12, 5, { mat: 'tumba_liso', r1: 11, tono: -0.05 }));
      ps.push(a.cilindro(0, 0, 5, 7, 4, { mat: 'tumba_liso', r1: 8.5 }));
      // fuste de haces
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * PI * 2; ps.push(a.cilindro(Math.cos(ang) * 4.6, Math.sin(ang) * 4.6, 9, 3.4, H - 9 - (v === 'rota' ? (k % 3) * 4 : 0), { mat: 'tumba_liso', r1: 2.8, tono: k % 2 ? -0.04 : 0.03 })); }
      ps.push(a.cilindro(0, 0, 9, 6.4, H - 9, { mat: 'tumba_liso', r1: 5.4 }));
      // anillos atados
      for (const z of [v === 'rota' ? 18 : 60, 64, 68]) if (z < H - 2) ps.push(a.cilindro(0, 0, z, 8.3 - (z - 60) * 0.05, 2, { mat: v === 'pintada' ? 'tumba_pintura' : 'tumba_liso', tono: 0.06 }));
      if (v === 'pintada') {
        for (const [z, m] of [[20, 'tela_roja'], [24, 'tumba_pintura'], [28, 'oro']] as [number, string][]) ps.push(a.cilindro(0, 0, z, 8.4, 2.4, { mat: m, r1: 8.3, tono: -0.1 }));
        glifos(a, ps, -4, 4, 8.5, 32, 22, 'y', 'tumba_liso');
      }
      if (v !== 'rota') {
        // capitel de campana y ábaco
        ps.push(a.cilindro(0, 0, H, 7.6, 10, { mat: 'tumba_liso', r1: 13 }));
        for (let k = 0; k < 8; k++) { const ang = (k / 8) * PI * 2; ps.push(a.palo([Math.cos(ang) * 7.4, Math.sin(ang) * 7.4, H + 1], [Math.cos(ang) * 12.6, Math.sin(ang) * 12.6, H + 9.5], 1.1, { mat: v === 'pintada' ? 'tumba_pintura' : 'tumba_liso', tono: -0.12 })); }
        ps.push(a.caja(0, 0, H + 10, 22, 22, 6, { mat: 'tumba_sillar', tono: 0.04 }));
      } else {
        ps.push(a.poliedro([[-9, -9, H - 8], [9, -9, H - 3], [-9, 9, H - 5], [9, 9, H + 2], [0, 0, H + 5]], { mat: 'negro', resta: true }));
        ps.push(a.cilindro(12, 10, 7, 7, 18, { mat: 'tumba_liso', eje: [0.6, 0.8, 0.05] }), a.caja(-16, 10, 0, 22, 22, 6, { mat: 'tumba_sillar', giro: 25, incl: 8 }));
        ps.push(duna(a, 4, 12, 16, 8, 3));
      }
      return ps;
    },
  },
  {
    id: 'tum_guardian', nombre: ['Guardián con cabeza de chacal', 'Jackal-headed guardian'], tema: 'tumba', variantes: ['de_pie', 'echado', 'sin_cabeza'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const m = 'marmol_negro';
      if (v === 'echado') {
        ps.push(a.caja(0, 0, 0, 46, 22, 14, { mat: 'tumba_sillar' }), a.caja(0, 0, 14, 48, 24, 3, { mat: 'tumba_liso', tono: 0.05 }));
        glifos(a, ps, -21, 21, 11, 4, 7);
        const z = 17;
        ps.push(a.elipsoide(-6, 0, z + 7, 14, 6, 7, { mat: m }), a.elipsoide(-14, 0, z + 6, 7, 7, 7.5, { mat: m }));
        for (const s of [-1, 1]) { ps.push(a.caja(10, s * 3.5, z, 16, 3, 3, { mat: m }), a.caja(-12, s * 5.5, z, 12, 3, 4, { mat: m, tono: -0.03 })); }
        ps.push(a.palo([-20, 0, z + 3], [-24, 3, z + 0.6], 1.6, { mat: m, r1: 1 }), a.palo([-24, 3, z + 0.6], [-14, 8, z + 0.6], 1, { mat: m }));
        ps.push(a.palo([4, 0, z + 9], [10, 0, z + 18], 3.6, { mat: m, r1: 3 }));
        ps.push(a.elipsoide(6, 0, z + 9, 3, 6, 4, { mat: 'oro', tono: -0.1 }));
        chacal(a, ps, 11, 0, z + 21, 1.15, 0, m, false);
        return ps;
      }
      ps.push(a.caja(0, 0, 0, 28, 24, 12, { mat: 'tumba_sillar' }), a.caja(0, 0, 12, 30, 26, 3, { mat: 'tumba_liso', tono: 0.05 }));
      glifos(a, ps, -12, 12, 12, 3, 6);
      const z0 = 15;
      // piernas (una adelantada), faldellín, torso, brazos y báculo
      ps.push(a.caja(-3.6, 3, z0, 4.4, 8, 3, { mat: m }), a.caja(3.6, -1, z0, 4.4, 8, 3, { mat: m }));
      ps.push(a.caja(-3.6, 2, z0, 4, 4.4, 26, { mat: m, incl: 6 }), a.caja(3.6, -1, z0, 4, 4.4, 26, { mat: m }));
      ps.push(a.poliedro([[-8, -4, z0 + 20], [8, -4, z0 + 20], [-8, 4.5, z0 + 20], [8, 4.5, z0 + 20], [-6.5, -3.5, z0 + 33], [6.5, -3.5, z0 + 33], [-6.5, 3.5, z0 + 33], [6.5, 3.5, z0 + 33], [0, 6, z0 + 20]], { mat: 'oro', tono: -0.12 }));
      ps.push(a.caja(0, 0, z0 + 31, 13.5, 7.6, 2.4, { mat: 'tumba_pintura', tono: 0.1 }));
      ps.push(a.poliedro([[-6, -3.4, z0 + 33], [6, -3.4, z0 + 33], [-6, 3.4, z0 + 33], [6, 3.4, z0 + 33], [-10, -4, z0 + 52], [10, -4, z0 + 52], [-10, 4, z0 + 52], [10, 4, z0 + 52]], { mat: m }));
      ps.push(a.elipsoide(0, 0.6, z0 + 50, 10, 5, 3.4, { mat: 'oro', tono: -0.05 }), a.elipsoide(0, 0.8, z0 + 50.5, 7, 4.6, 2.8, { mat: 'tumba_pintura' }));
      for (const s of [-1, 1]) {
        const hombro: V3 = [s * 10.5, 0, z0 + 50], codo: V3 = s < 0 ? [-13, 4, z0 + 38] : [12, 1, z0 + 37], mano: V3 = s < 0 ? [-13, 10, z0 + 44] : [12, 3, z0 + 26];
        ps.push(a.esfera(hombro[0], hombro[1], hombro[2], 3.2, { mat: m }), a.palo(hombro, codo, 2.4, { mat: m, r1: 2 }), a.palo(codo, mano, 2, { mat: m, r1: 1.7 }), a.esfera(mano[0], mano[1], mano[2], 2, { mat: m }));
        ps.push(a.cilindro(codo[0], codo[1], codo[2] - 6, 2.3, 2, { mat: 'oro' }));
      }
      // báculo
      ps.push(a.palo([-13, 10, z0], [-13, 10, z0 + 74], 1.1, { mat: 'oro' }), a.palo([-13, 10, z0 + 74], [-13, 14, z0 + 77], 1.1, { mat: 'oro' }), a.palo([-13, 10, z0], [-13, 12, z0 - 2], 1, { mat: 'oro' }));
      if (v === 'de_pie') {
        ps.push(a.cilindro(0, 0, z0 + 52, 2.6, 4, { mat: m }));
        chacal(a, ps, 0, 0.5, z0 + 60, 1.25, 90, m, true);
      } else {
        ps.push(a.cilindro(0, 0, z0 + 52, 2.6, 2, { mat: m }), a.poliedro([[-2.6, -2.6, z0 + 54], [2.6, -2.6, z0 + 55], [-2.6, 2.6, z0 + 53], [2.6, 2.6, z0 + 56]], { mat: m, tono: 0.1 }));
        chacal(a, ps, 22, 14, 5, 1.25, 200, m, true);
        ps.push(duna(a, 22, 14, 9, 7, 3));
        for (let i = 0; i < 3; i++) ps.push(a.caja(14 + a.r() * 12, 6 + a.r() * 8, 0, 3, 2, 2, { mat: m, giro: a.r() * 90 }));
      }
      return ps;
    },
  },
  {
    id: 'tum_sarcofago', nombre: ['Sarcófago', 'Sarcophagus'], tema: 'tumba', variantes: ['momia_cerrado', 'momia_abierto', 'chacal_cerrado', 'chacal_abierto'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const chac = v.startsWith('chacal'), abierto = v.endsWith('abierto');
      const m = chac ? 'marmol_negro' : 'tumba_liso', zb = 7;
      ps.push(a.caja(0, 0, 0, 50, 24, 4, { mat: 'tumba_sillar', tono: -0.05 }), a.caja(0, 0, 4, 46, 20, 3, { mat: 'tumba_liso' }));
      // la caja: más ancha en los hombros, cabeza redonda
      const perfil: [number, number][] = [[-22, 6], [-10, 7.5], [6, 9], [12, 8.6], [17, 7], [21, 4.5]];
      const caja = (h0: number, h1: number, enc = 0): V3[] => { const r: V3[] = []; for (const [x, w] of perfil) for (const s of [-1, 1]) r.push([x * (1 - enc * 0.02), s * (w - enc), zb + h0], [x * (1 - enc * 0.02), s * (w - enc), zb + h1]); return r; };
      ps.push(a.poliedro(caja(0, 9), { mat: m }));
      ps.push(a.poliedro(caja(8.6, 10).map(([x, y, z]) => [x, y * 1.06, z] as V3), { mat: 'oro', tono: -0.15 }));
      if (abierto) ps.push(a.poliedro(caja(2.5, 12, 1.4), { mat: 'negro', resta: true }));
      // la tapa con su figura
      const tapa = (T: (p: V3) => V3) => {
        const pts = caja(10, 14).map(([x, y, z]) => T([x, y, z + (Math.abs(y) < 5 ? 1.5 : 0)]));
        const lomo = perfil.map(([x, w]) => T([x, 0, zb + 15.5 + (x > 10 ? 1 : 0) - (x < -15 ? 1.5 : 0) + w * 0.05]));
        ps.push(a.poliedro([...pts, ...lomo], { mat: m, tono: 0.03 }));
        const P = (x: number, y: number, z: number) => T([x, y, zb + z]);
        if (chac) {
          const c = P(14, 0, 16.5);
          ps.push(a.elipsoide(c[0], c[1], c[2], 4.4, 4, 2.6, { mat: m }));
          const h = P(14, 0, 19);
          ps.push(a.elipsoide(h[0], h[1], h[2], 2.4, 1.6, 3.6, { mat: m }));
          for (const s of [-1, 1]) ps.push(a.poliedro([P(15, s * 1.6, 17), P(13, s * 2.6, 17), P(20, s * 2.4, 17.5), P(14, s * 2.2, 18.4)], { mat: m }));
          ps.push(a.esfera(...P(14, -1.3, 20), 0.7, { mat: 'oro' }), a.esfera(...P(14, 1.3, 20), 0.7, { mat: 'oro' }));
          ps.push(a.poliedro([P(9, -6, 15), P(9, 6, 15), P(10.5, -6, 16.5), P(10.5, 6, 16.5), P(7.5, 0, 16.5)], { mat: 'oro' }));
        } else {
          const c = P(15, 0, 16.6);
          ps.push(a.elipsoide(c[0], c[1], c[2], 3.4, 3.2, 1.8, { mat: 'oro' }));
          for (const s of [-1, 1]) ps.push(a.poliedro([P(17, s * 3, 15.5), P(11, s * 7.4, 15), P(12, s * 3.4, 16.6), P(9, s * 6.6, 15.4)], { mat: 'tumba_pintura' }));
          ps.push(a.esfera(...P(15.6, -1.1, 18.2), 0.6, { mat: 'negro' }), a.esfera(...P(15.6, 1.1, 18.2), 0.6, { mat: 'negro' }));
          ps.push(a.elipsoide(...P(10, 0, 16.8), 2.2, 6.6, 0.9, { mat: 'tumba_pintura', tono: 0.05 }));
        }
        // brazos cruzados y columna de signos
        ps.push(a.palo(P(1, -6, 16.4), P(6, 5, 17), 1.1, { mat: 'oro' }), a.palo(P(1, 6, 16.4), P(6, -5, 17), 1.1, { mat: 'oro' }));
        ps.push(a.poliedro([P(-18, -1.6, 15.6), P(-3, -1.8, 16.8), P(-18, 1.6, 15.6), P(-3, 1.8, 16.8), P(-18, -1.6, 14.4), P(-3, 1.8, 15.6)], { mat: 'tumba_pintura', tono: 0.05 }));
      };
      if (!abierto) tapa((p) => p);
      else {
        // la tapa corrida y apoyada en el piso
        const ang = 0.5;
        tapa(([x, y, z]) => { const zz = z - zb - 10; return [x - 3, y * Math.cos(ang) - zz * Math.sin(ang) + 22, y * Math.sin(ang) + zz * Math.cos(ang) + 6]; });
        // la momia adentro
        ps.push(a.elipsoide(-2, 0, zb + 5, 16, 4.4, 3.2, { mat: 'tela', tono: -0.12 }), a.elipsoide(16, 0, zb + 5.2, 3.4, 3.4, 3, { mat: 'tela', tono: -0.08 }));
        for (let i = 0; i < 5; i++) ps.push(a.cilindro(-14 + i * 6, 0, zb + 5, 3.9 - Math.abs(i - 2) * 0.2, 1, { mat: 'cuerda', eje: [1, 0, 0], tono: -0.1 }));
        ps.push(a.esfera(16.5, -1.2, zb + 7.6, 0.8, { mat: 'negro' }), a.esfera(16.5, 1.2, zb + 7.6, 0.8, { mat: 'negro' }));
      }
      return ps;
    },
  },
  {
    id: 'tum_canopos', nombre: ['Urnas funerarias', 'Funerary urns'], tema: 'tumba', variantes: ['canopos', 'urna', 'caidos'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'canopos') {
        ps.push(a.caja(0, 0, 0, 22, 22, 8, { mat: 'madera_lisa' }), a.caja(0, 0, 8, 24, 24, 1.5, { mat: 'oro', tono: -0.15 }));
        for (const s of [-1, 1]) ps.push(a.caja(0, s * 11, 2, 18, 0.8, 4, { mat: 'tumba_pintura' }), a.caja(s * 11, 0, 2, 0.8, 18, 4, { mat: 'tumba_pintura' }));
        let t = 0;
        for (const [x, y] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) canopo(a, ps, x, y, 9.5, 1.15, t++);
      } else if (v === 'urna') {
        ps.push(a.cilindro(0, 0, 0, 8, 3, { mat: 'tumba_liso', r1: 7 }));
        ps.push(a.cilindro(0, 0, 3, 5, 6, { mat: 'marmol', r1: 9 }), a.cilindro(0, 0, 9, 9, 12, { mat: 'marmol', r1: 6.5 }), a.cilindro(0, 0, 21, 6.5, 3, { mat: 'marmol', r1: 5 }));
        ps.push(a.cilindro(0, 0, 12, 9.15, 2.4, { mat: 'oro', r1: 8.5, tono: -0.1 }), a.cilindro(0, 0, 24, 6, 2, { mat: 'oro', tono: -0.05 }), a.esfera(0, 0, 27, 2.6, { mat: 'oro' }));
        for (const s of [-1, 1]) ps.push(a.palo([s * 8, 0, 18], [s * 11, 0, 14], 1.2, { mat: 'marmol' }));
        canopo(a, ps, 12, 8, 0, 1, 0);
      } else {
        canopo(a, ps, -6, -4, 0, 1.2, 1);
        ps.push(a.cilindro(4, 5, 3.2, 3.2, 8, { mat: 'marmol', r1: 2.6, eje: [1, 0.6, 0.05] }));
        ps.push(a.cilindro(4, 5, 3.2, 2.4, 9, { mat: 'negro', resta: true, eje: [1, 0.6, 0.05] }));
        chacal(a, ps, 14, 0, 1.6, 0.7, 220, 'marmol', false);
        for (let i = 0; i < 4; i++) ps.push(a.caja(-4 + a.r() * 16, 8 + a.r() * 6, 0, 2.5, 2, 0.8, { mat: 'marmol', giro: a.r() * 90 }));
        ps.push(a.elipsoide(10, 9, 0, 6, 3, 0.5, { mat: 'tela', tono: -0.2 }));
      }
      return ps;
    },
  },
  {
    id: 'tum_trampa', nombre: ['Trampa de pinchos', 'Spike trap'], tema: 'tumba', variantes: ['retraida', 'fuera', 'sangre'], huella: [2, 2], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.caja(0, 0, 0, 32, 32, 1, { mat: 'tumba_sillar', tono: -0.05 }), a.caja(0, 0, 0.6, 28, 28, 0.6, { mat: 'tumba_liso', tono: -0.1 })];
      const pos: [number, number][] = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) pos.push([-10.5 + i * 7, -10.5 + j * 7]);
      for (const [x, y] of pos) ps.push(a.caja(x, y, 0.2, 3.4, 3.4, 2, { mat: 'negro', resta: true }));
      for (const [x, y] of pos) {
        if (v === 'retraida') ps.push(a.cilindro(x, y, -1, 1.2, 2.4, { mat: 'hierro', r1: 0.2 }));
        else {
          const h = 9 + a.r() * 2;
          ps.push(a.cilindro(x, y, 0, 1.4, h, { mat: 'hierro_oxido', r1: 0.15 }));
          if (v === 'sangre' && a.r() < 0.6) ps.push(a.cilindro(x, y, h * 0.4, 0.9, h * 0.45, { mat: 'sangre', r1: 0.3 }));
        }
      }
      if (v === 'sangre') ps.push(a.elipsoide(3, 4, 1.1, 10, 7, 0.3, { mat: 'sangre', giro: 30 }), a.elipsoide(-8, 9, 1.1, 4, 3, 0.3, { mat: 'sangre' }));
      ps.push(a.caja(0, 0, 0, 33, 33, 0.4, { mat: 'tumba_liso', tono: -0.2 }));
      return ps;
    },
  },
  {
    id: 'tum_antorcha', nombre: ['Antorcha de tumba', 'Tomb torch'], tema: 'tumba', variantes: ['muro', 'pie'], cuadros: 6, t: 3, huella: [1, 1], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      let top: V3;
      if (v === 'muro') {
        // placa de piedra (va contra el muro de atrás) y brazo de hierro
        ps.push(a.caja(0, -6, 30, 10, 3, 26, { mat: 'tumba_liso' }), a.poliedro([[-5, -4.5, 56], [5, -4.5, 56], [0, -4.5, 62], [-5, -7.5, 56], [5, -7.5, 56], [0, -7.5, 62]], { mat: 'tumba_liso', tono: 0.05 }));
        ps.push(a.cilindro(0, -4.5, 46, 2.4, 1, { mat: 'oro', eje: [0, 1, 0], tono: -0.1 }));
        ps.push(a.palo([0, -4.5, 38], [0, 1, 40], 0.8, { mat: 'hierro' }), a.cilindro(0, 1, 38, 2.2, 3, { mat: 'hierro', r1: 2.6 }));
        ps.push(a.palo([0, 0, 30], [0, 2, 48], 1.3, { mat: 'madera', r1: 1.7 }));
        top = [0, 2, 48];
      } else {
        for (let k = 0; k < 3; k++) { const ang = (k / 3) * PI * 2; ps.push(a.palo([Math.cos(ang) * 7, Math.sin(ang) * 7, 0], [0, 0, 12], 0.9, { mat: 'bronce' })); }
        ps.push(a.cilindro(0, 0, 10, 1.4, 34, { mat: 'bronce', r1: 1.1 }), a.cilindro(0, 0, 44, 1.6, 6, { mat: 'bronce', r1: 4 }), a.cilindro(0, 0, 48, 4.2, 1.2, { mat: 'oro', tono: -0.1 }));
        top = [0, 0, 49];
      }
      ps.push(a.esfera(top[0], top[1], top[2], 2, { mat: 'negro' }));
      llama(a, ps, top[0], top[1], top[2] + 0.5, 3.6, f);
      return { piezas: ps, resplandor: { c: [top[0], top[1], top[2] + 4], r: 28, color: '#ff9a3a' } };
    },
  },
  {
    id: 'tum_brasero', nombre: ['Brasero de tumba', 'Tomb brazier'], tema: 'tumba', variantes: ['chico', 'alto', 'piedra'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      let z: number, r: number;
      if (v === 'chico') {
        for (let k = 0; k < 3; k++) { const ang = (k / 3) * PI * 2 + 0.3; ps.push(a.palo([Math.cos(ang) * 6, Math.sin(ang) * 6, 0], [Math.cos(ang) * 4, Math.sin(ang) * 4, 9], 1, { mat: 'bronce' }), a.esfera(Math.cos(ang) * 6, Math.sin(ang) * 6, 0.8, 1.3, { mat: 'bronce' })); }
        ps.push(a.cilindro(0, 0, 8, 3, 4, { mat: 'bronce', r1: 7.5 }));
        z = 12; r = 7.2;
      } else if (v === 'alto') {
        ps.push(a.cilindro(0, 0, 0, 8, 3, { mat: 'tumba_liso', r1: 7 }));
        for (let k = 0; k < 4; k++) { const ang = (k / 4) * PI * 2 + PI / 4; ps.push(a.palo([Math.cos(ang) * 6, Math.sin(ang) * 6, 3], [Math.cos(ang) * 2, Math.sin(ang) * 2, 30], 1.1, { mat: 'bronce' })); }
        ps.push(a.cilindro(0, 0, 3, 1.6, 30, { mat: 'bronce' }), a.cilindro(0, 0, 18, 3, 2, { mat: 'oro', tono: -0.1 }));
        ps.push(a.cilindro(0, 0, 30, 3, 7, { mat: 'bronce', r1: 10 }), a.cilindro(0, 0, 36, 10.4, 1.4, { mat: 'oro', tono: -0.1 }));
        z = 37; r = 9.5;
      } else {
        ps.push(a.caja(0, 0, 0, 20, 20, 4, { mat: 'tumba_sillar' }), a.cilindro(0, 0, 4, 6, 14, { mat: 'tumba_liso', r1: 5 }), a.cilindro(0, 0, 18, 5, 6, { mat: 'tumba_liso', r1: 11 }));
        glifos(a, ps, -7, 7, 10, 0.5, 2.5);
        z = 24; r = 10;
      }
      ps.push(a.cilindro(0, 0, z - 1.5, r, 1.6, { mat: 'negro' }));
      for (let i = 0; i < 4; i++) { const ang = a.r() * PI * 2; ps.push(a.esfera(Math.cos(ang) * r * 0.5, Math.sin(ang) * r * 0.5, z, 1.6, { mat: 'lava', tono: -0.2 })); }
      llama(a, ps, 0, 0, z, r * 0.62, f);
      return { piezas: ps, resplandor: { c: [0, 0, z + 6], r: 34, color: '#ff9a3a' } };
    },
  },
);

registrar(
  {
    id: 'tum_cofre', nombre: ['Cofre funerario', 'Tomb chest'], tema: 'tumba', variantes: ['cerrado', 'abierto', 'piedra'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const piedra = v === 'piedra', m = piedra ? 'tumba_liso' : 'madera_lisa';
      ps.push(a.caja(0, 0, 0, 28, 16, 3, { mat: piedra ? 'tumba_sillar' : 'oro', tono: piedra ? 0 : -0.2 }));
      for (const [x, y] of [[-12, -6], [12, -6], [-12, 6], [12, 6]]) ps.push(a.caja(x, y, 0, 3, 3, 3, { mat: piedra ? 'tumba_liso' : 'oro', tono: -0.1 }));
      ps.push(a.caja(0, 0, 3, 26, 14, 11, { mat: m }));
      ps.push(a.caja(0, 7.2, 5, 22, 0.6, 7, { mat: 'tumba_pintura', tono: 0.05 }));
      glifos(a, ps, -10, 10, 7.6, 7, 3.4, 'x', piedra ? 'tumba_liso' : 'oro');
      for (const x of [-12.5, 12.5]) ps.push(a.caja(x, 0, 3, 1.4, 14.6, 11.2, { mat: 'oro', tono: -0.1 }));
      const tapa = (T: (p: V3) => V3, mat: string) => {
        const pts: V3[] = [];
        for (const x of [-13.5, 13.5]) for (const y of [-7.5, 7.5]) pts.push(T([x, y, 14]), T([x, y * 0.6, 18]));
        pts.push(T([-13.5, 0, 19.5]), T([13.5, 0, 19.5]));
        ps.push(a.poliedro(pts, { mat }));
        ps.push(a.poliedro([T([-14, -1, 19.2]), T([14, -1, 19.2]), T([-14, 1, 19.2]), T([14, 1, 19.2]), T([-14, 0, 20.2]), T([14, 0, 20.2])], { mat: 'oro', tono: -0.05 }));
      };
      if (v !== 'abierto') {
        tapa((p) => p, piedra ? 'tumba_liso' : m);
        if (!piedra) ps.push(a.caja(0, 7.6, 10, 3, 1, 4, { mat: 'oro' }));
        else ps.push(a.caja(2, 7.3, 14, 10, 1, 0.8, { mat: 'negro', resta: true }));
      } else {
        ps.push(a.caja(0, 0, 6, 24, 12, 10, { mat: 'negro', resta: true }));
        ps.push(a.elipsoide(0, 0, 12, 11, 5.4, 2.6, { mat: 'oro' }));
        for (let i = 0; i < 6; i++) ps.push(a.cilindro(-8 + a.r() * 16, -3 + a.r() * 6, 13 + a.r() * 1.5, 1.4, 0.5, { mat: 'oro', incl: a.r() * 40, tono: 0.1 }));
        ps.push(a.poliedro([[2, 1, 14], [5, 1, 14], [3.5, -1, 14], [3.5, 0, 16.5], [3.5, 0, 12.5]], { mat: 'cristal' }));
        // la tapa echada atrás
        const ang = -1.9;
        tapa(([x, y, z]) => { const yy = y + 7.5, zz = z - 14; return [x, yy * Math.cos(ang) - zz * Math.sin(ang) - 7.5, yy * Math.sin(ang) + zz * Math.cos(ang) + 14]; }, m);
        for (let i = 0; i < 4; i++) ps.push(a.cilindro(12 + a.r() * 6, 8 + a.r() * 4, 0, 1.4, 0.5, { mat: 'oro', tono: 0.05 }));
      }
      return ps;
    },
  },
  {
    id: 'tum_altar_baculo', nombre: ['Altar del báculo', 'Staff altar'], tema: 'tumba', variantes: ['apagado', 'activo', 'con_baculo'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 36, 36, 5, { mat: 'tumba_sillar', tono: -0.04 }), a.caja(0, 0, 5, 30, 30, 4, { mat: 'tumba_liso' }));
      ps.push(a.caja(0, 0, 9, 22, 22, 22, { mat: 'tumba_sillar' }));
      glifos(a, ps, -9, 9, 11, 16, 8); glifos(a, ps, -9, 9, 11, 16, 8, 'y');
      for (const [x, y] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) ps.push(a.cilindro(x, y, 9, 2.4, 22, { mat: 'tumba_liso', tono: 0.05 }));
      ps.push(a.caja(0, 0, 31, 28, 28, 4, { mat: 'tumba_liso', tono: 0.06 }));
      ps.push(a.cilindro(0, 0, 34.6, 7, 0.8, { mat: 'oro', tono: -0.1 }), a.cilindro(0, 0, 34, 6, 2, { mat: 'tumba_liso', tono: 0.02 }));
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * PI * 2; ps.push(a.caja(Math.cos(ang) * 10, Math.sin(ang) * 10, 34.6, 2.4, 2.4, 0.8, { mat: v === 'apagado' ? 'tumba_pintura' : 'runa', giro: (ang * 180) / PI, tono: v === 'apagado' ? 0 : -0.15 + 0.1 * Math.sin((f / 6) * PI * 2 + k) })); }
      ps.push(a.cilindro(0, 0, 30, 3.2, 8, { mat: 'negro', resta: true }));
      if (v === 'apagado') {
        ps.push(a.cilindro(0, 0, 30, 3.2, 3, { mat: 'negro' }));
        return ps;
      }
      const pulso = Math.sin((f / 6) * PI * 2);
      ps.push(a.cilindro(0, 0, 30, 3.2, 5, { mat: 'runa', tono: 0.1 + pulso * 0.1 }));
      if (v === 'activo') {
        ps.push(a.cilindro(0, 0, 35, 2.6 + pulso * 0.4, 30 + pulso * 4, { mat: 'runa', r1: 0.4, tono: -0.1 }));
        for (let k = 0; k < 3; k++) { const ang = (k / 3) * PI * 2 + f * 0.6, zz = 40 + ((f * 3 + k * 7) % 18); ps.push(a.esfera(Math.cos(ang) * 5, Math.sin(ang) * 5, zz, 0.9, { mat: 'runa', tono: 0.2 })); }
      } else {
        // el báculo clavado en el hueco
        ps.push(a.palo([0, 0, 30], [0, 0, 88], 1.3, { mat: 'oro', r1: 1.1 }));
        ps.push(a.cilindro(0, 0, 86, 1.6, 3, { mat: 'oro', r1: 2.8 }), a.elipsoide(0, 0, 92, 2.6, 2.6, 3.4, { mat: 'runa', tono: pulso * 0.1 }));
        for (const s of [-1, 1]) ps.push(a.palo([0, 0, 89], [s * 5, s * 1, 96], 0.8, { mat: 'oro' }));
        for (const z of [50, 68]) ps.push(a.cilindro(0, 0, z, 1.8, 1.4, { mat: 'tumba_pintura' }));
      }
      return { piezas: ps, resplandor: { c: [0, 0, 40], r: 30, color: '#5ac8f0' } };
    },
  },
  {
    id: 'tum_obelisco', nombre: ['Obelisco', 'Obelisk'], tema: 'tumba', variantes: ['entero', 'roto', 'enterrado'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const fuste = (H: number, b: number, t: number, T: (p: V3) => V3, punta: boolean) => {
        const pts: V3[] = [];
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) pts.push(T([sx * b, sy * b, 0]), T([sx * t, sy * t, H]));
        ps.push(a.poliedro(pts, { mat: 'tumba_liso' }));
        if (punta) ps.push(a.poliedro([T([-t, -t, H]), T([t, -t, H]), T([-t, t, H]), T([t, t, H]), T([0, 0, H + t * 1.6])], { mat: 'oro', tono: -0.05 }));
      };
      const zb = v === 'enterrado' ? -20 : 0;
      if (v !== 'enterrado') ps.push(a.caja(0, 0, 0, 32, 32, 6, { mat: 'tumba_sillar' }), a.caja(0, 0, 6, 25, 25, 5, { mat: 'tumba_liso', tono: 0.04 }));
      const H = 118, b = 8, t = 5.4;
      if (v === 'roto') {
        const Hc = 58 + a.r() * 8, tc = b - (b - t) * (Hc / H);
        fuste(Hc, b, tc, ([x, y, z]) => [x, y, z + 11], false);
        ps.push(a.poliedro([[-10, -10, Hc + 2], [10, -10, Hc + 8], [-10, 10, Hc + 4], [10, 10, Hc + 14], [0, 0, Hc + 18]], { mat: 'negro', resta: true }));
        const ang = 0.35;
        fuste(H - Hc - 6, tc, t, ([x, y, z]) => [z * Math.cos(ang) + 20 + x * Math.sin(ang), z * Math.sin(ang) - 2 + y, Math.max(0, x + tc) + 0.1], true);
      } else fuste(H, b, t, ([x, y, z]) => [x, y, z + 11 + zb], true);
      // signos en las dos caras que se ven
      const hasta = v === 'roto' ? 56 : H - 12;
      for (let z = 20; z < hasta; z += 7) {
        const w = b - (b - t) * ((z - 11) / H);
        for (const [cara, eje] of [[w, 'x'], [w, 'y']] as [number, 'x' | 'y'][]) {
          const tt = a.r(), zz = z + 11 + zb - 11;
          if (zz < 4) continue;
          const o = { mat: 'negro', resta: true };
          if (tt < 0.4) ps.push(eje === 'x' ? a.caja(0, cara, zz, 1.6, 2, 4.4, o) : a.caja(cara, 0, zz, 2, 1.6, 4.4, o));
          else if (tt < 0.7) ps.push(eje === 'x' ? a.cilindro(0, cara - 1, zz + 2.4, 1.6, 2, { ...o, eje: [0, 1, 0] }) : a.cilindro(cara - 1, 0, zz + 2.4, 1.6, 2, { ...o, eje: [1, 0, 0] }));
          else ps.push(eje === 'x' ? a.caja(0, cara, zz + 1.6, 4, 2, 1.4, o) : a.caja(cara, 0, zz + 1.6, 2, 4, 1.4, o));
        }
      }
      if (v === 'enterrado') {
        ps.push(duna(a, 0, 0, 26, 22, 12), duna(a, 10, 8, 14, 10, 6));
      }
      return ps;
    },
  },
  {
    id: 'tum_escalera', nombre: ['Escalera de tumba', 'Tomb stairway'], tema: 'tumba', variantes: ['subida', 'con_arena', 'bajada'], huella: [4, 3], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const W = 34, n = 8, paso = 7;
      if (v === 'bajada') {
        // boca en el piso: una losa con el hueco tapa lo que queda bajo tierra; adentro, escalones que bajan a la oscuridad
        ps.push(a.caja(-41, 0, -48, 8, W + 16, 48, { mat: 'tumba_sillar', tono: -0.1 }), a.caja(-4, -W / 2 - 4, -48, 74, 8, 48, { mat: 'tumba_sillar', tono: -0.06 }));
        for (let i = 0; i < n; i++) ps.push(a.caja(24 - i * paso, 0, -48, paso, W, 48 - (i + 1) * 5.4, { mat: 'tumba_liso', tono: -0.04 - i * 0.05 }));
        ps.push(a.caja(-31, 0, -48, 12, W, 2, { mat: 'negro' }));
        glifos(a, ps, -W / 2 + 3, W / 2 - 3, -37, -14, 7, 'y');
        // lo que no se vería por la boca (la tierra lo taparía) se recorta con dos cuñas paralelas a la vista
        const KZ = Math.sqrt(1.5), X1 = 28, Y1 = W / 2, Z = 60;
        ps.push(a.poliedro([[X1, -120, 0], [200, -120, 0], [X1, 120, 0], [200, 120, 0], [X1 - KZ * Z, -120, -Z], [200, -120, -Z], [X1 - KZ * Z, 120, -Z], [200, 120, -Z]], { mat: 'negro', resta: true }));
        ps.push(a.poliedro([[-120, Y1, 0], [-120, 200, 0], [120, Y1, 0], [120, 200, 0], [-120, Y1 - KZ * Z, -Z], [-120, 200, -Z], [120, Y1 - KZ * Z, -Z], [120, 200, -Z]], { mat: 'negro', resta: true }));
        // brocal
        for (const s of [-1, 1]) ps.push(a.caja(-4.5, s * (W / 2 + 2.5), 0, 70, 5, 3, { mat: 'tumba_liso', tono: 0.04 }));
        ps.push(a.caja(-39.5, 0, 0, 5, W + 10, 3, { mat: 'tumba_liso', tono: 0.04 }));
        for (const s of [-1, 1]) ps.push(a.caja(30, s * (W / 2 + 2.5), 0, 6, 7, 10, { mat: 'tumba_liso', tono: 0.08 }));
        ps.push(duna(a, 34, 8, 8, 10, 2));
        return ps;
      }
      for (let i = 0; i < n; i++) ps.push(a.caja(24 - i * paso, 0, 0, paso, W, (i + 1) * 5, { mat: 'tumba_liso', tono: (i % 2 ? -0.04 : 0.02) }));
      ps.push(a.caja(-38, 0, 0, 20, W, 40, { mat: 'tumba_sillar' }));
      for (const s of [-1, 1]) {
        ps.push(a.poliedro([[28, s * (W / 2 + 0.5), 0], [28, s * (W / 2 + 5), 0], [-48, s * (W / 2 + 0.5), 0], [-48, s * (W / 2 + 5), 0], [28, s * (W / 2 + 0.5), 10], [28, s * (W / 2 + 5), 10], [-48, s * (W / 2 + 0.5), 48], [-48, s * (W / 2 + 5), 48], [-28, s * (W / 2 + 0.5), 48], [-28, s * (W / 2 + 5), 48]], { mat: 'tumba_sillar' }));
        ps.push(a.caja(28, s * (W / 2 + 2.75), 0, 8, 8, 16, { mat: 'tumba_liso', tono: 0.05 }));
      }
      if (v === 'con_arena') {
        ps.push(a.poliedro([[30, -W / 2, 0], [30, W / 2, 0], [-30, -W / 2, 38], [-30, 8, 34], [10, -W / 2, 22], [28, -4, 0], [-10, -W / 2, 30], [-20, W / 2, 0], [0, 4, 14]], { mat: 'arena', tono: -0.1 }));
        ps.push(duna(a, 32, 4, 10, 14, 3));
        ps.push(a.caja(4, 12, 15, 8, 6, 4, { mat: 'tumba_liso', giro: 20, incl: 10 }));
      }
      return ps;
    },
  },
  {
    id: 'tum_entrada', nombre: ['Entrada de la tumba', 'Tomb entrance'], tema: 'tumba', variantes: ['sellada', 'abierta'], huella: [8, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const W = 124, D = 34, H = 116;
      // pilono en talud
      ps.push(a.poliedro([[-W / 2, -D / 2, 0], [W / 2, -D / 2, 0], [-W / 2, D / 2, 0], [W / 2, D / 2, 0], [-W / 2 + 8, -D / 2 + 3, H], [W / 2 - 8, -D / 2 + 3, H], [-W / 2 + 8, D / 2 - 3, H], [W / 2 - 8, D / 2 - 3, H]], { mat: 'tumba_sillar' }));
      ps.push(a.caja(0, 0, H, W - 12, D - 2, 4, { mat: 'tumba_liso', tono: 0.05 }), a.poliedro([[-W / 2 + 6, -D / 2, H + 4], [W / 2 - 6, -D / 2, H + 4], [-W / 2 + 6, D / 2 + 1, H + 4], [W / 2 - 6, D / 2 + 1, H + 4], [-W / 2 + 4, -D / 2 - 2, H + 11], [W / 2 - 4, -D / 2 - 2, H + 11], [-W / 2 + 4, D / 2 + 4, H + 11], [W / 2 - 4, D / 2 + 4, H + 11]], { mat: 'tumba_liso', tono: 0.03 }));
      for (let i = 0; i < 14; i++) ps.push(a.caja(-W / 2 + 10 + i * 8, D / 2 + 2.8, H + 5, 3.4, 2, 5, { mat: 'tumba_pintura', tono: i % 2 ? 0.05 : -0.05 }));
      // marco escalonado y puerta
      ps.push(a.caja(0, D / 2, 0, 48, 14, 78, { mat: 'negro', resta: true }));
      ps.push(a.caja(0, D / 2 - 8, 0, 48, 2, 78, { mat: 'tumba_liso', tono: -0.06 }));
      ps.push(a.caja(0, D / 2 - 6, 0, 36, 10, 60, { mat: 'negro', resta: true }));
      for (const s of [-1, 1]) ps.push(a.caja(s * 21, D / 2 - 6, 0, 5, 10, 78, { mat: 'tumba_liso', tono: 0.04 }));
      ps.push(a.caja(0, D / 2 - 6, 60, 48, 10, 18, { mat: 'tumba_liso', tono: 0.06 }));
      if (v === 'sellada') {
        ps.push(a.caja(0, D / 2 - 9, 0, 34, 4, 60, { mat: 'tumba_sillar', tono: -0.05 }));
        ps.push(a.cilindro(0, D / 2 - 7.5, 32, 7, 1.4, { mat: 'tumba_pintura', eje: [0, 1, 0] }), a.cilindro(0, D / 2 - 6.6, 32, 4.4, 1, { mat: 'oro', eje: [0, 1, 0], tono: -0.1 }));
        chacal(a, ps, 0, D / 2 - 5, 33, 0.55, 90, 'oro', false);
        ps.push(a.palo([-12, D / 2 - 6.8, 50], [12, D / 2 - 6.8, 14], 0.5, { mat: 'cuerda' }), a.palo([12, D / 2 - 6.8, 50], [-12, D / 2 - 6.8, 14], 0.5, { mat: 'cuerda' }));
      } else {
        ps.push(a.caja(0, -4, 0, 34, 2, 60, { mat: 'negro' }));
        ps.push(a.caja(26, D / 2 + 10, 0, 34, 6, 12, { mat: 'tumba_sillar', giro: 70, incl: -12 }));
      }
      // sol alado sobre el dintel
      const zs = 69;
      ps.push(a.cilindro(0, D / 2 - 1, zs, 5, 2, { mat: 'oro', eje: [0, 1, 0] }));
      for (const s of [-1, 1]) {
        ps.push(a.poliedro([[s * 4, D / 2 - 1, zs + 3], [s * 4, D / 2 - 1, zs - 2], [s * 22, D / 2 - 1, zs + 4], [s * 20, D / 2 - 1, zs - 1], [s * 4, D / 2 + 0.6, zs + 3], [s * 4, D / 2 + 0.6, zs - 2], [s * 22, D / 2 + 0.6, zs + 4], [s * 20, D / 2 + 0.6, zs - 1]], { mat: 'oro', tono: -0.12 }));
        ps.push(a.cilindro(s * 5.5, D / 2, zs - 6, 1.6, 1.6, { mat: 'tumba_pintura', eje: [0, 1, 0] }));
      }
      // bandas verticales de signos a los costados y estatuas de chacal echadas
      for (const s of [-1, 1]) {
        ps.push(a.caja(s * 36, D / 2 - 2.4, 8, 8, 3, 88, { mat: 'tumba_liso', tono: 0.06 }));
        for (let z = 12; z < 92; z += 6) { const t = a.r(); ps.push(t < 0.5 ? a.caja(s * 36, D / 2 - 0.8, z, 3, 2, 3.4, { mat: 'negro', resta: true }) : a.cilindro(s * 36, D / 2 - 1.8, z + 1.6, 1.5, 2, { mat: 'negro', resta: true, eje: [0, 1, 0] })); }
        const x = s * 46, y = D / 2 + 16;
        ps.push(a.caja(x, y, 0, 14, 26, 10, { mat: 'tumba_sillar' }));
        ps.push(a.elipsoide(x, y - 3, 15, 4.4, 9, 5, { mat: 'marmol_negro' }), a.elipsoide(x, y - 9, 14, 5, 5, 5, { mat: 'marmol_negro' }));
        for (const k of [-1, 1]) ps.push(a.caja(x + k * 2.6, y + 6, 10, 2.2, 10, 2.4, { mat: 'marmol_negro' }));
        ps.push(a.palo([x, y + 3, 16], [x, y + 6, 23], 2.4, { mat: 'marmol_negro' }));
        chacal(a, ps, x, y + 6, 26, 0.85, 90, 'marmol_negro', false);
      }
      ps.push(duna(a, -30, D / 2 + 30, 30, 10, 3), duna(a, 40, -D / 2 + 4, 26, 14, 6));
      return ps;
    },
  },
);
