/**
 * API pública de los escenarios oblicuos. Es lo único que un juego tiene que importar: el resto de los archivos de
 * esta carpeta puede cambiar de forma sin aviso.
 *
 *   import { generarEscenario } from '<pixel_forja>/src/engine/world/oblique';
 *   const r = generarEscenario(JSON.parse(texto));          // r.ok, r.errores, r.avisos, r.archivos
 *   for (const a of r.archivos) escribir(`escenarios/${r.id}/${a.nombre}`, a.bytes);
 *
 * O desde la línea de comandos: `npm run escenario -- <layout.json> <carpeta> [--postales] [--ficha]`.
 */
import { validateLayout, type ObliqueLayout } from './layout';
import { renderEscena, altoVisible, type Escena } from './escena';
import { exportarEscena, type Archivo } from './exportar';
import { verificar, verificacionMarkdown, type Prueba } from './verify';
import { INCLINACION } from './inclinada';
import { hayEstilo, estiloDe, horasDe } from './ficha';
import { SKYLINES } from './skyline';
import { LEJOS_LUGARES } from './lugares';
import { deLado } from './layout';

export { INCLINACION } from './inclinada';

export { validateLayout, toScreen, depthOf, collisionOf, HORAS, PISOS, CLIMAS, PAISES, type ObliqueLayout } from './layout';
export { renderEscena, postal, type Escena, type Actor } from './escena';
export { exportarEscena, type Archivo } from './exportar';
export { verificar, verificacionMarkdown, camino, contraste, type Prueba } from './verify';
export { fichaArte, fichaMarkdown } from './ficha';

export interface OpcionesEscenario {
  /** Suma `postales/inicio.png`, `medio.png` y `final.png` (para aprobar; el juego no las carga). */
  postales?: boolean;
  /** Suma `ficha_arte.md` (para aprobar). */
  ficha?: boolean;
  /** Colores de contorno de los atletas, uno por equipo, para la prueba de legibilidad. */
  contornos?: string[];
  /** Semilla de los detalles al azar (casas, letreros, grietas). La misma semilla da los mismos pixeles. */
  semilla?: number;
  /**
   * La vista inclinada, la misma del piso de la pelea: px = x + inclinacion * y (lo del fondo queda a la izquierda).
   * 0.35 por defecto. 0 da el dibujo derecho de antes. Un layout de lado (`vista: "lado"`) va siempre en 0. Va en `escenario.json` para que el juego corra a los atletas igual.
   */
  inclinacion?: number;
}

export interface ResultadoEscenario {
  ok: boolean;
  id: string | null;
  errores: string[];
  avisos: string[];
  /**
   * El layout está bien pero su lugar todavía no tiene arte (el estilo del país o el fondo lejano llegan con su lote).
   * `ok` es false y `errores` dice por qué. El kit lo salta con aviso en vez de fallar.
   */
  pendiente?: boolean;
  /** Las 9 pruebas del pedido. Si una falla, `ok` es false y `archivos` va vacío. */
  pruebas: Prueba[];
  archivos: Archivo[];
  escena: Escena | null;
  layout: ObliqueLayout | null;
}

/** Los fondos lejanos que ya tienen arte. */
const LEJOS: string[] = [...SKYLINES, 'valle_de_aburra', 'avila_noche', 'rio_thu_bon_puente_japones', ...Object.keys(LEJOS_LUGARES)];

/** Valida el layout, pinta el escenario, corre las 9 pruebas y devuelve la carpeta `escenarios/<id>/`. */
export function generarEscenario(layout: unknown, o: OpcionesEscenario = {}): ResultadoEscenario {
  const v = validateLayout(layout);
  if (!v.layout) return { ok: false, id: null, errores: v.errores, avisos: v.avisos, pruebas: [], archivos: [], escena: null, layout: null };
  // un lugar que todavía no tiene arte: no se pinta con el de otro
  const lejos = v.layout.paralaje.lejos;
  const falta = !hayEstilo(v.layout) ? `el estilo "${estiloDe(v.layout)}" todavía no tiene arte${horasDe(v.layout) ? ` de ${v.layout.hora} (hoy pinta: ${horasDe(v.layout)!.join(', ')})` : ''}`
    : lejos && !LEJOS.includes(lejos) ? `el fondo lejano "${lejos}" todavía no tiene arte` : null;
  if (falta) return { ok: false, pendiente: true, id: v.layout.id, errores: [`${v.layout.id}: ${falta}. Llega con el lote de su escenario.`], avisos: v.avisos, pruebas: [], archivos: [], escena: null, layout: v.layout };
  // de lado (`vista: "lado"`) el dibujo va derecho, pida lo que pida la opción
  const E = renderEscena(v.layout, o.semilla ?? 42, deLado(v.layout) ? 0 : o.inclinacion ?? INCLINACION);
  const pruebas = verificar(E, layout, o.contornos);
  const ok = pruebas.every((p) => p.ok);
  const md = verificacionMarkdown(v.layout.id, pruebas);
  const archivos = ok ? exportarEscena(E, md, { postales: !!o.postales, ficha: !!o.ficha }) : [];
  const errores = ok ? [] : pruebas.filter((p) => !p.ok).map((p) => `Prueba ${p.n} (${p.nombre}): ${p.detalle}`);
  // un asta tan alta que la bandera se saldría de la pantalla se dibuja más corta: se avisa
  const avisos = [...v.avisos, ...v.layout.postes.filter((p) => p.tipo === 'asta_bandera' && altoVisible(v.layout!, p) < p.alto).map((p) => `postes: el asta de x ${p.x} pide alto ${p.alto}, pero parada donde está la bandera quedaría fuera de la pantalla. Se dibuja de ${altoVisible(v.layout!, p)}.`)];
  return { ok, id: v.layout.id, errores, avisos, pruebas, archivos, escena: E, layout: v.layout };
}
