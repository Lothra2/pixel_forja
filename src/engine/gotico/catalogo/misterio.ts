import { registrar } from '../objeto';
import { masa, hueso, bulto, type Comp, type Pieza, type V3 } from '../render';
import '../cuerpo';

/**
 * Misterio y terror: cosas que no se explican. Espejos con alguien adentro, árboles con caras en la corteza, manos
 * que salen de la tierra, pozos de almas, carne viva que palpita, ojos que parpadean en lo oscuro, tronos de hueso,
 * círculos de invocación, puertas selladas que laten, reliquias que flotan y libros que pasan solos sus páginas.
 */
const ciclo = (f: number, n = 8) => (f % n) / n;
const onda = (f: number, n = 8, fase = 0) => Math.sin(ciclo(f, n) * Math.PI * 2 + fase);

registrar(
  {
    id: 'mis_espejo', nombre: ['Espejo embrujado', 'Haunted mirror'], tema: 'misterio', variantes: ['x', 'y', 'roto'], cuadros: 8, t: 4, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const y = v === 'y', g = y ? 90 : 0, ps: Pieza[] = [];
      const P = (u: number, z: number, w = 0): V3 => (y ? [w, u, z] : [u, w, z]);
      ps.push(a.caja(0, 0, 0, 18, 6, 3, { mat: 'madera_vieja', giro: g }));
      ps.push(a.caja(...P(0, 3), 15, 2.4, 42, { mat: 'madera_vieja', giro: g, tono: -0.05 }), a.caja(...P(0, 6, 0.7), 12, 1.2, 34, { mat: v === 'roto' ? 'negro' : 'vidrio', giro: g }));
      for (const u of [-8, 8]) ps.push(a.cilindro(...P(u, 3), 1.4, 44, { mat: 'madera_vieja' }), a.esfera(...P(u, 48), 2, { mat: 'oro' }));
      ps.push(a.elipsoide(...P(0, 46.5), 8, 1.6, 4, { mat: 'madera_vieja', giro: g }));
      // alguien adentro: una cara pálida que se acerca y se aleja, con los ojos encendidos
      const k = 0.5 + 0.5 * onda(f), z = 26 + k * 2;
      if (v !== 'roto' || f % 4 < 2) {
        ps.push(a.elipsoide(...P(0, z, 1.0), 3.4 * (0.7 + k * 0.4), 0.4, 4.4 * (0.7 + k * 0.4), { mat: 'cu_ectoplasma', giro: g }));
        for (const s of [-1, 1]) ps.push(a.esfera(...P(s * 1.3 * (0.7 + k * 0.4), z + 0.8, 1.5), 0.6, { mat: 'cu_ojo_hielo' }));
      }
      if (v === 'roto') for (let i = 0; i < 6; i++) ps.push(a.caja(...P(-6 + a.r() * 12, 0.3), 1 + a.r() * 2.5, 2.5, 0.4, { mat: 'vidrio', giro: a.r() * 180 }));
      return ps;
    },
  },
  {
    id: 'mis_arbol_rostros', nombre: ['Árbol de los rostros', 'Tree of faces'], tema: 'misterio', variantes: ['viejo', 'retorcido'], cuadros: 8, t: 5, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const cs: Comp[] = [], ps: Pieza[] = [];
      const alto = v === 'viejo' ? 120 : 100, tor = v === 'retorcido' ? 1 : 0.4;
      // tronco grueso que se tuerce con raíces que agarran la tierra
      let prev: V3 = [0, 0, 0];
      for (let i = 1; i <= 6; i++) { const t = i / 6, p: V3 = [Math.sin(t * 3 * tor) * 8, Math.cos(t * 2.5 * tor) * 6 - 6, t * alto * 0.6]; cs.push(hueso(prev, p, 15 - t * 7, 14 - t * 8, { mat: 'corteza_muerta' })); prev = p; }
      for (let i = 0; i < 7; i++) { const an = (i / 7) * Math.PI * 2 + a.r() * 0.5, L = 22 + a.r() * 14; cs.push(hueso([Math.cos(an) * 6, Math.sin(an) * 6, 6], [Math.cos(an) * L, Math.sin(an) * L, -1], 6, 1.5, { mat: 'corteza_muerta' })); }
      // ramas desnudas como dedos
      for (let i = 0; i < 9; i++) {
        const an = (i / 9) * Math.PI * 2 + a.r(), base: V3 = [prev[0] * 0.8, prev[1] * 0.8, alto * (0.42 + a.r() * 0.2)];
        const m: V3 = [base[0] + Math.cos(an) * 22, base[1] + Math.sin(an) * 22, base[2] + 18 + a.r() * 14], p: V3 = [m[0] + Math.cos(an + 0.6) * 18, m[1] + Math.sin(an + 0.6) * 18, m[2] + 10 + a.r() * 14];
        cs.push(hueso(base, m, 4.5, 2.4, { mat: 'corteza_muerta' }), hueso(m, p, 2.4, 0.5, { mat: 'corteza_muerta' }));
      }
      // tres rostros que asoman de la corteza: frente, cuencas, boca abierta
      const caras: [number, number, number][] = [[0, 30, 0], [100, 52, 0.4], [210, 18, 0.8]];
      caras.forEach(([g, z, fase], i) => {
        const an = (g * Math.PI) / 180, r = 12 - z * 0.06, c: V3 = [Math.cos(an) * r, Math.sin(an) * r - 4, z];
        cs.push(bulto(c, [3, 4.5, 5.5], { mat: 'corteza_muerta', eje: [Math.cos(an), Math.sin(an), 0], k: 2 }));
        const fw: V3 = [Math.cos(an), Math.sin(an), 0], rt: V3 = [-Math.sin(an), Math.cos(an), 0];
        const en = (k: number, s: number, dz: number): V3 => [c[0] + fw[0] * k + rt[0] * s, c[1] + fw[1] * k + rt[1] * s, c[2] + dz];
        const brillo = 0.5 + 0.5 * onda(f, 8, fase + i);
        for (const s of [-1.6, 1.6]) ps.push(a.elipsoide(...en(2.4, s, 1.5), 1.1, 1.1, 1.2, { mat: 'negro' }), a.esfera(...en(3.0, s, 1.5), 0.35 + brillo * 0.25, { mat: 'per_ojo_brasa' }));
        ps.push(a.elipsoide(...en(2.6, 0, -2.6), 1.2, 1.5, 1.4 + brillo * 0.8, { mat: 'negro' }));
      });
      return [masa(cs, { mat: 'corteza_muerta', suave: 4 }), ...ps];
    },
  },
  {
    id: 'mis_manos', nombre: ['Manos que salen de la tierra', 'Hands from the ground'], tema: 'misterio', variantes: ['pocas', 'muchas'], cuadros: 8, t: 3, huella: [2, 2], bloquea: false,
    armar: (v, f, a) => {
      const n = v === 'muchas' ? 9 : 4, ps: Pieza[] = [];
      ps.push(a.elipsoide(0, 0, -1, 20, 18, 2.4, { mat: 'tierra' }));
      for (let i = 0; i < n; i++) {
        const x = (a.r() - 0.5) * 26, y = (a.r() - 0.5) * 24, fase = a.r() * 6, sube = 0.5 + 0.5 * onda(f, 8, fase), lado = a.r() * Math.PI * 2;
        const cs: Comp[] = [];
        const codo: V3 = [x + Math.cos(lado) * 2, y + Math.sin(lado) * 2, 5 + sube * 6], mano: V3 = [x + Math.cos(lado) * 3.5, y + Math.sin(lado) * 3.5, 11 + sube * 9];
        cs.push(hueso([x, y, -2], codo, 1.7, 1.5, { mat: 'cu_piel_gris' }), hueso(codo, mano, 1.5, 1.2, { mat: 'cu_piel_gris' }), bulto(mano, [1.4, 1.9, 1.7], { mat: 'cu_piel_gris' }));
        for (let k = 0; k < 4; k++) { const an = lado + (k - 1.5) * 0.45, abre = 0.6 + sube * 0.9; cs.push(hueso(mano, [mano[0] + Math.cos(an) * 1.6, mano[1] + Math.sin(an) * 1.6, mano[2] + 3.5 * abre], 0.5, 0.3, { mat: 'cu_piel_gris', k: 0.4 })); }
        ps.push(masa(cs, { mat: 'cu_piel_gris', suave: 1 }));
        ps.push(a.elipsoide(x, y, 0, 3.6, 3.2, 1.2, { mat: 'tierra', tono: -0.08 }));
      }
      return ps;
    },
  },
  {
    id: 'mis_pozo_almas', nombre: ['Pozo de las almas', 'Well of souls'], tema: 'misterio', variantes: ['piedra', 'hueso'], cuadros: 8, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const mat = v === 'hueso' ? 'cu_hueso' : 'piedra_musgo', ps: Pieza[] = [];
      ps.push(a.cilindro(0, 0, 0, 15, 11, { mat }), a.cilindro(0, 0, 1, 12, 11, { mat: 'negro', resta: true }), a.cilindro(0, 0, 1, 11.5, 0.5, { mat: 'cu_ectoplasma' }));
      if (v === 'hueso') for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2; ps.push(a.esfera(Math.cos(an) * 13.5, Math.sin(an) * 13.5, 11.5, 2.2, { mat: 'cu_hueso' })); }
      // almas que suben retorciéndose y se deshacen
      for (let i = 0; i < 5; i++) {
        const u = ((f + i * 1.6) % 8) / 8, an = i * 1.3 + u * 3, r = 5 * (1 - u * 0.4);
        const c: V3 = [Math.cos(an) * r, Math.sin(an) * r, 8 + u * 34];
        ps.push(a.elipsoide(...c, 2.6 * (1 - u * 0.5), 2.6 * (1 - u * 0.5), 4.5, { mat: 'cu_ectoplasma' }));
        if (u < 0.6) for (const s of [-1, 1]) ps.push(a.esfera(c[0] + s * 0.9, c[1] - 1.8, c[2] + 1.2, 0.4, { mat: 'negro' }));
      }
      // una mano espectral que se asoma al borde
      const sube = 0.5 + 0.5 * onda(f);
      ps.push(masa([hueso([6, -4, 6], [9, -7, 11 + sube * 4], 1.4, 1.1, { mat: 'cu_ectoplasma' }), bulto([10, -8, 12.5 + sube * 4], [1.6, 1.3, 1.8], { mat: 'cu_ectoplasma' })], { mat: 'cu_ectoplasma', suave: 1 }));
      return { piezas: ps, resplandor: { c: [0, 0, 14], r: 34, color: '#80d0e0' } };
    },
  },
  {
    id: 'mis_trono_huesos', nombre: ['Trono de huesos', 'Bone throne'], tema: 'misterio', variantes: ['x', 'y'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const y = v === 'y', P = (u: number, w: number, z: number): V3 => (y ? [w, u, z] : [u, w, z]);
      const ps: Pieza[] = [], cs: Comp[] = [];
      ps.push(a.caja(0, 0, 0, 40, 40, 6, { mat: 'marmol_negro' }), a.caja(0, 0, 6, 32, 32, 5, { mat: 'marmol_negro', tono: 0.05 }));
      // asiento y respaldo de huesos fundidos, con costillas y cráneos
      cs.push(bulto(P(0, 2, 18), [9, 10, 4], { mat: 'cu_hueso' }), bulto(P(-8, 0, 40), [3, 11, 22], { mat: 'cu_hueso' }));
      for (let i = 0; i < 7; i++) { const u = -9 + i * 3; cs.push(hueso(P(-9, u, 20), P(-12, u * 1.15, 62 + Math.cos(i) * 4), 1.4, 0.6, { mat: 'cu_hueso' })); }
      for (const s of [-1, 1]) cs.push(hueso(P(0, s * 11, 11), P(8, s * 11, 24), 2.6, 2, { mat: 'cu_hueso' }), bulto(P(9, s * 11, 25), [3, 3, 3], { mat: 'cu_hueso' }));
      ps.push(masa(cs, { mat: 'cu_hueso', suave: 2.4 }));
      for (let i = 0; i < 5; i++) { const u = -8 + i * 4; ps.push(a.esfera(...P(-10, u, 58 - Math.abs(i - 2) * 3), 3, { mat: 'cu_hueso' })); for (const s of [-1, 1]) ps.push(a.esfera(...P(-7.4, u + s * 1.1, 58.6 - Math.abs(i - 2) * 3), 0.8, { mat: 'negro' })); }
      for (const s of [-1, 1]) ps.push(a.palo(P(-10, s * 13, 40), P(-6, s * 18, 74), 2, { mat: 'cu_hueso', r1: 0.2 }));
      return ps;
    },
  },
  {
    id: 'mis_carne_viva', nombre: ['Carne viva', 'Living flesh'], tema: 'misterio', variantes: ['charco', 'muro'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const cs: Comp[] = [], ps: Pieza[] = [], late = 0.5 + 0.5 * onda(f);
      const muro = v === 'muro';
      for (let i = 0; i < (muro ? 14 : 9); i++) {
        const x = (a.r() - 0.5) * (muro ? 50 : 30), y = muro ? (a.r() - 0.5) * 8 : (a.r() - 0.5) * 28, z = muro ? a.r() * 50 : 0;
        const r = (muro ? 8 : 7) + a.r() * 5 + late * (i % 3 === 0 ? 1.4 : 0.4);
        cs.push(bulto([x, y, z + r * 0.4], [r, r * 0.9, r * (muro ? 0.9 : 0.55)], { mat: i % 4 === 0 ? 'cu_piel_roja' : 'carne' }));
      }
      for (let i = 0; i < 4; i++) cs.push(hueso([(a.r() - 0.5) * 30, (a.r() - 0.5) * 20, 1], [(a.r() - 0.5) * 30, (a.r() - 0.5) * 20, muro ? 40 : 6], 1.2, 1.2, { mat: 'cu_piel_roja' }));
      ps.push(masa(cs, { mat: 'carne', suave: 4 }));
      // ojos que se abren en la carne
      for (let i = 0; i < 3; i++) {
        const x = (a.r() - 0.5) * 20, z = muro ? 15 + a.r() * 25 : 8, abre = Math.max(0, onda(f, 8, i * 2));
        ps.push(a.elipsoide(x, muro ? 8 : (a.r() - 0.5) * 10, z, 2.4, 1.4, 0.4 + abre * 1.6, { mat: 'cu_hueso' }), a.esfera(x, (muro ? 9.4 : 0), z, 0.9 * abre + 0.05, { mat: 'per_ojo_brasa' }));
      }
      return ps;
    },
  },
  {
    id: 'mis_ojos_oscuridad', nombre: ['Ojos en la oscuridad', 'Eyes in the dark'], tema: 'misterio', variantes: ['par', 'muchos'], cuadros: 8, t: 4, huella: [1, 1], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'muchos' ? 6 : 1;
      for (let i = 0; i < n; i++) {
        const x = (a.r() - 0.5) * 30, y = (a.r() - 0.5) * 30, z = 18 + a.r() * 30, fase = Math.floor(a.r() * 8);
        // una silueta negra encorvada que apenas se adivina, y sus ojos encima
        ps.push(masa([bulto([x - 3, y - 3, z - 14], [6, 6, 14], { mat: 'cu_tela_negra' }), bulto([x - 1, y - 1, z], [4, 4, 4.5], { mat: 'cu_tela_negra' }), hueso([x - 3, y - 3, z - 8], [x + 2, y + 2, z - 20], 1.6, 1.2, { mat: 'cu_tela_negra' })], { mat: 'cu_tela_negra', suave: 3 }));
        if ((f + fase) % 8 === 7) continue; // parpadea
        const mat = a.r() < 0.5 ? 'cu_ojo_brasa' : a.r() < 0.5 ? 'cu_ojo_verde' : 'cu_ojo_hielo';
        for (const s of [-1, 1]) ps.push(a.elipsoide(x + 1.6 + s * 1.6, y + 1.6 - s * 1.6, z, 0.8, 0.8, 0.55, { mat }));
      }
      return ps.length ? ps : [a.esfera(0, 0, -50, 0.01, { mat: 'negro' })];
    },
  },
  {
    id: 'mis_circulo', nombre: ['Círculo de invocación', 'Summoning circle'], tema: 'misterio', variantes: ['sangre', 'sombra', 'fuego'], cuadros: 8, t: 3, huella: [4, 4], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], mat = v === 'sangre' ? 'cu_sangre_viva' : v === 'sombra' ? 'cu_sombra' : 'fuego';
      const R = 30, late = 0.5 + 0.5 * onda(f);
      for (let i = 0; i < 40; i++) { const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2; ps.push(a.palo([Math.cos(a0) * R, Math.sin(a0) * R, 0.3], [Math.cos(a1) * R, Math.sin(a1) * R, 0.3], 0.6, { mat })); }
      // estrella de siete puntas
      for (let i = 0; i < 7; i++) { const a0 = (i / 7) * Math.PI * 2 + f * 0.05, a1 = (((i + 3) % 7) / 7) * Math.PI * 2 + f * 0.05; ps.push(a.palo([Math.cos(a0) * R, Math.sin(a0) * R, 0.35], [Math.cos(a1) * R, Math.sin(a1) * R, 0.35], 0.4, { mat })); }
      // velas negras en las puntas
      for (let i = 0; i < 7; i++) { const an = (i / 7) * Math.PI * 2; const x = Math.cos(an) * (R + 3), y = Math.sin(an) * (R + 3); ps.push(a.cilindro(x, y, 0, 1.1, 5 + (i % 3), { mat: 'negro' }), a.elipsoide(x, y, 6.2 + (i % 3) + (f % 2) * 0.3, 0.6, 0.6, 1.2 + late * 0.5, { mat: 'luz_vela' })); }
      // algo que asoma en el centro
      ps.push(a.elipsoide(0, 0, 1 + late * 3, 0.6 + 6 * late, 0.6 + 6 * late, 2 + late * 6, { mat: v === 'fuego' ? 'lava' : 'cu_sombra' }));
      return { piezas: ps, resplandor: { c: [0, 0, 4], r: 50, color: v === 'sangre' ? '#c01818' : v === 'sombra' ? '#7030c0' : '#ff6a10' } };
    },
  },
  {
    id: 'mis_puerta_sellada', nombre: ['Puerta sellada', 'Sealed door'], tema: 'misterio', variantes: ['x', 'y'], cuadros: 8, t: 4, huella: [3, 1], bloquea: true,
    armar: (v, f, a) => {
      const y = v === 'y', g = y ? 90 : 0, P = (u: number, w: number, z: number): V3 => (y ? [w, u, z] : [u, w, z]);
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 48, 12, 72, { mat: 'piedra_bloques', giro: g }), a.caja(...P(0, 0, 0), 30, 16, 54, { mat: 'piedra_bloques', giro: g, resta: true }));
      for (const s of [-1, 1]) ps.push(a.caja(...P(s * 7.4, 3, 0), 14.6, 3, 53, { mat: 'madera_vieja', giro: g }));
      // cadenas en X y el sello que late en el medio
      for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const t0 = i / 9, t1 = (i + 1) / 9; ps.push(a.palo(P(s * (-14 + t0 * 28), 6, 50 - t0 * 46), P(s * (-14 + t1 * 28), 6, 50 - t1 * 46), 0.9, { mat: 'hierro_oxido' })); }
      const late = 0.5 + 0.5 * onda(f);
      ps.push(a.cilindro(...P(0, 6.5, 27), 5 + late, 1.2, { mat: 'cu_sombra', eje: y ? [1, 0, 0] : [0, 1, 0] }));
      for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2 + f * 0.2; ps.push(a.esfera(...P(Math.cos(an) * (8 + late * 2), 7, 27 + Math.sin(an) * (8 + late * 2)), 0.7, { mat: 'runa' })); }
      return { piezas: ps, resplandor: { c: P(0, 8, 27), r: 26, color: '#8040d0' } };
    },
  },
  {
    id: 'mis_reliquia', nombre: ['Reliquia que flota', 'Floating relic'], tema: 'misterio', variantes: ['oro', 'hueso', 'sombra'], cuadros: 8, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], z = 30 + onda(f) * 2;
      ps.push(a.cilindro(0, 0, 0, 7, 10, { mat: 'marmol_negro', r1: 5 }), a.cilindro(0, 0, 10, 6, 2, { mat: 'oro' }));
      const nucleo = v === 'oro' ? 'cu_luz_santa' : v === 'hueso' ? 'cu_ectoplasma' : 'cu_sombra';
      ps.push(a.esfera(0, 0, z, 3.2, { mat: nucleo }));
      for (let k = 0; k < 3; k++) for (let i = 0; i < 16; i++) {
        const an = (i / 16) * Math.PI * 2 + (f / 8) * Math.PI * 2 * (k % 2 ? 1 : -1), r = 6 + k * 1.6;
        const q: V3 = k === 0 ? [Math.cos(an) * r, Math.sin(an) * r, z] : k === 1 ? [Math.cos(an) * r, 0, z + Math.sin(an) * r] : [0, Math.cos(an) * r, z + Math.sin(an) * r];
        ps.push(a.esfera(...q, 0.45, { mat: v === 'hueso' ? 'cu_hueso' : 'oro' }));
      }
      return { piezas: ps, resplandor: { c: [0, 0, z], r: 30, color: v === 'oro' ? '#ffe090' : v === 'hueso' ? '#80e0e0' : '#9040d0' } };
    },
  },
  {
    id: 'mis_libro_maldito', nombre: ['Libro maldito', 'Cursed tome'], tema: 'misterio', variantes: ['atril'], cuadros: 8, t: 3, huella: [1, 1], bloquea: true,
    armar: (_v, f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.cilindro(0, 0, 0, 4, 2, { mat: 'madera_vieja' }), a.cilindro(0, 0, 2, 1.4, 22, { mat: 'madera_vieja' }), a.caja(0, 0, 24, 12, 9, 1.4, { mat: 'madera_vieja', incl: -20 }));
      ps.push(a.caja(0, 0, 25.6, 11, 8, 1.6, { mat: 'cu_cuero_negro', incl: -20 }), a.caja(0, 0, 27, 10, 7.4, 0.6, { mat: 'cu_tela_blanca', incl: -20 }));
      // páginas que se levan solas y letras que brillan
      for (let i = 0; i < 3; i++) { const u = ((f + i * 2.7) % 8) / 8; ps.push(a.caja(Math.sin(u * 6) * 2, -1 + u * 2, 28 + u * 14, 6, 5, 0.25, { mat: 'cu_tela_blanca', giro: u * 140, incl: u * 60 })); }
      for (let i = 0; i < 5; i++) { const u = ((f + i * 1.6) % 8) / 8; ps.push(a.esfera(Math.cos(i * 2) * 3, Math.sin(i * 2) * 3, 30 + u * 16, 0.4 * (1 - u), { mat: 'runa' })); }
      return ps;
    },
  },
  {
    id: 'mis_estatua_doliente', nombre: ['Estatua doliente', 'Mourning statue'], tema: 'misterio', variantes: ['piedra', 'marmol'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const mat = v === 'marmol' ? 'marmol' : 'piedra_musgo';
      const cs: Comp[] = [];
      // una figura encapuchada de piedra con las manos en la cara
      cs.push(hueso([0, 0, 12], [0, 0, 40], 9, 6, { mat }), bulto([0, 0, 47], [5.5, 5, 7], { mat }), hueso([0, 0, 12], [-3, 0, 2], 11, 13, { mat }));
      for (const s of [-1, 1]) cs.push(hueso([0, s * 6, 38], [4, s * 3, 30], 2.2, 1.8, { mat }), hueso([4, s * 3, 30], [5, s * 1.4, 45], 1.8, 1.5, { mat }), bulto([5.3, s * 1.2, 46], [1.4, 1.8, 2.4], { mat }));
      const ps: Pieza[] = [masa(cs, { mat, suave: 3 }), ...[a.caja(0, 0, 0, 22, 22, 4, { mat: 'piedra' })]];
      // lágrimas de sangre que bajan por la piedra
      for (const s of [-1, 1]) { const u = ((f + (s > 0 ? 0 : 4)) % 8) / 8; ps.push(a.elipsoide(5.6, s * 2.4, 44 - u * 14, 0.4, 0.4, 0.9, { mat: 'cu_sangre_viva' })); ps.push(a.palo([5.5, s * 2.4, 44], [5.8, s * 2.6, 44 - u * 14], 0.18, { mat: 'sangre' })); }
      return ps;
    },
  },
);
