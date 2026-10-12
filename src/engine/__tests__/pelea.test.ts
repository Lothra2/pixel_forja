import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, runQA, viewsForRows, migrateFicha, type HumanFicha, type CellSize, type Raster } from '../index';
import { PELEA, TAUNTS_PROPIOS, VICTORIAS_PROPIAS, duenoDe } from '../anim/pelea';
import { motionOf8 } from '../export/motion';
import { PELEA_FX } from '../fx/pelea';
import { renderEffect } from '../fx/catalog';
import { COMIDAS, COMIDA_CELDA, COMIDA_PIVOTE, comidaSprite, buildComidaAtlas } from '../render/comida';
import { portrait, EXPRESSIONS } from '../kit/portraits';
import { coloresVs, vsFondo, vsLetras } from '../ui/vs';
import { publicoCuadro, publicoHoja, PUBLICO_ESTADOS } from '../render/publico';
import { ROOT } from './helpers';

const IDS = ['rick', 'steph', 'sophie', 'alana', 'kenji', 'ryu', 'goro', 'tetsu'];
const FICHAS = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const ficha = (id: string) => ({ ...(migrateFicha(JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'))) as HumanFicha), movementProfile: 'premium' as const });
const cellOf = (id: string): CellSize => (id === 'goro' ? 64 : 48);
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const opacos = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i]) n++; return n; };
const igual = (a: Raster, b: Raster) => a.w === b.w && a.h === b.h && a.data.every((v, i) => v === b.data[i]);
/** las de cada atleta: las comunes y su burla y su victoria */
const suyas = (id: string) => PELEA.filter((a) => (duenoDe(a.name, IDS) ?? id) === id);

describe('la pelea (lote P1): animaciones', () => {
  it('están todas las del pedido, con la burla y la victoria propias de los 8', () => {
    const names = PELEA.map((a) => a.name);
    for (const n of ['stomp', 'grab_throw', 'knee_hit_react', 'back_elbow', 'dash', 'dash_back', 'headbutt', 'eat', 'edge_teeter', 'fall_off']) expect(names).toContain(n);
    for (const id of IDS) {
      expect(names).toContain(`taunt_${id}`);
      expect(names).toContain(`victory_${id}`);
      expect(TAUNTS_PROPIOS.some((a) => a.name === `taunt_${id}`)).toBe(true);
      expect(VICTORIAS_PROPIAS.some((a) => a.name === `victory_${id}`)).toBe(true);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it('los cuadros que pide el pedido: dash y headbutt de 6, eat de 8', () => {
    const f = ficha('rick');
    const n = (a: string) => renderClip(f, 48, a, 'side').frames.length;
    expect(n('dash')).toBe(6);
    expect(n('dash_back')).toBe(6);
    expect(n('headbutt')).toBe(6);
    expect(n('eat')).toBe(8);
  });

  it('duenoDe dice de quién es una animación propia, y de nadie si es común', () => {
    expect(duenoDe('taunt_goro', IDS)).toBe('goro');
    expect(duenoDe('victory_alana', IDS)).toBe('alana');
    expect(duenoDe('stomp', IDS)).toBeNull();
    expect(duenoDe('taunt', IDS)).toBeNull();
    // un id que no está en el kit: no se filtra
    expect(duenoDe('taunt_pedro', IDS)).toBeNull();
  });

  it('las 8 pasan el control de calidad en las 5 filas del juego', () => {
    const bad: string[] = [];
    for (const id of IDS) {
      const f = ficha(id);
      for (const a of suyas(id)) for (const v of viewsForRows(FIVE)) {
        const c = renderClip(f, cellOf(id), a.name, v, { props: true });
        const qa = runQA(f, c);
        if (!qa.ok) bad.push(`${id} ${a.name} ${v}: ${qa.items.filter((i) => i.severity !== 'ok').map((i) => `${i.check} ${i.value} ${i.where ?? ''}`).join(', ')}`);
        if (c.frames.some((fr) => opacos(fr) < 60)) bad.push(`${id} ${a.name} ${v}: un cuadro vacío`);
      }
    }
    expect(bad).toEqual([]);
  }, 900_000);

  it('cada cuadro se mueve: ningún clip repite el mismo dibujo en todos sus cuadros', () => {
    const quietos: string[] = [];
    for (const id of ['sophie', 'alana', 'goro']) {
      const f = ficha(id);
      for (const a of suyas(id)) {
        const c = renderClip(f, cellOf(id), a.name, 'side');
        if (c.frames.every((fr) => igual(fr, c.frames[0]))) quietos.push(`${id} ${a.name}`);
      }
    }
    expect(quietos).toEqual([]);
  }, 300_000);

  it('el impacto cae en el pie (stomp), el codo (back_elbow), la frente (headbutt) y la mano (eat)', () => {
    for (const id of ['sophie', 'goro']) {
      const f = ficha(id), cell = cellOf(id);
      const punto = (a: string) => {
        const clips = viewsForRows(FIVE).map((v) => renderClip(f, cell, a, v));
        const ev = motionOf8(clips).eventos!.find((e) => e.tipo === 'impacto')!;
        expect(ev.punto, `${id} ${a}`).toHaveLength(FIVE.length);
        return { ev, side: clips.find((c) => c.view === 'side')! };
      };
      for (const [a, joint] of [['stomp', 'footNear'], ['back_elbow', 'elbowNear'], ['headbutt', 'frente'], ['eat', 'handNear']] as const) {
        const { ev, side } = punto(a);
        const j = side.joints![ev.cuadro][joint];
        const fila = viewsForRows(FIVE).indexOf('side');
        expect(ev.punto![fila], `${id} ${a}`).toEqual([Math.round(j[0] - cell / 2), Math.round(j[1] - (cell - 2))]);
      }
      // la frente queda arriba y el pie del pisotón abajo
      expect(punto('headbutt').ev.punto![0][1]).toBeLessThan(-cell * 0.45);
      expect(punto('stomp').ev.punto![0][1]).toBeGreaterThan(-cell * 0.2);
    }
  }, 300_000);
});

describe('la pelea (lote P1): efectos', () => {
  it('onomatopeyas de 6 cuadros, ko_grande de pantalla de 12, bloqueo y agarre', () => {
    const ids = PELEA_FX.map((d) => d.id);
    expect(ids).toEqual(['onomatopeya_pow', 'onomatopeya_paf', 'onomatopeya_crack', 'onomatopeya_nam', 'ko_grande', 'bloqueo', 'agarre']);
    for (const d of PELEA_FX) {
      const r = renderEffect(d, [640, 360]);
      expect(r.frames, d.id).toHaveLength(d.cuadros);
      if (d.base === 'onomatopeya') expect(d.cuadros).toBe(6);
      // ningún cuadro vacío y todos distintos del anterior (el efecto se mueve)
      r.frames.forEach((fr, i) => {
        expect(opacos(fr), `${d.id} ${i}`).toBeGreaterThan(10);
        if (i) expect(igual(fr, r.frames[i - 1]), `${d.id} ${i}`).toBe(false);
      });
    }
    const ko = PELEA_FX.find((d) => d.id === 'ko_grande')!;
    expect(ko).toMatchObject({ w: 640, h: 360, cuadros: 12, pantalla: true });
  });
});

describe('la pelea (lote P1): comida, retratos, VS y público', () => {
  it('la comida: 5, legibles a 16 px, con sombra en el pivote y humito de 4 cuadros', () => {
    const quietas = COMIDAS.map((id) => comidaSprite(id, 0));
    quietas.forEach((r, i) => {
      expect([r.w, r.h]).toEqual([COMIDA_CELDA, COMIDA_CELDA]);
      expect(opacos(r), COMIDAS[i]).toBeGreaterThan(60);
      // la sombra: medio transparente en la fila del pivote
      const [px, py] = COMIDA_PIVOTE;
      const semi = [...Array(COMIDA_CELDA).keys()].some((x) => { const a = r.data[(py * r.w + x) * 4 + 3]; return a > 0 && a < 255; });
      expect(semi || r.data[(py * r.w + px) * 4 + 3] === 255, COMIDAS[i]).toBe(true);
    });
    // todas distintas, y el humito cambia en cada cuadro
    for (let i = 0; i < quietas.length; i++) for (let j = i + 1; j < quietas.length; j++) expect(igual(quietas[i], quietas[j])).toBe(false);
    for (const id of COMIDAS) for (let k = 1; k <= 4; k++) expect(igual(comidaSprite(id, k), comidaSprite(id, k === 4 ? 1 : k + 1)), `${id} ${k}`).toBe(false);
    const { objetos, json } = buildComidaAtlas();
    expect(Object.keys(json.frames)).toHaveLength(COMIDAS.length * 5);
    for (const id of COMIDAS) expect(objetos[id]).toMatchObject({ peso: 'comida', anims: { quieto: 1, humito: 4 } });
    expect(objetos.arepa.cura).toBe(3);
  });

  it('el retrato burla (grande_burla) de los 8 es distinto del enojo y del neutral', () => {
    expect(EXPRESSIONS).toContain('burla');
    for (const id of IDS) {
      const f = ficha(id);
      const b = portrait(f, 'burla', 'grande');
      expect([b.w, b.h]).toEqual([96, 96]);
      expect(igual(b, portrait(f, 'enojo', 'grande')), id).toBe(false);
      expect(igual(b, portrait(f, 'neutral', 'grande')), id).toBe(false);
    }
  });

  it('el VS: la Familia GG sale azul y el Instituto rojo, del tamaño de la pantalla', () => {
    expect(coloresVs(['#2a5bd7', '#f2c230'], ['#353c58', '#d42a2a'])).toEqual(['#2a5bd7', '#d42a2a']);
    // dos equipos del mismo tono: el de la derecha usa otro color suyo
    expect(coloresVs(['#d23c3c'], ['#c8302a', '#f2c230'])[1]).toBe('#f2c230');
    const r = vsFondo('#2a5bd7', '#d42a2a');
    expect([r.w, r.h]).toEqual([640, 360]);
    expect(opacos(r)).toBe(640 * 360);
    // izquierda azul, derecha roja
    const px = (x: number, y: number) => [...r.data.slice((y * r.w + x) * 4, (y * r.w + x) * 4 + 3)];
    const [lr, , lb] = px(60, 200), [rr, , rb] = px(580, 200);
    expect(lb).toBeGreaterThan(lr);
    expect(rr).toBeGreaterThan(rb);
    const v = vsLetras();
    expect(opacos(v)).toBeGreaterThan(v.w * v.h * 0.3);
  });

  it('el público: 3 estados de 4 cuadros que se mueven, y de noche más oscuro', () => {
    const h = publicoHoja({ ancho: 160 });
    expect([h.png.w, h.png.h]).toEqual([160 * 4, 40 * 3]);
    expect(h.estados).toEqual({ quieto: 0, celebra: 1, abuchea: 2 });
    // la hoja tiene a la gente (también sin pasar ancho ni gente, como la pide el kit)
    for (const o of [{ ancho: 160 }, { ancho: undefined, gente: undefined }]) {
      const hh = publicoHoja(o);
      expect(opacos(hh.png), JSON.stringify(o)).toBeGreaterThan(hh.png.w * hh.png.h * 0.2);
    }
    for (const e of PUBLICO_ESTADOS) {
      const cs = [0, 1, 2, 3].map((k) => publicoCuadro(e, k, { ancho: 160 }));
      expect(cs.some((c, i) => i && !igual(c, cs[0])), e).toBe(true);
    }
    expect(igual(publicoCuadro('quieto', 0, { ancho: 160 }), publicoCuadro('celebra', 0, { ancho: 160 }))).toBe(false);
    const luz = (r: Raster) => { let s = 0, n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3]) { s += r.data[i] + r.data[i + 1] + r.data[i + 2]; n++; } return s / n; };
    expect(luz(publicoCuadro('quieto', 0, { noche: true }))).toBeLessThan(luz(publicoCuadro('quieto', 0)) * 0.8);
  });
});
