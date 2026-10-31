import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { hayFfmpeg } from '../../../scripts/codificador-ffmpeg';
import Ajv from 'ajv';
import { buildCustomKit, kitConfigSchema, validateKitConfig, validateTeams, packAnims, type KitConfig } from '../kit/custom';
import { SPORT_PACKS, DEFAULT_SPORT_PACKS } from '../kit/sportskit';
import { HERO_RPG_ANIMS } from '../rpg/presets';
import { FLOOR_PROP_KINDS } from '../render/props';
import { COMIDAS } from '../render/comida';
import { duenoDe } from '../anim/pelea';
import { ROOT } from './helpers';

const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
const D = join(ROOT, 'node_modules', '@fontsource', 'silkscreen', 'files');
const SILK = { regular: ab(join(D, 'silkscreen-latin-400-normal.woff')), bold: ab(join(D, 'silkscreen-latin-700-normal.woff')) };
const EJ = join(ROOT, 'docs', 'ejemplos');
const EXAMPLES = ['nekketsu/kit.config.json', 'kit-deportivo.config.json', 'gg-abyss.config.json'];
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const SCHEMA_FILE = join(ROOT, 'docs', 'kit-a-medida.schema.json');
const validator = new Ajv({ allErrors: true }).compile(readJson(SCHEMA_FILE));
const MIN: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle', 'walk'] } };
const GIGANTES = ['goro', 'don_hernando'];
const CON_BURLA_PROPIA = ['rick', 'steph', 'sophie', 'alana', 'kenji', 'ryu', 'goro', 'tetsu'];

/** Corre la línea de comandos de verdad. */
const cli = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(ROOT, 'scripts', 'kit-a-medida.ts'), ...args], { cwd: ROOT, encoding: 'utf8' });
/** Ancho y alto de un PNG, de su cabecera. */
const pngSize = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
/** Todas las rutas a archivos que nombra el manifiesto (sin el #id de las cabecitas). */
const refsOf = (v: unknown, out = new Set<string>()): Set<string> => {
  if (typeof v === 'string' && /^[\w/.-]+\.(png|json|fnt|txt|wav|ogg|m4a|html|md)(#\w+)?$/.test(v)) out.add(v.split('#')[0]);
  else if (Array.isArray(v)) v.forEach((x) => refsOf(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => refsOf(x, out));
  return out;
};

describe('kit a medida (lote I): configuración', () => {
  it('docs/kit-a-medida.schema.json es el que sale del motor (no se desfasa)', () => {
    const now = JSON.stringify(kitConfigSchema(), null, 2) + '\n';
    if (process.env.UPDATE_GOLDEN) writeFileSync(SCHEMA_FILE, now);
    expect(readFileSync(SCHEMA_FILE, 'utf8')).toBe(now);
  });

  it('las configuraciones de ejemplo son válidas para el motor y para el esquema', () => {
    for (const f of EXAMPLES) {
      const cfg = readJson(join(EJ, f));
      expect(validateKitConfig(cfg), f).toEqual([]);
      expect(validator(cfg), `${f}: ${JSON.stringify(validator.errors)}`).toBe(true);
    }
  });

  it('el kit deportivo y el de GG Abyss se expresan como configuración', () => {
    const dep = readJson(join(EJ, 'kit-deportivo.config.json')) as KitConfig;
    expect(Object.keys(dep.packs)).toEqual([...DEFAULT_SPORT_PACKS]);
    for (const p of DEFAULT_SPORT_PACKS) expect(dep.packs[p], p).toEqual(SPORT_PACKS[p]);
    expect(dep.personajes_incluidos).toEqual(['familia', 'heroes']);
    const abyss = readJson(join(EJ, 'gg-abyss.config.json')) as KitConfig;
    expect(abyss.packs.rpg).toEqual([...HERO_RPG_ANIMS]);
    expect(abyss.personajes_incluidos).toEqual(['familia_rpg']);
  });

  it('los errores dicen el campo y sugieren el nombre correcto', () => {
    const errs = validateKitConfig({
      juego: 'X', pakcs: {}, personajes_incluidos: ['familai'], filas: ['rigth', 'down'], datos_por_cuadro: ['cajas', 'mano'],
      packs: { base: ['idle', 'wlak'], 'Pelea': ['jab'] }, pruebas: { calle: ['bse'] }, objetos: ['chancleta', 'paragua'],
      ui: { fuentes: { idiomas: ['es', 'fr'] }, colores: true }, celda: 50,
    });
    const has = (s: string) => expect(errs.some((e) => e.includes(s)), `${s}\n${errs.join('\n')}`).toBe(true);
    has('"pakcs": clave desconocida. ¿Quisiste decir "packs"?');
    has('personajes_incluidos[0]: "familai" no existe');
    has('¿Quisiste decir "familia"?');
    has('filas[0]: "rigth" no es una fila. ¿Quisiste decir "right"?');
    has('datos_por_cuadro[1]: "mano" no es un dato. ¿Quisiste decir "manos"?');
    has('packs.base[1]: "wlak" no es una animación. ¿Quisiste decir "walk"?');
    has('packs.Pelea: el nombre del pack va en minúsculas');
    has('pruebas.calle[0]: el pack "bse" no está en packs. ¿Quisiste decir "base"?');
    has('objetos[1]: "paragua" no es un arma del piso ni una comida. ¿Quisiste decir "paraguas"?');
    has('ui.fuentes.idiomas[1]: "fr" todavía no está');
    has('ui.colores: clave desconocida');
    has('celda: tiene que ser');
    expect(validateKitConfig({ packs: { base: ['idle'] } })).toEqual(expect.arrayContaining([
      'juego: falta el nombre del juego',
      'faltan personajes: pon "fichas" (una carpeta con *.ficha.json) o "personajes_incluidos"',
    ]));
    expect(validateKitConfig(MIN)).toEqual([]);
    // el esquema rechaza lo mismo
    expect(validator({ ...MIN, packs: { base: ['wlak'] } })).toBe(false);
    expect(validator({ ...MIN, pakcs: {} })).toBe(false);
    expect(validator({ juego: 'X', packs: { base: ['idle'] } })).toBe(false);
  });

  it('los equipos se revisan contra las fichas y los animales', () => {
    const errs = validateTeams({
      azul: { nombre: 'Azul', atletas: ['rick', 'stpeh'], mascota: 'tohr' },
      rojo: { nombre: 'Rojo', atletas: ['rick'] },
      'Verde!': { atletas: [] },
    }, ['rick', 'steph'], ['thor']);
    expect(errs).toEqual(expect.arrayContaining([
      'equipos.azul.atletas[1]: no hay ficha de "stpeh". ¿Quisiste decir "steph"?',
      'equipos.azul.mascota: no hay ficha del animal "tohr". ¿Quisiste decir "thor"?',
      'equipos.rojo.atletas[0]: "rick" ya está en el equipo azul',
      'equipos.Verde!: el id va en minúsculas, números y _',
      'equipos.Verde!.nombre: falta',
    ]));
  });

  it('buildCustomKit junta todos los problemas en un solo error', () => {
    expect(() => buildCustomKit({ ...MIN, packs: { base: ['wlak'] }, ui: { fuentes: true } }))
      .toThrowError(/2 problemas:\n {2}packs\.base\[0\]: "wlak".*\n {2}ui: faltan los archivos de Silkscreen/);
  });

  it('vehículos (lote D2): una tira por vehículo con ancla, huella y animaciones; "moto" son los 4 colores', () => {
    const { files, warnings } = buildCustomKit({ ...MIN, vehiculos: ['ferry', 'moto', 'transmilenio'] }, {}, { quick: true, solo: ['vehiculos'] });
    expect(warnings).toEqual(['vehiculos: todavía no existen (se saltan): transmilenio']);
    const names = files.map((f) => f.name).filter((n) => n.startsWith('vehiculos/')).sort();
    expect(names).toEqual(['vehiculos/ferry.png', 'vehiculos/moto_amarillo.png', 'vehiculos/moto_azul.png', 'vehiculos/moto_rojo.png', 'vehiculos/moto_verde.png']);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.vehiculos.ferry).toMatchObject({ archivo: 'vehiculos/ferry.png', huella: { w: 110, d: 40, z: 12 }, anims: { andando: { desde: 0, cuadros: 4 }, atracado: { desde: 4, cuadros: 2 } } });
    expect(m.vehiculos.moto_rojo).toMatchObject({ mira: 'izquierda', anims: { andando: {}, frenando: {}, corneta: {} } });
    const png = files.find((f) => f.name === 'vehiculos/ferry.png')!;
    expect(pngSize(Buffer.from(png.bytes))).toEqual([m.vehiculos.ferry.w * 6, m.vehiculos.ferry.h]);
  });

  it('lo que todavía no genera vuelve como aviso y en manifest.pendiente', () => {
    const { files, warnings } = buildCustomKit({ ...MIN, fx: ['estrellas_mareo', 'confeti_dorado'], animales: ['chiguire'], audio: { sfx: ['ventana_rota'], radio: ['noticias'] } }, {}, { quick: true, solo: ['cabecitas'] });
    expect(warnings).toEqual([
      'animales sin ficha (se saltan; las especies nuevas llegan con el lote C7): chiguire',
      'fx: todavía no existen (se saltan): confeti_dorado',
      'audio.radio: todavía no se genera, llega con el audio (lote H)',
      'audio.sfx: todavía no existen, llegan con el lote H: ventana_rota',
    ]);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.pendiente).toEqual(warnings);
    expect(m.tipo).toBe('kit a medida');
  });

  it('--solo arma solo esas partes', () => {
    const names = (solo: Parameters<typeof buildCustomKit>[2]) => buildCustomKit({ ...MIN, objetos: ['chancleta'], ui: { fuentes: true } }, { fuentes: SILK }, solo).files.map((f) => f.name).sort();
    expect(names({ quick: true, solo: ['fuentes'] })).toEqual(['CREDITOS.txt', 'manifest.json', ...['fuente_titulo', 'fuente_titulo_plata', 'fuente_ui'].flatMap((n) => [`ui/fuentes/${n}.fnt`, `ui/fuentes/${n}.png`])]);
    expect(names({ quick: true, solo: ['objetos'] })).toEqual(['CREDITOS.txt', 'manifest.json', 'objetos/armas.json', 'objetos/armas.png']);
    const at = names({ quick: true, solo: ['atletas'] });
    expect(at).toContain('atletas/rick/base.png');
    expect(at.some((n) => n.startsWith('ui/') || n.startsWith('objetos/') || n.endsWith('retratos.png'))).toBe(false);
  });

  it('la línea de comandos explica los errores y sale con 1', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kam-'));
    writeFileSync(join(dir, 'kit.config.json'), JSON.stringify({ ...MIN, packs: { base: ['idel'] } }));
    const r = cli(join(dir, 'salida'), '--config', join(dir, 'kit.config.json'));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('packs.base[0]: "idel" no es una animación. ¿Quisiste decir "idle"?');
    expect(existsSync(join(dir, 'salida'))).toBe(false);
    const s = cli(join(dir, 'salida'), '--config', join(dir, 'kit.config.json'), '--solo', 'atletas,fondos');
    expect(s.stderr).toContain('--solo: "fondos" no es una parte del kit');
  });
});

describe('kit a medida (lote I): el kit completo de Nekketsu', () => {
  const out = mkdtempSync(join(tmpdir(), 'kit-nekketsu-'));
  let seconds = 0;
  let m: Record<string, any>;
  let files: string[];
  beforeAll(() => {
    const t0 = Date.now();
    const r = cli(out, '--config', join(EJ, 'nekketsu', 'kit.config.json'));
    seconds = (Date.now() - t0) / 1000;
    if (r.status !== 0) throw new Error(r.stderr);
    m = readJson(join(out, 'manifest.json'));
    files = walk(out).map((p) => relative(out, p).replaceAll('\\', '/'));
    // el corte va por encima del límite de 300 s de abajo: así decide esa prueba, con su tiempo medido, y no un corte a ciegas
  }, 320_000);

  // el límite era 180 s; con el kit completo (escenarios, NPC, aves) y la máquina de hoy tarda entre 185 y 200: 300 s (lote C7b)
  it('se genera en menos de 5 minutos', () => {
    expect(seconds).toBeLessThan(300);
  });

  it('el manifiesto cumple el contrato (sección 4.3)', () => {
    expect(m).toMatchObject({ juego: 'Nekketsu Olympic GG', generado_con: 'PixelForja', version: 1, resolucion: [640, 360], filas: ['right', 'down_right', 'up_right', 'down', 'up'] });
    expect(Object.keys(m.equipos)).toEqual(['familia_gg', 'instituto_nekketsu', 'rong_sai_gon', 'rolos_de_chapinero', 'panas_de_caracas', 'maracuchos_del_lago']);
    expect(m.equipos.rong_sai_gon).toMatchObject({ nombre: 'Rồng Sài Gòn', atletas: ['minh', 'lan', 'tuan', 'ba_hoa'] });
    expect(m.equipos.familia_gg).toMatchObject({ nombre: 'Familia GG', atletas: ['rick', 'steph', 'sophie', 'alana'], mascota: 'thor' });
    const cfg = readJson(join(EJ, 'nekketsu', 'kit.config.json')) as KitConfig;
    expect(Object.keys(m.atletas).sort()).toEqual(Object.values<any>(m.equipos).flatMap((t) => t.atletas).sort());
    expect(Object.keys(m.atletas)).toHaveLength(24);
    for (const [id, a] of Object.entries<any>(m.atletas)) {
      const team = Object.entries<any>(m.equipos).find(([, t]) => t.atletas.includes(id))![0];
      expect(a.equipo, id).toBe(team);
      expect(a.celda, id).toBe(GIGANTES.includes(id) ? 64 : 48);
      expect(a.pivote, id).toEqual([a.celda / 2, a.celda - 2]);
      expect(a.retratos).toMatchObject({ archivo: `atletas/${id}/retratos.png`, chico: 40, grande: 96, expresiones: ['neutral', 'feliz', 'enojo', 'triste', 'susto', 'cerrado', 'dolor', 'burla'] });
      expect(a.cabecita).toBe(`ui/cabecitas.png#${id}`);
      expect(m.cabecitas.orden).toContain(id);
      expect(Object.keys(a.packs), id).toEqual(Object.keys(cfg.packs));
      for (const [p, pk] of Object.entries<any>(a.packs)) {
        expect(pk.atlas).toBe(`atletas/${id}/${p}.json`);
        const atlas = readJson(join(out, pk.atlas));
        // la burla y la victoria propias (taunt_<id>, victory_<id>) solo van en el atlas de su dueño, y la burla del
        // equipo (burla_<equipo>, lote C5) solo en los de ese equipo
        const ids = Object.keys(m.atletas), equipos = Object.keys(m.equipos);
        const nombres = packAnims(cfg.packs[p]).flatMap((a) => { const al = Object.keys(cfg.alias ?? {}).filter((k) => cfg.alias![k] === a); return al.length ? al : [a]; });
        expect(Object.keys(pk.anims).sort(), `${id}/${p}`).toEqual(nombres.filter((a) => (duenoDe(a, ids) ?? id) === id && (duenoDe(a, equipos) ?? team) === team).sort());
        for (const [an, d] of Object.entries<any>(pk.anims)) {
          expect(d).toMatchObject({ cuadros: expect.any(Number), fps: expect.any(Number), loop: expect.any(Boolean) });
          // un cuadro del atlas por fila y cuadro, y los datos por cuadro en [fila][cuadro]
          for (const fila of m.filas) for (let k = 0; k < d.cuadros; k++) expect(atlas.frames[`${an}_${fila}_${k}`], `${id} ${an}_${fila}_${k}`).toBeDefined();
          for (const f of ['cajas', 'cuerpo', 'manos', 'cabeza', 'pies']) {
            expect(d[f], `${id} ${an} ${f}`).toHaveLength(m.filas.length);
            for (const row of d[f]) expect(row).toHaveLength(d.cuadros);
          }
        }
      }
    }
    for (const [prueba, packs] of Object.entries<string[]>(m.pruebas)) for (const p of packs) expect(m.atletas.rick.packs[p], `${prueba}: ${p}`).toBeDefined();
    // lotes SP y SP2: los packs de pelota salen sin pelotas, con dónde iba cada una en objetos; los demás packs no traen objetos
    const conPelota = [['voley', 'serve', 'voley'], ['futbol', 'header', 'futbol'], ['futbol', 'shot', 'futbol'], ['keeper', 'keeper_catch', 'futbol'],
      ['basket', 'dribble', 'basquet'], ['tennis', 'forehand', 'tenis'], ['beisbol', 'pitch', 'beisbol']];
    for (const [p, an, clase] of conPelota) for (const id of ['rick', 'goro']) {
      const o = m.atletas[id].packs[p].anims[an].objetos;
      expect(o, `${id} ${p} ${an}`).toHaveLength(m.filas.length);
      expect(o.flat().filter(Boolean).flat()[0], `${id} ${p} ${an}`).toMatchObject({ tipo: 'pelota', clase, detras: 0 });
    }
    // las que no traen pelota tampoco traen objetos
    for (const [p, an] of [['voley', 'vb_ready'], ['keeper', 'keeper_ready'], ['tennis', 'tn_ready'], ['futbol', 'slide']]) expect(m.atletas.rick.packs[p].anims[an].objetos, `${p} ${an}`).toBeUndefined();
    expect(Object.values<any>(m.atletas.rick.packs.base.anims).some((d) => d.objetos)).toBe(false);
    expect(m.notas.some((n: string) => n.startsWith('sin_props (voley, futbol, keeper, basket, tennis, beisbol): '))).toBe(true);
    // las pelotas sueltas, en 48 y en 64 (Goro)
    expect(Object.keys(m.pelotas)).toEqual(['balon_futbol', 'balon_voley', 'balon_basket', 'pelota_tenis', 'pelota_beisbol']);
    expect(m.pelotas.balon_basket).toEqual({ clase: 'basquet', atlas: 'objetos/pelotas.json', cuadros: { 48: 'balon_basket_48', 64: 'balon_basket_64' } });
    expect(Object.keys(readJson(join(out, 'objetos/pelotas.json')).frames)).toHaveLength(10);
    expect(m.animales.thor).toMatchObject({ atlas: 'animales/thor.json', imagen: 'animales/thor.png' });
    // las aves del motor (lote C7b): una tira de lado, con el ancla en las patas y el canto del gallo
    expect(m.animales.gallo).toMatchObject({ tipo: 'ave', imagen: 'animales/gallo.png', w: 32, h: 32, ancla: [17, 30], vista: 'lado', eventos: { cantar: [{ tipo: 'canto', cuadro: 3 }] } });
    expect(m.animales.paloma).toMatchObject({ tipo: 'ave', imagen: 'animales/paloma.png', w: 16, h: 16, ancla: [9, 14] });
    for (const k of FLOOR_PROP_KINDS) expect(m.objetos[k], k).toMatchObject({ atlas: 'objetos/armas.json' });
    // la comida de la pelea va en objetos, después de las armas (el primer objeto sigue siendo un arma)
    expect(Object.values<any>(m.objetos)[0].atlas).toBe('objetos/armas.json');
    for (const k of COMIDAS) expect(m.objetos[k], k).toMatchObject({ atlas: 'objetos/comida.json', peso: 'comida', rota: false, anims: { quieto: 1, humito: 4 }, cura: expect.any(Number) });
    // la burla y la victoria propias son de los 8 de la pelea (lote P1)
    for (const t of ['taunt', 'victory']) for (const id of CON_BURLA_PROPIA) {
      expect(m.atletas[id].packs.kachinuki.anims[`${t}_${id}`], `${t}_${id}`).toBeDefined();
    }
    // la burla de cada equipo (lote C5): los 24 la traen, con la frase en el gesto fuerte
    for (const [eq, t] of Object.entries<any>(m.equipos)) for (const id of t.atletas) {
      const b = m.atletas[id].packs.ngg_burlas.anims[`burla_${eq}`];
      expect(b, `${id} burla_${eq}`).toMatchObject({ loop: false, fps: 8 });
      expect(b.eventos.filter((e: any) => e.tipo === 'frase'), id).toHaveLength(1);
    }
    // el pisotón, el codazo y el cabezazo marcan el impacto en el pie, el codo y la frente
    const imp = (id: string, a: string) => m.atletas[id].packs.kachinuki.anims[a].eventos.find((e: any) => e.tipo === 'impacto');
    for (const id of ['sophie', 'alana', 'goro']) for (const a of ['stomp', 'back_elbow', 'headbutt', 'eat']) expect(imp(id, a)?.punto, `${id} ${a}`).toHaveLength(m.filas.length);
    expect(m.ui.vs).toMatchObject({ neutro: 'ui/vs/neutro.png', pares: { familia_gg__instituto_nekketsu: 'ui/vs/familia_gg__instituto_nekketsu.png' }, w: 640, h: 360 });
    // un fondo por cada par de los 6 equipos
    expect(Object.keys(m.ui.vs.pares)).toHaveLength(15);
    expect(m.publico.azoteas).toMatchObject({ archivo: 'publico/azoteas.png', archivo_noche: 'publico/azoteas_noche.png', h: 40, cuadros: 4, estados: { quieto: 0, celebra: 1, abuchea: 2 } });
    expect(Object.keys(m.ui.fuentes)).toEqual(['fuente_ui', 'fuente_titulo', 'fuente_titulo_plata', 'notas']);
    expect(m.creditos).toBe('CREDITOS.txt');
    // los 63 efectos (56 del lote F y 7 de la pelea) y los sonidos del motor; lo del lote H queda pendiente
    // 63 y el rayo del cielo (lote rayo_cielo)
    expect(Object.keys(m.fx)).toHaveLength(64);
    expect(m.fx.ko_grande).toMatchObject({ w: 640, h: 360, cuadros: 12 });
    expect(m.fx.chispa_golpe_pesado).toMatchObject({ archivo: 'fx/chispa_golpe_pesado.png', celda: 32, se_pega_a: 'mano' });
    expect(m.fx.pantalla_rota).toMatchObject({ w: 640, h: 360 });
    // H1: todos los sonidos pedidos ya existen; las voces y la página para escucharlos
    expect(Object.keys(m.audio.sfx)).toEqual(cfg.audio!.sfx);
    expect(Object.keys(m.audio.musica)).toEqual(cfg.audio!.musica);
    expect(Object.keys(m.audio.voces)).toEqual(cfg.audio!.voces);
    expect(m.atletas.sophie.voz.tono).toBeGreaterThan(m.atletas.rick.voz.tono);
    expect(m.audio.escuchar).toBe('audio/escuchar.html');
    // G1: el logo y la interfaz, con un panel por equipo
    expect(m.ui.logo).toMatchObject({ w: 320, h: 112, texto: 'NEKKETSU OLYMPIC GG' });
    // un panel por equipo: los dos de la rebanada y los cuatro nacionales del lote C2
    expect(Object.keys(m.ui.interfaz).filter((k) => k.startsWith('panel_'))).toEqual(['panel_familia_gg', 'panel_instituto_nekketsu', 'panel_rong_sai_gon', 'panel_rolos_de_chapinero', 'panel_panas_de_caracas', 'panel_maracuchos_del_lago']);
    // H1b: audio comprimido. Sin ffmpeg en la máquina, la música queda pendiente
    if (hayFfmpeg()) {
      expect(m.pendiente).toBeUndefined();
      expect(m.audio.musica.marcha_nekketsu.archivo).toEqual(['audio/musica/marcha_nekketsu.ogg', 'audio/musica/marcha_nekketsu.m4a']);
    } else expect(m.pendiente.every((w: string) => w.startsWith('audio.'))).toBe(true);
  });

  it('los 5 tramos del Cross Country, la Comuna 13, la azotea de Caracas, Hội An, el dojo, Tao Đàn, la cancha de tejo, Margarita, Đà Lạt, Barranquilla, Maracaibo y los seis de E6 salen con sus 9 pruebas en verde (lotes E1, E2, E3a, E3b, E3c, E4a, E5 y E6)', () => {
    const tramos = ['barranquilla', 'barrio_caracas', 'cancha_maracaibo', 'candelaria', 'caracas_azotea', 'cartagena', 'cocora', 'dalat', 'halong', 'hoian', 'judo_hanoi', 'liceo_patio', 'llanos_apure', 'margarita', 'medellin_c13', 'saigon_azoteas', 'saigon_benthanh', 'saigon_estadio', 'saigon_hem', 'saigon_rio', 'tao_dan'];
    expect(Object.keys(m.escenarios).sort()).toEqual(tramos);
    // la franja de cada uno: la de la pelea (246 a 344), la del Cross (200 a 330), las de lado, donde DaCau.ts, Tejo.ts,
    // Voley.ts y Tenis.ts ponen el piso, y la de Futbol.ts y Basket.ts (212 a 316). Los de E6, con las medidas de su prueba
    const franjas: Record<string, [number, number]> = { tao_dan: [290, 330], candelaria: [286, 310], caracas_azotea: [246, 344], hoian: [246, 344], judo_hanoi: [246, 344], margarita: [290, 330], dalat: [290, 330], barranquilla: [212, 316], cancha_maracaibo: [212, 316], cocora: [228, 348], halong: [226, 346], llanos_apure: [226, 346], barrio_caracas: [296, 336], liceo_patio: [214, 314], cartagena: [340, 360] };
    const largos: Record<string, number> = { saigon_estadio: 1920, medellin_c13: 3600, cocora: 1720, halong: 1460, llanos_apure: 1560, barrio_caracas: 900, cartagena: 880 };
    // las 8 canchas de una pantalla van a 800 con 80 de escenario a cada lado (lote E4)
    const CANCHAS_800 = ['margarita', 'dalat', 'tao_dan', 'cancha_maracaibo', 'barranquilla', 'liceo_patio', 'candelaria', 'hoian'];
    for (const id of CANCHAS_800) largos[id] = 800;
    for (const id of tramos) {
      expect(m.escenarios[id]).toBe(`escenarios/${id}/escenario.json`);
      const e = readJson(join(out, m.escenarios[id]));
      const [atras, adelante] = franjas[id] ?? [200, 330];
      expect(e).toMatchObject({ id, escala: 1, largo: largos[id] ?? (franjas[id] ? 640 : 3840), franja: { atras, adelante } });
      if (CANCHAS_800.includes(id)) expect(e, id).toMatchObject({ margen: 80 });
      // las de lado lo dicen, con el dibujo derecho
      if (['tao_dan', 'candelaria', 'margarita', 'dalat', 'cocora', 'halong', 'llanos_apure', 'barrio_caracas', 'cartagena'].includes(id)) expect(e).toMatchObject({ vista: 'lado', inclinacion: 0, ancho: largos[id] ?? 640 });
      expect(readFileSync(join(out, `escenarios/${id}/verificacion.md`), 'utf8'), id).toMatch(/Las 9 pruebas pasan/);
      // las postales y la ficha son para aprobar: el kit no las lleva
      expect(files.some((f) => f.startsWith(`escenarios/${id}/postales/`))).toBe(false);
    }
  });

  it('no falta ningún archivo que nombra el manifiesto, y no sobra ninguno', () => {
    const refs = refsOf(m);
    // cada escenario nombra sus archivos en su escenario.json
    for (const [, ej] of Object.entries<string>(m.escenarios ?? {})) {
      const dir = ej.replace(/[^/]+$/, '');
      for (const r of refsOf(readJson(join(out, ej)))) refs.add(dir + r);
      refs.add(dir + 'verificacion.md');
    }
    for (const r of refs) expect(files, r).toContain(r);
    // cada atlas nombra su imagen
    for (const f of files.filter((n) => n.endsWith('.json') && n !== 'manifest.json' && !n.startsWith('escenarios/'))) {
      const img = readJson(join(out, f)).meta?.image;
      expect(img, f).toBeTruthy();
      expect(files, `${f} -> ${img}`).toContain(f.replace(/[^/]+$/, img));
    }
    const atlasImages = files.filter((n) => n.endsWith('.png') && files.includes(n.replace(/\.png$/, '.json')));
    for (const f of files) if (f !== 'manifest.json' && !atlasImages.includes(f)) expect(refs, `nadie nombra ${f}`).toContain(f);
  });

  it('ninguna imagen pasa de 4096 px', () => {
    const pngs = files.filter((n) => n.endsWith('.png'));
    // atletas (24 x 18 hojas: los 17 packs, con las burlas del lote C5, voley y futbol sin pelotas del lote SP y keeper, basket, tennis y beisbol del lote SP2, judo y judo_azul del lote B4B6 bis, y los retratos) + efectos + logo e interfaz (36: un panel por equipo; más las 49 del envoltorio de G2: 3 medallas, las 2 cintas del cuarto puesto, 24 banderas, el podio, 2 tiras de íconos, 6 tarjetas, 6 escudos, el VS de 4, el de 1 contra 1 y 3 pantallas, y las 5 del mapa de la gira: el mundial, la ruta, los 2 de región y los sellos, y las 8 de la intro: la azotea, el atleta de espaldas, Bogotá, su lluvia, Maracaibo, la presentación, el desayuno y su mesa, y las 2 del tenis en vertical: el fondo y la red) + armas y comida + las pelotas sueltas (SP2)
    // + cabecitas, 3 fuentes, neutro, letras y los 15 pares del VS + 2 del público + thor + los 15 escenarios: hẻm 21,
    // Bến Thành 17, río 17, azoteas 21, estadio 11, Comuna 13 14, Caracas 10, Hội An 8, y el dojo, Tao Đàn y la cancha de tejo 8 cada uno (lote E4a) + 3 perros y 2 gatos (lote C7)
    // + los 10 vehículos y objetos del lote D2 + los 8 NPC de la Comuna 13 y la pelota (lote C6a) + el gallo y la paloma (lote C7b)
    // + Margarita, Đà Lạt, Barranquilla y Maracaibo, 8 cada uno, y la Marimonda (lote E5)
    // + Cocora, Hạ Long y Apure, 11 cada uno (pasan de 1280 de ancho: la capa cerca, el piso y el frente van en dos trozos), el barrio, el liceo y Cartagena, 8 cada uno, y la palenquera (lote E6)
    expect(pngs.length).toBe(24 * 18 + 64 + 36 + 49 + 5 + 8 + 2 + 2 + 1 + (4 + 2 + 15) + 2 + 1 + 21 + 17 + 17 + 21 + 11 + 14 + 10 + 8 + 8 + 8 + 8 + 5 + 10 + 9 + 2 + 8 * 4 + 1 + 11 * 3 + 8 * 3 + 1);
    for (const f of pngs) for (const s of pngSize(readFileSync(join(out, f)))) expect(s, f).toBeLessThanOrEqual(4096);
  });
});
