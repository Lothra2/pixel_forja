import { registrar, conVarianteY, TEMAS, type Arma, type Pieza, type Tema } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, hueso, bulto, masa, type Comp, type Escena } from '../render';
import {
  PI2, az, entre, elegir, mas, mez, nrm, polar, rad, grad, suelo, mata, guijarro, pena, grupoPenas, disco, charco, llamas, chispas, vela, humo,
  cadaver, muneco, colgado, ropaDe, flecha, craneo, huesoLargo, costillar, ave, tabla, rueda, pano, marco, cajaM, paloM, sillar, losa,
  bestiaMuerta, type V, type Marco,
} from '../exteriores';

/**
 * Páramo gótico lluvioso (acto 1): rocas y peñascos con musgo, menhires y círculos de piedra, ruinas de muros y
 * torres de vigía, carretas rotas y caravanas emboscadas, horcas y picotas con cuervos, santuarios de camino con
 * velas, puentes de piedra sobre arroyos, molinos y granjas quemadas, pozos, cercas de piedra seca, brezo y matas,
 * charcos con gotas de lluvia, estandartes rotos, el campamento de los bandidos, tótems de huesos, troncos y tocones
 * con hongos y esqueletos de animales. Todo húmedo, oscuro y gastado; cada semilla da otra piedra, otro cuerpo y otra
 * mata.
 */

const PAR = 'paramo' as string as Tema;
if (!TEMAS.some((t) => t[0] === PAR)) TEMAS.push([PAR, 'Páramo gótico', 'Gothic moor']);

// ------------------------------------------------------------------ materiales del páramo
const M = MATERIALES;
M.par_turba = {
  rampa: ['#0a0a07', '#13130e', '#1c1c15', '#26251b', '#302f22', '#3b3929', '#474431'], ruido: 0.5, escala: 0.3, brillo: 0.2,
  patron: (p) => (ruido(p[0] * 0.1, p[1] * 0.1, 3) - 0.5) * 0.3 + (ruido(p[0] * 1.2, p[1] * 1.2, 5) > 0.8 ? 0.1 : 0),
};
M.par_sillar = {
  rampa: ['#0e0f0f', '#191a1a', '#252727', '#333535', '#424443', '#525453', '#636563', '#757673'], ruido: 0.35, escala: 0.22,
  patron: (p) => (ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.08) - 0.5) * 0.28 + (ruido(p[0] * 0.7, p[1] * 0.7, p[2] * 0.7) > 0.78 ? 0.1 : 0) - Math.max(0, 1 - p[2] / 14) * 0.12,
};
M.par_madera_negra = {
  rampa: ['#080706', '#100e0c', '#1a1714', '#24201b', '#2f2a23', '#3b342c', '#473f35'], ruido: 0.3, escala: 0.4, brillo: 0.2,
  patron: (p, n) => { const v = Math.abs(n[2]) > 0.7 ? p[0] - p[1] : p[2]; return (ruido(p[0] * 0.5 + p[1] * 0.5, v * 0.07, 2) - 0.5) * 0.35; },
};
M.par_paja_podrida = { rampa: ['#110d08', '#1d170e', '#2a2114', '#382c1a', '#463720', '#554327'], ruido: 0.55, escala: 0.6, patron: (p) => (ruido(p[0] * 1.3, p[1] * 1.3, p[2] * 0.3) - 0.5) * 0.4 };
M.par_lona = { rampa: ['#14110d', '#211c16', '#2f281f', '#3e3529', '#4d4233', '#5d503e', '#6d5e4a'], ruido: 0.3, escala: 0.2, patron: (p) => (ruido(p[0] * 0.12, p[1] * 0.12, p[2] * 0.12) > 0.66 ? -0.2 : 0) + (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.82 ? 0.1 : 0) };
M.par_piel_bestia = { rampa: ['#0f0b08', '#1c150f', '#2a1f16', '#392a1e', '#493627', '#5a4331', '#6b513c'], ruido: 0.55, escala: 1.4 };
M.par_hongo_luz = { rampa: ['#103028', '#18483a', '#22644e', '#2f8062', '#46a07a', '#6cc49a'], ruido: 0.3, escala: 0.5, emite: true };
M.par_runa_roja = { rampa: ['#3a0606', '#6a0c0a', '#9a1a12', '#c8321e', '#ea5a34'], ruido: 0.3, escala: 0.3, emite: true };

const reg = (...ds: Parameters<typeof registrar>) => registrar(...ds);
const sueloP = (a: Arma, ps: Pieza[], rx: number, ry: number, o: Parameters<typeof suelo>[4] = {}) => suelo(a, ps, rx, ry, { mat: 'par_turba', ...o });

/** Muro de sillares a lo largo de x, de largo L y grueso T, con el perfil de altura `alto(u)` (u de -L/2 a L/2). */
function muroSillares(a: Arma, ps: Pieza[], L: number, T: number, alto: (u: number) => number, o: { mat?: string; musgo?: number; hilada?: number; dx?: number; dy?: number; giro?: number } = {}) {
  const hh = o.hilada ?? 8, mat = o.mat ?? 'par_sillar', g = rad(o.giro ?? 0), cg = Math.cos(g), sg = Math.sin(g);
  const P = (u: number, w: number): [number, number] => [(o.dx ?? 0) + u * cg - w * sg, (o.dy ?? 0) + u * sg + w * cg];
  for (let fila = 0, z = 0; z < 160; fila++, z += hh) {
    let u = -L / 2 - (fila % 2) * 5;
    let algo = false;
    while (u < L / 2) {
      const l = Math.min(L / 2 - u, 9 + a.r() * 8);
      if (l < 3) break;
      const c = u + l / 2;
      if (alto(c) > z + hh * 0.5) {
        const [x, y] = P(c, az(a, 0.5));
        sillar(a, ps, x, y, z, l - 0.4, T + az(a, 0.6), hh - 0.3, (o.giro ?? 0) + az(a, 1.5), mat, { jit: 1 });
        algo = true;
        if (alto(c) <= z + hh * 1.5 && a.r() < (o.musgo ?? 0.5)) { const [mx, my] = P(c, az(a, 2)); ps.push(a.elipsoide(mx, my, z + hh - 0.2, l * 0.45, T * 0.45, 1.6, { mat: 'ext_musgo', giro: grad(g) + az(a, 10) })); }
      }
      u += l;
    }
    if (!algo) break;
  }
}
/** Escombros de sillares caídos al pie. */
function cascotes(a: Arma, ps: Pieza[], n: number, cx: number, cy: number, rx: number, ry: number, mat = 'par_sillar') {
  for (let i = 0; i < n; i++) { const t = a.r() * PI2, d = Math.sqrt(a.r()); sillar(a, ps, cx + Math.cos(t) * rx * d, cy + Math.sin(t) * ry * d, -0.6, 5 + a.r() * 6, 4 + a.r() * 4, 3 + a.r() * 3, a.r() * 180, mat, { incl: az(a, 15) }); }
}

// ------------------------------------------------------------------ rocas, peñascos y pedregales
reg(
  {
    id: 'par_roca', nombre: ['Rocas del páramo', 'Moor rocks'], tema: PAR, variantes: ['chica', 'mediana', 'grupo', 'musgosa', 'liquen'], huella: [1, 1], huellaPor: { grupo: [2, 2], musgosa: [2, 2] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const mat = a.r() < 0.3 ? 'ext_roca_fria' : 'ext_roca';
      if (v === 'chica') { sueloP(a, ps, 13, 11, { matas: 2 }); pena(a, ps, [0, 0, 0], [6 + a.r() * 2, 5 + a.r() * 2, 5 + a.r() * 3], { mat, musgo: 0.4, n: 4 }); for (let i = 0; i < 2; i++) guijarro(a, ps, az(a, 10), az(a, 9), 1.5 + a.r() * 1.5, mat); }
      if (v === 'mediana') { sueloP(a, ps, 18, 15); pena(a, ps, [0, 0, 0], [11 + a.r() * 2, 9 + a.r() * 2, 9 + a.r() * 5], { mat, musgo: 0.5, liquen: 0.3 }); }
      if (v === 'grupo') { sueloP(a, ps, 30, 24, { matas: 5 }); grupoPenas(a, ps, 10 + a.r() * 3, 4 + Math.floor(a.r() * 2), { mat, musgo: 0.6, liquen: 0.3 }); }
      if (v === 'musgosa') { sueloP(a, ps, 26, 22, { matas: 6 }); pena(a, ps, [0, 0, 0], [15, 12, 12 + a.r() * 4], { mat, musgo: 1.2, n: 6 }); pena(a, ps, polar(a.r() * PI2, 17), [6, 5, 5], { mat, musgo: 1, n: 3 }); for (let i = 0; i < 3; i++) mata(a, ps, ...polar(a.r() * PI2, 13).slice(0, 2) as [number, number], 6, 9, 'ext_pasto'); }
      if (v === 'liquen') { sueloP(a, ps, 18, 15); pena(a, ps, [0, 0, 0], [9, 8, 16 + a.r() * 6], { mat: 'ext_roca_fria', liquen: 1.2, n: 5, losa: 0.3 }); }
      return ps;
    },
  },
  {
    id: 'par_penasco', nombre: ['Peñasco', 'Crag boulder'], tema: PAR, variantes: ['liso', 'musgo', 'partido', 'con_brezo'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloP(a, ps, 40, 34, { matas: 6, piedras: 4 });
      const R = 22 + a.r() * 5;
      if (v === 'partido') {
        const g = a.r() * PI2, ox = Math.cos(g) * 9, oy = Math.sin(g) * 9;
        pena(a, ps, [ox, oy, 0], [R * 0.7, R * 0.55, R * 0.9], { musgo: 0.5, liquen: 0.4, giro: grad(g) + 90, n: 5 });
        pena(a, ps, [-ox, -oy, 0], [R * 0.65, R * 0.55, R * 0.8], { musgo: 0.5, giro: grad(g) + 90, n: 5 });
        for (let i = 0; i < 3; i++) guijarro(a, ps, az(a, 4), az(a, 4), 2 + a.r() * 1.5);
      } else pena(a, ps, [0, 0, 0], [R, R * 0.8, R * (0.85 + a.r() * 0.3)], { musgo: v === 'liso' ? 0.1 : v === 'musgo' ? 1.3 : 0.5, liquen: v === 'liso' ? 0.6 : 0.3, n: 12, losa: 0.3, mat: v === 'liso' ? 'ext_roca_fria' : 'ext_roca' });
      for (let i = 0; i < 3; i++) { const p = polar(a.r() * PI2, R + 6 + a.r() * 6); pena(a, ps, p, [3 + a.r() * 3, 3 + a.r() * 2, 2.5 + a.r() * 2], { n: 3 }); }
      if (v === 'con_brezo') for (let i = 0; i < 5; i++) { const p = polar(a.r() * PI2, R * 0.9 + a.r() * 8); brezo(a, ps, p[0], p[1], 4 + a.r() * 3, a.r() < 0.6 ? 'ext_brezo_flor' : 'ext_brezo'); }
      return ps;
    },
  },
  {
    id: 'par_pedregal', nombre: ['Pedregal', 'Scree'], tema: PAR, variantes: ['escaso', 'denso', 'con_pasto'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloP(a, ps, 32, 26, { matas: v === 'con_pasto' ? 9 : 2, piedras: 0, manchas: 4 });
      const n = v === 'denso' ? 26 : v === 'escaso' ? 10 : 14;
      for (let i = 0; i < n; i++) { const t = a.r() * PI2, d = Math.sqrt(a.r()) * 28; guijarro(a, ps, Math.cos(t) * d, Math.sin(t) * d * 0.8, 2 + a.r() * (i < 5 ? 4.5 : 2.5), a.r() < 0.3 ? 'ext_roca_fria' : 'ext_roca'); }
      if (v === 'con_pasto') for (let i = 0; i < 4; i++) { const p = polar(a.r() * PI2, a.r() * 24); mata(a, ps, p[0], p[1], 7, 10, a.r() < 0.5 ? 'ext_pasto' : 'ext_pasto_seco'); }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ menhires, círculos y dólmenes
reg(
  {
    id: 'par_menhir', nombre: ['Menhir', 'Standing stone'], tema: PAR, variantes: ['alto', 'inclinado', 'caido', 'tallado', 'gemelos'], huella: [1, 1], huellaPor: { caido: [3, 1], gemelos: [2, 1] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloP(a, ps, v === 'caido' ? 34 : 18, v === 'caido' ? 16 : 15, { matas: 4 });
      const H = 64 + a.r() * 22, w = 9 + a.r() * 2.5, d = 5 + a.r() * 1.5, g = a.r() * 360;
      if (v === 'alto' || v === 'tallado') losa(a, ps, [0, 0, -3], H, w, d, g, { musgo: 0.8, liquen: 0.8, incl: az(a, 3) });
      if (v === 'inclinado') losa(a, ps, [0, 0, -4], H * 0.9, w, d, g, { musgo: 0.6, liquen: 0.6, incl: 14 + a.r() * 8 });
      if (v === 'gemelos') { losa(a, ps, [-9, 4, -3], H, w * 0.9, d, 40 + az(a, 15), { musgo: 0.6, liquen: 0.6 }); losa(a, ps, [9, -4, -3], H * 0.72, w * 0.85, d, 40 + az(a, 15), { musgo: 0.6, liquen: 0.8, incl: az(a, 8) }); }
      if (v === 'caido') {
        // tumbado en el pasto y el muñón roto todavía en pie
        losa(a, ps, [-26, 0, 1], 22, w, d, 0, { musgo: 1, liquen: 0.5 });
        const cs: Comp[] = [];
        const m = marco([-12, az(a, 3), d * 0.9], az(a, 10), 88, 90);
        for (let i = 0; i < 4; i++) cs.push(bulto(m.T([0, az(a, 1), 10 + i * 12]), [d * (1 - i * 0.08), w * (1 - i * 0.1), 8], { ejes: [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])] }));
        cs.push(bulto(m.T([d * 0.7, 0, 30]), [d * 0.4, w * 0.6, 14], { mat: 'ext_musgo', ejes: [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])], k: 0.8 }));
        ps.push(masa(cs, { mat: 'ext_roca', suave: 3 }));
        for (let i = 0; i < 4; i++) mata(a, ps, entre(a, -20, 40), az(a, 12), 6, 8);
      }
      if (v === 'tallado') {
        // espiral y marcas talladas en la cara del frente (surcos oscuros apenas hundidos)
        // (las runas brillan apenas: el brillo se tiñe en la piedra de alrededor)
        const m = marco([0, 0, -3], g, 0, 0), cx = d * 0.82;
        let prev: V | null = null;
        for (let i = 0; i <= 16; i++) { const t = i * 0.6, r = 0.8 + t * 0.75; const q = m.T([cx, Math.cos(t) * r, H * 0.58 + Math.sin(t) * r]); if (prev) ps.push(a.palo(prev, q, 0.75, { mat: 'runa', tono: -0.35 })); prev = q; }
        for (let i = 0; i < 4; i++) ps.push(a.palo(m.T([cx * 0.98, -w * 0.45, H * 0.22 + i * 4.5]), m.T([cx * 0.98, w * 0.4, H * 0.22 + i * 4.5 + az(a, 1.5)]), 0.7, { mat: 'runa', tono: -0.45 }));
        return { piezas: ps, resplandor: { c: m.T([d + 5, 0, H * 0.5]), r: 22, color: '#2a6a8a' } };
      }
      return ps;
    },
  },
  {
    id: 'par_circulo', nombre: ['Círculo de piedras', 'Stone circle'], tema: PAR, variantes: ['entero', 'roto', 'ritual', 'hundido'], huella: [9, 9], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloP(a, ps, 80, 72, { matas: 10, piedras: 6, manchas: 5 });
      // la ronda gastada por los pasos, más clara
      ps.push(a.elipsoide(0, 0, 0.2, 48, 46, 0.9, { mat: 'ext_tierra', tono: 0.04 }));
      const n = 9, R = 58;
      const caidas = v === 'roto' ? 3 : v === 'hundido' ? 2 : 0;
      const pies: V[] = [];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * PI2 + az(a, 0.06), p = polar(t, R + az(a, 3)), H = (v === 'hundido' ? 22 : 34) + a.r() * 16;
        pies.push(p);
        if (i < caidas) {
          // piedra caída hacia afuera
          const cs: Comp[] = [], m = marco([p[0], p[1], 4], grad(t), 84, 0);
          for (let k = 0; k < 3; k++) cs.push(bulto(m.T([0, 0, 6 + k * 11]), [5, 9 - k, 7], { ejes: [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])] }));
          ps.push(masa(cs, { mat: 'ext_roca_fria', suave: 3 }));
          continue;
        }
        losa(a, ps, [p[0], p[1], v === 'hundido' ? -8 : -3], H, 8 + a.r() * 2, 5 + a.r() * 1.5, grad(t) + az(a, 6), { musgo: 0.5, liquen: 0.7, incl: v === 'hundido' ? az(a, 14) : az(a, 4), mat: 'ext_roca_fria' });
      }
      // dintel sobre un par (trilito)
      if (v === 'entero' || v === 'ritual') {
        const p0 = pies[4], p1 = pies[5], c = mez(p0, p1, 0.5);
        const m = marco([c[0], c[1], 44], grad(Math.atan2(p1[1] - p0[1], p1[0] - p0[0])), 0, 0);
        ps.push(masa([bulto(m.T([0, 0, 3]), [22, 5, 4], { ejes: [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])] }), bulto(m.T([8, 0, 4]), [9, 4.5, 3.5], { ejes: [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])], mat: 'ext_musgo', k: 0.8 })], { mat: 'ext_roca_fria', suave: 2.5 }));
      }
      // la piedra del centro
      pena(a, ps, [0, 0, 0], [13, 9, 6], { mat: 'ext_roca_fria', n: 5, losa: 0.3, liquen: 0.4, hunde: 0.1 });
      if (v === 'ritual') {
        ps.push(a.elipsoide(0, 0, 6.5, 9, 6, 0.4, { mat: 'sangre', tono: 0.05 }));
        // runas que brillan en el piso entre las piedras
        for (let i = 0; i < n; i++) { const t = (i / n + 0.5 / n) * PI2, p = polar(t, 40); ps.push(a.caja(p[0], p[1], 0.2, 5, 1.2, 0.6, { mat: 'par_runa_roja', giro: grad(t) + 90 }), a.caja(p[0], p[1], 0.2, 1.2, 4, 0.6, { mat: 'par_runa_roja', giro: grad(t) + 90 + az(a, 30) })); }
        craneo(a, ps, 4, -2, 9.5, 0.9, 0.8);
        for (let i = 0; i < 4; i++) { const p = polar((i / 4) * PI2 + 0.4, 15); ps.push(a.cilindro(p[0], p[1], 0, 1.2, 4 + a.r() * 3, { mat: 'cera' }), a.elipsoide(p[0], p[1], 8.6, 0.8, 0.8, 1.3, { mat: 'luz_vela' })); }
        return { piezas: ps, resplandor: { c: [0, 0, 8], r: 60, color: '#a02a1a' } } as Escena;
      }
      return ps;
    },
  },
  {
    id: 'par_dolmen', nombre: ['Dolmen', 'Dolmen'], tema: PAR, variantes: ['entero', 'caido', 'con_ofrendas'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloP(a, ps, 40, 34, { matas: 6, piedras: 3 });
      const g = a.r() * 360, m = marco([0, 0, 0], g);
      // tres losas: dos de costado y una al fondo
      losa(a, ps, m.T([0, 14, -3]), 30, 13, 4, g + 90 + az(a, 5), { musgo: 0.6, liquen: 0.5 });
      losa(a, ps, m.T([0, -14, -3]), v === 'caido' ? 18 : 30, 13, 4, g + 90 + az(a, 5), { musgo: 0.6, liquen: 0.5, incl: v === 'caido' ? -18 : 0 });
      losa(a, ps, m.T([-15, 0, -3]), 28, 11, 4, g + az(a, 5), { musgo: 0.4, liquen: 0.5 });
      // la mesa de piedra encima (inclinada y caída en una punta si el costado cedió)
      const cab = v === 'caido' ? 14 : az(a, 3), alab = v === 'caido' ? -16 : az(a, 3);
      const mt = marco(m.T([-2, v === 'caido' ? -4 : 0, v === 'caido' ? 22 : 28]), g + az(a, 8), cab, alab), ej: [V, V, V] = [mt.D([1, 0, 0]), mt.D([0, 1, 0]), mt.D([0, 0, 1])];
      ps.push(masa([
        bulto(mt.T([0, 0, 3.5]), [22, 21, 4.5], { ejes: ej }), bulto(mt.T([10, 6, 3]), [12, 10, 3.5], { ejes: ej, tono: 0.04 }), bulto(mt.T([-8, -9, 3]), [11, 9, 3.6], { ejes: ej }),
        bulto(mt.T([3, 2, 7.2]), [11, 9, 1.4], { ejes: ej, mat: 'ext_musgo', k: 1 }), bulto(mt.T([-12, 6, 6]), [3, 3, 1], { ejes: ej, mat: 'ext_liquen', k: 0.5 }),
      ], { mat: 'ext_roca_fria', suave: 2.5 }));
      if (v === 'con_ofrendas') {
        // ofrendas bajo la mesa: velas consumidas, cráneo, huesos y flores secas
        for (let i = 0; i < 4; i++) { const q = m.T([-6 + az(a, 5), az(a, 7), 0]); ps.push(a.cilindro(q[0], q[1], 0, 1.2, 1.5 + a.r() * 2, { mat: 'cera', r1: 1, tono: -0.1 }), a.cilindro(q[0], q[1], 0, 2, 0.4, { mat: 'cera', tono: -0.15 })); }
        const q = m.T([-2, 2, 0]); craneo(a, ps, q[0], q[1], 3, 0.9, rad(g));
        huesoLargo(ps, m.T([-8, -6, 1]), m.T([2, -9, 1]), 0.8);
        for (let i = 0; i < 5; i++) { const p = m.T([4 + az(a, 3), az(a, 6), 0.4]); ps.push(a.palo(p, mas(p, [az(a, 4), az(a, 4), 0.4]), 0.4, { mat: 'ext_pasto_seco' }), a.esfera(p[0], p[1], 0.8, 1, { mat: 'ext_brezo_flor', tono: -0.1 })); }
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ ruinas: muros y torres
reg({
  id: 'par_muro', nombre: ['Muro en ruinas', 'Ruined wall'], tema: PAR, variantes: ['x', 'bajo', 'esquina', 'arco', 'derrumbe'], huella: [5, 1], huellaPor: { esquina: [5, 5], esquina_y: [5, 5] }, bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, v === 'esquina' ? 48 : 46, v === 'esquina' ? 48 : 14, { matas: 5, piedras: 3 });
    const L = 80, T = 11;
    const perfil = (H: number, k: number) => { const fase = a.r() * 9, sube = a.r() < 0.5; return (u: number) => Math.max(4, H * (0.55 + 0.45 * (sube ? (u + L / 2) / L : (L / 2 - u) / L)) + (ruido(u * 0.08, fase, k) - 0.5) * H * 0.6); };
    if (v === 'x') muroSillares(a, ps, L, T, perfil(58 + a.r() * 16, 1), { musgo: 0.6 });
    if (v === 'bajo') muroSillares(a, ps, L, T, perfil(22 + a.r() * 8, 2), { musgo: 0.8 });
    if (v === 'esquina') {
      muroSillares(a, ps, L * 0.55, T, perfil(52, 3), { dx: -L * 0.225 + 18, dy: -18, musgo: 0.6 });
      muroSillares(a, ps, L * 0.55, T, perfil(44, 4), { giro: 90, dx: -18, dy: -L * 0.225 + 18 + 12, musgo: 0.6 });
    }
    if (v === 'arco') {
      // dos pilares y el arco de dovelas, roto en una punta
      for (const s of [-1, 1]) muroSillares(a, ps, 18, T + 2, () => 46 + (s > 0 ? 0 : 6), { dx: s * 27, musgo: 0.4 });
      const R = 18, zc = 46, n = 11, rotas = 2 + Math.floor(a.r() * 3);
      for (let i = 0; i < n - rotas; i++) {
        const t0 = Math.PI - (i / n) * Math.PI, t1 = Math.PI - ((i + 1) / n) * Math.PI;
        const pts: V[] = [];
        for (const t of [t0 - 0.01, t1 + 0.01]) for (const r of [R, R + 8]) for (const y of [-T / 2 - 0.5, T / 2 + 0.5]) pts.push([Math.cos(t) * r + az(a, 0.4), y + az(a, 0.4), zc + Math.sin(t) * r * 0.95 + az(a, 0.4)]);
        ps.push(a.poliedro(pts, { mat: 'par_sillar', tono: az(a, 0.08) }));
      }
      cascotes(a, ps, 5, 14, 6, 14, 8);
    }
    if (v === 'derrumbe') {
      muroSillares(a, ps, L, T, perfil(18 + a.r() * 10, 5), { musgo: 0.7 });
      cascotes(a, ps, 16, az(a, 8), 10, 34, 10);
    } else cascotes(a, ps, 6, az(a, 20), 9, 30, 4);
    // hiedra que sube por la cara del frente
    if (v !== 'derrumbe' && v !== 'bajo') for (let k = 0; k < 2; k++) {
      const u = az(a, 28); let p: V = [u, T / 2 + 0.8, 0];
      for (let i = 0; i < 5; i++) { const q: V = [p[0] + az(a, 4), T / 2 + 0.9, p[2] + 5 + a.r() * 4]; ps.push(a.palo(p, q, 0.6, { mat: 'corteza' })); for (let j = 0; j < 2; j++) ps.push(a.elipsoide(q[0] + az(a, 2.5), q[1] + 0.6, q[2] + az(a, 2), 2.2, 0.9, 1.9, { mat: 'hojas', tono: az(a, 0.1) })); p = q; }
    }
    return ps;
  },
});
conVarianteY('par_muro');

reg({
  id: 'par_torre_vigia', nombre: ['Torre de vigía en ruinas', 'Ruined watchtower'], tema: PAR, variantes: ['entera', 'derruida', 'munon', 'con_fuego'], huella: [4, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 46, 42, { matas: 7, piedras: 4 });
    const R = 21, H = v === 'munon' ? 30 : v === 'derruida' ? 70 : 104;
    // fuste con hiladas (el patrón del material) y zócalo ataludado
    ps.push(a.cilindro(0, 0, -1, R + 4, 12, { mat: 'piedra_bloques', r1: R + 0.5, tono: -0.06 }));
    const solido = v === 'derruida' ? H * 0.55 : v === 'munon' ? H * 0.4 : H;
    ps.push(a.cilindro(0, 0, 10, R, solido - 10, { mat: 'piedra_bloques', r1: R - 1.2 }));
    // piedras que sobresalen y manchas de musgo por la lluvia
    for (let i = 0; i < 14; i++) { const t = a.r() * PI2, z = 12 + a.r() * (solido - 16), rr = R - 1.2 * (z / H) + 0.3; sillar(a, ps, Math.cos(t) * rr, Math.sin(t) * rr, z, 7, 3, 3.6, grad(t) + 90, 'par_sillar', { jit: 0.5 }); }
    for (let i = 0; i < 6; i++) { const t = rad(100 + az(a, 70)), z = a.r() * solido * 0.8; ps.push(a.elipsoide(Math.cos(t) * (R - 0.4), Math.sin(t) * (R - 0.4), z, 5 + a.r() * 4, 3, 4 + a.r() * 5, { mat: 'ext_musgo', giro: grad(t) + 90 })); }
    // saeteras y la puerta (al frente)
    for (const z of [30, 58, 84]) if (z < solido - 6) for (const t of [rad(60), rad(150)]) { const p = polar(t, R - 0.5); ps.push(a.caja(p[0], p[1], z, 3, 6, 11, { mat: 'negro', giro: grad(t), resta: true })); ps.push(a.caja(Math.cos(t) * (R - 3), Math.sin(t) * (R - 3), z, 1, 3, 11, { mat: 'negro', giro: grad(t) })); }
    {
      const t = rad(45), p = polar(t, R + 1);
      ps.push(a.caja(p[0], p[1], 0, 10, 14, 24, { mat: 'negro', giro: grad(t), resta: true }));
      ps.push(a.caja(Math.cos(t) * (R - 4), Math.sin(t) * (R - 4), 0, 1, 13, 23, { mat: 'negro', giro: grad(t) }));
      // hoja de puerta caída
      tabla(a, ps, polar(t + 0.3, R + 4, 0.6), polar(t + 0.6, R + 22, 0.6), 12, 1.6, 'par_madera_negra');
    }
    if (v === 'entera' || v === 'con_fuego') {
      // matacán: anillo de ménsulas y almenas
      ps.push(a.cilindro(0, 0, H - 2, R + 2.5, 4, { mat: 'piedra_bloques', r1: R + 3 }));
      for (let i = 0; i < 16; i++) { const t = (i / 16) * PI2; const p = polar(t, R - 1); ps.push(a.caja(p[0], p[1], H - 9, 3, 4, 7, { mat: 'par_sillar', giro: grad(t), tono: -0.05 })); }
      const nal = 10;
      for (let i = 0; i < nal; i++) { if (a.r() < 0.2) continue; const t = (i / nal) * PI2 + 0.15; sillar(a, ps, Math.cos(t) * (R + 0.6), Math.sin(t) * (R + 0.6), H + 2, 7, 4, 7 + az(a, 1.5), grad(t) + 90, 'par_sillar', { jit: 0.6 }); }
      ps.push(a.cilindro(0, 0, H + 1, R - 2.5, 1.2, { mat: 'piedra_gris', tono: -0.2 }));
      if (v === 'con_fuego') {
        // brasero de hierro en lo alto con el fuego de la señal
        ps.push(a.cilindro(0, 0, H + 2, 3, 6, { mat: 'ext_hierro', r1: 1.2 }), a.cilindro(0, 0, H + 8, 4, 4, { mat: 'ext_hierro', r1: 6 }));
        ps.push(a.cilindro(0, 0, H + 11.5, 5.4, 0.8, { mat: 'ext_brasa' }));
        llamas(a, ps, 2, 6, 0, 0, H + 12, 3, 13, 2.6, 'fuego', 6);
        humo(a, ps, 1, 6, 0, 0, H + 22, 30, 4, 4);
        return { piezas: ps, resplandor: { c: [0, 0, H + 14], r: 50, color: '#ff8a30' } };
      }
      return ps;
    }
    // la parte rota: columnas de sillares que bajan hacia un lado, hueco por dentro
    const nc = 18, lado = a.r() * PI2;
    ps.push(a.cilindro(0, 0, solido - 2, R - 4, 3, { mat: 'par_sillar', resta: true }));
    for (let i = 0; i < nc; i++) {
      const t = (i / nc) * PI2, cae = 0.5 + 0.5 * Math.cos(t - lado), h = (H - solido) * cae * (0.55 + a.r() * 0.45);
      for (let z = solido; z < solido + h; z += 7.6) sillar(a, ps, Math.cos(t) * (R - 2.2), Math.sin(t) * (R - 2.2), z, PI2 * R / nc - 0.6, 4.5, 7.3, grad(t) + 90, 'par_sillar', { jit: 0.7 });
    }
    ps.push(a.elipsoide(0, 0, solido - 1, R - 5, R - 5, 3, { mat: 'ext_tierra', tono: -0.1 }));
    mata(a, ps, 3, -4, 6, 10, 'ext_pasto', solido);
    cascotes(a, ps, 14, Math.cos(lado + Math.PI) * 30, Math.sin(lado + Math.PI) * 30, 18, 18);
    return ps;
  },
});

// ------------------------------------------------------------------ plantas del páramo
/** Mata de brezo: cojín bajo de ramitas con flores (bultos chicos que se funden). */
function brezo(a: Arma, ps: Pieza[], x: number, y: number, R: number, mat = 'ext_brezo') {
  const cs: Comp[] = [];
  const n = 4 + Math.floor(R / 2);
  for (let i = 0; i < n; i++) { const t = a.r() * PI2, d = Math.sqrt(a.r()) * R * 0.75; cs.push(bulto([x + Math.cos(t) * d, y + Math.sin(t) * d, R * 0.35 + a.r() * R * 0.3 - d * 0.3], [R * (0.35 + a.r() * 0.2), R * (0.35 + a.r() * 0.2), R * (0.3 + a.r() * 0.15)], { giro: a.r() * 180, tono: az(a, 0.08), mat: a.r() < 0.25 ? 'ext_brezo' : mat })); }
  ps.push(masa(cs, { mat, suave: R * 0.3 }));
  for (let i = 0; i < 3; i++) { const t = a.r() * PI2; ps.push(a.palo([x + Math.cos(t) * R * 0.6, y + Math.sin(t) * R * 0.6, 0], [x + Math.cos(t) * R * 0.9, y + Math.sin(t) * R * 0.9, R * 0.5], 0.4, { mat: 'corteza_muerta' })); }
}
