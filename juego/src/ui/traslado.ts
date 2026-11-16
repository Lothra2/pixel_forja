// Llevar la partida de un sitio a otro. El guardado vive en el navegador y es de cada dirección web: al mudar el juego
// de sitio no viaja solo. Acá se saca como un código (o un enlace que lo lleva puesto) y se mete en el otro lado.
// Antes de pisar nada se deja un respaldo en 'marca.respaldo'.
const CLAVES = ['marca.heroes', 'marca.cofre', 'marca.ultimo', 'marca.opciones', 'marca.intro'];
const SITIO = 'https://lothra2.github.io/Requiem-de-Ceniza/';
const b64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const deB64 = (s: string) => { const t = atob(s.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };
async function pasar(u: Uint8Array, tr: any): Promise<Uint8Array> { return new Uint8Array(await new Response(new Blob([u as any]).stream().pipeThrough(tr)).arrayBuffer()); }

export async function codigoPartida(): Promise<string> {
  const d: Record<string, string> = {};
  for (const k of CLAVES) { const v = localStorage.getItem(k); if (v !== null) d[k] = v; }
  const crudo = new TextEncoder().encode(JSON.stringify(d));
  try { if (typeof CompressionStream === 'function') return 'REQ2.' + b64(await pasar(crudo, new CompressionStream('gzip'))); } catch { /* sin compresión */ }
  return 'REQ1.' + b64(crudo);
}
/** Lee un código y devuelve lo que trae, o null si no sirve. No escribe nada. */
export async function leerCodigo(cod: string): Promise<Record<string, string> | null> {
  try {
    const c = cod.trim().replace(/\s+/g, ''); const m = /(REQ[12])\.([A-Za-z0-9_-]+)/.exec(c); if (!m) return null;
    let u: Uint8Array = deB64(m[2]); if (m[1] === 'REQ2') u = await pasar(u, new DecompressionStream('gzip'));
    const d = JSON.parse(new TextDecoder().decode(u)); if (!d || typeof d !== 'object') return null;
    const h = JSON.parse(d['marca.heroes'] ?? '[]'); if (!Array.isArray(h) || !h.length) return null;
    const r: Record<string, string> = {}; for (const k of CLAVES) if (typeof d[k] === 'string') r[k] = d[k];
    return r;
  } catch { return null; }
}
const heroesDe = (s: string | null | undefined): { nombre?: string; clase?: string; nivel?: number }[] => { try { const h = JSON.parse(s ?? '[]'); return Array.isArray(h) ? h : []; } catch { return []; } };
const resumen = (s: string | null | undefined) => heroesDe(s).map((h) => `${h.nombre ?? '?'} (${h.clase ?? '?'} ${h.nivel ?? 1})`).join(', ');
function escribir(d: Record<string, string>) {
  const antes: Record<string, string> = {}; for (const k of CLAVES) { const v = localStorage.getItem(k); if (v !== null) antes[k] = v; }
  if (antes['marca.heroes']) localStorage.setItem('marca.respaldo', JSON.stringify({ t: Date.now(), d: antes }));
  for (const k of CLAVES) if (k in d && k !== 'marca.opciones' && k !== 'marca.intro') localStorage.setItem(k, d[k]);
  if (!antes['marca.opciones'] && d['marca.opciones']) localStorage.setItem('marca.opciones', d['marca.opciones']);
  localStorage.setItem('marca.intro', '1');
}

let capa: HTMLDivElement | null = null;
export const trasladoAbierto = () => !!capa;
function cerrar() { capa?.remove(); capa = null; }
function abrir(titulo: string): HTMLDivElement {
  cerrar();
  capa = document.createElement('div');
  capa.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;padding:12px;box-sizing:border-box';
  const caja = document.createElement('div');
  caja.style.cssText = 'background:#17120d;border:1px solid #b08a4a;box-shadow:0 0 40px #000;color:#d8c8a0;width:min(560px,100%);max-height:100%;overflow:auto;padding:16px 18px;box-sizing:border-box';
  const h = document.createElement('div'); h.textContent = titulo; h.style.cssText = 'font-size:20px;color:#f0c870;text-align:center;letter-spacing:1px;margin-bottom:10px';
  caja.appendChild(h); capa.appendChild(caja); document.body.appendChild(capa);
  for (const ev of ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown', 'keyup', 'wheel']) capa.addEventListener(ev, (e) => e.stopPropagation());
  return caja;
}
const parrafo = (c: HTMLElement, s: string, color = '#b8a888') => { const p = document.createElement('div'); p.textContent = s; p.style.cssText = `font-size:14px;line-height:1.35;margin:6px 0;color:${color}`; c.appendChild(p); return p; };
const botonD = (c: HTMLElement, s: string, f: () => void, fuerte = false) => { const b = document.createElement('button'); b.textContent = s; b.style.cssText = `font:15px Georgia,serif;padding:9px 14px;margin:6px 6px 0 0;cursor:pointer;color:${fuerte ? '#fff0c0' : '#d8c8a0'};background:${fuerte ? '#5a2a10' : '#1e1812'};border:1px solid ${fuerte ? '#f0b858' : '#6e5a38'}`; b.onclick = f; c.appendChild(b); return b; };
const cajaTexto = (c: HTMLElement, v: string, soloLeer: boolean) => { const t = document.createElement('textarea'); t.value = v; t.readOnly = soloLeer; t.spellcheck = false; t.style.cssText = 'width:100%;height:90px;box-sizing:border-box;background:#0b0907;color:#c8b890;border:1px solid #4e4028;font:12px monospace;padding:6px;margin-top:6px;word-break:break-all'; c.appendChild(t); return t; };

export async function abrirExportar(en: boolean) {
  const T = (a: string, b: string) => (en ? b : a);
  const c = abrir(T('Sacar la partida', 'Export save'));
  const hay = heroesDe(localStorage.getItem('marca.heroes')).length;
  if (!hay) { parrafo(c, T('Todavía no hay ninguna partida guardada acá.', 'There is no saved game here yet.')); botonD(c, T('Cerrar', 'Close'), cerrar); return; }
  parrafo(c, T('Tu partida: ', 'Your save: ') + resumen(localStorage.getItem('marca.heroes')), '#e8d8b0');
  parrafo(c, T('El guardado vive en este navegador y en esta dirección. Para seguir en otro sitio o en otro aparato, copia este código y pégalo allá en Opciones, Partida, Traer.', 'The save lives in this browser and at this address. To continue on another site or device, copy this code and paste it there under Options, Save, Import.'));
  const cod = await codigoPartida(); if (!capa) return;
  const t = cajaTexto(c, cod, true); t.onfocus = () => t.select();
  const aviso = parrafo(c, '', '#90d090');
  botonD(c, T('Copiar el código', 'Copy code'), async () => { try { await navigator.clipboard.writeText(cod); aviso.textContent = T('Copiado.', 'Copied.'); } catch { t.focus(); t.select(); try { document.execCommand('copy'); aviso.textContent = T('Copiado.', 'Copied.'); } catch { aviso.textContent = T('Mantén apretado el texto y elige Copiar.', 'Press and hold the text and choose Copy.'); } } }, true);
  botonD(c, T('Bajar como archivo', 'Download as file'), () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([cod], { type: 'text/plain' })); a.download = 'requiem-partida.txt'; a.click(); });
  if (!/github\.io$/.test(location.hostname)) {
    const a = document.createElement('a'); a.href = SITIO + '#partida=' + cod; a.target = '_blank'; a.rel = 'noopener'; a.textContent = T('Abrir el sitio nuevo con mi partida puesta', 'Open the new site with my save loaded');
    a.style.cssText = 'display:block;margin-top:12px;color:#ffc060;font-size:15px'; c.appendChild(a);
  }
  botonD(c, T('Cerrar', 'Close'), cerrar);
}
export function abrirImportar(en: boolean, inicial = '') {
  const T = (a: string, b: string) => (en ? b : a);
  const c = abrir(T('Traer una partida', 'Import save'));
  parrafo(c, T('Pega acá el código que sacaste del otro sitio (o elige el archivo que bajaste).', 'Paste the code you exported from the other site (or pick the file you downloaded).'));
  const t = cajaTexto(c, inicial, false);
  const f = document.createElement('input'); f.type = 'file'; f.accept = '.txt,text/plain'; f.style.cssText = 'margin-top:8px;color:#b8a888;font-size:13px;display:block'; c.appendChild(f);
  f.onchange = async () => { const a = f.files?.[0]; if (a) { t.value = await a.text(); revisar(); } };
  const aviso = parrafo(c, '', '#e8d8b0');
  let listo: Record<string, string> | null = null;
  const cargar = botonD(c, T('Cargar esta partida', 'Load this save'), () => { if (!listo) return; escribir(listo); location.hash = ''; location.reload(); }, true);
  cargar.style.display = 'none';
  const revisar = async () => {
    listo = t.value.trim() ? await leerCodigo(t.value) : null; cargar.style.display = listo ? '' : 'none';
    if (!t.value.trim()) { aviso.textContent = ''; return; }
    if (!listo) { aviso.style.color = '#e08060'; aviso.textContent = T('Ese código no sirve o está incompleto.', 'That code is invalid or incomplete.'); return; }
    const aca = resumen(localStorage.getItem('marca.heroes'));
    aviso.style.color = '#e8d8b0';
    aviso.textContent = T('Trae: ', 'Contains: ') + resumen(listo['marca.heroes']) + '. ' + (aca ? T(`Reemplaza la partida de acá (${aca}). Queda un respaldo de la de acá por si acaso.`, `It replaces the save here (${aca}). A backup of the current one is kept just in case.`) : '');
  };
  t.oninput = revisar; if (inicial) void revisar();
  botonD(c, T('Cancelar', 'Cancel'), () => { cerrar(); if (/partida=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); });
}
/** Al arrancar: si la dirección trae una partida (#partida=...), se ofrece cargarla. Si acá no hay ninguna, entra sola. */
export async function partidaEnEnlace(en: boolean) {
  const m = /[#&]partida=([A-Za-z0-9_.-]+)/.exec(location.hash); if (!m) return;
  const d = await leerCodigo(m[1]); if (!d) return;
  if (!heroesDe(localStorage.getItem('marca.heroes')).length) { escribir(d); history.replaceState(null, '', location.pathname + location.search); location.reload(); return; }
  if (localStorage.getItem('marca.heroes') === d['marca.heroes']) { history.replaceState(null, '', location.pathname + location.search); return; }
  abrirImportar(en, m[1]);
}
