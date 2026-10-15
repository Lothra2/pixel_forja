import { describe, it, expect } from 'vitest';
import type { BigMap } from '../world/bosqueMap';
import { TILE } from '../world/tiles';
import { bosqueMap } from '../world/bosqueMap';
import { catedralMap } from '../world/catedralMap';
import { fogTexture } from '../world/atmosphere';
import { FAUNA } from '../world/abyss/fauna';
import { repeticion } from '../world/abyss/piso';
import { PARTICULAS_ZONA, type InformeAbyss } from '../world/abyss/index';
import { MONUMENTO_MAX, MONUMENTO_MIN } from '../world/abyss/monumento';

/** Lo que el encargo abyss premium pide de cada mundo. */
export function verificarAbyss(m: BigMap & { abyss?: InformeAbyss }, mundo: string) {
  const a = m.abyss!;
  expect(a, 'informe abyss').toBeTruthy();
  // 1. el piso: mismo tamaño y alfa, sin repeticiones evidentes
  expect(a.mismoSuelo).toBe(true);
  expect([m.terrain.img.w, m.terrain.img.h]).toEqual([m.w * TILE, m.h * TILE]);
  expect(repeticion(m.terrain, 10, 3), 'dos cuadros de piso casi iguales').toBeGreaterThan(3);
  // 2. un monumento por zona, de 64 x 64 a 128 x 160, con sombra y sólido solo en la base
  expect(a.sinLugar, 'zonas sin monumento').toEqual([]);
  expect(new Set(a.monumentos.map((p) => p.zona))).toEqual(new Set(m.zones.map((z) => z.nombre)));
  const objs = new Map(m.objects.map((o) => [o.name, o]));
  for (const p of a.monumentos) {
    const o = objs.get(p.nombre)!;
    expect(o, p.nombre).toBeTruthy();
    expect(o.w, p.nombre).toBeGreaterThanOrEqual(MONUMENTO_MIN[0]); expect(o.h, p.nombre).toBeGreaterThanOrEqual(MONUMENTO_MIN[1]);
    expect(o.w, p.nombre).toBeLessThanOrEqual(MONUMENTO_MAX[0]); expect(o.h, p.nombre).toBeLessThanOrEqual(MONUMENTO_MAX[1]);
    expect(o.shadow, p.nombre).toBeTruthy();
    expect(o.solid![3], p.nombre).toBeLessThanOrEqual(12);
    expect(o.solids, p.nombre).toBeUndefined();
    expect(m.decos.filter((d) => d.sprite === p.nombre).length).toBe(1);
  }
  // la colisión solo cambió debajo de las bases (y solo a sólido)
  for (const k of a.solidosNuevos) {
    expect(k, 'un cuadro sólido se volvió caminable').toBeGreaterThanOrEqual(0);
    const tx = k % m.w, ty = Math.floor(k / m.w);
    const bajo = a.monumentos.some((p) => { const s = objs.get(p.nombre)!.solid!; return tx >= Math.floor((p.x + s[0]) / TILE) && tx <= Math.floor((p.x + s[0] + s[2] - 1) / TILE) && ty >= Math.floor((p.y + s[1]) / TILE) && ty <= Math.floor((p.y + s[1] + s[3] - 1) / TILE); });
    expect(bajo, `cuadro ${tx},${ty}`).toBe(true);
  }
  // caminable: todo cofre, fogata, portal, arena y zona que se alcanzaba desde la llegada se sigue alcanzando
  expect(a.alcance.antes.filter((x) => !a.alcance.despues.includes(x))).toEqual([]);
  for (const t of ['cofre', 'punto_guardado', 'portal_jefe', 'arena_jefe']) expect(a.alcance.despues.some((x) => x.startsWith(t)), t).toBe(true);
  // 3. vida: al menos 8 criaturas de las especies nuevas del mundo, con su comportamiento
  const especies = FAUNA[mundo]();
  expect(especies.length).toBeGreaterThanOrEqual(2);
  const nuevas = m.entities.filter((e) => e.tipo === 'criatura' && especies.some((s) => s.name === e.props?.especie));
  expect(nuevas.length).toBeGreaterThanOrEqual(8);
  for (const s of especies) {
    expect(Object.keys(s.anims).sort()).toEqual(['huir', 'quieto']);
    expect(s.comportamiento.huye).toBeGreaterThan(0); expect(s.comportamiento.corre).toBeGreaterThan(0); expect(typeof s.comportamiento.se_esconde).toBe('boolean');
  }
  // 4 y 5. cada zona con partículas conocidas, rayos y grado bien escritos
  for (const z of m.zones) {
    for (const p of String(z.props.particulas).split(',')) expect(PARTICULAS_ZONA as readonly string[], `${z.nombre}: ${p}`).toContain(p);
    const [ang, col, den] = String(z.props.rayos).split(',');
    expect(Math.abs(Number(ang)), z.nombre).toBeLessThanOrEqual(60); expect(col).toMatch(/^#[0-9a-f]{6}$/); expect(Number(den)).toBeGreaterThanOrEqual(0); expect(Number(den)).toBeLessThanOrEqual(1);
    const [so, lu, con, sat] = String(z.props.grado).split(',');
    expect(so).toMatch(/^#[0-9a-f]{6}$/); expect(lu).toMatch(/^#[0-9a-f]{6}$/);
    for (const v of [con, sat]) { expect(Number(v), z.nombre).toBeGreaterThanOrEqual(0.8); expect(Number(v), z.nombre).toBeLessThanOrEqual(1.3); }
  }
  // memoria del iPad: lo nuevo no pasa de 2 megapixeles por mundo
  expect(a.memoria.total).toBeLessThanOrEqual(2);
}

describe('abyss premium', () => {
  it('la niebla de jirones pega por los cuatro lados (sin costura cada 512)', () => {
    const f = fogTexture('jirones', 256), A = (x: number, y: number) => f.data[(((y + 256) % 256) * 256 + ((x + 256) % 256)) * 4 + 3];
    // el salto en el borde (255 -> 0) no es más grande que el salto medio entre dos columnas (o filas) vecinas
    let bx = 0, mx = 0, by = 0, my = 0;
    for (let k = 0; k < 256; k++) { bx += Math.abs(A(255, k) - A(0, k)); by += Math.abs(A(k, 255) - A(k, 0)); }
    for (let c = 0; c < 255; c++) for (let k = 0; k < 256; k++) { mx += Math.abs(A(c, k) - A(c + 1, k)); my += Math.abs(A(k, c) - A(k, c + 1)); }
    expect(bx).toBeLessThanOrEqual((mx / 255) * 2 + 32);
    expect(by).toBeLessThanOrEqual((my / 255) * 2 + 32);
  });

  it('Mundo 1, el Bosque GG', () => { verificarAbyss(bosqueMap(), 'mundo1'); }, 120000);
  it('Mundo 2, la Catedral de las Raíces', () => { verificarAbyss(catedralMap(), 'mundo2'); }, 120000);
});
