import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, over } from '../loot/canvas';
import { clothMat, glowMat, MAT } from '../loot/materials';

/**
 * Íconos de la app (PWA): la cara de Thor, el boxer, sobre el portal del abismo. Pintado a mano para que se lea
 * a 48 px. Cada tamaño sale de un dibujo base en pixeles agrandado por un entero (192 = 64 x 3, 512 = 64 x 8,
 * 180 = 60 x 3), así se ve pixel art nítido y no un dibujo borroso. El favicon de 32 se dibuja a su tamaño.
 */

const fur = clothMat('#c8843a'), furDark = clothMat('#8a5226'), mask = clothMat('#2a1e1a'), white = clothMat('#f2efe6');

/** Thor y el portal (sin fondo), en un lienzo de `px` pixeles. */
function thorPortal(px: number): Raster {
  const c = new IconCanvas(px, 32);
  // portal: aro azul que brilla y un remolino oscuro adentro
  c.circle([16, 15], 14.6, clothMat('#1a1440'), { tone: 1 });
  c.ring([16, 15], 15, 15, 2.2, glowMat('#6cb4ff'), { tone: 4 });
  c.ring([16, 15], 11.6, 11.6, 0.9, glowMat('#b48cff'), { tone: 3 }, 200, 340);
  // pecho blanco y collar rojo con chapita
  c.ellipse([16, 29.6], 8.4, 3.6, white);
  c.poly([[9.6, 25.4], [22.4, 25.4], [22, 27.6], [10, 27.6]], clothMat('#d8243e'));
  c.circle([16, 28.4], 1.3, MAT.gold);
  // orejas caídas
  c.poly([[7.4, 9.4], [10.6, 7.8], [11.4, 15.6], [8.6, 17]], furDark);
  c.poly([[24.6, 9.4], [21.4, 7.8], [20.6, 15.6], [23.4, 17]], furDark);
  // cabeza, mancha blanca en la frente y máscara negra del hocico
  c.ellipse([16, 16.4], 8.4, 9, fur);
  c.poly([[15.1, 8.4], [16.9, 8.4], [17.4, 15.4], [14.6, 15.4]], white, { bias: 1 });
  c.ellipse([16, 21.4], 6, 4.4, mask);
  c.ellipse([16, 19.4], 2.2, 1.3, clothMat('#100a0a'), { tone: 0 });
  c.ellipse([16, 24.4], 1.7, 1.3, clothMat('#f08ab4'));
  // ojos con brillo
  for (const x of [12.2, 19.8]) { c.circle([x, 14.4], 1.7, clothMat('#120c0c'), { tone: 0 }); c.dot([x - 0.6, 13.8], white, { tone: 5 }, true); }
  return c.render();
}

/** Fondo de noche: degradé azul oscuro con unas estrellas fijas. */
function night(px: number): Raster {
  const r = createRaster(px, px);
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
    const d = Math.hypot(x - px / 2, y - px * 0.45) / px;
    const k = Math.max(0, 1 - d * 1.5);
    r.data.set([Math.round(10 + 22 * k), Math.round(12 + 22 * k), Math.round(28 + 44 * k), 255], (y * px + x) * 4);
  }
  for (const [sx, sy] of [[0.12, 0.14], [0.86, 0.1], [0.9, 0.62], [0.08, 0.7], [0.74, 0.88]]) {
    const x = Math.floor(sx * px), y = Math.floor(sy * px), s = Math.max(1, Math.round(px / 64));
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) r.data.set([220, 228, 255, 255], ((y + dy) * px + x + dx) * 4);
  }
  return r;
}

/** Vecino más cercano por un entero (pixel art nítido). */
function upscale(r: Raster, k: number): Raster {
  const o = createRaster(r.w * k, r.h * k);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const s = (((y / k) | 0) * r.w + ((x / k) | 0)) * 4;
    o.data.set(r.data.subarray(s, s + 4), (y * o.w + x) * 4);
  }
  return o;
}

function full(base: number, k: number): Raster {
  const bg = night(base);
  over(bg, thorPortal(base));
  return upscale(bg, k);
}

export interface AppIcon { name: string; size: number; img: Raster; purpose: 'any' | 'maskable' }

/** Los 5 íconos que pide la PWA. El maskable deja a Thor dentro del 80 % del centro (zona segura). */
export function appIcons(): AppIcon[] {
  const maskable = upscale(night(64), 8);
  // busto apoyado en el borde de abajo (como en los otros), con la cara dentro del círculo seguro del 80 %
  over(maskable, upscale(thorPortal(48), 8), 64, 128);
  return [
    { name: 'icono_192', size: 192, img: full(64, 3), purpose: 'any' },
    { name: 'icono_512', size: 512, img: full(64, 8), purpose: 'any' },
    { name: 'icono_maskable_512', size: 512, img: maskable, purpose: 'maskable' },
    { name: 'apple_touch_180', size: 180, img: full(60, 3), purpose: 'any' },
    { name: 'favicon_32', size: 32, img: full(32, 1), purpose: 'any' },
  ];
}
