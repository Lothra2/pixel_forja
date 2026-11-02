// Simulador de balance sin pantalla. Arma héroes "típicos" con las funciones reales del juego (calcular, crearObjeto,
// crearMonstruo, poblar vía entrarZona, usarHabilidad, actualizar) y los pone a pelear cuadro a cuadro en una zona real.
//
// Uso:  npx tsx juego/herramientas/balance.mts [--semillas 6] [--clases berserker,templario] [--niveles 1,10,50] [--salida res.json] [--md tablas.md]
//
// El juego usa import.meta.glob (cosa de Vite), así que los módulos se cargan con el servidor de Vite en modo SSR.
// No se reimplementa ninguna fórmula: aquí solo está el "jugador" (a quién pega, cuándo camina) y la contabilidad.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

// ------------------------------------------------------------------ azar con semilla
// R del juego es Math.random tomado al cargar el módulo, así que se cambia antes de cargar nada.
function mulberry(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let azar = mulberry(1);
Math.random = () => azar();
const sembrar = (...k: (string | number)[]) => { let h = 2166136261; for (const c of k.join('|')) h = Math.imul(h ^ c.charCodeAt(0), 16777619); azar = mulberry(h >>> 0); };

// ------------------------------------------------------------------ argumentos
const arg = (n: string, d: string) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };
const SEMILLAS = +arg('semillas', '6');
const CLASES_SIM = arg('clases', 'berserker,templario,arcanista,cazadora,nigromante,monje,druida,alquimista').split(',');
const DIFS = arg('difs', '0,1,2').split(',').map(Number);
// --rapido: solo lo que hace falta para comparar clases (DPS, TTK único y jefe de acto), sin TTD, legendaria ni campaña
const RAPIDO = process.argv.includes('--rapido');
const NIVELES = arg('niveles', '1,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100').split(',').map(Number);
const SALIDA = arg('salida', '');
const MD = arg('md', '');

// ------------------------------------------------------------------ módulos del juego
// algunos módulos de dibujo crean un lienzo al cargar: un document de mentira que acepta todo
const nada: any = new Proxy(function () {}, { get: (_t, k) => (k === Symbol.toPrimitive ? () => 0 : nada), apply: () => nada, construct: () => nada });
(globalThis as any).document ??= nada;
const raiz = fileURLToPath(new URL('..', import.meta.url));
const sv = await createServer({ root: raiz, configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
const carga = (p: string) => sv.ssrLoadModule(p) as Promise<any>;
const HE = await carga('/src/juego/heroe.ts');
const MU = await carga('/src/juego/mundo.ts');
const OB = await carga('/src/juego/objetos.ts');
const OD = await carga('/src/datos/objetos_datos.ts');
const CL = await carga('/src/datos/clases.ts');
const AC = await carga('/src/mundo/actos.ts');
const ZO = await carga('/src/mundo/zona.ts');
const MO = await carga('/src/datos/monstruos.ts');

// ------------------------------------------------------------------ el héroe típico
interface Plan { armas: (n: number) => string[]; izq?: (b: any) => boolean; atrib: { fue: number; des: number; vit: number; ene: number }; habs: string[]; principal: (habs: Record<string, number>) => string }
const PLANES: Record<string, Plan> = {
  berserker: { armas: (n) => (n >= 11 ? ['hacha_doble'] : ['hacha']), atrib: { fue: 0.4, des: 0.15, vit: 0.45, ene: 0 }, habs: ['tajo_salvaje', 'maestria_hachas', 'doble_golpe', 'piel_curtida', 'frenesi'], principal: () => 'tajo_salvaje' },
  templario: { armas: () => ['espada'], izq: (b) => b.familia === 'escudo' && !b.clase, atrib: { fue: 0.35, des: 0.2, vit: 0.45, ene: 0 }, habs: ['golpe_sagrado', 'voto_acero', 'disciplina', 'filo_alba'], principal: () => 'golpe_sagrado' },
  arcanista: { armas: () => ['varita'], izq: (b) => b.familia === 'orbe', atrib: { fue: 0.1, des: 0.05, vit: 0.55, ene: 0.3 }, habs: ['bola_fuego', 'saeta_ignea', 'maestria_fuego', 'ceniza_venas'], principal: (h) => (h.bola_fuego ? 'bola_fuego' : 'saeta_ignea') },
  cazadora: { armas: () => ['arco'], atrib: { fue: 0.15, des: 0.45, vit: 0.4, ene: 0 }, habs: ['flecha_certera', 'pulso_firme', 'aljaba_viva', 'ojo_halcon'], principal: () => 'flecha_certera' },
  nigromante: { armas: () => ['varita', 'daga'], izq: (b) => b.familia === 'escudo' && b.clase === 'nigromante', atrib: { fue: 0.15, des: 0.05, vit: 0.5, ene: 0.3 }, habs: ['lanza_hueso', 'espiral_huesos', 'armadura_hueso', 'medula_negra'], principal: () => 'lanza_hueso' },
  // monje de puños: rayo y eco con remates de combo
  monje: { armas: () => ['garras'], atrib: { fue: 0.2, des: 0.35, vit: 0.45, ene: 0 }, habs: ['puno_rayo', 'puno_eco', 'nudillos_hierro', 'arte_remate', 'tercer_ojo'], principal: (h) => (h.puno_eco ? 'puno_eco' : 'puno_rayo') },
  // druida invocador: lobos y oso pegan, él tira ráfaga ártica con lo que sobra
  druida: { armas: () => ['baculo'], atrib: { fue: 0.15, des: 0.1, vit: 0.5, ene: 0.25 }, habs: ['invocar_lobo', 'corazon_salvaje', 'oso_espiritu', 'rafaga_artica', 'ojo_nube'], principal: (h) => (h.rafaga_artica ? 'rafaga_artica' : 'ataque') },
  // alquimista de bombas con ballesta
  alquimista: { armas: () => ['ballesta'], izq: () => false, atrib: { fue: 0.2, des: 0.3, vit: 0.4, ene: 0.1 }, habs: ['bomba_ignea', 'bandolera', 'bomba_cluster', 'polvora_negra'], principal: (h) => (h.bomba_cluster ? 'bomba_cluster' : 'bomba_ignea') },
};
// premios de misiones de la campaña normal (unos 23 puntos de habilidad y 110 de atributos repartidos hasta el 60)
const premioHab = (n: number) => Math.round(23 * Math.min(1, n / 60));
const premioAtr = (n: number) => Math.round(110 * Math.min(1, n / 60));

function aprenderHasta(d: any, plan: Plan, nivel: number) {
  // nivel a nivel, como un jugador: primero la principal, después sus sinergias y pasivas (con sus requisitos)
  let gastados = Object.values<number>(d.habs).reduce((a, b) => a + b, 0);
  const aprender = (id: string): boolean => {
    const hb = CL.HABILIDADES.find((x: any) => x.id === id); if (!hb) return false;
    for (const r of hb.req ?? []) if (!d.habs[r]) { if (!aprender(r)) return false; if (d.puntosHab <= 0) return false; }
    d.puntosHab = Math.max(d.puntosHab, 0);
    if (d.puntosHab <= 0 || !HE.puedeAprender(d, hb)) return false;
    d.habs[id] = (d.habs[id] ?? 0) + 1; d.puntosHab--; gastados++;
    return true;
  };
  for (let n = 1; n <= nivel; n++) {
    d.nivel = n;
    d.puntosHab = n + 1 + premioHab(n) - gastados;
    let otra = true;
    while (d.puntosHab > 0 && otra) { otra = false; for (const id of plan.habs) if (aprender(id)) { otra = true; break; } }
  }
  d.puntosHab = 0;
}

function armarHeroe(clase: string, nivel: number, dif: number, nivelObj: number, semilla: number) {
  const plan = PLANES[clase];
  const d = HE.nuevoHeroe(clase, 'Sim');
  sembrar('heroe', clase, nivel, semilla);
  d.habs = {}; d.cinturon = [null, null, null, null]; d.bolsa = [];
  // el don inicial (la primera habilidad) ya cuenta como gastado: nuevoHeroe lo regala
  const primera = CL.HABILIDADES.find((x: any) => x.clase === clase && x.nivelReq === 1 && x.tipo !== 'pasiva' && x.tipo !== 'aura' && x.tipo !== 'buff');
  if (primera) d.habs[primera.id] = 1;
  aprenderHasta(d, plan, nivel);
  const puntos = 5 * (nivel - 1) + premioAtr(nivel);
  for (const k of ['fue', 'des', 'vit', 'ene'] as const) d[k] += Math.floor(puntos * (plan.atrib as any)[k]);
  d.dificultad = dif; d.nivel = nivel; d.xp = -1e15;
  // equipo: cada casilla tirada con crearObjeto del juego, sin elegir la mejor; solo se repite si no la puede llevar
  sembrar('equipo', clase, nivel, semilla);
  const cabe = (b: any) => (b.req.fue ?? 0) <= d.fue && (b.req.des ?? 0) <= d.des && (b.req.nivel ?? 1) <= nivel && (!b.clase || b.clase === clase);
  const tirar = (filtro: (b: any) => boolean) => {
    for (let i = 0; i < 8; i++) {
      const q = azar();
      const rar = i > 4 ? 'magico' : q < 0.5 ? 'magico' : q < 0.92 ? 'raro' : 'unico';
      const o = OB.crearObjeto(nivelObj, rar, (b: any) => filtro(b) && cabe(b));
      const b = OB.baseDe(o);
      if (b && filtro(b) && cabe(b) && HE.reqNivel(o) <= nivel) return o;
    }
    const bs = OD.BASES.filter((b: any) => filtro(b) && cabe(b) && b.nivel <= Math.max(1, nivelObj)).sort((a: any, b: any) => b.nivel - a.nivel);
    return bs.length ? OB.crearBase(bs[0], nivelObj) : null;
  };
  const fams = plan.armas(nivel);
  d.equipo = {};
  const arma = tirar((b) => b.ranura === 'arma' && fams.includes(b.familia));
  if (arma) d.equipo.arma = arma;
  const ba = arma ? OB.baseDe(arma) : null;
  if (plan.izq && !ba?.dosManos) { const o = tirar((b) => b.ranura === 'izq' && plan.izq!(b)); if (o) d.equipo.izq = o; }
  for (const [cas, ran] of [['cabeza', 'cabeza'], ['torso', 'torso'], ['manos', 'manos'], ['cinturon', 'cinturon'], ['pies', 'pies'], ['amuleto', 'amuleto'], ['anillo1', 'anillo'], ['anillo2', 'anillo']]) {
    const o = tirar((b) => b.ranura === ran && (ran !== 'cabeza' || !b.clase));
    if (o) d.equipo[cas] = o;
  }
  return d;
}

// ------------------------------------------------------------------ zonas y monstruos reales
const ZONAS_COMBATE = Object.values<any>(AC.ZONAS).filter((z) => z.tipo !== 'pueblo' && AC.POBL_ZONA[z.id]);
const JEFES_ACTO = ZONAS_COMBATE.filter((z) => z.jefe && MO.MONSTRUOS[z.jefe]?.jefe);
const nivelZona = (z: any, dif: number) => HE.nivelEnDificultad(z.nivel, dif);
const RANGO = [0, 1, 2].map((dif) => { const v = ZONAS_COMBATE.map((z) => nivelZona(z, dif)); return [Math.min(...v), Math.max(...v)]; });

/** Población real de una zona (poblar del juego vía entrarZona), una por zona, dificultad y semilla. */
const poblaciones = new Map<string, { zona: any; monstruos: any[] }>();
function poblacion(zid: string, dif: number, semilla: number) {
  const k = `${zid}|${dif}|${semilla}`;
  let p = poblaciones.get(k);
  if (!p) {
    sembrar('zona', zid, dif, semilla);
    const d = HE.nuevoHeroe('berserker', 'Sim'); d.dificultad = dif; d.id = 'sim' + semilla;
    const j = MU.crearJuego(d, 0);
    MU.olvidarZonas();
    MU.entrarZona(j, zid, 'viaje');
    p = { zona: j.zona, monstruos: j.monstruos.filter((m: any) => !m.dueno) };
    poblaciones.set(k, p);
  }
  return p;
}
const clonar = (m: any) => ({ ...m, res: { ...m.res }, mods: [...m.mods], dano: [...m.dano], camino: null, lider: undefined, maldicion: undefined, objetivo: null });

// ------------------------------------------------------------------ peleas cuadro a cuadro
const DT = 1 / 30;
const esMelee = (hb: any, c: any, basico: boolean) => (hb.tipo === 'golpe' && !(basico && c.distancia)) || hb.tipo === 'salto' || hb.tipo === 'carga' || hb.tipo === 'torbellino';

interface Pelea { t: number; ok: boolean; dano: number; recibido: number }
/**
 * modo 'matar': el héroe pega (con la habilidad o el ataque básico) hasta que mueren los objetivos; no muere (se le llena la vida)
 *   y no se queda sin maná (se asume que toma pociones de maná).
 * modo 'muñeco': igual, pero el objetivo no muere (se le devuelve la vida) y se mide el daño por segundo durante tMax.
 * modo 'aguantar': el héroe no pega ni toma pociones; se mide cuánto tarda en morir.
 */
/** Un claro de la zona (todas las celdas libres en un radio de 6) para que las paredes no se coman los proyectiles. */
const claros = new WeakMap<any, [number, number]>();
function claro(zona: any): [number, number] {
  let c = claros.get(zona);
  if (c) return c;
  let mejor: [number, number] = [zona.W / 2, zona.H / 2], mejorR = -1;
  for (let y = 2; y < zona.H - 2 && mejorR < 7; y += 2) for (let x = 2; x < zona.W - 2 && mejorR < 7; x += 2) {
    if (!ZO.pasable(zona, x + 0.5, y + 0.5)) continue;
    let r = 0;
    fuera: for (r = 1; r <= 7; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r && !ZO.pasable(zona, x + dx + 0.5, y + dy + 0.5)) break fuera;
    if (r - 1 > mejorR) { mejorR = r - 1; mejor = [x + 0.5, y + 0.5]; }
  }
  claros.set(zona, mejor);
  return mejor;
}
function pelear(d: any, zona: any, mons: any[], modo: 'matar' | 'muneco' | 'aguantar', hab: string, tMax: number): Pelea {
  const j = MU.crearJuego(d, 0);
  j.zona = zona;
  const h = j.heroe;
  MU.reiniciarMecanicas(h);
  [h.x, h.y] = claro(zona);
  // las invocaciones que no piden cadáver salen antes de la pelea (lobos, oso, halcón, gólem...): su daño cuenta
  j.monstruos = [];
  if (modo !== 'aguantar') for (const id of Object.keys(d.habs)) {
    const hb = MU.habilidadDe(id);
    if (hb.tipo !== 'invocar' || hb.definitiva || ['alzar_esqueleto', 'mago_hueso', 'marcha_fosa'].includes(id)) continue;
    const n = HE.nivelHab(d, id, h.c), mx = Math.max(1, Math.floor(hb.max[0] + hb.max[1] * (n - 1)));
    for (let k = 0; k < mx; k++) {
      h.mana = h.c.manaMax;
      MU.usarHabilidad(j, id, h.x + 1, h.y, null);
      for (let t = 0; t < 1.5 && (h.acc === 'lanzar' || h.acc === 'atacar'); t += DT) MU.actualizar(j, DT);
    }
  }
  j.monstruos.push(...mons);
  mons.forEach((m, i) => {
    const a = (i / mons.length) * Math.PI * 2;
    const q = ZO.libreCerca(zona, h.x + Math.cos(a) * 3, h.y + Math.sin(a) * 3);
    m.x = q[0] + 0.5; m.y = q[1] + 0.5; m.ox = m.x; m.oy = m.y;
    m.estado = 'perseguir'; m.objetivo = h; m.cd = 0.4 + i * 0.2; (m as any).surgiendo = 0;
    // un normal que invoca llenaría la pelea de esbirros que tapan los proyectiles: para medir su TTK no invoca
    if (modo !== 'aguantar' && !m.def.jefe) m.invocaCd = 1e9;
  });
  const objetivos = modo === 'aguantar' ? [] : mons.slice();
  // el muñeco tiene una vida enorme pero la vida máxima de siempre (el sangrado y el aturdir miran la máxima)
  if (modo === 'muneco') for (const m of mons) m.vida = 1e12;
  let dano = 0, recibido = 0, tCamino = -9;
  const vidaPrev = new Map(mons.map((m) => [m, m.vida]));
  for (let t = 0; t < tMax; t += DT) {
    if (modo !== 'aguantar') {
      h.vida = h.vidaMax; h.muerto = false;
      // pociones de maná: si no alcanza para la habilidad, se llena
      if (hab !== 'ataque' && h.mana < MU.costoMana(j, MU.habilidadDe(hab))) h.mana = h.c.manaMax;
      if (modo === 'muneco') h.c.golpe_aplastante = 0;
      if (!(h.acc === 'atacar' || h.acc === 'lanzar' || h.acc === 'herido') && !h.salto && !(h.torbellino > 0)) {
        let obj: any = null, bd = 1e9;
        for (const m of objetivos) if (!m.muerto) { const dd = Math.hypot(m.x - h.x, m.y - h.y); if (dd < bd) { bd = dd; obj = m; } }
        if (obj) {
          let id = hab;
          if (id !== 'ataque' && (h.recargas[id] ?? 0) > 0) id = 'ataque';
          const hb = MU.habilidadDe(id);
          const ver = ZO.lineaLibre(zona, h.x, h.y, obj.x, obj.y);
          const acercarse = esMelee(hb, h.c, id === 'ataque') ? bd > 1.2 + obj.radio : !ver || bd > 7;
          if (acercarse) { if (!h.camino || t - tCamino > 0.4) { h.camino = ZO.buscarCamino(zona, h.x, h.y, obj.x, obj.y, 2000) ?? [[obj.x, obj.y]]; tCamino = t; } }
          else { h.camino = null; if (!MU.usarHabilidad(j, id, obj.x, obj.y, obj) && id !== 'ataque') MU.usarHabilidad(j, 'ataque', obj.x, obj.y, obj); }
        }
      }
    }
    const vh = h.vida;
    MU.actualizar(j, DT);
    if (modo === 'aguantar') recibido += Math.max(0, vh - h.vida);
    for (const m of objetivos) {
      const pv = vidaPrev.get(m)!;
      if (m.vida < pv) dano += pv - m.vida;
      vidaPrev.set(m, m.vida);
    }
    if (modo === 'matar' && objetivos.every((m) => m.muerto)) return { t, ok: true, dano, recibido };
    if (modo === 'aguantar' && h.muerto) return { t, ok: true, dano, recibido };
  }
  return { t: tMax, ok: modo === 'muneco', dano, recibido };
}

// ------------------------------------------------------------------ una configuración: clase, nivel, dificultad
const zonasCerca = (nivelMon: number, dif: number) => ZONAS_COMBATE.map((z) => ({ z, d: Math.abs(nivelZona(z, dif) - nivelMon) })).sort((a, b) => a.d - b.d).slice(0, 3).map((x) => x.z);
const jefeDeActo = (acto: number) => JEFES_ACTO.find((z) => z.acto === acto) ?? JEFES_ACTO[JEFES_ACTO.length - 1];
const media = (v?: number[]) => (v && v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);

interface Fila {
  clase: string; nivel: number; dif: number; nivelMon: number; zona: string; jefe: string;
  vida: number; danoArma: number; golpe: number; def: number; resFuego: number; dpsBasico: number; dpsHab: number;
  ttkNormal: number; ttkCampeon: number; ttkUnico: number; ttkJefeZona: number; ttkJefe: number; jefeCapado: number;
  ttdGrupo: number; ttdJefe: number; dpsGrupo: number; dpsJefeRecibido: number; legBas: number; legHab: number; legs: string;
  xpMin: number; minNivel: number;
}
function simular(clase: string, nivel: number, dif: number): Fila | null {
  const [lo, hi] = RANGO[dif];
  const nivelMon = Math.min(hi, Math.max(lo, nivel));
  if (Math.abs(nivelMon - nivel) > 3) return null;
  const zonas = zonasCerca(nivelMon, dif);
  const zJefe = jefeDeActo(zonas[0].acto);
  const res: Record<string, number[]> = {};
  const legs = new Set<string>();
  const push = (k: string, v: number) => (res[k] ??= []).push(v);
  let ej: any = null;
  for (let s = 0; s < SEMILLAS; s++) {
    const d = armarHeroe(clase, nivel, dif, Math.max(1, nivelMon - 2), s);
    const c = HE.calcular(d); ej = c;
    push('vida', c.vidaMax); push('danoArma', (c.dano[0] + c.dano[1]) / 2); push('def', c.def); push('res', c.res.fuego);
    const hab = PLANES[clase].principal(d.habs);
    // daño de un uso de la habilidad principal sin crítico ni resistencias (arma por el multiplicador más el daño propio)
    {
      const jj = MU.crearJuego(d, 0), hb = MU.habilidadDe(hab), n = Math.max(1, HE.nivelHab(d, hab, c));
      MU.reiniciarMecanicas(jj.heroe);
      const dh = MU.danoHab(jj, hb, n), val = (b: any) => (b ? b[0] + b[1] * (n - 1) : 0);
      const arma = hb.mult ? ((c.dano[0] + c.dano[1]) / 2) * val(hb.mult) / 100 : 0;
      push('golpe', (arma + (dh[0] + dh[1]) / 2) * (Math.round(val(hb.n)) || 1));
    }
    // monstruos reales de las zonas cercanas
    const pobl = zonas.map((z) => poblacion(z.id, dif, s));
    const todos = pobl.flatMap((p) => p.monstruos.map((m: any) => ({ m, zona: p.zona })));
    const normales = todos.filter((x) => x.m.calidad === 0);
    const campeones = todos.filter((x) => x.m.calidad === 1);
    const unicos = todos.filter((x) => x.m.calidad === 2 && x.m.def.ia !== 'jefe');
    const jefesZona = todos.filter((x) => x.m.calidad === 2 && x.m.def.ia === 'jefe');
    sembrar('pelea', clase, nivel, dif, s);
    const toma = <T,>(xs: T[], n: number) => { const out: T[] = []; for (let i = 0; i < n && xs.length; i++) out.push(xs[Math.floor(azar() * xs.length)]); return out; };
    // daño por segundo contra un muñeco (un normal de la zona que no muere)
    const mu = toma(normales, 1)[0];
    if (mu) {
      push('dpsBasico', pelear(d, mu.zona, [clonar(mu.m)], 'muneco', 'ataque', 8).dano / 8);
      push('dpsHab', pelear(d, mu.zona, [clonar(mu.m)], 'muneco', hab, 8).dano / 8);
      // la misma pelea con una legendaria de su clase de arma en vez del arma típica (para ver si los escalones altos se pasan)
      const fams = PLANES[clase].armas(nivel);
      sembrar('legendaria', clase, nivel, s);
      const leg = OB.crearObjeto(Math.max(1, nivelMon - 2), 'legendario', (b: any) => b.ranura === 'arma' && fams.includes(b.familia));
      if (!RAPIDO && leg.rareza === 'legendario' && HE.reqNivel(leg) <= nivel) {
        const dl = { ...d, equipo: { ...d.equipo, arma: leg } };
        if (OB.baseDe(leg)?.dosManos) delete dl.equipo.izq;
        push('dpsLegBas', pelear(dl, mu.zona, [clonar(mu.m)], 'muneco', 'ataque', 8).dano / 8);
        push('dpsLegHab', pelear(dl, mu.zona, [clonar(mu.m)], 'muneco', hab, 8).dano / 8);
        push('dpsRefBas', res.dpsBasico[res.dpsBasico.length - 1]); push('dpsRefHab', res.dpsHab[res.dpsHab.length - 1]);
        legs.add(leg.base + ':' + leg.nombre[0]);
      }
    }
    if (!RAPIDO) for (const x of toma(normales, 5)) push('ttkNormal', pelear(d, x.zona, [clonar(x.m)], 'matar', hab, 60).t);
    if (!RAPIDO) for (const x of toma(campeones, 2)) push('ttkCampeon', pelear(d, x.zona, [clonar(x.m)], 'matar', hab, 120).t);
    for (const x of toma(unicos, 2)) push('ttkUnico', pelear(d, x.zona, [clonar(x.m)], 'matar', hab, 180).t);
    if (!RAPIDO) for (const x of toma(jefesZona, 1)) push('ttkJefeZona', pelear(d, x.zona, [clonar(x.m)], 'matar', hab, 300).t);
    // el jefe del acto de esta zona, creado con crearMonstruo al nivel de la zona + 2 (como lo pone poblar)
    {
      const nuevoJefe = () => MU.crearMonstruo(MO.MONSTRUOS[zJefe.jefe], nivelMon + 2, 0, 0, 4, dif);
      const r = pelear(d, pobl[0].zona, [nuevoJefe()], 'matar', hab, 400);
      push('ttkJefe', r.t); push('jefeCapado', r.ok ? 0 : 1);
      if (RAPIDO) continue;
      const a = pelear(d, pobl[0].zona, [nuevoJefe()], 'aguantar', hab, 120);
      push('ttdJefe', a.t); push('dpsJefeRecibido', a.recibido / Math.max(a.t, DT));
    }
    // un grupo de 4 normales de la zona
    const grupo = toma(normales, 4);
    if (grupo.length) { const a = pelear(d, grupo[0].zona, grupo.map((x) => clonar(x.m)), 'aguantar', hab, 120); push('ttdGrupo', a.t); push('dpsGrupo', a.recibido / Math.max(a.t, DT)); }
    // experiencia por minuto limpiando la zona más cercana: muertes según el TTK de cada calidad más el tiempo de caminar
    const p = pobl[0];
    let xp = 0, seg = 0;
    const kPen = (m: any) => { const df = nivel - m.nivel; return df > 5 ? Math.max(0.05, 1 - (df - 5) * 0.15) : 1; };
    const tN = media(res.ttkNormal ?? [2]), tC = media(res.ttkCampeon ?? [tN * 4]), tU = media(res.ttkUnico ?? [tN * 8]);
    for (const m of p.monstruos.filter((m: any) => !m.def.jefe)) { xp += m.xp * kPen(m); seg += (m.calidad === 2 ? (m.def.ia === 'jefe' ? media(res.ttkJefeZona ?? [tU * 3]) : tU) : m.calidad === 1 ? tC : tN) + 0.5; }
    seg += p.zona.spawns.length * 4; // caminar entre grupos, recoger, mirar el mapa
    push('xpMin', (xp / seg) * 60);
  }
  void ej;
  const xpMin = media(res.xpMin);
  const necesita = nivel >= HE.NIVEL_MAX ? 0 : HE.xpPara(nivel + 1) - HE.xpPara(nivel);
  return {
    clase, nivel, dif, nivelMon, zona: zonas[0].id, jefe: zJefe.jefe,
    vida: media(res.vida), danoArma: media(res.danoArma), golpe: media(res.golpe), def: media(res.def), resFuego: media(res.res), dpsBasico: media(res.dpsBasico), dpsHab: media(res.dpsHab),
    ttkNormal: media(res.ttkNormal), ttkCampeon: media(res.ttkCampeon), ttkUnico: media(res.ttkUnico), ttkJefeZona: media(res.ttkJefeZona), ttkJefe: media(res.ttkJefe), jefeCapado: media(res.jefeCapado ?? [0]),
    ttdGrupo: media(res.ttdGrupo), ttdJefe: media(res.ttdJefe), dpsGrupo: media(res.dpsGrupo), dpsJefeRecibido: media(res.dpsJefeRecibido), legBas: media(res.dpsLegBas) / media(res.dpsRefBas), legHab: media(res.dpsLegHab) / media(res.dpsRefHab), legs: [...legs].join(', '),
    xpMin, minNivel: necesita / xpMin,
  };
}

// ------------------------------------------------------------------ la campaña: limpiar cada zona una vez, en orden
/** Nivel del héroe al terminar cada acto si limpia cada zona una vez (con el castigo de experiencia por monstruo bajo). */
function campana(semilla: number) {
  let nivel = 1, xp = 0;
  const out: { dif: number; acto: number; nivel: number; nivelMon: number }[] = [];
  for (const dif of [0, 1, 2]) {
    let acto = 0, ultimo = 0;
    for (const z of ZONAS_COMBATE) {
      if (z.acto !== acto && acto) out.push({ dif, acto, nivel, nivelMon: ultimo });
      acto = z.acto; ultimo = nivelZona(z, dif);
      for (const m of poblacion(z.id, dif, semilla).monstruos) {
        const df = nivel - m.nivel, k = df > 5 ? Math.max(0.05, 1 - (df - 5) * 0.15) : 1;
        xp += Math.round(m.xp * k);
        while (nivel < HE.NIVEL_MAX && xp >= HE.xpPara(nivel + 1)) nivel++;
      }
    }
    out.push({ dif, acto, nivel, nivelMon: ultimo });
  }
  return out;
}

// ------------------------------------------------------------------ correr y resumir
const filas: Fila[] = [];
const t0 = Date.now();
for (const clase of CLASES_SIM) for (const nivel of NIVELES) for (const dif of DIFS) {
  const f = simular(clase, nivel, dif);
  if (f) { filas.push(f); process.stderr.write(`${clase} ${nivel} d${dif} ttkN ${f.ttkNormal.toFixed(1)} jefe ${f.ttkJefe.toFixed(0)} ttdG ${f.ttdGrupo.toFixed(1)} ttdJ ${f.ttdJefe.toFixed(1)} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`); }
}
if (SALIDA) writeFileSync(SALIDA, JSON.stringify(filas, null, 1));

const f1 = (v: number) => (Number.isFinite(v) ? (v >= 100 ? v.toFixed(0) : v.toFixed(1)) : '-');
const DIF = ['Normal', 'Pesadilla', 'Infierno'];
let md = '';
const linea = (s: string) => { md += s + '\n'; };
// tabla por dificultad y nivel con la mediana de las clases
const mediana = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
for (const dif of [0, 1, 2]) {
  linea(`\n### ${DIF[dif]} (mediana de ${CLASES_SIM.length} clases)\n`);
  linea('| Nivel | Mon | DPS básico | DPS hab. | TTK normal | TTK campeón | TTK único | TTK jefe zona | TTK jefe acto | TTD grupo 4 | TTD jefe | min/nivel |');
  linea('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const nivel of NIVELES) {
    const fs = filas.filter((f) => f.dif === dif && f.nivel === nivel); if (!fs.length) continue;
    const m = (k: keyof Fila) => f1(mediana(fs.map((f) => f[k] as number)));
    linea(`| ${nivel} | ${fs[0].nivelMon} | ${m('dpsBasico')} | ${m('dpsHab')} | ${m('ttkNormal')} | ${m('ttkCampeon')} | ${m('ttkUnico')} | ${m('ttkJefeZona')} | ${m('ttkJefe')} | ${m('ttdGrupo')} | ${m('ttdJefe')} | ${m('minNivel')} |`);
  }
}
linea('\n### Por clase (TTK normal / jefe y TTD grupo / jefe)\n');
linea('| Clase | Nivel | Dif | Vida | DPS bás. | DPS hab. | TTK normal | TTK campeón | TTK único | TTK jefe | TTD grupo | TTD jefe |');
linea('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const f of filas) linea(`| ${f.clase} | ${f.nivel} | ${f.dif} | ${f1(f.vida)} | ${f1(f.dpsBasico)} | ${f1(f.dpsHab)} | ${f1(f.ttkNormal)} | ${f1(f.ttkCampeon)} | ${f1(f.ttkUnico)} | ${f1(f.ttkJefe)}${f.jefeCapado > 0 ? '*' : ''} | ${f1(f.ttdGrupo)} | ${f1(f.ttdJefe)} |`);
// tiempo de subida: minutos por nivel interpolados entre los niveles medidos, con la dificultad que más rinde
const mejorMin = (nivel: number) => { const fs = filas.filter((f) => f.nivel === nivel); if (!fs.length) return NaN; const porDif = [0, 1, 2].map((dif) => mediana(fs.filter((f) => f.dif === dif).map((f) => f.minNivel))); return Math.min(...porDif.filter(Number.isFinite)); };
const medidos = NIVELES.filter((n) => n < 100).map((n) => [n, mejorMin(n)] as [number, number]).filter(([, v]) => Number.isFinite(v));
if (medidos.length > 1) {
  let acum = 0; const hitos: Record<number, number> = {};
  for (let n = 1; n < 100; n++) {
    let i = medidos.findIndex(([l]) => l >= n); if (i < 0) i = medidos.length - 1; if (i === 0) i = 1;
    const [la, va] = medidos[i - 1], [lb, vb] = medidos[i];
    const k = Math.min(1, Math.max(0, (n - la) / (lb - la)));
    acum += Math.exp(Math.log(va) + (Math.log(vb) - Math.log(va)) * k);
    hitos[n + 1] = acum;
  }
  linea(`\nHoras de juego acumuladas (aprox.): al 30 ${f1(hitos[30] / 60)} h, al 70 ${f1(hitos[70] / 60)} h, al 100 ${f1(hitos[100] / 60)} h\n`);
}
linea('\n### Legendaria de su arma contra el arma típica (multiplicador de DPS, mediana de clases de arma)\n');
linea('| Nivel | Básico | Habilidad |');
linea('|---|---|---|');
for (const nivel of NIVELES) {
  const fs = filas.filter((f) => f.nivel === nivel && Number.isFinite(f.legBas) && ['berserker', 'templario', 'cazadora'].includes(f.clase)); if (!fs.length) continue;
  linea(`| ${nivel} | x${f1(mediana(fs.map((f) => f.legBas)))} | x${f1(mediana(fs.map((f) => f.legHab)))} |`);
}
// comparación entre clases: TTK contra el jefe de acto y contra un único, y cuánto tarda la más lenta contra la más rápida
for (const [k, nom] of [['ttkJefe', 'jefe de acto'], ['ttkUnico', 'único'], ['golpe', 'golpe: daño de un uso de la habilidad principal'], ['danoArma', 'arma: daño medio del arma con fuerza y pasivas']] as [keyof Fila, string][]) {
  linea(`\n### ${k.startsWith("ttk") ? "TTK " : ""}${nom} por clase${k.startsWith("ttk") ? " (segundos; * = alguna pelea llegó al tope de tiempo)" : ""}\n`);
  linea('| Dif | Nivel | ' + CLASES_SIM.join(' | ') + ' | lenta / rápida |');
  linea('|---|---' + '|---'.repeat(CLASES_SIM.length) + '|---|');
  for (const dif of DIFS) for (const nivel of NIVELES) {
    const fs = CLASES_SIM.map((c) => filas.find((f) => f.clase === c && f.nivel === nivel && f.dif === dif));
    if (!fs.some(Boolean)) continue;
    const v = fs.map((f) => (f ? (f[k] as number) : NaN)).filter(Number.isFinite);
    linea(`| ${DIF[dif]} | ${nivel} | ` + fs.map((f) => (f ? f1(f[k] as number) + (k === 'ttkJefe' && f.jefeCapado > 0 ? '*' : '') : '-')).join(' | ') + ` | x${f1(Math.max(...v) / Math.min(...v))} |`);
  }
}
if (!RAPIDO) {
  const c0 = campana(0);
  linea('\n### Campaña limpiando cada zona una vez (nivel del héroe al cerrar cada acto / nivel de los monstruos del final del acto)\n');
  linea('| Dificultad | ' + [1, 2, 3, 4, 5, 6, 7].map((a) => `Acto ${a}`).join(' | ') + ' |');
  linea('|---' + '|---'.repeat(7) + '|');
  for (const dif of [0, 1, 2]) linea(`| ${DIF[dif]} | ` + c0.filter((x) => x.dif === dif).map((x) => `${x.nivel} / ${x.nivelMon}`).join(' | ') + ' |');
}
console.log(md);
if (MD) writeFileSync(MD, md);
await sv.close();
