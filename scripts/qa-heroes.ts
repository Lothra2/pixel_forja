/**
 * QA numérica de los héroes: recorre TODOS los cuadros de las 8 clases, en sus 4 niveles de equipo (novato, veterano,
 * leyenda y épico: leyenda con armadura de línea y un arma del arsenal épico) y en las 8 direcciones, y mide:
 *   - agarre: en las armas a dos manos (y cuando la pose cierra la izquierda en el mango) la mano izquierda va sobre el mango;
 *   - arma-cabeza: el arma (mango, hoja o cabeza, con su grosor) no atraviesa el cráneo ni la mandíbula;
 *   - manos-cara: ninguna mano (ni el antebrazo) se mete en la cabeza;
 *   - manos-pecho: ninguna mano se mete en el pecho;
 *   - cabo-ingle: el regatón del mango (o el pie de la vara en el aire) no queda en la ingle, ni en el cuerpo ni en la pantalla;
 *   - pies: talón y punta no se hunden bajo el piso (y ninguna articulación queda bajo el piso);
 *   - rodillas: ninguna rodilla se dobla al revés.
 * Sale con código 1 si hay alguna falla.
 *   npx tsx scripts/qa-heroes.ts [--clase berserker] [--accion atacar] [--detalle 40]
 */
import { HEROES } from '../src/engine/gotico/catalogo/personajes.ts';
import { geometriaQA, dentroElip, armaduraDeLinea, type Equipo, type GeoQA } from '../src/engine/gotico/cuerpo.ts';
import { DIRS, cuadrosDe, type Accion } from '../src/engine/gotico/figura.ts';
import { aPantalla, type V3 } from '../src/engine/gotico/render.ts';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const SOLO_CLASE = arg('--clase'), SOLO_ACC = arg('--accion'), DETALLE = +(arg('--detalle') ?? 30);
export const ACCIONES_QA: Accion[] = ['quieto', 'caminar', 'correr', 'atacar', 'lanzar', 'herido', 'morir', 'presentar'];

/** El cuarto nivel: la leyenda con la armadura de una línea épica y un arma del arsenal nuevo de su clase. */
const EPICO: Record<string, { linea: Parameters<typeof armaduraDeLinea>[0]; arma: NonNullable<Equipo['arma']>; izq?: Equipo['izq'] | null }> = {
  berserker: { linea: 'demoniaca', arma: { tipo: 'martillo', mat: 'cu_placa_oscura', mango: 'madera' } },
  templario: { linea: 'celestial', arma: { tipo: 'maza_estrella', mat: 'cu_oro' } },
  arcanista: { linea: 'elfica', arma: { tipo: 'gran_baculo', mango: 'madera_lisa', gema: 'cu_ojo_hielo' }, izq: null },
  cazadora: { linea: 'elfica', arma: { tipo: 'arco_largo', mango: 'madera_lisa' } },
  nigromante: { linea: 'demoniaca', arma: { tipo: 'hoz', mat: 'cu_hueso' } },
  monje: { linea: 'escamas', arma: { tipo: 'katar', mat: 'cu_oro' } },
  druida: { linea: 'escamas', arma: { tipo: 'gran_baculo', mango: 'corteza', gema: 'fuego_verde' }, izq: null },
  alquimista: { linea: 'ahogada', arma: { tipo: 'ballesta', mat: 'cu_oro', mango: 'madera_lisa' } },
};
export function nivelesQA(h: (typeof HEROES)[number]): [string, Equipo][] {
  const ep = EPICO[h.id], ley = h.niveles[2];
  const epico: Equipo = { ...ley, ...armaduraDeLinea(ep.linea, 4), arma: ep.arma };
  if (ep.izq === null) delete epico.izq; else if (ep.izq) epico.izq = ep.izq;
  return [['novato', h.niveles[0]], ['veterano', h.niveles[1]], ['leyenda', ley], ['epico', epico]];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function distSeg(q: V3, a: V3, b: V3) { const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(q, a), ab) / Math.max(1e-9, dot(ab, ab)))); return len(sub(q, mez(a, b, t))); }

export interface Falla { chequeo: string; clase: string; nivel: string; dir: string; acc: string; f: number; valor: number }
/** Mide un cuadro y devuelve sus fallas. */
export function medirCuadro(g: GeoQA, base: Omit<Falla, 'chequeo' | 'valor'>): Falla[] {
  const out: Falla[] = [];
  const falla = (chequeo: string, valor: number) => out.push({ ...base, chequeo, valor: Math.round(valor * 100) / 100 });
  const { e } = g, S = e.S, P = e.pose!, cae = e.caida > 0.02;
  const [der, izq] = e.brazos;
  // agarre: la izquierda cerrada sobre el mango
  const cierra = (g.dosManos || ((P.agarreI ?? 0) !== 0 && (P.pegaI ?? 0) >= 0.99)) && g.pega >= 0.99 && !cae && g.mango;
  if (cierra && g.mango) { const d = distSeg(izq.mano, g.mango[0], g.mango[1]); if (d > 1.3 * S) falla('agarre', d); }
  // el arma no atraviesa la cabeza (lo que está en el puño no cuenta: el mango pasa por la mano)
  if (g.arma) {
    const { a, b, r } = g.arma;
    let peor = 9;
    for (let i = 0; i <= 40; i++) {
      const q = mez(a, b, i / 40);
      if (len(sub(q, der.mano)) < 2 * S) continue;
      peor = Math.min(peor, dentroElip(g.craneo, q, r), dentroElip(g.mandibula, q, r));
    }
    if (g.arma.cabeza && g.arma.rCabeza) for (let i = 0; i <= 10; i++) { const q = mez(g.arma.cabeza[0], g.arma.cabeza[1], i / 10); peor = Math.min(peor, dentroElip(g.craneo, q, g.arma.rCabeza), dentroElip(g.mandibula, q, g.arma.rCabeza)); }
    if (peor < 1) falla('arma-cabeza', peor);
    // ni el pecho ni el vientre (fuera de lo que queda dentro de las manos)
    if (!cae) {
      let cuerpo = 9;
      for (let i = 0; i <= 40; i++) {
        const q = mez(a, b, i / 40);
        if (len(sub(q, der.mano)) < 2.5 * S || len(sub(q, izq.mano)) < 2.5 * S) continue;
        cuerpo = Math.min(cuerpo, dentroElip(g.pecho, q, r * 0.5), dentroElip(g.vientre, q, r * 0.5));
      }
      if (cuerpo < 0.9) falla('arma-cuerpo', cuerpo);
    }
  }
  // manos y antebrazos fuera de la cabeza; manos fuera del pecho
  for (const bz of e.brazos) {
    const m = Math.min(dentroElip(g.craneo, bz.mano, 1.2 * S), dentroElip(g.mandibula, bz.mano, 1.2 * S));
    if (m < 1) falla(bz.s > 0 ? 'mano-cara (der)' : 'mano-cara (izq)', m);
    let ab = 9;
    for (let i = 0; i <= 10; i++) { const q = mez(bz.codo, bz.mano, i / 10); ab = Math.min(ab, dentroElip(g.craneo, q, 1.3 * S), dentroElip(g.mandibula, q, 1.3 * S)); }
    if (ab < 0.92 && m >= 1) falla(bz.s > 0 ? 'antebrazo-cara (der)' : 'antebrazo-cara (izq)', ab);
    if (!cae) { const pe = dentroElip(g.pecho, bz.mano, 0); if (pe < 0.8) falla(bz.s > 0 ? 'mano-pecho (der)' : 'mano-pecho (izq)', pe); }
  }
  // el cabo del mango (o el pie de la vara que no apoya) lejos de la ingle
  let cabo = g.cabo;
  if (!cabo && g.mango && e.vara && !e.varaPie && g.mango[0][2] > 2.5 * S) cabo = g.mango[0];
  if (cabo && !cae) {
    const d3 = len(sub(cabo, g.ingle));
    const [cx, cy] = aPantalla(cabo), [ix, iy] = aPantalla(g.ingle);
    const d2 = Math.hypot(cx - ix, cy - iy), delante = cabo[0] + cabo[1] > g.ingle[0] + g.ingle[1];
    if (d3 < 5.5 * S) falla('cabo-ingle (3D)', d3);
    else if (d2 < 3.5 * S && delante && cabo[2] < g.ingle[2] + 4 * S && cabo[2] > g.ingle[2] - 8 * S) falla('cabo-ingle (pantalla)', d2);
  }
  // pies sobre el piso y articulaciones sobre el piso
  for (const pn of e.piernas) {
    if (!cae) {
      if (pn.talon[2] < g.piso.talon - 0.05) falla('pie bajo el piso (talón)', pn.talon[2] - g.piso.talon);
      if (pn.punta[2] < g.piso.punta - 0.05) falla('pie bajo el piso (punta)', pn.punta[2] - g.piso.punta);
      // rodilla al revés: la rodilla tiene que quedar del lado de la punta del pie respecto de la línea cadera-tobillo
      const fd = sub(pn.punta, pn.talon); fd[2] = 0; const lf = len(fd) || 1;
      const t = dot(sub(pn.rod, pn.cad), sub(pn.tob, pn.cad)) / Math.max(1e-9, dot(sub(pn.tob, pn.cad), sub(pn.tob, pn.cad)));
      const off = dot(sub(pn.rod, mez(pn.cad, pn.tob, t)), fd) / lf;
      if (off < -0.6 * S) falla('rodilla al revés', off);
    }
    for (const q of [pn.rod, pn.tob, pn.talon, pn.punta]) if (q[2] < -0.05) falla('articulación bajo el piso', q[2]);
  }
  for (const bz of e.brazos) if (bz.mano[2] < -0.05) falla('mano bajo el piso', bz.mano[2]);
  return out;
}

export function qaHeroes(o: { clase?: string; accion?: string; dirs?: string[]; niveles?: string[] } = {}) {
  const fallas: Falla[] = [];
  let cuadros = 0;
  for (const h of HEROES) {
    if (o.clase && h.id !== o.clase) continue;
    for (const [nivel, eq] of nivelesQA(h)) {
      if (o.niveles && !o.niveles.includes(nivel)) continue;
      for (const acc of ACCIONES_QA) {
        if (o.accion && acc !== o.accion) continue;
        const n = cuadrosDe(acc, h.cuerpo.presentacion);
        for (const dir of DIRS) {
          if (o.dirs && !o.dirs.includes(dir)) continue;
          for (let f = 0; f < n; f++) {
            cuadros++;
            fallas.push(...medirCuadro(geometriaQA(h.cuerpo, eq, dir, acc, f), { clase: h.id, nivel, dir, acc, f }));
          }
        }
      }
    }
  }
  return { cuadros, fallas };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now();
  const { cuadros, fallas } = qaHeroes({ clase: SOLO_CLASE, accion: SOLO_ACC });
  const por = new Map<string, number>();
  for (const x of fallas) { const k = `${x.chequeo} · ${x.clase} · ${x.acc}`; por.set(k, (por.get(k) ?? 0) + 1); }
  console.log(`QA de héroes: ${cuadros} cuadros (clases × 4 niveles × 8 direcciones × cada cuadro de cada acción) en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const chequeos = ['agarre', 'arma-cabeza', 'arma-cuerpo', 'mano-cara', 'antebrazo-cara', 'mano-pecho', 'cabo-ingle', 'pie bajo el piso', 'rodilla al revés', 'articulación bajo el piso', 'mano bajo el piso'];
  for (const c of chequeos) console.log(`  ${c.padEnd(26)} ${fallas.filter((x) => x.chequeo.startsWith(c)).length} fallas`);
  console.log(`TOTAL: ${fallas.length} fallas`);
  for (const [k, n] of [...por].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${k}`);
  for (const x of fallas.slice(0, DETALLE)) console.log('   ', JSON.stringify(x));
  process.exit(fallas.length ? 1 : 0);
}
