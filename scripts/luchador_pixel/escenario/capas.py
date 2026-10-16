"""El escenario japonés por capas: baja cada capa pintada a su pixel real y les pone una paleta común.

Entrada: escenario/datos/{cielo,montes,castillo,muro,piso,frente}.png, pintadas con fondo magenta (#FF00FF)
y la misma composición que escenario/datos/maestra.png. Cada pixel del arte mide unos 2,2 px de la imagen.
Salida: public/escenarios/japon/<capa>.png a 611 x 262, RGBA, con 96 tonos entre todas.
"""
import numpy as np, sys, os
from PIL import Image
AQUI=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,os.path.join(AQUI,'..','fiel'))
from paleta import srgb2lab, kmeans
CAPAS=['cielo','montes','castillo','muro','piso','frente']
ENTRA=os.path.join(AQUI,'datos'); SALE=os.path.join(AQUI,'..','..','..','public','escenarios','japon')
F=2.2  # tamaño del pixel del arte en la imagen
def cargar(n):
    a=np.asarray(Image.open(os.path.join(ENTRA,n+'.png')).convert('RGB')).astype(float)
    r,g,b=a[...,0],a[...,1],a[...,2]
    # magenta puro y sus bordes mezclados: rojo y azul altos, verde bajo, rojo y azul parecidos
    mag=((r+b)/2-g>120)&(np.abs(r-b)<70)&(g<110) if n!='cielo' else np.zeros(r.shape,bool)
    return a,~mag
def bajar(a,m):
    H,W=a.shape[:2]; h,w=int(round(H/F)),int(round(W/F))
    out=np.zeros((h,w,3)); al=np.zeros((h,w))
    ys=np.linspace(0,H,h+1).astype(int); xs=np.linspace(0,W,w+1).astype(int)
    for j in range(h):
        for i in range(w):
            blk=a[ys[j]:ys[j+1],xs[i]:xs[i+1]].reshape(-1,3); mk=m[ys[j]:ys[j+1],xs[i]:xs[i+1]].reshape(-1)
            al[j,i]=mk.mean()
            if mk.any(): out[j,i]=np.median(blk[mk],axis=0)
    return out,al>=0.5
bajadas={}
for n in CAPAS:
    a,m=cargar(n); bajadas[n]=bajar(a,m); print(n,bajadas[n][0].shape,bajadas[n][1].mean().round(2))
# una paleta para todo el escenario
X=np.concatenate([srgb2lab(o[m]) for o,m in bajadas.values()])
rng=np.random.default_rng(0); muestra=X[rng.choice(len(X),min(len(X),40000),replace=False)]
C,_=kmeans(muestra,96,it=25)
idxs={}
for n,(o,m) in bajadas.items():
    L=srgb2lab(o.reshape(-1,3)).reshape(o.shape)
    idxs[n]=((L[:,:,None,:]-C[None,None])**2).sum(3).argmin(2)
# el color de cada grupo: el sRGB medio de todo lo que cae en él, en todas las capas
suma=np.zeros((len(C),3)); cuenta=np.zeros(len(C))
for n,(o,m) in bajadas.items():
    for k in range(len(C)):
        sel=(idxs[n]==k)&m
        suma[k]+=o[sel].sum(0); cuenta[k]+=sel.sum()
pal=(suma/np.maximum(cuenta,1)[:,None]).clip(0,255).astype('uint8')
os.makedirs(SALE,exist_ok=True)
for n,(o,m) in bajadas.items():
    rgba=np.zeros(o.shape[:2]+(4,),'uint8')
    rgba[...,:3]=pal[idxs[n]]; rgba[...,3]=np.where(m,255,0)
    Image.fromarray(rgba).save(os.path.join(SALE,n+'.png'))
print('listo')
