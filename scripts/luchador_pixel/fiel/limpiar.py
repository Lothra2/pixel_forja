import numpy as np, json
from PIL import Image
from collections import deque
from paleta import srgb2lab, kmeans, S
def regiones_fondo(o, bg, umbral=0.06, minimo=4):
    H,W,_=o.shape; L=srgb2lab(o.reshape(-1,3)).reshape(H,W,3); Lb=srgb2lab(np.array([bg],float))[0]
    cerca=np.linalg.norm(L-Lb,axis=2)<umbral
    vis=np.zeros((H,W),bool); fondo=np.zeros((H,W),bool)
    for y in range(H):
        for x in range(W):
            if not cerca[y,x] or vis[y,x]: continue
            q=deque([(y,x)]); vis[y,x]=True; reg=[]; borde=False
            while q:
                a,b=q.popleft(); reg.append((a,b))
                if a in (0,H-1) or b in (0,W-1): borde=True
                for yy,xx in ((a-1,b),(a+1,b),(a,b-1),(a,b+1)):
                    if 0<=yy<H and 0<=xx<W and not vis[yy,xx] and cerca[yy,xx]: vis[yy,xx]=True; q.append((yy,xx))
            if borde or len(reg)>=minimo:
                for a,b in reg: fondo[a,b]=True
    return ~fondo
def preparar(n,bg,k=48):
    o=np.load(f'{S}/fiel/{n}_celdas.npy')
    ok=~np.isnan(o).any(2)
    cols=ok.mean(0)>0.5; filas=ok[:,cols].all(1)
    o=o[filas][:,cols]
    m=regiones_fondo(o,np.array(bg,float))
    ys,xs=np.where(m); o=o[ys.min():ys.max()+1,xs.min():xs.max()+1]; m=m[ys.min():ys.max()+1,xs.min():xs.max()+1]
    X=srgb2lab(o[m]); C,lab=kmeans(X,k)
    rgb=np.array([np.median(o[m][lab==j],axis=0) for j in range(k)])
    orden=np.argsort(C[:,0]); inv=np.argsort(orden)
    idx=np.full(m.shape,-1,int); idx[m]=inv[lab]
    pal=['#%02x%02x%02x'%tuple(int(v) for v in rgb[j]) for j in orden]
    return idx,pal
if __name__=='__main__':
    for n,bg in (('rick',(58,94,148)),('sophie',(63,93,147))):
        idx,pal=preparar(n,bg)
        np.save(f'{S}/fiel/{n}_idx.npy',idx); json.dump(pal,open(f'{S}/fiel/{n}_pal.json','w'))
        P=np.array([[int(c[i:i+2],16) for i in (1,3,5)] for c in pal])
        img=np.zeros(idx.shape+(3,),'uint8')+np.array([36,32,64],'uint8'); img[idx>=0]=P[idx[idx>=0]]
        Image.fromarray(img).resize((idx.shape[1]*5,idx.shape[0]*5),Image.NEAREST).save(f'{S}/fiel/{n}_q_x5.png')
        print(n,idx.shape)
