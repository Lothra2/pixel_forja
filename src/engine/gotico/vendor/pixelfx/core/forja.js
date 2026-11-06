// Agregado por la Forja (Réquiem de Ceniza): constantes de la vista isométrica para los efectos de piso.
// En pixelfx el piso se ve casi de perfil (un anillo en el piso es una elipse de 0.16 a 0.3 de alto por ancho);
// en el juego la cámara es isométrica 2:1, así que un círculo en el piso mide la mitad de alto que de ancho.

/** Proporción alto / ancho de un círculo apoyado en el piso (2:1). */
export const ISO = 0.5;

/** Punto de un círculo de radio r en el piso, al ángulo a (sin(a) < 0 es la mitad de atrás). */
export const enPiso = (a, r) => [Math.cos(a) * r, Math.sin(a) * r * ISO];
