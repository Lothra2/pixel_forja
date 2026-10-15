import type { RecetaMundo } from './index';
import { bosqueMonumentos } from './bosque';
import { catedralMonumentos } from './catedral';

/**
 * Las recetas de los siete mundos: cómo se repinta el piso, qué monumento va en cada zona y la luz de cada zona.
 * Dirección de arte: cálido y mágico en el Bosque, verde enfermizo con oro en la Catedral, azul cristal en las
 * Galerías, gris niebla con faro dorado en el Puerto, ocre y violeta de sueño en la Ciudad, naranja brasa en la
 * Fragua y azul hielo con el rojo del Diablo en el Corazón.
 */

export const BOSQUE: RecetaMundo = {
  mundo: 'mundo1',
  estricto: true,
  niebla: '#d8e0c8',
  piso: {
    semilla: 101,
    macro: { claro: '#c8c060', oscuro: '#0a2a2a', fuerza: 0.12 },
    manchas: [
      { color: '#2e5a2a', kinds: [0], cantidad: 0.28, escala: 60, fuerza: 0.32 },
      { color: '#6a5a3a', kinds: [0], cantidad: 0.1, escala: 36, fuerza: 0.3 },
      { color: '#8a5a24', kinds: [0, 1], cantidad: 0.14, escala: 30, fuerza: 0.22 },
      { color: '#4a6a2a', kinds: [2, 3, 5], cantidad: 0.3, escala: 26, fuerza: 0.4 },
    ],
    grietas: { kinds: [2, 3, 5], densidad: 3, oscuro: '#141412', canto: '#9a9484' },
    raices: { kinds: [1], densidad: 0.6, colores: ['#24160e', '#4a3420', '#7a5a38'] },
    charcos: { kinds: [1], densidad: 0.7, fondo: '#2a4a5a', brillo: '#d8eef8' },
    sueltos: [
      { kinds: [1, 2], densidad: 3, dibujo: 'piedrita', colores: ['#5a564c', '#6e6a5e', '#4a4238'] },
      { kinds: [0, 1], densidad: 7, dibujo: 'hoja', colores: ['#a85a1c', '#c8842a', '#6a3a14', '#d0a040'] },
      { kinds: [0, 1], densidad: 4, dibujo: 'ramita', colores: ['#4a3420', '#6a4a2a'] },
      { kinds: [0], densidad: 10, dibujo: 'petalo', colores: ['#e87a9a', '#f0d040', '#c8c0ff', '#ffffff'] },
    ],
    desgaste: { claro: '#9a7a54', fuerza: 0.25 },
    bordes: [0, 1, 2, 5],
  },
  monumentos: bosqueMonumentos,
  luz: {
    mundo: { rayos: '-22,#ffe9a8,0.6', grado: '#1a2a22,#ffe2a0,1.08,1.1' },
    zonas: {
      'Claro de la Llegada': { rayos: '-22,#ffe9a8,0.65', grado: '#1c2a24,#ffe6b0,1.06,1.12', particulas: 'polen,mariposas' },
      'Pradera de las Mariposas': { rayos: '-18,#fff0c0,0.7', grado: '#22302a,#fff2c8,1.04,1.18', particulas: 'mariposas,polen' },
      'El Abuelo Roble': { rayos: '-25,#ffd890,0.75', grado: '#1a2418,#ffd8a0,1.1,1.08', particulas: 'hojas,luciernagas' },
      'Bosque Profundo': { rayos: '-30,#b8e0c8,0.25', grado: '#0a141c,#a8c8e8,1.18,0.92', particulas: 'luciernagas,esporas,fuegos_fatuos,murcielagos' },
      'Anillo de las Hadas': { rayos: '-10,#a8fff0,0.45', grado: '#0e1a24,#a8fff0,1.14,1.15', particulas: 'luciernagas_turquesa,brillos,fuegos_fatuos' },
      'Claro Escondido': { rayos: '-15,#e8c8ff,0.5', grado: '#160e24,#e0c8ff,1.12,1.1', particulas: 'brillos,luciernagas,mariposas' },
      'Arroyo Cristalino': { rayos: '-20,#e0f4ff,0.5', grado: '#10202a,#e0f0ff,1.06,1.05', particulas: 'gotas,luciernagas' },
      'Lago Espejo': { rayos: '-24,#ffe9c0,0.55', grado: '#0e1e2a,#ffe8c8,1.06,1.06', particulas: 'luciernagas,mariposas' },
      'Ruinas del Viejo Reino': { rayos: '-28,#ffd8a8,0.6', grado: '#1e1a18,#ffd8b0,1.12,0.95', particulas: 'polvo,hojas' },
      'Colina de los Goblins': { rayos: '-20,#ffc890,0.5', grado: '#24180e,#ffc890,1.12,1.0', particulas: 'humo,polvo' },
      'Campo de Calabazas': { rayos: '-35,#ffb060,0.65', grado: '#24140a,#ffc080,1.1,1.12', particulas: 'hojas,luciernagas' },
      'Las Alturas': { rayos: '-15,#fff4d8,0.8', grado: '#1e2a30,#fff8e0,1.05,1.08', particulas: 'polen,hojas' },
      'Arena del Minotauro': { rayos: '0,#ffb08a,0.3', grado: '#1a0e0a,#ffb08a,1.2,1.05', particulas: 'brasas,polvo' },
    },
  },
};

export const CATEDRAL: RecetaMundo = {
  mundo: 'mundo2',
  niebla: '#b8d0a8',
  piso: {
    semilla: 202,
    macro: { claro: '#c8b060', oscuro: '#0e2a1e', fuerza: 0.11 },
    manchas: [
      { color: '#3a5a2a', kinds: [0, 2, 5], cantidad: 0.24, escala: 44, fuerza: 0.32 },
      { color: '#0e1a1a', kinds: [0, 2], cantidad: 0.2, escala: 60, fuerza: 0.3 },
      { color: '#8a7a2a', kinds: [2], cantidad: 0.07, escala: 24, fuerza: 0.28 },
      { color: '#4a6a3a', kinds: [3, 6], cantidad: 0.25, escala: 30, fuerza: 0.25 },
    ],
    grietas: { kinds: [0, 2, 5], densidad: 6, oscuro: '#0c100e', canto: '#9aa08a' },
    raices: { kinds: [0, 2], densidad: 0.9, colores: ['#22160e', '#4a321c', '#7a5a36'] },
    charcos: { kinds: [0, 2], densidad: 0.6, fondo: '#1a3a34', brillo: '#8affe8' },
    sueltos: [
      { kinds: [0, 2, 5], densidad: 3, dibujo: 'piedrita', colores: ['#5a6058', '#6e746a', '#484c44'] },
      { kinds: [0, 2], densidad: 1, dibujo: 'papel', colores: ['#a89a78', '#8a7e60'] },
      { kinds: [0, 2], densidad: 3, dibujo: 'hoja', colores: ['#6a5a2a', '#8a7a3a', '#4a3a1a'] },
      { kinds: [0, 2], densidad: 1.5, dibujo: 'esquirla', colores: ['#c8a040', '#3aa088', '#6a3aa0'] },
    ],
    bordes: [0, 2, 5],
  },
  monumentos: catedralMonumentos,
  luz: {
    mundo: { rayos: '-15,#d8f0a0,0.45', grado: '#1a2a22,#ffd9a0,1.12,0.9' },
    zonas: {
      'La Escalera Hundida': { rayos: '-12,#e8f0c8,0.55', grado: '#18241e,#ffe0b0,1.08,0.92', particulas: 'polvo,esporas' },
      'El Atrio de las Luciérnagas': { rayos: '-8,#8affe8,0.4', grado: '#0e2420,#c8ffe0,1.1,0.95', particulas: 'luciernagas_turquesa,gotas' },
      'Los Claustros Quebrados': { rayos: '-20,#d0e090,0.5', grado: '#1a2a1a,#ffd890,1.14,0.88', particulas: 'polvo,esporas,gotas' },
      'La Capilla Escondida': { rayos: '-5,#ffd070,0.6', grado: '#1a1a10,#ffe0a0,1.12,0.95', particulas: 'luciernagas_turquesa,brillos' },
      'La Nave Inundada': { rayos: '-18,#a0d0c0,0.35', grado: '#0a1a1e,#b0e0d0,1.1,0.85', particulas: 'gotas,luciernagas_turquesa' },
      'La Forja Apagada': { rayos: '0,#ffb070,0.25', grado: '#1e140e,#ffc890,1.15,0.9', particulas: 'ceniza,polvo' },
      'El Campanario Invertido': { rayos: '0,#c8a0ff,0.2', grado: '#140e1e,#ffd9a0,1.18,0.88', particulas: 'esporas,gotas' },
    },
  },
};

export const RECETAS: Record<string, RecetaMundo> = { mundo1: BOSQUE, mundo2: CATEDRAL };
