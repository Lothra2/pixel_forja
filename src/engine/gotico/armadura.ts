import { caja, esfera, elipsoide, masa, hueso, bulto, poliedro, type Pieza, type V3, type Comp } from './render';
import type { Cuerpo, Equipo, Esqueleto } from './cuerpo';
import { MATERIALES } from './materiales';

/**
 * Armadura gótica forjada a mano, para leerse a escala de juego (el héroe mide ~75 px): cascos con silueta propia por
 * clase (casco de gajos con nasal y cuernos forjados, celada de cola larga, yelmo de visera en pico), capuchas de tela
 * con caída, pliegue y borde, petos de láminas solapadas con borde oscuro, arista y remaches, gorjal y faldar, la cota de
 * malla con cuello y ruedo dentado, y cintos de cuero con hebilla, tachas y punta colgando.
 *
 * Todo es facetado (poliedros convexos por anillos): las caras agarran la luz y los cantos dan el quiebre; nada de bolas
 * ni tubos lisos. Lo que no se ve a 75 px no se pone. Los hombros, brazales, codales, rodilleras y grebas no van acá.
 */

type Fn = (fw: number, rt: number, up: number) => V3;
/** Un anillo de puntos en un marco (adelante, derecha, arriba): radio adelante y atrás distintos, ancho a los costados. */
export function anillo(P: Fn, cx: number, rF: number, rB: number, ry: number, up: number, n = 10, fase = 0.5): V3[] {
  return Array.from({ length: n }, (_, k) => {
    const a = ((k + fase) / n) * Math.PI * 2, c = Math.cos(a);
    return P(cx + c * (c >= 0 ? rF : rB), Math.sin(a) * ry, up);
  });
}
/** Un arco de anillo (de a0 a a1 en grados, 0 = adelante, + a la derecha). */
export function arco(P: Fn, cx: number, rF: number, rB: number, ry: number, up: number, a0: number, a1: number, n = 6): V3[] {
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180, c = Math.cos(a);
    return P(cx + c * (c >= 0 ? rF : rB), Math.sin(a) * ry, up);
  });
}
/**
 * Un tramo facetado (cuerno, púa, asta) de `a` a `b` en el marco P, con anillos perpendiculares al eje (así las caras
 * del costado son planas y el tramo tiene volumen de verdad), de radio w0 a w1, con n lados.
 */
export function tramo(P: Fn, a: [number, number, number], b: [number, number, number], w0: number, w1: number, n = 6, fase = 0): V3[] {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(d[0], d[1], d[2]) || 1, dn = d.map((x) => x / l);
  let u = [dn[1], -dn[0], 0]; if (Math.hypot(u[0], u[1]) < 0.2) u = [0, dn[2], -dn[1]];
  const lu = Math.hypot(u[0], u[1], u[2]); u = u.map((x) => x / lu);
  const v = [dn[1] * u[2] - dn[2] * u[1], dn[2] * u[0] - dn[0] * u[2], dn[0] * u[1] - dn[1] * u[0]];
  const pts: V3[] = [];
  for (const [c, w] of [[a, w0], [b, w1]] as const) for (let k = 0; k < n; k++) {
    const t = ((k + fase) / n) * Math.PI * 2, x = Math.cos(t) * w, y = Math.sin(t) * w;
    pts.push(P(c[0] + u[0] * x + v[0] * y, c[1] + u[1] * x + v[1] * y, c[2] + u[2] * x + v[2] * y));
  }
  return pts;
}
/** Junta oscura entre láminas (1 px real a escala de juego) y filo de brillo en aristas y cantos de arriba. */
const oscuro = -0.55, claro = 0.38, JUNTA = 0.95;
const esMetal = (m?: string) => !!m && /placa|oro|hierro|acero|bronce|plata|malla|laton/.test(m);

// ------------------------------------------------------------------ cascos y capuchas
/**
 * La pieza de cabeza nueva, si es de las que rehízo la armadura (capucha, casco, yelmo, cuernos, calavera); si no,
 * undefined y cuerpo.ts sigue con la de siempre.
 */
export function casco(e: Esqueleto, cu: Cuerpo, c: NonNullable<Equipo['cabeza']>): Pieza[] | undefined {
  const { S, cab } = e;
  const H = (cu.cabeza ?? 1) * S, cz = e.cz;
  const P: Fn = (fw, rt, up) => cab(fw * H, rt * H, cz + up * H);
  const ps: Pieza[] = [];
  const m = c.mat, orn = c.mat2;
  switch (c.tipo) {
    case 'cuernos': {
      if (!esMetal(m)) return astas(e, cu, m);
      // casco de gajos cónico con nasal, banda de frente remachada y cuernos forjados por tramos
      const oro = m === 'cu_oro';
      const casq = oro ? 'cu_oro' : m, filo = oro ? 'cu_placa_oscura' : m;
      ps.push(poliedro([...anillo(P, -0.2, 4.75, 4.6, 4.45, -0.2, 8), ...anillo(P, -0.3, 4.55, 4.5, 4.25, 2.3, 8), ...anillo(P, -0.5, 3.0, 3.2, 2.9, 4.7, 8), P(-0.9, 0, 6.9)], { mat: casq }));
      // gajos: costillas que suben del aro a la punta (agarran la luz)
      for (const g of [0, 60, -60, 120, -120, 180]) {
        const a = (g * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
        const q = (r: number, up: number, d = 0): V3 => P(-0.3 + ca * r, sa * r * 0.95 + d, up);
        ps.push(poliedro([q(4.95, 0.1, 0.35), q(4.95, 0.1, -0.35), q(4.75, 2.3, 0.3), q(4.75, 2.3, -0.3), q(3.25, 4.7, 0.2), q(3.25, 4.7, -0.2), P(-0.9, 0, 7.0)], { mat: filo, tono: claro }));
      }
      // banda de la frente, más oscura, con remaches
      ps.push(poliedro([...anillo(P, -0.2, 5.0, 4.85, 4.7, -0.7, 10), ...anillo(P, -0.2, 5.0, 4.85, 4.7, 0.5, 10)], { mat: filo, tono: oscuro * 0.8 }));
      for (const g of [-50, -20, 20, 50]) { const a = (g * Math.PI) / 180; ps.push(esfera(...P(-0.2 + Math.cos(a) * 5.15, Math.sin(a) * 4.85, -0.1), 0.5 * H, { mat: oro ? 'cu_placa_oscura' : 'cu_oro' })); }
      // nasal
      ps.push(poliedro([P(5.0, 0.6, -0.4), P(5.0, -0.6, -0.4), P(5.4, 0, -0.2), P(4.75, 0.4, -3.4), P(4.75, -0.4, -3.4), P(5.05, 0, -3.6)], { mat: filo, tono: claro * 0.5 }));
      // cuernos: tramos facetados que se afinan, salen a los costados, se curvan adelante y suben; anillos forjados oscuros
      const grande = oro ? 1.15 : 1;
      for (const s of [1, -1]) {
        const ruta: [number, number, number, number][] = [[0.4, 4.2, 1.8, 1.9], [1.3, 5.9, 2.6, 1.6], [2.3, 7.0, 4.2, 1.3], [2.9, 7.3, 6.2, 0.95], [2.8, 6.9, 8.2, 0.55], [2.3, 6.3, 9.7, 0.15]];
        const q = (i: number): [number, number, number] => [ruta[i][0] * grande, s * ruta[i][1] * grande, ruta[i][2] * (0.92 + 0.08 * grande)];
        for (let i = 0; i < ruta.length - 1; i++) {
          ps.push(poliedro(tramo(P, q(i), q(i + 1), ruta[i][3] * grande, ruta[i + 1][3] * grande, 6, 0.5), { mat: 'cu_hueso', tono: i % 2 ? -0.06 : 0.04 }));
          // anillos forjados que ciñen el cuerno
          if (i < 2) { const c = q(i + 1), dd = q(i + 2); const m0: [number, number, number] = [c[0] - (dd[0] - c[0]) * 0.12, c[1] - (dd[1] - c[1]) * 0.12, c[2] - (dd[2] - c[2]) * 0.12]; ps.push(poliedro(tramo(P, m0, c, ruta[i + 1][3] * grande * 1.18, ruta[i + 1][3] * grande * 1.18, 6, 0.5), { mat: oro ? 'cu_oro' : filo, tono: oro ? 0 : -0.1 })); }
        }
        // carrilleras en la leyenda: placa que cae sobre la mejilla, con el borde en pico
        if (oro) ps.push(poliedro([P(1.0, s * 4.75, 0), P(2.6, s * 4.35, 0), P(0.8, s * 4.95, -2.4), P(2.8, s * 4.4, -3.9), P(1.6, s * 4.6, -4.6), P(1.4, s * 4.35, -1)], { mat: 'cu_placa_oscura', tono: claro * 0.5 }));
      }
      // la cota de malla que cae sobre la nuca
      ps.push(poliedro([...arco(P, -0.2, 4.6, 4.7, 4.5, -0.4, 100, 260, 6), ...arco(P, -0.6, 4.8, 5.2, 4.8, -4.2, 100, 260, 6)], { mat: 'cu_malla', tono: -0.05 }));
      return ps;
    }
    case 'casco': {
      // celada: calota redonda con arista, visera con la vista (la ranura de los ojos) y la cola larga que protege la nuca
      ps.push(poliedro([...anillo(P, -0.3, 4.8, 4.8, 4.55, -0.6, 10), ...anillo(P, -0.4, 4.95, 4.9, 4.7, 1.6, 10), ...anillo(P, -0.5, 4.0, 4.1, 3.8, 4.2, 10), ...anillo(P, -0.6, 2.0, 2.1, 1.9, 5.5, 8)], { mat: m }));
      // cola: se abre hacia atrás y abajo en un faldón de acero, con el borde quebrado
      ps.push(poliedro([...arco(P, -0.4, 4.8, 4.8, 4.6, 0.4, 110, 250, 6), P(-6.9, 0, -3.2), P(-6.3, 3.4, -2.8), P(-6.3, -3.4, -2.8), P(-5.2, 4.3, -2.2), P(-5.2, -4.3, -2.2)], { mat: m, tono: -0.04 }));
      ps.push(poliedro([P(-6.9, 0, -3.25), P(-6.3, 3.4, -2.85), P(-6.3, -3.4, -2.85), P(-7.15, 0, -4.15), P(-6.55, 3.45, -3.75), P(-6.55, -3.45, -3.75)], { mat: m, tono: oscuro }));
      // visera: la mitad de abajo del frente, más adelante; la vista oscura y la arista de arriba
      ps.push(poliedro([...arco(P, -0.3, 5.15, 5, 4.75, -1.8, -75, 75, 6), ...arco(P, -0.3, 5.15, 5, 4.75, 0.3, -75, 75, 6), P(5.75, 0, -0.8)], { mat: m, tono: claro * 0.6 }));
      // la vista: oscura, o con el brillo de los ojos si el que la lleva los tiene encendidos (los muertos)
      ps.push(caja(...P(5.05, 0, 0.75), 1.4 * H, 6.6 * H, 0.75 * H, { mat: vistaDe(cu), giro: angH(e) }));
      ps.push(poliedro([P(4.6, 0.32, 2.6), P(4.6, -0.32, 2.6), P(1.0, 0.32, 5.4), P(1.0, -0.32, 5.4), P(-3.6, 0.32, 4.6), P(-3.6, -0.32, 4.6), P(1.2, 0, 6.0), P(-1.5, 0, 5.9)], { mat: m, tono: claro }));
      // pivotes de la visera
      for (const s of [1, -1]) ps.push(esfera(...P(1.6, s * 4.95, 0.3), 0.6 * H, { mat: orn ?? 'cu_placa_oscura' }));
      return ps;
    }
    case 'yelmo': case 'gran_yelmo': {
      if (c.tipo === 'gran_yelmo') return undefined;
      // yelmo de visera en pico (bacinete): calota alta con arista, visera que avanza en pico con dos vistas y agujeros
      // de respiro, gorjal de láminas y, en la leyenda, cresta y ribetes dorados
      ps.push(poliedro([...anillo(P, -0.4, 4.7, 4.8, 4.5, -1.4, 10), ...anillo(P, -0.5, 4.9, 4.9, 4.65, 1.8, 10), ...anillo(P, -0.8, 3.6, 3.9, 3.4, 4.8, 10), P(-1.0, 0, 7.0)], { mat: m }));
      // visera en pico
      ps.push(poliedro([...arco(P, -0.3, 5.0, 5, 4.7, -3.6, -80, 80, 6), ...arco(P, -0.3, 5.05, 5, 4.75, 2.0, -80, 80, 6), P(7.6, 0, -0.6), P(6.4, 0, 1.4), P(6.2, 0, -2.6)], { mat: m, tono: claro * 0.5 }));
      // las dos vistas (una por ojo, en diagonal hacia el pico) y los agujeros de respiro
      for (const s of [1, -1]) ps.push(poliedro([P(5.6, s * 0.7, 0.9), P(5.3, s * 2.9, 1.2), P(5.5, s * 0.7, 0.4), P(5.2, s * 2.9, 0.7), P(6.1, s * 0.7, 0.7), P(5.6, s * 2.9, 1.0)], { mat: vistaDe(cu) }));
      for (const [fw, rt, up] of [[6.4, 0.9, -1.4], [6.4, -0.9, -1.4], [6.0, 1.7, -2.0], [6.0, -1.7, -2.0]]) ps.push(caja(...P(fw, rt, up), 0.6 * H, 0.42 * H, 0.42 * H, { mat: 'cu_tela_negra', giro: angH(e) }));
      // arista de la calota
      ps.push(poliedro([P(4.3, 0.3, 3.2), P(4.3, -0.3, 3.2), P(0.6, 0.3, 6.2), P(0.6, -0.3, 6.2), P(-4.2, 0.3, 4.4), P(-4.2, -0.3, 4.4), P(-1.0, 0, 7.15)], { mat: m, tono: claro }));
      // gorjal de dos láminas bajo el yelmo
      for (const [u0, u1, r] of [[-3.6, -4.6, 4.9], [-4.4, -5.5, 5.4]] as const) ps.push(poliedro([...anillo(P, -0.4, r, r, r * 0.95, u0, 10), ...anillo(P, -0.4, r + 0.3, r + 0.3, (r + 0.3) * 0.95, u1, 10)], { mat: m, tono: u0 < -4 ? -0.08 : 0 }));
      if (orn) {
        // leyenda: cresta en hoja con el frente en punta, ribete del borde de la visera y del gorjal
        ps.push(poliedro([P(3.6, 0.35, 4.4), P(3.6, -0.35, 4.4), P(6.2, 0, 7.8), P(0.5, 0.35, 7.0), P(0.5, -0.35, 7.0), P(-3.4, 0.3, 6.6), P(-3.4, -0.3, 6.6), P(-5.4, 0, 5.2), P(-1.0, 0, 9.4), P(2.6, 0, 9.0)], { mat: orn }));
        ps.push(poliedro([...arco(P, -0.3, 5.2, 5, 4.9, 1.9, -82, 82, 6), ...arco(P, -0.3, 5.2, 5, 4.9, 2.5, -82, 82, 6)], { mat: orn }));
        ps.push(poliedro([...anillo(P, -0.4, 5.75, 5.75, 5.45, -5.4, 10), ...anillo(P, -0.4, 5.8, 5.8, 5.5, -5.9, 10)], { mat: orn }));
      }
      return ps;
    }
    case 'capucha':
      return capucha(e, cu, m, orn);
    case 'diadema': case 'aro': case 'corona': {
      // aro forjado: banda facetada con los cantos oscuros, una montura en punta con la gema al frente; la corona con
      // cinco puntas que suben (la del medio más alta)
      const alto = c.tipo === 'corona' ? 1.2 : 0.8, up0 = 2.2;
      ps.push(poliedro([...anillo(P, -0.3, 4.55, 4.5, 4.3, up0, 12), ...anillo(P, -0.3, 4.6, 4.55, 4.35, up0 + alto, 12)], { mat: m }));
      for (const u of [up0 - 0.05, up0 + alto + 0.05]) ps.push(poliedro([...anillo(P, -0.3, 4.65, 4.6, 4.42, u - 0.22, 12), ...anillo(P, -0.3, 4.65, 4.6, 4.42, u + 0.22, 12)], { mat: m, tono: oscuro * 0.6 }));
      ps.push(poliedro([P(4.75, 0.9, up0 - 0.2), P(4.75, -0.9, up0 - 0.2), P(4.9, 0, up0 - 0.9), P(4.8, 0, up0 + alto + (c.tipo === 'aro' ? 0.9 : 1.6)), P(4.4, 0.7, up0 + alto), P(4.4, -0.7, up0 + alto)], { mat: m, tono: claro * 0.5 }));
      ps.push(esfera(...P(5.0, 0, up0 + alto * 0.5 + 0.1), 0.75 * H, { mat: orn ?? (c.tipo === 'aro' ? 'cu_ojo_verde' : 'magia') }));
      if (c.tipo === 'corona') for (const g of [-70, -35, 35, 70, 180]) {
        const a = (g * Math.PI) / 180, x = -0.3 + Math.cos(a) * 4.45, y = Math.sin(a) * 4.25, h0 = up0 + alto, alta = Math.abs(g) === 35 ? 2.4 : 1.8;
        ps.push(poliedro([P(x + Math.sin(a) * 0.55, y - Math.cos(a) * 0.55, h0), P(x - Math.sin(a) * 0.55, y + Math.cos(a) * 0.55, h0), P(x * 0.97, y * 0.97, h0 + alta), P(x * 0.93, y * 0.93, h0)], { mat: m, tono: claro * 0.4 }));
      }
      return ps;
    }
    case 'gorro': {
      // gorro de cuero de ala vuelta: copa facetada, el ala doblada hacia arriba con la costura oscura y una hebilla
      ps.push(poliedro([...anillo(P, -0.4, 4.5, 4.6, 4.3, 0.8, 10), ...anillo(P, -0.5, 4.2, 4.3, 4.0, 3.6, 10), ...anillo(P, -0.7, 2.6, 2.8, 2.5, 5.6, 8)], { mat: m }));
      ps.push(poliedro([...anillo(P, -0.4, 5.6, 5.4, 5.2, 0.6, 12), ...anillo(P, -0.4, 5.1, 5.0, 4.8, 2.0, 12), ...anillo(P, -0.4, 4.6, 4.6, 4.4, 0.6, 12)], { mat: orn ?? m, tono: -0.05 }));
      ps.push(poliedro([...anillo(P, -0.4, 5.65, 5.45, 5.25, 0.45, 12), ...anillo(P, -0.4, 5.65, 5.45, 5.25, 0.95, 12)], { mat: orn ?? m, tono: oscuro }));
      ps.push(caja(...P(5.0, 2.2, 1.0), 0.5 * H, 1.2 * H, 1.2 * H, { mat: 'cu_oro', giro: angH(e) }));
      return ps;
    }
    case 'mascara': {
      // media máscara de placa con respirador: cubre nariz y boca, un hocico facetado con las ranuras oscuras y dos
      // correas que van atrás; los ojos quedan libres
      ps.push(poliedro([P(3.6, 3.4, -0.3), P(3.6, -3.4, -0.3), P(4.6, 2.2, 0.2), P(4.6, -2.2, 0.2), P(5.8, 0, -0.6), P(6.6, 0, -2.0), P(5.6, 1.6, -3.2), P(5.6, -1.6, -3.2), P(3.8, 3.0, -3.4), P(3.8, -3.0, -3.4), P(4.6, 0, -4.4)], { mat: m }));
      for (const u of [-1.4, -2.2]) ps.push(caja(...P(6.1 - (u + 1.4) * -0.4, 0, u), 0.7 * H, 2.4 * H, 0.35 * H, { mat: 'cu_tela_negra', giro: angH(e) }));
      ps.push(poliedro([P(5.85, 0.25, -0.5), P(5.85, -0.25, -0.5), P(6.7, 0.25, -2.0), P(6.7, -0.25, -2.0), P(5.6, 0, -0.2), P(6.9, 0, -2.0)], { mat: m, tono: claro }));
      for (const s2 of [1, -1]) ps.push(poliedro(tramo(P, [3.4, s2 * 3.5, -1.0], [-2.8, s2 * 4.0, 0.2], 0.45, 0.45, 4), { mat: 'cu_cuero_negro' }));
      return ps;
    }
    case 'calavera': {
      // la calavera de un gran muerto puesta como yelmo, sobre una capucha: el cráneo facetado con la frente y las
      // cuencas oscuras sobre la frente del que la lleva, los colmillos sobre los ojos y dos cuernos que van atrás
      ps.push(...capucha(e, cu, 'cu_tela_negra', undefined, 0.5));
      const h = 'cu_hueso';
      ps.push(poliedro([...anillo(P, -0.2, 4.9, 4.7, 4.5, 1.2, 10), ...anillo(P, -0.4, 4.4, 4.5, 4.1, 3.9, 10), ...anillo(P, -0.8, 2.6, 2.8, 2.4, 6.1, 8)], { mat: h }));
      // frente y cejas en quiebre
      ps.push(poliedro([P(5.6, 0, 2.6), P(5.1, 2.6, 2.4), P(5.1, -2.6, 2.4), P(4.4, 3.6, 3.4), P(4.4, -3.6, 3.4), P(4.6, 0, 4.4), P(4.2, 2.2, 1.2), P(4.2, -2.2, 1.2)], { mat: h, tono: claro * 0.6 }));
      for (const s of [1, -1]) ps.push(elipsoide(...P(5.15, s * 1.6, 1.55), 0.8 * H, 1.15 * H, 0.95 * H, { mat: 'cu_tela_negra' }));
      // pómulos y la quijada de arriba con los dientes, sobre los ojos del que la lleva
      ps.push(poliedro([P(4.9, 3.4, 1.0), P(4.9, -3.4, 1.0), P(5.4, 1.6, 0.4), P(5.4, -1.6, 0.4), P(5.0, 2.6, -0.2), P(5.0, -2.6, -0.2), P(4.2, 3.6, 0.0), P(4.2, -3.6, 0.0)], { mat: h, tono: -0.05 }));
      for (let k = -2; k <= 2; k++) ps.push(poliedro([P(5.35, k * 0.75 + 0.3, 0.35), P(5.35, k * 0.75 - 0.3, 0.35), P(5.25, k * 0.75, -0.7 - (Math.abs(k) === 1 ? 0.5 : 0)), P(4.85, k * 0.75, 0.2)], { mat: h, tono: claro * 0.5 }));
      // dos púas cortas que suben de las sienes del cráneo (no van atrás: ahí pasa el asta de la guadaña)
      for (const s of [1, -1]) {
        ps.push(poliedro(tramo(P, [0.6, s * 3.6, 4.0], [0.2, s * 4.6, 6.4], 0.85, 0.45, 5), { mat: 'cu_placa_oscura', tono: 0.05 }));
        ps.push(poliedro(tramo(P, [0.2, s * 4.6, 6.4], [0.6, s * 4.4, 8.0], 0.45, 0.06, 5), { mat: 'cu_placa_oscura', tono: -0.05 }));
      }
      return ps;
    }
  }
  return undefined;
}
/** Gorro de cuero con astas (druida): casquete con la costura del borde y dos astas que suben con sus puntas. */
function astas(e: Esqueleto, cu: Cuerpo, m: string): Pieza[] {
  const { S, cab } = e;
  const H = (cu.cabeza ?? 1) * S, cz = e.cz;
  const P: Fn = (fw, rt, up) => cab(fw * H, rt * H, cz + up * H);
  const ps: Pieza[] = [];
  ps.push(poliedro([...anillo(P, -0.3, 4.6, 4.7, 4.4, 0.0, 10), ...anillo(P, -0.4, 4.4, 4.5, 4.2, 2.6, 10), ...anillo(P, -0.6, 2.8, 3.0, 2.7, 4.9, 8)], { mat: m }));
  ps.push(poliedro([...anillo(P, -0.3, 4.85, 4.95, 4.65, -0.5, 10), ...anillo(P, -0.3, 4.85, 4.95, 4.65, 0.45, 10)], { mat: m, tono: oscuro * 0.7 }));
  for (const s of [1, -1]) {
    const k = 1.35, q = (f: number, r: number, u: number): [number, number, number] => [f * k, s * (3.4 + (r - 3.4) * k), 3.4 + (u - 3.4) * k];
    const tr = (a: [number, number, number], b: [number, number, number], w0: number, w1: number) => ps.push(poliedro(tramo(P, a, b, w0 * 1.2, w1 * 1.2, 5), { mat: 'cu_hueso', tono: 0.04 }));
    tr(q(-0.4, 3.4, 3.4), q(-0.9, 5.0, 6.4), 0.75, 0.55);
    tr(q(-0.9, 5.0, 6.4), q(-1.6, 5.4, 9.6), 0.55, 0.3);
    tr(q(-1.6, 5.4, 9.6), q(-1.9, 5.0, 11.4), 0.3, 0.06);
    tr(q(-0.9, 5.0, 6.4), q(0.9, 6.4, 8.2), 0.4, 0.06);
    tr(q(-1.4, 5.3, 8.6), q(-0.2, 6.6, 10.0), 0.32, 0.05);
  }
  return ps;
}
/** La vista de un yelmo: negra, o del material de los ojos si brillan (un muerto que mira por la ranura). */
const vistaDe = (cu: Cuerpo) => (cu.ojos && MATERIALES[cu.ojos]?.emite ? cu.ojos : 'cu_tela_negra');
const angH = (e: Esqueleto) => (Math.atan2(e.ejesCab[0][1], e.ejesCab[0][0]) * 180) / Math.PI;

/**
 * Capucha de tela: la cáscara sobre la cabeza con el pico que cae atrás, el borde grueso y doblado alrededor de la
 * cara, la esclavina que cae sobre los hombros con tres pliegues, y la cara en sombra adentro.
 */
function capucha(e: Esqueleto, cu: Cuerpo, mat: string, borde?: string, sombra = 1): Pieza[] {
  const { S, cab, T } = e;
  const H = (cu.cabeza ?? 1) * S, cz = e.cz;
  const P: Fn = (fw, rt, up) => cab(fw * H, rt * H, cz + up * H);
  const cs: Comp[] = [
    bulto(P(-0.9, 0, 1.4), [5.0 * H, 4.75 * H, 5.1 * H], { ejes: e.ejesCab, mat }),
    // el pico de la capucha cae atrás, casi hasta la nuca
    hueso(P(-2.6, 0, 4.2), P(-5.6, 0, 3.0), 2.6 * H, 1.0 * H, { mat }),
    hueso(P(-5.6, 0, 3.0), P(-6.6, 0, 0.2), 1.0 * H, 0.35 * H, { mat }),
    // la esclavina: cae del cuello sobre los hombros y la espalda
    hueso(P(-2.0, 0, -2.6), T(-2.4 * S, 0, e.hombroZ - 1.2 * S), 4.4 * H, 5.4 * S, { mat }),
  ];
  for (const s of [1, -1]) {
    // los costados bajan de las sienes al pecho, en dos pliegues
    cs.push(hueso(P(0.4, s * 4.4, 0.2), T(2.2 * S, s * 4.6 * S, e.hombroZ - 2.6 * S), 1.7 * H, 2.2 * S, { mat }));
    cs.push(hueso(P(-1.6, s * 4.2, -1.8), T(-0.6 * S, s * 6.4 * S, e.hombroZ - 1.6 * S), 1.6 * H, 2.0 * S, { mat }));
  }
  const ps: Pieza[] = [masa(cs, { mat, suave: 1.4 * S })];
  // el borde doblado alrededor de la cara: un anillo grueso de tramos, un tono más oscuro (o del color del ribete)
  const bc: Comp[] = [];
  const pts = Array.from({ length: 9 }, (_, k) => { const a = -Math.PI * 0.62 + (k / 8) * Math.PI * 1.24; return P(3.6 - Math.abs(Math.sin(a)) * 0.6, Math.sin(a) * 4.0, 0.9 + Math.cos(a) * 4.6 - 0.4); });
  for (let k = 0; k < pts.length - 1; k++) bc.push(hueso(pts[k], pts[k + 1], 0.95 * H, 0.95 * H, { mat: borde ?? mat }));
  ps.push(masa(bc, { mat: borde ?? mat, suave: 0.4 * S, tono: borde ? 0 : -0.14 }));
  // un pliegue en la coronilla que baja hacia el pico
  ps.push(masa([hueso(P(2.6, 0.9, 5.3), P(-3.2, 1.3, 5.2), 0.7 * H, 0.5 * H, { mat })], { mat, tono: 0.08 }));
  // la cara en sombra dentro de la capucha
  if (sombra > 0) ps.push(elipsoide(...P(3.25, 0, -0.1), 0.7 * H, 3.3 * H, 3.8 * H, { mat: 'cu_tela_negra', giro: angH(e), tono: -0.2 * sombra }));
  return ps;
}

// ------------------------------------------------------------------ peto de placas
/**
 * Coraza gótica por láminas: el peto (con arista al medio) y el espaldar en una pieza facetada; tres láminas solapadas
 * que bajan al vientre, cada una apenas más afuera que la de arriba y con el canto oscuro; el gorjal de dos láminas; los
 * remaches; el faldar de dos escarcelas por lado colgando de la cintura. `adorno` (leyenda): ribetes y remaches de ese
 * metal, el canto de abajo en pico y la arista dorada.
 */
export function peto(e: Esqueleto, cu: Cuerpo, to: NonNullable<Equipo['torso']>, adorno?: string): Pieza[] {
  const { S, A, T, zc } = e;
  const g = (cu.grasa ?? 0) * 1.5, mu = (cu.musculo ?? 0.5) * 0.6, m = to.mat;
  const PT: Fn = (fw, rt, up) => T(fw * A, rt * A, zc + up * S);
  const Pv = e.Pv ?? e.W, PP: Fn = (fw, rt, up) => Pv(fw * A, rt * A, zc + up * S);
  const ps: Pieza[] = [];
  const pad = 1.25;
  // sección del torso a cada altura: radio adelante, atrás y ancho (sobre el cuerpo, con el acolchado de debajo)
  // (en una mujer el peto marca el pecho y ciñe la cintura, sin caricatura; la cadera vuelve a abrir)
  const mj = cu.genero === 'm' ? 1 : 0;
  const sec = (u: number): [number, number, number, number] => {
    const t: [number, number, number, number][] = [[17.2, 2.7, 3.1, 4.4 - 0.3 * mj], [15.2, 4.4 + 0.2 * mj, 3.9, 6.0 + mu - 0.6 * mj], [12.2, 4.6 + g + 0.35 * mj, 4.1, 5.9 + mu - 0.7 * mj], [9.4, 4.0 + g - 0.3 * mj, 3.8 - 0.2 * mj, 5.0 - 0.8 * mj], [7.0, 3.7 + g - 0.4 * mj, 3.5 - 0.3 * mj, 4.6 - 0.9 * mj], [4.6, 3.8 + g - 0.2 * mj, 3.6, 4.8 - 0.3 * mj], [2.4, 4.0 + g, 3.8, 5.1 + 0.2 * mj]];
    for (let i = 0; i < t.length - 1; i++) if (u <= t[i][0] && u >= t[i + 1][0]) { const k = (t[i][0] - u) / (t[i][0] - t[i + 1][0]); return [u, ...[1, 2, 3].map((j) => t[i][j] + (t[i + 1][j] - t[i][j]) * k)] as [number, number, number, number]; }
    return u > t[0][0] ? t[0] : t[t.length - 1];
  };
  const ring = (u: number, extra = 0, n = 12, P: Fn = PT) => { const [, rF, rB, ry] = sec(u); return anillo(P, 0.2, rF + pad + extra, rB + pad + extra, ry + pad + extra, u, n); };
  // peto y espaldar: una sola pieza facetada con la arista al frente
  const quilla = (u: number, k: number) => { const [, rF] = sec(u); return PT(0.2 + rF + pad + k, 0, u); };
  ps.push(poliedro([...ring(16.8, -0.1, 10), ...ring(14.6), ...ring(12.0), ...ring(9.6, -0.1), quilla(14.0, 0.9), quilla(12.0, 1.0), quilla(10.0, 0.7)], { mat: m }));
  // canto de abajo del peto: oscuro, apenas afuera (la línea que separa el peto de las láminas); en la leyenda en pico
  const cantoPeto = adorno ? [...ring(9.9, 0.22), ...ring(9.9 - JUNTA, 0.22), quilla(8.4, 0.5)] : [...ring(9.9, 0.22), ...ring(9.9 - JUNTA, 0.22)];
  ps.push(poliedro(cantoPeto, { mat: adorno ?? m, tono: adorno ? 0 : oscuro }));
  // las láminas del vientre: cada una arranca un poco más afuera que donde terminó la de arriba (se solapan)
  const laminas: [number, number][] = [[9.3, 7.0], [7.2, 4.9], [5.1, 2.8]];
  laminas.forEach(([u0, u1], i) => {
    const sale = 0.12 + i * 0.12;
    ps.push(poliedro([...ring(u0, sale), ...ring(u1, sale + 0.18)], { mat: m, tono: i % 2 ? -0.05 : 0.02 }));
    ps.push(poliedro([...ring(u1 + JUNTA * 0.5, sale + 0.4), ...ring(u1 - JUNTA * 0.5, sale + 0.4)], { mat: adorno && i === 2 ? adorno : m, tono: adorno && i === 2 ? 0 : oscuro }));
    // el filo de arriba de la lámina agarra la luz (el canto que sale de debajo de la de arriba)
    const fr = (u: number, k: number) => { const [, rF, , ry] = sec(u); return arco(PT, 0.2, rF + pad + k, 0, ry + pad + k, u, -70, 70, 6); };
    ps.push(poliedro([...fr(u0 - 0.1, sale + 0.05), ...fr(u0 - 0.55, sale + 0.12)], { mat: m, tono: claro }));
    // remaches a los costados del frente
    for (const s of [1, -1]) { const [, rF, , ry] = sec((u0 + u1) / 2); const a = 0.55; ps.push(esfera(...PT(0.2 + Math.cos(a) * (rF + pad + sale + 0.35), s * Math.sin(a) * (ry + pad + sale + 0.2), (u0 + u1) / 2), 0.55 * S, { mat: adorno ?? m, tono: adorno ? 0 : claro * 1.5 })); }
  });
  // filo de brillo en la arista del peto
  ps.push(poliedro([quilla(14.3, 1.02), quilla(14.3, 0.75), quilla(10.2, 0.78), quilla(10.2, 0.5), PT(sec(14.3)[1] + pad + 0.75, 0.3, 14.3), PT(sec(14.3)[1] + pad + 0.75, -0.3, 14.3)], { mat: m, tono: claro * 1.2 }));
  // remaches del peto a la altura del pecho y ribete del borde de arriba
  for (const s of [1, -1]) { const [, rF, , ry] = sec(14.6); ps.push(esfera(...PT(0.2 + Math.cos(0.7) * (rF + pad + 0.3), s * Math.sin(0.7) * (ry + pad + 0.2), 15.4), 0.6 * S, { mat: adorno ?? m, tono: adorno ? 0 : claro * 1.5 })); }
  if (adorno) {
    ps.push(poliedro([...arco(PT, 0.2, sec(16.6)[1] + pad + 0.25, 0, sec(16.6)[3] + pad + 0.25, 16.6, -80, 80, 6), ...arco(PT, 0.2, sec(16.0)[1] + pad + 0.3, 0, sec(16.0)[3] + pad + 0.3, 16.0, -80, 80, 6)], { mat: adorno }));
    ps.push(poliedro([quilla(14.2, 1.05), quilla(14.2, 0.7), quilla(9.9, 0.85), quilla(9.9, 0.5), PT(sec(14.2)[1] + pad + 0.9, 0.35, 14.2), PT(sec(9.9)[1] + pad + 0.6, -0.35, 9.9)], { mat: adorno }));
  }
  // gorjal: dos láminas alrededor del cuello, la de abajo más ancha
  for (const [u0, u1, r0, r1, t] of [[16.4, 17.6, 3.9, 3.3, 0], [17.4, 18.5, 3.4, 2.9, 0.06]] as const) {
    ps.push(poliedro([...anillo(PT, -0.1, r0 + 0.4, r0, r0 * 1.12, u0, 10), ...anillo(PT, -0.1, r1 + 0.3, r1, r1 * 1.1, u1, 10)], { mat: m, tono: t }));
  }
  ps.push(poliedro([...anillo(PT, -0.1, 3.75, 3.45, 3.95, 17.6, 10), ...anillo(PT, -0.1, 3.75, 3.45, 3.95, 17.6 - JUNTA, 10)], { mat: adorno ?? m, tono: adorno ? 0 : oscuro }));
  // faldar: dos escarcelas por lado colgando de la cintura sobre los muslos, la de abajo asoma; canto oscuro (o en pico)
  for (const s of [1, -1]) for (const [k, z0, z1] of [[0, 2.2, -2.2], [1, -1.6, -5.0]] as const) {
    const w0 = 1.2 + k * 0.1, w1 = 3.7 + k * 0.2, fw = 4.5 + k * 0.35;
    const a: V3 = PP(fw - 0.2, s * w0, z0), b: V3 = PP(fw - 0.2, s * (w0 + 3.0), z0), c: V3 = PP(fw + 0.5, s * w0, z1), d: V3 = PP(fw + 0.4, s * w1, z1);
    const pico: V3[] = adorno ? [PP(fw + 0.6, s * (w0 + w1) / 2, z1 - 1.0)] : [];
    const placa = [a, b, c, d, ...pico];
    const grueso = (q: V3): V3 => PP(0, 0, 0).map((o, j) => q[j] - (PP(1, 0, 0)[j] - o) * 0.5) as V3;
    ps.push(poliedro([...placa, ...placa.map(grueso)], { mat: m, tono: k ? -0.06 : 0.03 }));
    ps.push(poliedro([c, d, ...pico, PP(fw + 0.55, s * w0, z1 + 0.45), PP(fw + 0.45, s * w1, z1 + 0.45), ...[c, d, ...pico].map(grueso)], { mat: adorno ?? m, tono: adorno ? 0 : oscuro }));
    ps.push(esfera(...PP(fw + 0.2, s * (w0 + 1.4), z0 - 0.7), 0.5 * S, { mat: adorno ?? m, tono: adorno ? 0 : claro * 1.5 }));
  }
  return ps;
}

// ------------------------------------------------------------------ cota de malla
/** La cota de malla: cuello de malla grueso y el ruedo dentado que cae sobre los muslos (la cota misma la pinta cuerpo.ts). */
export function malla(e: Esqueleto, cu: Cuerpo, to: NonNullable<Equipo['torso']>): Pieza[] {
  const { S, A, T, zc } = e;
  const PT: Fn = (fw, rt, up) => T(fw * A, rt * A, zc + up * S);
  const Pv = e.Pv ?? e.W, PP: Fn = (fw, rt, up) => Pv(fw * A, rt * A, zc + up * S);
  const m = to.mat, ps: Pieza[] = [];
  const g = (cu.grasa ?? 0) * 1.5;
  // cuello: un rollo de malla alrededor de la base del cuello
  ps.push(poliedro([...anillo(PT, -0.3, 4.1, 3.7, 4.4, 16.2, 10), ...anillo(PT, -0.3, 3.6, 3.3, 3.8, 18.0, 10), ...anillo(PT, -0.3, 4.3, 3.9, 4.6, 17.0, 10)], { mat: m, tono: -0.08 }));
  // ruedo dentado: puntas de malla alrededor de la cadera
  const n = 12;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    const r = (a: number) => [Math.cos(a) * (4.7 + g), Math.sin(a) * (5.4 + g * 0.5)];
    const [x0, y0] = r(a0), [x1, y1] = r(a1), [xm, ym] = r(am);
    ps.push(poliedro([PP(x0, y0, -1.2), PP(x1, y1, -1.2), PP(xm * 1.04, ym * 1.04, -3.4 - (k % 2) * 0.8), PP(x0 * 0.88, y0 * 0.88, -1.2), PP(x1 * 0.88, y1 * 0.88, -1.2)], { mat: m, tono: k % 2 ? -0.1 : 0 }));
  }
  return ps;
}

// ------------------------------------------------------------------ cinto
/**
 * Cinto de cuero facetado con el canto oscuro arriba y abajo. Con hebilla de metal: marco de hebilla con su pasador, la
 * punta del cinto colgando, tachas y una bolsa al costado; con hebilla de oro o de gema (leyenda): una placa en rombo
 * con la gema. Sin hebilla: un nudo con dos puntas.
 */
export function cinto(e: Esqueleto, cu: Cuerpo, ci: NonNullable<Equipo['cinturon']>): Pieza[] {
  const { S, A, zc } = e;
  const Pv = e.Pv ?? e.W, PP: Fn = (fw, rt, up) => Pv(fw * A, rt * A, zc + up * S);
  const g = (cu.grasa ?? 0) * 1.5, m = ci.mat, hb = ci.hebilla, ps: Pieza[] = [];
  const rF = 4.75 + g, rB = 4.6 + g, ry = 5.15 + g * 0.6;
  ps.push(poliedro([...anillo(PP, 0, rF, rB, ry, 0.5, 12), ...anillo(PP, 0, rF + 0.1, rB + 0.1, ry + 0.1, 2.9, 12)], { mat: m }));
  for (const u of [0.45, 2.7]) ps.push(poliedro([...anillo(PP, 0, rF + 0.18, rB + 0.18, ry + 0.18, u, 12), ...anillo(PP, 0, rF + 0.18, rB + 0.18, ry + 0.18, u + 0.3, 12)], { mat: m, tono: oscuro }));
  const giro = angPv(e);
  if (!hb) {
    // nudo y dos puntas colgando
    ps.push(poliedro([PP(rF + 0.4, 0.9, 2.4), PP(rF + 0.4, -0.9, 2.4), PP(rF + 0.4, 0.9, 0.8), PP(rF + 0.4, -0.9, 0.8), PP(rF + 1.2, 0, 1.6), PP(rF, 0, 1.6)], { mat: m, tono: 0.06 }));
    for (const [y, l] of [[0.5, 4.2], [-0.7, 3.2]]) ps.push(caja(...PP(rF + 0.5, y, 1 - l), 0.5, 1.0 * A, l * S, { mat: m, giro, tono: -0.04 }));
    return ps;
  }
  const rica = /oro|ojo|magia|hueso|lava|gema/.test(hb) && hb !== 'cu_placa';
  const metal = esMetal(hb) ? hb : 'cu_placa';
  if (rica) {
    // placa en rombo con la gema (o el hueso) al medio y un ribete
    const q = (fw: number, y: number, u: number) => PP(rF + fw, y, u);
    ps.push(poliedro([q(0.3, 0, 4.0), q(0.3, 2.4, 1.7), q(0.3, 0, -0.6), q(0.3, -2.4, 1.7), q(0.9, 0, 3.2), q(0.9, 1.7, 1.7), q(0.9, 0, 0.2), q(0.9, -1.7, 1.7)], { mat: hb === 'cu_hueso' ? 'cu_hueso' : 'cu_oro' }));
    ps.push(esfera(...q(1.15, 0, 1.7), 0.95 * S, { mat: hb === 'cu_oro' ? 'cu_lava' : hb }));
  } else {
    // marco de hebilla con su pasador y la punta del cinto que sale y cuelga
    const q = (fw: number, y: number, u: number) => PP(rF + fw, y, u);
    for (const [y0, y1, u0, u1] of [[1.3, 1.3, 0.1, 3.3], [-1.3, -1.3, 0.1, 3.3], [-1.3, 1.3, 3.3, 3.3], [-1.3, 1.3, 0.1, 0.1]]) ps.push(poliedro([q(0.25, y0, u0), q(0.25, y1, u1), q(0.85, y0, u0), q(0.85, y1, u1), q(0.55, y0 + (y0 === y1 ? 0.35 : 0), u0 + (u0 === u1 ? 0.35 : 0)), q(0.55, y1 + (y0 === y1 ? 0.35 : 0), u1 + (u0 === u1 ? 0.35 : 0))], { mat: metal, tono: claro * 0.5 }));
    ps.push(caja(...q(0.7, 0, 0.3), 0.4, 0.4, 2.8 * S, { mat: metal, giro }));
    ps.push(caja(...PP(rF + 0.45, -2.2, -3.4), 0.5, 1.1 * A, 4.4 * S, { mat: m, giro, tono: -0.06 }));
  }
  // tachas alrededor y una bolsa al costado derecho
  for (const a of [-1.2, -0.7, 0.7, 1.2, 2.2, -2.2]) ps.push(esfera(...PP(Math.cos(a) * (rF + 0.25), Math.sin(a) * (ry + 0.25), 1.7), 0.45 * S, { mat: metal, tono: claro }));
  ps.push(poliedro([PP(1.4, ry + 0.3, 1.4), PP(-1.6, ry + 0.3, 1.4), PP(1.3, ry + 1.6, 0.8), PP(-1.5, ry + 1.6, 0.8), PP(1.2, ry + 1.7, -2.6), PP(-1.4, ry + 1.7, -2.6), PP(1.2, ry + 0.4, -2.8), PP(-1.4, ry + 0.4, -2.8)], { mat: m, tono: 0.05 }));
  ps.push(poliedro([PP(1.45, ry + 0.25, 1.6), PP(-1.65, ry + 0.25, 1.6), PP(1.4, ry + 1.75, 0.9), PP(-1.6, ry + 1.75, 0.9), PP(1.4, ry + 1.85, -0.2), PP(-1.6, ry + 1.85, -0.2)], { mat: m, tono: oscuro * 0.7 }));
  return ps;
}
const angPv = (e: Esqueleto) => { const Pv = e.Pv ?? e.W, a = Pv(1, 0, e.zc), b = Pv(0, 0, e.zc); return (Math.atan2(a[1] - b[1], a[0] - b[0]) * 180) / Math.PI; };

// ------------------------------------------------------------------ túnica (nigromante)
/**
 * Lo que da volumen a una túnica oscura: pliegues verticales que hacen sombra en el pecho y la espalda, la abertura
 * delantera y el cuello con un ribete de otro valor, y (si el cinto trae hebilla) colgantes de hueso que agarran el
 * borde de luz. Todo mate.
 */
export function tunica(e: Esqueleto, cu: Cuerpo, to: NonNullable<Equipo['torso']>): Pieza[] {
  const { S, A, T, zc } = e;
  const PT: Fn = (fw, rt, up) => T(fw * A, rt * A, zc + up * S);
  const m = to.mat, rib = to.ribete, ps: Pieza[] = [];
  const g = (cu.grasa ?? 0) * 1.5;
  // pliegues: tiras finas un poco afuera de la tela, de un tono más oscuro (la sombra del pliegue) con el lomo apenas claro
  // (la túnica va holgada sobre el cuerpo y sobre el vuelo de la falda: las tiras van por fuera de todo eso)
  const frente = (u: number) => (u > 11 ? 5.8 : u > 6 ? 5.4 : 6.3) + g;
  for (const [y, lado] of [[2.3, 1], [-2.3, 1], [3.4, -1], [-3.4, -1], [0, -1]] as const) {
    // el lomo del pliegue (agarra la poca luz) y, al lado, la sombra
    const lomo: V3[] = [], sombra: V3[] = [];
    for (const u of [15.2, 9.0, 3.2]) {
      const x = lado > 0 ? frente(u) : -(5.3 + g);
      lomo.push(PT(x, y - 0.4, u), PT(x, y + 0.4, u), PT(x + lado * 0.5, y, u));
      sombra.push(PT(x + lado * 0.05, y + 0.45, u), PT(x + lado * 0.05, y + 1.15, u), PT(x + lado * 0.25, y + 0.8, u));
    }
    ps.push(poliedro(lomo, { mat: m, tono: 0.4 }), poliedro(sombra, { mat: m, tono: -0.5 }));
  }
  if (rib) {
    // la abertura delantera, del cuello a la cintura, y el cuello
    ps.push(poliedro([PT(frente(15.6) + 0.1, 0.75, 15.6), PT(frente(15.6) + 0.1, -0.75, 15.6), PT(frente(3.0) + 0.1, 0.75, 3.0), PT(frente(3.0) + 0.1, -0.75, 3.0), PT(frente(9) + 0.45, 0, 9)], { mat: rib, tono: 0.3 }));
    ps.push(poliedro([...anillo(PT, -0.2, 3.9, 3.6, 4.2, 16.4, 10), ...anillo(PT, -0.2, 3.5, 3.2, 3.8, 17.6, 10)], { mat: rib, tono: 0.2 }));
  }
  return ps;
}
/** Colgantes del cinto (nigromante): dos huesos atados de cordeles y, con hebilla de gema, una calaverita. */
export function colgantes(e: Esqueleto, cu: Cuerpo, ci: NonNullable<Equipo['cinturon']>): Pieza[] {
  const { S, A, zc } = e;
  const Pv = e.Pv ?? e.W, PP: Fn = (fw, rt, up) => Pv(fw * A, rt * A, zc + up * S);
  const g = (cu.grasa ?? 0) * 1.5, ps: Pieza[] = [];
  const rF = 4.75 + g;
  for (const [y, l] of [[2.6, 4.2], [-3.4, 3.2]] as const) {
    const a = PP(rF * Math.cos(y / 6) + 0.2, y, 0.6), b = PP(rF * Math.cos(y / 6) + 0.5, y + 0.2, 0.6 - l);
    ps.push(poliedro(tramo(PP, [rF * Math.cos(y / 6) + 0.2, y, 0.6], [rF * Math.cos(y / 6) + 0.45, y + 0.2, 0.6 - l * 0.55], 0.18, 0.18, 4), { mat: 'cu_cuero_negro' }));
    ps.push(poliedro(tramo(PP, [rF * Math.cos(y / 6) + 0.45, y + 0.2, 0.6 - l * 0.55], [rF * Math.cos(y / 6) + 0.55, y + 0.25, 0.6 - l], 0.55, 0.4, 5), { mat: 'cu_hueso', tono: 0.05 }));
    void a; void b;
  }
  if (ci.hebilla && /ojo|magia|gema|lava/.test(ci.hebilla)) {
    // calaverita colgando del costado izquierdo
    const c: [number, number, number] = [rF * 0.8, -4.4, -2.6];
    ps.push(poliedro([...anillo(PP, c[0], 0.9, 0.9, 0.85, c[2] + 0.8, 6), ...anillo(PP, c[0], 1.0, 1.0, 0.95, c[2] - 0.2, 6), ...anillo(PP, c[0] + 0.2, 0.6, 0.6, 0.6, c[2] - 1.0, 6)].map((q) => [q[0], q[1], q[2]] as V3).map((q) => q), { mat: 'cu_hueso' }));
  }
  return ps;
}

// ------------------------------------------------------------------ tabardo
/**
 * El faldón del tabardo con caída: cuatro tiras que se adelantan y se atrasan (los pliegues), un poco más anchas abajo,
 * con el ruedo de otro valor y la franja del medio si la hay.
 */
export function tabardoFaldon(arriba: V3, abajo: V3, lado: V3, fuera: V3, ancho: number, mat: string, borde?: string): Pieza[] {
  const ps: Pieza[] = [];
  const en = (q: V3, y: number, f: number): V3 => [q[0] + lado[0] * y + fuera[0] * f, q[1] + lado[1] * y + fuera[1] * f, q[2] + lado[2] * y + fuera[2] * f];
  const n = 4, w0 = ancho / n, w1 = (ancho * 1.18) / n, prof = [0.55, -0.15, 0.45, -0.25];
  for (let k = 0; k < n; k++) {
    const y0 = -ancho / 2 + w0 * k, y1 = -ancho * 1.18 / 2 + w1 * k, f = prof[k];
    const pts = [en(arriba, y0, f * 0.3), en(arriba, y0 + w0, f * 0.3), en(abajo, y1, f), en(abajo, y1 + w1, f)];
    ps.push(poliedro([...pts, ...pts.map((q) => en(q, 0, -0.6))], { mat, tono: f > 0 ? 0.04 : -0.16 }));
  }
  // ruedo: una franja del otro color (o más oscura) a lo ancho, abajo
  const r0 = en(abajo, 0, 0), alto = 1.6;
  const sube = (q: V3): V3 => { const d = [arriba[0] - abajo[0], arriba[1] - abajo[1], arriba[2] - abajo[2]], l = Math.hypot(d[0], d[1], d[2]) || 1; return [q[0] + (d[0] / l) * alto, q[1] + (d[1] / l) * alto, q[2] + (d[2] / l) * alto]; };
  for (let k = 0; k < n; k++) {
    const y1 = -ancho * 1.18 / 2 + w1 * k, f = prof[k] + 0.12;
    const a = en(r0, y1, f), b = en(r0, y1 + w1, f);
    ps.push(poliedro([a, b, sube(a), sube(b), en(a, 0, -0.75), en(b, 0, -0.75), en(sube(a), 0, -0.75), en(sube(b), 0, -0.75)], { mat: borde ?? mat, tono: borde ? 0 : -0.35 }));
  }
  if (borde) ps.push(poliedro([en(arriba, -0.6, 0.65), en(arriba, 0.6, 0.65), en(abajo, -0.6, 0.6), en(abajo, 0.6, 0.6), en(arriba, -0.6, 0.2), en(arriba, 0.6, 0.2), en(abajo, -0.6, 0.15), en(abajo, 0.6, 0.15)], { mat: borde }));
  return ps;
}

// ------------------------------------------------------------------ jubón de cuero
/**
 * El jubón de cuero: el ruedo y el cuello de cuero más oscuro (la costura del borde) y, si `correa`, la correa del
 * carcaj cruzada del hombro derecho a la cadera izquierda con su hebilla. Cálido y mate.
 */
export function jubon(e: Esqueleto, cu: Cuerpo, to: NonNullable<Equipo['torso']>, correa: boolean): Pieza[] {
  const { S, A, T, zc } = e;
  const PT: Fn = (fw, rt, up) => T(fw * A, rt * A, zc + up * S);
  const g = (cu.grasa ?? 0) * 1.5, m = to.mat, ps: Pieza[] = [];
  const borde = m === 'cu_cuero_negro' ? 'cu_cuero' : 'cu_cuero_negro';
  // el ruedo (sobre la cadera) y la sisa del cuello, de cuero del otro tono
  const mj = cu.genero === 'm' ? 0.55 : 0;
  ps.push(poliedro([...anillo(PT, 0.3, 4.55 + g - mj, 4.3 + g - mj, 5.05 + g - mj, 3.4, 12), ...anillo(PT, 0.3, 4.6 + g - mj, 4.35 + g - mj, 5.1 + g - mj, 4.3, 12)], { mat: borde, tono: -0.1 }));
  if (correa) {
    // correa cruzada (por delante y por detrás) con hebilla de metal sobre el pecho
    const r = (u: number, y: number, k: number, d = 0): V3 => PT(k * (Math.sqrt(Math.max(0.05, 1 - (y / (6.4 + g)) ** 2)) * (u > 11 ? 5.0 : 4.4) + g + 0.35 - d), y, u);
    const tira: [number, number][] = [[16.4, 4.4], [12.0, 1.4], [7.6, -2.0], [3.6, -4.8]];
    for (const k of [1, -1]) for (let i = 0; i < tira.length - 1; i++) {
      const [[u0, y0], [u1, y1]] = [tira[i], tira[i + 1]];
      ps.push(poliedro([r(u0, y0 - 0.85, k), r(u0, y0 + 0.85, k), r(u1, y1 - 0.85, k), r(u1, y1 + 0.85, k), r(u0, y0 - 0.85, k, 0.4), r(u0, y0 + 0.85, k, 0.4), r(u1, y1 - 0.85, k, 0.4), r(u1, y1 + 0.85, k, 0.4)], { mat: borde, tono: 0.04 }));
    }
    ps.push(caja(...r(10.6, 0.3, 1), 0.6, 1.5 * A, 1.4 * S, { mat: 'cu_placa', giro: (Math.atan2(e.ejesT[0][1], e.ejesT[0][0]) * 180) / Math.PI }));
  }
  return ps;
}

// ------------------------------------------------------------------ codal y brazal (torsos de placa)
/**
 * Para que el brazo de placa lea como armadura aun cuando viene casi recto a la cámara (el de la espada del templario):
 * - el codal: una lámina curva sobre la punta del codo, con la aleta en abanico hacia afuera;
 * - el brazal: una lámina en anillo justo bajo el codo, con su canto.
 * El mismo criterio que las hombreras del juego: el filo claro arriba (hacia el hombro) y la junta oscura abajo.
 * Facetado (poliedros por anillos), sin bolas ni tubos lisos. Va encima de la manga de placas del juego.
 */
export function codalBrazal(e: Esqueleto, to: NonNullable<Equipo['torso']>): Pieza[] {
  const { S, A } = e, m = to.mat, ps: Pieza[] = [];
  const nor = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  for (const b of e.brazos) {
    const d1 = nor(b.d1), d2 = nor(b.d2);
    // la punta del codo: del lado contrario al doblez (si el brazo va recto, hacia atrás y afuera)
    let punta = nor(add(d1, d2, -1));
    if (Math.hypot(...add(d1, d2, -1)) < 0.25) punta = nor(add(cruz(d1, [0, 0, 1]), [0, 0, -0.3], 1));
    const lado = nor(cruz(d1, [0, 0, 1])), fuera: V3 = [lado[0] * b.s, lado[1] * b.s, lado[2] * b.s];
    // codal: un casquete de dos anillos alrededor de la punta del codo
    const ex = nor(cruz(punta, d1)), ey = cruz(punta, ex);
    const anillo2 = (c: V3, r: number, n = 8): V3[] => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return add(add(c, ex, Math.cos(a) * r), ey, Math.sin(a) * r); });
    const c0 = add(b.codo, punta, 1.55 * A), c1 = add(b.codo, punta, 2.35 * A);
    ps.push(poliedro([...anillo2(c0, 2.25 * A), ...anillo2(c1, 1.25 * A)], { mat: m, tono: 0.02 }));
    // la aleta en abanico hacia afuera, con el filo claro arriba
    const al = add(b.codo, fuera, 2.2 * A);
    ps.push(poliedro([add(al, d1, -1.6 * S), add(al, d2, 1.5 * S), add(add(al, fuera, 1.3 * A), punta, 0.6 * A), add(al, fuera, -0.5 * A), add(add(add(al, d1, -1.6 * S), fuera, 0.4), [0, 0, 0], 1)], { mat: m, tono: -0.04 }));
    ps.push(poliedro([add(add(al, d1, -1.7 * S), fuera, 0.2), add(add(al, d1, -1.7 * S), fuera, 0.75), add(add(add(al, fuera, 1.35 * A), punta, 0.6 * A), d1, -0.25 * S), add(add(al, fuera, 1.3 * A), punta, 0.6 * A)], { mat: m, tono: claro }));
    // brazal: la lámina en anillo bajo el codo; filo claro arriba y junta oscura abajo
    const a0 = mez(b.codo, b.mun, 0.14), a1 = mez(b.codo, b.mun, 0.34), r = 1.95 * A + 0.55;
    ps.push(poliedro([...tramoAnillo(a0, d2, r + 0.1), ...tramoAnillo(a1, d2, r)], { mat: m }));
    ps.push(poliedro([...tramoAnillo(add(a0, d2, -0.15 * S), d2, r + 0.22), ...tramoAnillo(add(a0, d2, 0.25 * S), d2, r + 0.22)], { mat: m, tono: claro }));
    ps.push(poliedro([...tramoAnillo(add(a1, d2, -0.2 * S), d2, r - 0.05), ...tramoAnillo(add(a1, d2, 0.3 * S), d2, r - 0.25)], { mat: m, tono: oscuro }));
  }
  return ps;
}
/** Un anillo de 10 puntos alrededor del eje `d` en `c`. */
function tramoAnillo(c: V3, d: V3, r: number, n = 10): V3[] {
  let u: V3 = [d[1], -d[0], 0]; if (Math.hypot(u[0], u[1]) < 0.2) u = [0, d[2], -d[1]];
  const lu = Math.hypot(...u); u = [u[0] / lu, u[1] / lu, u[2] / lu];
  const v: V3 = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  return Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return [c[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r, c[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r, c[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r] as V3; });
}
