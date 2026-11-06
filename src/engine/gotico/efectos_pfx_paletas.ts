/**
 * Paletas góticas para los efectos mudados de pixelfx (efectos_pfx.ts).
 *
 * pixelfx pinta con rampas de pixel art de vista lateral: saturadas, con violeta en las sombras y blanco puro en todos
 * los núcleos. Acá van las rampas del taller, de la sombra a la luz, sacadas de las paletas de poderes.ts (FUEGO,
 * HIELO, RAYO, VENENO, SAGRADO, SOMBRA, ARCANO, ALMA) y de los metales encendidos de elementos_arma.ts (ar_sangre,
 * ar_icor, ar_rayo, ar_runa_oro, ar_nucleo_sombra, ar_hielo): sombras más hondas, medios apagados y núcleos calientes
 * teñidos (crema en el fuego, hueso pálido en lo sagrado, azul nieve en el hielo), nunca blanco plano.
 *
 * Cada efecto de pixelfx recibe estas rampas por sus opciones (`palette` y las demás rampas que declara); lo que el
 * efecto pinta con colores fijos (WHITE, humo de su núcleo) lo corrige la gradación (`gradar`).
 */

export type Rampa = readonly string[];

/** Rampas de 9 pasos, de la sombra a la luz. */
export const RAMPAS = {
  fuego: ['#120403', '#300a05', '#5c1207', '#94220a', '#c63c0e', '#e86a20', '#f89a44', '#fcc684', '#fde6c0'],
  brasa: ['#0e0403', '#240805', '#420e06', '#6a1808', '#962a0c', '#bc4412', '#d86a24', '#eaa058', '#f6d29a'],
  hielo: ['#050b14', '#0c1c2e', '#14304a', '#1e4866', '#2e6688', '#4888aa', '#70aac8', '#a6d0e4', '#dcf0f8'],
  agua: ['#03070c', '#08121e', '#0f2032', '#183248', '#244860', '#36627c', '#56849c', '#86aec0', '#c4dce6'],
  rayo: ['#070512', '#120e34', '#221e60', '#363892', '#5258be', '#7c84de', '#a8b2f0', '#d0d8fc', '#eef0ff'],
  veneno: ['#040803', '#0c1606', '#18280a', '#283e0e', '#3e5a14', '#5c7c1e', '#86a236', '#b4c868', '#e0eaa8'],
  sombra: ['#030106', '#0a0512', '#160a24', '#24103a', '#381a56', '#522a78', '#76489c', '#a07cc2', '#d0bce4'],
  sagrado: ['#100904', '#2a1806', '#52320c', '#825614', '#ae7e22', '#d2a440', '#e8c672', '#f6e0a6', '#fdf2d6'],
  sangre: ['#0c0102', '#200204', '#360508', '#50090c', '#6c0e10', '#8a1614', '#a8241a', '#c84a36', '#e0806a'],
  arcano: ['#05030c', '#0e0a22', '#1c1640', '#2c2466', '#40388e', '#5a52b2', '#8078cc', '#aca6e2', '#dcd8f4'],
  naturaleza: ['#050904', '#0c1708', '#162a10', '#223e18', '#325620', '#46702c', '#668e40', '#92b266', '#c6d8a0'],
  alma: ['#030809', '#06161a', '#0c282c', '#123e40', '#1c5a58', '#2e7a74', '#509e94', '#88c4b8', '#cceae0'],
  necro: ['#030805', '#06140a', '#0c2412', '#14381c', '#1e5228', '#2e7038', '#4c9452', '#80bc80', '#c2e4bc'],
  tierra: ['#090705', '#15100b', '#221a12', '#31261a', '#433424', '#574530', '#6e5a40', '#8a7456', '#ac9676'],
  piedra: ['#070708', '#111113', '#1c1b1e', '#29272b', '#38353a', '#4a4649', '#5f5a5b', '#79736f', '#9a938a'],
  humo: ['#050406', '#0c0a0e', '#151218', '#1f1b22', '#2a252d', '#37303a', '#463e47', '#574e56', '#6b6168'],
  ceniza: ['#060506', '#0f0d0f', '#1a1719', '#262224', '#332d30', '#433b3d', '#564d4d', '#6c6260', '#867a74'],
  oro: ['#120a02', '#2a1804', '#4e3008', '#7a4e0e', '#a47218', '#c8962a', '#dfb84e', '#efd486', '#f9eac4'],
  acero: ['#07080a', '#121418', '#1f2328', '#2f353c', '#434b54', '#5c666f', '#7c868e', '#a2aab0', '#ccd2d6'],
  hueso: ['#0a0807', '#1a1611', '#2e281f', '#463e30', '#605644', '#7e735c', '#9e9478', '#beb698', '#dcd6bc'],
  madera: ['#080504', '#140c08', '#22150c', '#321f12', '#452b18', '#5a3a20', '#724c2a', '#8c6238', '#a87c4c'],
  carne: ['#0c0304', '#1e0708', '#340d0e', '#4e1514', '#6a201c', '#863028', '#a2463a', '#bc6656', '#d6907e'],
  /** fuego de espíritu o fuego fatuo: verde de cripta, apagado */
  fatuo: ['#020605', '#05120e', '#0a2018', '#103426', '#184c36', '#246a48', '#3c8c5e', '#6cb282', '#b2dcb8'],
  /** fuego del infierno de la sombra: violeta casi negro con bordes de brasa morada */
  infierno: ['#040106', '#0c030e', '#1a0618', '#2c0a26', '#441038', '#5e1a4c', '#7e2e62', '#a24e7e', '#c88aa8'],
  noche: ['#020306', '#05070e', '#090d18', '#0f1524', '#161e32', '#202a42', '#2e3a56', '#425070', '#5e6e8e'],
} as const satisfies Record<string, Rampa>;

export type NombreRampa = keyof typeof RAMPAS;

/** Color hexadecimal (#rrggbb) a [r, g, b] 0..255. */
export const rgbHex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const aHex = (c: readonly number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/**
 * La rampa remuestreada a `n` pasos interpolando (pixelfx elige por índice: así cada paso que lee el efecto cae
 * donde corresponde y no se repiten colores).
 */
export function rampa(nombre: NombreRampa | Rampa, n: number): string[] {
  const r = (typeof nombre === 'string' ? RAMPAS[nombre] : nombre).map(rgbHex);
  if (n <= 1) return [aHex(r[r.length - 1])];
  return Array.from({ length: n }, (_, i) => {
    const x = (i / (n - 1)) * (r.length - 1), a = Math.min(r.length - 2, Math.floor(x)), f = x - a;
    return aHex([0, 1, 2].map((k) => r[a][k] + (r[a + 1][k] - r[a][k]) * f));
  });
}

/** Un tramo de la rampa (de `desde` a `hasta`, fracciones 0..1) remuestreado a n pasos. */
export function tramo(nombre: NombreRampa | Rampa, n: number, desde: number, hasta: number): string[] {
  const base = rampa(nombre, 33);
  const a = Math.round(desde * 32), b = Math.round(hasta * 32);
  return rampa(base.slice(Math.min(a, b), Math.max(a, b) + 1), n);
}

/**
 * Gradación final de cada pixel (sobre RGBA con alfa directa, ya compuesta la luz):
 * - `sat`: cuánto de la saturación queda (1 igual, 0.8 baja lo chillón);
 * - `sombra`: gamma de los oscuros (más de 1 los hunde);
 * - `blanco`: color al que tiende lo que llega casi a blanco (el núcleo caliente del elemento) y `tope` cuánto;
 * - `brillo`: multiplicador general;
 * - `violeta`: cuánto se apaga el violeta de las sombras de pixelfx (humo, piedra y polvo violáceos) en los
 *   elementos que no son violetas (0 lo deja).
 */
export interface Gradacion {
  sat: number;
  violeta: number;
  sombra: number;
  blanco: string;
  tope: number;
  brillo: number;
}

export const GRADACION_BASE: Gradacion = { sat: 0.84, violeta: 0.8, sombra: 1.12, blanco: '#f4ead8', tope: 0.55, brillo: 1 };

/** Ajustes de la gradación por elemento: la sangre y la carne pixelfx las pinta en rojo neón. */
export const GRADACION_ELEMENTO: Partial<Record<NombreRampa, Partial<Gradacion>>> = {
  sangre: { sat: 0.68, brillo: 0.9 },
  carne: { sat: 0.7, brillo: 0.92 },
  veneno: { sat: 0.78 },
};

/** Elementos violetas o azules por naturaleza: su violeta no se apaga. */
export const VIOLETAS: readonly NombreRampa[] = ['sombra', 'arcano', 'infierno', 'rayo'];

/** El núcleo caliente de cada rampa: su último paso. */
export const nucleo = (n: NombreRampa) => RAMPAS[n][RAMPAS[n].length - 1];

/** Gradúa un buffer RGBA en el lugar. */
export function gradar(d: Uint8ClampedArray, g: Gradacion): void {
  const [wr, wg, wb] = rgbHex(g.blanco);
  const gam = g.sombra, sat = g.sat, tope = g.tope, br = g.brillo, vio = g.violeta;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
    const l = 0.299 * r + 0.587 * gg + 0.114 * b;
    // menos saturación (y casi nada en lo violeta si el elemento no lo es)
    let s = sat;
    if (vio > 0 && b > r * 0.9 && b > gg * 1.1 && r > gg) s *= 1 - vio * Math.min(1, (Math.min(b - gg, r - gg) * 6));
    r = l + (r - l) * s; gg = l + (gg - l) * s; b = l + (b - l) * s;
    // sombras más hondas: la gamma pesa más en lo oscuro
    const m = Math.max(r, gg, b, 1e-6), k = Math.pow(m, gam) / m;
    r *= k * br; gg *= k * br; b *= k * br;
    // lo casi blanco se tiñe del núcleo del elemento
    const w = Math.min(r, gg, b);
    if (w > 0.8 && tope > 0) {
      const f = Math.min(1, (w - 0.8) / 0.2) * tope;
      r += (wr / 255 - r) * f; gg += (wg / 255 - gg) * f; b += (wb / 255 - b) * f;
    }
    d[i] = r * 255; d[i + 1] = gg * 255; d[i + 2] = b * 255;
  }
}
