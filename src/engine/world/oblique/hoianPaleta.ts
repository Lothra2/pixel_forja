import type { Color, Paleta } from './paleta';

/**
 * El estilo `vietnam_hoian`: Hội An de noche. La misma lista de 24 nombres de siempre, con los tonos de la ciudad
 * vieja: el amarillo de las casas encendido por los faroles, la madera oscura, las tejas de barro, el rojo y el dorado
 * de los faroles, el azul noche del río y el cielo. `canal` es el morado de los faroles de seda (en Hội An no hay canal
 * turbio), `salmon` el fucsia de la buganvilla y `menta` el verde de los faroles. La piedra de la calle queda en pardos
 * medios, tibios por la luz, para que el contorno oscuro de los atletas se lea encima.
 */
export const VIETNAM_HOIAN_NOCHE: Paleta = {
  tinta: '#140c16',
  sombra: '#2c1a22',
  asfalto: '#4a3230',
  asfalto_claro: '#6c5042',
  cemento: '#917058',
  cemento_claro: '#bc946c',
  crema: '#f2c886',
  luz: '#fff1c4',
  amarillo: '#e6b23e',
  ocre: '#ad7a2a',
  terracota: '#8c4630',
  rojo: '#e2382a',
  vino: '#6c1c26',
  salmon: '#e8509a',
  menta: '#74c864',
  verde: '#3a663a',
  verde_oscuro: '#1c3226',
  celeste: '#5a7cd6',
  cielo: '#2c3c7a',
  azul: '#1b2756',
  azul_noche: '#0e1434',
  canal: '#9452c8',
  oro: '#ffa62a',
  bruma: '#3c3466',
};

export const USO_HOIAN: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro',
  sombra: 'madera oscura de puertas y columnas, sombras hondas',
  asfalto: 'juntas de la piedra, madera en sombra, la cara de las tejas',
  asfalto_claro: 'piedra en sombra, tablas del muelle',
  cemento: 'piedra de la calle',
  cemento_claro: 'piedra con la luz de los faroles, el muelle encendido',
  crema: 'pared amarilla bajo el farol, brillos',
  luz: 'el corazón de los faroles y las velitas, la luna llena',
  amarillo: 'el amarillo de las casas de Hội An',
  ocre: 'sombra del amarillo, bambú del Tama-wari',
  terracota: 'tejas de barro, madera rojiza',
  rojo: 'faroles rojos, el puente japonés, cintas',
  vino: 'sombra del rojo y de las tejas',
  salmon: 'la buganvilla fucsia, faroles rosados, pétalos de las velitas',
  menta: 'faroles verdes, hojas con luz',
  verde: 'matas y la hoja de la buganvilla',
  verde_oscuro: 'sombra de las matas, palmas de lejos',
  celeste: 'faroles azules, brillo del río, el equipo azul',
  cielo: 'cielo bajo, el río con luz',
  azul: 'cielo del medio y el río Thu Bồn',
  azul_noche: 'cielo alto, el río en sombra',
  canal: 'faroles morados',
  oro: 'faroles dorados, ventanas encendidas y su reflejo en el río',
  bruma: 'el resplandor de la ciudad vieja en el cielo, el halo de la luna',
};

/** Las horas que el estilo ya sabe pintar. Hội An, por ahora, solo de noche. */
export const HORAS_HOIAN = ['noche'];
