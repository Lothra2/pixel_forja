import { SFX_NAMES, MUSIC_NAMES, renderSfx, renderMusic, type SfxName, type MusicName } from './sfx';
import { ambience, AMBIENCE_NAMES, type AmbienceName } from './ambience';
import { SFX_DEPORTE, MUSIC_DEPORTE } from './deporte';
import { SFX_MUNDOS, MUSIC_MUNDOS } from './mundos';
import { SFX_PELOTA, MUSIC_PELOTA } from './pelota';
import { MUSIC_ATLETISMO, SFX_ATLETISMO } from './atletismo';
import { MUSIC_ACORDES } from './acordes';

/**
 * Todos los sonidos del motor por sección, con el mismo nombre que se pide en el kit: los de GG Abyss y los de
 * deporte (marcha, đàn tranh, pelea, público, golpes...) y los de los mundos (un tema por mundo, el gallo, el tejo,
 * el đá cầu, el tatami), los de los mundos de pelota (Barranquilla, Margarita, Đà Lạt, la red, el balón, el aro y la
 * chapa) y los de las pruebas de atletismo y natación (Cartagena, el Eje Cafetero, Hạ Long y Apure, el chapuzón, la
 * brazada, la bocina de la salida y la garrocha), los ambientes de todos los mundos y el acorde de victoria de cada uno
 * de los 6 equipos (`acorde_<equipo>`). Cada uno sale igual siempre.
 */
const SFX_EXTRA: Record<string, () => Float32Array> = { ...SFX_DEPORTE, ...SFX_MUNDOS, ...SFX_PELOTA, ...SFX_ATLETISMO };
const MUSIC_EXTRA: Record<string, () => Float32Array> = { ...MUSIC_DEPORTE, ...MUSIC_MUNDOS, ...MUSIC_PELOTA, ...MUSIC_ATLETISMO, ...MUSIC_ACORDES };
export const SONIDOS = {
  sfx: [...SFX_NAMES, ...Object.keys(SFX_EXTRA)] as string[],
  musica: [...MUSIC_NAMES, ...Object.keys(MUSIC_EXTRA)] as string[],
  ambientes: [...AMBIENCE_NAMES] as string[],
};
export type SoundSection = keyof typeof SONIDOS;
/** Las músicas que son un remate corto (no van en bucle): las fanfarrias y el acorde de victoria de cada equipo. */
export const JINGLES = ['victoria', 'victoria_banda', 'derrota', ...Object.keys(MUSIC_ACORDES)];

export function renderSound(section: SoundSection, name: string): { samples: Float32Array; loop: boolean } {
  if (section === 'ambientes') return { samples: ambience(name as AmbienceName), loop: true };
  if (section === 'musica') {
    const samples = name in MUSIC_EXTRA ? MUSIC_EXTRA[name]() : renderMusic(name as MusicName);
    return { samples, loop: !JINGLES.includes(name) };
  }
  return { samples: name in SFX_EXTRA ? SFX_EXTRA[name]() : renderSfx(name as SfxName), loop: false };
}
