import type { ChibiLook, Peinado } from './look';
import type { Medidas } from './metrics';
import { capa, pon, hay, hex, mezcla, sombra, luz, elipse, poligono, VACIO, type Capa } from './paint';

/**
 * La cabeza chibi: un bloque redondeado con la cara pintada pixel a pixel, como en el video.
 * De lado la cara queda en 3/4 hacia donde mira (se ven los dos ojos corridos adelante),
 * de frente centrada y de espaldas solo pelo. La cabeza nunca se rota a ángulos raros:
 * solo en cuartos de vuelta, así los ojos de 1 px no se rompen.
 */

export type Vista = 'lado' | 'frente' | 'espalda' | 'frente34' | 'espalda34';
export type Gesto = 'normal' | 'golpe' | 'dolor' | 'ko' | 'feliz' | 'parpadeo' | 'sorpresa' | 'esfuerzo' | 'hablar' | 'dormido' | 'bravo' | 'triste';

export interface CabezaPintada {
  cara: Capa;
  /** Pelo largo, colas y trenzas: van detrás del cuerpo. */
  atras: Capa;
  /** Donde la cabeza se apoya en el torso (centro de abajo), en coordenadas de la capa. */
  cuello: [number, number];
  /** Margen: dónde empieza el bloque de la cabeza dentro de la capa. */
  mg: number;
}

const NEGRO = hex('#141014');
const BLANCO = hex('#fbfaf6');
const BOCA = hex('#3a1414');
const LENGUA = hex('#d8505a');

interface Perfil {
  /** Filas que tapa el pelo adelante (fracción del alto de la cabeza). */
  frente: number;
  /** Filas que tapa atrás en la coronilla. */
  corona: number;
  /** Hasta dónde baja el pelo por la nuca y los lados. */
  nuca: number;
  /** Filas de volumen encima de la cabeza. */
  vol: number;
  /** Pixeles de volumen detrás de la cabeza. */
  volAtras: number;
  forma?: 'puntas' | 'raya' | 'lado' | 'recto' | 'redondo' | 'rapado' | 'calvo' | 'afro' | 'mohicano' | 'erizo';
  tapaOreja?: boolean;
  /** Pelo que cae detrás del cuerpo. */
  cae?: 'largo' | 'cola' | 'colitas' | 'mono' | 'trenzas' | 'ondas' | 'recogido';
}

const PERFILES: Record<Peinado, Perfil> = {
  corto: { frente: 0.27, corona: 0.3, nuca: 0.6, vol: 1, volAtras: 0, forma: 'redondo' },
  puntas: { frente: 0.32, corona: 0.32, nuca: 0.6, vol: 2, volAtras: 1, forma: 'puntas' },
  atras: { frente: 0.18, corona: 0.3, nuca: 0.6, vol: 1, volAtras: 1, forma: 'redondo' },
  raya: { frente: 0.42, corona: 0.3, nuca: 0.66, vol: 1, volAtras: 0, forma: 'raya' },
  lado: { frente: 0.38, corona: 0.3, nuca: 0.62, vol: 1, volAtras: 0, forma: 'lado' },
  rapado: { frente: 0.2, corona: 0.25, nuca: 0.55, vol: 0, volAtras: 0, forma: 'rapado' },
  calvo: { frente: 0, corona: 0, nuca: 0.72, vol: 0, volAtras: 0, forma: 'calvo' },
  erizo: { frente: 0.3, corona: 0.3, nuca: 0.6, vol: 3, volAtras: 2, forma: 'erizo' },
  mohicano: { frente: 0.12, corona: 0.12, nuca: 0.4, vol: 3, volAtras: 0, forma: 'mohicano' },
  afro: { frente: 0.3, corona: 0.4, nuca: 0.75, vol: 3, volAtras: 3, forma: 'afro', tapaOreja: true },
  rizos: { frente: 0.32, corona: 0.4, nuca: 0.72, vol: 2, volAtras: 2, forma: 'afro', tapaOreja: true },
  bob: { frente: 0.34, corona: 0.35, nuca: 0.92, vol: 1, volAtras: 1, forma: 'recto', tapaOreja: true },
  flequillo: { frente: 0.4, corona: 0.35, nuca: 0.92, vol: 1, volAtras: 1, forma: 'recto', tapaOreja: true },
  ondas: { frente: 0.3, corona: 0.32, nuca: 1, vol: 1, volAtras: 1, forma: 'lado', tapaOreja: true, cae: 'ondas' },
  largo: { frente: 0.3, corona: 0.32, nuca: 1, vol: 1, volAtras: 1, forma: 'raya', tapaOreja: true, cae: 'largo' },
  cola: { frente: 0.28, corona: 0.3, nuca: 0.62, vol: 1, volAtras: 0, forma: 'redondo', cae: 'cola' },
  colitas: { frente: 0.32, corona: 0.3, nuca: 0.62, vol: 1, volAtras: 0, forma: 'recto', cae: 'colitas' },
  trenzas: { frente: 0.28, corona: 0.3, nuca: 0.62, vol: 1, volAtras: 0, forma: 'raya', cae: 'trenzas' },
  mono: { frente: 0.26, corona: 0.3, nuca: 0.58, vol: 1, volAtras: 0, forma: 'redondo', cae: 'mono' },
  recogido: { frente: 0.22, corona: 0.3, nuca: 0.55, vol: 2, volAtras: 1, forma: 'redondo', cae: 'recogido' },
};

export function pintarCabeza(look: ChibiLook, m: Medidas, vistaPedida: Vista, gesto: Gesto = 'normal'): CabezaPintada {
  // las diagonales usan la cabeza de frente o de espaldas con la cara corrida hacia el lado
  const v34 = vistaPedida === 'frente34' || vistaPedida === 'espalda34';
  const vista: 'lado' | 'frente' | 'espalda' = vistaPedida === 'frente34' ? 'frente' : vistaPedida === 'espalda34' ? 'espalda' : vistaPedida;
  const W = m.cabezaW, H = m.cabezaH, S = m.talla === 32;
  const mg = S ? 9 : 12;
  const cw = W + mg * 2, ch = H + mg * 2 + (S ? 10 : 14);
  const cara = capa(cw, ch), atras = capa(cw, ch);
  const P = (c: Capa, x: number, y: number, v: number, som = 0) => pon(c, mg + x, mg + y, v, som);
  const H0 = (c: Capa, x: number, y: number) => hay(c, mg + x, mg + y);
  const piel = hex(look.piel), pielS = sombra(piel);
  const pelo = hex(look.pelo.color), peloS = sombra(pelo), peloL = luz(pelo);
  const perfil = PERFILES[look.pelo.estilo];

  // --- el bloque de la cabeza, con las esquinas redondeadas ---
  const cortes = S ? [2, 1] : [3, 2, 1];
  const cortesAbajo = S ? [1] : [2, 1];
  const dentro = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const ct = y < cortes.length ? cortes[y] : 0;
    const yb = H - 1 - y;
    const cb = yb < cortesAbajo.length ? cortesAbajo[yb] : 0;
    const c = Math.max(ct, cb);
    return x >= c && x < W - c;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dentro(x, y)) P(cara, x, y, piel, 0);
  // la sombra de la quijada (abajo y atrás) en la piel
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!dentro(x, y)) continue;
    if (!dentro(x, y + 1) && y > H / 2) P(cara, x, y, pielS);
  }

  // --- geometría de la cara ---
  const eyeH = S ? 2 : 3;
  const eyeY = Math.round(H * (S ? 0.47 : 0.46));
  const ojos: [number, number] = vista === 'lado' ? (S ? [W - 7, W - 3] : [W - 9, W - 4]) : (S ? [Math.floor(W / 2) - 3 + (W % 2 ? 1 : 0), W - 4] : [4, W - 5]);
  if (vista === 'frente' && S && W % 2) ojos[0] = Math.floor(W / 2) - 2, ojos[1] = Math.floor(W / 2) + 2;
  const corre = v34 && vista === 'frente' ? (S ? 1 : 2) : 0;
  ojos[0] += corre; ojos[1] += corre;
  const bocaX0 = vista === 'lado' ? Math.round((ojos[0] + ojos[1]) / 2) : Math.floor(W / 2) - (W % 2 ? 0 : 1);
  const bocaX = bocaX0 + corre;
  const bocaY = eyeY + eyeH + (S ? 1 : 2);
  const oreja = vista === 'lado' ? [S ? 2 : 3] : v34 ? (vista === 'frente' ? [-1] : [W]) : [-1, W];

  // --- orejas (antes del pelo, el pelo las puede tapar) ---
  if (vista !== 'espalda' || true) {
    for (const ox of oreja) {
      for (let j = 0; j < (S ? 2 : 3); j++) P(cara, ox, eyeY + j, j === (S ? 1 : 1) && vista === 'lado' ? pielS : piel, 0);
      if (vista === 'lado') P(cara, ox + 1, eyeY + (S ? 1 : 1), pielS);
    }
  }

  // --- pelo ---
  const tapa = (x: number, y: number) => {
    // ¿el pelo tapa este pixel de la cabeza? (coordenadas del bloque)
    const f = perfil;
    const u = vista === 'lado' ? x / (W - 1) : Math.abs(x - (W - 1) / 2) / ((W - 1) / 2); // lado: 0 atrás 1 adelante; frente: 0 centro 1 borde
    if (f.forma === 'calvo') {
      if (vista === 'lado') return x <= W * 0.3 && y >= H * 0.35 && y < H * f.nuca;
      if (vista === 'espalda') return y >= H * 0.4 && y < H * f.nuca;
      return u > 0.85 && y >= H * 0.35 && y < H * 0.62;
    }
    if (vista === 'espalda') return y < H * Math.max(f.nuca, 0.8) + (f.cae ? 1 : 0);
    let prof: number;
    if (vista === 'lado') {
      if (u < 0.34) prof = f.nuca; // atrás: baja por la nuca
      else if (u < 0.5) prof = f.corona + (f.nuca - f.corona) * (0.5 - u) / 0.16;
      else prof = f.corona + (f.frente - f.corona) * (u - 0.5) / 0.5;
      if (f.forma === 'puntas' && u > 0.5) prof += ((x % 2) ? 0.1 : -0.02);
      if (f.forma === 'raya' && u > 0.55) prof = f.frente + (u - 0.55) * 0.35;
      if (f.forma === 'lado' && u > 0.5) prof = f.frente * (0.7 + 0.6 * (u - 0.5));
      if (f.forma === 'recto' && u > 0.45) prof = f.frente;
      if (f.forma === 'mohicano') prof = u < 0.2 ? 0 : f.frente;
      if (f.forma === 'erizo' && u > 0.5) prof += (x % 2) ? 0.12 : 0;
      if (f.forma === 'afro') prof = u < 0.4 ? f.nuca : f.frente;
    } else {
      // de frente: el flequillo en el centro y los lados bajan hasta la nuca
      prof = u > 0.82 ? f.nuca : f.frente + (u > 0.6 ? (f.corona - f.frente) * 0.5 : 0);
      if (f.forma === 'raya') prof = x < W / 2 ? f.frente + 0.12 : f.frente - 0.05;
      if (f.forma === 'lado') prof = f.frente - 0.1 + (x / W) * 0.25;
      if (f.forma === 'puntas' || f.forma === 'erizo') prof += (x % 2) ? 0.08 : -0.02;
      if (f.forma === 'mohicano') return u < 0.3 && y < H * 0.25;
      if (!f.tapaOreja && u > 0.82 && y > eyeY - 1) return false;
    }
    if (f.forma === 'rapado') return y < H * prof;
    return y < Math.round(H * prof);
  };

  const peloEn = (c: Capa, x: number, y: number) => {
    // brillo: una vetita clara arriba adelante; sombra en el borde de abajo
    let v = pelo;
    if (perfil.forma === 'rapado') v = mezcla(pelo, piel, 0.45);
    P(c, x, y, v, 1);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dentro(x, y) && tapa(x, y)) peloEn(cara, x, y);
  // las orejas tapadas por pelo largo
  if (perfil.tapaOreja) for (const ox of oreja) for (let j = 0; j < 3; j++) if (H0(cara, ox, eyeY + j)) P(cara, ox, eyeY + j, pelo, 1);
  if (vista === 'espalda') for (const ox of oreja) for (let j = 0; j < 3; j++) if (H0(cara, ox, eyeY + j) && eyeY + j < H * perfil.nuca) P(cara, ox, eyeY + j, pelo, 1);

  // volumen encima y detrás
  const vol = perfil.vol + (S ? 0 : (perfil.vol > 0 ? 1 : 0));
  if (perfil.forma !== 'calvo' && perfil.forma !== 'rapado') {
    for (let v = 1; v <= vol; v++) {
      const y = -v;
      for (let x = 0; x < W; x++) {
        const u = vista === 'lado' ? x / (W - 1) : Math.abs(x - (W - 1) / 2) / ((W - 1) / 2);
        let ok: boolean;
        if (perfil.forma === 'puntas' || perfil.forma === 'erizo') {
          const per = S ? 3 : 4;
          const fase = vista === 'lado' ? x : Math.abs(x - (W - 1) / 2) + 1;
          ok = (fase + v) % per !== 0 && u < (vista === 'lado' ? 0.92 : 0.9) - (v - 1) * 0.22 && (vista !== 'lado' || u > 0.05 + (v - 1) * 0.1);
          if (perfil.forma === 'erizo' && vista === 'lado') ok = (x + v * 2) % per !== 0 && u < 0.8 - (v - 1) * 0.15 && u > (v - 1) * 0.08;
        } else if (perfil.forma === 'mohicano') {
          ok = vista === 'lado' ? u > 0.15 && u < 0.85 - v * 0.08 : u < 0.25;
        } else if (perfil.forma === 'afro') {
          const inset = Math.round((v - 1) * (S ? 1.3 : 1.6)) + (S ? 1 : 1);
          ok = vista === 'lado' ? x >= inset - 1 && x < W - inset : x >= inset && x < W - inset;
          if (v === vol && (x % 2)) ok = false;
        } else {
          const inset = Math.round(v * (S ? 2 : 2.4)) + (vista === 'lado' ? 0 : 0);
          ok = vista === 'lado' ? x >= inset - (perfil.volAtras ? 1 : 0) && x < W - inset - (perfil.forma === 'redondo' ? 0 : 0) : x >= inset && x < W - inset;
        }
        if (ok) peloEn(cara, x, y);
      }
    }
    // detrás de la cabeza (lado) o a los costados (frente / espalda)
    const va = perfil.volAtras + (S ? 0 : (perfil.volAtras ? 1 : 0));
    for (let a = 1; a <= va; a++) for (let y = Math.round(H * 0.08) + a - 1; y < Math.round(H * perfil.nuca) - a + (perfil.forma === 'afro' ? 1 : 0); y++) {
      if (perfil.forma === 'afro' && y % 2 && a === va) continue;
      if (vista === 'lado') peloEn(cara, -a, y);
      else { peloEn(cara, -a, y); peloEn(cara, W - 1 + a, y); }
    }
  }

  // pelo que cae detrás del cuerpo
  const cae = perfil.cae;
  const c2 = hex(look.pelo.color2 ?? '#e8455a');
  if (cae === 'largo' || cae === 'ondas') {
    const hasta = H + (S ? 6 : 9);
    if (vista === 'lado') {
      for (let y = Math.round(H * 0.25); y < hasta; y++) {
        const w = Math.round(W * 0.42) + (cae === 'ondas' && y % 3 === 0 ? 1 : 0);
        for (let x = -1 - (y > H ? 0 : 0); x < w - 1; x++) P(atras, x, y, pelo, 1);
      }
    } else {
      for (let y = Math.round(H * 0.3); y < hasta; y++) for (let x = -1; x < W + 1; x++) {
        if (vista === 'frente' && x > 1 && x < W - 2 && y >= Math.round(H * 0.3)) continue;
        P(atras, x, y, pelo, 1);
      }
      if (vista === 'espalda') for (let y = H; y < hasta; y++) for (let x = 0; x < W; x++) P(cara, x, y, pelo, 1);
    }
  } else if (cae === 'cola') {
    const largo = S ? 7 : 10, ancho = S ? 3 : 4;
    if (vista === 'lado') {
      for (let j = 0; j < largo; j++) for (let i = 0; i < ancho - (j > largo - 3 ? 1 : 0); i++) P(atras, -2 - i - Math.floor(j / 4), Math.round(H * 0.15) + j, pelo, 1);
      P(cara, -1, Math.round(H * 0.15), c2); P(cara, -1, Math.round(H * 0.15) + 1, c2);
    } else if (vista === 'espalda') {
      const cx = Math.floor(W / 2) - 1;
      for (let j = 0; j < largo + 2; j++) for (let i = 0; i < ancho - 1; i++) P(cara, cx + i, Math.round(H * 0.3) + j, pelo, 1);
      P(cara, cx, Math.round(H * 0.3), c2); P(cara, cx + 1, Math.round(H * 0.3), c2);
    } else {
      for (let j = 0; j < 4; j++) P(atras, W + Math.floor(j / 2), Math.round(H * 0.25) + j + 2, pelo, 1);
    }
  } else if (cae === 'colitas' || cae === 'trenzas') {
    const largo = cae === 'trenzas' ? (S ? 9 : 13) : (S ? 6 : 9);
    const lados = vista === 'lado' ? [-1] : [-1, 1];
    for (const sx of lados) {
      for (let j = 0; j < largo; j++) {
        const x0 = sx < 0 ? -2 - (j < 3 ? Math.floor(j / 1.5) : 2) : W + 1 + (j < 3 ? Math.floor(j / 1.5) : 2);
        const w = cae === 'trenzas' ? 2 : (j < largo - 2 ? 3 : 2);
        for (let i = 0; i < w; i++) {
          const xx = sx < 0 ? x0 - i + 1 : x0 + i - 1;
          const v = cae === 'trenzas' && (j + i) % 2 ? peloS : pelo;
          P(vista === 'espalda' ? cara : atras, xx, Math.round(H * 0.4) + j, v, 0);
        }
      }
      const tx = sx < 0 ? -1 : W;
      P(cara, tx, Math.round(H * 0.4), c2); P(cara, tx, Math.round(H * 0.4) + 1, c2);
    }
  } else if (cae === 'mono' || cae === 'recogido') {
    const r = cae === 'mono' ? (S ? 2.6 : 3.6) : (S ? 2 : 2.8);
    const cx = vista === 'lado' ? W * 0.22 : W / 2, cy = cae === 'mono' ? -(S ? 2 : 3) : (vista === 'lado' ? H * 0.2 : -1);
    const tmp = capa(cara.w, cara.h);
    elipse(tmp, mg + cx, mg + cy, r, r * 0.9, pelo, 1);
    for (let i = 0; i < tmp.col.length; i++) if (tmp.col[i] !== VACIO && cara.col[i] === VACIO) { cara.col[i] = tmp.col[i]; cara.som[i] = 1; }
  }

  // brillo del pelo
  if (perfil.forma !== 'calvo' && perfil.forma !== 'rapado' && vista !== 'espalda') {
    const by = vol > 0 ? -vol + 1 : 0;
    const bx0 = vista === 'lado' ? Math.round(W * 0.45) : Math.round(W * 0.25);
    for (let i = 0; i < (S ? 2 : 3); i++) if (H0(cara, bx0 + i, by) && cara.col[(mg + by) * cara.w + mg + bx0 + i] === pelo) P(cara, bx0 + i, by, peloL, 0);
  } else if (perfil.forma === 'calvo' && vista !== 'espalda') {
    P(cara, Math.round(W * 0.55), 1, luz(piel)); P(cara, Math.round(W * 0.55) + 1, 1, luz(piel));
  }

  // --- la cara ---
  if (vista !== 'espalda') pintarCara(look, m, vista, gesto, { P: (x, y, v) => P(cara, x, y, v, 0), get: (x, y) => cara.col[(mg + y) * cara.w + mg + x], W, H, eyeY, eyeH, ojos, bocaX, bocaY, oreja, piel });

  // --- gorro ---
  if (look.gorro) pintarGorro(look, m, vista, { cara, atras, mg, W, H, eyeY, oreja, pelo });

  // sombra del pelo y del gorro sobre la frente: 1 px bajo el borde
  if (vista !== 'espalda') {
    for (let x = 0; x < W; x++) for (let y = 1; y < H - 1; y++) {
      const v = cara.col[(mg + y) * cara.w + mg + x], arriba = cara.col[(mg + y - 1) * cara.w + mg + x];
      if (v === piel && arriba !== piel && arriba !== pielS && arriba !== VACIO && arriba !== NEGRO && dentro(x, y - 1) && !isFace(arriba)) P(cara, x, y, pielS);
    }
  }

  const cuello: [number, number] = [mg + (vista === 'lado' ? Math.round(W * 0.48) : Math.floor(W / 2)), mg + H];
  return { cara, atras, cuello, mg };

  function isFace(v: number) { return v === BOCA || v === LENGUA || v === BLANCO; }
}

interface CaraCtx {
  P: (x: number, y: number, v: number) => void;
  get: (x: number, y: number) => number;
  W: number; H: number; eyeY: number; eyeH: number; ojos: [number, number]; bocaX: number; bocaY: number; oreja: number[]; piel: number;
}

function pintarCara(look: ChibiLook, m: Medidas, vista: Vista, gesto: Gesto, c: CaraCtx): void {
  const S = m.talla === 32;
  const { P, eyeY, eyeH, ojos, bocaX, bocaY, piel } = c;
  const ojoC = hex(look.ojos.color);
  const ceja = hex(look.cejas.color ?? (look.pelo.estilo === 'calvo' ? '#3a2a22' : look.pelo.color));
  const cejaV = mezcla(ceja, NEGRO, 0.35);
  const lado = vista === 'lado';
  let estiloOjo = look.ojos.estilo;
  let estiloCeja = look.cejas.estilo;
  let boca = look.boca;
  if (gesto === 'golpe' || gesto === 'bravo') { estiloCeja = 'bravas'; boca = gesto === 'golpe' ? 'abierta' : 'seria'; }
  if (gesto === 'esfuerzo') { estiloCeja = 'bravas'; }
  if (gesto === 'triste') { estiloCeja = 'tristes'; boca = 'seria'; }
  if (gesto === 'feliz') { estiloOjo = 'felices'; boca = 'abierta'; }
  if (gesto === 'sorpresa') boca = 'abierta';
  if (gesto === 'hablar') boca = 'abierta';

  // marcas antes de los ojos (el panda pinta parches oscuros alrededor)
  const panda = look.marca === 'panda';
  if (panda) for (const ex of ojos) for (let y = eyeY - 1; y <= eyeY + eyeH; y++) for (let x = ex - 1; x <= ex + (S ? 1 : 2); x++) {
    if ((y === eyeY - 1 || y === eyeY + eyeH) && (x === ex - 1 || x === ex + (S ? 1 : 2))) continue;
    P(x, y, hex('#2a2628'));
  }
  if (look.marca === 'cachetes' || gesto === 'feliz') {
    const rosa = mezcla(piel, hex('#ff6f8a'), 0.45);
    if (lado) { P(ojos[0] - 1, eyeY + eyeH, rosa); P(ojos[1] + 1, eyeY + eyeH, rosa); }
    else { P(ojos[0] - 1, eyeY + eyeH, rosa); P(ojos[1] + 1, eyeY + eyeH, rosa); }
  }
  if (look.marca === 'pecas') {
    const p = sombra(sombra(piel));
    P(ojos[0], eyeY + eyeH + 1, p); P(ojos[1] - 1, eyeY + eyeH + 1, p); P(ojos[1] + 1, eyeY + eyeH + 1, p);
  }
  if (look.marca === 'curita') { P(ojos[1], eyeY + eyeH + 1, hex('#f2d2a8')); P(ojos[1] + 1, eyeY + eyeH + 1, hex('#f2d2a8')); }
  if (look.marca === 'lunar') P(ojos[1] + 1, bocaY - 1, hex('#4a2a1e'));

  // --- ojos ---
  const ojoPix = (ex: number) => {
    const ojoN = panda ? BLANCO : NEGRO;
    if (gesto === 'ko') {
      // ojos en x
      if (S) { P(ex - 1, eyeY, NEGRO); P(ex, eyeY + 1, NEGRO); P(ex + 1, eyeY, NEGRO); P(ex - 1, eyeY + 2, NEGRO); P(ex + 1, eyeY + 2, NEGRO); }
      else for (let i = -1; i <= 1; i++) { P(ex + i, eyeY + 1 + i, NEGRO); P(ex - i, eyeY + 1 + i, NEGRO); }
      return;
    }
    if (gesto === 'dolor' || gesto === 'esfuerzo') {
      // apretados: > <
      const dir = ex === ojos[0] ? 1 : -1;
      P(ex - dir, eyeY, NEGRO); P(ex, eyeY + 1, NEGRO); P(ex - dir, eyeY + 2, NEGRO);
      return;
    }
    if (gesto === 'parpadeo' || gesto === 'dormido') { P(ex - (S ? 0 : 1), eyeY + eyeH - 1, NEGRO); P(ex + (S ? 1 : 1), eyeY + eyeH - 1, NEGRO); if (!S) P(ex, eyeY + eyeH - 1, NEGRO); return; }
    if (estiloOjo === 'felices') { P(ex - 1, eyeY + 1, NEGRO); P(ex, eyeY, NEGRO); P(ex + 1, eyeY + 1, NEGRO); return; }
    if (estiloOjo === 'dormilones') { P(ex, eyeY + eyeH - 1, ojoN); P(ex - 1, eyeY + eyeH - 2, NEGRO); P(ex + 1, eyeY + eyeH - 2, NEGRO); P(ex, eyeY + eyeH - 2, NEGRO); return; }
    if (estiloOjo === 'grandes' || (gesto === 'sorpresa')) {
      const w = 2;
      for (let y = 0; y < eyeH + (S ? 0 : 0); y++) for (let i = 0; i < w; i++) P(ex + i - (lado ? 0 : (ex === ojos[0] ? 0 : 1)), eyeY + y, y >= eyeH - 1 ? ojoC === NEGRO ? NEGRO : mezcla(ojoC, NEGRO, 0.3) : NEGRO);
      P(ex + (lado ? 1 : (ex === ojos[0] ? 1 : 0)), eyeY, BLANCO);
      return;
    }
    for (let y = 0; y < eyeH; y++) P(ex, eyeY + y, y === eyeH - 1 && !S && ojoC !== NEGRO ? ojoC : ojoN);
    if (panda) P(ex, eyeY, NEGRO);
    if (estiloOjo === 'pestanas') P(ex + (ex === ojos[0] ? -1 : 1), eyeY - (S ? 0 : 0), NEGRO);
    if (estiloOjo === 'serios') { P(ex - 1, eyeY, mezcla(piel, NEGRO, 0.35)); }
  };
  ojoPix(ojos[0]); ojoPix(ojos[1]);

  // --- cejas ---
  const cy = eyeY - (S ? 1 : 2);
  const cejas = (ex: number, lejos: boolean) => {
    const out = lejos ? -1 : 1; // hacia afuera de la cara
    if (estiloCeja === 'finas') { P(ex, cy, cejaV); P(ex + out, cy, cejaV); return; }
    if (estiloCeja === 'gruesas') { P(ex, cy, cejaV); P(ex + out, cy, cejaV); P(ex - out, cy, cejaV); if (!S) { P(ex, cy - 1, cejaV); P(ex + out, cy - 1, cejaV); } return; }
    if (estiloCeja === 'bravas') { P(ex - out, cy + 1, cejaV); P(ex, cy, cejaV); P(ex + out, cy - (S ? 0 : 1), cejaV); if (!S) P(ex - out * 2, cy + 1, cejaV); return; }
    if (estiloCeja === 'tristes') { P(ex - out, cy - 1, cejaV); P(ex, cy, cejaV); P(ex + out, cy, cejaV); return; }
    P(ex, cy, cejaV); P(ex + out, cy, cejaV); if (!S) P(ex - out, cy, cejaV);
  };
  // a 32 px con lentes la barra de arriba del lente hace de ceja (si no, la cara se llena)
  if (!(S && look.lentes && look.lentes.estilo !== 'sol')) { cejas(ojos[0], true); cejas(ojos[1], false); }

  // --- barba (antes de la boca) ---
  if (look.barba) {
    const b = hex(look.barba.color);
    const bS = sombra(b);
    const est = look.barba.estilo;
    const zona = (x: number, y: number) => {
      const v = c.get(x, y);
      return v === piel || v === sombra(piel);
    };
    const pinta = (x: number, y: number, v = b) => { if (zona(x, y)) P(x, y, est === 'sombra' ? mezcla(piel, b, 0.4) : v); };
    if (est === 'barba' || est === 'sombra') {
      const x0 = lado ? c.oreja[0] : 0;
      for (let y = eyeY + eyeH; y < c.H; y++) for (let x = x0; x < c.W; x++) {
        if (y < bocaY - (S ? 0 : 1) && !(lado ? x <= x0 + 1 : (x <= 0 || x >= c.W - 1))) continue;
        pinta(x, y, y === c.H - 1 ? bS : b);
      }
      // patillas
      for (let y = eyeY - 1; y < eyeY + eyeH; y++) { if (lado) pinta(c.oreja[0] + 1, y); else { pinta(0, y); pinta(c.W - 1, y); } }
    }
    if (est === 'bigote' || est === 'candado') for (let i = -1; i <= (S ? 1 : 2); i++) pinta(bocaX + i, bocaY - 1);
    if (est === 'candado' || est === 'chivo') for (let y = bocaY + 1; y < c.H; y++) for (let i = -1; i <= (S ? 1 : 2); i++) pinta(bocaX + i, y, y === c.H - 1 ? bS : b);
    if (est === 'candado') { pinta(bocaX - 2, bocaY); pinta(bocaX + (S ? 2 : 3), bocaY); }
  }

  // --- boca ---
  const bx = bocaX;
  if (gesto === 'ko') { P(bx - 1, bocaY, BOCA); P(bx, bocaY + 1, BOCA); P(bx + 1, bocaY, BOCA); if (!S) P(bx + 2, bocaY + 1, BOCA); }
  else if (gesto === 'dolor') { for (let i = -1; i <= 1; i++) P(bx + i, bocaY, BOCA); for (let i = -1; i <= 1; i++) P(bx + i, bocaY + 1, i === 0 ? LENGUA : BOCA); }
  else if (gesto === 'esfuerzo') { for (let i = -1; i <= (S ? 1 : 2); i++) { P(bx + i, bocaY, BOCA); P(bx + i, bocaY + 1, i % 2 ? BLANCO : BOCA); } }
  else if (boca === 'abierta') {
    if (S) { P(bx, bocaY, BOCA); P(bx + 1, bocaY, BOCA); P(bx, bocaY + 1, LENGUA); P(bx + 1, bocaY + 1, BOCA); }
    else { for (let i = 0; i < 3; i++) P(bx + i, bocaY, BOCA); for (let i = 0; i < 3; i++) P(bx + i, bocaY + 1, i === 1 ? LENGUA : BOCA); P(bx + 1, bocaY + 2, BOCA); }
  } else if (boca === 'sonrisa') {
    P(bx - 1, bocaY - 1, BOCA); P(bx, bocaY, BOCA); P(bx + 1, bocaY, BOCA); P(bx + 2, bocaY - 1, BOCA);
    if (!S) P(bx + 1, bocaY, BOCA);
  } else if (boca === 'gato') { P(bx - 1, bocaY, BOCA); P(bx, bocaY + 1, BOCA); P(bx + 1, bocaY, BOCA); P(bx + 2, bocaY + 1, BOCA); P(bx + 3, bocaY, BOCA); }
  else if (boca === 'seria') { P(bx, bocaY, BOCA); P(bx + 1, bocaY, BOCA); if (!S) P(bx + 2, bocaY, BOCA); }
  else { P(bx, bocaY, BOCA); P(bx + 1, bocaY, BOCA); if (!S) P(bx + 2, bocaY, BOCA); }

  // --- aretes ---
  if (look.aretes && !(look.pelo.estilo === 'largo' && lado)) {
    const a = hex(look.aretes.color);
    for (const ox of c.oreja) {
      const ax = lado ? ox : ox;
      P(ax, eyeY + (S ? 2 : 3), a);
      if (look.aretes.estilo === 'largos') { P(ax, eyeY + (S ? 3 : 4), a); P(ax, eyeY + (S ? 4 : 5), luz(a)); }
      if (look.aretes.estilo === 'aro' && !S) { P(ax, eyeY + 4, a); P(ax + (lado ? -1 : ox < 0 ? -1 : 1), eyeY + 4, a); }
    }
  }

  // --- lentes ---
  if (look.lentes && gesto !== 'ko') {
    const fr = hex(look.lentes.color);
    const est = look.lentes.estilo;
    const vidrio = (x: number, y: number) => {
      const v = c.get(x, y);
      if (est === 'sol') { P(x, y, hex('#1c1a22')); return; }
      if (v === piel || v === sombra(piel)) P(x, y, mezcla(v, hex('#e8f6ff'), 0.55));
    };
    for (const ex of ojos) {
      const x0 = ex - 1, x1 = ex + 1 + (S ? 0 : 1), y0 = eyeY - 1, y1 = eyeY + eyeH;
      if (S && est !== 'sol') {
        // a 32 px: barra de arriba, los lados y el vidrio claro; el ojo se sigue viendo
        for (let x = x0; x <= x1; x++) P(x, y0, fr);
        for (let y = eyeY; y < eyeY + eyeH; y++) { vidrio(x0, y); vidrio(x1, y); }
        if (est === 'nerd' || est === 'cuadrados') { P(x0, eyeY + eyeH, fr); P(x1, eyeY + eyeH, fr); }
        if (est === 'gato') { P(x0 - (ex === ojos[0] ? 1 : 0), y0 - 1, fr); P(x1 + (ex === ojos[1] ? 1 : 0), y0 - 1, fr); }
        continue;
      }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const borde = y === y0 || y === y1 || x === x0 || x === x1;
        if (borde) {
          if (est === 'redondos' && (y === y0 || y === y1) && (x === x0 || x === x1)) continue;
          P(x, y, fr);
        } else if (c.get(x, y) !== NEGRO) vidrio(x, y);
      }
      if (est === 'gato') { P(x0 - (ex === ojos[0] ? 1 : 0), y0 - 1, fr); P(x1 + (ex === ojos[1] ? 1 : 0), y0 - 1, fr); }
      if (est === 'sol') P(x1 - 1, y0 + 1, hex('#9aa8c8'));
    }
    // puente y patilla
    for (let x = ojos[0] + 2; x <= ojos[1] - 2; x++) P(x, eyeY, fr);
    if (lado) for (let x = c.oreja[0] + 1; x < ojos[0] - 1; x++) P(x, eyeY, fr);
  }
}

interface GorroCtx { cara: Capa; atras: Capa; mg: number; W: number; H: number; eyeY: number; oreja: number[]; pelo: number }

function pintarGorro(look: ChibiLook, m: Medidas, vista: Vista, g: GorroCtx): void {
  const S = m.talla === 32;
  const { cara, mg, W, H, eyeY } = g;
  const gorro = look.gorro!;
  const c1 = hex(gorro.color), c2 = hex(gorro.color2 ?? '#f4f2ee');
  const P = (x: number, y: number, v: number, som = 1, c = cara) => pon(c, mg + x, mg + y, v, som);
  const borra = (x: number, y: number) => { const i = (mg + y) * cara.w + mg + x; if (i >= 0 && i < cara.col.length) cara.col[i] = VACIO; };
  const lado = vista === 'lado';
  const k = S ? 1 : 1.4;
  // limpia el volumen de pelo encima de la cabeza cuando el gorro lo aplasta
  const aplasta = (hasta: number) => { for (let y = -8; y < hasta; y++) for (let x = -4; x < W + 4; x++) if (y < 0 || x < 0 || x >= W) { const v = cara.col[(mg + y) * cara.w + mg + x]; if (v === g.pelo || v === luz(g.pelo) || v === sombra(g.pelo)) borra(x, y); } };
  const domo = (hasta: number, color: number, sube = 1) => {
    // casquete que cubre la cabeza hasta la fila `hasta` y sube `sube` filas
    for (let y = -sube; y < hasta; y++) {
      const ins = y < 0 ? Math.round((-y) * 1.6) + 1 : y === 0 ? 1 : 0;
      for (let x = -1 + ins; x <= W - ins; x++) P(x, y, color);
    }
  };
  switch (gorro.estilo) {
    case 'gorra': case 'gorra_atras': {
      aplasta(0);
      const yb = Math.round(H * 0.3);
      domo(yb, c1, Math.round(1 * k));
      const atras = gorro.estilo === 'gorra_atras';
      if (lado) {
        const dir = atras ? -1 : 1, x0 = atras ? -1 : W - 1;
        for (let i = 0; i < Math.round(4 * k); i++) { P(x0 + dir * i, yb - 1, c2); if (!S) P(x0 + dir * i, yb - 2, c2, 0); }
      } else if (vista === 'frente' && !atras) for (let x = 1; x < W - 1; x++) P(x, yb, c2);
      else if (vista === 'espalda' && atras) for (let x = 1; x < W - 1; x++) P(x, yb, c2);
      P(Math.round(W * (lado ? 0.6 : 0.5)), Math.round(-k + 1), luz(c1), 0);
      break;
    }
    case 'gorro_lana': {
      aplasta(0);
      const yb = Math.round(H * 0.36);
      domo(yb, c1, Math.round(2 * k));
      for (let x = -1; x <= W; x++) { P(x, yb - 1, c2); P(x, yb - 2, c2); }
      P(Math.round(W * 0.45), -Math.round(2 * k) - 1, c2); P(Math.round(W * 0.45) + 1, -Math.round(2 * k) - 1, c2);
      break;
    }
    case 'navidad': {
      aplasta(0);
      const yb = Math.round(H * 0.3);
      domo(yb, c1, 1);
      // la punta cae hacia atrás
      const tip = lado ? [-Math.round(4 * k), Math.round(H * 0.25)] : [W + Math.round(2 * k), Math.round(H * 0.2)];
      poligono(cara, [[mg + W * 0.15, mg - 1], [mg + W * 0.85, mg - 1], [mg + W * 0.55, mg - 4 * k], [mg + tip[0] + 1, mg + tip[1] - 2 * k]], c1, 1);
      poligono(cara, [[mg + W * 0.25, mg - 2 * k], [mg + W * 0.6, mg - 4 * k], [mg + tip[0] + 1, mg + tip[1] - 1], [mg + tip[0], mg + tip[1] - 2]], c1, 1);
      for (let x = -1; x <= W; x++) { P(x, yb - 1, c2, 0); P(x, yb - 2, c2); }
      elipse(cara, mg + tip[0] + 0.5, mg + tip[1] + 0.5, 1.6 * k, 1.6 * k, c2, 0);
      break;
    }
    case 'llanero': case 'paja': {
      aplasta(0);
      const yb = Math.round(H * 0.22);
      const ala = gorro.estilo === 'paja' ? Math.round(3 * k) : Math.round(2.5 * k);
      // copa
      for (let y = -Math.round(3 * k); y < yb; y++) for (let x = 1; x < W - 1; x++) P(x, y, c1);
      if (gorro.estilo === 'llanero') for (let x = 1; x < W - 1; x++) P(x, -Math.round(3 * k), VACIO);
      for (let x = 1; x < W - 1; x++) P(x, yb - 1, c2, 0);
      // ala
      for (let x = -ala; x < W + ala; x++) { P(x, yb, c1); if (!S) P(x, yb + 1, sombra(c1), 0); }
      if (gorro.estilo === 'llanero' && lado) { P(-ala, yb - 1, c1); P(W + ala - 1, yb - 1, c1); }
      break;
    }
    case 'vincha': {
      const y0 = Math.max(1, Math.round(H * (S ? 0.18 : 0.2)));
      for (let x = -1; x <= W; x++) { P(x, y0, c1); P(x, y0 + 1, c1); if (!S) P(x, y0 + 2, sombra(c1), 0); }
      // las tiras atrás
      if (lado) for (let i = 1; i <= Math.round(4 * k); i++) { P(-1 - i, y0 + Math.floor(i / 2), c1); P(-1 - i, y0 + 1 + Math.floor(i / 1.5), c1); }
      else if (vista === 'espalda') for (let j = 0; j < Math.round(4 * k); j++) { P(Math.floor(W / 2) - 1 - Math.floor(j / 2), y0 + 2 + j, c1); P(Math.floor(W / 2) + Math.floor(j / 2), y0 + 2 + j, c1); }
      break;
    }
    case 'cintillo': {
      for (let x = 0; x < W; x++) { const y = Math.round(H * 0.12) + (x < 2 || x > W - 3 ? 1 : 0); P(x, lado ? y : y, c1, 0); }
      break;
    }
    case 'lazo': case 'flor': {
      const cx = lado ? Math.round(W * 0.3) : Math.round(W * 0.78), cy = -1;
      if (gorro.estilo === 'lazo') {
        const r = S ? 1 : 2;
        for (let j = -r; j <= r; j++) for (let i = 1; i <= r + 1; i++) { if (Math.abs(j) <= i) { P(cx - i, cy + j, c1); P(cx + i, cy + j, c1); } }
        P(cx, cy, c2);
      } else {
        P(cx, cy - 1, c1); P(cx - 1, cy, c1); P(cx + 1, cy, c1); P(cx, cy + 1, c1); P(cx, cy, c2);
      }
      break;
    }
    case 'corona': case 'tiara': {
      const oro = c1;
      if (gorro.estilo === 'corona') {
        aplasta(0);
        const x0 = Math.round(W * 0.2), x1 = Math.round(W * 0.8);
        for (let x = x0; x <= x1; x++) { P(x, -1, oro); P(x, 0, oro); if ((x - x0) % 2 === 0) P(x, -2, oro); if ((x - x0) % 4 === 0) P(x, -3, oro); }
        P(Math.round((x0 + x1) / 2), -1, c2, 0);
      } else {
        const x0 = Math.round(W * 0.3), x1 = Math.round(W * 0.75);
        for (let x = x0; x <= x1; x++) P(x, 0, oro, 0);
        P(Math.round((x0 + x1) / 2), -1, oro); P(Math.round((x0 + x1) / 2), -2, c2, 0);
      }
      break;
    }
    case 'panda': {
      const r = S ? 1.6 : 2.3;
      const xs = lado ? [W * 0.25, W * 0.72] : [W * 0.18, W * 0.82];
      for (const x of xs) elipse(cara, mg + x, mg - 0.5, r, r, c1, 1);
      for (let x = 0; x < W; x++) P(x, Math.round(H * 0.1), c1, 0);
      break;
    }
    case 'chef': {
      aplasta(0);
      const yb = Math.round(H * 0.22);
      for (let x = 0; x < W; x++) for (let y = yb - 2; y < yb; y++) P(x, y, c1);
      elipse(cara, mg + W / 2, mg - 3 * k, W * 0.55, 3.2 * k, c1, 1);
      break;
    }
    case 'fiesta': {
      poligono(cara, [[mg + W * 0.3, mg + 1], [mg + W * 0.7, mg + 1], [mg + W * 0.5, mg - 6 * k]], (x, y) => ((y - x) % 3 === 0 ? c2 : c1), 1);
      P(Math.round(W * 0.5) - 0, Math.round(-6 * k) - 1, c2);
      break;
    }
    case 'boina': {
      aplasta(0);
      elipse(cara, mg + W * (lado ? 0.55 : 0.5), mg - 0.5, W * 0.62, 2.2 * k, c1, 1);
      P(Math.round(W * 0.5), Math.round(-2.5 * k), c1);
      break;
    }
    case 'casco': {
      aplasta(0);
      const yb = Math.round(H * 0.45);
      domo(yb, c1, Math.round(1 * k));
      for (let y = 0; y < yb; y++) { if (lado) for (let x = -1; x < Math.round(W * 0.3); x++) P(x, y + 1, c1); }
      for (let y = -Math.round(k); y < yb; y++) P(Math.round(W * (lado ? 0.45 : 0.5)), y, c2, 0);
      break;
    }
    case 'audifonos': {
      for (let x = 0; x < W; x++) P(x, -1 - (x > 1 && x < W - 2 ? 1 : 0), c1, 0);
      for (const ox of g.oreja) for (let j = -1; j < (S ? 2 : 3); j++) { P(ox, eyeY + j, c1); P(ox + (ox < 0 ? 1 : ox >= W ? -1 : 1), eyeY + j, c2, 0); }
      break;
    }
  }
}
