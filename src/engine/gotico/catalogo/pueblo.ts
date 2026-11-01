import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido } from '../render';
import { agujeros, barril, base, cajon, cara, chimenea, entramado, llamas, losa, matas, piedras, puerta, rnd, techo, tp, ventana, viga, type Techo } from './casas';

/**
 * Pueblo en ruinas y en llamas: casas ardiendo, cascarones calcinados, techos hundidos, escombros, pozo, faroles,
 * cepo, horca, jaula, puesto de mercado, carreta, empedrado, cercas, letrina y fogatas.
 */

MATERIALES.pueblo_carbon = { rampa: ['#080706', '#100d0b', '#191411', '#231c17', '#2e241d', '#3a2e25'], ruido: 0.5, escala: 0.45, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.7 ? -0.2 : 0) };
MATERIALES.pueblo_ceniza = { rampa: ['#141312', '#201e1c', '#2d2a27', '#3b3733', '#4a4540', '#58524c'], ruido: 0.55, escala: 0.3 };
MATERIALES.pueblo_adoquin = {
  rampa: ['#141311', '#211f1b', '#302d27', '#403c34', '#514b41', '#635c50', '#766d5f'], ruido: 0.25, escala: 0.3,
  patron: (p) => {
    const fila = Math.floor(p[1] / 6), x = p[0] + (fila % 2) * 3.5 + ruido(fila * 1.3, 0, 5) * 3, col = Math.floor(x / 7);
    const fx = x / 7 - col, fy = p[1] / 6 - fila, borde = Math.min(fx, 1 - fx) * 7, bordeY = Math.min(fy, 1 - fy) * 6, m = Math.min(borde, bordeY);
    if (m < 0.9) return -0.38;
    return (ruido(col * 2.7, fila * 1.9, 9) - 0.5) * 0.3 + Math.min(m, 2.5) * 0.04;
  },
};

const FUEGO = '#ff6a20';
/** Chispas que suben. */
function chispas(ps: Pieza[], a: Arma, x: number, y: number, z: number, f: number, n: number, ancho: number, alto: number, cuadros = 6) {
  for (let i = 0; i < n; i++) {
    const t = ((f / cuadros + i * 0.37) % 1);
    ps.push(a.esfera(x + Math.sin(i * 2.1) * ancho + t * 6, y + Math.cos(i * 1.7) * ancho * 0.6, z + t * alto, 1.1, { mat: 'fuego', tono: 0.1 - t * 0.2 }));
  }
}
/** Cuatro muros de una casa sin techo, de grueso `e`. */
function muros(a: Arma, ps: Pieza[], LX: number, LY: number, Z: number, e: number, mat: string, tono = 0) {
  ps.push(a.caja(0, LY / 2 - e / 2, 0, LX, e, Z, { mat, tono }), a.caja(0, -LY / 2 + e / 2, 0, LX, e, Z, { mat, tono }));
  ps.push(a.caja(LX / 2 - e / 2, 0, 0, e, LY - 2 * e, Z, { mat, tono }), a.caja(-LX / 2 + e / 2, 0, 0, e, LY - 2 * e, Z, { mat, tono }));
}
/** Melladuras: cajas que cavan el borde de arriba de los muros (los dejan rotos y desparejos). */
function mellar(a: Arma, ps: Pieza[], LX: number, LY: number, Z: number, n: number, prof = [6, 26], soloFrente = false) {
  for (let i = 0; i < n; i++) {
    const lado = soloFrente ? (i % 2 ? 0 : 1) : i % 4, t = rnd(a, -0.5, 0.5);
    const x = lado === 0 ? t * LX : lado === 1 ? LX / 2 : lado === 2 ? t * LX : -LX / 2, y = lado === 0 ? LY / 2 : lado === 1 ? t * LY : lado === 2 ? -LY / 2 : t * LY;
    const s = rnd(a, 14, 30);
    ps.push(a.caja(x, y, Z - rnd(a, prof[0], prof[1]), s, s, 60, { mat: 'negro', resta: true, giro: rnd(a, 0, 90), incl: rnd(a, 15, 40), inclEje: a.r() < 0.5 ? 'x' : 'y' }));
  }
}

registrar(
  {
    id: 'pue_casa_en_llamas', nombre: ['Casa en llamas', 'Burning house'], tema: 'pueblo', variantes: ['entramado', 'piedra'], cuadros: 6, t: 3, huella: [9, 7], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const pie = v === 'piedra';
      const LX = 120, LY = 84, Z = pie ? 58 : 66, mw = pie ? 'piedra_bloques' : 'casas_revoque';
      base(a, ps, LX + 40, LY + 44, 'pueblo_ceniza');
      ps.push(a.caja(0, 0, 0, LX + 3, LY + 3, 7, { mat: 'piedra_bloques', tono: -0.1 }), a.caja(0, 0, 7, LX, LY, Z - 7, { mat: mw, tono: pie ? -0.14 : -0.24 }));
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: Z, L: LX, W: LY, H: 40, al: 7, alL: 8, g: pie ? 7 : 4 };
      techo(a, ps, t, pie ? 'paja' : 'teja', mw, { tono: pie ? -0.5 : -0.28 });
      if (pie) for (let i = 0; i < 6; i++) { const s = rnd(a, -55, 55), u = rnd(a, 6, 40); ps.push(a.elipsoide(s, u, Z + 40 - u * (40 / 42) + 7, rnd(a, 8, 16), rnd(a, 6, 10), 2.5, { mat: 'pueblo_carbon' })); }
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2);
      if (!pie) { entramado(a, ps, fy, -LX / 2, LX / 2, 7, Z, 6, { mat: 'pueblo_carbon', mitad: 36 }); entramado(a, ps, fx, -LY / 2, LY / 2, 7, Z, 4, { mat: 'pueblo_carbon', mitad: 36 }); }
      chimenea(a, ps, -36, -16, 56, Z + 62, pie ? 'piedra_bloques' : 'ladrillo');
      // hollín sobre los huecos
      const hollin = (fc: typeof fy, u: number, z: number, w: number) => ps.push(fc.bx(u, 1.6, z, w + 6, 0.6, 12, { mat: 'pueblo_carbon', tono: 0.05 }), fc.bx(u, 1.6, z + 10, w - 2, 0.6, 8, { mat: 'pueblo_carbon' }));
      hollin(fy, -28, 52, 28); for (const u of [12, 40]) hollin(fy, u, 50, 16); for (const u of [-20, 20]) hollin(fx, u, 50, 14);
      puerta(a, ps, fy, -28, 28, 52, 'abierta', { marco: 'pueblo_carbon' });
      ps.push(fy.bx(-28, -6, 0, 28, 1.2, 52, { mat: 'fuego', tono: -0.32 + (f % 3) * 0.06 }));
      const fl = (k: number) => 0.5 + 0.5 * Math.sin((f / 6) * Math.PI * 2 + k);
      for (const u of [12, 40]) {
        ventana(a, ps, fy, u, 28, 16, 22, { vidrio: 'casas_brasa', marco: 'pueblo_carbon', rota: true });
        ps.push(a.elipsoide(u, LY / 2 + 2.5, 50 + fl(u) * 2, 8, 3, 7 + fl(u) * 4, { mat: 'fuego', tono: -0.3 }), a.cilindro(u - 3 + fl(u + 1) * 6, LY / 2 + 3, 50, 3.5, 10 + fl(u + 2) * 9, { mat: 'fuego', r1: 0.6, incl: -14, tono: -0.2 }));
      }
      for (const u of [-20, 20]) {
        ventana(a, ps, fx, u, 28, 14, 20, { vidrio: 'casas_brasa', marco: 'pueblo_carbon', rota: u > 0 });
        ps.push(a.elipsoide(LX / 2 + 2.5, u, 48 + fl(u) * 2, 3, 7, 6 + fl(u + 1) * 4, { mat: 'fuego', tono: -0.3 }), a.cilindro(LX / 2 + 3, u - 2 + fl(u) * 4, 48, 3, 9 + fl(u + 1) * 8, { mat: 'fuego', r1: 0.6, incl: 14, inclEje: 'y', tono: -0.2 }));
      }
      // el techo se hunde y arde
      const s0 = rnd(a, -6, 14);
      agujeros(a, ps, t, [[s0, 16, 44, 28], [s0 - 44, 6, 18, 14]], 'pueblo_carbon');
      ps.push(a.elipsoide(s0, 14, Z + 4, 20, 13, 6, { mat: 'casas_brasa', tono: (f % 2) * 0.08 }));
      const T = -0.22;
      llamas(a, ps, s0 - 12, 12, Z + 10, 13, 70, f, 4, 6, 'fuego', T);
      llamas(a, ps, s0 + 10, 18, Z + 10, 11, 56, (f + 2) % 6, 3, 6, 'fuego', T);
      llamas(a, ps, s0, 8, Z + 20, 8, 80, (f + 4) % 6, 2, 6, 'fuego', T + 0.12);
      llamas(a, ps, s0 - 44, 6, Z + 18, 7, 36, (f + 4) % 6, 3, 6, 'fuego', T);
      llamas(a, ps, 40, 4, Z + 30, 6, 26, (f + 3) % 6, 3, 6, 'fuego', T);
      llamas(a, ps, -10, 30, Z + 6, 6, 22, (f + 1) % 6, 2, 6, 'fuego', T);
      llamas(a, ps, LX / 2 + 4, 0, Z + 8, 7, 30, (f + 1) % 6, 3, 6, 'fuego', T);
      chispas(ps, a, s0, 14, Z + 50, f, 7, 16, 60);
      piedras(a, ps, 6, -LX / 2, LX / 2, LY / 2 + 6, LY / 2 + 20, pie ? 'pueblo_carbon' : 'teja');
      return { piezas: ps, resplandor: { c: [s0, LY / 2, Z], r: 140 + fl(0) * 10, color: FUEGO } };
    },
  },
  {
    id: 'pue_casa_calcinada', nombre: ['Casa calcinada', 'Burnt-out house'], tema: 'pueblo', variantes: ['entramado', 'piedra', 'humeante'], huella: [9, 7], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const pie = v === 'piedra', hum = v === 'humeante';
      const LX = 120, LY = 84, Z = pie ? 58 : 54, e = 8, mw = pie ? 'piedra_bloques' : 'casas_revoque';
      base(a, ps, LX + 40, LY + 40, 'pueblo_ceniza');
      ps.push(a.caja(0, 0, 0, LX - 2, LY - 2, 1.5, { mat: 'pueblo_ceniza' }));
      muros(a, ps, LX, LY, Z, e, mw, pie ? -0.12 : -0.25);
      // hastial de piedra que sigue en pie al fondo
      ps.push(a.poliedro([[-LX / 2, -LY / 2, Z], [-LX / 2 + e, -LY / 2, Z], [-LX / 2, LY / 2, Z], [-LX / 2 + e, LY / 2, Z], [-LX / 2, 0, Z + 38], [-LX / 2 + e, 0, Z + 38]], { mat: mw, tono: pie ? -0.12 : -0.25 }));
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2);
      if (!pie) { entramado(a, ps, fy, -LX / 2, LX / 2, 0, Z, 6, { mat: 'pueblo_carbon', mitad: 30 }); entramado(a, ps, fx, -LY / 2, LY / 2, 0, Z, 4, { mat: 'pueblo_carbon', mitad: 30 }); }
      mellar(a, ps, LX, LY, Z, 9);
      ps.push(a.caja(-LX / 2 + 4, rnd(a, 6, 20), Z + 18, 20, 18, 40, { mat: 'negro', resta: true, giro: 30, incl: 30 }));
      // huecos de puerta y ventanas (de lado a lado)
      const hueco = (fc: typeof fy, u: number, z: number, w: number, h: number) => ps.push(fc.bx(u, -4, z, w, 12, h, { mat: 'negro', resta: true }));
      hueco(fy, -28, 0, 28, 52); for (const u of [12, 40]) hueco(fy, u, 24, 16, 22); for (const u of [-20, 20]) hueco(fx, u, 24, 14, 20);
      for (const [fc, u, z, w] of [[fy, -28, 52, 28], [fy, 12, 46, 16], [fy, 40, 46, 16], [fx, -20, 44, 14], [fx, 20, 44, 14]] as const) ps.push(fc.bx(u, 0.4, z, w + 4, 0.8, 9, { mat: 'pueblo_carbon' }));
      chimenea(a, ps, -32, -LY / 2 + 9, 0, 104, pie ? 'piedra_bloques' : 'ladrillo', 13);
      // vigas caídas y costillas del techo
      for (let i = 0; i < 4; i++) { const x = rnd(a, -40, 40); ps.push(a.palo([x, rnd(a, -30, -20), Z - rnd(a, 0, 10)], [x + rnd(a, -20, 20), rnd(a, 0, 30), 2], 2.4, { mat: 'pueblo_carbon' })); }
      for (const x of [-46, -24, 6]) ps.push(a.palo([x, -LY / 2 + 4, Z], [x + rnd(a, -3, 3), -2, Z + 30 - rnd(a, 0, 14)], 2, { mat: 'pueblo_carbon' }));
      ps.push(a.palo([-LX / 2 + 4, 0, Z + 36], [-4, 0, Z + 18], 2.6, { mat: 'pueblo_carbon' }));
      piedras(a, ps, 12, -LX / 2 + 12, LX / 2 - 12, -LY / 2 + 12, LY / 2 - 12, pie ? 'piedra_bloques' : 'teja');
      piedras(a, ps, 6, -LX / 2, LX / 2, LY / 2 + 4, LY / 2 + 16, 'pueblo_carbon');
      if (hum) {
        for (let i = 0; i < 6; i++) ps.push(a.elipsoide(rnd(a, -40, 40), rnd(a, -26, 26), 1.5, rnd(a, 4, 9), rnd(a, 3, 7), 2, { mat: 'casas_brasa', tono: rnd(a, -0.35, -0.1) }));
        return { piezas: ps, resplandor: { c: [0, 0, 6], r: 70, color: FUEGO } };
      }
      matas(a, ps, 4, -LX / 2, LX / 2, LY / 2 + 8, LY / 2 + 18);
      return ps;
    },
  },
  {
    id: 'pue_ruina_derrumbada', nombre: ['Ruina con techo hundido', 'Collapsed-roof ruin'], tema: 'pueblo', variantes: ['tejas', 'paja'], huella: [8, 6], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const paja = v === 'paja';
      const LX = 110, LY = 80, Z = 56, e = 8, mw = paja ? 'piedra_musgo' : 'piedra_bloques', mt = paja ? 'paja' : 'teja', tt = paja ? -0.32 : -0.12, g = paja ? 7 : 4;
      base(a, ps, LX + 40, LY + 44);
      ps.push(a.caja(0, 0, 0, LX - 2, LY - 2, 1.5, { mat: 'tierra', tono: -0.05 }));
      muros(a, ps, LX, LY, Z, e, mw, -0.04);
      const H = 36;
      ps.push(a.poliedro([[-LX / 2, -LY / 2, Z], [-LX / 2 + e, -LY / 2, Z], [-LX / 2, LY / 2, Z], [-LX / 2 + e, LY / 2, Z], [-LX / 2, 0, Z + H], [-LX / 2 + e, 0, Z + H]], { mat: mw }));
      mellar(a, ps, LX, LY, Z, 4, [6, 22], true);
      ps.push(a.caja(LX / 2, LY / 4, Z - 24, 30, 30, 60, { mat: 'negro', resta: true, giro: 40, incl: 25 }));
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2);
      ps.push(fy.bx(-24, -4, 0, 28, 12, 50, { mat: 'negro', resta: true }), fy.bx(22, -4, 24, 16, 12, 20, { mat: 'negro', resta: true }), fx.bx(-14, -4, 24, 14, 12, 18, { mat: 'negro', resta: true }));
      // faldón de atrás combado y cumbrera partida
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: Z, L: LX, W: LY, H, al: 6, alL: 6, g };
      const sl = H / (LY / 2), ue = LY / 2 + 6, ze = Z - 6 * sl, s0 = -LX / 2 - 6, s1 = 18;
      ps.push(a.poliedro([tp(t, s0, -ue, ze), tp(t, s1, -ue, ze - 4), tp(t, s0, 0, Z + H), tp(t, s1, 0, Z + H - 22), tp(t, s0, -ue, ze + g), tp(t, s1, -ue, ze - 4 + g), tp(t, s0, 0, Z + H + g), tp(t, s1, 0, Z + H - 22 + g)], { mat: mt, tono: tt }));
      ps.push(a.caja(-20, -16, Z + 12, 18, 14, 30, { mat: 'negro', resta: true, giro: 20 }));
      ps.push(a.poliedro([tp(t, s0, 0, Z + H), tp(t, -30, 0, Z + H - 4), tp(t, s0, 12, Z + H - 9), tp(t, -38, 10, Z + H - 12), tp(t, s0, 0, Z + H + g), tp(t, -30, 0, Z + H - 4 + g), tp(t, s0, 12, Z + H - 9 + g), tp(t, -38, 10, Z + H - 12 + g)], { mat: mt, tono: tt }));
      ps.push(a.palo(tp(t, s0, 0, Z + H - 1), tp(t, 8, 2, Z + H - 20), 2.4, { mat: 'madera_vieja' }), a.palo(tp(t, 14, 6, Z + H - 30), tp(t, 40, 14, 4), 2.4, { mat: 'madera_vieja' }));
      for (const x of [-20, 0, 18]) ps.push(a.palo([x, -LY / 2 + 4, Z], [x + rnd(a, -4, 4), rnd(a, 2, 14), Z + rnd(a, 2, 14)], 1.6, { mat: 'madera_vieja' }));
      // el faldón de adelante cayó adentro
      ps.push(losa(a, { ...t, cx: 6 }, 34, 2, Z - 18, LY / 2 - 12, 3, g, { mat: mt, tono: tt - 0.04 }));
      ps.push(a.caja(14, 16, Z - 30, 26, 18, 40, { mat: 'negro', resta: true, giro: 30 }));
      for (let i = 0; i < 4; i++) ps.push(a.palo([rnd(a, -20, 30), 4, Z - 14], [rnd(a, -20, 40), LY / 2 - 12, 6], 1.5, { mat: 'madera_vieja', tono: -0.05 }));
      if (paja) for (let i = 0; i < 6; i++) ps.push(a.elipsoide(rnd(a, -LX / 2, LX / 2), LY / 2 + rnd(a, 4, 18), 0, rnd(a, 6, 12), rnd(a, 4, 8), rnd(a, 2, 4), { mat: 'paja', tono: -0.35 }));
      else piedras(a, ps, 12, -LX / 2, LX / 2, LY / 2 + 4, LY / 2 + 20, 'teja');
      piedras(a, ps, 6, LX / 2 - 6, LX / 2 + 16, -20, 40, mw);
      matas(a, ps, 8, -LX / 2, LX / 2 + 10, LY / 2, LY / 2 + 20);
      return ps;
    },
  },
  {
    id: 'pue_escombros', nombre: ['Escombros', 'Rubble pile'], tema: 'pueblo', variantes: ['piedra', 'madera', 'tejas', 'quemados'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const m = v === 'piedra' ? 'piedra_bloques' : v === 'tejas' ? 'teja' : v === 'quemados' ? 'pueblo_carbon' : 'madera_vieja';
      const rx = rnd(a, 20, 24), ry = rnd(a, 15, 19), rz = rnd(a, 6, 8);
      const zm = (x: number, y: number) => rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (y / ry) ** 2));
      ps.push(a.elipsoide(0, 0, 0, rx, ry, rz, { mat: v === 'quemados' ? 'pueblo_ceniza' : 'tierra', tono: -0.05 }));
      if (v === 'madera' || v === 'quemados') {
        for (let i = 0; i < 7; i++) {
          const g = rnd(a, 0, Math.PI), L = rnd(a, 18, 32), x = rnd(a, -8, 8), y = rnd(a, -6, 6);
          const p0: V3 = [x - (Math.cos(g) * L) / 2, y - (Math.sin(g) * L) / 2, 0], p1: V3 = [x + (Math.cos(g) * L) / 2, y + (Math.sin(g) * L) / 2, 0];
          p0[2] = zm(p0[0], p0[1]) + 1 + i * 0.8; p1[2] = zm(p1[0], p1[1]) + 1 + rnd(a, 0, 8);
          ps.push(a.palo(p0, p1, rnd(a, 1.6, 2.6), { mat: m, tono: rnd(a, -0.08, 0.08) }));
        }
        for (let i = 0; i < 4; i++) { const x0 = rnd(a, -18, 18), y0 = rnd(a, -14, 14), x1 = x0 + rnd(a, -14, 14), y1 = y0 + rnd(a, -10, 10); ps.push(viga(a, [x0, y0, zm(x0, y0) + 0.5], [x1, y1, zm(x1, y1) + 1.5], 4, 1.2, [0, 0, 1], { mat: v === 'quemados' ? 'pueblo_carbon' : 'madera' })); }
        if (v === 'quemados') for (let i = 0; i < 3; i++) { const x = rnd(a, -10, 10), y = rnd(a, -8, 8); ps.push(a.elipsoide(x, y, zm(x, y), rnd(a, 2, 4), rnd(a, 2, 3), 1.5, { mat: 'casas_brasa', tono: -0.3 })); }
      } else {
        for (let i = 0; i < 16; i++) {
          const x = rnd(a, -18, 18), y = rnd(a, -14, 14), sz = rnd(a, 4, v === 'tejas' ? 8 : 10);
          ps.push(a.caja(x, y, zm(x, y) - 1, sz, sz * rnd(a, 0.5, 1), v === 'tejas' ? 1.6 : sz * rnd(a, 0.5, 0.8), { mat: i % 4 === 3 && v === 'piedra' ? 'piedra_gris' : m, giro: rnd(a, 0, 90), incl: rnd(a, -25, 25), tono: rnd(a, -0.1, 0.08) }));
        }
        if (v === 'piedra') ps.push(a.caja(4, -2, rz - 2, 22, 10, 9, { mat: m, giro: rnd(a, 10, 40), incl: 14, tono: -0.05 }));
        if (v === 'tejas') ps.push(a.palo([-16, -6, 2], [14, 8, rz + 6], 2, { mat: 'madera_vieja' }), a.palo([-6, 10, 2], [10, -10, rz + 3], 1.8, { mat: 'madera_vieja' }));
      }
      return ps;
    },
  },
  {
    id: 'pue_pozo', nombre: ['Pozo con techo', 'Roofed well'], tema: 'pueblo', variantes: ['techado', 'sin_techo', 'roto'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const roto = v === 'roto';
      ps.push(a.cilindro(0, 0, 0, 21, 1, { mat: 'piedra_gris', tono: -0.08 }));
      ps.push(a.cilindro(0, 0, 0, 15, 18, { mat: 'piedra_bloques' }), a.cilindro(0, 0, 18, 16.5, 3, { mat: 'piedra_gris' }));
      if (roto) ps.push(a.caja(10, 10, 12, 14, 12, 14, { mat: 'negro', resta: true, giro: 45, incl: 20 }));
      ps.push(a.cilindro(0, 0, 4, 11, 20, { mat: 'negro', resta: true }), a.cilindro(0, 0, 6, 11, 1, { mat: roto ? 'negro' : 'agua_sucia' }));
      if (roto) piedras(a, ps, 5, 14, 28, 6, 26, 'piedra_bloques');
      if (v === 'sin_techo') {
        ps.push(a.caja(-4, 3, 21, 26, 10, 1.5, { mat: 'madera_vieja', giro: 18 }), a.caja(-4, -7, 21, 26, 9, 1.5, { mat: 'madera_vieja', giro: 14 }));
      } else {
        const inc = roto ? 10 : 0;
        for (const s of [-1, 1]) ps.push(a.caja(s * 15, 0, 0, 4, 4, roto && s > 0 ? 38 : 58, { mat: 'madera', incl: s > 0 ? 0 : inc, inclEje: 'y' }));
        if (!roto) {
          const t: Techo = { eje: 'x', cx: 0, cy: 0, z: 58, L: 34, W: 30, H: 14, al: 5, alL: 4, g: 3 };
          techo(a, ps, t, 'teja', undefined, { tono: -0.1 });
          ps.push(a.caja(0, 0, 56, 36, 4, 3, { mat: 'madera' }));
          ps.push(a.palo([-17, 0, 42], [18, 0, 42], 2, { mat: 'madera' }), a.cilindro(-4, 0, 42, 3.2, 12, { mat: 'cuerda', eje: [1, 0, 0] }), a.palo([18, 0, 42], [18, 6, 42], 0.9, { mat: 'hierro' }), a.palo([18, 6, 42], [18, 6, 36], 0.9, { mat: 'hierro' }));
          ps.push(a.palo([2, 0, 39], [2, 0, 26], 0.5, { mat: 'cuerda' }), a.cilindro(2, 0, 20, 4, 6, { mat: 'madera', r1: 4.6 }), a.cilindro(2, 0, 21, 4.3, 1, { mat: 'hierro', r1: 4.5 }));
        } else {
          ps.push(a.poliedro([[-30, 22, 0], [4, 30, 0], [-28, 28, 9], [6, 36, 9], [-30, 22, 2.5], [4, 30, 2.5], [-28, 28, 12], [6, 36, 12]], { mat: 'teja', tono: -0.15 }));
          ps.push(a.palo([22, -4, 1.5], [44, 12, 1.5], 1.6, { mat: 'madera' }), a.cilindro(-22, 10, 0, 4, 6, { mat: 'madera', r1: 4.6, incl: 80 }));
        }
      }
      if (!roto) ps.push(a.cilindro(20, 12, 0, 4.5, 7, { mat: 'madera', r1: 5 }), a.cilindro(20, 12, 6.5, 4.4, 0.5, { mat: 'agua' }));
      return ps;
    },
  },
  {
    id: 'pue_farol', nombre: ['Farol de calle', 'Street lamp'], tema: 'pueblo', variantes: ['encendido', 'apagado', 'doble'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const luz = v !== 'apagado';
      ps.push(a.caja(0, 0, 0, 10, 10, 6, { mat: 'piedra_gris' }), a.caja(0, 0, 6, 7, 7, 3, { mat: 'piedra_gris', tono: 0.05 }));
      ps.push(a.cilindro(0, 0, 9, 2.2, 66, { mat: 'hierro', r1: 1.5 }), a.cilindro(0, 0, 18, 2.8, 2, { mat: 'hierro' }), a.cilindro(0, 0, 72, 2.6, 2, { mat: 'hierro' }), a.esfera(0, 0, 77, 2.4, { mat: 'hierro' }));
      const farol = (s: number) => {
        const x = s * 14;
        ps.push(a.palo([0, 0, 72], [x, 0, 72], 1.1, { mat: 'hierro' }), a.palo([0, 0, 62], [x * 0.6, 0, 72], 0.8, { mat: 'hierro' }), a.palo([x, 0, 72], [x, 0, 68], 0.6, { mat: 'hierro' }));
        ps.push(a.poliedro([[x - 4, -4, 64], [x + 4, -4, 64], [x - 4, 4, 64], [x + 4, 4, 64], [x, 0, 68]], { mat: 'hierro' }), a.caja(x, 0, 54, 7, 7, 10, { mat: luz ? 'luz_vela' : 'casas_vidrio', tono: luz ? -0.15 : 0 }));
        for (const [dx, dy] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) ps.push(a.caja(x + dx, dy, 53, 1.1, 1.1, 11, { mat: 'hierro' }));
        ps.push(a.caja(x, 0, 52, 8.5, 8.5, 2, { mat: 'hierro' }));
      };
      farol(1);
      if (v === 'doble') farol(-1);
      return luz ? { piezas: ps, resplandor: { c: [v === 'doble' ? 0 : 14, 0, 58], r: 40, color: '#ffc870' } } : ps;
    },
  },
  {
    id: 'pue_fogata', nombre: ['Fogata', 'Fire pit'], tema: 'pueblo', variantes: ['chica', 'mediana', 'grande', 'brasas'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const k = v === 'chica' ? 0.7 : v === 'grande' ? 1.5 : 1;
      const R = 11 * k, n = Math.round(8 * k + 1);
      ps.push(a.cilindro(0, 0, 0, R + 3, 0.8, { mat: 'pueblo_ceniza' }));
      for (let i = 0; i < n; i++) { const q = (i / n) * Math.PI * 2 + rnd(a, -0.1, 0.1); ps.push(a.caja(Math.cos(q) * R, Math.sin(q) * R, 0, rnd(a, 5, 7) * Math.min(k, 1.2), rnd(a, 4, 5), rnd(a, 3, 5) * Math.min(k, 1.2), { mat: 'piedra', giro: (q * 180) / Math.PI + rnd(a, -15, 15), tono: rnd(a, -0.1, 0.1) })); }
      ps.push(a.elipsoide(0, 0, 0.5, R * 0.75, R * 0.75, 2.5 * Math.min(k, 1.2), { mat: 'casas_brasa', tono: v === 'brasas' ? -0.12 + (f % 3) * 0.05 : 0.05 }));
      if (v === 'grande') {
        for (let i = 0; i < 6; i++) { const q = (i / 6) * Math.PI * 2 + 0.3; ps.push(a.palo([Math.cos(q) * 13, Math.sin(q) * 13, 1], [Math.cos(q) * 2, Math.sin(q) * 2, 30], 2.2, { mat: i % 2 ? 'corteza' : 'pueblo_carbon' })); }
      } else for (let i = 0; i < 3; i++) { const q = (i / 3) * Math.PI + rnd(a, 0, 0.5); ps.push(a.palo([Math.cos(q) * R * 0.9, Math.sin(q) * R * 0.9, 1.5], [-Math.cos(q) * R * 0.9, -Math.sin(q) * R * 0.9, 3], 1.7 * Math.min(k, 1.2), { mat: v === 'brasas' ? 'pueblo_carbon' : 'corteza', tono: -0.1 })); }
      if (v === 'brasas') {
        chispas(ps, a, 0, 0, 4, f, 2, 4, 14);
        return { piezas: ps, resplandor: { c: [0, 0, 3], r: 22, color: FUEGO } };
      }
      llamas(a, ps, 0, 0, 2, 5 * k, 18 * k * (v === 'grande' ? 1.3 : 1), f, 3);
      llamas(a, ps, 2 * k, -2 * k, 2, 3.5 * k, 12 * k, (f + 3) % 6, 2);
      ps.push(a.elipsoide(0, 0, 4 * k, 5 * k, 5 * k, 3 * k, { mat: 'fuego', tono: 0.15 }));
      chispas(ps, a, 0, 0, 14 * k, f, Math.round(3 * k), 4 * k, 30 * k);
      return { piezas: ps, resplandor: { c: [0, 0, 10 * k], r: (36 + (f % 2) * 4) * k, color: FUEGO } };
    },
  },
);
void cajon; void barril;
export type { V3 };

/** Rueda de madera con rayos, en el plano perpendicular a `eje` ('y' = rueda de carreta mirando a +y). */
function rueda(a: Arma, ps: Pieza[], c: V3, R: number, eje: V3, rota = false) {
  const n = unitV(eje), u = unitV(Math.abs(n[2]) < 0.9 ? crz([0, 0, 1], n) : crz([1, 0, 0], n)), w = crz(n, u);
  const b = mv(c, n, -1.5);
  ps.push(a.cilindro(b[0], b[1], b[2], R, 3, { mat: 'madera', eje: n }), a.cilindro(b[0] - n[0], b[1] - n[1], b[2] - n[2], R - 2.6, 5, { mat: 'negro', resta: true, eje: n }));
  ps.push(a.cilindro(b[0], b[1], b[2], R + 0.4, 0.8, { mat: 'hierro', eje: n }), a.cilindro(...mv(c, n, -3), 2.6, 6, { mat: 'madera', eje: n }));
  for (let k = 0; k < 6; k++) { if (rota && k === 2) continue; const q = (k / 6) * Math.PI * 2, d: V3 = [u[0] * Math.cos(q) + w[0] * Math.sin(q), u[1] * Math.cos(q) + w[1] * Math.sin(q), u[2] * Math.cos(q) + w[2] * Math.sin(q)]; ps.push(a.palo(c, mv(c, d, R - 1.5), 0.9, { mat: 'madera' })); }
}
const unitV = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const crz = (p: V3, q: V3): V3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const mv = (p: V3, q: V3, k = 1): V3 => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
/** Silueta oscura de un preso sentado y encogido (sin detalles: sombra con harapos). */
function preso(a: Arma, ps: Pieza[], x: number, y: number, z: number) {
  const m = { mat: 'tela', tono: -0.3 }, p = { mat: 'carne', tono: -0.32 };
  ps.push(a.elipsoide(x - 1, y - 1, z + 9, 5, 4.4, 9, { ...m, incl: 14 }), a.esfera(x + 1, y + 1.5, z + 19, 3.4, p));
  ps.push(a.elipsoide(x + 3, y + 3, z + 4, 4, 6.5, 3.2, m), a.elipsoide(x + 4, y + 5, z + 8, 3, 3, 5, m));
  ps.push(a.palo([x + 1, y - 2, z + 14], [x + 5, y + 4, z + 9], 1.4, p), a.palo([x - 2, y + 2, z + 14], [x + 5, y + 6, z + 10], 1.4, p));
}

registrar(
  {
    id: 'pue_cepo', nombre: ['Cepo y picota', 'Stocks and pillory'], tema: 'pueblo', variantes: ['cepo', 'picota', 'picota_rota'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'cepo') {
        ps.push(a.caja(0, 0, 0, 44, 20, 1, { mat: 'tierra' }));
        for (const s of [-1, 1]) ps.push(a.caja(s * 18, 0, 0, 5, 5, 30, { mat: 'madera' }), a.caja(s * 18, 0, 0, 8, 14, 3, { mat: 'madera_vieja' }));
        ps.push(a.caja(0, 0, 10, 34, 4, 8, { mat: 'madera' }), a.caja(0, 0, 18, 34, 4, 8, { mat: 'madera', tono: 0.05 }));
        for (const x of [-10, 0, 10]) ps.push(a.cilindro(x, -4, 18, x ? 2.4 : 3.2, 8, { mat: 'negro', resta: true, eje: [0, 1, 0] }));
        ps.push(a.caja(0, 2.3, 17.5, 34, 0.6, 1.2, { mat: 'hierro' }), a.caja(15, 2.4, 19, 2.5, 1, 4, { mat: 'hierro' }));
        ps.push(a.caja(0, -10, 0, 30, 7, 2, { mat: 'madera_vieja', giro: 3 }), a.caja(0, -10, 2, 26, 6, 7, { mat: 'madera_vieja' }));
        return ps;
      }
      const rota = v === 'picota_rota';
      ps.push(a.caja(0, 0, 0, 42, 42, 10, { mat: 'madera_vieja' }), a.caja(0, 0, 10, 42, 42, 1, { mat: 'madera', tono: 0.04 }));
      for (let i = 0; i < 2; i++) ps.push(a.caja(0, 26 + i * 4, 0, 18, 6, 7.5 - i * 4, { mat: 'madera_vieja' }));
      for (const [x, y] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) ps.push(a.caja(x, y, 0, 3, 3, 12, { mat: 'madera' }));
      ps.push(a.caja(0, 0, 11, 6, 6, rota ? 54 : 64, { mat: 'madera', incl: rota ? 6 : 0 }));
      if (!rota) {
        ps.push(a.caja(0, 1, 50, 30, 5, 7, { mat: 'madera' }), a.caja(0, 1, 57, 30, 5, 7, { mat: 'madera', tono: 0.05 }));
        for (const x of [-10, 0, 10]) ps.push(a.cilindro(x, -3, 57, x ? 2.2 : 3.4, 9, { mat: 'negro', resta: true, eje: [0, 1, 0] }));
        ps.push(a.caja(0, 3.7, 56.5, 30, 0.6, 1.2, { mat: 'hierro' }));
      } else {
        ps.push(a.caja(14, 18, 11, 30, 5, 7, { mat: 'madera', giro: 30, incl: 70 }), a.caja(-12, 22, 11, 28, 5, 7, { mat: 'madera', giro: -20 }));
        piedras(a, ps, 4, -30, 30, 26, 38, 'madera_vieja');
      }
      return ps;
    },
  },
  {
    id: 'pue_horca', nombre: ['Horca', 'Gallows'], tema: 'pueblo', variantes: ['con_soga', 'doble', 'vacia'], huella: [5, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const doble = v === 'doble', L = doble ? 76 : 60, D = 44, Zp = 30;
      base(a, ps, L + 24, D + 40);
      ps.push(a.caja(0, 0, Zp - 3, L, D, 3, { mat: 'madera', tono: 0.03 }));
      ps.push(a.caja(0, D / 2 - 1, Zp - 12, L, 2, 9, { mat: 'madera_vieja' }), a.caja(L / 2 - 1, 0, Zp - 12, 2, D, 9, { mat: 'madera_vieja' }));
      for (const x of [-L / 2 + 2, 0, L / 2 - 2]) for (const y of [-D / 2 + 2, D / 2 - 2]) ps.push(a.caja(x, y, 0, 4, 4, Zp - 3, { mat: 'madera' }));
      for (const x of [-L / 2 + 2, L / 2 - 2]) ps.push(a.palo([x, -D / 2 + 2, 2], [x, D / 2 - 2, Zp - 6], 1.2, { mat: 'madera_vieja' }));
      // escalera por delante
      for (let i = 0; i < 5; i++) ps.push(a.caja(-L / 2 + 12, D / 2 + 4 + (4 - i) * 6, 0, 16, 6, 6 * (i + 1) - 0.5, { mat: 'madera_vieja', tono: i * 0.02 }));
      ps.push(a.palo([-L / 2 + 4, D / 2 + 34, 0], [-L / 2 + 4, D / 2 + 2, Zp + 12], 1, { mat: 'madera' }));
      // horca: poste, travesaño y riostra
      const px = doble ? 0 : -16, H = 112;
      const brazos = doble ? [-30, 30] : [18];
      ps.push(a.caja(px, -6, Zp, 6, 6, H - Zp, { mat: 'madera' }));
      ps.push(a.caja(doble ? 0 : px + 18, -6, H, doble ? 70 : 48, 6, 6, { mat: 'madera' }));
      for (const bx of brazos) ps.push(a.palo([px + Math.sign(bx) * 2, -6, H - 18], [px + Math.sign(bx) * 16, -6, H], 1.6, { mat: 'madera' }));
      ps.push(a.caja(brazos[0], 0, Zp - 0.2, 16, 16, 0.6, { mat: 'madera_vieja', tono: -0.15 }), a.palo([brazos[0] - 8, 8, Zp + 0.2], [brazos[0] + 8, 8, Zp + 0.2], 0.6, { mat: 'hierro' }));
      if (doble) ps.push(a.caja(brazos[1], 0, Zp - 0.2, 16, 16, 0.6, { mat: 'madera_vieja', tono: -0.15 }));
      for (const bx of brazos) {
        if (v === 'vacia') { ps.push(a.palo([bx, -6, H], [bx, -6, H - 8], 0.6, { mat: 'cuerda' })); continue; }
        ps.push(a.palo([bx, -6, H], [bx, -6, Zp + 46], 0.7, { mat: 'cuerda' }), a.cilindro(bx, -6, Zp + 44, 2.6, 4, { mat: 'cuerda', r1: 2.2 }));
        ps.push(a.cilindro(bx - 0.7, -6, Zp + 36, 5, 1.4, { mat: 'cuerda', eje: [1, 0, 0] }), a.cilindro(bx - 1, -6, Zp + 36, 3.6, 2, { mat: 'negro', resta: true, eje: [1, 0, 0] }));
      }
      ps.push(a.cilindro(L / 2 - 8, -D / 2 + 8, Zp, 4, 5, { mat: 'madera' }), a.palo([L / 2 + 4, D / 2 + 6, 0], [L / 2 + 4, D / 2 + 6, 36], 1.6, { mat: 'madera' }), a.caja(L / 2 + 4, D / 2 + 7.5, 24, 12, 1.2, 10, { mat: 'madera_vieja', incl: 4, inclEje: 'y' }));
      matas(a, ps, 5, -L / 2, L / 2, D / 2 + 4, D / 2 + 18);
      return ps;
    },
  },
  {
    id: 'pue_jaula', nombre: ['Jaula colgante', 'Hanging cage'], tema: 'pueblo', variantes: ['colgante_vacia', 'colgante_preso', 'suelo_preso'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.cilindro(0, 0, 0, 22, 1, { mat: 'tierra' }));
      if (v === 'suelo_preso') {
        const W = 32, D = 26, H = 42;
        ps.push(a.caja(0, 0, 0, W, D, 4, { mat: 'madera_vieja' }), a.caja(0, 0, 4, W - 4, D - 4, 1, { mat: 'paja', tono: -0.3 }), a.caja(0, 0, H, W, D, 4, { mat: 'madera_vieja' }));
        for (const [x, y] of [[-W / 2 + 2, -D / 2 + 2], [W / 2 - 2, -D / 2 + 2], [-W / 2 + 2, D / 2 - 2], [W / 2 - 2, D / 2 - 2]]) ps.push(a.caja(x, y, 0, 4, 4, H + 4, { mat: 'madera' }));
        for (let x = -W / 2 + 7; x < W / 2 - 3; x += 5) for (const y of [-D / 2 + 1, D / 2 - 1]) ps.push(a.palo([x, y, 4], [x, y, H], 0.8, { mat: 'hierro_oxido' }));
        for (let y = -D / 2 + 7; y < D / 2 - 3; y += 5) for (const x of [-W / 2 + 1, W / 2 - 1]) ps.push(a.palo([x, y, 4], [x, y, H], 0.8, { mat: 'hierro_oxido' }));
        ps.push(a.caja(W / 2 + 0.5, 4, 18, 1, 4, 6, { mat: 'hierro' }));
        preso(a, ps, -3, -2, 5);
        ps.push(a.cilindro(10, -6, 5, 3, 3, { mat: 'madera', r1: 3.4 }));
        return ps;
      }
      // horca de jaula: poste con brazo y cadena
      ps.push(a.cilindro(-20, 2, 0, 6, 4, { mat: 'piedra' }), a.caja(-20, 2, 0, 6, 6, 118, { mat: 'madera' }));
      ps.push(a.palo([-23, 2, 115], [14, 2, 115], 3, { mat: 'madera' }));
      ps.push(a.palo([-20, 2, 92], [-4, 2, 113], 1.6, { mat: 'madera' }));
      const cx = 8, cy = 2, z0 = 30, H = 44, R = 11;
      ps.push(a.palo([cx, cy, 113], [cx, cy, z0 + H + 9], 0.9, { mat: 'hierro' }));
      for (let k = 0; k < 5; k++) ps.push(a.cilindro(cx, cy - 0.6, z0 + H + 10 + k * 5, 1.7, 1.2, { mat: 'hierro', eje: k % 2 ? [1, 0, 0] : [0, 1, 0] }));
      ps.push(a.cilindro(cx, cy, z0 - 2, R + 1, 3, { mat: 'hierro_oxido' }), a.cilindro(cx, cy, z0 + H, R + 1, 2, { mat: 'hierro_oxido' }), a.cilindro(cx, cy, z0 + H + 2, R + 1, 8, { mat: 'hierro_oxido', r1: 2 }));
      ps.push(a.cilindro(cx, cy, z0 + H * 0.5, R + 0.6, 1.4, { mat: 'hierro_oxido' }), a.cilindro(cx, cy, z0 + H * 0.5 - 0.5, R - 0.6, 2.4, { mat: 'negro', resta: true }));
      for (let k = 0; k < 12; k++) { const q = (k / 12) * Math.PI * 2; ps.push(a.palo([cx + Math.cos(q) * R, cy + Math.sin(q) * R, z0], [cx + Math.cos(q) * R, cy + Math.sin(q) * R, z0 + H], 0.8, { mat: 'hierro_oxido' })); }
      if (v === 'colgante_preso') preso(a, ps, cx - 2, cy - 2, z0 + 1);
      else ps.push(a.esfera(cx + 3, cy + 2, z0 + 3, 2.6, { mat: 'hueso' }), a.palo([cx - 4, cy, z0 + 1.5], [cx + 4, cy - 3, z0 + 1.5], 1, { mat: 'hueso' }));
      piedras(a, ps, 3, -4, 22, 8, 24, 'piedra');
      return ps;
    },
  },
  {
    id: 'pue_puesto', nombre: ['Puesto de mercado', 'Market stall'], tema: 'pueblo', variantes: ['frutas', 'telas', 'abandonado'], huella: [4, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ab = v === 'abandonado';
      const W = 54, D = 30;
      ps.push(a.caja(0, 0, 0, W + 14, D + 20, 1, { mat: 'tierra' }));
      ps.push(a.caja(0, D / 2 - 6, 0, W, 14, 20, { mat: 'madera_vieja' }), a.caja(0, D / 2 - 6, 20, W + 4, 16, 2.5, { mat: 'madera', tono: 0.05 }));
      if (ab) ps.push(a.caja(12, D / 2 - 6, 15, 26, 18, 10, { mat: 'negro', resta: true, giro: 12, incl: 20 }));
      for (const x of [-W / 2, W / 2]) ps.push(a.caja(x, -D / 2, 0, 3.5, 3.5, 60, { mat: 'madera' }), a.caja(x, D / 2 + 2, 0, 3.5, 3.5, ab && x > 0 ? 34 : 50, { mat: 'madera', incl: ab && x > 0 ? 8 : 0 }));
      // toldo a rayas
      const n = 6, sw = (W + 10) / n;
      for (let i = 0; i < n; i++) {
        if (ab && (i === 3 || i === 4)) continue;
        const x0 = -W / 2 - 5 + i * sw, x1 = x0 + sw, m = i % 2 ? 'tela' : v === 'telas' ? 'tela_azul' : 'tela_roja';
        const zb = 60, zf = ab && i > 3 ? 30 : 49, tn = m === 'tela' ? -0.2 : -0.1;
        ps.push(a.poliedro([[x0, -D / 2 - 4, zb], [x1, -D / 2 - 4, zb], [x0, D / 2 + 8, zf], [x1, D / 2 + 8, zf], [x0, -D / 2 - 4, zb + 1], [x1, -D / 2 - 4, zb + 1], [x0, D / 2 + 8, zf + 1], [x1, D / 2 + 8, zf + 1]], { mat: m, tono: tn }));
        ps.push(a.caja((x0 + x1) / 2, D / 2 + 8, zf - 6, sw - 0.4, 1, 6, { mat: m, tono: tn - 0.05 }));
      }
      if (ab) ps.push(a.caja(14, D / 2 + 9, 10, 16, 1, 30, { mat: 'tela_roja', incl: 10, inclEje: 'y', tono: -0.15 }));
      if (v === 'frutas') {
        const frutas = ['hojas_otono', 'carne', 'hojas', 'oro'];
        for (let i = 0; i < 4; i++) {
          const x = -W / 2 + 8 + i * 12.5;
          ps.push(a.cilindro(x, D / 2 - 6, 22.5, 5, 3.5, { mat: 'madera_vieja', r1: 5.8 }));
          for (let j = 0; j < 5; j++) ps.push(a.esfera(x + rnd(a, -3, 3), D / 2 - 6 + rnd(a, -3, 3), 26 + (j > 3 ? 2 : 0), 2.2, { mat: frutas[i], tono: frutas[i] === 'oro' ? -0.35 : 0.05 }));
        }
        cajon(a, ps, W / 2 + 6, D / 2 + 6, 0, 13);
        ps.push(a.elipsoide(-W / 2 - 4, D / 2 + 6, 6, 6, 5, 7, { mat: 'tela', tono: 0.04 }), a.elipsoide(-W / 2 + 6, -4, 6, 6, 5, 7, { mat: 'tela' }));
      } else if (v === 'telas') {
        const telas = ['tela_roja', 'tela_azul', 'tela_verde', 'tela_morada', 'tela'];
        for (let i = 0; i < 5; i++) ps.push(a.cilindro(-W / 2 + 6, D / 2 - 10 + (i % 2) * 6, 25 + (i > 2 ? 4 : 0), 2.6, W - 12 - i * 3, { mat: telas[i], eje: [1, 0, 0] }));
        ps.push(a.caja(-8, D / 2 + 2, 6, 18, 1, 16, { mat: 'tela_morada', tono: -0.05 }), a.caja(12, D / 2 + 2, 10, 14, 1, 12, { mat: 'tela_verde', tono: -0.05 }));
        ps.push(a.palo([-W / 2, -D / 2 + 2, 52], [W / 2, -D / 2 + 2, 52], 0.8, { mat: 'madera' }), a.caja(-12, -D / 2 + 2, 30, 12, 1, 22, { mat: 'tela_roja', tono: -0.1 }), a.caja(8, -D / 2 + 2, 34, 12, 1, 18, { mat: 'tela_azul', tono: -0.1 }));
        barril(a, ps, W / 2 + 8, 0);
      } else {
        ps.push(a.caja(W / 2 + 8, D / 2 + 10, 0, 14, 14, 11, { mat: 'madera', giro: 30, incl: 85 }), a.esfera(-6, D / 2 + 12, 2, 2.2, { mat: 'hojas_otono', tono: -0.2 }), a.esfera(4, D / 2 + 16, 2, 2.2, { mat: 'carne', tono: -0.2 }));
        piedras(a, ps, 4, -30, 30, D / 2 + 6, D / 2 + 16, 'madera_vieja');
      }
      return ps;
    },
  },
  {
    id: 'pue_carreta', nombre: ['Carreta', 'Cart'], tema: 'pueblo', variantes: ['vacia', 'con_heno', 'con_sacos', 'rota'], huella: [5, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const rota = v === 'rota';
      const L = 50, W = 28, zc = 15, R = 14;
      const inc = rota ? -11 : 0;
      ps.push(a.caja(0, 0, 0, L + 30, W + 24, 0.6, { mat: 'tierra', tono: -0.05 }));
      // caja de la carreta (si está rota, se apoya en una esquina)
      const zz = rota ? zc - 4 : zc;
      ps.push(a.caja(4, 0, zz, L, W, 3, { mat: 'madera', incl: inc }));
      for (const s of [-1, 1]) ps.push(a.caja(4, s * (W / 2 - 1), zz + 3, L, 2, 8, { mat: 'madera_vieja', incl: inc }));
      ps.push(a.caja(4 + L / 2 - 1, 0, zz + 3, 2, W, 8, { mat: 'madera_vieja' }), a.caja(4 - L / 2 + 1, 0, zz + 3, 2, W, rota ? 4 : 8, { mat: 'madera_vieja' }));
      for (const x of [-16, 6, 26]) for (const s of [-1, 1]) ps.push(a.caja(x, s * (W / 2 + 0.6), zz + 2, 2, 1, 10, { mat: 'hierro', incl: inc }));
      ps.push(a.palo([10, -W / 2 - 4, R], [10, W / 2 + 4, R], 1.6, { mat: 'hierro' }));
      rueda(a, ps, [10, W / 2 + 4, R], R, [0, 1, 0]);
      if (!rota) rueda(a, ps, [10, -W / 2 - 4, R], R, [0, 1, 0]);
      else { rueda(a, ps, [-14, W / 2 + 14, 1.6], R, [0, 0, 1], true); ps.push(a.caja(-6, -W / 2 - 2, 0, 6, 6, 6, { mat: 'piedra' })); }
      // varas para el animal
      for (const s of [-1, 1]) ps.push(a.palo([-L / 2 + 6, s * 9, zz + 2], [-L / 2 - 34, s * 7, 1.5], 1.5, { mat: 'madera' }));
      ps.push(a.palo([-L / 2 - 26, -8, 4], [-L / 2 - 26, 8, 4], 1.2, { mat: 'madera' }));
      if (v === 'con_heno') ps.push(a.elipsoide(4, 0, zz + 8, 26, 14, 14, { mat: 'paja', tono: -0.25 }), a.elipsoide(-6, 2, zz + 18, 14, 10, 8, { mat: 'paja', tono: -0.3 }), a.palo([20, -8, zz + 8], [30, -12, zz + 40], 0.9, { mat: 'madera' }));
      if (v === 'con_sacos') for (let i = 0; i < 6; i++) ps.push(a.elipsoide(-12 + (i % 3) * 14, i < 3 ? -6 : 6, zz + 8 + (i === 4 ? 6 : 0), 7, 6, 6, { mat: 'tela', tono: rnd(a, -0.12, 0.05), giro: rnd(a, -30, 30) }));
      if (v === 'con_sacos') barril(a, ps, 22, 0, zz + 3);
      if (rota) { ps.push(viga(a, [20, W / 2 + 12, 0.4], [40, W / 2 + 4, 0.4], 6, 1.5, [0, 0, 1], { mat: 'madera_vieja' })); matas(a, ps, 4, -30, 30, W / 2 + 4, W / 2 + 14); }
      return ps;
    },
  },
  {
    id: 'pue_empedrado', nombre: ['Empedrado', 'Cobblestone patch'], tema: 'pueblo', variantes: ['completo', 'roto', 'charco'], huella: [5, 5], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 72, 72, 1, { mat: 'pueblo_adoquin' }));
      for (let i = 0; i < 6; i++) { const q = (i / 6) * Math.PI * 2 + rnd(a, 0, 0.6); ps.push(a.caja(Math.cos(q) * 36, Math.sin(q) * 36, 0, rnd(a, 14, 24), rnd(a, 14, 24), 0.9, { mat: 'pueblo_adoquin', giro: rnd(a, 0, 90), tono: -0.04 })); }
      for (let i = 0; i < 6; i++) ps.push(a.caja(rnd(a, -38, 38), rnd(a, -38, 38), 0.5, rnd(a, 5, 7), rnd(a, 4, 6), 1, { mat: 'piedra_gris', giro: rnd(a, 0, 90), tono: rnd(a, -0.12, 0.05) }));
      if (v === 'roto') for (let i = 0; i < 4; i++) ps.push(a.elipsoide(rnd(a, -26, 26), rnd(a, -26, 26), 0.4, rnd(a, 6, 13), rnd(a, 5, 10), 1.2, { mat: i % 2 ? 'tierra' : 'pasto', giro: rnd(a, 0, 180) }));
      if (v === 'charco') ps.push(a.elipsoide(rnd(a, -8, 8), rnd(a, -8, 8), 0.2, 20, 13, 1.4, { mat: 'agua_sucia', giro: rnd(a, 0, 180) }), a.elipsoide(18, 14, 0.2, 7, 5, 1.3, { mat: 'agua_sucia' }));
      return ps;
    },
  },
  {
    id: 'pue_cerca', nombre: ['Cerca', 'Fence'], tema: 'pueblo', variantes: ['tablas', 'estacas', 'rota', 'piedra'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const L = 80;
      ps.push(a.caja(0, 0, 0, L + 6, 12, 0.6, { mat: 'tierra', tono: -0.05 }));
      if (v === 'estacas') {
        for (let x = -L / 2 + 2.5; x < L / 2; x += 5.2) { const h = rnd(a, 30, 38), g = rnd(a, -4, 4); ps.push(a.cilindro(x, 0, 0, 2.5, h, { mat: 'corteza', incl: g }), a.cilindro(x, 0, h, 2.5, 6, { mat: 'madera', r1: 0.3, incl: g })); }
        ps.push(a.palo([-L / 2, 2.6, 24], [L / 2, 2.6, 25], 1, { mat: 'cuerda' }), a.palo([-L / 2, 2.6, 8], [L / 2, 2.6, 8], 1, { mat: 'cuerda' }));
      } else if (v === 'piedra') {
        ps.push(a.caja(0, 0, 0, L, 12, 18, { mat: 'piedra', tono: -0.2 }));
        for (let x = -L / 2 + 4; x < L / 2; x += rnd(a, 6, 10)) ps.push(a.caja(x, rnd(a, -2, 2), 17, rnd(a, 7, 11), rnd(a, 8, 12), rnd(a, 4, 7), { mat: 'piedra', giro: rnd(a, -15, 15), tono: rnd(a, -0.25, -0.05) }));
        matas(a, ps, 4, -L / 2, L / 2, 6, 12);
      } else {
        const rota = v === 'rota';
        for (let i = 0; i <= 4; i++) {
          const x = -L / 2 + i * 20, ladea = rota && i === 3 ? 22 : rnd(a, -3, 3);
          if (rota && i === 2) { ps.push(a.caja(x, 0, 0, 4, 4, 12, { mat: 'madera_vieja' })); continue; }
          ps.push(a.caja(x, 0, 0, 4, 4, 34, { mat: 'madera', incl: ladea, inclEje: 'y' }));
        }
        for (const z of [10, 24]) for (let i = 0; i < 4; i++) {
          const x = -L / 2 + 10 + i * 20;
          if (rota && (i === 1 || i === 2) && z === 24) continue;
          if (rota && i === 2) { ps.push(viga(a, [x - 12, 4, 0.5], [x + 8, 10, 0.5], 4, 1.5, [0, 0, 1], { mat: 'madera_vieja' })); continue; }
          if (rota && i === 1) { ps.push(viga(a, [x - 10, 2.5, z], [x + 8, 2.5, 1], 4, 1.5, [0, 1, 0], { mat: 'madera_vieja' })); continue; }
          ps.push(a.caja(x, 2.5, z, 21, 1.6, 4.5, { mat: 'madera_vieja', tono: rnd(a, -0.05, 0.05) }));
        }
        if (rota) matas(a, ps, 4, -L / 2, L / 2, -4, 8);
      }
      return ps;
    },
  },
  {
    id: 'pue_letrina', nombre: ['Letrina', 'Outhouse'], tema: 'pueblo', variantes: ['cerrada', 'abierta'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const W = 30;
      ps.push(a.caja(0, 0, 0, W + 10, W + 10, 1, { mat: 'tierra' }));
      ps.push(a.poliedro([[-W / 2, -W / 2, 0], [W / 2, -W / 2, 0], [-W / 2, W / 2, 0], [W / 2, W / 2, 0], [-W / 2, -W / 2, 56], [W / 2, -W / 2, 56], [-W / 2, W / 2, 62], [W / 2, W / 2, 62]], { mat: 'madera_vieja' }));
      ps.push(a.poliedro([[-W / 2 - 3, -W / 2 - 4, 56], [W / 2 + 3, -W / 2 - 4, 56], [-W / 2 - 3, W / 2 + 5, 62.5], [W / 2 + 3, W / 2 + 5, 62.5], [-W / 2 - 3, -W / 2 - 4, 58.5], [W / 2 + 3, -W / 2 - 4, 58.5], [-W / 2 - 3, W / 2 + 5, 65], [W / 2 + 3, W / 2 + 5, 65]], { mat: 'madera', tono: -0.05 }));
      const fy = cara(a, 'y', W / 2);
      for (const u of [-W / 2 + 1, W / 2 - 1]) ps.push(fy.bx(u, 1, 0, 3, 2, 60, { mat: 'madera' }));
      if (v === 'cerrada') {
        ps.push(fy.bx(0, 0.75, 1, 22, 1.5, 54, { mat: 'madera', tono: 0.04 }));
        ps.push(fy.cil(-1.5, -3, 46, 3.4, 6, { mat: 'negro', resta: true }), fy.cil(-1.5, -2.5, 46, 3.4, 0.8, { mat: 'negro' }), fy.cil(0.4, -3, 46.6, 3, 5, { mat: 'madera', tono: 0.04 }));
        ps.push(fy.bx(0, 1.8, 10, 18, 1, 2.5, { mat: 'madera_vieja' }), fy.bx(0, 1.8, 40, 18, 1, 2.5, { mat: 'madera_vieja' }), a.esfera(...fy.pt(7, 2, 28), 1, { mat: 'hierro' }));
      } else {
        ps.push(fy.bx(0, -2, 1, 22, 10, 54, { mat: 'negro', resta: true }), fy.bx(0, -6.5, 1, 22, 1, 54, { mat: 'negro' }), fy.bx(0, -6, 1, 22, 4, 14, { mat: 'madera_vieja' }), fy.cil(0, -2.2, 15, 4, 0.4, { mat: 'negro' }));
        ps.push(a.caja(W / 2 + 6, W / 2 + 10, 1, 22, 1.5, 54, { mat: 'madera', giro: 68, tono: 0.04 }));
      }
      ps.push(a.cilindro(-W / 2 - 6, W / 2 - 4, 0, 4, 7, { mat: 'madera', r1: 4.5 }), a.palo([-W / 2 - 6, W / 2 - 4, 7], [-W / 2 - 4, W / 2 - 2, 16], 0.7, { mat: 'madera' }));
      matas(a, ps, 4, -W / 2 - 4, W / 2 + 4, W / 2 + 2, W / 2 + 8);
      return ps;
    },
  },
);
