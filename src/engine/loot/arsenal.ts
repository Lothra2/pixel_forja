import { MAT, GEM_COLORS, metalMat } from './materials';
import type { WeaponDesign, Accent } from './weapons';
import { TWO_HANDED } from './weapons';
import { W_BASE, type LootItem, type Mod, type StatKey } from './catalog';
import {
  FAMILIAS_ARMA, TIERS_ARMA, ELEMENTOS_ARMA, NOMBRE_ELEMENTO, ARMAS_LEGENDARIAS, elementosDe, idArma,
  type DefFamilia, type NivelArma, type ElementoArma, type ArmaLegendaria,
} from '../gotico/datos/arsenal_datos';

/**
 * El arsenal elemental en el botín: 30 familias × 5 niveles × los elementos que caen (ver `elementosDe`) dan 360 bases
 * con nombre, daño, la propiedad de su elemento y la franja de niveles (del 1 al 100), y 60 armas legendarias con
 * nombre propio y leyenda. Cada objeto trae `arsenal` (familia, nivel y elemento) para que el motor 3D pinte la forma
 * forjada en la mano y en el ícono (iconos3d.ts, `arma3dDeLoot`), y su diseño 2D para los atlas del kit.
 */

/** Color del metal de la hoja en el ícono 2D de los niveles altos, y del brillo, por elemento. */
const METAL_ELEMENTO: Record<ElementoArma, string> = { fuego: '#5a3020', hielo: '#8ab8d8', veneno: '#4a6a3a', rayo: '#7080c0', sombra: '#2e2240', sagrado: '#e0d8c2', sangre: '#7a1a1e' };
const BRILLO_ELEMENTO: Record<ElementoArma, string> = { fuego: '#ff7a20', hielo: '#9fe0ff', veneno: '#7aff4a', rayo: '#d8ccff', sombra: '#b070f0', sagrado: '#ffe6a8', sangre: '#ff3030' };
const ACENTO: Record<ElementoArma, Accent> = { fuego: 'flames', hielo: 'frost', veneno: 'drip', rayo: 'lightning', sombra: 'veins', sagrado: 'holy', sangre: 'drip' };
const GEMA: Record<ElementoArma, string> = { fuego: GEM_COLORS.ruby, hielo: GEM_COLORS.sapphire, veneno: GEM_COLORS.emerald, rayo: GEM_COLORS.diamond, sombra: GEM_COLORS.amethyst, sagrado: GEM_COLORS.topaz, sangre: '#9a0a1a' };
/** La propiedad que da cada elemento. */
const STAT_ELEMENTO: Record<ElementoArma, StatKey> = { fuego: 'fireDmg', hielo: 'coldDmg', veneno: 'poisonDmg', rayo: 'lightDmg', sombra: 'critDmg', sagrado: 'healPct', sangre: 'lifeSteal' };
const VALOR_ELEMENTO: Record<ElementoArma, number> = { fuego: 12, hielo: 10, veneno: 14, rayo: 13, sombra: 12, sagrado: 4, sangre: 1.5 };

/** El diseño 2D de una combinación: el metal y las guarniciones crecen con el nivel; el elemento pone brillo, acento y gema. */
export function disenoArsenal(fam: DefFamilia, n: NivelArma, el?: ElementoArma | null): WeaponDesign {
  const hoja = n >= 4 && el ? metalMat(METAL_ELEMENTO[el]) : [MAT.iron, MAT.steel, MAT.darksteel, MAT.darksteel, MAT.obsidian][n - 1];
  const guarn = [MAT.iron, MAT.bronze, MAT.gold, MAT.gold, MAT.palegold][n - 1];
  const d: WeaponDesign = {
    blade: hoja, edge: n >= 3 ? MAT.silver : undefined, guard: guarn, pommel: guarn,
    grip: [MAT.leather, MAT.leather, MAT.darkleather, MAT.redleather, MAT.darkleather][n - 1],
    haft: n === 5 ? MAT.bone : [MAT.wood, MAT.darkwood, MAT.darkwood, MAT.darkwood][n - 1],
    shape: fam.categoria === 'arco' ? (n >= 4 ? 'wicked' : 'plain') : (['plain', 'plain', 'broad', 'serrated', 'flame'] as const)[n - 1],
    guardShape: (['bar', 'ornate', 'wings', 'crescent', 'skull'] as const)[n - 1],
    accent: el ? ACENTO[el] : n >= 4 ? 'runes' : 'none',
    gem: n >= 3 ? (el ? GEMA[el] : GEM_COLORS.amethyst) : null,
    glow: el ? BRILLO_ELEMENTO[el] : n >= 4 ? '#b48cff' : null,
    floating: n === 5,
    feather: fam.categoria === 'arco' || fam.id === 'jabalina' ? (n >= 3 ? '#1a1a26' : '#8a7a62') : null,
  };
  if (!d.edge) delete d.edge;
  return d;
}

const nombreBase = (fam: DefFamilia, n: NivelArma, el?: ElementoArma | null) => {
  const t = TIERS_ARMA[n - 1];
  return {
    es: `${fam.nombre.es} ${fam.fem ? t.nombre.f : t.nombre.m}${el ? ' ' + NOMBRE_ELEMENTO[el].es : ''}`,
    en: `${t.nombre.en} ${fam.nombre.en}${el ? ' ' + NOMBRE_ELEMENTO[el].en : ''}`,
  };
};

/** Una base del arsenal elemental (cualquier combinación: la tabla de caída usa las de `elementosDe`). */
export function baseArsenal(familia: DefFamilia['id'], n: NivelArma, el?: ElementoArma | null): LootItem {
  const fam = FAMILIAS_ARMA.find((f) => f.id === familia)!, fi = FAMILIAS_ARMA.indexOf(fam);
  const t = TIERS_ARMA[n - 1], [mn, mx, sp] = W_BASE[fam.icono];
  // el nivel en que empieza a caer: repartido dentro de la franja del nivel según la familia y el elemento
  const ei = el ? ELEMENTOS_ARMA.indexOf(el) + 1 : 0, frac = ((fi * 37 + ei * 23 + n * 11) % 100) / 100;
  const nivel = Math.round(t.niveles[0] + frac * (t.niveles[1] - t.niveles[0]) * 0.55);
  const k = t.k * (1 + 0.012 * (nivel - t.niveles[0]));
  const mods: Mod[] = el ? [{ stat: STAT_ELEMENTO[el], value: Math.round(VALOR_ELEMENTO[el] * (0.6 + n * 0.55) * 10) / 10 }] : [];
  return {
    id: idArma(familia, n, el), name: nombreBase(fam, n, el), rarity: 'normal', base: { cat: 'weapon', icon: fam.icono },
    grade: n >= 3 ? 3 : n === 2 ? 2 : 1, design: disenoArsenal(fam, n, el), level: nivel, levelRange: [nivel, t.niveles[1]],
    stats: { damage: [Math.round(mn * k), Math.round(mx * k)], speed: sp, mods }, twoHanded: TWO_HANDED.includes(fam.icono),
    arsenal: { familia, nivel: n, ...(el ? { elemento: el } : {}) },
  };
}

/** La propiedad de clase de una legendaria según su familia (fuerza, destreza o energía). */
const ATRIBUTO: Partial<Record<DefFamilia['categoria'], StatKey>> = { hoja: 'dex', cabeza: 'str', asta: 'str', vara: 'ene', arco: 'dex', puno: 'dex', frasco: 'ene' };
export function legendariaArsenal(l: ArmaLegendaria): LootItem {
  const fam = FAMILIAS_ARMA.find((f) => f.id === l.familia)!, [mn, mx, sp] = W_BASE[fam.icono];
  const k = TIERS_ARMA[l.nivel - 1].k * (1.15 + 0.01 * (l.nv - 50));
  const mods: Mod[] = [
    { stat: STAT_ELEMENTO[l.elemento], value: Math.round(VALOR_ELEMENTO[l.elemento] * (2.4 + l.nivel * 0.7) * 10) / 10 },
    { stat: 'dmgPct', value: 80 + l.nv * 2 },
    { stat: ATRIBUTO[fam.categoria] ?? 'str', value: 10 + Math.round(l.nv / 3) },
  ];
  if (l.nivel === 5) mods.push({ stat: 'allSkills', value: 1 + (l.nv >= 95 ? 1 : 0) });
  const design = { ...disenoArsenal(fam, l.nivel, l.elemento), floating: true };
  return {
    id: l.id, name: l.nombre, rarity: 'legendary', base: { cat: 'weapon', icon: fam.icono }, grade: 3, design, level: l.nv, levelRange: [l.nv, 100],
    stats: { damage: [Math.round(mn * k), Math.round(mx * k)], speed: sp, mods }, flavor: l.lore, twoHanded: TWO_HANDED.includes(fam.icono),
    arsenal: { familia: l.familia, nivel: l.nivel, elemento: l.elemento, ...(l.mat ? { mat: l.mat } : {}), ...(l.mango ? { mango: l.mango } : {}) },
  };
}

let BASES: LootItem[] | null = null, LEGS: LootItem[] | null = null;
/** Las 360 bases que caen: cada familia en sus cinco niveles con los elementos de `elementosDe` (del nivel 1 al 100). */
export function allArsenalBases(): LootItem[] {
  return (BASES ??= FAMILIAS_ARMA.flatMap((f) => TIERS_ARMA.flatMap((t) => elementosDe(f.id, t.nivel).map((el) => baseArsenal(f.id, t.nivel, el)))));
}
/** Las 60 armas legendarias y míticas con nombre propio. */
export function allArsenalLegendarias(): LootItem[] {
  return (LEGS ??= ARMAS_LEGENDARIAS.map(legendariaArsenal));
}
/** Todo el arsenal elemental del botín (bases y legendarias). */
export function allArsenal(): LootItem[] {
  return [...allArsenalBases(), ...allArsenalLegendarias()];
}
