/**
 * Gorros propios de PixelForja, dibujados con código sobre las cabezas LPC (que no los traen): el nón lá vietnamita, el
 * sombrero vueltiao, la gorra de béisbol, el casco de ciclista, el sombrero de gaitero zuliano y los rolos (el catálogo
 * C4 del pedido), la máscara de la Marimonda del Carnaval de Barranquilla (lote E5) y la ponchera de frutas de la palenquera
 * de Cartagena con su pañuelo (lote E6). Van en el cuadro de 64 de LPC,
 * apoyados en la cima del pelo, de frente, de lado y de espalda. Se piden en `hat` como cualquier gorro LPC.
 */

export const GORROS_PROPIOS = ['non_la', 'vueltiao', 'gorra_beisbol', 'casco_ciclista', 'sombrero_gaitero', 'rolos', 'marimonda', 'ponchera', 'mascara_circulo', 'mascara_triangulo', 'mascara_cuadrado', 'mascara_front_man'] as const;
export type GorroPropio = (typeof GORROS_PROPIOS)[number];
export const esGorroPropio = (h: string | null | undefined): h is GorroPropio => !!h && (GORROS_PROPIOS as readonly string[]).includes(h);

export interface Caja { x: number; y: number; w: number; h: number }
export interface PixelGorro { x: number; y: number; hex: string; atras?: boolean }

/** Una rampa de 4 tonos (oscuro, sombra, base, luz) a partir de un color, sin librerías: mezcla con negro y blanco. */
function rampa(hex: string): [string, string, string, string] {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mix = (t: number, to: number) => '#' + c.map((v) => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('');
  return [mix(0.6, 0), mix(0.28, 0), hex, mix(0.35, 255)];
}

/**
 * Los pixeles del gorro para una dirección (`down` de frente, `right` de lado mirando a la derecha, `up` de espalda).
 * `cab` es la caja de la cabeza LPC: x y ancho de la cabeza (sin pelo), y de la cima del pelo y alto hasta la barbilla.
 * `color` es el del gorro (sin valor, el de siempre de cada uno).
 */
export function pixelesGorro(id: GorroPropio, dir: 'down' | 'right' | 'up', cab: Caja, color?: string | null): PixelGorro[] {
  const out: PixelGorro[] = [];
  const put = (x: number, y: number, hex: string, atras = false) => out.push({ x: Math.round(x), y: Math.round(y), hex, atras });
  const cx = cab.x + cab.w / 2 - 0.5, top = cab.y, w = cab.w;
  const tinta = '#1e1418';

  if (id === 'non_la') {
    // el sombrero cónico de hoja: punta arriba, anillos de la trama y el ala ancha abajo
    const [o, s, b, l] = rampa(color ?? '#e6c77a');
    const alto = 12, ala = w / 2 + 5, base = top + 6;
    for (let j = 0; j <= alto; j++) {
      const hw = Math.max(0.5, (j / alto) * ala), y = base - alto + j;
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const borde = x <= cx - hw + 0.5 || x >= cx + hw - 0.5;
        const lado = x < cx ? l : x > cx + 1 ? s : b;
        put(x, y, j === alto ? o : borde ? o : j % 3 === 2 ? s : dir === 'right' ? (x < cx ? l : b) : lado);
      }
    }
    return out;
  }
  if (id === 'casco_ciclista') {
    // casco de ciclista: media cúpula con las ranuras de aire y la visera corta adelante
    const [o, s, b, l] = rampa(color ?? '#e8483a');
    const rx = w / 2 + 1, ry = 7, cy = top + 6;
    for (let y = cy - ry; y <= cy; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1) continue;
      const borde = d > 0.78;
      const ranura = (Math.round(x - cx) % 3 === 0) && y < cy - 1 && y > cy - ry + 2;
      put(x, y, borde ? o : ranura ? tinta : y < cy - ry / 2 ? l : (x > cx ? s : b));
    }
    // la visera
    if (dir === 'down') for (let x = Math.floor(cx - rx + 2); x <= cx + rx - 2; x++) put(x, cy + 1, o);
    if (dir === 'right') for (let i = 0; i < 4; i++) put(cx + rx + i - 1, cy + 1 - (i >> 1), o);
    return out;
  }
  if (id === 'gorra_beisbol') {
    // gorra de béisbol sin logo: la copa redonda y la visera (adelante de frente, saliendo de lado, atrás la tira)
    const [o, s, b, l] = rampa(color ?? '#2a5bd7');
    const rx = w / 2, ry = 6, cy = top + 6;
    for (let y = cy - ry; y <= cy + 1; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1 && y < cy) continue;
      if (y > cy && (x < cx - rx || x > cx + rx)) continue;
      put(x, y, d > 0.8 && y < cy ? o : y < cy - ry / 2 ? l : x > cx ? s : b);
    }
    put(cx, cy - ry, o);
    if (dir === 'down') for (let x = Math.floor(cx - rx + 1); x <= cx + rx - 1; x++) { put(x, cy + 2, s); put(x, cy + 3, o); }
    if (dir === 'right') for (let i = 0; i < 6; i++) { put(cx + rx + i - 1, cy + 1, i === 5 ? o : s); put(cx + rx + i - 1, cy + 2, o); }
    if (dir === 'up') { for (let x = Math.floor(cx - 2); x <= cx + 2; x++) put(x, cy, tinta); }
    return out;
  }
  if (id === 'vueltiao') {
    // sombrero vueltiao: copa baja y ala ancha con las vueltas de caña flecha en blanco y negro
    const crema = '#efe6cf', negro = '#1e1418';
    const cw = w / 2 - 1, ala = w / 2 + 7, base = top + 6;
    for (let y = base - 6; y < base; y++) for (let x = Math.floor(cx - cw); x <= Math.ceil(cx + cw); x++) {
      const borde = x <= cx - cw + 0.5 || x >= cx + cw - 0.5 || y === base - 6;
      put(x, y, borde ? negro : (y - base) % 2 === 0 ? negro : crema);
    }
    for (let x = Math.floor(cx - ala); x <= Math.ceil(cx + ala); x++) {
      const ext = x <= cx - ala + 0.5 || x >= cx + ala - 0.5;
      put(x, base, ext ? negro : (Math.abs(Math.round(x - cx)) % 4 < 2 ? negro : crema)); put(x, base + 1, ext ? negro : crema);
      if (dir !== 'right') put(x, base + 2, negro);
    }
    return out;
  }
  if (id === 'sombrero_gaitero') {
    // sombrero de gaitero: copa alta de paja con su cinta negra y el ala ancha y plana
    const [o, s, b, l] = rampa(color ?? '#e9d39a');
    const cw = w / 2 - 1, ala = w / 2 + 6, base = top + 6;
    for (let y = base - 9; y < base; y++) for (let x = Math.floor(cx - cw); x <= Math.ceil(cx + cw); x++) {
      const borde = x <= cx - cw + 0.5 || x >= cx + cw - 0.5 || y === base - 9;
      put(x, y, borde ? o : y >= base - 3 ? tinta : x < cx ? l : (x + y) % 3 === 0 ? s : b);
    }
    for (let x = Math.floor(cx - ala); x <= Math.ceil(cx + ala); x++) {
      const ext = x <= cx - ala + 0.5 || x >= cx + ala - 0.5;
      put(x, base, ext ? o : l); put(x, base + 1, ext ? o : s);
      if (dir !== 'right') put(x, base + 2, o);
    }
    return out;
  }
  if (id === 'marimonda') return marimonda(dir, cab, color);
  if (id === 'ponchera') return ponchera(dir, cab, color);
  if (id.startsWith('mascara_')) return mascaraGuardia(id, dir, cab, color);
  // rolos: cilindros de colores sobre el pelo, en dos filas, con la redecilla
  const cols = ['#f08aa4', '#7fb8e8', '#f2d14c', '#9ed08a'];
  const fila = (y: number, n: number, dx: number) => {
    for (let i = 0; i < n; i++) {
      const x = cx - ((n - 1) * 4) / 2 + i * 4 + dx, c = rampa(cols[(i + n) % cols.length]);
      put(x - 1, y, c[3]); put(x, y, c[3]); put(x + 1, y, c[2]);
      put(x - 1, y + 1, c[2]); put(x, y + 1, c[2]); put(x + 1, y + 1, c[1]);
      put(x - 1, y + 2, c[1]); put(x, y + 2, c[1]); put(x + 1, y + 2, c[0]);
    }
  };
  if (dir === 'right') { fila(top + 1, 2, -2); fila(top + 4, 3, -4); }
  else { fila(top + 1, Math.max(2, Math.floor(w / 6)), 0); fila(top + 4, Math.max(3, Math.floor(w / 5)), 0); }
  return out;
}

/**
 * La máscara de la Marimonda: la capucha de tela que tapa toda la cabeza (roja si no se pide otro color), las orejotas
 * azules con el adentro amarillo, los tres huecos (los ojos y la boca) con su aro blanco y la trompa larga que cuelga
 * con sus anillos. De frente la trompa baja sobre el pecho; de lado sale hacia adelante y se enrosca; de espalda se ven
 * la capucha y las dos orejas. Todo con su contorno, para que se lea en la celda de 48.
 */
function marimonda(dir: 'down' | 'right' | 'up', cab: Caja, color?: string | null): PixelGorro[] {
  const out: PixelGorro[] = [];
  const put = (x: number, y: number, hex: string) => out.push({ x: Math.round(x), y: Math.round(y), hex });
  const tinta = '#1e1418', blanco = '#fffaf0';
  const [o, s, b, l] = rampa(color ?? '#e8402e');
  const [ao, as, ab, al] = rampa('#2a5ad0'), [, ys, yb, yl] = rampa('#f2c230');
  const cx = cab.x + cab.w / 2 - 0.5, top = cab.y - 1, H = Math.max(14, cab.h + 2), rx = cab.w / 2 + 1.5, ry = H / 2, cy = top + ry;
  const ovalo = (ox: number, oy: number, ex: number, ey: number, fill: (x: number, y: number, d: number) => string) => {
    for (let y = Math.floor(oy - ey - 1); y <= oy + ey + 1; y++) for (let x = Math.floor(ox - ex - 1); x <= ox + ex + 1; x++) {
      const d = ((x - ox) / ex) ** 2 + ((y - oy) / ey) ** 2;
      if (d <= 1) put(x, y, fill(x, y, d));
    }
  };
  // las orejas van primero: la capucha las tapa donde se juntan
  const oreja = (ox: number, oy: number) => ovalo(ox, oy, 4.5, 6.5, (x, y, d) => (d > 0.8 ? tinta : d > 0.38 ? (x < ox ? al : ab) : y < oy ? yl : yb));
  if (dir !== 'right') { oreja(cx - rx - 2.5, top + 3.5); oreja(cx + rx + 2.5, top + 3.5); }
  // la capucha
  ovalo(cx, cy, rx, ry, (x, y, d) => (d > 0.8 ? tinta : y < cy - ry * 0.45 && x < cx + 1 ? l : x > cx + rx * 0.35 ? s : b));
  // el remate de la capucha arriba
  put(cx, top - 1, tinta); put(cx - 1, top, o); put(cx + 1, top, o);
  // de lado se ve la oreja de este lado, encima de la capucha, hacia atrás y arriba
  if (dir === 'right') oreja(cx - rx * 0.5, top + 2.5);
  if (dir === 'up') return out;
  // los huecos de los ojos y de la boca, con su aro blanco
  const hueco = (hx: number, hy: number) => { for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) put(hx + dx, hy + dy, blanco); put(hx, hy, tinta); };
  const ojoY = top + H * 0.42;
  if (dir === 'down') { hueco(cx - 3, ojoY); hueco(cx + 3, ojoY); hueco(cx - 2, top + H * 0.8); }
  else hueco(cx + rx * 0.45, ojoY);
  // la trompa: de la nariz para abajo (de frente) o para adelante y enroscada (de lado), con anillos amarillos
  const pts: [number, number][] = [];
  if (dir === 'down') for (let i = 0; i < 17; i++) pts.push([cx + 0.5 + Math.round(Math.sin(i / 4) * 1.5), top + H * 0.55 + i]);
  else for (let i = 0; i < 15; i++) pts.push([cx + rx * 0.6 + i * 0.7 + (i > 10 ? (i - 10) * 0.4 : 0), top + H * 0.55 + i * 0.75 - (i > 11 ? (i - 11) * 1.4 : 0)]);
  pts.forEach(([px, py], i) => {
    const ancho = i < pts.length - 3 ? 1 : 0;
    for (let k = -ancho - 1; k <= ancho + 1; k++) put(px + k, py, Math.abs(k) === ancho + 1 ? tinta : i % 4 === 2 ? ys : k < 0 ? l : b);
  });
  const [ex, ey] = pts[pts.length - 1];
  put(ex, ey + 1, tinta); put(ex - 1, ey + 1, tinta); put(ex + 1, ey + 1, tinta); put(ex, ey, yb);
  void ao; void as; void o;
  return out;
}

/**
 * La ponchera de la palenquera de Cartagena: el pañuelo amarrado en la cabeza (rojo con pepitas blancas si no se pide otro
 * color) y encima la ponchera de aluminio, ancha y bajita, con el montón de frutas: los mangos, el banano, la patilla, las
 * guayabas y los limones. Se ve igual de frente, de lado y de espalda (la ponchera es redonda), con su contorno.
 */
function ponchera(dir: 'down' | 'right' | 'up', cab: Caja, color?: string | null): PixelGorro[] {
  const out: PixelGorro[] = [];
  const put = (x: number, y: number, hex: string) => out.push({ x: Math.round(x), y: Math.round(y), hex });
  const tinta = '#1e1418', blanco = '#fffaf0';
  const [po, ps, pb, pl] = rampa(color ?? '#d83e34');
  const [ao, as, ab, al] = rampa('#b8c0cc');
  const cx = cab.x + cab.w / 2 - 0.5, top = cab.y + 1, rx = cab.w / 2 + 0.5;
  // el pañuelo: tapa la cima del pelo y baja un poco por los lados, con el nudo atrás (de lado y de espalda)
  for (let y = top; y <= top + 5; y++) {
    const hw = rx * Math.sqrt(Math.max(0, 1 - ((top + 5 - y) / 6.5) ** 2)) + 0.5;
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      const borde = x <= cx - hw + 0.5 || x >= cx + hw - 0.5 || y === top + 5;
      put(x, y, borde ? po : (x * 3 + y * 5) % 7 === 0 ? blanco : y < top + 2 ? pl : x > cx + 1 ? ps : pb);
    }
  }
  if (dir === 'right') for (const [dx, dy] of [[-rx - 1, 3], [-rx - 2, 4], [-rx - 1, 5], [-rx - 2, 6]]) put(cx + dx, top + dy, dy % 2 ? ps : po);
  if (dir === 'up') for (const [dx, dy] of [[-1, 5], [0, 6], [1, 5], [-2, 7], [2, 7]]) put(cx + dx, top + dy, dy === 7 ? po : ps);
  // la ponchera: el aro de arriba con su brillo y el cuerpo que se cierra hasta apoyarse en el pañuelo
  const bw = rx + 4, by = top - 1;
  for (let j = 0; j < 3; j++) {
    const hw = bw - j * 1.5;
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      const borde = x <= cx - hw + 0.5 || x >= cx + hw - 0.5 || j === 2;
      put(x, by + j, borde ? ao : j === 0 ? al : x < cx - hw / 3 ? ab : x > cx + hw / 3 ? as : al);
    }
  }
  // las frutas en montón, bajito para que quepa en la celda: de las de atrás a las de adelante
  const fruta = (fx: number, fy: number, r: number, c: string) => {
    const [o, s, b, l] = rampa(c);
    for (let y = Math.floor(fy - r - 1); y <= fy + r + 1; y++) for (let x = Math.floor(fx - r - 1); x <= fx + r + 1; x++) {
      const d = ((x - fx) ** 2 + (y - fy) ** 2) / (r * r);
      if (d > 1.15 || y >= by) continue;
      put(x, y, d > 0.7 ? o : x < fx && y < fy ? l : x > fx ? s : b);
    }
  };
  fruta(cx - bw * 0.42, by - 1.5, 2.2, '#f2c230');
  fruta(cx + bw * 0.42, by - 1.5, 2.2, '#e8902a');
  fruta(cx, by - 1.8, 2.2, '#e84a3a');
  fruta(cx - bw * 0.72, by - 0.5, 1.4, '#4aa83a');
  fruta(cx + bw * 0.72, by - 0.5, 1.4, '#c8e04a');
  fruta(cx - bw * 0.15, by - 0.8, 1.6, '#7ac04a');
  // el banano acostado encima, con la punta oscura
  for (let i = 0; i < 6; i++) put(cx + bw * 0.1 + i, by - 1 - Math.round(2 - (i - 2.5) ** 2 / 4), i === 5 ? tinta : i < 3 ? '#ffe27a' : '#f2c230');
  return out;
}

/**
 * La capucha con máscara de los guardias del Juego del Calamar: la capucha de tela (rosada si no se pide otro color) que
 * tapa toda la cabeza y deja la cara en un óvalo, y encima la máscara negra brillante con su figura blanca: círculo
 * (obrero), triángulo (soldado) o cuadrado (jefe). La del Front Man es la capucha negra y la máscara de facetas, sin figura.
 * De lado se ve la máscara de perfil, un poco salida; de espalda solo la capucha con su costura.
 */
function mascaraGuardia(id: GorroPropio, dir: 'down' | 'right' | 'up', cab: Caja, color?: string | null): PixelGorro[] {
  const out: PixelGorro[] = [];
  const put = (x: number, y: number, hex: string) => out.push({ x: Math.round(x), y: Math.round(y), hex });
  const tinta = '#141016', blanco = '#fbf7f2';
  const front = id === 'mascara_front_man';
  const [o, s, b, l] = rampa(color ?? (front ? '#2a2830' : '#e0457b'));
  const cx = cab.x + cab.w / 2 - 0.5, top = cab.y - 1, H = Math.max(14, cab.h + 2), rx = cab.w / 2 + 1.5, ry = H / 2, cy = top + ry;
  // la capucha: un óvalo que cubre pelo, orejas y cuello
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > 1) continue;
    const costura = dir === 'up' && Math.abs(x - cx) < 0.6 && y < cy + ry * 0.6;
    put(x, y, d > 0.8 ? tinta : costura ? s : y < cy - ry * 0.45 && x < cx + 1 ? l : x > cx + rx * 0.35 ? s : b);
  }
  if (dir === 'up') return out;
  // la máscara: óvalo negro de frente, perfil salido de lado
  const mx = dir === 'down' ? cx : cx + rx * 0.42, my = top + H * 0.56;
  const ex = dir === 'down' ? rx * 0.72 : rx * 0.6, ey = ry * 0.68;
  for (let y = Math.floor(my - ey - 1); y <= my + ey + 1; y++) for (let x = Math.floor(mx - ex - 1); x <= mx + ex + 2; x++) {
    const d = ((x - mx) / ex) ** 2 + ((y - my) / ey) ** 2;
    if (d > 1) continue;
    let c = d > 0.82 ? '#050407' : '#1d1b22';
    // el brillo de arriba a la izquierda
    if (d < 0.5 && x < mx - ex * 0.3 && y < my - ey * 0.25) c = '#4a4756';
    if (front) {
      // facetas: planos en diagonal, más claros arriba, con el brillo del filo
      const f = Math.floor((x - mx + (y - my) * 0.7) / 2.2);
      c = d > 0.82 ? '#050407' : y < my - 1 ? (f % 2 ? '#6c6a7c' : '#3a3846') : f % 2 ? '#24222c' : '#0e0c12';
      if (Math.abs(x - mx) < 0.6 && y > my - ey + 1) c = '#8a889c';
    }
    put(x, y, c);
  }
  if (front) {
    // las rendijas de los ojos
    if (dir === 'down') { for (const dx of [-3, -2, 2, 3]) put(mx + dx, my - 1, '#000000'); }
    else { put(mx + 1, my - 1, '#000000'); put(mx + 2, my - 1, '#000000'); }
    return out;
  }
  // la figura blanca
  const fx = dir === 'down' ? mx : mx + 1, fy = my;
  if (id === 'mascara_circulo') {
    for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]]) put(fx + dx, fy + dy, blanco);
  } else if (id === 'mascara_triangulo') {
    for (const [dx, dy] of [[0, -2], [-1, -1], [1, -1], [-1, 0], [1, 0], [-2, 1], [2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2]]) put(fx + dx, fy + dy, blanco);
  } else {
    for (let k = -2; k <= 2; k++) { put(fx + k, fy - 2, blanco); put(fx + k, fy + 2, blanco); put(fx - 2, fy + k, blanco); put(fx + 2, fy + k, blanco); }
  }
  void o;
  return out;
}
