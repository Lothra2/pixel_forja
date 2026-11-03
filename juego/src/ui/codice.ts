// El Códice (J): lo que ya sabes de la historia. Notas y diarios leídos, pistas encontradas, el bestiario de jefes vistos,
// las decisiones que tomaste y las cinemáticas para volver a ver.
import { ctx, E } from '../nucleo/lienzo';
import { texto, T, TT, marco, titulo, boton, envolver, dentro } from './comun';
import { MISIONES, DIARIOS, PAGINAS, ZONAS } from '../mundo/actos';
import { MONSTRUOS } from '../datos/monstruos';
import { TEXTO_DECISION, NOMBRE_DECISION, EPILOGOS } from '../mundo/decisiones';
import { hist, decisionesDe, eleccionDe, finalCompleto, prog } from '../juego/historia';
import { cuadrosMonstruo, dibujar as dibujarCuadro } from '../motor/assets';
import type { Juego } from '../juego/mundo';
import type { DatosHeroe } from '../juego/heroe';

type Pestana = 'notas' | 'bestiario' | 'decisiones' | 'cine';
interface Entrada { titulo: string; sub: string; texto: string }
const est = { pestana: 'notas' as Pestana, sel: 0, desde: 0 };
export const codice = est;

/** Todo lo leído: diarios de cada acto, el diario del primer abad y las pistas de las misiones. */
function notas(d: DatosHeroe): Entrada[] {
  const h = hist(d), out: Entrada[] = [];
  for (const [a, di] of Object.entries(DIARIOS)) {
    const n = Math.min(di.paginas.length, h.diarios?.[+a] ?? 0);
    for (let i = 0; i < n; i++) out.push({ titulo: TT(di.titulo), sub: `${T('Acto', 'Act')} ${a} · ${i + 1}/${di.paginas.length}`, texto: TT(di.paginas[i]) });
  }
  for (let i = 0; i < Math.min(PAGINAS.length, h.paginas ?? 0); i++) out.push({ titulo: T('Diario del primer abad', 'Diary of the First Abbot'), sub: `${i + 1}/${PAGINAS.length}`, texto: TT(PAGINAS[i]) });
  const p = prog(d);
  for (const m of MISIONES) {
    const o = m.objetivo; if (o.tipo !== 'pistas') continue;
    const bits = (d.misiones[m.id] ?? 0) >= 2 ? (1 << o.pistas.length) - 1 : (p[m.id] ?? 0);
    o.pistas.forEach((pi, i) => { if (bits & (1 << i)) out.push({ titulo: TT(m.nombre), sub: TT(ZONAS[o.zona]?.nombre ?? ['', '']), texto: TT(pi.texto) }); });
  }
  return out;
}
/** Jefes vistos, con su título. */
function bestiario(d: DatosHeroe): Entrada[] {
  const vis: string[] = (d as any).jefesVistos ?? [];
  return vis.map((id) => MONSTRUOS[id]).filter(Boolean).map((m) => {
    const [nom, tit] = TT(m.nombre).split(/,\s*/);
    const zona = Object.values(ZONAS).find((z) => z.jefe === m.id);
    return { titulo: nom, sub: tit ?? '', texto: [zona ? `${T('Guarida', 'Lair')}: ${TT(zona.nombre)}.` : '', `${T('Vida', 'Life')} ${m.vida} · ${T('Daño', 'Damage')} ${m.dano[0]}-${m.dano[1]}`].filter(Boolean).join(' '), id: m.id } as Entrada & { id: string };
  });
}

/** Lista con scroll y la entrada elegida abajo. */
function lista(es: Entrada[], x: number, y: number, vacio: string, dibujarSel?: (e: Entrada, x: number, y: number) => void) {
  if (!es.length) { envolver(vacio, 270, 13).forEach((l, i) => texto(l, x + 25, y + 96 + i * 18, { tam: 13, color: '#8a7a60' })); return; }
  const filas = 7, top = y + 78;
  est.sel = Math.min(est.sel, es.length - 1);
  est.desde = Math.max(0, Math.min(est.desde, es.length - filas));
  if (dentro(x, top, 320, filas * 22) && E.rueda) { est.desde = Math.max(0, Math.min(es.length - filas, est.desde + Math.sign(E.rueda))); E.rueda = 0; }
  for (let i = 0; i < filas && est.desde + i < es.length; i++) {
    const k = est.desde + i, e = es[k], yy = top + i * 22;
    if (k === est.sel) { ctx.fillStyle = 'rgba(200,160,80,0.14)'; ctx.fillRect(x + 14, yy - 2, 270, 21); }
    if (dentro(x + 14, yy - 2, 270, 21) && E.clicIzq) { est.sel = k; E.clicIzq = false; }
    texto(e.titulo.length > 30 ? e.titulo.slice(0, 29) + '…' : e.titulo, x + 20, yy + 13, { tam: 12, color: k === est.sel ? '#ffd080' : '#d0c0a0' });
  }
  if (es.length > filas) {
    if (boton('▲', x + 288, top, 22, 22, { tam: 11, activo: est.desde > 0 })) { est.desde--; E.clicIzq = false; }
    if (boton('▼', x + 288, top + filas * 22 - 22, 22, 22, { tam: 11, activo: est.desde + filas < es.length })) { est.desde++; E.clicIzq = false; }
  }
  const e = es[est.sel], ty = top + filas * 22 + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 14, ty - 4, 292, 432 - (ty - y) - 12);
  texto(e.titulo, x + 22, ty + 12, { tam: 13, color: '#ffd080' });
  texto(e.sub, x + 22, ty + 27, { tam: 11, color: '#9a8460' });
  let tx = x + 22, tw = 270;
  if (dibujarSel) { dibujarSel(e, x + 250, ty + 120); tw = 200; }
  envolver(e.texto, tw, 12).slice(0, 9).forEach((l, i) => texto(l, tx, ty + 46 + i * 16, { tam: 12, color: '#d8c49a' }));
}

export function panelCodice(j: Juego, x: number, y: number) {
  const d = j.heroe.d;
  marco(x, y, 320, 432); titulo(T('Códice', 'Codex'), x, y, 320);
  const pes: [Pestana, string][] = [['notas', T('Notas', 'Notes')], ['bestiario', T('Jefes', 'Bosses')], ['decisiones', T('Decisiones', 'Choices')], ['cine', T('Cine', 'Films')]];
  pes.forEach(([id, s], i) => { if (boton(s, x + 14 + i * 74, y + 44, 70, 24, { tam: 12, color: est.pestana === id ? '#ffd080' : undefined })) { est.pestana = id; est.sel = 0; est.desde = 0; E.clicIzq = false; } });
  if (est.pestana === 'notas') return lista(notas(d), x, y, T('Todavía no leíste nada. Los libros malditos, los diarios y las pistas de las misiones quedan anotados aquí.', 'You have not read anything yet. Cursed books, diaries and quest clues are recorded here.'));
  if (est.pestana === 'bestiario') return lista(bestiario(d), x, y, T('Todavía no viste a ningún jefe cara a cara.', 'You have not yet seen any boss face to face.'), (e, cx, cy) => {
    const m = MONSTRUOS[(e as any).id]; if (!m) return;
    const fs = cuadrosMonstruo(m.sprite, 'quieto', 's'); const q = fs[Math.floor(performance.now() / 160) % Math.max(1, fs.length)];
    if (q) { const k = Math.min(1, 110 / Math.max(q.h, 1), 70 / Math.max(q.w, 1)); dibujarCuadro(ctx, q, cx, cy, k); }
  });
  if (est.pestana === 'decisiones') {
    const dec = decisionesDe(d) as Record<string, string>;
    let yy = y + 90;
    for (const k of ['vigdis', 'brasa', 'corona']) {
      texto(TT(NOMBRE_DECISION[k]), x + 20, yy, { tam: 13, color: '#ffd080' });
      const v = dec[k], t = v ? TT(TEXTO_DECISION[k][v]) : T('Todavía no decidiste.', 'You have not decided yet.');
      const ls = envolver(t, 270, 12); ls.forEach((l, i) => texto(l, x + 26, yy + 17 + i * 15, { tam: 12, color: v ? '#d8c49a' : '#7a6a50' }));
      yy += 26 + ls.length * 15;
    }
    if (dec.corona) { texto(`${T('Final', 'Ending')}: ${TT(EPILOGOS[finalCompleto(d)].titulo)}`, x + 20, yy + 4, { tam: 13, color: '#ff9a50' }); yy += 22; }
    // y las elecciones de los encargos
    const otras = MISIONES.filter((m) => m.eleccion && eleccionDe(d, m.id) !== undefined && !m.eleccion.opciones.some((o) => o.decision));
    if (otras.length) {
      texto(T('Otras elecciones', 'Other choices'), x + 20, yy + 8, { tam: 11, color: '#806a50' }); yy += 24;
      for (const m of otras) { if (yy > y + 410) break; const o = m.eleccion!.opciones[eleccionDe(d, m.id)!]; const s = `${TT(m.nombre)}: ${TT(o.texto)}`; texto(s.length > 50 ? s.slice(0, 49) + '…' : s, x + 22, yy, { tam: 11, color: '#a898c0' }); yy += 15; }
    }
    return;
  }
  // cinemáticas: los cierres de acto vistos y el epílogo
  let yy = y + 90;
  const hechos = [...d.actosHechos].sort((a, b) => a - b);
  if (!hechos.length) texto(T('Cuando cierres un acto, su cinemática queda aquí.', 'When you close an act, its film is kept here.'), x + 22, yy, { tam: 12, color: '#8a7a60' });
  for (const a of hechos) {
    if (boton(`${T('Cierre del acto', 'End of act')} ${a}`, x + 40, yy, 240, 30, { tam: 13 })) { E.clicIzq = false; j.eventos.push({ tipo: 'cinematica', dato: a }); }
    yy += 38;
  }
  if ((d.misiones.m7_aunsaar ?? 0) === 3 && hist(d).decisiones?.corona) {
    if (boton(`${T('Epílogo', 'Epilogue')}: ${TT(EPILOGOS[finalCompleto(d)].titulo)}`, x + 40, yy, 240, 30, { tam: 13, color: '#ff9a50' })) { E.clicIzq = false; j.eventos.push({ tipo: 'epilogo' }); }
  }
}
