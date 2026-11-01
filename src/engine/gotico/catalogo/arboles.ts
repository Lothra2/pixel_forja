import { registrar, type Arma, type Pieza } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, hueso, bulto, masa, type Comp } from '../render';

/**
 * Árboles y plantas del páramo oscuro. Cada árbol crece con su gramática: un tronco con pie ensanchado y raíces de
 * contrafuerte, ramas que se abren en hijas a lo largo de la madre (con ángulo, largo y grosor propios de la especie)
 * y se tuercen y afinan; la madera gruesa es una masa orgánica (cada rama madre es una masa con un collar del
 * tronco, así la horqueta sale fundida) y la fina son palos. La copa son racimos de 3 a 8 elipsoides chicos en las
 * puntas de las ramas, cada racimo con su tono, con huecos por donde se ven ramas y cielo. Todo sale de la semilla:
 * inclinación, cuántas ramas madre y hacia dónde, alto del fuste, forma de la copa. Las plantas chicas (arbustos,
 * helechos, pasto, hongos, flores, juncos, raíces, tocones y troncos caídos) son racimos de piezas con giros y alturas
 * al azar.
 */

type V = [number, number, number];

// ------------------------------------------------------------------ materiales propios del tema
/** Hojarasca: manchas de hojas sueltas (claras arriba, huecos oscuros) para que un racimo no se lea como una bola. */
const hojeo = (k: number, fuerza = 1) => (p: V) => {
  const a = ruido(p[0] * k, p[1] * k, p[2] * k), b = ruido(p[0] * k * 2.4 + 5.1, p[1] * k * 2.4 + 1.7, p[2] * k * 2.4);
  return ((a - 0.5) * 0.32 + (b > 0.64 ? 0.15 : b < 0.3 ? -0.2 : 0)) * fuerza;
};
const M = (rampa: string[], ruidoK: number, escala: number, extra: Partial<(typeof MATERIALES)[string]> = {}) => ({ rampa, ruido: ruidoK, escala, ...extra });
Object.assign(MATERIALES, {
  arboles_abedul: M(['#24221f', '#45423c', '#6a665d', '#8e897d', '#aea89a', '#c8c2b3', '#dcd7c9'], 0.2, 0.3, {
    patron: (p: V) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 1.1) > 0.68 ? -0.55 : 0) + (ruido(p[0] * 0.5 + 7, p[1] * 0.5, p[2] * 0.25) > 0.8 ? -0.3 : 0),
  }),
  arboles_carbon: M(['#060505', '#0e0c0b', '#171412', '#211d1a', '#2c2723', '#38322d'], 0.5, 0.35, {
    patron: (p: V) => (ruido(p[0] * 0.45, p[1] * 0.45, p[2] * 0.3) > 0.7 ? -0.25 : 0) + (ruido(p[0] * 0.2, p[1] * 0.2, p[2] * 1.2) > 0.75 ? 0.15 : 0),
  }),
  arboles_ceniza: M(['#141312', '#22201e', '#33302d', '#45413d', '#58534e', '#6b655f'], 0.5, 0.3),
  arboles_sauce: M(['#0b0f07', '#151c0d', '#202a14', '#2c381b', '#384622', '#46552a', '#556432'], 0.5, 0.45, { patron: hojeo(0.9) }),
  arboles_zarza: M(['#0f0908', '#1b100d', '#291813', '#382119', '#472b20', '#573628'], 0.35, 0.5),
  arboles_flor_lila: M(['#1a131d', '#2b2030', '#3e2e44', '#513c58', '#634b6b', '#775c7f'], 0.3, 0.6),
  arboles_flor_amarilla: M(['#262010', '#3d3418', '#574b22', '#70612d', '#887739', '#9f8c48'], 0.3, 0.6),
  arboles_flor_blanca: M(['#33312c', '#4f4c44', '#6c685d', '#888376', '#a19b8c', '#b7b1a0'], 0.3, 0.6),
  arboles_flor_sangre: M(['#140506', '#24090b', '#370e10', '#4b1416', '#5f1a1c', '#732225'], 0.3, 0.6),
  arboles_flor_negra: M(['#0a080b', '#141016', '#1e1822', '#29212e', '#342a3a', '#403446'], 0.3, 0.6),
  arboles_hongo_rojo: M(['#1a0c0a', '#2c1410', '#3f1d17', '#52281f', '#653428', '#784232'], 0.3, 0.35, { brillo: 0.15 }),
  arboles_hongo_palido: M(['#29251f', '#403a31', '#585044', '#706757', '#877d69', '#9b917b'], 0.25, 0.35),
  arboles_hongo_luz: M(['#123a33', '#1d5446', '#2a705a', '#3a8c6c', '#56a882'], 0.3, 0.5, { emite: true }),
  // follajes: rampas largas y apagadas con manchas de hojas
  arboles_follaje: M(['#070a05', '#0f150a', '#18210f', '#222e15', '#2d3b1b', '#3a4a22', '#4a5b2c', '#5c6d38'], 0.4, 0.5, { patron: hojeo(0.85) }),
  arboles_follaje_claro: M(['#0b0d05', '#161a0a', '#222810', '#2f3716', '#3d461d', '#4c5625', '#5d672f'], 0.4, 0.5, { patron: hojeo(0.95) }),
  arboles_follaje_frio: M(['#05090a', '#0b1312', '#121d1a', '#1a2822', '#23342b', '#2d4135', '#394f40'], 0.4, 0.55, { patron: hojeo(1.1) }),
  arboles_follaje_selva: M(['#040907', '#07110c', '#0c1a11', '#122517', '#19301d', '#213c24', '#2a482c'], 0.4, 0.45, { patron: hojeo(0.7) }),
  arboles_otono: M(['#120805', '#22100a', '#341a0e', '#482512', '#5d3216', '#72401b', '#874f22', '#9a6030'], 0.4, 0.5, { patron: hojeo(0.85) }),
  arboles_oro: M(['#141006', '#261e0b', '#3a2e10', '#4f4016', '#65521d', '#7a6426', '#8f7631'], 0.4, 0.5, { patron: hojeo(0.95) }),
  arboles_cobre: M(['#130906', '#23110b', '#351a10', '#4a2416', '#5e2f1b', '#723a21', '#86472a'], 0.4, 0.5, { patron: hojeo(0.9) }),
  arboles_agujas: M(['#05080a', '#0a1110', '#101a17', '#16241e', '#1d2f26', '#253a2e', '#2e4637'], 0.45, 0.7, { patron: hojeo(1.4, 0.9) }),
  arboles_palma: M(['#0a0d05', '#141a0a', '#1f2810', '#2b3616', '#38451d', '#465526', '#55642f'], 0.35, 0.6, { patron: (p: V) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) - 0.5) * 0.3 }),
  arboles_palma_seca: M(['#16100a', '#281d11', '#3b2b18', '#4f3a20', '#634a29', '#775a33'], 0.4, 0.6, { patron: (p: V) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) - 0.5) * 0.3 }),
  arboles_barba: M(['#0f120d', '#1c2119', '#2b3126', '#3b4234', '#4c5443', '#5e6753'], 0.6, 0.9),
  arboles_acebo: M(['#03080a', '#08110f', '#0f1c16', '#16271d', '#1f3325', '#29402e'], 0.35, 0.8, { brillo: 0.35, patron: hojeo(1.3, 0.8) }),
  arboles_brezo: M(['#120a14', '#21122a', '#311b3a', '#41244b', '#522e5b', '#63396b'], 0.5, 0.9),
  // cortezas
  arboles_roble: M(['#0c0907', '#18120d', '#251c14', '#33271c', '#423325', '#52402f', '#634e3a'], 0.4, 0.4, {
    patron: (p: V) => (ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.1) > 0.6 ? -0.28 : 0) + (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) - 0.5) * 0.2,
  }),
  arboles_haya: M(['#131417', '#222328', '#333438', '#46474a', '#5a5a5b', '#6e6d6c', '#82807d'], 0.2, 0.2, {
    patron: (p: V) => (ruido(p[0] * 0.35, p[1] * 0.35, p[2] * 0.35) > 0.7 ? 0.12 : 0) + (ruido(p[0] * 0.9, p[1] * 0.9, p[2] * 0.2) > 0.78 ? -0.2 : 0),
  }),
  arboles_pino_corteza: M(['#120a07', '#20120c', '#311b12', '#432619', '#563221', '#693e2a', '#7c4c35'], 0.35, 0.4, {
    patron: (p: V) => (ruido(p[0] * 0.55, p[1] * 0.55, p[2] * 0.22) > 0.62 ? -0.32 : 0) + (ruido(p[0] * 1.2, p[1] * 1.2, p[2] * 0.6) > 0.7 ? 0.12 : 0),
  }),
  arboles_baobab: M(['#18130f', '#2a221c', '#3d322a', '#51443a', '#66574b', '#7a6a5d', '#8e7e70'], 0.25, 0.15, {
    patron: (p: V) => (ruido(p[0] * 0.25, p[1] * 0.25, p[2] * 1.1) > 0.66 ? -0.18 : 0) + (ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.1) - 0.5) * 0.15,
  }),
  arboles_tronco_palma: M(['#140f0a', '#231a11', '#342719', '#463522', '#59442c', '#6c5437'], 0.3, 0.4, {
    patron: (p: V) => { const f = (((p[2] / 2.6) % 1) + 1) % 1; return f < 0.25 ? -0.32 : (f - 0.6) * 0.25; },
  }),
});

// ------------------------------------------------------------------ vectores
const nrm = (v: V): V => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const mas = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mez = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const cruz = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const az = (a: Arma, k = 1) => (a.r() - 0.5) * 2 * k;
const PI2 = Math.PI * 2;
const pick = <T,>(a: Arma, xs: T[]) => xs[Math.floor(a.r() * xs.length)];
/** Gira la dirección `d` un ángulo `ang` (radianes) hacia el costado `phi`. */
function desvia(d: V, ang: number, phi: number): V {
  const t: V = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = nrm(cruz(t, d)), w = cruz(d, u), c = Math.cos(ang), s = Math.sin(ang), cp = Math.cos(phi), sp = Math.sin(phi);
  return nrm([d[0] * c + (u[0] * cp + w[0] * sp) * s, d[1] * c + (u[1] * cp + w[1] * sp) * s, d[2] * c + (u[2] * cp + w[2] * sp) * s]);
}
/** Variantes de edad: las viejas del catálogo (verde, dorado...) caen en adulto. */
const edadDe = (v: string) => (v.includes('joven') ? 0 : v.includes('viejo') ? 2 : 1);

// ------------------------------------------------------------------ esqueleto de ramas
interface Seg { a: V; b: V; r0: number; r1: number; g: number; n: number }
interface Punta { p: V; d: V; r: number; n: number; g: number }
interface Esq { segs: Seg[]; puntas: Punta[]; horq: Punta[]; rotas: Punta[]; collar: Map<number, Seg>; ng: number; N: number }
/** Gramática de una especie: cómo se abre cada nivel (N es el tronco, 0 las ramitas). */
interface Gram {
  hijos: (n: number) => number;
  /** Desde dónde (0..1 a lo largo de la madre) salen las hijas. */
  desde: (n: number) => number;
  /** Ángulo con la madre (radianes) y cuánto varía (fracción). */
  abre: (n: number, t: number) => number;
  abreVar?: number;
  /** Largo de la hija respecto de la madre según dónde sale. */
  largo: (n: number, t: number) => number;
  /** Grosor de la hija respecto de la madre en ese punto. */
  grosor?: number;
  /** Radio de la punta / radio de la base de cada rama. */
  adelgaza: number;
  tramos: (n: number) => number;
  /** Torcedura por tramo y tirón vertical (negativo: cuelga). */
  nudos: number;
  /** Torcedura del tronco (si no, la de las ramas a la mitad). */
  nudosTronco?: number;
  sube: (n: number) => number;
  /** Viento o luz: todas las ramas tiran un poco hacia ese lado. */
  tira?: V;
  /** Ramas que se quiebran (sin hijas, punta astillada). */
  quiebra?: number;
  /** Las ramas por debajo de este nivel no dan punta para hojas. */
  rMin?: number;
}
function nuevoEsq(N: number): Esq { return { segs: [], puntas: [], horq: [], rotas: [], collar: new Map(), ng: 0, N }; }
function crecer(a: Arma, E: Esq, G: Gram, p0: V, d0: V, L: number, r: number, n: number, g = 0) {
  const k = Math.max(1, G.tramos(n));
  const pts: V[] = [p0], rs = [r], ds: V[] = [];
  let d = d0, p = p0;
  const t = G.tira ?? [0, 0, 0], su = G.sube(n);
  for (let s = 1; s <= k; s++) {
    const nu = n === E.N ? G.nudosTronco ?? G.nudos * 0.5 : G.nudos;
    if (s > 1 || n < E.N) d = nrm([d[0] + az(a, nu) + t[0], d[1] + az(a, nu) + t[1], d[2] + az(a, nu * 0.5) + su + t[2]]);
    p = mas(p, d, L / k); pts.push(p); ds.push(d);
    rs.push(Math.max(G.rMin ?? 0.45, r * (1 - (1 - G.adelgaza) * s / k)));
    E.segs.push({ a: pts[s - 1], b: p, r0: rs[s - 1], r1: rs[s], g, n });
  }
  if (n <= 0) { E.puntas.push({ p, d, r: rs[k], n, g }); return; }
  if (G.quiebra && n < E.N && a.r() < G.quiebra) { E.rotas.push({ p, d, r: rs[k], n, g }); return; }
  const h = G.hijos(n), t0 = G.desde(n), phi0 = a.r() * PI2;
  for (let i = 0; i < h; i++) {
    const tt = h === 1 ? 1 : Math.min(1, t0 + (1 - t0) * (i + 0.15 + a.r() * 0.7) / h);
    const u = tt * k, si = Math.min(k - 1, Math.floor(u)), f = u - si;
    const q = mez(pts[si], pts[si + 1], f), rq = rs[si] + (rs[si + 1] - rs[si]) * f, dq = ds[si];
    const ang = G.abre(n, tt) * (1 + az(a, G.abreVar ?? 0.3));
    const cd = desvia(dq, ang, phi0 + i * 2.39996 + az(a, 0.45));
    const cr = Math.max(G.rMin ?? 0.45, rq * (G.grosor ?? 0.7) * (0.85 + a.r() * 0.3));
    const cL = L * G.largo(n, tt) * (0.8 + a.r() * 0.4);
    let cg = g;
    if (n === E.N || (n === E.N - 1 && cr > 2.4)) {
      cg = ++E.ng;
      E.collar.set(cg, { a: mas(q, dq, -rq * 1.4), b: mas(q, dq, rq * 1.4), r0: rq * 0.97, r1: rq * 0.97, g: cg, n });
    }
    E.horq.push({ p: q, d: cd, r: cr, n, g });
    crecer(a, E, G, q, cd, cL, cr, n - 1, cg);
  }
  if (n <= 1) E.puntas.push({ p, d, r: rs[k], n, g });
}

/** Opciones para vestir la madera del esqueleto. */
interface OpcMadera {
  mat: string;
  /** Las ramas más finas que esto son palos sueltos (más baratos). */
  rPalo?: number;
  /** Componentes por masa (lo que sobra va en palos). */
  max?: number;
  suave?: number;
  /** Componentes extra del tronco (pie, raíces, nudos). */
  pie?: Comp[];
  /** Probabilidad de nudo y de mancha de musgo en cada tramo grueso. */
  nudos?: number;
  musgo?: number;
  matMusgo?: string;
  /** Nieve encima de la madera gruesa. */
  nieve?: number;
  /** Corteza caída (madera pelada clara) y grietas de otro material (brasas). */
  pelado?: number;
  grietas?: number;
  matGrieta?: string;
  tono?: number;
}
function madera(a: Arma, ps: Pieza[], E: Esq, o: OpcMadera) {
  const rPalo = o.rPalo ?? 1.3, max = o.max ?? 14;
  const grupos = new Map<number, Seg[]>();
  for (const s of E.segs) {
    if (s.r0 < rPalo && s.g !== 0) { ps.push(a.palo(s.a, s.b, Math.max(0.55, s.r0), { mat: o.mat, r1: Math.max(0.45, s.r1), tono: o.tono })); continue; }
    if (!grupos.has(s.g)) grupos.set(s.g, []);
    grupos.get(s.g)!.push(s);
  }
  for (const [g, segs] of grupos) {
    const comps: Comp[] = [];
    if (g === 0 && o.pie) comps.push(...o.pie);
    const col = E.collar.get(g);
    if (col) comps.push(hueso(col.a, col.b, col.r0, col.r1));
    const orden = segs.slice().sort((x, y) => y.r0 - x.r0);
    const cupo = Math.max(2, max - comps.length);
    orden.forEach((s, i) => {
      if (i >= cupo) { ps.push(a.palo(s.a, s.b, Math.max(0.55, s.r0), { mat: o.mat, r1: Math.max(0.45, s.r1), tono: o.tono })); return; }
      comps.push(hueso(s.a, s.b, s.r0, s.r1));
    });
    // nudos, musgo y nieve sobre la madera gruesa
    for (const s of orden.slice(0, cupo)) {
      if (s.r0 < 2.2) continue;
      const d = nrm(mas(s.b, s.a, -1)), m = mez(s.a, s.b, 0.3 + a.r() * 0.4), rr = (s.r0 + s.r1) / 2;
      if (o.nudos && a.r() < o.nudos) {
        const lado = desvia(d, Math.PI / 2, a.r() * PI2);
        comps.push(bulto(mas(m, lado, rr * 0.75), [rr * 0.45, rr * 0.4, rr * 0.4], { eje: lado, tono: -0.06 }));
      }
      if (o.musgo && a.r() < o.musgo) {
        const sube = Math.max(0.2, 1 - Math.abs(d[2]));
        comps.push(bulto(mas(m, [0.35, -0.3, 0.75], rr * 0.42), [rr * (1.2 + sube), rr * 0.75, rr * 0.6], { eje: d, mat: o.matMusgo ?? 'musgo', k: 1 }));
      }
      if (o.pelado && a.r() < o.pelado) {
        const lado = desvia(d, Math.PI / 2, a.r() * PI2);
        comps.push(bulto(mas(m, lado, rr * 0.72), [dist(s.a, s.b) * 0.3, rr * 0.5, rr * 0.38], { eje: d, mat: 'madera_vieja', k: 0.6, tono: 0.08 }));
      }
      if (o.grietas && a.r() < o.grietas) {
        const lado = desvia(d, Math.PI / 2, a.r() * PI2);
        comps.push(bulto(mas(m, lado, rr * 0.93), [dist(s.a, s.b) * (0.2 + a.r() * 0.2), rr * 0.13, rr * 0.13], { eje: desvia(d, 0.25, a.r() * PI2), mat: o.matGrieta ?? 'lava', k: 0.2, tono: -0.15 + a.r() * 0.2 }));
      }
      if (o.nieve && a.r() < o.nieve && Math.abs(d[2]) < 0.85) {
        comps.push(bulto(mas(m, [0, 0, 1], rr * 0.7), [dist(s.a, s.b) * 0.45, rr * 0.8, rr * 0.55], { eje: [d[0], d[1], d[2] * 0.3], mat: 'nieve', k: 0.8 }));
      }
    }
    ps.push(masa(comps, { mat: o.mat, suave: g === 0 ? (o.suave ?? 2.5) * 1.3 : o.suave ?? 2.2, tono: o.tono }));
  }
  // puntas quebradas: astilla
  for (const q of E.rotas) if (q.r > 0.8) ps.push(a.palo(q.p, mas(q.p, desvia(q.d, 0.3, a.r() * PI2), q.r * 1.8 + 1), q.r * 0.8, { mat: 'madera_vieja', r1: 0.2 }));
}
/** Pie del tronco: el ensanche y las raíces de contrafuerte que se hunden en la tierra. */
function pie(a: Arma, r: number, n: number, o: { largo?: number; alto?: number; base?: V; hunde?: number; nudosas?: number } = {}): Comp[] {
  const b = o.base ?? [0, 0, 0], L = o.largo ?? 2.6, H = o.alto ?? 1.5;
  const cs: Comp[] = [bulto([b[0], b[1], b[2] + r * 0.45], [r * 1.3, r * 1.25, r * 0.95], { giro: a.r() * 180 })];
  const g0 = a.r() * PI2;
  for (let i = 0; i < n; i++) {
    const g = g0 + (i / n) * PI2 + az(a, 0.45), c = Math.cos(g), s = Math.sin(g), l = r * L * (0.7 + a.r() * 0.6);
    const p0: V = [b[0] + c * r * 0.2, b[1] + s * r * 0.2, b[2] + r * H * (0.7 + a.r() * 0.6)];
    const g2 = g + az(a, 0.35) * (o.nudosas ?? 1);
    const p1: V = [b[0] + c * l * 0.55, b[1] + s * l * 0.55, b[2] + r * 0.25];
    const p2: V = [b[0] + Math.cos(g2) * l, b[1] + Math.sin(g2) * l, b[2] - (o.hunde ?? 0.8)];
    const rr = r * (0.42 + a.r() * 0.18);
    cs.push(hueso(p0, p1, rr, rr * 0.55), hueso(p1, p2, rr * 0.55, rr * 0.2));
  }
  return cs;
}

// ------------------------------------------------------------------ hojas
interface OpcRacimo { n?: number; hojas?: number; aplana?: number; tono?: number; mat2?: string; p2?: number; sube?: number }
/**
 * Un racimo de hojas: 2 a 4 bultos irregulares de núcleo y 2 a 4 ramilletes chatos que salen hacia afuera con su
 * inclinación (dan el borde dentado y los brillos sueltos), todos con el mismo tono de fondo.
 */
function racimo(a: Arma, ps: Pieza[], c: V, R: number, mat: string, o: OpcRacimo = {}) {
  const n = o.n ?? 2 + Math.floor(a.r() * 2) + (R > 9 ? 1 : 0), t0 = o.tono ?? az(a, 0.07), ap = o.aplana ?? 0.75;
  const m0 = o.mat2 && a.r() < (o.p2 ?? 0.25) ? o.mat2 : mat;
  for (let i = 0; i < n; i++) {
    const g = a.r() * PI2, d = Math.sqrt(a.r()) * R * 0.5, z = az(a, R * 0.3) + (o.sube ?? 0.1) * R;
    const rr = R * (0.42 + a.r() * 0.28);
    ps.push(a.elipsoide(c[0] + Math.cos(g) * d, c[1] + Math.sin(g) * d, c[2] + z, rr * (0.85 + a.r() * 0.35), rr * (0.75 + a.r() * 0.3), rr * ap * (0.75 + a.r() * 0.4), {
      mat: m0, giro: a.r() * 180, tono: t0 + az(a, 0.035) + (z / R) * 0.06,
    }));
  }
  const h = o.hojas ?? 2 + Math.floor(a.r() * 3);
  const g0 = a.r() * PI2;
  for (let j = 0; j < h; j++) {
    const g = g0 + (j / h) * PI2 + az(a, 0.6), el = -0.25 + a.r() * 0.95, ce = Math.cos(el);
    const L = R * (0.55 + a.r() * 0.25);
    const q: V = [c[0] + Math.cos(g) * ce * L, c[1] + Math.sin(g) * ce * L, c[2] + Math.sin(el) * L + R * 0.08];
    ps.push(a.elipsoide(q[0], q[1], q[2], R * (0.36 + a.r() * 0.16), R * (0.2 + a.r() * 0.1), R * (0.1 + a.r() * 0.05), {
      mat: m0, giro: (g * 180) / Math.PI, incl: (el * 180) / Math.PI * 0.8 + az(a, 15), inclEje: 'y', tono: t0 + 0.02 + az(a, 0.05),
    }));
  }
}
interface OpcCopa extends OpcRacimo { R: number; mat: string; max?: number; hueco?: number; afuera?: number; relleno?: number; varR?: number; tope?: number; nieve?: number }
/** Piezas que lleva la lista (los componentes de una masa cuentan uno por uno). */
const cuenta = (ps: Pieza[]) => ps.reduce((k, p) => k + (p.k === 'masa' ? p.comps.length : 1), 0);
/**
 * La copa: un racimo en cada punta (corridos un poco hacia afuera), quitando puntas pegadas y algunas al azar para
 * dejar huecos. `relleno` pone racimos más oscuros en las horquetas de adentro para que la copa tenga cuerpo.
 */
function copa(a: Arma, ps: Pieza[], E: Esq, o: OpcCopa) {
  const elegidas: Punta[] = [];
  // tope de piezas del árbol entero: lo que queda se reparte entre los racimos
  const porRacimo = (o.n ?? (o.R > 9 ? 3 : 2.5)) + (o.hojas ?? 3) + (o.nieve ?? 0), libre = (o.tope ?? 280) - cuenta(ps) - (o.relleno ?? 0) * 6;
  const max = Math.max(4, Math.min(o.max ?? 30, Math.floor(libre / porRacimo)));
  const pts = E.puntas.slice().sort(() => a.r() - 0.5);
  for (const q of pts) {
    if (a.r() < (o.hueco ?? 0.12)) continue;
    if (elegidas.some((e) => dist(e.p, q.p) < o.R * 0.75)) continue;
    elegidas.push(q);
    if (elegidas.length >= max) break;
  }
  for (const q of elegidas) {
    const c = mas(q.p, q.d, o.R * (o.afuera ?? 0.3)), R = o.R * (1 + az(a, o.varR ?? 0.2));
    racimo(a, ps, c, R, o.mat, { ...o, tono: (o.tono ?? 0) + az(a, 0.07) });
    if (o.nieve && a.r() < o.nieve) ps.push(a.elipsoide(c[0] + az(a, R * 0.12), c[1] + az(a, R * 0.12), c[2] + R * 0.3, R * (0.45 + a.r() * 0.2), R * (0.38 + a.r() * 0.15), R * 0.16, { mat: 'nieve', giro: a.r() * 180, tono: -0.12 + az(a, 0.04) }));
  }
  if (o.relleno) {
    const hs = E.horq.filter((h) => h.n >= 1 && h.n <= 2).sort(() => a.r() - 0.5).slice(0, o.relleno);
    for (const h of hs) racimo(a, ps, mas(h.p, h.d, o.R * 0.6), o.R * 1.05, o.mat, { ...o, n: 3, hojas: 2, tono: (o.tono ?? 0) - 0.1 + az(a, 0.04) });
  }
  return elegidas;
}


// ------------------------------------------------------------------ suelo y piezas sueltas
/** Tierra bajo el árbol con matas de pasto, hojas caídas y alguna piedra. */
function suelo(a: Arma, ps: Pieza[], R: number, o: { mat?: string; pasto?: string; hojas?: string; n?: number; piedra?: number } = {}) {
  const mat = o.mat ?? 'tierra', tn = mat === 'nieve' ? -0.2 : -0.04;
  ps.push(a.elipsoide(az(a, R * 0.1), az(a, R * 0.1), -0.5, R, R * (0.75 + a.r() * 0.25), 1.8, { mat, giro: a.r() * 180, tono: tn }));
  ps.push(a.elipsoide(az(a, R * 0.3), az(a, R * 0.3), -0.4, R * 0.6, R * 0.45, 1.6, { mat, giro: a.r() * 180, tono: tn + az(a, 0.05) }));
  const n = o.n ?? 3;
  for (let i = 0; i < n; i++) {
    const g = a.r() * PI2, d = R * (0.45 + a.r() * 0.45);
    ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 0.6, 2.5 + a.r() * 3, 2 + a.r() * 2, 1.5 + a.r() * 2, { mat: o.pasto ?? (mat === 'tierra' ? 'pasto' : mat), tono: az(a, 0.06) + (o.pasto === 'paja' ? -0.5 : mat === 'nieve' ? -0.15 : 0), giro: a.r() * 180 }));
  }
  if (o.hojas) for (let i = 0; i < 5; i++) { const g = a.r() * PI2, d = R * (0.3 + a.r() * 0.9); ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 0.4, 3 + a.r() * 2, 2.2, 0.8, { mat: o.hojas, giro: a.r() * 180, tono: az(a, 0.08) - 0.05 })); }
  if (a.r() < (o.piedra ?? 0.5)) { const g = a.r() * PI2; ps.push(a.elipsoide(Math.cos(g) * R * 0.8, Math.sin(g) * R * 0.8, 0.5, 2.5 + a.r() * 1.5, 2 + a.r(), 1.8, { mat: 'roca', giro: a.r() * 180 })); }
}
/** Algo que cuelga (barba de viejo, cortina del sauce, raíz aérea): una cadena de palos que se mece un poco. */
function colgajo(a: Arma, ps: Pieza[], p: V, L: number, r: number, mat: string, o: { tramos?: number; vaiven?: number; tono?: number; afuera?: V; fin?: number } = {}) {
  const k = o.tramos ?? 2, vv = o.vaiven ?? 1.5, f = o.afuera ?? [0, 0, 0];
  let q = p;
  for (let i = 0; i < k; i++) {
    const t = (i + 1) / k;
    const nq: V = [q[0] + az(a, vv) + f[0] * (1 - t), q[1] + az(a, vv) + f[1] * (1 - t), Math.max(1, q[2] - L / k)];
    ps.push(a.palo(q, nq, r * (1 - (i / k) * 0.35), { mat, r1: Math.max(0.4, r * (o.fin ?? 0.55) + r * (1 - t) * 0.3), tono: o.tono }));
    q = nq;
    if (q[2] <= 1) break;
  }
  return q;
}
/** Liana o cuerda que se comba entre dos puntos. */
function liana(a: Arma, ps: Pieza[], p0: V, p1: V, comba: number, r: number, mat: string, n = 5, hojas?: string) {
  let q = p0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, m = mez(p0, p1, t);
    const nq: V = [m[0] + az(a, 0.8), m[1] + az(a, 0.8), Math.max(0.8, m[2] - comba * 4 * t * (1 - t))];
    ps.push(a.palo(q, nq, r, { mat }));
    if (hojas && a.r() < 0.5) ps.push(a.elipsoide(nq[0], nq[1], nq[2] - 0.8, 2 + a.r() * 1.2, 1.5, 1.1, { mat: hojas, giro: a.r() * 180, tono: az(a, 0.06) }));
    q = nq;
  }
}
/** Hoja con forma (rombo fino): para palmas, hojas grandes y helechos. */
function hoja(a: Arma, ps: Pieza[], b: V, u: V, L: number, w: number, lado: V, caida: number, mat: string, tono = 0) {
  const t = mas(b, u, L), m1 = mas(mas(b, u, L * 0.4), lado, w), m2 = mas(mas(b, u, L * 0.4), lado, -w);
  m1[2] -= caida; m2[2] -= caida;
  const e = 0.45;
  ps.push(a.poliedro([b, t, m1, m2, [b[0], b[1], b[2] + e], [t[0], t[1], t[2] + e * 0.5], [m1[0], m1[1], m1[2] + e], [m2[0], m2[1], m2[2] + e]], { mat, tono: tono + az(a, 0.04) }));
}
/** Hongo con sombrero (para corros, troncos y la base de los árboles). */
function hongo(a: Arma, ps: Pieza[], x: number, y: number, alto: number, R: number, mat: string, incl = 0, z0 = 0) {
  const g = a.r() * PI2, tx = Math.cos(g) * incl, ty = Math.sin(g) * incl;
  const top: V = [x + tx, y + ty, z0 + alto];
  const rt = R > 12 ? 0.34 : 0.28;
  ps.push(a.palo([x, y, z0], [x + tx * 0.5, y + ty * 0.5, z0 + alto * 0.5], R * rt, { mat: 'arboles_hongo_palido', r1: R * rt * 0.8 }));
  ps.push(a.palo([x + tx * 0.5, y + ty * 0.5, z0 + alto * 0.5], top, R * rt * 0.8, { mat: 'arboles_hongo_palido', r1: R * rt * 0.7 }));
  ps.push(a.elipsoide(top[0], top[1], top[2] - R * 0.05, R * 0.92, R * 0.92, R * 0.2, { mat: 'arboles_hongo_palido', tono: -0.2 }));
  ps.push(a.elipsoide(top[0], top[1], top[2] + R * 0.05, R, R, R * 0.5, { mat }));
  if (mat === 'arboles_hongo_rojo' && R > 3) {
    for (let i = 0; i < Math.round(R / 1.5); i++) {
      const gg = a.r() * PI2, d = R * (0.2 + a.r() * 0.55), z = top[2] + R * 0.05 + R * 0.5 * Math.sqrt(1 - (d / R) ** 2);
      ps.push(a.esfera(top[0] + Math.cos(gg) * d, top[1] + Math.sin(gg) * d, z, Math.max(1, R * 0.12), { mat: 'arboles_hongo_palido', tono: 0.15 }));
    }
  }
}
/** Hongo de repisa pegado a un tronco (punto en la superficie, hacia afuera `u`). */
function repisa(a: Arma, ps: Pieza[], p: V, u: V, R: number, mat = 'hongo') {
  const g = (Math.atan2(u[1], u[0]) * 180) / Math.PI;
  ps.push(a.elipsoide(p[0] + u[0] * R * 0.45, p[1] + u[1] * R * 0.45, p[2], R, R * 0.8, R * 0.28, { mat, giro: g, tono: 0.08 + az(a, 0.05) }));
}
function mataPasto(a: Arma, ps: Pieza[], x: number, y: number, n: number, alto: number, mat: string) {
  for (let i = 0; i < n; i++) {
    const g = a.r() * PI2, inc = 0.15 + a.r() * 0.45, h = alto * (0.6 + a.r() * 0.5);
    const d: V = [Math.cos(g) * inc, Math.sin(g) * inc, 1];
    ps.push(a.cilindro(x + az(a, 2), y + az(a, 2), 0, 1.1 + a.r() * 0.4, h, { mat, r1: 0, eje: d, tono: az(a, 0.1) }));
  }
}
/** Barba de viejo (líquen colgante) de las ramas más horizontales. */
function barbas(a: Arma, ps: Pieza[], E: Esq, n: number, largo: number, mat = 'arboles_barba') {
  const cand = E.segs.filter((s) => s.r0 < 3.5 && s.r0 > 0.6 && Math.abs(s.b[2] - s.a[2]) < dist(s.a, s.b) * 0.75 && s.b[2] > 14).sort(() => a.r() - 0.5).slice(0, n);
  for (const s of cand) {
    const p = mez(s.a, s.b, 0.3 + a.r() * 0.6);
    colgajo(a, ps, [p[0], p[1], p[2] - s.r0 * 0.5], Math.min(p[2] - 2, largo * (0.5 + a.r() * 0.8)), 1.1 + a.r() * 0.5, mat, { tramos: 2, vaiven: 1.2, tono: az(a, 0.08) });
  }
}

// ------------------------------------------------------------------ árboles de hoja
function roble(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v), seco = v === 'seco', otono = v === 'otono' || v === 'dorado';
  const e = [0.62, 1, 1.05][edad] * (0.9 + a.r() * 0.2);
  const rT = [3.6, 6.6, 9.5][edad] * (0.92 + a.r() * 0.16);
  const Lt = [36, 44, 38][edad] * e * (0.85 + a.r() * 0.3);
  const N = 3;
  const lado = a.r() * PI2, sesgo = a.r() * 0.07;
  const G: Gram = {
    hijos: (n) => (n === N ? (edad === 2 ? 4 : 3) + Math.floor(a.r() * 3) : n === 1 ? 2 + (a.r() < 0.3 ? 1 : 0) : 3),
    desde: (n) => (n === N ? 0.45 + a.r() * 0.2 : 0.3),
    abre: (n) => (n === N ? 0.85 + a.r() * 0.25 : n === 2 ? 0.7 : 0.62),
    largo: (n, t) => (n === N ? 1.1 - t * 0.25 : n === 2 ? 0.62 : 0.62),
    grosor: 0.66, adelgaza: 0.58, tramos: (n) => (n >= 2 ? 3 : n === 1 ? 2 : 1),
    nudos: edad === 2 ? 0.45 : 0.34, nudosTronco: 0.12 + a.r() * 0.12, sube: (n) => (n === N ? 0.03 : n === 2 ? 0.06 : 0.13),
    tira: [Math.cos(lado) * sesgo, Math.sin(lado) * sesgo, 0], quiebra: edad === 2 ? 0.12 : seco ? 0.1 : 0,
  };
  const E = nuevoEsq(N);
  crecer(a, E, G, [0, 0, 0], nrm([az(a, 0.12), az(a, 0.12), 1]), Lt, rT, N);
  suelo(a, ps, rT * 2.2 + 5, { hojas: otono || seco ? 'arboles_otono' : undefined });
  madera(a, ps, E, { mat: 'arboles_roble', pie: pie(a, rT, edad === 0 ? 4 : 5 + Math.floor(a.r() * 2)), nudos: 0.35, musgo: edad === 2 ? 0.45 : 0.2 });
  if (!seco) {
    const mat = otono ? 'arboles_otono' : 'arboles_follaje';
    copa(a, ps, E, { R: [7, 10.5, 11][edad] * (0.9 + a.r() * 0.2), mat, mat2: otono ? 'arboles_oro' : 'arboles_follaje_claro', p2: 0.2, max: [16, 30, 26][edad], hueco: edad === 2 ? 0.22 : 0.08, relleno: [2, 6, 5][edad] });
  }
  return ps;
}
function haya(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v), otono = v === 'otono';
  const e = [0.6, 1, 1.1][edad] * (0.9 + a.r() * 0.2);
  const rT = [3, 5.4, 7.8][edad] * (0.92 + a.r() * 0.16);
  const Lt = [46, 62, 58][edad] * e;
  const N = 3, lado = a.r() * PI2;
  const G: Gram = {
    hijos: (n) => (n === N ? 3 + Math.floor(a.r() * 3) : 3),
    desde: (n) => (n === N ? 0.45 + a.r() * 0.15 : 0.25),
    abre: (n, t) => (n === N ? 0.4 + a.r() * 0.25 + (1 - t) * 0.3 : n === 2 ? 0.8 : 0.7),
    largo: (n, t) => (n === N ? 0.85 - t * 0.2 : n === 2 ? 0.6 : 0.55),
    grosor: 0.62, adelgaza: 0.55, tramos: (n) => (n >= 2 ? 3 : n === 1 ? 2 : 1),
    nudos: 0.2, nudosTronco: 0.05, sube: (n) => (n === N ? 0.04 : n === 2 ? 0.02 : -0.04),
    tira: [Math.cos(lado) * 0.03, Math.sin(lado) * 0.03, 0],
  };
  const E = nuevoEsq(N);
  crecer(a, E, G, [0, 0, 0], nrm([az(a, 0.06), az(a, 0.06), 1]), Lt, rT, N);
  suelo(a, ps, rT * 2.4 + 5, { hojas: otono ? 'arboles_cobre' : 'hojas_otono', n: 2 });
  madera(a, ps, E, { mat: 'arboles_haya', pie: pie(a, rT, 4 + Math.floor(a.r() * 2), { largo: 2.1, alto: 1.3 }), nudos: 0.15, musgo: 0.25, suave: 2.6 });
  copa(a, ps, E, { R: [8, 12, 12.5][edad] * (0.9 + a.r() * 0.2), mat: otono ? 'arboles_cobre' : 'arboles_follaje_claro', mat2: otono ? 'arboles_otono' : 'arboles_follaje', p2: 0.3, aplana: 0.55, max: 30, hueco: 0.05, relleno: [2, 7, 7][edad], sube: 0.02 });
  return ps;
}
function abedul(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v), otono = v === 'otono' || v === 'dorado', desnudo = v === 'desnudo';
  const e = [0.62, 1, 1.12][edad] * (0.9 + a.r() * 0.2);
  const tallos = edad === 0 ? 1 : edad === 2 ? 1 + Math.floor(a.r() * 2) : 1 + Math.floor(a.r() * 2.6);
  const N = 2, E = nuevoEsq(N);
  const G: Gram = {
    hijos: (n) => (n === N ? Math.max(3, Math.round((edad === 0 ? 4 : 7 - tallos) + a.r() * 2)) : desnudo ? 3 : 2 + (a.r() < 0.5 ? 1 : 0)),
    desde: (n) => (n === N ? 0.32 + a.r() * 0.12 : 0.3),
    abre: (n) => (n === N ? 0.55 + a.r() * 0.2 : 0.55),
    largo: (n, t) => (n === N ? 0.5 * (1.25 - t * 0.7) : 0.6),
    grosor: 0.5, adelgaza: 0.5, tramos: (n) => (n === N ? 4 : n === 1 ? 3 : 1),
    nudos: 0.22, nudosTronco: 0.07, sube: (n) => (n === N ? 0.02 : n === 1 ? -0.07 : -0.14),
  };
  const g0 = a.r() * PI2;
  for (let i = 0; i < tallos; i++) {
    const g = g0 + (i / tallos) * PI2, b: V = tallos > 1 ? [Math.cos(g) * 2.5, Math.sin(g) * 2.5, 0] : [0, 0, 0];
    const d = nrm([b[0] * 0.06 + az(a, 0.1), b[1] * 0.06 + az(a, 0.1), 1]);
    crecer(a, E, G, b, d, [44, 70, 76][edad] * e * (i ? 0.82 + a.r() * 0.15 : 1), [1.9, 3.3, 4.6][edad] * (i ? 0.8 : 1), N);
  }
  suelo(a, ps, 10 + edad * 4, { hojas: otono ? 'arboles_oro' : undefined, n: 2 });
  const rb = [1.9, 3.3, 4.6][edad] * (tallos > 1 ? 1.4 : 1);
  madera(a, ps, E, { mat: 'arboles_abedul', pie: [...pie(a, rb, 4, { largo: 1.8, alto: 1 }).map((c, i) => (i === 0 ? { ...c, mat: 'arboles_roble' } : c))], rPalo: 1.1, nudos: 0.4, max: 16 });
  if (!desnudo) copa(a, ps, E, { R: [5, 6.5, 7][edad], mat: otono ? 'arboles_oro' : 'arboles_follaje_claro', mat2: otono ? 'arboles_otono' : 'arboles_follaje', p2: 0.25, aplana: 0.7, max: 30, hueco: 0.2, afuera: 0.1, n: 2, hojas: 3, sube: -0.1 });
  return ps;
}
function sauce(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v), mustio = v === 'mustio';
  const e = [0.65, 1, 1.05][edad] * (0.9 + a.r() * 0.2);
  const rT = [3.5, 7, 9.5][edad] * (0.92 + a.r() * 0.16), N = 3;
  const lado = a.r() * PI2;
  const G: Gram = {
    hijos: (n) => (n === N ? 4 + Math.floor(a.r() * 2) : n === 2 ? 3 : 2),
    desde: (n) => (n === N ? 0.65 : 0.4),
    abre: (n) => (n === N ? 0.45 + a.r() * 0.2 : n === 2 ? 0.65 : 0.7),
    largo: (n) => (n === N ? 1.15 : n === 2 ? 0.62 : 0.55),
    grosor: 0.62, adelgaza: 0.55, tramos: (n) => (n >= 2 ? 3 : 2),
    nudos: 0.25, nudosTronco: 0.12, sube: (n) => (n === N ? 0.08 : n === 2 ? 0.0 : -0.18),
    tira: [Math.cos(lado) * 0.03, Math.sin(lado) * 0.03, 0],
  };
  const E = nuevoEsq(N);
  crecer(a, E, G, [0, 0, 0], nrm([Math.cos(lado) * 0.12 + az(a, 0.06), Math.sin(lado) * 0.12 + az(a, 0.06), 1]), [26, 36, 32][edad] * e, rT, N);
  suelo(a, ps, rT * 2.4 + 5, { n: 4 });
  madera(a, ps, E, { mat: 'arboles_roble', pie: pie(a, rT, 5), nudos: 0.4, musgo: 0.35 });
  const mat = mustio ? 'arboles_oro' : 'arboles_sauce', mat2 = mustio ? 'arboles_otono' : 'arboles_follaje_claro';
  const puntas = copa(a, ps, E, { R: [6.5, 9, 9.5][edad], mat, mat2, p2: 0.25, max: 22, hueco: 0.03, n: 2, hojas: 3, tope: 215, relleno: 9 });
  // cortinas: hebras finas que caen de las puntas casi hasta el piso
  const hebras = Math.min([26, 44, 40][edad] * (mustio ? 0.7 : 1), Math.floor((294 - cuenta(ps)) / 2));
  for (let i = 0; i < hebras; i++) {
    const q = puntas[i % puntas.length];
    if (!q) break;
    const fuera = nrm([q.p[0], q.p[1], 0]), g = a.r() * PI2, rr = 3 + a.r() * 6;
    const p0: V = [q.p[0] + Math.cos(g) * rr + fuera[0] * 3, q.p[1] + Math.sin(g) * rr + fuera[1] * 3, q.p[2] + az(a, 3)];
    const L = Math.max(4, p0[2] - 3 - a.r() * p0[2] * 0.35);
    colgajo(a, ps, p0, L, 1.25 + a.r() * 0.35, a.r() < 0.2 ? mat2 : mat, { tramos: 2, vaiven: 1, afuera: [fuera[0] * 2.5, fuera[1] * 2.5, 0], tono: az(a, 0.08) - 0.03, fin: 0.4 });
  }
  return ps;
}
function alamo(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v), otono = v === 'otono';
  const e = [0.6, 1, 1.1][edad] * (0.9 + a.r() * 0.2);
  const rT = [2.4, 4.6, 6.6][edad] * (0.92 + a.r() * 0.16), N = 2;
  const H = [72, 130, 140][edad] * e;
  const G: Gram = {
    hijos: (n) => (n === N ? [7, 10, 9][edad] + Math.floor(a.r() * 3) : 2),
    desde: () => 0.14 + a.r() * 0.08,
    abre: (_n, t) => 0.32 + (1 - t) * 0.15 + a.r() * 0.1,
    largo: (n, t) => (n === N ? 0.42 * (0.55 + Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.7) : 0.5),
    grosor: 0.45, adelgaza: 0.45, tramos: (n) => (n === N ? 4 : n === 1 ? 2 : 1),
    nudos: 0.15, nudosTronco: 0.05, sube: (n) => (n === N ? 0 : 0.12), quiebra: edad === 2 ? 0.15 : 0,
  };
  const E = nuevoEsq(N);
  crecer(a, E, G, [0, 0, 0], nrm([az(a, 0.05), az(a, 0.05), 1]), H * 0.85, rT, N);
  // el álamo echa hoja a lo largo de toda la rama, no solo en la punta
  for (const s of E.segs) if (s.n === 1 && s.a[2] > H * 0.15) E.puntas.push({ p: mez(s.a, s.b, 0.5), d: nrm(mas(s.b, s.a, -1)), r: s.r1, n: 1, g: s.g });
  for (const s of E.segs) if (s.n === 2 && s.a[2] > H * 0.55) E.puntas.push({ p: mez(s.a, s.b, 0.5), d: [0, 0, 1], r: s.r1, n: 2, g: 0 });
  suelo(a, ps, rT * 2.2 + 4, { hojas: otono ? 'arboles_oro' : undefined, n: 2 });
  madera(a, ps, E, { mat: edad === 2 ? 'arboles_haya' : 'arboles_abedul', pie: pie(a, rT, 4, { largo: 2, alto: 1.2 }), nudos: 0.4, musgo: 0.2, rPalo: 1.2, tono: edad === 2 ? 0 : -0.25 });
  copa(a, ps, E, { R: [6, 8.5, 8.5][edad], mat: otono ? 'arboles_oro' : 'arboles_follaje_claro', mat2: otono ? 'arboles_otono' : 'arboles_follaje', p2: 0.3, aplana: 1.15, max: 40, hueco: 0.03, afuera: 0.05, relleno: [2, 6, 5][edad], n: 2, hojas: 3, sube: 0.1 });
  return ps;
}
/** Árbol de hoja caduca desnudo con nieve sobre las ramas y algún racimo de hojas secas que no se cayó. */
function nevado(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v);
  const e = [0.62, 1, 1.05][edad] * (0.9 + a.r() * 0.2);
  const rT = [2.6, 4.8, 6.6][edad] * (0.92 + a.r() * 0.16), N = 4;
  const G: Gram = {
    hijos: (n) => (n === N ? 3 + Math.floor(a.r() * 2) : 2 + (a.r() < 0.3 ? 1 : 0)),
    desde: (n) => (n === N ? 0.5 : 0.35),
    abre: (n) => (n === N ? 0.75 : 0.6),
    largo: (n) => (n === N ? 0.95 : n === 3 ? 0.68 : 0.62),
    grosor: 0.74, adelgaza: 0.6, tramos: (n) => (n >= 3 ? 3 : n === 2 ? 2 : 1),
    nudos: 0.35, nudosTronco: 0.12, sube: (n) => (n === N ? 0.02 : 0.1), quiebra: 0.08,
  };
  const E = nuevoEsq(N);
  crecer(a, E, G, [0, 0, 0], nrm([az(a, 0.1), az(a, 0.1), 1]), [30, 40, 36][edad] * e, rT, N);
  suelo(a, ps, rT * 2.4 + 6, { mat: 'nieve', pasto: 'nieve', n: 3, piedra: 0.3 });
  madera(a, ps, E, { mat: 'corteza', pie: pie(a, rT, 5), nudos: 0.3, nieve: 0.9, rPalo: 1.1, max: 18 });
  // nieve en las ramas finas (encima, a lo largo) y algunas hojas secas
  for (const s of E.segs.filter((x) => x.r0 < 2.2 && x.r0 > 0.7 && Math.abs(x.b[2] - x.a[2]) < dist(x.a, x.b) * 0.8).sort(() => a.r() - 0.5).slice(0, 30)) {
    const m = mez(s.a, s.b, 0.5), d = nrm(mas(s.b, s.a, -1)), g = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
    ps.push(a.elipsoide(m[0], m[1], m[2] + s.r0 * 0.75, dist(s.a, s.b) * 0.38, s.r0 + 0.5, 0.75, { mat: 'nieve', giro: g, incl: (Math.asin(d[2]) * 180) / Math.PI, inclEje: 'y', tono: -0.08 }));
  }
  for (const q of E.puntas.sort(() => a.r() - 0.5).slice(0, edad === 2 ? 2 : 5)) racimo(a, ps, q.p, 3.5, 'arboles_otono', { n: 2, hojas: 1, tono: -0.1 });
  return ps;
}
/** Árbol seco del páramo: torcido por el viento, poca hoja y barbas de líquen colgando. */
function paramo(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v);
  const e = [0.65, 1, 1.05][edad] * (0.9 + a.r() * 0.2);
  const rT = [3, 5.6, 8][edad] * (0.92 + a.r() * 0.16), N = 3;
  const viento = a.r() * PI2, fuerza = 0.1 + a.r() * 0.12;
  const G: Gram = {
    hijos: (n) => (n === N ? 3 + Math.floor(a.r() * 2) : 2 + (a.r() < 0.4 ? 1 : 0)),
    desde: (n) => (n === N ? 0.4 + a.r() * 0.25 : 0.3),
    abre: (n) => (n === N ? 0.8 : 0.65),
    largo: (n) => (n === N ? 1 : n === 2 ? 0.65 : 0.6),
    grosor: 0.62, adelgaza: 0.55, tramos: (n) => (n >= 2 ? 3 : n === 1 ? 2 : 1),
    nudos: 0.5, nudosTronco: 0.3, sube: (n) => (n === N ? 0 : 0.05), quiebra: 0.18,
    tira: [Math.cos(viento) * fuerza, Math.sin(viento) * fuerza, -0.02],
  };
  const E = nuevoEsq(N);
  crecer(a, E, G, [0, 0, 0], nrm([Math.cos(viento) * 0.3 + az(a, 0.1), Math.sin(viento) * 0.3 + az(a, 0.1), 1]), [28, 38, 34][edad] * e, rT, N);
  suelo(a, ps, rT * 2.3 + 5, { pasto: 'paja', n: 4 });
  madera(a, ps, E, { mat: 'corteza_muerta', pie: pie(a, rT, 4 + Math.floor(a.r() * 2), { nudosas: 1.6 }), nudos: 0.5, musgo: 0.5, matMusgo: 'arboles_barba', pelado: 0.25 });
  copa(a, ps, E, { R: [4.5, 6, 6][edad], mat: 'arboles_follaje_frio', mat2: 'arboles_barba', p2: 0.4, max: [8, 14, 10][edad], hueco: 0.35, n: 2, hojas: 2, tope: 220 });
  barbas(a, ps, E, Math.min([10, 22, 26][edad], Math.floor((295 - cuenta(ps)) / 2)), 16);
  return ps;
}
/** Árbol del pantano: pie ensanchado sobre zancos de raíz que se meten en el agua, rodillas y barbas. */
function pantano(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v);
  const e = [0.65, 1, 1.05][edad] * (0.9 + a.r() * 0.2);
  const rT = [3.4, 6, 8.5][edad] * (0.92 + a.r() * 0.16), N = 3, alza = [8, 15, 18][edad] * (0.8 + a.r() * 0.4);
  const Ra = rT * 4 + 10;
  // agua y orilla
  ps.push(a.elipsoide(0, 0, -0.6, Ra + 4, (Ra + 4) * (0.8 + a.r() * 0.2), 1.6, { mat: 'tierra', giro: a.r() * 180, tono: -0.25 }));
  ps.push(a.elipsoide(az(a, 3), az(a, 3), 0.1, Ra, Ra * (0.75 + a.r() * 0.2), 1.1, { mat: 'agua_sucia', giro: a.r() * 180, tono: -0.22 }));
  const G: Gram = {
    hijos: (n) => (n === N ? 3 + Math.floor(a.r() * 3) : n === 2 ? 3 : 2),
    desde: (n) => (n === N ? 0.55 : 0.3),
    abre: (n) => (n === N ? 0.95 : 0.65),
    largo: (n) => (n === N ? 0.95 : n === 2 ? 0.6 : 0.6),
    grosor: 0.62, adelgaza: 0.55, tramos: (n) => (n >= 2 ? 3 : n === 1 ? 2 : 1),
    nudos: 0.4, nudosTronco: 0.15, sube: (n) => (n === N ? 0.02 : n === 2 ? 0.02 : -0.06), quiebra: 0.08,
  };
  const E = nuevoEsq(N);
  crecer(a, E, G, [0, 0, alza], nrm([az(a, 0.12), az(a, 0.12), 1]), [30, 42, 40][edad] * e, rT, N);
  // zancos: raíces que salen del pie y se arquean hasta el agua
  const zancos: Comp[] = [bulto([0, 0, alza + rT * 0.4], [rT * 1.5, rT * 1.4, rT * 1.2], { giro: a.r() * 180 })];
  const nz = [4, 6, 7][edad] + Math.floor(a.r() * 2), g0 = a.r() * PI2;
  for (let i = 0; i < nz; i++) {
    const g = g0 + (i / nz) * PI2 + az(a, 0.35), c = Math.cos(g), s = Math.sin(g), l = rT * (2.6 + a.r() * 1.6);
    const p0: V = [c * rT * 0.6, s * rT * 0.6, alza + rT * (0.4 + a.r() * 0.8)];
    const p1: V = [c * l * 0.6, s * l * 0.6, alza * (0.7 + a.r() * 0.3)];
    const p2: V = [c * l + az(a, 2), s * l + az(a, 2), -1];
    const rr = rT * (0.3 + a.r() * 0.12);
    zancos.push(hueso(p0, p1, rr, rr * 0.8), hueso(p1, p2, rr * 0.8, rr * 0.6));
  }
  zancos.push(hueso([0, 0, -1], [0, 0, alza], rT * 0.7, rT * 0.9));
  madera(a, ps, E, { mat: 'corteza', pie: zancos, nudos: 0.3, musgo: 0.6, matMusgo: 'musgo', max: 22 });
  // rodillas que asoman del agua
  for (let i = 0; i < 3 + edad * 2; i++) { const g = a.r() * PI2, d = rT * 2 + a.r() * (Ra - rT * 2), h = 3 + a.r() * 5; ps.push(a.cilindro(Math.cos(g) * d, Math.sin(g) * d, -0.5, 1.4 + a.r(), h, { mat: 'corteza', r1: 0.5, tono: -0.05 })); }
  copa(a, ps, E, { R: [5.5, 7.5, 7.5][edad], mat: 'arboles_follaje_frio', mat2: 'arboles_follaje', p2: 0.3, max: [10, 18, 16][edad], hueco: 0.25, aplana: 0.6, tope: 225 });
  barbas(a, ps, E, Math.min([8, 20, 24][edad], Math.floor((295 - cuenta(ps)) / 2)), 22);
  return ps;
}

// ------------------------------------------------------------------ coníferas
/** Pino: fuste largo y desnudo con muñones secos, ramas en verticilos arriba y almohadones de agujas en las puntas. */
function pino(v: string, a: Arma, bajo: boolean): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v), nieve = v.includes('nevad');
  const e = (bajo ? [0.5, 0.62, 0.66] : [0.55, 1, 1.12])[edad] * (0.9 + a.r() * 0.2);
  const H = 130 * e, rT = (bajo ? [2.6, 4.6, 6.2] : [2.6, 4.8, 6.4])[edad] * (0.92 + a.r() * 0.16), N = 2;
  const lado = a.r() * PI2, viento = bajo ? 0.08 + a.r() * 0.1 : a.r() * 0.04;
  const desde = bajo ? 0.25 + a.r() * 0.1 : [0.35, 0.5, 0.6][edad] + a.r() * 0.08;
  const plano = edad === 2 || bajo;
  const G: Gram = {
    hijos: (n) => (n === N ? (bajo ? 6 : [7, 10, 8][edad]) + Math.floor(a.r() * 3) : 3),
    desde: (n) => (n === N ? desde : 0.35),
    abre: (n, t) => (n === N ? (plano ? 1.05 : 1.3 - t * 0.55) + az(a, 0.1) : 0.55),
    largo: (n, t) => (n === N ? (plano ? 0.32 + (1 - Math.abs(t - 0.6)) * 0.12 : 0.45 * (1.15 - t)) : 0.55),
    grosor: 0.5, adelgaza: 0.45, tramos: (n) => (n === N ? 4 : 2),
    nudos: bajo ? 0.4 : 0.25, nudosTronco: bajo ? 0.25 : 0.06, sube: (n) => (n === N ? 0 : 0.14), quiebra: edad === 2 ? 0.12 : 0,
    tira: [Math.cos(lado) * viento, Math.sin(lado) * viento, 0],
  };
  const E = nuevoEsq(N);
  crecer(a, E, G, [0, 0, 0], nrm([Math.cos(lado) * viento * 2 + az(a, 0.05), Math.sin(lado) * viento * 2 + az(a, 0.05), 1]), H, rT, N);
  suelo(a, ps, rT * 2.4 + 5, nieve ? { mat: 'nieve', pasto: 'nieve', piedra: 0.3 } : { hojas: 'hojas_otono', n: 2 });
  madera(a, ps, E, { mat: 'arboles_pino_corteza', pie: pie(a, rT, 4, { largo: 2, alto: 1.1 }), nudos: 0.3, rPalo: 1.1, nieve: nieve ? 0.7 : 0 });
  // muñones de ramas secas en el fuste
  const tronco = E.segs.filter((s) => s.g === 0);
  for (let i = 0; i < (bajo ? 2 : 5); i++) {
    const s = tronco[Math.floor(a.r() * tronco.length * desde * 0.9)] ?? tronco[0], p = mez(s.a, s.b, a.r());
    if (p[2] < 12) continue;
    const g = a.r() * PI2, u: V = [Math.cos(g), Math.sin(g), -0.15 + a.r() * 0.3];
    ps.push(a.palo(mas(p, u, s.r0 * 0.6), mas(p, u, s.r0 + 3 + a.r() * 7), 0.9, { mat: 'corteza_muerta', r1: 0.4 }));
  }
  copa(a, ps, E, { R: (bajo ? [6.5, 8.5, 9] : [7, 10, 11])[edad], mat: 'arboles_agujas', mat2: 'pino', p2: 0.3, aplana: 0.45, max: 34, hueco: 0.03, afuera: 0.1, relleno: 4, sube: 0.15, nieve: nieve ? 0.85 : 0, tope: 270 });
  return ps;
}
/** Abeto: un cono de pisos de ramas que cuelgan, cada piso con su falda oscura y almohadones que rompen el borde. */
function abeto(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v), nieve = v.includes('nevad');
  const e = [0.5, 1, 1.15][edad] * (0.9 + a.r() * 0.2);
  const H = 125 * e, Rm = (19 + a.r() * 8) * Math.sqrt(e), rT = [2.2, 4.2, 5.8][edad];
  const lx = az(a, 3), ly = az(a, 3);
  suelo(a, ps, Rm * 0.55, nieve ? { mat: 'nieve', pasto: 'nieve', piedra: 0.3 } : { mat: 'tierra', pasto: 'pino', hojas: 'hojas_otono', n: 2 });
  const E = nuevoEsq(1);
  E.segs.push({ a: [0, 0, 0], b: [lx * 0.5, ly * 0.5, H * 0.5], r0: rT, r1: rT * 0.6, g: 0, n: 1 }, { a: [lx * 0.5, ly * 0.5, H * 0.5], b: [lx, ly, H * 0.97], r0: rT * 0.6, r1: 0.6, g: 0, n: 1 });
  madera(a, ps, E, { mat: 'arboles_pino_corteza', pie: pie(a, rT, 4, { largo: 1.8, alto: 1 }), musgo: 0.3 });
  const pisos = Math.round(H / (11 + a.r() * 3)), z0 = H * (edad === 2 ? 0.2 : 0.1) + a.r() * 5, forma = 0.8 + a.r() * 0.35;
  const muertos = edad === 2 ? 1 + Math.floor(a.r() * 2) : 0;
  const pad = Math.min(8, Math.max(4, Math.floor((270 - cuenta(ps)) / pisos / (nieve ? 3.4 : 2.4))));
  for (let i = 0; i < pisos; i++) {
    const t = i / (pisos - 1), z = z0 + (H - z0 - 8) * t + az(a, 2), R = Rm * Math.pow(1 - t, forma) * (0.85 + a.r() * 0.3) + 3.5;
    const cx = lx * (z / H), cy = ly * (z / H), tn = az(a, 0.05) + t * 0.05;
    if (i < muertos) {
      // pisos de abajo secos: ramitas peladas
      for (let j = 0; j < 5; j++) { const g = a.r() * PI2; ps.push(a.palo([cx, cy, z + 3], [cx + Math.cos(g) * R * 0.9, cy + Math.sin(g) * R * 0.9, z - 2 - a.r() * 3], 0.8, { mat: 'corteza_muerta', r1: 0.35 })); }
      continue;
    }
    const h = R * 0.55 + 4;
    ps.push(a.cilindro(cx, cy, z - 1, R * 0.8, h, { mat: 'arboles_agujas', r1: R * 0.12, tono: tn - 0.12 }));
    const k = Math.max(3, Math.min(pad, Math.round(R / 3.4))), g0 = a.r() * PI2, falta = edad === 2 && a.r() < 0.4 ? Math.floor(a.r() * k) : -1;
    for (let j = 0; j < k; j++) {
      if (j === falta) continue;
      const g = g0 + (j / k) * PI2 + az(a, 0.3), L = R * (0.95 + a.r() * 0.3), gd = (g * 180) / Math.PI;
      const c: V = [cx + Math.cos(g) * L * 0.55, cy + Math.sin(g) * L * 0.55, z + 1.5 - L * 0.1];
      ps.push(a.elipsoide(c[0], c[1], c[2], L * 0.5, 3 + R * 0.12 + a.r() * 2, 2.4 + a.r(), { mat: a.r() < 0.25 ? 'pino' : 'arboles_agujas', giro: gd, incl: -14 - a.r() * 10, inclEje: 'y', tono: tn + az(a, 0.06) }));
      if (nieve && a.r() < 0.8) ps.push(a.elipsoide(c[0] - Math.cos(g) * L * 0.05, c[1] - Math.sin(g) * L * 0.05, c[2] + 2.2, L * 0.4, 2.2 + R * 0.08, 1.1, { mat: 'nieve', giro: gd, incl: -12, inclEje: 'y', tono: az(a, 0.04) }));
    }
    if (nieve) ps.push(a.cilindro(cx, cy, z + h * 0.35, R * 0.45, h * 0.62, { mat: 'nieve', r1: R * 0.1 + 0.4 }));
  }
  if (edad === 2 && a.r() < 0.5) ps.push(a.palo([lx, ly, H * 0.93], [lx + 3, ly - 2, H + 6], 1, { mat: 'corteza_muerta', r1: 0.3 }));
  else ps.push(a.cilindro(lx, ly, H - 6, 3, 12, { mat: 'arboles_agujas', r1: 0.3 }));
  if (nieve) ps.push(a.cilindro(lx, ly, H - 3, 2.2, 6, { mat: 'nieve', r1: 0.3 }));
  return ps;
}
/** Ciprés: columna en llama, hecha de mechones verticales alrededor del eje que se mece hacia la punta. */
function cipres(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v);
  const e = [0.5, 1, 1.12][edad] * (0.9 + a.r() * 0.2);
  const H = 135 * e, W = (11 + a.r() * 4) * Math.sqrt(e), pico = 0.3 + a.r() * 0.15;
  const lx = az(a, 6), ly = az(a, 6), rT = [2, 3.6, 5][edad];
  suelo(a, ps, W * 0.9, { hojas: 'hojas_otono', n: 2 });
  ps.push(masa([...pie(a, rT, 4, { largo: 1.8, alto: 1 }), hueso([0, 0, 0], [lx * 0.2, ly * 0.2, H * 0.25], rT, rT * 0.8)], { mat: 'arboles_roble', suave: 2.5 }));
  const eje = (t: number): V => [lx * t * t, ly * t * t, H * t];
  const perfil = (t: number) => W * Math.pow(Math.sin(Math.PI * Math.min(1, t * (1 - pico) + pico * 0.4 + 0.08)), 0.9) * (1 - t * 0.55);
  // núcleo oscuro
  for (let i = 0; i < 4; i++) { const t = 0.15 + i * 0.2, c = eje(t), r = perfil(t) * 0.75; ps.push(a.elipsoide(c[0], c[1], c[2], r, r, H * 0.14, { mat: 'arboles_agujas', tono: -0.15 })); }
  const n = [30, 50, 48][edad], muerta = edad === 2 ? a.r() * PI2 : -9;
  for (let i = 0; i < n; i++) {
    const t = 0.08 + 0.9 * Math.pow((i + a.r()) / n, 0.85), c = eje(t), r = perfil(t), g = i * 2.39996 + az(a, 0.4);
    if (edad === 2 && Math.abs(((g - muerta + Math.PI) % PI2) - Math.PI) < 0.5 && t < 0.6 && a.r() < 0.6) continue;
    const d = r * (0.55 + a.r() * 0.25), rr = r * (0.45 + a.r() * 0.2);
    const seca = edad === 2 && a.r() < 0.1, mat = seca ? 'hojas_otono' : a.r() < 0.2 ? 'pino' : 'arboles_agujas';
    ps.push(a.elipsoide(c[0] + Math.cos(g) * d, c[1] + Math.sin(g) * d, c[2], rr, rr * 0.85, rr * (2.2 + a.r() * 0.8), { mat, giro: (g * 180) / Math.PI, incl: az(a, 8), tono: az(a, 0.06) + t * 0.06 - (seca ? 0.25 : 0) }));
  }
  const top = eje(1);
  ps.push(a.elipsoide(top[0], top[1], top[2] - 4, 2.5, 2.5, 7, { mat: 'arboles_agujas', tono: 0.05 }));
  return ps;
}

// ------------------------------------------------------------------ cálidos y gigantes
/** Palmera: tronco anillado que se curva, penacho de frondas que se arquean y cuelgan, frondas secas abajo. */
function palmera(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v);
  const H = [22, 70, 96][edad] * (0.88 + a.r() * 0.24), lado = a.r() * PI2, curva = (edad === 0 ? 0.1 : 0.2 + a.r() * 0.4) * H;
  const r0 = [3, 4.2, 4.6][edad], r1 = [2.6, 2.8, 3][edad];
  suelo(a, ps, 12 + edad * 2, { mat: 'tierra', n: 2 });
  const P = (t: number): V => [Math.cos(lado) * curva * t * t + az(a, 0.6), Math.sin(lado) * curva * t * t + az(a, 0.6), H * t];
  const cs: Comp[] = [bulto([0, 0, r0 * 0.4], [r0 * 1.6, r0 * 1.5, r0 * 1.1], { giro: a.r() * 180 })];
  const k = 5;
  let prev = P(0);
  for (let i = 1; i <= k; i++) { const q = P(i / k); cs.push(hueso(prev, q, r0 + (r1 - r0) * ((i - 1) / k), r0 + (r1 - r0) * (i / k))); prev = q; }
  const T = prev;
  cs.push(bulto([T[0], T[1], T[2] + 1], [r1 * 1.5, r1 * 1.5, r1 * 1.6], { mat: 'arboles_palma_seca' }));
  ps.push(masa(cs, { mat: 'arboles_tronco_palma', suave: 1.6 }));
  // frondas
  const nf = [9, 13, 12][edad] + Math.floor(a.r() * 4), g0 = a.r() * PI2, Lf = [22, 32, 34][edad] * (0.9 + a.r() * 0.2);
  const secas = edad === 2 ? 4 : edad === 1 ? 2 : 1;
  for (let f = 0; f < nf + secas; f++) {
    const seca = f >= nf, g = g0 + (f / (seca ? secas : nf)) * PI2 + az(a, 0.25);
    let el = seca ? -1.1 - a.r() * 0.3 : 0.75 - (f % 3) * 0.35 + az(a, 0.15);
    const caeK = seca ? 0.05 : 0.32 + a.r() * 0.15, mat = seca ? 'arboles_palma_seca' : a.r() < 0.15 ? 'arboles_palma_seca' : 'arboles_palma';
    let p: V = [T[0], T[1], T[2] + 1];
    const L = Lf * (seca ? 0.7 : 0.85 + a.r() * 0.3), segs = seca ? 2 : 5;
    for (let s = 0; s < segs; s++) {
      const u: V = [Math.cos(g) * Math.cos(el), Math.sin(g) * Math.cos(el), Math.sin(el)], l = L / segs;
      const q = mas(p, u, l), lado2: V = [-Math.sin(g), Math.cos(g), 0], w = (seca ? 2.4 : 6) * (1 - s * 0.15);
      ps.push(a.palo(p, q, 0.7, { mat: 'arboles_palma_seca', r1: 0.5 }));
      hoja(a, ps, p, u, l * 1.45, w, lado2, w * 0.6, mat, -s * 0.03);
      p = q; el -= caeK * 0.8;
    }
  }
  // racimo de dátiles
  if (edad > 0) for (let i = 0; i < 6; i++) ps.push(a.esfera(T[0] + az(a, 3), T[1] + az(a, 3), T[2] - 2 - a.r() * 4, 1.3, { mat: 'cuero', tono: -0.1 + az(a, 0.1) }));
  return ps;
}
/** Baobab: tronco botella enorme, ramas cortas y gruesas como raíces al aire, pocas hojas. */
function baobab(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v);
  const R = [7, 14, 18][edad] * (0.88 + a.r() * 0.24), H = [36, 60, 66][edad] * (0.9 + a.r() * 0.2), N = 2;
  suelo(a, ps, R * 1.6, { mat: 'tierra', pasto: 'paja', n: 3 });
  const lx = az(a, R * 0.15), ly = az(a, R * 0.15);
  const cuerpo: Comp[] = [
    bulto([0, 0, H * 0.22], [R * 1.05, R * (0.92 + a.r() * 0.1), H * 0.3], { giro: a.r() * 180 }),
    bulto([lx * 0.5, ly * 0.5, H * 0.5], [R * (0.95 + a.r() * 0.15), R * 0.9, H * 0.32], { giro: a.r() * 180 }),
    hueso([lx * 0.5, ly * 0.5, H * 0.5], [lx, ly, H], R * 0.75, R * 0.45),
  ];
  for (let i = 0; i < 5; i++) { const g = a.r() * PI2; cuerpo.push(bulto([Math.cos(g) * R * 0.8, Math.sin(g) * R * 0.8, R * 0.3], [R * 0.45, R * 0.35, R * 0.4], { giro: (g * 180) / Math.PI })); }
  // pliegues verticales
  for (let i = 0; i < 4; i++) { const g = a.r() * PI2; cuerpo.push(bulto([Math.cos(g) * R * 0.85, Math.sin(g) * R * 0.85, H * 0.4], [R * 0.25, R * 0.25, H * 0.32], { giro: (g * 180) / Math.PI, tono: -0.05 })); }
  const G: Gram = {
    hijos: (n) => (n === N ? 5 + Math.floor(a.r() * 3) : 3),
    desde: () => 0.7,
    abre: (n) => (n === N ? 0.95 + a.r() * 0.25 : 0.7),
    largo: (n) => (n === N ? 0.95 : 0.6),
    grosor: 0.5, adelgaza: 0.45, tramos: (n) => (n === N ? 1 : 2),
    nudos: 0.4, sube: (n) => (n === N ? 0.1 : 0.2), quiebra: 0.1,
  };
  const E = nuevoEsq(N);
  // el tronco del esqueleto es solo el cuello (lo grueso lo pone el cuerpo)
  crecer(a, E, G, [lx * 0.5, ly * 0.5, H * 0.5], nrm([lx, ly, H]), H * 0.6, R * 0.42, N);
  madera(a, ps, E, { mat: 'arboles_baobab', pie: [...cuerpo, ...pie(a, R * 0.8, 5, { largo: 1.6, alto: 0.6 })], max: 24, suave: 3.2, nudos: 0.3, rPalo: 1.2 });
  copa(a, ps, E, { R: [5, 7, 7][edad], mat: 'arboles_follaje_claro', mat2: 'arboles_follaje', max: edad === 2 ? 10 : 16, hueco: 0.3, n: 2, hojas: 3, aplana: 0.6 });
  if (edad === 2) { const g = a.r() * PI2; ps.push(a.elipsoide(Math.cos(g) * R * 0.95, Math.sin(g) * R * 0.95, H * 0.16, R * 0.25, R * 0.25, H * 0.13, { mat: 'negro', giro: (g * 180) / Math.PI })); }
  return ps;
}
/** Gigante de la selva: raíces de tabla, fuste altísimo, copa en sombrilla, lianas que se comban y epífitas. */
function selva(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], edad = edadDe(v);
  const e = [0.55, 1, 1.08][edad] * (0.9 + a.r() * 0.2);
  const rT = [4.5, 8.5, 10.5][edad] * (0.92 + a.r() * 0.16), H = [70, 125, 128][edad] * e, N = 3;
  suelo(a, ps, rT * 3.5, { mat: 'tierra', pasto: 'hojas_selva', n: 4 });
  // raíces de tabla: una aleta alta que baja en pendiente desde el tronco y otra baja afuera (todo sobre el piso)
  const tablas: Comp[] = [bulto([0, 0, rT * 1.2], [rT * 1.25, rT * 1.25, rT * 1.2])];
  const nt = 5 + Math.floor(a.r() * 3), g0 = a.r() * PI2;
  for (let i = 0; i < nt; i++) {
    const g = g0 + (i / nt) * PI2 + az(a, 0.3), u: V = [Math.cos(g), Math.sin(g), 0], L = rT * (2.2 + a.r() * 1.2), h = rT * (2.2 + a.r() * 1.6);
    tablas.push(bulto([u[0] * L * 0.32, u[1] * L * 0.32, h * 0.45], [L * 0.45, rT * 0.2, h * 0.45], { eje: [u[0], u[1], -0.55] }));
    tablas.push(bulto([u[0] * L * 0.72, u[1] * L * 0.72, h * 0.12], [L * 0.4, rT * 0.16, h * 0.14], { eje: [u[0], u[1], -0.2] }));
  }
  const G: Gram = {
    hijos: (n) => (n === N ? 4 + Math.floor(a.r() * 3) : n === 2 ? 3 : 2),
    desde: (n) => (n === N ? 0.76 + a.r() * 0.08 : 0.35),
    abre: (n) => (n === N ? 1.12 + a.r() * 0.15 : n === 2 ? 0.75 : 0.6),
    largo: (n) => (n === N ? 0.46 : n === 2 ? 0.6 : 0.6),
    grosor: 0.55, adelgaza: 0.55, tramos: (n) => (n === N ? 4 : n === 2 ? 3 : 1),
    nudos: 0.3, nudosTronco: 0.06, sube: (n) => (n === N ? 0 : n === 2 ? 0.14 : 0.12),
  };
  const E = nuevoEsq(N);
  crecer(a, E, G, [0, 0, 0], nrm([az(a, 0.05), az(a, 0.05), 1]), H, rT, N);
  madera(a, ps, E, { mat: 'corteza', pie: tablas, nudos: 0.2, musgo: 0.6, max: 26, suave: 2.6, rPalo: 1.6 });
  copa(a, ps, E, { R: [10, 14.5, 14.5][edad], mat: 'arboles_follaje_selva', mat2: 'arboles_follaje', p2: 0.3, aplana: 0.55, max: 30, hueco: 0.04, relleno: [2, 6, 5][edad], tope: 248, afuera: 0.15 });
  // lianas: de una rama madre al piso, combadas, y alguna entre dos ramas
  const madres = E.segs.filter((s) => s.n === N - 1 && s.r0 > 1.5).sort(() => a.r() - 0.5);
  const nl = Math.min([2, 5, 6][edad], madres.length);
  for (let i = 0; i < nl && cuenta(ps) < 272; i++) {
    const s = madres[i], p0 = mez(s.a, s.b, 0.5 + a.r() * 0.5);
    if (i % 3 === 2 && madres[i + 1]) liana(a, ps, p0, mez(madres[i + 1].a, madres[i + 1].b, 0.7), 14 + a.r() * 10, 0.9, 'corteza', 4, 'hojas_selva');
    else { const g = a.r() * PI2, d = rT * 1.5 + a.r() * 16; liana(a, ps, p0, [Math.cos(g) * d, Math.sin(g) * d, 0], 6 + a.r() * 8, 0.95, 'corteza', 5, 'hojas_selva'); }
  }
  // epífitas en las horquetas
  for (const h of E.horq.filter((x) => x.n === N).slice(0, Math.max(0, Math.floor((296 - cuenta(ps)) / 4)))) for (let k = 0; k < 4; k++) { const g = a.r() * PI2; ps.push(a.elipsoide(h.p[0] + Math.cos(g) * 2.5, h.p[1] + Math.sin(g) * 2.5, h.p[2] + 2, 3.5, 1.2, 1, { mat: 'hojas_selva', giro: (g * 180) / Math.PI, incl: 35, inclEje: 'y', tono: 0.05 })); }
  return ps;
}
/** Árbol de hongos de las cuevas: pie retorcido y pálido con sombreros en repisa, flecos y a veces luz. */
function arbolHongo(v: string, a: Arma): Pieza[] | { piezas: Pieza[]; resplandor: { c: V; r: number; color: string } } {
  const ps: Pieza[] = [], edad = edadDe(v);
  const H = [28, 56, 70][edad] * (0.88 + a.r() * 0.24), r = [2.6, 5, 6.5][edad] * (0.9 + a.r() * 0.2);
  const mat = pick(a, ['hongo', 'arboles_hongo_rojo', 'arboles_hongo_palido', 'arboles_brezo']), luz = a.r() < 0.5;
  ps.push(a.elipsoide(0, 0, -0.3, r * 3.2, r * 2.8, 1.6, { mat: 'tierra', giro: a.r() * 180, tono: -0.1 }), a.elipsoide(az(a, 3), az(a, 3), 0.3, r * 2, r * 1.6, 1.4, { mat: 'musgo', tono: -0.05 }));
  // pie: cadena de huesos que se tuerce
  const cs: Comp[] = [bulto([0, 0, r * 0.6], [r * 1.6, r * 1.5, r * 1.1])];
  let p: V = [0, 0, 0], d: V = nrm([az(a, 0.3), az(a, 0.3), 1]);
  const pts: V[] = [p];
  for (let i = 0; i < 4; i++) { d = nrm([d[0] + az(a, 0.45), d[1] + az(a, 0.45), d[2] + 0.15]); const q = mas(p, d, H / 4); cs.push(hueso(p, q, r * (1 - i * 0.12), r * (1 - (i + 1) * 0.12))); p = q; pts.push(q); }
  for (let i = 0; i < 4; i++) { const g = a.r() * PI2, l = r * (2 + a.r()); cs.push(hueso([Math.cos(g) * r * 0.5, Math.sin(g) * r * 0.5, r * 0.8], [Math.cos(g) * l, Math.sin(g) * l, -0.5], r * 0.45, r * 0.2)); }
  ps.push(masa(cs, { mat: 'arboles_hongo_palido', suave: 2.4 }));
  const capa = (c: V, R: number, alto: number) => {
    ps.push(a.elipsoide(c[0], c[1], c[2] - alto * 0.15, R * 0.95, R * 0.92, alto * 0.35, { mat: 'arboles_hongo_palido', tono: -0.25 }));
    ps.push(a.elipsoide(c[0], c[1], c[2], R, R * (0.9 + a.r() * 0.15), alto, { mat, giro: a.r() * 180 }));
    // flecos que cuelgan del borde
    for (let k = 0; k < Math.round(R / 3); k++) { const g = a.r() * PI2; colgajo(a, ps, [c[0] + Math.cos(g) * R * 0.85, c[1] + Math.sin(g) * R * 0.85, c[2] - alto * 0.2], 4 + a.r() * R * 0.6, 0.6, 'arboles_hongo_palido', { tramos: 1 }); }
    if (luz) for (let k = 0; k < Math.round(R / 2); k++) { const g = a.r() * PI2, dd = R * (0.2 + a.r() * 0.6); ps.push(a.esfera(c[0] + Math.cos(g) * dd, c[1] + Math.sin(g) * dd, c[2] + alto * Math.sqrt(1 - (dd / R) ** 2) * 0.9, 0.9 + a.r() * 0.6, { mat: 'arboles_hongo_luz' })); }
  };
  capa([p[0], p[1], p[2] + 1], r * (3 + a.r()), r * (1.3 + a.r() * 0.5));
  ps.push(a.elipsoide(p[0] + az(a, r), p[1] + az(a, r), p[2] + r * 1.4, r * 1.8, r * 1.6, r * 1.1, { mat, tono: 0.04 }));
  // repisas a los costados del pie
  for (let i = 0; i < [1, 3, 4][edad]; i++) {
    const q = pts[1 + Math.floor(a.r() * 3)], g = a.r() * PI2, R = r * (1.2 + a.r() * 0.9);
    capa([q[0] + Math.cos(g) * r * 1.2, q[1] + Math.sin(g) * r * 1.2, q[2]], R, R * 0.35);
  }
  for (let i = 0; i < 3; i++) { const g = a.r() * PI2, dd = r * (1.8 + a.r() * 1.2); hongo(a, ps, Math.cos(g) * dd, Math.sin(g) * dd, 3 + a.r() * 4, 2 + a.r() * 2, mat, a.r()); }
  return luz ? { piezas: ps, resplandor: { c: [p[0], p[1], p[2]], r: H * 0.8, color: '#3f9a7a' } } : ps;
}

// ------------------------------------------------------------------ muertos y quemados
const gramSeco = (a: Arma, N: number, extra: Partial<Gram> = {}): Gram => ({
  hijos: (n) => (n === N ? 3 + Math.floor(a.r() * 2) : 2 + (a.r() < 0.3 ? 1 : 0)),
  desde: (n) => (n === N ? 0.4 + a.r() * 0.2 : 0.3),
  abre: (n) => (n === N ? 0.75 : 0.62),
  largo: (n) => (n === N ? 0.85 : 0.66),
  grosor: 0.62, adelgaza: 0.55, tramos: (n) => (n >= 3 ? 3 : n === 2 ? 2 : 1),
  nudos: 0.5, nudosTronco: 0.2, sube: (n) => (n === N ? 0.02 : 0.1), quiebra: 0.2,
  ...extra,
});
function arbolSeco(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [];
  const rT = 6 + a.r() * 1.5, N = 4;
  suelo(a, ps, 18, { pasto: 'paja', hojas: 'hojas_otono', n: 3 });
  const o: OpcMadera = { mat: 'corteza_muerta', pie: pie(a, rT, 5, { nudosas: 1.5 }), nudos: 0.4, pelado: 0.35, musgo: 0.15, matMusgo: 'arboles_barba', rPalo: 1.1, max: 16 };
  if (v === 'partido') {
    // el tronco se rajó: un muñón astillado en pie y la mitad tumbada en el piso
    const E = nuevoEsq(2), h = 34 + a.r() * 10;
    E.segs.push({ a: [0, 0, 0], b: [az(a, 2), az(a, 2), h], r0: rT, r1: rT * 0.8, g: 0, n: 2 });
    madera(a, ps, E, o);
    for (let i = 0; i < 6; i++) {
      const g = (i / 6) * PI2 + az(a, 0.3), rr = rT * 0.8, hh = 4 + a.r() * 14;
      ps.push(a.poliedro([[Math.cos(g) * rr, Math.sin(g) * rr, h - 2], [Math.cos(g + 0.9) * rr, Math.sin(g + 0.9) * rr, h - 2], [Math.cos(g) * 2, Math.sin(g) * 2, h - 1], [Math.cos(g + 0.45) * rr * 0.75, Math.sin(g + 0.45) * rr * 0.75, h + hh]], { mat: i % 2 ? 'madera_vieja' : 'corteza_muerta' }));
    }
    const E2 = nuevoEsq(2), g = a.r() * PI2, u: V = [Math.cos(g), Math.sin(g), 0.06];
    const G = gramSeco(a, 2, { quiebra: 0.3 });
    E2.N = 3;
    crecer(a, E2, { ...G, sube: () => 0.12, largo: () => 0.45 }, [u[0] * 10, u[1] * 10, rT * 0.8], u, 42 + a.r() * 10, rT * 0.85, 2);
    madera(a, ps, E2, { ...o, pie: undefined, rPalo: 1.1 });
    const E3 = nuevoEsq(3);
    crecer(a, E3, gramSeco(a, 3), [0, 0, h * 0.7], nrm([-u[0], -u[1], 0.9]), 26, 3, 2);
    madera(a, ps, E3, { ...o, pie: undefined });
    return ps;
  }
  const E = nuevoEsq(N);
  const torcido = v === 'torcido', lado = a.r() * PI2;
  const G = gramSeco(a, N, torcido ? { nudos: 0.85, nudosTronco: 0.6, tira: [Math.cos(lado) * 0.12, Math.sin(lado) * 0.12, 0] } : v === 'ahorcado' ? { abre: (n) => (n === N ? 0.6 : 0.6) } : {});
  crecer(a, E, G, [0, 0, 0], nrm(torcido ? [Math.cos(lado) * 0.5, Math.sin(lado) * 0.5, 1] : [az(a, 0.1), az(a, 0.1), 1]), (torcido ? 30 : 38) * (0.9 + a.r() * 0.2), rT, N);
  if (v === 'ahorcado') {
    // rama baja y horizontal con la soga
    const r0: V = [0, 0, 36], r1: V = [30, -10, 44], r2: V = [38, -16, 50];
    E.segs.push({ a: [0, 0, 30], b: r0, r0: 4.6, r1: 4, g: 0, n: N }, { a: r0, b: r1, r0: 3.8, r1: 2, g: 0, n: N });
    ps.push(a.palo(r1, r2, 1.8, { mat: 'corteza_muerta', r1: 0.8 }));
    const sx = 22, sy = -7.3, zs = 40, zl = 18;
    ps.push(a.cilindro(sx, sy, zs - 1.5, 2.3, 3, { mat: 'cuerda' }));
    ps.push(a.palo([sx, sy, zs], [sx, sy, zl + 7], 0.9, { mat: 'cuerda' }));
    ps.push(a.cilindro(sx, sy, zl + 5, 1.6, 4, { mat: 'cuerda' }));
    const w: V = [Math.SQRT1_2, -Math.SQRT1_2, 0], R = 4.5, cz = zl + 1, n = 8;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * PI2, t1 = ((i + 1) / n) * PI2;
      ps.push(a.palo([sx + w[0] * Math.sin(t0) * R, sy + w[1] * Math.sin(t0) * R, cz + Math.cos(t0) * R * 1.2], [sx + w[0] * Math.sin(t1) * R, sy + w[1] * Math.sin(t1) * R, cz + Math.cos(t1) * R * 1.2], 0.9, { mat: 'cuerda' }));
    }
  }
  madera(a, ps, E, o);
  // cuervos de vez en cuando
  if (a.r() < 0.35) { const q = E.horq.filter((h) => h.n === 1)[0]; if (q) { ps.push(a.elipsoide(q.p[0], q.p[1], q.p[2] + 2.5, 2.4, 1.4, 1.6, { mat: 'negro', giro: a.r() * 180 }), a.esfera(q.p[0] + 1.8, q.p[1], q.p[2] + 4, 1.1, { mat: 'negro' })); } }
  return ps;
}
function arbolQuemado(v: string, a: Arma): Pieza[] | { piezas: Pieza[]; resplandor: { c: V; r: number; color: string } } {
  const ps: Pieza[] = [], brasas = v !== 'carbon';
  const rT = 6 + a.r() * 1.8;
  suelo(a, ps, 20, { mat: 'arboles_ceniza', pasto: 'arboles_ceniza', n: 4, piedra: 0.3 });
  const o: OpcMadera = { mat: 'arboles_carbon', pie: pie(a, rT, 5, { nudosas: 1.4 }), nudos: 0.3, grietas: brasas ? 0.6 : 0.1, matGrieta: brasas ? 'lava' : 'arboles_ceniza', rPalo: 1.1, max: 18 };
  if (v === 'muñon') {
    const E = nuevoEsq(2), h = 22 + a.r() * 8;
    E.segs.push({ a: [0, 0, 0], b: [az(a, 2), az(a, 2), h], r0: rT + 1, r1: rT * 0.85, g: 0, n: 2 });
    crecer(a, E, gramSeco(a, 2, { quiebra: 0.5 }), [0, 0, h * 0.7], nrm([0.8, -0.3, 0.7]), 20, 2.6, 1, 0);
    madera(a, ps, E, { ...o, grietas: brasas ? 0.9 : 0 });
    for (let i = 0; i < 5; i++) {
      const g = (i / 5) * PI2 + az(a, 0.3), rr = rT * 0.85, hh = 5 + a.r() * 12;
      ps.push(a.poliedro([[Math.cos(g) * rr, Math.sin(g) * rr, h - 2], [Math.cos(g + 1.1) * rr, Math.sin(g + 1.1) * rr, h - 2], [0, 0, h - 1], [Math.cos(g + 0.55) * rr * 0.7, Math.sin(g + 0.55) * rr * 0.7, h + hh]], { mat: 'arboles_carbon' }));
    }
  } else {
    const E = nuevoEsq(3);
    crecer(a, E, gramSeco(a, 3, { quiebra: 0.45, sube: (n) => (n === 3 ? 0.03 : 0.18) }), [0, 0, 0], nrm([az(a, 0.12), az(a, 0.12), 1]), 44 + a.r() * 10, rT, 3);
    madera(a, ps, E, o);
  }
  if (!brasas) return ps;
  for (let i = 0; i < 5; i++) { const g = a.r() * PI2, d = 6 + a.r() * 12; ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 0.8, 1.6, 1.4, 1, { mat: a.r() < 0.5 ? 'fuego' : 'lava', tono: -0.3 })); }
  return { piezas: ps, resplandor: { c: [0, 0, 3], r: 18, color: '#d0441c' } };
}
function ancestral(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = [], muerto = v === 'muerto', N = muerto ? 3 : 2;
  const mat = muerto ? 'corteza_muerta' : 'arboles_roble';
  suelo(a, ps, 46, { n: 5, hojas: muerto ? 'hojas_otono' : undefined });
  // varios troncos fundidos y retorcidos en una sola masa
  const top: V = [az(a, 4), az(a, 4), 56 + a.r() * 8], cs: Comp[] = [...pie(a, 15, 7, { largo: 2.1, alto: 1.4 })];
  const nt = 4, g0 = a.r() * PI2;
  for (let i = 0; i < nt; i++) {
    const g = g0 + (i / nt) * PI2 + a.r() * 0.5, b: V = [Math.cos(g) * 8, Math.sin(g) * 8, 0];
    const m: V = [Math.cos(g + 0.7) * 9 + top[0] * 0.5, Math.sin(g + 0.7) * 9 + top[1] * 0.5, 28];
    cs.push(hueso(b, m, 11, 9), hueso(m, [top[0] + Math.cos(g + 1.4) * 4, top[1] + Math.sin(g + 1.4) * 4, top[2]], 9, 7.5));
  }
  for (let i = 0; i < 4; i++) { const g = a.r() * PI2, z = 8 + a.r() * 30; cs.push(bulto([Math.cos(g) * 12, Math.sin(g) * 12, z], [5, 5, 4], { mat: muerto ? 'arboles_barba' : 'musgo', k: 1 })); }
  ps.push(masa(cs, { mat, suave: 3.5 }));
  if (v === 'hueco') {
    ps.push(a.elipsoide(13, 13, 15, 9, 9, 15, { mat, resta: true }));
    ps.push(a.elipsoide(7, 7, 15, 8, 8, 14, { mat: 'negro' }));
    ps.push(a.elipsoide(11, 11, 1, 6, 6, 1.5, { mat: 'tierra', tono: -0.15 }));
  }
  const E = nuevoEsq(N);
  const G: Gram = {
    hijos: () => 2, desde: () => 0.4, abre: (n) => (n === N ? 0.6 : 0.7), largo: (n) => (n === N ? 0.7 : 0.6),
    grosor: 0.7, adelgaza: 0.6, tramos: (n) => (n >= 2 ? 3 : 2), nudos: 0.4, sube: (n) => (n === N ? 0.04 : 0.1), quiebra: muerto ? 0.25 : 0.05,
  };
  const g1 = a.r() * PI2;
  const nl = 4 + (a.r() < 0.4 ? 1 : 0);
  for (let i = 0; i < nl; i++) {
    const g = g1 + (i / nl) * PI2 + az(a, 0.3);
    E.N = N + 1;
    crecer(a, E, G, top, nrm([Math.cos(g), Math.sin(g), 0.55 + a.r() * 0.5]), (muerto ? 44 : 50) + a.r() * 12, 7.5, N, ++E.ng);
  }
  madera(a, ps, E, { mat, nudos: 0.3, musgo: 0.4, max: 12 });
  if (!muerto) copa(a, ps, E, { R: 14, mat: 'arboles_follaje', mat2: 'arboles_follaje_claro', p2: 0.25, max: 32, hueco: 0.04, relleno: 4, tope: 292 });
  else barbas(a, ps, E, 14, 18);
  return ps;
}

// ------------------------------------------------------------------ registro de árboles
const EDADES = ['adulto', 'joven', 'viejo'];
const chico: Record<string, [number, number]> = { joven: [1, 1] };
registrar(
  { id: 'arb_roble', nombre: ['Roble', 'Oak'], tema: 'arboles', variantes: ['adulto', 'joven', 'viejo', 'otono', 'seco'], huella: [2, 2], huellaPor: chico, bloquea: true, armar: (v, _f, a) => roble(v, a) },
  { id: 'arb_haya', nombre: ['Haya', 'Beech'], tema: 'arboles', variantes: [...EDADES, 'otono'], huella: [2, 2], huellaPor: chico, bloquea: true, armar: (v, _f, a) => haya(v, a) },
  { id: 'arb_abedul', nombre: ['Abedul', 'Birch'], tema: 'arboles', variantes: [...EDADES, 'otono', 'desnudo'], huella: [1, 1], bloquea: true, armar: (v, _f, a) => abedul(v, a) },
  { id: 'arb_sauce', nombre: ['Sauce llorón', 'Weeping willow'], tema: 'arboles', variantes: [...EDADES, 'mustio'], huella: [2, 2], huellaPor: chico, bloquea: true, armar: (v, _f, a) => sauce(v, a) },
  { id: 'arb_alamo', nombre: ['Álamo', 'Poplar'], tema: 'arboles', variantes: [...EDADES, 'otono'], huella: [1, 1], bloquea: true, armar: (v, _f, a) => alamo(v, a) },
  { id: 'arb_pino_alto', nombre: ['Pino alto', 'Tall pine'], tema: 'arboles', variantes: ['normal', 'nevado', 'joven', 'viejo'], huella: [1, 1], bloquea: true, armar: (v, _f, a) => pino(v, a, false) },
  { id: 'arb_pino_bajo', nombre: ['Pino de monte', 'Mountain pine'], tema: 'arboles', variantes: ['normal', 'nevado', 'joven', 'viejo'], huella: [1, 1], bloquea: true, armar: (v, _f, a) => pino(v, a, true) },
  { id: 'arb_abeto', nombre: ['Abeto', 'Fir'], tema: 'arboles', variantes: [...EDADES, 'nevado', 'nevado_viejo'], huella: [2, 2], huellaPor: chico, bloquea: true, armar: (v, _f, a) => abeto(v, a) },
  { id: 'arb_cipres', nombre: ['Ciprés', 'Cypress'], tema: 'arboles', variantes: EDADES, huella: [1, 1], bloquea: true, armar: (v, _f, a) => cipres(v, a) },
  { id: 'arb_nevado', nombre: ['Árbol nevado', 'Snowy tree'], tema: 'arboles', variantes: ['nevado', 'nevado_joven', 'nevado_viejo'], huella: [2, 2], huellaPor: { nevado_joven: [1, 1] }, bloquea: true, armar: (v, _f, a) => nevado(v, a) },
  { id: 'arb_paramo', nombre: ['Árbol del páramo', 'Moor tree'], tema: 'arboles', variantes: EDADES, huella: [2, 2], huellaPor: chico, bloquea: true, armar: (v, _f, a) => paramo(v, a) },
  { id: 'arb_pantano', nombre: ['Árbol del pantano', 'Swamp tree'], tema: 'arboles', variantes: EDADES, huella: [3, 3], huellaPor: { joven: [2, 2] }, bloquea: true, armar: (v, _f, a) => pantano(v, a) },
  { id: 'arb_palmera', nombre: ['Palmera', 'Palm tree'], tema: 'arboles', variantes: EDADES, huella: [1, 1], bloquea: true, armar: (v, _f, a) => palmera(v, a) },
  { id: 'arb_baobab', nombre: ['Baobab', 'Baobab'], tema: 'arboles', variantes: EDADES, huella: [3, 3], huellaPor: { joven: [2, 2] }, bloquea: true, armar: (v, _f, a) => baobab(v, a) },
  { id: 'arb_arbol_selva', nombre: ['Gigante de la selva', 'Jungle giant'], tema: 'arboles', variantes: EDADES, huella: [3, 3], huellaPor: { joven: [2, 2] }, bloquea: true, armar: (v, _f, a) => selva(v, a) },
  { id: 'arb_arbol_hongo', nombre: ['Árbol de hongos', 'Mushroom tree'], tema: 'arboles', variantes: EDADES, huella: [2, 2], huellaPor: chico, bloquea: true, armar: (v, _f, a) => arbolHongo(v, a) },
  { id: 'arb_arbol_seco', nombre: ['Árbol muerto', 'Gnarled dead tree'], tema: 'arboles', variantes: ['alto', 'torcido', 'partido', 'ahorcado'], huella: [1, 1], huellaPor: { partido: [3, 3] }, bloquea: true, armar: (v, _f, a) => arbolSeco(v, a) },
  { id: 'arb_arbol_quemado', nombre: ['Árbol quemado', 'Burnt tree'], tema: 'arboles', variantes: ['carbon', 'brasas', 'muñon'], huella: [1, 1], bloquea: true, armar: (v, _f, a) => arbolQuemado(v, a) },
  { id: 'arb_arbol_ancestral', nombre: ['Árbol ancestral', 'Ancient giant tree'], tema: 'arboles', variantes: ['verde', 'muerto', 'hueco'], huella: [3, 3], bloquea: true, armar: (v, _f, a) => ancestral(v, a) },
  {
    id: 'arb_arbol_jaula', nombre: ['Árbol de la jaula', 'Gibbet tree'], tema: 'arboles', variantes: ['vacia', 'abierta', 'con_huesos'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 18, { pasto: 'paja', hojas: 'hojas_otono' });
      const E = nuevoEsq(3);
      crecer(a, E, gramSeco(a, 3, { quiebra: 0.25 }), [0, 0, 0], nrm([-0.15, -0.1, 1]), 48, 6.5, 3);
      // la rama gruesa de donde cuelga
      E.segs.push({ a: [0, 0, 46], b: [-1, -1, 60], r0: 5, r1: 4.5, g: 0, n: 3 }, { a: [-1, -1, 60], b: [26, -16, 76], r0: 4.2, r1: 2.6, g: 0, n: 3 });
      madera(a, ps, E, { mat: 'corteza_muerta', pie: pie(a, 6.5, 5, { nudosas: 1.4 }), nudos: 0.3, pelado: 0.3, rPalo: 1.1, max: 16 });
      ps.push(a.palo([26, -16, 76], [38, -24, 74], 2.6, { mat: 'corteza_muerta', r1: 1.2 }));
      // cadena
      const cx = 22, cy = -13.5, ztop = 72, zj = 50, Rj = 8, Hj = 24, z0 = zj - Hj;
      for (let z = ztop; z > zj + 4; z -= 3.2) ps.push(a.caja(cx, cy, z - 3.2, z % 2 < 1 ? 2.2 : 0.9, z % 2 < 1 ? 0.9 : 2.2, 3, { mat: 'hierro_oxido' }));
      ps.push(a.cilindro(cx, cy, zj, 3, 2, { mat: 'hierro_oxido', r1: 2 }), a.palo([cx, cy, zj + 2], [cx, cy, zj + 5], 1, { mat: 'hierro' }));
      // jaula: piso, aros y barrotes
      ps.push(a.cilindro(cx, cy, z0, Rj, 2, { mat: 'hierro_oxido' }));
      for (const z of [z0 + Hj * 0.55, zj - 2]) {
        ps.push(a.cilindro(cx, cy, z, Rj + 0.5, 1.6, { mat: 'hierro_oxido' }));
        ps.push(a.cilindro(cx, cy, z - 1, Rj - 0.8, 3.6, { mat: 'hierro', resta: true }));
      }
      const N = 9, abierta = v === 'abierta';
      for (let i = 0; i < N; i++) {
        const g = (i / N) * PI2;
        if (abierta && (i === 0 || i === 1)) continue;
        ps.push(a.palo([cx + Math.cos(g) * Rj, cy + Math.sin(g) * Rj, z0], [cx + Math.cos(g) * Rj, cy + Math.sin(g) * Rj, zj], 0.8, { mat: 'hierro' }));
        ps.push(a.palo([cx + Math.cos(g) * Rj, cy + Math.sin(g) * Rj, zj], [cx, cy, zj + 5], 0.75, { mat: 'hierro' }));
      }
      if (abierta) {
        const hx = cx + Math.cos(-0.35) * Rj, hy = cy + Math.sin(-0.35) * Rj;
        for (let k = 0; k < 3; k++) { const d = 3 + k * 3.2; ps.push(a.palo([hx + d * 0.55, hy + d * 0.83, z0 + 1], [hx + d * 0.55, hy + d * 0.83, zj - 2], 0.8, { mat: 'hierro' })); }
        ps.push(a.palo([hx, hy, z0 + 3], [hx + 10 * 0.55, hy + 10 * 0.83, z0 + 3], 0.9, { mat: 'hierro_oxido' }), a.palo([hx, hy, zj - 3], [hx + 10 * 0.55, hy + 10 * 0.83, zj - 3], 0.9, { mat: 'hierro_oxido' }));
      }
      if (v === 'con_huesos') {
        ps.push(a.esfera(cx + 2, cy + 2, z0 + 4.8, 2.8, { mat: 'hueso' }), a.caja(cx + 2.5, cy + 3.5, z0 + 2.5, 3, 2, 2, { mat: 'hueso', giro: 30 }));
        ps.push(a.palo([cx - 4, cy - 2, z0 + 3], [cx + 5, cy - 3, z0 + 3.5], 0.9, { mat: 'hueso' }), a.palo([cx - 5, cy + 3, z0 + 3], [cx + 1, cy - 5, z0 + 3], 0.9, { mat: 'hueso' }));
        ps.push(a.palo([cx + 3, cy + 6, zj - 6], [cx + 4, cy + 7.5, z0 + 2], 0.9, { mat: 'hueso' }));
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ troncos, tocones y raíces
registrar(
  {
    id: 'arb_tocon', nombre: ['Tocón', 'Tree stump'], tema: 'arboles', variantes: ['fresco', 'podrido', 'con_hacha'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], R = 7.5 + a.r() * 3, h = 9 + a.r() * 6, podrido = v === 'podrido';
      const mat = podrido ? 'corteza_muerta' : 'arboles_roble', top: V = [0, 0, h];
      suelo(a, ps, R * 1.8, { hojas: 'hojas_otono', n: 3 });
      const cs: Comp[] = [...pie(a, R * 0.8, 5, { largo: 2.4, alto: 0.9 }), hueso([0, 0, 0], [top[0] * 0.5, top[1] * 0.5, h * 0.5], R, R * 0.95)];
      if (podrido) for (let i = 0; i < 3; i++) { const g = a.r() * PI2; cs.push(bulto([Math.cos(g) * R * 0.8, Math.sin(g) * R * 0.8, h * (0.3 + a.r() * 0.5)], [R * 0.5, R * 0.4, R * 0.35], { mat: 'musgo', k: 1, giro: (g * 180) / Math.PI })); }
      ps.push(masa(cs, { mat, suave: 2.5 }));
      ps.push(a.cilindro(0, 0, 1, R * 0.96, h - 1, { mat, r1: R * 0.9 }));
      if (podrido) {
        ps.push(a.cilindro(0, 0, h - 4, R * 0.65, 8, { mat, resta: true }));
        ps.push(a.cilindro(0, 0, h - 4, R * 0.65, 1, { mat: 'tierra', tono: -0.1 }));
        for (let i = 0; i < 6; i++) { const g = (i / 6) * PI2 + az(a, 0.3), rr = R * 0.9; ps.push(a.poliedro([[Math.cos(g) * rr, Math.sin(g) * rr, h - 1], [Math.cos(g + 0.8) * rr, Math.sin(g + 0.8) * rr, h - 1], [Math.cos(g + 0.4) * (rr - 2), Math.sin(g + 0.4) * (rr - 2), h - 1], [Math.cos(g + 0.4) * (rr - 0.8), Math.sin(g + 0.4) * (rr - 0.8), h + 2 + a.r() * 5]], { mat: 'madera_vieja' })); }
        for (let i = 0; i < 4; i++) { const g = 0.1 + a.r() * 1.5; repisa(a, ps, [Math.cos(g) * R, Math.sin(g) * R, 2 + a.r() * (h - 4)], [Math.cos(g), Math.sin(g), 0], 2.5 + a.r() * 1.5); }
      } else {
        ps.push(a.cilindro(0, 0, h - 0.4, R * 0.84, 0.8, { mat: 'madera_lisa', tono: 0.12 }));
        ps.push(a.cilindro(0, 0, h, R * 0.55, 0.5, { mat: 'madera_lisa', tono: -0.04 }), a.cilindro(0, 0, h + 0.2, R * 0.2, 0.5, { mat: 'madera_lisa', tono: -0.12 }));
        ps.push(a.caja(R * 0.3, -R * 0.3, h + 0.3, R * 0.9, 0.8, 0.5, { mat: 'negro', giro: 40 + a.r() * 40 }));
        if (a.r() < 0.5) hongo(a, ps, R * 1.1, R * 0.4, 3, 1.8, 'hongo', 0.4);
      }
      if (v === 'con_hacha') {
        const g = a.r() * 40 - 20;
        ps.push(a.caja(1, 1, h - 2, 9, 1.4, 6, { mat: 'hierro', giro: g + 45 }));
        ps.push(a.palo([1, 1, h + 3], [12, 12, h + 14], 1.1, { mat: 'madera' }));
        for (let i = 0; i < 5; i++) ps.push(a.caja(R + 4 + az(a, 6), az(a, 10), 0, 3 + a.r() * 3, 1.5, 1, { mat: 'madera_lisa', giro: a.r() * 180, tono: 0.15 }));
      }
      return ps;
    },
  },
  ...(['tronco_caido', 'tronco_hueco'] as const).map((tipo) => ({
    id: `arb_${tipo}`, nombre: (tipo === 'tronco_caido' ? ['Tronco caído', 'Fallen log'] : ['Tronco hueco', 'Hollow log']) as [string, string],
    tema: 'arboles' as const, variantes: ['x', 'y', 'x_musgo'], huella: [4, 1] as [number, number], bloquea: true,
    armar: (v: string, _f: number, a: Arma) => {
      const ps: Pieza[] = [], hueco = tipo === 'tronco_hueco', L = hueco ? 52 + a.r() * 10 : 62 + a.r() * 14, R = hueco ? 8.5 + a.r() * 1.5 : 6.5 + a.r() * 2;
      const ex: V = v === 'y' ? [0, 1, 0] : [1, 0, 0], ey: V = v === 'y' ? [1, 0, 0] : [0, 1, 0];
      const P = (u: number, w: number, z: number): V => [ex[0] * u + ey[0] * w, ex[1] * u + ey[1] * w, z];
      const mat = a.r() < 0.5 ? 'arboles_roble' : 'corteza_muerta', musgo = v === 'x_musgo' ? 0.9 : 0.35;
      ps.push(a.elipsoide(0, 0, -0.4, L * 0.55 * (ex[0] || 0.35), L * 0.55 * (ex[1] || 0.35), 1.5, { mat: 'tierra' }));
      // el tronco: un cilindro que se afina, con bultos de musgo y nudos encima
      const pts: V[] = [P(-L / 2, 0, R - 0.8), P(L / 2, 0, R - 0.8)];
      ps.push(a.cilindro(pts[0][0], pts[0][1], pts[0][2], R, L, { mat, r1: R * 0.86, eje: ex }));
      for (let i = 0; i < 5; i++) if (a.r() < musgo) { const u = -L / 2 + 4 + a.r() * (L - 8), q = P(u, az(a, R * 0.3), R * 1.62 - 0.8); ps.push(a.elipsoide(q[0], q[1], q[2], ex[0] ? 5 + a.r() * 5 : R * 0.6, ex[1] ? 5 + a.r() * 5 : R * 0.6, R * 0.32, { mat: 'musgo', tono: az(a, 0.06) })); }
      for (let i = 0; i < 3; i++) { const u = -L / 2 + 5 + a.r() * (L - 10), s = a.r() < 0.5 ? 1 : -1; const q = P(u, s * R * 0.8, R * 0.9); ps.push(a.elipsoide(q[0], q[1], q[2], R * 0.38, R * 0.38, R * 0.32, { mat, tono: -0.06 })); }
      if (hueco) {
        ps.push(a.cilindro(pts[0][0] - ex[0] * 2, pts[0][1] - ex[1] * 2, pts[0][2], R * 0.66, L + 4, { mat, r1: R * 0.56, eje: ex, resta: true }));
        const q = P(-L / 2 + 1, 0, R - 0.8 - R * 0.6);
        ps.push(a.cilindro(q[0], q[1], q[2], 1, L - 2, { mat: 'tierra', eje: ex }));
        ps.push(a.cilindro(pts[0][0] + ex[0] * 6, pts[0][1] + ex[1] * 6, pts[0][2], R * 0.6, 1, { mat: 'negro', eje: ex }));
        ps.push(a.cilindro(pts[0][0] + ex[0] * (L - 6), pts[0][1] + ex[1] * (L - 6), pts[0][2], R * 0.55, 1, { mat: 'negro', eje: ex }));
      } else {
        // cara cortada al frente y el plato de raíces arrancado atrás
        const pe = pts[1];
        ps.push(a.cilindro(pe[0], pe[1], pe[2], R * 0.8, 0.6, { mat: 'madera_lisa', eje: ex, tono: 0.1 }));
        const pr = P(-L / 2 - 1, 0, R);
        ps.push(a.elipsoide(pr[0], pr[1], pr[2], 2.5, R * 1.3, R * 1.3, { mat: 'tierra', giro: v === 'y' ? 90 : 0, tono: -0.05 }));
        for (let i = 0; i < 7; i++) {
          const g = (i / 7) * PI2 + az(a, 0.3), s = R * (1.5 + a.r() * 0.8);
          ps.push(a.palo(pr, mas(pr, [ey[0] * Math.cos(g) * s - ex[0] * 3, ey[1] * Math.cos(g) * s - ex[1] * 3, Math.max(-R + 1, Math.sin(g) * s)]), 1.8, { mat: 'corteza_muerta', r1: 0.5 }));
        }
        for (let i = 0; i < 2; i++) { const u = -L / 4 + a.r() * L * 0.6, s = i ? 1 : -1, q = P(u, s * R * 0.6, R + R * 0.5); ps.push(a.palo(q, mas(q, [ey[0] * s * 8 + ex[0] * 3, ey[1] * s * 8 + ex[1] * 3, 8]), 1.5, { mat, r1: 0.6 })); }
      }
      // hongos de repisa a los costados
      for (let i = 0; i < 4; i++) { const u = -L / 2 + 6 + a.r() * (L - 12), s = a.r() < 0.5 ? 1 : -1; repisa(a, ps, P(u, s * R * 0.95, R * (0.6 + a.r() * 0.8)), [ey[0] * s, ey[1] * s, 0], 2 + a.r() * 1.8, a.r() < 0.3 ? 'arboles_hongo_palido' : 'hongo'); }
      if (a.r() < 0.6) for (let i = 0; i < 3; i++) { const u = -L / 2 + a.r() * L, q = P(u, (a.r() < 0.5 ? 1 : -1) * (R + 2), 0); hongo(a, ps, q[0], q[1], 2.5 + a.r() * 2, 1.5 + a.r(), a.r() < 0.5 ? 'arboles_hongo_rojo' : 'hongo', 0.5); }
      return ps;
    },
  })),
  {
    id: 'arb_raices', nombre: ['Raíces sueltas', 'Exposed roots'], tema: 'arboles', variantes: ['arco', 'enredo', 'grupo'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.elipsoide(0, 0, -0.4, 18, 14, 1.6, { mat: 'tierra', giro: a.r() * 180, tono: -0.05 }));
      const n = v === 'arco' ? 2 : v === 'enredo' ? 5 : 4, mat = a.r() < 0.65 ? 'arboles_roble' : 'corteza_muerta';
      for (let i = 0; i < n; i++) {
        // una raíz que sale de la tierra, se arquea y vuelve a entrar
        const g = a.r() * PI2, u: V = [Math.cos(g), Math.sin(g), 0], L = (v === 'arco' ? 26 : 16) + a.r() * 12, h = (v === 'arco' ? 9 : 4) + a.r() * 4, r = v === 'arco' ? 2.4 + a.r() * 0.8 : 1.4 + a.r() * 1;
        const b: V = [az(a, 6) - u[0] * L * 0.5, az(a, 6) - u[1] * L * 0.5, -1.5];
        const cs: Comp[] = [];
        let p = b;
        for (let k = 1; k <= 4; k++) {
          const t = k / 4, q: V = [b[0] + u[0] * L * t + az(a, 2), b[1] + u[1] * L * t + az(a, 2), -1.5 + Math.sin(t * Math.PI) * h];
          cs.push(hueso(p, q, r * (1 - (k - 1) * 0.12), r * (1 - k * 0.12)));
          p = q;
        }
        if (a.r() < 0.5) { const m = mez(b, p, 0.5); cs.push(bulto([m[0], m[1], m[2] + h * 0.6], [L * 0.15, r * 0.9, r * 0.5], { eje: u, mat: 'musgo', k: 1 })); }
        ps.push(masa(cs, { mat, suave: 1.6, tono: az(a, 0.05) }));
      }
      for (let i = 0; i < 4; i++) { const g = a.r() * PI2, d = 6 + a.r() * 10; ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 0.4, 3, 2, 0.8, { mat: 'hojas_otono', giro: a.r() * 180, tono: -0.1 })); }
      if (v === 'grupo') mataPasto(a, ps, az(a, 6), az(a, 6), 6, 10, 'pasto');
      return ps;
    },
  },
);

// ------------------------------------------------------------------ arbustos y plantas chicas
/** Arbusto de varios tallos con su copa de racimos. */
function arbusto(a: Arma, ps: Pieza[], o: { tallos: number; alto: number; r: number; R: number; mat: string; mat2?: string; abre?: number; hojas?: boolean; madera?: string; N?: number; aplana?: number; max?: number }) {
  const N = o.N ?? 2, E = nuevoEsq(N + 1);
  const G: Gram = {
    hijos: (n) => (n === N ? 3 : 2), desde: () => 0.35, abre: () => 0.6, largo: () => 0.6, grosor: 0.6, adelgaza: 0.55,
    tramos: (n) => (n === N ? 2 : 1), nudos: 0.4, sube: () => 0.08, rMin: 0.45,
  };
  for (let i = 0; i < o.tallos; i++) {
    const g = a.r() * PI2, ab = (o.abre ?? 0.5) * (0.5 + a.r() * 0.8);
    crecer(a, E, G, [az(a, 1.5), az(a, 1.5), -0.5], nrm([Math.cos(g) * Math.sin(ab), Math.sin(g) * Math.sin(ab), Math.cos(ab)]), o.alto * (0.55 + a.r() * 0.35), o.r, N, 0);
  }
  for (const s of E.segs) ps.push(a.palo(s.a, s.b, Math.max(0.55, s.r0), { mat: o.madera ?? 'corteza', r1: Math.max(0.45, s.r1) }));
  if (o.hojas !== false) copa(a, ps, E, { R: o.R, mat: o.mat, mat2: o.mat2, p2: 0.3, max: o.max ?? 14, hueco: 0.05, afuera: 0.2, relleno: 2, aplana: o.aplana ?? 0.8, tope: 200 });
  return E;
}
registrar(
  {
    id: 'arb_arbusto', nombre: ['Arbusto', 'Bush'], tema: 'arboles', variantes: ['chico', 'mediano', 'grande', 'seco'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], t = v === 'chico' ? 0 : v === 'grande' ? 2 : 1, seco = v === 'seco';
      suelo(a, ps, [8, 11, 14][t], { n: 2, piedra: 0.3, hojas: seco ? 'hojas_otono' : undefined });
      const mat = a.r() < 0.35 ? 'arboles_follaje_claro' : 'arboles_follaje';
      arbusto(a, ps, { tallos: [3, 4, 5][t] + (seco ? 2 : 0), alto: [12, 18, 26][t], r: [0.9, 1.2, 1.5][t], R: [4, 5, 6][t], mat, mat2: 'hojas', hojas: !seco, madera: seco ? 'corteza_muerta' : 'corteza', N: seco ? 3 : 2, abre: 0.7, max: [6, 10, 14][t] });
      // bayas oscuras
      if (!seco && a.r() < 0.45) for (let i = 0; i < 5; i++) { const g = a.r() * PI2, d = [5, 7, 9][t]; ps.push(a.esfera(Math.cos(g) * d, Math.sin(g) * d, [6, 9, 13][t] * (0.6 + a.r() * 0.6), 1.1, { mat: 'tela_morada', tono: -0.15 })); }
      return ps;
    },
  },
  {
    id: 'arb_acebo', nombre: ['Acebo', 'Holly bush'], tema: 'arboles', variantes: ['chico', 'grande', 'bayas'], huella: [1, 1], huellaPor: { grande: [2, 2] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], g = v === 'grande' ? 1 : 0;
      suelo(a, ps, [10, 15][g], { n: 2, piedra: 0.3 });
      const E = arbusto(a, ps, { tallos: [4, 6][g], alto: [18, 30][g], r: [1, 1.6][g], R: [4.5, 6][g], mat: 'arboles_acebo', mat2: 'arboles_follaje_frio', abre: 0.45, N: 2, aplana: 0.9, max: [10, 16][g] });
      const nb = v === 'bayas' ? 16 : 5;
      for (const q of E.puntas.sort(() => a.r() - 0.5).slice(0, nb)) for (let k = 0; k < (v === 'bayas' ? 2 : 1); k++) ps.push(a.esfera(q.p[0] + az(a, 3), q.p[1] + az(a, 3), q.p[2] + az(a, 2), 1, { mat: 'tela_roja', tono: 0.05 + az(a, 0.1) }));
      return ps;
    },
  },
  {
    id: 'arb_enebro', nombre: ['Enebro', 'Juniper'], tema: 'arboles', variantes: ['bajo', 'alto', 'seco'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], alto = v === 'alto', seco = v === 'seco';
      suelo(a, ps, 11, { n: 2, pasto: 'paja', piedra: 0.6 });
      const H = alto ? 36 + a.r() * 10 : 14 + a.r() * 6, W = alto ? 7 : 11, lx = az(a, 3), ly = az(a, 3);
      // tallos retorcidos
      for (let i = 0; i < (alto ? 2 : 4); i++) { const g = a.r() * PI2; ps.push(a.palo([0, 0, 0], [Math.cos(g) * W * 0.4 + lx * 0.5, Math.sin(g) * W * 0.4 + ly * 0.5, H * 0.5], 1.4, { mat: 'arboles_pino_corteza', r1: 0.8 })); }
      const n = alto ? 26 : 20;
      for (let i = 0; i < n; i++) {
        const t = (i + a.r()) / n, z = 2 + H * (alto ? t * 0.95 : 0.2 + t * 0.6), r = W * (alto ? Math.sin(Math.PI * (0.15 + t * 0.85)) * (1.1 - t * 0.5) : 0.6 + Math.sin(t * 3) * 0.4), g = i * 2.39996 + az(a, 0.3);
        const d = r * (0.5 + a.r() * 0.4), rr = 2.5 + a.r() * 2.2;
        if (seco && a.r() < 0.45) { ps.push(a.palo([lx * t, ly * t, z - 2], [lx * t + Math.cos(g) * (d + 3), ly * t + Math.sin(g) * (d + 3), z + 2], 0.6, { mat: 'corteza_muerta', r1: 0.35 })); continue; }
        ps.push(a.elipsoide(lx * t + Math.cos(g) * d, ly * t + Math.sin(g) * d, z, rr * 1.2, rr, rr * (alto ? 1.4 : 0.8), { mat: seco && a.r() < 0.5 ? 'arboles_otono' : a.r() < 0.3 ? 'arboles_follaje_frio' : 'arboles_agujas', giro: (g * 180) / Math.PI, tono: az(a, 0.06) + t * 0.05 }));
      }
      if (!seco) for (let i = 0; i < 6; i++) { const g = a.r() * PI2; ps.push(a.esfera(Math.cos(g) * W * 0.7, Math.sin(g) * W * 0.7, H * (0.3 + a.r() * 0.5), 0.9, { mat: 'tela_azul', tono: -0.2 })); }
      return ps;
    },
  },
  {
    id: 'arb_brezo', nombre: ['Brezal', 'Heather'], tema: 'arboles', variantes: ['morado', 'seco', 'mezcla'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, -0.4, 19, 15, 1.6, { mat: 'tierra', giro: a.r() * 180 })];
      const matas = 3 + Math.floor(a.r() * 3);
      for (let m = 0; m < matas; m++) {
        const g = a.r() * PI2, d = a.r() * 10, cx = Math.cos(g) * d, cy = Math.sin(g) * d, R = 5 + a.r() * 4, H = 4 + a.r() * 4;
        for (let i = 0; i < 6; i++) {
          const gg = a.r() * PI2, dd = a.r() * R * 0.7, z = H * (0.3 + a.r() * 0.6);
          ps.push(a.elipsoide(cx + Math.cos(gg) * dd, cy + Math.sin(gg) * dd, z, 2.6 + a.r() * 1.5, 2.2 + a.r(), 2 + a.r(), { mat: v === 'seco' ? 'hojas_otono' : a.r() < 0.5 ? 'musgo' : 'arboles_follaje_frio', giro: a.r() * 180, tono: az(a, 0.07) - (v === 'seco' ? 0.15 : 0.05) }));
          const flor = v === 'seco' ? 'corteza_muerta' : v === 'mezcla' && a.r() < 0.4 ? 'arboles_flor_blanca' : 'arboles_brezo';
          if (a.r() < 0.8) ps.push(a.elipsoide(cx + Math.cos(gg) * dd, cy + Math.sin(gg) * dd, z + 2, 1.6, 1.3, 1.6, { mat: flor, tono: az(a, 0.08) }));
        }
      }
      return ps;
    },
  },
  {
    id: 'arb_zarza', nombre: ['Zarzal espinoso', 'Thorny bramble'], tema: 'arboles', variantes: ['seca', 'verde', 'con_moras'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.elipsoide(0, 0, -0.4, 20, 16, 1.6, { mat: 'tierra', giro: a.r() * 180 }));
      const mat = v === 'seca' ? 'corteza_muerta' : 'arboles_zarza';
      ps.push(a.elipsoide(0, 0, 4, 14, 12, 8, { mat: v === 'seca' ? 'hojas_otono' : 'arboles_follaje', tono: v === 'seca' ? -0.35 : -0.25, giro: a.r() * 180 }));
      const n = 14 + Math.floor(a.r() * 4);
      for (let i = 0; i < n; i++) {
        // un tallo que sube en arco y vuelve a bajar, con espinas en ganchos
        const g = a.r() * PI2, b: V = [az(a, 6), az(a, 6), 0], L = 12 + a.r() * 12, H = 7 + a.r() * 10, seg = 4;
        let p = b;
        for (let k = 1; k <= seg; k++) {
          const t = k / seg, q: V = [b[0] + Math.cos(g) * L * t + az(a, 1.5), b[1] + Math.sin(g) * L * t + az(a, 1.5), Math.max(0.5, Math.sin(t * Math.PI * 0.85) * H + 0.5)];
          ps.push(a.palo(p, q, 0.9, { mat, r1: 0.7 }));
          if (k % 2 === 0) { const s: V = [az(a, 1), az(a, 1), 1]; ps.push(a.palo(q, mas(q, nrm(mas(s, [Math.cos(g), Math.sin(g), 0], -0.8)), 2.6), 0.75, { mat: 'hueso', r1: 0.1, tono: -0.35 })); }
          if (v !== 'seca' && a.r() < 0.55) ps.push(a.elipsoide(q[0], q[1], q[2] + 1, 2.4, 1.8, 1.2, { mat: a.r() < 0.4 ? 'arboles_follaje' : 'hojas', giro: a.r() * 180, tono: az(a, 0.08) }));
          if (v === 'con_moras' && a.r() < 0.55) ps.push(a.esfera(q[0] + az(a, 1.5), q[1] + az(a, 1.5), q[2] - 1.2, 1.15, { mat: 'tela_morada', tono: -0.2 }));
          p = q;
        }
      }
      return ps;
    },
  },
  {
    id: 'arb_helecho', nombre: ['Helecho', 'Fern'], tema: 'arboles', variantes: ['verde', 'seco', 'grupo'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const mat = v === 'seco' ? 'hojas_otono' : 'hojas_selva';
      const matas: V[] = v === 'grupo' ? [[0, 0, 0], [12, -6, 0], [-6, 10, 0]] : [[0, 0, 0]];
      ps.push(a.elipsoide(matas.length > 1 ? 3 : 0, 0, -0.4, matas.length > 1 ? 20 : 10, matas.length > 1 ? 16 : 9, 1.4, { mat: 'tierra' }));
      for (const m of matas) {
        const n = 7 + Math.floor(a.r() * 4), g0 = a.r() * PI2, s = (m === matas[0] ? 1 : 0.75) * (0.85 + a.r() * 0.3);
        for (let i = 0; i < n; i++) {
          // fronda: raquis que se arquea hacia afuera y abajo con pinnas en rombo a los dos lados
          const g = g0 + (i / n) * PI2 + az(a, 0.25), L = (13 + a.r() * 6) * s, sube = 0.9 + a.r() * 0.5;
          const u0: V = [Math.cos(g), Math.sin(g), 0], lado: V = [-Math.sin(g), Math.cos(g), 0];
          let p: V = [m[0], m[1], 0.5];
          for (let k = 0; k < 3; k++) {
            const el = (1.1 - k * 0.65) * sube * 0.8, u = nrm([u0[0] * Math.cos(el), u0[1] * Math.cos(el), Math.sin(el)]);
            hoja(a, ps, p, u, L / 3 * 1.2, (3.4 - k * 0.8) * s, lado, 1, a.r() < 0.15 ? 'musgo' : mat, k * 0.04);
            p = mas(p, u, L / 3);
          }
        }
        ps.push(a.elipsoide(m[0], m[1], 1.5, 3 * s, 3 * s, 3 * s, { mat: v === 'seco' ? 'hojas_otono' : 'musgo', tono: -0.15 }));
      }
      return ps;
    },
  },
  {
    id: 'arb_pasto_alto', nombre: ['Mata de pasto alto', 'Tall grass tuft'], tema: 'arboles', variantes: ['verde', 'seco', 'espigado'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, -0.4, 9, 8, 1.4, { mat: 'tierra' })];
      const mat = v === 'verde' ? 'pasto' : 'paja';
      mataPasto(a, ps, 0, 0, 16, 20, mat);
      mataPasto(a, ps, 5, -3, 7, 13, mat);
      if (v === 'espigado') for (let i = 0; i < 6; i++) {
        const g = a.r() * PI2, inc = 0.1 + a.r() * 0.3, h = 24 + a.r() * 8;
        const top: V = [Math.cos(g) * inc * h, Math.sin(g) * inc * h, h];
        ps.push(a.palo([az(a, 2), az(a, 2), 0], top, 0.6, { mat: 'paja', r1: 0.4 }), a.elipsoide(top[0], top[1], top[2], 1.4, 1.4, 3.5, { mat: 'paja', tono: 0.1 }));
      }
      return ps;
    },
  },
  {
    id: 'arb_hongos', nombre: ['Corro de hongos', 'Mushroom cluster'], tema: 'arboles', variantes: ['pardos', 'rojos', 'palidos'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, -0.4, 11, 9, 1.6, { mat: 'tierra' }), a.elipsoide(az(a, 3), az(a, 3), 0.4, 7, 6, 1.6, { mat: 'musgo' })];
      const mat = v === 'pardos' ? 'hongo' : v === 'rojos' ? 'arboles_hongo_rojo' : 'arboles_hongo_palido';
      const n = 5 + Math.floor(a.r() * 4);
      for (let i = 0; i < n; i++) {
        const g = a.r() * PI2, d = a.r() * 8, big = i === 0 ? 1.4 : 0.6 + a.r() * 0.6;
        hongo(a, ps, Math.cos(g) * d, Math.sin(g) * d, 6 * big + 1, 4.4 * big, mat, a.r() * 1.5);
      }
      return ps;
    },
  },
  {
    id: 'arb_hongo_gigante', nombre: ['Hongo gigante', 'Giant mushroom'], tema: 'arboles', variantes: ['pardo', 'rojo', 'palido'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, -0.4, 20, 17, 2, { mat: 'tierra' }), a.elipsoide(3, -2, 0.6, 12, 10, 2, { mat: 'musgo' })];
      const mat = v === 'pardo' ? 'hongo' : v === 'rojo' ? 'arboles_hongo_rojo' : 'arboles_hongo_palido';
      const H = 44 + a.r() * 12, R = 20 + a.r() * 4, g = a.r() * PI2, inc = 4 + a.r() * 4;
      const top: V = [Math.cos(g) * inc, Math.sin(g) * inc, H];
      ps.push(masa([bulto([0, 0, 3], [9, 8.5, 5]), hueso([0, 0, 0], mez([0, 0, 0], top, 0.5), 6.5, 5.5), hueso(mez([0, 0, 0], top, 0.5), top, 5.5, 5), bulto(mez([0, 0, 0], top, 0.3), [6, 6, 5], { tono: -0.05 })], { mat: 'arboles_hongo_palido', suave: 3 }));
      ps.push(a.elipsoide(top[0], top[1], top[2] - R * 0.05, R * 0.92, R * 0.92, R * 0.2, { mat: 'arboles_hongo_palido', tono: -0.25 }));
      ps.push(a.elipsoide(top[0], top[1], top[2] + R * 0.05, R, R * (0.9 + a.r() * 0.1), R * 0.5, { mat, giro: a.r() * 180 }));
      if (mat === 'arboles_hongo_rojo') for (let i = 0; i < 12; i++) { const gg = a.r() * PI2, d = R * (0.2 + a.r() * 0.55), z = top[2] + R * 0.05 + R * 0.5 * Math.sqrt(1 - (d / R) ** 2); ps.push(a.esfera(top[0] + Math.cos(gg) * d, top[1] + Math.sin(gg) * d, z, 1.6 + a.r(), { mat: 'arboles_hongo_palido', tono: 0.15 })); }
      hongo(a, ps, 12, 6, 14 + a.r() * 6, 8, mat, 2);
      hongo(a, ps, -9, 10, 9, 5, mat, 1.5);
      return ps;
    },
  },
  {
    id: 'arb_flores', nombre: ['Flores silvestres', 'Wildflower patch'], tema: 'arboles', variantes: ['lila', 'amarilla', 'blanca', 'mezcla', 'sangre', 'negra', 'oscura'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, -0.4, 18, 15, 1.4, { mat: 'tierra', giro: a.r() * 180 })];
      for (let i = 0; i < 6; i++) { const g = a.r() * PI2, d = a.r() * 12; ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 0.8, 4 + a.r() * 3, 3 + a.r() * 2, 2.2, { mat: 'pasto', tono: az(a, 0.06) - 0.05, giro: a.r() * 180 })); }
      const mats = ({
        lila: ['arboles_flor_lila'], amarilla: ['arboles_flor_amarilla'], blanca: ['arboles_flor_blanca'], sangre: ['arboles_flor_sangre'], negra: ['arboles_flor_negra'],
        mezcla: ['arboles_flor_lila', 'arboles_flor_amarilla', 'arboles_flor_blanca'], oscura: ['arboles_flor_sangre', 'arboles_flor_negra', 'arboles_flor_lila', 'arboles_brezo'],
      } as Record<string, string[]>)[v] ?? ['arboles_flor_lila'];
      const n = 22;
      for (let i = 0; i < n; i++) {
        const g = a.r() * PI2, d = Math.sqrt(a.r()) * 14, x = Math.cos(g) * d, y = Math.sin(g) * d, h = 5 + a.r() * 8;
        const top: V = [x + az(a, 1.2), y + az(a, 1.2), h];
        ps.push(a.palo([x, y, 0], top, 0.5, { mat: 'pasto' }));
        if (a.r() < 0.4) ps.push(a.elipsoide(x + az(a, 1.5), y + az(a, 1.5), h * 0.4, 1.8, 0.7, 0.5, { mat: 'pasto', giro: a.r() * 180, incl: 30, inclEje: 'y' }));
        const m = mats[Math.floor(a.r() * mats.length)];
        // flor: corola chata y un botón en el centro (las oscuras cuelgan la cabeza)
        const cae = m === 'arboles_flor_sangre' || m === 'arboles_flor_negra' ? 1 : 0;
        ps.push(a.elipsoide(top[0] + cae * 0.8, top[1], top[2] + 0.4 - cae * 0.8, 2, 2, 0.9, { mat: m, giro: a.r() * 180, incl: cae * 40, inclEje: 'y', tono: az(a, 0.08) }));
        if (a.r() < 0.5) ps.push(a.esfera(top[0] + cae * 0.8, top[1], top[2] + 0.9 - cae * 0.8, 0.7, { mat: 'arboles_flor_amarilla', tono: -0.25 }));
      }
      return ps;
    },
  },
  {
    id: 'arb_juncos', nombre: ['Juncos y espadañas', 'Reeds and cattails'], tema: 'arboles', variantes: ['agua', 'seco'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, -0.4, 20, 16, 1.6, { mat: 'tierra', giro: a.r() * 180 })];
      if (v === 'agua') ps.push(a.elipsoide(2, 1, 0.4, 15, 12, 1.2, { mat: 'agua_sucia', giro: a.r() * 180 }));
      const tallo = v === 'agua' ? 'pasto' : 'paja';
      for (let i = 0; i < 20; i++) {
        const g = a.r() * PI2, d = Math.sqrt(a.r()) * 13, x = Math.cos(g) * d, y = Math.sin(g) * d, h = 26 + a.r() * 20, inc = az(a, 0.15);
        const top: V = [x + inc * h * 0.5, y + az(a, 0.15) * h * 0.5, h];
        if (i % 3 === 0) {
          ps.push(a.palo([x, y, 0], top, 0.7, { mat: 'paja', r1: 0.5 }));
          const c = mas([x, y, 0], mas(top, [x, y, 0], -1), 0.78);
          ps.push(a.cilindro(c[0], c[1], c[2] - 3, 1.5, 6, { mat: 'cuero', eje: mas(top, [x, y, 0], -1), tono: -0.05 }));
        } else ps.push(a.cilindro(x, y, 0, 1.1, h * 0.8, { mat: tallo, r1: 0, eje: [top[0] - x, top[1] - y, h], tono: az(a, 0.08) }));
      }
      for (let i = 0; i < 6; i++) { const g = a.r() * PI2, x = Math.cos(g) * 5, y = Math.sin(g) * 5, m: V = [x + Math.cos(g) * 8, y + Math.sin(g) * 8, 18]; ps.push(a.palo([x, y, 0], m, 1, { mat: tallo, r1: 0.7 }), a.palo(m, [m[0] + Math.cos(g) * 7, m[1] + Math.sin(g) * 7, 11], 0.7, { mat: tallo, r1: 0.2 })); }
      return ps;
    },
  },
);
