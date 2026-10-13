import { createRaster, type Raster } from '../core/raster';
import { AVES, type AveEspecie, type AvePose } from '../rig/ave';

/**
 * Dibuja un ave de lado, mirando a la derecha, en una celda cuadrada. Las partes se pintan de atrás para adelante
 * (la pata y el ala de lejos, la cola, el cuerpo, el ala de cerca, el cuello, la cabeza, la pata de cerca) y al final
 * va el contorno de afuera, del color de contorno de los atletas. El piso es la fila celda - 2, como en los animales.
 */

type Col = string | null;

class Tela {
  readonly c: Col[];
  constructor(readonly w: number, readonly h: number) { this.c = new Array(w * h).fill(null); }
  p(x: number, y: number, c: string) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = c; }
  get(x: number, y: number): Col { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.c[y * this.w + x] : null; }
  /** elipse girada `ang` grados (+ sube el frente); `color(u, v)` recibe la posición adentro, de -1 a 1 */
  elipse(cx: number, cy: number, rx: number, ry: number, ang: number, color: (u: number, v: number) => string | null) {
    const a = (ang * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a), R = Math.ceil(Math.max(rx, ry)) + 1;
    for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      // al sistema de la elipse: x a lo largo, y hacia abajo
      const u = (dx * co - dy * si) / rx, v = (dx * si + dy * co) / ry;
      if (u * u + v * v > 1) continue;
      const c = color(u, v);
      if (c) this.p(x, y, c);
    }
  }
  disco(cx: number, cy: number, r: number, c: string) { this.elipse(cx, cy, r, r, 0, () => c); }
  poligono(pts: [number, number][], c: string | ((x: number, y: number) => string | null)) {
    const ys = pts.map((q) => q[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const yy = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) {
        const cc = typeof c === 'string' ? c : c(x, y);
        if (cc) this.p(x, y, cc);
      }
    }
  }
  /** trazo grueso por una lista de puntos; `color(t)` va de 0 (el primero) a 1 (el último) */
  trazo(pts: [number, number][], ancho: (t: number) => number, color: (t: number, lado: number) => string) {
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay) || 1;
      const steps = Math.ceil(len * 2);
      for (let k = 0; k <= steps; k++) {
        const t = (i + k / steps) / n, x = ax + ((bx - ax) * k) / steps, y = ay + ((by - ay) * k) / steps, r = ancho(t) / 2;
        const nx = -(by - ay) / len, ny = (bx - ax) / len;
        // una raya de 1 px se pinta de un solo pixel de ancho (si no, sale de 2)
        if (r <= 0.65) { this.p(x, y, color(t, 0)); continue; }
        for (let j = -r; j <= r + 0.01; j += 0.5) this.p(x + nx * j, y + ny * j, color(t, r ? j / r : 0));
      }
    }
  }
  /** contorno de afuera: cada pixel vacío que toca uno pintado */
  contorno(c: string) {
    const marca: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) marca.push(y * this.w + x);
    }
    for (const i of marca) this.c[i] = c;
  }
  raster(): Raster {
    const r = createRaster(this.w, this.h);
    this.c.forEach((c, i) => { if (c) r.data.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], i * 4); });
    return r;
  }
}

const rad = (g: number) => (g * Math.PI) / 180;
const bez = (a: [number, number], b: [number, number], c: [number, number], n = 10): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => { const t = i / n, m = 1 - t; return [m * m * a[0] + 2 * m * t * b[0] + t * t * c[0], m * m * a[1] + 2 * m * t * b[1] + t * t * c[1]]; });

/** Las medidas de la especie a esta celda. */
export function escalaAve(e: AveEspecie, celda: number) { return celda / e.celda; }

/** Dónde queda la cadera (el x de las patas) en la pose: el ancla del ave. */
export function caderaAve(especie: string | AveEspecie, p: AvePose, celda?: number): number {
  const E = typeof especie === 'string' ? AVES[especie] : especie, C = celda ?? E.celda, s = C / E.celda, pit = rad(p.pitch);
  const cx = C * E.centro + p.dx * s, ry = E.cuerpo.ry * s;
  return cx + 0.6 * s * Math.cos(pit) + ry * 0.55 * Math.sin(pit);
}

/** Dibuja la especie en la pose, en una celda de `celda` px. */
export function dibujarAve(especie: string | AveEspecie, p: AvePose, celda?: number): Raster {
  const E = typeof especie === 'string' ? AVES[especie] : especie;
  if (!E) throw new Error(`no hay ave "${especie}"`);
  const C = celda ?? E.celda, s = C / E.celda, k = E.colores, T = new Tela(C, C), G = C - 2;
  const L = (v: number) => v * s;
  // el cuerpo: un poco a la derecha del medio, para que quepan la cola atrás y el pico adelante
  const cx = C * E.centro + L(p.dx), cy = G - L(E.tarso) - L(E.cuerpo.ry) * 0.8 - L(p.alto) - L(p.aire);
  const pit = rad(p.pitch);
  const rot = (x: number, y: number): [number, number] => [cx + x * Math.cos(pit) + y * Math.sin(pit), cy - x * Math.sin(pit) + y * Math.cos(pit)];
  const rx = L(E.cuerpo.rx), ry = L(E.cuerpo.ry);

  // las patas: de la cadera al pie, con los dedos adelante y uno atrás
  const cadera = rot(L(0.6), ry * 0.55);
  const pata = (i: 0 | 1) => {
    const q = p.patas[i], lejos = i === 1;
    const col = lejos ? k.pata_oscura : k.pata;
    const pie: [number, number] = p.recogidas ? [cadera[0] - L(1.5) - L(i), cadera[1] + L(E.tarso) * 0.45] : [cadera[0] + L(q.x) + (lejos ? -L(0.4) : 0), G - L(p.aire) - L(q.sube)];
    // el muslo emplumado y el tarso fino
    if (!p.recogidas && C >= 24) T.elipse(cadera[0] + L(q.x) * 0.25 - (lejos ? L(0.4) : 0), cadera[1] + L(0.6), L(1.6), L(2.2), -L(q.x) * 6, () => (lejos ? k.cuerpo_oscuro : k.cuerpo));
    const rodilla: [number, number] = [cadera[0] + L(q.x) * 0.45, cadera[1] + L(2)];
    T.trazo(p.recogidas || C < 24 ? [cadera, pie] : [rodilla, pie], () => (C >= 24 ? 1.3 : 1), () => col);
    if (p.recogidas) return;
    const d = L(E.dedo);
    T.trazo([pie, [pie[0] + d, pie[1]]], () => 1, () => col);
    T.p(pie[0] - Math.max(1, L(0.8)), pie[1], col);
  };
  pata(1);

  // el ala de lejos, abierta: detrás del cuerpo y más oscura
  const alaAbierta = (lejos: boolean) => {
    if (p.ala === 'plegada') return;
    const b = rad(-80 + (p.ala + 1) * 77.5), largo = L(E.ala.abierta);
    const hombro = rot(L(E.cuerpo.rx * 0.2) + (lejos ? L(1) : 0), -ry * 0.45 - (lejos ? L(0.6) : 0));
    const dir: [number, number] = [-Math.cos(b), -Math.sin(b)];
    const punta: [number, number] = [hombro[0] + dir[0] * largo, hombro[1] + dir[1] * largo];
    // el ala abierta es ancha: del hombro a la punta va el borde de ataque, y la cuerda corre hacia atrás por el lomo
    const atras: [number, number] = [hombro[0] - L(E.ala.largo) * 0.75, hombro[1] + L(0.5)];
    const cola2: [number, number] = [punta[0] + (atras[0] - hombro[0]) * 0.5, punta[1] + (atras[1] - hombro[1]) * 0.5];
    const pts: [number, number][] = [[hombro[0] + L(1), hombro[1]], punta, cola2, atras];
    // con el ala arriba se ve la cara de abajo, más clara; con el ala abajo, la de arriba
    const debajo = (p.ala as number) > 0.3, base = debajo ? k.ala_bajo ?? k.cuerpo_claro : k.ala;
    T.poligono(pts, lejos ? k.ala_oscura : (x, y) => {
      // el borde de ataque claro y las puntas de las plumas oscuras
      const fx = x - hombro[0], fy = y - hombro[1], along = fx * dir[0] + fy * dir[1], perp = fx * -dir[1] + fy * dir[0];
      if (along > largo * 0.72) return ((Math.floor(perp / Math.max(1, L(1.3))) & 1) ? k.ala_oscura : base);
      return perp > -L(0.9) && perp < L(0.4) && !debajo ? k.cuerpo_claro : base;
    });
  };
  alaAbierta(true);

  // la cola
  const base = rot(-rx * 0.75, -ry * 0.3);
  const lev = rad(p.cola);
  const giro = (x: number, y: number): [number, number] => [base[0] + x * Math.cos(lev) + y * Math.sin(lev), base[1] - x * Math.sin(lev) + y * Math.cos(lev)];
  if (E.cola.tipo === 'hoz') {
    const Lg = L(E.cola.largo), A = L(E.cola.alto);
    // las plumas cobijas, cortas, en abanico
    T.poligono([giro(L(1), -L(1)), giro(-Lg * 0.4, -A * 0.45), giro(-Lg * 0.5, -A * 0.1), giro(-Lg * 0.25, ry * 0.5), giro(L(1), ry * 0.5)], (x, y) => ((x + 2 * y) % 5 ? k.cola : k.cola_brillo));
    // tres hoces en arco: suben alto, se van atrás y caen
    for (const [f, ancho, sube] of [[1, 2.2, 1], [0.85, 1.8, 0.82], [0.68, 1.5, 0.62]] as [number, number, number][]) {
      const curva = bez(giro(L(0.5), -L(0.5)), giro(-Lg * 0.2 * f, -A * 1.6 * sube), giro(-Lg * f, -A * 0.35 * sube + A * 0.1), 14);
      T.trazo(curva, (t) => L(ancho) * (1 - t * 0.45), (t, lado) => (lado < -0.2 && t > 0.15 && t < 0.85 ? k.cola_brillo : k.cola));
    }
  } else {
    const Lg = L(E.cola.largo), A = L(E.cola.alto);
    T.poligono([giro(L(0.5), -A * 0.45), giro(-Lg, -A * 0.35), giro(-Lg - L(0.4), A * 0.55), giro(L(0.5), ry * 0.55)], (x) => (x < giro(-Lg + L(1.1), 0)[0] ? k.cola_brillo : k.cola));
  }

  // el cuerpo, con la luz arriba a la izquierda y el pecho
  T.elipse(cx, cy, rx, ry, p.pitch, (u, v) => (v < -0.45 && u < 0.4 ? k.cuerpo_claro : v > 0.5 || (u > 0.55 && v > 0.1) ? k.cuerpo_oscuro : k.cuerpo));
  if (p.pecho > 0 || E.esclavina === 'capa') {
    const pc = rot(rx * 0.55, ry * 0.15);
    T.elipse(pc[0], pc[1], ry * 0.75 + L(p.pecho), ry * 0.8 + L(p.pecho) * 0.6, p.pitch, (u, v) => (v > 0.45 ? k.cuerpo_oscuro : u > 0.4 && v > -0.2 ? k.cuerpo_oscuro : k.cuerpo));
  }

  // el ala plegada sobre el cuerpo, con las puntas hacia atrás
  if (p.ala === 'plegada') {
    const ac = rot(-rx * 0.15, -ry * 0.05);
    T.elipse(ac[0], ac[1], L(E.ala.largo) / 2, L(E.ala.alto) / 2, p.pitch - 10, (u, v) => {
      if (E.barras && (Math.abs(u + 0.05) < 0.11 || Math.abs(u + 0.45) < 0.11) && v > -0.5) return k.barra ?? k.ala_oscura;
      return v > 0.35 || u < -0.65 ? k.ala_oscura : v < -0.55 && u > -0.2 ? k.cuerpo_claro : k.ala;
    });
  } else alaAbierta(false);

  // el cuello y la cabeza
  const nb = rot(rx * 0.55, -ry * 0.55);
  const ca = rad(p.cuello), largo = L(E.cuello.largo) * p.estira;
  const cab: [number, number] = [nb[0] + Math.sin(ca) * largo, nb[1] - Math.cos(ca) * largo];
  const rc = L(E.cabeza);
  if (E.esclavina === 'capa') {
    // la capa: plumas largas doradas que caen de la nuca sobre los hombros, con rayas
    const hombro = rot(-rx * 0.15, -ry * 0.75), pecho = rot(rx * 0.85, -ry * 0.05);
    T.poligono([[cab[0] - rc * 0.9, cab[1] - rc * 0.3], [cab[0] + rc * 0.6, cab[1] + rc * 0.5], pecho, [pecho[0] - L(2), pecho[1] + L(1.5)], hombro],
      (x, y) => ((x * 2 + y) % 5 === 0 ? k.cuello_oscuro ?? k.cuello : (x - y) % 7 === 0 ? k.cuello_claro : k.cuello));
  }
  T.trazo([nb, cab], (t) => L(E.cuello.ancho) * (1 - t * 0.35), (t) => (E.esclavina === 'tornasol' ? (t < 0.5 ? k.cuello : k.cuello_oscuro ?? k.cuello) : t > 0.6 ? k.cuello_claro : k.cuello));
  T.disco(cab[0], cab[1], rc, k.cabeza);
  if (E.esclavina === 'tornasol') T.disco(cab[0] - rc * 0.2, cab[1] + rc * 0.5, rc * 0.7, k.cuello_claro);

  // la dirección del pico
  const pa = rad(p.cabeza), dir: [number, number] = [Math.cos(pa), Math.sin(pa)], nor: [number, number] = [-dir[1], dir[0]];
  const en = (a: number, b: number): [number, number] => [cab[0] + dir[0] * a + nor[0] * b, cab[1] + dir[1] * a + nor[1] * b];
  // la cresta: tres puntas rojas sobre la cabeza
  if (E.cresta && k.cresta) {
    for (const [a, h] of [[-0.7, 0.9], [0, 1.25], [0.65, 1]] as [number, number][]) {
      const q = en(rc * a * 0.9, -rc * 0.75);
      T.poligono([[q[0] - L(0.9), q[1] + L(0.6)], [q[0] + nor[0] * 0 + dir[0] * 0, q[1] - L(1.6) * h], [q[0] + L(0.9), q[1] + L(0.6)]], k.cresta);
    }
    const q = en(-rc * 0.1, -rc * 0.6);
    T.p(q[0], q[1], k.cresta_oscura ?? k.cresta);
  }
  // el pico: arriba y abajo, que se abre
  const pb = en(rc * 0.75, 0), pl = L(E.pico.largo), ph = Math.max(1, L(E.pico.alto));
  const abre = rad(p.pico * 30);
  const arriba: [number, number][] = [[pb[0] + nor[0] * -ph * 0.5, pb[1] + nor[1] * -ph * 0.5], [pb[0] + dir[0] * pl, pb[1] + dir[1] * pl], [pb[0], pb[1]]];
  const dAbajo: [number, number] = [Math.cos(pa + abre), Math.sin(pa + abre)];
  const abajo: [number, number][] = [[pb[0], pb[1]], [pb[0] + dAbajo[0] * pl * 0.8, pb[1] + dAbajo[1] * pl * 0.8], [pb[0] - nor[0] * -ph * 0.5, pb[1] - nor[1] * -ph * 0.5]];
  if (s >= 1.5 || E.celda >= 32) { T.poligono(arriba, k.pico); T.poligono(abajo, k.pico_oscuro); if (p.pico > 0.2) T.p(pb[0] + dir[0] * L(1), pb[1] + dir[1] * L(1) + L(0.5), k.contorno); }
  else {
    // a 16 px el pico es una rayita de 2 con la cera blanca encima
    T.trazo([pb, [pb[0] + dir[0] * pl, pb[1] + dir[1] * pl]], () => 1, () => k.pico);
    T.p(pb[0], pb[1] - 1, k.pico_oscuro);
    if (p.pico > 0.2) T.p(pb[0] + dir[0] * pl * 0.7, pb[1] + 1, k.pico);
  }
  // la barbilla roja debajo del pico
  if (E.barbilla && k.cresta) { const q = en(rc * 0.55, rc * 0.95); T.elipse(q[0], q[1] + L(0.4), L(0.9), L(1.4), 0, () => k.cresta!); }
  // el ojo
  const ojo = en(rc * 0.3, -rc * 0.25);
  if (p.ojo === 'abierto') { T.p(ojo[0], ojo[1], k.ojo); if (C >= 32) T.p(ojo[0] - 1, ojo[1] - 1, k.brillo); }
  else T.p(ojo[0], ojo[1], k.cuerpo_oscuro);

  pata(0);
  T.contorno(k.contorno);
  return T.raster();
}
