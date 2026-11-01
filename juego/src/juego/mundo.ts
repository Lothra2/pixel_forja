// La simulación: héroe, monstruos, invocados, proyectiles, áreas, botín y efectos de una zona.
import { generarZona, pasable, buscarCamino, lineaLibre, libreCerca, type Zona, type ObjZ } from '../mundo/zona';
import { ZONAS, POBL_ZONA, MISIONES, FRASE_JEFE } from '../mundo/actos';
import { MONSTRUOS, POBLACION, MODS, NOMBRES_UNICOS, type DefMonstruo } from '../datos/monstruos';
import { HABILIDADES, INVOCADOS, ATAQUE, type Habilidad } from '../datos/clases';
import { GENTE } from '../datos/npcs';
import { calcular, nivelHab, xpPara, recoger, type DatosHeroe, type Calc } from './heroe';
import { botin, crearObjeto, crearUnicoId, valorPocion, type Objeto, type Caida } from './objetos';
import { TALISMAN_JEFE } from '../datos/talismanes';
import type { Elemento } from './tipos_objetos';
import { R, entre, elegir, clamp, dist, hashTxt } from '../nucleo/azar';
import { Sonido } from '../audio/sonido';

export type Dir = 's' | 'so' | 'o' | 'no' | 'n' | 'ne' | 'e' | 'se';
export type Accion = 'quieto' | 'caminar' | 'correr' | 'atacar' | 'lanzar' | 'herido' | 'morir';
export const DIRS: Dir[] = ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'];
/** Rumbo en el piso: 0° = se (x+), 45° = s, 90° = so ... */
export function dirDe(dx: number, dy: number): Dir {
  const a = (Math.atan2(dy, dx) * 180) / Math.PI;
  const i = Math.round(((a % 360) + 360) % 360 / 45) % 8;
  return (['se', 's', 'so', 'o', 'no', 'n', 'ne', 'e'] as Dir[])[i];
}
export const CUADROS: Record<Accion, number> = { quieto: 4, caminar: 8, correr: 8, atacar: 8, lanzar: 8, herido: 4, morir: 8 };

export interface Ent {
  id: number;
  tipo: 'heroe' | 'monstruo' | 'invocado' | 'npc';
  x: number; y: number;
  dir: Dir; acc: Accion; t: number;
  /** Duración de la acción en curso (atacar, lanzar, herido) y cuándo pega. */
  dur: number; golpeEn: number; golpeo: boolean;
  vida: number; vidaMax: number;
  vel: number;
  radio: number;
  muerto: boolean; tMuerto: number;
  frio: number; congelado: number; veneno: number; venenoDps: number; aturdido: number; miedo: number; sangrado: number;
  maldicion?: { amplificar: number; debilitar: number; lento: number; t: number; res: number };
  destello: number;
  escala: number; tinte?: string;
}
export interface Monstruo extends Ent {
  tipo: 'monstruo' | 'invocado';
  def: DefMonstruo; nivel: number; dano: [number, number]; defensa: number; res: Partial<Record<Elemento, number>>;
  calidad: number; nombre: [string, string]; mods: string[];
  objetivo: Ent | null; estado: 'dormido' | 'deambular' | 'perseguir' | 'huir' | 'surgir';
  cd: number; pensar: number; camino: [number, number][] | null; ox: number; oy: number;
  xp: number; lider?: Monstruo; invocaCd: number; fase: number;
  misionUnico?: string;
  dueno?: boolean; invocaId?: string; tVida?: number;
  habla?: string;
}
export interface Proyectil {
  x: number; y: number; z: number; vx: number; vy: number; vida: number; dano: [number, number]; elem: Elemento;
  deHeroe: boolean; perfora: boolean; explota: number; efecto: string; golpeados: Set<number>; buscador: boolean; radio: number;
  arco?: { x0: number; y0: number; x1: number; y1: number; t: number; T: number; n?: number };
  hab?: Habilidad; nivelHab?: number; mult?: number; lento?: number; t: number; rebota?: number;
}
export interface Area { x: number; y: number; radio: number; dano: [number, number]; elem: Elemento; t: number; dur: number; tick: number; prox: number; deHeroe: boolean; efecto: string; retraso: number; caida?: boolean }
export interface Suelo { o: Objeto | null; oro: number; x: number; y: number; t: number; id: number }
export interface Numero { x: number; y: number; z: number; txt: string; color: string; t: number; grande?: boolean }
export interface Efecto { id: string; x: number; y: number; t: number; dir: number; escala: number; z?: number; seguir?: Ent; dur?: number }
export interface Particula { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; dur: number; color: string; tam: number; tipo: 'chispa' | 'humo' | 'sangre' | 'brasa' | 'nieve' | 'hoja' | 'pluma' | 'ceniza'; grav: number }
export interface Mancha { x: number; y: number; r: number; color: string; t: number; tipo: 'sangre' | 'quemado' | 'hielo' | 'veneno' }
export interface Npc extends Ent { npc: string; hablando: boolean }
export interface Portal { x: number; y: number; destino: string; x2?: number; y2?: number; t: number }

let nid = 1;
const nueva = (o: Partial<Ent>): Ent => ({ id: nid++, tipo: 'monstruo', x: 0, y: 0, dir: 's', acc: 'quieto', t: 0, dur: 0, golpeEn: 0, golpeo: false, vida: 1, vidaMax: 1, vel: 3, radio: 0.45, muerto: false, tMuerto: 0, frio: 0, congelado: 0, veneno: 0, venenoDps: 0, aturdido: 0, miedo: 0, sangrado: 0, destello: 0, escala: 1, ...o });

export interface Heroe extends Ent {
  tipo: 'heroe';
  d: DatosHeroe; c: Calc; mana: number;
  camino: [number, number][] | null; destino: [number, number] | null;
  objetivo: Monstruo | null; recoger: Suelo | null; hablar: Npc | null; usar: ObjZ | null;
  habActual: string; correr: boolean;
  buffs: Record<string, { t: number; bonos: Record<string, number>; hab: string }>;
  recargas: Record<string, number>;
  escudoHueso: number;
  torbellino: number; salto: { x0: number; y0: number; x1: number; y1: number; t: number; T: number; hab: Habilidad } | null;
  tempestad: number; huracan: number;
  pasoT: number; regen: number;
  ultimoGolpe: number;
}

export interface Juego {
  zona: Zona;
  heroe: Heroe;
  monstruos: Monstruo[];
  npcs: Npc[];
  proyectiles: Proyectil[];
  areas: Area[];
  suelo: Suelo[];
  numeros: Numero[];
  efectos: Efecto[];
  particulas: Particula[];
  manchas: Mancha[];
  portal: Portal | null;
  t: number;
  sacudida: number;
  mensajes: { txt: [string, string]; t: number; color: string }[];
  jefe: Monstruo | null;
  tirado: Set<string>;
  /** Fantasmas de miedo que asoman al borde de la luz. */
  visiones: { x: number; y: number; t: number; sprite: string; dir: Dir }[];
  eventos: { tipo: string; dato?: any }[];
  idi: 0 | 1;
  cuervos: { x: number; y: number; t: number; dur: number; dano: [number, number]; objetivo: Monstruo | null; ang: number }[];
  torretas: { x: number; y: number; t: number; dur: number; dano: [number, number]; cd: number }[];
  cadaveres: number;
}

// ------------------------------------------------------------------ zonas en memoria (no se regeneran mientras juegas)
const zonasVivas = new Map<string, { z: Zona; monstruos: Monstruo[]; suelo: Suelo[]; manchas: Mancha[] }>();
export const olvidarZonas = () => zonasVivas.clear();

export function crearJuego(d: DatosHeroe, idi: 0 | 1): Juego {
  const c = calcular(d);
  const h: Heroe = {
    ...(nueva({ tipo: 'heroe', vel: 5.2, radio: 0.4 }) as Ent), tipo: 'heroe', d, c, mana: d.manaActual ?? c.manaMax, vida: d.vidaActual ?? c.vidaMax, vidaMax: c.vidaMax,
    camino: null, destino: null, objetivo: null, recoger: null, hablar: null, usar: null, habActual: 'ataque', correr: true, buffs: {}, recargas: {}, escudoHueso: 0,
    torbellino: 0, salto: null, tempestad: 0, huracan: 0, pasoT: 0, regen: 0, ultimoGolpe: 0,
  };
  const j: Juego = {
    zona: null as unknown as Zona, heroe: h, monstruos: [], npcs: [], proyectiles: [], areas: [], suelo: [], numeros: [], efectos: [], particulas: [], manchas: [], portal: null,
    t: 0, sacudida: 0, mensajes: [], jefe: null, tirado: new Set(), visiones: [], eventos: [], idi, cuervos: [], torretas: [], cadaveres: 0,
  };
  return j;
}

/** Entra a una zona por una entrada (o a la piedra de viaje). */
export function entrarZona(j: Juego, zid: string, entrada: string) {
  // guardar la zona actual
  if (j.zona) zonasVivas.set(j.zona.id, { z: j.zona, monstruos: j.monstruos, suelo: j.suelo, manchas: j.manchas });
  const def = ZONAS[zid];
  let viva = zonasVivas.get(zid);
  if (!viva) {
    const semilla = (hashTxt(j.heroe.d.id + zid) % 100000) + Math.floor(Math.random() * 1000);
    const z = generarZona(def, semilla);
    viva = { z, monstruos: poblar(z, j.heroe.d), suelo: [], manchas: [] };
  }
  j.zona = viva.z; j.monstruos = viva.monstruos; j.suelo = viva.suelo; j.manchas = viva.manchas;
  j.proyectiles = []; j.areas = []; j.efectos = []; j.particulas = []; j.numeros = []; j.cuervos = []; j.torretas = [];
  // invocados vienen con el héroe
  const invocados = (zonasVivas.get(j.heroe.d.zona)?.monstruos ?? []).filter((m) => m.dueno && !m.muerto);
  for (const m of invocados) { const i = (zonasVivas.get(j.heroe.d.zona)!.monstruos).indexOf(m); if (i >= 0) zonasVivas.get(j.heroe.d.zona)!.monstruos.splice(i, 1); }
  const h = j.heroe;
  let p = j.zona.entradas[entrada] ?? j.zona.entradas['salida_' + j.heroe.d.zona];
  if (entrada === 'viaje') { const m = j.zona.marcas.find((q) => q.tipo === 'viaje'); if (m) p = libreCerca(j.zona, m.cx + 2, m.cy + 2); }
  if (entrada === 'portal' && j.zona.entradas.portal) p = j.zona.entradas.portal;
  if (!p) p = j.zona.entradas.centro ?? Object.values(j.zona.entradas)[0] ?? [j.zona.W / 2, j.zona.H / 2];
  h.x = p[0] + 0.5; h.y = p[1] + 0.5; h.camino = null; h.destino = null; h.objetivo = null; h.recoger = null; h.usar = null; h.hablar = null; h.acc = 'quieto';
  for (const m of invocados) { const q = libreCerca(j.zona, h.x + entre(-2, 2), h.y + entre(-2, 2)); m.x = q[0] + 0.5; m.y = q[1] + 0.5; m.objetivo = null; j.monstruos.push(m); }
  h.d.zona = zid; h.d.acto = def.acto;
  if (def.tipo === 'pueblo') { h.vida = h.vidaMax; h.mana = h.c.manaMax; }
  j.npcs = def.tipo === 'pueblo' ? crearNpcs(j.zona) : [];
  j.jefe = null;
  if (def.tipo === 'pueblo' && !h.d.viajes.includes(zid)) h.d.viajes.push(zid);
  // misión de llegar
  for (const m of MISIONES) if (m.objetivo.tipo === 'llegar' && m.objetivo.zona === zid && (h.d.misiones[m.id] ?? 0) === 1) { h.d.misiones[m.id] = 2; j.eventos.push({ tipo: 'mision', dato: m.id }); }
  j.eventos.push({ tipo: 'zona', dato: zid });
}

function crearNpcs(z: Zona): Npc[] {
  const gente = GENTE[z.acto] ?? [];
  const lugares = z.marcas.filter((m) => m.tipo === 'npc');
  return gente.map((id, i) => {
    const l = lugares[i % Math.max(1, lugares.length)] ?? { cx: z.W / 2, cy: z.H / 2 };
    const q = libreCerca(z, l.cx, l.cy);
    return { ...(nueva({ tipo: 'npc', x: q[0] + 0.5, y: q[1] + 0.5, vida: 1, vidaMax: 1, dir: elegir(['s', 'so', 'se'] as Dir[]) }) as Ent), tipo: 'npc', npc: id, hablando: false } as Npc;
  });
}

// ------------------------------------------------------------------ monstruos
function escalar(def: DefMonstruo, nivel: number) {
  const k = nivel - 1;
  return { vida: Math.max(4, Math.round(def.vida * 0.6 * (1 + k * 0.32) * (1 + k * 0.012))), dano: [Math.max(1, Math.round(def.dano[0] * (k < 6 ? 0.6 : 0.75) * (1 + k * 0.17))), Math.max(1, Math.round(def.dano[1] * (k < 6 ? 0.6 : 0.75) * (1 + k * 0.17)))] as [number, number], defensa: Math.round(def.def + nivel * 7), xp: Math.round(def.xp * Math.pow(nivel, 1.18)) };
}
export function crearMonstruo(def: DefMonstruo, nivel: number, x: number, y: number, calidad = 0, dif = 0): Monstruo {
  const s = escalar(def, nivel + dif * 0);
  const mv = [1, 3, 4, 1, 1][calidad] * (def.jefe ? 1 : 1) * [1, 2.2, 3.6][dif];
  const md = [1, 1.5, 1.8, 1, 1][calidad] * [1, 1.6, 2.4][dif];
  const m: Monstruo = {
    ...(nueva({ tipo: 'monstruo', x, y, vel: def.vel, radio: 0.42 * (def.huella ?? 1), escala: def.escala ?? 1, tinte: def.tinte }) as Ent), tipo: 'monstruo',
    def, nivel, dano: [Math.round(s.dano[0] * md), Math.round(s.dano[1] * md)], defensa: s.defensa, res: { ...(def.res ?? {}) }, calidad, nombre: def.nombre, mods: [],
    objetivo: null, estado: def.surge ? 'surgir' : 'dormido', cd: entre(0.5, 1.5), pensar: R(), camino: null, ox: x, oy: y, xp: Math.round(s.xp * [1, 3, 5, 10, 1][calidad] * [1, 2.5, 5][dif]), invocaCd: entre(3, 6), fase: 0,
  };
  m.vidaMax = m.vida = Math.round(s.vida * mv);
  m.dir = elegir(DIRS);
  return m;
}
function poblar(z: Zona, d: DatosHeroe): Monstruo[] {
  const out: Monstruo[] = [];
  const pool = POBLACION[POBL_ZONA[z.id] ?? ''] ?? [];
  if (!pool.length) return out;
  const def = ZONAS[z.id];
  const dif = d.dificultad;
  const nivel = z.nivel + dif * 25;
  for (const s of z.spawns) {
    if (s.tipo === 'jefe') {
      const dm = MONSTRUOS[def.jefe!]; if (!dm) continue;
      const mis = MISIONES.find((q) => q.objetivo.tipo === 'matar' && q.objetivo.zona === z.id && q.objetivo.monstruo === def.jefe);
      const esActo = !!dm.jefe;
      const m = crearMonstruo(dm, nivel + 2, s.cx + 0.5, s.cy + 0.5, esActo ? 4 : 2, dif);
      if (!esActo) {
        const nu = mis?.objetivo.tipo === 'matar' && mis.objetivo.nombreUnico;
        m.nombre = nu || [dm.nombre[0], dm.nombre[1]];
        m.mods = [elegir([...MODS]).id, elegir([...MODS]).id];
        m.escala = (dm.escala ?? 1) * 1.15;
      }
      m.misionUnico = mis?.id;
      m.estado = 'dormido';
      out.push(m);
      // escolta
      for (let i = 0; i < (esActo ? 4 : 5); i++) { const q = libreCerca(z, s.cx + entre(-4, 4), s.cy + entre(-4, 4)); out.push(crearMonstruo(MONSTRUOS[elegir(pool)], nivel, q[0] + 0.5, q[1] + 0.5, 0, dif)); }
      continue;
    }
    const id = R() < 0.55 ? pool[0] : elegir(pool);
    const dm = MONSTRUOS[id]; if (!dm) continue;
    if (s.tipo === 'unico' || s.tipo === 'campeon') {
      const cal = s.tipo === 'unico' ? 2 : 1;
      const n = s.tipo === 'unico' ? 4 : 3;
      let lider: Monstruo | undefined;
      const mods = [elegir([...MODS]).id]; if (cal === 2) mods.push(elegir([...MODS]).id);
      for (let i = 0; i < n; i++) {
        const q = libreCerca(z, s.cx + entre(-2, 2), s.cy + entre(-2, 2));
        const m = crearMonstruo(dm, nivel + (cal === 2 ? 2 : 1), q[0] + 0.5, q[1] + 0.5, cal === 2 && i > 0 ? 0 : cal, dif);
        if (cal === 2 && i === 0) { lider = m; m.nombre = [`${elegir(NOMBRES_UNICOS.pre)[0]} ${elegir(NOMBRES_UNICOS.suf)[0]}`, '']; const a = elegir(NOMBRES_UNICOS.pre), b = elegir(NOMBRES_UNICOS.suf); m.nombre = [`${a[0]} ${b[0]}`, `${a[1]} ${b[1]}`]; m.mods = mods; m.escala *= 1.12; }
        else if (cal === 1) { m.mods = mods; m.nombre = [`${dm.nombre[0]} campeón`, `Champion ${dm.nombre[1]}`]; }
        else if (lider) m.lider = lider;
        aplicarMods(m);
        out.push(m);
      }
      continue;
    }
    const n = Math.max(1, Math.round((dm.ia === 'enjambre' ? (z.nivel < 6 ? 3 : 5) : dm.ia === 'bruto' ? 2 : z.nivel < 6 ? 2 : 3) * s.fuerza));
    for (let i = 0; i < n; i++) { const q = libreCerca(z, s.cx + entre(-2.5, 2.5), s.cy + entre(-2.5, 2.5)); out.push(crearMonstruo(i > 0 && R() < 0.3 ? MONSTRUOS[elegir(pool)] : dm, nivel, q[0] + 0.5, q[1] + 0.5, 0, dif)); }
  }
  return out;
}
function aplicarMods(m: Monstruo) {
  for (const id of m.mods) {
    const md = MODS.find((x) => x.id === id); if (md && !m.tinte && m.calidad === 1) m.tinte = md.tinte;
    if (id === 'rapido') m.vel *= 1.5;
    if (id === 'piel_piedra') m.defensa *= 3;
    if (id === 'fuerte') { m.dano = [m.dano[0] * 1.5, m.dano[1] * 1.5]; }
    if (id === 'ardiente') m.res.fuego = 75;
    if (id === 'helado') m.res.frio = 75;
    if (id === 'electrico') m.res.rayo = 75;
  }
}

// ------------------------------------------------------------------ utilidades
export const vivos = (j: Juego) => j.monstruos.filter((m) => !m.muerto);
const enemigosDe = (j: Juego, deHeroe: boolean): Ent[] => (deHeroe ? j.monstruos.filter((m) => !m.muerto && !m.dueno && m.estado !== 'surgir') : [j.heroe, ...j.monstruos.filter((m) => m.dueno && !m.muerto)]);
export function msg(j: Juego, txt: [string, string], color = '#e0d0a0') { j.mensajes.push({ txt, t: 0, color }); if (j.mensajes.length > 6) j.mensajes.shift(); }
function numero(j: Juego, e: Ent, v: number, color: string, grande = false) { j.numeros.push({ x: e.x, y: e.y, z: 60 * e.escala, txt: String(Math.round(v)), color, t: 0, grande }); }
export function efecto(j: Juego, id: string, x: number, y: number, dir = 0, escala = 1, z = 0, dur?: number) { j.efectos.push({ id, x, y, t: 0, dir, escala, z, dur }); }
export function particulas(j: Juego, x: number, y: number, n: number, tipo: Particula['tipo'], color: string, fuerza = 1, z = 30) {
  if (j.particulas.length > 900) return;
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, v = R() * 2.2 * fuerza;
    j.particulas.push({ x, y, z: z + R() * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (tipo === 'humo' ? 10 : 40 + R() * 60) * fuerza, t: 0, dur: tipo === 'humo' ? 1.2 + R() : 0.5 + R() * 0.6, color, tam: tipo === 'humo' ? 3 + R() * 4 : 1 + R() * 2, tipo, grav: tipo === 'humo' || tipo === 'brasa' || tipo === 'ceniza' ? -20 : 220 });
  }
}
const COLOR_ELEM: Record<Elemento, string> = { fisico: '#ffffff', fuego: '#ff8030', frio: '#80c8ff', rayo: '#ffff90', veneno: '#80ff60', sombra: '#c070ff', luz: '#fff0b0', sangre: '#ff3030' };
const SONIDO_ELEM: Record<Elemento, string> = { fisico: 'golpe_carne', fuego: 'fuego_impacto', frio: 'hielo_impacto', rayo: 'rayo', veneno: 'veneno', sombra: 'sombra', luz: 'luz', sangre: 'golpe_carne' };
export const colorElem = (e: Elemento) => COLOR_ELEM[e];

function sonar(j: Juego, id: string, x?: number, y?: number, vol = 1) {
  const h = j.heroe;
  let pan = 0, d = 0;
  if (x !== undefined && y !== undefined) { pan = clamp(((x - y) - (h.x - h.y)) / 14, -1, 1); d = clamp(dist(x, y, h.x, h.y) / 22, 0, 1); }
  Sonido.efecto(id, { pan, dist: d, vol });
}

// ------------------------------------------------------------------ daño
export interface Golpe { min: number; max: number; elem: Elemento; precision?: number; critico?: number; robo?: number; aturdir?: number; empuje?: number; lento?: number; aplastar?: number; herida?: number; deHeroe: boolean; fuente?: Ent; extra?: Partial<Record<Elemento, number>>; sinFallo?: boolean }
export function danar(j: Juego, v: Ent, g: Golpe): number {
  if (v.muerto) return 0;
  const h = j.heroe;
  // ¿pega?
  if (!g.sinFallo && g.elem === 'fisico') {
    if (v.tipo === 'heroe') {
      const mon = g.fuente as Monstruo | undefined;
      const ar = 20 + (mon?.nivel ?? 1) * 14;
      const p = clamp((ar / (ar + h.c.def)) * 2 * (mon?.nivel ?? 1) / ((mon?.nivel ?? 1) + h.d.nivel) * 100, 5, 95);
      if (R() * 100 > p) { numero(j, v, 0, '#909090'); j.numeros[j.numeros.length - 1].txt = j.idi ? 'Miss' : 'Falla'; return 0; }
      if (h.c.esquiva && R() * 100 < h.c.esquiva) { j.numeros.push({ x: v.x, y: v.y, z: 60, txt: j.idi ? 'Dodge' : 'Esquiva', color: '#a0ffa0', t: 0 }); return 0; }
      if (h.c.bloqueo && R() * 100 < h.c.bloqueo && h.acc !== 'atacar') { h.acc = 'herido'; h.t = 0; h.dur = 0.25; sonar(j, 'bloqueo', v.x, v.y); j.numeros.push({ x: v.x, y: v.y, z: 60, txt: j.idi ? 'Block' : 'Bloqueo', color: '#c0c0ff', t: 0 }); return 0; }
    } else if (g.deHeroe && g.precision !== undefined) {
      const m = v as Monstruo;
      const def = m.defensa * (1 + (m.maldicion ? -0.3 : 0));
      const p = clamp((g.precision / (g.precision + def)) * 2 * h.d.nivel / (h.d.nivel + m.nivel) * 100, 5, 95);
      if (R() * 100 > p) { j.numeros.push({ x: v.x, y: v.y, z: 60 * v.escala, txt: j.idi ? 'Miss' : 'Falla', color: '#808080', t: 0 }); return 0; }
    }
  }
  let total = 0;
  const partes: [Elemento, number][] = [[g.elem, entre(g.min, g.max)]];
  for (const [e, v2] of Object.entries(g.extra ?? {})) if (v2) partes.push([e as Elemento, v2 * entre(0.7, 1.3)]);
  let crit = false;
  if (g.critico && R() * 100 < g.critico) crit = true;
  for (let [e, d] of partes) {
    if (crit && (e === 'fisico' || e === 'sangre')) d *= 2;
    let res = 0;
    if (v.tipo === 'heroe') { res = h.c.res[e] ?? 0; if (e === 'fisico') res = h.c.reduc_dano; }
    else { const m = v as Monstruo; res = m.res[e] ?? 0; if (m.maldicion) { res += m.maldicion.res; if (e === 'fisico' && m.maldicion.amplificar) res -= m.maldicion.amplificar; } }
    if (g.fuente && g.fuente.tipo === 'monstruo' && (g.fuente as Monstruo).maldicion?.debilitar) d *= 1 - (g.fuente as Monstruo).maldicion!.debilitar / 100;
    d *= 1 - clamp(res, -100, 95) / 100;
    if (e === 'veneno') { v.veneno = Math.max(v.veneno, 2.5); v.venenoDps = Math.max(v.venenoDps, d / 2.5); total += d * 0.2; continue; }
    if (e === 'frio') { v.frio = Math.max(v.frio, 2.5 + (v.tipo === 'heroe' ? 0 : 1)); if (R() < 0.15 && v.tipo !== 'heroe' && !(v as Monstruo).def.jefe) v.congelado = 1.2; }
    if (e === 'sangre') v.sangrado = Math.max(v.sangrado, 3);
    total += d;
  }
  // escudo de hueso
  if (v.tipo === 'heroe' && h.escudoHueso > 0) { const a = Math.min(h.escudoHueso, total); h.escudoHueso -= a; total -= a; if (a > 0) particulas(j, v.x, v.y, 3, 'chispa', '#e0d8c0'); }
  if (g.aplastar && v.tipo !== 'heroe' && R() * 100 < g.aplastar) total += v.vida * ((v as Monstruo).calidad >= 3 ? 0.05 : 0.25);
  if (g.herida && R() * 100 < g.herida) v.sangrado = 4;
  total = Math.max(0, total);
  v.vida -= total;
  v.destello = 0.12;
  if (total > 0) {
    numero(j, v, total, v.tipo === 'heroe' ? '#ff4040' : crit ? '#ffe040' : COLOR_ELEM[g.elem], crit);
    if (g.robo && g.deHeroe) h.vida = Math.min(h.vidaMax, h.vida + total * g.robo / 100);
    if (g.deHeroe && h.c.robo_mana) h.mana = Math.min(h.c.manaMax, h.mana + total * h.c.robo_mana / 100);
  }
  if (g.aturdir && v.tipo !== 'heroe' && R() * 100 < g.aturdir) v.aturdido = 1;
  if (g.lento) v.frio = Math.max(v.frio, 2);
  if (g.empuje && v.tipo !== 'heroe' && g.fuente && !(v as Monstruo).def.jefe) { const dx = v.x - g.fuente.x, dy = v.y - g.fuente.y, l = Math.hypot(dx, dy) || 1; for (let k = 0; k < 6; k++) { const nx = v.x + (dx / l) * 0.35, ny = v.y + (dy / l) * 0.35; if (pasable(j.zona, nx, ny)) { v.x = nx; v.y = ny; } } }
  // sangre y reacción
  if (g.elem === 'fisico' || g.elem === 'sangre') particulas(j, v.x, v.y, total > v.vidaMax * 0.2 ? 10 : 5, 'sangre', (v as Monstruo).def?.sonido === 'hueso' ? '#d8d0b8' : '#8a0c0c', 1, 34 * v.escala);
  if (v.tipo === 'heroe') {
    j.sacudida = Math.max(j.sacudida, total > h.vidaMax * 0.15 ? 0.35 : 0.12);
    if (total > h.vidaMax * 0.08 && h.acc !== 'atacar' && h.acc !== 'lanzar') { h.acc = 'herido'; h.t = 0; h.dur = 0.3 / (1 + h.c.vel_recuperar / 100); }
    sonar(j, total > h.vidaMax * 0.1 ? 'dolor_heroe' : 'golpe_carne');
    if (R() < 0.06) desgastar(j, elegir(['cabeza', 'torso', 'izq', 'manos', 'pies', 'cinturon']));
    // espinas
    if (g.fuente && g.fuente.tipo === 'monstruo' && (h.c.espinas || h.buffs.aura_espinas)) {
      const esp = h.c.espinas + (h.buffs.aura_espinas ? total * (h.buffs.aura_espinas.bonos.espinas_pct ?? 0) / 100 : 0);
      if (esp > 0) danar(j, g.fuente, { min: esp, max: esp, elem: 'fisico', deHeroe: true, sinFallo: true });
    }
    if (h.buffs.armadura_escarcha && g.fuente && g.fuente.tipo === 'monstruo') { g.fuente.frio = 3; g.fuente.congelado = 0.8; }
    if (h.vida <= 0) morirHeroe(j);
  } else {
    const m = v as Monstruo;
    sonar(j, g.elem !== 'fisico' ? SONIDO_ELEM[g.elem] : m.def.sonido === 'hueso' ? 'golpe_hueso' : m.def.sonido === 'metal' ? 'golpe_metal' : 'golpe_carne', v.x, v.y, 0.8);
    if (m.estado === 'dormido' || m.estado === 'deambular') { m.estado = 'perseguir'; m.objetivo = g.fuente ?? j.heroe; }
    if (total > m.vidaMax * 0.12 && m.acc !== 'atacar' && m.acc !== 'lanzar' && m.calidad < 3) { m.acc = 'herido'; m.t = 0; m.dur = 0.3; }
    if (crit || total > m.vidaMax * 0.3) j.sacudida = Math.max(j.sacudida, 0.1);
    if (m.vida <= 0) morirMonstruo(j, m, g);
  }
  return total;
}

function morirMonstruo(j: Juego, m: Monstruo, g?: Golpe) {
  m.muerto = true; m.acc = 'morir'; m.t = 0; m.tMuerto = 0; m.vida = 0;
  const h = j.heroe;
  if (m.dueno) { j.cadaveres++; return; }
  sonar(j, m.def.sonido === 'hueso' ? 'muerte_esqueleto' : m.calidad >= 3 ? 'rugido_jefe' : 'muerte_monstruo', m.x, m.y);
  j.manchas.push({ x: m.x, y: m.y, r: 0.8 + R() * 0.8 * m.escala, color: m.def.sonido === 'hueso' ? '#4a4436' : '#3a0606', t: 0, tipo: 'sangre' });
  if (j.manchas.length > 160) j.manchas.shift();
  particulas(j, m.x, m.y, 14, 'sangre', m.def.sonido === 'hueso' ? '#d8d0b8' : '#7a0808', 1.4, 30);
  // experiencia (con castigo si el monstruo es muy bajo)
  const dif = h.d.nivel - m.nivel;
  const k = dif > 5 ? Math.max(0.05, 1 - (dif - 5) * 0.15) : 1;
  ganarXp(j, Math.round(m.xp * k));
  if (h.c.vida_por_muerte) h.vida = Math.min(h.vidaMax, h.vida + h.c.vida_por_muerte);
  if (h.c.mana_por_muerte) h.mana = Math.min(h.c.manaMax, h.mana + h.c.mana_por_muerte);
  // botín
  const cal = m.def.jefe ? 4 : m.calidad;
  const caidas = botin(m.nivel, cal, h.c.hallazgo, h.c.oro_extra);
  if (m.def.jefe) caidas.push({ obj: crearObjeto(m.nivel, R() < 0.5 ? 'unico' : 'raro') }, { obj: crearObjeto(m.nivel, 'raro') });
  const tj = TALISMAN_JEFE[m.def.id]; if (tj) { const o = crearUnicoId(tj, m.nivel); if (o) caidas.push({ obj: o }); }
  if (m.calidad >= 2 && !m.def.jefe && R() < 0.25) caidas.push({ obj: crearObjeto(m.nivel, R() < 0.3 ? 'raro' : 'magico', (b) => b.ranura === 'talisman') });
  soltar(j, m.x, m.y, caidas);
  if (m.mods.includes('ardiente')) { j.areas.push({ x: m.x, y: m.y, radio: 2, dano: [m.dano[0], m.dano[1] * 1.2], elem: 'fuego', t: 0, dur: 0.4, tick: 1, prox: 0.3, deHeroe: false, efecto: 'explosion_fuego', retraso: 0.3 }); efecto(j, 'explosion_fuego', m.x, m.y); }
  if (m.mods.includes('helado')) { efecto(j, 'nova_escarcha', m.x, m.y); for (let a = 0; a < 8; a++) disparar(j, m, m.x + Math.cos(a * 0.785), m.y + Math.sin(a * 0.785), { min: m.dano[0] * 0.5, max: m.dano[1] * 0.5, elem: 'frio', deHeroe: false }, 'saeta_hielo', 8); }
  // misiones
  if (m.misionUnico && (h.d.misiones[m.misionUnico] ?? 0) <= 1) { h.d.misiones[m.misionUnico] = 2; j.eventos.push({ tipo: 'mision', dato: m.misionUnico }); }
  if (m.def.jefe) {
    j.eventos.push({ tipo: 'jefe_muerto', dato: m.def.id });
    efecto(j, 'alma_ascendente', m.x, m.y, 0, 2);
    j.sacudida = 1;
    if (!h.d.actosHechos.includes(h.d.acto)) h.d.actosHechos.push(h.d.acto);
  }
  if (j.jefe === m) j.jefe = null;
  void g;
}
export function soltar(j: Juego, x: number, y: number, caidas: Caida[]) {
  caidas.forEach((c, i) => {
    const a = (i / Math.max(1, caidas.length)) * Math.PI * 2 + R();
    const r = 0.6 + R() * 1.2;
    let px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (!pasable(j.zona, px, py)) { const q = libreCerca(j.zona, px, py); px = q[0] + 0.5; py = q[1] + 0.5; }
    j.suelo.push({ o: c.obj ?? null, oro: c.oro ?? 0, x: px, y: py, t: 0, id: nid++ });
    if (c.obj && (c.obj.rareza === 'unico' || c.obj.rareza === 'legendario' || c.obj.rareza === 'conjunto')) { sonar(j, 'objeto_unico', px, py); efecto(j, 'pilar_luz', px, py, 0, 0.6); }
    else if (c.obj && c.obj.tipo === 'runa') sonar(j, 'objeto_raro', px, py);
    else if (c.obj) sonar(j, 'objeto_cae', px, py, 0.6);
  });
}
export function ganarXp(j: Juego, xp: number) {
  const h = j.heroe;
  if (h.d.nivel >= 70) return;
  h.d.xp += xp;
  while (h.d.xp >= xpPara(h.d.nivel + 1) && h.d.nivel < 70) {
    h.d.nivel++; h.d.puntosAtrib += 5; h.d.puntosHab += 1;
    recalc(j); h.vida = h.vidaMax; h.mana = h.c.manaMax;
    efecto(j, 'subida_nivel', h.x, h.y, 0, 1);
    sonar(j, 'nivel');
    j.eventos.push({ tipo: 'nivel' });
    msg(j, [`¡Nivel ${h.d.nivel}! Tienes puntos nuevos para repartir.`, `Level ${h.d.nivel}! You have new points to spend.`], '#ffe080');
  }
}
function morirHeroe(j: Juego) {
  const h = j.heroe;
  if (h.muerto) return;
  h.muerto = true; h.acc = 'morir'; h.t = 0; h.vida = 0;
  h.d.muertes++;
  sonar(j, 'muerte_heroe');
  Sonido.latido(false);
  j.eventos.push({ tipo: 'muerte' });
}

function desgastar(j: Juego, cas: string) {
  const o = (j.heroe.d.equipo as any)[cas] as Objeto | undefined;
  if (!o || !o.durabMax || o.stats.some((s) => s[0] === 'durabilidad_infinita') || o.durab <= 0) return;
  o.durab -= 1;
  if (o.durab === 3) msg(j, [`${o.nombre[0]} está por romperse. Repáralo con el herrero.`, `${o.nombre[1]} is about to break. Have the smith repair it.`], '#ffb040');
  if (o.durab <= 0) { o.durab = 0; msg(j, [`¡${o.nombre[0]} se rompió! Ya no sirve hasta repararlo.`, `${o.nombre[1]} broke! It is useless until repaired.`], '#ff5040'); sonar(j, 'negado'); recalc(j); }
}
export function recalc(j: Juego) {
  const h = j.heroe;
  const b: Record<string, number> = {};
  for (const bf of Object.values(h.buffs)) for (const [k, v] of Object.entries(bf.bonos)) b[k] = (b[k] ?? 0) + v;
  const vidaPct = h.vidaMax ? h.vida / h.vidaMax : 1;
  h.c = calcular(h.d, b);
  h.vidaMax = h.c.vidaMax;
  h.vida = Math.min(h.vidaMax, Math.max(h.muerto ? 0 : 1, vidaPct * h.vidaMax));
  h.mana = Math.min(h.mana, h.c.manaMax);
}

// ------------------------------------------------------------------ proyectiles
function disparar(j: Juego, de: Ent, tx: number, ty: number, g: Golpe, efectoId: string, vel: number, o: Partial<Proyectil> = {}) {
  const dx = tx - de.x, dy = ty - de.y, l = Math.hypot(dx, dy) || 1;
  j.proyectiles.push({ x: de.x + (dx / l) * 0.5, y: de.y + (dy / l) * 0.5, z: 34, vx: (dx / l) * vel, vy: (dy / l) * vel, vida: o.vida ?? 2.2, dano: [g.min, g.max], elem: g.elem, deHeroe: g.deHeroe, perfora: false, explota: 0, efecto: efectoId, golpeados: new Set(), buscador: false, radio: 0.5, t: 0, ...o });
}

// ------------------------------------------------------------------ habilidades del héroe
export function habilidadDe(id: string): Habilidad { return id === 'ataque' ? ATAQUE : HABILIDADES.find((h) => h.id === id) ?? ATAQUE; }
export function costoMana(j: Juego, hb: Habilidad) { const n = Math.max(1, nivelHab(j.heroe.d, hb.id, j.heroe.c)); return Math.max(0, hb.mana[0] + hb.mana[1] * (n - 1)); }
export function danoHab(j: Juego, hb: Habilidad, n: number): [number, number] {
  if (!hb.dano) return [0, 0];
  let k = Math.pow(1 + hb.dano[2], n - 1);
  for (const [sid, pct] of hb.sinergias ?? []) k *= 1 + (pct * (j.heroe.d.habs[sid] ?? 0)) / 100;
  if (hb.elem === 'fuego') k *= 1 + j.heroe.c.fuego_pct / 100;
  // la energía da un poco de poder a los hechizos
  if (hb.anim === 'lanzar') k *= 1 + j.heroe.c.ene / 400;
  return [Math.round(hb.dano[0] * k), Math.round(hb.dano[1] * k)];
}
const val = (b: [number, number] | undefined, n: number) => (b ? b[0] + b[1] * (n - 1) : 0);
function golpeArma(j: Juego, mult: number, elemHab?: Elemento, extraHab?: [number, number]): Golpe {
  const h = j.heroe, c = h.c;
  const extra: Partial<Record<Elemento, number>> = { ...c.elem };
  if (h.buffs.aura_llama) extra.fuego = (extra.fuego ?? 0) + (h.buffs.aura_llama.bonos.dano_fuego ?? 0);
  if (extraHab && elemHab) extra[elemHab] = (extra[elemHab] ?? 0) + entre(extraHab[0], extraHab[1]);
  return { min: c.dano[0] * mult, max: c.dano[1] * mult, elem: 'fisico', precision: c.precision, critico: c.critico, robo: c.robo_vida, aturdir: c.aturdir, aplastar: c.golpe_aplastante, herida: c.herida_abierta, lento: c.ralentizar, deHeroe: true, fuente: h, extra };
}
/** Velocidad de ataque/lanzamiento: duración de la animación. */
export const durAtaque = (h: Heroe) => clamp(0.62 / (1 + h.c.vel_ataque / 100), 0.25, 1);
export const durLanzar = (h: Heroe) => clamp(0.6 / (1 + h.c.vel_lanzar / 100), 0.25, 1);
const rangoMelee = (h: Heroe) => (h.c.tipoArma === 'lanza' || h.c.tipoArma === 'alabarda' || h.c.tipoArma === 'guadana' ? 2.0 : 1.4);
export const esDistancia = (j: Juego, hb: Habilidad) => hb.tipo !== 'golpe' && hb.tipo !== 'salto' && hb.tipo !== 'carga' && hb.tipo !== 'torbellino' ? true : false;

/** Intenta usar una habilidad hacia (tx,ty) / objetivo. Devuelve si empezó la acción. */
export function usarHabilidad(j: Juego, id: string, tx: number, ty: number, obj: Monstruo | null): boolean {
  const h = j.heroe;
  if (h.muerto || h.acc === 'atacar' || h.acc === 'lanzar' || h.salto) return false;
  if (j.zona.tipo === 'pueblo') return false;
  const hb = habilidadDe(id);
  // el ataque básico con arco o ballesta dispara
  const basico = id === 'ataque';
  if (hb.tipo === 'pasiva') return false;
  const n = basico ? 1 : nivelHab(h.d, id, h.c);
  if (!basico && n <= 0) return false;
  if ((h.recargas[id] ?? 0) > 0) return false;
  const costo = basico ? 0 : costoMana(j, hb);
  if (h.mana < costo) { sonar(j, 'mana_falta'); msg(j, ['No tengo suficiente maná.', 'Not enough mana.'], '#8080ff'); return false; }
  // auras: se activan al ponerlas en el botón derecho, no se lanzan
  if (hb.tipo === 'aura') return false;
  const melee = (hb.tipo === 'golpe' && !(basico && h.c.distancia)) || hb.tipo === 'salto' && false;
  if (melee) {
    if (!obj) return false;
    if (dist(h.x, h.y, obj.x, obj.y) > rangoMelee(h) + obj.radio) return false;
  }
  if (hb.req && hb.tipo === 'golpe' && hb.id === 'golpe_escudo' && !h.d.equipo.izq) { msg(j, ['Necesito un escudo.', 'I need a shield.']); return false; }
  h.mana -= costo;
  if (hb.recarga) h.recargas[id] = hb.recarga;
  h.dir = dirDe(tx - h.x, ty - h.y);
  const anim = basico ? 'atacar' : hb.anim;
  h.acc = anim; h.t = 0; h.golpeo = false;
  h.dur = anim === 'atacar' ? durAtaque(h) : durLanzar(h);
  h.golpeEn = h.dur * 0.55;
  h.habActual = id;
  (h as any).tx = tx; (h as any).ty = ty; (h as any).tobj = obj;
  h.camino = null; h.destino = null;
  if (!basico && hb.sonido && hb.anim === 'lanzar') sonar(j, hb.sonido);
  else sonar(j, h.c.distancia && (basico || hb.tipo === 'proyectil') ? (h.c.tipoArma === 'ballesta' ? 'virote' : 'flecha') : 'tajo');
  return true;
}

/** Lo que pasa en el cuadro del golpe. */
function resolverHabilidad(j: Juego) {
  const h = j.heroe;
  const id = h.habActual, hb = habilidadDe(id), basico = id === 'ataque';
  const n = basico ? 1 : Math.max(1, nivelHab(h.d, id, h.c));
  const tx: number = (h as any).tx, ty: number = (h as any).ty;
  const obj: Monstruo | null = (h as any).tobj;
  const mult = (hb.mult ? val(hb.mult, n) : 100) / 100;
  const dh = danoHab(j, hb, n);
  const golpes = Math.round(val(hb.n, n)) || 1;
  const prec = (hb.bonos?.precision ? val(hb.bonos.precision, n) : 0);
  const efectoDir = DIRS.indexOf(h.dir);
  switch (hb.tipo) {
    case 'golpe': {
      if (basico && h.c.distancia) { const g = golpeArma(j, 1); disparar(j, h, tx, ty, g, h.c.tipoArma === 'ballesta' ? 'virote' : 'flecha', 16, { perfora: R() * 100 < h.c.perforar }); break; }
      if (!obj || obj.muerto) break;
      for (let k = 0; k < golpes; k++) {
        const g = golpeArma(j, mult, hb.elem !== 'fisico' ? hb.elem : undefined, hb.dano ? dh : undefined);
        if (prec) g.precision! += prec;
        if (hb.bonos?.aturdir) g.aturdir = 100;
        if (hb.bonos?.empuje) g.empuje = 1;
        if (hb.id === 'ejecucion' && obj.vida < obj.vidaMax * 0.25 && obj.calidad < 3) { g.min *= 3; g.max *= 3; }
        const d = danar(j, obj, g);
        if (R() < 0.04) desgastar(j, 'arma');
        if (d > 0 && h.c.vivo) particulas(j, obj.x, obj.y, 8, h.c.vivo === 'fuego' ? 'brasa' : 'chispa', COLOR_ELEM[h.c.vivo], 1.2, 40);
      }
      if (!basico && hb.efecto) efecto(j, efectoDe(hb.efecto, hb.elem), obj.x, obj.y, efectoDir);
      if (hb.explota) { j.areas.push({ x: obj.x, y: obj.y, radio: hb.explota, dano: dh, elem: hb.elem, t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: '', retraso: 0 }); efecto(j, hb.elem === 'luz' ? 'castigo' : 'explosion_fuego', obj.x, obj.y, 0, 1.2); }
      if (h.buffs.aura_fuerza || basico) {/* nada */}
      break;
    }
    case 'proyectil': {
      const cnt = golpes;
      const abanico = hb.id === 'mil_palmas' ? Math.PI * 2 : cnt > 1 ? Math.min(1.2, 0.18 * cnt) : 0;
      const base = Math.atan2(ty - h.y, tx - h.x);
      for (let k = 0; k < cnt; k++) {
        const a = cnt === 1 ? base : hb.id === 'mil_palmas' ? (k / cnt) * Math.PI * 2 : base - abanico / 2 + (abanico * k) / (cnt - 1);
        const g: Golpe = hb.mult ? golpeArma(j, mult, hb.elem !== 'fisico' ? hb.elem : undefined, hb.dano ? dh : undefined) : { min: dh[0], max: dh[1], elem: hb.elem, deHeroe: true, fuente: h, sinFallo: true };
        if (prec && g.precision !== undefined) g.precision += prec;
        disparar(j, h, h.x + Math.cos(a) * 5, h.y + Math.sin(a) * 5, g, efectoDe(hb.efecto, hb.elem), hb.vel ?? 12, { perfora: !!hb.perfora || R() * 100 < h.c.perforar, explota: hb.explota ?? 0, buscador: !!hb.buscador, hab: hb, nivelHab: n, vida: hb.id === 'martillo_bendito' ? 2.4 : hb.id === 'orbe_glacial' ? 1.4 : 1.6, rebota: hb.id === 'chispa' ? 1 : 0 });
      }
      break;
    }
    case 'nova': {
      const r = hb.radio ?? 4;
      efecto(j, efectoDe(hb.efecto, hb.elem), h.x, h.y, 0, r / 4);
      for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, h.x, h.y) <= r) { danar(j, e, { min: dh[0], max: dh[1], elem: hb.elem, deHeroe: true, fuente: h, sinFallo: true, aturdir: hb.bonos?.aturdir ? 60 : 0 }); }
      j.sacudida = Math.max(j.sacudida, 0.2);
      break;
    }
    case 'area': {
      const r = hb.radio ?? 3;
      let ax = tx, ay = ty;
      if (dist(ax, ay, h.x, h.y) > 12) { const a = Math.atan2(ty - h.y, tx - h.x); ax = h.x + Math.cos(a) * 12; ay = h.y + Math.sin(a) * 12; }
      if (hb.id === 'explosion_cadaver') {
        const cad = j.monstruos.filter((m) => m.muerto && m.tMuerto < 120 && !(m as any).usado).sort((a, b) => dist(a.x, a.y, ax, ay) - dist(b.x, b.y, ax, ay))[0];
        if (!cad || dist(cad.x, cad.y, ax, ay) > 4) { msg(j, ['No hay un cadáver cerca.', 'No corpse nearby.']); h.mana += costoMana(j, hb); break; }
        (cad as any).usado = true; cad.tMuerto = 999;
        const k = cad.vidaMax * 0.5;
        j.areas.push({ x: cad.x, y: cad.y, radio: r, dano: [dh[0] + k * 0.6, dh[1] + k], elem: 'fuego', t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: '', retraso: 0 });
        efecto(j, 'estallido_cadaver', cad.x, cad.y, 0, 1.2); particulas(j, cad.x, cad.y, 30, 'sangre', '#700808', 2.2); j.sacudida = 0.3;
        break;
      }
      const dur = val(hb.duracion, n) || 0.1;
      if (hb.id === 'meteoro') { j.areas.push({ x: ax, y: ay, radio: r, dano: dh, elem: 'fuego', t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: 'meteoro', retraso: 0.9, caida: true }); j.areas.push({ x: ax, y: ay, radio: r * 0.8, dano: [dh[0] * 0.15, dh[1] * 0.15], elem: 'fuego', t: 0, dur: dur, tick: 0.5, prox: 0, deHeroe: true, efecto: 'crater_ardiente', retraso: 1.0 }); efecto(j, 'meteoro', ax, ay, 0, 1.3, 0, 1.2); break; }
      if (hb.id === 'cielo_abierto') { const cn = Math.round(val(hb.n, n)); for (let k = 0; k < cn; k++) { const a = R() * Math.PI * 2, rr = R() * r; j.areas.push({ x: h.x + Math.cos(a) * rr, y: h.y + Math.sin(a) * rr, radio: 1.6, dano: dh, elem: 'luz', t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: 'pilar_luz', retraso: k * 0.15 }); } break; }
      if (hb.id === 'lluvia_flechas') { const g = golpeArma(j, mult); j.areas.push({ x: ax, y: ay, radio: r, dano: [g.min * 0.5, g.max * 0.5], elem: 'fisico', t: 0, dur, tick: 0.3, prox: 0.2, deHeroe: true, efecto: 'lluvia_flechas', retraso: 0.2 }); break; }
      j.areas.push({ x: ax, y: ay, radio: r, dano: [dh[0] / Math.max(1, dur * 2), dh[1] / Math.max(1, dur * 2)], elem: hb.elem, t: 0, dur, tick: 0.5, prox: 0, deHeroe: true, efecto: efectoDe(hb.efecto, hb.elem), retraso: 0.1 });
      break;
    }
    case 'cadena': {
      let desde: Ent = h, golpeados = new Set<number>(), rebotes = (hb.rebota ?? 3) + Math.floor(n / 4);
      let blanco: Ent | null = obj && !obj.muerto ? obj : masCercano(j, tx, ty, 8, golpeados);
      while (blanco && rebotes-- >= 0) {
        j.efectos.push({ id: 'arco_cadena', x: desde.x, y: desde.y, t: 0, dir: 0, escala: 1, z: 0, dur: 0.3, seguir: blanco } as Efecto);
        (j.efectos[j.efectos.length - 1] as any).x2 = blanco.x; (j.efectos[j.efectos.length - 1] as any).y2 = blanco.y;
        danar(j, blanco, { min: dh[0], max: dh[1], elem: 'rayo', deHeroe: true, fuente: h, sinFallo: true });
        golpeados.add(blanco.id);
        desde = blanco;
        blanco = masCercano(j, desde.x, desde.y, 6, golpeados);
      }
      break;
    }
    case 'invocar': {
      const inv = INVOCADOS[hb.invoca!]; if (!inv) break;
      const max = Math.max(1, Math.floor(val(hb.max, n)));
      const mios = j.monstruos.filter((m) => m.dueno && !m.muerto && m.invocaId === hb.invoca);
      let x = tx, y = ty;
      if (hb.id === 'alzar_esqueleto' || hb.id === 'mago_hueso') {
        const cad = j.monstruos.filter((m) => m.muerto && !m.dueno && !(m as any).usado).sort((a, b) => dist(a.x, a.y, tx, ty) - dist(b.x, b.y, tx, ty))[0];
        if (!cad || dist(cad.x, cad.y, tx, ty) > 5) { msg(j, ['Necesito un cadáver.', 'I need a corpse.']); h.mana += costoMana(j, hb); break; }
        (cad as any).usado = true; cad.tMuerto = 999; x = cad.x; y = cad.y;
      }
      if (mios.length >= max) { const viejo = mios[0]; viejo.vida = 0; viejo.muerto = true; viejo.acc = 'morir'; viejo.t = 0; }
      if (!pasable(j.zona, x, y)) { const q = libreCerca(j.zona, x, y); x = q[0] + 0.5; y = q[1] + 0.5; }
      const kk = (1 + n * 0.15) * (1 + h.c.invocados_pct / 100);
      const def: DefMonstruo = { ...(MONSTRUOS[inv.sprite] ?? MONSTRUOS.esqueleto), id: hb.invoca!, sprite: inv.sprite, vida: inv.vida, dano: inv.dano, vel: inv.vel, ia: inv.distancia ? 'distancia' : 'normal', proyectil: inv.proyectil, rango: inv.distancia ? 7 : undefined, elem: (inv.elem as Elemento) ?? 'fisico', tinte: inv.tinte, escala: inv.escala, res: {}, xp: 0, jefe: false };
      const m = crearMonstruo(def, h.d.nivel, x, y, 0, 0);
      m.tipo = 'invocado'; m.dueno = true; m.invocaId = hb.invoca; m.estado = 'deambular';
      m.vidaMax = m.vida = Math.round(inv.vida * kk * (1 + h.d.nivel * 0.12)); m.dano = [inv.dano[0] * kk * (1 + h.d.nivel * 0.08), inv.dano[1] * kk * (1 + h.d.nivel * 0.08)];
      m.tinte = inv.tinte; m.escala = inv.escala ?? 1;
      j.monstruos.push(m);
      efecto(j, 'circulo_invocacion', x, y, 0, 0.8);
      break;
    }
    case 'buff': {
      const dur = val(hb.duracion, n);
      const bonos: Record<string, number> = {};
      for (const [k, b] of Object.entries(hb.bonos ?? {})) bonos[k] = val(b, n);
      if (hb.id === 'armadura_hueso') { h.escudoHueso = bonos.escudo_hueso ?? 20; }
      if (hb.id === 'tempestad') h.tempestad = dur;
      if (hb.id === 'huracan') h.huracan = dur;
      h.buffs[hb.id] = { t: dur, bonos, hab: hb.id };
      efecto(j, efectoDe(hb.efecto, hb.elem), h.x, h.y, 0, 1);
      recalc(j);
      break;
    }
    case 'grito': {
      efecto(j, 'grito_guerra', h.x, h.y, 0, 1.2);
      const r = hb.radio ?? 5;
      for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, h.x, h.y) <= r && !(e as Monstruo).def.jefe) e.miedo = val(hb.duracion, n);
      break;
    }
    case 'maldicion': {
      const r = hb.radio ?? 3, dur = val(hb.duracion, n);
      efecto(j, hb.id === 'enredadera' ? 'estallido_enredaderas' : 'prision_hueso', tx, ty, 0, r / 3);
      for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, tx, ty) <= r) {
        const m = e as Monstruo;
        m.maldicion = { amplificar: val(hb.bonos?.amplificar, n), debilitar: val(hb.bonos?.debilitar, n), lento: val(hb.bonos?.lento, n), t: dur, res: 0 };
        if (hb.bonos?.miedo && !m.def.jefe) m.miedo = dur;
        if (hb.dano) danar(j, m, { min: dh[0], max: dh[1], elem: hb.elem, deHeroe: true, fuente: h, sinFallo: true });
      }
      break;
    }
    case 'teleporte': {
      let x = tx, y = ty;
      if (!pasable(j.zona, x, y)) { const q = libreCerca(j.zona, x, y); x = q[0] + 0.5; y = q[1] + 0.5; }
      if (dist(x, y, h.x, h.y) > 14) { const a = Math.atan2(y - h.y, x - h.x); x = h.x + Math.cos(a) * 14; y = h.y + Math.sin(a) * 14; if (!pasable(j.zona, x, y)) { const q = libreCerca(j.zona, x, y); x = q[0] + 0.5; y = q[1] + 0.5; } }
      efecto(j, 'destello_teleporte', h.x, h.y); h.x = x; h.y = y; efecto(j, 'destello_teleporte', h.x, h.y);
      sonar(j, 'teletransporte');
      break;
    }
    case 'carga': case 'salto': {
      let x = obj && !obj.muerto ? obj.x : tx, y = obj && !obj.muerto ? obj.y : ty;
      const a = Math.atan2(y - h.y, x - h.x), dd = Math.min(hb.tipo === 'salto' ? 8 : 10, dist(x, y, h.x, h.y));
      x = h.x + Math.cos(a) * Math.max(0, dd - (obj ? 0.8 : 0)); y = h.y + Math.sin(a) * Math.max(0, dd - (obj ? 0.8 : 0));
      if (!pasable(j.zona, x, y)) { const q = libreCerca(j.zona, x, y); x = q[0] + 0.5; y = q[1] + 0.5; }
      h.salto = { x0: h.x, y0: h.y, x1: x, y1: y, t: 0, T: hb.tipo === 'salto' ? 0.45 : 0.3, hab: hb };
      (h as any).saltoN = n; (h as any).saltoMult = mult;
      break;
    }
    case 'torbellino': {
      h.torbellino = 1.6; (h as any).torbN = n; (h as any).torbMult = mult; (h as any).torbDir = [tx, ty];
      h.camino = null; h.destino = [tx, ty];
      break;
    }
    case 'bomba': {
      const cn = hb.id === 'bomba_cluster' ? 1 : 1;
      for (let k = 0; k < cn; k++) j.proyectiles.push({ x: h.x, y: h.y, z: 30, vx: 0, vy: 0, vida: 9, dano: dh, elem: hb.elem, deHeroe: true, perfora: false, explota: hb.radio ?? 2, efecto: 'frasco', golpeados: new Set(), buscador: false, radio: 0.4, t: 0, arco: { x0: h.x, y0: h.y, x1: tx, y1: ty, t: 0, T: 0.6, n: hb.id === 'bomba_cluster' ? Math.round(val(hb.n, n)) : 0 }, hab: hb, nivelHab: n });
      break;
    }
    case 'trampa': {
      const max = Math.floor(val(hb.max, n));
      if (j.torretas.length >= max) j.torretas.shift();
      j.torretas.push({ x: tx, y: ty, t: 0, dur: val(hb.duracion, n), dano: dh, cd: 0.5 });
      efecto(j, 'glifo_trampa', tx, ty);
      break;
    }
    case 'cuervos': {
      const cn = Math.round(val(hb.n, n));
      for (let k = 0; k < cn; k++) j.cuervos.push({ x: h.x, y: h.y, t: 0, dur: val(hb.duracion, n), dano: dh, objetivo: null, ang: (k / cn) * Math.PI * 2 });
      break;
    }
  }
}
const EFECTOS: Record<string, string> = {
  fuego: 'saeta_fuego', fuego_grande: 'bola_fuego', hielo: 'saeta_hielo', orbe_hielo: 'saeta_hielo', chispa: 'chispa_cargada', rayo: 'relampago', hueso: 'lanza_hueso',
  luz: 'castigo', columna_luz: 'pilar_luz', veneno: 'nova_veneno', nube_veneno: 'nube_veneno', flecha: 'flecha', virote: 'flecha', llamas_suelo: 'muro_llamas', ventisca: 'ventisca',
  nova_hielo: 'nova_escarcha', nova_viento: 'tornado', onda: 'grito_guerra', polvo: 'onda_aterrizaje', tajo: 'chispas_carne', sangre: 'salpicadura_sangre', meteoro: 'meteoro',
  martillo: 'castigo', jabalina: 'chispa_cargada', viento: 'tornado', tornado: 'tornado', torbellino: 'torbellino', cadaver: 'estallido_cadaver', invocar: 'circulo_invocacion',
  aura_roja: 'aura_sagrada', aura_azul: 'escudo_divino', aura_gris: 'escudo_divino', aura_verde: 'chispas_curacion', aura_fuego: 'aura_sagrada', aura_morada: 'aura_sagrada', huesos_giran: 'prision_hueso', raices: 'estallido_enredaderas',
  maldicion: 'prision_hueso', lluvia_flechas: 'lluvia_flechas',
};
export function efectoDe(e: string, elem: Elemento): string {
  if (e === 'flecha' && elem === 'fuego') return 'flecha_fuego';
  if (e === 'flecha' && elem === 'frio') return 'flecha_hielo';
  return EFECTOS[e] ?? e;
}
function masCercano(j: Juego, x: number, y: number, r: number, salvo: Set<number>): Ent | null {
  let best: Ent | null = null, bd = r;
  for (const m of enemigosDe(j, true)) { if (salvo.has(m.id)) continue; const d = dist(m.x, m.y, x, y); if (d < bd && lineaLibre(j.zona, x, y, m.x, m.y)) { bd = d; best = m; } }
  return best;
}

// ------------------------------------------------------------------ actualización
export function actualizar(j: Juego, dt: number) {
  j.t += dt;
  const h = j.heroe;
  actualizarHeroe(j, dt);
  for (const m of j.monstruos) actualizarMonstruo(j, m, dt);
  for (const n of j.npcs) { n.t += dt; if (dist(n.x, n.y, h.x, h.y) < 5) n.dir = dirDe(h.x - n.x, h.y - n.y); }
  actualizarProyectiles(j, dt);
  actualizarAreas(j, dt);
  // cuervos
  for (const c of j.cuervos) {
    c.t += dt;
    if (!c.objetivo || c.objetivo.muerto) c.objetivo = masCercano(j, h.x, h.y, 9, new Set()) as Monstruo | null;
    const tx = c.objetivo ? c.objetivo.x : h.x + Math.cos(c.ang + j.t) * 2, ty = c.objetivo ? c.objetivo.y : h.y + Math.sin(c.ang + j.t) * 2;
    const dx = tx - c.x, dy = ty - c.y, l = Math.hypot(dx, dy) || 1;
    c.x += (dx / l) * Math.min(l, 8 * dt); c.y += (dy / l) * Math.min(l, 8 * dt);
    if (c.objetivo && l < 0.6 && Math.floor(c.t * 3) !== Math.floor((c.t - dt) * 3)) danar(j, c.objetivo, { min: c.dano[0], max: c.dano[1], elem: 'fisico', deHeroe: true, fuente: h, sinFallo: true });
  }
  j.cuervos = j.cuervos.filter((c) => c.t < c.dur);
  for (const tr of j.torretas) {
    tr.t += dt; tr.cd -= dt;
    if (tr.cd <= 0) { const m = masCercano(j, tr.x, tr.y, 9, new Set()); if (m) { disparar(j, { ...h, x: tr.x, y: tr.y } as Ent, m.x, m.y, { min: tr.dano[0], max: tr.dano[1], elem: 'fisico', deHeroe: true, fuente: h, sinFallo: true }, 'flecha', 15); sonar(j, 'virote', tr.x, tr.y, 0.5); } tr.cd = 0.55; }
  }
  j.torretas = j.torretas.filter((t) => t.t < t.dur);
  // efectos, números, partículas
  for (const e of j.efectos) e.t += dt;
  j.efectos = j.efectos.filter((e) => e.t < (e.dur ?? 1.4));
  for (const n of j.numeros) { n.t += dt; n.z += dt * 30; }
  j.numeros = j.numeros.filter((n) => n.t < 1.1);
  for (const p of j.particulas) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.grav * dt; if (p.z < 0) { p.z = 0; p.vx *= 0.5; p.vy *= 0.5; p.vz = 0; if (p.tipo === 'sangre' && R() < 0.05 && j.manchas.length < 160) j.manchas.push({ x: p.x, y: p.y, r: 0.15 + R() * 0.2, color: p.color, t: 0, tipo: 'sangre' }); } }
  j.particulas = j.particulas.filter((p) => p.t < p.dur);
  for (const s of j.suelo) s.t += dt;
  for (const m of j.mensajes) m.t += dt;
  j.mensajes = j.mensajes.filter((m) => m.t < 7);
  j.sacudida = Math.max(0, j.sacudida - dt * 2);
  // cadáveres viejos de invocados se van
  j.monstruos = j.monstruos.filter((m) => !(m.muerto && (m.dueno ? m.tMuerto > 2 : m.tMuerto > 600)));
  // portal
  if (j.portal) j.portal.t += dt;
  // visiones de terror: a veces algo asoma al borde de la luz
  for (const v of j.visiones) v.t += dt;
  j.visiones = j.visiones.filter((v) => v.t < 2.6);
  if (j.zona.tipo !== 'pueblo' && R() < dt * 0.012 && j.visiones.length === 0) {
    const a = R() * Math.PI * 2, r = 7.5 + R() * 2;
    const x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r;
    if (pasable(j.zona, x, y)) {
      const pool = POBLACION[POBL_ZONA[j.zona.id] ?? ''] ?? ['zombi'];
      j.visiones.push({ x, y, t: 0, sprite: MONSTRUOS[elegir(pool)]?.sprite ?? 'zombi', dir: dirDe(h.x - x, h.y - y) });
      Sonido.susurro();
    }
  }
  // terror: cada tanto la luz se encoge y algo se escucha
  (j as any).oscurece = Math.max(0, ((j as any).oscurece ?? 0) - dt);
  if (j.zona.tipo !== 'pueblo' && j.zona.oscuridad > 0.4 && R() < (dt / 70) * (1 - h.c.valor / 120)) {
    (j as any).oscurece = 3.5 * (1 - h.c.valor / 150);
    const frases: [string, string][] = [
      [`Alguien susurró «${h.d.nombre}».`, `Someone whispered "${h.d.nombre}".`], ['Las llamas se encogen. Algo respira detrás de ti.', 'The flames shrink. Something breathes behind you.'],
      ['Se escucha una campana. Muy lejos. Debajo.', 'A bell rings. Far away. Below.'], ['La Marca en tu brazo arde un instante.', 'The Mark on your arm burns for a moment.'],
      ['Pasos. Se detienen cuando te detienes.', 'Footsteps. They stop when you stop.'], ['Un niño ríe en la oscuridad.', 'A child laughs in the dark.'],
      ['Huele a cera derretida y a pelo quemado.', 'It smells of melted wax and burnt hair.'], ['Algo cae del techo. Es tibio.', 'Something drips from above. It is warm.'],
    ];
    msg(j, elegir(frases), '#b08080');
    Sonido.susurro();
  }
  // latido con poca vida
  Sonido.latido(!h.muerto && h.vida < h.vidaMax * 0.3);
}

function moverHacia(j: Juego, e: Ent, tx: number, ty: number, vel: number, dt: number): boolean {
  const dx = tx - e.x, dy = ty - e.y, l = Math.hypot(dx, dy);
  if (l < 0.05) return true;
  const paso = Math.min(l, vel * dt);
  const nx = e.x + (dx / l) * paso, ny = e.y + (dy / l) * paso;
  e.dir = dirDe(dx, dy);
  if (pasable(j.zona, nx, ny)) { e.x = nx; e.y = ny; }
  else if (pasable(j.zona, nx, e.y)) e.x = nx;
  else if (pasable(j.zona, e.x, ny)) e.y = ny;
  else return true;
  return l <= paso + 0.01;
}

function actualizarHeroe(j: Juego, dt: number) {
  const h = j.heroe;
  h.t += dt; h.destello = Math.max(0, h.destello - dt);
  if (h.muerto) return;
  for (const k of Object.keys(h.recargas)) h.recargas[k] = Math.max(0, h.recargas[k] - dt);
  // buffs
  let cambio = false;
  for (const [k, b] of Object.entries(h.buffs)) { if (b.t < 9000) { b.t -= dt; if (b.t <= 0) { delete h.buffs[k]; cambio = true; } } }
  if (cambio) recalc(j);
  // aura en el botón derecho
  const der = habilidadDe(h.d.der);
  const auraId = der.tipo === 'aura' && nivelHab(h.d, der.id, h.c) > 0 ? der.id : null;
  for (const k of Object.keys(h.buffs)) if (h.buffs[k].t > 9000 && k !== auraId) { delete h.buffs[k]; cambio = true; }
  if (auraId && !h.buffs[auraId]) { const n = nivelHab(h.d, auraId, h.c); const bonos: Record<string, number> = {}; for (const [k, b] of Object.entries(der.bonos ?? {})) bonos[k] = val(b, n); h.buffs[auraId] = { t: 99999, bonos, hab: auraId }; recalc(j); }
  if (cambio) recalc(j);
  // aura que daña y convicción
  if (auraId) {
    const n = nivelHab(h.d, auraId, h.c);
    if (der.id === 'aura_llama' && Math.floor(j.t * 2) !== Math.floor((j.t - dt) * 2)) { const dh = danoHab(j, der, n); for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, h.x, h.y) < (der.radio ?? 5)) danar(j, e, { min: dh[0] * 0.5, max: dh[1] * 0.5, elem: 'fuego', deHeroe: true, fuente: h, sinFallo: true }); }
    if (der.id === 'aura_conviccion') for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, h.x, h.y) < (der.radio ?? 7)) { const m = e as Monstruo; m.maldicion = { amplificar: 0, debilitar: 0, lento: 0, ...(m.maldicion ?? {}), t: 0.5, res: val(der.bonos?.enemigo_res, n) * -1 * -1 }; }
  }
  // tempestad y huracán
  if (h.tempestad > 0) { h.tempestad -= dt; if (R() < dt * 2.5) { const m = masCercano(j, h.x, h.y, 6, new Set()); if (m) { const hb = habilidadDe('tempestad'), dh = danoHab(j, hb, nivelHab(h.d, 'tempestad', h.c)); efecto(j, 'relampago', m.x, m.y, 0, 1); danar(j, m, { min: dh[0], max: dh[1], elem: 'rayo', deHeroe: true, fuente: h, sinFallo: true }); sonar(j, 'trueno', m.x, m.y, 0.6); } } }
  if (h.huracan > 0) { h.huracan -= dt; if (Math.floor(j.t * 2) !== Math.floor((j.t - dt) * 2)) { const hb = habilidadDe('huracan'), dh = danoHab(j, hb, nivelHab(h.d, 'huracan', h.c)); for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, h.x, h.y) < 5) danar(j, e, { min: dh[0] / 2, max: dh[1] / 2, elem: 'frio', deHeroe: true, fuente: h, sinFallo: true }); particulas(j, h.x, h.y, 6, 'nieve', '#e0f0ff', 2, 20); } }
  // regeneración
  h.regen += dt;
  const regV = h.c.regen_vida + (j.zona.tipo === 'pueblo' ? h.vidaMax * 0.05 : 0);
  h.vida = Math.min(h.vidaMax, h.vida + regV * dt);
  h.mana = Math.min(h.c.manaMax, h.mana + h.c.manaMax * 0.025 * (1 + h.c.regen_mana / 100) * dt);
  if (h.veneno > 0) { h.veneno -= dt; h.vida -= h.venenoDps * dt; if (h.vida <= 0) { h.vida = 1; } }
  if (h.sangrado > 0) { h.sangrado -= dt; h.vida -= h.vidaMax * 0.01 * dt; if (h.vida <= 0) morirHeroe(j); }
  if (h.frio > 0) h.frio -= dt;
  // salto o carga
  if (h.salto) {
    const s = h.salto; s.t += dt;
    const k = Math.min(1, s.t / s.T);
    h.x = s.x0 + (s.x1 - s.x0) * k; h.y = s.y0 + (s.y1 - s.y0) * k;
    h.acc = 'atacar'; h.t = k * 0.5;
    if (k >= 1) {
      const hb = s.hab, n = (h as any).saltoN, mult = (h as any).saltoMult;
      const r = hb.radio ?? 1.8;
      for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, h.x, h.y) <= r + (hb.tipo === 'carga' ? 0.6 : 0)) { const g = golpeArma(j, mult); if (hb.tipo === 'carga') g.empuje = 1; danar(j, e, g); }
      efecto(j, hb.tipo === 'salto' ? 'onda_aterrizaje' : 'polvo_carga', h.x, h.y, DIRS.indexOf(h.dir));
      j.sacudida = 0.3; sonar(j, 'golpe_metal'); void n;
      h.salto = null; h.acc = 'quieto';
    }
    return;
  }
  if (h.torbellino > 0) {
    h.torbellino -= dt;
    const [tx, ty] = (h as any).torbDir;
    if (moverHacia(j, h, tx, ty, 4.5, dt)) h.torbellino = Math.min(h.torbellino, 0.05);
    h.acc = 'atacar'; h.dir = DIRS[Math.floor(j.t * 16) % 8];
    if (Math.floor(j.t * 5) !== Math.floor((j.t - dt) * 5)) for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, h.x, h.y) < 2.2) danar(j, e, golpeArma(j, (h as any).torbMult));
    if (Math.floor(j.t * 6) !== Math.floor((j.t - dt) * 6)) sonar(j, 'tajo', h.x, h.y, 0.5);
    if (h.torbellino <= 0) { h.acc = 'quieto'; h.destino = null; }
    return;
  }
  // acción en curso
  if (h.acc === 'atacar' || h.acc === 'lanzar' || h.acc === 'herido') {
    if ((h.acc === 'atacar' || h.acc === 'lanzar') && !h.golpeo && h.t >= h.golpeEn) { h.golpeo = true; resolverHabilidad(j); }
    if (h.t >= h.dur) { h.acc = 'quieto'; h.t = 0; }
    return;
  }
  // caminar
  const vel = (h.correr ? 5.4 : 3.4) * (1 + h.c.vel_mover / 100) * (h.frio > 0 ? 0.6 : 1);
  if (h.camino && h.camino.length) {
    const [tx, ty] = h.camino[0];
    if (moverHacia(j, h, tx, ty, vel, dt)) h.camino.shift();
    if (h.acc !== (h.correr ? 'correr' : 'caminar')) { h.acc = h.correr ? 'correr' : 'caminar'; }
    h.pasoT += dt * vel;
    if (h.pasoT > 1.6) { h.pasoT = 0; sonar(j, 'paso', h.x, h.y, 0.35); }
    if (!h.camino.length) h.camino = null;
  } else if (h.acc === 'caminar' || h.acc === 'correr') h.acc = 'quieto';
}

function actualizarMonstruo(j: Juego, m: Monstruo, dt: number) {
  m.t += dt; m.destello = Math.max(0, m.destello - dt);
  if (m.muerto) { m.tMuerto += dt; return; }
  const h = j.heroe;
  if (m.veneno > 0) { m.veneno -= dt; m.vida -= m.venenoDps * dt; if (Math.floor(m.veneno * 2) !== Math.floor((m.veneno + dt) * 2)) particulas(j, m.x, m.y, 2, 'humo', '#60a040', 0.5, 30); if (m.vida <= 0) { morirMonstruo(j, m); return; } }
  if (m.sangrado > 0) { m.sangrado -= dt; m.vida -= m.vidaMax * 0.02 * dt; if (m.vida <= 0) { morirMonstruo(j, m); return; } }
  if (m.maldicion) { m.maldicion.t -= dt; if (m.maldicion.t <= 0) m.maldicion = undefined; }
  if (m.dueno && m.tVida !== undefined) { m.tVida -= dt; }
  if (m.congelado > 0) { m.congelado -= dt; return; }
  if (m.aturdido > 0) { m.aturdido -= dt; m.acc = 'herido'; return; }
  if (m.frio > 0) m.frio -= dt;
  const lento = (m.frio > 0 ? 0.5 : 1) * (m.maldicion?.lento ? 1 - m.maldicion.lento / 100 : 1);
  // surgir del piso
  if (m.estado === 'surgir') { if (dist(m.x, m.y, h.x, h.y) < 7 && !h.muerto) { m.estado = 'perseguir'; m.objetivo = h; m.acc = 'morir'; m.t = 0; (m as any).surgiendo = 1.2; particulas(j, m.x, m.y, 12, 'humo', '#3a3026', 1, 4); sonar(j, 'grunido', m.x, m.y); } return; }
  if ((m as any).surgiendo > 0) { (m as any).surgiendo -= dt; return; }
  if (m.acc === 'herido') { if (m.t >= m.dur) { m.acc = 'quieto'; m.t = 0; } return; }
  if (m.acc === 'atacar' || m.acc === 'lanzar') {
    if (!m.golpeo && m.t >= m.golpeEn) { m.golpeo = true; golpeMonstruo(j, m); }
    if (m.t >= m.dur) { m.acc = 'quieto'; m.t = 0; }
    return;
  }
  m.cd -= dt * lento; m.pensar -= dt;
  // invocados: siguen al héroe y pelean
  if (m.dueno) {
    const enem = enemigosDe(j, true);
    if (!m.objetivo || m.objetivo.muerto || dist(m.objetivo.x, m.objetivo.y, h.x, h.y) > 14) m.objetivo = null;
    if (!m.objetivo) { let bd = 8; for (const e of enem) { const d = dist(e.x, e.y, m.x, m.y); if (d < bd) { bd = d; m.objetivo = e; } } }
    if (m.objetivo) { pelear(j, m, m.objetivo, dt, lento); return; }
    const d = dist(m.x, m.y, h.x, h.y);
    if (d > 3) { moverHacia(j, m, h.x, h.y, m.vel * 1.4, dt); m.acc = 'caminar'; } else if (m.acc === 'caminar') m.acc = 'quieto';
    if (d > 20) { m.x = h.x + entre(-1, 1); m.y = h.y + entre(-1, 1); }
    return;
  }
  const dh = dist(m.x, m.y, h.x, h.y);
  // despertar
  if (m.estado === 'dormido' || m.estado === 'deambular') {
    const vista = m.calidad >= 3 ? 9 : 8;
    if (!h.muerto && dh < vista && (dh < 3 || lineaLibre(j.zona, m.x, m.y, h.x, h.y))) {
      m.estado = 'perseguir'; m.objetivo = h;
      if (m.calidad >= 3 || m.def.jefe || m.def.ia === 'jefe') { j.jefe = m; if (!(m as any).hablo) { (m as any).hablo = true; const fr = FRASE_JEFE[m.def.id]; if (fr) { msg(j, fr, '#ff6040'); m.habla = fr[j.idi]; (m as any).hablaT = 4; } sonar(j, 'rugido_jefe'); Sonido.musica('jefe'); } }
      else if (R() < 0.3) sonar(j, m.def.sonido === 'hueso' ? 'golpe_hueso' : 'grunido', m.x, m.y, 0.6);
      // el grupo despierta junto
      for (const o of j.monstruos) if (!o.muerto && !o.dueno && o.estado !== 'perseguir' && o.estado !== 'surgir' && dist(o.x, o.y, m.x, m.y) < 5) { o.estado = 'perseguir'; o.objetivo = h; }
    } else {
      // deambular cerca de su lugar
      if (m.pensar <= 0) { m.pensar = entre(2, 5); m.estado = R() < 0.5 ? 'deambular' : 'dormido'; (m as any).dest = [m.ox + entre(-3, 3), m.oy + entre(-3, 3)]; }
      if (m.estado === 'deambular' && (m as any).dest) { if (moverHacia(j, m, (m as any).dest[0], (m as any).dest[1], m.vel * 0.4, dt)) { m.estado = 'dormido'; m.acc = 'quieto'; } else m.acc = 'caminar'; }
      else m.acc = 'quieto';
      return;
    }
  }
  if (h.muerto) { m.estado = 'deambular'; m.objetivo = null; return; }
  // elegir objetivo: el héroe o un invocado más cerca
  if (m.pensar <= 0) {
    m.pensar = 0.5 + R() * 0.4;
    let mejor: Ent = h, bd = dh;
    for (const o of j.monstruos) if (o.dueno && !o.muerto) { const d = dist(o.x, o.y, m.x, m.y); if (d < bd - 1) { bd = d; mejor = o; } }
    m.objetivo = mejor;
    if (dh > 22) { m.estado = 'deambular'; m.objetivo = null; return; }
  }
  if (m.miedo > 0) {
    m.miedo -= dt;
    const a = Math.atan2(m.y - h.y, m.x - h.x);
    moverHacia(j, m, m.x + Math.cos(a) * 2, m.y + Math.sin(a) * 2, m.vel * lento, dt); m.acc = 'caminar';
    return;
  }
  // invocar
  if (m.def.invoca && m.invocaCd > 0) m.invocaCd -= dt;
  if (m.def.invoca && m.invocaCd <= 0 && (m.def.ia === 'invocador' || m.def.jefe) && dh < 10) {
    m.invocaCd = m.def.jefe ? 9 : 7;
    const cuantos = j.monstruos.filter((o) => !o.muerto && !o.dueno && dist(o.x, o.y, m.x, m.y) < 8).length;
    if (cuantos < (m.def.jefe ? 14 : 9)) {
      m.acc = 'lanzar'; m.t = 0; m.dur = 0.7; m.golpeEn = 0.4; m.golpeo = true;
      for (let k = 0; k < (m.def.jefe ? 3 : 2); k++) { const q = libreCerca(j.zona, m.x + entre(-2, 2), m.y + entre(-2, 2)); const nm = crearMonstruo(MONSTRUOS[m.def.invoca], m.nivel, q[0] + 0.5, q[1] + 0.5, 0, h.d.dificultad); nm.estado = 'perseguir'; nm.objetivo = h; nm.acc = 'morir'; nm.t = 0; (nm as any).surgiendo = 1; j.monstruos.push(nm); efecto(j, 'circulo_invocacion', q[0] + 0.5, q[1] + 0.5, 0, 0.7); }
      sonar(j, 'invocar', m.x, m.y);
      return;
    }
  }
  // fases de jefe
  if (m.def.jefe) {
    const f = m.vida < m.vidaMax * 0.33 ? 2 : m.vida < m.vidaMax * 0.66 ? 1 : 0;
    if (f > m.fase) { m.fase = f; m.vel *= 1.15; m.cd = 0; efecto(j, 'grito_guerra', m.x, m.y, 0, 2); j.sacudida = 0.6; sonar(j, 'rugido_jefe', m.x, m.y); msg(j, f === 1 ? ['¡Se enfurece!', 'It grows enraged!'] : ['¡Está desesperado!', 'It is desperate!'], '#ff6040');
      // nova al cambiar de fase
      for (let a = 0; a < 12; a++) disparar(j, m, m.x + Math.cos(a * 0.524), m.y + Math.sin(a * 0.524), { min: m.dano[0] * 0.6, max: m.dano[1] * 0.6, elem: m.def.elem ?? 'fuego', deHeroe: false, fuente: m }, efectoProy(m.def.proyectil ?? 'fuego'), 7);
    }
    if ((m as any).hablaT > 0) (m as any).hablaT -= dt; else m.habla = undefined;
  }
  if (m.objetivo) pelear(j, m, m.objetivo, dt, lento);
}

function efectoProy(p: string) { return p === 'fuego' ? 'saeta_fuego' : p === 'hielo' ? 'saeta_hielo' : p === 'veneno' ? 'nova_veneno' : p === 'sombra' ? 'lanza_hueso' : p === 'luz' ? 'castigo' : p === 'lanza' ? 'flecha' : 'flecha'; }

function pelear(j: Juego, m: Monstruo, obj: Ent, dt: number, lento: number) {
  const d = dist(m.x, m.y, obj.x, obj.y);
  const distancia = m.def.ia === 'distancia' || m.def.ia === 'mago' || m.def.ia === 'invocador' || (m.def.jefe && m.def.proyectil && R() < 0.4);
  const alcance = m.radio + obj.radio + 0.75 + (m.def.area ? 0.4 : 0);
  if (distancia && m.def.rango) {
    const ver = lineaLibre(j.zona, m.x, m.y, obj.x, obj.y);
    if (d < m.def.rango && ver && m.cd <= 0) { iniciarAtaque(j, m, obj, true); return; }
    if (d < 3.5 && m.def.ia !== 'invocador' && !m.def.jefe) { const a = Math.atan2(m.y - obj.y, m.x - obj.x); moverHacia(j, m, m.x + Math.cos(a) * 2, m.y + Math.sin(a) * 2, m.vel * lento, dt); m.acc = 'caminar'; return; }
    if (d >= m.def.rango - 1 || !ver) { avanzar(j, m, obj, dt, lento); return; }
    m.acc = 'quieto'; return;
  }
  if (d <= alcance) { m.dir = dirDe(obj.x - m.x, obj.y - m.y); if (m.cd <= 0) iniciarAtaque(j, m, obj, false); else m.acc = 'quieto'; return; }
  avanzar(j, m, obj, dt, lento);
}
function avanzar(j: Juego, m: Monstruo, obj: Ent, dt: number, lento: number) {
  // rodear: cada uno apunta a un punto alrededor del objetivo
  const ang = (m.id * 2.39996) % (Math.PI * 2);
  const off = dist(m.x, m.y, obj.x, obj.y) < 3 ? 0.9 : 0;
  const tx = obj.x + Math.cos(ang) * off, ty = obj.y + Math.sin(ang) * off;
  if (m.camino && m.camino.length) {
    const [cx, cy] = m.camino[0];
    if (moverHacia(j, m, cx, cy, m.vel * lento, dt)) m.camino.shift();
    m.acc = m.vel > 3 && m.def.ia !== 'bruto' ? 'caminar' : 'caminar';
    if (m.pensar <= 0.05) m.camino = null;
  } else if (lineaLibre(j.zona, m.x, m.y, tx, ty)) {
    moverHacia(j, m, tx, ty, m.vel * lento, dt); m.acc = 'caminar';
  } else if (m.pensar <= 0.1) {
    m.camino = buscarCamino(j.zona, m.x, m.y, tx, ty, 900);
  }
  // separarse de los otros
  for (const o of j.monstruos) {
    if (o === m || o.muerto) continue;
    const dx = m.x - o.x, dy = m.y - o.y, dd = Math.hypot(dx, dy), min = m.radio + o.radio;
    if (dd < min && dd > 0.001) { const k = (min - dd) * 0.5; const nx = m.x + (dx / dd) * k, ny = m.y + (dy / dd) * k; if (pasable(j.zona, nx, ny)) { m.x = nx; m.y = ny; } }
  }
}
function iniciarAtaque(j: Juego, m: Monstruo, obj: Ent, distancia: boolean) {
  m.dir = dirDe(obj.x - m.x, obj.y - m.y);
  const lanza = distancia && (m.def.ia === 'mago' || m.def.ia === 'invocador' || m.def.jefe) && (MONSTRUOS[m.def.id]?.ia !== 'distancia');
  m.acc = lanza && hayLanzar(m) ? 'lanzar' : 'atacar'; m.t = 0;
  m.dur = (m.def.jefe ? 0.9 : 0.8) / (m.mods.includes('rapido') ? 1.4 : 1); m.golpeEn = m.dur * 0.55; m.golpeo = false;
  m.cd = (m.def.jefe || m.def.ia === 'jefe' ? entre(0.5, 1.1) : entre(0.9, 1.7)) + (distancia ? 0.6 : 0);
  (m as any).aDist = distancia; m.objetivo = obj;
}
const hayLanzar = (m: Monstruo) => !!(m.def.ia === 'mago' || m.def.ia === 'invocador' || m.def.jefe || m.def.id === 'cultista' || m.def.id === 'monja_hueca');
function golpeMonstruo(j: Juego, m: Monstruo) {
  const obj = m.objetivo; if (!obj || obj.muerto) return;
  const g: Golpe = { min: m.dano[0], max: m.dano[1], elem: 'fisico', deHeroe: !!m.dueno, fuente: m, extra: {} };
  if (m.def.elem && m.def.elem !== 'fisico') g.extra![m.def.elem] = (m.dano[0] + m.dano[1]) * 0.25;
  if (m.mods.includes('ardiente')) g.extra!.fuego = (g.extra!.fuego ?? 0) + m.dano[1] * 0.5;
  if (m.mods.includes('helado')) g.extra!.frio = (g.extra!.frio ?? 0) + m.dano[1] * 0.4;
  if (m.mods.includes('electrico')) g.extra!.rayo = (g.extra!.rayo ?? 0) + m.dano[1] * 0.5;
  if (m.dueno) { g.sinFallo = true; g.precision = undefined; }
  if ((m as any).aDist && m.def.proyectil) {
    const e: Elemento = m.def.elem ?? 'fisico';
    const pg: Golpe = { ...g, elem: m.def.proyectil === 'flecha' || m.def.proyectil === 'lanza' ? 'fisico' : e, extra: {} };
    if (pg.elem !== 'fisico') { pg.min *= 1.1; pg.max *= 1.1; }
    const cnt = m.def.jefe ? 3 : 1;
    for (let k = 0; k < cnt; k++) { const a = Math.atan2(obj.y - m.y, obj.x - m.x) + (k - (cnt - 1) / 2) * 0.25; disparar(j, m, m.x + Math.cos(a) * 5, m.y + Math.sin(a) * 5, pg, efectoProy(m.def.proyectil), m.def.proyectil === 'flecha' ? 12 : 8); }
    sonar(j, m.def.proyectil === 'flecha' ? 'flecha' : m.def.proyectil === 'hielo' ? 'hielo_lanzar' : m.def.proyectil === 'fuego' ? 'fuego_lanzar' : 'sombra', m.x, m.y, 0.7);
    return;
  }
  if (dist(m.x, m.y, obj.x, obj.y) > m.radio + obj.radio + 1.4 + (m.def.area ?? 0)) return;
  if (m.def.area) {
    efecto(j, 'onda_aterrizaje', obj.x, obj.y, 0, m.def.area / 1.5);
    j.sacudida = Math.max(j.sacudida, 0.25);
    for (const e of enemigosDe(j, !!m.dueno)) if (dist(e.x, e.y, obj.x, obj.y) < m.def.area) danar(j, e, g);
  } else danar(j, obj, g);
  if (m.mods.includes('vampiro')) m.vida = Math.min(m.vidaMax, m.vida + (m.dano[0] + m.dano[1]) * 0.3);
  if (m.dueno && m.invocaId === 'golem') { const h = j.heroe; h.vida = Math.min(h.vidaMax, h.vida + (m.dano[0] + m.dano[1]) * 0.2); }
  sonar(j, 'tajo', m.x, m.y, 0.5);
}

function actualizarProyectiles(j: Juego, dt: number) {
  for (const p of j.proyectiles) {
    p.t += dt; p.vida -= dt;
    if (p.arco) {
      const a = p.arco; a.t += dt;
      const k = Math.min(1, a.t / a.T);
      p.x = a.x0 + (a.x1 - a.x0) * k; p.y = a.y0 + (a.y1 - a.y0) * k; p.z = 30 + Math.sin(k * Math.PI) * 70;
      if (k >= 1) { explotar(j, p); p.vida = 0; if (a.n) for (let i = 0; i < a.n; i++) { const an = R() * Math.PI * 2, r = 1.5 + R() * 2; j.proyectiles.push({ ...p, golpeados: new Set(), vida: 9, arco: { x0: p.x, y0: p.y, x1: p.x + Math.cos(an) * r, y1: p.y + Math.sin(an) * r, t: -0.1 * i, T: 0.45, n: 0 }, dano: [p.dano[0] * 0.5, p.dano[1] * 0.5] }); } }
      continue;
    }
    if (p.buscador) {
      const enem = enemigosDe(j, p.deHeroe);
      let best: Ent | null = null, bd = 7; for (const e of enem) { if (p.golpeados.has(e.id)) continue; const d = dist(e.x, e.y, p.x, p.y); if (d < bd) { bd = d; best = e; } }
      if (best) { const v = Math.hypot(p.vx, p.vy); const dx = best.x - p.x, dy = best.y - p.y, l = Math.hypot(dx, dy) || 1; p.vx += ((dx / l) * v - p.vx) * Math.min(1, dt * 5); p.vy += ((dy / l) * v - p.vy) * Math.min(1, dt * 5); }
    }
    if (p.hab?.id === 'martillo_bendito') { const a = Math.atan2(p.vy, p.vx) + dt * 2.6; const v = Math.hypot(p.vx, p.vy); p.vx = Math.cos(a) * v * 1.01; p.vy = Math.sin(a) * v * 1.01; }
    if (p.hab?.id === 'tornado' || p.efecto === 'tornado') { const a = Math.atan2(p.vy, p.vx) + Math.sin(p.t * 6) * dt * 3; const v = Math.hypot(p.vx, p.vy); p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; }
    if (p.hab?.id === 'chispa') { const a = Math.atan2(p.vy, p.vx) + (R() - 0.5) * dt * 12; const v = Math.hypot(p.vx, p.vy); p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; }
    if (p.hab?.id === 'orbe_glacial' && Math.floor(p.t * 8) !== Math.floor((p.t - dt) * 8)) { const a = R() * Math.PI * 2; j.proyectiles.push({ ...p, x: p.x, y: p.y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, hab: undefined, explota: 0, perfora: false, vida: 0.6, golpeados: new Set(), dano: [p.dano[0] * 0.3, p.dano[1] * 0.3], efecto: 'saeta_hielo' }); }
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    const b = j.zona.bloq[Math.floor(ny) * j.zona.W + Math.floor(nx)];
    if (b === 1 || b === 2 || nx < 0 || ny < 0 || nx >= j.zona.W || ny >= j.zona.H) { if (p.explota) explotar(j, p); p.vida = 0; continue; }
    p.x = nx; p.y = ny;
    // estela
    if (p.elem === 'fuego' && R() < 0.6) particulas(j, p.x, p.y, 1, 'brasa', '#ff9030', 0.4, p.z);
    if (p.elem === 'frio' && R() < 0.4) particulas(j, p.x, p.y, 1, 'nieve', '#c0e8ff', 0.3, p.z);
    for (const e of enemigosDe(j, p.deHeroe)) {
      if (p.golpeados.has(e.id)) continue;
      if (dist(e.x, e.y, p.x, p.y) < e.radio + p.radio) {
        p.golpeados.add(e.id);
        const g: Golpe = { min: p.dano[0], max: p.dano[1], elem: p.elem, deHeroe: p.deHeroe, fuente: p.deHeroe ? j.heroe : undefined, sinFallo: p.elem !== 'fisico' || !p.deHeroe ? p.elem !== 'fisico' : false, precision: p.deHeroe ? j.heroe.c.precision : undefined, critico: p.deHeroe ? j.heroe.c.critico : 0 };
        if (p.deHeroe && (p.efecto === 'flecha' || p.efecto === 'flecha_fuego' || p.efecto === 'flecha_hielo' || p.efecto === 'virote')) { g.extra = { ...j.heroe.c.elem }; g.robo = j.heroe.c.robo_vida; }
        if (!p.deHeroe) { g.fuente = undefined; for (const m of j.monstruos) if (!m.muerto && dist(m.x, m.y, p.x, p.y) < 30) { g.fuente = m; break; } }
        danar(j, e, g);
        if (p.explota) { explotar(j, p); p.vida = 0; break; }
        if (!p.perfora) { p.vida = 0; efecto(j, p.elem === 'fuego' ? 'explosion_fuego' : p.elem === 'frio' ? 'estallido_esquirlas' : p.elem === 'fisico' ? 'chispas_carne' : 'chispas_metal', p.x, p.y, 0, 0.5); break; }
      }
    }
  }
  j.proyectiles = j.proyectiles.filter((p) => p.vida > 0);
}
function explotar(j: Juego, p: Proyectil) {
  const r = p.explota || 1.5;
  efecto(j, p.elem === 'frio' ? 'nova_escarcha' : p.elem === 'veneno' ? 'nube_veneno' : 'explosion_fuego', p.x, p.y, 0, r / 2);
  for (const e of enemigosDe(j, p.deHeroe)) if (dist(e.x, e.y, p.x, p.y) < r + e.radio) danar(j, e, { min: p.dano[0], max: p.dano[1], elem: p.elem, deHeroe: p.deHeroe, fuente: p.deHeroe ? j.heroe : undefined, sinFallo: true });
  j.sacudida = Math.max(j.sacudida, 0.15);
  sonar(j, p.elem === 'frio' ? 'hielo_impacto' : 'explosion', p.x, p.y, 0.8);
  if (p.elem === 'fuego') j.manchas.push({ x: p.x, y: p.y, r: r * 0.6, color: '#141008', t: 0, tipo: 'quemado' });
}
function actualizarAreas(j: Juego, dt: number) {
  for (const a of j.areas) {
    if (a.retraso > 0) { a.retraso -= dt; if (a.retraso <= 0 && a.caida) { j.sacudida = 0.5; sonar(j, 'explosion', a.x, a.y); efecto(j, 'explosion_fuego', a.x, a.y, 0, 1.6); } if (a.retraso > 0) continue; if (a.efecto && !a.caida) efecto(j, a.efecto, a.x, a.y, 0, a.radio / 2.5, 0, Math.max(0.8, a.dur)); }
    a.t += dt; a.prox -= dt;
    if (a.prox <= 0) {
      a.prox = a.tick;
      for (const e of enemigosDe(j, a.deHeroe)) if (dist(e.x, e.y, a.x, a.y) < a.radio + e.radio) danar(j, e, { min: a.dano[0], max: a.dano[1], elem: a.elem, deHeroe: a.deHeroe, fuente: a.deHeroe ? j.heroe : undefined, sinFallo: true });
      if (a.efecto === 'lluvia_flechas') for (let k = 0; k < 5; k++) particulas(j, a.x + entre(-a.radio, a.radio), a.y + entre(-a.radio, a.radio), 1, 'chispa', '#d0c090', 0.3, 2);
      if (a.elem === 'frio' && a.efecto === 'ventisca') for (let k = 0; k < 6; k++) particulas(j, a.x + entre(-a.radio, a.radio), a.y + entre(-a.radio, a.radio), 1, 'nieve', '#e0f4ff', 0.5, 90);
    }
  }
  j.areas = j.areas.filter((a) => a.retraso > 0 || a.t < a.dur);
}

// ------------------------------------------------------------------ acciones del jugador
export function caminarA(j: Juego, x: number, y: number) {
  const h = j.heroe; if (h.muerto) return;
  h.camino = buscarCamino(j.zona, h.x, h.y, x, y, 2500);
  h.destino = [x, y];
}
export function usarPocion(j: Juego, i: number) {
  const h = j.heroe; if (h.muerto) return;
  const o = h.d.cinturon[i]; if (!o) return;
  const v = valorPocion(o);
  if (o.pocion === 'vida') { (h as any).curando = { t: 4, v: v / 4 }; }
  else if (o.pocion === 'mana') { (h as any).cargando = { t: 3, v: v / 3 }; }
  else { h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * v / 100); h.mana = Math.min(h.c.manaMax, h.mana + h.c.manaMax * v / 100); }
  h.d.cinturon[i] = null;
  // reacomodar: si hay otra poción del mismo tipo en la bolsa, se mueve al cinturón
  const idx = h.d.bolsa.findIndex((b) => b.o.tipo === 'pocion' && b.o.pocion === o.pocion);
  if (idx >= 0) { h.d.cinturon[i] = h.d.bolsa[idx].o; h.d.bolsa.splice(idx, 1); }
  sonar(j, 'pocion');
  particulas(j, h.x, h.y, 10, 'chispa', o.pocion === 'mana' ? '#6080ff' : o.pocion === 'vida' ? '#ff4040' : '#c040ff', 0.6, 40);
}
export function curarEnTiempo(j: Juego, dt: number) {
  const h = j.heroe as any;
  if (h.curando) { h.vida = Math.min(h.vidaMax, h.vida + h.curando.v * dt); h.curando.t -= dt; if (h.curando.t <= 0) h.curando = null; }
  if (h.cargando) { h.mana = Math.min(h.c.manaMax, h.mana + h.cargando.v * dt); h.cargando.t -= dt; if (h.cargando.t <= 0) h.cargando = null; }
}
export function recogerSuelo(j: Juego, s: Suelo): boolean {
  const h = j.heroe;
  if (s.oro) { h.d.oro += s.oro; sonar(j, 'oro'); j.suelo.splice(j.suelo.indexOf(s), 1); return true; }
  if (s.o && recoger(h.d, s.o)) { sonar(j, 'objeto_cae', undefined, undefined, 0.5); j.suelo.splice(j.suelo.indexOf(s), 1); return true; }
  msg(j, ['No tengo lugar.', 'I have no room.'], '#ff8080');
  sonar(j, 'negado');
  return false;
}
export function abrirPortal(j: Juego): boolean {
  const h = j.heroe;
  if (j.zona.tipo === 'pueblo') return false;
  const i = h.d.bolsa.findIndex((b) => b.o.base === 'pergamino_portal');
  if (i < 0) { msg(j, ['No tengo pergaminos de regreso.', 'I have no scrolls of return.']); return false; }
  h.d.bolsa.splice(i, 1);
  const q = libreCerca(j.zona, h.x + 1.5, h.y + 1.5);
  j.portal = { x: q[0] + 0.5, y: q[1] + 0.5, destino: j.zona.id, t: 0, x2: h.x, y2: h.y };
  (j as any).portalZona = j.zona.id;
  sonar(j, 'portal');
  return true;
}

