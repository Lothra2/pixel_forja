import numpy as np
from PIL import Image
def cortes(perfil, P):
    """Posiciones de las lineas de la grilla: picos del perfil de bordes con separacion cercana a P (programacion dinamica)."""
    n=len(perfil); lo,hi=int(np.floor(P*0.7)),int(np.ceil(P*1.3))
    s=perfil/ (perfil.max()+1e-9)
    best=np.full(n,-1e18); prev=np.full(n,-1,int)
    for i in range(n):
        if i<hi: best[i]=s[i]
        for g in range(lo,hi+1):
            j=i-g
            if j<0: continue
            v=best[j]+s[i]-0.15*abs(g-P)/P
            if v>best[i]: best[i]=v; prev[i]=j
    i=int(np.argmax(best[n-hi:])+n-hi); out=[]
    while i>=0: out.append(i); i=prev[i]
    return sorted(out)
def extraer(path, Px, Py):
    a=np.asarray(Image.open(path).convert('RGB')).astype(float)
    dx=np.abs(np.diff(a,axis=1)).sum(2).sum(0); dy=np.abs(np.diff(a,axis=0)).sum(2).sum(1)
    cx=[c+1 for c in cortes(dx,Px)]; cy=[c+1 for c in cortes(dy,Py)]
    cx=[0]+cx+[a.shape[1]]; cy=[0]+cy+[a.shape[0]]
    cx=sorted(set(cx)); cy=sorted(set(cy))
    H,W=len(cy)-1,len(cx)-1
    out=np.zeros((H,W,3))
    for j in range(H):
        for i in range(W):
            y0,y1,x0,x1=cy[j],cy[j+1],cx[i],cx[i+1]
            # el centro de la celda, sin los bordes que se mezclan
            m=max(1,(y1-y0)//4),max(1,(x1-x0)//4)
            blk=a[y0+m[0]:max(y0+m[0]+1,y1-m[0]),x0+m[1]:max(x0+m[1]+1,x1-m[1])].reshape(-1,3)
            out[j,i]=np.median(blk,axis=0)
    return out, cx, cy
if __name__=='__main__':
    import os
    S=os.path.join(os.path.dirname(os.path.abspath(__file__)),'datos')
    for n,(px,py) in {'rick':(5.8,5.46),'sophie':(5.9,5.88)}.items():
        o,cx,cy=extraer(f'{S}/ref/{n}_ref.png',px,py)
        print(n,o.shape, 'gaps x',np.unique(np.diff(cx),return_counts=True),'y',np.unique(np.diff(cy),return_counts=True))
        np.save(f'{S}/fiel/{n}_celdas.npy',o)
        im=Image.fromarray(o.astype('uint8'))
        im.resize((o.shape[1]*6,o.shape[0]*6),Image.NEAREST).save(f'{S}/fiel/{n}_celdas_x6.png')
