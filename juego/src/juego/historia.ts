// La historia en juego: estado de las misiones, lo que dice cada uno según lo que pasó, los diarios de los sellos,
// los fantasmas que repiten su última escena y Vesperio, el heraldo que huye en cada acto hasta la Fragua.
import { MISIONES, DIARIOS, PAGINAS, FANTASMAS, HERALDO, ZONAS, MUSICA_ACTO, daMision, type Mision, type FinalElegido } from '../mundo/actos';
import { DIALOGOS, NPCS, type Linea } from '../datos/npcs';
import { MONSTRUOS } from '../datos/monstruos';
import { pasable, libreCerca } from '../mundo/zona';
import { crearMonstruo, msg, efecto, particulas, soltar, dirDe, type Juego, type Monstruo, type Dir } from './mundo';
import { nivelEnDificultad, type DatosHeroe } from './heroe';
import { Sonido } from '../audio/sonido';
import { R, dist } from '../nucleo/azar';

// ------------------------------------------------------------------ lo que se guarda en el héroe (campos libres del guardado)
export interface Historia {
  /** Opción elegida en cada misión con elección. */
  elecciones?: Record<string, number>;
  /** Actos en los que Vesperio ya se escapó. */
  heraldo?: number[];
  heraldoMuerto?: boolean;
  /** Lo que se hizo con la Brasa al caer Ozmaren. */
  finalElegido?: FinalElegido;
  /** Páginas leídas de cada diario de acto. */
  diarios?: Record<number, number>;
  paginas?: number;
}
export const hist = (d: DatosHeroe) => d as DatosHeroe & Historia;
export const estadoMision = (d: DatosHeroe, id: string) => d.misiones[id] ?? 0;
export const eleccionDe = (d: DatosHeroe, id: string) => hist(d).elecciones?.[id];
export const finalDe = (d: DatosHeroe) => hist(d).finalElegido;
/** Al empezar otra dificultad la historia vuelve a empezar. */
export function reiniciarHistoria(d: DatosHeroe) { const h = hist(d); h.elecciones = {}; h.heraldo = []; h.heraldoMuerto = false; h.finalElegido = undefined; }

// ------------------------------------------------------------------ misiones por persona
const requisitos = (d: DatosHeroe, m: Mision) => (m.requiere ?? []).every((r) => estadoMision(d, r) === 3);
/** Misión que esta persona puede ofrecer ahora. Las principales van en orden y de a una; las laterales cuando se cumplen sus requisitos. */
export function ofertaDe(npc: string, d: DatosHeroe): Mision | null {
  const delActo = MISIONES.filter((m) => m.acto === d.acto);
  const principales = delActo.filter((m) => !m.lateral);
  const hayPrincipal = principales.some((m) => estadoMision(d, m.id) === 1);
  for (const m of delActo) {
    if (daMision(m) !== npc || estadoMision(d, m.id) !== 0 || !requisitos(d, m)) continue;
    if (!m.lateral) { if (hayPrincipal || principales.find((q) => estadoMision(d, q.id) === 0) !== m) continue; }
    return m;
  }
  return null;
}
/** Misión cumplida que esta persona tiene que recibir (de cualquier acto). */
export const entregaDe = (npc: string, d: DatosHeroe) => MISIONES.find((m) => daMision(m) === npc && estadoMision(d, m.id) === 2) ?? null;
/** Misión en curso que dio esta persona. */
export const activaDe = (npc: string, d: DatosHeroe) => MISIONES.find((m) => daMision(m) === npc && estadoMision(d, m.id) === 1) ?? null;
/** Marca sobre la cabeza: '?' si hay algo que entregar, '!' si hay algo que ofrecer. */
export function marcaNpc(npc: string, d: DatosHeroe): '!' | '?' | null { return entregaDe(npc, d) ? '?' : ofertaDe(npc, d) ? '!' : null; }
/** Al aceptar una misión de llegar a un lugar ya visitado (con piedra encendida) se da por cumplida. */
export function aceptar(d: DatosHeroe, m: Mision) {
  d.misiones[m.id] = 1;
  if (m.objetivo.tipo === 'llegar' && d.viajes.includes(m.objetivo.zona)) d.misiones[m.id] = 2;
}
/** Texto del desenlace (con la variante por lo que se hizo con la Brasa). */
export function textoHecho(d: DatosHeroe, m: Mision, opcion?: number): [string, string] {
  if (opcion !== undefined && m.eleccion) return m.eleccion.opciones[opcion].hecho;
  const f = finalDe(d); return (f && m.hechoSegun?.[f]) || m.hecho;
}

// ------------------------------------------------------------------ lo que dice cada uno
function cumple(l: Linea, d: DatosHeroe): boolean {
  if (l.acto !== undefined && l.acto !== d.acto) return false;
  if (l.hecha && !l.hecha.every((id) => estadoMision(d, id) === 3)) return false;
  if (l.activa && ![1, 2].includes(estadoMision(d, l.activa))) return false;
  if (l.eleccion && (estadoMision(d, l.eleccion[0]) !== 3 || eleccionDe(d, l.eleccion[0]) !== l.eleccion[1])) return false;
  if (l.heraldo !== undefined && !(hist(d).heraldo ?? []).includes(l.heraldo)) return false;
  if (l.final && finalDe(d) !== l.final) return false;
  return true;
}
/** La línea que corresponde ahora (la última de la lista que se cumpla), o null para usar las de siempre. */
export function lineaDe(npc: string, d: DatosHeroe, tipo: 'lineas' | 'relatos'): [string, string] | null {
  const ls = DIALOGOS[npc]?.[tipo] ?? [];
  let r: [string, string] | null = null;
  for (const l of ls) if (cumple(l, d)) r = l.texto;
  return r;
}
export function saludoDe(npc: string, d: DatosHeroe): [string, string] {
  const n = NPCS[npc];
  return lineaDe(npc, d, 'lineas') ?? n.saludo[Math.floor(R() * n.saludo.length)];
}
export const relatoDe = (npc: string, d: DatosHeroe): [string, string] => lineaDe(npc, d, 'relatos') ?? NPCS[npc].relato;

// ------------------------------------------------------------------ libros malditos: primero el diario del acto, después el del abad
export function leerLibro(d: DatosHeroe, acto: number): { titulo: [string, string]; texto: [string, string]; n: number; total: number } {
  const h = hist(d); h.diarios ??= {}; h.paginas ??= 0;
  const di = DIARIOS[acto];
  const leidas = h.diarios[acto] ?? 0;
  if (di && leidas < di.paginas.length) { h.diarios[acto] = leidas + 1; return { titulo: di.titulo, texto: di.paginas[leidas], n: leidas + 1, total: di.paginas.length }; }
  const abad: [string, string] = ['Diario del primer abad', 'Diary of the First Abbot'];
  if (h.paginas < PAGINAS.length) { const i = h.paginas++; return { titulo: abad, texto: PAGINAS[i], n: i + 1, total: PAGINAS.length }; }
  // todo leído: una página al azar del diario de este acto
  if (di) { const i = Math.floor(R() * di.paginas.length); return { titulo: di.titulo, texto: di.paginas[i], n: i + 1, total: di.paginas.length }; }
  const i = Math.floor(R() * PAGINAS.length); return { titulo: abad, texto: PAGINAS[i], n: i + 1, total: PAGINAS.length };
}

// ------------------------------------------------------------------ voces que flotan (fantasmas y heraldo)
export interface Eco { x: number; y: number; txt: [string, string]; t: number; dur: number; color: string }
export interface Fantasma { id: string; sprite: string; texto: [string, string]; x: number; y: number; dir: Dir; estado: 'espera' | 'habla' | 'muere' | 'ido'; t: number }
export const ecos = (j: Juego): Eco[] => ((j as any).ecos ??= []);
export const fantasmas = (j: Juego): Fantasma[] => (j.zona as any)?.fantasmas ?? [];
function eco(j: Juego, x: number, y: number, txt: [string, string], dur: number, color: string) { ecos(j).push({ x, y, txt, t: 0, dur, color }); }

// ------------------------------------------------------------------ al entrar a una zona
export function historiaEntrar(j: Juego) {
  const z = j.zona, h = j.heroe, d = h.d;
  (j as any).ecos = [];
  // fantasmas: uno por zona, en un lugar alejado de la entrada (una vez por zona viva)
  if (!(z as any).fantasmas) {
    (z as any).fantasmas = FANTASMAS.filter((f) => f.zona === z.id).map((f) => {
      let x = h.x, y = h.y;
      for (let k = 0; k < 60; k++) { const a = R() * Math.PI * 2, r = 9 + R() * 9; const px = h.x + Math.cos(a) * r, py = h.y + Math.sin(a) * r; if (pasable(z, px, py)) { x = px; y = py; break; } }
      return { id: f.id, sprite: f.sprite, texto: f.texto, x, y, dir: dirDe(h.x - x, h.y - y), estado: 'espera', t: 0 } as Fantasma;
    });
  }
  // el heraldo
  const acto = ZONAS[z.id]?.acto ?? 0;
  if (HERALDO.zonas[acto] !== z.id) return;
  const hh = hist(d);
  if (acto < HERALDO.final ? (hh.heraldo ?? []).includes(acto) : hh.heraldoMuerto) return;
  if (j.monstruos.some((m) => (m as any).heraldo)) return;
  const def = MONSTRUOS[HERALDO.id]; if (!def) return;
  const cand = z.spawns.filter((s) => s.tipo !== 'jefe').sort((a, b) => dist(a.cx, a.cy, h.x, h.y) - dist(b.cx, b.cy, h.x, h.y));
  const s = cand[Math.floor(cand.length * 0.6)] ?? cand[cand.length - 1];
  const p = s ? libreCerca(z, s.cx + 2, s.cy) : libreCerca(z, h.x + 8, h.y + 8);
  const m = crearMonstruo(def, nivelEnDificultad(z.nivel, d.dificultad) + 1, p[0] + 0.5, p[1] + 0.5, 3, d.dificultad);
  if (acto === HERALDO.final) { m.vidaMax = m.vida = Math.round(m.vidaMax * 1.8); m.misionUnico = 'm5_heraldo'; }
  m.nombre = [def.nombre[0], def.nombre[1]];
  m.estado = 'dormido';
  Object.assign(m as any, { heraldo: acto, huye: acto < HERALDO.final, hablo: true });
  j.monstruos.push(m);
}

// ------------------------------------------------------------------ cada cuadro
export function historiaPaso(j: Juego, dt: number) {
  const h = j.heroe, d = h.d;
  for (const e of ecos(j)) e.t += dt;
  (j as any).ecos = ecos(j).filter((e) => e.t < e.dur);
  // fantasmas
  for (const f of fantasmas(j)) {
    f.t += dt;
    if (f.estado === 'espera' && !h.muerto && dist(f.x, f.y, h.x, h.y) < 5) {
      f.estado = 'habla'; f.t = 0; f.dir = dirDe(h.x - f.x, h.y - f.y);
      eco(j, f.x, f.y, f.texto, 5.5, '#c8d8f0'); msg(j, f.texto, '#a8b8d0'); Sonido.susurro();
    } else if (f.estado === 'habla' && f.t > 5) { f.estado = 'muere'; f.t = 0; }
    else if (f.estado === 'muere' && f.t > 2.2) f.estado = 'ido';
  }
  // el heraldo
  for (const m of j.monstruos) {
    const acto = (m as any).heraldo as number | undefined; if (!acto) continue;
    if (m.muerto) {
      if (!(m as any).lloro) { (m as any).lloro = true; hist(d).heraldoMuerto = true; eco(j, m.x, m.y, HERALDO.muerte, 7, '#e0c8ff'); msg(j, HERALDO.muerte, '#d0b0ff'); }
      continue;
    }
    if (!(m as any).saludo && !h.muerto && dist(m.x, m.y, h.x, h.y) < 9) {
      (m as any).saludo = true; const fr = HERALDO.encuentro[acto];
      if (fr) { eco(j, m.x, m.y, fr, 5, '#e0c8ff'); msg(j, fr, '#d0b0ff'); }
      m.estado = 'perseguir'; m.objetivo = h; j.jefe = m; Sonido.musica('jefe' as any); Sonido.susurro();
    }
    if ((m as any).huye && m.vida <= m.vidaMax * 0.5) huir(j, m, acto);
  }
}
function huir(j: Juego, m: Monstruo, acto: number) {
  const d = j.heroe.d, hh = hist(d);
  const fr = HERALDO.huida[acto] ?? HERALDO.huida[1];
  eco(j, m.x, m.y, fr, 5, '#e0c8ff'); msg(j, fr, '#d0b0ff');
  msg(j, ['Vesperio se deshace en ceniza pálida y escapa.', 'Vesperio dissolves into pale ash and escapes.'], '#a090c0');
  efecto(j, 'destello_teleporte', m.x, m.y, 0, 1.4); efecto(j, 'paso_sombrio', m.x, m.y, 0, 1.2);
  particulas(j, m.x, m.y, 30, 'chispa', '#d8c8ff', 1.6, 50);
  Sonido.efecto('portal' as any); Sonido.susurro();
  soltar(j, m.x, m.y, [{ oro: 150 * acto }]);
  j.monstruos = j.monstruos.filter((q) => q !== m);
  if (j.jefe === m) j.jefe = null;
  const z = ZONAS[j.zona.id]; if (z) Sonido.musica(MUSICA_ACTO(z.acto, z.tipo) as any);
  (hh.heraldo ??= []).includes(acto) || hh.heraldo.push(acto);
  j.eventos.push({ tipo: 'heraldo_huye', dato: acto });
}
