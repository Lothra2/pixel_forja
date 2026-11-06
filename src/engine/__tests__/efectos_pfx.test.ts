import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { EFECTOS_PFX, efectoPfx, pngsEfectoPfx, paginasEfectoPfx, pintarEfectoPfx, armarCuadroPfx, olvidarEfectosPfx, luzEfectosPfxJson, CREDITOS_PFX, LEEME_PFX, LADO_MAX, PX_MAX, type ManifiestoPfx } from '../gotico/efectos_pfx';
import { decodePng } from '../export/png';
import { EFECTOS } from '../gotico/vendor/pixelfx/fx/indice.js';
import { DIRS_PODER } from '../gotico/poderes';

const ruta = (r: string) => fileURLToPath(new URL(r, import.meta.url));
const MANIFIESTO = JSON.parse(readFileSync(ruta('../gotico/datos/efectos_pfx.json'), 'utf8')) as ManifiestoPfx;
const LUZ = JSON.parse(readFileSync(ruta('../gotico/datos/luz_efectos_pfx.json'), 'utf8'));
/** monstruos y jefes del juego (juego/src/datos/monstruos.ts y los jefes de juego/src/mundo/actos*.ts) */
const MONSTRUOS = ('zombi necrofago penitente esqueleto esqueleto_arquero ahogado monja_hueca cultista caballero_muerto verdugo abadesa saqueador momia chacal satiro ' +
  'rey_sin_sombra cazacabezas hombre_cienaga bruja diablillo brujo_diablillo madre_cienaga escarchado espectro ogro rey_escarcha carcelero caballero_abismo lich ' +
  'senor_demonio heraldo lobo_sombrio jabali_demonio perro_infernal arana_cueva arana_reina escorpion_gigante gusano_de_arena golem_de_piedra gargola murcielago_gigante ' +
  'demonio_alado dragon_oseo cangrejo_cripta desollado sin_rostro aparecida bandido ballestero_oscuro gigante_helado guardia_corrupto sacerdote_caido segador ' +
  'trol_pantano hechicera_sangre caballero_espectral aun_saar campana_ahoga ' +
  // modificadores de élite
  'rapido piel_piedra ardiente helado electrico vampiro maldito fuerte espectral').split(' ');
const CLASES = ['berserker', 'templario', 'arcanista', 'cazadora', 'nigromante', 'monje', 'druida', 'alquimista'];
/** lo que Rick pidió dejar afuera: no puede colarse */
const EXCLUIDOS = [
  /^scifi\//, /^ui\//, /^moves\//, 'explosions/firework-burst', 'explosions/firework-rocket', 'explosions/nuke', 'explosions/grenade', 'explosions/cartoon-pow',
  'explosions/plasma-explosion', 'lightning/tesla-coil', 'lightning/plasma-ball', 'weather/cherry-blossoms', 'weather/shooting-stars', 'critters/butterfly',
  'pickups/heart-pickup', 'pickups/power-star', 'status/charmed', 'spawn/egg-hatch', 'impacts/bullet-impact', 'impacts/impact-frame', 'fire/torch',
  'fire/brazier', 'fire/campfire', 'fire/candle', 'status/burning', 'fire/flamethrower', /^projectiles\/(bullet|cannon|energy|flare|homing|laser|muzzle|plasma|rocket)/,
];

/** Bucles cuyo salto al empezar es el efecto mismo (el arco que se vuelve a encender). */
const COSTURA_A_PROPOSITO = ['fx_arco_chispas'];

/** Tiempo por prueba: la corrida completa pinta todos los efectos y tarda. */
const TIEMPO = process.env.PFX_COMPLETO === '1' ? 3_600_000 : 180_000;

/** Los que se pintan en cada corrida: las seis muestras y uno por categoría. Con PFX_COMPLETO=1, todos. */
const MUESTRA = (() => {
  if (process.env.PFX_COMPLETO === '1') return EFECTOS_PFX.map((c) => c.id);
  const ids = new Set(['fx_bola_fuego', 'fx_nova_escarcha', 'fx_tajo_espada', 'fx_envenenado', 'fx_lluvia', 'fx_murcielago']);
  const vistas = new Set<string>();
  for (const c of EFECTOS_PFX) if (!vistas.has(c.categoria)) { vistas.add(c.categoria); ids.add(c.id); }
  return [...ids].filter((id) => EFECTOS_PFX.some((c) => c.id === id));
})();

describe('efectos de pixelfx: catálogo y créditos', () => {
  it('los créditos de pixelfx van con el código y con lo exportado', () => {
    const lic = readFileSync(ruta('../gotico/vendor/pixelfx/LICENSE'), 'utf8');
    expect(lic).toMatch(/MIT License/);
    expect(lic).toMatch(/Patch/);
    expect(lic).toMatch(/Hugo Duprez/);
    const notice = readFileSync(ruta('../gotico/vendor/pixelfx/NOTICE.md'), 'utf8');
    expect(notice).toMatch(/Hollow Crown/);
    const aviso = readFileSync(ruta('../../../AVISOS_TERCEROS.md'), 'utf8');
    for (const s of ['pixelfx', 'Patch', 'Hugo Duprez', 'Hollow Crown', 'MIT', 'vendor/pixelfx/LICENSE']) expect(aviso).toContain(s);
    for (const s of ['pixelfx', 'Patch', 'Hugo Duprez', 'Hollow Crown', 'MIT']) expect(CREDITOS_PFX).toContain(s);
    expect(LEEME_PFX).toContain(CREDITOS_PFX);
    expect(MANIFIESTO.creditos).toBe(CREDITOS_PFX);
    // la fuente de la galería de pixelfx no es MIT: no se copia
    expect(existsSync(ruta('../gotico/vendor/pixelfx/gallery'))).toBe(false);
  });

  it('cada efecto del catálogo es único, existe en pixelfx y no está en la lista de excluidos', () => {
    const ids = EFECTOS_PFX.map((c) => c.id), origenes = EFECTOS_PFX.map((c) => c.origen);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(origenes).size).toBe(origenes.length);
    for (const c of EFECTOS_PFX) {
      expect(c.id, c.id).toMatch(/^fx_[a-z0-9_]+$/);
      expect(EFECTOS[c.origen], c.origen).toBeDefined();
      for (const x of EXCLUIDOS) expect(typeof x === 'string' ? c.origen === x : x.test(c.origen), `${c.origen} está excluido`).toBe(false);
      expect(c.nombre[0].length && c.nombre[1].length, c.id).toBeTruthy();
      expect(c.uso.length, `${c.id} sin uso sugerido`).toBeGreaterThan(0);
      for (const u of c.uso) {
        if (u.tipo === 'poder') expect(CLASES, c.id).toContain(u.clase);
        if (u.tipo === 'monstruo') for (const m of u.monstruos) expect(MONSTRUOS, `${c.id}: ${m}`).toContain(m);
        if (u.tipo === 'clima' || u.tipo === 'ambiente') for (const z of u.zonas ?? []) expect(z, c.id).toMatch(/^a[1-7]_[a-z0-9_]+$/);
      }
    }
  });
});

describe('efectos de pixelfx: manifiesto sincronizado', () => {
  it('el json tiene los mismos efectos, en orden, con los datos del catálogo', () => {
    expect(MANIFIESTO.formato).toBe('pixelforja-gotico-efectos-pfx');
    expect(MANIFIESTO.cuadros_por_segundo).toBe(25);
    expect(MANIFIESTO.efectos.map((e) => e.id)).toEqual(EFECTOS_PFX.map((c) => c.id));
    for (const c of EFECTOS_PFX) {
      const e = MANIFIESTO.efectos.find((x) => x.id === c.id)!;
      expect(e.origen).toBe(c.origen);
      expect(e.nombre).toEqual(c.nombre);
      expect(e.categoria).toBe(c.categoria);
      expect(e.capa).toBe(c.capa ?? 'mundo');
      expect(e.uso).toEqual(JSON.parse(JSON.stringify(c.uso)));
      expect(e.bucle).toBe(!!EFECTOS[c.origen].meta.loop);
      expect(e.direccional).toBe(!!c.dir);
      expect(e.direcciones.map((d) => d.dir)).toEqual(c.dir ? [...DIRS_PODER] : [null]);
      expect(e.paginas[0].archivo).toBe(`${c.id}.png`);
    }
  });

  it('límites del atlas en la exportación real: páginas de 4096 px y 4 Mpx como mucho, 150 Mpx y 15 MB en total', () => {
    let mpx = 0, bytes = 0;
    for (const e of MANIFIESTO.efectos) {
      expect(e.paginas.length, e.id).toBeGreaterThan(0);
      for (const p of e.paginas) {
        expect(p.w <= LADO_MAX && p.h <= LADO_MAX, `${e.id} ${p.archivo} ${p.w}x${p.h}`).toBe(true);
        expect(p.w * p.h, `${e.id} ${p.archivo}`).toBeLessThanOrEqual(PX_MAX);
        bytes += p.bytes;
      }
      const peso = e.paginas.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
      expect(Math.abs(e.peso - peso), e.id).toBeLessThan(0.006);
      mpx += peso;
      // cada cuadro apunta a una página que existe y cae adentro; los espejos apuntan a una dirección guardada
      for (const d of e.direcciones) {
        if (d.espejo) { expect(e.direcciones.find((x) => x.dir === d.de && !x.espejo), `${e.id} ${d.dir}`).toBeDefined(); continue; }
        expect(d.cuadros!.length, e.id).toBe(e.cuadros);
        for (const [p, x, y, w, h] of d.cuadros!) {
          if (!w) continue;
          const pg = e.paginas[p];
          expect(pg && x >= 0 && y >= 0 && x + w <= pg.w && y + h <= pg.h, `${e.id} cuadro fuera de la página`).toBe(true);
        }
      }
      // golpes e impactos nunca por debajo de 12.5 cuadros por segundo
      if (['impactos', 'cuerpo_a_cuerpo'].includes(e.categoria)) expect(e.t, e.id).toBeLessThanOrEqual(2);
    }
    expect(mpx, `total ${mpx.toFixed(1)} Mpx`).toBeLessThanOrEqual(150);
    expect(bytes / 1024 / 1024, 'MB de PNG').toBeLessThanOrEqual(15);
  });

  it('la luz del json es la del manifiesto, con una curva por cuadro', () => {
    expect(LUZ).toEqual(JSON.parse(JSON.stringify(luzEfectosPfxJson(MANIFIESTO))));
    for (const e of MANIFIESTO.efectos) {
      const l = e.luz;
      expect(l.curva.length, e.id).toBe(e.cuadros);
      expect(l.curva.every((k) => k >= 0 && k <= 1), e.id).toBe(true);
      expect(l.color, e.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(l.intensidad >= 0 && l.intensidad <= 1, e.id).toBe(true);
      if (l.intensidad > 0) {
        expect(l.radio, e.id).toBeGreaterThan(40);
        expect(Math.max(...l.curva), e.id).toBeGreaterThan(0.5);
      }
      if (!e.bucle && l.intensidad > 0) expect(l.curva[l.curva.length - 1], e.id).toBeLessThan(0.35);
    }
  });

  it(`lo medido coincide con el json (${MUESTRA.length} efectos pintados)`, () => {
    for (const id of MUESTRA) {
      const e = efectoPfx(id), j = MANIFIESTO.efectos.find((x) => x.id === id);
      expect(JSON.parse(JSON.stringify(e)), id).toEqual(j);
      olvidarEfectosPfx(id);
    }
  }, TIEMPO);
});

describe('efectos de pixelfx: hojas', () => {
  const alfa = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4 + 3];

  it('nada cortado en el borde, sin fondo opaco y los que pasan una vez terminan vacíos', () => {
    for (const id of MUESTRA) {
      const e = efectoPfx(id), dirs = e.direccional ? 8 : 1;
      expect(e.cuadros, id).toBeGreaterThan(1);
      expect([1, 2, 3, 4]).toContain(e.t);
      expect(e.escala).toBe(e.capa === 'pantalla' ? 1 : 2);
      for (let d = 0; d < dirs; d++)
        for (let f = 0; f < e.cuadros; f++) {
          const { img: q, ancla } = pintarEfectoPfx(id, d, f);
          const { w, h } = q;
          if (f === 0 && e.capa !== 'pantalla') expect(ancla[0] >= 0 && ancla[0] <= w && ancla[1] >= 0 && ancla[1] <= h, `${id} ancla fuera`).toBe(true);
          let opaco = 0, borde = 0;
          for (let i = 3; i < q.data.length; i += 4) if (q.data[i] === 255) opaco++;
          if (e.capa !== 'pantalla') {
            for (let x = 0; x < w; x++) borde = Math.max(borde, alfa(q.data, w, x, 0), alfa(q.data, w, x, h - 1));
            for (let y = 0; y < h; y++) borde = Math.max(borde, alfa(q.data, w, 0, y), alfa(q.data, w, w - 1, y));
            expect(borde, `${id} toca el borde (dir ${d}, cuadro ${f})`).toBeLessThan(8);
          }
          if (e.categoria !== 'transiciones') expect(opaco / (w * h), `${id} fondo opaco (cuadro ${f})`).toBeLessThan(0.5);
        }
      if (!e.bucle && e.capa !== 'pantalla') {
        const { img: q } = pintarEfectoPfx(id, 0, e.cuadros - 1);
        let s = 0;
        for (let i = 3; i < q.data.length; i += 4) s += q.data[i];
        expect(s / 255 / (q.w * q.h), `${id} no termina vacío`).toBeLessThan(0.02);
      }
      olvidarEfectosPfx(id);
    }
  }, TIEMPO);

  it('el atlas (recorte, desplazamiento, espejo y escala) arma cada cuadro idéntico al render sin optimizar', () => {
    // uno direccional, uno de piso y uno de pantalla
    for (const id of ['fx_bola_fuego', 'fx_nova_escarcha', 'fx_lluvia']) {
      const e = efectoPfx(id), dirs = e.direccional ? 8 : 1;
      const decod = pngsEfectoPfx(id).map((b) => decodePng(b)), crudas = paginasEfectoPfx(id);
      if (id === 'fx_bola_fuego') expect(e.direcciones.filter((d) => d.espejo).map((d) => d.dir)).toEqual(['ne', 'e', 'se']);
      let err = 0, n = 0;
      for (let d = 0; d < dirs; d++)
        for (let f = 0; f < e.cuadros; f++) {
          const ref = pintarEfectoPfx(id, d, f), arm = armarCuadroPfx(id, d, f, crudas);
          expect(arm.ancla, id).toEqual(ref.ancla);
          expect([arm.img.w, arm.img.h], id).toEqual([ref.img.w, ref.img.h]);
          // idéntico pixel a pixel
          let distintos = 0;
          for (let i = 0; i < ref.img.data.length; i++) if (ref.img.data[i] !== arm.img.data[i]) distintos++;
          expect(distintos, `${id} dir ${d} cuadro ${f}`).toBe(0);
          // desde el PNG exportado: la forma (alfa > 0) es la misma y el color solo cambia lo que cuantiza la paleta
          const png = armarCuadroPfx(id, d, f, decod);
          for (let i = 0; i < ref.img.data.length; i += 4) {
            expect(ref.img.data[i + 3] > 0, `${id} forma`).toBe(png.img.data[i + 3] > 0);
            // error de color pesado por el alfa (lo casi transparente casi no se ve)
            const al = ref.img.data[i + 3] / 255;
            if (al) { err += al * (Math.abs(ref.img.data[i] - png.img.data[i]) + Math.abs(ref.img.data[i + 1] - png.img.data[i + 1]) + Math.abs(ref.img.data[i + 2] - png.img.data[i + 2])); n += al * 3; }
          }
        }
      expect(err / n, `${id} error medio de paleta`).toBeLessThan(8);
      olvidarEfectosPfx(id);
    }
  }, TIEMPO);

  it('los bucles empalman sin salto', () => {
    const dif = (a: Uint8ClampedArray, b: Uint8ClampedArray) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s; };
    for (const id of MUESTRA) {
      const e = efectoPfx(id);
      // la escalera de Jacob vuelve a encender el arco al pie (destello blanco) justo al empezar cada vuelta: es su ciclo
      if (!e.bucle || COSTURA_A_PROPOSITO.includes(id)) continue;
      const di = e.direccional ? 6 : 0, n = e.cuadros;
      // la costura (último -> primero) no salta más que el paso más grande entre cuadros seguidos
      let paso = 0;
      for (let f = 0; f + 1 < n; f++) paso = Math.max(paso, dif(pintarEfectoPfx(id, di, f).img.data, pintarEfectoPfx(id, di, f + 1).img.data));
      const costura = dif(pintarEfectoPfx(id, di, n - 1).img.data, pintarEfectoPfx(id, di, 0).img.data);
      expect(costura, `${id}: costura ${costura} vs paso ${paso}`).toBeLessThanOrEqual(paso * 1.15 + 1);
      olvidarEfectosPfx(id);
    }
  }, TIEMPO);

  it('es determinista: dos pintadas dan el mismo png', () => {
    for (const id of MUESTRA.slice(0, 6)) {
      const a = createHash('sha1').update(Buffer.concat(pngsEfectoPfx(id))).digest('hex');
      olvidarEfectosPfx(id);
      const b = createHash('sha1').update(Buffer.concat(pngsEfectoPfx(id))).digest('hex');
      olvidarEfectosPfx(id);
      expect(a, id).toBe(b);
    }
  }, TIEMPO);
});

