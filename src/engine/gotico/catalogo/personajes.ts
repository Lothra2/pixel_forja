import { registrar } from '../objeto';
import { MATERIALES } from '../materiales';
import { figura, DIRS, CUADROS, type Atuendo, type Accion } from '../figura';

// Personajes y monstruos en 8 direcciones con sus acciones animadas (quieto, caminar, atacar, lanzar, morir).
// Cada uno se registra por acción: las variantes son las 8 direcciones.

MATERIALES.per_piel = { rampa: ['#24160f', '#3c2519', '#573726', '#734a34', '#8e5f44', '#a87556', '#bf8c6a'], ruido: 0.08, escala: 0.3 };
MATERIALES.per_piel_palida = { rampa: ['#24201e', '#3e3734', '#5a514b', '#776c64', '#93877d', '#ada196', '#c4b9ae'], ruido: 0.08, escala: 0.3 };
MATERIALES.per_piel_morena = { rampa: ['#1a0f0a', '#2b1a11', '#3f271a', '#543524', '#6a442f', '#80553b'], ruido: 0.08, escala: 0.3 };
MATERIALES.per_pelo_negro = { rampa: ['#0b0807', '#17110d', '#241a14', '#33261d', '#433227'], ruido: 0.3, escala: 0.8 };
MATERIALES.per_pelo_rubio = { rampa: ['#2e2210', '#4c3a1c', '#6d5528', '#8f7136', '#ae8c47', '#c8a85c'], ruido: 0.3, escala: 0.8 };
MATERIALES.per_pelo_rojo = { rampa: ['#1e0a06', '#35120a', '#4e1b0f', '#692615', '#84321c', '#9d4126'], ruido: 0.3, escala: 0.8 };
MATERIALES.per_pelo_blanco = { rampa: ['#3a3836', '#5a5652', '#7a756f', '#9a948c', '#b8b1a8', '#d2cbc2'], ruido: 0.3, escala: 0.8 };
MATERIALES.per_piel_zombi = { rampa: ['#121610', '#20271b', '#2f3827', '#3f4a33', '#505d40', '#62704e'], ruido: 0.25, escala: 0.4 };
MATERIALES.per_piel_diablo = { rampa: ['#1e0806', '#360e0a', '#50150e', '#6c1e13', '#882919', '#a23722'], ruido: 0.2, escala: 0.4 };
MATERIALES.per_ojo_brasa = { rampa: ['#c04010', '#f08020', '#ffd060'], ruido: 0, escala: 1, emite: true };
MATERIALES.per_ojo_hielo = { rampa: ['#2a70c0', '#60b0ff', '#d0f0ff'], ruido: 0, escala: 1, emite: true };
MATERIALES.per_venda = { rampa: ['#2a261c', '#433c2d', '#5e5541', '#7a6f56', '#958a6e', '#ada287'], ruido: 0.35, escala: 0.9, patron: (p) => ((Math.floor(p[2] * 0.9 + p[0] * 0.3) % 2) ? -0.08 : 0.04) };
MATERIALES.per_pelaje = { rampa: ['#1a120c', '#2c2015', '#40301f', '#55412b', '#6b5338', '#826747'], ruido: 0.5, escala: 0.7 };

const CLASES: { id: string; nombre: [string, string]; at: Atuendo; monstruo?: boolean; acciones?: Accion[] }[] = [
  { id: 'barbaro', nombre: ['Bárbaro', 'Barbarian'], at: { ancho: 1.22, alto: 1.03, piel: 'per_piel', pelo: 'per_pelo_negro', peinado: 'melena', torso: 'per_piel', torsoDesnudo: true, piernas: 'per_pelaje', botas: 'cuero', guantes: 'cuero', hombreras: 'per_pelaje', cinturon: 'cuero', casco: 'cuernos', cascoMat: 'hierro', arma: 'hacha', armaMat: 'hierro', falda: { mat: 'per_pelaje', largo: 9, ancho: 1.05 } } },
  { id: 'paladin', nombre: ['Paladín', 'Paladin'], at: { ancho: 1.12, piel: 'per_piel', torso: 'hierro', peto: 'acero', piernas: 'hierro', botas: 'hierro', guantes: 'hierro', hombreras: 'acero', casco: 'yelmo', cascoMat: 'acero', tabardo: 'tela_azul', capa: 'tela_azul', cinturon: 'cuero', arma: 'espada', escudo: 'cometa', escudoMat: 'tela_azul' } },
  { id: 'hechicera', nombre: ['Hechicera', 'Sorceress'], at: { ancho: 0.88, piel: 'per_piel', pelo: 'per_pelo_rojo', peinado: 'largo', torso: 'tela_morada', piernas: 'tela_morada', botas: 'cuero', falda: { mat: 'tela_morada', largo: 28, ancho: 1.7 }, cinturon: 'oro', arma: 'baculo' } },
  { id: 'amazona', nombre: ['Amazona', 'Amazon'], at: { ancho: 0.92, alto: 1.02, piel: 'per_piel_morena', pelo: 'per_pelo_rubio', peinado: 'cola', torso: 'cuero', piernas: 'per_piel_morena', botas: 'cuero', guantes: 'cuero', hombreras: 'bronce', cinturon: 'cuero', falda: { mat: 'cuero', largo: 9, ancho: 1.2 }, arma: 'arco', casco: 'cofia', cascoMat: 'bronce' } },
  { id: 'nigromante', nombre: ['Nigromante', 'Necromancer'], at: { ancho: 0.9, piel: 'per_piel_palida', pelo: 'per_pelo_blanco', peinado: 'corto', torso: 'tela', piernas: 'tela', botas: 'cuero', falda: { mat: 'tela', largo: 18, ancho: 1.3 }, capa: 'negro', cinturon: 'cuero', hombreras: 'hueso', arma: 'daga', armaMat: 'hueso' } },
  { id: 'asesina', nombre: ['Asesina', 'Assassin'], at: { ancho: 0.9, piel: 'per_piel', torso: 'cuero', piernas: 'tela', botas: 'cuero', guantes: 'cuero', casco: 'capucha', cascoMat: 'tela_roja', capa: 'tela_roja', cinturon: 'cuero', arma: 'garras' } },
  { id: 'druida', nombre: ['Druida', 'Druid'], at: { ancho: 1.1, piel: 'per_piel', pelo: 'per_pelo_rubio', peinado: 'largo', barba: true, torso: 'tela_verde', piernas: 'cuero', botas: 'cuero', capa: 'per_pelaje', hombreras: 'per_pelaje', cinturon: 'cuero', arma: 'baculo', casco: 'corona' } },
  { id: 'guerrero', nombre: ['Guerrero', 'Warrior'], at: { ancho: 1.08, piel: 'per_piel', pelo: 'per_pelo_negro', peinado: 'corto', barba: true, torso: 'hierro', piernas: 'cuero', botas: 'cuero', guantes: 'cuero', hombreras: 'hierro', cinturon: 'cuero', tabardo: 'tela_roja', arma: 'mandoble' } },
  // monstruos
  { id: 'esqueleto', monstruo: true, nombre: ['Esqueleto', 'Skeleton'], at: { hueso: true, piel: 'hueso', torso: 'hueso', piernas: 'hueso', botas: 'hueso', arma: 'espada', armaMat: 'hierro_oxido', escudo: 'redondo', escudoMat: 'madera_vieja', ojos: 'per_ojo_brasa' } },
  { id: 'zombi', monstruo: true, nombre: ['Zombi', 'Zombie'], at: { ancho: 1.05, piel: 'per_piel_zombi', pelo: 'per_pelo_negro', peinado: 'calvo', torso: 'tela', piernas: 'tela', botas: 'per_piel_zombi', joroba: 1, arma: 'nada', ojos: 'per_ojo_brasa' } },
  { id: 'diablillo', monstruo: true, nombre: ['Diablillo', 'Imp'], at: { alto: 0.62, ancho: 0.8, piel: 'per_piel_diablo', torso: 'per_piel_diablo', torsoDesnudo: true, piernas: 'per_piel_diablo', botas: 'per_piel_diablo', cuernos: true, falda: { mat: 'cuero', largo: 6, ancho: 1.1 }, arma: 'lanza', armaMat: 'hierro_oxido', ojos: 'per_ojo_brasa' } },
  { id: 'demonio', monstruo: true, nombre: ['Demonio grande', 'Greater demon'], at: { alto: 1.9, ancho: 1.5, piel: 'per_piel_diablo', torso: 'per_piel_diablo', torsoDesnudo: true, piernas: 'per_piel_diablo', botas: 'roca_roja', guantes: 'roca_roja', hombreras: 'roca_roja', cuernos: true, arma: 'nada', ojos: 'per_ojo_brasa', joroba: 0.6 } },
  { id: 'momia', monstruo: true, nombre: ['Momia', 'Mummy'], at: { ancho: 0.95, piel: 'per_venda', pelo: 'per_venda', peinado: 'calvo', torso: 'per_venda', piernas: 'per_venda', botas: 'per_venda', guantes: 'per_venda', joroba: 0.4, arma: 'nada', ojos: 'per_ojo_brasa' } },
  { id: 'hombre_cabra', monstruo: true, nombre: ['Hombre cabra', 'Goat man'], at: { ancho: 1.1, alto: 1.05, piel: 'per_pelaje', torso: 'per_pelaje', torsoDesnudo: true, piernas: 'per_pelaje', botas: 'negro', cuernos: true, barba: true, pelo: 'per_pelaje', peinado: 'calvo', cinturon: 'cuero', arma: 'lanza', armaMat: 'hierro_oxido', ojos: 'per_ojo_brasa' } },
  { id: 'chaman', monstruo: true, nombre: ['Chamán', 'Shaman'], at: { alto: 0.7, ancho: 0.85, piel: 'per_piel_diablo', torso: 'tela_verde', piernas: 'per_piel_diablo', botas: 'per_piel_diablo', casco: 'capucha', cascoMat: 'tela_verde', falda: { mat: 'tela_verde', largo: 14, ancho: 1.3 }, arma: 'baculo', ojos: 'per_ojo_brasa', cuernos: true } },
  { id: 'caballero_muerto', monstruo: true, nombre: ['Caballero muerto', 'Dead knight'], at: { hueso: true, alto: 1.06, piel: 'hueso', torso: 'hueso', piernas: 'hueso', botas: 'hierro_oxido', casco: 'yelmo', cascoMat: 'hierro_oxido', hombreras: 'hierro_oxido', arma: 'mandoble', armaMat: 'hierro_oxido', escudo: 'torre', escudoMat: 'hierro_oxido', ojos: 'per_ojo_hielo' } },
  { id: 'espectro', monstruo: true, nombre: ['Espectro helado', 'Frost wraith'], at: { ancho: 0.95, piel: 'per_piel_palida', torso: 'tela_azul', piernas: 'tela_azul', botas: 'tela_azul', casco: 'capucha', cascoMat: 'tela_azul', falda: { mat: 'tela_azul', largo: 30, ancho: 1.6 }, arma: 'orbe', ojos: 'per_ojo_hielo' } },
];

const ACCIONES: [Accion, [string, string]][] = [['quieto', ['quieto', 'idle']], ['caminar', ['camina', 'walk']], ['atacar', ['ataca', 'attack']], ['lanzar', ['lanza hechizo', 'cast']], ['morir', ['muere', 'death']]];
for (const c of CLASES) for (const [acc, [es, en]] of ACCIONES) {
  if (acc === 'lanzar' && !['hechicera', 'nigromante', 'druida', 'espectro', 'paladin', 'chaman'].includes(c.id)) continue;
  registrar({
    id: `${c.monstruo ? 'mon' : 'per'}_${c.id}_${acc}`, nombre: [`${c.nombre[0]} · ${es}`, `${c.nombre[1]} · ${en}`], tema: c.monstruo ? 'monstruos' : 'personajes',
    variantes: [...DIRS], cuadros: CUADROS[acc], t: acc === 'quieto' ? 6 : 3, huella: [1, 1], bloquea: true,
    armar: (v, f) => figura(c.at, v as (typeof DIRS)[number], acc, f),
  });
}
