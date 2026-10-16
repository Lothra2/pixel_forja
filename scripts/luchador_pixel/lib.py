import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
S=os.path.dirname(os.path.abspath(__file__))
REPO=os.path.abspath(os.path.join(S,'..','..'))
SAL=os.path.join(S,'salida'); os.makedirs(SAL,exist_ok=True)
def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
PAL={
 'rick':['#1a0e12','#ffe0bc','#f4b886','#dc8e5c','#b0643c','#7a3c24','#ff7a5a','#ec3424','#c0161a','#8a0c16','#520814','#66667a','#3a3a48','#1e1e28','#ffffff','#d8dce8','#a4acc0','#5a4c52','#2e2428','#c8c0b8','#8c847e','#5e5652','#3e6aa8'],
 'sophie':['#1c1018','#ffe6cc','#f8c8a0','#e0a078','#b87050','#a4f0f4','#4ad0e0','#20a0bc','#106c8a','#0a4460','#ffffff','#e0e4ee','#a8b0c4','#ffb0d0','#ff6aa8','#d83a7c','#902050','#4a5aa8','#2c3478','#1a1e4a','#a86840','#7a4426','#4e2a18','#2e1a10','#ffffff'],
}
# grupos de rampa: pixeles del mismo grupo se pueden fundir entre si
GRUPOS={
 'rick':[[0],[1,2,3,4,5],[6,7,8,9,10],[11,12,13],[14,15,16],[17,18],[19,20,21],[22]],
 'sophie':[[0],[1,2,3,4],[5,6,7,8,9],[10,11,12],[13,14,15,16],[17,18,19],[20,21,22,23],[24]],
}
def grupo_de(name):
    g={}
    for i,gr in enumerate(GRUPOS[name]):
        for c in gr: g[c]=i
    return g
def rgba(name,a,bg=None):
    pal=[hx(c) for c in PAL[name]]
    H,W=a.shape
    out=np.zeros((H,W,4),'uint8')
    if bg: out[:,:,:3]=hx(bg); out[:,:,3]=255
    for i,c in enumerate(pal):
        m=a==i; out[m,:3]=c; out[m,3]=255
    return out
def png(name,a,path,scale=8,bg='#3a4468',grid=0,x0=0,y0=0):
    im=Image.fromarray(rgba(name,a,bg)).resize((a.shape[1]*scale,a.shape[0]*scale),Image.NEAREST)
    if grid:
        d=ImageDraw.Draw(im)
        H,W=a.shape
        for x in range(W+1):
            c=(255,255,0) if (x+x0)%grid==0 else (90,90,120)
            d.line([(x*scale,0),(x*scale,H*scale)],fill=c,width=1)
        for y in range(H+1):
            c=(255,255,0) if (y+y0)%grid==0 else (90,90,120)
            d.line([(0,y*scale),(W*scale,y*scale)],fill=c,width=1)
        for x in range(0,W):
            if (x+x0)%grid==0: d.text((x*scale+2,1),str(x+x0),fill=(255,255,0))
        for y in range(0,H):
            if (y+y0)%grid==0: d.text((1,y*scale+1),str(y+y0),fill=(255,255,0))
    im.save(path)
def limpiar(name,a,veces=3):
    """Funde pixeles sueltos: si un pixel no tiene vecino (4) del mismo tono, toma el tono mayoritario
    de su mismo grupo entre los 8 vecinos. El contorno y el transparente no se tocan."""
    g=grupo_de(name)
    a=a.copy(); H,W=a.shape
    for _ in range(veces):
        b=a.copy(); n=0
        for y in range(H):
            for x in range(W):
                c=a[y,x]
                if c<=0: continue
                v4=[a[yy,xx] for yy,xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)) if 0<=yy<H and 0<=xx<W]
                if c in v4: continue
                v8=[a[yy,xx] for yy in (y-1,y,y+1) for xx in (x-1,x,x+1) if (yy,xx)!=(y,x) and 0<=yy<H and 0<=xx<W]
                mismos=[v for v in v8 if v>0 and g.get(v)==g[c]]
                if not mismos: continue
                vals,cnt=np.unique(mismos,return_counts=True)
                if cnt.max()>=3: b[y,x]=vals[cnt.argmax()]; n+=1
        a=b
        if n==0: break
    return a
CH='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
def a_filas(a):
    return [''.join('.' if v<0 else CH[v] for v in row) for row in a]
def de_filas(filas):
    return np.array([[-1 if ch=='.' else CH.index(ch) for ch in f] for f in filas],dtype=int)
def parche(a,x,y,filas):
    """Pinta filas de texto sobre a. ' ' no toca, '.' borra, letra = indice."""
    for j,f in enumerate(filas):
        for i,ch in enumerate(f):
            if ch==' ': continue
            yy,xx=y+j,x+i
            if 0<=yy<a.shape[0] and 0<=xx<a.shape[1]:
                a[yy,xx]=-1 if ch=='.' else CH.index(ch)
    return a
def contorno(a):
    """Pone contorno 0 en todo pixel opaco que toca transparente (4-vecinos) y no es contorno ya."""
    H,W=a.shape; b=a.copy()
    for y in range(H):
        for x in range(W):
            if a[y,x]<0: continue
            for yy,xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if not(0<=yy<H and 0<=xx<W) or a[yy,xx]<0: b[y,x]=0; break
    return b
