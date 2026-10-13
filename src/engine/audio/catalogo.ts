import { SFX_NAMES, MUSIC_NAMES, renderSfx, renderMusic, type SfxName, type MusicName } from './sfx';
import { ambience, AMBIENCE_NAMES, type AmbienceName } from './ambience';
import { SFX_DEPORTE, MUSIC_DEPORTE } from './deporte';

/**
 * Todos los sonidos del motor por sección, con el mismo nombre que se pide en el kit: los de GG Abyss y los de
 * deporte (marcha, đàn tranh, pelea, público, golpes...). Cada uno sale igual siempre.
 */
type DeporteSfx = keyof typeof SFX_DEPORTE;
type DeporteMusic = keyof typeof MUSIC_DEPORTE;
export const SONIDOS = {
  sfx: [...SFX_NAMES, ...(Object.keys(SFX_DEPORTE) as DeporteSfx[])] as string[],
  musica: [...MUSIC_NAMES, ...(Object.keys(MUSIC_DEPORTE) as DeporteMusic[])] as string[],
  ambientes: [...AMBIENCE_NAMES] as string[],
};
export type SoundSection = keyof typeof SONIDOS;
/** Las músicas que son un remate corto (no van en bucle). */
export const JINGLES = ['victoria', 'victoria_banda', 'derrota'];

export function renderSound(section: SoundSection, name: string): { samples: Float32Array; loop: boolean } {
  if (section === 'ambientes') return { samples: ambience(name as AmbienceName), loop: true };
  if (section === 'musica') {
    const samples = name in MUSIC_DEPORTE ? MUSIC_DEPORTE[name as DeporteMusic]() : renderMusic(name as MusicName);
    return { samples, loop: !JINGLES.includes(name) };
  }
  return { samples: name in SFX_DEPORTE ? SFX_DEPORTE[name as DeporteSfx]() : renderSfx(name as SfxName), loop: false };
}
