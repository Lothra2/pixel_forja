// El héroe que se guarda: clase, atributos, habilidades, equipo, bolsa y progreso. Y el cálculo de sus números.
import { equipoDeInventario, type Puesto } from '../../../src/engine/gotico/apariencia';
import { aLoot, arma3dDe } from '../ui/loot';
import { HEROES } from '../../../src/engine/gotico/catalogo/personajes';
import type { Equipo } from '../../../src/engine/gotico/cuerpo';
import { CLASES, HABILIDADES, habilidad, type Habilidad } from '../datos/clases';
import { BASES, CONJUNTOS } from '../datos/objetos_datos';
import type { Clase, Elemento } from './tipos_objetos';
import { crearBase, crearPocion, crearPergamino, baseDe, type Objeto } from './objetos';

export type Casilla = 'cabeza' | 'torso' | 'arma' | 'izq' | 'manos' | 'cinturon' | 'pies' | 'amuleto' | 'anillo1' | 'anillo2' | 'talisman';
export const CASILLAS: Casilla[] = ['cabeza', 'torso', 'arma', 'izq', 'manos', 'cinturon', 'pies', 'amuleto', 'anillo1', 'anillo2', 'talisman'];
export interface EnBolsa { o: Objeto; x: number; y: number; /** bolsa 0, 1 o 2 */ b?: number }
export interface DatosHeroe {
  v: 1;
  id: string;
  nombre: string;
  clase: Clase;
  nivel: number; xp: number;
  fue: number; des: number; vit: number; ene: number;
  puntosAtrib: number; puntosHab: number;
  habs: Record<string, number>;
  izq: string; der: string;
  atajos: (string | null)[];
  equipo: Partial<Record<Casilla, Objeto>>;
  bolsa: EnBolsa[];
  cinturon: (Objeto | null)[];
  oro: number;
  acto: number;
  zona: string;
  viajes: string[];
  misiones: Record<string, number>;
  /** Thor, el perro de la familia: segundos que le faltan para volver si cayó, y su barda propia (tramo 0 a 5) si tiene. */
  thor?: { descanso?: number; barda?: number; collar?: Objeto; bardaObj?: Objeto };
  muertes: number;
  creado: number;
  jugado: number;
  /** Actos derrotados (jefe de acto muerto). */
  actosHechos: number[];
  vidaActual?: number; manaActual?: number;
  dificultad: number;
  /** Aura activa (solo una a la vez). Opcional: las partidas viejas no la tienen. */
  aura?: string;
}
export const BOLSA_W = 10, BOLSA_H = 5, BOLSAS = 3;

export function nuevoHeroe(clase: Clase, nombre: string): DatosHeroe {
  const c = CLASES.find((x) => x.id === clase)!;
  const h: DatosHeroe = {
    v: 1, id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, nombre, clase, nivel: 1, xp: 0,
    fue: c.base.fue, des: c.base.des, vit: c.base.vit, ene: c.base.ene, puntosAtrib: 0, puntosHab: 1, habs: {},
    izq: 'ataque', der: 'ataque', atajos: Array(10).fill(null), equipo: {}, bolsa: [], cinturon: [null, null, null, null], oro: 80, acto: 1, zona: 'a1_refugio',
    viajes: ['a1_refugio'], misiones: {}, muertes: 0, creado: Date.now(), jugado: 0, actosHechos: [], dificultad: 0,
  };
  // arma inicial con el aspecto del novato
  const nov = HEROES.find((x) => x.id === clase)!.niveles[0];
  const tipo = nov.arma?.tipo;
  const b = BASES.filter((x) => x.arma === tipo && x.escalon === 0 && (!x.clase || x.clase === clase)).sort((a, b) => a.nivel - b.nivel)[0];
  if (b) { const o = crearBase(b, 1); o.vis = nov.arma; o.durab = o.durabMax; h.equipo.arma = o; }
  // la habilidad de clase con que arranca (como un don): la primera de la primera rama
  const primera = HABILIDADES.find((x) => x.clase === clase && x.nivelReq === 1 && x.tipo !== 'pasiva' && x.tipo !== 'aura' && x.tipo !== 'buff');
  if (primera) { h.habs[primera.id] = 1; h.der = primera.id; h.atajos[0] = primera.id; }
  h.cinturon = [crearPocion('vida', 0), crearPocion('vida', 0), crearPocion('mana', 0), crearPocion('mana', 0)];
  meterEnBolsa(h, crearPergamino('portal'));
  meterEnBolsa(h, crearPergamino('portal'));
  return h;
}

// ------------------------------------------------------------------ bolsa
export function lugarLibre(h: DatosHeroe, w: number, hh: number, bolsa = h.bolsa, BW = BOLSA_W, BH = BOLSA_H, bolsas = BOLSAS): [number, number, number] | null {
  for (let b = 0; b < bolsas; b++) for (let x = 0; x <= BW - w; x++) for (let y = 0; y <= BH - hh; y++) if (libre(bolsa, x, y, w, hh, undefined, b)) return [x, y, b];
  return null;
}
export function libre(bolsa: EnBolsa[], x: number, y: number, w: number, h: number, salvo?: Objeto, bb = 0): boolean {
  return !bolsa.some((b) => (b.b ?? 0) === bb && b.o !== salvo && x < b.x + b.o.w && x + w > b.x && y < b.y + b.o.h && y + h > b.y);
}
export function meterEnBolsa(h: DatosHeroe, o: Objeto): boolean {
  const p = lugarLibre(h, o.w, o.h);
  if (!p) return false;
  h.bolsa.push({ o, x: p[0], y: p[1], b: p[2] });
  return true;
}
/** Las pociones van primero al cinturón. */
export function recoger(h: DatosHeroe, o: Objeto): boolean {
  if (o.tipo === 'pocion') { const i = h.cinturon.findIndex((x) => !x); if (i >= 0) { h.cinturon[i] = o; return true; } }
  return meterEnBolsa(h, o);
}

// ------------------------------------------------------------------ números
export interface Calc {
  vidaMax: number; manaMax: number;
  fue: number; des: number; vit: number; ene: number;
  dano: [number, number]; elem: Partial<Record<Elemento, number>>;
  precision: number; def: number; bloqueo: number; critico: number; esquiva: number;
  res: Record<Elemento, number>;
  robo_vida: number; robo_mana: number;
  vel_ataque: number; vel_lanzar: number; vel_mover: number; vel_recuperar: number;
  regen_vida: number; regen_mana: number;
  hallazgo: number; oro_extra: number; radio_luz: number; espinas: number; reduc_dano: number;
  mas_habilidades: number;
  golpe_aplastante: number; herida_abierta: number; ralentizar: number; aturdir: number; perforar: number;
  vida_por_muerte: number; mana_por_muerte: number;
  distancia: boolean; dosManos: boolean; tipoArma: string;
  fuego_pct: number; invocados_pct: number;
  vivo?: Elemento;
  valor: number;
  conjuntos: Record<string, number>;
  /** Todos los bonos sumados (objetos, buffs y pasivas): para las mecánicas de clase que leen claves propias. */
  st: Record<string, number>;
}

/** Nivel máximo del héroe. */
export const NIVEL_MAX = 100;
/**
 * Experiencia para llegar al nivel n: rápida hasta 30, media hasta 70 y larga hasta 100. La base es la curva de
 * siempre; después de 30 y después de 70 se le suman tramos que crecen de a poco.
 */
export const xpPara = (n: number) => {
  if (n <= 1) return 0;
  const base = 220 * Math.pow(n - 1, 2.5);
  const medio = n > 30 ? 1 + Math.pow((n - 30) / 40, 2) * 1.6 : 1;
  const largo = n > 70 ? 1 + Math.pow((n - 70) / 30, 2) * 1.4 : 1;
  return Math.round(base * medio * largo);
};
/** Nivel de los monstruos de una zona según la dificultad: Normal como está, Pesadilla hasta ~80 e Infierno hasta 100. */
export const nivelEnDificultad = (nivel: number, dif: number) => (dif >= 2 ? Math.min(100, Math.round(60 + nivel * 0.65)) : dif === 1 ? Math.round(30 + nivel * 0.8) : nivel);
export const nivelHab = (h: DatosHeroe, id: string, c?: Calc) => (h.habs[id] ? h.habs[id] + (c?.mas_habilidades ?? 0) : 0);
const v2 = (b: [number, number] | undefined, n: number) => (b ? b[0] + b[1] * (n - 1) : 0);

export function calcular(h: DatosHeroe, buffs: Record<string, number> = {}): Calc {
  const cl = CLASES.find((x) => x.id === h.clase)!;
  const st: Record<string, number> = {};
  const add = (k: string, v: number) => { st[k] = (st[k] ?? 0) + v; };
  const conjuntos: Record<string, number> = {};
  let defItems = 0;
  const arma = h.equipo.arma, ba = arma ? baseDe(arma) : undefined;
  for (const c of Object.keys(h.equipo) as Casilla[]) {
    const o = h.equipo[c]; if (!o || (o.durabMax > 0 && o.durab <= 0)) continue;
    for (const [k, v] of o.stats) add(k, v);
    if (o.def && c !== 'arma') defItems += o.def;
    if (o.conjunto) conjuntos[o.conjunto] = (conjuntos[o.conjunto] ?? 0) + 1;
  }
  let pctSet = 0;
  for (const [cid, n] of Object.entries(conjuntos)) { const cj = CONJUNTOS.find((x) => x.id === cid); for (const b of cj?.bonos ?? []) if (n >= b.piezas) for (const s of b.stats) { add(s.stat, s.max); if (s.stat === 'dano_pct') pctSet += s.max; } }
  for (const [k, v] of Object.entries(buffs)) add(k, v);
  const mas = (st.mas_habilidades ?? 0) + (st.mas_clase ?? 0);
  // pasivas
  for (const hb of HABILIDADES) if (hb.clase === h.clase && hb.tipo === 'pasiva' && h.habs[hb.id]) for (const [k, b] of Object.entries(hb.bonos ?? {})) add(k, v2(b, h.habs[hb.id] + mas));
  const todos = st.todos_atributos ?? 0;
  const fue = h.fue + (st.fue ?? 0) + todos, des = h.des + (st.des ?? 0) + todos, vit = h.vit + (st.vit ?? 0) + todos, ene = h.ene + (st.ene ?? 0) + todos;
  let vidaMax = cl.base.vida + (h.nivel - 1) * cl.vidaNivel + (vit - cl.base.vit) * cl.porVit + (st.vida ?? 0);
  vidaMax *= 1 + (st.vida_pct ?? 0) / 100;
  let manaMax = cl.base.mana + (h.nivel - 1) * cl.manaNivel + (ene - cl.base.ene) * cl.porEne + (st.mana ?? 0);
  manaMax *= 1 + (st.mana_pct ?? 0) / 100;
  // la familia manda en el juego (las armas épicas de la Forja tienen forma propia pero juegan como su familia)
  const fam = ba?.ranura === 'arma' ? ba.familia : ba?.arma;
  const distancia = !!ba?.distancia || fam === 'arco' || fam === 'ballesta';
  const bonoAtr = distancia || fam === 'daga' || fam === 'garras' ? des * 1 + fue * 0.25 : fue * 1 + (fam === 'lanza' ? des * 0.5 : 0);
  const base: [number, number] = arma?.dano && !(arma.durabMax > 0 && arma.durab <= 0) ? [arma.dano[0], arma.dano[1]] : [1, 3];
  // dano_pct de objetos ya está en el arma; dano_pct de otras cosas (buffs, pasivas, auras) suma aquí
  let pctExtra = 0; for (const c of Object.keys(h.equipo) as Casilla[]) if (c !== 'arma') for (const [k, v] of h.equipo[c]!.stats) if (k === 'dano_pct') pctExtra += v;
  pctExtra += (buffs.dano_pct ?? 0) + pctSet;
  for (const hb of HABILIDADES) if (hb.clase === h.clase && hb.tipo === 'pasiva' && h.habs[hb.id]) pctExtra += v2(hb.bonos?.dano_pct, h.habs[hb.id] + mas);
  const mult = 1 + (bonoAtr + pctExtra) / 100;
  const dano: [number, number] = [Math.max(1, Math.round(base[0] * mult)), Math.max(1, Math.round(base[1] * mult))];
  const elem: Partial<Record<Elemento, number>> = {};
  for (const [k, e] of [['dano_fuego', 'fuego'], ['dano_frio', 'frio'], ['dano_rayo', 'rayo'], ['dano_veneno', 'veneno'], ['dano_sombra', 'sombra'], ['dano_luz', 'luz'], ['dano_sangre', 'sangre']] as [string, Elemento][]) if (st[k]) elem[e] = st[k];
  const resTodo = st.res_todo ?? 0;
  const pen = [0, -40, -100][h.dificultad] ?? 0;
  const res = {
    fisico: 0, fuego: Math.min(75, (st.res_fuego ?? 0) + resTodo + pen), frio: Math.min(75, (st.res_frio ?? 0) + resTodo + pen), rayo: Math.min(75, (st.res_rayo ?? 0) + resTodo + pen),
    veneno: Math.min(75, (st.res_veneno ?? 0) + resTodo + pen), sombra: Math.min(75, (st.res_sombra ?? 0) + resTodo + pen), luz: Math.min(75, resTodo + pen), sangre: 0,
  } as Record<Elemento, number>;
  const izq = h.equipo.izq, bi = izq ? baseDe(izq) : undefined;
  const bloqueo = bi?.bloqueo ? Math.min(75, bi.bloqueo + (st.bloqueo ?? 0) + Math.floor((des - 15) / 4)) : (st.bloqueo ?? 0) > 0 ? Math.min(30, st.bloqueo) : 0;
  let defPct = buffs.def_pct ?? 0;
  for (const hb of HABILIDADES) if (hb.clase === h.clase && hb.tipo === 'pasiva' && h.habs[hb.id]) defPct += v2(hb.bonos?.def_pct, h.habs[hb.id] + mas);
  const def = Math.round((defItems + Math.floor(des / 4)) * (1 + defPct / 100));
  return {
    vidaMax: Math.round(vidaMax), manaMax: Math.round(manaMax), fue, des, vit, ene, dano, elem,
    precision: Math.round(des * 5 - 35 + h.nivel * 6 + (st.precision ?? 0)), def, bloqueo, critico: st.critico ?? 0, esquiva: st.esquiva ?? 0,
    res, robo_vida: st.robo_vida ?? 0, robo_mana: st.robo_mana ?? 0,
    vel_ataque: (st.vel_ataque ?? 0) - (ba?.vel ?? 0), vel_lanzar: st.vel_lanzar ?? 0, vel_mover: st.vel_mover ?? 0, vel_recuperar: st.vel_recuperar ?? 0,
    regen_vida: st.regen_vida ?? 0, regen_mana: st.regen_mana ?? 0, hallazgo: st.hallazgo ?? 0, oro_extra: st.oro_extra ?? 0, radio_luz: st.radio_luz ?? 0,
    espinas: st.espinas ?? 0, reduc_dano: Math.min(50, st.reduc_dano ?? 0), mas_habilidades: mas,
    golpe_aplastante: st.golpe_aplastante ?? 0, herida_abierta: st.herida_abierta ?? 0, ralentizar: st.ralentizar ?? 0, aturdir: st.aturdir ?? 0, perforar: st.perforar ?? 0,
    vida_por_muerte: st.vida_por_muerte ?? 0, mana_por_muerte: st.mana_por_muerte ?? 0,
    distancia, dosManos: !!ba?.dosManos, tipoArma: fam ?? 'puno', fuego_pct: st.fuego_pct ?? 0, invocados_pct: st.invocados_pct ?? 0,
    vivo: arma?.vivo, conjuntos, valor: Math.min(100, st.valor ?? 0), st,
  };
}

/** Cuánto puede llevar: requisitos de nivel, fuerza y destreza. */
export function cumpleReq(h: DatosHeroe, c: Calc, o: Objeto): boolean {
  const b = baseDe(o); if (!b) return true;
  const red = 1 - (o.stats.find((s) => s[0] === 'reduc_req')?.[1] ?? 0) / 100;
  if (b.clase && b.clase !== h.clase) return false;
  if ((b.req.fue ?? 0) * red > c.fue) return false;
  if ((b.req.des ?? 0) * red > c.des) return false;
  if (Math.max(b.req.nivel ?? 1, reqNivel(o)) > h.nivel) return false;
  return true;
}
export const reqNivel = (o: Objeto) => (o.req ? Math.max(o.req, baseDe(o)?.req.nivel ?? 1) : o.rareza === 'normal' || o.rareza === 'gris' ? (baseDe(o)?.req.nivel ?? 1) : Math.max(baseDe(o)?.req.nivel ?? 1, Math.floor(o.nivel * (o.rareza === 'magico' ? 0.6 : o.rareza === 'raro' ? 0.75 : 0.85))));

// ------------------------------------------------------------------ cómo se ve
// La Forja traduce lo equipado en el inventario a lo que se ve en el cuerpo (mismo diseño, línea y colores que el ícono).
const CAS_PUESTO: Record<string, Casilla> = { casco: 'cabeza', pecho: 'torso', arma: 'arma', mano_libre: 'izq', guantes: 'manos', cinturon: 'cinturon', botas: 'pies' };
/** Las casillas equipadas en el formato de la Forja ({it, arma3d}). */
export function puestosDe(h: DatosHeroe): Record<string, Puesto> {
  const out: Record<string, Puesto> = {};
  for (const [k, c] of Object.entries(CAS_PUESTO)) { const o = h.equipo[c]; if (o) out[k] = { it: aLoot(o), arma3d: arma3dDe(o) }; }
  return out;
}
/** Lo que lleva debajo cuando una casilla está vacía: la ropa de novato de su clase, sin armas. */
export function ropaBase(clase: Clase): Equipo { const e: Equipo = JSON.parse(JSON.stringify(HEROES.find((x) => x.id === clase)!.niveles[0])); delete e.arma; delete e.izq; return e; }
export function equipoVisual(h: DatosHeroe): Equipo {
  const eq = equipoDeInventario(puestosDe(h), ropaBase(h.clase));
  if (!eq.arma) eq.arma = { tipo: 'puno' };
  // capa de los únicos y legendarios (no hay casilla de capa en el inventario)
  const t = h.equipo.torso;
  if (t && !eq.capa && (t.rareza === 'unico' || t.rareza === 'legendario' || t.rareza === 'conjunto')) eq.capa = { mat: t.rareza === 'conjunto' ? 'cu_tela_verde' : t.rareza === 'legendario' ? 'cu_tela_roja' : 'cu_tela_negra', largo: 1, forro: t.rareza === 'legendario' ? 'cu_oro' : 'cu_tela_negra' };
  return eq;
}
/** JSON con las claves ordenadas: dos equipos iguales dan la misma firma aunque se armen en otro orden. */
const canon = (v: any): string => (Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',')}}` : JSON.stringify(v));
export function firmaVisual(h: DatosHeroe): string {
  const s = canon(equipoVisual(h));
  return s === canon(HEROES.find((x) => x.id === h.clase)!.niveles[0]) ? 'base' : s;
}
export const cuerpoDe = (clase: Clase) => HEROES.find((x) => x.id === clase)!.cuerpo;

// ------------------------------------------------------------------ habilidades
export function puedeAprender(h: DatosHeroe, hb: Habilidad): boolean {
  if (h.puntosHab <= 0 || hb.clase !== h.clase) return false;
  if (h.nivel < hb.nivelReq + (h.habs[hb.id] ?? 0)) return false;
  if ((h.habs[hb.id] ?? 0) >= 20) return false;
  return (hb.req ?? []).every((r) => (h.habs[r] ?? 0) > 0);
}
export const habDe = (id: string) => (id === 'ataque' ? null : habilidad(id));
