import { MATERIALES } from './materiales';
import { armaduraDeLinea, LINEAS_CUERPO, MAT_LINEA, type Equipo, type LineaCuerpo } from './cuerpo';
import { iconoDeLoot, type Icono3D, type Linea } from './iconos3d';
import type { LootItem } from '../loot/catalog';

/**
 * Lo que el jugador lleva puesto en el inventario es lo que se ve en su cuerpo: cada objeto equipado se traduce
 * a la pieza de `Equipo` que arma cuerpo.ts, con su línea (tela, cuero, malla, placas, hueso, sagrado, oscuro,
 * legendario y las épicas: escamas, dracónica, élfica, demoníaca, celestial y ahogada), su nivel y sus colores reales del diseño del botín. Lo que no está equipado cae a la ropa base.
 *
 * Uso: `equipoDeInventario(puesto, base)` donde `puesto` son las casillas del inventario (casco, pecho, guantes,
 * cinturon, botas, arma, mano_libre...) y `base` es la ropa de debajo de la clase (por ejemplo su nivel novato).
 */

export interface Puesto { it: LootItem; arma3d?: NonNullable<Equipo['arma']>; icono3d?: Icono3D }

const M = MATERIALES;
const hex = (h: string): [number, number, number] => { const s = h.replace('#', ''); const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const aHex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const esHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{3,6}$/i.test(v);

/** Registra (una vez) un material teñido con el color exacto del diseño: tela, cuero o metal. */
export function tinte(color: string, tipo: 'tela' | 'cuero' | 'metal' = 'tela'): string {
  const id = `cu_tinte_${tipo}_${color.replace('#', '').toLowerCase()}`;
  if (M[id]) return id;
  const c = hex(color), pasos = tipo === 'metal' ? 8 : 7;
  // rampa de la sombra casi negra (teñida) al color y un poco más claro en las crestas
  const rampa = Array.from({ length: pasos }, (_, i) => { const t = i / (pasos - 1); const k = 0.1 + t * (tipo === 'metal' ? 1.25 : 1.05); return aHex(c.map((v) => v * k + (tipo === 'metal' ? t * t * 40 : 0))); });
  M[id] = tipo === 'metal' ? { rampa, ruido: 0.06, escala: 1, brillo: 0.45 } : tipo === 'cuero' ? { rampa, ruido: 0.2, escala: 0.8, brillo: 0.08 } : { rampa, ruido: 0.12, escala: 1.2 };
  return id;
}

/** Metal y material de cada línea de armadura (con el color del diseño si lo trae). */
function matDe(linea: Linea | undefined, d: Icono3D, parte: 'tela' | 'cuero' | 'metal' = 'metal'): { mat: string; mat2?: string } {
  const color = esHex(d.color) ? d.color : undefined;
  switch (linea) {
    case 'tela': return { mat: color ? tinte(color, 'tela') : 'cu_tela_parda' };
    case 'cuero': return { mat: color ? tinte(color, 'cuero') : 'cu_cuero' };
    case 'tachonado': return { mat: color ? tinte(color, 'cuero') : 'cu_cuero_negro' };
    case 'malla': return { mat: 'cu_malla' };
    case 'placas': return { mat: 'cu_placa', mat2: 'cu_malla' };
    case 'hueso': return { mat: 'cu_hueso', mat2: 'cu_cuero_negro' };
    case 'sagrado': return { mat: 'cu_placa', mat2: 'cu_oro' };
    case 'oscuro': return { mat: 'cu_placa_oscura', mat2: 'cu_malla' };
    case 'legendario': return { mat: color && parte === 'metal' ? tinte(color, 'metal') : color ? tinte(color, parte) : 'cu_oro', mat2: 'cu_oro' };
    case 'escamas': case 'draconica': case 'elfica': case 'demoniaca': case 'celestial': case 'ahogada': return { mat: MAT_LINEA[linea].placa, mat2: MAT_LINEA[linea].base };
    default: return { mat: 'cu_cuero' };
  }
}

const descDe = (p: Puesto): Icono3D | null => p.icono3d ?? iconoDeLoot(p.it);
/** Las líneas épicas: cada pieza sale con sus formas propias (ver `armaduraDeLinea`). */
const epica = (l?: Linea): l is LineaCuerpo => !!l && (LINEAS_CUERPO as string[]).includes(l);
const duro = (l?: Linea) => l === 'placas' || l === 'sagrado' || l === 'oscuro' || l === 'legendario' || epica(l);

/** Traduce las casillas del inventario a lo que se ve puesto en el cuerpo. */
export function equipoDeInventario(puesto: Partial<Record<string, Puesto | undefined>>, base: Equipo = {}): Equipo {
  const e: Equipo = { torso: base.torso, piernas: base.piernas, pies: base.pies, cinturon: base.cinturon, capa: base.capa, tabardo: undefined };
  // ---- cabeza
  const cab = puesto.casco && descDe(puesto.casco);
  if (cab) {
    const m = matDe(cab.linea, cab), n = cab.nivel ?? 2;
    if (cab.pieza === 'corona') e.cabeza = { tipo: 'corona', mat: cab.metal && esHex(cab.metal) ? tinte(cab.metal, 'metal') : 'cu_oro', mat2: cab.gema && esHex(cab.gema) ? tinte(cab.gema, 'metal') : undefined };
    else if (epica(cab.linea)) e.cabeza = armaduraDeLinea(cab.linea, n).cabeza;
    else if (cab.pieza === 'capucha' || cab.linea === 'tela') e.cabeza = { tipo: 'capucha', mat: m.mat };
    else if (cab.linea === 'hueso') e.cabeza = { tipo: 'calavera', mat: 'cu_hueso' };
    else if (cab.linea === 'cuero' || cab.linea === 'tachonado') e.cabeza = { tipo: 'casco', mat: m.mat };
    else if (cab.linea === 'malla') e.cabeza = { tipo: 'casco', mat: 'cu_placa', mat2: 'cu_malla' };
    else e.cabeza = { tipo: n >= 4 ? 'gran_yelmo' : 'yelmo', mat: m.mat, mat2: m.mat2 === 'cu_malla' ? undefined : m.mat2 };
  }
  // ---- pecho, y con él hombreras y grebas a juego (el inventario no tiene casilla de piernas)
  const pe = puesto.pecho && descDe(puesto.pecho);
  if (pe) {
    const m = matDe(pe.linea, pe), n = pe.nivel ?? 2;
    if (epica(pe.linea)) {
      // las épicas: coraza, grebas y (desde el nivel 2) hombreras de la línea; la celestial con su tabardo blanco
      const a = armaduraDeLinea(pe.linea, n);
      e.torso = a.torso; e.piernas = a.piernas;
      if (n >= 2) e.hombros = a.hombros;
      if (a.tabardo) e.tabardo = a.tabardo;
    } else switch (pe.linea) {
      case 'tela': e.torso = { tipo: 'tunica', mat: m.mat }; break;
      case 'cuero': e.torso = { tipo: 'cuero', mat: m.mat }; break;
      case 'tachonado': e.torso = { tipo: 'cuero_tachonado', mat: m.mat }; break;
      case 'malla': e.torso = { tipo: 'malla', mat: 'cu_malla' }; break;
      case 'hueso': e.torso = { tipo: 'placas', mat: 'cu_hueso', mat2: 'cu_cuero_negro' }; break;
      default: e.torso = { tipo: 'placas', mat: m.mat, mat2: m.mat2 === 'cu_oro' ? 'cu_malla' : m.mat2 ?? 'cu_malla' };
    }
    if (epica(pe.linea)) { /* ya armada */ } else if (duro(pe.linea) || pe.linea === 'hueso') {
      e.piernas = { tipo: 'grebas', mat: pe.linea === 'hueso' ? 'cu_hueso' : m.mat, mat2: 'cu_malla' };
      if (n >= 3) e.hombros = { tipo: pe.linea === 'hueso' ? 'huesos' : pe.linea === 'oscuro' && n >= 4 ? 'puas' : 'placas', mat: pe.linea === 'sagrado' || pe.linea === 'legendario' ? 'cu_oro' : m.mat };
      if (pe.linea === 'sagrado') e.tabardo = { mat: 'cu_tela_blanca', borde: 'cu_oro' };
    } else if (pe.linea === 'malla') {
      e.piernas = { tipo: 'grebas', mat: 'cu_malla', mat2: 'cu_tela_parda' };
      if (n >= 4) e.hombros = { tipo: 'placas', mat: 'cu_placa' };
    } else if ((pe.linea === 'cuero' || pe.linea === 'tachonado') && n >= 3) e.hombros = { tipo: 'cuero', mat: m.mat };
  }
  // ---- manos, cintura y pies
  const gu = puesto.guantes && descDe(puesto.guantes);
  if (gu && epica(gu.linea)) e.manos = armaduraDeLinea(gu.linea).manos;
  else if (gu) { const m = matDe(gu.linea, gu); e.manos = { tipo: duro(gu.linea) || gu.linea === 'malla' ? 'guanteletes' : gu.linea === 'tela' ? 'vendas' : 'guantes', mat: gu.linea === 'malla' ? 'cu_placa' : m.mat }; }
  const ci = puesto.cinturon && descDe(puesto.cinturon);
  if (ci && epica(ci.linea)) e.cinturon = armaduraDeLinea(ci.linea).cinturon;
  else if (ci) { const m = matDe(ci.linea, ci, 'cuero'); e.cinturon = { mat: duro(ci.linea) ? 'cu_cuero_negro' : m.mat, hebilla: (ci.nivel ?? 2) >= 4 || duro(ci.linea) ? 'cu_oro' : 'cu_placa' }; }
  const bo = puesto.botas && descDe(puesto.botas);
  if (bo && epica(bo.linea)) e.pies = armaduraDeLinea(bo.linea).pies;
  else if (bo) { const m = matDe(bo.linea, bo); e.pies = { tipo: duro(bo.linea) ? 'sabatones' : bo.linea === 'tela' ? 'botas' : (bo.nivel ?? 2) >= 3 ? 'botas_altas' : 'botas', mat: duro(bo.linea) ? m.mat : m.mat }; }
  // ---- armas: la de la mano es la misma que pinta el ícono
  const ar = puesto.arma;
  if (ar?.arma3d) e.arma = { ...ar.arma3d } as Equipo['arma'];
  else if (base.arma) e.arma = base.arma;
  const izq = puesto.mano_libre && descDe(puesto.mano_libre);
  if (izq) {
    const cara = esHex(izq.color) ? tinte(izq.color, 'tela') : undefined;
    // misma regla que el ícono (iconoDeLoot): solo se pinta la cara con su color si el ícono también lo hace; si no, el material de su línea
    const cara2 = cara ?? (epica(izq.linea) ? MAT_LINEA[izq.linea].placa : izq.linea === 'cuero' ? 'madera' : izq.linea === 'oscuro' ? 'cu_placa_oscura' : izq.linea === 'sagrado' ? 'cu_tela_blanca' : izq.linea === 'malla' ? 'cu_placa' : undefined);
    const borde = epica(izq.linea) ? (MAT_LINEA[izq.linea].acento === 'cu_percebe' ? 'cu_bronce' : MAT_LINEA[izq.linea].acento) : duro(izq.linea) ? 'cu_oro' : izq.linea === 'malla' ? 'cu_placa' : 'hierro';
    switch (izq.pieza) {
      case 'escudo_redondo': e.izq = { tipo: izq.variante === 'rodela' ? 'rodela' : 'escudo_redondo', mat: cara2 ?? (izq.linea === 'cuero' ? 'madera' : 'cu_placa'), mat2: borde }; break;
      case 'escudo_cometa': e.izq = { tipo: 'escudo_cometa', mat: cara2 ?? 'cu_placa', mat2: borde }; break;
      case 'escudo_torre': e.izq = { tipo: 'escudo_torre', mat: cara2 ?? 'cu_placa', mat2: borde }; break;
      case 'escudo_calavera': e.izq = { tipo: 'escudo_calavera', mat: cara2 ?? 'cu_placa_oscura', mat2: 'cu_hueso' }; break;
      case 'orbe': e.izq = { tipo: 'orbe', mat: 'magia' }; break;
      case 'libro': e.izq = { tipo: 'libro', mat: cara2 ?? 'cu_cuero' }; break;
      default: break;
    }
  }
  // una espada o hacha en la mano libre (doble empuñadura)
  const izqArma = puesto.mano_libre?.arma3d;
  if (izqArma) e.izq = { tipo: 'arma', arma: izqArma.tipo, mat: izqArma.mat };
  return e;
}
