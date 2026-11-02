import { IconCanvas, type MatDef, type P } from './canvas';
import { MAT, gemMat, glowMat, metalMat, leatherMat, clothMat } from './materials';

/**
 * Armaduras que evolucionan, como en Diablo 3 y 4: cada línea tiene 5 niveles y cada nivel se ve mejor
 * (mejor material, ribetes, hombreras, capa, gema y al final runas que brillan). El mismo nivel sirve
 * para el personaje (se la pone) y para los íconos de cada pieza.
 */

/** Las cuatro líneas clásicas (el avatar LPC y el estudio las conocen) y las seis épicas de los actos 3 a 7. */
export type ArmorLineClasica = 'cuero' | 'malla' | 'placas' | 'tunica';
export type ArmorLineEpica = 'escamas' | 'draconica' | 'elfica' | 'demoniaca' | 'celestial' | 'ahogada';
export type ArmorLine = ArmorLineClasica | ArmorLineEpica;
export const ARMOR_LINES: ArmorLineClasica[] = ['cuero', 'malla', 'placas', 'tunica'];
/** Líneas épicas: cada una cubre una franja de niveles hasta el 100 (ver `ARMOR_EVOLUTION`). */
export const ARMOR_LINES_EPICAS: ArmorLineEpica[] = ['ahogada', 'escamas', 'elfica', 'draconica', 'demoniaca', 'celestial'];
export const ALL_ARMOR_LINES: ArmorLine[] = [...ARMOR_LINES, ...ARMOR_LINES_EPICAS];
/** La forma clásica que usa cada línea para el dibujo 2D y el avatar LPC (las épicas son de metal: malla o placas). */
export const ARMOR_FORMA: Record<ArmorLine, ArmorLineClasica> = {
  cuero: 'cuero', malla: 'malla', placas: 'placas', tunica: 'tunica',
  escamas: 'malla', draconica: 'placas', elfica: 'placas', demoniaca: 'placas', celestial: 'placas', ahogada: 'placas',
};
export type ArmorTier = 1 | 2 | 3 | 4 | 5;
export const ARMOR_TIERS: ArmorTier[] = [1, 2, 3, 4, 5];
export type ArmorSlot = 'helm' | 'chest' | 'shoulders' | 'gloves' | 'belt' | 'pants' | 'boots';
export const ARMOR_SLOTS: ArmorSlot[] = ['helm', 'chest', 'shoulders', 'gloves', 'belt', 'pants', 'boots'];

export interface TierLook {
  name: { es: string; en: string };
  /** color de la armadura */
  base: string;
  /** ribete (metal) o null */
  trim: string | null;
  /** gema del pecho */
  gem: string | null;
  /** brillo legendario (runas, ribete encendido) */
  glow: string | null;
  /** casco LPC que se pone el personaje */
  helm: string | null;
  pauldrons: boolean;
  belt: string | null;
  cape: string | null;
  /** defensa y nivel requerido (para el juego) */
  defense: number;
  level: number;
}

const T = (es: string, en: string, base: string, trim: string | null, gem: string | null, glow: string | null, helm: string | null, pauldrons: boolean, belt: string | null, cape: string | null, defense: number, level: number): TierLook =>
  ({ name: { es, en }, base, trim, gem, glow, helm, pauldrons, belt, cape, defense, level });

const BRONZE = '#b87a3e', SILVER = '#cfd6e0', GOLD = '#e3ae3c';

export const ARMOR_EVOLUTION: Record<ArmorLine, [TierLook, TierLook, TierLook, TierLook, TierLook]> = {
  cuero: [
    T('Jubón de cuero', 'Leather Jerkin', '#7a4a2a', null, null, null, null, false, '#5a3a22', null, 8, 1),
    T('Cuero tachonado', 'Studded Leather', '#6e4228', BRONZE, null, null, 'headband', false, '#4a2e1c', null, 18, 8),
    T('Cuero endurecido', 'Hardened Hide', '#5a3524', SILVER, null, null, 'leather_cap', true, '#3a2418', null, 32, 18),
    T('Piel de wyvern', 'Wyvernhide', '#3f5e3c', GOLD, '#1fb35e', null, 'barbarian', true, '#2e2018', '#5a2a1a', 50, 30),
    T('Manto del Cazador Eterno', 'Eternal Hunter Mantle', '#2c2236', GOLD, '#ff8a1e', '#ff8a1e', 'viking', true, '#1e1626', '#1e1630', 75, 45),
  ],
  malla: [
    T('Cota de anillas', 'Ring Mail', '#8f98a3', null, null, null, 'mail', false, null, null, 14, 1),
    T('Cota de malla', 'Chain Mail', '#9aa4b0', BRONZE, null, null, 'nasal', false, '#5a3a22', null, 24, 8),
    T('Cota de escamas', 'Scale Mail', '#7f8e9c', SILVER, null, null, 'norman', true, '#4a3022', null, 38, 18),
    T('Malla de mithril', 'Mithril Mail', '#a8d0f0', GOLD, '#2f62e6', null, 'spangenhelm', true, '#2a2a4a', '#2a4a8a', 56, 30),
    T('Malla del Guardián Astral', 'Astral Warden Mail', '#cfe6ff', GOLD, '#6cc8ff', '#6cc8ff', 'legion', true, '#1e2a4a', '#18305e', 82, 45),
  ],
  placas: [
    T('Coraza de hierro', 'Iron Breastplate', '#8a9099', null, null, null, 'kettle', false, null, null, 20, 1),
    T('Placas de acero', 'Steel Plate', '#aeb8c4', BRONZE, null, null, 'bascinet', false, '#4a3022', null, 34, 8),
    T('Placas de caballero', 'Knight Plate', '#c2cad4', SILVER, null, null, 'armet', true, '#3a2418', '#2f4f9a', 50, 18),
    T('Placas de campeón', 'Champion Plate', '#d6dce4', GOLD, '#d8243e', null, 'greathelm', true, '#5a1a22', '#7a1f2b', 70, 30),
    T('Égida Celestial', 'Celestial Aegis', '#f2efe6', GOLD, '#ffd86a', '#ffd86a', 'close', true, '#e3ae3c', '#f4ecd6', 100, 45),
  ],
  tunica: [
    T('Túnica de aprendiz', 'Apprentice Robe', '#6a5a8a', null, null, null, null, false, '#3a2a4a', null, 6, 1),
    T('Túnica de seda', 'Silk Robe', '#3d4fa0', BRONZE, null, null, 'hood', false, '#2a2040', null, 12, 8),
    T('Túnica arcana', 'Arcane Robe', '#3a2a7a', SILVER, '#2f62e6', null, 'hood', false, '#22184a', null, 22, 18),
    T('Vestiduras del archimago', 'Archmage Vestments', '#2a1f5a', GOLD, '#9a3ad8', null, 'wizard', true, '#1a1236', '#1a1440', 34, 30),
    T('Manto de las Estrellas', 'Starweave Mantle', '#16112e', GOLD, '#b48cff', '#b48cff', 'celestial', true, '#100c22', '#100c26', 50, 45),
  ],
  // ---- líneas épicas (actos 3 a 7): la defensa sube con el nivel hasta el 100
  ahogada: [
    T('Bronce del naufragio', 'Shipwreck Bronze', '#4b6a52', BRONZE, null, null, 'kettle', true, '#1e2a22', null, 70, 35),
    T('Coraza de la marea', 'Tidewrack Plate', '#466a58', BRONZE, null, null, 'bascinet', true, '#1e2a22', '#1f3a2a', 86, 42),
    T('Placas del abismo', 'Abyssal Plate', '#3f6458', BRONZE, '#3fc8c0', null, 'greathelm', true, '#162420', '#16302a', 104, 50),
    T('Armadura del ahogado', 'Drowned Lord Armor', '#3a5e52', GOLD, '#3fc8c0', null, 'greathelm', true, '#14201c', '#122a24', 122, 58),
    T('Égida de las Profundidades', 'Aegis of the Deep', '#2f584e', GOLD, '#7ff0e0', '#7ff0e0', 'close', true, '#101a18', '#0e2420', 142, 66),
  ],
  escamas: [
    T('Cota de escamas verdes', 'Greenscale Mail', '#3e7a38', BRONZE, null, null, 'norman', true, '#2a2016', null, 82, 40),
    T('Escamas de draco', 'Drakescale', '#3a7034', BRONZE, null, null, 'spangenhelm', true, '#2a2016', '#2a4a22', 98, 48),
    T('Escamas de wyrm', 'Wyrmscale', '#346a30', BRONZE, '#1fb35e', null, 'armet', true, '#241a12', '#22401c', 116, 56),
    T('Escamas del dragón anciano', 'Elder Dragonscale', '#2e642c', GOLD, '#1fb35e', null, 'greathelm', true, '#20160e', '#1e3a18', 136, 64),
    T('Piel del Dragón Esmeralda', 'Emerald Dragonhide', '#2a5e28', GOLD, '#9affb0', '#9affb0', 'close', true, '#1a120c', '#183214', 158, 72),
  ],
  elfica: [
    T('Plata de los bosques', 'Sylvan Silver', '#b4c6c0', '#d8bc68', null, null, 'armet', true, '#2f5a3e', '#2f5a3e', 84, 45),
    T('Malla de hojas de plata', 'Silverleaf Mail', '#bccbc6', '#d8bc68', null, null, 'armet', true, '#2f5a3e', '#2f5a3e', 102, 54),
    T('Coraza de la luna élfica', 'Elven Moon Plate', '#c4d2cc', '#d8bc68', '#7ad4a0', null, 'close', true, '#244a32', '#244a32', 122, 63),
    T('Armadura del rey del bosque', 'Forest King Armor', '#ccd8d2', GOLD, '#7ad4a0', null, 'close', true, '#1e4028', '#1e4028', 142, 72),
    T('Égida del Árbol Eterno', 'Aegis of the Eternal Tree', '#d6e0da', GOLD, '#c8ffd8', '#c8ffd8', 'celestial', true, '#183820', '#183820', 164, 81),
  ],
  draconica: [
    T('Placas dracónicas', 'Draconic Plate', '#5c1517', '#9a6b27', null, null, 'greathelm', true, '#2a1414', '#4a0f12', 120, 55),
    T('Coraza de cresta roja', 'Redcrest Cuirass', '#5a1416', '#9a6b27', null, null, 'greathelm', true, '#2a1414', '#4a0f12', 142, 64),
    T('Armadura del señor dragón', 'Dragonlord Armor', '#561315', GOLD, '#ff6a2a', null, 'close', true, '#241010', '#420c10', 166, 73),
    T('Placas del gran wyrm rojo', 'Great Red Wyrm Plate', '#521214', GOLD, '#ff6a2a', '#ff8a2a', 'close', true, '#200e0e', '#3c0a0e', 192, 82),
    T('Corazón del Dragón Carmesí', 'Crimson Dragonheart', '#4e1012', GOLD, '#ff8a2a', '#ff8a2a', 'close', true, '#1c0c0c', '#36080c', 220, 91),
  ],
  demoniaca: [
    T('Placas del infierno', 'Hellforged Plate', '#2c2020', '#4a4040', null, '#ff6a1a', 'greathelm', true, '#1a1012', '#160c0e', 130, 60),
    T('Coraza de la grieta ardiente', 'Riftfire Cuirass', '#2a1e1e', '#4a4040', null, '#ff6a1a', 'greathelm', true, '#1a1012', '#160c0e', 155, 70),
    T('Armadura del archidemonio', 'Archfiend Armor', '#281c1c', '#cbb488', '#ff3020', '#ff6a1a', 'close', true, '#160e10', '#120a0c', 182, 80),
    T('Placas del trono de ceniza', 'Ashen Throne Plate', '#261a1a', '#cbb488', '#ff3020', '#ff6a1a', 'close', true, '#140c0e', '#10080a', 210, 90),
    T('Coraza del Señor del Abismo', 'Abyss Lord Carapace', '#241818', GOLD, '#ff3020', '#ff6a1a', 'close', true, '#120a0c', '#0e0608', 240, 100),
  ],
  celestial: [
    T('Oro blanco del alba', 'Dawn White-Gold', '#e2d9c4', GOLD, null, null, 'armet', true, '#d8cbb0', '#efe8da', 126, 64),
    T('Placas del serafín', 'Seraph Plate', '#e6ddc8', GOLD, null, '#fff0b8', 'armet', true, '#d8cbb0', '#efe8da', 150, 73),
    T('Armadura del arcángel', 'Archangel Armor', '#eae2ce', GOLD, '#ffd86a', '#fff0b8', 'celestial', true, '#d8cbb0', '#f4ecd6', 176, 82),
    T('Égida del trono de luz', 'Throne of Light Aegis', '#eee6d4', GOLD, '#ffd86a', '#fff0b8', 'celestial', true, '#e3ae3c', '#f4ecd6', 204, 91),
    T('Gloria del Último Cielo', 'Glory of the Final Heaven', '#f2ecdc', GOLD, '#ffd86a', '#ffe9a0', 'celestial', true, '#e3ae3c', '#f8f2e2', 234, 100),
  ],
};
/** Lo propio de cada línea épica, en cada pieza: se escala con el nivel de la pieza. */
export const ARMOR_MOD_EPICO: Record<ArmorLineEpica, { stat: 'coldRes' | 'poisonRes' | 'fireRes' | 'dex' | 'moveSpeed' | 'lifeSteal' | 'thorns' | 'healPct' | 'allRes' | 'str' | 'life' | 'lifeRegen'; k: number }[]> = {
  ahogada: [{ stat: 'coldRes', k: 0.35 }, { stat: 'poisonRes', k: 0.3 }],
  escamas: [{ stat: 'fireRes', k: 0.35 }, { stat: 'life', k: 1.2 }],
  elfica: [{ stat: 'dex', k: 0.3 }, { stat: 'moveSpeed', k: 0.12 }],
  draconica: [{ stat: 'fireRes', k: 0.45 }, { stat: 'str', k: 0.3 }],
  demoniaca: [{ stat: 'thorns', k: 1.0 }, { stat: 'lifeSteal', k: 0.05 }],
  celestial: [{ stat: 'healPct', k: 0.2 }, { stat: 'allRes', k: 0.2 }],
};

/** Nombres de las piezas (para el juego). */
export const SLOT_NAMES: Record<ArmorSlot, { es: string; en: string }> = {
  helm: { es: 'Casco', en: 'Helm' }, chest: { es: 'Pecho', en: 'Chest' }, shoulders: { es: 'Hombreras', en: 'Shoulders' }, gloves: { es: 'Guantes', en: 'Gloves' },
  belt: { es: 'Cinturón', en: 'Belt' }, pants: { es: 'Pantalón', en: 'Pants' }, boots: { es: 'Botas', en: 'Boots' },
};

interface Look { line: ArmorLine; tier: ArmorTier; t: TierLook; main: MatDef; trim: MatDef | null; soft: MatDef; glow: MatDef | null }

function look(line: ArmorLine, tier: ArmorTier, over: Partial<TierLook> = {}): Look {
  const t = { ...ARMOR_EVOLUTION[line][tier - 1], ...over };
  // las épicas se dibujan con la forma clásica de metal que les toca (colores y ribetes propios)
  line = ARMOR_FORMA[line];
  const metal = line === 'malla' || line === 'placas';
  const main: MatDef = line === 'tunica' ? clothMat(t.base) : line === 'cuero' ? leatherMat(t.base) : metalMat(t.base);
  // lo blando (forro, correas): cuero para cuero y metal; tela clara para túnica
  const soft: MatDef = line === 'tunica' ? clothMat(t.belt ?? '#2a2040') : leatherMat(t.belt ?? (metal ? '#5a3a22' : '#4a2e1c'));
  return { line, tier, t, main, trim: t.trim ? metalMat(t.trim) : null, soft, glow: t.glow ? glowMat(t.glow) : null };
}

const mirror = (pts: P[]): P[] => pts.map(([x, y]) => [32 - x, y]);

/** remaches o tachas */
function studs(c: IconCanvas, pts: P[], m: MatDef) { for (const p of pts) c.dot(p, m, { tone: 4 }); }

/** textura de malla o escamas sobre lo ya dibujado */
function chain(c: IconCanvas, L: Look, scales: boolean) {
  const k = c.k, S = c.size;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const m = c.matAt(x, y);
    if (!m || m !== L.main) continue;
    const u = Math.floor(x / k), v = Math.floor(y / k);
    const off = scales ? (v % 2 ? 0 : (((u + (v >> 1)) % 2) ? -1 : 0)) : ((u + v) % 2 ? -1 : 0);
    if (off) c.setPx(x, y, L.main, { bias: -1 }, c.getPx(x, y)!.group);
  }
}

function chest(c: IconCanvas, L: Look) {
  const { line, tier } = L;
  const robe = line === 'tunica';
  const body: P[] = robe
    ? [[9, 5], [13, 4], [16, 7], [19, 4], [23, 5], [25, 12], [24, 29], [8, 29], [7, 12]]
    : [[8, 6], [12.5, 4.5], [16, 8], [19.5, 4.5], [24, 6], [25.5, 13], [24, 26], [16, 27.5], [8, 26], [6.5, 13]];
  c.poly(body, L.main);
  // mangas o sisas
  if (robe) for (const s of [0, 1]) { const pts: P[] = [[7, 7], [3.5, 15], [5, 22], [8.4, 15]]; c.poly(s ? mirror(pts) : pts, L.main); }
  if (line === 'malla') chain(c, L, tier >= 3);
  if (line === 'placas') {
    // placas: pecho con quilla y juntas abajo
    c.px1([16, 9], [16, 25], L.main, { tone: 5 }, true);
    for (const y of [19.5, 22.5]) c.px1([8.6, y], [23.4, y], L.main, { tone: 1 }, true);
    c.poly([[10, 9], [15, 9], [15, 17], [10.5, 15.5]], L.main, { bias: 1 });
  }
  if (line === 'cuero') {
    // correa cruzada y costuras
    c.line([9, 9], [22, 24], 2, L.soft);
    for (let y = 9; y < 24; y += 3) c.dot([7.5 + (y > 16 ? 0.5 : 0), y], L.main, { tone: 1 }, true);
    if (tier >= 2) studs(c, [[10.4, 11], [13.6, 14.6], [16.8, 18.2], [20, 21.8]], L.trim ?? MAT.bronze);
    if (tier >= 4) for (let y = 11; y < 24; y += 3) for (let x = 18; x < 24; x += 3) c.ring([x + (y % 2), y], 1.3, 1, 0.5, L.main, { bias: -1 }, 180, 360);
  }
  if (robe) {
    // cuello en V y faja
    c.poly([[13, 4.4], [16, 11], [19, 4.4], [16, 7.4]], L.soft);
    c.poly([[8, 17], [24, 17], [24.2, 19.6], [7.8, 19.6]], L.soft);
    if (tier >= 3) for (let y = 21; y < 28; y += 2.5) c.dot([16, y], L.glow ?? L.trim ?? MAT.gold, { tone: 4 }, true);
  }
  // ribete de cuello y borde
  if (L.trim) {
    c.px1([12.5, 4.6], [16, 8.2], L.trim, { tone: 4 });
    c.px1([16, 8.2], [19.5, 4.6], L.trim, { tone: 4 });
    c.px1(robe ? [8, 28.6] : [8.3, 25.8], robe ? [24, 28.6] : [24, 25.8], L.trim, { tone: 3 });
  }
  if (L.t.pauldrons) for (const s of [0, 1]) { const pts: P[] = [[4.6, 9], [9.2, 4.8], [13, 6.6], [11, 12.4], [6, 13.2]]; c.poly(s ? mirror(pts) : pts, L.trim && tier >= 4 ? L.trim : L.main); }
  if (L.t.gem) {
    c.circle([16, 14], tier >= 5 ? 2.4 : 1.8, L.trim ?? MAT.gold);
    c.circle([16, 14], tier >= 5 ? 1.5 : 1.1, gemMat(L.t.gem));
  }
  if (L.glow) {
    // runas encendidas a los lados
    for (const s of [-1, 1]) { c.px1([16 + s * 4, 17], [16 + s * 6, 21], L.glow, { tone: 5 }, true); c.px1([16 + s * 6, 21], [16 + s * 4, 24], L.glow, { tone: 4 }, true); }
    c.dot([16, 14], L.glow, { tone: 5 }, true);
  }
}

function helmFamily(id: string | null): 'cap' | 'hood' | 'coif' | 'nasal' | 'closed' | 'horned' | 'wizard' | 'crest' | 'circlet' | 'crown' {
  if (!id) return 'circlet';
  if (id === 'crown' || id === 'tiara') return 'crown';
  if (id === 'headband' || id === 'headband_tied' || id === 'bandana' || id === 'bandana2') return 'circlet';
  if (id === 'leather_cap' || id === 'kettle') return 'cap';
  if (id === 'hood') return 'hood';
  if (id === 'mail') return 'coif';
  if (id === 'nasal' || id === 'norman' || id === 'spangenhelm') return 'nasal';
  if (id === 'bascinet' || id === 'armet' || id === 'greathelm' || id === 'close') return 'closed';
  if (id === 'horned' || id === 'viking' || id === 'barbarian') return 'horned';
  if (id === 'wizard' || id === 'celestial') return 'wizard';
  if (id === 'pointed') return 'nasal';
  return 'crest';
}

function helm(c: IconCanvas, L: Look) {
  const fam = helmFamily(L.t.helm);
  const m = L.main, tr = L.trim;
  if (fam === 'circlet') {
    // aprendiz o jubón sin casco: diadema simple
    c.ring([16, 18], 9, 4, 1.6, tr ?? (L.line === 'tunica' ? MAT.bronze : leatherMat(L.t.base)), {}, 0, 360);
    c.circle([16, 14.4], 1.6, gemMat(L.t.gem ?? '#2f62e6'));
    return;
  }
  if (fam === 'crown') {
    // corona de puntas con gemas
    const g = tr ?? MAT.gold;
    c.poly([[5, 26], [5, 12], [9.4, 18], [12.4, 7], [16, 15.6], [19.6, 7], [22.6, 18], [27, 12], [27, 26]], m);
    c.poly([[5, 22], [27, 22], [27, 26.6], [5, 26.6]], g);
    for (const [x, y] of [[5, 11.4], [12.4, 6.4], [19.6, 6.4], [27, 11.4]] as P[]) c.circle([x, y], 1.3, g);
    c.circle([16, 24.3], 1.6, gemMat(L.t.gem ?? '#d8243e'));
    for (const x of [9.4, 22.6]) c.circle([x, 24.3], 1, gemMat('#2f62e6'));
    if (L.glow) for (const [x, y] of [[12.4, 6.4], [19.6, 6.4]] as P[]) c.dot([x, y], L.glow, { tone: 5 }, true);
    return;
  }
  if (fam === 'hood' || fam === 'wizard') {
    const pts: P[] = fam === 'hood'
      ? [[16, 3.5], [24, 9], [26, 20], [24, 28], [20, 26], [20, 15], [12, 15], [12, 26], [8, 28], [6, 20], [8, 9]]
      : [[18, 2], [21, 8], [22, 17], [28, 22], [27, 25], [5, 25], [4, 22], [10, 17], [12, 9], [15, 5]];
    c.poly(pts, m);
    if (fam === 'hood') c.poly([[12, 15], [20, 15], [20, 26], [12, 26]], MAT.obsidian, { tone: 1 });
    else c.poly([[5, 21.6], [27, 21.6], [27.4, 24.8], [4.6, 24.8]], tr ?? L.soft);
    if (L.t.gem) c.circle(fam === 'hood' ? [16, 9.5] : [16, 18.2], 1.4, gemMat(L.t.gem));
    if (L.glow) for (const p of [[13, 13], [19.5, 11.5], [17, 7]] as P[]) c.dot(p, L.glow, { tone: 5 }, true);
    return;
  }
  // cascos de metal: cúpula, nasal o visera, cuernos
  c.poly([[7, 16], [7.6, 11], [10, 6.8], [13.4, 4.6], [18.6, 4.6], [22, 6.8], [24.4, 11], [25, 16], [25, 26], [21.6, 27], [21.6, 19], [10.4, 19], [10.4, 27], [7, 26]], m);
  if (fam === 'coif') { chain(c, L, false); c.poly([[10.4, 13], [21.6, 13], [21.6, 22], [10.4, 22]], MAT.flesh, { tone: 2 }); }
  if (fam === 'cap') c.ellipse([16, 15], 12.4, 2.2, tr ?? m, {});
  if (fam === 'nasal' || fam === 'horned' || fam === 'crest') {
    c.poly([[10.4, 13.4], [21.6, 13.4], [21.6, 22], [10.4, 22]], MAT.obsidian, { tone: 1 });
    c.poly([[15, 12], [17, 12], [17, 21], [15, 21]], m);
  }
  if (fam === 'closed') {
    c.poly([[9.6, 14.6], [22.4, 14.6], [22.4, 16.4], [9.6, 16.4]], MAT.obsidian, { tone: 0 });
    for (let x = 12; x <= 20; x += 2.6) c.poly([[x, 19.4], [x + 0.9, 19.4], [x + 0.9, 23.6], [x, 23.6]], MAT.obsidian, { tone: 1 });
    c.px1([16, 5], [16, 26.4], m, { tone: 5 }, true);
    // el yelmo legendario lleva alas doradas
    if (L.glow) for (const s of [0, 1]) { const pts: P[] = [[7.6, 13], [2, 7], [1.4, 2.6], [4.6, 5.6], [5, 2.4], [7.4, 6.8], [9.6, 9.6]]; c.poly(s ? mirror(pts) : pts, tr ?? MAT.gold); }
  }
  if (tr) c.px1([7.4, 16.2], [24.6, 16.2], tr, { tone: 4 }, true);
  if (fam === 'horned') for (const s of [0, 1]) { const pts: P[] = [[7.6, 12], [3, 8.6], [1.6, 3], [4.4, 6], [9, 9.6]]; c.poly(s ? mirror(pts) : pts, MAT.bone); }
  if (fam === 'crest') {
    // cimera o alas: penacho o alas doradas a los lados
    if (L.t.helm === 'maximus') for (const s of [0, 1]) { const pts: P[] = [[7.6, 13], [2, 7], [1.4, 2.6], [4.6, 5.6], [5, 2.4], [7.4, 6.8], [9.6, 9.6]]; c.poly(s ? mirror(pts) : pts, tr ?? MAT.gold); }
    else c.poly([[13.6, 4.8], [14.6, 1], [22, 0.8], [26, 3.6], [18.4, 4.6]], clothMat(L.t.cape ?? '#7a1f2b'));
  }
  if (L.t.gem) c.circle([16, 9], 1.4, gemMat(L.t.gem));
  if (L.glow) { c.px1([10.6, 15], [21.4, 15], L.glow, { tone: 5 }, true); }
}

function shoulders(c: IconCanvas, L: Look) {
  // hombrera izquierda vista de frente, inclinada: cúpula sobre el hombro y láminas que bajan por el brazo
  const cloth = L.line === 'tunica';
  const rotA = (-32 * Math.PI) / 180, C: P = [16, 15];
  const R = (p: P): P => { const dx = (p[0] - C[0]) * 0.88, dy = (p[1] - C[1]) * 0.88; return [C[0] + dx * Math.cos(rotA) - dy * Math.sin(rotA), C[1] + dx * Math.sin(rotA) + dy * Math.cos(rotA)]; };
  const arc = (cx: number, cy: number, rx: number, ry: number, w: number, a0: number, a1: number): P[] => {
    const out: P[] = [], inn: P[] = [];
    for (let i = 0; i <= 12; i++) { const a = ((a0 + ((a1 - a0) * i) / 12) * Math.PI) / 180; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); inn.push([cx + Math.cos(a) * (rx - w), cy + Math.sin(a) * (ry - w)]); }
    return [...out, ...inn.reverse()].map(R);
  };
  const lames = cloth ? 2 : L.tier >= 3 ? 4 : 3;
  // correa de cuero hacia el cuello
  c.line(R([24, 9]), R([29, 4]), 2, L.soft);
  for (let i = lames - 1; i >= 0; i--) {
    const pts = arc(16, 12 + i * 3.4, 10.6 - i * 0.7, 7 + i * 0.3, 3.4, 0, 180);
    c.poly(pts, cloth ? (i % 2 ? L.soft : L.main) : L.main, { bias: -0.5 * i });
    if (L.trim && (i === lames - 1 || L.tier >= 4)) c.poly(arc(16, 12 + i * 3.4, 10.6 - i * 0.7, 7 + i * 0.3, 0.9, 5, 175), L.trim, { tone: 4 });
  }
  // cúpula
  const dome: P[] = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI + (Math.PI * i) / 16; dome.push([16 + Math.cos(a) * 11.4, 13 + Math.sin(a) * 8.6]); }
  dome.push([27.4, 14.4], [4.6, 14.4]);
  c.poly(dome.map(R), L.main, { bias: 1 });
  if (L.line === 'malla') chain(c, L, L.tier >= 3);
  if (L.trim) c.poly(arc(16, 13.6, 11.4, 1.6, 1, 0, 180), L.trim, { tone: 4 });
  if (L.tier >= 3 && !cloth) for (const x of [11, 16, 21]) c.poly([R([x - 1.6, 6.4 + Math.abs(x - 16) * 0.4]), R([x, 1.8 + Math.abs(x - 16) * 0.5]), R([x + 1.6, 6.4 + Math.abs(x - 16) * 0.4])], L.trim ?? MAT.steel);
  if (L.line === 'cuero' && L.tier >= 2) studs(c, [R([10, 10]), R([16, 8.4]), R([22, 10])], L.trim ?? MAT.bronze);
  if (L.t.gem) { c.circle(R([16, 9]), 2, L.trim ?? MAT.gold); c.circle(R([16, 9]), 1.2, gemMat(L.t.gem)); }
  if (L.glow) c.poly(arc(16, 18, 9, 6, 0.8, 30, 150), L.glow, { tone: 5 });
}

function gloves(c: IconCanvas, L: Look) {
  const metal = L.line === 'placas' || L.line === 'malla';
  // guante derecho: puño, dedos juntos y pulgar
  c.poly([[7, 26], [6.4, 18.6], [9, 13], [11, 12.2], [14.6, 12.6], [17, 15], [16.6, 22], [13.6, 27]], metal ? MAT.darkleather : L.main);
  for (let i = 0; i < 4; i++) c.line([10 + i * 2.1, 13.4], [11.4 + i * 2.2, 5.6 + i * 0.6 + (i === 3 ? 1.5 : 0)], 2.1, metal ? L.main : L.main, { group: 50 + i });
  c.line([16.4, 17.4], [21, 13.4], 2.2, metal ? L.main : L.main);
  if (metal) { c.poly([[7.4, 18], [15.8, 15.8], [16.4, 21.4], [8, 24]], L.main); c.px1([8, 20.4], [16, 18.6], L.main, { tone: 1 }, true); }
  // puño de la manga
  c.poly([[6.4, 24.6], [14.6, 24], [15, 29.4], [6.8, 30]], L.trim ?? L.soft);
  if (L.tier >= 2 && !metal) studs(c, [[9, 19], [12, 18], [14.6, 19.4]], L.trim ?? MAT.bronze);
  if (L.t.gem) c.circle([11, 21], 1.2, gemMat(L.t.gem));
  if (L.glow) for (let i = 0; i < 4; i++) c.dot([11.4 + i * 2.2, 6.4 + i * 0.6 + (i === 3 ? 1.5 : 0)], L.glow, { tone: 5 }, true);
}

function boots(c: IconCanvas, L: Look) {
  const metal = L.line === 'placas';
  const m = L.line === 'tunica' ? L.soft : L.line === 'malla' ? MAT.darkleather : L.main;
  c.poly([[9, 4], [18, 4], [18.6, 18], [26, 21], [27.4, 25.4], [26.6, 27.6], [8.6, 27.6], [8.4, 18]], m);
  if (metal) { c.poly([[8.6, 7], [18.4, 7], [18.6, 18], [8.4, 18]], L.main); c.poly([[17, 19], [25.4, 21.4], [26.4, 25], [16, 25]], L.main); }
  if (L.line === 'malla') { c.poly([[8.6, 4], [18.2, 4], [18.4, 12], [8.6, 12]], L.main); chain(c, L, L.tier >= 3); }
  // suela y caña
  c.poly([[8.4, 26], [27.2, 26], [26.8, 28.4], [8.4, 28.4]], MAT.darkwood, { tone: 2 });
  c.poly([[8.4, 3], [18.6, 3], [18.6, 6], [8.4, 6]], L.trim ?? (L.line === 'cuero' ? MAT.fur : m));
  if (L.tier >= 2 && L.line === 'cuero') c.line([9, 13], [18, 11], 1.2, L.soft);
  if (L.t.gem) c.circle([13.6, 9], 1.1, gemMat(L.t.gem));
  if (L.glow) { c.px1([9, 16], [18, 16], L.glow, { tone: 5 }, true); c.dot([24, 23.4], L.glow, { tone: 5 }, true); }
}

function belt(c: IconCanvas, L: Look) {
  const m = L.line === 'tunica' ? L.soft : L.line === 'cuero' ? L.main : leatherMat(L.t.belt ?? '#5a3a22');
  // cinturón en curva (como si rodeara la cintura)
  const pts: P[] = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([3 + t * 26, 13 + Math.sin(t * Math.PI) * 3.4]); }
  const low = pts.map(([x, y]) => [x, y + 5.6] as P);
  c.poly([...pts, ...low.reverse()], m);
  if (L.line === 'placas' || L.line === 'malla') for (const x of [7, 25]) c.poly([[x - 2.4, 15], [x + 2.4, 15.6], [x + 2.4, 22], [x - 2.4, 21.4]], L.main);
  if (L.tier >= 2) for (let x = 6; x < 28; x += 3.2) if (Math.abs(x - 16) > 4) c.dot([x, 13 + Math.sin(((x - 3) / 26) * Math.PI) * 3.4 + 2.8], L.trim ?? MAT.bronze, { tone: 4 });
  // hebilla
  c.poly([[12.2, 13.6], [19.8, 13.6], [19.8, 23.2], [12.2, 23.2]], L.trim ?? MAT.iron);
  c.poly([[14, 15.6], [18, 15.6], [18, 21.2], [14, 21.2]], m);
  if (L.t.gem) c.circle([16, 18.4], 1.5, gemMat(L.t.gem));
  if (L.line === 'tunica') c.line([22, 20], [24, 28], 1.6, L.soft);
  if (L.glow) c.px1([13, 22.4], [19, 22.4], L.glow, { tone: 5 }, true);
}

function pants(c: IconCanvas, L: Look) {
  const m = L.line === 'tunica' ? L.main : L.line === 'cuero' ? L.main : L.line === 'malla' ? L.main : L.main;
  c.poly([[8, 4], [24, 4], [25.6, 28], [18.4, 28], [16, 12], [13.6, 28], [6.4, 28]], m);
  if (L.line === 'malla') chain(c, L, L.tier >= 3);
  if (L.line === 'placas') for (const s of [0, 1]) { const pts: P[] = [[7.6, 13], [13.6, 13], [13.4, 19], [7.2, 19]]; c.poly(s ? mirror(pts) : pts, L.main, { bias: 1 }); }
  c.poly([[8, 3], [24, 3], [24, 6.4], [8, 6.4]], L.soft);
  if (L.trim) { c.px1([6.6, 27.4], [13.4, 27.4], L.trim, { tone: 4 }); c.px1([18.6, 27.4], [25.4, 27.4], L.trim, { tone: 4 }); }
  if (L.tier >= 2 && L.line === 'cuero') c.px1([10, 8], [9, 26], L.main, { tone: 1 }, true);
  if (L.glow) for (const s of [0, 1]) c.px1(s ? [21, 9] : [11, 9], s ? [22.6, 24] : [9.4, 24], L.glow, { tone: 4 }, true);
}

/** Dibuja una pieza de armadura de una línea y nivel. */
export function drawArmorIcon(c: IconCanvas, slot: ArmorSlot, line: ArmorLine, tier: ArmorTier, over: Partial<TierLook> = {}) {
  const L = look(line, tier, over);
  ({ helm, chest, shoulders, gloves, belt, pants, boots })[slot](c, L);
  c.center();
}

/** El halo de la pieza según el nivel (4: raro, 5: legendario). */
export function tierAura(tier: ArmorTier): string | null {
  return tier >= 5 ? '#ff8a1e' : tier === 4 ? '#ffd84a' : null;
}
