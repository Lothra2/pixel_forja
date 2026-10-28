/**
 * Poses dibujadas a mano para los estilos que no tienen pose en el video: cada cuerpo está escrito con las mismas
 * clases del molde (K contorno, A piel, C/c ropa de arriba, D/d pantalón, L cinturón, B guante, P pie) y lleva
 * encima la cabeza de una pose del video (la de la guardia derecha, o la de la voltereta cuando va de cabeza), así
 * el familiar sale con su misma cabeza, gesto y rasgos. `recto` deja la cabeza derecha con el cuerpo acostado.
 */

interface MoldeMin { w: number; h: number; filas: string[]; cabeza: { k: number; chin: [number, number]; top: number; ancho: number; espalda: boolean; cara: number; frente?: boolean; recto?: boolean } | null; espejo: boolean }
interface Dibujo { cuerpo: string[]; cabeza: 'guardia' | 'volteada'; cx: number; cy: number; recto?: boolean }

const CUERPOS: Record<string, Dibujo> = {
  // Guile: el brazo barre de frente con la mano abierta
  sonic_brazo: { cabeza: 'guardia', cx: 0, cy: 0, cuerpo: [
    '..KKSSSSSSKKKSk......',
    '.KAAKKSKKKKKKK.......',
    '.KAAAKCCCCCKKKKKKKKKKK.',
    '.KAAAKCCCCCAAAAAAAMMMMK',
    '..KKAKCCCCCAAAAAAKKMMMK',
    '...KKKCCCCCKKKKKK..KKK.',
    '..KLLLCCCCCCK........',
    '..KDDLLLLLLLK........',
    '.KddDDDDLDDDK........',
    '.KDDdddddddddK.......',
    '.KDDDDKKKDDDDK.......',
    '..KDDDDK.KDDDDK......',
    '.KDPPPPK.KDPPPK......',
    '.KKKKKK..KKKKKK......',
  ] },
  // Blanka: agachado con los brazos abiertos, echando chispas
  electrico: { cabeza: 'guardia', cx: 0, cy: 0, cuerpo: [
    '..KKSSSSSSKKKSk....',
    'KKKKKKCCCCCKKKKKK..',
    'KAAAKKCCCCCKKAAAAK.',
    'KBBAAACCCCCAAAABBK.',
    'KBBKKKcCCCCKKKKBBK.',
    '.KK.KKLLLLLLKK.KK..',
    '...KDDDLLDDDDK.....',
    '..KdDDDKKKDDDDK....',
    '.KDDDDK..KDDDDDK...',
    '.KPPDDK..KDDPPPK...',
    '.KKKKKK..KKKKKKK...',
  ] },
  // Blanka: hecho bola, con las manos en las rodillas
  bola1: { cabeza: 'guardia', cx: 0, cy: 0, cuerpo: [
    '..KKSSSSSSKKKSk..',
    '..KKKKKKKKKKKKK..',
    '.KCCAAKKKKAAACK..',
    'KCCAAABBKKBBAACK.',
    'KCCAAABBKKBBAACK.',
    'KLLKKKDDDDDDKKLK.',
    'KDDDDDDddDDDDDDK.',
    '.KDDDPPPKKPPPDDK.',
    '.KKKPPPKKKKPPPKK.',
    '..KKKKK..KKKKK...',
  ] },
  bola2: { cabeza: 'guardia', cx: 0, cy: 0, cuerpo: [
    '..KKSSSSSSKKKSk..',
    '..KKKKKKKKKKKKK..',
    '.KCCAAKKKKAAACK..',
    'KCCAAABBKKBBAACK.',
    'KCCAAABBKKBBAACK.',
    'KLLKKKDDDDDDKKLK.',
    'KDDDDDDddDDDDDDK.',
    '.KDDPPPDKKDPPPDK.',
    '.KKPPPKKKKKKPPPK.',
    '..KKKKK..KKKKKK..',
  ] },
  // E. Honda: la palma abierta adelante (cien manos)
  palma1: { cabeza: 'guardia', cx: 0, cy: 0, cuerpo: [
    '..KKSSSSSSKKKSk......',
    '.KAAKKSKKKKKKK.......',
    '.KAAAKCCCCCKKKKKKKK....',
    '.KAAAKCCCCCAAAAAAAMKK..',
    '..KKAKCCCCCAAAAAAAMMMK.',
    '...KKKCCCCCKKKKKKKMMMK.',
    '..KLLLCCCCCCK....KKKK..',
    '..KDDLLLLLLLK........',
    '.KddDDDDLDDDK........',
    '.KDDdddddddddK.......',
    '.KDDDDKKKDDDDK.......',
    '..KDDDDK.KDDDDK......',
    '.KDPPPPK.KDPPPK......',
    '.KKKKKK..KKKKKK......',
  ] },
  palma2: { cabeza: 'guardia', cx: 0, cy: 0, cuerpo: [
    '..KKSSSSSSKKKSk......',
    '.KAAKKSKKKKKKK.......',
    '.KAAAKCCCCCKKKK........',
    '.KAAAKCCCCCKKKKKKKKK...',
    '..KKAKCCCCCAAAAAAAMKK..',
    '...KKKCCCCCAAAAAAAMMMK.',
    '..KLLLCCCCCCKKKKKKMMMK.',
    '..KDDLLLLLLLK....KKKK..',
    '.KddDDDDLDDDK........',
    '.KDDdddddddddK.......',
    '.KDDDDKKKDDDDK.......',
    '..KDDDDK.KDDDDK......',
    '.KDPPPPK.KDPPPK......',
    '.KKKKKK..KKKKKK......',
  ] },
  // Zangief: los dos brazos abiertos en cruz
  lariat1: { cabeza: 'guardia', cx: 1, cy: 0, cuerpo: [
    '...KKSSSSSSKKKSk......',
    'KKKKKKKKCCCCCKKKKKKKK.',
    'KBBAAAAAACCCCAAAAAABBK',
    'KBBAAAAAAcCCCAAAAAABBK',
    'KKKKKKKKKCCCCKKKKKKKK.',
    '........KLLLLK........',
    '.......KDDLLDDK.......',
    '......KDDDddDDDK......',
    '.....KDDDDKKDDDDK.....',
    '.....KDDDK..KDDDK.....',
    '....KDPPPK..KPPPDK....',
    '....KKKKKK..KKKKKK....',
  ] },
  lariat2: { cabeza: 'guardia', cx: 1, cy: 0, cuerpo: [
    '...KKSSSSSSKKKSk......',
    '.....KKKKCCCCCKKKK....',
    '..KKKKAAAACCCCAAAAKKK.',
    '.KBBAAAAAAcCCCAAAAABBK',
    '.KBBKKKKKKCCCCKKKKKBBK',
    '..KK....KLLLLK....KK..',
    '.......KDDLLDDK.......',
    '......KDDDddDDDK......',
    '.....KDDDDKKDDDDK.....',
    '.....KDDDK..KDDDK.....',
    '....KDPPPK..KPPPDK....',
    '....KKKKKK..KKKKKK....',
  ] },
  // Honda: el cabezazo, acostado en el aire con los puños atrás y la cabeza adelante
  torpedo_honda: { cabeza: 'guardia', cx: 17, cy: 0, recto: true, cuerpo: [
    '....................',
    '....................',
    '.......KKKKKKKKKKK..',
    '.....KKDDDLLCCCCCCK.',
    '...KKDDDdDLLCCKKKKK.',
    '.KKPDDDDDDLLCKBBAAAK',
    'KPPPDDdddDLLCKBBAAAK',
    'KPPPDDDDDDLLCCKKKKK.',
    '.KKKDDDdDDLLCCCCCCK.',
    '...KKDDDDDLLCCCCCK..',
    '.....KKKKKKKKKKKK...',
  ] },
  // Bison: el torpedo del Psycho Crusher, con los brazos estirados por delante de la cabeza
  torpedo_bison: { cabeza: 'guardia', cx: 17, cy: 0, recto: true, cuerpo: [
    '.........................................',
    '.........................................',
    '.......KKKKKKKKKKK.......................',
    '.....KKDDDLLCCCCCCK......................',
    '...KKDDDdDLLCCCCCCCK.....................',
    '.KKPDDDDDDLLCCCCCCCK.....................',
    'KPPPDDdddDLLCCCCCCCKKKKKKKKKKKKKKKKKKKK..',
    'KPPPDDDDDDLLCCCCCCAAAAAAAAAAAAAAAAAABBBK.',
    '.KKKDDDdDDLLCCCCCCAAAAAAAAAAAAAAAAAABBBK.',
    '...KKDDDDDLLCCCCCCKKKKKKKKKKKKKKKKKKKKK..',
    '.....KKKKKKKKKKKK........................',
  ] },
  // Chun-Li: de cabeza con las piernas abiertas (patada giratoria)
  giratoria1: { cabeza: 'volteada', cx: 2, cy: 9, cuerpo: [
    'KKKK..........KKKK',
    'KPPDK........KDPPK',
    '.KDDDK......KDDDK.',
    '..KDDDK....KDDDK..',
    '...KDDDKKKKDDDK...',
    '....KDDLLLLDDK....',
    '.....KCCCCCCK.....',
    '....KACCCCCCAK....',
    '....KAKCCCCKAK....',
    '.....KKKKKKKK.....',
  ] },
  giratoria2: { cabeza: 'volteada', cx: 2, cy: 9, cuerpo: [
    '......KKKKKK......',
    '....KKDPPPPDKK....',
    '...KDDDKKKKDDDK...',
    '...KDDDK..KDDDK...',
    '...KDDDKKKKDDDK...',
    '....KDDLLLLDDK....',
    '.....KCCCCCCK.....',
    '....KACCCCCCAK....',
    '....KAKCCCCKAK....',
    '.....KKKKKKKK.....',
  ] },
};

/** Arma los moldes: el cuerpo abajo, la cabeza del video encima (sus pixeles tapan al cuerpo). */
export function posesDibujadas(M: Record<string, MoldeMin>): Record<string, MoldeMin> {
  const guardia = M.h47, volteada = M.h7;
  // la cabeza de la guardia: las 12 filas de arriba; la volteada: la cabeza de la voltereta (filas 9 a 22, columnas 7 a 21)
  const cabezas = {
    guardia: { filas: guardia.filas.slice(0, 12).map((f) => f.slice(0, 17)), cara: 1 },
    volteada: { filas: volteada.filas.slice(9, 23).map((f) => f.slice(7, 22)), cara: -1 },
  };
  const out: Record<string, MoldeMin> = {};
  for (const [id, d] of Object.entries(CUERPOS)) {
    const cab = cabezas[d.cabeza];
    // en la guardia el cuerpo empieza justo bajo la cabeza (fila 12); de cabeza, el cuerpo va arriba y la cabeza en cy
    const by = d.cabeza === 'guardia' && !d.recto ? 12 : 0, hy = d.cabeza === 'guardia' && !d.recto ? 0 : d.cy;
    const bw = Math.max(...d.cuerpo.map((f) => f.length)), hw = Math.max(...cab.filas.map((f) => f.length));
    const w = Math.max(bw, d.cx + hw), h = Math.max(by + d.cuerpo.length, hy + cab.filas.length);
    const g: string[][] = Array.from({ length: h }, () => new Array<string>(w).fill('.'));
    d.cuerpo.forEach((f, y) => { for (let x = 0; x < f.length; x++) if (f[x] !== '.') g[by + y][x] = f[x]; });
    cab.filas.forEach((f, y) => { for (let x = 0; x < f.length; x++) if (f[x] !== '.') g[hy + y][d.cx + x] = f[x]; });
    out[id] = { w, h, filas: g.map((r) => r.join('')), cabeza: { ...(guardia.cabeza ?? { k: 0, chin: [8, 14], top: 2, ancho: 15, espalda: false }), cara: cab.cara, recto: d.recto }, espejo: false };
  }
  return out;
}
