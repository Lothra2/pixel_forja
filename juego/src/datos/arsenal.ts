// El arsenal elemental de la Forja en el botín del juego: 30 familias × 5 niveles × elementos (360 bases) y 60 legendarias
// con nombre, lore y un efecto propio que cambia cómo juegas. Cada base copia el tamaño, la velocidad y los requisitos de
// la familia del juego que más se le parece, y su daño sale de la curva de esa familia al nivel donde entra, así no
// desbalancea lo que ya había. El elemento suma daño elemental propio que sube con el nivel y se ve vivo en la mano.
import { BASES, UNICOS } from './objetos_datos';
import type { Base, Elemento, RangoStat, Stat, Unico } from '../juego/tipos_objetos';
import {
  FAMILIAS_ARMA, TIERS_ARMA, NOMBRE_ELEMENTO, ARMAS_LEGENDARIAS, AFINIDAD_ARMA, elementosDe, especArma, especLegendaria, idArma,
  type FamiliaArma, type NivelArma, type ElementoArma, type Afinidad, type ClaseId,
} from '../../../src/engine/gotico/datos/arsenal_datos';

/** Elemento del arsenal → elemento del juego. */
export const ELEM_JUEGO: Record<ElementoArma, Elemento> = { fuego: 'fuego', hielo: 'frio', veneno: 'veneno', rayo: 'rayo', sombra: 'sombra', sagrado: 'luz', sangre: 'sangre' };
const STAT_ELEM: Record<ElementoArma, Stat> = { fuego: 'dano_fuego', hielo: 'dano_frio', veneno: 'dano_veneno', rayo: 'dano_rayo', sombra: 'dano_sombra', sagrado: 'dano_luz', sangre: 'dano_sangre' };
/** La familia del juego con la que juega cada familia del arsenal (afijos, animación y alcance). */
const JUEGA_COMO: Record<FamiliaArma, string> = {
  espada: 'espada', mandoble: 'mandoble', cimitarra: 'cimitarra', katana: 'espada', estoque: 'espada', daga: 'daga', katar: 'garras', garra: 'garras',
  hacha: 'hacha', gran_hacha: 'hacha_doble', maza: 'maza', lucero: 'maza', martillo: 'martillo', mangual: 'mangual',
  lanza: 'lanza', alabarda: 'alabarda', tridente: 'lanza', guadana: 'guadana', hoz: 'hacha', jabalina: 'lanza',
  arco_corto: 'arco', arco_largo: 'arco', ballesta: 'ballesta', baculo: 'baculo', gran_baculo: 'baculo', varita: 'varita', orbe: 'varita', cetro: 'cetro',
  cestus: 'garras', frascos: 'daga',
};
const ESCALON: Record<NivelArma, Base['escalon']> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 3 };

// la curva de daño de cada familia del juego: daño medio según el nivel de las bases que ya existen
const curvas = new Map<string, Base[]>();
const curva = (fam: string) => { let c = curvas.get(fam); if (!c) { c = BASES.filter((b) => b.ranura === 'arma' && b.familia === fam && b.dano && !(b as any).arsenal).sort((a, b) => a.nivel - b.nivel); curvas.set(fam, c); } return c; };
function referencia(fam: string, nivel: number): { media: number; abajo: Base } {
  const c = curva(fam);
  let i = c.findIndex((b) => b.nivel > nivel); if (i < 0) i = c.length;
  const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i)];
  const m = (x: Base) => (x.dano![0] + x.dano![1]) / 2;
  const t = b.nivel === a.nivel ? 0 : Math.min(1, Math.max(0, (nivel - a.nivel) / (b.nivel - a.nivel)));
  return { media: m(a) + (m(b) - m(a)) * t, abajo: a };
}

/** Nivel en que entra cada combinación: repartido dentro de la franja de su nivel, para que no caigan todas juntas. */
function nivelEntrada(i: number, n: NivelArma, k: number): number {
  const [lo, hi] = TIERS_ARMA[n - 1].niveles;
  return Math.min(100, Math.round(lo + ((hi - lo) * 0.55 * (((i * 7 + k * 3) % 11) / 10))));
}

export interface InfoArsenal { familia: FamiliaArma; nivel: NivelArma; elemento?: ElementoArma }
function baseArsenal(fi: number, n: NivelArma, el: ElementoArma | null, k: number, soloUnico = false): Base {
  const f = FAMILIAS_ARMA[fi], fam = JUEGA_COMO[f.id], nv = nivelEntrada(fi, n, k);
  const ref = referencia(fam, nv), r0 = ref.abajo;
  const prop = r0.dano![0] / Math.max(1, r0.dano![1]);
  const max = Math.max(2, Math.round((ref.media * 2) / (1 + prop))), min = Math.max(1, Math.round(max * prop));
  const tier = TIERS_ARMA[n - 1];
  const adj = f.fem ? tier.nombre.f : tier.nombre.m;
  const es = `${f.nombre.es} ${adj}${el ? ' ' + NOMBRE_ELEMENTO[el].es : ''}`;
  const en = `${tier.nombre.en} ${f.nombre.en}${el ? ' ' + NOMBRE_ELEMENTO[el].en : ''}`;
  const esc = especArma(f.id, n, el);
  const b: Base = {
    id: idArma(f.id, n, el), nombre: [es, en], ranura: 'arma', familia: fam, nivel: nv, escalon: ESCALON[n],
    req: { ...r0.req, nivel: undefined }, tam: [...r0.tam] as [number, number], dano: [min, max], vel: r0.vel,
    durab: r0.durab + n * 4, precio: Math.round(r0.precio * (0.8 + n * 0.25) * (el ? 1.3 : 1)), huecosMax: Math.min(6, (r0.huecosMax ?? 2) + (n >= 4 ? 1 : 0)),
    visual: { arma: esc as any }, arma: f.tipo as any,
  };
  if (r0.dosManos) b.dosManos = true;
  if (f.id === 'jabalina' || f.id === 'cestus' || f.id === 'frascos' || f.id === 'orbe' || f.id === 'hoz' || f.id === 'katar') delete b.dosManos;
  if (f.id === 'tridente' || f.id === 'gran_baculo') b.dosManos = true;
  if (r0.distancia || f.categoria === 'arco') b.distancia = true;
  const x = b as any;
  x.arsenal = { familia: f.id, nivel: n, elemento: el ?? undefined } as InfoArsenal;
  if (el) {
    x.vivo = ELEM_JUEGO[el];
    // daño elemental propio: un cuarto del daño del arma en común y casi la mitad en mítica
    const e = ref.media * (0.18 + n * 0.05);
    x.implicito = [{ stat: STAT_ELEM[el], min: Math.max(1, Math.round(e * 0.8)), max: Math.max(2, Math.round(e * 1.2)) }] as RangoStat[];
  }
  if (soloUnico) x.soloUnico = true;
  return b;
}

// ------------------------------------------------------------------ bases del botín
export const BASES_ARSENAL: Base[] = [];
FAMILIAS_ARMA.forEach((f, fi) => { for (const n of [1, 2, 3, 4, 5] as NivelArma[]) elementosDe(f.id, n).forEach((el, k) => BASES_ARSENAL.push(baseArsenal(fi, n, el, k))); });

// ------------------------------------------------------------------ legendarias con nombre y efecto propio
/** Efecto de cada legendaria según su elemento: cambia cómo se juega, no solo los números. */
export const EFECTO_LEGENDARIO: Record<ElementoArma, { id: string; texto: [string, string] }> = {
  sangre: { id: 'sed_critica', texto: ['Los críticos te devuelven en vida un cuarto del daño y hacen sangrar.', 'Critical hits return a quarter of the damage as life and cause bleeding.'] },
  rayo: { id: 'cadena', texto: ['Cada golpe salta en rayo a dos enemigos cercanos.', 'Every hit leaps as lightning to two nearby enemies.'] },
  sombra: { id: 'sombra_hambrienta', texto: ['Al matar, a veces su sombra se levanta y pelea por ti un rato.', 'On a kill, sometimes its shadow rises and fights for you a while.'] },
  hielo: { id: 'tercer_golpe', texto: ['Cada tercer golpe estalla en escarcha y congela alrededor.', 'Every third hit bursts in frost and freezes around it.'] },
  fuego: { id: 'pira', texto: ['Lo que matas revienta en llamas y quema a los de al lado.', 'What you kill bursts into flame and burns those beside it.'] },
  veneno: { id: 'contagio', texto: ['Lo que matas deja una nube de ponzoña que contagia.', 'What you kill leaves a cloud of venom that spreads.'] },
  sagrado: { id: 'juicio', texto: ['Cada quinto golpe baja un castigo del cielo y te cura.', 'Every fifth hit calls down a judgment from the sky and heals you.'] },
};
const r = (stat: Stat, min: number, max: number = min): RangoStat => ({ stat, min, max });
export const LEGENDARIAS_ARSENAL: Unico[] = [];
const extra: Base[] = [];
for (const l of ARMAS_LEGENDARIAS) {
  const fi = FAMILIAS_ARMA.findIndex((f) => f.id === l.familia); if (fi < 0) continue;
  const id = idArma(l.familia, l.nivel, l.elemento);
  let b = BASES_ARSENAL.find((x) => x.id === id) ?? extra.find((x) => x.id === id);
  if (!b) { b = baseArsenal(fi, l.nivel, l.elemento, 9, true); extra.push(b); }
  const nv = Math.min(100, l.nv);
  const k = l.nivel === 5 ? 1 : 0.8;
  const media = (b.dano![0] + b.dano![1]) / 2;
  const ef = EFECTO_LEGENDARIO[l.elemento];
  const u: Unico = {
    id: l.id, nombre: [l.nombre.es, l.nombre.en], base: b.id, nivel: nv, req: Math.max(1, nv - 6), legendario: true, vivo: ELEM_JUEGO[l.elemento],
    lore: [l.lore.es, l.lore.en],
    stats: [r('dano_pct', Math.round(120 * k + nv), Math.round(170 * k + nv * 1.3)), r(STAT_ELEM[l.elemento], Math.round(media * 0.3 * k), Math.round(media * 0.5 * k)), r('critico', 4, 8), r('vida', Math.round(nv * 0.6), Math.round(nv * 0.9))],
  };
  const sp = especLegendaria(l);
  (u as any).vis = sp; (u as any).efecto = ef.id;
  LEGENDARIAS_ARSENAL.push(u);
}
BASES.push(...BASES_ARSENAL, ...extra);
UNICOS.push(...LEGENDARIAS_ARSENAL);

// ------------------------------------------------------------------ afinidad de clase
/** Familia del arsenal de una base: la del arsenal si es suya, o la que corresponde a su forma del motor. */
const POR_TIPO: Record<string, FamiliaArma> = { arco: 'arco_corto', garras: 'garra', hacha_doble: 'gran_hacha', maza_estrella: 'lucero', orbe_mano: 'orbe', frasco: 'frascos', lanza_dragon: 'lanza', falcata: 'cimitarra' };
export function familiaArsenal(b: Base | undefined): FamiliaArma | undefined {
  if (!b || b.ranura !== 'arma') return undefined;
  const a = (b as any).arsenal as InfoArsenal | undefined; if (a) return a.familia;
  const t = String(b.arma ?? b.familia);
  return POR_TIPO[t] ?? (FAMILIAS_ARMA.find((f) => f.id === t || f.tipo === t)?.id);
}
export function afinidadDe(b: Base | undefined, clase: string): Afinidad {
  const f = familiaArsenal(b); if (!f) return 'neutra';
  return AFINIDAD_ARMA[f]?.[clase as ClaseId] ?? 'neutra';
}
/** Lo que da la afinidad: afín +15 % de daño y +10 % de velocidad de ataque; torpe −15 % de daño. */
export const BONO_AFINIDAD: Record<Afinidad, { dano: number; vel: number }> = { afin: { dano: 15, vel: 10 }, neutra: { dano: 0, vel: 0 }, torpe: { dano: -15, vel: 0 } };
