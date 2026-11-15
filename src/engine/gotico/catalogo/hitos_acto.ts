import { registrar, type Arma, type Pieza, type V3 } from '../objeto';

// Una pieza grande y única por acto (se ve una o dos veces por mundo abierto, de lejos se reconoce dónde estás) y el
// aderezo de los muros de las mazmorras de obra: contrafuertes y derrumbes del estilo de cada una.
// Usan la piedra de los riscos (bordes.ts) y los materiales del decorado (decorado.ts).

const PI = Math.PI;
const suelo = (a: Arma) => a.caja(0, 0, -80, 900, 900, 80, { mat: 'roca', resta: true });
const blq = (a: Arma, x: number, y: number, z: number, w: number, d: number, h: number, mat: string, giro = 0) => a.caja(x, y, z, w, d, h, { mat, giro: giro + (a.r() - 0.5) * 5, tono: (a.r() - 0.5) * 0.12 });
/** Peña suelta. */
const pena = (a: Arma, x: number, y: number, r: number, mat: string) => a.elipsoide(x, y, r * 0.35, r, r * 0.85, r * 0.7, { mat, giro: a.r() * 180, tono: (a.r() - 0.5) * 0.12 });

registrar(
  {
    id: 'acto_hito', nombre: ['Hito del acto', 'Act landmark'], tema: 'comun',
    variantes: ['a1_cruz', 'a2_coloso', 'a3_idolo', 'a4_tumulo', 'a5_costillar', 'a6_ancla', 'a7_anillo'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'a1_cruz') {
        // cruz de término del páramo: gradas, fuste alto, brazos con nudo, una soga colgando y musgo
        const m = 'bor_paramo';
        for (let i = 0; i < 3; i++) ps.push(blq(a, 0, 0, i * 5, 40 - i * 9, 40 - i * 9, 5, m));
        ps.push(a.caja(0, 0, 15, 8, 7, 78, { mat: m })); ps.push(a.caja(0, 0, 66, 40, 7, 9, { mat: m, tono: 0.04 }));
        ps.push(a.cilindro(0, 0, 60, 12, 5, { mat: m, eje: [0, 1, 0] as V3, tono: -0.06 })); ps.push(a.cilindro(0, 0, 60, 7.5, 6, { mat: 'negro', eje: [0, 1, 0] as V3 }));
        ps.push(a.palo([15, 0, 66], [15.5, 1, 44], 0.7, { mat: 'dec_rama' })); ps.push(a.cilindro(15.5, 1, 39, 2.4, 5, { mat: 'dec_rama', r1: 1.6 }));
        for (const [x, y, z] of [[0, 0, 93], [-15, 0, 75], [8, 6, 15], [-12, -8, 10]]) ps.push(a.elipsoide(x, y, z, 6, 5, 1.6, { mat: 'bor_musgo', giro: a.r() * 180 }));
        for (let i = 0; i < 6; i++) { const g = a.r() * 2 * PI; ps.push(pena(a, Math.cos(g) * 30, Math.sin(g) * 26, 5 + a.r() * 4, m)); }
      } else if (v === 'a2_coloso') {
        // el coloso tragado por la arena: media cabeza con tocado, la mano abierta más allá, arena montada encima
        const m = 'bor_desierto';
        ps.push(a.elipsoide(-10, 0, 14, 23, 20, 30, { mat: m })); ps.push(a.caja(-10, 0, 34, 50, 30, 12, { mat: m, tono: 0.06 }));
        ps.push(a.caja(-10, 17, 14, 7, 5, 14, { mat: m, tono: -0.1 })); for (const l of [-1, 1]) ps.push(a.caja(-10 + l * 9, 18.5, 26, 8, 2, 3.4, { mat: 'negro' }));
        for (const l of [-1, 1]) ps.push(a.caja(-10 + l * 27, 2, 0, 9, 22, 36, { mat: m, tono: -0.05, incl: l * 8, inclEje: 'y' }));
        ps.push(a.caja(-10, 19.5, 6, 16, 2, 2.6, { mat: 'negro' }));
        ps.push(a.elipsoide(34, 8, 3, 12, 9, 6, { mat: m })); for (let i = 0; i < 4; i++) ps.push(a.palo([30 + i * 4, 12, 6], [28 + i * 5.5, 20, 22 + (i % 2) * 5], 2.6, { mat: m, r1: 1.9 }));
        for (const [x, y, r] of [[-30, 16, 20], [14, 20, 16], [30, -10, 14]]) ps.push(a.elipsoide(x, y, 0, r, r * 0.8, 5, { mat: m, tono: 0.16 }));
      } else if (v === 'a3_idolo') {
        // cabeza de ídolo de la selva: bloque con ojos que arden verde, boca abierta, lianas y raíces que la abrazan
        const m = 'bor_selva';
        ps.push(a.caja(0, 0, 0, 46, 40, 14, { mat: m, tono: -0.06 })); ps.push(a.caja(0, 0, 14, 40, 34, 44, { mat: m })); ps.push(a.caja(0, 0, 58, 46, 38, 9, { mat: m, tono: 0.05 }));
        for (const l of [-1, 1]) { ps.push(a.caja(l * 10, 17.6, 40, 9, 2, 6, { mat: 'dec_runa_verde' })); ps.push(a.caja(l * 22, 2, 30, 6, 16, 18, { mat: m, tono: -0.08 })); }
        ps.push(a.caja(0, 18, 34, 8, 4, 12, { mat: m, tono: -0.1 })); ps.push(a.caja(0, 17.6, 18, 20, 2, 8, { mat: 'negro' }));
        for (let i = 0; i < 5; i++) ps.push(a.caja(-8 + i * 4, 18.4, 23, 2.4, 1.4, 3, { mat: 'bor_celestial', tono: -0.2 }));
        for (let i = 0; i < 9; i++) { let p: V3 = [(a.r() - 0.5) * 44, (a.r() - 0.5) * 30 + 6, 66]; for (let k = 0; k < 5; k++) { const q: V3 = [p[0] + (a.r() - 0.5) * 6, p[1] + 2.5 + a.r() * 2, p[2] - 11 - a.r() * 5]; ps.push(a.palo(p, q, 1.3 - k * 0.15, { mat: 'bor_liana' })); p = q; } }
        for (const [x, y] of [[-14, -6], [10, 4], [18, -10]]) ps.push(a.elipsoide(x, y, 67, 10, 8, 2.4, { mat: 'bor_liana', giro: a.r() * 180 }));
      } else if (v === 'a4_tumulo') {
        // túmulo del norte: loma de nieve con entrada de losas y un cerco de piedras paradas
        const m = 'bor_nieve_roca';
        ps.push(a.elipsoide(0, -4, 0, 40, 34, 26, { mat: 'bor_nieve', tono: -0.06 }));
        for (const l of [-1, 1]) ps.push(a.caja(l * 8, 27, 0, 5, 9, 22, { mat: m })); ps.push(a.caja(0, 27, 22, 26, 11, 5, { mat: m, tono: 0.05 })); ps.push(a.caja(0, 28, 0, 11, 7, 22, { mat: 'negro' }));
        ps.push(a.caja(0, 31.6, 24, 6, 1, 2.4, { mat: 'dec_runa_fria' }));
        for (let i = 0; i < 9; i++) { const g = (i / 9) * 2 * PI + 0.35, x = Math.cos(g) * 46, y = Math.sin(g) * 40 - 4, h = 16 + a.r() * 16; if (Math.abs(x) < 14 && y > 20) continue; ps.push(a.caja(x, y, 0, 6 + a.r() * 2, 4.5, h, { mat: m, giro: (g * 180) / PI, tono: (a.r() - 0.5) * 0.12, incl: (a.r() - 0.5) * 12 })); ps.push(a.elipsoide(x, y, h - 1, 4.4, 3.6, 2.6, { mat: 'bor_nieve' })); }
      } else if (v === 'a5_costillar') {
        // el costillar de algo enorme: espinazo en el suelo y costillas que se cierran arriba, con brasa en las grietas
        const m = 'bor_celestial';
        for (let i = 0; i < 9; i++) ps.push(a.elipsoide(-36 + i * 9, 0, 5, 5.5, 6, 5, { mat: m, tono: -0.22 + (a.r() - 0.5) * 0.08 }));
        for (let i = 0; i < 6; i++) for (const l of [-1, 1]) { const x = -30 + i * 11, alto = 46 - Math.abs(i - 2.5) * 5; let p: V3 = [x, l * 4, 7]; for (let k = 1; k <= 5; k++) { const f = k / 5, q: V3 = [x + (a.r() - 0.5) * 1.5, l * (4 + Math.sin(f * PI) * 27), 7 + alto * Math.sin(f * PI * 0.62) * 1.05]; ps.push(a.palo(p, q, 3 - f * 1.6, { mat: m, r1: 2.7 - f * 1.6, tono: -0.2 })); p = q; } }
        ps.push(a.elipsoide(46, 0, 9, 13, 10, 11, { mat: m, tono: -0.2 })); for (const l of [-1, 1]) ps.push(a.esfera(55, l * 4.5, 13, 3, { mat: 'dec_brasa' }));
        for (let i = 0; i < 7; i++) ps.push(a.caja(-34 + i * 11 + a.r() * 3, (a.r() - 0.5) * 30, 0, 5, 1.6, 0.9, { mat: 'dec_brasa', giro: a.r() * 180 }));
      } else if (v === 'a6_ancla') {
        // el ancla de un barco que ya no está: clavada de lado, con su cadena y cubierta de percebes y algas
        const m = 'bor_ahogada';
        ps.push(a.palo([-6, 0, 4], [10, 0, 70], 4.4, { mat: m, r1: 3.6 })); ps.push(a.cilindro(11.5, 0, 72, 9, 4, { mat: m, eje: [0, 1, 0] as V3 })); ps.push(a.cilindro(11.5, 0, 72, 5, 5, { mat: 'negro', eje: [0, 1, 0] as V3 }));
        ps.push(a.palo([-2, 0, 56], [22, 0, 50], 2.6, { mat: m }));
        for (const l of [-1, 1]) { let p: V3 = [-6, 0, 6]; for (let k = 1; k <= 5; k++) { const g = (k / 5) * 1.25, q: V3 = [-6 + l * Math.sin(g) * 30, 0, 6 + (1 - Math.cos(g)) * 26]; ps.push(a.palo(p, q, 4 - k * 0.3, { mat: m })); p = q; } ps.push(a.caja(p[0] + l * 3, 0, p[2] - 2, 12, 4, 9, { mat: m, incl: l * 34, inclEje: 'y' })); }
        for (let i = 0; i < 9; i++) ps.push(a.cilindro(22 + i * 5, 8 + Math.sin(i * 1.1) * 5, 1.5, 3, 2.4, { mat: m, eje: [i % 2 ? 1 : 0, i % 2 ? 0 : 1, 0.3] as V3, tono: -0.08 }));
        for (let i = 0; i < 14; i++) { const f = a.r(); ps.push(a.elipsoide(-6 + 16 * f + (a.r() - 0.5) * 5, (a.r() - 0.5) * 6, 4 + 66 * f, 1.7, 1.7, 1.5, { mat: 'bor_percebe' })); }
        for (let i = 0; i < 5; i++) { let p: V3 = [-2 + i * 5, 2, 50 - i * 2]; for (let k = 0; k < 3; k++) { const q: V3 = [p[0] + (a.r() - 0.5) * 3, p[1] + 1, p[2] - 8]; ps.push(a.palo(p, q, 0.9, { mat: 'dec_alga' })); p = q; } }
      } else {
        // el anillo roto de la Corona: un aro de oro y mármol de pie sobre su plinto, partido, con un tramo caído
        ps.push(a.caja(0, 0, 0, 44, 22, 6, { mat: 'bor_celestial', tono: -0.05 })); ps.push(a.caja(0, 0, 6, 34, 16, 6, { mat: 'bor_celestial' }));
        const R = 36;
        for (let i = 0; i < 26; i++) { const g = -0.5 + (i / 26) * (2 * PI - 1.25), g2 = g + (2 * PI - 1.25) / 26; ps.push(a.palo([Math.cos(g) * R, 0, 12 + R + Math.sin(g) * R], [Math.cos(g2) * R, 0, 12 + R + Math.sin(g2) * R], 4.6, { mat: i % 4 === 0 ? 'bor_celestial' : 'bor_oro', tono: (a.r() - 0.5) * 0.1 })); }
        for (let i = 0; i < 4; i++) ps.push(a.palo([30 + i * 6, 14 + i * 2, 4.5], [35 + i * 6, 15 + i * 2, 4.5], 4.4, { mat: 'bor_oro' }));
        ps.push(a.esfera(0, 0, 12 + R, 5, { mat: 'dec_runa_oro' }));
        for (let i = 0; i < 5; i++) ps.push(blq(a, (a.r() - 0.5) * 60, 14 + a.r() * 12, 0, 7, 6, 4, 'bor_celestial', a.r() * 90));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'dec_muro', nombre: ['Aderezo de muro', 'Wall dressing'], tema: 'comun',
    variantes: ['paramo', 'cementerio', 'desierto', 'nieve', 'selva', 'infierno', 'ahogada', 'celestial'].flatMap((e) => ['contrafuerte', 'derrumbe'].map((t) => `${e}_${t}`)), huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], e = v.slice(0, v.lastIndexOf('_')), m = e === 'nieve' ? 'bor_nieve_roca' : 'bor_' + e;
      for (let i = v.length * 3; i > 0; i--) a.r();
      if (v.endsWith('contrafuerte')) {
        // machón escalonado que sube pegado al muro, más ancho abajo
        let z = 0; for (const [w, d, h] of [[13, 11, 16], [11, 9, 26], [9, 7, 26], [7, 5, 18]]) { ps.push(blq(a, 0, -d / 2 + 5.5, z, w, d, h, m)); ps.push(a.caja(0, -d / 2 + 6, z + h - 2.4, w + 1.6, d + 1, 2.4, { mat: m, tono: 0.08 })); z += h; }
        if (e === 'infierno') ps.push(a.caja(0, 6.2, 30, 2, 1, 22, { mat: 'dec_brasa' })); else if (e === 'celestial') ps.push(a.caja(0, 6.2, 34, 5, 1, 5, { mat: 'bor_oro' })); else if (e === 'selva' || e === 'paramo') ps.push(a.elipsoide(0, 3, 86, 6, 5, 2, { mat: e === 'selva' ? 'bor_liana' : 'bor_musgo' })); else if (e === 'nieve') ps.push(a.elipsoide(0, 2, 85, 5.5, 5, 3, { mat: 'bor_nieve' }));
      } else {
        // derrumbe: sillares y cascote en talud contra el muro
        for (let i = 0; i < 12; i++) { const f = a.r(), x = (a.r() - 0.5) * 22 * (1 - f * 0.5), y = 6 - f * 12; ps.push(blq(a, x, y, f * 22 * (0.6 + a.r() * 0.4), 6 + a.r() * 4, 5 + a.r() * 3, 4 + a.r() * 3, m, a.r() * 90)); }
        for (let i = 0; i < 5; i++) ps.push(pena(a, (a.r() - 0.5) * 30, 9 + a.r() * 7, 2.5 + a.r() * 2.5, m));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
);
