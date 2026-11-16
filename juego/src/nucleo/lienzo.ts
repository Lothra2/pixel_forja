// El lienzo del juego: resolución lógica (altura ~540-720 px, como los juegos de 800x600 pero más ancha) y entrada.
export const lienzo = document.getElementById('juego') as HTMLCanvasElement;
export const ctx = lienzo.getContext('2d', { alpha: false })!;
export let W = 960, H = 540, ESCALA = 1;
/** El acercamiento del mundo (solo el mundo: el HUD y los menús no cambian), el tamaño del mundo visible y los puntos del lienzo por punto lógico. */
export let ZM = 1, MW = 960, MH = 540, RES = 1;

/** Área segura del teléfono (notch, isla, barra de inicio) en puntos de pantalla, leída de env(safe-area-inset-*). */
export const SEGURO = { l: 0, r: 0, t: 0, b: 0 };
let divSeguro: HTMLDivElement | null = null;
function leerSeguro() {
  try {
    if (!divSeguro) { divSeguro = document.createElement('div'); divSeguro.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(divSeguro); }
    const c = getComputedStyle(divSeguro);
    SEGURO.l = parseFloat(c.paddingLeft) || 0; SEGURO.r = parseFloat(c.paddingRight) || 0; SEGURO.t = parseFloat(c.paddingTop) || 0; SEGURO.b = parseFloat(c.paddingBottom) || 0;
  } catch { /* nada */ }
}
/**
 * La vista: cuánto se acerca la cámara. 0 = clásica (unos 640 puntos de alto: se ve mucho mundo y el héroe queda chico),
 * 1 = cerca (×1,3), 2 = muy cerca (×1,6 a ×2: el héroe ocupa casi el doble). Se acerca solo el mundo: el HUD, los paneles y
 * los menús quedan del mismo tamaño, así sirve igual en el teléfono, donde antes no había lugar para acercar todo el lienzo.
 * Se guarda con las opciones.
 */
const ZOOMS = [1, 1.3, 1.6];
let vista = 0;
try { vista = Math.max(0, Math.min(2, JSON.parse(localStorage.getItem('marca.opciones') ?? '{}').vista ?? 0)); } catch { /* nada */ }
export const vistaActual = () => vista;
export function fijarVista(v: number) { vista = Math.max(0, Math.min(2, v | 0)); ajustar(); }
export function ajustar() {
  leerSeguro();
  const ww = window.innerWidth, wh = window.innerHeight;
  // altura lógica cerca de 620 (como los juegos de 800x600): en pantallas grandes se agranda
  const k0 = Math.max(wh / 640, 0.78);
  // (el acercamiento no pasa de lo que deja un lienzo de 680 × 400: menos que eso los paneles no entran)
  const zoom = 1;
  const k = k0 * zoom;
  const h = wh / k;
  const w = ww / k;
  W = Math.round(Math.min(Math.max(w, 640), 1600));
  H = Math.round(h);
  // en vertical el ancho mínimo de 640 dejaba un cuadrado chiquito en el medio: se estira el alto para llenar la pantalla
  if (ww < wh && w < 640) H = Math.round(Math.min(1400, (640 * wh) / ww));
  ESCALA = Math.min(ww / W, wh / H);
  // escala entera en píxeles del aparato: cada píxel del lienzo mide exactamente 2 o 3 píxeles de la pantalla, así el
  // pixel art no sale desparejo ni titila con la cámara. Solo si el alto lógico queda en un rango jugable (480 a 780) y,
  // en pantallas táctiles, si no achica el juego: en el teléfono el texto ya va justo y se queda con la escala de antes.
  const dpr = window.devicePixelRatio || 1, dw = Math.round(ww * dpr), dh = Math.round(wh * dpr);
  const ke = Math.max(1, Math.round((dh * zoom) / 600));
  const entero = ww >= wh && dh / ke >= 480 / zoom && dh / ke <= 780 / zoom && dw / ke >= (zoom > 1 ? 680 : 760) && (ke / dpr >= k * 0.95 || !(typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)) && !(window as unknown as { __sinEntero?: boolean }).__sinEntero;
  if (entero) { W = Math.min(1600, Math.floor(dw / ke)); H = Math.floor(dh / ke); ESCALA = ke / dpr; }
  // el acercamiento: cada punto del mundo ocupa un número entero de puntos del lienzo (2, o los del aparato si la escala
  // ya es entera), y el lienzo gana resolución para que el mundo acercado salga nítido y no a pixeles desparejos
  ZM = 1; RES = 1;
  const zq = ZOOMS[vista] ?? 1;
  if (zq > 1) {
    const TOPE = 2.4e6;
    if (entero) {
      // T = puntos del aparato por punto del mundo; m = puntos del aparato por punto del lienzo (divide a T y a ke)
      const nivel = (T0: number): number => {
        for (let T = T0; T <= ke * 2; T++) for (let m = Math.min(ke, T); m >= 1; m--) if (T % m === 0 && W * H * (ke / m) * (ke / m) <= TOPE) { ZM = T / ke; RES = ke / m; return T; }
        ZM = 2; RES = 1; return ke * 2;
      };
      const T1 = nivel(Math.max(ke + 1, Math.round(ke * zq)));
      if (vista === 2) nivel(Math.max(T1 + 1, Math.round(ke * zq)));
    } else { ZM = zq; RES = 2 / zq; if (W * H * RES * RES > TOPE) RES = Math.sqrt(TOPE / (W * H)); }
  }
  MW = Math.ceil(W / ZM); MH = Math.ceil(H / ZM);
  lienzo.width = Math.round(W * RES); lienzo.height = Math.round(H * RES);
  lienzo.style.width = `${entero ? (W * ke) / dpr : Math.floor(W * ESCALA)}px`;
  lienzo.style.height = `${entero ? (H * ke) / dpr : Math.floor(H * ESCALA)}px`;
  lienzo.style.imageRendering = entero || Math.abs(ESCALA - Math.round(ESCALA)) < 0.01 ? 'pixelated' : 'auto';
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
}
/** Al empezar cada cuadro: el lienzo dibuja en puntos lógicos aunque tenga más resolución. */
export function baseLienzo() { ctx.setTransform(RES, 0, 0, RES, 0, 0); ctx.imageSmoothingEnabled = false; }
/** Dibuja el mundo acercado: adentro, W y H son el tamaño del mundo visible y todo lo que se pinta sale ×ZM. */
export function enMundo(f: () => void) {
  if (ZM === 1) { f(); return; }
  const w0 = W, h0 = H;
  W = MW; H = MH;
  ctx.save(); ctx.scale(ZM, ZM);
  try { f(); } finally { ctx.restore(); W = w0; H = h0; }
}

export interface Entrada {
  x: number; y: number;
  izq: boolean; der: boolean;
  /** Clics de este cuadro (se limpian al final del cuadro). */
  clicIzq: boolean; clicDer: boolean; soltoIzq: boolean; soltoDer: boolean;
  teclas: Set<string>;
  pulsadas: Set<string>;
  rueda: number;
  shift: boolean; ctrl: boolean; alt: boolean;
  tactil: boolean;
  texto: string;
}
export const E: Entrada = { x: 0, y: 0, izq: false, der: false, clicIzq: false, clicDer: false, soltoIzq: false, soltoDer: false, teclas: new Set(), pulsadas: new Set(), rueda: 0, shift: false, ctrl: false, alt: false, tactil: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches, texto: '' };
let alGesto: (() => void) | null = null;
export const alPrimerGesto = (f: () => void) => { alGesto = f; };
const gesto = () => { if (alGesto) { try { alGesto(); } catch { /* sin audio */ } } };

function pos(cx: number, cy: number) {
  const r = lienzo.getBoundingClientRect();
  E.x = ((cx - r.left) / r.width) * W;
  E.y = ((cy - r.top) / r.height) * H;
}
export function instalarEntrada() {
  // el menú del navegador no sale nunca: el clic derecho es del juego
  lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousemove', (e) => { pos(e.clientX, e.clientY); E.shift = e.shiftKey; });
  lienzo.addEventListener('mousedown', (e) => {
    gesto(); pos(e.clientX, e.clientY); E.tactil = false; E.shift = e.shiftKey; E.ctrl = e.ctrlKey;
    if (e.button === 0) { E.izq = true; E.clicIzq = true; } else if (e.button === 2) { E.der = true; E.clicDer = true; }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) { E.izq = false; E.soltoIzq = true; } else if (e.button === 2) { E.der = false; E.soltoDer = true; } });
  lienzo.addEventListener('wheel', (e) => { E.rueda += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  window.addEventListener('keydown', (e) => {
    gesto();
    if ((document.activeElement as HTMLElement)?.id === 'nombre' && e.key !== 'Enter' && e.key !== 'Escape') return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!E.teclas.has(k)) E.pulsadas.add(k);
    E.teclas.add(k); E.shift = e.shiftKey; E.ctrl = e.ctrlKey; E.alt = e.altKey;
    if (['Tab', 'Alt', ' ', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'].includes(k) || (e.ctrlKey && k !== 'r')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; E.teclas.delete(k); E.shift = e.shiftKey; E.alt = e.altKey; E.ctrl = e.ctrlKey; });
  window.addEventListener('blur', () => { E.teclas.clear(); E.izq = E.der = false; });
  // táctil: un dedo es el botón izquierdo, dos dedos el derecho
  lienzo.addEventListener('touchstart', (e) => {
    gesto(); E.tactil = true; const t = e.touches[0]; pos(t.clientX, t.clientY);
    if (e.touches.length >= 2) { E.der = true; E.clicDer = true; E.izq = false; } else { E.izq = true; E.clicIzq = true; }
    e.preventDefault();
  }, { passive: false });
  lienzo.addEventListener('touchmove', (e) => { const t = e.touches[0]; pos(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  // en iOS el audio se desbloquea de verdad al levantar el dedo: el gesto también va aquí
  lienzo.addEventListener('touchend', (e) => { gesto(); if (!e.touches.length) { if (E.izq) E.soltoIzq = true; if (E.der) E.soltoDer = true; E.izq = E.der = false; } e.preventDefault(); }, { passive: false });
  window.addEventListener('resize', ajustar);
}
export function finCuadro() { E.clicIzq = E.clicDer = E.soltoIzq = E.soltoDer = false; E.pulsadas.clear(); E.rueda = 0; }
export const pulso = (k: string) => E.pulsadas.has(k);
