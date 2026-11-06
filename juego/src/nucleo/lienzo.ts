// El lienzo del juego: resolución lógica (altura ~540-720 px, como los juegos de 800x600 pero más ancha) y entrada.
export const lienzo = document.getElementById('juego') as HTMLCanvasElement;
export const ctx = lienzo.getContext('2d', { alpha: false })!;
export let W = 960, H = 540, ESCALA = 1;

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
export function ajustar() {
  leerSeguro();
  const ww = window.innerWidth, wh = window.innerHeight;
  // altura lógica cerca de 620 (como los juegos de 800x600): en pantallas grandes se agranda
  const k = Math.max(wh / 640, 0.78);
  const h = wh / k;
  const w = ww / k;
  W = Math.round(Math.min(Math.max(w, 640), 1600));
  H = Math.round(h);
  // en vertical el ancho mínimo de 640 dejaba un cuadrado chiquito en el medio: se estira el alto para llenar la pantalla
  if (ww < wh && w < 640) H = Math.round(Math.min(1400, (640 * wh) / ww));
  ESCALA = Math.min(ww / W, wh / H);
  lienzo.width = W; lienzo.height = H;
  lienzo.style.width = `${Math.floor(W * ESCALA)}px`;
  lienzo.style.height = `${Math.floor(H * ESCALA)}px`;
  lienzo.style.imageRendering = Math.abs(ESCALA - Math.round(ESCALA)) < 0.01 ? 'pixelated' : 'auto';
  ctx.imageSmoothingEnabled = false;
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
export const E: Entrada = { x: 0, y: 0, izq: false, der: false, clicIzq: false, clicDer: false, soltoIzq: false, soltoDer: false, teclas: new Set(), pulsadas: new Set(), rueda: 0, shift: false, ctrl: false, alt: false, tactil: false, texto: '' };
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
  lienzo.addEventListener('touchend', (e) => { if (!e.touches.length) { if (E.izq) E.soltoIzq = true; if (E.der) E.soltoDer = true; E.izq = E.der = false; } e.preventDefault(); }, { passive: false });
  window.addEventListener('resize', ajustar);
}
export function finCuadro() { E.clicIzq = E.clicDer = E.soltoIzq = E.soltoDer = false; E.pulsadas.clear(); E.rueda = 0; }
export const pulso = (k: string) => E.pulsadas.has(k);
