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
  noche: ['azul_noche', 'azul_noche', 'azul', 'cielo'],
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

export function cielo(pal: Paleta, w: number, h: number, hora: Hora = 'manana', seed = 7, clima: string[] = [], tema?: string): Lienzo {
  const L = new Lienzo(w, h, pal);
  const lluvia = clima[0] === 'aguacero' || hora === 'aguacero';
  // la tormenta de las azoteas: el cielo se cierra casi como de noche
  const tormenta = lluvia && tema === 'azoteas';
  const fr = tormenta ? (['sombra', 'asfalto', 'celeste', 'bruma'] as Color[]) : lluvia && hora !== 'atardecer' ? FRANJAS.tarde! : FRANJAS[hora] ?? FRANJAS.manana!;
  // la mañana quedó aprobada así en saigon_hem; las demás horas reparten el degradé en lo que se ve (las 200 de arriba)
  franjas(L, fr, hora === 'manana' ? h : Math.min(h, 200));
  const R = rng(seed);
  if (lluvia) {
    // capas de nubarrones que tapan el cielo: bandas onduladas que se repiten en x
    const capas: [number, Color, Color][] = tormenta ? [[0.08, 'tinta', 'sombra'], [0.26, 'sombra', 'asfalto'], [0.46, 'asfalto', 'asfalto_claro']] : [[0.08, 'asfalto', 'asfalto_claro'], [0.26, 'asfalto_claro', 'celeste'], [0.46, 'celeste', 'cielo']];
    for (const [k, [y0, oscuro, claro]] of capas.entries()) {
      const amp = 5 + k * 3, base = Math.round(h * y0), per = w / (3 + k);
      for (let x = 0; x < w; x++) {
        const ond = Math.sin((x / per) * Math.PI * 2 + k) * amp + Math.sin((x / (per / 2.3)) * Math.PI * 2) * 3;
        const bot = base + 14 + Math.round(ond);
        for (let y = Math.max(0, base - 8); y < bot && y < h; y++) L.p(x, y, y >= bot - 3 ? claro : bayer(x, y) < 0.3 ? claro : oscuro);
      }
    }
    // cortinas de lluvia que caen de las nubes, rayas finas inclinadas
    // rayas de 4 a 6 pixeles inclinadas (la tormenta, más tupidas)
    const dens = tormenta ? 0.05 : 0.03;
    for (let x = 0; x < w; x++) for (let y = Math.round(Math.min(h, 200) * 0.2); y < h; y += 2) if (grain(x, y, seed) < dens) { const n = 4 + ((x + y) % 3); for (let j = 0; j < n; j++) L.p((x + Math.floor(j / 3)) % w, y + j, j === 0 ? 'celeste' : 'cielo'); }
    return L;
  }
  if (hora === 'tarde') {
    // tarde dorada: el sol bajo a la derecha con su halo y nubes largas encendidas de oro
    franjas(L, ['celeste', 'cielo', 'cielo', 'bruma'], Math.min(h, 200));
    const sx = Math.floor(w * 0.66), sy = Math.min(Math.floor(h * 0.5), 96);
    for (let y = sy - 30; y <= sy + 30; y++) for (let x = sx - 40; x <= sx + 40; x++) {
      const d = Math.hypot((x - sx) / 1.2, y - sy);
      if (d < 9) L.p(x, y, d < 6 ? 'luz' : 'amarillo');
      else if (d < 30 && bayer(x, y) < ((30 - d) / 30) * 0.8) L.p(x, y, d < 18 ? 'amarillo' : 'oro');
    }
    for (let i = 0; i < 9; i++) {
      const cx = R() * w, cy = Math.floor(Math.min(h, 200) * (0.1 + R() * 0.45)), cw = 40 + R() * 110;
      for (let x = Math.floor(cx - cw / 2); x < cx + cw / 2; x++) {
        const t = (x - (cx - cw / 2)) / cw, th = Math.max(1, Math.round(Math.sin(t * Math.PI) * 3));
        for (let j = 0; j < th; j++) L.p(((x % w) + w) % w, cy + j, j === th - 1 ? 'oro' : j === 0 ? 'luz' : 'amarillo');
      }
    }
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
  if (hora === 'noche') {
    // estrellas: puntitos, más en lo alto, y unas pocas grandes en cruz
    const alto = Math.min(h, 200);
    for (let y = 0; y < alto; y++) for (let x = 0; x < w; x++) { const g = grain(x, y, seed + 1); if (g < 0.007 * (1 - y / (alto * 1.1))) L.p(x, y, g < 0.0025 ? 'luz' : 'celeste'); }
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(R() * w), y = 4 + Math.floor(R() * alto * 0.5);
      L.p(x, y, 'luz'); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L.p((x + dx + w) % w, y + dy, 'celeste');
    }
    // nubes largas y finas, oscuras, con el borde de arriba tocado por la luna
    for (let i = 0; i < 6; i++) {
      const cx = R() * w, cy = Math.floor(alto * (0.15 + R() * 0.55)), cw = 70 + R() * 130;
      for (let x = Math.floor(cx - cw / 2); x < cx + cw / 2; x++) {
        const t = (x - (cx - cw / 2)) / cw, th = Math.max(1, Math.round(Math.sin(t * Math.PI) * (3 + (i % 3))));
        for (let j = 0; j < th; j++) L.p(((x % w) + w) % w, cy + j, j === 0 ? 'cielo' : bayer(x, cy + j) < 0.3 ? 'cielo' : 'azul');
      }
    }
    // el resplandor de la ciudad encendida, abajo
    for (let y = Math.floor(alto * 0.62); y < h; y++) for (let x = 0; x < w; x++) if (bayer(x, y) < (y - alto * 0.62) / (alto * 0.5)) L.p(x, y, 'bruma');
    return L;
  }
  // mañana y mediodía: nubes blancas (al mediodía pocas y chicas, con el sol arriba)
  const n = hora === 'mediodia' ? Math.max(2, Math.round(w / 300)) : Math.max(2, Math.round(w / 220));
  if (tema?.startsWith('c13')) {
    // la Comuna 13: el valle tapa lo de abajo, así que los cúmulos van arriba, grandes, sobre el azul limpio
    for (let i = 0; i < n + 1; i++) nube(L, R() * w, 14 + R() * 22, 40 + R() * 40, 'luz', 'cielo', 'cielo');
    return L;
  }
  for (let i = 0; i < n; i++) {
    const cx = R() * w, cy = h * (hora === 'mediodia' ? 0.12 + R() * 0.3 : 0.25 + R() * 0.4), cw = (hora === 'mediodia' ? 22 : 28) + R() * 40;
    nube(L, cx, cy, cw, 'luz', 'cielo');
  }
  return L;
}
