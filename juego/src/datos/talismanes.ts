// Talismanes: el casillero extra del inventario. Bases, afijos propios (que no salen en anillos ni amuletos)
// y un talismán único por acto que suelta su jefe.
import { BASES, PREFIJOS, SUFIJOS, UNICOS } from './objetos_datos';
import type { Base, Afijo, Unico } from '../juego/tipos_objetos';

const B = (id: string, es: string, en: string, nivel: number, escalon: 0 | 1 | 2, precio: number): Base => ({ id, nombre: [es, en], ranura: 'talisman', familia: 'talisman', nivel, escalon, req: { nivel: Math.max(1, nivel - 2) }, tam: [1, 1], durab: 0, precio, visual: {} });
export const TALISMANES: Base[] = [
  B('tal_hueso', 'Talismán de hueso', 'Bone talisman', 3, 0, 120),
  B('tal_cera', 'Sello de cera negra', 'Black wax seal', 10, 0, 220),
  B('tal_ceniza', 'Relicario de ceniza', 'Ash reliquary', 20, 1, 450),
  B('tal_campana', 'Badajo de campana', 'Bell clapper', 32, 1, 800),
  B('tal_brasa', 'Brasa encerrada', 'Caged ember', 45, 2, 1500),
];
const A = (tipo: 'prefijo' | 'sufijo', id: string, es: string, en: string, nivel: number, grupo: string, stat: any, min: number, max: number, peso = 10): Afijo => ({ id, nombre: [es, en], tipo, nivel, grupo, donde: ['talisman'], stats: [{ stat, min, max }], peso });
export const AFIJOS_TALISMAN: Afijo[] = [
  A('prefijo', 'tal_vela', 'de Vela', 'Candlelit', 1, 'tal_luz', 'radio_luz', 1, 2), A('prefijo', 'tal_faro', 'de Faro', 'Beaconed', 25, 'tal_luz', 'radio_luz', 2, 4),
  A('prefijo', 'tal_urraca', 'de Urraca', 'Magpie', 1, 'tal_mf', 'hallazgo', 8, 18), A('prefijo', 'tal_saqueo', 'de Saqueo', 'Plundering', 20, 'tal_mf', 'hallazgo', 18, 35),
  A('prefijo', 'tal_coro', 'del Coro', 'Choral', 18, 'tal_hab', 'mas_habilidades', 1, 1, 3),
  A('prefijo', 'tal_avaro', 'Avaro', 'Miserly', 1, 'tal_oro', 'oro_extra', 15, 40),
  A('sufijo', 'tal_valor', 'del Que No Tiembla', 'of the Unshaken', 1, 'tal_valor', 'valor', 25, 50), A('sufijo', 'tal_valor2', 'de la Vigilia', 'of the Vigil', 25, 'tal_valor', 'valor', 50, 90),
  A('sufijo', 'tal_rezo', 'del Rezo', 'of Prayer', 1, 'tal_regen', 'regen_vida', 1, 4), A('sufijo', 'tal_letania', 'de la Letanía', 'of the Litany', 22, 'tal_regen', 'regen_vida', 4, 10),
  A('sufijo', 'tal_sombra', 'de la Sombra Quieta', 'of the Still Shadow', 10, 'tal_res', 'res_sombra', 10, 30),
];
/** Un talismán único por acto: lo suelta siempre el jefe del acto. */
export const TALISMAN_JEFE: Record<string, string> = { abadesa: 'tal_u_ilvara', rey_sin_sombra: 'tal_u_khamer', madre_cienaga: 'tal_u_madre', rey_escarcha: 'tal_u_hjaldur', senor_demonio: 'tal_u_ozmaren' };
const U = (id: string, es: string, en: string, base: string, nivel: number, stats: [any, number, number][], lore: [string, string]): Unico => ({ id, nombre: [es, en], base, nivel, stats: stats.map(([stat, min, max]) => ({ stat, min, max })), lore });
export const UNICOS_TALISMAN: Unico[] = [
  U('tal_u_ilvara', 'El Rosario de Ilvara', 'Ilvara\'s Rosary', 'tal_hueso', 12, [['mas_habilidades', 1, 1], ['valor', 40, 40], ['res_fuego', 15, 25], ['radio_luz', 2, 2]], ['Cada cuenta es un diente. Ella los contaba de noche.', 'Each bead is a tooth. She counted them at night.']),
  U('tal_u_khamer', 'La Sombra Prestada', 'The Borrowed Shadow', 'tal_cera', 20, [['mas_habilidades', 1, 1], ['hallazgo', 30, 40], ['res_veneno', 20, 30], ['valor', 30, 30]], ['Pesa más de lo que debería. A veces se mueve sola.', 'It weighs more than it should. Sometimes it moves on its own.']),
  U('tal_u_madre', 'El Primer Hijo', 'The Firstborn', 'tal_ceniza', 28, [['mas_habilidades', 1, 1], ['regen_vida', 8, 12], ['vida', 40, 60], ['valor', 50, 50]], ['Late. Muy despacio. Nadie sabe de qué.', 'It beats. Very slowly. No one knows what it is.']),
  U('tal_u_hjaldur', 'La Promesa Rota', 'The Broken Oath', 'tal_campana', 34, [['mas_habilidades', 1, 2], ['res_frio', 30, 40], ['def_pct', 30, 50], ['valor', 60, 60]], ['Una corona partida en dos. La otra mitad sigue en el trono.', 'A crown split in two. The other half remains on the throne.']),
  U('tal_u_ozmaren', 'La Última Brasa', 'The Last Ember', 'tal_brasa', 44, [['mas_habilidades', 2, 2], ['dano_fuego', 30, 50], ['res_todo', 15, 20], ['valor', 100, 100], ['radio_luz', 3, 3]], ['Todavía tibia. Todavía con sed.', 'Still warm. Still thirsty.']),
];
// se suman a las listas del botín al cargar
BASES.push(...TALISMANES);
PREFIJOS.push(...AFIJOS_TALISMAN.filter((a) => a.tipo === 'prefijo'));
SUFIJOS.push(...AFIJOS_TALISMAN.filter((a) => a.tipo === 'sufijo'));
UNICOS.push(...UNICOS_TALISMAN);
