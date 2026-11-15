// Las marcas que dejan los poderes en el piso: escarcha, quemadura y charco de veneno. Antes eran un óvalo liso de un
// color. Ahora cada una se pinta una vez (forma irregular con su semilla) y lleva encima lo que se mueve: los destellos
// del hielo, el rescoldo de las grietas, las burbujas del veneno.
import type { Mancha } from '../juego/mundo';

const rnd = (s: number) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
interface Marca { img: HTMLCanvasElement; R: number; pts: [number, number][]; t0: number; sem: number }
const hechas = new WeakMap<Mancha, Marca>();

/** Contorno irregular (en el piso visto desde arriba, radio 1): se usa para recortar y para rellenar. */
function contorno(R: () => number, n = 30, rug = 0.22): number[] {
  const a = R() * 6.28, b = R() * 6.28, c = R() * 6.28; const out: number[] = [];
  for (let i = 0; i < n; i++) { const th = (i / n) * 6.283; out.push(1 - rug + rug * (0.5 + 0.28 * Math.sin(th * 2 + a) + 0.16 * Math.sin(th * 5 + b) + 0.1 * Math.sin(th * 9 + c) + (R() - 0.5) * 0.12)); }
  return out;
}
function trazar(x: CanvasRenderingContext2D, co: number[], cx: number, cy: number, r: number, k = 1) {
  x.beginPath(); for (let i = 0; i <= co.length; i++) { const th = (i / co.length) * 6.283, q = co[i % co.length] * r * k, px = cx + Math.cos(th) * q, py = cy + Math.sin(th) * q * 0.5; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath();
}

function pintar(m: Mancha, tJuego: number): Marca {
  const sem = ((m.sem ?? 0) * 7919 + Math.floor(m.x * 131) * 31 + Math.floor(m.y * 173)) >>> 0, R = rnd(sem || 1);
  const r = Math.max(8, (m.rmax ?? m.r) * 16), w = Math.ceil(r * 2 + 16), h = Math.ceil(r + 30), cx = w / 2, cy = h - r / 2 - 6;
  const img = document.createElement('canvas'); img.width = w; img.height = h; const x = img.getContext('2d')!;
  const co = contorno(R), pts: [number, number][] = [];
  if (m.tipo === 'hielo') {
    // la lámina: celeste en el centro, casi nada en el borde, con un canto blanco de escarcha
    trazar(x, co, cx, cy, r); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(150,205,240,0.62)'); g.addColorStop(0.6, 'rgba(170,220,250,0.42)'); g.addColorStop(1, 'rgba(210,240,255,0.1)');
    x.save(); x.scale(1, 1); x.fillStyle = g; x.fill(); x.restore();
    trazar(x, co, cx, cy, r, 0.97); x.strokeStyle = 'rgba(235,250,255,0.5)'; x.lineWidth = 1; x.stroke();
    // el reflejo: una mancha más clara corrida hacia la luz
    x.save(); trazar(x, co, cx, cy, r); x.clip(); const g2 = x.createRadialGradient(cx - r * 0.3, cy - r * 0.16, 0, cx - r * 0.3, cy - r * 0.16, r * 0.55); g2.addColorStop(0, 'rgba(255,255,255,0.4)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g2; x.fillRect(0, 0, w, h);
    // las grietas: salen del centro, se quiebran y se ramifican; cada una con su sombra azul al lado (hondura)
    const grieta = (ax: number, ay: number, ang: number, largo: number, n: number) => { let px = ax, py = ay; const ps: [number, number][] = [[px, py]]; for (let i = 0; i < 5; i++) { ang += (R() - 0.5) * 0.9; px += Math.cos(ang) * largo / 5; py += Math.sin(ang) * largo / 10; ps.push([px, py]); if (n > 0 && R() < 0.45) grieta(px, py, ang + (R() < 0.5 ? 0.8 : -0.8), largo * 0.45, n - 1); }
      for (const [dx, c, lw] of [[1, 'rgba(60,110,170,0.45)', 1], [0, 'rgba(245,252,255,0.85)', 1]] as [number, string, number][]) { x.strokeStyle = c; x.lineWidth = lw; x.beginPath(); ps.forEach(([qx, qy], i) => (i ? x.lineTo(qx + dx, qy + dx) : x.moveTo(qx + dx, qy + dx))); x.stroke(); } };
    for (let i = 0, n = 5 + Math.floor(R() * 3); i < n; i++) grieta(cx + (R() - 0.5) * r * 0.2, cy + (R() - 0.5) * r * 0.1, (i / n) * 6.283 + R() * 0.6, r * (0.55 + R() * 0.35), 2);
    x.restore();
    // la escarcha del borde: helechos cortos hacia afuera
    for (let i = 0; i < 26; i++) { const th = R() * 6.283, q = co[Math.floor((th / 6.283) * co.length) % co.length] * r, bx = cx + Math.cos(th) * q * 0.92, by = cy + Math.sin(th) * q * 0.46, l = 2 + R() * 5; x.strokeStyle = `rgba(235,248,255,${0.35 + R() * 0.4})`; x.lineWidth = 1; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.cos(th) * l, by + Math.sin(th) * l * 0.5); x.stroke(); }
    // los carámbanos que quedaron clavados: de pie, con cara clara y cara en sombra
    for (let i = 0, n = 4 + Math.floor(R() * 4); i < n; i++) { const th = R() * 6.283, d = R() * r * 0.6, bx = cx + Math.cos(th) * d, by = cy + Math.sin(th) * d * 0.5, al = 5 + R() * 12, an = 2 + R() * 2.5, inc = (R() - 0.5) * 5;
      x.fillStyle = 'rgba(120,180,225,0.9)'; x.beginPath(); x.moveTo(bx - an, by); x.lineTo(bx + inc, by - al); x.lineTo(bx + an, by); x.closePath(); x.fill();
      x.fillStyle = 'rgba(225,245,255,0.95)'; x.beginPath(); x.moveTo(bx - an, by); x.lineTo(bx + inc, by - al); x.lineTo(bx - an * 0.1, by); x.closePath(); x.fill(); }
    for (let i = 0; i < 6; i++) { const th = R() * 6.283, d = R() * r * 0.75; pts.push([Math.cos(th) * d, Math.sin(th) * d * 0.5 - R() * 4]); }
  } else if (m.tipo === 'quemado') {
    // el tizne: negro en el centro que se pierde hacia afuera, con lenguas de hollín
    for (let i = 0; i < 16; i++) { const th = R() * 6.283, l = r * (0.75 + R() * 0.45), an = 0.1 + R() * 0.14; x.fillStyle = `rgba(8,5,3,${0.2 + R() * 0.2})`; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(th - an) * l * 0.6, cy + Math.sin(th - an) * l * 0.3); x.lineTo(cx + Math.cos(th) * l, cy + Math.sin(th) * l * 0.5); x.lineTo(cx + Math.cos(th + an) * l * 0.6, cy + Math.sin(th + an) * l * 0.3); x.closePath(); x.fill(); }
    trazar(x, co, cx, cy, r, 0.82); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r * 0.82); g.addColorStop(0, 'rgba(6,4,2,0.86)'); g.addColorStop(0.55, 'rgba(14,9,5,0.66)'); g.addColorStop(1, 'rgba(20,12,6,0)'); x.fillStyle = g; x.fill();
    // ceniza: motas grises
    for (let i = 0; i < 70; i++) { const th = R() * 6.283, d = Math.sqrt(R()) * r * 0.9; x.fillStyle = `rgba(${150 + R() * 50},${140 + R() * 40},${125 + R() * 30},${0.3 + R() * 0.45})`; x.fillRect(Math.round(cx + Math.cos(th) * d), Math.round(cy + Math.sin(th) * d * 0.5), 1, 1); }
    // las grietas del piso reventado (el rescoldo que las enciende va en vivo, encima)
    for (let i = 0, n = 5 + Math.floor(R() * 3); i < n; i++) { let ang = (i / n) * 6.283 + R() * 0.7, px = cx, py = cy; x.strokeStyle = 'rgba(0,0,0,0.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); for (let q = 0; q < 4; q++) { ang += (R() - 0.5) * 0.9; px += Math.cos(ang) * r * 0.13; py += Math.sin(ang) * r * 0.065; x.lineTo(px, py); pts.push([px - cx, py - cy]); } x.stroke(); }
  } else {
    // el charco: borde oscuro, cuerpo verde y un brillo arriba a la izquierda
    trazar(x, co, cx, cy, r); x.fillStyle = 'rgba(22,52,10,0.85)'; x.fill();
    trazar(x, co, cx, cy, r, 0.9); const g = x.createRadialGradient(cx - r * 0.2, cy - r * 0.1, 0, cx, cy, r * 0.9); g.addColorStop(0, 'rgba(120,205,50,0.92)'); g.addColorStop(0.6, 'rgba(62,150,26,0.9)'); g.addColorStop(1, 'rgba(36,96,16,0.88)'); x.fillStyle = g; x.fill();
    x.save(); trazar(x, co, cx, cy, r, 0.9); x.clip(); x.strokeStyle = 'rgba(220,255,170,0.5)'; x.lineWidth = 2; x.beginPath(); x.ellipse(cx - r * 0.15, cy - r * 0.08, r * 0.55, r * 0.27, 0, Math.PI * 1.05, Math.PI * 1.6); x.stroke();
    for (let i = 0; i < 5; i++) { const th = R() * 6.283, d = R() * r * 0.6; x.fillStyle = 'rgba(30,80,12,0.5)'; x.beginPath(); x.ellipse(cx + Math.cos(th) * d, cy + Math.sin(th) * d * 0.5, 2 + R() * 4, 1 + R() * 2, 0, 0, 6.283); x.fill(); }
    x.restore();
    // gotas sueltas alrededor
    for (let i = 0; i < 7; i++) { const th = R() * 6.283, d = r * (1 + R() * 0.25); x.fillStyle = 'rgba(62,150,26,0.85)'; x.beginPath(); x.ellipse(cx + Math.cos(th) * d, cy + Math.sin(th) * d * 0.5, 1 + R() * 2.5, 0.6 + R() * 1.2, 0, 0, 6.283); x.fill(); }
    for (let i = 0; i < 6; i++) { const th = R() * 6.283, d = R() * r * 0.65; pts.push([Math.cos(th) * d, Math.sin(th) * d * 0.5]); }
  }
  return { img, R: r, pts, t0: tJuego, sem };
}

/** Dibuja la marca en (px, py) de pantalla. `t` es el reloj del juego (la marca envejece con él). */
export function dibujarMarca(ctx: CanvasRenderingContext2D, m: Mancha, px: number, py: number, t: number) {
  let mk = hechas.get(m); if (!mk) { mk = pintar(m, t); hechas.set(m, mk); }
  const ed = t - mk.t0, k = m.rmax ? Math.min(1, m.r / m.rmax) : 1, entra = Math.min(1, ed / 0.35);
  // el hielo se va derritiendo y el veneno secando; la quemadura queda
  const vida = m.tipo === 'hielo' ? Math.max(0.3, 1 - Math.max(0, ed - 22) / 30) : m.tipo === 'veneno' ? Math.max(0.45, 1 - Math.max(0, ed - 30) / 40) : 1;
  const w = mk.img.width * k, h = mk.img.height * k, cy = (mk.img.height - mk.R / 2 - 6) * k;
  ctx.save(); ctx.globalAlpha = entra * vida; ctx.drawImage(mk.img, Math.round(px - w / 2), Math.round(py - cy), w, h);
  if (m.tipo === 'hielo') {
    // destellos: cada punto titila a su tiempo, una cruz blanca de un parpadeo
    ctx.globalCompositeOperation = 'lighter';
    mk.pts.forEach(([dx, dy], i) => { const f = Math.sin(t * (1.6 + (i % 3) * 0.5) + i * 2.1 + mk!.sem); if (f < 0.78) return; const a = (f - 0.78) / 0.22 * vida, x = Math.round(px + dx * k), y = Math.round(py + dy * k); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5); });
    // el vaho frío los primeros segundos
    if (ed < 6) { ctx.globalAlpha = 0.1 * (1 - ed / 6); for (let i = 0; i < 3; i++) { const u = (t * 0.25 + i / 3) % 1; ctx.fillStyle = 'rgba(210,235,255,1)'; ctx.beginPath(); ctx.ellipse(px + Math.sin(i * 2.4 + t * 0.4) * mk.R * 0.4, py - u * 26, mk.R * (0.3 + u * 0.3), 5 + u * 5, 0, 0, 6.283); ctx.fill(); } }
  } else if (m.tipo === 'quemado') {
    // el rescoldo: las grietas siguen al rojo unos segundos y laten
    const br = Math.max(0, 1 - ed / 9); if (br > 0.01) { ctx.globalCompositeOperation = 'lighter';
      mk.pts.forEach(([dx, dy], i) => { const a = br * (0.45 + 0.4 * Math.sin(t * 5 + i * 1.7)); if (a <= 0) return; ctx.fillStyle = `rgba(255,${90 + (i % 3) * 30},20,${a})`; ctx.fillRect(Math.round(px + dx * k) - 1, Math.round(py + dy * k), 2, 1); });
      ctx.globalAlpha = 0.16 * br; const g = ctx.createRadialGradient(px, py, 0, px, py, mk.R * 0.7); g.addColorStop(0, 'rgba(255,110,30,1)'); g.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g; ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.5); ctx.translate(-px, -py); ctx.fillRect(px - mk.R, py - mk.R, mk.R * 2, mk.R * 2); ctx.restore(); }
  } else {
    // las burbujas: crecen, revientan y vuelven a salir en otro punto
    mk.pts.forEach(([dx, dy], i) => { const u = (t * (0.5 + (i % 3) * 0.17) + i * 0.37) % 1, x = px + dx * k, y = py + dy * k, r = 1 + u * 3;
      if (u < 0.85) { ctx.strokeStyle = `rgba(200,255,150,${0.7 * vida})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - u * 2, r, r * 0.8, 0, 0, 6.283); ctx.stroke(); ctx.fillStyle = `rgba(255,255,255,${0.6 * vida})`; ctx.fillRect(Math.round(x - r * 0.4), Math.round(y - u * 2 - r * 0.4), 1, 1); }
      else { const q = (u - 0.85) / 0.15; ctx.fillStyle = `rgba(190,255,130,${(1 - q) * 0.8 * vida})`; for (let s = 0; s < 4; s++) ctx.fillRect(Math.round(x + Math.cos(s * 1.57 + i) * (3 + q * 4)), Math.round(y - 2 - q * 4 + Math.sin(s * 1.57 + i) * 2), 1, 1); } });
  }
  ctx.restore();
}
