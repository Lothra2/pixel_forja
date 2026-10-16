import numpy as np
CH='ABCDEFGHIJKLMNOPQRSTUVWXYZ'
def L(c): return CH.index(c)
def pintar_pecho(t):
    """El pecho de Rick que tapan los brazos, pintado con reglas a mano: el gi rojo con su sombra atras, la solapa
    que baja en diagonal, el pecho en V con los pectorales y los abdominales."""
    t=t.copy(); orig=t>=0
    for y in range(13,38):
        xl=30+(y-13)*7/21; xr=42-(y-13)*2/21
        x0=21+max(0,3-(y-13))
        for x in range(21,44):
            if orig[y,x]: continue
            if x<x0: continue
            if x==x0 or y==13: v='A'
            elif y>=35:
                v='K' if x<=23 else ('J' if (x+y)%5==0 else 'I')
            elif x<xl-1:
                if x<=22: v='K'
                elif x<=24 or (x==x0+1): v='J'
                elif y<=16 and 24<x<30: v='H'
                elif abs(x-(26+(y-15)*0.3))<0.5: v='J'
                else: v='I'
            elif x<=xl+1:
                v='J' if x>xl else 'H'
            elif x<xr:
                if y<19: v='C' if x<xr-2 else 'D'
                elif y<22: v='D'
                elif y==22: v='E'
                elif y in (26,30) or abs(x-(xl+xr)/2)<0.6: v='E'
                else: v='D'
            elif x<=xr+1: v='J'
            else: v='I'
            t[y,x]=L(v)
    return t
