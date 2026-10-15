import type { Raster } from '../../core/raster';
import { Escultor, MAT, halo } from './escultor';
import { monumento, type Monumento } from './monumento';
import { hash } from '../puertoObjects';

/**
 * Mundo 5, la Ciudad Dormida: ocre y violeta de sueño. La ciudad se durmió en medio de un día cualquiera y todo quedó
 * a mitad de camino: el pan en el horno, la música a medio tocar, el reloj parado. Encima, el polvo de sueño.
 */

const PIEDRA = ['#14121c', '#22202e', '#343142', '#4a4658', '#625e72', '#7e7a8e', '#a09cae'] as const;
const OCRE = ['#2a1a0a', '#4a3014', '#6e4a20', '#946630', '#b88444', '#d8a45c', '#f0c87c'] as const;
const SUENO = MAT.sueno;

/** polvo de sueño: puntitos lilas sobre lo que mira para arriba */
function polvoSueno(e: Escultor, m: number, semilla: number) {
  e.cubrir(m, (x, y, ny) => ny < -0.2 && hash(x, y, semilla) < 0.05);
}

/** La Puerta de la Ciudad: el guardia que se durmió de pie, apoyado en su lanza, con el casco caído sobre los ojos. */
function guardia(): Raster {
  const e = new Escultor(80, 132);
  const P = e.rampa(PIEDRA), O = e.rampa(OCRE), H = e.rampa(MAT.hierro), S = e.rampa(SUENO), B = e.rampa(MAT.bronce);
  e.caja(16, 112, 48, 18, 5, P, { rugoso: 0.4, semilla: 1 });
  // el cuerpo, ladeado hacia la lanza, con la capa ocre
  e.poligono([[22, 112], [26, 70], [32, 48], [52, 48], [56, 70], [54, 112]], O, { bisel: 3, rugoso: 0.3, semilla: 2, luz: -0.05 });
  e.poligono([[28, 110], [30, 72], [36, 52], [50, 52], [52, 72], [50, 110]], P, { bisel: 4, rugoso: 0.3, semilla: 3 });
  e.luz((x, y) => (y > 80 && y < 110 && (x - 30) % 6 === 0 ? -0.2 : 0));
  // cabeza ladeada y el casco caído sobre los ojos
  e.esfera(40, 40, 8, 9, P, { rugoso: 0.2 });
  e.esfera(41, 35, 10, 7, H, { solo: (_x, y) => y < 40 });
  e.capsula(32, 40, 50, 37, 1.6, 1.6, H, { luz: 0.1 });
  e.capsula(41, 28, 41, 22, 1.4, 1, e.rampa(['#3a1010', '#7a2020', '#b03a3a']));
  // la lanza larga y el brazo que la abraza
  e.capsula(62, 120, 60, 6, 1.6, 1.6, e.rampa(MAT.madera));
  e.poligono([[56, 8], [60, 0], [64, 8], [60, 14]], H, { bisel: 1 });
  e.capsula(50, 56, 60, 62, 3, 2.6, P);
  // el escudo apoyado en el piso
  e.esfera(18, 98, 11, 14, B, { rugoso: 0.2 }); e.esfera(18, 98, 4, 5, O);
  // las zetas de sueño talladas en el pedestal
  e.tallar([[26, 118], [30, 118], [26, 122], [28, 120], [30, 122], [36, 120], [39, 120], [36, 123], [37, 122], [39, 123]]);
  polvoSueno(e, S, 4);
  return e.render();
}

/** La Calle de los Panaderos: el horno de pan, con las hogazas que se hicieron piedra mientras todos dormían. */
function horno(): Raster {
  const e = new Escultor(112, 100);
  const L = e.rampa(['#1a0e0c', '#3a1e16', '#5a2e20', '#7a4430', '#9a5a40', '#b87454']), P = e.rampa(PIEDRA), K = e.rampa(['#06040a', '#0e0a12']), Pa = e.rampa(OCRE), M = e.rampa(MAT.madera), S = e.rampa(SUENO), Br = e.rampa(['#4a2a6a', '#7a4ab0', '#b080ff'], true);
  // la cúpula de ladrillo y la chimenea
  e.esfera(56, 56, 48, 42, L, { rugoso: 0.3, semilla: 1, solo: (_x, y) => y < 92 });
  e.luz((x, y) => (((y % 7 === 0) || ((x + ((y / 7) | 0) * 5) % 12 === 0)) ? -0.25 : 0));
  e.caja(72, 4, 14, 24, 3, L, { rugoso: 0.3 });
  // la boca del horno en arco, con brasas que se volvieron lilas (de sueño)
  e.esfera(56, 70, 18, 16, P, { solo: (_x, y) => y < 92 });
  e.esfera(56, 72, 13, 12, K, { solo: (_x, y) => y < 92 });
  for (let k = 0; k < 5; k++) e.punto(48 + k * 4, 88 - (k % 2), Br, 0.2);
  // la pala de madera apoyada y las hogazas de piedra en una tabla
  e.capsula(14, 96, 30, 30, 1.4, 1.4, M);
  e.esfera(32, 28, 7, 4, M);
  e.caja(80, 84, 30, 6, 2, M);
  for (const x of [86, 96, 104]) e.esfera(x, 80, 5, 4, Pa, { rugoso: 0.2 });
  e.caja(4, 90, 104, 8, 3, P, { rugoso: 0.3, luz: -0.05 });
  polvoSueno(e, S, 5);
  const r = e.render();
  halo(r, 56, 82, 14, '#b080ff', 0.6);
  return r;
}

/** La Plaza de la Fuente: el reloj de plaza, un poste de hierro con cuatro caras paradas en la misma hora. */
function relojPlaza(): Raster {
  const e = new Escultor(64, 152);
  const H = e.rampa(MAT.hierro), O = e.rampa(MAT.oro), C = e.rampa(['#6a6458', '#a8a090', '#e0dccc', '#fffff0']), K = e.rampa(['#0a0a0e', '#14141a']), P = e.rampa(PIEDRA), S = e.rampa(SUENO);
  e.caja(18, 140, 28, 10, 3, P, { rugoso: 0.3 });
  e.cilindro(32, 128, 142, 9, 3, H, { rugoso: 0.2 });
  e.cilindro(32, 48, 132, 4, 1.5, H, { sinTapa: true });
  for (const y of [70, 100]) e.esfera(32, y, 6, 2.4, H, { luz: 0.1 });
  // la caja del reloj con techito y las dos caras que se ven
  e.caja(14, 18, 36, 34, 4, H);
  e.poligono([[10, 20], [32, 4], [54, 20]], H, { bisel: 2, luz: 0.05 });
  e.esfera(32, 4, 3, 3, O);
  e.esfera(26, 36, 9, 10, O); e.esfera(26, 36, 7, 8, C);
  e.cilindro(44, 26, 46, 3, 8, O, { sinTapa: true, luz: -0.2 });
  // las agujas paradas (las tres menos diez, como en la torre)
  e.capsula(26, 36, 26, 30, 0.6, 0.6, K); e.capsula(26, 36, 21, 38, 0.6, 0.6, K);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; e.punto(26 + Math.cos(a) * 6, 36 + Math.sin(a) * 7, K, 0.1); }
  polvoSueno(e, S, 6);
  return e.render();
}

/** El Barrio de los Músicos: el arpa gigante; una cuerda está rota y las otras todavía vibran solas. */
function arpa(): Raster {
  const e = new Escultor(88, 132);
  const O = e.rampa(MAT.oro), M = e.rampa(OCRE), C = e.rampa(['#4a3a6a', '#8a7ab0', '#d0c0f0', '#ffffff'], true), P = e.rampa(PIEDRA), S = e.rampa(SUENO);
  e.caja(14, 116, 60, 12, 4, P, { rugoso: 0.3 });
  // la columna, el cuello curvo y la caja de resonancia
  e.capsula(20, 118, 18, 22, 4, 3.4, O, { rugoso: 0.15 });
  e.esfera(18, 20, 6, 6, O, { luz: 0.1 });
  e.trazo([[18, 22], [34, 14], [52, 20], [66, 34], [76, 46]], 4, 3, O);
  e.poligono([[28, 116], [70, 116], [80, 48], [72, 42]], M, { bisel: 3, rugoso: 0.25, semilla: 4 });
  // las cuerdas (una rota que cuelga)
  for (let k = 0; k < 9; k++) {
    const x0 = 24 + k * 5.5, y0 = 18 + k * 2.6, x1 = 30 + k * 5.2, y1 = 114 - k * 7.4;
    if (k === 5) { e.trazo([[x0, y0], [x0 + 2, y0 + 20], [x0 - 2, y0 + 30]], 0.5, 0.5, C); continue; }
    e.capsula(x0, y0, x1, y1, 0.5, 0.5, C, { luz: -0.15 + (k % 2) * 0.1 });
  }
  // tallas en la columna
  e.tallar(Array.from({ length: 12 }, (_, k) => [18 + (k % 2), 40 + k * 6] as [number, number]));
  polvoSueno(e, S, 7);
  const r = e.render();
  halo(r, 50, 70, 28, '#d0c0f0', 0.35);
  return r;
}

/** Los Jardines de Piedra: el cisne de piedra del estanque seco, con la cabeza bajo el ala, dormido. */
function cisne(): Raster {
  const e = new Escultor(100, 88);
  const P = e.rampa(MAT.marmol), Pi = e.rampa(PIEDRA), G = e.rampa(['#0e140e', '#1a261a', '#283a26', '#3a4e34', '#506844']), S = e.rampa(SUENO);
  // el borde del estanque seco
  e.esfera(50, 76, 46, 10, Pi, { rugoso: 0.4, semilla: 1 });
  e.esfera(50, 75, 38, 6, e.rampa(['#0a0810', '#14101c', '#201a2a']));
  // cuerpo del cisne, ala levantada, cuello que se dobla y la cabeza escondida
  e.esfera(50, 58, 30, 16, P, { rugoso: 0.2, semilla: 2 });
  e.poligono([[30, 54], [44, 30], [72, 34], [82, 52], [60, 62]], P, { bisel: 4, rugoso: 0.25, semilla: 3, luz: 0.04 });
  e.luz((x, y) => (y > 34 && y < 58 && x > 40 && (x + y) % 6 === 0 ? -0.2 : 0));
  // cuello en S que sube y la cabeza gacha, con el pico apoyado en el pecho (duerme)
  e.trazo([[28, 58], [20, 46], [18, 32], [22, 20], [30, 14]], 5, 3.6, P);
  e.esfera(32, 15, 5, 4.4, P, { luz: 0.05 });
  e.poligono([[34, 16], [42, 22], [40, 25], [33, 19]], e.rampa(['#3a2a10', '#7a5a20', '#c8a050']), { bisel: 1 });
  e.tallar([[31, 14], [33, 14]]);
  e.poligono([[76, 54], [96, 44], [90, 58]], P, { bisel: 2 });
  // musgo de jardín y polvo de sueño
  e.cubrir(G, (x, y, ny) => ny < -0.1 && hash(x >> 1, y >> 1, 3) < 0.12);
  polvoSueno(e, S, 8);
  return e.render();
}

/** La Torre del Reloj: el engranaje gigante que se cayó de la torre y quedó clavado de canto en la calle. */
function engranaje(): Raster {
  const e = new Escultor(112, 116);
  const B = e.rampa(MAT.bronce), H = e.rampa(MAT.hierro), P = e.rampa(PIEDRA), K = e.rampa(['#06060a', '#0e0e14']), S = e.rampa(SUENO);
  // los adoquines levantados donde cayó
  for (const [x, y, w] of [[6, 104, 22], [84, 104, 22], [30, 108, 52]] as [number, number, number][]) e.caja(x, y, w, 8, 3, P, { rugoso: 0.3, semilla: x, luz: -0.04 });
  const cx = 56, cy = 58, R = 46;
  // dientes alrededor
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, b = 0.11;
    e.poligono([[cx + Math.cos(a - b * 1.4) * (R - 4), cy + Math.sin(a - b * 1.4) * (R - 4)], [cx + Math.cos(a - b) * (R + 8), cy + Math.sin(a - b) * (R + 8)], [cx + Math.cos(a + b) * (R + 8), cy + Math.sin(a + b) * (R + 8)], [cx + Math.cos(a + b * 1.4) * (R - 4), cy + Math.sin(a + b * 1.4) * (R - 4)]], B, { bisel: 2 });
  }
  e.esfera(cx, cy, R, R, B, { rugoso: 0.2, semilla: 2 });
  // agujeros entre los rayos
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; e.esfera(cx + Math.cos(a) * 27, cy + Math.sin(a) * 27, 10, 10, K); }
  e.esfera(cx, cy, 12, 12, H, { rugoso: 0.2 });
  e.esfera(cx, cy, 5, 5, K);
  e.grieta(30, 30, 22, 0.9, 4, 0.5);
  polvoSueno(e, S, 9);
  return e.render();
}

/** El Puente de los Faroles: el farol gigante que se cayó del puente, rajado, con la luz que le queda adentro. */
function farolCaido(): Raster {
  const e = new Escultor(116, 84);
  const H = e.rampa(MAT.hierro), O = e.rampa(MAT.oro), V = e.rampa(MAT.luzDorada, true), Vs = e.rampa(['#2a1e3a', '#4a3a66', '#7a68a0', '#b0a0d8'], true), P = e.rampa(PIEDRA), S = e.rampa(SUENO);
  // de costado: el poste partido a la izquierda y la cabeza del farol a la derecha
  e.capsula(6, 70, 54, 60, 4, 4.5, H, { rugoso: 0.2 });
  e.esfera(56, 60, 6, 7, O);
  // la jaula del farol (de costado), con vidrios rotos
  e.poligono([[60, 44], [100, 34], [108, 66], [64, 76]], H, { bisel: 2 });
  e.poligono([[64, 48], [98, 40], [104, 64], [68, 72]], V, { bisel: 0, luz: -0.05 });
  e.poligono([[80, 44], [98, 40], [100, 52], [84, 56]], Vs, { bisel: 0 });
  e.luz((x, y) => (Math.abs(x - 82 - (y - 56) * 0.25) < 1 && y > 42 && y < 74 ? -0.6 : 0));
  // techito y remate
  e.poligono([[98, 30], [112, 46], [110, 70], [104, 64], [100, 36]], O, { bisel: 2, luz: -0.05 });
  e.esfera(112, 58, 4, 4, O);
  // vidrios en el piso
  for (let k = 0; k < 6; k++) e.poligono([[40 + k * 9, 80], [43 + k * 9, 76], [45 + k * 9, 80]], V, { bisel: 0, luz: -0.2 });
  e.esfera(60, 80, 54, 3, P, { luz: -0.1 });
  polvoSueno(e, S, 10);
  const r = e.render();
  halo(r, 84, 56, 34, '#ffd070', 0.7);
  return r;
}

/** El Palacio Dormido: la corona gigante del Rey de Piedra, caída sobre su almohada de terciopelo. */
function corona(): Raster {
  const e = new Escultor(100, 84);
  const O = e.rampa(MAT.oro), T = e.rampa(['#1a0a2a', '#2e1448', '#46226a', '#62348a', '#8050aa', '#a070c8']), Jr = e.rampa(['#3a0a10', '#8a1a28', '#e04a5a', '#ffb0b8'], true), Jv = e.rampa(['#0a2a2a', '#1a7a6a', '#4ad0b8', '#c0fff0'], true), Bo = e.rampa(MAT.oro);
  // la almohada
  e.esfera(50, 62, 46, 18, T, { rugoso: 0.15, semilla: 1 });
  for (const [x, y] of [[8, 62], [92, 62]] as [number, number][]) e.esfera(x, y + 8, 3, 6, Bo);
  e.luz((x, y) => (Math.abs(y - 62 - (x - 50) * 0.05) < 1 ? -0.2 : 0));
  // la corona, ladeada: aro y puntas con bolitas
  e.cilindro(50, 34, 58, 30, 8, O, { rugoso: 0.15, semilla: 2 });
  e.esfera(50, 34, 26, 6, e.rampa(['#1a0a20', '#2a1430']));
  for (let k = 0; k < 7; k++) {
    const x = 24 + k * 8.6, h = k % 2 ? 14 : 22;
    e.poligono([[x - 5, 38], [x, 38 - h], [x + 5, 38]], O, { bisel: 1.5, luz: k % 2 ? -0.05 : 0.05 });
    e.esfera(x, 38 - h, 2.6, 2.6, O, { luz: 0.15 });
  }
  for (const [x, J] of [[32, Jr], [50, Jv], [68, Jr]] as [number, number][]) e.esfera(x, 48, 3.5, 4, J);
  const r = e.render();
  halo(r, 50, 48, 24, '#ffd890', 0.5);
  return r;
}

/** El Corazón del Jardín: el árbol de piedra más viejo, con un nido y un pájaro de piedra dormido adentro. */
function arbolPiedra(): Raster {
  const e = new Escultor(80, 120);
  const P = e.rampa(MAT.marmol), Pi = e.rampa(PIEDRA), N = e.rampa(OCRE), S = e.rampa(SUENO), G = e.rampa(['#0e140e', '#1a261a', '#283a26', '#3a4e34', '#506844']);
  e.esfera(40, 112, 30, 7, Pi, { rugoso: 0.4 });
  e.poligono([[30, 114], [34, 74], [30, 52], [40, 56], [50, 50], [46, 74], [52, 114]], Pi, { bisel: 4, rugoso: 0.4, semilla: 2 });
  e.capsula(36, 60, 16, 40, 3, 2, Pi); e.capsula(46, 56, 64, 36, 3, 2, Pi);
  // copa: bolas de piedra tallada como hojas
  for (const [x, y, r] of [[40, 30, 20], [20, 38, 13], [62, 36, 14], [30, 16, 12], [52, 16, 12]] as [number, number, number][]) e.esfera(x, y, r, r * 0.85, P, { rugoso: 0.3, semilla: x });
  e.luz((x, y) => (y < 54 && hash(x >> 1, y >> 1, 4) < 0.12 ? -0.25 : 0));
  // el nido en la horqueta y el pajarito dormido
  e.esfera(40, 54, 10, 4, N, { rugoso: 0.6, semilla: 5 });
  e.esfera(40, 50, 4, 3, Pi, { luz: 0.1 }); e.esfera(43, 48, 2, 2, Pi, { luz: 0.1 });
  e.cubrir(G, (x, y, ny) => y > 90 && ny < 0 && hash(x >> 1, y >> 1, 6) < 0.3);
  polvoSueno(e, S, 11);
  return e.render();
}

/** El Desván del Organillero: el organillo con su monito de juguete encima, la manivela a medio girar. */
function organillo(): Raster {
  const e = new Escultor(68, 80);
  const M = e.rampa(OCRE), O = e.rampa(MAT.oro), T = e.rampa(['#3a0a10', '#6a1420', '#9a2434', '#c03a48']), H = e.rampa(MAT.hierro), Mo = e.rampa(['#1a0e08', '#3a2010', '#5a341c', '#7a4a2a']), C = e.rampa(['#5a3a2a', '#9a6a50', '#d0a080']);
  // ruedas y carrito
  for (const x of [16, 52]) { e.esfera(x, 72, 7, 7, H); e.esfera(x, 72, 2, 2, O); }
  e.caja(8, 30, 52, 40, 6, M, { rugoso: 0.2 });
  // el frente con la tela roja y los tubitos
  e.caja(14, 40, 40, 24, 0, T, { bisel: 1 });
  for (let k = 0; k < 7; k++) e.cilindro(18 + k * 5.4, 42 + (k % 2) * 2, 60, 1.8, 0.8, O, { sinTapa: true });
  // manivela
  e.capsula(60, 50, 66, 44, 1, 1, H); e.capsula(66, 44, 66, 38, 1.2, 1.2, M);
  // el monito con su gorro
  e.esfera(32, 24, 7, 6, Mo); e.esfera(32, 15, 5, 5, Mo); e.esfera(32, 16, 3, 2.4, C);
  e.cilindro(32, 8, 11, 2.6, 1, T);
  e.capsula(26, 24, 22, 32, 1.4, 1, Mo); e.capsula(38, 24, 42, 30, 1.4, 1, Mo);
  e.trazo([[38, 28], [46, 24], [48, 16]], 1, 0.8, Mo);
  return e.render();
}

export function ciudadMonumentos(): Monumento[] {
  return [
    { zona: 'La Puerta de la Ciudad', obj: monumento('mon_ciudad_guardia', [guardia()], [40, 128], 48, 'contacto'), historia: 'El guardia que se durmió de pie en la puerta, abrazado a la lanza y con el casco sobre los ojos.' },
    { zona: 'La Calle de los Panaderos', obj: monumento('mon_ciudad_horno', [horno()], [56, 96], 96, 'contacto'), historia: 'El horno de pan con las hogazas hechas piedra; las brasas se volvieron lilas de sueño.' },
    { zona: 'La Plaza de la Fuente', obj: monumento('mon_ciudad_reloj_plaza', [relojPlaza()], [32, 148], 28, 'contacto'), historia: 'El reloj de la plaza, parado a las tres menos diez como la torre: la hora en que se durmió la ciudad.' },
    { zona: 'El Barrio de los Músicos', obj: monumento('mon_ciudad_arpa', [arpa()], [44, 126], 56, 'contacto'), historia: 'El arpa gigante del barrio: una cuerda rota y las otras todavía vibran solas.' },
    { zona: 'Los Jardines de Piedra', obj: monumento('mon_ciudad_cisne', [cisne()], [50, 84], 40, 'contacto'), historia: 'El cisne de piedra del estanque seco, dormido con la cabeza bajo el ala.' },
    { zona: 'La Torre del Reloj', obj: monumento('mon_ciudad_engranaje', [engranaje()], [56, 110], 72, 'contacto'), historia: 'El engranaje gigante que se cayó de la torre y quedó clavado de canto en la calle.' },
    { zona: 'El Puente de los Faroles', obj: monumento('mon_ciudad_farol_caido', [farolCaido()], [58, 80], 100, 'contacto'), historia: 'El farol gigante que se cayó del puente: rajado, pero con la luz que le queda adentro.' },
    { zona: 'El Palacio Dormido', obj: monumento('mon_ciudad_corona', [corona()], [50, 78], 88, 'contacto'), historia: 'Una corona gigante del Rey de Piedra, caída sobre su almohada de terciopelo.' },
    { zona: 'El Corazón del Jardín', obj: monumento('mon_ciudad_arbol_piedra', [arbolPiedra()], [40, 116], 24, 'contacto'), historia: 'El árbol de piedra más viejo del jardín, con un pajarito de piedra dormido en su nido.' },
    { zona: 'El Desván del Organillero', obj: monumento('mon_ciudad_organillo', [organillo()], [34, 78], 52, 'contacto'), historia: 'El organillo con su monito de juguete encima, con la manivela a medio girar.' },
  ];
}
