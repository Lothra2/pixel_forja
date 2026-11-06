// pixelfx en el mundo: el clima de cada zona (capa pantalla) y lo que vive en ella (murciélagos, fuegos fatuos, goteras,
// burbujas, medusas...), sembrado en lugares fijos por zona. Se carga solo lo de la zona en la que estás.
import { todosPfx, dibujarPfx, efectoPfx, precargarPfx, pfxListo } from './pfx';
import { E } from '../nucleo/lienzo';
import { pasable } from '../mundo/zona';
import type { Juego } from '../juego/mundo';
import { usosPfx } from '../juego/pfx_usos';

const QUITAR_AMBIENTE = new Set(['fx_columna_regreso', 'fx_portal', 'fx_curacion', 'fx_explosion_barril', 'fx_dormido', 'fx_roca', 'fx_caida_carambano', 'fx_flor_curativa', 'fx_esporas', 'fx_manos_que_agarran', 'fx_tentaculos_sombra', 'fx_grieta_invocacion', 'fx_arco_chispas', 'fx_fuente', 'fx_sol_radiante', 'fx_fragmento_reliquia']);
// del clima a pantalla: uno o dos por zona, los de más peso primero (cada uno son 5 a 7 Mpx)
// sin cielo en el juego: nada de franjas de nubes ni auroras (la tormenta trae su franja de nubes; queda la lluvia)
// la niebla y los rayos de luz son formas grandes que no se repiten bien en mosaico: queda la niebla de siempre
const SIN_PANTALLA = new Set(['fx_aurora', 'fx_nubes', 'fx_tormenta', 'fx_niebla', 'fx_rayos_luz']);
// alfa tope de cada clima a pantalla: que nunca tape al héroe ni a los monstruos
const ALFA: Record<string, number> = { fx_lluvia: 0.45, fx_nieve: 0.5, fx_ventisca: 0.45, fx_niebla: 0.35, fx_hojas_caen: 0.35, fx_luciernagas: 0.5, fx_rayos_luz: 0.35 };
const ORDEN_CLIMA = ['fx_tormenta', 'fx_ventisca', 'fx_lluvia', 'fx_nieve', 'fx_niebla', 'fx_hojas_caen', 'fx_luciernagas', 'fx_rayos_luz', 'fx_nubes'];
const EXCLUYE: Record<string, string> = { fx_lluvia: 'fx_tormenta', fx_nieve: 'fx_ventisca' };

interface Planta { id: string; x: number; y: number; fase: number }
let zonaId = '', clima: string[] = [], plantas: Planta[] = [], pantallaTodo: string[] = [];
export const climaPfx = { activo: [] as string[] };

function armar(j: Juego) {
  const z = j.zona; zonaId = z.id + ':' + z.semilla;
  const es = todosPfx();
  const cl = es.filter((e) => e.capa === 'pantalla' && !SIN_PANTALLA.has(e.id) && e.uso?.some((u) => u.tipo === 'clima' && (u.zonas ? u.zonas.includes(z.id) : u.actos?.includes(z.acto) && z.tipo === 'exterior'))).map((e) => e.id);
  const orden = cl.sort((a, b) => ORDEN_CLIMA.indexOf(a) - ORDEN_CLIMA.indexOf(b)).filter((id) => !(EXCLUYE[id] && cl.includes(EXCLUYE[id])));
  clima = orden.slice(0, E.tactil ? 1 : 2);
  pantallaTodo = cl;
  climaPfx.activo = clima;
  // lo que vive en la zona: lugares fijos (semilla de la zona) en celdas libres
  const amb = es.filter((e) => e.capa !== 'pantalla' && e.bucle && !QUITAR_AMBIENTE.has(e.id) && e.uso?.some((u) => u.tipo === 'ambiente' && u.zonas?.includes(z.id))).map((e) => e.id);
  plantas = [];
  let s = (z.semilla * 9301 + 49297) % 233280;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const n = Math.min(60, Math.round((z.W * z.H) / 900));
  for (let i = 0; i < n && amb.length; i++) {
    for (let k = 0; k < 12; k++) {
      const x = 2 + r() * (z.W - 4), y = 2 + r() * (z.H - 4);
      if (!pasable(z, x, y)) continue;
      plantas.push({ id: amb[i % amb.length], x, y, fase: r() * 10 });
      break;
    }
  }
  precargarPfx([...clima, ...amb]);
}

/** Lo que vive en la zona, en el mundo (antes de la luz: se oscurece con la noche). Como mucho 6 en táctil y 12 en escritorio. */
export function dibujarAmbiente(ctx: CanvasRenderingContext2D, j: Juego, aPant: (x: number, y: number) => [number, number], W: number, H: number, t: number) {
  if (!pfxListo()) return;
  if (zonaId !== j.zona.id + ':' + j.zona.semilla) armar(j);
  let n = 0; const tope = E.tactil ? 6 : 12;
  for (const p of plantas) {
    const [px, py] = aPant(p.x, p.y);
    if (px < -80 || px > W + 80 || py < -60 || py > H + 160) continue;
    if (++n > tope) break;
    dibujarPfx(ctx, p.id, t + p.fase, px, py);
  }
}

/** El clima de la zona encima de todo (después de la luz). Devuelve qué tipo de clima ya dibuja, para no repetirlo. */
export function dibujarClimaPfx(ctx: CanvasRenderingContext2D, j: Juego, W: number, H: number, t: number): { lluvia: boolean; nieve: boolean; niebla: boolean } {
  const r = { lluvia: false, nieve: false, niebla: false };
  if (!pfxListo()) return r;
  if (zonaId !== j.zona.id + ':' + j.zona.semilla) armar(j);
  for (const id of clima) {
    const e = efectoPfx(id); if (!e) continue;
    // en mosaico a escala 2, cada tesela con su propio tiempo para que no se note la repetición
    const tw = 640, th = 360, alfa = ALFA[id] ?? 0.4;
    let dibujo = false;
    for (let ty = 0, fy = 0; ty < H; ty += th, fy++) for (let tx = 0, fx = 0; tx < W; tx += tw, fx++) {
      const fase = id === 'fx_niebla' || id === 'fx_rayos_luz' ? 0 : (fx * 7 + fy * 3) * 0.37;
      if (dibujarPfx(ctx, id, t + fase, tx, ty, { tesela: true, alfa })) dibujo = true;
    }
    if (dibujo) {
      if (id === 'fx_lluvia') r.lluvia = true;
      if (id === 'fx_nieve' || id === 'fx_ventisca') r.nieve = true;
      if (id === 'fx_niebla') r.niebla = true;
    }
  }
  // transiciones pedidas por el juego (una pasada cada una)
  const ahora = performance.now() / 1000;
  usosPfx.pantalla = usosPfx.pantalla.filter((q) => { const e = efectoPfx(q.id); if (!e) return ahora - q.t0 < 2; return dibujarPfx(ctx, q.id, ahora - q.t0, 0, 0, { W, H }); });
  return r;
}
(window as any).__climaPfx = () => ({ clima, todos: pantallaTodo, plantas: plantas.length });
