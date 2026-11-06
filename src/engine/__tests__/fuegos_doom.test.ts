import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodePng } from '../export/png';
import { fileURLToPath } from 'node:url';
import { REGISTRO } from '../gotico';
import * as D from '../gotico/fuego_doom';
import { MATS_LLAMA, VITRAL, medirLlama, escenaDe } from '../gotico/fuegos_mundo';
import { FUEGOS_DOOM, ESPECIALES, IDS_FUEGO_DOOM, fuegosDoomJson, opcionesDeSpec } from '../gotico/datos/fuegos_doom';
import { MEDIDAS_FUEGO } from '../gotico/datos/fuegos_doom_medidas';

const suma = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };

describe('fuegos de Doom del mundo', () => {
  it('el json para el juego está al día', () => {
    const ruta = fileURLToPath(new URL('../gotico/datos/fuegos_doom.json', import.meta.url));
    expect(JSON.parse(readFileSync(ruta, 'utf8'))).toEqual(JSON.parse(JSON.stringify(fuegosDoomJson())));
  });

  it('cubre los fuegos del catálogo: antorchas, braseros, piras, hogueras, fogatas, velas, faroles, calderos y la catedral', () => {
    const clases = new Set(Object.values(FUEGOS_DOOM).flat().map((f) => f.clase));
    for (const c of ['antorcha', 'brasero', 'pira', 'hoguera', 'fogata', 'vela', 'candelabro', 'farol', 'caldero', 'hogar', 'vitral', 'puerta'] as const) expect(clases.has(c), c).toBe(true);
    expect(IDS_FUEGO_DOOM.length).toBeGreaterThan(40);
    for (const id of ['cue_antorcha', 'mon_antorcha', 'inf_brasero', 'mon_brasero', 'inf2_pira', 'par_hoguera', 'camp_fogata', 'cri_candelabro', 'cem_farol', 'mue_caldero', 'abo_catedral_fachada']) expect(IDS_FUEGO_DOOM, id).toContain(id);
    for (const id of ['camp_fragua', 'inf2_caldero', 'inf2_columna_fuego']) expect(IDS_FUEGO_DOOM, id).not.toContain(id);
  });

  it('cada objeto tiene su gemelo sin llama (mismas variantes, un cuadro, sin piezas de llama ni vitral encendido)', () => {
    for (const id of IDS_FUEGO_DOOM) {
      const d = REGISTRO.find((x) => x.id === id), g = REGISTRO.find((x) => x.id === `${id}_sin_llama`);
      expect(d, id).toBeDefined();
      expect(g, `${id}_sin_llama`).toBeDefined();
      expect(g!.variantes, id).toEqual(d!.variantes);
      expect(g!.cuadros, id).toBe(1);
    }
    for (const k of Object.keys(FUEGOS_DOOM).filter((_, i) => i % 9 === 0)) {
      const [id, v] = k.split('|'), g = REGISTRO.find((x) => x.id === `${id}_sin_llama`)!;
      const ps = escenaDe(g, v, 0).piezas;
      expect(ps.some((p) => !p.resta && (MATS_LLAMA.has(p.mat) || p.mat === VITRAL)), k).toBe(false);
    }
  });

  it('cada fuego de la tabla tiene datos sanos y arde', () => {
    for (const [k, lista] of Object.entries(FUEGOS_DOOM)) {
      expect(lista.length, k).toBeGreaterThanOrEqual(1);
      for (const f of lista) {
        expect([2, 3], k).toContain(f.celda);
        expect(f.grilla[0] >= 4 && f.grilla[1] >= 5, k).toBe(true);
        expect(D.PALETAS[f.paleta], k).toBeDefined();
        expect(f.decay, k).toBeGreaterThan(1);
        expect(f.luz.radio, k).toBeGreaterThan(40);
        expect(f.luz.color, k).toMatch(/^#[0-9a-f]{6}$/);
        expect(Math.abs(f.boca[0]) < 200 && f.boca[1] > -450 && f.boca[1] < 40, k).toBe(true);
        if (f.forma.tipo === 'mascara') continue;
        const fu = D.crearFuego(opcionesDeSpec(f));
        D.pasos(fu, 10);
        expect(suma(fu.calor), k).toBeGreaterThan(0);
      }
    }
  });

  it('las medidas siguen al catálogo (se vuelven a medir dos objetos)', () => {
    for (const k of ['cue_antorcha|palo', 'inf_brasero|cuernos']) {
      const [id, v] = k.split('|'), m = medirLlama(id, v)!, t = MEDIDAS_FUEGO[k];
      expect(Math.abs(m.boca[0] - t.boca[0]) + Math.abs(m.boca[1] - t.boca[1]), k).toBeLessThanOrEqual(2);
      expect(Math.abs(m.alto - t.alto), k).toBeLessThanOrEqual(2);
    }
  }, 60_000);

  it('las máscaras de los vitrales están en el repo, del tamaño de su caja', () => {
    let n = 0;
    for (const lista of Object.values(FUEGOS_DOOM)) for (const f of lista) {
      if (f.forma.tipo !== 'mascara') continue;
      const r = decodePng(readFileSync(fileURLToPath(new URL(`../gotico/datos/${f.forma.archivo}`, import.meta.url))));
      expect([r.w, r.h], f.forma.archivo).toEqual([f.forma.caja[2], f.forma.caja[3]]);
      let a = 0; for (let i = 3; i < r.data.length; i += 4) a += r.data[i];
      expect(a, f.forma.archivo).toBeGreaterThan(1000);
      n++;
    }
    expect(n).toBe(6);
  });

  it('trae los fuegos que no son objetos', () => {
    for (const k of ['quemado', 'cadaver', 'suelo_ardiente', 'ozmaren', 'fuego_frio', 'arma_encantada']) {
      expect(ESPECIALES[k], k).toBeDefined();
      expect(ESPECIALES[k].notas.length, k).toBeGreaterThan(40);
    }
  });
});
