// Tipos del botín: bases, afijos, únicos, conjuntos, gemas y runas. Los datos van en datos/objetos_datos.ts.
import type { Equipo, TipoArma } from '../../../src/engine/gotico/cuerpo';

export type Ranura = 'cabeza' | 'torso' | 'arma' | 'izq' | 'manos' | 'cinturon' | 'pies' | 'amuleto' | 'anillo' | 'talisman';
/** Elementos de daño. 'sangre' es daño físico que sangra con el tiempo. */
export type Elemento = 'fisico' | 'fuego' | 'frio' | 'rayo' | 'veneno' | 'sombra' | 'luz' | 'sangre';
export type Clase = 'berserker' | 'templario' | 'arcanista' | 'cazadora' | 'nigromante' | 'monje' | 'druida' | 'alquimista';

/** Todas las estadísticas que puede dar un objeto. Los porcentajes van en enteros (15 = 15%). */
export type Stat =
  | 'dano_pct' // % daño físico mejorado
  | 'dano_min' | 'dano_max' // daño físico plano agregado
  | 'dano_fuego' | 'dano_frio' | 'dano_rayo' | 'dano_veneno' | 'dano_sombra' | 'dano_luz' | 'dano_sangre' // daño elemental plano (promedio por golpe)
  | 'def' | 'def_pct' // defensa plana y % defensa mejorada
  | 'vida' | 'mana' | 'fue' | 'des' | 'vit' | 'ene' | 'todos_atributos'
  | 'res_fuego' | 'res_frio' | 'res_rayo' | 'res_veneno' | 'res_sombra' | 'res_todo'
  | 'robo_vida' | 'robo_mana' // % del daño hecho
  | 'vel_ataque' | 'vel_lanzar' | 'vel_mover' | 'vel_recuperar' // %
  | 'critico' // % probabilidad de golpe crítico (doble daño)
  | 'bloqueo' // % probabilidad de bloqueo extra
  | 'regen_vida' | 'regen_mana' // vida por segundo / % regeneración de maná
  | 'mas_habilidades' // +N a todas las habilidades
  | 'mas_clase' // +N a las habilidades de la clase del objeto (va con `clase` en el objeto)
  | 'hallazgo' | 'oro_extra' // % hallazgo de objetos mágicos y oro extra
  | 'radio_luz' // +N radio de luz
  | 'precision' // +N índice de ataque
  | 'reduc_dano' // % daño físico reducido
  | 'espinas' // daño devuelto a quien te pega cuerpo a cuerpo
  | 'vida_por_muerte' | 'mana_por_muerte'
  | 'golpe_aplastante' // % de quitar 1/4 de la vida del enemigo
  | 'herida_abierta' // % de hacer sangrar
  | 'ralentizar' // % ralentiza al objetivo
  | 'aturdir' // % de aturdir
  | 'perforar' // % de que el proyectil atraviese
  | 'durabilidad_infinita' // 1 = indestructible
  | 'reduc_req' // % menos requisitos
  | 'valor' // % resistencia al terror (los sustos encogen menos la luz y llegan menos)
  | 'huecos'; // agujeros para gemas y runas (se aplica al crear)

export interface RangoStat { stat: Stat; min: number; max: number }

export interface Base {
  id: string;
  nombre: [string, string];
  ranura: Ranura;
  /** Familia para afijos y para el dibujo: 'espada', 'hacha', 'armadura', 'casco', 'escudo', 'guantes', 'botas', 'cinturon', 'anillo', 'amuleto', 'orbe', etc. */
  familia: string;
  /** Nivel del objeto desde el que puede caer (1-90) y su escalón: 0 normal, 1 excepcional, 2 de élite. */
  nivel: number;
  escalon: 0 | 1 | 2;
  req: { fue?: number; des?: number; nivel?: number };
  /** Celdas que ocupa en el inventario (ancho, alto). */
  tam: [number, number];
  dano?: [number, number];
  def?: [number, number];
  /** % de bloqueo (escudos). */
  bloqueo?: number;
  /** Velocidad base del arma: -20 rápida, 0 normal, 20 lenta (más es más lenta). */
  vel?: number;
  dosManos?: boolean;
  /** Arma a distancia (arco, ballesta) o arma para lanzar. */
  distancia?: boolean;
  /** Solo para esa clase. */
  clase?: Clase;
  durab: number;
  precio: number;
  /** Cuántos huecos puede tener como máximo. */
  huecosMax?: number;
  /** Cómo se ve puesto: la capa de equipo del motor (cuerpo.ts). Para el arma: { arma: { tipo, mat, mango, gema } }. */
  visual: Partial<Equipo>;
  /** Tipo de arma del motor si es arma (para animación y para el ícono). */
  arma?: TipoArma;
}

export interface Afijo {
  id: string;
  nombre: [string, string];
  tipo: 'prefijo' | 'sufijo';
  /** Nivel mínimo del objeto para que salga. */
  nivel: number;
  /** Dos afijos del mismo grupo no salen juntos. */
  grupo: string;
  /** Familias o ranuras donde puede salir ('arma', 'armadura', 'casco', 'escudo', 'guantes', 'botas', 'cinturon', 'anillo', 'amuleto', 'orbe', 'todas', o una familia como 'espada'). */
  donde: string[];
  stats: RangoStat[];
  /** Más peso, más común. */
  peso: number;
  /** Prefijos de arma viva: el arma toma este elemento (se ve ardiendo, helada, con chispas...). */
  vivo?: Elemento;
}

export interface Unico {
  id: string;
  nombre: [string, string];
  base: string;
  nivel: number;
  stats: RangoStat[];
  /** Una o dos líneas de historia en el tooltip, oscuras y con misterio. */
  lore: [string, string];
  /** Arma viva: el elemento con que arde o brilla. */
  vivo?: Elemento;
  /** Legendario: más raro y más fuerte (color naranja). */
  legendario?: boolean;
  /** Material que pisa al de la base para que se vea distinto (opcional). */
  mat?: string;
}

export interface PiezaConjunto { id: string; nombre: [string, string]; base: string; stats: RangoStat[] }
export interface Conjunto {
  id: string;
  nombre: [string, string];
  nivel: number;
  piezas: PiezaConjunto[];
  /** Bonos por piezas puestas (2, 3, 4...). */
  bonos: { piezas: number; stats: RangoStat[] }[];
  lore: [string, string];
}

export interface Gema {
  id: string;
  nombre: [string, string];
  /** 0 astillada ... 4 perfecta. */
  calidad: number;
  color: string;
  nivel: number;
  arma: RangoStat[];
  armadura: RangoStat[];
  escudo: RangoStat[];
}
export interface Runa { id: string; nombre: [string, string]; orden: number; nivel: number; color: string; arma: RangoStat[]; armadura: RangoStat[] }
export interface Palabra { id: string; nombre: [string, string]; runas: string[]; donde: string[]; stats: RangoStat[]; vivo?: Elemento; lore: [string, string] }
