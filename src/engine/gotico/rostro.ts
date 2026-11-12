import { elipsoide, palo, type Pieza, type V3 } from './render';

/**
 * La cara y el pelo leídos a escala de juego (la cabeza mide unos 8 px): no se dibujan rasgos, se ponen la luz y la
 * sombra que los cuentan.
 * - las cuencas hundidas en sombra bajo el arco de las cejas, separadas por el puente de la nariz, que agarra luz;
 * - las cejas, una raya de pelo que le da el gesto a la cara;
 * - la nariz: el lomo con luz y la sombra que tira debajo;
 * - el pómulo con un toque de luz y la sombra de la boca (sin barba);
 * - en el pelo, la raya y unos mechones que rompen el borde (el flequillo y la nuca no son una gorra lisa).
 * La anatomía de la cabeza (cráneo, mandíbula, pómulos, cejas, nariz, orejas) es del juego y no se toca: esto va
 * encima, en piezas chicas aparte.
 */
type Fn = (fw: number, rt: number, up: number) => V3;
export interface MarcoCab { cab: Fn; ejes: [V3, V3, V3]; cz: number; H: number }

/** Elipsoide con los ejes de la cabeza, en unidades de cabeza (H). */
function elipCab(m: MarcoCab, fw: number, rt: number, up: number, r: V3, mat: string, tono = 0): Pieza {
  const [x, y, z] = m.cab(fw * m.H, rt * m.H, m.cz + up * m.H);
  return { ...elipsoide(x, y, z, r[0] * m.H, r[1] * m.H, r[2] * m.H, { mat, tono }), ex: m.ejes[0], ey: m.ejes[1], ez: m.ejes[2] } as Pieza;
}
const P = (m: MarcoCab, fw: number, rt: number, up: number): V3 => m.cab(fw * m.H, rt * m.H, m.cz + up * m.H);

/** Cuencas, cejas, nariz, pómulos y boca sobre la cabeza del juego. */
export function rasgos(m: MarcoCab, o: { piel: string; pelo?: string; mujer: boolean; barba: boolean; ojo: string; brilla: boolean; detalle?: number }): Pieza[] {
  const ps: Pieza[] = [];
  for (const s of [1, -1]) {
    // la cuenca: piel en sombra, hundida bajo el arco de las cejas (el ojo vive adentro)
    // (la cara del juego está a ~3.8 cabezas del centro a la altura de los ojos: la cuenca asoma apenas)
    ps.push(elipCab(m, 3.62, s * 1.4, 0.3, [0.45, 0.85, 0.55], o.piel, -0.55));
    if (!o.brilla) ps.push(elipCab(m, 3.92, s * 1.38, 0.28, [0.25, 0.4, 0.28], o.ojo));
    // la ceja: una raya de pelo apenas inclinada (más fina en ella); sin pelo, el canto del arco con luz
    const ceja = o.pelo ?? o.piel, tc = o.pelo ? 0 : 0.2;
    ps.push(palo(P(m, 4.05, s * 0.5, 1.25), P(m, 3.72, s * 2.1, o.mujer ? 1.6 : 1.45), (o.mujer ? 0.24 : 0.34) * m.H, { mat: ceja, tono: tc, r1: (o.mujer ? 0.14 : 0.24) * m.H }));
    // el pómulo agarra un poco de luz
    ps.push(elipCab(m, 3.45, s * 2.05, -0.5, [0.55, 0.6, 0.45], o.piel, 0.14));
  }
  // la nariz: el lomo con luz y la sombra de abajo
  ps.push(palo(P(m, 4.3, 0, 0.45), P(m, 5.0, 0, -0.85), 0.24 * m.H, { mat: o.piel, tono: 0.22, r1: 0.3 * m.H }));
  ps.push(elipCab(m, 4.35, 0, -1.75, [0.4, 0.7, 0.25], o.piel, -0.5));
  // la boca: una sombra corta (con barba la tapa el bigote)
  if (!o.barba) ps.push(palo(P(m, 4.3, 0.8, -2.3), P(m, 4.3, -0.8, -2.3), 0.2 * m.H, { mat: o.piel, tono: o.mujer ? -0.3 : -0.45 }));
  if ((o.detalle ?? 1) >= 2) ps.push(...rasgosGrandes(m, o));
  return ps;
}

/**
 * Lo que entra cuando la cabeza mide ~16 px (el héroe pintado al doble, la selección): el blanco del ojo con el iris,
 * las aletas de la nariz en sombra, el labio de abajo con luz y las comisuras, el hueco bajo el pómulo y el mentón.
 */
function rasgosGrandes(m: MarcoCab, o: { piel: string; mujer: boolean; barba: boolean; ojo: string; brilla: boolean }): Pieza[] {
  const ps: Pieza[] = [];
  for (const s of [1, -1]) {
    if (!o.brilla) {
      ps.push(elipCab(m, 3.86, s * 1.42, 0.3, [0.2, 0.52, 0.22], 'cu_hueso', -0.28));
      ps.push(elipCab(m, 3.97, s * 1.32, 0.3, [0.18, 0.24, 0.22], o.ojo));
    }
    // la aleta de la nariz y el hueco bajo el pómulo, en sombra
    ps.push(elipCab(m, 4.55, s * 0.5, -1.45, [0.22, 0.25, 0.2], o.piel, -0.55));
    ps.push(elipCab(m, 3.25, s * 2.25, -1.35, [0.5, 0.45, 0.55], o.piel, -0.22));
    if (!o.barba) ps.push(elipCab(m, 4.15, s * 0.95, -2.35, [0.18, 0.2, 0.2], o.piel, -0.5));
  }
  if (!o.barba) {
    ps.push(palo(P(m, 4.32, 0.55, -2.62), P(m, 4.32, -0.55, -2.62), 0.2 * m.H, { mat: o.piel, tono: o.mujer ? 0.18 : 0.12 }));
    ps.push(elipCab(m, 3.95, 0, -3.15, [0.45, 0.7, 0.35], o.piel, 0.12));
  }
  return ps;
}

/**
 * Mechones y raya del pelo corto o largo (no rapado ni cresta): la raya, un surco oscuro de la frente a la coronilla a
 * un costado; mechones del flequillo que caen sobre la frente sin taparla; y puntas en la nuca que rompen el borde.
 */
export function mechones(m: MarcoCab, pelo: string, mujer: boolean): Pieza[] {
  const ps: Pieza[] = [];
  // la raya
  ps.push(palo(P(m, 2.2, 1.05, 4.85), P(m, -1.6, 1.2, 5.65), 0.28 * m.H, { mat: pelo, tono: -0.45 }));
  // el flequillo: tres mechones desparejos que bajan del nacimiento del pelo
  for (const [rt, largo, t] of [[-1.6, 1.0, 0.1], [0.2, 1.4, 0.16], [2.0, 0.8, 0.04]] as const) {
    ps.push(palo(P(m, 3.0, rt, 3.75), P(m, 3.75, rt - 0.4, 3.75 - largo), 0.62 * m.H, { mat: pelo, tono: t, r1: 0.18 * m.H }));
  }
  // la nuca: puntas que salen del borde de atrás
  for (const s of [1, -1, 0]) {
    const rt = s * 2.0;
    ps.push(palo(P(m, -3.6, rt, 0.2), P(m, -4.1, rt * 1.1, mujer ? -1.6 : -1.0), 0.7 * m.H, { mat: pelo, tono: s === 0 ? -0.06 : 0.05, r1: 0.2 * m.H }));
  }
  return ps;
}

/**
 * Las hebras del pelo (y de la barba) en el material: lomos y surcos finos alrededor del eje de cada pieza, que en la
 * cabeza salen de la coronilla y en el pelo largo bajan a lo largo; el surco hunde más de lo que levanta el lomo.
 */
export function hebras(p: V3): number {
  const a = Math.atan2(p[1], p[0]), c = Math.cos(a * 16 + Math.sin(p[2] * 0.55) * 1.1);
  // cerca del eje las hebras se juntan: se apagan (si no, un remolino de puntos en la coronilla)
  const k = Math.min(1, Math.hypot(p[0], p[1]) / 1.6);
  return k * (c > 0.5 ? 0.07 : c < -0.35 ? -0.16 : 0);
}
