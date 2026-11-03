import { registrar } from '../objeto';
import { armaSuelta, personajeEscena, ENCANTOS, type TipoArma, type Encanto } from '../cuerpo';
import { HEROES } from './personajes';

/**
 * Arsenal: cada arma en cada encantamiento como objeto de botín (flota girando, tirada en el piso o clavada en la
 * tierra), y maniquíes con la armadura completa de cada héroe en sus tres niveles.
 */
const ARMAS: [TipoArma, string, string, { mat: string; mango: string; gema?: string }][] = [
  ['espada', 'Espada', 'Sword', { mat: 'cu_placa', mango: 'cu_cuero' }],
  ['cimitarra', 'Cimitarra', 'Scimitar', { mat: 'cu_placa', mango: 'cu_cuero_negro' }],
  ['mandoble', 'Mandoble', 'Greatsword', { mat: 'cu_placa_oscura', mango: 'cu_cuero' }],
  ['daga', 'Daga', 'Dagger', { mat: 'cu_placa', mango: 'cu_hueso' }],
  ['hacha', 'Hacha', 'Axe', { mat: 'cu_placa_oscura', mango: 'madera' }],
  ['hacha_doble', 'Hacha doble', 'Double axe', { mat: 'cu_placa', mango: 'cu_cuero_negro' }],
  ['maza', 'Maza', 'Mace', { mat: 'cu_placa_oscura', mango: 'madera' }],
  ['martillo', 'Martillo de guerra', 'War hammer', { mat: 'cu_placa_oscura', mango: 'madera' }],
  ['mangual', 'Mangual', 'Flail', { mat: 'hierro', mango: 'madera_vieja' }],
  ['lanza', 'Lanza', 'Spear', { mat: 'cu_placa', mango: 'madera_lisa' }],
  ['alabarda', 'Alabarda', 'Halberd', { mat: 'cu_placa', mango: 'madera_lisa' }],
  ['guadana', 'Guadaña', 'Scythe', { mat: 'cu_placa_oscura', mango: 'cu_hueso' }],
  ['garras', 'Garras', 'Claws', { mat: 'cu_placa', mango: 'cu_cuero' }],
  ['varita', 'Varita', 'Wand', { mat: 'cu_hueso', mango: 'madera_lisa', gema: 'magia' }],
  ['baculo', 'Báculo', 'Staff', { mat: 'cu_placa', mango: 'madera_lisa', gema: 'magia' }],
  ['cetro', 'Cetro', 'Scepter', { mat: 'cu_oro', mango: 'cu_oro', gema: 'cu_luz_santa' }],
  ['arco', 'Arco', 'Bow', { mat: 'cu_placa', mango: 'madera_lisa' }],
  ['ballesta', 'Ballesta', 'Crossbow', { mat: 'cu_placa', mango: 'madera' }],
  // arsenal épico (actos 6 y 7, niveles altos)
  ['katana', 'Katana', 'Katana', { mat: 'cu_placa', mango: 'cu_cuero_negro' }],
  ['estoque', 'Estoque', 'Rapier', { mat: 'cu_placa', mango: 'cu_oro' }],
  ['falcata', 'Falcata', 'Falcata', { mat: 'cu_placa_oscura', mango: 'cu_hueso' }],
  ['tridente', 'Tridente', 'Trident', { mat: 'cu_bronce', mango: 'madera_lisa' }],
  ['maza_estrella', 'Lucero del alba', 'Morning star', { mat: 'cu_placa_oscura', mango: 'madera' }],
  ['arco_largo', 'Arco largo', 'Longbow', { mat: 'cu_placa', mango: 'madera_lisa' }],
  ['arco_corto', 'Arco recurvo', 'Recurve bow', { mat: 'cu_cuerno', mango: 'madera' }],
  ['jabalina', 'Jabalina', 'Javelin', { mat: 'cu_placa', mango: 'madera_lisa' }],
  ['gran_baculo', 'Gran báculo', 'Greatstaff', { mat: 'cu_oro', mango: 'madera', gema: 'magia' }],
  ['orbe_mano', 'Orbe', 'Orb', { mat: 'cu_oro', mango: 'cu_oro', gema: 'magia' }],
  ['katar', 'Katar', 'Katar', { mat: 'cu_placa', mango: 'cu_cuero' }],
  ['hoz', 'Hoz', 'Sickle', { mat: 'cu_placa_oscura', mango: 'madera_vieja' }],
  ['lanza_dragon', 'Lanza del dragón', 'Dragon lance', { mat: 'cu_draco', mango: 'cu_hueso_demonio' }],
];
const ENC: [Encanto | '', string, string][] = [['', '', ''], ...ENCANTOS.map(([id, es, en]) => [id, es, en] as [Encanto, string, string])];

for (const [tipo, es, en, o] of ARMAS) for (const [enc, ees, een] of ENC) {
  registrar({
    id: `arma_${tipo}${enc ? '_' + enc : ''}`, nombre: [`${es}${enc ? ' ' + ees : ''}`, `${en}${enc ? ' ' + een : ''}`], tema: 'armas',
    variantes: ['flota', 'suelo', 'clavada'], cuadros: 8, t: 3, huella: [1, 1], bloquea: false,
    armar: (v, f) => armaSuelta(tipo, { ...o, encanto: enc || undefined }, v as 'flota', f),
  });
}

// el cesto del monje y el frasco del alquimista (formas que solo pinta la forja): el juego hornea `arma_<forma>|suelo`
// para el botín tirado en el piso, así que llevan su objeto con esa sola variante y un cuadro, tendidos en el piso
for (const [tipo, es, en] of [['cestus', 'Cesto', 'Cestus'], ['frasco', 'Frasco', 'Flask']] as [TipoArma, string, string][]) {
  registrar({
    id: `arma_${tipo}`, nombre: [es, en], tema: 'armas', variantes: ['suelo'], cuadros: 1, t: 3, huella: [1, 1], bloquea: false,
    armar: (v, f) => armaSuelta(tipo, {}, v as 'suelo', f),
  });
}

// maniquíes: un muñeco de madera con el equipo completo de cada héroe en cada nivel
const NIV = [['novato', 'novato', 'novice'], ['veterano', 'veterano', 'veteran'], ['leyenda', 'leyenda', 'legend']] as const;
for (const h of HEROES) h.niveles.forEach((eq, i) => {
  registrar({
    id: `maniqui_${h.id}_${NIV[i][0]}`, nombre: [`Armadura de ${h.nombre[0].toLowerCase()} ${NIV[i][1]}`, `${h.nombre[1]} ${NIV[i][2]} armor`], tema: 'armas',
    variantes: ['s', 'so', 'se'], cuadros: eq.arma?.encanto ? 8 : 1, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f) => personajeEscena({ ...h.cuerpo, piel: 'madera_lisa', pelo: undefined, barba: undefined, peinado: 'calvo', ojos: 'madera_lisa', musculo: 0.3 }, eq, v as 's', 'quieto', f % 4),
  });
});
