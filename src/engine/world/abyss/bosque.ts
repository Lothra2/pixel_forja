import type { Raster } from '../../core/raster';
import { Escultor, MAT, halo, suave } from './escultor';
import { monumento, type Monumento } from './monumento';
import { hash } from '../puertoObjects';

/**
 * Mundo 1, el Bosque GG: un monumento por zona. Cálido y mágico: piedra con musgo, madera vieja, hongos y la luz
 * dorada que se cuela entre las hojas. Todos cuentan lo mismo: antes de los goblins este bosque fue un reino.
 */

const flores = (e: Escultor, x0: number, x1: number, y0: number, y1: number, n: number, semilla: number) => {
  const cols = [e.rampa(['#5a1a2a', '#a83a5a', '#e87a9a', '#ffc8d8']), e.rampa(['#4a3a0a', '#a8841a', '#f0d040', '#fff8b0']), e.rampa(['#1a2a5a', '#3a5aa8', '#7aa0e8', '#d0e0ff'])];
  const tallo = e.rampa(MAT.hoja);
  for (let k = 0; k < n; k++) {
    const x = x0 + hash(k, 1, semilla) * (x1 - x0), y = y0 + hash(k, 2, semilla) * (y1 - y0);
    e.punto(x, y + 1, tallo, 0.3);
    e.punto(x, y, cols[k % 3], 0.6);
  }
};

/** Claro de la Llegada: la carreta de los primeros viajeros, volcada, con una rueda suelta y flores adentro. */
function carreta(): Raster {
  const e = new Escultor(112, 80);
  const M = e.rampa(MAT.maderaVieja), H = e.rampa(MAT.hierro), T = e.rampa(MAT.tela), G = e.rampa(MAT.musgo);
  // la caja de la carreta, de costado y ladeada
  e.poligono([[14, 40], [76, 30], [82, 62], [18, 70]], M, { bisel: 3, rugoso: 0.5, semilla: 11 });
  // tablas
  e.luz((x, y) => { const v = (y - 40 + (x - 14) * 0.16) % 8; return v >= 0 && v < 1 && x > 15 && x < 81 ? -0.35 : 0; });
  // la lona rota encima, colgando
  e.poligono([[18, 40], [44, 20], [74, 30], [62, 38], [48, 34], [30, 44]], T, { bisel: 4, rugoso: 0.3, semilla: 12 });
  e.grieta(48, 26, 10, 1.4, 5, 0.5);
  // varas de la lona
  e.capsula(20, 40, 44, 18, 1.5, 1.5, M);
  e.capsula(44, 18, 74, 30, 1.5, 1.5, M);
  // rueda de atrás (todavía puesta) y rueda suelta apoyada adelante
  const rueda = (cx: number, cy: number, rx: number, ry: number) => {
    e.esfera(cx, cy, rx, ry, M, { rugoso: 0.3 });
    e.luz((x, y) => { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); return d < 0.72 && d > 0.2 ? -0.42 : 0; });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; e.capsula(cx, cy, cx + Math.cos(a) * rx * 0.75, cy + Math.sin(a) * ry * 0.75, 1, 1, M, { luz: -0.05 }); }
    e.esfera(cx, cy, 3, 3, H);
  };
  rueda(70, 62, 10, 13);
  rueda(94, 62, 9, 13);
  // la lanza de la carreta, en el piso
  e.capsula(8, 70, 22, 64, 2, 2, M, { luz: -0.05 });
  // musgo y flores en lo que mira para arriba
  e.musgo(G, 0.35, 21, [M]);
  flores(e, 22, 70, 58, 70, 14, 3);
  return e.render();
}

/** Pradera de las Mariposas: el hada de piedra con un ala rota, sobre su pedestal con musgo. */
function hada(): Raster {
  const e = new Escultor(80, 128);
  const P = e.rampa(MAT.piedra), G = e.rampa(MAT.musgo), B = e.rampa(['#2a3a3a', '#4a6a6a', '#7aa8a0', '#b8e8d8', '#f0fff8'], true);
  // pedestal
  e.caja(18, 92, 44, 30, 7, P, { rugoso: 0.4, semilla: 3 });
  e.caja(22, 86, 36, 8, 4, P, { rugoso: 0.3, semilla: 4 });
  // cuerpo (vestido largo), brazos al cielo, cabeza
  e.poligono([[30, 86], [50, 86], [46, 56], [42, 44], [38, 44], [34, 56]], P, { bisel: 4, rugoso: 0.35, semilla: 5 });
  e.esfera(40, 38, 6, 7, P, { rugoso: 0.2 });
  e.esfera(40, 32, 7, 4, P, { luz: -0.04 });
  e.capsula(36, 48, 30, 26, 2.2, 1.6, P);
  e.capsula(44, 48, 50, 26, 2.2, 1.6, P);
  e.esfera(30, 24, 2.4, 2.4, P); e.esfera(50, 24, 2.4, 2.4, P);
  // alas: la izquierda entera, la derecha partida (un pedazo en el pedestal)
  e.poligono([[34, 52], [12, 30], [6, 48], [14, 62], [30, 60]], P, { bisel: 3, rugoso: 0.4, semilla: 8, luz: 0.04 });
  e.poligono([[46, 52], [62, 40], [66, 50], [58, 58]], P, { bisel: 3, rugoso: 0.4, semilla: 9, luz: 0.04 });
  e.poligono([[58, 82], [72, 76], [74, 84], [62, 88]], P, { bisel: 2, rugoso: 0.4, semilla: 10 });
  e.grieta(64, 44, 8, 1.6, 4, 0.5);
  // las nervaduras de las alas
  e.tallar([[16, 36], [18, 40], [20, 44], [23, 48], [26, 52], [12, 48], [16, 50], [20, 52], [24, 55]]);
  e.grieta(40, 60, 18, 1.4, 7, 0.4);
  e.grieta(26, 100, 12, 0.3, 8, 0.4);
  e.musgo(G, 0.42, 30, [P]);
  // la mariposa de luz que se le posa en la mano
  e.punto(50, 21, B, 0.4); e.punto(49, 20, B, 0.2); e.punto(51, 20, B, 0.2);
  const r = e.render();
  halo(r, 50, 21, 9, '#b8e8d8', 0.9);
  return r;
}

/** El Abuelo Roble: la piedra de los nombres, con las marcas de las manos de los que pasaron y velas. */
function piedraNombres(): Raster {
  const e = new Escultor(72, 112);
  const P = e.rampa(MAT.piedraTibia), G = e.rampa(MAT.musgo), V = e.rampa(MAT.hueso), F = e.rampa(['#6a2a00', '#c86010', '#ffa830', '#fff0b0'], true);
  e.poligono([[18, 104], [16, 50], [22, 20], [36, 8], [50, 18], [56, 52], [54, 104]], P, { bisel: 5, rugoso: 0.55, semilla: 31 });
  // manos talladas (cuatro, de grande a chica) y una espiral
  const mano = (cx: number, cy: number, s: number) => {
    const pts: [number, number][] = [];
    for (let y = -2 * s; y <= 2 * s; y++) for (let x = -1.5 * s; x <= 1.5 * s; x++) if ((x / (1.5 * s)) ** 2 + (y / (2 * s)) ** 2 < 0.55) pts.push([cx + x, cy + y + s]);
    for (let k = 0; k < 4; k++) for (let y = 0; y < 2 * s; y++) pts.push([cx - 1.2 * s + k * 0.8 * s, cy - y]);
    e.tallar(pts);
  };
  mano(28, 44, 3); mano(44, 46, 2.6); mano(30, 66, 2); mano(42, 68, 1.6);
  const esp: [number, number][] = [];
  for (let a = 0; a < 12; a += 0.3) esp.push([36 + Math.cos(a) * a * 0.7, 28 + Math.sin(a) * a * 0.55]);
  e.tallar(esp);
  e.grieta(48, 30, 20, 1.7, 3, 0.4);
  e.musgo(G, 0.48, 9, [P]);
  // velas en la base: tres, una apagada
  for (const [x, h, on] of [[12, 10, 1], [60, 7, 1], [64, 5, 0]] as [number, number, number][]) {
    e.cilindro(x, 104 - h, 104, 2.2, 1, V);
    if (on) { e.esfera(x, 104 - h - 3, 1.4, 2.4, F); }
  }
  const r = e.render();
  halo(r, 12, 91, 10, '#ffb050', 1); halo(r, 60, 94, 9, '#ffb050', 1);
  return r;
}

/** Bosque Profundo: el árbol abuelo hueco. Adentro, en la oscuridad del tronco, algo abre los ojos. */
function arbolHueco(): Raster {
  // 100 x 140: más angosto que alto para que entre en el bosque cerrado sin tapar el pie de los árboles vecinos
  const e = new Escultor(100, 140);
  const C = e.rampa(MAT.corteza), G = e.rampa(MAT.musgo), K = e.rampa(['#020203', '#06070a', '#0c0e12']), O = e.rampa(['#4a5a10', '#b8d030', '#f0ff90'], true), HO = e.rampa(MAT.hoja);
  // raíces que se abren sobre el piso (cortas: no salen del ancho del tronco más que un poco)
  for (const [x1, y1, r] of [[14, 134, 5], [30, 138, 5], [72, 138, 5], [88, 132, 4], [50, 139, 4]] as [number, number, number][]) e.capsula(50 + (x1 - 50) * 0.3, 114, x1, y1, 9, r * 0.6, C, { rugoso: 0.5, semilla: x1 });
  e.poligono([[22, 132], [28, 90], [31, 48], [26, 22], [40, 28], [50, 14], [61, 26], [74, 18], [70, 48], [73, 90], [80, 132]], C, { bisel: 7, rugoso: 0.7, semilla: 41 });
  e.luz((x, y) => { const v = Math.sin(x * 0.6 + suave(x / 6, y / 16, 3) * 6); return v > 0.75 ? -0.28 : v < -0.9 ? 0.1 : 0; });
  e.poligono([[39, 124], [37, 94], [44, 78], [53, 74], [61, 82], [63, 100], [63, 124]], K, { bisel: 0 });
  e.poligono([[39, 124], [37, 94], [44, 78], [47, 82], [44, 96], [44, 124]], C, { bisel: 2, luz: -0.25 });
  e.capsula(31, 28, 10, 10, 4, 2, C, { rugoso: 0.4 });
  e.capsula(70, 24, 90, 8, 4, 2, C, { rugoso: 0.4 });
  e.capsula(50, 16, 51, 3, 3, 2, C);
  e.esfera(11, 10, 9, 6, HO, { rugoso: 0.8, semilla: 2 });
  e.esfera(89, 8, 9, 5, HO, { rugoso: 0.8, semilla: 3 });
  e.musgo(G, 0.38, 17, [C]);
  for (const [x, y] of [[72, 66], [75, 73], [27, 82]] as [number, number][]) e.esfera(x, y, 5, 2.2, e.rampa(['#3a2a10', '#7a5a20', '#c8a050', '#f0d890']));
  e.punto(48, 96, O, 0.5); e.punto(49, 96, O, 0.5); e.punto(55, 96, O, 0.5); e.punto(56, 96, O, 0.5);
  return e.render();
}

/** Anillo de las Hadas: el trono de hongos donde la reina de las hadas daba audiencia. */
function tronoHongos(): Raster {
  const e = new Escultor(80, 96);
  const T = e.rampa(['#2a2018', '#4a3a2a', '#6e5a44', '#968064', '#bca888', '#e0d0b0']), R = e.rampa(['#2a0a14', '#5a1428', '#8a2440', '#b83a58', '#dc6078', '#f8a0b0']), W = e.rampa(['#6a6458', '#a8a090', '#e0dccc', '#fffff0']), G = e.rampa(MAT.musgo), B = e.rampa(['#0a3a3a', '#1a7a70', '#4ad0b8', '#b0fff0'], true);
  // respaldo: un hongo alto; asiento: uno ancho y bajo; dos chicos a los lados como apoyabrazos
  e.cilindro(40, 30, 84, 8, 3, T, { rugoso: 0.3, semilla: 1 });
  e.esfera(40, 26, 26, 16, R, { semilla: 2 });
  e.luz((_x, y) => (y > 30 && y < 42 ? -0.25 : 0));
  e.cilindro(40, 66, 88, 14, 4, T, { rugoso: 0.3, semilla: 3 });
  e.esfera(40, 64, 22, 8, R, { semilla: 4, luz: 0.05 });
  e.cilindro(14, 74, 90, 4, 2, T); e.esfera(14, 72, 10, 6, R);
  e.cilindro(66, 76, 90, 4, 2, T); e.esfera(66, 74, 9, 5, R);
  // pintas blancas
  for (const [x, y, r] of [[28, 16, 3], [44, 12, 2.5], [54, 22, 3], [34, 28, 2], [22, 26, 2], [36, 62, 2.5], [50, 60, 2], [12, 70, 1.6], [68, 72, 1.6]] as [number, number, number][]) e.esfera(x, y, r, r * 0.8, W);
  e.musgo(G, 0.25, 5, [T]);
  // luz turquesa que cae del sombrero
  for (const [x, y] of [[20, 40], [60, 36], [30, 44]] as [number, number][]) e.punto(x, y, B, 0.4);
  const r = e.render();
  halo(r, 40, 52, 22, '#4ad0b8', 0.5);
  return r;
}

/** Claro Escondido: el altar del ciervo blanco, una laja con cuernos encima y ofrendas de bayas. */
function altarCiervo(): Raster {
  const e = new Escultor(96, 96);
  const P = e.rampa(MAT.piedra), H = e.rampa(MAT.hueso), G = e.rampa(MAT.musgo), B = e.rampa(['#1a0a2a', '#4a1a6a', '#8a3ab0', '#d090ff']), L = e.rampa(['#3a2a5a', '#7a6aaa', '#c0b0f0', '#f8f0ff'], true);
  e.caja(16, 60, 64, 30, 10, P, { rugoso: 0.5, semilla: 5 });
  e.caja(8, 82, 80, 8, 3, P, { rugoso: 0.4, semilla: 6, luz: -0.05 });
  // cuernos: dos ramas grandes y abiertas
  const cuerno = (s: number) => {
    const x0 = 48 + s * 6;
    e.trazo([[x0, 62], [x0 + s * 8, 46], [x0 + s * 16, 30], [x0 + s * 26, 16], [x0 + s * 34, 8]], 3, 1.4, H);
    e.capsula(x0 + s * 8, 46, x0 + s * 22, 40, 2, 1, H);
    e.capsula(x0 + s * 16, 30, x0 + s * 12, 14, 1.8, 1, H);
    e.capsula(x0 + s * 26, 16, x0 + s * 36, 20, 1.5, 1, H);
  };
  cuerno(-1); cuerno(1);
  e.esfera(48, 62, 7, 4, H);
  e.musgo(G, 0.4, 7, [P]);
  // bayas y una flor de luz
  for (const [x, y] of [[24, 62], [27, 63], [70, 62], [72, 64], [66, 63]] as [number, number][]) e.esfera(x, y, 1.8, 1.8, B);
  e.punto(48, 58, L, 0.5);
  e.tallar([[30, 74], [32, 72], [34, 74], [36, 72], [38, 74], [58, 74], [60, 72], [62, 74], [64, 72], [66, 74]]);
  const r = e.render();
  halo(r, 48, 56, 18, '#c0b0f0', 0.8);
  return r;
}

/** Arroyo Cristalino: el molino de agua roto; la rueda se cayó y quedó apoyada en la casita. */
function molino(): Raster {
  const e = new Escultor(112, 112);
  const P = e.rampa(MAT.piedraTibia), M = e.rampa(MAT.maderaVieja), T = e.rampa(['#1a0e0a', '#3a1c12', '#5a2e1a', '#7a4024', '#985434', '#b46a44']), G = e.rampa(MAT.musgo);
  // casita de piedra con techo de tejas rotas
  e.caja(48, 46, 52, 58, 8, P, { rugoso: 0.5, semilla: 9 });
  e.luz((x, y) => ((y + (x >> 3) * 3) % 9 === 0 && x > 48 && x < 100 && y > 54 ? -0.3 : (x - 48) % 13 === 0 && y > 54 ? -0.25 : 0));
  e.poligono([[42, 50], [74, 22], [106, 50]], T, { bisel: 3, rugoso: 0.5, semilla: 10 });
  e.luz((x, y) => (y % 5 === 0 && y > 24 && y < 50 && x > 44 && x < 104 ? -0.3 : 0));
  // el agujero del techo
  e.poligono([[80, 32], [90, 38], [86, 44], [78, 40]], e.rampa(['#050404', '#0e0c0a']), { bisel: 0 });
  // puerta
  e.caja(66, 74, 16, 30, 2, M, { luz: -0.1 });
  // la rueda grande, ladeada contra la pared
  const cx = 34, cy = 70;
  e.esfera(cx, cy, 30, 34, M, { rugoso: 0.3, semilla: 11 });
  e.luz((x, y) => { const d = Math.hypot((x - cx) / 30, (y - cy) / 34); return d < 0.82 && d > 0.18 ? -0.5 : 0; });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; e.capsula(cx, cy, cx + Math.cos(a) * 25, cy + Math.sin(a) * 29, 1.6, 1.6, M, { luz: 0.05 }); }
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; e.capsula(cx + Math.cos(a) * 27, cy + Math.sin(a) * 31, cx + Math.cos(a) * 31, cy + Math.sin(a) * 35, 1.4, 1.4, M, { luz: 0.1 }); }
  e.esfera(cx, cy, 5, 5, M, { luz: 0.1 });
  e.musgo(G, 0.38, 13, [P, M, T]);
  return e.render();
}

/** Lago Espejo: la barca del pescador, varada entre juncos, con la red todavía adentro. */
function barca(): Raster {
  const e = new Escultor(112, 72);
  const M = e.rampa(MAT.madera), R = e.rampa(['#2a2a22', '#4a4a3a', '#6e6a54', '#948c70', '#b8ae8c']), J = e.rampa(['#1a240c', '#2e4214', '#4a6020', '#6a802c', '#8aa03a']), G = e.rampa(MAT.musgo), A = e.rampa(MAT.agua);
  // casco: elipse aplastada con la borda clara, ladeada
  e.poligono([[8, 34], [104, 28], [96, 52], [70, 62], [30, 62], [12, 50]], M, { bisel: 4, rugoso: 0.4, semilla: 3 });
  e.luz((x, y) => ((y - 28 + Math.round(x * 0.06)) % 7 === 0 ? -0.3 : 0));
  // adentro (más oscuro) con agua estancada
  e.poligono([[16, 36], [98, 31], [92, 42], [24, 44]], M, { bisel: 2, luz: -0.3 });
  e.poligono([[40, 40], [80, 37], [76, 42], [44, 43]], A, { bisel: 1, luz: 0.1 });
  // red amontonada y un remo cruzado
  e.esfera(60, 36, 14, 6, R, { rugoso: 0.6, semilla: 4 });
  e.luz((x, y) => ((x + y) % 4 === 0 && Math.hypot((x - 60) / 14, (y - 36) / 6) < 1 ? -0.3 : 0));
  e.capsula(22, 26, 90, 46, 1.6, 1.6, M, { luz: 0.1 });
  e.poligono([[86, 42], [96, 48], [92, 54], [82, 48]], M);
  // juncos alrededor
  for (let k = 0; k < 16; k++) { const x = 4 + hash(k, 1, 8) * 104, h = 10 + hash(k, 2, 8) * 16; e.capsula(x, 70, x + (hash(k, 3, 8) - 0.5) * 6, 70 - h, 1.2, 0.6, J); }
  e.musgo(G, 0.3, 4, [M]);
  return e.render();
}

/** Ruinas del Viejo Reino: la cabeza del rey caída, de costado, con la corona rajada y musgo en la barba. */
function cabezaRey(): Raster {
  const e = new Escultor(120, 96);
  const P = e.rampa(MAT.piedra), O = e.rampa(MAT.bronce), G = e.rampa(MAT.musgo), K = e.rampa(['#0a0b0e', '#14161c', '#1e2028']);
  // la cara, de costado (mira hacia arriba a la derecha)
  e.esfera(56, 54, 38, 34, P, { rugoso: 0.5, semilla: 3 });
  // nariz, ceja y labios
  e.poligono([[74, 40], [88, 52], [76, 58]], P, { bisel: 3, luz: 0.05 });
  e.capsula(60, 34, 82, 30, 3, 2, P, { luz: 0.08 });
  e.capsula(70, 70, 86, 64, 2.5, 2, P, { luz: -0.05 });
  // ojo cerrado
  e.tallar([[66, 42], [68, 43], [70, 43], [72, 42], [74, 41]]);
  // la barba de piedra, con trenzas
  e.poligono([[30, 72], [62, 84], [88, 78], [80, 92], [36, 94], [20, 84]], P, { bisel: 3, rugoso: 0.6, semilla: 6, luz: -0.04 });
  e.luz((x, y) => (y > 76 && (x + (y >> 1)) % 6 === 0 ? -0.3 : 0));
  // la corona de bronce, caída de lado, con una punta rota
  e.poligono([[14, 22], [36, 8], [42, 18], [48, 4], [54, 18], [60, 6], [64, 22], [38, 40], [20, 38]], O, { bisel: 3, rugoso: 0.3, semilla: 8 });
  e.grieta(40, 22, 14, 1.2, 2, 0.5);
  // la base rota del cuello (adentro oscuro)
  e.poligono([[18, 50], [24, 44], [30, 62], [20, 66]], K, { bisel: 0 });
  e.grieta(50, 30, 22, 1.0, 4, 0.45); e.grieta(30, 60, 16, 0.2, 5, 0.4);
  e.musgo(G, 0.45, 11, [P]);
  return e.render();
}

/** Colina de los Goblins: el tótem goblin, caras de madera apiladas con plumas, ollas y un cuerno de guerra. */
function totemGoblin(): Raster {
  const e = new Escultor(72, 144);
  const M = e.rampa(MAT.madera), P = e.rampa(['#2a3a10', '#48601a', '#6a8a24', '#90b030', '#c0e050']), R = e.rampa(['#3a0a0a', '#6a1a10', '#a03020', '#d05030', '#f08050']), H = e.rampa(MAT.hueso), B = e.rampa(MAT.bronce), K = e.rampa(['#070605', '#120e0a']);
  e.cilindro(36, 22, 134, 15, 5, M, { rugoso: 0.4, semilla: 4 });
  // tres caras: bocas con dientes, ojos hundidos, pintura
  const cara = (y: number, k: number) => {
    e.poligono([[22, y], [50, y], [52, y + 8], [20, y + 8]], M, { bisel: 2, luz: 0.08 });
    e.esfera(29, y + 14, 4, 3, K); e.esfera(43, y + 14, 4, 3, K);
    e.poligono([[24, y + 22], [48, y + 22], [44, y + 30], [28, y + 30]], K, { bisel: 0 });
    for (let x = 27; x < 46; x += 4) e.poligono([[x, y + 22], [x + 3, y + 22], [x + 1.5, y + 25]], H, { bisel: 0 });
    e.capsula(18, y + 6 + k, 24, y + 18, 1.2, 1.2, R); e.capsula(54, y + 6 - k, 48, y + 18, 1.2, 1.2, R);
    e.punto(29, y + 14, R, 0.6); e.punto(43, y + 14, R, 0.6);
  };
  cara(28, 1); cara(64, -1); cara(100, 0);
  // orejas de goblin arriba y plumas
  e.poligono([[20, 24], [2, 8], [24, 16]], P, { bisel: 2 }); e.poligono([[52, 24], [70, 8], [48, 16]], P, { bisel: 2 });
  for (const [x, a] of [[30, -0.3], [36, 0], [42, 0.3]] as [number, number][]) e.capsula(x, 20, x + Math.sin(a) * 18, 20 - Math.cos(a) * 18, 2.5, 1, R);
  // ollas colgando y el cuerno
  e.esfera(12, 92, 6, 6, B); e.esfera(60, 120, 6, 5, B);
  e.trazo([[50, 84], [62, 80], [68, 70]], 2, 4, H);
  return e.render();
}

/** Campo de Calabazas: la calabaza gigante que alguien vació para vivir adentro (puerta, ventana y chimenea). */
function calabazaCasa(): Raster {
  const e = new Escultor(112, 112);
  const C = e.rampa(MAT.calabaza), V = e.rampa(['#0a1a08', '#1a3010', '#2e4a18', '#466a22', '#62882e']), M = e.rampa(MAT.maderaVieja), K = e.rampa(['#1a0a02', '#2e1404']), L = e.rampa(['#6a3a00', '#c87a10', '#ffc040', '#fff0a0'], true), P = e.rampa(MAT.piedraTibia);
  // gajos: cinco esferas solapadas
  for (const [x, rx, l] of [[22, 20, -0.08], [86, 20, -0.08], [36, 24, 0], [74, 24, 0], [56, 28, 0.06]] as [number, number, number][]) e.esfera(x + 2, 70, rx, 36, C, { rugoso: 0.25, semilla: x, luz: l });
  // tallo y una hoja
  e.capsula(58, 36, 64, 18, 5, 3, V);
  e.poligono([[64, 26], [84, 18], [92, 28], [76, 32]], V, { bisel: 2 });
  e.trazo([[50, 34], [40, 24], [34, 28], [38, 34]], 1.2, 1, V);
  // puerta redonda de madera y ventana con luz
  e.caja(48, 72, 18, 34, 2, M, { luz: -0.05 });
  e.esfera(57, 74, 9, 6, M, { luz: -0.05, solo: (_x, y) => y < 74 });
  e.punto(62, 90, e.rampa(MAT.oro), 0.4);
  e.esfera(82, 62, 7, 7, K); e.esfera(82, 62, 5, 5, L); e.capsula(82, 56, 82, 68, 0.6, 0.6, M); e.capsula(76, 62, 88, 62, 0.6, 0.6, M);
  // chimenea de piedra torcida
  e.caja(26, 22, 10, 24, 3, P, { rugoso: 0.4 });
  // escalón
  e.caja(44, 104, 26, 6, 2, P);
  const r = e.render();
  halo(r, 82, 62, 16, '#ffc040', 0.9);
  return r;
}

/** Las Alturas: la torre del vigía, partida a la mitad, con el estandarte del viejo reino todavía colgado. */
function torreVigia(): Raster {
  const e = new Escultor(88, 156);
  const P = e.rampa(MAT.piedra), G = e.rampa(MAT.musgo), M = e.rampa(MAT.madera), B = e.rampa(['#0a1830', '#16305a', '#26508a', '#3a74b4', '#5a9ad8']), O = e.rampa(MAT.oro), K = e.rampa(['#06070a', '#0e1014']);
  // cilindro de piedra con el borde de arriba roto
  e.cilindro(42, 50, 148, 28, 8, P, { rugoso: 0.5, semilla: 2, sinTapa: true, solo: (x, y) => y > 50 + Math.abs(Math.sin(x * 0.5)) * 10 + (x > 50 ? (x - 50) * 0.9 : 0) });
  // sillares
  e.luz((x, y) => ((y % 10 === 0) || ((x + ((y / 10) | 0) * 7) % 14 === 0) ? -0.28 : 0));
  // ventana oscura y puerta
  e.caja(36, 74, 10, 18, 1, K, { bisel: 0 });
  e.esfera(42, 132, 9, 12, K, { solo: (_x, y) => y < 148 });
  // asta y estandarte azul con sol dorado
  e.capsula(24, 66, 24, 16, 1.6, 1.4, M);
  e.poligono([[25, 18], [52, 22], [48, 34], [54, 46], [26, 44]], B, { bisel: 2, rugoso: 0.2 });
  e.esfera(38, 31, 5, 5, O);
  e.grieta(48, 40, 6, 1.6, 2, 0.4);
  // piedras caídas al pie
  for (const [x, y, s] of [[76, 146, 7], [84, 150, 5], [10, 150, 6]] as [number, number, number][]) e.esfera(x, y, s, s * 0.7, P, { rugoso: 0.5, semilla: x });
  e.musgo(G, 0.4, 3, [P]);
  return e.render();
}

/** Arena del Minotauro: el hacha del primer minotauro, clavada en una roca partida. */
function hachaMinotauro(): Raster {
  const e = new Escultor(96, 128);
  const P = e.rampa(MAT.piedraTibia), H = e.rampa(MAT.hierro), M = e.rampa(MAT.madera), C = e.rampa(MAT.tela), Hu = e.rampa(MAT.hueso);
  // la roca partida
  e.poligono([[6, 120], [12, 92], [30, 78], [46, 84], [48, 120]], P, { bisel: 5, rugoso: 0.6, semilla: 7 });
  e.poligono([[50, 120], [52, 86], [68, 76], [86, 88], [92, 120]], P, { bisel: 5, rugoso: 0.6, semilla: 8, luz: -0.05 });
  // el mango largo, con cuero atado
  e.capsula(54, 4, 48, 92, 3.2, 3.6, M, { rugoso: 0.2 });
  for (let k = 0; k < 4; k++) e.capsula(46 + k * 0.3, 16 + k * 6, 58 - k * 0.3, 15 + k * 6, 1.4, 1.4, C);
  // la hoja doble, una mitad enterrada en la roca
  e.poligono([[50, 80], [20, 62], [14, 82], [22, 98], [48, 92]], H, { bisel: 3, rugoso: 0.3, semilla: 9 });
  e.poligono([[50, 80], [76, 62], [84, 78], [48, 92]], H, { bisel: 3, rugoso: 0.3, semilla: 10, luz: -0.05 });
  e.grieta(20, 80, 10, 0.3, 4, 0.45);
  // un cuerno de minotauro colgado del mango
  e.trazo([[56, 30], [66, 34], [72, 44], [70, 52]], 3, 1, Hu);
  e.grieta(48, 100, 18, 1.5, 6, 0.5);
  return e.render();
}

export function bosqueMonumentos(): Monumento[] {
  return [
    { zona: 'Claro de la Llegada', obj: monumento('mon_bosque_carreta', [carreta()], [56, 74], 56, 'larga'), historia: 'La carreta de los primeros viajeros, volcada; ahora le crecen flores adentro.' },
    { zona: 'Pradera de las Mariposas', obj: monumento('mon_bosque_hada', [hada()], [40, 121], 40, 'larga'), historia: 'El hada de piedra que cuidaba la pradera, con un ala rota; una mariposa de luz se le posa en la mano.' },
    { zona: 'El Abuelo Roble', obj: monumento('mon_bosque_piedra_nombres', [piedraNombres()], [36, 104], 36, 'larga'), historia: 'La piedra de los nombres: las manos de una familia talladas de grande a chica, y velas que alguien todavía prende.' },
    { zona: 'Bosque Profundo', obj: monumento('mon_bosque_arbol_hueco', [arbolHueco()], [51, 132], 48, 'larga'), historia: 'El árbol abuelo hueco: algo vive en el tronco y abre los ojos cuando pasas.' },
    { zona: 'Anillo de las Hadas', obj: monumento('mon_bosque_trono_hongos', [tronoHongos()], [40, 89], 40, 'larga'), historia: 'El trono de hongos donde la reina de las hadas daba audiencia; todavía gotea luz turquesa.' },
    { zona: 'Claro Escondido', obj: monumento('mon_bosque_altar_ciervo', [altarCiervo()], [48, 89], 64, 'larga'), historia: 'El altar del ciervo blanco: los cuernos sobre la laja y bayas que alguien deja de ofrenda.' },
    { zona: 'Arroyo Cristalino', obj: monumento('mon_bosque_molino', [molino()], [62, 105], 72, 'larga'), historia: 'El molino del arroyo: la rueda se soltó y quedó apoyada en la casita sin techo.', prefiere: 'agua' },
    { zona: 'Lago Espejo', obj: monumento('mon_bosque_barca', [barca()], [56, 64], 72, 'larga'), historia: 'La barca del pescador, varada entre juncos con la red adentro, como si fuera a volver.', prefiere: 'agua' },
    { zona: 'Ruinas del Viejo Reino', obj: monumento('mon_bosque_cabeza_rey', [cabezaRey()], [56, 92], 80, 'larga'), historia: 'La cabeza del rey del viejo reino, caída de costado con la corona rajada y musgo en la barba.' },
    { zona: 'Colina de los Goblins', obj: monumento('mon_bosque_totem_goblin', [totemGoblin()], [36, 137], 30, 'larga'), historia: 'El tótem de los goblins: tres caras apiladas, plumas, ollas y el cuerno de guerra.' },
    { zona: 'Campo de Calabazas', obj: monumento('mon_bosque_calabaza_casa', [calabazaCasa()], [56, 106], 80, 'larga'), historia: 'La calabaza gigante que alguien vació para vivir adentro: hay luz en la ventana.' },
    { zona: 'Las Alturas', obj: monumento('mon_bosque_torre_vigia', [torreVigia()], [42, 151], 56, 'larga'), historia: 'La torre del vigía, partida a la mitad, con el estandarte azul del viejo reino todavía colgado.' },
    { zona: 'Arena del Minotauro', obj: monumento('mon_bosque_hacha_minotauro', [hachaMinotauro()], [49, 120], 80, 'larga'), historia: 'El hacha del primer minotauro, clavada en la roca que partió de un golpe.' },
  ];
}
