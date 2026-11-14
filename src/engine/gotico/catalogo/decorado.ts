import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';

// Decorado propio de cada mundo: ruinas (muro roto, arco partido, columnas truncas, pila de sillares), plantas y hitos
// (piedra tallada con runa encendida, estatua rota en su plinto). Ocho estilos, los mismos de los riscos de borde
// (bordes.ts), y usan su piedra: cada mundo queda con una familia entera que combina.

const M = (rampa: string[], ruido = 0.4, escala = 0.3, extra: Record<string, unknown> = {}) => ({ rampa, ruido, escala, ...extra });
MATERIALES.dec_rama = M(['#120d09', '#211811', '#33251a', '#463424', '#5a4430']);
MATERIALES.dec_rama_quemada = M(['#050404', '#0d0a09', '#17120f', '#221a16']);
MATERIALES.dec_brezo = M(['#241426', '#3a2040', '#53305b', '#6e4478', '#8a5c94']);
MATERIALES.dec_hoja_seca = M(['#2a2412', '#40381c', '#584e28', '#716636', '#8a7e48']);
MATERIALES.dec_hoja = M(['#0c1f0e', '#143316', '#1f4a20', '#2d632c', '#3f7e3a', '#57994c']);
MATERIALES.dec_cactus = M(['#16301c', '#214628', '#2e5e36', '#3e7846', '#52925a'], 0.3, 0.5);
MATERIALES.dec_flor = M(['#7a1830', '#a82a44', '#d4485e', '#f07a86']);
MATERIALES.dec_alga = M(['#0a2620', '#113a30', '#1a5244', '#266c5a', '#368872']);
MATERIALES.dec_coral = M(['#5a1c22', '#86303a', '#b24a52', '#d87474', '#f0a39a']);
MATERIALES.dec_tallo_blanco = M(['#8a8478', '#a8a296', '#c4beb2', '#dcd7cc', '#f0ece4']);
MATERIALES.dec_espina = M(['#08060a', '#120e14', '#1e1820', '#2c242e']);
MATERIALES.dec_brasa = { rampa: ['#7a1806', '#c8400a', '#ff7a18', '#ffc050', '#fff0b0'], ruido: 0.5, escala: 0.3, emite: true };
MATERIALES.dec_runa_fria = { rampa: ['#1a4a78', '#2a7cb8', '#52b0e0', '#a0dcf4', '#e6f8ff'], ruido: 0.3, escala: 0.3, emite: true };
MATERIALES.dec_runa_verde = { rampa: ['#0e4a2a', '#1a7a44', '#34a866', '#78d898', '#d0f8dc'], ruido: 0.3, escala: 0.3, emite: true };
MATERIALES.dec_runa_oro = { rampa: ['#7a5208', '#b8860e', '#e8b828', '#ffe070', '#fff8d0'], ruido: 0.3, escala: 0.3, emite: true };

const PI = Math.PI;
const ESTILOS = ['paramo', 'cementerio', 'desierto', 'nieve', 'selva', 'infierno', 'ahogada', 'celestial'] as const;
type Estilo = (typeof ESTILOS)[number];
const ROCA: Record<Estilo, string> = { paramo: 'bor_paramo', cementerio: 'bor_cementerio', desierto: 'bor_desierto', nieve: 'bor_nieve_roca', selva: 'bor_selva', infierno: 'bor_infierno', ahogada: 'bor_ahogada', celestial: 'bor_celestial' };
const RUNA: Record<Estilo, string> = { paramo: 'dec_runa_verde', cementerio: 'dec_runa_fria', desierto: 'dec_runa_oro', nieve: 'dec_runa_fria', selva: 'dec_runa_verde', infierno: 'dec_brasa', ahogada: 'dec_runa_fria', celestial: 'dec_runa_oro' };
const suelo = (a: Arma) => a.caja(0, 0, -80, 900, 900, 80, { mat: 'roca', resta: true });
const estiloDe = (v: string) => ESTILOS.find((x) => v.startsWith(x + '_'))!;
const adelantar = (a: Arma, v: string) => { let n = 0; for (const c of v) n += c.charCodeAt(0); for (let i = n % 37; i > 0; i--) a.r(); };

/** Lo que el mundo le pone encima a la piedra: musgo, nieve, lianas, brasa, percebes u oro. */
function capa(a: Arma, ps: Pieza[], e: Estilo, x: number, y: number, z: number, w: number) {
  if (a.r() > 0.6) return;
  if (e === 'paramo' || e === 'selva') ps.push(a.elipsoide(x, y, z, w * 0.55, w * 0.5, 1.6, { mat: e === 'selva' ? 'bor_liana' : 'bor_musgo', giro: a.r() * 180 }));
  else if (e === 'nieve') ps.push(a.elipsoide(x, y, z + 0.6, w * 0.6, w * 0.55, 2.4, { mat: 'bor_nieve', giro: a.r() * 180 }));
  else if (e === 'infierno') ps.push(a.caja(x, y, z - 0.5, w * 0.7, 1.2, 1.4, { mat: 'dec_brasa', giro: a.r() * 180 }));
  else if (e === 'ahogada') for (let k = 0; k < 3; k++) ps.push(a.elipsoide(x + (a.r() - 0.5) * w, y + (a.r() - 0.5) * w, z, 1.4, 1.4, 1.3, { mat: 'bor_percebe' }));
  else if (e === 'celestial') ps.push(a.caja(x, y, z, w * 0.9, w * 0.9, 1.4, { mat: 'bor_oro', giro: a.r() * 20 }));
  else if (e === 'desierto') ps.push(a.elipsoide(x, y, z, w * 0.6, w * 0.5, 1.1, { mat: 'bor_desierto', tono: 0.16, giro: a.r() * 180 }));
}
/** Un sillar: caja de piedra un poco girada y de tono propio. */
const sillar = (a: Arma, x: number, y: number, z: number, w: number, d: number, h: number, mat: string, giro = 0) => a.caja(x + (a.r() - 0.5) * 0.8, y + (a.r() - 0.5) * 0.8, z, w, d, h, { mat, giro: giro + (a.r() - 0.5) * 6, tono: (a.r() - 0.5) * 0.12 });
/** Columna de tambores, entera hasta `alto` (el último tambor queda partido en sesgo). */
function columna(a: Arma, ps: Pieza[], e: Estilo, x: number, y: number, alto: number, r: number) {
  const mat = ROCA[e];
  ps.push(a.caja(x, y, 0, r * 2.9, r * 2.9, 3, { mat, tono: -0.05 }));
  let z = 3; while (z < alto) { const h = Math.min(alto - z, 9 + a.r() * 5); ps.push(a.cilindro(x + (a.r() - 0.5) * 0.7, y + (a.r() - 0.5) * 0.7, z, r, h, { mat, tono: (a.r() - 0.5) * 0.1, r1: r * 0.96 })); z += h; }
  capa(a, ps, e, x, y, z, r * 2);
}

registrar(
  {
    id: 'dec_ruina', nombre: ['Ruina', 'Ruin'], tema: 'comun',
    variantes: ESTILOS.flatMap((e) => ['muro', 'arco', 'columnas', 'pila'].map((t) => `${e}_${t}`)), huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], e = estiloDe(v), t = v.slice(e.length + 1), mat = ROCA[e];
      adelantar(a, v);
      if (t === 'muro') {
        // paño de muro que se viene abajo en escalera, con los sillares caídos al pie
        const n = 6;
        for (let i = 0; i < n; i++) { const filas = Math.max(1, Math.round((1 - Math.abs(i - 1.5) / n) * 6 + (a.r() - 0.5) * 2)); for (let f = 0; f < filas; f++) ps.push(sillar(a, -20 + i * 8 + (f % 2 ? 2 : 0), 0, f * 6, 8, 7, 6, mat)); capa(a, ps, e, -20 + i * 8, 0, filas * 6, 7); }
        for (let i = 0; i < 5; i++) ps.push(sillar(a, -18 + a.r() * 40, 8 + a.r() * 9, 0, 7, 6, 4 + a.r() * 2, mat, a.r() * 90));
      } else if (t === 'arco') {
        // dos pilares y medio dintel: el otro medio está en el piso
        for (const l of [-1, 1]) { for (let f = 0; f < (l < 0 ? 8 : 6); f++) ps.push(sillar(a, l * 14, 0, f * 6, 9, 8, 6, mat)); capa(a, ps, e, l * 14, 0, (l < 0 ? 8 : 6) * 6, 8); }
        for (let i = 0; i < 4; i++) { const g = (i / 6) * PI; ps.push(sillar(a, -14 + (1 - Math.cos(g)) * 14, 0, 48 + Math.sin(g) * 12, 8, 8, 6, mat, 0)); }
        for (let i = 0; i < 3; i++) ps.push(sillar(a, 4 + i * 8, 10 + a.r() * 6, 0, 8, 7, 5, mat, 20 + a.r() * 60));
      } else if (t === 'columnas') {
        columna(a, ps, e, -15, -3, 46 + a.r() * 14, 5); columna(a, ps, e, 4, 2, 20 + a.r() * 10, 5);
        // y una tumbada, en tres tambores que rodaron
        for (let i = 0; i < 3; i++) ps.push(a.cilindro(10 + i * 9 + a.r() * 2, 12 + (a.r() - 0.5) * 3, 5, 5, 8, { mat, tono: (a.r() - 0.5) * 0.1, eje: [1, 0.15 * (a.r() - 0.5), 0] as V3 }));
      } else {
        for (let i = 0; i < 9; i++) { const g = a.r() * 2 * PI, d = a.r() * 14; ps.push(sillar(a, Math.cos(g) * d, Math.sin(g) * d * 0.8, i < 4 ? 0 : i < 7 ? 5 : 10, 7 + a.r() * 3, 6 + a.r() * 2, 5 + a.r() * 2, mat, a.r() * 90)); }
        capa(a, ps, e, 0, 0, 15, 9); capa(a, ps, e, 8, 4, 6, 6);
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'dec_hito', nombre: ['Hito', 'Landmark'], tema: 'comun',
    variantes: ESTILOS.flatMap((e) => ['runa', 'estatua'].map((t) => `${e}_${t}`)), huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], e = estiloDe(v), t = v.slice(e.length + 1), mat = ROCA[e];
      adelantar(a, v);
      if (t === 'runa') {
        // piedra parada, ancha abajo y vencida hacia un lado, con una runa que arde en su cara
        const h = 46 + a.r() * 16, inc = (a.r() - 0.5) * 8;
        const pts: V3[] = []; for (const [f, w] of [[0, 9], [0.45, 7.5], [0.85, 5], [1, 2.6]] as [number, number][]) for (const [sx, sy] of [[-1, -0.55], [1, -0.55], [1, 0.55], [-1, 0.55]]) pts.push([sx * w + inc * f + (a.r() - 0.5) * 1.5, sy * w * 0.9 + (a.r() - 0.5), h * f]);
        ps.push(a.poliedro(pts, { mat }));
        for (const [dx, dz, w2, h2] of [[0, 0.62, 1.4, 12], [-2.6, 0.5, 4, 1.4], [2.4, 0.74, 3.4, 1.4], [0, 0.34, 5, 1.4]] as number[][]) ps.push(a.caja(dx + inc * dz, 5.6, h * dz - h2 / 2, w2, 1.2, h2, { mat: RUNA[e] }));
        for (let i = 0; i < 4; i++) { const g = a.r() * 2 * PI; ps.push(a.elipsoide(Math.cos(g) * 12, Math.sin(g) * 10, 1.5, 4 + a.r() * 3, 3.5, 3, { mat, giro: a.r() * 180 })); }
        capa(a, ps, e, inc, 0, h, 5);
      } else {
        // plinto y lo que queda de una figura: las piernas, medio torso y la cabeza en el suelo
        ps.push(a.caja(0, 0, 0, 20, 20, 5, { mat, tono: -0.06 })); ps.push(a.caja(0, 0, 5, 15, 15, 9, { mat }));
        for (const l of [-1, 1]) ps.push(a.cilindro(l * 3.4, 0, 14, 2.9, 17, { mat, r1: 3.4 }));
        ps.push(a.elipsoide(0.8, 0, 37, 7, 5, 8.5, { mat, incl: 9 })); ps.push(a.palo([6, 0, 40], [12, 4, 30], 2.1, { mat, r1: 1.6 }));
        ps.push(a.elipsoide(15, 11, 4, 4.4, 4, 4.6, { mat, tono: 0.05 }));
        ps.push(a.caja(0, 7.7, 8, 9, 1, 2.4, { mat: RUNA[e] }));
        capa(a, ps, e, 0, 0, 45, 8); capa(a, ps, e, -8, 6, 14, 5);
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'dec_planta', nombre: ['Planta', 'Plant'], tema: 'comun',
    variantes: ESTILOS.flatMap((e) => ['a', 'b', 'c', 'd'].map((t) => `${e}_${t}`)), huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], e = estiloDe(v), t = v.slice(e.length + 1), par = t === 'a' || t === 'c';
      adelantar(a, v);
      /** Mata de ramas que se abren desde el pie; en las puntas, lo que diga `punta`. */
      const ramas = (n: number, alto: number, mat: string, punta?: (p: V3) => void, grosor = 1) => {
        for (let i = 0; i < n; i++) {
          const g = (i / n) * 2 * PI + a.r(), ab = 0.25 + a.r() * 0.5; let p: V3 = [Math.cos(g) * 1.5, Math.sin(g) * 1.5, 0];
          for (let k = 0; k < 3; k++) { const q: V3 = [p[0] + Math.cos(g + (a.r() - 0.5)) * alto * ab * 0.45, p[1] + Math.sin(g + (a.r() - 0.5)) * alto * ab * 0.45, p[2] + alto * (0.3 + a.r() * 0.12)]; ps.push(a.palo(p, q, Math.max(0.35, grosor * (1 - k * 0.3)), { mat, r1: Math.max(0.25, grosor * (0.7 - k * 0.3)) })); p = q; if (punta && k > 0) punta(q); }
        }
      };
      const bola = (mat: string, r: number) => (p: V3) => { ps.push(a.elipsoide(p[0], p[1], p[2], r * (0.8 + a.r() * 0.5), r * (0.8 + a.r() * 0.4), r * 0.8, { mat, giro: a.r() * 180, tono: (a.r() - 0.5) * 0.14 })); };
      if (e === 'paramo') par ? ramas(7, 11, 'dec_rama', bola('dec_brezo', 2.6)) : ramas(6, 16, 'dec_rama', bola('dec_hoja_seca', 2.2), 1.1);
      else if (e === 'cementerio') par ? ramas(8, 14, 'dec_espina', undefined, 0.9) : ramas(5, 12, 'dec_rama', bola('dec_flor', 1.3), 0.8);
      else if (e === 'desierto') {
        if (par) { const h = 20 + a.r() * 10; ps.push(a.cilindro(0, 0, 0, 3.2, h, { mat: 'dec_cactus', r1: 2.8 })); ps.push(a.esfera(0, 0, h, 2.8, { mat: 'dec_cactus' })); for (const l of [-1, 1]) if (a.r() < 0.8) { const z = h * (0.35 + a.r() * 0.2); ps.push(a.palo([0, 0, z], [l * 6, 0, z + 1], 1.8, { mat: 'dec_cactus' })); ps.push(a.palo([l * 6, 0, z + 1], [l * 6.4, 0, z + 9 + a.r() * 5], 1.8, { mat: 'dec_cactus', r1: 1.5 })); } bola('dec_flor', 1.2)([0, 0, h + 2.6]); }
        else ramas(7, 10, 'dec_rama', bola('dec_hoja_seca', 1.5), 0.7);
      } else if (e === 'nieve') {
        if (par) { const h = 24 + a.r() * 12; ps.push(a.cilindro(0, 0, 0, 1.5, h * 0.3, { mat: 'dec_rama' })); for (let k = 0; k < 4; k++) { const z = h * (0.2 + k * 0.19), r = 9 - k * 2; ps.push(a.cilindro(0, 0, z, r, h * 0.26, { mat: 'dec_hoja', r1: 0.6, tono: -0.1 })); ps.push(a.elipsoide(0.6, 0.6, z + 1.5, r * 0.8, r * 0.75, 1.3, { mat: 'bor_nieve' })); } }
        else ramas(6, 12, 'dec_rama', bola('bor_nieve', 2.1), 0.9);
      } else if (e === 'selva') {
        if (par) for (let i = 0; i < 7; i++) { const g = (i / 7) * 2 * PI + a.r() * 0.5, L = 11 + a.r() * 7; let p: V3 = [0, 0, 1]; for (let k = 1; k <= 4; k++) { const f = k / 4, q: V3 = [Math.cos(g) * L * f, Math.sin(g) * L * f, 1 + Math.sin(f * PI * 0.8) * L * 0.75]; ps.push(a.palo(p, q, 0.6, { mat: 'dec_hoja' })); ps.push(a.elipsoide(q[0], q[1], q[2], 3.2 * (1.1 - f * 0.5), 1.6, 0.7, { mat: 'dec_hoja', giro: (g * 180) / PI, tono: (a.r() - 0.5) * 0.14 })); p = q; } }
        else { for (let i = 0; i < 5; i++) { const g = (i / 5) * 2 * PI + a.r(), L = 8 + a.r() * 5; ps.push(a.elipsoide(Math.cos(g) * L * 0.55, Math.sin(g) * L * 0.55, 5 + a.r() * 4, L * 0.62, L * 0.34, 1, { mat: 'dec_hoja', giro: (g * 180) / PI, incl: 24, tono: (a.r() - 0.5) * 0.16 })); } ps.push(a.palo([0, 0, 0], [0.5, 0.5, 15], 0.8, { mat: 'dec_hoja' })); bola('dec_flor', 2.3)([0.5, 0.5, 16]); }
      } else if (e === 'infierno') {
        if (par) ramas(8, 15, 'dec_espina', undefined, 1.1);
        else { const h = 24 + a.r() * 10; ps.push(a.palo([0, 0, 0], [1.5, 0.5, h], 2.4, { mat: 'dec_rama_quemada', r1: 1 })); for (let i = 0; i < 4; i++) { const z = h * (0.45 + a.r() * 0.45), g = a.r() * 2 * PI, q: V3 = [Math.cos(g) * 8, Math.sin(g) * 8, z + 5 + a.r() * 6]; ps.push(a.palo([1, 0.3, z], q, 0.9, { mat: 'dec_rama_quemada', r1: 0.3 })); if (a.r() < 0.6) ps.push(a.esfera(q[0], q[1], q[2], 0.9, { mat: 'dec_brasa' })); } }
      } else if (e === 'ahogada') {
        if (par) for (let i = 0; i < 6; i++) { let p: V3 = [(a.r() - 0.5) * 6, (a.r() - 0.5) * 6, 0]; for (let k = 0; k < 4; k++) { const q: V3 = [p[0] + Math.sin(k * 1.7 + i) * 2.4, p[1] + Math.cos(k * 1.3 + i) * 1.6, p[2] + 4.5 + a.r() * 2]; ps.push(a.palo(p, q, 0.9 - k * 0.15, { mat: 'dec_alga' })); p = q; } }
        else ramas(6, 13, 'dec_coral', bola('dec_coral', 1.3), 1.4);
      } else par ? ramas(6, 14, 'dec_tallo_blanco', bola('bor_oro', 1.7), 0.8) : ramas(5, 10, 'dec_tallo_blanco', bola('dec_runa_oro', 1), 0.7);
      ps.push(suelo(a));
      return ps;
    },
  },
);
