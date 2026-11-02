import { registrar, conVarianteY, TEMAS, type Arma, type Pieza, type Tema } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, hueso, bulto, masa, type Comp, type Escena } from '../render';
import {
  PI2, az, entre, elegir, mas, mez, nrm, polar, rad, grad, suelo, mata, guijarro, pena, grupoPenas, disco, charco, llamas, chispas, vela, humo,
  cadaver, muneco, colgado, ropaDe, flecha, craneo, huesoLargo, costillar, ave, tabla, rueda, pano, marco, cajaM, paloM, sillar, losa,
  bestiaMuerta, mover, type V, type Marco,
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
M.par_bloques = {
  rampa: ['#0f100f', '#1a1b1a', '#262826', '#343633', '#434541', '#535550', '#646660', '#767770'], ruido: 0.25, escala: 0.2,
  patron: (p, n) => { const hz = 7.5, l = 14, fila = Math.floor(p[2] / hz), u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0], corre = (fila % 2) * l * 0.5; const jz = ((p[2] % hz) + hz) % hz < 0.9, ju = Math.abs(n[2]) < 0.7 && (((u + corre) % l) + l) % l < 0.9; return (jz || ju ? -0.3 : 0) + (ruido(Math.floor((u + corre) / l) * 1.7, fila * 2.3, 3) - 0.5) * 0.2 + (ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.6) > 0.8 ? 0.08 : 0); },
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
    ps.push(a.cilindro(0, 0, -1, R + 4, 12, { mat: 'par_bloques', r1: R + 0.5, tono: -0.06 }));
    const solido = v === 'derruida' ? H * 0.55 : v === 'munon' ? H * 0.4 : H;
    ps.push(a.cilindro(0, 0, 10, R, solido - 10, { mat: 'par_bloques', r1: R - 1.2 }));
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
      ps.push(a.cilindro(0, 0, H - 2, R + 2.5, 4, { mat: 'par_bloques', r1: R + 3 }));
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

// ------------------------------------------------------------------ carretas y caravanas
interface OpcCarro { quemado?: boolean; ruedas?: boolean[]; lona?: number; carga?: boolean; varas?: boolean }
/** Carro de cuatro ruedas en un marco (x a lo largo, z arriba): cama de tablas, barandas, varas y lona rota. */
function carro(a: Arma, ps: Pieza[], m: Marco, o: OpcCarro = {}) {
  const mad = o.quemado ? 'ext_carbon' : 'ext_madera_gris', L = 46, Wd = 22, zb = 12;
  // cama: tablas a lo largo con huecos
  for (let i = 0; i < 5; i++) { const y = -Wd / 2 + 2.2 + i * 4.4; if (o.quemado && a.r() < 0.3) continue; cajaM(a, ps, m, az(a, 0.6), y, zb, L - (o.quemado ? a.r() * 14 : 0), 4.1, 1.6, mad, az(a, 0.08)); }
  cajaM(a, ps, m, -L / 2 + 2, 0, zb - 2.5, 3, Wd, 2.5, mad, -0.08); cajaM(a, ps, m, L / 2 - 2, 0, zb - 2.5, 3, Wd, 2.5, mad, -0.08);
  // barandas: postes y dos tablas por lado (alguna arrancada)
  for (const sy of [-1, 1]) {
    for (const x of [-L / 2 + 1.5, -6, 6, L / 2 - 1.5]) cajaM(a, ps, m, x, sy * (Wd / 2 - 0.6), zb + 1.4, 2, 2, 10 + az(a, 1), mad, -0.05);
    for (const z of [zb + 3.5, zb + 8]) if (a.r() > (o.quemado ? 0.45 : 0.15)) cajaM(a, ps, m, az(a, 2), sy * (Wd / 2 - 0.2), z, L - a.r() * 6, 1.2, 3.2, mad, az(a, 0.08));
  }
  cajaM(a, ps, m, -L / 2 + 0.4, 0, zb + 1.5, 1.2, Wd - 1, 8, mad, -0.04);
  // ejes y ruedas
  const rs = o.ruedas ?? [true, true, true, true];
  [[-14, -1], [-14, 1], [14, -1], [14, 1]].forEach(([x, sy], i) => { if (rs[i]) rueda(a, ps, m.T([x, sy * (Wd / 2 + 2.5), 9.5]), m.D([0, sy, 0]), 9.5, { rotos: o.quemado ? 0.4 : 0.1, mat: mad }); });
  for (const x of [-14, 14]) paloM(a, ps, m, [x, -Wd / 2 - 2, 9.5], [x, Wd / 2 + 2, 9.5], 1.3, mad);
  if (o.varas !== false) { paloM(a, ps, m, [L / 2 - 4, -5, 10], [L / 2 + 22, -3, 4 + a.r() * 4], 1.2, mad); if (a.r() < 0.6) paloM(a, ps, m, [L / 2 - 4, 5, 10], [L / 2 + 20, 4 + az(a, 3), 1.2], 1.2, mad); }
  // arcos y lona en paños (rota a jirones)
  if (o.lona) {
    const n = 4, k = 5;
    for (let i = 0; i < n; i++) { const x = -L / 2 + 5 + i * ((L - 10) / (n - 1)); let p: V | null = null; for (let j = 0; j <= 6; j++) { const t = (j / 6) * Math.PI, q: V = [x, -Math.cos(t) * (Wd / 2 - 0.5), zb + 9 + Math.sin(t) * 13]; if (p) paloM(a, ps, m, p, q, 0.6, mad); p = q; } }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < k; j++) {
      if (a.r() > o.lona) continue;
      const x0 = -L / 2 + 5 + i * ((L - 10) / (n - 1)), x1 = x0 + (L - 10) / (n - 1), t0 = (j / k) * Math.PI, t1 = ((j + 1) / k) * Math.PI;
      const P = (x: number, t: number, e: number): V => m.T([x, -Math.cos(t) * (Wd / 2 + e), zb + 9 + Math.sin(t) * (13 + e) - (x - x0) * (x1 - x) * 0.012]);
      ps.push(a.poliedro([P(x0, t0, 0), P(x1, t0, 0), P(x0, t1, 0), P(x1, t1, 0), P(x0, t0, 0.8), P(x1, t0, 0.8), P(x0, t1, 0.8), P(x1, t1, 0.8)], { mat: o.quemado ? 'ext_carbon' : 'par_lona', tono: az(a, 0.06) }));
    }
  }
  if (o.carga) for (let i = 0; i < 3; i++) { const q = m.T([-14 + i * 12 + az(a, 2), az(a, 4), zb + 1.6]); ps.push(a.caja(q[0], q[1], q[2], 9, 9, 8, { mat: 'madera_vieja', giro: az(a, 30), tono: az(a, 0.1) })); }
}
/** Bulto suelto de una carga (caja, saco o barril) tirado en el piso. */
function bultoCarga(a: Arma, ps: Pieza[], x: number, y: number, rota = false) {
  const k = a.r();
  if (k < 0.35) { const g = a.r() * 180; ps.push(a.caja(x, y, 0, 10, 10, 9, { mat: rota ? 'ext_madera_podrida' : 'madera_vieja', giro: g, incl: az(a, 8) })); if (rota) ps.push(a.caja(x, y, 4, 8, 12, 8, { mat: 'negro', giro: g, resta: true })); }
  else if (k < 0.7) {
    // saco tumbado: panza, cuello atado y la cuerda
    const g = a.r() * PI2, d: V = [Math.cos(g), Math.sin(g), 0], mat = elegir(a, ['ext_tela_sucia', 'tela', 'par_lona']);
    ps.push(masa([bulto([x, y, 3.6], [7, 5, 3.8], { eje: d }), bulto([x - d[0] * 2, y - d[1] * 2, 2.6], [5, 5.6, 2.6], { eje: d }), hueso([x + d[0] * 6, y + d[1] * 6, 3.4], [x + d[0] * 9.5, y + d[1] * 9.5, 3], 2.2, 1.6)], { mat, suave: 1.6, tono: -0.08 }));
    ps.push(a.cilindro(x + d[0] * 7.6, y + d[1] * 7.6, 3.3, 2.3, 1, { mat: 'cuerda', eje: d })); if (rota) for (let i = 0; i < 6; i++) ps.push(a.esfera(x + az(a, 9), y + az(a, 9), 0.6, 1, { mat: elegir(a, ['paja', 'oro', 'hongo']), tono: az(a, 0.1) })); }
  else { const g = a.r() * PI2; ps.push(a.cilindro(x, y, 6, 6, 16, { mat: 'madera', eje: [Math.cos(g), Math.sin(g), 0.02], r1: 6 })); const c: V = [x + Math.cos(g) * 1, y + Math.sin(g) * 1, 6]; for (const t of [0.15, 0.85]) ps.push(a.cilindro(c[0] + Math.cos(g) * (t * 16 - 8), c[1] + Math.sin(g) * (t * 16 - 8), 6, 6.2, 1, { mat: 'ext_hierro', eje: [Math.cos(g), Math.sin(g), 0] })); }
}

reg(
  {
    id: 'par_carreta_rota', nombre: ['Carreta rota', 'Broken wagon'], tema: PAR, variantes: ['volcada', 'sin_rueda', 'quemada', 'hundida'], huella: [4, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const g = a.r() * 360;
      if (v === 'hundida') { charco(a, ps, 30, 20, 0, 1, { gotas: 0, borde: 'ext_barro' }); sueloP(a, ps, 16, 12, { matas: 3, manchas: 1 }); }
      else sueloP(a, ps, 42, 32, { matas: 6, piedras: 3, mat: v === 'quemada' ? 'ext_ceniza' : 'par_turba' });
      if (v === 'volcada') {
        carro(a, ps, marco([0, 0, 12.5], g, az(a, 4), 96), { lona: 0.4, varas: true, ruedas: [true, true, a.r() < 0.5, true] });
        rueda(a, ps, polar(rad(g + 60), 30, 1.3), [0.05, 0.05, 1], 9.5, { rotos: 0.3 });
        for (let i = 0; i < 3; i++) bultoCarga(a, ps, ...(polar(rad(g + 140 + i * 30), 24 + a.r() * 10).slice(0, 2) as [number, number]), true);
      }
      if (v === 'sin_rueda') {
        // la esquina de la rueda perdida apoyada en el piso
        carro(a, ps, marco([0, 0, -2], g, 9, -6), { ruedas: [false, true, true, true], lona: 0.6, carga: true });
        rueda(a, ps, polar(rad(g - 130), 28, 1.3), [0.1, -0.05, 1], 9.5, { rotos: 0.25 });
      }
      if (v === 'quemada') {
        carro(a, ps, marco([0, 0, -1], g, az(a, 4), az(a, 5)), { quemado: true, lona: 0.35, ruedas: [true, false, true, a.r() < 0.5] });
        for (let i = 0; i < 6; i++) { const p = polar(a.r() * PI2, a.r() * 22); ps.push(a.elipsoide(p[0], p[1], 0.4, 3 + a.r() * 4, 2.5 + a.r() * 3, 1, { mat: 'ext_ceniza', giro: a.r() * 180 })); }
        for (let i = 0; i < 5; i++) { const p = polar(a.r() * PI2, a.r() * 14); ps.push(a.esfera(p[0], p[1], 0.8, 0.9 + a.r() * 0.6, { mat: 'ext_brasa', tono: -0.2 })); }
        return { piezas: ps, resplandor: { c: [0, 0, 4], r: 24, color: '#a0401a' } };
      }
      if (v === 'hundida') { carro(a, ps, marco([0, 0, -7], g, -8, 7), { lona: 0.7, carga: true }); for (let i = 0; i < 4; i++) mata(a, ps, az(a, 30), az(a, 22), 5, 9, 'ext_pasto'); }
      return ps;
    },
  },
  {
    id: 'par_caravana', nombre: ['Caravana emboscada', 'Ambushed caravan'], tema: PAR, variantes: ['emboscada', 'saqueada', 'quemada'], huella: [7, 5], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const q = v === 'quemada';
      sueloP(a, ps, 70, 50, { matas: 8, piedras: 4, manchas: 5 });
      if (q) ps.push(a.elipsoide(0, 0, 0.1, 40, 28, 1, { mat: 'ext_ceniza', giro: a.r() * 180 }));
      const g = az(a, 25);
      // el carro volcado y el animal de tiro muerto delante
      carro(a, ps, marco([-8, -6, 12.5], g, 0, 96), { lona: q ? 0.3 : 0.6, quemado: q, ruedas: [true, true, a.r() < 0.6, true], varas: false });
      bestiaMuerta(a, ps, a.r() < 0.6 ? 'caballo' : 'buey', [34 + az(a, 4), -22 + az(a, 4), 0], g - 20 + az(a, 30), { podrida: v === 'saqueada' ? 0.8 : 0, s: 0.85 });
      // carga desparramada en sus lugares (cada semilla corre un poco cada cosa)
      const lugares: [number, number][] = [[-52, -8], [-40, 12], [-14, 34], [22, 8], [50, 18], [-56, 26], [10, 40]];
      for (let i = 0; i < (v === 'saqueada' ? 7 : 4); i++) bultoCarga(a, ps, lugares[i][0] + az(a, 4), lugares[i][1] + az(a, 4), v !== 'emboscada' || a.r() < 0.4);
      // los muertos: flechas, sangre y un arma suelta
      const nc = v === 'emboscada' ? 3 : 2, cuerpos: [number, number, number][] = [[-30, 30, 200], [8, 22, 60], [36, 34, 150]];
      for (let i = 0; i < nc; i++) { const [x, y, gg] = cuerpos[i]; cadaver(a, ps, elegir(a, ['mercader', 'campesino', 'soldado'] as const), [x + az(a, 4), y + az(a, 3), 0], gg + az(a, 40), { sangre: q ? 0 : 0.9, flechas: v === 'emboscada' ? 1 + Math.floor(a.r() * 3) : 0, huesos: v === 'saqueada' && i === 1 }); }
      for (let i = 0; i < 9; i++) { const p: V = [entre(a, -55, 45), entre(a, -30, 40), 0]; flecha(a, ps, p, [az(a, 0.5), az(a, 0.5), 1], 11); }
      if (v === 'saqueada') for (let i = 0; i < 3; i++) ave(a, ps, [entre(a, -30, 30), entre(a, 0, 30), 0], a.r() * PI2, 1, a.r() < 0.6 ? 'picando' : 'posado');
      if (q) { for (let i = 0; i < 8; i++) { const p = polar(a.r() * PI2, a.r() * 24); ps.push(a.esfera(p[0] - 8, p[1] - 6, 0.8, 1 + a.r() * 0.6, { mat: 'ext_brasa', tono: -0.2 })); } return { piezas: ps, resplandor: { c: [-8, -6, 6], r: 36, color: '#a0401a' } }; }
      return ps;
    },
  },
  {
    id: 'par_cadaver', nombre: ['Cadáver', 'Corpse'], tema: PAR, variantes: ['campesino', 'soldado', 'flechado', 'esqueleto', 'con_cuervos'], huella: [3, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloP(a, ps, 34, 22, { matas: 4, manchas: 2 });
      const g = a.r() * 360, tipo = v === 'soldado' || v === 'flechado' ? 'soldado' : elegir(a, ['campesino', 'mercader', 'bandido'] as const);
      cadaver(a, ps, tipo, [-6 * Math.cos(rad(g)), -6 * Math.sin(rad(g)), 0], g, { sangre: v === 'esqueleto' ? 0 : 0.8 + a.r() * 0.4, flechas: v === 'flechado' ? 3 + Math.floor(a.r() * 3) : 0, huesos: v === 'esqueleto', bruces: v === 'flechado' ? true : undefined });
      if (v === 'soldado') { const p = polar(rad(g + 90), 16, 0.6); ps.push(a.palo(p, mas(p, [Math.cos(rad(g)) * 26, Math.sin(rad(g)) * 26, 0.4]), 0.8, { mat: 'madera_vieja' }), a.cilindro(p[0] + 4, p[1] - 3, 0, 7, 1.6, { mat: 'madera_vieja', eje: [0.1, 0.2, 1] })); }
      if (v === 'con_cuervos') for (let i = 0; i < 3; i++) ave(a, ps, [az(a, 22), az(a, 14), i === 0 ? 8 : 0], a.r() * PI2, 1, i === 0 ? 'posado' : a.r() < 0.6 ? 'picando' : 'posado');
      return ps;
    },
  },
);

// ------------------------------------------------------------------ horcas, picotas, ruedas y jaulas
reg({
  id: 'par_horca', nombre: ['Horca', 'Gallows'], tema: PAR, variantes: ['simple', 'ahorcado', 'doble', 'con_cuervos'], cuadros: 8, t: 4, huella: [3, 2], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 36, 26, { matas: 5, piedras: 3 });
    const doble = v === 'doble', H = 82, L = doble ? 40 : 30, mad = 'par_madera_negra';
    // postes con piedras al pie, travesaño y tornapuntas
    const postes: number[] = doble ? [-L / 2, L / 2] : [-L / 2];
    for (const x of postes) {
      ps.push(a.cilindro(x, 0, -1, 2.6, H, { mat: mad, r1: 2.3 }));
      for (let i = 0; i < 4; i++) { const p = polar(a.r() * PI2, 4.5, 0); guijarro(a, ps, x + p[0], p[1], 2.4 + a.r()); }
      paloM(a, ps, marco([0, 0, 0]), [x + (x < 0 ? 0 : 0), 0, H - 18], [x + (x < 0 ? 14 : -14), 0, H - 1.5], 1.2, mad);
    }
    ps.push(a.caja(doble ? 0 : -L / 2 + L / 2 + 4, 0, H - 1, doble ? L + 10 : L + 8, 4.5, 4.5, { mat: mad, tono: 0.03 }));
    // las sogas y lo que cuelga, meciéndose
    const nudos = doble ? [-8, 9] : [4];
    nudos.forEach((x, i) => {
      const mece = Math.sin((f / 8) * PI2 + i * 1.7) * 2.2, gir = Math.sin((f / 8) * PI2 + i) * 8;
      const cuelga = v === 'ahorcado' || v === 'doble' || (v === 'con_cuervos' && i === 0);
      const top: V = [x, 0, H - 1], cuello: V = [x + mece, 0, H - 18];
      if (!cuelga) { ps.push(a.palo(top, [x, 0, H - 14], 0.5, { mat: 'cuerda' })); ps.push(a.cilindro(x, 0, H - 19, 3, 1, { mat: 'cuerda', eje: [0.2, 1, 0.1] }), a.cilindro(x, 0, H - 19, 2.2, 1.4, { mat: 'cuerda', eje: [0.2, 1, 0.1], resta: true })); return; }
      ps.push(a.palo(top, cuello, 0.55, { mat: 'cuerda' }));
      const b = a.r();
      muneco(a, ps, colgado([cuello[0], cuello[1], cuello[2] + 1], 40 + i * 90 + gir), ropaDe(a, b < 0.5 ? 'campesino' : 'bandido'), { brazos: [176, 172], codos: [4, -6], piernas: [3, 5], rodillas: [6, 12], cabeza: az(a, 20), ladea: 30 + a.r() * 20 }, { colgado: true });
    });
    if (v === 'con_cuervos') { ave(a, ps, [-6, 0, H + 3.5], 0.4, 1, 'posado'); ave(a, ps, [12, 0, H + 3.5], 2.8, 1, 'posado'); ave(a, ps, [10, 12, 0], a.r() * PI2, 1, 'picando', { f, nc: 8 }); }
    return ps;
  },
});

reg(
  {
    id: 'par_picota', nombre: ['Picota', 'Pillory'], tema: PAR, variantes: ['vacia', 'con_preso', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloP(a, ps, 22, 20, { matas: 4, piedras: 2 });
      const mad = 'par_madera_negra', g = a.r() * 360, m = marco([0, 0, 0], g);
      // tarima, poste y el cepo de dos tablones con agujeros
      cajaM(a, ps, m, 0, 0, 0, 22, 20, 4, mad, -0.05);
      for (let i = 0; i < 5; i++) cajaM(a, ps, m, -8.8 + i * 4.4, 0, 3.9, 4, 20.4, 0.6, mad, az(a, 0.08));
      cajaM(a, ps, m, 0, -1, 4, 4, 4, v === 'rota' ? 30 : 46, mad);
      const zc = 40;
      if (v === 'rota') { const p = m.T([4, 9, 0.6]); ps.push(a.caja(p[0], p[1], p[2], 30, 6, 3, { mat: mad, giro: g + 20 })); }
      else {
        cajaM(a, ps, m, 0, 1.6, zc - 3, 30, 3, 6, mad); cajaM(a, ps, m, 0, 1.6, zc + 3, 30, 3, 6, mad, 0.04);
        for (const y of [-10, 0, 10]) { const r = y === 0 ? 3 : 1.7, p = m.T([y, 1.6, zc + 3]); ps.push(a.cilindro(p[0], p[1] - 0, p[2], r, 4, { mat: 'negro', eje: m.D([0, 1, 0]), resta: true })); }
        for (const x of [-15, 15]) cajaM(a, ps, m, x, 1.6, zc - 3.5, 1, 3.4, 13, 'ext_hierro');
      }
      if (v === 'con_preso') {
        // el preso doblado: cuerpo de pie inclinado hacia el cepo
        // el preso inclinado hacia adelante: la cabeza en el cepo, los pies en la tarima detrás
        const t = 34, ox = 22 * Math.sin(rad(t)), fm = marco(m.T([0, 1.6 + ox, 3.8 + 30 * Math.cos(rad(t))]), g - 90, t, 0);
        muneco(a, ps, (q) => fm.T([q[2], q[1], q[0]]), ropaDe(a, elegir(a, ['campesino', 'bandido'] as const)), { brazos: [38, 38], codos: [-10, -10], piernas: [6, 8], rodillas: [8, 12], cabeza: 0, ladea: az(a, 10) }, { colgado: true });
        for (let i = 0; i < 3; i++) { const p = m.T([az(a, 10), 30 + a.r() * 8, 0.4]); ps.push(a.esfera(p[0], p[1], 0.8, 1.2, { mat: elegir(a, ['hongo', 'hojas_otono', 'sangre']), tono: -0.1 })); }
      }
      return ps;
    },
  },
  {
    id: 'par_rueda_tortura', nombre: ['Rueda de tormento', 'Breaking wheel'], tema: PAR, variantes: ['con_cuerpo', 'vacia', 'con_cuervos'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloP(a, ps, 20, 18, { matas: 4, piedras: 3 });
      const H = 92;
      ps.push(a.cilindro(0, 0, -1, 2.4, H, { mat: 'par_madera_negra', r1: 2 }));
      for (let i = 0; i < 5; i++) guijarro(a, ps, ...(polar(a.r() * PI2, 5).slice(0, 2) as [number, number]), 2.5 + a.r());
      // la rueda acostada arriba del palo
      rueda(a, ps, [0, 0, H + 1.5], [az(a, 0.12), az(a, 0.12), 1], 15, { rotos: 0.15, mat: 'par_madera_negra' });
      if (v !== 'vacia') {
        // el cuerpo roto encima de la rueda, con brazos y piernas colgando por el borde
        muneco(a, ps, (q) => { const t = marco([0, 0, H + 4.2], 30, 0, 0); const r = Math.hypot(q[0] - 6, q[1]); const cae = Math.max(0, r - 13) * 0.9; return t.T([q[0] - 6, q[1], q[2] - cae]); }, ropaDe(a, 'campesino'), { brazos: [70, 100], codos: [10, -20], piernas: [30, 25], rodillas: [0, 0], cabeza: 50 }, { s: 0.85 });
        for (let i = 0; i < 4; i++) ps.push(a.palo([az(a, 10), az(a, 10), H + 1], [az(a, 12), az(a, 12), H - 6 - a.r() * 8], 0.35, { mat: 'sangre' }));
      }
      if (v === 'con_cuervos') { ave(a, ps, [10, 6, H + 3], 2.2, 1, 'picando'); ave(a, ps, [-11, -3, H + 2.5], 0.3, 1, 'posado'); }
      return ps;
    },
  },
  {
    id: 'par_jaula_colgante', nombre: ['Jaula colgante', 'Gibbet cage'], tema: PAR, variantes: ['vacia', 'esqueleto', 'preso', 'abierta'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      sueloP(a, ps, 22, 20, { matas: 4, piedras: 2 });
      const H = 96, mad = 'par_madera_negra';
      ps.push(a.cilindro(-12, 0, -1, 2.6, H, { mat: mad, r1: 2.2 }), a.caja(-2, 0, H - 2, 30, 4, 4, { mat: mad }));
      ps.push(a.palo([-12, 0, H - 22], [2, 0, H - 2], 1.1, { mat: mad }));
      for (let i = 0; i < 4; i++) guijarro(a, ps, -12 + az(a, 6), az(a, 6), 2.5 + a.r());
      const mece = Math.sin((f / 8) * PI2) * 0.12;
      const top: V = [8, 0, H - 2], c: V = [8 + Math.sin(mece) * 22, 0, H - 26];
      ps.push(a.palo(top, [c[0], c[1], c[2] + 12], 0.5, { mat: 'ext_hierro' }));
      // jaula con forma de cuerpo: aros y barrotes
      const zs = [-14, -6, 4, 10];
      for (const dz of zs) ps.push(a.cilindro(c[0], c[1], c[2] + dz, dz > 5 ? 5 : 7.5, 1, { mat: 'ext_hierro' }), a.cilindro(c[0], c[1], c[2] + dz - 0.2, dz > 5 ? 4.2 : 6.7, 1.4, { mat: 'ext_hierro', resta: true }));
      const nb = 8;
      for (let i = 0; i < nb; i++) {
        if (v === 'abierta' && i >= 2 && i <= 4) continue;
        const t = (i / nb) * PI2, p0 = polar(t, 7, -14, c), p1 = polar(t, 7.5, 4, c), p2 = polar(t, 4.6, 11, c);
        ps.push(a.palo(p0, p1, 0.5, { mat: 'ext_hierro' }), a.palo(p1, p2, 0.5, { mat: 'ext_hierro' }));
      }
      ps.push(a.cilindro(c[0], c[1], c[2] - 15, 7, 1.2, { mat: 'ext_hierro' }));
      if (v === 'abierta') ps.push(a.palo(polar(0.9, 7, -14, c), polar(0.4, 13, -16, c), 0.5, { mat: 'ext_hierro' }), a.palo(polar(0.4, 13, -16, c), polar(0.2, 12, 2, c), 0.5, { mat: 'ext_hierro' }));
      if (v === 'esqueleto') { craneo(a, ps, c[0], c[1], c[2] + 5, 0.85, 0.7); costillar(a, ps, [c[0], c[1], c[2] - 13], [c[0], c[1], c[2] - 1], 6, 4.4, { r: 0.5, abre: 0 }); huesoLargo(ps, [c[0] - 3, c[1] + 2, c[2] - 13.5], [c[0] + 4, c[1] - 3, c[2] - 13.5], 0.6); }
      if (v === 'preso') muneco(a, ps, colgado([c[0], c[1], c[2] + 10], 50), ropaDe(a, 'campesino'), { brazos: [168, 165], codos: [20, -10], piernas: [4, 4], rodillas: [55, 45], cabeza: 15, ladea: 25 }, { colgado: true, s: 0.85 });
      // huesos caídos bajo la jaula
      if (v !== 'preso') { huesoLargo(ps, [6, 6, 0.8], [14, 1, 0.8], 0.7); if (v === 'abierta') craneo(a, ps, 2, 8, 2.6, 0.85, 2); }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ cuervos
reg({
  id: 'par_cuervos', nombre: ['Cuervos', 'Crows'], tema: PAR, variantes: ['grupo', 'comiendo', 'volando', 'posados'], cuadros: 6, t: 4, huella: [2, 2], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    if (v === 'volando') {
      // vuelan en círculo sobre algo muerto
      for (let i = 0; i < 4; i++) { const t = (i / 4) * PI2 + (f / 6) * 0.5 + a.r() * 0.4, R = 18 + a.r() * 10; ave(a, ps, [Math.cos(t) * R, Math.sin(t) * R, 34 + a.r() * 26], t + Math.PI / 2, 1, 'alas', { f: f + i * 1.5, nc: 6 }); }
      return ps;
    }
    sueloP(a, ps, 24, 20, { matas: 3, manchas: 2 });
    if (v === 'comiendo') { bestiaMuerta(a, ps, a.r() < 0.5 ? 'ciervo' : 'jabali', [0, 0, 0], a.r() * 360, { podrida: 0.9, s: 0.75 }); for (let i = 0; i < 4; i++) { const p = polar((i / 4) * PI2 + az(a, 0.4), 15 + a.r() * 4); ave(a, ps, i === 3 ? [p[0] * 0.3, p[1] * 0.3, 14] : p, Math.atan2(-p[1], -p[0]), 1, i === 3 ? 'posado' : 'picando', { f: f + i * 2, nc: 6 }); } return ps; }
    if (v === 'posados') {
      // en un poste de cerca roto y en la rama caída
      ps.push(a.cilindro(0, 0, -1, 2.2, 30, { mat: 'par_madera_negra', r1: 1.6, incl: az(a, 6) }), a.palo([-20, 6, 1.5], [12, -10, 6], 1.6, { mat: 'corteza_muerta', r1: 1 }));
      ave(a, ps, [0, 0, 29], 0.5 + az(a, 0.5), 1, 'posado');
      ave(a, ps, [-12, 2, 3.4], 2 + az(a, 0.5), 1, 'posado');
      ave(a, ps, [8, 10, 0], a.r() * PI2, 1, 'picando', { f, nc: 6 });
      return ps;
    }
    for (let i = 0; i < 5; i++) { const p = polar(a.r() * PI2, a.r() * 18); ave(a, ps, p, a.r() * PI2, 0.9 + a.r() * 0.2, a.r() < 0.5 ? 'picando' : 'posado', { f: f + i * 1.3, nc: 6 }); }
    for (let i = 0; i < 4; i++) huesoLargo(ps, [az(a, 14), az(a, 14), 0.7], [az(a, 14), az(a, 14), 0.7], 0.6);
    return ps;
  },
});

// ------------------------------------------------------------------ santuarios de camino
/** Figura velada de piedra (la virgen doliente del santuario). */
function velada(ps: Pieza[], x: number, y: number, z: number, h: number, mat = 'marmol') {
  ps.push(masa([hueso([x, y, z], [x, y, z + h * 0.75], h * 0.24, h * 0.12), bulto([x, y, z + h * 0.82], [h * 0.12, h * 0.11, h * 0.14]), bulto([x + h * 0.05, y + h * 0.05, z + h * 0.5], [h * 0.12, h * 0.14, h * 0.12], { tono: -0.05 }), bulto([x - h * 0.03, y - h * 0.02, z + h * 0.86], [h * 0.15, h * 0.15, h * 0.12], { tono: 0.04 })], { mat, suave: h * 0.08, tono: -0.25 }));
}
reg({
  id: 'par_santuario', nombre: ['Santuario de camino', 'Wayside shrine'], tema: PAR, variantes: ['capilla', 'cruz', 'nicho', 'apagado'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 24, 22, { matas: 5, piedras: 2 });
    const viva = v !== 'apagado';
    const velas: V[] = [];
    if (v === 'capilla' || v === 'apagado') {
      sillar(a, ps, 0, 0, -1, 24, 20, 6, 0, 'par_sillar');
      ps.push(a.caja(0, 0, 5, 18, 15, 30, { mat: 'par_bloques' }));
      ps.push(a.caja(4, 3, 9, 14, 12, 18, { mat: 'negro', resta: true }));
      ps.push(a.poliedro([[-12, -10, 34], [12, -10, 34], [-12, 10, 34], [12, 10, 34], [-12, 0, 45], [12, 0, 45]], { mat: 'pizarra', tono: -0.05 }));
      ps.push(a.poliedro([[-13, -11, 33.5], [13, -11, 33.5], [-13, 11, 33.5], [13, 11, 33.5], [-13, -11, 35.5], [13, -11, 35.5], [-13, 11, 35.5], [13, 11, 35.5]], { mat: 'par_sillar' }));
      ps.push(a.palo([0, 0, 45], [0, 0, 52], 0.9, { mat: 'ext_hierro' }), a.palo([0, -2.5, 49.5], [0, 2.5, 49.5], 0.8, { mat: 'ext_hierro' }));
      velada(ps, 1, 0, 9, 16);
      ps.push(a.elipsoide(-3, 3, 33.5, 8, 6, 1.2, { mat: 'ext_musgo' }));
      for (let i = 0; i < 4; i++) velas.push([8 + az(a, 2), az(a, 6), 5]);
      for (let i = 0; i < 3; i++) velas.push([14 + a.r() * 4, az(a, 8), 0]);
      // ofrendas: flores secas y un cuenco
      ps.push(a.cilindro(10, -5, 5, 2.2, 1.6, { mat: 'desierto_barro', r1: 2.8 }));
      for (let i = 0; i < 3; i++) ps.push(a.esfera(9 + az(a, 2), 6 + az(a, 2), 5.8, 0.9, { mat: 'ext_brezo_flor' }));
    }
    if (v === 'cruz') {
      sillar(a, ps, 0, 0, -1, 16, 16, 7, a.r() * 20, 'par_sillar');
      sillar(a, ps, 0, 0, 5.5, 11, 11, 5, a.r() * 20, 'par_sillar');
      // cruz de piedra con anillo (gastada y con liquen): la cruz es una masa y el anillo un collar de tramos
      ps.push(masa([
        hueso([0, 0, 10], [0, 0, 58], 3.2, 2.6), hueso([0, -12, 44], [0, 12, 44], 2.6, 2.4), bulto([0, 0, 44], [2.8, 4.5, 4.5]),
        bulto([2.6, 1, 28], [1, 2, 2.6], { mat: 'ext_liquen', k: 0.4 }), bulto([2.4, -1, 52], [1, 1.6, 1.6], { mat: 'ext_liquen', k: 0.4 }), bulto([0, 0, 12], [4, 4, 2.5], { mat: 'ext_musgo', k: 1 }),
      ], { mat: 'par_sillar', suave: 1.2 }));
      for (let i = 0; i < 12; i++) { const t0 = (i / 12) * PI2, t1 = ((i + 1) / 12) * PI2; if (a.r() < 0.12) continue; ps.push(a.palo([0, Math.cos(t0) * 7.5, 44 + Math.sin(t0) * 7.5], [0, Math.cos(t1) * 7.5, 44 + Math.sin(t1) * 7.5], 1.3, { mat: 'par_sillar', tono: -0.03 })); }
      ps.push(a.palo([3, -3, 40], [3.5, -2, 30], 0.35, { mat: 'cuerda' }), a.esfera(3.5, -2, 29.5, 0.9, { mat: 'madera' }));
      for (let i = 0; i < 6; i++) velas.push(polar((i / 6) * PI2 + 0.3, 10 + a.r() * 2, 0));
    }
    if (v === 'nicho') {
      ps.push(a.caja(0, 0, -1, 14, 14, 40, { mat: 'par_sillar' }), a.poliedro([[-8, -8, 39], [8, -8, 39], [-8, 8, 39], [8, 8, 39], [0, 0, 48]], { mat: 'pizarra' }));
      ps.push(a.caja(4, 4, 18, 10, 10, 13, { mat: 'negro', resta: true }));
      craneo(a, ps, 2, 2, 21, 0.9, Math.PI / 4);
      velas.push([3.5, 6, 18], [6, 3.5, 18], [9, 9, 0], [11, 6, 0], [6, 11, 0]);
      for (let i = 0; i < 4; i++) ps.push(a.elipsoide(az(a, 5), 7.2, 4 + a.r() * 30, 2, 0.8, 3, { mat: 'ext_musgo' }));
    }
    // velas: encendidas con su llama que tiembla, o consumidas y apagadas
    velas.forEach((p, i) => { if (viva) vela(a, ps, p[0], p[1], p[2], 2 + a.r() * 4, f + i, 6, 0.9); else ps.push(a.cilindro(p[0], p[1], p[2], 1, 0.8 + a.r() * 1.5, { mat: 'cera', r1: 0.8, tono: -0.15 }), a.cilindro(p[0], p[1], p[2], 1.6, 0.4, { mat: 'cera', tono: -0.2 })); });
    if (!viva) return ps;
    const c = velas.reduce((s, p) => mas(s, p, 1 / velas.length), [0, 0, 0] as V);
    return { piezas: ps, resplandor: { c: [c[0], c[1], c[2] + 6], r: 26 + Math.sin((f / 6) * PI2) * 2, color: '#ffb050' } };
  },
});

// ------------------------------------------------------------------ agua: arroyos, puentes y charcos
/** Cauce a lo largo de x (de -L/2 a L/2), ancho `w`, que serpentea `curva`; espuma que corre con el cuadro. */
function cauce(a: Arma, ps: Pieza[], L: number, w: number, f: number, nc: number, o: { curva?: number; piedras?: number; juncos?: number; sinBordes?: boolean } = {}) {
  const n = 10, fase = a.r() * PI2, cv = o.curva ?? 6;
  const cy = (x: number) => Math.sin((x / L) * Math.PI * 1.4 + fase) * cv;
  for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + (i / n) * L, x1 = x0 + L / n + 0.5, w0 = w * (0.9 + 0.2 * ruido(i * 0.7, fase, 1)), w1 = w * (0.9 + 0.2 * ruido((i + 1) * 0.7, fase, 1));
    if (!o.sinBordes) ps.push(a.poliedro([[x0, cy(x0) - w0 / 2 - 5, -0.3], [x1, cy(x1) - w1 / 2 - 5, -0.3], [x0, cy(x0) + w0 / 2 + 5, -0.3], [x1, cy(x1) + w1 / 2 + 5, -0.3], [x0, cy(x0) - w0 / 2 - 3, 0.8], [x1, cy(x1) - w1 / 2 - 3, 0.8], [x0, cy(x0) + w0 / 2 + 3, 0.8], [x1, cy(x1) + w1 / 2 + 3, 0.8]], { mat: 'ext_barro', tono: az(a, 0.05) }));
    ps.push(a.poliedro([[x0, cy(x0) - w0 / 2, -0.2], [x1, cy(x1) - w1 / 2, -0.2], [x0, cy(x0) + w0 / 2, -0.2], [x1, cy(x1) + w1 / 2, -0.2], [x0, cy(x0) - w0 / 2, 1.1], [x1, cy(x1) - w1 / 2, 1.1], [x0, cy(x0) + w0 / 2, 1.1], [x1, cy(x1) + w1 / 2, 1.1]], { mat: 'ext_agua_lluvia', tono: -0.04 }));
  }
  // espuma: rayas claras que bajan con la corriente
  for (let k = 0; k < 7; k++) {
    const u = ((f / nc) + k / 7 + a.r() * 0.05) % 1, x = -L / 2 + u * L, y = cy(x) + az(a, w * 0.3);
    ps.push(a.elipsoide(x, y, 1.15, 3 + a.r() * 2.5, 0.5, 0.12, { mat: 'ext_espuma', giro: grad(Math.atan2(cy(x + 1) - cy(x), 1)), tono: -0.15 - Math.abs(u - 0.5) * 0.4 }));
  }
  for (let i = 0; i < (o.piedras ?? 3); i++) { const x = az(a, L * 0.45); pena(a, ps, [x, cy(x) + az(a, w * 0.35), -0.5], [2.5 + a.r() * 3, 2 + a.r() * 2.5, 2 + a.r() * 2], { n: 3, mat: 'ext_roca_fria', musgo: 0.4 }); }
  for (let i = 0; i < (o.juncos ?? 3); i++) { const x = az(a, L * 0.45), s = a.r() < 0.5 ? 1 : -1; juncos(a, ps, x, cy(x) + s * (w / 2 + 2), 6 + Math.floor(a.r() * 5), 14); }
  return cy;
}
/** Mata de juncos con espadañas. */
function juncos(a: Arma, ps: Pieza[], x: number, y: number, n: number, alto: number) {
  for (let i = 0; i < n; i++) {
    const b: V = [x + az(a, 3), y + az(a, 3), 0], t: V = [b[0] + az(a, 4), b[1] + az(a, 4), alto * (0.6 + a.r() * 0.5)];
    ps.push(a.palo(b, t, 0.6, { mat: 'ext_pasto', r1: 0.25, tono: az(a, 0.12) }));
    if (a.r() < 0.35) ps.push(a.cilindro(t[0], t[1], t[2] - 5, 1, 4, { mat: 'ext_pelo_caballo', r1: 0.9 }));
  }
}
reg({
  id: 'par_arroyo', nombre: ['Arroyo', 'Brook'], tema: PAR, variantes: ['recto', 'piedras', 'vado', 'juncal'], cuadros: 6, t: 3, huella: [5, 2], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 44, 22, { matas: 6, piedras: 0, manchas: 3 });
    const cy = cauce(a, ps, 84, v === 'vado' ? 26 : 18, f, 6, { piedras: v === 'piedras' ? 8 : 2, juncos: v === 'juncal' ? 9 : 3 });
    // vado: pasaderas planas de lado a lado
    if (v === 'vado') for (let i = 0; i < 5; i++) { const y = cy(4) - 13 + i * 6.5; sillar(a, ps, 4 + az(a, 2), y, -0.4, 6 + a.r(), 5, 3.2, a.r() * 60, 'ext_roca_fria', { jit: 0.8 }); }
    return ps;
  },
});
conVarianteY('par_arroyo');

reg({
  id: 'par_puente', nombre: ['Puente de piedra', 'Stone bridge'], tema: PAR, variantes: ['x', 'roto'], cuadros: 6, t: 3, huella: [6, 4], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 56, 40, { matas: 8, piedras: 2 });
    // el arroyo corre a lo largo de y por debajo
    ps.push(...girarY(() => { const q: Pieza[] = []; cauce(a, q, 92, 24, f, 6, { curva: 3, piedras: 3, juncos: 3 }); return q; }));
    const W = 22, n = 16, L = 104, Rarc = 17;
    const top = (x: number) => 4 + 17 * Math.cos(Math.min(1, Math.abs(x) / (L / 2)) * Math.PI / 2);
    const bajo = (x: number) => (Math.abs(x) < Rarc ? Math.sqrt(Rarc * Rarc - x * x) * 0.95 : 0);
    const roto = v === 'roto' ? [-4, 6] : null;
    for (let i = 0; i < n; i++) {
      const x0 = -L / 2 + (i / n) * L, x1 = x0 + L / n;
      if (roto && x1 > roto[0] && x0 < roto[1]) continue;
      const pts: V[] = [];
      for (const x of [x0, x1]) for (const y of [-W / 2, W / 2]) pts.push([x, y, bajo(x) - (x0 < -L / 2 + 1 || x1 > L / 2 - 1 ? 1 : 0)], [x, y, top(x)]);
      ps.push(a.poliedro(pts, { mat: 'par_bloques', tono: az(a, 0.04) }));
      // pretiles: sillares a los costados (faltan algunos)
      for (const y of [-W / 2 + 1.5, W / 2 - 1.5]) if (a.r() > 0.15 && Math.abs(x0) < L / 2 - 8) sillar(a, ps, (x0 + x1) / 2, y, top((x0 + x1) / 2) - 0.5, x1 - x0 - 0.3, 3, 4.5 + a.r(), 0, 'par_sillar', { jit: 0.5, incl: grad(Math.atan2(top(x1) - top(x0), x1 - x0)) });
    }
    // dovelas del arco por las dos caras
    for (const y of [-W / 2 - 0.4, W / 2 + 0.4]) for (let k = 0; k < 9; k++) {
      const t0 = Math.PI - (k / 9) * Math.PI, t1 = Math.PI - ((k + 1) / 9) * Math.PI, xm = Math.cos((t0 + t1) / 2) * Rarc;
      if (roto && xm > roto[0] - 2 && xm < roto[1] + 2) continue;
      const pts: V[] = [];
      for (const t of [t0, t1]) for (const r of [Rarc, Rarc + 5]) for (const dy of [-1, 1]) pts.push([Math.cos(t) * r, y + dy * 0.7, Math.sin(t) * r * 0.95]);
      ps.push(a.poliedro(pts, { mat: 'par_sillar', tono: az(a, 0.08) - 0.04 }));
    }
    // musgo bajo el arco y en el tajamar
    for (let i = 0; i < 6; i++) { const x = az(a, 40); ps.push(a.elipsoide(x, (a.r() < 0.5 ? -1 : 1) * (W / 2 + 0.3), Math.max(1, bajo(x) + 1 + a.r() * 4), 4 + a.r() * 3, 1, 2.5, { mat: 'ext_musgo' })); }
    if (roto) cascotes(a, ps, 10, 1, 0, 12, 14);
    return ps;
  },
});
conVarianteY('par_puente');
/** Arma piezas en x y las devuelve corriendo a lo largo de y (gira 90°). */
const girarY = (fn: () => Pieza[]): Pieza[] => mover(fn(), [0, 0, 0], 90);

reg({
  id: 'par_charco', nombre: ['Charco bajo la lluvia', 'Rain puddle'], tema: PAR, variantes: ['chico', 'grande', 'barro', 'juncos', 'sangre'], cuadros: 6, t: 3, huella: [2, 2], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    const R = v === 'grande' ? 30 : v === 'chico' ? 12 : 20;
    charco(a, ps, R, R * 0.7, f, 6, { gotas: v === 'grande' ? 6 : v === 'chico' ? 2 : 4, mat: v === 'sangre' ? 'ext_sangre' : v === 'barro' ? 'agua_sucia' : 'ext_agua_lluvia' });
    if (v === 'barro') for (let i = 0; i < 6; i++) { const p = polar(a.r() * PI2, R * (0.8 + a.r() * 0.4)); ps.push(a.elipsoide(p[0], p[1], 0.3, 3 + a.r() * 2, 2, 1, { mat: 'ext_barro', giro: a.r() * 180 })); }
    if (v === 'juncos') { juncos(a, ps, R * 0.7, -R * 0.3, 8, 16); juncos(a, ps, -R * 0.6, R * 0.4, 5, 12); }
    if (v === 'sangre') { cadaver(a, ps, 'campesino', [R * 0.9, 0, 0], a.r() * 360, { huesos: a.r() < 0.4 }); }
    for (let i = 0; i < 3; i++) mata(a, ps, ...(polar(a.r() * PI2, R + 5).slice(0, 2) as [number, number]), 5, 7);
    return ps;
  },
});
