import { createRaster, blit, type Raster } from '../core/raster';
import { encodePng } from '../export/png';
import type { ExportFile } from '../export/bundle';
import { textoMascara } from '../ui/fonts';
import { bajadaPanels, nieveFrente, logoHielo, type CinePanel } from './bajada';
import { finPanels, logoFin } from './fin';
import { cineBajadaMusica, cineFinMusica, cineRugido } from '../audio/sintesis';

/**
 * Las cinemáticas del final al kit (encargo F13, partes 1 y 2), en el formato del intro: cada panel trae
 * `{ w, h, notas, capas: [{ nombre, archivo, cuadros, fps, paralaje, bucle?, por_heroina? }] }` y cada capa es una
 * tira de cuadros (ninguna pasa de 4096 px). Los logos van en grilla de 4 x 4 como `logo_fuego`.
 */

const png = (name: string, r: Raster): ExportFile => ({ name, bytes: encodePng(r), mime: 'image/png' });
const strip = (frames: Raster[]): Raster => {
  const w = frames[0].w, h = frames[0].h, out = createRaster(w * frames.length, h);
  frames.forEach((fr, i) => blit(out, fr, i * w, 0));
  return out;
};
const grilla = (frames: Raster[], C = 4): Raster => {
  const w = frames[0].w, h = frames[0].h, out = createRaster(w * C, h * Math.ceil(frames.length / C));
  frames.forEach((fr, i) => blit(out, fr, (i % C) * w, Math.floor(i / C) * h));
  return out;
};

function paneles(carpeta: string, lista: CinePanel[], files: ExportFile[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of lista) {
    out[p.id] = {
      w: p.w, h: p.h, notas: p.notas,
      capas: p.capas.map((c) => {
        const archivo = `${carpeta}/${p.id}_${c.nombre}.png`;
        files.push(png(archivo, strip(c.frames)));
        const por = c.por_heroina ? Object.fromEntries(Object.entries(c.por_heroina).map(([id, fr]) => { const a = `${carpeta}/${p.id}_${c.nombre}_${id}.png`; files.push(png(a, strip(fr))); return [id, a]; })) : undefined;
        return { nombre: c.nombre, archivo, cuadros: c.frames.length, fps: c.fps, paralaje: c.paralaje, ...(c.bucle === false ? { bucle: false } : {}), ...(por ? { por_heroina: por } : {}) };
      }),
    };
  }
  return out;
}

export interface Guion { panel: string; desde: number; hasta: number; subtitulo?: string; sonido?: { nombre: string; en: number }[] }

export const GUION_BAJADA: Guion[] = [
  { panel: 'bajada_puerta', desde: 0, hasta: 10, subtitulo: 'La Puerta Negra se abrió.', sonido: [{ nombre: 'puerta_negra', en: 0.5 }] },
  { panel: 'bajada_escalera', desde: 10, hasta: 20, subtitulo: 'Abajo, más abajo que todo.' },
  { panel: 'bajada_lago', desde: 20, hasta: 30, subtitulo: 'Donde el abismo se congeló.' },
  { panel: 'bajada_ladrona', desde: 30, hasta: 40, subtitulo: 'La última llama tenía dueño.' },
  { panel: 'bajada_diablo', desde: 40, hasta: 50.5, subtitulo: 'Y él despertó.', sonido: [{ nombre: 'latido', en: 41 }, { nombre: 'latido', en: 44 }] },
  { panel: 'bajada_titulo', desde: 50.5, hasta: 60, sonido: [{ nombre: 'cine_rugido', en: 50.5 }] },
];

export const GUION_FIN: Guion[] = [
  { panel: 'fin_cae', desde: 0, hasta: 12, subtitulo: 'Se apagó.' },
  { panel: 'fin_llama', desde: 12, hasta: 24, subtitulo: 'La última llama volvió a casa.' },
  { panel: 'fin_pisos', desde: 24, hasta: 36, subtitulo: 'Y la luz subió por todo el abismo.' },
  { panel: 'fin_amanecer', desde: 36, hasta: 54, subtitulo: 'Amaneció.' },
  { panel: 'fin_alas', desde: 54, hasta: 64, subtitulo: 'La Primera Luz te dio sus alas.', sonido: [{ nombre: 'celestial_despierta', en: 55 }] },
  { panel: 'fin_titulo', desde: 64, hasta: 72 },
];

const NOTAS_FORMATO = 'Paneles de 480 x 270 (la escalera y los pisos 480 x 540: la cámara se mueve de arriba a abajo, o de abajo a arriba en los pisos) para agrandar x2 o x3 entero, con las franjas negras y los subtítulos letra por letra del intro. Cada capa es una tira de cuadros; dibujar en el orden en que vienen, cada una corrida con su paralaje. `bucle: false` = pasar una vez y quedarse en el último cuadro. `por_heroina`: la misma capa para cada heroína, usar la del perfil (el `archivo` de la capa es la de Sophie). `guion`: cuándo va cada panel en la música (segundos), su subtítulo y los sonidos.';

/** La bajada al infierno: paneles, nieve, logo de hielo, audio y guion. Sin fuentes no hay logo. */
export function exportBajada(files: ExportFile[], bold?: ArrayBuffer): Record<string, unknown> {
  const out = paneles('cine', bajadaPanels(), files);
  const nv = nieveFrente();
  files.push(png('cine/nieve_frente.png', strip(nv)));
  out.nieve_frente = { archivo: 'cine/nieve_frente.png', w: 128, h: 128, cuadros: nv.length, fps: 10, loop: true, notas: 'Cruza delante de todo, como humo_grande, pero en bucle y pega por los cuatro lados: repetirla en mosaico sobre la pantalla (a lo mejor dos capas, una corrida y más rápida).' };
  if (bold) {
    const lh = logoHielo([textoMascara(bold, 'EL CORAZÓN', 6), textoMascara(bold, 'HELADO', 6)]);
    files.push(png('cine/logo_hielo.png', grilla(lh)));
    out.logo_hielo = { archivo: 'cine/logo_hielo.png', w: lh[0].w, h: lh[0].h, cuadros: lh.length, fps: 10, loop: true, bucle_desde: 12, columnas: 4, notas: 'Cuadro i en la columna i % 4, fila floor(i / 4). Se arma una vez: el hielo sube por las letras (0 a 7) y se rajan con grietas de brasa (8 a 11); después late en bucle del 12 al 15. Centrado sobre bajada_titulo, cae con el rugido.' };
  }
  out.audio = { musica: 'cine_bajada_musica', rugido: 'cine_rugido', latido: 'latido' };
  out.guion = GUION_BAJADA;
  out.notas = `${NOTAS_FORMATO} La bajada es lo más oscuro del juego (sin sangre y sin sustos de golpe: lo que da miedo aparece de a poco). Se salta con un toque y se ve una vez por perfil. La música (60 s) crece hasta el título: golpe y silencio corto a los 50.5 s, ahí cae el logo con el rugido.`;
  return out;
}

/** El cierre: paneles, logo de "Fin", audio y guion. */
export function exportFin(files: ExportFile[], bold?: ArrayBuffer): Record<string, unknown> {
  const out = paneles('cine', finPanels(), files);
  if (bold) {
    const lf = logoFin(textoMascara(bold, 'Fin', 8), textoMascara(bold, '¿o no?', 2));
    files.push(png('cine/logo_fin.png', grilla(lf)));
    out.logo_fin = { archivo: 'cine/logo_fin.png', w: lf[0].w, h: lf[0].h, cuadros: lf.length, fps: 10, loop: true, bucle_desde: 8, columnas: 4, notas: 'Cuadro i en la columna i % 4, fila floor(i / 4). "Fin" en oro con un brillo que lo recorre; en el cuadro 8 aparece abajo, chiquito, "¿o no?". Del 8 al 15 en bucle. Centrado sobre fin_titulo.' };
  }
  out.audio = { musica: 'cine_fin_musica' };
  out.guion = GUION_FIN;
  out.notas = `${NOTAS_FORMATO} El cierre va de terror a esperanza y termina en el amanecer. La música (72 s) es oscura hasta los 12 s, se abre en mayor con la llama y trae el tema del Bosque desde los 36 s. Después de fin_titulo: la pregunta del Ciclo 2 y los créditos LPC.`;
  return out;
}

/** El audio de las dos cinemáticas (nombre > muestras) */
export function audioCine(cuales: ('bajada' | 'fin')[]): Record<string, Float32Array> {
  const out: Record<string, Float32Array> = {};
  if (cuales.includes('bajada')) { out.cine_bajada_musica = cineBajadaMusica(); out.cine_rugido = cineRugido(); }
  if (cuales.includes('fin')) out.cine_fin_musica = cineFinMusica();
  return out;
}
