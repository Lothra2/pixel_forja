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

// ------------------------------------------------------------------ molino y granja
/** Aspa de molino: larguero desde el cubo, bastidor de listones a un costado y la lona (o lo que queda de ella). */
function aspa(a: Arma, ps: Pieza[], hub: V, dir: V, lado: V, L: number, o: { lona?: number; mat?: string } = {}) {
  const mat = o.mat ?? 'par_madera_negra', fin = mas(hub, dir, L);
  ps.push(a.palo(hub, fin, 1.1, { mat, r1: 0.8 }));
  const r0 = 8, n = Math.max(2, Math.floor((L - r0) / 5));
  for (const e of [3, 10]) ps.push(a.palo(mas(mas(hub, dir, r0), lado, e), mas(mas(hub, dir, L - 1), lado, e), 0.45, { mat }));
  for (let i = 0; i <= n; i++) { const p = mas(hub, dir, r0 + (i / n) * (L - r0 - 1)); ps.push(a.palo(p, mas(p, lado, 10.5), 0.4, { mat })); }
  for (let i = 0; i < n; i++) {
    if (a.r() > (o.lona ?? 0)) continue;
    const p0 = mas(hub, dir, r0 + (i / n) * (L - r0 - 1)), p1 = mas(hub, dir, r0 + ((i + 1) / n) * (L - r0 - 1)), off = mas([0, 0, 0], cruz(dir, lado), 0.4);
    ps.push(a.poliedro([mas(p0, lado, 1), mas(p1, lado, 1), mas(p0, lado, 10), mas(p1, lado, 10), mas(mas(p0, lado, 1), off), mas(mas(p1, lado, 1), off), mas(mas(p0, lado, 10), off), mas(mas(p1, lado, 10), off)], { mat: 'par_lona', tono: az(a, 0.08) }));
  }
}
const cruz = (p: V, q: V): V => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
reg({
  id: 'par_molino', nombre: ['Molino abandonado', 'Abandoned windmill'], tema: PAR, variantes: ['entero', 'roto', 'quemado'], huella: [5, 5], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    const q = v === 'quemado';
    sueloP(a, ps, 56, 50, { matas: 8, piedras: 4 });
    if (q) ps.push(a.elipsoide(0, 0, 0.1, 34, 30, 1, { mat: 'ext_ceniza' }));
    const H = 62, R0 = 18, R1 = 13;
    ps.push(a.cilindro(0, 0, -1, R0 + 2.5, 6, { mat: 'par_bloques', r1: R0 + 0.5, tono: -0.05 }), a.cilindro(0, 0, 4, R0, H - 4, { mat: 'par_bloques', r1: R1 }));
    for (let i = 0; i < 8; i++) { const t = rad(80 + az(a, 80)), z = 4 + a.r() * (H - 10), r = R0 - (R0 - R1) * (z / H); ps.push(a.elipsoide(Math.cos(t) * r, Math.sin(t) * r, z, 4 + a.r() * 3, 2, 3 + a.r() * 4, { mat: q ? 'ext_carbon' : 'ext_musgo', giro: grad(t) + 90 })); }
    // puerta y ventanas
    const tp = rad(45), pp = polar(tp, R0 + 1);
    ps.push(a.caja(pp[0], pp[1], 4, 8, 12, 20, { mat: 'negro', giro: grad(tp), resta: true }), a.caja(Math.cos(tp) * (R0 - 3), Math.sin(tp) * (R0 - 3), 4, 1, 11, 19, { mat: 'negro', giro: grad(tp) }));
    for (const [t, z] of [[rad(10), 34], [rad(85), 46], [rad(60), 24]] as [number, number][]) { const r = R0 - (R0 - R1) * (z / H), p = polar(t, r + 0.5); ps.push(a.caja(p[0], p[1], z, 4, 5, 7, { mat: 'negro', giro: grad(t), resta: true }), a.caja(Math.cos(t) * (r - 2.5), Math.sin(t) * (r - 2.5), z, 1, 4.5, 6.6, { mat: q ? 'ext_brasa' : 'negro', giro: grad(t), tono: q ? -0.4 : 0 })); }
    // capota de paja (o la cabeza quemada abierta)
    if (!q) {
      ps.push(a.cilindro(0, 0, H - 1, R1 + 3, 3, { mat: 'par_madera_negra', r1: R1 + 2.5 }));
      ps.push(a.cilindro(0, 0, H + 1.5, R1 + 3.5, 21, { mat: 'par_paja_podrida', r1: 1.5 }));
      if (v === 'roto') ps.push(a.elipsoide(-4, -6, H + 12, 6, 6, 4, { mat: 'negro', resta: true }), a.palo([-4, -6, H + 4], [-7, -3, H + 15], 0.8, { mat: 'par_madera_negra' }), a.palo([-1, -9, H + 4], [-2, -4, H + 15], 0.8, { mat: 'par_madera_negra' }));
    } else {
      ps.push(a.cilindro(0, 0, H - 2, R1 - 2, 4, { mat: 'negro', resta: true }), a.cilindro(0, 0, H - 4, R1 - 2.5, 2, { mat: 'ext_carbon' }));
      for (let i = 0; i < 5; i++) { const t = a.r() * PI2; ps.push(a.palo(polar(t, R1 - 2, H - 1), polar(t + Math.PI + az(a, 0.6), R1 - 4, H + 4 + a.r() * 8), 1.1, { mat: 'ext_carbon' })); }
      humo(a, ps, 2, 6, 0, 0, H + 6, 34, 4, 5);
    }
    // aspas mirando al frente (de cara a la cámara): plano perpendicular al eje del cubo
    const th = rad(20), d: V = [Math.cos(th), Math.sin(th), 0], u: V = [-Math.sin(th), Math.cos(th), 0], hub = mas([0, 0, H + 5], d, R1 + 6);
    ps.push(a.palo(mas(hub, d, -10), hub, 2, { mat: q ? 'ext_carbon' : 'par_madera_negra' }), a.esfera(hub[0], hub[1], hub[2], 2.8, { mat: q ? 'ext_carbon' : 'par_madera_negra' }));
    const fase = a.r() * Math.PI / 2;
    for (let k = 0; k < 4; k++) {
      const t = fase + (k * Math.PI) / 2, dir = nrm(mas(mas([0, 0, 0], u, Math.cos(t)), [0, 0, 1], Math.sin(t))), lado = nrm(mas(mas([0, 0, 0], u, -Math.sin(t)), [0, 0, 1], Math.cos(t)));
      const L = v === 'entero' ? 50 : k % 2 ? 18 + a.r() * 12 : 50;
      if (q && k === 1) continue;
      aspa(a, ps, hub, dir, lado, L, { lona: q ? 0 : v === 'roto' ? 0.3 : 0.75, mat: q ? 'ext_carbon' : undefined });
    }
    if (v !== 'entero') {
      // un aspa caída en el pasto
      const b: V = [24, 30, 1.2], dir = nrm([1, -0.5, 0.01]);
      aspa(a, ps, b, dir, [0.45, 0.9, 0.04], 40, { lona: q ? 0 : 0.35, mat: q ? 'ext_carbon' : undefined });
    }
    cascotes(a, ps, 5, 22, -10, 10, 14);
    for (let i = 0; i < 2; i++) bultoCarga(a, ps, 26 + i * 9, 14 + az(a, 4), true);
    return ps;
  },
});

reg({
  id: 'par_granja', nombre: ['Granja quemada', 'Burned farmhouse'], tema: PAR, variantes: ['quemada', 'derrumbada', 'chimenea'], huella: [6, 5], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 64, 54, { matas: 9, piedras: 3 });
    ps.push(a.elipsoide(0, 0, 0.2, 46, 36, 1.1, { mat: 'ext_ceniza', giro: a.r() * 20 }));
    const X = 42, Y = 32, T = 9;
    const k = v === 'quemada' ? 1 : v === 'derrumbada' ? 0.45 : 0.3;
    const perfil = (H: number, fase: number) => (u: number) => Math.max(4, (H + (ruido(u * 0.07, fase, 2) - 0.5) * H * 0.9) * k);
    // muros: más altos al fondo, la puerta en el de enfrente
    muroSillares(a, ps, X * 2, T, perfil(46, 1), { dy: -Y, musgo: 0.3 });
    muroSillares(a, ps, Y * 2 - T, T, perfil(40, 2), { dx: -X + T / 2, giro: 90, musgo: 0.3 });
    muroSillares(a, ps, X - 8, T, perfil(26, 3), { dx: -X / 2 - 4, dy: Y, musgo: 0.3 });
    muroSillares(a, ps, X - 12, T, perfil(22, 4), { dx: X / 2 + 6, dy: Y, musgo: 0.3 });
    muroSillares(a, ps, Y * 2 - T, T, perfil(18, 5), { dx: X - T / 2, giro: 90, musgo: 0.3 });
    // la chimenea en pie en la esquina del fondo
    for (let z = 0, w = 15; z < 92; z += 7.6, w = z > 50 ? 10 : 15) sillar(a, ps, -X + 8, -Y + 8, z, w, w, 7.4, az(a, 2), 'par_sillar', { jit: 0.6 });
    ps.push(a.caja(-X + 8, -Y + 8, 86, 5, 5, 8, { mat: 'negro', resta: true }));
    ps.push(a.caja(-X + 16, -Y + 14, 4, 4, 8, 12, { mat: 'negro' }));
    if (v !== 'chimenea') {
      // postes y vigas de la casa, carbonizados; la cumbrera caída sobre el interior
      const vigas = v === 'quemada' ? 7 : 4;
      for (const [x, y] of [[-X + 6, Y - 6], [X - 6, -Y + 6], [X - 6, Y - 6], [0, -Y + 6]] as [number, number][]) if (a.r() < 0.8) ps.push(a.cilindro(x, y, 0, 2.6, 18 + a.r() * 34, { mat: 'ext_carbon', r1: 1.6, incl: az(a, 8) }));
      for (let i = 0; i < vigas; i++) { const p: V = [entre(a, -X + 8, X - 8), entre(a, -Y + 8, Y - 8), 1.5], q2: V = [p[0] + az(a, 30), p[1] + az(a, 22), 2 + a.r() * 26]; ps.push(a.palo(p, q2, 1.6 + a.r(), { mat: 'ext_carbon', r1: 1.2 })); }
      ps.push(a.palo([-X + 4, -4, 44 * k], [X - 10, 6, 2], 2.4, { mat: 'ext_carbon', r1: 2 }));
      for (let i = 0; i < 7; i++) { const p: V = [entre(a, -X + 10, X - 10), entre(a, -Y + 10, Y - 10), 0.6]; ps.push(a.esfera(p[0], p[1], p[2], 1 + a.r() * 0.6, { mat: 'ext_brasa', tono: -0.3 })); }
      // tejas de pizarra caídas y una olla
      for (let i = 0; i < 8; i++) ps.push(a.caja(entre(a, -X, X), entre(a, -Y, Y + 8), 0.2, 5, 3.5, 0.8, { mat: 'pizarra', giro: a.r() * 180, incl: az(a, 15) }));
      ps.push(a.cilindro(-X + 18, -Y + 18, 0, 4, 6, { mat: 'ext_hierro', r1: 5, eje: [0.3, 0.2, 1] }));
    } else for (let i = 0; i < 8; i++) mata(a, ps, entre(a, -X, X), entre(a, -Y, Y), 7, 12, a.r() < 0.5 ? 'ext_pasto' : 'ext_pasto_seco');
    cascotes(a, ps, v === 'derrumbada' ? 20 : 8, 4, Y + 6, X, 10);
    return v === 'quemada' ? { piezas: ps, resplandor: { c: [0, 0, 3], r: 40, color: '#8a3010' } } : ps;
  },
});

reg({
  id: 'par_rescoldos', nombre: ['Rescoldos humeantes', 'Smoldering embers'], tema: PAR, variantes: ['brasas', 'humo', 'tablas'], cuadros: 6, t: 3, huella: [2, 2], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    ps.push(a.elipsoide(0, 0, 0, 24, 20, 1.6, { mat: 'ext_ceniza', giro: a.r() * 180 }));
    const n = v === 'tablas' ? 9 : 6;
    for (let i = 0; i < n; i++) { const t = a.r() * PI2, p: V = polar(t, a.r() * 10, 1), q: V = polar(t + az(a, 1), 8 + a.r() * 10, 1 + a.r() * 5); if (v === 'tablas') tabla(a, ps, p, q, 4, 1.4, 'ext_carbon'); else ps.push(a.palo(p, q, 1.6 + a.r(), { mat: 'ext_carbon', r1: 1 })); }
    // brasas que laten
    for (let i = 0; i < 9; i++) { const p = polar(a.r() * PI2, a.r() * 12), k = Math.sin((f / 6) * PI2 + i * 1.9); ps.push(a.esfera(p[0], p[1], 1 + a.r(), 1 + a.r() * 0.8, { mat: 'ext_brasa', tono: -0.25 + k * 0.2 })); }
    if (v !== 'brasas') { humo(a, ps, f, 6, 2, -2, 4, 40, 5, 4); humo(a, ps, f + 3, 6, -6, 5, 3, 28, 4, 3); }
    else chispas(a, ps, f, 6, 0, 0, 3, 16, 4);
    return { piezas: ps, resplandor: { c: [0, 0, 3], r: 15 + Math.sin((f / 6) * PI2) * 2, color: '#8a3010' } };
  },
});

// ------------------------------------------------------------------ pozo y cercas
reg({
  id: 'par_pozo', nombre: ['Pozo de piedra', 'Stone well'], tema: PAR, variantes: ['piedra', 'tejado', 'roto', 'cubo'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 24, 22, { matas: 5, piedras: 2 });
    const R = 11, n = 11, roto = v === 'roto';
    ps.push(a.cilindro(0, 0, -1, R - 2, 10, { mat: 'negro' }), a.cilindro(0, 0, 1, R - 3, 1.5, { mat: 'ext_agua_lluvia', tono: -0.15 }));
    for (let fila = 0; fila < 3; fila++) for (let i = 0; i < n; i++) {
      const t = ((i + (fila % 2) * 0.5) / n) * PI2;
      if (roto && fila > 0 && Math.cos(t - 0.8) > 0.2 - fila * 0.3) continue;
      sillar(a, ps, Math.cos(t) * R, Math.sin(t) * R, fila * 4.2 - 1, (PI2 * R) / n - 0.4, 5, 4, grad(t) + 90, 'par_sillar', { jit: 0.6 });
      if (fila === 2 && a.r() < 0.35) ps.push(a.elipsoide(Math.cos(t) * R, Math.sin(t) * R, 11.3, 3.5, 2.4, 1, { mat: 'ext_musgo', giro: grad(t) + 90 }));
    }
    if (roto) cascotes(a, ps, 7, 16, 12, 8, 8);
    if (v === 'tejado' || v === 'roto') {
      const mad = 'par_madera_negra';
      for (const s of [-1, 1]) { if (roto && s > 0) { ps.push(a.palo([3, 16, 1], [20, 22, 3], 1.4, { mat: mad })); continue; } ps.push(a.cilindro(0, s * (R + 1), -1, 1.4, 34, { mat: mad })); }
      if (!roto) {
        ps.push(a.poliedro([[-10, -16, 31], [10, -16, 31], [-10, 16, 31], [10, 16, 31], [0, -16, 40], [0, 16, 40]], { mat: 'pizarra', tono: -0.1 }));
        ps.push(a.cilindro(0, -R, 25, 1.8, 2 * R, { mat: mad, eje: [0, 1, 0] }), a.palo([0, -R - 1, 25], [5, -R - 1, 21], 0.6, { mat: 'ext_hierro' }));
        ps.push(a.palo([0, 1, 23.5], [0, 1, 10], 0.35, { mat: 'cuerda' }), a.cilindro(0, 1, 6, 2.6, 4.5, { mat: 'madera_vieja', r1: 3 }), a.cilindro(0, 1, 6.4, 2.9, 0.6, { mat: 'ext_hierro' }));
      }
    }
    if (v === 'cubo') {
      ps.push(a.cilindro(R - 1, 3, 12, 2.6, 4.5, { mat: 'madera_vieja', r1: 3, eje: [0.15, 0, 1] }), a.cilindro(R - 1, 3, 12.5, 2.9, 0.6, { mat: 'ext_hierro' }));
      for (let i = 0; i < 4; i++) ps.push(a.cilindro(R + 6, -6, 0.3 + i * 0.7, 4 - i * 0.3, 0.6, { mat: 'cuerda' }));
      ps.push(a.palo([R + 5, -4, 2.5], [R - 0.5, 1, 12.5], 0.35, { mat: 'cuerda' }));
    }
    return ps;
  },
});

reg({
  id: 'par_cerca_piedra', nombre: ['Cerca de piedra seca', 'Dry-stone wall'], tema: PAR, variantes: ['x', 'rota', 'baja', 'esquina'], huella: [5, 1], huellaPor: { esquina: [5, 5], esquina_y: [5, 5] }, bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    const piedras = (L: number, H: number, giro: number, dx: number, dy: number, hueco = false) => {
      const c = Math.cos(rad(giro)), s = Math.sin(rad(giro));
      for (let z = 0, fila = 0; z < H; fila++) {
        const h = 3 + a.r() * 1.6;
        for (let u = -L / 2 + (fila % 2) * 3; u < L / 2 - 2;) {
          const l = 4.5 + a.r() * 5;
          if (!(hueco && Math.abs(u + l / 2) < 13 - z * 0.3)) sillar(a, ps, dx + (u + l / 2) * c, dy + (u + l / 2) * s, z, l - 0.3, 9 - z * 0.12 + az(a, 0.8), h, giro + az(a, 6), a.r() < 0.4 ? 'ext_roca_fria' : 'ext_roca', { jit: 1.1, incl: az(a, 6) });
          u += l;
        }
        z += h * 0.92;
      }
      // albardilla: lajas de canto arriba
      for (let u = -L / 2 + 2; u < L / 2 - 2; u += 3.2 + a.r()) if (!(hueco && Math.abs(u) < 13)) sillar(a, ps, dx + u * c, dy + u * s, H - 0.5, 2.2, 8, 4 + a.r() * 2, giro, 'ext_roca_fria', { jit: 0.6, incl: az(a, 12) });
    };
    if (v === 'esquina') { sueloP(a, ps, 44, 44, { matas: 6, piedras: 0 }); piedras(44, 17, 0, -18, -18 + 4); piedras(40, 17, 90, -18, 6); }
    else {
      sueloP(a, ps, 46, 14, { matas: 6, piedras: 0 });
      piedras(80, v === 'baja' ? 10 : 18, 0, 0, 0, v === 'rota');
      if (v === 'rota') for (let i = 0; i < 12; i++) guijarro(a, ps, az(a, 14), 6 + a.r() * 12, 2 + a.r() * 2.5, 'ext_roca');
    }
    for (let i = 0; i < 4; i++) mata(a, ps, az(a, 36), 6 + a.r() * 3, 6, 9, a.r() < 0.5 ? 'ext_pasto' : 'ext_pasto_seco');
    return ps;
  },
});
conVarianteY('par_cerca_piedra');

// ------------------------------------------------------------------ brezo, matas y pasto
M.par_flor_blanca = { rampa: ['#2b2a25', '#45433b', '#615e53', '#7d796b', '#989382', '#b0ab98'], ruido: 0.3, escala: 0.8 };
M.par_flor_amarilla = { rampa: ['#29210b', '#413512', '#5b4a19', '#756021', '#8e752b', '#a58a37'], ruido: 0.3, escala: 0.8 };
M.par_enebro = { rampa: ['#050807', '#0a100d', '#101914', '#16221b', '#1d2c23', '#25372c'], ruido: 0.55, escala: 1.1, patron: (p) => (ruido(p[0] * 0.9, p[1] * 0.9, p[2] * 0.9) > 0.62 ? 0.1 : -0.03) };
reg({
  id: 'par_brezo', nombre: ['Brezal', 'Heather'], tema: PAR, variantes: ['morado', 'seco', 'florido', 'mezcla', 'grande'], huella: [1, 1], huellaPor: { grande: [2, 2] }, bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    const R = v === 'grande' ? 22 : 12;
    sueloP(a, ps, R + 6, R + 4, { matas: 3, piedras: 1 });
    const n = v === 'grande' ? 6 : 3 + Math.floor(a.r() * 2);
    for (let i = 0; i < n; i++) {
      const p = i ? polar(a.r() * PI2, R * (0.5 + a.r() * 0.5)) : [0, 0, 0];
      const mat = v === 'seco' ? 'ext_pasto_seco' : v === 'florido' ? 'ext_brezo_flor' : v === 'mezcla' ? elegir(a, ['ext_brezo', 'ext_brezo_flor', 'ext_pasto_seco']) : 'ext_brezo';
      brezo(a, ps, p[0], p[1], (i ? 4 : 6) + a.r() * 3, mat);
    }
    if (v === 'mezcla' || v === 'grande') for (let i = 0; i < 2; i++) guijarro(a, ps, az(a, R), az(a, R), 2.5 + a.r() * 2);
    return ps;
  },
});

/** Mata leñosa: ramas que se abren desde el pie y follaje en bultos al final de cada rama (una sola masa). */
function arbusto(a: Arma, ps: Pieza[], x: number, y: number, R: number, H: number, mat: string, o: { ramas?: number; seco?: boolean; flor?: string; nflor?: number; conico?: boolean } = {}) {
  const n = o.ramas ?? 6, puntas: V[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * PI2 + az(a, 0.5), d = R * (0.4 + a.r() * 0.6), p: V = [x + Math.cos(t) * d, y + Math.sin(t) * d, H * (0.45 + a.r() * 0.55)];
    const m: V = [x + Math.cos(t) * d * 0.4 + az(a, 1), y + Math.sin(t) * d * 0.4 + az(a, 1), p[2] * 0.45];
    ps.push(a.palo([x, y, 0], m, 1, { mat: 'corteza_muerta', r1: 0.7 }), a.palo(m, p, 0.7, { mat: 'corteza_muerta', r1: 0.35 }));
    if (o.seco) for (let k = 0; k < 2; k++) ps.push(a.palo(p, mas(p, [az(a, 4), az(a, 4), 2 + a.r() * 3]), 0.35, { mat: 'corteza_muerta', r1: 0.15 }));
    puntas.push(p);
  }
  if (o.seco) return;
  const cs: Comp[] = [];
  if (o.conico) for (let k = 0; k < 5; k++) { const t = k / 5; cs.push(bulto([x + az(a, 1), y + az(a, 1), H * (0.15 + t * 0.85)], [R * (0.75 - t * 0.6), R * (0.75 - t * 0.6), H * 0.2], { tono: az(a, 0.05) })); }
  else for (const p of puntas) cs.push(bulto(p, [R * (0.32 + a.r() * 0.14), R * (0.3 + a.r() * 0.14), H * (0.22 + a.r() * 0.1)], { giro: a.r() * 180, tono: az(a, 0.07) }));
  if (!o.conico) cs.push(bulto([x, y, H * 0.45], [R * 0.55, R * 0.55, H * 0.35], { tono: -0.08 }));
  ps.push(masa(cs, { mat, suave: R * 0.25 }));
  if (o.flor) for (let i = 0; i < (o.nflor ?? 10); i++) { const p = elegir(a, puntas); ps.push(a.esfera(p[0] + az(a, R * 0.3), p[1] + az(a, R * 0.3), p[2] + H * 0.1 + a.r() * H * 0.12, 0.9 + a.r() * 0.5, { mat: o.flor, tono: az(a, 0.1) })); }
}
reg({
  id: 'par_matorral', nombre: ['Matorral', 'Scrub'], tema: PAR, variantes: ['espinoso', 'seco', 'aulaga', 'enebro'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 16, 14, { matas: 3, piedras: 1 });
    const R = 9 + a.r() * 4;
    if (v === 'espinoso') { arbusto(a, ps, 0, 0, R, 14 + a.r() * 5, 'ext_pasto', { ramas: 7, flor: 'ext_sangre', nflor: 12 }); for (let i = 0; i < 8; i++) { const p = polar(a.r() * PI2, R * 0.9, 4 + a.r() * 8); ps.push(a.palo(p, mas(p, [az(a, 4), az(a, 4), 3]), 0.35, { mat: 'corteza_muerta', r1: 0.1 })); } }
    if (v === 'seco') arbusto(a, ps, 0, 0, R, 16 + a.r() * 6, 'ext_pasto_seco', { ramas: 9, seco: true });
    if (v === 'aulaga') { arbusto(a, ps, 0, 0, R, 13 + a.r() * 4, 'par_enebro', { ramas: 7, flor: 'ext_aulaga', nflor: 22 }); arbusto(a, ps, R * 0.9, -R * 0.5, R * 0.55, 9, 'par_enebro', { ramas: 4, flor: 'ext_aulaga', nflor: 8 }); }
    if (v === 'enebro') { arbusto(a, ps, 0, 0, R * 0.8, 32 + a.r() * 10, 'par_enebro', { ramas: 3, conico: true }); arbusto(a, ps, R, R * 0.4, R * 0.5, 14, 'par_enebro', { ramas: 3, conico: true }); }
    return ps;
  },
});

reg({
  id: 'par_pasto', nombre: ['Pasto del páramo', 'Moor grass'], tema: PAR, variantes: ['verde', 'seco', 'juncos', 'cardos', 'flores'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 15, 12, { matas: 0, piedras: 1, manchas: 2 });
    if (v === 'verde' || v === 'seco' || v === 'flores') for (let i = 0; i < 5; i++) { const p = i ? polar(a.r() * PI2, 4 + a.r() * 8) : [0, 0, 0]; mata(a, ps, p[0], p[1], 7 + Math.floor(a.r() * 5), (v === 'seco' ? 12 : 9) + a.r() * 5, v === 'seco' ? 'ext_pasto_seco' : a.r() < 0.25 ? 'ext_pasto_seco' : 'ext_pasto'); }
    if (v === 'flores') for (let i = 0; i < 9; i++) { const p = polar(a.r() * PI2, a.r() * 11), h = 5 + a.r() * 7; ps.push(a.palo([p[0], p[1], 0], [p[0] + az(a, 1), p[1] + az(a, 1), h], 0.3, { mat: 'ext_pasto' }), a.esfera(p[0], p[1], h + 0.3, 1.1, { mat: elegir(a, ['par_flor_blanca', 'par_flor_amarilla', 'ext_brezo_flor']), tono: az(a, 0.1) })); }
    if (v === 'juncos') { juncos(a, ps, 0, 0, 9, 18); juncos(a, ps, 7, -5, 6, 13); }
    if (v === 'cardos') for (let i = 0; i < 4; i++) {
      // cardo: tallo, hojas espinosas y la cabeza morada sobre su copa de púas
      const p = i ? polar(a.r() * PI2, 5 + a.r() * 6) : [0, 0, 0], h = 14 + a.r() * 10, top: V = [p[0] + az(a, 2), p[1] + az(a, 2), h];
      ps.push(a.palo([p[0], p[1], 0], top, 0.6, { mat: 'ext_pasto', r1: 0.45 }));
      for (let k = 0; k < 4; k++) { const t = a.r() * PI2, z = 2 + a.r() * h * 0.5, b: V = [p[0], p[1], z]; ps.push(a.poliedro([b, mas(b, [Math.cos(t) * 7, Math.sin(t) * 7, 2]), mas(b, [Math.cos(t + 0.4) * 3.5, Math.sin(t + 0.4) * 3.5, 1.5]), mas(b, [Math.cos(t - 0.4) * 3.5, Math.sin(t - 0.4) * 3.5, 0.6]), mas(b, [0, 0, 0.5])], { mat: 'ext_pasto', tono: az(a, 0.08) })); }
      ps.push(a.cilindro(top[0], top[1], top[2] - 1, 1.8, 2.6, { mat: 'ext_pasto_seco', r1: 1.2 }), a.elipsoide(top[0], top[1], top[2] + 2.4, 1.6, 1.6, 1.6, { mat: 'ext_brezo_flor', tono: 0.05 }));
      mata(a, ps, p[0], p[1], 4, 6, 'ext_pasto');
    }
    return ps;
  },
});

// ------------------------------------------------------------------ estandartes rotos
reg({
  id: 'par_estandarte', nombre: ['Estandarte roto', 'Torn banner'], tema: PAR, variantes: ['rojo', 'negro', 'jirones', 'caido'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 14, 12, { matas: 3, piedras: 3 });
    const mat = v === 'negro' ? 'cu_tela_negra' : v === 'jirones' ? elegir(a, ['tela_azul', 'tela_verde', 'tela_roja']) : 'tela_roja';
    if (v === 'caido') {
      // el asta partida en el barro y la tela tendida encima
      ps.push(a.cilindro(0, 0, -1, 1.5, 22, { mat: 'par_madera_negra', incl: 14 }), a.palo([4, 6, 1.4], [42, 22, 1.4], 1.4, { mat: 'par_madera_negra' }));
      for (let k = 0; k < 7; k++) { const t = k / 7; ps.push(a.poliedro([[16 + t * 22, 8 + t * 9, 0.4], [16 + (t + 1 / 7) * 22, 8 + (t + 1 / 7) * 9, 0.4], [10 + t * 22, 22 + t * 9, 0.4], [10 + (t + 1 / 7) * 22, 22 + (t + 1 / 7) * 9, 0.4], [13 + t * 22, 15 + t * 9, 1.6 + Math.sin(k * 1.7) * 1.2], [13 + (t + 1 / 7) * 22, 15 + (t + 1 / 7) * 9, 1.6 + Math.sin(k * 1.7 + 1.7) * 1.2]], { mat, tono: az(a, 0.08) })); }
      ps.push(a.elipsoide(26, 16, 1.6, 6, 4, 1, { mat: 'ext_barro' }));
      return ps;
    }
    // asta torcida, travesaño y la tela que ondea
    const tilt: V = [az(a, 4), az(a, 4), 0], top: V = [tilt[0], tilt[1], 88];
    ps.push(a.palo([0, 0, -1], top, 1.5, { mat: 'par_madera_negra', r1: 1.2 }));
    for (let i = 0; i < 5; i++) guijarro(a, ps, ...(polar((i / 5) * PI2, 4).slice(0, 2) as [number, number]), 2.6 + a.r());
    const y0 = -15, y1 = 15, zb = top[2] - 6;
    ps.push(a.palo([top[0], top[1] + y0 - 1, zb], [top[0], top[1] + y1 + 1, zb + az(a, 2)], 0.9, { mat: 'par_madera_negra' }));
    pano(a, ps, [top[0] + 0.8, top[1] + y0, zb - 0.5], [top[0] + 0.8, top[1] + y1, zb - 0.5], 40, mat, f, 6, { tiras: 8, jirones: v === 'jirones' ? 0.6 : 0.2, viento: 1.4 });
    if (v === 'negro') craneo(a, ps, top[0], top[1], top[2] + 3.4, 1, 0.8);
    else ps.push(a.poliedro([[top[0] - 1, top[1], top[2]], [top[0] + 1, top[1], top[2]], [top[0], top[1] - 1, top[2]], [top[0], top[1] + 1, top[2]], [top[0], top[1], top[2] + 7]], { mat: 'ext_hierro' }));
    return ps;
  },
});

// ------------------------------------------------------------------ campamento de bandidos
reg({
  id: 'par_tienda_bandidos', nombre: ['Tienda de bandidos', 'Bandit lean-to'], tema: PAR, variantes: ['lona', 'pieles', 'derrumbada'], huella: [4, 3], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 42, 32, { matas: 5, piedras: 2 });
    const mad = 'par_madera_negra', L = 26, Wd = 17, Hc = v === 'derrumbada' ? 14 : 30;
    // horcones y cumbrera
    for (const x of [-L, L]) { if (v === 'derrumbada' && x > 0) { ps.push(a.palo([x, 0, 0], [x + 10, 10, 2], 1.4, { mat: mad })); continue; } ps.push(a.palo([x, 0, -1], [x, 0, 32], 1.4, { mat: mad }), a.palo([x, 0, 28], [x - 1, -3, 34], 0.8, { mat: mad }), a.palo([x, 0, 28], [x + 1, 3, 34], 0.8, { mat: mad })); }
    ps.push(a.palo([-L - 4, 0, Hc + 1.5], [L + 4, 0, v === 'derrumbada' ? 3 : Hc + 1.5], 1.2, { mat: mad }));
    // paños de lona o cueros cosidos que bajan hasta las estacas (combados)
    const mats = v === 'pieles' ? ['par_piel_bestia', 'cu_pelaje', 'ext_cuero_seco'] : ['par_lona', 'par_lona', 'ext_tela_sucia'];
    const n = 5;
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      if (v === 'derrumbada' && s > 0 && i > 2) continue;
      const x0 = -L + (i / n) * 2 * L, x1 = x0 + (2 * L) / n + 0.6, hz = (x: number) => (v === 'derrumbada' ? Hc * (1 - (x + L) / (2 * L) * 0.85) : Hc);
      const P = (x: number, t: number, e: number): V => [x, s * Wd * t, hz(x) * (1 - t) + 1 - Math.sin(t * Math.PI) * 3 + e];
      const pts: V[] = [];
      for (const x of [x0, x1]) for (const t of [0, 0.5, 1]) pts.push(P(x, t, 0), P(x, t, 0.8));
      ps.push(a.poliedro(pts.slice(0, 4).concat(pts.slice(6, 10)), { mat: elegir(a, mats), tono: az(a, 0.07) }));
      ps.push(a.poliedro(pts.slice(2, 6).concat(pts.slice(8, 12)), { mat: elegir(a, mats), tono: az(a, 0.07) - 0.03 }));
    }
    for (const x of [-L, -L / 3, L / 3, L]) for (const s of [-1, 1]) ps.push(a.palo([x, s * (Wd + 2), 3], [x, s * (Wd + 3), -1], 0.6, { mat: mad }), a.palo([x, s * Wd, 1.5], [x, s * (Wd + 2), 3], 0.3, { mat: 'cuerda' }));
    // adentro: el jergón y un hacha
    ps.push(a.elipsoide(-6, 22, 1.5, 12, 6, 2, { mat: 'cu_pelaje', giro: az(a, 15) }));
    ps.push(a.palo([10, 24, 0.8], [26, 30, 0.8], 0.8, { mat: 'madera' }), a.caja(26, 30, 0, 4, 6, 1.2, { mat: 'ext_hierro', giro: 20 }));
    if (v === 'pieles') { craneo(a, ps, L, 0, 35, 1, 0.8); for (let i = 0; i < 3; i++) huesoLargo(ps, [-L + 4 + i * 5, 24, 0.8], [-L + 8 + i * 5, 30, 0.8], 0.7); }
    return ps;
  },
});

reg({
  id: 'par_fogata_bandidos', nombre: ['Fogata de bandidos', 'Bandit campfire'], tema: PAR, variantes: ['olla', 'asador', 'apagada'], cuadros: 6, t: 3, huella: [3, 3], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 36, 32, { matas: 4, piedras: 0 });
    ps.push(a.elipsoide(0, 0, 0.1, 14, 14, 1.2, { mat: 'ext_ceniza' }));
    for (let i = 0; i < 10; i++) { const t = (i / 10) * PI2 + az(a, 0.1); pena(a, ps, polar(t, 12), [3.2, 2.6, 2.6], { n: 3, mat: 'ext_roca_fria' }); }
    // troncos para sentarse y leña
    for (const t of [rad(30), rad(150), rad(260)]) { const p = polar(t, 26), d = [-Math.sin(t), Math.cos(t), 0] as V; ps.push(masa([hueso(mas(p, d, -12, ), mas(p, d, 12), 3.6, 3.2)], { mat: 'corteza', suave: 1 })); ps.push(a.cilindro(...(mas(p, d, 12) as V), 3.2, 0.6, { mat: 'madera_lisa', eje: d })); }
    const n = 5;
    for (let i = 0; i < n; i++) { const t = (i / n) * PI2 + a.r() * 0.4; ps.push(a.palo(polar(t, 9, 0.5), polar(t, 1.5, v === 'apagada' ? 3 : 12), 1.8, { mat: v === 'apagada' ? 'ext_carbon' : 'corteza', r1: 1.1 })); }
    if (v === 'apagada') { for (let i = 0; i < 4; i++) ps.push(a.esfera(az(a, 4), az(a, 4), 1.4, 0.9, { mat: 'ext_brasa', tono: -0.35 })); humo(a, ps, f, 6, 0, 0, 4, 26, 4, 2.5); return ps; }
    llamas(a, ps, f, 6, 0, 0, 1, 3.6, 20, 3.4);
    chispas(a, ps, f, 6, 0, 0, 14, 24, 4);
    if (v === 'olla') {
      for (const t of [0, 2.1, 4.2]) ps.push(a.palo(polar(t, 11, -1), [0, 0, 30], 0.9, { mat: 'par_madera_negra' }));
      ps.push(a.palo([0, 0, 30], [0, 0, 23], 0.35, { mat: 'ext_hierro' }), a.cilindro(0, 0, 15, 5, 8, { mat: 'ext_hierro', r1: 5.6 }), a.cilindro(0, 0, 22.4, 4.4, 0.5, { mat: 'agua_sucia' }));
    } else {
      for (const s of [-1, 1]) ps.push(a.palo([s * 14, -s * 2, -1], [s * 13, -s * 2, 22], 0.9, { mat: 'par_madera_negra' }), a.palo([s * 13, -s * 2, 19], [s * 13 + 2, -s * 2, 24], 0.7, { mat: 'par_madera_negra' }));
      ps.push(a.palo([-16, 2, 20.5], [16, -2, 20.5], 0.6, { mat: 'ext_hierro' }));
      ps.push(masa([bulto([0, 0, 20.5], [8, 4.5, 4], { eje: [1, -0.12, 0] }), hueso([6, -1, 20], [11, -1, 17], 2, 1.2), hueso([-6, 1, 20], [-11, 1, 17], 2, 1.2)], { mat: 'ext_carne_seca', suave: 1.4 }));
    }
    return { piezas: ps, resplandor: { c: [0, 0, 10], r: 46 + Math.sin((f / 6) * PI2) * 3, color: '#ff9030' } };
  },
});

reg({
  id: 'par_empalizada_bandidos', nombre: ['Empalizada de bandidos', 'Bandit stockade'], tema: PAR, variantes: ['x', 'rota', 'craneos'], huella: [5, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 46, 14, { matas: 5, piedras: 2 });
    const n = 15;
    for (let i = 0; i < n; i++) {
      const x = -38 + (i / (n - 1)) * 76 + az(a, 0.8), r = 2.4 + a.r() * 0.6;
      if (v === 'rota' && i >= 6 && i <= 8) { if (i === 7) ps.push(a.palo([x, 2, 1.5], [x + 18, 16, 2.5], r, { mat: 'corteza' })); else ps.push(a.cilindro(x, 0, -1, r, 6 + a.r() * 6, { mat: 'corteza', r1: r * 0.9 }), a.poliedro([[x - r, 0, 10], [x + r, 1, 11], [x, -r, 10], [x + 0.5, 0, 14]], { mat: 'madera_vieja' })); continue; }
      const h = 38 + a.r() * 12, inc: V = [az(a, 0.06), 0.05 + az(a, 0.04), 1], top = mas([x, 0, -1], nrm(inc), h);
      ps.push(a.palo([x, 0, -1], top, r, { mat: 'corteza', r1: r * 0.92 }), a.palo(top, mas(top, nrm(inc), 7), r * 0.92, { mat: 'madera_vieja', r1: 0.3 }));
      if (v === 'craneos' && i % 4 === 1) craneo(a, ps, top[0], top[1], top[2] + 4, 1, 0.8 + az(a, 0.4));
    }
    // atadura de cuerda y travesaño
    for (const z of [12, 30]) ps.push(a.palo([-40, 2.4, z], [40, 2.4, z + az(a, 2)], z > 20 ? 0.6 : 1.4, { mat: z > 20 ? 'cuerda' : 'par_madera_negra' }));
    return ps;
  },
});
conVarianteY('par_empalizada_bandidos');

reg({
  id: 'par_botin_bandidos', nombre: ['Botín de bandidos', 'Bandit loot'], tema: PAR, variantes: ['cofres', 'sacos', 'armas'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 26, 22, { matas: 2, piedras: 1 });
    if (v === 'cofres') {
      for (let i = 0; i < 2; i++) {
        const x = i ? 10 : -6, y = i ? -6 : 4, g = az(a, 30), abierto = i === 0;
        ps.push(a.caja(x, y, 0, 20, 13, 10, { mat: 'madera', giro: g }), a.cilindro(x, y, 10, 6.5, 20, { mat: 'madera', giro: g, eje: [Math.cos(rad(g)), Math.sin(rad(g)), 0] }));
        for (const k of [-6, 6]) ps.push(a.caja(x + Math.cos(rad(g)) * k, y + Math.sin(rad(g)) * k, -0.1, 1.6, 13.4, 10.3, { mat: 'ext_hierro', giro: g }));
        if (abierto) { ps.push(a.caja(x, y, 9, 18, 11, 6, { mat: 'negro', giro: g, resta: true })); for (let k = 0; k < 9; k++) ps.push(a.esfera(x + az(a, 7), y + az(a, 4), 9 + a.r() * 2, 1.4, { mat: 'oro' })); }
      }
      for (let k = 0; k < 10; k++) ps.push(a.cilindro(az(a, 16), 10 + az(a, 6), 0, 1.2, 0.5, { mat: 'oro', eje: [az(a, 0.4), az(a, 0.4), 1] }));
    }
    if (v === 'sacos') for (let i = 0; i < 6; i++) bultoCarga(a, ps, az(a, 14), az(a, 12), a.r() < 0.4);
    if (v === 'armas') {
      ps.push(a.caja(0, 0, 0, 22, 4, 2, { mat: 'madera_vieja' }), a.caja(0, 0, 18, 22, 3, 2, { mat: 'madera_vieja' }));
      for (const s of [-1, 1]) ps.push(a.palo([s * 10, 0, 0], [s * 10, 0, 22], 1, { mat: 'madera_vieja' }));
      for (let i = 0; i < 5; i++) { const x = -8 + i * 4, p: V = [x, 2.5, 0.5], q: V = [x + az(a, 2), -2, 26 + a.r() * 10]; ps.push(a.palo(p, q, 0.6, { mat: 'madera_lisa' })); if (i % 2) ps.push(a.poliedro([[q[0] - 1.5, q[1], q[2] - 4], [q[0] + 1.5, q[1], q[2] - 4], [q[0], q[1] - 0.4, q[2] + 3], [q[0], q[1] + 0.4, q[2] - 4]], { mat: 'hierro_oxido' })); else ps.push(a.caja(q[0], q[1], q[2] - 6, 1, 6, 6, { mat: 'hierro_oxido' })); }
      ps.push(a.cilindro(8, 10, 0, 7, 1.4, { mat: 'madera_vieja', eje: [0.2, 0.9, 0.4] }), a.esfera(-9, 9, 2.6, 3.2, { mat: 'hierro_oxido' }));
      bultoCarga(a, ps, -10, -10, false);
    }
    return ps;
  },
});

// ------------------------------------------------------------------ tótems de huesos
reg({
  id: 'par_totem_huesos', nombre: ['Tótem de huesos', 'Bone totem'], tema: PAR, variantes: ['craneos', 'astas', 'colgajos', 'velas'], cuadros: 6, t: 4, huella: [1, 1], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 16, 14, { matas: 3, piedras: 3 });
    for (let i = 0; i < 6; i++) guijarro(a, ps, ...(polar((i / 6) * PI2, 5).slice(0, 2) as [number, number]), 2.4 + a.r());
    const H = 64 + a.r() * 12;
    ps.push(masa([hueso([0, 0, -1], [az(a, 2), az(a, 2), H], 2.6, 1.8), bulto([0, 0, H * 0.3], [3, 3, 4], { tono: -0.05 })], { mat: 'corteza_muerta', suave: 1.4 }));
    ps.push(a.palo([0, -13, H - 12], [0, 13, H - 14], 1.2, { mat: 'corteza_muerta' }));
    // cráneos apilados en el palo
    const nc = v === 'craneos' ? 4 : 2;
    for (let i = 0; i < nc; i++) craneo(a, ps, az(a, 0.5), az(a, 0.5), H * 0.42 + i * 7.5, 1.05, 0.8 + az(a, 0.6));
    if (v === 'astas') for (const s of [-1, 1]) { const b: V = [0, s * 1.5, H]; const t: V = [az(a, 3), s * 14, H + 16]; ps.push(a.palo(b, t, 1.1, { mat: 'ext_hueso', r1: 0.4 })); for (let k = 0; k < 3; k++) { const q = mez(b, t, 0.35 + k * 0.22); ps.push(a.palo(q, mas(q, [az(a, 2), s * 3, 5]), 0.6, { mat: 'ext_hueso', r1: 0.2 })); } }
    else craneo(a, ps, 0, 0, H + 3, v === 'craneos' ? 1.6 : 1.2, 0.8);
    // colgajos que se mecen del travesaño: huesitos, plumas y tiras
    for (let i = 0; i < (v === 'colgajos' ? 7 : 4); i++) {
      const y = -12 + (i / 6) * 24, top: V = [0, y, H - 12 - (y + 13) * 0.08], L = 8 + a.r() * 10, sw = Math.sin((f / 6) * PI2 + i) * 1.6;
      const fin: V = [top[0] + sw, top[1], top[2] - L];
      ps.push(a.palo(top, fin, 0.3, { mat: 'cuerda' }));
      const k = a.r();
      if (k < 0.4) ps.push(a.palo(fin, mas(fin, [sw * 0.3, 0.5, -4]), 0.7, { mat: 'ext_hueso' }));
      else if (k < 0.7) ps.push(a.elipsoide(fin[0], fin[1], fin[2] - 2.5, 0.6, 1.2, 3, { mat: 'ext_pluma', incl: sw * 6 }));
      else ps.push(a.caja(fin[0], fin[1], fin[2] - 6, 0.5, 2.4, 7, { mat: elegir(a, ['tela_roja', 'ext_tela_sucia']), incl: sw * 4 }));
    }
    if (v === 'velas') {
      for (let i = 0; i < 4; i++) { const p = polar((i / 4) * PI2 + 0.5, 7, 0); vela(a, ps, p[0], p[1], 0, 3 + a.r() * 4, f + i, 6, 1); }
      vela(a, ps, 0, 0, H + 7, 3, f, 6, 0.9);
      ps.push(a.elipsoide(0, 0, 0.3, 9, 9, 0.5, { mat: 'ext_sangre' }));
      return { piezas: ps, resplandor: { c: [0, 0, 8], r: 26, color: '#ffa040' } };
    }
    return ps;
  },
});

// ------------------------------------------------------------------ troncos, tocones y hongos
/** Hongo de sombrero (tallo y sombrero con laminillas oscuras debajo). */
function hongo(a: Arma, ps: Pieza[], x: number, y: number, z: number, h: number, R: number, mat: string) {
  const t: V = [x + az(a, h * 0.25), y + az(a, h * 0.25), z + h];
  ps.push(a.palo([x, y, z], t, R * 0.28, { mat: 'par_flor_blanca', r1: R * 0.22, tono: -0.1 }));
  ps.push(a.elipsoide(t[0], t[1], t[2] - R * 0.05, R * 0.9, R * 0.9, R * 0.2, { mat: 'negro', tono: 0.1 }), a.elipsoide(t[0], t[1], t[2] + R * 0.08, R, R, R * 0.5, { mat, tono: az(a, 0.08) }));
}
/** Hongos de repisa pegados a la madera. */
const repisa = (a: Arma, ps: Pieza[], p: V, g: number, R: number, mat = 'hongo') => ps.push(a.elipsoide(p[0] + Math.cos(g) * R * 0.4, p[1] + Math.sin(g) * R * 0.4, p[2], R, R * 0.75, R * 0.26, { mat, giro: grad(g), tono: az(a, 0.06) }));
reg({
  id: 'par_tronco', nombre: ['Tronco caído', 'Fallen log'], tema: PAR, variantes: ['musgo', 'hueco', 'hongos', 'partido'], huella: [4, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 40, 18, { matas: 5, piedras: 1, hojas: 'hojas_otono' });
    const g = az(a, 20), d: V = [Math.cos(rad(g)), Math.sin(rad(g)), 0], lado: V = [-d[1], d[0], 0];
    const L = 64, r0 = 7 + a.r() * 2, partes = v === 'partido' ? [[-L / 2, -4], [6, L / 2]] : [[-L / 2, L / 2]];
    for (const [u0, u1] of partes) {
      const cs: Comp[] = [];
      const n = 5;
      for (let i = 0; i < n; i++) { const t0 = u0 + (i / n) * (u1 - u0), t1 = u0 + ((i + 1) / n) * (u1 - u0), r = (u: number) => r0 * (1 - (u + L / 2) / L * 0.35); cs.push(hueso(mas(mas([0, 0, 0], d, t0), [az(a, 0.6), az(a, 0.6), r(t0) * 0.85]), mas(mas([0, 0, 0], d, t1), [0, 0, r(t1) * 0.85]), r(t0), r(t1))); }
      // nudos y muñones de ramas
      for (let i = 0; i < 3; i++) { const u = entre(a, u0 + 4, u1 - 4), s = a.r() < 0.5 ? 1 : -1, b = mas(mas(mas([0, 0, 0], d, u), lado, s * r0 * 0.6), [0, 0, r0]); cs.push(hueso(b, mas(mas(b, lado, s * 5), [az(a, 2), az(a, 2), 5]), 1.8, 1.1)); }
      if (v === 'musgo') for (let i = 0; i < 6; i++) { const u = entre(a, u0, u1); cs.push(bulto(mas(mas([0, 0, 0], d, u), [az(a, 1.5), az(a, 1.5), r0 * 1.55]), [6 + a.r() * 5, r0 * 0.75, 1.8], { eje: d, mat: 'ext_musgo', k: 1.1 })); }
      ps.push(masa(cs, { mat: 'corteza', suave: 1.8 }));
      // la punta cortada: anillos claros o el hueco
      for (const u of [u0, u1]) {
        const c = mas(mas([0, 0, 0], d, u), [0, 0, r0 * (1 - (u + L / 2) / L * 0.35) * 0.85]), rr = r0 * (1 - (u + L / 2) / L * 0.35);
        if (v === 'hueco' && u === u1) { ps.push(a.cilindro(c[0] - d[0] * 6, c[1] - d[1] * 6, c[2], rr * 0.7, 7, { mat: 'negro', eje: d, resta: true }), a.cilindro(c[0] - d[0] * 6, c[1] - d[1] * 6, c[2], rr * 0.7, 0.5, { mat: 'negro', eje: d })); }
        else ps.push(a.cilindro(c[0] - d[0] * (u === u0 ? 0.3 : -0.3) * 0, c[1], c[2], rr * 0.97, 0.5, { mat: 'ext_madera_gris', eje: u === u0 ? [-d[0], -d[1], 0] : d, tono: -0.05 }));
      }
    }
    if (v === 'hongos' || v === 'musgo') for (let i = 0; i < 6; i++) { const u = az(a, L * 0.4); repisa(a, ps, mas(mas([0, 0, 0], d, u), [lado[0] * r0 * 0.9, lado[1] * r0 * 0.9, r0 * (0.5 + a.r() * 0.8)]), Math.atan2(lado[1], lado[0]), 2.5 + a.r() * 2); }
    if (v === 'hongos') for (let i = 0; i < 6; i++) { const u = az(a, L * 0.45), s = a.r() < 0.5 ? 1 : -1; const p = mas(mas([0, 0, 0], d, u), lado, s * (r0 + 3)); hongo(a, ps, p[0], p[1], 0, 3 + a.r() * 4, 2 + a.r() * 2.5, elegir(a, ['hongo', 'cuero', 'par_flor_blanca'])); }
    return ps;
  },
});

reg({
  id: 'par_tocon', nombre: ['Tocón con hongos', 'Mushroom stump'], tema: PAR, variantes: ['hongos', 'luminoso', 'repisas', 'raices'], huella: [1, 1], huellaPor: { raices: [2, 2] }, bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 18, 16, { matas: 4, piedras: 1, hojas: 'hojas_otono' });
    const r = 7 + a.r() * 2, H = 12 + a.r() * 10;
    const cs: Comp[] = [hueso([0, 0, 0], [az(a, 1), az(a, 1), H], r, r * 0.9), bulto([0, 0, 2], [r * 1.3, r * 1.25, 3])];
    const nr = v === 'raices' ? 6 : 4;
    for (let i = 0; i < nr; i++) { const t = (i / nr) * PI2 + az(a, 0.4), L = (v === 'raices' ? 22 : 12) + a.r() * 6; cs.push(hueso(polar(t, r * 0.4, H * 0.3), polar(t + az(a, 0.2), L * 0.55, 1.5), r * 0.45, r * 0.3), hueso(polar(t + az(a, 0.2), L * 0.55, 1.5), polar(t + az(a, 0.4), L, -0.5), r * 0.3, r * 0.12)); }
    ps.push(masa(cs, { mat: 'corteza', suave: 2 }));
    // el corte de arriba con los anillos y la madera podrida del centro
    ps.push(a.cilindro(0, 0, H - 0.6, r * 0.88, 1, { mat: 'ext_madera_gris', tono: 0.04 }), a.cilindro(0, 0, H - 0.2, r * 0.45, 0.8, { mat: 'ext_madera_podrida', tono: -0.08 }));
    if (v === 'raices') ps.push(a.cilindro(0, 0, H - 4, r * 0.55, 5, { mat: 'negro', resta: true }));
    const luz = v === 'luminoso';
    const nh = v === 'repisas' ? 2 : 6;
    for (let i = 0; i < nh; i++) { const p = polar(a.r() * PI2, r + 2 + a.r() * 6); hongo(a, ps, p[0], p[1], 0, 2.5 + a.r() * 5, 1.5 + a.r() * 2.2, luz ? 'par_hongo_luz' : elegir(a, ['hongo', 'cuero', 'arenisca_lisa'])); }
    if (v === 'repisas' || v === 'hongos') for (let i = 0; i < 5; i++) { const t = a.r() * PI2; repisa(a, ps, polar(t, r * 0.95, 3 + a.r() * (H - 5)), t, 2.4 + a.r() * 2.4, v === 'repisas' ? elegir(a, ['hongo', 'par_flor_amarilla']) : 'hongo'); }
    if (luz) { for (let i = 0; i < 3; i++) hongo(a, ps, az(a, r * 0.4), az(a, r * 0.4), H, 1.5 + a.r() * 2, 1 + a.r() * 1.5, 'par_hongo_luz'); return { piezas: ps, resplandor: { c: [0, 0, 6], r: 24, color: '#3aa078' } }; }
    return ps;
  },
});

// ------------------------------------------------------------------ esqueletos y huesos
/** Cráneo de animal: hocico largo de masa, cuencas y cuernos o astas. */
function craneoBestia(a: Arma, ps: Pieza[], p: V, g: number, tipo: 'vaca' | 'caballo' | 'ciervo', s = 1) {
  const d: V = [Math.cos(g), Math.sin(g), 0], l: V = [-d[1], d[0], 0];
  const L = tipo === 'caballo' ? 16 : tipo === 'vaca' ? 13 : 11;
  ps.push(masa([bulto(mas(p, [0, 0, 3.5 * s]), [5 * s, 4.4 * s, 4 * s], { eje: d }), hueso(mas(p, [0, 0, 3.4 * s]), mas(mas(p, d, L * s), [0, 0, 2 * s]), 3.6 * s, 2 * s), bulto(mas(mas(p, d, L * 0.3 * s), [0, 0, 1.2 * s]), [L * 0.55 * s, 3 * s, 1.4 * s], { eje: d, tono: -0.05 })], { mat: 'ext_hueso', suave: 1.4 * s }));
  for (const sd of [-1, 1]) { const e = mas(mas(mas(p, d, 3 * s), l, sd * 3.2 * s), [0, 0, 4.4 * s]); ps.push(a.esfera(e[0], e[1], e[2], 1.4 * s, { mat: 'negro' })); }
  if (tipo === 'vaca') for (const sd of [-1, 1]) { const b = mas(mas(p, l, sd * 4 * s), [0, 0, 6 * s]), m = mas(mas(b, l, sd * 7 * s), [0, 0, 1 * s]); ps.push(a.palo(b, m, 1.4 * s, { mat: 'ext_hueso', r1: 1 * s }), a.palo(m, mas(mas(m, d, 3 * s), [0, 0, 5 * s]), 1 * s, { mat: 'ext_hueso', r1: 0.2 * s })); }
  if (tipo === 'ciervo') for (const sd of [-1, 1]) { const b = mas(mas(p, l, sd * 2.5 * s), [0, 0, 6.5 * s]), t = mas(mas(mas(b, l, sd * 9 * s), d, -6 * s), [0, 0, 14 * s]); ps.push(a.palo(b, t, 0.9 * s, { mat: 'ext_hueso', r1: 0.4 * s })); for (let k = 0; k < 3; k++) { const q = mez(b, t, 0.3 + k * 0.25); ps.push(a.palo(q, mas(mas(q, d, 3 * s), [0, 0, 4 * s]), 0.5 * s, { mat: 'ext_hueso', r1: 0.15 * s })); } }
}
reg({
  id: 'par_esqueleto_animal', nombre: ['Esqueleto de animal', 'Animal skeleton'], tema: PAR, variantes: ['vaca', 'caballo', 'ciervo', 'disperso'], huella: [3, 2], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 36, 24, { matas: 6, piedras: 1 });
    const g = rad(az(a, 25)), d: V = [Math.cos(g), Math.sin(g), 0], l: V = [-d[1], d[0], 0];
    const tipo = v === 'disperso' ? elegir(a, ['vaca', 'caballo'] as const) : v;
    if (v !== 'disperso') costillar(a, ps, mas(d, [0, 0, 0], -18), mas(mas([0, 0, 0], d, 12), [0, 0, 1.5]), 10, 9 + a.r() * 2, { abre: 0.5 + a.r() * 0.4, rotas: 0.15 });
    else for (let i = 0; i < 9; i++) { const p: V = [az(a, 22), az(a, 14), 0.6]; ps.push(a.palo(p, mas(p, [az(a, 6), az(a, 6), 3 + a.r() * 4]), 0.6, { mat: 'ext_hueso', r1: 0.4 })); }
    craneoBestia(a, ps, mas(mas([0, 0, 0], d, 22), l, az(a, 6)), g + az(a, 0.8), tipo as 'vaca' | 'caballo' | 'ciervo');
    // patas sueltas y la pelvis
    for (let i = 0; i < 4; i++) { const p = mas(mas([0, 0, 0], d, entre(a, -22, 14)), l, (i % 2 ? 1 : -1) * entre(a, 10, 18)); huesoLargo(ps, [p[0], p[1], 0.9], [p[0] + az(a, 10), p[1] + az(a, 10), 0.9], 0.9); }
    ps.push(masa([bulto(mas(mas([0, 0, 0], d, -22), [0, 0, 3]), [3, 6, 2.6], { eje: d }), bulto(mas(mas(mas([0, 0, 0], d, -23), l, 4), [0, 0, 3.5]), [2.4, 2.4, 3]), bulto(mas(mas(mas([0, 0, 0], d, -23), l, -4), [0, 0, 3.5]), [2.4, 2.4, 3])], { mat: 'ext_hueso', suave: 1.2 }));
    if (v === 'disperso') for (let i = 0; i < 2; i++) ave(a, ps, [az(a, 24), az(a, 16), 0], a.r() * PI2, 1, 'picando');
    return ps;
  },
});

reg({
  id: 'par_huesos', nombre: ['Huesos en el pasto', 'Bones in the grass'], tema: PAR, variantes: ['dispersos', 'craneos', 'fosa'], huella: [2, 2], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 24, 20, { matas: 5, piedras: 1 });
    if (v === 'fosa') { ps.push(a.elipsoide(0, 0, 0, 16, 11, 2.5, { mat: 'ext_tierra', tono: 0.05 })); disco(a, ps, 0, 0, 0.9, 12, 8, 0.3, 'negro', { ruido: 0.12 }); for (let i = 0; i < 8; i++) { const p: V = [az(a, 9), az(a, 6), 1.6]; huesoLargo(ps, p, [p[0] + az(a, 7), p[1] + az(a, 7), 1.6], 0.7); } craneo(a, ps, 3, -2, 3.6, 1, 1); craneo(a, ps, -5, 3, 3.4, 0.95, 2.5); return ps; }
    const nc = v === 'craneos' ? 5 : 1;
    for (let i = 0; i < nc; i++) { const p = i ? polar(a.r() * PI2, 6 + a.r() * 10) : [az(a, 4), az(a, 4), 0]; craneo(a, ps, p[0], p[1], 2.8, 0.95 + a.r() * 0.15, a.r() * PI2); }
    for (let i = 0; i < (v === 'craneos' ? 4 : 9); i++) { const p: V = [az(a, 18), az(a, 15), 0.8]; huesoLargo(ps, p, [p[0] + az(a, 8), p[1] + az(a, 8), 0.8], 0.6 + a.r() * 0.3); }
    if (v === 'dispersos') costillar(a, ps, [-10, -8, 3], [0, -6, 3.5], 5, 4, { abre: 1, r: 0.5, rotas: 0.3 });
    return ps;
  },
});

// ------------------------------------------------------------------ hoguera de la bruja
reg({
  id: 'par_hoguera', nombre: ['Hoguera de la bruja', 'Witch pyre'], tema: PAR, variantes: ['ardiendo', 'consumida', 'preparada'], cuadros: 6, t: 3, huella: [3, 3], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 32, 30, { matas: 5, piedras: 2, mat: v === 'preparada' ? 'par_turba' : 'ext_ceniza' });
    const quema = v !== 'preparada', mad = v === 'consumida' ? 'ext_carbon' : 'corteza';
    // haces de leña en rueda contra el palo
    const n = v === 'consumida' ? 8 : 14;
    for (let i = 0; i < n; i++) { const t = (i / n) * PI2 + az(a, 0.15); ps.push(a.palo(polar(t, 18 + a.r() * 4, 0.5), polar(t + az(a, 0.2), 3, v === 'consumida' ? 3 : 12 + a.r() * 6), 1.8 + a.r() * 0.6, { mat: mad, r1: 1.2 })); }
    for (let i = 0; i < 6; i++) { const t = a.r() * PI2; ps.push(a.palo(polar(t, 14, 1.5), polar(t + 1.2, 14, 2 + a.r() * 3), 1.4, { mat: mad })); }
    ps.push(a.cilindro(0, 0, -1, 2.4, 70, { mat: quema ? 'ext_carbon' : 'par_madera_negra', r1: 2 }));
    if (v === 'consumida') {
      // huesos ennegrecidos al pie del palo y la cadena caída
      craneo(a, ps, 4, 3, 4, 0.95, 0.8, 'ext_carbon');
      costillar(a, ps, [-1, 6, 3], [-1, -6, 4], 5, 4.4, { abre: 0.8, mat: 'ext_carbon', r: 0.5 });
      for (let i = 0; i < 6; i++) ps.push(a.esfera(az(a, 10), az(a, 10), 1.5, 1 + a.r() * 0.6, { mat: 'ext_brasa', tono: -0.3 + Math.sin((f / 6) * PI2 + i) * 0.15 }));
      humo(a, ps, f, 6, 0, 0, 10, 40, 5, 4);
      return { piezas: ps, resplandor: { c: [0, 0, 3], r: 22, color: '#a03a12' } };
    }
    // la condenada atada al palo, de pie sobre la leña
    muneco(a, ps, colgado([1.5, 0, 58], 45), { ...ropaDe(a, 'campesino'), torso: 'cu_tela_blanca', mangas: 'cu_tela_blanca', piernas: 'cu_tela_blanca' }, { brazos: [176, 176], codos: [6, -6], piernas: [4, 4], rodillas: [4, 6], cabeza: az(a, 20), ladea: 20 }, { colgado: true, s: 0.95 });
    for (const z of [30, 44]) ps.push(a.cilindro(0, 0, z, 6.5, 1.4, { mat: 'cuerda' }));
    if (v === 'ardiendo') {
      for (let i = 0; i < 3; i++) { const t = (i / 3) * PI2 + f * 0.3; llamas(a, ps, f + i * 2, 6, Math.cos(t) * 8, Math.sin(t) * 8, 6, 3, 20, 3.4, 'fuego', 4); }
      llamas(a, ps, f, 6, 0, 0, 12, 4, 26, 4, 'fuego', 5);
      chispas(a, ps, f, 6, 0, 0, 30, 40, 5);
      return { piezas: ps, resplandor: { c: [0, 0, 20], r: 60 + Math.sin((f / 6) * PI2) * 4, color: '#ff8a28' } };
    }
    // preparada: una antorcha clavada a un lado
    ps.push(a.palo([22, 6, -1], [21, 7, 24], 1, { mat: 'madera' }), a.cilindro(21, 7, 22, 2, 4, { mat: 'cuerda', r1: 2.2 }));
    llamas(a, ps, f, 6, 21, 7, 26, 1.2, 8, 1.4, 'fuego', 3);
    return { piezas: ps, resplandor: { c: [21, 7, 28], r: 28, color: '#ffa040' } };
  },
});

// ------------------------------------------------------------------ túmulo
reg({
  id: 'par_tumulo', nombre: ['Túmulo', 'Barrow mound'], tema: PAR, variantes: ['entrada', 'sellado', 'saqueado'], huella: [6, 6], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 60, 56, { matas: 6, piedras: 3 });
    // el montículo de tierra y pasto (una masa de lomos)
    const cs: Comp[] = [bulto([0, 0, 0], [44, 40, 24], { giro: a.r() * 180 })];
    for (let i = 0; i < 7; i++) { const t = a.r() * PI2; cs.push(bulto(polar(t, 18 + a.r() * 10, 4), [14 + a.r() * 8, 12 + a.r() * 6, 12 + a.r() * 6], { giro: grad(t), mat: elegir(a, ['ext_musgo', 'par_turba', 'ext_pasto_seco']), tono: -0.05 })); }
    ps.push(masa(cs, { mat: 'par_turba', suave: 6 }));
    for (let i = 0; i < 10; i++) { const t = a.r() * PI2, d = 10 + a.r() * 28, z = 26 * Math.sqrt(Math.max(0, 1 - (d / 44) ** 2)); mata(a, ps, Math.cos(t) * d, Math.sin(t) * d, 5, 8, a.r() < 0.4 ? 'ext_pasto_seco' : 'ext_pasto', z - 1); }
    // la boca de piedra mirando al frente (+x +y)
    const m = marco([30, 30, 0], 45);
    for (const s of [-1, 1]) losa(a, ps, m.T([0, s * 10, -2]), 26, 5, 4, 45, { liquen: 0.6, musgo: 0.3 });
    const dintel = m.T([0, 0, 23]);
    ps.push(masa([bulto(dintel, [4, 16, 3.6], { giro: 45 }), bulto(mas(dintel, [1, -1, 3]), [3, 8, 1.2], { giro: 45, mat: 'ext_musgo', k: 0.6 })], { mat: 'ext_roca_fria', suave: 2 }));
    if (v === 'sellado') { const q = m.T([3, 0, 0]); pena(a, ps, q, [5, 10, 11], { giro: 45 + 90, n: 5, mat: 'ext_roca_fria', liquen: 0.5, hunde: 0 }); }
    else { const q = m.T([-6, 0, -1]); ps.push(a.caja(q[0], q[1], q[2], 26, 15, 22, { mat: 'negro', giro: 45, resta: true })); const q2 = m.T([-3, 0, 0]); ps.push(a.caja(q2[0], q2[1], -1, 1, 15, 21, { mat: 'negro', giro: 45 })); }
    for (let i = 0; i < 3; i++) { const q = m.T([6 + i * 5, 0, -2 + 0]); sillar(a, ps, q[0], q[1], -1.5 - i * 0.3, 5, 18, 2.2, 45, 'par_sillar', { jit: 0.6 }); }
    if (v === 'saqueado') {
      cascotes(a, ps, 6, 44, 40, 10, 10);
      const q = m.T([18, -14, 0]); ps.push(a.elipsoide(q[0], q[1], 2, 9, 7, 4, { mat: 'ext_tierra', tono: 0.06 }), a.palo([q[0], q[1], 4], [q[0] + 3, q[1] - 2, 22], 0.7, { mat: 'madera' }), a.caja(q[0], q[1], -1, 5, 1, 7, { mat: 'ext_hierro', giro: 30 }));
      craneo(a, ps, 46, 30, 2.8, 1, 0.2); huesoLargo(ps, [40, 46, 0.9], [50, 40, 0.9], 0.8);
    }
    return ps;
  },
});

// ------------------------------------------------------------------ restos de batalla
reg({
  id: 'par_restos_batalla', nombre: ['Restos de batalla', 'Battlefield debris'], tema: PAR, variantes: ['escudos', 'flechas', 'espada', 'yelmo'], huella: [2, 2], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 26, 22, { matas: 4, piedras: 1, mat: a.r() < 0.5 ? 'par_turba' : 'ext_barro' });
    const escudo = (x: number, y: number, z: number, e: V, roto: boolean) => {
      ps.push(a.cilindro(x - e[0] * 0.3, y - e[1] * 0.3, z - e[2] * 0.3, 8.2, 0.9, { mat: 'ext_hierro', eje: e }), a.cilindro(x, y, z, 7.5, 1.4, { mat: elegir(a, ['tela_roja', 'tela_azul', 'madera_vieja']), eje: e, tono: 0.05 }));
      ps.push(a.cilindro(x + e[0] * 1.2, y + e[1] * 1.2, z + e[2] * 1.2, 2.4, 1, { mat: 'ext_hierro', eje: e, r1: 1.4 }));
      if (roto) ps.push(a.caja(x + 5, y + 3, z - 5, 4, 10, 10, { mat: 'negro', giro: 40, resta: true }));
    };
    if (v === 'escudos') { escudo(-6, 4, 1.2, nrm([0.1, 0.2, 1]), true); escudo(9, -4, 7, nrm([0.7, 0.5, 0.5]), false); cadaver(a, ps, 'soldado', [-4, 18, 0], 200, { huesos: a.r() < 0.5, sangre: 0.6 }); }
    if (v === 'flechas' || v === 'escudos') for (let i = 0; i < (v === 'flechas' ? 12 : 4); i++) flecha(a, ps, [az(a, 18), az(a, 14), 0], [az(a, 0.6), az(a, 0.6), 1], 11);
    if (v === 'espada') {
      // espada clavada con un jirón de tela atado, y el escudo apoyado
      const p: V = [0, 0, 0], tip = az(a, 0.15);
      ps.push(a.poliedro([[-1.6, 0, 0], [1.6, 0, 0], [-1.3, -0.4, 30], [1.3, 0.4, 30], [0, 0, -3]].map(([x, y, z]) => [x + tip * z, y, z] as V), { mat: 'hierro_oxido' }));
      ps.push(a.caja(tip * 30, 0, 30, 12, 2, 2, { mat: 'ext_hierro' }), a.palo([tip * 30, 0, 32], [tip * 40, 0, 40], 1, { mat: 'cuero' }), a.esfera(tip * 40, 0, 41, 1.6, { mat: 'ext_hierro' }));
      ps.push(a.caja(tip * 30 + 1, 1, 18, 1, 2, 12, { mat: 'tela_roja', incl: 10 }));
      escudo(6, 8, 6, nrm([0.6, 0.6, 0.5]), false); void p;
    }
    if (v === 'yelmo') {
      // yelmo volcado con el cráneo adentro y la lanza partida
      ps.push(a.elipsoide(0, 0, 4, 5.5, 5.5, 5, { mat: 'hierro_oxido', incl: 70 }), a.elipsoide(1.5, 1.5, 4, 4.8, 4.8, 4.4, { mat: 'negro', incl: 70, resta: true }));
      craneo(a, ps, 1.5, 3, 3.5, 0.85, 1.6);
      ps.push(a.palo([-16, -8, 1.2], [6, -14, 1.2], 1, { mat: 'madera_vieja' }), a.palo([8, -14, 1.2], [18, -9, 3], 1, { mat: 'madera_vieja' }), a.poliedro([[18, -9, 3], [24, -6, 4], [19, -8, 5], [19, -10, 2]], { mat: 'hierro_oxido' }));
      cadaver(a, ps, 'soldado', [10, 14, 0], 120, { huesos: true });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ farol de camino
reg({
  id: 'par_farol', nombre: ['Farol de camino', 'Road lantern'], tema: PAR, variantes: ['encendido', 'apagado', 'roto'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 14, 12, { matas: 3, piedras: 3 });
    const mad = 'par_madera_negra', H = 62;
    ps.push(a.cilindro(0, 0, -1, 2, H, { mat: mad, r1: 1.7, incl: v === 'roto' ? 9 : az(a, 2) }));
    if (v === 'roto') { ps.push(a.palo([3, 6, 1], [20, 14, 2], 0.9, { mat: mad })); ps.push(a.cilindro(16, 10, 0, 3, 7, { mat: 'ext_hierro', r1: 2.5, eje: [0.9, 0.3, 0.3] })); return ps; }
    ps.push(a.palo([0, 0, H - 4], [12, -2, H - 1], 1, { mat: mad }), a.palo([0, 0, H - 14], [9, -1.5, H - 2], 0.7, { mat: mad }));
    const sw = Math.sin((f / 6) * PI2) * 0.8, c: V = [12 + sw, -2, H - 14];
    ps.push(a.palo([12, -2, H - 1], [c[0], c[1], c[2] + 9], 0.35, { mat: 'ext_hierro' }));
    // la linterna: armazón de hierro, vidrios y la llama
    ps.push(a.poliedro([[c[0] - 3.4, c[1] - 3.4, c[2] + 8], [c[0] + 3.4, c[1] - 3.4, c[2] + 8], [c[0] - 3.4, c[1] + 3.4, c[2] + 8], [c[0] + 3.4, c[1] + 3.4, c[2] + 8], [c[0], c[1], c[2] + 11.5]], { mat: 'ext_hierro' }));
    ps.push(a.caja(c[0], c[1], c[2] - 1, 6, 6, 1.2, { mat: 'ext_hierro' }));
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ps.push(a.caja(c[0] + sx * 2.7, c[1] + sy * 2.7, c[2], 0.9, 0.9, 8, { mat: 'ext_hierro' }));
    const viva = v === 'encendido', k = Math.sin((f / 6) * PI2 * 2) * 0.08;
    ps.push(a.caja(c[0], c[1], c[2] + 0.2, 4.8, 4.8, 7.6, { mat: viva ? 'luz_vela' : 'vidrio', tono: viva ? -0.25 + k : -0.3 }));
    if (viva) { ps.push(a.elipsoide(c[0], c[1], c[2] + 3.6, 1.1, 1.1, 2.4, { mat: 'fuego', tono: 0.2 + k })); return { piezas: ps, resplandor: { c: [c[0], c[1], c[2] + 3], r: 34 + k * 20, color: '#ffb050' } }; }
    return ps;
  },
});

// ------------------------------------------------------------------ cabezas en picas, árbol de los ahorcados, fosa común
/** Cabeza cortada (masa): cráneo con piel seca, pelo, cuello desgarrado. */
function cabeza(a: Arma, ps: Pieza[], p: V, g: number, s = 1) {
  const d: V = [Math.cos(g), Math.sin(g), 0];
  const piel = elegir(a, ['cu_piel_palida', 'cu_piel_gris', 'ext_cuero_seco']);
  ps.push(masa([bulto(p, [3.8 * s, 3.4 * s, 4 * s]), bulto(mas(p, d, 2.4 * s), [1.6 * s, 2.6 * s, 2.6 * s], { tono: -0.05 }), bulto(mas(mas(p, d, 3.6 * s), [0, 0, -0.2 * s]), [0.9 * s, 0.7 * s, 1 * s]), bulto(mas(p, [0, 0, -4 * s]), [2.4 * s, 2.4 * s, 1.6 * s], { mat: 'ext_carne_seca' }), bulto(mas(mas(p, d, -1 * s), [0, 0, 1.2 * s]), [3.8 * s, 3.6 * s, 3.2 * s], { mat: elegir(a, ['cu_pelo_negro', 'cu_pelo_castano', 'cu_pelo_rojo']) })], { mat: piel, suave: 1 * s }));
  for (const sd of [-1, 1]) { const e = mas(mas(p, d, 3.1 * s), [-d[1] * sd * 1.3 * s, d[0] * sd * 1.3 * s, 0.6 * s]); ps.push(a.esfera(e[0], e[1], e[2], 0.7 * s, { mat: 'negro' })); }
}
reg({
  id: 'par_cabezas_picas', nombre: ['Cabezas en picas', 'Heads on pikes'], tema: PAR, variantes: ['cabezas', 'calaveras', 'mezcla'], huella: [3, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 34, 14, { matas: 5, piedras: 2 });
    for (let i = 0; i < 4; i++) {
      const x = -24 + i * 16 + az(a, 2), inc: V = [az(a, 0.05), az(a, 0.05), 1], H = 46 + a.r() * 12, top = mas([x, 0, -1], nrm(inc), H);
      ps.push(a.palo([x, 0, -1], top, 1, { mat: 'par_madera_negra', r1: 0.7 }));
      for (let k = 0; k < 3; k++) guijarro(a, ps, x + az(a, 3), az(a, 3), 1.8 + a.r());
      const cab = v === 'cabezas' || (v === 'mezcla' && i % 2 === 0);
      if (cab) { cabeza(a, ps, mas(top, [0, 0, 3]), 0.8 + az(a, 0.7)); ps.push(a.palo(mas(top, [0, 0, -2]), mas(top, [az(a, 0.5), az(a, 0.5), -12]), 0.4, { mat: 'ext_sangre' })); }
      else craneo(a, ps, top[0], top[1], top[2] + 2.6, 1.05, 0.8 + az(a, 0.6));
      if (a.r() < 0.35) ave(a, ps, mas(top, [0, 0, cab ? 7 : 5.6]), a.r() * PI2, 0.9, 'posado');
    }
    return ps;
  },
});
conVarianteY('par_cabezas_picas');

reg({
  id: 'par_arbol_ahorcados', nombre: ['Árbol de los ahorcados', 'Hanging tree'], tema: PAR, variantes: ['uno', 'dos', 'cuervos'], cuadros: 8, t: 4, huella: [3, 3], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 40, 36, { matas: 6, piedras: 2, hojas: 'hojas_otono' });
    // árbol muerto de masa: tronco torcido, raíces y la rama larga de la que cuelgan
    const cs: Comp[] = [];
    const t1: V = [az(a, 4), az(a, 4), 46], t2: V = [t1[0] + az(a, 6), t1[1] + az(a, 6), 92];
    cs.push(hueso([0, 0, -1], t1, 8.5, 6), hueso(t1, t2, 6, 3), bulto([0, 0, 3], [11, 10, 5]));
    for (let i = 0; i < 5; i++) { const t = (i / 5) * PI2 + az(a, 0.4); cs.push(hueso(polar(t, 3, 6), polar(t, 14 + a.r() * 6, 1), 4, 2), hueso(polar(t, 14, 1), polar(t + az(a, 0.4), 24 + a.r() * 6, -1), 2, 0.8)); }
    const g = rad((a.r() < 0.5 ? -45 : 135) + az(a, 20)), rama0: V = mez(t1, t2, 0.25), rama1: V = [Math.cos(g) * 38, Math.sin(g) * 38, 74], rama2: V = [Math.cos(g) * 50, Math.sin(g) * 50, 78];
    cs.push(hueso(rama0, rama1, 4.2, 2.2), hueso(rama1, rama2, 2.2, 1));
    for (let i = 0; i < 4; i++) { const b = mez(t1, t2, 0.4 + i * 0.18), t = a.r() * PI2; cs.push(hueso(b, mas(b, [Math.cos(t) * 18, Math.sin(t) * 18, 12 + a.r() * 10]), 2.6, 0.9)); }
    ps.push(masa(cs, { mat: 'corteza_muerta', suave: 2.4 }));
    for (let i = 0; i < 8; i++) { const b = mez(rama0, rama2, a.r()), t = a.r() * PI2; ps.push(a.palo(b, mas(b, [Math.cos(t) * 9, Math.sin(t) * 9, 5 + a.r() * 9]), 0.7, { mat: 'corteza_muerta', r1: 0.2 })); }
    // los ahorcados, meciéndose en la rama
    const n = v === 'dos' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.7 : 0.45 + i * 0.4, top = mez(rama0, rama2, u), sw = Math.sin((f / 8) * PI2 + i * 2.1) * 1.8;
      const cuello: V = [top[0] + sw, top[1], top[2] - 11];
      ps.push(a.palo(top, cuello, 0.5, { mat: 'cuerda' }));
      muneco(a, ps, colgado([cuello[0], cuello[1], cuello[2] + 1], 20 + i * 100 + sw * 4), ropaDe(a, elegir(a, ['campesino', 'bandido', 'soldado'] as const)), { brazos: [176, 174], codos: [5, -5], piernas: [3, 5], rodillas: [5, 9], cabeza: az(a, 20), ladea: 30 + a.r() * 15 }, { colgado: true });
    }
    if (v === 'cuervos') { ave(a, ps, mas(rama2, [0, 0, 2]), 2.4, 1, 'posado'); ave(a, ps, mas(mez(rama0, rama1, 0.4), [0, 0, 4]), 0.6, 1, 'posado'); ave(a, ps, [Math.cos(g) * 30 + 8, Math.sin(g) * 30, 0], a.r() * PI2, 1, 'picando', { f, nc: 8 }); }
    return ps;
  },
});

reg({
  id: 'par_fosa_comun', nombre: ['Fosa común', 'Mass grave'], tema: PAR, variantes: ['abierta', 'con_cuerpos', 'cubierta'], huella: [5, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloP(a, ps, 48, 40, { matas: 5, piedras: 1 });
    const rx = 30, ry = 20;
    if (v === 'cubierta') {
      // tierra removida en lomo, palas y una cruz de palos torcida
      ps.push(masa([bulto([0, 0, 0], [rx, ry, 7], { giro: 10 }), bulto([8, -4, 2], [16, 12, 7]), bulto([-12, 6, 1], [14, 10, 6])], { mat: 'ext_tierra', suave: 4 }));
      for (let i = 0; i < 6; i++) guijarro(a, ps, az(a, rx), az(a, ry), 2 + a.r() * 2, 'ext_roca');
      ps.push(a.palo([rx + 4, 0, -1], [rx + 4, 0, 26], 1.1, { mat: 'par_madera_negra' }), a.palo([rx + 4, -7, 19], [rx + 4, 7, 20], 0.9, { mat: 'par_madera_negra' }));
    } else {
      // el pozo: piso hundido, bordes de tierra amontonada, los muertos adentro con cal
      disco(a, ps, 0, 0, -6, rx, ry, 0.6, 'ext_barro', { ruido: 0.1 });
      for (let i = 0; i < 14; i++) { const t = (i / 14) * PI2; ps.push(a.elipsoide(Math.cos(t) * (rx + 3), Math.sin(t) * (ry + 3), -2, 9 + a.r() * 3, 7, 6 + a.r() * 2, { mat: 'ext_tierra', giro: grad(t) + 90, tono: az(a, 0.05) })); }
      ps.push(a.elipsoide(-rx - 8, -6, 3, 12, 10, 6, { mat: 'ext_tierra', tono: 0.05 }));
      const nc = v === 'con_cuerpos' ? 5 : 2;
      for (let i = 0; i < nc; i++) cadaver(a, ps, elegir(a, ['campesino', 'campesino', 'soldado'] as const), [entre(a, -16, 16), entre(a, -9, 9), -5.5], a.r() * 360, { s: 0.92, huesos: v === 'abierta' && i === 0 });
      for (let i = 0; i < 5; i++) ps.push(a.elipsoide(az(a, rx * 0.7), az(a, ry * 0.7), -5, 5 + a.r() * 4, 3 + a.r() * 3, 0.8, { mat: 'par_flor_blanca', giro: a.r() * 180, tono: 0.05 }));
      ps.push(a.palo([-rx - 8, -6, 6], [-rx - 4, -2, 30], 0.8, { mat: 'madera' }), a.caja(-rx - 8, -6, 2, 6, 1.2, 8, { mat: 'ext_hierro', giro: 40, incl: -15 }));
      if (v === 'con_cuerpos') for (let i = 0; i < 2; i++) ave(a, ps, [entre(a, -10, 10), entre(a, -6, 6), 0], a.r() * PI2, 1, 'posado');
    }
    return ps;
  },
});
