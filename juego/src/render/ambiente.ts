// Lo que le da vida al mapa sin ser enemigo ni poder: el agua que se mueve (destellos que corren, espuma en la orilla,
// peces que saltan), las huellas que quedan en la nieve y la arena, el chapoteo al correr bajo la lluvia, las ratas de
// las mazmorras, la neblina baja que se arrastra, los haces de luz que entran por las grietas y las motas de cada mundo
// (brasas, polvo, oro, escarcha). Todo es dibujo: nada de esto pega, estorba ni se guarda.
import { ctx, W, H, E } from '../nucleo/lienzo';
import { ZONAS } from '../mundo/actos';
import type { Juego, Ent } from '../juego/mundo';

type AP = (x: number, y: number) => [number, number];
const hc = (x: number, y: number) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
const temaDe = (j: Juego): string => (ZONAS[j.zona.id] as any)?.tema ?? '';
/** Nivel de detalle que marca el gobernador de calidad de escena.ts (2 todo, 0 lo mínimo). */
export const ambienteCfg = { nivel: 2 };

let zonaDe = '';
const huellas: { x: number; y: number; t: number; ang: number; lado: number; clara: boolean }[] = [];
const ultPaso = new Map<number, [number, number, number]>();
const chapoteos: { x: number; y: number; t: number }[] = [];
const ratas: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
const motas: { x: number; y: number; v: number; f: number }[] = [];
const jirones: { x: number; y: number; r: number; v: number; f: number }[] = [];
let tChapoteo = 0;

function reiniciar(j: Juego) {
  zonaDe = j.zona.id + ':' + j.zona.semilla;
  huellas.length = 0; ultPaso.clear(); chapoteos.length = 0; ratas.length = 0; motas.length = 0; jirones.length = 0;
}
const pisoEn = (j: Juego, x: number, y: number) => { const z = j.zona, cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= z.W || cy >= z.H) return null; return z.pisos[Math.floor(cy / 5) * z.tw + Math.floor(cx / 5)]; };
const libre = (j: Juego, x: number, y: number) => { const z = j.zona, cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < z.W && cy < z.H && !z.bloq[cy * z.W + cx]; };

/** Capa del piso: va después de las baldosas y antes de objetos y personajes. */
export function ambienteSuelo(j: Juego, dt: number, t: number, aP: AP, bx0: number, bx1: number, by0: number, by1: number) {
  if (zonaDe !== j.zona.id + ':' + j.zona.semilla) reiniciar(j);
  const z = j.zona, h = j.heroe, tema = temaDe(j);
  ctx.save();
  // ---- agua viva: destellos que corren con la corriente, espuma donde toca tierra y algún pez que salta
  for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
    const p = z.pisos[by * z.tw + bx]; if (!p || p.id !== 'agua') continue;
    const [px, py] = aP(bx * 5 + 2.5, by * 5 + 2.5); if (px < -100 || px > W + 100 || py < -60 || py > H + 60) continue;
    for (let i = 0; i < (ambienteCfg.nivel >= 2 ? 6 : 3); i++) {
      // cada destello recorre la baldosa a lo largo de x (la corriente) y vuelve a empezar
      const f = (t * (0.10 + hc(bx + i, by) * 0.08) + hc(bx * 3 + i, by * 7)) % 1, ly = hc(bx + i * 5, by + i) * 4.4 + 0.3, lx = f * 5;
      const [x, y] = aP(bx * 5 + lx, by * 5 + ly), a = Math.sin(f * Math.PI) * (0.28 + 0.2 * Math.sin(t * 3 + i));
      ctx.fillStyle = `rgba(200,225,255,${a})`; ctx.fillRect(Math.round(x), Math.round(y), 5 + (i % 3) * 2, 1); ctx.fillRect(Math.round(x) + 2, Math.round(y) + 1, 3, 1);
    }
    const agua = (X: number, Y: number) => X >= 0 && Y >= 0 && X < z.tw && Y < z.th && z.pisos[Y * z.tw + X]?.id === 'agua';
    ctx.strokeStyle = 'rgba(225,240,255,0.5)'; ctx.lineWidth = 1.5;
    for (const [dx, dy, x1, y1, x2, y2] of [[0, -1, 0, 0, 5, 0], [1, 0, 5, 0, 5, 5], [0, 1, 5, 5, 0, 5], [-1, 0, 0, 5, 0, 0]]) {
      if (agua(bx + dx, by + dy)) continue;
      // la espuma: una línea quebrada que respira hacia adentro y afuera, en tramos sueltos
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const f = i / 10, m = 0.35 + 0.22 * Math.sin(t * 1.6 + i * 1.9 + bx + by) + hc(bx * 9 + i, by * 5 + dx) * 0.3;
        const wx = bx * 5 + x1 + (x2 - x1) * f - dx * m, wy = by * 5 + y1 + (y2 - y1) * f - dy * m, [x, y] = aP(wx, wy);
        if (i % 3 === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // el pez: cada tantos segundos, un arco corto y la salpicadura al caer
    const per = 7 + hc(bx, by * 3) * 9, f = ((t + hc(bx * 5, by) * per) % per) / 0.9;
    if (f < 1 && hc(bx * 2, by * 2) < 0.6) {
      const [x, y] = aP(bx * 5 + 1 + hc(bx, by) * 3 + f * 0.8, by * 5 + 1 + hc(by, bx) * 3), alto = Math.sin(f * Math.PI) * 9;
      ctx.fillStyle = 'rgba(30,48,66,0.95)'; ctx.fillRect(Math.round(x), Math.round(y - alto), 4, 2); ctx.fillStyle = 'rgba(170,200,225,0.9)'; ctx.fillRect(Math.round(x) + 1, Math.round(y - alto), 2, 1);
      if (f < 0.2 || f > 0.8) { const k = f < 0.2 ? f / 0.2 : (f - 0.8) / 0.2; ctx.strokeStyle = `rgba(210,230,250,${0.6 * (1 - k)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 2, y, 3 + k * 6, 1.5 + k * 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
  // ---- huellas: quien camina sobre nieve, arena o ceniza deja la pisada, que se va borrando
  const marca = (e: Ent) => {
    const p = pisoEn(j, e.x, e.y); if (!p || !/nieve|arena|tierra_infierno/.test(p.id)) return;
    const u = ultPaso.get(e.id);
    if (!u) { ultPaso.set(e.id, [e.x, e.y, 1]); return; }
    const d = Math.hypot(e.x - u[0], e.y - u[1]); if (d < 0.5) return;
    if (d < 3) huellas.push({ x: e.x, y: e.y, t: 0, ang: Math.atan2((e.x + e.y - u[0] - u[1]) / 2, e.x - e.y - u[0] + u[1]), lado: u[2], clara: p.id === 'nieve' });
    ultPaso.set(e.id, [e.x, e.y, -u[2]]);
    if (huellas.length > (E.tactil ? 110 : 200)) huellas.splice(0, huellas.length - (E.tactil ? 110 : 200));
  };
  if (!h.muerto) marca(h);
  for (const m of j.monstruos) if (!m.muerto && Math.abs(m.x - h.x) + Math.abs(m.y - h.y) < 16) marca(m);
  (window as any).__huellas = huellas.length;
  for (let i = huellas.length - 1; i >= 0; i--) {
    const q = huellas[i]; q.t += dt; if (q.t > 16) { huellas.splice(i, 1); continue; }
    const [px, py] = aP(q.x, q.y); if (px < -8 || px > W + 8 || py < -8 || py > H + 8) continue;
    // la pisada va a un costado de la línea de marcha (pie izquierdo, pie derecho)
    const ox = -Math.sin(q.ang) * 2.6 * q.lado, oy = Math.cos(q.ang) * 1.3 * q.lado, a = 0.55 * (1 - q.t / 16);
    ctx.fillStyle = q.clara ? `rgba(70,90,120,${a})` : `rgba(40,26,12,${a})`;
    ctx.fillRect(Math.round(px + ox) - 2, Math.round(py + oy), 4, 2);
    if (q.clara) { ctx.fillStyle = `rgba(240,248,255,${a * 0.7})`; ctx.fillRect(Math.round(px + ox) - 1, Math.round(py + oy) + 2, 3, 1); }
  }
  // ---- chapoteo: correr bajo la lluvia levanta agua en cada zancada
  if (z.lluvia && z.tipo !== 'mazmorra' && !h.muerto && (h.acc === 'correr' || h.acc === 'caminar')) {
    tChapoteo -= dt; if (tChapoteo <= 0) { tChapoteo = h.acc === 'correr' ? 0.15 : 0.26; chapoteos.push({ x: h.x + (Math.random() - 0.5) * 0.3, y: h.y + (Math.random() - 0.5) * 0.3, t: 0 }); }
  }
  for (let i = chapoteos.length - 1; i >= 0; i--) {
    const q = chapoteos[i]; q.t += dt; if (q.t > 0.42) { chapoteos.splice(i, 1); continue; }
    const [px, py] = aP(q.x, q.y), k = q.t / 0.42;
    ctx.strokeStyle = `rgba(190,210,240,${0.55 * (1 - k)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py, 3 + k * 9, 1.5 + k * 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(225,235,255,${0.8 * (1 - k)})`; const alto = Math.sin(k * Math.PI) * 7;
    for (const s of [-1, 0, 1]) ctx.fillRect(Math.round(px + s * (3 + k * 6)), Math.round(py - alto * (s ? 0.7 : 1)), 1, 2);
  }
  // ---- ratas: en las mazmorras de obra corretean pegadas a los muros y huyen si te acercas
  if (z.tipo === 'mazmorra' && !z.hueco && !/celestial|abismo/.test(tema)) {
    const n = E.tactil ? 4 : 7;
    for (let i = ratas.length - 1; i >= 0; i--) if (Math.hypot(ratas[i].x - h.x, ratas[i].y - h.y) > 24) ratas.splice(i, 1);
    for (let k = 0; ratas.length < n && k < 12; k++) { const a = Math.random() * Math.PI * 2, d = 9 + Math.random() * 8, x = h.x + Math.cos(a) * d, y = h.y + Math.sin(a) * d; if (libre(j, x, y)) ratas.push({ x, y, vx: 0, vy: 0, t: 0 }); }
    for (const q of ratas) {
      q.t -= dt;
      const dh = Math.hypot(q.x - h.x, q.y - h.y), huye = dh < 3.2;
      if (q.t <= 0 || huye) {
        // corre un trecho y se queda quieta olisqueando; si la asustas, sale disparada en contra
        const a = huye ? Math.atan2(q.y - h.y, q.x - h.x) + (Math.random() - 0.5) * 0.9 : Math.random() * Math.PI * 2, v = huye ? 7 : Math.random() < 0.35 ? 0 : 3.4;
        q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v; q.t = huye ? 0.35 : 0.3 + Math.random() * 1.1;
      }
      const nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
      if (libre(j, nx, ny)) { q.x = nx; q.y = ny; } else { q.vx = -q.vx * 0.6 + (Math.random() - 0.5) * 2; q.vy = -q.vy * 0.6 + (Math.random() - 0.5) * 2; q.t = 0.2; }
      const [px, py] = aP(q.x, q.y); if (px < -10 || px > W + 10 || py < -10 || py > H + 10) continue;
      const sx = q.vx - q.vy, dir = sx < 0 ? -1 : 1, X = Math.round(px), Y = Math.round(py);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(X - 3, Y, 6, 1);
      ctx.fillStyle = '#2a211b'; ctx.fillRect(X - 2, Y - 3, 5, 3); ctx.fillRect(X + dir * 3 - (dir < 0 ? 1 : 0), Y - 2, 2, 2);
      ctx.fillStyle = '#4a3a30'; ctx.fillRect(X - 1, Y - 3, 3, 1);
      ctx.fillStyle = '#6a5048'; ctx.fillRect(X - dir * 3 - (dir > 0 ? 2 : 0), Y - 1, 3, 1);
    }
  }
  ctx.restore();
}

const BRUMA = /paramo|cementerio|selva|ahogada/;
const HAZ = /cueva|cripta|catacumbas|abadia|templo|tumba|catedral_ahogada|mina/;
/** Capa del aire: va arriba de todo (después de la luz), antes de la lluvia. */
export function ambienteAire(j: Juego, dt: number, t: number, aP: AP) {
  if (zonaDe !== j.zona.id + ':' + j.zona.semilla) reiniciar(j);
  const z = j.zona, h = j.heroe, tema = temaDe(j), poco = ambienteCfg.nivel < 2;
  ctx.save();
  // ---- neblina baja: jirones anchos y bajos que se arrastran con el viento, anclados al mundo
  if (z.tipo !== 'mazmorra' && BRUMA.test(tema) && !poco) {
    while (jirones.length < (E.tactil ? 5 : 9)) jirones.push({ x: h.x + (Math.random() - 0.5) * 44, y: h.y + (Math.random() - 0.5) * 44, r: 90 + Math.random() * 110, v: 0.5 + Math.random() * 0.9, f: Math.random() * 6 });
    for (const q of jirones) {
      q.x += q.v * dt; q.y -= q.v * 0.35 * dt;
      // el que se aleja vuelve a entrar por el otro lado del héroe
      if (q.x - h.x > 24) q.x -= 48; if (h.x - q.x > 24) q.x += 48; if (q.y - h.y > 24) q.y -= 48; if (h.y - q.y > 24) q.y += 48;
      const [px, py] = aP(q.x, q.y); if (px < -q.r || px > W + q.r || py < -q.r || py > H + q.r) continue;
      const a = 0.075 + 0.035 * Math.sin(t * 0.5 + q.f), g = ctx.createRadialGradient(px, py, 0, px, py, q.r);
      g.addColorStop(0, `rgba(170,182,196,${a})`); g.addColorStop(0.6, `rgba(170,182,196,${a * 0.5})`); g.addColorStop(1, 'rgba(170,182,196,0)');
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.34); ctx.translate(-px, -py); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, q.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  // ---- haces de luz: por las grietas del techo entra un rayo inclinado, con polvo que flota adentro
  if (z.tipo === 'mazmorra' && HAZ.test(tema)) {
    const x0 = Math.floor(h.x) - 26, y0 = Math.floor(h.y) - 26;
    ctx.globalCompositeOperation = 'lighter';
    const frio = /cueva|catedral_ahogada|mina/.test(tema), c = frio ? '170,205,235' : '255,226,170';
    for (let cy = y0; cy < y0 + 52; cy++) for (let cx = x0; cx < x0 + 52; cx++) {
      if (cx < 0 || cy < 0 || cx >= z.W || cy >= z.H || hc(cx * 1.7 + 11, cy * 2.3 + 5) > 0.0042 || z.bloq[cy * z.W + cx]) continue;
      const [px, py] = aP(cx + 0.5, cy + 0.5); if (px < -80 || px > W + 80 || py < -20 || py > H + 220) continue;
      const k = 0.75 + 0.25 * Math.sin(t * 0.8 + cx), alto = 190, corr = -62;
      const g = ctx.createLinearGradient(px + corr, py - alto, px, py); g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(0.35, `rgba(${c},${0.1 * k})`); g.addColorStop(1, `rgba(${c},${0.2 * k})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px + corr - 9, py - alto); ctx.lineTo(px + corr + 9, py - alto); ctx.lineTo(px + 24, py + 3); ctx.lineTo(px - 24, py - 3); ctx.closePath(); ctx.fill();
      const gp = ctx.createRadialGradient(px, py, 0, px, py, 30); gp.addColorStop(0, `rgba(${c},${0.2 * k})`); gp.addColorStop(1, `rgba(${c},0)`);
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.5); ctx.translate(-px, -py); ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(px, py, 30, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (!poco) for (let i = 0; i < 7; i++) { const f = (t * (0.05 + hc(cx + i, cy) * 0.05) + hc(cx, cy + i)) % 1, x = px + corr * (1 - f) + (hc(cx + i * 3, cy) - 0.5) * 26 * (0.4 + f * 0.6), y = py - alto * (1 - f); ctx.fillStyle = `rgba(${c},${0.5 * Math.sin(f * Math.PI)})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // ---- motas del mundo: brasas que suben, polvo que flota, oro que asciende, escarcha que brilla
  const tipo = /infierno|santuario|abismo/.test(tema) ? 'brasa' : /celestial/.test(tema) ? 'oro' : /hielo/.test(tema) ? 'escarcha' : z.tipo === 'mazmorra' && /tumba|cripta|catacumbas|abadia|mina|templo/.test(tema) ? 'polvo' : '';
  if (tipo) {
    const n = Math.round((E.tactil ? 26 : 46) * (poco ? 0.5 : 1));
    while (motas.length < n) motas.push({ x: Math.random() * W, y: Math.random() * H, v: 0.5 + Math.random(), f: Math.random() * 6.28 });
    if (motas.length > n) motas.length = n;
    if (tipo !== 'polvo') ctx.globalCompositeOperation = 'lighter';
    for (const q of motas) {
      const sube = tipo === 'brasa' ? 34 : tipo === 'oro' ? 13 : tipo === 'escarcha' ? -5 : 3;
      q.y -= sube * q.v * dt; q.x += Math.sin(t * 0.9 + q.f) * (tipo === 'brasa' ? 16 : 7) * dt;
      if (q.y < -6) { q.y = H + 4; q.x = Math.random() * W; } if (q.y > H + 6) { q.y = -4; q.x = Math.random() * W; } if (q.x < -6) q.x = W + 4; if (q.x > W + 6) q.x = -4;
      const p = 0.5 + 0.5 * Math.sin(t * (tipo === 'escarcha' ? 5 : 2.2) + q.f), X = Math.round(q.x), Y = Math.round(q.y);
      if (tipo === 'brasa') { ctx.fillStyle = `rgba(255,${120 + Math.round(90 * p)},40,${0.35 + 0.5 * p})`; ctx.fillRect(X, Y, q.v > 1.1 ? 2 : 1, q.v > 1.1 ? 2 : 1); }
      else if (tipo === 'oro') { ctx.fillStyle = `rgba(255,224,130,${0.2 + 0.5 * p})`; ctx.fillRect(X, Y, 1, 1); if (q.v > 1.2) ctx.fillRect(X - 1, Y, 3, 1); }
      else if (tipo === 'escarcha') { ctx.fillStyle = `rgba(210,238,255,${0.7 * p * p})`; ctx.fillRect(X, Y, 1, 1); if (p > 0.85) { ctx.fillRect(X - 1, Y, 3, 1); ctx.fillRect(X, Y - 1, 1, 3); } }
      else { ctx.fillStyle = `rgba(190,178,150,${0.1 + 0.16 * p})`; ctx.fillRect(X, Y, 1, 1); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}
