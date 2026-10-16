import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__))); from lib import *
a=np.load(S+'/datos/rick_limpio.npy')
# 1. quitar las colas viejas de la cinta
lim={11:29,12:28,13:25,14:19,15:18}
for y in range(0,16):
    xmax=33 if y<=10 else lim[y]
    for x in range(0,xmax):
        if y<=10 or a[y,x] in (0,14,15,16,19,20,21) or x<xmax: a[y,x]=-1
# 2. cara a mano (x33..47, y0..14). ' ' no toca
cara=[
"....AAAAAA.....",
"..AASRSRRSAA...",
".ASRSRRSRRRSA..",
"ASSRSRRSRCCCCA.",
"ASRSSRSSCBBCCA.",
"APOOOOOOOOOOOA.",
"AQPPPPPPPPPQQA.",
"ASSAEDCCFFFCCA.",
"ASRAEFDCMAOMCA.",
"ASSAEEDCCMMCCDA",
" ASAEDDCCCDCCA.",
" AAEDDCTTCCCCA.",
"  EDUTTUTTAAUA.",
"  EDDUTUTUTTUA.",
"  DDEFUVUTUVA..",
]
parche(a,33,0,cara)
# 3. colas de la cinta: dos cintas de 2 px que ondean hacia atras
def cinta(x0,x1,y0,pend,amp,per,fase,ta,tb):
    px=[]
    for x in range(x0,x1-1,-1):
        d=x0-x
        y=y0+pend*d+amp*math.sin(d/per+fase)
        dy=pend+amp*math.cos(d/per+fase)/per
        yi=round(y); grosor=2 if d<(x0-x1)-4 else 1
        giro=abs(dy)>0.55
        px.append((x,yi,16 if giro else ta))
        if grosor==2: px.append((x,yi+1,16 if giro else tb))
    return set(px)
import math
c1=cinta(32,11,4.6,0.02,1.3,3.2,0.0,14,15)
c2=cinta(32,13,6.2,0.17,1.1,2.6,1.6,15,16)
for x,y,t in sorted(c2|c1,key=lambda p:p[2]):
    if a[y,x]<0 or a[y,x]==0: a[y,x]=t
# contorno solo alrededor de las cintas
H,W=a.shape
b=a.copy()
for y in range(0,13):
    for x in range(0,33):
        if a[y,x]<0 and any(0<=yy<H and 0<=xx<W and a[yy,xx] in (14,15,16) for yy,xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1))): b[y,x]=0
a=b
np.save(SAL+'/rick_base.npy',a)
png('rick',a,SAL+'/rick_base_x8.png')
png('rick',a[:22,6:50],SAL+'/rick_base_cabeza.png',scale=16,grid=5,x0=6)
