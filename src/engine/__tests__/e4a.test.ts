import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generarEscenario } from '../world/oblique';
import { validateLayout } from '../world/oblique/layout';
import { renderEscena, postal, type Escena } from '../world/oblique/escena';
import { estiloDe } from '../world/oblique/ficha';
import { camino, contraste } from '../world/oblique/verify';
import { NOMBRES, paletaVietnam, VIETNAM_MANANA, VIETNAM_MEDIODIA, VIETNAM_TARDE_DORADA, VIETNAM_TARDE_AGUACERO, VIETNAM_TORMENTA, VIETNAM_ATARDECER, type Paleta } from '../world/oblique/paleta';
import { VIETNAM_HOIAN_NOCHE } from '../world/oblique/hoianPaleta';
import { COLOMBIA_MANANA, paletaColombia } from '../world/oblique/colombiaPaleta';
import { VIETNAM_DOJO_TARDE, VIETNAM_TAODAN_AMANECER, COLOMBIA_CANDELARIA_TARDE } from '../world/oblique/lugaresPaleta';
import { VENTANALES, BANDERA, TORRE, ZONA } from '../world/oblique/dojo';
import { CANCHA, TAI_CHI, PASTO } from '../world/oblique/taodan';
import { VENTANAS, MONSERRATE, LETRERO, CAJA, RAYA } from '../world/oblique/candelaria';
import { LUGARES } from '../world/oblique/lugares';
import { encodePng, decodePng, createRaster, blit, type Raster } from '../index';
import { ROOT } from './helpers';

const raw = (id: string) => JSON.parse(readFileSync(`docs/ejemplos/nekketsu/escenarios/${id}.layout.json`, 'utf8'));
const escena = (id: string) => renderEscena(validateLayout(raw(id)).layout!, 42, 0.35);
const JUDO = raw('judo_hanoi'), TAODAN = raw('tao_dan'), CAND = raw('candelaria');
const EJ = escena('judo_hanoi'), ET = escena('tao_dan'), EC = escena('candelaria');
const hex = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return r.data[i + 3] ? '#' + [0, 1, 2].map((k) => r.data[i + k].toString(16).padStart(2, '0')).join('') : null; };
const es = (P: Paleta, r: Raster, x: number, y: number, c: keyof Paleta) => hex(r, x, y) === P[c];
const iguales = (a: Raster, b: Raster) => Buffer.from(a.data).equals(Buffer.from(b.data));
const archivo = (r: ReturnType<typeof generarEscenario>, n: string) => r.archivos.find((a) => a.nombre === n)!.bytes;
const json = (r: ReturnType<typeof generarEscenario>, n: string) => JSON.parse(new TextDecoder().decode(archivo(r, n)));

describe('los escenarios de las pruebas nuevas (lote E4a)', () => {
  it('los tres pasan las 9 pruebas, sin avisos, cada uno con su estilo, su hora y su ficha', () => {
    const casos: [unknown, string, string, Paleta, number, string[]][] = [
      [JUDO, 'vietnam_dojo', 'tarde', VIETNAM_DOJO_TARDE, 10, ['publico', 'hojas_cayendo']],
      [TAODAN, 'vietnam_parque', 'amanecer', VIETNAM_TAODAN_AMANECER, 8, ['tai_chi', 'abuelos_ejercicio', 'pajaros', 'rayos_de_luz']],
      [CAND, 'colombia_colonial', 'tarde', COLOMBIA_CANDELARIA_TARDE, 10, ['banderines', 'publico', 'llovizna', 'humo_mechas']],
    ];
    for (const [layout, estilo, hora, pal, iconos, vida] of casos) {
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
      expect(new Set(NOMBRES.map((n) => pal[n])).size, estilo).toBe(24);
    }
    expect(EC.ficha.cajas).toEqual([expect.objectContaining({ tipo: 'caja_greda', cuantas: 1 })]);
    expect(EJ.ficha.letreros).toEqual(['VÕ ĐƯỜNG NHU ĐẠO HÀ NỘI', 'TÂM', 'NHẪN']);
  });

  it('las otras horas no cambian: Saigón, Hội An y la Comuna 13 siguen con su paleta, y cada lugar nuevo trae la suya por su fondo', () => {
    expect(paletaVietnam('manana')).toBe(VIETNAM_MANANA);
    expect(paletaVietnam('mediodia')).toBe(VIETNAM_MEDIODIA);
    expect(paletaVietnam('tarde')).toBe(VIETNAM_TARDE_DORADA);
    expect(paletaVietnam('tarde', ['aguacero'])).toBe(VIETNAM_TARDE_AGUACERO);
    expect(paletaVietnam('tarde', ['aguacero'], 'azoteas')).toBe(VIETNAM_TORMENTA);
    expect(paletaVietnam('atardecer')).toBe(VIETNAM_ATARDECER);
    expect(paletaVietnam('noche')).toBe(VIETNAM_HOIAN_NOCHE);
    expect(paletaVietnam('amanecer')).toBe(VIETNAM_MANANA);
    expect(paletaVietnam('tarde', [], 'rio')).toBe(VIETNAM_TARDE_DORADA);
    expect(paletaVietnam('tarde', [], 'dojo_hanoi')).toBe(VIETNAM_DOJO_TARDE);
    expect(paletaVietnam('amanecer', [], 'parque_tao_dan')).toBe(VIETNAM_TAODAN_AMANECER);
    expect(paletaColombia('manana', [], 'c13_casas_ladrillo')).toBe(COLOMBIA_MANANA);
    expect(paletaColombia('tarde', ['nublado'], 'cancha_tejo_candelaria')).toBe(COLOMBIA_CANDELARIA_TARDE);
    for (const id of ['saigon_hem', 'saigon_benthanh', 'saigon_rio', 'saigon_azoteas', 'saigon_estadio']) expect(estiloDe(validateLayout(raw(id)).layout!), id).toBe('vietnam');
    expect(estiloDe(validateLayout(raw('hoian')).layout!)).toBe('vietnam_hoian');
    expect(estiloDe(validateLayout(raw('medellin_c13')).layout!)).toBe('colombia_ladrillo');
  });

  it('un lugar nuevo a otra hora queda pendiente y dice qué horas pinta', () => {
    for (const [layout, hora, estilo, tiene] of [[TAODAN, 'manana', 'vietnam_parque', 'amanecer'], [JUDO, 'noche', 'vietnam_dojo', 'tarde'], [CAND, 'manana', 'colombia_colonial', 'tarde']] as const) {
      const r = generarEscenario({ ...layout, hora });
      expect(r).toMatchObject({ ok: false, pendiente: true });
      expect(r.errores.join()).toContain(`"${estilo}" todavía no tiene arte de ${hora} (hoy pinta: ${tiene})`);
    }
  });

  it('la vista de lado: el layout dice vista lado, el dibujo va derecho y escenario.json lo dice sin quitar nada', () => {
    expect(validateLayout({ ...TAODAN, vista: 'diagonal' }).errores.join()).toMatch(/`vista` "diagonal" no existe. Van: oblicua, lado/);
    for (const [layout, E] of [[TAODAN, ET], [CAND, EC]] as const) {
      // pida lo que pida la opción, de lado va en 0
      expect(E.inclinacion).toBe(0);
      expect(E.ancho).toBe(640);
      const r = generarEscenario(layout, { inclinacion: 0.35 });
      const ej = json(r, 'escenario.json'), FT = layout.franja.atras;
      expect(ej).toMatchObject({ inclinacion: 0, ancho: 640, vista: 'lado', franja: layout.franja });
      expect(ej.nota_vista).toMatch(/de lado: el dibujo va derecho/);
      // las mismas capas de siempre: el fondo es la capa cerca, de la fila 0 a franja.atras, y el piso llega al borde de abajo
      expect(Object.keys(ej.capas)).toEqual(['cielo', 'lejos', 'tras_cerca', 'cerca', 'piso', 'objetos', 'frente']);
      expect(ej.capas.cerca).toMatchObject({ y: 0, archivos: ['cerca_0.png'] });
      expect(ej.capas.piso).toMatchObject({ y: FT, archivos: ['piso_0.png'] });
      const piso = decodePng(archivo(r, 'piso_0.png')), cerca = decodePng(archivo(r, 'cerca_0.png'));
      expect([piso.w, piso.h]).toEqual([640, 360 - FT]);
      expect([cerca.w, cerca.h]).toEqual([640, FT]);
      // todo el piso pintado hasta abajo, y el frente libre
      for (let y = 0; y < piso.h; y++) for (let x = 0; x < 640; x += 7) expect(piso.data[(y * 640 + x) * 4 + 3], `${x},${y}`).toBe(255);
      expect(E.frente.r.data.some((v, i) => i % 4 === 3 && v > 0)).toBe(false);
    }
    // la vista oblicua no trae el campo: los escenarios de antes salen igual
    const ej = json(generarEscenario(JUDO), 'escenario.json');
    expect(ej.vista).toBeUndefined();
    expect(ej).toMatchObject({ inclinacion: 0.35, ancho: 674 });
  });

  it('Tao Đàn calza con DaCau.ts: las rayas de la cancha, las dos filas de atletas y el sitio de la red', () => {
    const FT = TAODAN.franja.atras;
    // el piso de DaCau.ts es la fila 310: las filas de atletas 304 y 316 son los carriles
    expect(TAODAN.carriles.map((c: { y: number }) => FT + c.y)).toEqual([304, 316]);
    // las rayas de atrás (fila 298) y de adelante (fila 322), de x 34 a 606 y de 28 a 612, donde las pone el juego
    const raya = (y: number, x0: number, x1: number) => { let n = 0; for (let x = x0; x <= x1; x++) if (es(VIETNAM_TAODAN_AMANECER, ET.piso.r, x, y, 'crema')) n++; return n / (x1 - x0 + 1); };
    expect(FT + CANCHA.atras).toBe(298);
    expect(FT + CANCHA.adelante).toBe(322);
    expect(raya(CANCHA.atras, 34, 606)).toBeGreaterThan(0.7);
    expect(raya(CANCHA.adelante, 28, 612)).toBeGreaterThan(0.7);
    expect(raya(CANCHA.atras, 0, 30)).toBe(0);
    // la red la pone el juego: el arte no pinta nada oscuro en la columna de la red, arriba de la cancha
    for (let y = 264; y < FT; y++) expect(['#1e1824', '#3a3040'], `fila ${y}`).not.toContain(hex(ET.cerca.r, 320, y));
    // el tai chi va en la vida: la capa cerca va sin la gente que se mueve
    const tai = ET.vida.find((v) => v.id === 'tai_chi')!;
    expect(tai.cuadros).toHaveLength(4);
    expect(iguales(tai.cuadros[0].r, tai.cuadros[1].r)).toBe(false);
    let ropa = 0;
    for (let y = PASTO - 22; y < PASTO + 14; y++) for (const x of TAI_CHI) for (let i = 0; i < 8; i++) if (es(VIETNAM_TAODAN_AMANECER, ET.cerca.r, x + i, y, 'rojo')) ropa++;
    expect(ropa).toBe(0);
    const quieto = renderEscena(validateLayout({ ...TAODAN, vida: [] }).layout!, 42, 0);
    let ropaQ = 0;
    for (let y = PASTO - 22; y < PASTO + 14; y++) for (const x of TAI_CHI) for (let i = 0; i < 8; i++) if (es(VIETNAM_TAODAN_AMANECER, quieto.cerca.r, x + i, y, 'rojo')) ropaQ++;
    expect(ropaQ).toBeGreaterThan(10);
    expect(quieto.vida).toEqual([]);
  });

  it('la cancha de tejo calza con Tejo.ts: la caja de greda, el bocín, la raya y el letrero donde el juego escribe', () => {
    const FT = CAND.franja.atras;
    expect(CAND.carriles.map((c: { y: number }) => FT + c.y)).toEqual([296, 300]);
    // la caja: de x 534 a 584, con el pie en la fila 300 (PISO), el palo de atrás hasta la 248 y la cara hasta la 250
    const caja = EC.objetos.find((o) => o.tipo === 'caja_greda')!;
    expect(caja).toMatchObject({ x: 534, origen: 'solidos' });
    expect(caja.img.w).toBe(50);
    expect(caja.y + caja.img.h).toBe(CAJA.piso);
    const enCaja = (sx: number, sy: number) => hex(caja.img.r, sx - caja.x, sy - caja.y);
    expect(enCaja(580, 248)).not.toBeNull();
    expect(enCaja(580, 246)).toBeNull();
    expect(enCaja(540, 298)).not.toBeNull();
    expect(enCaja(540, 260)).toBeNull();
    // el bocín: el aro de metal en (548, 280)
    expect([enCaja(CAJA.bocin[0] - 5, CAJA.bocin[1]), enCaja(CAJA.bocin[0] + 5, CAJA.bocin[1])]).toEqual([COLOMBIA_CANDELARIA_TARDE.asfalto, COLOMBIA_CANDELARIA_TARDE.asfalto]);
    // la raya de lanzamiento en x 104
    for (let y = 1; y < 23; y++) expect(hex(EC.piso.r, RAYA, y)).toBe(COLOMBIA_CANDELARIA_TARDE.ocre);
    // el letrero claro donde el juego escribe CANCHA DE TEJO en (440, 205) con #3a2418: se lee
    for (const [x, y] of [[440, 205], [410, 205], [470, 205]]) expect(contraste('#3a2418', hex(EC.cerca.r, x, y)!), `${x},${y}`).toBeGreaterThan(7);
    expect(LETRERO).toMatchObject({ x: 380, y: 196, w: 120 });
    // la llovizna es de afuera: bajo techo el piso no se moja
    expect(EC.pisoMojado).toBeNull();
    expect(EC.particulas.find((p) => p.tipo === 'humo')).toMatchObject({ x0: CAJA.x - 14 });
  });

  it('la caja de greda es más alta que el salto: en una arena se cuenta el piso, y un piso encerrado sigue fallando', () => {
    const L = validateLayout(CAND).layout!;
    expect(camino(L)).toMatchObject({ ok: true, detalle: expect.stringMatching(/se llega a todo el piso/) });
    // un muro de lado a lado más alto que el salto deja el piso de la derecha sin llegar
    const cerrado = validateLayout({ ...CAND, muros: [{ x: 300, y: 0, w: 10, d: 24, z: 60 }] }).layout!;
    expect(camino(cerrado).ok).toBe(false);
  });

  it('el dojo: el tatami verde y amarillo, la bandera, y por las ventanas la Torre de la Tortuga y Monserrate por la de la cancha', () => {
    // la zona de combate verde y la de seguridad amarilla (en el piso inclinado: x + 0.35 y)
    const en = (x: number, y: number) => hex(EJ.piso.r, x + Math.round(0.35 * y), y);
    expect([VIETNAM_DOJO_TARDE.verde, VIETNAM_DOJO_TARDE.menta]).toContain(en(330, 70));
    expect([VIETNAM_DOJO_TARDE.amarillo, VIETNAM_DOJO_TARDE.crema]).toContain(en(20, 70));
    expect([VIETNAM_DOJO_TARDE.amarillo, VIETNAM_DOJO_TARDE.crema]).toContain(en(330, 4));
    expect(en(ZONA.x0, 40)).toBe(VIETNAM_DOJO_TARDE.rojo);
    // la bandera de Vietnam: roja con la estrella amarilla en el centro
    expect(es(VIETNAM_DOJO_TARDE, EJ.cerca.r, BANDERA.x + BANDERA.w / 2, BANDERA.y + BANDERA.h / 2, 'amarillo')).toBe(true);
    expect(es(VIETNAM_DOJO_TARDE, EJ.cerca.r, BANDERA.x + 4, BANDERA.y + 4, 'rojo')).toBe(true);
    // los vidrios dejan ver la capa lejos, y la torre cae en un ventanal con la cámara de la pelea (x 0 a 247, paralaje 0.25)
    const v = VENTANALES[2];
    expect(EJ.cerca.has(v.x0 + 10, 150)).toBe(false);
    for (const cam of [0, 107, 247]) expect(VENTANALES.some((w) => TORRE.x - Math.floor(cam * 0.25) > w.x0 && TORRE.x - Math.floor(cam * 0.25) < w.x1), `cámara ${cam}`).toBe(true);
    // Monserrate con su iglesia por la ventana grande de la cancha de tejo (la cámara del tejo no se mueve)
    const yLejos = CAND.franja.atras - 30 - EC.lejos.h;
    expect(MONSERRATE.x).toBeGreaterThan(VENTANAS[0].x0);
    expect(MONSERRATE.x).toBeLessThan(VENTANAS[0].x1);
    expect(yLejos + MONSERRATE.y - 12).toBeGreaterThan(VENTANAS[0].y0);
    expect(es(COLOMBIA_CANDELARIA_TARDE, EC.lejos.r, MONSERRATE.x - 7, MONSERRATE.y - 3, 'luz')).toBe(true);
  });

  it('la vida que va sobre una pared tapa entero (el cuadro 0 calza con lo pintado) y la de los vidrios solo va donde se ve afuera', () => {
    for (const E of [EJ, EC]) for (const v of E.vida.filter((q) => q.tipo === 'publico' || q.tipo === 'banderines')) {
      const c = v.cuadros[0].r;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x += 3) expect(hex(c, x, y), `${v.id} ${x},${y}`).toBe(hex(E.cerca.r, v.x + x, v.y + y));
      expect(iguales(c, v.cuadros[1].r), v.id).toBe(false);
    }
    for (const [E, tipo] of [[EJ, 'hojas_cayendo'], [EC, 'llovizna']] as const) for (const v of E.vida.filter((q) => q.tipo === tipo)) {
      const c = v.cuadros[1].r;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.data[(y * c.w + x) * 4 + 3]) expect(E.cerca.has(v.x + x, v.y + y), `${v.id} ${x},${y}`).toBe(false);
    }
  });

  it('las luces y las partículas: el sol de la tarde y de la mañana, los bombillos y el humo de las mechas, sin pasarse', () => {
    for (const E of [EJ, ET, EC]) {
      expect(E.luces.length).toBeGreaterThanOrEqual(3);
      expect(E.luces.length).toBeLessThanOrEqual(12);
      expect(E.luces.every((l) => l.encendida)).toBe(true);
    }
    expect(Object.keys(LUGARES)).toEqual(['dojo_hanoi', 'parque_tao_dan', 'cancha_tejo_candelaria']);
  });

  it('las postales de un mundo de una pantalla van a 0, 2 y 4 segundos', () => {
    for (const layout of [JUDO, TAODAN, CAND]) {
      const r = generarEscenario(layout, { postales: true });
      const [a, b] = ['inicio', 'medio'].map((n) => decodePng(archivo(r, `postales/${n}.png`)));
      expect(iguales(a, b), layout.id).toBe(false);
    }
  });

  it('imagen dorada: Saigón de mañana y en la tarde dorada sale igual que antes del lote', () => {
    const out = createRaster(640, 360 * 2);
    blit(out, postal(escena('saigon_hem'), 0), 0, 0);
    blit(out, postal(escena('saigon_rio'), 1200), 0, 360);
    dorada('saigon_e4a', out);
  });

  it('imagen dorada: el dojo, Tao Đàn y la cancha de tejo', () => {
    const out = createRaster(640, 360 * 3);
    ([EJ, ET, EC] as Escena[]).forEach((E, i) => blit(out, postal(E, 0, [], 640, 360, 2), 0, 360 * i));
    dorada('lugares_e4a', out);
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
