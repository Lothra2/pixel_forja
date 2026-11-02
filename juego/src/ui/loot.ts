// Traduce los objetos del juego al formato del motor de botín (para que el inventario de la Forja los pinte en 3D).
import type { LootItem } from '../../../src/engine/loot/catalog';
import { baseDe, type Objeto } from '../juego/objetos';
import { RUNAS, CONJUNTOS } from '../datos/objetos_datos';

const RAREZA: Record<string, LootItem['rarity']> = { normal: 'normal', gris: 'normal', magico: 'magic', raro: 'rare', conjunto: 'set', unico: 'unique', legendario: 'legendary' };
const ENC: Record<string, string> = { fuego: 'fuego', frio: 'hielo', rayo: 'rayo', veneno: 'veneno', sombra: 'sombra', luz: 'sagrado', sangre: 'sangre' };
const GEMA: Record<string, string> = { rubi: 'ruby', zafiro: 'sapphire', topacio: 'topaz', esmeralda: 'emerald', amatista: 'amethyst', diamante: 'diamond', calavera: 'skull' };
const GRADO = (id: string) => (/astillad/.test(id) ? 'chipped' : /agrietad/.test(id) ? 'flawed' : /pulid/.test(id) ? 'flawless' : /perfect/.test(id) ? 'perfect' : 'normal');

const COLOR_TELA: Record<string, string> = { cu_tela_azul: '#2f4f9a', cu_tela_roja: '#9a2626', cu_tela_verde: '#2f6a34', cu_tela_morada: '#5a2f7a', cu_tela_negra: '#1c1a20', cu_tela_blanca: '#d8d2c4', cu_tela_parda: '#6a5236' };
const cache = new Map<string, LootItem>();
export function aLoot(o: Objeto): LootItem {
  const k = o.uid + '|' + o.rareza;
  const c = cache.get(k); if (c) return c;
  const b = baseDe(o);
  let base: any = { cat: 'consumable', icon: 'scroll_portal' };
  let diseno: any;
  let grado: number | undefined;
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
    else if (b.ranura === 'cabeza') { base = { cat: 'armor', slot: 'helm', line: linea === 'tunica' ? 'cuero' : linea, tier }; if (/corona|diadema|aro/.test((b.visual as any).cabeza?.tipo ?? '')) diseno = { helm: 'crown' }; }
    else if (b.ranura === 'manos') base = { cat: 'armor', slot: 'gloves', line: linea === 'tunica' ? 'cuero' : linea, tier };
    else if (b.ranura === 'pies') base = { cat: 'armor', slot: 'boots', line: linea === 'tunica' ? 'cuero' : linea, tier };
    else if (b.ranura === 'cinturon') base = { cat: 'armor', slot: 'belt', line: /placa|malla/.test(vis) ? 'placas' : 'cuero', tier };
    else if (b.ranura === 'anillo') base = { cat: 'jewel', icon: o.rareza === 'normal' ? 'ring_band' : 'ring' };
    else if (b.ranura === 'talisman') base = { cat: 'jewel', icon: 'charm_small' };
    else if (b.ranura === 'amuleto') base = { cat: 'jewel', icon: o.rareza === 'raro' || o.rareza === 'unico' ? 'amulet_pendant' : 'amulet' };
    else if (b.ranura === 'izq') {
      const t = (b.visual as any).izq?.tipo ?? '';
      const iz = (b.visual as any).izq ?? {}, tela = [iz.mat, iz.mat2].find((m: string) => /tela/.test(m ?? ''));
      if (tela && COLOR_TELA[tela]) diseno = { face: COLOR_TELA[tela] };
      // grado del escudo: con metal no es de cuero (así el ícono y el cuerpo usan la misma cara de color)
      grado = Math.min(5, 1 + b.escalon * 1 + (/hierro|placa|acero|oro/.test(String(iz.mat) + String(iz.mat2)) ? 1 : 0));
      base = { cat: 'offhand', icon: b.familia === 'orbe' ? 'orb' : b.familia === 'libro' ? 'tome' : t === 'escudo_torre' ? 'shield_tower' : t === 'escudo_cometa' ? 'shield_kite' : t === 'rodela' ? 'buckler' : t === 'escudo_calavera' ? 'shrunken_head' : 'shield_round' };
    }
  }
  // líneas épicas de la Forja: la pieza entera con su línea (el motor ya trae sus colores y adornos)
  if (b?.linea && base.cat === 'armor') base = { ...base, line: b.linea, tier: 5 };
  // bases míticas (escalón 3): la armadura viene teñida con los colores de su tierra (Ysmeral o la Corona)
  else if (b?.tinte && base.cat === 'armor') diseno = { ...(diseno ?? {}), base: b.tinte.base, ...(b.tinte.ribete ? { trim: b.tinte.ribete } : {}), ...(b.tinte.gema ? { gem: b.tinte.gema } : {}) };
  else if (b?.tinte && base.cat === 'offhand' && b.familia === 'escudo' && !diseno?.face) { diseno = { ...(diseno ?? {}), face: b.tinte.base }; grado = 5; }
  // conjuntos: todas las piezas con la misma línea, el mismo grado y el mismo color (en el ícono y en el cuerpo)
  let extra: any = {};
  const asp = o.conjunto && b ? CONJUNTOS.find((c) => c.id === o.conjunto) : undefined;
  if (asp && b) {
    const a = asp.aspecto, pz = asp.piezas.find((p) => p.nombre[0] === o.nombre[0]);
    extra = { set: asp.id, flavor: { es: asp.lore[0], en: asp.lore[1] } };
    const epica = a && !['tunica', 'cuero', 'malla', 'placas', 'metal'].includes(a.linea);
    if (a && epica && base.cat === 'armor') { base = { ...base, line: a.linea, tier: 5 }; delete extra.flavor; diseno = /corona|diadema|aro/.test(JSON.stringify(b.visual)) ? { helm: 'crown' } : undefined; }
    else if (a && base.cat === 'armor') {
      // 'metal': la línea legendaria del motor teñida con el color del conjunto (pide flavor); las demás, su línea con el color
      base = { ...base, line: a.linea === 'metal' ? 'placas' : a.linea, tier: a.grado };
      diseno = { ...(diseno ?? {}), base: a.color, ...(a.ribete ? { trim: a.ribete } : {}), ...(a.gema ? { gem: a.gema } : {}), ...(a.brillo ? { glow: a.brillo } : {}) };
      if (a.linea !== 'metal') delete extra.flavor;
    } else if (base.cat === 'offhand' && (pz?.color ?? a?.color)) { diseno = { ...(diseno ?? {}), face: pz?.color ?? a!.color }; grado = 5; }
  }
  const it: LootItem = { id: String(o.uid), name: { es: o.nombre[0], en: o.nombre[1] }, rarity: RAREZA[o.rareza] ?? 'normal', base, level: o.nivel, stats: { mods: [] }, ...(diseno ? { design: diseno } : {}), ...(grado ? { grade: grado } : {}), ...extra } as LootItem;
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
