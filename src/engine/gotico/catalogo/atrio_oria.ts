import { registrar, conVarianteY, type Arma, type Pieza, type V3 } from '../objeto';
import { G, raiz, bajoTierra, bloque, cascotes, musgo, rr, GR } from '../kit_muerte';
import { pinaculo, gargola, maleza, charco } from './abadia_oria';

/**
 * El atrio de Santa Oria: las piezas que enmarcan la catedral en el camposanto y la amarran al terreno.
 *
 *   abo_atrio_lajas    (plano, 5×5)  una baldosa de la plaza de losas frente a la puerta: entera, rota, con charco, o
 *                                    abriéndose hacia un lado (las losas se hunden, se inclinan y faltan hasta que queda
 *                                    el pasto del camposanto). Se arma la plaza con varias, una por baldosa.
 *   abo_sendero_lajas  (plano, 5×2)  losas sueltas que siguen un sendero (y su variante a lo largo de y).
 *   abo_andamio_ruina  (3×2)         lo que quedó de la obra: andamio en pie, caído o la cabria con su polea.
 *   abo_derrumbe       (3×3)         lo que se cayó de la catedral: un pináculo, tracería, sillares o una gárgola.
 *
 * Los ids esquivan a propósito las palabras con que el juego y los paisajes riegan el camposanto (losa, lapida, muro,
 * farol, cruz, urna, tumba, pila, verja...): estas piezas se ponen a mano alrededor del ancla, no al azar.
 * Usan la misma piedra mojada, el mismo barro y la misma maleza que el zócalo de la catedral (abadia_oria.ts).
 */

const T = 'cementerio' as const;
const TAU = Math.PI * 2;
const SG = 'abo_sillar_grueso', L = 'abo_labra';

function obj(id: string, nombre: [string, string], variantes: string[], huella: [number, number], bloquea: boolean, armar: (v: string, g: G, a: Arma) => void, extra: { plano?: boolean } = {}) {
  registrar({ id, nombre, tema: T, variantes, huella, bloquea, ...extra, armar: (v, _f, a) => { const { ps, g } = raiz(a); armar(v, g, a); bajoTierra(ps); return ps as Pieza[]; } });
}
/** Gasta azar según la variante: dos variantes iguales con otra letra salen distintas (el juego hornea con una sola semilla). */
const barajar = (a: Arma, v: string) => { const k = v.charCodeAt(v.length - 1) % 7; for (let i = 0; i < k * 11; i++) a.r(); };

// ------------------------------------------------------------------ losas del atrio
/** Hacia dónde se abre cada variante (el lado que se rompe y se pierde en el pasto). */
const RUMBO: Record<string, [number, number] | null> = {
  centro_a: null, centro_b: null, centro_c: null, roto: null, charco: null,
  borde_y: [0, 1], borde_x: [1, 0], borde_mx: [-1, 0], esquina_x: [Math.SQRT1_2, Math.SQRT1_2], esquina_mx: [-Math.SQRT1_2, Math.SQRT1_2],
};
/**
 * Una baldosa (80×80) de losas en hiladas de alto desparejo: cada losa con su bisel gastado, alguna partida, hundida o
 * que falta (queda el barro o el pasto), charcos en los bajos y maleza en las juntas. Plana: el juego la pinta debajo
 * de todo y el héroe camina encima.
 */
function lajas(g: G, v: string) {
  const a = g.a, rumbo = RUMBO[v] ?? null, B = 39.5;
  barajar(a, v);
  const falta0 = v === 'roto' ? 0.3 : 0.05;
  const poza: [number, number, number, number] | null = v === 'charco' ? [rr(a, -10, 10), rr(a, -10, 10), 15 + a.r() * 6, 9 + a.r() * 4] : null;
  // barro de fondo en manchas (no una sola: el piso del camposanto se ve entre losas que faltan)
  for (let i = 0; i < 7; i++) g.elip(rr(a, -30, 30), rr(a, -30, 30), -0.4, 10 + a.r() * 9, 8 + a.r() * 7, 0.6, { mat: a.r() < 0.6 ? 'abo_barro' : 'mu_tierra', giro: a.r() * 180, tono: (a.r() - 0.5) * 0.1 });
  for (let y = -B; y < B - 2;) {
    const alto = Math.min(B - y, 9 + a.r() * 6);
    for (let x = -B + (a.r() - 0.5) * 4; x < B - 2;) {
      const ancho = Math.min(B - x, 10 + a.r() * 9), cx = x + ancho / 2, cy = y + alto / 2;
      x += ancho;
      if (Math.abs(cx) > B - 2 || Math.abs(cy) > B - 2) continue;
      // t: 0 del lado entero, 1 en el borde que se pierde
      const t = rumbo ? Math.max(0, Math.min(1, ((cx * rumbo[0] + cy * rumbo[1]) / B + 0.15) / 1.15)) : 0;
      const enPoza = poza && ((cx - poza[0]) / poza[2]) ** 2 + ((cy - poza[1]) / poza[3]) ** 2 < 1;
      if (enPoza) continue;
      if (a.r() < falta0 + t * t * 0.95) {
        const q = a.r();
        if (q < 0.14) charco(g, cx, cy, ancho * 0.35, alto * 0.3, a.r() * 40);
        else if (q < 0.75) maleza(g, 1 + Math.floor(a.r() * 2), cx - 3, cx + 3, cy - 3, cy + 3);
        else cascotes(g, 2, ancho * 0.25, alto * 0.25, 'abo_losa', cx, cy, 1.6);
        continue;
      }
      const k = 1 - t * 0.3 * a.r();
      bloque(g, cx + (a.r() - 0.5) * (0.5 + t * 3), cy + (a.r() - 0.5) * (0.5 + t * 3), -0.9 - t * 0.7 - (v === 'roto' ? a.r() * 0.4 : 0), (ancho - 0.7) * k, (alto - 0.7) * k, 1.3 + a.r() * 0.3, {
        mat: 'abo_losa', b: 0.6 + a.r() * 0.3, j: 0.6 + t * 0.8, giro: (a.r() - 0.5) * (1.5 + t * 16), incl: (a.r() - 0.5) * (1.5 + t * 12) * (v === 'roto' ? 2 : 1), inclEje: a.r() < 0.5 ? 'x' : 'y',
        tono: (a.r() - 0.5) * 0.14 - t * 0.05,
      });
      // grieta (un surco cavado a lo largo), musgo en el borde y maleza en las juntas
      if (a.r() < 0.16) { const an = a.r() * Math.PI; g.palo([cx - Math.cos(an) * ancho * 0.4, cy - Math.sin(an) * alto * 0.4, 0.55], [cx + Math.cos(an) * ancho * 0.4, cy + Math.sin(an) * alto * 0.4, 0.55], 0.35, { mat: 'abo_losa', resta: true }); }
      if (a.r() < 0.18) g.elip(x - 0.3, cy + rr(a, -alto * 0.3, alto * 0.3), 0.3, 1.2 + a.r(), 2 + a.r() * 2, 0.6, { mat: 'abo_musgo' });
      if (a.r() < 0.1 + t * 0.2) maleza(g, 1, x, x, cy - alto / 2, cy - alto / 2);
    }
    y += alto;
  }
  if (poza) { charco(g, poza[0], poza[1], poza[2], poza[3], rr(a, -20, 20)); for (let i = 0; i < 5; i++) { const t = a.r() * TAU; bloque(g, poza[0] + Math.cos(t) * poza[2] * 1.05, poza[1] + Math.sin(t) * poza[3] * 1.05, -1.2, 6 + a.r() * 4, 5 + a.r() * 3, 1.3, { mat: 'abo_losa', giro: t / GR, incl: 8 + a.r() * 8, b: 0.6, j: 1 }); } }
}
obj('abo_atrio_lajas', ['Atrio de Santa Oria: losas', 'Saint Oria forecourt: flagstones'], Object.keys(RUMBO), [5, 5], false, (v, g) => lajas(g, v), { plano: true });

// ------------------------------------------------------------------ sendero de losas sueltas
obj('abo_sendero_lajas', ['Sendero de losas sueltas', 'Path of loose flagstones'], ['x', 'x_roto'], [5, 2], false, (v, g, a) => {
  const roto = v === 'x_roto';
  for (let i = 0; i < 4; i++) g.elip(rr(a, -32, 32), rr(a, -6, 6), -0.4, 8 + a.r() * 8, 4 + a.r() * 3, 0.6, { mat: a.r() < 0.5 ? 'abo_barro' : 'mu_tierra', giro: (a.r() - 0.5) * 30 });
  for (let x = -38; x < 36;) {
    const w = 8 + a.r() * 7, cx = x + w / 2, d = (a.r() - 0.5) * 7;
    x += w + 1.5 + a.r() * 4;
    if (roto && a.r() < 0.35) { if (a.r() < 0.5) charco(g, cx, d, 3 + a.r() * 2, 2, a.r() * 50); else maleza(g, 2, cx - 3, cx + 3, d - 3, d + 3); continue; }
    bloque(g, cx, d, -0.9 - (roto ? a.r() * 0.6 : 0), w, 8 + a.r() * 5, 1.4, { mat: 'abo_losa', b: 0.7, j: 0.9, giro: (a.r() - 0.5) * 24, incl: (a.r() - 0.5) * (roto ? 16 : 5), tono: (a.r() - 0.5) * 0.12 });
    if (a.r() < 0.5) maleza(g, 1, cx + w / 2, cx + w / 2 + 2, d - 4, d + 4);
  }
}, { plano: true });
conVarianteY('abo_sendero_lajas');

// ------------------------------------------------------------------ andamio de la obra, abandonado
/** Poste de madera vieja con su amarre de cuerda en cada travesaño. */
function poste(g: G, p: V3, q: V3, r = 1.1) { g.palo(p, q, r, { mat: 'abo_madera', r1: r * 0.85 }); }
function amarre(g: G, p: V3) { g.cil(p[0], p[1], p[2] - 1.2, 1.5, 2.4, { mat: 'cuerda', tono: -0.15 }); }
function tablon(g: G, x: number, y: number, z: number, w: number, d: number, o: { giro?: number; incl?: number } = {}) {
  g.caja(x, y, z, w, d, 1.2, { mat: 'abo_madera', giro: o.giro, incl: o.incl, tono: (g.a.r() - 0.5) * 0.12 });
}
obj('abo_andamio_ruina', ['Andamio abandonado de la obra', 'Abandoned building scaffold'], ['en_pie', 'caido', 'cabria'], [3, 2], true, (v, g, a) => {
  for (let i = 0; i < 3; i++) g.elip(rr(a, -18, 18), rr(a, -10, 10), -0.4, 10 + a.r() * 6, 6 + a.r() * 4, 0.6, { mat: 'abo_barro', giro: a.r() * 180 });
  if (v === 'en_pie') {
    const X = 18, Y = 9, H = 66;
    const pies: [number, number][] = [[-X, -Y], [X, -Y], [-X, Y], [X, Y]];
    for (const [x, y] of pies) { const tx = x + (a.r() - 0.5) * 2, ty = y + (a.r() - 0.5) * 2; poste(g, [x, y, -1], [tx, ty, H + a.r() * 6]); bloque(g, x, y, -0.8, 5, 5, 3, { mat: SG, b: 0.7, j: 0.6 }); }
    for (const z of [30, 58]) {
      for (const s of [-1, 1]) { poste(g, [-X, s * Y, z], [X, s * Y, z + (a.r() - 0.5) * 2], 0.8); amarre(g, [-X, s * Y, z]); amarre(g, [X, s * Y, z]); }
      for (const s of [-1, 1]) poste(g, [s * X, -Y, z], [s * X, Y, z], 0.8);
    }
    // cruces de San Andrés en el lado que se ve y la plataforma de tablones (le falta uno)
    poste(g, [-X, Y + 0.5, 2], [X, Y + 0.5, 30], 0.7); poste(g, [-X, Y + 0.5, 30], [X, Y + 0.5, 58], 0.7);
    for (let i = 0; i < 5; i++) if (i !== 3) tablon(g, -X + 4 + i * 7.6, 0, 31, 7, 2 * Y + 3, { incl: (a.r() - 0.5) * 3 });
    tablon(g, X + 6, Y + 6, 0.2, 7, 22, { giro: 30, incl: 12 });
    // escalera apoyada y el balde que cuelga de una soga
    const e0: V3 = [X + 10, Y + 4, -0.5], e1: V3 = [X + 1, Y - 2, 40];
    for (const s of [-1.6, 1.6]) poste(g, [e0[0], e0[1] + s, e0[2]], [e1[0], e1[1] + s, e1[2]], 0.55);
    for (let i = 1; i < 8; i++) { const t = i / 8; g.palo([e0[0] + (e1[0] - e0[0]) * t, e0[1] - 1.6, e0[2] + (e1[2] - e0[2]) * t], [e0[0] + (e1[0] - e0[0]) * t, e0[1] + 1.6, e0[2] + (e1[2] - e0[2]) * t], 0.4, { mat: 'abo_madera' }); }
    g.palo([-6, Y + 1, 58], [-6, Y + 1, 40], 0.25, { mat: 'cuerda' });
    g.cil(-6, Y + 1, 35, 2.6, 5, { mat: 'abo_madera', r1: 3, tono: -0.1 }); g.cil(-6, Y + 1, 39.4, 2.8, 0.6, { mat: 'mu_hierro' });
    // sillares apilados para subir, que nunca subieron
    for (let i = 0; i < 4; i++) bloque(g, -6 + (i % 2) * 11, -2, (i >> 1) * 6 - 0.5, 10, 7, 6, { mat: SG, b: 1, j: 0.8, giro: (a.r() - 0.5) * 8, tono: (a.r() - 0.5) * 0.08 });
  } else if (v === 'caido') {
    // dos postes en pie y torcidos, el resto en el piso con los tablones y lo que se rompió
    poste(g, [-18, -9, -1], [-14, -11, 58]); poste(g, [-18, 9, -1], [-10, 10, 50]);
    poste(g, [-14, -11, 28], [-12, 10, 26], 0.8); amarre(g, [-14, -11, 28]);
    for (let i = 0; i < 3; i++) { const an = rr(a, -40, 40) * GR, x = rr(a, -12, 14), y = rr(a, -8, 8); poste(g, [x - Math.cos(an) * 26, y - Math.sin(an) * 26, 1.2], [x + Math.cos(an) * 26, y + Math.sin(an) * 26, 1 + a.r() * 2], 1); }
    poste(g, [4, -6, 0.5], [22, 4, 26], 0.9);
    for (let i = 0; i < 5; i++) tablon(g, rr(a, -14, 18), rr(a, -10, 10), 0.4 + a.r() * 2, 7, 18 + a.r() * 6, { giro: a.r() * 180, incl: (a.r() - 0.5) * 20 });
    cascotes(g, 10, 14, 9, SG, 4, 0, 3);
    for (let i = 0; i < 3; i++) bloque(g, rr(a, -14, 18), rr(a, -10, 10), -0.6, 10, 7, 6, { mat: SG, giro: a.r() * 90, incl: rr(a, -20, 20), b: 1, j: 1 });
    g.palo([-14, -11, 54], [-6, 2, 1], 0.25, { mat: 'cuerda' });
  } else {
    // cabria: dos patas en A y una de atrás, la rueda de la polea arriba, la soga con un sillar colgando y el torno
    const top: V3 = [0, 2, 74];
    poste(g, [-16, 8, -1], top, 1.3); poste(g, [16, 8, -1], top, 1.3); poste(g, [0, -14, -1], [0, 1, 72], 1.2);
    poste(g, [-11, 7, 22], [11, 7, 22], 0.8); amarre(g, [-11, 7, 22]); amarre(g, [11, 7, 22]);
    g.cil(0, 4.6, 70, 4.4, 1.6, { mat: 'abo_madera', eje: [0, 1, 0], tono: 0.05 }); g.cil(0, 5.2, 70, 1, 2.6, { mat: 'mu_hierro', eje: [0, 1, 0] });
    g.palo([4.2, 5.4, 70], [4.2, 5.4, 26], 0.3, { mat: 'cuerda' }); g.palo([-4.2, 5.4, 70], [-3, -10, 8], 0.3, { mat: 'cuerda' });
    // el torno con su manivela
    for (const s of [-1, 1]) bloque(g, s * 5, -10, -0.5, 2.4, 5, 9, { mat: 'abo_madera', b: 0.4, j: 0.4 });
    g.cil(-5, -10, 7, 2.2, 10, { mat: 'abo_madera', eje: [1, 0, 0] }); g.palo([6, -10, 7], [7.5, -10, 2], 0.5, { mat: 'mu_hierro' });
    // el sillar que quedó colgando con sus garras de hierro, y otro que cayó y partió una losa
    bloque(g, 4.2, 5.4, 16, 10, 7, 7, { mat: SG, b: 1, j: 0.6, giro: 12 }); g.palo([4.2, 5.4, 26], [1, 5.4, 22], 0.4, { mat: 'mu_hierro' }); g.palo([4.2, 5.4, 26], [7.4, 5.4, 22], 0.4, { mat: 'mu_hierro' });
    bloque(g, -14, 12, -1.5, 11, 8, 6, { mat: SG, incl: 18, giro: 40, b: 1, j: 1.2 }); cascotes(g, 6, 6, 4, 'abo_losa', -12, 14, 2.2);
  }
  maleza(g, 8, -22, 22, -12, 12);
});

// ------------------------------------------------------------------ lo que se cayó de la catedral
obj('abo_derrumbe', ['Derrumbe de la catedral', 'Cathedral rubble'], ['pinaculo', 'traceria', 'sillares', 'gargola'], [3, 3], true, (v, g, a) => {
  for (let i = 0; i < 4; i++) g.elip(rr(a, -18, 18), rr(a, -18, 18), -0.4, 9 + a.r() * 8, 7 + a.r() * 6, 0.6, { mat: a.r() < 0.6 ? 'abo_barro' : 'mu_tierra', giro: a.r() * 180 });
  if (v === 'pinaculo') {
    // el pináculo cayó de punta, se partió en dos y se clavó
    const p = g.sub(-6, -2, 4.5, 25 + a.r() * 20, 84, 'y'); pinaculo(p, 0, 0, -22, 8, 30, SG);
    const q = g.sub(14, 8, 3, -30, 70, 'x'); pinaculo(q, 0, 0, -6, 7, 18, SG);
    cascotes(g, 12, 16, 12, SG, 2, 2, 3);
  } else if (v === 'traceria') {
    // medio ventanal: el arco de la tracería con sus parteluces, tirado y apoyado en un sillar, con vidrio muerto
    const s = g.sub(0, 0, 2, a.r() * 60, -72, 'x');
    const R = 14, pts: V3[] = [];
    for (let i = 0; i <= 8; i++) { const t = (i / 8) * Math.PI; pts.push([Math.cos(t) * R, 0, Math.sin(t) * R * 1.3]); }
    for (let i = 0; i < 8; i++) s.palo(pts[i], pts[i + 1], 1.4, { mat: L });
    for (const x of [-R, -R / 3, R / 3, R]) s.palo([x, 0, 0], [x, 0, x === -R || x === R ? 0 : Math.sqrt(1 - (x / R) ** 2) * R * 1.3], 1, { mat: L, tono: 0.04 });
    for (let i = 0; i < 6; i++) { const t = a.r() * Math.PI, r = a.r() * R * 0.8; s.caja(Math.cos(t) * r, 0, Math.sin(t) * r * 1.2, 3 + a.r() * 2, 0.4, 2 + a.r() * 2, { mat: 'abo_vidrio_muerto', giro: a.r() * 40 }); }
    bloque(g, 10, -6, -0.6, 10, 7, 6, { mat: SG, giro: 30, b: 1, j: 0.8 });
    for (let i = 0; i < 10; i++) g.caja(rr(a, -18, 18), rr(a, -16, 16), 0.2, 1.2 + a.r() * 2, 0.8 + a.r(), 0.3, { mat: a.r() < 0.6 ? 'abo_vidrio_muerto' : 'mu_hierro', giro: a.r() * 180 });
    cascotes(g, 8, 14, 12, L, 0, 4, 2.2);
  } else if (v === 'sillares') {
    for (let i = 0; i < 9; i++) bloque(g, rr(a, -14, 14), rr(a, -14, 14), -0.8 + (i > 5 ? 5 : 0), 10 + a.r() * 5, 7 + a.r() * 2, 5.5 + a.r() * 1.5, { mat: SG, giro: a.r() * 180, incl: rr(a, -22, 22), b: 1.1, j: 1.3, tono: (a.r() - 0.5) * 0.1 });
    cascotes(g, 14, 18, 16, SG, 0, 0, 2.8);
    musgo(g.sub(0, 8, 0), 4, -10, 10, 0, 1, 6, 'abo_musgo');
  } else {
    gargola(g.sub(-2, 0, 5, 200 + a.r() * 40, -24, 'x'), 1.15);
    for (let i = 0; i < 4; i++) bloque(g, rr(a, -14, 14), rr(a, -14, 14), -0.8, 9 + a.r() * 4, 7, 5.5, { mat: SG, giro: a.r() * 180, incl: rr(a, -18, 18), b: 1, j: 1.2 });
    cascotes(g, 10, 16, 14, SG, 0, 0, 2.6);
  }
  maleza(g, 9, -20, 20, -20, 20);
});

// ------------------------------------------------------------------ cómo se arma alrededor del ancla
/**
 * Lo que enmarca la catedral en el camposanto, en celdas desde la pieza de la nave (como `CATEDRAL` en
 * abadia_oria.ts): [id, variante, dx, dy]. Los planos (losas, sendero, niebla) se pintan debajo de todo; lo demás
 * queda fuera de la huella de la catedral (13×22, de dx -6..6 y dy -13..9) y fuera del eje de la puerta (dx -2..2),
 * por donde se llega. `reservar` es la caja (dx0, dy0, dx1, dy1) que no se riega al azar (la plaza y su entrada) y
 * `tierra` la de las baldosas de piso que van de tierra pisada (la huella con un anillo de una baldosa alrededor).
 */
export const ATRIO_CATEDRAL = {
  marco: [
    // la plaza: seis baldosas de losas frente a la puerta, enteras al centro, abriéndose hacia los lados y hacia afuera
    ['abo_atrio_lajas', 'borde_mx', -5, 12], ['abo_atrio_lajas', 'centro_a', 0, 12], ['abo_atrio_lajas', 'borde_x', 5, 12],
    ['abo_atrio_lajas', 'esquina_mx', -5, 17], ['abo_atrio_lajas', 'charco', 0, 17], ['abo_atrio_lajas', 'esquina_x', 5, 17],
    ['abo_sendero_lajas', 'x_roto_y', 0, 23],
    // lo que se cayó y la obra abandonada, al pie de los muros que se ven
    ['abo_derrumbe', 'pinaculo', 9, 9], ['abo_derrumbe', 'sillares', -9, 10], ['abo_andamio_ruina', 'en_pie', 9, 1],
    ['abo_derrumbe', 'gargola', 9, -6], ['abo_andamio_ruina', 'cabria', 9, -12], ['abo_derrumbe', 'traceria', -8, 22],
    // lápidas inclinadas, árboles en garra y los faroles que marcan la entrada de la plaza
    ['abo_lapidas', 'hundidas', -11, 14], ['abo_lapidas', 'rotas', 11, 16], ['abo_lapidas', 'grupo', -12, 20], ['abo_lapidas', 'hilera', 12, 21],
    ['abo_arbol_muerto', 'garra', -13, 7], ['abo_arbol_muerto', 'con_cuervos', 14, 11],
    ['abo_farol_rojo', 'poste', -4, 21], ['abo_farol_rojo', 'poste', 4, 21],
    // la verja del camposanto, rota, con la entrada en el eje
    ['abo_muro_camposanto', 'x_roto', -10, 25], ['abo_muro_camposanto', 'x_vencido', 10, 25],
    // niebla baja que se arrastra al pie de la obra
    ['abo_niebla', 'baja', 9, 6], ['abo_niebla', 'jirones', -9, 4], ['abo_niebla', 'remanso', 0, 20], ['abo_niebla', 'jirones', 10, -6],
  ] as [string, string, number, number][],
  reservar: [-8, 9, 8, 26] as [number, number, number, number],
  tierra: [-10, -15, 10, 10] as [number, number, number, number],
} as const;
