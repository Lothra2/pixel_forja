import { rng, bayer } from '../../fx/pix';
import { createRaster, type Raster } from '../../core/raster';
import { Lienzo } from './lienzo';
import { boxesOf, depthOf, floorAt, holeAt, waterAt, type ObliqueLayout, type TipoPiso } from './layout';
import { VIETNAM_MANANA, type Color, type Paleta } from './paleta';
import { pintarPiso } from './piso';
import { cielo } from './cielo';
import { saigonSkyline } from './skyline';
import { piezaVietnam, posteLuz, toldo, cables, paloma, moto, MOTO_W, banquito } from './calle';
import { filaVietnam, ropaTendida, nuevasAnclas, type Anclas, type Hueco } from './vietnam';
import { drawText, textWidth, LINE_H } from './letras';
import { fichaArte, type FichaArte } from './ficha';

/**
 * Un escenario oblicuo completo a partir del layout: todas las capas de 10.3, los objetos con su orden de dibujo,
 * la vida animada, luces, partículas y el mapa de superficie. Todo a escala 1 y con la paleta de la ficha.
 */

export const TROZO = 1280;
export const LEJOS_ALTO = 170;
export const PARALAJE = { cielo: 0, lejos: 0.25, cerca: 1, piso: 1, frente: 1 } as const;

export interface ObjetoEscena {
  id: string;
  tipo: string;
  /** De dónde sale: una caja del layout, el toldo (`bajo`), un poste. */
  origen: 'plataformas' | 'muros' | 'solidos' | 'bajo' | 'postes';
  img: Lienzo;
  /** Esquina de arriba a la izquierda en la pantalla, a escala 1. */
  x: number;
  y: number;
  /** Profundidad de mundo para ordenar con los atletas: se dibuja después de todo lo que tenga menor `orden`. */
  orden: number;
  superficie?: string;
}

export interface VidaEscena {
  id: string;
  tipo: string;
  /** `tras_cerca` va entre la ciudad lejana y las casas (se ve por los callejones). `cerca` va encima de las casas. */
  capa: 'tras_cerca' | 'cerca';
  x: number;
  y: number;
  cuadros: Lienzo[];
  fps: number;
  /** Para lo que cruza la pantalla: velocidad en px/s y cada cuántos segundos sale uno. */
  velocidad?: number;
  cada?: number;
}

export interface Luz { x: number; y: number; color: string; radio: number; parpadeo?: number; latido?: number; encendida: boolean; nota: string }
export interface Particula { tipo: string; fx?: string; x0: number; x1: number; y0: number; y1: number; color?: string[]; cada: number; sube?: number; vida?: number; nota: string }
export interface Superficie { id: string; color: string; paso: string; resbala: boolean }

export interface Escena {
  layout: ObliqueLayout;
  paleta: Paleta;
  ficha: FichaArte;
  cielo: Lienzo;
  lejos: Lienzo;
  cerca: Lienzo;
  piso: Lienzo;
  pisoMojado: Lienzo | null;
  frente: Lienzo;
  /** Fila de pantalla donde empieza el frente. */
  frenteY: number;
  objetos: ObjetoEscena[];
  vida: VidaEscena[];
  luces: Luz[];
  particulas: Particula[];
  superficie: { img: Raster; leyenda: Superficie[] };
  huecos: Hueco[];
}

const PALETAS: Record<string, Paleta> = { vietnam: VIETNAM_MANANA };

/** Dónde se abren los callejones: cada 600 a 700 px, lejos de los canales, los muros y las orillas del tramo. */
export function elegirCallejones(L: ObliqueLayout): Hueco[] {
  const canales: Hueco[] = L.huecos.filter((h) => (h.y0 ?? 0) === 0).map((h) => ({ x0: h.x0, x1: h.x1, tipo: 'canal' as const }));
  const ocupado = [
    ...canales.map((c) => [c.x0 - 70, c.x1 + 70]),
    ...L.muros.filter((m) => m.y === 0).map((m) => [m.x - 50, m.x + m.w + 50]),
    ...boxesOf(L).filter((b) => b.y < 6).map((b) => [b.x - 10, b.x + b.w + 10]),
    ...L.bajo.map((b) => [b.x0 - 10, b.x1 + 10]),
    ...L.postes.map((p) => [p.x - 30, p.x + 34]),
  ];
  const out: Hueco[] = [...canales];
  for (let x = 420; x < L.largo - 200; x += 640) {
    let cx = x;
    for (let k = 0; k < 8 && ocupado.some(([a, b]) => cx + 26 > a && cx < b); k++) cx += 60;
    if (ocupado.some(([a, b]) => cx + 26 > a && cx < b) || cx > L.largo - 200) continue;
    out.push({ x0: cx, x1: cx + 26, tipo: 'callejon' });
  }
  return out.sort((a, b) => a.x0 - b.x0);
}

export function renderEscena(L: ObliqueLayout, seed = 42): Escena {
  const pal = PALETAS[L.pais] ?? VIETNAM_MANANA;
  const FT = L.franja.atras, D = depthOf(L), W = L.largo;
  const huecos = elegirCallejones(L);
  const anclas: Anclas = nuevasAnclas();

  // cielo y ciudad lejana
  const sky = cielo(pal, 640, 360, L.hora, seed);
  const lejos = saigonSkyline(pal, TROZO, LEJOS_ALTO, seed + 39);

  // la fila de casas
  const temas = L.ranuras_deco.filter((r) => r.capa === 'cerca').map((r) => ({ x0: r.x0, x1: r.x1, tema: r.tema }));
  const cerca = filaVietnam(pal, W, FT, { huecos, temas, seed }, anclas);

  // cables de los postes a las casas, en la capa de las casas
  const R = rng(seed * 3);
  const postes = [...L.postes].sort((a, b) => a.x - b.x);
  const top = (p: (typeof postes)[number]) => FT + p.y - p.alto + 9; // fila de la cruceta
  for (const p of postes) {
    const cx = p.x + 2;
    for (let k = 0; k < 6; k++) {
      const side = k % 2 ? 1 : -1, tx = cx + side * (70 + Math.floor(R() * 200)), ty = 100 + Math.floor(R() * 50);
      if (tx < 0 || tx >= W || !cerca.has(tx, ty)) continue;
      cables(cerca, cx + side * (6 + (k % 3) * 4), top(p) - 2, tx, ty, 1 + (k % 2), 4 + Math.floor(R() * 6), seed + k + p.x);
    }
  }
  // letreros de salida y meta colgados del cable
  const salida = L.entidades.find((e) => e.tipo === 'salida')?.x;
  const meta = L.entidades.find((e) => e.tipo === 'meta')?.x;
  if (typeof salida === 'number') pancarta(cerca, salida + 30, 96, 'XUẤT PHÁT');
  if (typeof meta === 'number') pancarta(cerca, meta, 96, 'VỀ ĐÍCH');

  // piso, con la línea de salida, la de meta y las sombras de las cosas
  const piso = pintarPiso(pal, L, { seed: seed % 97 });
  if (typeof salida === 'number') for (let y = 2; y < D; y++) { piso.p(salida, y, 'luz'); piso.p(salida + 1, y, (y >> 2) % 2 ? 'luz' : 'cemento_claro'); }
  if (typeof meta === 'number') for (let y = 0; y < D; y++) for (let i = 0; i < 8; i++) piso.p(meta + i, y, ((i >> 2) + (y >> 2)) % 2 ? 'tinta' : 'luz');
  for (const b of boxesOf(L)) sombraCaja(piso, b.x, b.y, b.w, b.d, b.z, L);
  for (const b of L.bajo) for (let y = (b.y0 ?? 0) + 2; y < (b.y1 ?? D) + 2 && y < D; y++) for (let x = b.x0 + 6; x < b.x1 + 6 && x < W; x++) if (bayer(x, y) < 0.3 && !holeAt(L, x, y)) piso.p(x, y, floorAt(L, x, y) === 'acera' ? 'cemento' : 'asfalto');
  // calle inundada
  for (const a of L.agua) inundar(piso, cerca, a.x0, a.x1, a.y0 ?? 0, a.y1 ?? D, FT, seed);

  // objetos: cajas, toldo y postes
  const objetos: ObjetoEscena[] = [];
  boxesOf(L).forEach((b, i) => {
    const pz = piezaVietnam(pal, b.tipo, b.w, b.d, b.z, seed + i);
    objetos.push({ id: `${b.tipo ?? b.lista}_${i}`, tipo: b.tipo ?? b.lista, origen: b.lista, img: pz.img, x: b.x, y: FT + b.y - b.z - pz.sobre, orden: b.y + b.d, superficie: SUPERFICIE_CAJA[b.tipo ?? ''] ?? 'piedra' });
  });
  L.bajo.forEach((b, i) => {
    const t = toldo(pal, b.x1 - b.x0, (b.y1 ?? D) - (b.y0 ?? 0));
    objetos.push({ id: `${b.tipo ?? 'bajo'}_${i}`, tipo: b.tipo ?? 'bajo', origen: 'bajo', img: t.img, x: b.x0, y: FT + (b.y0 ?? 0) - b.z, orden: b.y1 ?? D });
  });
  postes.forEach((p, i) => {
    const po = posteLuz(pal, p.alto);
    objetos.push({ id: `${p.tipo ?? 'poste'}_${i}`, tipo: p.tipo ?? 'poste', origen: 'postes', img: po.img, x: p.x + 2 - 22, y: FT + p.y - p.alto - 5, orden: p.y });
  });
  objetos.sort((a, b) => a.orden - b.orden || a.x - b.x);

  // vida
  const vida: VidaEscena[] = [];
  if (L.vida.includes('ropa_tendida')) anclas.ropa.forEach((r, i) => {
    const cuadros = ([0, 1] as const).map((f) => { const c = new Lienzo(r.w + 2, 10, pal); ropaTendida(c, 0, 0, r.w, r.seed, f); return c; });
    vida.push({ id: `ropa_${i}`, tipo: 'ropa_tendida', capa: 'cerca', x: r.x, y: r.y, cuadros, fps: 2 });
  });
  if (L.vida.includes('cables_viento') || L.vida.includes('palomas')) {
    const xs = [-10, ...postes.map((p) => p.x + 2), W + 10];
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k] + (k === 0 ? 0 : 14), b = xs[k + 1] - (k === xs.length - 2 ? 0 : 14), ya = k === 0 ? 60 : top(postes[k - 1]) - 2, yb = k === xs.length - 2 ? 60 : top(postes[k]) - 2;
      const x0 = Math.max(0, Math.min(a, b)), x1 = Math.min(W, Math.max(a, b)), sag = Math.round(Math.min(34, Math.max(8, (x1 - x0) / 40)));
      if (x1 - x0 < 20) continue;
      const y0 = Math.min(ya, yb) - 2, h = Math.abs(ya - yb) + sag + 12;
      const cuadros = [0, 1].map((f) => { const c = new Lienzo(x1 - x0, h, pal); cables(c, a - x0, ya - y0, b - x0, yb - y0, 4, sag + f, seed + k); return c; });
      if (L.vida.includes('cables_viento')) vida.push({ id: `cables_${k}`, tipo: 'cables_viento', capa: 'cerca', x: x0, y: y0, cuadros, fps: 1 });
      else cerca.paste(cuadros[0], x0, y0);
      if (L.vida.includes('palomas')) {
        // una bandada chica parada en el cable, en el tercio del vano
        const px = x0 + Math.floor((x1 - x0) * (0.3 + R() * 0.4));
        const t = (px - a) / (b - a), py = Math.round(ya + (yb - ya) * t + Math.sin(t * Math.PI) * sag) - 6;
        const cuadros2 = [0, 1, 2, 3].map((f) => { const c = new Lienzo(34, 10, pal); for (let j = 0; j < 3; j++) paloma(c, j * 11 + (f === 1 && j === 1 ? 1 : 0), f >= 2 ? 2 + ((j + f) % 2) : 3, f >= 2, j % 2 ? -1 : 1); return c; });
        vida.push({ id: `palomas_${k}`, tipo: 'palomas', capa: 'cerca', x: px, y: py, cuadros: cuadros2, fps: 4 });
      }
    }
  }
  if (L.vida.includes('motos_fondo')) {
    const cuadros = [0, 1].map((f) => { const c = new Lienzo(MOTO_W, 40, pal); moto(c, 0, 40, f ? 'azul' : 'rojo', -1); jinete(c, f); return c; });
    vida.push({ id: 'motos_fondo', tipo: 'motos_fondo', capa: 'tras_cerca', x: W, y: FT - 22 - 40, cuadros, fps: 8, velocidad: -70, cada: 5 });
  }

  // luces y partículas
  const luces: Luz[] = [
    ...anclas.altares.map((a) => ({ x: a.x, y: a.y + 10, color: pal.rojo, radio: 12, latido: 0.5, encendida: true, nota: 'bombillo rojo del altar' })),
    ...postes.map((p) => ({ x: p.x + 18, y: top(p) + 13, color: pal.oro, radio: 40, encendida: L.hora === 'noche' || L.hora === 'atardecer', nota: 'lámpara del poste: de día va apagada' })),
  ];
  const particulas: Particula[] = [
    ...anclas.altares.map((a) => ({ tipo: 'humo', x0: a.x - 2, x1: a.x + 2, y0: a.y - 2, y1: a.y, color: [pal.cemento_claro, pal.cemento], cada: 0.5, sube: 14, vida: 1.8, nota: 'incienso del altar' })),
    ...anclas.buganvillas.map((b) => ({ tipo: 'petalo', fx: 'petalo_buganvilla', x0: b.x - 8, x1: b.x + 8, y0: b.y, y1: b.y + 4, cada: 4, nota: 'pétalos que caen de la buganvilla' })),
    ...anclas.aires.map((a) => ({ tipo: 'gota', x0: a.x, x1: a.x + 2, y0: a.y, y1: a.y, color: [pal.celeste], cada: 3, vida: 0.8, nota: 'gotera del aire acondicionado' })),
    ...L.agua.map((a) => ({ tipo: 'onda', fx: 'onda_charco', x0: a.x0, x1: a.x1, y0: FT + (a.y0 ?? 0), y1: FT + (a.y1 ?? D), cada: 0.7, nota: `${a.nombre ?? 'agua'}: ondas sueltas, y salpicadura_piso a cada paso` })),
    ...L.huecos.map((h) => ({ tipo: 'brillo', x0: h.x0, x1: h.x1, y0: FT + (h.y0 ?? 0) + 18, y1: FT + (h.y1 ?? D), color: [pal.luz, pal.cielo], cada: 0.9, vida: 0.4, nota: `${h.nombre ?? 'canal'}: brillitos en el agua` })),
  ];

  // primer plano: cosas sobre la acera de enfrente, sin tapar la franja
  const frenteY = FT + D - 14;
  const frente = new Lienzo(W, 360 - frenteY, pal);
  primerPlano(frente, L, frenteY, seed);

  // piso mojado (si el clima trae aguacero): charcos y brillo, encima del piso
  const pisoMojado = L.clima.includes('aguacero') || L.clima.includes('llovizna') ? mojar(pal, L, piso.h, seed) : null;

  return {
    layout: L, paleta: pal, ficha: fichaArte(L), cielo: sky, lejos, cerca, piso, pisoMojado, frente, frenteY,
    objetos, vida, luces, particulas, superficie: superficie(L), huecos,
  };
}

const SUPERFICIE_CAJA: Record<string, string> = { carro: 'madera', puesto_banhmi: 'metal', cajas: 'plastico', moto_estacionada: 'metal', mesas_plasticas: 'plastico', tanque_agua: 'metal', kiosco: 'metal', muro_bajo: 'piedra', muro_alto: 'piedra' };

/** Pancarta de tela colgada de dos cuerdas, centrada en x, con la parte de arriba en la fila y. */
function pancarta(L: Lienzo, cx: number, y: number, texto: string) {
  const tw = textWidth(texto), w = tw + 12, x = Math.round(cx - w / 2), h = LINE_H + 5;
  L.vl(x + 2, y - 40, 40, 'sombra'); L.vl(x + w - 3, y - 40, 40, 'sombra');
  L.box(x, y, w, h, 'rojo', 'vino'); L.hl(x + 1, y + 1, w - 2, 'salmon');
  drawText(L, x + 6, y + 2, texto, 'oro');
  for (let i = 0; i < w; i += 4) L.p(x + i + 1, y + h, 'vino');
}

/** Sombra de una caja en el piso: hacia la derecha, como la luz que viene de arriba a la izquierda. */
function sombraCaja(P: Lienzo, x: number, y: number, w: number, d: number, z: number, L: ObliqueLayout) {
  const len = Math.min(12, Math.round(z * 0.3));
  for (let j = y; j < y + d; j++) for (let i = x + w; i < x + w + len; i++) {
    if (holeAt(L, i, j) || j >= depthOf(L)) continue;
    if (bayer(i, j) < 0.5 - (i - x - w) / (len * 3)) P.p(i, j, floorAt(L, i, j) === 'acera' ? 'cemento' : 'asfalto');
  }
}

/** Bajo el agua el piso se sigue viendo, teñido: así se lee que el agua es bajita (8 px). */
const BAJO_AGUA: Partial<Record<Color, Color>> = {
  asfalto_claro: 'canal', asfalto: 'verde_oscuro', cemento: 'canal', cemento_claro: 'menta', crema: 'menta', luz: 'cielo',
  terracota: 'verde', salmon: 'menta', sombra: 'verde_oscuro', tinta: 'verde_oscuro', verde: 'verde_oscuro', menta: 'canal',
};

/** La calle inundada: el piso teñido debajo, orillas con espuma que lamen, reflejos de las casas y basura flotando. */
function inundar(P: Lienzo, cerca: Lienzo, x0: number, x1: number, y0: number, y1: number, FT: number, seed: number) {
  const D = y1;
  const nombre = new Map(Object.entries(P.pal).map(([k, v]) => [v.toLowerCase(), k as Color]));
  const colorEn = (x: number, y: number): Color | undefined => {
    const i = (y * P.w + x) * 4, d = P.r.data;
    return nombre.get('#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''));
  };
  for (let y = y0; y < P.h; y++) {
    const wob = Math.round(Math.sin(y * 0.45 + seed) * 3 + Math.sin(y * 0.13) * 4);
    for (let x = x0 + wob; x < x1 + wob; x++) {
      if (x < 0 || x >= P.w) continue;
      const edge = Math.min(x - (x0 + wob), x1 + wob - 1 - x);
      if (edge < 2) { P.p(x, y, edge === 0 ? 'luz' : 'cielo'); continue; }
      if (edge < 5 && bayer(x, y) < 0.5) { P.p(x, y, 'celeste'); continue; }
      // reflejo de la casa de atrás en las primeras filas, cada vez más débil
      if (y < y0 + 30) {
        const cy = FT - 1 - (y - y0) * 2;
        if (cy >= 0 && cerca.has(x, cy) && bayer(x, y) < 0.45 - (y - y0) * 0.014) { P.p(x, y, 'celeste'); continue; }
      }
      const c = colorEn(x, y);
      P.p(x, y, (c && BAJO_AGUA[c]) ?? 'canal');
    }
  }
  const R = rng(seed + x0);
  // rizos de agua: rayitas claras en grupos
  for (let k = 0; k < (x1 - x0) / 5; k++) {
    const x = x0 + 6 + Math.floor(R() * (x1 - x0 - 12)), y = y0 + 3 + Math.floor(R() * (P.h - y0 - 5));
    const len = 2 + Math.floor(R() * 5);
    P.hl(x, y, len, R() < 0.25 ? 'luz' : 'cielo');
    if (R() < 0.4) P.hl(x + 2, y + 2, Math.max(1, len - 2), 'cielo');
  }
  // flotando: chancletas, cajas de anime, hojas, una bolsa
  for (let k = 0; k < (x1 - x0) / 60; k++) {
    const x = x0 + 20 + Math.floor(R() * (x1 - x0 - 40)), y = y0 + 10 + Math.floor(R() * (D - y0 - 20)), t = k % 4;
    P.hl(x - 1, y + 3, 9, 'cielo');
    if (t === 0) { P.f(x, y, 5, 2, 'rojo'); P.p(x + 1, y, 'vino'); P.p(x + 2, y + 1, 'vino'); }
    else if (t === 1) { P.f(x, y, 8, 4, 'luz'); P.hl(x, y + 4, 8, 'cemento_claro'); }
    else if (t === 2) { P.p(x, y, 'verde'); P.p(x + 1, y, 'verde_oscuro'); P.p(x + 2, y + 1, 'verde'); P.p(x + 1, y + 1, 'verde'); }
    else { P.f(x, y, 4, 3, 'azul'); P.p(x + 1, y, 'celeste'); }
  }
}

/** Un jinete chiquito sobre la moto de fondo (casco y espalda). */
function jinete(c: Lienzo, f: number) {
  const x = 22, y = 40 - 21 - 12;
  c.f(x, y + 4, 7, 9, f ? 'celeste' : 'luz'); c.vl(x + 6, y + 4, 9, 'cemento');
  c.d(x + 3, y + 1, 3, f ? 'rojo' : 'amarillo'); c.p(x + 1, y + 1, 'tinta');
  c.f(x + 1, y + 12, 3, 4, 'azul_noche');
}

/** Cosas en la acera de enfrente: matas, banquitos, cajas, el gánh de una vendedora. Nada pasa de la franja. */
function primerPlano(F: Lienzo, L: ObliqueLayout, frenteY: number, seed: number) {
  const R = rng(seed * 7), base = 360 - frenteY - 2;
  let n = 0;
  const libre = (x: number) => !L.huecos.some((h) => x > h.x0 - 30 && x < h.x1 + 30) && !L.agua.some((a) => x > a.x0 - 20 && x < a.x1 + 20);
  for (let x = 90; x < L.largo - 60; x += 170 + Math.floor(R() * 220)) {
    if (!libre(x)) continue;
    const k = (n++ + Math.floor(R() * 2)) % 4;
    if (k === 0) {
      // mata de plátano en matera grande
      F.f(x, base - 10, 16, 10, 'terracota'); F.hl(x, base - 10, 16, 'salmon'); F.hl(x, base - 1, 16, 'vino');
      for (const [dx, dy, len] of [[-8, -14, 10], [6, -18, 9], [14, -12, 8]] as const) for (let i = 0; i < len; i++) { F.p(x + 8 + Math.round((dx * i) / len), base - 10 + Math.round((dy * i) / len), 'verde'); F.p(x + 9 + Math.round((dx * i) / len), base - 9 + Math.round((dy * i) / len), 'verde_oscuro'); }
    } else if (k === 1) { banquito(F, x, base - 7, 'rojo'); banquito(F, x + 2, base - 14, 'rojo'); banquito(F, x + 11, base - 7, 'azul'); }
    else if (k === 2) { F.box(x, base - 12, 14, 12, 'luz', 'cemento'); F.box(x + 2, base - 22, 12, 10, 'luz', 'cemento'); F.hl(x + 7, base - 12, 1, 'rojo'); }
    else {
      // gánh: dos canastos con su vara
      F.ln(x, base - 22, x + 30, base - 24, 'ocre');
      for (const cx of [x + 2, x + 26]) { F.ln(cx, base - 22, cx - 3, base - 12, 'sombra'); F.ln(cx, base - 22, cx + 3, base - 12, 'sombra'); F.d(cx, base - 7, 6, 'ocre', 0.8); F.hl(cx - 5, base - 9, 11, 'amarillo'); F.p(cx - 2, base - 11, 'verde'); F.p(cx + 1, base - 11, 'oro'); F.p(cx + 2, base - 12, 'verde'); }
    }
  }
}

/** Charcos y piso mojado para el aguacero: va encima del piso (transparente donde no cambia). */
function mojar(pal: Paleta, L: ObliqueLayout, h: number, seed: number): Lienzo {
  const M = new Lienzo(L.largo, h, pal), D = depthOf(L), R = rng(seed * 13);
  for (let y = 0; y < h; y++) for (let x = 0; x < L.largo; x++) {
    if (holeAt(L, x, y) || (y < D && waterAt(L, x, y))) continue;
    if (bayer(x, y) < 0.12) M.p(x, y, y < D && floorAt(L, x, y) === 'acera' ? 'cemento' : 'asfalto');
  }
  for (let k = 0; k < L.largo / 40; k++) {
    const cx = Math.floor(R() * L.largo), cy = 6 + Math.floor(R() * (D - 10)), rw = 6 + R() * 16, rh = 2 + R() * 4;
    if (holeAt(L, cx, cy) || waterAt(L, cx, cy)) continue;
    for (let y = Math.floor(cy - rh); y <= cy + rh; y++) for (let x = Math.floor(cx - rw); x <= cx + rw; x++) {
      const d = ((x - cx) / rw) ** 2 + ((y - cy) / rh) ** 2;
      if (d > 1 || holeAt(L, x, y)) continue;
      M.p(x, y, d > 0.7 ? 'asfalto' : (x + y) % 7 === 0 ? 'cielo' : 'celeste');
    }
  }
  return M;
}

const SUP: Record<string, Superficie> = {
  acera: { id: 'acera', color: '#d0d0d0', paso: 'paso_piedra', resbala: false },
  asfalto: { id: 'asfalto', color: '#808080', paso: 'paso_piedra', resbala: false },
  agua: { id: 'agua', color: '#3060ff', paso: 'paso_agua', resbala: true },
  hueco: { id: 'hueco', color: '#000000', paso: '', resbala: false },
  puente: { id: 'puente', color: '#f0f0f0', paso: 'paso_piedra', resbala: false },
  madera: { id: 'madera', color: '#a06030', paso: 'paso_madera', resbala: false },
  pasto: { id: 'pasto', color: '#30a030', paso: 'paso_pasto', resbala: false },
  tierra: { id: 'tierra', color: '#c09050', paso: 'paso_tierra', resbala: false },
};
const SUP_DE: Record<TipoPiso, string> = { asfalto: 'asfalto', acera: 'acera', tierra: 'tierra', baldosa: 'acera', madera: 'madera', metal: 'puente', arena: 'tierra', tatami: 'madera', greda: 'tierra', cancha: 'acera', pasto: 'pasto', agua: 'agua' };

/** Mapa de la franja: por pixel, qué suena al pisar y si resbala. */
function superficie(L: ObliqueLayout): { img: Raster; leyenda: Superficie[] } {
  const D = depthOf(L), img = createRaster(L.largo, D), usadas = new Set<string>();
  const puentes = L.huecos.filter((h) => (h.y1 ?? D) < D);
  for (let y = 0; y < D; y++) for (let x = 0; x < L.largo; x++) {
    let id: string;
    if (holeAt(L, x, y)) id = 'hueco';
    else if (waterAt(L, x, y)) id = 'agua';
    else if (puentes.some((h) => x >= h.x0 && x < h.x1 && y >= (h.y1 ?? D))) id = 'puente';
    else id = SUP_DE[floorAt(L, x, y) ?? 'asfalto'];
    usadas.add(id);
    const c = SUP[id].color, i = (y * L.largo + x) * 4;
    img.data[i] = parseInt(c.slice(1, 3), 16); img.data[i + 1] = parseInt(c.slice(3, 5), 16); img.data[i + 2] = parseInt(c.slice(5, 7), 16); img.data[i + 3] = 255;
  }
  return { img, leyenda: [...usadas].map((u) => SUP[u]) };
}

/** Un trozo de una capa larga, de x0 a x0 + w. */
export function trozo(src: Lienzo, x0: number, w = TROZO): Raster {
  const out = createRaster(Math.min(w, src.w - x0), src.h);
  for (let y = 0; y < src.h; y++) out.data.set(src.r.data.subarray((y * src.w + x0) * 4, (y * src.w + x0 + out.w) * 4), y * out.w * 4);
  return out;
}

export interface Actor { img: Raster; /** pivote (pies) dentro de la imagen */ px: number; py: number; x: number; y: number; z?: number }

/** Una postal de 640 x 360 que empieza en x0: todas las capas en orden, con los atletas que se pasen. */
export function postal(E: Escena, x0: number, actores: Actor[] = [], w = 640, h = 360, t = 0): Raster {
  const C = new Lienzo(w, h, E.paleta), FT = E.layout.franja.atras;
  const pegar = (src: Raster, dx: number, dy: number) => {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4; if (src.data[i + 3] === 0) continue;
      const X = dx + x, Y = dy + y; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      C.r.data.set(src.data.subarray(i, i + 4), (Y * w + X) * 4);
    }
  };
  for (let x = -((x0 * PARALAJE.cielo) % E.cielo.w); x < w; x += E.cielo.w) pegar(E.cielo.r, Math.floor(x), 0);
  const lx = Math.floor(x0 * PARALAJE.lejos) % E.lejos.w;
  for (let x = -lx; x < w; x += E.lejos.w) pegar(E.lejos.r, x, FT - 30 - E.lejos.h);
  const cuadro = (v: VidaEscena) => v.cuadros[Math.floor(t * v.fps) % v.cuadros.length].r;
  for (const v of E.vida) if (v.capa === 'tras_cerca' && v.velocidad) {
    // lo que cruza al fondo: una pasada cada `cada` segundos
    const vx = Math.round(x0 + w + ((t % (v.cada ?? 5)) * v.velocidad));
    pegar(cuadro(v), vx - x0, v.y);
  }
  pegar(E.cerca.r, -x0, 0);
  for (const v of E.vida) if (v.capa === 'cerca' && v.x + v.cuadros[0].w > x0 && v.x < x0 + w) pegar(cuadro(v), v.x - x0, v.y);
  pegar(E.piso.r, -x0, FT);
  const capa: { orden: number; draw: () => void }[] = [
    ...E.objetos.filter((o) => o.x + o.img.w > x0 && o.x < x0 + w).map((o) => ({ orden: o.orden, draw: () => pegar(o.img.r, o.x - x0, o.y) })),
    ...actores.map((a) => {
      // parado encima de una caja: va después de la caja
      const sobre = (a.z ?? 0) > 0 ? boxesOf(E.layout).find((b) => a.x >= b.x && a.x < b.x + b.w && a.y >= b.y && a.y < b.y + b.d && Math.abs(b.z - (a.z ?? 0)) <= 2) : undefined;
      return { orden: sobre ? sobre.y + sobre.d + 0.01 : a.y + 0.5, draw: () => pegar(a.img, a.x - a.px - x0, FT + a.y - (a.z ?? 0) - a.py) };
    }),
  ];
  capa.sort((a, b) => a.orden - b.orden).forEach((c) => c.draw());
  pegar(E.frente.r, -x0, E.frenteY);
  return C.r;
}
