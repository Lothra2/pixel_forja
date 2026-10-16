import { createRaster, type Raster } from '../core/raster';
import { Pix, bayer, rng, grain } from '../fx/pix';

/**
 * El escenario japonés de pelea: la azotea de un castillo de noche, a la manera del de Ryu en SF2 pero propio.
 * Mide 512 x 224 (la pantalla de 384 se desplaza) y viene en capas para el paralaje:
 *
 * - `cielo`: el cielo de noche en bandas tramadas, las estrellas que titilan, la luna llena y las nubes que pasan;
 * - `lejos`: los cerros y el monte Fuji con nieve;
 * - `castillo`: el castillo de tres techos con sus delfines dorados, los pinos, el cerezo en flor, el muro de tejas,
 *   los faroles rojos que titilan y el estandarte con el escudo GG;
 * - `piso`: el piso de tablas de madera en perspectiva, con el brillo de la luna y de los faroles;
 * - `frente`: los pétalos de cerezo que caen.
 *
 * Todas en 8 cuadros en bucle. Los luchadores se paran en y = `ESCENARIO.piso`.
 */
export const ESCENARIO = { w: 512, h: 224, piso: 206, cuadros: 8, paralaje: { cielo: 0.15, lejos: 0.3, castillo: 0.6, piso: 1, frente: 1.15 } };

export type CapaEscenario = 'cielo' | 'lejos' | 'castillo' | 'piso' | 'frente';
export const CAPAS_ESCENARIO: CapaEscenario[] = ['cielo', 'lejos', 'castillo', 'piso', 'frente'];

const W = ESCENARIO.w, H = ESCENARIO.h;
const HORIZONTE = 172;

/** Una banda tramada entre dos colores (f de 0 a 1). */
function tramado(p: Pix, x: number, y: number, a: string, b: string, f: number) {
  p.px(x, y, bayer(x, y) < f ? b : a);
}

function cielo(t: number): Raster {
  const p = new Pix(W, H);
  const bandas = ['#0b0a24', '#121039', '#1a164a', '#241c5a', '#30236a', '#3f2b76', '#55347f', '#6d3e83'];
  for (let y = 0; y < HORIZONTE; y++) {
    const u = (y / HORIZONTE) * (bandas.length - 1), k = Math.floor(u), f = u - k;
    for (let x = 0; x < W; x++) tramado(p, x, y, bandas[k], bandas[Math.min(bandas.length - 1, k + 1)], f);
  }
  // las estrellas: unas fijas y unas que titilan con el cuadro
  const r = rng(7);
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * 110), b = r();
    const brilla = (i + t) % 5 === 0;
    p.px(x, y, b > 0.85 || brilla ? '#ffffff' : b > 0.5 ? '#b8b0ff' : '#7a70c8');
    if (b > 0.94 && brilla) { p.px(x - 1, y, '#8a82d8'); p.px(x + 1, y, '#8a82d8'); p.px(x, y - 1, '#8a82d8'); p.px(x, y + 1, '#8a82d8'); }
  }
  // la luna llena con su halo
  const mx = 396, my = 50, mr = 25;
  for (let y = my - 46; y <= my + 46; y++)
    for (let x = mx - 46; x <= mx + 46; x++) {
      const d = Math.hypot(x - mx, (y - my) * 1.0);
      if (d > mr && d < mr + 18 && bayer(x, y) < (1 - (d - mr) / 18) * 0.55) p.px(x, y, d < mr + 7 ? '#5a4f9a' : '#463c86');
    }
  for (let y = my - mr; y <= my + mr; y++)
    for (let x = mx - mr; x <= mx + mr; x++) {
      const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy);
      if (d > mr) continue;
      // los mares de la luna y el borde de abajo a la izquierda más oscuro
      const mar = Math.sin(dx * 0.21 + 1.3) * Math.cos(dy * 0.17 - 0.4) + Math.sin((dx + dy) * 0.11) * 0.6 > 0.55;
      const borde = d > mr - 3 && dx - dy < -8;
      p.px(x, y, borde ? '#d6c99c' : mar ? (bayer(x, y) < 0.5 ? '#e4d8ae' : '#ddd0a4') : d < mr * 0.55 && dx + dy < -6 ? '#fffbe8' : '#f4ecc8');
    }
  // las nubes largas que cruzan delante de la luna, corridas por el cuadro
  const nubes: [number, number, number, number][] = [[300, 44, 150, 5], [40, 70, 190, 6], [250, 92, 230, 7], [120, 30, 120, 4]];
  nubes.forEach(([x0, y0, largo, alto], i) => {
    const dx = ((t * (i % 2 ? 2 : 3)) % W);
    for (let k = 0; k < largo; k++) {
      const x = (Math.floor(x0 + k + dx) % W + W) % W;
      const grosor = Math.round(alto * Math.sin((k / largo) * Math.PI) + Math.sin(k * 0.3) * 1.2);
      for (let j = 0; j < grosor; j++) {
        const y = y0 + j - Math.round(grosor / 2);
        const cerca = Math.hypot(x - mx, y - my) < 60;
        p.px(x, y, j === 0 ? (cerca ? '#c8bce8' : '#6a5ea8') : j < 2 ? (cerca ? '#8a7cc0' : '#43387e') : '#2e2566');
      }
    }
  });
  return p.r;
}

function lejos(): Raster {
  const p = new Pix(W, H);
  // los cerros de atrás
  for (let x = 0; x < W; x++) {
    const h1 = 132 + Math.round(9 * Math.sin(x / 37) + 5 * Math.sin(x / 13 + 2) + 3 * Math.sin(x / 5.3));
    for (let y = h1; y < HORIZONTE; y++) p.px(x, y, y === h1 ? '#3a2e70' : '#241c52');
  }
  // el monte Fuji, con la nieve arriba
  const fx = 132, top = 74, base = 150;
  for (let y = top; y < base + 10; y++) {
    const ancho = (y - top) * 1.55 + 3;
    for (let x = Math.round(fx - ancho); x <= Math.round(fx + ancho); x++) {
      const nieve = y < top + 22 + Math.round(3 * Math.sin(x * 0.7));
      const luz = x > fx + (y - top) * 0.15;
      p.px(x, y, nieve ? (luz ? '#dcdcf4' : '#9e9ccc') : luz ? '#30276a' : '#261e5a');
    }
  }
  return p.r;
}

/** Un techo japonés: el alero curvo con las puntas levantadas, tejas en franjas, la cumbrera clara y un frontón triangular (chidori). */
function techo(p: Pix, cx: number, y: number, ancho: number, alto: number, fronton = true) {
  for (let j = 0; j < alto; j++) {
    const v = j / alto;
    // el alero se abre hacia abajo en curva
    const w = ancho * (0.55 + 0.45 * Math.pow(v, 0.7));
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const u = (x - cx) / w;
      const teja = (x + Math.round(v * 4)) % 3 === 0;
      const c = j === alto - 1 ? '#0c0e16' : j === alto - 2 ? '#6e7a9c' : j === 0 ? '#7a86a8' : teja ? '#1e2436' : u > 0.6 ? '#3c4664' : u < -0.6 ? '#262d44' : '#2e3650';
      p.px(x, y + j, c);
    }
  }
  // las puntas que suben, con su borde claro
  for (const s of [-1, 1]) {
    const x0 = Math.round(cx + s * ancho);
    for (let k = 0; k < 6; k++) { p.px(x0 + s * k, y + alto - 2 - Math.floor(k * 0.9), '#6e7a9c'); p.px(x0 + s * k, y + alto - 1 - Math.floor(k * 0.9), '#0c0e16'); }
  }
  // el frontón: un triángulo blanco con su marco oscuro sobre el techo
  if (fronton) {
    const fw = Math.round(ancho * 0.28), fh = Math.round(alto * 0.9);
    for (let j = 0; j < fh; j++) {
      const w = Math.round((j / fh) * fw);
      for (let x = -w; x <= w; x++) p.px(cx + x, y - fh + j + 2, Math.abs(x) >= w - 1 ? '#2e3650' : j < 2 ? '#7a86a8' : (x + j) % 5 === 0 ? '#b8b4cc' : '#cac6dc');
    }
  }
}

/** Un farol de papel rojo que titila, con su luz tramada alrededor. */
function farol(p: Pix, cx: number, cy: number, t: number, fase: number) {
  const brillo = (t + fase) % 4 < 2;
  for (let y = cy - 14; y <= cy + 14; y++)
    for (let x = cx - 14; x <= cx + 14; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.1);
      if (d > 7 && d < 14 && p.has(x, y) && bayer(x, y) < (1 - (d - 7) / 7) * (brillo ? 0.5 : 0.38)) p.px(x, y, '#b85a46');
    }
  for (let y = -7; y <= 7; y++) {
    const w = Math.round(5.4 * Math.sqrt(1 - (y / 8) ** 2));
    for (let x = -w; x <= w; x++) {
      const c = Math.abs(x) <= 1 && Math.abs(y) < 5 ? (brillo ? '#fff0b0' : '#ffd890') : Math.abs(x) <= 3 ? (brillo ? '#ffa04a' : '#f08a3c') : x === w || x === -w ? '#8a1e1c' : '#d8392b';
      p.px(cx + x, cy + y, y % 3 === 0 && Math.abs(x) > 1 ? '#a8261f' : c);
    }
  }
  p.rect(cx - 3, cy - 9, 7, 2, '#1a1414'); p.rect(cx - 3, cy + 8, 7, 2, '#1a1414');
  p.px(cx, cy - 10, '#1a1414'); p.px(cx, cy + 10, '#c88a2a'); p.px(cx, cy + 11, '#c88a2a');
}

/** Un pino japonés: tronco torcido y las agujas en nubes planas con la luz de la luna arriba. */
function pino(p: Pix, x0: number, base: number, alto: number, semilla: number, lado: 1 | -1) {
  const r = rng(semilla);
  const tope: [number, number] = [x0 + lado * alto * 0.35, base - alto];
  p.thick(x0, base, (x0 + tope[0]) / 2 - lado * 4, base - alto * 0.5, 2.5, '#2a1c18');
  p.thick((x0 + tope[0]) / 2 - lado * 4, base - alto * 0.5, tope[0], tope[1], 2, '#2a1c18');
  for (let k = 0; k < 7; k++) {
    const f = 0.3 + k * 0.11;
    const xx = x0 + (tope[0] - x0) * f + (k % 2 ? -1 : 1) * (6 + r() * 8), yy = base - alto * f, rx = 15 - k * 1.3, ry = 4.5;
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++)
      for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
        const e = (x / rx) ** 2 + (y / ry) ** 2;
        if (e > 1) continue;
        const px = Math.round(xx + x), py = Math.round(yy + y);
        p.px(px, py, e > 0.82 ? '#0e1616' : y < -ry * 0.35 ? (grain(px, py, semilla) < 0.5 ? '#4e6e64' : '#3e5a52') : grain(px, py, semilla + 1) < 0.2 ? '#2c423c' : '#1c2c2a');
      }
  }
}

function castillo(t: number): Raster {
  const p = new Pix(W, H);
  const cx = 262;
  // la bruma entre los cerros y el pueblo al pie del castillo, con sus luces
  for (let y = 138; y < 156; y++) for (let x = 0; x < W; x++) if (bayer(x, y) < 0.18 + (y - 138) * 0.012) p.px(x, y, '#5a4790');
  const rp = rng(31);
  for (let k = 0; k < 26; k++) {
    const x = Math.round(rp() * W), w = 10 + Math.round(rp() * 10), y = 146 + Math.round(rp() * 8);
    techo(p, x, y - 4, w, 4, false);
    p.rect(x - w + 3, y, 2 * w - 6, 7, '#2c2440');
    if (rp() > 0.35) p.rect(x - 2 + Math.round(rp() * 6 - 3), y + 2, 2, 2, (k + t) % 7 ? '#ffb85a' : '#ffe08a');
  }
  // la base de piedra (ishigaki), en talud curvo
  for (let y = 104; y < 150; y++) {
    const v = (y - 104) / 46, w = 58 + v * v * 26;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const fila = Math.floor((y - 104) / 4), off = (fila % 2) * 5;
      const junta = (y - 104) % 4 === 0 || (x + off) % 10 === 0;
      p.px(x, y, junta ? '#1a1628' : x > cx + w - 7 ? '#2a2640' : grain(Math.floor((x + off) / 10), fila, 2) < 0.3 ? '#4e4866' : '#3e3856');
    }
  }
  // los cuatro pisos: muros blancos con vigas, ventanas encendidas y techos con frontones
  const pisos: [number, number, number][] = [[84, 104, 50], [64, 84, 40], [46, 64, 30], [30, 46, 21]];
  pisos.forEach(([y0, y1, w], i) => {
    for (let y = y0; y < y1; y++)
      for (let x = cx - w; x <= cx + w; x++) {
        const viga = (x - cx + w) % 10 === 0 || y === y1 - 1 || y === y0 + 3 || y === y1 - 5;
        const sombra = x > cx + w - 7;
        p.px(x, y, viga ? '#2e2420' : sombra ? '#7e7a9c' : (x * 3 + y) % 11 === 0 ? '#bab6d0' : '#cfcbe0');
      }
    for (let k = -3; k <= 3; k++) {
      const wx = cx + k * Math.round(w / 3.4), wy = y0 + Math.round((y1 - y0) * 0.42);
      if (Math.abs(wx - cx) > w - 4) continue;
      const prendida = (k + i * 2 + Math.floor(t / 4)) % 4 !== 0;
      p.rect(wx - 2, wy - 2, 5, 5, '#241a26');
      if (prendida) { p.rect(wx - 1, wy - 1, 3, 3, '#ffc35a'); p.px(wx - 1, wy - 1, '#fff0b0'); p.px(wx + 1, wy + 1, '#e08a2a'); }
      else { p.px(wx, wy - 1, '#3a2e3a'); }
    }
    techo(p, cx, y0 - 10, w + 12, 11, i > 0);
  });
  techo(p, cx, 17, 24, 10, false);
  // los delfines dorados en la punta (shachihoko)
  for (const s of [-1, 1]) {
    const x = cx + s * 18;
    p.rect(x - 1, 11, 3, 6, '#e8b84a'); p.px(x, 10, '#fff0a0'); p.px(x + s, 9, '#e8b84a'); p.px(x + s * 2, 8, '#ffd870'); p.px(x - s, 12, '#b8862a'); p.px(x, 16, '#b8862a');
  }
  // el torii rojo a la izquierda
  const tx = 92, tb = 150, th = 64;
  for (const s of [-1, 1]) { p.rect(tx + s * 18 - 2, tb - th + 8, 5, th - 8, '#c83a26'); p.rect(tx + s * 18 + 2, tb - th + 8, 1, th - 8, '#8a2418'); p.rect(tx + s * 18 - 3, tb - 3, 7, 3, '#1a1414'); }
  for (let x = -30; x <= 30; x++) {
    const cur = Math.round((Math.abs(x) / 30) ** 2 * 3);
    p.px(tx + x, tb - th - cur, '#1a1414'); p.px(tx + x, tb - th - cur + 1, '#1a1414'); p.px(tx + x, tb - th - cur + 2, '#e04a30'); p.px(tx + x, tb - th - cur + 3, '#c83a26');
  }
  p.rect(tx - 24, tb - th + 10, 49, 3, '#c83a26'); p.rect(tx - 24, tb - th + 13, 49, 1, '#8a2418');
  p.rect(tx - 3, tb - th + 3, 7, 7, '#1a1414'); p.rect(tx - 2, tb - th + 4, 5, 5, '#e8b84a');
  // los pinos y el cerezo en flor, del que caen los pétalos
  pino(p, 30, 162, 84, 3, 1); pino(p, 190, 156, 50, 5, -1); pino(p, 486, 162, 70, 9, -1);
  const cer = (x0: number, y0: number) => {
    p.thick(x0, 160, x0 - 4, y0 + 22, 3.5, '#3a2420'); p.thick(x0 - 4, y0 + 22, x0 - 30, y0 + 4, 2.2, '#3a2420'); p.thick(x0 - 2, y0 + 24, x0 + 22, y0 + 6, 2.2, '#3a2420');
    const r = rng(11);
    for (let k = 0; k < 20; k++) {
      const xx = x0 - 38 + r() * 66, yy = y0 - 10 + r() * 30, rr = 6 + r() * 6;
      for (let y = -rr; y <= rr; y++)
        for (let x = -rr; x <= rr; x++) {
          const e = (x * x + y * y * 1.5) / (rr * rr);
          if (e > 1) continue;
          const px = Math.round(xx + x), py = Math.round(yy + y);
          p.px(px, py, e > 0.86 ? '#8a3a62' : y < -rr * 0.35 ? (grain(px, py, 3) < 0.4 ? '#ffe6ee' : '#ffc4d8') : grain(px, py, 4) < 0.25 ? '#c85a8a' : '#ef93b6');
        }
    }
  };
  cer(386, 98);
  // el muro de tejas detrás de los luchadores, con sus postes de madera
  for (let y = 140; y < HORIZONTE; y++)
    for (let x = 0; x < W; x++) {
      const yy = y - 140;
      if (yy < 9) {
        const fila = Math.floor(yy / 3), u = (x + fila * 3) % 6;
        p.px(x, y, yy === 8 ? '#0c0e16' : yy === 0 ? '#6e7a9c' : u === 0 ? '#151a28' : yy % 3 === 0 ? '#56607e' : u < 3 ? '#3a4462' : '#2a3148');
      } else {
        const poste = x % 64 < 4;
        const zocalo = yy > 24;
        p.px(x, y, poste ? (x % 64 === 3 ? '#1c120e' : '#4a2e22') : zocalo ? (yy === 25 ? '#1c120e' : (x + yy) % 9 === 0 ? '#3a2418' : '#4a2e24') : yy === 9 ? '#4a4664' : grain(x >> 1, y >> 1, 6) < 0.12 ? '#8a84a6' : '#9a94b6');
      }
    }
  // el estandarte con el escudo GG, que flamea
  const ex = 150, ey = 84;
  p.rect(ex - 2, ey - 4, 28, 3, '#3a2a20'); p.rect(ex - 1, ey - 4, 2, 92, '#2a1c16');
  for (let y = 0; y < 58; y++) {
    const ond = Math.round(Math.sin(y * 0.18 + t * 0.8) * 1.6);
    for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 12, y - 22);
      const borde = x === 0 || x === 23 || y === 57;
      p.px(ex + x + (x > 10 ? ond : 0), ey + y, borde ? '#5a1014' : d < 9 ? (d < 7.6 ? '#1a1414' : '#f4efe4') : y > 48 && (y - 49) % 3 === 0 ? '#8a161c' : x > 18 ? '#a01c22' : '#c8242a');
    }
  }
  // el escudo GG: dos G blancas en el círculo negro
  const G = ['0111', '1000', '1011', '1001', '0111'];
  for (const gx of [ex + 7, ex + 13])
    G.forEach((fila, j) => [...fila].forEach((c, i) => { if (c === '1') p.px(gx + i, ey + 20 + j, '#f4efe4'); }));
  // la cuerda con los faroles rojos frente al muro
  const cuerda = (x: number) => 112 + Math.round(5 * Math.sin((x / W) * Math.PI * 4 + 0.6));
  for (let x = 0; x < W; x++) p.px(x, cuerda(x), '#2a1c18');
  [56, 184, 312, 440].forEach((fx, i) => farol(p, fx, cuerda(fx) + 11 + ((t + i) % 4 === 0 ? 1 : 0), t, i));
  return p.r;
}

function piso(t: number): Raster {
  const p = new Pix(W, H);
  const vx = W / 2, vy = 96;
  for (let y = HORIZONTE; y < H; y++)
    for (let x = 0; x < W; x++) {
      // tablas de madera pulida que corren hacia el fondo, con sus juntas y los cortes escalonados
      const prof = (y - HORIZONTE) / (H - HORIZONTE);
      const u = (x - vx) / (y - vy);
      const tabla = Math.floor(u * 9);
      const junta = Math.abs(u * 9 - Math.round(u * 9)) < 0.035 + prof * 0.012;
      const corte = ((y - HORIZONTE + (((tabla % 4) + 4) % 4) * 7) % 26) === 0;
      const tono = ['#6a4430', '#76503a', '#704a34'][((tabla % 3) + 3) % 3];
      // el brillo de la luna en la madera, en una franja bajo la luna, y el de cada farol
      // el reflejo de los faroles: un brillo corto en la madera pegada al muro
      const farolLuz = prof < 0.25 && [56, 184, 312, 440].some((fx) => Math.abs(x - fx) < 4 - prof * 8) && bayer(x, y) < 0.5;
      const luna = false;
      const veta = grain(x >> 2, y, tabla) < 0.08;
      p.px(x, y, junta || corte ? '#3a2418' : farolLuz ? '#d08a52' : luna ? '#a07a5c' : veta ? '#5e3c2a' : tono);
    }
  // la viga del borde contra el muro
  p.rect(0, HORIZONTE, W, 1, '#1c120e'); p.rect(0, HORIZONTE + 1, W, 1, '#8a6040');
  void t;
  return p.r;
}

function frente(t: number): Raster {
  const p = new Pix(W, H);
  // los pétalos de cerezo: caen y se mecen, y dan la vuelta en los 8 cuadros
  const r = rng(21);
  for (let i = 0; i < 46; i++) {
    const x0 = r() * W, y0 = r() * H, vel = 6 + r() * 6, fase = r() * 6;
    const y = (y0 + t * vel) % H, x = (x0 - t * 4 + Math.sin(t * 0.8 + fase) * 4 + W) % W;
    const c = r() > 0.5 ? '#ffb8cf' : '#ff8ab0';
    p.px(Math.round(x), Math.round(y), c);
    if ((i + t) % 3) p.px(Math.round(x) + 1, Math.round(y), '#ffe4ee');
  }
  return p.r;
}

/** Las capas del escenario en un cuadro (0 a 7). */
export function capasEscenario(t: number): Record<CapaEscenario, Raster> {
  const k = ((t % ESCENARIO.cuadros) + ESCENARIO.cuadros) % ESCENARIO.cuadros;
  return { cielo: cielo(k), lejos: lejos(), castillo: castillo(k), piso: piso(k), frente: frente(k) };
}

/** El escenario armado (sin paralaje): todas las capas una encima de otra, desplazado `scroll` pixeles a la izquierda. */
export function escenarioJapones(t: number, scroll = 0): Raster {
  const c = capasEscenario(t);
  const out = createRaster(W, H);
  for (const nombre of CAPAS_ESCENARIO) {
    if (nombre === 'frente') continue;
    const r = c[nombre], dx = Math.round(scroll * ESCENARIO.paralaje[nombre]);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const sx = (x + dx) % W;
        const i = (y * W + sx) * 4;
        if (!r.data[i + 3]) continue;
        const o = (y * W + x) * 4;
        out.data[o] = r.data[i]; out.data[o + 1] = r.data[i + 1]; out.data[o + 2] = r.data[i + 2]; out.data[o + 3] = 255;
      }
  }
  return out;
}
