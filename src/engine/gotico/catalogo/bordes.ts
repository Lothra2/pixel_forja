import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido } from '../render';

// Riscos de borde: la orilla de cada mundo. El juego recorta el mapa con una costa irregular y la bordea con estas
// peñas: altas donde la roca queda detrás del piso, bajas donde queda delante. Un estilo por tipo de mundo, cada uno
// con su piedra y su remate (musgo, arena, nieve, lianas, grietas de lava, percebes, mármol con oro, lápidas rotas).

const R = (hex: string[], ru = 0.45, es = 0.14, extra: Record<string, unknown> = {}) => ({ rampa: hex, ruido: ru, escala: es, patron: (p: V3) => (ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.5) - 0.5) * 0.16, ...extra });
MATERIALES.bor_paramo = R(['#12110f', '#211f1b', '#33302a', '#47443b', '#5c594d', '#737060', '#8a8774']);
MATERIALES.bor_musgo = R(['#0f150c', '#1a2413', '#27341c', '#364727', '#465b33', '#587040'], 0.5, 0.3);
MATERIALES.bor_cementerio = R(['#0f1012', '#1b1d21', '#2a2d33', '#3b3f47', '#4d525c', '#616773', '#777e8a']);
MATERIALES.bor_desierto = R(['#2a1a0e', '#452b17', '#633f22', '#825630', '#a17041', '#bd8d58', '#d6ab78'], 0.4, 0.1, { patron: (p: V3) => Math.sin(p[2] * 0.42 + ruido(p[0] * 0.06, p[1] * 0.06, 2) * 5) * 0.07 });
MATERIALES.bor_nieve_roca = R(['#0e1217', '#1a2029', '#28313d', '#384453', '#4b5969', '#607080', '#788998']);
MATERIALES.bor_nieve = R(['#8fa0b4', '#a8b8ca', '#c0cedd', '#d6e1ec', '#e8f0f7', '#f6fafd'], 0.2, 0.3);
MATERIALES.bor_selva = R(['#0c110c', '#172017', '#232f22', '#31402e', '#40523b', '#52664a', '#66795b']);
MATERIALES.bor_liana = R(['#10200c', '#1a3312', '#27491a', '#366124', '#487a30'], 0.4, 0.4);
MATERIALES.bor_infierno = R(['#0a0707', '#170e0c', '#261612', '#371f18', '#4a2a1f', '#5e3728', '#744533']);
MATERIALES.bor_lava = { rampa: ['#7a1806', '#b83208', '#e8600e', '#ff9a22', '#ffd060', '#fff0b0'], ruido: 0.5, escala: 0.25, emite: true };
MATERIALES.bor_ahogada = R(['#080d10', '#101a1f', '#1a2930', '#263a43', '#344d57', '#44616c', '#577681'], 0.45, 0.14, { brillo: 0.35 });
MATERIALES.bor_percebe = R(['#3a3830', '#57544a', '#757265', '#939082', '#b0ad9e'], 0.5, 0.6);
MATERIALES.bor_celestial = R(['#5a5850', '#7b7870', '#9b988f', '#b8b5ab', '#d0cdc3', '#e4e1d8', '#f3f1ea'], 0.3, 0.12);
MATERIALES.bor_oro = { rampa: ['#4a3208', '#7a560e', '#aa7c18', '#d4a52c', '#f0cc58', '#fff0a8'], ruido: 0.3, escala: 0.2, brillo: 0.9 };

const PI = Math.PI;
const suelo = (a: Arma) => a.caja(0, 0, -80, 900, 900, 80, { mat: 'roca', resta: true });
/** Peña facetada: cáscara de puntos sobre un elipsoide. */
function pena(a: Arma, x: number, y: number, z: number, rx: number, ry: number, rz: number, mat: string, giro = a.r() * PI, tono = 0, n = 10): Pieza {
  const c = Math.cos(giro), s = Math.sin(giro);
  const loc: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let i = 0; i < n; i++) { const th = a.r() * 2 * PI, w = a.r() * 2 - 1, q = Math.sqrt(1 - w * w); loc.push([Math.cos(th) * q, Math.sin(th) * q, w]); }
  const pts: V3[] = loc.map(([lx, ly, lz]) => { const k = 0.82 + a.r() * 0.18, px = lx * rx * k, py = ly * ry * k; return [x + px * c - py * s, y + px * s + py * c, z + Math.max(-0.8, Math.min(0.75, lz)) * rz * k]; });
  return a.poliedro(pts, { mat, tono });
}
/** Farallón: lajas apiladas a lo largo de un tramo, más angostas arriba. Devuelve las cimas para rematarlas. */
function farallon(a: Arma, ps: Pieza[], g: number, L: number, alto: number, grueso: number, mat: string): V3[] {
  const cimas: V3[] = [], n = Math.max(2, Math.round((L * 2) / 14));
  for (let k = 0; k <= n; k++) {
    const t = k / n - 0.5, cx = Math.cos(g) * L * 2 * t + (a.r() - 0.5) * 5, cy = Math.sin(g) * L * 2 * t + (a.r() - 0.5) * 5;
    const h = alto * (0.7 + 0.35 * a.r()) * (1 - Math.abs(t) * 0.35);
    let z = 0;
    while (z < h - 5) {
      const fr = z / h, rz = Math.min(h - z, 11 + a.r() * 12) * 0.62 + 4;
      ps.push(pena(a, cx + (a.r() - 0.5) * grueso * 0.5, cy + (a.r() - 0.5) * grueso * 0.5, z + rz * 0.7, (11 + a.r() * 6) * (1 - fr * 0.3), grueso * (1 - 0.45 * fr) * (0.8 + 0.3 * a.r()), rz, mat, g + (a.r() - 0.5) * 0.5, (a.r() - 0.5) * 0.14 - fr * 0.04));
      z += rz * (1.1 + 0.25 * a.r());
    }
    cimas.push([cx, cy, z]);
  }
  return cimas;
}

const ESTILOS = ['paramo', 'cementerio', 'desierto', 'nieve', 'selva', 'infierno', 'ahogada', 'celestial'] as const;
type Estilo = (typeof ESTILOS)[number];
const ROCA: Record<Estilo, string> = { paramo: 'bor_paramo', cementerio: 'bor_cementerio', desierto: 'bor_desierto', nieve: 'bor_nieve_roca', selva: 'bor_selva', infierno: 'bor_infierno', ahogada: 'bor_ahogada', celestial: 'bor_celestial' };
const TALLAS = ['alta_a', 'alta_b', 'alta_c', 'alta_d', 'media_a', 'media_b', 'baja_a', 'baja_b', 'baja_c'];

/** El remate propio de cada mundo sobre un punto de la roca. */
function remate(a: Arma, ps: Pieza[], e: Estilo, p: V3, s: number) {
  const [x, y, z] = p;
  if (e === 'paramo') ps.push(a.elipsoide(x, y, z, 7 * s, 6 * s, 2.2 * s, { mat: 'bor_musgo', giro: a.r() * 180 }));
  else if (e === 'nieve') { ps.push(a.elipsoide(x, y, z + 1, 10 * s, 9 * s, 3.4 * s, { mat: 'bor_nieve', giro: a.r() * 180 })); if (a.r() < 0.5) ps.push(a.palo([x + 4 * s, y + 3 * s, z], [x + 4.5 * s, y + 3.5 * s, z - 9 * s], 1.3 * s, { mat: 'bor_nieve', r1: 0.2 })); }
  else if (e === 'selva') { ps.push(a.elipsoide(x, y, z, 8 * s, 7 * s, 2.4 * s, { mat: 'bor_liana', giro: a.r() * 180 })); let q: V3 = [x + 5 * s, y + 4 * s, z]; for (let k = 0; k < 4; k++) { const w: V3 = [q[0] + (a.r() - 0.3) * 3, q[1] + (a.r() - 0.3) * 3, q[2] - (8 + a.r() * 8) * s]; ps.push(a.palo(q, w, 0.9, { mat: 'bor_liana' })); q = w; } }
  else if (e === 'infierno') { for (let k = 0; k < 2; k++) { const t = a.r() * 2 * PI; ps.push(a.palo([x + Math.cos(t) * 5 * s, y + Math.sin(t) * 5 * s, z + 1], [x + Math.cos(t) * 9 * s, y + Math.sin(t) * 9 * s, z - (10 + a.r() * 14) * s], 1.1 * s, { mat: 'bor_lava', r1: 0.4 })); } }
  else if (e === 'ahogada') { for (let k = 0; k < 5; k++) { const t = a.r() * 2 * PI, d = a.r() * 7 * s; ps.push(a.elipsoide(x + Math.cos(t) * d, y + Math.sin(t) * d, z - a.r() * 6 * s, 1.6 * s, 1.6 * s, 1.5 * s, { mat: 'bor_percebe' })); } }
  else if (e === 'celestial') { if (a.r() < 0.6) ps.push(a.caja(x, y, z, 9 * s, 9 * s, 2.2 * s, { mat: 'bor_oro', giro: a.r() * 90 })); }
  else if (e === 'desierto') { if (a.r() < 0.5) ps.push(a.elipsoide(x, y, z + 0.5, 9 * s, 8 * s, 1.6 * s, { mat: 'bor_desierto', tono: 0.14, giro: a.r() * 180 })); }
  else if (a.r() < 0.5) { ps.push(a.caja(x, y, z, 2.2 * s, 2.2 * s, 9 * s, { mat: 'bor_cementerio', tono: 0.1 })); ps.push(a.caja(x, y, z + 5.5 * s, 6 * s, 2 * s, 2 * s, { mat: 'bor_cementerio', tono: 0.1 })); }
}

registrar({
  id: 'bor_risco', nombre: ['Risco de borde', 'Border crag'], tema: 'comun',
  variantes: ESTILOS.flatMap((e) => TALLAS.map((t) => `${e}_${t}`)), huella: [2, 2], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    const e = ESTILOS.find((x) => v.startsWith(x + '_'))!, talla = v.slice(e.length + 1), mat = ROCA[e];
    // cada variante sale distinta: se adelanta el azar según su nombre
    for (let i = (talla.charCodeAt(talla.length - 1) - 96) * 13 + ESTILOS.indexOf(e) * 5 + (talla.startsWith('alta') ? 3 : talla.startsWith('media') ? 7 : 0); i > 0; i--) a.r();
    if (!talla.startsWith('baja')) {
      const alta = talla.startsWith('alta');
      // el desierto y el cielo son más anchos y bajos (mesetas y bloques); la nieve y el infierno, más agudos
      const k = e === 'desierto' || e === 'celestial' ? 0.8 : e === 'infierno' || e === 'nieve' ? 1.15 : 1;
      const alto = (alta ? 96 + a.r() * 46 : 50 + a.r() * 22) * k, g = a.r() * PI;
      const cimas = farallon(a, ps, g, 20 + a.r() * 8, alto, 17 / Math.sqrt(k), mat);
      cimas.push(...farallon(a, ps, g + PI / 2 + (a.r() - 0.5) * 0.8, 14, alto * (0.5 + a.r() * 0.3), 15, mat));
      for (const c of cimas) if (a.r() < 0.7) remate(a, ps, e, c, 1);
      for (let i = 0; i < 5; i++) { const t = a.r() * 2 * PI, d = 19 + a.r() * 10, r = 6 + a.r() * 7; ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, r * 0.4, r, r * 0.85, r * 0.9, mat, undefined, (a.r() - 0.5) * 0.1, 14)); if (a.r() < 0.35) remate(a, ps, e, [Math.cos(t) * d, Math.sin(t) * d, r * 0.95], 0.6); }
    } else {
      const n = 3 + Math.floor(a.r() * 3);
      for (let i = 0; i < n; i++) { const t = a.r() * 2 * PI, d = a.r() * 17, r = 9 + a.r() * 8, h = r * (0.8 + a.r() * 0.5); ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d * 0.9, h * 0.42, r, r * 0.85, h, mat, undefined, (a.r() - 0.5) * 0.1, 16)); if (a.r() < 0.45) remate(a, ps, e, [Math.cos(t) * d, Math.sin(t) * d * 0.9, h * 1.05], 0.7); }
    }
    ps.push(suelo(a));
    return ps;
  },
});
