/**
 * Partes que se mueven solas (cola, taparrabo, campana, alas, cadenas): siguen al cuerpo con 1 o 2 cuadros de
 * retraso. Se calcula con lo que hizo la cadera en los cuadros anteriores: si el cuerpo baja, la tela sube un poco
 * y después cae; si avanza, la cola se queda atrás. En los ciclos se mira la vuelta anterior, así el bucle cierra.
 */
export interface Secondary {
  /** vaivén del taparrabo y la tela (-1 a 1, + hacia atrás) */
  flap: number;
  /** vaivén de la cola (-1 a 1) */
  tail: number;
  /** vaivén de lo que cuelga (campana, cadenas) en x y en y */
  hangX: number;
  hangY: number;
}

export interface Motion {
  /** cadera en cada cuadro (x adelante, y arriba) */
  x: number;
  y: number;
}

/**
 * Retraso de las partes secundarias para el cuadro f. `lag` en cuadros (1 o 2). La respuesta es la diferencia entre
 * dónde estaba el cuerpo hace `lag` cuadros y dónde está ahora, más un rebote suave.
 */
export function secondaryAt(m: Motion[], f: number, loop: boolean, lag = 2, gain = 0.12): Secondary {
  const n = m.length;
  const at = (k: number): Motion => {
    if (loop) return m[((k % n) + n) % n];
    return m[Math.max(0, Math.min(n - 1, k))];
  };
  const now = at(f), before = at(f - lag), older = at(f - lag - 1);
  const dx = now.x - before.x, dy = now.y - before.y;
  const ddx = (now.x - before.x) - (before.x - older.x);
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return {
    flap: clamp(dx * gain + ddx * gain * 0.5),
    tail: clamp(dx * gain * 1.2 - dy * gain * 0.6),
    hangX: clamp(dx * gain),
    hangY: clamp(dy * gain),
  };
}
