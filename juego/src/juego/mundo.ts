// La simulación: héroe, monstruos, invocados, proyectiles, áreas, botín y efectos de una zona.
import { npcVivo } from './historia';
import { generarZona, pasable, buscarCamino, lineaLibre, libreCerca, type Zona, type ObjZ } from '../mundo/zona';
import { ZONAS, POBL_ZONA, MISIONES, FRASE_JEFE } from '../mundo/actos';
import { MONSTRUOS, POBLACION, MODS, NOMBRES_UNICOS, type DefMonstruo } from '../datos/monstruos';
import { HABILIDADES, INVOCADOS, ATAQUE, ESCALA_HECHIZOS, poderNivel, danoInvocadoNivel, type Habilidad } from '../datos/clases';
import { GENTE, NPCS } from '../datos/npcs';
import { LUZ_EFECTO } from '../../../src/engine/gotico/luz_efectos';
import { calcular, nivelHab, xpPara, recoger, NIVEL_MAX, nivelEnDificultad, cicloExtra, cant, rellenarColumna, type DatosHeroe, type Calc } from './heroe';
import { botin, crearObjeto, crearUnicoId, legendariaJefe, valorPocion, crearObjetoThor, type Objeto, type Caida } from './objetos';
import { TALISMAN_JEFE } from '../datos/talismanes';
import type { Elemento } from './tipos_objetos';
import { R, entre, elegir, clamp, dist, hashTxt } from '../nucleo/azar';
import { Sonido } from '../audio/sonido';
import { zancada } from '../../../src/engine/gotico/figura';
import { manifiesto } from '../motor/assets';
import { muertePfx } from './pfx_usos';

/** Celdas que avanza un ciclo completo de caminar o correr (cuerpo de alto 1), según la pisada del motor. */
export const ZANCADA = { caminar: zancada('caminar') / 16, correr: zancada('correr') / 16 };
export const ALTO_CLASE: Record<string, number> = { berserker: 1.03, cazadora: 1.02 };

export type Dir = 's' | 'so' | 'o' | 'no' | 'n' | 'ne' | 'e' | 'se';
export type Accion = 'quieto' | 'caminar' | 'correr' | 'atacar' | 'lanzar' | 'herido' | 'morir';
export const DIRS: Dir[] = ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'];
/** Rumbo en el piso: 0° = se (x+), 45° = s, 90° = so ... */
export function dirDe(dx: number, dy: number): Dir {
  const a = (Math.atan2(dy, dx) * 180) / Math.PI;
  const i = Math.round(((a % 360) + 360) % 360 / 45) % 8;
  return (['se', 's', 'so', 'o', 'no', 'n', 'ne', 'e'] as Dir[])[i];
}
/** Vector unitario de cada dirección, el inverso de dirDe (ángulo 0 = 'se'). */
const R2 = Math.SQRT1_2;
export const DIR_VEC: Record<string, [number, number]> = { se: [1, 0], s: [R2, R2], so: [0, 1], o: [-R2, R2], no: [-1, 0], n: [-R2, -R2], ne: [0, -1], e: [R2, -R2] };
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
  /** Distancia caminada en celdas: mueve la animación de los pies para que no patinen. */
  recorrido?: number;
  radio: number;
  muerto: boolean; tMuerto: number;
  frio: number; congelado: number; veneno: number; venenoDps: number; aturdido: number; miedo: number; sangrado: number;
  maldicion?: { amplificar: number; debilitar: number; lento: number; t: number; res: number; sifon?: number; condena?: boolean };
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
  /** Presa marcada (cazadora): segundos que le quedan, recibe más daño del héroe y los suyos. */
  marca?: number;
}
export interface Proyectil {
  x: number; y: number; z: number; vx: number; vy: number; vida: number; dano: [number, number]; elem: Elemento;
  deHeroe: boolean; perfora: boolean; explota: number; efecto: string; golpeados: Set<number>; buscador: boolean; radio: number;
  arco?: { x0: number; y0: number; x1: number; y1: number; t: number; T: number; n?: number };
  hab?: Habilidad; nivelHab?: number; mult?: number; lento?: number; t: number; rebota?: number;
  /** Abanicos: golpes de la misma salva por monstruo (la 2.ª flecha y siguientes al mismo blanco hacen 60 %). */
  salva?: Map<number, number>;
  /** Quién lo disparó (para atribuir el golpe, la escarcha que congela al atacante, etc.). */
  fuente?: Ent;
}
export interface Area { x: number; y: number; radio: number; dano: [number, number]; elem: Elemento; t: number; dur: number; tick: number; prox: number; deHeroe: boolean; efecto: string; retraso: number; caida?: boolean }
export interface Suelo { o: Objeto | null; oro: number; x: number; y: number; t: number; id: number }
export interface Numero { x: number; y: number; z: number; txt: string; color: string; t: number; grande?: boolean }
export interface Efecto { id: string; x: number; y: number; t: number; dir: number; escala: number; z?: number; seguir?: Ent; dur?: number }
export interface Particula { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; dur: number; color: string; tam: number; tipo: 'chispa' | 'humo' | 'sangre' | 'brasa' | 'nieve' | 'hoja' | 'pluma' | 'ceniza'; grav: number }
export interface Mancha {
  x: number; y: number; r: number; color: string; t: number; tipo: 'sangre' | 'quemado' | 'hielo' | 'veneno';
  /** Forma de la sangre: charco que crece, salpicadura alargada según el golpe, gota o rastro de quien huye. */
  forma?: 'charco' | 'salpicadura' | 'gota' | 'rastro'; ang?: number; rmax?: number; sem?: number;
  /** Paleta del kit de gore: sangre roja, icor negro (no-muertos) o verde (bestias e insectos); y la superficie donde cae. */
  pal?: 'rojo' | 'negro' | 'verde'; sup?: 'piedra' | 'tierra' | 'nieve' | 'madera';
}
/** Pedazo de cuerpo que vuela al reventar: gira, cae con gravedad, salpica al tocar el piso y se desvanece. */
export interface Gib { id: string; pal: string; x: number; y: number; z: number; vx: number; vy: number; vz: number; ang: number; va: number; t: number; vida: number; quieto?: boolean }
/** Manchas por zona: cola circular (las más viejas se van) para que la sangre no se coma el rendimiento. */
export const TOPE_MANCHAS = 300;
export function ponerMancha(j: Juego, m: Mancha) { if (m.forma && !m.sup) m.sup = superficieDe(j); j.manchas.push(m); if (j.manchas.length > TOPE_MANCHAS) j.manchas.splice(0, j.manchas.length - TOPE_MANCHAS); }
// ------------------------------------------------------------------ efectos de las legendarias del arsenal
const efectoArma = (j: Juego) => j.heroe.d.equipo.arma?.efecto;
let enCadena = false;
/** Al pegar con el arma: sed crítica, cadena de rayo, tercer golpe de escarcha y juicio del quinto golpe. */
function efectoLegGolpe(j: Juego, m: Monstruo, total: number, crit: boolean) {
  const ef = efectoArma(j); if (!ef) return;
  const h = j.heroe, o = h as any;
  if (ef === 'sed_critica' && crit) { h.vida = Math.min(h.vidaMax, h.vida + total * 0.25); m.sangrado = Math.max(m.sangrado, 4); particulas(j, h.x, h.y, 6, 'chispa', '#ff3030', 0.8, 40); }
  if (ef === 'cadena' && !enCadena) {
    enCadena = true;
    let desde: Ent = m; const ya = new Set<number>([m.id]);
    for (let k = 0; k < 2; k++) {
      const b = masCercano(j, desde.x, desde.y, 4, ya) as Monstruo | null; if (!b) break;
      const ef2 = { id: 'arco_cadena', x: desde.x, y: desde.y, t: 0, dir: 0, escala: 1, z: 0, dur: 0.25 } as any; ef2.x2 = b.x; ef2.y2 = b.y; j.efectos.push(ef2);
      danar(j, b, { min: total * 0.45, max: total * 0.45, elem: 'rayo', deHeroe: true, fuente: h, sinFallo: true });
      efecto(j, 'impacto_rayo', b.x, b.y, 0, 0.5); ya.add(b.id); desde = b;
    }
    enCadena = false;
  }
  if (ef === 'tercer_golpe') {
    o.golpesLeg = (o.golpesLeg ?? 0) + 1;
    if (o.golpesLeg % 3 === 0) {
      efecto(j, 'nova_escarcha', m.x, m.y, 0, 0.9); sonar(j, 'hielo_lanzar', m.x, m.y, 0.7);
      for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, m.x, m.y) < 2.5 + e.radio) { const q = e as Monstruo; q.frio = Math.max(q.frio, 3); if (!q.def?.jefe) q.congelado = Math.max(q.congelado ?? 0, 1.2); if (q !== m) danar(j, q, { min: total * 0.6, max: total * 0.6, elem: 'frio', deHeroe: true, fuente: h, sinFallo: true }); }
    }
  }
  if (ef === 'juicio') {
    o.golpesLeg = (o.golpesLeg ?? 0) + 1;
    if (o.golpesLeg % 5 === 0) { efecto(j, 'castigo', m.x, m.y, 0, 1); danar(j, m, { min: total * 1.5, max: total * 1.5, elem: 'luz', deHeroe: true, fuente: h, sinFallo: true }); h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * 0.04); }
  }
}
/** Al matar con el arma: pira, contagio y la sombra que se levanta. */
function efectoLegMuerte(j: Juego, m: Monstruo) {
  const ef = efectoArma(j); if (!ef) return;
  const h = j.heroe;
  if (ef === 'pira') { efecto(j, 'explosion_fuego', m.x, m.y, 0, 1); j.areas.push({ x: m.x, y: m.y, radio: 2, dano: [m.vidaMax * 0.25, m.vidaMax * 0.35], elem: 'fuego', t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: '', retraso: 0 }); }
  if (ef === 'contagio') j.areas.push({ x: m.x, y: m.y, radio: 2.2, dano: [m.vidaMax * 0.05, m.vidaMax * 0.08], elem: 'veneno', t: 0, dur: 3, tick: 0.5, prox: 0, deHeroe: true, efecto: 'nube_veneno', retraso: 0 });
  if (ef === 'sombra_hambrienta' && R() < 0.3 && mios(j).filter((q) => q.invocaId === 'espiritu' && q.tVida).length < 3) {
    const s = crearInvocado(j, 'espiritu', Math.max(1, Math.floor(h.d.nivel / 6)), m.x, m.y, 12);
    if (s) { s.tinte = '#5020a0'; s.nombre = ['Sombra hambrienta', 'Hungry shadow']; efecto(j, 'maldicion_sombra', m.x, m.y, 0, 0.8); }
  }
}
/** La primera vez que ves a un jefe de verdad: su presentación con el nombre grande y cámara lenta. */
function presentarJefe(j: Juego, m: Monstruo) {
  if (!(m.def.jefe || m.def.ia === 'jefe') || (m as any).presentado) return;
  (m as any).presentado = true;
  const vis: string[] = ((j.heroe.d as any).jefesVistos ??= []);
  if (!vis.includes(m.def.id)) { vis.push(m.def.id); j.eventos.push({ tipo: 'presentar', dato: m }); }
}
const NO_MUERTO = /zombi|momia|necrof|espectr|lich|aparecid|ahogad|muert|hueca|sin_rostro|suplicante|desollad|penitente|segador|caballero_espectral/;
const BESTIA = /lobo|jabali|arana|escorp|gusano|murcielago|cangrejo|perro|escarabajo|gargola|chacal|trol|madre/;
const paletaDe = (m: Monstruo): 'rojo' | 'negro' | 'verde' => (NO_MUERTO.test(m.def?.sprite ?? '') ? 'negro' : BESTIA.test(m.def?.sprite ?? '') ? 'verde' : 'rojo');
/** Superficie del piso de la zona, para el sello de sangre que corresponde. */
export function superficieDe(j: Juego): 'piedra' | 'tierra' | 'nieve' | 'madera' {
  const d = ZONAS[j.zona?.id ?? '']; const t = d?.tema ?? '';
  if (/nieve|hielo/.test(t)) return 'nieve';
  if (d?.tipo === 'pueblo' && /ahogada|campamento|barco/.test(t)) return 'madera';
  if (d?.tipo === 'mazmorra' || /catedral|celestial|cripta|catacumbas|fortaleza/.test(t)) return 'piedra';
  return 'tierra';
}
const sangraHueso = (m: Monstruo) => m.def?.sonido === 'hueso';
const colorSangre = (m: Monstruo) => (sangraHueso(m) ? '#4a4436' : m.def?.elem === 'veneno' ? '#2a4a10' : '#6a0a0a');
/** Salpicadura en la dirección del golpe: sangre que vuela y una mancha alargada en el piso detrás del herido. */
function salpicar(j: Juego, v: Monstruo, de: Ent | undefined, fuerza: number, crit: boolean) {
  if (sangraHueso(v) || v.dueno) return;
  const dx = de ? v.x - de.x : R() - 0.5, dy = de ? v.y - de.y : R() - 0.5, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const n = Math.min(26, Math.round((crit ? 14 : 5) + fuerza * 30));
  if (j.particulas.length < 900) for (let i = 0; i < n; i++) {
    const sp = (R() - 0.5) * 0.9, c = Math.cos(sp), s = Math.sin(sp), vx = ux * c - uy * s, vy = ux * s + uy * c, vel = (1.5 + R() * 3.5) * (crit ? 1.6 : 1);
    j.particulas.push({ x: v.x, y: v.y, z: 30 * v.escala + R() * 10, vx: vx * vel, vy: vy * vel, vz: 30 + R() * (crit ? 110 : 60), t: 0, dur: 0.5 + R() * 0.5, color: R() < 0.3 ? '#b01010' : '#7a0808', tam: 1 + R() * 2, grav: 260, tipo: 'sangre' } as any);
  }
  if (crit || fuerza > 0.08 || R() < 0.35) ponerMancha(j, { x: v.x + ux * (0.6 + R() * 0.5), y: v.y + uy * (0.6 + R() * 0.5), r: 0.35 + Math.min(0.9, fuerza * 2) + (crit ? 0.35 : 0), color: colorSangre(v), t: 0, tipo: 'sangre', forma: 'salpicadura', ang: Math.atan2(uy, ux), sem: Math.floor(R() * 8), pal: paletaDe(v) });
}
/**
 * Muerte por exceso de daño: el cuerpo revienta. Por ahora es sangre y pedazos con partículas; cuando lleguen los gibs
 * de la Forja, aquí se sueltan sus sprites (GIBS: id de objeto con variantes) con la misma física.
 */
export const GIBS: { id: string; variantes: string[] } | null = null;
const PIEZAS_GIB = ['torso', 'brazo', 'pierna', 'costillas', 'craneo', 'tripas', 'astillas', 'trozo'];
const PAL_GIB: Record<string, string> = { rojo: 'rojo', negro: 'no_muerto', verde: 'bestia' };
function reventar(j: Juego, m: Monstruo) {
  (m as any).reventado = true;
  sonar(j, 'reventon', m.x, m.y, 0.9);
  const col = colorSangre(m), pal = paletaDe(m);
  // el reventón de la Forja y 5 a 9 pedazos que vuelan, giran y caen
  (((j as any).reventones ??= []) as any[]).push({ x: m.x, y: m.y, pal: PAL_GIB[pal], t: 0, esc: m.escala });
  const gibs: Gib[] = ((j as any).gibs ??= []);
  const n = 5 + Math.floor(R() * 5);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, v = 1.5 + R() * 3.5;
    gibs.push({ id: 'gore_gib_' + (i === 0 ? 'torso' : PIEZAS_GIB[1 + Math.floor(R() * (PIEZAS_GIB.length - 1))]), pal: PAL_GIB[pal], x: m.x, y: m.y, z: 24 * m.escala, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 80 + R() * 140, ang: R() * 8, va: (R() - 0.5) * 30, t: 0, vida: 20 + R() * 20 });
  }
  if (gibs.length > 80) gibs.splice(0, gibs.length - 80);
  if (j.particulas.length < 1100) for (let i = 0; i < 42; i++) {
    const a = R() * Math.PI * 2, vel = 2 + R() * 6, trozo = i < 12;
    j.particulas.push({ x: m.x, y: m.y, z: 26 * m.escala + R() * 20, vx: Math.cos(a) * vel, vy: Math.sin(a) * vel, vz: 60 + R() * 160, t: 0, dur: trozo ? 1.4 + R() * 0.6 : 0.6 + R() * 0.6, color: trozo ? (R() < 0.5 ? '#5a0a0a' : '#8a3a2a') : R() < 0.4 ? '#c01414' : '#7a0808', tam: trozo ? 3 + R() * 3 : 1.2 + R() * 2.2, grav: 300, tipo: 'sangre' } as any);
  }
  for (let i = 0; i < 6; i++) { const a = R() * Math.PI * 2, d = 0.6 + R() * 1.6; ponerMancha(j, { x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d, r: 0.3 + R() * 0.5, color: col, t: 0, tipo: 'sangre', forma: 'salpicadura', ang: a, sem: Math.floor(R() * 8) }); }
  j.sacudida = Math.max(j.sacudida, 0.3);
  sonar(j, 'explosion' as any, m.x, m.y, 0.5);
}
/** Torretas y trampas. Las minas (mina = radio de la explosión) esperan a que algo las pise. */
export interface Torreta { x: number; y: number; t: number; dur: number; dano: [number, number]; cd: number; hab?: string; elem?: Elemento; mina?: number; raiz?: boolean; efecto?: string }
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
  // ---- mecánicas de clase (se reinician al cambiar de zona o cargar)
  /** Berserker: furia 0-100. */
  furia: number; furiaFija: number; tCombate: number;
  /** Monje: pasos del combo (0-2) y cuándo fue el último golpe. */
  combo: { paso: number; t: number };
  /** Arcanista: cargas elementales guardadas (hasta 3). */
  cargas: Elemento[];
  /** Alquimista: frascos listos y avance del relleno. */
  frascos: number; frascoT: number;
  /** Templario: potencia con que se armó el aura activa. */
  auraPot: number;
  /** Qué habilidad mueve el huracán activo (galerna u ojo del tifón). */
  huracanHab: string;
  avisos: Record<string, number>;
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
  cuervos: { x: number; y: number; t: number; dur: number; dano: [number, number]; objetivo: Monstruo | null; ang: number; marca?: boolean }[];
  torretas: Torreta[];
  cadaveres: number;
}

// ------------------------------------------------------------------ zonas en memoria (no se regeneran mientras juegas)
const zonasVivas = new Map<string, { z: Zona; monstruos: Monstruo[]; suelo: Suelo[]; manchas: Mancha[] }>();
export const olvidarZonas = () => zonasVivas.clear();
/** Dureza de los ciclos más allá del Infierno (Nueva Partida+): +15 % de vida y daño por ciclo. */
let durezaCiclo = 1;

export function crearJuego(d: DatosHeroe, idi: 0 | 1): Juego {
  const c = calcular(d);
  const h: Heroe = {
    ...(nueva({ tipo: 'heroe', vel: 5.2, radio: 0.4 }) as Ent), tipo: 'heroe', d, c, mana: d.manaActual ?? c.manaMax, vida: d.vidaActual ?? c.vidaMax, vidaMax: c.vidaMax,
    camino: null, destino: null, objetivo: null, recoger: null, hablar: null, usar: null, habActual: 'ataque', correr: true, buffs: {}, recargas: {}, escudoHueso: 0,
    torbellino: 0, salto: null, tempestad: 0, huracan: 0, pasoT: 0, regen: 0, ultimoGolpe: 0,
    furia: 0, furiaFija: 0, tCombate: -99, combo: { paso: 0, t: -99 }, cargas: [], frascos: 0, frascoT: 0, auraPot: 0, huracanHab: 'huracan', avisos: {},
  };
  h.frascos = frascosMax(h);
  const j: Juego = {
    zona: null as unknown as Zona, heroe: h, monstruos: [], npcs: [], proyectiles: [], areas: [], suelo: [], numeros: [], efectos: [], particulas: [], manchas: [], portal: null,
    t: 0, sacudida: 0, mensajes: [], jefe: null, tirado: new Set(), visiones: [], eventos: [], idi, cuervos: [], torretas: [], cadaveres: 0,
  };
  return j;
}

/** Entra a una zona por una entrada (o a la piedra de viaje). */
export function entrarZona(j: Juego, zid: string, entrada: string) {
  durezaCiclo = 1 + 0.15 * cicloExtra(j.heroe.d);
  (j as any).gibs = []; (j as any).reventones = [];
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
  reiniciarMecanicas(j.heroe);
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
  j.npcs = def.tipo === 'pueblo' ? crearNpcs(j.zona, j.heroe.d) : [];
  j.jefe = null;
  if (def.tipo === 'pueblo' && !h.d.viajes.includes(zid)) h.d.viajes.push(zid);
  // misión de llegar
  for (const m of MISIONES) if (m.objetivo.tipo === 'llegar' && m.objetivo.zona === zid && (h.d.misiones[m.id] ?? 0) === 1) { h.d.misiones[m.id] = 2; j.eventos.push({ tipo: 'mision', dato: m.id }); }
  j.eventos.push({ tipo: 'zona', dato: zid });
}

function crearNpcs(z: Zona, d: DatosHeroe): Npc[] {
  const todos = GENTE[z.acto] ?? [];
  const gente = todos.filter((id) => { const dm = NPCS[id]?.desaparece; return (!dm || (d.misiones[dm] ?? 0) < 2) && npcVivo(id, d); });
  const lugares = z.marcas.filter((m) => m.tipo === 'npc');
  // quien murió por una decisión deja su tumba donde solía estar
  todos.forEach((id, i) => {
    const n = NPCS[id]; if (!n?.muereSi || npcVivo(id, d) || z.objetos.some((o) => o.tag === 'tumba' && o.dato?.npc === id)) return;
    const l = lugares[i % Math.max(1, lugares.length)] ?? { cx: z.W / 2, cy: z.H / 2 };
    const q = libreCerca(z, l.cx, l.cy);
    z.objetos.push({ id: 'cem_lapida_celta', v: 'con_musgo', cx: q[0], cy: q[1], hw: 1, hh: 1, bloquea: false, tag: 'tumba', dato: { npc: id } } as any);
  });
  return gente.map((id, i) => {
    const l = lugares[todos.indexOf(id) % Math.max(1, lugares.length)] ?? lugares[i % Math.max(1, lugares.length)] ?? { cx: z.W / 2, cy: z.H / 2 };
    const q = libreCerca(z, l.cx, l.cy);
    return { ...(nueva({ tipo: 'npc', x: q[0] + 0.5, y: q[1] + 0.5, vida: 1, vidaMax: 1, dir: elegir(['s', 'so', 'se'] as Dir[]) }) as Ent), tipo: 'npc', npc: id, hablando: false } as Npc;
  });
}

// ------------------------------------------------------------------ monstruos
/**
 * Los datos de cada monstruo ya traen la dureza de su acto (un caballero del abismo nace más duro que un zombi). Cuando sale
 * por encima de su acto (zombis del acto 1 en Pesadilla, esqueletos en el acto 6) se le sube a la dureza del nivel donde está,
 * así la curva sigue al nivel y no a qué acto reusa a quién. Pasado el 62 (el final de Normal) ya no hay actos nuevos.
 */
const durezaNivel = (n: number) => Math.pow(1 + Math.min(n, 62) / 12, 1.1);
let nativos: Map<string, number> | null = null;
function nivelNativo(id: string): number | undefined {
  if (!nativos) {
    nativos = new Map();
    for (const z of Object.values(ZONAS)) {
      if (z.tipo === 'pueblo') continue;
      for (const m of [...(POBLACION[POBL_ZONA[z.id] ?? ''] ?? []), ...(z.jefe ? [z.jefe] : [])]) nativos.set(m, Math.min(nativos.get(m) ?? 999, z.nivel));
    }
  }
  return nativos.get(id);
}
function escalar(def: DefMonstruo, nivel: number) {
  const k = nivel - 1;
  const nat = nivelNativo(def.id);
  const f = nat ? Math.max(1, durezaNivel(nivel) / durezaNivel(nat)) : 1;
  // el daño sube despacio con el nivel: la dureza del acto ya lo sube, y la vida del héroe crece casi lineal
  const kd = 0.6 * Math.pow(nivel, 0.3);
  return { vida: Math.max(4, Math.round(def.vida * f * 0.6 * (1 + k * 0.32) * (1 + k * 0.012))), dano: [Math.max(1, Math.round(def.dano[0] * f * kd)), Math.max(1, Math.round(def.dano[1] * f * kd))] as [number, number], defensa: Math.round(def.def + nivel * 7), xp: Math.round(def.xp * f * Math.pow(nivel, 0.9)) };
}
export function crearMonstruo(def: DefMonstruo, nivel: number, x: number, y: number, calidad = 0, dif = 0): Monstruo {
  const s = escalar(def, nivel + dif * 0);
  // el nivel ya trae la dificultad (Pesadilla e Infierno suben de nivel): aquí solo un empujón extra
  // los jefes de mazmorra (ia jefe sin ser de acto) salen como únicos: con 4 veces la vida duraban casi como uno de acto
  const mv = durezaCiclo * [1, 3, 4, 1, 1][calidad] * (def.ia === 'jefe' && !def.jefe ? 0.6 : 1) * ([1, 1.35, 1.7][dif] ?? 1);
  // acto 1 en Normal: los monstruos pegan un 25 % menos hasta el nivel 8 y vuelven a lo normal hacia el 14 (para los que empiezan)
  const suave = dif === 0 && nivel < 14 ? 0.75 + 0.25 * clamp((nivel - 8) / 6, 0, 1) : 1;
  const md = durezaCiclo * [1, 1.5, 1.8, 0.7, 0.7][calidad] * ([1, 1.15, 1.3][dif] ?? 1) * suave;
  const m: Monstruo = {
    ...(nueva({ tipo: 'monstruo', x, y, vel: def.vel, radio: 0.42 * (def.huella ?? 1), escala: def.escala ?? 1, tinte: def.tinte }) as Ent), tipo: 'monstruo',
    def, nivel, dano: [Math.round(s.dano[0] * md), Math.round(s.dano[1] * md)], defensa: s.defensa, res: { ...(def.res ?? {}) }, calidad, nombre: def.nombre, mods: [],
    objetivo: null, estado: def.surge ? 'surgir' : 'dormido', cd: entre(0.5, 1.5), pensar: R(), camino: null, ox: x, oy: y, xp: Math.round(s.xp * [1, 3, 5, 10, 1][calidad] * ([1, 1.4, 1.8][dif] ?? 1)), invocaCd: entre(3, 6), fase: 0,
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
  const nivel = nivelEnDificultad(z.nivel, dif);
  // el grupo más cercano a una entrada de una zona de inicio es uno solo, para no recibir al héroe de nivel 1 con una paliza
  let primero: (typeof z.spawns)[number] | null = null;
  if (z.nivel < 6 && dif === 0 && d.nivel <= 3) {
    let bd = 1e9;
    for (const s of z.spawns) if (s.tipo !== 'jefe' && s.tipo !== 'unico' && s.tipo !== 'campeon') for (const e of Object.values(z.entradas)) { const dd = dist(s.cx, s.cy, e[0], e[1]); if (dd < bd) { bd = dd; primero = s; } }
  }
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
    let id = R() < 0.55 ? pool[0] : elegir(pool);
    // en la Corona los campeones suelen ser ángeles sedientos (vuelan y escupen luz)
    if (s.tipo === 'campeon' && pool.includes('angel_sediento') && R() < 0.5) id = 'angel_sediento';
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
    // los sedientos van en manadas de 5 a 8; las manos doradas, de a dos o tres
    const n = dm.id === 'sediento' ? 5 + Math.floor(R() * 4) : dm.id === 'mano_dorada' ? 2 + Math.floor(R() * 2) : Math.max(1, Math.round((dm.ia === 'enjambre' ? (z.nivel < 6 ? 3 : 5) : dm.ia === 'bruto' ? 2 : z.nivel < 6 ? 2 : 3) * s.fuerza));
    for (let i = 0; i < (s === primero ? 1 : n); i++) { const q = libreCerca(z, s.cx + entre(-2.5, 2.5), s.cy + entre(-2.5, 2.5)); out.push(crearMonstruo(i > 0 && R() < 0.3 ? MONSTRUOS[elegir(pool)] : dm, nivel, q[0] + 0.5, q[1] + 0.5, 0, dif)); }
  }
  return out;
}
function aplicarMods(m: Monstruo) {
  for (const id of m.mods) {
    const md = MODS.find((x) => x.id === id); if (md && !m.tinte && m.calidad === 1) m.tinte = md.tinte;
    if (id === 'rapido') m.vel *= 1.5;
    if (id === 'piel_piedra') m.defensa *= 3;
    if (id === 'fuerte') { m.dano = [m.dano[0] * 1.5, m.dano[1] * 1.5]; }
    // espectral: medio fuera de este mundo, los golpes físicos lo atraviesan a medias
    if (id === 'espectral') m.res = { ...m.res, fisico: Math.max(m.res.fisico ?? 0, 35) };
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

// ------------------------------------------------------------------ mecánicas de clase
/** Bono sumado de objetos, buffs y pasivas (claves propias de las habilidades). */
export const bono = (h: Heroe, k: string) => h.c.st?.[k] ?? 0;
export const frascosMax = (h: Heroe) => 4 + Math.floor(bono(h, 'frascos_max'));
export const ventanaCombo = (h: Heroe) => 1.8 + bono(h, 'combo_ventana');
export const MAX_CARGAS = 3;
const CONSUME_CARGAS = new Set(['descarga_prismatica', 'sol_negro', 'edad_hielo', 'furia_firmamento']);
export function reiniciarMecanicas(h: Heroe) {
  h.furia = 0; h.furiaFija = 0; h.tCombate = -99; h.combo = { paso: 0, t: -99 }; h.cargas = []; h.frascoT = 0;
  if (h.c) h.frascos = frascosMax(h);
}
/** Mensaje que no se repite seguido (para avisos al mantener apretado el botón). */
function aviso(j: Juego, txt: [string, string], color = '#e0d0a0') {
  const h = j.heroe, k = txt[0];
  if ((h.avisos[k] ?? -99) > j.t - 1.5) return;
  h.avisos[k] = j.t; msg(j, txt, color);
}
export function ganarFuria(j: Juego, v: number) {
  const h = j.heroe; if (h.d.clase !== 'berserker') return;
  h.furia = Math.min(100, h.furia + v * (1 + bono(h, 'furia_gana') / 100)); h.tCombate = j.t;
}
/** Cadáveres de monstruos que todavía sirven (no usados, no invocados). */
export function cadaveresCerca(j: Juego, x: number, y: number, r: number): Monstruo[] {
  return j.monstruos.filter((m) => m.muerto && !m.dueno && !(m as any).usado && m.tMuerto < 590 && dist(m.x, m.y, x, y) <= r).sort((a, b) => dist(a.x, a.y, x, y) - dist(b.x, b.y, x, y));
}
function usarCadaver(m: Monstruo) { (m as any).usado = true; m.tMuerto = 999; }
/** Gasta las cargas de un elemento (o todas) y dice cuántas eran. */
function gastarCargas(h: Heroe, e?: Elemento): Elemento[] {
  const fuera = h.cargas.filter((c) => !e || c === e); h.cargas = h.cargas.filter((c) => e && c !== e); return fuera;
}
const mios = (j: Juego, id?: string) => j.monstruos.filter((m) => m.dueno && !m.muerto && (!id || m.invocaId === id));

function sonar(j: Juego, id: string, x?: number, y?: number, vol = 1) {
  const h = j.heroe;
  let pan = 0, d = 0;
  if (x !== undefined && y !== undefined) { pan = clamp(((x - y) - (h.x - h.y)) / 14, -1, 1); d = clamp(dist(x, y, h.x, h.y) / 22, 0, 1); }
  Sonido.efecto(id, { pan, dist: d, vol });
}

// ------------------------------------------------------------------ daño
export interface Golpe { /** Golpe del arma del héroe (dispara los efectos de las legendarias del arsenal). */ arma?: boolean; min: number; max: number; elem: Elemento; precision?: number; critico?: number; robo?: number; aturdir?: number; empuje?: number; lento?: number; aplastar?: number; herida?: number; deHeroe: boolean; fuente?: Ent; extra?: Partial<Record<Elemento, number>>; sinFallo?: boolean }
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
    // el crítico dobla lo físico y la sangre, y el daño elemental del arma también sube (×1.5)
    if (crit) d *= e === 'fisico' || e === 'sangre' ? 2 : 1.5;
    let res = 0;
    if (v.tipo === 'heroe') { res = h.c.res[e] ?? 0; if (e === 'fisico') res = h.c.reduc_dano; }
    else { const m = v as Monstruo; res = m.res[e] ?? 0; if (m.maldicion) { res += m.maldicion.res; if (e === 'fisico' && m.maldicion.amplificar) res -= m.maldicion.amplificar; } }
    if (g.fuente && g.fuente.tipo === 'monstruo' && (g.fuente as Monstruo).maldicion?.debilitar) d *= 1 - (g.fuente as Monstruo).maldicion!.debilitar / 100;
    d *= 1 - clamp(res, -100, 95) / 100;
    if (e === 'veneno') { v.veneno = Math.max(v.veneno, 2.5); v.venenoDps = Math.max(v.venenoDps, d / 2.5); total += d * 0.2; continue; }
    if (e === 'frio') { v.frio = Math.max(v.frio, 2.5 + (v.tipo === 'heroe' ? 0 : 1)); if (v.tipo !== 'heroe' && R() < 0.15 && !(v as Monstruo).def.jefe) v.congelado = 1.2; else if (v.tipo === 'heroe' && R() < 0.06 * (1 - clamp(res, 0, 90) / 100)) v.congelado = Math.max(v.congelado, 0.6); }
    // quemadura: el fuego sigue ardiendo un rato (20 % más en 2 s)
    if (e === 'fuego' && d > 0) { (v as any).quema = 2; (v as any).quemaDps = Math.max((v as any).quemaDps ?? 0, d * 0.1); }
    if (e === 'sangre') v.sangrado = Math.max(v.sangrado, 3);
    total += d;
  }
  // núcleo expuesto de Ozmaren: doble daño
  const nucleo = v.tipo !== 'heroe' && (v as any).nucleoT > 0 && !!g.deHeroe;
  if (nucleo) total *= 2;
  // la arcanista desvía a su maná un cuarto del daño que recibe ("una mente que no se quiebra")
  // paga con maná el 30 % del daño, pero solo con el maná por encima del 25 %: así nunca la deja sin hechizos
  if (v.tipo === 'heroe' && h.d.clase === 'arcanista' && total > 0) { const libre = h.mana - h.c.manaMax * 0.15; if (libre > 0) { const a = Math.min(libre, total * 0.4); h.mana -= a; total -= a; } }
  // escudo de hueso
  if (v.tipo === 'heroe' && h.escudoHueso > 0) { const a = Math.min(h.escudoHueso, total); h.escudoHueso -= a; total -= a; if (a > 0) particulas(j, v.x, v.y, 3, 'chispa', '#e0d8c0'); }
  if (g.aplastar && v.tipo !== 'heroe' && R() * 100 < g.aplastar) total += v.vida * ((v as Monstruo).calidad >= 3 ? 0.05 : 0.25);
  if (g.herida && R() * 100 < g.herida) v.sangrado = 4;
  // presas marcadas, sifón de vida y furia
  if (v.tipo !== 'heroe' && g.deHeroe) {
    const m = v as Monstruo;
    if (m.marca && m.marca > 0) total *= 1 + (20 + bono(h, 'marca_pct') + (h.buffs.caceria_salvaje ? 20 : 0)) / 100;
    if (m.maldicion?.sifon && total > 0) h.vida = Math.min(h.vidaMax, h.vida + total * m.maldicion.sifon / 100);
    h.tCombate = j.t;
  }
  total = Math.max(0, total);
  if (v.tipo === 'heroe' && total > 0) ganarFuria(j, 3);
  // la armadura de Thor: cada tramo le quita daño
  if ((v as any).invocaId === 'thor') total *= 1 - Math.min(45, ((v as any).tramoThor ?? 0) * 8) / 100;
  v.vida -= total;
  v.destello = 0.12;
  if (total > 0) {
    numero(j, v, total, v.tipo === 'heroe' ? '#ff4040' : crit || nucleo ? '#ffe040' : COLOR_ELEM[g.elem], crit || nucleo);
    if (g.robo && g.deHeroe) h.vida = Math.min(h.vidaMax, h.vida + total * g.robo / 100);
    if (g.deHeroe && h.c.robo_mana) h.mana = Math.min(h.c.manaMax, h.mana + total * h.c.robo_mana / 100);
  }
  // aturdir: nunca a los jefes; al héroe solo un momento
  if (g.aturdir && !esJefe(v) && R() * 100 < g.aturdir) v.aturdido = v.tipo === 'heroe' ? Math.max(v.aturdido, 0.5) : 1;
  if (g.lento) v.frio = Math.max(v.frio, 2);
  if (g.empuje && v.tipo !== 'heroe' && g.fuente && !(v as Monstruo).def.jefe) { const dx = v.x - g.fuente.x, dy = v.y - g.fuente.y, l = Math.hypot(dx, dy) || 1; for (let k = 0; k < 6; k++) { const nx = v.x + (dx / l) * 0.35, ny = v.y + (dy / l) * 0.35; if (pasable(j.zona, nx, ny)) { v.x = nx; v.y = ny; } } }
  // sangre y reacción
  if (v.tipo === 'monstruo' && total > 0 && (g.elem === 'fisico' || g.elem === 'sangre' || crit)) salpicar(j, v as Monstruo, g.fuente, total / Math.max(1, v.vidaMax), crit);
  else if (g.elem === 'fisico' || g.elem === 'sangre') particulas(j, v.x, v.y, total > v.vidaMax * 0.2 ? 10 : 5, 'sangre', (v as Monstruo).def?.sonido === 'hueso' ? '#d8d0b8' : '#8a0c0c', 1, 34 * v.escala);
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
    // gore: la carne chapotea, y un crítico desgarra
    if (total > 0 && (g.elem === 'fisico' || g.elem === 'sangre') && !sangraHueso(m) && m.def.sonido !== 'metal') {
      if (crit) sonar(j, 'desgarro', v.x, v.y, 0.75);
      else if (R() < 0.45) sonar(j, 'chapoteo', v.x, v.y, 0.4 + Math.min(0.4, total / m.vidaMax));
    }
    if (m.estado === 'dormido' || m.estado === 'deambular') { m.estado = 'perseguir'; m.objetivo = g.fuente ?? j.heroe; }
    if (total > m.vidaMax * 0.12 && m.acc !== 'atacar' && m.acc !== 'lanzar' && m.calidad < 3) { m.acc = 'herido'; m.t = 0; m.dur = 0.3; }
    if (crit || total > m.vidaMax * 0.3) j.sacudida = Math.max(j.sacudida, 0.1);
    if (g.arma && total > 0) efectoLegGolpe(j, m, total, crit);
    if (m.vida <= 0 && (m as any).huye) m.vida = 1; // historia: el heraldo no muere antes de su acto, huye
    // exceso de daño: si el golpe que lo mata pasa de la mitad de su vida, revienta (los jefes no)
    if (m.vida <= 0 && !m.dueno && m.calidad < 3 && !m.def.jefe && total > m.vidaMax * 0.5 && !sangraHueso(m)) reventar(j, m);
    if (m.vida <= 0) morirMonstruo(j, m, g);
  }
  return total;
}

function morirMonstruo(j: Juego, m: Monstruo, g?: Golpe) {
  if (sangraHueso(m) && !m.dueno) sonar(j, 'hueso_cruje', m.x, m.y, 0.8);
  if (g?.arma && !m.dueno) efectoLegMuerte(j, m);
  m.muerto = true; m.acc = 'morir'; m.t = 0; m.tMuerto = 0; m.vida = 0;
  const h = j.heroe;
  if (m.dueno && m.invocaId === 'thor') {
    // Thor no muere: se echa a descansar y vuelve solo en 60 s (o al llegar al pueblo), sin castigo
    (h.d.thor ??= {}).descanso = 60;
    msg(j, ['Thor se echa a descansar. Vuelve en un minuto, o antes si pasas por el pueblo.', 'Thor lies down to rest. He comes back in a minute, or sooner if you visit town.'], '#c0a070');
    return;
  }
  if (m.dueno) { j.cadaveres++; return; }
  // la muerte de pixelfx (el ánima que sube, el hielo que revienta, la explosión del jefe...)
  const mp = muertePfx(m as any, g?.elem, R()); if (mp) { (m as any).pfxMuerte = { id: mp, t0: j.t }; efecto(j, 'pfx:' + mp, m.x, m.y, 0, m.escala ?? 1, 0, 4.5); }
  // condena del osario: el maldito revienta al morir
  if (m.maldicion?.condena && !(m as any).usado) {
    usarCadaver(m);
    const hb = habilidadDe('condena_osario'), dh = danoHab(j, hb, Math.max(1, nivelHab(h.d, hb.id, h.c)));
    j.areas.push({ x: m.x, y: m.y, radio: 2.5, dano: [dh[0] * 0.6 + m.vidaMax * 0.15, dh[1] * 0.6 + m.vidaMax * 0.25], elem: 'fuego', t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: 'estallido_cadaver', retraso: 0.05 });
  }
  sonar(j, m.def.sonido === 'hueso' ? 'muerte_esqueleto' : m.calidad >= 3 ? 'rugido_jefe' : 'muerte_monstruo', m.x, m.y);
  // el charco crece despacio bajo el cuerpo
  const rm = (0.8 + R() * 0.8) * m.escala * ((m as any).reventado ? 1.4 : 1);
  ponerMancha(j, { x: m.x, y: m.y, r: rm * 0.25, rmax: rm, color: colorSangre(m), t: 0, tipo: 'sangre', forma: sangraHueso(m) ? undefined : 'charco', sem: Math.floor(R() * 8), pal: paletaDe(m) });
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
  const lj = legendariaJefe(m.def.id, m.nivel, cal); if (lj) caidas.push({ obj: lj });
  // equipo de Thor: collares y bardas de los únicos y los jefes
  if ((m.def.jefe && R() < 0.3) || (m.calidad >= 2 && !m.def.jefe && R() < 0.07)) caidas.push({ obj: crearObjetoThor(R() < 0.5 ? 'collar' : 'barda', m.nivel) });
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
  if (h.d.nivel >= NIVEL_MAX) return;
  h.d.xp += xp;
  while (h.d.xp >= xpPara(h.d.nivel + 1) && h.d.nivel < NIVEL_MAX) {
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
  // fogonazo en la mano del héroe (uno por cuadro aunque sea un abanico)
  const lz = de === j.heroe ? LUZ_EFECTO[efectoId]?.lanzar : undefined;
  if (lz) { const fs: any[] = ((j as any).fogonazos ??= []); if (!fs.some((f) => f.t === 0)) fs.push({ t: 0, dur: lz.cuadros / 25, r: lz.radio, k: lz.intensidad, id: efectoId }); }
  const dx = tx - de.x, dy = ty - de.y, l = Math.hypot(dx, dy) || 1;
  j.proyectiles.push({ x: de.x + (dx / l) * 0.5, y: de.y + (dy / l) * 0.5, z: 34, vx: (dx / l) * vel, vy: (dy / l) * vel, vida: o.vida ?? (g.deHeroe ? 2.2 : Math.min(2.2, 11 / vel)), dano: [g.min, g.max], elem: g.elem, deHeroe: g.deHeroe, perfora: false, explota: 0, efecto: efectoId, golpeados: new Set(), buscador: false, radio: 0.5, t: 0, fuente: g.fuente, ...o });
}

// ------------------------------------------------------------------ habilidades del héroe
export function habilidadDe(id: string): Habilidad { return id === 'ataque' ? ATAQUE : HABILIDADES.find((h) => h.id === id) ?? ATAQUE; }
export function costoMana(j: Juego, hb: Habilidad) { const n = Math.max(1, nivelHab(j.heroe.d, hb.id, j.heroe.c)); return Math.max(0, hb.mana[0] + hb.mana[1] * (n - 1)); }
export function danoHab(j: Juego, hb: Habilidad, n: number): [number, number] {
  if (!hb.dano) return [0, 0];
  const h = j.heroe;
  // nivel del héroe: el daño de la tabla es el del nivel en que se aprende y de ahí sigue la curva del arma
  let k = poderNivel(h.d.nivel) / poderNivel(hb.nivelReq);
  // nivel de la habilidad: lineal
  k *= 1 + ESCALA_HECHIZOS.lineal * hb.dano[2] * (n - 1);
  // sinergias: se suman y tienen tope
  let sin = 0;
  for (const [sid, pct] of hb.sinergias ?? []) sin += pct * (h.d.habs[sid] ?? 0);
  k *= 1 + Math.min(ESCALA_HECHIZOS.topeSinergia, sin) / 100;
  // % del elemento (pasivas, objetos) y % de daño de hechizos del equipo, sumados
  k *= 1 + ((hb.elem === 'fuego' ? h.c.fuego_pct : bono(h, hb.elem + '_pct')) + bono(h, 'dano_hechizos')) / 100;
  // resonancia: cada carga del mismo elemento suma daño
  if (h.d.clase === 'arcanista' && !CONSUME_CARGAS.has(hb.id)) { const c = h.cargas.filter((e) => e === hb.elem).length; k *= 1 + c * (6 + bono(h, 'resonancia')) / 100; }
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
  const fk = h.d.clase === 'berserker' ? 1 + (h.furia / 100) * (15 + bono(h, 'furia_dano')) / 100 : 1;
  return { min: c.dano[0] * mult * fk, max: c.dano[1] * mult * fk, elem: 'fisico', precision: c.precision, critico: c.critico, robo: c.robo_vida, aturdir: c.aturdir, aplastar: c.golpe_aplastante, herida: c.herida_abierta, lento: c.ralentizar, deHeroe: true, fuente: h, extra, arma: true };
}
/** Velocidad de ataque/lanzamiento: duración de la animación. */
export const durAtaque = (h: Heroe) => clamp(0.62 / (1 + h.c.vel_ataque / 100), 0.25, 1);
export const durLanzar = (h: Heroe) => clamp(0.6 / (1 + h.c.vel_lanzar / 100), 0.25, 1);
const rangoMelee = (h: Heroe) => (h.c.tipoArma === 'lanza' || h.c.tipoArma === 'alabarda' || h.c.tipoArma === 'guadana' ? 2.0 : 1.4);
export const esDistancia = (j: Juego, hb: Habilidad) => hb.tipo !== 'golpe' && hb.tipo !== 'salto' && hb.tipo !== 'carga' && hb.tipo !== 'torbellino' ? true : false;

/** Intenta usar una habilidad hacia (tx,ty) / objetivo. Devuelve si empezó la acción. */
/**
 * Usa una habilidad hacia (tx, ty). Con alAire (clic derecho o Shift + clic) un golpe cuerpo a cuerpo se da en el sitio:
 * le pega a quien esté al alcance hacia el cursor, o al aire si no hay nadie, sin caminar.
 */
export function usarHabilidad(j: Juego, id: string, tx: number, ty: number, obj: Monstruo | null, alAire = false): boolean {
  const h = j.heroe;
  if (h.muerto || h.acc === 'atacar' || h.acc === 'lanzar' || h.salto) return false;
  if (j.zona.tipo === 'pueblo') return false;
  const hb = habilidadDe(id);
  // el ataque básico con arco o ballesta dispara
  const basico = id === 'ataque';
  if (hb.tipo === 'pasiva') return false;
  const n = basico ? 1 : nivelHab(h.d, id, h.c);
  if (!basico && n <= 0) return false;
  // auras: solo una activa a la vez; usarla la vuelve el aura activa
  if (hb.tipo === 'aura') { if (h.d.aura !== id) { h.d.aura = id; sonar(j, 'luz'); } return false; }
  if ((h.recargas[id] ?? 0) > 0) return false;
  // requisitos de las mecánicas de clase
  if (hb.forma) {
    const ok = hb.forma === 'lobo' ? !!h.buffs.forma_lobo : hb.forma === 'oso' ? !!h.buffs.forma_oso : !!(h.buffs.forma_lobo || h.buffs.forma_oso);
    if (!ok) { aviso(j, hb.forma === 'lobo' ? ['Solo puedo hacerlo como lobo.', 'I can only do that as a wolf.'] : hb.forma === 'oso' ? ['Solo puedo hacerlo como oso.', 'I can only do that as a bear.'] : ['Tengo que estar transformado.', 'I must be transformed.']); return false; }
  }
  if (hb.furia && h.furia < hb.furia) { aviso(j, ['Necesito más furia.', 'I need more fury.'], '#ff8060'); return false; }
  if (hb.id === 'descarga_prismatica' && !h.cargas.length) { aviso(j, ['No tengo cargas guardadas.', 'I have no stored charges.'], '#c0a0ff'); return false; }
  if (hb.id === 'picada' && !mios(j, 'halcon').length) { aviso(j, ['Mi halcón no está conmigo.', 'My hawk is not with me.']); return false; }
  const conFrascos = hb.tipo === 'bomba' && h.d.clase === 'alquimista' && !h.buffs.panacea_negra;
  if (conFrascos && h.frascos < 1) { aviso(j, ['No me quedan frascos.', 'I have no flasks left.'], '#ffb040'); return false; }
  const costo = basico ? 0 : costoMana(j, hb);
  if (h.mana < costo) { if ((h.avisos.mana ?? -99) < j.t - 1.5) { h.avisos.mana = j.t; sonar(j, 'mana_falta'); msg(j, ['No tengo suficiente maná.', 'Not enough mana.'], '#8080ff'); } return false; }
  const melee = hb.tipo === 'golpe' && !(basico && h.c.distancia);
  if (melee) {
    const alcanza = (m: Monstruo) => dist(h.x, h.y, m.x, m.y) <= rangoMelee(h) + m.radio;
    if (alAire) {
      if (obj && !alcanza(obj)) obj = null;
      // sin nadie bajo el cursor: el enemigo al alcance más cercano a la dirección del cursor
      if (!obj) {
        const a0 = Math.atan2(ty - h.y, tx - h.x); let mejor = 1.1;
        for (const m of j.monstruos) {
          if (m.muerto || m.dueno || m.estado === 'surgir' || !alcanza(m)) continue;
          let da = Math.abs(Math.atan2(m.y - h.y, m.x - h.x) - a0); if (da > Math.PI) da = Math.PI * 2 - da;
          if (da < mejor) { mejor = da; obj = m; }
        }
      }
    } else {
      if (!obj) return false;
      if (!alcanza(obj)) return false;
    }
  }
  if (hb.id === 'golpe_escudo' && !h.d.equipo.izq) { aviso(j, ['Necesito un escudo.', 'I need a shield.']); return false; }
  h.mana -= costo;
  if (hb.recarga) h.recargas[id] = hb.recarga;
  if (hb.tipo === 'bomba' && h.d.clase === 'alquimista') {
    const usa = hb.id === 'gran_crisol' ? Math.floor(h.frascos) : 1;
    (h as any).frascosUsados = hb.id === 'gran_crisol' && !conFrascos ? frascosMax(h) : usa;
    if (conFrascos) h.frascos = Math.max(0, h.frascos - usa);
  }
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

/** Monje: suma un paso al combo. Devuelve true si este golpe es el remate. */
function pasoCombo(j: Juego, hb: Habilidad): boolean {
  const h = j.heroe;
  if (j.t - h.combo.t > ventanaCombo(h) && !h.buffs.loto_dorado) h.combo.paso = 0;
  h.combo.paso += hb.id === 'puno_eco' ? 2 : 1; h.combo.t = j.t;
  if (hb.id === 'puno_dios') h.combo.paso = 3;
  if (h.combo.paso >= 3) { h.combo.paso = 0; return true; }
  return false;
}
const EFECTO_REMATE: Partial<Record<Elemento, string>> = { fuego: 'explosion_fuego', frio: 'nova_escarcha', rayo: 'trueno', luz: 'castigo', fisico: 'onda_aterrizaje' };
function rematar(j: Juego, x: number, y: number, hb: Habilidad, mult: number) {
  const h = j.heroe, g = golpeArma(j, 0.6 * Math.max(1, mult));
  const veces = hb.id === 'puno_dios' ? 3 : 1;
  for (let k = 0; k < veces; k++) j.areas.push({ x, y, radio: 2.4 + k * 1.4, dano: [g.min, g.max], elem: hb.elem === 'sangre' ? 'fisico' : hb.elem, t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: EFECTO_REMATE[hb.elem] ?? 'onda_aterrizaje', retraso: 0.01 + k * 0.18 });
  j.numeros.push({ x: h.x, y: h.y, z: 80, txt: j.idi ? 'Finisher!' : '¡Remate!', color: '#ffd060', t: 0, grande: true });
  j.sacudida = Math.max(j.sacudida, 0.3);
}
// ------------------------------------------------------------------ Thor
/** Tramo de armadura de Thor (0 solo collar, 5 la barda azul y oro de la Casa GG): por nivel o por su barda propia. */
export const TRAMOS_THOR = [1, 6, 15, 30, 50, 75];
export function tramoThor(d: DatosHeroe): number {
  let t = 0; for (let i = 0; i < TRAMOS_THOR.length; i++) if (d.nivel >= TRAMOS_THOR[i]) t = i;
  return Math.max(t, d.thor?.barda ?? 0);
}
/** El sprite de Thor según su tramo; mientras no llegue el de la Forja, un lobo teñido de leonado. */
export function spriteThor(tramo: number): { sprite: string; tinte?: string; escala: number } {
  const m: any = manifiesto()?.m ?? {};
  for (const id of [`thor_${tramo}`, 'thor']) if (m[`${id}/quieto/s`]) return { sprite: id, escala: 1 };
  return { sprite: 'lobo_sombrio', tinte: '#b07838', escala: 1.05 };
}
const conCollar = (h: Heroe) => Object.values(h.d.equipo).some((o) => o && (o as any).unico === 'collar_de_thor' || (o as any)?.nombre?.[0] === 'Collar de Thor');
/** Stats de Thor: suben con el nivel del héroe, su tramo de armadura y el Collar de Thor del Legado GG. */
function statsThor(j: Juego, m: Monstruo) {
  const h = j.heroe, n = h.d.nivel, tr = tramoThor(h.d), col = conCollar(h) ? 1.3 : 1;
  const st = (id: string) => (h.d.thor?.collar?.stats ?? []).filter(([k2]) => k2 === id).reduce((a, [, v]) => a + v, 0);
  const k = (1 + tr * 0.12) * col * (1 + h.c.invocados_pct / 200);
  // después del 40 Thor escala más rápido: al 80 pega cerca de la mitad del ataque básico del héroe
  const tarde = 1 + Math.max(0, n - 40) * 0.012;
  const kd = (1 + st('thor_dano') / 100) * tarde, kv = 1 + st('thor_vida') / 100;
  const pct = m.vidaMax ? m.vida / m.vidaMax : 1;
  m.vidaMax = Math.round((70 + n * 24) * k * kv); m.vida = Math.max(1, Math.round(m.vidaMax * pct));
  m.dano = [(3 + n * 1.0) * k * kd, (5 + n * 1.7) * k * kd];
  m.vel = 5.2 * (col > 1 ? 1.1 : 1) * (1 + st('thor_vel') / 100);
  (m as any).firmaCollar = h.d.thor?.collar?.uid ?? 0;
  (m as any).nivelThor = n; (m as any).tramoThor = tr; (m as any).collarThor = col;
  const sp = spriteThor(tr); m.def = { ...m.def, sprite: sp.sprite }; m.tinte = sp.tinte; m.escala = sp.escala;
}
function crearThor(j: Juego): Monstruo {
  const h = j.heroe, sp = spriteThor(tramoThor(h.d));
  const base = MONSTRUOS.lobo_sombrio;
  const def: DefMonstruo = { ...base, id: 'thor', sprite: sp.sprite, nombre: ['Thor', 'Thor'], vida: 70, dano: [4, 8], vel: 5.2, ia: 'normal', xp: 0, jefe: false, res: {} };
  const q = libreCerca(j.zona, h.x + 1, h.y + 1);
  const m = crearMonstruo(def, h.d.nivel, q[0] + 0.5, q[1] + 0.5, 0, 0);
  m.tipo = 'invocado'; m.dueno = true; m.invocaId = 'thor'; m.estado = 'deambular';
  m.vidaMax = 0; statsThor(j, m); m.vida = m.vidaMax;
  (m as any).cdLadrido = 4;
  j.monstruos.push(m);
  return m;
}
export const thorDe = (j: Juego) => j.monstruos.find((m) => m.dueno && m.invocaId === 'thor' && !m.muerto) ?? null;
/** Cada cuadro: que Thor esté, que suba con el héroe, que vuelva tras descansar, y su ladrido protector. */
function actualizarThor(j: Juego, dt: number) {
  const h = j.heroe; const t = (h.d.thor ??= {});
  if (t.descanso && t.descanso > 0) { t.descanso -= dt; if (j.zona.tipo === 'pueblo') t.descanso = 0; if (t.descanso > 0) return; }
  let m = thorDe(j);
  if (!m) { if (h.muerto) return; m = crearThor(j); efecto(j, 'circulo_invocacion', m.x, m.y, 0, 0.6); return; }
  if ((m as any).nivelThor !== h.d.nivel || (m as any).tramoThor !== tramoThor(h.d) || (m as any).collarThor !== (conCollar(h) ? 1.3 : 1) || (m as any).firmaCollar !== (h.d.thor?.collar?.uid ?? 0)) statsThor(j, m);
  // ladrido protector: escudo para el héroe cuando está en apuros o rodeado
  (m as any).cdLadrido -= dt;
  if ((m as any).cdLadrido <= 0 && !h.muerto) {
    const cerca = j.monstruos.filter((o) => !o.muerto && !o.dueno && dist(o.x, o.y, h.x, h.y) < 6).length;
    if (h.vida < h.vidaMax * 0.5 || cerca >= 3) {
      (m as any).cdLadrido = 14;
      const escudo = Math.round(h.vidaMax * (0.12 + tramoThor(h.d) * 0.02) * ((m as any).collarThor ?? 1));
      h.escudoHueso = Math.max(h.escudoHueso, escudo);
      const conEsp = !!(manifiesto() as any)?.m?.[`${m.def.sprite}/especial/s`];
      if (conEsp) { m.acc = 'especial' as any; m.t = 0; m.dur = 0.9; }
      efecto(j, 'grito_guerra', m.x, m.y, 0, 1.1);
      j.numeros.push({ x: m.x, y: m.y, z: 60, txt: j.idi ? 'Woof!' : '¡Guau!', color: '#9ec8ff', t: 0, grande: true });
      sonar(j, 'grunido', m.x, m.y, 0.8);
    } else (m as any).cdLadrido = 1;
  }
}

/**
 * Thor sigue al héroe sin trabarse: arranca a más de 3.2 celdas y frena a menos de 2.2 (histéresis), con al menos 0.2 s en cada
 * estado; la velocidad sube y baja suave (~0.25 s); va a un punto detrás y a un lado del héroe, rodeando obstáculos con el mismo
 * camino que los monstruos; y la dirección solo cambia si el rumbo pasa el sector vecino por más de 8°.
 */
function seguirThor(j: Juego, m: Monstruo, dh: number, dt: number) {
  const h = j.heroe, t = m as any;
  t.tEst = (t.tEst ?? 0) + dt; t.vAct ??= 0; t.lado ??= m.id % 2 ? 1 : -1;
  // a dónde ir: detrás del héroe según hacia dónde mira (o hacia dónde camina), y un poco a su lado
  const [fx, fy] = DIR_VEC[h.dir] ?? [0, 1];
  const tx0 = h.x - fx * 1.7 + -fy * t.lado * 1.0, ty0 = h.y - fy * 1.7 + fx * t.lado * 1.0;
  // el punto se mueve suave (~0.4 s): si el héroe se da vuelta, Thor no lo rodea dando tumbos
  const [px0, py0] = pasable(j.zona, tx0, ty0) ? [tx0, ty0] : [h.x, h.y];
  t.ptx ??= px0; t.pty ??= py0; const kp = Math.min(1, dt / 0.4); t.ptx += (px0 - t.ptx) * kp; t.pty += (py0 - t.pty) * kp;
  const [tx, ty] = pasable(j.zona, t.ptx, t.pty) ? [t.ptx, t.pty] : [px0, py0];
  const dObj = Math.hypot(tx - m.x, ty - m.y);
  if (!t.sigue && dh > 3.2 && t.tEst > 0.2) { t.sigue = true; t.tEst = 0; }
  else if (t.sigue && (dh < 2.2 || dObj < 0.4) && t.tEst > 0.2) { t.sigue = false; t.tEst = 0; }
  if (dh > 20) { const q = libreCerca(j.zona, tx, ty); m.x = q[0] + 0.5; m.y = q[1] + 0.5; t.vAct = 0; t.camino = null; return; }
  const galopa = h.acc === 'correr' || dh > 7;
  const vDes = t.sigue ? m.vel * (dh > 6 ? 1.75 : galopa ? 1.45 : 1.1) : 0;
  t.vAct += (vDes - t.vAct) * Math.min(1, dt / 0.25);
  if (t.vAct < 0.05 && !t.sigue) { t.vAct = 0; if ((m.acc === 'caminar' || (m.acc as string) === 'correr') && t.tEst > 0.2) m.acc = 'quieto'; return; }
  // rodear: si no hay línea libre, el camino de los monstruos (se recalcula cada medio segundo)
  let gx = tx, gy = ty;
  if (!lineaLibre(j.zona, m.x, m.y, tx, ty)) {
    t.tCam = (t.tCam ?? 0) - dt;
    if (!t.camino || t.tCam <= 0) { t.camino = buscarCamino(j.zona, m.x, m.y, tx, ty, 1500); t.tCam = 0.5; }
    while (t.camino?.length && Math.hypot(t.camino[0][0] + 0.5 - m.x, t.camino[0][1] + 0.5 - m.y) < 0.5) t.camino.shift();
    if (t.camino?.length) { gx = t.camino[0][0] + 0.5; gy = t.camino[0][1] + 0.5; }
  } else t.camino = null;
  const dirAntes = m.dir;
  moverHacia(j, m, gx, gy, t.vAct, dt);
  // dirección con histéresis: el rumbo tiene que pasarse del sector actual en más de 8°
  const ang = Math.atan2(gy - m.y, gx - m.x), [cx, cy] = DIR_VEC[dirAntes] ?? [0, 1];
  let dif = Math.abs(ang - Math.atan2(cy, cx)); if (dif > Math.PI) dif = Math.PI * 2 - dif;
  m.dir = dif > (22.5 + 8) * Math.PI / 180 ? dirDe(gx - m.x, gy - m.y) : dirAntes;
  const acc = galopa ? 'correr' : 'caminar';
  if (m.acc !== acc && (t.tEst > 0.2 || m.acc === 'quieto')) { m.acc = acc as any; }
}

/** Invoca un aliado. tVida: si es temporal (no cuenta para el máximo). */
function crearInvocado(j: Juego, invId: string, n: number, x: number, y: number, tVida?: number, extra = 1): Monstruo | null {
  const h = j.heroe, inv = INVOCADOS[invId]; if (!inv) return null;
  if (!pasable(j.zona, x, y)) { const q = libreCerca(j.zona, x, y); x = q[0] + 0.5; y = q[1] + 0.5; }
  const kk = (1 + n * 0.15) * (1 + h.c.invocados_pct / 100) * extra;
  const def: DefMonstruo = { ...(MONSTRUOS[inv.sprite] ?? MONSTRUOS.esqueleto), id: invId, sprite: inv.sprite, vida: inv.vida, dano: inv.dano, vel: inv.vel, ia: inv.distancia ? 'distancia' : 'normal', proyectil: inv.proyectil, rango: inv.distancia ? 7 : undefined, elem: (inv.elem as Elemento) ?? 'fisico', tinte: inv.tinte, escala: inv.escala, res: {}, xp: 0, jefe: false };
  const m = crearMonstruo(def, h.d.nivel, x, y, 0, 0);
  m.tipo = 'invocado'; m.dueno = true; m.invocaId = invId; m.estado = 'deambular';
  m.vidaMax = m.vida = Math.round(inv.vida * kk * (1 + h.d.nivel * 0.12)); m.dano = [inv.dano[0] * kk * danoInvocadoNivel(h.d.nivel), inv.dano[1] * kk * danoInvocadoNivel(h.d.nivel)];
  m.tinte = inv.tinte; m.escala = inv.escala ?? 1; m.tVida = tVida;
  j.monstruos.push(m);
  efecto(j, 'circulo_invocacion', x, y, 0, 0.8);
  return m;
}
const golpeSimple = (j: Juego, d: [number, number], elem: Elemento): Golpe => ({ min: d[0], max: d[1], elem, deHeroe: true, fuente: j.heroe, sinFallo: true });
const enRadio = (j: Juego, x: number, y: number, r: number) => enemigosDe(j, true).filter((e) => dist(e.x, e.y, x, y) <= r + e.radio) as Monstruo[];
const esJefe = (e: Ent) => !!(e as Monstruo).def?.jefe;

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
  const reembolso = () => { h.mana += costoMana(j, hb); if (hb.recarga) h.recargas[hb.id] = 0; };
  // gritos del berserker: dan furia
  if (h.d.clase === 'berserker' && hb.rama === 1 && !basico) ganarFuria(j, 12 + bono(h, 'furia_grito'));
  switch (hb.tipo) {
    case 'golpe': {
      if (basico && h.c.distancia) { const g = golpeArma(j, 1); disparar(j, h, tx, ty, g, h.c.tipoArma === 'ballesta' ? 'virote' : 'flecha', 16, { perfora: R() * 100 < h.c.perforar }); break; }
      if (!obj || obj.muerto) break;
      const remate = h.d.clase === 'monje' && pasoCombo(j, hb);
      const kRem = remate ? 1.5 + bono(h, 'combo_pct') / 100 : 1;
      const kFur = hb.id === 'ejecucion' ? 1 + h.furia / 100 : 1;
      let total = 0;
      for (let k = 0; k < golpes; k++) {
        const g = golpeArma(j, mult * kRem * kFur, hb.elem !== 'fisico' ? hb.elem : undefined, hb.dano ? dh : undefined);
        if (prec) g.precision! += prec;
        if (hb.bonos?.aturdir) g.aturdir = 100;
        if (hb.bonos?.empuje) g.empuje = 1;
        if (hb.id === 'ejecucion' && obj.vida < obj.vidaMax * 0.25 && obj.calidad < 3) { g.min *= 3; g.max *= 3; }
        const d = danar(j, obj, g);
        total += d;
        if (d > 0) ganarFuria(j, 5);
        if (R() < 0.04) desgastar(j, 'arma');
        if (d > 0 && h.c.vivo) particulas(j, obj.x, obj.y, 8, h.c.vivo === 'fuego' ? 'brasa' : 'chispa', COLOR_ELEM[h.c.vivo], 1.2, 40);
      }
      if (hb.bonos?.robo_golpe && total > 0) h.vida = Math.min(h.vidaMax, h.vida + total * val(hb.bonos.robo_golpe, n) / 100);
      if (hb.id === 'corte_sello' && total > 0) { h.buffs.aura_avivada = { t: val(hb.duracion, n), bonos: { potencia_aura: val(hb.bonos?.potencia_aura, n) }, hab: 'corte_sello' }; recalc(j); }
      if (!basico && hb.efecto) efecto(j, efectoDe(hb.efecto, hb.elem, hb), obj.x, obj.y, efectoDir);
      if (hb.explota) { j.areas.push({ x: obj.x, y: obj.y, radio: hb.explota, dano: [dh[0] * kRem, dh[1] * kRem], elem: hb.elem, t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: '', retraso: 0 }); efecto(j, hb.elem === 'luz' ? 'castigo' : hb.elem === 'rayo' ? 'trueno' : hb.elem === 'fisico' ? 'onda_aterrizaje' : 'explosion_fuego', obj.x, obj.y, 0, hb.explota / 2); }
      if (remate) rematar(j, obj.x, obj.y, hb, mult);
      break;
    }
    case 'proyectil': {
      const base = Math.atan2(ty - h.y, tx - h.x);
      if (hb.id === 'descarga_prismatica') {
        const cs = gastarCargas(h);
        const k = 1 + cs.length * 0.25;
        cs.forEach((e, i) => {
          const a = base + (i - (cs.length - 1) / 2) * 0.22;
          disparar(j, h, h.x + Math.cos(a) * 5, h.y + Math.sin(a) * 5, golpeSimple(j, [dh[0] * k, dh[1] * k], e), e === 'fuego' ? 'bola_fuego' : e === 'frio' ? 'saeta_hielo' : 'chispa_cargada', 12, { explota: hb.explota ?? 0, hab: hb, nivelHab: n, vida: 1.6 });
        });
        efecto(j, 'destello_teleporte', h.x, h.y, 0, 0.7);
        break;
      }
      const cnt = golpes;
      const circ = !!hb.circulo;
      const abanico = circ ? Math.PI * 2 : cnt > 1 ? Math.min(hb.id === 'tormenta_virotes' ? 1.6 : 1.2, 0.18 * cnt) : 0;
      // con un abanico contra un jefe grande todas las flechas le daban al mismo: ahora la primera pega entera y las demás al 60 %
      const salva = cnt > 1 && !circ && !hb.buscador ? new Map<number, number>() : undefined;
      for (let k = 0; k < cnt; k++) {
        const a = cnt === 1 ? base : circ ? base + (k / cnt) * Math.PI * 2 : base - abanico / 2 + (abanico * k) / (cnt - 1);
        const g: Golpe = hb.mult ? golpeArma(j, mult, hb.elem !== 'fisico' ? hb.elem : undefined, hb.dano ? dh : undefined) : { min: dh[0], max: dh[1], elem: hb.elem, deHeroe: true, fuente: h, sinFallo: true };
        if (prec && g.precision !== undefined) g.precision += prec;
        disparar(j, h, h.x + Math.cos(a) * 5, h.y + Math.sin(a) * 5, g, efectoDe(hb.efecto, hb.elem, hb, true), hb.vel ?? 12, { perfora: !!hb.perfora || R() * 100 < h.c.perforar, explota: hb.explota ?? 0, buscador: !!hb.buscador, hab: hb, nivelHab: n, vida: hb.id === 'martillo_bendito' ? 2.4 : hb.id === 'orbe_glacial' ? 1.4 : 1.6, rebota: hb.id === 'chispa' ? 1 : 0, salva });
      }
      break;
    }
    case 'nova': {
      const r = hb.radio ?? 4;
      let d0: [number, number] = dh, congela = 0;
      if (hb.mult) { const fu = h.furia; h.furia = 0; const g = golpeArma(j, mult * (1 + fu / 50)); d0 = [g.min, g.max]; }
      if (hb.id === 'edad_hielo') { const u = gastarCargas(h, 'frio').length; d0 = [d0[0] * (1 + 0.35 * u), d0[1] * (1 + 0.35 * u)]; congela = 2 + 0.6 * u; }
      efecto(j, efectoDe(hb.efecto, hb.elem, hb), h.x, h.y, 0, r / 4);
      let total = 0;
      for (const e of enRadio(j, h.x, h.y, r)) {
        total += danar(j, e, { ...golpeSimple(j, d0, hb.elem), aturdir: hb.bonos?.aturdir ? 60 : 0 });
        if (congela && !esJefe(e)) e.congelado = congela;
        if (hb.id === 'canto_invierno' && !esJefe(e)) e.miedo = val(hb.duracion, n);
      }
      if (hb.id === 'rio_carmesi') h.vida = Math.min(h.vidaMax, h.vida + Math.min(total * 0.4, h.vidaMax * 0.5));
      if (hb.id === 'canto_invierno') ganarFuria(j, 100);
      if (hb.id === 'rugido_primigenio') { for (const m of mios(j)) m.vida = Math.min(m.vidaMax, m.vida + m.vidaMax * 0.3); h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * 0.15); }
      if (hb.elem === 'sangre') particulas(j, h.x, h.y, 24, 'sangre', '#a00810', 2, 20);
      j.sacudida = Math.max(j.sacudida, hb.definitiva ? 0.6 : 0.2);
      break;
    }
    case 'area': {
      const r = hb.radio ?? 3;
      let ax = tx, ay = ty;
      if (dist(ax, ay, h.x, h.y) > 12) { const a = Math.atan2(ty - h.y, tx - h.x); ax = h.x + Math.cos(a) * 12; ay = h.y + Math.sin(a) * 12; }
      if (hb.enHeroe) { ax = h.x; ay = h.y; }
      const dur = val(hb.duracion, n) || 0.1;
      const golpeArea = (x: number, y: number, rr: number, d: [number, number], ef: string, retraso: number, elem: Elemento = hb.elem, caida = false) => j.areas.push({ x, y, radio: rr, dano: d, elem, t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: ef, retraso, caida });
      // ---- cadáveres
      if (hb.id === 'explosion_cadaver') {
        const cad = cadaveresCerca(j, ax, ay, 4)[0];
        if (!cad) { aviso(j, ['No hay un cadáver cerca.', 'No corpse nearby.']); reembolso(); break; }
        usarCadaver(cad);
        const k = cad.vidaMax * 0.5;
        golpeArea(cad.x, cad.y, r, [dh[0] + k * 0.6, dh[1] + k], '', 0, 'fuego');
        efecto(j, 'estallido_cadaver', cad.x, cad.y, 0, 1.2); particulas(j, cad.x, cad.y, 30, 'sangre', '#700808', 2.2); j.sacudida = 0.3;
        break;
      }
      if (hb.id === 'cosecha_osario') {
        const cads = cadaveresCerca(j, ax, ay, 6).slice(0, Math.round(val(hb.n, n)));
        if (!cads.length) { aviso(j, ['No hay cadáveres cerca.', 'No corpses nearby.']); reembolso(); break; }
        cads.forEach((cad, i) => { usarCadaver(cad); const k = cad.vidaMax * 0.4; golpeArea(cad.x, cad.y, r, [dh[0] + k * 0.6, dh[1] + k], 'estallido_cadaver', 0.01 + i * 0.22, 'fuego'); particulas(j, cad.x, cad.y, 16, 'sangre', '#700808', 1.8); });
        j.sacudida = 0.4;
        break;
      }
      if (hb.id === 'lamento_osario') {
        cadaveresCerca(j, h.x, h.y, r).forEach((cad, i) => { usarCadaver(cad); golpeArea(cad.x, cad.y, 2.5, dh, 'prision_hueso', 0.01 + i * 0.08); });
        const cn = Math.round(val(hb.n, n));
        for (let k = 0; k < cn; k++) { const a = (k / cn) * Math.PI * 2; disparar(j, h, h.x + Math.cos(a) * 5, h.y + Math.sin(a) * 5, golpeSimple(j, [dh[0] * 0.5, dh[1] * 0.5], 'sombra'), 'lanza_hueso', 13, { perfora: true, vida: 1.2 }); }
        efecto(j, 'llanto_animas', h.x, h.y, 0, 1.3);
        j.sacudida = 0.5;
        break;
      }
      if (hb.id === 'festin_tumba') {
        const cad = cadaveresCerca(j, ax, ay, 4)[0];
        if (!cad) { aviso(j, ['No hay un cadáver cerca.', 'No corpse nearby.']); reembolso(); break; }
        usarCadaver(cad);
        h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * val(hb.bonos?.cura_pct, n) / 100);
        h.mana = Math.min(h.c.manaMax, h.mana + h.c.manaMax * val(hb.bonos?.mana_pct_cura, n) / 100);
        efecto(j, 'estallido_cadaver', cad.x, cad.y, 0, 0.6); efecto(j, 'chispas_curacion', h.x, h.y);
        particulas(j, cad.x, cad.y, 14, 'sangre', '#600808', 1.2);
        break;
      }
      if (hb.id === 'ofrenda') {
        const ms = mios(j).filter((m) => dist(m.x, m.y, ax, ay) < 5);
        if (!ms.length) { aviso(j, ['No tengo siervos cerca de ahí.', 'I have no servants near there.']); reembolso(); break; }
        ms.forEach((m, i) => { golpeArea(m.x, m.y, r, [dh[0] + m.vidaMax * 0.3, dh[1] + m.vidaMax * 0.5], 'estallido_cadaver', 0.01 + i * 0.12, 'sombra'); m.vida = 0; m.muerto = true; m.acc = 'morir'; m.t = 0; m.tMuerto = 0; });
        j.sacudida = 0.4;
        break;
      }
      // ---- halcón
      if (hb.id === 'picada') {
        const hal = mios(j, 'halcon')[0];
        if (hal) { hal.x = ax; hal.y = ay; }
        efecto(j, 'tajo_garras', ax, ay, 0, 1.3);
        for (const e of enRadio(j, ax, ay, r)) { danar(j, e, golpeSimple(j, dh, 'fisico')); e.marca = Math.max(e.marca ?? 0, 6); }
        break;
      }
      // ---- cargas del arcanista
      if (hb.id === 'meteoro' || hb.id === 'sol_negro') {
        let d = dh;
        if (hb.id === 'sol_negro') { const u = gastarCargas(h, 'fuego').length; d = [dh[0] * (1 + 0.35 * u), dh[1] * (1 + 0.35 * u)]; }
        j.areas.push({ x: ax, y: ay, radio: r, dano: d, elem: 'fuego', t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: 'meteoro', retraso: 0.9, caida: true });
        j.areas.push({ x: ax, y: ay, radio: r * 0.8, dano: [d[0] * 0.15, d[1] * 0.15], elem: 'fuego', t: 0, dur, tick: 0.5, prox: 0, deHeroe: true, efecto: 'crater_ardiente', retraso: 1.0 });
        efecto(j, 'meteoro', ax, ay, 0, hb.id === 'sol_negro' ? 1.8 : 1.3, 0, 1.2);
        if (hb.id === 'sol_negro') efecto(j, 'lluvia_brasas', ax, ay, 0, 1.4, 0, 1.8);
        break;
      }
      if (hb.id === 'furia_firmamento') {
        const u = gastarCargas(h, 'rayo').length;
        const cn = Math.round(val(hb.n, n)) + u * 3;
        const blancos = enRadio(j, h.x, h.y, r);
        for (let k = 0; k < cn; k++) {
          const e = blancos.length ? blancos[k % blancos.length] : null;
          const a = R() * Math.PI * 2, rr = R() * r * 0.7;
          golpeArea(e ? e.x : h.x + Math.cos(a) * rr, e ? e.y : h.y + Math.sin(a) * rr, 1.4, dh, 'relampago', 0.05 + k * 0.1, 'rayo');
        }
        sonar(j, 'trueno'); j.sacudida = 0.5;
        break;
      }
      if (hb.id === 'lluvia_flechas') { const g = golpeArma(j, mult); j.areas.push({ x: ax, y: ay, radio: r, dano: [g.min * 0.5, g.max * 0.5], elem: 'fisico', t: 0, dur, tick: 0.3, prox: 0.2, deHeroe: true, efecto: 'lluvia_flechas', retraso: 0.2 }); break; }
      // ---- varios golpes repartidos (columnas, rayos, rocas)
      if (hb.n) {
        const cn = Math.round(val(hb.n, n));
        const roca = hb.efecto === 'meteoro';
        for (let k = 0; k < cn; k++) {
          const a = R() * Math.PI * 2, rr = R() * r * 0.85;
          golpeArea(ax + Math.cos(a) * rr, ay + Math.sin(a) * rr, roca ? 2 : 1.6, dh, roca ? 'crater_ardiente' : efectoDe(hb.efecto, hb.elem, hb), (roca ? 0.4 : 0.05) + k * (roca ? 0.25 : 0.15), hb.elem, roca);
        }
        break;
      }
      // el cerco de llamas del arcanista: anillo de fuego de Doom, y con 10 puntos o más el muro del infierno
      const efA = hb.id === 'muro_fuego' ? (n >= 10 ? 'muro_infierno' : 'cerco_llamas') : efectoDe(hb.efecto, hb.elem, hb);
      j.areas.push({ x: ax, y: ay, radio: r, dano: [dh[0] / Math.max(1, dur * 2), dh[1] / Math.max(1, dur * 2)], elem: hb.elem, t: 0, dur, tick: 0.5, prox: 0, deHeroe: true, efecto: efA, retraso: 0.1 });
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
      const invId = hb.invoca!; if (!INVOCADOS[invId]) break;
      // temporales: marcha de la fosa, legión de la ceniza, despertar del bosque
      if (hb.id === 'marcha_fosa') {
        const cads = cadaveresCerca(j, tx, ty, hb.radio ?? 6).slice(0, Math.floor(val(hb.max, n)));
        if (!cads.length) { aviso(j, ['No hay cadáveres cerca.', 'No corpses nearby.']); reembolso(); break; }
        cads.forEach((cad, i) => { usarCadaver(cad); crearInvocado(j, i % 2 ? 'arquero' : 'esqueleto', n, cad.x, cad.y, val(hb.duracion, n)); });
        break;
      }
      if (hb.id === 'legion_ceniza') {
        const cn = Math.floor(val(hb.max, n));
        for (let k = 0; k < cn; k++) { const a = (k / cn) * Math.PI * 2; crearInvocado(j, k % 2 ? 'arquero' : 'esqueleto', n, h.x + Math.cos(a) * 2, h.y + Math.sin(a) * 2, val(hb.duracion, n), 1.5); }
        j.sacudida = 0.4;
        break;
      }
      if (hb.id === 'despertar_bosque') {
        for (const m of mios(j, 'arbol')) { m.vida = 0; m.muerto = true; m.acc = 'morir'; m.t = 0; }
        crearInvocado(j, 'arbol', n, tx, ty, val(hb.duracion, n), 1.3);
        efecto(j, 'estallido_enredaderas', h.x, h.y, 0, 2);
        for (const e of enRadio(j, h.x, h.y, hb.radio ?? 6)) { if (!esJefe(e)) e.congelado = 1.5; e.maldicion = { amplificar: 0, debilitar: 0, lento: 60, t: 6, res: 0 }; }
        break;
      }
      const max = Math.max(1, Math.floor(val(hb.max, n)));
      const fijos = mios(j, invId).filter((m) => m.tVida === undefined);
      let x = tx, y = ty;
      if (hb.id === 'alzar_esqueleto' || hb.id === 'mago_hueso') {
        const cad = cadaveresCerca(j, tx, ty, 5)[0];
        if (!cad) { aviso(j, ['Necesito un cadáver.', 'I need a corpse.']); reembolso(); break; }
        usarCadaver(cad); x = cad.x; y = cad.y;
      }
      if (hb.id === 'llamar_halcon') { x = h.x + 0.5; y = h.y + 0.5; }
      if (fijos.length >= max) { const viejo = fijos[0]; viejo.vida = 0; viejo.muerto = true; viejo.acc = 'morir'; viejo.t = 0; }
      crearInvocado(j, invId, n, x, y);
      break;
    }
    case 'buff': {
      const dur = val(hb.duracion, n);
      const bonos: Record<string, number> = {};
      for (const [k, b] of Object.entries(hb.bonos ?? {})) bonos[k] = val(b, n);
      if (hb.id === 'armadura_hueso') { h.escudoHueso = bonos.escudo_hueso ?? 20; }
      if (hb.id === 'tempestad') h.tempestad = dur;
      if (bonos.huracan) { h.huracan = dur; h.huracanHab = hb.id; }
      if (hb.id === 'forma_lobo') delete h.buffs.forma_oso;
      if (hb.id === 'forma_oso') delete h.buffs.forma_lobo;
      if (bonos.cura_pct) { h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * bonos.cura_pct / 100); delete bonos.cura_pct; particulas(j, h.x, h.y, 12, 'chispa', '#80ff90', 0.6, 40); }
      if (hb.id === 'destilar') h.frascos = frascosMax(h);
      if (hb.id === 'ira_jarl') {
        const g = golpeArma(j, mult);
        for (const e of enRadio(j, h.x, h.y, hb.radio ?? 4.5)) danar(j, e, { ...g, sinFallo: true, aturdir: 50 });
        h.furia = 100; h.furiaFija = dur; h.tCombate = j.t;
        efecto(j, 'onda_aterrizaje', h.x, h.y, 0, 2); j.sacudida = 0.7; sonar(j, 'golpe_metal');
      }
      if ((hb.id === 'coro_sellos' || hb.id === 'ascenso_espiritu') && hb.dano) {
        for (const e of enRadio(j, h.x, h.y, hb.radio ?? 6)) danar(j, e, golpeSimple(j, dh, 'luz'));
        efecto(j, 'pilar_luz', h.x, h.y, 0, 1.4); efecto(j, 'castigo', h.x, h.y, 0, 2); j.sacudida = 0.4;
      }
      if (hb.id === 'caceria_salvaje') for (const e of enRadio(j, h.x, h.y, hb.radio ?? 9)) e.marca = Math.max(e.marca ?? 0, dur);
      h.buffs[hb.id] = { t: dur, bonos, hab: hb.id };
      efecto(j, efectoDe(hb.efecto, hb.elem, hb), h.x, h.y, 0, 1);
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
      const r = hb.radio ?? 3, dur = val(hb.duracion, n) * (1 + bono(h, 'maldicion_dur') / 100);
      const cx = hb.enHeroe ? h.x : tx, cy = hb.enHeroe ? h.y : ty;
      const ef = hb.efecto === 'raices' ? 'estallido_enredaderas' : hb.elem === 'frio' ? 'nova_escarcha' : hb.elem === 'veneno' ? 'nube_veneno' : hb.efecto === 'onda' ? 'grito_guerra' : 'prision_hueso';
      efecto(j, ef, cx, cy, 0, r / 3);
      const b = hb.bonos ?? {};
      const maldice = !!(b.amplificar || b.debilitar || b.lento || b.res || b.sifon || b.condena);
      for (const e of enRadio(j, cx, cy, r)) {
        const m = e;
        if (b.marca) m.marca = Math.max(m.marca ?? 0, val(b.marca, n));
        if (b.congelar && !esJefe(m)) m.congelado = Math.max(m.congelado, val(hb.duracion, n));
        if (maldice) m.maldicion = { amplificar: val(b.amplificar, n), debilitar: val(b.debilitar, n), lento: val(b.lento, n), t: dur, res: -val(b.res, n), sifon: b.sifon ? val(b.sifon, n) : undefined, condena: !!b.condena };
        if (b.miedo && !esJefe(m)) m.miedo = dur;
        if (hb.dano) danar(j, m, golpeSimple(j, dh, hb.elem));
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
      const usados = (h as any).frascosUsados ?? 1;
      let d = dh, radio = (hb.radio ?? 2) * (1 + bono(h, 'bomba_radio') / 100);
      if (hb.id === 'gran_crisol') { d = [dh[0] * (1 + 0.25 * usados), dh[1] * (1 + 0.25 * usados)]; radio *= 1 + 0.06 * usados; }
      j.proyectiles.push({ x: h.x, y: h.y, z: 30, vx: 0, vy: 0, vida: 9, dano: d, elem: hb.elem, deHeroe: true, perfora: false, explota: radio, efecto: 'frasco', golpeados: new Set(), buscador: false, radio: 0.4, t: 0, arco: { x0: h.x, y0: h.y, x1: tx, y1: ty, t: 0, T: 0.6, n: hb.id === 'bomba_cluster' ? Math.round(val(hb.n, n)) : 0 }, hab: hb, nivelHab: n });
      break;
    }
    case 'trampa': {
      const minaR = hb.explota;
      const nueva = (x: number, y: number, elem: Elemento = hb.elem, ef = efectoDe(hb.efecto, hb.elem, hb)): Torreta => ({ x, y, t: 0, dur: val(hb.duracion, n), dano: dh, cd: 0.5, hab: hb.id, elem, mina: minaR, raiz: !!hb.bonos?.congelar, efecto: ef });
      if (hb.id === 'coto_caza') {
        j.torretas = j.torretas.filter((t) => t.hab !== hb.id);
        const cn = Math.round(val(hb.n, n));
        for (let k = 0; k < cn; k++) { const a = (k / cn) * Math.PI * 2; let x = tx + Math.cos(a) * 2.6, y = ty + Math.sin(a) * 2.6; if (!pasable(j.zona, x, y)) { const q = libreCerca(j.zona, x, y); x = q[0] + 0.5; y = q[1] + 0.5; } j.torretas.push(nueva(x, y, k % 2 ? 'rayo' : 'fuego', k % 2 ? 'campo_estatico' : 'explosion_fuego')); efecto(j, 'glifo_trampa', x, y, 0, 0.7); }
        break;
      }
      const max = Math.floor(val(hb.max, n)) || 1;
      const propias = j.torretas.filter((t) => (t.hab ?? 'torreta') === hb.id);
      if (propias.length >= max) j.torretas.splice(j.torretas.indexOf(propias[0]), 1);
      j.torretas.push(nueva(tx, ty));
      efecto(j, 'glifo_trampa', tx, ty);
      break;
    }
    case 'cuervos': {
      const cn = Math.round(val(hb.n, n));
      for (let k = 0; k < cn; k++) j.cuervos.push({ x: h.x, y: h.y, t: 0, dur: val(hb.duracion, n), dano: dh, objetivo: null, ang: (k / cn) * Math.PI * 2, marca: hb.id === 'cielo_halcones' });
      break;
    }
  }
  // arcanista: cada hechizo de fuego, escarcha o rayo guarda una carga
  if (h.d.clase === 'arcanista' && !basico && hb.anim === 'lanzar' && (hb.elem === 'fuego' || hb.elem === 'frio' || hb.elem === 'rayo') && !CONSUME_CARGAS.has(hb.id)) {
    h.cargas.push(hb.elem); if (h.cargas.length > MAX_CARGAS) h.cargas.shift();
  }
}
const EFECTOS: Record<string, string> = {
  fuego: 'saeta_fuego', fuego_grande: 'bola_fuego', hielo: 'saeta_hielo', orbe_hielo: 'saeta_hielo', chispa: 'chispa_cargada', rayo: 'relampago', hueso: 'lanza_hueso',
  luz: 'castigo', columna_luz: 'pilar_luz', veneno: 'nova_veneno', nube_veneno: 'nube_veneno', flecha: 'flecha', virote: 'virote', llamas_suelo: 'muro_llamas', ventisca: 'ventisca',
  nova_hielo: 'nova_escarcha', nova_viento: 'tornado', onda: 'grito_guerra', polvo: 'onda_aterrizaje', tajo: 'chispas_carne', sangre: 'salpicadura_sangre', meteoro: 'meteoro',
  martillo: 'castigo', jabalina: 'chispa_cargada', viento: 'tornado', tornado: 'tornado', torbellino: 'torbellino', cadaver: 'estallido_cadaver', invocar: 'circulo_invocacion',
  aura_roja: 'aura_furia', aura_azul: 'escudo_divino', aura_gris: 'escudo_divino', aura_verde: 'chispas_curacion', aura_fuego: 'aura_furia', aura_morada: 'aura_sagrada', huesos_giran: 'prision_hueso', raices: 'estallido_enredaderas',
  maldicion: 'maldicion_sombra', lluvia_flechas: 'lluvia_flechas', cuervos: 'tajo_garras',
};
export function efectoDe(e: string, elem: Elemento, hb?: Habilidad, proyectil = false): string {
  if (hb?.id === 'marea_roja' || hb?.id === 'rio_carmesi') return 'nova_sangre';
  // proyectiles de luz o martillo y de veneno: las saetas nuevas de la Forja
  if (proyectil && (e === 'luz' || e === 'martillo')) return 'saeta_sagrada';
  if (proyectil && e === 'veneno') return 'saeta_veneno';
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
  { const fs: any[] = (j as any).fogonazos; if (fs?.length) { for (const f of fs) f.t += dt; (j as any).fogonazos = fs.filter((f) => f.t < f.dur); } }
  j.t += dt;
  const h = j.heroe;
  actualizarHeroe(j, dt);
  actualizarThor(j, dt);
  for (const m of j.monstruos) actualizarMonstruo(j, m, dt);
  // charcos que crecen bajo los muertos y rastro de sangre del que huye herido
  for (const mc of j.manchas) { if (mc.forma === 'charco' && mc.t < 10) mc.t += dt; if (mc.rmax && mc.r < mc.rmax) mc.r = Math.min(mc.rmax, mc.r + (mc.rmax - mc.r) * dt * 0.45 + dt * 0.02); }
  // pedazos que vuelan: gravedad, giro (8 cuadros por vuelta) y salpicadura donde caen; se van a los 20-40 s
  const gibs: Gib[] | undefined = (j as any).gibs;
  if (gibs?.length) {
    for (const g of gibs) {
      g.t += dt;
      if (g.quieto) continue;
      g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; g.vz -= 420 * dt; g.ang += g.va * dt;
      if (!pasable(j.zona, g.x, g.y)) { g.vx *= -0.3; g.vy *= -0.3; g.x += g.vx * dt * 2; g.y += g.vy * dt * 2; }
      if (g.z <= 0) {
        g.z = 0;
        if (Math.abs(g.vz) > 60) { ponerMancha(j, { x: g.x, y: g.y, r: 0.35 + R() * 0.3, color: g.pal === 'no_muerto' ? '#2a2a20' : g.pal === 'bestia' ? '#2a4a10' : '#6a0a0a', t: 0, tipo: 'sangre', forma: 'salpicadura', ang: Math.atan2(g.vy, g.vx), sem: Math.floor(R() * 8), pal: g.pal === 'no_muerto' ? 'negro' : g.pal === 'bestia' ? 'verde' : 'rojo' }); g.vz = -g.vz * 0.3; g.vx *= 0.5; g.vy *= 0.5; g.va *= 0.5; }
        else { g.quieto = true; g.ang = Math.round(g.ang); }
      }
    }
    (j as any).gibs = gibs.filter((g) => g.t < g.vida);
  }
  const rv: any[] | undefined = (j as any).reventones; if (rv?.length) { for (const r of rv) r.t += dt; (j as any).reventones = rv.filter((r) => r.t < 1.2); }
  for (const m of j.monstruos) {
    if (m.muerto || m.dueno || sangraHueso(m) || m.vida > m.vidaMax * 0.35) continue;
    const o = m as any; if (o.rx === undefined) { o.rx = m.x; o.ry = m.y; continue; }
    if (dist(m.x, m.y, o.rx, o.ry) > 0.8) { ponerMancha(j, { x: m.x + (R() - 0.5) * 0.3, y: m.y + (R() - 0.5) * 0.3, r: 0.12 + R() * 0.12, color: colorSangre(m), t: 0, tipo: 'sangre', forma: 'rastro', ang: Math.atan2(m.y - o.ry, m.x - o.rx), sem: Math.floor(R() * 8), pal: paletaDe(m) }); o.rx = m.x; o.ry = m.y; }
  }
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
    if (c.objetivo && l < 0.6 && Math.floor(c.t * 3) !== Math.floor((c.t - dt) * 3)) { danar(j, c.objetivo, { min: c.dano[0], max: c.dano[1], elem: 'fisico', deHeroe: true, fuente: h, sinFallo: true }); if (c.marca) c.objetivo.marca = Math.max(c.objetivo.marca ?? 0, 4); }
  }
  j.cuervos = j.cuervos.filter((c) => c.t < c.dur);
  for (const tr of j.torretas) {
    tr.t += dt; tr.cd -= dt;
    if (tr.mina) {
      // mina o cepo: espera a que algo la pise
      if (tr.cd <= 0) { tr.cd = 1.5; efecto(j, 'glifo_trampa', tr.x, tr.y, 0, 0.5, 0, 1.5); }
      if (enRadio(j, tr.x, tr.y, 0.9).length) {
        const r = tr.mina, el = tr.elem ?? 'fuego';
        for (const e of enRadio(j, tr.x, tr.y, r)) { danar(j, e, golpeSimple(j, tr.dano, el)); if (tr.raiz && !esJefe(e)) e.congelado = Math.max(e.congelado, 2); }
        efecto(j, tr.efecto ?? 'explosion_fuego', tr.x, tr.y, 0, r / 2); sonar(j, el === 'rayo' ? 'trueno' : el === 'veneno' ? 'veneno' : tr.raiz ? 'golpe_metal' : 'explosion', tr.x, tr.y, 0.8);
        j.sacudida = Math.max(j.sacudida, 0.2); tr.t = tr.dur;
      }
      continue;
    }
    if (tr.cd <= 0) { const m = masCercano(j, tr.x, tr.y, 9, new Set()); if (m) { const el = tr.elem ?? 'fisico'; disparar(j, { ...h, x: tr.x, y: tr.y } as Ent, m.x, m.y, golpeSimple(j, tr.dano, el), el === 'fisico' ? 'flecha' : tr.efecto ?? 'chispa_cargada', 15); sonar(j, el === 'rayo' ? 'rayo' : 'virote', tr.x, tr.y, 0.5); } tr.cd = 0.55; }
  }
  j.torretas = j.torretas.filter((t) => t.t < t.dur);
  // efectos, números, partículas
  for (const e of j.efectos) e.t += dt;
  j.efectos = j.efectos.filter((e) => e.t < (e.dur ?? 1.4));
  for (const n of j.numeros) { n.t += dt; n.z += dt * 30; }
  j.numeros = j.numeros.filter((n) => n.t < 1.1);
  for (const p of j.particulas) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.grav * dt; if (p.z < 0) { p.z = 0; p.vx *= 0.5; p.vy *= 0.5; p.vz = 0; if (p.tipo === 'sangre' && R() < 0.06) ponerMancha(j, { x: p.x, y: p.y, r: 0.12 + R() * 0.18, color: p.color, t: 0, tipo: 'sangre', forma: 'gota', sem: Math.floor(R() * 8) }); } }
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

/** Furia, combo, frascos y formas. */
function actualizarMecanicas(j: Juego, dt: number) {
  const h = j.heroe, cl = h.d.clase;
  if (cl === 'berserker') {
    if (h.furiaFija > 0) { h.furiaFija -= dt; h.furia = 100; }
    else if (j.t - h.tCombate > 4) h.furia = Math.max(0, h.furia - 12 * dt);
  }
  if (cl === 'monje' && h.combo.paso > 0 && j.t - h.combo.t > ventanaCombo(h) && !h.buffs.loto_dorado) h.combo.paso = 0;
  if (cl === 'alquimista') {
    const max = frascosMax(h);
    if (h.frascos < max) { h.frascoT += dt * (1 + bono(h, 'frascos_vel') / 100); if (h.frascoT >= 4) { h.frascoT = 0; h.frascos = Math.min(max, h.frascos + 1); } } else { h.frascos = max; h.frascoT = 0; }
  }
  // formas del druida: el cuerpo cambia de tamaño y de tono
  const lobo = !!h.buffs.forma_lobo, oso = !!h.buffs.forma_oso;
  const esc = oso ? 1.15 : lobo ? 1.06 : 1;
  if (h.escala !== esc) { h.escala = esc; if (esc !== 1) { efecto(j, 'transformacion_bestia', h.x, h.y, 0, 1); particulas(j, h.x, h.y, 16, 'humo', oso ? '#604028' : '#707888', 1.2, 20); } }
  h.tinte = oso ? '#7a5030' : lobo ? '#8898b0' : undefined;
  if ((lobo || oso) && R() < dt * 3) particulas(j, h.x + entre(-0.3, 0.3), h.y + entre(-0.3, 0.3), 1, 'ceniza', oso ? '#a07040' : '#a0b0c8', 0.3, 40);
}

function moverHacia(j: Juego, e: Ent, tx: number, ty: number, vel: number, dt: number): boolean {
  const dx = tx - e.x, dy = ty - e.y, l = Math.hypot(dx, dy);
  if (l < 0.05) return true;
  const paso = Math.min(l, vel * dt);
  const nx = e.x + (dx / l) * paso, ny = e.y + (dy / l) * paso;
  // los monstruos no cambian de dirección por cada zigzag del camino: solo si el rumbo pasa el sector vecino por más de 10°
  if (e.tipo === 'heroe') e.dir = dirDe(dx, dy);
  else { const [cx, cy] = DIR_VEC[e.dir] ?? [0, 1]; const dif = Math.abs(Math.atan2(cx * dy - cy * dx, cx * dx + cy * dy)); if (dif > (Math.PI / 8) + 0.18) e.dir = dirDe(dx, dy); }
  const x0 = e.x, y0 = e.y;
  if (pasable(j.zona, nx, ny)) { e.x = nx; e.y = ny; }
  else if (pasable(j.zona, nx, e.y)) e.x = nx;
  else if (pasable(j.zona, e.x, ny)) e.y = ny;
  else return true;
  e.recorrido = (e.recorrido ?? 0) + Math.hypot(e.x - x0, e.y - y0);
  return l <= paso + 0.01;
}

function actualizarHeroe(j: Juego, dt: number) {
  const h = j.heroe;
  h.t += dt; h.destello = Math.max(0, h.destello - dt);
  if (h.muerto) return;
  // congelado o aturdido: un momento sin poder hacer nada
  if (h.congelado > 0 || h.aturdido > 0) { h.congelado = Math.max(0, h.congelado - dt); h.aturdido = Math.max(0, h.aturdido - dt); h.acc = 'quieto'; h.camino = null; h.destino = null; return; }
  for (const k of Object.keys(h.recargas)) h.recargas[k] = Math.max(0, h.recargas[k] - dt);
  // buffs
  let cambio = false;
  for (const [k, b] of Object.entries(h.buffs)) { if (b.t < 9000) { b.t -= dt; if (b.t <= 0) { delete h.buffs[k]; cambio = true; } } }
  if (cambio) { recalc(j); cambio = false; }
  // aura activa: solo una. Poner un aura en el botón derecho (o usarla) la vuelve la activa, y sigue aunque cambies de botón.
  const der = habilidadDe(h.d.der);
  if (der.tipo === 'aura' && nivelHab(h.d, der.id, h.c) > 0 && h.d.aura !== der.id) h.d.aura = der.id;
  const auraHb = h.d.aura ? habilidadDe(h.d.aura) : null;
  const auraId = auraHb && auraHb.tipo === 'aura' && auraHb.clase === h.d.clase && nivelHab(h.d, auraHb.id, h.c) > 0 ? auraHb.id : null;
  const pot = auraId ? bono(h, 'potencia_aura') : 0;
  for (const k of Object.keys(h.buffs)) if (h.buffs[k].t > 9000 && (k !== auraId || Math.abs(h.auraPot - pot) > 0.01)) { delete h.buffs[k]; cambio = true; }
  if (auraId && auraHb && !h.buffs[auraId]) { const n = nivelHab(h.d, auraId, h.c); const bonos: Record<string, number> = {}; for (const [k, b] of Object.entries(auraHb.bonos ?? {})) bonos[k] = val(b, n) * (1 + pot / 100); h.buffs[auraId] = { t: 99999, bonos, hab: auraId }; h.auraPot = pot; cambio = true; }
  if (cambio) recalc(j);
  // aura que daña y aura de sentencia
  if (auraId && auraHb) {
    const n = nivelHab(h.d, auraId, h.c), kp = 1 + pot / 100;
    if (auraHb.dano && Math.floor(j.t * 2) !== Math.floor((j.t - dt) * 2)) { const dh = danoHab(j, auraHb, n); for (const e of enRadio(j, h.x, h.y, auraHb.radio ?? 5)) danar(j, e, { min: dh[0] * 0.5 * kp, max: dh[1] * 0.5 * kp, elem: auraHb.elem, deHeroe: true, fuente: h, sinFallo: true }); }
    if (auraId === 'aura_conviccion') for (const e of enRadio(j, h.x, h.y, auraHb.radio ?? 7)) { e.maldicion = { amplificar: 0, debilitar: 0, lento: 0, ...(e.maldicion ?? {}), t: Math.max(0.5, e.maldicion?.t ?? 0), res: val(auraHb.bonos?.enemigo_res, n) * kp }; }
  }
  // tempestad y huracán
  if (h.tempestad > 0) { h.tempestad -= dt; if (R() < dt * 2.5) { const m = masCercano(j, h.x, h.y, 6, new Set()); if (m) { const hb = habilidadDe('tempestad'), dh = danoHab(j, hb, nivelHab(h.d, 'tempestad', h.c)); efecto(j, 'relampago', m.x, m.y, 0, 1); danar(j, m, { min: dh[0], max: dh[1], elem: 'rayo', deHeroe: true, fuente: h, sinFallo: true }); sonar(j, 'trueno', m.x, m.y, 0.6); } } }
  if (h.huracan > 0) { h.huracan -= dt; if (Math.floor(j.t * 2) !== Math.floor((j.t - dt) * 2)) { const hb = habilidadDe(h.huracanHab), dh = danoHab(j, hb, Math.max(1, nivelHab(h.d, hb.id, h.c))); for (const e of enRadio(j, h.x, h.y, hb.radio ?? 5)) danar(j, e, { min: dh[0] / 2, max: dh[1] / 2, elem: 'frio', deHeroe: true, fuente: h, sinFallo: true }); particulas(j, h.x, h.y, 6, 'nieve', '#e0f0ff', 2, 20); } }
  actualizarMecanicas(j, dt);
  // regeneración
  h.regen += dt;
  // fuera de combate (5 s sin pegar ni recibir) el héroe se repone despacio: 1.5 % de su vida por segundo
  const regV = h.c.regen_vida + (j.zona.tipo === 'pueblo' ? h.vidaMax * 0.05 : j.t - h.tCombate > 5 ? h.vidaMax * 0.015 : 0);
  h.vida = Math.min(h.vidaMax, h.vida + regV * dt);
  // en Normal el maná vuelve el doble de rápido hasta el nivel 15 y baja a lo normal hacia el 25
  const temprano = h.d.dificultad === 0 ? (h.d.nivel <= 15 ? 2 : 1 + Math.max(0, 25 - h.d.nivel) / 10) : 1;
  h.mana = Math.min(h.c.manaMax, h.mana + h.c.manaMax * 0.025 * temprano * (1 + h.c.regen_mana / 100) * dt);
  if (h.veneno > 0) { h.veneno -= dt; h.vida -= h.venenoDps * dt; if (h.vida <= 0) { h.vida = 1; } }
  if ((h as any).quema > 0) { (h as any).quema -= dt; h.vida -= (h as any).quemaDps * dt; if ((h as any).quema <= 0) (h as any).quemaDps = 0; if (h.vida <= 0) h.vida = 1; }
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
      const extra = hb.dano ? danoHab(j, hb, n) : undefined;
      for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, h.x, h.y) <= r + (hb.tipo === 'carga' ? 0.6 : 0)) { const g = golpeArma(j, mult, hb.elem !== 'fisico' ? hb.elem : undefined, extra); if (hb.tipo === 'carga') g.empuje = 1; if (danar(j, e, g) > 0) ganarFuria(j, 4); }
      efecto(j, hb.tipo === 'salto' ? 'onda_aterrizaje' : 'polvo_carga', h.x, h.y, DIRS.indexOf(h.dir));
      j.sacudida = 0.3; sonar(j, 'golpe_metal');
      h.salto = null; h.acc = 'quieto';
    }
    return;
  }
  if (h.torbellino > 0) {
    h.torbellino -= dt;
    const [tx, ty] = (h as any).torbDir;
    if (moverHacia(j, h, tx, ty, 4.5, dt)) h.torbellino = Math.min(h.torbellino, 0.05);
    h.acc = 'atacar'; h.dir = DIRS[Math.floor(j.t * 16) % 8];
    if (Math.floor(j.t * 5) !== Math.floor((j.t - dt) * 5)) for (const e of enemigosDe(j, true)) if (dist(e.x, e.y, h.x, h.y) < 2.2) { if (danar(j, e, golpeArma(j, (h as any).torbMult)) > 0) ganarFuria(j, 2); }
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
    // un paso por cada pie que apoya: media zancada
    const medio = (h.correr ? ZANCADA.correr : ZANCADA.caminar) * (ALTO_CLASE[h.d.clase] ?? 1) / 2;
    const pie = Math.floor((h.recorrido ?? 0) / medio);
    if (pie !== h.pasoT) { h.pasoT = pie; sonar(j, 'paso', h.x, h.y, h.correr ? 0.4 : 0.3); }
    if (!h.camino.length) h.camino = null;
  } else if (h.acc === 'caminar' || h.acc === 'correr') h.acc = 'quieto';
}

function actualizarMonstruo(j: Juego, m: Monstruo, dt: number) {
  m.t += dt; m.destello = Math.max(0, m.destello - dt);
  if (m.muerto) { m.tMuerto += dt; return; }
  actualizarMonstruo2(j, m, dt);
  // lo que se ve: entre quieto y caminar hace falta un mínimo de 0.2 s en cada estado (sin vaivén de un cuadro a otro)
  const o = m as any; o.tVis = (o.tVis ?? 0) + dt;
  const suave = (a: string) => a === 'quieto' || a === 'caminar' || a === 'correr';
  if (o.accVis !== m.acc) { if (!(suave(m.acc) && suave(o.accVis ?? '') && o.tVis < 0.2)) { o.accVis = m.acc; o.tVis = 0; } }
}
function actualizarMonstruo2(j: Juego, m: Monstruo, dt: number) {
  const h = j.heroe;
  if (m.veneno > 0) { m.veneno -= dt; m.vida -= m.venenoDps * dt; if (Math.floor(m.veneno * 2) !== Math.floor((m.veneno + dt) * 2)) particulas(j, m.x, m.y, 2, 'humo', '#60a040', 0.5, 30); if (m.vida <= 0) { morirMonstruo(j, m); return; } }
  if (m.sangrado > 0) { m.sangrado -= dt; m.vida -= m.vidaMax * 0.02 * dt; if (m.vida <= 0) { morirMonstruo(j, m); return; } }
  if ((m as any).quema > 0) { (m as any).quema -= dt; m.vida -= (m as any).quemaDps * dt; if (R() < dt * 6) particulas(j, m.x, m.y, 1, 'brasa', '#ff7020', 0.4, 40 * m.escala); if ((m as any).quema <= 0) (m as any).quemaDps = 0; if (m.vida <= 0) { morirMonstruo(j, m); return; } }
  if (m.maldicion) { m.maldicion.t -= dt; if (m.maldicion.t <= 0) m.maldicion = undefined; }
  if (m.marca && m.marca > 0) { m.marca -= dt; if (Math.floor(m.marca * 2) !== Math.floor((m.marca + dt) * 2)) particulas(j, m.x, m.y, 1, 'pluma', '#ffc860', 0.3, 70 * m.escala); }
  if (m.dueno && m.tVida !== undefined) { m.tVida -= dt; if (m.tVida <= 0) { m.vida = 0; m.muerto = true; m.acc = 'morir'; m.t = 0; m.tMuerto = 0; efecto(j, 'circulo_invocacion', m.x, m.y, 0, 0.5); return; } }
  if (m.congelado > 0) { m.congelado -= dt; return; }
  if (m.aturdido > 0) { m.aturdido -= dt; m.acc = 'herido'; return; }
  if (m.frio > 0) m.frio -= dt;
  const lento = (m.frio > 0 ? 0.5 : 1) * (m.maldicion?.lento ? 1 - m.maldicion.lento / 100 : 1);
  // surgir del piso
  if (m.estado === 'surgir') { if (dist(m.x, m.y, h.x, h.y) < 7 && !h.muerto) { m.estado = 'perseguir'; m.objetivo = h; m.acc = 'morir'; m.t = 0; (m as any).surgiendo = 1.2; particulas(j, m.x, m.y, 12, 'humo', '#3a3026', 1, 4); sonar(j, 'grunido', m.x, m.y); } return; }
  if ((m as any).surgiendo > 0) { (m as any).surgiendo -= dt; return; }
  if ((m as any).nucleoT > 0) {
    // Ozmaren con el pecho abierto: quieto, el núcleo de lava a la vista y recibe el doble de daño
    const o = m as any; o.nucleoT -= dt; m.acc = 'especial' as any; if (m.t >= m.dur) m.t = 0;
    if (o.nucleoT <= 0) { m.acc = 'quieto'; m.t = 0; m.cd = 0.3; msg(j, ['Ozmaren cierra el pecho.', 'Ozmaren closes its chest.'], '#c08060'); }
    return;
  }
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
    if (m.invocaId === 'thor') { seguirThor(j, m, d, dt); return; }
    // Thor galopa si el héroe corre (o si quedó lejos)
    const galopa = m.invocaId === 'thor' && (h.acc === 'correr' || d > 7);
    if (d > 3) { moverHacia(j, m, h.x, h.y, m.vel * (galopa ? 1.8 : 1.4), dt); m.acc = (galopa ? 'correr' : 'caminar') as any; } else if (m.acc === 'caminar' || (m.acc as string) === 'correr') m.acc = 'quieto';
    if (d > 20) { m.x = h.x + entre(-1, 1); m.y = h.y + entre(-1, 1); }
    return;
  }
  const dh = dist(m.x, m.y, h.x, h.y);
  // despertar
  if (m.estado === 'dormido' || m.estado === 'deambular') {
    const vista = m.calidad >= 3 ? 9 : 8;
    // los jefes despiertan por cercanía a su sala, aunque un muro los tape (si no, quedan quietos hasta verte)
    const esJefe = !!(m.def.jefe || m.def.ia === 'jefe');
    if (!h.muerto && ((esJefe && dh < 7 + (m.escala ?? 1) * 2) || (dh < vista && (dh < 3 || lineaLibre(j.zona, m.x, m.y, h.x, h.y))))) {
      m.estado = 'perseguir'; m.objetivo = h;
      if (m.calidad >= 3 || m.def.jefe || m.def.ia === 'jefe') { j.jefe = m;
        // la primera vez que ves a un jefe de verdad: su presentación con el nombre grande y cámara lenta
        presentarJefe(j, m);
        if (!(m as any).hablo) { (m as any).hablo = true; const fr = FRASE_JEFE[m.def.id]; if (fr) { msg(j, fr, '#ff6040'); m.habla = fr[j.idi]; (m as any).hablaT = 4; } sonar(j, 'rugido_jefe'); Sonido.musica('jefe'); } }
      else if (R() < 0.3) sonar(j, m.def.sonido === 'hueso' ? 'golpe_hueso' : 'grunido', m.x, m.y, 0.6);
      // el grupo despierta junto
      // el grupo despierta junto, pero no entero: los más cercanos sí, los demás a veces (llegan después cuando te vean)
      for (const o of j.monstruos) if (!o.muerto && !o.dueno && o.estado !== 'perseguir' && o.estado !== 'surgir') { const d2 = dist(o.x, o.y, m.x, m.y); if (d2 < 2.5 || (d2 < 5 && R() < 0.4)) { o.estado = 'perseguir'; o.objetivo = h; } }
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
    // los jefes llamaban 3 cada 9 s hasta 14 alrededor: eso, y no el jefe, era lo que mataba (sobre todo al cuerpo a cuerpo)
    m.invocaCd = m.def.jefe ? 12 : 7;
    const cuantos = j.monstruos.filter((o) => !o.muerto && !o.dueno && dist(o.x, o.y, m.x, m.y) < 8).length;
    if (cuantos < (m.def.id === 'abadesa' ? 4 : m.def.jefe ? 8 : 9)) {
      m.acc = 'lanzar'; m.t = 0; m.dur = 0.7; m.golpeEn = 0.4; m.golpeo = true;
      for (let k = 0; k < (m.def.id === 'abadesa' ? 1 : 2); k++) { const q = libreCerca(j.zona, m.x + entre(-2, 2), m.y + entre(-2, 2)); const nm = crearMonstruo(MONSTRUOS[m.def.invoca], m.nivel, q[0] + 0.5, q[1] + 0.5, 0, h.d.dificultad); if (m.def.jefe) nm.dano = [Math.min(nm.dano[0], Math.round(m.dano[0] * 0.5)), Math.min(nm.dano[1], Math.round(m.dano[1] * 0.5))]; nm.estado = 'perseguir'; nm.objetivo = h; nm.acc = 'morir'; nm.t = 0; (nm as any).surgiendo = 1; j.monstruos.push(nm); efecto(j, 'circulo_invocacion', q[0] + 0.5, q[1] + 0.5, 0, 0.7); }
      sonar(j, 'invocar', m.x, m.y);
      return;
    }
  }
  // Ozmaren abre el pecho cada tanto: suelta una ola de fuego (aviso) y queda expuesto unos segundos
  if (m.def.id === 'senor_demonio' && dh < 12) {
    const o = m as any; o.nucleoCd = (o.nucleoCd ?? 8) - dt;
    if (o.nucleoCd <= 0) {
      o.nucleoCd = m.fase >= 2 ? 13 : 16; o.nucleoT = 4.5;
      m.acc = 'especial' as any; m.t = 0; m.dur = 0.9;
      for (let a = 0; a < 10; a++) disparar(j, m, m.x + Math.cos(a * 0.628), m.y + Math.sin(a * 0.628), { min: m.dano[0] * 0.3, max: m.dano[1] * 0.3, elem: 'fuego', deHeroe: false, fuente: m }, 'saeta_fuego', 6);
      efecto(j, 'grito_guerra', m.x, m.y, 0, 1.6); efecto(j, 'pilar_infernal', m.x, m.y, 0, 1.5); j.sacudida = 0.4; sonar(j, 'rugido_jefe', m.x, m.y);
      msg(j, ['¡Ozmaren abre el pecho! Su núcleo queda expuesto: pégale ahora.', 'Ozmaren opens its chest! Its core is exposed: strike now.'], '#ffc060');
      return;
    }
  }
  // un jefe que despertó con su grupo (sin pasar por la vista) también se presenta
  if ((m.def.jefe || m.def.ia === 'jefe') && m.estado === 'perseguir' && !m.dueno && dist(m.x, m.y, h.x, h.y) < 14) { if (!j.jefe || j.jefe.muerto) j.jefe = m; presentarJefe(j, m); }
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

function efectoProy(p: string) { return p === 'fuego' ? 'saeta_fuego' : p === 'hielo' ? 'saeta_hielo' : p === 'veneno' ? 'saeta_veneno' : p === 'sombra' ? 'lanza_hueso' : p === 'luz' ? 'saeta_sagrada' : p === 'lanza' ? 'flecha' : 'flecha'; }

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
  // los brutos y los jefes a veces te aturden un instante; el espectral pega con sombra
  if (m.mods.includes('fuerte') || m.def.jefe) g.aturdir = 6;
  if (m.mods.includes('espectral')) g.extra!.sombra = (g.extra!.sombra ?? 0) + m.dano[1] * 0.4;
  // maldito: sus golpes te roban maná y te vuelven lento
  if (m.mods.includes('maldito') && obj.tipo === 'heroe') { const hh = obj as Heroe; hh.mana = Math.max(0, hh.mana - hh.c.manaMax * 0.05); hh.frio = Math.max(hh.frio, 1.5); }
  if (m.mods.includes('helado')) g.extra!.frio = (g.extra!.frio ?? 0) + m.dano[1] * 0.4;
  if (m.mods.includes('electrico')) g.extra!.rayo = (g.extra!.rayo ?? 0) + m.dano[1] * 0.5;
  if (m.dueno) { g.sinFallo = true; g.precision = undefined; }
  if ((m as any).aDist && m.def.proyectil) {
    const e: Elemento = m.def.elem ?? 'fisico';
    const pg: Golpe = { ...g, elem: m.def.proyectil === 'flecha' || m.def.proyectil === 'lanza' ? 'fisico' : e, extra: {} };
    if (pg.elem !== 'fisico') { pg.min *= 1.1; pg.max *= 1.1; }
    const cnt = m.def.jefe ? 3 : 1;
    for (let k = 0; k < cnt; k++) { const a = Math.atan2(obj.y - m.y, obj.x - m.x) + (k - (cnt - 1) / 2) * 0.25; disparar(j, m, m.x + Math.cos(a) * 5, m.y + Math.sin(a) * 5, pg, efectoProy(m.def.proyectil), m.def.proyectil === 'flecha' ? 12 : m.def.id === 'monja_hueca' && m.nivel < 25 ? 5.5 : 8); }
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
  if (m.dueno && m.invocaId === 'halcon' && obj.tipo === 'monstruo') (obj as Monstruo).marca = Math.max((obj as Monstruo).marca ?? 0, 4);
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
        const ks = p.salva ? (p.salva.get(e.id) ?? 0) : 0; if (p.salva) p.salva.set(e.id, ks + 1);
        const fs = ks ? 0.6 : 1;
        const g: Golpe = { min: p.dano[0] * fs, max: p.dano[1] * fs, elem: p.elem, deHeroe: p.deHeroe, fuente: p.deHeroe ? j.heroe : undefined, sinFallo: p.elem !== 'fisico' || !p.deHeroe ? p.elem !== 'fisico' : false, precision: p.deHeroe ? j.heroe.c.precision : undefined, critico: p.deHeroe ? j.heroe.c.critico : 0 };
        if (p.deHeroe && (p.efecto === 'flecha' || p.efecto === 'flecha_fuego' || p.efecto === 'flecha_hielo' || p.efecto === 'virote')) { g.extra = Object.fromEntries(Object.entries(j.heroe.c.elem).map(([k, v]) => [k, (v as number) * fs])); g.robo = j.heroe.c.robo_vida; }
        if (!p.deHeroe) { g.fuente = p.fuente && p.fuente.tipo === 'monstruo' ? p.fuente : undefined; if (!g.fuente) for (const m of j.monstruos) if (!m.muerto && dist(m.x, m.y, p.x, p.y) < 30) { g.fuente = m; break; } }
        if (p.deHeroe && p.hab?.bonos?.empuje) g.empuje = 1;
        if (p.deHeroe && p.hab?.bonos?.marca && e.tipo === 'monstruo') (e as Monstruo).marca = Math.max((e as Monstruo).marca ?? 0, val(p.hab.bonos.marca, p.nivelHab ?? 1));
        danar(j, e, g);
        if (p.explota) { explotar(j, p); p.vida = 0; break; }
        if (!p.perfora) { p.vida = 0; efecto(j, impactoDe(p), p.x, p.y, 0, 0.5); break; }
      }
    }
  }
  j.proyectiles = j.proyectiles.filter((p) => p.vida > 0);
}
/** Qué efecto suelta un proyectil al pegar: el que sugiere la tabla de luces de la Forja, o uno por elemento. */
function impactoDe(p: Proyectil): string {
  const sug = LUZ_EFECTO[p.efecto]?.impacto; if (sug) return sug;
  const IMP: Partial<Record<Elemento, string>> = { fuego: 'explosion_fuego', frio: 'estallido_esquirlas', fisico: 'chispas_carne', rayo: 'impacto_rayo', veneno: 'impacto_veneno', luz: 'impacto_sagrado', sangre: 'salpicadura_sangre' };
  return /hueso/.test(p.efecto) ? 'impacto_hueso' : IMP[p.elem] ?? 'chispas_metal';
}
function explotar(j: Juego, p: Proyectil) {
  const r = p.explota || 1.5;
  efecto(j, p.elem === 'frio' ? 'nova_escarcha' : p.elem === 'veneno' ? 'nube_veneno' : p.elem === 'rayo' ? 'impacto_rayo' : 'explosion_fuego', p.x, p.y, 0, r / 2);
  for (const e of enemigosDe(j, p.deHeroe)) if (dist(e.x, e.y, p.x, p.y) < r + e.radio) {
    danar(j, e, { min: p.dano[0], max: p.dano[1], elem: p.elem, deHeroe: p.deHeroe, fuente: p.deHeroe ? j.heroe : undefined, sinFallo: true });
    if (p.hab?.bonos?.miedo && !esJefe(e)) e.miedo = val(p.hab.duracion, p.nivelHab ?? 1);
  }
  if (p.hab?.id === 'frasco_peste' || p.hab?.id === 'bomba_humo') { const d = val(p.hab.duracion, p.nivelHab ?? 1); j.areas.push({ x: p.x, y: p.y, radio: r * 0.9, dano: [p.dano[0] * 0.25, p.dano[1] * 0.25], elem: 'veneno', t: 0, dur: d, tick: 0.5, prox: 0.5, deHeroe: true, efecto: 'nube_veneno', retraso: 0.05 }); }
  // el frasco incendiario deja el piso ardiendo
  if (p.hab?.id === 'bomba_ignea') efecto(j, 'suelo_ardiente', p.x, p.y, 0, Math.max(0.8, r / 2.2), 0, 3);
  if (p.hab?.id === 'gran_crisol') j.areas.push({ x: p.x, y: p.y, radio: r * 0.7, dano: [p.dano[0] * 0.08, p.dano[1] * 0.08], elem: 'fuego', t: 0, dur: 4, tick: 0.5, prox: 0.5, deHeroe: true, efecto: 'crater_ardiente', retraso: 0.05 });
  j.sacudida = Math.max(j.sacudida, 0.15);
  sonar(j, p.elem === 'frio' ? 'hielo_impacto' : 'explosion', p.x, p.y, 0.8);
  if (p.elem === 'fuego') ponerMancha(j, { x: p.x, y: p.y, r: r * 0.6, color: '#141008', t: 0, tipo: 'quemado' });
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
/** El efecto de tomarse una poción (del cinturón o de la bolsa). */
export function beberPocion(j: Juego, o: Objeto) {
  const h = j.heroe; if (h.muerto) return;
  const v = valorPocion(o);
  // hasta el nivel 5 la poción cura en 2 s en vez de 4: al empezar se muere por llegar tarde, no por falta de pociones
  if (o.pocion === 'vida') { const tc = h.d.nivel <= 5 ? 2 : 4; (h as any).curando = { t: tc, v: v / tc }; }
  else if (o.pocion === 'mana') { (h as any).cargando = { t: 3, v: v / 3 }; }
  else { h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * v / 100); h.mana = Math.min(h.c.manaMax, h.mana + h.c.manaMax * v / 100); }
  sonar(j, 'pocion');
  particulas(j, h.x, h.y, 10, 'chispa', o.pocion === 'mana' ? '#6080ff' : o.pocion === 'vida' ? '#ff4040' : '#c040ff', 0.6, 40);
}
/** Columnas del cinturón que se rellenan solas desde la bolsa (no se guarda: al entrar todas se rellenan). */
const pendientes = (h: any): boolean[] => (h.rellenar ??= h.d.cinturon.map(() => true));
/** Si se saca a mano una poción del cinturón, esa columna deja de rellenarse sola hasta la próxima vez que se tome. */
export function noRellenar(j: Juego, i: number) { pendientes(j.heroe)[i] = false; }
export function usarPocion(j: Juego, i: number) {
  const h = j.heroe; if (h.muerto) return;
  const o = h.d.cinturon[i]; if (!o) return;
  beberPocion(j, o);
  if (cant(o) > 1) o.cantidad = cant(o) - 1; else h.d.cinturon[i] = null;
  // la misma columna se rellena desde la bolsa con su tipo
  pendientes(h)[i] = true;
  rellenarColumna(h.d, i);
}
export function curarEnTiempo(j: Juego, dt: number) {
  const h = j.heroe as any;
  // el cinturón se rellena solo desde la bolsa, cada columna con su tipo (salvo las que vaciaste a mano)
  if (!h.muerto && (h.tCinturon = (h.tCinturon ?? 0) - dt) <= 0) {
    h.tCinturon = 0.5;
    const d = h.d, pend = pendientes(h);
    for (let i = 0; i < d.cinturon.length; i++) if (pend[i]) rellenarColumna(d, i);
  }
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

