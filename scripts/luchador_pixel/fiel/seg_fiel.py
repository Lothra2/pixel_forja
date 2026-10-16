import sys, os, json, numpy as np
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0,R)
import lib
from segmentar import segmentar, relleno_aparte, vista, escribir_ts, variantes_ts, poly_mask, rellenar
from paleta import srgb2lab
import os
S=os.path.join(os.path.dirname(os.path.abspath(__file__)),'datos','fiel')
def escalar_defs(defs, sx, sy):
    out={}
    for k,d in defs.items():
        e=dict(d)
        if 'poly' in d: e['poly']=[[(round(x*sx),round(y*sy)) for x,y in p] for p in d['poly']]
        e['pivote']=(round(d['pivote'][0]*sx),round(d['pivote'][1]*sy))
        out[k]=e
    return out
def esc_polys(ps,sx,sy): return [[(round(x*sx),round(y*sy)) for x,y in p] for p in ps]
