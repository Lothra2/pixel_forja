import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, over, type P } from '../loot/canvas';
import { MAT, clothMat, gemMat, glowMat, metalMat } from '../loot/materials';
import type { UiSprite } from './hud';

/**
 * Íconos que pidió el juego (ASSETS_PENDIENTES 1, 2 y 26): los de los carteles del mapa (Alana no lee: el ícono es
 * el cartel), los del HUD y la pausa, y el aviso de girar la tablet. Mismo estilo que los íconos que ya había:
 * 24 x 24, sombreado por material, contorno oscuro.
 */

const make = (draw: (c: IconCanvas) => void): Raster => { const c = new IconCanvas(24, 24); draw(c); c.center(); return c.render(); };
const red = clothMat('#d8243e'), green = clothMat('#4fb04a'), white = clothMat('#f2efe6'), dark = clothMat('#1e1a24'), yellow = clothMat('#f2c43a'), pink = clothMat('#f08ab4');

function star(c: IconCanvas, cx: number, cy: number, r: number, mat = MAT.gold) {
  const pts: P[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  c.poly(pts, mat);
}
function heart(c: IconCanvas, cx: number, cy: number, s: number, mat = red) {
  c.circle([cx - 3.6 * s, cy - 2 * s], 4.4 * s, mat); c.circle([cx + 3.6 * s, cy - 2 * s], 4.4 * s, mat);
  c.poly([[cx - 7.8 * s, cy - 0.6 * s], [cx + 7.8 * s, cy - 0.6 * s], [cx, cy + 8.4 * s]], mat);
  c.ellipse([cx - 4 * s, cy - 3.4 * s], 1.6 * s, 1.2 * s, white, { tone: 4 });
}
function speaker(c: IconCanvas) {
  c.poly([[1, 13], [5, 13], [11, 7], [11, 25], [5, 19], [1, 19]], metalMat('#c8ccd6'));
}

/** Íconos de los carteles del mapa (ui/carteles/<nombre>.png). */
export function signIcons(): UiSprite[] {
  const list: [string, (c: IconCanvas) => void][] = [
    ['flecha_norte', (c) => { c.poly([[16, 4], [26, 15], [20, 15], [20, 27], [12, 27], [12, 15], [6, 15]], MAT.gold); }],
    ['peligro', (c) => { c.poly([[16, 3], [29, 27], [3, 27]], yellow); c.poly([[14.6, 10], [17.4, 10], [16.8, 19], [15.2, 19]], dark, { tone: 0 }); c.circle([16, 22.6], 1.6, dark, { tone: 0 }); }],
    ['corazon', (c) => heart(c, 16, 16, 1.2)],
    ['cruce', (c) => {
      c.poly([[14.8, 8], [17.2, 8], [17.2, 29], [14.8, 29]], MAT.wood);
      c.poly([[4, 9], [24, 9], [24, 15], [4, 15], [1, 12]], MAT.palewood, { bias: 1 });
      c.poly([[8, 17], [28, 17], [31, 20], [28, 23], [8, 23]], MAT.palewood);
    }],
    ['estrella', (c) => star(c, 16, 16.5, 13)],
  ];
  return list.map(([name, draw]) => ({ name, frames: [make(draw)] }));
}

/** Íconos del HUD y de la pausa (ui/icono_<nombre>.png). */
export function hudIcons(): UiSprite[] {
  const list: [string, (c: IconCanvas) => void][] = [
    ['pausa', (c) => { c.poly([[8, 6], [13, 6], [13, 26], [8, 26]], white); c.poly([[19, 6], [24, 6], [24, 26], [19, 26]], white); }],
    ['secreto', (c) => {
      c.poly([[5, 17], [27, 17], [27, 28], [5, 28]], MAT.wood); c.poly([[5, 17], [7, 12], [25, 12], [27, 17]], MAT.wood, { bias: 1 });
      c.poly([[5, 17], [27, 17], [27, 19], [5, 19]], MAT.gold); c.poly([[14, 19], [18, 19], [18, 22.5], [14, 22.5]], MAT.gold);
      // destello arriba: algo escondido brilla
      star(c, 16, 7, 4.4, glowMat('#ffe08a'));
    }],
    ['zona', (c) => {
      c.poly([[14.6, 22], [17.4, 22], [17.4, 29], [14.6, 29]], MAT.wood);
      c.poly([[16, 3], [27, 15], [22, 15], [28, 23], [4, 23], [10, 15], [5, 15]], clothMat('#4f9a5a'));
    }],
    ['luna', (c) => { c.circle([16, 16], 11, clothMat('#f2e4a0')); c.eraseCircle([21, 12], 9); c.dot([10, 15], clothMat('#c8b878'), { tone: 1 }, true); }],
    ['sonido', (c) => { speaker(c); for (const r of [7, 13]) c.ring([9, 16], r, r, 2.8, white, {}, 305, 55); }],
    ['silencio', (c) => { speaker(c); c.line([15, 11], [26, 22], 2.4, red); c.line([26, 11], [15, 22], 2.4, red); }],
    ['calidad', (c) => { c.poly([[16, 4], [27, 13], [16, 28], [5, 13]], gemMat('#6cb4ff')); c.poly([[16, 4], [21, 13], [16, 28], [11, 13]], gemMat('#a8daf8'), { bias: 1 }); c.line([5, 13], [27, 13], 0.8, gemMat('#2f62e6')); }],
    ['jugadora', (c) => { c.circle([16, 11], 6.4, clothMat('#e8c8a8')); c.ellipse([16, 26], 11, 7, clothMat('#3a6ad8')); c.ellipse([16, 7], 6.6, 3.4, clothMat('#3a2418'), { bias: 1 }); }],
    ['peque', (c) => {
      c.circle([16, 16], 12, yellow);
      c.circle([12, 14], 1.6, dark, { tone: 0 }); c.circle([20, 14], 1.6, dark, { tone: 0 });
      c.ring([16, 17], 5, 4, 1.4, dark, { tone: 0 }, 20, 160);
      c.ellipse([9.4, 19], 2, 1.3, pink); c.ellipse([22.6, 19], 2, 1.3, pink);
    }],
    ['jugar', (c) => { c.poly([[9, 5], [27, 16], [9, 27]], green); }],
    ['guardado', (c) => {
      // pergamino enrollado con un visto verde: quedó guardado
      c.poly([[7, 7], [25, 7], [25, 25], [7, 25]], clothMat('#e8d8a8'));
      c.ellipse([16, 6.5], 10.5, 2.6, clothMat('#c8a868'), { bias: 1 }); c.ellipse([16, 25.5], 10.5, 2.6, clothMat('#c8a868'));
      c.line([10, 16.5], [14.5, 21], 3.4, green); c.line([14.5, 21], [23, 11], 3.4, green);
    }],
  ];
  return list.map(([name, draw]) => ({ name: `icono_${name}`, frames: [make(draw)] }));
}

/** Aviso de girar la tablet: 64 x 64, 2 cuadros (vertical, y acostada con la flecha curva). */
export function rotateTablet(): UiSprite {
  const frame = (landscape: boolean) => {
    const c = new IconCanvas(64, 32, 64);
    const body = clothMat('#2a2e3a'), screen = glowMat('#6cb4ff');
    if (!landscape) { c.poly([[10, 4], [22, 4], [22, 28], [10, 28]], body); c.poly([[11.5, 6], [20.5, 6], [20.5, 25], [11.5, 25]], screen, { tone: 2 }); }
    else { c.poly([[4, 10], [28, 10], [28, 22], [4, 22]], body); c.poly([[6, 11.5], [25, 11.5], [25, 20.5], [6, 20.5]], screen, { tone: 2 }); }
    c.ring([16, 16], 13, 13, 1.4, MAT.gold, {}, landscape ? 200 : 290, landscape ? 290 : 380);
    const tip: P = landscape ? [16 + Math.cos((290 * Math.PI) / 180) * 13, 16 + Math.sin((290 * Math.PI) / 180) * 13] : [16 + Math.cos((380 * Math.PI) / 180) * 13, 16 + Math.sin((380 * Math.PI) / 180) * 13];
    c.poly([[tip[0] - 2.6, tip[1] - 1], [tip[0] + 2.6, tip[1] - 1], [tip[0], tip[1] + 3]], MAT.gold);
    return c.render();
  };
  return { name: 'girar_tablet', frames: [frame(false), frame(true)] };
}

// ---------- íconos de habilidad (40 x 40, sobre medallón redondo) ----------

/**
 * Medallón: disco oscuro con luz arriba, aro del color de la habilidad y contorno negro. Con `rim2` el aro va en
 * degradé de `rim` (abajo) a `rim2` (arriba), como el aro dorado del ataque.
 */
function medallion(rim: string, rim2?: string): Raster {
  const S = 40, r = createRaster(S, S), c = (S - 1) / 2;
  const hx = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const R = hx(rim), R2 = rim2 ? hx(rim2) : null;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - c, y - c);
    if (d > 19.6) continue;
    let col: number[];
    if (d > 18.6) col = [10, 8, 14];
    else if (d > 16.4) {
      if (R2) {
        // degradé de abajo (oscuro) a arriba (claro), con un brillo duro arriba a la izquierda
        const t = Math.max(0, Math.min(1, 0.5 - (y - c) / (S * 0.9) - (x - c) / (S * 2.4)));
        col = R.map((v, i) => v + (R2[i] - v) * t);
        if (d < 17.4 && y < c - 8 && x < c) col = [255, 240, 196];
        if (d > 17.9 && y > c + 6) col = col.map((v) => v * 0.72);
      } else { const k = y < c ? 1.15 : 0.8; col = R.map((v) => Math.min(255, v * k)); }
    }
    else if (d > 15.4) col = [14, 12, 20];
    else { const l = 1 - Math.hypot(x - c + 4, y - c + 5) / 26; col = [24 + l * 26, 22 + l * 24, 34 + l * 30]; }
    r.data.set([...col.map(Math.round), 255], (y * S + x) * 4);
  }
  return r;
}

function skill(rim: string, draw: (c: IconCanvas) => void, rim2?: string): Raster {
  const bg = medallion(rim, rim2);
  const c = new IconCanvas(40, 40);
  draw(c);
  c.center();
  over(bg, c.render());
  return bg;
}

function arrowDown(c: IconCanvas, x: number, y: number, len: number) {
  c.line([x - len * 0.5, y - len], [x, y - 2], 1.6, MAT.wood);
  c.poly([[x + 1.6, y - 4.4], [x - 2.2, y - 0.6], [x + 1.2, y + 1.2]], MAT.steel);
  c.poly([[x - len * 0.5 - 1.6, y - len - 1], [x - len * 0.5 + 1.2, y - len + 0.4], [x - len * 0.5 - 0.6, y - len + 3]], red);
}

/** Íconos de los botones de habilidad (ui/habilidades/<nombre>.png). */
export function skillIcons(): UiSprite[] {
  const list: [string, string, (c: IconCanvas) => void][] = [
    ['lluvia_flechas', '#4fb04a', (c) => { arrowDown(c, 13, 30, 12); arrowDown(c, 21, 27, 14); arrowDown(c, 29, 31, 12); }],
    ['esquiva', '#6cb4ff', (c) => {
      for (const [y, x0] of [[13, 6], [20, 3], [27, 7]] as [number, number][]) c.line([x0, y], [x0 + 9, y], 1.8, white);
      c.ring([22, 20], 10, 10, 2.6, MAT.gold, {}, 200, 340);
      c.poly([[30.6, 9.4], [34, 16], [27, 15]], MAT.gold);
    }],
    ['llamar_thor', '#c8843a', (c) => {
      const paw = clothMat('#8a5a3a');
      c.ellipse([20, 25], 7.4, 6.2, paw);
      for (const [x, y] of [[11.4, 17], [16.6, 12.4], [23.4, 12.4], [28.6, 17]] as P[]) c.ellipse([x, y], 2.9, 3.6, paw);
    }],
    ['curar', '#4fd88a', (c) => {
      heart(c, 20, 21, 1.45, clothMat('#e8304a'));
      c.poly([[26, 9], [28.4, 9], [28.4, 12], [31.4, 12], [31.4, 14.4], [28.4, 14.4], [28.4, 17.4], [26, 17.4], [26, 14.4], [23, 14.4], [23, 12], [26, 12]], glowMat('#8affb0'), { tone: 4 });
    }],
    ['torbellino', '#d8a03a', (c) => {
      for (const [r, a0] of [[14, 0], [9.5, 120], [5, 240]] as [number, number][]) c.ring([20, 20], r, r, 2.2, white, {}, a0, a0 + 230);
      c.line([20, 20], [31, 9], 2.2, MAT.steel); c.line([17, 23], [22, 18], 2.4, MAT.gold);
    }],
    ['bloqueo', '#aab5c3', (c) => {
      c.poly([[9, 8], [31, 8], [31, 20], [20, 33], [9, 20]], clothMat('#2f5fb8'));
      c.poly([[9, 8], [31, 8], [31, 10.4], [9, 10.4]], MAT.gold, { bias: 1 });
      c.poly([[18.6, 12], [21.4, 12], [21.4, 17], [26, 17], [26, 19.8], [21.4, 19.8], [21.4, 27], [18.6, 27], [18.6, 19.8], [14, 19.8], [14, 17], [18.6, 17]], MAT.gold);
    }],
    ['nova_fuego', '#ff6a2a', (c) => {
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, x = 20 + Math.cos(a) * 12, y = 20 + Math.sin(a) * 12; c.poly([[20 + Math.cos(a - 0.22) * 7, 20 + Math.sin(a - 0.22) * 7], [x, y], [20 + Math.cos(a + 0.22) * 7, 20 + Math.sin(a + 0.22) * 7]], glowMat('#ff8a1e'), { tone: 3 }); }
      c.circle([20, 20], 7.4, glowMat('#ffb040'), { tone: 3 });
      c.circle([20, 20], 4, glowMat('#fff0b0'), { tone: 4 });
    }],
    ['rayo_canalizado', '#8a7aff', (c) => {
      c.poly([[23, 4], [11, 22], [19, 22], [15, 36], [29, 16], [21, 16], [26, 4]], glowMat('#c8d8ff'), { tone: 4 });
      c.poly([[22.6, 7], [14.6, 20], [20.6, 20]], glowMat('#ffffff'), { tone: 4 });
    }],
  ];
  const out = list.map(([name, rim, draw]) => ({ name, frames: [skill(rim, draw)] }));
  // #38: el ataque básico (el mismo para todas las heroínas): dos espadas cruzadas claras, aro dorado en degradé
  out.push({ name: 'ataque', frames: [skill('#e8b850', crossedSwords, '#ffd27a')] });
  // #41: alzar el farol de Thor (el botón de Alana), y el mismo en gris para la recarga
  const farol = skill('#e8b850', raisedLantern, '#ffd27a');
  out.push({ name: 'farol', frames: [farol] });
  out.push({ name: 'farol_recarga', frames: [grayed(farol)] });
  // Mundo 5: prender el farol de plaza (o la lámpara del trono) y las chispas de la luz robada
  out.push({ name: 'prender', frames: [skill('#e8b850', lightLamp, '#ffd27a')] });
  out.push({ name: 'chispas', frames: [skill('#e8b850', threeSparks, '#ffd27a')] });
  // Mundo 6: Thor se sacude (y el mismo en gris sin agua, cuando está seco), el calor, la jaula y la palanca
  out.push({ name: 'sacudir', frames: [skill('#e8b850', (c) => thorShake(c, true), '#ffd27a')] });
  out.push({ name: 'sacudir_seco', frames: [grayed(skill('#e8b850', (c) => thorShake(c, false), '#ffd27a'))] });
  out.push({ name: 'calor', frames: [skill('#e8b850', heatGauge, '#ffd27a')] });
  out.push({ name: 'jaula', frames: [skill('#e8b850', openCage, '#ffd27a')] });
  out.push({ name: 'palanca', frames: [skill('#e8b850', pullLever, '#ffd27a')] });
  // Mundo 7: el medidor del frío, las luces compañeras, prender el brasero de hueso y romper la jaula de huesos
  out.push({ name: 'frio', frames: [skill('#e8b850', coldGauge, '#ffd27a')] });
  out.push({ name: 'compañeras', frames: [skill('#e8b850', companionLights, '#ffd27a')] });
  out.push({ name: 'brasero', frames: [skill('#e8b850', lightBrazier, '#ffd27a')] });
  out.push({ name: 'romper', frames: [skill('#e8b850', breakBones, '#ffd27a')] });
  return out;
}

/** El medidor del frío: un termómetro de vidrio con el azul que sube y un copo de nieve grande en el bulbo. */
function coldGauge(c: IconCanvas) {
  const glass = { hex: '#d8e8f0', kind: 'glass' as const };
  c.poly([[16.6, 6], [23.4, 6], [23.4, 22], [16.6, 22]], glass, { tone: 3 });
  c.circle([20, 27], 8, glass, { tone: 3 });
  for (const y of [9, 12.4, 15.8, 19.2]) c.line([24, y], [27, y], 1, MAT.gold);
  c.poly([[18.2, 11], [21.8, 11], [21.8, 22], [18.2, 22]], glowMat('#3a8ae8'), { tone: 3 });
  c.circle([20, 27], 6.4, glowMat('#1e5ab0'), { tone: 2 });
  // el copo: seis brazos con sus ramitas, blanco
  const snow = glowMat('#ffffff');
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6, x1 = 20 + Math.cos(a) * 5, y1 = 27 + Math.sin(a) * 5;
    c.line([20, 27], [x1, y1], 1.6, snow, { tone: 5 });
    const mx = 20 + Math.cos(a) * 3, my = 27 + Math.sin(a) * 3;
    c.line([mx, my], [mx + Math.cos(a + 0.9) * 1.6, my + Math.sin(a + 0.9) * 1.6], 0.8, snow, { tone: 5 });
    c.line([mx, my], [mx + Math.cos(a - 0.9) * 1.6, my + Math.sin(a - 0.9) * 1.6], 0.8, snow, { tone: 5 });
  }
}

/** Las luces compañeras: tres lucecitas de colores (verde, celeste y dorada) en círculo, con la estela que gira. */
function companionLights(c: IconCanvas) {
  c.ring([20, 20], 11, 11, 1, glowMat('#ffd890'), { tone: 2 }, 0, 360);
  const cols = ['#9aff7a', '#8ae0ff', '#ffd060'];
  cols.forEach((col, k) => {
    const a = -Math.PI / 2 + (k / 3) * Math.PI * 2, x = 20 + Math.cos(a) * 11, y = 20 + Math.sin(a) * 11;
    // la estela que dejan al girar
    for (let t = 1; t <= 3; t++) { const b = a - t * 0.22; c.circle([20 + Math.cos(b) * 11, 20 + Math.sin(b) * 11], 2.4 - t * 0.5, glowMat(col), { tone: 2 }); }
    c.circle([x, y], 4.2, glowMat(col), { tone: 3 });
    c.circle([x, y], 2, glowMat('#ffffff'), { tone: 5 });
  });
  // la heroína chiquita en el medio (una silueta con su farolito)
  c.circle([20, 18], 2.6, clothMat('#f0c09a'));
  c.poly([[17.4, 21], [22.6, 21], [24, 27], [16, 27]], clothMat('#5a7ad8'));
}

/** Prender el brasero: el cuenco de piedra sobre tres cuernos, la llama que nace y la manito que lo toca. */
function lightBrazier(c: IconCanvas) {
  const stone = metalMat('#4a505e');
  // las patas cruzadas y el cuenco
  c.line([14, 33], [22, 21], 1.6, stone); c.line([28, 33], [20, 21], 1.6, stone); c.line([21, 33], [21, 21], 1.4, stone);
  c.poly([[12.6, 17], [29.4, 17], [26.6, 22.4], [15.4, 22.4]], stone, { bias: 1 });
  c.line([12.6, 17], [10, 13.4], 1.4, stone); c.line([29.4, 17], [32, 13.4], 1.4, stone);
  // la llama que nace
  c.poly([[21, 4.4], [25.4, 12], [24.6, 16], [21, 17.6], [17.4, 16], [16.6, 12]], glowMat('#ff6a20'), { tone: 3 });
  c.poly([[21, 8.6], [23.4, 13], [21, 16], [18.6, 13]], glowMat('#ffd060'), { tone: 4 });
  c.ellipse([21, 14.4], 1.4, 1.8, glowMat('#fff6d8'), { tone: 5 });
  // la manito que llega desde abajo a la izquierda
  const skin = clothMat('#f0c09a');
  c.poly([[5.6, 31], [8.4, 27.8], [11.6, 29.4], [9, 32.6]], clothMat('#5a7ad8'));
  c.ellipse([10.6, 27], 3.2, 2.6, skin);
  c.line([12, 25.2], [14.6, 21.6], 1.4, skin);
  c.ellipse([15, 21], 1.2, 1.2, glowMat('#ffd060'), { tone: 5 });
}

/** Romper la jaula: un puño que pega contra barrotes de hueso que se quiebran, con astillas que saltan. */
function breakBones(c: IconCanvas) {
  const bone = clothMat('#d8ccb4'), boneD = clothMat('#a89a80');
  // los barrotes de hueso: dos enteros y el del medio quebrado
  for (const x of [11, 29]) { c.line([x, 8], [x, 32], 2.4, bone); c.circle([x, 8], 2.2, bone); c.circle([x, 32], 2.2, boneD); }
  c.line([20, 8], [19, 16], 2.4, bone); c.circle([20, 8], 2.2, bone);
  c.line([21, 24], [20, 32], 2.4, bone); c.circle([20, 32], 2.2, boneD);
  // las astillas que saltan y el destello del golpe
  for (const [x, y, a] of [[14, 15, -2.4], [26, 14, -0.6], [27, 22, 0.4], [13, 23, 2.8]] as [number, number, number][]) c.line([x, y], [x + Math.cos(a) * 3, y + Math.sin(a) * 3], 1.2, bone);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.line([20 + Math.cos(a) * 4, 20 + Math.sin(a) * 4], [20 + Math.cos(a) * 6.4, 20 + Math.sin(a) * 6.4], 1, glowMat('#fff0c0'), { tone: 4 }); }
  // el puño de frente, con los nudillos
  const skin = clothMat('#f0c09a');
  c.ellipse([20, 21], 5.4, 4.6, skin);
  for (const x of [16.4, 19.2, 22, 24.6]) c.circle([x, 18], 1.6, skin);
  c.poly([[16, 24], [24, 24], [23, 30], [17, 30]], clothMat('#5a7ad8'));
}

/** Thor sacudiéndose: la cabeza de frente con las orejas volando a los dos lados, rayitas de movimiento y gotas. */
function thorShake(c: IconCanvas, wet: boolean) {
  const fur = clothMat('#b5713a'), furD = clothMat('#7a4a26'), muzzle = clothMat('#e8c8a0');
  // las rayitas de la sacudida (arcos a los costados)
  for (const s of [-1, 1]) c.ring([20 + s * 1, 21], 13.5, 12, 1.2, white, {}, s > 0 ? -50 : 130, s > 0 ? 50 : 230);
  // las orejas que vuelan hacia afuera
  c.poly([[12, 14], [4.6, 10.4], [6, 17.6], [11, 19]], furD);
  c.poly([[28, 14], [35.4, 10.4], [34, 17.6], [29, 19]], furD);
  // la cabeza redonda, el hocico claro, la nariz y los ojos cerrados contentos
  c.ellipse([20, 20], 9.6, 8.8, fur);
  c.ellipse([20, 24.6], 5.4, 4, muzzle);
  c.ellipse([20, 22.4], 1.8, 1.3, clothMat('#2a1a14'));
  for (const x of [15.6, 24.4]) c.ring([x, 18.6], 1.8, 1.4, 0.9, clothMat('#2a1a14'), {}, 200, 340);
  c.line([18.4, 27], [21.6, 27], 0.8, clothMat('#8a4a3a'));
  // las gotas celestes que salen volando
  if (wet) for (const [x, y, r] of [[6.4, 24.6, 1.7], [9.4, 31, 1.5], [33.6, 25, 1.7], [30.6, 31.4, 1.5], [14, 6.4, 1.4], [26.4, 6, 1.4]] as [number, number, number][]) {
    c.ellipse([x, y], r, r * 1.3, glowMat('#7ad0ff'), { tone: 3 });
    c.ellipse([x - r * 0.3, y - r * 0.4], r * 0.4, r * 0.4, glowMat('#e0f6ff'), { tone: 5 });
  }
}

/** El medidor de calor: un termómetro con una llamita roja adentro del bulbo. */
function heatGauge(c: IconCanvas) {
  const glass = { hex: '#d8e8f0', kind: 'glass' as const };
  // el tubo y el bulbo de vidrio
  c.poly([[16.6, 7], [23.4, 7], [23.4, 24], [16.6, 24]], glass, { tone: 3 });
  c.circle([20, 27.6], 7, glass, { tone: 3 });
  // las marquitas
  for (const y of [10, 13.4, 16.8, 20.2]) c.line([24, y], [27, y], 1, MAT.gold);
  // el rojo que sube y la llamita en el bulbo
  c.poly([[18.2, 12], [21.8, 12], [21.8, 24], [18.2, 24]], glowMat('#e8301a'), { tone: 3 });
  c.circle([20, 27.6], 5.2, glowMat('#e8301a'), { tone: 3 });
  c.poly([[20, 21.6], [23.4, 27], [22.4, 30.6], [20, 31.6], [17.6, 30.6], [16.6, 27]], glowMat('#ffb040'), { tone: 4 });
  c.poly([[20, 25.4], [21.6, 28.6], [20, 30.6], [18.4, 28.6]], glowMat('#fff0a0'), { tone: 5 });
}

/** Una jaula abierta con la luz que sale: la puertita abierta a un costado y la lucecita que sube con su brillo. */
function openCage(c: IconCanvas) {
  const iron = metalMat('#4a3c34');
  // la luz que sale y sube, con rayitos
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, cx = 25, cy = 9; c.line([cx + Math.cos(a) * 4.4, cy + Math.sin(a) * 4.4], [cx + Math.cos(a) * 6.6, cy + Math.sin(a) * 6.6], 1.1, glowMat('#ffe080'), { tone: 4 }); }
  c.circle([25, 9], 3.4, glowMat('#ffd060'), { tone: 4 });
  c.circle([25, 9], 1.6, glowMat('#fffae0'), { tone: 5 });
  // la jaula: la cúpula, los barrotes, la base y la argolla
  c.ring([17, 18], 8, 6, 1.4, iron, {}, 180, 360);
  for (const x of [9.6, 13.4, 20.6, 24.4]) c.line([x, 18], [x, 31], 1.3, iron);
  c.poly([[8.4, 30.4], [25.6, 30.4], [24.6, 33], [9.4, 33]], iron, { bias: 1 });
  c.ring([17, 9.4], 1.6, 1.6, 0.8, iron, {}, 0, 360);
  // la puertita abierta (los barrotes del medio, girados hacia afuera)
  c.poly([[24.4, 19], [31.6, 22.6], [31.6, 33], [24.4, 31]], { hex: '#2a1a14', kind: 'metal' as const }, { tone: 1 });
  for (const t of [0.3, 0.7]) c.line([24.4 + 7.2 * t, 19 + 3.6 * t], [24.4 + 7.2 * t, 31 + 2 * t], 1.1, iron);
  // un brillo tibio adentro, de la luz que estuvo
  c.ellipse([17, 25], 3, 3.4, glowMat('#ffc070'), { tone: 2 });
}

/** Una mano que tira de una palanca, con vapor que sale del caño. */
function pullLever(c: IconCanvas) {
  const iron = metalMat('#4a4048');
  // el vapor arriba a la derecha
  for (const [x, y, r] of [[29, 12, 3.4], [32.4, 8.4, 2.8], [26, 7.4, 2.6], [31, 15.6, 2.4]] as [number, number, number][]) c.circle([x, y], r, { hex: '#e8f4ff', kind: 'cloth' as const }, { tone: 4 });
  // la caja con el caño frío
  c.poly([[20, 22], [32, 22], [32, 33], [20, 33]], iron);
  c.poly([[27, 14], [30, 14], [30, 22], [27, 22]], metalMat('#5a8aa8'));
  // la palanca: barra que baja en diagonal desde la caja, con el mango de madera
  c.line([22, 24], [11, 13], 2, iron);
  c.line([11, 13], [7.4, 9.4], 3.2, MAT.wood);
  c.circle([22, 24], 2, metalMat('#8a7a70'));
  // la mano que la tira: el puño cerrado sobre el mango y la manga
  c.ellipse([10, 13.4], 3.6, 3.2, clothMat('#f0c09a'));
  c.poly([[4, 22], [7.6, 15], [11.6, 16.4], [8.4, 23.4]], clothMat('#5a7ad8'));
  // las rayitas del tirón
  for (const [x0, y0] of [[14, 8], [16.6, 10]] as P[]) c.line([x0, y0], [x0 + 3.4, y0 + 3.4], 0.9, white);
}

/** Una mano que prende un farol: el farol de plaza arriba con la luz dorada que nace y la manito que lo toca. */
function lightLamp(c: IconCanvas) {
  const iron = metalMat('#3a3e4a'), X = 22, Y = 15;
  // los rayos dorados alrededor del farol (cortos, para que no toquen el aro)
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI * 0.9 + (k / 6) * Math.PI * 0.8, R = 7.8, L = k % 2 ? 2 : 3.2;
    c.line([X + Math.cos(a) * R, Y + Math.sin(a) * R], [X + Math.cos(a) * (R + L), Y + Math.sin(a) * (R + L)], 1.3, glowMat(k % 2 ? '#ffc070' : '#fff0c0'), { tone: k % 2 ? 3 : 4 });
  }
  // el farol: cúpula, jaula con el vidrio prendido y la llama, base
  c.poly([[X - 6, 9.6], [X + 6, 9.6], [X, 5.2]], iron, { bias: 1 });
  c.poly([[X - 5.4, 9.6], [X + 5.4, 9.6], [X + 4.4, 20], [X - 4.4, 20]], glowMat('#f0a040'), { tone: 3 });
  c.ellipse([X, 15.4], 2, 3.4, glowMat('#fff4d0'), { tone: 5 });
  for (const d of [-5.2, 0, 5.2]) c.px1([X + d, 9.6], [X + d * 0.9, 20], iron, { tone: 1 });
  c.poly([[X - 5, 20], [X + 5, 20], [X + 3.6, 22.4], [X - 3.6, 22.4]], iron);
  c.line([X, 22.4], [X, 25.4], 1.6, iron);
  // la manito que sube a tocarlo: palma, dedo índice estirado y la manga, todo adentro del aro
  const skin = clothMat('#f0c09a');
  c.poly([[12.6, 31.4], [15.2, 28.4], [18.2, 30], [15.6, 33]], clothMat('#5a7ad8'));
  c.ellipse([17.2, 27.4], 3.4, 2.8, skin);
  c.line([18.6, 25.6], [20.4, 23], 1.4, skin);
  c.line([16.2, 25.2], [17.2, 23.6], 1.2, skin);
  c.ellipse([20.8, 22.6], 1.2, 1.2, glowMat('#fff0c0'), { tone: 5 });
}

/** Tres chispas doradas en arco (la más grande en el medio, arriba). El juego pone el contador. */
function threeSparks(c: IconCanvas) {
  const spark = (x: number, y: number, r: number) => {
    c.poly([[x, y - r], [x + r * 0.28, y - r * 0.28], [x + r, y], [x + r * 0.28, y + r * 0.28], [x, y + r], [x - r * 0.28, y + r * 0.28], [x - r, y], [x - r * 0.28, y - r * 0.28]], glowMat('#ffc070'), { tone: 3 });
    c.poly([[x, y - r * 0.6], [x + r * 0.18, y - r * 0.18], [x + r * 0.6, y], [x + r * 0.18, y + r * 0.18], [x, y + r * 0.6], [x - r * 0.18, y + r * 0.18], [x - r * 0.6, y], [x - r * 0.18, y - r * 0.18]], glowMat('#fff4d0'), { tone: 5 });
  };
  // el arco de luz que las une
  c.ring([20, 30], 14, 13, 1, glowMat('#ffd890'), { tone: 2 }, 200, 340);
  spark(9.5, 23, 5.4);
  spark(20, 12.5, 7.6);
  spark(30.5, 23, 5.4);
}

/** El farol de Thor alzado: rayos ámbar alrededor, vidrio que brilla, jaula de hierro, el asa arriba. */
function raisedLantern(c: IconCanvas) {
  // los rayos: ocho, largos y cortos alternados, de ámbar a casi blanco
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8, L = k % 2 ? 4 : 6.5, w = 0.13, R = 10;
    const cx = 20, cy = 21;
    void w;
    c.line([cx + Math.cos(a) * R, cy + Math.sin(a) * R], [cx + Math.cos(a) * (R + L), cy + Math.sin(a) * (R + L)], 1.3, glowMat(k % 2 ? '#ffc070' : '#fff0c0'), { tone: k % 2 ? 3 : 4 });
  }
  const iron = metalMat('#3a3a44');
  // el asa (lo que muerde Thor) y el techito
  c.ring([20, 12.5], 3.6, 3.2, 1.2, iron, {}, 180, 360);
  c.poly([[14, 16], [26, 16], [20, 11.5]], iron, { bias: 1 });
  // la jaula con el vidrio prendido y la llama
  c.poly([[14.5, 16], [25.5, 16], [25, 27], [15, 27]], glowMat('#f0a040'), { tone: 3 });
  c.ellipse([20, 22.5], 2.2, 3.6, glowMat('#fff0c0'), { tone: 5 });
  for (const x of [14.6, 20, 25.4]) c.px1([x, 16], [x, 27], iron, { tone: 1 });
  c.poly([[13.5, 27], [26.5, 27], [26, 29.5], [14, 29.5]], iron);
}

/** El ícono apagado (recarga): en grises, más oscuro. */
function grayed(r: Raster): Raster {
  const out = createRaster(r.w, r.h);
  for (let i = 0; i < r.w * r.h; i++) {
    const k = i * 4, l = (r.data[k] * 0.3 + r.data[k + 1] * 0.59 + r.data[k + 2] * 0.11) * 0.75;
    out.data[k] = out.data[k + 1] = Math.round(l); out.data[k + 2] = Math.round(l * 1.04); out.data[k + 3] = r.data[k + 3];
  }
  return out;
}

/** Dos espadas cruzadas: hoja clara con filo de luz, guarda dorada, empuñadura de cuero y pomo. */
function crossedSwords(c: IconCanvas) {
  const blade = metalMat('#d8e0ea'), edge = glowMat('#ffffff'), grip = MAT.leather, gold = MAT.gold;
  const sword = (s: number) => {
    // s = 1: la punta arriba a la derecha; s = -1: arriba a la izquierda (espejo)
    // todo un poco más chico que el medallón, para que las puntas y los pomos no toquen el aro
    const X = (x: number) => 20 + ((s > 0 ? x : 40 - x) - 20) * 0.8;
    const Y = (y: number) => 21 + (y - 21) * 0.8;
    // hoja: ancha en la guarda, con punta
    c.poly([[X(12.4), Y(25.4)], [X(14.6), Y(27.6)], [X(30.4), Y(11.4)], [X(31.6), Y(8.4)], [X(28.6), Y(9.6)]], blade);
    c.px1([X(13.4), Y(25.4)], [X(29.4), Y(9.6)], edge, { tone: 5 }, true);
    // guarda
    c.line([X(9.4), Y(24.4)], [X(15.6), Y(30.6)], 2.2, gold);
    // empuñadura y pomo
    c.line([X(11.4), Y(28.6)], [X(7.4), Y(32.6)], 2.2, grip);
    c.circle([X(6.6), Y(33.4)], 1.9, gold);
  };
  sword(-1);
  sword(1);
}

/**
 * Íconos de la heroína celestial y del Ciclo 2 (encargo F13): `alas` (dos alas de luz abiertas), `lanza_luz` (una
 * lanza de luz en diagonal) y `ciclo` (un espiral dorado). Van aparte para no tocar los de antes.
 */
export function celestialSkillIcons(): UiSprite[] {
  return [
    { name: 'alas', frames: [skill('#ffe08a', openWings, '#fff6d0')] },
    { name: 'lanza_luz', frames: [skill('#ffe08a', lightSpear, '#fff6d0')] },
    { name: 'ciclo', frames: [skill('#e8b850', goldSpiral, '#ffd27a')] },
  ];
}

/** Dos alas de luz abiertas: el borde dorado arriba y las plumas blancas en abanico, con un brillo al medio. */
function openWings(c: IconCanvas) {
  const feather = glowMat('#ffffff'), soft = clothMat('#e8eaf8'), gold = MAT.gold;
  for (const s of [-1, 1]) {
    const X = (x: number) => 20 + s * x;
    // plumas largas en abanico, de afuera hacia adentro
    for (let k = 0; k < 5; k++) {
      const a = (-0.15 + k * 0.32), L = 13 - k * 1.4;
      const bx = X(3 + k * 2.2), by = 14 + k * 0.6;
      c.line([bx, by], [bx + s * Math.cos(a) * L, by + Math.sin(a) * L + 4], 2.4 - k * 0.15, k % 2 ? soft : feather, { tone: 4 });
    }
    // el borde del ala: arco dorado del hombro a la punta
    c.line([X(2), 17], [X(8), 9], 2.4, gold);
    c.line([X(8), 9], [X(16), 8], 2, gold);
    c.line([X(16), 8], [X(17.5), 12], 1.6, gold);
  }
  c.circle([20, 18], 3.2, glowMat('#fff4c0'), { tone: 5 });
}

/** La lanza de luz: un haz en diagonal con punta de diamante, estela y destellos. */
function lightSpear(c: IconCanvas) {
  const core = glowMat('#ffffff'), halo = glowMat('#ffd860');
  c.line([7, 33], [27, 13], 3.6, halo, { tone: 3 });
  c.line([8, 32], [27, 13], 1.6, core, { tone: 5 });
  c.poly([[24, 11], [33, 7], [29, 16]], halo, { tone: 4 });
  c.poly([[26, 12], [31, 9], [28.5, 14]], core, { tone: 5 });
  for (const [x, y, r] of [[12, 22, 2.4], [20, 31, 1.8], [7, 15, 1.6]] as [number, number, number][]) {
    c.poly([[x, y - r], [x + r * 0.3, y - r * 0.3], [x + r, y], [x + r * 0.3, y + r * 0.3], [x, y + r], [x - r * 0.3, y + r * 0.3], [x - r, y], [x - r * 0.3, y - r * 0.3]], glowMat('#fff0b0'), { tone: 4 });
  }
}

/** El espiral dorado del Ciclo: una vuelta y media que se cierra hacia el centro, con un punto de luz. */
function goldSpiral(c: IconCanvas) {
  let prev: P | null = null;
  for (let t = 0; t <= 1; t += 0.02) {
    const a = t * Math.PI * 3.4 - Math.PI / 2, r = 13 - t * 10.5;
    const p: P = [20 + Math.cos(a) * r, 20 + Math.sin(a) * r];
    if (prev) c.line(prev, p, 3 - t * 1.2, MAT.gold);
    prev = p;
  }
  c.circle([20, 20], 2.4, glowMat('#fff4c0'), { tone: 5 });
  c.poly([[20, 4.5], [23.5, 7], [20, 9.5]], MAT.gold, { bias: 1 });
}
