import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import type { Raster } from '../core/raster';
import * as H from '../gotico/hud';

/** Cuántos pixeles visibles tiene un raster. */
const visibles = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i] > 0) n++; return n; };
const firma = (r: Raster) => { let h = 2166136261; for (let i = 0; i < r.data.length; i++) h = Math.imul(h ^ r.data[i], 16777619); return h >>> 0; };
type Z = { id: string; tipo: string; x: number; y: number; w: number; h: number };
const pisan = (a: Z, b: Z) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function sinPisarse(zs: Z[]) {
  const malos: string[] = [];
  for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) if (pisan(zs[i], zs[j])) malos.push(`${zs[i].id} y ${zs[j].id}`);
  return malos;
}

describe('interfaz del taller gótico (hud)', () => {
  it('la barra de abajo mide 800 de ancho y no sale vacía', () => {
    const b = H.barraInferior();
    expect([b.w, b.h]).toEqual([800, H.BARRA.h]);
    expect(visibles(b)).toBeGreaterThan(800 * 64);
    const v = H.barraInferior({ vacia: true });
    expect(visibles(v)).toBeGreaterThan(800 * 60);
  });

  it('los orbes tienen 8 cuadros distintos, en los 4 tipos, y el nivel cambia el dibujo', () => {
    for (const t of H.TIPOS_ORBE) {
      const { frames, img } = H.orbeAnimado(t, 0.6);
      expect(frames).toHaveLength(8);
      expect(new Set(frames.map(firma)).size).toBe(8);
      expect(img.w).toBe(frames[0].w * 8);
      expect(visibles(frames[0])).toBeGreaterThan(Math.PI * H.RADIO_ORBE ** 2 * 0.9);
    }
    expect(firma(H.orbe('vida', 0.2))).not.toBe(firma(H.orbe('vida', 0.9)));
  });

  it('los paneles miden 320x432, en español y en inglés', () => {
    for (const [id, p] of Object.entries(H.PANELES)) for (const i of ['es', 'en'] as const) {
      const { img, zonas } = p(i);
      expect([img.w, img.h], id).toEqual([320, 432]);
      expect(visibles(img), id).toBe(320 * 432); // panel opaco de punta a punta
      expect(zonas.length, id).toBeGreaterThan(3);
      expect(sinPisarse(zonas), id).toEqual([]);
    }
    expect(firma(H.panelPersonaje('es').img)).not.toBe(firma(H.panelPersonaje('en').img));
    expect(H.panelInventario('es').zonas.filter((z) => z.tipo === 'casillero')).toHaveLength(50);
    expect(H.panelInventario('es').zonas.filter((z) => z.tipo === 'equipo')).toHaveLength(11);
    expect(H.panelHabilidades('es').zonas.filter((z) => z.tipo === 'habilidad')).toHaveLength(18);
  });

  it('30 íconos de habilidad de 48x48 en tres estados distintos', () => {
    expect(H.IDS_HABILIDADES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(H.IDS_HABILIDADES).size).toBe(H.IDS_HABILIDADES.length);
    const firmas = new Set<number>();
    for (const id of H.IDS_HABILIDADES) {
      const n = H.iconoHabilidad(id), e = H.iconoHabilidad(id, 'encima'), a = H.iconoHabilidad(id, 'apagado');
      for (const r of [n, e, a]) { expect([r.w, r.h]).toEqual([48, 48]); expect(visibles(r)).toBe(48 * 48); }
      expect(new Set([firma(n), firma(e), firma(a)]).size).toBe(3);
      firmas.add(firma(n));
      // apagado = gris
      let color = 0; for (let i = 0; i < a.data.length; i += 4) color += Math.abs(a.data[i] - a.data[i + 1]);
      expect(color / (48 * 48)).toBeLessThan(2);
    }
    expect(firmas.size).toBe(H.IDS_HABILIDADES.length);
  });

  it('las demás piezas salen con su tamaño y con algo dibujado', () => {
    const piezas: [string, Raster, number, number][] = [
      ['minimapa', H.marcoMinimapa(), 192, 144], ['brujula', H.brujula(), 56, 56], ['jefe', H.barraJefe('Jefe', 0.5), 420, 52],
      ['placa', H.placaMonstruo('Grimm', 'unico'), 160, 24], ['carga', H.pantallaCarga(), 800, 600], ['muerte', H.cartelMuerte('en'), 520, 110],
      ['dialogo', H.cuadroDialogo().img, 520, 150], ['menu', H.botonMenu('Salir', 'encima'), 244, 40], ['tooltip9', H.marcoTooltip9(), 21, 21],
      ['escudo', H.escudoGG(2), 54, 62], ['danio', H.muestrasDanio(), 360, 92],
    ];
    for (const [n, r, w, h] of piezas) { expect([r.w, r.h], n).toEqual([w, h]); expect(visibles(r), n).toBeGreaterThan(w * h * 0.04); }
    for (const c of H.cursores()) { expect([c.img.w, c.img.h]).toEqual([32, 32]); expect(visibles(c.img)).toBeGreaterThan(60); }
    expect(H.cursores().map((c) => c.id)).toEqual(['senalar', 'agarrar', 'atacar', 'hablar', 'no_se_puede']);
    const tt = H.tooltipsDeMuestra('es');
    expect(tt.map((t) => t.rareza)).toEqual(['normal', 'magico', 'raro', 'set', 'unico', 'artesanal', 'engarzado']);
    const { frames } = H.destelloNivel('en');
    expect(frames).toHaveLength(8);
    expect(new Set(frames.map(firma)).size).toBe(8);
    const estados = (['normal', 'encima', 'presionado'] as const).map((e) => firma(H.botonMenu('Opciones', e)));
    expect(new Set(estados).size).toBe(3);
  });

  it('la pantalla de muestra mide 800x600 y la cubre toda', () => {
    const d = H.pintarPantallaDemo();
    expect([d.w, d.h]).toEqual([800, 600]);
    expect(visibles(d)).toBe(800 * 600);
  });

  it('hud.json cubre todas las zonas dentro de 800x600 sin que se pisen los botones', () => {
    const j = H.hudJson() as { barra: { zonas: Z[] }; paneles: Record<string, { zonas: Z[] }>; dialogo: { zonas: Z[] } };
    const grupos: [string, Z[]][] = [['barra', j.barra.zonas], ['dialogo', j.dialogo.zonas], ...Object.entries(j.paneles).map(([k, p]) => [k, p.zonas] as [string, Z[]])];
    for (const [g, zs] of grupos) {
      for (const z of zs) {
        expect(z.x >= 0 && z.y >= 0 && z.x + z.w <= 800 && z.y + z.h <= 600, `${g}/${z.id}`).toBe(true);
        expect(z.w > 0 && z.h > 0).toBe(true);
      }
      expect(new Set(zs.map((z) => z.id)).size, g).toBe(zs.length);
      expect(sinPisarse(zs), g).toEqual([]);
    }
    const ids = j.barra.zonas.map((z) => z.id);
    for (const id of ['orbe_vida', 'orbe_mana', 'habilidad_izq', 'habilidad_der', 'barra_aguante', 'barra_experiencia', 'caminar_correr', 'boton_personaje', 'boton_inventario', 'boton_habilidades', 'boton_mapa', 'boton_menu', 'cinturon_1', 'cinturon_4', 'atajo_f1']) expect(ids).toContain(id);
    // la barra y los paneles no se pisan entre sí (los paneles de un mismo lado se abren de a uno)
    for (const p of Object.values(j.paneles)) for (const a of p.zonas) for (const b of j.barra.zonas) expect(pisan(a, b)).toBe(false);
  });

  it('el paquete es un zip (empieza con PK) con hud.json, orbes en tiras y los íconos', () => {
    const z = H.paqueteHud();
    expect(String.fromCharCode(z[0], z[1])).toBe('PK');
    const files = unzipSync(z);
    expect(files['hud.json']).toBeDefined();
    expect(files['orbes/vida_50.png']).toBeDefined();
    expect(files['habilidades/meteoro_apagado.png']).toBeDefined();
    expect(files['paneles/inventario_en.png']).toBeDefined();
    const j = JSON.parse(new TextDecoder().decode(files['hud.json']));
    expect(j.pantalla).toEqual({ w: 800, h: 600 });
    for (const k of Object.keys(files)) if (k.endsWith('.png')) expect([files[k][1], files[k][2], files[k][3]]).toEqual([80, 78, 71]);
  }, 120000);
});
