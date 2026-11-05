#!/usr/bin/env python3
"""Deja la portada de la Forja lista para la web: pasa a WebP (calidad 88, con transparencia) las hojas pesadas
del título, las cartas y los fondos grandes, borra los PNG pasados y las capturas de prueba (qa/), y corrige las
rutas en portada.json. Correr después de: npx tsx scripts/gotico-portada.ts juego/public/assets/portada"""
import json, os, shutil, sys
from concurrent.futures import ProcessPoolExecutor
from PIL import Image

RAIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'portada')

def pesado(rel):
    return rel.startswith('cartas/') or (rel.startswith('cinematicas/') and rel != 'cinematicas/vineta.png') or '_anim_' in rel or '_revelar_' in rel or rel.endswith('_1600.png') or rel in ('fondo/cielo.png', 'fondo/cementerio.png')

def pasar(rel):
    f = os.path.join(RAIZ, rel); out = f[:-4] + '.webp'
    Image.open(f).save(out, 'WEBP', quality=88, method=4); os.remove(f)
    return rel

if __name__ == '__main__':
    shutil.rmtree(os.path.join(RAIZ, 'qa'), ignore_errors=True)
    todos = [os.path.relpath(os.path.join(d, n), RAIZ).replace(os.sep, '/') for d, _, ns in os.walk(RAIZ) for n in ns if n.endswith('.png')]
    lista = [r for r in todos if pesado(r)]
    with ProcessPoolExecutor() as ex: hechos = set(ex.map(pasar, lista))
    p = os.path.join(RAIZ, 'portada.json'); txt = open(p, encoding='utf8').read()
    for r in hechos: txt = txt.replace('"' + r + '"', '"' + r[:-4] + '.webp"')
    open(p, 'w', encoding='utf8').write(txt)
    tot = sum(os.path.getsize(os.path.join(d, n)) for d, _, ns in os.walk(RAIZ) for n in ns)
    print(f'{len(hechos)} a WebP, portada {tot / 1e6:.1f} MB')
