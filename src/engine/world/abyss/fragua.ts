import type { Raster } from '../../core/raster';
import { Escultor, MAT, halo } from './escultor';
import { monumento, type Monumento } from './monumento';
import { hash } from '../puertoObjects';

/**
 * Mundo 6, la Fragua de las Luces: naranja brasa sobre hierro y ceniza. Acá se forjaban las luces de todos los pisos
 * hasta que la Dragona las encerró; las herramientas quedaron tiradas donde las soltaron.
 */

const ROCA = ['#0a0808', '#141010', '#1e1816', '#2a221e', '#382e28', '#483c34', '#5a4c42'] as const;

/** vetas de brasa que brillan en la piedra (grietas que emiten) */
function vetas(e: Escultor, m: number, semilla: number, cuanto: number) {
  e.cubrir(m, (x, y, ny) => ny > -0.4 && Math.abs(Math.sin(x * 0.21 + y * 0.13 + hash(x >> 3, y >> 3, semilla) * 4)) < cuanto * 0.12);
}

/** La Escalera de Ceniza: la estatua del primer herrero, de medio cuerpo, con el martillo al hombro. */
function herrero(): Raster {
  const e = new Escultor(96, 140);
  const P = e.rampa(MAT.piedraTibia), H = e.rampa(MAT.hierro), B = e.rampa(MAT.brasa, true), M = e.rampa(MAT.madera), C = e.rampa(MAT.ceniza);
  e.caja(12, 108, 72, 30, 6, P, { rugoso: 0.5, semilla: 1 });
  // torso ancho, delantal, brazos de piedra
  e.poligono([[20, 108], [18, 68], [30, 50], [66, 50], [78, 68], [76, 108]], P, { bisel: 5, rugoso: 0.45, semilla: 2 });
  e.poligono([[32, 108], [34, 70], [62, 70], [64, 108]], e.rampa(['#1a100a', '#2e1c10', '#442a18', '#5a3a22']), { bisel: 2 });
  e.esfera(48, 38, 12, 14, P, { rugoso: 0.35, semilla: 3 });
  // barba larga y ojos de brasa
  e.poligono([[38, 42], [58, 42], [54, 66], [48, 72], [42, 66]], P, { bisel: 3, rugoso: 0.5, semilla: 4, luz: 0.05 });
  e.punto(43, 35, B, 0.3); e.punto(53, 35, B, 0.3);
  // el martillo al hombro
  e.capsula(70, 56, 30, 14, 2.4, 2.4, M);
  e.caja(18, 2, 22, 20, 4, H, { rugoso: 0.2 });
  e.capsula(70, 56, 78, 82, 6, 5, P);
  e.capsula(26, 56, 22, 86, 6, 5, P);
  vetas(e, B, 5, 0.18);
  e.musgo(C, 0.3, 6, [P]);
  const r = e.render();
  halo(r, 48, 35, 14, '#ff7020', 0.6);
  return r;
}

/** El Río de Lava: el crisol volcado, con el metal fundido que se derramó y se enfrió a medias. */
function crisol(): Raster {
  const e = new Escultor(112, 96);
  const H = e.rampa(MAT.hierro), O = e.rampa(MAT.oxido), L = e.rampa(MAT.lava, true), P = e.rampa(ROCA), Ce = e.rampa(MAT.ceniza);
  // el charco de metal: centro vivo, borde ya negro
  e.esfera(40, 82, 38, 10, Ce, { rugoso: 0.5, semilla: 1 });
  e.esfera(36, 82, 30, 7, L, { luz: -0.05 });
  e.luz((x, y) => (Math.hypot((x - 36) / 30, (y - 82) / 7) > 0.7 ? -0.3 : 0));
  // el crisol de costado: un cilindro acostado con la boca hacia el charco
  e.capsula(62, 58, 96, 44, 22, 18, H, { rugoso: 0.25, semilla: 2 });
  e.esfera(60, 60, 12, 20, e.rampa(['#1a0400', '#3a0c00']));
  e.esfera(60, 64, 9, 13, L, { luz: 0.1 });
  // asas y el soporte roto
  e.capsula(80, 32, 84, 18, 2.6, 2.6, O); e.capsula(84, 18, 96, 22, 2.6, 2.6, O);
  e.capsula(100, 90, 104, 52, 3, 3, O); e.capsula(84, 90, 92, 66, 3, 3, O, { luz: -0.1 });
  // el chorro que cae de la boca
  e.trazo([[54, 66], [50, 74], [46, 80]], 3, 2, L);
  e.cubrir(Ce, (x, y, ny) => ny < -0.2 && hash(x >> 1, y >> 1, 3) < 0.15);
  e.esfera(100, 90, 12, 4, P);
  const r = e.render();
  halo(r, 40, 76, 36, '#ff8a20', 0.9);
  return r;
}

/** Las Jaulas Colgantes: la jaula más grande, caída y abierta: lo que tenía adentro se escapó. */
function jaulaCaida(): Raster {
  const e = new Escultor(100, 112);
  const H = e.rampa(MAT.hierro), O = e.rampa(MAT.oxido), Lz = e.rampa(MAT.luzDorada, true), P = e.rampa(ROCA);
  e.esfera(50, 104, 46, 6, P, { rugoso: 0.5 });
  // la cúpula y los barrotes, un poco ladeada
  const cx = 50, top = 20, bot = 100;
  for (let k = 0; k <= 10; k++) {
    const t = k / 10, x = cx - 34 + t * 68, curva = Math.sin(t * Math.PI) * 18;
    if (k === 7 || k === 8) continue; // los barrotes que doblaron para salir
    e.trazo([[cx + (x - cx) * 0.3, top], [x, top + 22 - curva * 0.3], [x, bot]], 1.6, 1.6, k % 3 ? H : O, { luz: Math.cos(t * Math.PI) * 0.15 });
  }
  e.trazo([[cx + 14, top + 6], [cx + 30, 46], [cx + 40, 70]], 1.6, 1.6, O);
  e.trazo([[cx + 19, top + 8], [cx + 46, 52], [cx + 50, 76]], 1.6, 1.6, O);
  e.esfera(cx, bot, 36, 5, H, { luz: -0.05 });
  e.esfera(cx, top - 2, 7, 5, H); e.capsula(cx, top - 6, cx, 2, 1.4, 1.4, H);
  for (let k = 0; k < 3; k++) e.esfera(cx + 2 + k * 2, 6 - k * 1, 2, 2.6, O);
  // migajas de luz en el piso de la jaula
  for (let k = 0; k < 5; k++) e.punto(cx - 14 + hash(k, 1, 2) * 28, bot - 2 + (k % 2), Lz, 0.4);
  const r = e.render();
  halo(r, cx, bot - 4, 24, '#ffd070', 0.5);
  return r;
}

/** Los Fuelles: la pila de lingotes que salió del último soplido, todavía tibios. */
function lingotes(): Raster {
  const e = new Escultor(96, 72);
  const H = e.rampa(MAT.hierro), Br = e.rampa(MAT.bronce), L = e.rampa(MAT.brasa, true), P = e.rampa(ROCA), M = e.rampa(MAT.madera);
  e.caja(6, 58, 84, 10, 3, M, { rugoso: 0.3 });
  const lingote = (x: number, y: number, m: number, l = 0) => e.poligono([[x, y + 10], [x + 4, y], [x + 22, y], [x + 26, y + 10]], m, { bisel: 2, luz: l });
  for (let k = 0; k < 4; k++) lingote(8 + k * 20, 48, k % 2 ? H : Br);
  for (let k = 0; k < 3; k++) lingote(18 + k * 20, 38, k === 1 ? L : H, 0.05);
  for (let k = 0; k < 2; k++) lingote(28 + k * 20, 28, Br, 0.08);
  lingote(38, 18, L, 0.05);
  // las pinzas apoyadas
  e.capsula(84, 64, 92, 20, 1.4, 1.4, H); e.capsula(88, 64, 94, 22, 1.4, 1.4, H);
  e.esfera(48, 68, 46, 3, P, { luz: -0.1 });
  const r = e.render();
  halo(r, 52, 30, 24, '#ff6a20', 0.7);
  return r;
}

/** El Bosque de Ceniza: el árbol de hierro que plantó el herrero; sus hojas son brasas que no se apagan. */
function arbolHierro(): Raster {
  const e = new Escultor(88, 144);
  const H = e.rampa(MAT.hierro), O = e.rampa(MAT.oxido), B = e.rampa(MAT.brasa, true), Ce = e.rampa(MAT.ceniza);
  e.esfera(44, 136, 36, 7, Ce, { rugoso: 0.5 });
  // tronco hecho de barras retorcidas
  for (let k = 0; k < 3; k++) e.trazo([[36 + k * 8, 138], [40 + k * 4 + Math.sin(k) * 4, 100], [38 + k * 6, 70], [44, 50]], 3, 2.4, k === 1 ? O : H, { luz: (k - 1) * 0.08 });
  // ramas
  const ramas: [number, number, number, number][] = [[44, 52, 14, 24], [44, 52, 76, 22], [44, 60, 8, 50], [44, 60, 82, 48], [44, 50, 46, 8], [30, 36, 22, 14], [60, 34, 70, 12]];
  for (const [x0, y0, x1, y1] of ramas) e.capsula(x0, y0, x1, y1, 2.4, 1, H);
  // hojas de brasa: rombitos en las puntas
  for (let k = 0; k < 40; k++) {
    const rr = ramas[k % ramas.length], t = 0.5 + hash(k, 1, 7) * 0.5, x = rr[0] + (rr[2] - rr[0]) * t + (hash(k, 2, 7) - 0.5) * 12, y = rr[1] + (rr[3] - rr[1]) * t + (hash(k, 3, 7) - 0.5) * 10;
    e.poligono([[x, y - 3], [x + 2.5, y], [x, y + 3], [x - 2.5, y]], B, { bisel: 0, luz: -0.2 + hash(k, 4, 7) * 0.35 });
  }
  const r = e.render();
  halo(r, 44, 30, 40, '#ff7020', 0.5);
  return r;
}

/** La Cárcel de las Luces: el llavero gigante del carcelero, colgado de un poste; falta una sola llave. */
function llavero(): Raster {
  const e = new Escultor(72, 124);
  const M = e.rampa(MAT.madera), H = e.rampa(MAT.hierro), Br = e.rampa(MAT.bronce), O = e.rampa(MAT.oxido), P = e.rampa(ROCA);
  e.caja(18, 112, 36, 10, 4, P, { rugoso: 0.4 });
  e.capsula(36, 116, 36, 10, 4, 3.4, M, { rugoso: 0.3 });
  e.capsula(36, 18, 58, 18, 2.4, 2.4, M);
  // el aro grande
  for (let a = 0; a < Math.PI * 2; a += 0.1) e.esfera(52 + Math.cos(a) * 12, 40 + Math.sin(a) * 12, 2, 2, H, { luz: Math.sin(a) * -0.2 });
  e.capsula(56, 18, 54, 28, 1.2, 1.2, H);
  // las llaves colgando, cada una distinta
  const llave = (x: number, y: number, largo: number, m: number) => {
    e.esfera(x, y, 4, 4, m); e.esfera(x, y, 1.6, 1.6, e.rampa(['#000000', '#080808']));
    e.capsula(x, y + 3, x, y + largo, 1.4, 1.4, m);
    e.caja(x, y + largo - 6, 5, 3, 0, m, { bisel: 0 }); e.caja(x, y + largo - 2, 4, 2, 0, m, { bisel: 0 });
  };
  llave(42, 56, 26, Br); llave(50, 54, 34, H); llave(58, 56, 22, O); llave(64, 50, 30, Br);
  // el gancho vacío de la llave que falta (la de la luz que se liberó)
  e.trazo([[46, 52], [46, 58], [48, 60]], 0.8, 0.8, H);
  return e.render();
}

/** El Horno: el yunque gigante de la fragua, con el martillo grande todavía encima y chispas que saltan solas. */
function yunque(): Raster {
  const e = new Escultor(116, 96);
  const H = e.rampa(MAT.hierro), M = e.rampa(MAT.madera), B = e.rampa(MAT.brasa, true), P = e.rampa(ROCA);
  // el tronco de base
  e.cilindro(60, 66, 92, 22, 6, M, { rugoso: 0.3, semilla: 1 });
  e.luz((x, y) => (y > 70 && (x - 40) % 9 === 0 ? -0.3 : 0));
  // el yunque: cuerpo, cuerno a la izquierda, talón a la derecha
  e.poligono([[32, 48], [96, 48], [100, 40], [104, 34], [24, 34], [4, 38], [20, 46]], H, { bisel: 3, rugoso: 0.2, semilla: 2, normal: [0, -0.4, 0.92] });
  e.poligono([[40, 48], [84, 48], [78, 58], [72, 68], [52, 68], [46, 58]], H, { bisel: 3, rugoso: 0.2, semilla: 3 });
  e.caja(44, 62, 36, 8, 2, H, { luz: -0.05 });
  // el martillazo marcado al rojo
  e.esfera(64, 36, 7, 2, B);
  // el martillo grande encima
  e.capsula(74, 30, 108, 8, 2.6, 2.6, M);
  e.caja(60, 20, 22, 14, 4, H, { rugoso: 0.15 });
  for (let k = 0; k < 5; k++) e.punto(60 + hash(k, 1, 4) * 16, 26 - hash(k, 2, 4) * 20, B, 0.4);
  e.esfera(60, 92, 40, 3, P, { luz: -0.1 });
  const r = e.render();
  halo(r, 64, 34, 22, '#ff7020', 0.8);
  return r;
}

/** El Corazón de la Fragua: la cáscara del huevo de la Dragona, rota en el nido de cadenas. */
function huevoDragona(): Raster {
  const e = new Escultor(100, 92);
  const C = e.rampa(['#1a0a06', '#3a160a', '#5a2410', '#7a3618', '#9a4a22', '#b8622e', '#d47e3e']), B = e.rampa(MAT.brasa, true), H = e.rampa(MAT.hierro), K = e.rampa(['#0a0302', '#1a0804']), Ce = e.rampa(MAT.ceniza);
  // el nido: cadenas enroscadas
  for (let k = 0; k < 26; k++) { const a = (k / 26) * Math.PI * 2; e.esfera(50 + Math.cos(a) * 40, 78 + Math.sin(a) * 10, 4, 3, H, { luz: Math.sin(a) * 0.2 }); }
  e.esfera(50, 78, 34, 8, Ce, { rugoso: 0.5 });
  // la mitad de abajo del huevo con el borde dentado, y adentro oscuro con brasas
  e.esfera(50, 52, 30, 34, C, { rugoso: 0.3, semilla: 2, solo: (x, y) => y > 40 + Math.abs(((x * 0.4) % 4) - 2) * 3 });
  e.esfera(50, 50, 24, 10, K, { solo: (x, y) => y > 44 + Math.abs(((x * 0.4) % 4) - 2) * 3 });
  for (let k = 0; k < 6; k++) e.punto(36 + k * 5, 50 + (k % 2), B, 0.3);
  // escamas grabadas
  e.luz((x, y) => (y > 56 && ((x + ((y / 5) | 0) * 3) % 7 === 0 || y % 5 === 0) ? -0.2 : 0));
  // pedazos de cáscara tirados
  for (const [x, y, a] of [[12, 70, 0.4], [86, 66, -0.3], [78, 82, 0.1]] as [number, number, number][]) e.poligono([[x - 8, y], [x, y - 8 + a * 4], [x + 8, y - 2], [x + 2, y + 4]], C, { bisel: 2, luz: 0.05 });
  // vetas de brasa en la cáscara
  e.cubrir(B, (x, y, ny) => y > 56 && ny > -0.3 && Math.abs(Math.sin(x * 0.3 + y * 0.2 + hash(x >> 3, y >> 3, 3) * 5)) < 0.05);
  const r = e.render();
  halo(r, 50, 48, 26, '#ff6a20', 0.8);
  return r;
}

/** El Nido de Ceniza: el nido de un pájaro de fuego, con plumas de brasa y un huevito que todavía late. */
function nido(): Raster {
  const e = new Escultor(64, 64);
  const R = e.rampa(['#0e0806', '#1e120a', '#2e1c10', '#3e2816', '#50341e']), Pl = e.rampa(MAT.brasa, true), Hu = e.rampa(['#4a3a30', '#8a7060', '#c8a890', '#f0dcc8']), Ce = e.rampa(MAT.ceniza);
  e.esfera(32, 52, 30, 10, Ce, { rugoso: 0.5 });
  e.esfera(32, 44, 26, 14, R, { rugoso: 0.7, semilla: 1 });
  e.luz((x, y) => (hash(x >> 1, y, 3) < 0.2 ? -0.3 : 0));
  e.esfera(32, 38, 18, 6, e.rampa(['#0a0604', '#140c08']));
  e.esfera(32, 34, 6, 7, Hu);
  e.punto(31, 33, Pl, 0.2);
  for (let k = 0; k < 7; k++) { const a = -2.8 + k * 0.45, x = 32 + Math.cos(a) * 24, y = 40 + Math.sin(a) * 12; e.capsula(x, y, x + Math.cos(a) * 8, y + Math.sin(a) * 6 - 6, 2, 0.8, Pl, { luz: -0.15 }); }
  const r = e.render();
  halo(r, 32, 32, 18, '#ff8a30', 0.6);
  return r;
}

/** La Alacena del Herrero: el estante de moldes y herramientas, con el molde de una luz a medio hacer. */
function alacena(): Raster {
  const e = new Escultor(64, 92);
  const M = e.rampa(MAT.madera), H = e.rampa(MAT.hierro), Br = e.rampa(MAT.bronce), Lz = e.rampa(MAT.luzDorada, true), P = e.rampa(ROCA);
  e.caja(6, 8, 52, 80, 4, M, { rugoso: 0.3, luz: -0.15 });
  e.caja(10, 12, 44, 72, 0, e.rampa(['#060404', '#0e0a08', '#16100c']), { bisel: 0 });
  for (const y of [30, 52, 74]) e.caja(8, y, 48, 4, 2, M);
  // moldes, tenazas, un frasco y el molde de luz
  e.esfera(20, 26, 6, 4, Br); e.esfera(40, 26, 7, 5, H); e.esfera(40, 25, 4, 2, Lz);
  e.capsula(16, 50, 30, 38, 1, 1, H); e.capsula(20, 50, 34, 40, 1, 1, H);
  e.cilindro(44, 40, 50, 4, 1.6, e.rampa(['#1a2a2a', '#3a5a5a', '#7aa8a8']));
  for (let k = 0; k < 4; k++) e.caja(14 + k * 9, 64, 7, 10, 2, k % 2 ? Br : H);
  e.esfera(32, 90, 30, 3, P, { luz: -0.1 });
  const r = e.render();
  halo(r, 40, 24, 10, '#ffd070', 0.6);
  return r;
}

export function fraguaMonumentos(): Monumento[] {
  return [
    { zona: 'La Escalera de Ceniza', obj: monumento('mon_fragua_herrero', [herrero()], [48, 136], 64, 'contacto'), historia: 'La estatua del primer herrero, con el martillo al hombro y los ojos de brasa.' },
    { zona: 'El Río de Lava', obj: monumento('mon_fragua_crisol', [crisol()], [72, 92], 48, 'contacto'), historia: 'El crisol volcado: el metal fundido se derramó y se enfrió a medias.', prefiere: 'agua' },
    { zona: 'Las Jaulas Colgantes', obj: monumento('mon_fragua_jaula_caida', [jaulaCaida()], [50, 106], 72, 'contacto'), historia: 'La jaula más grande, caída y con los barrotes doblados: lo que tenía adentro se escapó.' },
    { zona: 'Los Fuelles', obj: monumento('mon_fragua_lingotes', [lingotes()], [48, 68], 80, 'contacto'), historia: 'La pila de lingotes que salió del último soplido de los fuelles, todavía tibios.' },
    { zona: 'El Bosque de Ceniza', obj: monumento('mon_fragua_arbol_hierro', [arbolHierro()], [44, 138], 32, 'contacto'), historia: 'El árbol de hierro que plantó el herrero; sus hojas son brasas que no se apagan.' },
    { zona: 'La Cárcel de las Luces', obj: monumento('mon_fragua_llavero', [llavero()], [36, 120], 32, 'contacto'), historia: 'El llavero gigante del carcelero, colgado de su poste; falta una sola llave.' },
    { zona: 'El Horno', obj: monumento('mon_fragua_yunque', [yunque()], [60, 92], 48, 'contacto'), historia: 'El yunque gigante de la fragua con el martillo encima; las chispas saltan solas.' },
    { zona: 'El Corazón de la Fragua', obj: monumento('mon_fragua_huevo', [huevoDragona()], [50, 86], 72, 'contacto'), historia: 'La cáscara del huevo de la Dragona, rota en su nido de cadenas.' },
    { zona: 'El Nido de Ceniza', obj: monumento('mon_fragua_nido', [nido()], [32, 60], 24, 'contacto'), historia: 'El nido de un pájaro de fuego con plumas de brasa y un huevito que todavía late.' },
    { zona: 'La Alacena del Herrero', obj: monumento('mon_fragua_alacena', [alacena()], [32, 88], 48, 'contacto'), historia: 'El estante de moldes del herrero, con el molde de una luz a medio hacer.' },
  ];
}
