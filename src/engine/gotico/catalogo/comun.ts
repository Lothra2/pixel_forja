import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';

// Lo de siempre: cofres, piedras de viaje, portales, pozos, santuarios, urnas, oro, escaleras y bocas de cueva.
MATERIALES.comun_vida = { rampa: ['#2a0507', '#4a090b', '#6e1210', '#93201a', '#b8382a', '#d86650', '#eea08a'], ruido: 0.45, escala: 0.16, emite: true };
MATERIALES.comun_mana = { rampa: ['#060a26', '#0c164a', '#162874', '#22409e', '#3462c2', '#5e8edc', '#a2c4f2'], ruido: 0.45, escala: 0.16, emite: true };
MATERIALES.comun_portal = { rampa: ['#07112e', '#0e2258', '#183a88', '#2758b4', '#3f80d8', '#78b0f0', '#c6e2ff'], ruido: 0.55, escala: 0.18, emite: true };
MATERIALES.comun_luz_dia = { rampa: ['#4a3e2c', '#665640', '#837056', '#a08c6e', '#bca888', '#d6c6a6'], ruido: 0.3, escala: 0.12, emite: true };
MATERIALES.comun_barro = { rampa: ['#1c0f09', '#311b11', '#482819', '#603622', '#78462d', '#8f583a', '#a46b4a'], ruido: 0.22, escala: 0.3 };

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
/** Mancha de tierra en el piso y unas piedritas sueltas. */
function suelo(a: Arma, ps: Pieza[], rx: number, ry: number, n = 3, mat = 'tierra') {
  ps.push(a.elipsoide(0, 0, 0, rx, ry, 1.6, { mat, giro: (a.r() - 0.5) * 30 }));
  for (let i = 0; i < n; i++) {
    const ang = a.r() * Math.PI * 2, d = 0.75 + a.r() * 0.3;
    ps.push(a.elipsoide(Math.cos(ang) * rx * d, Math.sin(ang) * ry * d, 0.4, 1.4 + a.r() * 1.6, 1.2 + a.r() * 1.2, 1 + a.r(), { mat: 'piedra', giro: a.r() * 180, tono: (a.r() - 0.5) * 0.2 }));
  }
}
/** Monedas sueltas alrededor de (x,y) en un radio. */
function monedas(a: Arma, ps: Pieza[], n: number, x: number, y: number, rad: number, z = 0) {
  for (let i = 0; i < n; i++) {
    const ang = a.r() * Math.PI * 2, d = Math.sqrt(a.r()) * rad;
    ps.push(a.cilindro(x + Math.cos(ang) * d, y + Math.sin(ang) * d, z, 1.9, 0.8, { mat: 'oro', incl: (a.r() - 0.5) * 30, giro: a.r() * 180, tono: (a.r() - 0.5) * 0.2 }));
  }
}
/** Destellos: crucecitas de luz (para lo dorado que reluce). */
function destello(A: G | Arma, ps: Pieza[], x: number, y: number, z: number, t = 3) {
  ps.push(A.caja(x, y, z - t / 2, 0.9, 0.9, t, { mat: 'luz_vela' }), A.caja(x, y, z - 0.45, t * 0.9, 0.9, 0.9, { mat: 'luz_vela', giro: -45 }));
}
/** Calavera mirando a la cámara (hacia +x+y). */
function calavera(A: G | Arma, ps: Pieza[], x: number, y: number, z: number, r: number, ojo = 'negro', giro = 0) {
  const g = ((45 + giro) * Math.PI) / 180, fx = Math.cos(g), fy = Math.sin(g), px = -fy, py = fx;
  ps.push(A.elipsoide(x, y, z, r, r * 0.9, r * 0.95, { mat: 'hueso', giro: 45 + giro }));
  ps.push(A.caja(x + fx * r * 0.45, y + fy * r * 0.45, z - r * 0.95, r * 1.1, r * 0.9, r * 0.6, { mat: 'hueso', giro: 45 + giro, tono: -0.05 }));
  for (const sgn of [-1, 1]) ps.push(A.esfera(x + fx * r * 0.78 + px * sgn * r * 0.38, y + fy * r * 0.78 + py * sgn * r * 0.38, z - r * 0.08, r * 0.3, { mat: ojo }));
  ps.push(A.esfera(x + fx * r * 0.9, y + fy * r * 0.9, z - r * 0.5, r * 0.16, { mat: 'negro' }));
}

// ------------------------------------------------------------------ cofres
interface OpcCofre { L: number; W: number; H: number; z0?: number; madera: string; herraje: string; tapa: 'curva' | 'plana' | 'domo'; bandas: number[]; abierto: boolean; oro: boolean }
function cofre(A: G, ps: Pieza[], o: OpcCofre) {
  const { L, W, H, madera, herraje } = o, z0 = o.z0 ?? 0, zt = z0 + H;
  ps.push(A.caja(0, 0, z0, L, W, H, { mat: madera }));
  ps.push(A.caja(0, 0, z0, L + 0.8, W + 0.8, 1.6, { mat: herraje }));
  for (const x of o.bandas) ps.push(A.caja(x, 0, z0, 2.2, W + 0.7, H + 0.3, { mat: herraje, tono: -0.05 }));
  if (!o.abierto) {
    if (o.tapa === 'curva') {
      ps.push(A.cilindro(-L / 2, 0, zt, W / 2, L, { mat: madera, eje: [1, 0, 0], tono: 0.04 }));
      for (const x of o.bandas) ps.push(A.cilindro(x - 1.1, 0, zt, W / 2 + 0.4, 2.2, { mat: herraje, eje: [1, 0, 0] }));
    } else if (o.tapa === 'domo') {
      ps.push(A.elipsoide(0, 0, zt, L / 2, W / 2, W * 0.42, { mat: madera, tono: 0.04 }));
      ps.push(A.cilindro(0, -W / 2, zt, W * 0.42 + 0.3, W, { mat: herraje, eje: [0, 1, 0], r1: W * 0.42 + 0.3 }));
      ps.push(A.cilindro(-L / 2, 0, zt, 1.2, L, { mat: herraje, eje: [1, 0, 0] }));
    } else {
      ps.push(A.poliedro([[-L / 2 - 0.4, -W / 2 - 0.4, zt], [L / 2 + 0.4, -W / 2 - 0.4, zt], [L / 2 + 0.4, W / 2 + 0.4, zt], [-L / 2 - 0.4, W / 2 + 0.4, zt],
        [-L / 2 + 1, -W / 2 + 3, zt + 5], [L / 2 - 1, -W / 2 + 3, zt + 5], [L / 2 - 1, W / 2 - 3, zt + 5], [-L / 2 + 1, W / 2 - 3, zt + 5]], { mat: madera, tono: 0.04 }));
      for (const x of o.bandas) ps.push(A.poliedro([[x - 1.1, -W / 2 - 0.8, zt - 0.2], [x + 1.1, -W / 2 - 0.8, zt - 0.2], [x + 1.1, W / 2 + 0.8, zt - 0.2], [x - 1.1, W / 2 + 0.8, zt - 0.2],
        [x - 1.1, -W / 2 + 2.6, zt + 5.4], [x + 1.1, -W / 2 + 2.6, zt + 5.4], [x + 1.1, W / 2 - 2.6, zt + 5.4], [x - 1.1, W / 2 - 2.6, zt + 5.4]], { mat: herraje }));
    }
    // cerradura
    ps.push(A.caja(0, W / 2 + 0.2, zt - 5.5, 4.2, 1.4, 6, { mat: herraje, tono: 0.1 }), A.caja(0, W / 2 + 0.9, zt - 4.5, 1.1, 0.6, 2.4, { mat: 'negro' }));
  } else {
    ps.push(A.caja(0, 0, z0 + 2.5, L - 3, W - 3, H + 2, { mat: madera, resta: true }));
    ps.push(A.caja(0, 0, z0 + 2, L - 3, W - 3, 1.5, { mat: 'negro' }));
    // la tapa abierta, apoyada hacia atrás
    const ab = W * (o.tapa === 'plana' ? 1 : 1.05);
    ps.push(A.caja(0, -W / 2 - 1.6, zt - 0.5, L, 3.2, ab, { mat: madera, incl: 16, tono: -0.06 }));
    for (const x of o.bandas) ps.push(A.caja(x, -W / 2 - 1.5, zt - 0.5, 2.2, 3.8, ab, { mat: herraje, incl: 16 }));
    if (o.oro) {
      ps.push(A.elipsoide(0, 0, zt - 2.5, L / 2 - 1.8, W / 2 - 1.8, 3.6, { mat: 'oro' }));
      ps.push(A.poliedro([[-3, 0, zt + 0.6], [-1, -1.5, zt + 2.6], [-1, 1.5, zt + 2.6], [1, 0, zt + 0.6], [-1, 0, zt + 3.2]], { mat: 'cristal' }));
      ps.push(A.cilindro(L / 4, -1, zt, 1.8, 4.5, { mat: 'oro', r1: 2.4, tono: 0.1 }));
      destello(A, ps, -L / 4, 1, zt + 2.5);
      destello(A, ps, L / 5, W / 4, zt + 1.5, 2.4);
    }
  }
}

registrar(
  {
    id: 'com_cofre', nombre: ['Cofre de madera', 'Wooden chest'], tema: 'comun', variantes: ['cerrado', 'abierto', 'con_oro'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 17, 12, 2);
      const A = girado(a, (a.r() - 0.5) * 16);
      cofre(A, ps, { L: 22, W: 13, H: 10, madera: 'madera', herraje: 'hierro_oxido', tapa: 'curva', bandas: [-7, 7], abierto: v !== 'cerrado', oro: v === 'con_oro' });
      if (v === 'con_oro') monedas(a, ps, 6, 6, 12, 7);
      return ps;
    },
  },
  {
    id: 'com_cofre_herrado', nombre: ['Cofre herrado', 'Iron-bound chest'], tema: 'comun', variantes: ['cerrado', 'abierto', 'con_oro'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 21, 14, 3);
      const A = girado(a, (a.r() - 0.5) * 12);
      const L = 28, W = 16, H = 13;
      cofre(A, ps, { L, W, H, madera: 'madera', herraje: 'hierro', tapa: 'plana', bandas: [-9, 0, 9], abierto: v !== 'cerrado', oro: v === 'con_oro' });
      // esquineros y asas
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(A.caja(sx * (L / 2 - 1), sy * (W / 2 - 1), 0, 3.2, 3.2, H + 0.2, { mat: 'hierro', tono: 0.05 }));
      for (const sx of [-1, 1]) ps.push(A.caja(sx * (L / 2 + 0.6), 0, H - 6, 1.2, 6, 1.6, { mat: 'hierro' }), A.caja(sx * (L / 2 + 1.2), 0, H - 8, 1, 6, 2.2, { mat: 'hierro' }));
      if (v === 'con_oro') monedas(a, ps, 8, 8, 13, 8);
      return ps;
    },
  },
  {
    id: 'com_cofre_ornado', nombre: ['Cofre ornamentado', 'Ornate chest'], tema: 'comun', variantes: ['cerrado', 'abierto', 'dorado'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 19, 13, 2);
      const A = girado(a, (a.r() - 0.5) * 12);
      const L = 24, W = 15, H = 15, z0 = 3;
      const madera = v === 'dorado' ? 'oro' : 'madera_lisa', trim = v === 'dorado' ? 'bronce' : 'oro';
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(A.elipsoide(sx * (L / 2 - 1.5), sy * (W / 2 - 1.5), 1.8, 2.6, 2.6, 2.4, { mat: trim }));
      cofre(A, ps, { L, W, H, z0, madera, herraje: trim, tapa: 'curva', bandas: [-L / 2 + 2, 0, L / 2 - 2], abierto: v === 'abierto', oro: v === 'abierto' });
      ps.push(A.caja(0, 0, z0 + H - 1.6, L + 0.7, W + 0.7, 1.6, { mat: trim, tono: -0.1 }));
      // medallón al frente
      ps.push(A.cilindro(-5, W / 2, z0 + 7, 2.6, 0.9, { mat: trim, eje: [0, 1, 0] }), A.cilindro(5, W / 2, z0 + 7, 2.6, 0.9, { mat: trim, eje: [0, 1, 0] }));
            if (v === 'dorado') {
        for (let i = 0; i < 4; i++) destello(a, ps, (a.r() - 0.5) * 22, (a.r() - 0.3) * 12, z0 + 6 + a.r() * 14, 2.5 + a.r() * 2);
        return { piezas: ps, resplandor: { c: [0, 0, 14], r: 28, color: '#e8c060' } };
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ piedra de viaje
registrar({
  id: 'com_piedra_viaje', nombre: ['Piedra de viaje', 'Travel stone'], tema: 'comun', variantes: ['apagada', 'encendida'], cuadros: 6, t: 3, huella: [3, 3], bloquea: false,
  armar: (v, f, a) => {
    const on = v === 'encendida';
    const pulso = on ? Math.sin((f / 6) * Math.PI * 2) * 0.12 : 0;
    const runa = (t = 0) => (on ? { mat: 'runa', tono: t + pulso } : { mat: 'piedra_gris', tono: -0.32 });
    const ps: Pieza[] = [];
    suelo(a, ps, 34, 34, 5);
    ps.push(a.caja(0, 0, 0, 52, 52, 2.5, { mat: 'piedra_bloques', tono: -0.05 }));
    ps.push(a.caja(0, 0, 2.5, 44, 44, 3, { mat: 'piedra_gris' }));
    // losas del borde corridas por la semilla
    for (let i = 0; i < 4; i++) ps.push(a.caja((a.r() - 0.5) * 40, (a.r() - 0.5) * 40, 2.5, 6 + a.r() * 5, 5 + a.r() * 4, 3.4, { mat: 'piedra_gris', giro: a.r() * 10, tono: (a.r() - 0.5) * 0.15 }));
    ps.push(a.cilindro(0, 0, 5.5, 17, 0.6, { mat: 'marmol_negro' }));
    // anillo de runas y el sello del centro
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      ps.push(a.caja(Math.cos(ang) * 14, Math.sin(ang) * 14, 6, i % 3 ? 2 : 3, 4.5, 0.6, { ...runa(i % 2 ? 0 : -0.1), giro: (ang * 180) / Math.PI }));
    }
    for (const g of [0, 60, 120]) ps.push(a.caja(0, 0, 6, 18, 1.8, 0.6, { ...runa(-0.05), giro: g + 15 }));
    ps.push(a.cilindro(0, 0, 6, 3.4, 0.7, runa(0.1)));
    // cuatro pilares de esquina: atrás altos, adelante gastados
    const pil: [number, number, number][] = [[-19, -19, 34], [19, -19, 24], [-19, 19, 24], [19, 19, 9 + a.r() * 5]];
    for (const [x, y, h] of pil) {
      ps.push(a.caja(x, y, 5.5, 8, 8, 2.5, { mat: 'piedra_bloques' }));
      ps.push(a.caja(x, y, 8, 6, 6, h, { mat: 'piedra_gris', giro: (a.r() - 0.5) * 6 }));
      if (h > 20) {
        ps.push(a.caja(x, y, 8 + h, 8, 8, 2.5, { mat: 'piedra_bloques' }), a.poliedro([[x - 3, y - 3, 10.5 + h], [x + 3, y - 3, 10.5 + h], [x + 3, y + 3, 10.5 + h], [x - 3, y + 3, 10.5 + h], [x, y, 15 + h]], { mat: 'piedra_gris' }));
        // glifo hacia el centro
        const dx = -Math.sign(x), dy = -Math.sign(y);
        ps.push(a.caja(x + dx * 3, y, 14, 0.8, 2, 8, runa()), a.caja(x, y + dy * 3, 14, 2, 0.8, 8, runa()));
        ps.push(a.caja(x + dx * 3, y, 24, 0.8, 2, 4, runa(-0.1)), a.caja(x, y + dy * 3, 24, 2, 0.8, 4, runa(-0.1)));
      } else ps.push(a.caja(x + 2, y + 1, 8 + h - 1, 4, 4, 2, { mat: 'piedra_gris', giro: 30, tono: -0.1 }));
    }
    if (!on) return ps;
    // chispas que suben del sello
    for (let k = 0; k < 7; k++) {
      const ang = (k / 7) * Math.PI * 2 + k, rad = 4 + (k % 3) * 4;
      const fase = ((f / 6 + k / 7) % 1);
      ps.push(a.esfera(Math.cos(ang) * rad, Math.sin(ang) * rad, 8 + fase * 34, 1.3 * (1 - fase * 0.5), { mat: 'runa', tono: 0.2 - fase * 0.3 }));
    }
    return { piezas: ps, resplandor: { c: [0, 0, 8], r: 40, color: '#5ac8f0' } };
  },
});

// ------------------------------------------------------------------ portales
function portal(a: Arma, f: number, mat: string, escala: number): Pieza[] {
  const ps: Pieza[] = [];
  const zc = 5 + 27 * escala, w = Math.sin((f / 6) * Math.PI * 2);
  const d = 1 / Math.SQRT2;
  ps.push(a.elipsoide(0, 0, 0, 8 * escala, 8 * escala, 0.8, { mat, tono: -0.45 }));
  ps.push(a.elipsoide(0, 0, zc, (13 + w * 0.6) * escala, 1.6, (27 - w * 0.8) * escala, { mat, giro: -45, tono: -0.28 }));
  ps.push(a.elipsoide(0, 0, zc, 10.5 * escala, 2.2, (22 + w * 0.6) * escala, { mat, giro: -45, tono: -0.1 }));
  ps.push(a.elipsoide(0, 0, zc - 1, 6.5 * escala, 2.8, 15 * escala, { mat, giro: -45, tono: 0.12 }));
  ps.push(a.elipsoide(0, 0, zc - 2, 3 * escala, 3.2, 8 * escala, { mat, giro: -45, tono: 0.3 }));
  // remolino: gotas que giran en el plano del portal
  for (let k = 0; k < 10; k++) {
    const ang = (k / 10) * Math.PI * 2 + (f / 6) * Math.PI * 2 * (k % 2 ? 1 : -0.5);
    const rad = (k % 2 ? 9 : 5.5) * escala;
    const u = Math.cos(ang) * rad, h = Math.sin(ang) * rad * 2.1;
    ps.push(a.elipsoide(u * d + 2.2 * d, -u * d + 2.2 * d, zc + h, 2.4 * escala, 1, 1.4 * escala, { mat, giro: -45, incl: (ang * 180) / Math.PI, inclEje: 'y', tono: k % 3 ? 0.18 : -0.05 }));
  }
  return ps;
}
registrar(
  {
    id: 'com_portal_azul', nombre: ['Portal al pueblo', 'Town portal'], tema: 'comun', variantes: ['abierto', 'abriendose'], cuadros: 6, t: 3, huella: [1, 1], bloquea: false,
    armar: (v, f, a) => ({ piezas: portal(a, f, 'comun_portal', v === 'abierto' ? 1 : 0.55), resplandor: { c: [0, 0, 30], r: 46, color: '#5a9ae8' } }),
  },
  {
    id: 'com_portal_rojo', nombre: ['Portal rojo', 'Red portal'], tema: 'comun', variantes: ['abierto', 'con_piedras'], cuadros: 6, t: 3, huella: [3, 2], bloquea: false,
    armar: (v, f, a) => {
      const ps = portal(a, f, 'portal_rojo', 1.15);
      if (v === 'con_piedras') {
        suelo(a, ps, 34, 30, 4, 'tierra');
        for (let i = 0; i < 5; i++) {
          const ang = Math.PI * (0.78 + i * 0.235), rad = 24 + a.r() * 3;
          const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad, h = 22 + a.r() * 16 + (i === 2 ? 12 : 0);
          const g = (ang * 180) / Math.PI + 90;
          ps.push(a.caja(x, y, 0, 9, 6, h, { mat: 'roca', giro: g, incl: (a.r() - 0.5) * 10 }));
          ps.push(a.poliedro([[x - 4, y - 3, h], [x + 4, y + 3, h], [x + 3, y - 3, h], [x - 3, y + 3, h], [x + (a.r() - 0.5) * 3, y, h + 5 + a.r() * 4]], { mat: 'roca' }));
          ps.push(a.caja(x + Math.cos(ang) * -3.2, y + Math.sin(ang) * -3.2, h * 0.35, 2, 0.9, h * 0.4, { mat: 'portal_rojo', giro: g, tono: -0.2 }));
        }
      }
      return { piezas: ps, resplandor: { c: [0, 0, 32], r: 50, color: '#d8402a' } };
    },
  },
);

// ------------------------------------------------------------------ pozos de vida y de maná
function pozo(a: Arma, v: string, f: number, liq: string, color: string, metal: string) {
  const ps: Pieza[] = [];
  suelo(a, ps, 24, 24, 4);
  ps.push(a.cilindro(0, 0, 0, 19, 3, { mat: 'piedra_bloques', r1: 18 }));
  ps.push(a.cilindro(0, 0, 3, 15.5, 9, { mat: 'piedra_gris', r1: 15 }));
  ps.push(a.cilindro(0, 0, 11.5, 16.5, 2.4, { mat: 'piedra_bloques', tono: 0.06 }));
  ps.push(a.cilindro(0, 0, 6, 12, 10, { mat: 'piedra', resta: true }));
  // cuatro postes con remate y una lámina de metal al frente
  for (let i = 0; i < 4; i++) {
    const ang = Math.PI / 4 + (i * Math.PI) / 2, x = Math.cos(ang) * 14.5, y = Math.sin(ang) * 14.5;
    if (i === 0) continue;
    ps.push(a.caja(x, y, 13.5, 4, 4, 10, { mat: 'piedra_gris', giro: (ang * 180) / Math.PI }));
    ps.push(a.esfera(x, y, 24.5, 2.6, { mat: metal }));
  }
  ps.push(a.cilindro(10.9, 10.9, 8, 3.2, 0.9, { mat: metal, eje: [1, 1, 0] }));
  ps.push(a.cilindro(11.4, 11.4, 8, 1.6, 0.9, { mat: v === 'seco' ? 'negro' : liq, eje: [1, 1, 0] }));
  if (v === 'seco') {
    ps.push(a.cilindro(0, 0, 6, 12.2, 1.5, { mat: 'tierra', tono: -0.15 }));
    for (let i = 0; i < 3; i++) ps.push(a.caja((a.r() - 0.5) * 12, (a.r() - 0.5) * 12, 7.4, 8, 0.9, 0.3, { mat: 'negro', giro: a.r() * 180 }));
    return ps;
  }
  for (let k = 0; k < 2; k++) {
    const r = 2.5 + (((f + k * 3) % 6) / 6) * 9;
    ps.push(a.cilindro(0, 0, 11.6, r, 0.5, { mat: liq, tono: 0.28 - r * 0.02 }));
    ps.push(a.cilindro(0, 0, 11.4, r - 1.3, 1, { mat: liq, resta: true }));
  }
  ps.push(a.cilindro(0, 0, 10, 12.2, 1.8, { mat: liq, tono: -0.12 }));
  return { piezas: ps, resplandor: { c: [0, 0, 14] as V3, r: 30, color } };
}
registrar(
  {
    id: 'com_pozo_vida', nombre: ['Pozo de vida', 'Health well'], tema: 'comun', variantes: ['lleno', 'seco'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => pozo(a, v, f, 'comun_vida', '#c03a2a', 'bronce'),
  },
  {
    id: 'com_pozo_mana', nombre: ['Pozo de maná', 'Mana well'], tema: 'comun', variantes: ['lleno', 'seco'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => pozo(a, v, f, 'comun_mana', '#3a66cc', 'hierro'),
  },
);

// ------------------------------------------------------------------ santuarios
registrar(
  {
    id: 'com_santuario_obelisco', nombre: ['Obelisco rúnico', 'Runic obelisk'], tema: 'comun', variantes: ['activo', 'gastado'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const on = v === 'activo', ps: Pieza[] = [];
      suelo(a, ps, 20, 20, 4);
      ps.push(a.caja(0, 0, 0, 26, 26, 3, { mat: 'piedra_bloques' }), a.caja(0, 0, 3, 19, 19, 3, { mat: 'piedra_gris' }));
      const top = on ? 56 : 50;
      ps.push(a.poliedro([[-5.5, -5.5, 6], [5.5, -5.5, 6], [5.5, 5.5, 6], [-5.5, 5.5, 6], [-3.4, -3.4, top], [3.4, -3.4, top], [3.4, 3.4, top], [-3.4, 3.4, top]], { mat: 'marmol_negro' }));
      if (on) ps.push(a.poliedro([[-3.4, -3.4, top], [3.4, -3.4, top], [3.4, 3.4, top], [-3.4, 3.4, top], [0, 0, top + 7]], { mat: 'marmol_negro', tono: 0.05 }));
      else ps.push(a.poliedro([[-3.4, -3.4, top], [3.4, -3.4, top], [3.4, 3.4, top], [-3.4, 3.4, top], [-1, 1, top + 3]], { mat: 'marmol_negro' }), a.caja(9, 12, 0, 5, 4, 3, { mat: 'marmol_negro', giro: 40 }));
      // runas en las dos caras que se ven
      for (let i = 0; i < 6; i++) {
        const z = 11 + i * 6.5, hw = 5.5 - ((z - 6) / (top - 6)) * 2.1;
        const m = on ? { mat: 'magia', tono: 0.1 - i * 0.04 } : { mat: 'negro' };
        const alto = i % 2 ? 3 : 4.5;
        ps.push(a.caja((a.r() - 0.5) * 2, hw - 0.4, z, i % 3 ? 2 : 3.4, 1.2, alto, m), a.caja(hw - 0.4, (a.r() - 0.5) * 2, z, 1.2, i % 2 ? 2 : 3.2, alto, m));
      }
      if (!on) { ps.push(a.caja(2, 5, 20, 0.8, 2, 14, { mat: 'negro', giro: 20, resta: true })); return ps; }
      ps.push(a.cilindro(0, 0, 6, 9.8, 0.5, { mat: 'magia', tono: -0.15 }), a.cilindro(0, 0, 6, 8.6, 1, { mat: 'magia', resta: true }));
      ps.push(a.poliedro([[0, 0, top + 10], [1.8, 0, top + 13], [0, 1.8, top + 13], [-1.8, 0, top + 13], [0, -1.8, top + 13], [0, 0, top + 17]], { mat: 'magia', tono: 0.15 }));
      return { piezas: ps, resplandor: { c: [0, 0, 30], r: 34, color: '#9040d0' } };
    },
  },
  {
    id: 'com_santuario_cuernos', nombre: ['Altar de los cuernos', 'Horned altar'], tema: 'comun', variantes: ['activo', 'gastado'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const on = v === 'activo', ps: Pieza[] = [];
      suelo(a, ps, 22, 18, 4);
      ps.push(a.caja(0, 0, 0, 30, 20, 4, { mat: 'piedra_bloques' }));
      ps.push(a.caja(0, 0, 4, 24, 14, 12, { mat: 'roca_roja', tono: -0.08 }), a.caja(0, 0, 16, 27, 17, 3, { mat: 'piedra_bloques', tono: 0.02 }));
      calavera(a, ps, 7, 7.2, 10, 3.3);
      calavera(a, ps, -5, 7.4, 10, 2.8, 'negro', 10);
      // cuernos: palos que se curvan hacia afuera y arriba
      for (const s of [-1, 1]) {
        // hacia afuera, arriba y la punta hacia adentro
        const cur: [number, number, number][] = [[9, -3, 19], [15, -4, 21], [20, -5, 26], [21.5, -5, 33], [19.5, -4, 39], [15.5, -3, 42.5], [12.5, -2, 43]];
        const roto = !on && s === 1;
        const n = roto ? 3 : cur.length;
        for (let k = 0; k < n - 1; k++) {
          const r0 = 3.8 * (1 - k / (cur.length - 1)) + 0.4, r1 = 3.8 * (1 - (k + 1) / (cur.length - 1)) + 0.4;
          ps.push(a.palo([s * cur[k][0], cur[k][1], cur[k][2]], [s * cur[k + 1][0], cur[k + 1][1], cur[k + 1][2]], r0, { mat: 'hueso', r1, tono: -0.1 + k * 0.03 }));
          ps.push(a.esfera(s * cur[k + 1][0], cur[k + 1][1], cur[k + 1][2], r1, { mat: 'hueso', tono: -0.1 + k * 0.03 }));
        }
        if (roto) ps.push(a.palo([16, 12, 0.8], [23, 9, 2], 2.2, { mat: 'hueso', r1: 1 }));
      }
      ps.push(a.cilindro(0, 0, 19, 4.5, 3, { mat: 'bronce', r1: 6 }));
      for (let i = 0; i < 3; i++) ps.push(a.caja(-6 + i * 5 + a.r(), 8.6, 9 - i, 1.2, 0.6, 6 + i * 2, { mat: 'sangre' }));
      if (!on) { ps.push(a.cilindro(0, 0, 21.5, 5, 1, { mat: 'piedra_gris', tono: -0.3 })); return ps; }
      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * Math.PI * 2;
        ps.push(a.cilindro(Math.cos(ang) * 1.8, Math.sin(ang) * 1.8, 21.5, 2.6, 7 + k * 3, { mat: 'fuego', r1: 0.3 }));
      }
      ps.push(a.elipsoide(0, 0, 22, 4.5, 4.5, 2, { mat: 'fuego', tono: 0.15 }));
      return { piezas: ps, resplandor: { c: [0, 0, 26], r: 34, color: '#ff8a3a' } };
    },
  },
  {
    id: 'com_santuario_estela', nombre: ['Estela de runas', 'Rune stele'], tema: 'comun', variantes: ['activo', 'gastado'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const on = v === 'activo', ps: Pieza[] = [];
      suelo(a, ps, 18, 12, 3);
      const A = girado(a, (a.r() - 0.5) * 10);
      const inc = on ? 0 : 5;
      ps.push(A.caja(0, 0, 0, 26, 13, 4, { mat: 'piedra_bloques' }));
      ps.push(A.caja(0, 0, 4, 18, 6, 38, { mat: 'piedra', incl: inc, inclEje: 'y', tono: 0.05 }));
      ps.push(A.cilindro(0, -3, 42, 9, 6, { mat: 'piedra', eje: [0, 1, 0], tono: 0.05 }));
      // surcos tallados en la cara del frente, rellenos de luz si está vivo
      const surcos: [number, number, number, number][] = [[0, 34, 2, 8], [-4, 26, 2, 5], [4, 26, 2, 5], [0, 20, 10, 1.6], [-3, 12, 2, 6], [3, 12, 2, 6], [0, 8, 8, 1.6], [0, 44, 6, 1.6]];
      for (const [x, z, w, h] of surcos) ps.push(A.caja(x, 3, z, w, 2, h, { mat: 'piedra', resta: true }));
      if (on) for (const [x, z, w, h] of surcos) ps.push(A.caja(x, 2.4, z, w, 1, h, { mat: 'runa', tono: 0.05 }));
      else {
        ps.push(A.elipsoide(-6, 3, 6, 4, 1.4, 5, { mat: 'musgo' }), A.elipsoide(8, -2, 46, 4, 3, 2, { mat: 'musgo' }));
        ps.push(A.caja(12, 6, 0, 5, 4, 3.4, { mat: 'piedra_gris', giro: 25 }));
      }
      return on ? { piezas: ps, resplandor: { c: [0, 8, 26], r: 18, color: '#5ac8f0' } } : ps;
    },
  },
  {
    id: 'com_santuario_calaveras', nombre: ['Santuario de calaveras', 'Skull shrine'], tema: 'comun', variantes: ['activo', 'gastado'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const on = v === 'activo', ps: Pieza[] = [];
      suelo(a, ps, 21, 21, 3);
      ps.push(a.elipsoide(0, 0, 0, 15, 15, 6, { mat: 'tierra', tono: -0.05 }));
      // poste con la calavera mayor y astas
      ps.push(a.palo([-1, -1, 0], [0, 0, 42], 2, { mat: 'madera_vieja', r1: 1.5 }));
      ps.push(a.palo([-7, 0, 36], [7, 0, 36], 1.2, { mat: 'madera_vieja' }));
      calavera(a, ps, 0, 0, 46, 5, on ? 'fuego_verde' : 'negro');
      for (const s of [-1, 1]) ps.push(a.palo([s * 3, -1, 49], [s * 9, -2, 56], 1.6, { mat: 'hueso', r1: 0.5 }), a.palo([s * 9, -2, 56], [s * 10, -3, 62], 0.9, { mat: 'hueso', r1: 0.3 }));
      for (const s of [-1, 1]) calavera(a, ps, s * 7, 0, 31, 2.6);
      // montón de calaveras
      const pos: [number, number, number][] = [[-8, 4, 5], [-2, 8, 5], [5, 7, 5], [9, 0, 5], [-9, -5, 5], [-3, 3, 10], [3, 2, 10], [7, 5, 4]];
      pos.forEach(([x, y, z], i) => calavera(a, ps, x + (a.r() - 0.5) * 2, y + (a.r() - 0.5) * 2, z, 3 + a.r() * 0.6, i === 5 && on ? 'fuego_verde' : 'negro', (a.r() - 0.5) * 50));
      for (let i = 0; i < 3; i++) ps.push(a.palo([-12 + i * 8, 10, 0.8], [-6 + i * 8, 13 + a.r() * 3, 1.5], 1.1, { mat: 'hueso' }));
      // velas
      const velas: [number, number][] = [[12, 9], [-11, 10], [13, -6], [2, 14]];
      for (const [x, y] of velas) {
        const h = on ? 6 + a.r() * 5 : 2 + a.r() * 2;
        ps.push(a.cilindro(x, y, 0, 1.5, h, { mat: 'cera' }));
        if (on) ps.push(a.cilindro(x, y, h, 0.9, 2.6, { mat: 'luz_vela', r1: 0.2 }));
      }
      return on ? { piezas: ps, resplandor: { c: [0, 0, 20], r: 34, color: '#7ad060' } } : ps;
    },
  },
  {
    id: 'com_santuario_caldero', nombre: ['Caldero de las brujas', 'Cauldron shrine'], tema: 'comun', variantes: ['activo', 'gastado'], cuadros: 4, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const on = v === 'activo', ps: Pieza[] = [];
      suelo(a, ps, 21, 21, 2);
      for (let i = 0; i < 7; i++) { const ang = (i / 7) * Math.PI * 2 + a.r() * 0.3; ps.push(a.elipsoide(Math.cos(ang) * 15, Math.sin(ang) * 15, 1, 3.6 + a.r() * 1.5, 3 + a.r(), 2.6 + a.r() * 1.5, { mat: 'piedra', giro: (ang * 180) / Math.PI })); }
      for (let i = 0; i < 3; i++) { const ang = (i / 3) * Math.PI * 2 + 0.5; ps.push(a.palo([Math.cos(ang) * 11, Math.sin(ang) * 11, 0], [Math.cos(ang) * 8, Math.sin(ang) * 8, 9], 1.4, { mat: 'hierro' })); }
      // leña debajo
      for (let i = 0; i < 4; i++) { const ang = (i / 4) * Math.PI + a.r() * 0.3; ps.push(a.palo([Math.cos(ang) * 9, Math.sin(ang) * 9, 1], [-Math.cos(ang) * 9, -Math.sin(ang) * 9, 2.5], 1.5, { mat: on ? 'corteza' : 'corteza_muerta' })); }
      if (on) for (let k = 0; k < 3; k++) { const ang = (k / 3) * Math.PI * 2 + f; ps.push(a.cilindro(Math.cos(ang) * 4, Math.sin(ang) * 4, 2, 3, 6 + ((f + k) % 4) * 1.5, { mat: 'fuego', r1: 0.3 })); }
      ps.push(a.elipsoide(0, 0, 15, 13, 13, 10, { mat: 'hierro' }));
      ps.push(a.caja(0, 0, 21, 40, 40, 20, { mat: 'hierro', resta: true }));
      ps.push(a.cilindro(0, 0, 20, 11.5, 2.2, { mat: 'hierro', r1: 12.5, tono: 0.05 }));
      ps.push(a.cilindro(0, 0, 14, 10.4, 12, { mat: 'hierro', resta: true }));
      for (const s of [-1, 1]) ps.push(a.cilindro(s * 12, 0, 16, 2.5, 1, { mat: 'hierro', eje: [1, 0, 0] }));
      ps.push(a.cilindro(0, 0, 17, 10.6, 1.5, { mat: on ? 'fuego_verde' : 'baba', tono: on ? -0.25 : -0.1 }));
      if (on) {
        for (let k = 0; k < 4; k++) {
          const ang = k * 1.9 + 0.7, rad = 2 + (k % 3) * 2.6, ff = (f + k) % 4;
          ps.push(a.esfera(Math.cos(ang) * rad, Math.sin(ang) * rad, 18.3 + ff * 0.4, 0.9 + ff * 0.45, { mat: 'fuego_verde', tono: -0.05 + ff * 0.06 }));
        }
        ps.push(a.elipsoide(-2, 1, 26 + f * 2, 3 + f * 0.5, 3, 2, { mat: 'fuego_verde', tono: -0.35 }));
      } else ps.push(a.palo([3, -2, 18], [9, -8, 30], 0.9, { mat: 'madera_vieja' }));
      return on ? { piezas: ps, resplandor: { c: [0, 0, 20], r: 30, color: '#6ad040' } } : ps;
    },
  },
  {
    id: 'com_santuario_monolito', nombre: ['Monolito sagrado', 'Holy monolith'], tema: 'comun', variantes: ['activo', 'gastado'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const on = v === 'activo', ps: Pieza[] = [];
      suelo(a, ps, 20, 20, 3);
      ps.push(a.caja(0, 0, 0, 24, 24, 3, { mat: 'piedra_bloques' }), a.caja(0, 0, 3, 19, 19, 3, { mat: 'marmol' }));
      ps.push(a.caja(0, -2, 6, 15, 10, 48, { mat: 'marmol', tono: -0.05 }));
      ps.push(a.poliedro([[-7.5, -7, 54], [7.5, -7, 54], [7.5, 3, 54], [-7.5, 3, 54], [-7.5, -2, 60], [7.5, -2, 60]], { mat: 'marmol' }));
      // nicho tallado en el frente (+y) con una figura encapuchada y su aureola
      ps.push(a.caja(0, 3, 9, 11, 6, 30, { mat: 'marmol', resta: true }), a.cilindro(0, 0, 39, 5.5, 6, { mat: 'marmol', eje: [0, 1, 0], resta: true }));
      ps.push(a.caja(0, 0.3, 9, 11, 0.6, 30, { mat: 'marmol_negro', tono: 0.1 }));
      ps.push(a.cilindro(0, 0.2, 38.5, 4.8, 1, { mat: on ? 'luz_vela' : 'bronce', eje: [0, 1, 0], tono: on ? -0.15 : -0.05 }));
      ps.push(a.cilindro(0, 2, 9, 4.3, 25, { mat: 'marmol', r1: 2.9, tono: 0.08 }));
      ps.push(a.elipsoide(0, 3.6, 24, 2, 1.3, 1.6, { mat: 'marmol', tono: 0.12 }));
      if (on) ps.push(a.elipsoide(0, 2.2, 37, 2.8, 2.5, 3.4, { mat: 'marmol', tono: 0.1 }), a.elipsoide(0, 4.1, 36.6, 1.4, 0.7, 2, { mat: 'negro' }));
      else ps.push(a.elipsoide(7, 13, 1.8, 2.6, 2.4, 2.4, { mat: 'marmol', tono: -0.05 }), a.caja(4, 3.2, 20, 0.9, 2, 26, { mat: 'negro', giro: 15, resta: true }), a.elipsoide(-5, 4, 8, 5, 2, 3, { mat: 'musgo' }), a.elipsoide(5, -6, 55, 4, 3, 2, { mat: 'musgo' }));
      if (!on) return ps;
      ps.push(a.cilindro(0, 0, 6, 11, 0.5, { mat: 'luz_vela', tono: -0.2 }), a.cilindro(0, 0, 6, 9.8, 1, { mat: 'luz_vela', resta: true }));
      return { piezas: ps, resplandor: { c: [0, 6, 40], r: 34, color: '#f8e0a0' } };
    },
  },
);

// ------------------------------------------------------------------ urnas, ataúd, barril que explota, oro, sacos
registrar(
  {
    id: 'com_urna', nombre: ['Urna de barro', 'Clay urn'], tema: 'comun', variantes: ['entera', 'alta', 'rota'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 10, 10, 1);
      const m = 'comun_barro', g = a.r() * 360;
      if (v === 'alta') {
        ps.push(a.cilindro(0, 0, 0, 3.5, 3, { mat: m, r1: 2.5 }), a.elipsoide(0, 0, 13, 6.5, 6.5, 11, { mat: m }));
        ps.push(a.cilindro(0, 0, 9, 6.45, 2, { mat: m, tono: -0.28 }), a.cilindro(0, 0, 15, 6.25, 1.4, { mat: m, tono: -0.28 }));
        ps.push(a.cilindro(0, 0, 22, 3, 5, { mat: m, r1: 2.6 }), a.cilindro(0, 0, 27, 3.6, 1.6, { mat: m, tono: 0.05 }));
        const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180);
        for (const k of [-1, 1]) ps.push(a.palo([k * c * 2.8, k * s * 2.8, 26], [k * c * 6.5, k * s * 6.5, 23], 0.9, { mat: m }), a.palo([k * c * 6.5, k * s * 6.5, 23], [k * c * 5.2, k * s * 5.2, 18], 0.9, { mat: m }));
        return ps;
      }
      if (v === 'entera') {
        ps.push(a.cilindro(0, 0, 0, 4, 2, { mat: m, r1: 4.5 }), a.elipsoide(0, 0, 8.5, 7.5, 7.5, 7.5, { mat: m }));
        ps.push(a.cilindro(0, 0, 8, 7.52, 2.2, { mat: m, tono: -0.3 }), a.cilindro(0, 0, 14.5, 4.2, 2.4, { mat: m, r1: 3.8 }), a.cilindro(0, 0, 16.5, 5, 1.6, { mat: m, tono: 0.06 }));
        ps.push(a.elipsoide(0, 0, 18, 4, 4, 2.4, { mat: m, tono: -0.05 }), a.esfera(0, 0, 20.5, 1.2, { mat: m }));
        return ps;
      }
      ps.push(a.cilindro(0, 0, 0, 4, 2, { mat: m, r1: 4.5 }), a.elipsoide(0, 0, 8.5, 7.5, 7.5, 7.5, { mat: m }));
      ps.push(a.poliedro([[-10, -10, 7], [10, -10, 11], [10, 10, 14], [-10, 10, 9], [-10, -10, 30], [10, 10, 30], [10, -10, 30], [-10, 10, 30]], { mat: m, resta: true }));
      ps.push(a.elipsoide(0, 0, 8.5, 6.4, 6.4, 6.4, { mat: m, resta: true }));
      for (let i = 0; i < 5; i++) {
        const ang = a.r() * Math.PI * 2, d = 9 + a.r() * 4, x = Math.cos(ang) * d, y = Math.sin(ang) * d, s = 2 + a.r() * 2;
        ps.push(a.poliedro([[x - s, y, 0], [x + s, y - s * 0.6, 0], [x + s * 0.4, y + s, 0], [x, y, 1.2 + a.r()]], { mat: m, tono: (a.r() - 0.5) * 0.2 }));
      }
      monedas(a, ps, 3, 6, 6, 4);
      return ps;
    },
  },
  {
    id: 'com_ataud', nombre: ['Ataúd', 'Casket'], tema: 'comun', variantes: ['cerrado', 'abierto', 'piedra'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 22, 13, 3);
      const A = girado(a, (a.r() - 0.5) * 14);
      const piedra = v === 'piedra', m = piedra ? 'piedra_gris' : 'madera_vieja';
      const forma = (z0: number, z1: number, k = 1, dz = 0): V3[] => {
        const pl: [number, number][] = [[-15, -4], [-8, -7], [15, -5], [15, 5], [-8, 7], [-15, 4]];
        return [...pl.map(([x, y]) => [x * k, y * k, z0] as V3), ...pl.map(([x, y]) => [x * k, y * k, z1 + dz] as V3)];
      };
      ps.push(A.poliedro(forma(0, piedra ? 12 : 9), { mat: m }));
      if (v === 'abierto') {
        ps.push(A.poliedro(forma(2, 14, 0.82), { mat: m, resta: true }), A.poliedro(forma(2, 3, 0.82), { mat: 'negro' }));
        // huesos adentro
        calavera(A, ps, -10, 0, 4.6, 2.6, 'negro', -45);
        ps.push(A.elipsoide(-3, 0, 3.6, 4, 3.4, 1.4, { mat: 'hueso', tono: -0.1 }));
        for (const k of [-1, 1]) ps.push(A.caja(-3, k * 1.6, 3.6, 7, 0.9, 1.3, { mat: 'hueso', tono: -0.05 }), A.palo([2, k * 1.8, 3.5], [12, k * 2.6, 3.4], 0.8, { mat: 'hueso' }));
        ps.push(A.poliedro(forma(0, 2, 0.98).map(([x, y, z]) => [x + 2, y + 14, z] as V3), { mat: m, tono: -0.05 }));
        ps.push(A.caja(2, 14, 2, 3, 12, 0.6, { mat: 'hierro_oxido' }), A.caja(-4, 14, 2, 10, 2.5, 0.6, { mat: 'hierro_oxido' }));
        return ps;
      }
      if (piedra) {
        ps.push(A.poliedro(forma(12, 14, 1.06), { mat: 'piedra_gris', tono: 0.06 }), A.poliedro(forma(14, 16, 0.85), { mat: 'piedra_gris', tono: 0.1 }));
        ps.push(A.caja(-4, 7.2, 3, 16, 1, 5, { mat: 'piedra', resta: true }), A.elipsoide(-10, 4, 15, 4, 3, 2, { mat: 'musgo' }));
        return ps;
      }
      ps.push(A.poliedro(forma(9, 11, 1.05), { mat: m, tono: 0.06 }), A.poliedro(forma(11, 12, 0.8), { mat: m, tono: 0.1 }));
      ps.push(A.caja(-1, 0, 12, 14, 2, 0.8, { mat: 'hierro' }), A.caja(-4, 0, 12, 2, 8, 0.8, { mat: 'hierro' }));
      for (const x of [-8, 6]) for (const s of [-1, 1]) ps.push(A.caja(x, s * 6.6, 4, 4, 1, 1.4, { mat: 'hierro' }));
      return ps;
    },
  },
  {
    id: 'com_barril_explosivo', nombre: ['Barril explosivo', 'Exploding barrel'], tema: 'comun', variantes: ['entero', 'tumbado', 'reventado'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 11, 11, 2);
      if (v === 'reventado') {
        ps.push(a.elipsoide(0, 0, 0, 17, 15, 0.8, { mat: 'negro', giro: a.r() * 90 }));
        ps.push(a.cilindro(0, 0, 0, 7.5, 2, { mat: 'madera', r1: 7.8, tono: -0.2 }));
        for (let i = 0; i < 9; i++) {
          const ang = (i / 9) * Math.PI * 2 + a.r() * 0.4, d = 9 + a.r() * 7;
          ps.push(a.caja(Math.cos(ang) * d, Math.sin(ang) * d, 0, 2.6, 12 - a.r() * 6, 1, { mat: i % 4 ? 'madera' : 'hierro', giro: (ang * 180) / Math.PI + (a.r() - 0.5) * 40, tono: -0.1 - a.r() * 0.15 }));
        }
        for (let i = 0; i < 5; i++) ps.push(a.esfera((a.r() - 0.5) * 14, (a.r() - 0.5) * 14, 0.6, 0.9 + a.r() * 0.6, { mat: 'lava', tono: -0.15 }));
        ps.push(a.caja(-1, 1, 2, 4.6, 1, 8, { mat: 'madera', tono: -0.25, incl: 18 }), a.caja(2, -2, 2, 4, 1, 6, { mat: 'madera', tono: -0.2, incl: -25, giro: 70 }));
        return ps;
      }
      const tumb = v === 'tumbado';
      const ej = (z0: number, h: number, r0: number, r1: number, mat: string, tono = 0) => tumb
        ? a.cilindro(-8 + z0, 0, 8, r0, h, { mat, r1, eje: [1, 0, 0], tono })
        : a.cilindro(0, 0, z0, r0, h, { mat, r1, tono });
      ps.push(ej(0, 8.5, 7, 8, 'madera'), ej(8.5, 8.5, 8, 7, 'madera'));
      ps.push(ej(6, 5, 7.93, 8.06, 'tela_roja', 0.05), ej(2, 1.5, 7.42, 7.6, 'hierro'), ej(13.5, 1.5, 7.6, 7.42, 'hierro'));
      if (!tumb) {
        ps.push(a.cilindro(0, 0, 17, 6.8, 0.6, { mat: 'tela_roja' }));
        ps.push(a.caja(0, 0, 17.5, 9, 1.8, 0.5, { mat: 'negro', giro: 45 }), a.caja(0, 0, 17.5, 9, 1.8, 0.5, { mat: 'negro', giro: -45 }));
        ps.push(a.palo([2, -2, 17.4], [3, -3.5, 22], 0.7, { mat: 'cuerda' }), a.esfera(3, -3.5, 22.3, 0.9, { mat: 'fuego' }));
      } else {
        ps.push(a.elipsoide(9, 2, 0, 3, 5, 0.5, { mat: 'negro', tono: 0.1 }));
        ps.push(a.cilindro(9, 0, 8, 6.8, 0.6, { mat: 'tela_roja', eje: [1, 0, 0] }));
      }
      return ps;
    },
  },
  {
    id: 'com_oro', nombre: ['Montón de oro', 'Gold pile'], tema: 'comun', variantes: ['chico', 'mediano', 'grande'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const k = v === 'chico' ? 0 : v === 'mediano' ? 1 : 2;
      const r = [3, 6, 9][k], h = [1.5, 3, 5.5][k];
      ps.push(a.elipsoide(0, 0, 0, r, r * 0.85, h, { mat: 'oro', giro: a.r() * 180 }));
      if (k > 0) ps.push(a.elipsoide(r * 0.3, -r * 0.2, 0, r * 0.6, r * 0.5, h * 1.25, { mat: 'oro', tono: 0.06 }));
      monedas(a, ps, [5, 9, 14][k], 0, 0, r + 4);
      for (let i = 0; i < [3, 6, 9][k]; i++) {
        const ang = a.r() * Math.PI * 2, d = a.r() * r * 0.8;
        ps.push(a.cilindro(Math.cos(ang) * d, Math.sin(ang) * d, h * (1 - (d / r) ** 2) * 0.9, 1.9, 0.8, { mat: 'oro', incl: (a.r() - 0.5) * 50, giro: a.r() * 180, tono: 0.1 }));
      }
      if (k === 2) {
        ps.push(a.poliedro([[3, 4, 3], [5, 4, 5], [4, 6, 5], [4, 4.5, 7], [4, 5, 3.2]], { mat: 'cristal' }));
        ps.push(a.cilindro(-5, -2, 2, 1.6, 6, { mat: 'oro', r1: 2.8, incl: 25, tono: 0.08 }));
        destello(a, ps, -1, 2, h + 2, 3);
      }
      if (k === 1) destello(a, ps, 1, 0, h + 1.5, 2.4);
      return ps;
    },
  },
  {
    id: 'com_saco_botin', nombre: ['Saco de botín', 'Loot sack'], tema: 'comun', variantes: ['cerrado', 'abierto', 'varios'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const saco = (x: number, y: number, s: number, mat: string, abierto: boolean, g: number) => {
        ps.push(a.elipsoide(x, y, 5.5 * s, 7 * s, 6 * s, 6.2 * s, { mat, giro: g }));
        if (abierto) {
          ps.push(a.cilindro(x + 1.5 * s, y + 1.5 * s, 8 * s, 4.4 * s, 4 * s, { mat, r1: 5 * s, incl: 12, giro: g + 45 }));
          ps.push(a.cilindro(x + 2.3 * s, y + 2.3 * s, 10.5 * s, 3.4 * s, 4 * s, { mat, resta: true, incl: 12, giro: g + 45 }));
          ps.push(a.elipsoide(x + 2 * s, y + 2 * s, 10.6 * s, 3.6 * s, 3.6 * s, 1.2, { mat: 'oro' }));
        } else {
          ps.push(a.cilindro(x, y, 10.5 * s, 2.6 * s, 2.5 * s, { mat, r1: 1.8 * s }), a.cilindro(x, y, 11.2 * s, 2.3 * s, 1.1, { mat: 'cuerda' }));
          ps.push(a.elipsoide(x - 0.5, y, 14 * s, 3 * s, 2.4 * s, 1.8 * s, { mat, incl: 25, giro: g }));
        }
      };
      if (v === 'varios') {
        saco(-5, -4, 0.9, 'tela', false, a.r() * 90);
        saco(5, -2, 0.75, 'cuero', false, a.r() * 90);
        saco(-1, 6, 0.8, 'tela', true, a.r() * 90);
        monedas(a, ps, 5, 6, 10, 5);
      } else if (v === 'abierto') {
        saco(0, 0, 1, 'cuero', true, a.r() * 90);
        monedas(a, ps, 9, 7, 8, 6);
        ps.push(a.cilindro(9, 4, 0, 2.2, 1, { mat: 'oro', r1: 1 }), a.cilindro(9, 4, 1, 0.8, 4, { mat: 'oro' }), a.cilindro(9, 4, 5, 1.6, 3.5, { mat: 'oro', r1: 2.6 }));
      } else saco(0, 0, 1, 'tela', false, a.r() * 90);
      return ps;
    },
  },
);

// ------------------------------------------------------------------ escaleras, cueva, puerta secreta, palanca
registrar(
  {
    id: 'com_escalera', nombre: ['Escalera', 'Stairs'], tema: 'comun', variantes: ['bajada', 'bajada_madera'], huella: [3, 3], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      // un hueco en el piso: losa con el hueco cavado y los peldaños bajando hacia el fondo (-x)
      ps.push(a.cilindro(0, 0, -2, 34, 2, { mat: v === 'bajada' ? 'piedra_bloques' : 'tierra' }));
      if (v === 'bajada_madera') {
        ps.push(a.caja(-2, 0, -3, 22, 22, 4, { mat: 'tierra', resta: true }));
        ps.push(a.caja(-2, 0, -13, 22, 22, 2, { mat: 'negro' }));
        ps.push(a.caja(-13.5, 0, -13, 1, 22, 13, { mat: 'tierra', tono: -0.25 }), a.caja(-2, -11.5, -13, 22, 1, 13, { mat: 'tierra', tono: -0.15 }));
        // marco de vigas
        for (const s of [-1, 1]) ps.push(a.caja(-2, s * 12, 0, 27, 3, 2.5, { mat: 'madera' }), a.caja(-2 + s * 12, 0, 0, 3, 22, 2.5, { mat: 'madera', tono: -0.04 }));
        // escalera de mano
        for (const s of [-1, 1]) ps.push(a.palo([-11, s * 4.5, -12], [-6, s * 4.5, 6], 0.9, { mat: 'madera_vieja' }));
        for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5; ps.push(a.palo([-11 + t * 5, -4.5, -12 + t * 18], [-11 + t * 5, 4.5, -12 + t * 18], 0.7, { mat: 'madera_vieja' })); }
        // la trampilla abierta, apoyada atrás
        ps.push(a.caja(-2, -13.5, 2.5, 20, 2, 20, { mat: 'madera', incl: 14 }), a.caja(-8, -13.5, 2.5, 2.5, 2.6, 20, { mat: 'hierro', incl: 14 }), a.caja(4, -13.5, 2.5, 2.5, 2.6, 20, { mat: 'hierro', incl: 14 }));
        ps.push(a.cilindro(8, 13, 0, 3, 0.6, { mat: 'paja', r1: 2 }), a.elipsoide(-18, 14, 0, 6, 4, 1.4, { mat: 'paja' }));
        return ps;
      }
      ps.push(a.caja(-6, 0, -3, 30, 19, 4, { mat: 'piedra', resta: true }));
      ps.push(a.caja(-21.5, 0, -13, 2, 19, 11, { mat: 'piedra_bloques', tono: -0.08 }), a.caja(-6, -10, -13, 32, 2, 11, { mat: 'piedra_bloques', tono: 0 }));
      for (let i = 0; i < 6; i++) ps.push(a.caja(6.5 - i * 4.7, 0, -13, 4.8, 19, 11 - 1.85 * (i + 1), { mat: 'piedra_gris', tono: 0.14 - i * 0.04 }));
      ps.push(a.caja(-18, 0, -13, 6, 19, 1, { mat: 'negro' }));
      // brocal: murete atrás y a los costados
      ps.push(a.caja(-23, 0, 0, 4, 25, 6, { mat: 'piedra_bloques' }));
      for (const s of [-1, 1]) ps.push(a.caja(-6, s * 11.5, 0, 34, 4, s < 0 ? 6 : 3, { mat: 'piedra_bloques', tono: s > 0 ? 0.04 : 0 }));
      for (const s of [-1, 1]) ps.push(a.caja(-23, s * 11.5, 0, 5, 5, 9, { mat: 'piedra_gris' }), a.esfera(-23, s * 11.5, 10.5, 2.2, { mat: 'piedra_gris' }));
      ps.push(a.elipsoide(16, -13, 0.5, 3, 2.5, 2, { mat: 'piedra_gris', giro: 20 }), a.elipsoide(-10, 20, 0.5, 2.5, 2, 1.6, { mat: 'piedra_gris' }));
      return ps;
    },
  },
  {
    id: 'com_escalera_subida', nombre: ['Escalera que sube', 'Stairs up'], tema: 'comun', variantes: ['piedra', 'musgo'], huella: [3, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
        suelo(a, ps, 32, 30, 4);
        // muro de roca al fondo con un arco oscuro; los peldaños suben hacia él
        ps.push(a.caja(-26, 0, 0, 14, 60, 84, { mat: v === 'musgo' ? 'piedra_musgo' : 'piedra_bloques' }), a.caja(-26, 0, 84, 16, 62, 4, { mat: 'piedra_gris' }));
        ps.push(a.caja(-24, 0, 36, 20, 22, 30, { mat: 'piedra', resta: true }), a.cilindro(-34, 0, 66, 11, 20, { mat: 'piedra', eje: [1, 0, 0], resta: true }));
        ps.push(a.caja(-28, 0, 36, 4, 24, 44, { mat: 'negro' }));
        for (const s of [-1, 1]) ps.push(a.caja(-18.5, s * 12.5, 36, 2, 3, 31, { mat: 'piedra_gris' }));
        for (let i = 0; i < 7; i++) { const ang = (i / 6) * Math.PI; ps.push(a.caja(-18.5, Math.cos(ang) * 12.5, 66 + Math.sin(ang) * 12.5 - 1.8, 3, 4.5, 3.6, { mat: 'piedra_gris', incl: -(ang * 180) / Math.PI + 90, tono: i % 2 ? 0.05 : -0.03 })); }
        for (let i = 0; i < 9; i++) ps.push(a.caja(14 - i * 4, 0, 0, 4.3, 22, 4 * (i + 1), { mat: 'piedra_gris', tono: (a.r() - 0.5) * 0.12 - i * 0.015 }));
        // pretil a la izquierda y una piedra caída
        ps.push(a.poliedro([[16, -13, 0], [16, -17, 0], [-19, -13, 0], [-19, -17, 0], [16, -13, 8], [16, -17, 8], [-19, -13, 42], [-19, -17, 42]], { mat: v === 'musgo' ? 'piedra_musgo' : 'piedra_bloques' }));
        ps.push(a.elipsoide(20, 16, 1, 4, 3, 2.5, { mat: 'piedra_gris', giro: 30 }));
        return ps;
      if (v === 'musgo') ps.push(a.elipsoide(-19, -15, 40, 5, 3, 3, { mat: 'musgo' }), a.elipsoide(-19, 20, 70, 4, 6, 4, { mat: 'musgo' }), a.elipsoide(10, 8, 8, 4, 5, 1.2, { mat: 'musgo' }));
      return ps;
    },
  },
  {
    id: 'com_cueva', nombre: ['Boca de cueva', 'Cave entrance'], tema: 'comun', variantes: ['entrada', 'salida'], huella: [5, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 60, 52, 7);
      const A = girado(a, 45, -10, -10);
      const sal = v === 'salida', m = sal ? 'piedra' : 'roca';
      // el cerro de roca, ancho hacia los lados de la pantalla (y local); la boca mira a la cámara (+x local)
      const rocas: [number, number, number, number, number, number][] = [
        [-10, 0, 26, 26, 36, 50], [-14, -32, 16, 22, 22, 38], [-12, 32, 14, 22, 22, 34], [-6, -50, 6, 17, 14, 20], [-6, 50, 6, 17, 15, 22],
        [-20, -8, 62, 20, 26, 18], [-4, 16, 54, 16, 16, 14], [-2, -20, 48, 15, 14, 14],
      ];
      for (const [x, y, z, rx, ry, rz] of rocas) ps.push(A.elipsoide(x + (a.r() - 0.5) * 4, y + (a.r() - 0.5) * 4, z, rx, ry, rz, { mat: m, giro: (a.r() - 0.5) * 30, tono: (a.r() - 0.5) * 0.12 }));
      ps.push(A.elipsoide(8, 0, 0, 22, 20, 50, { mat: m, resta: true }));
      ps.push(A.elipsoide(-12, 0, 0, 12, 20, 46, { mat: sal ? 'comun_luz_dia' : 'negro', tono: sal ? -0.1 : 0 }));
      if (sal) ps.push(A.elipsoide(-8, 0, 0, 10, 12, 30, { mat: 'comun_luz_dia', tono: 0.15 }));
      // dientes de roca colgando del borde y piedras caídas
      for (const y of [-12, -4, 5, 13]) ps.push(A.cilindro(-2, y + (a.r() - 0.5) * 2, 50 - Math.abs(y) * 1.1, 2.8, 7 + a.r() * 5, { mat: m, r1: 0.3, eje: [0, 0, -1] }));
      for (let i = 0; i < 4; i++) ps.push(A.elipsoide(18 + a.r() * 12, (a.r() - 0.5) * 50, 1, 3 + a.r() * 3, 2.5 + a.r() * 2, 2 + a.r() * 2, { mat: m, giro: a.r() * 90 }));
      if (!sal) {
        // vigas de madera viejas y huesos en la entrada
        for (const sg of [-1, 1]) ps.push(A.palo([6, sg * 17, 0], [6.5, sg * 16, 42], 2.4, { mat: 'madera_vieja' }));
        ps.push(A.palo([6, -20, 41], [6, 20, 43], 2.4, { mat: 'madera_vieja' }), A.palo([6, -16, 32], [6.4, -5, 42], 1.4, { mat: 'madera_vieja', tono: -0.05 }));
        calavera(A, ps, 18, -6, 2.2, 2.6, 'negro', -45);
        ps.push(A.palo([19, 3, 0.6], [22, 10, 0.8], 0.9, { mat: 'hueso' }), A.palo([15, 7, 0.6], [21, 5, 0.7], 0.8, { mat: 'hueso' }), A.elipsoide(16, 12, 0.5, 4, 3, 1, { mat: 'sangre' }));
        return ps;
      }
      // salida: la luz de afuera y peldaños de roca subiendo hacia ella
      for (let i = 0; i < 4; i++) ps.push(A.caja(10 - i * 5, 0, 0, 6, 18 - i * 1.5, 2 + i * 3, { mat: 'piedra', tono: 0.06 }));
      return { piezas: ps, resplandor: { c: [4, 4, 16], r: 40, color: '#f0e0b0' } };
    },
  },
  {
    id: 'com_puerta_secreta', nombre: ['Puerta secreta', 'Secret door'], tema: 'comun', variantes: ['cerrada', 'abierta'], huella: [3, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 52, 14, 3, { mat: 'piedra_gris', tono: -0.05 }));
      ps.push(a.caja(0, 0, 0, 48, 12, 72, { mat: 'piedra_bloques' }), a.caja(0, 0, 72, 50, 14, 4, { mat: 'piedra_gris' }));
      // el panel: ranura fina alrededor; abierta = el hueco oscuro y la losa girada adentro
      if (v === 'abierta') {
        ps.push(a.caja(0, 0, 0, 22, 20, 42, { mat: 'piedra', resta: true }));
        ps.push(a.caja(0, -2, 0, 22, 4, 42, { mat: 'negro' }));
        ps.push(a.caja(-12.5, 17, 0, 3.5, 22, 42, { mat: 'piedra_bloques', giro: -8, tono: 0.04 }));
        ps.push(a.caja(4, 9, 0, 14, 4, 0.6, { mat: 'negro', giro: 20 }));
      } else {
        for (const [x, w, h, z] of [[-11, 1.4, 42, 0], [11, 1.4, 42, 0], [0, 23.4, 1.4, 41.3]] as const) ps.push(a.caja(x, 6, z, w, 1.4, h, { mat: 'negro', resta: true }));
        ps.push(a.caja(0, 6.2, 1, 21, 0.6, 40, { mat: 'piedra_bloques', tono: 0.05 }));
        // marcas de arrastre en el piso
        for (let i = 0; i < 3; i++) ps.push(a.caja(-2 + i * 4, 12, 0, 1, 10, 0.3, { mat: 'negro', giro: 20 + i * 8 }));
      }
      // la palanca disimulada: un candelero torcido
      ps.push(a.caja(17, 6.5, 38, 3, 1.5, 6, { mat: 'hierro' }), a.palo([17, 7, 40], [18, 11, 44], 0.8, { mat: 'hierro' }));
      ps.push(a.cilindro(18, 11, 44, 2, 1, { mat: 'hierro', incl: v === 'abierta' ? 0 : 20 }), a.cilindro(18, 11, 45, 1.2, 3, { mat: 'cera' }));
      // grietas y musgo
      ps.push(a.caja(-18, 6.5, 50, 1, 2, 14, { mat: 'negro', giro: 30, resta: true }), a.elipsoide(-20, 6, 2, 5, 2, 4, { mat: 'musgo' }));
      return ps;
    },
  },
  {
    id: 'com_palanca', nombre: ['Palanca', 'Lever'], tema: 'comun', variantes: ['arriba', 'abajo'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 11, 11, 2);
      ps.push(a.caja(0, 0, 0, 16, 13, 3, { mat: 'piedra_bloques' }), a.caja(0, 0, 3, 11, 9, 8, { mat: 'piedra_gris' }));
      ps.push(a.caja(0, 0, 9, 7, 2.4, 3, { mat: 'negro', resta: true }), a.caja(0, 0, 10.5, 7, 2.2, 0.6, { mat: 'negro' }));
      // rueda dentada al costado
      ps.push(a.cilindro(0, 4.5, 7, 3.8, 1.4, { mat: 'hierro_oxido', eje: [0, 1, 0] }));
      for (let i = 0; i < 8; i++) { const ang = (i / 8) * Math.PI * 2; ps.push(a.caja(Math.cos(ang) * 4.2, 5.2, 7 + Math.sin(ang) * 4.2 - 0.7, 1.4, 1.4, 1.4, { mat: 'hierro_oxido', giro: 0 })); }
      const fin: V3 = v === 'arriba' ? [-6, 0, 26] : [8, 0, 17];
      ps.push(a.palo([0, 0, 10], fin, 1.1, { mat: 'hierro' }), a.esfera(fin[0], fin[1], fin[2], 2.2, { mat: 'cuero' }));
      ps.push(a.cilindro(0, -1.6, 10.6, 1.6, 3.2, { mat: 'hierro', eje: [0, 1, 0] }));
      ps.push(a.palo([5, -6, 11], [6, -9, 2], 0.6, { mat: 'hierro_oxido' }));
      return ps;
    },
  },
);
