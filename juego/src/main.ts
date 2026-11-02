// Réquiem de Ceniza: arranque, estados (carga, intro, menú, elegir, crear, juego) y el control del héroe.
import { ctx, W, H, E, ajustar, instalarEntrada, finCuadro, pulso, alPrimerGesto } from './nucleo/lienzo';
import { cargarManifiesto, asegurar, atlasDe, clavesCon, manifiesto, objetoMeta } from './motor/assets';
import { pintarHeroe, progresoPintura } from './motor/pintor';
import { Sonido } from './audio/sonido';
import { T, TT, texto, IDI, fijarIdioma, tooltip } from './ui/comun';
import { dibujarFinal, dibujarEntreacto, dibujarRevelacion } from './ui/menus';
import { historiaEntrar, historiaPaso, leerLibro, hist, finalDe, reiniciarHistoria, estadoMision } from './juego/historia';
import { dibujarHistoria } from './ui/historia_ui';
import { FANTASMAS, HERALDO, type FinalElegido } from './mundo/actos';
import { cargarOpciones, opciones, guardarOpciones, dibujarIntro, menuPrincipal, dibujarSeleccion, dibujarCrear, dibujarOpciones, pantallaCarga } from './ui/menus';
import { abrirTienda } from './ui/juego_ui';
import { ui, dibujarBarra, dibujarPaneles, dibujarArriba, dibujarCursor, dibujarTooltipObjeto, dibujarMapa, dibujarMuerte, hablarCon, alternar, prepararHud, lugarEn, COFRE_W, COFRE_H } from './ui/juego_ui';
import { dibujarMundo, picks, aMundo, aPant, opciones as opcionesRender, type Pick } from './render/escena';
import { crearJuego, entrarZona, actualizar, usarHabilidad, habilidadDe, caminarA, usarPocion, curarEnTiempo, recogerSuelo, abrirPortal, recalc, soltar, efecto, msg, particulas, olvidarZonas, esDistancia, tramoThor, type Juego, type Monstruo, type Npc, type Suelo } from './juego/mundo';
import { nuevoHeroe, firmaVisual, equipoVisual, cuerpoDe, type DatosHeroe, type EnBolsa, nivelEnDificultad } from './juego/heroe';
import { botin, colorObj, crearObjeto } from './juego/objetos';
import { ZONAS, PUEBLO_DE, MUSICA_ACTO, ENTRADA_ZONA, MISIONES, POBL_ZONA } from './mundo/actos';
import { POBLACION, MONSTRUOS } from './datos/monstruos';
import { GENTE } from './datos/npcs';
import { CLASES } from './datos/clases';
import { dist, R, elegir } from './nucleo/azar';
import { pasable, type ObjZ, type Salida } from './mundo/zona';

type Estado = 'carga' | 'intro' | 'menu' | 'seleccion' | 'crear' | 'opciones' | 'juego' | 'zona' | 'final' | 'entreacto' | 'revelacion';
let finalT = 0;
// historia: la cinemática entre actos espera a que se cierre el diálogo; la revelación lleva al final si se elige al caer Aun-Saar
let entreActo = 0, entreActoPendiente = 0, entreT = 0;
let revT = 0, revEleccion: FinalElegido | null = null, revLuegoFinal = false;
let estado: Estado = 'carga';
let tEstado = 0, tiempo = 0;
let cargaK = 0, cargaMsg = '';
let j: Juego | null = null;
let heroes: DatosHeroe[] = [];
let sel = 0, selClase: number | null = null;
let opcionesDesde: Estado = 'menu';
let zonaPendiente: { id: string; entrada: string } | null = null;
let guardadoT = 0;
let pickEncima: Pick | null = null;

// ------------------------------------------------------------------ guardado
function cargarPartidas() { try { heroes = JSON.parse(localStorage.getItem('marca.heroes') ?? '[]'); } catch { heroes = []; } }
function guardarPartidas() {
  try { localStorage.setItem('marca.heroes', JSON.stringify(heroes)); } catch { /* sin espacio */ }
}
function cargarCofre(): EnBolsa[] { try { return JSON.parse(localStorage.getItem('marca.cofre') ?? '[]'); } catch { return []; } }
function guardarCofre() { try { localStorage.setItem('marca.cofre', JSON.stringify(ui.cofre)); } catch { /* nada */ } }
function guardar() {
  if (!j) return;
  const d = j.heroe.d;
  d.vidaActual = Math.max(1, j.heroe.vida); d.manaActual = j.heroe.mana;
  // se guarda en el pueblo del acto (las zonas se regeneran al volver)
  const i = heroes.findIndex((h) => h.id === d.id);
  const copia: DatosHeroe = JSON.parse(JSON.stringify(d));
  if (ZONAS[copia.zona]?.tipo !== 'pueblo') copia.zona = PUEBLO_DE[copia.acto];
  if (i >= 0) heroes[i] = copia; else heroes.unshift(copia);
  guardarPartidas(); guardarCofre();
}

// ------------------------------------------------------------------ carga de atlas
async function cargarBase() {
  cargaMsg = T('Despertando el valle...', 'Waking the valley...');
  await cargarManifiesto();
  const m = manifiesto();
  const temas = ['campamento', 'monasterio', 'cementerio', 'arboles', 'campo', 'comun', 'armas'];
  const atl = new Set<string>([...atlasDe('p', Object.keys(m.p)), ...atlasDe('o', Object.keys(m.o).filter((k) => temas.includes(m.o[k].tema))), ...atlasDe('m', clavesCon('m', 'zombi/')), ...atlasDe('m', clavesCon('m', 'cultista/'))]);
  for (const c of CLASES) for (const k of ['quieto', 'atacar']) for (const a of atlasDe('h', clavesCon('h', `${c.id}/${k}/`))) atl.add(a);
  await asegurar(atl, (h, t) => { cargaK = t ? h / t : 1; });
}
function atlasZona(zid: string): Set<string> {
  const m = manifiesto();
  const z = j!.zona && j!.zona.id === zid ? j!.zona : null;
  const s = new Set<string>();
  const ids = new Set<string>();
  if (z) for (const o of z.objetos) ids.add(`${o.id}|${o.v}`);
  // piezas que cambian de variante con la historia (la catedral): todas sus variantes
  if (z) for (const sa of z.salidas) for (const o of sa.piezas ?? []) for (const k of Object.keys(m.o)) if (k.startsWith(o.id + '|')) ids.add(k);
  // por tema si todavía no hay zona
  for (const k of Object.keys(m.o)) if (ids.has(k)) for (const e of m.o[k].f) s.add(e[0]);
  for (const a of atlasDe('p', Object.keys(m.p))) s.add(a);
  for (const a of atlasDe('h', clavesCon('h', `${j!.heroe.d.clase}/`))) s.add(a);
  const pool = POBLACION[POBL_ZONA[zid] ?? ''] ?? [];
  const def = ZONAS[zid];
  const mons = new Set(pool.map((p) => MONSTRUOS[p]?.sprite).filter(Boolean));
  if (def.jefe) mons.add(MONSTRUOS[def.jefe]?.sprite);
  if (Object.values(HERALDO.zonas).includes(zid)) mons.add(MONSTRUOS[HERALDO.id]?.sprite);
  for (const f of FANTASMAS) if (f.zona === zid) mons.add(f.sprite);
  for (const p of pool) { const inv = MONSTRUOS[p]?.invoca; if (inv) mons.add(MONSTRUOS[inv]?.sprite); }
  for (const id of mons) for (const a of atlasDe('m', clavesCon('m', `${id}/`))) s.add(a);
  if (def.tipo === 'pueblo') for (const n of GENTE[def.acto] ?? []) for (const a of atlasDe('m', clavesCon('m', `${n}/`))) s.add(a);
  for (const a of atlasDe('w', Object.keys(m.w ?? {}))) s.add(a);
  // íconos del equipo de Thor
  for (const a of atlasDe('o', ['thor_icono_collar|icono', 'thor_icono_barda|icono', 'thor_icono_collar|suelo'])) s.add(a);
  // invocaciones del héroe
  for (const id of ['esqueleto', 'esqueleto_arquero', 'ogro', 'necrofago', 'espectro', `thor_${tramoThor(j!.heroe.d)}`, `thor_${Math.min(5, tramoThor(j!.heroe.d) + 1)}`]) for (const a of atlasDe('m', clavesCon('m', `${id}/`))) s.add(a);
  // armas del arsenal para íconos
  for (const k of Object.keys(m.o)) if (k.startsWith('arma_') && (k.endsWith('|flota') || k.endsWith('|suelo'))) for (const e of m.o[k].f) s.add(e[0]);
  return s;
}
async function irAZona(id: string, entrada: string) {
  if (!j) return;
  estado = 'zona'; tEstado = 0; cargaK = 0; cargaMsg = TT(ZONAS[id].nombre);
  ui.izq = ui.der = null; ui.mano = null;
  await new Promise((r) => setTimeout(r, 30));
  entrarZona(j, id, entrada);
  historiaEntrar(j);
  await asegurar(atlasZona(id), (h, t) => { cargaK = t ? h / t : 1; });
  const z = ZONAS[id];
  Sonido.musica(MUSICA_ACTO(z.acto, z.tipo) as any);
  Sonido.ambiente(z.tipo === 'mazmorra' ? 'cueva' : z.lluvia ? 'lluvia' : z.acto === 3 ? 'selva' : z.acto === 5 ? 'infierno' : z.tipo === 'pueblo' ? 'fuego' : 'viento');
  guardar();
  estado = 'juego'; tEstado = 0;
  const frase = ENTRADA_ZONA[id];
  if (frase && !(j as any).vistas?.has(id)) { ((j as any).vistas ??= new Set()).add(id); msg(j, frase, '#c0a0a0'); }
  msg(j, ZONAS[id].nombre, '#e0c890');
  if (z.tipo !== 'pueblo') pista('fuera', ['Clic izquierdo sobre un monstruo para pegarle. Clic derecho lanza tu poder. 1 a 4 toma pociones.', 'Left click a monster to strike it. Right click casts your power. 1 to 4 drinks potions.']);
  if (z.tipo === 'mazmorra') pista('mazmorra', ['Está oscuro aquí abajo. Si te ves mal, B abre un portal al campamento.', 'It is dark down here. If things go badly, B opens a portal to camp.']);
}
function pista(id: string, txt: [string, string]) {
  if (!j) return;
  const d = j.heroe.d as any; d.pistas ??= {};
  if (d.pistas[id]) return; d.pistas[id] = 1;
  msg(j, txt, '#80d0ff');
}

async function empezarPartida(d: DatosHeroe) {
  olvidarZonas();
  // atajos: los que no tengan, se llenan con las habilidades aprendidas
  while (d.atajos.length < 10) d.atajos.push(null);
  for (const id of Object.keys(d.habs)) { const hb = habilidadDe(id); if (hb.tipo !== 'pasiva' && !d.atajos.includes(id)) { const i = d.atajos.findIndex((a) => !a); if (i >= 0) d.atajos[i] = id; } }
  j = crearJuego(d, IDI);
  ui.cofre = cargarCofre();
  const zid = ZONAS[d.zona] ? d.zona : PUEBLO_DE[d.acto] ?? 'a1_refugio';
  await irAZona(zid, 'centro');
  pintarHeroe(d.clase, cuerpoDe(d.clase), equipoVisual(d), firmaVisual(d));
  if (!d.misiones.m1_hambre && d.nivel === 1) msg(j, ['Habla con el Maestre Odrán junto al fuego.', 'Speak with Master Odran by the fire.'], '#ffd080');
}

// ------------------------------------------------------------------ control del héroe
let mantenerT = 0, derT = 0;
function encimaDe(): Pick | null {
  let best: Pick | null = null;
  // las etiquetas del botín ganan: si el nombre está a la vista, el clic es para recogerlo (antes un monstruo detrás se lo robaba)
  const prio = (p: Pick) => (p.tipo === 'suelo' ? 5 : p.tipo === 'monstruo' ? 4 : p.tipo === 'npc' ? 3 : p.tipo === 'portal' ? 2.5 : p.tipo === 'objeto' ? 2 : 1);
  for (const p of picks) if (E.x >= p.x0 && E.x <= p.x1 && E.y >= p.y0 && E.y <= p.y1) if (!best || prio(p) > prio(best) || (prio(p) === prio(best) && p.prof > best.prof)) best = p;
  return best;
}
function etiquetasBotin(jj: Juego) {
  // nombres del botín en el piso (siempre los cercanos; con Alt todos)
  const h = jj.heroe;
  const usadas: [number, number, number, number][] = [];
  ctx.font = '12px Georgia, serif';
  const lista = jj.suelo.filter((s) => E.alt || dist(s.x, s.y, h.x, h.y) < 9).sort((a, b) => a.y + a.x - b.y - b.x);
  for (const s of lista) {
    const [px, py] = aPant(s.x, s.y);
    const txt = s.oro ? `${s.oro} ${T('de oro', 'gold')}` : TT(s.o!.nombre);
    const w = ctx.measureText(txt).width + 10, hh = 16;
    let x = px - w / 2, y = py - 28;
    for (let k = 0; k < 40 && usadas.some(([a, b, c, d]) => x < a + c && x + w > a && y < b + d && y + hh > b); k++) y -= hh + 1;
    usadas.push([x, y, w, hh]);
    const encima = E.x >= x && E.x <= x + w && E.y >= y && E.y <= y + hh;
    ctx.fillStyle = encima ? 'rgba(40,40,80,0.85)' : 'rgba(0,0,0,0.7)'; ctx.fillRect(x, y, w, hh);
    texto(txt, px, y + 12, { alin: 'center', tam: 12, color: s.oro ? '#e8c050' : colorObj(s.o!) });
    picks.push({ tipo: 'suelo', ref: s, x0: x, y0: y, x1: x + w, y1: y + hh, prof: 1e9 });
  }
}

function controlar(jj: Juego, dt: number) {
  const h = jj.heroe;
  // teclas
  if (pulso('i')) alternar('inv', 'der');
  if (pulso('c')) alternar('pers', 'izq');
  if (pulso('t') || pulso('s') && false) alternar('habs', 'der');
  if (pulso('q')) alternar('misiones', 'izq');
  if (pulso('Tab') || pulso('m')) ui.mapa = !ui.mapa;
  if (pulso('r')) h.correr = !h.correr;
  if (pulso('b')) abrirPortal(jj);
  for (let i = 1; i <= 4; i++) if (pulso(String(i))) usarPocion(jj, i - 1);
  for (let k = 1; k <= 10; k++) if (pulso('F' + k) && ui.der !== 'elegirHab') { const id = h.d.atajos[k - 1]; if (id) { h.d.der = id; recalc(jj); } }
  for (const [tecla, k] of [['5', 0], ['6', 1], ['7', 2], ['8', 3], ['9', 4], ['0', 5]] as [string, number][]) if (pulso(tecla)) { const id = h.d.atajos[k]; if (id) { h.d.der = id; recalc(jj); Sonido.efecto('click'); } }
  if (pulso('Escape')) {
    if (h.muerto) { revivir(jj); return; }
    if (ui.izq || ui.der || ui.mapa) { ui.izq = ui.der = null; ui.mapa = false; } else ui.izq = 'menu';
  }
  if (h.muerto) { if (E.clicIzq && tEstado > 1) revivir(jj); return; }
  curarEnTiempo(jj, dt);
  if (ui.izq === 'cofre' && dist(h.x, h.y, (ui as any).cofreX ?? h.x, (ui as any).cofreY ?? h.y) > 4) ui.izq = null;
  if (ui.izq !== 'cofre' && (ui as any).baul) { (ui as any).baul.v = 'cerrado'; (ui as any).baul = null; Sonido.efecto('puerta', { vol: 0.5 }); }
  pickEncima = ui.sobreUI ? null : encimaDe();
  const [mx, my] = aMundo(E.x, E.y);
  // soltar lo que tengo en la mano al piso
  if (E.clicIzq && ui.mano && !ui.sobreUI) { jj.suelo.push({ o: ui.mano, oro: 0, x: h.x + 0.6, y: h.y + 0.6, t: 0, id: Date.now() }); ui.mano = null; E.clicIzq = false; return; }
  if (!ui.sobreUI) {
    if (E.clicIzq) {
      mantenerT = 0;
      h.objetivo = null; h.recoger = null; h.hablar = null; h.usar = null; (h as any).salida = null; (h as any).portal = false;
      const p = pickEncima;
      if (E.shift) { usarHabilidad(jj, h.d.izq, mx, my, p?.tipo === 'monstruo' ? p.ref : null); }
      else if (p?.tipo === 'monstruo') h.objetivo = p.ref as Monstruo;
      else if (p?.tipo === 'npc') h.hablar = p.ref as Npc;
      else if (p?.tipo === 'suelo') h.recoger = p.ref as Suelo;
      else if (p?.tipo === 'objeto') h.usar = p.ref as ObjZ;
      else if (p?.tipo === 'salida') (h as any).salida = p.ref as Salida;
      else if (p?.tipo === 'portal') (h as any).portal = true;
      else caminarA(jj, mx, my);
      if (h.recoger || h.usar || h.hablar || (h as any).salida || (h as any).portal) { const r = h.recoger ?? h.usar ?? h.hablar ?? (h as any).salida; if ((h as any).portal) { const pp = jj.zona.tipo === 'pueblo' ? jj.zona.entradas.portal : [jj.portal!.x, jj.portal!.y]; caminarA(jj, pp[0], pp[1]); } else caminarA(jj, (r.x ?? r.cx + 0.5), (r.y ?? r.cy + 0.5)); }
    } else if (E.izq && !h.objetivo && !h.recoger && !h.usar && !h.hablar && !(h as any).salida) {
      mantenerT += dt;
      if (E.shift) { usarHabilidad(jj, h.d.izq, mx, my, null); }
      else if (mantenerT > 0.12) { mantenerT = 0; caminarA(jj, mx, my); }
    }
    // botón derecho: la habilidad derecha
    if (E.der) {
      derT -= dt;
      if (E.clicDer || derT <= 0) {
        derT = 0.05;
        const p = pickEncima;
        const hb = habilidadDe(h.d.der);
        const obj = p?.tipo === 'monstruo' ? (p.ref as Monstruo) : null;
        if (hb.tipo === 'golpe' && !(h.d.der === 'ataque' && h.c.distancia)) { if (obj) { h.objetivo = obj; (h as any).usarDer = true; } }
        else usarHabilidad(jj, h.d.der, obj ? obj.x : mx, obj ? obj.y : my, obj);
      }
    } else (h as any).usarDer = false;
  }
  // táctil: el botón usa la habilidad sobre el enemigo más cercano
  if ((ui as any).tactilHab) {
    const lado = (ui as any).tactilHab as 'izq' | 'der'; (ui as any).tactilHab = null;
    let best: Monstruo | null = null, bd = 10;
    for (const m of jj.monstruos) if (!m.muerto && !m.dueno && m.estado !== 'surgir') { const d = dist(m.x, m.y, h.x, h.y); if (d < bd) { bd = d; best = m; } }
    const hb = habilidadDe(h.d[lado]);
    if (best && hb.tipo === 'golpe' && !(h.d[lado] === 'ataque' && h.c.distancia)) { h.objetivo = best; (h as any).usarDer = lado === 'der'; }
    else usarHabilidad(jj, h.d[lado], best ? best.x : h.x + 3, best ? best.y : h.y + 3, best);
  }
  // perseguir y atacar
  if (h.objetivo) {
    const m = h.objetivo;
    if (m.muerto || m.estado === 'surgir') { h.objetivo = null; }
    else {
      const id = (h as any).usarDer ? h.d.der : h.d.izq;
      const hb = habilidadDe(id);
      const dd = dist(h.x, h.y, m.x, m.y);
      const lejos = esDistancia(jj, hb) || (id === 'ataque' && h.c.distancia);
      const alcance = lejos ? 9 : (h.c.tipoArma === 'lanza' || h.c.tipoArma === 'alabarda' || h.c.tipoArma === 'guadana' ? 2.0 : 1.4) + m.radio;
      if (dd <= alcance) { h.camino = null; if (h.acc !== 'atacar' && h.acc !== 'lanzar') usarHabilidad(jj, id, m.x, m.y, m); if (!E.izq && !E.der && h.acc !== 'atacar' && h.acc !== 'lanzar') h.objetivo = null; }
      else if (h.acc !== 'atacar' && h.acc !== 'lanzar') { (h as any).repath = ((h as any).repath ?? 0) - dt; if (!h.camino || (h as any).repath <= 0) { (h as any).repath = 0.3; caminarA(jj, m.x, m.y); } }
    }
  }
  // llegar a cosas
  const llega = (x: number, y: number, r = 1.6) => dist(h.x, h.y, x, y) <= r;
  if (h.recoger && llega(h.recoger.x, h.recoger.y, 1.3)) { recogerSuelo(jj, h.recoger); h.recoger = null; h.camino = null; pista('botin', ['Pulsa I para ver tu inventario. Clic derecho sobre un objeto para ponértelo.', 'Press I for your inventory. Right click an item to equip it.']); }
  if (h.hablar && llega(h.hablar.x, h.hablar.y, 2)) { hablarCon(jj, h.hablar.npc); h.hablar = null; h.camino = null; }
  if (h.usar && llega(h.usar.cx + 0.5, h.usar.cy + 0.5, 2.2 + Math.max(h.usar.hw, h.usar.hh) / 2)) { usarObjeto(jj, h.usar); h.usar = null; h.camino = null; }
  // puertas selladas por la historia: la variante del objeto sigue a la misión y no se puede pasar antes
  for (const s of jj.zona.salidas) if (s.sello && s.obj) {
    // sellada hasta aceptar la misión, entera después y herida cuando se cumple la otra (la catedral tras la Abadesa)
    const quiere = estadoMision(h.d, s.sello) === 0 ? 'sellada' : s.herida && estadoMision(h.d, s.herida) === 3 ? 'herida' : 'entera';
    for (const o of s.piezas ?? [s.obj]) { const v = objetoMeta(o.id, quiere) ? quiere : quiere === 'entera' && objetoMeta(o.id, 'abierta') ? 'abierta' : o.v; if (v !== o.v) o.v = v; }
  }
  if ((h as any).salida && llega((h as any).salida.cx + 0.5, (h as any).salida.cy + 0.5, 2.5)) {
    const s = (h as any).salida as Salida; (h as any).salida = null;
    if (s.sello && estadoMision(h.d, s.sello) === 0) msg(jj, ['La puerta está sellada. Alguien en el Refugio sabrá qué hacer.', 'The door is sealed. Someone at the Refuge will know what to do.']);
    else zonaPendiente = { id: s.destino, entrada: s.entrada };
  }
  if ((h as any).portal) {
    const pp = jj.zona.tipo === 'pueblo' ? jj.zona.entradas.portal : jj.portal ? [jj.portal.x, jj.portal.y] : null;
    if (pp && llega(pp[0], pp[1], 2)) { (h as any).portal = false; if (jj.zona.tipo === 'pueblo' && jj.portal) { zonaPendiente = { id: (jj as any).portalZona, entrada: '__portal' }; } else zonaPendiente = { id: PUEBLO_DE[jj.zona.acto], entrada: 'portal' }; }
  }
  // salidas por caminar encima (bordes de exteriores)
  if (!zonaPendiente && jj.zona.tipo !== 'mazmorra') for (const s of jj.zona.salidas) if (!s.obj && dist(h.x, h.y, s.cx + 0.5, s.cy + 0.5) < 1.6 && (h.camino || h.acc === 'correr' || h.acc === 'caminar')) { zonaPendiente = { id: s.destino, entrada: s.entrada }; break; }
}
function revivir(jj: Juego) {
  const h = jj.heroe;
  h.muerto = false; h.vida = h.vidaMax; h.mana = h.c.manaMax; h.acc = 'quieto';
  const perdido = Math.floor(h.d.oro * 0.1); h.d.oro -= perdido;
  zonaPendiente = { id: PUEBLO_DE[h.d.acto], entrada: 'centro' };
  msg(jj, [`Despiertas junto al fuego. Perdiste ${perdido} de oro.`, `You wake by the fire. You lost ${perdido} gold.`], '#c08080');
}
function usarObjeto(jj: Juego, o: ObjZ) {
  const h = jj.heroe;
  if (o.tag === 'cofre') {
    if (o.v.startsWith('abiert') || o.v.startsWith('abriendo')) return;
    o.v = o.v.endsWith('_y') ? 'abriendo_y' : 'abriendo'; o.tag = undefined; o.dato = { abre: jj.t };
    Sonido.efecto('cofre');
    const bueno = /ornado|noble|sarcofago|gg/.test(o.id) ? 2 : 1;
    setTimeout(() => soltar(jj, o.cx + 0.5, o.cy + 1.2, botin(nivelEnDificultad(jj.zona.nivel, h.d.dificultad), bueno, h.c.hallazgo, h.c.oro_extra)), 450);
    if (R() < 0.12) { // terror: el cofre era una trampa
      msg(jj, ['Del cofre sale un grito.', 'A scream comes from the chest.'], '#ff6060'); Sonido.susurro(); jj.sacudida = 0.4;
    }
  } else if (o.tag === 'romper') {
    if (o.id === 'com_barril_explosivo') { o.v = 'reventado'; jj.areas.push({ x: o.cx + 0.5, y: o.cy + 0.5, radio: 2.5, dano: [5 + jj.zona.nivel * 3, 10 + jj.zona.nivel * 5], elem: 'fuego', t: 0, dur: 0.1, tick: 1, prox: 0, deHeroe: true, efecto: '', retraso: 0.4 }); efecto(jj, 'explosion_fuego', o.cx + 0.5, o.cy + 0.5, 0, 1.4); Sonido.efecto('explosion'); }
    else { o.v = 'rota'; Sonido.efecto('golpe_hueso'); particulas(jj, o.cx + 0.5, o.cy + 0.5, 10, 'chispa', '#8a7a60'); if (R() < 0.6) soltar(jj, o.cx + 0.5, o.cy + 0.5, botin(jj.zona.nivel, 0, h.c.hallazgo, h.c.oro_extra)); }
    o.tag = undefined; o.bloquea = false; jj.zona.bloq[o.cy * jj.zona.W + o.cx] = 0;
  } else if (o.tag === 'santuario') {
    if (o.v === 'gastado') return;
    o.v = 'gastado'; o.tag = undefined;
    Sonido.efecto('santuario');
    const tipos = [
      { m: ['Santuario de la Furia: más daño.', 'Fury Shrine: more damage.'], b: { dano_pct: 60 } },
      { m: ['Santuario de Piedra: más defensa.', 'Stone Shrine: more defense.'], b: { def_pct: 100 } },
      { m: ['Santuario del Ojo: hallazgo de objetos.', 'Eye Shrine: item find.'], b: { hallazgo: 100 } },
      { m: ['Santuario del Viento: más velocidad.', 'Wind Shrine: more speed.'], b: { vel_mover: 40, vel_ataque: 30 } },
      { m: ['Santuario de la Brasa: resistencias.', 'Ember Shrine: resistances.'], b: { res_todo: 40 } },
    ];
    if (R() < 0.15) { // santuario maldito
      msg(jj, ['El santuario estaba maldito. Algo despierta.', 'The shrine was cursed. Something awakens.'], '#ff6060');
      const pool = POBLACION[POBL_ZONA[jj.zona.id] ?? ''] ?? ['zombi'];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const x = h.x + Math.cos(a) * 4, y = h.y + Math.sin(a) * 4; if (!pasable(jj.zona, x, y)) continue; jj.eventos.push({ tipo: 'spawn', dato: { id: elegir(pool), x, y } }); }
      Sonido.susurro(); jj.sacudida = 0.5;
    } else if (R() < 0.25) { h.vida = h.vidaMax; h.mana = h.c.manaMax; msg(jj, ['Santuario de la Vigilia: te sientes entero.', 'Vigil Shrine: you feel whole.'], '#a0ffa0'); }
    else { const s = elegir(tipos); h.buffs['santuario'] = { t: 90, bonos: s.b as any, hab: 'santuario' }; recalc(jj); msg(jj, s.m as [string, string], '#a0c0ff'); }
  } else if (o.tag === 'libro') {
    const p = leerLibro(h.d, jj.zona.acto);
    ui.dialogoTexto = TT(p.texto); ui.izq = 'pagina' as any; Object.assign(ui as any, { paginaN: p.n, paginaTotal: p.total, paginaTitulo: TT(p.titulo) });
    Sonido.efecto('abrir'); Sonido.susurro(); o.tag = undefined;
  } else if (o.tag === 'pozo') {
    if (o.v === 'seco') return;
    o.v = 'seco'; if (o.id.includes('vida')) h.vida = h.vidaMax; else h.mana = h.c.manaMax; Sonido.efecto('pocion');
  } else if (o.tag === 'baul') {
    if (o.id === 'cofre_gg' && !o.v.startsWith('abiert')) { o.v = 'abriendo'; o.dato = { abre: jj.t }; (ui as any).baul = o; }
    ui.izq = 'cofre'; ui.der = 'inv'; (ui as any).cofreX = o.cx; (ui as any).cofreY = o.cy; Sonido.efecto('abrir');
  } else if (o.id === 'com_piedra_viaje') {
    if (!h.d.viajes.includes(jj.zona.id)) { h.d.viajes.push(jj.zona.id); o.v = 'encendida'; Sonido.efecto('portal'); msg(jj, ['La piedra de viaje se enciende.', 'The travel stone ignites.'], '#80c0ff'); guardar(); }
    o.v = 'encendida';
    ui.izq = 'viaje';
  }
}

// ------------------------------------------------------------------ cinemáticas de la historia
const REV_LARGO = 28;
function empezarEntreacto(acto: number) { guardar(); estado = 'entreacto'; entreActo = acto; entreT = 0; ui.izq = ui.der = null; E.clicIzq = false; Sonido.musica('intro'); }
function empezarRevelacion(luegoFinal: boolean) { estado = 'revelacion'; revT = 0; revEleccion = null; revLuegoFinal = luegoFinal; ui.izq = ui.der = null; E.clicIzq = false; Sonido.musica('intro'); }

// ------------------------------------------------------------------ eventos del mundo
function procesarEventos(jj: Juego) {
  const ev = jj.eventos.splice(0);
  for (const e of ev) {
    if (e.tipo === 'viajar') zonaPendiente = { id: e.dato, entrada: 'viaje' };
    else if (e.tipo === 'salir') { guardar(); Sonido.musica('menu'); estado = 'seleccion'; j = null; cargarPartidas(); return; }
    else if (e.tipo === 'opciones') { opcionesDesde = 'juego'; estado = 'opciones'; ui.izq = null; }
    else if (e.tipo === 'mision') { const m = MISIONES.find((q) => q.id === e.dato); if (m) { msg(jj, [`Misión cumplida: ${m.nombre[0]}. Vuelve al campamento.`, `Quest fulfilled: ${m.nombre[1]}. Return to camp.`], '#80ff80'); Sonido.efecto('mision'); } }
    else if (e.tipo === 'jefe_muerto' && e.dato === 'senor_demonio') { guardar(); if (!finalDe(jj.heroe.d)) setTimeout(() => empezarRevelacion(false), 4000); else Sonido.musica(MUSICA_ACTO(jj.zona.acto, jj.zona.tipo) as any); }
    else if (e.tipo === 'jefe_muerto' && e.dato === 'aun_saar') { guardar(); setTimeout(() => { if (finalDe(jj.heroe.d)) { estado = 'final'; finalT = 0; Sonido.musica('intro'); } else empezarRevelacion(true); }, 4000); }
    else if (e.tipo === 'jefe_muerto') { Sonido.musica(MUSICA_ACTO(jj.zona.acto, jj.zona.tipo) as any); msg(jj, ['El sello se rompe. Algo escapa hacia lo alto.', 'The seal breaks. Something escapes upward.'], '#ffb060'); guardar(); }
    else if (e.tipo === 'muerte') { Sonido.musica(null as any); tEstado = 0; }
    else if (e.tipo === 'spawn') { import('./juego/mundo').then((mm) => { const m = mm.crearMonstruo(MONSTRUOS[e.dato.id], nivelEnDificultad(jj.zona.nivel, jj.heroe.d.dificultad) + 1, e.dato.x, e.dato.y, 1, jj.heroe.d.dificultad); m.estado = 'perseguir'; m.objetivo = jj.heroe; m.acc = 'morir'; (m as any).surgiendo = 1.2; jj.monstruos.push(m); }); }
    else if (e.tipo === 'nivel') { guardar(); pista('nivel', ['Subiste de nivel: pulsa C para tus atributos y T para tus habilidades.', 'Level up: press C for attributes and T for skills.']); }
    else if (e.tipo === 'mision_hecha') { guardar(); const m = MISIONES.find((q) => q.id === e.dato); if (m?.cierraActo && m.acto < 7) entreActoPendiente = m.acto; }
    else if (e.tipo === 'heraldo_huye') guardar();
  }
}

// ------------------------------------------------------------------ bucle
let ultimo = performance.now();
let introT = 0;
(window as any).__introA = (s: number) => { introT = s; };
function cuadro(ahora: number) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
  tiempo += dt; tEstado += dt;
  try { paso(dt); } catch (e) { console.error(e); }
  finCuadro();
  requestAnimationFrame(cuadro);
}
// autoguardado: cada 30 s en partida y al ocultar o cerrar la pestaña (antes solo al cambiar de zona)
let tAutoguardado = performance.now();
const guardarYa = () => { if (estado === 'juego' && j) guardar(); };
addEventListener('pagehide', guardarYa);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarYa(); });
function paso(dt: number) {
  if (estado === 'juego' && j && performance.now() - tAutoguardado > 30000) { tAutoguardado = performance.now(); guardar(); }
  ctx.imageSmoothingEnabled = false;
  const inp = document.getElementById('nombre') as HTMLInputElement;
  if (estado !== 'crear') inp.style.display = 'none';
  switch (estado) {
    case 'carga': pantallaCarga(cargaK, cargaMsg, tiempo); break;
    case 'zona': pantallaCarga(cargaK, cargaMsg, tiempo); break;
    case 'entreacto': {
      entreT += dt;
      if (dibujarEntreacto(entreActo, entreT, j ? finalDe(j.heroe.d) : undefined) || (entreT > 0.5 && (E.clicIzq || pulso('Escape') || pulso(' ') || pulso('Enter')))) {
        E.clicIzq = false; estado = 'juego'; tEstado = 0;
        const sig = PUEBLO_DE[entreActo + 1]; if (sig && ZONAS[sig]) zonaPendiente = { id: sig, entrada: 'centro' };
      }
      break;
    }
    case 'revelacion': {
      revT += dt;
      const r = dibujarRevelacion(revT, revEleccion);
      if (!revEleccion && r !== 'fin' && r) { revEleccion = r; revT = 0; E.clicIzq = false; if (j) { hist(j.heroe.d).finalElegido = r; guardar(); } Sonido.efecto(r === 'absorber' ? 'rugido_jefe' : 'campana', { vol: 0.8 }); }
      else if (!revEleccion && revT > 0.5 && revT < REV_LARGO && (E.clicIzq || pulso('Escape'))) { revT = REV_LARGO; E.clicIzq = false; }
      else if (revEleccion && (r === 'fin' || (revT > 1 && (E.clicIzq || pulso('Escape'))))) {
        E.clicIzq = false;
        if (revLuegoFinal) { estado = 'final'; finalT = 0; } else { estado = 'juego'; if (j) Sonido.musica(MUSICA_ACTO(j.zona.acto, j.zona.tipo) as any); }
      }
      if (estado === 'revelacion') dibujarCursor('senalar');
      break;
    }
    case 'final': {
      finalT += dt;
      if (dibujarFinal(finalT, (j && finalDe(j.heroe.d)) || 'destruir') || (finalT > 3 && (pulso('Escape') || E.clicIzq))) { estado = 'juego'; E.clicIzq = false; if (j) Sonido.musica(MUSICA_ACTO(j.zona.acto, j.zona.tipo) as any); }
      break;
    }
    case 'intro': {
      introT += dt;
      if (dibujarIntro(introT) || (tEstado > 0.5 && (E.clicIzq || pulso('Escape') || pulso(' ') || pulso('Enter')))) { estado = 'menu'; tEstado = 0; Sonido.musica('menu'); try { localStorage.setItem('marca.intro', '1'); } catch { /* */ } }
      break;
    }
    case 'menu': {
      const r = menuPrincipal(tiempo, heroes.length > 0);
      dibujarCursor('senalar');
      if (r === 'jugar') { estado = heroes.length ? 'seleccion' : 'crear'; selClase = null; tEstado = 0; }
      if (r === 'intro') { estado = 'intro'; introT = 0; tEstado = 0; Sonido.musica('intro'); }
      if (r === 'opciones') { opcionesDesde = 'menu'; estado = 'opciones'; }
      if (r === 'idioma') { opciones.idioma = IDI ? 0 : 1; fijarIdioma(opciones.idioma); guardarOpciones(); }
      if (r) E.clicIzq = false;
      break;
    }
    case 'opciones': {
      if (opcionesDesde === 'juego' && j) { dibujarMundo(j, 0, tiempo); }
      const r = dibujarOpciones(tiempo, opcionesDesde !== 'juego');
      dibujarCursor('senalar');
      if (r || pulso('Escape')) { estado = opcionesDesde; if (j) j.idi = IDI; }
      break;
    }
    case 'seleccion': {
      // el héroe elegido se pinta con su equipo (el mismo pintor del juego, así además queda listo en caché al entrar)
      if (heroes[sel]) { const d = heroes[sel]; const f = firmaVisual(d); if ((window as any).__firmaSel !== f) { (window as any).__firmaSel = f; pintarHeroe(d.clase, cuerpoDe(d.clase), equipoVisual(d), f, 's'); } }
      const r = dibujarSeleccion(tiempo, heroes, sel);
      sel = r.sel;
      dibujarCursor('senalar');
      if (r.accion === 'jugar' && heroes[sel]) { E.clicIzq = false; empezarPartida(JSON.parse(JSON.stringify(heroes[sel]))); }
      if (r.accion === 'dificultad' && heroes[sel]) { E.clicIzq = false; const hr = heroes[sel]; hr.dificultad = (hr.dificultad ?? 0) + 1; hr.acto = 1; hr.zona = 'a1_refugio'; hr.misiones = {}; reiniciarHistoria(hr); hr.actosHechos = []; hr.viajes = ['a1_refugio']; guardarPartidas(); }
      if (r.accion === 'crear') { estado = 'crear'; selClase = null; E.clicIzq = false; }
      if (r.accion === 'volver' || pulso('Escape')) { estado = 'menu'; E.clicIzq = false; }
      if (r.accion === 'borrar' && heroes[sel]) { E.clicIzq = false; if ((window as any).__borrar === heroes[sel].id) { heroes.splice(sel, 1); sel = 0; guardarPartidas(); (window as any).__borrar = null; } else (window as any).__borrar = heroes[sel].id; }
      break;
    }
    case 'crear': {
      const r = dibujarCrear(tiempo, selClase);
      selClase = r.sel;
      dibujarCursor('senalar');
      const inp2 = document.getElementById('nombre') as HTMLInputElement;
      if ((r.accion === 'crear' || (pulso('Enter') && inp2.value.trim())) && selClase !== null) {
        const nombre = inp2.value.trim().slice(0, 16) || TT(CLASES[selClase].nombre);
        const d = nuevoHeroe(CLASES[selClase].id, nombre);
        heroes.unshift(d); guardarPartidas(); inp2.value = ''; inp2.style.display = 'none';
        E.clicIzq = false;
        empezarPartida(JSON.parse(JSON.stringify(d)));
      }
      if (r.accion === 'volver' || (pulso('Escape') && document.activeElement !== inp2)) { estado = heroes.length ? 'seleccion' : 'menu'; inp2.style.display = 'none'; }
      break;
    }
    case 'juego': {
      const jj = j!;
      if (zonaPendiente) { const z = zonaPendiente; zonaPendiente = null; if (z.entrada === '__portal') { const p = jj.portal!; irAZona(z.id, 'centro').then(() => { jj.heroe.x = p.x + 1; jj.heroe.y = p.y + 1; }); } else irAZona(z.id, z.entrada); break; }
      opcionesRender.idi = IDI;
      const pausa = ui.izq === 'menu' || ui.confirmar;
      if (!pausa) { actualizar(jj, dt); historiaPaso(jj, dt); }
      dibujarMundo(jj, dt, tiempo);
      dibujarHistoria(jj, tiempo);
      if (entreActoPendiente && ui.izq !== 'dialogo') { empezarEntreacto(entreActoPendiente); entreActoPendiente = 0; }
      etiquetasBotin(jj);
      // brillo general
      if (opciones.brillo < 0.95 || opciones.brillo > 1.05) { ctx.save(); ctx.globalCompositeOperation = opciones.brillo > 1 ? 'lighter' : 'source-over'; ctx.fillStyle = opciones.brillo > 1 ? `rgba(40,36,30,${(opciones.brillo - 1) * 0.6})` : `rgba(0,0,0,${(1 - opciones.brillo) * 0.5})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      if (ui.mapa) dibujarMapa(jj, true); else dibujarMapa(jj, false);
      dibujarArriba(jj, pickEncima?.tipo === 'monstruo' ? pickEncima.ref : null);
      ui.sobreUI = false;
      dibujarPaneles(jj, tiempo);
      dibujarBarra(jj, tiempo);
      if (!jj.heroe.muerto) controlar(jj, dt); else { dibujarMuerte(); controlar(jj, dt); }
      dibujarTooltipObjeto(jj);
      if (pickEncima && !ui.sobreUI) etiquetaPick(jj, pickEncima);
      if (progresoPintura < 1) texto(`${T('Forjando tu equipo', 'Forging your gear')} ${Math.round(progresoPintura * 100)}%`, 12, 20, { tam: 11, color: '#a08050' });
      // pintar al héroe nuevo si cambió el equipo
      const firma = firmaVisual(jj.heroe.d);
      if (firma !== (jj as any).firma) { (jj as any).firma = firma; pintarHeroe(jj.heroe.d.clase, cuerpoDe(jj.heroe.d.clase), equipoVisual(jj.heroe.d), firma, jj.heroe.dir); }
      procesarEventos(jj);
      // capa de combate de la música según cuántos monstruos despiertos hay cerca
      if (Math.floor(tiempo * 2) !== Math.floor((tiempo - dt) * 2)) { let n = 0; for (const m of jj.monstruos) if (!m.muerto && !m.dueno && m.estado === 'perseguir' && dist(m.x, m.y, jj.heroe.x, jj.heroe.y) < 12) n++; Sonido.combate(Math.min(1, n / 6)); }
      guardadoT += dt; if (guardadoT > 45) { guardadoT = 0; guardar(); }
      jj.heroe.d.jugado += dt;
      dibujarCursor(pickEncima?.tipo === 'monstruo' ? 'atacar' : pickEncima?.tipo === 'npc' ? 'hablar' : pickEncima ? 'agarrar' : 'senalar');
      break;
    }
  }
}
function etiquetaPick(jj: Juego, p: Pick) {
  if (p.tipo === 'npc') { const n = (p.ref as Npc); import('./datos/npcs').then(() => { }); texto(TT(npcsNombre(n.npc)), (p.x0 + p.x1) / 2, p.y0 - 6, { alin: 'center', color: '#e0e0ff' }); }
  else if (p.tipo === 'salida') tooltip([[TT((p.ref as Salida).nombre), '#ffd060']], (p.x0 + p.x1) / 2, p.y0 + 20);
  else if (p.tipo === 'objeto') { const o = p.ref as ObjZ; const n = o.id === 'com_piedra_viaje' ? T('Piedra de viaje', 'Travel stone') : o.tag === 'baul' ? T('Baúl compartido', 'Shared chest') : o.tag === 'cofre' ? T('Cofre', 'Chest') : o.tag === 'santuario' ? T('Santuario', 'Shrine') : o.tag === 'pozo' ? T('Pozo', 'Well') : o.tag === 'romper' ? T('Urna', 'Urn') : o.tag === 'libro' ? T('Libro maldito', 'Cursed book') : ''; if (n) texto(n, (p.x0 + p.x1) / 2, p.y0 - 4, { alin: 'center', color: '#c0c0ff' }); }
  else if (p.tipo === 'portal') texto(T('Portal', 'Portal'), (p.x0 + p.x1) / 2, p.y0 - 4, { alin: 'center', color: '#80b0ff' });
  void jj;
}
import { NPCS } from './datos/npcs';
const npcsNombre = (id: string) => NPCS[id]?.nombre ?? ['', ''];

// ------------------------------------------------------------------ arranque
async function arrancar() {
  ajustar(); instalarEntrada();
  cargarOpciones(); cargarPartidas();
  alPrimerGesto(() => { Sonido.iniciar(); aplicarMusicaEstado(); });
  requestAnimationFrame(cuadro);
  try {
    await cargarBase();
  } catch (e) { console.error(e); cargaMsg = 'Error: ' + e; return; }
  prepararHud();
  let vista = false; try { vista = localStorage.getItem('marca.intro') === '1'; } catch { /* */ }
  estado = vista ? 'menu' : 'intro'; tEstado = 0; introT = 0;
  aplicarMusicaEstado();
  (window as any).__juego = () => j;
  (window as any).__estado = () => estado;
  import('./juego/mundo').then((m) => { (window as any).__mundo = m; });
  (window as any).__U = { hablarCon, abrirTienda, ui };
  // ganchos para las pruebas del build de producción
  Promise.all([import('./juego/heroe'), import('./juego/objetos'), import('./datos/objetos_datos'), import('./motor/pintor')]).then(([H, O, D, P]) => { (window as any).__T = { H, O, D, P }; });
  (window as any).__ir = (id: string, e: string) => irAZona(id, e);
  (window as any).__historia = { entreacto: (n: number) => empezarEntreacto(n), revelacion: (luegoFinal = false) => empezarRevelacion(luegoFinal), final: () => { estado = 'final'; finalT = 0; }, t: (s: number) => { entreT = s; revT = s; finalT = s; } };
  (window as any).__aPant = (x: number, y: number) => { const [a, b] = aPant(x, y); const r = (document.getElementById('juego') as HTMLCanvasElement).getBoundingClientRect(); return [r.left + a * r.width / W, r.top + b * r.height / H]; };
}
function aplicarMusicaEstado() { Sonido.musica(estado === 'intro' ? 'intro' : estado === 'juego' && j ? (MUSICA_ACTO(j.zona.acto, j.zona.tipo) as any) : 'menu'); }
void lugarEn; void COFRE_W; void COFRE_H; void crearObjeto; void dibujarPaneles;
arrancar();
