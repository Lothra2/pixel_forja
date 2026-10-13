import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generarEscenario } from '../world/oblique';
import { validateLayout } from '../world/oblique/layout';
import { renderEscena, postal, type Escena } from '../world/oblique/escena';
import { estiloDe } from '../world/oblique/ficha';
import { contraste } from '../world/oblique/verify';
import { NOMBRES, paletaVietnam, VIETNAM_MANANA, VIETNAM_MEDIODIA, type Paleta } from '../world/oblique/paleta';
import { COLOMBIA_MANANA, paletaColombia } from '../world/oblique/colombiaPaleta';
import { VENEZUELA_NOCHE, paletaVenezuela } from '../world/oblique/venezuelaPaleta';
import { VENEZUELA_MARGARITA_MEDIODIA, VIETNAM_DALAT_MANANA, COLOMBIA_BARRANQUILLA_MEDIODIA, VENEZUELA_MARACAIBO_NOCHE, VIETNAM_TAODAN_AMANECER, COLOMBIA_CANDELARIA_TARDE } from '../world/oblique/lugaresPaleta';
import { CANCHA as C_MARG, PALMAS } from '../world/oblique/margarita';
import { CANCHA as C_DALAT, MALLA } from '../world/oblique/dalat';
import { CANCHA as C_BAQ, ARCO } from '../world/oblique/barranquilla';
import { CANCHA as C_MCBO, CATATUMBO } from '../world/oblique/maracaibo';
import { LUGARES } from '../world/oblique/lugares';
import { npcTira, VISTAS_NPC } from '../kit/npc';
import { pixelesGorro } from '../parts/sombreros';
import { encodePng, decodePng, createRaster, blit, type Raster } from '../index';
import type { HumanFicha } from '../sheet/ficha';
import { ROOT } from './helpers';

const raw = (id: string) => JSON.parse(readFileSync(`docs/ejemplos/nekketsu/escenarios/${id}.layout.json`, 'utf8'));
const escena = (id: string) => renderEscena(validateLayout(raw(id)).layout!, 42, 0.35);
const MARG = raw('margarita'), DALAT = raw('dalat'), BAQ = raw('barranquilla'), MCBO = raw('cancha_maracaibo');
const EM = escena('margarita'), ED = escena('dalat'), EB = escena('barranquilla'), EX = escena('cancha_maracaibo');
const hex = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return r.data[i + 3] ? '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('') : null; };
const iguales = (a: Raster, b: Raster) => Buffer.from(a.data).equals(Buffer.from(b.data));
const archivo = (r: ReturnType<typeof generarEscenario>, n: string) => r.archivos.find((a) => a.nombre === n)!.bytes;
const json = (r: ReturnType<typeof generarEscenario>, n: string) => JSON.parse(new TextDecoder().decode(archivo(r, n)));
/** Qué parte de una raya del piso (x0 a x1 en la fila y, ya inclinada) tiene el color. */
const raya = (P: Paleta, r: Raster, y: number, x0: number, x1: number, c: keyof Paleta, k = 0) => { let n = 0; for (let x = x0; x <= x1; x++) if (hex(r, x + Math.round(k * y), y) === P[c]) n++; return n / (x1 - x0 + 1); };
const FICHA_MARI = JSON.parse(readFileSync('docs/ejemplos/nekketsu/npc/marimonda.ficha.json', 'utf8')) as HumanFicha;
const CFG = JSON.parse(readFileSync('docs/ejemplos/nekketsu/kit.config.json', 'utf8'));

describe('los escenarios de los cuatro deportes de pelota (lote E5)', () => {
  it('los cuatro pasan las 9 pruebas, sin avisos, cada uno con su estilo, su hora, su paleta y su ficha', () => {
    const casos: [unknown, string, string, Paleta, number, string[], string[]][] = [
      [MARG, 'venezuela_playa', 'mediodia', VENEZUELA_MARGARITA_MEDIODIA, 10, ['olas', 'toldos_viento', 'vendedor_empanadas', 'alcatraces'], ['PLAYA EL AGUA', 'MARGARITA', 'EMPANADAS', 'COCO FRÍO']],
      [DALAT, 'vietnam_montana', 'manana', VIETNAM_DALAT_MANANA, 11, ['neblina', 'publico'], ['SÂN QUẦN VỢT ĐÀ LẠT']],
      [BAQ, 'colombia_caribe', 'mediodia', COLOMBIA_BARRANQUILLA_MEDIODIA, 11, ['publico', 'guirnaldas', 'comparsa', 'confeti'], ['CARNAVAL DE BARRANQUILLA', '¡QUIEN LO VIVE ES QUIEN LO GOZA!']],
      [MCBO, 'venezuela_lago', 'noche', VENEZUELA_MARACAIBO_NOCHE, 10, ['relampago', 'gaiteros', 'publico'], ['CANCHA LA CHINITA', 'BARRIO SANTA LUCÍA']],
    ];
    for (const [layout, estilo, hora, pal, iconos, vida, letreros] of casos) {
      const r = generarEscenario(layout, { ficha: true });
      expect(r.errores, estilo).toEqual([]);
      expect(r.avisos, estilo).toEqual([]);
      expect(r.pruebas.map((p) => p.ok), estilo).toEqual(Array(9).fill(true));
      const f = r.escena!.ficha;
      expect(f).toMatchObject({ estilo, hora });
      expect(f.paleta.map((c) => c.hex)).toEqual(NOMBRES.map((n) => pal[n]));
      expect(f.iconos).toHaveLength(iconos);
      expect(f.vida.map((v) => v.id)).toEqual(vida);
      for (const v of f.vida) expect(v.detalle, `${estilo} ${v.id}`).not.toMatch(/Sin dibujo/);
      expect(f.letreros).toEqual(letreros);
      expect(new Set(NOMBRES.map((n) => pal[n])).size, estilo).toBe(24);
      // cada pixel de la escena sale de su paleta (y usa los 24)
      expect(r.pruebas[7].detalle, estilo).toMatch(/^24 colores usados/);
    }
    expect(Object.keys(LUGARES).slice(3)).toEqual(['playa_el_agua', 'cancha_arcilla_dalat', 'calle_carnaval_barranquilla', 'cancha_barrio_maracaibo']);
  });

  it('las otras horas no cambian: Caracas, la Comuna 13, la cancha de tejo y Vietnam siguen con su paleta, y cada lugar nuevo trae la suya por su fondo', () => {
    expect(paletaVenezuela('noche')).toBe(VENEZUELA_NOCHE);
    expect(paletaVenezuela('noche', [], 'torres_parque_central')).toBe(VENEZUELA_NOCHE);
    expect(paletaVenezuela('mediodia', [], 'playa_el_agua')).toBe(VENEZUELA_MARGARITA_MEDIODIA);
    expect(paletaVenezuela('noche', [], 'cancha_barrio_maracaibo')).toBe(VENEZUELA_MARACAIBO_NOCHE);
    expect(paletaColombia('manana', [], 'c13_casas_ladrillo')).toBe(COLOMBIA_MANANA);
    expect(paletaColombia('mediodia')).toBe(COLOMBIA_MANANA);
    expect(paletaColombia('tarde', ['nublado'], 'cancha_tejo_candelaria')).toBe(COLOMBIA_CANDELARIA_TARDE);
    expect(paletaColombia('mediodia', [], 'calle_carnaval_barranquilla')).toBe(COLOMBIA_BARRANQUILLA_MEDIODIA);
    expect(paletaVietnam('manana')).toBe(VIETNAM_MANANA);
    expect(paletaVietnam('mediodia')).toBe(VIETNAM_MEDIODIA);
    expect(paletaVietnam('amanecer', [], 'parque_tao_dan')).toBe(VIETNAM_TAODAN_AMANECER);
    expect(paletaVietnam('manana', ['neblina'], 'cancha_arcilla_dalat')).toBe(VIETNAM_DALAT_MANANA);
    expect(estiloDe(validateLayout(raw('caracas_azotea')).layout!)).toBe('venezuela_ciudad');
    expect(estiloDe(validateLayout(raw('medellin_c13')).layout!)).toBe('colombia_ladrillo');
    expect(estiloDe(validateLayout(raw('saigon_hem')).layout!)).toBe('vietnam');
  });

  it('un lugar nuevo a otra hora queda pendiente y dice qué hora pinta', () => {
    for (const [layout, hora, estilo, tiene] of [[MARG, 'noche', 'venezuela_playa', 'mediodia'], [DALAT, 'tarde', 'vietnam_montana', 'manana'], [BAQ, 'noche', 'colombia_caribe', 'mediodia'], [MCBO, 'mediodia', 'venezuela_lago', 'noche']] as const) {
      const r = generarEscenario({ ...layout, hora });
      expect(r).toMatchObject({ ok: false, pendiente: true });
      expect(r.errores.join()).toContain(`"${estilo}" todavía no tiene arte de ${hora} (hoy pinta: ${tiene})`);
    }
  });

  it('Margarita y Đà Lạt van de lado y calzan con Voley.ts y Tenis.ts: las filas de atletas, las rayas y la columna de la red', () => {
    for (const [layout, E, pal, cancha, color] of [[MARG, EM, VENEZUELA_MARGARITA_MEDIODIA, C_MARG, 'azul'], [DALAT, ED, VIETNAM_DALAT_MANANA, C_DALAT, 'luz']] as const) {
      const FT = layout.franja.atras;
      expect(E.inclinacion).toBe(0);
      expect(layout.franja).toEqual({ atras: 290, adelante: 330 });
      // el piso de los dos es la fila 310: las filas 304 y 316 son los carriles
      expect(layout.carriles.map((c: { y: number }) => FT + c.y)).toEqual([304, 316]);
      // las rayas de atrás (fila 298) y de adelante (fila 322), de x 34 a 606 y de 28 a 612
      expect(FT + cancha.atras).toBe(298);
      expect(FT + cancha.adelante).toBe(322);
      expect(raya(pal, E.piso.r, cancha.atras, 34, 606, color), layout.id).toBeGreaterThan(0.85);
      expect(raya(pal, E.piso.r, cancha.adelante, 28, 612, color), layout.id).toBeGreaterThan(0.85);
      expect(raya(pal, E.piso.r, cancha.atras, 0, 30, color), layout.id).toBe(0);
      // la red la pone el juego en x 320: el arte no pinta nada oscuro en esa columna arriba de la cancha
      for (let y = 250; y < FT; y++) expect([pal.tinta, pal.sombra, pal.asfalto], `${layout.id} fila ${y}`).not.toContain(hex(E.cerca.r, 320, y));
      // todo el piso pintado hasta abajo y el frente libre
      for (let y = 0; y < E.piso.h; y++) for (let x = 0; x < 640; x += 7) expect(E.piso.r.data[(y * 640 + x) * 4 + 3], `${layout.id} ${x},${y}`).toBe(255);
      expect(E.frente.r.data.some((v, i) => i % 4 === 3 && v > 0)).toBe(false);
      const ej = json(generarEscenario(layout), 'escenario.json');
      expect(ej).toMatchObject({ inclinacion: 0, ancho: 640, vista: 'lado', franja: { atras: 290, adelante: 330 } });
    }
    // ninguna palma de Margarita toca la red, y la malla de Đà Lạt no tiene un paral en la columna de la red
    for (const p of PALMAS) expect(Math.abs(p.x - 320), `palma ${p.x}`).toBeGreaterThan(80);
    for (const x of MALLA.postes) expect(Math.abs(x - 320)).toBeGreaterThan(20);
  });

  it('Barranquilla calza con Futbol.ts: la franja, las rayas de tiza y los dos arcos de piedra en cada línea de gol', () => {
    const k = 0.35, P = COLOMBIA_BARRANQUILLA_MEDIODIA;
    expect(BAQ.franja).toEqual({ atras: 212, adelante: 316 });
    expect(EB).toMatchObject({ inclinacion: 0.35, ancho: 676 });
    // las líneas de gol y el medio, de tiza, donde las pinta el juego
    for (const x of [...C_BAQ.gol, C_BAQ.medio]) { let n = 0; for (let y = 0; y < 104; y++) if (hex(EB.piso.r, x + Math.round(k * y), y) === P.luz) n++; expect(n, `x ${x}`).toBeGreaterThan(80); }
    expect(raya(P, EB.piso.r, 0, 26, 600, 'luz', k)).toBeGreaterThan(0.8);
    // los arcos: dos objetos cada uno, la columna de atrás (con la vara) en y 34 y la de adelante en y 70
    const arcos = EB.objetos.filter((o) => o.tipo === 'arco_piedra');
    expect(arcos.map((o) => [o.id, o.orden, o.origen])).toEqual([
      ['arco_piedra_26_atras', ARCO.y0 + 1, 'entidades'], ['arco_piedra_600_atras', ARCO.y0 + 1, 'entidades'],
      ['arco_piedra_26', ARCO.y1 + 1, 'entidades'], ['arco_piedra_600', ARCO.y1 + 1, 'entidades'],
    ]);
    for (const x of C_BAQ.gol) {
      // la columna de adelante se para en (x + 0.35 * 70, FT + 70) y sube 26 y un poco más
      const o = EB.objetos.find((q) => q.id === `arco_piedra_${x}`)!, px = x + Math.round(k * ARCO.y1) - o.x, py = 212 + ARCO.y1 - 1 - o.y;
      expect(hex(o.img.r, px, py), `pie ${x}`).not.toBeNull();
      expect(hex(o.img.r, px, py - ARCO.alto), `alto ${x}`).not.toBeNull();
      // la vara de arriba cruza de una columna a la otra
      const a = EB.objetos.find((q) => q.id === `arco_piedra_${x}_atras`)!, mx = x + Math.round(k * 52) + 1 - a.x, my = 212 + 52 - ARCO.alto - 2 - a.y;
      expect([hex(a.img.r, mx, my), hex(a.img.r, mx + 1, my), hex(a.img.r, mx - 1, my)].some((c) => c !== null), `vara ${x}`).toBe(true);
    }
    // la colisión del layout no lleva los arcos (son entidades objeto): la pelota pasa entre las columnas
    expect(json(generarEscenario(BAQ), 'colision.json').solidos).toEqual([]);
    // el NPC de la Marimonda va en las entidades
    expect(BAQ.entidades.find((e: { tipo: string }) => e.tipo === 'npc')).toMatchObject({ npc: 'marimonda' });
  });

  it('Maracaibo calza con Basket.ts: la cancha azul, el área naranja, el relámpago solo en el cielo y ningún reflejo de neón', () => {
    const k = 0.35, P = VENEZUELA_MARACAIBO_NOCHE, en = (x: number, y: number) => hex(EX.piso.r, x + Math.round(k * y), y);
    expect([P.celeste, P.cielo, P.cemento]).toContain(en(300, 70));
    expect([P.ocre, P.amarillo, P.cemento]).toContain(en(560, 46));
    expect([P.verde, P.menta, P.cemento]).toContain(en(20, 50));
    expect(en(C_MCBO.x0, 50)).toBe(P.luz);
    // el piso no refleja neones (los colores del relámpago no caen en la cancha)
    for (let y = 0; y < EX.piso.h; y++) for (let x = 0; x < EX.piso.w; x += 3) expect(hex(EX.piso.r, x, y), `${x},${y}`).not.toBe(P.salmon);
    // el relámpago: 8 cuadros, apagado al principio y prendido en el 5, y solo donde la capa cerca deja ver afuera
    const rel = EX.vida.find((v) => v.tipo === 'relampago')!;
    expect(rel.cuadros).toHaveLength(8);
    const lleno = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i]) n++; return n; };
    expect(lleno(rel.cuadros[0].r)).toBe(0);
    expect(lleno(rel.cuadros[5].r)).toBeGreaterThan(300);
    for (const c of rel.cuadros) for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.r.data[(y * c.w + x) * 4 + 3]) expect(EX.cerca.has(rel.x + x, rel.y + y), `${x},${y}`).toBe(false);
    expect(rel.x).toBeGreaterThanOrEqual(CATATUMBO.x0);
    // de noche se lee: el contraste de los atletas contra la cancha
    expect(contraste('#1e1418', P.celeste)).toBeGreaterThan(3);
    expect(EX.luces.filter((l) => l.encendida).length).toBe(7);
  });

  it('la vida que va sobre lo pintado tapa entero: el cuadro 0 calza con la capa cerca, y los otros cambian', () => {
    for (const E of [EM, ED, EB, EX]) for (const v of E.vida.filter((q) => q.capa === 'cerca' && q.tipo !== 'relampago')) {
      const c = v.cuadros[0].r;
      for (let y = 0; y < c.h; y += 2) for (let x = 0; x < c.w; x += 3) expect(hex(c, x, y), `${E.layout.id} ${v.id} ${x},${y}`).toBe(hex(E.cerca.r, v.x + x, v.y + y));
      expect(v.cuadros.slice(1).some((q) => !iguales(q.r, c)), `${E.layout.id} ${v.id}`).toBe(true);
    }
  });

  it('las luces y el peso: de día no hay luces prendidas, de noche los bombillos y el Catatumbo, sin pasarse', () => {
    expect(EM.luces).toEqual([]);
    expect(EB.luces).toEqual([]);
    for (const E of [EM, ED, EB, EX]) {
      expect(E.luces.length).toBeLessThanOrEqual(12);
      expect(E.vida.length).toBeLessThanOrEqual(16);
    }
    expect(EB.particulas.find((p) => p.fx === 'confeti')).toBeTruthy();
  });

  it('las postales de un mundo de una pantalla van a 0, 2 y 4 segundos', () => {
    for (const layout of [MARG, DALAT, BAQ, MCBO]) {
      const r = generarEscenario(layout, { postales: true });
      const [a, b] = ['inicio', 'medio'].map((n) => decodePng(archivo(r, `postales/${n}.png`)));
      expect(iguales(a, b), layout.id).toBe(false);
    }
  });

  it('la Marimonda: caminar de lado y bailar de frente, con la trompa y las orejotas que se leen en la celda de 48', () => {
    expect(VISTAS_NPC).toContain('lado');
    const r = npcTira('marimonda', CFG.npc.personajes.marimonda, { marimonda: FICHA_MARI }, 48);
    if (typeof r === 'string') throw new Error(r);
    expect(r.entrada).toMatchObject({ w: 48, h: 48, ancla: [24, 46], anims: { caminar: { desde: 0, cuadros: 8, loop: true, vista: 'lado' }, bailar: { desde: 8, cuadros: 8, loop: true, vista: 'frente' } } });
    const cuadro = (i: number) => { const c = createRaster(48, 48); for (let y = 0; y < 48; y++) c.data.set(r.tira.data.subarray((y * r.tira.w + i * 48) * 4, (y * r.tira.w + i * 48 + 48) * 4), y * 48 * 4); return c; };
    const caja = (c: Raster, y0: number, y1: number) => { let a = 48, b = -1; for (let y = y0; y < y1; y++) for (let x = 0; x < 48; x++) if (c.data[(y * 48 + x) * 4 + 3]) { a = Math.min(a, x); b = Math.max(b, x); } return [a, b]; };
    // de frente, las orejotas hacen la cabeza mucho más ancha que el cuerpo
    const baile = cuadro(8), [ca, cb] = caja(baile, 0, 18), [ka, kb] = caja(baile, 36, 46);
    expect(cb - ca).toBeGreaterThan(30);
    expect(cb - ca).toBeGreaterThan(kb - ka + 12);
    // de lado, la trompa sale de la capucha hacia adelante (a la derecha), más allá de las piernas
    const paso = cuadro(0), [, tb] = caja(paso, 14, 26), [, pb] = caja(paso, 36, 46);
    expect(tb).toBeGreaterThan(pb + 6);
    // la máscara existe en las tres direcciones, con su capucha roja por defecto
    for (const dir of ['down', 'right', 'up'] as const) expect(pixelesGorro('marimonda', dir, { x: 20, y: 20, w: 16, h: 18 }).some((p) => p.hex === '#e8402e'), dir).toBe(true);
    dorada('npc_e5', r.tira);
  });

  it('imagen dorada: Margarita, Đà Lạt, Barranquilla y Maracaibo', () => {
    const out = createRaster(640, 360 * 4);
    ([EM, ED, EB, EX] as Escena[]).forEach((E, i) => blit(out, postal(E, 0, [], 640, 360, 2), 0, 360 * i));
    dorada('lugares_e5', out);
  });
});

function dorada(nombre: string, out: Raster) {
  const file = join(ROOT, 'golden', `${nombre}.png`);
  if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
  const gold = decodePng(readFileSync(file));
  const same = gold.w === out.w && gold.h === out.h && Buffer.from(gold.data).equals(Buffer.from(out.data));
  if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', `golden_actual_${nombre}.png`), encodePng(out)); }
  expect(same, `cambió ${nombre}; mira out/golden_actual_${nombre}.png`).toBe(true);
}
