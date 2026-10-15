import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { migrateFicha, isHuman, type HumanFicha } from '../index';
import type { Raster } from '../core/raster';
import { portrait, EXPRESSIONS } from '../kit/portraits';
import {
  medallas, banderas, podio, iconosPrueba, tarjetas, marcoVs4, marcoVs2, costuraVs4, pantallaRetro, iniciales, ICONOS_PRUEBA, BANDERAS, PODIO, VS4, VS2, PANTALLAS, TARJETA,
  type EquipoTarjeta,
} from '../ui/envoltorio';
import { glifosDe, figuraDe, banderaDe, PARTES_ENVOLTORIO } from '../kit/envoltorioKit';
import { halve } from '../kit/portraits';
import { UI_PARTS } from '../ui/retro';
import { bitmapFonts, drawText } from '../ui/fonts';
import { buildCustomKit, validateTeams, type KitConfig } from '../kit/custom';
import { ROOT } from './helpers';

const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
const D = join(ROOT, 'node_modules', '@fontsource', 'silkscreen', 'files');
const SILK = { regular: ab(join(D, 'silkscreen-latin-400-normal.woff')), bold: ab(join(D, 'silkscreen-latin-700-normal.woff')) };
const EJ = join(ROOT, 'docs', 'ejemplos', 'nekketsu');
const EQUIPOS = JSON.parse(readFileSync(join(EJ, 'equipos.json'), 'utf8')) as Record<string, { nombre: string; atletas: string[]; colores: string[]; pais: string; bandera?: string; escudo?: { emblema: string; texto?: string } }>;
const FICHAS: Record<string, HumanFicha> = Object.fromEntries(readdirSync(join(EJ, 'fichas')).filter((f) => f.endsWith('.ficha.json')).map((f) => [f.replace('.ficha.json', ''), migrateFicha(JSON.parse(readFileSync(join(EJ, 'fichas', f), 'utf8')))] as const).filter(([, f]) => isHuman(f)) as [string, HumanFicha][]);
const ATLETAS = Object.values(EQUIPOS).flatMap((e) => e.atletas);

const alpha = (r: Raster, x: number, y: number) => (x >= 0 && y >= 0 && x < r.w && y < r.h ? r.data[(y * r.w + x) * 4 + 3] : 0);
const col = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return (r.data[i] << 16) | (r.data[i + 1] << 8) | r.data[i + 2]; };
const rgb = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return [r.data[i], r.data[i + 1], r.data[i + 2]]; };
const lum = (r: Raster, x: number, y: number) => { const [a, b, c] = rgb(r, x, y); return a * 0.3 + b * 0.59 + c * 0.11; };
const igual = (a: Raster, b: Raster) => a.w === b.w && a.h === b.h && Buffer.from(a.data).equals(Buffer.from(b.data));

describe('retratos grandes redibujados a 96 (lote G2)', () => {
  it('los 24 atletas en las 8 expresiones: 96 x 96, distintas entre sí y con el contorno de un pixel', () => {
    expect(ATLETAS).toHaveLength(24);
    const malos: string[] = [];
    for (const id of ATLETAS) {
      const f = FICHAS[id];
      const grandes = EXPRESSIONS.map((e) => portrait(f, e, 'grande'));
      for (const [k, g] of grandes.entries()) {
        if (g.w !== 96 || g.h !== 96) malos.push(`${id} ${EXPRESSIONS[k]}: ${g.w}x${g.h}`);
        // el contorno de afuera es de un pixel: el que sigue hacia adentro ya no es del mismo color. Con el x3 de antes
        // esto daba 0 (los 3 pixeles del contorno iguales); ahora pasa de 0,3 aun con el pelo casi negro (Toto, Lan)
        let borde = 0, fino = 0;
        for (let y = 1; y < 95; y++) for (let x = 1; x < 95; x++) {
          if (!alpha(g, x, y)) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (alpha(g, x + dx, y + dy)) continue;
            borde++;
            if (alpha(g, x - dx, y - dy) && col(g, x - dx, y - dy) !== col(g, x, y)) fino++;
          }
        }
        if (fino / borde < 0.3) malos.push(`${id} ${EXPRESSIONS[k]}: contorno grueso (${fino}/${borde})`);
      }
      if (new Set(grandes.map((g) => Buffer.from(g.data).toString('base64'))).size !== EXPRESSIONS.length) malos.push(`${id}: hay expresiones iguales`);
    }
    expect(malos).toEqual([]);
  }, 300_000);

  it('el retrato chico sigue igual que antes: 40 x 40, sin escalar', () => {
    const c = portrait(FICHAS.rick, 'feliz', 'chico');
    expect([c.w, c.h]).toEqual([40, 40]);
  });
});

describe('medallas, banderas y podio', () => {
  it('oro, plata y bronce en 16, 32 y 64: la cinta arriba y el disco abajo, cada metal distinto', () => {
    const ms = medallas();
    expect(ms.map((m) => [m.name, m.w, m.h, m.frames.length])).toEqual([['medallas_16', 16, 16, 3], ['medallas_32', 32, 32, 3], ['medallas_64', 64, 64, 3]]);
    for (const m of ms) {
      expect(m.extra?.orden).toEqual(['oro', 'plata', 'bronce']);
      const [o, p, b] = m.frames;
      expect(igual(o, p) || igual(p, b) || igual(o, b)).toBe(false);
      // hay algo en la fila de arriba (la cinta) y el centro del disco cae debajo de la mitad
      expect([...Array(m.w).keys()].some((x) => alpha(o, x, 0))).toBe(true);
      const c = Math.round(m.w / 2);
      expect(alpha(o, c, Math.round(m.h * 0.68))).toBe(255);
    }
  });

  it('las 6 banderas quietas y ondeando, en 16 y 32, con sus colores en su sitio', () => {
    const bs = banderas();
    expect(bs).toHaveLength(BANDERAS.length * 2 * 2);
    for (const s of [16, 32]) for (const id of BANDERAS) {
      const q = bs.find((b) => b.name === `bandera_${id}_${s}`)!, o = bs.find((b) => b.name === `bandera_${id}_${s}_ondea`)!;
      expect(q.frames).toHaveLength(1);
      expect([o.frames.length, o.fps, o.loop, o.w, o.h]).toEqual([8, 10, true, q.w, q.h]);
      expect(new Set(o.frames.map((f) => Buffer.from(f.data).toString('base64'))).size).toBe(8);
    }
    // los colores: arriba y abajo de la de 32 quieta (contorno de 1 y margen de la onda de 2)
    const q = (id: string) => bs.find((b) => b.name === `bandera_${id}_32`)!.frames[0];
    const arriba = (id: string) => rgb(q(id), 5, 4), abajo = (id: string) => rgb(q(id), 5, q(id).h - 5), medio = (id: string) => rgb(q(id), Math.floor(q(id).w / 2), Math.floor(q(id).h / 2));
    expect(arriba('colombia')).toEqual([0xfc, 0xd1, 0x16]);
    expect(abajo('colombia')).toEqual([0xce, 0x11, 0x26]);
    expect(arriba('bogota')).toEqual([0xfc, 0xd1, 0x16]);
    expect(abajo('bogota')).toEqual([0xe1, 0x25, 0x1b]);
    expect(medio('japon')).toEqual([0xbc, 0x00, 0x2d]);
    expect(arriba('japon')).toEqual([0xff, 0xff, 0xff]);
    expect(arriba('vietnam')).toEqual([0xda, 0x25, 0x1d]);
    expect(medio('vietnam')).toEqual([0xff, 0xde, 0x00]);
    expect(arriba('zulia')).toEqual([0x2f, 0x7b, 0xd6]);
    expect(abajo('zulia')).toEqual([0x11, 0x11, 0x11]);
    expect(medio('zulia')).not.toEqual(arriba('zulia'));
    // Venezuela: las estrellas blancas en la franja azul
    const ve = q('venezuela');
    let blancas = 0;
    for (let y = 0; y < ve.h; y++) for (let x = 0; x < ve.w; x++) if (alpha(ve, x, y) && col(ve, x, y) === 0xffffff) blancas++;
    expect(blancas).toBeGreaterThanOrEqual(6);
  });

  it('el podio de 800 x 360 calza con el medallero: los cajones donde van los pies y arriba tranquilo', () => {
    const p = podio(glifosDe(SILK.bold));
    const r = p.frames[0];
    expect([r.w, r.h]).toEqual([800, 360]);
    expect(p.extra).toMatchObject({ margen: 80, puestos: PODIO.puestos });
    // en el medallero de 640: 1 en (320, 268), 2 en (240, 284), 3 en (400, 296)
    expect(Object.values(PODIO.puestos).map(([x, y]) => [x - 80, y])).toEqual([[320, 268], [240, 284], [400, 296]]);
    for (const [x, y] of Object.values(PODIO.puestos)) {
      expect(lum(r, x, y + 10), `${x},${y}`).toBeGreaterThan(150); // la cara del cajón, clara (debajo de la franja del metal)
      expect(lum(r, x, y - 2), `${x},${y}`).toBeGreaterThan(200); // la tapa
    }
    // los mástiles: el palo claro de arriba a abajo
    for (const m of PODIO.mastiles) for (let y = m.arriba; y <= m.abajo; y += 6) expect(lum(r, m.x, y)).toBeGreaterThan(150);
    // en la franja del título no hay ni cajones ni mástiles
    const [cx, cy, cw, ch] = PODIO.calma;
    for (const m of PODIO.mastiles) expect(m.arriba - 6).toBeGreaterThan(cy + ch);
    expect(Object.values(PODIO.cajones).every(([, top]) => top - 5 > cy + ch)).toBe(true);
    expect(cx + cw).toBeLessThanOrEqual(800);
  });
});

describe('íconos de prueba, tarjetas, VS de 4 y pantallas', () => {
  const atletas = ATLETAS.map((a) => FICHAS[a]);

  it('los 18 íconos (16 pruebas, Kachinuki y pelea) en 32 y en 16, todos distintos', () => {
    expect(ICONOS_PRUEBA.map((i) => i.id)).toEqual(['cross_country', 'obstaculos', 'vallas', 'natacion', 'jabalina', 'azoteas', 'tamawari', 'da_cau', 'tejo', 'quemado', 'chapita', 'voley', 'tenis', 'futbol', 'basket', 'judo', 'kachinuki', 'pelea']);
    const [g, m] = iconosPrueba(figuraDe(atletas), halve);
    expect([g.name, g.w, g.h, g.frames.length, m.name, m.w, m.h, m.frames.length]).toEqual(['iconos_prueba', 32, 32, 18, 'iconos_prueba_16', 16, 16, 18]);
    expect(new Set(g.frames.map((f) => Buffer.from(f.data).toString('base64'))).size).toBe(18);
    // el atleta está adentro: cada ícono tiene más colores que el cuadrito solo
    for (const f of g.frames) {
      const cs = new Set<number>();
      for (let y = 2; y < 30; y++) for (let x = 2; x < 30; x++) cs.add(col(f, x, y));
      expect(cs.size).toBeGreaterThan(10);
    }
  }, 120_000);

  it('una tarjeta de 184 x 104 y un escudo por equipo, con su bandera y la franja oscura de las caras', () => {
    const lista: EquipoTarjeta[] = Object.entries(EQUIPOS).map(([id, t]) => ({ id, nombre: t.nombre, colores: t.colores, bandera: banderaDe(t), escudo: t.escudo as EquipoTarjeta['escudo'] }));
    expect(lista.map((e) => e.bandera)).toEqual(['venezuela', 'japon', 'vietnam', 'bogota', 'venezuela', 'zulia']);
    const ps = tarjetas(lista, glifosDe(SILK.bold));
    expect(ps).toHaveLength(12);
    for (const e of lista) {
      const t = ps.find((p) => p.name === `tarjeta_${e.id}`)!, s = ps.find((p) => p.name === `escudo_${e.id}`)!;
      expect([t.w, t.h, s.w, s.h]).toEqual([184, 104, 48, 56]);
      const r = t.frames[0];
      // la franja de las caras más oscura que el campo de arriba
      const [rx, ry, rw, rh] = TARJETA.retratos;
      let dentro = 0, n = 0;
      for (let y = ry + 2; y < ry + rh - 2; y++) for (let x = rx + 2; x < rx + rw - 2; x++) { dentro += lum(r, x, y); n++; }
      expect(dentro / n).toBeLessThan(lum(r, 100, 28) - 10);
    }
  });

  it('los 6 nombres cortos del juego caben a 2 en su placa, sin tocar la bandera, el escudo ni las caras', () => {
    // como los escribe Select.ts: fuente_ui a 2, centrados en el medio de `texto`, teñidos con el color del equipo
    // aclarado. Phaser centra la línea entera de 11, así que a 2 la línea arranca 11 arriba del centro
    const ui = bitmapFonts(SILK.regular, SILK.bold).find((f) => f.name === 'fuente_ui')!;
    const CORTOS: Record<string, string> = { familia_gg: 'FAMILIA GG', instituto_nekketsu: 'INSTITUTO', rong_sai_gon: 'RỒNG SÀI GÒN', rolos_de_chapinero: 'ROLOS', panas_de_caracas: 'PANAS', maracuchos_del_lago: 'MARACUCHOS' };
    const lista: EquipoTarjeta[] = Object.entries(EQUIPOS).map(([id, t]) => ({ id, nombre: t.nombre, colores: t.colores, bandera: banderaDe(t), escudo: t.escudo as EquipoTarjeta['escudo'] }));
    const ps = tarjetas(lista, glifosDe(SILK.bold));
    const [tx, ty, tw, th] = TARJETA.texto, [nx, ny, nw, nh] = TARJETA.placa, [, ry, , rh] = TARJETA.retratos;
    expect(TARJETA.retratos).toEqual([8, 32, 168, 48]);
    expect(ny).toBe(ry + rh);
    for (const e of lista) {
      const nombre = CORTOS[e.id], r = ps.find((p) => p.name === `tarjeta_${e.id}`)!.frames[0];
      const t = drawText(ui, nombre, 2);
      expect(t.w - 8, nombre).toBeLessThanOrEqual(tw);
      const X = Math.round(tx + tw / 2 - t.w / 2), Y = ty + th / 2 - t.h / 2;
      const c = parseInt(e.colores[0].slice(1), 16), k = (v: number) => Math.round(v + (255 - v) * 0.55);
      const claro = 0.3 * k((c >> 16) & 255) + 0.59 * k((c >> 8) & 255) + 0.11 * k(c & 255);
      let tinta = 0;
      for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
        if (!t.data[(y * t.w + x) * 4 + 3]) continue;
        tinta++;
        const cx = X + x, cy = Y + y;
        // cada pixel del nombre cae sobre la placa oscura: ni bandera, ni escudo, ni la franja de las caras
        expect(cx >= nx && cx < nx + nw && cy >= ny && cy < ny + nh, `${nombre} en ${cx},${cy}`).toBe(true);
        expect(claro - lum(r, cx, cy), `${nombre} se lee en ${cx},${cy}`).toBeGreaterThan(90);
      }
      expect(tinta).toBeGreaterThan(100);
    }
  });

  it('las iniciales y la bandera por defecto salen del nombre y del país', () => {
    expect(iniciales('Los Panas de Caracas')).toBe('PC');
    expect(iniciales('Rồng Sài Gòn')).toBe('RS');
    expect(banderaDe({ nombre: 'x', atletas: [], pais: 'colombia' })).toBe('colombia');
    expect(banderaDe({ nombre: 'x', atletas: [], pais: 'colombia', bandera: 'bogota' })).toBe('bogota');
    expect(banderaDe({ nombre: 'x', atletas: [], pais: 'marte' })).toBeUndefined();
  });

  it('el archivo de equipos valida la bandera y el escudo', () => {
    const base = { nombre: 'A', atletas: ['rick'] };
    expect(validateTeams({ a: { ...base, bandera: 'bogota', escudo: { emblema: 'rayo' } } }, ['rick'], [])).toEqual([]);
    expect(validateTeams({ a: { ...base, bandera: 'bogot' } }, ['rick'], [])[0]).toMatch(/bandera.*"bogot".*bogota/);
    expect(validateTeams({ a: { ...base, escudo: { emblema: 'rayos' } } }, ['rick'], [])[0]).toMatch(/escudo.*rayo/);
    expect(validateTeams({ a: { ...base, escudo: { emblema: 'letras', texto: 'ABCD' } } }, ['rick'], [])[0]).toMatch(/de 1 a 3 letras/);
  });

  it('el VS de 4: dos huecos a cada lado de la costura, oscuros, y el centro libre para la palabra VS', () => {
    const v = marcoVs4(), r = v.frames[0];
    expect([r.w, r.h]).toEqual([800, 360]);
    const costura = costuraVs4;
    // la costura pasa por el centro de la imagen y por el centro de la palabra VS
    expect(costura(180)).toBe(400);
    const [vx, vy, vw, vh] = VS4.vs;
    expect(Math.abs(costura(vy + vh / 2) - (vx + vw / 2))).toBeLessThan(8);
    expect(lum(r, 400, 180)).toBeGreaterThan(200);
    VS4.huecos.forEach(([x, y, w, h], i) => {
      expect([w, h]).toEqual([96, 96]);
      expect(i < 2 ? x + w < costura(y + h) : x > costura(y)).toBe(true);
      expect(lum(r, x + 48, y + 48)).toBeLessThan(40);
      // y no se tapa con la palabra VS
      const [vx, , vw] = VS4.vs;
      expect(x + w <= vx || x >= vx + vw).toBe(true);
    });
  });

  it('el VS de 1 contra 1: un hueco de 96 por lado con marco de 16, la misma costura y el centro libre', () => {
    const v = marcoVs2(), r = v.frames[0];
    expect([v.name, r.w, r.h]).toEqual(['marco_vs_2', 800, 360]);
    // el mismo fondo del VS de 4, salvo donde van los marcos y las placas
    const r4 = marcoVs4().frames[0];
    expect([col(r, 400, 180), col(r, 30, 30), col(r, 770, 330)]).toEqual([col(r4, 400, 180), col(r4, 30, 30), col(r4, 770, 330)]);
    expect([VS2.vs, VS2.texto, VS2.nombres, VS2.frases, VS2.costura]).toEqual([VS4.vs, VS4.texto, VS4.nombres, VS4.frases, VS4.costura]);
    expect(VS2.huecos).toHaveLength(2);
    const [[ax, ay, aw, ah], [bx, by, bw, bh]] = VS2.huecos;
    // simétricos sobre el centro, en los centros que usa hoy el juego (150 y 490 de la parte de 640)
    expect([ax + aw / 2, bx + bw / 2, ay, by, aw, ah, bw, bh]).toEqual([230, 570, 102, 102, 96, 96, 96, 96]);
    const M = VS2.marco;
    VS2.huecos.forEach(([x, y, w, h], i) => {
      expect(lum(r, x + w / 2, y + h / 2)).toBeLessThan(40);
      // el marco entero queda de su lado de la costura, en la parte de 640 y sin tocar la palabra VS
      expect(i === 0 ? x + w + M < costuraVs4(y + h + M) : x - M > costuraVs4(y - M)).toBe(true);
      expect(x - M >= 80 && x + w + M <= 720).toBe(true);
      const [vx, , vw] = VS2.vs;
      expect(x + w + M <= vx || x - M >= vx + vw).toBe(true);
      // el borde de afuera es tinta y el de adentro también: el retrato no se pega al oro
      expect(lum(r, x - M, y + h / 2)).toBeLessThan(30);
      expect(lum(r, x - 1, y + h / 2)).toBeLessThan(30);
      expect(lum(r, x - M + 3, y + h / 2)).toBeGreaterThan(150);
      // la placa del nombre, oscura, bajo el marco
      expect(lum(r, x + w / 2, VS2.nombres)).toBeLessThan(30);
    });
    expect(v.extra).toMatchObject({ huecos: VS2.huecos, marco: 16, vs: VS4.vs, texto: VS4.texto, nombres: 246, frases: 268, costura: VS4.costura, margen: 80 });
  });

  it('las pantallas retro de 800 x 360: la pausa tramada (se ve la pelea por los huecos), las otras dos llenas', () => {
    const [pa, fin, otra] = (['pausa', 'se_acabo', 'otra_partidita'] as const).map((c) => pantallaRetro(c));
    expect([pa, fin, otra].map((p) => [p.name, p.w, p.h])).toEqual([['pantalla_pausa', 800, 360], ['pantalla_se_acabo', 800, 360], ['pantalla_otra_partidita', 800, 360]]);
    const huecos = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (!r.data[i]) n++; return n; };
    expect(huecos(pa.frames[0])).toBeGreaterThan(800 * 360 * 0.3);
    expect(huecos(fin.frames[0])).toBe(0);
    expect(huecos(otra.frames[0])).toBe(0);
    // la placa de la pausa es llena en el medio de la franja del texto
    const [qx, qy, qw, qh] = PANTALLAS.calma;
    expect(alpha(pa.frames[0], qx + qw / 2, qy + qh / 2)).toBe(255);
  });
});

describe('el envoltorio en el kit a medida', () => {
  it('ui.interfaz trae las piezas nuevas en el manifiesto, y se pueden pedir de a una', () => {
    expect(UI_PARTS.slice(8)).toEqual([...PARTES_ENVOLTORIO]);
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, ui: { interfaz: ['medallas', 'banderas', 'tarjetas', 'pantallas'] } };
    const equipos = { gg: { nombre: 'Familia GG', atletas: ['rick', 'steph', 'sophie', 'alana'], colores: ['#2a5bd7', '#f2c230'], bandera: 'venezuela', escudo: { emblema: 'letras', texto: 'GG' } } };
    const { files } = buildCustomKit(cfg, { fuentes: SILK, equipos }, { quick: true, solo: ['interfaz'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    const ids = Object.keys(m.ui.interfaz);
    expect(ids).toEqual(expect.arrayContaining(['medallas_16', 'medallas_64', 'bandera_zulia_32_ondea', 'tarjeta_gg', 'escudo_gg', 'pantalla_pausa', 'pantalla_se_acabo', 'pantalla_otra_partidita']));
    expect(ids.some((i) => i.startsWith('dialogo') || i === 'podio' || i.startsWith('iconos'))).toBe(false);
    expect(m.ui.interfaz.medallas_32).toMatchObject({ archivo: 'ui/medallas_32.png', w: 32, h: 32, cuadros: 3, orden: ['oro', 'plata', 'bronce'] });
    expect(m.ui.interfaz.bandera_vietnam_16_ondea).toMatchObject({ cuadros: 8, fps: 10, loop: true });
    expect(m.ui.interfaz.tarjeta_gg).toMatchObject({ w: 184, h: 104, texto: TARJETA.texto, retratos: TARJETA.retratos, placa: TARJETA.placa, bandera: 'venezuela' });
    for (const e of Object.values<{ archivo: string }>(m.ui.interfaz)) expect(files.some((f) => f.name === e.archivo), e.archivo).toBe(true);
    // `marco_vs` trae los dos marcos: el de 4 de siempre y el de 1 contra 1
    const vs = buildCustomKit({ ...cfg, ui: { interfaz: ['marco_vs'] } }, { fuentes: SILK, equipos }, { quick: true, solo: ['interfaz'] });
    const mv = JSON.parse(new TextDecoder().decode(vs.files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(Object.keys(mv.ui.interfaz)).toEqual(['marco_vs_4', 'marco_vs_2']);
    expect(mv.ui.interfaz.marco_vs_2).toMatchObject({ archivo: 'ui/marco_vs_2.png', w: 800, h: 360, huecos: VS2.huecos, marco: 16, vs: VS2.vs, texto: VS2.texto, nombres: 246, frases: 268 });
  }, 120_000);
});
