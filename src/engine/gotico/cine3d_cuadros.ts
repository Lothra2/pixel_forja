import * as D from './fuego_doom';
import { cuadrosDoom, fuegoTrasVidrios } from './cine_fuego';
import type { Lamina } from './cine';
import { baseCamara, proyectar, type V3 } from './render';
import { hexLin, escalar, type Capas, type Cartel, type Particula, type C3 } from './cine3d';
import { armarValle, deCat, type Plano, type TipoFuego } from './cine3d_valle';
import type { Plano3D, Armado, Extras } from './cine3d_toma';

/**
 * Los planos del valle en 3D como planos horneables: la escena, su revelado y lo que se mueve (el fuego de Doom en el
 * tejado, los ventanales, la puerta, la antorcha, la hoguera y la brasa; el fuego detrás de los vitrales; las brasas que
 * suben; el latido de la luz). Las tiras de Doom tienen los cuadros del plano y empalman (se repiten sin salto).
 */

const NF = 16, FPS = 12;
const tirasFuego = new Map<string, Lamina[]>();
/** Tira de una llama de Doom que empalma: lengua de tejado, boca de puerta, ventanal o antorcha. */
export function tiraDoom(tipo: TipoFuego, semilla: number, nf = NF): Lamina[] {
  const k = `${tipo}|${semilla}|${nf}`;
  let t = tirasFuego.get(k);
  if (t) return t;
  const [an, al, forma, altura, viento] = (tipo === 'techo' ? [34, 120, { tipo: 'llama', ancho: 0.5, afinar: 0.35 }, 0.6, 0.16]
    : tipo === 'puerta' ? [30, 54, { tipo: 'puerta', ojiva: true }, 0.92, 0.04]
      : tipo === 'ventana' ? [16, 36, { tipo: 'llama', ancho: 0.6, afinar: 0.4 }, 0.7, 0.1]
        : [12, 28, { tipo: 'llama', ancho: 0.55, afinar: 0.5 }, 0.75, 0.1]) as [number, number, D.Forma, number, number];
  const f = D.crearFuego({ ancho: an, alto: al, forma, paleta: 'infierno', semilla, decay: D.decayPara(altura, al), viento, rafagas: 0.25, turbulencia: 0.5, ruido: 0.45, humo: 0, margen: 2, brillo: 1.25, pegada: 0.6 });
  D.pasos(f, 80);
  t = cuadrosDoom(f, { cuadros: nf, celda: 2, pasos: 2, filtro: 0.55, k: 1, pie: 2 });
  tirasFuego.set(k, t);
  return t;
}

const tirasVitral = new WeakMap<Capas, { x: number; y: number; cuadros: Lamina[] } | null>();
/** Fuego de Doom detrás de los vitrales: la máscara sale del trazado (dónde se ve el vidrio en este encuadre). */
function vitrales(c: Capas): { x: number; y: number; cuadros: Lamina[] } | null {
  if (tirasVitral.has(c)) return tirasVitral.get(c)!;
  const m = c.marcas.vitral;
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
  if (m) for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (m[y * c.w + x] > 0.05) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < 0) { tirasVitral.set(c, null); return null; }
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 8); x1 = Math.min(c.w - 1, x1 + 2); y1 = Math.min(c.h - 1, y1 + 2);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, mm = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mm[y * w + x] = Math.min(1, m[(y + y0) * c.w + x + x0] * 1.3);
  const r = { x: x0, y: y0, cuadros: fuegoTrasVidrios(mm, w, h, { cuadros: NF, celda: 1, paleta: 'infierno', semilla: 41, alto_px: 14, fondo: { c: [1, 0.32, 0.08], k: 0.35 }, k: 1.2 }) };
  tirasVitral.set(c, r);
  return r;
}

/** Cuánto late el fuego en el instante t; empalma cada NF / FPS segundos. */
const latido = (t: number) => { const u = ((t * FPS) / NF) * Math.PI * 2; return 0.9 + 0.06 * Math.sin(u) + 0.04 * Math.sin(u * 3 + 1) + 0.03 * Math.sin(u * 5 + 2); };
const az = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
/** Brasas que suben del incendio (suman), en bucle de NF cuadros. */
function brasas(t: number): Particula[] {
  const ps: Particula[] = [], naranja = hexLin('#ff7a2a'), P = NF / FPS;
  for (let i = 0; i < 260; i++) {
    const base = deCat((az(i, 1) - 0.5) * 200, (az(i, 2) - 0.5) * 320, 240 + az(i, 3) * 100);
    const vida = P * (1 + Math.floor(az(i, 4) * 3)), f = ((t + az(i, 5) * vida) % vida) / vida, sube = f * (420 + az(i, 6) * 520);
    ps.push({ p: [base[0] + sube * 0.45 + Math.sin(f * 6.28 + i) * 8, base[1] + sube * 0.1, base[2] + sube], r: 0.6 + az(i, 7) * 0.9, c: escalar(naranja, 5 * Math.sin(f * Math.PI) * (0.3 + az(i, 8))), a: 1, suma: true, v: [24, 5, 70] });
  }
  return ps;
}
type ArmadoValle = Armado & { fuegos: ReturnType<typeof armarValle>['fuegos'] };
function fuegoValle(a: ArmadoValle, c: Capas, t: number): Extras {
  const fi = Math.round(t * FPS) % NF;
  const carteles: Cartel[] = a.fuegos.map((f) => ({ p: f.p, ancho: f.ancho, alto: f.alto, lam: tiraDoom(f.tipo, f.semilla)[(fi + f.semilla * 5) % NF], k: f.tipo === 'antorcha' ? 2 : f.tipo === 'puerta' ? 2.4 : f.tipo === 'ventana' ? 1.8 : 2.1, fondo: f.tipo === 'antorcha' ? 6 : f.ancho }));
  // la catedral arde (muchas lenguas): fuego detrás de los vitrales y brasas que suben
  const arde = a.fuegos.length > 3, vt = arde ? vitrales(c) : null;
  return { flick: latido(t), carteles, pantalla: vt ? [{ lam: vt.cuadros[fi], x: vt.x, y: vt.y, k: 3.2 }] : [], particulas: arde ? brasas(t) : [] };
}
/** Zonas que se mueven: la catedral si arde (con sus brasas) y cada fuego suelto con su luz alrededor; si se pisan, una sola. */
function zonasValle(a: Armado) {
  const b = baseCamara(a.cam), caja = (pts: V3[], m: number): [number, number, number, number] | null => {
    const q = pts.map((p) => proyectar(b, p)).filter((p): p is [number, number, number] => !!p);
    return q.length ? [Math.min(...q.map((p) => p[0])) - m, Math.min(...q.map((p) => p[1])) - m, Math.max(...q.map((p) => p[0])) + m, Math.max(...q.map((p) => p[1])) + m] : null;
  };
  const fu = (a as ArmadoValle).fuegos, c0 = deCat(0, 0, 0), enCat = (p: V3) => Math.hypot(p[0] - c0[0], p[1] - c0[1]) < 420 && p[2] < c0[2] + 700;
  const out: { caja: [number, number, number, number]; escala: number }[] = [];
  if (fu.some((f) => enCat(f.p))) { const cat: V3[] = []; for (const x of [-140, 140]) for (const y of [-260, 240]) for (const z of [-20, 760]) cat.push(deCat(x, y, z)); const k = caja(cat, 10); if (k) out.push({ caja: k, escala: 2 }); }
  for (const f of fu) if (!enCat(f.p)) { const r = f.tipo === 'antorcha' ? 14 : Math.max(f.ancho * 1.5, 90), k = caja([[f.p[0] - r, f.p[1], f.p[2] - Math.min(50, f.alto)], [f.p[0] + r, f.p[1], f.p[2] + f.alto * 1.05]], 4); if (k) out.push({ caja: k, escala: 2 }); }
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    const A = out[i].caja, B = out[j].caja;
    if (A[0] < B[2] && B[0] < A[2] && A[1] < B[3] && B[1] < A[3]) { out[i].caja = [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[2], B[2]), Math.max(A[3], B[3])]; out.splice(j, 1); j = i; }
  }
  return out;
}

/** Alba: sombras hacia el azul petróleo, luces hacia el durazno, una S suave de contraste. */
function gradoAlba(c: C3): C3 {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], s = 1.12, sombra = (1 - Math.min(1, l * 4)) ** 2, luz = Math.min(1, Math.max(0, (l - 0.25) * 2));
  const q: C3 = [l + (c[0] - l) * s - 0.006 * sombra + 0.02 * luz, l + (c[1] - l) * s + 0.002 * sombra + 0.004 * luz, l + (c[2] - l) * s + 0.012 * sombra - 0.02 * luz];
  return q.map((v) => { const x = Math.max(0, v); return x < 0.18 ? x * (0.85 + x * 0.83) : x; }) as C3;
}
/** Noche: negros hondos y fríos; lo cálido lo pone solo el fuego. */
function gradoNoche(c: C3): C3 {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], fr = (1 - Math.min(1, l * 5)) ** 2;
  return [Math.pow(Math.max(0, c[0]), 1.08), Math.pow(Math.max(0, c[1]), 1.04) + 0.003 * fr, c[2] + 0.012 * fr];
}

const valles = new Map<string, ReturnType<typeof armarValle>>();
const valle = (p: Plano, w: number, h: number) => { const k = `${p}|${w}|${h}`; let v = valles.get(k); if (!v) { v = armarValle(p, { w, h }); valles.set(k, v); } return v; };
const planoValle = (id: string, plano: Plano, revelado: Plano3D['revelado'], particulas: Plano3D['particulas'], fuego: boolean): Plano3D => ({
  id, particulas, paralaje: 0.85, armar: (w, h) => valle(plano, w, h), revelado,
  ...(fuego ? { flickBase: 0.84, cuadros: NF, fps: FPS, zonas: zonasValle, extras: (a: Armado, c: Capas, t: number) => fuegoValle(a as ArmadoValle, c, t) } : {}),
});
const REV_NOCHE: Plano3D['revelado'] = { t: 0, exposicion: 1.3, derrame: { k: 0.35, r: 4 }, bloom: { k: 0.4, umbral: 0.75 }, grado: gradoNoche };
export const PLANOS_VALLE: Plano3D[] = [
  planoValle('i01_valle', 'i01', { t: 0, exposicion: 1.0, rayos: { k: 0.25, c: [1, 0.85, 0.7], umbral: 0.3 }, derrame: { k: 0.55, r: 5 }, bloom: { k: 0.22, umbral: 0.9 }, grado: gradoAlba }, 'nieve', false),
  planoValle('i04_cielo', 'i04', { t: 0, exposicion: 1.7, derrame: { k: 0.4, r: 4 }, bloom: { k: 0.45, umbral: 0.8 }, grado: gradoNoche }, 'nieve', false),
  planoValle('i05_brasa', 'i05', { t: 0, exposicion: 1.3, derrame: { k: 0.4, r: 4 }, bloom: { k: 0.5, umbral: 0.75 }, grado: gradoNoche }, 'brasas', true),
  planoValle('i06_impacto', 'i06', REV_NOCHE, 'ceniza', true),
  planoValle('i09_fuego', 'i09', { ...REV_NOCHE, exposicion: 1.1, bloom: { k: 0.25, umbral: 0.85 } }, 'ceniza', true),
  planoValle('i10_tu', 'i10', { ...REV_NOCHE, exposicion: 1.35 }, 'brasas', true),
];
