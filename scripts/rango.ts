/**
 * Muestra el rango del creador: cuerpos por edad y contextura, gorros y ropa, de frente y de lado.
 *   npx tsx scripts/rango.ts <salida.png>
 */
import { writeFileSync } from 'node:fs';
import {
  encodePng, createRaster, blit, fill, upscaleNearest, renderClip, fichaFromAvatar, defaultAvatar, bodyProportions, recolor, DEFAULT_LPC,
  type HumanFicha, type BodyType, type Raster,
} from '../src/engine/index.ts';

const [, , out] = process.argv;
type V = { body?: Partial<BodyType>; outfit?: Partial<HumanFicha['outfit']>; lpc?: Record<string, unknown>; colors?: Record<string, string>; skin?: string; hair?: string };
const variants: V[] = [
  { body: { age: 'nino' }, lpc: { head: 'female', hair: 'pigtails' }, colors: { top: '#e0466a' }, outfit: { bottom: 'skirt' } },
  { body: { age: 'nino' }, lpc: { head: 'female', hair: 'bunches' }, colors: { top: '#3d6fd6' } },
  { body: { age: 'adolescente' }, lpc: { hair: 'messy2' }, outfit: { pattern: 'rayas', pattern2: '#f2f2f2', number: '10' }, colors: { top: '#1f6fd0' } },
  { body: { age: 'adulto', shape: 'curvas' }, lpc: { head: 'female', hair: 'long', glasses: 'round' }, outfit: { collar: 'v' }, colors: { top: '#2f9b5b', bottom: '#2f3440' } },
  { body: { age: 'adulto' }, lpc: { hair: 'parted2', beard: 'medium', glasses: 'secretary' }, outfit: { collar: 'polo', shoes: 'tenis' }, colors: { top: '#a52233', bottom: '#aab0c2' } },
  { body: { build: 'robusto' }, lpc: { hair: 'buzzcut', beard: 'basic', hat: 'leather_cap' }, outfit: { jacket: '#3b3f4a', bottom: 'pants' }, colors: { top: '#e8e8e8', bottom: '#2c3e66' } },
  { body: { build: 'delgado' }, lpc: { hair: 'spiked', hat: null }, outfit: { pattern: 'banda', pattern2: '#e8c33a', shoes: 'guayos', socks: 'knee' }, colors: { top: '#d23c3c' } },
  { body: { age: 'mayor' }, lpc: { head: 'male_elderly', hair: 'balding', mustache: 'walrus' }, outfit: { sleeves: 'long', bottom: 'pants', shoes: 'botas' }, colors: { top: '#7a5a3a', bottom: '#4a4a52', shoes: '#4a2f22' } },
  { body: { age: 'adulto' }, lpc: { hair: 'long_messy', beard: 'trimmed', hat: 'viking' }, outfit: { shoes: 'botas', bottom: 'pants' }, colors: { top: '#6b4a2a', bottom: '#3a2e22', shoes: '#3a2a20' } },
  { body: { age: 'adulto' }, lpc: { head: 'female', hair: 'ponytail', hat: 'wizard' }, outfit: { sleeves: 'long', bottom: 'skirt' }, colors: { top: '#5a3a9a', bottom: '#5a3a9a' } },
  { body: { age: 'adulto' }, lpc: { hair: 'afro' }, outfit: { pattern: 'mitades', pattern2: '#1d1d24', number: '7' }, colors: { top: '#f2f2f2' }, skin: '#8a5a3c', hair: '#1d1916' },
  { body: { age: 'nino', build: 'robusto' }, lpc: { hair: 'curly_short' }, outfit: { pattern: 'cuadros', pattern2: '#f2c94c', shoes: 'descalzo', socks: 'none' }, colors: { top: '#2f6fd6' } },
];
const tiles: Raster[] = [];
for (const v of variants) {
  const base = defaultAvatar();
  const av = { ...base, skin: v.skin ?? base.skin, hair: { ...base.hair, color: v.hair ?? '#3a2d26' }, beard: { ...base.beard, color: '#5a4a42' }, glasses: { ...base.glasses, color: '#c3cacf' }, lpc: { ...DEFAULT_LPC, ...v.lpc } as typeof DEFAULT_LPC, body: { age: 'adulto', build: 'medio', shape: 'recto', ...v.body } as BodyType };
  let f = fichaFromAvatar('x', av, v.outfit) as HumanFicha;
  f = { ...f, body: { ...f.body, proportions: bodyProportions('chibi', av.body!) } };
  for (const [slot, hex] of Object.entries(v.colors ?? {})) f = recolor(f, slot as never, hex) as HumanFicha;
  const t = createRaster(48 * 2 + 4, 48);
  fill(t, [196, 226, 160, 255]);
  blit(t, renderClip(f, 48, 'idle', 'front').frames[0], 0, 0);
  blit(t, renderClip(f, 48, 'walk', 'side').frames[1], 52, 0);
  tiles.push(t);
}
const cols = 4, Z = 4;
const sheet = createRaster(cols * (100 + 6), Math.ceil(tiles.length / cols) * 54);
fill(sheet, [255, 255, 255, 255]);
tiles.forEach((t, i) => blit(sheet, t, (i % cols) * 106, Math.floor(i / cols) * 54));
writeFileSync(out, encodePng(upscaleNearest(sheet, Z)));
console.log('listo', out);
