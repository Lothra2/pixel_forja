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
import { HEROES, MONSTRUOS } from '../src/engine/gotico/catalogo/personajes.ts';
import { geometriaQA, dentroElip, telaQA, armaduraDeLinea, type Cuerpo, type Equipo, type GeoQA } from '../src/engine/gotico/cuerpo.ts';
import { DIRS, cuadrosDe, type Accion } from '../src/engine/gotico/figura.ts';
import { aPantalla, pintarEscena, type V3 } from '../src/engine/gotico/render.ts';

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

/** Lo que se mide: un cuerpo con sus niveles de equipo y sus acciones. */
export interface Sujeto { id: string; cuerpo: Cuerpo; niveles: [string, Equipo][]; acciones: Accion[] }
export const SUJETOS_HEROES: Sujeto[] = HEROES.map((h) => ({ id: h.id, cuerpo: h.cuerpo, niveles: nivelesQA(h), acciones: ACCIONES_QA }));
/**
 * Los monstruos humanoides que salen de figura.ts y que el juego pide revisar: los brutos que pegan con maza o martillo
 * (ogro, trol, gigante) y los que van a correr (necrófago, diablillo, sacerdote chacal y cazacabezas). Los dos últimos
 * viven en el juego (juego/src/datos/hornear_extra.ts, MONSTRUOS_EXTRA): acá va una copia de su cuerpo y su equipo.
 */
const EXTRA_JUEGO: { id: string; cuerpo: Cuerpo; equipo: Equipo; magia?: boolean }[] = [
  { id: 'chacal', magia: true, cuerpo: { piel: 'cu_pelaje', ojos: 'cu_ojo_brasa', orejas: 'puntiagudas', cabeza: 1.1, musculo: 0.4, peinado: 'calvo', pelo: 'cu_pelaje', cola: 'cu_pelaje' },
    equipo: { torso: { tipo: 'sin_mangas', mat: 'cu_tela_blanca' }, piernas: { tipo: 'faldon', mat: 'cu_tela_blanca', mat2: 'cu_oro' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, arma: { tipo: 'cetro', mango: 'cu_oro', gema: 'fuego_verde' } } },
  { id: 'cazacabezas', cuerpo: { piel: 'cu_piel_morena', ojos: 'cu_ojo_brasa', musculo: 0.7, alto: 0.9, peinado: 'cresta', pelo: 'cu_pelo_rojo' },
    equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_pelaje' }, cabeza: { tipo: 'mascara', mat: 'cu_hueso' }, hombros: { tipo: 'huesos', mat: 'cu_hueso' }, arma: { tipo: 'lanza', mat: 'cu_hueso', mango: 'madera_vieja' } } },
];
/** Un monstruo humanoide (de los catálogos o del juego) como sujeto de la QA, con las acciones que se le hornean y correr. */
export const sujetoMonstruo = (m: { id: string; cuerpo: Cuerpo; equipo: Equipo; magia?: boolean }): Sujeto => ({ id: m.id, cuerpo: m.cuerpo, niveles: [['', m.equipo]], acciones: ['quieto', 'caminar', 'correr', 'atacar', ...(m.magia ? ['lanzar' as const] : []), 'herido', 'morir'] });
export const IDS_MONSTRUOS_QA = ['ogro', 'trol_pantano', 'gigante_helado', 'necrofago', 'diablillo', 'chacal', 'cazacabezas'];
export const SUJETOS_MONSTRUOS: Sujeto[] = IDS_MONSTRUOS_QA.map((id) => {
  const m = MONSTRUOS.find((x) => x.id === id) ?? EXTRA_JUEGO.find((x) => x.id === id)!;
  return sujetoMonstruo({ ...m, id });
});

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
    // contra el casco de verdad: calota, cuernos, cresta y visera (cada pieza facetada por sus planos)
    if (g.casco?.length) {
      let dentro = -9;
      for (let i = 0; i <= 40; i++) {
        const q = mez(a, b, i / 40);
        if (len(sub(q, der.mano)) < 2 * S || len(sub(q, izq.mano)) < 2 * S) continue;
        for (const planos of g.casco) { if (planos.length < 4) continue; let mx = -Infinity; for (const [n, d] of planos) mx = Math.max(mx, n[0] * q[0] + n[1] * q[1] + n[2] * q[2] - d); dentro = Math.max(dentro, -(mx - r * 0.6)); }
      }
      if (dentro > 0.05) falla('arma-casco', dentro);
    }
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

export function qaHeroes(o: { clase?: string; accion?: string; dirs?: string[]; niveles?: string[]; sujetos?: Sujeto[] } = {}) {
  const fallas: Falla[] = [];
  let cuadros = 0;
  for (const h of o.sujetos ?? SUJETOS_HEROES) {
    if (o.clase && h.id !== o.clase) continue;
    for (const [nivel, eq] of h.niveles) {
      if (o.niveles && !o.niveles.includes(nivel)) continue;
      for (const acc of h.acciones) {
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

/**
 * El arma al andar: el giro del arma (en el espacio) en cada cuadro de caminar y de correr, en las 8
 * direcciones y los 4 niveles. El arma va sujeta al brazo y bracea con él (a pedido: clavada al cuerpo se veía como un
 * muñeco), así que no se mide cuánto varía en el ciclo sino que no salte: falla si entre dos cuadros seguidos gira más de
 * 16° al caminar o 22° al correr, o si la postura media salta más de 45° de caminar a correr.
 */
export const LIMITE_ANDAR = { caminar: 16, correr: 22, salto: 45 };
export interface AnguloAndar { clase: string; nivel: string; dir: string; arma: string; caminar: number; correr: number; salto: number; angulos: Record<'caminar' | 'correr', number[]> }
const envolver = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
export function angulosAndar(o: { clase?: string; sujetos?: Sujeto[] } = {}): { filas: AnguloAndar[]; fallas: Falla[] } {
  const filas: AnguloAndar[] = [], fallas: Falla[] = [];
  for (const h of o.sujetos ?? SUJETOS_HEROES) {
    if (o.clase && h.id !== o.clase) continue;
    for (const [nivel, eq] of h.niveles) {
      const tipo = eq.arma?.tipo ?? 'nada';
      if (tipo === 'nada' || tipo === 'puno' || tipo === 'frasco') continue;
      for (const dir of DIRS) {
        const res: Partial<Record<'caminar' | 'correr', { visible: boolean; media: V3; rango: number; angulos: number[] }>> = {};
        for (const acc of ['caminar', 'correr'] as const) {
          const n = cuadrosDe(acc, h.cuerpo.presentacion), angs: number[] = [], ejes: V3[] = [];
          for (let f = 0; f < n; f++) {
            const g = geometriaQA(h.cuerpo, eq, dir, acc, f);
            if (!g.arma) continue;
            const [ax, ay] = aPantalla(g.arma.a), [bx, by] = aPantalla(g.arma.b);
            angs.push((Math.atan2(by - ay, bx - ax) * 180) / Math.PI);
            const d = sub(g.arma.b, g.arma.a), l = len(d) || 1; ejes.push([d[0] / l, d[1] / l, d[2] / l]);
          }
          // se mide el giro real del arma (en el espacio, no en la pantalla: cuando apunta a la cámara el ángulo en
          // pantalla salta aunque el arma casi no se mueva). El paso más grande entre dos cuadros seguidos (el ciclo
          // cierra): el arma acompaña el braceo, pero sin saltos
          const entre = (a: V3, b: V3) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI;
          let paso = 0;
          for (let i = 0; i < ejes.length; i++) paso = Math.max(paso, entre(ejes[i], ejes[(i + 1) % ejes.length]));
          const m = ejes.reduce((t, e) => [t[0] + e[0], t[1] + e[1], t[2] + e[2]] as V3, [0, 0, 0] as V3), lm = len(m) || 1;
          // (el límite es por cuadro de un ciclo de 12: con menos cuadros cada uno abarca más tiempo)
          paso *= n / 12;
          res[acc] = { visible: ejes.length > 0, media: [m[0] / lm, m[1] / lm, m[2] / lm], rango: paso, angulos: angs.map((a) => Math.round(a)) };
        }
        // si en una de las dos el arma apunta a la cámara todo el ciclo, no hay ángulo que comparar
        // (las garras y el katar son el puño: siguen al antebrazo, que al correr se recoge; ahí no hay porte que comparar)
        const esPuno = tipo === 'garras' || tipo === 'katar' || tipo === 'cestus';
        const salto = !esPuno && res.correr!.visible && res.caminar!.visible ? (Math.acos(Math.max(-1, Math.min(1, dot(res.correr!.media, res.caminar!.media)))) * 180) / Math.PI : 0;
        const fila: AnguloAndar = { clase: h.id, nivel, dir, arma: tipo, caminar: +res.caminar!.rango.toFixed(1), correr: +res.correr!.rango.toFixed(1), salto: +salto.toFixed(1), angulos: { caminar: res.caminar!.angulos, correr: res.correr!.angulos } };
        filas.push(fila);
        const base = { clase: h.id, nivel, dir, f: -1 };
        if (fila.caminar > LIMITE_ANDAR.caminar) fallas.push({ ...base, acc: 'caminar', chequeo: 'arma-andar (paso)', valor: fila.caminar });
        if (fila.correr > LIMITE_ANDAR.correr) fallas.push({ ...base, acc: 'correr', chequeo: 'arma-andar (paso)', valor: fila.correr });
        if (fila.salto > LIMITE_ANDAR.salto) fallas.push({ ...base, acc: 'caminar→correr', chequeo: 'arma-andar (salto)', valor: fila.salto });
      }
    }
  }
  return { filas, fallas };
}

/**
 * El cuerpo al andar: el brazo libre (el que no lleva arma, escudo ni objeto) va con el codo doblado entre 70° y 100° al
 * correr y entre 10° y 35° al caminar, y la mano libre no se adelanta al pecho más de 0,35 del alto; al correr la pelvis
 * varía como mucho 6 % del alto en el ciclo y ninguna rodilla baja de 0,22 del alto sobre el piso.
 */
export const LIMITE_CUERPO = { codoCorrer: [70, 100], codoCaminar: [10, 35], manoAdelante: 0.35, pelvis: 0.06, rodilla: 0.22 };
export interface FilaCuerpo { clase: string; nivel: string; acc: string; codo: [number, number] | null; mano: number | null; pelvis: number; rodilla: number }
export function cuerpoAndar(o: { clase?: string; sujetos?: Sujeto[] } = {}): { filas: FilaCuerpo[]; fallas: Falla[] } {
  const filas: FilaCuerpo[] = [], fallas: Falla[] = [];
  for (const h of o.sujetos ?? SUJETOS_HEROES) {
    if (o.clase && h.id !== o.clase) continue;
    for (const [nivel, eq] of h.niveles) {
      const tipo = eq.arma?.tipo ?? 'nada', arco = tipo === 'arco' || tipo === 'arco_largo' || tipo === 'arco_corto';
      for (const acc of ['caminar', 'correr'] as const) {
        const n = cuadrosDe(acc, h.cuerpo.presentacion), alto = 61 * (h.cuerpo.alto ?? 1);
        let cmin = 999, cmax = -999, mmax = -999, zmin = 999, zmax = -999, rmin = 999, hayLibre = false;
        for (const dir of DIRS) for (let f = 0; f < n; f++) {
          const g = geometriaQA(h.cuerpo, eq, dir, acc, f), { e } = g, P = e.pose!;
          const libres = e.brazos.filter((b) => b.s < 0
            ? !P.manoI && g.pega < 0.5 && !arco && tipo !== 'ballesta' && !(eq.izq && !g.dosManos)
            : !P.manoD && arco);
          for (const b of libres) {
            hayLibre = true;
            const c = (Math.acos(Math.max(-1, Math.min(1, dot(nor3(sub(b.codo, b.hom)), nor3(sub(b.mun, b.codo)))))) * 180) / Math.PI;
            cmin = Math.min(cmin, c); cmax = Math.max(cmax, c);
            const ad = dot(sub(b.mano, g.pecho.c), e.F); mmax = Math.max(mmax, ad);
            const [lo, hi] = acc === 'correr' ? LIMITE_CUERPO.codoCorrer : LIMITE_CUERPO.codoCaminar;
            const base = { clase: h.id, nivel, dir, acc, f };
            if (c < lo - 0.5 || c > hi + 0.5) fallas.push({ ...base, chequeo: 'brazo libre (codo)', valor: c });
            if (ad > LIMITE_CUERPO.manoAdelante * alto) fallas.push({ ...base, chequeo: 'brazo libre (mano adelante)', valor: ad / alto });
          }
          zmin = Math.min(zmin, e.zc); zmax = Math.max(zmax, e.zc);
          for (const pn of e.piernas) rmin = Math.min(rmin, pn.rod[2]);
        }
        // contrafase: cada mano va adelante cuando el pie de su mismo lado va atrás (correlación del avance < −0,5).
        // Se mide con el brazo que bracea por ángulos (libre o con arma); así no vuelve la ambladura
        {
          const serie: Record<number, [number[], number[]]> = { 0: [[], []], 1: [[], []] };
          for (let f = 0; f < n; f++) {
            const g = geometriaQA(h.cuerpo, eq, 'e', acc, f), { e } = g, P = e.pose!;
            e.brazos.forEach((b, i) => { if (i === 0 ? P.manoD : P.manoI || g.pega > 0.5) return; serie[i][0].push(dot(sub(b.mano, b.hom), e.F)); serie[i][1].push(dot(sub(e.piernas[i].tob, e.piernas[i].cad), e.F)); });
          }
          for (const i of [0, 1]) {
            const [x, y] = serie[i]; if (x.length < n) continue;
            const mx = x.reduce((t, v) => t + v, 0) / n, my = y.reduce((t, v) => t + v, 0) / n;
            const sx = Math.sqrt(x.reduce((t, v) => t + (v - mx) ** 2, 0)), sy = Math.sqrt(y.reduce((t, v) => t + (v - my) ** 2, 0));
            if (sx < 1.5 * n ** 0.5 * (h.cuerpo.alto ?? 1)) continue; // el brazo casi no se mueve (escudo, arma al hombro): no hay braceo que medir
            const r = x.reduce((t, v, k) => t + (v - mx) * (y[k] - my), 0) / (sx * sy || 1);
            if (r > -0.5) fallas.push({ clase: h.id, nivel, dir: i ? 'izq' : 'der', acc, f: -1, chequeo: 'braceo (contrafase)', valor: Math.round(r * 100) / 100 });
          }
        }
        const pel = (zmax - zmin) / alto, rod = rmin / alto;
        if (acc === 'correr') {
          const base = { clase: h.id, nivel, dir: '*', acc, f: -1 };
          if (pel > LIMITE_CUERPO.pelvis + 1e-4) fallas.push({ ...base, chequeo: 'correr (pelvis)', valor: pel });
          if (rod < LIMITE_CUERPO.rodilla - 1e-4) fallas.push({ ...base, chequeo: 'correr (rodilla)', valor: rod });
        }
        filas.push({ clase: h.id, nivel, acc, codo: hayLibre ? [Math.round(cmin), Math.round(cmax)] : null, mano: hayLibre ? Math.round((mmax / alto) * 100) / 100 : null, pelvis: Math.round(pel * 1000) / 1000, rodilla: Math.round(rod * 1000) / 1000 });
      }
    }
  }
  return { filas, fallas };
}
/**
 * Entrar y salir del ataque y del conjuro: el primer cuadro y el último tienen que salir del reposo medio (quieto): el
 * arma a 20° como mucho en pantalla y cada mano a 0,08 del alto como mucho.
 */
export const LIMITE_ENTRADA = { angulo: 20, mano: 0.08 };
export interface FilaEntrada { clase: string; nivel: string; acc: string; angulo: number; mano: number }
export function entradaAccion(o: { clase?: string; sujetos?: Sujeto[] } = {}): { filas: FilaEntrada[]; fallas: Falla[] } {
  const filas: FilaEntrada[] = [], fallas: Falla[] = [];
  const angulo = (g: GeoQA) => { if (!g.arma) return NaN; const [ax, ay] = aPantalla(g.arma.a), [bx, by] = aPantalla(g.arma.b); return Math.hypot(bx - ax, by - ay) < len(sub(g.arma.b, g.arma.a)) / 3 ? NaN : (Math.atan2(by - ay, bx - ax) * 180) / Math.PI; };
  for (const h of o.sujetos ?? SUJETOS_HEROES) {
    if (o.clase && h.id !== o.clase) continue;
    const alto = 61 * (h.cuerpo.alto ?? 1);
    for (const [nivel, eq] of h.niveles) for (const acc of ['atacar', 'lanzar'] as const) {
      if (!h.acciones.includes(acc)) continue;
      let peorA = 0, peorM = 0;
      for (const dir of DIRS) {
        const nq = cuadrosDe('quieto', h.cuerpo.presentacion), qs = Array.from({ length: nq }, (_, f) => geometriaQA(h.cuerpo, eq, dir, 'quieto', f));
        const angs = qs.map(angulo).filter((a) => !Number.isNaN(a));
        const media = angs.length ? (Math.atan2(angs.reduce((t, a) => t + Math.sin((a * Math.PI) / 180), 0), angs.reduce((t, a) => t + Math.cos((a * Math.PI) / 180), 0)) * 180) / Math.PI : NaN;
        const manos = [0, 1].map((i) => qs.reduce<V3>((t, g) => [t[0] + g.e.brazos[i].mano[0] / nq, t[1] + g.e.brazos[i].mano[1] / nq, t[2] + g.e.brazos[i].mano[2] / nq], [0, 0, 0]));
        const n = cuadrosDe(acc, h.cuerpo.presentacion);
        for (const f of [0, n - 1]) {
          const g = geometriaQA(h.cuerpo, eq, dir, acc, f), a = angulo(g);
          const da = Number.isNaN(a) || Number.isNaN(media) ? 0 : Math.abs(envolver(a - media));
          const dm = Math.max(...[0, 1].map((i) => len(sub(g.e.brazos[i].mano, manos[i])))) / alto;
          peorA = Math.max(peorA, da); peorM = Math.max(peorM, dm);
          const base = { clase: h.id, nivel, dir, acc, f };
          if (da > LIMITE_ENTRADA.angulo) fallas.push({ ...base, chequeo: 'entrada/salida (arma)', valor: da });
          if (dm > LIMITE_ENTRADA.mano) fallas.push({ ...base, chequeo: 'entrada/salida (manos)', valor: dm });
        }
      }
      filas.push({ clase: h.id, nivel, acc, angulo: Math.round(peorA * 10) / 10, mano: Math.round(peorM * 1000) / 1000 });
    }
  }
  return { filas, fallas };
}
/**
 * La tela al andar (faldón, túnica, hábito, vestido): se pinta sola en cada cuadro de caminar y correr, en las 8
 * direcciones, y se mide su silueta: cuánto se extiende detrás de la pelvis en pantalla (≤ 0,30 del alto), cuánto
 * cambia su área de un cuadro al siguiente (≤ 25 %, el ciclo cierra) y si tiene huecos adentro (ninguno: una pierna la atraviesa).
 */
export const LIMITE_TELA = { atras: 0.3, area: 0.25, huecos: 0 };
export interface FilaTela { clase: string; nivel: string; acc: string; atras: number; area: number; rango: number; huecos: number }
export function telaAndar(o: { clase?: string; sujetos?: Sujeto[]; dirs?: string[] } = {}): { filas: FilaTela[]; fallas: Falla[] } {
  const filas: FilaTela[] = [], fallas: Falla[] = [];
  const W = 200, H = 200, AX = 100, AY = 150;
  for (const h of o.sujetos ?? SUJETOS_HEROES) {
    if (o.clase && h.id !== o.clase) continue;
    const S = h.cuerpo.alto ?? 1, altoPx = 61 * S * Math.sqrt(1.5);
    for (const [nivel, eq] of h.niveles) {
      const tela = eq.torso && ['tunica', 'harapos', 'vestido'].includes(eq.torso.tipo) || eq.piernas && ['taparrabo', 'faldon', 'tunica_larga'].includes(eq.piernas.tipo);
      if (!tela) continue;
      for (const acc of ['caminar', 'correr'] as const) {
        if (!h.acciones.includes(acc)) continue;
        let peorAtras = 0, peorArea = 0, peorRango = 0, huecosT = 0;
        for (const dir of (o.dirs ?? DIRS) as typeof DIRS) {
          const n = cuadrosDe(acc, h.cuerpo.presentacion), areas: number[] = [];
          for (let f = 0; f < n; f++) {
            const t = telaQA(h.cuerpo, eq, dir, acc, f);
            const r = pintarEscena({ piezas: t.piezas, sinSombra: true }, {}, { w: W, h: H, ax: AX, ay: AY });
            const m = new Uint8Array(W * H); let area = 0;
            for (let i = 0; i < W * H; i++) if (r.img.data[i * 4 + 3] > 0) { m[i] = 1; area++; }
            areas.push(area);
            // detrás de la pelvis: la dirección "atrás" del cuerpo en pantalla
            // (se mide a lo ancho de la pantalla, en las direcciones en que "atrás" se ve de costado: de frente o de
            // espaldas, lo de atrás queda tapado o es lo que cuelga, no un bulto detrás)
            const [px] = aPantalla(t.pelvis), [bx, by] = aPantalla([-t.e.F[0], -t.e.F[1], 0]);
            let atras = 0;
            if (Math.abs(bx) >= 0.7 * Math.hypot(bx, by)) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) atras = Math.max(atras, (x - AX - px) * Math.sign(bx));
            atras /= altoPx;
            // huecos: lo vacío que no se alcanza desde el borde
            const vis = new Uint8Array(W * H), pila: number[] = [];
            for (let x = 0; x < W; x++) { pila.push(x, (H - 1) * W + x); } for (let y = 0; y < H; y++) { pila.push(y * W, y * W + W - 1); }
            while (pila.length) { const i = pila.pop()!; if (vis[i] || m[i]) continue; vis[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) pila.push(i - 1); if (x < W - 1) pila.push(i + 1); if (y > 0) pila.push(i - W); if (y < H - 1) pila.push(i + W); }
            // (cuenta cada hueco de 3 pixeles o más: una grieta de 1 o 2 pixeles en el borde de la malla es ruido del
            // pintado y el cuerpo de atrás la tapa; un hueco de verdad, donde la pierna atraviesa la tela, es más grande)
            let huecos = 0;
            for (let i = 0; i < W * H; i++) if (!m[i] && !vis[i]) {
              let n = 0; const q = [i]; vis[i] = 1;
              while (q.length) { const j = q.pop()!; n++; const x = j % W, y = (j / W) | 0; for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) if (k >= 0 && !m[k] && !vis[k]) { vis[k] = 1; q.push(k); } }
              if (n >= 3) huecos += n;
            }
            const base = { clase: h.id, nivel, dir, acc, f };
            if (atras > LIMITE_TELA.atras) fallas.push({ ...base, chequeo: 'tela (atrás)', valor: atras });
            if (huecos > LIMITE_TELA.huecos) fallas.push({ ...base, chequeo: 'tela (hueco)', valor: huecos });
            peorAtras = Math.max(peorAtras, atras); huecosT += huecos;
          }
          // de un cuadro al siguiente (el ciclo cierra): la tela no aparece ni se desinfla de golpe
          const var_ = Math.max(...areas.map((x, i) => Math.abs(areas[(i + 1) % areas.length] - x) / Math.max(1, x, areas[(i + 1) % areas.length])));
          if (var_ > LIMITE_TELA.area) fallas.push({ clase: h.id, nivel, dir, acc, f: -1, chequeo: 'tela (área)', valor: var_ });
          peorArea = Math.max(peorArea, var_); peorRango = Math.max(peorRango, (Math.max(...areas) - Math.min(...areas)) / Math.max(1, Math.max(...areas)));
        }
        filas.push({ clase: h.id, nivel, acc, atras: Math.round(peorAtras * 1000) / 1000, area: Math.round(peorArea * 1000) / 1000, rango: Math.round(peorRango * 1000) / 1000, huecos: huecosT });
      }
    }
  }
  return { filas, fallas };
}
const nor3 = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now();
  // --monstruos: todos los humanoides que salen de figura.ts (personajes.ts, monstruos67.ts y los del juego: con
  // --juego <ruta de juego/src/datos/hornear_extra.ts> todos sus MONSTRUOS_EXTRA; si no, la copia de chacal y cazacabezas)
  const MON = process.argv.includes('--monstruos');
  let sujetos = SUJETOS_HEROES;
  if (MON) {
    const { MONSTRUOS67 } = await import('../src/engine/gotico/catalogo/monstruos67.ts');
    const ruta = arg('--juego'), extra = ruta ? (await import(ruta)).MONSTRUOS_EXTRA : EXTRA_JUEGO;
    sujetos = [...MONSTRUOS, ...extra, ...MONSTRUOS67].map(sujetoMonstruo);
  }
  const { cuadros, fallas } = qaHeroes({ clase: SOLO_CLASE, accion: SOLO_ACC, sujetos });
  const andar = angulosAndar({ clase: SOLO_CLASE, sujetos });
  fallas.push(...andar.fallas);
  const cuerpo = cuerpoAndar({ clase: SOLO_CLASE, sujetos });
  fallas.push(...cuerpo.fallas);
  const entrada = MON ? { filas: [], fallas: [] } : entradaAccion({ clase: SOLO_CLASE, sujetos });
  fallas.push(...entrada.fallas);
  const tela = telaAndar({ clase: SOLO_CLASE, sujetos });
  fallas.push(...tela.fallas);
  const por = new Map<string, number>();
  for (const x of fallas) { const k = `${x.chequeo} · ${x.clase} · ${x.acc}`; por.set(k, (por.get(k) ?? 0) + 1); }
  console.log(`QA de ${MON ? `${sujetos.length} monstruos humanoides` : "héroes"}: ${cuadros} cuadros (${MON ? "8 direcciones" : "clases × 4 niveles × 8 direcciones"} × cada cuadro de cada acción) en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const chequeos = ['agarre', 'arma-cabeza', 'arma-casco', 'arma-cuerpo', 'mano-cara', 'antebrazo-cara', 'mano-pecho', 'cabo-ingle', 'pie bajo el piso', 'rodilla al revés', 'articulación bajo el piso', 'mano bajo el piso'];
  for (const c of chequeos) console.log(`  ${c.padEnd(26)} ${fallas.filter((x) => x.chequeo.startsWith(c)).length} fallas`);
  console.log(`  ${'arma-andar'.padEnd(26)} ${andar.fallas.length} fallas (paso por cuadro: caminar ≤ ${LIMITE_ANDAR.caminar}°, correr ≤ ${LIMITE_ANDAR.correr}°, salto ≤ ${LIMITE_ANDAR.salto}°)`);
  console.log('  ángulo del arma en pantalla (peor de las 8 direcciones), por clase y nivel:');
  console.log('    clase       nivel     arma          var.caminar  var.correr  salto');
  const peor = new Map<string, AnguloAndar>();
  for (const f of andar.filas) { const k = f.clase + '|' + f.nivel, p = peor.get(k); peor.set(k, p ? { ...p, caminar: Math.max(p.caminar, f.caminar), correr: Math.max(p.correr, f.correr), salto: Math.max(p.salto, f.salto) } : f); }
  for (const f of peor.values()) console.log(`    ${f.clase.padEnd(11)} ${f.nivel.padEnd(9)} ${f.arma.padEnd(13)} ${String(f.caminar).padStart(8)}°  ${String(f.correr).padStart(9)}°  ${String(f.salto).padStart(5)}°`);
  console.log(`  ${'brazo libre y carrera'.padEnd(26)} ${cuerpo.fallas.length} fallas (codo libre: correr 70°–100°, caminar 10°–35°; mano libre ≤ 0,35 del alto delante del pecho; al correr pelvis ≤ 6 % del alto y rodilla ≥ 0,22 del alto)`);
  console.log('    clase       nivel     acción    codo libre   mano adelante  pelvis   rodilla mín.   (fracciones del alto)');
  for (const f of cuerpo.filas) console.log(`    ${f.clase.padEnd(11)} ${f.nivel.padEnd(9)} ${f.acc.padEnd(9)} ${(f.codo ? f.codo[0] + '°–' + f.codo[1] + '°' : '(sin brazo libre)').padEnd(17)} ${String(f.mano ?? '-').padEnd(13)} ${String(f.pelvis).padEnd(8)} ${f.rodilla}`);
  if (!MON) {
    console.log(`  ${'entrada/salida'.padEnd(26)} ${entrada.fallas.length} fallas (atacar y lanzar, cuadros 0 y último contra el reposo medio: arma ≤ ${LIMITE_ENTRADA.angulo}°, manos ≤ ${LIMITE_ENTRADA.mano} del alto)`);
    for (const f of entrada.filas) if (f.nivel === 'veterano') console.log(`    ${f.clase.padEnd(11)} ${f.acc.padEnd(7)} arma ${String(f.angulo).padStart(5)}°  manos ${f.mano}`);
  }
  console.log(`  ${'tela al andar'.padEnd(26)} ${tela.fallas.length} fallas (detrás de la pelvis ≤ ${LIMITE_TELA.atras} del alto, área ≤ ${LIMITE_TELA.area * 100} % entre cuadros, sin huecos)`);
  for (const f of tela.filas) console.log(`    ${f.clase.padEnd(20)} ${f.nivel.padEnd(9)} ${f.acc.padEnd(8)} atrás ${String(f.atras).padEnd(6)} área ${String(f.area).padEnd(6)} (rango del ciclo ${String(f.rango).padEnd(5)}) huecos ${f.huecos}`);
  console.log(`TOTAL: ${fallas.length} fallas`);
  for (const [k, n] of [...por].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${k}`);
  if (MON) {
    console.log('  fallas por monstruo:');
    for (const sj of sujetos) console.log(`    ${sj.id.padEnd(22)} ${fallas.filter((x) => x.clase === sj.id).length}`);
  }
  for (const x of fallas.slice(0, DETALLE)) console.log('   ', JSON.stringify(x));
  process.exit(fallas.length ? 1 : 0);
}
