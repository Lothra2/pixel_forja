import { describe, it, expect } from 'vitest';
import { estilo, medidasDe } from '../forja2/estilo';
import { resolver } from '../forja2/esqueleto';
import { aEsqueleto } from '../forja2/pose';
import { PACKS, movimiento } from '../forja2/biblioteca';
import { validarMovimiento, curva, type Movimiento, type Cuadro } from '../forja2/movimiento';
import { muestrear, type Principio } from '../forja2/principios';

const LUCHADOR = estilo('luchador'), CABEZON = estilo('cabezon');
const mL = medidasDe(LUCHADOR, 160), mC = medidasDe(CABEZON, 48);
const pelea = PACKS.pelea;
const cuadros = (nombre: string, e = LUCHADOR, m = mL, sin: Principio[] = []) => {
  const { mov, poses } = movimiento('pelea', nombre);
  return muestrear(mov, poses, e, m, { sin });
};
const juntas = (q: Cuadro, m = mL) => resolver(m, aEsqueleto(m, q.pose, q.extras));
const suma = (cs: Cuadro[], fase?: string) => cs.filter((q) => !fase || q.fase === fase).reduce((a, q) => a + q.ticks, 0);

describe('Forja 2: el formato de movimiento', () => {
  it('todos los movimientos del pack de pelea son válidos, y el validador caza los errores', () => {
    for (const mov of Object.values(pelea.movimientos)) expect(validarMovimiento(mov, pelea.poses), mov.nombre).toEqual([]);
    const malo = { nombre: 'x', pack: 'pelea', bucle: false, base: 'nada', golpe: pelea.movimientos['puño_fuerte'].golpe,
      claves: [{ ticks: 0, fase: 'pegando' }, { ticks: 2, fase: 'inicio', impacto: { miembro: 'mano', lado: 'cerca' } }] } as unknown as Movimiento;
    const errs = validarMovimiento(malo, pelea.poses).join('\n');
    for (const r of [/pose base nada/, /ticks/, /fase "pegando"/, /impacto va en una clave activa/]) expect(errs).toMatch(r);
  });

  it('los ticks y las ventanas son las del contrato de pelea (el balance del juego no cambia)', () => {
    const esperado: Record<string, { total: number; activo: number }> = {
      guardia: { total: 32, activo: 0 }, 'puño_fuerte': { total: 22, activo: 6 }, patada_fuerte: { total: 26, activo: 6 }, recibe_alto: { total: 18, activo: 0 },
    };
    for (const [n, x] of Object.entries(esperado)) for (const [e, m] of [[LUCHADOR, mL], [CABEZON, mC]] as const) {
      const cs = cuadros(n, e, m);
      expect(suma(cs), `${n} ${e.id}`).toBe(x.total);
      expect(suma(cs, 'activo'), `${n} ${e.id}`).toBe(x.activo);
    }
  });

  it('las curvas: golpe arranca lento y llega rápido, freno al revés, todas van de 0 a 1', () => {
    for (const c of ['lineal', 'inout', 'golpe', 'freno'] as const) { expect(curva(c, 0)).toBe(0); expect(curva(c, 1)).toBe(1); }
    expect(curva('golpe', 0.5)).toBeLessThan(0.2);
    expect(curva('freno', 0.5)).toBeGreaterThan(0.8);
  });
});

describe('Forja 2: los principios los pone el motor', () => {
  it('anticipación: el recogido crece con el principio y más en el cabezón (exagera más)', () => {
    const giro = (cs: Cuadro[]) => cs.find((q) => q.clave === 1)!.pose.giroPecho;
    const base = 62; // la clave anterior
    const con = giro(cuadros('puño_fuerte')) - base, sin = giro(cuadros('puño_fuerte', LUCHADOR, mL, ['anticipacion'])) - base;
    expect(con).toBeGreaterThan(sin * 1.2);
    expect(giro(cuadros('puño_fuerte', CABEZON, mC)) - base).toBeGreaterThan(con);
  });

  it('impacto: un solo cuadro, con el puño agrandado, el brazo estirado y el evento', () => {
    for (const [e, m] of [[LUCHADOR, mL], [CABEZON, mC]] as const) {
      const cs = cuadros('puño_fuerte', e, m);
      const imp = cs.filter((q) => q.eventos.includes('impacto'));
      expect(imp, e.id).toHaveLength(1);
      expect(imp[0].extras.escala?.mano?.cerca, e.id).toBe(e.exagera.punoImpacto);
      const j = juntas(imp[0], m), j0 = resolver(m, aEsqueleto(m, imp[0].pose));
      const largo = (x: typeof j) => Math.hypot(...[0, 1, 2].map((i) => x.puño.cerca[i] - x.hombro.cerca[i]));
      expect(largo(j) / largo(j0), e.id).toBeGreaterThan(1 + e.exagera.estira * 0.8);
    }
  });

  it('sobrepaso: después del impacto el cuerpo sigue de largo, sin cambiar la ventana activa', () => {
    const cs = cuadros('puño_fuerte');
    const i = cs.findIndex((q) => q.impacto);
    expect(cs[i + 1].agregado).toBe('sobrepaso');
    expect(cs[i + 1].pose.inclina).toBeGreaterThan(cs[i].pose.inclina);
    expect(suma(cs, 'activo')).toBe(6);
    expect(cuadros('puño_fuerte', LUCHADOR, mL, ['sobrepaso']).some((q) => q.agregado)).toBe(false);
  });

  it('recuperación: dura al menos 1,5 veces el golpe; si el dato se queda corto, el motor la alarga', () => {
    for (const n of ['puño_fuerte', 'patada_fuerte']) { const cs = cuadros(n); expect(suma(cs, 'recuperacion'), n).toBeGreaterThanOrEqual(1.5 * suma(cs, 'activo')); }
    const { mov, poses } = movimiento('pelea', 'puño_fuerte');
    const corto: Movimiento = { ...mov, claves: mov.claves.map((c) => (c.fase === 'recuperacion' ? { ...c, ticks: 2 } : c)) };
    const cs = muestrear(corto, poses, LUCHADOR, mL);
    expect(suma(cs, 'recuperacion')).toBeGreaterThanOrEqual(9);
  });

  it('arcos: la mano entre dos claves no va en línea recta', () => {
    const cs = cuadros('puño_fuerte');
    const i = cs.findIndex((q) => q.agregado === 'sobrepaso');
    // la recuperación: de la clave 3 a la 4 con dos intermedios
    const k3 = cs.findIndex((q) => q.clave === 3);
    const pts = [k3, k3 + 1, k3 + 2, k3 + 3].map((k) => juntas(cs[k]).puño.cerca);
    const [a, , , b] = pts, mid = pts[1];
    const ab = [b[0] - a[0], b[1] - a[1]], am = [mid[0] - a[0], mid[1] - a[1]];
    const desvio = Math.abs(ab[0] * am[1] - ab[1] * am[0]) / Math.hypot(ab[0], ab[1]);
    expect(i).toBeGreaterThan(0);
    expect(desvio).toBeGreaterThan(0.5);
  });

  it('pies: el pie de apoyo no se mueve ni un pixel en ningún cuadro', () => {
    for (const [n, lado] of [['puño_fuerte', 'lejos'], ['patada_fuerte', 'lejos'], ['recibe_alto', 'lejos'], ['recibe_alto', 'cerca'], ['guardia', 'cerca']] as const)
      for (const [e, m] of [[LUCHADOR, mL], [CABEZON, mC]] as const) {
        const xs = cuadros(n, e, m).map((q) => juntas(q, m).tobillo[lado]);
        for (const p of xs) { expect(Math.abs(p[0] - xs[0][0]), `${n} ${lado} ${e.id}`).toBeLessThan(0.01); expect(Math.abs(p[1] - xs[0][1])).toBeLessThan(0.01); }
      }
  });

  it('cabeza: en los intermedios va adelantada al cuerpo', () => {
    const cs = cuadros('recibe_alto');
    const a = cs.find((q) => q.clave === 1)!, b = cs.find((q) => q.clave === 2)!, mid = cs[cs.indexOf(a) + 1];
    const avance = (v: number, va: number, vb: number) => (v - va) / (vb - va);
    expect(avance(mid.pose.cabeza.inclina, a.pose.cabeza.inclina, b.pose.cabeza.inclina)).toBeGreaterThan(avance(mid.pose.inclina, a.pose.inclina, b.pose.inclina) + 0.1);
  });

  it('respiración: la guardia sube y baja el pecho y vuelve a donde empezó', () => {
    const cs = cuadros('guardia');
    const r = cs.map((q) => q.extras.respira ?? 0);
    expect(Math.max(...r)).toBeCloseTo(LUCHADOR.exagera.respira * mL.H, 1);
    expect(Math.min(...r)).toBeLessThan(0);
    expect(cuadros('puño_fuerte').every((q) => !q.extras.respira)).toBe(true);
  });

  it('aplasta: el primer cuadro del golpe recibido baja el cuerpo', () => {
    const cs = cuadros('recibe_alto');
    expect(cs[0].extras.aplasta).toBe(LUCHADOR.exagera.aplasta);
    expect(juntas(cs[0]).pelvis[1]).toBeLessThan(resolver(mL, aEsqueleto(mL, cs[0].pose)).pelvis[1]);
  });
});

describe('Forja 2 sobre el chibi de hoy (piloto 0c)', () => {
  it('el adaptador deja clavados los pies apoyados y pone la chispa del impacto', async () => {
    const { pintarChibi } = await import('../forja2/chibi');
    const { familyFicha } = await import('../rpg/family');
    const f = familyFicha('rick');
    for (const n of ['puño_fuerte', 'patada_fuerte', 'recibe_alto']) {
      const cs = cuadros(n, CABEZON, medidasDe(CABEZON, 48));
      const r = pintarChibi(f, 48, cs);
      expect(r.frames, n).toHaveLength(cs.length);
      const lejos = r.joints.filter((_, i) => cs[i].pose.pies.lejos.alto <= 0.001).map((j) => Math.round(j!.footFar[0]));
      expect(Math.max(...lejos) - Math.min(...lejos), n).toBeLessThanOrEqual(1);
      const imp = cs.findIndex((q) => q.impacto);
      if (imp >= 0) expect(r.poses[imp].props?.some((p) => p.kind === 'spark'), n).toBe(true);
    }
  });
});
