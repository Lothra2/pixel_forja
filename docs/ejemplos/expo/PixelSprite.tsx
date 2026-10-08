/**
 * Sprite de PixelForja para React Native / Expo, sin librerías extra.
 * Usa la hoja exportada en 4x (Exportar > Hoja PNG + JSON > Escala 4x): así no hace falta escalar
 * en el teléfono, donde no siempre se puede apagar el suavizado.
 *
 *   import sheet from './assets/jugador_48_x4.json';
 *   <PixelSprite sheet={sheet} image={require('./assets/jugador_48_x4.png')} anim="walk_down" />
 */
import { useEffect, useRef, useState } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';

export interface PixelSheet {
  cell: [number, number];
  cols: number;
  anims: Record<string, { start: number; frames: number; fps: number; loop: boolean }>;
  meta: { size: { w: number; h: number } };
}

interface Props {
  sheet: PixelSheet;
  image: ImageSourcePropType;
  anim: string;
  /** se llama al terminar una animación que no repite (patada, salto) */
  onEnd?: () => void;
}

export function PixelSprite({ sheet, image, anim, onEnd }: Props) {
  const a = sheet.anims[anim];
  const [frame, setFrame] = useState(0);
  const ended = useRef(onEnd);
  ended.current = onEnd;

  useEffect(() => {
    setFrame(0);
    if (!a) return;
    const id = setInterval(() => setFrame((n) => (n + 1 < a.frames ? n + 1 : a.loop ? 0 : n)), 1000 / a.fps);
    return () => clearInterval(id);
  }, [anim, a]);

  useEffect(() => {
    if (a && !a.loop && frame === a.frames - 1) ended.current?.();
  }, [frame, a]);

  if (!a) return null;
  const [cw, ch] = sheet.cell;
  const idx = a.start + frame;
  const x = (idx % sheet.cols) * cw;
  const y = Math.floor(idx / sheet.cols) * ch;
  return (
    <View style={{ width: cw, height: ch, overflow: 'hidden' }}>
      <Image
        source={image}
        style={{ width: sheet.meta.size.w, height: sheet.meta.size.h, transform: [{ translateX: -x }, { translateY: -y }] }}
      />
    </View>
  );
}
