import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido } from '../render';

// Cloacas: túneles de ladrillo con arcos, rejas, desagües que escupen baba, charcos, palancas y nidos de ratas.
const junta = (v: number, paso: number) => { const m = ((v % paso) + paso) % paso; return m < 1 ? 1 : 0; };
const ladrillos = (largo: number, alto: number) => (p: V3, n: V3) => {
  if (Math.abs(n[2]) > 0.7) return junta(p[0] + (Math.floor(p[1] / alto) % 2) * largo * 0.5, largo) || junta(p[1], alto) ? -0.3 : 0;
  const fila = Math.floor(p[2] / alto), corre = (fila % 2) * largo * 0.5, u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
  if (junta(p[2], alto) || junta(u + corre, largo)) return -0.3;
  // manchas de humedad más oscuras abajo
  return (ruido(Math.floor((u + corre) / largo) * 1.7, fila * 2.3, 9) - 0.5) * 0.2 - Math.max(0, 0.12 - p[2] * 0.004) - (ruido(u * 0.06, p[2] * 0.03, 4) > 0.62 ? 0.12 : 0);
};
MATERIALES.cloaca_ladrillo = { rampa: ['#110e0b', '#1d1813', '#2b241c', '#3a3025', '#4a3d2f', '#5b4b39', '#6b5a45'], ruido: 0.25, escala: 0.3, patron: ladrillos(9, 4.5) };
MATERIALES.cloaca_piedra = { rampa: ['#0f110d', '#1b1e17', '#282c22', '#363b2e', '#454b3a', '#565c48', '#676d57'], ruido: 0.3, escala: 0.22, patron: ladrillos(16, 8) };

const PI = Math.PI;
/** Chorreones de baba bajando por una cara (+y). */
function chorros(a: Arma, ps: Pieza[], x0: number, x1: number, y: number, z: number, n: number, mat = 'baba') {
  for (let i = 0; i < n; i++) {
    const x = x0 + a.r() * (x1 - x0), L = 10 + a.r() * 24;
    ps.push(a.caja(x, y, z - L, 1.6 + a.r() * 1.6, 0.8, L, { mat, tono: -0.08 }), a.elipsoide(x, y + 0.2, z - L, 1.3, 0.8, 1.6, { mat }));
  }
}
/** Charco plano de varias manchas. */
function charco(a: Arma, ps: Pieza[], x: number, y: number, rx: number, ry: number, mat: string, n = 4) {
  ps.push(a.elipsoide(x, y, 0, rx, ry, 0.7, { mat, tono: -0.05 }));
  for (let i = 0; i < n; i++) { const ang = a.r() * PI * 2; ps.push(a.elipsoide(x + Math.cos(ang) * rx * 0.6, y + Math.sin(ang) * ry * 0.6, 0, rx * (0.35 + a.r() * 0.25), ry * (0.35 + a.r() * 0.25), 0.7, { mat, giro: a.r() * 180 })); }
}
/** Barril viejo de duelas con aros oxidados. */
function barril(a: Arma, ps: Pieza[], x: number, y: number, z: number, eje?: V3) {
  if (!eje) {
    ps.push(a.cilindro(x, y, z, 7, 9, { mat: 'madera_vieja', r1: 8 }), a.cilindro(x, y, z + 9, 8, 9, { mat: 'madera_vieja', r1: 7 }));
    for (const zz of [2, 15]) ps.push(a.cilindro(x, y, z + zz, zz < 9 ? 7.3 : 7.5, 1.6, { mat: 'hierro_oxido', r1: zz < 9 ? 7.5 : 7.3 }));
    return;
  }
  ps.push(a.cilindro(x, y, z, 7, 9, { mat: 'madera_vieja', r1: 8, eje }), a.cilindro(x + eje[0] * 9, y + eje[1] * 9, z + eje[2] * 9, 8, 9, { mat: 'madera_vieja', r1: 7, eje }));
  for (const k of [2, 15]) ps.push(a.cilindro(x + eje[0] * k, y + eje[1] * k, z + eje[2] * k, k < 9 ? 7.3 : 7.5, 1.6, { mat: 'hierro_oxido', r1: k < 9 ? 7.5 : 7.3, eje }));
}

registrar(
  {
    id: 'clo_muro', nombre: ['Muro de cloaca', 'Sewer wall'], tema: 'cloaca', variantes: ['arco', 'liso', 'goteras'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const L = 80, T = 14, H = 86;
      ps.push(a.caja(0, 0, 0, L, T, H, { mat: 'cloaca_ladrillo' }), a.caja(0, 0.5, 0, L, T + 3, 10, { mat: 'cloaca_piedra', tono: -0.04 }));
      ps.push(a.caja(0, 0.5, H - 6, L, T + 3, 4, { mat: 'cloaca_piedra', tono: 0.04 }));
      if (v === 'arco') {
        // dovelas de piedra alrededor del arco y túnel oscuro
        ps.push(a.cilindro(0, T / 2 - 1, 30, 23, 3, { mat: 'cloaca_piedra', eje: [0, 1, 0], tono: 0.05 }));
        for (const s of [-1, 1]) ps.push(a.caja(s * 20.5, T / 2 + 0.5, 0, 5, 3, 30, { mat: 'cloaca_piedra', tono: 0.03 }));
        ps.push(a.caja(0, 0, 0, 36, T + 10, 30, { mat: 'negro', resta: true }), a.cilindro(0, -T / 2 - 5, 30, 18, T + 10, { mat: 'negro', resta: true, eje: [0, 1, 0] }));
        ps.push(a.caja(0, -T / 2 + 0.5, 0, 38, 1, 50, { mat: 'negro' }));
        ps.push(a.caja(0, 0, 0, 36, T, 1.5, { mat: 'baba', tono: -0.1 }), a.elipsoide(0, T / 2 + 6, 0, 22, 9, 1, { mat: 'baba' }));
        chorros(a, ps, -36, -24, T / 2 + 1.6, H - 8, 2);
        chorros(a, ps, 24, 36, T / 2 + 1.6, H - 8, 2);
        // cadena colgando de la clave
        ps.push(a.palo([0, T / 2 + 2, 48], [0, T / 2 + 2, 38], 0.6, { mat: 'hierro_oxido' }), a.cilindro(0, T / 2 + 2, 36, 1.8, 2, { mat: 'hierro_oxido', eje: [0, 1, 0] }));
      } else if (v === 'liso') {
        ps.push(a.cilindro(-14, T / 2 - 4, 22, 5, 8, { mat: 'cloaca_piedra', eje: [0, 1, 0] }), a.cilindro(-14, T / 2 - 4, 22, 3.6, 10, { mat: 'negro', resta: true, eje: [0, 1, 0] }));
        ps.push(a.caja(-14, T / 2 + 1, 12, 3, 1, 10, { mat: 'baba', tono: -0.1 }));
        ps.push(a.caja(18, T / 2, 4, 18, 4, 10, { mat: 'negro', resta: true }));
        for (let i = 0; i < 5; i++) ps.push(a.caja(11 + i * 3.5, T / 2 - 0.5, 4, 1.2, 1.2, 10, { mat: 'hierro_oxido' }));
        ps.push(a.caja(18, T / 2 - 0.5, 9, 18, 1.2, 1.2, { mat: 'hierro_oxido' }));
        for (let i = 0; i < 2; i++) ps.push(a.cilindro(-30 + i * 50, T / 2, 56, 2, 4, { mat: 'hierro_oxido', eje: [0, 1, 0] }), a.palo([-30 + i * 50, T / 2 + 3, 56], [-30 + i * 50, T / 2 + 3, 44], 0.5, { mat: 'hierro_oxido' }));
      } else {
        chorros(a, ps, -36, 36, T / 2 + 0.4, H - 8, 7);
        for (let i = 0; i < 5; i++) ps.push(a.elipsoide(-30 + a.r() * 60, T / 2, 10 + a.r() * 60, 5 + a.r() * 5, 1.2, 3 + a.r() * 4, { mat: 'musgo' }));
        charco(a, ps, a.r() * 20 - 10, T / 2 + 8, 16, 6, 'baba', 3);
      }
      return ps;
    },
  },
  {
    id: 'clo_reja', nombre: ['Reja de hierro', 'Iron grate door'], tema: 'cloaca', variantes: ['cerrada', 'abierta'], huella: [3, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const A = 32, H = 56;
      for (const s of [-1, 1]) ps.push(a.caja(s * (A / 2 + 5), 0, 0, 10, 14, H + 10, { mat: 'cloaca_piedra' }));
      ps.push(a.caja(0, 0, H, A + 20, 14, 10, { mat: 'cloaca_piedra', tono: 0.04 }), a.caja(0, 0, H + 10, A + 24, 16, 3, { mat: 'cloaca_piedra', tono: 0.08 }));
      ps.push(a.caja(0, 0, 0, A + 24, 18, 2, { mat: 'cloaca_piedra', tono: -0.06 }));
      ps.push(a.caja(0, -6, 0, A, 2, H, { mat: 'negro' }));
      // la reja: barrotes con puntas y travesaños, gira sobre la bisagra izquierda
      const ang = v === 'abierta' ? 1.25 : 0, hx = -A / 2, hy = 2;
      const R = (x: number, y: number): [number, number] => { const dx = x - hx; return [hx + dx * Math.cos(ang) - (y - hy) * Math.sin(ang), hy + dx * Math.sin(ang) + (y - hy) * Math.cos(ang)]; };
      for (let i = 0; i < 7; i++) {
        const [x, y] = R(hx + 2.5 + i * 4.5, hy);
        ps.push(a.cilindro(x, y, 1, 0.9, H - 2, { mat: 'hierro_oxido', tono: (a.r() - 0.5) * 0.1 }));
      }
      for (const z of [8, 30, 50]) { const [x0, y0] = R(hx + 1, hy), [x1, y1] = R(hx + A - 1, hy); ps.push(a.palo([x0, y0, z], [x1, y1, z], 1.2, { mat: 'hierro_oxido' })); }
      for (const z of [10, 46]) ps.push(a.cilindro(hx - 0.5, hy, z, 1.8, 4, { mat: 'hierro' }));
      if (v === 'cerrada') { const [x, y] = R(hx + A - 3, hy + 1.5); ps.push(a.caja(x, y, 26, 4, 2, 6, { mat: 'hierro' }), a.cilindro(x, y + 1, 25, 1, 2, { mat: 'hierro', eje: [0, 1, 0] })); }
      charco(a, ps, 6, 12, 14, 6, 'baba', 3);
      ps.push(a.caja(-A / 2 - 2, 7.2, 30, 3, 0.8, 28, { mat: 'baba', tono: -0.1 }));
      return ps;
    },
  },
  {
    id: 'clo_desague', nombre: ['Desagüe con baba', 'Sludge outlet'], tema: 'cloaca', variantes: ['baba', 'agua'], cuadros: 6, t: 3, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const m = v === 'baba' ? 'baba' : 'agua_sucia';
      ps.push(a.caja(0, -6, 0, 44, 12, 56, { mat: 'cloaca_ladrillo' }), a.caja(0, -5, 0, 46, 14, 8, { mat: 'cloaca_piedra', tono: -0.05 }));
      // el caño grande
      ps.push(a.cilindro(0, 0, 26, 9, 12, { mat: 'hierro_oxido', eje: [0, 1, 0] }), a.cilindro(0, 10, 26, 10.2, 2.4, { mat: 'hierro_oxido', eje: [0, 1, 0], tono: 0.06 }));
      for (const s of [-1, 1]) ps.push(a.caja(s * 10, 3, 14, 2.6, 6, 12, { mat: 'hierro_oxido', tono: -0.08 }));
      ps.push(a.cilindro(0, 2, 26, 7.4, 12, { mat: 'negro', resta: true, eje: [0, 1, 0] }));
      ps.push(a.cilindro(0, 10, 19.5, 6.6, 3, { mat: m, eje: [0, 1, 0], tono: -0.08 }));
      // el chorro: gotas que avanzan en arco con el cuadro
      const n = 11;
      for (let i = 0; i < n; i++) {
        const t = ((i + f / 6) / n);
        const y = 11 + t * 13, z = 22 - t * t * 22;
        ps.push(a.elipsoide(Math.sin(i * 2.3 + f) * 0.6, y, Math.max(1, z), 4.6 - t * 1.2, 2.6 + t * 1.5, 2.8 + t * 1.4, { mat: m, tono: 0.06 * Math.sin(i * 1.7 + f), incl: -40 * (1 - t) }));
      }
      // charco con anillos que se abren
      charco(a, ps, 0, 26, 20, 11, m, 4);
      for (let k = 0; k < 2; k++) { const r = ((f + k * 3) % 6) / 6; ps.push(a.elipsoide(0, 25, 0.4, 4 + r * 12, 3 + r * 7, 0.6, { mat: m, tono: 0.18 * (1 - r) })); }
      ps.push(a.caja(-12, 2, 36, 2, 1, 16, { mat: m, tono: -0.1 }), a.caja(14, 2, 32, 2, 1, 20, { mat: m, tono: -0.1 }));
      return ps;
    },
  },
  {
    id: 'clo_charco', nombre: ['Charco de baba', 'Sludge pool'], tema: 'cloaca', variantes: ['baba', 'agua', 'grande'], cuadros: 6, t: 4, huella: [2, 2], bloquea: false, plano: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const m = v === 'agua' ? 'agua_sucia' : 'baba', R = v === 'grande' ? 34 : 20;
      charco(a, ps, 0, 0, R, R * 0.7, m, v === 'grande' ? 6 : 4);
      // burbujas que crecen y revientan
      const nb = v === 'grande' ? 5 : 3;
      for (let i = 0; i < nb; i++) {
        const ang = a.r() * PI * 2, d = a.r() * R * 0.55, fase = (f + i * 2) % 6;
        const x = Math.cos(ang) * d, y = Math.sin(ang) * d * 0.7;
        if (fase < 4) ps.push(a.esfera(x, y, 0.3, 1.2 + fase * 0.9, { mat: m, tono: 0.18 }));
        else ps.push(a.elipsoide(x, y, 0.5, 2 + (fase - 3) * 2.4, 1.6 + (fase - 3) * 2, 0.5, { mat: m, tono: 0.12 }));
      }
      for (let i = 0; i < 3; i++) ps.push(a.caja(-R * 0.6 + a.r() * R * 1.2, -R * 0.4 + a.r() * R * 0.8, 0, 3 + a.r() * 3, 1, 1, { mat: i % 2 ? 'hueso' : 'madera_vieja', giro: a.r() * 180 }));
      return ps;
    },
  },
  {
    id: 'clo_palanca', nombre: ['Palanca', 'Lever'], tema: 'cloaca', variantes: ['arriba', 'abajo'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 16, 14, 12, { mat: 'cloaca_piedra' }), a.caja(0, 0, 12, 12, 10, 4, { mat: 'hierro', tono: -0.05 }));
      ps.push(a.caja(0, 0, 16, 10, 1.4, 4, { mat: 'negro', resta: true }));
      for (const s of [-1, 1]) ps.push(a.caja(0, s * 3.5, 15, 6, 1.4, 6, { mat: 'hierro' }));
      ps.push(a.cilindro(0, -4.5, 19, 1.6, 9, { mat: 'hierro_oxido', eje: [0, 1, 0] }));
      const ang = (v === 'arriba' ? -12 : 68) * PI / 180, L = 24;
      const tope: V3 = [Math.sin(ang) * L, 0, 19 + Math.cos(ang) * L];
      ps.push(a.palo([0, 0, 19], tope, 1.2, { mat: 'hierro' }), a.cilindro(tope[0], tope[1], tope[2] - 2, 1.8, 6, { mat: 'cuero', eje: [Math.sin(ang), 0, Math.cos(ang)] }), a.esfera(tope[0] + Math.sin(ang) * 4, 0, tope[2] + Math.cos(ang) * 4, 2, { mat: 'hierro' }));
      // engranaje y cadena que sale hacia atrás
      ps.push(a.cilindro(-7, 4, 6, 5, 2, { mat: 'hierro_oxido', eje: [0, 1, 0] }));
      for (let k = 0; k < 8; k++) { const b = (k / 8) * PI * 2; ps.push(a.caja(-7 + Math.cos(b) * 5.5, 5, 6 + Math.sin(b) * 5.5 - 0.8, 1.6, 2, 1.6, { mat: 'hierro_oxido' })); }
      ps.push(a.cilindro(-7, -7, 6, 2.4, 8, { mat: 'hierro_oxido', eje: [0, -1, 0] }));
      ps.push(a.caja(0, 7.2, 4, 8, 0.6, 2, { mat: v === 'arriba' ? 'tela_verde' : 'tela_roja' }));
      return ps;
    },
  },
  {
    id: 'clo_barril', nombre: ['Barril de baba', 'Barrel of slime'], tema: 'cloaca', variantes: ['rebosando', 'volcado', 'tapado'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'volcado') {
        barril(a, ps, -10, -4, 7.6, [0.9, 0.44, 0]);
        ps.push(a.cilindro(8, 4.6, 7.6, 6.4, 2, { mat: 'negro', resta: true, eje: [-0.9, -0.44, 0] }));
        charco(a, ps, 14, 10, 14, 9, 'baba', 4);
        ps.push(a.elipsoide(7.5, 4.5, 3, 4, 5, 3, { mat: 'baba', giro: 25 }));
        return ps;
      }
      charco(a, ps, 3, 3, 12, 9, 'baba', 2);
      barril(a, ps, 0, 0, 0);
      if (v === 'rebosando') {
        ps.push(a.elipsoide(0, 0, 18, 6.8, 6.8, 2.6, { mat: 'baba', tono: 0.05 }));
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * PI * 2 + a.r() * 0.6, L = 6 + a.r() * 10;
          ps.push(a.caja(Math.cos(ang) * 7.4, Math.sin(ang) * 7.4, 18 - L, 2, 1, L + 1, { mat: 'baba', giro: (ang * 180) / PI + 90 }), a.esfera(Math.cos(ang) * 7.6, Math.sin(ang) * 7.6, 18 - L, 1.3, { mat: 'baba' }));
        }
        ps.push(a.esfera(2, 1, 20, 1.4, { mat: 'baba', tono: 0.15 }));
      } else {
        ps.push(a.cilindro(0, 0, 17.6, 7.2, 1.2, { mat: 'madera_vieja', tono: 0.05 }), a.caja(0, 0, 18.6, 12, 2, 1, { mat: 'madera_vieja', tono: -0.1 }));
        ps.push(a.caja(0, 7.6, 7, 6, 0.4, 5, { mat: 'baba', tono: 0.1 }), a.caja(2, 7.2, 12, 2, 1, 6, { mat: 'baba' }));
      }
      return ps;
    },
  },
  {
    id: 'clo_nido_ratas', nombre: ['Nido de ratas', 'Rats’ nest'], tema: 'cloaca', variantes: ['nido', 'grande'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const R = v === 'grande' ? 24 : 16;
      for (let i = 0; i < (v === 'grande' ? 8 : 5); i++) { const ang = a.r() * PI * 2, d = a.r() * R * 0.6; ps.push(a.elipsoide(Math.cos(ang) * d, Math.sin(ang) * d, 0, R * (0.4 + a.r() * 0.3), R * (0.35 + a.r() * 0.25), 3 + a.r() * 3, { mat: i % 3 ? 'paja' : 'tela', giro: a.r() * 180, tono: -0.12 - a.r() * 0.1 })); }
      // huesos y una calavera
      for (let i = 0; i < (v === 'grande' ? 7 : 4); i++) { const ang = a.r() * PI * 2, d = R * (0.5 + a.r() * 0.5), g = a.r() * PI; const x = Math.cos(ang) * d, y = Math.sin(ang) * d; ps.push(a.palo([x - Math.cos(g) * 4, y - Math.sin(g) * 4, 2 + a.r() * 2], [x + Math.cos(g) * 4, y + Math.sin(g) * 4, 1], 0.8, { mat: 'hueso' })); }
      ps.push(a.esfera(R * 0.5, R * 0.3, 3, 3, { mat: 'hueso' }), a.esfera(R * 0.5 + 1, R * 0.3 + 2.4, 3.4, 0.9, { mat: 'negro' }), a.esfera(R * 0.5 + 2.4, R * 0.3 + 1.4, 3.4, 0.9, { mat: 'negro' }));
      // las ratas
      const nr = v === 'grande' ? 4 : 2;
      for (let i = 0; i < nr; i++) {
        const ang = a.r() * PI * 2, d = R * (0.2 + a.r() * 0.7), g = a.r() * 360, gr = (g * PI) / 180;
        const x = Math.cos(ang) * d, y = Math.sin(ang) * d, z = 3 + a.r() * 2;
        const c = Math.cos(gr), s = Math.sin(gr);
        ps.push(a.elipsoide(x, y, z + 0.6, 4.6, 2.6, 2.6, { mat: 'tela', giro: g, tono: -0.3 }), a.elipsoide(x + c * 4.6, y + s * 4.6, z + 0.8, 2.4, 1.5, 1.6, { mat: 'tela', giro: g, tono: -0.26 }));
        ps.push(a.esfera(x + c * 3.4 - s * 1.2, y + s * 3.4 + c * 1.2, z + 2.6, 0.9, { mat: 'carne' }));
        ps.push(a.palo([x - c * 4.2, y - s * 4.2, z], [x - c * 11 + s * 3, y - s * 11 - c * 3, Math.max(0.5, z - 2.5)], 0.5, { mat: 'carne', tono: -0.1 }));
      }
      return ps;
    },
  },
  {
    id: 'clo_escalera', nombre: ['Escalera de piedra', 'Stone stairs'], tema: 'cloaca', variantes: ['subida', 'con_baba'], huella: [4, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const W = 30, n = 7, paso = 7;
      for (let i = 0; i < n; i++) ps.push(a.caja(22 - i * paso, 0, 0, paso, W, (i + 1) * 6, { mat: 'cloaca_piedra', tono: (i % 2 ? -0.04 : 0.02), giro: (a.r() - 0.5) * 1.5 }));
      ps.push(a.caja(-36, 0, 0, 20, W, 42, { mat: 'cloaca_piedra' }));
      ps.push(a.poliedro([[26, -W / 2 - 6, 0], [26, -W / 2, 0], [-46, -W / 2 - 6, 0], [-46, -W / 2, 0], [26, -W / 2 - 6, 12], [26, -W / 2, 12], [-46, -W / 2 - 6, 70], [-46, -W / 2, 70], [-30, -W / 2 - 6, 70], [-30, -W / 2, 70]], { mat: 'cloaca_ladrillo' }));
      ps.push(a.palo([24, W / 2 - 1, 16], [-34, W / 2 - 1, 64], 0.8, { mat: 'hierro_oxido' }));
      for (const x of [22, -6, -34]) { const z = 6 + (22 - x) * 0.83; ps.push(a.palo([x, W / 2 - 1, z - 8], [x, W / 2 - 1, z + 10], 0.8, { mat: 'hierro_oxido' })); }
      if (v === 'con_baba') {
        for (let i = 0; i < 5; i++) ps.push(a.elipsoide(22 - i * paso + 1, -4 + a.r() * 8, (i + 1) * 6, 4 + a.r() * 3, 6 + a.r() * 6, 0.8, { mat: 'baba' }));
        for (let i = 0; i < 3; i++) ps.push(a.caja(25.6 - i * paso, -6 + a.r() * 10, (i + 1) * 6 - 5, 1, 3, 5.5, { mat: 'baba', tono: -0.06 }));
        charco(a, ps, 34, 0, 10, 12, 'baba', 3);
      } else {
        ps.push(a.caja(4, 6, 24.1, 6, 4, 1.2, { mat: 'hueso', giro: 30 }));
        for (let i = 0; i < 3; i++) ps.push(a.elipsoide(-10 + a.r() * 20, -W / 2 + 1, 20 + a.r() * 20, 5, 1, 3, { mat: 'musgo' }));
      }
      return ps;
    },
  },
);
