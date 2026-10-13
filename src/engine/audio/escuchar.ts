/**
 * La página para escuchar el audio de un kit (audio/escuchar.html): cada sonido con su botón, "tocar todo" en orden
 * y un probador de voces que dice un texto en blips. No necesita servidor: abre directo desde la carpeta o la tablet.
 */
/** archivo: una ruta, o la lista [ogg, m4a] del formato comprimido (la página toca el primero que el navegador entienda). */
export interface ListenEntry { archivo: string | string[]; duracion: number; bucle?: boolean }
export interface ListenVoice { tono: number; timbre: string; archivos: string[] }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function listenPage(juego: string, audio: Record<string, Record<string, ListenEntry>>, voces: Record<string, ListenVoice> = {}): string {
  // las rutas del manifiesto son desde la raíz del kit; la página vive en audio/
  const rel = (p: string) => p.replace(/^audio\//, '');
  const data = {
    secciones: Object.fromEntries(Object.entries(audio).map(([s, list]) => [s, Object.entries(list).map(([n, e]) => ({ n, f: (Array.isArray(e.archivo) ? e.archivo : [e.archivo]).map(rel), d: e.duracion, b: !!e.bucle }))])),
    voces: Object.fromEntries(Object.entries(voces).map(([id, v]) => [id, v.archivos.map(rel)])),
  };
  const TITLES: Record<string, string> = { musica: 'Música', sfx: 'Efectos', ambientes: 'Ambientes' };
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Audio de ${esc(juego)}</title>
<style>
:root{--bg:#0f0d1a;--panel:#1b1830;--line:#2e2a4a;--text:#f2efff;--muted:#a49fc4;--accent:#ff8a3d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.4 system-ui,sans-serif;padding:16px;max-width:900px;margin:0 auto}
h1{font-size:22px;margin:4px 0 2px}p{color:var(--muted);margin:0 0 14px}
h2{font-size:16px;margin:22px 0 8px;color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
button{font:inherit;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;text-align:left;cursor:pointer;min-height:56px}
button.on{border-color:var(--accent);background:#2a2040}button small{display:block;color:var(--muted);font-size:12px}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:1}
.bar button{min-height:44px;padding:8px 14px;text-align:center}.main{background:var(--accent);color:#1a0d06;border:0;font-weight:700}
input,select{font:inherit;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px;min-width:0}
.voz{display:flex;gap:8px;flex-wrap:wrap}.voz input{flex:1 1 220px}
</style></head><body>
<h1>Audio de ${esc(juego)}</h1>
<p>Toca cualquier sonido. "Tocar todo" los pasa en orden, cada música unos segundos.</p>
<div class="bar"><button class="main" id="all">▶ Tocar todo</button><button id="stop">■ Parar</button><span id="now" style="color:var(--muted)"></span></div>
<div id="list"></div>
<div id="vozbox"></div>
<script>
const D=${JSON.stringify(data)};const T=${JSON.stringify(TITLES)};
let cur=null,queue=[],timer=null;
const $=(id)=>document.getElementById(id);
const MIME={ogg:'audio/ogg',m4a:'audio/mp4',wav:'audio/wav'};const probe=new Audio();
const pick=(fs)=>fs.find(f=>probe.canPlayType(MIME[f.split('.').pop()]||''))||fs[0];
function stop(){if(cur){cur.pause();cur=null}clearTimeout(timer);queue=[];document.querySelectorAll('button.on').forEach(b=>b.classList.remove('on'));$('now').textContent=''}
function play(item,btn,next){if(cur)cur.pause();document.querySelectorAll('button.on').forEach(b=>b.classList.remove('on'));
 const a=new Audio(pick(item.f));cur=a;btn&&btn.classList.add('on');$('now').textContent=item.n;a.play().catch(()=>{});
 const lim=item.b?Math.min(item.d,8):item.d;clearTimeout(timer);timer=setTimeout(()=>{a.pause();btn&&btn.classList.remove('on');next&&next()},lim*1000+250)}
const list=$('list');
for(const[s,items]of Object.entries(D.secciones)){const h=document.createElement('h2');h.textContent=T[s]||s;list.append(h);const g=document.createElement('div');g.className='grid';list.append(g);
 for(const it of items){const b=document.createElement('button');b.innerHTML=it.n+'<small>'+it.d.toFixed(1)+' s'+(it.b?' · bucle':'')+'</small>';b.onclick=()=>{queue=[];play(it,b)};it.btn=b;g.append(b)}}
$('all').onclick=()=>{stop();queue=Object.values(D.secciones).flat();const step=()=>{const it=queue.shift();if(it)play(it,it.btn,step);else stop()};step()};
$('stop').onclick=stop;
const ids=Object.keys(D.voces);
if(ids.length){const box=$('vozbox');box.innerHTML='<h2>Voces</h2><div class="voz"><select id="vid">'+ids.map(i=>'<option>'+i+'</option>').join('')+'</select><input id="vtxt" value="¡Dale que vamos a ganar!"><button class="main" id="vsay">▶ Decir</button></div>';
 $('vsay').onclick=()=>{stop();const files=D.voces[$('vid').value];const txt=$('vtxt').value;let i=0;
  const tick=()=>{if(i>=txt.length)return;const ch=txt[i++];if(/[\\p{L}\\p{N}]/u.test(ch)){new Audio(files[(ch.charCodeAt(0))%files.length]).play().catch(()=>{})}timer=setTimeout(tick,/[.,!?¡¿]/.test(ch)?220:55)};tick()}}
</script></body></html>
`;
}
