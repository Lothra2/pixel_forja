import { registrar } from '../objeto';
import { pintarEscena } from '../render';
import { DIRS, CUADROS, ANIM_HEROE, CLASE_ESTILO, type Accion } from '../figura';
import { personajeEscena, type Cuerpo, type Equipo } from '../cuerpo';

/**
 * Héroes y monstruos humanoides con cuerpo orgánico (cuerpo.ts), en 8 direcciones y con sus acciones animadas.
 * Cada héroe tiene tres niveles de equipo (novato, veterano, leyenda): el mismo cuerpo con armaduras que suben.
 * Ids: per_<clase>_<accion> (veterano), per_<clase>_novato_<accion>, per_<clase>_leyenda_<accion> y
 * mon_<monstruo>_<accion>. Las variantes son las 8 direcciones.
 */

export interface Heroe { id: string; nombre: [string, string]; cuerpo: Cuerpo; niveles: [Equipo, Equipo, Equipo]; magia?: boolean; descripcion: [string, string] }
export interface Monstruo { id: string; nombre: [string, string]; cuerpo: Cuerpo; equipo: Equipo; magia?: boolean; jefe?: boolean; huella?: number }

const madera = 'madera', lisa = 'madera_lisa';

export const HEROES: Heroe[] = [
  {
    id: 'berserker', nombre: ['Berserker', 'Berserker'], descripcion: ['Guerrero del norte que pelea con hachas a dos manos y rugidos.', 'Northern warrior with two-handed axes and war cries.'],
    cuerpo: { presentacion: 'rugido', genero: 'h', alto: 1.03, ancho: 1.14, musculo: 0.95, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'melena', barba: 'trenzada' },
    niveles: [
      { piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'vendas', mat: 'cu_tela_blanca' }, cinturon: { mat: 'cu_cuero' }, arma: { tipo: 'hacha', mat: 'hierro_oxido', mango: madera } },
      { piernas: { tipo: 'pantalon', mat: 'cu_cuero_negro' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, manos: { tipo: 'brazales', mat: 'cu_cuero' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje' }, cinturon: { mat: 'cu_cuero', hebilla: 'cu_placa' }, cabeza: { tipo: 'cuernos', mat: 'cu_placa_oscura' }, arma: { tipo: 'hacha_doble', mat: 'cu_placa_oscura', mango: madera } },
      { torso: { tipo: 'sin_mangas', mat: 'cu_pelaje_gris' }, piernas: { tipo: 'grebas', mat: 'cu_placa_oscura', mat2: 'cu_cuero_negro' }, pies: { tipo: 'sabatones', mat: 'cu_placa_oscura' }, manos: { tipo: 'guanteletes', mat: 'cu_placa_oscura' }, hombros: { tipo: 'puas', mat: 'cu_placa_oscura' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'cu_oro' }, cabeza: { tipo: 'cuernos', mat: 'cu_oro' }, capa: { mat: 'cu_pelaje', largo: 0.8 }, arma: { tipo: 'hacha_doble', mat: 'cu_placa', mango: 'cu_cuero_negro', encanto: 'fuego' } },
    ],
  },
  {
    id: 'templario', nombre: ['Templario', 'Templar'], descripcion: ['Caballero de la luz: espada, escudo y auras sagradas.', 'Knight of light: sword, shield and holy auras.'], magia: true,
    cuerpo: { presentacion: 'guardia', genero: 'h', ancho: 1.06, musculo: 0.6, piel: 'cu_piel_clara', pelo: 'cu_pelo_castano', peinado: 'corto', barba: 'corta' },
    niveles: [
      { torso: { tipo: 'malla', mat: 'cu_malla' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero' }, tabardo: { mat: 'cu_tela_blanca' }, arma: { tipo: 'espada', mat: 'cu_placa' }, izq: { tipo: 'escudo_redondo', mat: madera, mat2: 'hierro' } },
      { torso: { tipo: 'placas', mat: 'cu_placa', mat2: 'cu_malla' }, piernas: { tipo: 'grebas', mat: 'cu_placa', mat2: 'cu_malla' }, pies: { tipo: 'sabatones', mat: 'cu_placa' }, manos: { tipo: 'guanteletes', mat: 'cu_placa' }, hombros: { tipo: 'placas', mat: 'cu_placa' }, cabeza: { tipo: 'casco', mat: 'cu_placa' }, tabardo: { mat: 'cu_tela_azul', borde: 'cu_oro' }, capa: { mat: 'cu_tela_azul' }, arma: { tipo: 'espada', mat: 'cu_placa' }, izq: { tipo: 'escudo_cometa', mat: 'cu_tela_azul', mat2: 'cu_oro' } },
      { torso: { tipo: 'placas', mat: 'cu_placa', mat2: 'cu_malla', adorno: 'cu_oro' }, piernas: { tipo: 'grebas', mat: 'cu_placa', mat2: 'cu_malla' }, pies: { tipo: 'sabatones', mat: 'cu_placa' }, manos: { tipo: 'guanteletes', mat: 'cu_placa' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, cabeza: { tipo: 'yelmo', mat: 'cu_placa', mat2: 'cu_oro' }, tabardo: { mat: 'cu_tela_blanca', borde: 'cu_oro' }, capa: { mat: 'cu_tela_blanca' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'cu_oro' }, arma: { tipo: 'espada', mat: 'cu_oro', encanto: 'sagrado' }, izq: { tipo: 'escudo_torre', mat: 'cu_tela_blanca', mat2: 'cu_oro' } },
    ],
  },
  {
    id: 'arcanista', nombre: ['Arcanista', 'Arcanist'], descripcion: ['Hechicera del fuego, el hielo y el rayo.', 'Sorceress of fire, frost and lightning.'], magia: true,
    cuerpo: { presentacion: 'conjuro', genero: 'm', ancho: 0.9, musculo: 0.15, piel: 'cu_piel_clara', pelo: 'cu_pelo_rojo', peinado: 'largo' },
    niveles: [
      { torso: { tipo: 'vestido', mat: 'cu_tela_parda' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_parda' }, arma: { tipo: 'varita', mango: madera } },
      { torso: { tipo: 'vestido', mat: 'cu_tela_morada' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, cinturon: { mat: 'cu_oro', hebilla: 'magia' }, cabeza: { tipo: 'diadema', mat: 'cu_oro' }, arma: { tipo: 'baculo', mango: lisa } },
      { torso: { tipo: 'vestido', mat: 'cu_tela_azul' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero_negro' }, manos: { tipo: 'guantes', mat: 'cu_tela_negra' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, cinturon: { mat: 'cu_oro', hebilla: 'cu_ojo_hielo' }, cabeza: { tipo: 'corona', mat: 'cu_oro', mat2: 'cu_ojo_hielo' }, capa: { mat: 'cu_tela_negra' }, arma: { tipo: 'baculo', mango: 'cu_placa_oscura', gema: 'cu_ojo_hielo', encanto: 'hielo' }, izq: { tipo: 'orbe', mat: 'magia' } },
    ],
  },
  {
    id: 'cazadora', nombre: ['Cazadora', 'Huntress'], descripcion: ['Arquera de los bosques: flechas, lanzas y trampas.', 'Forest archer: arrows, spears and traps.'],
    cuerpo: { presentacion: 'apunta', genero: 'm', alto: 1.02, ancho: 0.95, musculo: 0.45, piel: 'cu_piel_morena', pelo: 'cu_pelo_rubio', peinado: 'cola' },
    niveles: [
      { torso: { tipo: 'camisa', mat: 'cu_tela_verde' }, piernas: { tipo: 'calzas', mat: 'cu_tela_parda' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero' }, arma: { tipo: 'arco', mango: madera } },
      { torso: { tipo: 'cuero', mat: 'cu_cuero' }, piernas: { tipo: 'calzas', mat: 'cu_tela_verde' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero' }, manos: { tipo: 'guantes', mat: 'cu_cuero' }, hombros: { tipo: 'cuero', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero_negro' }, capa: { mat: 'cu_tela_verde', largo: 0.8 }, arma: { tipo: 'arco', mango: lisa } },
      { torso: { tipo: 'cuero_tachonado', mat: 'cu_cuero_negro' }, piernas: { tipo: 'grebas', mat: 'cu_oro', mat2: 'cu_cuero_negro' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero_negro' }, manos: { tipo: 'brazales', mat: 'cu_oro' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'cu_oro' }, cabeza: { tipo: 'aro', mat: 'cu_oro' }, capa: { mat: 'cu_tela_roja', largo: 0.9 }, arma: { tipo: 'arco', mango: 'cu_hueso', encanto: 'rayo' } },
    ],
  },
  {
    id: 'nigromante', nombre: ['Nigromante', 'Necromancer'], descripcion: ['Señor de los huesos: invoca muertos y maldice.', 'Bone lord: raises the dead and curses.'], magia: true,
    cuerpo: { presentacion: 'invoca', genero: 'h', alto: 1.03, ancho: 0.84, musculo: 0.05, piel: 'cu_piel_palida', pelo: 'cu_pelo_blanco', peinado: 'largo' },
    niveles: [
      { torso: { tipo: 'tunica', mat: 'cu_tela_luto', ribete: 'cu_tela_parda' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_luto' }, pies: { tipo: 'botas', mat: 'cu_cuero_negro' }, cinturon: { mat: 'cu_cuero' }, arma: { tipo: 'daga', mat: 'cu_hueso' } },
      { torso: { tipo: 'tunica', mat: 'cu_tela_luto', ribete: 'cu_tela_morada' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_luto' }, pies: { tipo: 'botas', mat: 'cu_cuero_negro' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_luto' }, hombros: { tipo: 'huesos', mat: 'cu_hueso' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'cu_hueso' }, arma: { tipo: 'daga', mat: 'cu_hueso' }, izq: { tipo: 'escudo_calavera', mat: 'cu_cuero_negro', mat2: 'cu_hueso' } },
      { torso: { tipo: 'tunica', mat: 'cu_tela_luto', ribete: 'cu_tela_morada' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_luto' }, pies: { tipo: 'sabatones', mat: 'cu_placa_oscura' }, manos: { tipo: 'guanteletes', mat: 'cu_placa_oscura' }, hombros: { tipo: 'huesos', mat: 'cu_hueso' }, cabeza: { tipo: 'calavera', mat: 'cu_hueso' }, capa: { mat: 'cu_tela_luto' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'cu_ojo_verde' }, arma: { tipo: 'guadana', mat: 'cu_placa_oscura', mango: 'cu_hueso', encanto: 'sombra' } },
    ],
  },
  {
    id: 'monje', nombre: ['Monje', 'Monk'], descripcion: ['Peleador de puños y patadas veloces con poder de los vientos.', 'Fist fighter with lightning-fast kicks and wind power.'],
    cuerpo: { presentacion: 'kata', genero: 'h', ancho: 0.98, musculo: 0.75, piel: 'cu_piel_morena', peinado: 'calvo', pelo: 'cu_pelo_negro' },
    niveles: [
      { torso: { tipo: 'sin_mangas', mat: 'cu_tela_parda' }, piernas: { tipo: 'faldon', mat: 'cu_tela_parda', mat2: 'cu_tela_parda' }, pies: { tipo: 'sandalias', mat: 'cu_cuero' }, manos: { tipo: 'vendas', mat: 'cu_tela_blanca' }, cinturon: { mat: 'cu_tela_negra' }, arma: { tipo: 'puno' } },
      { torso: { tipo: 'sin_mangas', mat: 'cu_tela_roja' }, piernas: { tipo: 'faldon', mat: 'cu_tela_roja', mat2: 'cu_tela_parda' }, pies: { tipo: 'sandalias', mat: 'cu_cuero' }, manos: { tipo: 'vendas', mat: 'cu_tela_blanca' }, cinturon: { mat: 'cu_oro' }, arma: { tipo: 'garras', mat: 'cu_placa' } },
      { torso: { tipo: 'sin_mangas', mat: 'cu_tela_blanca' }, piernas: { tipo: 'faldon', mat: 'cu_tela_blanca', mat2: 'cu_tela_azul' }, pies: { tipo: 'vendas', mat: 'cu_tela_blanca' }, manos: { tipo: 'brazales', mat: 'cu_oro' }, hombros: { tipo: 'cuero', mat: 'cu_tela_azul' }, cinturon: { mat: 'cu_oro', hebilla: 'magia' }, cabeza: { tipo: 'aro', mat: 'cu_oro' }, arma: { tipo: 'garras', mat: 'cu_oro', encanto: 'rayo' } },
    ],
  },
  {
    id: 'druida', nombre: ['Druida', 'Druid'], descripcion: ['Guardián del bosque: lobos, raíces y tormentas.', 'Forest warden: wolves, roots and storms.'], magia: true,
    cuerpo: { presentacion: 'naturaleza', genero: 'h', ancho: 1.08, musculo: 0.5, piel: 'cu_piel', pelo: 'cu_pelo_castano', peinado: 'largo', barba: 'larga' },
    niveles: [
      { torso: { tipo: 'tunica', mat: 'cu_tela_verde', ribete: 'cu_tela_parda' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_verde' }, piernas: { tipo: 'pantalon', mat: 'cu_cuero' }, pies: { tipo: 'sandalias', mat: 'cu_cuero' }, cinturon: { mat: 'cuerda' }, arma: { tipo: 'baculo', mango: madera, gema: 'fuego_verde' } },
      { torso: { tipo: 'cuero', mat: 'cu_cuero' }, piernas: { tipo: 'faldon', mat: 'cu_pelaje', mat2: 'cu_cuero' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje' }, capa: { mat: 'cu_pelaje' }, cinturon: { mat: 'cu_cuero' }, cabeza: { tipo: 'cuernos', mat: 'cu_cuero' }, arma: { tipo: 'baculo', mango: 'corteza', gema: 'fuego_verde' } },
      { torso: { tipo: 'cuero_tachonado', mat: 'cu_cuero_negro' }, piernas: { tipo: 'faldon', mat: 'cu_pelaje_gris', mat2: 'cu_cuero_negro' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero' }, manos: { tipo: 'guantes', mat: 'cu_cuero' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje_gris' }, capa: { mat: 'cu_tela_verde' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'cu_oro' }, cabeza: { tipo: 'corona', mat: 'cu_oro', mat2: 'fuego_verde' }, arma: { tipo: 'baculo', mango: 'corteza', gema: 'fuego_verde', encanto: 'veneno' } },
    ],
  },
  {
    id: 'alquimista', nombre: ['Alquimista', 'Alchemist'], descripcion: ['Tiradora de ballesta con bombas, venenos y pociones.', 'Crossbow shooter with bombs, poisons and potions.'], magia: true,
    cuerpo: { presentacion: 'frasco', genero: 'm', ancho: 0.95, musculo: 0.3, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'trenzas' },
    niveles: [
      { torso: { tipo: 'camisa', mat: 'cu_tela_blanca' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, manos: { tipo: 'guantes', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero' }, arma: { tipo: 'ballesta', mat: 'hierro', mango: madera } },
      { torso: { tipo: 'cuero', mat: 'cu_cuero' }, piernas: { tipo: 'calzas', mat: 'cu_tela_negra' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero' }, manos: { tipo: 'guantes', mat: 'cu_cuero_negro' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'cu_oro' }, cabeza: { tipo: 'gorro', mat: 'cu_cuero', mat2: 'cu_cuero_negro' }, capa: { mat: 'cu_tela_parda', largo: 0.9 }, arma: { tipo: 'ballesta', mat: 'cu_placa', mango: lisa } },
      { torso: { tipo: 'cuero_tachonado', mat: 'cu_tela_morada' }, piernas: { tipo: 'calzas', mat: 'cu_cuero_negro' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero_negro' }, manos: { tipo: 'guanteletes', mat: 'cu_oro' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'fuego_verde' }, cabeza: { tipo: 'mascara', mat: 'cu_placa_oscura' }, capa: { mat: 'cu_tela_morada' }, arma: { tipo: 'ballesta', mat: 'cu_oro', mango: 'cu_placa_oscura', encanto: 'fuego' } },
    ],
  },
];

export const MONSTRUOS: Monstruo[] = [
  { id: 'esqueleto', nombre: ['Esqueleto guerrero', 'Skeleton warrior'], cuerpo: { oseo: true, piel: 'cu_hueso', ojos: 'cu_ojo_brasa', ancho: 0.95 }, equipo: { arma: { tipo: 'espada', mat: 'hierro_oxido', mango: 'cu_cuero' }, izq: { tipo: 'escudo_redondo', mat: 'madera_vieja', mat2: 'hierro_oxido' } } },
  { id: 'esqueleto_arquero', nombre: ['Esqueleto arquero', 'Skeleton archer'], cuerpo: { oseo: true, piel: 'cu_hueso', ojos: 'cu_ojo_verde', ancho: 0.92 }, equipo: { arma: { tipo: 'arco', mango: 'madera_vieja' }, cabeza: { tipo: 'casco', mat: 'hierro_oxido' } } },
  { id: 'zombi', nombre: ['Zombi', 'Zombie'], cuerpo: { boca: 'fauces', heridas: true, demacrado: true, piel: 'cu_piel_verde', parches: 'cu_piel_gris', ojos: 'cu_ojo_brasa', joroba: 0.6, musculo: 0.2, grasa: 0.4, ancho: 1.05, peinado: 'calvo' }, equipo: { torso: { tipo: 'harapos', mat: 'cu_tela_parda' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_negra' } } },
  { id: 'necrofago', nombre: ['Necrófago', 'Ghoul'], cuerpo: { boca: 'colmillos', demacrado: true, garras: true, piel: 'cu_piel_gris', ojos: 'cu_ojo_brasa', joroba: 0.9, musculo: 0.7, ancho: 0.9, orejas: 'puntiagudas', peinado: 'calvo' }, equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_tela_parda' }, arma: { tipo: 'garras', mat: 'cu_hueso' } } },
  { id: 'diablillo', nombre: ['Diablillo', 'Imp'], cuerpo: { boca: 'colmillos', alto: 0.62, ancho: 0.82, musculo: 0.6, piel: 'cu_piel_roja', ojos: 'cu_ojo_brasa', cuernos: 'cortos', orejas: 'puntiagudas', cola: 'cu_piel_roja', cabeza: 1.25 }, equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_cuero' }, arma: { tipo: 'lanza', mat: 'hierro_oxido', mango: 'madera_vieja' } } },
  { id: 'brujo_diablillo', nombre: ['Brujo diablillo', 'Imp warlock'], magia: true, cuerpo: { alto: 0.68, ancho: 0.82, musculo: 0.3, piel: 'cu_piel_roja', ojos: 'cu_ojo_verde', cuernos: 'carnero', orejas: 'puntiagudas', cola: 'cu_piel_roja', cabeza: 1.2 }, equipo: { torso: { tipo: 'tunica', mat: 'cu_tela_verde' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_verde' }, arma: { tipo: 'baculo', mango: 'cu_hueso', gema: 'fuego_verde' } } },
  { id: 'satiro', nombre: ['Sátiro oscuro', 'Dark satyr'], cuerpo: { boca: 'colmillos', alto: 1.06, ancho: 1.12, musculo: 0.85, piel: 'cu_pelaje', ojos: 'cu_ojo_brasa', cuernos: 'carnero', barba: 'corta', pelo: 'cu_pelaje', peinado: 'calvo', orejas: 'puntiagudas' }, equipo: { piernas: { tipo: 'pantalon', mat: 'cu_pelaje' }, pies: { tipo: 'botas', mat: 'cu_tela_negra' }, cinturon: { mat: 'cu_cuero' }, arma: { tipo: 'alabarda', mat: 'hierro_oxido', mango: 'madera_vieja' } } },
  { id: 'momia', nombre: ['Momia', 'Mummy'], cuerpo: { boca: 'fauces', demacrado: true, piel: 'cu_venda', parches: 'cu_piel_gris', ojos: 'cu_ojo_brasa', joroba: 0.3, musculo: 0.1, ancho: 0.95, peinado: 'calvo' }, equipo: { manos: { tipo: 'vendas', mat: 'cu_venda' } } },
  { id: 'caballero_muerto', nombre: ['Caballero muerto', 'Dead knight'], cuerpo: { oseo: true, alto: 1.06, piel: 'cu_hueso', ojos: 'cu_ojo_hielo' }, equipo: { torso: { tipo: 'placas', mat: 'hierro_oxido', mat2: 'hierro_oxido' }, hombros: { tipo: 'placas', mat: 'hierro_oxido' }, cabeza: { tipo: 'yelmo', mat: 'hierro_oxido' }, capa: { mat: 'cu_tela_roja', largo: 0.9 }, arma: { tipo: 'mandoble', mat: 'hierro_oxido', encanto: 'hielo' } } },
  { id: 'espectro', nombre: ['Espectro helado', 'Frost wraith'], magia: true, cuerpo: { flota: true, boca: 'fauces', demacrado: true, garras: true, piel: 'cu_piel_azul', ojos: 'cu_ojo_hielo', ancho: 0.95, musculo: 0.1, peinado: 'calvo' }, equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_azul' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_azul' }, manos: { tipo: 'vendas', mat: 'cu_tela_negra' }, izq: { tipo: 'orbe', mat: 'cu_ojo_hielo' } } },
  { id: 'cultista', nombre: ['Cultista', 'Cultist'], magia: true, cuerpo: { piel: 'cu_piel_palida', ojos: 'cu_ojo', musculo: 0.2, peinado: 'calvo' }, equipo: { torso: { tipo: 'tunica', mat: 'cu_tela_roja' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_roja' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_roja' }, cinturon: { mat: 'cuerda' }, arma: { tipo: 'daga', mat: 'cu_placa_oscura' }, izq: { tipo: 'libro', mat: 'cu_cuero_negro' } } },
  { id: 'bruja', nombre: ['Bruja del pantano', 'Bog witch'], magia: true, cuerpo: { garras: true, boca: 'colmillos', genero: 'm', piel: 'cu_piel_verde', ojos: 'cu_ojo_verde', joroba: 0.7, pelo: 'cu_pelo_blanco', peinado: 'largo', orejas: 'grandes', musculo: 0 }, equipo: { torso: { tipo: 'harapos', mat: 'cu_tela_negra' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_negra' }, arma: { tipo: 'baculo', mango: 'corteza_muerta', gema: 'fuego_verde' } } },
  { id: 'desollado', nombre: ['Desollado', 'Flayed one'], cuerpo: { piel: 'carne', parches: 'sangre', ojos: 'cu_ojo_brasa', boca: 'fauces', demacrado: true, garras: true, joroba: 0.5, musculo: 0.9, ancho: 0.92, peinado: 'calvo' }, equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_tela_negra' } } },
  { id: 'sin_rostro', nombre: ['El sin rostro', 'The faceless'], magia: true, cuerpo: { alto: 1.32, ancho: 0.74, musculo: 0, piel: 'cu_piel_palida', ojos: 'cu_piel_palida', garras: true, peinado: 'calvo' }, equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_negra' }, cabeza: { tipo: 'mascara', mat: 'cu_piel_palida' }, manos: { tipo: 'vendas', mat: 'cu_tela_negra' } } },
  { id: 'penitente', nombre: ['Penitente', 'Penitent'], cuerpo: { heridas: true, demacrado: true, piel: 'cu_piel_palida', ojos: 'cu_ojo', joroba: 0.8, musculo: 0.3 }, equipo: { piernas: { tipo: 'faldon', mat: 'cu_tela_parda', mat2: 'cu_tela_negra' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_parda' }, arma: { tipo: 'mangual', mat: 'hierro_oxido', mango: 'madera_vieja', encanto: 'sangre' }, cinturon: { mat: 'cuerda' } } },
  { id: 'aparecida', nombre: ['La aparecida', 'The apparition'], magia: true, cuerpo: { flota: true, genero: 'm', piel: 'cu_piel_azul', pelo: 'cu_pelo_negro', peinado: 'melena', ojos: 'cu_ojo_hielo', boca: 'fauces', garras: true, musculo: 0 }, equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_blanca' } } },
  { id: 'bandido', nombre: ['Bandido', 'Bandit'], cuerpo: { piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'corto', barba: 'corta', musculo: 0.5, ojos: 'cu_ojo' }, equipo: { torso: { tipo: 'cuero', mat: 'cu_cuero' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_parda' }, arma: { tipo: 'cimitarra', mat: 'hierro_oxido', mango: 'cu_cuero' } } },
  { id: 'ballestero_oscuro', nombre: ['Ballestero oscuro', 'Dark crossbowman'], cuerpo: { piel: 'cu_piel_palida', ojos: 'cu_ojo_brasa', musculo: 0.4, peinado: 'calvo' }, equipo: { torso: { tipo: 'malla', mat: 'cu_malla' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_negra' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero_negro' }, cabeza: { tipo: 'casco', mat: 'cu_placa_oscura' }, tabardo: { mat: 'cu_tela_negra', borde: 'cu_tela_roja' }, arma: { tipo: 'ballesta', mat: 'cu_placa_oscura', mango: 'madera_vieja' } } },
  { id: 'gigante_helado', nombre: ['Gigante helado', 'Frost giant'], jefe: true, cuerpo: { alto: 2.1, ancho: 1.4, musculo: 0.9, piel: 'cu_piel_azul', pelo: 'cu_pelo_blanco', peinado: 'melena', barba: 'trenzada', ojos: 'cu_ojo_hielo', boca: 'colmillos' }, equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_pelaje_gris' }, pies: { tipo: 'vendas', mat: 'cu_pelaje_gris' }, hombros: { tipo: 'puas', mat: 'hielo' }, manos: { tipo: 'brazales', mat: 'cu_cuero_negro' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'hielo' }, arma: { tipo: 'martillo', mat: 'hielo', mango: 'cu_hueso', encanto: 'hielo' } }, huella: 3 },
  { id: 'guardia_corrupto', nombre: ['Guardia corrupto', 'Corrupted guard'], cuerpo: { piel: 'cu_piel_gris', ojos: 'cu_ojo_verde', musculo: 0.6, boca: 'colmillos' }, equipo: { torso: { tipo: 'placas', mat: 'hierro_oxido', mat2: 'cu_malla' }, piernas: { tipo: 'grebas', mat: 'hierro_oxido', mat2: 'cu_malla' }, pies: { tipo: 'sabatones', mat: 'hierro_oxido' }, cabeza: { tipo: 'casco', mat: 'hierro_oxido' }, tabardo: { mat: 'cu_tela_verde' }, arma: { tipo: 'alabarda', mat: 'hierro_oxido', mango: 'madera_vieja', encanto: 'veneno' } } },
  { id: 'sacerdote_caido', nombre: ['Sacerdote caído', 'Fallen priest'], magia: true, cuerpo: { piel: 'cu_piel_palida', ojos: 'cu_ojo_brasa', demacrado: true, heridas: true, musculo: 0.1, peinado: 'calvo' }, equipo: { torso: { tipo: 'tunica', mat: 'cu_tela_blanca' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_blanca' }, cabeza: { tipo: 'corona', mat: 'hierro_oxido', mat2: 'cu_sangre_viva' }, cinturon: { mat: 'cuerda' }, arma: { tipo: 'cetro', mango: 'hierro_oxido', gema: 'cu_sombra', encanto: 'sombra' }, izq: { tipo: 'libro', mat: 'cu_cuero_negro' } } },
  { id: 'segador', nombre: ['Segador', 'Reaper'], jefe: true, magia: true, cuerpo: { oseo: true, flota: true, alto: 1.3, piel: 'cu_hueso', ojos: 'cu_ojo_verde' }, equipo: { torso: { tipo: 'harapos', mat: 'cu_tela_negra' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_negra' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_negra' }, capa: { mat: 'cu_tela_negra' }, arma: { tipo: 'guadana', mat: 'cu_placa_oscura', mango: 'cu_hueso', encanto: 'sombra' } }, huella: 2 },
  { id: 'trol_pantano', nombre: ['Trol del pantano', 'Bog troll'], cuerpo: { alto: 1.8, ancho: 1.3, musculo: 0.7, grasa: 0.3, joroba: 0.8, piel: 'cu_piel_verde', parches: 'musgo', ojos: 'cu_ojo_brasa', orejas: 'grandes', boca: 'colmillos', garras: true, peinado: 'calvo' }, equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_tela_parda' }, arma: { tipo: 'maza', mat: 'roca', mango: 'corteza_muerta' } }, huella: 2 },
  { id: 'hechicera_sangre', nombre: ['Hechicera de sangre', 'Blood witch'], magia: true, cuerpo: { genero: 'm', piel: 'cu_piel_palida', pelo: 'cu_pelo_negro', peinado: 'largo', ojos: 'cu_ojo_brasa', musculo: 0.1 }, equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_roja' }, cabeza: { tipo: 'diadema', mat: 'hierro_oxido', mat2: 'cu_sangre_viva' }, manos: { tipo: 'guantes', mat: 'cu_cuero_negro' }, capa: { mat: 'cu_tela_negra' }, arma: { tipo: 'daga', mat: 'cu_hueso', encanto: 'sangre' }, izq: { tipo: 'orbe', mat: 'cu_sangre_viva' } } },
  { id: 'caballero_espectral', nombre: ['Caballero espectral', 'Spectral knight'], cuerpo: { flota: true, piel: 'cu_ectoplasma', ojos: 'cu_ojo_hielo', musculo: 0.5 }, equipo: { torso: { tipo: 'placas', mat: 'cu_placa_oscura', mat2: 'cu_ectoplasma' }, hombros: { tipo: 'placas', mat: 'cu_placa_oscura' }, cabeza: { tipo: 'gran_yelmo', mat: 'cu_placa_oscura', mat2: 'cu_ectoplasma' }, capa: { mat: 'cu_tela_azul' }, arma: { tipo: 'espada', mat: 'cu_ectoplasma', encanto: 'hielo' }, izq: { tipo: 'escudo_cometa', mat: 'cu_placa_oscura', mat2: 'cu_ectoplasma' } } },
  { id: 'carcelero', nombre: ['Carcelero', 'Jailer'], cuerpo: { alto: 1.2, ancho: 1.35, musculo: 0.6, grasa: 0.6, piel: 'cu_piel', parches: 'sangre', ojos: 'cu_ojo', peinado: 'calvo', boca: 'colmillos' }, equipo: { piernas: { tipo: 'pantalon', mat: 'cu_cuero_negro' }, pies: { tipo: 'botas', mat: 'cu_cuero_negro' }, cabeza: { tipo: 'mascara', mat: 'cu_cuero_negro' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'hierro_oxido' }, hombros: { tipo: 'puas', mat: 'hierro_oxido' }, arma: { tipo: 'mangual', mat: 'hierro_oxido', mango: 'madera_vieja' }, izq: { tipo: 'antorcha' } }, huella: 2 },
  { id: 'lich', nombre: ['Rey no muerto', 'Undead king'], magia: true, jefe: true, cuerpo: { oseo: true, alto: 1.25, piel: 'cu_hueso', ojos: 'cu_ojo_hielo' }, equipo: { torso: { tipo: 'tunica', mat: 'cu_tela_morada' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_morada' }, hombros: { tipo: 'puas', mat: 'cu_oro' }, cabeza: { tipo: 'corona', mat: 'cu_oro', mat2: 'cu_ojo_hielo' }, capa: { mat: 'cu_tela_negra' }, arma: { tipo: 'cetro', mango: 'cu_oro', gema: 'cu_ojo_hielo', encanto: 'sombra' }, izq: { tipo: 'orbe', mat: 'cu_ectoplasma' } }, huella: 2 },
  { id: 'verdugo', nombre: ['Verdugo', 'Executioner'], jefe: true, cuerpo: { heridas: true, alto: 1.45, ancho: 1.5, musculo: 0.7, grasa: 0.8, piel: 'cu_piel_palida', parches: 'cu_piel_gris', ojos: 'cu_ojo_brasa', peinado: 'calvo' }, equipo: { piernas: { tipo: 'pantalon', mat: 'cu_cuero_negro' }, pies: { tipo: 'botas', mat: 'cu_cuero_negro' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'hierro_oxido' }, cabeza: { tipo: 'capucha', mat: 'cu_cuero_negro' }, manos: { tipo: 'guantes', mat: 'cu_cuero_negro' }, arma: { tipo: 'hacha_doble', mat: 'hierro_oxido', mango: 'madera_vieja', encanto: 'sangre' } }, huella: 2 },
  { id: 'ogro', nombre: ['Ogro', 'Ogre'], cuerpo: { boca: 'colmillos', alto: 1.7, ancho: 1.6, musculo: 0.8, grasa: 0.7, piel: 'cu_piel_gris', ojos: 'cu_ojo', orejas: 'grandes', peinado: 'mono', pelo: 'cu_pelo_negro', cabeza: 0.9 }, equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_pelaje' }, cinturon: { mat: 'cuerda' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje' }, arma: { tipo: 'maza', mat: 'roca', mango: 'corteza' } }, huella: 2 },
  { id: 'caballero_abismo', nombre: ['Caballero del abismo', 'Abyss knight'], jefe: true, cuerpo: { alto: 1.35, ancho: 1.2, musculo: 0.8, piel: 'cu_piel_roja', ojos: 'cu_ojo_brasa', cuernos: 'demonio' }, equipo: { torso: { tipo: 'placas', mat: 'cu_placa_oscura', mat2: 'cu_lava' }, piernas: { tipo: 'grebas', mat: 'cu_placa_oscura', mat2: 'cu_malla' }, pies: { tipo: 'sabatones', mat: 'cu_placa_oscura' }, manos: { tipo: 'guanteletes', mat: 'cu_placa_oscura' }, hombros: { tipo: 'puas', mat: 'cu_placa_oscura' }, cabeza: { tipo: 'gran_yelmo', mat: 'cu_placa_oscura', mat2: 'cu_lava' }, capa: { mat: 'cu_tela_roja' }, arma: { tipo: 'mandoble', mat: 'cu_placa_oscura', encanto: 'fuego' } }, huella: 2 },
  { id: 'senor_demonio', nombre: ['Señor demonio', 'Demon lord'], jefe: true, magia: true, cuerpo: { boca: 'fauces', garras: true, alto: 2.6, ancho: 1.45, cabeza: 1.25, musculo: 1, piel: 'cu_piel_roja', ojos: 'cu_ojo_brasa', cuernos: 'demonio', cola: 'cu_piel_roja', alas: 'cu_piel_roja', orejas: 'puntiagudas', peinado: 'calvo' }, equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_cuero_negro' }, hombros: { tipo: 'puas', mat: 'cu_hueso' }, cinturon: { mat: 'cu_hueso', hebilla: 'cu_lava' }, manos: { tipo: 'brazales', mat: 'cu_placa_oscura' }, arma: { tipo: 'garras', mat: 'cu_hueso' } }, huella: 4 },
];

const ACCIONES: [Accion, [string, string]][] = [
  ['quieto', ['quieto', 'idle']], ['caminar', ['camina', 'walk']], ['correr', ['corre', 'run']], ['atacar', ['ataca', 'attack']],
  ['lanzar', ['lanza hechizo', 'cast']], ['herido', ['recibe golpe', 'get hit']], ['morir', ['muere', 'death']],
  ['presentar', ['se presenta', 'showcase']],
];
const NIVELES: [string, [string, string]][] = [['novato', ['novato', 'novice']], ['', ['veterano', 'veteran']], ['leyenda', ['leyenda', 'legend']]];

for (const h of HEROES) NIVELES.forEach(([n, [es, en]], i) => {
  for (const [acc, [aes, aen]] of ACCIONES) {
    if (acc === 'lanzar' && !h.magia) continue;
    registrar({
      id: `per_${h.id}${n ? '_' + n : ''}_${acc}`, nombre: [`${h.nombre[0]} ${es} · ${aes}`, `${h.nombre[1]} ${en} · ${aen}`], tema: 'personajes',
      // cuadros y ritmo de su clase (figura.ts, ANIM_HEROE): el mismo manifiesto que lee el juego
      variantes: [...DIRS], cuadros: ANIM_HEROE[CLASE_ESTILO[h.cuerpo.presentacion!]][acc].cuadros, t: ANIM_HEROE[CLASE_ESTILO[h.cuerpo.presentacion!]][acc].t, huella: [1, 1], bloquea: true,
      armar: (v, f) => personajeEscena(h.cuerpo, h.niveles[i], v as (typeof DIRS)[number], acc, f),
    });
  }
});
for (const m of MONSTRUOS) for (const [acc, [aes, aen]] of ACCIONES) {
  if (acc === 'lanzar' && !m.magia) continue;
  if (acc === 'presentar') continue;
  if (acc === 'correr' && (m.jefe || m.cuerpo.oseo)) continue;
  const h = m.huella ?? 1;
  registrar({
    id: `mon_${m.id}_${acc}`, nombre: [`${m.nombre[0]} · ${aes}`, `${m.nombre[1]} · ${aen}`], tema: 'monstruos',
    variantes: [...DIRS], cuadros: CUADROS[acc], t: acc === 'quieto' ? 6 : 3, huella: [h, h], bloquea: true,
    armar: (v, f) => personajeEscena(m.cuerpo, m.equipo, v as (typeof DIRS)[number], acc, f),
  });
}

/** Luz de cada clase para su retrato (un fuego o un brillo que la alumbra desde abajo y adelante). */
const LUZ_CLASE: Record<string, string> = { berserker: '#ff6020', templario: '#ffe090', arcanista: '#70b0ff', cazadora: '#a0c0ff', nigromante: '#60e080', monje: '#ffb040', druida: '#80e060', alquimista: '#c060ff' };

/**
 * Retrato grande de un héroe para la pantalla de selección y la intro: pintado a escala (no agrandado), en su pose de
 * presentación, con supersampleo y la luz de su clase. `escala` multiplica el alto (2.5 ≈ 190 px), `nivel` 0 novato,
 * 1 veterano, 2 leyenda.
 */
export function retratoHeroe(id: string, nivel = 2, cuadro = 0, o: { escala?: number; dir?: (typeof DIRS)[number]; ss?: number } = {}) {
  const h = HEROES.find((x) => x.id === id) ?? HEROES[0];
  const k = o.escala ?? 2.5;
  const e = personajeEscena({ ...h.cuerpo, alto: (h.cuerpo.alto ?? 1) * k }, h.niveles[Math.max(0, Math.min(2, nivel))], o.dir ?? 'so', 'presentar', cuadro);
  const luz = { c: [20 * k, -8 * k, 6 * k] as [number, number, number], r: 70 * k, color: LUZ_CLASE[h.id] ?? '#ffb060' };
  return pintarEscena({ ...e, resplandor: e.resplandor ?? luz, ss: o.ss ?? 2 });
}
