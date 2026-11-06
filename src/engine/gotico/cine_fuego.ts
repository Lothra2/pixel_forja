import * as D from './fuego_doom';
import { lamina, type Lamina } from './cine';

/**
 * Fuego de Doom para las cinemáticas y la portada: tiras de cuadros que empalman (se repiten sin salto) para las capas
 * con anim 'cuadros' del reproductor (cine.ts del juego), y la hoja de sprites `fuego` compartida por todos los planos.
 *
 * Empalme: se graban `funde` cuadros de más antes del primero y los últimos se funden en calor con esos, así el último
 * cuadro ya es casi el anterior al primero.
 */

export interface OpcCuadros {
  /** cuadros de la tira y pasos del autómata por cuadro (a 12 cuadros por segundo, 2 pasos son ~25 por segundo) */
  cuadros: number;
  pasos?: number;
  funde?: number;
  /** px por celda */
  celda: number;
  filtro?: number;
  /** brillo de la llama (multiplica el color que se suma) */
  k?: number;
  /** celdas de fundido en la base (0 = la base es la fila de abajo, como detrás de un vidrio) */
  pie?: number;
  /** máscara (0..1) del tamaño de la tira: lo que se ve de la llama (vitrales, una puerta) */
  mascara?: Float32Array;
  /** brillo de fondo de lo enmascarado que late con el calor (el vidrio iluminado desde atrás), color y fuerza */
  fondo?: { c: [number, number, number]; k: number };
}

/** Graba el calor y el humo de n cuadros que empalman. */
function grabar(f: D.Fuego, n: number, pasos: number, funde: number): { calor: Uint8Array; humo: Uint8Array; k: number }[] {
  const K = Math.min(n - 1, funde), g: { calor: Uint8Array; humo: Uint8Array; k: number }[] = [];
  for (let i = -K; i < n; i++) { g.push({ calor: new Uint8Array(f.calor), humo: new Uint8Array(f.humo), k: D.calorMedio(f).k }); D.pasos(f, pasos); }
  const out: { calor: Uint8Array; humo: Uint8Array; k: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = g[i + K];
    if (i < n - K) { out.push(a); continue; }
    const b = g[i - n + K], w = (i - (n - K) + 1) / (K + 1), cal = new Uint8Array(a.calor.length), hum = new Uint8Array(a.humo.length);
    for (let j = 0; j < cal.length; j++) { cal[j] = Math.round(a.calor[j] * (1 - w) + b.calor[j] * w); hum[j] = Math.round(a.humo[j] * (1 - w) + b.humo[j] * w); }
    out.push({ calor: cal, humo: hum, k: a.k * (1 - w) + b.k * w });
  }
  return out;
}

/**
 * Cuadros de un fuego como láminas que se SUMAN (premultiplicadas: color * alfa, alfa = cobertura): la llama, con la
 * máscara aplicada y el fondo que late. Del tamaño de la grilla por la celda.
 */
export function cuadrosDoom(f: D.Fuego, o: OpcCuadros): Lamina[] {
  const n = o.cuadros, [pw, ph] = D.tamanoPintado(f, o.celda), buf = new Uint8ClampedArray(pw * ph * 4), k = o.k ?? 1;
  const g = grabar(f, n, o.pasos ?? 2, o.funde ?? 3), kmax = Math.max(1e-6, ...g.map((q) => q.k));
  return g.map((q) => {
    f.calor.set(q.calor); f.humo.set(q.humo);
    D.pintar(f, buf, pw, ph, o.celda, { capa: 'llama', filtro: o.filtro ?? 0.6, pie: o.pie ?? 0 });
    const L = lamina(pw, ph), pul = q.k / kmax;
    for (let i = 0; i < pw * ph; i++) {
      const m = o.mascara ? o.mascara[i] : 1; if (m <= 0) continue;
      const a = (buf[i * 4 + 3] / 255) * m * k, j = i * 4;
      let r = (buf[i * 4] / 255) * a, gg = (buf[i * 4 + 1] / 255) * a, b = (buf[i * 4 + 2] / 255) * a;
      if (o.fondo) { const fk = o.fondo.k * m * (0.75 + 0.25 * pul); r += o.fondo.c[0] * fk; gg += o.fondo.c[1] * fk; b += o.fondo.c[2] * fk; }
      L.d[j] = r; L.d[j + 1] = gg; L.d[j + 2] = b; L.d[j + 3] = Math.min(1, Math.max(r, gg, b, a));
    }
    return L;
  });
}

/**
 * Fuego de Doom detrás de unos vidrios (vitrales, ventanas): la máscara (0..1, `w` x `h` px, ya recortada a su caja)
 * dice dónde se ve; la fuente nace abajo de cada ventana (formaDesdeMascara). Devuelve la tira del tamaño de la caja.
 */
export function fuegoTrasVidrios(mascara: Float32Array, w: number, h: number, o: { cuadros: number; celda: number; paleta: D.NombrePaleta; semilla: number; alto_px?: number; hueco?: number; fondo?: { c: [number, number, number]; k: number }; k?: number; pasos?: number }): Lamina[] {
  const fm = D.formaDesdeMascara(mascara, w, h, o.celda, { relleno: 0.22, semilla: o.semilla });
  const f = D.crearFuego({ ancho: fm.ancho, alto: fm.alto, forma: fm.forma, paleta: o.paleta, semilla: o.semilla, margen: 0, humo: 0, ruido: 0.5, turbulencia: 0.5, hueco: o.hueco ?? 0, decay: 1 + 52 / ((o.alto_px ?? 64) / o.celda) });
  // la máscara a la resolución de la grilla pintada (que puede pasarse unos px de la caja)
  const [pw, ph] = D.tamanoPintado(f, o.celda), m = new Float32Array(pw * ph);
  for (let y = 0; y < Math.min(h, ph); y++) for (let x = 0; x < Math.min(w, pw); x++) m[y * pw + x] = mascara[y * w + x];
  const cs = cuadrosDoom(f, { cuadros: o.cuadros, celda: o.celda, mascara: m, fondo: o.fondo, k: o.k, pasos: o.pasos });
  // recortar a w x h
  return cs.map((L) => { const R = lamina(w, h); for (let y = 0; y < h; y++) R.d.set(L.d.subarray(y * pw * 4, (y * pw + Math.min(w, pw)) * 4), y * w * 4); return R; });
}

/**
 * La hoja `fuego` de las cinemáticas (8 cuadros de 64 x 128, el pie de la llama en (32, 120), se suma), ahora con
 * fuego de Doom: una lengua que empalma a 12 cuadros por segundo. Mismo formato que la de antes: los planos que la usan
 * (el farol de Vigdis, fogatas, braseros) no cambian.
 */
export function cuadrosHojaFuego(paleta: D.NombrePaleta = 'infierno', semilla = 77): Lamina[] {
  // lengua: fuente angosta y más caliente al medio, que se ve hasta ~60 % del alto y se afina en puntas sueltas
  const fu = new Float32Array(32 * 60);
  for (let x = 0; x < 32; x++) { const d = Math.abs(x - 15.5) / 7; if (d < 1) { fu[59 * 32 + x] = 0.55 + 0.45 * (1 - d * d); fu[58 * 32 + x] = (0.55 + 0.45 * (1 - d * d)) * 0.9; } }
  const forma = new Float32Array(32 * 60);
  // envolvente de llama: ancha abajo y angosta arriba (lo de afuera enfría de más: puntas, no columna)
  for (let y = 0; y < 60; y++) for (let x = 0; x < 32; x++) { const u = (59 - y) / 59, mitad = 9.5 * (1 - u) ** 0.75 + 2; forma[y * 32 + x] = Math.max(0, Math.min(1, (mitad - Math.abs(x - 15.5)) / 3)); }
  const f = D.crearFuego({ ancho: 32, alto: 60, forma: { tipo: 'mapa', fuente: fu, forma }, paleta, semilla, decay: D.decayPara(0.62, 60), humo: 0, turbulencia: 0.45, ruido: 0.3, margen: 1 });
  const cs = cuadrosDoom(f, { cuadros: 8, celda: 2, pasos: 2, filtro: 0.6, k: 1.15, pie: 1.2 });
  return cs.map((c) => { const L = lamina(64, 128); for (let y = 0; y < 120; y++) L.d.set(c.d.subarray(y * 64 * 4, (y + 1) * 64 * 4), y * 64 * 4); return L; });
}
