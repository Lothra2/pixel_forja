// La historia en juego: estado de las misiones, lo que dice cada uno según lo que pasó, los diarios de los sellos,
// los fantasmas que repiten su última escena y Vesperio, el heraldo que huye en cada acto hasta la Fragua.
import { MISIONES, DIARIOS, PAGINAS, FANTASMAS, HERALDO, ZONAS, MUSICA_ACTO, POBL_ZONA, daMision, type Mision, type FinalElegido } from '../mundo/actos';
import { DIALOGOS, NPCS, type Linea } from '../datos/npcs';
import { MONSTRUOS, POBLACION } from '../datos/monstruos';
import { pasable, libreCerca, type ObjZ } from '../mundo/zona';
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
  /** Avance de las misiones con varios pasos (pistas halladas, reliquias en la mano, altares encendidos). */
  misionProg?: Record<string, number>;
}
export const hist = (d: DatosHeroe) => d as DatosHeroe & Historia;
export const estadoMision = (d: DatosHeroe, id: string) => d.misiones[id] ?? 0;
export const eleccionDe = (d: DatosHeroe, id: string) => hist(d).elecciones?.[id];
export const finalDe = (d: DatosHeroe) => hist(d).finalElegido;
/** Al empezar otra dificultad la historia vuelve a empezar. */
export function reiniciarHistoria(d: DatosHeroe) { const h = hist(d); h.elecciones = {}; h.heraldo = []; h.heraldoMuerto = false; h.finalElegido = undefined; h.misionProg = {}; (d as any).jefesVistos = []; }

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
  misionesEntrar(j);
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
  misionesPaso(j, dt);
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

// ------------------------------------------------------------------ misiones de varios pasos: investigar, ritual, purgar, escoltar y cazar
export const prog = (d: DatosHeroe) => (hist(d).misionProg ??= {});
const bits = (n: number) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
/** Avance para mostrar en el panel de misiones ("2/3"), o null si la misión no tiene pasos. */
export function avanceDe(d: DatosHeroe, m: Mision): string | null {
  const o = m.objetivo, p = prog(d);
  if (o.tipo === 'pistas') return `${bits(p[m.id] ?? 0)}/${o.pistas.length}`;
  if (o.tipo === 'ritual') return `${p[m.id] ?? 0}/${o.n}`;
  if (o.tipo === 'purgar') return `${o.n}`;
  return null;
}
function cumplir(j: Juego, m: Mision) {
  const d = j.heroe.d;
  if (estadoMision(d, m.id) !== 1) return;
  d.misiones[m.id] = 2;
  j.eventos.push({ tipo: 'mision', dato: m.id });
}
/** Lugares repartidos por la zona, lejos de donde entras y lejos entre sí. */
function lugaresLejos(j: Juego, n: number, minDist = 8): [number, number][] {
  const z = j.zona, h = j.heroe;
  const cand: [number, number][] = [...z.spawns.filter((s) => s.tipo !== 'jefe').map((s) => [s.cx, s.cy] as [number, number]), ...z.marcas.map((m) => [m.cx, m.cy] as [number, number])]
    .filter(([x, y]) => dist(x, y, h.x, h.y) > minDist);
  const out: [number, number][] = [];
  while (out.length < n && cand.length) {
    let mejor = 0, md = -1;
    for (let i = 0; i < cand.length; i++) { const c = cand[i]; const dm = Math.min(dist(c[0], c[1], h.x, h.y), ...out.map((o) => dist(o[0], o[1], c[0], c[1]))); if (dm > md) { md = dm; mejor = i; } }
    const c = cand.splice(mejor, 1)[0]; const q = libreCerca(z, c[0] + 1, c[1] + 1); out.push(q);
  }
  while (out.length < n) { const q = libreCerca(z, h.x + 6 + out.length * 3, h.y + 6); out.push(q); }
  return out;
}
function ponerObjeto(j: Juego, id: string, v: string, x: number, y: number, tag: string, dato: any): ObjZ {
  const o: ObjZ = { id, v, cx: x, cy: y, hw: 1, hh: 1, bloquea: false, tag, dato };
  j.zona.objetos.push(o);
  return o;
}
/** Al entrar a una zona: lo que piden las misiones activas de aquí. */
function misionesEntrar(j: Juego) {
  const z = j.zona, h = j.heroe, d = h.d;
  const puestas: Record<string, boolean> = ((z as any).misionPuesta ??= {});
  for (const m of MISIONES) {
    const o = m.objetivo;
    if (o.zona !== z.id || estadoMision(d, m.id) !== 1) continue;
    const p = prog(d);
    if (o.tipo === 'pistas' && !puestas[m.id]) {
      puestas[m.id] = true;
      const ls = lugaresLejos(j, o.pistas.length);
      o.pistas.forEach((pi, i) => { if (!((p[m.id] ?? 0) & (1 << i))) ponerObjeto(j, pi.obj, pi.v, ls[i][0], ls[i][1], 'pista', { mision: m.id, i }); });
      msg(j, [`${m.nombre[0]}: busca las señales. Brillan si te acercas.`, `${m.nombre[1]}: look for the signs. They glow when you are near.`], '#ffd080');
    }
    if (o.tipo === 'ritual' && !puestas[m.id]) {
      puestas[m.id] = true;
      const hechos = p[m.id] ?? 0, enMano = p[m.id + ':mano'] ?? 0;
      const faltan = o.n - hechos - enMano;
      const ls = lugaresLejos(j, faltan + o.n);
      for (let i = 0; i < faltan; i++) ponerObjeto(j, o.reliquia[0], o.reliquia[1], ls[i][0], ls[i][1], 'reliquia', { mision: m.id });
      for (let i = 0; i < o.n; i++) ponerObjeto(j, o.altar[0], i < hechos ? o.altar[2] : o.altar[1], ls[faltan + i][0], ls[faltan + i][1], i < hechos ? '' : 'altar', { mision: m.id });
      msg(j, [`${m.nombre[0]}: recoge las reliquias y llévalas a los altares.`, `${m.nombre[1]}: gather the relics and bring them to the altars.`], '#ffd080');
    }
    if (o.tipo === 'purgar') {
      const muertos = j.monstruos.filter((q) => q.muerto && !q.dueno).length;
      (j as any).purga = { id: m.id, t: o.tiempo, n: o.n, base: muertos, oleada: 0 };
      msg(j, [`${m.nombre[0]}: mata ${o.n} antes de que pasen ${Math.round(o.tiempo / 60 * 10) / 10} minutos.`, `${m.nombre[1]}: kill ${o.n} before ${Math.round(o.tiempo / 60 * 10) / 10} minutes pass.`], '#ff8060');
      Sonido.efecto('campana', { vol: 0.6 });
    }
    if (o.tipo === 'escoltar' && !j.monstruos.some((q) => (q as any).escolta === m.id && !q.muerto)) {
      const def = MONSTRUOS[o.sprite] ?? MONSTRUOS.penitente;
      const q = libreCerca(z, h.x + 1.5, h.y + 1);
      const e = crearMonstruo({ ...def, id: 'escolta_' + m.id, ia: 'normal', proyectil: undefined, invoca: undefined, jefe: false } as any, d.nivel, q[0] + 0.5, q[1] + 0.5, 0, 0);
      e.tipo = 'invocado'; e.dueno = true; e.invocaId = 'escolta'; e.estado = 'deambular'; e.nombre = o.nombre;
      e.vidaMax = e.vida = Math.round(h.vidaMax * 1.6); e.dano = [Math.max(1, Math.round(e.dano[0] * 0.5)), Math.max(2, Math.round(e.dano[1] * 0.5))];
      (e as any).escolta = m.id;
      j.monstruos.push(e);
      const dest = lugaresLejos(j, 1, 18)[0];
      (j as any).destinoEscolta = { id: m.id, x: dest[0] + 0.5, y: dest[1] + 0.5 };
      ponerObjeto(j, 'campo_altar', 'velas', dest[0], dest[1], 'destino', { mision: m.id });
      eco(j, e.x, e.y, o.inicio, 6, '#e0d0a0'); msg(j, o.inicio, '#e0d0a0');
    }
    if (o.tipo === 'cazar' && !puestas[m.id]) {
      puestas[m.id] = true;
      const def = MONSTRUOS[o.monstruo]; if (!def) continue;
      const lugar = lugaresLejos(j, 1, 14)[0];
      const u = crearMonstruo(def, nivelEnDificultad(z.nivel, d.dificultad) + 2, lugar[0] + 0.5, lugar[1] + 0.5, 2, d.dificultad);
      u.nombre = o.nombre; u.misionUnico = m.id; u.mods = ['fuerte']; u.escala *= 1.12; u.estado = 'dormido';
      if (o.frase) (FRASE_CAZA as any)[u.id] = o.frase;
      j.monstruos.push(u);
    }
  }
}
const FRASE_CAZA: Record<number, [string, string]> = {};
/** Cada cuadro: purga, escolta y que las cosas de misión llamen la atención. */
function misionesPaso(j: Juego, dt: number) {
  const h = j.heroe, d = h.d;
  // purga: contar muertos y mandar oleadas si la zona se queda sin gente
  const pu = (j as any).purga as { id: string; t: number; n: number; base: number; oleada: number } | undefined;
  if (pu) {
    const m = MISIONES.find((q) => q.id === pu.id);
    if (!m || estadoMision(d, pu.id) !== 1 || m.objetivo.zona !== j.zona.id) (j as any).purga = undefined;
    else {
      pu.t -= dt; pu.oleada -= dt;
      const hechos = j.monstruos.filter((q) => q.muerto && !q.dueno).length - pu.base;
      (pu as any).hechos = hechos;
      if (hechos >= pu.n) { (j as any).purga = undefined; cumplir(j, m); msg(j, [`${m.nombre[0]}: purgado. Vuelve con quien te lo pidió.`, `${m.nombre[1]}: purged. Return to whoever asked.`], '#80ff80'); Sonido.efecto('mision'); }
      else if (pu.t <= 0) { (j as any).purga = undefined; msg(j, ['Se acabó el tiempo. La podredumbre vuelve a cerrarse. Sal y entra otra vez para intentarlo.', 'Time is up. The rot closes in again. Leave and come back to try again.'], '#ff6060'); Sonido.susurro(); }
      else if (pu.oleada <= 0) {
        pu.oleada = 6;
        const vivos = j.monstruos.filter((q) => !q.muerto && !q.dueno && dist(q.x, q.y, h.x, h.y) < 16).length;
        if (vivos < 8) {
          const pool = POBLACION[POBL_ZONA[j.zona.id] ?? ''] ?? ['zombi'];
          for (let k = 0; k < 5; k++) {
            const a = R() * Math.PI * 2, r = 9 + R() * 4; const x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r;
            if (!pasable(j.zona, x, y)) continue;
            const id = pool[Math.floor(R() * pool.length)]; const def = MONSTRUOS[id]; if (!def) continue;
            const q = crearMonstruo(def, nivelEnDificultad(j.zona.nivel, d.dificultad), x, y, 0, d.dificultad);
            q.estado = 'perseguir'; q.objetivo = h; (q as any).surgiendo = 1; q.acc = 'morir'; q.t = 0;
            j.monstruos.push(q);
          }
        }
      }
    }
  }
  // escolta: llegar al destino o caer
  const de = (j as any).destinoEscolta as { id: string; x: number; y: number } | undefined;
  if (de) {
    const m = MISIONES.find((q) => q.id === de.id);
    const e = j.monstruos.find((q) => (q as any).escolta === de.id);
    if (!m || m.objetivo.tipo !== 'escoltar' || estadoMision(d, de.id) !== 1) (j as any).destinoEscolta = undefined;
    else if (m.objetivo.zona === j.zona.id) {
      const o = m.objetivo;
      if (!e || e.muerto) {
        (j as any).destinoEscolta = undefined;
        if (e) { eco(j, e.x, e.y, o.muerte, 6, '#ff8080'); j.monstruos = j.monstruos.filter((q) => q !== e); }
        msg(j, o.muerte, '#ff6060'); msg(j, ['Sal de la zona y vuelve a entrar para intentarlo otra vez.', 'Leave the zone and enter again to try once more.'], '#c08060');
        const pz = (j.zona as any).misionPuesta; if (pz) pz[de.id] = false;
      } else if (dist(e.x, e.y, de.x, de.y) < 3.5) {
        (j as any).destinoEscolta = undefined;
        eco(j, e.x, e.y, o.llegada, 7, '#e0d0a0'); msg(j, o.llegada, '#e0d0a0');
        efecto(j, 'destello_teleporte', e.x, e.y, 0, 1.2);
        j.monstruos = j.monstruos.filter((q) => q !== e);
        cumplir(j, m); Sonido.efecto('mision');
      }
    }
  }
  // frases de los cazados al verte
  for (const q of j.monstruos) { const fr = FRASE_CAZA[q.id]; if (fr && !q.muerto && !(q as any).dijo && dist(q.x, q.y, h.x, h.y) < 9) { (q as any).dijo = true; eco(j, q.x, q.y, fr, 5, '#ff9070'); msg(j, fr, '#ff9070'); Sonido.susurro(); } }
}
/** Usar un objeto de misión (pista, reliquia o altar). Devuelve true si era de misión. */
export function usarObjetoMision(j: Juego, o: ObjZ): { titulo: [string, string]; texto: [string, string]; n: number; total: number } | boolean {
  const d = j.heroe.d; const m = MISIONES.find((q) => q.id === o.dato?.mision); if (!m) return false;
  const p = prog(d), ob = m.objetivo;
  if (o.tag === 'pista' && ob.tipo === 'pistas') {
    const i = o.dato.i as number; p[m.id] = (p[m.id] ?? 0) | (1 << i);
    o.tag = undefined; Sonido.efecto('abrir'); Sonido.susurro();
    const n = bits(p[m.id]);
    if (n >= ob.pistas.length) cumplir(j, m);
    return { titulo: m.nombre, texto: ob.pistas[i].texto, n, total: ob.pistas.length };
  }
  if (o.tag === 'reliquia' && ob.tipo === 'ritual') {
    p[m.id + ':mano'] = (p[m.id + ':mano'] ?? 0) + 1;
    j.zona.objetos = j.zona.objetos.filter((x) => x !== o);
    particulas(j, o.cx + 0.5, o.cy + 0.5, 14, 'chispa', '#ffd080', 1, 30); Sonido.efecto('recoger' as any);
    msg(j, [`Llevas ${p[m.id + ':mano']} reliquia${p[m.id + ':mano'] > 1 ? 's' : ''}. Busca un altar.`, `You carry ${p[m.id + ':mano']} relic${p[m.id + ':mano'] > 1 ? 's' : ''}. Find an altar.`], '#ffd080');
    return true;
  }
  if (o.tag === 'altar' && ob.tipo === 'ritual') {
    if (!(p[m.id + ':mano'] > 0)) { msg(j, ['El altar espera algo que no tienes. Busca las reliquias.', 'The altar awaits something you lack. Find the relics.'], '#c0a080'); return true; }
    p[m.id + ':mano']--; p[m.id] = (p[m.id] ?? 0) + 1;
    o.v = ob.altar[2]; o.tag = undefined;
    efecto(j, 'circulo_invocacion', o.cx + 0.5, o.cy + 0.5, 0, 1); particulas(j, o.cx + 0.5, o.cy + 0.5, 30, 'chispa', '#ff9040', 1.4, 40);
    Sonido.efecto('santuario'); j.sacudida = 0.3;
    msg(j, [`Altar encendido: ${p[m.id]}/${ob.n}.`, `Altar lit: ${p[m.id]}/${ob.n}.`], '#ffd080');
    if (p[m.id] >= ob.n) {
      if (ob.guardian && MONSTRUOS[ob.guardian]) {
        // al cerrar el ritual algo despierta: hay que vencerlo para cumplir
        const def = MONSTRUOS[ob.guardian]; const q = libreCerca(j.zona, o.cx + 2, o.cy + 2);
        const g = crearMonstruo(def, nivelEnDificultad(j.zona.nivel, d.dificultad) + 2, q[0] + 0.5, q[1] + 0.5, 2, d.dificultad);
        g.nombre = [`Guardián de ${m.nombre[0]}`, `Guardian of ${m.nombre[1]}`]; g.misionUnico = m.id; g.estado = 'perseguir'; g.objetivo = j.heroe; (g as any).surgiendo = 1.2; g.acc = 'morir'; g.t = 0;
        j.monstruos.push(g); j.jefe = g; Sonido.efecto('rugido_jefe' as any);
        msg(j, ['El último altar arde y algo sube desde el suelo.', 'The last altar burns and something rises from the ground.'], '#ff6040');
      } else cumplir(j, m);
    }
    return true;
  }
  return false;
}
