// Las cinemáticas de cierre de acto de la Forja: planos ilustrados en capas con paralaje, movimiento de cámara
// (push-in, paneo y sacudida), fundidos, elementos animados y narración en la zona de abajo.
// Vienen en el kit de portada, en la sección `cinematicas` de portada.json. Mientras un acto no tenga la suya, se usa su
// carta ilustrada con un push-in y la narración de cierre (ver CIERRE).
//
// Formato que lee (todo opcional salvo planos, dur y capas):
//   cinematicas.capa = { w, h, margen_x, margen_y }           geometría por defecto de las capas, como el fondo de la portada
//   cinematicas[clave] = { musica?, planos: Plano[] }          clave: acto_1 … acto_6, acto_7 y acto_7_<final>
//   Plano = { dur, capas: Capa[], camara?, narracion?: {es, en}, fundido?: {entra, sale}, particulas?: 'ceniza'|'brasas'|'nieve'|'lluvia' }
//   Capa  = { archivo, paralaje, mezcla?: 'normal'|'sumar', w?, h?, x?, y?, alfa?, anim?, si?, no? }
//           si / no: marcas del héroe (vigdis_viva, vigdis_muerta, brasa_destruir, brasa_absorber, corona_auren…)
//   anim  = { tipo: 'deriva', px_por_segundo, enrollar? } | { tipo: 'titilar' } | { tipo: 'latir', periodo_s }
//         | { tipo: 'flotar', amplitud_px, periodo_s } | { tipo: 'cuadros', columnas, cuadros, fps, w, h }
//         | { tipo: 'aparecer', desde_s, dur_s }
//   camara = { desde: {x, y, zoom}, hasta: {x, y, zoom}, curva?: 'suave'|'lineal', sacudida?: {t, dur, fuerza} }
//           x e y en píxeles de capa (con paralaje 1 se mueven 1 a 1), zoom 1 es la pantalla base.
import { ctx, W, H } from '../nucleo/lienzo';
import { IDI, TITULO, texto, envolver, T } from './comun';
import { BASE } from '../motor/assets';
import { Sonido } from '../audio/sonido';
import { prepararPortada, dibujarCarta, prepararCarta } from './portada';

const RAIZ = BASE + 'portada/';
let man: any = null, pidio = false;
const imgs = new Map<string, HTMLImageElement>();
const pedir = (ruta: string) => { if (imgs.has(ruta)) return imgs.get(ruta)!; const im = new Image(); im.decoding = 'async'; im.src = RAIZ + ruta; imgs.set(ruta, im); return im; };
const lista = (ruta?: string) => { if (!ruta) return null; const im = pedir(ruta); return im.complete && im.naturalWidth ? im : null; };

/** La narración de cierre de cada acto cuando todavía no está la cinemática de la Forja (va sobre la carta del acto). */
export const CIERRE: Record<number, [string, string]> = {
  1: ['Ilvara cae en el fondo del pozo. La brasa ya no está en sus manos. Una luz roja sube por el pozo y se pierde hacia el sur.', 'Ilvara falls at the bottom of the well. The ember is no longer in her hands. A red light climbs the shaft and vanishes to the south.'],
  2: ['El rey sin sombra se deshace en arena. Su sombra no lo espera. Ya se fue con la brasa, río abajo, hacia la selva.', 'The king without a shadow crumbles into sand. His shadow does not wait for him. It has already gone with the ember, downriver, toward the jungle.'],
  3: ['La Madre del barro deja de parir. El río se aclara de a poco, y en el agua limpia se ve el reflejo de una montaña nevada.', 'The Mother of mud stops giving birth. The river clears little by little, and in the clean water a snowy mountain is reflected.'],
  4: ['Hjaldur se sienta otra vez, y esta vez no se levanta. La escarcha de su pecho deja de latir. Cuatro sellos rotos. Queda uno.', 'Hjaldur sits down again, and this time he does not rise. The frost in his chest stops beating. Four seals broken. One remains.'],
  5: ['Ozmaren se apaga como una fragua sin fuelle. Del fondo de la ceniza rueda algo pequeño, rojo, vivo, hasta tus pies.', 'Ozmaren goes out like a forge without bellows. From the bottom of the ash something small, red and alive rolls to your feet.'],
  6: ['La Campana da su último golpe y se parte. El mar vuelve a su lugar. Arriba, el cielo cruje como un vidrio.', 'The Bell strikes its last and cracks. The sea returns to its place. Above, the sky creaks like glass.'],
  7: ['Aun-Saar cae de su trono. La sed se queda sin boca. En el suelo, entre la ceniza dorada, rueda una corona pequeña, tibia, como para un niño.', 'Aun-Saar falls from his throne. The thirst is left without a mouth. On the ground, among the golden ash, rolls a small crown, warm, as if made for a child.'],
};
const DUR_CARTA_CIERRE = 8;

export function prepararCine() {
  prepararPortada();
  if (pidio) return; pidio = true;
  fetch(RAIZ + 'portada.json').then((r) => r.json()).then((m) => { man = m; }).catch(() => { pidio = false; });
}
const datos = (clave: string) => man?.cinematicas?.[clave] ?? demo[clave];
/** La clave del cierre de un acto (el acto 7 tiene además una por final, ver claveFinal). */
export const claveCine = (acto: number) => `acto_${acto}`;
/** La cinemática del final que te tocó, si la Forja ya la entregó (se ve al entregar la Corona, antes del epílogo). */
export const claveFinal = (final: string): string | null => (datos(`acto_7_${final}`) ? `acto_7_${final}` : null);
/** Marcas que eligen capas: una capa con `si` solo se ve si la marca está, y con `no` solo si no está (p. ej. vigdis_viva o vigdis_muerta). */
let marcas = new Set<string>();
/** Planos cuyo sujeto está abajo (la tumba y Vigdis con su farol): la narración va arriba, sobre el cielo. */
const NARRACION_ARRIBA = new Set(['p2_fortin']);
export function marcasCine(m: string[]) { marcas = new Set(m); }
/** Empieza a bajar las imágenes de una cinemática (o la carta de respaldo). */
export function precargarCine(clave: string, acto: number) {
  prepararCine();
  const c = datos(clave);
  if (c) { for (const p of c.planos) for (const k of p.capas) pedir(k.archivo); } else prepararCarta(acto);
}
/** Duración total (o la de la carta de respaldo). */
export function durCine(clave: string): number { const c = datos(clave); return c ? c.planos.reduce((a: number, p: any) => a + p.dur, 0) : DUR_CARTA_CIERRE; }

// ------------------------------------------------------------------ partículas simples para los planos
interface P { x: number; y: number; vx: number; vy: number; s: number; a: number }
let parts: P[] = [], partsDe = '';
function particulas(tipo: string, dt: number, k: number) {
  if (partsDe !== tipo) { partsDe = tipo; parts = []; }
  const n = tipo === 'lluvia' ? 140 : tipo === 'nieve' ? 90 : 60;
  while (parts.length < n) parts.push(nuevaP(tipo, true));
  ctx.save(); ctx.globalCompositeOperation = tipo === 'brasas' ? 'lighter' : 'source-over';
  for (const p of parts) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y < -20 || p.y > H + 20 || p.x < -20 || p.x > W + 20) Object.assign(p, nuevaP(tipo, false));
    ctx.globalAlpha = p.a * k;
    if (tipo === 'lluvia') { ctx.strokeStyle = 'rgba(170,180,200,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y + 14); ctx.stroke(); }
    else { ctx.fillStyle = tipo === 'brasas' ? (p.s > 2 ? '#ffb050' : '#ff6020') : tipo === 'nieve' ? '#e8f0ff' : '#9a9088'; ctx.fillRect(p.x, p.y, p.s, p.s); }
  }
  ctx.restore();
}
function nuevaP(tipo: string, azar: boolean): P {
  const R = Math.random;
  if (tipo === 'lluvia') return { x: R() * W * 1.1, y: azar ? R() * H : -10, vx: -60, vy: 620 + R() * 200, s: 1, a: 0.5 };
  if (tipo === 'nieve') return { x: R() * W, y: azar ? R() * H : -10, vx: -10 + R() * 20, vy: 30 + R() * 40, s: 1 + R() * 2, a: 0.7 };
  if (tipo === 'brasas') return { x: R() * W, y: azar ? R() * H : H + 10, vx: -15 + R() * 30, vy: -(30 + R() * 60), s: 1 + R() * 2.5, a: 0.8 };
  return { x: R() * W, y: azar ? R() * H : -10, vx: -20 + R() * 15, vy: 15 + R() * 25, s: 1 + R() * 2, a: 0.5 };
}

const suave = (k: number) => k * k * (3 - 2 * k);
const mezclar = (a: number, b: number, k: number) => a + (b - a) * k;
let tAnt = 0;

/**
 * Dibuja la cinemática en el instante t. Devuelve true cuando terminó.
 * Sin datos de la Forja para esa clave, dibuja la carta del acto con un push-in y la narración de cierre.
 */
export function dibujarCine(clave: string, acto: number, t: number): boolean {
  prepararCine();
  const dt = Math.max(0, Math.min(0.1, t - tAnt)); tAnt = t;
  const c = datos(clave);
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
  if (!c) {
    // respaldo: la carta del acto que se cierra, con una sacudida al principio
    const sac = t < 0.6 ? (1 - t / 0.6) * 6 : 0;
    ctx.save(); ctx.translate((Math.random() - 0.5) * sac, (Math.random() - 0.5) * sac);
    const ok = dibujarCarta(acto, t, T(...(CIERRE[acto] ?? ['', ''])), DUR_CARTA_CIERRE);
    ctx.restore();
    if (ok && acto >= 5) particulas('brasas', dt, Math.min(1, t / 1.5, Math.max(0, (DUR_CARTA_CIERRE - t) / 1)));
    pista(t);
    return t >= DUR_CARTA_CIERRE || (!ok && t > 3);
  }
  // el plano que toca
  let t0 = 0, i = 0;
  while (i < c.planos.length - 1 && t >= t0 + c.planos[i].dur) { t0 += c.planos[i].dur; i++; }
  const p = c.planos[i], tl = t - t0;
  if (tl >= p.dur && i === c.planos.length - 1) return true;
  const geo = { w: 1536, h: 800, margen_x: 128, margen_y: 40, ...(man?.cinematicas?.capa ?? {}) };
  const base = { w: geo.w - geo.margen_x * 2, h: geo.h - geo.margen_y * 2 };
  // cámara
  const cam = p.camara ?? {}, de = cam.desde ?? { x: 0, y: 0, zoom: 1 }, a = cam.hasta ?? de;
  const k = cam.curva === 'lineal' ? Math.min(1, tl / p.dur) : suave(Math.min(1, tl / p.dur));
  const cx = mezclar(de.x ?? 0, a.x ?? 0, k), cy = mezclar(de.y ?? 0, a.y ?? 0, k), zoom = mezclar(de.zoom ?? 1, a.zoom ?? 1, k);
  let sx = 0, sy = 0;
  const sac = cam.sacudida;
  if (sac && tl >= sac.t && tl < sac.t + sac.dur) { const f = sac.fuerza * (1 - (tl - sac.t) / sac.dur); sx = (Math.random() - 0.5) * f * 2; sy = (Math.random() - 0.5) * f * 2; }
  if (sac && Math.abs(tl - sac.t) < dt * 1.5) Sonido.efecto('trueno' as any, { vol: 0.5 });
  const esc = Math.max(W / base.w, H / base.h) * zoom;
  const ox = W / 2 - (base.w * esc) / 2 + sx, oy = H / 2 - (base.h * esc) / 2 + sy;
  // fundidos
  const fe = p.fundido?.entra ?? 0.8, fs = p.fundido?.sale ?? 0.8;
  const kEntra = fe > 0 ? Math.min(1, tl / fe) : 1, kSale = fs > 0 ? Math.min(1, Math.max(0, (p.dur - tl) / fs)) : 1;
  // un fundido de color (blanco o rojo) no oscurece las capas: las tapa con su color
  const colorEn = p.fundido?.color_entra, colorSa = p.fundido?.color_sale;
  const alfaPlano = Math.min(colorEn ? 1 : kEntra, colorSa ? 1 : kSale);
  ctx.save();
  for (const capa of p.capas) {
    if ((capa.si && !marcas.has(capa.si)) || (capa.no && marcas.has(capa.no))) continue;
    const im = lista(capa.archivo); if (!im) continue;
    const cw = capa.w ?? geo.w, ch = capa.h ?? geo.h, an = capa.anim ?? {};
    let alfa = capa.alfa ?? 1, dx = 0, dy = 0;
    if (an.tipo === 'deriva') dx = (((tl * an.px_por_segundo) % cw) + cw) % cw;
    const [a0, a1] = an.alfa ?? [0.7, 1];
    if (an.tipo === 'titilar') { const hz = (an.hz ?? 7) / 7; alfa *= a0 + (a1 - a0) * (0.5 + 0.25 * Math.sin(tl * 5.3 * hz * 6.28) + 0.25 * Math.sin(tl * 8.9 * hz * 6.28 + 1)); }
    if (an.tipo === 'latir') alfa *= a0 + (a1 - a0) * (0.5 + 0.5 * Math.sin((tl / (an.periodo_s ?? 2)) * 6.28));
    if (an.tipo === 'flotar') dy = Math.sin((tl / (an.periodo_s ?? 4)) * 6.28) * (an.amplitud_px ?? 6);
    if (an.tipo === 'aparecer') alfa *= Math.min(1, Math.max(0, (tl - (an.desde_s ?? 0)) / (an.dur_s ?? 1)));
    const x = ox + ((capa.x ?? 0) - geo.margen_x - cx * capa.paralaje + dx) * esc, y = oy + ((capa.y ?? 0) - geo.margen_y - cy * capa.paralaje + dy) * esc;
    ctx.globalAlpha = alfa * alfaPlano; ctx.globalCompositeOperation = capa.mezcla === 'sumar' ? 'lighter' : 'source-over';
    if (an.tipo === 'cuadros') {
      // la celda de la hoja mide an.w x an.h; en pantalla se dibuja del tamaño de la capa
      const n = (Math.floor(tl * (an.fps ?? 12)) + (an.desfase ?? 0)) % an.cuadros, col = n % an.columnas, fila = Math.floor(n / an.columnas);
      ctx.drawImage(im, col * an.w, fila * an.h, an.w, an.h, x, y, (capa.w ?? an.w) * esc, (capa.h ?? an.h) * esc);
    } else {
      ctx.drawImage(im, x, y, cw * esc, ch * esc);
      if (an.enrollar || an.tipo === 'deriva') ctx.drawImage(im, x - cw * esc, y, cw * esc, ch * esc);
    }
  }
  ctx.restore();
  const tapa = (c: string, k: number) => { if (k >= 1) return; ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = c === 'rojo' ? '#8a0606' : c === 'blanco' ? '#fff6e8' : '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); };
  if (colorEn) tapa(colorEn, kEntra);
  if (colorSa) tapa(colorSa, kSale);
  if (p.particulas) particulas(p.particulas, dt, alfaPlano);
  // franjas de cine y narración en la zona de abajo
  ctx.save(); ctx.fillStyle = '#000'; const banda = H * 0.08; ctx.fillRect(0, 0, W, banda); ctx.fillRect(0, H - banda, W, banda); ctx.restore();
  if (p.narracion) {
    let nar = p.narracion;
    for (const [bandera, alt] of Object.entries(p.narracion_si ?? {})) if (marcas.has(bandera)) nar = alt;
    const s = IDI ? nar.en : nar.es, tn = Math.max(15, Math.round(H / 30));
    const ln = envolver(s, W * 0.7, tn).slice(0, 3);
    const kt = Math.min(1, Math.max(0, (tl - 0.6) / 0.9), Math.max(0, (p.dur - tl) / 0.7)) * Math.min(kEntra, kSale) ** 0.5;
    ctx.save(); ctx.globalAlpha = kt;
    // arriba cuando el sujeto del plano está abajo (lo pide el plano con narracion_pos, o la tabla de abajo)
    const arriba = p.narracion_pos === 'arriba' || NARRACION_ARRIBA.has(p.id);
    const y0 = arriba ? banda + tn * 1.6 : H - banda - 18 - (ln.length - 1) * tn * 1.35;
    const g = arriba ? ctx.createLinearGradient(0, 0, 0, y0 + ln.length * tn * 1.35 + tn) : ctx.createLinearGradient(0, y0 - tn * 2, 0, H);
    if (arriba) { g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, y0 + ln.length * tn * 1.35 + tn); }
    else { g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = g; ctx.fillRect(0, y0 - tn * 2, W, H - y0 + tn * 2); }
    ln.forEach((l, j) => { texto(l, W / 2 + 2, y0 + j * tn * 1.35 + 2, { alin: 'center', tam: tn, color: '#000', fuente: TITULO }); texto(l, W / 2, y0 + j * tn * 1.35, { alin: 'center', tam: tn, color: '#e8dcc0', fuente: TITULO }); });
    ctx.restore();
  }
  pista(t);
  return false;
}
function pista(t: number) { if (t > 1) texto(T('Clic o Esc para saltar', 'Click or Esc to skip'), W - 12, H - 10, { alin: 'right', tam: 11, color: 'rgba(160,140,110,0.6)' }); }

// ------------------------------------------------------------------ una cinemática de prueba con las capas del fondo de la portada
// (para probar el reproductor mientras no llegan las de la Forja: window.__cine('demo'))
const demo: Record<string, any> = {
  demo: { musica: 'intro', planos: [
    { dur: 6, particulas: 'ceniza', fundido: { entra: 1, sale: 0.8 },
      camara: { desde: { x: -60, y: 0, zoom: 1 }, hasta: { x: 60, y: -10, zoom: 1.06 } },
      capas: [{ archivo: 'fondo/cielo.webp', paralaje: 0.05 }, { archivo: 'fondo/nubes.png', paralaje: 0.12, anim: { tipo: 'deriva', px_por_segundo: -12, enrollar: true } }, { archivo: 'fondo/ruinas.png', paralaje: 0.2 }, { archivo: 'fondo/ruinas_fuego.png', paralaje: 0.2, mezcla: 'sumar', anim: { tipo: 'titilar' } }, { archivo: 'fondo/catedral.png', paralaje: 0.45 }, { archivo: 'fondo/catedral_luz.png', paralaje: 0.45, mezcla: 'sumar', anim: { tipo: 'latir', periodo_s: 2.4 } }, { archivo: 'fondo/niebla.png', paralaje: 0.7, anim: { tipo: 'flotar', amplitud_px: 8, periodo_s: 5 } }, { archivo: 'fondo/cementerio.webp', paralaje: 1 }],
      narracion: { es: 'Paneo con paralaje: el cielo casi no se mueve, el cementerio se mueve entero.', en: 'Parallax pan: the sky barely moves, the graveyard moves fully.' } },
    { dur: 6, particulas: 'brasas', fundido: { entra: 0.6, sale: 1 },
      camara: { desde: { x: 0, y: 0, zoom: 1 }, hasta: { x: 0, y: -30, zoom: 1.3 }, sacudida: { t: 2.5, dur: 0.7, fuerza: 10 } },
      capas: [{ archivo: 'fondo/cielo.webp', paralaje: 0.05 }, { archivo: 'fondo/ruinas.png', paralaje: 0.2 }, { archivo: 'fondo/catedral.png', paralaje: 0.45 }, { archivo: 'fondo/catedral_luz.png', paralaje: 0.45, mezcla: 'sumar', anim: { tipo: 'aparecer', desde_s: 2.5, dur_s: 0.6 } }],
      narracion: { es: 'Push-in hacia la catedral, sacudida a los 2.5 segundos y la luz que se enciende.', en: 'Push-in toward the cathedral, a shake at 2.5 seconds and the light coming on.' } },
  ] },
};
