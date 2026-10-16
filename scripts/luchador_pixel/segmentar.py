import sys, json; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__))); from lib import *
from PIL import Image, ImageDraw
def poly_mask(W,H,pts):
    im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon(pts,fill=1,outline=1); return np.array(im).astype(bool)
def segmentar(name, a, defs, orden, rellenos, solape=3):
    """defs: pieza -> {poly:[...], pivote:(x,y), padre:str|None}. orden = prioridad al reclamar pixeles.
    rellenos: pieza -> [poligonos] donde se inventa lo que tapan otras piezas (vecino mayoritario).
    solape: cada pieza hija se lleva tambien los pixeles del padre a esa distancia de su pivote (tapa la junta al girar)."""
    H,W=a.shape; op=a>=0
    asign=np.full((H,W),'',dtype=object)
    for p in orden:
        m=np.zeros((H,W),bool)
        for pts in defs[p]['poly']: m|=poly_mask(W,H,pts)
        asign[m&op&(asign=='')]=p
    resto=[p for p in defs if p not in orden]
    assert len(resto)==1, resto
    asign[op&(asign=='')]=resto[0]
    partes={p:np.where(asign==p,a,-1) for p in defs}
    for p,polys in rellenos.items():
        t=partes[p].copy(); hueco=np.zeros((H,W),bool)
        for pts in polys: hueco|=poly_mask(W,H,pts)
        hueco&=(t<0)&op
        for _ in range(60):
            if not hueco.any(): break
            nuevo=t.copy()
            for y,x in zip(*np.where(hueco)):
                vec=[t[yy,xx] for yy,xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)) if 0<=yy<H and 0<=xx<W and t[yy,xx]>0]
                if vec:
                    vals,cnt=np.unique(vec,return_counts=True); nuevo[y,x]=vals[cnt.argmax()]
            hueco&=(nuevo<0); t=nuevo
        partes[p]=t
    # solape en las juntas
    for p,d in defs.items():
        pad=d.get('padre')
        if not pad or pad not in partes: continue
        px,py=d['pivote']
        yy,xx=np.mgrid[0:H,0:W]
        cerca=((xx-px)**2+(yy-py)**2)<=solape*solape
        m=cerca&(partes[pad]>0)&(partes[p]<0)
        partes[p]=np.where(m,partes[pad],partes[p])
    return partes
def vista(name,partes,path,W,H):
    cols=[(255,80,80),(80,255,80),(80,80,255),(255,255,80),(255,80,255),(80,255,255),(255,160,60),(160,60,255),(200,200,200),(120,200,120),(200,120,60)]
    img=np.zeros((H,W,3),'uint8')+40
    for i,(p,a) in enumerate(partes.items()): img[a>=0]=cols[i%len(cols)]
    Image.fromarray(img).resize((W*8,H*8),Image.NEAREST).save(path)
def ts_datos(const, name, partes, defs, piso, frente, W, H, orden_dibujo):
    out=[]
    out.append(f"  paleta: {json.dumps(PAL[name])},")
    out.append(f"  w: {W}, h: {H}, piso: {piso}, centro: {frente},")
    out.append("  orden: "+json.dumps(orden_dibujo)+",")
    out.append("  piezas: {")
    for p in orden_dibujo:
        a=partes[p]; ys,xs=np.where(a>=0)
        y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
        filas=a_filas(a[y0:y1+1,x0:x1+1])
        d=defs[p]
        pad=json.dumps(d.get('padre')) if d.get('padre') else 'null'
        out.append(f"    {p}: {{ x: {x0}, y: {y0}, pivote: [{d['pivote'][0]}, {d['pivote'][1]}], padre: {pad}, filas: [")
        for f in filas: out.append(f"      '{f}',")
        out.append("    ] },")
    out.append("  },")
    return '\n'.join(out)
def escribir_ts(path, const, nombre, name, partes, defs, piso, centro, W, H, dibujo, puntos, zonas, doc):
    q=lambda s: "'"+s+"'"
    L=[]
    L.append("import type { MunecoPixel } from './muneco';")
    L.append("")
    L.append("/**")
    for d in doc: L.append(" * "+d)
    L.append(" */")
    L.append(f"export const {const}: MunecoPixel = {{")
    L.append(f"  nombre: {q(nombre)},")
    L.append("  paleta: ["+", ".join(q(c) for c in PAL[name])+"],")
    L.append(f"  w: {W}, h: {H}, piso: {piso}, centro: {centro},")
    L.append("  orden: ["+", ".join(q(p) for p in dibujo)+"],")
    L.append("  puntos: { "+", ".join(f"{k}: {{ pieza: {q(v[0])}, en: [{v[1][0]}, {v[1][1]}] }}" for k,v in puntos.items())+" },")
    L.append("  zonas: { "+", ".join(f"{k}: {q(v)}" for k,v in zonas.items())+" },")
    L.append("  piezas: {")
    for p in dibujo:
        a=partes[p]; ys,xs=np.where(a>=0)
        y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
        d=defs[p]; pad=q(d['padre']) if d.get('padre') else 'null'
        L.append(f"    {p}: {{")
        L.append(f"      x: {x0}, y: {y0}, pivote: [{d['pivote'][0]}, {d['pivote'][1]}], padre: {pad},")
        L.append("      filas: [")
        for f in a_filas(a[y0:y1+1,x0:x1+1]): L.append(f"        {q(f)},")
        L.append("      ],")
        L.append("    },")
    L.append("  },")
    L.append("};")
    open(path,'w').write('\n'.join(L)+'\n')
def rellenar(t, polys, W, H, dentro=None):
    t=t.copy(); hueco=np.zeros((H,W),bool)
    for pts in polys: hueco|=poly_mask(W,H,pts)
    hueco&=(t<0)
    if dentro is not None: hueco&=dentro
    for _ in range(80):
        if not hueco.any(): break
        nuevo=t.copy()
        for y,x in zip(*np.where(hueco)):
            vec=[t[yy,xx] for yy,xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)) if 0<=yy<H and 0<=xx<W and t[yy,xx]>0]
            if vec:
                vals,cnt=np.unique(vec,return_counts=True); nuevo[y,x]=vals[cnt.argmax()]
        hueco&=(nuevo<0); t=nuevo
    return t
def relleno_aparte(partes, fuente, polys, W, H):
    """Lo que tapan otras piezas, inventado desde la fuente, como pieza aparte (va detras de todo)."""
    dentro=np.zeros((H,W),bool)
    for a in partes.values(): dentro|=a>=0
    t=rellenar(partes[fuente],polys,W,H,dentro)
    return np.where(partes[fuente]>=0,-1,t)
def variantes_ts(path, const, doc, pieza, defs, partes, base, cambios):
    """Recambios de una pieza (caras): la misma silueta con retoques a mano."""
    q=lambda s: "'"+s+"'"
    m=partes[pieza]>=0
    L=['','/** '+doc+' */',f"export const {const}: Record<string, PiezaPixel> = {{"]
    for nombre,pars in cambios.items():
        b=base.copy()
        for (x,y,filas) in pars: parche(b,x,y,filas)
        v=np.where(m,b,-1)
        ys,xs=np.where(v>=0); y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
        d=defs[pieza]; pad=q(d['padre']) if d.get('padre') else 'null'
        L.append(f"  {nombre}: {{")
        L.append(f"    x: {x0}, y: {y0}, pivote: [{d['pivote'][0]}, {d['pivote'][1]}], padre: {pad},")
        L.append("    filas: [")
        for f in a_filas(v[y0:y1+1,x0:x1+1]): L.append(f"      {q(f)},")
        L.append("    ],")
        L.append("  },")
    L.append("};")
    s=open(path).read().replace("import type { MunecoPixel } from './muneco';","import type { MunecoPixel, PiezaPixel } from './muneco';")
    open(path,'w').write(s+'\n'.join(L)+'\n')
def relleno_espejo(partes, pieza, polys, eje, W, H, contorno=True):
    """Lo que tapan los brazos se pinta como el lado que se ve, reflejado en el eje (el esternón). Lo que no alcanza
    se completa con el vecino mayoritario, y el borde nuevo lleva contorno."""
    t=partes[pieza].copy(); orig=t>=0
    m=np.zeros((H,W),bool)
    for pts in polys: m|=poly_mask(W,H,pts)
    dentro=np.zeros((H,W),bool)
    for a in partes.values(): dentro|=a>=0
    m&=dentro&~orig
    for y,x in zip(*np.where(m)):
        xs=2*eje-x
        if 0<=xs<W and orig[y,xs] and t[y,xs]>0: t[y,x]=t[y,xs]
    t=rellenar(t,polys,W,H,dentro)
    nuevo=(t>=0)&~orig
    if contorno:
        b=t.copy()
        for y,x in zip(*np.where(nuevo)):
            for yy,xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if not(0<=yy<H and 0<=xx<W) or t[yy,xx]<0: b[y,x]=0; break
        t=b
    partes[pieza]=t
