import { registrar, type Pieza, type Arma } from '../objeto';
import { MATERIALES } from '../materiales';

MATERIALES.ref_piel = { rampa: ['#2a1a12', '#462c1f', '#64412e', '#82573e', '#9c6d50', '#b48464'], ruido: 0.1, escala: 0.3 };
MATERIALES.ref_pelo = { rampa: ['#0e0a08', '#1c140e', '#2c2016', '#3e2e20'], ruido: 0.3, escala: 0.6 };

// Figuras de referencia a la escala del juego (persona = 61 unidades, 75 px): no son personajes animados, sirven
// para poner en el mapa y ver si una puerta, una mesa o un árbol tienen el tamaño justo.

function cuerpo(a: Arma, ps: Pieza[], ropa: string, ropa2: string, piel: string, alto = 61, ancho = 1) {
  const k = alto / 61;
  // piernas, torso, brazos, cabeza
  ps.push(a.caja(-3.5 * k, 0, 0, 5 * k * ancho, 6 * k, 27 * k, { mat: ropa2 }), a.caja(3.5 * k, 0, 0, 5 * k * ancho, 6 * k, 27 * k, { mat: ropa2 }));
  ps.push(a.caja(0, 0, 26 * k, 14 * k * ancho, 9 * k, 22 * k, { mat: ropa }));
  ps.push(a.cilindro(0, 0, 48 * k, 3 * k, 3 * k, { mat: piel }), a.esfera(0, 0.5, 54 * k, 5 * k, { mat: piel }));
}

registrar({
  id: 'ref_figura', nombre: ['Figura de referencia', 'Reference figure'], tema: 'comun', variantes: ['guerrero', 'maga', 'arquera', 'esqueleto', 'diablillo', 'gigante'], huella: [1, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    if (v === 'guerrero') {
      cuerpo(a, ps, 'hierro', 'cuero', 'ref_piel', 61, 1.1);
      ps.push(a.caja(0, 0, 44, 18, 10, 6, { mat: 'hierro', tono: 0.1 }), a.cilindro(0, 0.5, 54, 5.5, 7, { mat: 'hierro', r1: 4.5 }));
      ps.push(a.caja(-10, 0, 24, 3, 3, 22, { mat: 'hierro' }), a.caja(10, 0, 24, 3, 3, 22, { mat: 'hierro' }));
      ps.push(a.caja(-13, 4, 14, 2, 14, 18, { mat: 'madera', tono: -0.05 }), a.caja(-13.5, 4, 20, 1, 4, 4, { mat: 'hierro' }));
      ps.push(a.palo([11, 2, 24], [14, 6, 62], 0.9, { mat: 'acero' }), a.caja(11.5, 2.5, 26, 7, 2, 1.5, { mat: 'hierro', giro: 30 }));
    } else if (v === 'maga') {
      ps.push(a.cilindro(0, 0, 0, 10, 46, { mat: 'tela_morada', r1: 6 }));
      ps.push(a.cilindro(0, 0, 46, 3, 3, { mat: 'ref_piel' }), a.esfera(0, 0.5, 53, 5, { mat: 'ref_piel' }), a.elipsoide(0, -1.5, 55, 5.5, 5, 5.5, { mat: 'ref_pelo' }), a.cilindro(0, -3, 30, 3.5, 24, { mat: 'ref_pelo', r1: 4.5 }));
      ps.push(a.palo([-9, 2, 0], [-10, 3, 66], 0.9, { mat: 'madera_lisa' }), a.esfera(-10, 3, 68, 2.6, { mat: 'magia' }));
      ps.push(a.caja(-6, 1, 30, 3, 3, 14, { mat: 'tela_morada', incl: -20 }), a.caja(6, 1, 30, 3, 3, 14, { mat: 'tela_morada', incl: 10 }));
    } else if (v === 'arquera') {
      cuerpo(a, ps, 'cuero', 'tela_verde', 'ref_piel', 58, 0.95);
      ps.push(a.elipsoide(0, 2.5, 52, 5.5, 5.5, 6.5, { mat: 'tela_roja' }));
      ps.push(a.palo([-11, 3, 20], [-12, 4, 44], 0.6, { mat: 'madera_lisa' }), a.palo([-12, 4, 44], [-10, 5, 62], 0.6, { mat: 'madera_lisa' }), a.palo([-11, 3, 20], [-10, 5, 62], 0.2, { mat: 'cuerda' }));
      ps.push(a.cilindro(5, -5, 30, 2.4, 16, { mat: 'cuero', incl: 20 }));
    } else if (v === 'esqueleto') {
      ps.push(a.palo([-3, 0, 0], [-3, 0, 26], 1.2, { mat: 'hueso' }), a.palo([3, 0, 0], [3, 0, 26], 1.2, { mat: 'hueso' }));
      ps.push(a.cilindro(0, 0, 26, 4, 4, { mat: 'hueso' }), a.palo([0, 0, 28], [0, 0, 48], 1.1, { mat: 'hueso' }));
      for (let i = 0; i < 4; i++) ps.push(a.cilindro(0, 0, 34 + i * 3.5, 6 - i * 0.4, 1.3, { mat: 'hueso', r1: 6 - i * 0.4 }));
      ps.push(a.palo([-7, 0, 46], [-9, 2, 26], 1, { mat: 'hueso' }), a.palo([7, 0, 46], [10, 4, 30], 1, { mat: 'hueso' }), a.esfera(0, 1, 53, 5, { mat: 'hueso' }), a.esfera(-1.8, 4.6, 53.5, 1.2, { mat: 'negro' }), a.esfera(1.8, 4.6, 53.5, 1.2, { mat: 'negro' }));
      ps.push(a.palo([10, 4, 30], [16, 10, 52], 0.8, { mat: 'hierro_oxido' }));
    } else if (v === 'diablillo') {
      const k = 38 / 61;
      cuerpo(a, ps, 'carne', 'carne', 'carne', 38, 1.2);
      ps.push(a.cilindro(-3, 1, 36 * k + 18, 1.2, 6, { mat: 'hueso', r1: 0.1, incl: -25 }), a.cilindro(3, 1, 36 * k + 18, 1.2, 6, { mat: 'hueso', r1: 0.1, incl: -25 }));
      ps.push(a.palo([7, 1, 16], [9, 6, 34], 0.8, { mat: 'madera' }), a.cilindro(9, 6, 32, 2.5, 4, { mat: 'hierro', r1: 0.2 }));
    } else {
      cuerpo(a, ps, 'cuero', 'tela', 'ref_piel', 110, 1.3);
      ps.push(a.elipsoide(0, -1, 103, 9, 9, 6, { mat: 'ref_pelo' }));
      ps.push(a.palo([16, 2, 40], [20, 8, 100], 3, { mat: 'madera', r1: 4 }));
    }
    return ps;
  },
});
