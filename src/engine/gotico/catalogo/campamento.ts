import { registrar, type Arma, type Pieza, type V3 } from '../objeto';

// El campamento: empalizada, portón y torre, carpas y pabellón, fogata y asador, carretas, cajas, sacos y heno,
// estandartes, muñeco de práctica, armero, fuente, herrería, baúl, leña, puente y bote.

type OC = Parameters<Arma['caja']>[6];
type OCi = Parameters<Arma['cilindro']>[5];
type OE = Parameters<Arma['elipsoide']>[6];
type OP = Parameters<Arma['palo']>[3];
/** Las piezas de `a` giradas `g` grados y corridas a (ox, oy, oz): para armar algo en su marco y girarlo entero. */
function girado(a: Arma, g: number, ox = 0, oy = 0, oz = 0) {
  const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180);
  const P = (p: V3): V3 => [ox + p[0] * c - p[1] * s, oy + p[0] * s + p[1] * c, oz + p[2]];
  const D = (v: V3): V3 => [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  const elipsoide = (x: number, y: number, z: number, rx: number, ry: number, rz: number, o: OE) => { const q = P([x, y, z]); return a.elipsoide(q[0], q[1], q[2], rx, ry, rz, { ...o, giro: (o.giro ?? 0) + g }); };
  return {
    caja: (x: number, y: number, z: number, an: number, pr: number, al: number, o: OC) => { const q = P([x, y, z]); return a.caja(q[0], q[1], q[2], an, pr, al, { ...o, giro: (o.giro ?? 0) + g }); },
    cilindro: (x: number, y: number, z: number, r0: number, h: number, o: OCi) => { const q = P([x, y, z]); return a.cilindro(q[0], q[1], q[2], r0, h, { ...o, giro: (o.giro ?? 0) + g, eje: o.eje && D(o.eje) }); },
    elipsoide,
    esfera: (x: number, y: number, z: number, r: number, o: OE) => elipsoide(x, y, z, r, r, r, o),
    palo: (p: V3, q: V3, r: number, o: OP) => a.palo(P(p), P(q), r, o),
    poliedro: (pts: V3[], o: { mat: string; tono?: number; resta?: boolean }) => a.poliedro(pts.map(P), o),
  };
}
type G = ReturnType<typeof girado>;
function suelo(a: Arma, ps: Pieza[], rx: number, ry: number, n = 3, mat = 'tierra') {
  ps.push(a.elipsoide(0, 0, 0, rx, ry, 1.6, { mat, giro: (a.r() - 0.5) * 30 }));
  for (let i = 0; i < n; i++) {
    const ang = a.r() * Math.PI * 2, d = 0.75 + a.r() * 0.3;
    ps.push(a.elipsoide(Math.cos(ang) * rx * d, Math.sin(ang) * ry * d, 0.4, 1.4 + a.r() * 1.6, 1.2 + a.r() * 1.2, 1 + a.r(), { mat: 'piedra', giro: a.r() * 180, tono: (a.r() - 0.5) * 0.2 }));
  }
}
/** Lenguas de fuego que cambian con el cuadro alrededor de (x,y,z). */
function llamas(a: Arma, ps: Pieza[], f: number, n: number, x: number, y: number, z: number, rad: number, alto: number, grosor: number) {
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + f * 0.7, d = k === 0 ? 0 : rad;
    const h = alto * (0.65 + 0.35 * Math.sin((f / 6) * Math.PI * 2 + k * 2.3)) * (k === 0 ? 1.25 : 1);
    ps.push(a.cilindro(x + Math.cos(ang) * d, y + Math.sin(ang) * d, z, grosor * (k === 0 ? 1.3 : 1), h, { mat: 'fuego', r1: 0.3, tono: k === 0 ? 0.1 : -0.05 }));
  }
  ps.push(a.elipsoide(x, y, z + 1, rad + grosor, rad + grosor, grosor * 0.7, { mat: 'fuego', tono: 0.15 }));
}
/** Un tronco parado con punta (empalizada). */
function estaca(A: G | Arma, ps: Pieza[], x: number, y: number, r: number, h: number, rota = false) {
  ps.push(A.cilindro(x, y, -2, r, h, { mat: 'corteza', r1: r * 0.92 }));
  if (rota) ps.push(A.poliedro([[x - r, y, h - 2], [x + r * 0.7, y - r * 0.7, h - 2], [x + r * 0.7, y + r * 0.7, h - 2], [x - r * 0.3, y, h + 4]], { mat: 'madera', tono: 0.05 }));
  else ps.push(A.cilindro(x, y, h - 2, r * 0.92, 8, { mat: 'madera', r1: 0.4, tono: 0.04 }));
}
/** Caja de madera con marco y riostra en las caras que se ven. */
function cajon(A: G, ps: Pieza[], x: number, y: number, z: number, l: number, g = 0, tono = 0) {
  const o = { mat: 'madera_vieja', giro: g, tono };
  ps.push(A.caja(x, y, z, l, l, l, o));
  ps.push(A.caja(x, y, z, l + 0.6, l + 0.6, 1.8, { ...o, mat: 'madera', tono: tono - 0.05 }), A.caja(x, y, z + l - 1.8, l + 0.6, l + 0.6, 1.8, { ...o, mat: 'madera', tono: tono - 0.05 }));
  const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180), h = l / 2;
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1]]) ps.push(A.caja(x + (sx * c - sy * s) * h, y + (sx * s + sy * c) * h, z, 2, 2, l, { ...o, mat: 'madera', tono: tono - 0.05 }));
  // riostras en diagonal (+x y +y)
  ps.push(A.caja(x + c * (h + 0.1), y + s * (h + 0.1), z + l / 2 - 1, 1, l * 1.25, 1.8, { ...o, mat: 'madera', incl: 45, tono: tono - 0.02 }));
  ps.push(A.caja(x - s * (h + 0.1), y + c * (h + 0.1), z + l / 2 - 1, l * 1.25, 1, 1.8, { ...o, mat: 'madera', incl: -45, inclEje: 'y', tono: tono + 0.02 }));
}
/** Rueda de carro en el plano xz (eje a lo largo de y). */
function rueda(A: G, ps: Pieza[], x: number, y: number, z: number, r: number, acostada = false) {
  const eje: V3 = acostada ? [0, 0, 1] : [0, 1, 0];
  const y0 = acostada ? y : y - 1.2, z0 = acostada ? z - 1.2 : z;
  ps.push(A.cilindro(x, y0, z0, r, 2.4, { mat: 'madera', eje }));
  ps.push(A.cilindro(x, acostada ? y : y - 1.4, acostada ? z - 1.4 : z, r - 2.2, 2.8, { mat: 'madera', eje, resta: true }));
  ps.push(A.cilindro(x, acostada ? y : y - 1.3, acostada ? z - 1.3 : z, r + 0.2, 0.7, { mat: 'hierro', eje }));
  ps.push(A.cilindro(x, acostada ? y : y - 1.8, acostada ? z - 1.8 : z, 2, 3.6, { mat: 'madera_vieja', eje }));
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.3;
    const p: V3 = acostada ? [x + Math.cos(ang) * (r - 1.5), y + Math.sin(ang) * (r - 1.5), z] : [x + Math.cos(ang) * (r - 1.5), y, z + Math.sin(ang) * (r - 1.5)];
    ps.push(A.palo([x, y, z], p, 0.75, { mat: 'madera' }));
  }
}
function saco(A: G, ps: Pieza[], x: number, y: number, z: number, g: number, s = 1, mat = 'tela', acostado = true) {
  if (acostado) {
    ps.push(A.elipsoide(x, y, z + 4 * s, 8 * s, 5.2 * s, 4.4 * s, { mat, giro: g }));
    const c = Math.cos((g * Math.PI) / 180), si = Math.sin((g * Math.PI) / 180);
    ps.push(A.cilindro(x + c * 7.5 * s, y + si * 7.5 * s, z + 4 * s, 2.2 * s, 3 * s, { mat, eje: [c, si, 0], r1: 1.5 * s }));
    ps.push(A.cilindro(x + c * 8 * s, y + si * 8 * s, z + 4 * s, 1.9 * s, 1, { mat: 'cuerda', eje: [c, si, 0] }));
  } else {
    ps.push(A.elipsoide(x, y, z + 6 * s, 6.5 * s, 5.5 * s, 6.5 * s, { mat, giro: g }), A.cilindro(x, y, z + 11 * s, 2.6 * s, 2.5 * s, { mat, r1: 1.8 * s }));
    ps.push(A.cilindro(x, y, z + 11.8 * s, 2.3 * s, 1, { mat: 'cuerda' }), A.elipsoide(x, y, z + 14 * s, 2.8 * s, 2.4 * s, 1.6 * s, { mat, incl: 20, giro: g }));
  }
}

// ------------------------------------------------------------------ empalizada, portón, torre, cerca
registrar(
  {
    id: 'camp_empalizada', nombre: ['Empalizada', 'Palisade wall'], tema: 'campamento', variantes: ['x', 'y', 'rota_x', 'rota_y'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const A = girado(a, v.endsWith('y') ? 90 : 0);
      const rota = v.startsWith('rota');
      ps.push(A.elipsoide(0, 0, 0, 46, 11, 4, { mat: 'tierra' }));
      // vigas por detrás (-y)
      for (const z of [18, 50]) ps.push(A.palo([-40, -5.5, z], [40, -5.5, z + (a.r() - 0.5) * 3], 2, { mat: 'madera_vieja' }));
      const hueco = rota ? 1 + Math.floor(a.r() * 6) : -9;
      for (let i = 0; i < 10; i++) {
        const x = -36 + i * 8 + (a.r() - 0.5) * 0.8, r = 4 + a.r() * 0.5;
        let h = 72 + a.r() * 14;
        if (rota && (i === hueco || i === hueco + 1)) {
          if (i === hueco) { ps.push(A.palo([x, 7, 4], [x + 18, 52, 3], 3.8, { mat: 'corteza', r1: 3.5 })); ps.push(A.cilindro(x, 0, -2, r, 10 + a.r() * 6, { mat: 'corteza' }), A.cilindro(x, 0, 8, r * 0.95, 2.5, { mat: 'madera_lisa', tono: 0.1 })); }
          else { h = 26 + a.r() * 10; estaca(A, ps, x, (a.r() - 0.5) * 1.5, r, h, true); }
          continue;
        }
        if (rota && a.r() < 0.3) h -= 18;
        estaca(A, ps, x, (a.r() - 0.5) * 1.5, r, h, rota && h < 70);
      }
      // amarras
      if (!rota) for (const z of [22, 56]) ps.push(A.caja(0, 0, z, 80, 9.2, 1.2, { mat: 'cuerda', tono: -0.25 }));
      return ps;
    },
  },
  {
    id: 'camp_porton', nombre: ['Portón de la empalizada', 'Palisade gate'], tema: 'campamento', variantes: ['cerrado', 'abierto', 'cerrado_y', 'abierto_y'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const A = girado(a, v.endsWith('_y') ? 90 : 0);
      ps.push(A.elipsoide(0, 0, 0, 46, 12, 4, { mat: 'tierra' }), A.caja(0, 0, 0, 30, 18, 1, { mat: 'tierra', tono: -0.08 }));
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) estaca(A, ps, s * (24 + i * 7.5), (a.r() - 0.5) * 1.5, 4 + a.r() * 0.4, 70 + a.r() * 12);
        ps.push(A.cilindro(s * 17, 0, -2, 5.5, 98, { mat: 'corteza' }), A.cilindro(s * 17, 0, 96, 5.6, 2, { mat: 'madera_lisa', tono: 0.1 }));
        ps.push(A.palo([s * 21, -5, 18], [s * 40, -5, 18], 2, { mat: 'madera_vieja' }), A.palo([s * 21, -5, 52], [s * 40, -5, 52], 2, { mat: 'madera_vieja' }));
      }
      ps.push(A.caja(0, 0, 82, 48, 8, 6, { mat: 'madera' }), A.caja(0, 0, 88, 40, 6, 4, { mat: 'madera_vieja' }));
      // calaveras de adorno en el dintel
      for (const x of [-7, 7]) { ps.push(A.esfera(x, 4.5, 84, 2.6, { mat: 'hueso' }), A.esfera(x + 0.9, 6.6, 84.4, 0.8, { mat: 'negro' }), A.esfera(x - 0.9, 6.6, 84.4, 0.8, { mat: 'negro' })); }
      const abierto = v.startsWith('abierto');
      for (const s of [-1, 1]) {
        // la hoja gira en su bisagra (junto al poste) hacia adentro (-y)
        const gg = abierto ? s * 75 : 0, cc = Math.cos((gg * Math.PI) / 180), ss = Math.sin((gg * Math.PI) / 180);
        const ox = abierto ? s * 11.5 - s * 5.75 * Math.cos((75 * Math.PI) / 180) : s * 5.75, py = abierto ? -5.75 * Math.sin((75 * Math.PI) / 180) : 0;
        ps.push(A.caja(ox, py, 2, 11.5, 3.5, 66, { mat: 'madera', giro: gg }));
        for (const z of [10, 38, 60]) ps.push(A.caja(ox, py, z, 12, 4.4, 2.4, { mat: 'hierro_oxido', giro: gg }));
        ps.push(A.caja(ox, py, 16, 1.8, 4.2, 34, { mat: 'madera_vieja', giro: gg, incl: s * 18, inclEje: 'y' }));
        for (let k = 0; k < 2; k++) {
          const u = (k - 0.5) * 5.75;
          ps.push(A.poliedro([[ox + cc * (u - 2.8), py + ss * (u - 2.8), 68], [ox + cc * (u + 2.8), py + ss * (u + 2.8), 68], [ox + cc * u - ss * 1.7, py + ss * u + cc * 1.7, 68], [ox + cc * u + ss * 1.7, py + ss * u - cc * 1.7, 68], [ox + cc * u, py + ss * u, 74]], { mat: 'madera', tono: 0.05 }));
        }
      }
      return ps;
    },
  },
);

registrar(
  {
    id: 'camp_torre', nombre: ['Torre de vigía', 'Watchtower'], tema: 'campamento', variantes: ['entera', 'rota'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const rota = v === 'rota';
      suelo(a, ps, 32, 32, 5);
      const zp = 66;
      // cuatro patas algo inclinadas hacia adentro y riostras en X en las caras que se ven
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ps.push(a.palo([sx * 19, sy * 19, 0], [sx * 16, sy * 16, zp + 2], 3, { mat: 'corteza', r1: 2.6 }));
      for (const s of [-1, 1]) {
        ps.push(a.palo([18.5, s * 18.5, 4], [16.8, -s * 16.8, zp - 6], 1.5, { mat: 'madera_vieja' }), a.palo([s * 18.5, 18.5, 4], [-s * 16.8, 16.8, zp - 6], 1.5, { mat: 'madera_vieja' }));
      }
      for (const z of [8, 36]) ps.push(a.palo([18, -18, z], [18, 18, z], 1.4, { mat: 'madera' }), a.palo([-18, 18, z], [18, 18, z], 1.4, { mat: 'madera' }));
      // escalera de mano al frente (+y)
      for (const s of [-1, 1]) ps.push(a.palo([s * 5, 30, 0], [s * 5, 18.5, zp + 4], 1, { mat: 'madera_vieja' }));
      for (let i = 1; i < 10; i++) { const t = i / 10; ps.push(a.palo([-5, 30 - t * 11.5, t * (zp + 4)], [5, 30 - t * 11.5, t * (zp + 4)], 0.75, { mat: 'madera_vieja' })); }
      // plataforma y parapeto de estacas
      ps.push(a.caja(0, 0, zp, 46, 46, 4, { mat: 'madera' }), a.caja(0, 0, zp - 3, 40, 40, 3, { mat: 'madera_vieja', tono: -0.1 }));
      for (let lado = 0; lado < 4; lado++) {
        for (let i = 0; i < 7; i++) {
          if (rota && lado === 3 && i > 2 && i < 6) continue;
          const u = -19.5 + i * 6.5, h = 14 + a.r() * 4;
          const [x, y] = lado === 0 ? [u, -21] : lado === 1 ? [21, u] : lado === 2 ? [-21, u] : [u, 21];
          if (lado === 3 && Math.abs(x) < 6) continue;
          ps.push(a.cilindro(x, y, zp + 3, 3, h, { mat: 'corteza', r1: 2.8 }), a.cilindro(x, y, zp + 3 + h, 2.8, 5, { mat: 'madera', r1: 0.3, tono: 0.04 }));
        }
      }
      if (rota) {
        ps.push(a.palo([12, 34, 1.5], [-4, 42, 2], 3, { mat: 'corteza' }), a.palo([20, 28, 1.2], [26, 40, 1.4], 2.6, { mat: 'corteza' }));
        ps.push(a.palo([16, -16, zp + 4], [9, -12, zp + 22], 1.5, { mat: 'madera_vieja' }));
        return ps;
      }
      // techo de cuatro aguas sobre cuatro postes
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ps.push(a.palo([sx * 19, sy * 19, zp + 4], [sx * 19, sy * 19, zp + 34], 1.6, { mat: 'madera' }));
      ps.push(a.poliedro([[-27, -27, zp + 32], [27, -27, zp + 32], [27, 27, zp + 32], [-27, 27, zp + 32], [0, 0, zp + 58]], { mat: 'paja', tono: -0.32 }));
      ps.push(a.poliedro([[-27.5, -27.5, zp + 30], [27.5, -27.5, zp + 30], [27.5, 27.5, zp + 30], [-27.5, 27.5, zp + 30], [-22, -22, zp + 35], [22, -22, zp + 35], [22, 22, zp + 35], [-22, 22, zp + 35]], { mat: 'paja', tono: -0.4 }));
      ps.push(a.palo([0, 0, zp + 56], [0, 0, zp + 66], 0.9, { mat: 'madera' }), a.caja(0.5, -0.5, zp + 60, 7, 0.8, 5, { mat: 'tela_roja', giro: -45 }));
      return ps;
    },
  },
  {
    id: 'camp_cerca', nombre: ['Cerca de madera', 'Wooden fence'], tema: 'campamento', variantes: ['x', 'y', 'rota_x', 'rota_y'], huella: [3, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const A = girado(a, v.endsWith('y') ? 90 : 0);
      const rota = v.startsWith('rota');
      ps.push(A.elipsoide(0, 0, 0, 27, 6, 1.4, { mat: 'tierra' }));
      const xs = [-22, -7.5, 7.5, 22];
      xs.forEach((x, i) => {
        const inc = rota && i === 2 ? 14 : (a.r() - 0.5) * 6;
        ps.push(A.caja(x, 0, 0, 3, 3, 22 + a.r() * 3, { mat: 'madera_vieja', incl: inc, inclEje: 'y', giro: (a.r() - 0.5) * 10 }));
      });
      for (const z of [8, 16]) {
        if (rota && z === 16) { ps.push(A.palo([-22, 1, 16], [-5, 1.8, 15.5], 1.2, { mat: 'madera' }), A.palo([2, 5, 0.8], [20, 8, 4], 1.2, { mat: 'madera' })); continue; }
        ps.push(A.palo([-24, 1.8, z + (a.r() - 0.5) * 1.5], [24, 1.8, z + (a.r() - 0.5) * 1.5], 1.2, { mat: 'madera' }));
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ carpas y pabellón
registrar(
  {
    id: 'camp_carpa', nombre: ['Carpa', 'Tent'], tema: 'campamento', variantes: ['cerrada', 'abierta', 'remendada'], huella: [2, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 28, 22, 3);
      const A = girado(a, 90 + (a.r() - 0.5) * 10);
      const L = 19, W = 15, H = 28, m = v === 'remendada' ? 'tela' : 'tela_verde';
      ps.push(A.poliedro([[-L, -W, 0], [L, -W, 0], [-L, W, 0], [L, W, 0], [-L, 0, H], [L, 0, H]], { mat: m }));
      // costuras y la cumbrera
      for (const x of [-9, 0, 9]) ps.push(A.poliedro([[x - 0.5, -W - 0.3, 0], [x + 0.5, -W - 0.3, 0], [x - 0.5, W + 0.3, 0], [x + 0.5, W + 0.3, 0], [x - 0.5, 0, H + 0.3], [x + 0.5, 0, H + 0.3]], { mat: m, tono: -0.12 }));
      ps.push(A.palo([-L - 3, 0, H], [L + 3, 0, H], 1, { mat: 'madera' }));
      for (const s of [-1, 1]) ps.push(A.palo([s * (L + 1), 0, 0], [s * (L + 1), 0, H + 2], 1, { mat: 'madera' }));
      if (v === 'remendada') {
        ps.push(A.poliedro([[-6, -(W * 0.5 - 0.2), H * 0.45], [2, -(W * 0.5 - 0.2), H * 0.45], [-6, -(W * 0.25), H * 0.75], [2, -(W * 0.25), H * 0.75], [-6, -(W * 0.5 + 0.8), H * 0.5], [2, -(W * 0.25 + 1), H * 0.78]], { mat: 'tela_roja', tono: -0.1 }));
        ps.push(A.poliedro([[8, -(W * 0.75 - 0.2), H * 0.2], [13, -(W * 0.75 - 0.2), H * 0.2], [8, -(W * 0.55), H * 0.42], [13, -(W * 0.55), H * 0.42], [8, -(W * 0.75 + 0.8), H * 0.25], [13, -(W * 0.55 + 1), H * 0.46]], { mat: 'cuero' }));
      }
      if (v === 'abierta') {
        // la puerta en el extremo +x: un triángulo oscuro y las alas recogidas
        ps.push(A.poliedro([[L + 1, -W * 0.72, 0], [L + 1, W * 0.72, 0], [L + 1, 0, H * 0.74], [L - 3, -W * 0.72, 0], [L - 3, W * 0.72, 0], [L - 3, 0, H * 0.74]], { mat: m, resta: true }));
        ps.push(A.poliedro([[L - 3, -W * 0.72, 0], [L - 3, W * 0.72, 0], [L - 3, 0, H * 0.74], [L - 2, -W * 0.72, 0], [L - 2, W * 0.72, 0], [L - 2, 0, H * 0.74]], { mat: 'negro' }));
        for (const s of [-1, 1]) ps.push(A.poliedro([[L + 0.5, s * W * 0.72, 0], [L + 2.5, s * W * 0.75, 0], [L + 0.5, s * W * 0.2, H * 0.74], [L + 2.5, s * W * 0.3, H * 0.5]], { mat: m, tono: 0.08 }));
        ps.push(A.caja(L + 8, 3, 0, 8, 5, 0.8, { mat: 'tela', giro: 20 }));
      }
      // vientos con estacas
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(A.palo([sx * (L + 2), 0, H], [sx * (L + 9), sy * 7, 0], 0.5, { mat: 'cuerda' }), A.caja(sx * (L + 9), sy * 7, 0, 1.4, 1.4, 3, { mat: 'madera' }));
      return ps;
    },
  },
  {
    id: 'camp_carpa_grande', nombre: ['Carpa redonda', 'Round tent'], tema: 'campamento', variantes: ['cerrada', 'abierta'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 38, 38, 4);
      const R = 26, m = 'tela';
      ps.push(a.cilindro(0, 0, 0, R, 20, { mat: m, r1: R - 1 }));
      ps.push(a.cilindro(0, 0, 19, R + 3, 32, { mat: m, r1: 2.5, tono: 0.04 }));
      ps.push(a.cilindro(0, 0, 18, R + 3.2, 3, { mat: 'tela_roja', r1: R + 2.6 }));
      for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2; ps.push(a.palo([Math.cos(ang) * (R + 2.9), Math.sin(ang) * (R + 2.9), 19.5], [Math.cos(ang) * 2.4, Math.sin(ang) * 2.4, 50.5], 0.8, { mat: m, tono: -0.12 })); }
      ps.push(a.palo([0, 0, 48], [0, 0, 62], 1.4, { mat: 'madera' }), a.caja(0.6, -0.6, 56, 9, 0.8, 5, { mat: 'tela_roja', giro: -45 }));
      if (v === 'abierta') {
        ps.push(a.caja((R - 2) * 0.707, (R - 2) * 0.707, 0, 10, 12, 17, { mat: m, giro: 45, resta: true }));
        ps.push(a.cilindro(0, 0, 0, R - 4, 17, { mat: 'negro' }));
        for (const s of [-1, 1]) ps.push(a.poliedro([[R * 0.707 + s * 4.4 * 0.707, R * 0.707 - s * 4.4 * 0.707, 0], [R * 0.707 + s * 7.5 * 0.707 + 1.5, R * 0.707 - s * 7.5 * 0.707 + 1.5, 0], [R * 0.707 + s * 4.6 * 0.707, R * 0.707 - s * 4.6 * 0.707, 17], [R * 0.707 + s * 6 * 0.707 + 1.4, R * 0.707 - s * 6 * 0.707 + 1.4, 15]], { mat: m, tono: 0.1 }));
      } else ps.push(a.caja(R * 0.707 + 0.2, R * 0.707 + 0.2, 0, 1, 1, 17, { mat: m, giro: 45, tono: -0.2 }));
      for (let i = 0; i < 6; i++) { const ang = (i / 6) * Math.PI * 2 + 0.3; ps.push(a.palo([Math.cos(ang) * (R + 2), Math.sin(ang) * (R + 2), 21], [Math.cos(ang) * (R + 10), Math.sin(ang) * (R + 10), 0], 0.5, { mat: 'cuerda' })); }
      return ps;
    },
  },
  {
    id: 'camp_pabellon', nombre: ['Pabellón del capitán', 'Commander pavilion'], tema: 'campamento', variantes: ['cerrado', 'abierto'], huella: [5, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 50, 42, 5);
      const L = 34, W = 26, H = 30;
      ps.push(a.caja(0, 0, 0, L * 2, W * 2, H, { mat: 'tela_roja' }));
      // rayas en las dos caras que se ven
      for (let i = -3; i <= 3; i++) ps.push(a.caja(i * 9.5, W + 0.1, 0, 4.5, 0.6, H, { mat: 'tela', tono: -0.05 }));
      for (let i = -2; i <= 2; i++) ps.push(a.caja(L + 0.1, i * 10, 0, 0.6, 4.5, H, { mat: 'tela', tono: -0.05 }));
      // techo a cuatro aguas con faldón
      ps.push(a.poliedro([[-L - 4, -W - 4, H - 2], [L + 4, -W - 4, H - 2], [L + 4, W + 4, H - 2], [-L - 4, W + 4, H - 2], [-L + 12, 0, H + 28], [L - 12, 0, H + 28]], { mat: 'tela_roja', tono: 0.06 }));
      ps.push(a.caja(0, 0, H - 6, L * 2 + 8.4, W * 2 + 8.4, 4.5, { mat: 'tela' }));
      for (let i = 0; i < 10; i++) {
        const t = -L - 1 + i * ((2 * L + 2) / 9);
        ps.push(a.elipsoide(t, W + 4.2, H - 6, 2.6, 0.8, 2.2, { mat: 'tela' }));
        if (i < 8) ps.push(a.elipsoide(L + 4.2, -W + 1 + i * ((2 * W - 2) / 7), H - 6, 0.8, 2.6, 2.2, { mat: 'tela' }));
      }
      ps.push(a.caja(0, 0, H - 2.2, L * 2 + 8.6, W * 2 + 8.6, 1, { mat: 'oro', tono: -0.15 }));
      // mástiles con banderines en la cumbrera
      for (const s of [-1, 1]) {
        ps.push(a.palo([s * (L - 12), 0, H + 26], [s * (L - 12), 0, H + 44], 1.1, { mat: 'madera' }), a.esfera(s * (L - 12), 0, H + 44.5, 1.6, { mat: 'oro' }));
        ps.push(a.poliedro([[s * (L - 12) + 0.8, -0.8, H + 42], [s * (L - 12) + 0.8, -0.8, H + 35], [s * (L - 12) + 10, -10, H + 39], [s * (L - 12) + 1.5, -0.1, H + 42], [s * (L - 12) + 1.5, -0.1, H + 35], [s * (L - 12) + 10.6, -9.4, H + 39]], { mat: 'tela_azul' }));
      }
      // entrada al frente (+y)
      if (v === 'abierto') {
        ps.push(a.caja(0, W, 0, 18, 6, 24, { mat: 'tela_roja', resta: true }), a.caja(0, W - 2.6, 0, 18, 1, 24, { mat: 'negro' }));
        for (const s of [-1, 1]) ps.push(a.poliedro([[s * 9, W + 0.5, 0], [s * 13, W + 2.5, 0], [s * 9, W + 0.5, 24], [s * 11, W + 1.5, 22], [s * 7, W + 0.5, 24]], { mat: 'tela_roja', tono: 0.1 }));
        ps.push(a.caja(0, W + 11, 0, 20, 18, 0.6, { mat: 'tela_morada' }), a.caja(0, W + 11, 0.2, 16, 14, 0.6, { mat: 'tela_roja', tono: -0.1 }));
      } else {
        ps.push(a.caja(0, W + 0.1, 0, 18, 0.8, 24, { mat: 'tela_roja', tono: -0.08 }), a.caja(0, W + 0.4, 0, 1, 0.8, 24, { mat: 'negro' }));
      }
      for (const s of [-1, 1]) {
        ps.push(a.palo([s * 14, W + 6, 0], [s * 14, W + 6, 30], 1.2, { mat: 'madera' }));
        ps.push(a.cilindro(s * 14, W + 6, 30, 2.4, 2.5, { mat: 'hierro', r1: 3 }));
        ps.push(a.caja(s * 14, W + 7.5, 16, 7, 0.8, 11, { mat: 'tela_azul' }), a.caja(s * 14, W + 7.9, 19, 2.5, 0.6, 4, { mat: 'oro', tono: -0.1 }));
      }
      // vientos
      for (const [x, y] of [[-L - 4, W + 4], [L + 4, W + 4], [L + 4, -W - 4], [-L - 4, -W - 4]]) ps.push(a.palo([x, y, H - 2], [x * 1.25, y * 1.3, 0], 0.5, { mat: 'cuerda' }));
      return ps;
    },
  },
);

// ------------------------------------------------------------------ fogata y asador
registrar(
  {
    id: 'camp_fogata', nombre: ['Fogata', 'Campfire'], tema: 'campamento', variantes: ['grande', 'chica', 'apagada'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const k = v === 'chica' ? 0.65 : 1;
      suelo(a, ps, 20 * k, 20 * k, 2);
      ps.push(a.cilindro(0, 0, 0, 11 * k, 1.2, { mat: v === 'apagada' ? 'negro' : 'tierra', tono: -0.2 }));
      for (let i = 0; i < 11; i++) { const ang = (i / 11) * Math.PI * 2 + a.r() * 0.2; ps.push(a.elipsoide(Math.cos(ang) * 13 * k, Math.sin(ang) * 13 * k, 0.8, (3.4 + a.r() * 1.2) * k, (2.8 + a.r()) * k, (2.6 + a.r() * 1.2) * k, { mat: 'piedra', giro: (ang * 180) / Math.PI, tono: (a.r() - 0.5) * 0.2 })); }
      // troncos en tipi
      const n = v === 'apagada' ? 4 : 5;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + a.r() * 0.4;
        if (v === 'apagada') ps.push(a.palo([Math.cos(ang) * 9, Math.sin(ang) * 9, 1.5], [-Math.cos(ang) * 3, -Math.sin(ang) * 3, 2.5], 1.7, { mat: 'corteza_muerta', tono: -0.15 }));
        else ps.push(a.palo([Math.cos(ang) * 10 * k, Math.sin(ang) * 10 * k, 0.5], [Math.cos(ang) * 1.5, Math.sin(ang) * 1.5, 13 * k], 2 * k, { mat: 'corteza', r1: 1.2 * k }));
      }
      if (v === 'apagada') {
        ps.push(a.elipsoide(0, 0, 0.5, 6, 6, 1.6, { mat: 'piedra_gris', tono: -0.2 }));
        for (let i = 0; i < 3; i++) ps.push(a.esfera((a.r() - 0.5) * 6, (a.r() - 0.5) * 6, 1.4, 0.9, { mat: 'lava', tono: -0.3 }));
        return ps;
      }
      llamas(a, ps, f, 6, 0, 0, 1, 3.8 * k, 22 * k, 3.6 * k);
      for (let i = 0; i < 4; i++) {
        const fase = (f / 6 + i / 4) % 1, ang = i * 2.4;
        ps.push(a.esfera(Math.cos(ang) * (2 + fase * 5), Math.sin(ang) * (2 + fase * 5), 14 * k + fase * 26 * k, 0.9, { mat: 'fuego', tono: 0.2 - fase * 0.4 }));
      }
      return { piezas: ps, resplandor: { c: [0, 0, 10 * k], r: 42 * k, color: '#ff9a3a' } };
    },
  },
  {
    id: 'camp_asador', nombre: ['Asador', 'Cooking spit'], tema: 'campamento', variantes: ['con_carne', 'con_olla'], cuadros: 6, t: 3, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 26, 16, 3);
      ps.push(a.cilindro(0, 0, 0, 9, 1, { mat: 'negro', tono: 0.1 }));
      for (let i = 0; i < 8; i++) { const ang = (i / 8) * Math.PI * 2; ps.push(a.elipsoide(Math.cos(ang) * 10, Math.sin(ang) * 10, 0.6, 3, 2.4, 2.4, { mat: 'piedra', giro: (ang * 180) / Math.PI })); }
      for (let i = 0; i < 3; i++) { const ang = (i / 3) * Math.PI + 0.4; ps.push(a.palo([Math.cos(ang) * 7, Math.sin(ang) * 7, 1], [-Math.cos(ang) * 7, -Math.sin(ang) * 7, 2], 1.5, { mat: 'corteza' })); }
      llamas(a, ps, f, 5, 0, 0, 1.5, 3, 10, 2.6);
      // horquetas a los lados
      for (const s of [-1, 1]) {
        ps.push(a.palo([s * 18, 0, 0], [s * 18, 0, 26], 1.6, { mat: 'madera_vieja' }));
        ps.push(a.palo([s * 18, 0, 25], [s * 18, -3, 31], 1, { mat: 'madera_vieja' }), a.palo([s * 18, 0, 25], [s * 18, 3, 31], 1, { mat: 'madera_vieja' }));
      }
      if (v === 'con_carne') {
        ps.push(a.palo([-22, 0, 27], [22, 0, 27], 0.8, { mat: 'hierro' }), a.palo([22, 0, 27], [22, 0, 22], 0.6, { mat: 'hierro' }), a.palo([22, 0, 22], [24, 0, 22], 0.9, { mat: 'madera' }));
        const g = f * 8;
        ps.push(a.elipsoide(0, 0, 27, 10, 5, 5.5, { mat: 'carne', incl: g }), a.elipsoide(-9, 0, 28, 3.5, 3, 3, { mat: 'carne', tono: -0.05 }));
        for (const s of [-1, 1]) ps.push(a.palo([6, s * 2.5, 25], [12, s * 3.5, 22], 1.4, { mat: 'carne', r1: 0.8 }), a.palo([-5, s * 2.5, 25], [-10, s * 3.5, 21], 1.4, { mat: 'carne', r1: 0.8 }));
      } else {
        ps.push(a.palo([-22, 0, 28], [22, 0, 28], 1, { mat: 'madera' }), a.palo([0, 0, 28], [0, 0, 20], 0.4, { mat: 'hierro' }));
        ps.push(a.elipsoide(0, 0, 14, 7, 7, 6, { mat: 'hierro' }), a.caja(0, 0, 17, 20, 20, 10, { mat: 'hierro', resta: true }), a.cilindro(0, 0, 15.5, 6.6, 1.5, { mat: 'hierro', r1: 7.2 }));
        ps.push(a.cilindro(0, 0, 15, 5.7, 1.2, { mat: 'agua_sucia' }), a.elipsoide(-1, 1, 19 + (f % 3), 2 + f * 0.3, 2, 1.4, { mat: 'piedra_gris', tono: 0.25 }));
      }
      return { piezas: ps, resplandor: { c: [0, 0, 6], r: 30, color: '#ff9a3a' } };
    },
  },
);

// ------------------------------------------------------------------ carreta y carro de mano
registrar(
  {
    id: 'camp_carreta', nombre: ['Carreta', 'Wagon'], tema: 'campamento', variantes: ['cubierta', 'descubierta', 'rota'], huella: [4, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 34, 20, 4);
      const A = girado(a, (a.r() - 0.5) * 8);
      const L = 22, W = 11;
      if (v === 'cubierta') {
        ps.push(A.cilindro(-L + 2, 0, 20, 13, 2 * L - 4, { mat: 'tela', eje: [1, 0, 0] }));
        ps.push(A.caja(0, 0, 0, 2 * L + 2, 30, 20, { mat: 'tela', resta: true }));
        ps.push(A.cilindro(-L + 1.6, 0, 20, 12.4, 2 * L - 3.2, { mat: 'tela', eje: [1, 0, 0], resta: true }));
        for (const x of [-L + 2.5, -7, 7, L - 3.5]) ps.push(A.cilindro(x, 0, 20, 13.3, 1, { mat: 'madera_vieja', eje: [1, 0, 0] }));
        ps.push(A.caja(0, 0, 0, 2 * L + 2, 30, 20, { mat: 'tela', resta: true }));
        ps.push(A.cilindro(L - 2.5, 0, 20, 12, 1, { mat: 'negro', eje: [1, 0, 0] }));
      }
      // la caja de la carreta
      ps.push(A.caja(0, 0, 12, 2 * L, 2 * W, 3, { mat: 'madera' }));
      for (const s of [-1, 1]) ps.push(A.caja(0, s * (W - 0.8), 15, 2 * L, 1.6, 7, { mat: 'madera', tono: 0.03 }), A.caja(s * (L - 0.8), 0, 15, 1.6, 2 * W, 7, { mat: 'madera', tono: -0.03 }));
      for (const x of [-L + 1, -7, 7, L - 1]) for (const s of [-1, 1]) ps.push(A.caja(x, s * (W + 0.2), 12, 1.6, 1.4, 10.5, { mat: 'madera_vieja' }));
      for (const x of [-14, 14]) ps.push(A.palo([x, -W - 1, 9], [x, W + 1, 9], 1.2, { mat: 'hierro' }));
      const roto = v === 'rota';
      rueda(A, ps, -14, -W - 1.5, 9, 9);
      rueda(A, ps, 14, -W - 1.5, 9, 9);
      rueda(A, ps, -14, W + 2.7, 9, 9);
      if (roto) {
        rueda(A, ps, 22, W + 14, 1.3, 9, true);
        ps.push(A.elipsoide(14, W - 1, 4, 5, 4, 5, { mat: 'piedra' }));
        ps.push(A.palo([L, 0, 10], [L + 16, -4, 0.8], 1.6, { mat: 'madera_vieja' }), A.palo([L + 17, -4, 1], [L + 26, 2, 1], 1.4, { mat: 'madera_vieja' }));
        ps.push(A.caja(-8, W + 6, 0, 10, 2, 1, { mat: 'madera', giro: 30 }), A.caja(4, 0, 15, 8, 2 * W - 2, 1, { mat: 'negro', resta: true }));
        return ps;
      }
      rueda(A, ps, 14, W + 2.7, 9, 9);
      // lanza para el tiro
      ps.push(A.palo([L, 0, 10], [L + 22, 0, 4], 1.4, { mat: 'madera_vieja' }), A.palo([L + 20, -6, 4.5], [L + 20, 6, 4.5], 1, { mat: 'madera_vieja' }));
      if (v === 'descubierta') {
        cajon(A, ps, -12, -3, 15, 10, 8);
        cajon(A, ps, -3, 4, 15, 9, -12, 0.05);
        saco(A, ps, 10, -3, 15, 80, 0.8);
        saco(A, ps, 12, 4, 15, 100, 0.8, 'cuero');
        ps.push(A.cilindro(-12, -3, 25, 4.5, 9, { mat: 'madera', r1: 4.8 }), A.cilindro(-12, -3, 28, 4.85, 1, { mat: 'hierro' }));
      }
      return ps;
    },
  },
  {
    id: 'camp_carro_mano', nombre: ['Carro de mano', 'Handcart'], tema: 'campamento', variantes: ['cargado', 'vacio'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 20, 16, 2);
      const A = girado(a, (a.r() - 0.5) * 20 - 20);
      ps.push(A.caja(0, 0, 11, 22, 16, 2, { mat: 'madera_vieja', incl: -6, inclEje: 'y' }));
      for (const s of [-1, 1]) ps.push(A.caja(0, s * 7.5, 13, 22, 1.4, 5, { mat: 'madera_vieja', incl: -6, inclEje: 'y' }));
      ps.push(A.caja(-10.5, 0, 13, 1.4, 16, 6, { mat: 'madera_vieja', incl: -6, inclEje: 'y' }));
      for (const s of [-1, 1]) { ps.push(A.palo([10, s * 6, 12.5], [26, s * 6.5, 11], 1, { mat: 'madera' })); ps.push(A.palo([-10, s * 6, 10], [-12, s * 6, 0], 1, { mat: 'madera' })); }
      rueda(A, ps, 2, -8.6, 9, 8.5);
      rueda(A, ps, 2, 10.6, 9, 8.5);
      if (v === 'cargado') {
        saco(A, ps, -3, -2, 14, 10, 0.75);
        saco(A, ps, 4, 3, 14, -20, 0.7, 'cuero');
        ps.push(A.cilindro(-6, 4, 14, 3, 10, { mat: 'madera', r1: 3.3 }), A.palo([-2, -4, 22], [8, 2, 15], 0.8, { mat: 'madera' }), A.poliedro([[8, 2, 15], [11, 0, 13], [11, 5, 13], [9, 2, 16]], { mat: 'hierro' }));
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ cajas, sacos, heno, leña
registrar(
  {
    id: 'camp_cajas', nombre: ['Cajas de madera', 'Wooden crates'], tema: 'campamento', variantes: ['pila', 'sola', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 22, 20, 2);
      const A = girado(a, 0);
      if (v === 'pila') {
        cajon(A, ps, -6, -6, 0, 15, (a.r() - 0.5) * 10);
        cajon(A, ps, 9, -4, 0, 13, (a.r() - 0.5) * 20, 0.04);
        cajon(A, ps, -5, 10, 0, 12, (a.r() - 0.5) * 20, -0.03);
        cajon(A, ps, -5, -5, 15, 12, 20 + a.r() * 20, 0.05);
      } else if (v === 'sola') {
        cajon(A, ps, 0, 0, 0, 16, (a.r() - 0.5) * 20);
        ps.push(A.caja(5, 12, 0, 14, 4, 1.4, { mat: 'madera_vieja', giro: 25 }));
      } else {
        // reventada: dos paredes en pie y tablas por el piso
        const g = a.r() * 30;
        ps.push(A.caja(0, 0, 0, 16, 16, 2, { mat: 'madera_vieja', giro: g }));
        ps.push(A.caja(-7, 0, 0, 2, 16, 14, { mat: 'madera_vieja', giro: g }), A.caja(0, -7, 0, 16, 2, 10, { mat: 'madera_vieja', giro: g, tono: 0.04 }));
        ps.push(A.caja(-2, -2, 2, 7, 7, 1.4, { mat: 'paja' }));
        for (let i = 0; i < 6; i++) ps.push(A.caja((a.r() - 0.3) * 22, (a.r() - 0.3) * 22, 0.2, 2.5 + a.r(), 10 + a.r() * 6, 1, { mat: i % 3 ? 'madera_vieja' : 'madera', giro: a.r() * 180, incl: (a.r() - 0.5) * 20, tono: (a.r() - 0.5) * 0.2 }));
      }
      return ps;
    },
  },
  {
    id: 'camp_sacos', nombre: ['Sacos', 'Sacks'], tema: 'campamento', variantes: ['pila', 'parados', 'derramado'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 20, 14, 2);
      const A = girado(a, 0);
      if (v === 'pila') {
        saco(A, ps, -6, -2, 0, 5, 1);
        saco(A, ps, 6, 0, 0, -8, 1, 'cuero');
        saco(A, ps, -4, 8, 0, 170, 0.9);
        saco(A, ps, 0, 2, 7, 180 + (a.r() - 0.5) * 20, 0.95);
      } else if (v === 'parados') {
        saco(A, ps, -7, -3, 0, 0, 1, 'tela', false);
        saco(A, ps, 4, -6, 0, 30, 0.9, 'cuero', false);
        saco(A, ps, 2, 6, 0, 60, 0.85, 'tela', false);
      } else {
        saco(A, ps, -4, -2, 0, 20, 1.1);
        ps.push(A.elipsoide(8, 4, 0, 10, 7, 2.6, { mat: 'paja', tono: 0.1, giro: 30 }));
        ps.push(A.cilindro(5, 2, 4, 3, 4, { mat: 'tela', eje: [1, 0.4, 0], r1: 3.5 }));
        saco(A, ps, -8, 9, 0, 200, 0.8, 'cuero');
      }
      return ps;
    },
  },
  {
    id: 'camp_heno', nombre: ['Fardo de heno', 'Hay bale'], tema: 'campamento', variantes: ['fardo', 'pila', 'suelto'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 22, 18, 2);
      const A = girado(a, 0);
      const fardo = (x: number, y: number, z: number, g: number) => {
        ps.push(A.caja(x, y, z, 20, 12, 10, { mat: 'paja', giro: g, tono: -0.14 }));
        const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180);
        for (const u of [-5, 5]) ps.push(A.caja(x + c * u, y + s * u, z - 0.2, 1.2, 12.6, 10.6, { mat: 'cuerda', giro: g }));
        ps.push(A.caja(x, y, z + 9.8, 19, 11, 0.6, { mat: 'paja', giro: g, tono: -0.08 }));
      };
      if (v === 'fardo') fardo(0, 0, 0, (a.r() - 0.5) * 30);
      else if (v === 'pila') { fardo(-2, -7, 0, 5); fardo(1, 6, 0, -5); fardo(-1, -1, 10, 85 + (a.r() - 0.5) * 20); }
      else {
        ps.push(A.elipsoide(0, 0, 0, 15, 13, 12, { mat: 'paja', tono: -0.14 }), A.elipsoide(9, 8, 0, 8, 6, 4, { mat: 'paja', tono: -0.08 }));
        ps.push(A.palo([3, -2, 6], [10, -6, 34], 0.9, { mat: 'madera' }));
        for (const k of [-1, 0, 1]) ps.push(A.palo([3 + k * 1.2, -2 - k * 1.2, 6], [3 + k * 1.2, -2 - k * 1.2, 0], 0.5, { mat: 'hierro' }));
      }
      return ps;
    },
  },
  {
    id: 'camp_lena', nombre: ['Pila de leña', 'Log pile'], tema: 'campamento', variantes: ['pila', 'con_hacha', 'chica'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 22, 20, 2);
      const filas = v === 'chica' ? [3, 2] : [4, 3, 2, 1];
      const r = 3.6, L = v === 'chica' ? 20 : 28;
      filas.forEach((n, j) => {
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * 2 * r * 1.02 + (a.r() - 0.5) * 0.8, z = r + j * r * 1.75, rr = r * (0.88 + a.r() * 0.16), dy = (a.r() - 0.5) * 3;
          ps.push(a.cilindro(x, -L / 2 + dy, z, rr, L, { mat: 'corteza', eje: [0, 1, 0] }));
          ps.push(a.cilindro(x, L / 2 + dy - 0.1, z, rr * 0.86, 0.4, { mat: 'madera_lisa', eje: [0, 1, 0], tono: 0.1 }));
        }
      });
      if (v === 'con_hacha') {
        ps.push(a.cilindro(20, 14, 0, 7, 9, { mat: 'corteza' }), a.cilindro(20, 14, 9, 6.6, 0.6, { mat: 'madera_lisa', tono: 0.12 }));
        ps.push(a.palo([19, 14, 9.5], [25, 20, 20], 0.9, { mat: 'madera' }), a.poliedro([[17, 14, 9], [21, 14, 9], [16.5, 14, 13], [21, 14, 12.5], [18.5, 13, 11], [18.5, 15, 11]], { mat: 'acero' }));
        ps.push(a.cilindro(14, 22, 0, 3.4, 7, { mat: 'madera_lisa', tono: 0.05, eje: [1, 0.3, 0] }), a.cilindro(11, 16, 0, 2.6, 8, { mat: 'madera_lisa', eje: [0.2, 1, 0] }));
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ estandarte (anima la tela)
registrar({
  id: 'camp_estandarte', nombre: ['Estandarte', 'Banner standard'], tema: 'campamento', variantes: ['rojo', 'azul', 'roto'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    suelo(a, ps, 11, 11, 4);
    for (let i = 0; i < 5; i++) { const ang = (i / 5) * Math.PI * 2; ps.push(a.elipsoide(Math.cos(ang) * 4, Math.sin(ang) * 4, 1, 3.2, 2.8, 2.8, { mat: 'piedra', giro: a.r() * 90 })); }
    ps.push(a.palo([0, 0, 0], [0, 0, 92], 1.4, { mat: 'madera', r1: 1.1 }), a.poliedro([[-1, 0, 92], [1, 0, 92], [0, -1, 92], [0, 1, 92], [0, 0, 99]], { mat: 'hierro' }));
    const m = v === 'azul' ? 'tela_azul' : v === 'roto' ? 'tela' : 'tela_roja';
    const emb = v === 'azul' ? 'tela' : 'oro';
    // la bandera ondea hacia la derecha de la pantalla (u = +x -y), en tiras que se corren
    const d = Math.SQRT1_2, N = 8, ancho = 4.2, z0 = 60, alto = 26;
    for (let k = 0; k < N; k++) {
      const u = 1 + (k + 0.5) * ancho;
      const ola = Math.sin((f / 6) * Math.PI * 2 - k * 0.9) * (0.5 + k * 0.45);
      const caida = k * 0.7;
      let h = alto;
      if (v === 'roto' && k > 3) h = alto * (0.4 + a.r() * 0.6);
      else a.r();
      const x = u * d + ola * d, y = -u * d + ola * d;
      ps.push(a.caja(x, y, z0 + alto - caida - h, ancho + 0.3, 1, h, { mat: m, giro: -45, tono: ola * 0.06 }));
      if (k === 3 || k === 4) ps.push(a.caja(x + d * 0.6, y + d * 0.6, z0 + 8 - caida, ancho * 0.9, 0.6, 10, { mat: emb, giro: -45, tono: -0.1 }));
      if (k === N - 1 && v !== 'roto') ps.push(a.caja(x + 1.5 * d, y - 1.5 * d, z0 - caida - 6, 2, 1, 7, { mat: m, giro: -45 }), a.caja(x - 1.5 * d, y + 1.5 * d, z0 - caida - 4, 2, 1, 5, { mat: m, giro: -45 }));
    }
    ps.push(a.palo([0, 0, z0 + alto + 1], [(N * ancho + 2) * d, -(N * ancho + 2) * d, z0 + alto - 4], 0.7, { mat: 'madera' }));
    return ps;
  },
});

// ------------------------------------------------------------------ práctica y armas
registrar(
  {
    id: 'camp_muneco', nombre: ['Muñeco de práctica', 'Training dummy'], tema: 'campamento', variantes: ['entero', 'con_flechas', 'roto'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 12, 12, 2);
      const roto = v === 'roto';
      const A = girado(a, (a.r() - 0.5) * 30, 0, 0);
      ps.push(A.caja(0, 0, 0, 20, 3, 2.5, { mat: 'madera_vieja' }), A.caja(0, 0, 0, 3, 20, 2.5, { mat: 'madera_vieja' }));
      const inc = roto ? 12 : 0;
      ps.push(A.caja(0, 0, 0, 3, 3, 46, { mat: 'madera', incl: inc, inclEje: 'y' }));
      const top = (z: number): V3 => [Math.sin((inc * Math.PI) / 180) * z, 0, Math.cos((inc * Math.PI) / 180) * z];
      const [bx, , bz] = top(28);
      ps.push(A.cilindro(bx * 0.7, 0, 16, 7, 22, { mat: 'paja', r1: 6.5, incl: inc, inclEje: 'y' }));
      for (const z of [19, 27, 34]) ps.push(A.cilindro(bx * (z / 28) * 0.8, 0, z, 7.1 - (z - 19) * 0.03, 1.2, { mat: 'cuerda', incl: inc, inclEje: 'y' }));
      // brazos hacia los lados de la pantalla
      const [ax, , az] = top(34);
      if (!roto) ps.push(A.palo([ax - 9, 9, az], [ax + 9, -9, az + 1], 1.4, { mat: 'madera' }), A.esfera(ax - 9, 9, az, 2.4, { mat: 'paja' }), A.esfera(ax + 9, -9, az + 1, 2.4, { mat: 'paja' }));
      else ps.push(A.palo([ax, 0, az], [ax + 9, -9, az - 9], 1.4, { mat: 'madera' }), A.esfera(ax + 9, -9, az - 9, 2.4, { mat: 'paja' }));
      if (!roto) {
        const [hx, , hz] = top(43);
        ps.push(A.elipsoide(hx, 0, hz, 5, 4.6, 5.4, { mat: 'tela' }), A.cilindro(hx, 0, hz - 5, 2.4, 1.2, { mat: 'cuerda' }));
        ps.push(A.caja(hx + 3, 3, hz, 2.5, 0.8, 1.2, { mat: 'negro', giro: -45 }), A.caja(hx + 2, 2, hz + 3, 5, 0.8, 0.8, { mat: 'tela_roja', giro: -45 }));
      } else {
        ps.push(A.elipsoide(13, 8, 4, 5, 4.6, 4.4, { mat: 'tela', incl: 70 }));
        for (let i = 0; i < 5; i++) ps.push(A.elipsoide(4 + a.r() * 10, -4 + a.r() * 12, 0.5, 3 + a.r() * 2, 2 + a.r(), 1, { mat: 'paja', giro: a.r() * 180 }));
      }
      void bz;
      if (v === 'con_flechas') {
        for (let i = 0; i < 5; i++) {
          const z = 20 + a.r() * 16, ang = (a.r() - 0.5) * 1.6 + Math.PI / 4;
          const px = Math.cos(ang) * 6.5, py = Math.sin(ang) * 6.5;
          const sx = px + Math.cos(ang + (a.r() - 0.5) * 0.4) * 11, sy = py + Math.sin(ang) * 11;
          const zz = z + 3 + a.r() * 3;
          ps.push(A.palo([px * 0.8, py * 0.8, z], [sx, sy, zz], 0.7, { mat: 'madera_lisa', tono: 0.1 }));
          ps.push(A.elipsoide(sx, sy, zz, 2.2, 0.6, 1.6, { mat: i % 2 ? 'tela' : 'tela_roja', giro: -45 }));
        }
      }
      return ps;
    },
  },
  {
    id: 'camp_armero', nombre: ['Armero', 'Weapon rack'], tema: 'campamento', variantes: ['lleno', 'medio'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 22, 11, 2);
      const A = girado(a, (a.r() - 0.5) * 10);
      for (const s of [-1, 1]) ps.push(A.palo([s * 15, -5, 0], [s * 15, 0, 32], 1.3, { mat: 'madera' }), A.palo([s * 15, 5, 0], [s * 15, 0, 32], 1.3, { mat: 'madera' }));
      ps.push(A.palo([-17, 0, 31], [17, 0, 31], 1.3, { mat: 'madera' }), A.caja(0, 2, 5, 32, 3, 2, { mat: 'madera_vieja' }));
      // armas apoyadas del lado de la cámara (+y)
      const armas = v === 'lleno' ? ['lanza', 'espada', 'hacha', 'lanza', 'espada', 'lanza', 'maza'] : ['lanza', 'espada', 'hacha'];
      armas.forEach((t, i) => {
        const x = -12 + i * (24 / (armas.length - 1)) + (a.r() - 0.5);
        const pie: V3 = [x + (a.r() - 0.5) * 2, 4, 5.5], cima = (alto: number): V3 => [x, 1.8 - alto / 30, alto];
        if (t === 'lanza') {
          const c = cima(42 + a.r() * 6);
          ps.push(A.palo(pie, c, 0.75, { mat: 'madera' }), A.poliedro([[c[0] - 1.2, c[1], c[2]], [c[0] + 1.2, c[1], c[2]], [c[0], c[1] - 0.6, c[2]], [c[0], c[1] + 0.6, c[2]], [c[0], c[1] - 0.2, c[2] + 6]], { mat: 'acero' }));
        } else if (t === 'espada') {
          const c = cima(36);
          ps.push(A.caja(pie[0], pie[1] - 0.5, 6, 1.8, 0.6, 22, { mat: 'acero', incl: 5 }), A.caja(pie[0], pie[1] - 1.6, 27.5, 6, 1.2, 1.4, { mat: 'bronce', incl: 5 }), A.caja(pie[0], pie[1] - 1.9, 29, 1.2, 1.2, 5, { mat: 'cuero', incl: 5 }), A.esfera(pie[0], pie[1] - 2.3, 34.5, 1.2, { mat: 'bronce' }));
          void c;
        } else if (t === 'hacha') {
          const c = cima(34);
          ps.push(A.palo(pie, c, 0.9, { mat: 'madera' }), A.poliedro([[c[0], c[1], c[2] - 7], [c[0], c[1], c[2] - 1], [c[0] + 6, c[1] + 0.5, c[2] - 10], [c[0] + 6, c[1] + 0.5, c[2] + 2], [c[0] + 1, c[1] + 0.9, c[2] - 4], [c[0] + 1, c[1] - 0.9, c[2] - 4]], { mat: 'acero' }));
        } else {
          const c = cima(30);
          ps.push(A.palo(pie, c, 0.9, { mat: 'madera' }), A.esfera(c[0], c[1], c[2], 3, { mat: 'hierro' }));
          for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3]]) ps.push(A.esfera(c[0] + dx, c[1], c[2] + dz, 1, { mat: 'hierro' }));
        }
      });
      if (v === 'medio') ps.push(A.palo([4, 12, 0.8], [20, 7, 0.8], 0.75, { mat: 'madera' }), A.cilindro(-6, 11, 0, 6, 1.4, { mat: 'madera', eje: [0.2, 1, 0.9] }));
      return ps;
    },
  },
  {
    id: 'camp_soporte_armadura', nombre: ['Soporte de armadura', 'Armor stand'], tema: 'campamento', variantes: ['completa', 'cuero', 'vacio'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 12, 12, 2);
      const A = girado(a, (a.r() - 0.5) * 30);
      ps.push(A.caja(0, 0, 0, 18, 3, 2.5, { mat: 'madera' }), A.caja(0, 0, 0, 3, 18, 2.5, { mat: 'madera' }));
      ps.push(A.caja(0, 0, 0, 2.6, 2.6, 46, { mat: 'madera' }), A.palo([-6, 6, 40], [6, -6, 40], 1.2, { mat: 'madera' }));
      if (v === 'vacio') {
        ps.push(A.elipsoide(8, 8, 3.5, 4.5, 4.5, 4, { mat: 'hierro', incl: 60 }), A.caja(-9, 9, 0, 7, 1.4, 0.9, { mat: 'cuero', giro: 30 }));
        return ps;
      }
      const m = v === 'cuero' ? 'cuero' : 'acero';
      // falda de malla, torso, hombreras y yelmo
      ps.push(A.cilindro(0, 0, 18, 6, 9, { mat: v === 'cuero' ? 'cuero' : 'hierro', r1: 6.6, tono: -0.05 }));
      ps.push(A.elipsoide(0, 0, 33, 7, 5, 9, { mat: m }), A.caja(0, 0, 26, 13, 9, 2, { mat: 'cuero', tono: -0.1 }));
      for (const s of [-1, 1]) ps.push(A.elipsoide(s * 5.5, -s * 5.5, 40, 4, 4, 3, { mat: m, giro: 45, tono: 0.05 }));
      if (v === 'completa') {
        ps.push(A.elipsoide(0, 0, 47, 3.8, 3.8, 4.6, { mat: 'acero' }), A.caja(2.4, 2.4, 46, 3, 1, 1, { mat: 'negro', giro: -45 }), A.palo([0, 0, 51], [0, 0, 54], 0.8, { mat: 'tela_roja' }));
        // escudo apoyado al pie
        ps.push(A.cilindro(6, 9, 1, 6.5, 1.4, { mat: 'madera', eje: [0.45, 0.6, 0.66] }), A.cilindro(6.4, 9.5, 1.5, 6.9, 0.8, { mat: 'hierro', eje: [0.45, 0.6, 0.66] }), A.esfera(6.8, 10, 7, 1.8, { mat: 'bronce' }));
        ps.push(A.cilindro(6.8, 9.9, 1.6, 5.9, 0.9, { mat: 'tela_azul', eje: [0.45, 0.6, 0.66] }));
      } else ps.push(A.elipsoide(0, 0, 46, 3.6, 3.6, 3.4, { mat: 'cuero', tono: -0.05 }), A.caja(-7, 7, 0, 3, 8, 2, { mat: 'cuero', giro: 30 }));
      return ps;
    },
  },
);

// ------------------------------------------------------------------ fuente, herrería
registrar(
  {
    id: 'camp_fuente', nombre: ['Fuente del campamento', 'Camp fountain'], tema: 'campamento', variantes: ['llena', 'seca'], cuadros: 6, t: 3, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 30, 30, 5);
      const llena = v === 'llena';
      ps.push(a.caja(0, 0, 0, 44, 44, 2, { mat: 'piedra_gris', tono: -0.06 }));
      ps.push(a.caja(0, 0, 2, 40, 40, 9, { mat: 'piedra_bloques' }), a.caja(0, 0, 11, 42, 42, 2, { mat: 'piedra_gris' }));
      ps.push(a.caja(0, 0, 4, 34, 34, 12, { mat: 'piedra', resta: true }));
      // columna central con taza y caño
      ps.push(a.cilindro(0, 0, 4, 4.5, 20, { mat: 'piedra_gris', r1: 3.5 }), a.cilindro(0, 0, 24, 3, 2, { mat: 'piedra_gris', r1: 9 }), a.cilindro(0, 0, 26, 9, 2, { mat: 'piedra_gris' }));
      ps.push(a.cilindro(0, 0, 27, 7.6, 2, { mat: 'piedra', resta: true }));
      ps.push(a.cilindro(0, 0, 28, 2.4, 6, { mat: 'piedra_gris', r1: 1.8 }), a.esfera(0, 0, 35, 3, { mat: 'piedra_gris' }));
      if (!llena) {
        ps.push(a.caja(0, 0, 4, 34, 34, 1, { mat: 'tierra', tono: -0.1 }), a.elipsoide(-8, 9, 4.5, 6, 4, 1, { mat: 'musgo' }), a.elipsoide(10, -4, 4.5, 4, 5, 0.8, { mat: 'hojas_otono' }));
        return ps;
      }
      ps.push(a.caja(0, 0, 4, 34, 34, 5.5, { mat: 'agua' }), a.cilindro(0, 0, 27, 7.7, 0.8, { mat: 'agua' }));
      // chorros que caen de la taza (gotas que bajan con el cuadro) y ondas abajo
      for (let k = 0; k < 4; k++) {
        const ang = Math.PI / 4 + (k * Math.PI) / 2, cx = Math.cos(ang) * 9.3, cy = Math.sin(ang) * 9.3;
        ps.push(a.palo([cx * 0.95, cy * 0.95, 27.5], [cx * 1.05, cy * 1.05, 9.5], 0.8, { mat: 'agua', tono: 0.25 }));
        for (let j = 0; j < 2; j++) { const fase = ((f / 6 + j / 2) % 1); ps.push(a.esfera(cx * 1.02, cy * 1.02, 27 - fase * 17, 1.1, { mat: 'agua', tono: 0.35 })); }
        const r = 2 + (f % 3) * 1.6;
        ps.push(a.cilindro(cx, cy, 9.5, r, 0.3, { mat: 'agua', tono: 0.3 - r * 0.04 }), a.cilindro(cx, cy, 9.4, r - 0.9, 0.6, { mat: 'agua', resta: true }));
      }
      ps.push(a.palo([2.2, 2.2, 35], [5 + (f % 2) * 0.3, 5, 31], 0.6, { mat: 'agua', tono: 0.3 }));
      return ps;
    },
  },
  {
    id: 'camp_yunque', nombre: ['Yunque', 'Anvil'], tema: 'campamento', variantes: ['solo', 'con_espada'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 13, 13, 3);
      const A = girado(a, (a.r() - 0.5) * 30);
      ps.push(A.cilindro(0, 0, 0, 8, 11, { mat: 'corteza', r1: 7.5 }), A.cilindro(0, 0, 11, 7.4, 0.5, { mat: 'madera_lisa', tono: 0.1 }));
      ps.push(A.caja(0, 0, 11.5, 12, 8, 3, { mat: 'hierro' }), A.caja(0, 0, 14.5, 6, 4.5, 4, { mat: 'hierro' }), A.caja(-1, 0, 18.5, 14, 6.5, 4, { mat: 'hierro', tono: 0.05 }));
      ps.push(A.cilindro(6, 0, 20.5, 3.2, 8, { mat: 'hierro', r1: 0.4, eje: [1, 0, 0.05] }));
      ps.push(A.caja(-1, 0, 22.4, 13.6, 6, 0.3, { mat: 'acero', tono: 0.1 }));
      // martillo
      ps.push(A.palo([-10, 7, 1], [-2, 13, 1.2], 0.8, { mat: 'madera' }), A.caja(-11, 6, 0, 3, 5, 3, { mat: 'hierro', giro: 36 }));
      if (v === 'con_espada') {
        ps.push(A.caja(-2, 0.5, 22.6, 16, 1.8, 0.7, { mat: 'lava', tono: -0.05, giro: 8 }), A.caja(-12, -1, 22.6, 6, 1.2, 0.7, { mat: 'hierro', giro: 8 }));
        ps.push(A.palo([3, 1, 23.5], [13, 6, 20], 0.6, { mat: 'hierro' }), A.palo([3, 0, 23.5], [13, 5, 19], 0.6, { mat: 'hierro' }));
        ps.push(A.cilindro(-2, 14, 0, 6, 8, { mat: 'madera', r1: 6.3 }), A.cilindro(-2, 14, 7, 5.4, 0.6, { mat: 'agua' }));
        return { piezas: ps, resplandor: { c: [0, 0, 23], r: 16, color: '#ff7a2a' } };
      }
      return ps;
    },
  },
  {
    id: 'camp_fragua', nombre: ['Fragua', 'Forge'], tema: 'campamento', variantes: ['encendida', 'apagada'], cuadros: 6, t: 3, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 32, 30, 5);
      const on = v === 'encendida';
      // el fogón de ladrillo con la cama de brasas
      ps.push(a.caja(-4, -4, 0, 32, 26, 16, { mat: 'ladrillo' }), a.caja(-4, -4, 16, 34, 28, 2.5, { mat: 'piedra_gris' }));
      ps.push(a.caja(-4, -4, 13, 20, 14, 8, { mat: 'piedra', resta: true }));
      ps.push(a.caja(-4, -4, 13, 20, 14, 2.5, { mat: on ? 'lava' : 'negro', tono: on ? -0.15 + Math.sin((f / 6) * Math.PI * 2) * 0.1 : 0 }));
      for (let i = 0; i < 9; i++) {
        const x = -4 + (a.r() - 0.5) * 16, y = -4 + (a.r() - 0.5) * 10;
        const fase = Math.sin((f / 6) * Math.PI * 2 + i * 1.7);
        ps.push(a.elipsoide(x, y, 15.5, 2 + a.r(), 1.8 + a.r(), 1.4, { mat: on ? (fase > 0.3 ? 'lava' : 'piedra_gris') : 'piedra_gris', tono: on ? fase * 0.1 - 0.05 : -0.3 }));
      }
      if (on) llamas(a, ps, f, 4, -4, -4, 15.5, 4, 7, 2.2);
      // campana y chimenea sobre dos postes
      for (const [x, y] of [[-20, 10], [12, 10]]) ps.push(a.caja(x, y, 18, 2.6, 2.6, 20, { mat: 'madera' }));
      ps.push(a.poliedro([[-22, -20, 38], [14, -20, 38], [14, 12, 38], [-22, 12, 38], [-10, -10, 54], [-2, -10, 54], [-2, -2, 54], [-10, -2, 54]], { mat: 'ladrillo', tono: -0.05 }));
      ps.push(a.caja(-6, -6, 54, 9, 9, 34, { mat: 'ladrillo' }), a.caja(-6, -6, 88, 11, 11, 2, { mat: 'piedra_gris' }));
      if (on) ps.push(a.elipsoide(-6, -6, 94 + f, 4 + f * 0.4, 4, 3, { mat: 'piedra_gris', tono: 0.15 }), a.elipsoide(-4, -8, 101 + f * 1.2, 5, 4.5, 3, { mat: 'piedra_gris', tono: 0.25 }));
      // fuelle al costado (+x) y tina de agua
      ps.push(a.elipsoide(19, -4, 10, 8, 5, 3, { mat: 'cuero', giro: 0 }), a.caja(19, -4, 7, 15, 9, 1.4, { mat: 'madera' }), a.caja(19, -4, 12.6, 15, 9, 1.4, { mat: 'madera', incl: on ? -4 + (f % 3) * 2 : 0, inclEje: 'y' }));
      ps.push(a.palo([11, -4, 10], [5, -4, 13], 1, { mat: 'hierro' }), a.palo([27, -4, 13], [33, -4, 18], 0.9, { mat: 'madera' }));
      for (const x of [13, 25]) ps.push(a.caja(x, -4, 0, 2, 2, 7, { mat: 'madera' }));
      ps.push(a.cilindro(-16, 22, 0, 7, 9, { mat: 'madera', r1: 7.3 }), a.cilindro(-16, 22, 1.5, 7.4, 1.2, { mat: 'hierro' }), a.cilindro(-16, 22, 6.5, 7.4, 1.2, { mat: 'hierro' }));
      ps.push(a.cilindro(-16, 22, 8, 6.2, 1, { mat: 'agua' }));
      // herramientas colgadas
      ps.push(a.palo([10, 11.4, 34], [9, 11.6, 24], 0.6, { mat: 'hierro' }), a.palo([6, 11.4, 34], [5, 11.6, 26], 0.6, { mat: 'hierro' }), a.caja(5, 11.6, 25, 3, 1, 2, { mat: 'hierro' }));
      return on ? { piezas: ps, resplandor: { c: [-4, -4, 18], r: 36, color: '#ff7a2a' } } : ps;
    },
  },
);

// ------------------------------------------------------------------ baúl del alijo
registrar({
  id: 'camp_baul', nombre: ['Baúl del alijo', 'Stash trunk'], tema: 'campamento', variantes: ['cerrado', 'abierto'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    suelo(a, ps, 24, 18, 3);
    const A = girado(a, (a.r() - 0.5) * 8);
    const L = 34, W = 20, H = 15, z0 = 2;
    ps.push(A.caja(0, 0, 0, L + 4, W + 4, 2, { mat: 'piedra_gris' }));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(A.elipsoide(sx * (L / 2 - 2), sy * (W / 2 - 2), z0 + 1, 3, 3, 2, { mat: 'bronce' }));
    ps.push(A.caja(0, 0, z0 + 1, L, W, H, { mat: 'madera', tono: -0.04 }));
    ps.push(A.caja(0, 0, z0 + 1, L + 0.8, W + 0.8, 2, { mat: 'hierro' }), A.caja(0, 0, z0 + H - 1, L + 0.8, W + 0.8, 2, { mat: 'hierro' }));
    for (const x of [-11, 0, 11]) ps.push(A.caja(x, 0, z0 + 1, 3, W + 0.7, H, { mat: 'hierro', tono: -0.05 }));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(A.caja(sx * (L / 2 - 1.5), sy * (W / 2 - 1.5), z0 + 1, 3.6, 3.6, H + 0.2, { mat: 'bronce', tono: -0.05 }));
    for (const sx of [-1, 1]) ps.push(A.cilindro(sx * (L / 2 + 0.5), 0, z0 + 9, 2.6, 0.8, { mat: 'hierro', eje: [1, 0, 0] }));
    const zt = z0 + 1 + H;
    if (v === 'cerrado') {
      ps.push(A.cilindro(-L / 2, 0, zt, W / 2, L, { mat: 'madera', eje: [1, 0, 0] }));
      for (const x of [-11, 0, 11]) ps.push(A.cilindro(x - 1.5, 0, zt, W / 2 + 0.4, 3, { mat: 'hierro', eje: [1, 0, 0] }));
      for (const x of [-L / 2 - 0.2, L / 2 - 1.6]) ps.push(A.cilindro(x, 0, zt, W / 2 + 0.3, 1.8, { mat: 'bronce', eje: [1, 0, 0] }));
      ps.push(A.caja(0, W / 2 + 0.3, zt - 7, 7, 1.4, 8, { mat: 'bronce', tono: 0.08 }), A.cilindro(0, W / 2 + 0.8, zt - 4, 1.6, 0.8, { mat: 'negro', eje: [0, 1, 0] }), A.caja(0, W / 2 + 1.2, zt - 7.5, 1, 0.6, 3, { mat: 'negro' }));
      ps.push(A.cilindro(0, W / 2 + 1, zt + 3, 2.6, 1, { mat: 'oro', eje: [0, 1, 0.6] }));
      return ps;
    }
    ps.push(A.caja(0, 0, z0 + 3.5, L - 4, W - 4, H, { mat: 'madera', resta: true }), A.caja(0, 0, z0 + 3, L - 4, W - 4, 1, { mat: 'negro' }));
    ps.push(A.caja(0, -W / 2 - 2, zt - 0.5, L, 4, W, { mat: 'madera', incl: 18 }));
    for (const x of [-11, 0, 11]) ps.push(A.caja(x, -W / 2 - 1.9, zt - 0.5, 3, 4.6, W, { mat: 'hierro', incl: 18 }));
    ps.push(A.elipsoide(-6, 0, zt - 4, 9, 6, 3.5, { mat: 'oro' }), A.elipsoide(7, 1, zt - 3, 7, 6, 3, { mat: 'tela_morada' }));
    ps.push(A.palo([2, -4, zt - 2], [14, 3, zt + 4], 0.7, { mat: 'acero' }), A.caja(4, -3, zt - 2, 1, 4, 1, { mat: 'bronce', giro: 30 }));
    ps.push(A.poliedro([[-4, 2, zt], [-2, 1, zt + 2], [-2, 3, zt + 2], [0, 2, zt], [-2, 2, zt + 3]], { mat: 'cristal' }));
    return ps;
  },
});

// ------------------------------------------------------------------ puente y bote
registrar(
  {
    id: 'camp_puente', nombre: ['Puente de madera', 'Wooden bridge'], tema: 'campamento', variantes: ['x', 'y', 'roto_x', 'roto_y'], huella: [5, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const A = girado(a, v.endsWith('y') ? 90 : 0);
      const roto = v.startsWith('roto'), z = 8;
      for (const s of [-1, 1]) ps.push(A.caja(0, s * 11, z - 4, 84, 3, 4, { mat: 'madera_vieja' }));
      for (const x of [-38, 0, 38]) for (const s of [-1, 1]) ps.push(A.cilindro(x, s * 15, -18, 2.4, z + 18 + 16, { mat: 'corteza' }));
      for (const x of [-38, 0, 38]) ps.push(A.palo([x, -15, z - 2], [x, 15, z - 2], 1.6, { mat: 'madera_vieja' }));
      for (let i = 0; i < 17; i++) {
        const x = -40 + i * 5 + 2.5;
        if (roto && (i === 9 || i === 10 || (i === 11 && a.r() < 2))) continue;
        ps.push(A.caja(x + (a.r() - 0.5) * 0.6, (a.r() - 0.5) * 1.5, z, 4.6, 30 - a.r() * 2, 1.8, { mat: 'madera', giro: (a.r() - 0.5) * 3, tono: (a.r() - 0.5) * 0.18 }));
      }
      // barandas
      for (const s of [-1, 1]) {
        if (roto && s === 1) { ps.push(A.palo([-38, 15, z + 15], [-2, 15, z + 15], 1.1, { mat: 'madera' }), A.palo([0, 15, z + 15], [16, 20, z + 2], 1.1, { mat: 'madera' })); continue; }
        ps.push(A.palo([-39, s * 15, z + 15], [39, s * 15, z + 15], 1.1, { mat: 'madera' }), A.palo([-39, s * 15, z + 7], [39, s * 15, z + 7], 0.5, { mat: 'cuerda' }));
      }
      if (roto) ps.push(A.caja(8, 4, z - 5, 4.6, 26, 1.8, { mat: 'madera', incl: 30, giro: 70, tono: -0.1 }));
      return ps;
    },
  },
  {
    id: 'camp_bote', nombre: ['Bote de remos', 'Rowboat'], tema: 'campamento', variantes: ['varado', 'volcado'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 30, 16, 3, 'arena');
      const A = girado(a, (a.r() - 0.5) * 20 - 15);
      if (v === 'volcado') {
        ps.push(A.elipsoide(0, 0, 0, 25, 10, 9, { mat: 'madera_vieja' }), A.caja(0, 0, -10, 60, 30, 10, { mat: 'madera', resta: true }));
        ps.push(A.elipsoide(0, 0, 0, 25.6, 10.4, 2, { mat: 'madera', tono: -0.1 }), A.palo([-24, 0, 7.5], [24, 0, 7.5], 1.2, { mat: 'madera', tono: 0.05 }));
        ps.push(A.palo([-6, 13, 0.8], [18, 16, 1], 0.8, { mat: 'madera' }), A.caja(20, 16.4, 0, 6, 1, 3, { mat: 'madera', giro: 5 }));
        return ps;
      }
      // casco: medio elipsoide hueco, borda, bancos, remos
      ps.push(A.elipsoide(0, 0, 9, 25, 10, 9, { mat: 'madera' }));
      ps.push(A.caja(0, 0, 10.5, 60, 30, 20, { mat: 'madera', resta: true }), A.elipsoide(0, 0, 10, 23, 8.4, 7.6, { mat: 'madera', resta: true }));
      ps.push(A.elipsoide(0, 0, 9.6, 25.2, 10.2, 1.2, { mat: 'madera_vieja', tono: 0.08 }));
      ps.push(A.elipsoide(0, 0, 10.4, 23, 8.4, 1.6, { mat: 'madera', resta: true }));
      ps.push(A.elipsoide(0, 0, 4, 18, 5, 1.5, { mat: 'agua_sucia' }));
      for (const x of [-8, 6]) ps.push(A.caja(x, 0, 6.5, 4, 17, 1.6, { mat: 'madera_lisa' }));
      ps.push(A.palo([-14, -3, 7.5], [16, -1, 10], 0.8, { mat: 'madera' }), A.caja(16, -1, 9, 6, 2.5, 0.8, { mat: 'madera', giro: 5 }));
      ps.push(A.palo([-16, 3, 7.5], [12, 4, 9.5], 0.8, { mat: 'madera' }), A.caja(12, 4, 8.5, 6, 2.5, 0.8, { mat: 'madera', giro: 3 }));
      ps.push(A.palo([25, 0, 9], [40, 6, 0.6], 0.5, { mat: 'cuerda' }), A.cilindro(40, 6, 0, 2, 4, { mat: 'madera' }));
      return ps;
    },
  },
);
