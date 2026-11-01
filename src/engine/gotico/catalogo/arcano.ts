import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido } from '../render';

// Santuario arcano: pasarelas de piedra que flotan sobre la nada, piedras de viaje, estantes que levitan,
// atriles con diarios que brillan, pilares con estrellas, cofres, braseros de fuego azul y portales.
const junta = (v: number, paso: number) => { const m = ((v % paso) + paso) % paso; return m < 1 ? 1 : 0; };
/** Losas cuadradas arriba y sillares en los cantos. */
const losas = (p: V3, n: V3) => {
  if (Math.abs(n[2]) > 0.7) return junta(p[0], 16) || junta(p[1], 16) ? -0.3 : (ruido(Math.floor(p[0] / 16) * 2.1, Math.floor(p[1] / 16) * 1.3, 2) - 0.5) * 0.2;
  const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
  return junta(p[2], 6) || junta(u + (Math.floor(p[2] / 6) % 2) * 6, 12) ? -0.28 : 0;
};
MATERIALES.arcano_losa = { rampa: ['#0d0f15', '#171a24', '#222736', '#2f3548', '#3e455b', '#4f5770', '#626b86'], ruido: 0.22, escala: 0.2, patron: losas };
MATERIALES.arcano_roca = { rampa: ['#0b0a10', '#15131c', '#201d2a', '#2c2839', '#3a3449', '#49425a'], ruido: 0.5, escala: 0.12 };

const PI = Math.PI;
/** Roca colgante (cáscara convexa al azar que baja en punta). */
function colgante(a: Arma, x: number, y: number, z: number, rx: number, ry: number, largo: number): Pieza {
  const pts: V3[] = [];
  for (let i = 0; i < 9; i++) { const t = (i / 9) * PI * 2 + a.r() * 0.4, k = 0.8 + a.r() * 0.25; pts.push([x + Math.cos(t) * rx * k, y + Math.sin(t) * ry * k, z]); }
  for (let i = 0; i < 5; i++) { const t = a.r() * PI * 2, k = 0.4 + a.r() * 0.3, h = 0.35 + a.r() * 0.3; pts.push([x + Math.cos(t) * rx * k, y + Math.sin(t) * ry * k, z - largo * h]); }
  pts.push([x + (a.r() - 0.5) * rx * 0.4, y + (a.r() - 0.5) * ry * 0.4, z - largo]);
  return a.poliedro(pts, { mat: 'arcano_roca', tono: (a.r() - 0.5) * 0.1 });
}
/** Chispas que giran alrededor de un centro. */
function chispas(a: Arma, ps: Pieza[], c: V3, r: number, n: number, f: number, cuadros: number, mat = 'magia', tam = 0.9) {
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * PI * 2 + (f / cuadros) * PI * 2 * (i % 2 ? 1 : -0.7);
    ps.push(a.esfera(c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r, c[2] + Math.sin(ang * 2 + i) * r * 0.25, tam, { mat, tono: 0.1 }));
  }
}
/** Llama azul de tres lenguas. */
function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, f: number, mat = 'fuego_azul') {
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * PI * 2 + f * 0.9, fr = Math.sin((f / 6) * PI * 2 + k * 2.1);
    ps.push(a.cilindro(x + Math.cos(ang) * s * 0.35, y + Math.sin(ang) * s * 0.35, z, s * (0.55 - k * 0.08), s * (1.6 + fr * 0.4 + k * 0.3), { mat, r1: 0.2 }));
  }
  ps.push(a.elipsoide(x, y, z + s * 0.25, s * 0.7, s * 0.7, s * 0.45, { mat, tono: 0.2 }));
}

registrar(
  {
    id: 'arc_pasarela', nombre: ['Pasarela flotante', 'Floating walkway'], tema: 'arcano', variantes: ['recta', 'esquina', 'quebrada'], huella: [5, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      // tramos: [x0, x1, y0, y1]
      const tramos: [number, number, number, number][] = v === 'esquina' ? [[-40, 16, -16, 16], [-16, 16, 16, 40]] : v === 'quebrada' ? [[-40, 14, -16, 16]] : [[-40, 40, -16, 16]];
      for (const [x0, x1, y0, y1] of tramos) {
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = x1 - x0, d = y1 - y0;
        ps.push(a.caja(cx, cy, -7, w, d, 7, { mat: 'arcano_losa' }));
        ps.push(a.caja(cx, cy, -9, w - 2, d - 2, 2, { mat: 'marmol_negro', tono: -0.05 }));
        // rocas que cuelgan debajo
        const n = Math.round((w * d) / 420);
        for (let i = 0; i < n; i++) ps.push(colgante(a, x0 + 6 + a.r() * (w - 12), y0 + 6 + a.r() * (d - 12), -8, 8 + a.r() * 6, 7 + a.r() * 5, 16 + a.r() * 26));
      }
      // canto con runas en las caras que se ven
      const [x0, x1, , y1] = tramos[0];
      const finY = v === 'esquina' ? -16 : x1;
      for (let x = x0 + 8; x < finY - 4; x += 16) ps.push(a.caja(x, y1 + 0.2, -5, 4, 0.6, 2.4, { mat: 'runa', tono: -0.1 }));
      if (v === 'esquina') {
        const [, , , Y1] = tramos[1];
        for (let y = 24; y < Y1 - 2; y += 16) ps.push(a.caja(16.2, y, -5, 0.6, 4, 2.4, { mat: 'runa', tono: -0.1 }));
        for (let y = -8; y < 12; y += 16) ps.push(a.caja(16.2, y, -5, 0.6, 4, 2.4, { mat: 'runa', tono: -0.1 }));
      } else if (v === 'recta') {
        for (let y = -8; y < 12; y += 16) ps.push(a.caja(40.2, y, -5, 0.6, 4, 2.4, { mat: 'runa', tono: -0.1 }));
      } else {
        // el borde roto y los pedazos que flotan sueltos
        ps.push(a.poliedro([[6, -18, 1], [16, -18, 1], [16, 18, 1], [2, 18, 1], [10, -18, -12], [16, 6, -12], [8, 18, -12]], { mat: 'negro', resta: true }));
        ps.push(a.caja(26, 2, -10, 12, 10, 6, { mat: 'arcano_losa', giro: 18, incl: 10 }), colgante(a, 26, 2, -10, 6, 5, 12));
        ps.push(a.caja(40, -6, -22, 8, 8, 5, { mat: 'arcano_losa', giro: -25, incl: -14 }), a.caja(36, 12, -30, 5, 5, 4, { mat: 'arcano_roca', giro: 40, incl: 20 }));
      }
      return { piezas: ps, sinSombra: true };
    },
  },
  {
    id: 'arc_piedra_viaje', nombre: ['Piedra de viaje', 'Teleport pad'], tema: 'arcano', variantes: ['azul', 'morada'], cuadros: 6, t: 3, huella: [3, 3], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const luz = v === 'azul' ? 'runa' : 'magia', pulso = Math.sin((f / 6) * PI * 2);
      ps.push(a.cilindro(0, 0, 0, 28, 2, { mat: 'arcano_losa', r1: 27 }), a.cilindro(0, 0, 2, 24, 3, { mat: 'marmol_negro', r1: 23 }));
      ps.push(a.cilindro(0, 0, 4.6, 19, 0.6, { mat: luz, tono: -0.1 + pulso * 0.1 }), a.cilindro(0, 0, 4.7, 16.5, 0.7, { mat: 'marmol_negro', tono: 0.04 }));
      // estrella central y marcas radiales que laten por turno
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * PI * 2, on = (k + f) % 4 === 0 ? 0.15 : -0.12;
        ps.push(a.caja(Math.cos(ang) * 21.5, Math.sin(ang) * 21.5, 4.4, 4, 1.6, 0.8, { mat: luz, giro: (ang * 180) / PI, tono: on }));
      }
      for (let k = 0; k < 4; k++) { const ang = (k / 4) * PI + PI / 8; ps.push(a.caja(0, 0, 5.2, 26, 1.6, 0.4, { mat: luz, giro: (ang * 180) / PI, tono: -0.15 + pulso * 0.08 })); }
      ps.push(a.cilindro(0, 0, 5.2, 4, 0.5, { mat: luz, tono: 0.1 }));
      // cuatro postes con remate que brilla
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * PI * 2 + PI / 4, x = Math.cos(ang) * 25, y = Math.sin(ang) * 25;
        ps.push(a.caja(x, y, 0, 5, 5, 16, { mat: 'marmol_negro', giro: 45 }), a.poliedro([[x - 2.5, y, 16], [x + 2.5, y, 16], [x, y - 2.5, 16], [x, y + 2.5, 16], [x, y, 21]], { mat: 'marmol_negro' }));
        ps.push(a.esfera(x, y, 23 + pulso, 1.6, { mat: luz }));
      }
      // chispas que suben
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * PI * 2 + i, r = 6 + (i % 3) * 4, z = 6 + (((f + i * 2) % 6) / 6) * 30;
        ps.push(a.esfera(Math.cos(ang) * r, Math.sin(ang) * r, z, 1.1 - ((f + i * 2) % 6) * 0.12, { mat: luz, tono: 0.1 }));
      }
      return { piezas: ps, resplandor: { c: [0, 0, 8], r: 34, color: v === 'azul' ? '#5ac8f0' : '#b46ae8' } };
    },
  },
  {
    id: 'arc_estante', nombre: ['Estante flotante', 'Floating bookshelf'], tema: 'arcano', variantes: ['ordenado', 'revuelto'], cuadros: 4, t: 4, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const z0 = 10 + Math.sin((f / 4) * PI * 2) * 1.5, W = 38, D = 11, H = 58;
      const cols = ['tela_roja', 'tela_azul', 'tela_verde', 'cuero', 'tela_morada', 'tela', 'cuero'];
      ps.push(a.caja(0, -D / 2 + 0.8, z0, W, 1.6, H, { mat: 'madera_lisa', tono: -0.1 }));
      for (const s of [-1, 1]) ps.push(a.caja(s * (W / 2 - 1), 0, z0, 2.4, D, H, { mat: 'madera_lisa' }));
      ps.push(a.caja(0, 0, z0 + H, W + 3, D + 2, 2.6, { mat: 'madera_lisa', tono: 0.05 }), a.caja(0, 0, z0 - 2, W + 2, D + 1, 2.4, { mat: 'madera_lisa', tono: 0.02 }));
      ps.push(a.poliedro([[-W / 2, D / 2, z0 + H + 2.6], [W / 2, D / 2, z0 + H + 2.6], [-W / 2, -D / 2, z0 + H + 2.6], [W / 2, -D / 2, z0 + H + 2.6], [-W / 4, 0, z0 + H + 7], [W / 4, 0, z0 + H + 7]], { mat: 'madera_lisa', tono: 0.06 }));
      ps.push(a.esfera(0, D / 2 + 0.5, z0 + H + 3.6, 1.6, { mat: 'magia' }));
      for (let r = 0; r < 4; r++) {
        const zs = z0 + 1 + r * 14;
        if (r) ps.push(a.caja(0, 0, zs - 1.4, W - 2, D - 1, 1.4, { mat: 'madera_lisa', tono: 0.04 }));
        let x = -W / 2 + 3;
        while (x < W / 2 - 4) {
          const w = 2 + a.r() * 1.8, h = 8 + a.r() * 4, falta = a.r() < (v === 'revuelto' ? 0.3 : 0.08);
          if (!falta) ps.push(a.caja(x + w / 2, 0.6, zs, w, D - 3, h, { mat: cols[Math.floor(a.r() * cols.length)], tono: (a.r() - 0.5) * 0.14, incl: a.r() < 0.12 ? 8 : 0, inclEje: 'y' }));
          x += w + 0.3;
        }
      }
      if (v === 'revuelto') {
        for (let i = 0; i < 4; i++) {
          const ang = a.r() * PI, bob = Math.sin((f / 4) * PI * 2 + i) * 2;
          ps.push(a.caja(-16 + i * 11, 14 + a.r() * 6, z0 + 18 + a.r() * 30 + bob, 7, 2, 9, { mat: cols[i], giro: (ang * 180) / PI, incl: 20 + a.r() * 40 }));
        }
        ps.push(a.caja(4, 16, z0 + 34, 8, 5, 0.6, { mat: 'cera', giro: 30, incl: 15 }));
      }
      // la magia que lo sostiene
      chispas(a, ps, [0, 0, z0 - 6], 12, 6, f, 4);
      ps.push(a.elipsoide(0, 0, 0.2, 16, 7, 0.4, { mat: 'magia', tono: -0.25 }));
      return { piezas: ps, resplandor: { c: [0, 0, z0 - 2], r: 22, color: '#b46ae8' } };
    },
  },
  {
    id: 'arc_atril', nombre: ['Atril con diario', 'Lectern with journal'], tema: 'arcano', variantes: ['diario', 'vacio'], cuadros: 4, t: 4, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.cilindro(0, 0, 0, 9, 2.4, { mat: 'arcano_losa', r1: 8 }), a.cilindro(0, 0, 2.4, 6, 3, { mat: 'marmol_negro', r1: 3 }));
      ps.push(a.cilindro(0, 0, 5, 2.4, 22, { mat: 'marmol_negro', r1: 2 }));
      for (const z of [10, 22]) ps.push(a.cilindro(0, 0, z, 2.8, 1.2, { mat: 'oro', tono: -0.1 }));
      ps.push(a.cilindro(0, 0, 26, 2, 4, { mat: 'marmol_negro', r1: 5 }));
      // tablero inclinado hacia el frente
      ps.push(a.caja(0, 0, 29, 18, 13, 2, { mat: 'madera_lisa', incl: -22 }));
      ps.push(a.caja(0, 6.4, 27, 18, 1, 2, { mat: 'oro', incl: -22, tono: -0.1 }));
      if (v === 'diario') {
        const pulso = Math.sin((f / 4) * PI * 2);
        for (const s of [-1, 1]) ps.push(a.caja(s * 4.2, 0.6, 31.2, 8, 10, 1, { mat: 'cera', incl: -22, giro: s * 4, tono: 0.08 }));
        ps.push(a.caja(0, 0.6, 30.8, 18, 11, 0.8, { mat: 'cuero', incl: -22 }));
        for (let i = 0; i < 4; i++) ps.push(a.caja(-4.2 + (i % 2) * 8.4, -1 + Math.floor(i / 2) * 4, 32.8 + Math.floor(i / 2) * -1.4, 5, 0.8, 0.4, { mat: 'magia', incl: -22, tono: -0.1 }));
        // letras que suben del libro
        for (let i = 0; i < 4; i++) { const t = ((f + i) % 4) / 4; ps.push(a.caja(-4 + i * 2.6, 1 - t * 2, 36 + t * 14, 1.6, 0.4, 1.8, { mat: 'magia', giro: i * 40 + f * 20, tono: 0.15 - t * 0.2 })); }
        ps.push(a.elipsoide(0, 0, 34 + pulso, 7, 5, 2.4, { mat: 'magia', tono: -0.3 }));
        return { piezas: ps, resplandor: { c: [0, 0, 36], r: 22, color: '#d8a8f8' } };
      }
      ps.push(a.cilindro(5, 1, 31, 1.2, 4, { mat: 'cera', tono: -0.05 }));
      return ps;
    },
  },
  {
    id: 'arc_pilar_estrella', nombre: ['Pilar de la estrella', 'Star pillar'], tema: 'arcano', variantes: ['orbe', 'apagado'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 26, 26, 5, { mat: 'arcano_losa' }), a.cilindro(0, 0, 5, 11, 4, { mat: 'marmol', r1: 9.5 }));
      for (let k = 0; k < 8; k++) { const ang = (k / 8) * PI * 2; ps.push(a.cilindro(Math.cos(ang) * 6.6, Math.sin(ang) * 6.6, 9, 1.9, 58, { mat: 'marmol', r1: 1.6, tono: k % 2 ? -0.05 : 0.03 })); }
      ps.push(a.cilindro(0, 0, 9, 7.2, 58, { mat: 'marmol', r1: 6.4 }));
      for (const z of [24, 46]) ps.push(a.cilindro(0, 0, z, 8.6, 1.6, { mat: 'oro', r1: 8.2, tono: -0.12 }));
      ps.push(a.cilindro(0, 0, 67, 7, 5, { mat: 'marmol', r1: 11 }), a.cilindro(0, 0, 72, 11, 2.4, { mat: 'marmol_negro' }));
      // garras que sostienen el orbe
      for (let k = 0; k < 4; k++) { const ang = (k / 4) * PI * 2 + PI / 4; ps.push(a.palo([Math.cos(ang) * 6, Math.sin(ang) * 6, 74], [Math.cos(ang) * 7, Math.sin(ang) * 7, 82], 1.1, { mat: 'oro', r1: 0.7 }), a.palo([Math.cos(ang) * 7, Math.sin(ang) * 7, 82], [Math.cos(ang) * 4, Math.sin(ang) * 4, 87], 0.7, { mat: 'oro', r1: 0.3 })); }
      if (v === 'apagado') {
        ps.push(a.esfera(0, 0, 82, 6.4, { mat: 'cristal', tono: -0.15 }));
        return ps;
      }
      const pulso = Math.sin((f / 6) * PI * 2);
      ps.push(a.esfera(0, 0, 82, 6.4 + pulso * 0.3, { mat: 'magia', tono: pulso * 0.06 }), a.esfera(-1.8, 1.6, 84, 2.4, { mat: 'magia', tono: 0.25 }));
      chispas(a, ps, [0, 0, 82], 11, 5, f, 6, 'magia', 1.1);
      chispas(a, ps, [0, 0, 80], 15, 3, f + 3, 6, 'runa', 0.8);
      return { piezas: ps, resplandor: { c: [0, 0, 80], r: 36, color: '#b46ae8' } };
    },
  },
  {
    id: 'arc_cofre', nombre: ['Cofre arcano', 'Arcane chest'], tema: 'arcano', variantes: ['cerrado', 'abierto'], cuadros: 4, t: 4, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const pulso = Math.sin((f / 4) * PI * 2);
      ps.push(a.caja(0, 0, 0, 28, 16, 3, { mat: 'oro', tono: -0.2 }));
      for (const [x, y] of [[-13, -7], [13, -7], [-13, 7], [13, 7]]) ps.push(a.esfera(x, y, 1.2, 2, { mat: 'oro', tono: -0.1 }));
      ps.push(a.caja(0, 0, 3, 26, 14, 11, { mat: 'marmol_negro' }));
      for (const x of [-12.6, 12.6]) ps.push(a.caja(x, 0, 3, 1.6, 14.6, 11.2, { mat: 'oro', tono: -0.1 }));
      // runa del frente
      ps.push(a.cilindro(0, 7.2, 8.5, 3.6, 0.6, { mat: 'oro', eje: [0, 1, 0], tono: -0.15 }), a.cilindro(0, 7.6, 8.5, 2.6, 0.5, { mat: 'runa', eje: [0, 1, 0], tono: pulso * 0.1 }));
      for (const s of [-1, 1]) ps.push(a.caja(s * 7, 7.3, 6, 3, 0.4, 5, { mat: 'runa', tono: -0.2 + pulso * 0.08 }));
      const tapa = (T: (p: V3) => V3) => {
        const pts: V3[] = [];
        for (const x of [-13.5, 13.5]) for (const y of [-7.5, 7.5]) pts.push(T([x, y, 14]), T([x, y * 0.7, 17.5]));
        pts.push(T([-13.5, 0, 19]), T([13.5, 0, 19]));
        ps.push(a.poliedro(pts, { mat: 'marmol_negro', tono: 0.04 }));
        for (const x of [-12.6, 0, 12.6]) ps.push(a.poliedro([T([x - 0.8, -7.6, 14]), T([x + 0.8, -7.6, 14]), T([x - 0.8, 7.6, 14]), T([x + 0.8, 7.6, 14]), T([x - 0.8, 0, 19.2]), T([x + 0.8, 0, 19.2]), T([x - 0.8, 5.4, 17.7]), T([x + 0.8, 5.4, 17.7]), T([x - 0.8, -5.4, 17.7]), T([x + 0.8, -5.4, 17.7])], { mat: 'oro', tono: -0.1 }));
      };
      if (v === 'cerrado') { tapa((p) => p); return { piezas: ps, resplandor: { c: [0, 9, 8], r: 10, color: '#5ac8f0' } }; }
      ps.push(a.caja(0, 0, 6, 24, 12, 10, { mat: 'negro', resta: true }));
      ps.push(a.elipsoide(0, 0, 12, 11, 5, 1.6 + pulso * 0.4, { mat: 'magia', tono: 0.05 }));
      ps.push(a.poliedro([[-2, 0, 13], [2, 0, 13], [0, -2, 13], [0, 2, 13], [0, 0, 18 + pulso], [0, 0, 11]], { mat: 'cristal', tono: 0.1 }));
      chispas(a, ps, [0, 0, 20], 6, 4, f, 4);
      const ang = -1.9;
      tapa(([x, y, z]) => { const yy = y + 7.5, zz = z - 14; return [x, yy * Math.cos(ang) - zz * Math.sin(ang) - 7.5, yy * Math.sin(ang) + zz * Math.cos(ang) + 14]; });
      return { piezas: ps, resplandor: { c: [0, 0, 16], r: 24, color: '#b46ae8' } };
    },
  },
  {
    id: 'arc_brasero', nombre: ['Brasero arcano', 'Arcane brazier'], tema: 'arcano', variantes: ['pie', 'cuenco'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      let z: number, r: number;
      if (v === 'pie') {
        ps.push(a.cilindro(0, 0, 0, 8, 3, { mat: 'arcano_losa', r1: 7 }), a.cilindro(0, 0, 3, 2.4, 28, { mat: 'marmol_negro', r1: 1.8 }));
        for (let k = 0; k < 3; k++) { const ang = (k / 3) * PI * 2; ps.push(a.palo([Math.cos(ang) * 2, Math.sin(ang) * 2, 18], [Math.cos(ang) * 9, Math.sin(ang) * 9, 33], 0.9, { mat: 'oro', r1: 0.6 })); }
        ps.push(a.cilindro(0, 0, 29, 2.6, 5, { mat: 'marmol_negro', r1: 8.5 }), a.cilindro(0, 0, 33.6, 8.8, 1.2, { mat: 'oro', tono: -0.1 }));
        z = 34.5; r = 8;
      } else {
        ps.push(a.cilindro(0, 0, 0, 12, 4, { mat: 'arcano_losa', r1: 11 }), a.cilindro(0, 0, 4, 7, 6, { mat: 'marmol_negro', r1: 12 }), a.cilindro(0, 0, 9.6, 12.4, 1.6, { mat: 'oro', tono: -0.1 }));
        for (let k = 0; k < 6; k++) { const ang = (k / 6) * PI * 2; ps.push(a.caja(Math.cos(ang) * 11.2, Math.sin(ang) * 11.2, 6, 1, 2.4, 2.4, { mat: 'runa', giro: (ang * 180) / PI, tono: -0.1 })); }
        z = 10.6; r = 11;
      }
      ps.push(a.cilindro(0, 0, z - 1, r, 1.2, { mat: 'negro' }));
      llama(a, ps, 0, 0, z, r * 0.62, f);
      chispas(a, ps, [0, 0, z + r * 1.6], r * 0.6, 3, f, 6, 'fuego_azul', 0.7);
      return { piezas: ps, resplandor: { c: [0, 0, z + 6], r: 32, color: '#3a86f0' } };
    },
  },
  {
    id: 'arc_portal', nombre: ['Portal arcano', 'Arcane portal'], tema: 'arcano', variantes: ['arco', 'libre'], cuadros: 8, t: 3, huella: [3, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const zc = v === 'arco' ? 38 : 42, RX = 15, RZ = 27;
      if (v === 'arco') {
        // marco de piedra: un óvalo grueso al que se le cava el centro
        ps.push(a.elipsoide(0, 0, zc, RX + 9, 6, RZ + 9, { mat: 'marmol_negro' }));
        ps.push(a.elipsoide(0, 0, zc, RX + 1.5, 12, RZ + 1.5, { mat: 'negro', resta: true }));
        ps.push(a.caja(0, 0, -20, 60, 30, 27, { mat: 'negro', resta: true }));
        ps.push(a.elipsoide(0, 0, zc, RX + 2, 1.4, RZ + 2, { mat: 'negro' }));
        ps.push(a.caja(0, 0, 0, 56, 20, 4, { mat: 'arcano_losa' }), a.caja(0, 0, 4, 50, 16, 3, { mat: 'marmol_negro', tono: -0.05 }));
        const n = 12;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * PI * 2, x = Math.sin(t) * (RX + 6), z = zc + Math.cos(t) * (RZ + 6);
          if (z < 12) continue;
          ps.push(a.esfera(x, 4.6, z, 1.4, { mat: 'runa', tono: Math.sin((f / 8) * PI * 2 + i) * 0.12 - 0.05 }));
        }
        for (const s of [-1, 1]) ps.push(a.caja(s * 25, 0, 7, 8, 12, 22, { mat: 'marmol_negro' }), a.poliedro([[s * 25 - 4, -6, 29], [s * 25 + 4, -6, 29], [s * 25 - 4, 6, 29], [s * 25 + 4, 6, 29], [s * 25, 0, 35]], { mat: 'oro', tono: -0.1 }));
        ps.push(a.poliedro([[-5, -4.5, zc + RZ + 6], [5, -4.5, zc + RZ + 6], [-5, 4.5, zc + RZ + 6], [5, 4.5, zc + RZ + 6], [0, -4.5, zc + RZ + 14], [0, 4.5, zc + RZ + 14]], { mat: 'marmol_negro', tono: 0.05 }));
        ps.push(a.esfera(0, 4, zc + RZ + 8, 1.8, { mat: 'magia' }));
      } else {
        // rocas que orbitan el óvalo flotante
        for (let i = 0; i < 6; i++) {
          const t = (i / 6) * PI * 2 + (f / 8) * PI * 0.5, x = Math.sin(t) * (RX + 9), z = zc + Math.cos(t) * (RZ + 7);
          ps.push(a.caja(x, Math.cos(t * 2) * 3, z - 2, 5 + (i % 3), 5, 4 + (i % 2) * 2, { mat: 'arcano_roca', giro: i * 37, incl: i * 23 }));
        }
        ps.push(a.elipsoide(0, 0, 0.2, 14, 6, 0.4, { mat: 'magia', tono: -0.2 }));
      }
      // el óvalo: capas que giran con el cuadro (en el plano x-z, de frente a +y)
      ps.push(a.elipsoide(0, 0, zc, RX, 2, RZ, { mat: 'magia', tono: -0.18 }));
      for (let k = 0; k < 4; k++) {
        const g = (f / 8) * 360 * (k % 2 ? -1 : 1) + k * 45, s = 0.85 - k * 0.17;
        ps.push(a.elipsoide(0, 0.4 + k * 0.4, zc, RX * s, 2, RZ * s * 0.9, { mat: 'magia', tono: -0.1 + k * 0.08, incl: g, inclEje: 'y' }));
      }
      ps.push(a.elipsoide(0, 2.2, zc, 3, 0.8, 5, { mat: 'magia', tono: 0.3 }));
      chispas(a, ps, [0, 3, zc], 10, 5, f, 8, 'magia', 0.8);
      return { piezas: ps, resplandor: { c: [0, 6, zc], r: 40, color: '#b46ae8' } };
    },
  },
);
