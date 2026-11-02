// Botín: crear objetos (normales, mágicos, raros, de conjunto, únicos, legendarios), pociones, gemas, runas y oro.
import { BASES, PREFIJOS, SUFIJOS, UNICOS, CONJUNTOS, GEMAS, RUNAS, PALABRAS, NOMBRES_RAROS } from '../datos/objetos_datos';
import '../datos/talismanes';
import { LEGENDARIA_JEFE } from '../datos/legendarias';
import type { Base, Elemento, Stat, Ranura, Afijo, Unico } from './tipos_objetos';
import { R, entero, elegir, clamp } from '../nucleo/azar';

export type Rareza = 'normal' | 'magico' | 'raro' | 'conjunto' | 'unico' | 'legendario' | 'gris';
export type TipoObj = 'equipo' | 'pocion' | 'gema' | 'runa' | 'pergamino' | 'thor';
export interface Objeto {
  uid: number;
  tipo: TipoObj;
  base: string;
  rareza: Rareza;
  nombre: [string, string];
  nivel: number;
  stats: [Stat | string, number][];
  dano?: [number, number];
  def?: number;
  durab: number; durabMax: number;
  huecos: number;
  engarces: string[];
  vivo?: Elemento;
  lore?: [string, string];
  conjunto?: string;
  /** Equipo de Thor: el tramo de la barda (1 a 5). */
  tramo?: number;
  palabra?: string;
  w: number; h: number;
  /** Pociones: 'vida' | 'mana' | 'rejuv'; tamaño 0..4. */
  pocion?: 'vida' | 'mana' | 'rejuv';
  tam?: number;
  precio: number;
  identificado?: boolean;
  /** Aspecto propio del arma (el arma inicial se ve como la del novato). */
  vis?: any;
  /** Nivel necesario fijo (legendarias y conjuntos). Opcional: los objetos viejos no lo tienen. */
  req?: number;
}

let uid = Date.now() % 100000;
export const nuevoUid = () => ++uid;
export const BASE_POR_ID = new Map(BASES.map((b) => [b.id, b]));
export function crearUnicoId(id: string, nivel: number): Objeto | null {
  const u = UNICOS.find((x) => x.id === id); const b = u && BASE_POR_ID.get(u.base); if (!u || !b) return null;
  return deUnico(u, b, nivel);
}
export const baseDe = (o: Objeto): Base | undefined => BASE_POR_ID.get(o.base);

const familiaDonde = (b: Base): string[] => {
  const f = b.familia, out = ['todas', f];
  if (b.ranura === 'arma') out.push('arma');
  if (b.ranura === 'torso') out.push('armadura', 'torso');
  if (b.ranura === 'cabeza') out.push('casco');
  if (b.ranura === 'izq') out.push(f === 'orbe' || f === 'libro' ? f : 'escudo');
  if (b.ranura === 'manos') out.push('guantes');
  if (b.ranura === 'pies') out.push('botas');
  if (b.ranura === 'cinturon') out.push('cinturon');
  if (b.ranura === 'anillo') out.push('anillo', 'joya');
  if (b.ranura === 'amuleto') out.push('amuleto', 'joya');
  if (b.ranura === 'talisman') return ['talisman'];
  return out;
};
const rollStat = (min: number, max: number) => Math.round(min + (max - min) * R());

function aplicarBase(o: Objeto, b: Base) {
  if (b.dano) o.dano = [b.dano[0], b.dano[1]];
  if (b.def) o.def = rollStat(b.def[0], b.def[1]);
}

export function crearBase(b: Base, nivel: number): Objeto {
  const o: Objeto = { uid: nuevoUid(), tipo: 'equipo', base: b.id, rareza: 'normal', nombre: [...b.nombre] as [string, string], nivel, stats: [], durab: b.durab, durabMax: b.durab, huecos: 0, engarces: [], w: b.tam[0], h: b.tam[1], precio: b.precio };
  aplicarBase(o, b);
  return o;
}

function afijosPosibles(lista: Afijo[], b: Base, nivel: number) {
  const d = familiaDonde(b);
  return lista.filter((a) => a.nivel <= nivel && a.donde.some((x) => d.includes(x)));
}
function elegirAfijo(lista: Afijo[], usados: Set<string>): Afijo | null {
  const ok = lista.filter((a) => !usados.has(a.grupo));
  if (!ok.length) return null;
  let s = 0; for (const a of ok) s += a.peso;
  let k = R() * s;
  for (const a of ok) { k -= a.peso; if (k <= 0) return a; }
  return ok[ok.length - 1];
}
function sumarAfijo(o: Objeto, a: Afijo) {
  for (const st of a.stats) {
    const v = rollStat(st.min, st.max);
    if (st.stat === 'huecos') { o.huecos = Math.max(o.huecos, v); continue; }
    o.stats.push([st.stat, v]);
  }
  if (a.vivo) o.vivo = a.vivo;
}

export function crearObjeto(nivel: number, rareza: Rareza, filtro?: (b: Base) => boolean): Objeto {
  // bases de los últimos 30 niveles (las joyas y talismanes no tienen escalones: siempre entran)
  const sinEscalon = (b: Base) => b.ranura === 'anillo' || b.ranura === 'amuleto' || b.ranura === 'talisman';
  const cand = BASES.filter((b) => b.nivel <= Math.max(1, nivel) && (!filtro || filtro(b)) && (b.nivel >= nivel - 30 || sinEscalon(b)));
  // si nada entra en la ventana, la base más alta que respete el filtro
  const resto = cand.length ? cand : BASES.filter((x) => x.nivel <= Math.max(3, nivel) && (!filtro || filtro(x)));
  const b = resto.length ? (cand.length ? elegir(cand) : resto.reduce((m, x) => (x.nivel > m.nivel ? x : m))) : elegir(BASES.filter((x) => x.nivel <= Math.max(3, nivel)));
  if (rareza === 'unico' || rareza === 'legendario') { const u = crearUnico(nivel, rareza === 'legendario', filtro); if (u) return u; rareza = 'raro'; }
  if (rareza === 'conjunto') { const s = crearConjunto(nivel); if (s) return s; rareza = 'raro'; }
  const o = crearBase(b, nivel);
  o.rareza = rareza;
  if (rareza === 'normal' && b.huecosMax && R() < 0.25) o.huecos = entero(1, b.huecosMax);
  if (rareza === 'normal' && R() < 0.06) { o.rareza = 'gris'; o.durab = o.durabMax = Math.ceil(b.durab * 0.5); if (o.dano) o.dano = [Math.max(1, Math.floor(o.dano[0] * 0.7)), Math.max(1, Math.floor(o.dano[1] * 0.7))]; if (o.def) o.def = Math.floor(o.def * 0.7); o.nombre = [`${b.nombre[0]} gastado`, `Worn ${b.nombre[1]}`]; }
  if (rareza === 'magico' || rareza === 'raro') {
    const usados = new Set<string>();
    const pres = afijosPosibles(PREFIJOS, b, nivel), sufs = afijosPosibles(SUFIJOS, b, nivel);
    let np = 0, ns = 0;
    if (rareza === 'magico') { const q = R(); np = q < 0.4 ? 1 : q < 0.75 ? 0 : 1; ns = np === 0 ? 1 : R() < 0.5 ? 1 : 0; }
    else { const n = entero(3, 6); np = clamp(entero(1, 3), 1, n - 1); ns = Math.min(3, n - np); }
    let pre: Afijo | null = null, suf: Afijo | null = null;
    for (let i = 0; i < np; i++) { const a = elegirAfijo(pres, usados); if (!a) break; usados.add(a.grupo); sumarAfijo(o, a); if (!pre) pre = a; }
    for (let i = 0; i < ns; i++) { const a = elegirAfijo(sufs, usados); if (!a) break; usados.add(a.grupo); sumarAfijo(o, a); if (!suf) suf = a; }
    if (rareza === 'magico') {
      o.nombre = [[b.nombre[0], pre?.nombre[0], suf?.nombre[0]].filter(Boolean).join(' '), [pre?.nombre[1], b.nombre[1], suf?.nombre[1]].filter(Boolean).join(' ')];
      o.precio = Math.round(b.precio * 2.5 + nivel * 5);
    } else {
      const p = elegir(NOMBRES_RAROS.pre), s = elegir(NOMBRES_RAROS.suf);
      o.nombre = [`${p[0]} ${s[0]}`, `${s[1]} ${p[1]}`];
      o.precio = Math.round(b.precio * 5 + nivel * 12);
    }
    aplicarMejoras(o);
  }
  return o;
}

/** Los % de daño o defensa mejorados se aplican al número base del objeto. */
export function aplicarMejoras(o: Objeto) {
  const b = baseDe(o); if (!b) return;
  let dp = 0, ap = 0, dmin = 0, dmax = 0, d = 0;
  for (const [s, v] of o.stats) { if (s === 'dano_pct') dp += v; if (s === 'def_pct') ap += v; if (s === 'dano_min') dmin += v; if (s === 'dano_max') dmax += v; if (s === 'def') d += v; }
  if (b.dano) o.dano = [Math.round(b.dano[0] * (1 + dp / 100)) + dmin, Math.round(b.dano[1] * (1 + dp / 100)) + dmax];
  if (b.def) o.def = Math.round(((o.def ?? b.def[0]) * (1 + ap / 100))) + d;
  if (o.dano && o.dano[1] < o.dano[0]) o.dano[1] = o.dano[0];
}

export function crearUnico(nivel: number, legendario: boolean, filtro?: (b: Base) => boolean): Objeto | null {
  const todos = UNICOS.filter((u) => u.nivel <= nivel + 3 && !!u.legendario === legendario && BASE_POR_ID.has(u.base) && (!filtro || filtro(BASE_POR_ID.get(u.base)!)));
  if (!todos.length) return null;
  // a nivel alto no caen los de los primeros actos: los de los últimos 35 niveles (o, si no hay, los más altos que haya)
  const tope = todos.reduce((m, u) => Math.max(m, u.nivel), 0);
  const u = elegir(todos.filter((x) => x.nivel >= Math.min(nivel - 35, tope - 15)));
  return deUnico(u, BASE_POR_ID.get(u.base)!, nivel);
}
/** Arma un único o legendario con sus estadísticas, su elemento vivo y su nivel necesario. */
function deUnico(u: Unico, b: Base, nivel: number): Objeto {
  const o = crearBase(b, Math.max(nivel, u.nivel));
  o.rareza = u.legendario ? 'legendario' : 'unico';
  o.nombre = [...u.nombre] as [string, string];
  for (const st of u.stats) { const v = rollStat(st.min, st.max); if (st.stat === 'huecos') o.huecos = v; else o.stats.push([st.stat, v]); }
  if (u.vivo) o.vivo = u.vivo;
  o.lore = u.lore;
  if (u.req) o.req = u.req;
  o.precio = Math.round(b.precio * 10 + o.nivel * 30);
  aplicarMejoras(o);
  return o;
}
export function crearConjunto(nivel: number): Objeto | null {
  const todos = CONJUNTOS.filter((c) => c.nivel <= nivel + 3);
  if (!todos.length) return null;
  const tope = todos.reduce((m, c) => Math.max(m, c.nivel), 0);
  const c = elegir(todos.filter((x) => x.nivel >= Math.min(nivel - 35, tope - 15)));
  return crearPiezaConjunto(c.id, elegir(c.piezas).id, nivel);
}
/** Una pieza concreta de un conjunto (su nivel necesario es el del conjunto). */
export function crearPiezaConjunto(conjunto: string, pieza: string, nivel: number): Objeto | null {
  const c = CONJUNTOS.find((x) => x.id === conjunto), p = c?.piezas.find((x) => x.id === pieza);
  const b = p && BASE_POR_ID.get(p.base); if (!c || !p || !b) return null;
  const o = crearBase(b, Math.max(nivel, c.nivel));
  o.rareza = 'conjunto'; o.conjunto = c.id; o.nombre = [...p.nombre] as [string, string]; o.lore = c.lore;
  for (const st of p.stats) o.stats.push([st.stat, rollStat(st.min, st.max)]);
  if (p.vivo) o.vivo = p.vivo;
  o.req = c.req ?? c.nivel;
  o.precio = Math.round(b.precio * 8 + o.nivel * 25);
  aplicarMejoras(o);
  return o;
}
/** La legendaria temática de un jefe, si la suelta (de acto siempre que toque; de mazmorra solo si es único o jefe). */
export function legendariaJefe(id: string, nivel: number, calidad: number): Objeto | null {
  const lj = LEGENDARIA_JEFE[id]; if (!lj || calidad < 2 || nivel < (lj[2] ?? 0) || R() >= lj[1]) return null;
  return crearUnicoId(lj[0], nivel);
}

// ------------------------------------------------------------------ consumibles
export const POCIONES: { pocion: 'vida' | 'mana' | 'rejuv'; tam: number; nombre: [string, string]; valor: number; precio: number; nivel: number }[] = [
  { pocion: 'vida', tam: 0, nombre: ['Poción de vida menor', 'Minor Healing Potion'], valor: 45, precio: 30, nivel: 1 },
  { pocion: 'vida', tam: 1, nombre: ['Poción de vida ligera', 'Light Healing Potion'], valor: 90, precio: 70, nivel: 8 },
  { pocion: 'vida', tam: 2, nombre: ['Poción de vida', 'Healing Potion'], valor: 160, precio: 140, nivel: 18 },
  { pocion: 'vida', tam: 3, nombre: ['Poción de vida mayor', 'Greater Healing Potion'], valor: 280, precio: 250, nivel: 30 },
  { pocion: 'vida', tam: 4, nombre: ['Poción de vida suprema', 'Supreme Healing Potion'], valor: 450, precio: 400, nivel: 45 },
  { pocion: 'mana', tam: 0, nombre: ['Poción de maná menor', 'Minor Mana Potion'], valor: 30, precio: 30, nivel: 1 },
  { pocion: 'mana', tam: 1, nombre: ['Poción de maná ligera', 'Light Mana Potion'], valor: 60, precio: 70, nivel: 8 },
  { pocion: 'mana', tam: 2, nombre: ['Poción de maná', 'Mana Potion'], valor: 110, precio: 140, nivel: 18 },
  { pocion: 'mana', tam: 3, nombre: ['Poción de maná mayor', 'Greater Mana Potion'], valor: 180, precio: 250, nivel: 30 },
  { pocion: 'mana', tam: 4, nombre: ['Poción de maná suprema', 'Supreme Mana Potion'], valor: 300, precio: 400, nivel: 45 },
  { pocion: 'rejuv', tam: 0, nombre: ['Poción de rejuvenecer', 'Rejuvenation Potion'], valor: 35, precio: 600, nivel: 12 },
  { pocion: 'rejuv', tam: 1, nombre: ['Poción de rejuvenecer plena', 'Full Rejuvenation Potion'], valor: 100, precio: 1500, nivel: 30 },
];
export function crearPocion(pocion: 'vida' | 'mana' | 'rejuv', tam: number): Objeto {
  const p = POCIONES.find((x) => x.pocion === pocion && x.tam === tam) ?? POCIONES[0];
  return { uid: nuevoUid(), tipo: 'pocion', base: `pocion_${pocion}_${tam}`, rareza: 'normal', nombre: p.nombre, nivel: p.nivel, stats: [], durab: 0, durabMax: 0, huecos: 0, engarces: [], w: 1, h: 1, pocion, tam, precio: p.precio };
}
export const valorPocion = (o: Objeto) => POCIONES.find((x) => x.pocion === o.pocion && x.tam === o.tam)?.valor ?? 40;
export function pocionParaNivel(nivel: number): Objeto {
  const tam = nivel < 8 ? 0 : nivel < 18 ? 1 : nivel < 30 ? 2 : nivel < 45 ? 3 : 4;
  const q = R();
  if (q < 0.04 && nivel >= 12) return crearPocion('rejuv', nivel > 30 ? 1 : 0);
  return crearPocion(q < 0.6 ? 'vida' : 'mana', clamp(tam - (R() < 0.3 ? 1 : 0), 0, 4));
}
export function crearGema(nivel: number): Objeto {
  const cand = GEMAS.filter((g) => g.nivel <= nivel);
  const g = elegir(cand.length ? cand : GEMAS.slice(0, 7));
  return { uid: nuevoUid(), tipo: 'gema', base: g.id, rareza: 'normal', nombre: g.nombre, nivel: g.nivel, stats: [], durab: 0, durabMax: 0, huecos: 0, engarces: [], w: 1, h: 1, precio: 50 + g.calidad * 120 };
}
export function crearRuna(nivel: number): Objeto {
  const cand = RUNAS.filter((r) => r.nivel <= nivel);
  const ru = cand.length ? cand[Math.floor(Math.pow(R(), 2.2) * cand.length * 0.999 + (cand.length - 1) * 0) ] : RUNAS[0];
  // las runas altas son más raras: tira hacia las bajas
  const r = cand.length ? cand[Math.floor(cand.length * (1 - Math.pow(R(), 0.35)))] ?? ru : ru;
  return { uid: nuevoUid(), tipo: 'runa', base: r.id, rareza: 'normal', nombre: [`Runa ${r.nombre[0]}`, `${r.nombre[1]} Rune`], nivel: r.nivel, stats: [], durab: 0, durabMax: 0, huecos: 0, engarces: [], w: 1, h: 1, precio: 100 + r.orden * 80 };
}
export function crearPergamino(tipo: 'portal' | 'olvido'): Objeto {
  if (tipo === 'olvido') return { uid: nuevoUid(), tipo: 'pergamino', base: 'pergamino_olvido', rareza: 'unico', nombre: ['Lágrima del Olvido', 'Tear of Oblivion'], nivel: 1, stats: [], durab: 0, durabMax: 0, huecos: 0, engarces: [], w: 1, h: 1, precio: 5000, lore: ['Una gota que no moja. Quien la bebe olvida cómo pelear, y aprende de nuevo.', 'A drop that does not wet. Whoever drinks it forgets how to fight, and learns anew.'] };
  return { uid: nuevoUid(), tipo: 'pergamino', base: `pergamino_${tipo}`, rareza: 'normal', nombre: tipo === 'portal' ? ['Pergamino de regreso', 'Scroll of Return'] : ['Pergamino de lectura', 'Scroll of Reading'], nivel: 1, stats: [], durab: 0, durabMax: 0, huecos: 0, engarces: [], w: 1, h: 1, precio: 50 };
}

/** Engarzar una gema o runa en un objeto con huecos libres. Las runas en orden pueden formar una palabra. */
export function engarzar(o: Objeto, g: Objeto): boolean {
  if (o.engarces.length >= o.huecos) return false;
  if (g.tipo !== 'gema' && g.tipo !== 'runa') return false;
  o.engarces.push(g.base);
  const b = baseDe(o);
  if (g.tipo === 'gema') {
    const gm = GEMAS.find((x) => x.id === g.base);
    if (gm && b) { const sts = b.ranura === 'arma' ? gm.arma : b.ranura === 'izq' && b.familia !== 'orbe' ? gm.escudo : gm.armadura; for (const s of sts) o.stats.push([s.stat, s.max]); }
  } else {
    const ru = RUNAS.find((x) => x.id === g.base);
    if (ru && b) for (const s of b.ranura === 'arma' ? ru.arma : ru.armadura) o.stats.push([s.stat, s.max]);
  }
  // palabra rúnica: si el objeto es normal y las runas forman una
  if (o.engarces.length === o.huecos && (o.rareza === 'normal' || o.rareza === 'gris') && b) {
    const d = familiaDonde(b);
    const p = PALABRAS.find((w) => w.runas.length === o.huecos && w.runas.every((r, i) => r === o.engarces[i]) && w.donde.some((x) => d.includes(x)));
    if (p) {
      o.palabra = p.id; o.rareza = 'unico'; o.nombre = [`${p.nombre[0]} (${b.nombre[0]})`, `${p.nombre[1]} (${b.nombre[1]})`];
      for (const s of p.stats) o.stats.push([s.stat, s.max]);
      if (p.vivo) o.vivo = p.vivo;
      o.lore = p.lore;
    }
  }
  aplicarMejoras(o);
  return true;
}

// ------------------------------------------------------------------ qué cae
export interface Caida { oro?: number; obj?: Objeto }
/** Qué suelta un monstruo de ese nivel. calidad: 0 normal, 1 campeón, 2 único, 3 jefe, 4 jefe de acto. */
export function botin(nivel: number, calidad: number, hallazgo: number, oroExtra: number): Caida[] {
  const out: Caida[] = [];
  const tiradas = [1, 2, 3, 5, 8][calidad];
  for (let t = 0; t < tiradas; t++) {
    const q = R();
    const nada = [0.55, 0.35, 0.15, 0.05, 0][calidad];
    if (t === 0 && q < nada) continue;
    const k = R();
    if (k < 0.24) { out.push({ oro: Math.round((5 + nivel * entero(2, 7)) * (1 + oroExtra / 100) * (1 + calidad * 0.5)) }); continue; }
    if (k < 0.42) { out.push({ obj: pocionParaNivel(nivel) }); continue; }
    if (k < 0.46) { out.push({ obj: crearGema(nivel) }); continue; }
    if (k < 0.475 && nivel > 4) { out.push({ obj: crearRuna(nivel) }); continue; }
    if (k < 0.49) { out.push({ obj: crearPergamino('portal') }); continue; }
    out.push({ obj: crearObjeto(nivel, tirarRareza(calidad, hallazgo)) });
  }
  return out;
}
export function tirarRareza(calidad: number, hallazgo: number): Rareza {
  const mf = 1 + hallazgo / 100, mfu = 1 + hallazgo / 250;
  const bono = [1, 2, 3, 5, 8][calidad] ?? 1;
  const r = R();
  if (r < 0.0025 * bono * mfu) return 'legendario';
  if (r < 0.012 * bono * mfu) return 'unico';
  if (r < 0.022 * bono * mfu) return 'conjunto';
  if (r < 0.09 * bono * mf) return 'raro';
  if (r < 0.34 * bono * mf) return 'magico';
  return 'normal';
}

export const COLOR_RAREZA: Record<Rareza, string> = { normal: '#d8d0c0', gris: '#8a8a8a', magico: '#6c8cff', raro: '#ffe060', conjunto: '#40d040', unico: '#c8a050', legendario: '#ff8a20' };
export const colorObj = (o: Objeto) => (o.tipo === 'runa' ? '#ffa040' : o.tipo === 'gema' ? '#d0d0d0' : COLOR_RAREZA[o.rareza]);
export const ranuraDe = (o: Objeto): Ranura | null => (o.tipo === 'equipo' ? baseDe(o)?.ranura ?? null : null);

/** Nombre corto de cada stat para el tooltip. */
export const NOMBRE_STAT: Record<string, [string, string]> = {
  dano_pct: ['+{v}% daño mejorado', '+{v}% Enhanced Damage'], dano_min: ['+{v} daño mínimo', '+{v} to Minimum Damage'], dano_max: ['+{v} daño máximo', '+{v} to Maximum Damage'],
  dano_fuego: ['+{v} daño de fuego', '+{v} Fire Damage'], dano_frio: ['+{v} daño de frío', '+{v} Cold Damage'], dano_rayo: ['+{v} daño de rayo', '+{v} Lightning Damage'],
  dano_veneno: ['+{v} daño de veneno', '+{v} Poison Damage'], dano_sombra: ['+{v} daño de sombra', '+{v} Shadow Damage'], dano_luz: ['+{v} daño de luz', '+{v} Holy Damage'], dano_sangre: ['+{v} daño de sangrado', '+{v} Bleed Damage'],
  def: ['+{v} defensa', '+{v} Defense'], def_pct: ['+{v}% defensa mejorada', '+{v}% Enhanced Defense'],
  vida: ['+{v} vida', '+{v} to Life'], mana: ['+{v} maná', '+{v} to Mana'], fue: ['+{v} fuerza', '+{v} to Strength'], des: ['+{v} destreza', '+{v} to Dexterity'], vit: ['+{v} vitalidad', '+{v} to Vitality'], ene: ['+{v} energía', '+{v} to Energy'],
  todos_atributos: ['+{v} a todos los atributos', '+{v} to All Attributes'],
  res_fuego: ['Resistencia al fuego +{v}%', 'Fire Resist +{v}%'], res_frio: ['Resistencia al frío +{v}%', 'Cold Resist +{v}%'], res_rayo: ['Resistencia al rayo +{v}%', 'Lightning Resist +{v}%'],
  res_veneno: ['Resistencia al veneno +{v}%', 'Poison Resist +{v}%'], res_sombra: ['Resistencia a la sombra +{v}%', 'Shadow Resist +{v}%'], res_todo: ['Todas las resistencias +{v}%', 'All Resistances +{v}%'],
  robo_vida: ['{v}% de vida robada por golpe', '{v}% Life Stolen per Hit'], robo_mana: ['{v}% de maná robado por golpe', '{v}% Mana Stolen per Hit'],
  vel_ataque: ['+{v}% velocidad de ataque', '+{v}% Increased Attack Speed'], vel_lanzar: ['+{v}% velocidad de lanzamiento', '+{v}% Faster Cast Rate'], vel_mover: ['+{v}% velocidad al correr', '+{v}% Faster Run/Walk'], vel_recuperar: ['+{v}% recuperación de golpes', '+{v}% Faster Hit Recovery'],
  critico: ['{v}% de golpe crítico', '{v}% Critical Strike'], bloqueo: ['+{v}% probabilidad de bloquear', '+{v}% Chance to Block'],
  regen_vida: ['Regenera {v} de vida por segundo', 'Replenish {v} Life per second'], regen_mana: ['Regeneración de maná +{v}%', 'Regenerate Mana +{v}%'],
  mas_habilidades: ['+{v} a todas las habilidades', '+{v} to All Skills'], mas_clase: ['+{v} a las habilidades de la clase', '+{v} to Class Skills'],
  hallazgo: ['{v}% más hallazgo de objetos mágicos', '{v}% Better Chance of Magic Items'], oro_extra: ['{v}% más oro de los monstruos', '{v}% Extra Gold from Monsters'],
  radio_luz: ['+{v} radio de luz', '+{v} to Light Radius'], precision: ['+{v} índice de ataque', '+{v} to Attack Rating'], reduc_dano: ['Daño reducido {v}%', 'Damage Reduced by {v}%'],
  espinas: ['El atacante recibe {v} de daño', 'Attacker Takes {v} Damage'], vida_por_muerte: ['+{v} vida por cada muerte', '+{v} Life after each Kill'], mana_por_muerte: ['+{v} maná por cada muerte', '+{v} Mana after each Kill'],
  golpe_aplastante: ['{v}% de golpe aplastante', '{v}% Crushing Blow'], herida_abierta: ['{v}% de herida abierta', '{v}% Open Wounds'], ralentizar: ['Ralentiza al objetivo {v}%', 'Slows Target by {v}%'], aturdir: ['{v}% de aturdir', '{v}% Chance to Stun'],
  perforar: ['{v}% de perforar', '{v}% Piercing Attack'], invocados_pct: ['+{v}% de vida y daño de invocados', '+{v}% Summon Life and Damage'], valor: ['{v}% resistencia al terror', '{v}% Terror Resistance'], durabilidad_infinita: ['Indestructible', 'Indestructible'], reduc_req: ['Requisitos -{v}%', 'Requirements -{v}%'],
};
export function textoStat(s: string, v: number, idi: 0 | 1): string {
  const t = NOMBRE_STAT[s]; if (!t) return `${s} ${v}`;
  return t[idi].replace('{v}', String(v)).replace('+-', '-');
}

// ------------------------------------------------------------------ equipo de Thor
const NOMBRE_BARDA: [string, string][] = [['', ''], ['Placa dorada y pañuelo', 'Gold Tag and Bandana'], ['Peto de cuero', 'Leather Breastplate'], ['Malla con hombreras', 'Mail with Pauldrons'], ['Barda de placas', 'Plate Barding'], ['Barda de la Casa GG', 'Barding of House GG']];
const NOMBRE_COLLAR: [string, string][] = [['Collar de cuero', 'Leather Collar'], ['Collar tachonado', 'Studded Collar'], ['Collar de plata', 'Silver Collar'], ['Collar de los guardianes', 'Guardian Collar']];
const TRAMO_NIVEL = [1, 6, 15, 30, 50, 75];
/** Un collar o una barda para Thor. La barda sube su armadura a un tramo; el collar le da daño, vida y velocidad. */
export function crearObjetoThor(clase: 'collar' | 'barda', nivel: number): Objeto {
  if (clase === 'barda') {
    let t = 0; for (let i = 0; i < TRAMO_NIVEL.length; i++) if (nivel >= TRAMO_NIVEL[i]) t = i;
    const tramo = Math.max(1, Math.min(5, t + (R() < 0.3 ? 1 : 0)));
    const rareza: Rareza = tramo === 5 ? 'legendario' : tramo >= 3 ? 'raro' : 'magico';
    return { uid: nuevoUid(), tipo: 'thor', base: 'thor_barda', rareza, nombre: [...NOMBRE_BARDA[tramo]] as [string, string], nivel, stats: [], durab: 0, durabMax: 0, huecos: 0, engarces: [], w: 2, h: 2, precio: 400 + tramo * 900, tramo };
  }
  const g = Math.min(3, Math.floor(nivel / 25));
  const k = 1 + nivel / 40;
  const stats: [string, number][] = [['thor_dano', Math.round((8 + R() * 10) * k)], ['thor_vida', Math.round((8 + R() * 12) * k)]];
  if (R() < 0.4) stats.push(['thor_vel', Math.round(5 + R() * 10)]);
  return { uid: nuevoUid(), tipo: 'thor', base: 'thor_collar', rareza: stats.length > 2 ? 'raro' : 'magico', nombre: [...NOMBRE_COLLAR[g]] as [string, string], nivel, stats, durab: 0, durabMax: 0, huecos: 0, engarces: [], w: 1, h: 1, precio: 300 + nivel * 25 };
}
