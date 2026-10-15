import type { BigMap, Ent, Prop } from '../bosqueMap';
import { reachable } from '../bosqueMap';
import { TILE } from '../tiles';
import { hash } from '../puertoObjects';
import { pisoVivo, type InformePiso, type RecetaPiso } from './piso';
import type { Monumento } from './monumento';
import { FAUNA } from './fauna';
import { CELL, footprint, type Footprint } from '../premium/placer';

/**
 * Abyss premium: la pasada que le da vida a un mundo ya armado. No saca nada de lo que había: repinta el suelo (mismo
 * tamaño, misma colisión), agrega un monumento por zona donde no corta caminos, pone criaturas chicas y le da a cada
 * zona su luz (`rayos`, `grado`) y sus partículas.
 */

/** Las partículas que el juego ya conoce (los nombres que usan las zonas). */
export const PARTICULAS_ZONA = ['brasas', 'brasas_frias', 'brillos', 'ceniza', 'esporas', 'fuegos_fatuos', 'gotas', 'hojas', 'humo', 'luciernagas', 'luciernagas_turquesa', 'mariposas', 'murcielagos', 'nieve', 'polen', 'polvo', 'polvo_sueno', 'ventisca'] as const;

export interface LuzZona {
  /** "angulo,#color,densidad": ángulo en grados desde la vertical, densidad 0 a 1 (0 = sin rayos) */
  rayos: string;
  /** "#sombras,#luces,contraste,saturacion" */
  grado: string;
  particulas?: string;
  niebla?: number;
}

export interface RecetaMundo {
  mundo: string;
  piso: RecetaPiso;
  monumentos: () => Monumento[];
  /** la luz del mundo (si a una zona le falta algo, el juego usa esta) y lo de cada zona */
  luz: { mundo: LuzZona; zonas: Record<string, Partial<LuzZona>> };
  /** tipos de piso que son camino (la base no los pisa); por defecto [1]. En el Puerto todo el piso es tablas: [] */
  caminos?: number[];
  /** no tapar acantilados ni rampas con el cuerpo (el Bosque premium lo exige) */
  estricto?: boolean;
  /** color de la niebla de este mundo (jirones teñidos) */
  niebla?: string;
  /** cuántas criaturas nuevas poner (mínimo 8) */
  criaturas?: number;
}

export interface InformeAbyss {
  mundo: string;
  piso: InformePiso;
  monumentos: { zona: string; nombre: string; x: number; y: number; w: number; h: number; historia: string }[];
  sinLugar: string[];
  /** partículas de cada zona antes y después (las de antes se quedan todas) */
  particulas: Record<string, { antes: string; despues: string }>;
  /** el suelo quedó del mismo tamaño y con el mismo alfa (el agua sigue donde estaba) */
  mismoSuelo: boolean;
  /** cuadros que cambiaron de colisión (todos tienen que ser bases de monumentos que pasaron a sólido) */
  solidosNuevos: number[];
  criaturas: Record<string, number>;
  /** megapixeles de lo nuevo (monumentos con sus sombras y la fauna, todos los cuadros) */
  memoria: { monumentos: number; fauna: number; total: number };
  /** lo que se alcanzaba desde la llegada antes y después (cofres, fogatas, portales, arenas y zonas) */
  alcance: { antes: string[]; despues: string[] };
}

const SIN_TAPAR = new Set(['criatura']);
const OBJETIVOS = ['cofre', 'punto_guardado', 'portal_llegada', 'portal_volver', 'portal_jefe', 'arena_jefe'];

/** Las metas que se alcanzan desde la llegada: cada entidad objetivo (o un vecino, si la entidad es sólida) y cada zona. */
export function metasAlcanzables(m: BigMap): string[] {
  const ini = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
  const seen = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE));
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? -1 : y * m.w + x);
  const cerca = (tx: number, ty: number, r: number) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const k = at(tx + dx, ty + dy); if (k >= 0 && seen[k]) return true; } return false; };
  const out: string[] = [];
  m.entities.forEach((e, i) => { if (OBJETIVOS.includes(e.tipo) && cerca(Math.floor(e.x / TILE), Math.floor(e.y / TILE), 1)) out.push(`${e.tipo}#${i}`); });
  for (const z of m.zones) {
    let ok = false;
    for (let y = Math.floor(z.y / TILE); y < (z.y + z.h) / TILE && !ok; y++) for (let x = Math.floor(z.x / TILE); x < (z.x + z.w) / TILE; x++) { const k = at(x, y); if (k >= 0 && seen[k]) { ok = true; break; } }
    if (ok) out.push(`zona:${z.nombre}`);
  }
  return out;
}

const mp = (n: number) => Math.round(n / 1e4) / 100;

export function vidaAbyss<T extends BigMap>(m: T, rc: RecetaMundo): T & { abyss: InformeAbyss } {
  const W = m.w, H = m.h;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
  const antes = metasAlcanzables(m);
  const ini = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
  const reach0 = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE));

  // ---------- 1. el piso ----------
  const alfa = (d: Uint8ClampedArray) => { let h = 0; for (let i = 3; i < d.length; i += 4) h = (Math.imul(h, 31) + d[i]) | 0; return h; };
  const alfaAntes = alfa(m.terrain.img.data), tamAntes = [m.terrain.img.w, m.terrain.img.h];
  const solidoAntes = new Uint8Array(m.solid);
  const piso = pisoVivo(m.terrain, rc.piso);

  // ---------- 2. los monumentos ----------
  const mons = rc.monumentos();
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  // lo que no se puede tapar ni pisar: entidades (con aire alrededor), parches de grietas o hielo fino, mareas, arenas.
  // Dos niveles: el estricto, y uno con menos aire para las zonas chicas (nunca tapa ni corta nada: eso lo mira el BFS)
  // el último nivel (pared) es para los rincones secretos chicos: el monumento se apoya contra la pared del fondo, con la
  // base sobre roca que ya era sólida (no cambia la colisión) y un cuadro caminable de la zona justo delante
  const NIVELES = [{ ent: 2, arena: 96, camino: 1, aire: 1, pared: false }, { ent: 1, arena: 24, camino: 0, aire: 1, pared: false }, { ent: 1, arena: 24, camino: 0, aire: 0, pared: false }, { ent: 1, arena: 24, camino: 0, aire: 0, pared: true }];
  const vetos = NIVELES.map(() => new Uint8Array(W * H)), caminos = NIVELES.map(() => new Uint8Array(W * H));
  const marcaEn = (v: Uint8Array, tx: number, ty: number, r: number) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const k = at(tx + dx, ty + dy); if (k >= 0) v[k] = 1; } };
  const marca = (tx: number, ty: number, r: number) => vetos.forEach((v) => marcaEn(v, tx, ty, r));
  const puntos: [number, number][] = [];
  for (const e of m.entities) {
    if (SIN_TAPAR.has(e.tipo)) continue;
    const w = Number(e.props?.width ?? 0), h = Number(e.props?.height ?? 0);
    if (w && h) { for (let y = Math.floor(e.y / TILE) - 1; y <= (e.y + h) / TILE + 1; y++) for (let x = Math.floor(e.x / TILE) - 1; x <= (e.x + w) / TILE + 1; x++) marca(x, y, 0); continue; }
    NIVELES.forEach((nv, i) => marcaEn(vetos[i], Math.floor(e.x / TILE), Math.floor(e.y / TILE), nv.ent));
    puntos.push([e.x, e.y]);
    if (e.tipo === 'arena_jefe') NIVELES.forEach((nv, i) => { const R = (Number(e.props?.radio ?? 192) + nv.arena) / TILE; const n = Math.ceil(R); for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if (dx * dx + dy * dy <= R * R) marcaEn(vetos[i], Math.floor(e.x / TILE) + dx, Math.floor(e.y / TILE) + dy, 0); });
  }
  for (const c of m.cristales ?? []) { marca(Math.floor(c.x / TILE), Math.floor((c.y - 1) / TILE), 1); puntos.push([c.x, c.y]); }
  if (m.marea) for (let i = 0; i < W * H; i++) if (m.marea.baja[i] || m.marea.alta[i]) vetos.forEach((v) => { v[i] = 1; });
  // los caminos: la base no los pisa (en el nivel estricto, ni el cuadro de al lado)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((rc.caminos ?? [1]).includes(m.terrain.tileKind[at(x, y)])) NIVELES.forEach((nv, i) => marcaEn(caminos[i], x, y, nv.camino));
  const veto = vetos[0];
  // huellas de lo que ya está parado en el mapa (cuerpo y pie en celdas de 4 px, como el colocador premium):
  // un monumento no le tapa el pie a nadie, nadie le tapa el pie a él y dos cuerpos se pisan poco (12 %)
  const GW = Math.ceil((W * TILE) / CELL), GH = Math.ceil((H * TILE) / CELL);
  const fps = new Map<string, Footprint>();
  const fpOf = (n: string) => { let f = fps.get(n); if (!f) { f = footprint(byName.get(n)!); fps.set(n, f); } return f; };
  const celdas = (cs: [number, number][], px: number, py: number) => cs.map(([cx, cy]) => [Math.floor(px / CELL) + cx, Math.floor(py / CELL) + cy] as [number, number]).filter(([gx, gy]) => gx >= 0 && gy >= 0 && gx < GW && gy < GH).map(([gx, gy]) => gy * GW + gx);
  const cuerpoDe = new Map<number, number[]>(), pieDe = new Map<number, number>(), areas: number[] = [];
  const registrar = (sprite: string, px: number, py: number) => {
    const f = fpOf(sprite), id = areas.length;
    areas.push(f.body.length);
    for (const g of celdas(f.body, px, py)) { const l = cuerpoDe.get(g); if (l) l.push(id); else cuerpoDe.set(g, [id]); }
    for (const g of celdas(f.foot, px, py)) pieDe.set(g, id);
  };
  for (const d of m.decos) { const o = byName.get(d.sprite); if (o && !o.layer && d.sprite !== 'telarana') registrar(d.sprite, d.x, d.y); }
  /** ¿la base parte en más pedazos el piso caminable de la ventana alrededor? */
  const partePasillo = (base: number[], x0: number, y0: number, x1: number, y1: number) => {
    const enBase = new Set(base);
    const comps = (bloquea: boolean) => {
      const seen = new Set<number>();
      let n = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const k = at(x, y);
        if (k < 0 || m.solid[k] || enBase.has(k) || seen.has(k)) continue;
        n++;
        const q = [k]; seen.add(k);
        while (q.length) {
          const c = q.pop()!, cx = c % W, cy = Math.floor(c / W);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const X = cx + dx, Y = cy + dy, j = at(X, Y);
            if (X < x0 || X > x1 || Y < y0 || Y > y1 || j < 0 || m.solid[j] || seen.has(j) || (bloquea && enBase.has(j))) continue;
            if (!bloquea && enBase.has(j)) { seen.add(j); q.push(j); continue; }
            seen.add(j); q.push(j);
          }
        }
      }
      return n;
    };
    return comps(true) > comps(false);
  };
  const pocoAlcance = reach0.reduce((s, v) => s + v, 0);
  let alcanceActual = pocoAlcance;
  const informeMon: InformeAbyss['monumentos'] = [], sinLugar: string[] = [];
  for (const mo of mons) {
    const o = mo.obj, z = m.zones.find((zz) => zz.nombre === mo.zona);
    if (!z) throw new Error(`${rc.mundo}: monumento ${o.name} para una zona que no existe: ${mo.zona}`);
    const sol = o.solid!;
    if (!byName.has(o.name)) byName.set(o.name, o);
    let puesto = false;
    for (let nivel = 0; nivel < NIVELES.length && !puesto; nivel++) {
    const veto = vetos[nivel], camino = caminos[nivel];
    const cands: { px: number; py: number; score: number; tiles: number[] }[] = [];
    const zx0 = Math.floor(z.x / TILE), zy0 = Math.floor(z.y / TILE), zx1 = Math.floor((z.x + z.w) / TILE), zy1 = Math.floor((z.y + z.h) / TILE);
    const zcx = z.x + z.w / 2, zcy = z.y + z.h / 2;
    for (let ty = zy0 + (NIVELES[nivel].pared ? 0 : 1); ty < zy1; ty++) for (let tx = zx0 + 1; tx < zx1; tx++) {
      for (const dxp of [0, 16]) {
        const px = tx * TILE + dxp, py = ty * TILE + TILE - 4;
        const ix0 = px - o.anchor[0], iy0 = py - o.anchor[1], ix1 = ix0 + o.w, iy1 = iy0 + o.h;
        if (ix0 < 0 || iy0 < 0 || ix1 > W * TILE || iy1 > H * TILE) continue;
        // la base: cuadros sólidos nuevos, todos caminables y alcanzables hoy, sin vetos ni caminos, con aire alrededor
        const bx0 = Math.floor((px + sol[0]) / TILE), bx1 = Math.floor((px + sol[0] + sol[2] - 1) / TILE), by0 = Math.floor((py + sol[1]) / TILE), by1 = Math.floor((py + sol[1] + sol[3] - 1) / TILE);
        const tiles: number[] = [];
        let bien = true;
        const aire = NIVELES[nivel].aire;
        if (NIVELES[nivel].pared) {
          // toda la base es pared (sólida, sin agua) y delante hay piso caminable de la zona, alcanzable y sin vetos
          for (let x = bx0; x <= bx1 && bien; x++) for (let y = by0; y <= by1; y++) { const k = at(x, y); if (k < 0 || !m.solid[k] || m.terrain.waterTiles[k]) { bien = false; break; } }
          const delante = at(Math.floor(px / TILE), by1 + 1);
          if (bien && (delante < 0 || m.solid[delante] || !reach0[delante] || py + TILE > z.y + z.h || py < z.y)) bien = false;
          if (!bien) continue;
        } else
        for (let y = by0 - aire; y <= by1 + aire && bien; y++) for (let x = bx0 - aire; x <= bx1 + aire; x++) {
          const k = at(x, y);
          if (k < 0 || m.solid[k] || veto[k] || m.terrain.waterTiles[k]) { bien = false; break; }
          const base = y >= by0 && y <= by1 && x >= bx0 && x <= bx1;
          if (base) { if (!reach0[k] || (camino[k] && nivel < 2) || m.terrain.tileKind[k] === 3 || m.terrain.tileKind[k] === 6) { bien = false; break; } tiles.push(k); }
        }
        if (!bien) continue;
        // no parte el piso de alrededor: lo caminable cerca de la base sigue unido sin dar la vuelta (no tapa pasillos)
        if (tiles.length && partePasillo(tiles, bx0 - 2, by0 - 2, bx1 + 2, by1 + 2)) continue;
        // nunca en un puente ni en un istmo: agua (o lava) a los dos lados, cerca
        const aguaHacia = (dx: number, dy: number) => { for (let r = 1; r <= 4; r++) { const k = at(Math.floor(px / TILE) + dx * r, Math.floor((py - 1) / TILE) + dy * r); if (k >= 0 && m.terrain.waterTiles[k]) return true; } return false; };
        if ((aguaHacia(0, -1) && aguaHacia(0, 1)) || (aguaHacia(-1, 0) && aguaHacia(1, 0))) continue;
        // no tapa entidades ni cristales con la imagen
        if (puntos.some(([ex, ey]) => ex >= ix0 - 8 && ex <= ix1 + 8 && ey >= iy0 - 8 && ey <= iy1 + 8)) continue;
        // huella: no pisa pies, no le pisan el pie, poco solape de cuerpos (y en los mundos estrictos, no tapa acantilados)
        const f = fpOf(o.name), cuerpo = celdas(f.body, px, py), pie = new Set(celdas(f.foot, px, py));
        let mal = false, tapa = 0;
        const solape = new Map<number, number>();
        for (const g of cuerpo) {
          if (pieDe.has(g)) { mal = true; break; }
          if (rc.estricto) { const k = m.terrain.kind[Math.floor(g / GW) * CELL * W * TILE + (g % GW) * CELL + 2 * W * TILE + 2]; if (k === 3 || k === 5) { mal = true; break; } }
          for (const j of cuerpoDe.get(g) ?? []) { solape.set(j, (solape.get(j) ?? 0) + 1); tapa++; if (pie.has(g)) mal = true; }
        }
        if (mal) continue;
        for (const [j, n2] of solape) if (n2 > Math.ceil(Math.min(areas[j], f.body.length) * 0.12)) { mal = true; break; }
        if (mal) continue;
        const frac = tapa / Math.max(1, f.body.length);
        // cerca de un camino (a 2-5 cuadros) y no en el borde de la zona
        let dc = 9;
        for (let r = 1; r <= 8 && dc === 9; r++) for (let dy = -r; dy <= r && dc === 9; dy++) for (let dx = -r; dx <= r; dx++) { const k = at(tx + dx, ty + dy); if (k >= 0 && (rc.caminos ?? [1]).includes(m.terrain.tileKind[k])) { dc = r; break; } }
        // junto al agua si lo pide (a 2 o 3 cuadros de la orilla)
        let da = 0;
        if (mo.prefiere === 'agua') { da = 9; for (let r = 1; r <= 8 && da === 9; r++) for (let dy = -r; dy <= r && da === 9; dy++) for (let dx = -r; dx <= r; dx++) { const k = at(tx + dx, ty + dy); if (k >= 0 && m.terrain.waterTiles[k]) { da = r; break; } } }
        // lejos de los otros monumentos (cada uno es el punto de su lugar): a menos de 5 cuadros no, a menos de 12 cuesta
        const cerca = informeMon.reduce((mn, q) => Math.min(mn, Math.hypot(q.x - px, q.y - py) / TILE), 99);
        if (cerca < 5) continue;
        // no dentro de otra zona más chica (no le tapa el lugar a otra)
        const ajena = m.zones.some((o2) => o2 !== z && o2.w * o2.h < z.w * z.h && px >= o2.x && px <= o2.x + o2.w && py >= o2.y && py <= o2.y + o2.h);
        const score = frac * 3 + (mo.prefiere === 'agua' ? Math.abs(da - 2.5) * 0.3 : Math.abs(dc - 3) * 0.12) + (ajena ? 1.5 : 0) + Math.max(0, 12 - cerca) * 0.15 + Math.hypot((px - zcx) / z.w, (py - zcy) / z.h) * 0.8 + hash(tx, ty, 5) * 0.05;
        cands.push({ px, py, score, tiles });
      }
    }
    cands.sort((a, b) => a.score - b.score);
    for (const c of cands.slice(0, 40)) {
      // ¿corta algo? lo que se alcanzaba tiene que seguir alcanzándose (menos la base misma)
      const guard = c.tiles.map((k) => m.solid[k]);
      for (const k of c.tiles) m.solid[k] = 1;
      const r1 = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE));
      const n1 = r1.reduce((s, v) => s + v, 0);
      if (n1 === alcanceActual - c.tiles.length) {
        alcanceActual = n1;
        if (!m.objects.includes(o)) m.objects.push(o);
        m.decos.push({ sprite: o.name, x: c.px, y: c.py });
        registrar(o.name, c.px, c.py);
        for (const k of c.tiles) vetos.forEach((v) => { v[k] = 1; });
        marca(Math.floor(c.px / TILE), Math.floor(c.py / TILE), 2);
        informeMon.push({ zona: mo.zona, nombre: o.name, x: c.px, y: c.py, w: o.w, h: o.h, historia: mo.historia });
        puesto = true;
        break;
      }
      c.tiles.forEach((k, i) => { m.solid[k] = guard[i]; });
    }
    }
    if (!puesto) sinLugar.push(`${mo.zona} (${o.name})`);
  }

  // ---------- 3. las criaturas nuevas: cerca de los monumentos y de los caminos ----------
  const especies = FAUNA[rc.mundo]?.() ?? [];
  const reachF = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE));
  const ocupado = new Uint8Array(W * H);
  for (const e of m.entities) { const k = at(Math.floor(e.x / TILE), Math.floor(e.y / TILE)); if (k >= 0) ocupado[k] = 1; }
  const criaturas: Record<string, number> = {};
  const quiero = Math.max(8, rc.criaturas ?? 12);
  const puestos: [number, number][] = [];
  const libre = (x: number, y: number) => { const k = at(x, y); return k >= 0 && reachF[k] && !m.solid[k] && !ocupado[k] && !veto[k] && !m.terrain.waterTiles[k] && puestos.every(([a, b]) => Math.abs(a - x) + Math.abs(b - y) >= 4); };
  // alrededor de cada monumento (en anillo) y después a lo largo de los caminos
  const semillas: [number, number][] = informeMon.map((p) => [Math.floor(p.x / TILE), Math.floor(p.y / TILE)]);
  for (let k = 0; k < 400 && semillas.length < 40; k++) { const x = Math.floor(hash(k, 1, 77) * W), y = Math.floor(hash(k, 2, 77) * H); if (m.terrain.tileKind[at(x, y)] === 1 || (reachF[at(x, y)] && hash(k, 3, 77) < 0.2)) semillas.push([x, y]); }
  let n = 0;
  for (let vuelta = 0; vuelta < 3 && n < quiero; vuelta++) for (const [sx, sy] of semillas) {
    if (n >= quiero || !especies.length) break;
    let hecho = false;
    for (let r = 2; r <= 5 && !hecho; r++) for (let a = 0; a < 12 && !hecho; a++) {
      const ang = (a / 12) * Math.PI * 2 + hash(sx, sy, vuelta) * 6, x = Math.round(sx + Math.cos(ang) * r), y = Math.round(sy + Math.sin(ang) * r);
      if (!libre(x, y)) continue;
      const sp = especies[n % especies.length];
      const ent: Ent = { tipo: 'criatura', x: x * TILE + TILE / 2 + Math.round((hash(x, y, 4) - 0.5) * 12), y: y * TILE + TILE / 2, props: { especie: sp.name } };
      m.entities.push(ent);
      ocupado[at(x, y)] = 1; puestos.push([x, y]);
      criaturas[sp.name] = (criaturas[sp.name] ?? 0) + 1;
      n++; hecho = true;
    }
  }

  // ---------- 4. luz y partículas por zona ----------
  const particulas: Record<string, { antes: string; despues: string }> = {};
  for (const z of m.zones) {
    const antesP = String(z.props.particulas ?? '');
    const l = { ...rc.luz.mundo, ...(rc.luz.zonas[z.nombre] ?? {}) };
    const p: Record<string, Prop> = { ...z.props, rayos: l.rayos, grado: l.grado };
    if (rc.luz.zonas[z.nombre]?.particulas) p.particulas = rc.luz.zonas[z.nombre]!.particulas!;
    if (rc.luz.zonas[z.nombre]?.niebla !== undefined) p.niebla = rc.luz.zonas[z.nombre]!.niebla!;
    z.props = p;
    particulas[z.nombre] = { antes: antesP, despues: String(p.particulas ?? '') };
  }

  // ---------- informe ----------
  const pxObj = (o: Monumento['obj']) => Object.values(o.anims).reduce((s, a) => s + a.frames.length * o.w * o.h, 0) + (o.shadow ? o.w * o.h : 0);
  const memMon = mons.filter((mo) => informeMon.some((p) => p.nombre === mo.obj.name)).reduce((s, mo) => s + pxObj(mo.obj), 0);
  const memFauna = especies.reduce((s, e) => s + Object.values(e.anims).reduce((t, a) => t + a.frames.length * e.w * e.h, 0), 0);
  const despues = metasAlcanzables(m);
  const solidosNuevos: number[] = [];
  for (let i = 0; i < W * H; i++) if (m.solid[i] !== solidoAntes[i]) solidosNuevos.push(m.solid[i] ? i : -i - 1);
  const abyss: InformeAbyss = { mundo: rc.mundo, piso, particulas, mismoSuelo: alfa(m.terrain.img.data) === alfaAntes && m.terrain.img.w === tamAntes[0] && m.terrain.img.h === tamAntes[1], solidosNuevos, monumentos: informeMon, sinLugar, criaturas, memoria: { monumentos: mp(memMon), fauna: mp(memFauna), total: mp(memMon + memFauna) }, alcance: { antes, despues } };
  return Object.assign(m, { abyss });
}
