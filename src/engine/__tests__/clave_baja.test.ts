import { describe, it, expect } from 'vitest';
import { pintarEscena } from '../gotico/render';
import { personajeEscena } from '../gotico/cuerpo';
import { CLAVE_BAJA_CALIDA, CLAVE_BAJA_FRIA } from '../gotico/clave_baja';
import { objeto } from '../gotico/objeto';
import { HEROES } from '../gotico/catalogo/personajes';
import '../gotico/catalogo/bestias';

const lum = (d: Uint8ClampedArray, i: number) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
function mediana(img: { data: Uint8ClampedArray }) {
  const v: number[] = [];
  for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3] === 255) v.push(lum(img.data, i));
  v.sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
}

describe('clave baja de los personajes', () => {
  it('la escena del personaje trae su luz y el borde es cálido si lo que brilla es fuego', () => {
    const b = HEROES.find((h) => h.id === 'berserker')!, n = HEROES.find((h) => h.id === 'nigromante')!;
    expect(personajeEscena(n.cuerpo, n.niveles[0], 'so', 'quieto', 0).luz).toBe(CLAVE_BAJA_FRIA);
    // el hacha de fuego del berserker leyenda
    expect(personajeEscena(b.cuerpo, b.niveles[2], 'so', 'quieto', 0).luz).toBe(CLAVE_BAJA_CALIDA);
  });

  it('las bestias registradas como monstruos se arman con la clave baja', () => {
    const a = objeto('mon_lobo_sombrio_quieto').armar('so', 0, { r: () => 0.5, seed: 1 } as never);
    expect(Array.isArray(a)).toBe(false);
    expect((a as { luz?: unknown }).luz).toBeTruthy();
  });

  it('baja el mediano del personaje y deja intactos los ojos que brillan', () => {
    const t = HEROES.find((h) => h.id === 'templario')!;
    const e = personajeEscena(t.cuerpo, t.niveles[0], 'so', 'quieto', 0);
    const baja = pintarEscena({ ...e, sinSombra: true, ss: 1 }), antes = pintarEscena({ ...e, sinSombra: true, ss: 1, luz: undefined });
    expect(mediana(baja.img)).toBeLessThan(mediana(antes.img) * 0.8);
    const brasa = { ...t.cuerpo, ojos: 'cu_ojo_brasa' };
    const ojos = pintarEscena({ ...personajeEscena(brasa, t.niveles[0], 's', 'quieto', 0), sinSombra: true, ss: 1 });
    let max = 0;
    for (let i = 0; i < ojos.img.data.length; i += 4) if (ojos.img.data[i + 3] === 255) max = Math.max(max, lum(ojos.img.data, i));
    expect(max).toBeGreaterThan(150);
  });
});
