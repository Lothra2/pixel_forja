import {
  ASSETS, CATEGORIAS, asset, pintarAsset, escenarios, cuadroElemento, paqueteEscenario, clipsDe, pintarClip, NOMBRES_CAPA,
  type ChibiLook, type Escenario, type Elemento, type CuadroPintado, type Clip,
} from '../engine/chibi';
import { h, canvasPixel, dibujar, lienzo, tr, lang, alTick, guardar, leer, guardarArchivo, botonArchivo } from './dibujo';

/**
 * El taller de escenarios: se arranca de un escenario listo (o de cero), se arrastran assets desde la paleta a la
 * capa elegida, se mueven, se espejan, se cambian de variante y de semilla, se ajusta el parallax de cada capa y se
 * prueba caminando con tu muñeco. Exporta el paquete por capas (lo quieto en una imagen, lo animado en tiras).
 */

interface Ctx { look: () => ChibiLook }

export function montarTaller(s: HTMLElement, ctx0: Ctx) {
  const listos = escenarios();
  const copia = (e: Escenario): Escenario => JSON.parse(JSON.stringify(e));
  let esc: Escenario = copia(leer<Escenario | null>('pf.chibi.escena', null) ?? listos[0]);
  let capaSel = 3; // el piso
  let sel: Elemento | null = null;
  let probando = false;
  let cam = 0, tick = 0;
  const ESC = 2;
  const vista = canvasPixel(esc.w, esc.h, ESC, 'taller-canvas');
  const g = vista.getContext('2d')!;
  const memo = () => guardar('pf.chibi.escena', esc);

  // ---- arriba: escenarios listos, probar, exportar
  const selListo = h('select', { onchange: () => { const e = listos.find((x) => x.id === selListo.value); if (e) { esc = copia(e); sel = null; pintarCapas(); props(); memo(); } } },
    h('option', { value: '' }, lang === 'es' ? 'Cargar un escenario listo…' : 'Load a ready stage…'), ...listos.map((e) => h('option', { value: e.id }, tr(e.nombre))));
  const btnProbar = h('button', { class: 'btn', onclick: () => { probando = !probando; btnProbar.textContent = probando ? (lang === 'es' ? 'Volver a editar' : 'Back to editing') : (lang === 'es' ? 'Probar caminando' : 'Test walking'); jugador.x = 60; cam = 0; vista.focus(); } }, lang === 'es' ? 'Probar caminando' : 'Test walking');
  const salida = h('div', { class: 'salida' });
  const btnExport = h('button', { class: 'btn sec2', onclick: () => exportar() }, lang === 'es' ? 'Exportar paquete' : 'Export package');
  const barra = h('div', { class: 'arena-bar' }, selListo,
    h('button', { class: 'chip', onclick: () => { esc = { id: 'mio', nombre: ['Mi escenario', 'My stage'], w: 480, h: 180, piso: 156, capas: NOMBRES_CAPA.map((n, i) => ({ nombre: n, parallax: [0.1, 0.35, 0.7, 1, 1.25][i], elementos: [] })) }; esc.capas[0].elementos.push({ id: 'cielo', v: 'dia', x: 240, y: 180 }); esc.capas[3].elementos.push({ id: 'piso', v: 'calle', x: 240, y: 204 }); sel = null; pintarCapas(); props(); memo(); } }, lang === 'es' ? 'Empezar de cero' : 'Start empty'),
    btnProbar, btnExport);

  // ---- paleta de assets
  const paleta = h('div', { class: 'paleta' });
  let catSel = 'casas';
  const pintarPaleta = () => {
    paleta.innerHTML = '';
    paleta.append(h('div', { class: 'chips' }, ...CATEGORIAS.map(([k, es, en]) => h('button', { class: 'chip' + (k === catSel ? ' on' : ''), onclick: () => { catSel = k; pintarPaleta(); } }, lang === 'es' ? es : en))));
    const grid = h('div', { class: 'assets' });
    for (const a of ASSETS.filter((x) => x.cat === catSel)) for (const v of a.variantes) {
      const img = pintarAsset(a.id, v, 0, a.ancho ? 120 : 0, 1);
      const c = canvasPixel(48, 48, 1.5, 'asset-mini');
      const k = Math.min(1, 46 / Math.max(img.w, img.h));
      const cx = c.getContext('2d')!; cx.imageSmoothingEnabled = false;
      cx.drawImage(lienzo(img), 0, 0, img.w, img.h, Math.round((48 - img.w * k) / 2), Math.round(48 - img.h * k), Math.round(img.w * k), Math.round(img.h * k));
      const b = h('button', { class: 'asset', draggable: 'true', title: `${tr(a.nombre)} · ${v}` }, c, h('span', {}, v.replace(/_/g, ' ')));
      b.addEventListener('dragstart', (e) => { e.dataTransfer?.setData('text/plain', JSON.stringify({ id: a.id, v })); });
      // tocar también agrega (en el teléfono no hay arrastre)
      b.addEventListener('click', () => agregar(a.id, v, esc.w / 2 + cam, a.ancho ? esc.h : esc.piso));
      grid.append(b);
    }
    paleta.append(grid);
  };
  const agregar = (id: string, v: string, x: number, y: number) => {
    const a = asset(id);
    const e: Elemento = { id, v, x: a.ancho ? esc.w / 2 : Math.round(x), y: Math.round(y), seed: Math.floor(Math.random() * 20) + 1 };
    esc.capas[capaSel].elementos.push(e);
    sel = e; pintarCapas(); props(); memo();
  };
  vista.addEventListener('dragover', (e) => e.preventDefault());
  vista.addEventListener('drop', (e) => {
    e.preventDefault();
    const d = e.dataTransfer?.getData('text/plain');
    if (!d) return;
    const { id, v } = JSON.parse(d);
    const [x, y] = punto(e);
    agregar(id, v, x + cam * esc.capas[capaSel].parallax, y);
  });

  // ---- capas
  const capasEl = h('div', { class: 'capas' });
  const pintarCapas = () => {
    capasEl.innerHTML = '';
    capasEl.append(h('h4', {}, lang === 'es' ? 'Capas (la de arriba se dibuja al final)' : 'Layers (top one is drawn last)'));
    [...esc.capas].map((c, i) => [c, i] as const).reverse().forEach(([c, i]) => {
      capasEl.append(h('div', { class: 'capa' + (i === capaSel ? ' on' : ''), onclick: () => { capaSel = i; pintarCapas(); } },
        h('b', {}, c.nombre), h('small', {}, `${c.elementos.length}`),
        h('label', {}, 'parallax', h('input', { type: 'number', step: '0.05', min: '0', max: '2', value: String(c.parallax), onclick: (e: Event) => e.stopPropagation(), onchange: (e: Event) => { c.parallax = Number((e.target as HTMLInputElement).value); memo(); } }))));
    });
  };

  // ---- propiedades del elemento elegido
  const propsEl = h('div', { class: 'props' });
  const props = () => {
    propsEl.innerHTML = '';
    if (!sel) { propsEl.append(h('p', { class: 'nota' }, lang === 'es' ? 'Toca un elemento del escenario para moverlo o cambiarlo. Arrastra desde la paleta para agregar (o tócalo y cae en la capa elegida).' : 'Tap an element to move or change it. Drag from the palette to add (or tap it to drop it on the chosen layer).')); return; }
    const e = sel, a = asset(e.id);
    propsEl.append(h('h4', {}, `${tr(a.nombre)}`),
      h('label', {}, lang === 'es' ? 'Variante' : 'Variant', h('select', { onchange: (ev: Event) => { e.v = (ev.target as HTMLSelectElement).value; memo(); } }, ...a.variantes.map((v) => h('option', { value: v, selected: v === e.v }, v)))),
      h('div', { class: 'fila' },
        h('button', { class: 'chip', onclick: () => { e.espejo = !e.espejo; memo(); } }, lang === 'es' ? 'Espejar' : 'Flip'),
        h('button', { class: 'chip', onclick: () => { e.seed = Math.floor(Math.random() * 99) + 1; memo(); } }, lang === 'es' ? 'Otra semilla' : 'Reroll'),
        h('button', { class: 'chip', onclick: () => { const c = esc.capas.find((k) => k.elementos.includes(e))!; c.elementos.push({ ...e, x: e.x + 20 }); memo(); pintarCapas(); } }, lang === 'es' ? 'Duplicar' : 'Duplicate'),
        h('button', { class: 'chip', onclick: () => mover(-1) }, lang === 'es' ? 'Capa atrás' : 'Layer back'),
        h('button', { class: 'chip', onclick: () => mover(1) }, lang === 'es' ? 'Capa adelante' : 'Layer front'),
        h('button', { class: 'chip rojo', onclick: () => { for (const c of esc.capas) c.elementos = c.elementos.filter((k) => k !== e); sel = null; props(); pintarCapas(); memo(); } }, lang === 'es' ? 'Borrar' : 'Delete')),
      h('p', { class: 'nota' }, `x ${e.x} · y ${e.y}`));
  };
  const mover = (d: number) => {
    if (!sel) return;
    const i = esc.capas.findIndex((c) => c.elementos.includes(sel!));
    const j = Math.max(0, Math.min(esc.capas.length - 1, i + d));
    if (i === j) return;
    esc.capas[i].elementos = esc.capas[i].elementos.filter((k) => k !== sel);
    esc.capas[j].elementos.push(sel); capaSel = j; pintarCapas(); memo();
  };

  // ---- elegir y arrastrar en el lienzo
  const punto = (e: MouseEvent | PointerEvent): [number, number] => { const r = vista.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * esc.w, ((e.clientY - r.top) / r.height) * esc.h]; };
  let arrastre: { e: Elemento; dx: number; dy: number } | null = null;
  vista.addEventListener('pointerdown', (ev) => {
    if (probando) return;
    const [x, y] = punto(ev);
    // busca de adelante hacia atrás
    for (let ci = esc.capas.length - 1; ci >= 0; ci--) {
      const c = esc.capas[ci];
      const off = -Math.round(cam * c.parallax);
      for (let k = c.elementos.length - 1; k >= 0; k--) {
        const e = c.elementos[k];
        if (asset(e.id).ancho) continue;
        const img = cuadroElemento(e, 0, esc.w);
        const x0 = e.x - img.w / 2 + off, y0 = e.y - img.h;
        if (x >= x0 && x < x0 + img.w && y >= y0 && y < e.y) {
          const px = Math.floor(e.espejo ? img.w - 1 - (x - x0) : x - x0), py = Math.floor(y - y0);
          if (!img.data[(py * img.w + px) * 4 + 3]) continue;
          sel = e; capaSel = ci; arrastre = { e, dx: x - e.x, dy: y - e.y };
          vista.setPointerCapture(ev.pointerId);
          props(); pintarCapas();
          return;
        }
      }
    }
    sel = null; props();
  });
  vista.addEventListener('pointermove', (ev) => { if (!arrastre) return; const [x, y] = punto(ev); arrastre.e.x = Math.round(x - arrastre.dx); arrastre.e.y = Math.round(y - arrastre.dy); });
  vista.addEventListener('pointerup', () => { if (arrastre) { arrastre = null; props(); memo(); } });
  window.addEventListener('keydown', (ev) => {
    if (s.hidden || !sel || probando) return;
    if ((ev.target as HTMLElement)?.tagName === 'INPUT') return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { for (const c of esc.capas) c.elementos = c.elementos.filter((k) => k !== sel); sel = null; props(); pintarCapas(); memo(); }
    const paso = ev.shiftKey ? 8 : 1, e2 = sel;
    if (!e2) return;
    if (ev.key === 'ArrowLeft') { e2.x -= paso; ev.preventDefault(); } if (ev.key === 'ArrowRight') { e2.x += paso; ev.preventDefault(); }
    if (ev.key === 'ArrowUp') { e2.y -= paso; ev.preventDefault(); } if (ev.key === 'ArrowDown') { e2.y += paso; ev.preventDefault(); }
  });

  // ---- probar: el muñeco camina, salta y la cámara corre con parallax
  const teclas: Record<string, boolean> = {};
  window.addEventListener('keydown', (e) => { if (probando && !s.hidden) { teclas[e.code] = true; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); } });
  window.addEventListener('keyup', (e) => { teclas[e.code] = false; });
  const jugador = { x: 60, mira: 1, clip: null as Clip | null, cuadros: [] as CuadroPintado[], i: 0, t: 0 };
  const ponerJ = (id: string) => {
    const L = ctx0.look();
    if (jugador.clip?.id === id && jugador.cuadros.length) return;
    jugador.clip = clipsDe(L).find((c) => c.id === id)!;
    jugador.cuadros = pintarClip(L, 32, jugador.clip); jugador.i = 0; jugador.t = 0;
  };

  const pintar = () => {
    tick++;
    g.fillStyle = '#5aa8f0'; g.fillRect(0, 0, esc.w, esc.h);
    for (const [ci, c] of esc.capas.entries()) {
      const off = -Math.round(cam * c.parallax);
      for (const e of c.elementos) {
        const img = cuadroElemento(e, tick, esc.w);
        dibujar(g, img, Math.round(e.x - img.w / 2) + off, Math.round(e.y - img.h), e.espejo);
        if (e === sel && !probando) { g.strokeStyle = '#f4c430'; g.lineWidth = 1; g.setLineDash([2, 2]); g.strokeRect(Math.round(e.x - img.w / 2) + off + 0.5, Math.round(e.y - img.h) + 0.5, img.w - 1, img.h - 1); g.setLineDash([]); }
      }
      // el muñeco va en la capa del piso
      if (c.nombre === 'piso' || (ci === 3 && !esc.capas.some((k) => k.nombre === 'piso'))) {
        if (probando) {
          const izq = teclas.ArrowLeft || teclas.KeyA, der = teclas.ArrowRight || teclas.KeyD;
          if (teclas.ArrowUp || teclas.KeyW || teclas.Space) ponerJ('saltar');
          else if (jugador.clip?.id !== 'saltar' || jugador.i >= jugador.cuadros.length - 1) ponerJ(izq || der ? 'caminar' : 'reposo');
          if (izq) jugador.mira = -1; if (der) jugador.mira = 1;
          const q = jugador.cuadros[jugador.i];
          if (izq || der) jugador.x += 1.1 * jugador.mira;
          jugador.x = Math.max(10, Math.min(esc.w - 10, jugador.x));
          jugador.t++; if (jugador.t >= q.t) { jugador.t = 0; jugador.i = (jugador.i + 1) % jugador.cuadros.length; }
          cam += (Math.max(0, Math.min(esc.w - 320, jugador.x - 160)) - cam) * 0.1;
          const sx = jugador.x - cam;
          g.fillStyle = 'rgba(40,20,30,0.3)'; g.beginPath(); g.ellipse(Math.round(sx), esc.piso + 0.5, 8, 2, 0, 0, Math.PI * 2); g.fill();
          const esp = jugador.mira < 0;
          dibujar(g, q.img, esp ? sx - (q.img.w - q.ancla[0]) : sx - q.ancla[0], esc.piso - q.ancla[1] - q.dy, esp);
        } else {
          g.strokeStyle = 'rgba(255,255,255,0.35)'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(0, esc.piso + 0.5); g.lineTo(esc.w, esc.piso + 0.5); g.stroke(); g.setLineDash([]);
        }
      }
    }
    if (probando) { g.strokeStyle = 'rgba(244,196,48,0.8)'; g.strokeRect(0.5, 0.5, 319, esc.h - 1); }
  };

  const exportar = () => {
    salida.innerHTML = '';
    const zip = paqueteEscenario(esc);
    void guardarArchivo(`escenario_${esc.id}.zip`, zip);
    const a = botonArchivo(`escenario_${esc.id}.zip`, zip);
    const img = vista.toDataURL('image/png');
    salida.append(h('p', { class: 'nota' }, lang === 'es'
      ? `Paquete listo (${Math.round(zip.length / 1024)} KB): una imagen por capa con lo quieto, tiras para lo que se mueve y escenario.json con el parallax y el piso. Si tu navegador no descargó, usa este botón:`
      : `Package ready (${Math.round(zip.length / 1024)} KB): one image per layer for static art, strips for animated art and escenario.json with parallax and floor. If nothing downloaded, use this button:`), a,
      h('details', {}, h('summary', {}, 'escenario.json'), h('pre', {}, JSON.stringify(esc, null, 1))),
      h('img', { src: img, class: 'px vista-prev', alt: 'vista previa' }));
  };

  s.append(h('h2', {}, lang === 'es' ? 'Taller de escenarios' : 'Stage workshop'),
    h('p', { class: 'nota' }, lang === 'es'
      ? 'Todo lo de la paleta lo dibuja el motor en el mismo estilo de los muñecos. El agua, las banderas, el vapor de la olla, los árboles y el público se mueven solos.'
      : 'Everything in the palette is drawn by the engine in the same style as the chibis. Water, flags, steam, trees and the crowd animate on their own.'),
    barra, h('div', { class: 'taller' }, h('div', { class: 'taller-izq' }, h('div', { class: 'taller-vista' }, vista), propsEl, salida), h('div', { class: 'taller-der' }, capasEl, paleta)));
  pintarPaleta(); pintarCapas(); props();
  alTick(() => { if (!s.hidden && s.isConnected) pintar(); });
}
