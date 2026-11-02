import { type V3 } from '../objeto';
import {
  G, hacerObj, bloque, ojiva, letras, grieta, tierra, monticulo, musgo, cascotes, calavera, calaveraSimple, huesoLargo, huesos, huesito,
  esqueleto, mirar, vela, llama, cadena, rr, elegir, onda, orient, base, GR, type P2,
} from '../kit_muerte';

/**
 * Catacumbas, segunda tanda: pasillos de osario (paredes de fémures con bandas de cráneos), lóculos en la toba,
 * bóvedas de cañón y arcos derrumbados, montones de escombro, agua que gotea y hace charco, ratas, hornacinas con
 * velas, ataúdes en estantes, placas mortuorias, momias apoyadas en la pared, pozos, escaleras que bajan,
 * antorchas, raíces que rompen la piedra y la puerta vieja de madera.
 *
 * Las paredes corren a lo largo de x con la cara a +y; la variante que termina en `_der` corre a lo largo de y.
 */
const obj = hacerObj('catacumbas');
const TOBA = ['mu_bloques_toba', 'mu_toba', 'cat_toba'];
const conDer = (vs: string[]) => [...vs, ...vs.slice(0, 2).map((v) => v + '_der')];
/** Pared de toba con su zócalo y una viga de remate gastada. */
function paredToba(g: G, L: number, H: number, gro: number, m: string) {
  const a = g.a;
  bloque(g, 0, 0, 0, L, gro + 3, 4, { mat: m, tono: -0.07, b: 1, j: 1 });
  bloque(g, 0, 0, 3.6, L, gro, H - 3.6, { mat: m, b: 1.4, j: 1.2 });
  bloque(g, 0, 0.4, H - 1, L + 1, gro + 1.4, 2.6, { mat: m, tono: 0.03, b: 0.8, j: 1.4 });
  for (let x = -L / 2 + 6; x < L / 2 - 4; x += 9) bloque(g, x + rr(a, -2, 2), 0.2 + rr(a, -1, 1), H + 0.4, 6 + a.r() * 6, gro * 0.7, 0.8 + a.r() * 1.4, { mat: m, tono: 0.02, b: 0.6, j: 1, arriba: 0.7 });
}

// ================================================================== pasillos de osario y lóculos
obj('cat2_pasillo_osario', ['Pasillo de osario', 'Ossuary corridor wall'], conDer(['femures', 'banda_calaveras', 'cruz_calaveras', 'derrumbado']), [5, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA), H = 84;
  bloque(g, 0, -4, 0, 80, 10, H, { mat: m, b: 1, j: 1 });
  const alto = (x: number) => (b === 'derrumbado' ? Math.max(14, 50 - Math.abs(x - 6) * 1.6 + Math.sin(x * 0.3) * 6) : 56);
  // el muro de huesos: hileras de cabezas de fémur, con bandas de cráneos cada tanto
  const banda = (z: number) => b !== 'femures' && (Math.abs(z - 24) < 3 || Math.abs(z - 46) < 3);
  for (let z = 1.2; z < 58; z += 2.6) {
    const enBanda = banda(z);
    for (let x = -38; x <= 38; x += enBanda ? 6 : 2.5) {
      if (z > alto(x)) continue;
      if (b === 'cruz_calaveras' && Math.abs(x) < 9 && z > 10 && z < 40 && (Math.abs(x) < 2.6 || Math.abs(z - 30) < 2.6)) { calaveraSimple(g.sub(x, 2.2, z - 1.8, 90 + rr(a, -10, 10)), 2.1, 'mu_hueso', 0.02); continue; }
      if (enBanda) { if (Math.abs(z - 24) < 1.4 || Math.abs(z - 46) < 1.4) calaveraSimple(g.sub(x + rr(a, -0.3, 0.3), 2.6, z - 2.4, 90 + rr(a, -15, 15)), 2.6, 'mu_hueso', -0.03); continue; }
      const r = 1.1 + a.r() * 0.25;
      g.palo([x, -2, z], [x + rr(a, -0.3, 0.3), 1.6, z + rr(a, -0.3, 0.3)], r * 0.7, { mat: 'mu_hueso', tono: -0.15 });
      g.esf(x, 1.8, z, r, { mat: 'mu_hueso', tono: -0.1 + a.r() * 0.12 });
    }
  }
  // arriba de los huesos, la toba desnuda con una cornisa de cráneos
  if (b !== 'derrumbado') { for (let x = -36; x <= 36; x += 6) calaveraSimple(g.sub(x, 1.4, 56.6, 90 + rr(a, -15, 15)), 2.4, 'mu_hueso', -0.06); bloque(g, 0, 0, 62, 80, 4, 2.4, { mat: m, tono: 0.04, b: 0.5, j: 0.8 }); }
  else { huesos(g, 18, 22, 8, 6, 12, 0.9, 3); g.elip(6, 10, 0, 22, 9, 6, { mat: 'mu_hueso', tono: -0.3 }); for (let i = 0; i < 6; i++) calavera(g.sub(rr(a, -14, 26), rr(a, 6, 16), rr(a, 0, 3), mirar(a)), 2.8); }
  tierra(g, 40, 6, 4, 'mu_tierra', 0, 8);
});
obj('cat2_loculos', ['Pared de lóculos', 'Loculi burial wall'], conDer(['sellados', 'abiertos', 'mixto', 'saqueado']), [5, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA), H = 90;
  paredToba(g, 80, H, 12, m);
  const filas = [6, 22, 38, 54, 70];
  for (const z of filas) for (let i = 0; i < 2; i++) {
    const w = 30 + rr(a, -3, 3), x = (i === 0 ? -18 : 18) + rr(a, -2, 2), h = 10;
    g.caja(x, 2, z, w, 12, h, { mat: m, resta: true });
    g.caja(x, -3.8, z, w, 0.6, h, { mat: 'negro' });
    const est = b === 'sellados' ? 'sello' : b === 'abiertos' ? 'abierto' : b === 'saqueado' ? (a.r() < 0.7 ? 'roto' : 'abierto') : elegir(a, ['sello', 'abierto', 'roto', 'sello']);
    if (est === 'sello') { bloque(g, x, 5.4, z, w, 1.4, h, { mat: elegir(a, ['mu_ladrillo', 'mu_revoque', 'mu_marmol']), b: 0.3, j: 0.4 }); if (a.r() < 0.5) letras(g, x - 8, x + 8, 6.2, z + 6, 2, 'mu_revoque', 2.4, 0.8); }
    else if (est === 'roto') { bloque(g, x - w * 0.25, 5.4, z, w * 0.45, 1.4, h * (0.4 + a.r() * 0.4), { mat: 'mu_ladrillo', b: 0.3, j: 1 }); huesito(g, [x, 0, z + 1.2], [x + 8, 2, z + 1], 0.9); calaveraSimple(g.sub(x + 4, 1, z, 80), 2.6); }
    else { const n = g.sub(x, 0, z); n.masa([n.hu([-12, -0.5, 2.6], [11, -0.5, 2], 2.6, 2), n.bu([-12.6, -0.5, 2.8], [2.4, 2.4, 2.4])], { mat: elegir(a, ['mu_mortaja', 'mu_venda']), tono: -0.15, suave: 1 }); }
  }
  if (b === 'saqueado') { for (let i = 0; i < 4; i++) bloque(g.sub(rr(a, -30, 30), 12 + a.r() * 8, 0.4, a.r() * 90, rr(a, -10, 10)), 0, 0, 0, 6 + a.r() * 6, 4, 1.4, { mat: 'mu_ladrillo', b: 0.3, j: 0.8 }); huesos(g, 10, 30, 5, 0, 14, 0.9, 2); calavera(g.sub(rr(a, -20, 20), 14, 0, mirar(a)), 3); }
  tierra(g, 40, 6, 4, 'mu_tierra', 0, 9);
});
obj('cat2_pared_toba', ['Pared de toba', 'Tuff tunnel wall'], conDer(['lisa', 'humeda', 'agrietada', 'con_nicho']), [5, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA), H = 86 + a.r() * 10;
  paredToba(g, 80, H, 12, m);
  if (b === 'humeda') { for (let i = 0; i < 6; i++) g.elip(rr(a, -36, 36), 6.2, rr(a, 10, H - 20), 1.6 + a.r() * 2, 0.3, 8 + a.r() * 16, { mat: 'mu_agua', tono: 0.1 }); musgo(g, 9, -38, 38, 6.3, 1, 18, 'mu_musgo'); g.elip(rr(a, -20, 20), 12, 0.1, 10, 5, 0.3, { mat: 'mu_agua' }); }
  if (b === 'agrietada') { for (let i = 0; i < 4; i++) grieta(g, rr(a, -30, 30), 6, rr(a, 4, 30), rr(a, 40, H - 6), m); cascotes(g, 7, 30, 4, m, 0, 10, 2.4); }
  if (b === 'con_nicho') { g.sub(rr(a, -20, 20), 6, 0).prisma(ojiva(14, 14, 0.5, 4, 28), -5, 2, { mat: m, resta: true }); }
  tierra(g, 40, 6, 4, 'mu_tierra', 0, 9);
});

// ================================================================== bóvedas, arcos y escombro
obj('cat2_boveda', ['Bóveda de cañón', 'Barrel vault passage'], ['entera', 'agrietada', 'con_raices', 'apuntalada'], [5, 2], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_bloques_toba', 'mu_bloques', 'mu_toba']), W = 48, hr = 46, D = 22;
  // dos estribos y la bóveda de medio punto, vista de frente: el túnel se va hacia -y
  for (const s of [-1, 1]) bloque(g, s * (W / 2 + 8), -D / 2, 0, 16, D, hr, { mat: m, b: 1, j: 0.8 });
  g.prisma(ojiva(W + 32, hr, 0.5, 8, 0), -D, 0, { mat: m });
  g.prisma(ojiva(W, hr, 0.5, 8, 0), -D - 2, 2, { mat: m, resta: true });
  g.caja(0, -D / 2, 0, W, D + 4, hr, { mat: m, resta: true });
  // dovelas marcadas en el frente
  for (let i = 0; i <= 10; i++) { const t = (i / 10) * Math.PI, r0 = W / 2, r1 = W / 2 + 7; g.palo([Math.cos(t) * r0, 0.3, hr + Math.sin(t) * r0], [Math.cos(t) * r1, 0.3, hr + Math.sin(t) * r1], 0.45, { mat: m, tono: -0.25 }); }
  g.caja(0, -D, 0, W + 4, 1, hr + W / 2 + 2, { mat: 'negro' });
  if (v === 'agrietada') { for (let i = 0; i < 3; i++) grieta(g, rr(a, -20, 20), 0, hr, hr + W / 2 + 4, m); cascotes(g, 8, 20, 6, m, 0, 6, 2.6); }
  if (v === 'con_raices') { const cs = []; for (let i = 0; i < 7; i++) { let p: V3 = [rr(a, -20, 20), rr(a, -D, -2), hr + W / 2 - 2]; for (let k = 0; k < 4; k++) { const q: V3 = [p[0] + rr(a, -4, 4), p[1] + rr(a, -2, 2), p[2] - 6 - a.r() * 8]; cs.push(g.hu(p, q, 1.4 - k * 0.28, 1.1 - k * 0.25)); p = q; } } g.masa(cs, { mat: 'mu_corteza', suave: 0.8 }); }
  if (v === 'apuntalada') { for (const s of [-1, 1]) { g.caja(s * (W / 2 - 4), -4, 0, 3, 3, hr + 10, { mat: 'mu_madera' }); } g.caja(0, -4, hr + 10, W - 4, 3.4, 3, { mat: 'mu_madera', tono: 0.04 }); for (const s of [-1, 1]) g.palo([s * (W / 2 - 4), -4, hr], [s * (W / 2 - 14), -4, hr + 10], 1.2, { mat: 'mu_madera' }); }
  tierra(g, 34, 8, 4, 'mu_tierra', 0, 4);
});
obj('cat2_arco_derrumbado', ['Arco derrumbado', 'Collapsed arch'], ['medio', 'caido', 'apuntalado', 'con_huesos'], [4, 2], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_bloques_toba', 'mu_bloques', 'mu_toba']), W = 40, hr = 38;
  const izq = v === 'caido' ? 26 : hr;
  bloque(g, -W / 2 - 5, 0, 0, 10, 12, izq, { mat: m, b: 1, j: 1 });
  bloque(g, W / 2 + 5, 0, 0, 10, 12, hr - (v === 'caido' ? 10 : 0), { mat: m, b: 1, j: 1 });
  // las dovelas que quedan colgando y las que cayeron
  const quedan = v === 'medio' || v === 'apuntalado' ? 4 : v === 'con_huesos' ? 3 : 1;
  for (let i = 0; i < 9; i++) {
    const t0 = Math.PI - (i / 9) * Math.PI, t1 = Math.PI - ((i + 1) / 9) * Math.PI, r0 = W / 2, r1 = W / 2 + 9;
    const pts: V3[] = []; for (const t of [t0, t1]) for (const r of [r0, r1]) for (const y of [-5, 5]) pts.push([Math.cos(t) * r, y, hr + Math.sin(t) * r]);
    if (i < quedan) g.poli(pts, { mat: m, tono: (a.r() - 0.5) * 0.08 });
    else if (i < quedan + 4) { const s = g.sub(rr(a, -14, 18), rr(a, 4, 20), 0.6, a.r() * 180, 70 + rr(a, -20, 20), 'x'); bloque(s, 0, 0, 0, 9, 9, 7, { mat: m, b: 0.8, j: 1.4 }); }
  }
  cascotes(g, 14, 22, 12, m, 2, 10, 3);
  monticulo(g, 18, 10, 5, 'mu_tierra', 4, 4, 10, 6);
  if (v === 'apuntalado') { g.palo([12, 4, 0], [2, 2, hr + 8], 1.6, { mat: 'mu_madera' }); g.palo([-8, 4, 0], [-6, 2, hr + 6], 1.4, { mat: 'mu_madera' }); g.caja(-2, 2, hr + 6, 22, 3, 2.4, { mat: 'mu_madera', giro: 0 }); }
  if (v === 'con_huesos') { huesos(g, 10, 16, 8, 2, 12, 0.9, 3); esqueleto(g.sub(14, 14, 3, 120).esc(0.9), 2); }
});
obj('cat2_escombro', ['Montón de escombro', 'Rubble heap'], ['chico', 'grande', 'con_viga', 'con_huesos', 'con_craneo'], [2, 2], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_bloques_toba', 'mu_bloques', 'mu_toba', 'mu_piedra']), R = v === 'chico' ? 10 : 16, H = v === 'chico' ? 5 : 10;
  monticulo(g, R, R * 0.85, H, 'mu_tierra', 5, 0, 0, 6);
  for (let i = 0; i < (v === 'chico' ? 8 : 16); i++) { const t = a.r() * 6.28, q = a.r(), z = H * Math.sqrt(Math.max(0, 1 - q * q)) * 0.8; const s = 2.6 + a.r() * (v === 'chico' ? 3 : 5); bloque(g, Math.cos(t) * R * q, Math.sin(t) * R * 0.85 * q, z - s * 0.3, s * 1.2, s, s * 0.8, { mat: m, giro: a.r() * 90, incl: rr(a, -30, 30), b: s * 0.2, j: s * 0.5, tono: (a.r() - 0.5) * 0.1 }); }
  cascotes(g, 10, R + 4, R, m, 0, 0, 1.8);
  if (v === 'con_viga') { g.palo([-R - 4, -4, 2], [R * 0.4, 6, H + 6], 2.2, { mat: 'mu_madera' }); g.palo([R * 0.2, -R, 1], [R, 4, 3], 1.8, { mat: 'mu_madera', tono: -0.06 }); }
  if (v === 'con_huesos') { huesos(g, 8, R, R * 0.8, 0, 0, H * 0.5, 2); calavera(g.sub(R * 0.5, R * 0.4, 1, mirar(a)), 3); }
  if (v === 'con_craneo') { calavera(g.sub(0, 0, H * 0.75, 45 + rr(a, -20, 20), rr(a, -10, 10)), 4.2); const b = g.sub(R * 0.6, R * 0.5, 0, a.r() * 90); b.masa([b.hu([0, 0, 1], [5, 1, 4], 1, 0.8), b.hu([5, 1, 4], [8, 2, 2], 0.8, 0.6), b.bu([8.6, 2.2, 1.6], [1.2, 1, 0.8])], { mat: 'mu_hueso', suave: 0.6 }); }
});
obj('cat2_columna_derrumbada', ['Columna derrumbada', 'Fallen column'], ['tambores', 'tronco_pie', 'capitel', 'partida'], [2, 3], true, (v, _f, g, a) => {
  const m = elegir(a, ['mu_piedra', 'mu_piedra_fria', 'mu_toba']);
  tierra(g, 16, 22, 5, 'mu_tierra');
  bloque(g, -6, -12, 0, 16, 16, 4, { mat: m, b: 1, j: 0.8 });
  const pie = v === 'tronco_pie' ? 30 + a.r() * 10 : 8;
  g.cil(-6, -12, 4, 6, pie, { mat: m, r1: 5.8 });
  g.poli([[-13, -19, 4 + pie - 2], [1, -19, 4 + pie + 2], [-13, -5, 4 + pie], [1, -5, 4 + pie + 4], [-13, -19, 99], [1, -19, 99], [-13, -5, 99], [1, -5, 99]], { mat: m, resta: true });
  const n = v === 'partida' ? 2 : 4;
  for (let i = 0; i < n; i++) { const s = g.sub(rr(a, -2, 8) + i * 1.5, -2 + i * 9, 5.8, 90 + rr(a, -25, 25), 90, 'x'); s.cil(0, 0, -4, 5.8, 8, { mat: m, tono: (a.r() - 0.5) * 0.08 }); }
  if (v === 'capitel' || v === 'partida') { const c = g.sub(8, 22, 0, rr(a, 0, 90), rr(a, -20, 20)); bloque(c, 0, 0, 0, 14, 14, 4, { mat: m, b: 0.8, j: 0.8 }); c.cil(0, 0, 4, 9, 4, { mat: m, r1: 6 }); }
  cascotes(g, 8, 12, 16, m, 4, 6, 2.4);
});

// ================================================================== agua y bichos
obj('cat2_gotera', ['Gotera con charco', 'Dripping water and puddle'], ['charco', 'charco_grande', 'sobre_piedra', 'con_estalagmitas'], [2, 2], false, (v, f, g, a) => {
  const n = 8, grande = v === 'charco_grande', R = grande ? 16 : 10;
  g.elip(0, 0, 0, R + 2, R * 0.8 + 2, 0.4, { mat: 'mu_tierra', tono: -0.2 });
  g.elip(0, 0, 0.1, R, R * 0.8, 0.5, { mat: 'mu_agua' });
  for (let i = 0; i < 6; i++) { const t = a.r() * 6.28; g.elip(Math.cos(t) * R * 0.9, Math.sin(t) * R * 0.7, 0.2, 2 + a.r() * 3, 1.6 + a.r() * 2, 0.4, { mat: 'mu_agua', tono: -0.05 }); }
  const zc = v === 'sobre_piedra' ? 5 : 0.6;
  if (v === 'sobre_piedra') { bloque(g, 2, 2, 0, 12, 10, 4, { mat: elegir(a, TOBA), b: 1.2, j: 1.2 }); g.elip(2, 2, 4.2, 3, 2.4, 0.4, { mat: 'mu_agua', tono: 0.05 }); g.elip(2, 2, 4.4, 1.6, 1.2, 0.3, { mat: 'mu_cal', tono: -0.2 }); }
  if (v === 'con_estalagmitas') for (let i = 0; i < 5; i++) { const t = a.r() * 6.28, d = R + 2 + a.r() * 4; g.cil(Math.cos(t) * d, Math.sin(t) * d * 0.8, 0, 1.6 + a.r(), 4 + a.r() * 8, { mat: 'mu_cal', tono: -0.25, r1: 0.2 }); }
  // la gota cae y abre anillos en el agua
  const k = f % n, cx = v === 'sobre_piedra' ? 2 : 0, cy = v === 'sobre_piedra' ? 2 : 0;
  if (k < 4) { const z = 90 - (k / 4) * (90 - zc); g.elip(cx, cy, z, 0.6, 0.6, 1.2, { mat: 'hielo', tono: 0.1 }); }
  else { const r = (k - 3) * 2; for (let i = 0; i < 14; i++) { const t0 = (i / 14) * Math.PI * 2, t1 = ((i + 1) / 14) * Math.PI * 2; g.palo([cx + Math.cos(t0) * r, cy + Math.sin(t0) * r * 0.8, zc + 0.1], [cx + Math.cos(t1) * r, cy + Math.sin(t1) * r * 0.8, zc + 0.1], 0.22, { mat: 'hielo', tono: -0.15 - (k - 4) * 0.08 }); } if (k === 4) for (let i = 0; i < 3; i++) g.esf(cx + rr(a, -1.5, 1.5), cy + rr(a, -1.5, 1.5), zc + 1.5 + i, 0.35, { mat: 'hielo' }); }
  return { piezas: g.ps, sinSombra: false };
}, { cuadros: 8, t: 3 });
/** Rata mirando +x, apoyada en z = 0, con la cola que se mece y el paso de las patas según el cuadro. */
function rata(g: G, f: number, n: number, fase = 0, come = false) {
  const t = ((f + fase) / n) * Math.PI * 2, paso = Math.sin(t * 2), cab = come ? Math.max(0, Math.sin(t * 2)) : 0;
  const cs = [g.bu([0, 0, 2.2], [3.4, 1.8, 1.8], { eje: [1, 0, 0.1] }), g.bu([3.4, 0, 2.2 - cab * 1.2], [1.6, 1.1, 1.1], { eje: [1, 0, -0.3 - cab] }), g.bu([-2, 0, 2], [2, 1.7, 1.6])];
  g.masa(cs, { mat: 'mu_rata', suave: 0.8 });
  g.poli([[4.6, -0.4, 2.1 - cab * 1.4], [4.6, 0.4, 2.1 - cab * 1.4], [6.2, 0, 1.6 - cab * 1.8], [4.6, 0, 2.7 - cab * 1.2]], { mat: 'mu_rosa', tono: -0.1 });
  for (const s of [-1, 1]) { g.elip(3, s * 0.9, 3.2 - cab, 0.6, 0.3, 0.7, { mat: 'mu_rosa', tono: -0.05 }); g.esf(4.2, s * 0.6, 2.7 - cab * 1.3, 0.25, { mat: 'negro' }); }
  let p: V3 = [-3.8, 0, 1.8];
  for (let i = 1; i <= 5; i++) { const q: V3 = [-3.8 - i * 1.6, Math.sin(t + i * 0.8) * (0.4 * i), 1.4 - i * 0.25]; g.palo(p, q, 0.35 - i * 0.04, { mat: 'mu_rosa', tono: -0.15 }); p = q; }
  for (const s of [-1, 1]) for (const x of [-1.6, 2]) g.palo([x, s * 1, 1.2], [x + paso * s * 0.6, s * 1.3, 0.1], 0.35, { mat: 'mu_rosa', tono: -0.15 });
}
obj('cat2_rata', ['Ratas', 'Rats'], ['una', 'dos', 'comiendo', 'nido', 'corriendo'], [1, 1], false, (v, f, g, a) => {
  const n = 8;
  if (v === 'corriendo') { const u = (f % n) / n; rata(g.sub(-12 + u * 24, -6 + u * 12, 0, 27 + rr(a, -10, 10)), f * 2, n, 0); return; }
  if (v === 'comiendo') { const c = g.sub(4, 2, 0, rr(a, 0, 90)); c.masa([c.hu([-4, 0, 1], [4, 0, 1.2], 1.6, 1.2), c.bu([-5, 0, 1.4], [1.6, 1.6, 1.4])], { mat: 'mu_carne_seca', suave: 0.8 }); huesito(c, [-2, 2, 0.6], [4, 3, 0.8], 0.6); rata(g.sub(-4, -2, 0, 20), f, n, 0, true); rata(g.sub(6, 8, 0, 230), f, n, 3, true); return; }
  if (v === 'nido') { g.elip(0, 0, 0, 10, 8, 3, { mat: 'mu_paja', tono: -0.1 }); for (let i = 0; i < 12; i++) g.palo([rr(a, -9, 9), rr(a, -7, 7), rr(a, 0.5, 3)], [rr(a, -9, 9), rr(a, -7, 7), rr(a, 0.5, 3)], 0.5, { mat: 'mu_paja', tono: rr(a, -0.2, 0.05) }); for (let i = 0; i < 3; i++) g.esf(rr(a, -3, 3), rr(a, -3, 3), 3, 1.2, { mat: 'mu_rosa', tono: -0.05 }); rata(g.sub(-6, 4, 2, 300), f, n, 0); calaveraSimple(g.sub(8, -4, 0, 120), 2.4); huesos(g, 3, 10, 8); return; }
  rata(g.sub(0, 0, 0, a.r() * 360).esc(1.25), f, n, 0);
  if (v === 'dos') rata(g.sub(rr(a, -8, 8), rr(a, 5, 9), 0, a.r() * 360).esc(1.15), f, n, 4);
}, { cuadros: 8, t: 2 });

// ================================================================== velas, antorchas y placas en la pared
obj('cat2_hornacina_velas', ['Hornacina con velas', 'Candle niche'], conDer(['tres', 'muchas', 'con_calavera', 'con_virgen']), [3, 1], true, (v, f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA), n = 4;
  paredToba(g, 48, 80, 12, m);
  g.sub(0, 6, 0).prisma(ojiva(22, 20, 0.5, 5, 22), -7, 2, { mat: m, resta: true });
  g.caja(0, 2, 21, 24, 9, 1.6, { mat: m, tono: 0.06 });
  const z = 22.6;
  if (b === 'con_calavera') { calavera(g.sub(0, 0, z, 90), 3.8); vela(g, 0, -0.4, z + 7.2, 4, 1.2, f, n, 0); vela(g, -7, 1, z, 6, 1.3, f, n, 1); vela(g, 7, 0, z, 4, 1.3, f, n, 2); }
  else if (b === 'con_virgen') { const fz = g.sub(0, -2, z, 90); fz.masa([fz.hu([0, 0, 0], [0, 0, 12], 3.4, 2), fz.bu([0, 0, 14], [1.8, 1.8, 2]), fz.hu([0.4, 0, 15], [-0.6, 0, 8], 2.2, 3)], { mat: elegir(a, ['mu_marmol', 'tela_azul']), suave: 1 }); for (const x of [-7, 7]) vela(g, x, 1, z, 5 + a.r() * 3, 1.2, f, n, x); g.elip(0, 3, z + 0.4, 3, 1.4, 0.8, { mat: 'mu_flor' }); }
  else { const k = b === 'muchas' ? 9 : 3; for (let i = 0; i < k; i++) vela(g, -8 + (16 * i) / Math.max(1, k - 1) + rr(a, -0.5, 0.5), rr(a, -2, 2), z, 2 + a.r() * 7, 1 + a.r() * 0.4, f, n, i); }
  for (let i = 0; i < 4; i++) g.elip(rr(a, -10, 10), 5.2, z - rr(a, 1, 5), 0.6, 0.5, 2 + a.r() * 2, { mat: 'mu_cera', tono: 0.05 });
  g.elip(0, 9, 0.2, 6, 3, 0.5, { mat: 'mu_cera', tono: -0.05 });
  tierra(g, 22, 6, 3, 'mu_tierra', 0, 9);
  return { piezas: g.ps, resplandor: { c: g.P(0, 4, z + 6), r: 22, color: '#ffb35a' } };
}, { cuadros: 4, t: 3 });
obj('cat2_antorcha_pared', ['Antorcha de la catacumba', 'Catacomb wall torch'], conDer(['encendida', 'apagada', 'doble', 'humeante']), [3, 1], true, (v, f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA), n = 6;
  paredToba(g, 48, 80, 12, m);
  const xs = b === 'doble' ? [-12, 12] : [0];
  for (const x of xs) {
    const s = g.sub(x, 6, 44);
    s.caja(0, 0, -4, 3, 1.2, 8, { mat: 'mu_hierro' }); s.palo([0, 0.6, -2], [0, 4, 0], 0.6, { mat: 'mu_hierro' }); s.cil(0, 4, -1, 1.8, 1.4, { mat: 'mu_hierro' });
    const t = s.sub(0, 4, -6, 0, -12, 'x');
    t.cil(0, 0, 0, 1, 12, { mat: 'mu_madera', r1: 1.4 }); t.cil(0, 0, 10, 1.8, 3, { mat: 'mu_paja', r1: 2 }); for (let i = 0; i < 3; i++) t.cil(0, 0, 10.4 + i, 1.9, 0.5, { mat: 'mu_hierro' });
    if (b !== 'apagada') { llama(t, 0, 0, 13, 2.2, 8, f, n, x); llama(t, 0.6, 0.4, 13, 1.4, 5.4, f, n, x + 2); }
    else t.cil(0, 0, 13, 1.8, 1, { mat: 'negro' });
    if (b === 'humeante') for (let i = 0; i < 4; i++) { const u = ((f / n + i / 4) % 1); t.esf(Math.sin(u * 6 + i) * 1.4, 0, 20 + u * 22, 1.6 + u * 3, { mat: 'mu_osario', tono: -0.1 }); }
    g.elip(x, 6.1, 64, 4, 0.3, 10, { mat: m, tono: -0.28 });
  }
  tierra(g, 22, 6, 3, 'mu_tierra', 0, 9);
  if (b === 'apagada') return;
  return { piezas: g.ps, resplandor: { c: g.P(0, 12, 54), r: b === 'doble' ? 30 : 24, color: '#ff9a3a' } };
}, { cuadros: 6, t: 3 });
obj('cat2_placa_mortuoria', ['Placas mortuorias', 'Memorial plaques'], conDer(['marmol', 'bronce', 'rota', 'varias']), [3, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA);
  paredToba(g, 48, 80, 12, m);
  const placa = (x: number, z: number, w: number, h: number, mat: string, rota = false) => {
    bloque(g, x, 6.6, z, w, 1.4, h, { mat, b: 0.4, j: 0.3 });
    letras(g, x - w / 2 + 2.5, x + w / 2 - 2.5, 7.4, z + h - 3, Math.max(1, Math.floor((h - 4) / 2.4)), mat, 2.2, 0.9);
    if (mat === 'mu_bronce') for (const sx of [-1, 1]) g.esf(x + sx * (w / 2 - 1.2), 7.4, z + h / 2, 0.6, { mat: 'mu_bronce', tono: 0.1 });
    if (rota) { g.poli([[x, 5, z - 1], [x + w, 5, z + h * 0.2], [x + w, 5, z + h + 1], [x + w * 0.1, 9, z + h + 1], [x + w * 0.2, 9, z + h * 0.3]], { mat, resta: true }); const p = g.sub(x + rr(a, -4, 6), 10 + a.r() * 4, 0.4, rr(a, -30, 30), 86); bloque(p, 0, 0, 0, w * 0.5, 1.4, h * 0.6, { mat, b: 0.3, j: 0.5 }); }
    for (const sx of [-1, 1]) for (const sz of [0, 1]) g.esf(x + sx * (w / 2 - 1.4), 7.3, z + 1.2 + sz * (h - 2.4), 0.4, { mat: 'mu_hierro' });
  };
  if (b === 'varias') { const mats = ['mu_marmol', 'mu_bronce', 'mu_marmol_negro', 'mu_piedra_clara']; for (let i = 0; i < 5; i++) placa(rr(a, -14, 14), 18 + i * 9 + rr(a, -1, 1), 10 + a.r() * 8, 7 + a.r() * 2, elegir(a, mats), a.r() < 0.2); }
  else { placa(0, 30, 22, 16, b === 'bronce' ? 'mu_bronce' : elegir(a, ['mu_marmol', 'mu_marmol_negro']), b === 'rota'); if (b === 'marmol') { calaveraSimple(g.sub(0, 6.4, 46, 90), 2.6, 'mu_marmol'); for (const sx of [-1, 1]) g.palo([sx * 6, 7.2, 44], [-sx * 6, 7.2, 50], 0.6, { mat: 'mu_marmol' }); } }
  vela(g, rr(a, -12, 12), 9, 0, 4 + a.r() * 4, 1.2, 0, 4, 0, false);
  tierra(g, 22, 6, 3, 'mu_tierra', 0, 9);
});

// ================================================================== muertos, ataúdes y pozos
obj('cat2_ataudes_estante', ['Ataúdes en estantes', 'Coffins on stone shelves'], ['estante', 'piramide', 'podridos', 'abiertos'], [4, 2], true, (v, _f, g, a) => {
  const m = elegir(a, TOBA), mw = elegir(a, ['mu_madera', 'madera_vieja', 'madera']);
  tierra(g, 32, 14, 4, 'mu_tierra');
  const cajon = (s: G, abierto: boolean, podrido: boolean) => {
    const p: V3[] = []; for (const [x, y] of [[-26, -5.5], [-26, 5.5], [-13, -8.5], [-13, 8.5], [27, -5], [27, 5]] as P2[]) p.push([x, y, 0], [x, y, 10]);
    s.poli(p, { mat: mw, tono: (a.r() - 0.5) * 0.12 });
    if (abierto || podrido) { s.poli(p.map(([x, y, z]) => [x * 0.9, y * 0.8, z === 0 ? 1.6 : 13] as V3), { mat: mw, resta: true }); s.poli(p.map(([x, y, z]) => [x * 0.9, y * 0.8, z === 0 ? 1.2 : 1.8] as V3), { mat: 'negro' }); if (a.r() < 0.7) { calaveraSimple(s.sub(-20, 0, 1.8, 0), 2.6, 'mu_hueso', -0.08); huesito(s, [-10, 1, 2.4], [8, -1, 2.4], 0.9); } }
    else { s.poli(p.map(([x, y, z]) => [x * 1.02, y * 1.06, z === 0 ? 10 : 11.6] as V3), { mat: mw, tono: 0.04 }); s.caja(-4, 0, 11.6, 20, 1.8, 0.8, { mat: 'mu_hierro' }); s.caja(-9, 0, 11.6, 1.8, 8, 0.8, { mat: 'mu_hierro' }); }
    if (podrido) { s.caja(18, 4, 0, 10, 6, 12, { mat: mw, resta: true }); for (let i = 0; i < 3; i++) s.caja(rr(a, -10, 20), rr(a, -4, 4), 10, 2.6, 12, 1, { mat: mw, giro: rr(a, 50, 130), tono: -0.1 }); }
  };
  if (v === 'piramide') { cajon(g.sub(0, -7, 0, rr(a, -4, 4)), false, false); cajon(g.sub(rr(a, -2, 2), 7, 0, rr(a, -4, 4)), false, false); cajon(g.sub(rr(a, -3, 3), 0, 11.6, rr(a, -8, 8)), a.r() < 0.4, false); return; }
  // estante de piedra de dos pisos con un ataúd en cada uno
  bloque(g, 0, -2, 0, 64, 22, 3, { mat: m, b: 0.8, j: 1 });
  for (const x of [-30, 30]) bloque(g, x, -2, 3, 5, 20, 36, { mat: m, b: 0.8, j: 1 });
  bloque(g, 0, -2, 20, 64, 22, 3, { mat: m, b: 0.8, j: 1 }); bloque(g, 0, -2, 38, 66, 23, 3, { mat: m, b: 0.8, j: 1, tono: 0.04 });
  cajon(g.sub(0, -2, 3, 0), v === 'abiertos', v === 'podridos');
  cajon(g.sub(1, -2, 23, 0), v === 'abiertos' && a.r() < 0.5, v === 'podridos');
  if (v === 'podridos' || v === 'abiertos') { huesos(g, 6, 24, 4, 0, 14, 0.9, 2); calavera(g.sub(rr(a, -16, 16), 14, 0, mirar(a)), 3); }
});
obj('cat2_momias_pared', ['Momias apoyadas en la pared', 'Mummified monks against the wall'], conDer(['de_pie', 'sentado', 'colgado', 'monjes']), [4, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA);
  paredToba(g, 64, 84, 12, m);
  const momiaPie = (x: number, sentado: boolean, colgado: boolean) => {
    const s = g.sub(x, 9, colgado ? 8 : 0, 90 + rr(a, -12, 12)), cs = [], hab = elegir(a, ['mu_mortaja', 'tela', 'mu_venda', 'cuero']);
    const zc = sentado ? 14 : 40, zp = sentado ? 0 : 0;
    if (sentado) { cs.push(s.bu([0, 0, 8], [5, 5, 4]), s.hu([0, 0, 8], [-1, 0, 20], 4, 3.4)); for (const sy of [-1, 1]) cs.push(s.hu([1, sy * 2.4, 6], [8, sy * 2.6, 6], 2, 1.6), s.hu([8, sy * 2.6, 6], [9, sy * 2.6, 0.6], 1.6, 1.4)); }
    else { cs.push(s.hu([0, 0, zp + 1], [-1, 0, zc - 4], 5, 3.4), s.bu([0, 0, 1.2], [5.4, 5, 1.6])); }
    for (const sy of [-1, 1]) cs.push(s.hu([-0.5, sy * 4, zc - 5], [2, sy * 2.6, zc - 13], 1.4, 1.2), s.hu([2, sy * 2.6, zc - 13], [3, -sy * 0.6, zc - 15], 1.2, 1));
    s.masa(cs, { mat: hab, tono: -0.12, suave: 1.4 });
    // la cabeza seca, ladeada, con la capucha caída
    const c = s.sub(0.2, 0, zc - 2, 0, rr(a, -20, 20), 'x');
    c.masa([c.bu([0, 0, 2], [2.2, 2, 2.6]), c.bu([1.4, 0, 0.6], [1.2, 1.6, 1.2])], { mat: 'mu_carne_seca', suave: 0.8 });
    for (const sy of [-1, 1]) c.esf(1.9, sy * 0.8, 2.4, 0.55, { mat: 'negro' });
    c.elip(2.2, 0, 0.2, 0.5, 0.9, 0.7, { mat: 'negro' });
    c.elip(-1.4, 0, 2.2, 2.4, 3, 2.6, { mat: hab, tono: -0.18 });
    if (colgado) { s.palo([-1, 0, zc + 1], [-6, 0, zc + 12], 0.4, { mat: 'cuerda' }); g.cil(x, 6.4, zc + 20, 1.4, 1.2, { mat: 'mu_hierro', eje: [0, 1, 0] }); }
  };
  const n = b === 'monjes' ? 4 : 3;
  for (let i = 0; i < n; i++) momiaPie(-22 + (44 * i) / (n - 1) + rr(a, -2, 2), b === 'sentado', b === 'colgado');
  if (b === 'monjes') for (let i = 0; i < 3; i++) calaveraSimple(g.sub(-15 + i * 15, 6.6, 66, 90), 2.6);
  tierra(g, 30, 6, 4, 'mu_tierra', 0, 10);
  huesos(g, 3, 24, 3, 0, 14);
});
obj('cat2_pozo', ['Pozo de la catacumba', 'Catacomb shaft'], ['con_torno', 'abierto', 'tapado', 'con_cuerda'], [2, 2], true, (v, _f, g, a) => {
  const m = elegir(a, TOBA), R = 11;
  tierra(g, 18, 18, 4, 'mu_tierra');
  for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; const s = g.sub(Math.cos(t) * (R + 2.4), Math.sin(t) * (R + 2.4), 0, t / GR + 90); bloque(s, 0, 0, 0, 8, 5, 9 + rr(a, -1, 1), { mat: m, b: 0.8, j: 1 }); }
  g.cil(0, 0, 0.1, R, 0.4, { mat: 'negro' });
  if (v === 'tapado') { g.cil(0, 0, 9, R + 3, 1.6, { mat: 'mu_madera', tono: -0.05 }); for (let i = -2; i <= 2; i++) g.caja(i * 4.6, 0, 10.6, 4, 2 * R + 4, 0.4, { mat: 'mu_madera', tono: (i % 2) * 0.05 }); g.caja(0, 0, 11, 2 * R, 2, 1.4, { mat: 'mu_hierro' }); return; }
  if (v === 'con_torno' || v === 'con_cuerda') {
    for (const sx of [-1, 1]) { g.caja(sx * (R + 3), 0, 0, 3, 3, 30, { mat: 'mu_madera' }); g.palo([sx * (R + 3), -6, 0], [sx * (R + 3), 0, 14], 1, { mat: 'mu_madera' }); }
    g.cil(-R - 4, 0, 26, 1.8, 2 * R + 8, { mat: 'mu_madera', eje: [1, 0, 0] });
    g.cil(-4, 0, 26, 2.6, 8, { mat: 'cuerda', eje: [1, 0, 0] });
    g.palo([R + 4.6, 0, 26], [R + 4.6, 4, 26], 0.6, { mat: 'mu_hierro' }); g.palo([R + 4.6, 4, 26], [R + 4.6, 4, 20], 0.6, { mat: 'mu_hierro' });
    g.palo([0, 2.6, 25], [0, 2.6, v === 'con_cuerda' ? 0 : 8], 0.45, { mat: 'cuerda' });
    if (v === 'con_torno') { g.cil(0, 2.6, 4, 2.6, 4.6, { mat: 'mu_madera', r1: 3 }); g.cil(0, 2.6, 8.4, 3.1, 0.5, { mat: 'mu_hierro' }); }
  }
  if (v === 'abierto') { huesos(g, 4, 14, 14); calavera(g.sub(R + 6, 4, 0, mirar(a)), 3); }
});
obj('cat2_escalera', ['Escalera que baja', 'Stairs going down'], ['recta', 'rota', 'con_huesos', 'con_vela'], [3, 4], true, (v, f, g, a) => {
  const m = elegir(a, TOBA), W = 22, L = 50;
  // la boca: un marco de bloques alrededor y los escalones que se meten en la oscuridad hacia -y
  for (const sx of [-1, 1]) bloque(g, sx * (W / 2 + 4), 0, 0, 8, L + 6, 10, { mat: m, b: 1, j: 1 });
  bloque(g, 0, -L / 2 - 4, 0, W + 16, 8, 14, { mat: m, b: 1, j: 1 });
  g.caja(0, 0, 0.1, W, L, 0.4, { mat: 'negro' });
  const n = 8;
  for (let i = 0; i < n; i++) { const y = L / 2 - 3 - i * (L / n), tono = -0.05 - i * 0.07; if (v === 'rota' && (i === 3 || i === 4)) { cascotes(g, 2, W / 3, 2, m, 0, y, 2); continue; } bloque(g, 0, y, 0, W, L / n + 0.2, Math.max(0.6, 4.2 - i * 0.55), { mat: m, tono, b: 0.5, j: 0.8 }); }
  if (v === 'con_huesos') { huesos(g, 6, W / 2 - 2, L / 3, 0, 4, 2, 2); calavera(g.sub(rr(a, -6, 6), L / 2 - 6, 4.2, mirar(a)), 3); }
  if (v === 'con_vela') { vela(g, W / 2 + 4, L / 2 - 4, 10, 4 + a.r() * 3, 1.3, f, 4, 0); vela(g, -W / 2 - 4, L / 2 - 10, 10, 3 + a.r() * 3, 1.2, f, 4, 1); return { piezas: g.ps, resplandor: { c: [0, L / 2 - 6, 16] as V3, r: 30, color: '#ffb35a' } }; }
}, { cuadros: 4, t: 3 });

// ================================================================== raíces, puerta, huesos del piso y carretilla
obj('cat2_raices', ['Raíces que rompen la piedra', 'Roots breaking through'], conDer(['pared', 'colgantes', 'gruesas', 'con_calavera']), [4, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA);
  paredToba(g, 64, 86, 12, m);
  const cs = [], n = b === 'gruesas' ? 5 : 8, gr = b === 'gruesas' ? 3 : 1.6;
  for (let i = 0; i < n; i++) {
    let p: V3 = [rr(a, -28, 28), 6.4, 86];
    const largo = b === 'colgantes' ? 40 + a.r() * 30 : 60 + a.r() * 26;
    for (let k = 0; k < 6; k++) {
      const q: V3 = b === 'colgantes' && k > 1 ? [p[0] + rr(a, -2, 2), p[1] + 2 + a.r() * 2, p[2] - largo / 6] : [p[0] + rr(a, -6, 6), 6.6 + a.r() * 0.6, p[2] - largo / 6];
      cs.push(g.hu(p, q, gr * (1 - k * 0.13), gr * (1 - (k + 1) * 0.13)));
      if (a.r() < 0.4) { const r: V3 = [q[0] + rr(a, -8, 8), q[1] + 0.4, q[2] - rr(a, 2, 8)]; cs.push(g.hu(q, r, gr * 0.4, 0.3)); }
      p = q;
    }
  }
  g.masa(cs, { mat: 'mu_corteza', suave: 1 });
  for (let i = 0; i < 3; i++) grieta(g, rr(a, -26, 26), 6, rr(a, 40, 60), 84, m);
  cascotes(g, 6, 26, 4, m, 0, 10, 2);
  if (b === 'con_calavera') { calavera(g.sub(rr(a, -10, 10), 7.6, 46, 90, 10), 3.2); }
  tierra(g, 30, 6, 4, 'mu_tierra', 0, 9);
});
obj('cat2_puerta_madera', ['Puerta vieja de madera', 'Old wooden door'], conDer(['cerrada', 'abierta', 'rota', 'atrancada']), [4, 1], true, (v, _f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA), W = 24, hr = 30;
  paredToba(g, 64, 84, 12, m);
  g.sub(0, 6, 0).prisma(ojiva(W, hr, 0.5, 6, 0), -8, 2, { mat: m, resta: true });
  for (let i = 0; i <= 8; i++) { const t = (i / 8) * Math.PI, r0 = W / 2, r1 = W / 2 + 5; g.palo([Math.cos(t) * r0, 6.3, hr + Math.sin(t) * r0], [Math.cos(t) * r1, 6.3, hr + Math.sin(t) * r1], 0.45, { mat: m, tono: -0.25 }); }
  g.caja(0, -1.6, 0, W, 0.6, hr + W / 2, { mat: 'negro' });
  const hoja = (s: G) => { s.prisma(ojiva(W - 1, hr, 0.5, 6, 0).map(([x, z]) => [x + (W - 1) / 2, z] as P2), -0.9, 0.9, { mat: 'mu_madera', tono: (a.r() - 0.5) * 0.1 }); for (const z of [6, hr - 4]) s.caja((W - 1) / 2, 1, z, W - 2, 0.6, 2, { mat: 'mu_hierro' }); s.cil(W - 4, 1.2, 16, 1.2, 0.6, { mat: 'mu_hierro', eje: [0, 1, 0] }); for (let i = 0; i < 6; i++) s.esf(rr(a, 2, W - 3), 1.1, rr(a, 3, hr), 0.4, { mat: 'mu_hierro' }); };
  if (b === 'rota') { const s = g.sub(-W / 2, 14, 0.6, rr(a, -20, 20), -86, 'x'); hoja(s); s.caja(8, 0, 10, 8, 4, 10, { mat: 'mu_madera', resta: true }); cascotes(g, 4, 10, 4, 'mu_madera', 4, 14, 2.6); }
  else hoja(g.sub(-W / 2 + 0.5, 4, 0, b === 'abierta' ? -75 - a.r() * 10 : 0));
  if (b === 'atrancada') { g.caja(0, 6, 14, W + 10, 2.4, 3, { mat: 'mu_madera', tono: 0.06 }); for (const sx of [-1, 1]) g.caja(sx * (W / 2 + 4), 5.6, 12.6, 2, 2.6, 6, { mat: 'mu_hierro' }); g.palo([W / 2 - 2, 14, 0], [W / 2 - 6, 6, 22], 1.6, { mat: 'mu_madera' }); }
  tierra(g, 28, 6, 4, 'mu_tierra', 0, 10);
});
obj('cat2_huesos_suelo', ['Huesos regados en el piso', 'Scattered floor bones'], ['pocos', 'muchos', 'con_craneos', 'alfombra'], [2, 2], false, (v, _f, g, a) => {
  const n = v === 'pocos' ? 6 : v === 'alfombra' ? 30 : 16, R = v === 'alfombra' ? 18 : 14;
  if (v === 'alfombra') g.elip(0, 0, 0, R, R * 0.85, 1.4, { mat: 'mu_hueso', tono: -0.34 });
  huesos(g, n, R, R * 0.85, 0, 0, v === 'alfombra' ? 1.6 : 0.9, Math.min(4, Math.floor(n / 4)));
  const nc = v === 'con_craneos' ? 6 : v === 'pocos' ? 1 : 3;
  for (let i = 0; i < nc; i++) calavera(g.sub(rr(a, -R, R) * 0.8, rr(a, -R, R) * 0.7, v === 'alfombra' ? 1 : 0, mirar(a), rr(a, -30, 30), 'y'), 3, 'mu_hueso', a.r() < 0.5);
  if (v !== 'pocos') for (let i = 0; i < 2; i++) { const s = g.sub(rr(a, -R, R) * 0.6, rr(a, -R, R) * 0.6, 0, a.r() * 180); s.palo([-5, 0, 1], [5, 0, 1.2], 1, { mat: 'mu_hueso' }); for (let k = 0; k < 4; k++) for (const sy of [-1, 1]) s.palo([-4 + k * 2.6, 0, 1.4], [-3.4 + k * 2.6, sy * 4, 0.6], 0.6, { mat: 'mu_hueso', tono: -0.06 }); }
  for (let i = 0; i < 4; i++) g.elip(rr(a, -R, R), rr(a, -R, R), 0.1, 2 + a.r() * 2, 1.6 + a.r() * 2, 0.3, { mat: 'mu_tierra', tono: -0.1 });
});
obj('cat2_carretilla_huesos', ['Carretilla de huesos', 'Wheelbarrow of bones'], ['llena', 'vacia', 'volcada', 'con_pala'], [2, 3], true, (v, _f, g, a) => {
  tierra(g, 14, 22, 4, 'mu_tierra');
  const volc = v === 'volcada';
  const s = volc ? g.sub(-4, 0, 0, rr(a, -20, 20), 70, 'y').sub(-8, 0, -4) : g.sub(0, 0, 0, rr(a, -20, 20));
  const mw = elegir(a, ['mu_madera', 'madera_vieja']);
  // rueda adelante, cajón inclinado y las dos varas
  const r = s.sub(0, -18, 6, 90);
  for (let i = 0; i < 12; i++) { const t0 = (i / 12) * Math.PI * 2, t1 = ((i + 1) / 12) * Math.PI * 2; r.palo([Math.cos(t0) * 5.6, 0, Math.sin(t0) * 5.6], [Math.cos(t1) * 5.6, 0, Math.sin(t1) * 5.6], 0.9, { mat: mw }); }
  for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI; r.palo([Math.cos(t) * 5.4, 0, Math.sin(t) * 5.4], [-Math.cos(t) * 5.4, 0, -Math.sin(t) * 5.4], 0.5, { mat: mw }); }
  const c = s.sub(0, -2, 10, 0, -6, 'x');
  c.caja(0, 0, 0, 16, 22, 1.4, { mat: mw }); for (const sx of [-1, 1]) c.caja(sx * 7.6, 0, 1, 1.2, 22, 7, { mat: mw, tono: 0.04 }); for (const sy of [-1, 1]) c.caja(0, sy * 10.6, 1, 16, 1.2, 7, { mat: mw, tono: -0.02 });
  for (const sx of [-1, 1]) { s.palo([sx * 5, -16, 6], [sx * 6, 22, 9], 0.9, { mat: mw }); if (!volc) s.palo([sx * 5, 8, 9], [sx * 5, 10, 0], 0.8, { mat: mw }); }
  if (v === 'llena' || v === 'con_pala') { c.elip(0, 0, 6, 7, 9.6, 4, { mat: 'mu_hueso', tono: -0.3 }); for (let i = 0; i < 5; i++) calaveraSimple(c.sub(rr(a, -4, 4), rr(a, -7, 7), 6 + a.r() * 2, mirar(a)), 2.3); huesos(c, 8, 5, 8, 0, 0, 7); }
  if (volc) { g.elip(10, 0, 0, 12, 10, 3, { mat: 'mu_hueso', tono: -0.3 }); huesos(g, 10, 12, 10, 10, 0, 1.4, 3); for (let i = 0; i < 5; i++) calavera(g.sub(rr(a, 2, 22), rr(a, -10, 10), 0.6, mirar(a)), 2.8); }
  if (v === 'con_pala') { const p = g.sub(12, 4, 6, 20, -50, 'y'); p.palo([0, 0, -6], [0, 0, 24], 0.9, { mat: 'mu_madera' }); p.poli([[-3.4, -0.6, -6], [3.4, -0.6, -6], [-3.4, 0.6, -6], [3.4, 0.6, -6], [-3, -0.5, -14], [3, -0.5, -14], [0, 0, -16]], { mat: 'mu_hierro' }); }
});

obj('cat2_tumba_toba', ['Tumba cavada en la toba', 'Tuff-carved arcosolium'], conDer(['esqueleto', 'mortaja', 'vacia', 'con_ofrendas']), [4, 1], true, (v, f, g0, a) => {
  const g = g0.sub(0, 0, 0, orient(v)), b = base(v), m = elegir(a, TOBA);
  paredToba(g, 64, 86, 12, m);
  g.sub(0, 6, 0).prisma(ojiva(44, 26, 0.5, 6, 8), -9, 2, { mat: m, resta: true });
  g.caja(0, -1, 8, 44, 10, 2, { mat: m, tono: -0.12 });
  // la cama de piedra con el muerto a lo largo de x
  const s = g.sub(0, 1, 10, 90);
  if (b === 'esqueleto') esqueleto(s.esc(0.66), 2);
  else if (b === 'mortaja') { s.masa([s.hu([0, -18, 2.4], [0, 16, 2], 3.6, 2.6), s.bu([0, -6, 3], [4.4, 7, 3]), s.bu([0, -20, 2.8], [2.6, 3, 2.6])], { mat: 'mu_mortaja', tono: -0.12, suave: 1.4 }); for (const y of [-10, 4]) s.cil(0, y, 0, 4.2, 0.8, { mat: 'cuerda', eje: [0, 1, 0], r1: 3.8 }); }
  else if (b === 'vacia') huesos(s, 3, 3, 14, 0, 0, 0.8);
  else { esqueleto(s.esc(0.66), 1); for (let i = 0; i < 4; i++) g.elip(rr(a, -16, 16), 3, 10.2, 1.4, 1.2, 0.8, { mat: elegir(a, ['oro', 'mu_flor', 'mu_bronce']), tono: -0.15 }); vela(g, -18, 4, 10, 4, 1.2, f, 4, 0); vela(g, 18, 4, 10, 6, 1.2, f, 4, 1); }
  letras(g, -14, 14, 6.4, 46, 1, m, 2, 1.2);
  tierra(g, 30, 6, 4, 'mu_tierra', 0, 9);
  if (b === 'con_ofrendas') return { piezas: g.ps, resplandor: { c: g.P(0, 6, 18), r: 24, color: '#ffb35a' } };
}, { cuadros: 4, t: 3 });
