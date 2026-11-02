import { registrar, conVarianteY, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso as hM, bulto, ruido, type Comp, type Escena } from '../render';
import {
  PI, rad, add, mez, onda, entre, forma, mover, pena, penasco, espeleo, prisma, viga, cadena, calavera, huesoL, farol, cadaver,
  bordeVacio, BORDES,
} from './subterraneo';

/**
 * El abismo: un vacío sin fondo. Islas de roca que flotan y se mecen, puentes de piedra rotos sobre la nada,
 * cadenas gigantes que bajan de ningún lado, escaleras que terminan en el aire, pilares que suben de la oscuridad,
 * los bordes del precipicio en todas las orientaciones, fragmentos que caen despacio, runas que flotan con luz,
 * ojos en el fondo, ruinas suspendidas, altares sobre el vacío, niebla violeta que corre y estatuas gigantes que la
 * nada se va tragando. Lo que cuelga del vacío no tiene sombra en el piso (no hay piso): se pinta sin ella, y lo
 * que baja se oscurece hasta perderse.
 */

const M = MATERIALES;
M.abi_roca = { rampa: ['#08070a', '#121016', '#1c1922', '#28232f', '#35303e', '#443d4e', '#554d60', '#686073'], ruido: 0.5, escala: 0.14, patron: (p) => (ruido(p[0] * 0.07, p[1] * 0.07, p[2] * 0.4) - 0.5) * 0.22 + (Math.sin(p[2] * 0.8 + ruido(p[0] * 0.05, p[1] * 0.05, 2) * 5) > 0.85 ? -0.1 : 0) };
M.abi_roca_alta = { rampa: ['#0c0b0e', '#18161c', '#252229', '#333038', '#433f48', '#55505a', '#68636d', '#7c7781'], ruido: 0.45, escala: 0.16, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.72 ? 0.08 : 0) + (ruido(p[0] * 0.06, p[1] * 0.06, 4) - 0.5) * 0.15 };
M.abi_liquen = { rampa: ['#0e0b14', '#1a1424', '#271e36', '#352948', '#45355a', '#56436c'], ruido: 0.7, escala: 0.6 };
M.abi_sillar = { rampa: ['#0d0c0f', '#19171c', '#26232a', '#34303a', '#433e4a', '#544e5b', '#665f6d', '#797180'], ruido: 0.3, escala: 0.22, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.76 ? -0.14 : 0) + (ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.08) - 0.5) * 0.12 };
M.abi_marmol = { rampa: ['#141317', '#242228', '#37343c', '#4b4851', '#615d67', '#78747e', '#8f8b95', '#a6a2ab', '#bcb8c0'], ruido: 0.2, escala: 0.1, brillo: 0.2, patron: (p) => (ruido(p[0] * 0.05 + p[2] * 0.1, p[1] * 0.05, p[2] * 0.03) > 0.74 ? -0.2 : 0) + (ruido(p[0] * 0.4, p[1] * 0.4, p[2] * 0.4) > 0.8 ? -0.12 : 0) };
M.abi_hierro = { rampa: ['#060607', '#0e0e11', '#18181c', '#232328', '#303036', '#3f3f46', '#505059', '#64646e'], ruido: 0.35, escala: 0.4, brillo: 0.4 };
M.abi_obsidiana = { rampa: ['#0a080e', '#141019', '#1e1826', '#2a2234', '#372d44', '#463a56', '#584a6a', '#6e5e82'], ruido: 0.12, escala: 0.15, brillo: 1 };
M.abi_niebla = { rampa: ['#0e0716', '#170b24', '#221034', '#2e1646', '#3c1e5a', '#4c286e', '#5e3684', '#74489a'], ruido: 0.5, escala: 0.2, emite: true };
M.abi_niebla_honda = { rampa: ['#07040a', '#0c0612', '#120a1c', '#1a0e28', '#241434', '#2e1a42'], ruido: 0.6, escala: 0.12, emite: true };
M.abi_runa = { rampa: ['#3a1060', '#5a1a90', '#7e2ec0', '#a650e4', '#cc88f6', '#ecc8ff', '#fff0ff'], ruido: 0.3, escala: 0.3, emite: true };
M.abi_runa_azul = { rampa: ['#0c2a60', '#16469a', '#2468cc', '#3e92ec', '#78c0fa', '#c0e6ff', '#f0faff'], ruido: 0.3, escala: 0.3, emite: true };
M.abi_runa_roja = { rampa: ['#4a0610', '#780c18', '#a81a24', '#d43432', '#f0644e', '#ffa890', '#ffe4da'], ruido: 0.3, escala: 0.3, emite: true };
M.abi_ojo = { rampa: ['#6a3a06', '#a0600c', '#d89018', '#f8c040', '#fff090', '#fffce0'], ruido: 0.2, escala: 0.5, emite: true };
M.abi_estrella = { rampa: ['#6a5a90', '#a090c8', '#d8d0f4', '#ffffff'], ruido: 0.2, escala: 1, emite: true };
M.abi_alma = { rampa: ['#2a1c4a', '#3e2c6a', '#58428e', '#765eb0', '#9a84cc', '#c4b4e6', '#ece4fa'], ruido: 0.4, escala: 0.35, emite: true };
M.abi_vacio = { rampa: ['#000000', '#040208', '#08040e'], ruido: 0.3, escala: 0.3, emite: true };
M.abi_fuego = { rampa: ['#2a0a4a', '#4a1474', '#7022a6', '#9a44d2', '#c47cf0', '#e8c0ff', '#fff0ff'], ruido: 0.5, escala: 0.25, emite: true };
M.abi_madera = { rampa: ['#0c0a0a', '#171313', '#231d1c', '#302826', '#3f3431', '#4e423e'], ruido: 0.25, escala: 0.35 };

const ROCA = 'abi_roca';
/** Lo que baja se oscurece: tono por hondura (0 arriba, -0.6 al fondo). */
const fundido = (z: number, D = 160) => -Math.min(0.62, Math.max(0, -z / D) * 0.62);
/** Oscurece cada pieza según su hondura (para lo que se arma con ayudantes que no saben del fundido). */
function hundir(ps: Pieza[], D = 160): Pieza[] {
  return ps.map((p) => {
    if (p.resta || MATERIALES[p.mat]?.emite) return p;
    if (p.k === 'masa') return { ...p, comps: p.comps.map((c) => (c.sc[2] < 0 ? { ...c, tono: (c.tono ?? 0) + fundido(c.sc[2], D) } : c)) };
    const z = p.k === 'cono' ? p.o[2] : p.k === 'elip' ? p.c[2] : p.k === 'conv' ? p.pts.reduce((s, q) => s + q[2], 0) / p.pts.length : 0;
    return z < 0 ? { ...p, tono: (p.tono ?? 0) + fundido(z, D) } : p;
  });
}
/** Escena que flota sobre el vacío: sin sombra en el piso, con su luz si la tiene. */
const flota = (piezas: Pieza[], luz?: { c: V3; r: number; color: string }): Escena => ({ piezas, sinSombra: true, resplandor: luz });
/**
 * Jirón de niebla violeta: hebras finas y onduladas (no manchas) que corren a lo largo de `dir`, más tenues en las
 * puntas. `r` es el grosor del jirón entero (cuánto se abren las hebras).
 */
function jiron(a: Arma, ps: Pieza[], c: V3, L: number, r: number, dir = 0, mat = 'abi_niebla', tono = 0) {
  // el cuerpo del jirón: un velo oscuro y chato debajo de las hebras
  for (let i = 0; i < 2; i++) { const u = (i - 0.5) * 0.4; ps.push(a.elipsoide(c[0] + Math.cos(rad(dir)) * u * L, c[1] + Math.sin(rad(dir)) * u * L, c[2] - r * 0.3, L * 0.3, r * 0.7, r * 0.12 + 0.3, { mat: 'abi_niebla_honda', giro: dir, tono: tono - 0.25 })); }
  const cd = Math.cos(rad(dir)), sd = Math.sin(rad(dir)), hebras = 2 + Math.round(r / 4), m = Math.max(4, Math.round(L / 6));
  for (let h = 0; h < hebras; h++) {
    const off = (a.r() - 0.5) * r * 1.6, dz = (a.r() - 0.5) * r * 0.6, fase = a.r() * 6, amp = r * entre(a, 0.2, 0.5), Lh = L * entre(a, 0.6, 1);
    for (let i = 0; i < m; i++) {
      const u = (i + 0.5) / m - 0.5, k = Math.sin((u + 0.5) * PI), w = off + Math.sin(u * 6 + fase) * amp;
      const x = c[0] + cd * u * Lh - sd * w, y = c[1] + sd * u * Lh + cd * w, z = c[2] + dz + Math.sin(u * 4 + fase) * r * 0.2;
      if (a.r() < 0.12) continue;
      ps.push(a.elipsoide(x, y, z, (Lh / m) * 0.62, Math.max(0.5, r * 0.16 * k + 0.3), Math.max(0.35, r * 0.08 * k + 0.25), { mat, giro: dir + Math.cos(u * 6 + fase) * 20, tono: tono - 0.3 + k * 0.2 }));
    }
  }
}
/** Sillar labrado y gastado: caja con las aristas comidas (14 puntos movidos). */
function sillar(a: Arma, c: V3, w: number, d: number, h: number, giro = 0, mat = 'abi_sillar', gasto = 0.12, tono = 0): Pieza {
  const g = rad(giro), cg = Math.cos(g), sg = Math.sin(g), pts: V3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [0, 1]) {
    for (const [kx, ky, kz] of [[1 - gasto, 1, 1 - gasto * 0.5], [1, 1 - gasto, 1 - gasto * 0.5]]) {
      const lx = sx * w * 0.5 * kx * (1 - a.r() * gasto * 0.5), ly = sy * d * 0.5 * ky * (1 - a.r() * gasto * 0.5), lz = sz * h * (sz ? kz : 1) - (sz ? a.r() * gasto * h * 0.3 : 0);
      pts.push([c[0] + lx * cg - ly * sg, c[1] + lx * sg + ly * cg, c[2] + lz]);
    }
  }
  return a.poliedro(pts, { mat, tono: tono + (a.r() - 0.5) * 0.1 });
}
/**
 * Cuerpo de una isla flotante: arriba lajas chatas (la tierra donde se pisa, a z = 0), abajo un cono colgante de roca
 * orgánica que se angosta, con espeleotemas y raíces, y que se va oscureciendo.
 */
function isla(a: Arma, ps: Pieza[], R: number, H: number, o: { raices?: boolean; liquen?: boolean } = {}) {
  const cs: Comp[] = [];
  let x = 0, y = 0;
  const capas = 7;
  for (let i = 0; i < capas; i++) {
    const u = i / (capas - 1), rz = Math.max(5, (H / capas) * 0.9), z = -H * Math.pow(u, 0.85) - rz * (i === 0 ? 1 : 0.6), r = R * Math.pow(1 - u * 0.94, 1.5) * (0.92 + a.r() * 0.2) + 2;
    x += (a.r() - 0.5) * R * 0.15; y += (a.r() - 0.5) * R * 0.15;
    cs.push(bulto([x, y, z], [r, r * entre(a, 0.8, 1), rz], { mat: ROCA, tono: fundido(z, H * 2.6), giro: a.r() * 180 }));
    if (i > 0 && i < capas - 1) for (let k = 0; k < 2; k++) { const t = a.r() * 2 * PI; cs.push(bulto([x + Math.cos(t) * r * 0.7, y + Math.sin(t) * r * 0.7, z], [r * 0.45, r * 0.4, rz * 0.8], { mat: ROCA, tono: fundido(z, H * 2.6), giro: a.r() * 180 })); }
    // lajas facetadas en el borde de cada capa: aristas vivas sobre la masa
    if (i < capas - 1) for (let k = 0; k < 3 + Math.round(r / 10); k++) { const t = a.r() * 2 * PI; ps.push(pena(a, x + Math.cos(t) * r * 0.82, y + Math.sin(t) * r * 0.82, z, r * entre(a, 0.25, 0.4), r * entre(a, 0.2, 0.3), rz * entre(a, 0.6, 1), { mat: ROCA, giro: (t * 180) / PI + 90, tono: fundido(z, H * 2.6) + (a.r() - 0.5) * 0.1, n: 8 })); }
  }
  // espeleotemas que cuelgan del cono
  for (let i = 0; i < Math.round(R / 5); i++) { const t = a.r() * 2 * PI, u = entre(a, 0.25, 0.7), r = R * (1 - u) * 0.85; cs.push(...espeleo(a, [Math.cos(t) * r, Math.sin(t) * r, -H * u], entre(a, 8, 22), entre(a, 2, 4), { mat: ROCA, dir: -1, anillos: false })); }
  ps.push(masa(cs, { mat: ROCA, suave: 4 }));
  // la cara de arriba: lajas al ras con bordes rotos y líquen
  const n = Math.round(R / 4.5) + 4;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * PI + a.r() * 0.4, d = R * entre(a, 0.55, 0.92);
    ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, -2.6, entre(a, 6, 10), entre(a, 5, 8), 3.4, { mat: 'abi_roca_alta', giro: (t * 180) / PI, tono: (a.r() - 0.5) * 0.1, n: 10 }));
  }
  ps.push(a.elipsoide(0, 0, -2, R * 0.72, R * 0.66, 2.4, { mat: 'abi_roca_alta', giro: a.r() * 180, tono: -0.04 }));
  if (o.liquen !== false) for (let i = 0; i < Math.round(R / 9); i++) { const t = a.r() * 2 * PI, d = R * entre(a, 0.5, 0.85); ps.push(a.elipsoide(Math.cos(t) * d, Math.sin(t) * d, 0, entre(a, 3, 6), entre(a, 2, 4), 0.5, { mat: 'abi_liquen', giro: (t * 180) / PI + 90, tono: -0.15 })); }
  for (let i = 0; i < 3; i++) { const t = a.r() * 2 * PI, d = R * entre(a, 0.2, 0.7); ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, 0.5, entre(a, 1.4, 3), entre(a, 1.2, 2.4), entre(a, 1, 2), { mat: 'abi_roca_alta' })); }
  if (o.raices) for (let i = 0; i < 4; i++) {
    const t = a.r() * 2 * PI; let p: V3 = [Math.cos(t) * R * 0.85, Math.sin(t) * R * 0.85, -4];
    for (let k = 0; k < 5; k++) { const q: V3 = [p[0] + Math.cos(t) * entre(a, 1, 4) + (a.r() - 0.5) * 3, p[1] + Math.sin(t) * entre(a, 1, 4) + (a.r() - 0.5) * 3, p[2] - entre(a, 7, 13)]; ps.push(a.palo(p, q, Math.max(0.4, 1.6 - k * 0.3), { mat: 'corteza_muerta', tono: fundido(q[2], 120) })); p = q; }
  }
}
/** Árbol muerto y retorcido (masa), para islas y bordes. */
function arbolMuerto(a: Arma, ps: Pieza[], x: number, y: number, h: number) {
  const cs: Comp[] = [];
  let p: V3 = [x, y, -1], r = h * 0.07;
  for (let i = 1; i <= 4; i++) { const q: V3 = [p[0] + (a.r() - 0.5) * h * 0.18, p[1] + (a.r() - 0.5) * h * 0.18, (i / 4) * h * 0.7]; cs.push(hM(p, q, r, r * 0.78)); p = q; r *= 0.78; }
  for (let i = 0; i < 6; i++) {
    const t = a.r() * 2 * PI, b: V3 = [x + (p[0] - x) * entre(a, 0.5, 1), y + (p[1] - y) * entre(a, 0.5, 1), h * entre(a, 0.4, 0.72)];
    const m: V3 = [b[0] + Math.cos(t) * h * 0.2, b[1] + Math.sin(t) * h * 0.2, b[2] + h * entre(a, 0.08, 0.2)], q: V3 = [m[0] + Math.cos(t + 0.5) * h * 0.15, m[1] + Math.sin(t + 0.5) * h * 0.15, m[2] + h * entre(a, 0.0, 0.15)];
    cs.push(hM(b, m, h * 0.025, h * 0.015), hM(m, q, h * 0.015, 0.4));
  }
  for (let i = 0; i < 4; i++) { const t = a.r() * 2 * PI; cs.push(hM([x, y, 2], [x + Math.cos(t) * h * 0.18, y + Math.sin(t) * h * 0.18, -1], h * 0.04, h * 0.01)); }
  ps.push(masa(cs, { mat: 'corteza_muerta', suave: 1.6 }));
}

registrar(
  {
    id: 'abi_isla', nombre: ['Isla de roca flotante', 'Floating rock island'], tema: 'abismo', variantes: ['chica', 'mediana', 'grande', 'arbol', 'ruina'], cuadros: 8, t: 5, huella: [4, 4], huellaPor: { chica: [3, 3], grande: [6, 6] }, bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 5), ps: Pieza[] = [];
      const R = v === 'chica' ? entre(a, 14, 18) : v === 'grande' ? entre(a, 36, 42) : entre(a, 24, 30), H = R * entre(a, 1.6, 2.4) * (fm === 4 ? 1.4 : 1);
      isla(a, ps, R, H, { raices: fm % 2 === 1 || v === 'arbol' });
      if (v === 'arbol') arbolMuerto(a, ps, entre(a, -6, 6), entre(a, -6, 6), entre(a, 50, 70));
      if (v === 'ruina') {
        for (let i = 0; i < 3; i++) { const x = -R * 0.5 + i * R * 0.45, hh = [40, 22, 30][i] * entre(a, 0.7, 1.2); let z = 0; while (z < hh) { const h = entre(a, 8, 11); ps.push(sillar(a, [x + (a.r() - 0.5) * 2, -R * 0.3 + (a.r() - 0.5) * 2, z], 8, 8, h, a.r() * 20)); z += h; } }
        ps.push(sillar(a, [-R * 0.1, -R * 0.3, 40], R * 0.7, 9, 6, 0));
        for (let i = 0; i < 4; i++) ps.push(sillar(a, [entre(a, -R * 0.5, R * 0.5), entre(a, 0, R * 0.5), 0], entre(a, 5, 9), entre(a, 5, 8), entre(a, 3, 6), a.r() * 90, 'abi_sillar', 0.25));
      }
      if (fm >= 2) for (let i = 0; i < 2 + fm; i++) { const t = a.r() * 2 * PI, d = R * entre(a, 1.1, 1.5), z = entre(a, -H * 0.6, -4) + onda(f, 8, i) * 2; ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, z, entre(a, 2, 5), entre(a, 2, 4), entre(a, 2, 4), { mat: ROCA, tono: fundido(z, H) })); }
      // la niebla que se le pega abajo
      for (let i = 0; i < 3; i++) jiron(a, ps, [entre(a, -R, R) * 0.6, entre(a, -R, R) * 0.6, -H * entre(a, 0.5, 0.9)], R * 1.4, R * 0.25, entre(a, 0, 180), 'abi_niebla', -0.1);
      return flota(mover(ps, [0, 0, onda(f, 8) * 1.6], 0));
    },
  },
  {
    id: 'abi_islote', nombre: ['Islotes que flotan', 'Floating rocklets'], tema: 'abismo', variantes: ['piedras', 'cristales', 'sillares'], cuadros: 8, t: 5, huella: [3, 3], bloquea: false,
    armar: (v, f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [], n = 3 + fm;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 2 * PI + a.r(), d = entre(a, 6, 24), z = entre(a, -50, 30), r = entre(a, 4, 10) * (i === 0 ? 1.4 : 1), b = onda(f, 8, i * 1.7) * 2;
        const c: V3 = [Math.cos(t) * d, Math.sin(t) * d, z + b], gs: Pieza[] = [];
        if (v === 'sillares' && i % 2 === 0) gs.push(sillar(a, [0, 0, -r * 0.5], r * 1.4, r * 1.2, r, a.r() * 90, 'abi_sillar', 0.3));
        else { gs.push(pena(a, 0, 0, 0, r, r * 0.9, r * 0.45, { mat: 'abi_roca_alta', n: 12 })); gs.push(masa(espeleo(a, [0, 0, -r * 0.2], r * entre(a, 1.2, 2), r * 0.7, { mat: ROCA, dir: -1, anillos: false }), { mat: ROCA, suave: 1.5, tono: -0.1 })); }
        if (v === 'cristales') for (let k = 0; k < 3; k++) gs.push(prisma(a, [(a.r() - 0.5) * r, (a.r() - 0.5) * r, r * 0.2], [(a.r() - 0.5), (a.r() - 0.5), 1], entre(a, 4, 10), entre(a, 1, 2), k ? 'abi_obsidiana' : 'abi_runa'));
        ps.push(...mover(gs, c, a.r() * 360 + f * (i % 2 ? 2 : -2), entre(a, -15, 15)));
      }
      return flota(ps, v === 'cristales' ? { c: [0, 0, 0], r: 40, color: '#a060e0' } : undefined);
    },
  },
  {
    id: 'abi_puente', nombre: ['Puente de piedra sobre la nada', 'Stone bridge over nothing'], tema: 'abismo', variantes: ['tramo', 'roto', 'punta', 'pilar'], huella: [5, 2], bloquea: false,
    armar: (v, _f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [], W = 22, x0 = -40, x1 = v === 'roto' ? entre(a, -4, 8) : v === 'punta' ? entre(a, 10, 22) : 40;
      // el tablero: losas y pretiles de sillares gastados; donde se rompe, los bordes quedan dentados
      for (let x = x0; x < x1; x += 10) { const w = Math.min(10, x1 - x); ps.push(sillar(a, [x + w / 2, 0, -5], w + 0.4, W, 5, 0, 'abi_sillar', 0.05)); }
      for (const l of [-1, 1]) { let x = x0; while (x < x1 - 4) { const w = Math.min(entre(a, 9, 13), x1 - x), h = (v === 'roto' || v === 'punta') && x + w > x1 - 12 ? entre(a, 2, 5) : entre(a, 5, 7); if (!(fm === 2 && l === 1 && x > -10 && x < 10)) ps.push(sillar(a, [x + w / 2, l * (W / 2 - 1.6), 0], w - 0.5, 3.6, h, (a.r() - 0.5) * 3, 'abi_sillar', 0.2)); x += w; } }
      // el arco de abajo con sus dovelas, que baja a la pila
      const arco = (xa: number, xb: number) => { const n = 8; for (let i = 0; i <= n; i++) { const u = i / n, t = u * PI, x = xa + (xb - xa) * u, z = -6 - Math.sin(t) * 0 - (1 - Math.sin(t)) * 26; ps.push(sillar(a, [x, 0, z - 6], (xb - xa) / n + 1.4, W - 2, 6, 0, 'abi_sillar', 0.15, fundido(z, 120))); } };
      if (v !== 'punta') arco(-40, 40);
      else arco(-40, -10);
      const pila = v === 'pilar' || fm === 3;
      if (pila) for (let z = -34, i = 0; z > -180; z -= 10, i++) ps.push(sillar(a, [(a.r() - 0.5) * 2, 0, z - 10], 16 - i * 0.4, 18 - i * 0.4, 10, (a.r() - 0.5) * 6, 'abi_sillar', 0.15, fundido(z, 160)));
      if (v === 'roto' || v === 'punta') {
        // la rotura: cascotes que cuelgan y otros que caen
        for (let i = 0; i < 6; i++) ps.push(sillar(a, [x1 + entre(a, -2, 4), entre(a, -10, 10), entre(a, -14, -3)], entre(a, 3, 7), entre(a, 3, 7), entre(a, 3, 5), a.r() * 90, 'abi_sillar', 0.3, -0.05));
        for (let i = 0; i < 5; i++) { const z = entre(a, -120, -20); ps.push(sillar(a, [x1 + entre(a, 4, 20), entre(a, -12, 12), z], entre(a, 3, 8), entre(a, 3, 7), entre(a, 3, 6), a.r() * 90, 'abi_sillar', 0.3, fundido(z, 140))); }
      }
      if (fm === 1) for (let i = 0; i < 3; i++) ps.push(a.elipsoide(entre(a, -30, 20), (a.r() - 0.5) * 12, 0.1, entre(a, 2, 4), entre(a, 2, 3), 0.4, { mat: 'abi_liquen' }));
      jiron(a, ps, [entre(a, -20, 20), entre(a, -10, 10), -60], 60, 9, entre(a, -20, 20), 'abi_niebla', -0.15);
      return flota(ps);
    },
  },
  {
    id: 'abi_cadena', nombre: ['Cadena gigante del vacío', 'Giant chain of the void'], tema: 'abismo', variantes: ['colgante', 'tensa', 'rota', 'doble'], cuadros: 8, t: 6, huella: [2, 2], bloquea: false,
    armar: (v, f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [], L = entre(a, 12, 16), r = L * 0.13, sw = onda(f, 8) * 3;
      const top: V3 = [entre(a, -6, 6), entre(a, -6, 6), 170];
      if (v === 'tensa') {
        // de una argolla en el borde sube tirante hacia la oscuridad de arriba
        const g: V3 = [-30, -30, 0];
        ps.push(pena(a, g[0], g[1], -2, 14, 12, 7, { mat: 'abi_roca_alta', n: 14 }), a.cilindro(g[0], g[1], 0, 4, 4, { mat: 'abi_hierro' }));
        cadena(a, ps, [g[0], g[1], 6], [40, 40, 160], L, r, { mat: 'abi_hierro', comba: 8 + sw });
      } else {
        const fin = v === 'rota' ? entre(a, -40, 0) : -190;
        const xs = v === 'doble' ? [-10, 10] : [0];
        for (const x of xs) cadena(a, ps, [top[0] + x, top[1], top[2]], [x + sw, sw * 0.5, fin], L, r, { mat: 'abi_hierro' });
        if (v === 'rota') { const e: V3 = [sw, sw * 0.5, fin]; ps.push(a.palo(e, [e[0] + 4, e[1], e[2] - 6], r, { mat: 'abi_hierro' }), a.palo(e, [e[0] - 3, e[1] + 2, e[2] - 7], r, { mat: 'abi_hierro', r1: r * 0.4 })); }
        if (fm >= 2 && v !== 'rota') { // algo colgado: un eslabón de los que se cortaron y una jaula vieja
          const z = entre(a, -20, 40); ps.push(sillar(a, [sw * 0.8, sw * 0.4, z], 10, 10, 8, f * 4, 'abi_sillar', 0.3));
        }
      }
      // los eslabones que bajan se pierden en la niebla
      jiron(a, ps, [0, 0, -120], 50, 8, 30, 'abi_niebla_honda');
      return flota(hundir(ps, 190));
    },
  },
  {
    id: 'abi_ancla', nombre: ['Argolla de anclaje', 'Chain anchor'], tema: 'abismo', variantes: ['tensa', 'floja', 'rota'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const fm = forma(a, 3), ps: Pieza[] = [];
      // el bloque de roca con la argolla de hierro clavada y la cadena que va al vacío
      penasco(a, ps, [0, 0, 6], [18, 16, 10], { mat: 'abi_roca_alta', n: 3 });
      ps.push(a.cilindro(0, 0, 10, 6, 6, { mat: 'abi_hierro', r1: 5 }));
      for (let i = 0; i < 12; i++) { const t0 = (i / 12) * 2 * PI, t1 = ((i + 1) / 12) * 2 * PI; ps.push(a.palo([Math.cos(t0) * 7, 0, 22 + Math.sin(t0) * 7], [Math.cos(t1) * 7, 0, 22 + Math.sin(t1) * 7], 1.8, { mat: 'abi_hierro' })); }
      for (let i = 0; i < 4; i++) { const t = (i / 4) * 2 * PI + 0.4; ps.push(a.cilindro(Math.cos(t) * 9, Math.sin(t) * 9, 14, 1.6, 2, { mat: 'abi_hierro', r1: 1 })); }
      const L = 12, r = 1.6;
      if (v === 'tensa') cadena(a, ps, [0, 4, 16], [70, 60, -40], L, r, { mat: 'abi_hierro', comba: 4 });
      else if (v === 'floja') cadena(a, ps, [0, 4, 16], [50, 40, -110], L, r, { mat: 'abi_hierro', comba: 26 });
      else { cadena(a, ps, [0, 4, 16], [26, 22, 2], L, r, { mat: 'abi_hierro', comba: 3 }); ps.push(a.palo([26, 22, 2], [30, 25, 0.5], r, { mat: 'abi_hierro' })); }
      if (fm) calavera(a, ps, -10, 12, 0, 1, 70);
      return ps;
    },
  },
  {
    id: 'abi_escalera', nombre: ['Escalera que termina en el aire', 'Stairs ending in the air'], tema: 'abismo', variantes: ['recta', 'caracol', 'rota'], huella: [3, 5], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [];
      const n = 10 + fm * 2, sube = entre(a, 6, 7.5), paso = 8;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        let c: V3, g = 0;
        if (v === 'caracol') { const t = u * PI * 1.6; c = [Math.cos(t) * 18, Math.sin(t) * 18, i * sube]; g = (t * 180) / PI; }
        else c = [-30 + i * paso * 0.0, -36 + i * paso, i * sube];
        if (v === 'rota' && i > n * 0.55 && i < n * 0.75) continue;
        const flote = v === 'rota' && i >= n * 0.75 ? onda(f, 8, i) * 1.5 + (i - n * 0.75) * 2 : 0;
        // el peldaño y la zanca que lo sostiene, cada vez más gastados hacia la punta
        const gasto = 0.1 + u * 0.3;
        ps.push(sillar(a, [c[0], c[1], c[2] + flote], v === 'caracol' ? 10 : 22, v === 'caracol' ? 16 : 9, sube + 0.5, g + (a.r() - 0.5) * (4 + u * 10), 'abi_sillar', gasto));
        if (!(v === 'rota' && i >= n * 0.75)) ps.push(sillar(a, [c[0] + (v === 'caracol' ? 0 : 0), c[1], Math.max(-30, c[2] - 26)], v === 'caracol' ? 8 : 18, v === 'caracol' ? 12 : 9, Math.min(26, c[2] + 26), g, 'abi_sillar', 0.2, -0.12));
      }
      // la punta: un escalón que se desprende y pedazos que caen
      const ult: V3 = v === 'caracol' ? [Math.cos(PI * 1.6) * 18, Math.sin(PI * 1.6) * 18, n * sube] : [-30, -36 + n * paso, n * sube];
      for (let i = 0; i < 4; i++) { const z = ult[2] - entre(a, 10, 60) - ((f / 8) * 10) % 10; ps.push(sillar(a, [ult[0] + entre(a, -8, 8), ult[1] + entre(a, 2, 14), z], entre(a, 3, 6), entre(a, 3, 6), entre(a, 2, 5), a.r() * 90 + f * 6, 'abi_sillar', 0.3, -0.05)); }
      return ps;
    },
  },
  {
    id: 'abi_pilar', nombre: ['Pilar que sube de la oscuridad', 'Pillar rising from the dark'], tema: 'abismo', variantes: ['roto', 'capitel', 'cadenas', 'torcido'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [];
      const top = v === 'roto' ? entre(a, 20, 50) : entre(a, 50, 80), R = entre(a, 9, 12), inc = v === 'torcido' ? entre(a, 6, 12) : 0, g = a.r() * 360;
      const eje = (z: number): V3 => [Math.cos(rad(g)) * Math.tan(rad(inc)) * (z + 200), Math.sin(rad(g)) * Math.tan(rad(inc)) * (z + 200), z];
      // tambores octogonales de piedra, de lo más hondo hasta arriba
      for (let z = -220; z < top; z += 12) {
        const h = Math.min(12, top - z), c = eje(z);
        if (h < 2) break;
        const tono = fundido(z, 200);
        ps.push(tambor(a, c, eje(z + h - 0.6), R, 'abi_sillar', tono));
        if (a.r() < 0.25) ps.push(pena(a, c[0] + R * 0.8, c[1] + R * 0.6, z + h * 0.5, 4, 3, 3, { mat: 'abi_sillar', tono: tono + 0.05 }));
      }
      const t = eje(top);
      if (v === 'capitel') { ps.push(sillar(a, [t[0], t[1], t[2]], R * 2.6, R * 2.6, 5, 0, 'abi_sillar', 0.1), sillar(a, [t[0], t[1], t[2] + 5], R * 3, R * 3, 4, 0, 'abi_sillar', 0.15)); }
      else { for (let i = 0; i < 5; i++) ps.push(pena(a, t[0] + (a.r() - 0.5) * R, t[1] + (a.r() - 0.5) * R, t[2] + entre(a, 0, 4), entre(a, 3, 6), entre(a, 3, 5), entre(a, 2, 5), { mat: 'abi_sillar' })); }
      if (v === 'cadenas') for (let i = 0; i < 2 + fm % 2; i++) { const zz = entre(a, -40, top - 10), an = a.r() * 2 * PI; cadena(a, ps, [t[0] + Math.cos(an) * R, t[1] + Math.sin(an) * R, zz], [Math.cos(an) * 60, Math.sin(an) * 60, zz - entre(a, 30, 90)], 9, 1.2, { mat: 'abi_hierro', comba: 10 }); }
      if (fm >= 2) for (let i = 0; i < 4; i++) ps.push(a.elipsoide(t[0] + (a.r() - 0.5) * R * 2, t[1] + R * 0.8, entre(a, -20, top), 3, 1.5, 6, { mat: 'abi_liquen' }));
      jiron(a, ps, [0, 0, -70], 70, 10, entre(a, 0, 180), 'abi_niebla', -0.1);
      jiron(a, ps, [0, 0, -140], 90, 14, entre(a, 0, 180), 'abi_niebla_honda');
      return flota(ps);
    },
  },
  {
    id: 'abi_borde', nombre: ['Borde del precipicio', 'Precipice edge'], tema: 'abismo', variantes: [...BORDES], huella: [5, 5], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      bordeVacio(a, ps, v, {
        mat: ROCA, matLabio: 'abi_roca_alta', D: 170,
        extra: (p, n, u) => {
          const r = a.r();
          if (r < 0.2) { let q: V3 = [p[0] + n[0] * 3, p[1] + n[1] * 3, -3]; for (let k = 0; k < 5; k++) { const w: V3 = [q[0] + n[0] * entre(a, 0, 2) + (a.r() - 0.5) * 3, q[1] + n[1] * entre(a, 0, 2), q[2] - entre(a, 8, 14)]; ps.push(a.palo(q, w, Math.max(0.4, 1.5 - k * 0.25), { mat: 'corteza_muerta', tono: fundido(w[2], 100) })); q = w; } }
          else if (r < 0.32) ps.push(masa(espeleo(a, [p[0] + n[0] * 4, p[1] + n[1] * 4, -8], entre(a, 10, 26), entre(a, 2.5, 4), { mat: ROCA, dir: -1 }), { mat: ROCA, suave: 1.5, tono: -0.1 }));
          else if (r < 0.45) ps.push(a.elipsoide(p[0] - n[0] * entre(a, 4, 14), p[1] - n[1] * entre(a, 4, 14), 0.2, entre(a, 2, 5), entre(a, 2, 4), 0.5, { mat: 'abi_liquen' }));
          if (u > 0.3 && u < 0.7 && a.r() < 0.5) jiron(a, ps, [p[0] + n[0] * 14, p[1] + n[1] * 14, entre(a, -90, -40)], 40, 7, (Math.atan2(n[0], -n[1]) * 180) / PI, 'abi_niebla', -0.15);
        },
      });
      return ps;
    },
  },
  {
    id: 'abi_fragmentos', nombre: ['Fragmentos que caen', 'Slowly falling fragments'], tema: 'abismo', variantes: ['piedras', 'ruina', 'polvo'], cuadros: 12, t: 4, huella: [2, 2], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'polvo' ? 26 : 9;
      for (let i = 0; i < n; i++) {
        const ph = a.r(), x = entre(a, -24, 24), y = entre(a, -24, 24), r = v === 'polvo' ? entre(a, 0.8, 1.6) : entre(a, 3, 8), giro0 = a.r() * 360, gv = entre(a, -20, 20);
        const u = (ph + f / 12) % 1, z = 70 - u * 170, k = u < 0.12 ? u / 0.12 : 1;
        const tono = fundido(z, 260);
        if (v === 'ruina' && i % 2 === 0) ps.push(...mover([sillar(a, [0, 0, -r * 0.5], r * 1.6 * k, r * 1.2 * k, r * k, 0, 'abi_sillar', 0.3, tono)], [x, y, z], giro0 + u * gv * 12, u * 200));
        else ps.push(...mover([pena(a, 0, 0, 0, r * k, r * 0.8 * k, r * 0.7 * k, { mat: v === 'polvo' ? 'abi_roca_alta' : ROCA, tono, n: 8 })], [x, y, z], giro0 + u * gv * 12, u * 160));
      }
      return flota(ps);
    },
  },
  {
    id: 'abi_runa', nombre: ['Runa flotante', 'Floating rune stone'], tema: 'abismo', variantes: ['violeta', 'azul', 'roja'], cuadros: 8, t: 4, huella: [1, 1], bloquea: false,
    armar: (v, f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [], mat = v === 'azul' ? 'abi_runa_azul' : v === 'roja' ? 'abi_runa_roja' : 'abi_runa';
      const col = v === 'azul' ? '#5aa0f0' : v === 'roja' ? '#f05040' : '#b070f0';
      const z = 30 + onda(f, 8) * 3, h = entre(a, 20, 28), w = entre(a, 9, 12);
      // una laja de obsidiana con los surcos encendidos en sus dos caras
      const g: Pieza[] = [pena(a, 0, 0, 0, w, 2.4, h * 0.5, { mat: 'abi_obsidiana', giro: 0, n: 12 })];
      const trazos = 4 + fm;
      for (let k = 0; k < trazos; k++) { const zz = (a.r() - 0.5) * h * 0.6, xx = (a.r() - 0.5) * w * 0.8, an = a.r() * PI, L = entre(a, 4, 8); for (const s of [-1, 1]) g.push(a.caja(xx, s * 2.1, zz, L, 0.6, 1.3, { mat, giro: 0, incl: 0, tono: onda(f, 8, k) * 0.08 })), g.push(...mover([a.caja(0, 0, -L / 2, 1.3, 0.6, L, { mat })], [xx, s * 2.1, zz], 0, (an * 180) / PI, 'y')); }
      ps.push(...mover(g, [0, 0, z], f * 45 / 8 * (fm % 2 ? 1 : -1) + a.r() * 360));
      // motas de luz que giran alrededor
      for (let i = 0; i < 5; i++) { const t = (i / 5) * 2 * PI + (f / 8) * 2 * PI; ps.push(a.esfera(Math.cos(t) * 12, Math.sin(t) * 12, z + Math.sin(t * 2) * 5, 0.7, { mat })); }
      return flota(ps, { c: [0, 0, z], r: 30, color: col });
    },
  },
  {
    id: 'abi_circulo_runas', nombre: ['Círculo de runas', 'Rune circle'], tema: 'abismo', variantes: ['violeta', 'azul', 'roja'], cuadros: 8, t: 4, huella: [4, 4], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], mat = v === 'azul' ? 'abi_runa_azul' : v === 'roja' ? 'abi_runa_roja' : 'abi_runa', col = v === 'azul' ? '#5aa0f0' : v === 'roja' ? '#f05040' : '#b070f0';
      const n = 6 + forma(a, 3), R = entre(a, 26, 32), giro = (f / 8) * (2 * PI / n);
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 2 * PI + giro, z = 18 + onda(f, 8, i) * 2.5, h = entre(a, 10, 16);
        const g: Pieza[] = [pena(a, 0, 0, 0, 4.5, 1.8, h * 0.5, { mat: 'abi_obsidiana', giro: 0, n: 10 }), a.caja(0, 1.6, -h * 0.25, 1, 0.5, h * 0.5, { mat }), a.caja(0, 1.6, h * 0.05, 4, 0.5, 0.9, { mat })];
        ps.push(...mover(g, [Math.cos(t) * R, Math.sin(t) * R, z], (t * 180) / PI + 90));
      }
      // el centro: un cristal que gira sobre su eje y un aro de luz en el aire
      ps.push(...mover([prisma(a, [0, 0, -9], [0, 0, 1], 18, 4, 'abi_obsidiana'), prisma(a, [0, 0, -8], [0, 0, 1], 16, 1.6, mat)], [0, 0, 22 + onda(f, 8) * 2], f * 11));
      for (let i = 0; i < 24; i++) { const t0 = (i / 24) * 2 * PI, t1 = ((i + 1) / 24) * 2 * PI; if ((i + f) % 4 === 0) continue; ps.push(a.palo([Math.cos(t0) * R * 0.6, Math.sin(t0) * R * 0.6, 4], [Math.cos(t1) * R * 0.6, Math.sin(t1) * R * 0.6, 4], 0.6, { mat })); }
      return flota(ps, { c: [0, 0, 18], r: 50, color: col });
    },
  },
  {
    id: 'abi_ojos', nombre: ['Ojos en el fondo', 'Eyes in the depths'], tema: 'abismo', variantes: ['par', 'muchos', 'gigante'], cuadros: 8, t: 5, huella: [3, 3], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'muchos' ? 7 : 1;
      for (let i = 0; i < n; i++) {
        const s = v === 'gigante' ? 3.2 : v === 'muchos' ? entre(a, 0.8, 1.4) : 1.6, x = n > 1 ? entre(a, -30, 30) : 0, y = n > 1 ? entre(a, -30, 30) : 0, z = entre(a, -150, -90), fase = Math.floor(a.r() * 8);
        // la oscuridad de alrededor: niebla honda, y los ojos con su pupila partida
        jiron(a, ps, [x, y, z - 2], 18 * s, 4 * s, a.r() * 180, 'abi_niebla_honda', 0.05);
        const parp = (f + fase) % 8, ab = parp === 0 ? 0.08 : parp === 1 ? 0.5 : 1, mira = Math.sin((f + fase) * 0.8) * 0.6 * s;
        for (const l of [-1, 1]) {
          const c: V3 = [x + l * 4 * s * 0.7, y - l * 4 * s * 0.7, z];
          ps.push(a.elipsoide(...c, 2.6 * s, 2.6 * s, 1.6 * s * ab, { mat: 'abi_ojo', giro: -45 }));
          if (ab > 0.3) ps.push(a.elipsoide(c[0] + 1.6 * s + mira, c[1] + 1.6 * s - mira, c[2], 0.5 * s, 0.5 * s, 1.3 * s * ab, { mat: 'abi_vacio' }));
        }
      }
      return flota(ps, { c: [0, 0, -110], r: 40, color: '#e0a030' });
    },
  },
  {
    id: 'abi_niebla', nombre: ['Niebla violeta que fluye', 'Flowing violet mist'], tema: 'abismo', variantes: ['baja', 'espesa', 'jirones', 'honda'], cuadros: 8, t: 5, huella: [5, 5], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'espesa' ? 10 : v === 'jirones' ? 5 : 7, dir = entre(a, -20, 20);
      for (let i = 0; i < n; i++) {
        const ph = a.r(), u = (ph + f / 8) % 1, L = entre(a, 30, 60) * (v === 'jirones' ? 0.7 : 1), r = entre(a, 5, 10) * (v === 'espesa' ? 1.3 : 1);
        const y = entre(a, -36, 36), z = v === 'honda' ? entre(a, -140, -60) : v === 'baja' ? entre(a, -30, -6) : entre(a, -50, 10);
        // cada jirón entra por un lado, corre y se apaga al salir
        const x = -40 + u * 80, k = Math.sin(u * PI);
        jiron(a, ps, [x * Math.cos(rad(dir)) - y * Math.sin(rad(dir)), x * Math.sin(rad(dir)) + y * Math.cos(rad(dir)), z], L * (0.6 + k * 0.4), r * (0.5 + k * 0.5), dir, v === 'honda' ? 'abi_niebla_honda' : 'abi_niebla', -0.35 + k * 0.3);
      }
      return flota(ps);
    },
  },
);

/** Arco apuntado de sillares: jambas hasta `hj`, luz 2·`sx`, a lo largo de x en y = `y`. */
function arcoOjival(a: Arma, ps: Pieza[], sx: number, hj: number, y = 0, roto = 0) {
  for (const l of [-1, 1]) {
    for (let z = 0; z < hj; z += 7) ps.push(sillar(a, [l * (sx + 3), y, z], 7, 7.5, 7, (a.r() - 0.5) * 4, 'abi_sillar', 0.12));
    const n = 6;
    for (let i = 0; i < n; i++) {
      if (roto && l === 1 && i >= n - roto) continue;
      const t0 = PI - (i / n) * (PI / 3), t1 = PI - ((i + 1) / n) * (PI / 3), cx = -l * sx;
      const p0: V3 = [-l * (cx + 2 * sx * Math.cos(t0)) * -1, y, hj + 2 * sx * Math.sin(t0)], p1: V3 = [-l * (cx + 2 * sx * Math.cos(t1)) * -1, y, hj + 2 * sx * Math.sin(t1)];
      ps.push(viga(a, p0, p1, 7.5, 6.5, 'abi_sillar', (a.r() - 0.5) * 0.08));
    }
  }
}
/** Cabeza colosal de mármol (masa): cráneo, frente, cejas, nariz, pómulos, labios, mentón, orejas y cuello. Mira a +x. */
function cabezaColosal(a: Arma, s: number, ojos: string | null, cuello = -40): Pieza[] {
  const cs: Comp[] = [], ps: Pieza[] = [], k = { k: 1.2 * s };
  cs.push(bulto([-1 * s, 0, 36 * s], [14 * s, 12.5 * s, 15 * s]), bulto([7 * s, 0, 27 * s], [8 * s, 10.5 * s, 14 * s]));
  cs.push(hM([13 * s, -8.5 * s, 32.5 * s], [14.5 * s, 0, 33.5 * s], 2.6 * s, 2.8 * s, k), hM([14.5 * s, 0, 33.5 * s], [13 * s, 8.5 * s, 32.5 * s], 2.8 * s, 2.6 * s, k));
  cs.push(hM([15 * s, 0, 31 * s], [20 * s, 0, 22.5 * s], 2 * s, 3 * s, k), bulto([18.6 * s, 0, 21.6 * s], [2.6 * s, 3.8 * s, 2 * s], k));
  for (const l of [-1, 1]) { cs.push(bulto([11.5 * s, l * 7.5 * s, 24 * s], [3.4 * s, 3 * s, 3.4 * s], k), hM([2 * s, l * 10.5 * s, 22 * s], [11 * s, l * 6.5 * s, 9.5 * s], 4 * s, 3 * s, k), bulto([-1 * s, l * 12.5 * s, 26 * s], [2.4 * s, 2 * s, 5 * s], k)); }
  cs.push(bulto([16.4 * s, 0, 16.6 * s], [2.2 * s, 4.4 * s, 1.1 * s], k), bulto([16 * s, 0, 14.2 * s], [2 * s, 3.8 * s, 1 * s], k), bulto([13.5 * s, 0, 9 * s], [4.5 * s, 6 * s, 4 * s], k));
  cs.push(hM([1 * s, 0, 18 * s], [-3 * s, 0, cuello * s], 8.5 * s, 10 * s, { k: 3 * s }));
  // capucha o velo de duelo según la semilla
  if (a.r() < 0.5) { cs.push(bulto([-4 * s, 0, 38 * s], [15 * s, 14.5 * s, 17 * s], { tono: -0.1, k: 2 * s })); for (const l of [-1, 1]) cs.push(hM([4 * s, l * 13 * s, 40 * s], [2 * s, l * 15 * s, 4 * s], 3 * s, 5 * s, { tono: -0.1 })); }
  ps.push(masa(cs, { mat: 'abi_marmol', suave: 1.6 * s }));
  for (const l of [-1, 1]) {
    ps.push(a.elipsoide(14.6 * s, l * 4.6 * s, 28.4 * s, 2.6 * s, 2.8 * s, 2 * s, { mat: 'negro' }));
    if (ojos) ps.push(a.esfera(16.6 * s, l * 4.6 * s, 28.6 * s, 0.9 * s, { mat: ojos }));
  }
  ps.push(a.caja(18.6 * s, 0, 15 * s, 0.8 * s, 7 * s, 0.6 * s, { mat: 'negro' }));
  // grietas que le parten la cara
  for (let i = 0; i < 3; i++) ps.push(a.caja(entre(a, 10, 16) * s, (a.r() - 0.5) * 16 * s, entre(a, 12, 40) * s, 0.5 * s, entre(a, 3, 6) * s, 0.4 * s, { mat: 'negro', giro: 90 + entre(a, -30, 30), incl: entre(a, -60, 60) }));
  return ps;
}

registrar(
  {
    id: 'abi_ruina', nombre: ['Ruina suspendida', 'Suspended ruin'], tema: 'abismo', variantes: ['arco', 'ventana', 'torre'], cuadros: 8, t: 5, huella: [4, 4], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [], R = entre(a, 24, 30);
      isla(a, ps, R, R * entre(a, 1.6, 2.2), { raices: fm % 2 === 1 });
      if (v === 'arco') arcoOjival(a, ps, entre(a, 11, 14), entre(a, 18, 26), -R * 0.25, fm === 2 ? 3 : 0);
      else if (v === 'ventana') {
        // un lienzo de muro con su ventanal ojival cavado y la tracería rota
        const W = R * 1.3, H = entre(a, 46, 60), y = -R * 0.3;
        for (let z = 0, i = 0; z < H; z += 7, i++) for (let x = -W / 2; x < W / 2; x += 10) { const top = H - Math.abs(x) * (fm % 2 ? 0.9 : 0.4) - (a.r() < 0.3 ? 7 : 0); if (z > top) continue; ps.push(sillar(a, [x + 5 + (i % 2) * 3, y, z], 10, 8, 7, 0, 'abi_sillar', 0.1)); }
        ps.push(a.caja(0, y, 8, 12, 12, 26, { mat: 'abi_sillar', resta: true }), a.cilindro(0, y - 6, 34, 6, 12, { mat: 'abi_sillar', resta: true, eje: [0, 1, 0] }));
        ps.push(a.palo([0, y, 8], [0, y, 36], 1, { mat: 'abi_sillar' }), a.palo([-6, y, 30], [0, y, 37], 0.9, { mat: 'abi_sillar' }));
      } else {
        // muñón de torre redonda: anillos de sillares que se rompen arriba en diagonal
        const r = entre(a, 12, 15), H = entre(a, 44, 64);
        for (let z = 0, k = 0; z < H; z += 7, k++) { const n = 10; for (let i = 0; i < n; i++) { const t = (i / n) * 2 * PI + (k % 2) * (PI / n), top = H - (Math.cos(t - 0.8) + 1) * H * 0.3; if (z > top) continue; ps.push(sillar(a, [Math.cos(t) * r, -R * 0.15 + Math.sin(t) * r, z], 8, 6, 7, (t * 180) / PI + 90, 'abi_sillar', 0.12)); } }
        ps.push(a.caja(r, -R * 0.15 + 2, 0, 6, 8, 18, { mat: 'abi_sillar', resta: true }));
      }
      for (let i = 0; i < 4; i++) ps.push(sillar(a, [entre(a, -R * 0.6, R * 0.6), entre(a, 0, R * 0.6), 0], entre(a, 4, 8), entre(a, 4, 7), entre(a, 3, 5), a.r() * 90, 'abi_sillar', 0.3));
      return flota(mover(ps, [0, 0, onda(f, 8) * 1.4], 0));
    },
  },
  {
    id: 'abi_altar', nombre: ['Altar sobre el abismo', 'Altar over the abyss'], tema: 'abismo', variantes: ['sangre', 'vacio', 'cadenas'], cuadros: 8, t: 4, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 3), ps: Pieza[] = [];
      // la aguja de roca que sube de lo hondo y se abre arriba en una meseta
      for (let z = -200, i = 0; z < -4; z += 12, i++) { const u = (z + 200) / 196, r = 8 + Math.pow(u, 3) * 18; penasco(a, ps, [(a.r() - 0.5) * 4, (a.r() - 0.5) * 4, z], [r, r * 0.9, 9], { mat: ROCA, n: 1, tono: fundido(z, 200) }); }
      for (let i = 0; i < 9; i++) { const t = (i / 9) * 2 * PI; ps.push(pena(a, Math.cos(t) * 20, Math.sin(t) * 18, -3, 9, 7, 4, { mat: 'abi_roca_alta', giro: (t * 180) / PI, n: 10 })); }
      ps.push(a.elipsoide(0, 0, -2.5, 22, 20, 2.6, { mat: 'abi_roca_alta' }));
      // el ara: dos sillares y la mesa
      ps.push(sillar(a, [-6, -2, 0], 6, 14, 12, 0), sillar(a, [6, -2, 0], 6, 14, 12, 0), sillar(a, [0, -2, 12], 22, 16, 4, (a.r() - 0.5) * 4, 'abi_sillar', 0.08));
      let luz = '#b070f0';
      if (v === 'sangre') { ps.push(a.elipsoide(1, -2, 16, 7, 5, 0.7, { mat: 'sangre' }), a.palo([10, 4, 16], [10, 7, 0], 0.6, { mat: 'sangre' })); calavera(a, ps, -4, -4, 16, 1, 30); luz = '#e04040'; }
      else if (v === 'vacio') { const z = 26 + onda(f, 8) * 2; ps.push(a.esfera(0, -2, z, 5, { mat: 'abi_vacio' })); for (let i = 0; i < 6; i++) { const t = (i / 6) * 2 * PI + (f / 8) * 2 * PI; ps.push(a.esfera(Math.cos(t) * 8, -2 + Math.sin(t) * 8, z + Math.sin(t * 2) * 2, 0.7, { mat: 'abi_runa' })); } }
      else { for (let i = 0; i < 3; i++) { const t = a.r() * 2 * PI; cadena(a, ps, [Math.cos(t) * 10, Math.sin(t) * 8, 14], [Math.cos(t) * 50, Math.sin(t) * 50, -80], 7, 0.9, { mat: 'abi_hierro', comba: 10 }); } }
      // velas de fuego violeta y el círculo de runas en el piso
      for (let i = 0; i < 3 + fm; i++) { const t = (i / (3 + fm)) * 2 * PI + 0.3, x = Math.cos(t) * 15, y = Math.sin(t) * 13; ps.push(a.cilindro(x, y, 0, 1.4, 5 + a.r() * 4, { mat: 'cera', tono: -0.2 })); ps.push(a.elipsoide(x, y, 7 + a.r() * 2 + onda(f, 8, i) * 0.4, 0.9, 0.9, 2, { mat: 'abi_fuego' })); }
      for (let i = 0; i < 20; i++) { if (i % 5 === (f % 5)) continue; const t0 = (i / 20) * 2 * PI, t1 = ((i + 1) / 20) * 2 * PI; ps.push(a.palo([Math.cos(t0) * 18, Math.sin(t0) * 16, 0.3], [Math.cos(t1) * 18, Math.sin(t1) * 16, 0.3], 0.5, { mat: 'abi_runa' })); }
      jiron(a, ps, [0, 0, -60], 60, 10, 20, 'abi_niebla', -0.1);
      return flota(hundir(ps, 200), { c: [0, -2, 18], r: 40, color: luz });
    },
  },
  {
    id: 'abi_estatua', nombre: ['Estatua tragada por la nada', 'Statue swallowed by the void'], tema: 'abismo', variantes: ['cabeza', 'rostro', 'torso', 'mano'], huella: [5, 5], bloquea: true,
    armar: (v, _f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [], s = entre(a, 1.4, 1.8);
      const ojos = fm === 1 ? 'abi_ojo' : fm === 3 ? 'abi_runa' : null;
      if (v === 'cabeza') {
        const cab = cabezaColosal(a, s, ojos);
        // corona o capucha según la semilla
        if (fm % 2 === 0) for (let i = 0; i < 7; i++) { const t = -PI * 0.6 + (i / 6) * PI * 1.2; cab.push(a.poliedro([[Math.cos(t) * 15 * s, Math.sin(t) * 14 * s, 44 * s], [Math.cos(t + 0.15) * 15 * s, Math.sin(t + 0.15) * 14 * s, 44 * s], [Math.cos(t) * 13 * s, Math.sin(t) * 12 * s, 44 * s], [Math.cos(t + 0.07) * 15 * s, Math.sin(t + 0.07) * 14 * s, 54 * s]], { mat: 'abi_marmol', tono: -0.05 })); }
        ps.push(...mover(cab, [0, 0, -14 * s], entre(a, 25, 65), entre(a, -22, -8), 'y'));
      } else if (v === 'rostro') {
        ps.push(...mover(cabezaColosal(a, s * 1.2, ojos, 8), [-6 * s, -6 * s, -24 * s], 45 + entre(a, -20, 20), 68, 'y'));
      } else if (v === 'torso') {
        // un ángel con los brazos cruzados y las alas rotas, hundido hasta la cintura
        const cs: Comp[] = [bulto([0, 0, 8 * s], [8 * s, 13 * s, 12 * s]), bulto([1 * s, 0, -6 * s], [7 * s, 10 * s, 10 * s]), hM([0, 0, -10 * s], [-1 * s, 0, -40 * s], 9 * s, 10 * s)];
        for (const l of [-1, 1]) {
          const hom: V3 = [0, l * 13 * s, 17 * s], codo: V3 = [5 * s, l * 15 * s, 3 * s], mano: V3 = [9 * s, -l * 5 * s, 11 * s];
          cs.push(bulto(hom, [5 * s, 5 * s, 5 * s]), hM(hom, codo, 4 * s, 3.2 * s), hM(codo, mano, 3.2 * s, 2.6 * s), bulto(mano, [2.4 * s, 3 * s, 2 * s]), bulto([6 * s, l * 5 * s, 12 * s], [3.4 * s, 4.4 * s, 3.6 * s], { k: s }));
        }
        cs.push(hM([0, 0, 18 * s], [1 * s, 0, 25 * s], 3.4 * s, 3.2 * s), bulto([1.5 * s, 0, 31 * s], [5.5 * s, 4.8 * s, 6.5 * s]), bulto([5 * s, 0, 29.5 * s], [2.6 * s, 3.6 * s, 4.4 * s], { k: s }), hM([6 * s, 0, 31 * s], [7.6 * s, 0, 28.5 * s], 0.9 * s, 1.3 * s, { k: 0.6 * s }));
        cs.push(bulto([-1 * s, 0, 33 * s], [6 * s, 5.6 * s, 6 * s], { mat: 'abi_marmol', tono: -0.08 }), hM([-2 * s, 0, 33 * s], [-4 * s, 0, 20 * s], 4.5 * s, 2 * s, { tono: -0.08 }));
        const t: Pieza[] = [masa(cs, { mat: 'abi_marmol', suave: 1.8 * s })];
        t.push(a.esfera(6.4 * s, -1.9 * s, 31.4 * s, 0.9 * s, { mat: 'negro' }), a.esfera(6.4 * s, 1.9 * s, 31.4 * s, 0.9 * s, { mat: 'negro' }));
        // las alas: abanicos de plumas largas, una entera y otra partida
        for (const l of [-1, 1]) {
          const rota = fm % 2 === 1 && l === 1, n = rota ? 3 : 7;
          for (let kk = 0; kk < n; kk++) {
            const u = kk / 6, base: V3 = [-6 * s, l * 8 * s, 18 * s], an = 0.25 + u * 1.1, L = (rota ? 14 : 30 - u * 8) * s;
            const tip: V3 = [-10 * s - u * 4 * s, l * (8 + Math.cos(an) * L / s) * s, 18 * s + Math.sin(an) * L];
            t.push(a.poliedro([base, [base[0] - 1.6 * s, base[1], base[2] - 2 * s], tip, [tip[0] + 1.2 * s, tip[1] - l * 3 * s, tip[2] - 4 * s], [base[0] - 0.8 * s, base[1] + l * 1.5 * s, base[2] + 1]], { mat: 'abi_marmol', tono: -0.06 - u * 0.08 }));
          }
        }
        ps.push(...mover(t, [0, 0, -12 * s], 45 + entre(a, -30, 30), entre(a, -14, 6)));
      } else {
        // una mano de piedra que sube abierta, como pidiendo, con algo en la palma
        const cs: Comp[] = [hM([0, 0, -60], [0, 0, 18 * s], 9 * s, 7 * s), bulto([0, 0, 24 * s], [8 * s, 10 * s, 6 * s])];
        for (let k = 0; k < 4; k++) { const y = (-6 + k * 4) * s, cur = fm === 2 ? 0.5 : 1; cs.push(hM([2 * s, y, 28 * s], [5 * s, y * 1.1, 40 * s], 2 * s, 1.8 * s), hM([5 * s, y * 1.1, 40 * s], [5 * s + 4 * s * cur, y * 1.1, 47 * s - 2 * s * cur], 1.8 * s, 1.5 * s)); }
        cs.push(hM([0, 9 * s, 24 * s], [6 * s, 14 * s, 32 * s], 2.6 * s, 2 * s));
        ps.push(...mover([masa(cs, { mat: 'abi_marmol', suave: 1.6 * s })], [0, 0, -10], 30 + entre(a, -20, 20), entre(a, -10, 10)));
        if (fm % 2 === 0) ps.push(a.esfera(1, 0, 33 * s, 4 * s, { mat: fm === 0 ? 'abi_runa' : 'abi_vacio' }));
      }
      // la nada que se lo traga: un disco de vacío que tapa lo de abajo, niebla en el borde y lo de abajo apagado
      ps.push(a.caja(0, 0, -400, 600, 600, 386, { mat: 'abi_vacio', resta: true }));
      for (let i = 0; i < 5; i++) { const t = (i / 5) * 2 * PI + a.r(); jiron(a, ps, [Math.cos(t) * 18 * s, Math.sin(t) * 18 * s, -10], 36 * s, 6 * s, (t * 180) / PI + 90, 'abi_niebla', -0.1); }
      for (let i = 0; i < 5; i++) { const z = entre(a, -90, -20); ps.push(pena(a, entre(a, -20, 20) * s, entre(a, -20, 20) * s, z, entre(a, 2, 5), entre(a, 2, 4), entre(a, 2, 4), { mat: 'abi_marmol', tono: fundido(z, 120) })); }
      return flota(ps, ojos ? { c: [10, 0, 20], r: 40, color: ojos === 'abi_ojo' ? '#e0a030' : '#b070f0' } : undefined);
    },
  },
  {
    id: 'abi_portal', nombre: ['Desgarro en el vacío', 'Rift in the void'], tema: 'abismo', variantes: ['violeta', 'negro', 'rojo'], cuadros: 8, t: 3, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], borde = v === 'rojo' ? 'abi_runa_roja' : 'abi_runa', col = v === 'rojo' ? '#f05040' : '#a060e0';
      const H = entre(a, 40, 52), W = entre(a, 14, 18), z0 = 8;
      // el tajo: un óvalo de nada con el borde que arde y se deshilacha
      ps.push(a.elipsoide(0, 0, z0 + H / 2, W, 2, H / 2, { mat: v === 'negro' ? 'abi_vacio' : 'abi_niebla_honda', tono: -0.1 }));
      // adentro gira un remolino de hebras que se hunden hacia el centro
      for (let k = 0; k < 3; k++) for (let i = 0; i < 14; i++) { const u = i / 14, t = u * 2 * PI * 1.4 + k * 2.1 + (f / 8) * 2 * PI * 0.5, r = (1 - u * 0.85); ps.push(a.elipsoide(Math.cos(t) * W * r * 0.85, 1.2, z0 + H / 2 + Math.sin(t) * (H / 2) * r * 0.85, 2.2 * r + 0.5, 0.6, 0.9 * r + 0.4, { mat: v === 'negro' ? 'abi_niebla_honda' : borde, tono: -0.35 - u * 0.3, incl: (t * 180) / PI, inclEje: 'y' })); }
      for (let i = 0; i < 40; i++) { const t = (i / 40) * 2 * PI, jit = 1 + Math.sin(i * 2.3 + f * 0.8) * 0.1; ps.push(a.elipsoide(Math.cos(t) * W * jit, 0.6, z0 + H / 2 + Math.sin(t) * (H / 2) * jit, 2.4, 1.8, 2.4, { mat: borde, tono: onda(f, 8, i) * 0.1 - 0.05 })); }
      if (v !== 'negro') for (let i = 0; i < 10; i++) { const u = ((i / 10) + f / 8) % 1, t = i * 2.4 + u * 4, r = (1 - u) * W * 0.9; ps.push(a.esfera(Math.cos(t) * r, 1.5, z0 + H / 2 + Math.sin(t) * r * (H / (2 * W)), 0.6 + (1 - u) * 0.6, { mat: borde, tono: -u * 0.3 })); }
      // esquirlas de roca que orbitan el desgarro
      for (let i = 0; i < 7; i++) { const t = (i / 7) * 2 * PI + (f / 8) * 0.8, r = W + entre(a, 6, 14); ps.push(pena(a, Math.cos(t) * r, Math.sin(t) * 6, z0 + H / 2 + Math.sin(t) * (H / 2 + 6), entre(a, 1.5, 3.5), entre(a, 1.5, 3), entre(a, 1.5, 3), { mat: ROCA })); }
      return flota(ps, { c: [0, 6, z0 + H / 2], r: 50, color: col });
    },
  },
  {
    id: 'abi_grieta', nombre: ['Grieta que deja ver el vacío', 'Crack into the void'], tema: 'abismo', variantes: ['violeta', 'azul', 'roja'], cuadros: 8, t: 4, huella: [3, 3], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], fm = forma(a, 4), mat = v === 'azul' ? 'abi_runa_azul' : v === 'roja' ? 'abi_runa_roja' : 'abi_runa', col = v === 'azul' ? '#5aa0f0' : v === 'roja' ? '#f05040' : '#a060e0';
      const pts: [number, number][] = [];
      let p: [number, number] = [-26, -20], t = rad(40 + (a.r() - 0.5) * 30);
      for (let i = 0; i < 8; i++) { pts.push(p); t += (a.r() - 0.5) * 1.2; p = [p[0] + Math.cos(t) * 10, p[1] + Math.sin(t) * 10]; }
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], g = (Math.atan2(y1 - y0, x1 - x0) * 180) / PI, w = 6 - Math.abs(i - 3.5) * 0.8;
        ps.push(a.caja((x0 + x1) / 2, (y0 + y1) / 2, 0.02, 11, w, 0.3, { mat: 'abi_vacio', giro: g }), a.caja((x0 + x1) / 2, (y0 + y1) / 2, 0.03, 10.5, w * 0.45, 0.3, { mat, giro: g, tono: -0.2 + onda(f, 8, i) * 0.1 }));
        for (const l of [-1, 1]) ps.push(pena(a, (x0 + x1) / 2 - Math.sin(rad(g)) * l * (w * 0.5 + 2.4), (y0 + y1) / 2 + Math.cos(rad(g)) * l * (w * 0.5 + 2.4), 0.6, 5.5, 2.6, 1.6, { mat: 'abi_roca_alta', giro: g + (a.r() - 0.5) * 12, n: 8 }));
      }
      // motas de luz que suben de la grieta
      for (let i = 0; i < 8 + fm * 2; i++) { const q = pts[1 + Math.floor(a.r() * (pts.length - 2))], u = (a.r() + f / 8) % 1; ps.push(a.esfera(q[0] + Math.sin(u * 5 + i) * 2, q[1], 2 + u * 34, 0.5 + (1 - u) * 0.5, { mat, tono: -u * 0.4 })); }
      return { piezas: ps, resplandor: { c: [pts[3][0], pts[3][1], 4], r: 30, color: col } };
    },
  },
  {
    id: 'abi_obelisco', nombre: ['Obelisco encadenado', 'Chained obelisk'], tema: 'abismo', variantes: ['flota', 'cae', 'apagado'], cuadros: 8, t: 5, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 3), ps: Pieza[] = [], H = entre(a, 60, 76), b = entre(a, 7, 9), z0 = (v === 'cae' ? 8 : 18) + onda(f, 8) * 2.5, inc = v === 'cae' ? 14 : (a.r() - 0.5) * 6;
      const o: Pieza[] = [a.poliedro([[-b, -b, 0], [b, -b, 0], [-b, b, 0], [b, b, 0], [-b * 0.7, -b * 0.7, H], [b * 0.7, -b * 0.7, H], [-b * 0.7, b * 0.7, H], [b * 0.7, b * 0.7, H]], { mat: 'abi_obsidiana' }), a.poliedro([[-b * 0.7, -b * 0.7, H], [b * 0.7, -b * 0.7, H], [-b * 0.7, b * 0.7, H], [b * 0.7, b * 0.7, H], [0, 0, H + b * 1.4]], { mat: 'abi_obsidiana', tono: 0.05 })];
      // runas en las dos caras que se ven
      if (v !== 'apagado') for (let k = 0; k < 6; k++) { const z = 8 + k * (H - 16) / 5, w = b * (1 - (z / H) * 0.3); o.push(a.caja(w + 0.1, 0, z, 0.5, w * 0.8, 1.2, { mat: 'abi_runa', tono: onda(f, 8, k) * 0.1 }), a.caja(0, w + 0.1, z + 2, w * 0.6, 0.5, 1.2, { mat: 'abi_runa' })); }
      ps.push(...mover(o, [0, 0, z0], fm * 15, inc, 'y'));
      // cuatro cadenas tensas a estacas clavadas en la roca
      for (let i = 0; i < 4; i++) { const t = (i / 4) * 2 * PI + PI / 4, e: V3 = [Math.cos(t) * 30, Math.sin(t) * 30, 0]; if (v === 'cae' && i === fm) continue; ps.push(pena(a, e[0], e[1], 0, 5, 4, 3, { mat: 'abi_roca_alta' }), a.cilindro(e[0], e[1], 0, 1.4, 6, { mat: 'abi_hierro' })); cadena(a, ps, [e[0], e[1], 5], [Math.cos(t) * b, Math.sin(t) * b, z0 + H * 0.3], 6, 0.8, { mat: 'abi_hierro', comba: v === 'cae' ? 6 : 1 }); }
      return { piezas: ps, resplandor: v === 'apagado' ? undefined : { c: [0, 0, z0 + H * 0.5], r: 44, color: '#a060e0' } };
    },
  },
  {
    id: 'abi_arbol_borde', nombre: ['Árbol muerto al borde', 'Dead tree at the brink'], tema: 'abismo', variantes: ['se', 'so', 's'], huella: [5, 5], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const n: [number, number] = v === 'se' ? [1, 0] : v === 'so' ? [0, 1] : [0.7, 0.7], L = 34;
      const bx = v === 's' ? L - 8 : n[0] * (L - 8) + (1 - Math.abs(n[0])) * entre(a, -16, 16), by = v === 's' ? L - 8 : n[1] * (L - 8) + (1 - Math.abs(n[1])) * entre(a, -16, 16);
      arbolMuerto(a, ps, bx, by, entre(a, 60, 84));
      // las raíces que salen por el borde y cuelgan sobre la nada
      for (let i = 0; i < 6; i++) { let p: V3 = [bx + n[0] * 4 + (a.r() - 0.5) * 8, by + n[1] * 4 + (a.r() - 0.5) * 8, -2]; for (let k = 0; k < 6; k++) { const q: V3 = [p[0] + n[0] * entre(a, 1, 4) + (a.r() - 0.5) * 4, p[1] + n[1] * entre(a, 1, 4) + (a.r() - 0.5) * 4, p[2] - entre(a, 7, 13)]; ps.push(a.palo(p, q, Math.max(0.4, 2.2 - k * 0.35), { mat: 'corteza_muerta', tono: fundido(q[2], 110) })); p = q; } }
      bordeVacio(a, ps, v, { mat: ROCA, matLabio: 'abi_roca_alta', D: 160 });
      return ps;
    },
  },
  {
    id: 'abi_columna_puente', nombre: ['Columna caída sobre el vacío', 'Fallen column over the void'], tema: 'abismo', variantes: ['entera', 'partida', 'entera_y', 'partida_y'], huella: [5, 2], bloquea: false,
    armar: (v, _f, a) => {
      const fm = forma(a, 3), ps: Pieza[] = [], R = entre(a, 11, 13), parte = v.startsWith('partida');
      // tambores tendidos con su arista arriba al ras del piso
      for (let x = -40, i = 0; x < 40; x += 13, i++) {
        if (parte && i === 3) continue;
        const dz = parte && i > 3 ? -4 - (i - 3) * 2 : 0, dy = parte && i > 3 ? (i - 3) * 1.5 : 0;
        ps.push(tambor(a, [x + 0.4, dy, -R + dz], [x + 12.6, dy, -R + dz + (parte && i > 3 ? -1.5 : 0)], R, 'abi_marmol', -0.12));
        if (fm === 1) ps.push(a.elipsoide(x + 6, dy + R * 0.6, -R * 0.4 + dz, 4, 2, 2, { mat: 'abi_liquen' }));
      }
      if (fm === 2) ps.push(sillar(a, [-46, 0, -R * 2.2], 14, R * 2.8, R * 2.4, 0, 'abi_marmol', 0.15));
      if (parte) for (let i = 0; i < 5; i++) { const z = entre(a, -80, -16); ps.push(pena(a, entre(a, -4, 8), entre(a, -6, 6), z, entre(a, 2, 5), entre(a, 2, 4), entre(a, 2, 4), { mat: 'abi_marmol', tono: fundido(z, 100) })); }
      jiron(a, ps, [0, 0, -46], 70, 8, entre(a, -15, 15), 'abi_niebla', -0.15);
      return flota(v.endsWith('_y') ? mover(ps, [0, 0, 0], 90) : ps);
    },
  },
  {
    id: 'abi_escalones', nombre: ['Piedras que flotan en hilera', 'Floating stepping stones'], tema: 'abismo', variantes: ['firmes', 'sueltos', 'firmes_y', 'sueltos_y'], cuadros: 8, t: 5, huella: [5, 2], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], sueltos = v.startsWith('sueltos'), n = sueltos ? 4 : 5;
      for (let i = 0; i < n; i++) {
        const x = -32 + i * (64 / (n - 1)) + (a.r() - 0.5) * 4, y = (a.r() - 0.5) * (sueltos ? 10 : 4), r = entre(a, 7, 10), b = onda(f, 8, i * 1.3) * (sueltos ? 2 : 1);
        const g: Pieza[] = [pena(a, 0, 0, -2.5, r, r * 0.85, 3.2, { mat: 'abi_roca_alta', n: 12 }), masa(espeleo(a, [0, 0, -3], r * entre(a, 1.4, 2.4), r * 0.75, { mat: ROCA, dir: -1, anillos: false }), { mat: ROCA, suave: 2, tono: -0.15 })];
        ps.push(...mover(g, [x, y, b], a.r() * 360, sueltos ? (a.r() - 0.5) * 14 : 0));
      }
      return flota(v.endsWith('_y') ? mover(ps, [0, 0, 0], 90) : ps);
    },
  },
  {
    id: 'abi_plataforma', nombre: ['Plataforma colgada de cadenas', 'Chain-hung platform'], tema: 'abismo', variantes: ['piedra', 'madera', 'rota'], cuadros: 8, t: 6, huella: [4, 4], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 3), ps: Pieza[] = [], S = entre(a, 22, 28), sw = onda(f, 8) * 1.2, rota = v === 'rota';
      const p: Pieza[] = [];
      if (v === 'madera') for (let i = 0; i < 9; i++) p.push(viga(a, [-S, -S + i * (S / 4), -2], [S, -S + i * (S / 4) + (a.r() - 0.5), -2], S / 4.4, 2.4, 'abi_madera'));
      else for (let x = -S; x < S; x += S / 2) for (let y = -S; y < S; y += S / 2) p.push(sillar(a, [x + S / 4, y + S / 4, -5], S / 2 - 0.4, S / 2 - 0.4, 5, 0, 'abi_sillar', 0.06));
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) p.push(a.cilindro(sx * (S - 3), sy * (S - 3), 0, 2, 2.4, { mat: 'abi_hierro' }));
      if (fm >= 1) { cajaHierro(a, p, [-S * 0.4, -S * 0.3, 0]); }
      ps.push(...mover(p, [sw, 0, 0], 0, rota ? 12 : 0, 'y'));
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        if (rota && sx === 1 && sy === 1) { cadena(a, ps, [sx * (S - 3) + sw, sy * (S - 3), 6 - 6], [sx * (S - 3) + 6, sy * (S - 3) + 2, -40], 8, 1, { mat: 'abi_hierro' }); continue; }
        cadena(a, ps, [sx * (S - 3) + sw, sy * (S - 3), rota && sx === 1 ? -8 : 2], [sx * (S - 6) * 0.4, sy * (S - 6) * 0.4, 160], 8, 1, { mat: 'abi_hierro' });
      }
      jiron(a, ps, [0, 0, -40], 60, 9, 30, 'abi_niebla', -0.1);
      return flota(ps);
    },
  },
);
/** Tambor de columna entre p y q: prisma de 12 caras irregulares con el canto comido. */
function tambor(a: Arma, p: V3, q: V3, R: number, mat = 'abi_marmol', tono = 0): Pieza {
  const d: V3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(...d), e: V3 = [d[0] / L, d[1] / L, d[2] / L];
  const t: V3 = Math.abs(e[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u0: V3 = [e[1] * t[2] - e[2] * t[1], e[2] * t[0] - e[0] * t[2], e[0] * t[1] - e[1] * t[0]], ul = Math.hypot(...u0), u: V3 = [u0[0] / ul, u0[1] / ul, u0[2] / ul], w: V3 = [e[1] * u[2] - e[2] * u[1], e[2] * u[0] - e[0] * u[2], e[0] * u[1] - e[1] * u[0]];
  const pts: V3[] = [];
  for (const [c, k] of [[p, 0.9], [add(p, e, 1.2), 1], [add(q, e, -1.2), 1], [q, 0.9]] as [V3, number][]) for (let i = 0; i < 12; i++) { const an = (i / 12) * 2 * PI, r = R * k * (0.94 + a.r() * 0.08); pts.push(add(add(c, u, Math.cos(an) * r), w, Math.sin(an) * r)); }
  return a.poliedro(pts, { mat, tono: tono + (a.r() - 0.5) * 0.08 });
}
/** Cofre de hierro con remaches (botín sobre las plataformas). */
function cajaHierro(a: Arma, ps: Pieza[], c: V3) {
  ps.push(a.caja(c[0], c[1], c[2], 14, 9, 8, { mat: 'abi_madera', giro: 20 }), a.cilindro(c[0], c[1], c[2] + 8, 4.5, 14, { mat: 'abi_madera', eje: [Math.cos(rad(20)), Math.sin(rad(20)), 0], tono: 0.05 }));
  for (const k of [-5, 0, 5]) ps.push(a.caja(c[0] + Math.cos(rad(20)) * k, c[1] + Math.sin(rad(20)) * k, c[2], 1.2, 9.6, 12, { mat: 'abi_hierro', giro: 20 }));
}

registrar(
  {
    id: 'abi_jaula', nombre: ['Jaula colgada sobre el vacío', 'Cage hanging over the void'], tema: 'abismo', variantes: ['esqueleto', 'alma', 'abierta'], cuadros: 8, t: 6, huella: [2, 2], bloquea: false,
    armar: (v, f, a) => {
      const fm = forma(a, 3), ps: Pieza[] = [], sw = onda(f, 8) * 4, z0 = entre(a, 10, 30), R = entre(a, 8, 10), H = entre(a, 22, 28);
      const j: Pieza[] = [];
      // barrotes, aros, la cúpula y el piso de chapa
      const n = 10;
      for (let i = 0; i < n; i++) { const t = (i / n) * 2 * PI; if (v === 'abierta' && (i === 1 || i === 2)) continue; j.push(a.palo([Math.cos(t) * R, Math.sin(t) * R, 0], [Math.cos(t) * R, Math.sin(t) * R, H], 0.5, { mat: 'abi_hierro' }), a.palo([Math.cos(t) * R, Math.sin(t) * R, H], [0, 0, H + R * 0.7], 0.5, { mat: 'abi_hierro' })); }
      for (const z of [0.4, H * 0.5, H]) for (let i = 0; i < n; i++) { const t0 = (i / n) * 2 * PI, t1 = ((i + 1) / n) * 2 * PI; j.push(a.palo([Math.cos(t0) * R, Math.sin(t0) * R, z], [Math.cos(t1) * R, Math.sin(t1) * R, z], 0.6, { mat: 'abi_hierro' })); }
      j.push(a.cilindro(0, 0, -0.6, R, 1.2, { mat: 'abi_hierro', tono: -0.1 }));
      if (v === 'abierta') j.push(...mover([a.palo([0, 0, 0], [0, 0, H], 0.5, { mat: 'abi_hierro' }), a.palo([0, 0, 0], [6, 0, 0], 0.5, { mat: 'abi_hierro' }), a.palo([0, 0, H], [6, 0, H], 0.5, { mat: 'abi_hierro' }), a.palo([6, 0, 0], [6, 0, H], 0.5, { mat: 'abi_hierro' })], [Math.cos(0.6) * R, Math.sin(0.6) * R, 0], 70));
      if (v === 'esqueleto') { calavera(a, j, 2, 2, 0.6, 1, 50); huesoL(a, j, [-4, 3, 1], [4, -4, 1], 1); huesoL(a, j, [-5, -2, 1.2], [2, 6, 3], 0.9); for (let k = 0; k < 4; k++) j.push(a.palo([-2 + k * 1.2, -3, 1], [-1 + k * 1.2, 2, 5], 0.6, { mat: 'hueso' })); }
      if (v === 'alma') { const z = H * 0.4 + onda(f, 8) * 1.5; j.push(masa([bulto([0, 0, z], [3.5, 3, 7]), bulto([0.6, 0, z + 8], [2.6, 2.4, 3])], { mat: 'abi_alma', suave: 1.5 })); j.push(a.esfera(2.6, -0.8, z + 8.4, 0.5, { mat: 'negro' }), a.esfera(2.6, 0.9, z + 8.4, 0.5, { mat: 'negro' })); }
      ps.push(...mover(j, [sw, 0, z0], fm * 20 + sw * 2, sw * 1.2, 'y'));
      cadena(a, ps, [sw * 0.98, 0, z0 + H + R * 0.7], [0, 0, 170], 6, 0.8, { mat: 'abi_hierro' });
      return flota(ps, v === 'alma' ? { c: [sw, 0, z0 + H * 0.5], r: 26, color: '#a090e0' } : undefined);
    },
  },
  {
    id: 'abi_farol', nombre: ['Farol de fuego del vacío', 'Void-fire lantern'], tema: 'abismo', variantes: ['violeta', 'verde', 'apagado'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 3), ps: Pieza[] = [], H = entre(a, 42, 52);
      // poste de hierro torcido con su brazo en voluta
      const lean = (a.r() - 0.5) * 6;
      ps.push(pena(a, 0, 0, 1, 6, 5, 3, { mat: 'abi_roca_alta' }), a.palo([0, 0, 0], [lean * 0.4, 0, H * 0.5], 1.2, { mat: 'abi_hierro' }), a.palo([lean * 0.4, 0, H * 0.5], [lean, 0, H], 1, { mat: 'abi_hierro' }));
      const b = fm === 2 ? -1 : 1;
      for (let i = 0; i < 6; i++) { const t0 = (i / 6) * PI, t1 = ((i + 1) / 6) * PI; ps.push(a.palo([lean + b * (5 - Math.cos(t0) * 5), 0, H + Math.sin(t0) * 4], [lean + b * (5 - Math.cos(t1) * 5), 0, H + Math.sin(t1) * 4], 0.7, { mat: 'abi_hierro' })); }
      const top: V3 = [lean + b * 10, 0, H];
      const luz = v === 'verde' ? 'fuego_verde' : 'abi_fuego';
      const c = farol(a, ps, top, f, { luz, apagado: v === 'apagado', mat: 'abi_hierro', s: 1.1 });
      if (fm === 1) calavera(a, ps, 0, 6, 0, 0.8, 40);
      if (v === 'apagado') return ps;
      return { piezas: ps, resplandor: { c, r: 40, color: v === 'verde' ? '#60d060' : '#a060e0' } };
    },
  },
  {
    id: 'abi_espiral', nombre: ['Remolino de escombros', 'Debris vortex'], tema: 'abismo', variantes: ['piedras', 'sillares', 'almas'], cuadros: 12, t: 3, huella: [4, 4], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'almas' ? 12 : 18;
      // todo gira hacia el centro y baja; lo que llega al fondo se apaga
      for (let i = 0; i < n; i++) {
        const ph = a.r(), u = (ph + f / 12) % 1, t = ph * 20 + u * 2 * PI * 1.5, r = 34 * (1 - u * 0.85), z = 10 - u * 120, k = Math.min(1, u * 8);
        const c: V3 = [Math.cos(t) * r, Math.sin(t) * r, z], tono = fundido(z, 150);
        if (v === 'almas') { ps.push(a.elipsoide(...c, 1.6 * k, 1.6 * k, 3.4 * k, { mat: 'abi_alma', tono: tono * 0.8, incl: 30, giro: (t * 180) / PI })); continue; }
        if (v === 'sillares' && i % 2) ps.push(...mover([sillar(a, [0, 0, -2], 6 * k, 5 * k, 4 * k, 0, 'abi_sillar', 0.3, tono)], c, (t * 180) / PI + u * 300, u * 180));
        else ps.push(...mover([pena(a, 0, 0, 0, entre(a, 2, 5) * k, entre(a, 2, 4) * k, entre(a, 1.5, 3.5) * k, { mat: ROCA, tono })], c, u * 400, u * 200));
      }
      for (let i = 0; i < 3; i++) { const t = (f / 12) * 2 * PI + i * 2.1; jiron(a, ps, [Math.cos(t) * 20, Math.sin(t) * 20, -20 - i * 20], 50, 7, (t * 180) / PI + 90, 'abi_niebla', -0.1); }
      return flota(ps, v === 'almas' ? { c: [0, 0, -30], r: 40, color: '#9080d0' } : undefined);
    },
  },
  {
    id: 'abi_cristal_vacio', nombre: ['Cristales del vacío', 'Void crystals'], tema: 'abismo', variantes: ['suelo', 'flotante', 'borde'], cuadros: 6, t: 5, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 4), ps: Pieza[] = [], pulso = onda(f, 6) * 0.1, z0 = v === 'flotante' ? 24 + onda(f, 6) * 2 : 0;
      if (v === 'flotante') ps.push(...mover([pena(a, 0, 0, 0, 12, 10, 5, { mat: 'abi_roca_alta', n: 12 }), masa(espeleo(a, [0, 0, -2], 20, 8, { mat: ROCA, dir: -1, anillos: false }), { mat: ROCA, suave: 2, tono: -0.15 })], [0, 0, z0 - 2], a.r() * 360));
      else for (let i = 0; i < 4; i++) { const t = (i / 4) * 2 * PI + a.r(); penasco(a, ps, [Math.cos(t) * 10, Math.sin(t) * 9, 2], [entre(a, 7, 10), entre(a, 6, 9), entre(a, 4, 7)], { mat: 'abi_roca_alta', n: 1 }); }
      const n = 7 + fm;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 2 * PI + a.r(), d = i === 0 ? 0 : entre(a, 3, 10), s = i === 0 ? 0.1 : entre(a, 0.3, 0.8), L = (i === 0 ? entre(a, 34, 48) : entre(a, 10, 26)) * (v === 'flotante' ? 0.7 : 1);
        const base: V3 = [Math.cos(t) * d, Math.sin(t) * d, z0];
        ps.push(prisma(a, base, [Math.cos(t) * s, Math.sin(t) * s, 1], L, i === 0 ? 5 : entre(a, 2, 3.5), 'abi_obsidiana'));
        if (i % 2 === 0) ps.push(prisma(a, add(base, [0, 0, 1], 2), [Math.cos(t) * s, Math.sin(t) * s, 1], L * 0.8, i === 0 ? 1.8 : 0.9, 'abi_runa', pulso - 0.2));
      }
      if (v === 'flotante') for (let i = 0; i < 3; i++) ps.push(prisma(a, [0, 0, z0 - 8], [(a.r() - 0.5), (a.r() - 0.5), -1], entre(a, 8, 16), 2, 'abi_obsidiana'));
      const luz = { c: [0, 0, z0 + 16] as V3, r: 40, color: '#a060e0' };
      return v === 'flotante' ? flota(ps, luz) : { piezas: ps, resplandor: luz };
    },
  },
  {
    id: 'abi_puerta', nombre: ['Puerta que da a la nada', 'Doorway to nowhere'], tema: 'abismo', variantes: ['piedra', 'rota', 'abierta'], cuadros: 8, t: 4, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 3), ps: Pieza[] = [], sx = 11, hj = 34;
      arcoOjival(a, ps, sx, hj, 0, v === 'rota' ? 3 : 0);
      ps.push(sillar(a, [0, 0, -1], 40, 12, 3, 0, 'abi_sillar', 0.1));
      // del otro lado del vano no hay nada: un fondo negro con estrellas que titilan
      ps.push(a.poliedro([[-sx + 1, -0.5, 0], [sx - 1, -0.5, 0], [-sx + 1, 0.5, 0], [sx - 1, 0.5, 0], [-sx + 1, -0.5, hj], [sx - 1, -0.5, hj], [-sx + 1, 0.5, hj], [sx - 1, 0.5, hj], [0, -0.5, hj + sx * 1.6], [0, 0.5, hj + sx * 1.6]], { mat: 'abi_vacio' }));
      for (let i = 0; i < 14; i++) { const x = entre(a, -sx + 2, sx - 2), z = entre(a, 3, hj + sx * 1.2 - Math.abs(x) * 1.2); if ((i + f) % 5 === 0) continue; ps.push(a.esfera(x, 0.8, z, entre(a, 0.25, 0.6), { mat: 'abi_estrella', tono: (a.r() - 0.5) * 0.3 })); }
      if (fm >= 1) for (let i = 0; i < 4; i++) { const u = ((f / 8) + i / 4) % 1; ps.push(a.esfera(entre(a, -6, 6), 1 + u * 8, 10 + u * 20, 0.5, { mat: 'abi_runa', tono: -u * 0.4 })); }
      if (v === 'abierta') ps.push(...mover([a.caja(0, 0, 0, 20, 2, hj + 8, { mat: 'abi_madera' }), a.caja(0, 1.2, hj * 0.5, 2.4, 1, 2.4, { mat: 'abi_hierro' }), ...[6, 20, 34].map((z) => a.caja(0, 1.1, z, 20, 0.8, 1.6, { mat: 'abi_hierro' }))], [-sx + 1, 10, 0], 70));
      for (let i = 0; i < 3; i++) ps.push(sillar(a, [entre(a, -20, 20), entre(a, 6, 14), 0], entre(a, 4, 7), entre(a, 4, 6), entre(a, 3, 5), a.r() * 90, 'abi_sillar', 0.3));
      return { piezas: ps, resplandor: { c: [0, 6, 22], r: 24, color: '#7050b0' } };
    },
  },
  {
    id: 'abi_almas', nombre: ['Almas que caen', 'Falling souls'], tema: 'abismo', variantes: ['caen', 'suben', 'manos'], cuadros: 12, t: 4, huella: [3, 3], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'manos' ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const ph = a.r(), u = (ph + f / 12) % 1, x = entre(a, -26, 26), y = entre(a, -26, 26);
        if (v === 'manos') {
          // brazos de alma que suben del fondo, se estiran y se hunden
          const sube = Math.sin(u * PI), base: V3 = [x, y, -90], top: V3 = [x + Math.sin(u * 4) * 4, y, -60 + sube * 70];
          ps.push(masa([hM(base, mez(base, top, 0.5), 2.6, 2), hM(mez(base, top, 0.5), top, 2, 1.6), bulto(top, [2.2, 2, 2.6])], { mat: 'abi_alma', suave: 1.5, tono: -0.2 - (1 - sube) * 0.3 }));
          for (let k = 0; k < 4; k++) ps.push(a.palo(top, [top[0] + (k - 1.5) * 1.3, top[1], top[2] + 3.6 * (0.5 + sube * 0.5)], 0.5, { mat: 'abi_alma', tono: -0.2 }));
          continue;
        }
        const z = v === 'caen' ? 60 - u * 170 : -110 + u * 170, k = Math.sin(u * PI);
        // una figura que se retuerce: cuerpo que se afina en cola, cabeza con la boca abierta y brazos
        const c: V3 = [x + Math.sin(u * 6 + i) * 4, y, z], cola = v === 'caen' ? 1 : -1;
        ps.push(masa([bulto(c, [3 * k + 0.5, 2.6 * k + 0.5, 5 * k + 0.5]), hM(c, [c[0] + Math.sin(u * 9) * 3, c[1], c[2] + cola * 12 * k], 2.4 * k + 0.3, 0.3), bulto([c[0], c[1], c[2] - cola * 7 * k], [2.4 * k + 0.4, 2.2 * k + 0.4, 2.8 * k + 0.4]), hM([c[0], c[1], c[2] - cola * 3 * k], [c[0] + 5 * k, c[1] - 2, c[2] - cola * 9 * k], 1 * k + 0.2, 0.5), hM([c[0], c[1], c[2] - cola * 3 * k], [c[0] - 5 * k, c[1] + 2, c[2] - cola * 9 * k], 1 * k + 0.2, 0.5)], { mat: 'abi_alma', suave: 1.5, tono: -0.1 - (1 - k) * 0.4 }));
        ps.push(a.esfera(c[0] + 1.4 * k, c[1] - 0.8, c[2] - cola * 7.4 * k, 0.5 * k + 0.1, { mat: 'negro' }), a.esfera(c[0] + 1.4 * k, c[1] + 0.8, c[2] - cola * 7.4 * k, 0.5 * k + 0.1, { mat: 'negro' }));
      }
      return flota(ps, { c: [0, 0, -20], r: 46, color: '#8070c0' });
    },
  },
  {
    id: 'abi_torre_invertida', nombre: ['Torre invertida', 'Inverted tower'], tema: 'abismo', variantes: ['entera', 'rota'], cuadros: 8, t: 5, huella: [4, 4], bloquea: true,
    armar: (v, f, a) => {
      const fm = forma(a, 3), ps: Pieza[] = [], r = entre(a, 14, 17), H = entre(a, 70, 90), z0 = 40 + onda(f, 8) * 2;
      // los cimientos arriba, con su terrón de roca arrancado, y la torre colgando cabeza abajo hacia el vacío
      isla(a, ps, r + 10, 8, { liquen: false });
      for (let i = 0; i < ps.length; i++) ps[i] = mover([ps[i]], [0, 0, z0 + 10], 0, 180)[0];
      for (let z = 0, k = 0; z < H; z += 7, k++) {
        const n = 11;
        for (let i = 0; i < n; i++) { const t = (i / n) * 2 * PI + (k % 2) * (PI / n), roto = v === 'rota' && z > H * 0.6 && Math.cos(t - 1) > 0.2; if (roto) continue; ps.push(sillar(a, [Math.cos(t) * r, Math.sin(t) * r, z0 - z - 7], 8.4, 6, 7, (t * 180) / PI + 90, 'abi_sillar', 0.12, fundido(z0 - z, 160))); }
        if (k % 4 === 2) { const t = 0.6 + k; ps.push(a.poliedro([[Math.cos(t) * (r + 3.5), Math.sin(t) * (r + 3.5), z0 - z], [Math.cos(t + 0.25) * (r + 3.5), Math.sin(t + 0.25) * (r + 3.5), z0 - z], [Math.cos(t) * (r + 3.5), Math.sin(t) * (r + 3.5), z0 - z - 6], [Math.cos(t + 0.25) * (r + 3.5), Math.sin(t + 0.25) * (r + 3.5), z0 - z - 6], [Math.cos(t + 0.12) * (r + 3.5), Math.sin(t + 0.12) * (r + 3.5), z0 - z + 3]], { mat: 'abi_vacio' })); }
      }
      // el chapitel apuntando abajo
      if (v === 'entera') ps.push(a.poliedro([...Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * 2 * PI) * (r + 3), Math.sin((i / 8) * 2 * PI) * (r + 3), z0 - H] as V3), [0, 0, z0 - H - r * 2.6]], { mat: 'pizarra', tono: fundido(z0 - H, 120) }));
      else for (let i = 0; i < 6; i++) { const z = z0 - H - entre(a, 10, 80) - ((f / 8) * 12) % 12; ps.push(sillar(a, [entre(a, -r, r), entre(a, -r, r), z], 7, 5, 6, a.r() * 90 + f * 8, 'abi_sillar', 0.3, fundido(z, 140))); }
      if (fm) cadena(a, ps, [r * 0.6, 0, z0 + 12], [r * 0.6, 0, 170], 8, 1, { mat: 'abi_hierro' });
      return flota(ps);
    },
  },
  {
    id: 'abi_balaustrada', nombre: ['Baranda rota al borde', 'Broken balustrade'], tema: 'abismo', variantes: ['entera', 'rota', 'caida'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(sillar(a, [0, 0, 0], 80, 7, 3, 0, 'abi_sillar', 0.08));
      for (let i = 0; i < 9; i++) {
        const x = -36 + i * 9;
        if (v !== 'entera' && i >= 4 && i <= 6) { if (v === 'caida' && i === 5) ps.push(...mover([a.cilindro(0, 0, 0, 2, 12, { mat: 'abi_marmol', r1: 1.4 })], [x + 4, 6, 2], 30, 90)); continue; }
        // balaustre torneado: bulbo abajo, cuello arriba
        ps.push(masa([bulto([x, 0, 6], [2.6, 2.6, 4]), hM([x, 0, 3], [x, 0, 15], 1.6, 1.3), bulto([x, 0, 14], [1.8, 1.8, 1.4])], { mat: 'abi_marmol', suave: 1.2, tono: (a.r() - 0.5) * 0.1 }));
      }
      const tramo = (x0: number, x1: number) => ps.push(sillar(a, [(x0 + x1) / 2, 0, 16], x1 - x0, 6, 3.4, (a.r() - 0.5) * 2, 'abi_marmol', 0.12));
      if (v === 'entera') tramo(-40, 40);
      else { tramo(-40, -6); tramo(22, 40); if (v === 'caida') ps.push(sillar(a, [6, 8, 1.2], 24, 6, 3.4, 20, 'abi_marmol', 0.2)); }
      for (const x of [-40, 40]) ps.push(sillar(a, [x, 0, 0], 8, 8, 20, 0, 'abi_sillar', 0.1), sillar(a, [x, 0, 20], 9, 9, 3, 0, 'abi_sillar', 0.1));
      return ps;
    },
  },
  {
    id: 'abi_estrellas', nombre: ['Estrellas en el fondo del vacío', 'Stars in the void below'], tema: 'abismo', variantes: ['nebulosa', 'pocas', 'cumulo'], cuadros: 8, t: 6, huella: [5, 5], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'pocas' ? 18 : 30;
      // lejos, muy abajo: puntos que titilan y una nebulosa que apenas se mueve
      for (let i = 0; i < n; i++) { const x = entre(a, -40, 40), y = entre(a, -40, 40), z = entre(a, -220, -120), tw = (i + f) % 6 === 0 ? -0.4 : 0; ps.push(a.esfera(x, y, z, v === 'cumulo' && i < 10 ? entre(a, 0.7, 1.1) : entre(a, 0.45, 0.8), { mat: 'abi_estrella', tono: tw + (a.r() - 0.5) * 0.3 })); }
      if (v !== 'pocas') for (let i = 0; i < 4; i++) jiron(a, ps, [entre(a, -24, 24), entre(a, -24, 24), entre(a, -200, -150)], 60, 14, entre(a, 0, 180) + f * 1.5, 'abi_niebla', -0.2);
      return flota(ps);
    },
  },
  {
    id: 'abi_raices', nombre: ['Raíces que cuelgan de la nada', 'Roots hanging from nowhere'], tema: 'abismo', variantes: ['pocas', 'maraña', 'con_cuerpo'], cuadros: 6, t: 7, huella: [3, 3], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'maraña' ? 9 : 5;
      for (let i = 0; i < n; i++) {
        let p: V3 = [entre(a, -24, 24), entre(a, -24, 24), 160], r = entre(a, 2, 4.5);
        const largo = entre(a, 170, 250), seg = 8, ph = a.r() * 6;
        const cs: Comp[] = [];
        for (let k = 0; k < seg; k++) { const u = (k + 1) / seg, q: V3 = [p[0] + Math.sin(u * 5 + ph) * 3 + onda(f, 6, ph) * u * 2, p[1] + Math.cos(u * 4 + ph) * 3, 160 - largo * u]; cs.push(hM(p, q, r, r * 0.88, { tono: fundido(q[2], 150) })); p = q; r *= 0.88; }
        ps.push(masa(cs, { mat: 'corteza_muerta', suave: 1.5 }));
      }
      if (v === 'con_cuerpo') { const sw = onda(f, 6) * 3; ps.push(...mover(cadaver({ piel: 'cu_hueso', oseo: true }, { torso: { tipo: 'harapos', mat: 'cu_tela_negra' } }, 's', [0, 0, 0], 0, 2), [sw, 0, 10], 30, 160)); ps.push(a.palo([sw, 0, 12], [0, 0, 60], 0.8, { mat: 'corteza_muerta' })); }
      return flota(ps);
    },
  },
  {
    id: 'abi_reliquia', nombre: ['Reliquia que flota', 'Floating relic'], tema: 'abismo', variantes: ['orbe', 'craneo', 'libro'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], z = 30 + onda(f, 8) * 3;
      // pedestal flotante de tres piedras que giran despacio y la reliquia arriba
      for (let i = 0; i < 3; i++) { const t = (i / 3) * 2 * PI + (f / 8) * 0.8; ps.push(sillar(a, [Math.cos(t) * 9, Math.sin(t) * 9, z - 18 + i * 2], 6, 6, 5, (t * 180) / PI, 'abi_sillar', 0.25)); }
      ps.push(sillar(a, [0, 0, z - 12], 12, 12, 4, (f / 8) * 30, 'abi_obsidiana', 0.15));
      if (v === 'orbe') { ps.push(a.esfera(0, 0, z + 2, 6.5, { mat: 'abi_runa', tono: onda(f, 8) * 0.1 })); for (let i = 0; i < 3; i++) { const t0 = (f / 8) * 2 * PI + i * 2.1; for (let k = 0; k < 12; k++) { const u0 = (k / 12) * 2 * PI, u1 = ((k + 1) / 12) * 2 * PI; ps.push(a.palo([Math.cos(u0) * 8 * Math.cos(t0), Math.cos(u0) * 8 * Math.sin(t0), z + 2 + Math.sin(u0) * 8], [Math.cos(u1) * 8 * Math.cos(t0), Math.cos(u1) * 8 * Math.sin(t0), z + 2 + Math.sin(u1) * 8], 0.3, { mat: 'abi_hierro' })); } } }
      else if (v === 'craneo') { calavera(a, ps, 0, 0, z - 9, 2.2, 45 + f * 6, 'oro'); ps.push(a.esfera(2.4, 2.4, z - 1.5, 0.9, { mat: 'abi_runa' })); }
      else { ps.push(...mover([a.caja(0, 0, 0, 12, 9, 2.6, { mat: 'cu_cuero_negro' in MATERIALES ? 'cu_cuero_negro' : 'cuero' }), a.caja(0, 0, 2.6, 11, 8.4, 1, { mat: 'cu_tela_blanca' in MATERIALES ? 'cu_tela_blanca' : 'tela' }), a.caja(0, 0, 3.4, 4, 4, 0.3, { mat: 'abi_runa' })], [0, 0, z - 6], 20 + f * 4, 20)); }
      return flota(ps, { c: [0, 0, z], r: 30, color: '#b070f0' });
    },
  },
  {
    id: 'abi_campana', nombre: ['Campana del abismo', 'Bell of the abyss'], tema: 'abismo', variantes: ['colgada', 'rajada'], cuadros: 8, t: 6, huella: [3, 3], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], sw = onda(f, 8) * 6, z0 = entre(a, 10, 24);
      // una campana de bronce enorme que se mece colgada de una cadena que viene de arriba
      const b: Pieza[] = [];
      const perfil: [number, number][] = [[18, 0], [17, 3], [14, 8], [12, 16], [11.5, 24], [9, 30], [5, 33], [0, 34]];
      for (let i = 0; i < perfil.length - 1; i++) { const [r0, z1] = perfil[i], [r1, z2] = perfil[i + 1]; b.push(a.cilindro(0, 0, z1, r0, z2 - z1, { mat: 'bronce', r1, tono: -0.05 })); }
      b.push(a.cilindro(0, 0, -0.5, 16, 26, { mat: 'bronce', r1: 10, resta: true }));
      b.push(a.palo([0, 0, 30], [0, 0, 4], 1.2, { mat: 'abi_hierro' }), a.esfera(0, 0, 3, 3.4, { mat: 'abi_hierro' }));
      b.push(a.cilindro(0, 0, 4, 18.2, 1.6, { mat: 'bronce', tono: 0.08 }), a.cilindro(0, 0, 20, 11.8, 1.2, { mat: 'bronce', tono: 0.08 }));
      if (v === 'rajada') b.push(a.caja(14, 4, 2, 1, 1.2, 14, { mat: 'negro', giro: 20, incl: 10 }));
      ps.push(...mover(b, [sw, 0, z0], 0, sw * 2, 'y'));
      cadena(a, ps, [sw * 1.05, 0, z0 + 34], [0, 0, 170], 10, 1.4, { mat: 'abi_hierro' });
      return flota(ps);
    },
  },
  {
    id: 'abi_tentaculos', nombre: ['Tentáculos del vacío', 'Void tentacles'], tema: 'abismo', variantes: ['uno', 'varios', 'borde'], cuadros: 8, t: 4, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'uno' ? 1 : 3;
      // en la variante del borde la tierra queda atrás y los tentáculos suben del vacío de adelante
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0 : v === 'borde' ? entre(a, 6, 26) : entre(a, -20, 20), y = n === 1 ? 0 : entre(a, -20, 20), ph = a.r() * 6, H = entre(a, 50, 80) * (i ? 0.7 : 1), cs: Comp[] = [];
        let p: V3 = [x, y, -120], r = entre(a, 10, 13) * (i ? 0.7 : 1);
        const seg = 12;
        for (let k = 0; k < seg; k++) { const u = (k + 1) / seg, q: V3 = [x + Math.sin(u * 4 + ph + f * 0.6) * u * 14, y + Math.cos(u * 3 + ph + f * 0.5) * u * 10, -120 + (H + 120) * u]; cs.push(hM(p, q, r, r * 0.86, { tono: fundido(q[2], 110) })); if (k % 2 === 1 && u > 0.4) cs.push(bulto(mez(p, q, 0.5), [r * 0.5, r * 0.5, r * 0.4], { mat: 'abi_runa', tono: -0.4 })); p = q; r *= 0.86; }
        ps.push(masa(cs, { mat: 'cu_quitina' in MATERIALES ? 'cu_quitina' : 'abi_obsidiana', suave: 2 }));
      }
      if (v === 'borde') { const b: Pieza[] = []; bordeVacio(a, b, 'se', { mat: ROCA, matLabio: 'abi_roca_alta', D: 140 }); ps.push(...mover(b, [-38, 0, 0], 0)); }
      for (let i = 0; i < 2; i++) jiron(a, ps, [entre(a, -10, 10), entre(a, -10, 10), -40 - i * 30], 50, 8, entre(a, 0, 180), 'abi_niebla', -0.1);
      return flota(ps, { c: [0, 0, 20], r: 30, color: '#a060e0' });
    },
  },
  {
    id: 'abi_costillar', nombre: ['Costillar colosal', 'Colossal ribcage'], tema: 'abismo', variantes: ['hundido', 'craneo'], huella: [6, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], H = entre(a, 50, 64), W = entre(a, 34, 40);
      // el espinazo de algo enorme que la nada se tragó hasta la mitad: arcos de costillas que salen del vacío
      for (let i = 0; i < 7; i++) {
        const x = -42 + i * 13, h = H * (1 - Math.abs(i - 2.5) * 0.12) * entre(a, 0.9, 1.05), rota = a.r() < 0.2;
        for (const l of [-1, 1]) { const cs: Comp[] = []; let p: V3 = [x, l * W * 0.7, -30]; for (let k = 1; k <= 6; k++) { const t = (k / 6) * PI * 0.5 * (rota && l === 1 ? 0.6 : 1), q: V3 = [x + Math.sin(t) * 3, l * W * Math.cos(t) * 0.9, -30 + Math.sin(t) * (h + 30)]; cs.push(hM(p, q, 3.4 - k * 0.25, 3.1 - k * 0.25)); p = q; } ps.push(masa(cs, { mat: 'hueso', suave: 1.2 })); }
        ps.push(sillar(a, [x, 0, H * (1 - Math.abs(i - 2.5) * 0.12) - 4], 9, 7, 7, 0, 'hueso', 0.4));
      }
      if (v === 'craneo') { const cs: Comp[] = [bulto([54, 0, 18], [16, 11, 11], { giro: 0 }), bulto([70, 0, 12], [12, 7, 6]), bulto([46, 0, 26], [8, 10, 6])]; ps.push(masa(cs, { mat: 'hueso', suave: 3 })); for (const l of [-1, 1]) ps.push(a.esfera(60, l * 8, 20, 3.4, { mat: 'negro' })); for (let k = 0; k < 5; k++) ps.push(a.poliedro([[66 + k * 3, 6.5, 8], [68 + k * 3, 6.5, 8], [67 + k * 3, 7.5, 2]], { mat: 'hueso', tono: 0.1 })); }
      ps.push(a.caja(0, 0, -400, 600, 600, 386, { mat: 'abi_vacio', resta: true }));
      for (let i = 0; i < 5; i++) { const t = (i / 5) * 2 * PI; jiron(a, ps, [Math.cos(t) * 40, Math.sin(t) * 26, -10], 50, 7, (t * 180) / PI + 90, 'abi_niebla', -0.1); }
      return flota(hundir(ps, 30));
    },
  },
);
registrar(
  {
    id: 'abi_mano', nombre: ['Mano colosal que sale del vacío', 'Colossal hand from the void'], tema: 'abismo', variantes: ['abierta', 'orbe', 'isla', 'puno'], cuadros: 8, t: 5, huella: [4, 4], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], s = entre(a, 1.6, 2), g = 30 + entre(a, -25, 25), mat = a.r() < 0.5 ? 'abi_marmol' : 'abi_roca_alta';
      // antebrazo con la muñeca, palma y dedos que se doblan según la variante
      const cs: Comp[] = [hM([0, 0, -60], [0, 0, 18 * s], 8 * s, 6.5 * s), bulto([0.5 * s, 0, 24 * s], [6.5 * s, 9 * s, 6 * s])];
      const cierra = v === 'puno' ? 1 : v === 'orbe' ? 0.45 : 0.15;
      for (let k = 0; k < 4; k++) {
        const y = (-6 + k * 4) * s, b: V3 = [2 * s, y, 28 * s], m: V3 = [4 * s, y * 1.05, (37 - cierra * 4) * s], t: V3 = [(4 + cierra * 8) * s, y * 1.05, (43 - cierra * 14) * s], p: V3 = [(2 + cierra * 10) * s, y, (46 - cierra * 22) * s];
        cs.push(hM(b, m, 2 * s, 1.8 * s), hM(m, t, 1.8 * s, 1.6 * s), hM(t, p, 1.6 * s, 1.3 * s));
      }
      cs.push(hM([0, 8.5 * s, 22 * s], [5 * s, 12 * s, 30 * s], 2.6 * s, 2.1 * s), hM([5 * s, 12 * s, 30 * s], [7 * s + cierra * 4 * s, (11 - cierra * 6) * s, 35 * s], 2.1 * s, 1.7 * s));
      const mano: Pieza[] = [masa(cs, { mat, suave: 1.5 * s })];
      for (let i = 0; i < 3; i++) mano.push(a.caja(entre(a, -4, 4) * s, entre(a, -6, 6) * s, entre(a, -10, 20) * s, 0.5 * s, entre(a, 3, 6) * s, 0.4 * s, { mat: 'negro', giro: 90, incl: entre(a, -40, 40) }));
      if (v === 'orbe') mano.push(a.esfera(3 * s, 0, 34 * s + onda(f, 8) * 1.2, 5 * s, { mat: 'abi_runa', tono: onda(f, 8) * 0.1 }));
      if (v === 'isla') { const b: Pieza[] = []; isla(a, b, 9 * s, 8 * s, { liquen: true }); arbolMuerto(a, b, 0, 0, 22 * s); mano.push(...mover(b, [2 * s, 0, 37 * s], 0)); }
      ps.push(...mover(mano, [0, 0, -12], g, entre(a, -12, 4)));
      ps.push(a.caja(0, 0, -400, 600, 600, 386, { mat: 'abi_vacio', resta: true }));
      for (let i = 0; i < 5; i++) { const t = (i / 5) * 2 * PI + a.r(); jiron(a, ps, [Math.cos(t) * 14 * s, Math.sin(t) * 14 * s, -10], 30 * s, 5 * s, (t * 180) / PI + 90, 'abi_niebla', -0.1); }
      return flota(ps, v === 'orbe' ? { c: [0, 0, 34 * s], r: 44, color: '#b070f0' } : undefined);
    },
  },
  {
    id: 'abi_trono', nombre: ['Trono frente al vacío', 'Throne facing the void'], tema: 'abismo', variantes: ['vacio', 'rey', 'roto'], cuadros: 8, t: 5, huella: [4, 4], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], R = entre(a, 22, 26), fm = forma(a, 3);
      isla(a, ps, R, R * 1.8, { raices: fm === 1 });
      // gradas, el sitial de obsidiana con respaldo alto en punta y los brazos
      for (let i = 0; i < 2; i++) ps.push(sillar(a, [2 - i * 2, 0, i * 3], 26 - i * 6, 24 - i * 6, 3, 0, 'abi_sillar', 0.1));
      const T: Pieza[] = [sillar(a, [0, 0, 6], 12, 14, 8, 0, 'abi_obsidiana', 0.06)];
      T.push(a.poliedro([[-7, -7, 14], [-4, -7, 14], [-7, 7, 14], [-4, 7, 14], [-7, -6, 46], [-4, -6, 46], [-7, 6, 46], [-4, 6, 46], [-5.5, 0, 58]], { mat: 'abi_obsidiana' }));
      if (v !== 'roto') for (const l of [-1, 1]) T.push(sillar(a, [0, l * 7.5, 14], 12, 2.6, 8, 0, 'abi_obsidiana', 0.1), a.esfera(6, l * 7.5, 22.5, 1.6, { mat: 'abi_runa' }));
      else T.push(sillar(a, [0, -7.5, 14], 12, 2.6, 8, 0, 'abi_obsidiana', 0.2), a.caja(-5.5, 0, 30, 4, 14, 1.2, { mat: 'abi_vacio', resta: true }));
      for (let k = 0; k < 4; k++) T.push(a.caja(-3.8, 0, 22 + k * 7, 0.5, 6 - k, 1, { mat: 'abi_runa', tono: onda(f, 8, k) * 0.1 - 0.1 }));
      if (v === 'rey') {
        // el rey que espera: huesos con manto y corona, mirando la nada
        T.push(masa([bulto([-1, 0, 20], [4, 6, 7]), hM([-1, 0, 14], [6, -3, 14], 2.2, 2), hM([-1, 0, 14], [6, 3, 14], 2.2, 2), hM([6, -3, 14], [8, -3, 1], 1.8, 1.6), hM([6, 3, 14], [8, 3, 1], 1.8, 1.6)], { mat: 'cu_tela_morada' in MATERIALES ? 'cu_tela_morada' : 'tela_morada', suave: 2 }));
        calavera(a, T, 0, 0, 26, 1.1, 0);
        for (let k = 0; k < 5; k++) { const t = (k / 5) * 2 * PI; T.push(a.palo([Math.cos(t) * 3.2, Math.sin(t) * 3.2, 30], [Math.cos(t) * 3.6, Math.sin(t) * 3.6, 34], 0.6, { mat: 'oro', r1: 0.2 })); }
        T.push(a.cilindro(0, 0, 29.6, 3.6, 1.2, { mat: 'oro' }));
        for (const l of [-1, 1]) T.push(a.palo([3, l * 6.5, 17], [6, l * 7.5, 22], 0.8, { mat: 'hueso' }));
      }
      ps.push(...mover(T, [-2, 0, 6], entre(a, 20, 70)));
      return flota(mover(ps, [0, 0, onda(f, 8) * 1.4], 0), { c: [0, 0, 30], r: 30, color: '#a060e0' });
    },
  },
);
conVarianteY('abi_puente', 'abi_escalera', 'abi_balaustrada', 'abi_costillar');
