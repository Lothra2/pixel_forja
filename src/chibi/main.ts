import './chibi.css';
import {
  familiar, MIEMBROS, TRAJES, NOMBRE_TRAJE, NOMBRE_MIEMBRO, cloneLook, defaultLook, clipsDe, pintarClip, pintarCabezaVideo, paint, efecto,
  ETIQUETAS, PEINADOS, OJOS, CEJAS, BOCAS, BARBAS, LENTES, GORROS, ARETES, MARCAS, ARRIBAS, ABAJOS, ZAPATOS, ESTAMPADOS, ACCESORIOS, UTILERIAS, PODERES, CONTEXTURAS,
  PIELES, COLORES_PELO, COLORES_ROPA, escenarios, pintarEscenario,
  type ChibiLook, type Talla, type MiembroId, type TrajeId, type Clip,
} from '../engine/chibi';
import type { Raster } from '../engine/core/raster';
import { h, canvasPixel, dibujar, lienzo, tr, lang, setLang, guardar, leer } from './dibujo';
import { reproductor, type Reproductor } from './reproductor';
import { montarArena } from './arena';
import { montarTaller } from './taller';
import { montarExportar } from './exportar';
import { montarVideo } from './video';

/**
 * Forja Chibi: el segmento de muñecos calcados del video. Familia, tienda para armar el muñeco, todas las
 * animaciones, la arena para probarlos, el taller de escenarios y la exportación para juegos.
 */

const T: Record<string, [string, string]> = {
  sub: ['Muñecos calcados del video, para muchos juegos', 'Video-traced chibis for many games'],
  original: ['El video', 'The video'], familia: ['Familia', 'Family'], tienda: ['Tienda', 'Shop'], movs: ['Movimientos', 'Moves'], arena: ['Arena', 'Arena'], taller: ['Taller de escenarios', 'Stage workshop'], exportar: ['Exportar', 'Export'],
  editar: ['Abrir en la tienda', 'Open in shop'], pelear: ['Pelear con este', 'Fight with this one'],
  nombre: ['Nombre', 'Name'], guardar: ['Guardar en mis muñecos', 'Save to my chibis'], azar: ['Sorpréndeme', 'Surprise me'], mios: ['Mis muñecos', 'My chibis'],
  vacio: ['Todavía no guardaste ninguno.', 'You have not saved any yet.'], anim: ['Animación', 'Animation'], vel: ['Velocidad', 'Speed'], cajas: ['Cajas de golpe', 'Hitboxes'],
  espejo: ['Mirar a la izquierda', 'Face left'], pausa: ['Pausa', 'Pause'], talla: ['Talla', 'Size'], fondo: ['Fondo', 'Backdrop'], ninguno: ['Ninguno', 'None'],
  grande: ['Grande ×2', 'Large ×2'], normal: ['32 px (como el video)', '32 px (like the video)'], color: ['Color', 'Color'], color2: ['Color 2', 'Color 2'],
  sin: ['Sin', 'None'], numero: ['Número', 'Number'], video: ['Calcado del video', 'Traced from video'], piezas: ['Motor por piezas', 'Parts engine'],
  pelea: ['Pelea', 'Fighting'], beat: ["Beat'em up y plataformas", "Beat'em up & platform"], arriba: ['Vista desde arriba (8 direcciones)', 'Top-down (8 directions)'], deporte: ['Deportes y minijuegos', 'Sports & minigames'],
  borrar: ['Borrar', 'Delete'], usar: ['Usar', 'Use'], quien: ['Muñeco', 'Chibi'], creditos: ['Movimientos calcados del video de @DAVE.XP (chibis de Street Fighter, fan art). Para uso familiar.', 'Moves traced from the @DAVE.XP video (Street Fighter chibi fan art). For family use.'],
};
const t = (k: string) => tr(T[k], k);
const et = (k: string) => tr(ETIQUETAS[k], k);

// ------------------------------------------------------------------ estado
const estado = {
  look: familiar('rick', 'siempre') as ChibiLook,
  talla: 32 as Talla,
  mios: leer<ChibiLook[]>('pf.chibi.mios', []),
};
const oyentes = new Set<() => void>();
const cambio = () => { for (const f of oyentes) f(); };
export function lookActual(): ChibiLook { return estado.look; }
export function ponerLook(l: ChibiLook) { estado.look = cloneLook(l); cambio(); }
export function misMunecos(): ChibiLook[] { return estado.mios; }

// ------------------------------------------------------------------ mini retratos
const cacheMini = new Map<string, Raster>();
function recorta(r: Raster): Raster {
  let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < 0) return r;
  const w = x1 - x0 + 1, hh = y1 - y0 + 1;
  const out = { w, h: hh, data: new Uint8ClampedArray(w * hh * 4) };
  for (let y = 0; y < hh; y++) out.data.set(r.data.subarray(((y0 + y) * r.w + x0) * 4, ((y0 + y) * r.w + x1 + 1) * 4), y * w * 4);
  return out;
}
export function cabezaMini(l: ChibiLook): Raster {
  const k = 'c' + JSON.stringify(l);
  let r = cacheMini.get(k);
  if (!r) {
    const c = pintarCabezaVideo(l, 'lado', 'normal');
    r = recorta(paint.juntar([c.atras, c.cara], c.cara.w, c.cara.h, 1));
    cacheMini.set(k, r);
  }
  return r;
}
export function cuerpoMini(l: ChibiLook): Raster {
  const k = 'b' + JSON.stringify(l);
  let r = cacheMini.get(k);
  if (!r) {
    const c = clipsDe(l).find((x) => x.id === 'reposo')!;
    r = recorta(pintarClip(l, 32, c)[0].img);
    cacheMini.set(k, r);
  }
  return r;
}
function miniatura(r: Raster, caja: number, escala: number): HTMLCanvasElement {
  const c = canvasPixel(caja, caja, escala, 'mini');
  dibujar(c.getContext('2d')!, r, Math.floor((caja - r.w) / 2), Math.max(0, caja - r.h - 1));
  return c;
}

// ------------------------------------------------------------------ estructura
const app = document.getElementById('app')!;
const pestañas: [string, string][] = [['original', '🎬'], ['familia', '👪'], ['tienda', '🛍'], ['movs', '🎞'], ['arena', '🥊'], ['taller', '🏗'], ['exportar', '📦']];
const secciones: Record<string, HTMLElement> = {};
const montadas = new Set<string>();
const alMostrar: Record<string, () => void> = {};
let actual = (location.hash.slice(1) || leer('pf.chibi.tab', 'original')) as string;
if (!pestañas.some(([k]) => k === actual)) actual = 'original';

function cabecera() {
  return h('header', { class: 'top' },
    h('div', { class: 'marca' }, h('span', { class: 'logo' }, 'PF'), h('div', {}, h('b', {}, 'Forja Chibi'), h('small', {}, t('sub')))),
    h('nav', { class: 'tabs', role: 'tablist' }, ...pestañas.map(([k]) => h('button', { role: 'tab', class: 'tab', 'data-k': k, 'aria-selected': String(k === actual), onclick: () => ir(k) }, t(k)))),
    h('div', { class: 'idioma' },
      h('button', { class: 'chip' + (lang === 'es' ? ' on' : ''), onclick: () => { setLang('es'); location.reload(); } }, 'ES'),
      h('button', { class: 'chip' + (lang === 'en' ? ' on' : ''), onclick: () => { setLang('en'); location.reload(); } }, 'EN')),
  );
}
function ir(k: string) {
  actual = k; guardar('pf.chibi.tab', k);
  history.replaceState(null, '', '#' + k);
  for (const b of app.querySelectorAll<HTMLButtonElement>('.tab')) b.setAttribute('aria-selected', String(b.dataset.k === k));
  for (const [n, s] of Object.entries(secciones)) s.hidden = n !== k;
  montar(k);
  alMostrar[k]?.();
}
function montar(k: string) {
  if (montadas.has(k)) return;
  montadas.add(k);
  const s = secciones[k];
  if (k === 'original') montarVideo(s);
  if (k === 'familia') montarFamilia(s);
  if (k === 'tienda') montarTienda(s);
  if (k === 'movs') montarMovimientos(s);
  if (k === 'arena') montarArena(s, { look: () => estado.look, oyente: (f) => oyentes.add(f) });
  if (k === 'taller') montarTaller(s, { look: () => estado.look });
  if (k === 'exportar') montarExportar(s, { look: () => estado.look, mios: () => estado.mios });
}

app.append(cabecera());
for (const [k] of pestañas) { const s = h('section', { class: 'sec', id: 's-' + k }); s.hidden = k !== actual; secciones[k] = s; app.append(s); }
app.append(h('footer', { class: 'pie' }, t('creditos')));
montar(actual);
window.addEventListener('hashchange', () => { const k = location.hash.slice(1); if (pestañas.some(([x]) => x === k) && k !== actual) ir(k); });

// ------------------------------------------------------------------ familia
function montarFamilia(s: HTMLElement) {
  s.append(h('h2', {}, t('familia')), h('p', { class: 'nota' }, lang === 'es'
    ? 'Siete muñecos con cinco trajes cada uno. Todos se mueven con los cuadros calcados del video: mismas poses y mismos tiempos.'
    : 'Seven chibis with five outfits each. All of them move with the frames traced from the video: same poses, same timing.'));
  const grilla = h('div', { class: 'familia' });
  for (const id of MIEMBROS) {
    let traje: TrajeId = 'siempre';
    const rep = reproductor(familiar(id, traje), 32, 'reposo', 3, 'card-sprite');
    const anims = id === 'thor' ? ['reposo', 'caminar', 'correr', 'ladrar', 'victoria'] : ['reposo', 'caminar', 'poder', 'antiaereo', 'uppercut', 'torbellino', 'victoria'];
    let ai = 0;
    rep.el.title = lang === 'es' ? 'Tócalo para cambiar de movimiento' : 'Tap to change move';
    rep.el.addEventListener('click', () => { ai = (ai + 1) % anims.length; rep.poner(familiar(id as MiembroId, traje), anims[ai]); });
    const chips = h('div', { class: 'chips' }, ...TRAJES.map((tj) => h('button', {
      class: 'chip' + (tj === traje ? ' on' : ''), onclick: (e: Event) => {
        traje = tj; rep.poner(familiar(id, traje), anims[ai]);
        for (const b of (e.currentTarget as HTMLElement).parentElement!.children) b.classList.toggle('on', b === e.currentTarget);
      },
    }, tr(NOMBRE_TRAJE[tj]))));
    grilla.append(h('article', { class: 'card' },
      h('div', { class: 'card-escena' }, rep.el),
      h('h3', {}, NOMBRE_MIEMBRO[id]),
      chips,
      h('div', { class: 'fila' },
        h('button', { class: 'btn', onclick: () => { ponerLook(familiar(id, traje)); ir('tienda'); } }, t('editar')),
        h('button', { class: 'btn sec2', onclick: () => { ponerLook(familiar(id, traje)); ir('arena'); } }, t('pelear'))),
    ));
  }
  s.append(grilla);
}

// ------------------------------------------------------------------ tienda
type Cat = { k: string; es: string; en: string; pintar: (cont: HTMLElement) => void };
function montarTienda(s: HTMLElement) {
  const L = () => estado.look;
  const rep = reproductor(L(), estado.talla, 'reposo', 6, 'grande');
  const fondos = escenarios();
  let fondoId = '';
  const ponerFondo = () => {
    if (!fondoId) { rep.opciones.fondo = null; return; }
    const esc = fondos.find((e) => e.id === fondoId)!;
    const img = pintarEscenario(esc, 0, 0);
    const c = lienzo(img);
    rep.opciones.fondo = (ctx) => { const w = ctx.canvas.width, hh = ctx.canvas.height; const k = estado.talla === 48 ? 2 : 1; ctx.save(); ctx.scale(k, k); ctx.drawImage(c, esc.w / 2 - w / (2 * k), esc.piso - (hh - 20 * k) / k + 4, w / k, hh / k, 0, 0, w / k, hh / k); ctx.restore(); };
  };
  // selector de animación agrupado
  const sel = h('select', { onchange: () => rep.poner(L(), sel.value) });
  const llenarSel = () => {
    sel.innerHTML = '';
    const grupos: Record<string, Clip[]> = {};
    for (const c of clipsDe(L())) (grupos[c.grupo] ??= []).push(c);
    for (const [g, cs] of Object.entries(grupos)) {
      const og = h('optgroup', { label: t(g) });
      for (const c of cs) og.append(h('option', { value: c.id, selected: c.id === rep.clip().id }, tr(c.nombre)));
      sel.append(og);
    }
  };
  llenarSel();
  const nombre = h('input', { value: L().nombre, maxlength: 24, oninput: () => { estado.look.nombre = nombre.value; } });
  const panelPrev = h('div', { class: 'prev' },
    h('div', { class: 'prev-escena' }, rep.el),
    h('div', { class: 'controles' },
      h('label', {}, t('anim'), sel),
      h('label', {}, t('vel'), h('select', { onchange: (e: Event) => { rep.opciones.velocidad = Number((e.target as HTMLSelectElement).value); } },
        ...[['1', '1×'], ['0.5', '½×'], ['0.25', '¼×'], ['0.1', '⅒×']].map(([v, n]) => h('option', { value: v }, n)))),
      h('label', {}, t('fondo'), h('select', { onchange: (e: Event) => { fondoId = (e.target as HTMLSelectElement).value; ponerFondo(); rep.poner(L()); } },
        h('option', { value: '' }, t('ninguno')), ...fondos.map((f) => h('option', { value: f.id }, tr(f.nombre))))),
      h('div', { class: 'fila' },
        h('button', { class: 'chip', onclick: (e: Event) => { rep.opciones.pausa = !rep.opciones.pausa; (e.currentTarget as HTMLElement).classList.toggle('on', rep.opciones.pausa); } }, t('pausa')),
        h('button', { class: 'chip', onclick: (e: Event) => { rep.opciones.cajas = !rep.opciones.cajas; (e.currentTarget as HTMLElement).classList.toggle('on', rep.opciones.cajas); } }, t('cajas')),
        h('button', { class: 'chip', onclick: (e: Event) => { rep.opciones.espejo = !rep.opciones.espejo; (e.currentTarget as HTMLElement).classList.toggle('on', rep.opciones.espejo); } }, t('espejo'))),
    ),
    h('label', { class: 'nombre' }, t('nombre'), nombre),
    h('div', { class: 'fila' },
      h('button', { class: 'btn', onclick: () => { estado.mios.push(cloneLook(L())); guardar('pf.chibi.mios', estado.mios); pintarMios(); } }, t('guardar')),
      h('button', { class: 'btn sec2', onclick: () => { ponerLook(azar()); } }, t('azar'))),
    h('h3', {}, t('mios')),
  );
  const mios = h('div', { class: 'mios' });
  const pintarMios = () => {
    mios.innerHTML = '';
    if (!estado.mios.length) mios.append(h('p', { class: 'nota' }, t('vacio')));
    estado.mios.forEach((m, i) => mios.append(h('div', { class: 'mio' },
      h('button', { class: 'mio-btn', title: t('usar'), onclick: () => ponerLook(m) }, miniatura(cuerpoMini(m), 30, 2), h('span', {}, m.nombre)),
      h('button', { class: 'x', title: t('borrar'), onclick: () => { estado.mios.splice(i, 1); guardar('pf.chibi.mios', estado.mios); pintarMios(); } }, '×'))));
  };
  pintarMios();
  panelPrev.append(mios);

  // ---- la tienda: categorías con opciones dibujadas por el motor
  const cambiar = (f: (l: ChibiLook) => void) => { const l = cloneLook(L()); f(l); ponerLook(l); };
  const opciones = <T extends string>(lista: (T | null)[], actualV: T | null | undefined, aplicar: (l: ChibiLook, v: T | null) => void, mini: 'cabeza' | 'cuerpo', etiqueta = (v: T | null) => (v ? et(v) : t('sin'))) =>
    h('div', { class: 'opciones' }, ...lista.map((v) => {
      const l = cloneLook(L()); aplicar(l, v);
      return h('button', { class: 'op' + (v === (actualV ?? null) ? ' on' : ''), title: etiqueta(v), onclick: () => cambiar((x) => aplicar(x, v)) },
        (mini === 'cabeza' ? miniatura(cabezaMini(l), 20, 5) : miniatura(cuerpoMini(l), 34, 3)), h('span', {}, etiqueta(v)));
    }));
  const colores = (lista: string[], actualC: string | undefined | null, aplicar: (l: ChibiLook, c: string) => void, titulo = t('color')) =>
    h('div', { class: 'colores' }, h('span', { class: 'lbl' }, titulo),
      ...lista.map((c) => h('button', { class: 'sw' + (c.toLowerCase() === (actualC ?? '').toLowerCase() ? ' on' : ''), style: { background: c }, title: c, onclick: () => cambiar((l) => aplicar(l, c)) })),
      h('input', { type: 'color', value: actualC && /^#[0-9a-f]{6}$/i.test(actualC) ? actualC : '#888888', onchange: (e: Event) => cambiar((l) => aplicar(l, (e.target as HTMLInputElement).value)) }));
  const cats: Cat[] = [
    { k: 'cuerpo', es: 'Cuerpo y piel', en: 'Body & skin', pintar: (c) => c.append(
      colores(PIELES, L().piel, (l, v) => { l.piel = v; }, lang === 'es' ? 'Piel' : 'Skin'),
      h('p', { class: 'nota' }, lang === 'es' ? 'Contextura (en los movimientos del motor por piezas):' : 'Build (for the parts-engine moves):'),
      h('div', { class: 'chips' }, ...CONTEXTURAS.map((k) => h('button', { class: 'chip' + (L().contextura === k ? ' on' : ''), onclick: () => cambiar((l) => { l.contextura = k; }) }, et(k))))) },
    { k: 'pelo', es: 'Pelo', en: 'Hair', pintar: (c) => c.append(
      opciones(PEINADOS, L().pelo.estilo, (l, v) => { l.pelo.estilo = v!; }, 'cabeza'),
      colores(COLORES_PELO, L().pelo.color, (l, v) => { l.pelo.color = v; }),
      colores(COLORES_ROPA, L().pelo.color2, (l, v) => { l.pelo.color2 = v; }, lang === 'es' ? 'Lazo o colita' : 'Hair tie')) },
    { k: 'cara', es: 'Cara', en: 'Face', pintar: (c) => c.append(
      h('h4', {}, lang === 'es' ? 'Ojos' : 'Eyes'), opciones(OJOS, L().ojos.estilo, (l, v) => { l.ojos.estilo = v!; }, 'cabeza'),
      colores(['#141014', '#3a2418', '#2f6fd8', '#3f8f40', '#7a4a26'], L().ojos.color, (l, v) => { l.ojos.color = v; }),
      h('h4', {}, lang === 'es' ? 'Cejas' : 'Brows'), opciones(CEJAS, L().cejas.estilo, (l, v) => { l.cejas.estilo = v!; }, 'cabeza'),
      h('h4', {}, lang === 'es' ? 'Boca' : 'Mouth'), opciones(BOCAS, L().boca, (l, v) => { l.boca = v!; }, 'cabeza'),
      h('h4', {}, lang === 'es' ? 'Marcas' : 'Marks'), opciones([null, ...MARCAS], L().marca ?? null, (l, v) => { l.marca = v; }, 'cabeza')) },
    { k: 'barba', es: 'Barba y lentes', en: 'Beard & glasses', pintar: (c) => c.append(
      h('h4', {}, lang === 'es' ? 'Barba' : 'Beard'), opciones([null, ...BARBAS], L().barba?.estilo ?? null, (l, v) => { l.barba = v ? { estilo: v, color: l.barba?.color ?? '#3a2a22' } : null; }, 'cabeza'),
      L().barba ? colores(['#3a2a22', '#141014', '#7a4a26', '#b8b2aa', '#ece9e4', '#c0392b'], L().barba!.color, (l, v) => { if (l.barba) l.barba.color = v; }) : '',
      h('h4', {}, lang === 'es' ? 'Lentes' : 'Glasses'), opciones([null, ...LENTES], L().lentes?.estilo ?? null, (l, v) => { l.lentes = v ? { estilo: v, color: l.lentes?.color ?? '#1e1e24' } : null; }, 'cabeza'),
      L().lentes ? colores(['#1e1e24', '#c8a040', '#c0392b', '#2f6fd8', '#e8455a', '#f4f2ee'], L().lentes!.color, (l, v) => { if (l.lentes) l.lentes.color = v; }) : '') },
    { k: 'gorro', es: 'Gorros', en: 'Hats', pintar: (c) => c.append(
      opciones([null, ...GORROS], L().gorro?.estilo ?? null, (l, v) => { l.gorro = v ? { estilo: v, color: l.gorro?.color ?? '#c0392b', color2: l.gorro?.color2 ?? '#f4f2ee' } : null; }, 'cabeza'),
      L().gorro ? colores(COLORES_ROPA, L().gorro!.color, (l, v) => { if (l.gorro) l.gorro.color = v; }) : '',
      L().gorro ? colores(COLORES_ROPA, L().gorro!.color2, (l, v) => { if (l.gorro) l.gorro.color2 = v; }, t('color2')) : '') },
    { k: 'arriba', es: 'Ropa de arriba', en: 'Tops', pintar: (c) => c.append(
      opciones(ARRIBAS, L().arriba.estilo, (l, v) => { l.arriba.estilo = v!; }, 'cuerpo'),
      colores(COLORES_ROPA, L().arriba.color, (l, v) => { l.arriba.color = v; }),
      h('h4', {}, lang === 'es' ? 'Estampado' : 'Pattern'),
      h('div', { class: 'chips' }, ...ESTAMPADOS.map((k) => h('button', { class: 'chip' + ((L().arriba.estampado ?? 'liso') === k ? ' on' : ''), onclick: () => cambiar((l) => { l.arriba.estampado = k; }) }, et(k)))),
      colores(COLORES_ROPA, L().arriba.color2, (l, v) => { l.arriba.color2 = v; }, t('color2')),
      h('label', { class: 'nombre' }, t('numero'), h('input', { value: L().arriba.numero ?? '10', maxlength: 2, onchange: (e: Event) => cambiar((l) => { l.arriba.numero = (e.target as HTMLInputElement).value; }) }))) },
    { k: 'abajo', es: 'Ropa de abajo', en: 'Bottoms', pintar: (c) => c.append(
      opciones(ABAJOS, L().abajo.estilo, (l, v) => { l.abajo.estilo = v!; }, 'cuerpo'),
      colores(COLORES_ROPA, L().abajo.color, (l, v) => { l.abajo.color = v; })) },
    { k: 'zapatos', es: 'Zapatos, medias y guantes', en: 'Shoes, socks & gloves', pintar: (c) => c.append(
      opciones(ZAPATOS, L().zapatos.estilo, (l, v) => { l.zapatos.estilo = v!; }, 'cuerpo'),
      colores(COLORES_ROPA, L().zapatos.color, (l, v) => { l.zapatos.color = v; }),
      h('h4', {}, lang === 'es' ? 'Medias' : 'Socks'), colores(['', ...COLORES_ROPA].filter(Boolean), L().medias ?? '', (l, v) => { l.medias = v; }),
      h('h4', {}, lang === 'es' ? 'Guantes' : 'Gloves'),
      h('div', { class: 'fila' }, h('button', { class: 'chip' + (!L().guantes ? ' on' : ''), onclick: () => cambiar((l) => { l.guantes = null; }) }, t('sin'))),
      colores(COLORES_ROPA, L().guantes ?? '', (l, v) => { l.guantes = v; })) },
    { k: 'acc', es: 'Accesorios', en: 'Accessories', pintar: (c) => c.append(
      h('h4', {}, lang === 'es' ? 'En la mano' : 'Held item'), opciones([null, ...UTILERIAS], L().utileria?.estilo ?? null, (l, v) => { l.utileria = v ? { estilo: v, color: l.utileria?.color ?? '#c89650' } : null; }, 'cuerpo'),
      h('h4', {}, lang === 'es' ? 'Aretes' : 'Earrings'), opciones([null, ...ARETES], L().aretes?.estilo ?? null, (l, v) => { l.aretes = v ? { estilo: v, color: l.aretes?.color ?? '#e8b830' } : null; }, 'cabeza'),
      h('h4', {}, lang === 'es' ? 'Cinturón y más' : 'Belt & more'), opciones([null, ...ACCESORIOS], L().accesorio?.estilo ?? null, (l, v) => { l.accesorio = v ? { estilo: v, color: l.accesorio?.color ?? '#141014' } : null; }, 'cuerpo'),
      L().accesorio ? colores(COLORES_ROPA, L().accesorio!.color, (l, v) => { if (l.accesorio) l.accesorio.color = v; }) : '') },
    { k: 'poder', es: 'Poder', en: 'Power', pintar: (c) => {
      const fila = h('div', { class: 'opciones' });
      for (const p of PODERES) {
        const l = cloneLook(L()); l.poder.estilo = p;
        const e = efecto('poder', l, 32)!;
        fila.append(h('button', { class: 'op' + (L().poder.estilo === p ? ' on' : ''), onclick: () => cambiar((x) => { x.poder.estilo = p; }) }, miniatura(e.frames[0], 34, 2), h('span', {}, et(p))));
      }
      c.append(fila, colores(COLORES_ROPA.concat(['#4ab8ff', '#5ac8ff', '#ffe060']), L().poder.color, (l, v) => { l.poder.color = v; }),
        colores(['#ffffff', '#e8fbff', '#fff6c8', '#ffe0ea', '#e8ffe8'], L().poder.color2, (l, v) => { l.poder.color2 = v; }, t('color2')),
        h('p', { class: 'nota' }, lang === 'es' ? 'Míralo en la animación "Poder" o en la arena con L.' : 'See it in the "Fireball" move or in the arena with L.'));
    } },
  ];
  let catActual = leer('pf.chibi.cat', 'pelo');
  const tabsCat = h('div', { class: 'cats' });
  const cont = h('div', { class: 'cat-cont' });
  const pintarCat = () => {
    tabsCat.innerHTML = ''; cont.innerHTML = '';
    for (const c of cats) tabsCat.append(h('button', { class: 'chip' + (c.k === catActual ? ' on' : ''), onclick: () => { catActual = c.k; guardar('pf.chibi.cat', c.k); pintarCat(); } }, lang === 'es' ? c.es : c.en));
    (cats.find((c) => c.k === catActual) ?? cats[0]).pintar(cont);
  };
  // atajos: la familia y los trajes
  const atajos = h('div', { class: 'atajos' }, ...MIEMBROS.map((id) => h('button', { class: 'mio-btn', onclick: () => ponerLook(familiar(id, 'siempre')) }, miniatura(cuerpoMini(familiar(id, 'siempre')), 30, 2), h('span', {}, NOMBRE_MIEMBRO[id]))));
  s.append(h('div', { class: 'tienda' }, panelPrev, h('div', { class: 'estante' }, h('h2', {}, t('tienda')), atajos, tabsCat, cont)));
  pintarCat();
  oyentes.add(() => { rep.poner(L()); nombre.value = L().nombre; llenarSel(); pintarCat(); });
}

function azar(): ChibiLook {
  const r = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
  const l = defaultLook();
  l.nombre = r(['Chamo', 'Pana', 'Catira', 'Gocho', 'Maracucho', 'Negrita', 'Flaco', 'Gorda']);
  l.piel = r(PIELES); l.pelo = { estilo: r(PEINADOS), color: r(COLORES_PELO), color2: r(COLORES_ROPA) };
  l.ojos = { estilo: r(OJOS), color: '#141014' }; l.cejas = { estilo: r(CEJAS) }; l.boca = r(BOCAS);
  l.barba = Math.random() < 0.25 ? { estilo: r(BARBAS), color: r(COLORES_PELO) } : null;
  l.lentes = Math.random() < 0.3 ? { estilo: r(LENTES), color: r(['#1e1e24', '#c8a040', '#c0392b']) } : null;
  l.gorro = Math.random() < 0.4 ? { estilo: r(GORROS), color: r(COLORES_ROPA), color2: r(COLORES_ROPA) } : null;
  l.arriba = { estilo: r(ARRIBAS), color: r(COLORES_ROPA), color2: r(COLORES_ROPA), estampado: r(ESTAMPADOS) };
  l.abajo = { estilo: r(ABAJOS), color: r(COLORES_ROPA) };
  l.zapatos = { estilo: r(ZAPATOS), color: r(COLORES_ROPA), color2: '#f4f2ee' };
  l.guantes = Math.random() < 0.3 ? r(COLORES_ROPA) : null;
  l.marca = Math.random() < 0.25 ? r(MARCAS) : null;
  l.poder = { estilo: r(PODERES), color: r(COLORES_ROPA), color2: '#ffffff' };
  return l;
}

// ------------------------------------------------------------------ movimientos
function montarMovimientos(s: HTMLElement) {
  const titulo = h('h2', {}, t('movs'));
  const nota = h('p', { class: 'nota' }, lang === 'es'
    ? 'La pelea entera está calcada del video cuadro por cuadro: las poses de Ryu y Ken, con sus tiempos y sus desplazamientos reales, vestidas con tu muñeco. Lo demás sale del motor por piezas con la misma cabeza y el mismo cuerpo.'
    : 'All fighting moves are traced frame by frame from the video: Ryu and Ken poses with their real timing and travel, dressed as your chibi. The rest comes from the parts engine with the same head and body.');
  const cont = h('div', {});
  const reps: Reproductor[] = [];
  const pintar = () => {
    for (const r of reps) r.destruir();
    reps.length = 0; cont.innerHTML = '';
    const grupos: Record<string, Clip[]> = {};
    for (const c of clipsDe(estado.look)) (grupos[c.grupo] ??= []).push(c);
    for (const [g, cs] of Object.entries(grupos)) {
      const grid = h('div', { class: 'movs' });
      for (const c of cs) {
        const r = reproductor(estado.look, 32, c.id, 3, 'mov');
        reps.push(r);
        const video = c.cuadros.some((q) => q.p.molde);
        grid.append(h('figure', { class: 'mov-card' }, r.el, h('figcaption', {}, tr(c.nombre), h('small', { class: video ? 'tag v' : 'tag' }, video ? t('video') : t('piezas')))));
      }
      cont.append(h('h3', {}, t(g), h('small', {}, ` · ${cs.length}`)), grid);
    }
  };
  s.append(titulo, nota, cont);
  pintar();
  // si cambia el muñeco con la pestaña escondida, se repinta al volver a mostrarla
  let sucio = false;
  oyentes.add(() => { if (!s.hidden) pintar(); else sucio = true; });
  alMostrar.movs = () => { if (sucio) { sucio = false; pintar(); } };
}
