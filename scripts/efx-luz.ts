// Escena de control de la luz de los efectos, con la cuenta del juego (juego/src/render/luces.ts y escena.ts):
// el piso, el héroe y el efecto se pintan enteros; encima va la oscuridad de la mazmorra (negro con alfa `oscuro`) a la
// que cada luz le abre un hueco (degradado SPR_HUECO de radio r, alfa min(1, 0.55 + 0.45 k), centrado h * 0.45 px
// arriba, hasta 40) y después se suma el tinte de color (degradado de radio 0.85 r, alfa min(0.5, 0.18 + 0.28 k)) y el
// destello de pantalla de las de prioridad 0. El héroe lleva su antorcha (blanca: hueco sin tinte).
// Cada efecto va en su cuadro de más luz, con la luz a esa altura de la curva. Arriba, la escala de referencia: la
// antorcha sola, fuegos de Doom del mundo (vela, antorcha, fogata) y poderes de siempre.
// Uso: npx tsx scripts/efx-luz.ts salida.png
// Variables: IDS (ids fx_ separados por coma), CAT (categoría), LUZ (json de luz de pixelfx a usar en vez del de datos/,
//            para comparar antes y después), OSCURO (0.93), POR (efectos por fila, 6), TITULO
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lienzo, texto, pegar, rect, piso, HEROE, type Celda, type Img } from './efx-comun.ts';

const { EFECTOS_PFX, armarCuadroPfx, pngsEfectoPfx, olvidarEfectosPfx, efectoPfx } = await import('../src/engine/gotico/efectos_pfx.ts');
const { PODERES, pintarPoder } = await import('../src/engine/gotico/poderes.ts');
const { LUZ_EFECTO } = await import('../src/engine/gotico/luz_efectos.ts');
const { decodePng, encodePng } = await import('../src/engine/export/png.ts');

const salida = process.argv[2] ?? 'luz_efx.png';
const filtro = process.env.IDS?.split(',');
const cat = process.env.CAT;
const OSCURO = +(process.env.OSCURO ?? 0.93);
const POR = +(process.env.POR ?? 6);
const rutaLuz = process.env.LUZ ?? fileURLToPath(new URL('../src/engine/gotico/datos/luz_efectos_pfx.json', import.meta.url));
const LUZ_PFX = JSON.parse(readFileSync(rutaLuz, 'utf8')).efectos as Record<string, { color: string; radio: number; intensidad: number; curva: number[]; altura: number; prioridad?: number }>;

interface Luz { x: number; y: number; h: number; r: number; c: [number, number, number]; k: number; blanca?: boolean; prio?: number }
const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** SPR_HUECO del juego: degradado radial de 0.15 r (alfa 1) a 0.6 (0.55) y a r (0). */
function hueco(u: number): number {
  if (u >= 1) return 0;
  const t = (u - 0.15) / 0.85;
  if (t <= 0) return 1;
  return t < 0.6 ? 1 - (0.45 * t) / 0.6 : 0.55 * (1 - (t - 0.6) / 0.4);
}
/** Arma la escena: `base` es el piso con todo pintado; devuelve lo que se ve con la oscuridad, los huecos y los tintes. */
function iluminar(base: Img, luces: Luz[], x0: number, y0: number, w: number, h: number): void {
  // destello de pantalla: la de prioridad 0 más fuerte
  let fl = 0, flc: [number, number, number] = [255, 200, 140];
  for (const l of luces) if (l.prio === 0 && l.k * 1 > fl) { fl = l.k; flc = l.c; }
  const oscuro = OSCURO * (1 - fl * 0.5);
  for (let py = y0; py < y0 + h; py++)
    for (let px = x0; px < x0 + w; px++) {
      let D = oscuro, tr = 0, tg = 0, tb = 0, ta = 0;
      for (const l of luces) {
        const cy = l.y - Math.min(40, l.h * 0.45), u = Math.hypot(px + 0.5 - l.x, py + 0.5 - cy) / l.r;
        D *= 1 - (l.blanca ? 1 : Math.min(1, 0.55 + l.k * 0.45)) * hueco(u);
        if (l.blanca) continue;
        const ut = Math.hypot(px + 0.5 - l.x, py + 0.5 - (l.y - Math.min(30, l.h * 0.3))) / (l.r * 0.85);
        if (ut >= 1) continue;
        // el tinte se pinta con source-over en su propio lienzo
        const a = Math.min(0.5, 0.18 + l.k * 0.28) * (1 - ut);
        tr = l.c[0] * a + tr * (1 - a); tg = l.c[1] * a + tg * (1 - a); tb = l.c[2] * a + tb * (1 - a); ta = a + ta * (1 - a);
      }
      const i = (py * base.w + px) * 4;
      for (let c = 0; c < 3; c++) {
        let v = base.data[i + c] * (1 - D) + [tr, tg, tb][c];
        if (fl > 0.02) v += flc[c] * fl * 0.16;
        base.data[i + c] = Math.min(255, v);
      }
    }
}

interface Caso { etiqueta: string; celda?: Celda; aditiva: boolean; enPiso: boolean; luz?: Luz; nota: string }
const casos: Caso[] = [];
// la escala de referencia
const ref = (etiqueta: string, nota: string, l?: Omit<Luz, 'x' | 'y'>, celda?: Celda, aditiva = true): Caso => ({ etiqueta, nota, celda, aditiva, enPiso: false, luz: l ? { ...l, x: 0, y: 0 } : undefined });
casos.push(ref('solo la antorcha', 'heroe r246 k1'));
casos.push(ref('vela (doom)', 'r121 k0.7', { h: 20, r: 121, c: rgb('#ffb25a'), k: 0.7 }));
casos.push(ref('antorcha (doom)', 'r177 k0.9', { h: 40, r: 177, c: rgb('#ff6a24'), k: 0.9 }));
casos.push(ref('fogata (doom)', 'r218 k0.9', { h: 20, r: 218, c: rgb('#ff6a24'), k: 0.9 }));
for (const id of ['chispas_metal', 'impacto_hueso', 'explosion_fuego']) {
  const p = PODERES.find((x) => x.id === id)!, l = LUZ_EFECTO[id];
  let fk = 0; l.curva.forEach((v, i) => { if (v > l.curva[fk]) fk = i; });
  const c = pintarPoder(id, 0, fk);
  casos.push(ref(id, `poder r${l.radio} k${l.intensidad}`, { h: l.altura, r: l.radio, c: rgb(l.color), k: l.intensidad * l.curva[fk], prio: l.prioridad }, c, l.mezcla !== 'normal'));
  void p;
}
const lista = EFECTOS_PFX.filter((c) => (!filtro || filtro.includes(c.id)) && (!cat || c.categoria === cat) && c.capa !== 'pantalla');
for (const c of lista) {
  const e = efectoPfx(c.id), L = LUZ_PFX[c.id], pags = pngsEfectoPfx(c.id).map((b) => decodePng(b));
  let fk = 0; L.curva.forEach((v, i) => { if (v > L.curva[fk]) fk = i; });
  const celda = armarCuadroPfx(c.id, e.direccional ? 6 : 0, fk, pags);
  casos.push({
    etiqueta: c.id.slice(3), nota: `${c.categoria} r${L.radio} k${L.intensidad}`, celda, aditiva: e.mezcla === 'aditiva', enPiso: e.capa === 'piso',
    luz: L.intensidad > 0 && L.radio > 0 ? { x: 0, y: 0, h: L.altura, r: L.radio, c: rgb(L.color), k: L.intensidad * L.curva[fk], prio: L.prioridad } : undefined,
  });
  olvidarEfectosPfx(c.id);
}

// cuadros de 420 x 300: el héroe a la izquierda (a 110 px del ancla, a la distancia de un golpe a media distancia)
const CW = 420, CH = 300, ETQ = 14, TIT = process.env.TITULO ? 22 : 0;
const filas = Math.ceil(casos.length / POR), W = CW * POR, H = TIT + filas * (CH + ETQ);
const img = lienzo(W, H);
rect(img, 0, 0, W, H, [4, 4, 5, 255]);
if (TIT) texto(img, process.env.TITULO!, 6, 4, [240, 220, 160], 3);
casos.forEach((cs, i) => {
  const X = (i % POR) * CW, Y = TIT + Math.floor(i / POR) * (CH + ETQ) + ETQ;
  texto(img, `${cs.etiqueta} ${cs.nota}`, X + 4, Y - ETQ + 3, [214, 200, 170], 1);
  const sub = lienzo(CW - 4, CH);
  piso(sub, 0, 0, sub.w, sub.h, 1);
  const ax = 250, ay = 210, hx = ax - 110;
  if (cs.celda && cs.enPiso) pegar(sub, cs.celda.img, ax - cs.celda.ancla[0], ay - cs.celda.ancla[1], cs.aditiva);
  pegar(sub, HEROE.img, hx - HEROE.ancla[0], ay - HEROE.ancla[1]);
  if (cs.celda && !cs.enPiso) pegar(sub, cs.celda.img, ax - cs.celda.ancla[0], ay - cs.celda.ancla[1], cs.aditiva);
  const luces: Luz[] = [{ x: hx, y: ay, h: 55, r: 246, c: [255, 210, 150], k: 1, blanca: true }];
  if (cs.luz) luces.push({ ...cs.luz, x: ax, y: ay });
  iluminar(sub, luces, 0, 0, sub.w, sub.h);
  pegar(img, sub, X, Y);
});
writeFileSync(salida, encodePng(img));
console.log('escena de luz', salida, `${W}x${H}`, casos.length, 'casos');
