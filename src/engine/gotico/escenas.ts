import { rng } from '../core/rng';
import { REGISTRO, huellaDe, type ObjetoDef, type Tema } from './objeto';
import { PISOS } from './pisos';
import { crearMapa, type MapaGotico, type AmbienteId } from './mapa';

/**
 * Paisajes armados: cada receta llena un mapa con el piso del lugar y sus objetos puestos con sentido (lápidas en
 * hileras, reja alrededor, la pirámide al centro, las carpas en ronda alrededor de la fogata). Eligen los objetos
 * por tema y por palabras del id, así siguen andando cuando el catálogo crece. La semilla cambia todo.
 */

export interface Paisaje { id: string; nombre: [string, string]; ambiente: AmbienteId; tam: [number, number]; armar: (k: Kit) => void }

interface Kit {
  m: MapaGotico;
  r: () => number;
  /** Ids del catálogo que cumplen: de esos temas y (si se da) con alguna de esas palabras en el id. */
  buscar: (temas: Tema[], palabras?: string[], sin?: string[]) => ObjetoDef[];
  /** Pone un objeto en la celda si está libre (respeta la huella). Devuelve si lo puso. */
  poner: (d: ObjetoDef | undefined, cx: number, cy: number, v?: string) => boolean;
  /** Pone n objetos de la lista en celdas al azar dentro del rectángulo (en celdas). */
  regar: (ds: ObjetoDef[], n: number, x0: number, y0: number, x1: number, y1: number, filtro?: (v: string) => boolean) => void;
  piso: (id: string, x0?: number, y0?: number, x1?: number, y1?: number) => void;
  /** Celdas del mapa. */
  W: number;
  H: number;
}

function kit(m: MapaGotico, seed: number): Kit {
  const r = rng(seed * 104729 + 7);
  const W = m.ancho * 5, H = m.alto * 5;
  const ocupado = new Uint8Array(W * H);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  // árboles y plantas: cada uno con su propia semilla (el árbol crece distinto con cada una), nunca repetida en el mapa;
  // lo demás (rocas, lápidas, muebles) reusa un puñado de semillas y así el paquete trae menos tiras
  const usadas = new Set<number>();
  const semilla = (d: ObjetoDef) => {
    if (d.tema !== 'arboles' && !/arbol|pino|palm|helech|arbust|ceiba/.test(d.id)) return 1 + Math.floor(r() * 60);
    let s = 1 + Math.floor(r() * 999983);
    while (usadas.has(s)) s = 1 + Math.floor(r() * 999983);
    usadas.add(s);
    return s;
  };
  const k: Kit = {
    m, r, W, H,
    // los gemelos `_sin_llama` son para el fuego vivo del juego, nunca decoración suelta
    buscar: (temas, palabras, sin) => REGISTRO.filter((d) => !d.id.endsWith('_sin_llama') && temas.includes(d.tema) && (!palabras || palabras.some((p) => d.id.includes(p))) && !(sin ?? []).some((p) => d.id.includes(p))),
    poner: (d, cx, cy, v) => {
      if (!d) return false;
      const vs = d.variantes;
      const vv = v && vs.includes(v) ? v : pick(vs);
      const [hw, hh] = huellaDe(d, vv);
      const x0 = Math.round(cx - (hw - 1) / 2), y0 = Math.round(cy - (hh - 1) / 2);
      if (x0 < 0 || y0 < 0 || x0 + hw > W || y0 + hh > H) return false;
      for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + hw; x++) if (ocupado[y * W + x]) return false;
      for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + hw; x++) ocupado[y * W + x] = 1;
      m.objetos.push({ id: d.id, v: vv, seed: semilla(d), cx: Math.round(cx), cy: Math.round(cy) });
      return true;
    },
    regar: (ds, n, x0, y0, x1, y1, filtro) => {
      if (!ds.length) return;
      for (let i = 0, intentos = 0; i < n && intentos < n * 12; intentos++) {
        const d = pick(ds), vs = filtro ? d.variantes.filter(filtro) : d.variantes;
        if (!vs.length) continue;
        if (k.poner(d, x0 + Math.floor(r() * (x1 - x0)), y0 + Math.floor(r() * (y1 - y0)), pick(vs))) i++;
      }
    },
    piso: (id, x0 = 0, y0 = 0, x1 = m.ancho, y1 = m.alto) => {
      const d = PISOS.find((p) => p.id === id); if (!d) return;
      for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) m.pisos[j * m.ancho + i] = { id, v: Math.floor(r() * d.variantes) };
    },
  };
  return k;
}
/** De una lista de muros o cercas, el que corre a lo largo de un eje y con qué variante (x: izq/a; y: der/b). */
const EJE = { x: ['x', 'izq', 'largo_x', 'a_lo_largo_x', 'recta_x', 'frente'], y: ['y', 'der', 'largo_y', 'a_lo_largo_y', 'recta_y', 'lado'] };
function conEje(ds: ObjetoDef[], eje: 'x' | 'y', evitar: string[] = ['rot', 'esquina', 'abiert']): [ObjetoDef, string] | null {
  for (const d of ds) {
    const v = d.variantes.find((x) => !evitar.some((e) => x.includes(e)) && EJE[eje].some((t) => x === t || x.endsWith('_' + t) || x.startsWith(t + '_')));
    if (v) return [d, v];
  }
  for (const d of ds) if (EJE[eje].some((t) => d.id.endsWith('_' + t))) return [d, d.variantes[0]];
  return ds.length && eje === 'x' ? [ds[0], ds[0].variantes[0]] : null;
}
/** Un borde de muros: a lo largo de x en la fila cy (o de y en la columna cx), cada `paso` celdas. */
function borde(k: Kit, ds: ObjetoDef[], eje: 'x' | 'y', fijo: number, desde: number, hasta: number, paso = 5) {
  const e = conEje(ds, eje); if (!e) return;
  for (let t = desde; t < hasta; t += paso) k.poner(e[0], eje === 'x' ? t : fijo, eje === 'x' ? fijo : t, e[1]);
}
const sinNieve = (v: string) => !/nevad|nieve|seco|desnud|muert|quem/.test(v);
const ARBOLES_MUERTOS = (k: Kit) => k.buscar(['arboles', 'campo'], ['muert', 'seco', 'quem', 'torc', 'paramo']);
/** Árboles de la selva (los de selva.ts y los gigantes, palmeras y helechos del taller de árboles). */
const SELVA = (k: Kit, extra: string[]) => [...k.buscar(['selva'], ['arbol', 'palma', 'helecho', ...extra]), ...k.buscar(['arboles'], ['arbol_selva', 'palmera', 'helecho', 'pantano'])];

export const PAISAJES: Paisaje[] = [
  { id: 'cementerio', nombre: ['Cementerio', 'Graveyard'], ambiente: 'noche', tam: [5, 5], armar: (k) => {
    k.piso('pasto'); k.piso('lajas_musgo', 2, 0, 3, 5);
    const lapidas = k.buscar(['cementerio'], ['lapida', 'tumba', 'cruz', 'obelisco'], ['mauso', 'entrada', 'reja', 'muro', 'puerta']);
    // hileras de lápidas a los dos lados del camino
    for (let y = 3; y < k.H - 3; y += 3) for (const lado of [[2, 9], [16, 23]]) for (let x = lado[0]; x <= lado[1]; x += 3) if (k.r() < 0.82) k.poner(lapidas[Math.floor(k.r() * lapidas.length)], x, y);
    k.poner(k.buscar(['cementerio'], ['mauso'])[0], 12, 3) || k.poner(k.buscar(['cementerio', 'catacumbas'], ['entrada', 'cripta'])[0], 12, 3);
    const reja = k.buscar(['cementerio'], ['reja', 'verja', 'cerca'], ['puerta', 'porton']);
    const paso = Math.max(2, ...reja.map((d) => (d.huella ?? [3, 1])[0]));
    borde(k, reja, 'x', 0, 1, k.W - 1, paso); borde(k, reja, 'y', 0, 2, k.H - 1, paso);
    k.regar(ARBOLES_MUERTOS(k), 4, 1, 1, k.W - 1, k.H - 1);
    k.regar(k.buscar(['cementerio'], ['vela', 'farol', 'linterna', 'calavera', 'hueso', 'urna', 'flor']), 10, 1, 1, k.W - 1, k.H - 1);
    k.regar(k.buscar(['cementerio'], ['angel', 'estatua', 'ataud', 'sarc', 'fosa']), 4, 2, 2, k.W - 2, k.H - 2);
  } },
  { id: 'cueva', nombre: ['Cueva', 'Cave'], ambiente: 'cripta', tam: [5, 5], armar: (k) => {
    k.piso('cueva');
    const muros = k.buscar(['cueva'], ['muro', 'pared']);
    borde(k, muros, 'x', 0, 2, k.W); borde(k, muros, 'y', 0, 4, k.H);
    k.poner(k.buscar(['cueva'], ['entrada', 'boca'])[0] ?? k.buscar(['comun'], ['cueva'])[0], 14, 1);
    k.regar(k.buscar(['cueva'], ['estalag', 'columna', 'cristal', 'roca', 'piedra', 'escomb']), 14, 2, 2, k.W - 1, k.H - 1);
    k.regar(k.buscar(['cueva'], ['hueso', 'calav', 'costill', 'hongo', 'telar', 'raiz']), 10, 2, 2, k.W - 1, k.H - 1);
    k.regar(k.buscar(['arboles'], ['arbol_hongo', 'hongo_gigante']), 2, 3, 3, k.W - 3, k.H - 3);
    k.regar(k.buscar(['cueva'], ['antorcha', 'tiki', 'fuego']), 3, 3, 3, k.W - 3, k.H - 3);
    k.regar(k.buscar(['cueva'], ['charco', 'pozo', 'agua', 'lago']), 1, 6, 6, k.W - 6, k.H - 6);
  } },
  { id: 'templo', nombre: ['Templo de la selva', 'Jungle temple'], ambiente: 'selva', tam: [6, 6], armar: (k) => {
    k.piso('selva'); k.piso('arenisca', 2, 2, 4, 4); k.piso('arenisca', 2, 4, 4, 6);
    k.poner(k.buscar(['templo_selva'], ['piram'])[0], 15, 13);
    k.regar(k.buscar(['templo_selva'], ['colum', 'idolo', 'estatua', 'cabeza', 'jaguar', 'brasero', 'altar', 'orbe']), 10, 7, 6, 24, 28);
    k.regar(SELVA(k, ['ceiba']), 12, 0, 0, k.W, 8);
    k.regar(SELVA(k, ['enred']), 8, 0, 0, 8, k.H);
    k.regar(k.buscar(['selva'], ['totem', 'calav', 'antorcha', 'hongo', 'capullo']), 6, 0, 0, k.W, k.H);
  } },
  { id: 'catedral', nombre: ['Catedral', 'Cathedral'], ambiente: 'cripta', tam: [5, 5], armar: (k) => {
    k.piso('baldosa_catedral');
    const muros = k.buscar(['monasterio'], ['muro', 'pared']);
    borde(k, muros, 'x', 0, 2, k.W); borde(k, muros, 'y', 0, 4, k.H);
    const pilar = k.buscar(['monasterio'], ['pilar', 'column'], ['rot']);
    for (let y = 6; y < k.H - 2; y += 6) { k.poner(pilar[0], 6, y); k.poner(pilar[0], 18, y); }
    const banco = k.buscar(['monasterio', 'muebles'], ['banca', 'banco', 'pew']);
    for (let y = 9; y < k.H - 3; y += 3) { k.poner(banco[0], 9, y); k.poner(banco[0], 15, y); }
    k.poner(k.buscar(['monasterio'], ['altar'])[0], 12, 4);
    k.regar(k.buscar(['monasterio'], ['brasero', 'antorcha', 'candel', 'vela', 'estatua']), 6, 3, 3, k.W - 2, k.H - 2);
    k.regar(k.buscar(['monasterio'], ['sangre', 'charco']), 1, 8, 8, k.W - 6, k.H - 6);
  } },
  { id: 'campamento', nombre: ['Campamento', 'Encampment'], ambiente: 'atardecer', tam: [6, 6], armar: (k) => {
    k.piso('tierra'); k.piso('pasto', 0, 0, 6, 1); k.piso('pasto', 0, 0, 1, 6);
    const empal = k.buscar(['campamento'], ['empaliz', 'palizad', 'estacad']);
    k.poner(k.buscar(['campamento'], ['torre'])[0], 1, 1);
    borde(k, empal, 'x', 1, 5, k.W - 2); borde(k, empal, 'y', 1, 5, k.H - 2);
    k.poner(k.buscar(['comun'], ['portal_azul'])[0], 20, 22);
    k.poner(k.buscar(['campamento'], ['fogata', 'hoguera'])[0], 15, 15, 'grande');
    const carpas = k.buscar(['campamento'], ['carpa', 'tienda', 'pabell']);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.poner(carpas[i % Math.max(1, carpas.length)], 16.5 + Math.cos(a + 0.3) * 10.5, 16.5 + Math.sin(a + 0.3) * 10.5); }
    k.poner(k.buscar(['comun'], ['viaje', 'waypoint'])[0], 23, 7);
    k.poner(k.buscar(['comun', 'campamento'], ['baul', 'alijo', 'stash'])[0], 9, 22);
    k.regar(k.buscar(['campamento'], ['carro', 'carreta', 'caja', 'saco', 'barril', 'heno', 'estandarte', 'muñeco', 'maniqu', 'yunque', 'forja', 'leña']), 14, 4, 4, k.W - 1, k.H - 1);
  } },
  { id: 'pueblo', nombre: ['Pueblo en ruinas', 'Ruined village'], ambiente: 'noche', tam: [7, 7], armar: (k) => {
    k.piso('pasto_seco'); k.piso('empedrado', 3, 0, 4, 7); k.piso('empedrado', 0, 3, 7, 4);
    const casas = k.buscar(['pueblo', 'casas'], ['quema', 'ardi', 'ruina', 'casa', 'cabaña'], ['torre', 'molino']);
    for (const [x, y] of [[6, 6], [27, 6], [6, 27], [27, 27], [16, 7]] as [number, number][]) k.poner(casas[Math.floor(k.r() * casas.length)], x, y);
    k.poner(k.buscar(['pueblo', 'campo'], ['pozo'])[0], 17, 17);
    k.regar(k.buscar(['pueblo'], ['fuego', 'escomb', 'farol', 'cepo', 'horca', 'jaula', 'puesto', 'cerca']), 14, 1, 1, k.W - 1, k.H - 1);
    k.regar(ARBOLES_MUERTOS(k), 5, 0, 0, k.W, k.H);
  } },
  { id: 'desierto', nombre: ['Pueblo del desierto', 'Desert town'], ambiente: 'desierto', tam: [6, 6], armar: (k) => {
    k.piso('arena'); k.piso('arenisca', 2, 2, 4, 4);
    k.regar(k.buscar(['desierto'], ['casa', 'puerta', 'palac']), 3, 3, 3, k.W - 3, k.H - 3);
    k.regar(k.buscar(['desierto'], ['palm', 'cactus', 'arbust']), 10, 0, 0, k.W, k.H);
    k.regar(k.buscar(['desierto'], ['puesto', 'toldo', 'carpa', 'jarr', 'cant', 'alfom', 'caja', 'pozo', 'santu']), 16, 2, 2, k.W - 2, k.H - 2);
  } },
  { id: 'tumba', nombre: ['Tumba del desierto', 'Desert tomb'], ambiente: 'cripta', tam: [5, 5], armar: (k) => {
    k.piso('arenisca');
    const muros = k.buscar(['tumba'], ['muro', 'pared']);
    borde(k, muros, 'x', 0, 2, k.W); borde(k, muros, 'y', 0, 4, k.H);
    const col = k.buscar(['tumba'], ['colum']);
    for (let y = 5; y < k.H - 2; y += 6) { k.poner(col[0], 6, y); k.poner(col[0], 18, y); }
    k.poner(k.buscar(['tumba'], ['sarc'])[0], 12, 12);
    k.regar(k.buscar(['tumba'], ['estatua', 'guard', 'urna', 'vasij', 'brasero', 'antorcha', 'cofre', 'pincho', 'obelis', 'altar']), 12, 2, 2, k.W - 1, k.H - 1);
  } },
  { id: 'infierno', nombre: ['Infierno', 'Hell'], ambiente: 'infierno', tam: [6, 6], armar: (k) => {
    k.piso('tierra_infierno'); k.piso('lava_grietas', 1, 1, 3, 3); k.piso('pentagrama', 3, 3, 4, 4); k.piso('lava', 5, 0, 6, 2);
    k.regar(k.buscar(['infierno'], ['aguja', 'roca', 'espin', 'obsid']), 10, 0, 0, k.W, k.H);
    k.regar(k.buscar(['infierno'], ['hueso', 'calav', 'empal', 'cadena', 'jaula', 'estatua', 'demon']), 12, 1, 1, k.W - 1, k.H - 1);
    k.regar(k.buscar(['infierno'], ['brasero', 'pilar', 'luz', 'sello']), 5, 10, 10, k.W - 6, k.H - 6);
  } },
  { id: 'nieve', nombre: ['Montaña nevada', 'Snowy highlands'], ambiente: 'nieve', tam: [6, 6], armar: (k) => {
    k.piso('nieve');
    k.regar(k.buscar(['nieve'], ['pino', 'arbol']), 10, 0, 0, k.W, k.H);
    k.regar(k.buscar(['arboles'], ['pino', 'abeto', 'nevado']), 8, 0, 0, k.W, k.H, (v) => v.includes('nevad'));
    k.regar(k.buscar(['nieve'], ['roca', 'ventis']), 8, 0, 0, k.W, k.H);
    k.regar(k.buscar(['nieve'], ['barric', 'catapul', 'torre', 'totem', 'estand', 'poste', 'tronco', 'jaula', 'trineo', 'altar']), 10, 3, 3, k.W - 3, k.H - 3);
  } },
  { id: 'bosque', nombre: ['Páramo y bosque', 'Moor & forest'], ambiente: 'dia', tam: [6, 6], armar: (k) => {
    k.piso('pasto'); k.piso('camino', 0, 3, 6, 4);
    // mezcla de especies y edades (cada árbol con su semilla: ninguno sale igual)
    const arb = k.buscar(['arboles'], ['roble', 'haya', 'pino', 'abedul', 'abeto', 'alamo', 'cipres', 'sauce'], ['muert', 'tocon', 'seco', 'quem', 'jaula']);
    k.regar(arb, 10, 0, 0, k.W, 13, sinNieve); k.regar(arb, 6, 0, 21, k.W, k.H, sinNieve);
    k.regar(k.buscar(['arboles'], ['arbust', 'acebo', 'enebro', 'brezo', 'helech', 'hongos', 'zarza', 'flor', 'tocon', 'tronco', 'raices', 'pasto']), 16, 0, 0, k.W, k.H, sinNieve);
    k.regar(k.buscar(['campo'], ['roca', 'penasco', 'menhir', 'mojon', 'muro_ruina', 'cerca_rota', 'letrero', 'esqueleto', 'craneo', 'fogata']), 8, 0, 0, k.W, k.H);
  } },
  { id: 'catacumbas', nombre: ['Catacumbas', 'Catacombs'], ambiente: 'cripta', tam: [5, 5], armar: (k) => {
    k.piso('hueso'); k.piso('lajas', 1, 1, 4, 4);
    const muros = k.buscar(['catacumbas'], ['nicho', 'muro', 'pared']);
    borde(k, muros, 'x', 0, 2, k.W); borde(k, muros, 'y', 0, 4, k.H);
    k.regar(k.buscar(['catacumbas']), 14, 3, 3, k.W - 1, k.H - 1);
    k.regar(k.buscar(['monasterio'], ['antorcha', 'brasero']), 3, 4, 4, k.W - 4, k.H - 4);
  } },
  { id: 'arcano', nombre: ['Santuario arcano', 'Arcane sanctuary'], ambiente: 'cripta', tam: [5, 5], armar: (k) => {
    for (let j = 0; j < k.m.alto; j++) for (let i = 0; i < k.m.ancho; i++) k.m.pisos[j * k.m.ancho + i] = i === 2 || j === 2 ? { id: 'arcano', v: Math.floor(k.r() * 2) } : null;
    k.regar(k.buscar(['arcano']), 10, 10, 0, 15, k.H);
    k.regar(k.buscar(['arcano']), 6, 0, 10, k.W, 15);
  } },
  { id: 'fortaleza', nombre: ['Fortaleza del cielo', 'Heavenly fortress'], ambiente: 'noche', tam: [5, 5], armar: (k) => {
    k.piso('fortaleza'); k.piso('arcano', 0, 0, 5, 1);
    k.regar(k.buscar(['fortaleza'], ['muro', 'pared', 'puerta']), 3, 0, 0, k.W, 4);
    k.regar(k.buscar(['fortaleza']), 12, 2, 5, k.W - 2, k.H - 2);
  } },
];

/** Arma un paisaje con su semilla. */
/**
 * Quién vive en cada paisaje: monstruos (y en el campamento, gente del lugar) que se ponen quietos en celdas libres,
 * mirando a cualquier lado, para que el lugar se vea habitado. Los ids que no existan se saltan.
 */
export const HABITANTES: Record<string, string[]> = {
  cementerio: ['mon_esqueleto', 'mon_zombi', 'mon_aparecida', 'mon_necrofago', 'mon_esqueleto_arquero'],
  cueva: ['mon_arana_cueva', 'mon_murcielago_gigante', 'mon_lobo_sombrio', 'mon_trol_pantano'],
  templo: ['mon_brujo_diablillo', 'mon_diablillo', 'mon_trol_pantano', 'mon_escorpion_gigante'],
  catedral: ['mon_cultista', 'mon_sacerdote_caido', 'mon_penitente', 'mon_sin_rostro'],
  campamento: ['per_templario_novato', 'per_cazadora_novato', 'per_druida_novato', 'per_alquimista_novato'],
  pueblo: ['mon_zombi', 'mon_bandido', 'mon_necrofago', 'mon_aparecida'],
  desierto: ['mon_momia', 'mon_escorpion_gigante', 'mon_bandido'],
  tumba: ['mon_momia', 'mon_esqueleto', 'mon_cangrejo_cripta'],
  infierno: ['mon_diablillo', 'mon_perro_infernal', 'mon_desollado', 'mon_caballero_abismo'],
  nieve: ['mon_lobo_sombrio', 'mon_satiro', 'mon_espectro'],
  bosque: ['mon_lobo_sombrio', 'mon_jabali_demonio', 'mon_bandido', 'mon_bruja'],
  catacumbas: ['mon_esqueleto', 'mon_esqueleto_arquero', 'mon_carcelero', 'mon_caballero_muerto'],
  arcano: ['mon_sin_rostro', 'mon_espectro', 'mon_gargola'],
  fortaleza: ['mon_caballero_espectral', 'mon_gargola', 'mon_guardia_corrupto'],
};

export function generarPaisaje(id: string, seed = 1, o: { habitantes?: number } = {}): MapaGotico {
  const p = PAISAJES.find((x) => x.id === id) ?? PAISAJES[0];
  const m = crearMapa(p.tam[0], p.tam[1], 'pasto', p.nombre[0]);
  m.ambiente = p.ambiente;
  const k = kit(m, seed);
  p.armar(k);
  const n = o.habitantes ?? Math.round(p.tam[0] * p.tam[1] / 6);
  const seres = (HABITANTES[p.id] ?? []).map((x) => REGISTRO.find((d) => d.id === `${x}_quieto`)).filter((d): d is ObjetoDef => !!d);
  if (n > 0 && seres.length) k.regar(seres, n, 3, 3, k.W - 3, k.H - 3);
  return m;
}
