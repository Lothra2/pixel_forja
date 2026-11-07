import * as D from './fuego_doom';
import { cuadrosDoom, fuegoTrasVidrios } from './cine_fuego';
import type { Lamina } from './cine';
import { objeto, herramientas } from './objeto';
import { hash3, caja, palo, poliedro, cilindro, elipsoide, esfera, masa, bulto, hueso, baseCamara, proyectar, cajaPieza, type Pieza, type V3 } from './render';
import { MATERIALES } from './materiales';
import { personaje, type Cuerpo, type Equipo } from './cuerpo';
import { EscenaCine, Terreno, hexLin, mezclar, escalar, moverPiezas, giroEje, type Atmosfera, type C3, type Particula, type Pluma, type Cartel, type Capas } from './cine3d';
import { camaraBase, fbm2, muertoSeco, cadena, huecoApuntado, arcoApuntado, campana, type PoseMuerto } from './cine3d_interior';
import type { Plano3D, Armado, Extras } from './cine3d_toma';
import './catalogo/jefes';
import './catalogo/jefes2';
import './catalogo/hielo2';
import './catalogo/nieve2';
import './catalogo/fortaleza2';
import './catalogo/ahogada';
import './catalogo/celestial';
import './catalogo/abadia_oria';
import './catalogo/casas';
import './catalogo/cementerio';
import { HEROES } from './catalogo/personajes';

/**
 * Los cierres de los actos 4, 5 y 6 en 3D (los planos de GUION.acto_4/5/6), con el mismo método que la intro: una
 * escena entera con UNA luz principal y la misma bruma, mirada con la cámara libre, horneada en capas (fondo, frente,
 * fuego_N, luz_N) por scripts/gotico-cine3d.ts. Personajes y monstruos van a contraluz o en silueta, con luz de borde;
 * brillan solo ojos, runas, armas encantadas, fuego y magia.
 * - acto_4 (Hrimgard): el Trono de Hjaldur (el rey cae de rodillas, el hacha partida, los muertos en sus columnas de
 *   hielo); el Fortín de Vel al alba (Vigdis con su farol en la puerta, o su tumba con el farol encima: un plano por
 *   valor, `p2_fortin@vigdis_viva` y `p2_fortin@vigdis_muerta`); la Herida al sur, una boca de fuego en el cielo con
 *   cuatro brasas que vuelan a ella.
 * - acto_5 (la Herida): Ozmaren revienta en el pozo; el héroe con la Brasa (se apaga o entra en él: `p2_eleccion@...`);
 *   el mar del norte que se parte bajo un rayo; Ysmeral afuera del agua, con fuego frío de ánimas en los vitrales.
 * - acto_6 (Ysmeral): la Campana que Ahoga se raja; la marea que vuelve; el cielo que se rompe como un vidrio con la
 *   escalera de oro detrás; Aun-Saar en el Trono Sediento con la boca del pecho abierta.
 * Medidas del taller: una persona mide 61 (una unidad ~3 cm). z hacia arriba.
 */

const TAU = Math.PI * 2;
const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (a: number, b: number, v: number) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
/** Azar estable 0..1. */
const az = (i: number, k = 0) => hash3(i * 31 + 7, k * 17 + 3, 1291);
/** Dirección desde el rumbo (grados desde +x, contra reloj) y la elevación en grados. */
const dirAz = (a: number, e: number): V3 => { const A = (a * Math.PI) / 180, E = (e * Math.PI) / 180; return [Math.cos(A) * Math.cos(E), Math.sin(A) * Math.cos(E), Math.sin(E)]; };
function gradiente(paradas: [number, C3][], e: number): C3 {
  let k = 0; while (k < paradas.length - 2 && e > paradas[k + 1][0]) k++;
  const [a, ca] = paradas[k], [b, cb] = paradas[k + 1];
  return mezclar(ca, cb, suave(a, b, e));
}
/** Bancos de nubes con volumen (como en el valle): cobertura, luz del borde hacia `luz` y espesor. */
function nubes(d: V3, s: number, esc: number, cubre: number, alto: number, luz: V3, estira = 1.7): { a: number; luz: number; espesor: number } {
  if (d[2] <= 0.005) return { a: 0, luz: 0, espesor: 0 };
  const k = alto / d[2], u = (d[0] * k) / (esc * estira), v = (d[1] * k) / esc;
  const den = (x: number, y: number) => {
    const wx = x + (fbm2(x * 0.6 + 3, y * 0.6, 3, s + 1) - 0.5) * 1.4, wy = y + (fbm2(x * 0.6, y * 0.6 + 7, 3, s + 2) - 0.5) * 1.4;
    return fbm2(wx, wy, 6, s) * 0.7 + fbm2(wx * 0.35, wy * 0.35, 2, s + 4) * 0.45 - 0.15;
  };
  const n = den(u, v), ll = Math.hypot(luz[0], luz[1]) || 1, n2 = den(u + (luz[0] / ll) * 0.12, v + (luz[1] / ll) * 0.12);
  return { a: suave(cubre, cubre + 0.07, n) * suave(0.01, 0.08, d[2]), luz: sat((n - n2) * 6 + 0.25) * (1 - suave(cubre + 0.05, cubre + 0.3, n) * 0.6), espesor: sat((n - cubre) * 4) };
}
const elev = (d: V3) => Math.asin(Math.max(-1, Math.min(1, d[2])));
/** Guarda lo armado por tamaño (el horneado arma la misma escena varias veces). */
const guardado = new Map<string, unknown>();
function memo<T>(k: string, f: () => T): T { let v = guardado.get(k) as T | undefined; if (!v) { v = f(); guardado.set(k, v); } return v; }

// ================================================================== assets
/** Las piezas de un objeto del catálogo, sin la niebla de utilería ni el piso que resta (el del mosaico del juego). */
function piezasDe(id: string, v: string, seed = 1, f = 0): Pieza[] {
  const a = objeto(id).armar(v, f, herramientas(seed)), ps = Array.isArray(a) ? a : a.piezas;
  return ps.filter((p) => p.mat !== 'abo_niebla' && !(p.resta && (() => { const b = cajaPieza(p); return b[3] - b[0] > 200 || b[4] - b[1] > 200; })()));
}
/** Las piezas con otro material (para la masa: también sus componentes). */
function conMat(ps: Pieza[], f: (m: string) => string): Pieza[] {
  return ps.map((p): Pieza => (p.k === 'masa' ? { ...p, mat: f(p.mat), comps: p.comps.map((c) => ({ ...c, mat: c.mat ? f(c.mat) : c.mat })) } : { ...p, mat: f(p.mat) }));
}
/** Centro de una pieza. */
const centro = (p: Pieza): V3 => { const b = cajaPieza(p); return [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2]; };
/** Peñasco anguloso de bloques convexos (como en el valle). */
function roca(s: number, R: number, mat: string, aplasta = 0.8): Pieza[] {
  const out: Pieza[] = [], n = 2 + Math.floor(az(s, 1) * 2);
  for (let b = 0; b < n; b++) {
    const a0 = az(s, b + 2) * TAU, d0 = b ? R * (0.35 + az(s, b + 3) * 0.3) : 0, cx = Math.cos(a0) * d0, cy = Math.sin(a0) * d0, rr = R * (b ? 0.55 + az(s, b + 4) * 0.3 : 1);
    const alto = rr * (0.7 + az(s, b + 5) * 0.7), pts: V3[] = [];
    for (let i = 0; i < 11; i++) {
      const a = az(s * 3 + b, i + 10) * TAU, r = rr * (0.55 + az(s * 3 + b, i + 30) * 0.45), z = (az(s * 3 + b, i + 50) * 1.1 - 0.35) * alto, k = 1 - Math.max(0, z / alto) * 0.45;
      pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * aplasta * k, z]);
    }
    out.push(poliedro(pts, { mat, tono: (az(s, b + 6) - 0.5) * 0.12 }));
  }
  return out;
}
/** Aguja de hielo o de roca: un prisma irregular que se afina hasta la punta (base en el origen). */
function aguja(s: number, r: number, alto: number, mat: string, lados = 6, inclina = 0): Pieza {
  const pts: V3[] = [], ix = (az(s, 9) - 0.5) * inclina * alto, iy = (az(s, 10) - 0.5) * inclina * alto;
  for (let i = 0; i < lados; i++) { const a = (i / lados) * TAU + az(s, i) * 0.6, rr = r * (0.7 + az(s, i + 20) * 0.5); pts.push([Math.cos(a) * rr, Math.sin(a) * rr, -2]); pts.push([Math.cos(a) * rr * 0.55 + ix * 0.6, Math.sin(a) * rr * 0.55 + iy * 0.6, alto * (0.55 + az(s, i + 40) * 0.2)]); }
  pts.push([ix, iy, alto]);
  return poliedro(pts, { mat, tono: (az(s, 30) - 0.5) * 0.15 });
}

// ------------------------------------------------------------------ materiales de estos actos
const M = MATERIALES;
/** El hielo de adentro del salón: azul hondo y oscuro, que a contraluz se enciende en el borde. */
M.cb_hielo_hondo = { rampa: ['#02060c', '#040b16', '#071222', '#0b1a30', '#10243f', '#16304f', '#1e3e62', '#2a5078'], ruido: 0.25, escala: 0.08, brillo: 0.85, patron: (p) => (Math.abs(Math.sin(p[2] * 0.05 + Math.sin(p[0] * 0.02) * 2)) < 0.05 ? 0.12 : 0) };
/** Magia de hielo que se escapa por la rajadura del hacha (emite). */
M.cb_hielo_luz = { rampa: ['#2a7aa8', '#58b8e0', '#9ee4ff', '#e2f8ff'], ruido: 0.2, escala: 0.4, emite: true };
M.cb_roca_fria = { rampa: ['#020203', '#050506', '#09090b', '#0e0f12', '#14161a', '#1b1e23', '#23272d'], ruido: 0.4, escala: 0.06, brillo: 0.25 };

// ------------------------------------------------------------------ fuego de Doom de estas escenas
const NF = 16, FPS = 12;
type TipoLlama = 'techo' | 'antorcha' | 'farol' | 'brasa' | 'cometa' | 'chorro';
interface Fuego { p: V3; ancho: number; alto: number; semilla: number; tipo: TipoLlama; paleta?: D.NombrePaleta; k?: number; /** cuánto puede estar detrás de lo que tapa y verse igual (por omisión, su ancho) */ fondo?: number }
const tiras = new Map<string, Lamina[]>();
/** Tira de una llama de Doom que empalma (16 cuadros a 12 por segundo). */
function tiraFuego(tipo: TipoLlama, semilla: number, paleta: D.NombrePaleta = 'infierno'): Lamina[] {
  const k = `${tipo}|${semilla}|${paleta}`;
  let t = tiras.get(k);
  if (t) return t;
  const [an, al, forma, altura, viento] = (tipo === 'techo' ? [34, 120, { tipo: 'llama', ancho: 0.5, afinar: 0.35 }, 0.6, 0.16]
    : tipo === 'farol' ? [10, 22, { tipo: 'llama', ancho: 0.5, afinar: 0.6 }, 0.8, 0.03]
      : tipo === 'brasa' ? [26, 48, { tipo: 'pira', ancho: 18, alto: 5 }, 0.55, 0.08]
        : tipo === 'cometa' ? [20, 90, { tipo: 'llama', ancho: 0.55, afinar: 0.5 }, 0.75, 0.05]
          : tipo === 'chorro' ? [40, 110, { tipo: 'llama', ancho: 0.7, afinar: 0.2 }, 0.75, 0.12]
            : [12, 28, { tipo: 'llama', ancho: 0.55, afinar: 0.5 }, 0.75, 0.1]) as [number, number, D.Forma, number, number];
  const f = D.crearFuego({ ancho: an, alto: al, forma, paleta, semilla, decay: D.decayPara(altura, al), viento, rafagas: 0.25, turbulencia: 0.5, ruido: 0.45, humo: 0, margen: 2, brillo: 1.25, pegada: 0.6 });
  D.pasos(f, 80);
  t = cuadrosDoom(f, { cuadros: NF, celda: 2, pasos: 2, filtro: 0.55, k: 1, pie: 2 });
  tiras.set(k, t);
  return t;
}
/** Cuánto late el fuego en el instante t; empalma cada NF / FPS segundos. */
const latido = (t: number) => { const u = ((t * FPS) / NF) * TAU; return 0.9 + 0.06 * Math.sin(u) + 0.04 * Math.sin(u * 3 + 1) + 0.03 * Math.sin(u * 5 + 2); };
type ArmadoB = Armado & { fuegos: Fuego[]; vitral?: { paleta: D.NombrePaleta; k: number } };
/** Los carteles de Doom del cuadro (el fuego que late en el canal 1 si `latir`). */
function cartelesDe(a: ArmadoB, t: number): Cartel[] {
  const fi = Math.round(t * FPS) % NF;
  return a.fuegos.map((f) => ({ p: f.p, ancho: f.ancho, alto: f.alto, lam: tiraFuego(f.tipo, f.semilla, f.paleta)[(fi + f.semilla * 5) % NF], k: f.k ?? 2.2, fondo: f.fondo ?? f.ancho }));
}
/** Una tira por fuego con su luz alrededor; las que se pisan se juntan. */
function zonasDe(a: Armado, margen = 8, escala = 2) {
  const b = baseCamara(a.cam), out: { caja: [number, number, number, number]; escala: number }[] = [];
  for (const f of (a as ArmadoB).fuegos) {
    const q = [[f.p[0] - f.ancho, f.p[1], f.p[2] - 2], [f.p[0] + f.ancho, f.p[1], f.p[2] + f.alto * 1.1], [f.p[0], f.p[1] - f.ancho, f.p[2] + f.alto * 0.5], [f.p[0], f.p[1] + f.ancho, f.p[2] + f.alto * 0.5]].map((p) => proyectar(b, p as V3)).filter((p): p is [number, number, number] => !!p);
    if (q.length) out.push({ caja: [Math.min(...q.map((p) => p[0])) - margen, Math.min(...q.map((p) => p[1])) - margen, Math.max(...q.map((p) => p[0])) + margen, Math.max(...q.map((p) => p[1])) + margen], escala });
  }
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    const A = out[i].caja, B = out[j].caja;
    if (A[0] < B[2] + 4 && B[0] < A[2] + 4 && A[1] < B[3] + 4 && B[1] < A[3] + 4) { out[i].caja = [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[2], B[2]), Math.max(A[3], B[3])]; out.splice(j, 1); j = i; }
  }
  return out.filter((z) => z.caja[2] > 0 && z.caja[3] > 0 && z.caja[0] < a.cam.w && z.caja[1] < a.cam.h);
}
const tirasVitral = new WeakMap<Capas, { x: number; y: number; cuadros: Lamina[] } | null>();
/** Fuego de Doom detrás de los vitrales (la máscara sale del trazado: dónde se ve el vidrio en este encuadre). */
function vitrales(c: Capas, paleta: D.NombrePaleta): { x: number; y: number; cuadros: Lamina[] } | null {
  if (tirasVitral.has(c)) return tirasVitral.get(c)!;
  const m = c.marcas.vitral;
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
  if (m) for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (m[y * c.w + x] > 0.05) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < 0) { tirasVitral.set(c, null); return null; }
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 8); x1 = Math.min(c.w - 1, x1 + 2); y1 = Math.min(c.h - 1, y1 + 2);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, mm = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mm[y * w + x] = Math.min(1, m[(y + y0) * c.w + x + x0] * 1.3);
  const fondo: [number, number, number] = paleta === 'animas' ? [0.05, 0.3, 0.26] : [1, 0.32, 0.08];
  const r = { x: x0, y: y0, cuadros: fuegoTrasVidrios(mm, w, h, { cuadros: NF, celda: 1, paleta, semilla: 41, alto_px: 14, fondo: { c: fondo, k: 0.35 }, k: 1.2 }) };
  tirasVitral.set(c, r);
  return r;
}
/** Lo que se mueve de una escena con fuegos: los carteles, el fuego de los vitrales y el latido de la luz del canal 1. */
function extrasFuego(a: ArmadoB, c: Capas, t: number, o: { latir?: boolean; particulas?: (t: number) => Particula[] } = {}): Extras {
  const fi = Math.round(t * FPS) % NF, vt = a.vitral ? vitrales(c, a.vitral.paleta) : null;
  return { flick: o.latir === false ? 1 : latido(t), carteles: cartelesDe(a, t), pantalla: vt ? [{ lam: vt.cuadros[fi], x: vt.x, y: vt.y, k: a.vitral!.k }] : [], particulas: o.particulas ? o.particulas(t) : [] };
}

// ------------------------------------------------------------------ revelados
/** Noche fría: negros hondos y azules; lo cálido lo pone solo el fuego. */
function gradoNoche(c: C3): C3 {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], fr = (1 - Math.min(1, l * 5)) ** 2;
  return [Math.pow(Math.max(0, c[0]), 1.08), Math.pow(Math.max(0, c[1]), 1.04) + 0.003 * fr, c[2] + 0.012 * fr];
}
/** Hielo: las sombras hacia el azul acero, las luces apenas cian; los negros quedan negros. */
function gradoHielo(c: C3): C3 {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], s = (1 - Math.min(1, l * 4)) ** 2;
  return [Math.max(0, Math.pow(Math.max(0, c[0]), 1.1) - 0.004 * s), Math.max(0, c[1] + 0.001 * s), Math.max(0, c[2] + 0.014 * s)];
}
/** Alba fría: sombras al azul pizarra, luces apenas tibias. */
function gradoAlba(c: C3): C3 {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], sombra = (1 - Math.min(1, l * 4)) ** 2, luz = sat((l - 0.3) * 2);
  return [Math.max(0, l + (c[0] - l) * 1.08 - 0.004 * sombra + 0.012 * luz), Math.max(0, l + (c[1] - l) * 1.08 + 0.002 * sombra), Math.max(0, l + (c[2] - l) * 1.08 + 0.012 * sombra - 0.01 * luz)];
}
/** Fuego: negros que no se lavan y el rojo que manda. */
const gradoFuego = (c: C3): C3 => [Math.max(0, c[0]) ** 1.02, Math.max(0, c[1]) ** 1.06, Math.max(0, c[2]) ** 1.08 + 0.004];

// ================================================================== ACTO 4 · p1: el Trono de Hjaldur
/**
 * El salón del trono de hielo: un pasillo entre dos hileras de columnas de hielo con muertos adentro, que fuga hasta el
 * trono sobre su estrado; arriba, una rajadura del techo por donde entra la luz fría (la luz principal, de atrás: todo a
 * contraluz). Hjaldur cae de rodillas en el medio, enorme, en silueta con su filo de luz; su hacha partida en el piso
 * deja escapar la magia de hielo (el único foco: un cian que le sube por la barba).
 */
const HJ = { k: 1.75, y: 0 };
function hjaldur(): Pieza[] {
  // el rey en el golpe del especial (agachado, las manos en el piso): leído en silueta, cae de rodillas
  const ps = piezasDe('jefe_rey_escarcha_especial', 'se', 3, 5);
  // sin el hacha del modelo (asta de hierro, sus fajas, la hoja y su escarcha): va partida aparte
  const asta = ps.find((p) => p.k === 'cono' && p.mat === 'hierro') as Extract<Pieza, { k: 'cono' }> | undefined;
  const a0 = asta ? asta.o : [0, 0, 0] as V3, a1 = asta ? add(asta.o, asta.ez, asta.h) : [0, 0, 0] as V3;
  const cerca = (p: Pieza, r: number) => {
    const c = centro(p), d: V3 = [a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]], L2 = dot3(d, d) || 1, t = sat(((c[0] - a0[0]) * d[0] + (c[1] - a0[1]) * d[1] + (c[2] - a0[2]) * d[2]) / L2);
    return Math.hypot(c[0] - a0[0] - d[0] * t, c[1] - a0[1] - d[1] * t, c[2] - a0[2] - d[2] * t) < r || Math.hypot(c[0] - a1[0], c[1] - a1[1], c[2] - a1[2]) < 90;
  };
  return ps.filter((p) => !(['hierro', 'hielo', 'cu_cuero_negro', 'cu_ojo_hielo'].includes(p.mat) && p.k !== 'masa' && cerca(p, 14)) && !(p.mat === 'hierro' && p.k === 'masa') && !(p.mat === 'jf_hielo_azul' && cerca(p, 10) && centro(p)[2] < 40));
}
function armarHjaldur(w: number, h: number): ArmadoB {
  const esc = new EscenaCine(), fuegos: Fuego[] = [], frente: number[] = [];
  // el piso: hielo viejo con escarcha y nieve barrida contra las columnas
  esc.terreno = new Terreno({
    alto: (x, y) => (fbm2(x / 60, y / 60, 3, 301) - 0.5) * 6 + suave(300, 520, Math.abs(x)) * 60 * fbm2(x / 90, y / 90, 2, 302),
    techo: 120, grillas: [[-1400, -900, 1400, 2600, 4]],
    superficie: (p) => { const n = fbm2(p[0] / 40, p[1] / 40, 3, 303), v = Math.pow(1 - Math.abs(2 * fbm2(p[0] / 25, p[1] / 25, 3, 304) - 1), 10); return { albedo: mezclar(mezclar([0.05, 0.075, 0.11], [0.32, 0.36, 0.42], n * 0.6), [0.5, 0.6, 0.7], v * 0.3), brillo: 0 }; },
  });
  // el macizo del salón: muros y techo de roca helada con la rajadura del techo (resta) sobre el trono
  esc.ponerMundo([
    caja(0, 700, -40, 2400, 3600, 1300, { mat: 'cb_roca_fria' }),
    caja(0, 450, -60, 1060, 2700, 880, { mat: 'cb_roca_fria', resta: true }),
    // la grieta del muro del fondo, detrás del trono: un tajo vertical quebrado por donde entra la luz fría
    ...Array.from({ length: 9 }, (_, i) => {
      const z0 = 60 + i * 95, x0 = 330 + (az(i, 305) - 0.5) * 70 + Math.sin(i * 1.7) * 30 - i * 12, x1 = 330 + (az(i + 1, 305) - 0.5) * 70 + Math.sin((i + 1) * 1.7) * 30 - (i + 1) * 12, a0 = 14 + Math.sin((i / 8) * Math.PI) * 46 * (0.6 + az(i, 306) * 0.6), a1 = 14 + Math.sin(((i + 1) / 8) * Math.PI) * 46 * (0.6 + az(i + 1, 306) * 0.6);
      return poliedro([[x0 - a0, 1750, z0], [x0 + a0 * 0.8, 1750, z0], [x1 - a1, 1750, z0 + 100], [x1 + a1 * 0.8, 1750, z0 + 100], [x0 - a0 * 1.4, 2560, z0], [x0 + a0 * 1.3, 2560, z0], [x1 - a1 * 1.4, 2560, z0 + 100], [x1 + a1 * 1.3, 2560, z0 + 100]], { mat: 'cb_roca_fria', resta: true });
    }),
  ], { nieve: 0 });
  // carámbanos que cuelgan del techo y agujas de hielo en las paredes
  for (let i = 0; i < 70; i++) {
    const x = (az(i, 310) - 0.5) * 1000, y = -300 + az(i, 311) * 2400, L = 30 + az(i, 312) * 120;
    if (Math.abs(x) < 160 && y > 500 && y < 1100) continue;
    esc.ponerMundo(moverPiezas([aguja(i + 320, 6 + az(i, 313) * 8, L, 'cb_hielo_hondo', 5, 0.2)], [[1, 0, 0], [0, 1, 0], [0, 0, -1]], [0, 0, 0], [x, y, 820]), { nieve: 0 });
  }
  for (let i = 0; i < 40; i++) {
    const lado = i % 2 ? 1 : -1, y = -400 + az(i, 330) * 2600, x = lado * (500 + az(i, 331) * 40);
    esc.ponerMundo(moverPiezas([aguja(i + 340, 20 + az(i, 332) * 30, 160 + az(i, 333) * 400, 'cb_hielo_hondo', 6, 0.3)], giroEje([0, 1, 0], lado * -0.25), [0, 0, 0], [x, y, -20]), { nieve: 0 });
  }
  // las columnas de hielo con los muertos adentro, en dos hileras que fugan hacia el trono
  const vars = ['guerrero', 'demonio', 'bruja', 'craneo', 'guerrero', 'bruja'];
  for (let i = 0; i < 7; i++) for (const lado of [-1, 1]) {
    const y = -110 + i * 230, x = lado * (250 + (i % 2) * 18);
    const ps = conMat(piezasDe('hie2_columna', vars[(i * 2 + (lado > 0 ? 1 : 0)) % vars.length], 400 + i * 2 + lado), (m) => (m.startsWith('hie2_hielo') || m === 'hie2_hondo' || m === 'hie2_escarcha' ? 'cb_hielo_hondo' : m));
    esc.poner(ps, { x, y, z: -2, giro: lado > 0 ? 180 : 0, k: 2.9 }, { nieve: 0.4 });
  }
  // el trono sobre su estrado, al fondo, bajo la rajadura
  esc.ponerMundo([caja(0, 860, -10, 360, 260, 34, { mat: 'cb_hielo_hondo' }), caja(0, 900, 20, 260, 180, 30, { mat: 'cb_hielo_hondo' })], { nieve: 0.6 });
  esc.poner(conMat(piezasDe('hie2_trono', 'vacio', 7), (m) => (m.startsWith('hie2_hielo') || m === 'hie2_hondo' ? 'cb_hielo_hondo' : m)), { x: 0, y: 930, z: 48, giro: -90, k: 3.2 }, { nieve: 0.5 });
  // Hjaldur, enorme, de rodillas en el medio del pasillo, de frente al ojo
  frente.push(esc.poner(conMat(hjaldur(), (m) => (m === 'jf_hielo_azul' ? 'cb_hielo_hondo' : m)), { x: 0, y: HJ.y, z: -6, giro: -90, k: HJ.k }, { nieve: 0 }));
  // hielo partido amontonado contra las piernas: se hunde de rodillas en lo que rompió al caer
  { const ps: Pieza[] = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + az(i, 380) * 0.3, r = 34 + az(i, 381) * 30; ps.push(...moverPiezas(roca(390 + i, 12 + az(i, 382) * 16, 'cb_hielo_hondo', 0.8), giroEje([0, 0, 1], a), [0, 0, 0], [Math.cos(a) * r * 1.2, HJ.y + Math.sin(a) * r * 0.7 - 6, -4])); } frente.push(esc.ponerMundo(ps, { nieve: 0.5 })); }
  // el hacha partida: el asta en dos y la hoja rajada que suelta su magia (el único foco)
  const hoja: V3 = [-118, -70, 4];
  const hacha: Pieza[] = [
    palo([-30, -40, 3], [-150, -10, 6], 3.2, { mat: 'hierro', r1: 2.8 }), palo([-150, -10, 6], [-162, -8, 7], 3.6, { mat: 'cu_cuero_negro' }),
    palo([60, -90, 3], [128, -40, 12], 3.0, { mat: 'hierro', r1: 2.6 }),
  ];
  // la hoja de hielo en media luna, partida en dos con la rajadura que brilla adentro
  for (const [dx, gi, s] of [[-10, 0, 1], [12, 18, 2]] as [number, number, number][]) {
    const pts: V3[] = [];
    for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI * 0.9 - 0.2; pts.push([Math.cos(a) * 34 * s * 0.6, Math.sin(a) * 30, 0], [Math.cos(a) * 34 * s * 0.6, Math.sin(a) * 30, 6], [Math.cos(a) * 18 * s * 0.6, Math.sin(a) * 16, 3]); }
    hacha.push(...moverPiezas([poliedro(pts, { mat: 'jf_hielo_azul', tono: -0.2 })], giroEje([0, 0, 1], (gi * Math.PI) / 180), [0, 0, 0], [hoja[0] + dx, hoja[1], hoja[2]]));
  }
  hacha.push(elipsoide(hoja[0], hoja[1] + 4, hoja[2] + 4, 3, 24, 2.5, { mat: 'cb_hielo_luz', giro: 75 }));
  for (let i = 0; i < 14; i++) { const a = az(i, 350) * TAU, r = 10 + az(i, 351) * 60; hacha.push(aguja(i + 360, 2 + az(i, 352) * 3, 5 + az(i, 353) * 8, 'jf_hielo_azul', 4, 1.2)); moverEn(hacha, [hoja[0] + Math.cos(a) * r, hoja[1] + Math.sin(a) * r * 0.6, 0]); }
  frente.push(esc.ponerMundo(hacha, { nieve: 0 }));
  esc.emision.cb_hielo_luz = { k: 4.5 };
  esc.emision.cu_ojo_hielo = { k: 0.3 };
  esc.emision.luz_vela = { k: 0.3 };
  esc.luces.push({ p: [hoja[0], hoja[1] - 6, 18], c: hexLin('#6ad0ff'), k: 6, r: 36, envuelve: 0.4, halo: 0.0005 });
  esc.luces.push({ p: [hoja[0] + 30, hoja[1] + 10, 50], c: hexLin('#5ab8ff'), k: 0.7, r: 110, envuelve: 0.3 });
  // primer plano: dos bloques de hielo partido a los costados, oscuros, que enmarcan
  frente.push(esc.ponerMundo([...moverPiezas(roca(371, 90, 'cb_hielo_hondo', 0.7), giroEje([0, 0, 1], 0.4), [0, 0, 0], [-330, -330, -20]), aguja(372, 26, 210, 'cb_hielo_hondo', 6, 0.5)].map((p, i, a) => (i === a.length - 1 ? moverPiezas([p], giroEje([0, 1, 0], 0.18), [0, 0, 0], [-300, -290, -10])[0] : p)), { nieve: 0.3 }));
  frente.push(esc.ponerMundo([...moverPiezas(roca(373, 70, 'cb_hielo_hondo', 0.7), giroEje([0, 0, 1], 1.4), [0, 0, 0], [300, -300, -16]), ...moverPiezas([aguja(374, 22, 170, 'cb_hielo_hondo', 6, 0.4)], giroEje([0, 1, 0], -0.2), [0, 0, 0], [280, -270, -10])], { nieve: 0.3 }));
  for (const g of frente) esc.frente.add(g);
  const atm = atmTrono(), cam = camaraBase([10, -560, 34], [0, 200, 150], 40, w, h);
  return { esc, atm, cam, fuegos, polvo: polvoEnLuz([280, 1750, 480], [0, 200, 120], 260, 0.22, 371, 500) };
}
/** Corre las últimas piezas puestas (la última) a `t`. */
function moverEn(ps: Pieza[], t: V3) { const p = ps.pop()!; ps.push(...moverPiezas([p], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], t)); }
/** Polvo (o escarcha) quieto suspendido en el haz de luz que va de `de` a `a`, para hornear en el fondo. */
function polvoEnLuz(de: V3, a: V3, r: number, k: number, s: number, n = 900): Particula[] {
  const out: Particula[] = [];
  for (let i = 0; i < n; i++) { const t = az(i, s), b = az(i, s + 1) * TAU, rr = Math.sqrt(az(i, s + 2)) * r * (0.3 + t * 0.9), p = add(de, [a[0] - de[0], a[1] - de[1], a[2] - de[2]], t); out.push({ p: [p[0] + Math.cos(b) * rr, p[1], p[2] + Math.sin(b) * rr * 0.6], r: 0.3 + az(i, s + 3) * 0.4, c: escalar([0.7, 0.85, 1], k * (0.4 + az(i, s + 4))), a: 0.8, suma: true }); }
  return out;
}
function atmTrono(): Atmosfera {
  const L = norm([280, 1500, 330]), frio = hexLin('#bcd8ff');
  const cielo = (d: V3): C3 => { const e = elev(d), g = Math.max(0, dot3(d, L)); return escalar(mezclar(hexLin('#2a3a58'), hexLin('#cfe2ff'), Math.pow(g, 8)), 0.6 + 2.4 * Math.pow(g, 30) + suave(0.5, 1.2, e)); };
  return {
    sol: { dir: L, c: frio, k: 2.6, ancho: 0.06 }, cielo,
    // el aire se enciende hacia la grieta (la luz que entra y se queda en la bruma): todo se recorta contra ese velo
    aire: (d) => { const g = Math.max(0, dot3(d, L)); return add(escalar(hexLin('#0a1322'), 0.45), hexLin('#7fa8e0'), 0.006 + 0.16 * Math.pow(g, 5) + 0.9 * Math.pow(g, 60)); },
    ambCielo: escalar(hexLin('#2c4670'), 0.05), ambSuelo: escalar(hexLin('#101826'), 0.05),
    niebla: { densidad: 1 / 3200, baja: 1 / 900, z0: 0, H: 80, ruido: 0.6, escalaRuido: 0.004 },
    borde: { c: hexLin('#cfe4ff'), k: 2.6 }, oclusion: 0.9, oclusionLargo: 200,
  };
}

// ================================================================== ACTO 4 · p2: el Fortín de Vel al amanecer
/**
 * El fortín sobre su loma nevada, a contraluz del alba fría (el cielo acero con una línea rosada detrás de las torres):
 * la muralla almenada, las dos torres del portón y el camino pisado que sube. Según Vigdis: ella en la puerta con su
 * farol colgado de un asta, o su tumba junto a la muralla con el farol encima. El farol es el único foco cálido.
 */
const NIEVE: C3 = [0.5, 0.54, 0.62];
type ValorVigdis = 'vigdis_viva' | 'vigdis_muerta';
/** Torre redonda con su techo cónico de pizarra y almenas debajo (base en el origen). */
function torre(r: number, alto: number, techo: number, s: number): Pieza[] {
  const ps: Pieza[] = [cilindro(0, 0, -30, r, alto + 30, { mat: 'abo_sillar_grueso', r1: r * 0.94 }), cilindro(0, 0, alto, r * 1.08, 10, { mat: 'abo_labra' })];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; ps.push(caja(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02, alto + 10, 9, 7, 13, { mat: 'abo_sillar', giro: (a * 180) / Math.PI + 90 })); }
  ps.push(cilindro(0, 0, alto + 16, r * 1.12, techo, { mat: 'abo_pizarra', r1: 0.5 }), palo([0, 0, alto + 16 + techo], [0, 0, alto + 30 + techo], 0.8, { mat: 'hierro' }));
  // troneras: rendijas oscuras
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 0.9 + (az(s, i) - 0.5) * 0.2; ps.push(caja(Math.cos(a) * r, Math.sin(a) * r, alto * (0.45 + i * 0.12), 3.5, 8, 16, { mat: 'negro', giro: (a * 180) / Math.PI + 90 })); }
  return ps;
}
/** Tramo de muralla almenada a lo largo de x (base en z = 0, adarve arriba). */
function muralla(L: number, alto: number, s: number): Pieza[] {
  const ps: Pieza[] = [caja(0, 0, -30, L, 22, alto + 30, { mat: 'abo_sillar', tono: (az(s, 1) - 0.5) * 0.08 }), caja(0, 0, alto, L + 1, 26, 4, { mat: 'abo_labra' })];
  for (let x = -L / 2 + 8; x < L / 2 - 4; x += 19) ps.push(caja(x, -8, alto + 4, 10, 8, 13, { mat: 'abo_sillar', tono: (az(s, Math.round(x)) - 0.5) * 0.1 }));
  return ps;
}
/** El farol de Vigdis: jaula de hierro con su vidrio encendido y el aro de colgar (base en el origen). Devuelve la llama. */
function farol(): { ps: Pieza[]; llama: V3 } {
  const ps: Pieza[] = [caja(0, 0, 0, 7, 7, 1.4, { mat: 'hierro' }), caja(0, 0, 10, 7.6, 7.6, 1.4, { mat: 'hierro' }), poliedro([[-3.8, -3.8, 11.4], [3.8, -3.8, 11.4], [-3.8, 3.8, 11.4], [3.8, 3.8, 11.4], [0, 0, 15]], { mat: 'hierro' })];
  for (const [x, y] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]]) ps.push(palo([x, y, 1], [x, y, 10.5], 0.45, { mat: 'hierro' }));
  ps.push(caja(0, 0, 1.4, 5.6, 5.6, 8.6, { mat: 'cb_vidrio_farol' }), palo([0, 0, 15], [0, 0, 18.5], 0.5, { mat: 'hierro' }));
  return { ps, llama: [0, 0, 3] };
}
M.cb_vidrio_farol = { rampa: ['#6a2a08', '#b04a10', '#e07a24', '#ffb050', '#ffd890'], ruido: 0.2, escala: 0.6, emite: true };
function armarFortin(w: number, h: number, valor: ValorVigdis): ArmadoB {
  const esc = new EscenaCine(), fuegos: Fuego[] = [], frente: number[] = [];
  const loma = (x: number, y: number) => 70 * Math.exp(-((x / 900) ** 2 + ((y - 120) / 520) ** 2)) + (fbm2(x / 400, y / 400, 4, 401) - 0.5) * 40 + Math.max(0, y - 900) * 0.04;
  const camino = (x: number, y: number) => Math.abs(x + 20 + Math.sin(y / 260) * 60 - Math.min(0, y) * 0.06);
  const alto = (x: number, y: number) => loma(x, y) + (fbm2(x / 30, y / 40, 3, 402) - 0.5) * 3 - (y < 0 ? 3 * (1 - suave(10, 40, camino(x, y))) : 0);
  esc.terreno = new Terreno({
    alto, techo: 900, grillas: [[-1600, -1400, 1600, 1600, 4], [-9000, -2000, 9000, 16000, 30]],
    superficie: (p) => { const rv = fbm2(p[0] / 60, p[1] / 60, 3, 403), c = p[1] < 0 ? 1 - suave(8, 34, camino(p[0], p[1]) + (rv - 0.5) * 14) : 0; return { albedo: mezclar(mezclar(NIEVE, escalar(NIEVE, 0.86), rv), [0.2, 0.2, 0.22], c * 0.7), brillo: 0.06 }; },
  });
  // montes lejanos: una sierra baja detrás del fortín (el alba se recorta en ella)
  const ter = esc.terreno, z0 = ter.h(0, 0);
  const sierra = (x: number, y: number) => suave(3000, 9000, y) * (420 + 900 * fbm2(x / 2600, y / 2600, 4, 404) ** 1.5);
  esc.terreno = new Terreno({ ...ter.def, alto: (x, y) => alto(x, y) + sierra(x, y), techo: 2000 });
  // la muralla del frente con el portón y sus dos torres, las torres de las esquinas y los muros que se van hacia atrás
  const Z = z0 - 4;
  for (const [x0, x1] of [[-430, -78], [78, 430]]) esc.poner(muralla(x1 - x0, 120, x0), { x: (x0 + x1) / 2, y: 0, z: Z });
  for (const sx of [-1, 1]) {
    esc.poner(torre(46, 200, 120, 410 + sx), { x: sx * 82, y: 0, z: Z });
    esc.poner(torre(52, 160, 110, 412 + sx), { x: sx * 440, y: 20, z: Z - 6 });
    esc.poner(muralla(380, 110, 414 + sx), { x: sx * 440, y: 210, z: Z - 6, giro: 90 });
  }
  // el portón: un arco apuntado entre las torres, con la puerta entreabierta (adentro, oscuro)
  const arco = arcoApuntado(64, 8, 30, 'abo_labra', 6);
  esc.poner([caja(0, 0, -20, 120, 30, 150, { mat: 'abo_sillar_grueso' }), ...huecoApuntado(64, 70, 18), ...arco.ps.map((p) => moverPiezas([p], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], [0, -14, 70])[0])], { x: 0, y: 0, z: Z });
  esc.ponerMundo([caja(-22, 12, Z, 22, 4, 96, { mat: 'abo_madera', giro: -50 }), caja(0, 22, Z, 64, 4, 110, { mat: 'negro' })], { nieve: 0 });
  // la torre del homenaje detrás, más alta, con una ventana apenas encendida (alguien dejó una luz)
  esc.poner(torre(60, 300, 150, 420), { x: -120, y: 260, z: Z + 10 });
  esc.ponerMundo([caja(-120 + 2, 260 - 61, Z + 10 + 210, 8, 4, 14, { mat: 'casas_ventana_luz' })], { nieve: 0 });
  esc.emision.casas_ventana_luz = { k: 0.5 };
  // estacas y una cerca rota que bajan por la loma, y piedras
  // un tramo de cerca caída junto al camino
  for (let i = 0; i < 5; i++) { const x = -330 + i * 30, y = -300 - i * 14; esc.ponerMundo([palo([x, y, ter.h(x, y) - 3], [x + 4, y - 3, ter.h(x, y) + 26 - i * 3], 1.8, { mat: 'abo_madera', r1: 1.1 }), palo([x - 2, y + 1, ter.h(x, y) + 14], [x + 28, y - 13, ter.h(x + 28, y - 13) + 4 + (i % 2) * 10], 1.2, { mat: 'abo_madera' })], { nieve: 0.6 }); }
  for (let i = 0; i < 18; i++) { const x = (az(i, 440) - 0.5) * 1600, y = -500 + az(i, 441) * 700; if (Math.abs(x + 20) < 80) continue; esc.ponerMundo(moverPiezas(roca(450 + i, 10 + az(i, 442) * 22, 'nie2_roca'), giroEje([0, 0, 1], az(i, 443) * 6), [0, 0, 0], [x, y, ter.h(x, y) - 6]), { nieve: 0.9 }); }
  // pinos oscuros a los costados y en primer plano (enmarcan)
  const pino = (x: number, y: number, s: number, k: number, fr = false) => { const g = esc.poner(piezasDe('nie2_pino', ['alto', 'mediano', 'gigante'][s % 3], s), { x, y, z: ter.h(x, y) - 3, giro: az(s, 1) * 360, k }); if (fr) frente.push(g); };
  for (let i = 0; i < 26; i++) { const lado = i % 2 ? 1 : -1, x = lado * (560 + az(i, 460) * 900), y = -200 + az(i, 461) * 900; pino(x, y, 470 + i, 1.4 + az(i, 462) * 0.8); }
  pino(-520, -420, 501, 1.9, true); pino(-470, -330, 502, 1.4, true); pino(80, -470, 503, 1.6, true);
  frente.push(esc.ponerMundo(moverPiezas(roca(505, 34, 'nie2_roca'), giroEje([0, 0, 1], 0.6), [0, 0, 0], [-170, -440, ter.h(-170, -440) - 12]), { nieve: 1 }));
  frente.push(esc.ponerMundo(moverPiezas(roca(506, 22, 'nie2_roca'), giroEje([0, 0, 1], 2.6), [0, 0, 0], [-60, -470, ter.h(-60, -470) - 8]), { nieve: 1 }));
  // Vigdis o su tumba
  const fl = farol();
  if (valor === 'vigdis_viva') {
    // de pie en la puerta, de frente al ojo; el farol cuelga del asta que planta a su derecha
    const x = 6, y = -34, zp = ter.h(x, y) - 1;
    const cu: Cuerpo = { genero: 'm', alto: 0.98, ancho: 0.92, musculo: 0.35, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'largo' };
    const eq: Equipo = { torso: { tipo: 'tunica', mat: 'cu_tela_parda' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, capa: { mat: 'cu_pelaje', largo: 1 }, cinturon: { mat: 'cu_cuero' }, cabeza: { tipo: 'capucha', mat: 'cu_pelaje' } };
    esc.poner(personaje(cu, eq, 's', 'quieto', 0), { x, y, z: zp, giro: -135 }, { nieve: 0 });
    const ax = x + 22, ay = y - 6;
    esc.ponerMundo([palo([ax, ay, zp - 4], [ax - 2, ay, zp + 86], 1.3, { mat: 'abo_madera' }), palo([ax - 2, ay, zp + 84], [ax - 12, ay, zp + 88], 0.8, { mat: 'hierro' })], { nieve: 0 });
    esc.ponerMundo(fl.ps.map((p) => moverPiezas([p], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], [ax - 12, ay, zp + 66])[0]), { nieve: 0 });
    const ll: V3 = [ax - 12, ay, zp + 66 + fl.llama[2]];
    fuegos.push({ p: ll, ancho: 4.2, alto: 8, semilla: 481, tipo: 'farol', k: 2.4 });
    esc.luces.push({ p: [ll[0], ll[1] - 4, ll[2] + 4], c: hexLin('#ffa050'), k: 5, r: 26, canal: 1, sombra: true, envuelve: 0.4, halo: 0.006 });
  } else {
    // la tumba junto a la muralla, a la izquierda del portón: el túmulo de piedras con nieve, una cruz de madera y el farol encima
    const x = -150, y = -56, zp = ter.h(x, y) - 2;
    const ps: Pieza[] = [masa([bulto([0, 0, 0], [40, 18, 11], { mat: 'abo_barro' }), bulto([6, 2, 4], [24, 12, 8], { mat: 'abo_barro' })], { mat: 'abo_barro', suave: 4 })];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rx = 38, ry = 17; ps.push(...moverPiezas(roca(510 + i, 5 + az(i, 511) * 3, 'nie2_roca'), giroEje([0, 0, 1], a), [0, 0, 0], [Math.cos(a) * rx, Math.sin(a) * ry, 1])); }
    ps.push(palo([-34, 0, -4], [-34, 0, 44], 1.8, { mat: 'abo_madera' }), palo([-44, 0, 32], [-24, 0, 32], 1.5, { mat: 'abo_madera' }));
    esc.poner(ps, { x, y, z: zp, giro: 4 }, { nieve: 1 });
    esc.ponerMundo(fl.ps.map((p) => moverPiezas([p], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], [x + 6, y, zp + 11])[0]), { nieve: 0 });
    const ll: V3 = [x + 6, y, zp + 11 + fl.llama[2]];
    fuegos.push({ p: ll, ancho: 4.2, alto: 8, semilla: 482, tipo: 'farol', k: 2.4 });
    esc.luces.push({ p: [ll[0], ll[1] - 4, ll[2] + 4], c: hexLin('#ffa050'), k: 5, r: 26, canal: 1, sombra: true, envuelve: 0.4, halo: 0.006 });
  }
  esc.emision.cb_vidrio_farol = { k: 3, canal: 1 };
  for (const g of frente) esc.frente.add(g);
  const atm = atmAlbaFria(), cam = camaraBase([-300, -560, z0 + 26], [-20, 0, z0 + 118], 40, w, h);
  return { esc, atm, cam, fuegos };
}
/** El alba fría: cielo acero, la línea rosada en el horizonte detrás del fortín y el sol todavía escondido. */
function atmAlbaFria(): Atmosfera {
  const L = dirAz(70, 3.5), rosa = hexLin('#d89a94');
  const pars: [number, C3][] = [[0, hexLin('#6c6e7c')], [0.04, hexLin('#4e5770')], [0.14, hexLin('#2c3652')], [0.4, hexLin('#141b30')], [0.9, hexLin('#070a16')]];
  const brillo = (d: V3, e: number) => { const g = Math.max(0, dot3(norm([d[0], d[1], 0]), norm([L[0], L[1], 0]))); return (0.5 * Math.pow(g, 18) + 0.12 * Math.pow(g, 3)) * Math.exp(-Math.max(0, e) * 14); };
  const aire = (d: V3): C3 => { const e = Math.min(0.03, Math.max(0, d[2])); return add(gradiente(pars, e), rosa, brillo(d, e) * 0.5); };
  const cielo = (d: V3): C3 => {
    const e = elev(d); if (e < 0.03) return aire(d);
    let c = add(gradiente(pars, e), rosa, brillo(d, e));
    for (const [sd, es, cu, al] of [[31.3, 2600, 0.48, 4200], [37.7, 1500, 0.55, 2400]] as [number, number, number, number][]) {
      const nb = nubes(d, sd, es, cu, al, L); if (nb.a <= 0) continue;
      const g = Math.max(0, dot3(d, L)), lz = (0.2 + nb.luz) * (Math.pow(g, 5) * 1.6 + 0.08);
      c = mezclar(c, add(escalar(hexLin('#2a3044'), 1 - nb.espesor * 0.4), rosa, lz * 0.45), nb.a * 0.9);
    }
    return c;
  };
  return {
    sol: { dir: L, c: hexLin('#d8c8d8'), k: 1.1, ancho: 0.03 }, cielo, aire,
    ambCielo: escalar(hexLin('#4c6290'), 0.32), ambSuelo: escalar(hexLin('#2a2e3a'), 0.3),
    niebla: { densidad: 1 / 7000, baja: 1 / 4000, z0: 0, H: 60, ruido: 0.6, escalaRuido: 0.0015 },
    borde: { c: hexLin('#e8d0d8'), k: 1.8 }, nieve: { albedo: NIEVE, desde: 0.55 }, oclusion: 0.85,
  };
}

// ================================================================== ACTO 4 · p3: la Herida al sur
/**
 * Desde una cresta del norte, de noche, mirando al sur por encima de los picos: el cielo se abre como una boca (labios
 * rotos casi negros, paredes de carne roja con estrías, el fondo de magma), su luz roja enciende las nubes por abajo y
 * deja un filo en las cumbres. Cuatro brasas sueltas cruzan el aire hacia ella, cada una con su estela.
 */
const BOCA = { az: 84, el: 12.5, ancho: 0.3, alto: 0.12 };
/**
 * La boca en el cielo (la misma familia que la herida de la intro, más abierta): un eje quebrado en tramos, un ancho que
 * cambia a tirones, cada labio con su borde roto y trozos sueltos, ramas que se afinan, y adentro la hondura: el labio
 * casi negro, las paredes de carne con estrías y el fondo de magma con vetas. Devuelve cada capa y el resplandor.
 */
function bocaCielo(d: V3) {
  const a = Math.atan2(d[1], d[0]) - (BOCA.az * Math.PI) / 180, u = Math.atan2(Math.sin(a), Math.cos(a)), e = elev(d), el0 = (BOCA.el * Math.PI) / 180;
  const L = BOCA.ancho, largo = Math.pow(Math.max(0, 1 - (u / L) ** 2), 0.6);
  const out = { dentro: false, labio: 0, pared: 0, magma: 0, veta: 0, prof: 0, glow: Math.exp(-Math.hypot(u * 1.2, (e - el0) * 1.5) / 0.2) };
  if (Math.abs(u) > L + 0.25) return out;
  const zz = (x: number) => { const k = Math.floor(x), f = x - k, y0 = hash3(k, 3, 687) - 0.5, y1 = hash3(k + 1, 3, 687) - 0.5; return y0 + (y1 - y0) * f; };
  const ec = el0 - u * 0.12 + zz(u * 9 + 4) * 0.04 + (fbm2(u * 40, 1, 2, 681) - 0.5) * 0.012;
  const W = (0.02 + BOCA.alto * Math.pow(fbm2(u * 2.6 + 2, 5, 3, 682), 1.1)) * largo;
  const sobre = W * (0.6 + 0.9 * (fbm2(u * 44, 2, 3, 683) - 0.5) + 0.4 * (fbm2(u * 160, 1, 2, 684) - 0.5));
  const bajo = W * (0.6 + 0.9 * (fbm2(u * 44, 9, 3, 685) - 0.5) + 0.4 * (fbm2(u * 160, 2, 2, 686) - 0.5));
  const v = e - ec, dentro = v > -bajo && v < sobre && W > 0.0005;
  let sv = dentro ? Math.min(v + bajo, sobre - v) / Math.max(1e-5, (sobre + bajo) / 2) : 0;
  for (const [u0, dir, sd, lr] of [[-0.2, 1, 691, 0.15], [-0.06, -1, 692, 0.17], [0.1, 1, 693, 0.2], [0.21, -1, 694, 0.12], [0.02, 1, 695, 0.1]] as [number, number, number, number][]) {
    const du = (u - u0) * dir; if (du < 0 || du > lr) continue;
    const q = du / lr, eb = ec + dir * du * (0.5 + 0.4 * (hash3(sd, 1, 695) - 0.5)) + (fbm2(u * 30, sd, 2, sd) - 0.5) * 0.02 * q, wb = 0.008 * (1 - q) * (0.6 + 0.8 * fbm2(u * 50, sd, 2, sd + 1));
    const db = Math.abs(e - eb); if (db < wb) sv = Math.max(sv, (1 - db / wb) * 0.5 * (1 - q * 0.5));
  }
  if (sv > 0) {
    const suelto = sv < 0.3 && fbm2(u * 150, e * 150, 2, 696) > 0.66 ? 1 : 0;
    out.dentro = true; out.labio = 1; out.pared = suave(0.05, 0.2, sv) * (1 - suelto); out.magma = suave(0.32, 0.85, sv) * (1 - suelto);
    out.prof = 0.55 + 0.45 * Math.abs(Math.sin(u * 230 + fbm2(u * 30, e * 30, 2, 697) * 6));
    out.veta = suave(0.6, 0.9, 1 - Math.abs(2 * fbm2(u * 55, e * 55, 3, 698) - 1)) * out.magma;
  }
  out.glow += Math.exp(-Math.abs(e - ec) / 0.07) * Math.exp(-((u / (L * 0.8)) ** 2)) * 0.5 * (0.5 + W / 0.06);
  return out;
}
const BOCA_DIR = dirAz(BOCA.az, BOCA.el);
function atmHerida(): Atmosfera {
  const rojo = hexLin('#ff4a18'), labio = hexLin('#140201'), pared = hexLin('#6a0c04'), magma = hexLin('#e8380c'), veta = hexLin('#ff6a1c');
  const pars: [number, C3][] = [[0, hexLin('#1e2030')], [0.06, hexLin('#161b2c')], [0.2, hexLin('#0e1428')], [0.5, hexLin('#070a18')], [0.9, hexLin('#03040a')]];
  const aire = (d: V3): C3 => { const e = Math.min(0.03, Math.max(0, d[2])), g = Math.max(0, dot3(norm([d[0], d[1], 0]), norm([BOCA_DIR[0], BOCA_DIR[1], 0]))); return add(gradiente(pars, e), rojo, 0.1 * Math.pow(g, 10) + 0.03 * Math.pow(g, 2)); };
  const cielo = (d: V3): C3 => {
    const e = elev(d); if (e < 0.03) return aire(d);
    let c = gradiente(pars, e);
    const hs = hash3(Math.floor(Math.atan2(d[1], d[0]) * 900), Math.floor(e * 900), 91);
    if (hs > 0.997) c = add(c, [0.9, 0.95, 1.1], (hs - 0.997) * 30);
    const b = bocaCielo(d);
    c = add(c, rojo, b.glow * 0.16);
    if (b.dentro) {
      let q: C3 = escalar(labio, 0.6);
      q = mezclar(q, escalar(pared, (0.5 + 0.9 * b.pared) * b.prof), b.pared);
      q = mezclar(q, escalar(mezclar(magma, veta, b.veta), 0.5 + 0.6 * b.magma + 0.5 * b.veta), b.magma);
      c = q;
    }
    // las nubes pasan por delante y se encienden de abajo con la luz de la boca
    for (const [sd, es, cu, al] of [[61.1, 2600, 0.47, 3800], [67.3, 1500, 0.54, 2200]] as [number, number, number, number][]) {
      const nb = nubes(d, sd, es, cu, al, [-BOCA_DIR[0], -BOCA_DIR[1], 0]); if (nb.a <= 0) continue;
      const k = b.glow * (0.3 + nb.luz) * 1.3, frio = escalar(hexLin('#121828'), 1 - nb.espesor * 0.5);
      c = mezclar(c, add(frio, hexLin('#ff5020'), k), nb.a * (b.dentro ? 0.6 : 0.9));
    }
    return c;
  };
  return {
    sol: { dir: norm([BOCA_DIR[0], BOCA_DIR[1], BOCA_DIR[2] + 0.05]), c: rojo, k: 0.28, ancho: 0.08 }, cielo, aire,
    ambCielo: escalar(hexLin('#2c4070'), 0.55), ambSuelo: escalar(hexLin('#141820'), 0.12),
    niebla: { densidad: 1 / 16000, baja: 1 / 5000, z0: 600, H: 500, ruido: 0.7, escalaRuido: 0.0004 },
    borde: { c: hexLin('#ff6a30'), k: 0.7 }, nieve: { albedo: [0.4, 0.42, 0.5], desde: 0.6 }, oclusion: 0.85,
  };
}
/** Las cuatro brasas: dónde está cada una (lejos, hacia la boca) y hacia dónde va. */
const BRASAS_P3: { p: V3; r: number }[] = [
  { p: [900, 3600, 2700], r: 22 }, { p: [-700, 3000, 2450], r: 16 }, { p: [1900, 5200, 3200], r: 26 }, { p: [300, 4600, 3050], r: 14 },
];
/** La estela de cada brasa en el instante t (en bucle): la cabeza y chispas que se quedan atrás. */
function estelasHerida(t: number): Particula[] {
  const out: Particula[] = [], P = NF / FPS, naranja = hexLin('#ff7a2a'), amarillo = hexLin('#ffd27a');
  BRASAS_P3.forEach((b, j) => {
    const meta = add(BOCA_DIR, [0, 0, 0], 1), v = norm([meta[0] * 1e5 - b.p[0], meta[1] * 1e5 - b.p[1], meta[2] * 1e5 - b.p[2]]), vel = 900;
    out.push({ p: b.p, r: b.r * 0.9, c: escalar(amarillo, 12), a: 1, suma: true, v: escalar(v, vel * 0.3) });
    for (let i = 0; i < 90; i++) {
      const vida = ((t / P + az(i, 610 + j)) % 1), atras = (i / 90) * b.r * 40 + vida * b.r * 4, lado = (az(i, 620 + j) - 0.5) * b.r * (0.4 + i / 40);
      const q = add(add(b.p, v, -atras), [lado * 0.6, lado * 0.3, (az(i, 630 + j) - 0.5) * b.r * (0.3 + i / 50) - vida * b.r]);
      out.push({ p: q, r: b.r * (0.35 - i * 0.003) * (0.6 + az(i, 640 + j) * 0.6), c: escalar(mezclar(amarillo, naranja, Math.min(1, i / 30)), 8 * (1 - i / 95) * Math.sin(Math.PI * (0.15 + 0.85 * (1 - vida)))), a: 1, suma: true, v: escalar(v, vel) });
    }
  });
  return out;
}
function armarHerida(w: number, h: number): Armado {
  const esc = new EscenaCine(), frente: number[] = [];
  // la cresta donde está el ojo (primer plano oscuro), el valle hondo y los picos al sur
  // los picos: conos quebrados en tres hileras (cerca oscuros, lejos en la bruma), con aristas de erosión
  const PICOS: [number, number, number, number][] = [];
  for (let i = 0; i < 34; i++) { const fila = i % 3, y = 3800 + fila * 4200 + az(i, 650) * 2200, x = (az(i, 651) - 0.5) * (9000 + fila * 9000); PICOS.push([x, y, 1300 + fila * 700 + az(i, 652) * 1500, 1300 + fila * 900 + az(i, 653) * 900]); }
  const picos = (x: number, y: number) => {
    let h = suave(3000, 6000, y) * 300;
    for (const [px, py, H, R] of PICOS) { const dx = x - px, dy = y - py; if (Math.abs(dx) > R * 1.6 || Math.abs(dy) > R * 1.6) continue; const ar = 1 - Math.abs(2 * fbm2(x / 260, y / 260, 3, 654) - 1), d = Math.hypot(dx, dy * 1.3) / R + ar * 0.18; h = Math.max(h, H * Math.pow(Math.max(0, 1 - d), 1.35)); }
    return h + (fbm2(x / 900, y / 900, 3, 655) - 0.5) * 120 + suave(16000, 30000, y) * (fbm2(x / 5000, y / 5000, 4, 656) ** 2 * 3000);
  };
  const cresta = (x: number, y: number): number => 2000 * (1 - suave(-200, 1600, y)) + (fbm2(x / 300, y / 300, 4, 653) - 0.5) * 160 * (1 - suave(400, 1600, y)) - suave(600, 2600, y) * 600;
  const alto = (x: number, y: number) => Math.max(cresta(x, y), picos(x, y)) + (fbm2(x / 60, y / 60, 3, 654) - 0.5) * 8;
  esc.terreno = new Terreno({
    alto, techo: 9000, grillas: [[-1500, -800, 1500, 1800, 6], [-14000, 1000, 16000, 20000, 40], [-60000, 5000, 60000, 60000, 300]],
    superficie: (p, n) => { const roca = suave(0.38, 0.6, 1 - n[2] + (fbm2(p[0] / 80, p[1] / 80, 3, 655) - 0.5) * 0.4); const cerca = 1 - suave(300, 1400, p[1]); return { albedo: mezclar(mezclar([0.42, 0.45, 0.52], [0.03, 0.03, 0.032], roca), [0.03, 0.03, 0.035], cerca * 0.95), brillo: 0 }; },
  });
  const ter = esc.terreno;
  // rocas y un árbol muerto sobre la cresta, en silueta (primer plano)
  for (const [x, y, R, s] of [[-420, 260, 70, 661], [-300, 420, 40, 662], [380, 300, 54, 663], [520, 180, 80, 664], [-560, 120, 90, 665]] as [number, number, number, number][]) frente.push(esc.ponerMundo(moverPiezas(roca(s, R, 'nie2_roca'), giroEje([0, 0, 1], az(s, 2) * 6), [0, 0, 0], [x, y, ter.h(x, y) - R * 0.3]), { nieve: 0.8 }));
  frente.push(esc.poner(piezasDe('nie2_arbol_muerto', 'retorcido', 666), { x: -380, y: 300, z: ter.h(-380, 300) - 4, giro: 40, k: 2.6 }, { nieve: 0.4 }));
  // las cuatro brasas: el núcleo de roca negra con grietas al rojo
  esc.emision.va_brasa = { k: 6, canal: 1 };
  MATERIALES.va_brasa ??= { rampa: ['#3a0602', '#6a0e04', '#9a1c06', '#c8320a', '#e84c10'], ruido: 0.4, escala: 0.3, emite: true };
  for (const b of BRASAS_P3) esc.ponerMundo([esfera(b.p[0], b.p[1], b.p[2], b.r * 0.55, { mat: 'va_brasa' })], { nieve: 0 });
  for (const g of frente) esc.frente.add(g);
  const z = ter.h(0, 0) + 60;
  return { esc, atm: atmHerida(), cam: camaraBase([0, -260, z], [800, 9000, z + 1150], 46, w, h) };
}
/** Donde se mueven las brasas (px de la capa): una caja por estela. */
function zonasHerida(a: Armado) {
  const b = baseCamara(a.cam), out: { caja: [number, number, number, number]; escala: number }[] = [];
  for (const br of BRASAS_P3) {
    const v = norm([BOCA_DIR[0] * 1e5 - br.p[0], BOCA_DIR[1] * 1e5 - br.p[1], BOCA_DIR[2] * 1e5 - br.p[2]]);
    const q = [add(br.p, v, br.r * 4), add(br.p, v, -br.r * 40)].map((p) => proyectar(b, p)).filter((p): p is [number, number, number] => !!p);
    if (q.length) out.push({ caja: [Math.min(...q.map((p) => p[0])) - 30, Math.min(...q.map((p) => p[1])) - 30, Math.max(...q.map((p) => p[0])) + 30, Math.max(...q.map((p) => p[1])) + 30], escala: 2 });
  }
  return out;
}

// ================================================================== ACTO 5 · p1: Ozmaren revienta
/**
 * El fondo del pozo de la intro (la roca, la lava dormida, la boca de tormenta arriba) y Ozmaren en su especial, el
 * pecho abierto: ahora revienta. Las grietas de la obsidiana se encienden, del pecho sale una columna de fuego de Doom,
 * las alas arden en el borde, el humo sube encendido desde abajo y las brasas vuelan. La luz principal es su fuego.
 */
/** La membrana de las alas que arde: carne oscura con venas y bordes al rojo (emite, late con el fuego). */
M.cb_ala_ardiendo = { rampa: ['#0a0201', '#1a0402', '#300804', '#501006', '#80200a', '#c04010', '#ff7a20'], ruido: 0.6, escala: 0.5, emite: true, patron: (p) => (Math.abs(fbm2(p[0] * 0.12, p[2] * 0.12 + p[1] * 0.05, 3, 761) - 0.5) < 0.05 ? 0.3 : -0.25) };
const POZO_B = { r: 440, alto: 640 }, OZ_B = { x: 0, y: 150, k: 2.3 };
/** El pozo (como en la intro): piso de roca con grietas de lava, la pared cilíndrica con peñascos y la boca arriba. */
function pozo(esc: EscenaCine, lava = 0.9, brillo = 0.25, oscuroCerca = 0, piedras = 70) {
  const P = POZO_B, grieta = (x: number, y: number) => 1 - Math.abs(2 * fbm2(x / 90, y / 90, 3, 191) - 1);
  esc.terreno = new Terreno({
    alto: (x, y) => (fbm2(x / 50, y / 50, 4, 190) - 0.5) * 16 - Math.pow(grieta(x, y), 12) * 6 + suave(P.r - 60, P.r + 40, Math.hypot(x, y)) * 120,
    techo: 200, grillas: [[-700, -700, 700, 700, 3]],
    superficie: (p) => { const g = Math.pow(grieta(p[0], p[1]), 14); return { albedo: escalar(mezclar([0.012, 0.011, 0.01], [0.25, 0.03, 0.01], g * 0.9), 1 - oscuroCerca * suave(-60, -260, p[1])), brillo }; },
  });
  esc.ponerMundo([caja(0, 0, -50, 1500, 1500, P.alto + 50, { mat: 'ci_roca' }), cilindro(0, 0, -60, P.r, P.alto + 80, { mat: 'ci_roca', r1: P.r * 0.55, resta: true })], { nieve: 0 });
  for (let i = 0; i < piedras; i++) {
    const a = az(i, 200) * TAU, z = i < 22 ? P.alto - 30 + az(i, 201) * 50 : az(i, 201) * P.alto, R = 26 + az(i, 202) * 60, rr = P.r * (1 - 0.45 * (z + 60) / (P.alto + 80)) - R * 0.35, pts: V3[] = [];
    for (let j = 0; j < 10; j++) { const b = az(i * 10 + j, 203) * TAU, c = (az(i * 10 + j, 204) * 2 - 1) * R * 0.8; pts.push([Math.cos(a) * rr + Math.cos(b) * R * 0.7, Math.sin(a) * rr + Math.sin(b) * R * 0.7, z + c]); }
    esc.ponerMundo([poliedro(pts, { mat: 'ci_roca', tono: (az(i, 205) - 0.5) * 0.2 })], { nieve: 0 });
  }
  esc.emision.ci_lava = { k: lava };
  for (let i = 0; i < 26; i++) {
    const a = az(i, 210) * TAU, r = 40 + az(i, 211) * 220, x = Math.cos(a) * r, y = Math.sin(a) * r, b = az(i, 212) * Math.PI;
    esc.ponerMundo([elipsoide(x, y, -3, 26 + az(i, 213) * 30, 2.2, 3, { mat: 'ci_lava', giro: (b * 180) / Math.PI })], { nieve: 0 });
  }
}
/** El cielo de tormenta por la boca del pozo y la bruma del fondo, con la luz que se le pide. */
function atmPozoB(o: { sol: V3; c: C3; k: number; borde: C3; kb: number; aire: C3 }): Atmosfera {
  const frio = hexLin('#b8ccff');
  const cielo = (d: V3): C3 => { const k = 2000 / Math.max(0.05, d[2]), n = fbm2((d[0] * k) / 900, (d[1] * k) / 900, 5, 181); return add(escalar([0.006, 0.007, 0.011], 0.6 + n), frio, 0.02 * n * n); };
  return {
    sol: { dir: norm(o.sol), c: o.c, k: o.k, ancho: 0.1 }, cielo, aire: () => o.aire,
    ambCielo: escalar(hexLin('#5070b0'), 0.012), ambSuelo: [0.002, 0.0015, 0.0012],
    niebla: { densidad: 1 / 3000, baja: 1 / 500, z0: 0, H: 30, ruido: 0.7, escalaRuido: 0.008 },
    borde: { c: o.borde, k: o.kb }, oclusion: 0.95, oclusionLargo: 260,
  };
}
function armarOzmaren(w: number, h: number): ArmadoB {
  const esc = new EscenaCine(), fuegos: Fuego[] = [], plumas: Pluma[] = [];
  pozo(esc, 2.2);
  // Ozmaren con el pecho abierto, sin sus llamas de utilería (el fuego es de Doom): la lava de las grietas encendida
  const oz = conMat(piezasDe('jefe_ozmaren_especial', 'se', 5, 4).filter((p) => p.mat !== 'fuego' && p.mat !== 'jf_humo'), (m) => (m === 'jf_membrana_fuego' ? 'cb_ala_ardiendo' : m));
  const g = esc.poner(oz, { x: OZ_B.x, y: OZ_B.y, z: -2, giro: -90, k: OZ_B.k }, { nieve: 0 });
  const mias = esc.piezas.filter((_, i) => esc.grupoDe[i] === g);
  esc.emision.cu_lava = { k: 1.6, canal: 1 }; esc.emision.lava = { k: 1.6, canal: 1 }; esc.emision.jf_hierro_rojo = { k: 0.8, canal: 1 }; esc.emision.jf_brasa_honda = { k: 2, canal: 1 };
  esc.emision.cu_ojo_brasa = { k: 8, canal: 1 }; esc.emision.luz_vela = { k: 9, canal: 1 }; esc.emision.cb_ala_ardiendo = { k: 1.1, canal: 1 };
  // el pecho: el centro de lo que brilla adentro (luz_vela, brasa honda), o el medio del torso
  const brillos = mias.filter((p) => p.mat === 'luz_vela' || p.mat === 'jf_brasa_honda').map(centro);
  const pecho: V3 = brillos.length ? brillos.reduce((m, c) => add(m, c, 1 / brillos.length), [0, 0, 0] as V3) : [OZ_B.x, OZ_B.y, 120 * OZ_B.k];
  // la columna de fuego que revienta del pecho (hacia el ojo y arriba) y su luz, que tira sombras en la pared del pozo
  // el pecho revienta hacia afuera (lenguas anchas y cortas) y detrás de él sube el fuego grande: su silueta contra eso
  for (const [dx, dy, dz, an, al, sd] of [[0, -34, -70, 110, 120, 701], [-46, -26, -60, 70, 95, 702], [50, -26, -64, 74, 100, 703]] as [number, number, number, number, number, number][]) fuegos.push({ p: [pecho[0] + dx, pecho[1] + dy, pecho[2] + dz], ancho: an, alto: al, semilla: sd, tipo: 'chorro', k: 2.4 });
  for (const [dx, an, al, sd] of [[0, 260, 900, 704], [-120, 160, 620, 705], [130, 170, 660, 706]] as [number, number, number, number][]) fuegos.push({ p: [pecho[0] + dx, pecho[1] + 120, pecho[2] - 120], ancho: an, alto: al, semilla: sd, tipo: 'techo', k: 2.2, fondo: 10 });
  esc.luces.push({ p: [pecho[0], pecho[1] + 50, pecho[2] + 20], c: hexLin('#ff6a22'), k: 14, r: 160, canal: 1, sombra: true, envuelve: 0.2, halo: 0.00006 });
  esc.luces.push({ p: [pecho[0], pecho[1] + 120, pecho[2] + 320], c: hexLin('#ff5a1a'), k: 7, r: 260, canal: 1, sombra: true, envuelve: 0.2 });
  // las alas arden en el borde: lenguas de Doom sobre lo más alto de la membrana, de cada lado
  // las alas arden: donde el modelo tiene sus llamas de las alas, lenguas de Doom un poco hacia el ojo (delante de la membrana)
  const llamasAla = piezasDe('jefe_ozmaren_especial', 'se', 5, 4).filter((p) => p.mat === 'fuego').map(centro).filter((c) => Math.abs(c[1]) > 60 && c[2] > 150);
  llamasAla.forEach((c, k) => { const w: V3 = [OZ_B.x + c[1] * OZ_B.k, OZ_B.y - c[0] * OZ_B.k - 70, c[2] * OZ_B.k - 30]; fuegos.push({ p: [w[0] * (1.1 + az(k, 709) * 0.25), w[1], w[2] - 20 + az(k, 708) * 60], ancho: 110 + az(k, 707) * 40, alto: 230 + az(k, 710) * 160, semilla: 711 + k, tipo: 'techo', k: 2.2, fondo: 120 }); });
  for (const sx of [-1, 1]) esc.luces.push({ p: [OZ_B.x + sx * 280, OZ_B.y + 80, 420], c: hexLin('#ff5a1a'), k: 5, r: 160, canal: 1, sombra: true, envuelve: 0.2 });
  // fuego que brota del piso alrededor de las pezuñas
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + 0.4, r = 110 + az(i, 720) * 70; fuegos.push({ p: [OZ_B.x + Math.cos(a) * r, OZ_B.y + Math.sin(a) * r * 0.7, -2], ancho: 80, alto: 90 + az(i, 721) * 110, semilla: 722 + i, tipo: 'techo', k: 2 }); }
  // el humo: sube del pecho y de las alas, encendido desde abajo
  plumas.push({ base: [pecho[0], pecho[1], pecho[2] + 180], alto: 900, r0: 60, r1: 320, viento: [0.1, 0.05, 0], dens: 0.03, humo: [0.03, 0.025, 0.025], abajo: hexLin('#ff5a1a'), kAbajo: 2, semilla: 730, sube: 40, escala: 1 / 50, sol: 0.05 });
  const atm = atmPozoB({ sol: [0.05, -0.4, 1], c: hexLin('#b8ccff'), k: 0.25, borde: hexLin('#ff6a30'), kb: 1.2, aire: [0.004, 0.0016, 0.0008] });
  return { esc, atm, cam: camaraBase([20, -400, 30], [OZ_B.x, OZ_B.y, 330], 66, w, h), fuegos, plumas };
}
/** Brasas y chispas que salen disparadas del estallido (suman), en bucle. */
function chispasOzmaren(t: number): Particula[] {
  const ps: Particula[] = [], P = NF / FPS, naranja = hexLin('#ff7a2a'), amarillo = hexLin('#ffc060'), c0: V3 = [OZ_B.x, OZ_B.y - 30, 260];
  for (let i = 0; i < 220; i++) {
    const vida = P * (1 + Math.floor(az(i, 740) * 2)), f = ((t + az(i, 741) * vida) % vida) / vida, a = az(i, 742) * TAU, e = (az(i, 743) - 0.2) * 1.6, v = 160 + az(i, 744) * 520;
    const dir: V3 = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e) * 0.6 - 0.4, Math.sin(e) + 0.4], d = f * v * 1.6;
    ps.push({ p: [c0[0] + dir[0] * d, c0[1] + dir[1] * d, c0[2] + dir[2] * d - f * f * 120], r: 0.8 + az(i, 745) * 1.6, c: escalar(mezclar(amarillo, naranja, f), 7 * Math.sin(f * Math.PI) * (0.3 + az(i, 746))), a: 1, suma: true, v: escalar(dir, v) });
  }
  return ps;
}

// ================================================================== ACTO 5 · p2: la elección
/**
 * El mismo pozo después: Ozmaren hecho ceniza tendido en el piso (los cuernos todavía asoman), la lava casi apagada y
 * la luz fría de la boca de arriba que baja como un pozo de luz. El héroe, encapuchado (cualquier clase: se lee en
 * silueta), parado sobre la ceniza con la Brasa en el puño extendido. Según la elección:
 * - brasa_absorber: la Brasa arde y le sube por el brazo en venas de fuego; la Marca se enciende (el foco cálido);
 * - brasa_destruir: la Brasa es un carbón gris que humea entre los dedos; la Marca queda gris (no hay foco cálido:
 *   solo la luz fría de arriba).
 */
type ValorBrasa = 'brasa_destruir' | 'brasa_absorber';
M.cb_ceniza = { rampa: ['#060505', '#0c0a0a', '#141111', '#1c1818', '#252020', '#2e2828', '#383131'], ruido: 0.5, escala: 0.4, patron: (p) => (Math.abs(fbm2(p[0] * 0.08, p[1] * 0.08, 2, 801) - 0.5) < 0.03 ? -0.2 : 0) };
M.cb_brasa_viva = { rampa: ['#ff6a1a', '#ff8a2a', '#ffb050', '#ffe0a0'], ruido: 0.2, escala: 0.6, emite: true };
M.cb_brasa_gris = { rampa: ['#141212', '#1f1c1b', '#2b2726', '#383332', '#46403e'], ruido: 0.5, escala: 0.8, emite: true };
M.cb_marca_viva = { rampa: ['#c83a0c', '#f06018', '#ff8a2a', '#ffc070'], ruido: 0.3, escala: 0.8, emite: true };
M.cb_marca_gris = { rampa: ['#2a2a2c', '#3a3a3e', '#4a4a50', '#5c5c62'], ruido: 0.3, escala: 0.8, emite: true };
function armarEleccion(w: number, h: number, valor: ValorBrasa): ArmadoB {
  const esc = new EscenaCine(), fuegos: Fuego[] = [], plumas: Pluma[] = [], frente: number[] = [];
  pozo(esc, 0.35, 0.02, 0.85, 22);
  // Ozmaren hecho ceniza, tendido detrás del héroe: el cuerpo gris con los cuernos negros y brasas que se mueren
  const oz = piezasDe('jefe_ozmaren_morir', 'se', 5, 7).filter((p) => p.mat !== 'fuego' && p.mat !== 'jf_humo');
  esc.poner(conMat(oz, (m) => (m === 'jf_cuerno' || m === 'jf_garra' || m === 'jf_una_negra' ? m : m === 'cu_lava' || m === 'lava' ? 'ci_lava' : 'cb_ceniza')), { x: -150, y: 260, z: -10, giro: 200, k: 1.7 }, { nieve: 0 });
  // montones de ceniza y la ceniza que cubre el piso alrededor
  const mont: ReturnType<typeof bulto>[] = [];
  for (let i = 0; i < 26; i++) { const a = az(i, 810) * Math.PI, r = 60 + az(i, 811) * 220; mont.push(bulto([Math.cos(a) * r + 20, Math.sin(a) * r * 0.8 + 120, -8], [40 + az(i, 812) * 60, 30 + az(i, 813) * 40, 10 + az(i, 814) * 16], { mat: 'cb_ceniza', giro: az(i, 815) * 180 })); }
  esc.ponerMundo([masa(mont, { mat: 'cb_ceniza', suave: 14 })], { nieve: 0 });
  // el montículo donde se para el héroe
  esc.ponerMundo([masa([bulto([0, 0, -10], [50, 40, 22], { mat: 'cb_ceniza' }), bulto([20, 20, -4], [30, 26, 14], { mat: 'cb_ceniza' })], { mat: 'cb_ceniza', suave: 8 })], { nieve: 0 });
  // el héroe: encapuchado, capa larga, la mano extendida con la Brasa (el cuadro de lanzar con el brazo adelante)
  const cu: Cuerpo = { genero: 'h', alto: 1, ancho: 1.02, musculo: 0.6, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'corto' };
  const eq: Equipo = { torso: { tipo: 'cuero', mat: 'cu_cuero_negro' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, manos: { tipo: 'guantes', mat: 'cu_cuero_negro' }, capa: { mat: 'cu_tela_negra', largo: 1.05 }, cabeza: { tipo: 'capucha', mat: 'cu_tela_negra' }, cinturon: { mat: 'cu_cuero' } };
  const H = { x: 0, y: 0, z: 9, k: 1.25 }, cam: V3 = [-95, -200, 30];
  const giro = (Math.atan2(cam[1] - H.y, cam[0] - H.x) * 180) / Math.PI - 45 + 38, gr = (giro * Math.PI) / 180;
  frente.push(esc.poner(personaje(cu, eq, 's', 'lanzar', 4), { x: H.x, y: H.y, z: H.z, giro, k: H.k }, { nieve: 0 }));
  const loc = (x: number, y: number, z: number): V3 => [H.x + (x * Math.cos(gr) - y * Math.sin(gr)) * H.k, H.y + (x * Math.sin(gr) + y * Math.cos(gr)) * H.k, H.z + z * H.k];
  const puno = loc(14.5, 14.5, 44), codo = loc(7, 9, 41), hombro = loc(2, 6, 47);
  if (valor === 'brasa_absorber') {
    // la Brasa encendida y las venas de fuego que le suben por el brazo hasta el hombro (la Marca)
    esc.ponerMundo([esfera(puno[0], puno[1], puno[2] + 2.5, 3.2, { mat: 'cb_brasa_viva' }), palo(puno, codo, 0.7, { mat: 'cb_marca_viva' }), palo(codo, hombro, 0.6, { mat: 'cb_marca_viva' }), palo(add(puno, [0, 0, -1.2]), add(codo, [0.5, 0, -1.2]), 0.4, { mat: 'cb_marca_viva' })], { nieve: 0 });
    esc.emision.cb_brasa_viva = { k: 9, canal: 1 }; esc.emision.cb_marca_viva = { k: 3.5, canal: 1 };
    esc.luces.push({ p: add(puno, [0, 0, 6]), c: hexLin('#ff7a2a'), k: 6, r: 22, canal: 1, sombra: true, envuelve: 0.3, halo: 0.0005 });
    fuegos.push({ p: add(puno, [0, 0, 4]), ancho: 7, alto: 16, semilla: 821, tipo: 'farol', k: 2.4 });
  } else {
    // la Brasa apagada: un carbón gris entre los dedos que suelta un hilo de humo; la Marca gris
    esc.ponerMundo([esfera(puno[0], puno[1], puno[2] + 2.5, 3, { mat: 'cb_brasa_gris' }), palo(puno, codo, 0.6, { mat: 'cb_marca_gris' }), palo(codo, hombro, 0.5, { mat: 'cb_marca_gris' })], { nieve: 0 });
    esc.emision.cb_marca_gris = { k: 0.6 }; esc.emision.cb_brasa_gris = { k: 0.3 };
    plumas.push({ base: add(puno, [0, 0, 4]), alto: 70, r0: 1.5, r1: 16, viento: [0.6, 0.2, 0], dens: 0.22, humo: [0.3, 0.31, 0.34], semilla: 822, sube: 12, escala: 1 / 7, sol: 0.5 });
  }
  // la luz principal: fría, desde la boca del pozo, un poco detrás del héroe (le deja el filo en la capucha y los hombros)
  const atm = atmPozoB({ sol: [0.12, 0.45, 1], c: hexLin('#a8c0ff'), k: 0.8, borde: hexLin('#c8d8ff'), kb: 3, aire: [0.008, 0.01, 0.016] });
  // lo que la boca deja caer sobre la ceniza de atrás: el héroe se recorta contra eso
  esc.luces.push({ p: [60, 300, 140], c: hexLin('#9fb8f0'), k: 3.2, r: 240, envuelve: 0.2 });
  for (const g of frente) esc.frente.add(g);
  return { esc, atm, cam: camaraBase(cam, [H.x + 10, H.y + 40, 66], 36, w, h), fuegos, plumas, polvo: polvoEnLuz([80, 200, 640], [0, 40, 40], 120, 0.12, 830, 220) };
}

// ================================================================== ACTO 5 · p3: el mar se parte
/**
 * Muy al norte, de noche, desde un acantilado: el mar negro se abre en un tajo que se va hasta el horizonte, con las
 * paredes de agua chorreando espuma; en el fondo del tajo asoman las agujas de una ciudad hundida, con su luz verde de
 * ánimas en las ventanas (el único foco, frío). El rayo cae a lo lejos: la escena con su luz es la variante `rayo`,
 * que el juego enciende a su tiempo (luz_N con anim de tiempo), como el relámpago del pozo en la intro.
 */
const RAYO_P3 = { az: 97, el: 8 };
/** Los destellos del rayo (s): el primero con su réplica, y otro más tarde. */
export const TIEMPOS_P3 = [[0, 0], [0.42, 0], [0.48, 1], [0.56, 0.3], [0.63, 0.9], [0.95, 0], [3.6, 0], [3.66, 0.8], [3.74, 0.2], [3.8, 0.6], [4.1, 0], [5.9, 0], [5.95, 0.5], [6.2, 0]] as [number, number][];
/** El tajo en el mar: 0 afuera, 1 en el fondo (sigue un eje que ondula hacia el horizonte). */
const ejeTajo = (y: number) => Math.sin(y / 2600) * 160 + y * 0.02;
function mar(x: number, y: number): number {
  const ola = (fbm2(x / 90, y / 140, 3, 901) - 0.5) * 7 + (fbm2(x / 600, y / 900, 3, 902) - 0.5) * 20;
  if (y < -400) return ola;
  const ancho = 520 + y * 0.04, d = Math.abs(x - ejeTajo(y)) / ancho, prof = 620 * suave(-400, 600, y);
  // el agua se amontona en el borde (la cresta) y cae casi a pique hasta el fondo
  const cresta = Math.exp(-(((d - 1.08) / 0.12) ** 2)) * 110 * suave(-400, 600, y), caida = 1 - suave(0.72, 1.0, d + (fbm2(x / 50, y / 200, 3, 903) - 0.5) * 0.06);
  return ola * (1 - caida) + cresta - caida * prof + caida * (fbm2(x / 120, y / 120, 3, 904) - 0.5) * 30;
}
M.cb_aguja = { rampa: ['#030405', '#070809', '#0c0e10', '#121519', '#191d22', '#21262c'], ruido: 0.4, escala: 0.1, brillo: 0.5, patron: (p) => (fbm2(p[0] * 0.05, p[2] * 0.02, 2, 905) > 0.6 ? -0.1 : 0) };
M.cb_alga = { rampa: ['#040706', '#08100c', '#0d1812', '#132219'], ruido: 0.6, escala: 0.6 };
M.cb_animas = { rampa: ['#0a5a4a', '#18907a', '#3cc8b0', '#a0f0e0'], ruido: 0.3, escala: 0.5, emite: true };
/** Una aguja gótica de la ciudad hundida: torre de base cuadrada con su chapitel, pináculos, y ventanas de ánimas. */
function agujaCiudad(alto: number, ancho: number, s: number): Pieza[] {
  const cuerpo = alto * 0.55, ps: Pieza[] = [caja(0, 0, -200, ancho, ancho, cuerpo + 200, { mat: 'cb_aguja' }), caja(0, 0, cuerpo, ancho * 1.12, ancho * 1.12, ancho * 0.12, { mat: 'cb_aguja', tono: 0.05 })];
  ps.push(poliedro([[-ancho * 0.45, -ancho * 0.45, cuerpo + ancho * 0.12], [ancho * 0.45, -ancho * 0.45, cuerpo + ancho * 0.12], [-ancho * 0.45, ancho * 0.45, cuerpo + ancho * 0.12], [ancho * 0.45, ancho * 0.45, cuerpo + ancho * 0.12], [0, 0, alto]], { mat: 'cb_aguja' }));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ps.push(cilindro(sx * ancho * 0.5, sy * ancho * 0.5, cuerpo, ancho * 0.08, alto * 0.16, { mat: 'cb_aguja', r1: 0.4 }));
  // ventanas apuntadas en dos pisos, algunas con ánimas
  for (let piso = 0; piso < 3; piso++) for (const lado of [-1, 1]) {
    if (az(s, piso * 2 + (lado > 0 ? 1 : 0)) < 0.35) continue;
    const z = cuerpo * (0.35 + piso * 0.22);
    ps.push(caja(lado * ancho * 0.2, -ancho * 0.51, z, ancho * 0.14, 2, ancho * 0.36, { mat: 'cb_animas' }));
  }
  // algas que cuelgan de la cornisa
  for (let i = 0; i < 6; i++) { const a = az(s, i + 10) * TAU, x = Math.cos(a) * ancho * 0.56, y = Math.sin(a) * ancho * 0.56; ps.push(palo([x, y, cuerpo], [x * 1.02, y * 1.02, cuerpo - ancho * (0.3 + az(s, i + 20) * 0.8)], ancho * 0.03, { mat: 'cb_alga', r1: ancho * 0.008 })); }
  return ps;
}
function atmMar(rayo: boolean): Atmosfera {
  const R = dirAz(RAYO_P3.az, RAYO_P3.el), frio = hexLin('#c0d4ff');
  const pars: [number, C3][] = [[0, hexLin('#0e1218')], [0.05, hexLin('#0a0e16')], [0.2, hexLin('#060912')], [0.6, hexLin('#03050a')]];
  const cielo = (d: V3): C3 => {
    const e = elev(d); if (e < 0.02) return gradiente(pars, Math.max(0, e));
    let c = gradiente(pars, e);
    // nubes de tormenta bajas, apenas marcadas; con el rayo se encienden por adentro
    for (const [sd, es, cu, al] of [[911, 2200, 0.38, 2600], [917, 1300, 0.46, 1600]] as [number, number, number, number][]) {
      const nb = nubes(d, sd, es, cu, al, [-R[0], -R[1], 0]); if (nb.a <= 0) continue;
      const g = Math.max(0, dot3(d, R)), k = rayo ? (0.2 + nb.luz) * (0.04 + 1.3 * Math.pow(g, 16)) : 0.012 + nb.luz * 0.02;
      c = mezclar(c, add(escalar(hexLin('#0c1018'), 1 - nb.espesor * 0.5), frio, k), nb.a * 0.92);
    }
    if (rayo) {
      // el rayo: un trazo quebrado que baja de las nubes al tajo, con ramas, blanco azulado
      const a = Math.atan2(d[1], d[0]) - (RAYO_P3.az * Math.PI) / 180, u = Math.atan2(Math.sin(a), Math.cos(a)), z0 = (RAYO_P3.el * Math.PI) / 180;
      if (e > z0 * 0.15 && e < 0.42) {
        const t = (e - z0 * 0.15) / 0.42, x0 = (fbm2(t * 9, 1, 3, 921) - 0.5) * 0.07 + (fbm2(t * 40, 2, 2, 922) - 0.5) * 0.012;
        let k = Math.exp(-Math.abs(u - x0) / 0.0016) * 6 + Math.exp(-Math.abs(u - x0) / 0.012) * 0.6;
        for (const [t0, dir, sd] of [[0.35, 1, 923], [0.55, -1, 924], [0.7, 1, 925]] as [number, number, number][]) if (t < t0 && t > t0 - 0.25) { const q = (t0 - t) / 0.25, xb = x0 + dir * q * 0.05 + (fbm2(t * 30, sd, 2, sd) - 0.5) * 0.01; k += Math.exp(-Math.abs(u - xb) / 0.0012) * 3 * (1 - q); }
        c = add(c, frio, k);
      }
    }
    return c;
  };
  const aire = (d: V3): C3 => { const g = Math.max(0, dot3(d, R)); return add(gradiente(pars, Math.max(0, Math.min(0.02, d[2]))), frio, rayo ? 0.02 + 0.15 * Math.pow(g, 6) : 0.002); };
  return {
    sol: { dir: norm([R[0], R[1], R[2] + 0.3]), c: frio, k: rayo ? 1.5 : 0.03, ancho: 0.04 }, cielo, aire,
    ambCielo: escalar(hexLin('#38507a'), rayo ? 0.1 : 0.05), ambSuelo: [0.004, 0.005, 0.007],
    niebla: { densidad: 1 / 14000, baja: 1 / 3000, z0: 0, H: 120, ruido: 0.7, escalaRuido: 0.001 },
    borde: { c: frio, k: rayo ? 2.4 : 0.6 }, oclusion: 0.85,
  };
}
function armarMar(w: number, h: number, rayo = false): Armado {
  const esc = new EscenaCine(), frente: number[] = [];
  // el acantilado donde está el ojo (primer plano negro) y el mar
  const acant = (x: number, y: number) => -9999 + 0 * (x + y);
  esc.terreno = new Terreno({
    alto: (x, y) => Math.max(mar(x, y), acant(x, y)), techo: 600, grillas: [[-2500, -900, 2500, 6000, 6], [-12000, 4000, 12000, 40000, 40]],
    superficie: (p, n) => {
      if (p[2] > 60) return { albedo: [0.03, 0.03, 0.034], brillo: 0.05 };
      const pared = 1 - n[2], espuma = suave(0.55, 0.85, fbm2(p[0] / 18, p[2] / 70 + p[1] / 400, 3, 933)) * suave(0.3, 0.7, pared) + suave(30, 70, p[2]) * 0.8;
      const fondo = suave(-480, -540, p[2]);
      let alb: C3 = mezclar([0.008, 0.016, 0.018], [0.03, 0.06, 0.065], pared);
      alb = mezclar(alb, [0.42, 0.48, 0.5], sat(espuma) * 0.6);
      alb = mezclar(alb, mezclar([0.006, 0.008, 0.008], [0.03, 0.035, 0.03], fbm2(p[0] / 30, p[1] / 30, 3, 934)), fondo);
      return { albedo: alb, brillo: fondo > 0.5 ? 0.35 * suave(0.45, 0.6, fbm2(p[0] / 80, p[1] / 80, 3, 935)) : 0.7 };
    },
  });
  // las agujas de la ciudad en el fondo del tajo, a lo largo del eje, más altas las de lejos (asoman sobre el agua)
  for (let i = 0; i < 16; i++) {
    const y = 1500 + i * 480 + az(i, 940) * 300, x = ejeTajo(y) + (az(i, 941) - 0.5) * (500 + y * 0.04), alto = 560 + az(i, 942) * 300 + i * 20, an = 60 + az(i, 943) * 60;
    esc.poner(agujaCiudad(alto, an, 950 + i), { x, y, z: -500 + az(i, 944) * 40, giro: az(i, 945) * 40 - 20 }, { nieve: 0 });
  }
  esc.emision.cb_animas = { k: rayo ? 2.5 : 2.5 };
  // la luz verde de las ánimas que sube del fondo del tajo
  for (let i = 0; i < 6; i++) { const y = 1500 + i * 1300; esc.luces.push({ p: [ejeTajo(y), y, -330], c: hexLin('#3cc8b0'), k: 1.4, r: 300, envuelve: 0.3, halo: 0.00002 }); }
  // rocas del acantilado en primer plano (oscuras, enmarcan abajo)
  // rocas del fondo del mar y restos de la ciudad en primer plano (oscuros, enmarcan abajo)
  for (const [x, y, R, sd] of [[-250, 900, 60, 961], [230, 1100, 80, 962], [-120, 700, 26, 963], [90, 800, 20, 964]] as [number, number, number, number][]) frente.push(esc.ponerMundo(moverPiezas(roca(sd, R, 'cb_aguja'), giroEje([0, 0, 1], az(sd, 1) * 6), [0, 0, 0], [x + ejeTajo(y), y, mar(x + ejeTajo(y), y) - R * 0.3]), { nieve: 0 }));
  for (const g of frente) esc.frente.add(g);
  return { esc, atm: atmMar(rayo), cam: camaraBase([ejeTajo(-650), -650, 200], [ejeTajo(4000), 4000, -330], 50, w, h) };
}

// ================================================================== ACTO 5 · p4 y ACTO 6 · p2: Ysmeral
/**
 * Ysmeral, la Ciudad Ahogada, afuera del agua: la catedral de piedra verde y mojada con algas colgando, su campanario
 * abierto con las campanas contra el cielo, casas hundidas a medias, la playa de marea con charcos, y el barco de Oyá
 * varado y escorado en la arena. A contraluz de una luna velada; el fuego frío de ánimas arde detrás de los vitrales
 * (el único foco). En el acto 6 (p2) la marea vuelve: la misma ciudad con el mar entrando por las calles y los ahogados
 * tendidos en la arena; el barco flota.
 */
M.cb_piedra_ahogada = { rampa: ['#030505', '#070a09', '#0c110f', '#121916', '#19221e', '#212c27', '#2a3731', '#35433c'], ruido: 0.35, escala: 0.25, brillo: 0.45, patron: (p) => (fbm2(p[0] * 0.04, p[2] * 0.02 + p[1] * 0.04, 3, 1001) > 0.62 ? -0.18 : Math.abs(Math.sin(p[2] * 0.25)) < 0.05 ? -0.08 : 0) };
M.cb_madera_mojada = { rampa: ['#040303', '#090706', '#0f0c0a', '#16120e', '#1e1813', '#271f18'], ruido: 0.4, escala: 0.3, brillo: 0.3, patron: (p) => (Math.sin(p[2] * 1.4) > 0.85 ? -0.12 : 0) };
M.cb_vela_raida = { rampa: ['#0e0d0b', '#1c1a16', '#2b2822', '#3b372f', '#4b463c'], ruido: 0.6, escala: 0.4 };
const piedraAhogada = (m: string) => (m.startsWith('abo_') && m !== 'abo_vitral' && m !== 'abo_madera' && m !== 'abo_hiedra' ? 'cb_piedra_ahogada' : m === 'abo_hiedra' ? 'cb_alga' : m);
/** El barco de Oyá: casco de tablas en carena (convexo por tramos), dos palos con sus vergas y la vela raída colgando. */
function barco(): Pieza[] {
  const ps: Pieza[] = [], L = 150, B = 34, D = 34, sec = (t: number) => { const u = Math.abs(t); return { b: B * (1 - Math.pow(u, 2.2)) + 3, z0: -D * (1 - Math.pow(u, 3)) * 0.9 + u * u * 22 }; };
  for (let i = 0; i < 10; i++) {
    const t0 = -1 + (i / 10) * 2, t1 = -1 + ((i + 1) / 10) * 2, pts: V3[] = [];
    for (const t of [t0, t1]) { const q = sec(t), zb = 8 + Math.abs(t) * Math.abs(t) * 18 * (t > 0 ? 1.3 : 1); pts.push([t * L, -q.b, zb], [t * L, q.b, zb], [t * L, -q.b * 0.75, q.z0 * 0.6], [t * L, q.b * 0.75, q.z0 * 0.6], [t * L, 0, q.z0]); }
    ps.push(poliedro(pts, { mat: 'cb_madera_mojada', tono: (az(i, 1010) - 0.5) * 0.1 }));
  }
  // la borda, el castillo de popa y el bauprés
  ps.push(caja(-L * 0.72, 0, 14, 50, B * 1.3, 26, { mat: 'cb_madera_mojada' }), caja(-L * 0.72, 0, 40, 54, B * 1.4, 3, { mat: 'cb_madera_mojada', tono: 0.05 }), palo([L * 0.95, 0, 30], [L * 1.45, 0, 62], 2.6, { mat: 'cb_madera_mojada', r1: 1.4 }));
  // los palos, las vergas (una caída) y los obenques
  for (const [x, alto, verga] of [[L * 0.25, 220, 0], [-L * 0.3, 190, 1]] as [number, number, number][]) {
    ps.push(palo([x, 0, 10], [x, 0, alto], 3.4, { mat: 'cb_madera_mojada', r1: 2 }));
    const vz = alto * 0.78;
    if (!verga) ps.push(palo([x, -70, vz], [x, 70, vz], 1.8, { mat: 'cb_madera_mojada' }));
    else ps.push(palo([x - 10, -60, vz - 50], [x + 6, 60, vz + 10], 1.8, { mat: 'cb_madera_mojada' }));
    for (const sy of [-1, 1]) for (const dx of [-14, 0, 14]) ps.push(palo([x + dx, sy * B * 0.95, 26], [x, sy * 3, alto * 0.86], 0.35, { mat: 'cb_madera_mojada' }));
    // la vela raída: jirones que cuelgan de la verga
    if (!verga) for (let k = 0; k < 7; k++) { const y = -60 + k * 20, l = 40 + az(k, 1011) * 80; ps.push(poliedro([[x - 1, y - 9, vz], [x + 1, y + 9, vz], [x - 1, y - 7, vz - l], [x + 1, y + 5, vz - l * 0.8], [x + 3 + az(k, 1012) * 6, y, vz - l * 0.6]], { mat: 'cb_vela_raida' })); }
  }
  ps.push(palo([L * 1.45, 0, 62], [L * 0.25, 0, 215], 0.4, { mat: 'cb_madera_mojada' }), palo([L * 0.25, 0, 215], [-L * 0.3, 0, 185], 0.4, { mat: 'cb_madera_mojada' }));
  return ps;
}
/** La ciudad: la catedral ahogada con el campanario de las campanas, casas hundidas, rocas con algas. Devuelve dónde están las campanas. */
function ciudadAhogada(esc: EscenaCine, ter: Terreno, mareaAlta: number) {
  const CX = 0, CY = 600, G = 205, co = Math.cos((G * Math.PI) / 180), si = Math.sin((G * Math.PI) / 180), z0 = ter.h(CX, CY) - 6;
  for (const [id, dy] of [['abo_catedral_cabecera', -9], ['abo_catedral_nave', 0], ['abo_catedral_fachada', 7]] as [string, number][])
    esc.poner(conMat(piezasDe(id, 'entera', 1, 2), piedraAhogada), { x: CX - dy * 16 * si, y: CY + dy * 16 * co, z: z0, giro: G }, { nieve: 0 });
  // el campanario suelto al costado: una torre cuadrada con arcos abiertos arriba y las campanas a contraluz
  const T = { x: 330, y: 760, an: 74, alto: 330, vano: 250 }, zt = ter.h(T.x, T.y) - 8, torre: Pieza[] = [caja(0, 0, 0, T.an, T.an, T.alto, { mat: 'cb_piedra_ahogada' })];
  for (const [giro, dx, dy] of [[0, 0, -1], [0, 0, 1], [90, -1, 0], [90, 1, 0]] as [number, number, number][]) for (const p of huecoApuntado(44, T.vano + 30, T.an * 0.4, T.vano)) torre.push(moverPiezas([p], giroEje([0, 0, 1], (giro * Math.PI) / 180), [0, 0, 0], [dx * T.an * 0.5, dy * T.an * 0.5, 0])[0]);
  torre.push(caja(0, 0, T.alto, T.an + 8, T.an + 8, 6, { mat: 'cb_piedra_ahogada' }), poliedro([[-T.an / 2 - 4, -T.an / 2 - 4, T.alto + 6], [T.an / 2 + 4, -T.an / 2 - 4, T.alto + 6], [-T.an / 2 - 4, T.an / 2 + 4, T.alto + 6], [T.an / 2 + 4, T.an / 2 + 4, T.alto + 6], [0, 0, T.alto + 150]], { mat: 'cb_piedra_ahogada' }));
  esc.poner(torre, { x: T.x, y: T.y, z: zt, giro: 20 }, { nieve: 0 });
  esc.poner(conMat(campana(17, 1), (m) => (m === 'ci_viga' ? 'cb_madera_mojada' : m)), { x: T.x, y: T.y, z: zt + T.vano + 40, giro: 20 }, { nieve: 0 });
  // algas que cuelgan de la cornisa de la torre
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, x = T.x + Math.cos(a) * T.an * 0.6, y = T.y + Math.sin(a) * T.an * 0.6; esc.ponerMundo([palo([x, y, zt + T.vano - 4], [x, y, zt + T.vano - 30 - az(i, 1020) * 60], 1.2, { mat: 'cb_alga', r1: 0.3 })], { nieve: 0 }); }
  // casas hundidas a medias alrededor (las de Velmora, verdes de mar)
  for (const [x, y, gi, s, id] of [[-420, 420, 30, 1, 'casa_piedra'], [-300, 820, -20, 2, 'casa_dos_pisos'], [520, 420, 60, 3, 'casa_entramado'], [-640, 700, 10, 4, 'casa_piedra'], [700, 760, -40, 5, 'casa_dos_pisos'], [-160, 1100, 0, 6, 'casa_alargada']] as [number, number, number, number, string][])
    esc.poner(conMat(piezasDe(id, 'intacta', s), (m) => (m.startsWith('casas_') && m !== 'casas_ventana_luz' ? (m.includes('teja') || m.includes('techo') ? 'cb_madera_mojada' : 'cb_piedra_ahogada') : m === 'casas_ventana_luz' ? 'negro' : m)), { x, y, z: ter.h(x, y) - 18 - mareaAlta * 30, giro: gi, k: 1.3 }, { nieve: 0 });
  esc.emision.abo_vitral = { k: 1.1, color: hexLin('#2aa894') };
  esc.marcas = { vitral: ['abo_vitral'] };
  // la luz de las ánimas que sale por los vitrales, sobre la piedra mojada de afuera
  esc.luces.push({ p: [CX + 40, CY - 140, z0 + 120], c: hexLin('#3cc8b0'), k: 1.6, r: 160, envuelve: 0.3, halo: 0.00002 });
  return { campanas: [T.x, T.y, zt + T.vano] as V3 };
}
/** Playa de marea con charcos (o el mar entrando por las calles: `marea` > 0). */
function terrenoPlaya(marea: number): Terreno {
  const alto = (x: number, y: number) => marea * 64 * suave(-300, -700, y + (fbm2(x / 300, 3, 2, 1033) - 0.5) * 200) + 30 * suave(-200, 900, y) + 50 * Math.exp(-(((x - 0) / 700) ** 2 + ((y - 700) / 400) ** 2)) + (fbm2(x / 160, y / 160, 4, 1030) - 0.5) * 18 - suave(-300, -1200, y) * 30;
  const agua = (x: number, y: number) => marea * (24 + (fbm2(x / 60, y / 90, 3, 1031) - 0.5) * 3) + (1 - marea) * (-4 + (fbm2(x / 60, y / 90, 3, 1031) - 0.5) * 2);
  return new Terreno({
    alto: (x, y) => Math.max(alto(x, y), agua(x, y)), techo: 200, grillas: [[-2000, -1500, 2000, 2200, 5], [-12000, -2000, 12000, 20000, 40]],
    superficie: (p) => {
      const mojado = suave(0.5, 0.75, fbm2(p[0] / 120, p[1] / 120, 3, 1032)), enAgua = p[2] <= agua(p[0], p[1]) + 0.5 ? 1 : 0;
      if (enAgua) { const esp = marea * suave(0.7, 0.85, fbm2(p[0] / 60 + p[1] / 300, p[1] / 7, 3, 1034)) * (0.3 + 0.7 * fbm2(p[0] / 200, p[1] / 200, 2, 1035)); return { albedo: mezclar([0.004, 0.008, 0.01], [0.3, 0.34, 0.36], esp), brillo: 0.5 * (1 - esp) * (1 - suave(-100, -600, p[1]) * 0.9) }; }
      const cerca = suave(-200, -700, p[1]); return { albedo: escalar(mezclar([0.045, 0.043, 0.038], [0.012, 0.016, 0.016], mojado), 1 - cerca * 0.75), brillo: (0.04 + mojado * 0.22) * (1 - cerca) };
    },
  });
}
function atmYsmeral(marea = 0): Atmosfera {
  const L = norm([0.25, 1, 0.32]), luna = hexLin('#b8cce8');
  const pars: [number, C3][] = [[0, hexLin('#3a4250')], [0.05, hexLin('#2a3242')], [0.16, hexLin('#18202e')], [0.4, hexLin('#0c111c')], [0.9, hexLin('#05070c')]];
  const cielo = (d: V3): C3 => {
    const e = elev(d); if (e < 0.02) return gradiente(pars, Math.max(0, e));
    const g = Math.max(0, dot3(d, L));
    let c = add(gradiente(pars, e), luna, 0.35 * Math.pow(g, 40) + 0.08 * Math.pow(g, 6) + 6 * Math.pow(g, 3000));
    for (const [sd, es, cu, al] of [[1041, 2400, 0.44, 3000], [1047, 1400, 0.52, 1800]] as [number, number, number, number][]) {
      const nb = nubes(d, sd, es, cu, al, L); if (nb.a <= 0) continue;
      c = mezclar(c, add(escalar(hexLin('#141a26'), 1 - nb.espesor * 0.4), luna, (0.2 + nb.luz) * (0.5 * Math.pow(g, 8) + 0.03)), nb.a * 0.88);
    }
    return c;
  };
  const aire = (d: V3): C3 => add(gradiente(pars, Math.max(0, Math.min(0.02, d[2]))), luna, 0.06 * Math.pow(Math.max(0, dot3(d, L)), 6));
  return {
    sol: { dir: L, c: luna, k: 1.0 - marea * 0.4, ancho: 0.03 }, cielo, aire,
    ambCielo: escalar(hexLin('#3a5070'), 0.16), ambSuelo: escalar(hexLin('#141a20'), 0.12),
    niebla: { densidad: 1 / 12000, baja: 1 / (4200 - marea * 1800), z0: 0, H: 60, ruido: 0.7, escalaRuido: 0.002 },
    borde: { c: hexLin('#c8dcff'), k: 1.3 - marea * 0.6 }, oclusion: 0.85,
  };
}
function armarYsmeral(w: number, h: number): ArmadoB {
  const esc = new EscenaCine(), frente: number[] = [];
  esc.terreno = terrenoPlaya(0);
  const ter = esc.terreno;
  ciudadAhogada(esc, ter, 0);
  // el barco de Oyá varado en la playa, escorado, con la proa hacia la ciudad
  esc.ponerMundo(moverPiezas(barco(), giroEje(norm([0.9, 0.4, 0]), 0.22), [0, 0, 0], [0, 0, 0]).map((p) => moverPiezas([p], giroEje([0, 0, 1], 1.15), [0, 0, 0], [-360, -380, ter.h(-360, -380) - 4])[0]), { nieve: 0 });
  // rocas con algas, cadenas y restos en la arena (primer plano oscuro)
  for (const [x, y, R, sd] of [[-150, -720, 44, 1051], [260, -640, 60, 1052], [420, -760, 30, 1053], [-360, -640, 26, 1054]] as [number, number, number, number][]) frente.push(esc.ponerMundo(moverPiezas(roca(sd, R, 'cb_piedra_ahogada'), giroEje([0, 0, 1], az(sd, 1) * 6), [0, 0, 0], [x, y, ter.h(x, y) - R * 0.3]), { nieve: 0 }));
  frente.push(esc.poner(piezasDe('ahg_ancla', objeto('ahg_ancla').variantes[0], 1), { x: 230, y: -600, z: ter.h(230, -600) - 4, giro: 60, k: 1.4 }, { nieve: 0 }));
  for (const g of frente) esc.frente.add(g);
  return { esc, atm: atmYsmeral(), cam: camaraBase([-120, -980, 46], [40, 600, 170], 38, w, h), fuegos: [], vitral: { paleta: 'animas', k: 2.6 } };
}

// ================================================================== ACTO 6 · p1: la Campana que Ahoga se raja
/**
 * El Campanario Hundido por dentro: la torre de piedra ahogada con el agua hasta la rodilla, el arco alto del fondo por
 * donde entra la luna (la luz principal, de atrás) y la Campana que Ahoga en el medio, enorme: la sacerdotisa alza los
 * brazos y las cadenas le cuelgan sueltas, la campana se raja de arriba abajo (la rajadura suelta una luz verde de
 * ánimas: el foco) y el agua estalla alrededor en columnas de espuma.
 */
M.cb_grieta = { rampa: ['#2a9a88', '#5ad0c0', '#a8f0e4', '#eafffa'], ruido: 0.2, escala: 0.5, emite: true };
M.cb_agua_espuma = { rampa: ['#2a3438', '#4a565a', '#6c787c', '#9aa4a8'], ruido: 0.5, escala: 0.3 };
const CAMP_B = { k: 2.3, y: 60 };
function armarCampana(w: number, h: number): ArmadoB {
  const esc = new EscenaCine(), plumas: Pluma[] = [], frente: number[] = [];
  // el agua del piso (con ondas que salen de la campana) y la torre: un cilindro hueco de sillar con su arco alto al fondo
  esc.terreno = new Terreno({
    alto: (x, y) => { const r = Math.hypot(x, y - CAMP_B.y); return 2 * Math.sin(r / 9 - 2) * Math.exp(-r / 260) + (fbm2(x / 40, y / 40, 3, 1101) - 0.5) * 1.6; },
    techo: 20, grillas: [[-700, -700, 700, 900, 3]],
    superficie: (p) => ({ albedo: mezclar([0.006, 0.012, 0.013], [0.3, 0.36, 0.38], suave(0.62, 0.8, fbm2(p[0] / 14, p[1] / 14, 3, 1102)) * Math.exp(-Math.hypot(p[0], p[1] - CAMP_B.y) / 200)), brillo: 0.45 }),
  });
  const R = 580;
  esc.ponerMundo([cilindro(0, 120, -60, R + 80, 1200, { mat: 'cb_piedra_ahogada' }), cilindro(0, 120, -80, R, 1300, { mat: 'cb_piedra_ahogada', resta: true }),
    // el arco alto del fondo, la luna detrás
    ...huecoApuntado(170, 560, 200, 180).map((p) => moverPiezas([p], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], [40, 120 + R + 30, 0])[0]),
    // dos arcos bajos a los costados, de donde entra el agua
    ...huecoApuntado(110, 160, 200, -20).map((p) => moverPiezas([p], giroEje([0, 0, 1], 1.15), [0, 0, 0], [-R + 10, 260, 0])[0]),
  ], { nieve: 0 });
  // las vigas del campanario arriba (rotas) y cadenas que cuelgan de ellas, cortadas
  esc.ponerMundo([caja(0, 120, 780, R * 2, 26, 22, { mat: 'cb_madera_mojada' }), caja(-120, 120, 760, 24, R * 1.6, 20, { mat: 'cb_madera_mojada', giro: 12 }), caja(160, 60, 700, 22, 300, 18, { mat: 'cb_madera_mojada', incl: 28 })], { nieve: 0 });
  for (const [x, y, z1, s] of [[-150, 40, 430, 1], [150, 50, 470, 2], [-60, 160, 520, 3], [90, 170, 400, 4]] as [number, number, number, number][]) esc.ponerMundo(cadena([x, y, 770], [x + (az(s, 1103) - 0.5) * 30, y - 10, z1], 4, 6, 'ci_hierro'), { nieve: 0 });
  // algas y percebes en el muro
  for (let i = 0; i < 60; i++) { const a = -0.3 + az(i, 1104) * (Math.PI + 0.6), x = Math.cos(a) * (R - 4), y = 120 + Math.sin(a) * (R - 4), z = 20 + az(i, 1105) * 500; esc.ponerMundo([palo([x, y, z], [x * 0.99, y, z - 30 - az(i, 1106) * 80], 1.6, { mat: 'cb_alga', r1: 0.4 })], { nieve: 0 }); }
  // la Campana que Ahoga: el especial (los brazos arriba con las cadenas), sin sus anillos de espuma (el agua es de verdad)
  const ps = piezasDe('jefe_campana_ahoga_especial', 'se', 3, 4).filter((p) => p.mat !== 'j2_espuma' && p.mat !== 'j2_agua');
  const g = esc.poner(ps, { x: 0, y: CAMP_B.y, z: -6, giro: -90, k: CAMP_B.k }, { nieve: 0 });
  frente.push(g);
  // la rajadura: de la corona al labio de la campana, quebrada, sobre la cara que mira al ojo
  const bronce = esc.piezas.filter((p, i) => esc.grupoDe[i] === g && p.mat === 'j2_bronce' && !p.resta).map(cajaPieza);
  const bx0 = Math.min(...bronce.map((b) => b[0])), bx1 = Math.max(...bronce.map((b) => b[3])), by0 = Math.min(...bronce.map((b) => b[1])), bz0 = Math.min(...bronce.map((b) => b[2])), bz1 = Math.max(...bronce.map((b) => b[5]));
  const cx = (bx0 + bx1) / 2, rr = (bx1 - bx0) / 2, grieta: Pieza[] = [];
  let prev: V3 | null = null;
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, z = bz1 - 4 - t * (bz1 - bz0 - 8), x = cx + (az(i, 1107) - 0.5) * 18 + Math.sin(t * 9) * 6, rz = rr * (0.55 + 0.45 * t), y = CAMP_B.y - Math.sqrt(Math.max(0, rz * rz - (x - cx) ** 2)) - 0.8;
    const q: V3 = [x, Math.max(by0 - 1, y), z];
    if (prev) grieta.push(palo(prev, q, 1.1 + t * 1.4, { mat: 'cb_grieta' }));
    if (i % 4 === 2) grieta.push(palo(q, [q[0] + (az(i, 1108) - 0.5) * 30, q[1] + 3, q[2] - 14], 0.7, { mat: 'cb_grieta' }));
    prev = q;
  }
  esc.ponerMundo(grieta, { nieve: 0 });
  esc.emision.cb_grieta = { k: 6, canal: 1 }; esc.emision.j2_bio = { k: 1.2 }; esc.emision.j2_bronce_vivo = { k: 0.4 };
  esc.luces.push({ p: [cx, by0 - 30, (bz0 + bz1) / 2], c: hexLin('#5ad0c0'), k: 6, r: 90, canal: 1, sombra: true, envuelve: 0.3, halo: 0.00015 });
  // el agua que estalla: columnas de espuma alrededor de la campana, encendidas por la rajadura
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.8, r = rr * 1.25 + az(i, 1109) * 30; plumas.push({ base: [Math.cos(a) * r, CAMP_B.y + Math.sin(a) * r * 0.8, -4], alto: 150 + az(i, 1110) * 180, r0: 10, r1: 44, viento: [Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0], dens: 0.09, humo: [0.5, 0.58, 0.62], abajo: hexLin('#5ad0c0'), kAbajo: 0.6, decaeAbajo: 4, semilla: 1111 + i, sube: 90, escala: 1 / 16, sol: 0.8 }); }
  for (const g2 of frente) esc.frente.add(g2);
  const atm: Atmosfera = {
    sol: { dir: norm([0.08, 1, 0.42]), c: hexLin('#b8cce8'), k: 2.2, ancho: 0.03 },
    cielo: (d) => { const g2 = Math.max(0, dot3(d, norm([0.08, 1, 0.42]))); return add([0.03, 0.04, 0.06], hexLin('#c8daf0'), 0.3 * Math.pow(g2, 6) + 4 * Math.pow(g2, 900)); },
    aire: (d) => add(escalar(hexLin('#0a1218'), 0.5), hexLin('#8fb0d0'), 0.12 * Math.pow(Math.max(0, dot3(d, norm([0.08, 1, 0.42]))), 5)),
    ambCielo: escalar(hexLin('#3a5070'), 0.05), ambSuelo: [0.004, 0.006, 0.007],
    niebla: { densidad: 1 / 2600, baja: 1 / 500, z0: 0, H: 60, ruido: 0.7, escalaRuido: 0.006 },
    borde: { c: hexLin('#c8dcff'), k: 2.6 }, oclusion: 0.9, oclusionLargo: 300,
  };
  return { esc, atm, cam: camaraBase([-50, -420, 90], [0, CAMP_B.y, 110], 56, w, h), fuegos: [], plumas };
}
/** Gotas que saltan del estallido (no suman: agua que agarra la luz), en bucle. */
function gotasCampana(t: number): Particula[] {
  const ps: Particula[] = [], P = NF / FPS;
  for (let i = 0; i < 420; i++) {
    const f = ((t / P + az(i, 1120)) % 1), a = az(i, 1121) * TAU, e = 0.4 + az(i, 1122) * 1.0, v = 200 + az(i, 1123) * 380, d = f * v;
    const dir: V3 = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e) * 0.8, Math.sin(e)];
    ps.push({ p: [dir[0] * d + Math.cos(a) * 90, CAMP_B.y + dir[1] * d + Math.sin(a) * 70, dir[2] * d - f * f * 300], r: 0.6 + az(i, 1124) * 1.2, c: escalar([0.55, 0.75, 0.8], 1.2 * (1 - f)), a: 0.9, suma: true, v: [dir[0] * v, dir[1] * v, dir[2] * v - 600 * f] });
  }
  return ps;
}

// ================================================================== ACTO 6 · p2: la marea vuelve
/**
 * La misma Ysmeral (acto 5, p4) cuando la Campana calla: la marea entra de golpe por las calles con su espuma, revienta
 * contra la catedral y las casas en columnas blancas, las ánimas de los vitrales se apagaron. En primer plano, en la
 * loma de arena que el agua no alcanza, los ahogados tendidos y los peces muertos. El barco de Oyá flota en la bahía
 * con su farol (el único foco cálido).
 */
function armarMarea(w: number, h: number): ArmadoB {
  const esc = new EscenaCine(), frente: number[] = [], plumas: Pluma[] = [], fuegos: Fuego[] = [];
  esc.terreno = terrenoPlaya(1);
  const ter = esc.terreno;
  ciudadAhogada(esc, ter, 1);
  esc.emision.abo_vitral = { k: 0.05, color: hexLin('#2aa894') };
  esc.luces.length = 0;
  // el agua que revienta contra la ciudad: columnas de espuma en la fachada, las casas y la torre
  for (const [x, y, alto, r1, sd] of [[-80, 380, 360, 120, 1201], [120, 420, 300, 100, 1202], [-420, 360, 220, 90, 1203], [520, 360, 260, 100, 1204], [300, 680, 200, 70, 1205], [-660, 640, 180, 80, 1206]] as [number, number, number, number, number][])
    plumas.push({ base: [x, y, 20], alto, r0: 30, r1, viento: [0, 0.3, 0], dens: 0.05, humo: [0.6, 0.66, 0.7], semilla: sd, sube: 70, escala: 1 / 30, sol: 1.4 });
  // el barco flota en la bahía, a la derecha, derecho, con su farol encendido en la popa
  const bx = 430, by = 120, bz = 20;
  esc.ponerMundo(barco().map((p) => moverPiezas([p], giroEje([0, 0, 1], 2.6), [0, 0, 0], [bx, by, bz])[0]), { nieve: 0 });
  const fl = farol(), pf: V3 = [bx + Math.cos(2.6) * -110, by + Math.sin(2.6) * -110, bz + 46];
  esc.ponerMundo(fl.ps.map((p) => moverPiezas([p], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], pf)[0]), { nieve: 0 });
  fuegos.push({ p: add(pf, fl.llama), ancho: 4.2, alto: 8, semilla: 1210, tipo: 'farol', k: 2.4 });
  esc.emision.cb_vidrio_farol = { k: 3, canal: 1 };
  esc.luces.push({ p: add(pf, [0, -4, 8]), c: hexLin('#ffa050'), k: 4, r: 30, canal: 1, sombra: true, envuelve: 0.4, halo: 0.004 });
  // los ahogados tendidos en la loma de arena, y peces muertos
  const tendido = (ps: Pieza[]) => moverPiezas(ps, giroEje([1, 0, 0], -Math.PI / 2 + 0.06), [0, 0, 0], [0, 0, 6]);
  for (const [x, y, gi, pose, sd] of [[-170, -660, 30, 'parado', 1], [-60, -600, -70, 'arrastra', 2], [110, -650, 110, 'parado', 3], [230, -560, 10, 'arrastra', 4], [-290, -580, -20, 'parado', 5]] as [number, number, number, PoseMuerto, number][]) {
    const ps = conMat(muertoSeco(pose, 1220 + sd, 62), (m) => (m.includes('piel') || m.includes('carne') || m === 'ci_piel' ? 'j2_piel_ahogada' : m));
    frente.push(esc.poner(pose === 'parado' ? tendido(ps) : ps, { x, y, z: ter.h(x, y) - 2, giro: gi }, { nieve: 0 }));
  }
  for (const [x, y, sd] of [[20, -690, 1], [-120, -700, 2], [170, -600, 3]] as [number, number, number][]) frente.push(esc.poner(piezasDe('ahg_peces_muertos', objeto('ahg_peces_muertos').variantes[0], 1230 + sd), { x, y, z: ter.h(x, y) - 1, giro: az(sd, 1231) * 360, k: 1.2 }, { nieve: 0 }));
  for (const g of frente) esc.frente.add(g);
  const zc = ter.h(-40, -820) + 34;
  return { esc, atm: atmYsmeral(1), cam: camaraBase([-40, -820, zc], [40, 400, 120], 46, w, h), fuegos, plumas };
}
/** Espuma que salta donde rompe la marea (no suma: agua que agarra la luz de la luna), en bucle. */
function espumaMarea(t: number): Particula[] {
  const ps: Particula[] = [], P = NF / FPS;
  for (let i = 0; i < 500; i++) {
    const f = ((t / P + az(i, 1240)) % 1), x = (az(i, 1241) - 0.5) * 1500, y = 300 + az(i, 1242) * 200, v = 80 + az(i, 1243) * 160, d = f * v;
    ps.push({ p: [x + (az(i, 1244) - 0.5) * d, y + d * 0.5, 22 + d * 1.2 - f * f * 140], r: 1 + az(i, 1245) * 2, c: [0.5, 0.56, 0.6], a: 0.7 * (1 - f), v: [0, v * 0.5, v * 1.2 - 280 * f] });
  }
  return ps;
}

// ================================================================== ACTO 6 · p3: el cielo se rompe como un vidrio
/**
 * Al norte, sobre el mar helado, el CIELO de noche (sus nubes y sus estrellas) se fractura como un vidrio enorme: pocas
 * grietas grandes, quebradas e irregulares, que salen de un hueco y se ramifican; de cada lado de una grieta la imagen
 * del cielo queda corrida (refracción) y con otro brillo. El centro ya cayó: por el hueco, de bordes gruesos, se ve un
 * vacío de oro con bruma y una escalera que sube hacia una luz cálida. Los pedazos que se desprendieron caen girando
 * hacia el ojo con la imagen del cielo que llevaban, su canto grueso encendido por la luz de atrás, un reflejo que los
 * cruza y la sombra que dejan en la bruma de oro.
 */
const VIDRIO = { az: 92, el: 28, escala: 0.72 };
const VD = dirAz(VIDRIO.az, VIDRIO.el), VX = norm([VD[1], -VD[0], 0]), VY: V3 = [VX[1] * VD[2] - VX[2] * VD[1], VX[2] * VD[0] - VX[0] * VD[2], VX[0] * VD[1] - VX[1] * VD[0]];
type P2v = [number, number];
/** De coordenadas del plano del vidrio a una dirección del cielo (y al revés). */
const dirDeUV = (u: number, v: number): V3 => norm(add(add(VD, VX, u * VIDRIO.escala), VY, v * VIDRIO.escala));
const dentroPol = (P: P2v[], x: number, y: number) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const distSeg = (x: number, y: number, a: P2v, b: P2v) => { const ex = b[0] - a[0], ey = b[1] - a[1], t = sat(((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey || 1)); return { d: Math.hypot(x - a[0] - ex * t, y - a[1] - ey * t), lado: Math.sign(ex * (y - a[1]) - ey * (x - a[0])) || 1, t }; };
const distPol = (P: P2v[], x: number, y: number) => { let m = 1e9; for (let i = 0; i < P.length; i++) m = Math.min(m, distSeg(x, y, P[i], P[(i + 1) % P.length]).d); return m; };
/** El hueco donde el cielo ya cayó: un polígono quebrado, más largo que ancho. */
const HUECO_C: P2v = [0.02, 0.02];
const HUECO: P2v[] = Array.from({ length: 17 }, (_, k) => { const a = (k / 17) * TAU + (az(k, 1301) - 0.5) * 0.25, r = (0.15 + az(k, 1302) * 0.1 + (k % 4 === 0 ? 0.09 : 0)) * (k % 2 ? 0.82 : 1); return [HUECO_C[0] + Math.cos(a) * r * 1.2, HUECO_C[1] + Math.sin(a) * r] as P2v; });
/** Las grietas grandes: tramos rectos que tuercen a tirones desde un vértice del hueco, con ramas que se afinan. */
interface Grieta { pts: P2v[]; ancho: number; empuje: P2v }
const GRIETAS: Grieta[] = (() => {
  const out: Grieta[] = [];
  const tirar = (o: P2v, ang: number, largo: number, ancho: number, s: number, ramas: number, hondo = 0): void => {
    const pts: P2v[] = [o]; let a = ang, p = o; const n = 3 + Math.floor(az(s, 1) * 3), paso = largo / n;
    for (let i = 0; i < n; i++) { a += (az(s, i + 10) - 0.5) * 0.55; const l = paso * (0.6 + az(s, i + 20) * 0.8); p = [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l]; pts.push(p); }
    out.push({ pts, ancho, empuje: [Math.cos(ang + Math.PI / 2) * 0.012, Math.sin(ang + Math.PI / 2) * 0.012] });
    for (let r = 0; r < ramas; r++) { const k = 1 + Math.floor(az(s, r + 30) * (pts.length - 2)), lado = az(s, r + 40) < 0.5 ? -1 : 1; tirar(pts[k], ang + lado * (0.5 + az(s, r + 50) * 0.6), largo * (0.25 + az(s, r + 60) * 0.3), ancho * 0.55, s * 7 + r + 3, r === 0 && hondo < 1 ? 1 : 0, hondo + 1); }
  };
  // seis grietas madre (no una telaraña pareja): largas hacia los lados y abajo, más cortas hacia arriba
  for (const [k, ang, largo] of [[0, 0.15, 1.05], [4, 1.2, 0.6], [6, 1.9, 0.75], [8, 2.9, 1.1], [12, 4.1, 0.9], [14, 5.0, 0.85]] as [number, number, number][]) tirar(HUECO[k], ang, largo, 0.0075, 1310 + k * 13, 2);
  return out;
})();
/** Los pedazos que se desprendieron: su forma (local), de dónde salieron (la imagen que llevan) y dónde están ahora. */
interface Pedazo { pol: P2v[]; origen: P2v; c: P2v; esc: number; giro: number; canto: P2v; brillo: number }
const PEDAZOS: Pedazo[] = Array.from({ length: 11 }, (_, k): Pedazo => {
  const n = 4 + Math.floor(az(k, 1320) * 3), r = 0.04 + az(k, 1321) * 0.05, pol: P2v[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + (az(k * 9 + i, 1322) - 0.5) * 0.9, rr = r * (0.55 + az(k * 9 + i, 1323) * 0.7); pol.push([Math.cos(a) * rr, Math.sin(a) * rr * (0.5 + az(k, 1324) * 0.5)]); }
  const ao = (k / 11) * TAU + az(k, 1325) * 0.5, origen: P2v = [HUECO_C[0] + Math.cos(ao) * 0.18, HUECO_C[1] + Math.sin(ao) * 0.15];
  // caen hacia abajo y hacia el ojo: más grandes cuanto más cerca, girados, con el canto que se ve por el giro
  const cae = 0.1 + az(k, 1326) * 0.7 + (k % 5 === 0 ? 0.25 : 0), esc = 1 + cae * cae * 4, giro = (az(k, 1327) - 0.5) * 3, gc = az(k, 1328) * TAU;
  return { pol, origen, c: [origen[0] * (1 + cae * 2.2) + (az(k, 1329) - 0.5) * 0.2, origen[1] - cae * 0.9], esc, giro, canto: [Math.cos(gc) * 0.012 * esc, Math.sin(gc) * 0.012 * esc - 0.004 * esc], brillo: az(k, 1330) };
}).sort((a, b) => b.esc - a.esc);
/** El vacío de oro de detrás: bruma que se mueve, la escalera que sube hacia la luz cálida. */
function detras(u: number, v: number): C3 {
  const oro = hexLin('#ffb040'), hondo = hexLin('#4a1a06'), luz: P2v = [HUECO_C[0], HUECO_C[1] + 0.13], r = Math.hypot(u - luz[0], (v - luz[1]) * 1.3);
  let c = mezclar(escalar(oro, 0.9), hondo, suave(0, 0.26, r));
  const t = sat((v - (HUECO_C[1] - 0.2)) / 0.33);
  if (t > 0 && t < 1) {
    const ancho = 0.085 * (1 - t * 0.85), k = Math.pow(t, 0.65) * 20, f = k - Math.floor(k), x = u - HUECO_C[0] - Math.sin(t * 2.4) * 0.008;
    if (Math.abs(x) < ancho) c = escalar(mezclar(hexLin('#ffe2a0'), hexLin('#7a3e08'), suave(0.15, 0.5, f)), (f < 0.3 ? 1.9 : 0.6) * (1.4 - t * 0.6));
    else if (Math.abs(x) < ancho * 1.2) c = escalar(c, 0.4);
  }
  // la bruma de oro delante de la escalera (más espesa abajo) y la luz cálida arriba
  const bruma = fbm2(u * 9 + 3, v * 9, 4, 1340) * (0.4 + 0.6 * suave(0.2, -0.15, v - HUECO_C[1]));
  c = mezclar(c, escalar(oro, 0.75), bruma * 0.5);
  return add(c, hexLin('#fff0c8'), 1.6 * Math.exp(-Math.hypot(u - luz[0], v - luz[1]) / 0.02));
}
function atmVidrio(): Atmosfera {
  const oro = hexLin('#ffb040'), luna = hexLin('#9fb4e0');
  const pars: [number, C3][] = [[0, hexLin('#1e2434')], [0.06, hexLin('#141b2e')], [0.2, hexLin('#0b1124')], [0.6, hexLin('#050812')]];
  /** El cielo de noche entero (lo que el vidrio tenía pintado): gradiente, estrellas, nubes con el borde de luna. */
  const cieloNoche = (d: V3, kOro = 1): C3 => {
    const e = elev(d); let c = gradiente(pars, Math.max(0, e));
    const hs = hash3(Math.floor(Math.atan2(d[1], d[0]) * 1300), Math.floor(e * 1300), 1350);
    if (hs > 0.994) c = add(c, [0.8, 0.85, 1], (hs - 0.994) * 50 * (0.4 + 0.6 * hash3(Math.floor(e * 1300), 7, 1351)));
    const cerca = Math.max(0, dot3(d, VD));
    for (const [sd, es, cu, al] of [[1352, 2200, 0.47, 3000], [1356, 1300, 0.55, 1900]] as [number, number, number, number][]) {
      const nb = nubes(d, sd, es, cu, al, [-0.3, 1, 0]); if (nb.a <= 0) continue;
      const k = (0.15 + nb.luz) * 0.05, ko = Math.pow(cerca, 30) * 0.5 * kOro * (0.3 + nb.luz);
      c = mezclar(c, add(add(escalar(hexLin('#121828'), 1 - nb.espesor * 0.4), luna, k), oro, ko), nb.a * 0.9);
    }
    return c;
  };
  const cielo = (d: V3): C3 => {
    const e = elev(d); if (e < 0.02) return gradiente(pars, Math.max(0, e));
    const kd = dot3(d, VD);
    if (kd < 0.3) return cieloNoche(d);
    const u = dot3(d, VX) / kd / VIDRIO.escala, v = dot3(d, VY) / kd / VIDRIO.escala;
    // el fondo: el cielo partido (o el hueco), con sus grietas
    let fondo: C3, enHueco = false;
    if (dentroPol(HUECO, u, v)) { fondo = detras(u, v); enHueco = true; }
    else {
      // la imagen corrida de cada lado de cada grieta (más cerca del hueco, más corrida) y su brillo
      let du = 0, dv = 0, kb = 0, dmin = 1e9, anchoMin = 0, ladoMin = 1;
      for (const g of GRIETAS) {
        let m = { d: 1e9, lado: 1, t: 0 }, iseg = 0;
        for (let i = 0; i < g.pts.length - 1; i++) { const q = distSeg(u, v, g.pts[i], g.pts[i + 1]); if (q.d < m.d) { m = q; iseg = i; } }
        const w = Math.exp(-m.d / 0.25) * (1 - suave(0.1, 1.2, Math.hypot(u, v)));
        du += m.lado * g.empuje[0] * w; dv += m.lado * g.empuje[1] * w; kb += m.lado * 0.12 * w;
        const ancho = g.ancho * (1 - (iseg + m.t) / g.pts.length * 0.75);
        if (m.d < dmin) { dmin = m.d; anchoMin = ancho; ladoMin = m.lado; }
      }
      fondo = escalar(cieloNoche(dirDeUV(u + du, v + dv)), 1 + kb);
      const cercaH = 1 - suave(0, 0.35, distPol(HUECO, u, v));
      if (dmin < anchoMin * 3) {
        const q = dmin / anchoMin;
        // la grieta: el hueco oscuro, el oro que se cuela cerca del hueco, y el canto del lado que mira a la luz
        if (q < 1) fondo = add(escalar(fondo, 0.08), oro, cercaH * cercaH * (1 - q) * 1.1);
        else fondo = ladoMin > 0 ? add(fondo, mezclar(luna, oro, cercaH), ((3 - q) / 2) * (0.035 + 0.25 * cercaH)) : escalar(fondo, 0.55 + 0.45 * (q - 1) / 2);
      }
      // el borde grueso del hueco: el canto del vidrio partido, con su filo de oro
      const dh = distPol(HUECO, u, v);
      if (dh < 0.018) { const q = dh / 0.018; fondo = mezclar(add(escalar(hexLin('#1a1410'), 1), oro, 0.6 * (1 - q) ** 3), fondo, suave(0.4, 1, q)); }
    }
    // los pedazos que caen (los de más cerca encima) y la sombra que dejan en la bruma del hueco
    for (const P of PEDAZOS) {
      const co = Math.cos(-P.giro), si = Math.sin(-P.giro), loc = (x: number, y: number): P2v => { const a = (x - P.c[0]) / P.esc, b = (y - P.c[1]) / P.esc; return [a * co - b * si, a * si + b * co]; };
      const [lu, lv] = loc(u, v);
      if (dentroPol(P.pol, lu, lv)) {
        // la cara: el cielo que llevaba (de donde salió), con un reflejo que la cruza según cómo gira
        const img = cieloNoche(dirDeUV(P.origen[0] + lu, P.origen[1] + lv), 0);
        const refl = Math.pow(Math.max(0, Math.sin((lu * Math.cos(P.brillo * 6) + lv * Math.sin(P.brillo * 6)) * 30 + P.brillo * 9)), 8);
        const borde = 1 - suave(0, 0.012, distPol(P.pol, lu, lv));
        return add(add(escalar(img, 0.8 + P.brillo * 0.5), mezclar(luna, oro, 0.5), refl * 0.12), mezclar(luna, oro, 0.4), borde * 0.06);
      }
      const [eu, ev] = loc(u - P.canto[0], v - P.canto[1]);
      if (dentroPol(P.pol, eu, ev)) {
        // el canto: vidrio grueso visto de lado, oscuro, con la luz de oro de atrás que lo atraviesa
        const t = 0.5 + 0.5 * Math.sin((u + v) * 300 * P.esc);
        return add(escalar(hexLin('#0c0a08'), 1), oro, 0.06 + 0.22 * t * (1 - P.brillo * 0.6));
      }
      if (enHueco) {
        // la sombra: el pedazo tapa la luz del hueco y deja un rastro oscuro en la bruma, hacia afuera
        const rx = P.c[0] - HUECO_C[0], ry = P.c[1] - HUECO_C[1], rl = Math.hypot(rx, ry) || 1;
        for (const k of [0.04, 0.08]) { const [su, sv] = loc(u + (rx / rl) * k, v + (ry / rl) * k); if (dentroPol(P.pol, su, sv)) { fondo = escalar(fondo, 0.55); break; } }
      }
    }
    return add(fondo, oro, 0.03 * Math.pow(Math.max(0, kd), 14));
  };
  const aire = (d: V3): C3 => add(gradiente(pars, Math.max(0, Math.min(0.02, d[2]))), oro, 0.012 * Math.pow(Math.max(0, dot3(norm([d[0], d[1], 0]), norm([VD[0], VD[1], 0]))), 8));
  return {
    sol: { dir: VD, c: oro, k: 0.12, ancho: 0.2 }, cielo, aire,
    ambCielo: escalar(hexLin('#2c3c60'), 0.2), ambSuelo: escalar(hexLin('#10141c'), 0.1),
    niebla: { densidad: 1 / 20000, baja: 1 / 4000, z0: 0, H: 80, ruido: 0.7, escalaRuido: 0.001 },
    borde: { c: hexLin('#ffc060'), k: 0.25 }, nieve: { albedo: [0.4, 0.44, 0.52], desde: 0.6 }, oclusion: 0.85,
  };
}
function armarVidrio(w: number, h: number): Armado {
  const esc = new EscenaCine(), frente: number[] = [];
  // el mar helado: placas de hielo partidas con agua negra entre ellas, y una costa de roca a los costados
  const placa = (x: number, y: number) => 1 - Math.abs(2 * fbm2(x / 160, y / 160, 3, 1360) - 1);
  esc.terreno = new Terreno({
    alto: (x, y) => 4 * suave(0.1, 0.18, placa(x, y)) + suave(900, 1600, Math.abs(x) - y * 0.15) * (200 + fbm2(x / 300, y / 300, 4, 1361) * 500) + (fbm2(x / 40, y / 40, 2, 1362) - 0.5) * 2,
    techo: 900, grillas: [[-3000, -600, 3000, 6000, 6], [-20000, 3000, 20000, 40000, 50]],
    superficie: (p) => { const k = suave(0.1, 0.18, placa(p[0], p[1])); return { albedo: mezclar([0.002, 0.003, 0.005], [0.045, 0.055, 0.08], k * (0.6 + 0.4 * fbm2(p[0] / 30, p[1] / 30, 2, 1363))), brillo: 0.8 - k * 0.6 }; },
  });
  const ter = esc.terreno;
  // peñascos con costra de hielo en primer plano (oscuros, enmarcan)
  for (const [x, y, R, sd] of [[-340, 260, 90, 1371], [380, 300, 120, 1372], [-180, 340, 40, 1373], [520, 520, 70, 1374]] as [number, number, number, number][]) frente.push(esc.ponerMundo(moverPiezas(roca(sd, R, 'cb_roca_fria'), giroEje([0, 0, 1], az(sd, 1) * 6), [0, 0, 0], [x, y, ter.h(x, y) - R * 0.3]), { nieve: 0.6 }));
  for (const g of frente) esc.frente.add(g);
  return { esc, atm: atmVidrio(), cam: camaraBase([0, 0, 50], [0, 3000, 1150], 62, w, h) };
}

// ================================================================== ACTO 6 · p4: Aun-Saar en el Trono Sediento
/**
 * Arriba de la escalera de oro: el Trono Sediento (sus escalones y su respaldo del catálogo, enormes) sobre la nada, y
 * Aun-Saar delante, en su especial: abre la boca del pecho (el vacío con sus dientes), las manos de oro flotan
 * alrededor. Todo a contraluz de un vacío blanco y frío detrás del trono; brilla solo la boca y el oro de sus aros.
 */
function armarAunSaar(w: number, h: number): Armado {
  const esc = new EscenaCine(), frente: number[] = [];
  // abajo, la nada: un mar de nubes de ceniza dorada lejos (un terreno de nubes), y el estrado que flota
  esc.terreno = new Terreno({
    alto: (x, y) => -900 + (fbm2(x / 700, y / 700, 4, 1401) - 0.5) * 300, techo: -500, grillas: [[-20000, -20000, 20000, 40000, 60]],
    superficie: (p) => ({ albedo: mezclar([0.05, 0.045, 0.04], [0.3, 0.27, 0.22], fbm2(p[0] / 300, p[1] / 300, 3, 1402)) }),
  });
  // el estrado: escalones en media luna de mármol con el canto de oro, que suben hacia la nada
  const est: Pieza[] = [];
  for (let i = 0; i < 9; i++) { const r = 560 - i * 48, z = -40 + i * 28; est.push(cilindro(0, 120, z, r, 28, { mat: 'cel_marmol_losas', tono: (az(i, 1405) - 0.5) * 0.1 }), cilindro(0, 120, z + 26, r + 1, 3, { mat: 'cel_oro' })); }
  est.push(cilindro(0, 120, -360, 600, 322, { mat: 'cel_marmol_losas', r1: 380 }));
  esc.ponerMundo(est, { nieve: 0 });
  // dos pilares partidos a los lados y el gran aro roto detrás (el halo del trono), de oro
  for (const sx of [-1, 1]) esc.ponerMundo([cilindro(sx * 330, 220, 150, 34, 380 + (sx > 0 ? 120 : 0), { mat: 'cel_marmol_losas' }), cilindro(sx * 330, 220, 150, 44, 20, { mat: 'cel_oro' }), ...moverPiezas(roca(1406 + sx, 30, 'cel_marmol_losas'), giroEje([0, 0, 1], sx), [0, 0, 0], [sx * 330, 220, 530 + (sx > 0 ? 120 : 0)])], { nieve: 0 });
  { const aro: Pieza[] = [], c: V3 = [0, 260, 520], R = 330; for (let i = 0; i < 40; i++) { if (i > 6 && i < 10) continue; if (i > 24 && i < 27) continue; const a0 = (i / 40) * TAU, a1 = ((i + 1) / 40) * TAU; aro.push(palo([c[0] + Math.cos(a0) * R, c[1], c[2] + Math.sin(a0) * R], [c[0] + Math.cos(a1) * R, c[1], c[2] + Math.sin(a1) * R], 7, { mat: 'cel_oro' })); } esc.ponerMundo(aro, { nieve: 0 }); }
  for (let i = 0; i < 18; i++) { const a = az(i, 1410) * TAU, r = 700 + az(i, 1411) * 900, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.6 + 600; esc.ponerMundo(moverPiezas(roca(1420 + i, 20 + az(i, 1412) * 60, 'cel_marmol_losas'), giroEje([0, 0, 1], a), [0, 0, 0], [x, y, -200 + az(i, 1413) * 900]), { nieve: 0 }); }
  // Aun-Saar delante del trono, de frente al ojo, con la boca del pecho abierta
  const g = esc.poner(piezasDe('jefe_aun_saar_especial', 'se', 3, 4), { x: 0, y: 200, z: 200, giro: -90, k: 1.25 }, { nieve: 0 });
  frente.push(g);
  esc.emision.j2_vacio = { k: 0.15 }; esc.emision.j2_borde_vacio = { k: 1.6 }; esc.emision.j2_luz = { k: 2.2 }; esc.emision.j2_luz_oro = { k: 2.4 }; esc.emision.cel_vacio = { k: 0.2 };
  // la boca del pecho: el centro del vacío, con su luz violeta y oro que le sale
  const vac = esc.piezas.filter((p, i) => esc.grupoDe[i] === g && p.mat === 'j2_vacio').map(centro);
  const boca: V3 = vac.length ? vac.reduce((m, c) => add(m, c, 1 / vac.length), [0, 0, 0] as V3) : [0, -40, 450];
  esc.luces.push({ p: add(boca, [0, -30, 0]), c: hexLin('#c8a0ff'), k: 0.7, r: 40, envuelve: 0.3, halo: 0.0002 });
  for (const g2 of frente) esc.frente.add(g2);
  const L = norm([0.02, 1, 0.42]), blanco = hexLin('#e8ecf4');
  const atm: Atmosfera = {
    sol: { dir: L, c: blanco, k: 2.2, ancho: 0.05 },
    cielo: (d) => { const gq = Math.max(0, dot3(d, L)), e = elev(d); let c = add(gradiente([[-0.3, hexLin('#0c0b0e')], [0, hexLin('#24221e')], [0.2, hexLin('#121116')], [0.6, hexLin('#060608')]], e), blanco, 0.1 * Math.pow(gq, 10) + 0.9 * Math.pow(gq, 160) + 2 * Math.pow(gq, 900)); const nb = nubes(d, 1430, 2000, 0.5, 2400, L); if (nb.a > 0) c = mezclar(c, add(escalar(hexLin('#24201c'), 1 - nb.espesor * 0.4), hexLin('#c8bca8'), (0.2 + nb.luz) * Math.pow(gq, 6) * 0.4), nb.a * 0.85); return c; },
    aire: (d) => add(escalar(hexLin('#141218'), 0.5), blanco, 0.08 * Math.pow(Math.max(0, dot3(d, L)), 10)),
    ambCielo: escalar(hexLin('#4a4a5a'), 0.06), ambSuelo: escalar(hexLin('#1a1610'), 0.05),
    niebla: { densidad: 1 / 5000, baja: 1 / 1600, z0: -300, H: 200, ruido: 0.6, escalaRuido: 0.002 },
    borde: { c: hexLin('#f0e8d8'), k: 3 }, oclusion: 0.9,
  };
  return { esc, atm, cam: camaraBase([-60, -720, 120], [0, 200, 420], 44, w, h), polvo: polvoEnLuz([0, 900, 1100], [0, -300, 200], 300, 0.12, 1440, 400) };
}

// ================================================================== los planos
const P_HJALDUR: Plano3D = {
  id: 'p1_hjaldur', paralaje: 0.88, particulas: 'nieve', ss: 4,
  armar: (w, h) => memo(`hj|${w}|${h}`, () => armarHjaldur(w, h)),
  revelado: { t: 0, exposicion: 1.15, rayos: { k: 0.4, c: [0.8, 0.9, 1], umbral: 0.25, decae: 0.97 }, derrame: { k: 0.45, r: 4 }, bloom: { k: 0.45, umbral: 0.7 }, grado: gradoHielo },
};

const fortin = (valor: ValorVigdis): Plano3D => ({
  id: `p2_fortin@${valor}`, paralaje: 0.85, particulas: 'nieve',
  armar: (w, h) => memo(`fo|${valor}|${w}|${h}`, () => armarFortin(w, h, valor)),
  revelado: { t: 0, exposicion: 0.95, rayos: { k: 0.2, c: [1, 0.9, 0.9], umbral: 0.3 }, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.35, umbral: 0.8 }, grado: gradoAlba },
  flickBase: 0.9, cuadros: NF, fps: FPS, extras: (a, c, t) => extrasFuego(a as ArmadoB, c, t), zonas: (a) => zonasDe(a, 26, 1),
});

const P_HERIDA: Plano3D = {
  id: 'p3_herida', paralaje: 0.8, particulas: 'ceniza',
  armar: (w, h) => memo(`he|${w}|${h}`, () => armarHerida(w, h)),
  revelado: { t: 0, exposicion: 1.0, rayos: { k: 0.3, c: [1, 0.5, 0.3], umbral: 0.4, desde: [BOCA_DIR[0] * 1e6, BOCA_DIR[1] * 1e6, BOCA_DIR[2] * 1e6] }, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.5, umbral: 0.7 }, grado: gradoNoche },
  flickBase: 0.9, cuadros: NF, fps: FPS, extras: (_a, _c, t) => ({ flick: latido(t), particulas: estelasHerida(t) }), zonas: zonasHerida,
};

const P_OZMAREN: Plano3D = {
  id: 'p1_ozmaren', paralaje: 0.9, particulas: 'brasas',
  armar: (w, h) => memo(`oz|${w}|${h}`, () => armarOzmaren(w, h)),
  revelado: { t: 0, exposicion: 1.1, derrame: { k: 0.3, r: 4 }, bloom: { k: 0.55, umbral: 0.7 }, grado: gradoFuego },
  flickBase: 0.88, cuadros: NF, fps: FPS, extras: (a, c, t) => extrasFuego(a as ArmadoB, c, t, { particulas: chispasOzmaren }),
  // todo el cuadro late con el fuego: una sola tira a un tercio de la resolución
  zonas: () => [{ caja: [0, 0, 1407, 791], escala: 3 }],
};

const eleccion = (valor: ValorBrasa): Plano3D => ({
  id: `p2_eleccion@${valor}`, paralaje: 0.9, particulas: valor === 'brasa_absorber' ? 'brasas' : 'ceniza', ss: 4,
  armar: (w, h) => memo(`el|${valor}|${w}|${h}`, () => armarEleccion(w, h, valor)),
  revelado: { t: 0, exposicion: 1.55, rayos: { k: 0.3, c: [0.8, 0.9, 1], umbral: 0.3 }, derrame: { k: 0.4, r: 4 }, bloom: { k: 0.45, umbral: 0.75 }, grado: gradoNoche },
  ...(valor === 'brasa_absorber' ? { flickBase: 0.9, cuadros: NF, fps: FPS, extras: (a: Armado, c: Capas, t: number) => extrasFuego(a as ArmadoB, c, t), zonas: (a: Armado) => zonasDe(a, 40, 1) } : {}),
});

const P_MAR: Plano3D = {
  id: 'p3_mar', paralaje: 0.85, particulas: 'lluvia',
  armar: (w, h) => memo(`ma|${w}|${h}`, () => armarMar(w, h)),
  revelado: { t: 0, exposicion: 1.2, derrame: { k: 0.4, r: 4 }, bloom: { k: 0.45, umbral: 0.75 }, grado: gradoNoche },
  variantes: [{ id: 'rayo', armar: (w, h) => armarMar(w, h, true), anim: { tipo: 'tiempo', claves: TIEMPOS_P3 }, escala: 2 }],
  qa: [0.5, 2.0, 3.7, 6.0],
};

const P_YSMERAL: Plano3D = {
  id: 'p4_ysmeral', paralaje: 0.85, particulas: 'lluvia',
  armar: (w, h) => memo(`ys|${w}|${h}`, () => armarYsmeral(w, h)),
  revelado: { t: 0, exposicion: 1.15, rayos: { k: 0.1, c: [0.8, 0.9, 1], umbral: 0.7 }, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.4, umbral: 0.75 }, grado: gradoNoche },
  flickBase: 1, cuadros: NF, fps: FPS, extras: (a, c, t) => extrasFuego(a as ArmadoB, c, t, { latir: false }),
  zonas: (a) => { const b = baseCamara(a.cam), q = [[-200, 300, 0], [200, 900, 400], [-200, 900, 400], [200, 300, 0]].map((p) => proyectar(b, p as V3)!).filter(Boolean); return [{ caja: [Math.min(...q.map((p) => p[0])) - 20, Math.min(...q.map((p) => p[1])) - 20, Math.max(...q.map((p) => p[0])) + 20, Math.max(...q.map((p) => p[1])) + 20], escala: 2 }]; },
};

const P_CAMPANA: Plano3D = {
  id: 'p1_campana', paralaje: 0.9, particulas: 'polvo',
  armar: (w, h) => memo(`ca|${w}|${h}`, () => armarCampana(w, h)),
  revelado: { t: 0, exposicion: 1.3, rayos: { k: 0.45, c: [0.8, 0.9, 1], umbral: 0.25, decae: 0.97 }, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.45, umbral: 0.75 }, grado: gradoNoche },
  flickBase: 0.9, cuadros: NF, fps: FPS, extras: (a, c, t) => extrasFuego(a as ArmadoB, c, t, { particulas: gotasCampana }),
  zonas: (a) => { const b = baseCamara(a.cam), q = [[-260, CAMP_B.y, -10], [260, CAMP_B.y, -10], [-260, CAMP_B.y, 560], [260, CAMP_B.y, 560]].map((p) => proyectar(b, p as V3)!).filter(Boolean); return [{ caja: [Math.min(...q.map((p) => p[0])) - 40, Math.min(...q.map((p) => p[1])) - 40, Math.max(...q.map((p) => p[0])) + 40, Math.max(...q.map((p) => p[1])) + 40], escala: 3 }]; },
};

const P_MAREA: Plano3D = {
  id: 'p2_marea', paralaje: 0.85, particulas: 'lluvia',
  armar: (w, h) => memo(`mr|${w}|${h}`, () => armarMarea(w, h)),
  revelado: { t: 0, exposicion: 1.15, rayos: { k: 0.1, c: [0.8, 0.9, 1], umbral: 0.7 }, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.4, umbral: 0.75 }, grado: gradoNoche },
  flickBase: 0.9, cuadros: NF, fps: FPS, extras: (a, c, t) => extrasFuego(a as ArmadoB, c, t, { particulas: espumaMarea }),
  zonas: (a) => { const b = baseCamara(a.cam), q = [[-800, 300, 0], [800, 300, 0], [-800, 600, 420], [800, 600, 420]].map((p) => proyectar(b, p as V3)!).filter(Boolean); return [{ caja: [Math.min(...q.map((p) => p[0])) - 20, Math.min(...q.map((p) => p[1])) - 20, Math.max(...q.map((p) => p[0])) + 20, Math.max(...q.map((p) => p[1])) + 20], escala: 3 }, ...zonasDe(a, 20, 1)]; },
};

const P_VIDRIO: Plano3D = {
  id: 'p3_vidrio', paralaje: 0.8, particulas: 'nieve', ss: 4,
  armar: (w, h) => memo(`vi|${w}|${h}`, () => armarVidrio(w, h)),
  revelado: { t: 0, exposicion: 1.05, rayos: { k: 0.12, c: [1, 0.75, 0.4], umbral: 0.8, desde: [VD[0] * 1e6, VD[1] * 1e6, VD[2] * 1e6] }, derrame: { k: 0.4, r: 4 }, bloom: { k: 0.5, umbral: 0.75 }, grado: gradoNoche },
};

const P_AUNSAAR: Plano3D = {
  id: 'p4_aunsaar', paralaje: 0.9, particulas: 'ceniza',
  armar: (w, h) => memo(`au|${w}|${h}`, () => armarAunSaar(w, h)),
  revelado: { t: 0, exposicion: 0.85, rayos: { k: 0.35, c: [1, 0.95, 0.85], umbral: 0.5, decae: 0.97 }, derrame: { k: 0.6, r: 5 }, bloom: { k: 0.4, umbral: 0.8 }, grado: gradoNoche },
};

/** Los cierres de los actos 4, 5 y 6 en 3D, por clave. */
export const PLANOS_ACTOS_B: Record<string, Plano3D[]> = {
  acto_4: [P_HJALDUR, fortin('vigdis_viva'), fortin('vigdis_muerta'), P_HERIDA],
  acto_5: [P_OZMAREN, eleccion('brasa_destruir'), eleccion('brasa_absorber'), P_MAR, P_YSMERAL],
  acto_6: [P_CAMPANA, P_MAREA, P_VIDRIO, P_AUNSAAR],
};
void [hueso, bulto, masa, esfera, cilindro, personaje, HEROES, muertoSeco, cadena, extrasFuego, zonasDe, gradoNoche, gradoAlba, gradoFuego, dirAz, gradiente, nubes];
export type { Cuerpo, Equipo, PoseMuerto, Pluma };
