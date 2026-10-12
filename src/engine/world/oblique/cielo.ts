import { rng, bayer, grain } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { Hora } from './layout';

/**
 * Cielo por hora, en franjas con tramado entre una y otra, y nubes que dan la vuelta por el borde: se repite en x
 * sin costura. Solo usa colores de la paleta (que ya viene con los tonos de esa hora).
 */
const FRANJAS: Partial<Record<Hora, Color[]>> = {
  manana: ['celeste', 'cielo', 'cielo', 'bruma'],
  mediodia: ['celeste', 'celeste', 'cielo', 'bruma'],
  tarde: ['asfalto_claro', 'celeste', 'cielo', 'bruma'],
  aguacero: ['asfalto_claro', 'celeste', 'cielo', 'bruma'],
  nublado: ['celeste', 'cielo', 'cielo', 'bruma'],
  atardecer: ['celeste', 'salmon', 'cielo', 'bruma'],
};

/** Las franjas van de arriba hasta `alto` (lo que se ve sobre la ciudad); de ahí para abajo sigue la última. */
function franjas(L: Lienzo, fr: Color[], alto = L.h) {
  const n = fr.length, bh = alto / n;
  for (let y = 0; y < L.h; y++) {
    const k = Math.min(n - 1, Math.floor(y / bh)), t = (y - k * bh) / bh;
    const next = fr[Math.min(n - 1, k + 1)];
    for (let x = 0; x < L.w; x++) {
      // tramado ordenado en la última mitad de la franja, cada vez más denso
      const mix = t > 0.5 && bayer(x, y) < (t - 0.5) / 0.5;
      L.p(x, y, mix ? next : fr[k]);
    }
  }
}

/** Una nube de 5 óvalos con la panza plana, que da la vuelta por el borde. */
function nube(L: Lienzo, cx: number, cy: number, cw: number, luz: Color, panza: Color, borde?: Color) {
  for (let k = 0; k < 5; k++) {
    const bx = cx + (k - 2) * cw * 0.22, by = cy - (k === 2 ? 4 : k % 2 ? 2 : 0), r = cw * (k === 2 ? 0.24 : 0.17);
    for (let y = Math.floor(by - r * 0.6); y <= by + r * 0.6; y++) for (let x = Math.floor(bx - r); x <= bx + r; x++) {
      const dx = (x - bx) / r, dy = (y - by) / (r * 0.6);
      if (dx * dx + dy * dy > 1 || y > cy + 2) continue;
      const edge = borde && dx * dx + dy * dy > 0.8 && dy < 0;
      L.p(((x % L.w) + L.w) % L.w, y, edge ? borde! : y > cy - 1 ? panza : luz);
    }
  }
}

export function cielo(pal: Paleta, w: number, h: number, hora: Hora = 'manana', seed = 7, clima: string[] = []): Lienzo {
  const L = new Lienzo(w, h, pal);
  const lluvia = clima[0] === 'aguacero' || hora === 'aguacero';
  const fr = lluvia && hora !== 'atardecer' ? FRANJAS.tarde! : FRANJAS[hora] ?? FRANJAS.manana!;
  // la mañana quedó aprobada así en saigon_hem; las demás horas reparten el degradé en lo que se ve (las 200 de arriba)
  franjas(L, fr, hora === 'manana' ? h : Math.min(h, 200));
  const R = rng(seed);
  if (lluvia) {
    // capas de nubarrones que tapan el cielo: bandas onduladas que se repiten en x
    const capas: [number, Color, Color][] = [[0.08, 'asfalto', 'asfalto_claro'], [0.26, 'asfalto_claro', 'celeste'], [0.46, 'celeste', 'cielo']];
    for (const [k, [y0, oscuro, claro]] of capas.entries()) {
      const amp = 5 + k * 3, base = Math.round(h * y0), per = w / (3 + k);
      for (let x = 0; x < w; x++) {
        const ond = Math.sin((x / per) * Math.PI * 2 + k) * amp + Math.sin((x / (per / 2.3)) * Math.PI * 2) * 3;
        const bot = base + 14 + Math.round(ond);
        for (let y = Math.max(0, base - 8); y < bot && y < h; y++) L.p(x, y, y >= bot - 3 ? claro : bayer(x, y) < 0.3 ? claro : oscuro);
      }
    }
    // cortinas de lluvia que caen de las nubes, rayas finas inclinadas
    for (let x = 0; x < w; x += 3) for (let y = Math.round(Math.min(h, 200) * 0.3); y < h; y++) if (grain(x, y >> 2, seed) < 0.12 && (x + y) % 7 < 2) L.p((x + Math.floor(y / 3)) % w, y, 'cielo');
    return L;
  }
  if (hora === 'atardecer') {
    // el sol bajo con su halo, y nubes alargadas encendidas por debajo
    const sx = Math.floor(w * 0.72), sy = Math.min(Math.floor(h * 0.78), 62);
    for (let y = sy - 22; y <= sy + 22; y++) for (let x = sx - 30; x <= sx + 30; x++) {
      const d = Math.hypot((x - sx) / 1.3, y - sy);
      if (d < 11) L.p(x, y, d < 8 ? 'luz' : 'amarillo');
      else if (d < 22 && bayer(x, y) < (22 - d) / 22) L.p(x, y, 'oro');
    }
    for (let i = 0; i < 6; i++) {
      const cx = R() * w, cy = Math.floor(Math.min(h, 200) * (0.12 + R() * 0.4)), cw = 50 + R() * 90;
      for (let x = Math.floor(cx - cw / 2); x < cx + cw / 2; x++) {
        const t = (x - (cx - cw / 2)) / cw, th = Math.max(1, Math.round(Math.sin(t * Math.PI) * 4));
        for (let j = 0; j < th; j++) L.p(((x % w) + w) % w, cy + j, j === th - 1 ? 'oro' : j === 0 ? 'sombra' : 'vino');
      }
    }
    return L;
  }
  // mañana y mediodía: nubes blancas (al mediodía pocas y chicas, con el sol arriba)
  const n = hora === 'mediodia' ? Math.max(2, Math.round(w / 300)) : Math.max(2, Math.round(w / 220));
  for (let i = 0; i < n; i++) {
    const cx = R() * w, cy = h * (hora === 'mediodia' ? 0.12 + R() * 0.3 : 0.25 + R() * 0.4), cw = (hora === 'mediodia' ? 22 : 28) + R() * 40;
    nube(L, cx, cy, cw, 'luz', 'cielo');
  }
  return L;
}
