import { describe, it, expect } from 'vitest';
import {
  IconCanvas, WEAPON_ICONS, drawWeaponIcon, renderLoot, lootFrames, allLoot, allBases, allArmor, allMisc, UNIQUE_LOOT, LEGENDARIES, SET_ITEMS,
  rollItem, baseWeapon, baseArmor, modText, findLoot, ARMOR_LINES, ARMOR_EVOLUTION, renderChest, chestFrames, CHEST_TIERS, coinFrames, pileFrames,
  coinBurstFrames, dropFrames, beamFrames, exportLootIcons, exportLootWorld, lootCatalog, handKindOf, handMaterials, RARITY_COLORS, ramp6,
  type Raster,
} from '../index';

const lit = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i] > 0) n++; return n; };
const same = (a: Raster, b: Raster) => Buffer.from(a.data).equals(Buffer.from(b.data));
const opaqueInside = (r: Raster) => {
  // nada pegado al borde: el ícono no se corta
  let edge = 0;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if ((x === 0 || y === 0 || x === r.w - 1 || y === r.h - 1) && r.data[(y * r.w + x) * 4 + 3] > 200) edge++;
  return edge;
};

describe('botín: íconos v2', () => {
  it('rampas de 6 tonos: del contorno oscuro al brillo claro', () => {
    const r = ramp6('#aab5c3', 'metal');
    expect(r).toHaveLength(6);
    const L = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    for (let i = 1; i < 6; i++) expect(L(r[i])).toBeGreaterThan(L(r[i - 1]));
  });
  it('cada arma se dibuja nativa a 32 y a 64, entera y con más detalle a 64', () => {
    expect(WEAPON_ICONS.length).toBeGreaterThanOrEqual(27);
    for (const k of WEAPON_ICONS) {
      const a = new IconCanvas(32), b = new IconCanvas(64);
      drawWeaponIcon(a, k); drawWeaponIcon(b, k);
      const ra = a.render(), rb = b.render();
      expect(lit(ra), k).toBeGreaterThan(40);
      expect(lit(rb), k).toBeGreaterThan(lit(ra) * 2.2);
      expect(opaqueInside(ra), k).toBe(0);
    }
  });
  it('todo el botín se dibuja: bases en 3 grados, 140 piezas de armadura, joyas, consumibles, gemas, runas y especiales', () => {
    expect(allBases().length).toBe((27 + 9) * 3);
    expect(allArmor().length).toBe(4 * 7 * 5);
    expect(allMisc().length).toBeGreaterThan(70);
    const all = allLoot();
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
    for (const it of all) {
      const r = renderLoot(it);
      expect(lit(r), it.id).toBeGreaterThan(20);
      expect(opaqueInside(r), it.id).toBe(0);
    }
  }, 120000);
  it('el grado cambia el aspecto y el daño de un arma', () => {
    const a = baseWeapon('sword', 1), c = baseWeapon('sword', 3);
    expect(same(renderLoot(a), renderLoot(c))).toBe(false);
    expect(c.stats.damage![1]).toBeGreaterThan(a.stats.damage![1] * 2);
    expect(baseWeapon('axe', 2).name.es).toBe('Hacha reforzada');
    expect(baseWeapon('maul', 2).name.es).toBe('Gran martillo reforzado');
  });
  it('las armaduras evolucionan: cada nivel se ve distinto, defiende más y pide más nivel', () => {
    for (const line of ARMOR_LINES) {
      const ev = ARMOR_EVOLUTION[line];
      for (let t = 1; t < 5; t++) { expect(ev[t].defense).toBeGreaterThan(ev[t - 1].defense); expect(ev[t].level).toBeGreaterThan(ev[t - 1].level); }
      for (const slot of ['chest', 'helm', 'boots'] as const) {
        const imgs = [1, 2, 3, 4, 5].map((t) => renderLoot(baseArmor(slot, line, t as 1)));
        for (let i = 1; i < 5; i++) expect(same(imgs[i], imgs[i - 1]), `${line} ${slot} ${i}`).toBe(false);
      }
    }
  });
  it('legendarios y set: nombres propios en es y en, estadísticas y 8 cuadros animados', () => {
    expect(LEGENDARIES.length).toBeGreaterThanOrEqual(35);
    expect(SET_ITEMS.map((s) => s.id)).toEqual(expect.arrayContaining(['juramento_de_rick', 'baculo_de_steph', 'arco_de_sophie', 'varita_de_alana', 'collar_de_thor']));
    for (const it of UNIQUE_LOOT) {
      expect(it.name.es && it.name.en && it.flavor?.es, it.id).toBeTruthy();
      expect(it.stats.mods.length, it.id).toBeGreaterThanOrEqual(2);
      const fr = lootFrames(it, 32);
      expect(fr).toHaveLength(8);
      expect(new Set(fr.map((f) => Buffer.from(f.data).toString('base64'))).size, it.id).toBeGreaterThan(3);
    }
    expect(modText({ stat: 'fireDmg', value: 12 }, 'es')).toBe('+12 de daño de fuego');
    expect(modText({ stat: 'allSkills', value: 2 }, 'en')).toBe('+2 to All Skills');
  });
  it('mágicos y raros al azar: propiedades, nombre y (los raros) otro color', () => {
    const b = baseWeapon('axe', 2);
    const mg = rollItem(b, 'magic', 1), rr = rollItem(b, 'rare', 1);
    expect(mg.stats.mods.length).toBeGreaterThanOrEqual(1);
    expect(mg.stats.mods.length).toBeLessThanOrEqual(2);
    expect(rr.stats.mods.length).toBeGreaterThanOrEqual(3);
    expect(rr.name.es).not.toBe(b.name.es);
    expect(same(renderLoot(rr), renderLoot(b))).toBe(false);
    expect(rollItem(b, 'rare', 1)).toEqual(rr);
  });
  it('el arma legendaria se puede llevar en la mano con sus colores', () => {
    const it = findLoot('hoja_del_vacio')!;
    expect(handKindOf(it)).toEqual({ main: 'greatsword' });
    expect(handMaterials(it).p_steel).toBeTruthy();
    expect(handKindOf(findLoot('bastion_del_alba')!)).toEqual({ off: 'shield_kite' });
    expect(handKindOf(findLoot('corona_del_rey_caido')!)).toBeNull();
  });
});

describe('botín en el mundo', () => {
  it('cofres: 4 niveles, se sacuden, abren y quedan abiertos', () => {
    for (const t of CHEST_TIERS) {
      const fr = chestFrames(t, 48);
      expect(fr).toHaveLength(10);
      expect(same(fr[0], fr[1])).toBe(false);
      expect(same(fr[0], fr[9])).toBe(false);
      expect(fr[0].w).toBe(48);
    }
    expect(same(renderChest('madera', 0), renderChest('legendario', 0))).toBe(false);
  });
  it('monedas que giran, montones de oro, lluvia de monedas, objeto que cae y haz de luz', () => {
    const coins = coinFrames(16);
    expect(coins).toHaveLength(8);
    expect(lit(coins[4])).toBeLessThan(lit(coins[0]));
    expect(lit(pileFrames('huge')[0])).toBeGreaterThan(lit(pileFrames('small')[0]) * 3);
    expect(coinBurstFrames()).toHaveLength(12);
    const drop = dropFrames(findLoot('filo_del_alba')!);
    expect(drop).toHaveLength(10);
    expect(drop[0].h).toBe(48);
    const beam = beamFrames('legendary');
    expect(beam).toHaveLength(8);
    const mid = (beam[0].h / 2) * beam[0].w * 4 + (beam[0].w / 2) * 4;
    expect(beam[0].data[mid + 3]).toBeGreaterThan(120);
    expect(RARITY_COLORS.legendary).toBe('#ff8a1e');
  });
});

describe('botín: exportación', () => {
  it('íconos: atlas de Phaser con un cuadro por objeto y animaciones para los especiales', () => {
    const items = [...allBases().slice(0, 5), ...UNIQUE_LOOT.slice(0, 3)];
    const [png, json] = exportLootIcons(items, 32);
    expect(png.name).toBe('botin_iconos_32.png');
    const j = JSON.parse(new TextDecoder().decode(json.bytes));
    expect(j.frames[items[0].id].frame.w).toBe(32);
    expect(j.animations[UNIQUE_LOOT[0].id]).toHaveLength(8);
    expect(j.anims[UNIQUE_LOOT[0].id]).toMatchObject({ frames: 8, loop: true });
  });
  it('mundo y catálogo', () => {
    const [, json] = exportLootWorld(UNIQUE_LOOT.slice(0, 2));
    const j = JSON.parse(new TextDecoder().decode(json.bytes));
    expect(j.anims.cofre_legendario_abrir).toMatchObject({ frames: 10, loop: false, w: 48 });
    expect(j.anims.moneda_gira.frames).toBe(8);
    expect(j.anims[`cae_${UNIQUE_LOOT[0].id}`].h).toBe(48);
    const cat = lootCatalog();
    expect(cat.items.length).toBe(allLoot().length);
    const leg = cat.items.find((i) => i.id === 'juramento_del_titan')!;
    expect(leg.text.es.length).toBe(leg.stats.mods.length);
    expect(cat.sets.legado_gg.bonus.length).toBe(4);
  });
});
