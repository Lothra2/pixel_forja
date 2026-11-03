import { MATERIALES } from '../materiales';
import { aPantalla, type Comp, type V3 } from '../render';
import { createRaster, type Raster } from '../../core/raster';
import { G, bloque, vela, llama, cadena, cuervo, calavera, huesoLargo, costillar, cascotes, rr, onda, type Op } from '../kit_muerte';
import { reg, cuerpo, juntas, POSES, Mancha, ManchaPared, SUP, PALETAS, GIBS, type Pose } from './gore';

/**
 * Horror para ambientar (para un jugador adulto): lo que deja el enemigo a su paso y lo que se mueve en lo oscuro.
 * Todo es original, de masa orgánica, con sombra propia y en el piso; lo que brilla (velas, brasas, la sangre que
 * hierve, las runas, los ojos) declara su luz en `LUCES_HORROR` (el juego la usa para iluminar y tirar sombras) y
 * tiñe el render con su resplandor.
 *
 * Ambientación (tema `misterio`, bloquean salvo lo que va en el piso):
 *   hor_empalado          uno, tres (con brasero), viejo (seco, con un cuervo)
 *   hor_jaula             jaula colgante que se mece (8 cuadros): cadaver, momia, antorcha
 *   hor_colgados          cuerpos colgados de cadenas: munecas, pies (cabeza abajo), ganchos
 *   hor_pila_cadaveres    chica, grande, quemada (con brasas)
 *   hor_altar             altar de sacrificio con canaletas de sangre y velas (4 cuadros): x, y
 *   hor_mesa_tortura      vacia, con_cuerpo, brasero (4 cuadros)
 *   hor_pared_carne       pared de carne que late (8 cuadros): x, der
 *   hor_nido_huesos       chico, grande (con huevos)
 *   hor_crucificado       cruz invertida con su cuerpo y velas (4 cuadros): madera, hierro
 *   hor_cabezas_picas     una, tres, cerco
 *   hor_cuervos_cadaver   cadáver que comen los cuervos (8 cuadros): suelo, horca
 *   hor_foso_sangre       foso de sangre que hierve, con luz roja tenue (8 cuadros): piedra, carne
 *   hor_escritura_sangre  escritura de sangre en el piso con runas que laten (8 cuadros): circulo, palabras, sello
 * Miedo:
 *   hor_ojos              pares de ojos que brillan y parpadean (12 cuadros): rojo, ambar, muchos, enorme
 *   hor_sombra            sombra que pasa (12 cuadros): cruza, asoma
 *   hor_manos             manos que salen del piso (10 cuadros): una, muchas, esqueleto
 *   hor_susurro           humo que susurra (12 cuadros): humo, rostros
 *   veloSangre(nivel)     el velo rojo de la pantalla con poca vida (nivel 1, 2 y 3), PNG de pantalla entera
 */

const M = MATERIALES;
const TAU = Math.PI * 2;
const r2 = (a: { r: () => number }, k = 1) => (a.r() - 0.5) * 2 * k;
const add3 = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mid = (a: V3, b: V3, t = 0.5): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ================================================================== materiales
M.hor_ojo_blanco = { rampa: ['#2a2620', '#4a443a', '#6e6656', '#928874', '#b2a890', '#cac2aa'], ruido: 0.1, escala: 1, brillo: 0.8 };
M.hor_ojo_rojo = { rampa: ['#3a0202', '#6a0604', '#a00e06', '#d01c0a', '#f03a14', '#ff7448', '#ffc0a0'], ruido: 0.4, escala: 0.8, emite: true };
M.hor_ojo_ambar = { rampa: ['#5a3004', '#9a5a08', '#d49018', '#f8c040', '#ffe890', '#fff8d8'], ruido: 0.25, escala: 0.8, emite: true };
M.hor_sombra = { rampa: ['#010102', '#030304', '#050507', '#08080b', '#0b0b0f', '#0e0e13'], ruido: 0.3, escala: 0.5, emite: true };
M.hor_humo = { rampa: ['#07080a', '#0c0e11', '#121519', '#191d22', '#21262c', '#2b3138', '#373e46', '#454d56'], ruido: 0.6, escala: 0.12, emite: true };
M.hor_espectro = { rampa: ['#1a1c20', '#2a2d33', '#3d4148', '#53585f', '#6b7078', '#858a91', '#a0a5ab'], ruido: 0.35, escala: 0.5, emite: true };
M.hor_huevo = { rampa: ['#191510', '#2b241b', '#3f3527', '#544735', '#6a5a44', '#7f6d54'], ruido: 0.2, escala: 0.9, brillo: 0.7, patron: (p) => (Math.sin(p[0] * 2.1 + Math.sin(p[2] * 1.7) * 2) > 0.85 ? -0.18 : 0) };
M.hor_cuerda = { rampa: ['#120e09', '#211a11', '#32281a', '#443724', '#56462f'], ruido: 0.4, escala: 1.4, patron: (p) => (Math.sin((p[0] + p[1] + p[2]) * 3) > 0.4 ? -0.1 : 0.04) };

// ================================================================== luces
export type Ritmo = 'vela' | 'brasa' | 'latido' | 'ojos' | 'fijo';
/**
 * Luz de un asset para el juego: color, radio en px de pantalla, intensidad (0..1), parpadeo (0 quieta a 1 muy
 * inquieta) con su ritmo, y dónde está: `centro` en unidades del mundo desde el ancla, `pantalla` el mismo punto en
 * px desde el ancla del sprite. `r` es el radio del resplandor con que se tiñe el render previo.
 */
export interface LuzHorror { id: string; variantes: string[]; color: string; radio: number; intensidad: number; parpadeo: number; ritmo: Ritmo; centro: V3; pantalla: [number, number]; r: number }
const luzDe = (id: string, variantes: string[], color: string, radio: number, intensidad: number, parpadeo: number, ritmo: Ritmo, centro: V3, r: number): LuzHorror => {
  const [x, y] = aPantalla(centro);
  return { id, variantes, color, radio, intensidad, parpadeo, ritmo, centro, pantalla: [Math.round(x), Math.round(y)], r };
};
const VELA = '#ffb35a', BRASA = '#ff7a2a', SANGRE = '#c8281c';
/** Todas las luces del kit de horror (y de nada más: lo que no está acá no brilla). */
export const LUCES_HORROR: LuzHorror[] = [
  luzDe('hor_empalado', ['tres'], BRASA, 150, 0.8, 0.45, 'brasa', [0, 16, 12], 40),
  luzDe('hor_jaula', ['antorcha'], '#ff9a3a', 170, 0.85, 0.5, 'vela', [-11, 0, 84], 40),
  luzDe('hor_pila_cadaveres', ['quemada'], BRASA, 130, 0.6, 0.55, 'brasa', [0, 0, 8], 34),
  luzDe('hor_altar', ['x', 'y'], VELA, 160, 0.75, 0.3, 'vela', [0, 0, 22], 32),
  luzDe('hor_mesa_tortura', ['brasero'], BRASA, 150, 0.8, 0.45, 'brasa', [-6, 20, 22], 36),
  luzDe('hor_crucificado', ['madera', 'hierro'], VELA, 140, 0.7, 0.3, 'vela', [0, 8, 10], 36),
  luzDe('hor_foso_sangre', ['piedra', 'carne'], SANGRE, 130, 0.45, 0.2, 'latido', [0, 0, 6], 34),
  luzDe('hor_escritura_sangre', ['circulo', 'palabras', 'sello'], '#d8382a', 120, 0.35, 0.18, 'latido', [0, 0, 2], 36),
  luzDe('hor_ojos', ['rojo', 'muchos', 'enorme'], '#ff3a1a', 60, 0.4, 0.9, 'ojos', [0, 0, 34], 14),
  luzDe('hor_ojos', ['ambar'], '#ffb020', 60, 0.4, 0.9, 'ojos', [0, 0, 34], 14),
];
/** El resplandor del render previo de un asset (con un factor que lo hace latir). */
function resplandor(id: string, v: string, k = 1) {
  const l = LUCES_HORROR.find((x) => x.id === id && x.variantes.includes(v));
  return l ? { c: l.centro, r: l.r * k, color: l.color } : undefined;
}
/** Tiritar de una llama o una brasa en el cuadro `f` de `n`. */
const tirita = (f: number, n: number, fase = 0) => 1 + 0.08 * onda(f, n, fase) + 0.04 * onda(f * 2, n, fase * 1.7);

// ================================================================== piezas comunes
/** Brasero de hierro en trípode con brasas y llamas. */
function brasero(g: G, x: number, y: number, f: number, n: number, hierros = false) {
  const a = g.a;
  for (let i = 0; i < 3; i++) { const t = (i / 3) * TAU + 0.4; g.palo([x + Math.cos(t) * 5.5, y + Math.sin(t) * 5.5, 0], [x + Math.cos(t) * 2.5, y + Math.sin(t) * 2.5, 12], 0.6, { mat: 'mu_hierro' }); }
  g.cil(x, y, 11, 3, 4, { mat: 'mu_hierro', r1: 6 });
  g.cil(x, y, 14.6, 5.6, 0.8, { mat: 'mu_oxido', r1: 6.2 });
  for (let i = 0; i < 9; i++) g.elip(x + r2(a, 3.5), y + r2(a, 3.5), 15 + a.r(), 1.6 + a.r(), 1.4 + a.r(), 1.1, { mat: 'mu_brasa', tono: 0.1 * onda(f, n, i) });
  for (let i = 0; i < 3; i++) llama(g, x + r2(a, 2), y + r2(a, 2), 15.5, 1.6 + a.r(), 7 + a.r() * 4, f, n, i);
  if (hierros) for (let i = 0; i < 3; i++) { const t = a.r() * TAU; g.palo([x + Math.cos(t) * 1.5, y + Math.sin(t) * 1.5, 15.5], [x + Math.cos(t) * 14, y + Math.sin(t) * 14, 21 + a.r() * 4], 0.45, { mat: 'mu_hierro' }); }
}
/** Charco en el piso (con el grupo del piso). */
function charco(g: G, x: number, y: number, R: number, sup: keyof typeof SUP = 'piedra', z = 0) {
  const m = new Mancha(g.sub(x, y, z), SUP[sup]);
  m.charco(0, 0, R, g.a, 0.7, 8, 4); m.cerrar(1.4);
}
/** Hilo de sangre que baja por un palo (de `p` a `q`), del lado que mira a la cámara. */
function sangrePorPalo(g: G, p: V3, q: V3, r: number) {
  const a = g.a, cs: Comp[] = [];
  for (let k = 0; k < 3; k++) {
    const lado: V3 = [0.7 + r2(a, 0.3), 0.7 + r2(a, 0.3), 0], o = r + 0.15, largo = 0.4 + a.r() * 0.6;
    let prev = add3(p, lado, o);
    for (let i = 1; i <= 8; i++) { const t = (i / 8) * largo, c = add3(add3(mid(p, q, t), lado, o), [r2(a, 0.2), r2(a, 0.2), 0]); cs.push(g.hu(prev, c, 0.5, 0.4)); prev = c; }
    cs.push(g.bu(prev, [0.6, 0.6, 0.8]));
  }
  g.masa(cs, { mat: 'gore_sangre', suave: 0.5 });
}
/** Estaca de madera con la punta ensangrentada. */
function estaca(g: G, base: V3, punta: V3, r = 1.7) {
  g.palo(base, punta, r, { mat: 'mu_madera', r1: r * 0.55 });
  const d: V3 = [punta[0] - base[0], punta[1] - base[1], punta[2] - base[2]], L = Math.hypot(...d);
  g.palo(punta, add3(punta, d, 4 / L), r * 0.55, { mat: 'gore_sangre_oscura', r1: 0.1 });
}
/** Grupo de un cuerpo acostado boca arriba (cabeza hacia -x del grupo); `abajo` es el piso en sus coordenadas. */
const acostado = (g: G, x: number, y: number, z: number, giro: number, k = 1) => g.sub(x, y, z + 4.2 * k, giro, 90, 'y').esc(k);
const ABAJO_ACOSTADO: V3 = [-1, 0, 0];
const ACURRUCADO: Pose = { brazos: [[60, 75, 25], [25, 20, 80]], piernas: [[110, 14, 130], [95, 20, 115]], columna: 30, cabeza: [45, 25] };
/** Altura de las manos (o los tobillos) de una pose, para colgarla de una cadena. */
const zManos = (p: Pose) => { const J = juntas(p); return (J.manos[0][2] + J.manos[1][2]) / 2; };

// ================================================================== empalados
function empalado(g: G, x: number, y: number, viejo: boolean) {
  const a = g.a, s = g.sub(x, y, 0, rr(a, -50, 50));
  estaca(s, [0, 0, -2], [-2.5 + r2(a, 1), r2(a, 1.5), 70 + a.r() * 6]);
  const pose: Pose = { ...POSES.colgando, columna: -10 + r2(a, 6), cabeza: [-35 + r2(a, 15), r2(a, 30)], brazos: [[10 + a.r() * 20, 15, 20], [5, 10 + a.r() * 20, 30]] };
  cuerpo(s.sub(1.2, 0, 8, 0, -6), pose, { piel: viejo ? 'gore_piel_momia' : undefined, flaco: viejo ? 0.72 : 0.9, heridas: viejo ? 0 : 4, trapo: viejo ? null : 'gore_trapo' });
  if (!viejo) { sangrePorPalo(s, [0.4, 0, 38], [0, 0, 0], 1.7); charco(s, 3, 3, 7 + a.r() * 3); }
  else charco(s, 2, 2, 5, 'piedra');
  if (viejo) cuervo(s.sub(-1, 0, 62, 20), 'posado', 0, 8, 0.9);
}
reg({
  id: 'hor_empalado', nombre: ['Empalados', 'Impaled bodies'], variantes: ['uno', 'tres', 'viejo'], huella: [2, 2], bloquea: true, cuadros: 4, t: 3,
  armar: (v, f, g, a) => {
    if (v === 'tres') {
      for (const [x, y] of [[-20, -10], [4, -22], [18, 6]] as [number, number][]) empalado(g, x + r2(a, 2), y + r2(a, 2), false);
      brasero(g, 0, 16, f, 4);
      return { piezas: g.ps, resplandor: resplandor('hor_empalado', v, tirita(f, 4)) };
    }
    empalado(g, 0, 0, v === 'viejo');
  },
});

// ================================================================== jaula colgante
function jaula(g: G, f: number, v: string) {
  const a = g.a, P: V3 = [6, 0, 92], R = 10, alto = 40;
  // horca: poste, brazo, puntal
  g.palo([-14, 0, -2], [-14, 0, 100], 2, { mat: 'mu_madera' });
  g.palo([-16, 0, 94], [10, 0, 94], 1.6, { mat: 'mu_madera' });
  g.palo([-14, 0, 76], [-2, 0, 93], 1.1, { mat: 'mu_madera', tono: -0.05 });
  for (const s of [-1, 1]) g.palo([-14, s * 9, 0], [-14, 0, 14], 1, { mat: 'mu_madera', tono: -0.08 });
  if (v === 'antorcha') {
    g.palo([-12.5, 0, 78], [-10.5, 0, 82], 0.8, { mat: 'mu_hierro' });
    g.cil(-10.5, 0, 81, 1.4, 4, { mat: 'mu_madera_quemada', r1: 1.8 });
    llama(g, -10.5, 0, 84.5, 2, 7, f, 8, 1);
  }
  // la jaula se mece del gancho
  const ang = 5 * onda(f, 8), j = g.sub(P[0], P[1], P[2], 0, ang);
  cadena(j, [0, 0, 0], [0, 0, -10], 0, 'mu_hierro', 0.8);
  const z0 = -10 - alto, n = 10;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, x = Math.cos(t) * R, y = Math.sin(t) * R;
    j.palo([x, y, z0], [x, y, -16], 0.45, { mat: 'mu_hierro', tono: (i % 2) * 0.05 });
    j.palo([x, y, -16], [0, 0, -10.5], 0.45, { mat: 'mu_hierro' });
  }
  for (const z of [z0, z0 + alto * 0.5, -16]) for (let i = 0; i < n; i++) { const t0 = (i / n) * TAU, t1 = ((i + 1) / n) * TAU; j.palo([Math.cos(t0) * R, Math.sin(t0) * R, z], [Math.cos(t1) * R, Math.sin(t1) * R, z], 0.55, { mat: 'mu_oxido' }); }
  j.cil(0, 0, z0 - 0.8, R + 0.3, 1, { mat: 'mu_hierro' });
  // el que quedó adentro, sentado con un brazo afuera de los barrotes
  const momia = v === 'momia';
  cuerpo(j.sub(0, 0, z0 - 26.5 * 0.85).esc(0.85), ACURRUCADO, { piel: momia ? 'gore_piel_momia' : undefined, flaco: momia ? 0.7 : 0.85, heridas: momia ? 0 : 3, trapo: momia ? 'mu_venda' : 'gore_trapo' });
  // goteo y el charco del piso
  if (!momia) { for (let i = 0; i < 3; i++) { const x = r2(a, 4), y = r2(a, 4); j.palo([x, y, z0 - 1], [x, y, z0 - 3 - a.r() * 4], 0.35, { mat: 'gore_sangre', r1: 0.2 }); } charco(g, P[0] + 1, 2, 8); }
  else charco(g, P[0], 1, 4, 'tierra');
}
reg({
  id: 'hor_jaula', nombre: ['Jaula colgante', 'Hanging cage'], variantes: ['cadaver', 'momia', 'antorcha'], huella: [2, 2], bloquea: true, cuadros: 8, t: 4,
  armar: (v, f, g) => { jaula(g, f, v); return { piezas: g.ps, resplandor: resplandor('hor_jaula', v, tirita(f, 8)) }; },
});

// ================================================================== colgados de cadenas
reg({
  id: 'hor_colgados', nombre: ['Colgados de cadenas', 'Bodies hung from chains'], variantes: ['munecas', 'pies', 'ganchos'], huella: [2, 4], bloquea: true,
  armar: (v, _f, g, a) => {
    // el marco: dos postes y el travesaño a lo largo de y
    for (const y of [-26, 26]) { bloque(g, 0, y, -0.5, 6, 6, 2.5, { mat: 'mu_piedra', b: 0.8 }); g.caja(0, y, 2, 3.4, 3.4, 96, { mat: 'mu_madera' }); }
    g.caja(0, 0, 96, 3.6, 60, 3.6, { mat: 'mu_madera', tono: 0.04 });
    for (const s of [-1, 1]) g.palo([0, s * 26, 80], [0, s * 16, 96], 1, { mat: 'mu_madera', tono: -0.05 });
    for (const y of [-12, 12]) {
      const yy = y + r2(a, 2), gi = r2(a, 25);
      if (v === 'munecas') {
        const p: Pose = { ...POSES.munecas, cabeza: [40 + r2(a, 15), r2(a, 25)] }, zt = 88 - zManos(p);
        const J = cuerpo(g.sub(0, yy, zt, gi), p, { heridas: 4 });
        const m = mid(J.manos[0], J.manos[1]);
        cadena(g, [0, yy, 95], [m[0], yy + m[1], zt + m[2] + 1], 0, 'mu_hierro', 0.8);
        g.elip(m[0], yy + m[1], zt + m[2], 1.2, 2.4, 1, { mat: 'mu_oxido' });
        charco(g, 2, yy + 2, 6);
      } else if (v === 'pies') {
        const p: Pose = { brazos: [[165 + r2(a, 10), 20, 15], [160, 25 + r2(a, 10), 20]], piernas: [[0, 6, 4], [8, 3, 25]], columna: 4, cabeza: [-20, r2(a, 20)] };
        const J = cuerpo(g.sub(0, yy, 90, gi, 180), p, { abajo: [0, 0, 1], heridas: 5, abierto: a.r() < 0.6 });
        const t = mid(J.tobillos[0], J.tobillos[1]);
        cadena(g, [0, yy, 95], [t[0], yy - t[1], 90 - t[2] + 1.5], 0, 'mu_hierro', 0.8);
        // la sangre que cae de la cabeza
        const zc = 90 - J.cabeza[2];
        for (let i = 0; i < 3; i++) { const x = J.cabeza[0] + r2(a, 1.5), yc = yy - J.cabeza[1] + r2(a, 1.5); g.palo([x, yc, zc - 3], [x, yc, Math.max(1, zc - 6 - a.r() * 6)], 0.3, { mat: 'gore_sangre' }); }
        charco(g, J.cabeza[0], yy - J.cabeza[1], 9);
      } else {
        // en ganchos de carnicero, clavados por la espalda
        const p: Pose = { ...POSES.colgando, columna: 20, cabeza: [50, r2(a, 25)] }, J = juntas(p), zt = 84 - J.pecho[2];
        cuerpo(g.sub(0, yy, zt, gi), p, { heridas: 5, abierto: a.r() < 0.5 });
        const gx = J.pecho[0] - 4.5, gz = zt + J.pecho[2] + 2;
        cadena(g, [0, yy, 95], [gx, yy, gz + 6], 0, 'mu_hierro', 0.8);
        for (let i = 0; i < 6; i++) { const t0 = (i / 6) * Math.PI * 1.1, t1 = ((i + 1) / 6) * Math.PI * 1.1; g.palo([gx + Math.sin(t0) * 3, yy, gz + 6 - (1 - Math.cos(t0)) * 3], [gx + Math.sin(t1) * 3, yy, gz + 6 - (1 - Math.cos(t1)) * 3], 0.5, { mat: 'mu_hierro' }); }
        charco(g, 3, yy + 2, 8);
      }
      if (v === 'munecas' && y > 0) break;
    }
  },
});

// ================================================================== pila de cadáveres
reg({
  id: 'hor_pila_cadaveres', nombre: ['Pila de cadáveres', 'Corpse pile'], variantes: ['chica', 'grande', 'quemada'], huella: [4, 4], bloquea: true, cuadros: 4, t: 3,
  armar: (v, f, g, a) => {
    const n = v === 'chica' ? 3 : 6, quemada = v === 'quemada';
    for (let i = 0; i < n; i++) {
      const capa = Math.floor(i / 3), x = r2(a, 10 - capa * 3), y = r2(a, 10 - capa * 3), giro = a.r() * 360, boca = a.r() < 0.35;
      // brazos tirados a lo largo del cuerpo o por encima de la cabeza, abiertos sobre la pila (no apuntando al cielo)
      const brazo = (): [number, number, number] => [a.r() < 0.6 ? a.r() * 35 : 140 + a.r() * 40, 15 + a.r() * 65, a.r() * 60];
      const p: Pose = { brazos: [brazo(), brazo()], piernas: [[a.r() * 30, a.r() * 25, a.r() * 60], [a.r() * 30, a.r() * 25, a.r() * 60]], columna: r2(a, 15), cabeza: [r2(a, 40), r2(a, 40)] };
      const s = boca ? g.sub(x, y, capa * 6.5 + 4, giro, -90, 'y') : acostado(g, x, y, capa * 6.5, giro);
      cuerpo(s, p, { piel: quemada ? 'gore_piel_quemada' : a.r() < 0.4 ? 'gore_piel_muerta' : undefined, abajo: boca ? [1, 0, 0] : ABAJO_ACOSTADO, heridas: quemada ? 0 : 3, trapo: quemada ? null : a.r() < 0.5 ? 'gore_trapo' : 'mu_venda', abierto: !quemada && a.r() < 0.3, flaco: 0.85 + a.r() * 0.2 });
    }
    if (quemada) {
      for (let i = 0; i < 14; i++) g.elip(r2(a, 22), r2(a, 20), 0.5, 1.4 + a.r() * 1.6, 1.2 + a.r() * 1.2, 0.9, { mat: a.r() < 0.6 ? 'mu_brasa' : 'mu_madera_quemada', tono: 0.12 * onda(f, 4, i), giro: a.r() * 180 });
      for (let i = 0; i < 4; i++) llama(g, r2(a, 14), r2(a, 12), 6 + a.r() * 6, 1.4, 5 + a.r() * 3, f, 4, i);
      cascotes(g, 8, 24, 22, 'mu_madera_quemada', 0, 0, 2);
      return { piezas: g.ps, resplandor: resplandor('hor_pila_cadaveres', v, tirita(f, 4)) };
    }
    charco(g, 4, 6, n * 2.6 + 6);
    // los miembros sueltos que quedaron alrededor
    const pz = PALETAS.rojo;
    // miembros arrancados de verdad (los pedazos del kit, tirados en el piso) y un trozo de carne
    const sueltos = [GIBS.brazo[0], GIBS.pierna[0], GIBS.trozo[0]];
    for (let i = 0; i < 3; i++) { const t = a.r() * TAU, d = 20 + a.r() * 6, k = i === 2 ? 0.8 : 0.62; sueltos[i](g.sub(Math.cos(t) * d, Math.sin(t) * d, 1.8 * k + 0.6, a.r() * 360).esc(k), pz, a); }
  },
});

// ================================================================== altar de sacrificio
reg({
  id: 'hor_altar', nombre: ['Altar de sacrificio', 'Sacrificial altar'], variantes: ['x', 'y'], huella: [4, 3], bloquea: true, cuadros: 4, t: 3,
  armar: (v, f, g0, a) => {
    const g = v === 'y' ? g0.sub(0, 0, 0, 90) : g0, L = 44, A = 20, H = 14;
    bloque(g, 0, 0, -0.5, L + 10, A + 10, 3, { mat: 'mu_bloques', b: 1 });
    bloque(g, 0, 0, 2.5, L, A, H - 2.5, { mat: 'mu_granito', b: 1.4, j: 0.6 });
    bloque(g, 0, 0, H - 1, L + 3, A + 3, 3.5, { mat: 'mu_granito', b: 1, tono: 0.06 });
    const zt = H + 2.5;
    // canaletas talladas que bajan a las esquinas, llenas de sangre
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.palo([0, 0, zt + 0.4], [sx * (L / 2 + 0.5), sy * (A / 2 + 0.5), zt + 0.4], 0.9, { mat: 'mu_granito', resta: true });
    const top = new Mancha(g.sub(0, 0, zt - 0.6), SUP.piedra);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (let t = 0.1; t < 1; t += 0.07) top.gota(sx * (L / 2) * t, sy * (A / 2) * t, 1.6, 0.8, Math.atan2(sy * A, sx * L), 0.75);
    top.charco(4, 0, 9, a, 0.7, 8, 3); top.cerrar(0.9);
    // el sacrificio: acostado, abierto, con la cabeza colgando del borde
    const p: Pose = { brazos: [[-45, 62, 15], [-55, 66, 20]], piernas: [[8, 10, 6], [6, 8, 10]], columna: 0, cabeza: [-60, 15] };
    cuerpo(acostado(g, 30, r2(a, 1), zt, 0, 0.82), p, { abajo: ABAJO_ACOSTADO, abierto: true, heridas: 4, trapo: 'tela_roja' });
    // chorreado por las caras que se ven y los charcos del pie
    for (const [x, y, gi] of [[0, A / 2 + 1.5, 0], [L / 2 + 1.5, 0, -90]] as [number, number, number][]) {
      const m = new ManchaPared(g.sub(x, y, 2.5, gi), 'gore_sangre', gi ? 0.16 : 0.06);
      for (let i = 0; i < 6; i++) { const u = r2(a, gi ? A / 2 - 2 : L / 2 - 2); m.chorro(u, H + 1, 1 + a.r() * 6, 0.5 + a.r() * 0.5, a); }
      m.cerrar(0.9);
    }
    charco(g, L / 2 + 4, A / 2 + 4, 7); charco(g, -L / 2 - 8, 2, 8);
    // velas alrededor, en el piso y en las esquinas
    for (let i = 0; i < 8; i++) { const t = (i / 8) * TAU + 0.3, x = Math.cos(t) * (L / 2 + 12), y = Math.sin(t) * (A / 2 + 11); vela(g, x, y, 0, 4 + a.r() * 8, 1.2 + a.r() * 0.6, f, 4, i); }
    for (const sx of [-1, 1]) vela(g, sx * (L / 2 - 2), -A / 2 + 2, zt, 3 + a.r() * 3, 1.1, f, 4, sx + 3);
    const r = resplandor('hor_altar', v, tirita(f, 4))!;
    return { piezas: g0.ps, resplandor: v === 'y' ? { ...r, c: [-r.c[1], r.c[0], r.c[2]] as V3 } : r };
  },
});

// ================================================================== mesa de tortura
reg({
  id: 'hor_mesa_tortura', nombre: ['Mesa de tortura', 'Torture table'], variantes: ['vacia', 'con_cuerpo', 'brasero'], huella: [4, 3], bloquea: true, cuadros: 4, t: 3,
  armar: (v, f, g, a) => {
    const L = 46, A = 18, H = 16, mad: Op = { mat: 'mu_madera' };
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.caja(sx * (L / 2 - 3), sy * (A / 2 - 2), 0, 3, 3, H, { ...mad, tono: -0.05 });
    for (const sy of [-1, 1]) g.caja(0, sy * (A / 2 - 2), 4, L - 4, 1.6, 2, { ...mad, tono: -0.08 });
    for (let i = 0; i < 4; i++) g.caja(0, -A / 2 + 2.25 + i * 4.5, H, L, 4.3, 2.6, { mat: 'mu_madera', tono: r2(a, 0.06) });
    // el torno del potro: rueda con rayos y la manija
    const wx = -L / 2 - 2;
    g.cil(wx, 0, H + 3, 0.9, A + 4, { mat: 'mu_madera', eje: [0, 1, 0] });
    for (const s of [-1, 1]) {
      const yy = s * (A / 2 + 1.5);
      g.cil(wx, yy - 0.6, H + 3, 5, 1.2, { mat: 'mu_madera', tono: -0.04, eje: [0, 1, 0] });
      for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI + 0.3; g.palo([wx + Math.cos(t) * 7, yy, H + 3 + Math.sin(t) * 7], [wx - Math.cos(t) * 7, yy, H + 3 - Math.sin(t) * 7], 0.6, { mat: 'mu_madera' }); }
    }
    // correas de cuero y grilletes
    for (const x of [-14, 0, 14]) g.caja(x, 0, H + 2.6, 2.4, A + 0.6, 0.5, { mat: 'cuero' });
    for (const s of [-1, 1]) { g.palo([wx, s * 3, H + 3], [-L / 2 + 6, s * 4, H + 3.4], 0.4, { mat: 'hor_cuerda' }); g.palo([L / 2 - 2, s * 4, H + 3], [L / 2 + 2, s * 4, H + 0.5], 0.4, { mat: 'mu_hierro' }); }
    const zt = H + 2.6;
    if (v === 'con_cuerpo') {
      const p: Pose = { brazos: [[175, 12, 0], [175, 14, 0]], piernas: [[2, 7, 0], [2, 7, 0]], columna: 0, cabeza: [-10, 25] };
      cuerpo(acostado(g, 25, 0, zt, 0, 0.78), p, { abajo: ABAJO_ACOSTADO, abierto: true, heridas: 6, trapo: 'gore_trapo', flaco: 0.85 });
    } else {
      // herramientas sobre la mesa: serrucho, tenazas, ganchos, un cuchillo
      const s = g.sub(6, -3, zt, 20);
      s.caja(0, 0, 0, 14, 4, 0.5, { mat: 'acero' });
      for (let i = 0; i < 9; i++) s.poli([[-6.5 + i * 1.5, -2, 0], [-5.3 + i * 1.5, -2, 0], [-5.9 + i * 1.5, -2.9, 0.25]], { mat: 'acero' });
      s.caja(8.5, 0.5, 0, 4, 2.6, 1.6, { mat: 'mu_madera', tono: 0.06 });
      const t = g.sub(-10, 4, zt + 0.5, -30);
      t.palo([-5, -1, 0], [4, 1, 0.3], 0.45, { mat: 'mu_hierro' }); t.palo([-5, 1, 0.3], [4, -1, 0], 0.45, { mat: 'mu_hierro' }); t.esf(0, 0, 0.2, 0.8, { mat: 'mu_hierro' });
      const k = g.sub(14, 5, zt, 70);
      k.poli([[0, -0.9, 0], [0, 0.9, 0], [9, 0, 0], [0, -0.9, 0.4], [0, 0.9, 0.4]], { mat: 'acero' }); k.caja(-2.5, 0, 0, 5, 1.6, 1.4, { mat: 'mu_madera' });
      const top = new Mancha(g.sub(0, 0, zt - 0.3), SUP.madera);
      top.charco(-4, 2, 8, a, 0.6, 7, 6); top.charco(10, -2, 4, a, 0.5, 6, 3); top.cerrar(1.2);
    }
    // goteo por el canto y el balde de abajo
    const m = new ManchaPared(g.sub(0, A / 2, H - 0.5, 0), 'gore_sangre', 0.06);
    for (let i = 0; i < 7; i++) m.chorro(r2(a, L / 2 - 4), 3, -1 - a.r() * 4, 0.45 + a.r() * 0.4, a);
    m.cerrar(0.8);
    g.cil(8, 4, 0, 4, 7, { mat: 'mu_madera', r1: 4.6 }); g.cil(8, 4, 6.6, 4.1, 0.6, { mat: 'gore_sangre' });
    for (const z of [1.5, 5.5]) g.cil(8, 4, z, 4.3, 0.7, { mat: 'mu_hierro', r1: 4.5 });
    charco(g, -6, A / 2 + 3, 7, 'madera'); charco(g, 14, A / 2 + 6, 5);
    if (v === 'brasero') { brasero(g, -6, 20, f, 4, true); return { piezas: g.ps, resplandor: resplandor('hor_mesa_tortura', v, tirita(f, 4)) }; }
  },
});

// ================================================================== pared de carne
reg({
  id: 'hor_pared_carne', nombre: ['Pared de carne', 'Flesh wall'], variantes: ['x', 'der'], huella: [5, 1], bloquea: true, cuadros: 8, t: 4,
  armar: (v, f, g0, a) => {
    const g = v === 'der' ? g0.sub(0, 0, 0, -90) : g0, cs: Comp[] = [], late = (fase: number) => 1 + 0.07 * onda(f, 8, fase);
    // el muro: una membrana de tendones verticales y encima bultos de músculo, tripa y víscera fundidos, cada uno con
    // su latido (chatos contra la cara, para que se lea pared y no pila de bolas)
    for (let u = -36; u <= 36; u += 6) { const alto = 66 - Math.abs(u) * 0.3 + r2(a, 5); cs.push(g.hu([u + r2(a, 1.5), r2(a, 1), -1], [u + r2(a, 3), r2(a, 1.5), alto], 3.4, 2.2, { mat: 'gore_carne_podrida' })); }
    for (let u = -34; u <= 34; u += 8) for (let z = 6; z <= 66; z += 9) {
      const r = a.r(), mat = r < 0.6 ? 'gore_carne' : r < 0.8 ? 'gore_tripa' : r < 0.95 ? 'gore_organo' : 'gore_grasa', k = late(a.r() * TAU) * (0.85 + a.r() * 0.4);
      const alto = 64 - Math.abs(u) * 0.3;
      if (z > alto) continue;
      cs.push(g.bu([u + r2(a, 3), 1.5 + r2(a, 1.5), z + r2(a, 3)], [5.5 * k, 2.6 * k, 4.4 * k], { mat, giro: r2(a, 25), incl: r2(a, 40), inclEje: 'y' }));
    }
    // tripas que cuelgan en lazos por delante
    for (let i = 0; i < 3; i++) { const x0 = -24 + i * 22 + r2(a, 4), z0 = 22 + a.r() * 30; let p: V3 = [x0, 4, z0]; for (let k = 1; k <= 7; k++) { const q: V3 = [x0 + Math.sin(k * 0.9) * 4, 5 + Math.sin(k) * 1.2, z0 - k * 2.6 + Math.cos(k * 0.9) * 2]; cs.push(g.hu(p, q, 1.3 * late(i + k), 1.3, { mat: 'gore_tripa', k: 0.6 })); p = q; } }
    // venas que cruzan la cara
    for (let i = 0; i < 6; i++) {
      let p: V3 = [r2(a, 34), 4.5, 6 + a.r() * 55];
      const dir = a.r() * TAU;
      for (let k = 0; k < 6; k++) { const q: V3 = [p[0] + Math.cos(dir + r2(a, 0.8)) * 5, 5 + r2(a, 0.6), p[2] + Math.sin(dir + r2(a, 0.8)) * 5]; cs.push(g.hu(p, q, 0.8 * late(i), 0.7, { mat: 'gore_organo', k: 0.6 })); p = q; }
    }
    // costillas que asoman
    for (let i = 0; i < 4; i++) { const x0 = -26 + i * 6 + r2(a, 2), z0 = 30 + r2(a, 8); for (let k = 0; k < 4; k++) { const t0 = k / 4, t1 = (k + 1) / 4; cs.push(g.hu([x0 + t0 * 3, 3.5 + Math.sin(t0 * 3) * 2.5, z0 + t0 * 14], [x0 + t1 * 3, 3.5 + Math.sin(t1 * 3) * 2.5, z0 + t1 * 14], 0.8, 0.75, { mat: 'gore_hueso', k: 0.3 })); } }
    // la boca: labios que se abren y cierran con dientes
    const ab = 0.6 + 0.4 * onda(f, 8, 1), bx = 14 + r2(a, 4), bz = 28 + r2(a, 4);
    for (const s of [-1, 1]) cs.push(g.bu([bx, 4.5, bz + s * (1.6 + ab * 1.6)], [6, 2.2, 1.6], { mat: 'gore_tripa', tono: 0.05 }));
    // sangre que baja
    for (let i = 0; i < 8; i++) { const x = r2(a, 32), z = 10 + a.r() * 50; cs.push(g.hu([x, 5.2, z], [x + r2(a, 1), 5.4, Math.max(1, z - 6 - a.r() * 14)], 0.6, 0.45, { mat: 'gore_sangre', k: 0.5 })); }
    g.masa(cs, { mat: 'gore_carne', suave: 3.2 });
    g.elip(bx, 5.4, bz, 4.6, 1.2, 0.3 + ab * 1.6, { mat: 'negro' });
    for (let i = 0; i < 7; i++) { const x = bx - 3.6 + i * 1.2; g.poli([[x - 0.45, 5.8, bz + 0.2 + ab * 1.6], [x + 0.45, 5.8, bz + 0.2 + ab * 1.6], [x, 6, bz - 0.8 + ab * 0.8]], { mat: 'gore_hueso' }); g.poli([[x - 0.45, 5.8, bz - 0.2 - ab * 1.6], [x + 0.45, 5.8, bz - 0.2 - ab * 1.6], [x, 6, bz + 0.8 - ab * 0.8]], { mat: 'gore_hueso' }); }
    // ojos hundidos en la carne que miran (y uno parpadea)
    for (let i = 0; i < 3; i++) {
      const x = -24 + i * 22 + r2(a, 4), z = 44 + r2(a, 10), r = 2 + a.r(), cierra = i === 1 && f % 8 === 5;
      g.esf(x, 3.4, z, r, { mat: 'hor_ojo_blanco' });
      if (!cierra) { g.esf(x + 0.6, 3.4 + r * 0.75, z - 0.2, r * 0.45, { mat: 'gore_organo', tono: -0.2 }); g.esf(x + 0.7, 3.6 + r * 0.95, z - 0.2, r * 0.2, { mat: 'negro' }); }
      else g.elip(x, 3.6 + r * 0.4, z, r * 1.1, r * 0.8, r * 1.05, { mat: 'gore_carne' });
    }
    charco(g, 0, 10, 11); charco(g, -22, 8, 6);
    return g0.ps;
  },
});

// ================================================================== nido de huesos
reg({
  id: 'hor_nido_huesos', nombre: ['Nido de huesos', 'Bone nest'], variantes: ['chico', 'grande'], huella: [4, 4], bloquea: false,
  armar: (v, _f, g, a) => {
    const R = v === 'grande' ? 24 : 15, cs: Comp[] = [];
    // el anillo: tierra, mugre y sangre seca apisonadas
    const n = Math.round(R * 0.9);
    for (let i = 0; i < n; i++) { const t = (i / n) * TAU, d = R * (0.85 + a.r() * 0.2); cs.push(g.bu([Math.cos(t) * d, Math.sin(t) * d, 1], [R * 0.25, R * 0.2, 3 + a.r() * 2], { giro: (t * 180) / Math.PI, mat: a.r() < 0.7 ? 'mu_tierra' : 'gore_barro_sangre' })); }
    cs.push(g.bu([0, 0, -1.5], [R * 0.8, R * 0.8, 2.2], { mat: 'gore_barro_sangre' }));
    g.masa(cs, { mat: 'mu_tierra', suave: 3 });
    // huesos trenzados en el borde, a lo largo del anillo
    const nh = Math.round(R * 1.4);
    for (let i = 0; i < nh; i++) {
      const t = (i / nh) * TAU + r2(a, 0.2), d = R * (0.8 + a.r() * 0.35), L = 7 + a.r() * 6, tg = t + Math.PI / 2 + r2(a, 0.6);
      const c: V3 = [Math.cos(t) * d, Math.sin(t) * d, 3.5 + a.r() * 3];
      const p: V3 = [c[0] - Math.cos(tg) * L / 2, c[1] - Math.sin(tg) * L / 2, c[2] + r2(a, 2)], q: V3 = [c[0] + Math.cos(tg) * L / 2, c[1] + Math.sin(tg) * L / 2, c[2] + r2(a, 2)];
      huesoLargo(g, p, q, 0.85 + a.r() * 0.3, a.r() < 0.3 ? 'gore_hueso' : 'mu_hueso', r2(a, 0.06));
    }
    for (let i = 0; i < (v === 'grande' ? 7 : 4); i++) { const t = a.r() * TAU, d = R * (0.75 + a.r() * 0.3); calavera(g.sub(Math.cos(t) * d, Math.sin(t) * d, 4 + a.r() * 3, a.r() * 360, r2(a, 25)), 3, 'mu_hueso'); }
    costillar(g.sub(r2(a, R * 0.3), r2(a, R * 0.3), 0, a.r() * 180), 4, 'gore_hueso');
    // lo que queda de la última presa, roído
    const pz = PALETAS.rojo;
    g.masa([g.bu([3, -2, 2], [5, 3, 2.4], { mat: pz.carne, giro: 30 }), g.bu([1, -1, 2.4], [3, 2.6, 1.6], { mat: pz.sangre }), g.hu([-2, -4, 2.5], [7, 1, 3], 0.9, 0.8, { mat: pz.hueso })], { mat: pz.carne, suave: 1.2 });
    charco(g, -3, 4, R * 0.35, 'tierra', 0.3);
    if (v === 'grande') for (let i = 0; i < 3; i++) { const t = (i / 3) * TAU + a.r(); g.masa([g.bu([Math.cos(t) * 6, Math.sin(t) * 6, 4.5], [3.6, 3.6, 5], { incl: r2(a, 20) })], { mat: 'hor_huevo', suave: 1 }); }
  },
});

// ================================================================== crucificado cabeza abajo
reg({
  id: 'hor_crucificado', nombre: ['Crucificado cabeza abajo', 'Inverted crucifixion'], variantes: ['madera', 'hierro'], huella: [2, 2], bloquea: true, cuadros: 4, t: 3,
  armar: (v, f, g0, a) => {
    // mira hacia +y (de cara a la luz del taller y a la cámara)
    const g = g0.sub(0, 0, 0, 90), hierro = v === 'hierro', mat = hierro ? 'mu_hierro' : 'mu_madera', H = 100, zb = 42;
    bloque(g, 0, 0, -0.5, 14, 14, 4, { mat: 'mu_piedra', b: 1.2 });
    g.caja(-1, 0, 3, 4, 4.4, H - 3, { mat });
    g.caja(-1, 0, zb - 2.2, 4, 46, 4.4, { mat, tono: 0.04 });
    if (hierro) for (const z of [20, 60, 85]) g.caja(-1, 0, z, 4.6, 5, 1.2, { mat: 'mu_oxido' });
    // el cuerpo, de frente, con los pies arriba y los brazos abiertos sobre el travesaño
    const p: Pose = { brazos: [[90, 86, 3], [90, 86, 3]], piernas: [[0, 1, 2], [0, 1, 2]], columna: 0, cabeza: [-25 + r2(a, 10), r2(a, 20)] };
    const zt = 94, gc = g.sub(2.6, 0, zt, 0, 180);
    const J = cuerpo(gc, p, { abajo: [0, 0, 1], heridas: 5, trapo: 'gore_trapo', flaco: 0.88 });
    // clavos o grilletes en las manos y los pies, con su sangre
    const aMundo = (q: V3): V3 => [2.6 + q[0], -q[1], zt - q[2]];
    for (const q of [J.manos[0], J.manos[1], mid(J.tobillos[0], J.tobillos[1])].map(aMundo)) {
      if (hierro) cadena(g, [q[0] - 1, q[1] - 1.5, q[2]], [q[0] - 1, q[1] + 1.5, q[2]], 0.4, 'mu_hierro', 0.7);
      else g.palo([q[0] + 2.5, q[1], q[2]], [q[0] - 4, q[1], q[2]], 0.5, { mat: 'mu_hierro' });
      for (let i = 0; i < 2; i++) g.palo([q[0] + 1.6, q[1] + r2(a, 1), q[2] - 1], [q[0] + 1.6, q[1] + r2(a, 1), q[2] - 3 - a.r() * 5], 0.35, { mat: 'gore_sangre', r1: 0.2 });
    }
    // de la cabeza gotea al piso
    const c = aMundo(J.cabeza);
    for (let i = 0; i < 3; i++) g.palo([c[0] + r2(a, 1), c[1] + r2(a, 1), c[2] - 4], [c[0] + r2(a, 1), c[1] + r2(a, 1), Math.max(4.5, c[2] - 10 - a.r() * 10)], 0.3, { mat: 'gore_sangre', r1: 0.15 });
    charco(g, c[0] + 3, c[1], 9);
    for (let i = 0; i < 6; i++) { const t = -1.2 + (i / 5) * 2.4, d = 13 + a.r() * 3; vela(g, Math.cos(t) * d + 2, Math.sin(t) * d, 0, 3 + a.r() * 7, 1.1 + a.r() * 0.5, f, 4, i); }
    const rc = resplandor('hor_crucificado', v, tirita(f, 4))!;
    return { piezas: g0.ps, resplandor: { ...rc, c: [-rc.c[1], rc.c[0], rc.c[2]] as V3 } };
  },
});

// ================================================================== cabezas en picas
/** Cabeza cortada clavada en la punta de una pica: fresca, podrida o calavera según `estado`. */
function cabezaPica(g: G, x: number, y: number, alto: number, estado: number) {
  const a = g.a, inc = r2(a, 6);
  const tip: V3 = [x + Math.sin((inc * Math.PI) / 180) * alto, y + r2(a, 1.5), alto];
  g.palo([x, y, -2], tip, 0.9, { mat: 'mu_madera', r1: 0.7 });
  g.palo(tip, add3(tip, [0, 0, 1], 5), 0.6, { mat: 'mu_hierro', r1: 0.1 });
  // montoncito de tierra al pie
  g.masa([g.bu([x, y, 0], [3.4, 3, 1.4]), g.bu([x + 1.5, y + 1, 0.4], [2, 1.6, 1])], { mat: 'mu_tierra', suave: 1 });
  const hz = tip[2] - 1.5, gi = rr(a, -20, 80), s = g.sub(tip[0], tip[1], hz, gi, r2(a, 12));
  if (estado > 1.5) { calavera(s.sub(0, 0, -2.6), 3.4, 'mu_hueso'); return; }
  const piel = estado > 0.5 ? 'gore_piel_muerta' : 'gore_piel_cadaver', cs: Comp[] = [];
  cs.push(s.bu([0, 0, 1.8], [3.3, 2.8, 3.8]), s.bu([1.6, 0, -0.4], [1.8, 2.2, 1.6]), s.bu([0.6, 0, -2.8], [1.6, 1.8, 1.4], { mat: 'gore_carne' }));
  for (let i = 0; i < 5; i++) cs.push(s.bu([r2(a, 1.6), r2(a, 1.6), -3 - a.r() * 0.8], [1, 0.9, 0.9], { mat: a.r() < 0.5 ? 'gore_carne' : 'gore_sangre' }));
  for (let i = 0; i < 3; i++) { const q: V3 = [r2(a, 1.4), r2(a, 1.4), -3.5]; cs.push(s.hu(q, [q[0], q[1], -5 - a.r() * 3], 0.4, 0.25, { mat: 'gore_sangre', k: 0.4 })); }
  s.masa(cs, { mat: piel, suave: 1.2 });
  s.masa([s.bu([-0.8, 0, 3.4], [3.2, 3, 2.6]), s.hu([-1.6, 0, 3], [-2.4 + r2(a, 1), r2(a, 1), -2.5], 1.8, 0.6)], { mat: 'gore_pelo', suave: 1 });
  for (const sg of [-1, 1]) s.elip(2.7, sg * 1.2, 2.2, 0.6, 0.8, 0.65, { mat: 'negro' });
  s.elip(3, 0, -0.6, 0.6, 1, 0.8 + a.r() * 0.6, { mat: 'negro' });
  sangrePorPalo(g, [tip[0], tip[1], hz - 4], [x, y, hz * 0.5], 0.9);
}
reg({
  id: 'hor_cabezas_picas', nombre: ['Cabezas en picas', 'Heads on pikes'], variantes: ['una', 'tres', 'cerco'], huella: [2, 2], bloquea: true,
  armar: (v, _f, g, a) => {
    const pos: [number, number][] = v === 'una' ? [[0, 0]] : v === 'tres' ? [[-10, -6], [4, -12], [10, 6]] : Array.from({ length: 5 }, (_, i) => { const t = -1.3 + i * 0.65; return [Math.cos(t) * 26 - 12, Math.sin(t) * 26] as [number, number]; });
    pos.forEach(([x, y], i) => cabezaPica(g, x + r2(a, 1.5), y + r2(a, 1.5), 46 + a.r() * 12, a.r() * (i === 0 ? 1.2 : 2.4)));
    if (v === 'cerco') cuervo(g.sub(pos[2][0], pos[2][1] + 2, 1, 200), 'picotea', 3, 8, 0.9);
  },
});

// ================================================================== cadáver que comen los cuervos
reg({
  id: 'hor_cuervos_cadaver', nombre: ['Cadáver devorado por cuervos', 'Corpse eaten by crows'], variantes: ['suelo', 'horca'], huella: [3, 3], bloquea: true, cuadros: 8, t: 3,
  armar: (v, f, g) => {
    if (v === 'suelo') {
      const p: Pose = { brazos: [[150, 30, 40], [40, 70, 60]], piernas: [[15, 15, 30], [5, 8, 10]], columna: 0, cabeza: [-30, 40] };
      cuerpo(acostado(g, 28, 0, 0, 10), p, { abajo: ABAJO_ACOSTADO, abierto: true, heridas: 4, trapo: 'gore_trapo', flaco: 0.85 });
      charco(g, 0, 6, 12, 'tierra');
      cuervo(g.sub(4, 9, 0, -100), 'picotea', f, 8);
      cuervo(g.sub(-24, -6, 0, 30), 'picotea', (f + 3) % 8, 8, 0.9);
      // uno se espanta y vuelve a bajar
      const al = 6 + 6 * Math.max(0, onda(f, 8, 2));
      cuervo(g.sub(14, -12, al, 150), al > 9 ? 'vuela' : 'grazna', f, 8, 1);
      return;
    }
    // la horca
    g.palo([-18, 0, -2], [-18, 0, 98], 2, { mat: 'mu_madera' });
    g.palo([-20, 0, 92], [12, 0, 92], 1.7, { mat: 'mu_madera' });
    g.palo([-18, 0, 74], [-4, 0, 91], 1.1, { mat: 'mu_madera', tono: -0.05 });
    const p: Pose = { ...POSES.colgando, cabeza: [60, 20] }, J = juntas(p), zt = 83 - J.cabeza[2];
    const sw = 2 * onda(f, 8), gc = g.sub(6, 0, 92, 0, sw).sub(0, 0, zt - 92);
    cuerpo(gc, p, { heridas: 3, flaco: 0.85, piel: 'gore_piel_muerta' });
    g.sub(6, 0, 92, 0, sw).palo([0, 0, 0], [J.cabeza[0] - 1, J.cabeza[1], zt - 92 + J.cabeza[2] + 2], 0.5, { mat: 'hor_cuerda' });
    cuervo(g.sub(-6, 0, 93.6, 30), 'grazna', f, 8, 0.9);
    cuervo(g.sub(6 + J.hombros[0][0], J.hombros[0][1], zt + J.hombros[0][2] + 1.5, 160), 'picotea', (f + 2) % 8, 8, 0.8);
    const t = (f / 8) * TAU;
    cuervo(g.sub(Math.cos(t) * 26, Math.sin(t) * 18, 70 + Math.sin(t * 2) * 4, (t * 180) / Math.PI + 90), 'vuela', f, 8, 0.9);
    charco(g, 8, 2, 6, 'tierra');
  },
});

// ================================================================== foso de sangre
reg({
  id: 'hor_foso_sangre', nombre: ['Foso de sangre que hierve', 'Boiling blood pit'], variantes: ['piedra', 'carne'], huella: [3, 3], bloquea: true, cuadros: 8, t: 3,
  armar: (v, f, g, a) => {
    const R = 18, n = 14;
    if (v === 'piedra') for (let i = 0; i < n; i++) { const t = (i / n) * TAU + r2(a, 0.06); if (a.r() < 0.1) continue; bloque(g, Math.cos(t) * (R + 2 + a.r()), Math.sin(t) * (R + 2 + a.r()), -0.5 - a.r(), 8 + a.r() * 3, 5 + a.r() * 2, 3.5 + a.r() * 3, { mat: a.r() < 0.3 ? 'mu_piedra_musgo' : 'mu_granito', giro: (t * 180) / Math.PI + 90 + r2(a, 12), incl: r2(a, 10), b: 1, j: 1 }); }
    else {
      const cs: Comp[] = [];
      for (let i = 0; i < n + 4; i++) { const t = (i / (n + 4)) * TAU; cs.push(g.bu([Math.cos(t) * (R + 2), Math.sin(t) * (R + 2), 1.5], [5, 4, 3.5 + a.r() * 1.5], { giro: (t * 180) / Math.PI, mat: a.r() < 0.7 ? 'gore_carne' : 'gore_tripa' })); }
      for (let i = 0; i < 5; i++) { const t = a.r() * TAU; cs.push(g.hu([Math.cos(t) * (R + 3), Math.sin(t) * (R + 3), 4], [Math.cos(t) * (R - 2), Math.sin(t) * (R - 2), 7 + a.r() * 4], 0.8, 0.6, { mat: 'gore_hueso', k: 0.4 })); }
      g.masa(cs, { mat: 'gore_carne', suave: 2 });
    }
    // la superficie: sangre honda con coágulos, espuma rosada en la orilla, algo que flota y lo que rebalsa
    g.elip(0, 0, 1.5, R, R, 1.4, { mat: 'gore_sangre', tono: -0.04 });
    const coag: Comp[] = [];
    for (let i = 0; i < 12; i++) { const t = a.r() * TAU, d = Math.sqrt(a.r()) * (R - 3); coag.push(g.bu([Math.cos(t) * d, Math.sin(t) * d, 2.6], [1.5 + a.r() * 3, 1 + a.r() * 2, 0.5], { giro: a.r() * 180 })); }
    g.masa(coag, { mat: 'gore_sangre_oscura', suave: 1 });
    const espuma: Comp[] = [];
    for (let i = 0; i < 40; i++) { const t = (i / 40) * TAU + r2(a, 0.1), d = R - 1.5 - a.r() * 2; espuma.push(g.bu([Math.cos(t) * d, Math.sin(t) * d, 2.7], [0.8 + a.r() * 0.8, 0.8 + a.r() * 0.6, 0.6 + 0.2 * onda(f, 8, i)], { giro: a.r() * 180 })); }
    g.masa(espuma, { mat: 'gore_tripa', suave: 0.8, tono: 0.1 });
    calavera(g.sub(-6, 5, 0.6, 140, 30), 3.2, 'gore_hueso');
    costillar(g.sub(6, -6, 0.6, 30, 15), 3, 'gore_hueso');
    for (let i = 0; i < 3; i++) { const t = 0.4 + i * 0.5 + r2(a, 0.1); charco(g, Math.cos(t) * (R + 6), Math.sin(t) * (R + 6), 4 + a.r() * 3); }
    for (let i = 0; i < 9; i++) {
      const t = a.r() * TAU, d = Math.sqrt(a.r()) * (R - 4), x = Math.cos(t) * d, y = Math.sin(t) * d, fase = Math.floor(a.r() * 8), big = 1.4 + a.r() * 1.8;
      const k = ((f + fase) % 8) / 8;
      if (k < 0.75) { const r = big * (0.3 + k * 1.5); g.masa([g.bu([x, y, 2.4], [r, r, r * 0.9])], { mat: 'gore_sangre', suave: 0.5, tono: 0.08 }); }
      else { for (let j = 0; j < 7; j++) { const u = (j / 7) * TAU; g.elip(x + Math.cos(u) * big * 1.7, y + Math.sin(u) * big * 1.7, 2.8, 0.75, 0.75, 0.5, { mat: 'gore_sangre', tono: 0.06 }); } g.esf(x, y, 4 + big * 1.4, 0.55, { mat: 'gore_sangre' }); g.esf(x + 1, y - 0.5, 3.4 + big, 0.4, { mat: 'gore_sangre' }); }
    }
    // vetas que brillan en lo hondo (lo que da la luz roja)
    for (let i = 0; i < 6; i++) { const t = a.r() * TAU, d = a.r() * (R - 6); g.elip(Math.cos(t) * d, Math.sin(t) * d, 2.5, 2 + a.r() * 3, 0.6 + a.r() * 0.5, 0.3, { mat: 'gore_brillo_sangre', giro: a.r() * 180, tono: -0.3 + 0.18 * onda(f, 8, i) }); }
    return { piezas: g.ps, resplandor: resplandor('hor_foso_sangre', v, 1 + 0.12 * onda(f, 8)) };
  },
});

// ================================================================== escritura de sangre
/** Glifos propios (trazos en una celda de 1 × 1.5): ninguno es una letra ni un símbolo conocido. */
const GLIFOS: [number, number][][][] = [
  [[[0, 0], [0.5, 1.5], [1, 0]], [[0.2, 0.7], [0.8, 0.9]]],
  [[[0, 1.5], [0, 0], [1, 0.4]], [[0.5, 0.2], [0.6, 1.2], [1, 1.5]]],
  [[[0, 0.2], [1, 1.3]], [[0, 1.3], [0.4, 0.9]], [[0.6, 0.4], [1, 0]]],
  [[[0.5, 0], [0.5, 1.5]], [[0, 1.1], [0.5, 0.8], [1, 1.1]], [[0.1, 0.1], [0.9, 0.3]]],
  [[[0, 0], [1, 0.2], [0.2, 0.8], [1, 1.5]]],
  [[[0.2, 0], [0, 0.75], [0.2, 1.5]], [[0.5, 0.75], [1, 0.75]], [[0.8, 0.2], [0.8, 1.3]]],
  [[[0, 0.5], [0.5, 0], [1, 0.5], [0.5, 1.5]], [[0.5, 0.6], [0.5, 0.9]]],
  [[[1, 0], [0, 0.4], [1, 0.9], [0, 1.5]], [[0.5, 1.2], [0.9, 1.4]]],
];
/** Escribe un glifo con sangre (y su trazo de luz encima) en (x, y), girado `ang`, de alto `k`·1.5. */
function glifo(m: Mancha, luz: Comp[], g: G, i: number, x: number, y: number, ang: number, k: number) {
  const c = Math.cos(ang), s = Math.sin(ang), P = (u: number, w: number): [number, number] => [x + (u - 0.5) * k * c - (w - 0.75) * k * s, y + (u - 0.5) * k * s + (w - 0.75) * k * c];
  for (const trazo of GLIFOS[i % GLIFOS.length]) for (let j = 1; j < trazo.length; j++) {
    const [ax, ay] = P(...trazo[j - 1]), [bx, by] = P(...trazo[j]), L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.ceil(L / 1.2)), an = Math.atan2(by - ay, bx - ax);
    for (let q = 0; q <= n; q++) m.gota(ax + (bx - ax) * (q / n), ay + (by - ay) * (q / n), 1, 0.75, an, 0.45, 0, false);
    luz.push(g.hu([ax, ay, 0.62], [bx, by, 0.62], 0.32, 0.32));
  }
}
reg({
  id: 'hor_escritura_sangre', nombre: ['Escritura de sangre', 'Blood writing'], variantes: ['circulo', 'palabras', 'sello'], huella: [5, 5], plano: true, cuadros: 8, t: 4,
  armar: (v, f, g, a) => {
    const m = new Mancha(g, SUP.piedra), luz: Comp[] = [];
    const anillo = (R: number, w: number) => { const n = Math.round(R * 1.4); for (let i = 0; i < n; i++) { const t = (i / n) * TAU; if (a.r() < 0.06) continue; m.gota(Math.cos(t) * R, Math.sin(t) * R, 1.6, w * (0.8 + a.r() * 0.4), t + Math.PI / 2, 0.45, 0, false); } };
    if (v === 'circulo') {
      anillo(30, 1.1); anillo(22, 0.8);
      for (let i = 0; i < 12; i++) { const t = (i / 12) * TAU; glifo(m, luz, g, i * 3 + Math.floor(a.r() * 8), Math.cos(t) * 26, Math.sin(t) * 26, t + Math.PI / 2, 4.6); }
      for (let i = 0; i < 3; i++) glifo(m, luz, g, i + 4, -4 + i * 4, 0, 0, 3.6);
    } else if (v === 'palabras') {
      for (let fila = 0; fila < 3; fila++) for (let i = 0; i < 7; i++) glifo(m, luz, g, Math.floor(a.r() * 8), -24 + i * 7.5 + r2(a, 0.6), -14 + fila * 12 + r2(a, 0.8), r2(a, 0.12), 5 + r2(a, 0.6));
      // la mano que escribía, arrastrada al final
      for (let d = 0; d < 4; d++) for (let u = 0; u < 9; u += 1.2) m.gota(26 + u, -10 + d * 1.4 + u * 0.15, 0.9, 0.45, 0.15, 0.4, 0, false);
    } else {
      anillo(24, 1.2);
      // el sello: tres rayos curvos que terminan en gancho, la luna partida y el ojo del centro
      for (let i = 0; i < 3; i++) {
        const t0 = (i / 3) * TAU + 0.3;
        for (let k = 0; k <= 16; k++) { const t = k / 16, an = t0 + t * 0.9, r = 4 + t * 20; m.gota(Math.cos(an) * r, Math.sin(an) * r, 1.3, 0.9, an + 1.1, 0.45, 0, false); }
        const an = t0 + 0.9, ex = Math.cos(an) * 24, ey = Math.sin(an) * 24;
        glifo(m, luz, g, i + 1, ex * 1.25, ey * 1.25, an + Math.PI / 2, 4.4);
        luz.push(g.hu([Math.cos(t0) * 4, Math.sin(t0) * 4, 0.62], [Math.cos(t0 + 0.45) * 14, Math.sin(t0 + 0.45) * 14, 0.62], 0.3, 0.3));
      }
      for (let k = 0; k < 14; k++) { const an = -0.6 + (k / 13) * 3.6; m.gota(Math.cos(an) * 8 - 2, Math.sin(an) * 8, 1.2, 0.8, an + Math.PI / 2, 0.45, 0, false); }
      m.gota(0, 0, 3.2, 1.8, 0.4, 0.55, -0.1, false); m.gota(0, 0, 1, 1, 0, 0.75, 0.15, false);
    }
    // goteos y salpicones de cuando se pintó
    for (let i = 0; i < 18; i++) { const r = 0.5 + Math.pow(a.r(), 2) * 1.6; m.gota(r2(a, 34), r2(a, 30), r, r * 0.9, a.r() * TAU, 0.45); }
    m.cerrar(0.7);
    // las runas laten: el trazo de luz sube y baja (cada cuadro con su brillo)
    g.masa(luz, { mat: 'gore_runa_sangre', suave: 0.3, tono: -0.28 + 0.2 * (0.5 + 0.5 * onda(f, 8)) });
    return { piezas: g.ps, resplandor: resplandor('hor_escritura_sangre', v, 1 + 0.1 * onda(f, 8)) };
  },
});

// ================================================================== ojos en la oscuridad
/** Un par de ojos en (x, y, z) mirando a la cámara; `abre` 0 cerrado (una raya) a 1 abierto. */
function parOjos(g: G, x: number, y: number, z: number, k: number, sep: number, abre: number, mat: string) {
  const s = g.sub(x, y, z, 45);
  for (const sg of [-1, 1]) {
    const h = Math.max(0.12, abre) * 1.1 * k;
    s.elip(0, sg * sep * 0.5, 0, 0.35 * k, 1.5 * k, h, { mat, incl: sg * 8 });
    if (abre > 0.35) s.elip(0.3 * k, sg * sep * 0.5, 0, 0.2 * k, 0.3 * k, h * 0.85, { mat: 'negro' });
  }
}
/** Cuánto está abierto un ojo en el cuadro `f` (de 12), con su propio momento de parpadear. */
const parpado = (f: number, fase: number) => { const k = (f + fase) % 12; return k === 0 ? 0 : k === 1 || k === 11 ? 0.45 : 1; };
reg({
  id: 'hor_ojos', nombre: ['Ojos en la oscuridad', 'Eyes in the dark'], variantes: ['rojo', 'ambar', 'muchos', 'enorme'], huella: [1, 1], plano: true, cuadros: 12, t: 3,
  armar: (v, f, g, a) => {
    if (v === 'muchos') for (let i = 0; i < 7; i++) { const k = 0.6 + a.r() * 0.6; parOjos(g, r2(a, 24), r2(a, 24), 10 + a.r() * 40, k, 3.4 * k, parpado(f, Math.floor(a.r() * 12)), a.r() < 0.75 ? 'hor_ojo_rojo' : 'hor_ojo_ambar'); }
    else if (v === 'enorme') parOjos(g, 0, 0, 52, 3.2, 15, parpado(f, 5), 'hor_ojo_rojo');
    else parOjos(g, 0, 0, 34, 1.35, 4.6, parpado(f, 3), v === 'ambar' ? 'hor_ojo_ambar' : 'hor_ojo_rojo');
    return { piezas: g.ps, resplandor: resplandor('hor_ojos', v) };
  },
});

// ================================================================== sombra que pasa
/** Silueta alta y flaca (78 de alto), brazos que le llegan a las rodillas, cabeza gacha; camina con `paso` (0..1). */
function sombra(g: G, paso: number, inclina = 0) {
  const cs: Comp[] = [], sw = Math.sin(paso * TAU), sw2 = Math.cos(paso * TAU);
  const cad: V3 = [inclina * 0.1, 0, 40], cu: V3 = [5 + inclina * 0.6, 0, 66], cab: V3 = [8 + inclina * 0.7, 0, 72];
  cs.push(g.hu(cad, cu, 4, 5.4), g.bu(mid(cad, cu, 0.7), [7, 7, 3.2], { eje: [0.2, 0, 1] }), g.hu(cu, cab, 1.6, 1.4), g.bu(cab, [3.4, 2.6, 4], { eje: [0.5, 0, 1] }));
  for (const s of [-1, 1]) {
    const pie: V3 = [s * sw * 10, s * 4.5, 0.5 + Math.max(0, s * sw2) * 4], rod: V3 = [s * sw * 5 + 3, s * 4, 21];
    cs.push(g.hu([0, s * 3.5, 40], rod, 2.6, 1.8), g.hu(rod, pie, 1.8, 1));
    const hom: V3 = [4 + inclina * 0.5, s * 7.5, 63], codo: V3 = [2 - s * sw * 6 + inclina, s * 9.5, 44], mano: V3 = [6 - s * sw * 9 + inclina * 1.5, s * 9, 26];
    cs.push(g.hu(hom, codo, 1.6, 1.3), g.hu(codo, mano, 1.3, 0.9));
    for (let d = 0; d < 4; d++) cs.push(g.hu(mano, add3(mano, [1 + d * 0.3, (d - 1.5) * 0.9, -6 - (d % 2)], 1), 0.45, 0.15, { k: 0.3 }));
  }
  // jirones que se deshacen detrás
  for (let i = 0; i < 4; i++) {
    const ph = paso * TAU + i * 1.7;
    let p: V3 = [-2, r2(g.a, 3), 26 + i * 11];
    for (let k = 1; k <= 4; k++) { const q: V3 = [p[0] - 3.2, p[1] + Math.sin(ph + k) * 1.6, p[2] - 1.2 + Math.sin(ph * 1.3 + k * 1.1) * 1.8]; cs.push(g.hu(p, q, 1.7 - k * 0.32, 1.4 - k * 0.3, { k: 2 })); p = q; }
  }
  g.masa(cs, { mat: 'hor_sombra', suave: 2.4 });
}
reg({
  id: 'hor_sombra', nombre: ['Sombra que pasa', 'Passing shadow'], variantes: ['cruza', 'asoma'], huella: [2, 2], plano: true, cuadros: 12, t: 3,
  armar: (v, f, g) => {
    if (v === 'cruza') {
      // cruza la pantalla de izquierda a derecha (en el mundo, de -x+y a +x-y), mirando hacia donde va
      const t = f / 11, d = -36 + t * 72;
      sombra(g.sub(d * 0.7071, -d * 0.7071, 0, -45), (f % 6) / 6);
      return;
    }
    // asoma: se inclina desde atrás de algo, estira el brazo y se vuelve a esconder
    const k = Math.sin((f / 11) * Math.PI);
    sombra(g.sub(-14 + k * 8, -14 + k * 8, 0, 45, -k * 22, 'y'), 0.25, k * 10);
  },
});

// ================================================================== manos que salen del piso
reg({
  id: 'hor_manos', nombre: ['Manos que salen del piso', 'Hands from the floor'], variantes: ['una', 'muchas', 'esqueleto'], huella: [2, 2], cuadros: 10, t: 3,
  armar: (v, f, g, a) => {
    const n = v === 'muchas' ? 5 : 1, hueso = v === 'esqueleto', sube = [0, 0.18, 0.45, 0.75, 0.95, 1, 1, 0.92, 0.6, 0.25];
    const cierra = [0, 0, 0, 0.1, 0.2, 0.4, 0.9, 1, 0.8, 0.5];
    for (let i = 0; i < n; i++) {
      const x = n > 1 ? r2(a, 18) : 0, y = n > 1 ? r2(a, 16) : 0, fase = n > 1 ? Math.floor(a.r() * 4) : 0, lado = a.r() * TAU, ff = Math.max(0, f - fase);
      const e = sube[Math.min(9, ff)], c = cierra[Math.min(9, ff)], s0 = g.sub(x, y, 0, (lado * 180) / Math.PI), s = s0.esc(1.3);
      // el piso que se rompe: el hueco, lajas levantadas y tierra
      s0.elip(0, 0, 0, 6.5, 5.5, 0.3, { mat: 'negro' });
      for (let j = 0; j < 6; j++) { const t = (j / 6) * TAU + a.r() * 0.5; bloque(s0, Math.cos(t) * 7.5, Math.sin(t) * 6.5, -0.6, 4 + a.r() * 2, 3 + a.r() * 1.5, 1.6, { mat: 'mu_piedra', giro: (t * 180) / Math.PI, incl: 12 + a.r() * 18 * Math.min(1, e + 0.3), b: 0.4, j: 0.6 }); }
      cascotes(s0, 5, 10, 9, 'mu_tierra', 0, 0, 1.4);
      if (e <= 0) continue;
      const mat = hueso ? 'gore_hueso' : 'gore_piel_muerta', r = hueso ? 0.6 : 1;
      const codo: V3 = [2 + e * 2, Math.sin(i * 2.3 + 1) * 1.5, -12 + e * 20], mun: V3 = [5 + e * 4, Math.cos(i * 1.7) * 1.5, -7 + e * 24 - c * 3], cs: Comp[] = [];
      cs.push(s.hu([0, 0, -20], codo, 2.2 * r, 1.8 * r), s.hu(codo, mun, 1.8 * r, 1.3 * r), s.bu(add3(mun, [0.5, 0, 1.8]), [1.5 * r + 0.4, 1.9, 1.7]));
      if (!hueso) { cs.push(s.bu(add3(codo, [0.6, 0, 3]), [1.4, 1, 2.6], { mat: 'gore_carne', k: 0.4 })); cs.push(s.hu(add3(codo, [1.2, 0.8, 2]), add3(codo, [1.4, 0.9, -3]), 0.5, 0.3, { mat: 'gore_sangre', k: 0.4 })); }
      const pal = add3(mun, [0.8, 0, 3]);
      for (let d = 0; d < 5; d++) {
        const yy = (d - 2) * 0.9, abre = 1 - c, pul = d === 4;
        const b: V3 = add3(pal, pul ? [0.6, 2, -1.5] : [0.2, yy, 0.6]);
        const m1: V3 = add3(b, [0.6 + c * 1.6, yy * 0.5 * abre + (pul ? 1 : 0), 2.4 - c * 0.8]);
        const m2: V3 = add3(m1, [1.4 * c + 0.3, yy * 0.4 * abre, 2 * abre - 1.6 * c]);
        cs.push(s.hu(b, m1, 0.55 * r + 0.1, 0.45 * r + 0.1, { k: 0.3 }), s.hu(m1, m2, 0.45 * r + 0.1, 0.25, { k: 0.3, mat: hueso ? mat : 'gore_hueso_viejo' }));
      }
      s.masa(cs, { mat, suave: 0.9 });
    }
  },
});

// ================================================================== susurro
reg({
  id: 'hor_susurro', nombre: ['Susurro', 'Whisper'], variantes: ['humo', 'rostros'], huella: [2, 2], plano: true, cuadros: 12, t: 3,
  armar: (v, f, g, a) => {
    const cs: Comp[] = [], gira = (f / 12) * TAU;
    // hebras de humo que suben enroscadas y se abren arriba
    for (let i = 0; i < 7; i++) {
      const f0 = a.r() * TAU, R0 = 3 + a.r() * 6, vel = a.r() < 0.5 ? 1 : -1;
      let prev: V3 | null = null;
      for (let k = 0; k <= 9; k++) {
        const t = k / 9, an = f0 + gira * vel + t * 3, R = R0 + t * 10, q: V3 = [Math.cos(an) * R, Math.sin(an) * R, 2 + t * 46 + Math.sin(gira + i) * 2];
        if (prev) cs.push(g.hu(prev, q, 1.8 - t * 0.9, 1.6 - t * 1.2, { k: 1.5 }));
        prev = q;
      }
    }
    g.masa(cs, { mat: 'hor_humo', suave: 2.4, tono: -0.05 });
    if (v === 'rostros') for (let i = 0; i < 2; i++) {
      // caras que se asoman en el humo con la boca abierta (aparecen y se van)
      const vis = Math.max(0, Math.sin(((f + i * 6) / 12) * TAU));
      if (vis < 0.2) continue;
      const an = gira * 0.5 + i * Math.PI, s = g.sub(Math.cos(an) * 8, Math.sin(an) * 8, 22 + i * 12, 45).esc(0.7 + vis * 0.4);
      s.masa([s.bu([0, 0, 0], [1.4, 3.2, 4.4]), s.bu([0.2, 0, -3.5], [1, 2, 2.6]), s.hu([-0.5, 0, -5], [-2, 0, -12], 2, 0.4)], { mat: 'hor_espectro', suave: 1.2, tono: -0.3 + vis * 0.25 });
      for (const sg of [-1, 1]) s.elip(1.2, sg * 1.3, 1, 0.5, 0.75, 0.9, { mat: 'negro' });
      s.elip(1.2, 0, -3.2, 0.5, 0.9, 1.2 + vis * 1.2, { mat: 'negro' });
    }
  },
});

// ================================================================== el velo de sangre (pantalla entera)
/** Ruido de valor 2D liso (para el velo). */
function ruido2(x: number, y: number, s: number) {
  const h = (i: number, j: number) => { let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1274126177); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - w) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * w;
}
const fbm2 = (x: number, y: number, s: number) => ruido2(x, y, s) * 0.55 + ruido2(x * 2.03, y * 2.03, s + 1) * 0.28 + ruido2(x * 4.1, y * 4.1, s + 2) * 0.17;
export const VELO_NIVELES = [1, 2, 3] as const;
/**
 * El velo rojo de la pantalla con poca vida: viñeta de sangre de borde orgánico, venas que trepan desde los bordes y
 * (en los niveles 2 y 3) chorreados que bajan desde arriba. Nivel 1 apenas un borde, 3 casi tapa las esquinas. PNG
 * con alfa del tamaño de la pantalla (960 × 540 por omisión; se puede estirar al doble sin que se note).
 */
export function veloSangre(nivel: 1 | 2 | 3, w = 960, h = 540, semilla = 7): Raster {
  const img = createRaster(w, h), cx = w / 2, cy = h / 2;
  const alcance = [0, 0.86, 0.72, 0.56][nivel], fuerza = [0, 0.55, 0.78, 0.93][nivel], venas = [0, 0.35, 0.7, 1][nivel];
  // chorreados: columnas con largo propio y una gota al final
  const chorros: { x: number; L: number; w: number }[] = [];
  if (nivel > 1) for (let i = 0; i < 9 * (nivel - 1); i++) { const r = ruido2(i * 7.3, 3.1, semilla), r2_ = ruido2(i * 3.7, 9.4, semilla); chorros.push({ x: r * w, L: h * (0.06 + r2_ * 0.16 * nivel), w: 2 + r2_ * 4 }); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x - cx) / cx, ny = (y - cy) / cy, d = Math.sqrt(nx * nx * 0.92 + ny * ny * 1.08);
    const borde = fbm2(x / 70, y / 70, semilla) - 0.5, e = (d - alcance + borde * 0.22) / (1.25 - alcance);
    let a = Math.max(0, Math.min(1, e)), oscuro = a;
    a = a * a * (3 - 2 * a) * fuerza;
    // venas: crestas de ruido, solo en la banda del borde
    const c = 1 - Math.abs(fbm2(x / 38, y / 38, semilla + 5) * 2 - 1), cresta = Math.pow(Math.max(0, c), 14) * venas * Math.max(0, Math.min(1, e * 1.6 + 0.25));
    a = Math.max(a, cresta * 0.9);
    oscuro = Math.max(oscuro, cresta);
    for (const ch of chorros) {
      const dx = Math.abs(x - ch.x - Math.sin(y * 0.05 + ch.x) * 2);
      if (y < ch.L && dx < ch.w * (1 - (y / ch.L) * 0.4)) { a = Math.max(a, 0.92 * fuerza); oscuro = Math.max(oscuro, 0.7); }
      const gy = y - ch.L; if (Math.hypot(dx, gy * 0.8) < ch.w * 1.5) { a = Math.max(a, 0.95 * fuerza); oscuro = Math.max(oscuro, 0.6); }
    }
    if (a <= 0.004) continue;
    const i = (y * w + x) * 4, t = Math.min(1, oscuro);
    // del rojo vivo del frente de la mancha al casi negro de la orilla
    img.data[i] = 150 - t * 115 + borde * 30; img.data[i + 1] = 8 + (1 - t) * 6; img.data[i + 2] = 8 + (1 - t) * 4; img.data[i + 3] = Math.round(a * 255);
  }
  return img;
}
