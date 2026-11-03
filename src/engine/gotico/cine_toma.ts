import { rng } from '../core/rng';
import {
  lamina, mascara, rellenar, trazo, disco, desenfocar, desenfocada, pintar, brillo, degradado, halo, rayosDeLuz, mezcla, sat, suave, fbm, hex,
  type Lamina, type Mascara, type C3, type P2,
} from './cine';
import { nubes, perfil, type OpcNubes } from './siluetas';
import { modelo, modeloPersonaje, iluminar, poner, contraluz, type Luz, type Pose, type Modelo } from './estudio';
import type { Cuerpo, Equipo } from './cuerpo';
import type { Dir, Accion } from './figura';
import './catalogo/jefes';
import './catalogo/jefes2';
import './catalogo/horror';
import './catalogo/paramo';
import './catalogo/personajes';
import './catalogo/monstruos67';
import './catalogo/ahogada';
import './catalogo/celestial';
import './catalogo/infierno2';
import './catalogo/tumba';
import './catalogo/desierto2';
import './catalogo/nieve2';
import './catalogo/hielo2';
import './catalogo/selva2';
import './catalogo/botin';
import './catalogo/hielo';

/**
 * La toma de una cinemática: las capas de paralaje que se pintan para un plano y los elementos animados que el juego
 * pone encima (partículas y sprites de las hojas de efectos). Cada capa mide 1408 x 792: la pantalla base de
 * 1280 x 720 va en (64, 36), así la cámara puede correrse, temblar y acercarse sin que se vea el borde. Todo lo que
 * pinta una toma está en coordenadas de la capa; el manifiesto pasa las posiciones de los efectos a la pantalla base.
 */

export const CW = 1408, CH = 792, MX = 64, MY = 36;
/** Centro de la pantalla en coordenadas de capa. */
export const CX = CW / 2, CY = CH / 2;
/** La franja donde va la narración (pantalla base 160, 548, 960 x 144) en coordenadas de capa. */
export const NARR_Y = 548 + MY;

export type Mezcla = 'normal' | 'sumar';
export interface CapaToma { id: string; z: number; L: Lamina; paralaje: number; mezcla: Mezcla; anim?: Record<string, unknown>; soloSi?: string; opaca?: boolean; notas?: string }
/** Sprites animados de las hojas compartidas (fuego, goteo, humo, cuervos) puestos en posiciones de la capa: [x, y, escala] del pivote. */
export interface FxToma { tipo: 'sprite'; hoja: 'fuego' | 'goteo_sangre' | 'goteo_agua' | 'humo' | 'cuervo'; en: [number, number, number][]; mezcla: Mezcla; despues_de: string; paralaje: number; fps?: number; alfa?: number; soloSi?: string }

export class Toma {
  capas: CapaToma[] = [];
  fx: FxToma[] = [];
  /** Partículas del juego para este plano (una de las que ya trae). */
  particulas?: 'ceniza' | 'brasas' | 'nieve' | 'lluvia';
  constructor(readonly semilla: number) {}
  /** Una capa nueva (transparente, salvo que se pinte entera). */
  capa(id: string, z: number, paralaje: number, mezcla: Mezcla = 'normal', o: { anim?: Record<string, unknown>; soloSi?: string; opaca?: boolean; notas?: string } = {}): Lamina {
    const L = lamina(CW, CH);
    this.capas.push({ id, z, L, paralaje, mezcla, ...o });
    return L;
  }
  efecto(f: FxToma) { this.fx.push(f); }
  /** Lo que se ve de las capas normales hasta z (sin las que suman), para calcular rayos de luz o reflejos. */
  plano(hastaZ: number): Lamina {
    const out = lamina(CW, CH);
    for (const c of [...this.capas].sort((a, b) => a.z - b.z)) {
      if (c.z > hastaZ || c.soloSi) continue;
      const s = c.L.d, d = out.d;
      for (let i = 0; i < d.length; i += 4) {
        if (c.mezcla === 'sumar') { d[i] += s[i]; d[i + 1] += s[i + 1]; d[i + 2] += s[i + 2]; continue; }
        const a = s[i + 3]; if (a <= 0) continue;
        d[i] = d[i] * (1 - a) + s[i]; d[i + 1] = d[i + 1] * (1 - a) + s[i + 1]; d[i + 2] = d[i + 2] * (1 - a) + s[i + 2]; d[i + 3] = d[i + 3] * (1 - a) + a;
      }
    }
    return out;
  }
  /** Capa de rayos de luz (se suma): lo que brilla de las capas hasta `hastaZ` arrastrado hacia (sx, sy). */
  rayos(id: string, z: number, paralaje: number, hastaZ: number, sx: number, sy: number, k = 0.6, umbral = 0.35, anim?: Record<string, unknown>) {
    const base = this.plano(hastaZ), ref = new Float32Array(base.d);
    rayosDeLuz(base, sx, sy, k, umbral);
    const L = this.capa(id, z, paralaje, 'sumar', { anim });
    for (let i = 0; i < L.d.length; i += 4) { const r = base.d[i] - ref[i], g = base.d[i + 1] - ref[i + 1], b = base.d[i + 2] - ref[i + 2]; L.d[i] = r; L.d[i + 1] = g; L.d[i + 2] = b; L.d[i + 3] = sat(Math.max(r, g, b)); }
  }
}

// ------------------------------------------------------------------ luz que alumbra lo ya pintado
/** Multiplica lo pintado por una luz radial (alumbra superficies, no el vacío): d += d * c * k * caída. */
export function alumbrar(L: Lamina, x: number, y: number, r: number, c: C3, k: number, ey = 1) {
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(L.w - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r * ey)), y1 = Math.min(L.h - 1, Math.ceil(y + r * ey));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const q = Math.hypot((xx - x) / r, (yy - y) / (r * ey)); if (q >= 1) continue;
    const f = (1 - q) * (1 - q) * k, j = (yy * L.w + xx) * 4;
    L.d[j] += L.d[j] * c[0] * f; L.d[j + 1] += L.d[j + 1] * c[1] * f; L.d[j + 2] += L.d[j + 2] * c[2] * f;
  }
}
/** Oscurece hacia abajo o hacia arriba (la luz no llega): multiplica por un degradado vertical. */
export function sombraVertical(L: Lamina, y0: number, y1: number, k: number, haciaAbajo = true) {
  for (let y = 0; y < L.h; y++) { const t = haciaAbajo ? suave(y0, y1, y) : 1 - suave(y0, y1, y), f = 1 - k * t; if (f >= 1) continue; for (let x = 0; x < L.w; x++) { const j = (y * L.w + x) * 4; L.d[j] *= f; L.d[j + 1] *= f; L.d[j + 2] *= f; } }
}
/** Grano de película solo en lo opaco. */
export function granoOpaco(L: Lamina, k: number, s: number) {
  for (let i = 0; i < L.w * L.h; i++) { const a = L.d[i * 4 + 3]; if (a < 0.99) continue; const n = (fbm((i % L.w) * 0.9, Math.floor(i / L.w) * 0.9, 1, s) - 0.5) * k * 2, j = i * 4; L.d[j] = Math.max(0, L.d[j] + n * 0.6); L.d[j + 1] = Math.max(0, L.d[j + 1] + n * 0.55); L.d[j + 2] = Math.max(0, L.d[j + 2] + n * 0.6); }
}

// ------------------------------------------------------------------ cielos y tierra
/** Cielo pintado entero: degradado, resplandor en la fuente de luz, estrellas opcionales y bancos de nubes. */
export function cielo(L: Lamina, paradas: [number, string][], o: { fuente?: [number, number, number, C3, number]; estrellas?: number; nubes?: OpcNubes[]; s?: number } = {}) {
  degradado(L, paradas.map(([t, c]) => [t, hex(c)] as [number, C3]));
  if (o.fuente) { const [x, y, r, c, k] = o.fuente; halo(L, x, y, r, c, k, 0.6); halo(L, x, y, r * 0.35, mezcla(c, [1, 1, 1], 0.3), k * 0.8, 0.8); }
  if (o.estrellas) { const r = rng(o.s ?? 5); for (let i = 0; i < o.estrellas; i++) { const x = r() * L.w, y = r() * L.h * 0.45, k = r() * 0.4 * (1 - y / (L.h * 0.45)); halo(L, x, y, 1.6, [0.8, 0.82, 0.95], k); } }
  for (const n of o.nubes ?? []) nubes(L, n);
}
/** Cerros o lomas: silueta pintada con textura, borde de arriba encendido y niebla en su base. */
export function lomas(L: Lamina, base: number, amp: number, s: number, c: C3, o: { escala?: number; rug?: number; picos?: number; filo?: C3; kFilo?: number; dx?: number; dy?: number; deform?: (x: number, y: number) => number } = {}): Mascara {
  const m = mascara(L.w, L.h);
  let pts = perfil(L.w, L.h, base, amp, s, { escala: o.escala, rug: o.rug, picos: o.picos });
  if (o.deform) pts = pts.map(([x, y]) => [x, y < L.h ? y + o.deform!(x, y) : y] as P2);
  rellenar(m, pts);
  pintarConRuido(L, m, c, 0.3, 40, s);
  if (o.filo) contraluz(L, m, o.dx ?? 0, o.dy ?? 3, o.filo, o.kFilo ?? 0.8);
  return m;
}
/** Pinta a través de una máscara con el color variado por ruido. */
export function pintarConRuido(L: Lamina, m: Mascara, c: C3, variacion = 0.35, esc = 30, s = 1) {
  const d = L.d;
  for (let i = 0, n = L.w * L.h; i < n; i++) {
    const a = Math.min(1, m.d[i]); if (a <= 0) continue;
    const x = i % L.w, y = (i - x) / L.w, v = 1 + (fbm(x / esc, y / esc, 4, s) - 0.5) * 2 * variacion, j = i * 4;
    d[j] = d[j] * (1 - a) + c[0] * v * a; d[j + 1] = d[j + 1] * (1 - a) + c[1] * v * a; d[j + 2] = d[j + 2] * (1 - a) + c[2] * v * a; d[j + 3] = d[j + 3] * (1 - a) + a;
  }
}
/** Pasto seco o juncos en el borde de una silueta de suelo (máscara), de alto `alto`. */
export function pasto(m: Mascara, x0: number, x1: number, sueloEn: (x: number) => number, n: number, alto: number, s: number) {
  const r = rng(s);
  for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = sueloEn(x) + 4 + r() * 10, l = alto * (0.3 + r()); trazo(m, x, y, x + (r() - 0.5) * l * 0.5, y - l, 1.8, 0.4, 1, 'max', false); }
}
/** Llamas de luz (para capas que suman): lenguas con núcleo claro y resplandor. */
export function fogata(L: Lamina, x: number, y: number, w: number, h: number, s: number, k = 1, c: C3 = [1, 0.45, 0.12]) {
  const m = mascara(L.w, L.h), r = rng(s);
  for (let i = 0; i < 4 + w / 8; i++) {
    const cx = x + (r() - 0.5) * w, al = h * (0.4 + r() * 0.6), an = w * (0.2 + r() * 0.2), tx = cx + (r() - 0.5) * an;
    rellenar(m, [[cx - an / 2, y], [cx - an * 0.4, y - al * 0.4], [tx, y - al], [cx + an * 0.45, y - al * 0.35], [cx + an / 2, y]], 0.5 + r() * 0.5);
  }
  brillo(L, desenfocada(m, w * 0.35), c, 1.3 * k);
  brillo(L, m, mezcla(c, [1, 0.9, 0.6], 0.5), 1.1 * k);
  halo(L, x, y - h * 0.3, Math.max(w, h) * 2.2, [c[0] * 0.8, c[1] * 0.6, c[2] * 0.5], 0.5 * k, 0.8, true);
}

// ------------------------------------------------------------------ personajes de las tomas
/** El héroe de las cinemáticas: un caminante encapuchado con capa larga y espada (no delata la clase elegida). */
export const HEROE_CU: Cuerpo = { genero: 'h', alto: 1.04, ancho: 1.05, musculo: 0.6, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'corto', barba: 'corta' };
export const HEROE_EQ: Equipo = {
  torso: { tipo: 'cuero_tachonado', mat: 'cu_cuero_negro' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_negra' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero_negro' },
  manos: { tipo: 'guantes', mat: 'cu_cuero_negro' }, hombros: { tipo: 'cuero', mat: 'cu_cuero_negro' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_negra' },
  cinturon: { mat: 'cu_cuero', hebilla: 'cu_placa' }, capa: { mat: 'cu_tela_negra', largo: 1 }, arma: { tipo: 'espada', mat: 'cu_placa' },
};
/** Con la Corona puesta (los finales en que el héroe se la queda). */
export const HEROE_CORONA: Equipo = { ...HEROE_EQ, cabeza: { tipo: 'corona', mat: 'cu_oro' } };
export const VIGDIS: [Cuerpo, Equipo] = [{ genero: 'm', piel: 'cu_piel_clara', pelo: 'cu_pelo_blanco', peinado: 'largo', musculo: 0.2 }, { torso: { tipo: 'vestido', mat: 'cu_tela_azul' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje' }, cinturon: { mat: 'cu_cuero' }, izq: { tipo: 'antorcha' } }];
export const AUREN: [Cuerpo, Equipo] = [{ genero: 'h', alto: 1.1, piel: 'cu_piel_clara', pelo: 'cu_pelo_blanco', peinado: 'largo', ojos: 'cu_ojo_hielo', musculo: 0.3, alas: 'cu_tela_blanca' }, { torso: { tipo: 'placas', mat: 'cu_oro', mat2: 'cu_tela_blanca' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_blanca' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, capa: { mat: 'cu_tela_blanca' } }];
export const MIRA: [Cuerpo, Equipo] = [{ genero: 'm', piel: 'cu_piel_morena', pelo: 'cu_pelo_castano', peinado: 'cola', musculo: 0.1 }, { torso: { tipo: 'vestido', mat: 'cu_tela_morada' }, cabeza: { tipo: 'aro', mat: 'cu_oro' }, cinturon: { mat: 'cu_cuero', hebilla: 'cu_oro' } }];
export const OYA: [Cuerpo, Equipo] = [{ genero: 'm', piel: 'cu_piel_morena', pelo: 'cu_pelo_negro', peinado: 'trenzas', musculo: 0.6, ancho: 1 }, { torso: { tipo: 'cuero', mat: 'cu_cuero_negro' }, piernas: { tipo: 'calzas', mat: 'cu_tela_roja' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero' }, capa: { mat: 'cu_tela_roja', largo: 0.7 }, arma: { tipo: 'cimitarra', mat: 'cu_placa' } }];

export const heroe = (dir: Dir = 'n', acc: Accion = 'quieto', f = 0, k = 5, corona = false): Modelo => modeloPersonaje(corona ? 'heroe_corona' : 'heroe', HEROE_CU, corona ? HEROE_CORONA : HEROE_EQ, dir, acc, f, k);
export const npc = (quien: 'vigdis' | 'auren' | 'mira' | 'oya', dir: Dir, acc: Accion = 'quieto', f = 0, k = 5): Modelo => {
  const [cu, eq] = { vigdis: VIGDIS, auren: AUREN, mira: MIRA, oya: OYA }[quien];
  return modeloPersonaje(quien, cu, eq, dir, acc, f, k);
};
/** Modelo del catálogo iluminado y puesto con su pie en (x, y): devuelve la pose para sangre y efectos. */
export function figura(capa: Lamina, capaLuz: Lamina | undefined, m: Modelo, x: number, y: number, alto: number, luz: Luz, o: { espejo?: boolean; k?: number } = {}): Pose {
  const p = iluminar(m, alto, luz, { espejo: o.espejo });
  poner(capa, p, x, y, capaLuz, o.k ?? 1);
  return p;
}
export { modelo };
/** Como `figura` pero a una escala fija (px por px del render): dos modelos del mismo k quedan del mismo tamaño y alineados. */
export function figuraEsc(capa: Lamina, capaLuz: Lamina | undefined, m: Modelo, x: number, y: number, escala: number, luz: Luz, o: { espejo?: boolean } = {}): Pose {
  return figura(capa, capaLuz, m, x, y, m.img.h * escala, luz, o);
}
/** Atajo: una lámina de luz suelta con un brillo en una máscara desenfocada. */
export function resplandor(L: Lamina, m: Mascara, c: C3, k: number, r: number) { brillo(L, desenfocada(m, r), c, k); }
/** Silueta de un barco de vela: casco curvo con castillo de popa, tres mástiles, velas hinchadas y jironeadas, jarcias. */
export function barco(m: Mascara, x: number, y: number, largo: number, s: number, rotas = true) {
  const r = rng(s), h = largo * 0.13, L = largo / 2;
  const casco: P2[] = [];
  for (let k = 0; k <= 20; k++) { const u = k / 20, xx = x - L + u * largo; casco.push([xx, y - h - h * 0.5 * (Math.abs(u - 0.45) * 2) ** 2.2 - (u < 0.18 ? h * 0.9 * (1 - u / 0.18) : 0)]); }
  for (let k = 20; k >= 0; k--) { const u = k / 20, xx = x - L * 0.88 + u * largo * 0.92; casco.push([xx, y - h * 0.15 * (Math.abs(u - 0.5) * 2) ** 2]); }
  rellenar(m, casco);
  trazo(m, x + L * 0.95, y - h * 1.3, x + L * 1.35, y - h * 2.1, largo * 0.012, largo * 0.006, 1, 'max', false);
  for (const [dx, alto] of [[-0.42, 0.62], [-0.02, 0.92], [0.42, 0.74]] as [number, number][]) {
    const mx = x + dx * L, top = y - h - largo * 0.62 * alto;
    trazo(m, mx, y - h, mx, top, largo * 0.012, largo * 0.007, 1, 'max', false);
    for (const [t0, t1, an] of [[0.1, 0.42, 0.24], [0.48, 0.8, 0.2]] as [number, number, number][]) {
      const ya = top + (y - h - top) * t0, yb = top + (y - h - top) * t1, w0 = largo * an * alto * 0.55, w1 = w0 * 1.15;
      trazo(m, mx - w0, ya, mx + w0, ya, 2, 2, 1, 'max', false);
      const pts: P2[] = [[mx - w0, ya]];
      for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([mx + w0 + (w1 - w0) * u + Math.sin(u * Math.PI) * w0 * 0.12, ya + (yb - ya) * u]); }
      for (let k = 0; k <= 10; k++) { const u = 1 - k / 10, jir = rotas && r() < 0.5 ? (r() * 0.35) * (yb - ya) : 0; pts.push([mx - w1 + 2 * w1 * u, yb - jir + Math.sin(u * Math.PI) * (yb - ya) * 0.08]); }
      for (let k = 0; k <= 8; k++) { const u = 1 - k / 8; pts.push([mx - w0 - (w1 - w0) * u - Math.sin(u * Math.PI) * w0 * 0.12, ya + (yb - ya) * u]); }
      rellenar(m, pts);
      if (rotas && r() < 0.6) disco(m, mx + (r() - 0.5) * w0, (ya + yb) / 2, largo * 0.012 * (1 + r()), 1, 'restar');
    }
  }
  for (let k = 0; k < 7; k++) { const a = x + (k - 3) * L * 0.28, b = y - h * 1.1; trazo(m, a, b, x - L * 0.02 + (k - 3) * 4, y - h - largo * 0.55, 1, 1, 0.7, 'max', false); }
}
/** Ondas y brillos del agua en una lámina que suma (para que titilen). */
export function brillosAgua(L: Lamina, y0: number, y1: number, cx: number, ancho: number, c: C3, k: number, s: number) {
  const m = mascara(L.w, L.h);
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(L.h, y1); y++) for (let x = 0; x < L.w; x++) {
    const t = (y - y0) / (y1 - y0), u = (x - cx) / (ancho * (0.3 + t * 1.2));
    if (Math.abs(u) > 1.4) continue;
    m.d[y * L.w + x] = suave(0.6, 0.75, fbm(x / (20 + t * 30), y / (2.2 + t * 4), 3, s)) * Math.exp(-u * u * 2) * (1 - t * 0.5);
  }
  brillo(L, m, c, k);
}
/** Ojos que brillan en la oscuridad (pares) en una máscara. */
export function ojos(m: Mascara, n: number, zona: [number, number, number, number], tam: number, s: number) {
  const r = rng(s);
  for (let i = 0; i < n; i++) { const x = zona[0] + r() * zona[2], y = zona[1] + r() * zona[3], t = tam * (0.6 + r() * 0.8); disco(m, x, y, t); disco(m, x + t * 3.2, y + (r() - 0.5) * t, t); }
}
export { desenfocar };
