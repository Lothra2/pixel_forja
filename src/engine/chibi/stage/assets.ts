import { createRaster, type Raster } from '../../core/raster';
import { capa, rect, elipse, poligono, barra, pon, juntar, hex, sombra, luz, mezcla, VACIO, type Capa } from '../paint';
import { pintarClip } from '../anim';
import { clipHumano } from '../clips';
import { defaultLook, COLORES_ROPA, COLORES_PELO, PIELES, PEINADOS, type ChibiLook, type Talla } from '../look';

/**
 * Generador de assets del taller: todo dibujado por código con el mismo estilo de los muñecos (contorno de 1 px,
 * colores planos con una sombra). Cada asset tiene variantes y algunos se mueven (agua, banderas, vapor, público).
 * El ancla de cada asset es el centro de abajo: ahí se apoya en el piso.
 */

export type Categoria = 'casas' | 'naturaleza' | 'vehiculos' | 'muelle' | 'adentro' | 'calle' | 'deporte' | 'gente' | 'pisos' | 'fondos';
export const CATEGORIAS: [Categoria, string, string][] = [
  ['fondos', 'Fondos', 'Backdrops'], ['pisos', 'Pisos', 'Floors'], ['casas', 'Casas y edificios', 'Buildings'], ['naturaleza', 'Naturaleza', 'Nature'],
  ['vehiculos', 'Vehículos', 'Vehicles'], ['muelle', 'Muelle y mar', 'Dock & sea'], ['adentro', 'Adentro de la casa', 'Indoors'],
  ['calle', 'Calle', 'Street'], ['deporte', 'Deporte', 'Sports'], ['gente', 'Gente y animales', 'People & animals'],
];

export interface AssetDef {
  id: string;
  nombre: [string, string];
  cat: Categoria;
  variantes: string[];
  /** Cuadros de la animación (1 = quieto) y ticks por cuadro. */
  cuadros: number;
  t: number;
  /** Fondo o piso que ocupa todo el ancho del escenario. */
  ancho?: boolean;
  /** Dibuja el cuadro f de la variante v. `w` solo para los que ocupan todo el ancho. */
  pintar: (v: string, f: number, w: number, seed: number) => Raster;
}

// ---------------------------------------------------------------- utilidades
const lienzo = (w: number, h: number) => capa(w, h);
const fin = (...cs: Capa[]): Raster => juntar(cs, cs[0].w, cs[0].h, 1);
const sinContorno = (c: Capa) => { c.contorno = false; return c; };
function rng(seed: number) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
const H = hex;
/** Raster sin contorno, pintado directo (cielos, agua, pisos). */
function plano(w: number, h: number, f: (x: number, y: number) => number | null, alfa?: (x: number, y: number) => number): Raster {
  const r = createRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = f(x, y);
    if (v === null) continue;
    const i = (y * w + x) * 4;
    r.data[i] = (v >> 16) & 255; r.data[i + 1] = (v >> 8) & 255; r.data[i + 2] = v & 255; r.data[i + 3] = alfa ? alfa(x, y) : 255;
  }
  return r;
}
/** Ventanita con marco. */
function ventana(c: Capa, x: number, y: number, w: number, h: number, marco: number, vidrio: number, reja = false) {
  rect(c, x, y, w, h, marco, 0);
  rect(c, x + 1, y + 1, w - 2, h - 2, vidrio, 0);
  pon(c, x + 1, y + 1, luz(vidrio), 0);
  if (reja) for (let i = x + 2; i < x + w - 1; i += 2) for (let j = y + 1; j < y + h - 1; j++) pon(c, i, j, sombra(sombra(marco)), 0);
}

// ---------------------------------------------------------------- fondos (todo el ancho)
const CIELOS: Record<string, [string, string, string]> = {
  dia: ['#5aa8f0', '#8ccaf8', '#cfe9fb'], tarde: ['#4a5aa8', '#e88a6a', '#f8d08a'], noche: ['#101834', '#1c2a5a', '#34407a'], nublado: ['#8aa0b8', '#a8bccc', '#cbd6de'],
};
function cielo(v: string, f: number, w: number): Raster {
  const h = 180;
  const [a, b, c] = CIELOS[v] ?? CIELOS.dia;
  const r = plano(w, h, (x, y) => {
    const t = y / h;
    // bandas de color como en el arcade (sin degradado suave)
    const banda = Math.floor(t * 6);
    const col = banda < 2 ? H(a) : banda < 4 ? H(b) : H(c);
    if (v === 'noche' && (x * 7 + y * 13) % 97 === 0 && y < 100) return (x + f) % 3 ? H('#f4f2ee') : H('#8a9ac8');
    return col;
  });
  if (v !== 'noche') {
    // nubes que pasan despacio
    const rr = rng(7);
    for (let n = 0; n < Math.ceil(w / 90); n++) {
      const cx = ((rr() * w + f * 1) % (w + 60)) - 30, cy = 18 + rr() * 50, s = 0.8 + rr() * 0.8;
      for (const [dx, dy, rad] of [[0, 0, 9], [10, 2, 7], [-10, 3, 7], [4, -5, 7]] as [number, number, number][]) {
        for (let y = -rad; y <= rad; y++) for (let x = -rad * 1.4; x <= rad * 1.4; x++) {
          if ((x * x) / 1.9 + y * y > rad * rad * s * s) continue;
          const px = Math.round(cx + dx * s + x), py = Math.round(cy + dy * s + y);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const i = (py * w + px) * 4;
          const sh = y > rad * 0.35 * s;
          const col = sh ? H(v === 'tarde' ? '#e8b0a0' : '#dfe8f0') : H('#fbfdff');
          r.data[i] = (col >> 16) & 255; r.data[i + 1] = (col >> 8) & 255; r.data[i + 2] = col & 255; r.data[i + 3] = 255;
        }
      }
    }
  } else {
    // la luna
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) { const i = ((20 + y) * w + (w - 40 + x)) * 4; r.data.set([244, 240, 210, 255], i); }
  }
  return r;
}
const MONTANAS: Record<string, [string, string, number[]]> = {
  // perfil del Ávila visto desde Caracas o La Guaira: lomo largo con dos picos
  avila: ['#3f8a5a', '#2f6e48', [0.55, 0.62, 0.72, 0.8, 0.86, 0.9, 0.84, 0.8, 0.86, 0.95, 0.88, 0.78, 0.7, 0.62, 0.58, 0.6, 0.55, 0.5]],
  monserrate: ['#3a6e52', '#2a5440', [0.4, 0.48, 0.6, 0.75, 0.92, 1, 0.9, 0.8, 0.72, 0.7, 0.75, 0.82, 0.76, 0.66, 0.58, 0.5, 0.45, 0.42]],
  lejanas: ['#8aa0c8', '#7088b8', [0.4, 0.55, 0.5, 0.65, 0.6, 0.72, 0.58, 0.5, 0.62, 0.7, 0.6, 0.52, 0.6, 0.5, 0.45, 0.55, 0.48, 0.4]],
  islas: ['#4a8a6a', '#3a7058', [0, 0, 0.2, 0.35, 0.3, 0, 0, 0, 0, 0.25, 0.4, 0.3, 0.1, 0, 0, 0, 0.15, 0]],
};
function montana(v: string, _f: number, w: number): Raster {
  const h = 90;
  const [c1, c2, perfil] = MONTANAS[v] ?? MONTANAS.avila;
  const alto = (x: number) => {
    const t = (x / w) * (perfil.length - 1), i = Math.floor(t), fr = t - i;
    const a = perfil[i], b = perfil[Math.min(perfil.length - 1, i + 1)];
    return (a + (b - a) * fr) * h * 0.9 + Math.sin(x * 0.7) * 1.2;
  };
  return plano(w, h, (x, y) => {
    const top = h - alto(x);
    if (y < top) return null;
    if (y < top + 1.2) return luz(H(c1));
    // vetas de quebradas
    if ((x + Math.floor(y / 3) * 5) % 23 === 0 && y > top + 4) return H(c2);
    if (v === 'monserrate' && Math.abs(x - w * 0.29) < 2 && y < top + 4) return H('#f4f2ee');
    return y > top + 14 && (x + y) % 2 === 0 ? H(c2) : H(c1);
  });
}
function skyline(v: string, f: number, w: number): Raster {
  const h = 120;
  const c = lienzo(w, h);
  const r = rng(v.length * 31 + 3);
  const base = v === 'hcm' ? '#8a96b0' : v === 'bogota' ? '#a07a6a' : '#96a0b4';
  let x = 0;
  while (x < w) {
    const bw = 12 + Math.floor(r() * 22), bh = 30 + Math.floor(r() * 50);
    const col = mezcla(H(base), H('#5a6478'), r() * 0.5);
    rect(c, x, h - bh, bw, bh, col, 1);
    for (let yy = h - bh + 3; yy < h - 3; yy += 4) for (let xx = x + 2; xx < x + bw - 2; xx += 3) pon(c, xx, yy, (xx * 7 + yy * 3 + f) % 11 ? luz(col) : H('#f8e8a0'), 0);
    x += bw + Math.floor(r() * 4);
  }
  // las torres que se reconocen
  const torre = (cx: number, tw: number, th: number, col: string, tipo: string) => {
    const t0 = h - th;
    if (tipo === 'gemelas') {
      for (const dx of [-tw - 2, 2]) { rect(c, cx + dx, t0, tw, th, H(col), 1); for (let yy = t0 + 2; yy < h; yy += 3) for (let xx = cx + dx + 1; xx < cx + dx + tw - 1; xx += 2) pon(c, xx, yy, H('#c8d4e8'), 0); }
    } else if (tipo === 'loto') {
      poligono(c, [[cx - tw / 2, h], [cx - tw / 2 + 2, t0 + 10], [cx, t0], [cx + tw / 2 - 2, t0 + 10], [cx + tw / 2, h]], H(col), 1);
      rect(c, cx + tw / 2 - 2, t0 + 22, 6, 3, H('#6a7a8a'), 1); // el helipuerto
      for (let yy = t0 + 6; yy < h; yy += 3) for (let xx = cx - tw / 2 + 3; xx < cx + tw / 2 - 2; xx += 2) pon(c, xx, yy, H('#bcd8f0'), 0);
    } else if (tipo === 'aguja') {
      rect(c, cx - tw / 2, t0 + 8, tw, th - 8, H(col), 1);
      poligono(c, [[cx - tw / 2, t0 + 8], [cx, t0], [cx + tw / 2, t0 + 8]], H(col), 1);
      rect(c, cx, t0 - 8, 1, 8, H('#e8455a'), 0);
    } else {
      rect(c, cx - tw / 2, t0, tw, th, H(col), 1);
      for (let yy = t0 + 2; yy < h; yy += 3) for (let xx = cx - tw / 2 + 1; xx < cx + tw / 2 - 1; xx += 2) pon(c, xx, yy, H('#d8e0f0'), 0);
    }
  };
  if (v === 'caracas') { torre(Math.round(w * 0.35), 9, 100, '#7a8aa8', 'gemelas'); torre(Math.round(w * 0.7), 14, 70, '#9aa4b4', 'recta'); }
  if (v === 'hcm') { torre(Math.round(w * 0.4), 18, 110, '#7aa0c8', 'loto'); torre(Math.round(w * 0.75), 14, 116, '#a8b8d0', 'aguja'); }
  if (v === 'bogota') { torre(Math.round(w * 0.55), 14, 104, '#c8a080', 'recta'); }
  return fin(c);
}
function mar(v: string, f: number, w: number): Raster {
  const h = 60;
  const base = v === 'noche' ? H('#1a2a5a') : v === 'tarde' ? H('#3a5aa0') : H('#2f6fc8');
  const claro = luz(base), oscuro = sombra(base);
  return plano(w, h, (x, y) => {
    if (y === 0) return luz(claro);
    const ola = Math.sin((x + f * 2) * 0.35 + y * 0.9) + Math.sin((x - f) * 0.13 + y * 0.4);
    if (ola > 1.3 && y % 3 === 0) return H('#e8f4ff');
    if (ola > 0.6) return claro;
    if (ola < -1.2) return oscuro;
    return base;
  });
}

// ---------------------------------------------------------------- pisos (todo el ancho, se repiten)
function piso(v: string, f: number, w: number): Raster {
  const h = 48;
  return plano(w, h, (x, y) => {
    switch (v) {
      case 'muelle': {
        if (y === 0) return H('#f0d0a0');
        const tabla = Math.floor((y - 1) / 5);
        if ((y - 1) % 5 === 4) return H('#6a3e22');
        const corte = (x + tabla * 37) % 61 === 0;
        if (corte) return H('#6a3e22');
        return tabla % 2 ? H('#b8784a') : H('#a86a40');
      }
      case 'calle': {
        if (y < 10) return y === 0 ? H('#d8d4cc') : y === 9 ? H('#7a7670') : (x % 16 === 0 ? H('#a8a49c') : H('#c4c0b8'));
        if (y === 10) return H('#5a5a60');
        if (y > 26 && y < 29 && (x % 24) < 12) return H('#f4e8a0');
        return (x * 3 + y * 7) % 19 === 0 ? H('#5a5c66') : H('#4a4c56');
      }
      case 'baldosa': {
        const a = Math.floor(x / 8) + Math.floor(y / 8);
        if (y === 0) return H('#8a6a5a');
        return a % 2 ? H('#e8e0d0') : H('#b84a3a');
      }
      case 'patio': {
        if (y === 0) return H('#c8b8a0');
        const ladrillo = (Math.floor(y / 5) % 2 ? x + 6 : x) % 12;
        if (y % 5 === 4 || ladrillo === 0) return H('#9a6a4a');
        return H('#c88a5a');
      }
      case 'cancha': {
        const franja = Math.floor((x + y * 0.3) / 20) % 2;
        if (y === 2 || (x % 240 === 120 && y > 2)) return H('#f4f2ee');
        return franja ? H('#4aa04a') : H('#3f8f40');
      }
      case 'pista': {
        if (y < 3) return H('#3f8f40');
        if ((y - 3) % 9 === 0) return H('#f4f2ee');
        return (x + y) % 7 === 0 ? H('#b84a32') : H('#c85a3a');
      }
      case 'piscina': {
        if (y < 4) return y === 0 ? H('#f4f2ee') : H('#d8e8f0');
        const ola = Math.sin((x + f * 2) * 0.3 + y * 0.6);
        if ((y - 4) % 12 === 6 && (x % 8) < 5) return H((x / 8) % 2 < 1 ? '#e8455a' : '#f4f2ee');
        return ola > 0.75 ? H('#9ae0f8') : H('#4ab8e8');
      }
      case 'madera': default: {
        if (y === 0) return H('#5a3a22');
        return (Math.floor(x / 14) + Math.floor(y / 4)) % 2 ? H('#a8724a') : H('#9a663e');
      }
    }
  });
}

// ---------------------------------------------------------------- casas
const COLORES_CASA = ['#f4d8a0', '#a8d8c0', '#f0a8a0', '#a8c8f0', '#f4f2ee', '#f4c860', '#d8a8e0'];
function casa(v: string, _f: number, _w: number, seed: number): Raster {
  const r = rng(seed + 11);
  const pared = H(COLORES_CASA[Math.floor(r() * COLORES_CASA.length)]);
  if (v === 'edificio' || v === 'quinta' || v === 'tubo') {
    const w = v === 'tubo' ? 30 : v === 'quinta' ? 64 : 48, h = v === 'tubo' ? 96 : v === 'quinta' ? 52 : 110;
    const c = lienzo(w + 4, h + 10);
    rect(c, 2, 10, w, h, pared, 1);
    if (v === 'tubo') {
      // casa tubo de Saigón: angosta, balcones con matas y toldo
      for (let piso = 0; piso < 4; piso++) {
        const y = 14 + piso * 22;
        ventana(c, 8, y, 16, 10, H('#5a4a3a'), H('#7ab0d8'), true);
        rect(c, 4, y + 11, w - 4, 2, H('#6a6a70'), 1);
        for (let i = 6; i < w; i += 5) { pon(c, i, y + 10, H('#3fa04a'), 0); pon(c, i + 1, y + 9, H('#5ac060'), 0); }
      }
      rect(c, 2, 8, w, 3, H('#c84a3a'), 1);
    } else if (v === 'quinta') {
      poligono(c, [[0, 22], [w / 2 + 2, 6], [w + 4, 22]], H('#b84a32'), 1);
      for (let x = 2; x < w + 2; x += 3) pon(c, x, 21, H('#8a321e'), 0);
      ventana(c, 8, 28, 12, 14, H('#f4f2ee'), H('#6aa0c8'), true);
      ventana(c, w - 18, 28, 12, 14, H('#f4f2ee'), H('#6aa0c8'), true);
      rect(c, w / 2 - 4, 34, 10, h - 24, H('#7a4a2a'), 1);
      pon(c, w / 2 + 3, 46, H('#f4c430'), 0);
    } else {
      for (let piso = 0; piso < 6; piso++) for (let col = 0; col < 3; col++) ventana(c, 6 + col * 14, 16 + piso * 15, 10, 9, H('#5a6070'), H('#7ab8e0'));
      rect(c, 20, h - 4, 12, 14, H('#5a4a40'), 1);
      // tanque de agua en la azotea
      rect(c, 6, 4, 10, 6, H('#5a8ad8'), 1);
    }
    return fin(c);
  }
  // colonial venezolana: pared de color, techo de tejas, ventanas con reja, puerta de madera
  const w = v === 'tienda' ? 52 : 60, h = 40;
  const c = lienzo(w + 8, h + 22);
  rect(c, 4, 18, w, h, pared, 1);
  // zócalo
  rect(c, 4, 18 + h - 5, w, 5, sombra(sombra(pared)), 1);
  // techo de tejas que sobresale
  const teja = H(v === 'playa' ? '#c8a060' : '#b84a32');
  poligono(c, [[0, 20], [6, 8], [w + 2, 8], [w + 8, 20]], teja, 1);
  for (let y = 10; y < 20; y += 3) for (let x = 2 + (y % 2) * 2; x < w + 6; x += 4) pon(c, x, y, sombra(teja), 0);
  if (v === 'tienda') {
    // toldo a rayas y vitrina
    for (let x = 4; x < w + 4; x++) for (let y = 20; y < 26; y++) pon(c, x, y, Math.floor((x - 4) / 4) % 2 ? H('#f4f2ee') : H('#e8455a'), 1);
    for (let x = 4; x < w + 4; x += 4) pon(c, x + 1, 26, H('#e8455a'), 0);
    ventana(c, 8, 30, 26, 16, H('#5a4a3a'), H('#a8d8f0'));
    rect(c, w - 14, 30, 12, h - 12, H('#7a4a2a'), 1);
  } else {
    ventana(c, 9, 26, 12, 16, H('#f4f2ee'), H('#5a7aa0'), true);
    ventana(c, w - 18, 26, 12, 16, H('#f4f2ee'), H('#5a7aa0'), true);
    rect(c, w / 2 - 2, 28, 12, h - 10, H('#7a4a2a'), 1);
    rect(c, w / 2 - 1, 29, 10, 1, H('#5a321a'), 0);
    pon(c, w / 2 + 7, 42, H('#f4c430'), 0);
    // matas en la ventana
    for (let i = 0; i < 12; i += 2) { pon(c, 9 + i, 25, H('#3fa04a'), 0); pon(c, w - 18 + i, 25, H('#e8455a'), 0); }
  }
  return fin(c);
}
function kiosko(_v: string): Raster {
  const c = lienzo(34, 44);
  rect(c, 3, 16, 28, 26, H('#3fa8c8'), 1);
  poligono(c, [[0, 18], [17, 4], [34, 18]], H('#f4c430'), 1);
  rect(c, 7, 20, 20, 10, H('#a8d8f0'), 0);
  for (let i = 0; i < 5; i++) rect(c, 8 + i * 4, 23, 2, 6, H(['#e8455a', '#f4c430', '#3fbf6a', '#f29a3c', '#8a4fd8'][i]), 0);
  rect(c, 3, 31, 28, 2, H('#2a7a98'), 0);
  return fin(c);
}

// ---------------------------------------------------------------- naturaleza
function arbol(v: string, f: number, _w: number, seed: number): Raster {
  const mece = [0, 1, 0, -1][f % 4];
  if (v === 'palma') {
    const c = lienzo(44, 70);
    const tronco = H('#a8784a');
    for (let y = 18; y < 70; y++) { const x = 22 + Math.sin(y * 0.06) * 3 + (70 - y) * 0.03 * mece; rect(c, Math.round(x - 1.5), y, 3, 1, (y % 4) ? tronco : sombra(tronco), 1); }
    const hoja = H('#3fa04a');
    for (const [dx, dy, l] of [[-1, 0, 18], [1, 0, 18], [-1, -0.6, 14], [1, -0.6, 14], [-0.5, 0.5, 15], [0.6, 0.4, 15]] as [number, number, number][]) {
      for (let i = 0; i < l; i++) { const x = 22 + mece + dx * i, y = 18 + dy * i + (i * i) / 30; pon(c, x, y, i % 3 === 0 ? sombra(hoja) : hoja, 1); pon(c, x, y + 1, hoja, 1); }
    }
    elipse(c, 22 + mece, 20, 2.4, 2, H('#7a5a2a'), 1);
    return fin(c);
  }
  if (v === 'bambu') {
    const c = lienzo(24, 70);
    for (const x of [6, 12, 18]) for (let y = 6 + (x % 7); y < 70; y++) pon(c, x + (y < 30 ? mece : 0), y, y % 9 === 0 ? H('#5a8a3a') : H('#8ac05a'), 1);
    for (let i = 0; i < 12; i++) { const x = 4 + (i * 7) % 18 + mece, y = 8 + i * 4; rect(c, x, y, 4, 1, H('#5ab04a'), 1); }
    return fin(c);
  }
  if (v === 'pino') {
    const c = lienzo(32, 56);
    rect(c, 14, 44, 4, 12, H('#7a4a2a'), 1);
    for (let k = 0; k < 4; k++) poligono(c, [[16 + mece * 0.5, 2 + k * 10], [4 + k, 18 + k * 10], [28 - k, 18 + k * 10]], k % 2 ? H('#2f7a4a') : H('#3f8a5a'), 1);
    return fin(c);
  }
  if (v === 'matera') {
    const c = lienzo(16, 22);
    poligono(c, [[3, 13], [13, 13], [11, 21], [5, 21]], H('#c86a3a'), 1);
    for (let i = 0; i < 6; i++) elipse(c, 8 + Math.cos(i) * 3 + (i % 2 ? mece * 0.5 : 0), 9 - Math.sin(i) * 3, 2, 2, i % 2 ? H('#3fa04a') : H('#5ac060'), 1);
    pon(c, 6, 6, H('#e8455a'), 0); pon(c, 10, 8, H('#f4c430'), 0);
    return fin(c);
  }
  if (v === 'arbusto') {
    const c = lienzo(28, 16);
    for (let i = 0; i < 5; i++) elipse(c, 5 + i * 4.5, 10 - (i % 2) * 2, 5, 5, i % 2 ? H('#3f8f40') : H('#4aa04a'), 1);
    if (seed % 2) for (let i = 0; i < 4; i++) pon(c, 6 + i * 5, 6 + (i % 2) * 2, H('#e8455a'), 0);
    return fin(c);
  }
  // árbol frondoso: mango, samán o araguaney (amarillo, el árbol de Venezuela)
  const copa = v === 'araguaney' ? H('#f4c830') : v === 'mango' ? H('#2f8a3a') : H('#4a9a3a');
  const c = lienzo(56, 64);
  barra(c, 28, 63, 28, 34, 6, () => H('#7a4a2a'), 0);
  barra(c, 28, 44, 18, 32, 3, () => H('#7a4a2a'), 0);
  barra(c, 28, 42, 38, 30, 3, () => H('#7a4a2a'), 0);
  const r = rng(seed + 3);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, d = i ? 12 : 0;
    elipse(c, 28 + Math.cos(a) * d * 1.3 + mece * (i % 2), 24 + Math.sin(a) * d * 0.7, 11 + r() * 2, 9 + r() * 2, i % 3 === 0 ? sombra(copa) : copa, 1);
  }
  if (v === 'mango') for (let i = 0; i < 6; i++) elipse(c, 14 + r() * 28, 22 + r() * 16, 1.4, 1.8, H('#f2a03a'), 0);
  if (v === 'araguaney') for (let i = 0; i < 10; i++) pon(c, 10 + r() * 36, 12 + r() * 24, H('#fbe890'), 0);
  return fin(c);
}
function cosaCielo(v: string, f: number): Raster {
  if (v === 'sol') { const c = lienzo(28, 28); elipse(c, 14, 14, 8, 8, H('#f8d838'), 0); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + f * 0.1; pon(c, 14 + Math.cos(a) * 12, 14 + Math.sin(a) * 12, H('#f8e878'), 0); } return fin(sinContorno(c)); }
  const c = lienzo(48, 20);
  for (const [x, y, rad] of [[14, 12, 7], [24, 9, 9], [34, 12, 7]] as [number, number, number][]) elipse(c, x, y, rad * 1.2, rad * 0.8, H('#fbfdff'), 0);
  for (let x = 6; x < 42; x++) pon(c, x, 16, H('#dfe8f0'), 0);
  return fin(sinContorno(c));
}

// ---------------------------------------------------------------- vehículos
function vehiculo(v: string, f: number, _w: number, seed: number): Raster {
  const r = rng(seed + 5);
  const col = v === 'taxi' ? H('#f4c430') : v === 'buseta' ? H('#3fa8c8') : v === 'transmilenio' ? H('#d8202a') : H(COLORES_ROPA[Math.floor(r() * COLORES_ROPA.length)]);
  const rueda = (c: Capa, x: number, y: number, rad: number) => { elipse(c, x, y, rad, rad, H('#26272c'), 1); pon(c, x - 0.5, y - 0.5, H('#a8a8b0'), 0); pon(c, x + 0.5 + (f % 2 ? -1 : 0), y - 0.5, H('#8a8a90'), 0); };
  if (v === 'moto') {
    const c = lienzo(28, 20);
    barra(c, 6, 14, 22, 14, 3, () => col, 0);
    poligono(c, [[8, 13], [12, 6], [16, 6], [18, 13]], col, 1);
    rect(c, 9, 5, 7, 2, H('#26272c'), 1);
    barra(c, 20, 13, 22, 4, 1, () => H('#5a5a60'), 0);
    rueda(c, 6, 16, 3); rueda(c, 22, 16, 3);
    return fin(c);
  }
  if (v === 'bicicleta') {
    const c = lienzo(26, 18);
    for (const x of [6, 20]) { for (let a = 0; a < 16; a++) pon(c, x + Math.cos(a / 2.5) * 4, 12 + Math.sin(a / 2.5) * 4, H('#26272c'), 0); }
    barra(c, 6, 12, 13, 6, 1, () => col, 0); barra(c, 13, 6, 20, 12, 1, () => col, 0); barra(c, 6, 12, 14, 12, 1, () => col, 0); barra(c, 18, 4, 20, 12, 1, () => col, 0);
    return fin(c);
  }
  if (v === 'buseta' || v === 'transmilenio') {
    const L = v === 'transmilenio' ? 96 : 64;
    const c = lienzo(L + 4, 36);
    rect(c, 2, 4, L, 24, col, 1);
    for (let x = 8; x < L - 8; x += 12) ventana(c, x, 8, 10, 9, H('#26272c'), H('#9ad0f0'));
    rect(c, L - 6, 8, 6, 12, H('#9ad0f0'), 0);
    rect(c, 2, 22, L, 2, v === 'buseta' ? H('#f4f2ee') : H('#8a1414'), 0);
    if (v === 'buseta') for (let x = 6; x < L; x += 6) pon(c, x, 25, H('#f4c430'), 0);
    rueda(c, 14, 29, 5); rueda(c, L - 12, 29, 5); if (L > 70) rueda(c, L / 2, 29, 5);
    return fin(c);
  }
  // carro (sedan) y taxi
  const c = lienzo(52, 26);
  poligono(c, [[2, 18], [4, 11], [14, 10], [20, 3], [36, 3], [42, 10], [50, 12], [50, 19], [2, 19]], col, 1);
  poligono(c, [[21, 5], [27, 5], [27, 10], [16, 10]], H('#9ad0f0'), 0);
  poligono(c, [[29, 5], [35, 5], [40, 10], [29, 10]], H('#9ad0f0'), 0);
  rect(c, 3, 13, 47, 1, sombra(col), 0);
  pon(c, 49, 13, H('#f8e878'), 0); pon(c, 3, 13, H('#e8455a'), 0);
  if (v === 'taxi') { rect(c, 24, 0, 8, 3, H('#26272c'), 1); }
  rueda(c, 13, 20, 4); rueda(c, 40, 20, 4);
  return fin(c);
}

// ---------------------------------------------------------------- muelle y mar
function barco(v: string, f: number, _w: number, seed: number, gente = true): Raster {
  const bob = f % 2;
  if (v === 'penero') {
    // el peñero: lancha de pescadores pintada de colores, con su nombre
    const c = lienzo(80, 34);
    const r = rng(seed + 9);
    const casco = H(['#f4f2ee', '#f4c430', '#3fa8c8'][Math.floor(r() * 3)]);
    poligono(c, [[2, 14 + bob], [78, 10 + bob], [70, 30 + bob], [10, 30 + bob]], casco, 1);
    rect(c, 6, 18 + bob, 68, 2, H('#e8455a'), 0);
    rect(c, 8, 22 + bob, 64, 2, H('#2f6fd8'), 0);
    rect(c, 64, 6 + bob, 8, 6, H('#5a5a60'), 1); // motor fuera de borda
    return fin(c);
  }
  // el barco grande del muelle (como el del video): casco rosado, ventanas redondas y la chimenea
  const W = 140, Hh = 74;
  const c = lienzo(W, Hh);
  const cas = H('#e8a0a8');
  poligono(c, [[0, 40 + bob], [W - 2, 40 + bob], [W - 12, Hh - 2 + bob], [10, Hh - 2 + bob]], H('#f4f2ee'), 1);
  rect(c, 6, 48 + bob, W - 16, 3, H('#c84a5a'), 0);
  rect(c, 10, 18 + bob, 90, 22, cas, 1);
  for (let x = 16; x < 96; x += 14) { elipse(c, x, 26 + bob, 3, 3, H('#3a2a2a'), 0); pon(c, x - 1, 25 + bob, H('#7a6a6a'), 0); }
  rect(c, 30, 0 + bob, 14, 18, H('#8a9a8a'), 1);
  rect(c, 30, 3 + bob, 14, 2, H('#c84a5a'), 0);
  for (let x = 12; x < 98; x += 3) pon(c, x, 17 + bob, H('#f4f2ee'), 0);
  const img = fin(c);
  if (!gente) return img;
  // público chibi asomado en la cubierta (como en el video)
  const fila = publico('barco', f, 84, seed + 2, 3);
  for (let y = 0; y < fila.h; y++) for (let x = 0; x < fila.w; x++) {
    const si = (y * fila.w + x) * 4;
    if (!fila.data[si + 3]) continue;
    const ty = y + 36 + bob - fila.h + 6, tx = x + 12;
    if (ty < 0 || tx >= W || ty >= 40 + bob) continue;
    const di = (ty * W + tx) * 4;
    img.data.set(fila.data.subarray(si, si + 4), di);
  }
  return img;
}
function muelle(v: string, f: number): Raster {
  if (v === 'bita') { const c = lienzo(12, 10); rect(c, 3, 3, 6, 7, H('#a8a8b0'), 1); elipse(c, 6, 3, 4, 1.6, H('#c8c8d0'), 1); return fin(c); }
  if (v === 'barril') { const c = lienzo(16, 20); rect(c, 2, 1, 12, 19, H('#a8683a'), 1); for (const y of [4, 15]) rect(c, 2, y, 12, 1, H('#5a5a60'), 0); rect(c, 3, 1, 2, 19, luz(H('#a8683a')), 0); return fin(c); }
  if (v === 'caja') { const c = lienzo(18, 16); rect(c, 1, 1, 16, 15, H('#c89a5a'), 1); barra(c, 2, 2, 16, 15, 1, () => H('#9a6a3a'), 0); rect(c, 1, 1, 16, 1, H('#9a6a3a'), 0); return fin(c); }
  if (v === 'salvavidas') { const c = lienzo(14, 14); elipse(c, 7, 7, 6, 6, H('#e8455a'), 1); elipse(c, 7, 7, 2.5, 2.5, VACIO, 0); for (const [x, y] of [[7, 1], [7, 12], [1, 7], [12, 7]]) pon(c, x, y, H('#f4f2ee'), 0); return fin(c); }
  if (v === 'poste') { const c = lienzo(8, 30); rect(c, 2, 0, 5, 30, H('#8a5a32'), 1); for (let y = 6; y < 12; y++) pon(c, 2 + (y % 2) * 4, y, H('#e8d8a0'), 0); return fin(c); }
  // pelícano o gaviota que vuela
  const c = lienzo(18, 10);
  const ala = [0, -2, -3, -1][f % 4];
  barra(c, 2, 4 + ala, 8, 5, 1, () => H(v === 'pelicano' ? '#8a8078' : '#f4f2ee'), 0);
  barra(c, 10, 5, 16, 4 + ala, 1, () => H(v === 'pelicano' ? '#8a8078' : '#f4f2ee'), 0);
  elipse(c, 9, 6, 2.4, 1.6, H(v === 'pelicano' ? '#a8a098' : '#f4f2ee'), 0);
  if (v === 'pelicano') barra(c, 11, 6, 16, 7, 1, () => H('#f2a03a'), 0);
  return fin(c);
}

// ---------------------------------------------------------------- adentro de la casa
function adentro(v: string, f: number): Raster {
  switch (v) {
    case 'cocina': {
      const c = lienzo(34, 52);
      rect(c, 1, 22, 32, 30, H('#f4f2ee'), 1);
      rect(c, 3, 34, 28, 14, H('#2a2a30'), 1); rect(c, 5, 36, 24, 10, H('#4a4a50'), 0);
      for (const x of [9, 25]) { elipse(c, x, 23, 4, 1, H('#2a2a30'), 0); }
      // la olla con vapor
      rect(c, 4, 15, 12, 8, H('#a8a8b8'), 1); rect(c, 3, 15, 14, 1, H('#c8c8d0'), 0);
      for (let i = 0; i < 3; i++) { const y = 12 - ((f * 2 + i * 4) % 12); elipse(c, 8 + i * 2 + ((f + i) % 2), y, 1.6, 1.2, H('#f4f8ff'), 0); }
      // el budare con arepas
      elipse(c, 25, 21, 6, 1.6, H('#2a2a30'), 1); elipse(c, 23, 19.5, 2.4, 1, H('#f2d79a'), 0); elipse(c, 28, 19.5, 2.4, 1, H('#e8c87a'), 0);
      return fin(c);
    }
    case 'nevera': { const c = lienzo(22, 48); rect(c, 1, 1, 20, 47, H('#e8ecf0'), 1); rect(c, 1, 18, 20, 1, H('#a8b0b8'), 0); rect(c, 17, 6, 1, 8, H('#8a9098'), 0); rect(c, 17, 22, 1, 12, H('#8a9098'), 0); pon(c, 5, 8, H('#e8455a'), 0); pon(c, 7, 9, H('#f4c430'), 0); return fin(c); }
    case 'meson': { const c = lienzo(46, 26); rect(c, 1, 6, 44, 20, H('#c89a5a'), 1); rect(c, 0, 4, 46, 3, H('#e8e0d0'), 1); for (const x of [6, 22, 38]) rect(c, x, 10, 1, 12, H('#9a6a3a'), 0); elipse(c, 12, 2, 4, 2, H('#f2d79a'), 1); elipse(c, 20, 2.5, 3, 1.6, H('#e8455a'), 1); return fin(c); }
    case 'mesa': { const c = lienzo(36, 22); rect(c, 0, 4, 36, 3, H('#a8683a'), 1); rect(c, 3, 7, 3, 15, H('#8a5a32'), 1); rect(c, 30, 7, 3, 15, H('#8a5a32'), 1); elipse(c, 12, 2.5, 4, 1.4, H('#f4f2ee'), 0); elipse(c, 24, 2.5, 3, 1.4, H('#f2d79a'), 0); pon(c, 30, 1, H('#5a3a22'), 0); pon(c, 30, 2, H('#5a3a22'), 0); return fin(c); }
    case 'silla': { const c = lienzo(14, 26); rect(c, 2, 0, 3, 26, H('#8a5a32'), 1); rect(c, 2, 13, 11, 3, H('#a8683a'), 1); rect(c, 10, 16, 3, 10, H('#8a5a32'), 1); for (let y = 2; y < 12; y += 3) rect(c, 2, y, 3, 1, H('#c8885a'), 0); return fin(c); }
    case 'ventana': { const c = lienzo(30, 30); rect(c, 1, 1, 28, 28, H('#f4f2ee'), 1); rect(c, 3, 3, 24, 24, H('#8ccaf8'), 0); for (let x = 3; x < 27; x++) { const y = 20 - Math.round(Math.sin(x / 5) * 4); for (let yy = y; yy < 27; yy++) pon(c, x, yy, H('#3f8a5a'), 0); } rect(c, 14, 3, 2, 24, H('#f4f2ee'), 0); rect(c, 3, 14, 24, 2, H('#f4f2ee'), 0); return fin(c); }
    case 'cuadro': { const c = lienzo(20, 16); rect(c, 0, 0, 20, 16, H('#c8a040'), 1); rect(c, 2, 2, 16, 12, H('#f4e8c8'), 0); elipse(c, 10, 8, 3, 3, H('#e8a0a8'), 0); pon(c, 9, 7, H('#141014'), 0); pon(c, 11, 7, H('#141014'), 0); return fin(c); }
    case 'hamaca': {
      const c = lienzo(56, 30);
      const s = [0, 1, 0, -1][f % 4];
      rect(c, 0, 0, 3, 30, H('#8a5a32'), 1); rect(c, 53, 0, 3, 30, H('#8a5a32'), 1);
      for (let x = 3; x < 53; x++) { const y = 6 + Math.sin(((x - 3) / 50) * Math.PI) * 14 + s * Math.sin(((x - 3) / 50) * Math.PI); for (let j = 0; j < 3; j++) pon(c, x + s, y + j, [H('#e8455a'), H('#f4c430'), H('#3fa8c8')][Math.floor(x / 5) % 3], 1); }
      return fin(c);
    }
    case 'sofa': { const c = lienzo(50, 26); rect(c, 2, 4, 46, 14, H('#5a7ad8'), 1); rect(c, 0, 10, 6, 14, H('#4a6ac8'), 1); rect(c, 44, 10, 6, 14, H('#4a6ac8'), 1); rect(c, 6, 14, 38, 8, H('#6a8ae8'), 1); return fin(c); }
    case 'tele': { const c = lienzo(30, 24); rect(c, 1, 1, 28, 18, H('#26272c'), 1); rect(c, 3, 3, 24, 14, f % 2 ? H('#5ac8ff') : H('#4ab8f0'), 0); rect(c, 12, 19, 6, 5, H('#26272c'), 1); return fin(c); }
    case 'lampara': default: { const c = lienzo(14, 40); poligono(c, [[2, 12], [7, 1], [12, 12]], H('#f4e8a0'), 1); rect(c, 6, 12, 2, 26, H('#5a5a60'), 1); rect(c, 3, 37, 8, 3, H('#5a5a60'), 1); return fin(c); }
  }
}

// ---------------------------------------------------------------- calle
function calle(v: string, f: number): Raster {
  switch (v) {
    case 'farol': { const c = lienzo(14, 56); rect(c, 6, 10, 2, 46, H('#3a3a44'), 1); rect(c, 3, 2, 8, 8, H('#3a3a44'), 1); rect(c, 4, 3, 6, 6, f % 2 ? H('#f8e878') : H('#f4d850'), 0); rect(c, 4, 53, 6, 3, H('#3a3a44'), 1); return fin(c); }
    case 'banco': { const c = lienzo(34, 16); rect(c, 0, 6, 34, 3, H('#a8683a'), 1); rect(c, 0, 1, 34, 3, H('#a8683a'), 1); rect(c, 3, 9, 2, 7, H('#3a3a44'), 1); rect(c, 29, 9, 2, 7, H('#3a3a44'), 1); return fin(c); }
    case 'semaforo': { const c = lienzo(12, 50); rect(c, 5, 18, 2, 32, H('#3a3a44'), 1); rect(c, 2, 0, 8, 18, H('#26272c'), 1); const on = Math.floor(f / 1) % 3; [H('#e8455a'), H('#f4c430'), H('#3fbf6a')].forEach((col, i) => elipse(c, 6, 3.5 + i * 5, 2, 2, on === i ? col : mezcla(col, H('#26272c'), 0.7), 0)); return fin(c); }
    case 'poste': { const c = lienzo(40, 70); rect(c, 19, 0, 3, 70, H('#8a7a6a'), 1); rect(c, 8, 6, 24, 2, H('#6a5a4a'), 1); for (let x = 0; x < 40; x++) { pon(c, x, 10 + Math.round(Math.sin(x / 13) * 2), H('#26272c'), 0); pon(c, x, 16 + Math.round(Math.sin(x / 13 + 1) * 2), H('#26272c'), 0); } return fin(c); }
    case 'farolitos': {
      const c = lienzo(72, 22);
      for (let x = 0; x < 72; x++) pon(c, x, 3 + Math.round(Math.sin((x / 72) * Math.PI) * 5), H('#26272c'), 0);
      for (let i = 0; i < 6; i++) { const x = 6 + i * 12, y = 5 + Math.round(Math.sin((x / 72) * Math.PI) * 5) + ((f + i) % 2); elipse(c, x, y + 5, 3, 4, i % 2 ? H('#e8455a') : H('#f4c430'), 1); rect(c, x - 1, y, 2, 1, H('#26272c'), 0); }
      return fin(c);
    }
    case 'puesto': {
      // puesto de comida: arepera o carrito de phở
      const c = lienzo(46, 46);
      for (let x = 0; x < 46; x++) for (let y = 4; y < 12; y++) pon(c, x, y, Math.floor(x / 5) % 2 ? H('#f4f2ee') : H('#f29a3c'), 1);
      rect(c, 3, 12, 2, 18, H('#5a5a60'), 1); rect(c, 41, 12, 2, 18, H('#5a5a60'), 1);
      rect(c, 1, 28, 44, 16, H('#3fa8c8'), 1); rect(c, 0, 26, 46, 3, H('#c8c8d0'), 1);
      for (let i = 0; i < 3; i++) elipse(c, 10 + i * 9, 24, 3, 1.6, H('#f2d79a'), 1);
      for (let i = 0; i < 2; i++) elipse(c, 36 + ((f + i) % 2), 20 - i * 4 - (f % 2), 1.5, 1.2, H('#f4f8ff'), 0);
      return fin(c);
    }
    case 'letrero': { const c = lienzo(40, 30); rect(c, 4, 12, 2, 18, H('#5a5a60'), 1); rect(c, 34, 12, 2, 18, H('#5a5a60'), 1); rect(c, 0, 0, 40, 14, H('#2f7d4a'), 1); for (let x = 4; x < 36; x += 4) rect(c, x, 5, 2, 4, H('#f4f2ee'), 0); return fin(c); }
    case 'bandera_ve': case 'bandera_co': case 'bandera_vn': default: {
      const c = lienzo(30, 46);
      rect(c, 1, 0, 2, 46, H('#a8a8b0'), 1);
      const bandas = v === 'bandera_co' ? ['#f4c430', '#f4c430', '#2f4ab8', '#d8202a'] : v === 'bandera_vn' ? ['#d8202a', '#d8202a', '#d8202a'] : ['#f4c430', '#2f4ab8', '#d8202a'];
      for (let x = 0; x < 24; x++) for (let y = 0; y < 15; y++) {
        const ola = Math.round(Math.sin((x + f * 3) * 0.4) * 1.2 * (x / 24));
        const b = bandas[Math.min(bandas.length - 1, Math.floor((y / 15) * bandas.length))];
        let col = H(b);
        if (v === 'bandera_vn' && Math.hypot(x - 11, y - 7) < 3.5 && (Math.abs(x - 11) + Math.abs(y - 7)) < 4) col = H('#f4d838');
        if ((v === 'bandera_ve' || !v.startsWith('bandera')) && y >= 5 && y < 10 && Math.hypot(x - 12, (y - 9) * 1.6) > 3.5 && Math.hypot(x - 12, (y - 9) * 1.6) < 5.2 && (x + y) % 2 === 0) col = H('#f4f2ee');
        pon(c, x + 3, y + 1 + ola, col, 0);
      }
      return fin(c);
    }
  }
}

// ---------------------------------------------------------------- deporte
function deporte(v: string, f: number): Raster {
  switch (v) {
    case 'arco': { const c = lienzo(28, 40); rect(c, 0, 0, 28, 3, H('#f4f2ee'), 1); rect(c, 0, 0, 3, 40, H('#f4f2ee'), 1); for (let y = 4; y < 40; y += 3) for (let x = 4; x < 28; x++) pon(c, x, y, H('#d8dce0'), 0); for (let x = 5; x < 28; x += 3) for (let y = 3; y < 40; y++) pon(c, x, y, H('#d8dce0'), 0); return fin(c); }
    case 'balon': { const c = lienzo(10, 10); elipse(c, 5, 5, 4, 4, H('#f4f2ee'), 0); const a = f * 0.8; for (let i = 0; i < 3; i++) pon(c, 5 + Math.cos(a + i * 2.1) * 2, 5 + Math.sin(a + i * 2.1) * 2, H('#141014'), 0); pon(c, 5, 5, H('#141014'), 0); return fin(c); }
    case 'cono': { const c = lienzo(12, 14); poligono(c, [[6, 0], [11, 12], [1, 12]], H('#f29a3c'), 1); rect(c, 3, 6, 6, 2, H('#f4f2ee'), 0); rect(c, 0, 12, 12, 2, H('#f29a3c'), 1); return fin(c); }
    case 'valla': { const c = lienzo(24, 20); rect(c, 0, 0, 24, 4, H('#f4f2ee'), 1); for (let x = 0; x < 24; x += 6) rect(c, x, 0, 3, 4, H('#141014'), 0); rect(c, 2, 4, 2, 16, H('#a8a8b0'), 1); rect(c, 20, 4, 2, 16, H('#a8a8b0'), 1); return fin(c); }
    case 'trampolin': { const c = lienzo(40, 40); rect(c, 0, 10, 6, 30, H('#a8a8b0'), 1); const s = f % 2; for (let x = 0; x < 40; x++) pon(c, x, 10 + Math.round((x / 40) ** 2 * 2 * s), H('#2f6fd8'), 1), pon(c, x, 11 + Math.round((x / 40) ** 2 * 2 * s), H('#2f6fd8'), 1); return fin(c); }
    case 'banderin': { const c = lienzo(12, 26); rect(c, 1, 0, 1, 26, H('#f4f2ee'), 1); for (let y = 0; y < 6; y++) for (let x = 0; x < 8 - y; x++) pon(c, 2 + x, y + ((f + x) % 3 === 0 ? 1 : 0), H('#f4c430'), 0); return fin(c); }
    case 'marcador': { const c = lienzo(56, 30); rect(c, 0, 0, 56, 22, H('#26272c'), 1); rect(c, 26, 22, 4, 8, H('#5a5a60'), 1); for (const x of [6, 36]) for (let i = 0; i < 2; i++) rect(c, x + i * 7, 6, 5, 10, H('#f29a3c'), 0); return fin(c); }
    case 'gradas': default: return publico('gradas', f, 160, 5, 4);
  }
}

// ---------------------------------------------------------------- gente: público chibi y animales
const lookAzar = (r: () => number): ChibiLook => {
  const l = defaultLook();
  l.piel = PIELES[Math.floor(r() * PIELES.length)];
  l.pelo = { estilo: PEINADOS[Math.floor(r() * 12)], color: COLORES_PELO[Math.floor(r() * 7)] };
  l.arriba = { estilo: r() < 0.5 ? 'franela' : r() < 0.5 ? 'vinotinto' : 'polo', color: COLORES_ROPA[Math.floor(r() * COLORES_ROPA.length)], color2: '#f4f2ee' };
  l.boca = r() < 0.5 ? 'sonrisa' : 'abierta';
  l.contextura = r() < 0.2 ? 'nino' : r() < 0.5 ? 'mujer' : 'adulto';
  if (r() < 0.25) l.gorro = { estilo: r() < 0.5 ? 'gorra' : 'paja', color: COLORES_ROPA[Math.floor(r() * COLORES_ROPA.length)] };
  return l;
};
/** Fila de público chibi saludando y celebrando (el del barco del video). `filas` = filas de gradas. */
export function publico(v: string, f: number, w: number, seed: number, filas = 1): Raster {
  const talla: Talla = 32;
  const r = rng(seed + 77);
  const paso = v === 'barco' ? 15 : 13;
  const alto = v === 'gradas' ? 26 + (filas - 1) * 14 : 30;
  const out = createRaster(w, alto);
  if (v === 'gradas') {
    for (let k = 0; k < filas; k++) for (let x = 0; x < w; x++) { const y = alto - 3 - k * 14; for (let j = 0; j < 3; j++) { const i = ((y + j) * w + x) * 4; out.data.set([168, 168, 176, 255], i); } }
  }
  const celebrar = clipHumano('celebrar_frente'), saludar = clipHumano('saludar_s'), quieto = clipHumano('quieto_s');
  for (let k = filas - 1; k >= 0; k--) {
    for (let x0 = 2 + (k % 2) * 6; x0 < w - 8; x0 += paso) {
      const look = lookAzar(r);
      const anim = r() < 0.4 ? celebrar : r() < 0.6 ? saludar : quieto;
      const cuadros = pintarClip(look, talla, anim);
      const q = cuadros[(f + Math.floor(r() * 4)) % cuadros.length];
      const img = q.img;
      // recorta la mitad de arriba del muñeco (el de atrás de la baranda se ve de la cintura para arriba)
      const oy = v === 'gradas' ? alto - 4 - k * 14 - 30 : alto - 30 - (q.dy > 0 ? 2 : 0);
      for (let y = 10; y < 40; y++) for (let x = 12; x < 36; x++) {
        const si = (y * img.w + x) * 4;
        if (!img.data[si + 3]) continue;
        const tx = x0 + x - 18, ty = oy + y - 10;
        if (tx < 0 || ty < 0 || tx >= w || ty >= alto) continue;
        if (v === 'gradas' && ty > alto - 3 - k * 14) continue;
        out.data.set(img.data.subarray(si, si + 4), (ty * w + tx) * 4);
      }
    }
  }
  return out;
}
function animal(v: string, f: number): Raster {
  if (v === 'gato') { const c = lienzo(18, 14); elipse(c, 8, 9, 6, 3.5, H('#f29a3c'), 1); elipse(c, 14, 6, 3, 3, H('#f29a3c'), 1); pon(c, 13, 2, H('#f29a3c'), 1); pon(c, 16, 2, H('#f29a3c'), 1); pon(c, 13, 6, H('#141014'), 0); pon(c, 15, 6, H('#141014'), 0); barra(c, 2, 9, 1, 3 + (f % 2), 1, () => H('#f29a3c'), 0); return fin(c); }
  if (v === 'gallina') { const c = lienzo(14, 14); elipse(c, 7, 8, 5, 4, H('#f4f2ee'), 1); elipse(c, 10, 4 + (f % 2), 2.5, 2.5, H('#f4f2ee'), 1); pon(c, 10, 1 + (f % 2), H('#e8455a'), 0); pon(c, 13, 4 + (f % 2), H('#f2a03a'), 0); pon(c, 11, 4 + (f % 2), H('#141014'), 0); rect(c, 6, 12, 1, 2, H('#f2a03a'), 0); rect(c, 8, 12, 1, 2, H('#f2a03a'), 0); return fin(c); }
  // paloma
  const c = lienzo(14, 10); elipse(c, 6, 6, 4, 2.6, H('#8a90a0'), 1); elipse(c, 10, 4 - (f % 2), 2, 2, H('#7a8090'), 1); pon(c, 10, 3 - (f % 2), H('#141014'), 0); pon(c, 12, 4 - (f % 2), H('#f2a03a'), 0); return fin(c);
}

/** Paredes de adentro (cocina con azulejos, muro del patio con rejas). */
function paredFondo(v: string, w: number): Raster {
  const h = v === 'patio' ? 40 : 156;
  const r = createRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c: [number, number, number];
    if (v === 'patio') {
      const reja = y > 4 && y < 30 && x % 6 === 0;
      c = y < 3 ? [200, 140, 90] : reja ? [40, 40, 48] : y >= 30 ? [214, 196, 168] : [0, 0, 0];
      if (!reja && y >= 3 && y < 30) continue;
    } else {
      // azulejos de abajo y pintura arriba
      if (y > 70) c = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 ? [236, 230, 214] : [212, 232, 222];
      else c = y === 70 ? [168, 120, 80] : [244, 214, 160];
      if (y > 70 && (x % 10 === 0 || y % 10 === 0)) c = [190, 186, 176];
    }
    r.data.set([...c, 255], (y * w + x) * 4);
  }
  return r;
}


// ---------------------------------------------------------------- catálogo
export const ASSETS: AssetDef[] = [
  { id: 'cielo', nombre: ['Cielo', 'Sky'], cat: 'fondos', variantes: ['dia', 'tarde', 'noche', 'nublado'], cuadros: 4, t: 30, ancho: true, pintar: (v, f, w) => cielo(v, f, w) },
  { id: 'montana', nombre: ['Montaña', 'Mountain'], cat: 'fondos', variantes: ['avila', 'monserrate', 'lejanas', 'islas'], cuadros: 1, t: 60, ancho: true, pintar: (v, f, w) => montana(v, f, w) },
  { id: 'ciudad', nombre: ['Ciudad lejana', 'City skyline'], cat: 'fondos', variantes: ['caracas', 'hcm', 'bogota'], cuadros: 2, t: 40, ancho: true, pintar: (v, f, w) => skyline(v, f, w) },
  { id: 'mar', nombre: ['Mar', 'Sea'], cat: 'fondos', variantes: ['dia', 'tarde', 'noche'], cuadros: 4, t: 10, ancho: true, pintar: (v, f, w) => mar(v, f, w) },
  { id: 'pared', nombre: ['Pared', 'Wall'], cat: 'fondos', variantes: ['cocina', 'patio'], cuadros: 1, t: 60, ancho: true, pintar: (v, _f, w) => paredFondo(v, w) },
  { id: 'piso', nombre: ['Piso', 'Floor'], cat: 'pisos', variantes: ['muelle', 'calle', 'baldosa', 'patio', 'madera', 'cancha', 'pista', 'piscina'], cuadros: 4, t: 10, ancho: true, pintar: (v, f, w) => piso(v, f, w) },
  { id: 'casa', nombre: ['Casa', 'House'], cat: 'casas', variantes: ['colonial', 'playa', 'tienda', 'quinta', 'edificio', 'tubo'], cuadros: 1, t: 60, pintar: (v, f, w, s) => casa(v, f, w, s) },
  { id: 'kiosko', nombre: ['Kiosko', 'Kiosk'], cat: 'casas', variantes: ['normal'], cuadros: 1, t: 60, pintar: (v) => kiosko(v) },
  { id: 'arbol', nombre: ['Árbol', 'Tree'], cat: 'naturaleza', variantes: ['mango', 'araguaney', 'saman', 'palma', 'pino', 'bambu', 'arbusto', 'matera'], cuadros: 4, t: 18, pintar: (v, f, w, s) => arbol(v, f, w, s) },
  { id: 'cielo_cosa', nombre: ['Nube y sol', 'Cloud & sun'], cat: 'naturaleza', variantes: ['nube', 'sol'], cuadros: 2, t: 30, pintar: (v, f) => cosaCielo(v, f) },
  { id: 'vehiculo', nombre: ['Vehículo', 'Vehicle'], cat: 'vehiculos', variantes: ['carro', 'taxi', 'buseta', 'transmilenio', 'moto', 'bicicleta'], cuadros: 2, t: 6, pintar: (v, f, w, s) => vehiculo(v, f, w, s) },
  { id: 'barco', nombre: ['Barco', 'Boat'], cat: 'muelle', variantes: ['grande', 'penero'], cuadros: 4, t: 14, pintar: (v, f, w, s) => barco(v, f, w, s) },
  { id: 'muelle', nombre: ['Cosas del muelle', 'Dock props'], cat: 'muelle', variantes: ['bita', 'barril', 'caja', 'salvavidas', 'poste'], cuadros: 1, t: 60, pintar: (v, f) => muelle(v, f) },
  { id: 'ave', nombre: ['Ave', 'Bird'], cat: 'muelle', variantes: ['pelicano', 'gaviota'], cuadros: 4, t: 8, pintar: (v, f) => muelle(v, f) },
  { id: 'adentro', nombre: ['Mueble', 'Furniture'], cat: 'adentro', variantes: ['cocina', 'nevera', 'meson', 'mesa', 'silla', 'ventana', 'cuadro', 'hamaca', 'sofa', 'tele', 'lampara'], cuadros: 4, t: 12, pintar: (v, f) => adentro(v, f) },
  { id: 'calle', nombre: ['Cosas de la calle', 'Street props'], cat: 'calle', variantes: ['farol', 'banco', 'semaforo', 'poste', 'farolitos', 'puesto', 'letrero', 'bandera_ve', 'bandera_co', 'bandera_vn'], cuadros: 3, t: 20, pintar: (v, f) => calle(v, f) },
  { id: 'deporte', nombre: ['Deporte', 'Sports'], cat: 'deporte', variantes: ['arco', 'balon', 'cono', 'valla', 'trampolin', 'banderin', 'marcador', 'gradas'], cuadros: 2, t: 16, pintar: (v, f) => deporte(v, f) },
  { id: 'publico', nombre: ['Público chibi', 'Chibi crowd'], cat: 'gente', variantes: ['baranda', 'gradas'], cuadros: 4, t: 12, pintar: (v, f, _w, s) => publico(v === 'gradas' ? 'gradas' : 'baranda', f, 120, s, v === 'gradas' ? 3 : 1) },
  { id: 'animal', nombre: ['Animal', 'Animal'], cat: 'gente', variantes: ['gato', 'gallina', 'paloma'], cuadros: 2, t: 20, pintar: (v, f) => animal(v, f) },
];

export function asset(id: string): AssetDef {
  const a = ASSETS.find((x) => x.id === id);
  if (!a) throw new Error(`No hay asset "${id}"`);
  return a;
}

const cacheA = new Map<string, Raster>();
/** Cuadro de un asset (con caché). */
export function pintarAsset(id: string, v: string, f: number, w = 0, seed = 1): Raster {
  const a = asset(id);
  const ff = f % a.cuadros;
  const key = `${id}|${v}|${ff}|${a.ancho ? w : 0}|${seed}`;
  let r = cacheA.get(key);
  if (!r) {
    r = a.pintar(v, ff, w, seed);
    cacheA.set(key, r);
    if (cacheA.size > 900) cacheA.delete(cacheA.keys().next().value!);
  }
  return r;
}
