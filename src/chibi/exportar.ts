import { familiar, MIEMBROS, TRAJES, NOMBRE_MIEMBRO, NOMBRE_TRAJE, paqueteChibi, hojaChibi, type ChibiLook, type Talla, type Grupo } from '../engine/chibi';
import { h, lienzo, tr, lang } from './dibujo';

/**
 * Exportar para juegos: se eligen los muñecos (la familia con sus trajes, los tuyos y el de la tienda), las tallas y
 * los grupos de animaciones; sale un zip con la hoja de sprites, el manifest con tiempos y cajas, los efectos y la sombra.
 */
interface Ctx { look: () => ChibiLook; mios: () => ChibiLook[] }

export function montarExportar(s: HTMLElement, ctx: Ctx) {
  const elegidos = new Set<string>(['actual']);
  const tallas = new Set<Talla>([32]);
  const grupos = new Set<Grupo>(['pelea', 'beat', 'arriba', 'deporte']);
  const salida = h('div', { class: 'salida' });
  const lista = () => {
    const out: [string, string, () => ChibiLook][] = [['actual', lang === 'es' ? 'El muñeco de la tienda' : 'The shop chibi', ctx.look]];
    ctx.mios().forEach((m, i) => out.push([`mio${i}`, m.nombre, () => m]));
    for (const id of MIEMBROS) for (const tj of TRAJES) out.push([`${id}:${tj}`, `${NOMBRE_MIEMBRO[id]} · ${tr(NOMBRE_TRAJE[tj])}`, () => familiar(id, tj)]);
    return out;
  };
  const caja = (on: boolean, txt: string, f: (v: boolean) => void) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: on, onchange: (e: Event) => f((e.target as HTMLInputElement).checked) }), txt);
  const munecos = h('div', { class: 'export-lista' });
  const pintarLista = () => { munecos.innerHTML = ''; for (const [k, n] of lista()) munecos.append(caja(elegidos.has(k), n, (v) => (v ? elegidos.add(k) : elegidos.delete(k)))); };
  pintarLista();
  const NG: Record<Grupo, [string, string]> = { pelea: ['Pelea (calcada del video)', 'Fighting (video-traced)'], beat: ["Beat'em up", "Beat'em up"], arriba: ['Desde arriba 8 direcciones', 'Top-down 8 directions'], deporte: ['Deportes', 'Sports'] };
  s.append(h('h2', {}, lang === 'es' ? 'Exportar para juegos' : 'Export for games'),
    h('p', { class: 'nota' }, lang === 'es'
      ? 'Cada muñeco sale con su hoja de sprites (una fila por animación), manifest.json (cuadros, ticks a 60 por segundo, avance, altura, cajas de golpe y de daño, efectos y sonidos), las tiras de efectos y la sombra. Sirve para Phaser, Godot, Unity o un canvas propio.'
      : 'Each chibi ships with its sprite sheet (one row per animation), manifest.json (frames, ticks at 60 fps, travel, height, hit and hurt boxes, effects and sounds), effect strips and the shadow. Works with Phaser, Godot, Unity or your own canvas.'),
    h('div', { class: 'export' },
      h('div', {}, h('h4', {}, lang === 'es' ? 'Muñecos' : 'Chibis'), munecos),
      h('div', {},
        h('h4', {}, lang === 'es' ? 'Tallas' : 'Sizes'),
        caja(true, lang === 'es' ? '32 px (como el video)' : '32 px (like the video)', (v) => (v ? tallas.add(32) : tallas.delete(32))),
        caja(false, lang === 'es' ? 'Grande ×2 (Scale2x)' : 'Large ×2 (Scale2x)', (v) => (v ? tallas.add(48) : tallas.delete(48))),
        h('h4', {}, lang === 'es' ? 'Animaciones' : 'Animations'),
        ...(Object.keys(NG) as Grupo[]).map((gk) => caja(true, tr(NG[gk]), (v) => (v ? grupos.add(gk) : grupos.delete(gk)))),
        h('div', { class: 'fila' }, h('button', { class: 'btn', onclick: () => generar() }, lang === 'es' ? 'Armar el paquete' : 'Build package')),
      )),
    salida);
  function generar() {
    salida.innerHTML = '';
    const looks = lista().filter(([k]) => elegidos.has(k)).map(([, , f]) => f());
    if (!looks.length || !tallas.size || !grupos.size) { salida.append(h('p', { class: 'nota' }, lang === 'es' ? 'Elige al menos un muñeco, una talla y un grupo.' : 'Pick at least one chibi, one size and one group.')); return; }
    const { zip, archivos } = paqueteChibi(looks, [...tallas], [...grupos]);
    const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
    const a = h('a', { href: url, download: 'munecos_chibi.zip', class: 'btn' }, lang === 'es' ? 'Descargar el zip' : 'Download zip');
    a.click();
    const { hoja, manifest } = hojaChibi(looks[0], [...tallas][0], [...grupos]);
    const c = lienzo(hoja);
    const img = h('img', { src: c.toDataURL('image/png'), class: 'px hoja-prev', alt: 'hoja de sprites' });
    salida.append(
      h('p', { class: 'nota' }, lang === 'es'
        ? `Listo: ${looks.length} muñeco(s), ${archivos.length} archivos, ${Math.round(zip.length / 1024)} KB. Si no se descargó solo, usa el botón. Abajo, la hoja del primero (mantén presionado o clic derecho para guardarla).`
        : `Done: ${looks.length} chibi(s), ${archivos.length} files, ${Math.round(zip.length / 1024)} KB. If it did not download, use the button. Below, the first sheet (long-press or right-click to save it).`),
      a, h('div', { class: 'hoja-wrap' }, img),
      h('details', {}, h('summary', {}, 'manifest.json'), h('pre', {}, JSON.stringify({ ...manifest, animaciones: Object.fromEntries(Object.entries(manifest.animaciones).slice(0, 3)) }, null, 1) + '\n…')));
  }
}
