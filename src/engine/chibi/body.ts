import type { Raster } from '../core/raster';
import { type ChibiLook, type Talla, VINOTINTO, DORADO, CREMA } from './look';
import { medidas, largoBrazo, type Medidas } from './metrics';
import type { Gesto, Vista } from './head';
import { pintarCabezaVideo } from './cabezaVideo';
import { capa, barra, elipse, poligono, pegar, juntar, pon, rect, hex, sombra, luz, mezcla, VACIO, type Capa } from './paint';

/**
 * El cuerpo chibi armado por piezas sobre un esqueleto chiquito: cadera, torso, cuello, dos brazos y dos piernas
 * con cinemática inversa (la pose dice dónde van las manos y los pies y el motor dobla codos y rodillas).
 * Las poses se escriben a 32 px mirando a la derecha y el motor las escala a 48 y a cada contextura.
 */

export type Mano = 'puno' | 'abierta' | 'palma' | 'agarra';
export type Parte = 'manoD' | 'manoT' | 'pieD' | 'pieT' | 'cuerpo' | 'cabeza' | 'util';

export interface Pose {
  /** Corrimiento de la cadera desde el reposo (x adelante, y abajo). */
  cad?: [number, number];
  /** Inclinación del torso en grados (positivo hacia adelante). */
  incl?: number;
  /** Corrimiento de la cabeza sobre el cuello. */
  cab?: [number, number];
  /** Pie de adelante y de atrás: x desde el centro, y alto sobre el piso, ángulo del pie (positivo: punta arriba). */
  pieD?: [number, number, number?];
  pieT?: [number, number, number?];
  /** Manos desde el hombro (x adelante, y abajo). */
  manoD?: [number, number];
  manoT?: [number, number];
  formaD?: Mano; formaT?: Mano;
  /** Giro de todo el cuerpo en grados (horario), alrededor del centro del torso. */
  rot?: number;
  gesto?: Gesto;
  vista?: Vista;
  /** Ángulo de la utilería (0 apunta arriba, 90 adelante). */
  util?: number;
  /** Ocultar la utilería en este cuadro. */
  sinUtil?: boolean;
  /** Capa ondeando (0..3). */
  viento?: number;
  /** Espejar el cuadro (la mitad de un giro mira para el otro lado). */
  espejo?: boolean;
  /** Rodillas hacia atrás (para patadas hacia atrás y nado). */
  rodillaAtras?: boolean;
}

export interface Render {
  img: Raster;
  /** Puntos útiles en la celda: manos, pies, cabeza y el centro del cuerpo. */
  puntos: Record<'manoD' | 'manoT' | 'pieD' | 'pieT' | 'cabeza' | 'centro' | 'util', [number, number]>;
  /** Caja que recibe golpes y caja que pega (si la pose pega). x, y, w, h en la celda. */
  hurt: [number, number, number, number];
  hit?: [number, number, number, number];
}

type V2 = [number, number];
const rotar = (p: V2, c: V2, deg: number): V2 => {
  const r = (deg * Math.PI) / 180, s = Math.sin(r), co = Math.cos(r);
  const x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * co - y * s, c[1] + x * s + y * co];
};

/** Dos huesos: devuelve la articulación del medio. `prefiere` elige la solución (abajo o adelante). */
function ik(a: V2, b: V2, l1: number, l2: number, prefiere: (p: V2) => number): V2 {
  let dx = b[0] - a[0], dy = b[1] - a[1];
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.05, min = Math.abs(l1 - l2) + 0.05;
  if (d < 0.0001) { dx = 0; dy = 1; d = 0.0001; }
  const dc = Math.max(min, Math.min(max, d));
  const ux = dx / d, uy = dy / d;
  const x = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const m: V2 = [a[0] + ux * x, a[1] + uy * x];
  const s1: V2 = [m[0] - uy * h, m[1] + ux * h], s2: V2 = [m[0] + uy * h, m[1] - ux * h];
  return prefiere(s1) >= prefiere(s2) ? s1 : s2;
}
/** Punto final acercado si el hueso no llega. */
function alcanza(a: V2, b: V2, l: number): V2 {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (d <= l) return b;
  return [a[0] + ((b[0] - a[0]) * l) / d, a[1] + ((b[1] - a[1]) * l) / d];
}

export const POSE_BASE: Required<Pick<Pose, 'cad' | 'incl' | 'cab' | 'pieD' | 'pieT' | 'manoD' | 'manoT'>> = {
  cad: [0, 0], incl: 0, cab: [0, 0], pieD: [2, 0, 0], pieT: [-2, 0, 0], manoD: [1, 5], manoT: [-1, 5],
};

const FONT: Record<string, string[]> = {
  '0': ['111', '101', '101', '111'], '1': ['010', '110', '010', '111'], '2': ['110', '001', '010', '111'], '3': ['111', '011', '001', '111'],
  '4': ['101', '101', '111', '001'], '5': ['111', '110', '001', '110'], '6': ['100', '111', '101', '111'], '7': ['111', '001', '010', '010'],
  '8': ['111', '111', '101', '111'], '9': ['111', '101', '111', '001'], G: ['111', '100', '101', '111'],
};

/** Colores de la ropa ya resueltos. */
interface Ropa {
  piel: number; pielS: number;
  arriba: number; arriba2: number; arriba3: number;
  abajo: number; abajo2: number;
  zapato: number; zapato2: number;
  medias: number | null; guantes: number | null;
  manga: 'nada' | 'corta' | 'media' | 'larga';
  pierna: 'larga' | 'corta' | 'bermuda' | 'piel' | 'falda_larga';
}

function ropa(l: ChibiLook): Ropa {
  const piel = hex(l.piel);
  const a = l.arriba, b = l.abajo;
  let arriba = hex(a.color), arriba2 = hex(a.color2 ?? '#f4f2ee'), arriba3 = hex(a.color3 ?? '#141014');
  if (a.estilo === 'vinotinto') { arriba = hex(a.color || VINOTINTO); arriba2 = hex(a.color2 ?? DORADO); arriba3 = hex(a.color3 ?? CREMA); }
  const mangas: Record<string, Ropa['manga']> = {
    franela: 'corta', polo: 'corta', gi: 'media', gi_sin_mangas: 'nada', chaqueta: 'larga', sueter: 'larga', vinotinto: 'corta', camiseta: 'corta',
    vestido: 'corta', pijama: 'larga', franelilla: 'nada', jeogori: 'larga', kimono: 'media', sudadera: 'larga', floreada: 'corta', delantal: 'corta',
    bano: 'nada', camisa: 'larga', chaleco: 'corta', top: 'nada', nada: 'nada',
  };
  const piernas: Record<string, Ropa['pierna']> = {
    pantalon: 'larga', jean: 'larga', short: 'corta', falda: 'piel', falda_larga: 'falda_larga', leggings: 'larga', gi: 'larga', pijama: 'larga', bermuda: 'bermuda', bano: 'piel', malla: 'larga',
  };
  return {
    piel, pielS: sombra(piel), arriba, arriba2, arriba3,
    abajo: hex(b.color), abajo2: hex(b.color2 ?? '#141014'),
    zapato: hex(l.zapatos.color), zapato2: hex(l.zapatos.color2 ?? '#f4f2ee'),
    medias: l.medias ? hex(l.medias) : null, guantes: l.guantes ? hex(l.guantes) : null,
    manga: mangas[a.estilo] ?? 'corta',
    pierna: a.estilo === 'vestido' ? 'piel' : (piernas[b.estilo] ?? 'larga'),
  };
}

/** Pinta una pose del humano. `cuadro` mueve la capa y el pelo con el viento. */
export function pintarPose(look: ChibiLook, talla: Talla, pose: Pose, cuadro = 0): Render {
  const m = medidas(talla, look.contextura);
  const [W, Hc] = m.celda;
  const vistaPedida: Vista = pose.vista ?? 'lado';
  const vista: 'lado' | 'frente' | 'espalda' = vistaPedida === 'frente34' ? 'frente' : vistaPedida === 'espalda34' ? 'espalda' : vistaPedida;
  const R = ropa(look);
  const k = m.k;
  const base = medidas(talla, 'adulto');
  const kp = k * ((m.muslo + m.canilla) / (base.muslo + base.canilla)); // escala de las piernas
  const kb = k * (largoBrazo(m) / largoBrazo(base));
  const p = { ...POSE_BASE, ...pose };
  const raiz: V2 = [Math.floor(W / 2) + 0.5, m.piso];

  // --- esqueleto ---
  const reposo = m.muslo + m.canilla + m.pieH - 0.6;
  const cad: V2 = [raiz[0] + p.cad[0] * k, raiz[1] - reposo + p.cad[1] * k];
  const eje: V2 = [Math.sin((p.incl * Math.PI) / 180), -Math.cos((p.incl * Math.PI) / 180)];
  const cuello: V2 = [cad[0] + eje[0] * m.torsoH, cad[1] + eje[1] * m.torsoH];
  const centro: V2 = [(cad[0] + cuello[0]) / 2, (cad[1] + cuello[1]) / 2];
  const lado = vista === 'lado';
  const sep = lado ? 0.6 : Math.max(1, m.torsoW / 2 - m.piernaW / 2);
  const cadD: V2 = lado ? [cad[0] + sep, cad[1]] : [cad[0] + sep, cad[1]];
  const cadT: V2 = lado ? [cad[0] - sep, cad[1]] : [cad[0] - sep, cad[1]];
  const hombroY = 1.2 * (m.talla === 32 ? 1 : 1.3);
  const hsep = lado ? 0.5 : m.torsoW / 2 + m.brazoW / 2 - 0.5;
  const hombroD: V2 = [cuello[0] - eje[0] * hombroY + (lado ? hsep : hsep), cuello[1] - eje[1] * hombroY];
  const hombroT: V2 = [cuello[0] - eje[0] * hombroY - hsep, cuello[1] - eje[1] * hombroY];
  const tob = (pp: [number, number, number?]): V2 => [raiz[0] + pp[0] * kp, raiz[1] - pp[1] * kp - (m.pieH - 0.5)];
  const largoM = m.muslo + 0.3, largoC = m.canilla + 0.3;
  const adelante = (q: V2) => (p.rodillaAtras ? -q[0] : q[0]);
  let tobD = alcanza(cadD, tob(p.pieD), largoM + largoC), tobT = alcanza(cadT, tob(p.pieT), largoM + largoC);
  // piernas cortas: si casi están estiradas se dibujan rectas (una rodilla de 1 px se ve quebrada)
  const recta = (c: V2, t: V2, r: V2): V2 => (Math.hypot(t[0] - c[0], t[1] - c[1]) > (largoM + largoC) * 0.86 ? [(c[0] + t[0]) / 2, (c[1] + t[1]) / 2] : r);
  let rodD = recta(cadD, tobD, ik(cadD, tobD, largoM, largoC, adelante)), rodT = recta(cadT, tobT, ik(cadT, tobT, largoM, largoC, adelante));
  if (!lado) { rodD = ik(cadD, tobD, largoM, largoC, (q) => q[0]); rodT = ik(cadT, tobT, largoM, largoC, (q) => -q[0]); }
  const mano = (h: V2, mm: V2): V2 => [h[0] + mm[0] * kb, h[1] + mm[1] * kb];
  const lb = m.brazo + 0.2, la = m.antebrazo + 0.2;
  let munD = alcanza(hombroD, mano(hombroD, p.manoD), lb + la), munT = alcanza(hombroT, mano(hombroT, p.manoT), lb + la);
  const abajoAtras = (q: V2) => q[1] * 2 - q[0];
  let codD = ik(hombroD, munD, lb, la, lado ? abajoAtras : (q) => q[1] + q[0] * 0.5);
  let codT = ik(hombroT, munT, lb, la, lado ? abajoAtras : (q) => q[1] - q[0] * 0.5);
  let cuelloR = cuello, cadR = cad;

  // giro de todo el cuerpo
  const rot = p.rot ?? 0;
  let cuartos = 0;
  if (rot) {
    const c = centro;
    const r = (q: V2) => rotar(q, c, rot);
    [tobD, tobT, rodD, rodT, munD, munT, codD, codT] = [tobD, tobT, rodD, rodT, munD, munT, codD, codT].map(r);
    const hd = r(hombroD), ht = r(hombroT), cd = r(cadD), ct = r(cadT);
    hombroD[0] = hd[0]; hombroD[1] = hd[1]; hombroT[0] = ht[0]; hombroT[1] = ht[1];
    cadD[0] = cd[0]; cadD[1] = cd[1]; cadT[0] = ct[0]; cadT[1] = ct[1];
    cuelloR = r(cuello); cadR = r(cad);
    cuartos = Math.round(rot / 90);
  }

  const capas: Capa[] = [];
  const nueva = (contorno = true) => capa(W, Hc, contorno);

  // --- cabeza pintada ---
  const cab = pintarCabezaVideo(look, vistaPedida, p.gesto ?? 'normal');
  // dónde va el ancla del cuello de la cabeza, ya girada
  const giraAncla = (x: number, y: number, w: number, h: number, q: number): V2 => {
    q = ((q % 4) + 4) % 4;
    if (q === 0) return [x, y];
    if (q === 1) return [h - 1 - y, x];
    if (q === 2) return [w - 1 - x, h - 1 - y];
    return [y, w - 1 - x];
  };
  const ancla = giraAncla(cab.cuello[0], cab.cuello[1], cab.cara.w, cab.cara.h, cuartos);
  const off = rotar([p.cab[0] * k, p.cab[1] * k + 0.5], [0, 0], rot);
  const cabPos: V2 = [Math.round(cuelloR[0] + off[0] - ancla[0]), Math.round(cuelloR[1] + off[1] - ancla[1])];
  const pegaCabeza = (src: Capa) => { const c = nueva(); pegar(c, src, cabPos[0], cabPos[1], cuartos); return c; };

  // --- piezas ---
  const brazo = (h: V2, codo: V2, mu: V2, forma: Mano, lejos: boolean): Capa => {
    const c = nueva();
    c.lejos = lejos && lado;
    const piel = R.piel, ar = R.arriba;
    const colB = (t: number) => (R.manga === 'nada' ? piel : R.manga === 'corta' ? (t < 0.75 ? ar : piel) : ar);
    const colA = (t: number) => (R.manga === 'larga' ? (t > 0.8 && look.arriba.estilo === 'jeogori' ? R.arriba2 : ar) : R.manga === 'media' ? (t < 0.45 ? ar : piel) : piel);
    const rainbow = look.arriba.estilo === 'jeogori';
    const arco = [hex('#e8455a'), hex('#f4c430'), hex('#3fbf6a'), hex('#3fa8c8'), hex('#8a4fd8')];
    barra(c, h[0], h[1], codo[0], codo[1], m.brazoW, (t) => (rainbow ? arco[Math.min(4, Math.floor(t * 2.5))] : colB(t)), 0.6);
    barra(c, codo[0], codo[1], mu[0], mu[1], m.brazoW, (t) => (rainbow ? arco[Math.min(4, 2 + Math.floor(t * 2.5))] : colA(t)), 0.6);
    // mano
    const g = R.guantes ?? R.piel;
    const dir: V2 = [mu[0] - codo[0], mu[1] - codo[1]];
    const L = Math.hypot(dir[0], dir[1]) || 1;
    const u: V2 = [dir[0] / L, dir[1] / L];
    const hm = m.mano;
    if (forma === 'palma' || forma === 'abierta') {
      barra(c, mu[0], mu[1], mu[0] + u[0] * (hm - 0.5), mu[1] + u[1] * (hm - 0.5), forma === 'palma' ? hm : hm - 1, () => g, 0.5);
    } else {
      const cx = mu[0] + u[0] * (hm / 2 - 0.3), cy = mu[1] + u[1] * (hm / 2 - 0.3);
      rect(c, Math.round(cx - hm / 2), Math.round(cy - hm / 2), hm, hm, g);
    }
    return c;
  };
  const pierna = (cd: V2, rod: V2, tb: V2, ang: number, lejos: boolean, cual: 'D' | 'T'): Capa => {
    const c = nueva();
    c.lejos = lejos && lado;
    const piel = R.piel, ab = R.abajo;
    const altas = look.zapatos.estilo === 'tacos' || look.zapatos.estilo === 'botas';
    const media = (t: number) => (R.medias !== null && (altas ? t > 0.25 : t > 0.75) ? R.medias : null);
    const bota = (t: number) => (look.zapatos.estilo === 'botas' && t > 0.35) || (look.zapatos.estilo === 'botines' && t > 0.7);
    const colM = (t: number) => {
      if (R.pierna === 'larga' || R.pierna === 'falda_larga') return ab;
      if (R.pierna === 'bermuda') return ab;
      if (R.pierna === 'corta') return t < 0.75 ? ab : piel;
      return piel;
    };
    const colC = (t: number) => {
      if (bota(t)) return R.zapato;
      if (R.pierna === 'larga' || R.pierna === 'falda_larga') return look.abajo.estilo === 'gi' && t > 0.85 && look.zapatos.estilo === 'descalzo' ? sombra(ab) : ab;
      if (R.pierna === 'bermuda' && t < 0.3) return ab;
      return media(t) ?? piel;
    };
    barra(c, cd[0], cd[1], rod[0], rod[1], m.piernaW, (t) => colM(t), 0.7);
    barra(c, rod[0], rod[1], tb[0], tb[1], m.piernaW, (t) => colC(t), 0.7);
    // el pie: del talón a la punta
    const dirAng = ((lado ? 0 : 90) - (ang ?? 0)) * (Math.PI / 180) + ((rot * Math.PI) / 180);
    const u: V2 = lado ? [Math.cos(-(ang ?? 0) * Math.PI / 180 + rot * Math.PI / 180), Math.sin(-(ang ?? 0) * Math.PI / 180 + rot * Math.PI / 180)] : [0, 0];
    void dirAng;
    const est = look.zapatos.estilo;
    const z = est === 'descalzo' ? R.piel : est === 'sandalias' ? R.piel : R.zapato;
    if (lado) {
      const atras = m.talla === 32 ? 1.2 : 1.8;
      const largo = m.pieL - atras - 0.5;
      const ph = m.pieH + (est === 'pantuflas' ? 0.6 : 0);
      // alinear el pie: la suela abajo
      const nrm: V2 = [-u[1], u[0]];
      const a0: V2 = [tb[0] - u[0] * atras + nrm[0] * 0.2, tb[1] - u[1] * atras + nrm[1] * 0.2];
      const a1: V2 = [tb[0] + u[0] * largo, tb[1] + u[1] * largo];
      // el pie va de la canilla hacia abajo: centro de la barra medio pie abajo del tobillo
      const bajo = (ph - 1) / 2;
      barra(c, a0[0] + nrm[0] * bajo, a0[1] + nrm[1] * bajo, a1[0] + nrm[0] * bajo, a1[1] + nrm[1] * bajo, Math.round(ph), (_t, lado2) => {
        if (est === 'tenis' || est === 'tacos') return lado2 > 0 && ph >= 2 ? R.zapato2 : z;
        if (est === 'sandalias') return lado2 < 0 ? R.zapato : R.piel;
        if (est === 'pantuflas') return lado2 > 0 ? luz(R.zapato) : R.zapato;
        return z;
      }, 0.2);
    } else {
      // de frente o de espaldas: un bloque bajo la canilla
      const pw = m.piernaW + 1, ph = m.pieH;
      const x0 = Math.round(tb[0] - pw / 2 + (cual === 'D' ? 0.5 : -0.5)), y0 = Math.round(tb[1] - 0.5);
      for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) pon(c, x0 + i, y0 + j, (est === 'tenis' || est === 'tacos') && j === ph - 1 ? R.zapato2 : z, 1);
    }
    return c;
  };

  const torso = (): Capa => {
    const c = nueva();
    const tw = m.torsoW, th = m.torsoH;
    const est = look.arriba.estilo;
    const nx = -eje[1], ny = eje[0]; // normal (adelante cuando mira a la derecha)
    // rectángulo del torso en coordenadas locales (u: atrás -1 .. adelante 1, v: 0 arriba .. 1 abajo)
    const ancho = tw;
    const abajoExtra = 1;
    const pts: V2[] = [];
    const P = (u: number, v: number): V2 => {
      const along = th * (1 - v) - abajoExtra * v; // desde la cadera hacia arriba
      return rotar([cad[0] + eje[0] * along + nx * u * ancho / 2, cad[1] + eje[1] * along + ny * u * ancho / 2], centro, rot);
    };
    pts.push(P(-1, 0.12), P(-0.78, 0), P(0.78, 0), P(1, 0.12), P(1, 1), P(-1, 1));
    const belly = look.contextura === 'robusta';
    if (belly && lado) { pts.splice(4, 0, P(1.2, 0.7)); }
    const cc = rotar(cad, centro, rot), nn = rotar(cuello, centro, rot);
    const ex: V2 = [nn[0] - cc[0], nn[1] - cc[1]];
    const exL = Math.hypot(ex[0], ex[1]) || 1;
    const ux = ex[0] / exL, uy = ex[1] / exL; // eje hacia arriba ya girado
    const nxx = -uy, nyy = ux;
    const local = (x: number, y: number): [number, number] => {
      const px = x + 0.5 - cc[0], py = y + 0.5 - cc[1];
      const along = px * ux + py * uy, across = px * nxx + py * nyy;
      return [across / (ancho / 2), 1 - along / th];
    };
    const ar = R.arriba, ar2 = R.arriba2, ar3 = R.arriba3, ab = R.abajo;
    const cintura = est === 'vestido' || est === 'kimono' || est === 'delantal' ? 2 : 0.8;
    const color = (x: number, y: number): number => {
      const [u, v] = local(x, y);
      const uu = lado ? u : u; // de frente u es izquierda/derecha
      const frenteU = lado ? uu : -Math.abs(uu) + 1 - 1; // de frente: centro = 0
      void frenteU;
      const centroU = lado ? uu - 0.35 : uu; // donde cae el centro del pecho
      const fila = v * th; // fila desde arriba
      // cintura con el pantalón
      if (v > cintura && !['vestido', 'kimono', 'delantal', 'bano'].includes(est)) {
        if (look.abajo.estilo === 'gi') return ab;
        return ab;
      }
      let col = ar;
      switch (est) {
        case 'nada': col = R.piel; if (fila > th - 1.6) col = ab; return col;
        case 'franelilla': case 'top': case 'bano':
          if (fila < 1 && Math.abs(centroU) < 0.5) return R.piel;
          if (est === 'top' && v > 0.6) return v > cintura ? ab : R.piel;
          break;
        case 'gi': case 'gi_sin_mangas': case 'kimono': {
          // escote en V y cinturón
          const vx = lado ? centroU : uu;
          if (fila < (m.talla === 32 ? 2 : 3) && Math.abs(vx - (lado ? 0.15 : 0)) < (m.talla === 32 ? 0.26 : 0.36) - fila * 0.13 && vista !== 'espalda') return R.piel;
          if (est === 'kimono') { if (Math.abs(vx - fila * 0.1) < 0.15 && vista !== 'espalda') return ar2; if (v > 0.62 && v < 0.88) return ar3 === hex('#141014') ? hex('#e86aa0') : ar3; }
          if (est !== 'kimono' && fila >= th - 2 && fila < th - 1) return ar3; // el cinturón
          if (est !== 'kimono' && fila >= th - 1) return ab;
          break;
        }
        case 'vinotinto': case 'camiseta':
          if (fila < 1 && vista !== 'espalda' && Math.abs(lado ? centroU : uu) < 0.32) return R.arriba3;
          if (fila < 1) return ar2;
          if (est === 'camiseta' && (Math.floor((uu + 1) * ancho / 2) % 3 === 0)) return ar2;
          break;
        case 'polo': case 'camisa':
          if (fila < 1 && (lado ? centroU > -0.2 : Math.abs(uu) < 0.6)) return est === 'polo' ? ar2 : hex('#f4f2ee');
          if (vista === 'frente' && Math.abs(uu) < 0.12 && fila < th * 0.6) return est === 'polo' ? sombra(ar) : sombra(ar);
          break;
        case 'chaqueta': case 'chaleco':
          if (vista === 'frente' && Math.abs(uu) < 0.32) return ar2;
          if (lado && centroU > 0.45) return ar2;
          break;
        case 'sudadera':
          if (vista === 'frente' && v > 0.55 && v < 0.82 && Math.abs(uu) < 0.5) return sombra(ar);
          break;
        case 'delantal':
          if (vista !== 'espalda' && fila > 1 && (lado ? centroU > -0.55 : Math.abs(uu) < 0.7)) return ar2;
          if (fila >= th) return ar2;
          break;
        case 'vestido':
          break;
        case 'pijama':
          if (vista === 'frente' && Math.abs(uu) < 0.1 && fila > 1) return ar2;
          break;
        case 'jeogori':
          if (fila > th * 0.5 && v <= cintura) return hex(look.abajo.color);
          if (vista === 'frente' && fila >= 1 && fila < 3 && Math.abs(uu) < 0.25) return ar2;
          if (lado && fila >= 1 && fila < 3 && centroU > 0.1 && centroU < 0.6) return ar2;
          break;
      }
      // estampados
      const pat = look.arriba.estampado ?? 'liso';
      const gx = Math.floor((u + 1) * ancho / 2), gy = Math.floor(fila);
      if (pat === 'rayas' && gy % 2 === 1) return ar2;
      if (pat === 'cuadros' && ((Math.floor(gx / 2) + Math.floor(gy / 2)) % 2 === 0)) return mezcla(ar, ar2, 0.5);
      if (pat === 'puntos' && (gx + gy * 2) % 4 === 0 && gy % 2 === 0) return ar2;
      if (pat === 'flores' && (gx + gy * 3) % 5 === 0) return ar2;
      if (pat === 'copos' && (gx + gy * 2) % 5 === 0 && gy % 2 === 1) return hex('#f4f2ee');
      return col;
    };
    poligono(c, pts.map((q) => [q[0], q[1]] as V2), (x, y) => color(x, y), 1);
    // falda y vestido: un trapecio que baja desde la cintura
    const falda = ['vestido', 'kimono'].includes(look.arriba.estilo) || ['falda', 'falda_larga'].includes(look.abajo.estilo);
    if (falda) {
      const colF = look.arriba.estilo === 'vestido' || look.arriba.estilo === 'kimono' ? R.arriba : R.abajo;
      const largo = look.abajo.estilo === 'falda_larga' ? m.muslo + m.canilla * 0.6 : m.muslo * (look.arriba.estilo === 'kimono' ? 0.9 : 0.75) + 0.5;
      const sale = look.abajo.estilo === 'falda_larga' ? 1.5 : 1.2;
      const b0 = P(-1.05, 1), b1 = P(1.05, 1);
      const dn: V2 = rotar([eje[0] * -largo, eje[1] * -largo], [0, 0], rot);
      const sd: V2 = rotar([nx * sale, ny * sale], [0, 0], rot);
      poligono(c, [[b0[0], b0[1] - 1], [b1[0], b1[1] - 1], [b1[0] + dn[0] + sd[0], b1[1] + dn[1] + sd[1]], [b0[0] + dn[0] - sd[0], b0[1] + dn[1] - sd[1]]], (_x, y) => {
        // borde de abajo con otro tono
        return (y >= Math.round(b0[1] + dn[1]) - 1) && look.abajo.estilo !== 'falda_larga' ? sombra(colF) : colF;
      }, 1);
    }
    // número o logo en el pecho (de frente) o en la espalda
    const pat = look.arriba.estampado ?? 'liso';
    const texto = pat === 'numero' ? (look.arriba.numero ?? '10').slice(0, 2) : pat === 'gg' ? 'GG' : null;
    if (texto && !rot) {
      const ink = est2ink();
      const cxT = vista === 'lado' ? cuello[0] + 1 : cuello[0];
      const n = vista === 'espalda' ? texto.length : (vista === 'lado' ? 1 : texto.length);
      const glyphs = vista === 'lado' ? texto.slice(-1) : texto.slice(0, n);
      const w = glyphs.length * 4 - 1;
      const x0 = Math.round(cxT - w / 2), y0 = Math.round(cuello[1] + (m.talla === 32 ? 1 : 2));
      if (m.talla === 48 || vista === 'espalda') glyphs.split('').forEach((g, gi) => (FONT[g] ?? FONT['0']).forEach((row, ry) => row.split('').forEach((b, rx) => { if (b === '1') pon(c, x0 + gi * 4 + rx, y0 + ry, ink, 0); })));
    }
    if (pat === 'corazon' || pat === 'estrella') {
      const cx = Math.round(lado ? cuello[0] + 1 : cuello[0]), cy = Math.round(cuello[1] + (m.talla === 32 ? 2 : 3));
      const ink = R.arriba2;
      const shape = pat === 'corazon' ? ['101', '111', '010'] : ['010', '111', '101'];
      if (!rot && vista !== 'espalda') shape.forEach((row, ry) => row.split('').forEach((b, rx) => { if (b === '1') pon(c, cx - 1 + rx, cy + ry, ink, 0); }));
    }
    // accesorios del cuerpo
    const acc = look.accesorio;
    if (acc && !rot) {
      const a1 = hex(acc.color), a2 = hex(acc.color2 ?? '#f4c430');
      if (acc.estilo === 'cinturon') { const y = Math.round(cad[1]) - 1; for (let x = Math.round(cad[0] - tw / 2); x < Math.round(cad[0] + tw / 2); x++) pon(c, x, y, a1, 0); pon(c, Math.round(cad[0] + (lado ? tw / 2 - 2 : 0)), y, a2, 0); }
      if (acc.estilo === 'collar') { const y = Math.round(cuello[1]) + 1; for (let i = -1; i <= 1; i++) pon(c, Math.round(cuello[0] + (lado ? 1 : 0)) + i, y + (i === 0 ? 1 : 0), a1, 0); }
      if (acc.estilo === 'bufanda') { const y = Math.round(cuello[1]); for (let x = Math.round(cuello[0] - tw / 2); x < Math.round(cuello[0] + tw / 2); x++) { pon(c, x, y, a1, 0); pon(c, x, y + 1, sombra(a1), 0); } }
      if (acc.estilo === 'rinonera') { const y = Math.round(cad[1]) - 2; const x = Math.round(cad[0] + (lado ? tw / 2 - 1 : -1)); rect(c, x, y, 3, 2, a1, 1); }
    }
    return c;
    function est2ink() { return look.arriba.estilo === 'vinotinto' ? R.arriba2 : R.arriba2; }
  };

  const util = (): Capa | null => {
    const u = look.utileria;
    if (!u || p.sinUtil) return null;
    const c = nueva();
    const c1 = hex(u.color), c2 = hex(u.color2 ?? '#f4f2ee');
    const ang = ((p.util ?? 25) + rot) * (Math.PI / 180);
    const d: V2 = [Math.sin(ang), -Math.cos(ang)];
    const mu = lado ? munD : munD;
    const s = m.talla === 32 ? 1 : 1.45;
    const L = (n: number) => n * s;
    const tip: V2 = [mu[0] + d[0] * L(1), mu[1] + d[1] * L(1)];
    const linea = (l0: number, l1: number, w: number, col: (t: number) => number) => barra(c, mu[0] + d[0] * L(l0), mu[1] + d[1] * L(l0), mu[0] + d[0] * L(l1), mu[1] + d[1] * L(l1), w, col, 0.4);
    switch (u.estilo) {
      case 'bate': linea(-1, 4, Math.round(2 * s) - (s > 1 ? 0 : 1) || 1, () => c1); linea(3, 9, Math.round(2 * s), (t) => (t > 0.9 ? sombra(c1) : c1)); break;
      case 'espada': linea(-1, 1, 2, () => c2); linea(1, 9, Math.round(2 * s), () => c1); barra(c, tip[0] - d[1] * 2, tip[1] + d[0] * 2, tip[0] + d[1] * 2, tip[1] - d[0] * 2, 1, () => c2, 0.3); break;
      case 'paleta': linea(-1, 4, 1, () => c1); elipse(c, mu[0] + d[0] * L(6), mu[1] + d[1] * L(6), 2.4 * s, 2.4 * s, c1, 1); break;
      case 'escoba': linea(-3, 7, 1, () => c1); linea(7, 10, Math.round(4 * s), () => c2); break;
      case 'varita': linea(-1, 4, 1, () => c1); { const q: V2 = [mu[0] + d[0] * L(5.5), mu[1] + d[1] * L(5.5)]; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) pon(c, q[0] + dx, q[1] + dy, c2, 0); } break;
      case 'raqueta': linea(-1, 3, 1, () => c1); elipse(c, mu[0] + d[0] * L(5.5), mu[1] + d[1] * L(5.5), 2.2 * s, 2.8 * s, c2, 0); break;
      case 'telefono': rect(c, Math.round(mu[0] - 1), Math.round(mu[1] - 2 * s), Math.round(2 * s), Math.round(3 * s), c1, 0); break;
      case 'taza': rect(c, Math.round(mu[0]), Math.round(mu[1] - 2 * s), Math.round(3 * s), Math.round(3 * s), c1, 1); pon(c, mu[0] + 3 * s, mu[1] - 1, c1, 0); break;
      case 'cuchara': linea(-1, 6, 1, () => c1); elipse(c, mu[0] + d[0] * L(7), mu[1] + d[1] * L(7), 1.6 * s, 1.6 * s, c1, 1); break;
      case 'microfono': linea(0, 3, Math.round(1.5 * s) || 1, () => c1); elipse(c, mu[0] + d[0] * L(3.5), mu[1] + d[1] * L(3.5), 1.4 * s, 1.4 * s, c2, 1); break;
      case 'paraguas': linea(-1, 10, 1, () => c2); { const q: V2 = [mu[0] + d[0] * L(10), mu[1] + d[1] * L(10)]; poligono(c, [[q[0] - 6 * s, q[1] + 2 * s], [q[0], q[1] - 2 * s], [q[0] + 6 * s, q[1] + 2 * s]], c1, 1); } break;
      case 'flor': linea(0, 4, 1, () => hex('#3fbf6a')); { const q: V2 = [mu[0] + d[0] * L(5), mu[1] + d[1] * L(5)]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) pon(c, q[0] + dx, q[1] + dy, c1, 0); pon(c, q[0], q[1], c2, 0); } break;
    }
    return c;
  };

  const capaEspalda = (): Capa | null => {
    const acc = look.accesorio;
    if (!acc || (acc.estilo !== 'capa' && acc.estilo !== 'mochila')) return null;
    const c = nueva();
    const a1 = hex(acc.color);
    if (acc.estilo === 'capa') {
      const v = (p.viento ?? cuadro) % 4;
      const top = rotar([cuello[0] - (lado ? 2 : 0), cuello[1] + 1], centro, rot);
      if (lado) {
        const largo = m.torsoH + m.muslo + 1;
        const flap = [0, 1, 2, 1][v];
        poligono(c, [[top[0] - 1, top[1]], [top[0] + 2, top[1]], [top[0] - 2 - flap, top[1] + largo], [top[0] - 4 - flap * 2, top[1] + largo - 1 - flap]], (x, y) => ((x + y) % 5 === 0 ? sombra(a1) : a1), 1);
      } else {
        const largo = m.torsoH + m.muslo;
        poligono(c, [[cuello[0] - m.torsoW / 2, cuello[1] + 1], [cuello[0] + m.torsoW / 2, cuello[1] + 1], [cuello[0] + m.torsoW / 2 + 2, cuello[1] + largo], [cuello[0] - m.torsoW / 2 - 2, cuello[1] + largo]], a1, 1);
      }
    } else {
      const x = Math.round(lado ? cuello[0] - m.torsoW / 2 - 2 : cuello[0] - m.torsoW / 2 + 1), y = Math.round(cuello[1] + 1);
      rect(c, x, y, lado ? 3 : m.torsoW - 2, m.torsoH - 1, a1, 1);
      if (!lado) rect(c, x + 1, y + 2, m.torsoW - 4, 2, sombra(a1), 0);
    }
    return c;
  };

  // --- orden de capas ---
  const capaEsp = capaEspalda();
  const pelos = pegaCabeza(cab.atras);
  const cabeza = pegaCabeza(cab.cara);
  const bD = brazo(hombroD, codD, munD, p.formaD ?? 'puno', false);
  const bT = brazo(hombroT, codT, munT, p.formaT ?? 'puno', true);
  const pD = pierna(cadD, rodD, tobD, p.pieD[2] ?? 0, false, 'D');
  const pT = pierna(cadT, rodT, tobT, p.pieT[2] ?? 0, true, 'T');
  const tor = torso();
  const ut = util();
  if (vista === 'lado') {
    if (capaEsp && look.accesorio?.estilo === 'capa') capas.push(capaEsp);
    capas.push(pelos, bT, pT, pD, tor);
    if (capaEsp && look.accesorio?.estilo === 'mochila') capas.push(capaEsp);
    capas.push(cabeza);
    if (ut) capas.push(ut);
    capas.push(bD);
  } else if (vista === 'frente') {
    if (capaEsp) capas.push(capaEsp);
    capas.push(pelos, pT, pD, tor, bT, bD, cabeza);
    if (ut) capas.push(ut);
  } else {
    capas.push(pelos, pT, pD, tor, bT, bD);
    if (ut) capas.push(ut);
    capas.push(cabeza);
    if (capaEsp) capas.push(capaEsp);
  }
  if ((globalThis as { __capas?: Capa[][] }).__capas) (globalThis as { __capas?: Capa[][] }).__capas!.push(capas);
  const img = juntar(capas, W, Hc, 1);
  if (p.espejo) {
    for (let y = 0; y < Hc; y++) for (let x = 0; x < W / 2; x++) for (let ch = 0; ch < 4; ch++) {
      const a = (y * W + x) * 4 + ch, b = (y * W + (W - 1 - x)) * 4 + ch;
      const t = img.data[a]; img.data[a] = img.data[b]; img.data[b] = t;
    }
  }
  const mx = (q: V2): V2 => (p.espejo ? [W - q[0], q[1]] : q);

  // --- cajas ---
  const bbox = (cs: Capa[]): [number, number, number, number] | undefined => {
    let x0 = W, y0 = Hc, x1 = -1, y1 = -1;
    for (const c of cs) for (let y = 0; y < Hc; y++) for (let x = 0; x < W; x++) if (c.col[y * W + x] !== VACIO) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return x1 < 0 ? undefined : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  };
  const hurt0 = bbox([tor, cabeza, pD, pT]) ?? [0, 0, 1, 1];
  const hurt: [number, number, number, number] = p.espejo ? [W - hurt0[0] - hurt0[2], hurt0[1], hurt0[2], hurt0[3]] : hurt0;
  const r2 = (q0: V2): V2 => { const q = mx(q0); return [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]; };
  const puntoUtil: V2 = look.utileria && !p.sinUtil ? (() => { const ang = ((p.util ?? 25) + rot) * (Math.PI / 180); const L = (m.talla === 32 ? 7 : 10); return [munD[0] + Math.sin(ang) * L, munD[1] - Math.cos(ang) * L] as V2; })() : munD;
  return {
    img, hurt,
    puntos: {
      manoD: r2(munD), manoT: r2(munT), pieD: r2(tobD), pieT: r2(tobT), cabeza: r2([cuelloR[0], cuelloR[1] - m.cabezaH / 2]), centro: r2(rotar(centro, centro, 0)), util: r2(puntoUtil),
    },
  };
  void cadR;
}

/** Caja de golpe de una parte (la mano, el pie, la utilería o el cuerpo entero) para una pose ya pintada. */
export function cajaGolpe(r: Render, parte: Parte, talla: Talla): [number, number, number, number] {
  const s = talla === 32 ? 3 : 4;
  if (parte === 'cuerpo') return r.hurt;
  const q = parte === 'cabeza' ? r.puntos.cabeza : parte === 'util' ? r.puntos.util : r.puntos[parte];
  return [Math.round(q[0] - s), Math.round(q[1] - s), s * 2 + 1, s * 2 + 1];
}

export type { Medidas };
