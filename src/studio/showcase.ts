import {
  fichaFromAvatar, defaultAvatar, recolor, bodyProportions, DEFAULT_LPC,
  type Avatar, type BodyType, type ColorSlot, type HumanFicha, type LpcLook,
} from '../engine/index';

interface Demo {
  lpc: Partial<LpcLook>;
  skin: string;
  hair: string;
  beard?: string;
  glasses?: string;
  body?: BodyType;
  outfit?: Partial<HumanFicha['outfit']>;
  colors: Partial<Record<ColorSlot, string>>;
}

const DEMOS: Demo[] = [
  {
    lpc: { head: 'female', hair: 'long', brows: 'thin' },
    skin: '#e9b993', hair: '#4a2c1d',
    outfit: { sleeves: 'short', bottom: 'skirt', socks: 'none' },
    colors: { top: '#2a9d8f', bottom: '#264653', shoes: '#f4f1ea' },
  },
  {
    lpc: { head: 'male', hair: 'swept_back', brows: 'thick', nose: 'straight', beard: 'medium', glasses: 'secretary' },
    skin: '#d79d78', hair: '#3a2d26', beard: '#6e6259', glasses: '#c3cacf',
    outfit: { sleeves: 'short', bottom: 'shorts', socks: 'low', collar: 'polo' },
    colors: { top: '#a52233', bottom: '#aab0c2', shoes: '#e8e8ec' },
  },
  {
    lpc: { head: 'female', hair: 'pigtails', brows: 'thin' },
    skin: '#f0c7a6', hair: '#6b3f22',
    body: { age: 'nino', build: 'medio', shape: 'recto' },
    outfit: { sleeves: 'short', bottom: 'shorts', socks: 'low' },
    colors: { top: '#f4a261', bottom: '#5a7dff', shoes: '#ff4f6d' },
  },
];

/** Tres personajes de muestra para la vitrina de la portada (arte LPC, todo generado en el equipo). */
export function demoCast(): HumanFicha[] {
  return DEMOS.map((d, i) => {
    const base = defaultAvatar();
    const av: Avatar = {
      ...base,
      skin: d.skin,
      hair: { ...base.hair, color: d.hair },
      beard: { ...base.beard, color: d.beard ?? base.beard.color },
      glasses: { ...base.glasses, color: d.glasses ?? base.glasses.color },
      kit: 'lpc',
      lpc: { ...DEFAULT_LPC, ...d.lpc },
      body: d.body,
    };
    let f = fichaFromAvatar(`demo${i}`, av, d.outfit) as HumanFicha;
    if (d.body) f = { ...f, body: { ...f.body, proportions: bodyProportions(f.body.proportions.preset, d.body) } };
    for (const [slot, hex] of Object.entries(d.colors)) f = recolor(f, slot as ColorSlot, hex) as HumanFicha;
    return f;
  });
}
