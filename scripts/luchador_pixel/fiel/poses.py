import numpy as np, json, glob, os, sys
from PIL import Image
from grilla import cortes
from paleta import srgb2lab
from limpiar import regiones_fondo
import os
S=os.path.join(os.path.dirname(os.path.abspath(__file__)),'datos')
def periodo(d, lo=4.8, hi=7.5):
    d=d-d.mean(); best=(0,0)
    for p in np.arange(lo,hi,0.02):
        v=abs((d*np.exp(2j*np.pi*np.arange(len(d))/p)).sum())
        if v>best[0]: best=(v,p)
    return best[1]
def extraer(path, factor=1.0):
    a=np.asarray(Image.open(path).convert('RGB')).astype(float)
    dx=np.abs(np.diff(a,axis=1)).sum(2).sum(0); dy=np.abs(np.diff(a,axis=0)).sum(2).sum(1)
    Px,Py=periodo(dx)*factor,periodo(dy)*factor
    cx=sorted(set([0]+[c+1 for c in cortes(dx,Px)]+[a.shape[1]])); cy=sorted(set([0]+[c+1 for c in cortes(dy,Py)]+[a.shape[0]]))
    cx=[c for i,c in enumerate(cx) if i==0 or c-cx[i-1]>=2]; cy=[c for i,c in enumerate(cy) if i==0 or c-cy[i-1]>=2]
    H,W=len(cy)-1,len(cx)-1; out=np.zeros((H,W,3))
    for j in range(H):
        for i in range(W):
            y0,y1,x0,x1=cy[j],cy[j+1],cx[i],cx[i+1]
            m0,m1=max(1,(y1-y0)//4),max(1,(x1-x0)//4)
            blk=a[y0+m0:max(y0+m0+1,y1-m0),x0+m1:max(x0+m1+1,x1-m1)].reshape(-1,3)
            out[j,i]=np.median(blk,axis=0)
    bg=np.median(np.concatenate([a[:4].reshape(-1,3),a[-4:].reshape(-1,3)]),axis=0)
    return out,(Px,Py),bg
def a_paleta(o, bg, pal):
    m=regiones_fondo(o,bg)
    ys,xs=np.where(m); o=o[ys.min():ys.max()+1,xs.min():xs.max()+1]; m=m[ys.min():ys.max()+1,xs.min():xs.max()+1]
    P=np.array([[int(c[i:i+2],16) for i in (1,3,5)] for c in pal],float); LP=srgb2lab(P)
    L=srgb2lab(o.reshape(-1,3)).reshape(o.shape)
    d=np.linalg.norm(L[:,:,None,:]-LP[None,None],axis=3)
    idx=np.where(m,d.argmin(2),-1); err=np.where(m,d.min(2),0)
    return idx, err[m].mean(), np.percentile(err[m],95)
ESCALA={'r_puno_carga':1.15,'r_victoria':1.16,'r_recibe':1.15,'r_paso_largo':1.12,'r_tendido':0.9,'r_vuela':1.08,'s_remolino':1.3}
if __name__=='__main__':
    for n,pref in (('rick','r'),('sophie','s')):
        pal=json.load(open(f'{S}/fiel/{n}_pal.json'))
        for f in sorted(glob.glob(f'{S}/poses/{pref}_*.png')):
            nom=os.path.basename(f)[:-4]
            if nom.startswith('hoja'): continue
            o,(px,py),bg=extraer(f, ESCALA.get(nom,1.0))
            idx,e,e95=a_paleta(o,bg,pal)
            np.save(f'{S}/poses/{nom}.npy',idx)
            print(f'{nom:16s} periodo {px:.2f} {py:.2f}  hoja {idx.shape}  error {e:.3f} p95 {e95:.3f}')
