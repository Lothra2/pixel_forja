import { describe, it, expect } from 'vitest';
import { enPieza, pintarEscena, masa, hueso, type Pieza, type V3 } from '../gotico/render';
import { personaje } from '../gotico/cuerpo';
import { moverPiezas, giroEje } from '../gotico/cine3d';
import { MATERIALES } from '../gotico/materiales';
import { HEROES } from '../gotico/catalogo/personajes';

/**
 * El grano de los materiales del cuerpo va en el marco de cada pieza (Material.local): si el personaje entero se mueve o
 * gira, la textura sobre la pieza no cambia. Con el grano del mundo, sí.
 */
const tem = HEROES.find((h) => h.id === 'templario')!;
const piezas = () => personaje(tem.cuerpo, tem.niveles[2], 'so', 'caminar', 3);

/** Un punto de muestra en cada pieza (y en cada componente de las masas), con su golpe. */
function muestras(ps: Pieza[]): { g: { p: Pieza; ci?: number }; q: V3 }[] {
  const out: { g: { p: Pieza; ci?: number }; q: V3 }[] = [];
  for (const p of ps) {
    if (p.k === 'elip') out.push({ g: { p }, q: [p.c[0] + p.r[0] * 0.3, p.c[1], p.c[2] + 0.2] });
    else if (p.k === 'cono') out.push({ g: { p }, q: [p.o[0] + p.ez[0] * p.h * 0.5, p.o[1] + p.ez[1] * p.h * 0.5, p.o[2] + p.ez[2] * p.h * 0.5] });
    else if (p.k === 'conv') { const a = p.pts[0], b = p.pts[p.pts.length - 1]; out.push({ g: { p }, q: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] }); }
    else p.comps.forEach((c, ci) => out.push({ g: { p, ci }, q: c.f === 'hueso' ? [(c.a[0] + c.b[0]) / 2 + 0.3, (c.a[1] + c.b[1]) / 2, (c.a[2] + c.b[2]) / 2] : [c.c[0] + 0.3, c.c[1], c.c[2]] }));
  }
  return out;
}

describe('grano en el marco de la pieza', () => {
  it('el marco local no cambia si el personaje se traslada, gira sobre la vertical o se tumba (huesos que pasan por la vertical)', () => {
    const ps = piezas(), base = muestras(ps);
    const casos: [[V3, V3, V3], V3][] = [
      [giroEje([0, 0, 1], 0), [0.37, 0, -0.21]],
      [giroEje([0, 0, 1], Math.PI / 2), [1.3, -2.1, 0.4]],
      [giroEje([1, 0, 0], 1.3), [0, 0, 5]],
    ];
    for (const [R, t] of casos) {
      const movidas = moverPiezas(ps, R, [0, 0, 0], t), m = muestras(movidas);
      const P = (v: V3): V3 => [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2] + t[0], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2] + t[1], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2] + t[2]];
      let peor = 0;
      base.forEach((s, i) => {
        const a = enPieza(s.g, s.q), b = enPieza(m[i].g, P(s.q));
        peor = Math.max(peor, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
      });
      expect(peor).toBeLessThan(1e-6);
    }
  });

  it('un hueso que pasa por la vertical no da vuelta su marco (el marco gira con el hueso, no sale del mundo)', () => {
    // un muslo que se balancea de adelante atrás: hueso y punto de su superficie giran juntos alrededor del lateral (y)
    const local = (th: number, rx?: V3) => {
      const R = giroEje([0, 1, 0], th), [p] = moverPiezas([masa([hueso([0, 0, 0], [0, 0, 10], 2, 2, { mat: 'cu_placa', rx })], { mat: 'cu_placa', suave: 0.5 })], R);
      const q: V3 = [2, 0.5, 5], Q = R.map((f) => f[0] * q[0] + f[1] * q[1] + f[2] * q[2]) as V3;
      return enPieza({ p, ci: 0 }, Q);
    };
    const pegado = [-0.2, 0, 0.2].map((th) => local(th, [0, 1, 0]));
    for (const v of pegado) for (let k = 0; k < 3; k++) expect(Math.abs(v[k] - pegado[0][k])).toBeLessThan(1e-9);
    // el cuerpo arma todos sus huesos con su marco: ninguno queda librado a la vertical del mundo
    for (const p of piezas()) if (p.k === 'masa') for (const c of p.comps) if (c.f === 'hueso') expect(c.rx).toBeDefined();
  });

  it('la imagen trasladada (4 px en pantalla, alineada a la trama) es la misma con grano local y cambia con grano del mundo', () => {
    const ps = piezas(), movidas = moverPiezas(ps, giroEje([0, 0, 1], 0), [0, 0, 0], [4, 4, 0]);
    const W = 96, H = 110;
    const dif = () => {
      const a = pintarEscena({ piezas: ps, sinSombra: true, ss: 1 }, {}, { w: W, h: H, ax: 48, ay: 90 }).img;
      const b = pintarEscena({ piezas: movidas, sinSombra: true, ss: 1 }, {}, { w: W, h: H, ax: 48, ay: 86 }).img;
      let d = 0, n = 0;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        // solo el interior (los dos pintados y sus vecinos también), sin los bordes de la silueta
        if (![i, i - 4, i + 4, i - W * 4, i + W * 4].every((j) => a.data[j + 3] === 255 && b.data[j + 3] === 255)) continue;
        d += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]); n += 3;
      }
      return d / Math.max(1, n);
    };
    const local = dif();
    const cu = Object.keys(MATERIALES).filter((k) => k.startsWith('cu_') && MATERIALES[k].local);
    for (const k of cu) MATERIALES[k] = { ...MATERIALES[k], local: false };
    let mundo: number;
    try { mundo = dif(); } finally { for (const k of cu) MATERIALES[k] = { ...MATERIALES[k], local: true }; }
    console.log(`grano local: diferencia media ${local.toFixed(3)}/255, grano de mundo: ${mundo.toFixed(3)}/255`);
    expect(local).toBeLessThan(0.5);
    expect(mundo).toBeGreaterThan(local * 3);
  });
});
