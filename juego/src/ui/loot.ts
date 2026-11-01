// Traduce los objetos del juego al formato del motor de botín (para que el inventario de la Forja los pinte en 3D).
import type { LootItem } from '../../../src/engine/loot/catalog';
import { baseDe, type Objeto } from '../juego/objetos';
import { RUNAS } from '../datos/objetos_datos';

const RAREZA: Record<string, LootItem['rarity']> = { normal: 'normal', gris: 'normal', magico: 'magic', raro: 'rare', conjunto: 'set', unico: 'unique', legendario: 'legendary' };
const ENC: Record<string, string> = { fuego: 'fuego', frio: 'hielo', rayo: 'rayo', veneno: 'veneno', sombra: 'sombra', luz: 'sagrado', sangre: 'sangre' };
const GEMA: Record<string, string> = { rubi: 'ruby', zafiro: 'sapphire', topacio: 'topaz', esmeralda: 'emerald', amatista: 'amethyst', diamante: 'diamond', calavera: 'skull' };
const GRADO = (id: string) => (/astillad/.test(id) ? 'chipped' : /agrietad/.test(id) ? 'flawed' : /pulid/.test(id) ? 'flawless' : /perfect/.test(id) ? 'perfect' : 'normal');

const cache = new Map<string, LootItem>();
export function aLoot(o: Objeto): LootItem {
  const k = o.uid + '|' + o.rareza;
  const c = cache.get(k); if (c) return c;
  const b = baseDe(o);
  let base: any = { cat: 'consumable', icon: 'scroll_portal' };
  if (o.tipo === 'pocion') base = { cat: 'potion', kind: o.pocion === 'vida' ? 'health' : o.pocion === 'mana' ? 'mana' : 'rejuv', size: ['minor', 'light', 'normal', 'greater', 'super'][o.tam ?? 0] };
  else if (o.tipo === 'gema') { const g = Object.keys(GEMA).find((x) => o.base.startsWith(x)) ?? 'rubi'; base = { cat: 'gem', kind: GEMA[g], grade: GRADO(o.base) }; }
  else if (o.tipo === 'runa') { const r = RUNAS.find((x) => x.id === o.base); base = { cat: 'rune', index: ((r?.orden ?? 1) - 1) % 12 }; }
  else if (o.tipo === 'pergamino') base = { cat: 'consumable', icon: 'scroll_portal' };
  else if (b) {
    const vis = JSON.stringify(b.visual);
    const linea = /placas/.test(vis) ? 'placas' : /malla/.test(vis) ? 'malla' : /cuero/.test(vis) ? 'cuero' : 'tunica';
    const tier = Math.min(5, 1 + b.escalon * 2 + (/oro/.test(vis) ? 1 : 0));
    if (b.ranura === 'arma') base = { cat: 'weapon', icon: 'sword' };
    else if (b.ranura === 'torso') base = { cat: 'armor', slot: 'chest', line: linea, tier };
    else if (b.ranura === 'cabeza') base = { cat: 'armor', slot: 'helm', line: linea === 'tunica' ? 'cuero' : linea, tier };
    else if (b.ranura === 'manos') base = { cat: 'armor', slot: 'gloves', line: linea === 'tunica' ? 'cuero' : linea, tier };
    else if (b.ranura === 'pies') base = { cat: 'armor', slot: 'boots', line: linea === 'tunica' ? 'cuero' : linea, tier };
    else if (b.ranura === 'cinturon') base = { cat: 'armor', slot: 'belt', line: /placa|malla/.test(vis) ? 'placas' : 'cuero', tier };
    else if (b.ranura === 'anillo') base = { cat: 'jewel', icon: o.rareza === 'normal' ? 'ring_band' : 'ring' };
    else if (b.ranura === 'talisman') base = { cat: 'jewel', icon: 'charm_small' };
    else if (b.ranura === 'amuleto') base = { cat: 'jewel', icon: o.rareza === 'raro' || o.rareza === 'unico' ? 'amulet_pendant' : 'amulet' };
    else if (b.ranura === 'izq') {
      const t = (b.visual as any).izq?.tipo ?? '';
      base = { cat: 'offhand', icon: b.familia === 'orbe' ? 'orb' : b.familia === 'libro' ? 'tome' : t === 'escudo_torre' ? 'shield_tower' : t === 'escudo_cometa' ? 'shield_kite' : t === 'rodela' ? 'buckler' : t === 'escudo_calavera' ? 'shrunken_head' : 'shield_round' };
    }
  }
  const it: LootItem = { id: String(o.uid), name: { es: o.nombre[0], en: o.nombre[1] }, rarity: RAREZA[o.rareza] ?? 'normal', base, level: o.nivel, stats: { mods: [] } } as LootItem;
  cache.set(k, it);
  if (cache.size > 2000) cache.clear();
  return it;
}
/** El arma en 3D del motor (con su encanto si es arma viva). */
export function arma3dDe(o: Objeto): any {
  const b = baseDe(o);
  if (!b?.arma || b.arma === 'puno' || b.arma === 'nada') return undefined;
  const v: any = (o.vis ?? (b.visual as any).arma ?? { tipo: b.arma });
  return { tipo: v.tipo ?? b.arma, mat: v.mat, mango: v.mango, gema: v.gema, encanto: o.vivo ? ENC[o.vivo] : undefined };
}
