import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { girarPiezas } from '../render';

// Muros de obra nuevos para las mazmorras: sillería a la vista, hilada por hilada, con zócalo y cornisa, en los ocho
// estilos de los riscos (bordes.ts). Cuatro paños por estilo (liso con imposta, con pilastras, con arco ciego y roto)
// y cada uno en sus dos ejes. La mazmorra elige entre estos y los muros de siempre, así no todas se ven iguales.

const ESTILOS = ['paramo', 'cementerio', 'desierto', 'nieve', 'selva', 'infierno', 'ahogada', 'celestial'] as const;
type Estilo = (typeof ESTILOS)[number];
const ROCA: Record<Estilo, string> = { paramo: 'bor_paramo', cementerio: 'bor_cementerio', desierto: 'bor_desierto', nieve: 'bor_nieve_roca', selva: 'bor_selva', infierno: 'bor_infierno', ahogada: 'bor_ahogada', celestial: 'bor_celestial' };
const RUNA: Record<Estilo, string> = { paramo: 'dec_runa_verde', cementerio: 'dec_runa_fria', desierto: 'dec_runa_oro', nieve: 'dec_runa_fria', selva: 'dec_runa_verde', infierno: 'dec_brasa', ahogada: 'dec_runa_fria', celestial: 'dec_runa_oro' };
const PANOS = ['liso', 'pilastras', 'arco_ciego', 'roto'];
const L = 80, T = 14, H = 104, FILA = 13;

/** Lo propio de cada mundo sobre el paño: musgo, lianas, nieve y carámbanos, vetas de brasa, percebes, filetes de oro, banda pintada. */
function acento(a: Arma, ps: Pieza[], e: Estilo, alto: (x: number) => number, roto: boolean) {
  const f = T / 2 + 0.6;
  if (e === 'paramo') for (let i = 0; i < 6; i++) { const x = (a.r() - 0.5) * (L - 10); ps.push(a.elipsoide(x, 0, alto(x) + 1, 6 + a.r() * 4, 5, 1.8, { mat: 'bor_musgo', giro: a.r() * 180 })); }
  else if (e === 'selva') for (let i = 0; i < 8; i++) { const x = (a.r() - 0.5) * (L - 8); let p: V3 = [x, f, alto(x) + 1]; for (let k = 0; k < 4; k++) { const q: V3 = [p[0] + (a.r() - 0.5) * 3, f + 0.4, p[2] - 9 - a.r() * 9]; ps.push(a.palo(p, q, 1 - k * 0.15, { mat: 'bor_liana' })); p = q; } }
  else if (e === 'nieve') { for (let i = 0; i < 5; i++) { const x = -L / 2 + 8 + i * 16 + (a.r() - 0.5) * 6; ps.push(a.elipsoide(x, 0, alto(x), 9, 7.5, 3.2, { mat: 'bor_nieve' })); } for (let i = 0; i < 7; i++) { const x = (a.r() - 0.5) * (L - 8); ps.push(a.palo([x, f + 1, alto(x) + 1], [x, f + 1.4, alto(x) - 7 - a.r() * 9], 1.2, { mat: 'bor_nieve', r1: 0.2 })); } }
  else if (e === 'infierno') for (let i = 0; i < 4; i++) { const x = (a.r() - 0.5) * (L - 14), z = 12 + a.r() * 60; ps.push(a.caja(x, f, z, 1.6, 1, 14 + a.r() * 16, { mat: 'dec_brasa', incl: (a.r() - 0.5) * 30, inclEje: 'y' })); }
  else if (e === 'ahogada') for (let i = 0; i < 16; i++) { const x = (a.r() - 0.5) * (L - 6); ps.push(a.elipsoide(x, f, a.r() * 34, 1.7, 1.2, 1.6, { mat: 'bor_percebe' })); }
  else if (e === 'celestial') { if (roto) return; ps.push(a.caja(0, f, 62, L, 1, 2.4, { mat: 'bor_oro' })); ps.push(a.caja(0, f, 20, L, 1, 1.6, { mat: 'bor_oro' })); }
  else if (e === 'desierto') { if (roto) return; ps.push(a.caja(0, f, 70, L, 0.8, 7, { mat: 'bor_desierto', tono: -0.22 })); for (let i = 0; i < 9; i++) ps.push(a.caja(-L / 2 + 6 + i * 8.5, f + 0.5, 71.5, 3.4, 0.8, 4, { mat: 'dec_runa_oro' })); }
  else if (!roto) for (const x of [-22, 22]) { ps.push(a.caja(x, f, 50, 2.2, 1, 16, { mat: 'bor_cementerio', tono: 0.14 })); ps.push(a.caja(x, f, 59, 9, 1, 2.2, { mat: 'bor_cementerio', tono: 0.14 })); }
}

registrar({
  id: 'muro_obra', nombre: ['Muro de sillería', 'Ashlar wall'], tema: 'comun',
  variantes: ESTILOS.flatMap((e) => PANOS.flatMap((p) => [`${e}_${p}`, `${e}_${p}_y`])), huella: [5, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    const enY = v.endsWith('_y'), base = enY ? v.slice(0, -2) : v, e = ESTILOS.find((x) => base.startsWith(x + '_'))!, pano = base.slice(e.length + 1), mat = ROCA[e];
    let n = 0; for (const c of base) n += c.charCodeAt(0); for (let i = n % 29; i > 0; i--) a.r();
    const roto = pano === 'roto';
    // el perfil de arriba: entero, o mordido en escalera hacia un lado si está roto
    const lado = a.r() < 0.5 ? -1 : 1;
    const alto = (x: number) => (roto ? Math.max(FILA * 2, H - Math.max(0, x * lado + 8) * 1.5 - (Math.abs(x) % 9)) : H);
    ps.push(a.caja(0, 0, 0, L, T + 5, 8, { mat, tono: -0.1 }));
    // hiladas de sillares a matajunta
    for (let f = 0, z = 8; z < H; f++, z += FILA) {
      const piezas = f % 2 ? [-32, -16, 0, 16, 32] : [-36, -24, -8, 8, 24, 36], w = f % 2 ? 16 : 16;
      for (const cx of piezas) {
        const ancho = f % 2 ? w : Math.abs(cx) === 36 ? 8 : w;
        if (z + FILA > alto(cx) + 1) continue;
        ps.push(a.caja(cx, 0, z, ancho - 0.9, T - (a.r() < 0.2 ? 0.8 : 0), FILA - 0.8, { mat, tono: (a.r() - 0.5) * 0.14 }));
      }
    }
    // el alma del muro (se ve en las juntas, más oscura)
    ps.push(a.caja(0, 0, 8, L - 1, T - 2.5, (roto ? FILA * 2 : H - 8) - 1, { mat, tono: -0.22 }));
    if (!roto) { ps.push(a.caja(0, 0, H, L, T + 4, 5, { mat, tono: 0.07 })); ps.push(a.caja(0, 0, H + 5, L, T + 1, 2.4, { mat, tono: -0.04 })); }
    if (pano === 'liso') ps.push(a.caja(0, 0, 60, L, T + 2.4, 3.4, { mat, tono: 0.09 }));
    if (pano === 'pilastras') for (const x of [-27, 27]) { ps.push(a.caja(x, 0, 0, 12, T + 8, 10, { mat, tono: -0.06 })); ps.push(a.caja(x, 0, 10, 9, T + 6, H - 14, { mat, tono: 0.03 })); ps.push(a.caja(x, 0, H - 4, 13, T + 9, 5, { mat, tono: 0.1 })); ps.push(a.caja(x, T / 2 + 3.4, 64, 3, 1, 10, { mat: RUNA[e] })); }
    if (pano === 'arco_ciego') {
      // hornacina con arco de medio punto: fondo en sombra, dovelas alrededor y la clave encendida
      ps.push(a.caja(0, T / 2, 8, 30, 9, 52, { mat: 'negro', resta: true })); ps.push(a.cilindro(0, T / 2, 60, 15, 9, { mat: 'negro', resta: true, eje: [0, 1, 0] as V3 }));
      ps.push(a.caja(0, T / 2 - 5, 8, 30, 1, 66, { mat, tono: -0.3 }));
      for (let i = 0; i <= 8; i++) { const g = (i / 8) * Math.PI; ps.push(a.caja(Math.cos(g) * 18.5, T / 2 + 0.6, 60 + Math.sin(g) * 18.5 - 3, 6, 2, 6, { mat: i === 4 ? RUNA[e] : mat, tono: i === 4 ? 0 : 0.1, incl: 90 - (g * 180) / Math.PI, inclEje: 'y' })); }
      for (const x of [-18.5, 18.5]) ps.push(a.caja(x, T / 2 + 0.6, 8, 6, 2, 50, { mat, tono: 0.08 }));
    }
    if (roto) for (let i = 0; i < 9; i++) ps.push(a.caja(lado * (8 + a.r() * 34), T / 2 + 5 + a.r() * 12, 0, 7 + a.r() * 5, 6 + a.r() * 3, 4 + a.r() * 4, { mat, giro: a.r() * 90, tono: (a.r() - 0.5) * 0.14 }));
    acento(a, ps, e, alto, roto);
    ps.push(a.caja(0, 0, -80, 900, 900, 80, { mat: 'roca', resta: true }));
    return enY ? girarPiezas(ps, 90) : ps;
  },
});
