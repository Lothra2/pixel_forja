import type { Raster } from '../core/raster';
import { IconCanvas, type MatDef, type P } from '../loot/canvas';
import { glowMat, metalMat, clothMat } from '../loot/materials';
import type { WorldObject } from './objects';

/**
 * Detalles que hacen que cada lugar cuente algo: la guarida del trol bajo el puente, el campo de práctica de los
 * goblins, y cosas para descubrir en las praderas (flores grandes, tocón con hongos, charco que brilla).
 */

const leaf = (hex: string): MatDef => ({ hex, kind: 'fur' });
const wood = (hex: string): MatDef => ({ hex, kind: 'wood' });
const stone = (hex: string): MatDef => ({ hex, kind: 'stone' });
const canvas = (w: number, h: number, k = 2) => new IconCanvas(w, w / k, h);
const one = (fr: Raster) => ({ idle: { frames: [fr], fps: 1, loop: true } });

// ---------- la guarida del trol ----------

/** Cama del trol: un montón de paja con un trapo remendado encima. Va en el suelo. */
export function trollBed(): WorldObject {
  const c = canvas(64, 40, 2); // 32 x 20
  c.ellipse([16, 12], 14, 6.4, clothMat('#c8a858'));
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, x = 16 + Math.cos(a) * 13, y = 12 + Math.sin(a) * 5.6; c.line([x, y], [x + Math.cos(a) * 2.4, y + Math.sin(a) * 1.2], 0.5, clothMat('#e0c878')); }
  c.poly([[7, 9], [22, 7.4], [25, 13], [12, 16], [6.4, 13]], clothMat('#7a5a8a'));
  c.poly([[14, 10], [19, 9.4], [19.6, 12.6], [14.6, 13]], clothMat('#a8742c')); // remiendo
  c.px1([14, 10], [19.6, 12.6], clothMat('#3a2a2a'), { tone: 0 }, true);
  return { name: 'cama_trol', w: 64, h: 40, anchor: [32, 30], solid: null, layer: 'suelo', anims: one(c.render({ shadow: [16, 14, 15, 2] })) };
}

/** Olla del trol sobre tres piedras con brasas, y vapor que sube. */
export function trollPot(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(40, 48, 1.25); // 32 x 38.4
    for (const [x, y] of [[8, 33], [24, 33], [16, 35.6]] as P[]) c.ellipse([x, y], 3.6, 2.4, stone('#6a6874'));
    c.ellipse([16, 33], 6, 1.8, glowMat(['#ff7a1a', '#ffa040', '#ff8a2a', '#ffb050'][f]), { tone: 3 });
    c.ellipse([16, 25], 10, 7.4, metalMat('#2a2a32'));
    c.ellipse([16, 19.4], 9.4, 2.6, metalMat('#3a3a44'), { bias: 1 });
    c.ellipse([16, 19.6], 7.6, 1.8, clothMat('#8a6a2a')); // la sopa
    c.circle([13, 19.2], 1, clothMat('#e8e0d0')); c.circle([19, 19.8], 0.8, clothMat('#5a8a3a'));
    // vapor: tres volutas que suben y se corren
    for (let k = 0; k < 3; k++) { const y = 14 - ((f + k * 1.3) % 4) * 3, x = 12 + k * 4 + Math.sin(f + k) * 1.4; c.ellipse([x, y], 1.6, 1.2, clothMat('#d8d8e0'), { tone: 4 }); }
    frames.push(c.render({ glowK: 0.8, shadow: [16, 35, 12, 2] }));
  }
  return { name: 'olla_trol', w: 40, h: 48, anchor: [20, 45], solid: [-12, -6, 24, 6], anims: { idle: { frames, fps: 5, loop: true } }, light: { color: '#ff9040', radius: 70, flicker: true, dy: 6 } };
}

/** Huesos de pescado tirados (la cena del trol). Va en el suelo. */
export function fishBones(): WorldObject {
  const c = canvas(32, 16, 1);
  const bone = clothMat('#e8e0cc');
  c.line([6, 8], [22, 8], 0.9, bone);
  for (let x = 9; x <= 20; x += 2.6) { c.line([x, 8], [x - 1.4, 4.4], 0.6, bone); c.line([x, 8], [x - 1.4, 11.6], 0.6, bone); }
  c.poly([[22, 8], [27, 4.6], [28, 8], [27, 11.4]], bone); // cabeza
  c.circle([25.4, 7.6], 0.7, clothMat('#2a1a1a'), { tone: 0 });
  c.poly([[6, 8], [2.4, 5], [3.4, 8], [2.4, 11]], bone); // cola
  return { name: 'huesos_pescado', w: 32, h: 16, anchor: [16, 12], solid: null, layer: 'suelo', anims: one(c.render()) };
}

// ---------- campo de práctica de los goblins ----------

/** Diana de paja sobre un caballete, con flechas clavadas. */
export function target(): WorldObject {
  const c = canvas(32, 48, 1);
  c.line([10, 44], [14, 26], 1.6, wood('#6a4428')); c.line([22, 44], [18, 26], 1.6, wood('#6a4428'));
  c.circle([16, 22], 10, clothMat('#e0c878'));
  c.circle([16, 22], 7.4, clothMat('#c83a2a'));
  c.circle([16, 22], 5, clothMat('#f2efe6'));
  c.circle([16, 22], 2.6, clothMat('#c83a2a'));
  for (const [x, y, a] of [[13, 19, -0.5], [19.6, 24.4, 0.3], [11, 27, -0.2]] as [number, number, number][]) {
    c.line([x, y], [x - 6 * Math.cos(a), y - 6 * Math.sin(a) - 1], 0.6, wood('#a87a4a'));
    c.poly([[x - 6 * Math.cos(a) - 1, y - 6 * Math.sin(a) - 2], [x - 6 * Math.cos(a) + 0.6, y - 6 * Math.sin(a) - 1.8], [x - 6 * Math.cos(a) - 0.4, y - 6 * Math.sin(a) + 0.2]], clothMat('#e8e0d0'));
  }
  return { name: 'diana', w: 32, h: 48, anchor: [16, 45], solid: [-7, -4, 14, 4], anims: one(c.render({ shadow: [16, 44.6, 8, 1.4] })) };
}

/** Tarima de tablas donde el jefe goblin da órdenes. */
export function stage(): WorldObject {
  const c = canvas(96, 48, 3); // 32 x 16
  c.poly([[2, 6], [30, 6], [30, 13], [2, 13]], wood('#7a5232'));
  c.poly([[1, 4.4], [31, 4.4], [31, 6.6], [1, 6.6]], wood('#a0703e'), { bias: 1 });
  for (let x = 5; x < 30; x += 4) c.px1([x, 4.6], [x, 6.4], wood('#5a3a22'), { tone: 1 }, true);
  for (const x of [3, 15.6, 28.4]) c.poly([[x - 0.8, 13], [x + 0.8, 13], [x + 0.8, 15], [x - 0.8, 15]], wood('#4a3020'));
  c.poly([[12, 13], [20, 13], [20, 15.4], [12, 15.4]], wood('#8a5a32'), { bias: 1 }); // escalón
  c.poly([[24, 4.4], [26, 0.6], [27, 4.4]], clothMat('#a8242c')); // banderín
  return { name: 'tarima', w: 96, h: 48, anchor: [48, 45], solid: [-44, -22, 88, 20], anims: one(c.render({ shadow: [16, 15, 15, 1.4] })) };
}

/** Barriles apilados con cinchos de hierro. */
export function barrels(): WorldObject {
  const c = canvas(48, 40, 1.5); // 32 x 26.7
  const barrel = (x: number, y: number, s = 1) => {
    c.ellipse([x, y], 5.4 * s, 7 * s, wood('#8a5a32'));
    for (const dy of [-4, 0, 4]) c.line([x - 5.2 * s, y + dy * s], [x + 5.2 * s, y + dy * s], 0.6, metalMat('#4a4d56'));
    c.ellipse([x, y - 6.6 * s], 4.6 * s, 1.4 * s, wood('#a87a4a'), { bias: 1 });
  };
  barrel(9, 18); barrel(21, 18.6); barrel(15, 9, 0.9);
  return { name: 'barriles', w: 48, h: 40, anchor: [24, 36], solid: [-16, -8, 32, 8], anims: one(c.render({ shadow: [16, 25, 14, 1.8] })) };
}

// ---------- cosas para descubrir en las praderas ----------

/** Mata grande de flores silvestres que se mece (3 colores). */
export function bigFlowers(variant = 0): WorldObject {
  const cols = [['#e8607a', '#ffd0dc'], ['#7a8aff', '#d8e0ff'], ['#ffd25a', '#fff2b8']][variant % 3];
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(48, 32, 1.5); // 32 x 21.3
    const sway = [0, 0.6, 1, 0.4][f];
    for (let i = 0; i < 11; i++) {
      const x = 4 + i * 2.4 + ((i * 7) % 3) * 0.6, h = 7 + ((i * 5) % 6), tip: P = [x + sway * (h / 9), 19 - h];
      c.line([x, 19], tip, 0.6, leaf('#3f7f3a'));
      if (i % 2 === 0) c.ellipse([x + 1.2, 19 - h * 0.4], 1.4, 0.6, leaf('#4f8f34'), {}, -30);
      c.circle(tip, 1.4, clothMat(cols[0]));
      c.dot([tip[0] - 0.4, tip[1] - 0.4], clothMat(cols[1]), { tone: 4 }, true);
    }
    frames.push(c.render({ shadow: [16, 19.4, 13, 1.4] }));
  }
  return { name: `flores_grandes_${variant}`, w: 48, h: 32, anchor: [24, 29], solid: null, anims: { idle: { frames, fps: 4, loop: true } } };
}

/** Tocón viejo con hongos que le crecen al costado. */
export function stumpShrooms(): WorldObject {
  const c = canvas(40, 36, 1.25); // 32 x 28.8
  c.poly([[7, 26], [8, 13], [24, 13], [25, 26], [28, 27.4], [4, 27.4]], wood('#6a4428'));
  c.ellipse([16, 13], 8.2, 3, wood('#c09460'), { bias: 1 });
  for (const r of [2, 4.4, 6.6]) c.ring([16, 13], r, r * 0.36, 0.4, wood('#8a6a40'), { tone: 1 });
  for (const [x, y, s, col] of [[25, 20, 1.2, '#d8643a'], [27.4, 23.4, 0.9, '#d8643a'], [6.4, 22, 1, '#e8d8b0']] as [number, number, number, string][]) {
    c.poly([[x - 0.5 * s, y + 3 * s], [x + 0.5 * s, y + 3 * s], [x + 0.4 * s, y], [x - 0.4 * s, y]], clothMat('#f0e6d0'));
    c.ellipse([x, y], 2.6 * s, 1.6 * s, clothMat(col));
    c.dot([x - 0.6 * s, y - 0.5 * s], clothMat('#fff4e8'), { tone: 4 }, true);
  }
  return { name: 'tocon_hongos', w: 40, h: 36, anchor: [20, 33], solid: [-11, -6, 22, 6], anims: one(c.render({ shadow: [16, 27.4, 13, 1.8] })) };
}

/** Charco que refleja el cielo y tiembla. Va en el suelo. */
export function puddle(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(48, 24, 1.5); // 32 x 16
    c.ellipse([16, 8.4], 13, 5, clothMat('#2a4a6a'));
    c.ellipse([14, 7.4], 9, 3, clothMat('#3a6a9a'), { bias: 1 });
    c.ring([16 + (f % 2) - 0.5, 8.4], 3 + f * 1.6, 1.2 + f * 0.6, 0.4, clothMat('#a8d0f0'), { tone: 4 });
    c.dot([10 + f, 6.4], clothMat('#e8f4ff'), { tone: 5 }, true);
    frames.push(c.render());
  }
  return { name: 'charco', w: 48, h: 24, anchor: [24, 13], solid: null, layer: 'suelo', anims: { idle: { frames, fps: 4, loop: true } } };
}

export function detailObjects(): WorldObject[] {
  return [trollBed(), trollPot(), fishBones(), target(), stage(), barrels(), bigFlowers(0), bigFlowers(1), bigFlowers(2), stumpShrooms(), puddle()];
}
