import type { Raster } from '../../core/raster';
import { Escultor, MAT, halo } from './escultor';
import { monumento, type Monumento } from './monumento';
import { hash } from '../puertoObjects';

/**
 * Mundo 3, las Galerías del Eco: azul cristal. Una mina que se abandonó de golpe cuando la Polilla Reina hizo su nido
 * abajo; todo quedó a medio hacer, con cristales creciendo encima.
 */

const ROCA = ['#08090e', '#10121a', '#1a1e28', '#262c38', '#343c4a', '#465060', '#5c6878'] as const;

/** racimo de cristales (prismas con la punta clara) que salen de un punto */
function cristales(e: Escultor, m: number, x: number, y: number, n: number, largo: number, semilla: number, abre = 1) {
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (hash(k, 1, semilla) - 0.5) * 1.6 * abre, L = largo * (0.5 + hash(k, 2, semilla) * 0.6), w = 2 + hash(k, 3, semilla) * 3;
    const tx = x + Math.cos(a) * L, ty = y + Math.sin(a) * L, px = -Math.sin(a) * w, py = Math.cos(a) * w;
    e.poligono([[x + px, y + py], [tx + px * 0.8, ty + py * 0.8], [tx + Math.cos(a) * w * 1.4, ty + Math.sin(a) * w * 1.4], [tx - px * 0.8, ty - py * 0.8], [x - px, y - py]], m, { bisel: 1.5, normal: [Math.cos(a + 1.2) * 0.4, -0.3, 0.86] });
  }
}

/** La Boca de la Mina: la cabria, la torre de madera con la rueda arriba que bajaba a los mineros. */
function cabria(): Raster {
  const e = new Escultor(96, 148);
  const M = e.rampa(MAT.maderaVieja), H = e.rampa(MAT.hierro), C = e.rampa(MAT.paja), O = e.rampa(MAT.oxido), Cr = e.rampa(MAT.cristalCian, true);
  // patas en A y travesaños
  e.capsula(14, 144, 40, 24, 3.2, 2.4, M, { rugoso: 0.3, semilla: 1 });
  e.capsula(82, 144, 56, 24, 3.2, 2.4, M, { rugoso: 0.3, semilla: 2 });
  for (const y of [60, 96, 128]) { const t = (144 - y) / 120; e.capsula(14 + 26 * t, y, 82 - 26 * t, y, 2, 2, M); }
  e.capsula(20, 128, 70, 60, 1.6, 1.6, M, { luz: -0.08 });
  // la rueda (polea) arriba, de hierro oxidado
  e.esfera(48, 24, 16, 16, O, { rugoso: 0.2 });
  e.luz((x, y) => { const d = Math.hypot(x - 48, y - 24); return d < 12 && d > 4 ? -0.5 : 0; });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; e.capsula(48, 24, 48 + Math.cos(a) * 13, 24 + Math.sin(a) * 13, 1.2, 1.2, O); }
  e.esfera(48, 24, 3, 3, H);
  // la soga que baja y el balde colgando
  e.capsula(62, 26, 62, 110, 0.8, 0.8, C);
  e.cilindro(62, 110, 124, 7, 2.5, H, { rugoso: 0.2 });
  // cristales que crecieron en la base
  cristales(e, Cr, 22, 144, 4, 16, 3);
  cristales(e, Cr, 78, 144, 3, 12, 4);
  const r = e.render();
  halo(r, 22, 132, 14, '#76d0ea', 0.6);
  return r;
}

/** Los Rieles: el carrito de mina volcado, con los cristales desparramados que nunca llegaron arriba. */
function carrito(): Raster {
  const e = new Escultor(112, 80);
  const H = e.rampa(MAT.hierro), O = e.rampa(MAT.oxido), M = e.rampa(MAT.maderaVieja), Cr = e.rampa(MAT.cristalCian, true), Cv = e.rampa(MAT.cristalVioleta, true);
  // durmientes y un pedazo de riel torcido
  for (const x of [10, 36, 62, 88]) e.caja(x, 66, 16, 8, 3, M, { luz: -0.05 });
  e.trazo([[2, 68], [40, 66], [70, 62], [100, 54], [108, 44]], 1.6, 1.6, H, { luz: 0.1 });
  // el carrito de costado: la caja trapecio, la boca mirando a la izquierda y las ruedas al aire
  e.poligono([[30, 22], [86, 16], [92, 58], [36, 64]], O, { bisel: 3, rugoso: 0.35, semilla: 3 });
  e.luz((x, y) => ((x - 30) % 14 < 2 && y > 18 && y < 62 ? -0.25 : 0));
  e.poligono([[30, 22], [36, 64], [26, 60], [22, 26]], e.rampa(['#050406', '#0c0a0e']), { bisel: 0 });
  for (const [x, y] of [[92, 24], [96, 50]] as [number, number][]) { e.esfera(x, y, 7, 8, H); e.esfera(x, y, 2.5, 2.5, O); }
  // los cristales desparramados
  cristales(e, Cr, 22, 66, 5, 18, 5, 1.6);
  cristales(e, Cv, 8, 70, 3, 12, 6, 1.4);
  cristales(e, Cr, 48, 70, 2, 9, 7);
  const r = e.render();
  halo(r, 18, 56, 18, '#76d0ea', 0.7);
  return r;
}

/** La Sala del Eco: la geoda gigante partida al medio, llena de cristales violetas que repiten cada sonido. */
function geoda(): Raster {
  const e = new Escultor(112, 112);
  const R = e.rampa(ROCA), Cv = e.rampa(MAT.cristalVioleta, true), Cc = e.rampa(MAT.cristalCian, true), Q = e.rampa(['#2a2a38', '#4a4a64', '#7a7a9a', '#b0b0d0', '#e8e8ff']);
  // la cáscara de roca: media esfera abierta hacia la cámara
  e.esfera(56, 64, 52, 46, R, { rugoso: 0.6, semilla: 2 });
  // el borde de cuarzo blanco
  e.esfera(56, 64, 44, 39, Q, { rugoso: 0.3, semilla: 3 });
  // adentro: cristales que apuntan al centro desde toda la pared
  e.esfera(56, 64, 40, 35, e.rampa(['#0a0618', '#140c28']));
  // racimos desparejos: nacen de cualquier punto de la pared (más abajo, donde se juntó el agua) y apuntan a cualquier lado hacia adentro
  for (let k = 0; k < 40; k++) {
    const a = hash(k, 5, 9) * Math.PI * 2, d = 0.55 + hash(k, 6, 9) * 0.4, x = 56 + Math.cos(a) * 38 * d, y = 64 + Math.sin(a) * 33 * d + 4;
    const L = 5 + hash(k, 1, 9) * 13, ang = a + Math.PI + (hash(k, 2, 9) - 0.5) * 1.6, w = 2 + hash(k, 3, 9) * 2.5;
    const tx = x + Math.cos(ang) * L, ty = y + Math.sin(ang) * L, px = -Math.sin(ang) * w, py = Math.cos(ang) * w;
    e.poligono([[x + px, y + py], [tx + px * 0.6, ty + py * 0.6], [tx + Math.cos(ang) * w, ty + Math.sin(ang) * w], [tx - px * 0.6, ty - py * 0.6], [x - px, y - py]], k % 7 === 0 ? Cc : Cv, { bisel: 1.5, luz: -0.22 + hash(k, 4, 9) * 0.3 });
  }
  // la mitad que se partió, tirada adelante
  e.esfera(90, 104, 22, 8, R, { rugoso: 0.6, semilla: 4, luz: -0.05 });
  cristales(e, Cv, 90, 102, 4, 10, 8);
  const r = e.render();
  halo(r, 56, 64, 40, '#a87ad8', 0.5);
  return r;
}

/** El Puente Colgante: la campana de aviso de la mina, en su marco de vigas, con la soga cortada. */
function campanaAviso(): Raster {
  const e = new Escultor(80, 120);
  const M = e.rampa(MAT.maderaVieja), B = e.rampa(MAT.bronce), C = e.rampa(MAT.paja), Cr = e.rampa(MAT.cristalCian, true), P = e.rampa(ROCA);
  e.esfera(40, 112, 34, 8, P, { rugoso: 0.5, semilla: 1 });
  e.capsula(14, 112, 16, 18, 3, 2.6, M, { rugoso: 0.3, semilla: 2 });
  e.capsula(66, 112, 64, 18, 3, 2.6, M, { rugoso: 0.3, semilla: 3 });
  e.capsula(8, 18, 72, 16, 3, 3, M, { rugoso: 0.3, semilla: 4 });
  e.capsula(16, 40, 28, 18, 1.6, 1.6, M); e.capsula(64, 40, 52, 18, 1.6, 1.6, M);
  // la campana, un poco ladeada
  e.poligono([[34, 22], [46, 22], [50, 34], [56, 58], [24, 58], [30, 34]], B, { bisel: 4, rugoso: 0.2, semilla: 5 });
  e.esfera(40, 58, 16, 3, B, { luz: 0.05 });
  e.esfera(40, 62, 3, 3, B, { luz: -0.1 });
  e.capsula(40, 16, 40, 22, 2, 2, e.rampa(MAT.hierro));
  // la soga cortada colgando y un cristal creciendo en la viga
  e.trazo([[46, 62], [48, 74], [46, 84]], 1, 1, C);
  cristales(e, Cr, 70, 18, 3, 10, 7, 0.8);
  cristales(e, Cr, 12, 112, 3, 12, 8);
  const r = e.render();
  halo(r, 70, 10, 10, '#76d0ea', 0.6);
  return r;
}

/** El Lago de Cristal: la barca del minero con su farol cian todavía prendido, atada a una estaca. */
function barcaMinero(): Raster {
  const e = new Escultor(112, 80);
  const M = e.rampa(MAT.maderaVieja), H = e.rampa(MAT.hierro), L = e.rampa(MAT.cristalCian, true), C = e.rampa(MAT.paja), A = e.rampa(MAT.agua);
  e.esfera(56, 70, 52, 8, A, { luz: 0.05 });
  e.poligono([[6, 50], [104, 46], [96, 66], [70, 72], [30, 72], [12, 64]], M, { bisel: 4, rugoso: 0.35, semilla: 3 });
  e.luz((x, y) => ((y - 46 + Math.round(x * 0.04)) % 6 === 0 ? -0.3 : 0));
  e.poligono([[14, 51], [98, 48], [92, 56], [22, 58]], M, { bisel: 1, luz: -0.32 });
  // el farol en un palo, con su luz
  e.capsula(78, 52, 78, 14, 1.2, 1.2, M);
  e.capsula(78, 14, 86, 12, 1, 1, M);
  e.caja(81, 12, 10, 14, 2, H);
  e.caja(83, 15, 6, 8, 0, L, { bisel: 0 });
  // un pico y un saco adentro
  e.esfera(40, 52, 10, 5, C, { rugoso: 0.4 });
  e.capsula(50, 50, 66, 42, 1.2, 1.2, M); e.trazo([[62, 38], [66, 42], [70, 40]], 1.2, 1.2, H);
  // estaca y soga
  e.capsula(6, 76, 4, 50, 2, 1.6, M);
  e.trazo([[5, 54], [10, 52], [14, 52]], 0.8, 0.8, C);
  const r = e.render();
  halo(r, 86, 19, 20, '#76d0ea', 1);
  return r;
}

/** El Campamento Abandonado: la carpa de lona remendada, con la olla colgando sobre un fuego que se apagó hace años. */
function carpa(): Raster {
  const e = new Escultor(112, 96);
  const T = e.rampa(['#1e1a14', '#3a3226', '#564a38', '#72644c', '#8e7e60', '#aa9a78']), M = e.rampa(MAT.maderaVieja), H = e.rampa(MAT.hierro), P = e.rampa(ROCA), Ce = e.rampa(MAT.ceniza), K = e.rampa(['#06050a', '#0e0c10']), R = e.rampa(['#3a1010', '#6a2018', '#8a3020', '#a84428']);
  // la carpa: frente triangular con la entrada oscura y el costado
  e.poligono([[6, 84], [40, 14], [92, 22], [102, 82]], T, { bisel: 3, rugoso: 0.3, semilla: 2, luz: -0.08 });
  e.poligono([[6, 84], [40, 14], [62, 84]], T, { bisel: 3, rugoso: 0.3, semilla: 3, luz: 0.06 });
  e.poligono([[24, 84], [40, 40], [52, 84]], K, { bisel: 0 });
  // remiendos
  e.caja(70, 40, 10, 10, 0, R, { bisel: 1 }); e.caja(14, 64, 8, 8, 0, R, { bisel: 1, luz: 0.1 });
  e.capsula(40, 14, 40, 6, 1.4, 1.4, M);
  // el trípode, la olla y el fuego apagado
  e.capsula(66, 92, 80, 58, 1.2, 1.2, M); e.capsula(94, 92, 80, 58, 1.2, 1.2, M); e.capsula(80, 92, 80, 58, 1.2, 1.2, M, { luz: -0.1 });
  e.capsula(80, 58, 80, 70, 0.6, 0.6, H);
  e.esfera(80, 76, 8, 6, H);
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; e.esfera(80 + Math.cos(a) * 11, 90 + Math.sin(a) * 4, 3, 2, P); }
  e.esfera(80, 90, 7, 2.5, Ce);
  return e.render();
}

/** La Cueva de la Reina: el capullo vacío de la Polilla Reina, colgando de una estalagmita, abierto de un tajo. */
function capullo(): Raster {
  const e = new Escultor(88, 148);
  const R = e.rampa(ROCA), S = e.rampa(['#2a2430', '#4a4252', '#6e6478', '#948aa0', '#bab0c4', '#e0d8e8']), K = e.rampa(['#080410', '#120a1e']), Cv = e.rampa(MAT.cristalVioleta, true), Ce = e.rampa(MAT.ceniza);
  // la estalagmita que sube del piso (y se curva arriba)
  e.poligono([[18, 144], [30, 70], [40, 20], [46, 8], [52, 30], [60, 84], [70, 144]], R, { bisel: 5, rugoso: 0.5, semilla: 2 });
  // el capullo: hilos de seda abrazando la piedra
  e.esfera(46, 76, 24, 40, S, { rugoso: 0.4, semilla: 3 });
  e.luz((x, y) => (Math.sin(y * 0.7 + x * 0.25) > 0.85 ? -0.25 : 0));
  // el tajo por donde salió (adentro negro, con polvo de ceniza brillante)
  e.poligono([[38, 52], [52, 46], [58, 76], [50, 104], [40, 96], [44, 72]], K, { bisel: 0 });
  for (let k = 0; k < 6; k++) e.punto(44 + hash(k, 1, 3) * 10, 60 + hash(k, 2, 3) * 36, Cv, 0.3);
  // jirones de seda colgando
  e.trazo([[28, 108], [26, 120], [30, 130]], 1.6, 0.8, S); e.trazo([[62, 104], [66, 118], [62, 126]], 1.6, 0.8, S);
  // ceniza amontonada abajo y cristales
  e.esfera(44, 140, 30, 6, Ce, { rugoso: 0.5 });
  cristales(e, Cv, 14, 144, 3, 14, 5); cristales(e, Cv, 76, 144, 3, 12, 6);
  const r = e.render();
  halo(r, 48, 76, 20, '#a87ad8', 0.5);
  return r;
}

/** La Veta Escondida: el cristal de ámbar gigante con una polilla atrapada adentro desde antes de la mina. */
function ambar(): Raster {
  const e = new Escultor(64, 100);
  const A = e.rampa(MAT.cristalAmbar, true), R = e.rampa(ROCA), Mo = e.rampa(['#2a1a0a', '#4a3014', '#6a4820', '#8a6430']);
  e.esfera(32, 92, 30, 7, R, { rugoso: 0.5, semilla: 2 });
  e.poligono([[16, 94], [12, 50], [22, 16], [32, 4], [44, 18], [52, 52], [48, 94]], A, { bisel: 4, luz: -0.12 });
  // facetas
  e.luz((x, y) => (Math.abs(x - 32 - (y - 50) * 0.18) < 1 && y > 12 && y < 90 ? 0.18 : x < 22 && y < 60 && y > 24 ? 0.1 : 0));
  // la polilla adentro: cuerpo y alas abiertas, oscura
  e.esfera(32, 52, 2.4, 6, Mo); e.esfera(24, 48, 7, 5, Mo, { luz: -0.05 }); e.esfera(40, 48, 7, 5, Mo, { luz: -0.05 }); e.esfera(26, 58, 5, 3.5, Mo); e.esfera(38, 58, 5, 3.5, Mo);
  e.poligono([[6, 94], [4, 76], [12, 70], [16, 94]], A, { bisel: 2, luz: -0.2 });
  e.poligono([[50, 94], [58, 70], [62, 80], [60, 94]], A, { bisel: 2, luz: -0.2 });
  const r = e.render();
  halo(r, 32, 50, 30, '#eeb048', 0.6);
  return r;
}

/** El Nicho del Minero: el casco y el pico del último minero sobre una roca, con una vela y una foto borrosa. */
function memorial(): Raster {
  const e = new Escultor(64, 64);
  const R = e.rampa(ROCA), H = e.rampa(MAT.hierro), M = e.rampa(MAT.madera), Y = e.rampa(['#3a2a04', '#6a5010', '#a07c1c', '#d0a830', '#f0d060']), V = e.rampa(MAT.hueso), F = e.rampa(['#6a2a00', '#c86010', '#ffa830', '#fff0b0'], true), P = e.rampa(['#2a2420', '#5a5048', '#9a8e80', '#d0c4b0']);
  e.poligono([[4, 61], [8, 40], [22, 30], [44, 32], [59, 43], [59, 61]], R, { bisel: 4, rugoso: 0.5, semilla: 3 });
  // pico clavado
  e.capsula(44, 36, 50, 8, 1.6, 1.6, M);
  e.trazo([[38, 10], [46, 6], [53, 8], [60, 13]], 1.6, 1, H);
  // casco amarillo con su lámpara
  e.esfera(24, 31, 12, 8, Y, { solo: (_x, y) => y <= 32 });
  e.esfera(24, 32, 14, 3, Y, { luz: -0.05 });
  e.cilindro(24, 24, 28, 3, 1.5, H);
  // la vela y la foto apoyada
  e.cilindro(10, 30, 38, 1.8, 0.8, V); e.esfera(10, 27, 1.2, 2.2, F);
  e.caja(37, 24, 9, 11, 0, P, { bisel: 1 });
  const r = e.render();
  halo(r, 10, 26, 9, '#ffb050', 1);
  return r;
}

export function galeriasMonumentos(): Monumento[] {
  return [
    { zona: 'La Boca de la Mina', obj: monumento('mon_galerias_cabria', [cabria()], [48, 144], 72, 'larga'), historia: 'La cabria de la boca de la mina: la rueda que bajaba a los mineros, con el balde colgando todavía.' },
    { zona: 'Los Rieles', obj: monumento('mon_galerias_carrito', [carrito()], [56, 72], 80, 'larga'), historia: 'El carrito de mina volcado con los cristales que nunca llegaron arriba.' },
    { zona: 'La Sala del Eco', obj: monumento('mon_galerias_geoda', [geoda()], [56, 108], 96, 'larga'), historia: 'La geoda gigante partida al medio: sus cristales violetas repiten cada sonido de la sala.' },
    { zona: 'El Puente Colgante', obj: monumento('mon_galerias_campana_aviso', [campanaAviso()], [40, 116], 60, 'larga'), historia: 'La campana de aviso de la mina, con la soga cortada: nadie llegó a tocarla.' },
    { zona: 'El Lago de Cristal', obj: monumento('mon_galerias_barca_minero', [barcaMinero()], [56, 74], 72, 'larga'), historia: 'La barca del minero atada a su estaca, con el farol cian que sigue prendido.', prefiere: 'agua' },
    { zona: 'El Campamento Abandonado', obj: monumento('mon_galerias_carpa', [carpa()], [54, 88], 88, 'larga'), historia: 'La carpa remendada del campamento, con la olla sobre un fuego que se apagó hace años.' },
    { zona: 'La Cueva de la Reina', obj: monumento('mon_galerias_capullo', [capullo()], [44, 144], 52, 'larga'), historia: 'El capullo vacío de la Polilla Reina, colgado de la estalagmita y abierto de un tajo.' },
    { zona: 'La Veta Escondida', obj: monumento('mon_galerias_ambar', [ambar()], [32, 96], 40, 'larga'), historia: 'El cristal de ámbar gigante con una polilla atrapada desde antes de que existiera la mina.' },
    { zona: 'El Nicho del Minero', obj: monumento('mon_galerias_memorial', [memorial()], [32, 60], 28, 'larga'), historia: 'El casco y el pico del último minero sobre una roca, con una vela y una foto borrosa.' },
  ];
}
