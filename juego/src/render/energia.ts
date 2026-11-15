// La energía de los poderes: lo que hace que un hechizo se sienta además de verse. Todo sale de mirar lo que el juego ya
// hace (los efectos que nacen, los proyectiles que vuelan, el héroe que conjura, los monstruos que caen), sin tocar reglas:
//   - al conjurar, motas del color del poder que acuden en espiral a las manos y un anillo que se cierra a los pies;
//   - al soltar, un fogonazo en las manos y una onda que se abre en el piso;
//   - cada proyectil deja una cinta de luz y brasas que caen;
//   - cada impacto y cada estallido revienta en chispas que saltan en arco y rebotan, una onda de choque en el piso, un
//     destello, y si es grande, un segundo anillo, un resplandor de pantalla entera y el temblor;
//   - el que muere sale despedido hacia donde iba el golpe y se arrastra un trecho antes de quedar quieto.
import type { Juego, Efecto, Proyectil, Monstruo } from '../juego/mundo';
import { COLOR_ELEM } from './luces';
import { rgbLuz, LUZ_EFECTO } from '../../../src/engine/gotico/luz_efectos';
import { HABILIDADES } from '../datos/clases';
import { pasable } from '../mundo/zona';
import { E } from '../nucleo/lienzo';

type RGB = [number, number, number];
interface Chispa { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; d: number; c: RGB; s: number; px?: number; py?: number; reb: number; g?: number }
interface Anillo { x: number; y: number; t: number; d: number; r0: number; r1: number; c: RGB; g: number; a: number }
interface Flash { x: number; y: number; z: number; t: number; d: number; r: number; c: RGB; a: number }
interface Mota { ang: number; r: number; z: number; t: number; d: number; c: RGB; giro: number }
const chispas: Chispa[] = [], anillos: Anillo[] = [], flashes: Flash[] = [], motas: Mota[] = [];
const estelas = new Map<Proyectil, { p: [number, number, number][]; c: RGB }>();
let vistos = new WeakSet<object>();
let oscuro = 0, definitiva = false;
let tAnt = -1, zonaAnt = '', pantalla = 0, pantallaC: RGB = [255, 255, 255], conjurando = false, tMota = 0;

const POR_NOMBRE: [RegExp, string][] = [
  [/fuego|ignea|magma|meteoro|brasa|llama|ardiente|infern|explosion|combust|sol_negro|lava|incendi/, 'fuego'], [/hielo|escarcha|helad|glacial|ventisca|carambano|nieve|frio|congel/, 'frio'],
  [/rayo|relampago|chispa|voltaic|galvan|trueno|electr|tormenta|tempestad|firmamento|prismat/, 'rayo'], [/veneno|toxic|acido|plaga|baba|ponzo|espora/, 'veneno'],
  [/sombra|oscur|maldic|abismo|negro|vacio|anima|alma|espectr|implosion/, 'sombra'], [/sangre|carmesi|hemorr/, 'sangre'], [/hueso|osario|craneo|calavera/, 'hueso'],
  [/luz|sagrad|bendit|castigo|divin|santo|aureola|curacion/, 'luz'], [/natur|enredad|raiz|espina|hoja|lobo|oso|savia/, 'naturaleza'], [/arcan|conjuro|portal|teleport|orbe|prisma/, 'arcano'],
];
const colorDe = (id: string, elem?: string): RGB => {
  if (elem && elem !== 'fisico' && COLOR_ELEM[elem]) return COLOR_ELEM[elem];
  for (const [re, e] of POR_NOMBRE) if (re.test(id)) return COLOR_ELEM[e];
  if (!id.startsWith('pfx:') && LUZ_EFECTO[id]) return rgbLuz(id);
  return COLOR_ELEM.fisico;
};
/** Efectos que no son un golpe de poder: avisos, marcas, humo, lo que queda en el piso. No revientan en chispas. */
const SIN_ESTALLIDO = /fx_(aviso|recoger|cofre|humareda|congelar|alma|monedas|plumas|baba|salpicadura|curacion|critico|electrocutado|circulo)|suelo_ardiente|glifo|circulo_|polvo_|destello_tele|subida_nivel|aura_|transformacion|maldicion|llanto|tajo_|arco_cadena|muro_|nube_/;
const HAB = new Map(HABILIDADES.map((h) => [h.id, h]));
const R = Math.random;
const sprites = new Map<string, HTMLCanvasElement>();
function luzSpr(c: RGB): HTMLCanvasElement {
  const k = c.join(','); let s = sprites.get(k); if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 64; const x = s.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, `rgba(${Math.min(255, c[0] + 60)},${Math.min(255, c[1] + 60)},${Math.min(255, c[2] + 60)},0.8)`); g.addColorStop(0.6, `rgba(${k},0.3)`); g.addColorStop(1, `rgba(${k},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); sprites.set(k, s); return s;
}

function estallar(x: number, y: number, z: number, c: RGB, fuerza: number) {
  const tope = E.tactil ? 220 : 420, n = Math.round((E.tactil ? 7 : 12) + fuerza * (E.tactil ? 5 : 10));
  for (let i = 0; i < n && chispas.length < tope; i++) { const a = R() * Math.PI * 2, v = (1.6 + R() * 4.2) * (0.7 + fuerza * 0.4); chispas.push({ x, y, z: z + 8 + R() * 14, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 50 + R() * 150 * (0.7 + fuerza * 0.3), t: 0, d: 0.45 + R() * 0.55, c, s: R() < 0.3 ? 3 : 2, reb: 1 }); }
  flashes.push({ x, y, z: z + 16, t: 0, d: 0.2 + fuerza * 0.05, r: 30 + fuerza * 26, c, a: 0.9 });
  anillos.push({ x, y, t: 0, d: 0.34 + fuerza * 0.08, r0: 0.25, r1: 1.3 + fuerza * 1.15, c, g: 2.5 + fuerza, a: 0.85 });
  if (fuerza >= 1.35) { anillos.push({ x, y, t: -0.09, d: 0.55, r0: 0.4, r1: 2.2 + fuerza * 1.5, c, g: 1.6, a: 0.5 }); pantalla = Math.max(pantalla, Math.min(0.2, 0.07 * fuerza)); pantallaC = c; }
}

/** Avanza la simulación con el reloj del juego (se detiene en pausa y en el golpe congelado) y dibuja lo que va en el piso. */
export function energiaSuelo(ctx: CanvasRenderingContext2D, j: Juego, aP: (x: number, y: number) => [number, number]) {
  if ((window as any).__sinEnergia) return;
  if (j.zona.id !== zonaAnt) { zonaAnt = j.zona.id; chispas.length = anillos.length = flashes.length = motas.length = 0; estelas.clear(); vistos = new WeakSet(); tAnt = j.t; for (const e of j.efectos) vistos.add(e); }
  const dt = tAnt < 0 ? 0 : Math.max(0, Math.min(0.05, j.t - tAnt)); tAnt = j.t;
  const h = j.heroe;
  // ---- efectos nuevos: cada golpe de poder revienta
  for (const e of j.efectos as Efecto[]) {
    if (vistos.has(e)) continue; vistos.add(e);
    if (e.t > 0.25 || SIN_ESTALLIDO.test(e.id)) continue;
    const esc = Math.max(0.5, Math.min(2.4, e.escala ?? 1)), meta = LUZ_EFECTO[e.id] as any;
    estallar(e.x, e.y, e.z ?? 0, colorDe(e.id, meta?.elem), esc * (/meteoro|nova|explosion|estallido|gran_|trueno|castigo|pilar|onda/.test(e.id) ? 1.25 : 0.8));
    if (esc >= 1.5 && /meteoro|gran_|sol_negro|edad_hielo|furia|tempestad/.test(e.id)) j.sacudida = Math.max(j.sacudida, 0.35);
  }
  // ---- el héroe conjura: motas que acuden a las manos; al soltar, fogonazo y onda
  const hb = HAB.get(h.habActual), cast = !h.muerto && (h.acc === 'lanzar' || (h.acc === 'atacar' && !!hb && h.habActual !== 'ataque')) && !h.golpeo;
  const cHab = colorDe(h.habActual ?? '', (hb as any)?.elem);
  // las definitivas: mientras cargan el mundo se oscurece y tiembla; al soltarlas, un estallido de pantalla entera
  definitiva = cast && !!hb && /^Definitiva/.test((hb as any).desc?.[0] ?? '');
  oscuro += ((definitiva ? 0.42 : 0) - oscuro) * Math.min(1, dt * (definitiva ? 7 : 4));
  if (definitiva) j.sacudida = Math.max(j.sacudida, 0.08 + 0.12 * Math.min(1, h.t / Math.max(0.1, h.golpeEn)));
  if (cast) {
    if (definitiva) tMota -= dt * 1.5;
    tMota -= dt;
    while (tMota <= 0 && motas.length < 60) { tMota += E.tactil ? 0.035 : 0.02; motas.push({ ang: R() * Math.PI * 2, r: 1.1 + R() * 1.3, z: R() * 46, t: 0, d: Math.max(0.12, Math.min(0.5, h.golpeEn - h.t)), c: cHab, giro: (R() < 0.5 ? -1 : 1) * (3 + R() * 4) }); }
    if (!conjurando) anillos.push({ x: h.x, y: h.y, t: 0, d: Math.max(0.15, h.golpeEn), r0: 1.9, r1: 0.3, c: cHab, g: 1.6, a: 0.55 });
  } else if (conjurando && h.golpeo && (h.acc === 'lanzar' || h.acc === 'atacar')) {
    if (oscuro > 0.2) { pantalla = 0.34; pantallaC = cHab; j.sacudida = Math.max(j.sacudida, 0.55); (j as any).congela = Math.max((j as any).congela ?? 0, 0.07);
      for (const [r1, d, t0] of [[4.2, 0.6, 0], [6.5, 0.85, -0.08], [9, 1.1, -0.18]] as [number, number, number][]) anillos.push({ x: h.x, y: h.y, t: t0, d, r0: 0.4, r1, c: cHab, g: 3.2, a: 0.8 });
      flashes.push({ x: h.x, y: h.y, z: 40, t: 0, d: 0.45, r: 150, c: cHab, a: 1 }); estallar(h.x, h.y, 20, cHab, 2.2); }
    flashes.push({ x: h.x, y: h.y, z: 34, t: 0, d: 0.16, r: 34, c: cHab, a: 0.85 });
    anillos.push({ x: h.x, y: h.y, t: 0, d: 0.3, r0: 0.3, r1: 1.7, c: cHab, g: 2.2, a: 0.6 });
    for (let i = 0; i < (E.tactil ? 5 : 9); i++) { const a = R() * Math.PI * 2, v = 1.5 + R() * 2.5; chispas.push({ x: h.x, y: h.y, z: 30 + R() * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 40 + R() * 90, t: 0, d: 0.35 + R() * 0.3, c: cHab, s: 2, reb: 0 }); }
  }
  conjurando = cast;
  // ---- proyectiles: la cinta de luz y las brasas que sueltan
  for (const p of j.proyectiles as Proyectil[]) {
    if (p.arco) continue;
    let es = estelas.get(p); if (!es) { es = { p: [], c: colorDe(p.efecto, p.elem) }; estelas.set(p, es); }
    es.p.push([p.x, p.y, p.z ?? 20]); if (es.p.length > 9) es.p.shift();
    if (dt > 0 && R() < dt * (E.tactil ? 14 : 30) && chispas.length < 380) chispas.push({ x: p.x, y: p.y, z: (p.z ?? 20) + 4, vx: -p.vx * 0.08 + (R() - 0.5), vy: -p.vy * 0.08 + (R() - 0.5), vz: 10 + R() * 30, t: 0, d: 0.3 + R() * 0.35, c: es.c, s: 2, reb: 0 });
  }
  for (const p of estelas.keys()) if (!(j.proyectiles as Proyectil[]).includes(p)) estelas.delete(p);
  // ---- el que cae sale despedido hacia donde iba el golpe y se arrastra
  for (const m of j.monstruos as Monstruo[]) {
    const a = m as any;
    if (m.muerto && !a.emp && m.tMuerto < 0.08 && !m.dueno && !a.reventado && (m.escala ?? 1) < 1.6 && !m.def.jefe && !['frio', 'rayo', 'veneno'].includes(a.mElem)) { const dx = m.x - h.x, dy = m.y - h.y, l = Math.hypot(dx, dy) || 1, v = Math.min(6.5, 2.6 + 5 / Math.max(1, l)) * (a.ultCrit ? 1.5 : 1); a.emp = { vx: (dx / l) * v, vy: (dy / l) * v }; }
    if (a.emp && dt > 0) { const nx = m.x + a.emp.vx * dt, ny = m.y + a.emp.vy * dt; if (pasable(j.zona, nx, ny)) { m.x = nx; m.y = ny; } else a.emp.vx = a.emp.vy = 0; const f = Math.exp(-7.5 * dt); a.emp.vx *= f; a.emp.vy *= f; if (Math.hypot(a.emp.vx, a.emp.vy) < 0.15) a.emp = { vx: 0, vy: 0 }; }
  }
  // ---- la muerte por elemento: lo que suelta el cuerpo mientras se consume
  for (const m of j.monstruos as Monstruo[]) {
    const a = m as any, me = a.mElem as string | undefined; if (!m.muerto || !me || m.tMuerto > 3.2 || dt <= 0) continue;
    const tm = m.tMuerto, es = Math.max(0.7, m.escala ?? 1), alto = 42 * es, tope = E.tactil ? 240 : 440, k = E.tactil ? 0.5 : 1;
    const sale = (n: number, f: () => Chispa) => { for (let i = 0; i < n && chispas.length < tope; i++) chispas.push(f()); };
    const cerca = (r: number): [number, number] => [m.x + (R() - 0.5) * r * es, m.y + (R() - 0.5) * r * es];
    if (!a.mIni) { a.mIni = true;
      const c0 = COLOR_ELEM[me] ?? COLOR_ELEM.fisico; flashes.push({ x: m.x, y: m.y, z: alto * 0.5, t: 0, d: 0.3, r: 40 * es, c: c0, a: 0.9 }); anillos.push({ x: m.x, y: m.y, t: 0, d: 0.45, r0: 0.2, r1: 1.6 * es, c: c0, g: 2.4, a: 0.7 });
      if (me === 'luz') flashes.push({ x: m.x, y: m.y, z: alto * 1.4, t: 0, d: 0.6, r: 70 * es, c: c0, a: 0.8 });
      if (me === 'sangre') sale(16, () => { const an = R() * 6.28, v = 2 + R() * 4; return { x: m.x, y: m.y, z: alto * 0.5, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vz: 60 + R() * 140, t: 0, d: 0.6 + R() * 0.5, c: [200, 10, 10], s: 3, reb: 0 }; }); }
    if (me === 'fuego' && tm < 2.6) { if (R() < dt * 26 * k) sale(1, () => { const [x, y] = cerca(0.7); return { x, y, z: R() * alto * 0.6, vx: (R() - 0.5) * 0.6, vy: (R() - 0.5) * 0.6, vz: 40 + R() * 70, t: 0, d: 0.6 + R() * 0.7, c: R() < 0.3 ? [255, 220, 120] : [255, 110, 30], s: 2, reb: 0, g: -30 }; });
      if (R() < dt * 7 && j.particulas.length < 800) { const [x, y] = cerca(0.5); j.particulas.push({ x, y, z: alto * 0.4, vx: 0, vy: 0, vz: 16, t: 0, dur: 1.4 + R(), color: '#1a1410', tam: 4 + R() * 4, tipo: 'humo', grav: -6 } as any); } }
    if (me === 'frio') { if (tm < 0.45 && R() < dt * 30 * k) sale(1, () => { const [x, y] = cerca(0.8); return { x, y, z: R() * alto, vx: 0, vy: 0, vz: -10, t: 0, d: 0.5, c: [200, 235, 255], s: 2, reb: 0, g: 40 }; });
      if (tm >= 0.45 && !a.mRoto) { a.mRoto = true; flashes.push({ x: m.x, y: m.y, z: alto * 0.5, t: 0, d: 0.22, r: 46 * es, c: [190, 230, 255], a: 1 }); anillos.push({ x: m.x, y: m.y, t: 0, d: 0.4, r0: 0.3, r1: 2 * es, c: [170, 220, 255], g: 2.6, a: 0.8 });
        sale(Math.round(22 * k * es), () => { const an = R() * 6.28, v = 2.2 + R() * 5; return { x: m.x, y: m.y, z: R() * alto, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vz: 50 + R() * 170, t: 0, d: 0.8 + R() * 0.7, c: R() < 0.5 ? [225, 245, 255] : [130, 195, 255], s: R() < 0.4 ? 4 : 3, reb: 2 }; }); j.sacudida = Math.max(j.sacudida, 0.14); } }
    if (me === 'rayo' && tm < 0.62 && R() < dt * 60 * k) sale(1, () => { const an = R() * 6.28, v = 3 + R() * 5; return { x: m.x, y: m.y, z: R() * alto, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vz: 30 + R() * 120, t: 0, d: 0.2 + R() * 0.25, c: [200, 215, 255], s: 2, reb: 1 }; });
    if (me === 'rayo' && tm > 0.4 && tm < 2 && R() < dt * 6 && j.particulas.length < 800) j.particulas.push({ x: m.x, y: m.y, z: alto * 0.3, vx: 0, vy: 0, vz: 14, t: 0, dur: 1.2 + R(), color: '#3a3630', tam: 3 + R() * 4, tipo: 'humo', grav: -6 } as any);
    if (me === 'veneno' && tm < 2.4 && R() < dt * 18 * k) sale(1, () => { const [x, y] = cerca(1.1); return { x, y, z: 0, vx: 0, vy: 0, vz: 18 + R() * 30, t: 0, d: 0.5 + R() * 0.5, c: R() < 0.4 ? [190, 255, 120] : [90, 220, 60], s: R() < 0.3 ? 3 : 2, reb: 0, g: 20 }; });
    if (me === 'sombra' && tm < 1.6 && R() < dt * 22 * k && j.particulas.length < 800) { const [x, y] = cerca(0.8); j.particulas.push({ x, y, z: R() * alto, vx: (R() - 0.5) * 0.5, vy: (R() - 0.5) * 0.5, vz: 26 + R() * 30, t: 0, dur: 0.9 + R() * 0.8, color: R() < 0.5 ? '#150822' : '#3a1466', tam: 3 + R() * 5, tipo: 'humo', grav: -10 } as any); }
    if (me === 'sombra' && tm < 1.2 && R() < dt * 10 * k) sale(1, () => { const [x, y] = cerca(0.8); return { x, y, z: R() * alto, vx: 0, vy: 0, vz: 30 + R() * 40, t: 0, d: 0.5 + R() * 0.4, c: [170, 90, 255], s: 2, reb: 0, g: -20 }; });
    if (me === 'luz' && tm < 1.8 && R() < dt * 34 * k) sale(1, () => { const [x, y] = cerca(0.8); return { x, y, z: R() * alto, vx: (R() - 0.5) * 0.4, vy: (R() - 0.5) * 0.4, vz: 50 + R() * 70, t: 0, d: 0.7 + R() * 0.6, c: [255, 235, 170], s: R() < 0.3 ? 3 : 2, reb: 0, g: -40 }; });
  }
  // ---- avanzar
  for (let i = chispas.length - 1; i >= 0; i--) { const q = chispas[i]; q.t += dt; if (q.t > q.d) { chispas.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vz -= (q.g ?? 380) * dt; if (q.z < 0) { if (q.reb > 0) { q.z = 0; q.vz = -q.vz * 0.38; q.vx *= 0.6; q.vy *= 0.6; q.reb--; } else { q.z = 0; q.vz = 0; q.vx *= 0.8; q.vy *= 0.8; } } }
  for (let i = anillos.length - 1; i >= 0; i--) { const q = anillos[i]; q.t += dt; if (q.t > q.d) anillos.splice(i, 1); }
  for (let i = flashes.length - 1; i >= 0; i--) { const q = flashes[i]; q.t += dt; if (q.t > q.d) flashes.splice(i, 1); }
  for (let i = motas.length - 1; i >= 0; i--) { const q = motas[i]; q.t += dt; if (q.t > q.d || !cast) motas.splice(i, 1); }
  pantalla = Math.max(0, pantalla - dt * 0.9);
  ((window as any).__energia ??= {}).chispas = chispas.length; (window as any).__energia.anillos = anillos.length; (window as any).__energia.estelas = estelas.size;
  // ---- en el piso: las ondas de choque
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const q of anillos) {
    if (q.t < 0) continue;
    const u = q.t / q.d, r = (q.r0 + (q.r1 - q.r0) * (1 - (1 - u) ** 2.2)) * 22.6, [px, py] = aP(q.x, q.y), a = q.a * (q.r1 > q.r0 ? (1 - u) ** 1.3 : Math.min(1, u * 2.5));
    ctx.strokeStyle = `rgba(${q.c[0]},${q.c[1]},${q.c[2]},${a})`; ctx.lineWidth = q.g * (q.r1 > q.r0 ? 1 - u * 0.6 : 0.6 + u); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.5})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py, r * 0.96, r * 0.48, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Lo que va en el aire, sumado como luz: estelas, destellos, chispas, las motas del conjuro y el resplandor de pantalla. */
export function energiaAire(ctx: CanvasRenderingContext2D, j: Juego, aP: (x: number, y: number) => [number, number], W: number, H: number) {
  if ((window as any).__sinEnergia) return;
  const h = j.heroe;
  if (oscuro > 0.01) { const [ox, oy] = aP(h.x, h.y), g = ctx.createRadialGradient(ox, oy - 30, 40, ox, oy - 30, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${oscuro * 1.6})`); ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(0,0,6,${oscuro * 0.45})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const es of estelas.values()) {
    const n = es.p.length; if (n < 2) continue;
    for (let i = 1; i < n; i++) { const [ax, ay] = aP(es.p[i - 1][0], es.p[i - 1][1]), [bx, by] = aP(es.p[i][0], es.p[i][1]), k = i / n; ctx.strokeStyle = `rgba(${es.c[0]},${es.c[1]},${es.c[2]},${0.5 * k})`; ctx.lineWidth = 1 + 5 * k; ctx.beginPath(); ctx.moveTo(ax, ay - es.p[i - 1][2]); ctx.lineTo(bx, by - es.p[i][2]); ctx.stroke(); }
    const u = es.p[n - 1], [ux, uy] = aP(u[0], u[1]); ctx.globalAlpha = 0.55; ctx.drawImage(luzSpr(es.c), ux - 22, uy - u[2] - 22, 44, 44); ctx.globalAlpha = 1;
  }
  for (const q of flashes) { const u = q.t / q.d, [px, py] = aP(q.x, q.y), r = q.r * (0.6 + 0.7 * u); ctx.globalAlpha = q.a * (1 - u) ** 1.5; ctx.drawImage(luzSpr(q.c), px - r, py - q.z - r, r * 2, r * 2); }
  ctx.globalAlpha = 1;
  for (const q of chispas) {
    const [px, py0] = aP(q.x, q.y), py = py0 - q.z, a = Math.min(1, (1 - q.t / q.d) * 1.6);
    if (q.px !== undefined) { ctx.strokeStyle = `rgba(${q.c[0]},${q.c[1]},${q.c[2]},${a * 0.7})`; ctx.lineWidth = q.s * 0.7; ctx.beginPath(); ctx.moveTo(q.px, q.py!); ctx.lineTo(px, py); ctx.stroke(); }
    ctx.fillStyle = `rgba(${Math.min(255, q.c[0] + 90)},${Math.min(255, q.c[1] + 90)},${Math.min(255, q.c[2] + 90)},${a})`; ctx.fillRect(Math.round(px - q.s / 2), Math.round(py - q.s / 2), q.s, q.s);
    q.px = px; q.py = py;
  }
  // el rayo que mata: arcos que saltan del cuerpo al piso mientras se sacude (cambian cada cuadro)
  for (const m of j.monstruos as Monstruo[]) {
    if (!m.muerto || (m as any).mElem !== 'rayo' || m.tMuerto > 0.58) continue;
    const es = Math.max(0.7, m.escala ?? 1), [mx, my] = aP(m.x, m.y);
    for (let n = 0; n < 3; n++) { const an = R() * 6.28, d = (14 + R() * 26) * es, x1 = mx + Math.cos(an) * d, y1 = my + Math.sin(an) * d * 0.5, x0 = mx + (R() - 0.5) * 8, y0 = my - (10 + R() * 30) * es;
      ctx.beginPath(); ctx.moveTo(x0, y0); for (let q = 1; q <= 4; q++) { const u = q / 4; ctx.lineTo(x0 + (x1 - x0) * u + (q < 4 ? (R() - 0.5) * 10 : 0), y0 + (y1 - y0) * u + (q < 4 ? (R() - 0.5) * 10 : 0)); }
      ctx.strokeStyle = 'rgba(120,160,255,0.5)'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.2; ctx.stroke(); }
  }
  // las motas del conjuro: giran y caen hacia las manos
  const [hx, hy] = aP(h.x, h.y);
  for (const q of motas) { const u = q.t / q.d, r = q.r * (1 - u) ** 1.4 * 22.6, a = q.ang + q.giro * u, x = hx + Math.cos(a) * r, y = hy + Math.sin(a) * r * 0.5 - (q.z + (32 - q.z) * u); ctx.fillStyle = `rgba(${Math.min(255, q.c[0] + 70)},${Math.min(255, q.c[1] + 70)},${Math.min(255, q.c[2] + 70)},${Math.min(1, u * 3)})`; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); if (u > 0.5) { ctx.globalAlpha = (u - 0.5) * 0.5; ctx.drawImage(luzSpr(q.c), x - 6, y - 6, 12, 12); ctx.globalAlpha = 1; } }
  if (pantalla > 0.004) { ctx.fillStyle = `rgba(${pantallaC[0]},${pantallaC[1]},${pantallaC[2]},${pantalla})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
