import { rng, grain } from '../../fx/pix';
import { Lienzo } from './lienzo';
import { drawText, textWidth, LINE_H } from './letras';
import type { Color, Paleta } from './paleta';

/**
 * Objetos de la calle que ocupan una caja del layout. Cada dibujo calza con su caja: el techo mide `d` filas y el
 * frente `z` filas, así el atleta se para donde el juego dice. Lo que sobresale arriba (un manubrio, un letrero)
 * va en `sobre` filas extra y no cambia la altura de apoyo.
 */
export interface Pieza {
  img: Lienzo;
  /** Filas extra arriba del techo de la caja. La caja empieza en la fila `sobre`. */
  sobre: number;
}

export const nueva = (pal: Paleta, w: number, d: number, z: number, sobre = 0): Pieza => ({ img: new Lienzo(w, sobre + d + z, pal), sobre });

/** Sombra de contacto: una fila oscura en el piso, al pie del frente. */
export function pie(L: Lienzo, y: number, w: number) { L.hl(0, y, w, 'tinta'); }

/** Xe ba gác: triciclo de carga con plataforma de tablas a la altura `z`. El conductor va adelante (a la derecha). */
export function baGac(pal: Paleta, w: number, d: number, z: number): Pieza {
  const sobre = 14, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre, fr = top + d;
  const bw = w - 22; // plataforma
  // tablas de la plataforma (techo)
  L.f(0, top, bw, d, 'ocre');
  for (let y = top + 2; y < fr; y += 4) L.hl(0, y, bw, 'terracota');
  for (let i = 0; i < bw; i += 11) L.vl(i + ((i / 11) % 2 ? 5 : 0), top, d, 'terracota');
  L.hl(0, top, bw, 'amarillo');
  // costado de la plataforma
  L.f(0, fr, bw, 6, 'azul'); L.hl(0, fr, bw, 'celeste'); L.hl(0, fr + 5, bw, 'azul_noche');
  L.vl(0, top, d + 6, 'tinta'); L.vl(bw - 1, top, d + 6, 'tinta');
  // chasis y ruedas de atrás
  const gy = fr + z;
  L.f(4, fr + 6, bw - 8, 3, 'sombra');
  for (const wx of [12, bw - 16]) { L.d(wx, gy - 7, 7, 'tinta'); L.d(wx, gy - 7, 5, 'sombra'); L.d(wx, gy - 7, 2, 'cemento'); }
  // la moto de adelante: tanque, asiento, manubrio y rueda
  const mx = bw - 2;
  L.f(mx, fr - 2, 10, 4, 'tinta'); L.hl(mx + 1, fr - 2, 8, 'sombra');
  L.f(mx + 8, fr - 8, 8, 12, 'rojo'); L.vl(mx + 8, fr - 8, 12, 'luz'); L.vl(mx + 15, fr - 8, 12, 'vino');
  L.ln(mx + 12, fr - 8, mx + 17, fr - 14, 'cemento'); L.hl(mx + 14, fr - 14, 7, 'tinta');
  L.f(mx + 16, fr - 6, 4, 3, 'cemento_claro'); L.p(mx + 19, fr - 5, 'oro');
  L.f(mx + 4, fr + 2, 12, 5, 'vino');
  L.d(w - 8, gy - 7, 7, 'tinta'); L.d(w - 8, gy - 7, 5, 'sombra'); L.d(w - 8, gy - 7, 2, 'cemento');
  L.ln(mx + 10, fr + 4, w - 8, gy - 8, 'cemento');
  pie(L, gy - 1, w);
  return P;
}

/** Carrito de bánh mì: vitrina con los panes y el letrero en el vidrio. */
export function puestoBanhMi(pal: Paleta, w: number, d: number, z: number): Pieza {
  const sobre = 0, P = nueva(pal, w, d, z, sobre), L = P.img, fr = d;
  // techo de lámina
  L.f(0, 0, w, d, 'cemento_claro'); for (let y = 2; y < d; y += 3) L.hl(1, y, w - 2, 'cemento'); L.hl(0, 0, w, 'luz');
  L.vl(0, 0, d, 'sombra'); L.vl(w - 1, 0, d, 'sombra');
  // vitrina
  const gh = Math.round(z * 0.5);
  L.box(0, fr, w, gh, 'cielo', 'tinta');
  L.f(1, fr + 1, w - 2, 9, 'luz');
  drawText(L, Math.floor((w - textWidth('BÁNH MÌ')) / 2), fr - 1, 'BÁNH MÌ', 'rojo');
  for (let x = 3; x < w - 6; x += 7) { L.f(x, fr + gh - 5, 6, 3, 'ocre'); L.hl(x + 1, fr + gh - 5, 4, 'amarillo'); L.p(x + 5, fr + gh - 4, 'terracota'); }
  L.ln(w - 9, fr + 11, w - 4, fr + 6, 'luz');
  // mueble de abajo y ruedas
  L.f(0, fr + gh, w, z - gh - 4, 'azul'); L.hl(0, fr + gh, w, 'celeste'); L.vl(0, fr + gh, z - gh - 4, 'azul_noche'); L.vl(w - 1, fr + gh, z - gh - 4, 'azul_noche');
  L.f(4, fr + gh + 3, 12, 6, 'azul_noche'); L.p(14, fr + gh + 6, 'cemento_claro');
  for (const wx of [6, w - 7]) { L.d(wx, fr + z - 3, 3, 'tinta'); L.p(wx, fr + z - 3, 'cemento'); }
  pie(L, fr + z - 1, w);
  return P;
}

/** Cajas apiladas: guacales verdes de cerveza abajo y cajas de anime arriba. Una capa cada ~18 de alto. */
export function cajas(pal: Paleta, w: number, d: number, z: number, seed = 1): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  const capas = Math.max(1, Math.round(z / 18)), ch = z / capas;
  const anime = capas >= 2;
  // techo: botellas vistas desde arriba, o tapas de anime
  if (anime) {
    L.f(0, 0, w, d, 'luz'); L.hl(0, Math.floor(d / 2), w, 'cemento_claro'); L.vl(Math.floor(w / 2), 0, d, 'cemento_claro');
    L.speckle(0, 0, w, d, 'cemento_claro', 0.08, seed);
    L.vl(Math.floor(w / 4), 0, d, 'rojo'); L.vl(Math.floor((3 * w) / 4), 0, d, 'rojo');
  } else {
    L.f(0, 0, w, d, 'verde_oscuro');
    for (let y = 2; y < d - 1; y += 5) for (let x = 2; x < w - 1; x += 5) { L.d(x + 1, y + 1, 1.6, 'verde'); L.p(x + 1, y + 1, 'oro'); }
  }
  L.vl(0, 0, d, 'tinta'); L.vl(w - 1, 0, d, 'tinta');
  // frentes de cada capa, de arriba hacia abajo
  for (let k = 0; k < capas; k++) {
    const y0 = fr + Math.round(k * ch), y1 = fr + Math.round((k + 1) * ch), hh = y1 - y0, top = anime && k === 0;
    if (top) {
      L.box(0, y0, w, hh, 'luz', 'cemento'); L.f(Math.floor(w / 4), y0, 1, hh, 'rojo'); L.f(Math.floor((3 * w) / 4), y0, 1, hh, 'rojo');
      L.speckle(1, y0 + 1, w - 2, hh - 2, 'cemento_claro', 0.1, seed + k);
      continue;
    }
    // guacal: marco verde con agujeros y las botellas asomando
    L.box(0, y0, w, hh, 'verde', 'verde_oscuro');
    for (let x = 3; x < w - 3; x += 6) L.f(x, y0 + 3, 4, Math.max(2, hh - 8), 'verde_oscuro');
    for (let x = 4; x < w - 3; x += 6) { L.f(x, y0 + 4, 2, Math.max(1, hh - 10), 'ocre'); }
    L.hl(1, y0 + 1, w - 2, 'menta');
  }
  pie(L, fr + z - 1, w);
  return P;
}

/**
 * Moto tipo Cub (xe số) de lado, la de todo Saigón: cuadro bajo para pasar la pierna, escudo curvo adelante, asiento
 * largo y ruedas de rayos. Mide 52 x 30, con el asiento a 21 px del piso. (x, gy) es la esquina de abajo a la izquierda.
 */
export const MOTO_W = 52, MOTO_ASIENTO = 21;
export function moto(L: Lienzo, x: number, gy: number, color: Color, mirando: 1 | -1 = 1) {
  const W = MOTO_W, oy = gy - 30;
  const X = (u: number) => (mirando === 1 ? x + u : x + W - 1 - u);
  const P = (u: number, v: number, c: Color) => L.p(X(u), oy + v, c);
  const H = (u0: number, u1: number, v: number, c: Color) => { for (let u = u0; u <= u1; u++) P(u, v, c); };
  const sh: Color = color === 'rojo' ? 'vino' : color === 'azul' ? 'azul_noche' : color === 'crema' ? 'cemento_claro' : 'sombra';
  // ruedas con rayos
  for (const cu of [10, 42]) {
    for (let v = -8; v <= 8; v++) for (let u = -8; u <= 8; u++) {
      const r = Math.hypot(u, v);
      if (r > 8.4) continue;
      P(cu + u, 21 + v, r > 6.4 ? 'tinta' : r > 5.4 ? 'cemento' : r < 1.5 ? 'cemento_claro' : (u === 0 || v === 0 || u === v || u === -v) ? 'asfalto_claro' : 'sombra');
    }
  }
  // guardafango de atrás y cuerpo bajo el asiento, con su curva que baja a la rueda
  for (let u = 2; u <= 26; u++) {
    const top = 11 + (u < 6 ? 6 - u : 0) * 0.6, bot = u < 20 ? 15 + (u < 8 ? (8 - u) * 0.5 : 0) : 15 - (u - 20) * 0.5;
    for (let v = Math.round(top); v <= Math.round(bot); v++) P(u, v, v === Math.round(top) ? 'luz' : v >= Math.round(bot) - 1 ? sh : color);
  }
  // asiento
  H(5, 24, 9, 'tinta'); H(4, 25, 10, 'tinta'); H(6, 23, 8, 'sombra'); P(4, 9, 'tinta'); P(25, 9, 'tinta');
  // parrilla y stop
  H(0, 5, 10, 'sombra'); P(0, 11, 'sombra'); P(1, 12, 'rojo'); P(2, 12, 'rojo');
  // cuadro bajo (el paso de la pierna) y motor
  for (let u = 24; u <= 33; u++) { const v = Math.round(17 + Math.sin(((u - 24) / 9) * Math.PI) * 2); P(u, v, sh); P(u, v - 1, color); }
  for (let v = 17; v <= 23; v++) H(19, 27, v, v < 19 ? 'sombra' : 'cemento');
  for (let v = 18; v <= 22; v += 2) H(20, 26, v, 'asfalto_claro');
  P(23, 20, 'cemento_claro');
  // escape
  H(3, 22, 24, 'cemento_claro'); H(3, 22, 25, 'cemento'); P(2, 24, 'tinta'); P(2, 25, 'tinta');
  // escudo de las piernas
  for (let v = 7; v <= 19; v++) {
    const u0 = 32 - Math.round((v - 7) * 0.25), u1 = 35 + Math.round(Math.max(0, v - 13) * 0.3);
    H(u0, u1, v, color); P(u0, v, 'luz'); P(u1, v, sh);
  }
  // horquilla
  for (let v = 8; v <= 21; v++) P(36 + Math.round((v - 8) * 0.45), v, 'cemento');
  // guardafango de adelante
  for (let u = 35; u <= 49; u++) { const v = Math.round(13 - Math.sin(((u - 35) / 14) * Math.PI) * 2); P(u, v, color); P(u, v + 1, sh); }
  // manubrio, faro y espejos
  H(31, 41, 4, 'tinta'); H(37, 43, 5, color); H(37, 43, 6, color); H(38, 42, 7, sh); P(44, 5, 'luz'); P(44, 6, 'oro');
  P(32, 3, 'cemento'); P(32, 2, 'cemento'); P(31, 1, 'cemento_claro'); P(32, 1, 'cemento_claro');
  P(40, 3, 'cemento'); P(40, 2, 'cemento'); P(40, 1, 'cemento_claro'); P(41, 1, 'cemento_claro');
  // pata de apoyo
  P(22, 26, 'sombra'); P(21, 27, 'sombra'); P(21, 28, 'sombra');
}

/** Motos estacionadas: una atrás y otra adelante, con los asientos a la altura `z` de la caja. */
export function motosParadas(pal: Paleta, w: number, d: number, z: number): Pieza {
  // las dos motos con el asiento a la altura de la caja: una en el fondo de la caja y otra adelante
  const sobre = Math.max(0, MOTO_ASIENTO + 9 - z), P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre;
  moto(L, Math.max(0, w - MOTO_W), top + Math.round(d * 0.4) + z, 'azul', -1);
  moto(L, 0, top + d + z, 'rojo', 1);
  pie(L, top + d + z - 1, w);
  return P;
}

/** Mesas y banquitos plásticos apilados. Bajo: mesitas azules con su banquito. Alto: columnas de banquitos rojos. */
export function mesasPlasticas(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  const alto = z >= 28;
  const c: Color = alto ? 'rojo' : 'azul', s: Color = alto ? 'vino' : 'azul_noche';
  // techo: las tapas de las mesas o de las columnas
  L.f(0, 0, w, d, c); L.hl(0, 0, w, alto ? 'salmon' : 'celeste');
  if (alto) for (let x = 0; x < w; x += 12) { L.vl(x, 0, d, s); L.p(x + 6, Math.floor(d / 2), s); }
  else { L.hl(0, Math.floor(d / 2), w, s); L.vl(Math.floor(w / 2), 0, d, s); }
  // frente
  if (alto) {
    for (let x = 0; x < w; x += 12) {
      L.f(x, fr, 12, z, c); L.vl(x, fr, z, s); L.vl(x + 11, fr, z, s);
      for (let y = fr + 3; y < fr + z - 1; y += 4) { L.hl(x + 1, y, 10, s); L.p(x + 2, y + 1, 'salmon'); }
    }
  } else {
    const legs = [1, Math.floor(w / 2) - 2, Math.floor(w / 2) + 1, w - 3];
    L.f(0, fr, w, 3, c); L.hl(0, fr + 3, w, s);
    for (const lx of legs) L.f(lx, fr + 3, 2, z - 3, c);
    banquito(L, 6, fr + z - 7, 'rojo'); banquito(L, w - 14, fr + z - 7, 'rojo');
  }
  pie(L, fr + z - 1, w);
  return P;
}

/** Banquito de plástico chiquito (ghế đẩu), de 8 x 7. */
export function banquito(L: Lienzo, x: number, y: number, c: Color) {
  const s: Color = c === 'rojo' ? 'vino' : 'azul_noche';
  L.f(x, y, 8, 2, c); L.hl(x, y + 2, 8, s);
  L.vl(x + 1, y + 2, 5, c); L.vl(x + 6, y + 2, 5, c); L.vl(x + 2, y + 3, 3, s); L.vl(x + 5, y + 3, 3, s);
}

/** Tanque de agua de acero parado en la acera: cilindro con anillos y tapa redonda. */
export function tanqueAgua(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  const cx = (w - 1) / 2, rx = w / 2 - 0.5, ry = d / 2;
  // cuerpo: sombreado por columnas (claro a la izquierda)
  for (let x = 0; x < w; x++) {
    const t = Math.abs(x - cx) / rx;
    const c: Color = x < w * 0.22 ? 'cemento_claro' : x < w * 0.38 ? 'luz' : t < 0.55 ? 'cemento_claro' : t < 0.85 ? 'cemento' : 'asfalto_claro';
    const yb = Math.round(ry * Math.sqrt(Math.max(0, 1 - t * t)));
    L.vl(x, ry, fr + z - ry - 1 + yb - Math.round(ry), c);
  }
  for (let y = fr + 6; y < fr + z - 4; y += 9) for (let x = 0; x < w; x++) { const t = Math.abs(x - cx) / rx; L.p(x, y + Math.round(ry * Math.sqrt(Math.max(0, 1 - t * t))) - Math.round(ry) + 1, 'cemento'); }
  // tapa
  L.d(cx, ry, rx, 'cemento', ry / rx);
  L.d(cx, ry, rx - 2, 'cemento_claro', (ry - 1) / (rx - 2));
  L.d(cx, ry - 1, 3, 'cemento', 0.6); L.p(Math.round(cx) - 1, Math.round(ry) - 2, 'luz');
  // patas y sombra
  pie(L, fr + z - 1, w);
  return P;
}

/** Kiosco de lámina en la acera: techo ondulado, mostrador con tarjetas y letrero. */
export function kiosco(pal: Paleta, w: number, d: number, z: number, texto = 'SIM THẺ'): Pieza {
  const sobre = 2, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre, fr = top + d;
  for (let x = 0; x < w; x++) for (let y = 0; y < d + 2; y++) L.p(x, y, (x >> 1) % 2 ? 'azul' : 'azul_noche');
  L.hl(0, 0, w, 'celeste');
  L.f(0, fr, w, 3, 'azul_noche');
  // letrero
  L.f(0, fr + 3, w, 11, 'amarillo'); L.hl(0, fr + 13, w, 'ocre');
  drawText(L, Math.floor((w - textWidth(texto)) / 2), fr + 2, texto, 'rojo');
  // ventanilla con tarjetas colgadas
  const vy = fr + 14, vh = Math.max(8, z - 30);
  L.box(2, vy, w - 4, vh, 'sombra', 'tinta');
  for (let x = 4; x < w - 5; x += 5) { L.f(x, vy + 2, 4, 5, (x >> 2) % 3 ? 'oro' : 'rojo'); L.p(x + 1, vy + 3, 'luz'); }
  // cuerpo de abajo
  L.f(0, vy + vh, w, z - 14 - vh, 'celeste'); L.vl(0, vy + vh, z - 14 - vh, 'azul'); L.vl(w - 1, vy + vh, z - 14 - vh, 'azul');
  for (let y = vy + vh + 3; y < fr + z - 2; y += 4) L.hl(2, y, w - 4, 'azul');
  pie(L, fr + z - 1, w);
  return P;
}

/** Muro que cruza la calle. Bajo: corona de ladrillo. Alto: repello con vidrios rotos arriba. El portón va aparte (`porton`). */
export function muro(pal: Paleta, w: number, d: number, z: number, alto: boolean, seed = 1): Pieza {
  const sobre = alto ? 4 : 0, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre, fr = top + d;
  // techo: la corona del muro, larga hacia el fondo
  if (alto) {
    // repello claro con vidrios rotos de colores clavados arriba (para que nadie se trepe)
    L.f(0, top, w, d, 'cemento_claro'); L.vl(1, top, d, 'luz'); L.vl(w - 2, top, d, 'cemento');
    for (let y = top + 2; y < fr - 1; y += 3) for (let x = 3; x < w - 3; x += 4) {
      const k = (x * 7 + y * 3 + seed) % 5;
      const c: Color = k === 0 ? 'verde' : k === 1 ? 'celeste' : k === 2 ? 'luz' : k === 3 ? 'ocre' : 'menta';
      L.p(x + ((y >> 1) % 2), y, c); L.p(x + ((y >> 1) % 2), y - 1, 'luz');
    }
  } else {
    // corona de ladrillo: contrasta con el concreto gris y se lee como muro
    for (let y = top; y < fr; y++) for (let x = 0; x < w; x++) {
      const row = Math.floor((y - top) / 4), jx = (x + (row % 2 ? 4 : 0)) % 8;
      L.p(x, y, (y - top) % 4 === 3 || jx === 7 ? 'vino' : grain(x, y, seed) < 0.08 ? 'salmon' : 'terracota');
    }
    L.vl(1, top, d, 'salmon');
  }
  L.vl(0, top, d, 'tinta'); L.vl(w - 1, top, d, 'tinta');
  // frente
  L.f(0, fr, w, z, 'crema'); L.hl(0, fr, w, 'luz'); L.hl(0, fr + 1, w, 'cemento');
  L.speckle(0, fr + 2, w, z - 2, 'cemento_claro', 0.15, seed + 3);
  // ladrillo donde se cayó el repello
  const R = rng(seed);
  const by = fr + 6 + Math.floor(R() * Math.max(1, z - 18)), bx = 2 + Math.floor(R() * Math.max(1, w - 12));
  for (let y = 0; y < 8; y++) for (let x = 0; x < 9; x++) {
    if ((x - 4) ** 2 / 20 + (y - 4) ** 2 / 14 > 1) continue;
    L.p(bx + x, by + y, y % 3 === 2 ? 'cemento' : (x + (y / 3 | 0) * 2) % 5 === 4 ? 'vino' : 'terracota');
  }
  // moho abajo
  for (let x = 0; x < w; x++) { const hh = 1 + Math.floor(grain(x, 0, seed + 5) * 4); for (let y = 0; y < hh; y++) L.p(x, fr + z - 1 - y, y === 0 ? 'verde_oscuro' : 'canal'); }
  L.vl(0, fr, z, 'cemento'); L.vl(w - 1, fr, z, 'cemento');
  pie(L, fr + z - 1, w);
  return P;
}

/**
 * Portón de hẻm (cổng hẻm) abierto en el hueco que deja un muro adelante: pilar al final del muro, poste en el borde de
 * la franja, viga por arriba de las cabezas con la placa y la hoja de reja abierta hacia afuera. No tapa el paso: todo
 * lo que cae dentro de la franja va por encima de `zLibre` o es la reja calada del borde.
 *
 * Medidas de mundo: el muro termina en `yFin` y la franja en `D`, el muro mide `w` de ancho y `z` de alto.
 * Devuelve el dibujo y dónde va: `dx` desde la x del muro y `top` como fila de pantalla relativa a `franja.atras`.
 */
export function porton(pal: Paleta, w: number, yFin: number, D: number, z: number, placa = 'HẺM', k = 0): { img: Lienzo; dx: number; top: number } {
  const ZA = Math.max(z + 14, 60), hoja = 30, dx = -2;
  // con inclinación, cada parte se corre según su fondo: el pilar en yFin, la viga de yFin a D, el poste en D
  const sx = (y: number) => Math.round(k * y) - Math.round(k * yFin), sD = sx(D);
  const row = (y: number, zz: number) => y - zz; // fila relativa a franja.atras
  const top = Math.min(row(yFin, ZA + 8), row(D, ZA + 4) - LINE_H - 4), W = Math.max(w + 4 + hoja + 4, textWidth(placa) + 8 + w) + sD, H = D - top + 1;
  const L = new Lienzo(W, H, pal);
  const R = (y: number, zz: number) => row(y, zz) - top; // fila dentro del dibujo
  const cx = Math.floor(w / 2) - dx; // centro del muro dentro del dibujo
  // pilar al final del muro, un poco más alto y más ancho que el muro, con su remate
  const px0 = cx - Math.ceil(w / 2) - 1, pw = w + 2;
  L.f(px0, R(yFin - 4, ZA + 4), pw, 4, 'cemento_claro'); L.hl(px0, R(yFin - 4, ZA + 4), pw, 'luz');
  L.f(px0, R(yFin, ZA + 4), pw, R(yFin, z) - R(yFin, ZA + 4), 'crema');
  L.vl(px0, R(yFin, ZA + 4), R(yFin, z) - R(yFin, ZA + 4), 'tinta'); L.vl(px0 + pw - 1, R(yFin, ZA + 4), R(yFin, z) - R(yFin, ZA + 4), 'tinta');
  L.hl(px0, R(yFin, ZA + 4), pw, 'luz'); L.d(cx, R(yFin - 2, ZA + 7), 2.5, 'cemento_claro'); L.p(cx - 1, R(yFin - 2, ZA + 8), 'luz');
  // viga por arriba, de pilar a poste: techo largo hacia adelante y su frente
  const bx = cx - 4;
  for (let y = yFin; y < D; y++) { L.f(bx + sx(y), R(y, ZA + 4), 8, 1, 'azul'); L.p(bx + sx(y), R(y, ZA + 4), 'azul_noche'); L.p(bx + sx(y) + 7, R(y, ZA + 4), 'azul_noche'); }
  for (let y = yFin + 3; y < D - 2; y += 5) L.hl(bx + 1 + sx(y), R(y, ZA + 4), 6, 'celeste');
  L.f(bx + sD, R(D, ZA + 4), 8, 4, 'azul_noche');
  // poste de adelante
  const pc = cx + sD;
  L.f(pc - 2, R(D, ZA), 5, R(D, 0) - R(D, ZA), 'azul'); L.vl(pc - 2, R(D, ZA), R(D, 0) - R(D, ZA), 'celeste'); L.vl(pc + 2, R(D, ZA), R(D, 0) - R(D, ZA), 'azul_noche');
  L.f(pc - 3, R(D, 2), 7, 2, 'sombra');
  // placa del hẻm colgada del poste, de frente
  const tw = textWidth(placa) + 6, sxp = pc - Math.floor(tw / 2), sy = R(D, ZA + 4) - LINE_H - 3;
  L.box(sxp, sy, tw, LINE_H + 2, 'azul', 'azul_noche'); drawText(L, sxp + 3, sy, placa, 'luz');
  // hoja de reja abierta hacia afuera, contra el borde de la franja: calada, se ve lo de atrás
  const hx = pc + 3, hy0 = R(D, 44), hy1 = R(D, 0);
  L.hl(hx, hy0, hoja, 'azul_noche'); L.hl(hx, hy0 + 1, hoja, 'azul'); L.hl(hx, hy1 - 2, hoja, 'azul'); L.hl(hx, hy1 - 1, hoja, 'azul_noche');
  L.hl(hx, Math.floor((hy0 + hy1) / 2), hoja, 'azul');
  L.vl(hx + hoja - 1, hy0, hy1 - hy0, 'azul_noche');
  for (let x = hx + 4; x < hx + hoja - 1; x += 4) { L.vl(x, hy0 + 2, hy1 - hy0 - 4, 'azul'); L.p(x, hy0 - 1, 'azul'); L.p(x, hy0 - 2, 'celeste'); }
  for (let x = hx + 2; x < hx + hoja - 2; x += 8) { L.p(x + 1, hy0 + 6, 'oro'); L.p(x + 2, hy0 + 5, 'oro'); L.p(x + 3, hy0 + 6, 'oro'); }
  return { img: L, dx: dx + Math.round(k * yFin), top };
}

/** Poste de luz de concreto con cruceta, transformador, lámpara y la maraña de cables. Base en la última fila. */
export function posteLuz(pal: Paleta, alto: number, borde: Color = 'tinta'): Pieza {
  const w = 44, P = { img: new Lienzo(w, alto + 6, pal), sobre: 6 }, L = P.img, cx = 22, base = alto + 5;
  // poste que se angosta
  for (let y = 6; y <= base; y++) {
    const t = (y - 6) / alto, hw = 2 + Math.round(t * 1.5);
    for (let x = cx - hw; x <= cx + hw; x++) L.p(x, y, x === cx - hw ? 'cemento_claro' : x >= cx + hw - 1 ? 'cemento' : 'cemento_claro');
    L.p(cx - hw - 1, y, borde); L.p(cx + hw + 1, y, borde);
  }
  for (let y = 30; y < base - 10; y += 14) L.hl(cx - 2, y, 4, 'cemento');
  // cruceta y aisladores
  L.f(cx - 16, 14, 33, 3, 'cemento'); L.hl(cx - 16, 14, 33, 'cemento_claro');
  for (const ix of [cx - 14, cx - 6, cx + 6, cx + 14]) { L.f(ix - 1, 11, 3, 3, 'luz'); L.p(ix, 10, 'cemento_claro'); }
  // lámpara
  L.ln(cx + 3, 24, cx + 13, 20, 'sombra'); L.f(cx + 11, 20, 7, 3, 'sombra'); L.f(cx + 12, 23, 5, 1, 'oro');
  // transformador
  L.box(cx - 13, 30, 9, 13, 'cemento', 'sombra'); L.hl(cx - 12, 31, 7, 'cemento_claro'); L.hl(cx - 13, 36, 9, 'sombra');
  // la maraña: rollos de cable negro colgando
  const R = rng(alto);
  for (let k = 0; k < 7; k++) {
    const y0 = 34 + Math.floor(R() * 26), sag = 4 + Math.floor(R() * 8), side = R() < 0.5 ? -1 : 1;
    for (let i = 0; i <= 12; i++) L.p(cx + side * (3 + i), y0 + Math.round(Math.sin((i / 12) * Math.PI) * sag), 'tinta');
  }
  L.f(cx - 4, 44, 9, 10, 'tinta'); L.speckle(cx - 4, 44, 9, 10, 'sombra', 0.4, 9);
  L.d(cx + 6, 52, 4, 'tinta'); L.d(cx + 6, 52, 2, 'sombra');
  // letrerito de anuncios pegados
  L.f(cx - 2, 70, 5, 8, 'luz'); L.hl(cx - 2, 72, 5, 'rojo'); L.hl(cx - 2, 75, 5, 'azul');
  return P;
}

/** Toldo de lona a rayas sobre la acera, visto desde arriba, con su faldón ondulado. Mide w x d. */
export function toldo(pal: Paleta, w: number, d: number): Pieza {
  const P = { img: new Lienzo(w, d + 5, pal), sobre: 0 }, L = P.img;
  for (let x = 0; x < w; x++) { const c: Color = Math.floor(x / 6) % 2 ? 'crema' : 'rojo'; L.vl(x, 0, d, c); }
  L.hl(0, 0, w, 'sombra');
  for (let y = 4; y < d; y += 7) for (let x = 0; x < w; x++) L.p(x, y, Math.floor(x / 6) % 2 ? 'cemento_claro' : 'vino');
  // faldón ondulado
  for (let x = 0; x < w; x++) {
    const c: Color = Math.floor(x / 6) % 2 ? 'crema' : 'rojo', hh = 3 + ((x % 6) >= 1 && (x % 6) <= 4 ? 1 : 0);
    L.vl(x, d, hh, c); L.p(x, d + hh, 'tinta');
  }
  L.hl(0, d, w, 'tinta');
  L.vl(0, 0, d + 4, 'tinta'); L.vl(w - 1, 0, d + 4, 'tinta');
  return P;
}

/** Qué dibujo va en cada `tipo` de caja del layout, para el estilo vietnam. */
export function piezaVietnam(pal: Paleta, tipo: string | undefined, w: number, d: number, z: number, seed = 1): Pieza {
  switch (tipo) {
    case 'carro': return baGac(pal, w, d, z);
    case 'puesto_banhmi': return puestoBanhMi(pal, w, d, z);
    case 'cajas': return cajas(pal, w, d, z, seed);
    case 'moto_estacionada': return motosParadas(pal, w, d, z);
    case 'mesas_plasticas': return mesasPlasticas(pal, w, d, z);
    case 'tanque_agua': return tanqueAgua(pal, w, d, z);
    case 'kiosco': return kiosco(pal, w, d, z);
    case 'muro_bajo': return muro(pal, w, d, z, false, seed);
    case 'muro_alto': return muro(pal, w, d, z, true, seed);
    default: return muro(pal, w, d, z, z > 40, seed);
  }
}

/** Un manojo de cables colgando entre dos puntos, cada uno con su comba. */
export function cables(L: Lienzo, x0: number, y0: number, x1: number, y1: number, n: number, sag: number, seed = 1) {
  const R = rng(seed);
  for (let k = 0; k < n; k++) {
    const dy0 = Math.floor(R() * 5), dy1 = Math.floor(R() * 5), s = sag * (0.7 + R() * 0.6), c: Color = k % 3 === 2 ? 'sombra' : 'tinta';
    const len = Math.max(1, Math.abs(x1 - x0));
    for (let i = 0; i <= len; i++) {
      const t = i / len, x = x0 + (x1 - x0) * t;
      L.p(Math.round(x), Math.round(y0 + dy0 + (y1 + dy1 - y0 - dy0) * t + Math.sin(t * Math.PI) * s), c);
    }
  }
}

/** Paloma de 8 x 6, parada (`vuela` = false) o con las alas arriba. */
export function paloma(L: Lienzo, x: number, y: number, vuela = false, mirando: 1 | -1 = 1) {
  const S = vuela
    ? ['.#....#.', '.##..##.', '..####..', '.######o', '..##....', '........']
    : ['.....##.', '....####', '.######o', '#######.', '..#..#..', '........'];
  S.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    const u = mirando === 1 ? i : 7 - i;
    L.p(x + u, y + j, ch === 'o' ? 'ocre' : j <= 1 && !vuela ? 'cemento' : j === 3 || (vuela && j < 2) ? 'sombra' : 'asfalto_claro');
  }));
}
