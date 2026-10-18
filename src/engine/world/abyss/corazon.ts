import type { Raster } from '../../core/raster';
import { Escultor, MAT, halo } from './escultor';
import { monumento, type Monumento } from './monumento';
import { hash } from '../puertoObjects';

/**
 * Mundo 7, el Corazón Helado: azul hielo con el rojo del Diablo. Todo lo que bajó hasta acá se quedó congelado en el
 * momento en que se rindió. El único calor es rojo, y es de él.
 */

const ROJO = ['#2a0402', '#5a0a04', '#8a1408', '#c02010', '#ff3a20', '#ff8a60'] as const;
const NIEVE = ['#2e343c', '#3a424c', '#4e5864', '#6a7480', '#8a94a0', '#aab4c0', '#cad4e0'] as const;

/** nieve sobre lo que mira para arriba y escarcha en los bordes */
function nevar(e: Escultor, nieve: number, cuanto: number, semilla: number, solo?: number[]) {
  e.musgo(nieve, cuanto, semilla, solo);
}

/** La Escalera Helada: la primera heroína que bajó, congelada adentro de un bloque de hielo, con la espada en alto. */
function heroinaHielo(): Raster {
  const e = new Escultor(80, 132);
  const I = e.rampa(MAT.hielo), E = e.rampa(MAT.escarcha), F = e.rampa(['#2a3a52', '#3e5272', '#56709a', '#7494be', '#9cbcde', '#c8e0f8']), N = e.rampa(NIEVE), A = e.rampa(MAT.escarcha);
  // el bloque de hielo atrás (oscuro, para que la figura se lea encima)
  e.poligono([[10, 124], [8, 60], [20, 20], [44, 4], [70, 18], [74, 70], [70, 124]], I, { bisel: 5, luz: -0.05 });
  // la figura adentro, clara y fría: la heroína con la espada en alto y la capa
  e.poligono([[34, 54], [20, 72], [24, 100], [34, 94]], F, { bisel: 2, luz: -0.15 });
  e.poligono([[30, 116], [32, 76], [36, 56], [46, 56], [50, 76], [52, 116]], F, { bisel: 3, luz: -0.05 });
  e.esfera(41, 48, 7, 8, F);
  e.capsula(46, 60, 58, 34, 2.6, 2.2, F);
  e.capsula(58, 36, 60, 8, 1.4, 1.4, A, { luz: 0.1 });
  e.capsula(36, 62, 26, 80, 2.6, 2.2, F);
  // las facetas del hielo por delante: brillos en diagonal y escarcha en los cantos
  e.luz((x, y) => (Math.abs(x - 30 - (y - 60) * 0.3) < 1.2 && y > 16 && y < 118 ? 0.3 : Math.abs(x - 58 + (y - 40) * 0.25) < 1 && y > 10 && y < 100 ? 0.22 : 0));
  e.caja(4, 116, 72, 12, 4, N, { rugoso: 0.4 });
  nevar(e, E, 0.3, 3, [I]);
  return e.render({ oclusion: 0.08 });
}

/** El Lago de los Gigantes: la espada de uno de ellos, clavada en el hielo hasta la mitad, con la empuñadura escarchada. */
function espada(): Raster {
  const e = new Escultor(68, 150);
  const A = e.rampa(MAT.hierro), O = e.rampa(MAT.bronce), C = e.rampa(['#1a1010', '#3a2420', '#5a3a30', '#7a5040']), I = e.rampa(MAT.hielo), E = e.rampa(MAT.escarcha), R = e.rampa(ROJO, true);
  // el hielo rajado donde se clavó
  e.esfera(34, 140, 32, 8, I, { rugoso: 0.3 });
  for (let k = 0; k < 6; k++) e.grieta(34, 140, 14, (k / 6) * Math.PI * 2, k + 3, 0.6);
  // hoja ancha que sale del hielo
  e.poligono([[24, 140], [26, 54], [34, 46], [42, 54], [44, 140]], A, { bisel: 4, rugoso: 0.15, semilla: 2 });
  e.luz((x, y) => (Math.abs(x - 34) < 1 && y > 52 && y < 138 ? -0.3 : 0));
  // guarda, empuñadura con cuero y pomo con una piedra roja
  e.caja(6, 38, 56, 9, 3, O, { rugoso: 0.2 });
  e.capsula(34, 36, 34, 12, 4, 4, C);
  for (let y = 14; y < 36; y += 4) e.capsula(30, y, 38, y + 2, 1, 1, C, { luz: 0.1 });
  e.esfera(34, 8, 6, 6, O); e.esfera(34, 8, 3, 3, R);
  nevar(e, E, 0.38, 5);
  const r = e.render();
  halo(r, 34, 8, 10, '#ff3a20', 0.6);
  return r;
}

/** Las Catacumbas de Hielo: el sarcófago helado con la tapa corrida; adentro no hay nadie. */
function sarcofago(): Raster {
  const e = new Escultor(116, 84);
  const P = e.rampa(['#0e1014', '#181c24', '#262c38', '#363e4c', '#4a5464', '#62707e', '#7e8c9a']), K = e.rampa(['#020306', '#060810']), E = e.rampa(MAT.escarcha), H = e.rampa(MAT.hueso);
  // la caja
  e.caja(10, 34, 82, 44, 10, P, { rugoso: 0.35, semilla: 1 });
  e.caja(16, 36, 70, 6, 0, K, { bisel: 0 });
  // la tapa corrida a un costado, con la figura tallada
  e.poligono([[46, 30], [110, 22], [114, 34], [50, 44]], P, { bisel: 3, rugoso: 0.3, semilla: 2, luz: 0.05 });
  e.poligono([[56, 34], [104, 27], [106, 33], [58, 40]], P, { bisel: 2, luz: 0.12 });
  // tallas en el frente: calaveritas y una cruz invertida no, una espiral de escarcha
  for (const x of [24, 44, 64, 84]) { e.esfera(x, 62, 4, 4, H, { luz: -0.05 }); e.tallar([[x - 1, 61], [x + 1, 61], [x, 64]]); }
  e.tallar(Array.from({ length: 16 }, (_, k) => [18 + k * 5, 52 + (k % 2)] as [number, number]));
  nevar(e, E, 0.36, 7);
  return e.render();
}

/** El Bosque de Escarcha: el árbol de cristal de hielo, que creció donde se congeló un árbol de verdad. */
function arbolHielo(): Raster {
  const e = new Escultor(96, 144);
  const I = e.rampa(MAT.hielo), C = e.rampa(MAT.cristalCian, true), E = e.rampa(MAT.escarcha), N = e.rampa(NIEVE), Co = e.rampa(MAT.corteza);
  e.esfera(48, 136, 40, 8, N, { rugoso: 0.4 });
  // el tronco viejo adentro, oscuro, y el hielo que lo envuelve
  e.capsula(48, 138, 46, 60, 5, 3, Co, { rugoso: 0.4 });
  e.capsula(48, 138, 46, 56, 9, 6, I, { luz: -0.1, solo: (x, y) => (x + y) % 2 === 0 || hash(x, y, 3) < 0.5 });
  // ramas de cristal: prismas que salen y se abren
  const ramas: [number, number, number, number, number][] = [[46, 80, 16, 52, 4], [46, 80, 80, 50, 4], [46, 66, 22, 26, 3.5], [46, 64, 74, 22, 3.5], [46, 58, 46, 6, 3.5], [30, 40, 14, 22, 2.4], [62, 38, 82, 18, 2.4]];
  for (const [x0, y0, x1, y1, w] of ramas) {
    const a = Math.atan2(y1 - y0, x1 - x0), px = -Math.sin(a) * w, py = Math.cos(a) * w;
    e.poligono([[x0 + px, y0 + py], [x1 + px * 0.5, y1 + py * 0.5], [x1 + Math.cos(a) * w * 1.6, y1 + Math.sin(a) * w * 1.6], [x1 - px * 0.5, y1 - py * 0.5], [x0 - px, y0 - py]], C, { bisel: 1.5, luz: -0.1 + hash(x1, y1, 2) * 0.2 });
  }
  // carámbanos colgando
  for (let k = 0; k < 8; k++) { const x = 18 + k * 9, y = 54 + (k % 3) * 6; e.poligono([[x - 1.5, y], [x + 1.5, y], [x, y + 6 + (k % 2) * 4]], E, { bisel: 0 }); }
  nevar(e, E, 0.25, 4, [I, Co]);
  const r = e.render();
  halo(r, 46, 50, 40, '#76d0ea', 0.45);
  return r;
}

/** La Ciudadela Congelada: el estandarte de la ciudadela, rígido de hielo, y el escudo clavado al pie. */
function estandarte(): Raster {
  const e = new Escultor(80, 140);
  const M = e.rampa(MAT.maderaVieja), T = e.rampa(['#0a0e1a', '#141c30', '#202c48', '#2e3e62', '#40547e']), O = e.rampa(MAT.oro), E = e.rampa(MAT.escarcha), N = e.rampa(NIEVE), A = e.rampa(MAT.hierro), R = e.rampa(ROJO);
  e.esfera(40, 132, 34, 7, N, { rugoso: 0.4 });
  e.capsula(30, 136, 30, 8, 2.4, 2, M);
  e.esfera(30, 6, 3.6, 3.6, O);
  e.capsula(30, 14, 70, 14, 1.6, 1.6, M);
  // la tela congelada: rígida, con pliegues duros y el borde roto
  e.poligono([[32, 16], [70, 16], [72, 50], [64, 60], [70, 74], [52, 70], [40, 82], [32, 70]], T, { bisel: 2, rugoso: 0.2, semilla: 3 });
  e.luz((x, y) => (y > 16 && y < 80 && (x - 32) % 9 === 0 ? -0.25 : (x - 32) % 9 === 1 ? 0.12 : 0));
  // el emblema: una llama dorada (la luz que se fue)
  e.poligono([[51, 30], [57, 42], [53, 52], [47, 52], [44, 42]], O, { bisel: 1.5 });
  // escudo clavado
  e.poligono([[42, 104], [70, 104], [68, 124], [56, 134], [44, 124]], A, { bisel: 3, rugoso: 0.2, semilla: 4 });
  e.capsula(56, 108, 56, 126, 1.6, 1.6, R);
  e.capsula(48, 114, 64, 114, 1.6, 1.6, R);
  nevar(e, E, 0.42, 6);
  return e.render();
}

/** El Puente de las Cadenas: el grillete gigante con la cadena rota; lo que estuvo atado ahí se soltó hace poco. */
function grillete(): Raster {
  const e = new Escultor(116, 84);
  const A = e.rampa(MAT.hierro), O = e.rampa(MAT.oxido), E = e.rampa(MAT.escarcha), N = e.rampa(NIEVE), R = e.rampa(ROJO, true);
  e.esfera(58, 76, 54, 7, N, { rugoso: 0.4 });
  // el aro del grillete, abierto
  e.esfera(28, 52, 24, 24, A, { rugoso: 0.2, semilla: 1, solo: (x, y) => Math.hypot(x - 28, y - 52) > 16 && !(x > 34 && y < 44) });
  e.caja(40, 30, 10, 12, 3, A, { luz: 0.05 });
  // la cadena que sale y el eslabón partido
  const esl: [number, number][] = [[52, 56], [62, 60], [72, 62], [82, 62], [92, 60]];
  esl.forEach(([x, y], k) => { e.esfera(x, y, 6, 4, k % 2 ? O : A, { solo: (px, py) => Math.hypot((px - x) / 6, (py - y) / 4) > 0.5 }); });
  e.esfera(104, 62, 6, 4, A, { solo: (px, py) => Math.hypot((px - 104) / 6, (py - 62) / 4) > 0.5 && px < 106 });
  // marcas rojas de brasa donde se rompió
  e.punto(98, 60, R, 0.4); e.punto(99, 61, R, 0.3); e.punto(97, 62, R, 0.2);
  nevar(e, E, 0.4, 8);
  const r = e.render();
  halo(r, 99, 61, 9, '#ff3a20', 0.6);
  return r;
}

/** La Puerta del Trono: el arco de cuernos tallado en piedra negra, con las runas rojas que se prenden al pasar. */
function arcoCuernos(): Raster {
  const e = new Escultor(116, 116);
  const P = e.rampa(['#06070a', '#0e1014', '#16181e', '#22242c', '#30323c', '#424450']), R = e.rampa(ROJO, true), E = e.rampa(MAT.escarcha), H = e.rampa(MAT.hueso);
  // dos pilares con cuernos que se curvan hacia el centro y casi se tocan
  for (const s of [-1, 1]) {
    const x = 58 + s * 38;
    e.caja(x - 10, 60, 20, 52, 4, P, { rugoso: 0.4, semilla: s + 3 });
    // cuerno de toro: sale hacia afuera, sube y la punta vuelve hacia el centro sin tocar al otro
    const pts: [number, number][] = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([x + s * Math.sin(t * Math.PI) * 14 - s * t * 16, 62 - t * 52]); }
    e.trazo(pts, 9, 2, H, { rugoso: 0.2, semilla: s + 5 });
    e.luz((px, py) => (py < 60 && Math.abs(px - x) < 26 && (py + 2) % 7 === 0 ? -0.2 : 0));
    e.luz((px, py) => (Math.abs(px - x) < 12 && py < 64 && (py + Math.round(px * s * 0.4)) % 6 === 0 ? -0.25 : 0));
  }
  // runas rojas en los pilares
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const x = 58 + s * 38, y = 72 + k * 9; e.punto(x - 2, y, R, 0.2); e.punto(x, y + 1, R, 0.4); e.punto(x + 2, y, R, 0.2); e.punto(x, y - 2, R, 0.3); }
  nevar(e, E, 0.3, 9);
  const r = e.render();
  halo(r, 20, 86, 14, '#ff3a20', 0.5); halo(r, 96, 86, 14, '#ff3a20', 0.5);
  return r;
}

/** El Corazón Helado: un gigante de hielo arrodillado ante el trono, con las cadenas del Diablo en las muñecas. */
function giganteHielo(): Raster {
  const e = new Escultor(112, 140);
  const G = e.rampa(['#0e1420', '#1a2232', '#283246', '#3a465c', '#4e5c74', '#66748c', '#8494aa']), I = e.rampa(MAT.hielo), E = e.rampa(MAT.escarcha), A = e.rampa(MAT.hierro), R = e.rampa(ROJO, true), N = e.rampa(NIEVE);
  e.esfera(56, 132, 52, 8, N, { rugoso: 0.4 });
  // rodilla y pierna doblada, el torso inclinado hacia adelante, la cabeza gacha
  e.esfera(36, 116, 22, 14, G, { rugoso: 0.3, semilla: 1 });
  e.esfera(78, 118, 18, 14, G, { rugoso: 0.3, semilla: 2, luz: -0.06 });
  e.esfera(58, 76, 34, 34, G, { rugoso: 0.35, semilla: 3 });
  e.esfera(58, 36, 16, 15, G, { rugoso: 0.3, semilla: 4, luz: 0.05 });
  // brazos que cuelgan con las cadenas en las muñecas
  e.capsula(28, 62, 18, 112, 9, 7, G, { rugoso: 0.3 }); e.capsula(88, 62, 96, 112, 9, 7, G, { rugoso: 0.3, luz: -0.06 });
  for (const x of [18, 96]) { e.cilindro(x, 100, 108, 9, 3, A); for (let k = 0; k < 4; k++) e.esfera(x + (x < 50 ? -1 : 1) * (4 + k * 5), 110 + k * 5, 3, 2, A, { luz: k % 2 ? -0.1 : 0 }); }
  // ojos rojos apagados y la escarcha en los hombros; carámbanos en la barba
  e.punto(52, 38, R, -0.15); e.punto(64, 38, R, -0.15);
  for (let k = 0; k < 6; k++) e.poligono([[46 + k * 4, 46], [49 + k * 4, 46], [47.5 + k * 4, 54 + (k % 2) * 4]], I, { bisel: 0, luz: 0.1 });
  e.grieta(70, 70, 26, 1.8, 4, 0.5); e.grieta(40, 86, 18, 0.6, 5, 0.45);
  nevar(e, E, 0.35, 10, [G]);
  const r = e.render();
  halo(r, 58, 38, 12, '#ff3a20', 0.4);
  return r;
}

/** La Guarida del Lobo: el cráneo del lobo más grande, limpio y blanco, en su cama de huesos y nieve. */
function craneoLobo(): Raster {
  const e = new Escultor(96, 72);
  const H = e.rampa(MAT.hueso), K = e.rampa(['#05060a', '#0c0e14']), N = e.rampa(NIEVE), E = e.rampa(MAT.escarcha);
  e.esfera(48, 64, 44, 7, N, { rugoso: 0.5 });
  for (let k = 0; k < 7; k++) { const x = 12 + k * 12; e.capsula(x, 60 + (k % 2) * 3, x + 10, 56 + (k % 3) * 2, 1.8, 1.8, H, { luz: -0.08 }); }
  // el cráneo de costado: bóveda, hocico largo, mandíbula
  e.esfera(36, 34, 22, 18, H, { rugoso: 0.2, semilla: 1 });
  e.poligono([[46, 22], [86, 34], [90, 42], [52, 48]], H, { bisel: 3, rugoso: 0.2 });
  e.poligono([[40, 48], [84, 46], [80, 52], [44, 56]], H, { bisel: 2, luz: -0.1 });
  // ojo, nariz y colmillos
  e.esfera(48, 32, 6, 5, K); e.esfera(86, 37, 2.6, 2, K);
  e.esfera(28, 40, 5, 4, K);
  for (const [x, y, d] of [[60, 46, 1], [72, 46, 1], [64, 50, -1]] as [number, number, number][]) e.poligono([[x - 2, y], [x + 2, y], [x, y + d * 7]], H, { bisel: 0, luz: 0.1 });
  e.grieta(30, 22, 12, 0.5, 3, 0.4);
  nevar(e, E, 0.3, 11);
  return e.render();
}

/** La Cripta Sellada: la puerta de la cripta con el sello rojo del Diablo; detrás se oye algo que respira. */
function puertaCripta(): Raster {
  const e = new Escultor(80, 100);
  const P = e.rampa(['#0e1014', '#181c24', '#262c38', '#363e4c', '#4a5464', '#62707e']), A = e.rampa(MAT.hierro), R = e.rampa(ROJO, true), E = e.rampa(MAT.escarcha), N = e.rampa(NIEVE);
  // marco de piedra en arco y la puerta de hierro
  e.poligono([[4, 96], [4, 30], [16, 10], [40, 2], [64, 10], [76, 30], [76, 96]], P, { bisel: 4, rugoso: 0.4, semilla: 1 });
  e.poligono([[16, 96], [16, 34], [24, 20], [40, 14], [56, 20], [64, 34], [64, 96]], A, { bisel: 3, rugoso: 0.2, semilla: 2, luz: -0.05 });
  e.luz((x, y) => (Math.abs(x - 40) < 1 && y > 16 ? -0.4 : (y - 30) % 18 === 0 && x > 16 && x < 64 ? -0.25 : 0));
  // el sello: un círculo rojo con una cruz de cuernos
  e.esfera(40, 58, 11, 11, R, { solo: (x, y) => Math.hypot(x - 40, y - 58) > 8 });
  e.capsula(40, 49, 40, 67, 1, 1, R); e.capsula(31, 58, 49, 58, 1, 1, R);
  e.capsula(34, 50, 30, 44, 1, 0.6, R); e.capsula(46, 50, 50, 44, 1, 0.6, R);
  // nieve amontonada contra la puerta
  e.esfera(40, 98, 40, 6, N, { rugoso: 0.4 });
  nevar(e, E, 0.3, 12, [P]);
  const r = e.render();
  halo(r, 40, 58, 22, '#ff3a20', 0.7);
  return r;
}

export function corazonMonumentos(): Monumento[] {
  return [
    { zona: 'La Escalera Helada', obj: monumento('mon_corazon_heroina_hielo', [heroinaHielo()], [40, 128], 64, 'contacto'), historia: 'La primera heroína que bajó hasta acá, congelada adentro de un bloque de hielo con la espada en alto.' },
    { zona: 'El Lago de los Gigantes', obj: monumento('mon_corazon_espada', [espada()], [34, 144], 36, 'contacto'), historia: 'La espada de uno de los gigantes, clavada en el hielo hasta la mitad.' },
    { zona: 'Las Catacumbas de Hielo', obj: monumento('mon_corazon_sarcofago', [sarcofago()], [52, 78], 80, 'contacto'), historia: 'El sarcófago helado con la tapa corrida: adentro no hay nadie.' },
    { zona: 'El Bosque de Escarcha', obj: monumento('mon_corazon_arbol_hielo', [arbolHielo()], [48, 138], 32, 'contacto'), historia: 'El árbol de cristal que creció donde se congeló un árbol de verdad; el tronco viejo se ve adentro.' },
    { zona: 'La Ciudadela Congelada', obj: monumento('mon_corazon_estandarte', [estandarte()], [40, 134], 48, 'contacto'), historia: 'El estandarte de la ciudadela, rígido de hielo, con la llama dorada que se fue y el escudo clavado al pie.' },
    { zona: 'El Puente de las Cadenas', obj: monumento('mon_corazon_grillete', [grillete()], [58, 78], 96, 'contacto'), historia: 'El grillete gigante con la cadena rota: lo que estuvo atado ahí se soltó hace poco.' },
    { zona: 'La Puerta del Trono', obj: monumento('mon_corazon_arco_cuernos', [arcoCuernos()], [58, 112], 96, 'contacto'), historia: 'Los cuernos tallados en piedra negra con las runas rojas del Diablo.' },
    { zona: 'El Corazón Helado', obj: monumento('mon_corazon_gigante', [giganteHielo()], [56, 134], 88, 'contacto'), historia: 'Un gigante de hielo arrodillado ante el trono, con las cadenas del Diablo en las muñecas.' },
    { zona: 'La Guarida del Lobo', obj: monumento('mon_corazon_craneo_lobo', [craneoLobo()], [48, 66], 48, 'contacto'), historia: 'El cráneo del lobo más grande, limpio y blanco, en su cama de huesos y nieve.' },
    { zona: 'La Cripta Sellada', obj: monumento('mon_corazon_puerta_cripta', [puertaCripta()], [40, 96], 64, 'contacto'), historia: 'La puerta de la cripta con el sello rojo del Diablo; del otro lado se oye algo que respira.' },
  ];
}
