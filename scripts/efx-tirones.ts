export {};
// Mide si un efecto de pixelfx va a tirones: cuánto cambia de un cuadro mostrado al siguiente (fracción de la masa
// visible que cambia, en alfa), en el arranque y en la cola, con su tiempo de siempre y con el arranque a 25 cps.
// Uso: IDS=fx_gran_explosion,fx_meteoro npx tsx scripts/efx-tirones.ts
// Variables: ARRANQUE (segundos de impacto que se miden, 0.5), VENTANA (desde,hasta a 25 cps si el catálogo no trae una)
const { EFECTOS_PFX, efectoPfx, pintarEfectoPfx, olvidarEfectosPfx } = await import('../src/engine/gotico/efectos_pfx.ts');
const ids = (process.env.IDS ?? '').split(',').filter(Boolean);
const A = +(process.env.ARRANQUE ?? 0.5);
/** salto entre dos cuadros: alfa que cambia / alfa media de los dos */
function salto(a: { data: Uint8ClampedArray }, b: { data: Uint8ClampedArray }): number {
  let d = 0, m = 0;
  for (let i = 3; i < a.data.length; i += 4) { d += Math.abs(a.data[i] - b.data[i]); m += (a.data[i] + b.data[i]) / 2; }
  return d / Math.max(1, m);
}
/** radio (px, como se dibuja) de lo que se ve, pesado por el alfa, desde el ancla: cuánto se abrió el efecto */
function radio(q: { w: number; h: number; data: Uint8ClampedArray }, ax: number, ay: number): number {
  let s = 0, m = 0;
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) { const a = q.data[(y * q.w + x) * 4 + 3]; if (a) { s += a * Math.hypot(x - ax, (y - ay) * 2); m += a; } }
  return s / Math.max(1, m);
}
function medir(id: string, desde: number): { t: number; n: number; arranque: number; cola: number; maximo: number; px: number } {
  const e = efectoPfx(id), cs = Array.from({ length: e.cuadros }, (_, f) => pintarEfectoPfx(id, 0, f)), fs = cs.map((c) => c.img);
  const ini: number[] = [], cola: number[] = [];
  let prev = 0, px = 0;
  for (let f = 1; f < fs.length; f++) {
    const s = salto(fs[f - 1], fs[f]);
    if (s === 0) continue; // repetido: no es un cambio que se vea
    const tp = (prev * e.t) / 25, enArranque = tp >= desde - 1e-6 && tp < desde + A;
    (enArranque ? ini : cola).push(s);
    if (enArranque) px = Math.max(px, Math.abs(radio(fs[f], ...cs[f].ancla) - radio(fs[prev], ...cs[prev].ancla)));
    prev = f;
  }
  const med = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
  return { t: e.t, n: e.cuadros, arranque: med(ini), cola: med(cola), maximo: Math.max(...ini, ...cola), px };
}
for (const id of ids) {
  const cfg = EFECTOS_PFX.find((c) => c.id === id)! as { rapido25?: [number, number] };
  const antes = cfg.rapido25, v = antes ?? (process.env.VENTANA ? (process.env.VENTANA.split(',').map(Number) as [number, number]) : ([0, A] as [number, number]));
  cfg.rapido25 = undefined; olvidarEfectosPfx(id);
  const a = medir(id, v[0]);
  cfg.rapido25 = v; olvidarEfectosPfx(id);
  const b = medir(id, v[0]);
  cfg.rapido25 = antes; olvidarEfectosPfx(id);
  const f = (x: number) => x.toFixed(2);
  console.log(`${id.padEnd(22)} 12.5 cps: arranque ${f(a.arranque)} cola ${f(a.cola)} salto ${a.px.toFixed(0)} px (${a.n}f) | arranque 25: arranque ${f(b.arranque)} cola ${f(b.cola)} salto ${b.px.toFixed(0)} px (${b.n}f t${b.t})`);
}
