import numpy as np, json, glob, os, sys
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import lib
from cabezas import trasplantar
import os
S=os.path.join(os.path.dirname(os.path.abspath(__file__)),'datos')
AIRE={'r_vuela','r_tendido','s_bolita','s_sube','s_patada','s_remolino','s_remolino2','s_victoria'}
DE_CABEZA={'s_remolino','s_remolino2'}
def medir(nom,a):
    H,W=a.shape; op=a>=0; ys,xs=np.where(op)
    y1=ys.max()
    if nom in AIRE and nom not in DE_CABEZA:
        ancla=(float(xs.mean()),float(y1+1))
    else:
        pie=op[y1-8:y1+1]; py,px=np.where(pie); ancla=(float(px.mean()),float(y1+1))
    def centro(mask): yy,xx=np.where(mask&op); return (float(xx.mean()),float(yy.mean()))
    filas=np.arange(H)[:,None]*np.ones((1,W)); col=np.ones((H,1))*np.arange(W)[None]
    pts={}
    if nom in DE_CABEZA:
        pts['cabeza']=centro(filas>=y1-0.22*H)
        arriba=op&(filas<0.4*H)
        yy,xx=np.where(arriba); pts['pieL']=(float(xx.max()),float(yy[xx==xx.max()].mean())); pts['pieC']=(float(xx.min()),float(yy[xx==xx.min()].mean()))
        zonas=(0,0)
    else:
        pts['cabeza']=centro(filas<ys.min()+0.14*H)
        sup=op&(filas<ys.min()+0.6*(y1-ys.min()))
        yy,xx=np.where(sup); mx=xx.max(); pts['puñoL']=(float(mx-3),float(yy[xx>=mx-4].mean())); pts['puñoC']=pts['puñoL']
        inf=op&(filas>=ys.min()+0.35*(y1-ys.min()))
        yy,xx=np.where(inf); mx=xx.max(); pts['pieL']=(float(mx-4),float(yy[xx>=mx-5].mean()))
        mn=xx.min(); pts['pieC']=(float(mn+4),float(yy[xx<=mn+5].mean()))
        h=y1-ys.min()
        zonas=(int(ys.min()+0.24*h),int(ys.min()+0.58*h))
    return ancla,pts,zonas
def escribir(n,pref,const,dest):
    pal=json.load(open(f'{S}/fiel/{n}_pal.json'))
    L=["import type { DibujoPixel } from './muneco';","",
       f"/** Las poses clave de {n.capitalize()} dibujadas enteras, fieles a su referencia y con la paleta de su hoja. */",
       f"export const {const}: Record<string, DibujoPixel> = {{"]
    for f in sorted(glob.glob(f'{S}/poses/{pref}_*.npy')):
        nom=os.path.basename(f)[:-4]
        if nom.endswith('guardia'): continue
        # la cabeza de la guardia en vez de la de la pose (ver cabezas.py)
        a=trasplantar(nom,np.load(f)); ancla,pts,zonas=medir(nom,a)
        clave=nom[2:]
        L.append(f"  {clave}: {{")
        L.append(f"    ancla: [{ancla[0]:.1f}, {ancla[1]:.0f}], zonas: [{zonas[0]}, {zonas[1]}],")
        L.append("    puntos: { "+", ".join(f"{k}: [{v[0]:.0f}, {v[1]:.0f}]" for k,v in pts.items())+" },")
        L.append("    filas: [")
        for r in lib.a_filas(a): L.append(f"      '{r}',")
        L.append("    ],")
        L.append("  },")
    L.append("};")
    open(dest,'w').write('\n'.join(L)+'\n')
if __name__=='__main__':
    for n,pref,const in (('rick','r','RICK_DIBUJOS'),('sophie','s','SOPHIE_DIBUJOS')):
        escribir(n,pref,const,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..','src')+f'/engine/luchador/pixel/{n}Dibujos.ts')
        p=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..','src')+f'/engine/luchador/pixel/{n}.ts'
        s=open(p).read()
        if 'Dibujos' not in s:
            s=s.replace("import type { MunecoPixel","import { "+const+" } from './"+n+"Dibujos';\nimport type { MunecoPixel",1)
            s=s.replace(f"  nombre: '{n.capitalize()}',",f"  nombre: '{n.capitalize()}',\n  dibujos: {const},",1)
            open(p,'w').write(s)
        print(n, os.path.getsize(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..','src')+f'/engine/luchador/pixel/{n}Dibujos.ts'))
