/**
 * Gorros propios de PixelForja, dibujados con código sobre las cabezas LPC (que no los traen): el nón lá vietnamita, el
 * sombrero vueltiao, la gorra de béisbol, el casco de ciclista, el sombrero de gaitero zuliano y los rolos (el catálogo
 * C4 del pedido). Van en el cuadro de 64 de LPC, apoyados en la cima del pelo, de frente, de lado y de espalda. Se piden
 * en `hat` como cualquier gorro LPC.
 */

export const GORROS_PROPIOS = ['non_la', 'vueltiao', 'gorra_beisbol', 'casco_ciclista', 'sombrero_gaitero', 'rolos'] as const;
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
 * `cab` es la caja de la cabeza LPC (sin pelo) y `color` el del gorro (sin valor, el de siempre de cada uno).
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
