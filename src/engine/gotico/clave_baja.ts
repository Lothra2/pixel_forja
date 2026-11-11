import { MATERIALES } from './materiales';
import type { Iluminacion, Pieza, V3 } from './render';

/**
 * Clave baja para todo lo que es personaje (héroes, gente de los pueblos, monstruos y jefes), como los juegos de rol
 * góticos de los noventa: los personajes salen de la oscuridad en vez de brillar con luz propia.
 *
 * - Menos luz principal y casi nada de relleno: la sombra propia cae a negro azulado, no a gris.
 * - Sin especular en piel, tela ni cuero: solo los metales (brillo de material 0.4 o más) conservan su destello.
 * - Lo claro se comprime: túnicas blancas, piel pálida y hueso quedan en lino sucio y hueso viejo.
 * - Una luz de borde fina desde atrás y a la derecha (del lado contrario a la principal) recorta la silueta contra el
 *   piso oscuro sin alumbrar la cara de frente: fría (luna) por omisión y cálida (brasa) en lo que trae fuego.
 * - Lo que emite (ojos que brillan, runas, armas encantadas, fuego, lava) no se toca: son los puntos de interés.
 *
 * Los objetos y los pisos siguen con la luz de siempre (la escena sin `luz`).
 */

/** Contraluz: viene de atrás (lejos de la cámara) y a la derecha de la pantalla, un poco desde arriba. */
const DIR_BORDE: V3 = [-0.35, -1, 0.55];
export const BORDE_FRIO = '#47505e';
export const BORDE_CALIDO = '#6e4630';

const BASE: Iluminacion = {
  amb: 0.07, dif: 0.7, cielo: 0.05, rebote: 0.02,
  especular: 0.55, especularMin: 0.4,
  expo: 0.88, gamma: 1.2,
  sombra: { color: '#05070d', fuerza: 0.45, hasta: 0.3 },
  techo: { desde: 80, k: 0.36, color: '#8c8170', mezcla: 0.45 },
  // el metal responde aunque el resto quede en penumbra: placa y oro destellan en sus facetas y todo lo que tiene algo
  // de brillo (malla, hueso pulido) agarra un hilo de contraluz en los cantos
  metal: { brillo: 0.6, esp: 3.0, exp: 12, filo: 0.18, borde: 1.1, ancho: 1.2, piso: 0.24 },
};
export const CLAVE_BAJA_FRIA: Iluminacion = { ...BASE, borde: { dir: DIR_BORDE, fuerza: 0.22, color: BORDE_FRIO, ancho: 1.6, mezcla: 0.45, contorno: 0 } };
export const CLAVE_BAJA_CALIDA: Iluminacion = { ...BASE, borde: { dir: DIR_BORDE, fuerza: 0.22, color: BORDE_CALIDO, ancho: 1.6, mezcla: 0.45, contorno: 0 } };

const esCalido = (mat: string | undefined) => {
  const m = mat ? MATERIALES[mat] : undefined;
  if (!m?.emite) return 0;
  const c = m.rampa[Math.floor(m.rampa.length / 2)];
  const r = parseInt(c.slice(1, 3), 16), b = parseInt(c.slice(5, 7), 16);
  return r > b + 40 ? 1 : -1;
};

/**
 * La clave baja que le toca a un personaje: el borde es cálido si lo que brilla en él es mayormente fuego, brasa o
 * lava (ojos de brasa, un arma de fuego, el demonio), y frío en el resto (luna sobre el campamento y la cripta).
 */
export function claveBaja(piezas: Pieza[]): Iluminacion {
  let calor = 0;
  for (const p of piezas) {
    if (p.k === 'masa') { for (const c of p.comps) calor += esCalido(c.mat ?? p.mat); }
    else calor += esCalido(p.mat);
  }
  return calor > 0 ? CLAVE_BAJA_CALIDA : CLAVE_BAJA_FRIA;
}
