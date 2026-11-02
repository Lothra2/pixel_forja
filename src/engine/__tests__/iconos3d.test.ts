import { describe, it, expect } from 'vitest';
import type { Raster } from '../core/raster';
import { iconoObjeto3D, iconoDeLoot, PIEZAS_3D, LINEAS, type Icono3D, type Linea } from '../gotico/iconos3d';
import { objetosDeMuestra } from '../gotico/hud';
import { allArmor, allMisc, allBases, findLoot, UNIQUE_LOOT } from '../loot/catalog';

const visibles = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i] > 0) n++; return n; };
/** Color medio de lo visible (para comparar líneas). */
const medio = (r: Raster): [number, number, number] => {
  let a = 0, s0 = 0, s1 = 0, s2 = 0;
  for (let i = 0; i < r.data.length; i += 4) { const k = r.data[i + 3] / 255; a += k; s0 += r.data[i] * k; s1 += r.data[i + 1] * k; s2 += r.data[i + 2] * k; }
  return [s0 / a, s1 / a, s2 / a];
};
/** Saturación del color medio (0 gris, 1 puro). */
const saturacion = (c: [number, number, number]) => (Math.max(...c) - Math.min(...c)) / Math.max(1, Math.max(...c));
const firma = (r: Raster) => { let h = 2166136261; for (let i = 0; i < r.data.length; i++) h = Math.imul(h ^ r.data[i], 16777619); return h >>> 0; };

describe('íconos 3D del inventario', () => {
  it('cada pieza en dos líneas sale con contenido y cabe en 58×58 y en 29×29', () => {
    const pares: [Linea, Linea][] = [['cuero', 'placas'], ['sagrado', 'oscuro'], ['tela', 'legendario'], ['malla', 'hueso'], ['tachonado', 'legendario']];
    PIEZAS_3D.forEach((p, i) => {
      for (const l of pares[i % pares.length]) for (const t of [58, 29]) {
        const r = iconoObjeto3D({ pieza: p, linea: l, nivel: 4 }, t, t);
        expect(r.w, `${p} ${l} ${t}`).toBeLessThanOrEqual(t);
        expect(r.h, `${p} ${l} ${t}`).toBeLessThanOrEqual(t);
        // llena su casilla: al menos un lado casi entero y una buena parte del área
        expect(Math.max(r.w, r.h), `${p} ${l} ${t}`).toBeGreaterThanOrEqual(t - 4);
        expect(visibles(r), `${p} ${l} ${t}`).toBeGreaterThan(t * t * 0.1);
      }
    });
  }, 240000);

  it('respeta rectángulos que no son cuadrados (casillas de 2×3 y 1×2)', () => {
    for (const [w, h] of [[55, 84], [26, 55], [84, 26]]) {
      const r = iconoObjeto3D({ pieza: 'pecho', linea: 'placas', nivel: 5 }, w, h);
      expect(r.w).toBeLessThanOrEqual(w);
      expect(r.h).toBeLessThanOrEqual(h);
      expect(visibles(r)).toBeGreaterThan(w * h * 0.12);
    }
  }, 60000);

  it('las líneas se ven distintas entre sí', () => {
    for (const p of ['botas', 'pecho', 'casco', 'guantes'] as const) {
      const cols = LINEAS.map((l) => medio(iconoObjeto3D({ pieza: p, linea: l, nivel: 3 }, 40, 40)));
      for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) {
        const d = Math.hypot(cols[i][0] - cols[j][0], cols[i][1] - cols[j][1], cols[i][2] - cols[j][2]);
        const firmasIguales = firma(iconoObjeto3D({ pieza: p, linea: LINEAS[i], nivel: 3 }, 40, 40)) === firma(iconoObjeto3D({ pieza: p, linea: LINEAS[j], nivel: 3 }, 40, 40));
        expect(firmasIguales, `${p}: ${LINEAS[i]} y ${LINEAS[j]}`).toBe(false);
        expect(d, `${p}: ${LINEAS[i]} y ${LINEAS[j]} (color medio)`).toBeGreaterThan(3);
      }
    }
  }, 120000);

  it('el nivel agrega adornos y lo legendario late con el cuadro', () => {
    const a = iconoObjeto3D({ pieza: 'botas', linea: 'cuero', nivel: 1 }, 48, 48), b = iconoObjeto3D({ pieza: 'botas', linea: 'cuero', nivel: 5 }, 48, 48);
    expect(firma(a)).not.toBe(firma(b));
    const f0 = iconoObjeto3D({ pieza: 'amuleto', linea: 'legendario', nivel: 5 }, 40, 40, 0), f4 = iconoObjeto3D({ pieza: 'amuleto', linea: 'legendario', nivel: 5 }, 40, 40, 2);
    expect(firma(f0)).not.toBe(firma(f4));
    // lo que no se anima no cambia con el cuadro (y sale de la caché)
    expect(iconoObjeto3D({ pieza: 'botas', linea: 'cuero', nivel: 1 }, 48, 48, 3)).toBe(a);
  }, 60000);

  it('iconoDeLoot cubre los objetos de muestra del inventario', () => {
    const m = objetosDeMuestra();
    for (const [id, o] of Object.entries(m.equipo)) {
      if (o.arma3d) continue;
      const d = iconoDeLoot(o.it);
      expect(d, id).not.toBeNull();
    }
    for (const o of m.bolsa) if (!o.arma3d) expect(iconoDeLoot(o.it), o.it.id).not.toBeNull();
    // casos concretos
    expect(iconoDeLoot(m.equipo.botas.it)).toMatchObject({ pieza: 'botas', linea: 'legendario' });
    expect(iconoDeLoot(m.equipo.casco.it)?.pieza).toBe('corona');
    expect(iconoDeLoot(m.equipo.anillo_izq.it)?.pieza).toBe('anillo');
    expect(iconoDeLoot(m.equipo.talisman.it)?.pieza).toBe('talisman');
    const pocion = m.bolsa.find((o) => o.it.id === 'pocion_mana')!;
    expect(iconoDeLoot(pocion.it)).toMatchObject({ pieza: 'pocion', variante: 'mana', nivel: 4 });
    expect(iconoDeLoot(m.bolsa.find((o) => o.it.id === 'rubi')!.it)).toMatchObject({ pieza: 'gema', variante: 'ruby', nivel: 4 });
  });

  it('iconoDeLoot da un ícono para toda armadura, joya, poción, gema, runa, consumible y escudo del catálogo', () => {
    for (const it of [...allArmor(), ...allMisc()]) expect(iconoDeLoot(it), it.id).not.toBeNull();
    for (const it of allBases()) {
      const d = iconoDeLoot(it);
      if (it.base.cat === 'weapon') expect(d).toBeNull();
      else if (it.base.cat === 'offhand') expect(d, it.id).not.toBeNull();
    }
    const tipos = new Set([...allArmor(), ...allMisc()].map((it) => (iconoDeLoot(it) as Icono3D).pieza));
    for (const p of ['casco', 'capucha', 'pecho', 'guantes', 'botas', 'cinturon', 'hombreras', 'grebas', 'anillo', 'amuleto', 'talisman', 'pocion', 'gema', 'runa', 'pergamino', 'llave', 'oro', 'libro']) expect(tipos.has(p as Icono3D['pieza']), p).toBe(true);
  });
  it('las joyas respetan el metal del diseño: el Sello del Liche es de plata aunque sea legendario', () => {
    const sello = findLoot('sello_del_liche')!;
    const d = iconoDeLoot(sello)!;
    expect(d).toMatchObject({ pieza: 'anillo', linea: 'legendario', variante: 'banda' });
    expect(d.metal?.toLowerCase()).toBe('#d3dbe6');
    const plata = medio(iconoObjeto3D(d, 48, 48)), oro = medio(iconoObjeto3D({ ...d, metal: '#e3ae3c' }, 48, 48));
    expect(saturacion(plata), 'la plata es casi gris').toBeLessThan(saturacion(oro) * 0.6);
    expect(plata[2], 'la plata no tira a amarillo').toBeGreaterThan(plata[0] * 0.8);
    // las joyas de oro siguen de oro
    for (const it of UNIQUE_LOOT.filter((i) => i.base.cat === 'jewel' && iconoDeLoot(i)?.pieza !== 'talisman')) {
      const dd = iconoDeLoot(it)!, hexMetal = ((it.design ?? {}) as { metal?: { hex?: string } }).metal?.hex;
      if (hexMetal) expect(dd.metal, it.id).toBe(hexMetal);
    }
  });

  it('las gemas talladas tienen facetas claras y oscuras y un brillo casi blanco', () => {
    for (const variante of ['ruby', 'sapphire', 'emerald', 'diamond']) {
      const r = iconoObjeto3D({ pieza: 'gema', nivel: 4, variante }, 48, 48);
      const lums: number[] = [];
      for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] === 255) lums.push(0.3 * r.data[i] + 0.59 * r.data[i + 1] + 0.11 * r.data[i + 2]);
      lums.sort((a, b) => a - b);
      const p10 = lums[Math.floor(lums.length * 0.1)], p90 = lums[Math.floor(lums.length * 0.9)];
      expect(p90 - p10, `${variante}: contraste entre facetas`).toBeGreaterThan(60);
      expect(lums[lums.length - 1], `${variante}: brillo especular`).toBeGreaterThan(225);
    }
  }, 60000);

  it('el halo de lo que brilla no se corta: hay lugar arriba de la aureola y se apaga antes del borde', () => {
    for (const t of [40, 58]) {
      const r = iconoObjeto3D({ pieza: 'corona', linea: 'sagrado', nivel: 5 }, t, t);
      const fila = (y: number) => { let m = 0; for (let x = 0; x < r.w; x++) m = Math.max(m, r.data[(y * r.w + x) * 4 + 3]); return m; };
      expect(fila(0), `${t}: la fila de arriba es halo suave`).toBeGreaterThan(0);
      expect(fila(0), `${t}: la fila de arriba es halo suave`).toBeLessThan(230);
      let y = 0; while (y < r.h && fila(y) < 255) y++;
      expect(y, `${t}: la aureola empieza con aire arriba`).toBeGreaterThanOrEqual(2);
    }
  }, 60000);
});
