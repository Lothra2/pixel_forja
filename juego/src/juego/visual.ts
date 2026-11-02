// Evolución visual del equipo: la misma pieza se ve distinta según su rareza, su escalón y su tema (sagrado u oscuro).
// Raro suma ribetes de oro, conjunto viste los colores de su orden, único cambia a un tema completo y legendario además brilla.
import type { Equipo } from '../../../src/engine/gotico/cuerpo';
import type { Objeto } from './objetos';
import type { Base } from './tipos_objetos';

export type Tema = 'sagrado' | 'oscuro' | 'sangre' | 'arcano';
const METAL = new Set(['hierro', 'hierro_oxido', 'acero', 'cu_placa', 'cu_malla', 'bronce']);

function hash(n: number) { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return x; }

/** El tema de un objeto único o legendario: por sus afijos y, si no dicen nada, por su número. */
export function temaDe(o: Objeto): Tema {
  const s = o.stats.map(([k]) => String(k)).join(' ');
  if (/res_luz|curar|bloqueo|res_todo|luz_|radio_luz/.test(s)) return 'sagrado';
  if (/robo_vida|sangr|vida_golpe/.test(s)) return 'sangre';
  if (/sombra|veneno|mortal|terror/.test(s)) return 'oscuro';
  if (/mana|energia|mas_habilidades|lanzar/.test(s)) return 'arcano';
  return (['sagrado', 'oscuro', 'sangre', 'arcano'] as Tema[])[hash(o.uid) % 4];
}
const PALETA: Record<Tema, { metal: string; tela: string; borde: string; brillo: string; forro: string }> = {
  sagrado: { metal: 'cu_placa', tela: 'cu_tela_blanca', borde: 'cu_oro', brillo: 'luz_vela', forro: 'cu_tela_azul' },
  oscuro: { metal: 'cu_placa_oscura', tela: 'cu_tela_negra', borde: 'cu_tela_morada', brillo: 'magia', forro: 'cu_tela_morada' },
  sangre: { metal: 'cu_placa_oscura', tela: 'cu_tela_roja', borde: 'cu_oro', brillo: 'cu_sangre_viva', forro: 'cu_tela_negra' },
  arcano: { metal: 'cu_placa', tela: 'cu_tela_morada', borde: 'cu_oro', brillo: 'runa', forro: 'cu_tela_azul' },
};

/** Devuelve el dibujo de una pieza ya vestido según su rareza. `vis` es el visual de la base (se copia, no se toca). */
export function vestir(vis: Equipo, o: Objeto, b: Base, nivelHeroe: number): Equipo {
  const v: any = JSON.parse(JSON.stringify(vis));
  const r = o.rareza, esc = b.escalon;
  const pieza = (k: string) => v[k] as any;
  if (r === 'raro' || r === 'conjunto') {
    if (pieza('torso') && !pieza('torso').mat2) pieza('torso').mat2 = 'cu_oro';
    if (pieza('cabeza') && !pieza('cabeza').mat2) pieza('cabeza').mat2 = 'cu_oro';
    if (pieza('tabardo')) pieza('tabardo').borde = 'cu_oro';
    if (pieza('cinturon')) pieza('cinturon').hebilla = 'cu_oro';
  }
  if (r === 'conjunto' && pieza('torso')) {
    v.tabardo = { mat: 'cu_tela_verde', borde: 'cu_oro' };
    if (esc >= 1) v.capa = { mat: 'cu_tela_verde', largo: 0.9, forro: 'cu_tela_negra' };
  }
  if (r === 'unico' || r === 'legendario') {
    const p = PALETA[temaDe(o)];
    for (const k of ['torso', 'piernas', 'manos', 'pies', 'cabeza', 'hombros']) {
      const q = pieza(k); if (!q) continue;
      if (METAL.has(q.mat)) q.mat = p.metal;
      if (q.mat2 && METAL.has(q.mat2)) q.mat2 = p.borde;
      if (/^cu_tela/.test(q.mat)) q.mat = p.tela;
      if (k === 'torso' || k === 'cabeza') q.mat2 = q.mat2 ?? p.borde;
    }
    if (pieza('torso')) {
      const pesada = /placas|malla|tachonado/.test(pieza('torso').tipo);
      v.tabardo = { mat: p.tela, borde: p.borde };
      if (!v.hombros) v.hombros = pesada ? { tipo: p.metal === 'cu_placa_oscura' ? 'puas' : 'placas', mat: p.metal } : { tipo: p.tela === 'cu_tela_negra' ? 'huesos' : 'pieles', mat: p.tela === 'cu_tela_negra' ? 'cu_hueso' : 'cu_pelaje' };
      v.capa = { mat: p.tela === 'cu_tela_blanca' ? 'cu_tela_azul' : p.tela, largo: 1, forro: p.forro };
    }
    const cab = pieza('cabeza');
    if (cab && (cab.tipo === 'casco' || cab.tipo === 'yelmo') && esc >= 1) cab.tipo = esc >= 2 ? 'gran_yelmo' : 'yelmo';
    if (pieza('cinturon')) pieza('cinturon').hebilla = p.borde;
    if (r === 'legendario') {
      // brillo propio: bordes y hebillas que emiten luz
      if (v.tabardo) v.tabardo.borde = p.brillo;
      if (pieza('cinturon')) pieza('cinturon').hebilla = p.brillo;
      if (cab) cab.mat2 = p.brillo;
      if (pieza('torso')) pieza('torso').mat2 = p.brillo;
      if (v.capa) v.capa.forro = p.brillo === 'luz_vela' ? 'cu_oro' : p.brillo;
    }
  }
  // a nivel alto, una armadura buena trae capa: el héroe tiene que imponer
  if (pieza('torso') && !v.capa && nivelHeroe >= 24 && esc >= 1 && r !== 'normal' && r !== 'gris') {
    const t = pieza('torso');
    v.capa = { mat: /negr|oscura/.test(t.mat) ? 'cu_tela_negra' : 'cu_tela_roja', largo: 0.95, forro: 'cu_tela_negra' };
  }
  return v as Equipo;
}

/** Brillo del héroe por lo que lleva: color y fuerza (0 nada). */
export function auraEquipo(equipo: Record<string, Objeto | null | undefined>): { color: [number, number, number]; k: number } | null {
  let leg = 0, uni = 0, tema: Tema | null = null;
  for (const o of Object.values(equipo)) {
    if (!o) continue;
    if (o.rareza === 'legendario') { leg++; tema = tema ?? temaDe(o); }
    else if (o.rareza === 'unico') uni++;
  }
  if (!leg && uni < 3) return null;
  const C: Record<Tema, [number, number, number]> = { sagrado: [255, 220, 140], oscuro: [170, 90, 255], sangre: [255, 60, 50], arcano: [110, 170, 255] };
  return { color: tema ? C[tema] : [255, 200, 120], k: Math.min(1, leg * 0.45 + uni * 0.08) };
}
