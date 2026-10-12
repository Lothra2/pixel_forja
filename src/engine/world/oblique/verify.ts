import { boxesOf, collisionOf, depthOf, holeAt, GEOMETRIA, type ObliqueLayout } from './layout';
import { NOMBRES } from './paleta';
import { TROZO, postal, trozo, type Escena } from './escena';
import type { Raster } from '../../core/raster';

/**
 * Las 9 pruebas del pedido (10.4). Todas bloquean: si una falla, el escenario no sale.
 * Cada una dice qué midió, así `verificacion.md` sirve para entender el resultado sin abrir el código.
 */

export interface Prueba { n: number; nombre: string; ok: boolean; detalle: string }

/** Límites de peso por pantalla de 640 x 360. */
export const PESO = { capas: 8, luces: 12, vidaAnimada: 16, objetos: 24 };
/** Contorno de los atletas del kit: el color contra el que se mide la legibilidad. */
export const CONTORNO = '#1e1418';
/** Las reglas de movimiento con que el juego diseñó el layout. */
export interface Reglas { salto: number; escalon: number; saltoLargo: number }
export const REGLAS: Reglas = { salto: 36, escalon: 6, saltoLargo: 84 };

const hex = (r: Raster, i: number) => '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('');
const lum = (h: string) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/** Contraste WCAG entre dos colores. */
export const contraste = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** Diferencia entre dos columnas: filas donde el pixel cambia. */
function difCol(r: Raster, a: number, b: number) {
  let n = 0;
  for (let y = 0; y < r.h; y++) {
    const i = (y * r.w + a) * 4, j = (y * r.w + b) * 4;
    if (r.data[i + 3] !== r.data[j + 3] || (r.data[i + 3] && (r.data[i] !== r.data[j] || r.data[i + 1] !== r.data[j + 1] || r.data[i + 2] !== r.data[j + 2]))) n++;
  }
  return n;
}

/** Altura donde se para un atleta en (x, y): la caja más alta, 0 en el piso, null en un hueco. */
export function alturaEn(L: ObliqueLayout, x: number, y: number): number | null {
  let h = holeAt(L, x, y) ? null : 0;
  for (const b of boxesOf(L)) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d) h = Math.max(h ?? 0, b.z);
  return h;
}

/**
 * ¿Se llega de la salida a la meta? Búsqueda en una grilla de 4 x 2 px: se camina si el escalón es de hasta `escalon`,
 * se salta si sube hasta `salto`, se baja de cualquier altura y se cruzan huecos de un salto de hasta `saltoLargo`.
 */
export function camino(L: ObliqueLayout, r: Reglas = REGLAS): { ok: boolean; detalle: string } {
  const D = depthOf(L), SX = 4, SY = 2;
  const salida = (L.entidades.find((e) => e.tipo === 'salida')?.x as number | undefined) ?? 0;
  const meta = (L.entidades.find((e) => e.tipo === 'meta')?.x as number | undefined) ?? L.largo - 1;
  const NX = Math.ceil(L.largo / SX), NY = Math.ceil(D / SY);
  const H: (number | null)[] = new Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) H[j * NX + i] = alturaEn(L, i * SX + 1, j * SY + 1);
  const seen = new Uint8Array(NX * NY), q: number[] = [];
  const i0 = Math.floor(salida / SX);
  for (let j = 0; j < NY; j++) if (H[j * NX + i0] !== null) { seen[j * NX + i0] = 1; q.push(j * NX + i0); }
  const iMeta = Math.floor(meta / SX);
  let mejor = salida;
  while (q.length) {
    const c = q.shift()!, i = c % NX, j = (c - i) / NX, h = H[c]!;
    mejor = Math.max(mejor, i * SX);
    if (i >= iMeta) return { ok: true, detalle: `se llega a la meta (x ${meta}) desde la salida (x ${salida})` };
    const ir = (ni: number, nj: number) => {
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) return;
      const k = nj * NX + ni, nh = H[k];
      if (seen[k] || nh === null || nh - h > r.salto) return;
      seen[k] = 1; q.push(k);
    };
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ir(i + di, j + dj);
    // salto largo sobre huecos: todo lo de abajo del arco tiene que quedar a menos de `salto`
    for (const dir of [1, -1]) for (let s = 2; s * SX <= r.saltoLargo; s++) {
      const mid = H[j * NX + i + dir * (s - 1)];
      if (i + dir * (s - 1) < 0 || i + dir * (s - 1) >= NX) break;
      if (mid !== null && mid - h > r.salto) break;
      if (mid !== null) continue; // sobre piso firme ya llegó caminando
      ir(i + dir * s, j);
    }
  }
  return { ok: false, detalle: `no se llega: lo más lejos es x ${mejor}, la meta está en x ${meta}` };
}

/** Las 9 pruebas. `contornos`: colores de contorno de los atletas por equipo (por defecto, el del kit). */
export function verificar(E: Escena, raw: unknown, contornos: string[] = [CONTORNO]): Prueba[] {
  const L = E.layout, D = depthOf(L), FT = L.franja.atras, out: Prueba[] = [];
  const add = (n: number, nombre: string, ok: boolean, detalle: string) => out.push({ n, nombre, ok, detalle });

  // 1. Costuras
  let malas = 0, cortes = 0;
  for (const capa of [E.cerca, E.piso, E.frente, ...(E.pisoMojado ? [E.pisoMojado] : [])])
    for (let x0 = 0; x0 < capa.w; x0 += TROZO) {
      const t = trozo(capa, x0); cortes++;
      for (let y = 0; y < capa.h; y++) for (const x of [0, t.w - 1]) {
        const a = (y * t.w + x) * 4, b = (y * capa.w + x0 + x) * 4;
        for (let k = 0; k < 4; k++) if (t.data[a + k] !== capa.r.data[b + k]) { malas++; break; }
      }
    }
  add(1, 'Costuras', malas === 0, `${cortes} trozos de ${TROZO} px revisados en sus bordes: ${malas} pixeles distintos`);

  // 2. Paralaje: el corte de la vuelta no se nota más que un paso normal entre columnas
  const ciclo = (r: Raster) => {
    const pasos = Array.from({ length: r.w - 1 }, (_, x) => difCol(r, x, x + 1)).sort((a, b) => a - b);
    const tipico = pasos[Math.floor(pasos.length * 0.9)];
    return { vuelta: difCol(r, r.w - 1, 0), tipico };
  };
  const cc = ciclo(E.cielo.r), cl = ciclo(E.lejos.r);
  const okP = cc.vuelta <= cc.tipico + 2 && cl.vuelta <= cl.tipico + 2;
  add(2, 'Paralaje', okP, `cielo: la vuelta cambia ${cc.vuelta} filas (un paso normal, hasta ${cc.tipico}). Lejos: ${cl.vuelta} (hasta ${cl.tipico})`);

  // 3. Piso
  let vacios = 0;
  for (let y = 0; y < D; y++) for (let x = 0; x < L.largo; x++) if (E.piso.r.data[(y * E.piso.w + x) * 4 + 3] === 0) vacios++;
  add(3, 'Piso', vacios === 0, `${L.largo} x ${D} px de franja: ${vacios} transparentes`);

  // 4. Apoyo
  const flotan: string[] = [];
  for (const b of boxesOf(L)) {
    let enHueco = 0;
    for (let y = b.y; y < b.y + b.d; y += 2) for (let x = b.x; x < b.x + b.w; x += 2) if (holeAt(L, x, y)) enHueco++;
    if (enHueco) flotan.push(`${b.tipo ?? b.lista} en x ${b.x}`);
  }
  for (const e of L.entidades) if (typeof e.x === 'number' && typeof e.y === 'number' && holeAt(L, e.x, e.y)) flotan.push(`${String(e.objeto ?? e.tipo)} en x ${e.x}`);
  for (const p of L.postes) if (holeAt(L, p.x, p.y)) flotan.push(`poste en x ${p.x}`);
  add(4, 'Apoyo', flotan.length === 0, flotan.length ? `sobre un hueco: ${flotan.join(', ')}` : `${boxesOf(L).length} cajas, ${L.postes.length} postes y ${L.entidades.filter((e) => typeof e.y === 'number').length} objetos del layout, todos sobre piso o plataforma`);

  // 5. Colisión
  const col = collisionOf(L) as Record<string, unknown>, R0 = raw as Record<string, unknown>;
  const distintas = GEOMETRIA.filter((k) => JSON.stringify(col[k] ?? []) !== JSON.stringify(R0[k] ?? []));
  add(5, 'Colisión', distintas.length === 0, distintas.length ? `distinto del layout en: ${distintas.join(', ')}` : `colision.json es igual al layout en ${GEOMETRIA.length} listas`);

  // 6. Camino
  const cm = camino(L);
  add(6, 'Camino', cm.ok, `${cm.detalle}, con salto de ${REGLAS.salto}, escalón de ${REGLAS.escalon} y salto largo de ${REGLAS.saltoLargo}`);

  // 7. Legibilidad: una silueta de atleta cada 64 px en cada carril, contra la escena armada
  const vista = postal(E, 0, [], L.largo, 360);
  const ys = L.carriles.length ? L.carriles.map((c) => c.y) : [Math.floor(D / 2)];
  let peor = Infinity, suma = 0, n = 0, donde = '';
  for (const c of contornos) for (const y of ys) for (let x = 24; x < L.largo - 24; x += 64) {
    if (holeAt(L, x, y)) continue;
    // anillo alrededor de una silueta de 18 x 44 parada en (x, y)
    const pies = FT + y, vals: number[] = [];
    for (let dy = -45; dy <= 0; dy += 3) for (const dx of [-10, 10]) {
      const px = x + dx, py = pies + dy;
      if (px < 0 || py < 0 || px >= vista.w || py >= vista.h) continue;
      vals.push(contraste(c, hex(vista, (py * vista.w + px) * 4)));
    }
    vals.sort((a, b) => a - b);
    const med = vals[Math.floor(vals.length / 2)];
    suma += med; n++;
    if (med < peor) { peor = med; donde = `x ${x}, y ${y}`; }
  }
  const okL = peor >= 2;
  add(7, 'Legibilidad', okL, `${n} siluetas (cada 64 px, ${ys.length} carriles, ${contornos.length} contorno${contornos.length > 1 ? 's' : ''}): contraste mediano ${(suma / n).toFixed(1)}:1, el peor ${peor.toFixed(1)}:1 en ${donde} (mínimo 2:1)`);

  // 8. Paleta
  const pal = new Set(NOMBRES.map((k) => E.paleta[k].toLowerCase())), usados = new Set<string>(), fueraP = new Set<string>();
  for (const r of [E.cielo.r, E.lejos.r, E.cerca.r, E.piso.r, E.frente.r, ...(E.pisoMojado ? [E.pisoMojado.r] : []), ...E.objetos.map((o) => o.img.r), ...E.vida.flatMap((v) => v.cuadros.map((c) => c.r))])
    for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3]) { const h = hex(r, i); usados.add(h); if (!pal.has(h)) fueraP.add(h); }
  add(8, 'Paleta', fueraP.size === 0, `${usados.size} colores usados de los 24 de la ficha${fueraP.size ? `. Fuera: ${[...fueraP].slice(0, 5).join(', ')}` : ''}`);

  // 9. Peso, en la pantalla más cargada
  const capas = 5 + (E.pisoMojado ? 1 : 0) + 1;
  let maxL = 0, maxV = 0, maxO = 0;
  for (let x = 0; x <= L.largo - 640; x += 32) {
    maxL = Math.max(maxL, E.luces.filter((l) => l.encendida && l.x >= x && l.x < x + 640).length);
    maxV = Math.max(maxV, E.vida.filter((v) => v.capa === 'cerca' && v.x < x + 640 && v.x + v.cuadros[0].w > x).length + E.vida.filter((v) => v.capa === 'tras_cerca').length);
    maxO = Math.max(maxO, E.objetos.filter((o) => o.x < x + 640 && o.x + o.img.w > x).length);
  }
  const okW = capas <= PESO.capas && maxL <= PESO.luces && maxV <= PESO.vidaAnimada && maxO <= PESO.objetos;
  add(9, 'Peso', okW, `en la pantalla más cargada: ${capas} capas (máx ${PESO.capas}), ${maxL} luces encendidas (máx ${PESO.luces}), ${maxV} piezas animadas (máx ${PESO.vidaAnimada}), ${maxO} objetos (máx ${PESO.objetos})`);
  return out;
}

/** El resultado en Markdown, para `verificacion.md`. */
export function verificacionMarkdown(id: string, ps: Prueba[]): string {
  const ok = ps.every((p) => p.ok);
  return [
    `# Verificación: ${id}`, '',
    ok ? 'Las 9 pruebas pasan.' : `Fallan ${ps.filter((p) => !p.ok).length} de 9: el escenario no sale hasta corregirlas.`, '',
    '| # | Prueba | Resultado | Qué se midió |', '|---|---|---|---|',
    ...ps.map((p) => `| ${p.n} | ${p.nombre} | ${p.ok ? 'pasa' : '**falla**'} | ${p.detalle} |`), '',
  ].join('\n');
}
