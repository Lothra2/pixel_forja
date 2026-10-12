import '../arena/arena.css';
import './visor.css';
import { urlSource, filesSource, type KitSource } from '../arena/kit';
import { readManifest, frameRect, overlaysOf, atlasImage, OVERLAYS, type VKit, type VChar, type VPack, type VAnim, type Atlas, type Overlay, type Pt } from './model';

/**
 * Visor del kit: recorre atletas, packs y animaciones de un kit de PixelForja con los datos por cuadro dibujados encima
 * (cajas, cuerpo, manos, cabeza, pies, carga, arma, agua, eventos y pivote). Lee el kit publicado junto a la página
 * (kit_nekketsu/ o kit_deportes/), el de ?kit=<carpeta> o una carpeta del equipo. Es también la referencia de cómo un
 * juego lee el kit y compone el arma en la mano.
 */

type Lang = 'es' | 'en';
let lang: Lang = (() => {
  try { const s = localStorage.getItem('pf.lang'); if (s === 'es' || s === 'en') return s; } catch { /* sin almacenamiento */ }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
})();
const T = {
  title: ['Visor del kit', 'Kit viewer'], sub: ['Atletas, packs y animaciones con sus datos', 'Athletes, packs and animations with their data'],
  who: ['Personaje', 'Character'], pack: ['Pack', 'Pack'], open: ['Abrir otro kit', 'Open another kit'], studio: ['Volver al estudio', 'Back to the studio'],
  loading: ['Cargando el kit…', 'Loading the kit…'],
  noKit: ['No encontré un kit. Genera uno con npm run kit-a-medida y ábrelo con el botón, o usa ?kit=<carpeta>.', 'No kit found. Build one with npm run kit-a-medida and open it with the button, or use ?kit=<folder>.'],
  play: ['Pausa', 'Pause'], paused: ['Seguir', 'Play'], prev: ['Cuadro anterior', 'Previous frame'], next: ['Cuadro siguiente', 'Next frame'],
  speed: ['Velocidad', 'Speed'], zoom: ['Zoom', 'Zoom'], weapon: ['Arma en la mano', 'Weapon in hand'], none: ['ninguna', 'none'],
  frames: ['Cuadros', 'Frames'], fps: ['FPS', 'FPS'], loop: ['Bucle', 'Loop'], yes: ['sí', 'yes'], no: ['no', 'no'], frame: ['Cuadro', 'Frame'],
  adv: ['Avance', 'Stride'], lift: ['Elevación', 'Lift'], travel: ['Desplazamiento', 'Travel'], events: ['Eventos', 'Events'], data: ['Datos', 'Data'],
  team: ['Equipo', 'Team'], chars: ['personajes', 'characters'], animals: ['Animales', 'Animals'], noTeam: ['Sin equipo', 'No team'], tests: ['Pruebas', 'Events'],
  keys: ['Espacio pausa · ← → cuadro a cuadro · ↑ ↓ animación', 'Space pauses · ← → step · ↑ ↓ animation'],
  cajas: ['cajas', 'boxes'], cuerpo: ['cuerpo', 'body'], manos: ['manos', 'hands'], cabeza: ['cabeza', 'head'], pies: ['pies', 'feet'],
  carga: ['carga', 'carry'], arma: ['arma', 'weapon'], agua: ['agua', 'water'], eventos: ['eventos', 'events'], pivote: ['pivote', 'pivot'],
} as const;
const t = (k: keyof typeof T) => T[k][lang === 'es' ? 0 : 1];
/** lo que viene del kit se escapa: un kit ajeno no puede meter HTML en la página */
const esc = (v: unknown) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const COLORS: Record<Overlay, string> = {
  cajas: '#4ade80', cuerpo: '#5a9dff', manos: '#ffd34d', cabeza: '#ff4f6d', pies: '#39d0d8', carga: '#d16bff', arma: '#ff8a3d', agua: '#6ec3ff', eventos: '#ffffff', pivote: '#ffffff',
};

const app = document.getElementById('app')!;
app.innerHTML = `
  <header class="ar-top">
    <a class="ar-brand" href="./" id="vk-home"><span class="ar-logo">PF</span><span><b data-k="title"></b><small data-k="sub"></small></span></a>
    <div class="ar-picks">
      <label><span data-k="who"></span><select id="vk-char" data-testid="visor-char"></select></label>
      <label class="ar-btn ar-file"><span data-k="open"></span><input id="vk-folder" type="file" webkitdirectory multiple hidden /></label>
      <button class="ar-btn ar-ghost" id="vk-lang"></button>
    </div>
  </header>
  <p class="vk-kit" id="vk-kit"></p>
  <nav class="ar-tabs" id="vk-packs" role="tablist" data-testid="visor-packs"></nav>
  <div class="vk-main">
    <section class="vk-stage" id="vk-stage">
      <div class="vk-rows" id="vk-rows" data-testid="visor-rows"></div>
      <div class="ar-loading" id="vk-loading"></div>
    </section>
    <aside class="ar-data vk-side">
      <div class="vk-bar">
        <button class="ar-btn ar-ghost" id="vk-prev" aria-label="">◀</button>
        <button class="ar-btn" id="vk-play" data-testid="visor-play"></button>
        <button class="ar-btn ar-ghost" id="vk-next" aria-label="">▶</button>
      </div>
      <div class="vk-bar">
        <label><span data-k="speed"></span> <select id="vk-speed"><option value="1">1x</option><option value="0.5">½</option><option value="0.25">¼</option></select></label>
        <label><span data-k="zoom"></span> <select id="vk-zoom"><option>2</option><option>3</option><option>4</option><option>6</option></select></label>
      </div>
      <label class="vk-weapon" id="vk-weapon-wrap" hidden><span data-k="weapon"></span> <select id="vk-weapon" data-testid="visor-weapon"></select></label>
      <div class="vk-toggles" id="vk-toggles" data-testid="visor-toggles"></div>
      <dl id="vk-stats" data-testid="visor-stats"></dl>
      <p class="ar-keys" data-k="keys"></p>
    </aside>
  </div>
  <section class="vk-board" id="vk-board" data-testid="visor-board"></section>
  <footer class="ar-foot"><a href="./" data-k="studio"></a> · <a href="arena.html">Arena</a></footer>
`;
const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;

// ---------- estado ----------
let kit: VKit | null = null;
let source: KitSource | null = null;
let ch: VChar | null = null;
let pack: VPack | null = null;
let an: VAnim | null = null;
let frame = 0, playing = true, clock = 0, last = performance.now(), hold = 0;
const shown = new Set<Overlay>(OVERLAYS.filter((o) => o !== 'cuerpo'));
const atlases = new Map<string, Promise<Atlas>>();
const images = new Map<string, Promise<HTMLImageElement>>();
const loaded = { atlas: new Map<string, Atlas>(), img: new Map<string, HTMLImageElement>() };
let objAtlas: Atlas | null = null;
let rowCanvases: HTMLCanvasElement[] = [];
let thumbs: { c: HTMLCanvasElement; a: VAnim }[] = [];
const hook = { ready: false, error: '', char: '', pack: '', anim: '', frame: 0, playing: true, rows: 0, drawn: 0 };
(window as unknown as { __visor: typeof hook }).__visor = hook;

const param = new URLSearchParams(location.search);
const url = (p: string) => source?.url(p);
function fetchJson<J>(p: string): Promise<J> {
  const u = url(p);
  if (!u) return Promise.reject(new Error(`Falta ${p}`));
  return fetch(u).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json() as Promise<J>; });
}
function atlas(p: string) {
  let a = atlases.get(p);
  if (!a) { a = fetchJson<Atlas>(p).then((j) => { loaded.atlas.set(p, j); return j; }); atlases.set(p, a); }
  return a;
}
function image(p: string) {
  let i = images.get(p);
  if (!i) {
    i = new Promise((ok, fail) => {
      const u = url(p);
      if (!u) { fail(new Error(`Falta ${p}`)); return; }
      const im = new Image();
      im.onload = () => { loaded.img.set(p, im); ok(im); };
      im.onerror = () => fail(new Error(`No se pudo cargar ${p}`));
      im.src = u;
    });
    images.set(p, i);
  }
  return i;
}

// ---------- carga ----------
async function boot(src: KitSource | null) {
  const loading = $('vk-loading');
  loading.hidden = false; loading.textContent = t('loading');
  hook.ready = false; hook.error = '';
  atlases.clear(); images.clear(); loaded.atlas.clear(); loaded.img.clear(); objAtlas = null;
  try {
    // sin ?kit: el kit a medida publicado junto a la página, o si no el deportivo
    const tries = src ? [src] : param.get('kit') ? [urlSource(param.get('kit')!)] : [urlSource('kit_nekketsu/'), urlSource('kit_deportes/')];
    let err: unknown = null;
    for (const s of tries) {
      source = s;
      try { kit = readManifest(await fetchJson('manifest.json')); err = null; break; } catch (e) { err = e; }
    }
    if (err || !kit) throw err ?? new Error('sin kit');
    const objAtlasPath = Object.values(kit.objetos)[0]?.atlas;
    if (objAtlasPath) objAtlas = await atlas(objAtlasPath).catch(() => null);
    fillChars();
    const want = param.get('p');
    await pickChar(kit.chars.find((c) => c.id === want) ?? kit.chars[0], param.get('pack') ?? undefined, param.get('anim') ?? undefined);
    loading.hidden = true;
    hook.ready = true;
  } catch (e) {
    loading.textContent = `${t('noKit')} (${(e as Error).message})`;
    hook.error = (e as Error).message;
  }
}

function fillChars() {
  const sel = $<HTMLSelectElement>('vk-char');
  const groups = new Map<string, VChar[]>();
  for (const c of kit!.chars) {
    const g = c.tipo === 'animal' ? t('animals') : c.equipo ? (kit!.equipos[c.equipo]?.nombre ?? c.equipo) : t('noTeam');
    groups.set(g, [...(groups.get(g) ?? []), c]);
  }
  sel.innerHTML = [...groups].map(([g, cs]) => `<optgroup label="${esc(g)}">${cs.map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}${c.numero ? ` · ${esc(c.numero)}` : ''}</option>`).join('')}</optgroup>`).join('');
  $('vk-kit').innerHTML = `<b>${esc(kit!.juego)}</b> · ${esc(source!.label)} · ${kit!.chars.length} ${t('chars')} · ${t('team').toLowerCase()}: ${Object.values(kit!.equipos).map((e) => `<span class="vk-team">${(e.colores ?? []).map((c) => `<i style="background:${esc(c)}"></i>`).join('')}${esc(e.nombre)}</span>`).join(' ') || '–'}`;
}

async function pickChar(c: VChar, packName?: string, animName?: string) {
  ch = c;
  $<HTMLSelectElement>('vk-char').value = c.id;
  const names = Object.keys(c.packs);
  const tabs = $('vk-packs');
  tabs.hidden = names.length < 2;
  tabs.innerHTML = names.map((p) => `<button role="tab" data-pack="${esc(p)}">${esc(p)} <small>${Object.keys(c.packs[p].anims).length}</small></button>`).join('');
  await pickPack(c.packs[packName ?? ''] ?? c.packs[names[0]], animName);
}

async function pickPack(p: VPack, animName?: string) {
  pack = p;
  for (const b of $('vk-packs').querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.pack === p.name));
  // un atlas y su imagen por pack; en las tiras, una hoja por animación
  if (p.atlas) { const a = await atlas(p.atlas); await image(atlasImage(p.atlas, a)); }
  else await Promise.all(Object.values(p.anims).map((a) => (a.raw.archivo ? image(a.raw.archivo).catch(() => null) : null)));
  if (objAtlas) await image(atlasImage(Object.values(kit!.objetos)[0].atlas, objAtlas)).catch(() => null);
  buildBoard();
  pickAnim(p.anims[animName ?? ''] ?? Object.values(p.anims)[0]);
}

function pickAnim(a: VAnim) {
  an = a; frame = 0; clock = 0; hold = 0;
  for (const b of $('vk-board').querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-pressed', String(b.dataset.anim === a.name));
  buildRows();
  buildToggles();
  // el arma en la mano: solo en las animaciones que traen `arma`
  const hasWeapon = Array.isArray(a.raw.arma) && !!objAtlas;
  $('vk-weapon-wrap').hidden = !hasWeapon;
  if (hasWeapon) {
    const sel = $<HTMLSelectElement>('vk-weapon');
    const keep = sel.value;
    const ids = Object.entries(kit!.objetos).filter(([, o]) => o.anims?.mano).map(([id]) => id);
    sel.innerHTML = `<option value="">${t('none')}</option>` + ids.map((id) => `<option>${esc(id)}</option>`).join('');
    sel.value = ids.includes(keep) ? keep : ids[0] ?? '';
  }
  const q = new URLSearchParams(location.search);
  q.set('p', ch!.id); q.set('pack', pack!.name); q.set('anim', a.name);
  history.replaceState(null, '', `?${q}`);
  Object.assign(hook, { char: ch!.id, pack: pack!.name, anim: a.name });
  draw();
}

// ---------- tablero ----------
function buildBoard() {
  const board = $('vk-board');
  board.innerHTML = '';
  thumbs = [];
  for (const a of Object.values(pack!.anims)) {
    const b = document.createElement('button');
    b.dataset.anim = a.name;
    b.className = 'vk-thumb';
    const c = document.createElement('canvas');
    c.width = c.height = ch!.celda;
    b.append(c, Object.assign(document.createElement('span'), { textContent: a.name }));
    b.onclick = () => pickAnim(a);
    board.append(b);
    thumbs.push({ c, a });
  }
}

function buildRows() {
  const rows = $('vk-rows');
  rows.innerHTML = '';
  rowCanvases = kit!.filas.map((f) => {
    const fig = document.createElement('figure');
    const c = document.createElement('canvas');
    c.dataset.fila = f;
    fig.append(c, Object.assign(document.createElement('figcaption'), { textContent: f }));
    rows.append(fig);
    return c;
  });
  hook.rows = rowCanvases.length;
}

function buildToggles() {
  const box = $('vk-toggles');
  const have = overlaysOf(an!);
  box.innerHTML = have.map((o) => `<label><input type="checkbox" data-o="${o}" ${shown.has(o) ? 'checked' : ''}/> <i style="background:${COLORS[o]}"></i>${t(o)}</label>`).join('');
  for (const i of box.querySelectorAll<HTMLInputElement>('input')) i.onchange = () => { const o = i.dataset.o as Overlay; if (i.checked) shown.add(o); else shown.delete(o); draw(); };
}

// ---------- dibujo ----------
function blitFrame(g: CanvasRenderingContext2D, a: VAnim, row: number, k: number, z: number): boolean {
  const atl = pack!.atlas ? loaded.atlas.get(pack!.atlas) : undefined;
  const r = frameRect(kit!, ch!, pack!, a, row, k, atl);
  const img = r && loaded.img.get(r.image);
  if (!r || !img) return false;
  g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w * z, r.h * z);
  return true;
}

/** El arma en la mano, como la compone el juego: <id>_mano_<k> con k = round(angulo / 22.5) % 16, centro en (x, y). */
function drawWeapon(g: CanvasRenderingContext2D, d: number[], z: number, P: Pt) {
  const id = $<HTMLSelectElement>('vk-weapon').value;
  if (!id || !objAtlas) return;
  const f = objAtlas.frames[`${id}_mano_${Math.round(d[2] / 22.5) % 16}`]?.frame;
  const img = loaded.img.get(atlasImage(Object.values(kit!.objetos)[0].atlas, objAtlas));
  if (!f || !img) return;
  g.drawImage(img, f.x, f.y, f.w, f.h, (P[0] + d[0] - f.w / 2) * z, (P[1] + d[1] - f.h / 2) * z, f.w * z, f.h * z);
}

function drawOverlays(g: CanvasRenderingContext2D, a: VAnim, row: number, k: number, z: number, P: Pt) {
  const R = a.raw;
  const at = (x: number, y: number): Pt => [(P[0] + x + 0.5) * z, (P[1] + y + 0.5) * z];
  const dot = (p: Pt | null | undefined, color: string, filled = true, r = Math.max(2, z * 0.7)) => {
    if (!p) return;
    const [x, y] = at(p[0], p[1]);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    g.lineWidth = Math.max(1, z / 2);
    if (filled) { g.fillStyle = color; g.fill(); g.strokeStyle = '#000'; g.stroke(); } else { g.strokeStyle = color; g.stroke(); }
  };
  const box = (b: number[] | null | undefined, color: string, dash: number[] = []) => {
    if (!b) return;
    g.setLineDash(dash.map((d) => d * z)); g.strokeStyle = color; g.lineWidth = Math.max(1, z / 2);
    g.strokeRect((P[0] + b[0]) * z + 0.5, (P[1] + b[1]) * z + 0.5, b[2] * z - 1, b[3] * z - 1);
    g.setLineDash([]);
  };
  const cell = (f: string) => R[f]?.[row]?.[k];
  if (shown.has('cajas')) box(cell('cajas'), COLORS.cajas);
  if (shown.has('cuerpo')) box(cell('cuerpo'), COLORS.cuerpo, [2, 1]);
  if (shown.has('agua') && Array.isArray(R.agua) && R.agua[k] != null) {
    g.strokeStyle = COLORS.agua; g.lineWidth = Math.max(1, z / 2); g.setLineDash([2 * z, z]);
    g.beginPath(); g.moveTo(0, (R.agua[k] + 0.5) * z); g.lineTo(ch!.celda * z, (R.agua[k] + 0.5) * z); g.stroke(); g.setLineDash([]);
  }
  if (shown.has('cabeza')) dot(cell('cabeza'), COLORS.cabeza);
  if (shown.has('manos')) { const m = cell('manos'); if (m) { dot(m[1], COLORS.manos, false); dot(m[0], COLORS.manos); } }
  if (shown.has('pies')) { const p = cell('pies'); if (p) { dot(p[1], COLORS.pies, false); dot(p[0], COLORS.pies); } }
  if (shown.has('carga')) { const c = cell('carga'); if (c) { const [x, y] = at(c[0], c[1]); g.fillStyle = COLORS.carga; g.fillRect(x - 3 * z, y - z / 2, 6 * z, z); } }
  if (shown.has('arma')) {
    const w = cell('arma');
    // el agarre; el ángulo se ve con el arma compuesta (selector "Arma en la mano")
    if (w) dot([w[0], w[1]], COLORS.arma);
  }
  if (shown.has('pivote')) {
    const [x, y] = at(0, 0);
    g.strokeStyle = COLORS.pivote; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x - 2 * z, y); g.lineTo(x + 2 * z, y); g.moveTo(x, y - 2 * z); g.lineTo(x, y + 2 * z); g.stroke();
  }
  if (shown.has('eventos')) {
    const evs = (R.eventos ?? []).filter((e: { cuadro: number }) => e.cuadro === k);
    g.font = `700 ${Math.max(10, 3 * z)}px Silkscreen, monospace`; g.textBaseline = 'top';
    evs.forEach((e: { tipo: string; pie?: string; punto?: Pt[] }, i: number) => {
      const label = e.pie ? `${e.tipo} ${e.pie}` : e.tipo;
      g.fillStyle = '#000'; g.fillText(label, 3, 3 + i * 4 * z + 1); g.fillStyle = COLORS.eventos; g.fillText(label, 2, 2 + i * 4 * z);
      if (e.punto?.[row]) {
        const [x, y] = at(e.punto[row][0], e.punto[row][1]);
        g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, z / 2);
        g.beginPath(); for (let s = 0; s < 4; s++) { const q = (s * Math.PI) / 4; g.moveTo(x - Math.cos(q) * 3 * z, y - Math.sin(q) * 3 * z); g.lineTo(x + Math.cos(q) * 3 * z, y + Math.sin(q) * 3 * z); } g.stroke();
      }
    });
  }
}

function draw() {
  if (!kit || !ch || !pack || !an) return;
  const z = +$<HTMLSelectElement>('vk-zoom').value;
  const C = ch.celda;
  const P = ch.pivote;
  let drawn = 0;
  rowCanvases.forEach((c, row) => {
    if (c.width !== C * z) { c.width = c.height = C * z; }
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    const w = an!.raw.arma?.[row]?.[frame];
    if (w && w[3]) drawWeapon(g, w, z, P);
    if (blitFrame(g, an!, row, frame, z)) drawn++;
    if (w && !w[3]) drawWeapon(g, w, z, P);
    drawOverlays(g, an!, row, frame, z, P);
  });
  hook.frame = frame; hook.drawn = drawn; hook.playing = playing;
  stats();
}

function stats() {
  const R = an!.raw;
  const row = (k: string, v: unknown) => (v === undefined || v === '' ? '' : `<dt>${t(k as keyof typeof T)}</dt><dd>${v}</dd>`);
  const list = (v?: number[]) => (Array.isArray(v) ? `${esc(v[frame])} <code>[${v.map((x, i) => (i === frame ? `<b>${esc(x)}</b>` : esc(x))).join(', ')}]</code>` : undefined);
  const evs = (R.eventos ?? []).map((e: { tipo: string; cuadro: number; pie?: string }) => `<span class="${e.cuadro === frame ? 'vk-on' : ''}">${esc(e.tipo)}${e.pie ? ` ${esc(e.pie)}` : ''} @${e.cuadro}</span>`).join(' ');
  const pruebas = Object.entries(kit!.pruebas ?? {}).filter(([, ps]) => ps.includes(pack!.name)).map(([p]) => esc(p)).join(', ');
  $('vk-stats').innerHTML = [
    `<dt>${t('frame')}</dt><dd data-testid="visor-frame">${frame + 1} / ${an!.cuadros} <code>${esc(`${an!.name}_${kit!.filas[0]}_${frame}`)}</code></dd>`,
    row('fps', an!.fps), row('loop', an!.loop ? t('yes') : t('no')), row('adv', R.avance), row('lift', list(R.elevacion)), row('travel', list(R.desplazamiento)),
    row('events', evs), row('data', overlaysOf(an!).filter((o) => o !== 'pivote').map((o) => esc(o)).join(', ')), row('tests', pruebas),
  ].join('');
}

// ---------- reloj ----------
function tick(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (an && playing) {
    const speed = +$<HTMLSelectElement>('vk-speed').value;
    if (hold > 0) { hold -= dt; if (hold <= 0) { frame = 0; clock = 0; draw(); } }
    else {
      clock += dt * speed;
      const k = Math.floor(clock * an.fps);
      const next = an.loop ? k % an.cuadros : Math.min(k, an.cuadros - 1);
      if (next !== frame) { frame = next; draw(); }
      // las que no son bucle se quedan un momento en el último cuadro y vuelven a empezar
      if (!an.loop && k >= an.cuadros - 1 && hold <= 0) hold = 0.7;
    }
  }
  // el tablero: la fila de la primera dirección de cada animación, en bucle
  for (const { c, a } of thumbs) {
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    blitFrame(g, a, 0, Math.floor((now / 1000) * a.fps) % a.cuadros, 1);
  }
  requestAnimationFrame(tick);
}

// ---------- controles ----------
function applyLang() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll<HTMLElement>('[data-k]')) el.textContent = t(el.dataset.k as keyof typeof T);
  $('vk-lang').textContent = lang === 'es' ? 'EN' : 'ES';
  $('vk-home').title = t('studio');
  $('vk-prev').setAttribute('aria-label', t('prev')); $('vk-next').setAttribute('aria-label', t('next'));
  $('vk-play').textContent = playing ? t('play') : t('paused');
  if (kit) { fillChars(); if (ch) $<HTMLSelectElement>('vk-char').value = ch.id; if (an) { buildToggles(); stats(); } }
}
const step = (d: number) => { if (!an) return; playing = false; hold = 0; frame = (frame + d + an.cuadros) % an.cuadros; clock = frame / an.fps; applyLang(); draw(); };
$('vk-play').onclick = () => { playing = !playing; applyLang(); draw(); };
$('vk-prev').onclick = () => step(-1);
$('vk-next').onclick = () => step(1);
$('vk-zoom').onchange = draw;
$('vk-weapon').onchange = draw;
$('vk-char').onchange = (e) => { const c = kit?.chars.find((x) => x.id === (e.target as HTMLSelectElement).value); if (c) void pickChar(c, pack?.name, an?.name); };
$('vk-packs').onclick = (e) => { const b = (e.target as HTMLElement).closest('button'); if (b && ch) void pickPack(ch.packs[b.dataset.pack!]); };
$('vk-folder').onchange = (e) => { const fs = (e.target as HTMLInputElement).files; if (fs?.length) void boot(filesSource(fs)); };
$('vk-lang').onclick = () => { lang = lang === 'es' ? 'en' : 'es'; try { localStorage.setItem('pf.lang', lang); } catch { /* sin almacenamiento */ } applyLang(); };
addEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.target as HTMLElement).closest('select, input')) return;
  if (e.key === ' ') { e.preventDefault(); $('vk-play').click(); }
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'ArrowRight') step(1);
  else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && pack && an) {
    e.preventDefault();
    const list = Object.values(pack.anims);
    pickAnim(list[(list.indexOf(an) + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]);
  }
});
$<HTMLSelectElement>('vk-zoom').value = matchMedia('(max-width: 560px)').matches ? '2' : '3';

applyLang();
requestAnimationFrame(tick);
void boot(null);
