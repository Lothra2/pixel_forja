import {
  REGISTRO, TEMAS, PISOS, PAISAJES, AMBIENTES, pintarObjeto, pintarPiso, pintarMapa, medidas, pantallaACelda, celdaAPantalla, crearMapa, generarPaisaje,
  paqueteMapa, paqueteCatalogo, CELDA, DIRS, type MapaGotico, type ObjEnMapa, type AmbienteId, type Dir,
} from '../engine/gotico';
import type { Raster } from '../engine/core/raster';
import { h, tr, lang, alTick, guardar, leer, guardarArchivo, botonArchivo } from './dibujo';

/**
 * El taller gótico: assets isométricos con las proporciones de los juegos de rol oscuros de 1999 (piso en rombos
 * de 160×80, persona de 75 px). Paleta por temas, mapa para poner pisos y objetos, paisajes armados (cementerio,
 * cueva, templo...), luz de ambiente con fuegos que alumbran, un héroe que camina en 8 direcciones con su antorcha
 * y exportación del mapa, de un tema o del catálogo entero.
 */

const T = (es: string, en: string) => (lang === 'es' ? es : en);
type Pincel = { tipo: 'piso'; id: string; v: number } | { tipo: 'objeto'; id: string; v: string } | { tipo: 'borrar' } | { tipo: 'elegir' };

export function montarGotico(s: HTMLElement) {
  let mapa: MapaGotico = leer<MapaGotico | null>('pf.gotico.mapa', null) ?? generarPaisaje('cementerio', 1);
  // si el mapa guardado usa objetos que ya no existen, se limpian
  mapa.objetos = mapa.objetos.filter((o) => REGISTRO.some((d) => d.id === o.id));
  let semilla = 1;
  let pincel: Pincel = { tipo: 'elegir' };
  let sel: ObjEnMapa | null = null;
  let zoom = 1, cuadricula = false, animar = true, antorcha = true, sucio = true;
  let cursor: [number, number] | null = null;
  const memo = () => guardar('pf.gotico.mapa', mapa);

  // ---- el lienzo del mapa
  const lienzo = document.createElement('canvas');
  lienzo.className = 'px gotico-mapa';
  const ctx = lienzo.getContext('2d')!;
  const ajustar = () => {
    const { w, h: hh } = medidas(mapa); lienzo.width = w; lienzo.height = hh; lienzo.style.width = `${w * zoom}px`; lienzo.style.height = `${hh * zoom}px`; ctx.imageSmoothingEnabled = false; sucio = true;
    // la vista arranca centrada en el mapa (arriba queda aire para lo alto de los objetos)
    requestAnimationFrame(() => { vista.scrollLeft = Math.max(0, (w * zoom - vista.clientWidth) / 2); vista.scrollTop = Math.max(0, (hh * zoom - vista.clientHeight) / 2 + 80 * zoom); });
  };
  const aviso = h('div', { class: 'gotico-aviso' }, T('Pintando el paisaje… (la primera vez de cada asset tarda un poco)', 'Rendering the landscape… (each asset takes a moment the first time)'));
  const vista = h('div', { class: 'gotico-vista' }, lienzo, aviso);
  let esperar = 1; // cuadros de reloj para que el aviso se vea antes de pintar algo pesado
  const punto = (e: MouseEvent): [number, number] => { const r = lienzo.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * lienzo.width, ((e.clientY - r.top) / r.height) * lienzo.height]; };

  // ---- héroe: camina hacia donde se hace clic con la tecla H o en modo héroe, en 8 direcciones
  const heroe = { activo: false, clase: 'per_templario', x: 40, y: 40, meta: null as [number, number] | null, dir: 's' as Dir };
  const rumbo = (dx: number, dy: number): Dir => {
    // ángulo sobre el piso: 0 = +x (abajo a la derecha en pantalla)
    const a = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const tabla: Dir[] = ['se', 's', 'so', 'o', 'no', 'n', 'ne', 'e'];
    return tabla[Math.round(a / 45) % 8];
  };

  // ---- pintar
  let cuadro = 0, ultimoCuadro = -1, ultimo: Raster | null = null;
  const pintar = () => {
    const extra: ObjEnMapa[] = [];
    if (heroe.activo) extra.push({ id: `${heroe.clase}_${heroe.meta ? 'caminar' : 'quieto'}`, v: heroe.dir, seed: 1, cx: heroe.x / CELDA - 0.5, cy: heroe.y / CELDA - 0.5 });
    const m2 = extra.length ? { ...mapa, objetos: [...mapa.objetos, ...extra] } : mapa;
    let luz: [number, number] | null = null;
    if (antorcha) luz = heroe.activo ? celdaAPantalla(mapa, heroe.x / CELDA - 0.5, heroe.y / CELDA - 0.5) : cursor;
    if (luz && heroe.activo) luz = [luz[0], luz[1] - 30];
    ultimo = pintarMapa(m2, { cuadro, antorcha: luz, cuadricula, marcar: sel });
    const img = ctx.createImageData(ultimo.w, ultimo.h);
    img.data.set(ultimo.data);
    ctx.putImageData(img, 0, 0);
    sucio = false;
  };

  // ---- interacción con el mapa
  const objetoEn = (px: number, py: number): ObjEnMapa | null => {
    const orden = [...mapa.objetos].sort((a, b) => b.cx + b.cy - (a.cx + a.cy));
    for (const o of orden) {
      const r = pintarObjeto(o.id, o.v, 0, o.seed);
      const [sx, sy] = celdaAPantalla(mapa, o.cx, o.cy);
      const x = Math.floor(px - (sx - r.ancla[0])), y = Math.floor(py - (sy - r.ancla[1]));
      if (x < 0 || y < 0 || x >= r.img.w || y >= r.img.h) continue;
      const a = r.img.data[(y * r.img.w + x) * 4 + 3];
      if (a > 200) return o;
    }
    return null;
  };
  let arrastre: { o: ObjEnMapa; dx: number; dy: number } | null = null;
  lienzo.addEventListener('pointerdown', (e) => {
    const [px, py] = punto(e);
    const c = pantallaACelda(mapa, px, py);
    if (heroe.activo) { heroe.meta = [c.cx * CELDA + 8, c.cy * CELDA + 8]; return; }
    if (pincel.tipo === 'piso') {
      if (c.bx < 0 || c.by < 0 || c.bx >= mapa.ancho || c.by >= mapa.alto) return;
      mapa.pisos[c.by * mapa.ancho + c.bx] = { id: pincel.id, v: pincel.v }; memo(); sucio = true; return;
    }
    if (pincel.tipo === 'objeto') {
      if (c.cx < 0 || c.cy < 0 || c.cx >= mapa.ancho * 5 || c.cy >= mapa.alto * 5) return;
      const o = { id: pincel.id, v: pincel.v, seed: 1 + Math.floor(Math.random() * 60), cx: c.cx, cy: c.cy };
      mapa.objetos.push(o); sel = o; memo(); sucio = true; props(); return;
    }
    const o = objetoEn(px, py);
    if (pincel.tipo === 'borrar') { if (o) { mapa.objetos = mapa.objetos.filter((k) => k !== o); if (sel === o) sel = null; memo(); sucio = true; props(); } return; }
    sel = o; props(); sucio = true;
    if (o) { arrastre = { o, dx: c.cx - o.cx, dy: c.cy - o.cy }; lienzo.setPointerCapture(e.pointerId); }
  });
  lienzo.addEventListener('pointermove', (e) => {
    const [px, py] = punto(e);
    cursor = [px, py];
    if (antorcha && !heroe.activo) sucio = true;
    if (!arrastre) return;
    const c = pantallaACelda(mapa, px, py);
    const nx = c.cx - arrastre.dx, ny = c.cy - arrastre.dy;
    if (nx !== arrastre.o.cx || ny !== arrastre.o.cy) { arrastre.o.cx = nx; arrastre.o.cy = ny; sucio = true; }
  });
  lienzo.addEventListener('pointerup', () => { if (arrastre) { arrastre = null; memo(); props(); } });
  lienzo.addEventListener('pointerleave', () => { cursor = null; if (antorcha) sucio = true; });
  window.addEventListener('keydown', (ev) => {
    if (s.hidden || !s.isConnected) return;
    const tag = (ev.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT') return;
    if (!sel) return;
    // las flechas mueven por los ejes del piso: arriba/abajo una celda en y, izquierda/derecha una celda en x
    const mov: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (mov[ev.key]) { sel.cx += mov[ev.key][0]; sel.cy += mov[ev.key][1]; ev.preventDefault(); memo(); sucio = true; props(); }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { mapa.objetos = mapa.objetos.filter((k) => k !== sel); sel = null; memo(); sucio = true; props(); }
  });

  // ---- propiedades del objeto elegido
  const propsEl = h('div', { class: 'props gotico-props' });
  const props = () => {
    propsEl.innerHTML = '';
    if (!sel) {
      propsEl.append(h('p', { class: 'nota' }, T('Elige un asset de la paleta y toca el mapa para ponerlo. Con «Elegir» tocas un objeto para moverlo (arrástralo o usa las flechas), cambiarle la variante o borrarlo. Los pisos se pintan por baldosa.',
        'Pick an asset from the palette and tap the map to place it. With «Select» tap an object to move it (drag or arrow keys), change its variant or delete it. Floors paint one tile at a time.')));
      return;
    }
    const o = sel, d = REGISTRO.find((x) => x.id === o.id)!;
    const r = pintarObjeto(o.id, o.v, 0, o.seed);
    propsEl.append(h('h4', {}, tr(d.nombre)),
      h('p', { class: 'nota' }, `${r.img.w}×${r.img.h} px · ${T('huella', 'footprint')} ${(d.huella ?? [1, 1]).join('×')} ${T('celdas', 'cells')} · ${d.cuadros ?? 1} ${T('cuadros', 'frames')} · ${T('celda', 'cell')} ${o.cx},${o.cy}`),
      h('label', {}, T('Variante', 'Variant'), h('select', { onchange: (ev: Event) => { o.v = (ev.target as HTMLSelectElement).value; memo(); sucio = true; props(); } }, ...d.variantes.map((v) => h('option', { value: v, selected: v === o.v }, v.replace(/_/g, ' '))))),
      h('div', { class: 'fila' },
        h('button', { class: 'chip', onclick: () => { o.seed = 1 + Math.floor(Math.random() * 99); memo(); sucio = true; props(); } }, T('Otra semilla', 'Reroll')),
        h('button', { class: 'chip', onclick: () => { const n = { ...o, cx: o.cx + 2 }; mapa.objetos.push(n); sel = n; memo(); sucio = true; props(); } }, T('Duplicar', 'Duplicate')),
        h('button', { class: 'chip rojo', onclick: () => { mapa.objetos = mapa.objetos.filter((k) => k !== o); sel = null; memo(); sucio = true; props(); } }, T('Borrar', 'Delete'))));
  };

  // ---- paleta: pisos y temas, con miniaturas que se pintan de a poco
  const paleta = h('div', { class: 'paleta gotico-paleta' });
  let temaSel: string = 'pisos';
  const cola: (() => void)[] = [];
  const mini = (img: Raster, ax: number | null, ay: number | null, caja = 64): HTMLCanvasElement => {
    const c = document.createElement('canvas'); c.width = caja; c.height = caja; c.className = 'px asset-mini';
    const g = c.getContext('2d')!; g.imageSmoothingEnabled = false;
    const k = Math.min(1, (caja - 4) / Math.max(img.w, img.h));
    const tmp = document.createElement('canvas'); tmp.width = img.w; tmp.height = img.h;
    const ti = tmp.getContext('2d')!.createImageData(img.w, img.h); ti.data.set(img.data); tmp.getContext('2d')!.putImageData(ti, 0, 0);
    void ax; void ay;
    g.drawImage(tmp, 0, 0, img.w, img.h, Math.round((caja - img.w * k) / 2), Math.round(caja - 2 - img.h * k), Math.round(img.w * k), Math.round(img.h * k));
    return c;
  };
  const marcarPincel = () => { for (const b of paleta.querySelectorAll<HTMLElement>('.asset')) b.classList.toggle('on', b.dataset.k === clavePincel()); };
  const clavePincel = () => (pincel.tipo === 'piso' ? `p|${pincel.id}|${pincel.v}` : pincel.tipo === 'objeto' ? `o|${pincel.id}|${pincel.v}` : pincel.tipo);
  const pintarPaleta = () => {
    paleta.innerHTML = ''; cola.length = 0;
    const temas: [string, string][] = [['pisos', T('Pisos', 'Floors')], ...TEMAS.filter(([k]) => REGISTRO.some((d) => d.tema === k)).map(([k, es, en]) => [k, `${lang === 'es' ? es : en} (${REGISTRO.filter((d) => d.tema === k).length})`] as [string, string])];
    paleta.append(h('div', { class: 'chips' }, ...temas.map(([k, n]) => h('button', { class: 'chip' + (k === temaSel ? ' on' : ''), onclick: () => { temaSel = k; pintarPaleta(); } }, n))));
    const grid = h('div', { class: 'assets' });
    const boton = (k: string, titulo: string, sub: string, hacer: () => Raster, alElegir: () => void) => {
      const hueco = h('div', { class: 'asset-mini vacio' });
      const b = h('button', { class: 'asset', title: titulo, 'data-k': k, onclick: () => { alElegir(); marcarPincel(); } }, hueco, h('span', {}, sub));
      cola.push(() => { if (!b.isConnected) return; const c = mini(hacer(), null, null); hueco.replaceWith(c); });
      grid.append(b);
    };
    if (temaSel === 'pisos') {
      for (const p of PISOS) for (let v = 0; v < Math.min(p.variantes, 2); v++) boton(`p|${p.id}|${v}`, tr(p.nombre), `${tr(p.nombre)}${p.variantes > 1 ? ' ' + (v + 1) : ''}`, () => pintarPiso(p.id, v, 0), () => { pincel = { tipo: 'piso', id: p.id, v }; });
    } else {
      for (const d of REGISTRO.filter((x) => x.tema === temaSel)) {
        const vs = temaSel === 'personajes' || temaSel === 'monstruos' ? [d.variantes[0]] : d.variantes;
        for (const v of vs) boton(`o|${d.id}|${v}`, `${tr(d.nombre)} · ${v}`, vs.length > 1 ? `${tr(d.nombre)} · ${v.replace(/_/g, ' ')}` : tr(d.nombre), () => pintarObjeto(d.id, v, 0, 3).img, () => { pincel = { tipo: 'objeto', id: d.id, v }; });
      }
    }
    paleta.append(grid);
    marcarPincel();
  };

  // ---- barra de arriba
  const selPaisaje = h('select', {}, ...PAISAJES.map((p) => h('option', { value: p.id }, tr(p.nombre))));
  const selAmb = h('select', { onchange: () => { mapa.ambiente = selAmb.value as AmbienteId; memo(); sucio = true; } }, ...Object.entries(AMBIENTES).map(([k, a]) => h('option', { value: k, selected: k === mapa.ambiente }, tr(a.nombre))));
  const cargar = (m: MapaGotico) => { mapa = m; sel = null; selAmb.value = m.ambiente; memo(); ajustar(); props(); aviso.hidden = false; esperar = 2; };
  const selTam = h('select', {}, ...[[4, 4], [5, 5], [6, 6], [8, 8], [10, 10]].map(([a, b]) => h('option', { value: `${a}x${b}` }, `${a}×${b} ${T('baldosas', 'tiles')}`)));
  const selPisoNuevo = h('select', {}, ...PISOS.map((p) => h('option', { value: p.id }, tr(p.nombre))));
  const selClase = h('select', { onchange: () => { heroe.clase = selClase.value; sucio = true; } }, ...REGISTRO.filter((d) => d.id.endsWith('_quieto')).map((d) => { const id = d.id.replace(/_quieto$/, ''); return h('option', { value: id, selected: id === heroe.clase }, tr(d.nombre).split(' · ')[0]); }));
  const herramienta = (tipo: 'elegir' | 'borrar', txt: string) => h('button', { class: 'chip' + (tipo === 'elegir' ? ' on' : ''), onclick: (e: Event) => { pincel = { tipo }; marcarPincel(); for (const b of barraH.querySelectorAll('.chip')) b.classList.toggle('on', b === e.currentTarget); } }, txt);
  const barraH = h('div', { class: 'chips' }, herramienta('elegir', T('Elegir y mover', 'Select & move')), herramienta('borrar', T('Borrar', 'Erase')));
  const check = (txt: string, val: boolean, f: (v: boolean) => void) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: val, onchange: (e: Event) => { f((e.target as HTMLInputElement).checked); sucio = true; } }), txt);
  const btnHeroe = h('button', { class: 'btn sec2', onclick: () => { heroe.activo = !heroe.activo; btnHeroe.textContent = heroe.activo ? T('Volver a editar', 'Back to editing') : T('Caminar con el héroe', 'Walk with the hero'); const { w } = medidas(mapa); void w; heroe.x = mapa.ancho * 40; heroe.y = mapa.alto * 40; heroe.meta = null; sucio = true; } }, T('Caminar con el héroe', 'Walk with the hero'));
  const salida = h('div', { class: 'salida' });
  const exportar = async (que: 'mapa' | 'tema' | 'todo') => {
    salida.innerHTML = '';
    const estado = h('p', { class: 'nota' }, T('Preparando…', 'Preparing…'));
    salida.append(estado);
    await new Promise((r) => setTimeout(r, 30));
    let zip: Uint8Array, nombre: string;
    if (que === 'mapa') { zip = paqueteMapa(mapa); nombre = `mapa_gotico_${mapa.nombre.replace(/\W+/g, '_').toLowerCase()}.zip`; }
    else {
      const temas = que === 'tema' && temaSel !== 'pisos' ? [temaSel] : null;
      zip = await paqueteCatalogo(temas, (a, b) => { estado.textContent = `${T('Pintando', 'Rendering')} ${a} / ${b}`; });
      nombre = temas ? `gotico_${temas[0]}.zip` : 'gotico_catalogo_completo.zip';
    }
    estado.textContent = `${nombre} · ${Math.round(zip.length / 1024)} KB`;
    void guardarArchivo(nombre, zip);
    salida.append(botonArchivo(nombre, zip));
  };
  const barra = h('div', { class: 'arena-bar gotico-barra' },
    h('label', {}, T('Paisaje', 'Landscape'), selPaisaje),
    h('button', { class: 'btn', onclick: () => { semilla++; cargar(generarPaisaje(selPaisaje.value, semilla)); } }, T('Armar paisaje', 'Build landscape')),
    h('label', {}, T('Mapa vacío', 'Empty map'), selTam, selPisoNuevo),
    h('button', { class: 'chip', onclick: () => { const [a, b] = selTam.value.split('x').map(Number); cargar(crearMapa(a, b, selPisoNuevo.value, T('Mi mapa', 'My map'))); } }, T('Crear', 'Create')),
    h('label', {}, T('Ambiente', 'Mood'), selAmb),
    check(T('Antorcha', 'Torch'), antorcha, (v) => { antorcha = v; }),
    check(T('Animar', 'Animate'), animar, (v) => { animar = v; }),
    check(T('Celdas', 'Grid'), cuadricula, (v) => { cuadricula = v; }),
    check('×2', zoom === 2, (v) => { zoom = v ? 2 : 1; ajustar(); }),
  );
  const barra2 = h('div', { class: 'arena-bar gotico-barra' }, barraH,
    h('label', {}, T('Héroe', 'Hero'), selClase), btnHeroe,
    h('button', { class: 'btn sec2', onclick: () => void exportar('mapa') }, T('Exportar mapa', 'Export map')),
    h('button', { class: 'btn sec2', onclick: () => void exportar('tema') }, T('Exportar este tema', 'Export this theme')),
    h('button', { class: 'btn sec2', onclick: () => void exportar('todo') }, T('Exportar todo el catálogo', 'Export whole catalog')));

  const total = REGISTRO.length, variantes = REGISTRO.reduce((n, d) => n + d.variantes.length, 0), pisosN = PISOS.reduce((n, p) => n + p.variantes, 0);
  s.append(h('h2', {}, T('Taller gótico', 'Gothic workshop')),
    h('p', { class: 'nota' }, T(
      `Assets isométricos originales con las proporciones de los juegos de rol oscuros de 1999: piso en rombos de 160×80 (5×5 celdas de 32×16) y personas de 75 px. ${total} assets con ${variantes} variantes y ${PISOS.length} pisos con ${pisosN} variantes, todo dibujado por el motor como render previo. Arma un paisaje, ponle cosas, camina con el héroe y exporta para tu juego.`,
      `Original isometric assets in the proportions of the dark 1999 action RPGs: 160×80 floor diamonds (5×5 cells of 32×16) and 75 px people. ${total} assets with ${variantes} variants and ${PISOS.length} floors with ${pisosN} variants, all pre-rendered by the engine. Build a landscape, add things, walk the hero and export for your game.`)),
    barra, barra2,
    h('div', { class: 'gotico' }, h('div', { class: 'gotico-izq' }, vista, propsEl, salida), h('div', { class: 'gotico-der' }, paleta)));
  ajustar(); pintarPaleta(); props();
  selPaisaje.value = PAISAJES[0].id;

  // ---- reloj: miniaturas de a poco, animación a ~8 cuadros por segundo, el héroe camina
  let t = 0;
  alTick(() => {
    if (s.hidden || !s.isConnected) return;
    // miniaturas: unos milisegundos por tick
    const t0 = performance.now();
    while (cola.length && performance.now() - t0 < 10) cola.shift()!();
    t++;
    if (heroe.activo) {
      if (heroe.meta) {
        const dx = heroe.meta[0] - heroe.x, dy = heroe.meta[1] - heroe.y, d = Math.hypot(dx, dy);
        if (d < 1.5) heroe.meta = null;
        else { heroe.dir = rumbo(dx, dy); heroe.x += (dx / d) * 0.9; heroe.y += (dy / d) * 0.9; }
        sucio = true;
      }
    }
    if (animar && t % 7 === 0) { cuadro++; sucio = true; }
    if (esperar > 0) { esperar--; return; }
    if (sucio && (t % 2 === 0 || !animar)) { if (cuadro !== ultimoCuadro || sucio) { pintar(); ultimoCuadro = cuadro; aviso.hidden = true; } }
  });
  void DIRS;
}
