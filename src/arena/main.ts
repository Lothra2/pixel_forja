import './arena.css';
import { Kit, urlSource, filesSource, type KitSource } from './kit';
import { Game, SPORTS } from './game';
import type { SceneId } from './scenes';

/**
 * Arena PixelForja: prueba el kit deportivo como lo usaría un juego. Lee el kit publicado junto a esta página
 * (kit_deportes/) o el que elijas de tu equipo. Teclado: flechas o WASD, Shift corre, 1 a 9 las acciones.
 * En el teléfono: palanca a la izquierda y botones abajo.
 */

type Lang = 'es' | 'en';
let lang: Lang = (() => {
  try { const s = localStorage.getItem('pf.lang'); if (s === 'es' || s === 'en') return s; } catch { /* sin almacenamiento */ }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
})();

const T = {
  title: ['Arena', 'Arena'],
  sub: ['Tu kit deportivo jugando de verdad', 'Your sports kit, actually playing'],
  athlete: ['Atleta', 'Athlete'], rival: ['Rival', 'Rival'],
  loading: ['Cargando el kit…', 'Loading the kit…'],
  noKit: ['No encontré el kit. Genera uno con npm run deportes o elige una carpeta.', 'Kit not found. Build one with npm run deportes or pick a folder.'],
  yourKit: ['Probar tu kit', 'Try your kit'], studio: ['Volver al estudio', 'Back to the studio'],
  data: ['Datos del kit', 'Kit data'], cell: ['Celda y pivote', 'Cell and pivot'], slow: ['Cámara lenta', 'Slow motion'], sound: ['Sonido', 'Sound'],
  reset: ['Reiniciar', 'Reset'], credits: ['Créditos del arte (LPC)', 'Art credits (LPC)'], run: ['Correr con', 'Run with'],
  anim: ['Animación', 'Animation'], frame: ['Cuadro', 'Frame'], rate: ['Ritmo', 'Rate'], adv: ['Avance', 'Stride'], travel: ['Desplazamiento', 'Travel'], lift: ['Elevación', 'Lift'], events: ['Eventos', 'Events'],
  keys: ['Flechas o WASD para moverte · Shift corre · 1 a 9 acciones · Espacio la primera', 'Arrows or WASD to move · Shift runs · 1 to 9 actions · Space the first one'],
  athletics: ['Atletismo', 'Athletics'], swim: ['Natación', 'Swimming'], volley: ['Vóley', 'Volleyball'], tennis: ['Tenis', 'Tennis'], fight: ['Pelea', 'Fight'],
  hint_atletismo: ['Salida y corre a la meta. Salta en la arena, lanza la bala y la jabalina.', 'Start from the blocks and run to the finish. Jump in the pit, throw the shot and the javelin.'],
  hint_natacion: ['Clavado para entrar al agua y nada hasta el otro lado.', 'Dive in and swim to the far end.'],
  hint_voley: ['Saca y devuelve. La pelota se pega en el cuadro del golpe que trae el kit.', 'Serve and return. The ball is hit on the kit’s impact frame.'],
  hint_tenis: ['Saca y devuelve después del pique.', 'Serve and return after the bounce.'],
  hint_pelea: ['Acércate y pega. El rival se cubre y contraataca.', 'Close in and strike. The rival blocks and counters.'],
} as const;
const t = (k: keyof typeof T) => T[k][lang === 'es' ? 0 : 1];

const ANIM: Record<string, [string, string]> = {
  idle: ['Reposo', 'Idle'], walk: ['Caminar', 'Walk'], run: ['Correr', 'Run'], sprint: ['Sprint', 'Sprint'], hurdles: ['Vallas', 'Hurdles'],
  sprint_start: ['Salida', 'Start'], long_jump: ['Salto largo', 'Long jump'], pole_vault: ['Garrocha', 'Pole vault'], shot_put: ['Bala', 'Shot put'], javelin: ['Jabalina', 'Javelin'], celebrate: ['Festejar', 'Celebrate'],
  swim: ['Crol', 'Crawl'], swim_back: ['Espalda', 'Backstroke'], swim_breast: ['Pecho', 'Breaststroke'], swim_fly: ['Mariposa', 'Butterfly'], tread_water: ['Flotar', 'Tread water'], dive: ['Clavado', 'Dive'],
  vb_ready: ['Espera', 'Ready'], serve: ['Saque', 'Serve'], vb_bump: ['Recepción', 'Bump'], vb_set: ['Colocación', 'Set'], spike: ['Remate', 'Spike'], block: ['Bloqueo', 'Block'], vb_dive: ['Plancha', 'Dive'],
  tn_ready: ['Espera', 'Ready'], tennis_serve: ['Saque', 'Serve'], forehand: ['Derecha', 'Forehand'], backhand: ['Revés', 'Backhand'], tn_volley: ['Volea', 'Volley'], tn_smash: ['Smash', 'Smash'],
  guard: ['Guardia', 'Guard'], fight_step: ['Paso de guardia', 'Guard step'], jab: ['Jab', 'Jab'], punch: ['Directo', 'Cross'], hook: ['Gancho', 'Hook'], uppercut: ['Uppercut', 'Uppercut'], low_kick: ['Patada baja', 'Low kick'],
  kick_martial: ['Patada alta', 'High kick'], flying_kick: ['Patada voladora', 'Flying kick'], fight_block: ['Bloqueo', 'Block'], slip: ['Esquiva', 'Slip'], fight_hit: ['Golpe recibido', 'Hit'], knockout: ['Nocaut', 'Knockout'], victory: ['Victoria', 'Victory'],
  hit: ['Golpe recibido', 'Hit'], sad: ['Triste', 'Sad'],
};
/** lo que viene del kit (nombres, animaciones) se escapa: un kit ajeno no puede meter HTML en la página */
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const animLabel = (n: string) => esc(ANIM[n]?.[lang === 'es' ? 0 : 1] ?? n);
const SPORT_LABEL: Record<SceneId, keyof typeof T> = { atletismo: 'athletics', natacion: 'swim', voley: 'volley', tenis: 'tennis', pelea: 'fight' };

// ---------- página ----------

const app = document.getElementById('app')!;
app.innerHTML = `
  <header class="ar-top">
    <a class="ar-brand" href="./" data-k="studio" title=""><span class="ar-logo">PF</span><span><b data-k="title"></b><small data-k="sub"></small></span></a>
    <div class="ar-picks">
      <label><span data-k="athlete"></span><select id="ar-athlete"></select></label>
      <label id="ar-rival-wrap"><span data-k="rival"></span><select id="ar-rival"></select></label>
      <label class="ar-btn ar-file"><span data-k="yourKit"></span><input id="ar-folder" type="file" webkitdirectory multiple hidden /></label>
      <button class="ar-btn ar-ghost" id="ar-lang"></button>
    </div>
  </header>
  <nav class="ar-tabs" id="ar-tabs" role="tablist"></nav>
  <section class="ar-stage" id="ar-stage">
    <canvas id="ar-view" aria-label="arena"></canvas>
    <div class="ar-hud"><div id="ar-score"></div><div id="ar-msg"></div></div>
    <div class="ar-stick" id="ar-stick"><div></div></div>
    <div class="ar-loading" id="ar-loading"></div>
  </section>
  <p class="ar-hint" id="ar-hint"></p>
  <section class="ar-controls">
    <div class="ar-gaits" id="ar-gaits"></div>
    <div class="ar-actions" id="ar-actions"></div>
  </section>
  <details class="ar-data" id="ar-data" open>
    <summary data-k="data"></summary>
    <div class="ar-toggles">
      <label><input type="checkbox" id="ar-debug" /> <span data-k="cell"></span></label>
      <label><input type="checkbox" id="ar-slow" /> <span data-k="slow"></span></label>
      <label><input type="checkbox" id="ar-sound" /> <span data-k="sound"></span></label>
      <button class="ar-btn ar-ghost" id="ar-reset" data-k="reset"></button>
    </div>
    <dl id="ar-stats"></dl>
    <ol id="ar-log"></ol>
    <p class="ar-keys" data-k="keys"></p>
  </details>
  <footer class="ar-foot"><a id="ar-credits" target="_blank" rel="noopener" data-k="credits"></a> · <a href="./" data-k="studio"></a></footer>
`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const view = $<HTMLCanvasElement>('ar-view');
const stage = $<HTMLDivElement>('ar-stage');
const pix = document.createElement('canvas');
const pg = pix.getContext('2d')!;
const vg = view.getContext('2d')!;

function applyLang() {
  document.documentElement.lang = lang;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-k]'))) {
    const k = el.dataset.k as keyof typeof T;
    if (el.classList.contains('ar-brand')) el.title = t(k); else el.textContent = t(k);
  }
  $('ar-lang').textContent = lang === 'es' ? 'EN' : 'ES';
}

let kit: Kit | null = null;
let game: Game | null = null;
let sport: SceneId = 'atletismo';
let athlete = '';
let rival = '';

async function loadKit(src: KitSource) {
  $('ar-loading').textContent = t('loading');
  $('ar-loading').hidden = false;
  try {
    kit = await Kit.load(src);
  } catch {
    $('ar-loading').textContent = t('noKit');
    return;
  }
  // los autores de las piezas LPC se muestran siempre (la licencia lo pide)
  const cr = kit.manifest.creditos ? src.url(kit.manifest.creditos) : undefined;
  const link = $<HTMLAnchorElement>('ar-credits');
  link.hidden = !cr;
  if (cr) link.href = cr;
  const ids = kit.athleteIds();
  athlete = ids.includes(athlete) ? athlete : ids[0];
  rival = ids.find((i) => i !== athlete && i === rival) ?? ids.find((i) => i !== athlete) ?? athlete;
  fillSelects();
  await start();
}

function fillSelects() {
  if (!kit) return;
  const opts = (sel: string) => kit!.athleteIds().map((id) => `<option value="${esc(id)}"${id === sel ? ' selected' : ''}>${esc(kit!.athlete(id).nombre ?? id)}</option>`).join('');
  $<HTMLSelectElement>('ar-athlete').innerHTML = opts(athlete);
  $<HTMLSelectElement>('ar-rival').innerHTML = opts(rival);
  const sports = (Object.keys(SPORTS) as SceneId[]).filter((s) => kit!.sports(athlete).includes(s));
  if (!sports.includes(sport)) sport = sports[0] ?? 'atletismo';
  $('ar-tabs').innerHTML = sports.map((s) => `<button role="tab" aria-selected="${s === sport}" data-s="${s}">${t(SPORT_LABEL[s])}</button>`).join('');
}

async function start() {
  if (!kit) return;
  $('ar-loading').textContent = t('loading');
  $('ar-loading').hidden = false;
  const g = new Game(kit);
  g.lang = lang;
  g.sfx.on = $<HTMLInputElement>('ar-sound').checked;
  await g.setup(athlete, rival, sport);
  game = g;
  ($ as (id: string) => HTMLElement)('ar-rival-wrap').hidden = !SPORTS[sport].rival;
  $('ar-hint').textContent = t(`hint_${sport}` as keyof typeof T);
  buildControls();
  resize();
  $('ar-loading').hidden = true;
  (window as unknown as { __arena: Game }).__arena = g;
}

function buildControls() {
  if (!game) return;
  const gaits = game.gaits();
  $('ar-gaits').innerHTML = gaits.length > 1
    ? `<span>${t('run')}</span>` + gaits.map((n, i) => `<button class="ar-chip" aria-pressed="${i === game!.gait}" data-g="${i}">${animLabel(n)}</button>`).join('')
    : '';
  $('ar-actions').innerHTML = game.actions().map((n, i) => `<button class="ar-act" data-a="${esc(n)}"><kbd>${i + 1}</kbd>${animLabel(n)}</button>`).join('');
}

// ---------- entrada ----------

const keys = new Set<string>();
const stick = { x: 0, y: 0, id: -1 as number };
window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement)?.tagName === 'SELECT') return;
  keys.add(e.key.toLowerCase());
  if (!game) return;
  const n = Number(e.key);
  const acts = game.actions();
  if (n >= 1 && n <= acts.length) { game.act(acts[n - 1]); e.preventDefault(); }
  if (e.key === ' ' && acts[0]) { game.act(acts[0]); e.preventDefault(); }
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

function intent() {
  let x = 0, y = 0;
  if (keys.has('arrowleft') || keys.has('a')) x -= 1;
  if (keys.has('arrowright') || keys.has('d')) x += 1;
  if (keys.has('arrowup') || keys.has('w')) y -= 1;
  if (keys.has('arrowdown') || keys.has('s')) y += 1;
  if (x || y) { const m = Math.hypot(x, y); return { x: x / m, y: y / m, run: keys.has('shift') }; }
  const m = Math.hypot(stick.x, stick.y);
  return { x: stick.x, y: stick.y, run: m > 0.7 };
}

const stickEl = $('ar-stick');
const knob = stickEl.firstElementChild as HTMLElement;
stickEl.addEventListener('pointerdown', (e) => { stick.id = e.pointerId; stickEl.setPointerCapture(e.pointerId); moveStick(e); });
stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) moveStick(e); });
const endStick = (e: PointerEvent) => { if (e.pointerId !== stick.id) return; stick.id = -1; stick.x = 0; stick.y = 0; knob.style.transform = ''; };
stickEl.addEventListener('pointerup', endStick);
stickEl.addEventListener('pointercancel', endStick);
function moveStick(e: PointerEvent) {
  const r = stickEl.getBoundingClientRect();
  const R = r.width / 2;
  let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  stick.x = x; stick.y = y;
  knob.style.transform = `translate(${x * R * 0.6}px, ${y * R * 0.6}px)`;
}

document.addEventListener('click', async (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-a],[data-g],[data-s]');
  if (!el || !game) return;
  if (el.dataset.a) game.act(el.dataset.a);
  if (el.dataset.g) { game.gait = Number(el.dataset.g); buildControls(); }
  if (el.dataset.s && el.dataset.s !== sport) { sport = el.dataset.s as SceneId; fillSelects(); await start(); }
});
$<HTMLSelectElement>('ar-athlete').addEventListener('change', async (e) => {
  athlete = (e.target as HTMLSelectElement).value;
  if (athlete === rival && kit) rival = kit.athleteIds().find((i) => i !== athlete) ?? athlete;
  fillSelects(); await start();
});
$<HTMLSelectElement>('ar-rival').addEventListener('change', async (e) => { rival = (e.target as HTMLSelectElement).value; await start(); });
$<HTMLInputElement>('ar-folder').addEventListener('change', async (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) await loadKit(filesSource(files));
});
$<HTMLInputElement>('ar-sound').addEventListener('change', (e) => { if (game) game.sfx.on = (e.target as HTMLInputElement).checked; });
$('ar-reset').addEventListener('click', () => game?.reset());
$('ar-lang').addEventListener('click', () => {
  lang = lang === 'es' ? 'en' : 'es';
  try { localStorage.setItem('pf.lang', lang); } catch { /* sin almacenamiento */ }
  applyLang(); fillSelects(); buildControls();
  if (game) { game.lang = lang; $('ar-hint').textContent = t(`hint_${sport}` as keyof typeof T); }
});

// ---------- bucle ----------

let zoom = 3;
let cam = { x: 0, y: 0 };
function resize() {
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  // zoom entero: el pixel art se ve nítido
  // en una cancha larga (tenis) se aleja un poco para que entren los dos jugadores
  const span = game?.scene.span ?? 160;
  zoom = Math.max(2, Math.floor(Math.min((r.width * dpr) / span, (r.height * dpr) / 150, (r.width / 160) * dpr)));
  view.width = Math.round(r.width * dpr);
  view.height = Math.round(r.height * dpr);
  pix.width = Math.ceil(view.width / zoom);
  pix.height = Math.ceil(view.height / zoom);
}
new ResizeObserver(resize).observe(stage);
resize();

let last = performance.now();
let statsT = 0;
function frame(now: number) {
  const real = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game) {
    const slow = $<HTMLInputElement>('ar-slow').checked ? 0.25 : 1;
    const dt = real * slow;
    const i = intent();
    game.step(dt, i, i.run);
    const f = game.focus(pix.width, pix.height);
    // la cámara no muestra más allá del piso (si el piso es más chico que la vista, lo centra)
    const sc = game.scene, gw = sc.ground.width, gh = sc.ground.height;
    const fit = (c: number, o: number, size: number, view: number) => (size <= view ? o + (size - view) / 2 : Math.max(o, Math.min(o + size - view, c)));
    // siguiendo al jugador (tenis) la cámara no se frena en el borde: más allá el fondo es del mismo color
    const target = sc.follow
      ? { x: f.x - pix.width / 2, y: f.y - pix.height / 2 }
      : { x: fit(f.x - pix.width / 2, sc.origin.x, gw, pix.width), y: fit(f.y - pix.height / 2, sc.origin.y, gh, pix.height) };
    cam = { x: cam.x + (target.x - cam.x) * Math.min(1, real * 6), y: cam.y + (target.y - cam.y) * Math.min(1, real * 6) };
    // para las pruebas: qué parte del mundo se ve
    (window as unknown as { __arenaView: unknown }).__arenaView = { x: cam.x, y: cam.y, w: pix.width, h: pix.height };
    const sh = game.fx.shake;
    const c = { x: Math.round(cam.x + (sh ? (Math.random() - 0.5) * sh * 2 : 0)), y: Math.round(cam.y + (sh ? (Math.random() - 0.5) * sh * 2 : 0)) };
    pg.fillStyle = game.scene.bg;
    pg.fillRect(0, 0, pix.width, pix.height);
    game.draw(pg, c, $<HTMLInputElement>('ar-debug').checked);
    game.drawOffscreen(pg, c, pix.width, pix.height);
    vg.imageSmoothingEnabled = false;
    vg.drawImage(pix, 0, 0, pix.width * zoom, pix.height * zoom);
    game.fx.drawTexts(vg, c, zoom);
    hud(game);
    statsT -= real;
    if (statsT <= 0) { stats(game); statsT = 0.1; }
  }
  requestAnimationFrame(frame);
}

function hud(g: Game) {
  let s = '';
  if (g.sport === 'voley' || g.sport === 'tenis') s = `<b>${g.score[0]}</b><span>·</span><b>${g.score[1]}</b>`;
  if (g.sport === 'pelea') s = `<i class="ar-hp"><i style="width:${g.hp[0]}%"></i></i><span>VS</span><i class="ar-hp ar-hp-r"><i style="width:${g.hp[1]}%"></i></i>`;
  const sc = $('ar-score');
  if (sc.innerHTML !== s) sc.innerHTML = s;
  const m = $('ar-msg');
  if (m.textContent !== g.message) m.textContent = g.message;
}

function stats(g: Game) {
  const p = g.player, d = p.def();
  const fmt = (a?: number[]) => (a ? a.map((v) => Math.round(v)).join(' ') : '–');
  $('ar-stats').innerHTML = `
    <dt>${t('anim')}</dt><dd>${animLabel(p.anim)} <code>${esc(p.anim)}</code></dd>
    <dt>${t('frame')}</dt><dd>${p.frame() + 1} / ${d?.cuadros ?? 0} · ${d?.fps ?? 0} fps</dd>
    <dt>${t('rate')}</dt><dd>${p.rate.toFixed(2)}×</dd>
    <dt>${t('adv')}</dt><dd>${d?.avance ? `${d.avance} px` : '–'}</dd>
    <dt>${t('travel')}</dt><dd>${fmt(d?.desplazamiento)}</dd>
    <dt>${t('lift')}</dt><dd>${fmt(d?.elevacion)}</dd>`;
  $('ar-log').innerHTML = g.log.map((l) => `<li><b>${esc(l.tipo)}</b> ${l.who} · ${animLabel(l.anim)} · ${t('frame').toLowerCase()} ${l.cuadro + 1}</li>`).join('');
}

applyLang();
requestAnimationFrame(frame);
const param = new URLSearchParams(location.search).get('kit');
void loadKit(urlSource(param ?? './kit_deportes/'));
