import { describe, it, expect } from 'vitest';
import { hexToLab } from '../color/oklab';
import { encodeGif } from '../export/gif';
import { RICK_LUCHADOR, TRAJES, rampa6, pintarLuchador, GUARDIA, ANIMS_PILOTO, pintarAnim, chispaGolpe, conPose, type AnimRender } from '../index';

const O = { w: 128, h: 136, ox: 48, oy: 130 };
const opacos = (r: { w: number; h: number; data: Uint8ClampedArray }) => {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, semi = 0;
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      const a = r.data[(y * r.w + x) * 4 + 3];
      if (a && a < 255) semi++;
      if (!a) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  return { x0, y0, x1, y1, semi };
};

describe('el luchador estilo SF2 (piloto con Rick)', () => {
  it('la rampa tiene 6 tonos distintos, de oscuro a claro', () => {
    for (const c of Object.values(RICK_LUCHADOR.colores)) {
      if (!c) continue;
      const r = rampa6(c);
      expect(new Set(r).size, c).toBe(6);
      const L = r.map((h) => hexToLab(h)[0]);
      for (let i = 1; i < 6; i++) expect(L[i], `${c} ${i}`).toBeGreaterThan(L[i - 1]);
    }
  });

  it('en guardia mide como Ryu en 384 x 224, con los pies en el piso, sin semitransparencias y con contorno oscuro', () => {
    const c = pintarLuchador(RICK_LUCHADOR, GUARDIA, O);
    const b = opacos(c.r);
    const alto = b.y1 - b.y0 + 1;
    expect(alto).toBeGreaterThanOrEqual(90);
    expect(alto).toBeLessThanOrEqual(104);
    expect(b.y1).toBe(O.oy);
    expect(b.semi).toBe(0);
    // el contorno de afuera: cada pixel opaco que toca el vacío es oscuro
    const lum = (i: number) => c.r.data[i] * 0.3 + c.r.data[i + 1] * 0.59 + c.r.data[i + 2] * 0.11;
    let borde = 0, oscuros = 0;
    for (let y = 1; y < O.h - 1; y++)
      for (let x = 1; x < O.w - 1; x++) {
        const i = (y * O.w + x) * 4;
        if (!c.r.data[i + 3]) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !c.r.data[((y + dy) * O.w + x + dx) * 4 + 3])) { borde++; if (lum(i) < 110) oscuros++; }
      }
    expect(oscuros / borde).toBeGreaterThan(0.9);
    // y es el mismo cada vez
    expect(Buffer.from(pintarLuchador(RICK_LUCHADOR, GUARDIA, O).r.data).equals(Buffer.from(c.r.data))).toBe(true);
  }, 60000);

  it('el traje alterno cambia el gi y no la cara', () => {
    const azul = { ...TRAJES.gi, colores: { ...TRAJES.gi.colores, torso: '#2a48a8', piernas: '#2a48a8' } };
    const a = pintarLuchador(RICK_LUCHADOR, GUARDIA, O), b = pintarLuchador(RICK_LUCHADOR, GUARDIA, { ...O, ropa: azul });
    let dif = 0, difCabeza = 0;
    for (let i = 0; i < a.grupos.length; i++) {
      if (a.r.data[i * 4] !== b.r.data[i * 4]) { dif++; if (a.grupos[i] === 'cabeza') difCabeza++; }
    }
    expect(dif).toBeGreaterThan(300);
    // solo puede cambiar alguna línea de adentro donde el cuello toca la tela
    expect(difCabeza).toBeLessThanOrEqual(4);
  }, 60000);

  it('las tres animaciones: tiempos de SF2, la caja que pega solo en los activos y delante, y los pies siempre en el piso', () => {
    const anims: Record<string, AnimRender> = Object.fromEntries(Object.entries(ANIMS_PILOTO).map(([k, f]) => [k, pintarAnim(RICK_LUCHADOR, f(), O)]));
    expect(anims.guardia.bucle).toBe(true);
    expect(anims.guardia.cuadros.length).toBeGreaterThanOrEqual(4);
    expect(new Set(anims.guardia.cuadros.map((r) => Buffer.from(r.data).toString('base64'))).size).toBe(anims.guardia.cuadros.length);
    const pf = anims['puño_fuerte'];
    expect(pf.tiempos).toEqual({ inicio: 5, activo: 4, recuperacion: 14 });
    pf.datos.forEach((d) => {
      expect(d.pega.length).toBe(d.fase === 'activo' ? 1 : 0);
      for (const z of ['cabeza', 'cuerpo', 'piernas']) expect(d.recibe.some((q) => q.zona === z), `${d.fase} ${z}`).toBe(true);
    });
    const activo = pf.datos.find((d) => d.fase === 'activo')!;
    const [hx, hy, hw] = activo.pega[0];
    const cuerpo = activo.recibe.find((z) => z.zona === 'cuerpo')!.caja;
    // pega bien adelante del cuerpo, a la altura de la cara
    expect(hx + hw).toBeGreaterThan(cuerpo[0] + cuerpo[2] + 20);
    expect(hy).toBeLessThan(-70);
    // el brazo que pega también recibe mientras está afuera
    expect(activo.recibe.some((z) => z.zona === 'brazo')).toBe(true);
    // la caja que pega cae sobre el puño pintado
    const r = pf.cuadros[pf.datos.indexOf(activo)];
    let enPuño = 0;
    for (let y = 0; y < activo.pega[0][3]; y++) for (let x = 0; x < hw; x++) if (r.data[((O.oy + hy + y) * O.w + O.ox + hx + x) * 4 + 3]) enPuño++;
    expect(enPuño).toBeGreaterThan(40);
    for (const a of Object.values(anims))
      a.cuadros.forEach((c, i) => { const b = opacos(c); expect(b.y1, `${a.nombre} ${i}`).toBe(O.oy); });
    // al recibir, la cabeza se va para atrás
    const cab = (d: AnimRender['datos'][number]) => d.recibe.find((z) => z.zona === 'cabeza')!.caja[0];
    expect(cab(anims.recibe_alto.datos[1])).toBeLessThan(cab(anims.guardia.datos[0]) - 3);
  }, 120000);

  it('los trajes por piezas: el gi abierto con cinturón y cintillo, la ropa de calle con botas, el casual sin accesorios', () => {
    const cuenta = (c: ReturnType<typeof pintarLuchador>, g: string) => c.grupos.filter((x) => x === g).length;
    const gi = pintarLuchador(RICK_LUCHADOR, GUARDIA, { ...O, ropa: TRAJES.gi });
    const calle = pintarLuchador(RICK_LUCHADOR, GUARDIA, { ...O, ropa: TRAJES.calle });
    const casual = pintarLuchador(RICK_LUCHADOR, GUARDIA, { ...O, ropa: TRAJES.casual });
    expect(cuenta(gi, 'cinto')).toBeGreaterThan(20);
    expect(cuenta(gi, 'cintillo')).toBeGreaterThan(20);
    expect(cuenta(calle, 'cintillo')).toBeGreaterThan(20);
    expect(cuenta(casual, 'cinto') + cuenta(casual, 'cintillo')).toBe(0);
    // el gi abierto en V: hay piel en el torso. El polo lo tapa entero
    const pielTorso = (c: ReturnType<typeof pintarLuchador>) => {
      let n = 0;
      const [r0, g0, b0] = [0xe2, 0xa7, 0x7c];
      for (let i = 0; i < c.grupos.length; i++) {
        if (c.grupos[i] !== 'torso') continue;
        const d = Math.abs(c.r.data[i * 4] - r0) + Math.abs(c.r.data[i * 4 + 1] - g0) + Math.abs(c.r.data[i * 4 + 2] - b0);
        if (d < 120 && c.r.data[i * 4 + 1] > c.r.data[i * 4 + 2]) n++;
      }
      return n;
    };
    expect(pielTorso(gi)).toBeGreaterThan(30);
    expect(pielTorso(gi)).toBeGreaterThan(pielTorso(casual) * 3);
    // las tres siluetas son distintas
    const firma = (c: ReturnType<typeof pintarLuchador>) => Buffer.from(c.r.data).toString('base64');
    expect(new Set([firma(gi), firma(calle), firma(casual)]).size).toBe(3);
    // el viento mueve las colas del cintillo
    const otro = pintarLuchador(RICK_LUCHADOR, { ...GUARDIA, viento: 2 }, { ...O, ropa: TRAJES.gi });
    let distinto = 0;
    for (let i = 0; i < gi.grupos.length; i++) if ((gi.grupos[i] === 'cintillo') !== (otro.grupos[i] === 'cintillo')) distinto++;
    expect(distinto).toBeGreaterThan(5);
  }, 60000);

  it('la victoria levanta el puño por encima de la cabeza', () => {
    const v = pintarAnim(RICK_LUCHADOR, ANIMS_PILOTO.victoria(), O);
    expect(v.cuadros.length).toBe(4);
    const d = v.datos[2];
    const cabeza = d.recibe.find((z) => z.zona === 'cabeza')!.caja;
    expect(d.puño.cerca[1]).toBeLessThan(cabeza[1]);
  }, 60000);

  it('conPose cambia solo lo que se dice', () => {
    const p = conPose(GUARDIA, { cerca: { brazo: { mano: [1, 2, 3] } } });
    expect(p.cerca.brazo.mano).toEqual([1, 2, 3]);
    expect(p.cerca.brazo.codo).toEqual(GUARDIA.cerca.brazo.codo);
    expect(p.lejos).toEqual(GUARDIA.lejos);
    expect(GUARDIA.cerca.brazo.mano).not.toEqual([1, 2, 3]);
  });

  it('la chispa del golpe: 4 cuadros de 48 centrados, que crecen y se apagan', () => {
    const ch = chispaGolpe();
    expect(ch.map((r) => [r.w, r.h])).toEqual([[48, 48], [48, 48], [48, 48], [48, 48]]);
    const n = ch.map((r) => { let k = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i]) k++; return k; });
    expect(n[1]).toBeGreaterThan(n[0]);
    expect(n[3]).toBeLessThan(n[1]);
    expect(ch[0].data[(24 * 48 + 24) * 4 + 3]).toBe(255);
  });

  it('el GIF acepta la duración de cada cuadro', () => {
    const ch = chispaGolpe();
    const g = encodeGif(ch, 20, { scale: 1, delays: [5, 10, 15, 20] });
    const d: number[] = [];
    for (let i = 0; i < g.length - 5; i++) if (g[i] === 0x21 && g[i + 1] === 0xf9) d.push(g[i + 4] | (g[i + 5] << 8));
    expect(d).toEqual([5, 10, 15, 20]);
  });
});
