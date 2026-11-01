// Datos del botín: bases, afijos, únicos, conjuntos, gemas, runas y palabras rúnicas del valle de Velmora.
// Todo es original. Los tipos viven en juego/tipos_objetos.ts.
import type {
  Afijo, Base, Clase, Conjunto, Gema, Palabra, RangoStat, Ranura, Runa, Stat, Unico,
} from '../juego/tipos_objetos';

type TipoArma = NonNullable<Base['arma']>;
type Visual = Base['visual'];

/** Rango de una estadística. Sin max, es un valor fijo. */
const r = (stat: Stat, min: number, max: number = min): RangoStat => ({ stat, min, max });

// ------------------------------------------------------------------ bases
const A_DOS_MANOS: TipoArma[] = ['mandoble', 'hacha_doble', 'martillo', 'lanza', 'alabarda', 'guadana', 'baculo', 'arco', 'ballesta'];
const DURAB = [28, 44, 60];
const PRECIO_ESC = [1, 2.5, 6];

function arma(
  id: string, es: string, en: string, tipo: TipoArma, escalon: 0 | 1 | 2, nivel: number,
  tam: [number, number], dano: [number, number], vel: number, req: Base['req'], huecos: number,
  mat: string, mango?: string, gema?: string, clase?: Clase,
): Base {
  const vis: NonNullable<Visual['arma']> = { tipo, mat };
  if (mango) vis.mango = mango;
  if (gema) vis.gema = gema;
  const b: Base = {
    id, nombre: [es, en], ranura: 'arma', familia: tipo, nivel, escalon, req, tam, dano, vel,
    durab: DURAB[escalon] + (A_DOS_MANOS.includes(tipo) ? 10 : 0),
    precio: Math.round(((dano[0] + dano[1]) * 4 + nivel * 15 + 30) * PRECIO_ESC[escalon]),
    huecosMax: huecos, visual: { arma: vis }, arma: tipo,
  };
  if (A_DOS_MANOS.includes(tipo)) b.dosManos = true;
  if (tipo === 'arco' || tipo === 'ballesta') b.distancia = true;
  if (clase) b.clase = clase;
  return b;
}

function pieza(
  id: string, es: string, en: string, ranura: Ranura, familia: string, escalon: 0 | 1 | 2, nivel: number,
  tam: [number, number], def: [number, number] | undefined, req: Base['req'], huecos: number, visual: Visual,
  extra: Partial<Base> = {},
): Base {
  const media = def ? (def[0] + def[1]) / 2 : 10;
  const b: Base = {
    id, nombre: [es, en], ranura, familia, nivel, escalon, req, tam,
    durab: def ? DURAB[escalon] + 4 : 0,
    precio: Math.round((media * 6 + nivel * 12 + 25) * PRECIO_ESC[escalon]),
    visual, ...extra,
  };
  if (def) b.def = def;
  if (huecos) b.huecosMax = huecos;
  return b;
}

export const BASES: Base[] = [
  // ---------------- espadas (1x3)
  arma('espada_corta', 'Espada corta', 'Short Sword', 'espada', 0, 1, [1, 3], [2, 7], 0, {}, 2, 'hierro_oxido', 'cuero'),
  arma('hoja_vigilia', 'Hoja de vigilia', 'Vigil Blade', 'espada', 0, 7, [1, 3], [3, 10], 0, { fue: 25, des: 15 }, 3, 'hierro', 'cuero'),
  arma('espada_penitente', 'Espada del penitente', 'Penitent Sword', 'espada', 1, 24, [1, 3], [16, 38], 0, { fue: 55, des: 40 }, 3, 'cu_placa', 'cu_cuero'),
  arma('espada_ancha', 'Espada ancha de ronda', 'Patrol Broadsword', 'espada', 1, 31, [2, 3], [22, 46], 5, { fue: 70, des: 35 }, 4, 'acero', 'cu_cuero_negro'),
  arma('hoja_ceniza_negra', 'Hoja de ceniza negra', 'Black Ash Blade', 'espada', 2, 48, [1, 3], [40, 90], 0, { fue: 110, des: 80 }, 4, 'cu_placa_oscura', 'cu_cuero_negro', 'fuego'),
  // ---------------- cimitarras (1x3)
  arma('sable_caravana', 'Sable de caravana', 'Caravan Sabre', 'cimitarra', 0, 4, [1, 3], [3, 8], -10, { des: 25 }, 2, 'hierro', 'cuero'),
  arma('cimitarra_dunas', 'Cimitarra de las dunas', 'Dune Scimitar', 'cimitarra', 1, 26, [1, 3], [15, 36], -10, { fue: 40, des: 65 }, 3, 'acero', 'cu_tela_roja', 'cristal'),
  arma('hoz_rey_dormido', 'Hoz del rey dormido', 'Sleeping King\'s Crescent', 'cimitarra', 2, 47, [1, 3], [36, 82], -10, { fue: 75, des: 115 }, 3, 'cu_oro', 'cu_tela_negra', 'runa'),
  // ---------------- mandobles (2x4)
  arma('mandoble_verdugo', 'Mandoble de verdugo', 'Headsman\'s Greatsword', 'mandoble', 0, 9, [2, 4], [8, 20], 10, { fue: 50, des: 20 }, 4, 'hierro_oxido', 'cuero'),
  arma('hoja_cruzada_rota', 'Hoja de la cruzada rota', 'Broken Crusade Blade', 'mandoble', 1, 30, [2, 4], [34, 70], 10, { fue: 95, des: 50 }, 5, 'cu_placa', 'cu_tela_blanca'),
  arma('mandoble_eclipse', 'Mandoble del eclipse', 'Eclipse Greatsword', 'mandoble', 2, 53, [2, 4], [75, 160], 10, { fue: 160, des: 85 }, 6, 'cu_placa_oscura', 'cu_cuero_negro', 'magia'),
  // ---------------- hachas (2x3)
  arma('hacha_mano', 'Hacha de mano', 'Hand Axe', 'hacha', 0, 1, [1, 3], [3, 6], 0, {}, 2, 'hierro_oxido', 'madera'),
  arma('hacha_lenador', 'Hacha de leñador', 'Woodsman\'s Axe', 'hacha', 0, 7, [2, 3], [4, 11], 0, { fue: 32 }, 3, 'hierro', 'madera_vieja'),
  arma('hacha_norte', 'Hacha de guerra del norte', 'Northern War Axe', 'hacha', 1, 28, [2, 3], [20, 44], 0, { fue: 75 }, 4, 'acero', 'madera_lisa'),
  arma('hacha_escarcha_negra', 'Hacha de escarcha negra', 'Black Rime Axe', 'hacha', 2, 50, [2, 3], [44, 96], 0, { fue: 130 }, 5, 'cu_placa_oscura', 'cu_hueso', 'cristal'),
  // ---------------- hachas dobles (2x4)
  arma('hacha_dos_hojas', 'Hacha de dos hojas', 'Twin-Bladed Axe', 'hacha_doble', 0, 11, [2, 4], [9, 24], 10, { fue: 60 }, 4, 'hierro_oxido', 'madera'),
  arma('gran_hacha_cadalso', 'Gran hacha del cadalso', 'Scaffold Greataxe', 'hacha_doble', 1, 33, [2, 4], [38, 80], 10, { fue: 110 }, 5, 'cu_placa', 'cu_cuero_negro'),
  arma('hacha_devorador', 'Hacha del devorador', 'Devourer Axe', 'hacha_doble', 2, 55, [2, 4], [82, 170], 10, { fue: 175 }, 6, 'cu_placa_oscura', 'cu_hueso', 'sangre'),
  // ---------------- mazas (1x3)
  arma('maza_cofradia', 'Maza de cofradía', 'Guild Mace', 'maza', 0, 4, [1, 3], [3, 10], 0, { fue: 27 }, 2, 'hierro', 'madera'),
  arma('maza_abad', 'Maza del abad', 'Abbot\'s Mace', 'maza', 1, 25, [1, 3], [18, 42], 0, { fue: 70 }, 3, 'bronce', 'cu_cuero'),
  arma('maza_penitencia', 'Maza de la penitencia', 'Penance Mace', 'maza', 2, 47, [1, 3], [40, 92], 0, { fue: 125 }, 4, 'cu_oro', 'cu_cuero_negro', 'luz_vela'),
  // ---------------- martillos (2x4)
  arma('mazo_cantero', 'Mazo de cantero', 'Mason\'s Maul', 'martillo', 0, 14, [2, 4], [12, 28], 20, { fue: 75 }, 4, 'roca', 'madera_vieja'),
  arma('martillo_forja', 'Martillo de forja', 'Forge Hammer', 'martillo', 1, 35, [2, 4], [45, 90], 20, { fue: 130 }, 5, 'hierro', 'madera_lisa'),
  arma('martillo_juicio', 'Martillo del juicio', 'Judgement Hammer', 'martillo', 2, 58, [2, 4], [95, 190], 20, { fue: 190 }, 6, 'cu_placa_oscura', 'cu_cuero_negro', 'runa'),
  // ---------------- manguales (1x3 / 2x3)
  arma('mangual_trilla', 'Mangual de trilla', 'Threshing Flail', 'mangual', 0, 9, [2, 3], [2, 13], 0, { fue: 35, des: 20 }, 3, 'hierro_oxido', 'madera'),
  arma('mangual_cadenas', 'Mangual de cadenas', 'Chain Flail', 'mangual', 1, 28, [2, 3], [16, 52], 0, { fue: 80, des: 45 }, 4, 'acero', 'cu_cuero'),
  arma('mangual_flagelante', 'Mangual del flagelante', 'Flagellant Flail', 'mangual', 2, 51, [2, 3], [34, 112], 0, { fue: 135, des: 70 }, 5, 'cu_placa_oscura', 'cu_venda', 'sangre'),
  // ---------------- lanzas (2x4)
  arma('lanza_cazador', 'Lanza de cazador', 'Hunter\'s Spear', 'lanza', 0, 7, [2, 4], [6, 18], 0, { fue: 30, des: 30 }, 3, 'hierro', 'madera'),
  arma('pica_guardia', 'Pica de la guardia', 'Watch Pike', 'lanza', 1, 29, [2, 4], [28, 62], 0, { fue: 75, des: 60 }, 4, 'acero', 'madera_lisa'),
  arma('lanza_obsidiana', 'Lanza de obsidiana', 'Obsidian Spear', 'lanza', 2, 53, [2, 4], [60, 135], 0, { fue: 120, des: 110 }, 5, 'marmol_negro', 'corteza_muerta', 'lava'),
  // ---------------- alabardas (2x4)
  arma('alabarda_ronda', 'Alabarda de ronda', 'Patrol Halberd', 'alabarda', 0, 12, [2, 4], [10, 26], 10, { fue: 55, des: 25 }, 4, 'hierro_oxido', 'madera'),
  arma('alabarda_campanario', 'Alabarda del campanario', 'Belfry Halberd', 'alabarda', 1, 33, [2, 4], [40, 82], 10, { fue: 100, des: 55 }, 5, 'cu_placa', 'madera_lisa'),
  arma('alabarda_ultimo_muro', 'Alabarda del último muro', 'Last Wall Halberd', 'alabarda', 2, 56, [2, 4], [85, 175], 10, { fue: 165, des: 90 }, 6, 'cu_placa_oscura', 'cu_cuero_negro'),
  // ---------------- guadañas (2x4)
  arma('guadana_siega', 'Guadaña de siega', 'Harvest Scythe', 'guadana', 0, 11, [2, 4], [8, 25], 10, { fue: 45, des: 35 }, 4, 'hierro_oxido', 'madera_vieja'),
  arma('guadana_sepulturero', 'Guadaña de sepulturero', 'Gravedigger\'s Scythe', 'guadana', 1, 31, [2, 4], [34, 84], 10, { fue: 85, des: 70 }, 5, 'acero', 'corteza'),
  arma('guadana_ocaso', 'Guadaña del ocaso', 'Dusk Scythe', 'guadana', 2, 54, [2, 4], [72, 182], 10, { fue: 140, des: 120 }, 6, 'cu_placa_oscura', 'cu_hueso', 'magia'),
  // ---------------- báculos (1x4)
  arma('baculo_peregrino', 'Báculo de peregrino', 'Pilgrim\'s Staff', 'baculo', 0, 2, [1, 4], [2, 8], 0, {}, 2, 'madera', 'cuerda', 'cristal'),
  arma('baculo_raiz_negra', 'Báculo de raíz negra', 'Blackroot Staff', 'baculo', 1, 22, [1, 4], [12, 30], 0, { fue: 25 }, 3, 'corteza_muerta', 'cu_cuero', 'magia'),
  arma('baculo_astro_caido', 'Báculo del astro caído', 'Fallen Star Staff', 'baculo', 2, 45, [1, 4], [28, 64], 0, { fue: 45 }, 4, 'madera_lisa', 'cu_oro', 'fuego'),
  // ---------------- cetros (1x3)
  arma('cetro_capilla', 'Cetro de capilla', 'Chapel Sceptre', 'cetro', 0, 5, [1, 3], [3, 9], 0, { fue: 25 }, 2, 'bronce', 'madera_lisa', 'cristal'),
  arma('cetro_prior', 'Cetro del prior', 'Prior\'s Sceptre', 'cetro', 1, 25, [1, 3], [16, 36], 0, { fue: 60 }, 3, 'oro', 'cu_tela_morada', 'magia'),
  arma('cetro_llama_santa', 'Cetro de la llama santa', 'Holy Flame Sceptre', 'cetro', 2, 48, [1, 3], [38, 80], 0, { fue: 100 }, 4, 'cu_oro', 'cu_tela_blanca', 'luz_vela'),
  // ---------------- varitas (1x2)
  arma('varita_tejo', 'Varita de tejo', 'Yew Wand', 'varita', 0, 1, [1, 2], [1, 5], 0, {}, 1, 'madera', undefined, 'cristal'),
  arma('varita_osario', 'Varita de osario', 'Ossuary Wand', 'varita', 0, 5, [1, 2], [2, 6], 0, {}, 2, 'hueso', undefined, 'fuego_verde', 'nigromante'),
  arma('varita_hueso_tallado', 'Varita de hueso tallado', 'Carved Bone Wand', 'varita', 1, 21, [1, 2], [8, 18], 0, {}, 2, 'cu_hueso', 'cuerda', 'magia'),
  arma('varita_susurro', 'Varita del susurro', 'Whisper Wand', 'varita', 2, 43, [1, 2], [18, 40], 0, {}, 2, 'negro', 'cu_hueso', 'fuego_verde'),
  // ---------------- dagas (1x2)
  arma('punal_taberna', 'Puñal de taberna', 'Tavern Dirk', 'daga', 0, 1, [1, 2], [1, 6], -20, {}, 1, 'hierro_oxido', 'cuero'),
  arma('daga_misericordia', 'Daga de misericordia', 'Mercy Dagger', 'daga', 1, 20, [1, 2], [10, 24], -20, { des: 45 }, 2, 'acero', 'cu_cuero_negro'),
  arma('colmillo_sombra', 'Colmillo de sombra', 'Shadow Fang', 'daga', 2, 42, [1, 2], [26, 56], -20, { des: 90 }, 2, 'cu_placa_oscura', 'cu_cuero_negro', 'magia'),
  arma('estilete_abadia', 'Estilete de la abadía', 'Abbey Stiletto', 'daga', 2, 58, [1, 2], [34, 68], -20, { des: 120 }, 3, 'acero', 'cu_oro', 'runa'),
  // ---------------- garras (1x3, monje)
  arma('garras_cuero', 'Garras de cuero', 'Leather Claws', 'garras', 0, 3, [1, 3], [2, 7], -10, { fue: 15, des: 20 }, 2, 'hierro', 'cu_venda', undefined, 'monje'),
  arma('garras_tigre', 'Garras de tigre', 'Tiger Claws', 'garras', 1, 24, [1, 3], [14, 30], -10, { fue: 45, des: 60 }, 3, 'acero', 'cu_cuero', undefined, 'monje'),
  arma('garras_dragon_palido', 'Garras del dragón pálido', 'Pale Dragon Claws', 'garras', 2, 47, [1, 3], [34, 70], -10, { fue: 75, des: 110 }, 3, 'cu_hueso', 'cu_cuero_negro', 'cristal', 'monje'),
  // ---------------- arcos (2x3)
  arma('arco_corto', 'Arco corto', 'Short Bow', 'arco', 0, 1, [2, 3], [2, 6], -10, { des: 15 }, 3, 'madera', 'cuerda'),
  arma('arco_tejo_paramo', 'Arco de tejo del páramo', 'Moor Yew Bow', 'arco', 0, 10, [2, 3], [4, 12], 0, { des: 35 }, 3, 'madera_vieja', 'cuerda'),
  arma('arco_cuerno', 'Arco de cuerno', 'Horn Bow', 'arco', 1, 23, [2, 3], [14, 36], 0, { fue: 30, des: 70 }, 4, 'cu_hueso', 'cu_cuero'),
  arma('arco_cuervo', 'Arco del cuervo', 'Raven Bow', 'arco', 2, 46, [2, 3], [34, 80], 0, { fue: 50, des: 125 }, 5, 'negro', 'cu_cuero_negro', 'magia'),
  // ---------------- ballestas (2x3)
  arma('ballesta_ligera', 'Ballesta ligera', 'Light Crossbow', 'ballesta', 0, 8, [2, 3], [5, 16], 10, { fue: 25, des: 30 }, 3, 'madera', 'hierro'),
  arma('ballesta_asedio', 'Ballesta de asedio', 'Siege Crossbow', 'ballesta', 1, 30, [2, 3], [28, 58], 10, { fue: 70, des: 60 }, 4, 'madera_lisa', 'cu_placa'),
  arma('ballesta_centinela', 'Ballesta del centinela', 'Sentinel Arbalest', 'ballesta', 2, 52, [2, 3], [60, 125], 10, { fue: 110, des: 105 }, 5, 'corteza_muerta', 'cu_placa_oscura'),

  // ---------------- armaduras (2x3)
  pieza('camisa_acolchada', 'Camisa acolchada', 'Quilted Shirt', 'torso', 'armadura', 0, 1, [2, 3], [3, 8], {}, 2,
    { torso: { tipo: 'camisa', mat: 'cu_tela_parda' } }),
  pieza('tunica_novicio', 'Túnica de novicio', 'Novice Robe', 'torso', 'armadura', 0, 3, [2, 3], [4, 10], {}, 2,
    { torso: { tipo: 'tunica', mat: 'cu_tela_parda', mat2: 'cuerda' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_parda' } }),
  pieza('jubon_cuero', 'Jubón de cuero', 'Leather Doublet', 'torso', 'armadura', 0, 6, [2, 3], [8, 15], { fue: 15 }, 2,
    { torso: { tipo: 'cuero', mat: 'cu_cuero' }, piernas: { tipo: 'calzas', mat: 'cu_cuero' } }),
  pieza('cota_anillas', 'Cota de anillas', 'Ring Mail', 'torso', 'armadura', 0, 11, [2, 3], [16, 26], { fue: 35 }, 2,
    { torso: { tipo: 'malla', mat: 'cu_malla' }, piernas: { tipo: 'pantalon', mat: 'cu_cuero' } }),
  pieza('coraza_hierro', 'Coraza de hierro', 'Iron Cuirass', 'torso', 'armadura', 0, 17, [2, 3], [26, 40], { fue: 55 }, 3,
    { torso: { tipo: 'placas', mat: 'hierro' }, piernas: { tipo: 'grebas', mat: 'hierro' }, hombros: { tipo: 'placas', mat: 'hierro' } }),
  pieza('gambeson_bordado', 'Gambesón bordado', 'Embroidered Gambeson', 'torso', 'armadura', 1, 21, [2, 3], [60, 82], { fue: 30 }, 2,
    { torso: { tipo: 'camisa', mat: 'cu_tela_roja', mat2: 'cu_oro' }, tabardo: { mat: 'cu_tela_roja', borde: 'cu_oro' } }),
  pieza('habito_ceremonial', 'Hábito ceremonial', 'Ceremonial Habit', 'torso', 'armadura', 1, 23, [2, 3], [58, 78], {}, 2,
    { torso: { tipo: 'tunica', mat: 'cu_tela_morada', mat2: 'cu_oro' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_morada' } }),
  pieza('cuero_tachonado_ronda', 'Cuero tachonado de ronda', 'Patrol Studded Leather', 'torso', 'armadura', 1, 26, [2, 3], [72, 98], { fue: 45 }, 2,
    { torso: { tipo: 'cuero_tachonado', mat: 'cu_cuero_negro', mat2: 'hierro' }, piernas: { tipo: 'pantalon', mat: 'cu_cuero_negro' }, hombros: { tipo: 'cuero', mat: 'cu_cuero_negro' } }),
  pieza('loriga_guardia', 'Loriga de la guardia', 'Watch Hauberk', 'torso', 'armadura', 1, 30, [2, 3], [90, 120], { fue: 70 }, 3,
    { torso: { tipo: 'malla', mat: 'cu_malla' }, piernas: { tipo: 'faldon', mat: 'cu_malla' }, hombros: { tipo: 'placas', mat: 'cu_placa' }, tabardo: { mat: 'cu_tela_azul', borde: 'cu_tela_blanca' } }),
  pieza('placas_templo', 'Placas del templo', 'Temple Plate', 'torso', 'armadura', 1, 36, [2, 3], [115, 145], { fue: 95 }, 3,
    { torso: { tipo: 'placas', mat: 'cu_placa' }, piernas: { tipo: 'grebas', mat: 'cu_placa' }, hombros: { tipo: 'placas', mat: 'cu_placa' }, tabardo: { mat: 'cu_tela_blanca', borde: 'cu_tela_roja' } }),
  pieza('vestido_luto', 'Vestido de luto', 'Mourning Gown', 'torso', 'armadura', 2, 43, [2, 3], [150, 190], {}, 3,
    { torso: { tipo: 'vestido', mat: 'cu_tela_negra', mat2: 'cu_hueso' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_negra' } }),
  pieza('coraza_escamas_negras', 'Coraza de escamas negras', 'Black Scale Cuirass', 'torso', 'armadura', 2, 47, [2, 3], [180, 230], { fue: 85 }, 3,
    { torso: { tipo: 'cuero_tachonado', mat: 'cu_escama', mat2: 'cu_placa_oscura' }, piernas: { tipo: 'pantalon', mat: 'cu_cuero_negro' }, hombros: { tipo: 'puas', mat: 'cu_placa_oscura' } }),
  pieza('malla_sombra', 'Malla de sombra', 'Shadow Mail', 'torso', 'armadura', 2, 50, [2, 3], [200, 255], { fue: 105 }, 3,
    { torso: { tipo: 'malla', mat: 'cu_placa_oscura' }, piernas: { tipo: 'faldon', mat: 'cu_tela_negra' }, hombros: { tipo: 'huesos', mat: 'cu_hueso' } }),
  pieza('placas_obsidiana', 'Placas de obsidiana', 'Obsidian Plate', 'torso', 'armadura', 2, 56, [2, 3], [240, 300], { fue: 140 }, 4,
    { torso: { tipo: 'placas', mat: 'cu_placa_oscura' }, piernas: { tipo: 'grebas', mat: 'cu_placa_oscura' }, hombros: { tipo: 'puas', mat: 'cu_placa_oscura' }, tabardo: { mat: 'cu_tela_negra', borde: 'cu_tela_roja' } }),
  pieza('armadura_ultimo_rey', 'Armadura del último rey', 'Last King\'s Armor', 'torso', 'armadura', 2, 62, [2, 3], [270, 330], { fue: 165 }, 4,
    { torso: { tipo: 'placas', mat: 'cu_oro' }, piernas: { tipo: 'grebas', mat: 'cu_oro' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, tabardo: { mat: 'cu_tela_roja', borde: 'cu_oro' }, capa: { mat: 'cu_tela_roja', largo: 1, forro: 'cu_tela_negra' } }),

  // ---------------- cascos (2x2)
  pieza('capucha_lana', 'Capucha de lana', 'Wool Hood', 'cabeza', 'casco', 0, 1, [2, 2], [2, 5], {}, 1, { cabeza: { tipo: 'capucha', mat: 'cu_tela_parda' } }),
  pieza('gorro_cuero', 'Gorro de cuero', 'Leather Cap', 'cabeza', 'casco', 0, 4, [2, 2], [4, 8], {}, 2, { cabeza: { tipo: 'gorro', mat: 'cu_cuero' } }),
  pieza('casco_hierro', 'Casco de hierro', 'Iron Helm', 'cabeza', 'casco', 0, 10, [2, 2], [10, 16], { fue: 30 }, 2, { cabeza: { tipo: 'casco', mat: 'hierro' } }),
  pieza('yelmo_cerrado', 'Yelmo cerrado', 'Closed Helm', 'cabeza', 'casco', 0, 16, [2, 2], [15, 24], { fue: 45 }, 2, { cabeza: { tipo: 'yelmo', mat: 'hierro_oxido' } }),
  pieza('yelmo_cruzado', 'Gran yelmo de cruzado', 'Crusader Greathelm', 'cabeza', 'casco', 1, 30, [2, 2], [45, 65], { fue: 75 }, 3, { cabeza: { tipo: 'gran_yelmo', mat: 'cu_placa' } }),
  pieza('diadema_plata', 'Diadema de plata', 'Silver Diadem', 'cabeza', 'casco', 1, 24, [2, 2], [25, 40], {}, 3, { cabeza: { tipo: 'diadema', mat: 'acero', mat2: 'cristal' } }),
  pieza('turbante_desierto', 'Turbante del desierto', 'Desert Turban', 'cabeza', 'casco', 1, 22, [2, 2], [30, 44], {}, 2, { cabeza: { tipo: 'turbante', mat: 'cu_tela_blanca', mat2: 'cu_oro' } }),
  pieza('mascara_funeraria', 'Máscara funeraria', 'Funeral Mask', 'cabeza', 'casco', 1, 34, [2, 2], [42, 58], { fue: 40 }, 2, { cabeza: { tipo: 'mascara', mat: 'cu_oro', mat2: 'cu_tela_negra' } }),
  pieza('corona_ascua', 'Corona del ascua', 'Ember Crown', 'cabeza', 'casco', 2, 54, [2, 2], [90, 125], { fue: 60 }, 3, { cabeza: { tipo: 'corona', mat: 'cu_oro', mat2: 'fuego' } }),
  pieza('aro_vigias', 'Aro de los vigías', 'Watchers\' Circlet', 'cabeza', 'casco', 2, 44, [2, 2], [70, 100], {}, 3, { cabeza: { tipo: 'aro', mat: 'cu_placa_oscura', mat2: 'magia' } }),
  pieza('gran_yelmo_herida', 'Gran yelmo de la Herida', 'Wound Greathelm', 'cabeza', 'casco', 2, 58, [2, 2], [115, 150], { fue: 120 }, 3, { cabeza: { tipo: 'gran_yelmo', mat: 'cu_placa_oscura', mat2: 'lava' } }),
  pieza('calavera_ritual', 'Calavera ritual', 'Ritual Skull', 'cabeza', 'casco', 2, 48, [2, 2], [80, 110], {}, 2, { cabeza: { tipo: 'calavera', mat: 'cu_hueso' } }),
  pieza('craneo_ciervo', 'Cráneo de ciervo', 'Stag Skull', 'cabeza', 'casco', 0, 8, [2, 2], [8, 14], {}, 2, { cabeza: { tipo: 'cuernos', mat: 'cu_hueso', mat2: 'cu_pelaje' } }, { clase: 'druida' }),
  pieza('testa_alce', 'Testa de alce', 'Elk Brow', 'cabeza', 'casco', 1, 29, [2, 2], [40, 58], { fue: 40 }, 2, { cabeza: { tipo: 'cuernos', mat: 'cu_hueso', mat2: 'cu_pelaje_gris' } }, { clase: 'druida' }),
  pieza('cornamenta_bosque_viejo', 'Cornamenta del bosque viejo', 'Old Forest Antlers', 'cabeza', 'casco', 2, 51, [2, 2], [85, 120], { fue: 70 }, 3, { cabeza: { tipo: 'cuernos', mat: 'corteza_muerta', mat2: 'musgo' } }, { clase: 'druida' }),

  // ---------------- escudos y mano izquierda
  pieza('rodela', 'Rodela', 'Buckler', 'izq', 'escudo', 0, 1, [2, 2], [3, 6], {}, 1, { izq: { tipo: 'rodela', mat: 'madera', mat2: 'hierro' } }, { bloqueo: 20 }),
  pieza('escudo_redondo', 'Escudo redondo', 'Round Shield', 'izq', 'escudo', 0, 6, [2, 2], [8, 14], { fue: 25 }, 2, { izq: { tipo: 'escudo_redondo', mat: 'madera_vieja', mat2: 'hierro_oxido' } }, { bloqueo: 25 }),
  pieza('escudo_cometa', 'Escudo de cometa', 'Kite Shield', 'izq', 'escudo', 0, 13, [2, 3], [14, 22], { fue: 45 }, 3, { izq: { tipo: 'escudo_cometa', mat: 'hierro', mat2: 'cu_tela_azul' } }, { bloqueo: 30 }),
  pieza('escudo_calavera', 'Escudo de calavera', 'Skull Shield', 'izq', 'escudo', 0, 7, [2, 2], [6, 12], {}, 2, { izq: { tipo: 'escudo_calavera', mat: 'cu_hueso' } }, { bloqueo: 20, clase: 'nigromante' }),
  pieza('paves', 'Pavés', 'Pavise', 'izq', 'escudo', 1, 34, [2, 3], [70, 100], { fue: 110 }, 4, { izq: { tipo: 'escudo_torre', mat: 'cu_placa', mat2: 'madera_lisa' } }, { bloqueo: 38 }),
  pieza('escudo_templo', 'Escudo del templo', 'Temple Shield', 'izq', 'escudo', 1, 27, [2, 3], [50, 75], { fue: 75 }, 3, { izq: { tipo: 'escudo_cometa', mat: 'cu_placa', mat2: 'cu_tela_blanca' } }, { bloqueo: 33 }),
  pieza('rodela_bronce', 'Rodela de bronce', 'Bronze Targe', 'izq', 'escudo', 1, 22, [2, 2], [32, 48], { fue: 40 }, 2, { izq: { tipo: 'rodela', mat: 'bronce' } }, { bloqueo: 28 }),
  pieza('escudo_osario', 'Escudo de osario', 'Ossuary Shield', 'izq', 'escudo', 1, 28, [2, 2], [40, 60], {}, 2, { izq: { tipo: 'escudo_calavera', mat: 'cu_hueso', mat2: 'fuego_verde' } }, { bloqueo: 25, clase: 'nigromante' }),
  pieza('muralla_negra', 'Escudo de la muralla negra', 'Black Rampart Shield', 'izq', 'escudo', 2, 55, [2, 3], [150, 200], { fue: 160 }, 4, { izq: { tipo: 'escudo_torre', mat: 'cu_placa_oscura', mat2: 'marmol_negro' } }, { bloqueo: 45 }),
  pieza('egida_alba', 'Égida del alba', 'Aegis of Dawn', 'izq', 'escudo', 2, 50, [2, 3], [130, 175], { fue: 120 }, 4, { izq: { tipo: 'escudo_cometa', mat: 'cu_oro', mat2: 'cu_tela_blanca' } }, { bloqueo: 40 }),
  pieza('escudo_craneos', 'Escudo de cráneos', 'Shield of Skulls', 'izq', 'escudo', 2, 49, [2, 2], [100, 140], {}, 3, { izq: { tipo: 'escudo_calavera', mat: 'cu_hueso', mat2: 'cu_ectoplasma' } }, { bloqueo: 32, clase: 'nigromante' }),
  pieza('orbe_cuarzo', 'Orbe de cuarzo', 'Quartz Orb', 'izq', 'orbe', 0, 4, [1, 2], undefined, {}, 1, { izq: { tipo: 'orbe', mat: 'cristal' } }, { clase: 'arcanista' }),
  pieza('orbe_tormenta', 'Orbe de tormenta', 'Storm Orb', 'izq', 'orbe', 1, 26, [1, 2], undefined, {}, 2, { izq: { tipo: 'orbe', mat: 'magia' } }, { clase: 'arcanista' }),
  pieza('orbe_ascua', 'Orbe del ascua', 'Ember Orb', 'izq', 'orbe', 2, 49, [1, 2], undefined, {}, 3, { izq: { tipo: 'orbe', mat: 'fuego' } }, { clase: 'arcanista' }),
  pieza('cuaderno_formulas', 'Cuaderno de fórmulas', 'Formula Notebook', 'izq', 'libro', 0, 4, [2, 2], undefined, {}, 1, { izq: { tipo: 'libro', mat: 'cu_cuero' } }, { clase: 'alquimista' }),
  pieza('grimorio_destilacion', 'Grimorio de destilación', 'Grimoire of Distillation', 'izq', 'libro', 1, 26, [2, 2], undefined, {}, 2, { izq: { tipo: 'libro', mat: 'cu_cuero_negro', mat2: 'bronce' } }, { clase: 'alquimista' }),
  pieza('codice_transmutacion', 'Códice de la transmutación', 'Codex of Transmutation', 'izq', 'libro', 2, 49, [2, 2], undefined, {}, 3, { izq: { tipo: 'libro', mat: 'cu_tela_morada', mat2: 'cu_oro' } }, { clase: 'alquimista' }),

  // ---------------- guantes (2x2)
  pieza('guantes_cuero', 'Guantes de cuero', 'Leather Gloves', 'manos', 'guantes', 0, 2, [2, 2], [2, 5], {}, 0, { manos: { tipo: 'guantes', mat: 'cu_cuero' } }),
  pieza('vendas_pugil', 'Vendas de púgil', 'Brawler\'s Wraps', 'manos', 'guantes', 0, 9, [2, 2], [4, 8], {}, 0, { manos: { tipo: 'vendas', mat: 'cu_venda' } }),
  pieza('guanteletes_malla', 'Guanteletes de malla', 'Mail Gauntlets', 'manos', 'guantes', 1, 27, [2, 2], [22, 34], { fue: 60 }, 0, { manos: { tipo: 'guanteletes', mat: 'cu_malla' } }),
  pieza('brazales_grabados', 'Brazales grabados', 'Etched Bracers', 'manos', 'guantes', 1, 23, [2, 2], [18, 28], { fue: 35 }, 0, { manos: { tipo: 'brazales', mat: 'bronce' } }),
  pieza('guanteletes_verdugo', 'Guanteletes del verdugo', 'Headsman\'s Gauntlets', 'manos', 'guantes', 2, 52, [2, 2], [50, 70], { fue: 110 }, 0, { manos: { tipo: 'guanteletes', mat: 'cu_placa_oscura' } }),
  pieza('brazales_hueso', 'Brazales de hueso', 'Bone Bracers', 'manos', 'guantes', 2, 46, [2, 2], [42, 60], { fue: 50 }, 0, { manos: { tipo: 'brazales', mat: 'cu_hueso' } }),

  // ---------------- botas (2x2)
  pieza('botas_cuero', 'Botas de cuero', 'Leather Boots', 'pies', 'botas', 0, 2, [2, 2], [2, 5], {}, 0, { pies: { tipo: 'botas', mat: 'cu_cuero' } }),
  pieza('sandalias_peregrino', 'Sandalias de peregrino', 'Pilgrim Sandals', 'pies', 'botas', 0, 8, [2, 2], [3, 7], {}, 0, { pies: { tipo: 'sandalias', mat: 'cu_cuero' } }),
  pieza('botas_montar', 'Botas altas de montar', 'Tall Riding Boots', 'pies', 'botas', 1, 24, [2, 2], [18, 30], { fue: 35 }, 0, { pies: { tipo: 'botas_altas', mat: 'cu_cuero_negro' } }),
  pieza('sabatones_malla', 'Sabatones de malla', 'Mail Sabatons', 'pies', 'botas', 1, 29, [2, 2], [24, 36], { fue: 60 }, 0, { pies: { tipo: 'sabatones', mat: 'cu_malla' } }),
  pieza('sabatones_obsidiana', 'Sabatones de obsidiana', 'Obsidian Sabatons', 'pies', 'botas', 2, 53, [2, 2], [50, 72], { fue: 110 }, 0, { pies: { tipo: 'sabatones', mat: 'cu_placa_oscura' } }),
  pieza('botas_piel_wyrm', 'Botas de piel de sierpe', 'Serpent-Hide Boots', 'pies', 'botas', 2, 45, [2, 2], [40, 58], { fue: 50 }, 0, { pies: { tipo: 'botas_altas', mat: 'cu_escama' } }),

  // ---------------- cinturones (2x1)
  pieza('faja_tela', 'Faja de tela', 'Cloth Sash', 'cinturon', 'cinturon', 0, 2, [2, 1], [2, 4], {}, 0, { cinturon: { mat: 'cu_tela_parda' } }),
  pieza('cinturon_cuero', 'Cinturón de cuero', 'Leather Belt', 'cinturon', 'cinturon', 0, 8, [2, 1], [3, 7], {}, 0, { cinturon: { mat: 'cu_cuero', hebilla: 'hierro' } }),
  pieza('cinturon_malla', 'Cinturón de malla', 'Mail Belt', 'cinturon', 'cinturon', 1, 27, [2, 1], [18, 28], { fue: 45 }, 0, { cinturon: { mat: 'cu_malla', hebilla: 'acero' } }),
  pieza('tahali_cazador', 'Tahalí de cazador', 'Hunter\'s Baldric', 'cinturon', 'cinturon', 1, 23, [2, 1], [14, 22], {}, 0, { cinturon: { mat: 'cu_cuero_negro', hebilla: 'bronce' } }),
  pieza('cenidor_placas', 'Ceñidor de placas', 'Plated Girdle', 'cinturon', 'cinturon', 2, 52, [2, 1], [42, 60], { fue: 100 }, 0, { cinturon: { mat: 'cu_placa_oscura', hebilla: 'cu_oro' } }),
  pieza('cinto_verdugo', 'Cinto del verdugo', 'Headsman\'s Cinch', 'cinturon', 'cinturon', 2, 45, [2, 1], [35, 50], { fue: 60 }, 0, { cinturon: { mat: 'cu_cuero_negro', hebilla: 'cu_hueso' } }),

  // ---------------- joyas (1x1)
  pieza('anillo', 'Anillo', 'Ring', 'anillo', 'anillo', 0, 1, [1, 1], undefined, {}, 0, {}),
  pieza('amuleto', 'Amuleto', 'Amulet', 'amuleto', 'amuleto', 0, 1, [1, 1], undefined, {}, 0, {}),
];

// ------------------------------------------------------------------ afijos
// El juego compone en español "<Base> <prefijo> <sufijo>" (Espada larga Ardiente del Lobo)
// y en inglés "<prefix> <Base> <suffix>" (Burning Long Sword of the Wolf).
// Los prefijos en español son adjetivos invariables o frases con "de".
const ARMAD = ['armadura', 'casco', 'escudo', 'guantes', 'botas', 'cinturon'];
const JOYAS = ['anillo', 'amuleto'];

function af(
  tipo: 'prefijo' | 'sufijo', id: string, es: string, en: string, nivel: number, grupo: string,
  donde: string[], stats: RangoStat[], peso: number, vivo?: Afijo['vivo'],
): Afijo {
  const a: Afijo = { id, nombre: [es, en], tipo, nivel, grupo, donde, stats, peso };
  if (vivo) a.vivo = vivo;
  return a;
}
const pre = (...a: Parameters<typeof af> extends [unknown, ...infer R] ? R : never) => af('prefijo', ...a);
const suf = (...a: Parameters<typeof af> extends [unknown, ...infer R] ? R : never) => af('sufijo', ...a);

export const PREFIJOS: Afijo[] = [
  // daño mejorado
  pre('feroz', 'Feroz', 'Fierce', 1, 'dano_pct', ['arma'], [r('dano_pct', 10, 20)], 100),
  pre('cruel', 'Cruel', 'Cruel', 12, 'dano_pct', ['arma'], [r('dano_pct', 21, 40)], 80),
  pre('brutal', 'Brutal', 'Brutal', 25, 'dano_pct', ['arma'], [r('dano_pct', 41, 65)], 55),
  pre('implacable', 'Implacable', 'Relentless', 40, 'dano_pct', ['arma'], [r('dano_pct', 66, 100)], 30),
  pre('atroz', 'Atroz', 'Atrocious', 56, 'dano_pct', ['arma'], [r('dano_pct', 101, 140), r('precision', 20, 60)], 12),
  // daño plano
  pre('mordaz', 'Mordaz', 'Mordant', 5, 'dano_plano', ['arma', 'guantes', 'anillo'], [r('dano_max', 2, 5)], 60),
  pre('feral', 'Feral', 'Feral', 22, 'dano_plano', ['arma', 'guantes', 'anillo', 'amuleto'], [r('dano_min', 1, 4), r('dano_max', 5, 12)], 35),
  // defensa
  pre('firme', 'Firme', 'Sturdy', 1, 'def_pct', ARMAD, [r('def_pct', 10, 20)], 100),
  pre('fuerte', 'Fuerte', 'Strong', 14, 'def_pct', ARMAD, [r('def_pct', 21, 35)], 75),
  pre('inquebrantable', 'Inquebrantable', 'Unyielding', 30, 'def_pct', ARMAD, [r('def_pct', 36, 60)], 45),
  pre('indomable', 'Indomable', 'Indomitable', 48, 'def_pct', ARMAD, [r('def_pct', 61, 90)], 20),
  pre('impenetrable', 'Impenetrable', 'Impenetrable', 8, 'def_plana', ARMAD, [r('def', 10, 30)], 60),
  pre('infranqueable', 'Infranqueable', 'Unassailable', 35, 'def_plana', ARMAD, [r('def', 31, 80)], 30),
  // precisión
  pre('infalible', 'Infalible', 'Unerring', 3, 'precision', ['arma', 'guantes', ...JOYAS], [r('precision', 10, 40)], 80),
  pre('vigilante', 'Vigilante', 'Watchful', 20, 'precision', ['arma', 'guantes', ...JOYAS], [r('precision', 41, 100)], 50),
  pre('clarividente', 'Clarividente', 'Clairvoyant', 42, 'precision', ['arma', 'guantes', ...JOYAS], [r('precision', 101, 200), r('dano_pct', 10, 20)], 20),
  // maná
  pre('lunar', 'Lunar', 'Lunar', 1, 'mana', ['casco', 'orbe', 'libro', 'varita', 'baculo', 'cetro', ...JOYAS], [r('mana', 5, 12)], 90),
  pre('astral', 'Astral', 'Astral', 14, 'mana', ['casco', 'orbe', 'libro', 'varita', 'baculo', 'cetro', ...JOYAS], [r('mana', 13, 25)], 60),
  pre('estelar', 'Estelar', 'Stellar', 30, 'mana', ['casco', 'orbe', 'libro', 'varita', 'baculo', 'cetro', ...JOYAS], [r('mana', 26, 45)], 30),
  // resistencias
  pre('incombustible', 'Incombustible', 'Fireproof', 4, 'res_fuego', [...ARMAD, ...JOYAS], [r('res_fuego', 5, 15)], 70),
  pre('de_salamandra', 'de Salamandra', 'Salamander', 26, 'res_fuego', [...ARMAD, ...JOYAS], [r('res_fuego', 16, 30)], 40),
  pre('polar', 'Polar', 'Polar', 4, 'res_frio', [...ARMAD, ...JOYAS], [r('res_frio', 5, 15)], 70),
  pre('boreal', 'Boreal', 'Boreal', 26, 'res_frio', [...ARMAD, ...JOYAS], [r('res_frio', 16, 30)], 40),
  pre('aislante', 'Aislante', 'Grounded', 4, 'res_rayo', [...ARMAD, ...JOYAS], [r('res_rayo', 5, 15)], 70),
  pre('inerte', 'Inerte', 'Inert', 26, 'res_rayo', [...ARMAD, ...JOYAS], [r('res_rayo', 16, 30)], 40),
  pre('esmeralda', 'Esmeralda', 'Emerald', 4, 'res_veneno', [...ARMAD, ...JOYAS], [r('res_veneno', 5, 15)], 70),
  pre('incorruptible', 'Incorruptible', 'Incorruptible', 26, 'res_veneno', [...ARMAD, ...JOYAS], [r('res_veneno', 16, 30)], 40),
  pre('solar', 'Solar', 'Solar', 10, 'res_sombra', [...ARMAD, ...JOYAS], [r('res_sombra', 5, 15)], 55),
  pre('radiante', 'Radiante', 'Radiant', 32, 'res_sombra', [...ARMAD, ...JOYAS], [r('res_sombra', 16, 30)], 30),
  pre('iridiscente', 'Iridiscente', 'Iridescent', 12, 'res_todo', ['escudo', 'armadura', ...JOYAS], [r('res_todo', 3, 8)], 40),
  pre('inviolable', 'Inviolable', 'Inviolable', 32, 'res_todo', ['escudo', 'armadura', ...JOYAS], [r('res_todo', 9, 15)], 22),
  pre('perenne', 'Perenne', 'Everlasting', 52, 'res_todo', ['escudo', 'armadura', ...JOYAS], [r('res_todo', 16, 25)], 10),
  // hallazgo, habilidades, bloqueo
  pre('rapaz', 'Rapaz', 'Rapacious', 8, 'hallazgo_pre', ['casco', 'guantes', 'botas', ...JOYAS], [r('hallazgo', 10, 25)], 45),
  pre('voraz', 'Voraz', 'Ravenous', 30, 'hallazgo_pre', ['casco', 'guantes', 'botas', ...JOYAS], [r('hallazgo', 26, 45)], 20),
  pre('insigne', 'Insigne', 'Illustrious', 25, 'mas_clase', ['amuleto', 'casco', 'orbe', 'libro'], [r('mas_clase', 1)], 25),
  pre('eminente', 'Eminente', 'Eminent', 45, 'mas_habilidades', ['amuleto', 'orbe', 'baculo', 'cetro', 'varita'], [r('mas_habilidades', 1)], 10),
  pre('alerta', 'Alerta', 'Alert', 6, 'bloqueo', ['escudo'], [r('bloqueo', 10, 20)], 60),
  pre('imperturbable', 'Imperturbable', 'Unflinching', 30, 'bloqueo', ['escudo'], [r('bloqueo', 21, 30), r('def_pct', 10, 20)], 30),

  // armas vivas
  pre('ardiente', 'Ardiente', 'Burning', 5, 'vivo', ['arma'], [r('dano_fuego', 3, 8)], 40, 'fuego'),
  pre('incandescente', 'Incandescente', 'Incandescent', 22, 'vivo', ['arma'], [r('dano_fuego', 9, 20)], 25, 'fuego'),
  pre('calcinante', 'Calcinante', 'Scorching', 42, 'vivo', ['arma'], [r('dano_fuego', 21, 45), r('res_fuego', 5, 10)], 12, 'fuego'),
  pre('invernal', 'Invernal', 'Wintry', 5, 'vivo', ['arma'], [r('dano_frio', 3, 7), r('ralentizar', 5, 10)], 40, 'frio'),
  pre('glacial', 'Glacial', 'Glacial', 22, 'vivo', ['arma'], [r('dano_frio', 8, 18), r('ralentizar', 10, 15)], 25, 'frio'),
  pre('hiemal', 'Hiemal', 'Hibernal', 42, 'vivo', ['arma'], [r('dano_frio', 19, 40), r('ralentizar', 15, 25)], 12, 'frio'),
  pre('chispeante', 'Chispeante', 'Sparking', 5, 'vivo', ['arma'], [r('dano_rayo', 3, 9)], 40, 'rayo'),
  pre('fulminante', 'Fulminante', 'Fulminating', 22, 'vivo', ['arma'], [r('dano_rayo', 10, 22)], 25, 'rayo'),
  pre('tonante', 'Tonante', 'Thundering', 42, 'vivo', ['arma'], [r('dano_rayo', 23, 50), r('aturdir', 5, 10)], 12, 'rayo'),
  pre('pestilente', 'Pestilente', 'Pestilent', 5, 'vivo', ['arma'], [r('dano_veneno', 5, 12)], 40, 'veneno'),
  pre('supurante', 'Supurante', 'Festering', 22, 'vivo', ['arma'], [r('dano_veneno', 13, 30)], 25, 'veneno'),
  pre('de_plaga', 'de Plaga', 'Plagued', 42, 'vivo', ['arma'], [r('dano_veneno', 31, 65), r('res_veneno', 5, 10)], 12, 'veneno'),
  pre('crepuscular', 'Crepuscular', 'Twilit', 8, 'vivo', ['arma'], [r('dano_sombra', 3, 8)], 35, 'sombra'),
  pre('abismal', 'Abismal', 'Abyssal', 26, 'vivo', ['arma'], [r('dano_sombra', 9, 20), r('robo_mana', 1, 3)], 22, 'sombra'),
  pre('de_eclipse', 'de Eclipse', 'Eclipsed', 46, 'vivo', ['arma'], [r('dano_sombra', 21, 45), r('robo_mana', 2, 4)], 10, 'sombra'),
  pre('luciente', 'Luciente', 'Gleaming', 8, 'vivo', ['arma'], [r('dano_luz', 3, 8), r('radio_luz', 1)], 35, 'luz'),
  pre('fulgente', 'Fulgente', 'Effulgent', 26, 'vivo', ['arma'], [r('dano_luz', 9, 20), r('radio_luz', 2)], 22, 'luz'),
  pre('celestial', 'Celestial', 'Celestial', 46, 'vivo', ['arma'], [r('dano_luz', 21, 45), r('radio_luz', 3), r('res_sombra', 5, 10)], 10, 'luz'),
  pre('sangrante', 'Sangrante', 'Bleeding', 6, 'vivo', ['arma'], [r('dano_sangre', 3, 8), r('herida_abierta', 5, 10)], 35, 'sangre'),
  pre('carmesi', 'Carmesí', 'Crimson', 24, 'vivo', ['arma'], [r('dano_sangre', 9, 20), r('herida_abierta', 10, 20)], 22, 'sangre'),
  pre('de_matanza', 'de Matanza', 'Slaughtering', 44, 'vivo', ['arma'], [r('dano_sangre', 21, 45), r('herida_abierta', 20, 30), r('robo_vida', 2, 4)], 10, 'sangre'),
];

export const SUFIJOS: Afijo[] = [
  // atributos
  suf('del_jabali', 'del Jabalí', 'of the Boar', 1, 'fue', ['todas'], [r('fue', 1, 5)], 90),
  suf('del_oso', 'del Oso', 'of the Bear', 15, 'fue', ['todas'], [r('fue', 6, 10)], 60),
  suf('del_gigante', 'del Gigante', 'of the Giant', 35, 'fue', ['todas'], [r('fue', 11, 20)], 25),
  suf('de_la_liebre', 'de la Liebre', 'of the Hare', 1, 'des', ['todas'], [r('des', 1, 5)], 90),
  suf('del_halcon', 'del Halcón', 'of the Falcon', 15, 'des', ['todas'], [r('des', 6, 10)], 60),
  suf('de_la_pantera', 'de la Pantera', 'of the Panther', 35, 'des', ['todas'], [r('des', 11, 20)], 25),
  suf('del_roble', 'del Roble', 'of the Oak', 1, 'vit', ['todas'], [r('vit', 1, 5)], 90),
  suf('de_la_montana', 'de la Montaña', 'of the Mountain', 15, 'vit', ['todas'], [r('vit', 6, 10)], 60),
  suf('del_coloso', 'del Coloso', 'of the Colossus', 35, 'vit', ['todas'], [r('vit', 11, 20)], 25),
  suf('del_novicio', 'del Novicio', 'of the Novice', 1, 'ene', ['todas'], [r('ene', 1, 5)], 90),
  suf('del_erudito', 'del Erudito', 'of the Scholar', 15, 'ene', ['todas'], [r('ene', 6, 10)], 60),
  suf('del_oraculo', 'del Oráculo', 'of the Oracle', 35, 'ene', ['todas'], [r('ene', 11, 20)], 25),
  suf('de_la_corona', 'de la Corona', 'of the Crown', 20, 'todos_atributos', ['casco', 'armadura', ...JOYAS], [r('todos_atributos', 1, 3)], 20),
  suf('del_ascua', 'del Ascua', 'of the Ember', 48, 'todos_atributos', ['casco', 'armadura', ...JOYAS], [r('todos_atributos', 4, 8)], 6),
  // vida
  suf('del_lobo', 'del Lobo', 'of the Wolf', 1, 'vida', [...ARMAD, ...JOYAS], [r('vida', 5, 15)], 100),
  suf('de_la_vigilia', 'de la Vigilia', 'of the Vigil', 14, 'vida', [...ARMAD, ...JOYAS], [r('vida', 16, 30)], 70),
  suf('de_la_abadia', 'de la Abadía', 'of the Abbey', 30, 'vida', [...ARMAD, ...JOYAS], [r('vida', 31, 50)], 40),
  suf('de_la_eternidad', 'de la Eternidad', 'of Eternity', 50, 'vida', ['armadura', 'escudo', 'cinturon', 'amuleto'], [r('vida', 51, 80)], 15),
  // robo
  suf('de_la_sanguijuela', 'de la Sanguijuela', 'of the Leech', 6, 'robo_vida', ['arma', 'guantes', 'anillo'], [r('robo_vida', 2, 4)], 50),
  suf('del_murcielago', 'del Murciélago', 'of the Bat', 28, 'robo_vida', ['arma', 'guantes', 'anillo'], [r('robo_vida', 5, 8)], 25),
  suf('de_la_polilla', 'de la Polilla', 'of the Moth', 6, 'robo_mana', ['arma', 'guantes', 'anillo'], [r('robo_mana', 2, 4)], 50),
  suf('del_espectro', 'del Espectro', 'of the Wraith', 28, 'robo_mana', ['arma', 'guantes', 'anillo'], [r('robo_mana', 5, 8)], 25),
  // velocidades
  suf('de_la_prisa', 'de la Prisa', 'of Haste', 8, 'vel_ataque', ['arma', 'guantes'], [r('vel_ataque', 10)], 55),
  suf('del_torbellino', 'del Torbellino', 'of the Whirlwind', 30, 'vel_ataque', ['arma', 'guantes'], [r('vel_ataque', 20)], 25),
  suf('del_conjuro', 'del Conjuro', 'of Incantation', 10, 'vel_lanzar', ['orbe', 'libro', 'varita', 'baculo', 'cetro', 'anillo', 'amuleto'], [r('vel_lanzar', 10)], 50),
  suf('de_la_hechiceria', 'de la Hechicería', 'of Sorcery', 30, 'vel_lanzar', ['orbe', 'libro', 'varita', 'baculo', 'cetro', 'amuleto'], [r('vel_lanzar', 20)], 22),
  suf('del_viajero', 'del Viajero', 'of the Traveler', 4, 'vel_mover', ['botas'], [r('vel_mover', 10)], 70),
  suf('del_peregrino', 'del Peregrino', 'of the Pilgrim', 20, 'vel_mover', ['botas'], [r('vel_mover', 20)], 40),
  suf('del_viento', 'del Viento', 'of the Wind', 40, 'vel_mover', ['botas'], [r('vel_mover', 30)], 15),
  suf('del_equilibrio', 'del Equilibrio', 'of Balance', 8, 'vel_recuperar', ['armadura', 'cinturon', 'amuleto'], [r('vel_recuperar', 10, 20)], 50),
  // golpes
  suf('del_verdugo', 'del Verdugo', 'of the Headsman', 12, 'critico', ['arma', 'guantes'], [r('critico', 3, 6)], 45),
  suf('de_la_muerte_subita', 'de la Muerte Súbita', 'of Sudden Death', 38, 'critico', ['arma'], [r('critico', 7, 12)], 18),
  suf('del_aplastamiento', 'del Aplastamiento', 'of Crushing', 18, 'golpe_aplastante', ['maza', 'martillo', 'mangual', 'hacha', 'hacha_doble'], [r('golpe_aplastante', 5, 15)], 35),
  suf('de_la_desgarradura', 'de la Desgarradura', 'of Rending', 10, 'herida_abierta', ['arma'], [r('herida_abierta', 5, 15)], 40),
  suf('de_la_escarcha', 'de la Escarcha', 'of Frost', 10, 'ralentizar', ['arma', 'botas'], [r('ralentizar', 5, 15)], 40),
  suf('del_trueno', 'del Trueno', 'of Thunder', 16, 'aturdir', ['arma', 'escudo'], [r('aturdir', 5, 15)], 35),
  suf('de_la_saeta', 'de la Saeta', 'of the Arrow', 12, 'perforar', ['arco', 'ballesta', 'lanza'], [r('perforar', 10, 25)], 40),
  // regeneración
  suf('de_la_sanacion', 'de la Sanación', 'of Mending', 6, 'regen_vida', [...ARMAD, ...JOYAS], [r('regen_vida', 1, 3)], 55),
  suf('del_rebrote', 'del Rebrote', 'of Regrowth', 32, 'regen_vida', [...ARMAD, ...JOYAS], [r('regen_vida', 4, 8)], 20),
  suf('de_la_meditacion', 'de la Meditación', 'of Meditation', 6, 'regen_mana', ['casco', 'orbe', 'libro', 'escudo', ...JOYAS], [r('regen_mana', 15, 30)], 55),
  suf('del_manantial', 'del Manantial', 'of the Wellspring', 32, 'regen_mana', ['casco', 'orbe', 'libro', 'escudo', ...JOYAS], [r('regen_mana', 31, 60)], 20),
  suf('del_carronero', 'del Carroñero', 'of the Scavenger', 10, 'vida_por_muerte', ['arma', 'guantes', 'anillo'], [r('vida_por_muerte', 2, 5)], 35),
  suf('del_alma_cosechada', 'del Alma Cosechada', 'of the Harvested Soul', 10, 'mana_por_muerte', ['arma', 'casco', 'anillo'], [r('mana_por_muerte', 2, 5)], 35),
  // defensa
  suf('de_la_muralla', 'de la Muralla', 'of the Rampart', 16, 'reduc_dano', ['armadura', 'escudo', 'cinturon'], [r('reduc_dano', 3, 6)], 35),
  suf('del_bastion', 'del Bastión', 'of the Bastion', 42, 'reduc_dano', ['armadura', 'escudo'], [r('reduc_dano', 7, 12)], 15),
  suf('de_las_espinas', 'de las Espinas', 'of Thorns', 4, 'espinas', ['armadura', 'escudo'], [r('espinas', 3, 8)], 50),
  suf('del_cardo', 'del Cardo', 'of the Thistle', 26, 'espinas', ['armadura', 'escudo'], [r('espinas', 9, 20)], 25),
  // fortuna y luz
  suf('de_la_fortuna', 'de la Fortuna', 'of Fortune', 6, 'hallazgo', ['casco', 'guantes', 'botas', ...JOYAS], [r('hallazgo', 5, 15)], 50),
  suf('del_saqueador', 'del Saqueador', 'of the Plunderer', 30, 'hallazgo', ['casco', 'guantes', 'botas', ...JOYAS], [r('hallazgo', 16, 30)], 20),
  suf('de_la_avaricia', 'de la Avaricia', 'of Greed', 4, 'oro_extra', ['todas'], [r('oro_extra', 20, 40)], 50),
  suf('del_rey_mercader', 'del Rey Mercader', 'of the Merchant King', 28, 'oro_extra', ['todas'], [r('oro_extra', 41, 80)], 20),
  suf('de_la_vela', 'de la Vela', 'of the Candle', 1, 'radio_luz', ['casco', 'arma', ...JOYAS], [r('radio_luz', 1, 2)], 50),
  suf('del_faro', 'del Faro', 'of the Beacon', 20, 'radio_luz', ['casco', 'arma', ...JOYAS], [r('radio_luz', 3, 4)], 25),
  // varios
  suf('de_los_siglos', 'de los Siglos', 'of the Ages', 30, 'durabilidad', ['arma', ...ARMAD], [r('durabilidad_infinita', 1)], 12),
  suf('de_la_ligereza', 'de la Ligereza', 'of Lightness', 12, 'reduc_req', ['arma', ...ARMAD], [r('reduc_req', 10, 20)], 30),
];

// ------------------------------------------------------------------ únicos
export const UNICOS: Unico[] = [
  // armas vivas
  { id: 'llama_santa_oria', nombre: ['Llama de Santa Oria', 'Flame of Saint Oria'], base: 'hoja_vigilia', nivel: 10, vivo: 'fuego',
    stats: [r('dano_pct', 60, 80), r('dano_fuego', 6, 12), r('res_fuego', 15), r('radio_luz', 2)],
    lore: ['Ardió en el altar mayor la noche en que cayó el Ascua. Nadie pudo apagarla.', 'It burned on the high altar the night the Ember fell. No one could put it out.'] },
  { id: 'susurro_osario', nombre: ['Susurro del Osario', 'Ossuary Whisper'], base: 'varita_osario', nivel: 9, vivo: 'sombra',
    stats: [r('mas_clase', 1), r('dano_sombra', 4, 8), r('mana', 15, 25), r('vel_lanzar', 10)],
    lore: ['Los huesos de la cripta hablan entre sí. Esta varita aprendió a escucharlos.', 'The crypt bones speak among themselves. This wand learned to listen.'] },
  { id: 'gemelas_cienaga', nombre: ['Gemelas de la Ciénaga', 'Mire Twins'], base: 'daga_misericordia', nivel: 24, vivo: 'veneno',
    stats: [r('dano_pct', 70, 100), r('dano_veneno', 15, 28), r('vel_ataque', 20), r('des', 8, 12)],
    lore: ['Forjadas en pareja. Cuando una hiere, la otra tiene sed.', 'Forged as a pair. When one wounds, the other thirsts.'] },
  { id: 'ultima_campana', nombre: ['Última Campana', 'Last Bell'], base: 'maza_abad', nivel: 28, vivo: 'luz',
    stats: [r('dano_pct', 90, 130), r('dano_luz', 12, 22), r('aturdir', 15), r('res_sombra', 20), r('radio_luz', 3)],
    lore: ['Fundida con el bronce del campanario de la abadía. Aún dobla por los muertos.', 'Cast from the abbey belfry bronze. It still tolls for the dead.'] },
  { id: 'mordisco_invierno', nombre: ['Mordisco del Invierno', 'Winter\'s Bite'], base: 'hacha_norte', nivel: 30, vivo: 'frio',
    stats: [r('dano_pct', 100, 140), r('dano_frio', 14, 24), r('ralentizar', 25), r('res_frio', 25), r('vit', 10)],
    lore: ['Bajó de Hrimgard en manos de un muerto que aún caminaba.', 'It came down from Hrimgard in the hands of a dead man who still walked.'] },
  { id: 'lengua_tormenta', nombre: ['Lengua de Tormenta', 'Storm Tongue'], base: 'pica_guardia', nivel: 32, vivo: 'rayo',
    stats: [r('dano_pct', 100, 150), r('dano_rayo', 16, 34), r('perforar', 25), r('vel_ataque', 20), r('res_rayo', 20)],
    lore: ['Un rayo la partió en dos y la volvió a unir. Desde entonces no deja de zumbar.', 'Lightning split it in two and joined it again. It has hummed ever since.'] },
  { id: 'carnicera_velmora', nombre: ['Carnicera de Velmora', 'Butcher of Velmora'], base: 'gran_hacha_cadalso', nivel: 34, vivo: 'sangre',
    stats: [r('dano_pct', 140, 190), r('dano_sangre', 18, 30), r('herida_abierta', 35), r('robo_vida', 6, 9), r('golpe_aplastante', 15)],
    lore: ['El verdugo del valle la afilaba cada amanecer. Una mañana no volvió a casa.', 'The valley headsman honed it every dawn. One morning he did not come home.'] },
  { id: 'tormenta_cautiva', nombre: ['Tormenta Cautiva', 'Captive Storm'], base: 'ballesta_asedio', nivel: 36, vivo: 'rayo',
    stats: [r('dano_pct', 110, 150), r('dano_rayo', 20, 40), r('perforar', 30), r('aturdir', 10), r('des', 15)],
    lore: ['En su cureña duerme un trueno que alguien encerró en el desierto de Sahrim.', 'In its stock sleeps a thunderclap someone caged in the Sahrim desert.'] },
  { id: 'colmillo_yhuantl', nombre: ['Colmillo de Yhuantl', 'Fang of Yhuantl'], base: 'colmillo_sombra', nivel: 46, vivo: 'veneno',
    stats: [r('dano_pct', 150, 200), r('dano_veneno', 35, 60), r('critico', 10), r('vel_ataque', 30), r('res_veneno', 30)],
    lore: ['Arrancado a la serpiente que los sacerdotes de la selva llamaban madre.', 'Torn from the serpent the jungle priests called mother.'] },
  { id: 'sol_de_sahrim', nombre: ['Sol de Sahrim', 'Sun of Sahrim'], base: 'hoz_rey_dormido', nivel: 50, vivo: 'fuego',
    stats: [r('dano_pct', 160, 210), r('dano_fuego', 30, 55), r('res_fuego', 30), r('des', 15, 20), r('vel_ataque', 20)],
    lore: ['Los reyes de Sahrim se hicieron enterrar con el sol. Este es el pedazo que robaron.', 'The kings of Sahrim had themselves buried with the sun. This is the piece they stole.'] },
  { id: 'aliento_hrimgard', nombre: ['Aliento de Hrimgard', 'Breath of Hrimgard'], base: 'hacha_escarcha_negra', nivel: 52, vivo: 'frio',
    stats: [r('dano_pct', 170, 220), r('dano_frio', 30, 55), r('ralentizar', 35), r('res_frio', 40), r('fue', 15, 20)],
    lore: ['Las cumbres exhalan una vez cada cien años. El herrero que la forjó contuvo ese aliento.', 'The peaks exhale once every hundred years. The smith who forged it held that breath.'] },
  { id: 'siega_ocaso', nombre: ['Siega del Ocaso', 'Dusksheaf'], base: 'guadana_ocaso', nivel: 57, vivo: 'sombra', legendario: true,
    stats: [r('dano_pct', 220, 290), r('dano_sombra', 45, 80), r('robo_vida', 8, 12), r('robo_mana', 5, 8), r('mas_habilidades', 1), r('vel_ataque', 20)],
    lore: ['Cuando el sol se pone sobre Velmora, alguien en algún lugar deja de respirar.', 'When the sun sets over Velmora, someone somewhere stops breathing.'] },
  { id: 'brasa_caida', nombre: ['Brasa Caída', 'Fallen Ember'], base: 'baculo_astro_caido', nivel: 60, vivo: 'fuego', legendario: true,
    stats: [r('mas_habilidades', 2, 3), r('dano_fuego', 40, 70), r('vel_lanzar', 30), r('mana', 60, 90), r('res_fuego', 40)],
    lore: ['Una astilla del Ascua quedó prendida en la madera. Aún recuerda el cielo del que cayó.', 'A splinter of the Ember caught in the wood. It still remembers the sky it fell from.'] },
  { id: 'la_que_bebe', nombre: ['La Que Bebe', 'She Who Drinks'], base: 'hoja_ceniza_negra', nivel: 62, vivo: 'sangre', legendario: true,
    stats: [r('dano_pct', 230, 300), r('dano_sangre', 45, 80), r('robo_vida', 10, 15), r('herida_abierta', 50), r('vida_por_muerte', 10, 15), r('critico', 10)],
    lore: ['Nació en la Herida. Pide sangre en una lengua que nadie vivo habla.', 'It was born in the Wound. It asks for blood in a tongue no living man speaks.'] },
  { id: 'juicio_piedra', nombre: ['Juicio de Piedra', 'Stone Judgement'], base: 'martillo_juicio', nivel: 64, vivo: 'luz', legendario: true,
    stats: [r('dano_pct', 240, 320), r('dano_luz', 50, 90), r('golpe_aplastante', 35), r('aturdir', 25), r('res_todo', 20), r('fue', 20, 30)],
    lore: ['Los monjes de Santa Oria lo guardaron bajo el altar para el día del último juicio. Ese día llegó.', 'The monks of Saint Oria kept it beneath the altar for the day of last judgement. That day has come.'] },
  // otras armas
  { id: 'rama_ahorcado', nombre: ['Rama del Ahorcado', 'Hanged Man\'s Bough'], base: 'arco_corto', nivel: 5,
    stats: [r('dano_pct', 40, 60), r('des', 5), r('herida_abierta', 15), r('vel_ataque', 10)],
    lore: ['Tallado del árbol del cruce de caminos. La cuerda todavía cruje.', 'Carved from the crossroads tree. The string still creaks.'] },
  { id: 'mangual_procesion', nombre: ['Mangual de la Procesión', 'Procession Flail'], base: 'mangual_trilla', nivel: 12,
    stats: [r('dano_pct', 50, 70), r('dano_max', 4, 8), r('regen_vida', 2), r('espinas', 5)],
    lore: ['Los penitentes se azotaban con él al pasar frente a la abadía.', 'The penitents scourged themselves with it as they passed the abbey.'] },
  { id: 'cetro_abad_perdido', nombre: ['Cetro del Abad Perdido', 'Lost Abbot\'s Sceptre'], base: 'cetro_prior', nivel: 26,
    stats: [r('mas_habilidades', 1), r('dano_pct', 60, 90), r('mana', 25, 40), r('res_sombra', 25), r('regen_mana', 30)],
    lore: ['El abad bajó a las catacumbas con él en la mano. Solo el cetro volvió a subir.', 'The abbot went down into the catacombs with it in hand. Only the sceptre came back up.'] },
  { id: 'garra_monje_mudo', nombre: ['Garra del Monje Mudo', 'Mute Monk\'s Claw'], base: 'garras_tigre', nivel: 27,
    stats: [r('mas_clase', 2), r('dano_pct', 80, 110), r('vel_ataque', 20), r('critico', 6), r('des', 10)],
    lore: ['Hizo voto de silencio. Sus enemigos también lo cumplen.', 'He took a vow of silence. His enemies keep it too.'] },
  { id: 'cuervo_blanco', nombre: ['Cuervo Blanco', 'White Raven'], base: 'arco_cuervo', nivel: 54,
    stats: [r('dano_pct', 170, 220), r('perforar', 35), r('des', 20, 25), r('vel_ataque', 20), r('hallazgo', 20)],
    lore: ['En Hrimgard dicen que un cuervo blanco anuncia una muerte justa.', 'In Hrimgard they say a white raven heralds a fitting death.'] },

  // armaduras
  { id: 'mortaja_velmora', nombre: ['Mortaja de Velmora', 'Shroud of Velmora'], base: 'camisa_acolchada', nivel: 4,
    stats: [r('def_pct', 50, 80), r('vida', 15), r('res_sombra', 10), r('radio_luz', -1)],
    lore: ['Tejida para un muerto que se levantó antes de que la cosieran.', 'Woven for a dead man who rose before it was sewn shut.'] },
  { id: 'piel_penitente', nombre: ['Piel del Penitente', 'Penitent\'s Hide'], base: 'jubon_cuero', nivel: 9,
    stats: [r('def_pct', 60, 90), r('espinas', 6), r('vit', 8), r('vel_recuperar', 10)],
    lore: ['Lleva bordados los pecados de quien la vistió. Ninguno fue perdonado.', 'Stitched with the sins of its wearer. None were forgiven.'] },
  { id: 'malla_ahogados', nombre: ['Malla de los Ahogados', 'Mail of the Drowned'], base: 'loriga_guardia', nivel: 30,
    stats: [r('def_pct', 100, 140), r('res_frio', 30), r('res_rayo', 30), r('vida', 30, 40), r('vel_mover', -5)],
    lore: ['La sacaron del lago del páramo. Todavía gotea.', 'They pulled it from the moor lake. It still drips.'] },
  { id: 'velo_viuda', nombre: ['Velo de la Viuda', 'Widow\'s Veil'], base: 'vestido_luto', nivel: 50,
    stats: [r('def_pct', 120, 160), r('mas_habilidades', 1), r('res_todo', 15), r('mana', 40, 60), r('robo_mana', 4)],
    lore: ['Lo vistió una reina de Sahrim mientras enterraban vivo a su esposo.', 'A queen of Sahrim wore it while they buried her husband alive.'] },
  { id: 'peso_corona', nombre: ['Peso de la Corona', 'Weight of the Crown'], base: 'armadura_ultimo_rey', nivel: 65, legendario: true,
    stats: [r('def_pct', 180, 240), r('todos_atributos', 10, 15), r('res_todo', 25), r('reduc_dano', 15), r('vida', 80, 120), r('vel_mover', -10)],
    lore: ['El último rey de Velmora murió de pie dentro de ella. La armadura nunca se arrodilló.', 'The last king of Velmora died standing inside it. The armor never knelt.'] },

  // cascos
  { id: 'capucha_sepulturero', nombre: ['Capucha del Sepulturero', 'Gravedigger\'s Hood'], base: 'capucha_lana', nivel: 3,
    stats: [r('def_pct', 40, 60), r('vida_por_muerte', 2), r('res_veneno', 15), r('hallazgo', 10)],
    lore: ['Cavó trescientas tumbas en el cementerio del páramo. La última era para él.', 'He dug three hundred graves in the moor cemetery. The last was his own.'] },
  { id: 'ojo_abadia', nombre: ['Ojo de la Abadía', 'Eye of the Abbey'], base: 'yelmo_cerrado', nivel: 16,
    stats: [r('def_pct', 60, 90), r('precision', 50, 80), r('radio_luz', 3), r('res_sombra', 20)],
    lore: ['Por la rendija se ve lo que se arrastra bajo el claustro.', 'Through the slit you can see what crawls beneath the cloister.'] },
  { id: 'mascara_yhuantl', nombre: ['Máscara de Yhuantl', 'Mask of Yhuantl'], base: 'mascara_funeraria', nivel: 38,
    stats: [r('mas_habilidades', 1), r('def_pct', 80, 120), r('res_veneno', 35), r('vida', 25, 35), r('ene', 15)],
    lore: ['El rostro de oro de un dios menor de la selva. Detrás no hay nada.', 'The golden face of a lesser jungle god. There is nothing behind it.'] },
  { id: 'testa_rey_astado', nombre: ['Testa del Rey Astado', 'Antlered King\'s Brow'], base: 'testa_alce', nivel: 33,
    stats: [r('mas_clase', 2), r('def_pct', 80, 110), r('vida', 30, 45), r('regen_vida', 4), r('res_frio', 20)],
    lore: ['Los druidas del bosque viejo coronaban a un ciervo. Luego lo devoraban.', 'The old forest druids crowned a stag. Then they devoured it.'] },
  { id: 'corona_brasas_frias', nombre: ['Corona de Brasas Frías', 'Crown of Cold Embers'], base: 'corona_ascua', nivel: 61, legendario: true,
    stats: [r('mas_habilidades', 2), r('def_pct', 150, 200), r('res_fuego', 40), r('res_frio', 40), r('hallazgo', 30, 50), r('vida', 50, 70)],
    lore: ['Quien la lleva oye crepitar el Ascua bajo la abadía. A veces le responde.', 'Whoever wears it hears the Ember crackle beneath the abbey. Sometimes it answers.'] },

  // escudos y mano izquierda
  { id: 'ultima_guardia', nombre: ['La Última Guardia', 'The Last Watch'], base: 'escudo_cometa', nivel: 14,
    stats: [r('def_pct', 70, 100), r('bloqueo', 15), r('res_todo', 8), r('vit', 6)],
    lore: ['El escudo del último soldado que sostuvo el puente de Velmora.', 'The shield of the last soldier to hold the bridge of Velmora.'] },
  { id: 'paves_sahrim', nombre: ['Pavés de Sahrim', 'Sahrim Pavise'], base: 'paves', nivel: 35,
    stats: [r('def_pct', 120, 160), r('bloqueo', 20), r('res_fuego', 35), r('reduc_dano', 8), r('espinas', 15)],
    lore: ['Detrás de él cien guerreros esperaron una tormenta de arena que nunca terminó.', 'Behind it a hundred warriors waited out a sandstorm that never ended.'] },
  { id: 'craneo_que_canta', nombre: ['Cráneo que Canta', 'Singing Skull'], base: 'escudo_osario', nivel: 31,
    stats: [r('mas_clase', 2), r('def_pct', 80, 110), r('mana', 30, 40), r('vel_lanzar', 20), r('res_sombra', 20)],
    lore: ['De noche tararea una nana que ninguna madre del valle recuerda.', 'At night it hums a lullaby no mother in the valley remembers.'] },
  { id: 'egida_santa_oria', nombre: ['Égida de Santa Oria', 'Aegis of Saint Oria'], base: 'egida_alba', nivel: 57,
    stats: [r('def_pct', 160, 210), r('bloqueo', 25), r('res_todo', 25), r('dano_luz', 15, 25), r('regen_vida', 6)],
    lore: ['La santa la alzó contra la oscuridad que subía de las criptas. Murió sin bajarla.', 'The saint raised it against the dark rising from the crypts. She died without lowering it.'] },
  { id: 'ojo_tormenta', nombre: ['Ojo de la Tormenta', 'Eye of the Storm'], base: 'orbe_tormenta', nivel: 30,
    stats: [r('mas_clase', 2), r('dano_rayo', 10, 20), r('vel_lanzar', 20), r('mana', 35, 50), r('res_rayo', 25)],
    lore: ['Dentro del cristal el cielo nunca deja de romperse.', 'Inside the glass the sky never stops breaking.'] },
  { id: 'cenizas_dulces', nombre: ['Libro de las Cenizas Dulces', 'Book of Sweet Ashes'], base: 'grimorio_destilacion', nivel: 34,
    stats: [r('mas_clase', 2), r('dano_veneno', 18, 30), r('dano_fuego', 10, 18), r('regen_mana', 40), r('res_veneno', 30)],
    lore: ['Sus recetas convierten a los muertos en perfume. Nadie quiere saber cómo lo descubrieron.', 'Its recipes turn the dead into perfume. No one wants to know how that was learned.'] },

  // guantes, botas y cinturones
  { id: 'manos_hereje', nombre: ['Manos del Hereje', 'Heretic\'s Hands'], base: 'guantes_cuero', nivel: 7,
    stats: [r('def_pct', 40, 60), r('dano_fuego', 3, 5), r('vel_lanzar', 10), r('res_fuego', 10)],
    lore: ['Lo quemaron en la plaza. Los guantes no ardieron.', 'They burned him in the square. The gloves did not burn.'] },
  { id: 'punos_hrimgard', nombre: ['Puños de Hrimgard', 'Fists of Hrimgard'], base: 'guanteletes_verdugo', nivel: 53,
    stats: [r('def_pct', 120, 160), r('vel_ataque', 20), r('fue', 15, 20), r('dano_frio', 10, 20), r('golpe_aplastante', 10)],
    lore: ['El gigante de hielo que los llevaba rompía glaciares con las manos.', 'The frost giant who wore them broke glaciers with his bare hands.'] },
  { id: 'pasos_peregrino_ciego', nombre: ['Pasos del Peregrino Ciego', 'Blind Pilgrim\'s Steps'], base: 'sandalias_peregrino', nivel: 11,
    stats: [r('def_pct', 40, 70), r('vel_mover', 20), r('res_todo', 5), r('radio_luz', -2), r('hallazgo', 15)],
    lore: ['Caminó hasta la abadía sin ojos. Dicen que vio el Ascua caer.', 'He walked to the abbey with no eyes. They say he saw the Ember fall.'] },
  { id: 'huella_herida', nombre: ['Huella de la Herida', 'Wound Walkers'], base: 'sabatones_obsidiana', nivel: 62, legendario: true,
    stats: [r('def_pct', 150, 200), r('vel_mover', 30), r('res_fuego', 40), r('vida', 50, 70), r('espinas', 30), r('reduc_req', 20)],
    lore: ['Dejan marcas de brasa en la piedra. En la Herida, la piedra les teme.', 'They leave ember prints on the stone. In the Wound, the stone fears them.'] },
  { id: 'faja_flagelante', nombre: ['Faja del Flagelante', 'Flagellant\'s Sash'], base: 'faja_tela', nivel: 6,
    stats: [r('def_pct', 40, 60), r('vida', 15, 20), r('espinas', 4), r('vel_recuperar', 15)],
    lore: ['Manchada de sangre que no es de quien la usa.', 'Stained with blood that is not the wearer\'s.'] },
  { id: 'cinto_raices', nombre: ['Cinto de Raíces', 'Rootbind'], base: 'tahali_cazador', nivel: 29,
    stats: [r('def_pct', 80, 110), r('vit', 10, 15), r('regen_vida', 4), r('res_veneno', 25), r('des', 10)],
    lore: ['Las raíces de los templos de Yhuantl crecen hacia dentro. Este cinto también.', 'The roots of the temples of Yhuantl grow inward. So does this belt.'] },

  // joyas
  { id: 'sello_abad', nombre: ['Sello del Abad', 'Abbot\'s Seal'], base: 'anillo', nivel: 15,
    stats: [r('mana', 20, 30), r('ene', 8), r('res_sombra', 15), r('regen_mana', 20)],
    lore: ['Cerraba las cartas que nunca debían abrirse.', 'It sealed the letters that were never to be opened.'] },
  { id: 'anillo_reyes_dormidos', nombre: ['Anillo de los Reyes Dormidos', 'Ring of the Sleeping Kings'], base: 'anillo', nivel: 40,
    stats: [r('todos_atributos', 5), r('robo_vida', 4, 6), r('hallazgo', 20), r('res_fuego', 20)],
    lore: ['Cada rey de Sahrim lo llevó a la tumba. Cada uno lo devolvió.', 'Every king of Sahrim took it to the grave. Every one gave it back.'] },
  { id: 'lagrima_hrimgard', nombre: ['Lágrima de Hrimgard', 'Tear of Hrimgard'], base: 'anillo', nivel: 52,
    stats: [r('mas_habilidades', 1), r('res_frio', 30), r('vel_lanzar', 10), r('mana', 30, 45), r('dano_frio', 6, 12)],
    lore: ['Una gota que la montaña lloró cuando despertó lo que dormía bajo ella.', 'A drop the mountain wept when what slept beneath it awoke.'] },
  { id: 'nudo_ahorcado', nombre: ['Nudo del Ahorcado', 'Hangman\'s Knot'], base: 'amuleto', nivel: 8,
    stats: [r('vida', 15, 20), r('res_todo', 5), r('vida_por_muerte', 3), r('vel_mover', 5)],
    lore: ['Aprieta un poco más cada vez que matas.', 'It tightens a little more each time you kill.'] },
  { id: 'rosario_hueso', nombre: ['Rosario de Hueso', 'Bone Rosary'], base: 'amuleto', nivel: 20,
    stats: [r('mas_clase', 1), r('mana', 20, 30), r('res_sombra', 20), r('regen_mana', 25)],
    lore: ['Cada cuenta es la falange de un monje de Santa Oria.', 'Each bead is the knucklebone of a monk of Saint Oria.'] },
  { id: 'corazon_ascua', nombre: ['Corazón del Ascua', 'Heart of the Ember'], base: 'amuleto', nivel: 66, legendario: true,
    stats: [r('mas_habilidades', 2), r('todos_atributos', 10, 15), r('res_todo', 20, 30), r('dano_fuego', 15, 25), r('vida', 40, 60)],
    lore: ['Late. Late como late algo enterrado vivo.', 'It beats. It beats like something buried alive.'] },
];

// ------------------------------------------------------------------ conjuntos
export const CONJUNTOS: Conjunto[] = [
  { id: 'furia_hrimgard', nombre: ['Furia de Hrimgard', 'Hrimgard\'s Fury'], nivel: 34,
    lore: ['Los clanes de las cumbres pelean desnudos de miedo. Esto es lo único que se ponen.', 'The clans of the peaks fight stripped of fear. This is all they wear.'],
    piezas: [
      { id: 'furia_hacha', nombre: ['Hacha del Clan Helado', 'Frozen Clan Axe'], base: 'hacha_norte', stats: [r('dano_pct', 80, 110), r('vel_ataque', 10), r('dano_frio', 6, 12)] },
      { id: 'furia_loriga', nombre: ['Loriga del Clan Helado', 'Frozen Clan Hauberk'], base: 'loriga_guardia', stats: [r('def_pct', 80, 100), r('vida', 30), r('res_frio', 20)] },
      { id: 'furia_guanteletes', nombre: ['Puños del Clan Helado', 'Frozen Clan Fists'], base: 'guanteletes_malla', stats: [r('def_pct', 60, 80), r('fue', 10), r('golpe_aplastante', 8)] },
      { id: 'furia_sabatones', nombre: ['Pisada del Clan Helado', 'Frozen Clan Stride'], base: 'sabatones_malla', stats: [r('def_pct', 60, 80), r('vel_mover', 20), r('res_frio', 15)] },
      { id: 'furia_cinturon', nombre: ['Cinto del Clan Helado', 'Frozen Clan Girdle'], base: 'cinturon_malla', stats: [r('def_pct', 60, 80), r('vit', 10), r('vel_recuperar', 15)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('fue', 10)] },
      { piezas: 3, stats: [r('vida', 50), r('res_frio', 20)] },
      { piezas: 4, stats: [r('vel_ataque', 20), r('robo_vida', 5)] },
      { piezas: 5, stats: [r('mas_clase', 2), r('dano_pct', 50), r('reduc_dano', 10)] },
    ] },
  { id: 'vigilia_santa_oria', nombre: ['Vigilia de Santa Oria', 'Saint Oria\'s Vigil'], nivel: 28,
    lore: ['La orden juró velar la abadía hasta el fin. Cumplieron. El fin llegó antes.', 'The order swore to guard the abbey to the end. They kept their oath. The end came early.'],
    piezas: [
      { id: 'vigilia_maza', nombre: ['Maza del Vigía', 'Watcher\'s Mace'], base: 'maza_abad', stats: [r('dano_pct', 70, 90), r('dano_luz', 6, 12)] },
      { id: 'vigilia_placas', nombre: ['Coraza del Vigía', 'Watcher\'s Plate'], base: 'placas_templo', stats: [r('def_pct', 90, 120), r('res_sombra', 25)] },
      { id: 'vigilia_yelmo', nombre: ['Yelmo del Vigía', 'Watcher\'s Helm'], base: 'yelmo_cruzado', stats: [r('def_pct', 70, 90), r('radio_luz', 2), r('vida', 25)] },
      { id: 'vigilia_escudo', nombre: ['Escudo del Vigía', 'Watcher\'s Shield'], base: 'escudo_templo', stats: [r('def_pct', 80, 100), r('bloqueo', 15)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('res_todo', 10)] },
      { piezas: 3, stats: [r('dano_luz', 10, 20), r('regen_vida', 4)] },
      { piezas: 4, stats: [r('mas_clase', 2), r('reduc_dano', 12), r('vida', 60)] },
    ] },
  { id: 'manto_astrologo', nombre: ['Manto del Astrólogo', 'Astrologer\'s Mantle'], nivel: 22,
    lore: ['Leyó en las estrellas la caída del Ascua y no se lo dijo a nadie.', 'He read the Ember\'s fall in the stars and told no one.'],
    piezas: [
      { id: 'astrologo_habito', nombre: ['Hábito del Astrólogo', 'Astrologer\'s Habit'], base: 'habito_ceremonial', stats: [r('def_pct', 60, 80), r('mana', 30), r('ene', 10)] },
      { id: 'astrologo_diadema', nombre: ['Diadema del Astrólogo', 'Astrologer\'s Diadem'], base: 'diadema_plata', stats: [r('def_pct', 50, 70), r('regen_mana', 30)] },
      { id: 'astrologo_orbe', nombre: ['Ojo del Astrólogo', 'Astrologer\'s Eye'], base: 'orbe_cuarzo', stats: [r('mas_clase', 1), r('vel_lanzar', 10)] },
      { id: 'astrologo_anillo', nombre: ['Anillo del Astrólogo', 'Astrologer\'s Ring'], base: 'anillo', stats: [r('mana', 20), r('res_rayo', 20)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('mana', 40)] },
      { piezas: 3, stats: [r('vel_lanzar', 20), r('res_todo', 10)] },
      { piezas: 4, stats: [r('mas_habilidades', 1), r('dano_rayo', 10, 20)] },
    ] },
  { id: 'rastro_ciervo_blanco', nombre: ['Rastro del Ciervo Blanco', 'White Stag\'s Trail'], nivel: 14,
    lore: ['La cazadora siguió al ciervo blanco hasta el cementerio. Allí la esperaba otra cosa.', 'The huntress followed the white stag to the graveyard. Something else was waiting there.'],
    piezas: [
      { id: 'ciervo_arco', nombre: ['Arco del Ciervo Blanco', 'White Stag Bow'], base: 'arco_tejo_paramo', stats: [r('dano_pct', 50, 70), r('vel_ataque', 10)] },
      { id: 'ciervo_jubon', nombre: ['Jubón del Ciervo Blanco', 'White Stag Doublet'], base: 'jubon_cuero', stats: [r('def_pct', 50, 70), r('des', 8)] },
      { id: 'ciervo_botas', nombre: ['Botas del Ciervo Blanco', 'White Stag Boots'], base: 'botas_cuero', stats: [r('def_pct', 40, 60), r('vel_mover', 15)] },
      { id: 'ciervo_gorro', nombre: ['Gorro del Ciervo Blanco', 'White Stag Cap'], base: 'gorro_cuero', stats: [r('def_pct', 40, 60), r('precision', 40)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('des', 10)] },
      { piezas: 3, stats: [r('perforar', 20), r('vida', 30)] },
      { piezas: 4, stats: [r('mas_clase', 1), r('critico', 8), r('hallazgo', 25)] },
    ] },
  { id: 'duelo_osario', nombre: ['Duelo del Osario', 'Ossuary Mourning'], nivel: 46,
    lore: ['Quien lo viste lleva luto por todos los muertos del valle. Ellos lo saben y lo siguen.', 'Whoever wears it mourns every dead soul in the valley. They know, and they follow.'],
    piezas: [
      { id: 'duelo_calavera', nombre: ['Rostro del Duelo', 'Mourning Face'], base: 'calavera_ritual', stats: [r('def_pct', 80, 110), r('mana', 40)] },
      { id: 'duelo_malla', nombre: ['Mortaja del Duelo', 'Mourning Shroud'], base: 'malla_sombra', stats: [r('def_pct', 100, 130), r('res_sombra', 30)] },
      { id: 'duelo_escudo', nombre: ['Coro del Duelo', 'Mourning Choir'], base: 'escudo_craneos', stats: [r('mas_clase', 1), r('def_pct', 80, 110)] },
      { id: 'duelo_varita', nombre: ['Batuta del Duelo', 'Mourning Baton'], base: 'varita_susurro', stats: [r('mas_clase', 1), r('dano_sombra', 12, 22), r('vel_lanzar', 20)] },
      { id: 'duelo_brazales', nombre: ['Grilletes del Duelo', 'Mourning Shackles'], base: 'brazales_hueso', stats: [r('def_pct', 70, 90), r('robo_mana', 4)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('mana', 50)] },
      { piezas: 3, stats: [r('res_todo', 15), r('mana_por_muerte', 5)] },
      { piezas: 4, stats: [r('vida', 70), r('vel_lanzar', 20)] },
      { piezas: 5, stats: [r('mas_habilidades', 2), r('dano_sombra', 20, 40)] },
    ] },
  { id: 'senda_yhuantl', nombre: ['Senda de Yhuantl', 'Way of Yhuantl'], nivel: 30,
    lore: ['Los peregrinos de la selva caminan con las bestias y pelean como ellas.', 'The jungle pilgrims walk with the beasts and fight as they do.'],
    piezas: [
      { id: 'yhuantl_garras', nombre: ['Zarpas de Yhuantl', 'Talons of Yhuantl'], base: 'garras_tigre', stats: [r('dano_pct', 70, 100), r('dano_veneno', 8, 16)] },
      { id: 'yhuantl_testa', nombre: ['Testa de Yhuantl', 'Brow of Yhuantl'], base: 'testa_alce', stats: [r('def_pct', 70, 90), r('vida', 30)] },
      { id: 'yhuantl_brazales', nombre: ['Brazales de Yhuantl', 'Bracers of Yhuantl'], base: 'brazales_grabados', stats: [r('def_pct', 60, 80), r('vel_ataque', 10)] },
      { id: 'yhuantl_botas', nombre: ['Pisadas de Yhuantl', 'Treads of Yhuantl'], base: 'botas_montar', stats: [r('def_pct', 60, 80), r('vel_mover', 20), r('res_veneno', 20)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('res_veneno', 25)] },
      { piezas: 3, stats: [r('regen_vida', 5), r('des', 15)] },
      { piezas: 4, stats: [r('mas_habilidades', 1), r('vel_ataque', 20), r('vida', 50)] },
    ] },
];

// ------------------------------------------------------------------ gemas
const CALIDAD: [string, string, string][] = [
  // [masculino, femenino, inglés]
  ['astillado', 'astillada', 'Splintered'],
  ['agrietado', 'agrietada', 'Cracked'],
  ['', '', ''],
  ['pulido', 'pulida', 'Polished'],
  ['perfecto', 'perfecta', 'Flawless'],
];
const NIVEL_GEMA = [1, 7, 14, 24, 36];

function gemas(
  id: string, es: string, en: string, fem: boolean, color: string[],
  arma: (q: number) => RangoStat[], armadura: (q: number) => RangoStat[], escudo: (q: number) => RangoStat[],
): Gema[] {
  return CALIDAD.map(([m, f, i], q) => ({
    id: q === 2 ? id : `${id}_${(fem ? f : m)}`,
    nombre: [[es, fem ? f : m].filter(Boolean).join(' '), [i, en].filter(Boolean).join(' ')] as [string, string],
    calidad: q, color: color[q], nivel: NIVEL_GEMA[q], arma: arma(q), armadura: armadura(q), escudo: escudo(q),
  }));
}
const E = (stat: Stat, v: number[]) => (q: number) => [r(stat, v[q])];

export const GEMAS: Gema[] = [
  ...gemas('rubi', 'Rubí', 'Ruby', false, ['#5a1414', '#7a1a1a', '#a02222', '#c62f2f', '#ee4040'],
    E('dano_fuego', [3, 6, 10, 15, 22]), E('vida', [10, 17, 24, 31, 38]), E('res_fuego', [12, 16, 22, 28, 40])),
  ...gemas('zafiro', 'Zafiro', 'Sapphire', false, ['#142a5a', '#1a3a7a', '#2250a6', '#2f66cc', '#4a88f0'],
    E('dano_frio', [2, 5, 8, 12, 18]), E('mana', [10, 17, 24, 31, 38]), E('res_frio', [12, 16, 22, 28, 40])),
  ...gemas('topacio', 'Topacio', 'Topaz', false, ['#5a4410', '#7a5c14', '#a67c18', '#cc9a20', '#f0c040'],
    E('dano_rayo', [3, 7, 12, 18, 26]), E('hallazgo', [9, 13, 16, 20, 24]), E('res_rayo', [12, 16, 22, 28, 40])),
  ...gemas('esmeralda', 'Esmeralda', 'Emerald', true, ['#103a1c', '#165226', '#1e7034', '#289044', '#3ab85a'],
    E('dano_veneno', [5, 10, 16, 24, 34]), E('des', [3, 4, 6, 8, 10]), E('res_veneno', [12, 16, 22, 28, 40])),
  ...gemas('amatista', 'Amatista', 'Amethyst', true, ['#2e1442', '#401a5c', '#58247e', '#7232a4', '#9448d0'],
    E('precision', [40, 60, 80, 100, 150]), E('fue', [3, 4, 6, 8, 10]), E('def', [8, 12, 18, 24, 30])),
  ...gemas('diamante', 'Diamante', 'Diamond', false, ['#6a6e74', '#8a9096', '#aab2ba', '#cad4dc', '#eef6ff'],
    E('dano_luz', [3, 6, 10, 15, 22]), E('res_sombra', [6, 9, 12, 15, 19]), E('res_todo', [6, 8, 11, 14, 19])),
  ...gemas('calavera', 'Calavera', 'Skull', true, ['#4a4438', '#625a4a', '#80765e', '#a09478', '#c8bc9c'],
    (q) => [r('robo_vida', [2, 2, 3, 3, 4][q]), r('robo_mana', [1, 2, 2, 3, 3][q])],
    (q) => [r('regen_vida', [2, 3, 3, 4, 5][q]), r('regen_mana', [8, 8, 12, 12, 19][q])],
    E('espinas', [4, 8, 12, 16, 20])),
];

// ------------------------------------------------------------------ runas
export const RUNAS: Runa[] = [
  { id: 'ano', nombre: ['Ano', 'Ano'], orden: 1, nivel: 1, color: '#c06a3a', arma: [r('dano_fuego', 4)], armadura: [r('res_fuego', 12)] },
  { id: 'vesk', nombre: ['Vesk', 'Vesk'], orden: 2, nivel: 3, color: '#5a8ac0', arma: [r('dano_frio', 4)], armadura: [r('res_frio', 12)] },
  { id: 'myr', nombre: ['Myr', 'Myr'], orden: 3, nivel: 6, color: '#d8c050', arma: [r('dano_rayo', 5)], armadura: [r('res_rayo', 12)] },
  { id: 'quel', nombre: ['Quel', 'Quel'], orden: 4, nivel: 9, color: '#5aa060', arma: [r('dano_veneno', 8)], armadura: [r('res_veneno', 12)] },
  { id: 'dra', nombre: ['Dra', 'Dra'], orden: 5, nivel: 12, color: '#a02a2a', arma: [r('robo_vida', 3)], armadura: [r('vida', 15)] },
  { id: 'ossa', nombre: ['Ossa', 'Ossa'], orden: 6, nivel: 15, color: '#c8bc9c', arma: [r('robo_mana', 3)], armadura: [r('mana', 15)] },
  { id: 'hirn', nombre: ['Hirn', 'Hirn'], orden: 7, nivel: 18, color: '#8a8a8a', arma: [r('dano_pct', 15)], armadura: [r('def_pct', 15)] },
  { id: 'kael', nombre: ['Kael', 'Kael'], orden: 8, nivel: 21, color: '#b08850', arma: [r('precision', 60)], armadura: [r('vit', 6)] },
  { id: 'yth', nombre: ['Yth', 'Yth'], orden: 9, nivel: 24, color: '#70c0b0', arma: [r('vel_ataque', 10)], armadura: [r('vel_mover', 10)] },
  { id: 'brann', nombre: ['Brann', 'Brann'], orden: 10, nivel: 27, color: '#8a3020', arma: [r('herida_abierta', 15)], armadura: [r('espinas', 10)] },
  { id: 'vorn', nombre: ['Vorn', 'Vorn'], orden: 11, nivel: 30, color: '#4a2a6a', arma: [r('dano_sombra', 10)], armadura: [r('res_sombra', 15)] },
  { id: 'esk', nombre: ['Esk', 'Esk'], orden: 12, nivel: 33, color: '#f0e0a0', arma: [r('dano_luz', 10)], armadura: [r('radio_luz', 2)] },
  { id: 'gharn', nombre: ['Gharn', 'Gharn'], orden: 13, nivel: 36, color: '#6a5a4a', arma: [r('golpe_aplastante', 15)], armadura: [r('reduc_dano', 5)] },
  { id: 'rhu', nombre: ['Rhu', 'Rhu'], orden: 14, nivel: 40, color: '#c04060', arma: [r('critico', 6)], armadura: [r('des', 10)] },
  { id: 'zael', nombre: ['Zael', 'Zael'], orden: 15, nivel: 44, color: '#9a6a30', arma: [r('dano_max', 12)], armadura: [r('fue', 10)] },
  { id: 'orun', nombre: ['Orun', 'Orun'], orden: 16, nivel: 48, color: '#a0d0f0', arma: [r('ralentizar', 20)], armadura: [r('regen_vida', 6)] },
  { id: 'thessa', nombre: ['Thessa', 'Thessa'], orden: 17, nivel: 52, color: '#d0d0e8', arma: [r('dano_pct', 40)], armadura: [r('res_todo', 10)] },
  { id: 'veyl', nombre: ['Veyl', 'Veyl'], orden: 18, nivel: 56, color: '#a080d0', arma: [r('vel_ataque', 20)], armadura: [r('hallazgo', 30)] },
  { id: 'kharn', nombre: ['Kharn', 'Kharn'], orden: 19, nivel: 60, color: '#3a3a3a', arma: [r('aturdir', 20)], armadura: [r('reduc_dano', 10)] },
  { id: 'xal', nombre: ['Xal', 'Xal'], orden: 20, nivel: 64, color: '#ff8a20', arma: [r('mas_habilidades', 1)], armadura: [r('todos_atributos', 8)] },
];

// ------------------------------------------------------------------ palabras rúnicas
export const PALABRAS: Palabra[] = [
  { id: 'rescoldo', nombre: ['Rescoldo', 'Smoulder'], runas: ['ano', 'dra'], donde: ['espada', 'hacha', 'maza'], vivo: 'fuego',
    stats: [r('dano_pct', 50, 70), r('dano_fuego', 10, 18), r('robo_vida', 4), r('res_fuego', 20)],
    lore: ['Lo que queda cuando el fuego ya comió.', 'What remains once the fire has fed.'] },
  { id: 'vigia', nombre: ['Vigía', 'Watcher'], runas: ['esk', 'kael'], donde: ['casco'],
    stats: [r('radio_luz', 3), r('precision', 100, 150), r('res_todo', 10), r('vida', 30, 40)],
    lore: ['Alguien tiene que mirar a la oscuridad sin parpadear.', 'Someone has to stare into the dark without blinking.'] },
  { id: 'mortaja', nombre: ['Mortaja', 'Shroud'], runas: ['ossa', 'vorn', 'hirn'], donde: ['armadura'],
    stats: [r('def_pct', 80, 120), r('res_sombra', 35), r('mana', 40, 60), r('mana_por_muerte', 5), r('vel_recuperar', 20)],
    lore: ['Te envuelve como a los muertos de la cripta. Ellos no se quejan.', 'It wraps you like the crypt dead. They do not complain.'] },
  { id: 'escarcha_muda', nombre: ['Escarcha Muda', 'Silent Rime'], runas: ['vesk', 'kael', 'orun'], donde: ['lanza', 'alabarda', 'arco'], vivo: 'frio',
    stats: [r('dano_pct', 120, 160), r('dano_frio', 20, 35), r('ralentizar', 40), r('perforar', 20), r('res_frio', 30)],
    lore: ['En Hrimgard el hielo no cruje antes de matar.', 'In Hrimgard the ice makes no sound before it kills.'] },
  { id: 'plaga_lenta', nombre: ['Plaga Lenta', 'Slow Plague'], runas: ['quel', 'yth', 'rhu'], donde: ['daga', 'garras'], vivo: 'veneno',
    stats: [r('dano_pct', 100, 140), r('dano_veneno', 30, 50), r('vel_ataque', 30), r('critico', 8), r('des', 15)],
    lore: ['No tiene prisa. Ninguna plaga la tiene.', 'It is in no hurry. No plague ever is.'] },
  { id: 'ojo_trueno', nombre: ['Ojo del Trueno', 'Thundereye'], runas: ['myr', 'brann', 'veyl'], donde: ['baculo', 'orbe'], vivo: 'rayo',
    stats: [r('mas_habilidades', 1), r('dano_rayo', 25, 45), r('vel_lanzar', 30), r('mana', 50, 70), r('res_rayo', 30)],
    lore: ['Mira una vez y el cielo responde.', 'It looks once and the sky answers.'] },
  { id: 'muralla', nombre: ['Muralla', 'Bulwark'], runas: ['kharn', 'zael', 'ossa'], donde: ['escudo'],
    stats: [r('bloqueo', 25), r('def_pct', 120, 160), r('res_todo', 20), r('reduc_dano', 12), r('fue', 15)],
    lore: ['Velmora tuvo muros. Esto es lo que aprendió cuando cayeron.', 'Velmora had walls. This is what it learned when they fell.'] },
  { id: 'juramento', nombre: ['Juramento', 'Oath'], runas: ['hirn', 'gharn', 'esk', 'thessa'], donde: ['mandoble', 'martillo', 'hacha_doble'], vivo: 'luz',
    stats: [r('dano_pct', 200, 260), r('dano_luz', 35, 60), r('golpe_aplastante', 25), r('res_sombra', 40), r('mas_habilidades', 1)],
    lore: ['Pronunciado ante el altar de Santa Oria. Romperlo cuesta más que la vida.', 'Sworn before the altar of Saint Oria. Breaking it costs more than a life.'] },
  { id: 'sed', nombre: ['Sed', 'Thirst'], runas: ['dra', 'brann', 'kharn', 'vorn'], donde: ['guadana', 'hacha', 'espada'], vivo: 'sangre',
    stats: [r('dano_pct', 190, 250), r('dano_sangre', 35, 60), r('robo_vida', 10, 14), r('herida_abierta', 40), r('aturdir', 15)],
    lore: ['Bebe sin descanso. Nunca le alcanza.', 'It drinks without rest. It is never enough.'] },
  { id: 'ascua_eterna', nombre: ['Ascua Eterna', 'Undying Ember'], runas: ['xal', 'thessa', 'ano', 'veyl'], donde: ['armadura'],
    stats: [r('mas_habilidades', 2), r('todos_atributos', 10, 15), r('res_todo', 20, 30), r('vida', 60, 90), r('hallazgo', 30)],
    lore: ['El fuego que cayó del cielo no se apaga. Solo cambia de dueño.', 'The fire that fell from the sky never dies. It only changes hands.'] },
];

// ------------------------------------------------------------------ nombres de raros
/**
 * Pares para nombrar objetos raros. Cómo componer:
 * - español: `${pre[i][0]} ${suf[j][0]}` (sustantivo + adjetivo invariable o "de X"), p. ej. "Grito Sepulcral".
 * - inglés:  `${suf[j][1]} ${pre[i][1]}` (adjetivo + sustantivo), p. ej. "Grave Cry".
 */
export const NOMBRES_RAROS: { pre: [string, string][]; suf: [string, string][] } = {
  pre: [
    ['Grito', 'Cry'], ['Lamento', 'Lament'], ['Garra', 'Claw'], ['Colmillo', 'Fang'], ['Hueso', 'Bone'],
    ['Ascua', 'Ember'], ['Sombra', 'Shade'], ['Ruina', 'Ruin'], ['Tumba', 'Tomb'], ['Cuervo', 'Raven'],
    ['Espina', 'Thorn'], ['Llanto', 'Weeping'], ['Eco', 'Echo'], ['Mordisco', 'Bite'], ['Velo', 'Veil'],
    ['Corona', 'Crown'], ['Ojo', 'Eye'], ['Puño', 'Fist'], ['Herida', 'Wound'], ['Sudario', 'Shroud'],
    ['Augurio', 'Omen'], ['Plegaria', 'Prayer'], ['Juramento', 'Oath'], ['Cicatriz', 'Scar'], ['Ceniza', 'Ash'],
    ['Aullido', 'Howl'], ['Marca', 'Brand'], ['Guardia', 'Ward'], ['Pesadilla', 'Nightmare'], ['Cadena', 'Chain'],
    ['Tormento', 'Torment'], ['Silencio', 'Silence'], ['Látigo', 'Lash'], ['Vigilia', 'Vigil'], ['Sello', 'Seal'],
    ['Raíz', 'Root'], ['Astilla', 'Splinter'], ['Hambre', 'Hunger'], ['Pacto', 'Pact'], ['Destello', 'Gleam'],
  ],
  suf: [
    ['Sepulcral', 'Grave'], ['Funeral', 'Funeral'], ['Infernal', 'Infernal'], ['Abismal', 'Abyssal'], ['Glacial', 'Glacial'],
    ['Mortal', 'Deadly'], ['Voraz', 'Ravenous'], ['Feroz', 'Fierce'], ['Cruel', 'Cruel'], ['Atroz', 'Dire'],
    ['Lunar', 'Moon'], ['Carmesí', 'Crimson'], ['Insaciable', 'Insatiable'], ['Implacable', 'Relentless'], ['Inmortal', 'Undying'],
    ['Espectral', 'Spectral'], ['Crepuscular', 'Dusk'], ['Sangrante', 'Bleeding'], ['Ardiente', 'Burning'], ['Doliente', 'Mourning'],
    ['Penitente', 'Penitent'], ['Errante', 'Wandering'], ['Silente', 'Hushed'], ['Durmiente', 'Sleeping'], ['Fatal', 'Fatal'],
    ['Letal', 'Lethal'], ['Brutal', 'Brutal'], ['Salvaje', 'Savage'], ['Triste', 'Sorrow'], ['Febril', 'Fevered'],
    ['Gris', 'Grey'], ['Hostil', 'Hostile'], ['Ancestral', 'Elder'], ['Fantasmal', 'Ghost'], ['Estéril', 'Barren'],
    ['de Hierro', 'Iron'], ['de Sangre', 'Blood'], ['de Escarcha', 'Frost'], ['del Abismo', 'Abyss'], ['del Ocaso', 'Twilight'],
  ],
};
