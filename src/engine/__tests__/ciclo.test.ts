import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { marcoCiclo, logoCiclo, MARCO_CICLO } from '../ui/ciclo';
import { renderLogo } from '../ui/fonts';

describe('el Ciclo 2 en la interfaz (F13, parte 4)', () => {
  it('marco_ciclo: del tamaño de su manifiesto, borde negro, oro en el bisel y piedra oscura adentro', () => {
    const r = marcoCiclo();
    expect([r.w, r.h]).toEqual([MARCO_CICLO.w, MARCO_CICLO.h]);
    const px = (x: number, y: number) => Array.from(r.data.subarray((y * r.w + x) * 4, (y * r.w + x) * 4 + 4));
    // las esquinas de afuera, transparentes; el borde, oscuro; el bisel, dorado (rojo y verde altos, azul bajo)
    expect(px(0, 0)[3]).toBe(0);
    expect(px(10, 0)[0]).toBeLessThan(40);
    const oro = px(10, 2);
    expect(oro[0]).toBeGreaterThan(180);
    expect(oro[2]).toBeLessThan(oro[0] - 60);
    const adentro = px(18, 12);
    expect(adentro[0] + adentro[1] + adentro[2]).toBeLessThan(150);
  });

  const fuente = 'node_modules/@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff';
  it.skipIf(!existsSync(fuente))('logo_ciclo: mismo tamaño y cuadros que el logo, y ABYSS pasa de violeta a oro', () => {
    const b = readFileSync(fuente);
    const logo = renderLogo(b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer);
    const oro = logoCiclo(logo);
    expect(oro).toHaveLength(logo.length);
    expect([oro[0].w, oro[0].h]).toEqual([logo[0].w, logo[0].h]);
    // en la línea de ABYSS (abajo) no queda ningún pixel opaco más azul que rojo
    let azules = 0, letras = 0;
    for (let y = 50; y < 96; y++) for (let x = 0; x < 288; x++) {
      const i = (y * 288 + x) * 4;
      if (oro[0].data[i + 3] < 255) continue;
      letras++;
      if (oro[0].data[i + 2] > oro[0].data[i] + 8) azules++;
    }
    expect(letras).toBeGreaterThan(500);
    expect(azules).toBe(0);
  });
});
