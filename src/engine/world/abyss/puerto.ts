import type { Raster } from '../../core/raster';
import { Escultor, MAT, halo } from './escultor';
import { monumento, type Monumento } from './monumento';
import { hash } from '../puertoObjects';

/**
 * Mundo 4, el Puerto Ahogado: gris niebla con el oro del faro. El mar subió una noche y no volvió a bajar del todo;
 * todo quedó mojado, con algas y percebes, y lo único que brilla es lo que tiene que ver con el faro.
 */

const MADERA_MOJADA = ['#0c0e0e', '#161a1a', '#222828', '#30383a', '#40494a', '#535e5e', '#6a7674'] as const;
const ALGA = ['#08120e', '#0e1e16', '#16301e', '#204226', '#2c542e', '#3a6838'] as const;
const PERCEBE = ['#3a3a36', '#6a6a62', '#9a9a8e', '#c8c8b8', '#ecece0'] as const;

/** algas que cuelgan y percebes sobre lo que estuvo bajo el agua */
function mojado(e: Escultor, alga: number, perc: number, semilla: number, hasta: number) {
  e.cubrir(alga, (x, y, ny) => y > hasta && ny > -0.3 && hash(x >> 1, y >> 1, semilla) < 0.22);
  e.cubrir(perc, (x, y) => y > hasta - 10 && hash(x >> 1, y >> 1, semilla + 1) < 0.012);
}

/** El Muelle de Llegada: el ancla gigante de un barco que nadie vio, clavada en las tablas. */
function ancla(): Raster {
  const e = new Escultor(96, 116);
  const H = e.rampa(MAT.oxido), Hi = e.rampa(MAT.hierro), A = e.rampa(ALGA), P = e.rampa(PERCEBE), C = e.rampa(MAT.paja), M = e.rampa(MADERA_MOJADA);
  // tablas rotas alrededor de donde se clavó
  for (const [x, y, w] of [[4, 100, 30], [62, 102, 30], [30, 108, 36]] as [number, number, number][]) e.caja(x, y, w, 8, 2, M, { rugoso: 0.3, semilla: x });
  // la caña, el arganeo arriba y el cepo cruzado
  e.capsula(48, 10, 46, 104, 5, 6, H, { rugoso: 0.35, semilla: 1 });
  e.esfera(48, 10, 9, 9, H); e.esfera(48, 10, 5, 5, e.rampa(['#000000', '#05070a']));
  e.capsula(26, 24, 70, 22, 3.5, 3.5, Hi, { rugoso: 0.2 });
  // los brazos curvos con las uñas
  // los brazos: un arco en U que sale de la cruz (abajo) y sube a cada lado, con la uña en punta
  const brazo = (s: number) => {
    const pts: [number, number][] = [];
    for (let k = 0; k <= 8; k++) { const t = (k / 8) * (Math.PI / 2); pts.push([47 + s * 36 * Math.sin(t), 100 - 34 * (1 - Math.cos(t))]); }
    e.trazo(pts, 5, 3.5, H, { rugoso: 0.3, semilla: 5 + s });
    const [ux, uy] = pts[pts.length - 1];
    e.poligono([[ux - s * 9, uy + 6], [ux + s * 4, uy - 12], [ux + s * 7, uy + 6]], H, { bisel: 2 });
  };
  brazo(1); brazo(-1);
  // la cadena que cae del arganeo
  for (let k = 0; k < 7; k++) e.esfera(56 + k * 3, 16 + k * 10, 2.5, 3.6, Hi, { luz: k % 2 ? -0.1 : 0.05 });
  e.trazo([[40, 30], [34, 46], [38, 60]], 1, 1, C);
  mojado(e, A, P, 3, 50);
  return e.render();
}

/** La Calle de las Redes: el secadero, un marco de palos con las redes colgadas y un pez enorme que nadie bajó. */
function secadero(): Raster {
  const e = new Escultor(112, 100);
  const M = e.rampa(MADERA_MOJADA), R = e.rampa(['#1a1a16', '#34342c', '#504e42', '#6e6a58', '#8c8670']), F = e.rampa(['#1a2028', '#2e3a48', '#4a5a6a', '#6a7e8e', '#94a8b4', '#c8d4dc']), A = e.rampa(ALGA), Fl = e.rampa(['#3a2a10', '#6a4a18', '#a07024', '#d09a30']);
  for (const x of [10, 56, 102]) e.capsula(x, 96, x + (hash(x, 1, 1) - 0.5) * 4, 14, 2.6, 2.2, M, { rugoso: 0.3, semilla: x });
  e.capsula(4, 16, 108, 12, 2, 2, M);
  // las redes colgadas (cuadrícula de nudos, caída en curva)
  for (const [x0, x1] of [[12, 54], [58, 100]] as [number, number][]) {
    for (let y = 16; y < 78; y++) for (let x = x0; x <= x1; x++) {
      const caida = Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 10, yy = y + caida * ((y - 16) / 62);
      if (((x - x0) % 5 === 0 || (y - 16) % 5 === 0) && yy < 82) e.punto(x, yy, R, -0.1 + ((x + y) % 3) * 0.05);
    }
  }
  // el pez colgado de la cola, plateado
  e.capsula(78, 18, 78, 26, 0.8, 0.8, R);
  e.esfera(78, 50, 10, 24, F, { rugoso: 0.2 });
  e.poligono([[70, 26], [78, 30], [86, 26], [78, 34]], F, { bisel: 1 });
  e.esfera(80, 66, 2, 2, e.rampa(['#000000', '#101010', '#e8e8e8']));
  e.luz((x, y) => (Math.hypot((x - 78) / 10, (y - 50) / 24) < 1 && (x + y * 2) % 7 === 0 ? -0.2 : 0));
  // flotadores de corcho
  for (const x of [20, 34, 46]) e.esfera(x, 82, 3, 3, Fl);
  e.musgo(A, 0.25, 4, [M]);
  return e.render();
}

/** El Mercado Hundido: la balanza grande del mercado, oxidada, con un platillo lleno de agua y el otro de conchas. */
function balanza(): Raster {
  const e = new Escultor(100, 124);
  const B = e.rampa(MAT.bronce), O = e.rampa(MAT.oxido), M = e.rampa(MADERA_MOJADA), A = e.rampa(MAT.agua), Co = e.rampa(['#4a3a34', '#7a665c', '#a89080', '#d0bca8', '#f0e4d4']), Al = e.rampa(ALGA);
  e.caja(30, 104, 40, 16, 4, M, { rugoso: 0.3, semilla: 1 });
  e.capsula(50, 104, 50, 20, 3.5, 3, O, { rugoso: 0.3, semilla: 2 });
  e.esfera(50, 16, 5, 5, B);
  // el brazo ladeado (pesa más el agua)
  e.capsula(14, 30, 86, 18, 2.4, 2.4, B, { rugoso: 0.2 });
  // cadenas y platillos
  for (const [x, y, s] of [[14, 30, 1], [86, 18, -1]] as [number, number, number][]) {
    e.capsula(x, y, x - 10, y + 34, 0.7, 0.7, O); e.capsula(x, y, x + 10, y + 34, 0.7, 0.7, O);
    e.esfera(x, y + 36, 16, 4, B, { solo: (_x, yy) => yy >= y + 34 });
    e.esfera(x, y + 36, 16, 6, B, { luz: -0.1, solo: (_x, yy) => yy > y + 36 });
    if (s > 0) e.esfera(x, y + 35, 13, 2.5, A, { luz: 0.1 });
    else for (let k = 0; k < 6; k++) e.esfera(x - 9 + k * 3.5, y + 33 - (k % 2), 2.2, 1.6, Co);
  }
  e.cubrir(Al, (x, y, ny) => y > 70 && ny > -0.2 && hash(x >> 1, y >> 1, 4) < 0.25);
  return e.render();
}

/** La Iglesia de la Campana Ahogada: el mascarón de proa de una mujer con un farol en las manos; el farol todavía tiene luz. */
function mascaron(): Raster {
  const e = new Escultor(80, 132);
  const M = e.rampa(MAT.maderaVieja), Pi = e.rampa(['#1a2028', '#2e3a46', '#4a5a66', '#6a7a86', '#8e9ca6']), O = e.rampa(MAT.oro), L = e.rampa(MAT.luzDorada, true), Al = e.rampa(ALGA), P = e.rampa(PERCEBE), R = e.rampa(['#141616', '#22262a', '#343a40', '#4a525a']);
  // el pedestal de rocas donde quedó encallado
  e.esfera(40, 122, 34, 10, R, { rugoso: 0.6, semilla: 1 });
  // el madero de la proa (de donde sale)
  e.poligono([[30, 126], [26, 60], [36, 30], [48, 34], [54, 126]], M, { bisel: 4, rugoso: 0.35, semilla: 2, luz: -0.1 });
  // la mujer: vestido pintado gris azul descascarado, inclinada hacia adelante
  e.poligono([[30, 110], [34, 70], [40, 46], [52, 48], [58, 70], [54, 110]], Pi, { bisel: 4, rugoso: 0.4, semilla: 3 });
  e.luz((x, y) => (hash(x >> 1, y >> 1, 9) < 0.18 && y > 50 ? -0.25 : 0));
  e.esfera(47, 38, 7, 8, Pi, { rugoso: 0.2 });
  // pelo tallado que cae hacia atrás
  e.poligono([[40, 32], [50, 30], [42, 60], [34, 62]], M, { bisel: 2, luz: 0.05 });
  // brazos adelante sosteniendo el farol
  e.capsula(50, 54, 62, 64, 2.6, 2.2, Pi); e.capsula(46, 56, 60, 66, 2.6, 2.2, Pi);
  e.caja(58, 60, 12, 16, 2, O);
  e.caja(60, 64, 8, 9, 0, L, { bisel: 0 });
  e.capsula(64, 56, 64, 60, 1, 1, O);
  mojado(e, Al, P, 7, 84);
  const r = e.render();
  halo(r, 64, 68, 26, '#ffd070', 1);
  return r;
}

/** Los Botes Volteados: la proa de un barco partido en dos; la otra mitad se la llevó el mar. */
function barcoPartido(): Raster {
  const e = new Escultor(128, 112);
  const M = e.rampa(MADERA_MOJADA), Mo = e.rampa(MAT.maderaVieja), Al = e.rampa(ALGA), P = e.rampa(PERCEBE), K = e.rampa(['#030404', '#080a0a']), T = e.rampa(['#1e2022', '#3a3c3e', '#5a5c5e', '#7a7c7c', '#9a9a98']);
  // el casco: la proa en punta a la derecha, rota a la izquierda
  e.poligono([[8, 40], [96, 30], [124, 54], [104, 92], [24, 100], [14, 86], [20, 72], [10, 60]], M, { bisel: 5, rugoso: 0.35, semilla: 2 });
  e.luz((x, y) => ((y - 30 + Math.round(x * 0.05)) % 8 === 0 ? -0.32 : 0));
  // la rotura: el interior oscuro con las cuadernas a la vista
  e.poligono([[8, 40], [30, 38], [36, 60], [28, 80], [24, 100], [14, 86], [20, 72], [10, 60]], K, { bisel: 0 });
  for (const x of [16, 24, 32]) e.capsula(x, 42, x - 2, 96, 2, 2, Mo, { luz: -0.1 });
  // la cubierta (un poco de arriba) y el mástil partido
  e.poligono([[30, 38], [96, 30], [112, 44], [36, 50]], Mo, { bisel: 2, luz: 0.08 });
  e.capsula(70, 40, 74, 4, 4, 3, Mo, { rugoso: 0.3 });
  e.poligono([[74, 4], [78, 10], [70, 12]], Mo, { bisel: 1 });
  // jirón de vela
  e.poligono([[76, 8], [100, 14], [94, 30], [80, 24]], T, { bisel: 2, rugoso: 0.3 });
  // ojo de buey
  e.esfera(96, 62, 5, 5, e.rampa(MAT.bronce)); e.esfera(96, 62, 3, 3, K);
  mojado(e, Al, P, 11, 70);
  return e.render();
}

/** El Astillero: el esqueleto de un barco que nunca se terminó, sobre sus calzos. */
function esqueleto(): Raster {
  const e = new Escultor(128, 100);
  const M = e.rampa(MAT.maderaVieja), Mm = e.rampa(MADERA_MOJADA), H = e.rampa(MAT.oxido), Al = e.rampa(ALGA);
  // calzos
  for (const x of [20, 56, 92]) e.caja(x, 86, 18, 12, 3, Mm, { rugoso: 0.3 });
  // la quilla
  e.capsula(6, 84, 122, 80, 3.4, 3, M, { rugoso: 0.2 });
  e.trazo([[122, 80], [126, 60], [124, 40]], 3, 2.4, M);
  // las costillas (cuadernas), en U, más chicas hacia la proa
  for (let k = 0; k < 9; k++) {
    const x = 12 + k * 12.5, alto = 52 - Math.max(0, k - 5) * 7, ancho = 10 - Math.max(0, k - 5) * 1.5;
    e.trazo([[x - ancho, 84 - alto], [x - ancho * 0.8, 84 - alto * 0.4], [x, 84], [x + ancho * 0.8, 84 - alto * 0.4], [x + ancho, 84 - alto]], 1.8, 1.4, M, { luz: k % 2 ? -0.06 : 0 });
  }
  // dos tablas del forro puestas y una cayendo
  e.capsula(10, 66, 90, 64, 2, 2, M, { luz: 0.08 }); e.capsula(10, 74, 100, 72, 2, 2, M, { luz: 0.04 });
  e.capsula(100, 88, 118, 70, 1.6, 1.6, M, { luz: -0.05 });
  // el martillo olvidado y clavos
  e.capsula(36, 94, 46, 92, 1, 1, M); e.caja(44, 89, 5, 4, 1, H);
  e.cubrir(Al, (x, y, ny) => y > 76 && ny > -0.3 && hash(x >> 1, y >> 1, 3) < 0.2);
  return e.render();
}

/** La Cueva de las Medusas: la almeja gigante abierta, con una perla que alumbra violeta. */
function almeja(): Raster {
  const e = new Escultor(96, 84);
  const S = e.rampa(['#1a1420', '#2e2438', '#4a3c56', '#6a5a78', '#8e7e9c', '#b4a6c0']), In = e.rampa(['#3a2a34', '#6a4e5a', '#9a7a86', '#c8a8b2', '#f0dce0']), Pe = e.rampa(['#4a2a6a', '#8a5ac0', '#c8a0ff', '#f0e0ff', '#ffffff'], true), R = e.rampa(['#100e14', '#1c1a22', '#2a2832', '#3a3844']), Al = e.rampa(ALGA);
  e.esfera(48, 76, 44, 8, R, { rugoso: 0.6, semilla: 1 });
  // valva de abajo y de arriba (abierta), con las estrías
  e.esfera(48, 64, 40, 14, S, { rugoso: 0.2, semilla: 2 });
  e.esfera(48, 60, 34, 9, In, { luz: 0.05 });
  e.esfera(48, 30, 40, 26, S, { rugoso: 0.2, semilla: 3, solo: (_x, y) => y < 44 });
  e.luz((x, y) => (y < 56 && Math.abs(((Math.atan2(y - 60, x - 48) * 10) % 1)) < 0.18 ? -0.25 : 0));
  e.esfera(48, 40, 32, 5, In, { luz: -0.1 });
  // la perla
  e.esfera(48, 56, 8, 8, Pe);
  e.cubrir(Al, (x, y) => (y > 66 || y < 12) && hash(x >> 1, y >> 1, 5) < 0.2);
  const r = e.render();
  halo(r, 48, 54, 30, '#c8a0ff', 0.9);
  return r;
}

/** El Faro: la lente del faro, caída y rajada, que sigue juntando la poca luz que queda. */
function lente(): Raster {
  const e = new Escultor(100, 100);
  const B = e.rampa(MAT.bronce), V = e.rampa(MAT.luzDorada, true), R = e.rampa(['#141616', '#22262a', '#343a40', '#4a525a', '#5e6870']), Al = e.rampa(ALGA);
  e.esfera(50, 90, 46, 9, R, { rugoso: 0.6, semilla: 1 });
  // la lente de Fresnel: anillos de vidrio dorado en un marco de bronce, ladeada sobre las piedras
  e.esfera(50, 48, 38, 40, B, { rugoso: 0.2, semilla: 2 });
  e.esfera(50, 48, 33, 35, V, { luz: -0.12 });
  e.luz((x, y) => { const d = Math.hypot((x - 50) / 33, (y - 48) / 35); if (d >= 1) return 0; const anillo = (d * 7) % 1; return anillo < 0.18 ? -0.4 : anillo > 0.8 ? 0.15 : 0; });
  // marco con remaches y el ojo central claro
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; e.punto(50 + Math.cos(a) * 36, 48 + Math.sin(a) * 38, B, 0.4); }
  e.esfera(50, 48, 6, 6, V, { luz: 0.3 });
  // la rajadura
  e.grieta(30, 22, 40, 1.1, 7, 0.6);
  e.cubrir(Al, (x, y) => y > 70 && hash(x >> 1, y >> 1, 6) < 0.3);
  const r = e.render();
  halo(r, 50, 48, 46, '#ffd070', 0.8);
  return r;
}

/** El Patio de las Redes: la pila de cajas y barriles de sal del pescadero, con su gaviota de madera tallada. */
function pilaCajas(): Raster {
  const e = new Escultor(72, 84);
  const M = e.rampa(MAT.maderaVieja), Mm = e.rampa(MADERA_MOJADA), H = e.rampa(MAT.oxido), S = e.rampa(['#6a6a68', '#9a9a96', '#c8c8c2', '#ecece6']), G = e.rampa(['#4a5458', '#8a9498', '#d8dcdc', '#ffffff']), Pk = e.rampa(['#6a4010', '#e0a030']);
  e.caja(4, 50, 32, 30, 6, M, { rugoso: 0.3, semilla: 1 });
  e.luz((x, y) => (y > 56 && y < 80 && (x === 12 || x === 26) ? -0.3 : 0));
  e.cilindro(52, 46, 80, 13, 4, Mm, { rugoso: 0.3, semilla: 2 });
  for (const y of [52, 64, 76]) e.luz((x, yy) => (yy === y && x > 38 && x < 66 ? -0.35 : 0));
  // sal derramada arriba del barril
  e.esfera(52, 46, 10, 3, S);
  e.caja(14, 26, 24, 26, 5, M, { rugoso: 0.3, semilla: 3, luz: -0.05 });
  for (const y of [34, 46]) e.capsula(14, y, 38, y, 0.6, 0.6, H);
  // la gaviota de madera pintada arriba de todo
  e.esfera(26, 20, 7, 4, G); e.esfera(31, 15, 3, 3, G); e.poligono([[33, 14], [38, 15], [33, 16]], Pk, { bisel: 0 });
  e.poligono([[20, 18], [12, 14], [22, 22]], G, { bisel: 1, luz: -0.1 });
  return e.render();
}

/** La Gruta del Ancla: el timón del barco del capitán, apoyado contra la roca, con algas en los rayos. */
function timon(): Raster {
  const e = new Escultor(72, 84);
  const M = e.rampa(MAT.maderaVieja), B = e.rampa(MAT.bronce), Al = e.rampa(ALGA), R = e.rampa(['#100e14', '#1c1a22', '#2a2832', '#3a3844']);
  e.esfera(36, 78, 32, 6, R, { rugoso: 0.6, semilla: 1 });
  const cx = 36, cy = 44, r = 26;
  e.esfera(cx, cy, r, r * 1.05, M, { solo: (x, y) => Math.hypot(x - cx, (y - cy) / 1.05) > r - 5 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    e.capsula(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8), 1.8, 2.2, M);
    e.esfera(cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8), 2.4, 2.4, M, { luz: 0.08 });
  }
  e.esfera(cx, cy, 6, 6, B);
  e.cubrir(Al, (x, y) => y > cy && hash(x >> 1, y >> 1, 3) < 0.3);
  return e.render();
}

export function puertoMonumentos(): Monumento[] {
  return [
    { zona: 'El Muelle de Llegada', obj: monumento('mon_puerto_ancla', [ancla()], [48, 108], 32, 'contacto'), historia: 'El ancla gigante de un barco que nadie vio llegar, clavada en las tablas del muelle.' },
    { zona: 'La Calle de las Redes', obj: monumento('mon_puerto_secadero', [secadero()], [56, 96], 96, 'contacto'), historia: 'El secadero de redes con un pez enorme que nadie bajó antes de que subiera el mar.' },
    { zona: 'El Mercado Hundido', obj: monumento('mon_puerto_balanza', [balanza()], [50, 120], 40, 'contacto'), historia: 'La balanza del mercado, oxidada: un platillo lleno de agua y el otro de conchas.' },
    { zona: 'La Iglesia de la Campana Ahogada', obj: monumento('mon_puerto_mascaron', [mascaron()], [40, 128], 56, 'contacto'), historia: 'El mascarón de proa de una mujer con un farol en las manos; el farol todavía tiene luz.' },
    { zona: 'Los Botes Volteados', obj: monumento('mon_puerto_barco_partido', [barcoPartido()], [64, 100], 96, 'contacto'), historia: 'La proa de un barco partido en dos; la otra mitad se la llevó el mar.', prefiere: 'agua' },
    { zona: 'El Astillero', obj: monumento('mon_puerto_esqueleto', [esqueleto()], [64, 96], 104, 'contacto'), historia: 'El esqueleto de un barco que nunca se terminó, sobre sus calzos, con el martillo olvidado.' },
    { zona: 'La Cueva de las Medusas', obj: monumento('mon_puerto_almeja', [almeja()], [48, 80], 72, 'contacto'), historia: 'La almeja gigante abierta, con una perla que alumbra violeta en la oscuridad.' },
    { zona: 'El Faro', obj: monumento('mon_puerto_lente', [lente()], [50, 96], 80, 'contacto'), historia: 'La lente del faro, caída y rajada, que sigue juntando la poca luz que queda.' },
    { zona: 'El Patio de las Redes', obj: monumento('mon_puerto_cajas', [pilaCajas()], [36, 80], 60, 'contacto'), historia: 'La pila de cajas y barriles de sal del pescadero, con su gaviota de madera tallada.' },
    { zona: 'La Gruta del Ancla', obj: monumento('mon_puerto_timon', [timon()], [36, 80], 48, 'contacto'), historia: 'El timón del barco del capitán, apoyado contra la roca de la gruta.' },
  ];
}
