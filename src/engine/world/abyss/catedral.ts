import type { Raster } from '../../core/raster';
import { Escultor, MAT, halo } from './escultor';
import { monumento, type Monumento } from './monumento';
import { hash } from '../puertoObjects';

/**
 * Mundo 2, la Catedral de las Raíces: verde enfermizo con oro. Los monjes se fueron cuando las raíces rompieron el
 * piso; lo que dejaron quedó abrazado por ellas.
 */

const RAIZ = ['#120c08', '#22160e', '#342214', '#4a321c', '#604428', '#7a5a36', '#94723f'] as const;
const VERDE = ['#0a140e', '#14261a', '#1e3826', '#2c4a2e', '#3e5e34', '#56763e', '#728e4a'] as const;

/** raíces que suben serpenteando por un volumen (desde el piso) */
function raices(e: Escultor, m: number, desde: [number, number][], alto: number, semilla: number) {
  desde.forEach(([x, y], i) => {
    // nacen gruesas en el piso, se arrastran un poco de costado y suben pegadas, finitas
    const pts: [number, number][] = [];
    const lado = x < e.w / 2 ? 1 : -1;
    let px = x - lado * 8, py = y;
    for (let k = 0; k < 8; k++) { pts.push([px, py]); px += lado * (k < 2 ? 5 : 1) + (hash(k, i, semilla) - 0.5) * 5; py -= k < 2 ? 2 : (alto * 0.6) / 6; }
    e.trazo(pts, 2.8, 0.8, m, { rugoso: 0.3, semilla: semilla + i });
  });
}

/** La Escalera Hundida: el ángel de piedra arrodillado, con las alas plegadas y las raíces que lo atan al piso. */
function angel(): Raster {
  const e = new Escultor(96, 128);
  const P = e.rampa(MAT.marmol), R = e.rampa(RAIZ), G = e.rampa(VERDE), O = e.rampa(MAT.oro);
  e.caja(18, 100, 60, 24, 6, P, { rugoso: 0.4, semilla: 1, luz: -0.08 });
  // alas plegadas detrás
  e.poligono([[44, 50], [18, 20], [10, 40], [16, 80], [36, 96]], P, { bisel: 3, rugoso: 0.35, semilla: 2, luz: -0.06 });
  e.poligono([[52, 50], [78, 20], [86, 40], [80, 80], [60, 96]], P, { bisel: 3, rugoso: 0.35, semilla: 3, luz: -0.1 });
  e.luz((x, y) => (y > 30 && y < 92 && (x < 36 || x > 60) && (y + Math.abs(x - 48)) % 7 === 0 ? -0.25 : 0));
  // cuerpo arrodillado, manos juntas, cabeza gacha
  e.poligono([[34, 100], [62, 100], [60, 74], [54, 54], [42, 54], [36, 74]], P, { bisel: 4, rugoso: 0.3, semilla: 4 });
  e.esfera(48, 44, 7, 8, P, { rugoso: 0.2 });
  e.capsula(42, 60, 48, 70, 2.5, 2, P); e.capsula(54, 60, 48, 70, 2.5, 2, P);
  e.esfera(48, 70, 3, 3, P, { luz: 0.08 });
  // aureola de oro rota (media)
  for (let a = -2.6; a < -0.4; a += 0.08) e.punto(48 + Math.cos(a) * 11, 40 + Math.sin(a) * 5, O, 0.25);
  // las raíces que lo atan
  raices(e, R, [[26, 124], [38, 124], [62, 124], [72, 124]], 60, 7);
  e.capsula(30, 80, 66, 86, 2.4, 2.4, R, { rugoso: 0.3 });
  e.grieta(52, 46, 10, 1.4, 3, 0.4);
  e.musgo(G, 0.4, 5, [P]);
  return e.render();
}

/** El Atrio de las Luciérnagas: la pila bautismal desbordada de agua que brilla turquesa; las luciérnagas beben ahí. */
function pila(): Raster {
  const e = new Escultor(88, 88);
  const P = e.rampa(MAT.piedra), A = e.rampa(MAT.luzTurquesa, true), R = e.rampa(RAIZ), G = e.rampa(VERDE), O = e.rampa(MAT.oro);
  // pie, columna con relieve y la taza
  e.caja(26, 70, 36, 14, 4, P, { rugoso: 0.4, semilla: 1 });
  e.cilindro(44, 46, 72, 9, 3, P, { rugoso: 0.3, semilla: 2, sinTapa: true });
  e.luz((x, y) => (y > 48 && y < 70 && (x - 36) % 5 === 0 ? -0.25 : 0));
  e.cilindro(44, 28, 44, 34, 9, P, { rugoso: 0.35, semilla: 3 });
  // borde de oro gastado y el agua de luz arriba (más clara al centro)
  e.esfera(44, 28, 30, 7.5, A);
  e.luz((x, y) => (Math.hypot((x - 44) / 30, (y - 28) / 7.5) < 0.5 ? 0.15 : 0));
  for (let a = 0; a < Math.PI * 2; a += 0.05) e.punto(44 + Math.cos(a) * 33, 28 + Math.sin(a) * 9, O, Math.sin(a) < 0 ? 0.2 : -0.1);
  // el agua que se derrama por los costados
  for (const x of [16, 22, 64, 72]) e.capsula(x, 32, x + (x < 44 ? -2 : 2), 44 + hash(x, 1, 1) * 8, 1.4, 0.8, A, { luz: -0.1 });
  raices(e, R, [[20, 86], [70, 86]], 40, 3);
  e.musgo(G, 0.35, 4, [P]);
  const r = e.render();
  halo(r, 44, 26, 30, '#8ae8d4', 0.8);
  return r;
}

/** Los Claustros Quebrados: el órgano de raíces. Los tubos se volvieron raíces y siguen sonando cuando sopla el viento. */
function organo(): Raster {
  const e = new Escultor(120, 156);
  const M = e.rampa(MAT.madera), R = e.rampa(RAIZ), O = e.rampa(MAT.oro), B = e.rampa(MAT.bronce), K = e.rampa(['#050404', '#0c0a08']), G = e.rampa(VERDE);
  // la consola (caja de madera con teclado) y el banco
  e.caja(22, 104, 76, 44, 8, M, { rugoso: 0.3, semilla: 1 });
  e.caja(30, 112, 60, 8, 3, e.rampa(MAT.hueso), { luz: 0.05 });
  e.luz((x, y) => (y >= 116 && y < 120 && x > 30 && x < 90 && x % 4 === 0 ? -0.5 : 0));
  e.caja(36, 140, 48, 10, 4, M, { luz: -0.08 });
  // los tubos: de bronce abajo y raíz arriba, de alto a bajo hacia los costados
  for (let k = 0; k < 9; k++) {
    const x = 20 + k * 10, alto = 90 - Math.abs(k - 4) * 14, top = 104 - alto;
    e.cilindro(x, top + alto * 0.45, 106, 4, 1.5, B, { sinTapa: true, rugoso: 0.2, semilla: k });
    e.esfera(x, top + alto * 0.62, 2.4, 1.2, K);
    // la mitad de arriba se volvió raíz que se tuerce
    const pts: [number, number][] = [[x, top + alto * 0.45]];
    for (let s = 1; s <= 4; s++) pts.push([x + (hash(k, s, 9) - 0.5) * 8 * s * 0.5, top + alto * 0.45 - (alto * 0.5 * s) / 4]);
    e.trazo(pts, 4, 1.6, R, { rugoso: 0.3, semilla: k + 20 });
  }
  // remate de oro en la consola
  e.poligono([[40, 104], [60, 92], [80, 104]], O, { bisel: 2 });
  raices(e, R, [[18, 152], [102, 152]], 50, 11);
  e.musgo(G, 0.3, 6, [M]);
  return e.render();
}

/** La Capilla Escondida: el relicario de oro sobre su altar, con tres velas que nunca se apagan. */
function relicario(): Raster {
  const e = new Escultor(72, 88);
  const P = e.rampa(MAT.marmol), O = e.rampa(MAT.oro), T = e.rampa(['#2a0a10', '#4a1420', '#6e2030', '#902c40', '#b04454']), V = e.rampa(MAT.hueso), F = e.rampa(['#6a2a00', '#c86010', '#ffa830', '#fff0b0'], true), A = e.rampa(MAT.luzTurquesa, true);
  e.caja(10, 54, 52, 30, 7, P, { rugoso: 0.3, semilla: 1 });
  // mantel rojo que cuelga adelante
  e.poligono([[12, 60], [60, 60], [58, 78], [46, 74], [36, 80], [24, 74], [14, 78]], T, { bisel: 2 });
  // el relicario: una casita de oro con techo a dos aguas y una ventanita con luz
  e.caja(22, 30, 28, 26, 4, O, { rugoso: 0.15 });
  e.poligono([[18, 32], [36, 14], [54, 32]], O, { bisel: 2, luz: 0.06 });
  e.esfera(36, 12, 3, 3, O, { luz: 0.1 });
  e.caja(32, 38, 8, 10, 1, A, { bisel: 0 });
  e.tallar([[26, 36], [26, 40], [26, 44], [46, 36], [46, 40], [46, 44]]);
  for (const x of [12, 58, 64]) { e.cilindro(x, 46, 56, 1.8, 0.8, V); e.esfera(x, 43, 1.2, 2.2, F); }
  const r = e.render();
  for (const x of [12, 58, 64]) halo(r, x, 42, 8, '#ffb050', 0.9);
  halo(r, 36, 43, 14, '#8ae8d4', 0.6);
  return r;
}

/** La Nave Inundada: el púlpito que se hundió de costado; la escalera de caracol todavía sube a ninguna parte. */
function pulpito(): Raster {
  const e = new Escultor(96, 120);
  const M = e.rampa(MAT.madera), O = e.rampa(MAT.oro), R = e.rampa(RAIZ), G = e.rampa(VERDE), A = e.rampa(MAT.agua), P = e.rampa(MAT.piedra);
  // charco al pie (agua que subió del piso)
  e.esfera(48, 112, 44, 7, A, { luz: 0.05 });
  // la columna que lo sostiene, ladeada
  e.capsula(46, 112, 52, 70, 7, 6, P, { rugoso: 0.4, semilla: 2 });
  // la copa del púlpito: caja octogonal ladeada con paneles tallados
  e.poligono([[22, 44], [70, 34], [80, 60], [74, 78], [34, 84], [24, 68]], M, { bisel: 4, rugoso: 0.3, semilla: 3 });
  e.luz((x, y) => (y > 46 && y < 78 && (x - 24 + Math.round(y * 0.2)) % 12 < 1 ? -0.3 : 0));
  // baranda de oro arriba y el atril
  e.capsula(22, 44, 70, 34, 2, 2, O, { luz: 0.05 });
  e.poligono([[50, 36], [62, 22], [70, 26], [58, 38]], M, { bisel: 2, luz: 0.05 });
  e.poligono([[54, 30], [64, 24], [66, 28], [56, 34]], e.rampa(MAT.hueso), { bisel: 1 });
  // la escalera de caracol (escalones sueltos) que rodea la columna
  for (let k = 0; k < 6; k++) e.caja(14 + k * 3, 104 - k * 9, 16, 4, 2, M, { luz: -0.05 * k });
  raices(e, R, [[34, 116], [66, 116]], 50, 5);
  e.musgo(G, 0.32, 8, [M, P]);
  return e.render();
}

/** La Forja Apagada: el monje herrero de piedra, con el martillo en alto y el yunque frío. */
function monjeHerrero(): Raster {
  const e = new Escultor(96, 136);
  const P = e.rampa(MAT.piedraTibia), H = e.rampa(MAT.hierro), M = e.rampa(MAT.madera), G = e.rampa(VERDE), B = e.rampa(MAT.brasa, true);
  // pedestal
  e.caja(20, 112, 56, 20, 6, P, { rugoso: 0.4, semilla: 1, luz: -0.05 });
  // hábito con capucha
  e.poligono([[30, 112], [62, 112], [58, 64], [52, 42], [40, 42], [34, 64]], P, { bisel: 4, rugoso: 0.35, semilla: 2 });
  e.esfera(46, 36, 9, 10, P, { rugoso: 0.2, semilla: 3, luz: 0.05 });
  e.esfera(46, 38, 5, 6, e.rampa(['#0a0806', '#16120e', '#241e18']));
  // cinturón de cuerda
  e.capsula(34, 76, 58, 76, 1.6, 1.6, e.rampa(MAT.paja));
  // brazo derecho en alto con el martillo, brazo izquierdo sostiene la pinza
  e.capsula(56, 54, 70, 30, 3.5, 3, P);
  e.capsula(70, 30, 72, 8, 1.8, 1.8, M);
  e.caja(62, 4, 20, 10, 3, H, { rugoso: 0.2 });
  e.capsula(36, 56, 26, 78, 3.5, 3, P);
  // el yunque frío adelante
  e.poligono([[6, 96], [36, 96], [42, 90], [30, 102], [26, 110], [14, 110], [12, 102]], H, { bisel: 2, rugoso: 0.2, semilla: 4 });
  e.caja(12, 108, 18, 16, 2, H, { luz: -0.1 });
  // una brasa que todavía no se apagó
  e.punto(20, 94, B, 0.4); e.punto(21, 94, B, 0.2);
  e.grieta(46, 70, 26, 1.5, 6, 0.4);
  e.musgo(G, 0.38, 9, [P]);
  const r = e.render();
  halo(r, 20, 93, 7, '#ff7020', 0.8);
  return r;
}

/** El Campanario Invertido: el rosetón que se cayó del campanario, apoyado contra los escombros, con vidrios verdes y de oro. */
function roseton(): Raster {
  const e = new Escultor(112, 120);
  const P = e.rampa(MAT.piedra), Vv = e.rampa(['#0a2a1a', '#145a34', '#2a8a4a', '#5ac070', '#b0f0b0'], true), Vo = e.rampa(['#3a2004', '#7a4a0a', '#c88a1a', '#f0c040', '#fff0a0'], true), Vm = e.rampa(['#1a0a2a', '#3a1a5a', '#6a3aa0', '#a070e0', '#e0c8ff'], true), K = e.rampa(['#06070a', '#0e1014']), R = e.rampa(RAIZ), G = e.rampa(VERDE);
  // escombros
  for (const [x, y, s] of [[16, 110, 10], [96, 108, 12], [74, 114, 8], [36, 114, 7]] as [number, number, number][]) e.esfera(x, y, s, s * 0.7, P, { rugoso: 0.5, semilla: x });
  // el aro de piedra (algo ladeado: elipse)
  const cx = 56, cy = 58, rx = 44, ry = 50;
  e.esfera(cx, cy, rx, ry, P, { rugoso: 0.35, semilla: 2 });
  // los vidrios: pétalos que se alternan
  e.esfera(cx, cy, rx - 6, ry - 6, K);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, a2 = a + Math.PI / 12, a3 = a - Math.PI / 12;
    const pts: [number, number][] = [[cx + Math.cos(a) * 8, cy + Math.sin(a) * 9], [cx + Math.cos(a3) * (rx - 9), cy + Math.sin(a3) * (ry - 9)], [cx + Math.cos(a) * (rx - 7), cy + Math.sin(a) * (ry - 7)], [cx + Math.cos(a2) * (rx - 9), cy + Math.sin(a2) * (ry - 9)]];
    // algunos vidrios rotos (se ve el negro)
    if (hash(k, 1, 4) < 0.22) continue;
    e.poligono(pts, k % 3 === 0 ? Vo : k % 3 === 1 ? Vv : Vm, { bisel: 0, luz: -0.32 + hash(k, 2, 4) * 0.18 });
  }
  e.esfera(cx, cy, 8, 9, Vo);
  // el plomo (la red negra de los vidrios)
  e.luz((x, y) => { const a = Math.atan2((y - cy) / ry, (x - cx) / rx), d = Math.hypot((x - cx) / rx, (y - cy) / ry); return d > 0.18 && d < 0.84 && Math.abs(((a / (Math.PI * 2)) * 24 + 24) % 2 - 1) > 0.88 ? -0.45 : 0; });
  e.grieta(30, 30, 30, 0.8, 7, 0.4);
  raices(e, R, [[20, 112], [100, 112]], 70, 13);
  e.musgo(G, 0.3, 11, [P]);
  return e.render({ oclusion: 0.1 });
}

export function catedralMonumentos(): Monumento[] {
  return [
    { zona: 'La Escalera Hundida', obj: monumento('mon_catedral_angel', [angel()], [48, 122], 56, 'larga'), historia: 'El ángel de piedra arrodillado al pie de la escalera, atado al piso por las raíces que bajaron con él.' },
    { zona: 'El Atrio de las Luciérnagas', obj: monumento('mon_catedral_pila', [pila()], [44, 84], 36, 'larga'), historia: 'La pila bautismal desbordada: su agua quedó brillando turquesa y las luciérnagas vienen a beber.' },
    { zona: 'Los Claustros Quebrados', obj: monumento('mon_catedral_organo', [organo()], [60, 150], 76, 'larga'), historia: 'El órgano de raíces: los tubos se volvieron raíz y suenan solos cuando entra el viento.' },
    { zona: 'La Capilla Escondida', obj: monumento('mon_catedral_relicario', [relicario()], [36, 84], 52, 'larga'), historia: 'El relicario de oro que los monjes escondieron, con tres velas que nunca se apagan.' },
    { zona: 'La Nave Inundada', obj: monumento('mon_catedral_pulpito', [pulpito()], [48, 116], 40, 'larga'), historia: 'El púlpito hundido de costado en el agua que subió del piso; la escalera sube a ninguna parte.', prefiere: 'agua' },
    { zona: 'La Forja Apagada', obj: monumento('mon_catedral_monje_herrero', [monjeHerrero()], [48, 132], 56, 'larga'), historia: 'El monje herrero de piedra con el martillo en alto; en su yunque frío queda una sola brasa.' },
    { zona: 'El Campanario Invertido', obj: monumento('mon_catedral_roseton', [roseton()], [56, 116], 72, 'larga'), historia: 'El rosetón que se cayó del campanario y quedó apoyado en los escombros, con los vidrios verdes y de oro.' },
  ];
}
