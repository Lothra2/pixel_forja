// La portada de la Forja: fondo por capas con paralaje (cielo, nubes, relámpagos, ruinas, catedral con su luz, niebla,
// cementerio), ceniza y brasas, el título nuevo (fijo, revelado y en bucle) y las cartas ilustradas de cada acto.
// Todo se baja por partes: primero el fondo y el título fijo (lo que se ve), después las animaciones del título del
// idioma activo, y las cartas solo cuando hacen falta. Mientras algo no llega, se dibuja lo que hay.
import { ctx, W, H, E } from '../nucleo/lienzo';
import { IDI, TITULO, texto, envolver } from './comun';
import { BASE } from '../motor/assets';
import { Sonido } from '../audio/sonido';
import { fuegoTitulo } from './titulo_fuego';

const RAIZ = BASE + 'portada/';
let man: any = null;
let pidio = false;
const imgs = new Map<string, HTMLImageElement>();
const pedir = (ruta: string) => {
  if (imgs.has(ruta)) return imgs.get(ruta)!;
  const im = new Image(); im.decoding = 'async'; im.src = RAIZ + ruta; imgs.set(ruta, im); return im;
};
const lista = (ruta?: string) => { if (!ruta) return null; const im = pedir(ruta); return im.complete && im.naturalWidth ? im : null; };

/** Baja el manifiesto y lo primero que se ve. Se puede llamar muchas veces. */
export function prepararPortada() {
  if (pidio) return; pidio = true;
  fetch(RAIZ + 'portada.json').then((r) => r.json()).then((m) => {
    man = m;
    for (const c of m.fondo.capas) pedir(c.archivo);
    pedir(m.fondo.relampago.archivo); pedir(m.fondo.ceniza.archivo);
    for (const idi of ['es', 'en']) pedir(m.titulo[idi].fijo['800']);
    // las animaciones del título del idioma activo, después
    setTimeout(() => { const t = m.titulo[IDI ? 'en' : 'es']; for (const k of ['revelar', 'anim']) for (const h of t[k]['800'].hojas) pedir(h); }, 400);
  }).catch(() => { pidio = false; });
}
export const portadaLista = () => !!man && !!lista(man.fondo.capas[0].archivo) && !!lista(man.fondo.capas.find((c: any) => c.id === 'catedral')?.archivo);

// ------------------------------------------------------------------ estado de la escena
let t0 = -1, proxRayo = 1.4, rayo = -1, rayoEspejo = false, trueno = -1;
/** Sprites de luz precalculados (halos, rayos, luna, niebla, brasas): un degradado por cuadro salía carísimo. */
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(k: string, n: number, pintar: (c: CanvasRenderingContext2D, n: number) => void): HTMLCanvasElement {
  let im = sprites.get(k); if (im) return im;
  im = document.createElement('canvas'); im.width = im.height = n; pintar(im.getContext('2d')!, n); sprites.set(k, im); return im;
}
interface Part { x: number; y: number; vx: number; vy: number; s: number; a: number; f: number; v: number; vida?: number }
const parts = new Map<string, Part[]>();
const R = Math.random, entre = (r: [number, number]) => r[0] + R() * (r[1] - r[0]);

/** Reinicia la secuencia de entrada (negro, fondo, relámpago, título, botones). */
export function reiniciarPortada() { t0 = -1; proxRayo = 1.4; rayo = -1; trueno = -1; }
/** Segundos desde que se reinicia la portada hasta que el título termina de forjarse (para entrar con la música del menú). */
export function durForjaTitulo() { const rv = man?.titulo?.[IDI ? 'en' : 'es']?.revelar?.['800']; return 2.2 + (rv ? rv.cuadros / rv.fps : 3); }

/** Dibuja la portada. Devuelve el alfa de los botones (0 a 1) y dónde van, o null si todavía no está lista. */
export function dibujarPortada(tReal: number): { botones: number; yBotones: number } | null {
  prepararPortada();
  if (!portadaLista()) return null;
  if (t0 < 0) t0 = tReal;
  const t = tReal - t0;
  const f = man.fondo, base = man.base;
  // escala: cubre la pantalla con la base de 1280x720; en vertical se escala por alto y se centra en la catedral
  const vertical = H > W;
  const esc = (vertical ? H / base.h : Math.max(W / base.w, H / base.h)) * (1.03 + 0.03 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 52)));
  const ox = vertical ? W / 2 - man.fondo.foco.x * esc : (W - base.w * esc) / 2, oy = (H - base.h * esc) / 2;
  const cam = f.camara;
  const cx = Math.sin((2 * Math.PI * t) / cam.periodo_x_s) * cam.deriva_x + (E.x / W - 0.5) * 2 * cam.raton;
  const cy = Math.sin((2 * Math.PI * t) / cam.periodo_y_s) * cam.deriva_y + (E.y / H - 0.5) * 2 * cam.raton * 0.3;
  const mx = f.capa.margen_x, my = f.capa.margen_y;
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const fondoK = Math.min(1, Math.max(0, (t - 0.2) / 1.6));
  // relámpagos: uno forzado a los 1.4 s y después cada 7 a 16 s
  const rel = f.relampago;
  if (t >= proxRayo && rayo < 0) { rayo = t; rayoEspejo = R() < 0.5; trueno = t + 0.4 + R() * 0.8; proxRayo = t + entre(rel.cada_s); }
  const iRayo = rayo >= 0 ? Math.floor((t - rayo) * rel.fps) : -1;
  if (iRayo >= rel.cuadros) rayo = -1;
  if (trueno > 0 && t >= trueno) { trueno = -1; Sonido.efecto('trueno' as any, { vol: 0.5 }); }
  const enRayo = rayo >= 0 && iRayo < rel.cuadros;
  const luzCat = Math.min(1, Math.max(0, (t - 1.4) / 1)) * (enRayo ? 0.5 : 1);
  const capa = (c: any, alfa = 1, dx = 0) => {
    const im = lista(c.archivo); if (!im) return;
    ctx.globalAlpha = alfa * fondoK; ctx.globalCompositeOperation = c.mezcla === 'sumar' || c.mezcla === 'lighter' ? 'lighter' : 'source-over';
    // capas animadas por cuadros (el fuego de Doom de la ciudad y de la catedral): una tira de cuadros puesta en (x, y)
    if (c.anim?.tipo === 'cuadros') {
      const a = c.anim, w = a.w ?? c.w, h = a.h ?? c.h, cols = a.columnas ?? Math.max(1, Math.floor((im as any).width / w)), n = Math.floor(t * a.fps) % a.cuadros;
      ctx.drawImage(im, (n % cols) * w, Math.floor(n / cols) * h, w, h, ox + ((c.x ?? 0) - mx - cx * c.paralaje) * esc, oy + ((c.y ?? 0) - my - cy * c.paralaje) * esc, w * esc, h * esc);
      return;
    }
    const x = ox + (-mx - cx * c.paralaje + dx) * esc, y = oy + (-my - cy * c.paralaje) * esc;
    ctx.drawImage(im, x, y, c.w * esc, c.h * esc);
    if (c.anim?.enrollar) { const w = c.w * esc; ctx.drawImage(im, x + (dx > 0 ? -w : w), y, w, c.h * esc); }
  };
  const ceniza = (despues: string) => {
    const cz = f.ceniza, im = lista(cz.archivo); if (!im) return;
    for (const pc of cz.particulas) {
      if (pc.despues_de !== despues) continue;
      let ps = parts.get(pc.fila + despues);
      if (!ps) { ps = Array.from({ length: pc.cantidad }, () => nueva(pc, true)); parts.set(pc.fila + despues, ps); }
      const fila = cz.filas[pc.fila];
      ctx.globalCompositeOperation = pc.mezcla === 'sumar' ? 'lighter' : 'source-over';
      for (const p of ps) {
        p.x += p.vx / 60; p.y += p.vy / 60; if (p.vida !== undefined) p.vida -= 1 / 60;
        if (p.x < -40 || p.x > base.w + 40 || p.y < -40 || p.y > base.h + 40 || (p.vida !== undefined && p.vida <= 0)) Object.assign(p, nueva(pc, false));
        const col = Math.floor((t * cz.fps + p.f) % cz.columnas);
        const x = ox + (p.x - cx * pc.paralaje + Math.sin(t * 1.3 + p.f) * pc.vaiven) * esc, y = oy + (p.y - cy * pc.paralaje) * esc, s = cz.celda * p.s * esc;
        ctx.globalAlpha = p.a * fondoK * (p.vida !== undefined ? Math.min(1, p.vida) : 1);
        // los copos de ceniza: un punto de 1 o 2 px de lienzo, tibio y a media luz (el cuadro grande se leía como polvo en el vidrio)
        if (pc.fila.startsWith('copo')) { ctx.globalAlpha *= 0.5; ctx.fillStyle = p.s > 1 ? '#c9a68a' : '#a88a74'; const d = p.s > 1 ? 2 : 1; ctx.fillRect(Math.round(x), Math.round(y), d, d); continue; }
        ctx.drawImage(im, col * cz.celda, fila * cz.celda, cz.celda, cz.celda, x - s / 2, y - s / 2, s, s);
      }
    }
  };
  // ---- lo que la Forja no trae y hace la escena: la luna de sangre detrás de la catedral con sus rayos, los cuervos
  // que rondan las agujas, la niebla en capas y las brasas grandes de primer plano. Todo en coordenadas de la base.
  const P = (bx: number, by: number, par: number): [number, number] => [ox + (bx - cx * par) * esc, oy + (by - cy * par) * esc];
  const luna = () => {
    const [lx, ly] = P(f.foco.x + 70, 250, 0.07), r = 150 * esc;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // el resplandor: tres halos, el de afuera llena medio cielo
    const halo = sprite('halo', 256, (c, n) => { const g = c.createRadialGradient(n / 2, n / 2, n * 0.06, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,70,24,1)'); g.addColorStop(1, 'rgba(120,10,0,0)'); c.fillStyle = g; c.fillRect(0, 0, n, n); });
    // (los tres halos van compuestos en un solo sprite: tres pasadas sumadas a pantalla completa costaban la mitad de los cuadros)
    const halos = sprite('halos', 384, (c, n) => { c.globalCompositeOperation = 'lighter'; for (const [k, a] of [[1, 0.16], [0.5, 0.2], [0.29, 0.26]]) { c.globalAlpha = a; c.drawImage(halo, n / 2 - (n / 2) * k, n / 2 - (n / 2) * k, n * k, n * k); } });
    ctx.globalAlpha = fondoK; ctx.drawImage(halos, lx - r * 3.8, ly - r * 3.8, r * 7.6, r * 7.6);
    // los rayos: abanico que gira muy despacio y respira
    const rayos = sprite('rayos', 512, (c, n) => { c.translate(n / 2, n / 2); for (let q = 0; q < 14; q++) { const a = (q / 14) * Math.PI * 2, an = 0.05 + 0.035 * Math.sin(q * 2.4), R2 = n / 2; const g = c.createLinearGradient(0, 0, Math.cos(a) * R2, Math.sin(a) * R2); g.addColorStop(0, `rgba(255,120,50,${0.5 + 0.3 * Math.sin(q * 1.7)})`); g.addColorStop(1, 'rgba(255,60,20,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a - an) * R2, Math.sin(a - an) * R2); c.lineTo(Math.cos(a + an) * R2, Math.sin(a + an) * R2); c.closePath(); c.fill(); } });
    ctx.globalAlpha = (0.16 + 0.06 * Math.sin(t * 0.5)) * fondoK; ctx.translate(lx, ly); ctx.rotate(t * 0.012); ctx.drawImage(rayos, -r * 3.6, -r * 3.6, r * 7.2, r * 7.2);
    ctx.restore(); ctx.save(); ctx.globalAlpha = fondoK;
    // el disco: claro arriba a la izquierda, rojo oscuro en el borde, con sus mares y la sombra que le come el borde de abajo
    const disco = sprite('luna', 384, (c, n) => { const R2 = n / 2; const d = c.createRadialGradient(R2 * 0.7, R2 * 0.68, R2 * 0.1, R2, R2, R2); d.addColorStop(0, '#ffe2b0'); d.addColorStop(0.45, '#ff9a4c'); d.addColorStop(0.85, '#c8361a'); d.addColorStop(1, '#6a0e08');
      c.fillStyle = d; c.beginPath(); c.arc(R2, R2, R2 - 1, 0, Math.PI * 2); c.fill(); c.save(); c.beginPath(); c.arc(R2, R2, R2 - 1, 0, Math.PI * 2); c.clip();
      for (const [mx2, my2, mr, ma] of [[-0.3, -0.25, 0.3, 0.2], [0.25, -0.05, 0.22, 0.18], [-0.05, 0.35, 0.34, 0.16], [0.45, 0.42, 0.18, 0.2], [-0.5, 0.2, 0.16, 0.16], [0.1, -0.5, 0.14, 0.14]]) { c.fillStyle = `rgba(90,14,8,${ma})`; c.beginPath(); c.ellipse(R2 + mx2 * R2, R2 + my2 * R2, mr * R2, mr * R2 * 0.8, 0.4, 0, Math.PI * 2); c.fill(); }
      const sm = c.createLinearGradient(0, R2 * 0.9, 0, n); sm.addColorStop(0, 'rgba(20,2,2,0)'); sm.addColorStop(1, 'rgba(20,2,2,0.8)'); c.fillStyle = sm; c.fillRect(0, 0, n, n); c.restore(); });
    ctx.drawImage(disco, lx - r, ly - r, r * 2, r * 2);
    ctx.restore();
  };
  const cuervosPortada = () => {
    ctx.save(); ctx.globalAlpha = fondoK; ctx.strokeStyle = '#070304'; ctx.lineCap = 'round';
    for (let i = 0; i < 17; i++) {
      // cada cuervo da vueltas alrededor de las agujas en su propia órbita achatada; tres cruzan el cielo de lado a lado
      const hsh = (n: number) => { const q = Math.sin(i * 91.7 + n * 37.3) * 43758.5; return q - Math.floor(q); };
      let bx: number, by: number, tam: number;
      if (i < 14) { const a = t * (0.12 + hsh(1) * 0.2) * (hsh(2) < 0.5 ? 1 : -1) + hsh(3) * 6.28, rx = 80 + hsh(4) * 300, ry = 22 + hsh(5) * 80; bx = f.foco.x + 30 + Math.cos(a) * rx; by = 170 + hsh(6) * 130 + Math.sin(a) * ry; tam = 6 + hsh(7) * 7 + Math.sin(a) * 2; }
      else { const u = ((t * (0.018 + hsh(1) * 0.012) + hsh(2)) % 1); bx = -80 + u * (base.w + 160); by = 110 + hsh(3) * 150 + Math.sin(u * 14) * 10; tam = 9 + hsh(4) * 6; }
      const [x, y] = P(bx, by, 0.3), q = tam * esc, ala = Math.sin(t * (7 + hsh(8) * 4) + i) * 0.75;
      ctx.lineWidth = Math.max(1.5, q * 0.3); ctx.beginPath(); ctx.moveTo(x - q, y - q * ala); ctx.quadraticCurveTo(x - q * 0.4, y - q * 0.25 * ala - q * 0.15, x, y); ctx.quadraticCurveTo(x + q * 0.4, y - q * 0.25 * ala - q * 0.15, x + q, y - q * ala); ctx.stroke();
    }
    ctx.restore();
  };
  const nieblaCapas = (y0: number, par: number, n: number, rgb: string, a: number) => {
    const im = sprite('niebla' + rgb, 128, (c, m) => { const g = c.createRadialGradient(m / 2, m / 2, 0, m / 2, m / 2, m / 2); g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(0, 0, m, m); });
    ctx.save();
    for (let i = 0; i < n; i++) {
      const hsh = (m: number) => { const q = Math.sin(i * 57.3 + m * 19.1 + y0) * 43758.5; return q - Math.floor(q); };
      const an = 260 + hsh(1) * 380, v = 5 + hsh(2) * 9, bx = ((hsh(3) * (base.w + an * 2) + t * v * (i % 2 ? 1 : -1)) % (base.w + an * 2) + (base.w + an * 2)) % (base.w + an * 2) - an, by = y0 + (hsh(4) - 0.5) * 50;
      const [x, y] = P(bx, by, par), rx = an * esc, ry = (26 + hsh(5) * 34) * esc;
      ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 0.3 + i)) * fondoK; ctx.drawImage(im, x - rx, y - ry, rx * 2, ry * 2);
    }
    ctx.restore();
  };
  const brasasCerca = () => {
    const im = sprite('brasa', 64, (c, m) => { const g = c.createRadialGradient(m / 2, m / 2, 0, m / 2, m / 2, m / 2); g.addColorStop(0, 'rgba(255,190,80,1)'); g.addColorStop(0.4, 'rgba(255,110,30,0.5)'); g.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = g; c.fillRect(0, 0, m, m); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const hsh = (m: number) => { const q = Math.sin(i * 23.9 + m * 71.7) * 43758.5; return q - Math.floor(q); };
      const u = (t * (0.035 + hsh(1) * 0.05) + hsh(2)) % 1, bx = hsh(3) * base.w + Math.sin(u * 6 + i) * 46, by = base.h + 30 - u * (base.h * 0.95), r = (2.5 + hsh(4) * 8) * esc;
      const [x, y] = P(bx, by, 1.5);
      ctx.globalAlpha = Math.sin(u * Math.PI) * (0.14 + hsh(5) * 0.34) * fondoK * (0.7 + 0.3 * Math.sin(t * 9 + i)); ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  };
  // la catedral, un tercio más grande, crecida desde su puerta: manda en la escena
  const KC = 1.3, [pcx, pcy] = P(f.foco.puerta[0], 600, 0.45);
  for (const c of f.capas) {
    if (c.id === 'vineta') continue;
    const off = ((window as any).__pOff ?? '') as string;
    if (c.id === 'nubes' && !off.includes('luna')) luna();
    if (c.id === 'cementerio' && !off.includes('niebla')) { nieblaCapas(560, 0.8, 4, '60,16,12', 0.6); }
    const esCat = String(c.id).startsWith('catedral');
    if (esCat) { const kc = off.includes('cat') ? 1 : KC; ctx.save(); ctx.translate(pcx, pcy); ctx.scale(kc, kc); ctx.translate(-pcx, -pcy); }
    if (c.id === 'relampago') {
      if (enRayo) {
        const im = lista(rel.archivo); if (im) {
          const cw = rel.w, ch = rel.h, col = iRayo % rel.columnas, fila = Math.floor(iRayo / rel.columnas);
          const x = ox + (-mx - cx * c.paralaje) * esc, y = oy + (-my - cy * c.paralaje + rel.y_capa) * esc;
          ctx.globalAlpha = fondoK; ctx.globalCompositeOperation = 'lighter';
          if (rayoEspejo) { ctx.save(); ctx.translate(x + cw * esc, y); ctx.scale(-1, 1); ctx.drawImage(im, col * cw, fila * ch, cw, ch, 0, 0, cw * esc, ch * esc); ctx.restore(); }
          else ctx.drawImage(im, col * cw, fila * ch, cw, ch, x, y, cw * esc, ch * esc);
        }
      }
      continue;
    }
    let alfa = 1, dx = 0;
    if (c.anim?.tipo === 'deriva') dx = ((t * c.anim.px_por_segundo) % c.w + c.w) % c.w * Math.sign(c.anim.px_por_segundo || 1);
    if (c.anim?.tipo === 'titilar') alfa = 0.7 + 0.3 * (0.5 + 0.25 * Math.sin(t * 5.3 * 6.28) + 0.25 * Math.sin(t * 8.9 * 6.28 + 1));
    // en los relámpagos el fuego de la catedral baja (el de las ruinas no)
    if (c.id === 'catedral_fuego' && enRayo) alfa = 0.6;
    if (c.anim?.tipo === 'latir') alfa = (0.7 + 0.3 * (0.5 + 0.5 * Math.sin((t / c.anim.periodo_s) * 6.28))) * luzCat;
    capa(c, alfa, c.anim?.tipo === 'deriva' ? (c.anim.px_por_segundo < 0 ? -dx : dx) : 0);
    if (esCat) ctx.restore();
    ceniza(c.id);
    if (c.id === 'ruinas_llamas' && !off.includes('niebla')) nieblaCapas(500, 0.3, 3, '150,40,20', 0.2);
    if (c.id === 'catedral_fuego') cuervosPortada();
    if (c.id === 'cementerio' && !off.includes('niebla')) { nieblaCapas(690, 1.2, 4, '10,4,4', 0.7); brasasCerca(); }
  }
  // el grado de color: arriba casi negro (el título se despega), el horizonte al rojo vivo y el piso otra vez oscuro
  { const gr = sprite('grado', 256, (c, n) => { const g = c.createLinearGradient(0, 0, 0, n); g.addColorStop(0, 'rgba(8,0,4,0.74)'); g.addColorStop(0.34, 'rgba(8,0,4,0.12)'); g.addColorStop(0.62, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); c.fillStyle = g; c.fillRect(0, 0, n, n); });
    ctx.globalAlpha = fondoK; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(gr, 0, 0, W, H); }
  ctx.globalCompositeOperation = 'source-over';
  // destello del relámpago en toda la pantalla
  if (enRayo) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = rel.destello[iRayo] ?? 0; ctx.fillStyle = '#c8d8ff'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  const vin = f.capas.find((c: any) => c.id === 'vineta'); const iv = vin && lista(vin.archivo);
  if (iv) { ctx.globalAlpha = 1; ctx.drawImage(iv, 0, 0, W, H); }
  ctx.globalAlpha = 1;
  // título: el cuadro de 800 a 0.54 del ancho (0.96 en vertical), revelado a los 2.2 s y después en bucle
  dibujarTitulo(t - 2.2, vertical);
  ctx.restore();
  return { botones: Math.min(1, Math.max(0, (t - 4) / 0.5)), yBotones: H * 0.62 };
}
function nueva(pc: any, alAzar: boolean): Part {
  const b = man.base;
  const p: Part = { x: R() * b.w, y: alAzar ? R() * b.h : pc.vel_y[0] > 0 ? -20 : b.h + 20, vx: entre(pc.vel_x), vy: entre(pc.vel_y), s: entre(pc.escala), a: entre(pc.alfa), f: R() * 8, v: 0 };
  if (pc.nacen_en) { p.x = pc.nacen_en[0] + (R() - 0.5) * 30; p.y = pc.nacen_en[1] - R() * (alAzar ? 120 : 10); p.vida = 2 + R() * 2; }
  return p;
}
/** El título en su lugar de la portada; tRel < 0 todavía no aparece. */
function dibujarTitulo(tRel: number, vertical: boolean) {
  const ti = man.titulo[IDI ? 'en' : 'es'], col = man.titulo.colocacion?.[vertical ? 'movil_vertical' : 'escritorio'] ?? { ancho_rel: 0.54, centro_y_rel: 0.235 };
  // (se mide por ancho, pero nunca más alto que el 40 % de la pantalla: en monitores anchos crecía hasta tapar la catedral)
  const w = Math.min(W * col.ancho_rel, H * 0.4 / 0.6), h = w * 0.6, x = W / 2 - w / 2, y = Math.max(-h * 0.08, H * (vertical ? col.centro_y_rel : 0.19) - h / 2);
  if (tRel < 0) return;
  const hoja = (a: any, i: number) => { const n = Math.floor(i / a.por_hoja), j = i % a.por_hoja; const im = lista(a.hojas[n]); if (!im) return false; ctx.drawImage(im, (j % a.columnas) * a.w, Math.floor(j / a.columnas) * a.h, a.w, a.h, x, y, w, h); return true; };
  const rv = ti.revelar['800'], an = ti.anim['800'];
  const iRev = Math.floor(tRel * rv.fps);
  // el fuego de Doom nace de las letras cuando terminan de forjarse y se queda ardiendo
  const fArde = Math.min(1, Math.max(0, (tRel - rv.cuadros / rv.fps + 0.6) / 1.4)), fijoIm = lista(ti.fijo['800']);
  fuegoTitulo(fijoIm, x, y, w, h, tRel, fArde, 'atras');
  if (iRev < rv.cuadros) { if (hoja(rv, iRev)) return; }
  else if (hoja(an, Math.floor((tRel - rv.cuadros / rv.fps) * an.fps) % an.cuadros)) { fuegoTitulo(fijoIm, x, y, w, h, tRel, fArde, 'adelante'); return; }
  // sin las hojas todavía: el título fijo, con un fundido
  const fijo = lista(ti.fijo['800']); if (fijo) { ctx.globalAlpha = Math.min(1, tRel / 1.2); ctx.drawImage(fijo, x, y, w, h); ctx.globalAlpha = 1; }
}
/** El título fijo nuevo en cualquier lugar (pantallas de carga, final). Devuelve false si todavía no llegó. */
export function tituloFijo(cx: number, cy: number, ancho: number, alfa = 1): boolean {
  prepararPortada(); if (!man) return false;
  const im = lista(man.titulo[IDI ? 'en' : 'es'].fijo['800']); if (!im) return false;
  const h = ancho * (im.naturalHeight / im.naturalWidth);
  ctx.save(); ctx.globalAlpha = alfa; ctx.drawImage(im, cx - ancho / 2, cy - h / 2, ancho, h); ctx.restore();
  return true;
}

// ------------------------------------------------------------------ cartas de acto
/** Pide la carta del acto (para tenerla lista antes del entreacto). */
export function prepararCarta(acto: number) { prepararPortada(); const c = man?.cartas.actos.find((a: any) => a.n === acto); if (c) pedir(c.archivo); }
/** Dibuja la carta del acto con su título y la narración. Devuelve false si todavía no está. */
export function dibujarCarta(acto: number, t: number, narracion: string, dur: number): boolean {
  prepararPortada(); if (!man) return false;
  const c = man.cartas.actos.find((a: any) => a.n === acto); if (!c) return false;
  const im = lista(c.archivo); if (!im) return false;
  const cw = man.cartas.w, ch = man.cartas.h, z = man.cartas.zonas;
  const esc = Math.max(W / cw, H / ch) * (1 + 0.04 * Math.min(1, t / 8));
  const ox = W / 2 - (cw * esc) / 2, oy = H / 2 - (ch * esc) / 2;
  const k = Math.min(1, t / 0.8, Math.max(0, (dur - t) / 0.8));
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = k;
  ctx.drawImage(im, ox, oy, cw * esc, ch * esc);
  const P = (zx: number, zy: number) => [ox + zx * esc, oy + zy * esc];
  const [tx, ty] = P(z.titulo.x + z.titulo.w / 2, z.titulo.y + z.titulo.h / 2);
  const tam = Math.round(z.titulo.h * esc * 0.42);
  const nombre = IDI ? c.en : c.es;
  ctx.globalAlpha = k * Math.min(1, Math.max(0, (t - 0.4) / 0.8));
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [3, 3]]) texto(nombre, tx + dx, ty + dy + tam * 0.35, { alin: 'center', tam, color: '#000', fuente: TITULO });
  texto(nombre, tx, ty + tam * 0.35, { alin: 'center', tam, color: c.color_titulo, fuente: TITULO });
  if (narracion) {
    const [nx, ny] = P(z.narracion.x + z.narracion.w / 2, z.narracion.y);
    const tn = Math.max(16, Math.round(23 * esc));
    ctx.globalAlpha = k * Math.min(1, Math.max(0, (t - 1.2) / 1));
    envolver(narracion, z.narracion.w * esc * 0.92, tn).slice(0, 4).forEach((l, i) => texto(l, nx, ny + tn * 1.3 + i * tn * 1.35, { alin: 'center', tam: tn, color: '#e8dcc0', fuente: TITULO }));
  }
  ctx.restore();
  return true;
}

/** Espera a que estén la portada y los títulos fijos (con tope), para que la secuencia arranque con todo y sin el título viejo. */
export async function esperarPortada(tope = 8000) {
  prepararPortada();
  const t0 = performance.now();
  while (performance.now() - t0 < tope) {
    if (portadaLista() && man && ['es', 'en'].every((i) => lista(man.titulo[i].fijo['800']))) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
