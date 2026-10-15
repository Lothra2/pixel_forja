import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generarEscenario } from '../world/oblique';
import { validateLayout } from '../world/oblique/layout';
import { renderEscena, postal, type Escena } from '../world/oblique/escena';
import { NOMBRES, paletaVietnam, VIETNAM_MEDIODIA, type Paleta } from '../world/oblique/paleta';
import { COLOMBIA_MANANA, paletaColombia } from '../world/oblique/colombiaPaleta';
import { VENEZUELA_NOCHE, paletaVenezuela } from '../world/oblique/venezuelaPaleta';
import { COLOMBIA_COCORA_MANANA, VIETNAM_HALONG_MEDIODIA, VENEZUELA_APURE_ATARDECER, VENEZUELA_BARRIO_TARDE, VENEZUELA_LICEO_MEDIODIA, COLOMBIA_CARTAGENA_ATARDECER } from '../world/oblique/lugaresPaleta';
import { PISTA, PALMAS_CERA } from '../world/oblique/cocora';
import { PISCINA } from '../world/oblique/halong';
import { CAMPO } from '../world/oblique/llanos';
import { CALLE, CASA_VECINO } from '../world/oblique/barrio';
import { CANCHA as C_LICEO } from '../world/oblique/liceo';
import { AZOTEA } from '../world/oblique/cartagena';
import { LUGARES } from '../world/oblique/lugares';
import { npcTira } from '../kit/npc';
import { pixelesGorro } from '../parts/sombreros';
import { encodePng, decodePng, createRaster, blit, type Raster } from '../index';
import type { HumanFicha } from '../sheet/ficha';
import { ROOT } from './helpers';

/**
 * Lote E6: los escenarios de las seis pruebas que el juego todavía pintaba con código. Cada uno pasa las 9 pruebas con
 * su paleta y su ficha, y calza con las medidas de su archivo del juego: Vallas.ts (Cocora), Natacion.ts (Hạ Long),
 * Jabalina.ts (Apure), Chapita.ts (el barrio de Caracas), Quemado.ts (el liceo) y Azoteas.ts (Cartagena).
 */

const raw = (id: string) => JSON.parse(readFileSync(`docs/ejemplos/nekketsu/escenarios/${id}.layout.json`, 'utf8'));
const escena = (id: string) => renderEscena(validateLayout(raw(id)).layout!, 42, 0.35);
const COC = raw('cocora'), HAL = raw('halong'), APU = raw('llanos_apure'), BAR = raw('barrio_caracas'), LIC = raw('liceo_patio'), CTG = raw('cartagena');
const EC = escena('cocora'), EH = escena('halong'), EA = escena('llanos_apure'), EB = escena('barrio_caracas'), EL = escena('liceo_patio'), ET = escena('cartagena');
const TODAS: Escena[] = [EC, EH, EA, EB, EL, ET];
const hex = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return r.data[i + 3] ? '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('') : null; };
const iguales = (a: Raster, b: Raster) => Buffer.from(a.data).equals(Buffer.from(b.data));
const json = (r: ReturnType<typeof generarEscenario>, n: string) => JSON.parse(new TextDecoder().decode(r.archivos.find((a) => a.nombre === n)!.bytes));
/** Qué parte de la fila y del piso, de x0 a x1 (ya inclinada con k), tiene alguno de los colores. */
const fila = (P: Paleta, r: Raster, y: number, x0: number, x1: number, cs: (keyof Paleta)[], k = 0) => { let n = 0; for (let x = x0; x <= x1; x++) if (cs.some((c) => hex(r, x + Math.round(k * y), y) === P[c])) n++; return n / (x1 - x0 + 1); };
/** Qué parte de la columna x del piso, de y0 a y1, tiene alguno de los colores. */
const columna = (P: Paleta, r: Raster, x: number, y0: number, y1: number, cs: (keyof Paleta)[], k = 0) => { let n = 0; for (let y = y0; y <= y1; y++) if (cs.some((c) => hex(r, x + Math.round(k * y), y) === P[c])) n++; return n / (y1 - y0 + 1); };
const FICHA_PAL = JSON.parse(readFileSync('docs/ejemplos/nekketsu/npc/palenquera.ficha.json', 'utf8')) as HumanFicha;
const CFG = JSON.parse(readFileSync('docs/ejemplos/nekketsu/kit.config.json', 'utf8'));

describe('los escenarios de las seis pruebas que faltaban (lote E6)', () => {
  it('los seis pasan las 9 pruebas, sin avisos, cada uno con su estilo, su hora, su paleta y su ficha', () => {
    const casos: [unknown, string, string, Paleta, number, string[], string[]][] = [
      [COC, 'colombia_cafetera', 'manana', COLOMBIA_COCORA_MANANA, 10, ['neblina', 'vacas', 'loros'], ['VALLE DE COCORA', 'SALENTO, QUINDÍO']],
      [HAL, 'vietnam_bahia', 'mediodia', VIETNAM_HALONG_MEDIODIA, 11, ['banderas', 'publico', 'juncos', 'gaviotas'], ['VỊNH HẠ LONG']],
      [APU, 'venezuela_llano', 'atardecer', VENEZUELA_APURE_ATARDECER, 9, ['estero', 'ganado', 'garzas', 'corocoras'], ['LLANOS DE APURE']],
      [BAR, 'venezuela_barrio', 'tarde', VENEZUELA_BARRIO_TARDE, 10, ['ropa_tendida', 'vecinos', 'perro', 'zamuros'], ['ABASTO EL PANA', 'HIELITOS', 'A 1 BS']],
      [LIC, 'venezuela_liceo', 'mediodia', VENEZUELA_LICEO_MEDIODIA, 9, ['publico', 'cantina', 'bandera'], ['U.E. LICEO EL ÁVILA', 'CANTINA', 'CARTELERA', 'ESTUDIAR', 'ES CRECER']],
      [CTG, 'colombia_amurallada', 'atardecer', COLOMBIA_CARTAGENA_ATARDECER, 13, ['alcatraces', 'veleros'], ['C. DE LAS DAMAS']],
    ];
    for (const [layout, estilo, hora, pal, iconos, vida, letreros] of casos) {
      const r = generarEscenario(layout, { ficha: true });
      expect(r.errores, estilo).toEqual([]);
      expect(r.avisos, estilo).toEqual([]);
      expect(r.pruebas.map((p) => p.ok), estilo).toEqual(Array(9).fill(true));
      const f = r.escena!.ficha;
      expect(f).toMatchObject({ estilo, hora });
      expect(f.paleta.map((c) => c.hex)).toEqual(NOMBRES.map((n) => pal[n]));
      expect(f.iconos, estilo).toHaveLength(iconos);
      expect(f.vida.map((v) => v.id)).toEqual(vida);
      for (const v of f.vida) expect(v.detalle, `${estilo} ${v.id}`).not.toMatch(/Sin dibujo/);
      expect(f.letreros).toEqual(letreros);
      expect(new Set(NOMBRES.map((n) => pal[n])).size, estilo).toBe(24);
      expect(r.pruebas[7].detalle, estilo).toMatch(/^24 colores usados/);
    }
    expect(Object.keys(LUGARES).slice(7)).toEqual(['valle_cocora', 'bahia_halong', 'morichal_apure', 'calle_barrio_caracas', 'patio_liceo_caracas', 'azoteas_cartagena']);
  });

  it('cada lugar nuevo trae su paleta por su fondo, y las de antes no cambian', () => {
    expect(paletaColombia('manana', ['neblina'], 'valle_cocora')).toBe(COLOMBIA_COCORA_MANANA);
    expect(paletaColombia('atardecer', [], 'azoteas_cartagena')).toBe(COLOMBIA_CARTAGENA_ATARDECER);
    expect(paletaVietnam('mediodia', [], 'bahia_halong')).toBe(VIETNAM_HALONG_MEDIODIA);
    expect(paletaVenezuela('atardecer', [], 'morichal_apure')).toBe(VENEZUELA_APURE_ATARDECER);
    expect(paletaVenezuela('tarde', [], 'calle_barrio_caracas')).toBe(VENEZUELA_BARRIO_TARDE);
    expect(paletaVenezuela('mediodia', [], 'patio_liceo_caracas')).toBe(VENEZUELA_LICEO_MEDIODIA);
    expect(paletaColombia('manana', [], 'c13_casas_ladrillo')).toBe(COLOMBIA_MANANA);
    expect(paletaVenezuela('noche', [], 'torres_parque_central')).toBe(VENEZUELA_NOCHE);
    expect(paletaVietnam('mediodia')).toBe(VIETNAM_MEDIODIA);
  });

  it('un lugar nuevo a otra hora queda pendiente y dice qué hora pinta', () => {
    for (const [layout, hora, estilo, tiene] of [[COC, 'noche', 'colombia_cafetera', 'manana'], [HAL, 'noche', 'vietnam_bahia', 'mediodia'], [APU, 'manana', 'venezuela_llano', 'atardecer'], [BAR, 'noche', 'venezuela_barrio', 'tarde'], [LIC, 'tarde', 'venezuela_liceo', 'mediodia'], [CTG, 'mediodia', 'colombia_amurallada', 'atardecer']] as const) {
      const r = generarEscenario({ ...layout, hora });
      expect(r).toMatchObject({ ok: false, pendiente: true });
      expect(r.errores.join()).toContain(`"${estilo}" todavía no tiene arte de ${hora} (hoy pinta: ${tiene})`);
    }
  });

  it('los cinco de lado van sin inclinar, con su mundo del ancho del juego, y el liceo inclinado a 0.35', () => {
    for (const [layout, E, largo] of [[COC, EC, 1720], [HAL, EH, 1460], [APU, EA, 1560], [BAR, EB, 900], [CTG, ET, 880]] as const) {
      expect(E.inclinacion, layout.id).toBe(0);
      expect(E.ancho, layout.id).toBe(largo);
      expect(json(generarEscenario(layout), 'escenario.json'), layout.id).toMatchObject({ inclinacion: 0, ancho: largo, vista: 'lado' });
      // el piso pintado entero y el frente libre
      for (let y = 0; y < E.piso.h; y++) for (let x = 0; x < E.piso.w; x += 11) expect(E.piso.r.data[(y * E.piso.w + x) * 4 + 3], `${layout.id} ${x},${y}`).toBe(255);
    }
    expect(EL).toMatchObject({ inclinacion: 0.35 });
    // el liceo es una cancha de una pantalla: 800 con la cancha en los 640 del medio (lote E4)
    expect([LIC.largo, LIC.margen, EL.ancho]).toEqual([800, 80, 835]);
  });

  it('Cocora calza con Vallas.ts: TOP 228, los cuatro carriles, las rayas blancas, la salida y la meta a cuadros', () => {
    const P = COLOMBIA_COCORA_MANANA, FT = COC.franja.atras;
    expect(FT).toBe(228);
    expect(COC.carriles.map((c: { y: number }) => c.y)).toEqual([18, 46, 74, 102]);
    expect(PISTA.carriles).toEqual([18, 46, 74, 102]);
    // las rayas de los carriles van de punta a punta y ningún carril cae en una raya
    for (const y of PISTA.rayas) expect(fila(P, EC.piso.r, y, 0, 1719, ['luz']), `raya ${y}`).toBeGreaterThan(0.97);
    for (const c of PISTA.carriles) expect(fila(P, EC.piso.r, c, 200, 1500, ['luz']), `carril ${c}`).toBeLessThan(0.1);
    // la salida y la meta a cuadros
    expect(columna(P, EC.piso.r, PISTA.salida, 2, 110, ['luz'])).toBeGreaterThan(0.95);
    expect(columna(P, EC.piso.r, PISTA.meta + 1, 2, 110, ['luz', 'tinta'])).toBe(1);
    // las palmas de cera tienen la copa dentro de lo que ve la cámara a zoom 1.5 (filas 120 a 360)
    for (const p of PALMAS_CERA) expect(p.copa, `palma ${p.x}`).toBeGreaterThanOrEqual(120);
  });

  it('Hạ Long calza con Natacion.ts: TOP 226, los cuatro carriles, las corcheras, la marca de 15 m y la pared de llegada', () => {
    const P = VIETNAM_HALONG_MEDIODIA;
    expect(HAL.franja.atras).toBe(226);
    expect(HAL.carriles.map((c: { y: number }) => c.y)).toEqual([24, 50, 76, 102]);
    // cada carril cae entre dos corcheras (o entre la corchera y el borde)
    const bordes = [PISCINA.y0, ...PISCINA.corcheras, PISCINA.y1];
    PISCINA.carriles.forEach((c, i) => { expect(c).toBeGreaterThan(bordes[i]); expect(c).toBeLessThan(bordes[i + 1]); });
    // las corcheras: flotadores de 3 px rojos y blancos cada 4 px
    for (const y of PISCINA.corcheras) expect(fila(P, EH.piso.r, y, PISCINA.salida, PISCINA.llegada - 1, ['luz', 'rojo']), `corchera ${y}`).toBeGreaterThan(0.74);
    expect(columna(P, EH.piso.r, PISCINA.m15, PISCINA.y0, PISCINA.y1 - 1, ['amarillo'])).toBeGreaterThan(0.3);
    expect(columna(P, EH.piso.r, PISCINA.llegada + 4, PISCINA.y0, PISCINA.y1 - 1, ['amarillo', 'tinta'])).toBe(1);
    // el agua no tiene ni un pixel de tinta (el juego pone la línea de agua y los nadadores encima)
    expect(fila(P, EH.piso.r, 50, PISCINA.salida, PISCINA.llegada - 20, ['tinta'])).toBe(0);
  });

  it('Apure calza con Jabalina.ts: TOP 226, la pista de carrera hasta la raya de foul en x 380 y el sector con las marcas', () => {
    const P = VENEZUELA_APURE_ATARDECER;
    expect(APU.franja.atras).toBe(226);
    expect(APU.carriles.map((c: { y: number }) => c.y)).toContain(CAMPO.carrera);
    expect(CAMPO.carrera).toBe(70);
    expect(CAMPO.foul).toBe(380);
    // la pista de tartán, con sus bordes blancos, hasta la raya de foul
    for (let y = CAMPO.pista[0] + 1; y < CAMPO.pista[1]; y++) expect(fila(P, EA.piso.r, y, 0, CAMPO.foul - 3, ['rojo', 'terracota']), `fila ${y}`).toBe(1);
    expect(fila(P, EA.piso.r, CAMPO.pista[0], 0, CAMPO.foul - 3, ['luz'])).toBe(1);
    expect(columna(P, EA.piso.r, CAMPO.foul, CAMPO.tabla[0], CAMPO.tabla[1], ['luz'])).toBe(1);
    // después del foul ya no hay tartán
    expect(fila(P, EA.piso.r, CAMPO.carrera, CAMPO.foul + 4, 1500, ['rojo'])).toBeLessThan(0.02);
    // la marca cada 100 px desde el foul
    expect(columna(P, EA.piso.r, CAMPO.foul + CAMPO.paso, CAMPO.sector[0] + 1, CAMPO.sector[1] - 1, ['luz'])).toBeGreaterThan(0.3);
  });

  it('el barrio calza con Chapita.ts: PISO 316, el home y la casa del vecino como objetos, con la ventana rota aparte', () => {
    expect(BAR.franja.atras + CALLE.pies).toBe(316);
    expect(CASA_VECINO.piso).toBe(316);
    const casa = EB.objetos.find((o) => o.id === 'casa_vecino')!, rota = EB.objetos.find((o) => o.id === 'ventana_rota')!;
    expect([casa.x, casa.y + casa.img.h, casa.img.w, casa.orden, casa.origen]).toEqual([CASA_VECINO.x0, 316, CASA_VECINO.x1 - CASA_VECINO.x0, 0, 'entidades']);
    // la ventana rota tapa la ventana sana: misma caja, encima
    const v = CASA_VECINO.ventana;
    expect([rota.x, rota.y, rota.img.w, rota.img.h, rota.orden]).toEqual([v.x0, 316 - v.z1, v.x1 - v.x0, v.z1 - v.z0, 1]);
    // la casa trae la ventana sana pintada donde va la rota
    expect(hex(casa.img.r, v.x0 - casa.x + 4, casa.img.h - v.z1 + 4)).not.toBeNull();
    // el home y el montículo en el piso, donde los pinta el juego
    const P = VENEZUELA_BARRIO_TARDE;
    expect(fila(P, EB.piso.r, CALLE.home.y0, CALLE.home.x0, CALLE.home.x1, ['luz'])).toBe(1);
    expect(columna(P, EB.piso.r, CALLE.home.x0, CALLE.home.y0, CALLE.home.y1, ['luz'])).toBe(1);
  });

  it('el liceo calza con Quemado.ts: FT 214, PROF 100, la línea del medio amarilla y los dos cementerios', () => {
    const P = VENEZUELA_LICEO_MEDIODIA, k = 0.35;
    expect(LIC.franja).toEqual({ atras: 214, adelante: 314 });
    expect(C_LICEO.prof).toBe(100);
    // la cancha de Quemado.ts corrida el margen de 80: de x 120 a 640, el medio en 380 y los cementerios en las puntas
    expect(C_LICEO).toMatchObject({ x0: 120, x1: 640, medio: 380, cementerios: [[84, 114], [646, 676]] });
    expect(columna(P, EL.piso.r, C_LICEO.medio - 1, 0, 99, ['amarillo'], k)).toBeGreaterThan(0.8);
    for (const [a] of C_LICEO.cementerios) expect(columna(P, EL.piso.r, a, 0, 99, ['crema'], k), `cementerio ${a}`).toBeGreaterThan(0.8);
    expect(LUGARES.patio_liceo_caracas.techado).toBe(true);
    // las 4 lámparas del techo de la cancha y una más en cada margen (lote E4)
    expect(EL.luces.filter((l) => l.encendida)).toHaveLength(6);
  });

  it('Cartagena calza con Azoteas.ts: TECHO 262, la cajita en x 428, la raya del borde en x 440, la calle en 352 y lo que corre cada ronda', () => {
    const P = COLOMBIA_CARTAGENA_ATARDECER;
    expect([AZOTEA.techo, AZOTEA.borde, AZOTEA.caja, AZOTEA.calle]).toEqual([262, 440, 428, 352]);
    expect(CTG.franja.atras + CTG.carriles[0].y).toBe(352);
    // la cajita roja y la raya blanca del borde, en la azotea de salida
    expect(hex(ET.cerca.r, AZOTEA.caja - 4, AZOTEA.baldosa + 6)).toBe(P.rojo);
    expect(hex(ET.cerca.r, AZOTEA.caja, AZOTEA.baldosa + 6)).toBe(P.vino);
    for (let y = AZOTEA.baldosa; y < AZOTEA.techo; y++) expect(hex(ET.cerca.r, AZOTEA.borde - 1, y), `borde ${y}`).toBe(P.luz);
    // el techo de enfrente arranca 16 px antes (el balcón que sale al hueco) y se apoya en la fila 250, como en el juego
    const techo = ET.objetos.find((o) => o.id === 'techo_enfrente')!, ent = CTG.entidades.find((e: { objeto?: string }) => e.objeto === 'techo_enfrente');
    expect([techo.x, techo.y, techo.img.w, techo.orden]).toEqual([ent.x - 16, AZOTEA.techo - 12, AZOTEA.ancho + 16, 0]);
    // la colchoneta azul donde caen, en la esquina de la azotea de enfrente
    expect(hex(techo.img.r, 16 + 20, 6)).toBe(P.azul);
    // el carrito pegado a la pared de enfrente (x - 15) y apoyado en la calle
    const carrito = ET.objetos.find((o) => o.id === 'carrito_frutas')!;
    expect(carrito.x + carrito.img.w / 2).toBe(ent.x - 15);
    expect(Math.abs(carrito.y + carrito.img.h - 1 - AZOTEA.calle)).toBeLessThanOrEqual(1);
    // la palenquera en la acera de este lado (BORDE - 8) como NPC
    expect(CTG.entidades.find((e: { tipo: string }) => e.tipo === 'npc')).toMatchObject({ npc: 'palenquera', x: AZOTEA.borde - 8 });
    expect(ET.particulas.length).toBeGreaterThan(0);
  });

  it('la vida que va sobre lo pintado tapa entero: el cuadro 0 calza con la capa cerca, y los otros cambian', () => {
    for (const E of TODAS) for (const v of E.vida.filter((q) => q.capa === 'cerca')) {
      const c = v.cuadros[0].r;
      for (let y = 0; y < c.h; y += 2) for (let x = 0; x < c.w; x += 3) expect(hex(c, x, y), `${E.layout.id} ${v.id} ${x},${y}`).toBe(hex(E.cerca.r, v.x + x, v.y + y));
      expect(v.cuadros.slice(1).some((q) => !iguales(q.r, c)), `${E.layout.id} ${v.id}`).toBe(true);
    }
  });

  it('un actor en una x con decimales sale igual que en la x redondeada (no se descuadran los colores)', () => {
    const img = createRaster(6, 6);
    for (let i = 0; i < 36; i++) img.data.set([200, 40, 30, 255], i * 4);
    const a = postal(EC, 100, [{ img, px: 3, py: 5, x: 300, y: 46 }]), b = postal(EC, 100, [{ img, px: 3, py: 5, x: 300.4, y: 46.2, z: 0.3 }]);
    expect(iguales(a, b)).toBe(true);
  });

  it('el peso: luces, vida y objetos sin pasarse en ninguno', () => {
    for (const E of TODAS) {
      expect(E.luces.length, E.layout.id).toBeLessThanOrEqual(12);
      expect(E.vida.length, E.layout.id).toBeLessThanOrEqual(16);
      expect(E.objetos.length, E.layout.id).toBeLessThanOrEqual(24);
    }
    expect(EC.luces).toEqual([]);
    expect(EH.luces).toEqual([]);
  });

  it('la palenquera: pregonar y reclamar de frente, con la ponchera de frutas que cabe en la celda de 48', () => {
    const r = npcTira('palenquera', CFG.npc.personajes.palenquera, { palenquera: FICHA_PAL }, 48);
    if (typeof r === 'string') throw new Error(r);
    expect(r.entrada).toMatchObject({ w: 48, h: 48, ancla: [24, 46], anims: { pregonar: { desde: 0, loop: true }, reclamar: { loop: false } } });
    // la ponchera es más ancha que la cabeza, y las frutas no se salen por arriba de la celda (la fila 0 queda libre)
    for (let i = 0; i < r.tira.w / 48; i++) for (let x = 0; x < 48; x++) expect(r.tira.data[(i * 48 + x) * 4 + 3], `cuadro ${i} x ${x}`).toBe(0);
    for (const dir of ['down', 'right', 'up'] as const) {
      const px = pixelesGorro('ponchera', dir, { x: 20, y: 10, w: 16, h: 18 });
      expect(px.some((p) => p.hex === '#d83e34'), dir).toBe(true);
      const xs = px.filter((p) => p.y < 10).map((p) => p.x);
      expect(Math.max(...xs) - Math.min(...xs), dir).toBeGreaterThan(16);
    }
    dorada('npc_e6', r.tira);
  });

  it('imagen dorada: los seis escenarios', () => {
    const out = createRaster(640, 360 * 6);
    TODAS.forEach((E, i) => blit(out, postal(E, 0, [], 640, 360, 2), 0, 360 * i));
    dorada('lugares_e6', out);
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
