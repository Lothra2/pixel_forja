import numpy as np
def pintar_pecho(t, sx, sy, tono, x_max=44):
    """El pecho de Rick bajo los brazos, con las mismas reglas que a 108 pero a la resolucion de la hoja: el gi rojo
    con la sombra atras, la solapa que baja en diagonal, el pecho en V con pectorales y abdominales.
    tono: rol -> indice de la paleta (A contorno, K J I H rojos de oscuro a claro, C D E piel de clara a oscura)."""
    t=t.copy(); orig=t>=0; H,W=t.shape
    for y in range(int(13*sy),int(38*sy)):
        oy=y/sy
        x0=(21+6*max(0,1-(oy-13)/7)**2)*sx
        xl=(30+(oy-13)*7/21)*sx; xr=(42-(oy-13)*2/21)*sx
        for x in range(int(21*sx),int(x_max*sx)):
            if orig[y,x] or x<x0: continue
            ox=x/sx
            if x<x0+1 or y<13*sy+1: v='A'
            elif oy>=35:
                v='K' if ox<=23 else ('J' if int(ox+oy)%5==0 else 'I')
            elif x<xl-1.5*sx:
                if ox<=22.5: v='K'
                elif ox<=24.5 or x<x0+2: v='J'
                elif oy<=16 and 24<ox<30: v='H'
                elif abs(ox-(26+(oy-15)*0.3))<0.35: v='J'
                else: v='I'
            elif x<=xl+1.5*sx:
                v='J' if x>xl+0.5*sx else 'H'
            elif x<xr:
                if oy<19: v='C' if x<xr-2*sx else 'D'
                elif oy<22: v='D'
                elif oy<23: v='E'
                elif abs(oy-26)<0.4 or abs(oy-30)<0.4 or abs(x-(xl+xr)/2)<0.6: v='E'
                else: v='D'
            elif x<=xr+1.5*sx: v='J'
            else: v='I'
            t[y,x]=tono[v]
    return t
