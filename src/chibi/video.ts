import { cuadroRepeticion, REP, type PintorLuchador } from '../engine/chibi/repeticion';
import { pintorFamilia } from '../engine/chibi/repeticionFamilia';
import { familiar, MIEMBROS, TRAJES, NOMBRE_MIEMBRO, NOMBRE_TRAJE, type MiembroId, type TrajeId } from '../engine/chibi/family';
import { h, canvasPixel, lang, alTick } from './dibujo';

/**
 * La pelea del video reconstruida: cada cuadro sale del muelle por capas y de los dibujos calcados de Ryu y Ken en su
 * pixel exacto. Se puede pausar, ir cuadro por cuadro y verla lenta para comparar con el original.
 */
export function montarVideo(s: HTMLElement) {
  const es = lang === 'es';
  const lienzo = canvasPixel(REP.ancho, REP.alto, 2, 'video');
  const g = lienzo.getContext('2d')!;
  const img = g.createImageData(REP.ancho, REP.alto);
  let k = 0, jugando = true, vel = 1, acum = 0, hud = true, letreros = true, pintado = -1;
  // quién pelea: Ryu y Ken del video, o dos de la familia haciendo lo mismo cuadro por cuadro
  let conFamilia = false, pintor: PintorLuchador | undefined, nombres: [string, string] | undefined;
  const lados: [MiembroId, TrajeId][] = [['rick', 'pelea'], ['steph', 'pelea']];
  const vestir = () => {
    if (conFamilia) {
      const [a, b] = lados.map(([m, tj]) => familiar(m, tj));
      pintor = pintorFamilia({ ryu: a, ken: b }); nombres = [a.nombre, b.nombre];
    } else { pintor = undefined; nombres = undefined; }
    pintado = -1; pintar();
  };
  const elegir = (n: 0 | 1) => {
    const selM = h('select', { onchange: () => { lados[n][0] = selM.value as MiembroId; vestir(); } },
      ...MIEMBROS.filter((m) => m !== 'thor').map((m) => h('option', { value: m, selected: m === lados[n][0] }, NOMBRE_MIEMBRO[m]))) as HTMLSelectElement;
    const selT = h('select', { onchange: () => { lados[n][1] = selT.value as TrajeId; vestir(); } },
      ...TRAJES.map((tj) => h('option', { value: tj, selected: tj === lados[n][1] }, NOMBRE_TRAJE[tj][es ? 0 : 1]))) as HTMLSelectElement;
    return h('label', { class: 'check' }, n === 0 ? (es ? 'En lugar de Ryu' : 'Instead of Ryu') : (es ? 'En lugar de Ken' : 'Instead of Ken'), selM, selT);
  };
  const eleccion = h('div', { class: 'chips', hidden: true }, elegir(0), elegir(1));
  const chipQuien = (fam: boolean, txt: string) => h('button', { class: 'chip' + (fam ? '' : ' on'), onclick: (e: Event) => {
    conFamilia = fam; eleccion.hidden = !fam; vestir();
    for (const x of (e.currentTarget as HTMLElement).parentElement!.children) x.classList.toggle('on', x === e.currentTarget);
  } }, txt);
  const barra = h('input', { type: 'range', min: '0', max: String(REP.cuadros - 1), value: '0', class: 'rango', oninput: () => { k = +barra.value; jugando = false; marcar(); pintar(); } }) as HTMLInputElement;
  const reloj = h('span', { class: 'nota reloj' });
  const bJugar = h('button', { class: 'btn', onclick: () => { jugando = !jugando; if (jugando && k >= REP.cuadros - 1) k = 0; marcar(); } });
  const paso = (d: number) => h('button', { class: 'btn sec2', onclick: () => { jugando = false; k = Math.max(0, Math.min(REP.cuadros - 1, k + d)); marcar(); pintar(); } }, d < 0 ? '◀ 1' : '1 ▶');
  const chipVel = (v: number, txt: string) => h('button', { class: 'chip' + (v === 1 ? ' on' : ''), onclick: (e: Event) => { vel = v; for (const x of (e.currentTarget as HTMLElement).parentElement!.children) x.classList.toggle('on', x === e.currentTarget); } }, txt);
  const check = (txt: string, f: (v: boolean) => void) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: true, onchange: (e: Event) => { f((e.target as HTMLInputElement).checked); pintado = -1; pintar(); } }), txt);
  function marcar() {
    bJugar.textContent = jugando ? (es ? 'Pausa' : 'Pause') : (es ? 'Reproducir' : 'Play');
    barra.value = String(k);
    const seg = k / REP.fps;
    reloj.textContent = `${es ? 'cuadro' : 'frame'} ${k + 1}/${REP.cuadros} · ${seg.toFixed(2)} s`;
  }
  function pintar() {
    if (pintado === k) return;
    const r = cuadroRepeticion(k, { hud, letreros, pintor, nombres });
    img.data.set(r.data); g.putImageData(img, 0, 0); pintado = k;
  }
  s.append(
    h('h2', {}, es ? 'El video, cuadro por cuadro' : 'The video, frame by frame'),
    h('p', { class: 'nota' }, es
      ? 'La pelea completa de Ryu contra Ken reconstruida desde el video: el muelle de Ken con el barco que se mece, la bandera, la gente que saluda y los barriles que se rompen; la cámara con su temblor; y cada dibujo de los luchadores en su pixel exacto. Medido contra el video: 99,85% de los pixeles iguales en los 789 cuadros. Con «La familia», dos de la casa hacen la misma pelea pixel por pixel.'
      : 'The whole Ryu vs Ken fight rebuilt from the video: Ken\'s pier with the rocking boat, the flag, the waving crowd and the barrels that break; the camera with its shake; and every fighter drawing on its exact pixel. Measured against the video: 99.85% identical pixels across all 789 frames. With "The family", two of us fight the same fight pixel by pixel.'),
    h('div', { class: 'chips' }, chipQuien(false, es ? 'Ryu contra Ken' : 'Ryu vs Ken'), chipQuien(true, es ? 'La familia' : 'The family')),
    eleccion,
    h('div', { class: 'pantalla vertical' }, lienzo),
    h('div', { class: 'controles-video' }, bJugar, paso(-1), paso(1), barra, reloj),
    h('div', { class: 'chips' }, chipVel(1, '1×'), chipVel(0.5, '½×'), chipVel(0.25, '¼×'), chipVel(0.1, es ? 'muy lento' : 'very slow'),
      check(es ? 'HUD' : 'HUD', (v) => { hud = v; }), check(es ? 'Letreros' : 'Banners', (v) => { letreros = v; })),
    h('p', { class: 'nota' }, es ? `Calcado del video de ${REP.fuente} (fan art de Street Fighter). Para uso familiar.` : `Traced from the ${REP.fuente} video (Street Fighter fan art). For family use.`),
  );
  marcar(); pintar();
  // el video va a 30 cuadros por segundo; el reloj de la página a 60
  alTick(() => {
    if (s.hidden || !s.isConnected || !jugando) return;
    acum += vel * REP.fps / 60;
    while (acum >= 1) { acum -= 1; k++; if (k >= REP.cuadros) { k = 0; } }
    marcar(); pintar();
  });
}
