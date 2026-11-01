import { registrar, type Arma, type Pieza } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido } from '../render';

/**
 * Árboles y plantas del páramo oscuro. Los árboles crecen por ramificación recursiva (cada rama se dobla un poco,
 * se afina y se abre en hijas con la semilla) y la copa se arma con muchos elipsoides agrupados en las puntas, así
 * cada semilla da un árbol distinto. Las plantas chicas (arbustos, helechos, pasto, hongos, flores, juncos) son
 * racimos de piezas con giros y alturas al azar.
 */

// ------------------------------------------------------------------ materiales propios del tema
MATERIALES.arboles_abedul = {
  rampa: ['#24221f', '#45423c', '#6a665d', '#8e897d', '#aea89a', '#c8c2b3', '#dcd7c9'], ruido: 0.2, escala: 0.3,
  patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 1.1) > 0.68 ? -0.55 : 0) + (ruido(p[0] * 0.5 + 7, p[1] * 0.5, p[2] * 0.25) > 0.8 ? -0.3 : 0),
};
MATERIALES.arboles_carbon = {
  rampa: ['#060505', '#0e0c0b', '#171412', '#211d1a', '#2c2723', '#38322d'], ruido: 0.5, escala: 0.35,
  patron: (p) => (ruido(p[0] * 0.45, p[1] * 0.45, p[2] * 0.3) > 0.7 ? -0.25 : 0) + (ruido(p[0] * 0.2, p[1] * 0.2, p[2] * 1.2) > 0.75 ? 0.15 : 0),
};
MATERIALES.arboles_ceniza = { rampa: ['#141312', '#22201e', '#33302d', '#45413d', '#58534e', '#6b655f'], ruido: 0.5, escala: 0.3 };
MATERIALES.arboles_sauce = { rampa: ['#0b0f07', '#151c0d', '#202a14', '#2c381b', '#384622', '#46552a', '#556432'], ruido: 0.65, escala: 0.45 };
MATERIALES.arboles_zarza = { rampa: ['#0f0908', '#1b100d', '#291813', '#382119', '#472b20', '#573628'], ruido: 0.35, escala: 0.5 };
MATERIALES.arboles_flor_lila = { rampa: ['#1a131d', '#2b2030', '#3e2e44', '#513c58', '#634b6b', '#775c7f'], ruido: 0.3, escala: 0.6 };
MATERIALES.arboles_flor_amarilla = { rampa: ['#262010', '#3d3418', '#574b22', '#70612d', '#887739', '#9f8c48'], ruido: 0.3, escala: 0.6 };
MATERIALES.arboles_flor_blanca = { rampa: ['#33312c', '#4f4c44', '#6c685d', '#888376', '#a19b8c', '#b7b1a0'], ruido: 0.3, escala: 0.6 };
MATERIALES.arboles_hongo_rojo = { rampa: ['#1a0c0a', '#2c1410', '#3f1d17', '#52281f', '#653428', '#784232'], ruido: 0.3, escala: 0.35, brillo: 0.15 };
MATERIALES.arboles_hongo_palido = { rampa: ['#29251f', '#403a31', '#585044', '#706757', '#877d69', '#9b917b'], ruido: 0.25, escala: 0.35 };

// ------------------------------------------------------------------ vectores y ramificación
type V = [number, number, number];
const nrm = (v: V): V => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const mas = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const cruz = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const az = (a: Arma, k = 1) => (a.r() - 0.5) * 2 * k;
/** Gira la dirección `d` un ángulo `ang` (radianes) hacia el costado `phi`. */
function desvia(d: V, ang: number, phi: number): V {
  const t: V = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = nrm(cruz(t, d)), w = cruz(d, u), c = Math.cos(ang), s = Math.sin(ang), cp = Math.cos(phi), sp = Math.sin(phi);
  return nrm([d[0] * c + (u[0] * cp + w[0] * sp) * s, d[1] * c + (u[1] * cp + w[1] * sp) * s, d[2] * c + (u[2] * cp + w[2] * sp) * s]);
}

interface Ram {
  mat: string;
  /** Cuántas hijas tiene una rama de este nivel. */
  hijos: (nivel: number) => number;
  /** Ángulo de apertura de las hijas (radianes), cuánto se acortan y cuánto se afina cada rama de punta a punta. */
  abre: number; acorta: number; adelgaza: number;
  /** Cuánto se tuerce cada tramo y cuánto tira hacia arriba (negativo: cuelga). */
  nudos: number; sube: number;
  tramos?: number;
  /** Se llama en cada punta final (para la copa) y en cada horqueta (para hojas sueltas). */
  punta?: (p: V, d: V, r: number) => void;
  horqueta?: (p: V, d: V, r: number, nivel: number) => void;
  /** Ramas que se quiebran (punta rota sin hijas). */
  quiebra?: number;
}
function rama(a: Arma, ps: Pieza[], p0: V, d0: V, L: number, r: number, nivel: number, o: Ram) {
  const n = r < 2.6 ? 1 : o.tramos ?? 2;
  let p = p0, d = d0, rr = r;
  for (let s = 0; s < n; s++) {
    d = nrm([d[0] + az(a, o.nudos * 0.5), d[1] + az(a, o.nudos * 0.5), d[2] + az(a, o.nudos * 0.25) + o.sube]);
    const q = mas(p, d, L / n);
    const r1 = Math.max(0.5, r * (1 - (1 - o.adelgaza) * (s + 1) / n));
    ps.push(a.palo(p, q, rr, { mat: o.mat, r1 }));
    if (s < n - 1 && rr > 2.5) ps.push(a.esfera(q[0], q[1], q[2], r1 * 1.02, { mat: o.mat }));
    p = q; rr = r1;
  }
  if (nivel <= 0 || (o.quiebra && nivel < 3 && a.r() < o.quiebra)) { o.punta?.(p, d, rr); return; }
  o.horqueta?.(p, d, rr, nivel);
  if (rr > 2.5) ps.push(a.esfera(p[0], p[1], p[2], rr * 1.05, { mat: o.mat }));
  const k = o.hijos(nivel), phi0 = a.r() * Math.PI * 2;
  for (let i = 0; i < k; i++) {
    const cd = desvia(d, o.abre * (0.65 + a.r() * 0.7), phi0 + (i * 2 * Math.PI) / k + az(a, 0.5));
    rama(a, ps, p, cd, L * o.acorta * (0.8 + a.r() * 0.4), rr * (k === 1 ? 1 : 0.85), nivel - 1, o);
  }
}

/** Montículo de tierra bajo el árbol con matas de pasto y alguna piedra. */
function suelo(a: Arma, ps: Pieza[], R: number, mat = 'tierra') {
  ps.push(a.elipsoide(0, 0, 0, R, R * (0.85 + a.r() * 0.2), 2.5, { mat, giro: a.r() * 180 }));
  for (let i = 0; i < 3; i++) {
    const g = a.r() * Math.PI * 2, d = R * (0.5 + a.r() * 0.4);
    ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 1, 3 + a.r() * 3, 3 + a.r() * 2, 2 + a.r() * 2, { mat: mat === 'tierra' ? 'pasto' : mat, tono: -0.05 }));
  }
  if (a.r() < 0.6) { const g = a.r() * Math.PI * 2; ps.push(a.elipsoide(Math.cos(g) * R * 0.8, Math.sin(g) * R * 0.8, 0.5, 2.5, 2, 1.8, { mat: 'roca' })); }
}
/** Raíces que salen del pie del tronco y se hunden en la tierra. */
function raices(a: Arma, ps: Pieza[], r: number, n: number, mat: string, base: V = [0, 0, 0]) {
  const g0 = a.r() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const g = g0 + (i / n) * Math.PI * 2 + az(a, 0.3), largo = r * (1.8 + a.r() * 1.2);
    const p0: V = [base[0] + Math.cos(g) * r * 0.3, base[1] + Math.sin(g) * r * 0.3, base[2] + r * (1 + a.r() * 0.6)];
    const mid: V = [base[0] + Math.cos(g) * largo * 0.6, base[1] + Math.sin(g) * largo * 0.6, base[2] + r * 0.35];
    const fin: V = [base[0] + Math.cos(g + az(a, 0.3)) * largo, base[1] + Math.sin(g + az(a, 0.3)) * largo, base[2] - 1];
    ps.push(a.palo(p0, mid, r * 0.5, { mat, r1: r * 0.3 }), a.palo(mid, fin, r * 0.3, { mat, r1: r * 0.1 }));
  }
}
/**
 * Copa de hojas: dos o tres elipsoides con ruido en cada punta y un relleno oscuro en el centro para que la masa
 * se lea entera. `R` es el radio de cada mata.
 */
interface Envol { c: V; E: V }
function copa(a: Arma, ps: Pieza[], puntas: V[], mat: string, R: number, mezcla?: string, opc: { aplana?: number; abajo?: number } = {}): Envol {
  const c: V = [0, 0, 0];
  for (const p of puntas) { c[0] += p[0] / puntas.length; c[1] += p[1] / puntas.length; c[2] += p[2] / puntas.length; }
  let ex = 0, ey = 0, ez = 0;
  for (const p of puntas) { ex = Math.max(ex, Math.abs(p[0] - c[0])); ey = Math.max(ey, Math.abs(p[1] - c[1])); ez = Math.max(ez, Math.abs(p[2] - c[2])); }
  const E: V = [ex * 0.85 + R * 0.55, ey * 0.85 + R * 0.55, (ez * 0.85 + R * 0.5) * (opc.aplana ?? 1)];
  c[2] += R * 0.25;
  const env = { c, E };
  if (!puntas.length) return env;
  // el núcleo oscuro: la sombra de adentro de la copa
  ps.push(a.elipsoide(c[0], c[1], c[2], E[0] * 0.82, E[1] * 0.82, E[2] * 0.8, { mat, tono: -0.1 }));
  // matas sobre la superficie de la envolvente (más arriba que abajo): el contorno en racimos
  const M = Math.min(26, 9 + Math.round(((E[0] + E[1]) / R) * 2.2));
  const g0 = a.r() * 6.28, ab = opc.abajo ?? -0.45;
  for (let j = 0; j < M; j++) {
    const m = mezcla && a.r() < 0.25 ? mezcla : mat;
    const u = (j + 0.5) / M, z = ab + (1 - ab) * Math.sqrt(u) * 0.97, g = g0 + j * 2.399 + az(a, 0.3), rxy = Math.sqrt(1 - z * z);
    const k = 0.5 + a.r() * 0.35;
    ps.push(a.elipsoide(c[0] + Math.cos(g) * rxy * E[0], c[1] + Math.sin(g) * rxy * E[1], c[2] + z * E[2], R * k, R * k * (0.85 + a.r() * 0.3), R * k * 0.78, { mat: m, giro: a.r() * 180, tono: az(a, 0.06) + z * 0.04 }));
  }
  // y una mata en cada punta que se sale de la envolvente
  for (const p of puntas) {
    const q = [(p[0] - c[0]) / E[0], (p[1] - c[1]) / E[1], (p[2] - c[2]) / E[2]];
    if (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] < 0.7 || q[2] < -0.8) continue;
    const m = mezcla && a.r() < 0.25 ? mezcla : mat, k = 0.55 + a.r() * 0.3;
    ps.push(a.elipsoide(p[0], p[1], p[2], R * k, R * k, R * k * 0.75, { mat: m, tono: az(a, 0.06) }));
  }
  return env;
}

// ------------------------------------------------------------------ piezas sueltas reutilizables
function hongo(a: Arma, ps: Pieza[], x: number, y: number, alto: number, R: number, mat: string, incl = 0) {
  const g = a.r() * Math.PI * 2, tx = Math.cos(g) * incl, ty = Math.sin(g) * incl;
  const top: V = [x + tx, y + ty, alto];
  const rt = R > 12 ? 0.34 : 0.28;
  ps.push(a.palo([x, y, 0], [x + tx * 0.5, y + ty * 0.5, alto * 0.5], R * rt, { mat: 'arboles_hongo_palido', r1: R * rt * 0.8 }));
  ps.push(a.palo([x + tx * 0.5, y + ty * 0.5, alto * 0.5], top, R * rt * 0.8, { mat: 'arboles_hongo_palido', r1: R * rt * 0.7 }));
  ps.push(a.elipsoide(top[0], top[1], top[2] - R * 0.05, R * 0.92, R * 0.92, R * 0.2, { mat: 'arboles_hongo_palido', tono: -0.2 }));
  ps.push(a.elipsoide(top[0], top[1], top[2] + R * 0.05, R, R, R * 0.5, { mat }));
  if (mat === 'arboles_hongo_rojo' && R > 3) {
    for (let i = 0; i < Math.round(R / 1.5); i++) {
      const gg = a.r() * Math.PI * 2, d = R * (0.2 + a.r() * 0.55), z = top[2] + R * 0.05 + R * 0.5 * Math.sqrt(1 - (d / R) ** 2);
      ps.push(a.esfera(top[0] + Math.cos(gg) * d, top[1] + Math.sin(gg) * d, z, Math.max(1, R * 0.12), { mat: 'arboles_hongo_palido', tono: 0.15 }));
    }
  }
}
function mataPasto(a: Arma, ps: Pieza[], x: number, y: number, n: number, alto: number, mat: string) {
  for (let i = 0; i < n; i++) {
    const g = a.r() * Math.PI * 2, inc = 0.15 + a.r() * 0.45, h = alto * (0.6 + a.r() * 0.5);
    const d: V = [Math.cos(g) * inc, Math.sin(g) * inc, 1];
    ps.push(a.cilindro(x + az(a, 2), y + az(a, 2), 0, 1.1 + a.r() * 0.4, h, { mat, r1: 0, eje: d, tono: az(a, 0.1) }));
  }
}

// ------------------------------------------------------------------ árboles
registrar(
  {
    id: 'arb_roble', nombre: ['Roble viejo', 'Old oak'], tema: 'arboles', variantes: ['verde', 'otono', 'seco'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], e = 0.9 + a.r() * 0.25, puntas: V[] = [];
      suelo(a, ps, 22 * e);
      raices(a, ps, 7.5 * e, 5, 'corteza');
      const seco = v === 'seco';
      rama(a, ps, [0, 0, 0], nrm([az(a, 0.15), az(a, 0.15), 1]), 38 * e, 8 * e, seco ? 4 : 3, {
        mat: 'corteza', hijos: (n) => (n >= 3 && !seco ? 3 : 2 + (a.r() < 0.15 ? 1 : 0)), abre: 0.85, acorta: seco ? 0.68 : 0.76, adelgaza: 0.62,
        nudos: 0.55, sube: 0.1, tramos: 2, punta: (p) => puntas.push(p),
      });
      if (!seco) copa(a, ps, puntas, v === 'verde' ? 'hojas' : 'hojas_otono', 13 * e, v === 'otono' ? 'arboles_flor_amarilla' : 'pasto');
      else for (const p of puntas.slice(0, 6)) if (a.r() < 0.5) ps.push(a.elipsoide(p[0], p[1], p[2], 3, 3, 2.5, { mat: 'hojas_otono', tono: -0.1 }));
      // hojas caídas al pie en otoño
      if (v === 'otono') for (let i = 0; i < 5; i++) { const g = a.r() * 6.28, d = 8 + a.r() * 14; ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 0.5, 4, 3, 1, { mat: 'hojas_otono', giro: a.r() * 180 })); }
      return ps;
    },
  },
  ...(['alto', 'bajo'] as const).map((tipo) => ({
    id: tipo === 'alto' ? 'arb_pino_alto' : 'arb_pino_bajo',
    nombre: (tipo === 'alto' ? ['Pino alto', 'Tall pine'] : ['Pino bajo', 'Short pine']) as [string, string],
    tema: 'arboles' as const, variantes: ['normal', 'nevado'], huella: [1, 1] as [number, number], bloquea: true,
    armar: (v: string, _f: number, a: Arma) => {
      const ps: Pieza[] = [], nieve = v === 'nevado';
      const H = (tipo === 'alto' ? 160 : 96) * (0.9 + a.r() * 0.2), Rm = (tipo === 'alto' ? 30 : 27) * (0.9 + a.r() * 0.2);
      const lx = az(a, 3), ly = az(a, 3);
      suelo(a, ps, Rm * 0.6, nieve ? 'nieve' : 'tierra');
      raices(a, ps, 4.5, 4, 'corteza');
      ps.push(a.palo([0, 0, 0], [lx, ly, H], tipo === 'alto' ? 5.5 : 5, { mat: 'corteza', r1: 0.8 }));
      const n = tipo === 'alto' ? 10 : 6, z0 = H * (tipo === 'alto' ? 0.2 : 0.16);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), z = z0 + (H - z0 - 14) * Math.pow(t, 0.92), R = Rm * (1 - t * 0.8) * (0.9 + a.r() * 0.2) + 3, h = R * 0.85 + 6;
        const cx = lx * (z / H), cy = ly * (z / H), tn = az(a, 0.05) + t * 0.04;
        ps.push(a.cilindro(cx, cy, z, R, h, { mat: 'pino', r1: R * 0.12, tono: tn }));
        // ramas que cuelgan del borde del piso: cuñas que rompen el cono
        const k = Math.max(5, Math.round(R / 3.5)), g0 = a.r() * 6.28;
        for (let j = 0; j < k; j++) {
          const g = g0 + (j / k) * 6.28 + az(a, 0.25), L = R * (1.05 + a.r() * 0.25), w = R * (0.22 + a.r() * 0.1);
          const dx = Math.cos(g), dy = Math.sin(g), px = -dy, py = dx, zb = z - 2 - a.r() * 3;
          ps.push(a.poliedro([
            [cx + dx * R * 0.3, cy + dy * R * 0.3, z + h * 0.55],
            [cx + dx * L + px * w, cy + dy * L + py * w, zb], [cx + dx * L - px * w, cy + dy * L - py * w, zb],
            [cx + dx * R * 0.55, cy + dy * R * 0.55, z - 0.5], [cx + dx * L, cy + dy * L, zb + 2.5],
          ], { mat: 'pino', tono: tn + az(a, 0.06) }));
          if (nieve && a.r() < 0.55) ps.push(a.elipsoide(cx + dx * L * 0.82, cy + dy * L * 0.82, zb + 2.5 + (L * 0.18) * 0.6, w * 0.7, w * 0.7, 1.3, { mat: 'nieve', giro: (g * 180) / Math.PI }));
        }
        if (nieve) {
          const w0 = 0.3, Rs = R * (1 - 0.88 * w0) + 0.7;
          ps.push(a.cilindro(cx, cy, z + h * w0, Rs, h * (1 - w0), { mat: 'nieve', r1: R * 0.12 + 0.6, tono: 0.05 }));
        }
      }
      if (nieve) ps.push(a.cilindro(lx, ly, H - 2, 2.5, 6, { mat: 'nieve', r1: 0.3 }));
      return ps;
    },
  })),
  {
    id: 'arb_abedul', nombre: ['Abedul', 'Birch'], tema: 'arboles', variantes: ['verde', 'dorado', 'desnudo'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], puntas: V[] = [];
      suelo(a, ps, 14);
      const n = 1 + Math.floor(a.r() * 2.6);
      for (let i = 0; i < n; i++) {
        const g = a.r() * 6.28, b: V = n > 1 ? [Math.cos(g) * 3, Math.sin(g) * 3, 0] : [0, 0, 0];
        const d = nrm([b[0] * 0.05 + az(a, 0.12), b[1] * 0.05 + az(a, 0.12), 1]);
        rama(a, ps, b, d, (34 + a.r() * 10) * (i ? 0.85 : 1), i ? 3.2 : 4, 3, {
          mat: 'arboles_abedul', hijos: () => 2, abre: 0.45, acorta: 0.78, adelgaza: 0.55, nudos: 0.25, sube: 0.08, tramos: 2,
          punta: (p) => puntas.push(p), horqueta: (p, _d, _r, nv) => { if (nv < 3) puntas.push(p); },
        });
      }
      if (v !== 'desnudo') copa(a, ps, puntas, v === 'verde' ? 'arboles_sauce' : 'hojas_otono', 7.5, v === 'verde' ? 'hojas' : 'arboles_flor_amarilla', { aplana: 1.25, abajo: -0.7 });
      if (v === 'dorado') for (let i = 0; i < 6; i++) { const g = a.r() * 6.28, d = 5 + a.r() * 12; ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 0.4, 3, 2.5, 0.8, { mat: 'arboles_flor_amarilla', giro: a.r() * 180 })); }
      return ps;
    },
  },
  {
    id: 'arb_sauce', nombre: ['Sauce llorón', 'Weeping willow'], tema: 'arboles', variantes: ['verde', 'mustio'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], puntas: V[] = [], e = 0.9 + a.r() * 0.2;
      const mat = v === 'verde' ? 'arboles_sauce' : 'hojas_otono';
      suelo(a, ps, 24 * e);
      raices(a, ps, 9 * e, 6, 'corteza');
      ps.push(a.palo([0, 0, 0], [az(a, 3), az(a, 3), 34 * e], 9 * e, { mat: 'corteza', r1: 7 * e }));
      const top: V = [0, 0, 34 * e];
      ps.push(a.esfera(top[0], top[1], top[2], 7 * e, { mat: 'corteza' }));
      const k = 5, g0 = a.r() * 6.28;
      for (let i = 0; i < k; i++) {
        const g = g0 + (i / k) * 6.28 + az(a, 0.3);
        rama(a, ps, top, nrm([Math.cos(g) * 0.7, Math.sin(g) * 0.7, 1]), 30 * e, 4.5 * e, 1, {
          mat: 'corteza', hijos: () => 2, abre: 0.7, acorta: 0.85, adelgaza: 0.6, nudos: 0.3, sube: -0.18, tramos: 2, punta: (p) => puntas.push(p),
        });
      }
      // copa abombada y cortinas finas que caen casi hasta el piso desde el borde de la copa
      const { c, E } = copa(a, ps, puntas, mat, 11 * e, v === 'verde' ? 'hojas' : 'arboles_sauce', { abajo: -0.2 });
      const N = 44;
      for (let j = 0; j < N; j++) {
        const g = j * 2.399 + az(a, 0.2), z = -0.55 + a.r() * 0.45, rxy = Math.sqrt(1 - z * z) * (0.95 + a.r() * 0.12);
        const x = c[0] + Math.cos(g) * rxy * E[0], y = c[1] + Math.sin(g) * rxy * E[1], z1 = c[2] + z * E[2] + 3;
        const z0 = Math.max(3, z1 - 22 - a.r() * 34);
        ps.push(a.cilindro(x, y, z0, 0.6, z1 - z0, { mat, r1: 1.9 + a.r() * 1.1, tono: az(a, 0.1) - 0.06 }));
      }
      return ps;
    },
  },
  {
    id: 'arb_arbol_seco', nombre: ['Árbol seco', 'Gnarled dead tree'], tema: 'arboles', variantes: ['alto', 'torcido', 'partido', 'ahorcado'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 16);
      raices(a, ps, 6, 5, 'corteza_muerta');
      const o: Ram = { mat: 'corteza_muerta', hijos: () => 2 + (a.r() < 0.3 ? 1 : 0), abre: 0.7, acorta: 0.7, adelgaza: 0.6, nudos: 0.6, sube: 0.12, tramos: 2, quiebra: 0.2 };
      if (v === 'alto') rama(a, ps, [0, 0, 0], nrm([az(a, 0.1), az(a, 0.1), 1]), 52, 6.5, 4, o);
      else if (v === 'torcido') {
        const g = a.r() * 6.28;
        rama(a, ps, [0, 0, 0], nrm([Math.cos(g) * 0.55, Math.sin(g) * 0.55, 1]), 50, 6.5, 4, { ...o, nudos: 1.1, tramos: 3, sube: 0.02, abre: 0.9 });
      } else if (v === 'partido') {
        // el tronco se rajó: un muñón astillado en pie y la mitad tumbada en el piso
        ps.push(a.cilindro(0, 0, 0, 7, 40, { mat: 'corteza_muerta', r1: 5.5 }));
        for (let i = 0; i < 6; i++) {
          const g = (i / 6) * 6.28 + az(a, 0.3), h = 4 + a.r() * 14;
          ps.push(a.poliedro([[Math.cos(g) * 5.5, Math.sin(g) * 5.5, 39], [Math.cos(g + 0.9) * 5.5, Math.sin(g + 0.9) * 5.5, 39], [Math.cos(g) * 2, Math.sin(g) * 2, 39], [Math.cos(g + 0.45) * 4.2, Math.sin(g + 0.45) * 4.2, 39 + h]], { mat: i % 2 ? 'madera_vieja' : 'corteza_muerta' }));
        }
        rama(a, ps, [0, 0, 26], nrm([-0.6, 0.5, 0.9]), 34, 3.6, 2, o);
        const g = a.r() * 0.6 + 0.2;
        const p0: V = [Math.cos(g) * 10, Math.sin(g) * 10, 5], p1: V = [Math.cos(g) * 58, Math.sin(g) * 58, 4];
        ps.push(a.palo(p0, p1, 5.5, { mat: 'corteza_muerta', r1: 3.5 }));
        rama(a, ps, mas(p0, mas(p1, p0, -1), 0.6), nrm([-Math.sin(g), Math.cos(g), 0.8]), 24, 2.4, 2, o);
        rama(a, ps, p1, nrm([Math.cos(g), Math.sin(g), 0.3]), 18, 2.2, 1, o);
      } else {
        rama(a, ps, [0, 0, 0], nrm([az(a, 0.08), az(a, 0.08), 1]), 50, 6.5, 3, { ...o, abre: 0.6 });
        // rama baja y horizontal con la soga
        const r0: V = [0, 0, 40], r1: V = [30, -10, 47];
        ps.push(a.palo(r0, r1, 3.6, { mat: 'corteza_muerta', r1: 1.6 }), a.palo(r1, [38, -16, 52], 1.6, { mat: 'corteza_muerta', r1: 0.8 }));
        const sx = 22, sy = -7.3, zs = 43.5, zl = 20;
        ps.push(a.cilindro(sx, sy, zs - 1.5, 2.3, 3, { mat: 'cuerda' }));
        ps.push(a.palo([sx, sy, zs], [sx, sy, zl + 7], 0.9, { mat: 'cuerda' }));
        ps.push(a.cilindro(sx, sy, zl + 5, 1.6, 4, { mat: 'cuerda' }));
        const u: V = [Math.SQRT1_2, -Math.SQRT1_2, 0], R = 4.5, cz = zl + 1, N = 8;
        for (let i = 0; i < N; i++) {
          const t0 = (i / N) * 6.28, t1 = ((i + 1) / N) * 6.28;
          const q0: V = [sx + u[0] * Math.sin(t0) * R, sy + u[1] * Math.sin(t0) * R, cz + Math.cos(t0) * R * 1.2];
          const q1: V = [sx + u[0] * Math.sin(t1) * R, sy + u[1] * Math.sin(t1) * R, cz + Math.cos(t1) * R * 1.2];
          ps.push(a.palo(q0, q1, 0.9, { mat: 'cuerda' }));
        }
      }
      return ps;
    },
  },
  {
    id: 'arb_arbol_quemado', nombre: ['Árbol quemado', 'Burnt tree'], tema: 'arboles', variantes: ['carbon', 'brasas', 'muñon'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], brasas: V[] = [];
      suelo(a, ps, 20, 'arboles_ceniza');
      raices(a, ps, 6.5, 5, 'arboles_carbon');
      const o: Ram = {
        mat: 'arboles_carbon', hijos: () => 2, abre: 0.75, acorta: 0.62, adelgaza: 0.55, nudos: 0.5, sube: 0.18, tramos: 2, quiebra: 0.45,
        horqueta: (p) => { if (a.r() < 0.5) brasas.push(p); },
      };
      if (v === 'muñon') {
        ps.push(a.cilindro(0, 0, 0, 8, 26, { mat: 'arboles_carbon', r1: 6.5 }));
        for (let i = 0; i < 5; i++) {
          const g = (i / 5) * 6.28 + az(a, 0.3), h = 5 + a.r() * 12;
          ps.push(a.poliedro([[Math.cos(g) * 6.5, Math.sin(g) * 6.5, 25], [Math.cos(g + 1.1) * 6.5, Math.sin(g + 1.1) * 6.5, 25], [0, 0, 25], [Math.cos(g + 0.55) * 4.5, Math.sin(g + 0.55) * 4.5, 25 + h]], { mat: 'arboles_carbon' }));
        }
        rama(a, ps, [0, 0, 18], nrm([0.8, -0.3, 0.7]), 20, 2.5, 1, o);
        brasas.push([5, 5, 10], [6.5, 0, 19]);
      } else rama(a, ps, [0, 0, 0], nrm([az(a, 0.12), az(a, 0.12), 1]), 48, 7, 3, o);
      if (v !== 'carbon') {
        // grietas con brasas en la corteza
        for (let i = 0; i < 5; i++) { const z = 4 + a.r() * 30, g = 0.1 + a.r() * 1.4, rr = 7 - z * 0.05; brasas.push([Math.cos(g) * rr * 0.9, Math.sin(g) * rr * 0.9, z]); }
        for (const b of brasas) ps.push(a.elipsoide(b[0], b[1], b[2], 1.6, 1.6, 3.5, { mat: 'lava', tono: -0.2 + a.r() * 0.2 }));
        for (let i = 0; i < 4; i++) { const g = a.r() * 6.28, d = 6 + a.r() * 10; ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 1, 1.6, 1.4, 1, { mat: 'fuego', tono: -0.3 })); }
        return { piezas: ps, resplandor: { c: [0, 0, 12], r: 30, color: '#d0441c' } };
      }
      return ps;
    },
  },
  {
    id: 'arb_arbol_ancestral', nombre: ['Árbol ancestral', 'Ancient giant tree'], tema: 'arboles', variantes: ['verde', 'muerto', 'hueco'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], puntas: V[] = [];
      suelo(a, ps, 44);
      raices(a, ps, 17, 7, 'corteza');
      // tronco de varios troncos fundidos y retorcidos
      const n = 4, top: V = [az(a, 4), az(a, 4), 58];
      for (let i = 0; i < n; i++) {
        const g = (i / n) * 6.28 + a.r() * 0.5, b: V = [Math.cos(g) * 8, Math.sin(g) * 8, 0];
        const m: V = [Math.cos(g + 0.7) * 9 + top[0] * 0.5, Math.sin(g + 0.7) * 9 + top[1] * 0.5, 30];
        ps.push(a.palo(b, m, 12, { mat: 'corteza', r1: 9.5 }), a.esfera(m[0], m[1], m[2], 9.5, { mat: 'corteza' }));
        ps.push(a.palo(m, [top[0] + Math.cos(g + 1.4) * 4, top[1] + Math.sin(g + 1.4) * 4, top[2]], 9.5, { mat: 'corteza', r1: 8 }));
      }
      if (v === 'hueco') {
        ps.push(a.elipsoide(13, 13, 15, 10, 10, 17, { mat: 'corteza', resta: true }));
        ps.push(a.elipsoide(6, 6, 15, 9, 9, 15, { mat: 'negro' }));
        ps.push(a.elipsoide(11, 11, 1, 6, 6, 1.5, { mat: 'tierra', tono: -0.15 }));
      }
      const muerto = v === 'muerto', nvAbre = 0.8;
      const o: Ram = {
        mat: muerto ? 'corteza_muerta' : 'corteza', hijos: () => 2, abre: nvAbre, acorta: 0.66, adelgaza: 0.6,
        nudos: 0.5, sube: 0.16, tramos: 2, punta: (p) => { if (p[2] > 70) puntas.push(p); }, quiebra: muerto ? 0.25 : 0,
      };
      if (muerto) {
        // reteñir el tronco gris
        for (const p of ps) if (p.mat === 'corteza') p.mat = 'corteza_muerta';
      }
      ps.push(a.esfera(top[0], top[1], top[2], 11, { mat: o.mat }));
      const g0 = a.r() * 6.28;
      for (let i = 0; i < 5; i++) {
        const g = g0 + (i / 5) * 6.28 + az(a, 0.3), sube = 0.55 + a.r() * 0.5;
        rama(a, ps, top, nrm([Math.cos(g), Math.sin(g), sube]), 40 + a.r() * 12, 8, 2, o);
      }
      rama(a, ps, top, [0, 0, 1], 34, 9, 2, o);
      if (!muerto) copa(a, ps, puntas, 'hojas', 20, 'musgo', { abajo: -0.15 });
      else for (let i = 0; i < 3; i++) { const g = a.r() * 6.28; ps.push(a.elipsoide(Math.cos(g) * 30, Math.sin(g) * 30, 1, 5, 4, 1.2, { mat: 'hojas_otono', tono: -0.15 })); }
      // musgo en el pie
      for (let i = 0; i < 4; i++) { const g = a.r() * 6.28; ps.push(a.elipsoide(Math.cos(g) * 12, Math.sin(g) * 12, 4 + a.r() * 10, 5, 5, 4, { mat: 'musgo', tono: -0.05 })); }
      return ps;
    },
  },
  {
    id: 'arb_arbol_jaula', nombre: ['Árbol de la jaula', 'Gibbet tree'], tema: 'arboles', variantes: ['vacia', 'abierta', 'con_huesos'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 18);
      raices(a, ps, 6.5, 5, 'corteza_muerta');
      rama(a, ps, [0, 0, 0], nrm([-0.15, -0.1, 1]), 56, 7, 3, { mat: 'corteza_muerta', hijos: () => 2, abre: 0.7, acorta: 0.62, adelgaza: 0.6, nudos: 0.45, sube: 0.1, quiebra: 0.25 });
      // la rama gruesa de donde cuelga
      const r0: V = [0, 0, 62], r1: V = [26, -16, 76], r2: V = [38, -24, 74];
      ps.push(a.palo([0, 0, 48], r0, 5, { mat: 'corteza_muerta', r1: 4.6 }), a.palo(r0, r1, 4.2, { mat: 'corteza_muerta', r1: 2.6 }), a.palo(r1, r2, 2.6, { mat: 'corteza_muerta', r1: 1.2 }));
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
        const g = (i / N) * 6.28;
        if (abierta && (i === 0 || i === 1)) continue;
        ps.push(a.palo([cx + Math.cos(g) * Rj, cy + Math.sin(g) * Rj, z0], [cx + Math.cos(g) * Rj, cy + Math.sin(g) * Rj, zj], 0.8, { mat: 'hierro' }));
        ps.push(a.palo([cx + Math.cos(g) * Rj, cy + Math.sin(g) * Rj, zj], [cx, cy, zj + 5], 0.75, { mat: 'hierro' }));
      }
      if (abierta) {
        // la puerta colgando de una bisagra, abierta hacia afuera
        const hx = cx + Math.cos(-0.35) * Rj, hy = cy + Math.sin(-0.35) * Rj;
        for (let k = 0; k < 3; k++) { const d = 3 + k * 3.2; ps.push(a.palo([hx + d * 0.55, hy + d * 0.83, z0 + 1], [hx + d * 0.55, hy + d * 0.83, zj - 2], 0.8, { mat: 'hierro' })); }
        ps.push(a.palo([hx, hy, z0 + 3], [hx + 10 * 0.55, hy + 10 * 0.83, z0 + 3], 0.9, { mat: 'hierro_oxido' }), a.palo([hx, hy, zj - 3], [hx + 10 * 0.55, hy + 10 * 0.83, zj - 3], 0.9, { mat: 'hierro_oxido' }));
      }
      if (v === 'con_huesos') {
        ps.push(a.esfera(cx + 2, cy + 2, z0 + 4.8, 2.8, { mat: 'hueso' }), a.caja(cx + 2.5, cy + 3.5, z0 + 2.5, 3, 2, 2, { mat: 'hueso', giro: 30 }));
        ps.push(a.palo([cx - 4, cy - 2, z0 + 3], [cx + 5, cy - 3, z0 + 3.5], 0.9, { mat: 'hueso' }), a.palo([cx - 5, cy + 3, z0 + 3], [cx + 1, cy - 5, z0 + 3], 0.9, { mat: 'hueso' }));
        ps.push(a.palo([cx + 3, cy + 6, zj - 6], [cx + 4, cy + 7.5, z0 + 2], 0.9, { mat: 'hueso' }));
      }
      // hojas secas al pie
      for (let i = 0; i < 3; i++) ps.push(a.elipsoide(cx + az(a, 10), cy + az(a, 10), 0.4, 3, 2, 0.8, { mat: 'hojas_otono', tono: -0.15, giro: a.r() * 180 }));
      return ps;
    },
  },
);

// ------------------------------------------------------------------ troncos y tocones
registrar(
  {
    id: 'arb_tocon', nombre: ['Tocón', 'Tree stump'], tema: 'arboles', variantes: ['fresco', 'podrido', 'con_hacha'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], R = 8 + a.r() * 3, h = 10 + a.r() * 5;
      suelo(a, ps, R * 1.8);
      raices(a, ps, R * 0.55, 5, v === 'podrido' ? 'corteza_muerta' : 'corteza');
      const mat = v === 'podrido' ? 'corteza_muerta' : 'corteza';
      ps.push(a.cilindro(0, 0, 0, R + 1.5, h, { mat, r1: R }));
      if (v === 'podrido') {
        ps.push(a.cilindro(0, 0, h - 4, R - 2.5, 6, { mat: 'madera_vieja', resta: true }));
        ps.push(a.cilindro(0, 0, h - 4, R - 2.5, 1, { mat: 'tierra' }));
        for (let i = 0; i < 6; i++) { const g = (i / 6) * 6.28 + az(a, 0.3); ps.push(a.poliedro([[Math.cos(g) * R, Math.sin(g) * R, h], [Math.cos(g + 0.8) * R, Math.sin(g + 0.8) * R, h], [Math.cos(g + 0.4) * (R - 2), Math.sin(g + 0.4) * (R - 2), h], [Math.cos(g + 0.4) * (R - 0.8), Math.sin(g + 0.4) * (R - 0.8), h + 2 + a.r() * 5]], { mat: 'corteza_muerta' })); }
        ps.push(a.elipsoide(R * 0.6, -R * 0.4, h * 0.6, 5, 5, 4, { mat: 'musgo' }));
        for (let i = 0; i < 4; i++) { const g = 0.2 + a.r() * 1.3; const x = Math.cos(g) * (R + 1), y = Math.sin(g) * (R + 1), z = 2 + a.r() * (h - 5); ps.push(a.elipsoide(x, y, z, 3.2, 3.2, 1.2, { mat: 'hongo', tono: 0.1 })); }
      } else {
        ps.push(a.cilindro(0, 0, h, R - 0.7, 0.6, { mat: 'madera_lisa', tono: 0.12 }));
        ps.push(a.cilindro(0, 0, h + 0.3, R * 0.55, 0.5, { mat: 'madera_lisa', tono: -0.05 }), a.cilindro(0, 0, h + 0.5, R * 0.2, 0.5, { mat: 'madera_lisa', tono: -0.12 }));
        ps.push(a.caja(R * 0.3, -R * 0.3, h + 0.4, R * 0.9, 0.8, 0.5, { mat: 'negro', giro: 40 + a.r() * 40 }));
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
      const ps: Pieza[] = [], L = tipo === 'tronco_caido' ? 64 + a.r() * 12 : 52 + a.r() * 10, R = tipo === 'tronco_caido' ? 7 + a.r() * 1.5 : 8.5 + a.r() * 1.5;
      const ex: V = v === 'y' ? [0, 1, 0] : [1, 0, 0], ey: V = v === 'y' ? [1, 0, 0] : [0, 1, 0];
      const P = (u: number, w: number, z: number): V => [ex[0] * u + ey[0] * w, ex[1] * u + ey[1] * w, z];
      const mat = a.r() < 0.5 ? 'corteza' : 'corteza_muerta';
      const p0 = P(-L / 2, 0, R - 0.5);
      ps.push(a.elipsoide(0, 0, 0, L * 0.55 * (ex[0] || 0.3), L * 0.55 * (ex[1] || 0.3), 1.5, { mat: 'tierra' }));
      ps.push(a.cilindro(p0[0], p0[1], p0[2], R, L, { mat, r1: R * 0.85, eje: ex }));
      if (tipo === 'tronco_hueco') {
        ps.push(a.cilindro(p0[0] - ex[0] * 2, p0[1] - ex[1] * 2, p0[2], R * 0.68, L + 4, { mat, r1: R * 0.6, eje: ex, resta: true }));
        const q = P(-L / 2 + 1, 0, R - 0.5 - R * 0.62);
        ps.push(a.cilindro(q[0], q[1], q[2], 1, L - 2, { mat: 'tierra', eje: ex }));
        ps.push(a.cilindro(p0[0] + ex[0] * 6, p0[1] + ex[1] * 6, p0[2], R * 0.6, 1, { mat: 'negro', eje: ex }));
        ps.push(a.cilindro(p0[0] + ex[0] * (L - 6), p0[1] + ex[1] * (L - 6), p0[2], R * 0.55, 1, { mat: 'negro', eje: ex }));
        for (let i = 0; i < 3; i++) { const u = -L / 2 + 6 + a.r() * (L - 12), q2 = P(u, R * 0.7, R + R * 0.55); ps.push(a.elipsoide(q2[0], q2[1], q2[2] - 1, 3, 3, 1.1, { mat: 'hongo', tono: 0.15 })); }
      } else {
        // cara cortada al frente y la raíz arrancada atrás
        const pe = P(L / 2, 0, R - 0.5);
        ps.push(a.cilindro(pe[0], pe[1], pe[2] - 0.2, R * 0.85, 0.6, { mat: 'madera_lisa', eje: ex, tono: 0.1 }));
        const pr = P(-L / 2 + 1, 0, R);
        ps.push(a.elipsoide(pr[0], pr[1], pr[2], 2.5, 2.5, 2.5, { mat: 'tierra' }));
        for (let i = 0; i < 7; i++) {
          const g = (i / 7) * 6.28 + az(a, 0.3), s = R * (1.6 + a.r() * 0.8);
          ps.push(a.palo(pr, mas(pr, [ey[0] * Math.cos(g) * s - ex[0] * 3, ey[1] * Math.cos(g) * s - ex[1] * 3, Math.sin(g) * s]), 2, { mat: 'corteza_muerta', r1: 0.6 }));
        }
        ps.push(a.elipsoide(pr[0], pr[1], pr[2], 2, R * 1.3, R * 1.3, { mat: 'tierra', giro: v === 'y' ? 90 : 0 }));
        for (let i = 0; i < 2; i++) { const u = -L / 4 + a.r() * L * 0.6, s = i ? 1 : -1, q = P(u, s * R * 0.6, R + R * 0.5); ps.push(a.palo(q, mas(q, [ey[0] * s * 8 + ex[0] * 3, ey[1] * s * 8 + ex[1] * 3, 8]), 1.5, { mat, r1: 0.6 })); }
      }
      if (v === 'x_musgo') for (let i = 0; i < 5; i++) { const u = -L / 2 + a.r() * L, q = P(u, az(a, R * 0.3), R * 1.75); ps.push(a.elipsoide(q[0], q[1], q[2] - 1.5, 6 + a.r() * 4, 4, 2.2, { mat: 'musgo', giro: a.r() * 30 })); }
      return ps;
    },
  })),
);

// ------------------------------------------------------------------ plantas chicas
registrar(
  {
    id: 'arb_arbusto', nombre: ['Arbusto', 'Bush'], tema: 'arboles', variantes: ['chico', 'mediano', 'grande', 'seco'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const t = v === 'chico' ? 0 : v === 'mediano' ? 1 : 2, seco = v === 'seco';
      const R = [5.5, 7.5, 9.5][seco ? 1 : t], W = [7, 12, 18][seco ? 1 : t], H = [10, 17, 26][seco ? 1 : t];
      ps.push(a.elipsoide(0, 0, 0, W + 2, W * 0.85 + 2, 1.6, { mat: 'tierra' }));
      // ramitas que salen del centro
      for (let i = 0; i < (seco ? 9 : 4 + t * 2); i++) {
        const g = a.r() * 6.28, d = W * (0.5 + a.r() * 0.5), q: V = [Math.cos(g) * d, Math.sin(g) * d, H * (0.6 + a.r() * 0.5)];
        ps.push(a.palo([az(a, 1.5), az(a, 1.5), 0], q, 1.1, { mat: seco ? 'corteza_muerta' : 'corteza', r1: 0.5 }));
        if (seco) for (let k = 0; k < 2; k++) ps.push(a.palo(mas(q, q, -0.4), mas(q, [az(a, 5), az(a, 5), 3 + a.r() * 4]), 0.7, { mat: 'corteza_muerta', r1: 0.3 }));
      }
      if (seco) return ps;
      const mat = a.r() < 0.3 ? 'hojas_selva' : 'hojas';
      ps.push(a.elipsoide(0, 0, H * 0.45, W * 0.75, W * 0.65, H * 0.45, { mat, tono: -0.12 }));
      const n = [5, 9, 14][t];
      for (let i = 0; i < n; i++) {
        const g = i * 2.399 + a.r(), z = -0.2 + 1.2 * Math.sqrt((i + 0.5) / n) * 0.95, rxy = Math.sqrt(1 - Math.min(1, z * z));
        const k = 0.65 + a.r() * 0.4;
        ps.push(a.elipsoide(Math.cos(g) * rxy * W * 0.8, Math.sin(g) * rxy * W * 0.7, H * 0.45 + z * H * 0.45, R * k, R * k, R * k * 0.8, { mat: a.r() < 0.2 ? 'pasto' : mat, tono: az(a, 0.07) }));
      }
      // bayas oscuras
      if (a.r() < 0.5) for (let i = 0; i < 4; i++) { const g = a.r() * 6.28; ps.push(a.esfera(Math.cos(g) * W * 0.75, Math.sin(g) * W * 0.65, H * (0.3 + a.r() * 0.5), 1.2, { mat: 'tela_roja', tono: -0.1 })); }
      return ps;
    },
  },
  {
    id: 'arb_zarza', nombre: ['Zarzal espinoso', 'Thorny bramble'], tema: 'arboles', variantes: ['seca', 'verde', 'con_moras'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.elipsoide(0, 0, 0, 20, 16, 1.6, { mat: 'tierra', giro: a.r() * 180 }));
      const mat = v === 'seca' ? 'corteza_muerta' : 'arboles_zarza';
      // la maraña de adentro
      ps.push(a.elipsoide(0, 0, 4, 13, 11, 9, { mat, tono: -0.25 }));
      const n = 15;
      for (let i = 0; i < n; i++) {
        // un tallo que sube en arco y vuelve a bajar
        const g = a.r() * 6.28, b: V = [az(a, 6), az(a, 6), 0], L = 14 + a.r() * 10, H = 14 + a.r() * 12, seg = 4;
        let p = b;
        for (let k = 1; k <= seg; k++) {
          const t = k / seg, q: V = [b[0] + Math.cos(g) * L * t + az(a, 1.5), b[1] + Math.sin(g) * L * t + az(a, 1.5), Math.sin(t * Math.PI * 0.8) * H + 0.5];
          ps.push(a.palo(p, q, 1.1, { mat, r1: 0.9 }));
          // espinas
          if (k % 2 === 0) ps.push(a.palo(q, mas(q, [az(a, 3), az(a, 3), 2.5]), 0.8, { mat: 'hueso', r1: 0.1, tono: -0.3 }));
          if (v !== 'seca' && a.r() < 0.6) ps.push(a.elipsoide(q[0], q[1], q[2] + 1, 2.6, 2.2, 1.6, { mat: 'hojas', giro: a.r() * 180, tono: az(a, 0.08) }));
          if (v === 'con_moras' && a.r() < 0.5) ps.push(a.esfera(q[0] + az(a, 1.5), q[1] + az(a, 1.5), q[2] - 1.2, 1.2, { mat: 'tela_morada', tono: -0.15 }));
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
      ps.push(a.elipsoide(matas.length > 1 ? 3 : 0, 0, 0, matas.length > 1 ? 20 : 10, matas.length > 1 ? 16 : 9, 1.4, { mat: 'tierra' }));
      for (const m of matas) {
        const n = 8 + Math.floor(a.r() * 4), g0 = a.r() * 6.28, s = m === matas[0] ? 1 : 0.75;
        for (let i = 0; i < n; i++) {
          // fronda: tres hojas planas que se arquean hacia afuera y abajo
          const g = g0 + (i / n) * 6.28 + az(a, 0.2), L = (14 + a.r() * 6) * s, gd = (g * 180) / Math.PI;
          const sube = 0.9 + a.r() * 0.5;
          for (let k = 0; k < 3; k++) {
            const t = (k + 0.5) / 3, x = m[0] + Math.cos(g) * L * t, y = m[1] + Math.sin(g) * L * t;
            const z = 1 + Math.sin(t * Math.PI * 0.9) * L * 0.6 * sube * (1 - t * 0.4);
            const incl = k === 0 ? -35 : k === 1 ? 0 : 30;
            ps.push(a.elipsoide(x, y, z, L / 5.5, (3.4 - k * 0.7) * s, 0.7, { mat, giro: gd, incl, inclEje: 'y', tono: az(a, 0.06) + k * 0.03 }));
          }
        }
        ps.push(a.elipsoide(m[0], m[1], 1.5, 3 * s, 3 * s, 3 * s, { mat: v === 'seco' ? 'hojas_otono' : 'musgo', tono: -0.1 }));
      }
      return ps;
    },
  },
  {
    id: 'arb_pasto_alto', nombre: ['Mata de pasto alto', 'Tall grass tuft'], tema: 'arboles', variantes: ['verde', 'seco', 'espigado'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 9, 8, 1.4, { mat: 'tierra' })];
      const mat = v === 'verde' ? 'pasto' : 'paja';
      mataPasto(a, ps, 0, 0, 16, 20, mat);
      mataPasto(a, ps, 5, -3, 7, 13, mat);
      if (v === 'espigado') for (let i = 0; i < 6; i++) {
        const g = a.r() * 6.28, inc = 0.1 + a.r() * 0.3, h = 24 + a.r() * 8;
        const top: V = [Math.cos(g) * inc * h, Math.sin(g) * inc * h, h];
        ps.push(a.palo([az(a, 2), az(a, 2), 0], top, 0.6, { mat: 'paja', r1: 0.4 }), a.elipsoide(top[0], top[1], top[2], 1.4, 1.4, 3.5, { mat: 'paja', tono: 0.1 }));
      }
      return ps;
    },
  },
  {
    id: 'arb_hongos', nombre: ['Corro de hongos', 'Mushroom cluster'], tema: 'arboles', variantes: ['pardos', 'rojos', 'palidos'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 11, 9, 1.6, { mat: 'tierra' }), a.elipsoide(az(a, 3), az(a, 3), 0.6, 7, 6, 1.6, { mat: 'musgo' })];
      const mat = v === 'pardos' ? 'hongo' : v === 'rojos' ? 'arboles_hongo_rojo' : 'arboles_hongo_palido';
      const n = 5 + Math.floor(a.r() * 4);
      for (let i = 0; i < n; i++) {
        const g = a.r() * 6.28, d = a.r() * 8, big = i === 0 ? 1.4 : 0.6 + a.r() * 0.6;
        hongo(a, ps, Math.cos(g) * d, Math.sin(g) * d, 6 * big + 1, 4.4 * big, mat, a.r() * 1.5);
      }
      return ps;
    },
  },
  {
    id: 'arb_hongo_gigante', nombre: ['Hongo gigante', 'Giant mushroom'], tema: 'arboles', variantes: ['pardo', 'rojo', 'palido'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 20, 17, 2, { mat: 'tierra' }), a.elipsoide(3, -2, 0.8, 12, 10, 2, { mat: 'musgo' })];
      const mat = v === 'pardo' ? 'hongo' : v === 'rojo' ? 'arboles_hongo_rojo' : 'arboles_hongo_palido';
      ps.push(a.cilindro(0, 0, 0, 7, 4, { mat: 'arboles_hongo_palido', r1: 5, tono: -0.1 }));
      hongo(a, ps, 0, 0, 44 + a.r() * 12, 20 + a.r() * 4, mat, 4 + a.r() * 4);
      hongo(a, ps, 12, 6, 14 + a.r() * 6, 8, mat, 2);
      hongo(a, ps, -9, 10, 9, 5, mat, 1.5);
      return ps;
    },
  },
  {
    id: 'arb_flores', nombre: ['Flores silvestres', 'Wildflower patch'], tema: 'arboles', variantes: ['lila', 'amarilla', 'blanca', 'mezcla'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 18, 15, 1.4, { mat: 'tierra', giro: a.r() * 180 })];
      for (let i = 0; i < 6; i++) { const g = a.r() * 6.28, d = a.r() * 12; ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 0.8, 4 + a.r() * 3, 3 + a.r() * 2, 2.2, { mat: 'pasto', tono: az(a, 0.06) })); }
      const mats = { lila: ['arboles_flor_lila'], amarilla: ['arboles_flor_amarilla'], blanca: ['arboles_flor_blanca'], mezcla: ['arboles_flor_lila', 'arboles_flor_amarilla', 'arboles_flor_blanca'] }[v as 'lila']!;
      const n = 22;
      for (let i = 0; i < n; i++) {
        const g = a.r() * 6.28, d = Math.sqrt(a.r()) * 14, x = Math.cos(g) * d, y = Math.sin(g) * d, h = 5 + a.r() * 7;
        ps.push(a.palo([x, y, 0], [x + az(a, 1), y + az(a, 1), h], 0.5, { mat: 'pasto' }));
        ps.push(a.elipsoide(x, y, h + 0.6, 1.8, 1.8, 1.2, { mat: mats[Math.floor(a.r() * mats.length)], tono: az(a, 0.08) }));
      }
      return ps;
    },
  },
  {
    id: 'arb_juncos', nombre: ['Juncos y espadañas', 'Reeds and cattails'], tema: 'arboles', variantes: ['agua', 'seco'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 20, 16, 1.6, { mat: 'tierra', giro: a.r() * 180 })];
      if (v === 'agua') ps.push(a.elipsoide(2, 1, 0.6, 15, 12, 1.2, { mat: 'agua_sucia', giro: a.r() * 180 }));
      const tallo = v === 'agua' ? 'pasto' : 'paja';
      for (let i = 0; i < 20; i++) {
        const g = a.r() * 6.28, d = Math.sqrt(a.r()) * 13, x = Math.cos(g) * d, y = Math.sin(g) * d, h = 26 + a.r() * 20, inc = az(a, 0.15);
        const top: V = [x + inc * h * 0.5, y + az(a, 0.15) * h * 0.5, h];
        if (i % 3 === 0) {
          ps.push(a.palo([x, y, 0], top, 0.7, { mat: 'paja', r1: 0.5 }));
          const c = mas([x, y, 0], mas(top, [x, y, 0], -1), 0.78);
          ps.push(a.cilindro(c[0], c[1], c[2] - 3, 1.5, 6, { mat: 'cuero', eje: mas(top, [x, y, 0], -1), tono: -0.05 }));
        } else ps.push(a.cilindro(x, y, 0, 1.1, h * 0.8, { mat: tallo, r1: 0, eje: [top[0] - x, top[1] - y, h], tono: az(a, 0.08) }));
      }
      // hojas largas y dobladas
      for (let i = 0; i < 6; i++) { const g = a.r() * 6.28, x = Math.cos(g) * 5, y = Math.sin(g) * 5, m: V = [x + Math.cos(g) * 8, y + Math.sin(g) * 8, 18]; ps.push(a.palo([x, y, 0], m, 1, { mat: tallo, r1: 0.7 }), a.palo(m, [m[0] + Math.cos(g) * 7, m[1] + Math.sin(g) * 7, 11], 0.7, { mat: tallo, r1: 0.2 })); }
      return ps;
    },
  },
);
