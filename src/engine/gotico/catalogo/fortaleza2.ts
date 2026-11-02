import { conVarianteY, registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso, bulto, ruido, type Comp } from '../render';
import {
  TAU, PI, deg, add, nor, mez, jit, elegir, onda, suelo, rotM, transformar, cuerpo, CUERPOS, EQUIPOS, envolver, rematerial,
  roca, manto, tronco, fuego, brasas, craneo, cadena, catenaria, tela, jaula, colgado, losa,
} from '../actos45';

/**
 * Acto 5, la fortaleza (segunda tanda): murallas gastadas con almenas y saeteras, torres, portones con rastrillo,
 * armerías, catapultas rotas, barricadas, braseros, estandartes, la mesa de guerra, estatuas de reyes, celdas, potros
 * de tortura, defensores caídos, escombros, ballestas, calderos de aceite, pertrechos, el trono, columnas, antorcheros,
 * arcos, la horca, la campana de alarma, la tumba del héroe, escaleras y el aljibe. La piedra se arma con bloques que
 * sobresalen, aristas comidas, mugre al pie y escombros, así ningún muro sale liso.
 */

const bloquesF = (largo: number, alto: number) => (p: V3, n: V3) => {
  const j = (v: number, paso: number) => { const m = ((v % paso) + paso) % paso; return m < 0.9 ? 1 : 0; };
  const fila = Math.floor(p[2] / alto), corre = (fila % 2) * largo * 0.5, u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
  if (Math.abs(n[2]) > 0.7) return (ruido(p[0] * 0.3, p[1] * 0.3, 1) - 0.5) * 0.2;
  if (j(p[2], alto)) return -0.34;
  if (j(u + corre + Math.floor(ruido(fila, 3, 1) * 4), largo)) return -0.3;
  const b = Math.floor((u + corre) / largo);
  return (ruido(b * 1.7, fila * 2.3, 9) - 0.5) * 0.26 + (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.74 ? -0.12 : 0) - (p[2] < 10 ? (10 - p[2]) * 0.012 : 0);
};
MATERIALES.for2_piedra = { rampa: ['#121110', '#1f1d1a', '#2e2a26', '#3f3a34', '#514b43', '#645d53', '#787064', '#8d8576'], ruido: 0.3, escala: 0.22, patron: bloquesF(15, 7.5) };
MATERIALES.for2_piedra_osc = { rampa: ['#0d0d0e', '#181819', '#242426', '#323234', '#414143', '#525254', '#646466'], ruido: 0.3, escala: 0.22, patron: bloquesF(13, 6.5) };
MATERIALES.for2_estatua = { rampa: ['#14151a', '#22242a', '#33363d', '#464a52', '#5b5f68', '#71757e', '#888c94', '#a3a6ac'], ruido: 0.3, escala: 0.25, patron: (p) => (ruido(p[0] * 0.2, p[1] * 0.2, p[2] * 0.6) > 0.7 ? -0.12 : 0) };
MATERIALES.for2_madera = { rampa: ['#120c08', '#20150d', '#301f13', '#41291a', '#533422', '#66412b', '#7a4f35'], ruido: 0.2, escala: 0.3, patron: (p, n) => { const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]; return ((u % 5) + 5) % 5 < 0.6 ? -0.3 : (ruido(Math.floor(u / 5) * 3, p[2] * 0.08, 1) - 0.5) * 0.3; } };
MATERIALES.for2_paja = { rampa: ['#1e170c', '#33281a', '#4a3b25', '#614e31', '#78613f', '#8e754e'], ruido: 0.6, escala: 0.8, patron: (p) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 0.3) - 0.5) * 0.4 };
MATERIALES.for2_mapa = { rampa: ['#2e2416', '#4a3b25', '#685637', '#86734c', '#a39063', '#bdab7c'], ruido: 0.2, escala: 0.4, patron: (p) => (Math.abs(ruido(p[0] * 0.25, p[1] * 0.25, 3) - 0.5) < 0.025 ? -0.35 : ruido(p[0] * 0.12, p[1] * 0.12, 5) > 0.6 ? -0.12 : 0) };

const P = 'for2_piedra', PO = 'for2_piedra_osc', M = 'for2_madera', ES = 'for2_estatua';
const LUZ = '#ff9a40';
/** Mugre y polvo al pie. */
const polvo = (a: Arma, rx: number, ry: number, n = 5) => manto(a, rx, ry, n, 'tierra', 1.4, { tono: -0.1 });
/** Escombros: piedras sueltas de muro. */
function escombros(a: Arma, ps: Pieza[], c: V3, r: number, n: number, mat = P) {
  for (let i = 0; i < n; i++) { const t = a.r() * TAU, d = Math.sqrt(a.r()) * r, s = 1.6 + a.r() * 3.6; ps.push(a.caja(c[0] + Math.cos(t) * d, c[1] + Math.sin(t) * d, c[2] - 0.5, s * 1.6, s, s * 0.9, { mat, giro: a.r() * 180, incl: jit(a, 25), tono: jit(a, 0.08) })); }
}
/**
 * Muro de piedra a lo largo de x: el cuerpo de bloques, zócalo, bloques que sobresalen y aristas comidas, almenas
 * con merlones desparejos, saeteras y escombros al pie. `roto` le arranca un tajo de arriba.
 */
function muro(a: Arma, ps: Pieza[], L: number, T: number, H: number, o: { almenas?: boolean; roto?: boolean; saeteras?: number; mat?: string; x?: number; y?: number } = {}) {
  const mat = o.mat ?? P, x0 = o.x ?? 0, y0 = o.y ?? 0;
  ps.push(a.caja(x0, y0, 0, L + 2, T + 4, 7, { mat, tono: -0.06 }));
  ps.push(a.caja(x0, y0, 0, L, T, H, { mat }));
  // bloques que asoman de las caras y huecos de piedras que faltan
  for (let i = 0; i < Math.round(L / 6); i++) { const s = elegir(a, [-1, 1]), x = x0 + jit(a, L / 2 - 4), z = 4 + a.r() * (H - 10); ps.push(a.caja(x, y0 + s * (T / 2 + 0.4), z, 7 + a.r() * 6, 1.4, 3.6 + a.r() * 2, { mat, tono: jit(a, 0.1) })); }
  for (let i = 0; i < Math.round(L / 14); i++) { const x = x0 + jit(a, L / 2 - 4), z = 6 + a.r() * (H - 14); ps.push(a.caja(x, y0 + T / 2, z, 6 + a.r() * 4, 3, 3.5 + a.r() * 2, { mat, resta: true })); }
  if (o.roto) { const xc = x0 + jit(a, L * 0.2); ps.push(a.poliedro([[xc - 16, y0 - T, H + 1], [xc + 18, y0 - T, H + 1], [xc - 16, y0 + T, H + 1], [xc + 18, y0 + T, H + 1], [xc - 4 + jit(a, 4), y0 - T, H * 0.45], [xc - 4 + jit(a, 4), y0 + T, H * 0.45], [xc + 8, y0 - T, H * 0.6], [xc + 8, y0 + T, H * 0.6]], { mat, resta: true })); escombros(a, ps, [xc, y0 + T + 8, 0], 14, 14, mat); }
  // aristas comidas arriba
  for (let i = 0; i < 4; i++) ps.push(a.caja(x0 + jit(a, L / 2), y0 + elegir(a, [-1, 1]) * T / 2, H - 1.5, 5 + a.r() * 5, 3, 3, { mat, resta: true, giro: jit(a, 20) }));
  if (o.almenas) {
    ps.push(a.caja(x0, y0, H, L + 1, T + 1.6, 2, { mat, tono: 0.05 }));
    const n = Math.floor(L / 13);
    for (let i = 0; i < n; i++) { const x = x0 - L / 2 + 4.5 + (i * (L - 9)) / Math.max(1, n - 1); if (o.roto && Math.abs(x - x0) < 18) continue; ps.push(a.caja(x, y0 + T * 0.18, H + 2, 8, T * 0.6, 9 + a.r() * 2.5, { mat, tono: jit(a, 0.06), incl: jit(a, 2) })); }
  }
  for (let i = 0; i < (o.saeteras ?? 0); i++) { const x = x0 - L / 2 + (L / ((o.saeteras ?? 0) + 1)) * (i + 1); ps.push(a.caja(x, y0 + T / 2, H * 0.45, 2.2, 6, 14, { mat, resta: true }), a.caja(x, y0 + T / 2 - 2.6, H * 0.45, 2.2, 0.6, 14, { mat: 'negro' })); }
  escombros(a, ps, [x0, y0 + T / 2 + 5, 0], L * 0.45, Math.round(L / 10), mat);
}
/** Vela encendida (con su llamita que tiembla). */
function vela(a: Arma, ps: Pieza[], c: V3, h: number, f: number) {
  ps.push(a.cilindro(c[0], c[1], c[2], 0.9, h, { mat: 'cera' }), a.elipsoide(c[0], c[1], c[2] + h + 1.1, 0.5, 0.5, 1.2 + onda(f, 8, c[0] + c[1]) * 0.8, { mat: 'luz_vela' }), a.esfera(c[0] + onda(f, 8, c[1]) * 0.4, c[1], c[2] + h + 2.6 + onda(f, 8, c[0]) * 0.8, 0.35, { mat: 'luz_vela', tono: 0.2 }));
}
/** Escudo de armas colgado o apoyado, cara hacia n. */
function escudoCometa(a: Arma, ps: Pieza[], c: V3, s: number, n: V3, mat = 'tela_azul') {
  const d = nor(n), u = nor([-d[1], d[0], 0]), pts: V3[] = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1.5]]) for (const e of [0, 1.2]) pts.push(add(add(add(c, u, x * s * 4), [0, 0, z * s * 5]), d, e));
  ps.push(a.poliedro(pts, { mat: 'hierro' }), a.poliedro(pts.map((p, i) => add(p, d, i % 2 ? 0.3 : 0.2)).map((p) => mez(p, add(c, d, 1.3), 0.12)), { mat }));
}

registrar(
  // ------------------------------------------------------------------ murallas
  {
    id: 'for2_muralla', nombre: ['Muralla', 'Castle wall'], tema: 'fortaleza', variantes: ['recta', 'almenada', 'rota', 'saeteras', 'contrafuerte'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 44, 12)];
      muro(a, ps, 80, 14, v === 'recta' ? 64 : 76, { almenas: v !== 'recta', roto: v === 'rota', saeteras: v === 'saeteras' ? 3 : 0 });
      if (v === 'contrafuerte') for (const x of [-26, 26]) ps.push(a.poliedro([[x - 6, 7, 0], [x + 6, 7, 0], [x - 6, 20, 0], [x + 6, 20, 0], [x - 5, 7, 60], [x + 5, 7, 60], [x - 5, 9, 60], [x + 5, 9, 60]], { mat: P, tono: -0.03 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'for2_almena', nombre: ['Almenas', 'Battlements'], tema: 'fortaleza', variantes: ['recta', 'rota', 'matacan', 'estandarte'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      // tramo de adarve: el piso de losas y el parapeto con merlones
      ps.push(a.caja(0, -6, 0, 80, 24, 3, { mat: PO, tono: 0.04 }));
      muro(a, ps, 80, 6, 12, { almenas: true, roto: v === 'rota', y: 4 });
      if (v === 'matacan') for (let i = 0; i < 5; i++) { const x = -32 + i * 16; ps.push(a.caja(x, 9, 6, 3, 6, 6, { mat: P, incl: 20 })); }
      if (v === 'estandarte') { ps.push(a.palo([10, 2, 3], [10, 2, 60], 1, { mat: M })); ps.push(a.caja(10, 2, 30, 0.8, 14, 26, { mat: 'tela_roja', tono: -0.1 })); }
      for (let i = 0; i < 3; i++) ps.push(a.cilindro(-20 + i * 9 + jit(a, 2), -10 + jit(a, 3), 3, 2.4, 1.4, { mat: 'piedra', r1: 2.2 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ torres
  {
    id: 'for2_torre', nombre: ['Torre', 'Tower'], tema: 'fortaleza', variantes: ['redonda', 'cuadrada', 'vigia', 'rota'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 36, 34)];
      const R = 26, H = v === 'vigia' ? 70 : v === 'rota' ? 150 : 140;
      if (v === 'cuadrada') { ps.push(a.caja(0, 0, 0, 2 * R + 4, 2 * R + 4, 10, { mat: P, tono: -0.05 }), a.caja(0, 0, 0, 2 * R, 2 * R, H, { mat: P })); for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1]]) ps.push(a.caja(dx * R, dy * R, 0, 8, 8, H + 2, { mat: P, tono: 0.04 })); }
      else { ps.push(a.cilindro(0, 0, 0, R + 3, 10, { mat: P, r1: R + 1 }), a.cilindro(0, 0, 0, R, H, { mat: P, r1: R - 2 })); }
      // bloques sueltos en el fuste y ventanas angostas
      for (let i = 0; i < 18; i++) { const t = (PI * 0.1) + a.r() * PI * 0.9 - 0.2, z = 8 + a.r() * (H - 16); ps.push(a.caja(Math.cos(t) * (R - 0.4), Math.sin(t) * (R - 0.4), z, 7 + a.r() * 4, 2, 3.5, { mat: P, giro: deg(t) + 90, tono: jit(a, 0.1) })); }
      for (const z of [H * 0.35, H * 0.65]) { const t = PI / 4 + jit(a, 0.3); ps.push(a.caja(Math.cos(t) * R, Math.sin(t) * R, z, 3, 8, 12, { mat: P, giro: deg(t), resta: true }), a.caja(Math.cos(t) * (R - 2.5), Math.sin(t) * (R - 2.5), z, 3, 0.6, 12, { mat: 'negro', giro: deg(t) + 90 })); }
      if (v === 'rota') { ps.push(a.poliedro([[-40, 0, H + 1], [40, 0, H + 1], [-40, 40, H + 1], [40, 40, H + 1], [-30, 10, H * 0.55], [30, 10, H * 0.6], [-30, 40, H * 0.5], [30, 40, H * 0.55]], { mat: P, resta: true })); escombros(a, ps, [14, 34, 0], 22, 22); }
      else if (v === 'vigia') {
        // plataforma de madera con baranda y techo puntiagudo de tablas
        for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) ps.push(a.palo([dx * 18, dy * 18, H], [dx * 18, dy * 18, H + 32], 1.6, { mat: M }));
        ps.push(a.caja(0, 0, H, 44, 44, 3, { mat: M }));
        for (const [dx, dy, g] of [[1, 0, 90], [0, 1, 0], [-1, 0, 90], [0, -1, 0]]) ps.push(a.caja(dx * 21, dy * 21, H + 3, 42, 1.6, 10, { mat: M, giro: g, tono: jit(a, 0.05) }));
        ps.push(a.poliedro([[-26, -26, H + 32], [26, -26, H + 32], [-26, 26, H + 32], [26, 26, H + 32], [0, 0, H + 56]], { mat: 'teja' }));
        ps.push(a.palo([0, 0, H + 56], [0, 0, H + 68], 0.8, { mat: M }), a.caja(0, 3, H + 62, 0.5, 6, 5, { mat: 'tela_roja' }));
      } else {
        // corona de almenas
        ps.push(a.cilindro(0, 0, H, R + 3, 4, { mat: P, r1: R + 3, tono: 0.04 }));
        for (let i = 0; i < 12; i++) { const t = (i / 12) * TAU; if (v === 'cuadrada') continue; ps.push(a.caja(Math.cos(t) * (R + 1), Math.sin(t) * (R + 1), H + 4, 8, 4, 9 + a.r() * 2, { mat: P, giro: deg(t) + 90, tono: jit(a, 0.06) })); }
        if (v === 'cuadrada') for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { const s = i < 2 ? 1 : -1, ax = i % 2 === 0; const x = ax ? -R + 7 + k * 13 : s * (R + 1), y = ax ? s * (R + 1) : -R + 7 + k * 13; ps.push(a.caja(x, y, H, ax ? 8 : 4, ax ? 4 : 8, 10, { mat: P, tono: jit(a, 0.06) })); }
        for (let i = 0; i < 8; i++) { const t = a.r() * PI * 0.8; ps.push(a.caja(Math.cos(t) * (R + 1.5), Math.sin(t) * (R + 1.5), H - 6, 3, 2, 3, { mat: P, incl: 30 })); }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ portón con rastrillo
  {
    id: 'for2_porton', nombre: ['Portón con rastrillo', 'Portcullis gate'], tema: 'fortaleza', variantes: ['cerrado', 'abierto', 'roto', 'quemado'], huella: [6, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 52, 16)];
      const W = 34, Ha = 52;
      // el cuerpo de la puerta con dos torreones y el arco
      muro(a, ps, 96, 20, 92, { almenas: true });
      for (const s of [-1, 1]) { ps.push(a.cilindro(s * 46, 4, 0, 16, 104, { mat: P, r1: 15 })); for (let i = 0; i < 8; i++) { const t = (i / 8) * TAU; ps.push(a.caja(s * 46 + Math.cos(t) * 15, 4 + Math.sin(t) * 15, 104, 7, 4, 9, { mat: P, giro: deg(t) + 90 })); } }
      const arco: V3[] = [];
      for (let i = 0; i <= 8; i++) { const t = (i / 8) * PI; arco.push([-Math.cos(t) * W / 2, -20, Ha * 0.72 + Math.sin(t) * W * 0.5], [-Math.cos(t) * W / 2, 20, Ha * 0.72 + Math.sin(t) * W * 0.5]); }
      ps.push(a.caja(0, 0, 0, W, 30, Ha * 0.72, { mat: P, resta: true }), a.poliedro([...arco, [-W / 2, -20, Ha * 0.7], [W / 2, -20, Ha * 0.7], [-W / 2, 20, Ha * 0.7], [W / 2, 20, Ha * 0.7]], { mat: P, resta: true }));
      // dovelas del arco
      for (let i = 0; i < 9; i++) { const t = (i / 8) * PI; ps.push(a.caja(-Math.cos(t) * (W / 2 + 3), 10.5, Ha * 0.72 + Math.sin(t) * (W * 0.5 + 3), 5, 1.6, 6, { mat: P, incl: -deg(t) + 90, inclEje: 'y', tono: 0.06 })); }
      ps.push(a.caja(0, -6, 0, W, 2, Ha, { mat: 'negro' }));
      // hojas de madera atrás y el rastrillo de hierro adelante
      if (v !== 'abierto') for (const s of [-1, 1]) ps.push(a.caja(s * W / 4, -4, 0, W / 2 - 0.5, 3, Ha * 0.95, { mat: v === 'quemado' ? 'a45_carbon' : M, tono: jit(a, 0.05) }));
      else for (const s of [-1, 1]) ps.push(...transformar([a.caja(s * W / 4, 0, 0, W / 2 - 0.5, 3, Ha * 0.95, { mat: M })], rotM(s * -70), [s * W / 2 * 0.5, -6, 0]));
      const baja = v === 'abierto' ? Ha * 0.7 : v === 'roto' ? 14 : 0;
      for (let i = 0; i < 7; i++) { const x = -W / 2 + 2.5 + i * ((W - 5) / 6); if (v === 'roto' && (i === 3 || i === 4)) { ps.push(a.palo([x, 6, baja + 24], [x + jit(a, 4), 7, Ha * 0.95], 0.9, { mat: 'hierro' })); continue; } ps.push(a.palo([x, 6, Math.max(0, baja - 2)], [x, 6, baja + Ha * 0.95], 0.9, { mat: 'hierro' }), a.cilindro(x, 6, Math.max(0, baja - 3), 0.1, 3, { mat: 'hierro', r1: 0.9 })); }
      for (let k = 0; k < 5; k++) ps.push(a.palo([-W / 2 + 1, 6, baja + 6 + k * 10], [W / 2 - 1, 6, baja + 6 + k * 10], 0.8, { mat: 'hierro', tono: -0.05 }));
      if (v === 'quemado') { brasas(a, ps, [0, 10, 0.5], 10); escombros(a, ps, [0, 18, 0], 12, 6, 'a45_carbon'); }
      if (v === 'roto') escombros(a, ps, [0, 18, 0], 14, 10);
      for (const s of [-1, 1]) escudoCometa(a, ps, [s * 24, 10.5, 62], 1.4, [0, 1, 0], s > 0 ? 'tela_azul' : 'tela_roja');
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ armerías
  {
    id: 'for2_armeria', nombre: ['Armería', 'Weapon rack'], tema: 'fortaleza', variantes: ['espadas', 'lanzas', 'escudos', 'vacia'], huella: [3, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 26, 10, 4)];
      for (const x of [-20, 20]) ps.push(a.caja(x, 0, 0, 3, 10, 36, { mat: M }), a.caja(x, 0, 0, 5, 14, 2, { mat: M }));
      for (const z of [14, 32]) ps.push(a.caja(0, 0, z, 42, 3, 2, { mat: M, tono: 0.04 }));
      if (v === 'espadas') for (let i = 0; i < 6; i++) { const x = -15 + i * 6, d: V3 = [jit(a, 0.05), 0.12, 1]; ps.push(a.poliedro([[x - 0.9, 2, 2], [x + 0.9, 2, 2], [x - 0.9, 2.4, 30], [x + 0.9, 2.4, 30], [x, 2.2, 0]], { mat: 'acero' }), a.palo([x - 3, 2.6, 30], [x + 3, 2.6, 30], 0.6, { mat: 'hierro' }), a.palo([x, 2.6, 30], [x, 2.8, 36], 0.6, { mat: 'cuero' }), a.esfera(x, 2.8, 37, 1, { mat: 'hierro' })); void d; }
      else if (v === 'lanzas') for (let i = 0; i < 7; i++) { const x = -16 + i * 5.4; ps.push(a.palo([x, 2, 0], [x + jit(a, 1), 2.6, 62], 0.7, { mat: 'madera' }), a.poliedro([[x - 0.9, 2.6, 61], [x + 0.9, 2.6, 61], [x, 1.8, 61], [x, 3.4, 61], [x, 2.6, 68]], { mat: 'acero' })); }
      else if (v === 'escudos') { for (let i = 0; i < 3; i++) escudoCometa(a, ps, [-13 + i * 13, 2.2, 26], 1.25, [0, 1, 0], elegir(a, ['tela_azul', 'tela_roja', 'cu_tela_blanca'])); for (let i = 0; i < 2; i++) ps.push(a.elipsoide(-8 + i * 16, 8, 2.6, 4, 4, 4.4, { mat: 'hierro' }), a.cilindro(-8 + i * 16, 8, 0, 4.4, 1.4, { mat: 'hierro', tono: -0.1 })); }
      else { ps.push(a.palo([-14, 4, 0.8], [6, 10, 1.2], 0.7, { mat: 'madera' }), a.palo([10, -8, 0.8], [18, 8, 1], 0.7, { mat: 'madera' })); ps.push(...transformar([a.caja(0, 0, 0, 42, 3, 2, { mat: M })], rotM(0, 0, 18), [0, 2, 20])); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ catapultas rotas
  {
    id: 'for2_catapulta', nombre: ['Catapulta rota', 'Broken catapult'], tema: 'fortaleza', variantes: ['volcada', 'quemada', 'desarmada'], huella: [5, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 40, 26, 6)], loc: Pieza[] = [];
      const mat = v === 'quemada' ? 'a45_carbon' : M;
      for (const s of [-1, 1]) { loc.push(a.caja(0, s * 14, 6, 60, 4, 5, { mat })); loc.push(a.palo([-6, s * 14, 11], [2, s * 12, 40], 2, { mat }), a.palo([10, s * 14, 11], [2, s * 12, 40], 2, { mat })); for (const x of [-22, 22]) { loc.push(a.cilindro(x, s * 17, 7, 7, 3, { mat: v === 'quemada' ? 'a45_carbon' : 'madera_vieja', eje: [0, 1, 0] }), a.cilindro(x, s * 18, 7, 2, 2, { mat: 'hierro', eje: [0, 1, 0] })); } }
      loc.push(a.caja(-24, 0, 6, 4, 30, 5, { mat }), a.caja(24, 0, 6, 4, 30, 5, { mat }), a.palo([2, -12, 40], [2, 12, 40], 2.2, { mat }));
      loc.push(a.palo([0, 0, 12], [-28, 0, 36], 2.4, { mat }), masa([bulto([-30, 0, 38], [5, 5, 2.4])], { mat: 'cuero', suave: 1 }));
      if (v === 'volcada') { ps.push(...transformar(loc, rotM(15, 70), [0, -10, 18])); for (let i = 0; i < 3; i++) ps.push(...roca(a, [jit(a, 20), 18 + jit(a, 6), 4], [5, 5, 4], { mat: 'piedra', n: 3, facetas: 1 })); }
      else if (v === 'quemada') { ps.push(...loc.filter(() => a.r() < 0.75)); brasas(a, ps, [0, 0, 1], 18); for (let i = 0; i < 6; i++) ps.push(a.palo([jit(a, 24), jit(a, 16), 1], [jit(a, 24), jit(a, 16), 2], 1.6, { mat: 'a45_carbon' })); }
      else { ps.push(...loc.slice(0, Math.floor(loc.length * 0.6))); for (let i = 0; i < 6; i++) ps.push(a.caja(jit(a, 30), 20 + jit(a, 8), 1.5, 22 + a.r() * 14, 3.4, 3, { mat: M, giro: a.r() * 180 })); ps.push(a.cilindro(30, 16, 0.5, 7, 3, { mat: 'madera_vieja', eje: [0.2, 0.3, 1] })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ barricadas
  {
    id: 'for2_barricada', nombre: ['Barricada', 'Barricade'], tema: 'fortaleza', variantes: ['carros', 'estacas', 'sacos', 'escombros'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 42, 16, 5)];
      if (v === 'carros') {
        ps.push(...transformar([a.caja(0, 0, 8, 40, 20, 3, { mat: M }), a.caja(0, -9, 11, 40, 2, 8, { mat: M }), a.caja(0, 9, 11, 40, 2, 8, { mat: M }), a.cilindro(-14, -11, 8, 8, 2.4, { mat: 'madera_vieja', eje: [0, 1, 0] }), a.cilindro(14, -11, 8, 8, 2.4, { mat: 'madera_vieja', eje: [0, 1, 0] })], rotM(8, 75), [-14, 0, 12]));
        ps.push(a.caja(16, 2, 0, 14, 12, 12, { mat: 'madera_vieja', giro: 20 }), a.cilindro(28, -4, 0, 7, 16, { mat: 'madera', r1: 6.4 }), a.cilindro(26, 8, 0.5, 6.4, 14, { mat: 'madera', eje: [0.3, 1, 0.1] }));
      } else if (v === 'estacas') { tronco(a, ps, [-40, 0, 6], [40, 0, 6], 4, { mat: 'corteza' }); for (let i = 0; i < 9; i++) { const x = -34 + i * 8.5; for (const s of [-1, 1]) ps.push(a.palo([x, -s * 12, 0], [x + jit(a, 2), s * 14, 22], 1.6, { mat: 'corteza' }), a.cilindro(x + jit(a, 2), s * 14, 22, 1.5, 4, { mat: 'madera_lisa', r1: 0.2, eje: [0, s * 0.8, 1] })); } }
      else if (v === 'sacos') { for (let k = 0; k < 3; k++) for (let i = 0; i < 6 - k; i++) ps.push(masa([bulto([-24 + i * 9.6 + k * 4.8, jit(a, 1), 4 + k * 7], [5.4, 4, 3.6], { giro: jit(a, 15) })], { mat: elegir(a, ['cu_tela_parda', 'tela']), suave: 1 })); }
      else { escombros(a, ps, [0, 0, 0], 34, 30); ps.push(a.caja(-10, 0, 0, 30, 10, 14, { mat: P, giro: 10, incl: 8 }), a.caja(16, 4, 0, 18, 9, 10, { mat: P, giro: -20, incl: -12 })); tronco(a, ps, [-30, 8, 4], [24, -8, 18], 3.4, { mat: M }); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ braseros
  {
    id: 'for2_brasero', nombre: ['Brasero del castillo', 'Castle brazier'], tema: 'fortaleza', variantes: ['alto', 'cuenco', 'colgante', 'farol'], cuadros: 8, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [polvo(a, 12, 11, 4)];
      let c: V3 = [0, 0, 36], s = 1.5;
      if (v === 'alto') { ps.push(a.cilindro(0, 0, 0, 6, 3, { mat: 'hierro', r1: 4 }), a.palo([0, 0, 3], [0, 0, 32], 1.4, { mat: 'hierro' }), a.cilindro(0, 0, 30, 3, 5, { mat: 'hierro', r1: 7.4 }), a.cilindro(0, 0, 35, 7.8, 0.8, { mat: 'hierro' })); for (let i = 0; i < 6; i++) { const t = (i / 6) * TAU; ps.push(a.palo([Math.cos(t) * 7.4, Math.sin(t) * 7.4, 35], [Math.cos(t) * 8.4, Math.sin(t) * 8.4, 39], 0.5, { mat: 'hierro' })); } }
      else if (v === 'cuenco') { ps.push(a.cilindro(0, 0, 0, 10, 8, { mat: P, r1: 8 }), a.cilindro(0, 0, 8, 6, 5, { mat: 'hierro', r1: 10 }), a.cilindro(0, 0, 13, 10.4, 1, { mat: 'hierro' })); c = [0, 0, 13]; s = 2; }
      else if (v === 'colgante') { ps.push(a.palo([-8, 8, 0], [-8, 8, 60], 1.6, { mat: M }), a.palo([-8, 8, 58], [6, -6, 58], 1.2, { mat: M })); cadena(a, ps, [[6, -6, 58], [6, -6, 40]], 2.2, 0.45); ps.push(a.cilindro(6, -6, 34, 3, 5, { mat: 'hierro', r1: 6 })); jaula(a, ps, [6, -6, 34], 6, 10, { mat: 'hierro' }); c = [6, -6, 38]; s = 1.1; }
      else { ps.push(a.palo([0, 0, 0], [0, 0, 50], 1.4, { mat: 'hierro' }), a.cilindro(0, 0, 0, 5, 2, { mat: 'hierro' })); ps.push(a.cilindro(0, 0, 50, 4, 10, { mat: 'hierro', r1: 3.6 }), a.cilindro(0, 0, 60, 4.2, 3, { mat: 'hierro', r1: 0.6 })); for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU + 0.4; ps.push(a.caja(Math.cos(t) * 3.6, Math.sin(t) * 3.6, 51, 2.2, 0.3, 8, { mat: 'vidrio', giro: deg(t) + 90 })); } ps.push(a.elipsoide(0, 0, 54, 1.4, 1.4, 2.6 + onda(f, 8) * 0.3, { mat: 'luz_vela' })); }
      if (v !== 'farol') { brasas(a, ps, add(c, [0, 0, -1]), 5 * s / 1.5, f, 8); fuego(a, ps, c, s, f, 8, { lenguas: 4 }); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: v === 'farol' ? [0, 0, 54] : add(c, [0, 0, 5]), r: v === 'farol' ? 32 : 48, color: LUZ } };
    },
  },
  // ------------------------------------------------------------------ estandartes
  {
    id: 'for2_estandarte', nombre: ['Estandarte del reino', 'Royal banner'], tema: 'fortaleza', variantes: ['rey', 'leon', 'torre', 'jirones'], cuadros: 8, t: 3, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [polvo(a, 14, 10, 4)];
      ps.push(a.cilindro(0, 0, 0, 6, 4, { mat: P, r1: 5 }), a.palo([0, 0, 4], [0, 0, 92], 1.4, { mat: M }), a.esfera(0, 0, 93, 1.8, { mat: 'cu_oro' }));
      ps.push(a.palo([0, -15, 86], [0, 15, 86], 0.9, { mat: M }));
      const dib: Record<string, (u: number, w: number) => string | undefined> = {
        rey: (u, w) => (Math.abs(u - 0.5) < 0.22 && Math.abs(w - 0.32) < 0.08 && (Math.floor(u * 10) % 2 === 0 || w > 0.33) ? 'cu_oro' : w > 0.9 ? 'cu_oro' : undefined),
        leon: (u, w) => (Math.hypot(u - 0.5, (w - 0.4) * 1.3) < 0.2 ? 'cu_oro' : Math.abs(u - 0.5) < 0.05 ? 'cu_tela_negra' : undefined),
        torre: (u, w) => (Math.abs(u - 0.5) < 0.12 && w > 0.25 && w < 0.7 ? 'cu_tela_blanca' : Math.abs(u - 0.5) < 0.22 && w > 0.22 && w < 0.3 ? 'cu_tela_blanca' : undefined),
        jirones: (u, w) => (Math.abs(u - w) < 0.1 ? 'cu_tela_negra' : undefined),
      };
      tela(a, ps, { p0: [0.8, -14, 85], u: [0, 1, 0], ancho: 28, alto: 50, f, n: 8, nu: 5, nv: 9, amp: 2.6, mat: v === 'leon' ? 'tela_roja' : v === 'torre' ? 'tela_verde' : v === 'jirones' ? 'cu_tela_parda' : 'tela_azul', jirones: v === 'jirones' ? 1 : 0.15, fase: a.r() * 6, dibujo: dib[v] });
      for (const s of [-1, 1]) ps.push(a.palo([0.6, s * 14, 86], [0.8, s * 14 + onda(f, 8, s) * 0.6, 78], 0.3, { mat: 'cu_oro' }), a.esfera(0.8, s * 14 + onda(f, 8, s), 77, 0.9, { mat: 'cu_oro' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ mesa de guerra
  {
    id: 'for2_mesa_guerra', nombre: ['Mesa de guerra', 'War table'], tema: 'fortaleza', variantes: ['mapa', 'tomada', 'velas'], cuadros: 8, t: 4, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [polvo(a, 26, 18, 4)];
      const loc: Pieza[] = [];
      for (const x of [-18, 18]) for (const y of [-10, 10]) loc.push(a.palo([x, y, 0], [x, y, 14], 1.4, { mat: M }));
      loc.push(a.caja(0, 0, 13, 44, 26, 2.4, { mat: M }), a.caja(0, 0, 15.4, 38, 22, 0.4, { mat: 'for2_mapa' }));
      // figuritas, una daga clavada en el mapa y velas
      for (let i = 0; i < 7; i++) { const x = jit(a, 15), y = jit(a, 9), azul = i % 2; loc.push(a.cilindro(x, y, 15.8, 0.9, 2, { mat: azul ? 'tela_azul' : 'tela_roja', r1: 0.6 }), a.esfera(x, y, 18.4, 0.8, { mat: azul ? 'tela_azul' : 'tela_roja' })); }
      loc.push(a.poliedro([[3, 2, 15.8], [3.8, 2, 22], [2.2, 2, 22], [3, 2.4, 22]], { mat: 'acero' }), a.palo([1, 2, 22], [5, 2, 22], 0.4, { mat: 'hierro' }), a.palo([3, 2, 22], [3, 2, 26], 0.5, { mat: 'cuero' }));
      const nv = v === 'velas' ? 6 : 2;
      for (let i = 0; i < nv; i++) vela(a, loc, [(i % 2 ? 1 : -1) * (16 - Math.floor(i / 2) * 2), (i % 2 ? -1 : 1) * 9, 15.6], 3 + a.r() * 3, f + i);
      if (v === 'tomada') { ps.push(...transformar(loc.slice(0, 5), rotM(0, 0, 0), [0, 0, 0])); ps.push(...transformar(loc.slice(5), rotM(20, 70), [6, 18, 0])); ps.push(...cuerpo({ cu: CUERPOS.soldado, eq: EQUIPOS.caballero, acc: 'morir', f: 7, dir: 'so', m: rotM(40), t: [-6, 22, 0] })); }
      else ps.push(...loc);
      ps.push(a.cilindro(-26, 0, 0, 5, 9, { mat: M, r1: 4.6 }), a.caja(-26, 0, 9, 10, 10, 1.6, { mat: M }));
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 22], r: v === 'velas' ? 34 : 24, color: '#ffc070' } };
    },
  },
  // ------------------------------------------------------------------ estatuas de reyes
  {
    id: 'for2_estatua_rey', nombre: ['Estatua del rey', 'King statue'], tema: 'fortaleza', variantes: ['espada', 'cetro', 'escudo', 'decapitada'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 22, 20)];
      ps.push(a.caja(0, 0, 0, 30, 30, 10, { mat: P, tono: -0.05 }), a.caja(0, 0, 10, 26, 26, 14, { mat: P }), a.caja(0, 0, 24, 30, 30, 3, { mat: P, tono: 0.05 }));
      ps.push(a.caja(6, 13.2, 14, 14, 0.6, 5, { mat: 'bronce', giro: 0 }));
      const eq = { torso: { tipo: 'placas' as const, mat: 'cu_placa', mat2: 'cu_malla' }, piernas: { tipo: 'grebas' as const, mat: 'cu_placa', mat2: 'cu_malla' }, pies: { tipo: 'sabatones' as const, mat: 'cu_placa' }, hombros: { tipo: 'placas' as const, mat: 'cu_placa' }, capa: { mat: 'cu_tela_azul', largo: 1 }, cabeza: { tipo: 'corona' as const, mat: 'cu_oro', mat2: 'cu_oro' }, arma: v === 'cetro' ? { tipo: 'cetro' as const, mat: 'cu_oro' } : { tipo: 'mandoble' as const, mat: 'cu_placa' }, izq: v === 'escudo' ? { tipo: 'escudo_torre' as const, mat: 'cu_placa', mat2: 'cu_placa' } : undefined };
      let cs = cuerpo({ cu: { ...CUERPOS.soldado, barba: 'larga', alto: 1.2 }, eq, acc: v === 'espada' ? 'presentar' : 'quieto', f: v === 'espada' ? 6 : 0, dir: 'se', t: [0, 0, 27] });
      if (v === 'decapitada') { cs = cs.filter((p) => envolver([p])[0][2] < 27 + 56); ps.push(...rematerial([a.esfera(14, 20, 4, 4.4, { mat: ES }), a.cilindro(14, 20, 7, 4, 3, { mat: ES })], ES)); escombros(a, ps, [14, 16, 0], 8, 5, ES); }
      ps.push(...rematerial(cs, ES));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ celdas
  {
    id: 'for2_celda', nombre: ['Celda', 'Prison cell'], tema: 'fortaleza', variantes: ['cerrada', 'abierta', 'preso', 'esqueleto'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const W = 44, H = 56;
      // paredes de atrás y costados, techo bajo, y la reja de adelante (+x +y abiertos a la vista)
      ps.push(a.caja(0, 0, 0, W, W, 2, { mat: PO }), a.caja(0, -W / 2, 0, W, 8, H, { mat: PO }), a.caja(-W / 2, 0, 0, 8, W, H, { mat: PO }));
      ps.push(...losa(a, 14, 12, 2, 3.5, 'for2_paja', 8, { x: -10, y: -8 }));
      for (const z of [18, 34]) ps.push(a.cilindro(-W / 2 + 4.4, -6, z, 1.6, 1, { mat: 'hierro', eje: [1, 0, 0] }));
      cadena(a, ps, catenaria([-W / 2 + 4.4, -6, 34], [-W / 2 + 4.4, 4, 34], 8, 8), 2, 0.4);
      for (let i = 0; i < 8; i++) { const x = -W / 2 + 5 + i * 5.4; if (v === 'abierta' && i >= 5) continue; ps.push(a.palo([x, W / 2, 0], [x, W / 2, H], 0.8, { mat: 'hierro' })); }
      for (let i = 0; i < 8; i++) { const y = -W / 2 + 5 + i * 5.4; ps.push(a.palo([W / 2, y, 0], [W / 2, y, H], 0.8, { mat: 'hierro' })); }
      for (const z of [4, H - 4]) ps.push(a.palo([-W / 2, W / 2, z], [W / 2, W / 2, z], 1, { mat: 'hierro' }), a.palo([W / 2, -W / 2, z], [W / 2, W / 2, z], 1, { mat: 'hierro' }));
      if (v === 'abierta') ps.push(...transformar([...[0, 1, 2].map((i) => a.palo([i * 5.4, 0, 0], [i * 5.4, 0, H - 2], 0.8, { mat: 'hierro' })), a.palo([0, 0, 6], [12, 0, 6], 1, { mat: 'hierro' }), a.palo([0, 0, H - 6], [12, 0, H - 6], 1, { mat: 'hierro' })], rotM(60), [W / 2 - 15, W / 2, 0]));
      if (v === 'preso') ps.push(...cuerpo({ cu: CUERPOS.palido, eq: EQUIPOS.preso, acc: 'morir', f: 3, dir: 'se', t: [-8, -6, 2] }));
      if (v === 'esqueleto') { ps.push(...cuerpo({ cu: CUERPOS.esqueleto, eq: EQUIPOS.nada, acc: 'morir', f: 7, dir: 'so', t: [-4, -4, 2], m: rotM(20) })); craneo(a, ps, [8, 6, 5], 2.6, 30); }
      ps.push(a.cilindro(10, -12, 2, 3, 5, { mat: 'madera_vieja', r1: 3.4 }), a.esfera(-14, 12, 3.4, 1.4, { mat: 'hueso' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ tortura
  {
    id: 'for2_potro', nombre: ['Potro de tortura', 'Torture rack'], tema: 'fortaleza', variantes: ['potro', 'rueda', 'doncella', 'cepo'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 26, 18, 4), manto(a, 8, 6, 3, 'sangre', 0.6, { x: 4, y: 6, tono: 0 })];
      if (v === 'potro') {
        for (const x of [-20, 20]) for (const y of [-7, 7]) ps.push(a.caja(x, y, 0, 3, 3, 18, { mat: M }));
        for (const y of [-7, 7]) ps.push(a.caja(0, y, 14, 46, 3, 3, { mat: M }));
        for (let i = 0; i < 5; i++) ps.push(a.caja(-12 + i * 6, 0, 15, 4, 12, 1.4, { mat: M, tono: jit(a, 0.05) }));
        for (const x of [-22, 22]) { ps.push(a.cilindro(x, -8, 17, 2.6, 16, { mat: M, eje: [0, 1, 0] })); for (let k = 0; k < 4; k++) { const t = (k / 4) * TAU; ps.push(a.palo([x, 0, 17], [x + Math.cos(t) * 6, 0, 17 + Math.sin(t) * 6], 0.7, { mat: M })); } }
        ps.push(...cuerpo({ cu: CUERPOS.palido, eq: EQUIPOS.preso, acc: 'morir', f: 7, dir: 'e', m: rotM(0), s: 0.78, t: [0, 0, 16] }));
        for (const s of [-1, 1]) ps.push(a.palo([s * 22, 0, 17], [s * 15, 0, 18], 0.3, { mat: 'cuerda' }));
      } else if (v === 'rueda') {
        ps.push(a.palo([0, 0, 0], [0, 0, 56], 2, { mat: M }));
        const loc: Pieza[] = [a.cilindro(0, 0, -1.5, 20, 3, { mat: M }), a.cilindro(0, 0, -1.5, 16, 3.2, { mat: M, resta: true }), a.cilindro(0, 0, -2, 3.4, 4, { mat: 'hierro' })];
        for (let k = 0; k < 8; k++) { const t = (k / 8) * TAU; loc.push(a.palo([0, 0, 0], [Math.cos(t) * 17, Math.sin(t) * 17, 0], 0.9, { mat: M })); }
        ps.push(...transformar(loc, rotM(0, 0, 80), [0, 0, 56]));
        ps.push(...cuerpo({ cu: CUERPOS.desollado, eq: EQUIPOS.nada, acc: 'morir', f: 7, dir: 'e', m: rotM(0, 0, -10), s: 0.6, t: [0, 0, 58] }));
      } else if (v === 'doncella') {
        const cs: Comp[] = [hueso([0, 0, 0], [0, 0, 50], 10, 8), bulto([0, 0, 54], [7, 7, 8])];
        ps.push(masa(cs, { mat: 'hierro_oxido', suave: 3 }));
        ps.push(a.elipsoide(6.4, 6.4, 53, 3.4, 3.4, 4, { mat: 'hierro_oxido', tono: 0.1 }), ...[-1, 1].map((s) => a.esfera(7.4 + s * 1.3, 7.4 - s * 1.3, 55, 0.7, { mat: 'negro' })));
        ps.push(...transformar([a.caja(0, 0, 0, 18, 2, 52, { mat: 'hierro_oxido' }), ...Array.from({ length: 12 }, (_, i) => a.cilindro(-6 + (i % 3) * 6, 1, 6 + Math.floor(i / 3) * 11, 0.8, 4, { mat: 'hierro', r1: 0.1, eje: [0, -1, 0] }))], rotM(-80), [9, -4, 0]));
      } else {
        ps.push(a.caja(-14, 0, 0, 4, 4, 36, { mat: M }), a.caja(14, 0, 0, 4, 4, 36, { mat: M }), a.caja(0, 0, 26, 34, 4, 4, { mat: M }), a.caja(0, 0, 31, 34, 4, 4, { mat: M }));
        ps.push(...cuerpo({ cu: CUERPOS.muerto, eq: EQUIPOS.preso, acc: 'morir', f: 3, dir: 'se', t: [2, 6, 0], s: 0.95 }));
        for (let i = 0; i < 3; i++) ps.push(a.esfera(jit(a, 12), 12 + jit(a, 6), 1.5, 1.6, { mat: elegir(a, ['hongo', 'cu_cuero']) }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ defensores caídos
  {
    id: 'for2_cadaver', nombre: ['Defensor caído', 'Fallen defender'], tema: 'fortaleza', variantes: ['soldado', 'caballero', 'arquero', 'pila', 'flechas'], huella: [2, 2], huellaPor: { pila: [3, 3] }, bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 22, 20, 4)];
      const uno = (cu = CUERPOS.soldado, eq = EQUIPOS.soldado, t: V3 = [0, 0, 0]) => { const cs = cuerpo({ cu, eq, acc: 'morir', f: 7, dir: elegir(a, ['s', 'se', 'e', 'so']), m: rotM(a.r() * 360), t }); ps.push(...cs); return cs; };
      let cs: Pieza[] = [];
      if (v === 'soldado') cs = uno(CUERPOS.soldado_moreno, { ...EQUIPOS.soldado_lanza });
      else if (v === 'caballero') cs = uno(CUERPOS.soldado, { ...EQUIPOS.caballero });
      else if (v === 'arquero') cs = uno(CUERPOS.soldado, EQUIPOS.arquero);
      else if (v === 'pila') { for (let i = 0; i < 3; i++) cs.push(...uno(elegir(a, [CUERPOS.soldado, CUERPOS.soldado_moreno]), elegir(a, [EQUIPOS.soldado, EQUIPOS.caballero, EQUIPOS.soldado_lanza]), [jit(a, 8), jit(a, 8), i * 4])); }
      else cs = uno(CUERPOS.soldado, EQUIPOS.soldado);
      ps.push(manto(a, 12, 10, 4, 'sangre', 0.6, { x: 8, y: 8, tono: 0 }));
      if (v === 'flechas' || v === 'arquero') { const [lo, hi] = envolver(cs); for (let i = 0; i < 6; i++) { const p: V3 = [lo[0] + a.r() * (hi[0] - lo[0]), lo[1] + a.r() * (hi[1] - lo[1]), hi[2] * 0.6], q = add(p, [jit(a, 5), jit(a, 5), 10 + a.r() * 4]); ps.push(a.palo(p, q, 0.35, { mat: 'madera_lisa' }), a.cilindro(...q, 1, 2.4, { mat: 'cu_tela_blanca', r1: 0.2, eje: nor([q[0] - p[0], q[1] - p[1], q[2] - p[2]]) })); } }
      ps.push(suelo(a));
      return ps;
    },
  },
);

registrar(
  // ------------------------------------------------------------------ escombros
  {
    id: 'for2_escombros', nombre: ['Escombros', 'Rubble'], tema: 'fortaleza', variantes: ['piedras', 'viga', 'muro_caido', 'almena'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 28, 26, 6)];
      escombros(a, ps, [0, 0, 0], 22, v === 'piedras' ? 30 : 16);
      if (v === 'viga') { tronco(a, ps, [-30, -10, 4], [26, 12, 14], 4, { mat: 'for2_madera' }); ps.push(a.caja(-6, 4, 0, 20, 12, 8, { mat: P, giro: 30, incl: 10 })); }
      if (v === 'muro_caido') { ps.push(...transformar([a.caja(0, 0, 0, 40, 12, 30, { mat: P })], rotM(20, 80), [0, -6, 6])); escombros(a, ps, [8, 16, 0], 16, 12); }
      if (v === 'almena') for (let i = 0; i < 3; i++) ps.push(a.caja(jit(a, 18), jit(a, 18), 0, 8, 6, 10, { mat: P, giro: a.r() * 180, incl: 60 + jit(a, 30) }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ ballestas de asedio
  {
    id: 'for2_ballesta', nombre: ['Ballesta de asedio', 'Siege ballista'], tema: 'fortaleza', variantes: ['cargada', 'apuntando', 'rota'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 26, 24, 5)], loc: Pieza[] = [];
      loc.push(a.caja(0, 0, 18, 48, 6, 4, { mat: M }), a.caja(-20, 0, 18, 8, 10, 6, { mat: M, tono: 0.05 }));
      // arco de dos brazos y la cuerda tensa
      for (const s of [-1, 1]) loc.push(masa([hueso([16, s * 3, 21], [18, s * 18, 23], 2, 1.4), hueso([18, s * 18, 23], [14, s * 28, 22], 1.4, 0.8)], { mat: M, suave: 1 }));
      const tensa = v !== 'rota';
      for (const s of [-1, 1]) loc.push(a.palo([14, s * 28, 22], [tensa ? -14 : 12, 0, 23], 0.3, { mat: 'cuerda' }));
      if (v !== 'rota') loc.push(a.palo([-16, 0, 23], [30, 0, 23], 0.9, { mat: 'madera_lisa' }), a.poliedro([[30, -1.4, 23], [30, 1.4, 23], [30, 0, 21.6], [30, 0, 24.4], [36, 0, 23]], { mat: 'hierro' }));
      loc.push(a.cilindro(-24, 0, 23, 3, 10, { mat: M, eje: [0, 1, 0] }));
      ps.push(...transformar(loc, rotM(v === 'apuntando' ? 30 : 0, 0, v === 'apuntando' ? -12 : 0), [0, 0, 0]));
      // el trípode de patas
      for (let i = 0; i < 3; i++) { const t = (i / 3) * TAU + 0.6; ps.push(a.palo([Math.cos(t) * 16, Math.sin(t) * 16, 0], [0, 0, 18], 1.6, { mat: M })); }
      if (v === 'rota') { ps.push(...transformar([a.caja(0, 0, 0, 30, 4, 3, { mat: M })], rotM(40), [10, 16, 1])); escombros(a, ps, [6, 10, 0], 12, 6, M); }
      for (let i = 0; i < 4; i++) ps.push(a.palo([-16 + i * 3, 18, 1], [16 + i * 3, 20, 1.5], 0.8, { mat: 'madera_lisa' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ caldero de aceite hirviendo
  {
    id: 'for2_caldero_aceite', nombre: ['Caldero de aceite', 'Boiling oil cauldron'], tema: 'fortaleza', variantes: ['hirviendo', 'volcado', 'frio'], cuadros: 8, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [polvo(a, 22, 20, 4)];
      for (const s of [-1, 1]) ps.push(a.palo([s * 16, -s * 4, 0], [s * 16, -s * 4, 40], 1.6, { mat: M }), a.palo([s * 16, -s * 4 + 6, 0], [s * 16, -s * 4, 26], 1.2, { mat: M }));
      ps.push(a.palo([-18, 4, 40], [18, -4, 40], 1.6, { mat: M }));
      const loc = [a.cilindro(0, 0, -8, 6, 4, { mat: 'hierro', r1: 10.4 }), a.cilindro(0, 0, -4, 10.4, 9, { mat: 'hierro', r1: 10 }), a.cilindro(0, 0, 5, 10.4, 1.2, { mat: 'hierro', tono: 0.1 }), a.cilindro(0, 0, 5.4, 9.2, 0.8, { mat: 'agua_sucia', tono: v === 'frio' ? -0.1 : 0.1 })];
      if (v === 'volcado') { ps.push(...transformar(loc, rotM(30, 70), [2, 4, 10])); ps.push(...losa(a, 16, 10, 0, 0.6, 'agua_sucia', 9, { x: 12, y: 14 })); }
      else { ps.push(...transformar(loc, rotM(0), [0, 0, 22])); cadena(a, ps, [[-9, 2, 40], [-9, 2, 28]], 2.2, 0.45); cadena(a, ps, [[9, -2, 40], [9, -2, 28]], 2.2, 0.45); }
      if (v === 'hirviendo') { brasas(a, ps, [0, 0, 1], 9, f, 8); fuego(a, ps, [0, 0, 2], 1.6, f, 8, { lenguas: 5, alto: 0.8 }); for (let i = 0; i < 3; i++) { const fase = (f + i * 3) % 8; if (fase < 5) ps.push(a.esfera(Math.cos(i * 2.1) * 5, Math.sin(i * 2.1) * 5, 28, 0.6 + fase * 0.3, { mat: 'agua_sucia', tono: 0.2 })); } }
      ps.push(suelo(a));
      return v === 'hirviendo' ? { piezas: ps, resplandor: { c: [0, 0, 8], r: 40, color: LUZ } } : ps;
    },
  },
  // ------------------------------------------------------------------ pertrechos
  {
    id: 'for2_pertrechos', nombre: ['Pertrechos', 'Supplies'], tema: 'fortaleza', variantes: ['barriles', 'sacos', 'cajas', 'flechas'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 20, 18, 4)];
      const barril = (x: number, y: number, z = 0, tumbado = false) => { const loc = [a.cilindro(0, 0, 0, 6.4, 16, { mat: 'madera' }), masa([hueso([0, 0, 2], [0, 0, 14], 7.2, 7.2)], { mat: 'madera', suave: 1 }), a.cilindro(0, 0, 2.4, 7.3, 1.2, { mat: 'hierro' }), a.cilindro(0, 0, 12.4, 7.3, 1.2, { mat: 'hierro' }), a.cilindro(0, 0, 15.8, 6.2, 0.4, { mat: 'madera_vieja' })]; ps.push(...transformar(loc, tumbado ? rotM(a.r() * 180, 90) : rotM(a.r() * 30), [x, y, z + (tumbado ? 7 : 0)])); };
      const cajon = (x: number, y: number, z: number, s = 1) => { ps.push(a.caja(x, y, z, 14 * s, 12 * s, 11 * s, { mat: 'madera_vieja', giro: jit(a, 20) })); ps.push(a.caja(x, y, z + 11 * s, 14.4 * s, 12.4 * s, 0.8, { mat: 'madera', giro: jit(a, 2) })); };
      if (v === 'barriles') { barril(-6, -4); barril(7, -6); barril(0, 9, 0, true); barril(-4, -2, 16); }
      else if (v === 'sacos') for (let i = 0; i < 7; i++) ps.push(masa([bulto([jit(a, 10), jit(a, 10), 4 + Math.floor(i / 4) * 6], [6, 4.4, 4], { giro: a.r() * 180 }), bulto([0, 0, 0], [0.1, 0.1, 0.1])].slice(0, 1), { mat: elegir(a, ['cu_tela_parda', 'tela']), suave: 1 }));
      else if (v === 'cajas') { cajon(-6, -4, 0); cajon(8, -2, 0, 0.8); cajon(-4, -4, 11, 0.85); cajon(4, 10, 0, 0.7); }
      else { for (let i = 0; i < 3; i++) { const x = -8 + i * 8; ps.push(a.cilindro(x, 0, 0, 3.4, 14, { mat: 'cuero', r1: 3.8 })); for (let k = 0; k < 7; k++) { const p: V3 = [x + jit(a, 2), jit(a, 2), 14]; ps.push(a.palo(add(p, [0, 0, -8]), add(p, [jit(a, 1), jit(a, 1), 8]), 0.3, { mat: 'madera_lisa' }), a.cilindro(...add(p, [0, 0, 6]), 0.8, 2.4, { mat: 'cu_tela_blanca', r1: 0.1 })); } } barril(10, 10); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ trono
  {
    id: 'for2_trono', nombre: ['Trono del rey', 'King throne'], tema: 'fortaleza', variantes: ['trono', 'dosel', 'roto'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 46, 46, 4, { mat: PO }), a.caja(-4, -4, 4, 36, 36, 4, { mat: PO, tono: 0.05 }));
      ps.push(...losa(a, 10, 22, 8, 8.4, 'tela_roja', 6, { x: 12, y: 12 }).map((p) => p));
      const loc: Pieza[] = [];
      loc.push(a.caja(0, 0, 8, 18, 18, 10, { mat: M }), a.caja(0, 0, 18, 18, 18, 2.4, { mat: 'tela_roja' }), a.caja(-8, 0, 8, 4, 22, 54, { mat: M }));
      for (const s of [-1, 1]) loc.push(a.caja(2, s * 9.5, 18, 16, 3, 9, { mat: M }), a.esfera(10, s * 9.5, 28, 2, { mat: 'cu_oro' }));
      loc.push(a.poliedro([[-8, -11, 62], [-8, 11, 62], [-8, 0, 72], [-6, -11, 62], [-6, 11, 62], [-6, 0, 72]], { mat: M }), a.esfera(-6.5, 0, 74, 2.4, { mat: 'cu_oro' }));
      loc.push(a.caja(-5.8, 0, 24, 0.6, 16, 32, { mat: 'tela_azul' }));
      if (v === 'dosel') { for (const s of [-1, 1]) loc.push(a.palo([-14, s * 16, 8], [-14, s * 16, 92], 1.4, { mat: 'cu_oro' }), a.palo([14, s * 16, 8], [14, s * 16, 92], 1.4, { mat: 'cu_oro' })); loc.push(a.caja(0, 0, 90, 32, 36, 3, { mat: 'tela_azul' })); for (const s of [-1, 1]) loc.push(a.caja(0, s * 18, 76, 30, 0.6, 16, { mat: 'tela_azul', tono: -0.1 })); }
      if (v === 'roto') { ps.push(...transformar(loc, rotM(45, 0, 14), [0, 0, 0]).filter(() => a.r() < 0.8)); escombros(a, ps, [14, 14, 4], 12, 10, M); ps.push(a.caja(16, 18, 4, 10, 12, 0.5, { mat: 'tela_azul', giro: 30 })); }
      else ps.push(...transformar(loc, rotM(45), [0, 0, 0]));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ columnas
  {
    id: 'for2_columna', nombre: ['Columna', 'Column'], tema: 'fortaleza', variantes: ['entera', 'rota', 'caida', 'hiedra'], huella: [2, 2], huellaPor: { caida: [4, 2] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 18, 16, 4)];
      const fuste = (H: number) => { ps.push(a.caja(0, 0, 0, 20, 20, 6, { mat: P }), a.cilindro(0, 0, 6, 8.6, 3, { mat: 'for2_estatua', r1: 7.6 })); for (let i = 0; i < Math.floor(H / 12); i++) ps.push(a.cilindro(0, 0, 9 + i * 12, 7.2 - i * 0.05, 12, { mat: 'for2_estatua', r1: 7.1 - i * 0.05, tono: jit(a, 0.05) })); };
      if (v === 'entera' || v === 'hiedra') { fuste(84); ps.push(a.cilindro(0, 0, 93, 7, 4, { mat: 'for2_estatua', r1: 9 }), a.caja(0, 0, 97, 20, 20, 5, { mat: P })); if (v === 'hiedra') { const cs: Comp[] = []; for (let i = 0; i < 26; i++) { const t = i * 0.7, z = 6 + i * 3.4; cs.push(bulto([Math.cos(t) * 7.6, Math.sin(t) * 7.6, z], [2.4, 2.4, 2.4], { mat: elegir(a, ['hojas', 'musgo']) })); } ps.push(masa(cs, { mat: 'hojas', suave: 2 })); } }
      else if (v === 'rota') { fuste(36); ps.push(a.poliedro([[-8, -8, 44], [8, -8, 40], [-8, 8, 46], [8, 8, 38], [0, 0, 50]], { mat: 'for2_estatua', resta: true })); escombros(a, ps, [10, 10, 0], 12, 8, 'for2_estatua'); }
      else { ps.push(a.caja(-24, 0, 0, 20, 20, 6, { mat: P }), a.cilindro(-24, 0, 6, 8.6, 6, { mat: 'for2_estatua', r1: 7.6 })); for (let i = 0; i < 4; i++) ps.push(a.cilindro(-12 + i * 13, 2 + i * 0.6, 7.2, 7.2, 12.4, { mat: 'for2_estatua', eje: [1, jit(a, 0.15), jit(a, 0.05)] })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ antorcheros
  {
    id: 'for2_antorchero', nombre: ['Antorchero', 'Torch stand'], tema: 'fortaleza', variantes: ['poste', 'doble', 'pilar'], cuadros: 8, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [polvo(a, 10, 9, 3)];
      const antorcha = (b: V3, d: V3) => { const q = add(b, nor(d), 12); ps.push(a.palo(b, q, 0.9, { mat: 'madera' }), a.cilindro(...q, 1.4, 2.6, { mat: 'cuero', eje: d })); fuego(a, ps, add(q, [0, 0, 2]), 0.7, f, 8, { lenguas: 3, chispas: 2 }); return q; };
      let c: V3;
      if (v === 'poste') { ps.push(a.palo([0, 0, 0], [0, 0, 44], 1.4, { mat: 'hierro' }), a.cilindro(0, 0, 0, 4, 2, { mat: 'hierro' })); c = antorcha([0, 0, 40], [0, 0, 1]); }
      else if (v === 'doble') { ps.push(a.palo([0, 0, 0], [0, 0, 40], 1.4, { mat: 'hierro' }), a.cilindro(0, 0, 0, 4, 2, { mat: 'hierro' }), a.palo([-6, 6, 38], [6, -6, 38], 0.9, { mat: 'hierro' })); antorcha([6, -6, 36], [0.3, -0.3, 1]); c = antorcha([-6, 6, 36], [-0.3, 0.3, 1]); }
      else { ps.push(a.caja(0, 0, 0, 14, 14, 50, { mat: P }), a.caja(0, 0, 50, 16, 16, 3, { mat: P })); ps.push(a.palo([7, 7, 34], [10, 10, 36], 0.7, { mat: 'hierro' })); c = antorcha([10, 10, 32], [0.4, 0.4, 1]); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: add(c, [0, 0, 4]), r: 38, color: LUZ } };
    },
  },
  // ------------------------------------------------------------------ arcos
  {
    id: 'for2_arco', nombre: ['Arco de piedra', 'Stone archway'], tema: 'fortaleza', variantes: ['arco', 'roto', 'rastrillo'], huella: [4, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 32, 10, 4)];
      const W = 30, Hj = 40;
      for (const s of [-1, 1]) { ps.push(a.caja(s * (W / 2 + 6), 0, 0, 12, 12, Hj, { mat: P })); ps.push(a.caja(s * (W / 2 + 6), 0, 0, 14, 14, 6, { mat: P, tono: -0.06 })); }
      const n = 11;
      for (let i = 0; i <= n; i++) { if (v === 'roto' && i > 6) continue; const t = (i / n) * PI, r = W / 2 + 4; ps.push(a.caja(-Math.cos(t) * r, 0, Hj + Math.sin(t) * r - 3, 6, 12, 7, { mat: P, incl: 90 - deg(t), inclEje: 'y', tono: jit(a, 0.07) })); }
      if (v !== 'roto') ps.push(a.caja(0, 0, Hj + W / 2 + 4, W + 26, 12, 6, { mat: P }));
      else escombros(a, ps, [12, 10, 0], 14, 12);
      if (v === 'rastrillo') { for (let i = 0; i < 6; i++) ps.push(a.palo([-W / 2 + 3 + i * 4.8, 0, 22], [-W / 2 + 3 + i * 4.8, 0, Hj + 10], 0.8, { mat: 'hierro' })); for (let k = 0; k < 3; k++) ps.push(a.palo([-W / 2, 0, 26 + k * 10], [W / 2, 0, 26 + k * 10], 0.7, { mat: 'hierro' })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ horca
  {
    id: 'for2_horca', nombre: ['Patíbulo', 'Gallows'], tema: 'fortaleza', variantes: ['vacia', 'ahorcado', 'triple'], huella: [4, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 34, 24, 5)];
      // tarima de tablas con escalera, dos postes y el travesaño
      ps.push(a.caja(0, 0, 0, 56, 30, 14, { mat: M }));
      for (let i = 0; i < 4; i++) ps.push(a.caja(-20 + i * 3.4, 18 + i * 3, 0, 14, 3, 12 - i * 3.4, { mat: M }));
      for (const x of [-24, 24]) ps.push(a.caja(x, -6, 14, 4, 4, 70, { mat: M }));
      ps.push(a.caja(0, -6, 82, 56, 4, 4, { mat: M }), a.palo([-24, -6, 66], [-14, -6, 82], 1.2, { mat: M }), a.palo([24, -6, 66], [14, -6, 82], 1.2, { mat: M }));
      const n = v === 'triple' ? 3 : 1;
      for (let i = 0; i < n; i++) { const x = n === 1 ? 0 : -14 + i * 14, p: V3 = [x, -6, 82]; if (v === 'vacia') { ps.push(a.palo(p, add(p, [0, 0, -16]), 0.35, { mat: 'cuerda' }), a.cilindro(x, -6, 64, 2.4, 0.6, { mat: 'cuerda', eje: [1, -1, 0] })); } else colgado(a, ps, p, 4, elegir(a, [CUERPOS.muerto, CUERPOS.palido, CUERPOS.soldado]), elegir(a, [EQUIPOS.preso, EQUIPOS.harapos]), 0.9); }
      ps.push(a.caja(0, -6, 14, 14, 14, 0.4, { mat: 'negro' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ campana de alarma
  {
    id: 'for2_campana', nombre: ['Campana de alarma', 'Alarm bell'], tema: 'fortaleza', variantes: ['colgada', 'caida', 'torre'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 18, 16, 4)];
      const campana = (c: V3, m = rotM(0)) => ps.push(...transformar([masa([hueso([0, 0, 0], [0, 0, -12], 4, 8.6), bulto([0, 0, -12], [9.4, 9.4, 2])], { mat: 'bronce', suave: 1.4 }), a.cilindro(0, 0, -14.5, 7.6, 2, { mat: 'negro' }), a.palo([0, 0, -4], [0, 0, -13], 0.6, { mat: 'hierro' }), a.esfera(0, 0, -14, 1.6, { mat: 'hierro' })], m, c));
      if (v === 'caida') { campana([4, 4, 9], rotM(30, 100)); ps.push(a.palo([-14, -10, 0.8], [10, -16, 1.2], 1.8, { mat: M }), a.palo([-14, 4, 0.8], [-12, 20, 2], 1.8, { mat: M })); escombros(a, ps, [0, 0, 0], 14, 8, M); }
      else {
        const H = v === 'torre' ? 70 : 44;
        if (v === 'torre') { for (const [x, y] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) ps.push(a.palo([x, y, 0], [x * 0.6, y * 0.6, H], 1.6, { mat: M })); ps.push(a.caja(0, 0, H, 22, 22, 2, { mat: M }), a.poliedro([[-14, -14, H + 24], [14, -14, H + 24], [-14, 14, H + 24], [14, 14, H + 24], [0, 0, H + 38]], { mat: 'teja' })); for (const [x, y] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) ps.push(a.palo([x, y, H], [x, y, H + 24], 1.2, { mat: M })); campana([0, 0, H + 22]); }
        else { for (const s of [-1, 1]) ps.push(a.palo([s * 14, -s * 4, 0], [s * 12, -s * 4, H], 1.8, { mat: M })); ps.push(a.palo([-15, 5, H], [15, -5, H], 1.8, { mat: M })); campana([0, 0, H - 2]); ps.push(a.palo([0, 0, H - 26], [3, 3, 4], 0.3, { mat: 'cuerda' })); }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ tumba del héroe
  {
    id: 'for2_tumba', nombre: ['Tumba del héroe', "Hero's tomb"], tema: 'fortaleza', variantes: ['efigie', 'abierta', 'flores'], huella: [4, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 32, 18, 5)];
      ps.push(a.caja(0, 0, 0, 62, 28, 4, { mat: P, tono: -0.05 }), a.caja(0, 0, 4, 54, 22, 16, { mat: ES }), a.caja(0, 0, 20, 58, 25, 2.4, { mat: ES, tono: 0.06 }));
      for (let i = 0; i < 3; i++) escudoCometa(a, ps, [-16 + i * 16, 11.2, 12], 0.9, [0, 1, 0], elegir(a, ['tela_azul', 'tela_roja']));
      if (v !== 'abierta') {
        const ef = cuerpo({ cu: { ...CUERPOS.soldado, barba: 'larga' }, eq: { ...EQUIPOS.caballero, arma: undefined, izq: undefined }, acc: 'morir', f: 7, dir: 'e' });
        const [lo, hi] = envolver(ef), giro = hi[0] - lo[0] > hi[1] - lo[1] ? 0 : 90;
        ps.push(...rematerial(transformar(ef, rotM(giro), [0, 0, 22.4], 0.82), ES));
        ps.push(...rematerial([a.poliedro([[-20, -0.8, 27], [-20, 0.8, 27], [12, -0.8, 27], [12, 0.8, 27], [16, 0, 27]], { mat: ES }), a.palo([-20, -4, 27], [-20, 4, 27], 0.8, { mat: ES })], ES));
      } else { ps.push(a.caja(0, 0, 8, 46, 16, 14, { mat: ES, resta: true })); ps.push(...transformar([a.caja(0, 0, 0, 58, 25, 2.4, { mat: ES })], rotM(8, 0, 0), [6, 26, 1.6])); ps.push(...cuerpo({ cu: CUERPOS.esqueleto, eq: { ...EQUIPOS.caballero, arma: undefined, izq: undefined, tabardo: undefined }, acc: 'morir', f: 7, dir: 'e', s: 0.7, t: [0, 0, 8] })); }
      if (v === 'flores') for (let i = 0; i < 9; i++) { const x = jit(a, 26), y = 15 + a.r() * 4; ps.push(a.palo([x, y, 0], [x + jit(a, 1), y, 4], 0.3, { mat: 'pasto' }), a.esfera(x, y, 4.4, 1, { mat: elegir(a, ['tela_roja', 'cu_tela_blanca', 'tela_morada']) })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ escaleras
  {
    id: 'for2_escalera', nombre: ['Escalera de piedra', 'Stone stairs'], tema: 'fortaleza', variantes: ['recta', 'rota', 'muro'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 26, 16, 4)];
      const n = 8;
      for (let i = 0; i < n; i++) { if (v === 'rota' && (i === 4 || i === 5) ) continue; ps.push(a.caja(-18 + i * 5.2, 0, 0, 6, 24, 5 + i * 5, { mat: P, tono: jit(a, 0.06) })); ps.push(a.caja(-18 + i * 5.2 + 0.4, 0, 5 + i * 5 - 1, 6.6, 24.6, 1.2, { mat: P, tono: 0.08 })); }
      if (v === 'rota') escombros(a, ps, [6, 16, 0], 12, 10);
      if (v === 'muro') ps.push(a.caja(0, -14, 0, 46, 5, 50, { mat: P }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ aljibe
  {
    id: 'for2_aljibe', nombre: ['Aljibe', 'Cistern well'], tema: 'fortaleza', variantes: ['tapado', 'abierto', 'roldana'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [polvo(a, 20, 18, 4)];
      ps.push(a.cilindro(0, 0, 0, 13, 16, { mat: P }), a.cilindro(0, 0, 1, 10, 16, { mat: P, resta: true }), a.cilindro(0, 0, 4, 10, 0.6, { mat: 'agua_sucia' }), a.cilindro(0, 0, 15, 13.6, 2, { mat: P, tono: 0.06 }), a.cilindro(0, 0, 15, 10.4, 3, { mat: P, resta: true }));
      if (v === 'tapado') { ps.push(a.cilindro(0, 0, 16.6, 11.6, 1.6, { mat: M })); ps.push(a.palo([-11, 0, 18.3], [11, 0, 18.3], 0.6, { mat: 'hierro' })); }
      if (v === 'roldana' || v === 'abierto') { for (const s of [-1, 1]) ps.push(a.palo([s * 12, -s * 2, 0], [s * 11, -s * 2, 40], 1.4, { mat: M })); ps.push(a.palo([-13, 2.4, 40], [13, -2.4, 40], 1.2, { mat: M })); }
      if (v === 'roldana') { ps.push(a.cilindro(0, 0, 40, 3, 2, { mat: M, eje: [1, -0.2, 0] })); ps.push(a.palo([0, 0, 37], [0, 0, 24], 0.3, { mat: 'cuerda' }), a.cilindro(0, 0, 18, 3, 6, { mat: 'madera', r1: 3.4 }), a.cilindro(0, 0, 21, 3.2, 0.6, { mat: 'hierro' })); }
      ps.push(suelo(a));
      return ps;
    },
  },
);

conVarianteY('for2_muralla', 'for2_almena', 'for2_porton', 'for2_arco');
