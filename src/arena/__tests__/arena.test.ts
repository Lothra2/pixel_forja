import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Actor } from '../actor';
import { Kit, type KitManifest, type KitEvent } from '../kit';
import { DIR_WORLD, SQRT2, fromScreen, nearestDirection, screenIntentToWorld, toScreen } from '../iso';

const DIRS = ['down', 'down_left', 'left', 'up_left', 'up', 'up_right', 'right', 'down_right'];

/** Un kit de juguete con lo mínimo: un ciclo con avance y pasos, y un salto con desplazamiento y rumbo. */
function toyKit(): Kit {
  const m: KitManifest = {
    tipo: 'kit deportivo', generado_con: 'PixelForja', version: 1, celda: 48, pivote: [24, 46], direcciones: DIRS,
    atletas: {
      ana: {
        nombre: 'Ana', celda: 48, pivote: [24, 46],
        deportes: {
          atletismo: {
            idle: { archivo: 'i.png', cuadros: 4, fps: 6, loop: true },
            run: { archivo: 'r.png', cuadros: 8, fps: 14, loop: true, avance: 20, eventos: [{ tipo: 'paso', cuadro: 0, fase: 0, pie: 'cerca' }, { tipo: 'paso', cuadro: 4, fase: 0.5, pie: 'lejos' }] },
            long_jump: {
              archivo: 'l.png', cuadros: 4, fps: 10, loop: false, desplazamiento: [0, 4, 10, 12], elevacion: [0, 6, 6, 0],
              rumbo: ['down_right', 'down_left', 'left', 'up_left', 'up_right', 'up_right', 'right', 'down_right'],
              eventos: [{ tipo: 'despegue', cuadro: 1, fase: 0.25 }, { tipo: 'aterriza', cuadro: 3, fase: 0.75 }],
            },
          },
        },
      },
    },
  };
  return new Kit(m, { label: 'juguete', url: () => undefined });
}

function actor(onEvent: (e: KitEvent, anim: string) => void = () => {}) {
  const kit = toyKit();
  const a = new Actor(kit, 'ana', 'atletismo', { x: 0, y: 0 }, 'right', (_a, e, n) => onEvent(e, n));
  // las hojas no importan para la mecánica: basta con que existan
  for (const n of ['idle', 'run', 'long_jump']) a.sheets.set(n, {} as HTMLImageElement);
  return a;
}

describe('arena', () => {
  it('no usa el motor de PixelForja: vive solo del kit, como un juego', () => {
    const dir = join(__dirname, '..');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src, f).not.toMatch(/from ['"][^'"]*(engine|studio)\//);
    }
  });

  it('la isométrica va y vuelve, y las flechas caen en la dirección del kit', () => {
    const s = toScreen(12, -5), w = fromScreen(s.x, s.y);
    expect(w.x).toBeCloseTo(12); expect(w.y).toBeCloseTo(-5);
    expect(nearestDirection(screenIntentToWorld(1, 0))).toBe('right');
    expect(nearestDirection(screenIntentToWorld(0, 1))).toBe('down');
    expect(nearestDirection(screenIntentToWorld(1, 1))).toBe('down_right');
    expect(nearestDirection(screenIntentToWorld(-1, -1))).toBe('up_left');
    // a la derecha de la pantalla: un paso de mundo se ve √2 de ancho y nada de alto
    const r = toScreen(DIR_WORLD.right.x, DIR_WORLD.right.y);
    expect(r.x).toBeCloseTo(SQRT2); expect(r.y).toBeCloseTo(0);
  });

  it('el ciclo lo mueve la distancia: un avance completo es un ciclo completo, a cualquier velocidad', () => {
    for (const k of [0.5, 1, 1.6]) {
      const pasos: number[] = [];
      const a = actor((e) => { if (e.tipo === 'paso') pasos.push(e.cuadro); });
      a.loop('run');
      // avance 20 px de pantalla = 20/√2 de mundo por ciclo
      const per = 20 / SQRT2;
      const speed = a.nativeSpeed('run') * k;
      const T = per / speed;
      for (let i = 0; i < 100; i++) a.update(T / 100, { dir: DIR_WORLD.right, k });
      expect(Math.hypot(a.pos.x, a.pos.y)).toBeCloseTo(per, 5);
      expect(a.t).toBeCloseTo(8, 5);
      expect(a.rate).toBeCloseTo(k);
      // los dos pasos del ciclo, cada uno una vez
      expect(pasos).toEqual([4, 0]);
    }
  });

  it('el salto avanza su desplazamiento hacia el rumbo de la fila, con elevación y sus eventos', () => {
    const tipos: string[] = [];
    const a = actor((e) => tipos.push(e.tipo));
    a.facing = 'down';
    expect(a.play('long_jump')).toBe(true);
    let maxLift = 0;
    for (let i = 0; i < 60; i++) { a.update(1 / 60); maxLift = Math.max(maxLift, a.elevation()); }
    // de frente se dibuja en diagonal: avanza hacia abajo a la derecha (rumbo), 12 px de pantalla
    const d = 12 / SQRT2;
    expect(a.pos.x).toBeCloseTo(DIR_WORLD.down_right.x * d, 5);
    expect(a.pos.y).toBeCloseTo(DIR_WORLD.down_right.y * d, 5);
    expect(maxLift).toBe(6);
    expect(tipos).toEqual(['despegue', 'aterriza']);
    expect(a.busy).toBe(false);
  });
});
