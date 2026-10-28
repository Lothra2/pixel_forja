import {
  familiar, MIEMBROS, NOMBRE_MIEMBRO, clipsDe, pintarClip, efecto, escenarios, cuadroElemento, asset, ESTILOS, ESTILO_DE, movimiento, PROYECTILES, DANO,
  type ChibiLook, type CuadroPintado, type Clip, type Escenario, type Efecto, type MiembroId, type EstiloId,
} from '../engine/chibi';
import { h, canvasPixel, dibujar, lienzo, tr, lang, alTick } from './dibujo';
import { pintarMuelle, MUELLE } from '../engine/chibi/repeticion';

/**
 * La arena: pelea 1 contra la compu (o contra otra persona en el mismo teclado) con los movimientos calcados del
 * video, en cualquiera de los escenarios; y el paseo desde arriba en 8 direcciones con la familia alrededor.
 * Todo consume lo mismo que exporta el paquete: cuadros con ticks, avance, altura, cajas y efectos.
 */

let VW = 320, VH = 180;

/** El muelle de Ken tal cual el video: se ve con el encuadre del video (180 de ancho) y la cámara se corre igual. */
const MUELLE_KEN: Escenario = { id: 'muelle_ken', nombre: ['Muelle de Ken (el del video)', "Ken's pier (from the video)"], w: MUELLE.w, h: 180, piso: 160, capas: [] };
/** Fila de la pantalla del video donde empieza la vista de la arena (así el piso cae donde pisan Ryu y Ken). */
const FILA_VIDEO = 33;

interface Ctx { look: () => ChibiLook; oyente: (f: () => void) => void }

// ------------------------------------------------------------------ sonido sintetizado (arranca con el primer toque)
let audio: AudioContext | null = null;
function sonar(id: string) {
  if (!audio) return;
  const a = audio, t0 = a.currentTime;
  const g = a.createGain(); g.connect(a.destination);
  if (id.startsWith('whoosh') || id === 'lanzar') {
    const n = a.createBufferSource(); const b = a.createBuffer(1, a.sampleRate * 0.15, a.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(1800, t0); f.frequency.exponentialRampToValueAtTime(500, t0 + 0.15);
    n.buffer = b; n.connect(f); f.connect(g); g.gain.setValueAtTime(id.endsWith('fuerte') ? 0.35 : 0.2, t0); n.start();
    return;
  }
  const o = a.createOscillator(); o.connect(g);
  const tono: Record<string, [number, number, number, OscillatorType]> = {
    golpe: [180, 60, 0.12, 'square'], golpe_fuerte: [140, 40, 0.2, 'square'], caer: [90, 40, 0.25, 'triangle'], poder: [300, 900, 0.3, 'sawtooth'],
    bloqueo: [600, 500, 0.06, 'square'], ko: [400, 60, 0.9, 'sawtooth'], aterrizar: [120, 80, 0.06, 'triangle'],
  };
  const [f0, f1, d, tipo] = tono[id] ?? [220, 220, 0.05, 'sine'];
  o.type = tipo; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + d);
  g.gain.setValueAtTime(0.18, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
  o.start(); o.stop(t0 + d + 0.02);
}

// ------------------------------------------------------------------ dibujo del escenario por elementos (rápido)
function dibujarEscenario(ctx: CanvasRenderingContext2D, esc: Escenario, tick: number, cam: number, hasta = 'frente', desde = '') {
  let dentro = !desde;
  for (const c of esc.capas) {
    if (c.nombre === desde) dentro = true;
    if (!dentro) continue;
    if (desde && c.nombre === hasta && hasta !== desde) break;
    const dx = -Math.round(cam * c.parallax);
    for (const e of c.elementos) {
      const img = cuadroElemento(e, tick, esc.w);
      const a = asset(e.id);
      if (a.ancho) { dibujar(ctx, img, Math.round(e.x - img.w / 2) + dx, Math.round(e.y - img.h)); continue; }
      dibujar(ctx, img, Math.round(e.x - img.w / 2) + dx, Math.round(e.y - img.h), e.espejo);
    }
    if (!desde && c.nombre === hasta) break;
  }
}

// ------------------------------------------------------------------ luchador
interface Luchador {
  look: ChibiLook; nombre: string; estilo: EstiloId;
  x: number; mira: 1 | -1;
  clip: Clip; cuadros: CuadroPintado[]; i: number; t: number;
  vida: number; bloqueando: boolean; golpeado: boolean; pegó: boolean; cpu: boolean; espera: number; quieto: number;
  tecla: Record<string, boolean>;
}
/** Daño de lo que viaja o se queda prendido (por efecto); lo que no esté pega 10. */
const DANO_PROY: Record<string, { daño: number; tumba?: boolean }> = { kikoken: { daño: 9 }, tiger: { daño: 11 }, yoga_flame: { daño: 12, tumba: true }, rayo_blanka: { daño: 11, tumba: true } };
const AZAR = 'azar';
const LIBRES = new Set(['reposo', 'caminar', 'caminar_atras', 'agachado', 'bloquear', 'caminar_guardia']);

export function montarArena(s: HTMLElement, ctx0: Ctx) {
  const lienzoJuego = canvasPixel(VW, VH, 3, 'juego');
  const g = lienzoJuego.getContext('2d')!;
  const escs = [MUELLE_KEN, ...escenarios()];
  let esc = escs[0];
  let modo: 'pelea' | 'paseo' = 'pelea';
  let dosJugadores = false;
  const rival = { id: 'steph' as MiembroId, estilo: AZAR as EstiloId | typeof AZAR };
  let estiloP1: EstiloId = 'ryu';
  const opcionesEstilo = (extra?: HTMLElement) => [...(extra ? [extra] : []), ...ESTILOS.map((e) => h('option', { value: e.id }, e.nombre[0]))];
  const selEstilo = h('select', { onchange: () => { estiloP1 = selEstilo.value as EstiloId; pintarAyuda(); reiniciar(); } }, ...opcionesEstilo());
  const selEstiloRival = h('select', { onchange: () => { rival.estilo = selEstiloRival.value as EstiloId | typeof AZAR; reiniciar(); } }, ...opcionesEstilo(h('option', { value: AZAR }, lang === 'es' ? 'Al azar' : 'Random')));
  const selEsc = h('select', { onchange: () => { esc = escs.find((e) => e.id === selEsc.value)!; reiniciar(); } }, ...escs.map((e) => h('option', { value: e.id }, tr(e.nombre))));
  const selRival = h('select', { onchange: () => { rival.id = selRival.value as MiembroId; reiniciar(); } }, ...MIEMBROS.filter((m) => m !== 'thor').map((m) => h('option', { value: m, selected: m === 'steph' }, NOMBRE_MIEMBRO[m])));
  const ayuda = h('p', { class: 'nota teclas' });
  const pintarAyuda = () => {
    const [sp, su, st] = ESTILO_DE[estiloP1].especiales;
    ayuda.innerHTML = modo === 'pelea'
      ? (lang === 'es'
        ? `<b>Jugador 1:</b> A D caminar · W saltar (con D salta adelante) · S agacharse · atrás bloquea · <b>J</b> golpe (abajo: golpe agachado) · <b>K</b> patada (abajo: barrida) · <b>L</b> ${sp} · <b>U</b> ${su} · <b>I</b> ${st} · <b>O</b> antiaéreo · <b>H</b> agarrar (de cerca)`
        : `<b>Player 1:</b> A D walk · W jump (with D forward jump) · S crouch · back blocks · <b>J</b> punch (down: crouching punch) · <b>K</b> kick (down: sweep) · <b>L</b> ${sp} · <b>U</b> ${su} · <b>I</b> ${st} · <b>O</b> anti-air · <b>H</b> throw (close)`)
        + (dosJugadores ? (lang === 'es' ? '<br><b>Jugador 2:</b> flechas · 1 golpe · 2 patada · 3 poder · 4 uppercut · 5 torbellino' : '<br><b>Player 2:</b> arrows · 1 punch · 2 kick · 3 fireball · 4 uppercut · 5 hurricane') : '')
      : (lang === 'es' ? 'Flechas o WASD para caminar en 8 direcciones · Shift corre · Espacio saluda · Thor te sigue.' : 'Arrows or WASD to walk in 8 directions · Shift runs · Space waves · Thor follows you.');
  };
  pintarAyuda();
  const barra = h('div', { class: 'arena-bar' },
    h('div', { class: 'chips' },
      h('button', { class: 'chip on', onclick: (e: Event) => { modo = 'pelea'; marcar(e); reiniciar(); } }, lang === 'es' ? 'Pelea' : 'Fight'),
      h('button', { class: 'chip', onclick: (e: Event) => { modo = 'paseo'; marcar(e); reiniciar(); } }, lang === 'es' ? 'Paseo desde arriba' : 'Top-down walk')),
    h('label', {}, lang === 'es' ? 'Escenario' : 'Stage', selEsc),
    h('label', {}, lang === 'es' ? 'Estilo' : 'Style', selEstilo),
    h('label', {}, lang === 'es' ? 'Rival' : 'Rival', selRival),
    h('label', {}, lang === 'es' ? 'Estilo rival' : 'Rival style', selEstiloRival),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e: Event) => { dosJugadores = (e.target as HTMLInputElement).checked; pintarAyuda(); reiniciar(); } }), lang === 'es' ? 'Dos jugadores' : 'Two players'),
    h('button', { class: 'btn sec2', onclick: () => reiniciar() }, lang === 'es' ? 'Reiniciar' : 'Restart'),
  );
  function marcar(e: Event) { const b = e.currentTarget as HTMLElement; for (const x of b.parentElement!.children) x.classList.toggle('on', x === b); pintarAyuda(); }
  // controles táctiles
  const toque: Record<string, boolean> = {};
  const boton = (k: string, txt: string) => {
    const b = h('button', { class: 'tb', 'data-k': k }, txt);
    const on = (v: boolean) => (e: Event) => { e.preventDefault(); toque[k] = v; if (v) despertarAudio(); };
    b.addEventListener('pointerdown', on(true)); b.addEventListener('pointerup', on(false)); b.addEventListener('pointerleave', on(false)); b.addEventListener('pointercancel', on(false));
    return b;
  };
  const tactil = h('div', { class: 'tactil' },
    h('div', { class: 'cruz' }, boton('arriba', '▲'), boton('izq', '◀'), boton('der', '▶'), boton('abajo', '▼')),
    h('div', { class: 'acciones' }, boton('golpe', 'J'), boton('patada', 'K'), boton('poder', 'L'), boton('upper', 'U'), boton('torbe', 'I'), boton('anti', 'O')));
  const marco = h('div', { class: 'pantalla' }, lienzoJuego);
  s.append(h('h2', {}, lang === 'es' ? 'Arena' : 'Arena'), barra, marco, tactil, ayuda);
  // el muelle del video usa su propio encuadre (más angosto, como el video)
  const muelleImg = { r: null as ReturnType<typeof pintarMuelle> | null, d: null as ImageData | null };
  let rotos = false;
  const enMuelle = () => modo === 'pelea' && esc.id === 'muelle_ken';
  function encuadre() {
    const w = enMuelle() ? 180 : 320;
    if (w === VW && lienzoJuego.width === w) return;
    VW = w; VH = 180;
    lienzoJuego.width = VW; lienzoJuego.height = VH;
    lienzoJuego.style.width = `${VW * 3}px`; lienzoJuego.style.height = `${VH * 3}px`;
    g.imageSmoothingEnabled = false;
    marco.classList.toggle('cuadrada', VW === 180);
  }

  // ---- teclado
  const teclas: Record<string, boolean> = {};
  const despertarAudio = () => { if (!audio) { try { audio = new AudioContext(); } catch { /* sin sonido */ } } };
  const juegoVisible = () => !s.hidden && s.isConnected;
  window.addEventListener('keydown', (e) => {
    if (!juegoVisible()) return;
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
    teclas[e.code] = true; despertarAudio();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { teclas[e.code] = false; });

  // ---- estado de la pelea
  let p1: Luchador, p2: Luchador;
  let tick = 0, cam = 0, ronda = 1, cartel = 0, cartelTxt = '', fin = 0, reloj = 99 * 60;
  const proyectiles: { x: number; y: number; dir: number; e: Efecto; dueño: Luchador; vivo: boolean; f: number; d: { daño: number; tumba?: boolean } }[] = [];
  const chispas: { x: number; y: number; e: Efecto; f: number; t: number; esp: boolean }[] = [];
  const PISO = () => esc.piso;
  const nuevo = (look0: ChibiLook, x: number, mira: 1 | -1, cpu: boolean, estilo: EstiloId): Luchador => {
    const look = { ...look0, silueta: ESTILO_DE[estilo].silueta };
    const c = clipsDe(look).find((k) => k.id === 'reposo')!;
    return { look, nombre: look.nombre, estilo, x, mira, clip: c, cuadros: pintarClip(look, 32, c), i: 0, t: 0, vida: 100, bloqueando: false, golpeado: false, pegó: false, cpu, espera: 30, quieto: 0, tecla: {} };
  };
  const poner = (L: Luchador, id: string) => {
    const c = clipsDe(L.look).find((k) => k.id === id);
    if (!c || (L.clip.id === id && LIBRES.has(id))) return;
    L.clip = c; L.cuadros = pintarClip(L.look, 32, c); L.i = 0; L.t = 0; L.pegó = false;
  };
  const libre = (L: Luchador) => LIBRES.has(L.clip.id);
  const caja = (L: Luchador, b: number[]) => {
    const q = L.cuadros[L.i];
    const x = L.mira === 1 ? L.x - q.ancla[0] + b[0] : L.x + (q.ancla[0] - b[0] - b[2]);
    return [x, PISO() - q.dy - (q.ancla[1] - b[1]), b[2], b[3]];
  };
  const choca = (a: number[], b: number[]) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  const chispa = (x: number, y: number, id: string) => { const e = efecto(id, p1.look, 32); if (e) chispas.push({ x, y, e, f: 0, t: 0, esp: false }); };

  function reiniciar() {
    encuadre(); rotos = false;
    const L1 = ctx0.look();
    let L2 = familiar(rival.id, 'pelea');
    if (L2.nombre === L1.nombre) L2 = familiar(rival.id === 'steph' ? 'rick' : 'steph', 'pelea');
    const e2 = rival.estilo === AZAR ? ESTILOS[Math.floor(Math.random() * ESTILOS.length)].id : rival.estilo;
    p1 = nuevo(L1, esc.w / 2 - 50, 1, false, estiloP1);
    p2 = nuevo(L2, esc.w / 2 + 50, -1, !dosJugadores, e2);
    proyectiles.length = 0; chispas.length = 0;
    cam = esc.w / 2 - VW / 2; cartel = 90; cartelTxt = `ROUND ${ronda}`; fin = 0; reloj = 99 * 60;
    paseoReiniciar();
  }
  ctx0.oyente(() => { if (modo === 'pelea' && p1) { p1.look = { ...ctx0.look(), silueta: ESTILO_DE[p1.estilo].silueta }; p1.nombre = p1.look.nombre; poner(p1, 'reposo'); } });

  // ---- control de cada luchador: jugador o compu
  const entrada = (L: Luchador, otro: Luchador) => {
    if (L.cpu) return ia(L, otro);
    const P2 = L === p2;
    const k = (a: string, b: string, tq?: string) => (P2 ? !!teclas[b] : !!teclas[a] || (tq ? !!toque[tq] : false));
    const izq = k('KeyA', 'ArrowLeft', 'izq'), der = k('KeyD', 'ArrowRight', 'der'), arr = k('KeyW', 'ArrowUp', 'arriba'), aba = k('KeyS', 'ArrowDown', 'abajo');
    const adelante = L.mira === 1 ? der : izq, atras = L.mira === 1 ? izq : der;
    return {
      adelante, atras, arr, aba,
      golpe: k('KeyJ', 'Digit1', 'golpe'), patada: k('KeyK', 'Digit2', 'patada'), poder: k('KeyL', 'Digit3', 'poder'), upper: k('KeyU', 'Digit4', 'upper'),
      torbe: k('KeyI', 'Digit5', 'torbe'), anti: k('KeyO', 'Digit6', 'anti'), agarra: k('KeyH', 'Digit7'),
    };
  };
  const ia = (L: Luchador, otro: Luchador) => {
    const d = Math.abs(otro.x - L.x);
    const r = { adelante: false, atras: false, arr: false, aba: false, golpe: false, patada: false, poder: false, upper: false, torbe: false, anti: false, agarra: false };
    if (L.espera > 0) { L.espera--; r.atras = !libre(otro) && Math.random() < 0.6 && d < 70; return r; }
    const azar = Math.random();
    if (otro.cuadros[otro.i]?.dy > 8 && d < 50 && azar < 0.5) r.anti = true;
    else if (d > 90) { if (azar < 0.02) r.poder = true; else r.adelante = true; }
    else if (d > 34) { if (azar < 0.03) r.poder = true; else if (azar < 0.05) r.torbe = true; else if (azar < 0.08) { r.arr = true; r.adelante = true; } else r.adelante = true; }
    else {
      const q = Math.random();
      if (q < 0.25) r.golpe = true; else if (q < 0.42) r.patada = true; else if (q < 0.52) { r.aba = true; r.patada = true; } else if (q < 0.62) r.upper = true; else if (q < 0.7) r.agarra = true; else if (q < 0.85) r.atras = true;
      L.espera = 14 + Math.floor(Math.random() * 30);
    }
    return r;
  };

  const actualizarLuchador = (L: Luchador, otro: Luchador) => {
    const e = entrada(L, otro);
    // mira siempre al otro cuando puede moverse
    if (libre(L)) L.mira = otro.x >= L.x ? 1 : -1;
    L.bloqueando = libre(L) && e.atras && !e.arr;
    if (libre(L) && fin === 0 && cartel <= 30) {
      const cerca = Math.abs(otro.x - L.x) < 30;
      const mv = (b: Parameters<typeof movimiento>[1]) => movimiento(L.estilo, b);
      if (e.agarra && cerca && libre(otro)) { const ag = mv('agarrar'); poner(L, ag); poner(otro, 'lanzado'); otro.mira = L.mira === 1 ? -1 : 1; otro.vida -= (DANO[ag] ?? DANO.agarrar).daño; sonar('lanzar'); }
      else if (e.poder) poner(L, mv('poder'));
      else if (e.upper) poner(L, mv('upper'));
      else if (e.torbe) poner(L, mv('torbe'));
      else if (e.anti) poner(L, mv('anti'));
      else if (e.patada && e.aba) poner(L, mv('barrida'));
      else if (e.patada) poner(L, e.arr ? mv('salto_patada') : mv('patada'));
      else if (e.golpe) poner(L, e.aba ? mv('golpe_agachado') : Math.random() < 0.5 ? mv('golpe') : mv('golpe_fuerte'));
      else if (e.arr) poner(L, e.adelante ? 'salto_adelante' : e.atras ? 'salto_atras' : 'saltar');
      else if (e.aba) poner(L, L.bloqueando ? 'bloquear' : 'agachado');
      else if (e.adelante) poner(L, 'caminar');
      else if (e.atras) poner(L, L.bloqueando && Math.abs(otro.x - L.x) < 60 && !libre(otro) ? 'bloquear' : 'caminar_atras');
      else poner(L, 'reposo');
    }
    // avanza el cuadro
    const q = L.cuadros[L.i];
    L.t++;
    // la raíz se mueve parejo durante el cuadro
    let dx = q.dx / Math.max(1, q.t);
    if (L.clip.id === 'caminar_atras') dx = -Math.abs(dx);
    L.x += dx * L.mira;
    if (L.t >= q.t) {
      L.t = 0;
      if (q.sonido) sonar(q.sonido);
      if (L.i + 1 < L.cuadros.length) {
        L.i++;
        const n = L.cuadros[L.i];
        if (n.fx && PROYECTILES.has(n.fx.id)) {
          const x = L.mira === 1 ? L.x - n.ancla[0] + n.fx.x : L.x + (n.ancla[0] - n.fx.x);
          const ef = efecto(n.fx.id, L.look, 32);
          if (ef) proyectiles.push({ x, y: PISO() - n.dy - (n.ancla[1] - n.fx.y), dir: L.mira, e: ef, dueño: L, vivo: true, f: 0, d: DANO_PROY[n.fx.id] ?? { daño: 10 } });
        } else if (n.fx) {
          const x = L.mira === 1 ? L.x - n.ancla[0] + n.fx.x : L.x + (n.ancla[0] - n.fx.x);
          const ef = efecto(n.fx.id, L.look, 32);
          if (ef) chispas.push({ x, y: PISO() - n.dy - (n.ancla[1] - n.fx.y), e: ef, f: 0, t: 0, esp: L.mira < 0 });
        }
      } else if (L.clip.loop) L.i = 0;
      else {
        // al terminar: después de caer se levanta; el KO se queda tirado
        if (L.clip.id === 'caer' || L.clip.id === 'lanzado') poner(L, L.vida > 0 ? 'levantarse' : 'ko');
        else if (L.clip.id === 'ko') L.i = L.cuadros.length - 1;
        else if (L.clip.id === 'victoria') L.i = 0;
        else if (L.clip.id === 'perfect') L.i = L.cuadros.length - 1;
        else poner(L, 'reposo');
      }
    }
    // golpes
    const ahora = L.cuadros[L.i];
    if (ahora.hit && !L.pegó && otro.clip.id !== 'ko' && otro.clip.id !== 'caer' && otro.clip.id !== 'lanzado' && otro.clip.id !== 'levantarse') {
      const a = caja(L, ahora.hit), b = caja(otro, otro.cuadros[otro.i].hurt);
      if (choca(a, b)) {
        L.pegó = true;
        const m = DANO[L.clip.id] ?? { daño: 5 };
        const cx = (Math.max(a[0], b[0]) + Math.min(a[0] + a[2], b[0] + b[2])) / 2, cy = (Math.max(a[1], b[1]) + Math.min(a[1] + a[3], b[1] + b[3])) / 2;
        if (otro.bloqueando) { chispa(cx, cy, 'chispa_bloqueo'); otro.vida -= 1; sonar('bloqueo'); otro.x -= 3 * otro.mira; }
        else {
          chispa(cx, cy, 'chispa'); otro.vida -= m.daño; sonar(m.daño >= 9 ? 'golpe_fuerte' : 'golpe');
          otro.mira = L.mira === 1 ? -1 : 1;
          poner(otro, otro.vida <= 0 ? 'ko' : m.tumba ? 'caer' : 'recibir_alto');
          otro.x += 2 * L.mira;
        }
      }
    }
    L.x = Math.max(20, Math.min(esc.w - 20, L.x));
  };

  const pasoPelea = () => {
    tick++;
    if (cartel > 0) { cartel--; if (cartel === 30 && fin === 0) cartelTxt = 'FIGHT!'; }
    if (fin === 0 && cartel <= 30) reloj = Math.max(0, reloj - 1);
    actualizarLuchador(p1, p2);
    actualizarLuchador(p2, p1);
    // no se atraviesan
    const d = p2.x - p1.x;
    if (Math.abs(d) < 18 && p1.cuadros[p1.i].dy < 10 && p2.cuadros[p2.i].dy < 10) { const emp = (18 - Math.abs(d)) / 2 * Math.sign(d || 1); p1.x -= emp; p2.x += emp; }
    // distancia máxima: la pantalla
    if (Math.abs(p2.x - p1.x) > VW - 40) { const c = (p1.x + p2.x) / 2; const s2 = Math.sign(p2.x - p1.x); p1.x = c - s2 * (VW - 40) / 2; p2.x = c + s2 * (VW - 40) / 2; }
    // proyectiles
    for (const p of proyectiles) {
      if (!p.vivo) continue;
      p.x += (p.e.vel ?? 2.4) * p.dir; p.f++;
      if (p.e.dura && p.f > p.e.dura) { p.vivo = false; continue; }
      const otro = p.dueño === p1 ? p2 : p1;
      const ec = p.e.frames[0];
      const a = [p.x - ec.w / 2, p.y - ec.h / 2, ec.w * 0.7, ec.h * 0.7];
      const b = caja(otro, otro.cuadros[otro.i].hurt);
      if (choca(a, b) && otro.clip.id !== 'ko' && otro.clip.id !== 'caer') {
        p.vivo = false;
        const dis = efecto('poder_disipa', p.dueño.look, 32)!;
        chispas.push({ x: p.x, y: p.y, e: dis, f: 0, t: 0, esp: false });
        if (otro.bloqueando) { otro.vida -= 2; sonar('bloqueo'); }
        else { otro.vida -= p.d.daño; sonar('golpe_fuerte'); otro.mira = p.dir === 1 ? -1 : 1; poner(otro, otro.vida <= 0 ? 'ko' : p.d.tumba ? 'caer' : 'recibir_poder'); }
      }
      if (!p.e.dura && (p.x < cam - 40 || p.x > cam + VW + 40)) p.vivo = false;
    }
    // proyectiles que chocan entre sí se deshacen
    const vivos = proyectiles.filter((p) => p.vivo);
    for (let i = 0; i < vivos.length; i++) for (let j = i + 1; j < vivos.length; j++) if (vivos[i].dueño !== vivos[j].dueño && Math.abs(vivos[i].x - vivos[j].x) < 12) { vivos[i].vivo = vivos[j].vivo = false; chispas.push({ x: (vivos[i].x + vivos[j].x) / 2, y: vivos[i].y, e: efecto('poder_disipa', p1.look, 32)!, f: 0, t: 0, esp: false }); }
    for (const c of chispas) { c.t++; if (c.t >= c.e.t) { c.t = 0; c.f++; } }
    for (let i = chispas.length - 1; i >= 0; i--) if (chispas[i].f >= chispas[i].e.frames.length) chispas.splice(i, 1);
    for (let i = proyectiles.length - 1; i >= 0; i--) if (!proyectiles[i].vivo) proyectiles.splice(i, 1);
    // fin de ronda
    if (fin === 0 && (p1.vida <= 0 || p2.vida <= 0 || reloj === 0)) {
      fin = 1; cartel = 150; cartelTxt = 'K.O.'; sonar('ko');
      const gana = p1.vida >= p2.vida ? p1 : p2, pierde = gana === p1 ? p2 : p1;
      if (pierde.vida > 0) pierde.vida = 0;
      if (pierde.clip.id !== 'ko') poner(pierde, 'ko');
      // sin un rasguño: el festejo de frente del bonus de los barriles
      const perfecto = gana.vida >= 100;
      setTimeout(() => { if (gana.clip.id !== 'ko') poner(gana, perfecto ? 'perfect' : 'victoria'); cartelTxt = perfecto ? 'PERFECT' : `${gana.nombre.toUpperCase()} WINS`; cartel = 120; }, 1400);
      setTimeout(() => { ronda++; reiniciar(); }, 5200);
    }
    // en el muelle, si tumban a alguien contra los barriles, se rompen (como en el video)
    if (esc.id === 'muelle_ken' && !rotos) for (const L of [p1, p2]) {
      if (['caer', 'ko', 'lanzado'].includes(L.clip.id) && L.x > 176 && L.x < 220 && (L.cuadros[L.i]?.dy ?? 9) < 4) { rotos = true; sonar('caer'); }
    }
    // cámara: al medio de los dos, sin salirse del escenario
    const objetivo = Math.max(0, Math.min(esc.w - VW, (p1.x + p2.x) / 2 - VW / 2));
    cam += (objetivo - cam) * 0.15;
  };

  const dibujarLuchador = (L: Luchador) => {
    const q = L.cuadros[L.i];
    const sx = L.x - cam;
    // la sombra del video es una elipse marrón sólida; en los otros escenarios, transparente
    g.fillStyle = esc.id === 'muelle_ken' ? '#764220' : 'rgba(40,20,30,0.3)';
    g.beginPath(); g.ellipse(Math.round(sx), PISO() + 0.5, 8, 2, 0, 0, Math.PI * 2); g.fill();
    const esp = L.mira < 0;
    const x = esp ? sx - (q.img.w - q.ancla[0]) : sx - q.ancla[0];
    dibujar(g, q.img, x, PISO() - q.ancla[1] - q.dy, esp);
  };
  const barraVida = (x: number, v: number, der: boolean, bw = 120) => {
    g.fillStyle = '#100c14'; g.fillRect(x - 1, 9, bw + 2, 9);
    g.fillStyle = '#e8202a'; g.fillRect(x, 10, bw, 7);
    const w = Math.max(0, Math.round(bw * v / 100));
    g.fillStyle = '#f4e030'; g.fillRect(der ? x : x + bw - w, 10, w, 7);
  };
  const texto = (txt: string, x: number, y: number, size: number, col = '#f6f1e3', centro = false) => {
    g.font = `700 ${size}px Silkscreen, monospace`; g.textBaseline = 'top';
    const w = g.measureText(txt).width;
    const px = centro ? Math.round(x - w / 2) : x;
    g.fillStyle = '#100c14'; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) g.fillText(txt, px + dx, y + dy);
    g.fillStyle = col; g.fillText(txt, px, y);
  };
  const pintarPelea = () => {
    g.clearRect(0, 0, VW, VH);
    g.save(); g.translate(0, VH - esc.h);
    if (esc.id === 'muelle_ken') {
      if (!muelleImg.d) { muelleImg.d = g.createImageData(VW, VH); }
      muelleImg.r = pintarMuelle(Math.floor(tick / 2), Math.round(cam) - 1, FILA_VIDEO, rotos, VW, VH, muelleImg.r ?? undefined);
      muelleImg.d.data.set(muelleImg.r.data); g.putImageData(muelleImg.d, 0, 0);
    } else dibujarEscenario(g, esc, tick, cam, 'piso');
    const orden = [p1, p2].sort((a, b) => (a.golpeado ? -1 : 0) - (b.golpeado ? -1 : 0));
    for (const L of orden) dibujarLuchador(L);
    for (const p of proyectiles) { const img = p.e.frames[Math.floor(p.f / p.e.t) % p.e.frames.length]; dibujar(g, img, p.x - cam - (p.dir === 1 ? p.e.centro[0] : img.w - p.e.centro[0]), p.y - p.e.centro[1], p.dir < 0); }
    for (const c of chispas) { const img = c.e.frames[c.f]; if (img) dibujar(g, img, c.x - cam - c.e.centro[0], c.y - c.e.centro[1], c.esp); }
    if (esc.id !== 'muelle_ken') dibujarEscenario(g, esc, tick, cam, 'frente', 'frente');
    g.restore();
    // HUD como el del video: barras amarillas, KO al medio, nombres y reloj
    const bw = Math.min(120, VW / 2 - 24), mx = VW === 320 ? 16 : 8;
    barraVida(mx, p1.vida, false, bw); barraVida(VW - mx - bw, p2.vida, true, bw);
    g.fillStyle = '#100c14'; g.fillRect(VW / 2 - 13, 7, 26, 13);
    g.fillStyle = '#f6f1e3'; g.fillRect(VW / 2 - 12, 8, 24, 11);
    texto('KO', VW / 2, 9, 8, '#2f4ab8', true);
    const largo = VW === 320 ? 12 : 7;
    texto(p1.nombre.toUpperCase().slice(0, largo), mx, 20, 8, '#5aa8f0');
    // el estilo debajo del nombre, sin la inicial (M. Bison → BISON) para que quepa en el encuadre angosto
    const estiloHud = (L: Luchador) => ESTILO_DE[L.estilo].nombre[0].replace(/^[A-Z]\. /, '').toUpperCase().slice(0, largo);
    texto(estiloHud(p1), mx, 29, 8, '#f4c430');
    g.font = '700 8px Silkscreen, monospace';
    const n2 = p2.nombre.toUpperCase().slice(0, largo), s2 = estiloHud(p2);
    texto(n2, VW - mx - g.measureText(n2).width, 20, 8, '#5aa8f0');
    g.font = '700 8px Silkscreen, monospace';
    texto(s2, VW - mx - g.measureText(s2).width, 29, 8, '#f4c430');
    texto(String(Math.ceil(reloj / 60)).padStart(2, '0'), VW / 2, 21, 10, '#f6f1e3', true);
    if (cartel > 0) texto(cartelTxt, VW / 2, 70, 16, cartelTxt === 'FIGHT!' ? '#f4c430' : '#f6f1e3', true);
  };

  // ------------------------------------------------------------------ paseo desde arriba
  interface Paseante { look: ChibiLook; x: number; y: number; dir: string; esp: boolean; clip: Clip; cuadros: CuadroPintado[]; i: number; t: number; meta: [number, number]; espera: number; emote: { e: Efecto; t: number } | null }
  let gente: Paseante[] = [];
  let yo: Paseante, thor: Paseante;
  const dirDe = (dx: number, dy: number): [string, boolean] => {
    if (!dx && !dy) return ['s', false];
    const a = Math.atan2(dy, dx) * 180 / Math.PI; // 0 derecha, 90 abajo
    const sec = Math.round(a / 45);
    const tabla: Record<string, [string, boolean]> = { '0': ['e', false], '1': ['se', false], '2': ['s', false], '3': ['se', true], '4': ['e', true], '-4': ['e', true], '-3': ['ne', true], '-2': ['n', false], '-1': ['ne', false] };
    return tabla[String(sec)] ?? ['s', false];
  };
  const ponerP = (p: Paseante, id: string) => {
    if (p.clip.id === id) return;
    const c = clipsDe(p.look).find((k) => k.id === id) ?? clipsDe(p.look).find((k) => k.id === 'quieto_s')!;
    p.clip = c; p.cuadros = pintarClip(p.look, 32, c); p.i = 0; p.t = 0;
  };
  const crearP = (look: ChibiLook, x: number, y: number): Paseante => {
    const c = clipsDe(look).find((k) => k.id === 'quieto_s')!;
    return { look, x, y, dir: 's', esp: false, clip: c, cuadros: pintarClip(look, 32, c), i: 0, t: 0, meta: [x, y], espera: 60, emote: null };
  };
  // el mapa: pasto con caminos, matas, casas y árboles del generador
  let mapa: HTMLCanvasElement | null = null;
  const MW = 480, MH = 300;
  function hacerMapa() {
    const c = document.createElement('canvas'); c.width = MW; c.height = MH;
    const m = c.getContext('2d')!;
    for (let y = 0; y < MH; y += 4) for (let x = 0; x < MW; x += 4) { m.fillStyle = (x * 7 + y * 13) % 5 === 0 ? '#4f9a44' : '#58a84a'; m.fillRect(x, y, 4, 4); }
    m.fillStyle = '#d8c08a'; m.fillRect(0, 150, MW, 22); m.fillRect(220, 0, 22, MH);
    m.fillStyle = '#c4a874'; for (let x = 0; x < MW; x += 8) m.fillRect(x, 170, 4, 2);
    const pon = (id: string, v: string, x: number, y: number, seed = 1) => { const img = cuadroElemento({ id, v, x, y, seed }, 0, MW); m.drawImage(lienzo(img), Math.round(x - img.w / 2), Math.round(y - img.h)); };
    pon('casa', 'colonial', 90, 130, 3); pon('casa', 'quinta', 360, 128, 2); pon('arbol', 'mango', 170, 110); pon('arbol', 'araguaney', 300, 280); pon('arbol', 'palma', 440, 250);
    pon('arbol', 'arbusto', 40, 250); pon('arbol', 'arbusto', 140, 290, 3); pon('adentro', 'hamaca', 400, 210); pon('calle', 'farol', 250, 140); pon('arbol', 'matera', 200, 140);
    mapa = c;
  }
  function paseoReiniciar() {
    if (!mapa) hacerMapa();
    yo = crearP(ctx0.look(), 230, 190);
    thor = crearP(familiar('thor', 'siempre'), 210, 200);
    gente = MIEMBROS.filter((m) => m !== 'thor' && familiar(m, 'siempre').nombre !== yo.look.nombre).slice(0, 4).map((m, i) => crearP(familiar(m, 'casual'), 80 + i * 100, 220 + (i % 2) * 40));
  }
  const moverP = (p: Paseante, dx: number, dy: number, corre: boolean) => {
    if (dx || dy) {
      const [d, esp] = dirDe(dx, dy);
      p.dir = d; p.esp = esp;
      ponerP(p, `${corre ? 'correr' : 'caminar'}_${d}`);
      const v = corre ? 1.4 : 0.7, n = Math.hypot(dx, dy);
      p.x = Math.max(8, Math.min(MW - 8, p.x + (dx / n) * v)); p.y = Math.max(20, Math.min(MH - 2, p.y + (dy / n) * v));
    } else ponerP(p, `quieto_${p.dir}`);
    p.t++;
    const q = p.cuadros[p.i];
    if (p.t >= q.t) { p.t = 0; p.i = (p.i + 1) % p.cuadros.length; }
    if (p.emote) { p.emote.t++; if (p.emote.t > 120) p.emote = null; }
  };
  const pasoPaseo = () => {
    tick++;
    const izq = teclas.KeyA || teclas.ArrowLeft || toque.izq, der = teclas.KeyD || teclas.ArrowRight || toque.der;
    const arr = teclas.KeyW || teclas.ArrowUp || toque.arriba, aba = teclas.KeyS || teclas.ArrowDown || toque.abajo;
    moverP(yo, (der ? 1 : 0) - (izq ? 1 : 0), (aba ? 1 : 0) - (arr ? 1 : 0), !!(teclas.ShiftLeft || teclas.ShiftRight));
    if (teclas.Space || toque.golpe) {
      ponerP(yo, `saludar_${yo.dir}`);
      for (const p of gente) if (Math.hypot(p.x - yo.x, p.y - yo.y) < 50 && !p.emote) { p.emote = { e: efecto(['emote_corazon', 'emote_nota', 'emote_exclamacion', 'emote_idea'][Math.floor(Math.random() * 4)], p.look, 32)!, t: 0 }; p.dir = dirDe(yo.x - p.x, yo.y - p.y)[0]; p.esp = dirDe(yo.x - p.x, yo.y - p.y)[1]; }
    }
    // Thor sigue a su dueño
    const dt = Math.hypot(yo.x - thor.x, yo.y - thor.y);
    moverP(thor, dt > 26 ? yo.x - thor.x : 0, dt > 26 ? yo.y - thor.y : 0, dt > 70);
    // la familia pasea sola
    for (const p of gente) {
      if (p.emote) { moverP(p, 0, 0, false); continue; }
      const d = Math.hypot(p.meta[0] - p.x, p.meta[1] - p.y);
      if (d < 3) { if (--p.espera <= 0) { p.meta = [20 + Math.random() * (MW - 40), 40 + Math.random() * (MH - 50)]; p.espera = 60 + Math.random() * 200; } moverP(p, 0, 0, false); }
      else moverP(p, p.meta[0] - p.x, p.meta[1] - p.y, false);
    }
  };
  let camX = 0, camY = 0;
  const pintarPaseo = () => {
    camX += (Math.max(0, Math.min(MW - VW, yo.x - VW / 2)) - camX) * 0.12;
    camY += (Math.max(0, Math.min(MH - VH, yo.y - VH / 2)) - camY) * 0.12;
    g.clearRect(0, 0, VW, VH);
    if (mapa) g.drawImage(mapa, -Math.round(camX), -Math.round(camY));
    const todos = [yo, thor, ...gente].sort((a, b) => a.y - b.y);
    for (const p of todos) {
      const q = p.cuadros[p.i];
      const sx = p.x - camX, sy = p.y - camY;
      g.fillStyle = 'rgba(30,40,20,0.3)'; g.beginPath(); g.ellipse(Math.round(sx), Math.round(sy) + 0.5, 7, 2, 0, 0, Math.PI * 2); g.fill();
      const x = p.esp ? sx - (q.img.w - q.ancla[0]) : sx - q.ancla[0];
      dibujar(g, q.img, x, sy - q.ancla[1] - q.dy, p.esp);
      if (p.emote) { const img = p.emote.e.frames[Math.floor(p.emote.t / p.emote.e.t) % 2]; dibujar(g, img, sx - img.w / 2, sy - 34 - img.h); }
    }
    texto(lang === 'es' ? 'PASEO' : 'WALK', 8, 6, 8, '#f4c430');
  };

  reiniciar();
  alTick(() => {
    if (!juegoVisible()) return;
    if (modo === 'pelea') { pasoPelea(); pintarPelea(); } else { pasoPaseo(); pintarPaseo(); }
  });
}
