import type { Raster } from '../core/raster';
import { IconCanvas, type P } from '../loot/canvas';
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
