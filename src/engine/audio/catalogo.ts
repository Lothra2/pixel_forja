import { SFX_NAMES, MUSIC_NAMES, renderSfx, renderMusic, type SfxName, type MusicName } from './sfx';
import { ambience, AMBIENCE_NAMES, type AmbienceName } from './ambience';
import { SFX_DEPORTE, MUSIC_DEPORTE } from './deporte';
import { SFX_MUNDOS, MUSIC_MUNDOS } from './mundos';

/**
 * Todos los sonidos del motor por sección, con el mismo nombre que se pide en el kit: los de GG Abyss y los de
 * deporte (marcha, đàn tranh, pelea, público, golpes...) y los de los mundos (un tema por mundo, el gallo, el tejo,
 * el đá cầu, el tatami). Cada uno sale igual siempre.
 */
const SFX_EXTRA: Record<string, () => Float32Array> = { ...SFX_DEPORTE, ...SFX_MUNDOS };
const MUSIC_EXTRA: Record<string, () => Float32Array> = { ...MUSIC_DEPORTE, ...MUSIC_MUNDOS };
export const SONIDOS = {
  sfx: [...SFX_NAMES, ...Object.keys(SFX_EXTRA)] as string[],
  musica: [...MUSIC_NAMES, ...Object.keys(MUSIC_EXTRA)] as string[],
  ambientes: [...AMBIENCE_NAMES] as string[],
};
export type SoundSection = keyof typeof SONIDOS;
/** Las músicas que son un remate corto (no van en bucle). */
export const JINGLES = ['victoria', 'victoria_banda', 'derrota'];

export function renderSound(section: SoundSection, name: string): { samples: Float32Array; loop: boolean } {
  if (section === 'ambientes') return { samples: ambience(name as AmbienceName), loop: true };
  if (section === 'musica') {
    const samples = name in MUSIC_EXTRA ? MUSIC_EXTRA[name]() : renderMusic(name as MusicName);
    return { samples, loop: !JINGLES.includes(name) };
  }
  return { samples: name in SFX_EXTRA ? SFX_EXTRA[name]() : renderSfx(name as SfxName), loop: false };
}
