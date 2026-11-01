// Zonas del mundo: exteriores grandes armados con paisajes del motor como viñetas, mazmorras de cuartos y pasillos
// con muros del tema, y campamentos seguros. Todo con semilla. Celdas de juego de 32x16 (5x5 por baldosa).
import { REGISTRO, huellaDe, generarPaisaje, type ObjetoDef, type Tema, type AmbienteId } from '../../../src/engine/gotico/index';
import { rng, clamp } from '../nucleo/azar';

export interface ObjZ { id: string; v: string; cx: number; cy: number; hw: number; hh: number; bloquea: boolean; tag?: string; dato?: any }
export interface Salida { cx: number; cy: number; destino: string; entrada: string; nombre: [string, string]; obj?: ObjZ }
export interface Spawn { cx: number; cy: number; tipo: 'grupo' | 'jefe' | 'unico' | 'campeon'; fuerza: number }
export interface Zona {
  id: string;
  nombre: [string, string];
  acto: number;
  nivel: number;
  tipo: 'pueblo' | 'exterior' | 'mazmorra';
  tw: number; th: number; W: number; H: number;
  pisos: ({ id: string; v: number } | null)[];
  objetos: ObjZ[];
  /** 0 libre, 1 objeto, 2 vacío (fuera del mapa). */
  bloq: Uint8Array;
  ambiente: AmbienteId;
  oscuridad: number;
  salidas: Salida[];
  entradas: Record<string, [number, number]>;
  spawns: Spawn[];
  explorado: Uint8Array;
  semilla: number;
  lluvia?: boolean; niebla?: number; ceniza?: boolean; nieve?: boolean;
  /** Puntos especiales: npc, cofre, santuario, piedra de viaje, baúl... */
  marcas: { tipo: string; cx: number; cy: number; dato?: any }[];
}

export interface DefZona {
  id: string; nombre: [string, string]; acto: number; nivel: number;
  tipo: 'pueblo' | 'exterior' | 'mazmorra';
  tema: string; tam: [number, number];
  /** Salidas: a qué zona y por cuál entrada; lado para exteriores (n, s, e, o) o 'abajo'/'arriba' en mazmorras. */
  salidas: { destino: string; entrada: string; lado: string; nombre: [string, string] }[];
  piedraViaje?: boolean;
  jefe?: string;
  lluvia?: boolean; niebla?: number; ceniza?: boolean; nieve?: boolean;
  densidad?: number;
  /** Paisajes del motor que se estampan como viñetas. */
  vinetas?: string[];
  oscuridad?: number;
}

// ------------------------------------------------------------------ búsqueda en el catálogo
const cacheBusca = new Map<string, ObjetoDef[]>();
export function buscar(temas: string[], palabras?: string[], sin?: string[]): ObjetoDef[] {
  const k = temas.join() + '|' + (palabras ?? []).join() + '|' + (sin ?? []).join();
  let r = cacheBusca.get(k);
  if (!r) { r = REGISTRO.filter((d) => temas.includes(d.tema) && (!palabras || palabras.some((p) => d.id.includes(p))) && !(sin ?? []).some((p) => d.id.includes(p))); cacheBusca.set(k, r); }
  return r;
}

// ------------------------------------------------------------------ temáticas
interface Sel { t: Tema[]; p?: string[]; s?: string[]; v?: (v: string) => boolean }
interface Tematica {
  piso: string; parches: string[]; camino?: string; ambiente: AmbienteId; oscuridad: number;
  borde: Sel[]; disperso: Sel[]; grande?: Sel[]; luces?: Sel[];
  muroX?: [string, string[]]; muroY?: [string, string[]];
  deco?: Sel[]; vinetas?: string[];
}
const vivo = (v: string) => !/nevad|nieve|seco|desnud|muert|quem|otono/.test(v);
const TEMATICAS: Record<string, Tematica> = {
  paramo: {
    piso: 'pasto_seco', parches: ['pasto', 'tierra', 'pasto_seco'], camino: 'camino', ambiente: 'atardecer', oscuridad: 0.45,
    borde: [{ t: ['arboles'], p: ['muert', 'seco', 'torc', 'pino'] }, { t: ['campo'], p: ['roca', 'penasco'] }],
    disperso: [{ t: ['arboles'], p: ['arbust', 'zarza', 'tocon', 'tronco', 'hongo', 'pasto'] }, { t: ['campo'], p: ['roca', 'craneo', 'esqueleto', 'mojon', 'letrero', 'cerca_rota', 'muro_ruina', 'menhir'] }],
    grande: [{ t: ['arboles'], p: ['roble', 'muert', 'sauce', 'torc'], v: (v) => !/nevad/.test(v) }],
    luces: [{ t: ['campo'], p: ['fogata'] }],
    vinetas: ['pueblo', 'cementerio', 'bosque'],
  },
  cementerio: {
    piso: 'pasto', parches: ['lajas_musgo', 'tierra', 'pasto_seco'], camino: 'lajas_musgo', ambiente: 'noche', oscuridad: 0.62,
    borde: [{ t: ['arboles'], p: ['muert', 'seco', 'torc'] }, { t: ['cementerio'], p: ['muro'] }],
    disperso: [{ t: ['cementerio'], p: ['losa', 'tumba', 'cruz', 'urna', 'velas', 'flores', 'pila', 'ataud', 'fosa'] }, { t: ['arboles'], p: ['tocon', 'zarza', 'hongo'] }],
    grande: [{ t: ['cementerio'], p: ['mausoleo', 'angel', 'sarcofago'] }, { t: ['arboles'], p: ['muert', 'torc'] }],
    luces: [{ t: ['cementerio'], p: ['farol', 'velas'] }],
    vinetas: ['cementerio', 'cementerio'],
  },
  abadia: {
    piso: 'baldosa_catedral', parches: ['lajas', 'baldosa_catedral'], ambiente: 'cripta', oscuridad: 0.72,
    borde: [], disperso: [{ t: ['monasterio'], p: ['banco', 'estatua', 'pila', 'charco', 'campana', 'tapiz', 'pulpito'] }, { t: ['muebles'], p: ['mesa', 'silla', 'estante', 'libro', 'candel', 'vela'] }],
    grande: [{ t: ['monasterio'], p: ['pilar'] }], luces: [{ t: ['monasterio'], p: ['brasero', 'antorcha'] }],
    muroX: ['mon_muro', ['izq', 'izq', 'izq_roto']], muroY: ['mon_muro', ['der', 'der', 'der_roto']],
    deco: [{ t: ['monasterio'], p: ['altar'] }],
  },
  catacumbas: {
    piso: 'lajas', parches: ['hueso', 'lajas', 'lajas_musgo'], ambiente: 'cripta', oscuridad: 0.82,
    borde: [], disperso: [{ t: ['catacumbas'], p: ['osario', 'poste', 'potro', 'jaula', 'banco', 'cama', 'rejilla', 'ataudes', 'monton', 'doncella'] }, { t: ['cementerio'], p: ['pila', 'ataud', 'urna'] }],
    grande: [{ t: ['catacumbas'], p: ['osario'] }], luces: [{ t: ['monasterio'], p: ['brasero', 'antorcha'] }],
    muroX: ['cat_nichos', ['izq', 'izq_saqueado']], muroY: ['cat_nichos', ['der', 'der_saqueado']],
  },
  desierto: {
    piso: 'arena', parches: ['arena', 'arenisca', 'tierra'], camino: 'arenisca', ambiente: 'desierto', oscuridad: 0.12,
    borde: [{ t: ['desierto'], p: ['roca', 'duna', 'peña', 'pena', 'acantil', 'cactus', 'palm'] }],
    disperso: [{ t: ['desierto'], p: ['cactus', 'arbust', 'hueso', 'craneo', 'esquel', 'roca', 'jarr', 'vasij', 'obelis', 'ruina', 'colum'] }],
    grande: [{ t: ['desierto'], p: ['palm', 'ruina', 'colum', 'estatua'] }], luces: [{ t: ['desierto'], p: ['fuego', 'antorch', 'brasero', 'fogat'] }],
    vinetas: ['desierto', 'tumba'],
  },
  tumba: {
    piso: 'arenisca', parches: ['arenisca', 'arena'], ambiente: 'cripta', oscuridad: 0.78,
    borde: [], disperso: [{ t: ['tumba'], p: ['canopos', 'guardian', 'trampa', 'obelisco', 'altar'] }, { t: ['desierto'], p: ['jarr', 'vasij', 'hueso'] }],
    grande: [{ t: ['tumba'], p: ['columna', 'sarcofago'] }], luces: [{ t: ['tumba'], p: ['antorcha', 'brasero'] }],
    muroX: ['tum_muro', ['liso', 'signos', 'nicho', 'roto']], muroY: ['cue_muro', ['y', 'y_alta']],
  },
  selva: {
    piso: 'selva', parches: ['selva', 'pantano', 'tierra'], camino: 'tierra', ambiente: 'selva', oscuridad: 0.5,
    borde: [{ t: ['selva', 'arboles'], p: ['arbol', 'ceiba', 'palma', 'mangl'] }],
    disperso: [{ t: ['selva'], p: ['helecho', 'hongo', 'enred', 'flor', 'totem', 'calav', 'capullo', 'raiz', 'tronco', 'planta'] }],
    grande: [{ t: ['selva', 'arboles'], p: ['arbol', 'ceiba', 'palma'] }, { t: ['templo_selva'], p: ['idolo', 'estatua', 'columna', 'muro_musgo'] }],
    luces: [{ t: ['selva'], p: ['antorcha', 'tiki', 'fuego'] }, { t: ['templo_selva'], p: ['brasero'] }],
    vinetas: ['templo'],
  },
  templo: {
    piso: 'arenisca', parches: ['arenisca', 'selva', 'lajas_musgo'], ambiente: 'selva', oscuridad: 0.72,
    borde: [], disperso: [{ t: ['templo_selva'], p: ['idolo', 'estatua', 'altar', 'pedestal', 'calzada'] }, { t: ['selva'], p: ['helecho', 'hongo', 'calav', 'raiz'] }],
    grande: [{ t: ['templo_selva'], p: ['columna'] }], luces: [{ t: ['templo_selva'], p: ['brasero'] }],
    muroX: ['tem_muro_glifos', ['entero', 'roto']], muroY: ['tem_muro_glifos', ['entero_y', 'roto_y']],
  },
  nieve: {
    piso: 'nieve', parches: ['nieve', 'hielo', 'nieve'], camino: 'nieve', ambiente: 'nieve', oscuridad: 0.25,
    borde: [{ t: ['nieve'], p: ['pino', 'arbol', 'roca'] }, { t: ['arboles'], p: ['pino'], v: (v) => /nevad/.test(v) }],
    disperso: [{ t: ['nieve'], p: ['roca', 'ventis', 'tronco', 'poste', 'totem', 'barric', 'estand', 'jaula', 'trineo'] }],
    grande: [{ t: ['nieve'], p: ['pino', 'torre', 'catapul', 'altar'] }], luces: [{ t: ['nieve'], p: ['fuego', 'fogat', 'antorch', 'brasero'] }],
    vinetas: ['nieve'],
  },
  hielo: {
    piso: 'hielo', parches: ['hielo', 'nieve', 'cueva'], ambiente: 'cripta', oscuridad: 0.66,
    borde: [], disperso: [{ t: ['hielo'], p: ['puas', 'cristales', 'cuerpo', 'roca', 'estanque'] }],
    grande: [{ t: ['hielo'], p: ['pilar'] }], luces: [{ t: ['hielo'], p: ['antorcha'] }],
    muroX: ['hie_muro', ['x', 'x_alta']], muroY: ['hie_muro', ['y', 'y_alta']],
  },
  infierno: {
    piso: 'tierra_infierno', parches: ['tierra_infierno', 'lava_grietas', 'hueso'], camino: 'tierra_infierno', ambiente: 'infierno', oscuridad: 0.55,
    borde: [{ t: ['infierno'], p: ['aguja', 'roca', 'espin', 'obsid'] }],
    disperso: [{ t: ['infierno'], p: ['huesos', 'empalados', 'cadenas', 'jaula', 'estatua', 'pentagrama', 'grieta'] }],
    grande: [{ t: ['infierno'], p: ['aguja', 'estatua', 'lago'] }], luces: [{ t: ['infierno'], p: ['brasero', 'pilar_luz', 'forja'] }],
    vinetas: ['infierno'],
  },
  santuario: {
    piso: 'tierra_infierno', parches: ['hueso', 'tierra_infierno', 'pentagrama'], ambiente: 'infierno', oscuridad: 0.7,
    borde: [], disperso: [{ t: ['infierno'], p: ['huesos', 'empalados', 'cadenas', 'jaula', 'sello', 'pentagrama'] }],
    grande: [{ t: ['infierno'], p: ['estatua', 'aguja'] }], luces: [{ t: ['infierno'], p: ['brasero', 'pilar_luz'] }],
    muroX: ['inf_muro_carne', ['liso', 'costillas']], muroY: ['inf_muro_carne', ['liso_y', 'costillas_y']],
  },
  cueva: {
    piso: 'cueva', parches: ['cueva', 'tierra'], ambiente: 'cripta', oscuridad: 0.8,
    borde: [], disperso: [{ t: ['cueva'], p: ['estalag', 'roca', 'escomb', 'hueso', 'costill', 'hongo', 'telar', 'raiz', 'cristal', 'poza'] }],
    grande: [{ t: ['cueva'], p: ['columna'] }], luces: [{ t: ['cueva'], p: ['antorcha', 'hongos'] }],
    muroX: ['cue_muro', ['x', 'x_alta']], muroY: ['cue_muro', ['y', 'y_alta']],
  },
};
export const tematica = (t: string) => TEMATICAS[t] ?? TEMATICAS.paramo;

// ------------------------------------------------------------------ construcción
class Constructor {
  z: Zona; r: () => number;
  constructor(z: Zona) { this.z = z; this.r = rng(z.semilla * 9301 + 49297); }
  libre(x0: number, y0: number, w: number, h: number) {
    const z = this.z;
    if (x0 < 0 || y0 < 0 || x0 + w > z.W || y0 + h > z.H) return false;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (z.bloq[y * z.W + x]) return false;
    return true;
  }
  poner(d: ObjetoDef | undefined | string, cx: number, cy: number, v?: string, forzar = false, tag?: string, dato?: any): ObjZ | null {
    if (!d) return null;
    const def = typeof d === 'string' ? REGISTRO.find((x) => x.id === d) : d;
    if (!def) return null;
    const vv = v && def.variantes.includes(v) ? v : def.variantes[Math.floor(this.r() * def.variantes.length)];
    const [hw, hh] = huellaDe(def, vv);
    const x0 = Math.round(cx - (hw - 1) / 2), y0 = Math.round(cy - (hh - 1) / 2);
    if (!forzar && !this.libre(x0, y0, hw, hh)) return null;
    const z = this.z;
    // no tapar las celdas reservadas (caminos, entradas)
    if (!forzar) for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + hw; x++) if (this.reserva[y * z.W + x]) return null;
    const bloquea = !!def.bloquea && !def.plano;
    if (bloquea) for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + hw; x++) if (x >= 0 && y >= 0 && x < z.W && y < z.H && z.bloq[y * z.W + x] !== 2) z.bloq[y * z.W + x] = 1;
    else if (!def.plano) for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + hw; x++) if (x >= 0 && y >= 0 && x < z.W && y < z.H && !z.bloq[y * z.W + x]) z.bloq[y * z.W + x] = 3; // ocupado sin bloquear (para no apilar)
    const o: ObjZ = { id: def.id, v: vv, cx: Math.round(cx), cy: Math.round(cy), hw, hh, bloquea, tag, dato };
    z.objetos.push(o);
    return o;
  }
  reserva!: Uint8Array;
  sel(ss: Sel[] | undefined): { d: ObjetoDef; v: (v: string) => boolean }[] {
    const out: { d: ObjetoDef; v: (v: string) => boolean }[] = [];
    for (const s of ss ?? []) for (const d of buscar(s.t, s.p, s.s)) out.push({ d, v: s.v ?? (() => true) });
    return out;
  }
  regar(ss: Sel[] | undefined, n: number, x0: number, y0: number, x1: number, y1: number, cerca?: (x: number, y: number) => boolean) {
    const op = this.sel(ss); if (!op.length) return;
    for (let i = 0, k = 0; i < n && k < n * 10; k++) {
      const o = op[Math.floor(this.r() * op.length)];
      const vs = o.d.variantes.filter(o.v); if (!vs.length) continue;
      const x = x0 + Math.floor(this.r() * (x1 - x0)), y = y0 + Math.floor(this.r() * (y1 - y0));
      if (cerca && !cerca(x, y)) continue;
      if (this.z.bloq[clamp(y, 0, this.z.H - 1) * this.z.W + clamp(x, 0, this.z.W - 1)]) continue;
      if (this.poner(o.d, x, y, vs[Math.floor(this.r() * vs.length)])) i++;
    }
  }
  piso(id: string, bx: number, by: number) {
    const z = this.z; if (bx < 0 || by < 0 || bx >= z.tw || by >= z.th) return;
    const n = id === 'camino' ? 2 : id === 'pentagrama' ? 1 : id === 'agua' || id === 'lava' || id === 'arcano' ? 2 : id === 'baldosa_catedral' || id === 'madera' || id === 'hielo' || id === 'pantano' || id === 'hueso' || id === 'lava_grietas' || id === 'fortaleza' || id === 'ladrillo_cloaca' ? 3 : 4;
    z.pisos[by * z.tw + bx] = { id, v: Math.floor(this.r() * n) };
  }
  vaciar(bx: number, by: number) {
    const z = this.z; z.pisos[by * z.tw + bx] = null;
    for (let y = by * 5; y < by * 5 + 5; y++) for (let x = bx * 5; x < bx * 5 + 5; x++) z.bloq[y * z.W + x] = 2;
  }
}

function nuevaZona(def: DefZona, semilla: number): Zona {
  const [tw, th] = def.tam, W = tw * 5, H = th * 5;
  const t = tematica(def.tema);
  return {
    id: def.id, nombre: def.nombre, acto: def.acto, nivel: def.nivel, tipo: def.tipo, tw, th, W, H,
    pisos: Array.from({ length: tw * th }, () => ({ id: t.piso, v: 0 })), objetos: [], bloq: new Uint8Array(W * H),
    ambiente: t.ambiente, oscuridad: def.oscuridad ?? t.oscuridad, salidas: [], entradas: {}, spawns: [], explorado: new Uint8Array(tw * th), semilla,
    lluvia: def.lluvia, niebla: def.niebla, ceniza: def.ceniza, nieve: def.nieve, marcas: [],
  };
}

/** Ruido de valor suave para manchas de piso. */
function ruido2(r: () => number, w: number, h: number, escala: number): Float32Array {
  const gw = Math.ceil(w / escala) + 2, gh = Math.ceil(h / escala) + 2, g = Float32Array.from({ length: gw * gh }, () => r());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / escala, fy = y / escala, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
    const s = (a: number) => a * a * (3 - 2 * a);
    const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
    out[y * w + x] = (a * (1 - s(u)) + b * s(u)) * (1 - s(v)) + (c * (1 - s(u)) + d * s(u)) * s(v);
  }
  return out;
}

// ------------------------------------------------------------------ exterior
function exterior(def: DefZona, semilla: number): Zona {
  const z = nuevaZona(def, semilla), k = new Constructor(z), t = tematica(def.tema), r = k.r;
  k.reserva = new Uint8Array(z.W * z.H);
  const { tw, th } = z;
  // forma: un manchón irregular que llena casi todo el rectángulo
  const forma = ruido2(r, tw, th, 4);
  const dentro = (bx: number, by: number) => {
    const ex = Math.min(bx, tw - 1 - bx), ey = Math.min(by, th - 1 - by), borde = Math.min(ex, ey);
    return borde >= 1 && (borde >= 3 || forma[by * tw + bx] > 0.3 + (3 - borde) * 0.12);
  };
  const manchas = ruido2(r, tw, th, 3), manchas2 = ruido2(r, tw, th, 5);
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    if (!dentro(bx, by)) { k.vaciar(bx, by); continue; }
    const m = manchas[by * tw + bx], m2 = manchas2[by * tw + bx];
    k.piso(m > 0.62 ? t.parches[0] : m2 > 0.6 ? t.parches[1] : m < 0.25 ? t.parches[2] : t.piso, bx, by);
  }
  // salidas en los lados y el camino que las une pasando por el centro
  const puntos: [number, number][] = [];
  const lados = def.salidas.map((s) => s.lado);
  const enLado = (lado: string): [number, number] => {
    for (let i = 0; i < 200; i++) {
      const u = 0.3 + r() * 0.4;
      let bx = 0, by = 0;
      if (lado === 'n') { bx = Math.floor(u * tw); by = 0; while (by < th - 1 && !z.pisos[by * tw + bx]) by++; }
      else if (lado === 's') { bx = Math.floor(u * tw); by = th - 1; while (by > 0 && !z.pisos[by * tw + bx]) by--; }
      else if (lado === 'o') { by = Math.floor(u * th); bx = 0; while (bx < tw - 1 && !z.pisos[by * tw + bx]) bx++; }
      else { by = Math.floor(u * th); bx = tw - 1; while (bx > 0 && !z.pisos[by * tw + bx]) bx--; }
      if (z.pisos[by * tw + bx]) return [bx * 5 + 2, by * 5 + 2];
    }
    return [Math.floor(z.W / 2), Math.floor(z.H / 2)];
  };
  // entrada principal (de dónde se llega primero): la primera salida
  for (const s of def.salidas) { const p = enLado(s.lado); puntos.push(p); }
  const centro: [number, number] = [Math.floor(z.W / 2), Math.floor(z.H / 2)];
  const camino = (a: [number, number], b: [number, number]) => {
    let x = a[0], y = a[1];
    for (let paso = 0; paso < 2000; paso++) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < z.W && Y < z.H && z.bloq[Y * z.W + X] !== 2) k.reserva[Y * z.W + X] = 1; }
      if (t.camino && r() < 0.5) k.piso(t.camino, Math.floor(x / 5), Math.floor(y / 5));
      if (Math.abs(x - b[0]) + Math.abs(y - b[1]) < 2) break;
      const dx = Math.sign(b[0] - x), dy = Math.sign(b[1] - y);
      if (r() < 0.25) { if (r() < 0.5) x += r() < 0.5 ? 1 : -1; else y += r() < 0.5 ? 1 : -1; }
      else if (Math.abs(b[0] - x) > Math.abs(b[1] - y) ? r() < 0.75 : r() < 0.25) x += dx; else y += dy;
      x = clamp(x, 2, z.W - 3); y = clamp(y, 2, z.H - 3);
    }
  };
  for (const p of puntos) camino(p, centro);
  // viñetas: paisajes del motor estampados donde haya lugar
  const vin = def.vinetas ?? t.vinetas ?? [];
  const usadas: [number, number, number, number][] = [];
  for (let i = 0; i < Math.min(4, vin.length + 1) && vin.length; i++) {
    const id = vin[i % vin.length];
    const m = generarPaisaje(id, semilla * 13 + i);
    for (let intento = 0; intento < 30; intento++) {
      const bx = 2 + Math.floor(r() * (tw - m.ancho - 4)), by = 2 + Math.floor(r() * (th - m.alto - 4));
      if (bx < 1 || by < 1) break;
      if (usadas.some(([x, y, w, h]) => bx < x + w + 1 && bx + m.ancho + 1 > x && by < y + h + 1 && by + m.alto + 1 > y)) continue;
      let ok = true;
      for (let y = by; y < by + m.alto && ok; y++) for (let x = bx; x < bx + m.ancho; x++) if (!z.pisos[y * tw + x]) { ok = false; break; }
      if (!ok) continue;
      usadas.push([bx, by, m.ancho, m.alto]);
      for (let y = 0; y < m.alto; y++) for (let x = 0; x < m.ancho; x++) { const p = m.pisos[y * m.ancho + x]; if (p) z.pisos[(by + y) * tw + bx + x] = { ...p }; }
      for (const o of m.objetos) {
        // las viñetas no tapan el camino ni las salidas
        const cx = o.cx + bx * 5, cy = o.cy + by * 5;
        if (/portal_azul|piedra_viaje|baul/.test(o.id)) continue;
        k.poner(o.id, cx, cy, o.v);
      }
      break;
    }
  }
  // borde: árboles y rocas pegados al vacío
  const bordes = k.sel(t.borde);
  if (bordes.length) for (let cy = 1; cy < z.H - 1; cy += 2) for (let cx = 1; cx < z.W - 1; cx += 2) {
    if (z.bloq[cy * z.W + cx] === 2) continue;
    let cercaVacio = false;
    for (let dy = -4; dy <= 4 && !cercaVacio; dy++) for (let dx = -4; dx <= 4; dx++) { const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= z.W || Y >= z.H || z.bloq[Y * z.W + X] === 2) { cercaVacio = true; break; } }
    if (cercaVacio && r() < 0.55) { const o = bordes[Math.floor(r() * bordes.length)]; const vs = o.d.variantes.filter(o.v); if (vs.length) k.poner(o.d, cx, cy, vs[Math.floor(r() * vs.length)]); }
  }
  // grandes y dispersos
  const area = z.W * z.H, dens = def.densidad ?? 1;
  k.regar(t.grande, Math.floor((area / 900) * dens), 3, 3, z.W - 3, z.H - 3);
  k.regar(t.disperso, Math.floor((area / 260) * dens), 2, 2, z.W - 2, z.H - 2);
  k.regar(t.luces, Math.floor(area / 2600), 4, 4, z.W - 4, z.H - 4);
  // salidas reales
  def.salidas.forEach((s, i) => {
    const [cx, cy] = puntos[i];
    const sal: Salida = { cx, cy, destino: s.destino, entrada: s.entrada, nombre: s.nombre };
    if (s.lado === 'abajo') {
      // entrada a una mazmorra: una boca de cripta o cueva
      const boca = def.tema === 'desierto' ? 'tum_entrada' : def.tema === 'cementerio' ? 'cem_entrada_cripta' : def.tema === 'nieve' ? 'cue_entrada' : def.tema === 'selva' ? 'tem_escalinata' : def.tema === 'infierno' ? 'inf_portal_rojo' : 'com_cueva';
      const o = k.poner(boca, cx, cy - 3, undefined, true);
      if (o) sal.obj = o;
    }
    z.salidas.push(sal);
    z.entradas[s.lado === 'abajo' ? 'boca' : s.lado] = [cx + (s.lado === 'o' ? 3 : s.lado === 'e' ? -3 : 0), cy + (s.lado === 'n' ? 3 : s.lado === 's' ? -3 : s.lado === 'abajo' ? 3 : 0)];
    z.entradas['salida_' + s.destino] = z.entradas[s.lado === 'abajo' ? 'boca' : s.lado];
  });
  if (def.piedraViaje) {
    const [cx, cy] = puntos[0];
    const o = k.poner('com_piedra_viaje', cx + 6, cy + 6, 'apagada') ?? k.poner('com_piedra_viaje', cx - 6, cy + 6, 'apagada', true);
    if (o) z.marcas.push({ tipo: 'viaje', cx: o.cx, cy: o.cy });
  }
  // cofres, santuarios y pozos
  colocarInteractivos(k, 2 + Math.floor(area / 6000), 1 + Math.floor(area / 9000));
  // dónde salen los monstruos: lejos de las entradas
  sembrar(k, Math.floor((area / 700) * dens), puntos);
  if (def.jefe) { const p = lejos(k, puntos); z.spawns.push({ cx: p[0], cy: p[1], tipo: 'jefe', fuerza: 1 }); }
  return z;
}

function colocarInteractivos(k: Constructor, cofres: number, santuarios: number) {
  const z = k.z;
  const pc = ['com_cofre', 'com_cofre', 'com_cofre_herrado', 'com_cofre_ornado'];
  const ps = ['com_santuario_obelisco', 'com_santuario_cuernos', 'com_santuario_estela', 'com_santuario_calaveras', 'com_santuario_caldero', 'com_santuario_monolito'];
  for (let i = 0, n = 0; i < cofres * 20 && n < cofres; i++) {
    const x = 3 + Math.floor(k.r() * (z.W - 6)), y = 3 + Math.floor(k.r() * (z.H - 6));
    if (z.bloq[y * z.W + x]) continue;
    const o = k.poner(pc[Math.floor(k.r() * pc.length)], x, y, 'cerrado', false, 'cofre');
    if (o) { n++; z.marcas.push({ tipo: 'cofre', cx: x, cy: y }); }
  }
  for (let i = 0, n = 0; i < santuarios * 20 && n < santuarios; i++) {
    const x = 3 + Math.floor(k.r() * (z.W - 6)), y = 3 + Math.floor(k.r() * (z.H - 6));
    if (z.bloq[y * z.W + x]) continue;
    const pozo = k.r() < 0.3;
    const id = pozo ? (k.r() < 0.5 ? 'com_pozo_vida' : 'com_pozo_mana') : ps[Math.floor(k.r() * ps.length)];
    const o = k.poner(id, x, y, pozo ? 'lleno' : 'activo', false, pozo ? 'pozo' : 'santuario');
    if (o) n++;
  }
  // urnas y ataúdes que se rompen
  for (let i = 0, n = 0; i < 200 && n < 4 + Math.floor(z.W * z.H / 3000); i++) {
    const x = 3 + Math.floor(k.r() * (z.W - 6)), y = 3 + Math.floor(k.r() * (z.H - 6));
    if (z.bloq[y * z.W + x]) continue;
    if (k.poner(k.r() < 0.6 ? 'com_urna' : 'com_barril_explosivo', x, y, k.r() < 0.5 ? 'entera' : undefined, false, 'romper')) n++;
  }
}

function lejos(k: Constructor, de: [number, number][]): [number, number] {
  const z = k.z; let best: [number, number] = [z.W >> 1, z.H >> 1], bd = -1;
  for (let i = 0; i < 400; i++) {
    const x = 4 + Math.floor(k.r() * (z.W - 8)), y = 4 + Math.floor(k.r() * (z.H - 8));
    if (z.bloq[y * z.W + x]) continue;
    let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (z.bloq[(y + dy) * z.W + x + dx] === 1 || z.bloq[(y + dy) * z.W + x + dx] === 2) { ok = false; break; }
    if (!ok) continue;
    const d = Math.min(...de.map(([a, b]) => Math.hypot(a - x, b - y)));
    if (d > bd) { bd = d; best = [x, y]; }
  }
  return best;
}
function sembrar(k: Constructor, n: number, evitar: [number, number][]) {
  const z = k.z;
  for (let i = 0, c = 0; i < n * 20 && c < n; i++) {
    const x = 3 + Math.floor(k.r() * (z.W - 6)), y = 3 + Math.floor(k.r() * (z.H - 6));
    if (z.bloq[y * z.W + x]) continue;
    if (evitar.some(([a, b]) => Math.hypot(a - x, b - y) < 16)) continue;
    if (z.spawns.some((s) => Math.hypot(s.cx - x, s.cy - y) < 9)) continue;
    const q = k.r();
    z.spawns.push({ cx: x, cy: y, tipo: q < 0.07 ? 'unico' : q < 0.16 ? 'campeon' : 'grupo', fuerza: 0.7 + k.r() * 0.6 });
    c++;
  }
}

// ------------------------------------------------------------------ mazmorra
function mazmorra(def: DefZona, semilla: number): Zona {
  const z = nuevaZona(def, semilla), k = new Constructor(z), t = tematica(def.tema), r = k.r;
  k.reserva = new Uint8Array(z.W * z.H);
  const { tw, th } = z;
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) k.vaciar(bx, by);
  const suelo = new Uint8Array(tw * th);
  const cuartos: [number, number, number, number][] = [];
  for (let i = 0; i < 80 && cuartos.length < Math.floor((tw * th) / 45); i++) {
    const w = 2 + Math.floor(r() * 4), h = 2 + Math.floor(r() * 4);
    const x = 1 + Math.floor(r() * (tw - w - 2)), y = 1 + Math.floor(r() * (th - h - 2));
    if (cuartos.some(([a, b, c, d]) => x < a + c + 1 && x + w + 1 > a && y < b + d + 1 && y + h + 1 > b)) continue;
    cuartos.push([x, y, w, h]);
  }
  // ordenar en cadena (el primero es la entrada, el último el fondo) uniendo cada cuarto con el más cercano ya unido
  const orden = [cuartos.shift()!];
  while (cuartos.length) {
    let bi = 0, bj = 0, bd = Infinity;
    cuartos.forEach((c, i) => orden.forEach((o, j) => { const d = Math.abs(c[0] + c[2] / 2 - o[0] - o[2] / 2) + Math.abs(c[1] + c[3] / 2 - o[1] - o[3] / 2); if (d < bd) { bd = d; bi = i; bj = j; } }));
    const c = cuartos.splice(bi, 1)[0];
    const o = orden[bj];
    // pasillo en L
    let x = Math.floor(o[0] + o[2] / 2), y = Math.floor(o[1] + o[3] / 2);
    const X = Math.floor(c[0] + c[2] / 2), Y = Math.floor(c[1] + c[3] / 2);
    const primeroX = r() < 0.5;
    const marca = () => { suelo[y * tw + x] = 1; };
    if (primeroX) { while (x !== X) { marca(); x += Math.sign(X - x); } while (y !== Y) { marca(); y += Math.sign(Y - y); } }
    else { while (y !== Y) { marca(); y += Math.sign(Y - y); } while (x !== X) { marca(); x += Math.sign(X - x); } }
    marca();
    orden.push(c);
  }
  for (const [x, y, w, h] of orden) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) suelo[j * tw + i] = 1;
  const manchas = ruido2(r, tw, th, 3);
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) if (suelo[by * tw + bx]) {
    const m = manchas[by * tw + bx];
    k.piso(m > 0.66 ? t.parches[1] : m < 0.22 ? t.parches[2] : t.piso, bx, by);
    for (let y = by * 5; y < by * 5 + 5; y++) for (let x = bx * 5; x < bx * 5 + 5; x++) z.bloq[y * z.W + x] = 0;
  }
  // muros: en los bordes de atrás (hacia -x y -y) de cada baldosa con suelo
  const [mx, vx] = t.muroX ?? ['mon_muro', ['izq']];
  const [my, vy] = t.muroY ?? ['mon_muro', ['der']];
  const defX = REGISTRO.find((d) => d.id === mx), defY = REGISTRO.find((d) => d.id === my);
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    if (!suelo[by * tw + bx]) continue;
    if (by === 0 || !suelo[(by - 1) * tw + bx]) if (defX) {
      const v = vx[Math.floor(r() * vx.length)], [hw, hh] = huellaDe(defX, v);
      k.poner(defX, bx * 5 + (hw - 1) / 2, by * 5 + (hh - 1) / 2, v, true);
    }
    if (bx === 0 || !suelo[by * tw + bx - 1]) if (defY) {
      const v = vy[Math.floor(r() * vy.length)], [hw, hh] = huellaDe(defY, v);
      k.poner(defY, bx * 5 + (hw - 1) / 2, by * 5 + (hh - 1) / 2, v, true);
    }
  }
  // entrada (primer cuarto) y fondo (último)
  const c0 = orden[0], cN = orden[orden.length - 1];
  const centroDe = (c: [number, number, number, number]): [number, number] => [Math.floor((c[0] + c[2] / 2) * 5), Math.floor((c[1] + c[3] / 2) * 5)];
  const p0 = centroDe(c0), pN = centroDe(cN);
  for (const p of [p0, pN]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = p[0] + dx, Y = p[1] + dy; if (X >= 0 && Y >= 0 && X < z.W && Y < z.H) k.reserva[Y * z.W + X] = 1; }
  // decoración
  const area = orden.reduce((s, c) => s + c[2] * c[3], 0) * 25;
  for (const c of orden) if (c[2] >= 3 && c[3] >= 3 && r() < 0.6) {
    const gs = k.sel(t.grande); if (!gs.length) continue;
    const g = gs[Math.floor(r() * gs.length)];
    for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) k.poner(g.d, Math.floor((c[0] + c[2] * fx) * 5), Math.floor((c[1] + c[3] * fy) * 5));
  }
  const enSuelo = (x: number, y: number) => !!suelo[Math.floor(y / 5) * tw + Math.floor(x / 5)];
  k.regar(t.disperso, Math.floor(area / 160), 1, 1, z.W - 1, z.H - 1, enSuelo);
  k.regar(t.luces, Math.floor(area / 500), 1, 1, z.W - 1, z.H - 1, enSuelo);
  k.regar(t.deco, Math.floor(area / 2500), 1, 1, z.W - 1, z.H - 1, enSuelo);
  // salidas: la primera en la entrada, las demás al fondo
  def.salidas.forEach((s, i) => {
    const p = i === 0 ? p0 : pN;
    const arriba = s.lado === 'arriba';
    const id = arriba ? (def.tema === 'tumba' ? 'tum_escalera' : 'com_escalera_subida') : def.tema === 'tumba' ? 'tum_escalera' : 'com_escalera';
    const v = arriba ? (def.tema === 'tumba' ? 'subida' : 'piedra') : def.tema === 'tumba' ? 'bajada' : 'bajada';
    const o = k.poner(id, p[0], p[1] - 2, v, true);
    z.salidas.push({ cx: p[0], cy: p[1] - 1, destino: s.destino, entrada: s.entrada, nombre: s.nombre, obj: o ?? undefined });
    z.entradas[s.lado] = [p[0], p[1] + 2];
    z.entradas['salida_' + s.destino] = [p[0], p[1] + 2];
  });
  if (!z.entradas.arriba) z.entradas.arriba = [p0[0], p0[1] + 2];
  if (def.piedraViaje) { const o = k.poner('com_piedra_viaje', p0[0] + 4, p0[1] + 3, 'apagada', true); if (o) z.marcas.push({ tipo: 'viaje', cx: o.cx, cy: o.cy }); }
  colocarInteractivos(k, 2 + Math.floor(area / 3500), 1 + Math.floor(area / 7000));
  sembrar(k, Math.floor(area / 420), [p0]);
  if (def.jefe) z.spawns.push({ cx: pN[0], cy: pN[1] + 2, tipo: 'jefe', fuerza: 1 });
  return z;
}

// ------------------------------------------------------------------ pueblo
const PUEBLOS: Record<string, { paisaje: string; piso: string; extra: Sel[] }> = {
  paramo: { paisaje: 'campamento', piso: 'pasto_seco', extra: [{ t: ['arboles'], p: ['muert', 'roble', 'torc'] }, { t: ['campo'], p: ['roca'] }] },
  desierto: { paisaje: 'desierto', piso: 'arena', extra: [{ t: ['desierto'], p: ['palm', 'cactus', 'roca'] }] },
  selva: { paisaje: 'campamento', piso: 'selva', extra: [{ t: ['selva', 'arboles'], p: ['arbol', 'palma', 'ceiba', 'helecho'] }] },
  nieve: { paisaje: 'campamento', piso: 'nieve', extra: [{ t: ['nieve'], p: ['pino', 'roca'] }] },
  infierno: { paisaje: 'fortaleza', piso: 'fortaleza', extra: [{ t: ['fortaleza'], p: ['cristal', 'pilar', 'estatua'] }] },
};
function pueblo(def: DefZona, semilla: number): Zona {
  const z = nuevaZona(def, semilla), k = new Constructor(z), r = k.r;
  k.reserva = new Uint8Array(z.W * z.H);
  const pu = PUEBLOS[def.tema] ?? PUEBLOS.paramo;
  const { tw, th } = z;
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    const borde = Math.min(bx, by, tw - 1 - bx, th - 1 - by);
    if (borde === 0) k.vaciar(bx, by); else k.piso(pu.piso, bx, by);
  }
  const m = generarPaisaje(pu.paisaje, semilla);
  const ox = Math.floor((tw - m.ancho) / 2), oy = Math.floor((th - m.alto) / 2);
  for (let y = 0; y < m.alto; y++) for (let x = 0; x < m.ancho; x++) { const p = m.pisos[y * m.ancho + x]; if (p) z.pisos[(oy + y) * tw + ox + x] = { ...p }; }
  // lugares para NPC alrededor del centro (se reservan antes de poner objetos)
  const cx0 = (ox + m.ancho / 2) * 5, cy0 = (oy + m.alto / 2) * 5;
  const lugares: [number, number][] = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.4; lugares.push([Math.round(cx0 + Math.cos(a) * 6), Math.round(cy0 + Math.sin(a) * 6)]); }
  for (const [x, y] of lugares) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) k.reserva[(y + dy) * z.W + x + dx] = 1;
  for (const o of m.objetos) {
    const cx = o.cx + ox * 5, cy = o.cy + oy * 5;
    if (/portal_azul/.test(o.id)) continue;
    if (/piedra_viaje/.test(o.id)) { const q = k.poner(o.id, cx, cy, 'encendida', true); if (q) z.marcas.push({ tipo: 'viaje', cx, cy }); continue; }
    if (/baul|alijo/.test(o.id)) { const q = k.poner(o.id, cx, cy, o.v, true, 'baul'); if (q) z.marcas.push({ tipo: 'baul', cx, cy }); continue; }
    k.poner(o.id, cx, cy, o.v);
  }
  if (!z.marcas.some((q) => q.tipo === 'viaje')) { const q = k.poner('com_piedra_viaje', cx0 + 9, cy0 - 7, 'encendida', true); if (q) z.marcas.push({ tipo: 'viaje', cx: q.cx, cy: q.cy }); }
  if (!z.marcas.some((q) => q.tipo === 'baul')) { const q = k.poner('camp_baul', cx0 - 9, cy0 + 8, 'cerrado', true, 'baul'); if (q) z.marcas.push({ tipo: 'baul', cx: q.cx, cy: q.cy }); }
  lugares.forEach(([x, y], i) => z.marcas.push({ tipo: 'npc', cx: x, cy: y, dato: i }));
  // alrededores
  k.regar(pu.extra, Math.floor((z.W * z.H) / 300), 3, 3, z.W - 3, z.H - 3, (x, y) => Math.hypot(x - cx0, y - cy0) > m.ancho * 2.8);
  // salida: hacia el lado de la primera salida
  def.salidas.forEach((s) => {
    const p: [number, number] = s.lado === 's' ? [Math.floor(z.W / 2), z.H - 8] : s.lado === 'e' ? [z.W - 8, Math.floor(z.H / 2)] : s.lado === 'n' ? [Math.floor(z.W / 2), 7] : [7, Math.floor(z.H / 2)];
    z.salidas.push({ cx: p[0], cy: p[1], destino: s.destino, entrada: s.entrada, nombre: s.nombre });
    z.entradas[s.lado] = [p[0] + (s.lado === 'e' ? -3 : s.lado === 'o' ? 3 : 0), p[1] + (s.lado === 's' ? -3 : s.lado === 'n' ? 3 : 0)];
    z.entradas['salida_' + s.destino] = z.entradas[s.lado];
  });
  z.entradas.centro = [Math.round(cx0 + 2), Math.round(cy0 + 3)];
  z.entradas.portal = [Math.round(cx0 - 3), Math.round(cy0 + 5)];
  void r;
  return z;
}

export function generarZona(def: DefZona, semilla: number): Zona {
  const z = def.tipo === 'pueblo' ? pueblo(def, semilla) : def.tipo === 'mazmorra' ? mazmorra(def, semilla) : exterior(def, semilla);
  // asegurar que toda entrada caiga en celda libre
  for (const k of Object.keys(z.entradas)) z.entradas[k] = libreCerca(z, z.entradas[k][0], z.entradas[k][1]);
  return z;
}

export const pasable = (z: Zona, x: number, y: number) => { const cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= z.W || cy >= z.H) return false; const b = z.bloq[cy * z.W + cx]; return b === 0 || b === 3; };
export function libreCerca(z: Zona, x: number, y: number): [number, number] {
  for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const X = Math.round(x) + dx, Y = Math.round(y) + dy;
    if (pasable(z, X, Y)) return [X, Y];
  }
  return [Math.round(x), Math.round(y)];
}
/** ¿Se ve (y pasa un proyectil) en línea recta de a a b? */
export function lineaLibre(z: Zona, ax: number, ay: number, bx: number, by: number): boolean {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d * 2);
  for (let i = 1; i < n; i++) { const t = i / n; const x = ax + (bx - ax) * t, y = ay + (by - ay) * t; const b = z.bloq[Math.floor(y) * z.W + Math.floor(x)]; if (b === 1 || b === 2) return false; }
  return true;
}

/** A* en la grilla con 8 direcciones (sin cortar esquinas). Devuelve los puntos centrales de las celdas. */
export function buscarCamino(z: Zona, ax: number, ay: number, bx: number, by: number, max = 4000): [number, number][] | null {
  const W = z.W;
  let sx = Math.floor(ax), sy = Math.floor(ay), tx = Math.floor(bx), ty = Math.floor(by);
  if (!pasable(z, tx, ty)) { const q = libreCerca(z, tx, ty); tx = q[0]; ty = q[1]; }
  if (!pasable(z, sx, sy)) { const q = libreCerca(z, sx, sy); sx = q[0]; sy = q[1]; }
  if (sx === tx && sy === ty) return [[bx, by]];
  const g = new Map<number, number>(), de = new Map<number, number>();
  const abiertos: { k: number; f: number }[] = [];
  const s = sy * W + sx, t = ty * W + tx;
  g.set(s, 0); abiertos.push({ k: s, f: 0 });
  const h = (k: number) => { const x = k % W, y = (k / W) | 0, dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  let mejor = s, mejorH = h(s), n = 0;
  while (abiertos.length && n++ < max) {
    // montículo simple: buscar el menor (listas cortas)
    let bi = 0; for (let i = 1; i < abiertos.length; i++) if (abiertos[i].f < abiertos[bi].f) bi = i;
    const { k } = abiertos[bi]; abiertos[bi] = abiertos[abiertos.length - 1]; abiertos.pop();
    if (k === t) { mejor = t; break; }
    const x = k % W, y = (k / W) | 0, gk = g.get(k)!;
    const hk = h(k); if (hk < mejorH) { mejorH = hk; mejor = k; }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const X = x + dx, Y = y + dy;
      if (!pasable(z, X, Y)) continue;
      if (dx && dy && (!pasable(z, x + dx, y) || !pasable(z, x, y + dy))) continue;
      const nk = Y * W + X, ng = gk + (dx && dy ? 1.414 : 1);
      if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); de.set(nk, k); abiertos.push({ k: nk, f: ng + h(nk) * 1.1 }); }
    }
  }
  const camino: [number, number][] = [];
  for (let k = mejor; k !== s; k = de.get(k)!) { camino.push([(k % W) + 0.5, ((k / W) | 0) + 0.5]); if (!de.has(k)) break; }
  camino.reverse();
  if (mejor === t && camino.length) camino[camino.length - 1] = [bx, by];
  // suavizar: saltar puntos con línea libre
  const out: [number, number][] = [];
  let ix = ax, iy = ay, i = 0;
  while (i < camino.length) {
    let j = camino.length - 1;
    while (j > i && !lineaPasable(z, ix, iy, camino[j][0], camino[j][1])) j--;
    out.push(camino[j]); ix = camino[j][0]; iy = camino[j][1]; i = j + 1;
  }
  return out.length ? out : null;
}
function lineaPasable(z: Zona, ax: number, ay: number, bx: number, by: number) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d * 3);
  for (let i = 1; i <= n; i++) { const t = i / n; const x = ax + (bx - ax) * t, y = ay + (by - ay) * t; for (const [ox, oy] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) if (!pasable(z, x + ox, y + oy)) return false; }
  return true;
}
