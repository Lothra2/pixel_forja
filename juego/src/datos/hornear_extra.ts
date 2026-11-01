// Monstruos propios del juego armados con los cuerpos del motor (cuerpo.ts), y el equipo con que arranca cada clase.
// Se hornean junto con los monstruos del catálogo.
import type { Cuerpo, Equipo } from '../../../src/engine/gotico/cuerpo';

export interface MonstruoExtra { id: string; nombre: [string, string]; cuerpo: Cuerpo; equipo: Equipo; magia?: boolean; jefe?: boolean; huella?: number }

export const MONSTRUOS_EXTRA: MonstruoExtra[] = [
  // Acto 1: el valle de Velmora y la abadía
  { id: 'penitente', nombre: ['Penitente', 'Penitent'], cuerpo: { piel: 'cu_piel_palida', parches: 'cu_piel_gris', ojos: 'cu_ojo_brasa', joroba: 0.5, musculo: 0.3, peinado: 'calvo' },
    equipo: { torso: { tipo: 'harapos', mat: 'cu_tela_parda' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_parda' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_negra' }, cinturon: { mat: 'cuerda' }, arma: { tipo: 'mangual', mat: 'hierro_oxido', mango: 'madera_vieja' } } },
  { id: 'monja_hueca', nombre: ['Monja hueca', 'Hollow nun'], magia: true, cuerpo: { genero: 'm', piel: 'cu_piel_palida', ojos: 'cu_ojo_hielo', musculo: 0, ancho: 0.9, peinado: 'calvo' },
    equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_negra' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_negra' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_blanca' }, manos: { tipo: 'vendas', mat: 'cu_venda' }, izq: { tipo: 'libro', mat: 'cu_cuero_negro' }, arma: { tipo: 'varita', mango: 'cu_hueso', gema: 'cu_ojo_hielo' } } },
  { id: 'ahogado', nombre: ['Ahogado', 'Drowned'], cuerpo: { piel: 'cu_piel_azul', parches: 'cu_piel_verde', ojos: 'cu_ojo_verde', grasa: 0.9, joroba: 0.4, ancho: 1.15, peinado: 'largo', pelo: 'cu_pelo_negro' },
    equipo: { torso: { tipo: 'harapos', mat: 'cu_tela_azul' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_negra' }, arma: { tipo: 'garras', mat: 'cu_hueso' } } },
  { id: 'abadesa', nombre: ['La Abadesa Ilvara', 'Abbess Ilvara'], jefe: true, magia: true, huella: 2,
    cuerpo: { genero: 'm', alto: 1.45, ancho: 1.05, piel: 'cu_piel_palida', ojos: 'cu_ojo_brasa', musculo: 0.1, peinado: 'largo', pelo: 'cu_pelo_blanco', alas: 'cu_tela_negra' },
    equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_roja' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_roja' }, hombros: { tipo: 'huesos', mat: 'cu_hueso' }, cabeza: { tipo: 'corona', mat: 'cu_oro', mat2: 'cu_ojo_brasa' }, capa: { mat: 'cu_tela_negra', largo: 1 }, arma: { tipo: 'cetro', mango: 'cu_oro', gema: 'cu_lava' }, izq: { tipo: 'orbe', mat: 'cu_lava' } } },
  // Acto 2: el desierto de Sahrim
  { id: 'saqueador', nombre: ['Saqueador de tumbas', 'Tomb raider'], cuerpo: { piel: 'cu_piel_morena', ojos: 'cu_ojo', musculo: 0.55, barba: 'corta', pelo: 'cu_pelo_negro', peinado: 'corto' },
    equipo: { torso: { tipo: 'cuero', mat: 'cu_cuero' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'sandalias', mat: 'cu_cuero' }, cabeza: { tipo: 'turbante', mat: 'cu_tela_blanca' }, cinturon: { mat: 'cu_tela_roja' }, arma: { tipo: 'cimitarra', mat: 'cu_placa' } } },
  { id: 'chacal', nombre: ['Sacerdote chacal', 'Jackal priest'], magia: true, cuerpo: { piel: 'cu_pelaje', ojos: 'cu_ojo_brasa', orejas: 'puntiagudas', cabeza: 1.1, musculo: 0.4, peinado: 'calvo', pelo: 'cu_pelaje', cola: 'cu_pelaje' },
    equipo: { torso: { tipo: 'sin_mangas', mat: 'cu_tela_blanca' }, piernas: { tipo: 'faldon', mat: 'cu_tela_blanca', mat2: 'cu_oro' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, arma: { tipo: 'cetro', mango: 'cu_oro', gema: 'fuego_verde' } } },
  { id: 'rey_sin_sombra', nombre: ['Khamer-Ul, el Rey sin Sombra', 'Khamer-Ul, the Shadowless King'], jefe: true, magia: true, huella: 2,
    cuerpo: { piel: 'cu_venda', parches: 'cu_piel_gris', ojos: 'cu_ojo_verde', alto: 1.5, ancho: 1.2, musculo: 0.4, peinado: 'calvo' },
    equipo: { torso: { tipo: 'placas', mat: 'cu_oro', mat2: 'cu_venda' }, piernas: { tipo: 'faldon', mat: 'cu_tela_azul', mat2: 'cu_venda' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, cabeza: { tipo: 'mascara', mat: 'cu_oro' }, capa: { mat: 'cu_tela_azul' }, arma: { tipo: 'guadana', mat: 'cu_oro', mango: 'cu_placa_oscura' } } },
  // Acto 3: la selva de Yhuantl
  { id: 'cazacabezas', nombre: ['Cazacabezas', 'Headhunter'], cuerpo: { piel: 'cu_piel_morena', ojos: 'cu_ojo_brasa', musculo: 0.7, alto: 0.9, peinado: 'cresta', pelo: 'cu_pelo_rojo' },
    equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_pelaje' }, cabeza: { tipo: 'mascara', mat: 'cu_hueso' }, hombros: { tipo: 'huesos', mat: 'cu_hueso' }, arma: { tipo: 'lanza', mat: 'cu_hueso', mango: 'madera_vieja' } } },
  { id: 'hombre_cienaga', nombre: ['Hombre ciénaga', 'Bog man'], cuerpo: { piel: 'cu_piel_verde', parches: 'cu_pelaje', ojos: 'cu_ojo_verde', alto: 1.2, ancho: 1.3, musculo: 0.6, grasa: 0.5, joroba: 0.8, peinado: 'calvo' },
    equipo: { hombros: { tipo: 'pieles', mat: 'cu_piel_verde' }, arma: { tipo: 'garras', mat: 'corteza_muerta' } } },
  { id: 'madre_cienaga', nombre: ['Madre Ciénaga', 'Mother Mire'], jefe: true, magia: true, huella: 3,
    cuerpo: { genero: 'm', piel: 'cu_piel_verde', ojos: 'cu_ojo_verde', alto: 2.0, ancho: 1.3, joroba: 0.9, grasa: 0.6, pelo: 'cu_pelo_blanco', peinado: 'largo', orejas: 'grandes', cuernos: 'carnero' },
    equipo: { torso: { tipo: 'harapos', mat: 'cu_tela_verde' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_negra' }, hombros: { tipo: 'huesos', mat: 'cu_hueso' }, arma: { tipo: 'baculo', mango: 'corteza_muerta', gema: 'fuego_verde' } } },
  // Acto 4: los picos de Hrimgard
  { id: 'escarchado', nombre: ['Escarchado', 'Frostbitten'], cuerpo: { piel: 'cu_piel_azul', parches: 'cu_piel_palida', ojos: 'cu_ojo_hielo', musculo: 0.6, ancho: 1.1, barba: 'larga', pelo: 'cu_pelo_blanco', peinado: 'melena' },
    equipo: { torso: { tipo: 'cuero', mat: 'cu_pelaje_gris' }, piernas: { tipo: 'pantalon', mat: 'cu_pelaje_gris' }, pies: { tipo: 'botas', mat: 'cu_pelaje' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje_gris' }, arma: { tipo: 'hacha', mat: 'cu_ojo_hielo', mango: 'madera_vieja' } } },
  { id: 'rey_escarcha', nombre: ['Hjaldur, el Rey de Escarcha', 'Hjaldur, the Frost King'], jefe: true, magia: true, huella: 2,
    cuerpo: { oseo: true, alto: 1.6, ancho: 1.3, piel: 'cu_hueso', ojos: 'cu_ojo_hielo' },
    equipo: { torso: { tipo: 'placas', mat: 'cu_placa', mat2: 'cu_ojo_hielo' }, hombros: { tipo: 'puas', mat: 'cu_ojo_hielo' }, cabeza: { tipo: 'corona', mat: 'cu_placa', mat2: 'cu_ojo_hielo' }, capa: { mat: 'cu_tela_azul' }, arma: { tipo: 'mandoble', mat: 'cu_ojo_hielo' } } },
  // Acto 5: la Herida (infierno)
  { id: 'carcelero', nombre: ['Carcelero del abismo', 'Abyss jailer'], cuerpo: { piel: 'cu_piel_roja', ojos: 'cu_ojo_brasa', cuernos: 'demonio', alto: 1.25, ancho: 1.3, musculo: 0.9, cola: 'cu_piel_roja', peinado: 'calvo' },
    equipo: { piernas: { tipo: 'taparrabo', mat: 'cu_cuero_negro' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'hierro_oxido' }, manos: { tipo: 'guanteletes', mat: 'cu_placa_oscura' }, arma: { tipo: 'martillo', mat: 'cu_placa_oscura', mango: 'cu_placa_oscura' } } },
];

/** El equipo con que arranca cada clase: el nivel novato del motor. */
export function equipoInicial(_id: string, novato: Equipo): Equipo { return novato; }
