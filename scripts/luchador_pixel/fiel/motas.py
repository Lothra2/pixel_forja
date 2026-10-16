import numpy as np, json
from paleta import srgb2lab, S
def quitar_motas(n, bg):
    """Los pixeles sueltos azulados que vienen del fondo de la referencia toman el color de sus vecinos."""
    idx=np.load(f'{S}/fiel/{n}_idx.npy'); pal=json.load(open(f'{S}/fiel/{n}_pal.json'))
    P=np.array([[int(c[i:i+2],16) for i in (1,3,5)] for c in pal],float)
    L=srgb2lab(P); Lb=srgb2lab(np.array([bg],float))[0]
    azul=[i for i in range(len(pal)) if np.linalg.norm(L[i]-Lb)<0.08]
    H,W=idx.shape; n_=0
    for _ in range(3):
        b=idx.copy()
        for y in range(H):
            for x in range(W):
                if idx[y,x] not in azul: continue
                # solo las motas: casi sin vecinos de su misma familia de color
                fam=sum(1 for yy in (y-1,y,y+1) for xx in (x-1,x,x+1) if (yy,xx)!=(y,x) and 0<=yy<H and 0<=xx<W and idx[yy,xx]>=0 and np.linalg.norm(L[idx[yy,xx]]-L[idx[y,x]])<0.1)
                if fam>2: continue
                v=[idx[yy,xx] for yy in (y-1,y,y+1) for xx in (x-1,x,x+1) if (yy,xx)!=(y,x) and 0<=yy<H and 0<=xx<W and idx[yy,xx]>=0 and idx[yy,xx] not in azul]
                if len(v)>=3:
                    vals,c=np.unique(v,return_counts=True); b[y,x]=vals[c.argmax()]; n_+=1
        idx=b
    np.save(f'{S}/fiel/{n}_idx.npy',idx); return azul,n_
if __name__=='__main__':
    print(quitar_motas('rick',(58,94,148)))
    print(quitar_motas('sophie',(63,93,147)))
