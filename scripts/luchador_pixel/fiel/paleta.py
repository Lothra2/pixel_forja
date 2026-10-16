import numpy as np
from PIL import Image
from collections import deque
import os
S=os.path.join(os.path.dirname(os.path.abspath(__file__)),'datos')
def srgb2lab(c):
    c=c/255.0; c=np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
    M=np.array([[0.4122214708,0.5363325363,0.0514459929],[0.2119034982,0.6806995451,0.1073969566],[0.0883024619,0.2817188376,0.6299787005]])
    lms=np.cbrt(c@M.T)
    M2=np.array([[0.2104542553,0.7936177850,-0.0040720468],[1.9779984951,-2.4285922050,0.4505937099],[0.0259040371,0.7827717662,-0.8086757660]])
    return lms@M2.T
def fondo(o, bg, umbral=0.06):
    H,W,_=o.shape; L=srgb2lab(o.reshape(-1,3)).reshape(H,W,3); Lb=srgb2lab(np.array([bg],float))[0]
    cerca=np.linalg.norm(L-Lb,axis=2)<umbral
    vis=np.zeros((H,W),bool); q=deque()
    for y in range(H):
        for x in (0,W-1):
            if cerca[y,x]: vis[y,x]=True; q.append((y,x))
    for x in range(W):
        for y in (0,H-1):
            if cerca[y,x] and not vis[y,x]: vis[y,x]=True; q.append((y,x))
    while q:
        y,x=q.popleft()
        for yy,xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0<=yy<H and 0<=xx<W and not vis[yy,xx] and cerca[yy,xx]: vis[yy,xx]=True; q.append((yy,xx))
    return ~vis
def kmeans(X,k,it=40,seed=1):
    rng=np.random.default_rng(seed)
    # k-means++ 
    C=[X[rng.integers(len(X))]]
    for _ in range(k-1):
        d=np.min(((X[:,None]-np.array(C)[None])**2).sum(2),axis=1); C.append(X[rng.choice(len(X),p=d/d.sum())])
    C=np.array(C)
    for _ in range(it):
        lab=np.argmin(((X[:,None]-C[None])**2).sum(2),axis=1)
        for j in range(k):
            m=lab==j
            if m.any(): C[j]=X[m].mean(0)
    return C,lab
def cuantizar(n,k,bg):
    o=np.load(f'{S}/fiel/{n}_celdas.npy'); o=np.nan_to_num(o,nan=bg[0])
    H,W,_=o.shape
    m=fondo(o,np.array(bg,float))
    # recorta a la caja del personaje
    ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
    o=o[y0:y1+1,x0:x1+1]; m=m[y0:y1+1,x0:x1+1]
    X=srgb2lab(o[m]); C,lab=kmeans(X,k)
    # el color de cada grupo: la mediana sRGB de sus pixeles (colores reales de la referencia)
    rgb=np.array([np.median(o[m][lab==j],axis=0) for j in range(k)])
    # orden: por luminosidad
    orden=np.argsort(C[:,0]); inv=np.argsort(orden)
    idx=np.full(m.shape,-1,int); idx[m]=inv[lab]
    pal=['#%02x%02x%02x'%tuple(int(v) for v in rgb[j]) for j in orden]
    return idx,pal
if __name__=='__main__':
    import json,sys
    for n,bg in (('rick',(58,94,148)),('sophie',(63,93,147))):
        idx,pal=cuantizar(n,48,bg)
        np.save(f'{S}/fiel/{n}_idx.npy',idx); json.dump(pal,open(f'{S}/fiel/{n}_pal.json','w'))
        P=np.array([[int(c[i:i+2],16) for i in (1,3,5)] for c in pal])
        img=np.zeros(idx.shape+(3,),'uint8')+np.array([36,32,64],'uint8')
        img[idx>=0]=P[idx[idx>=0]]
        Image.fromarray(img).resize((idx.shape[1]*5,idx.shape[0]*5),Image.NEAREST).save(f'{S}/fiel/{n}_q_x5.png')
        print(n,idx.shape,len(pal))
