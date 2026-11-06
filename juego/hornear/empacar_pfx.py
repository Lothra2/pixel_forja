#!/usr/bin/env python3
"""Empaca las hojas de pixelfx (fx_*.png) en pocos paquetes por grupo de uso, para no pasar el tope de archivos
del artifact. El juego baja un paquete entero (los PNG comprimidos) y decodifica cada página recién cuando un efecto la
usa. Uso: python3 juego/hornear/empacar_pfx.py <dir de la exportación>
Escribe juego/public/assets/fx/: pfx_<grupo>.txt (base64), efectos_pfx.json (con la ubicación de cada página en su paquete),
luz_efectos_pfx.json y las licencias."""
import base64, json, os, shutil, sys

ORIGEN = sys.argv[1]
SALIDA = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'fx')
os.makedirs(SALIDA, exist_ok=True)
for f in os.listdir(SALIDA):
    if f.startswith('pfx_') and (f.endswith('.bin') or f.endswith('.txt')): os.remove(os.path.join(SALIDA, f))

datos = json.load(open(os.path.join(ORIGEN, 'efectos_pfx.json')))

def grupo(e):
    tipos = [u['tipo'] for u in e.get('uso', [])]
    if e['capa'] == 'pantalla' and ('clima' in tipos or e['categoria'] == 'clima'): return 'clima'
    if e['categoria'] == 'transiciones': return 'extra'
    if 'estado' in tipos or 'muerte' in tipos or 'golpe' in tipos: return 'base'
    if 'poder' in tipos or 'monstruo' in tipos: return 'poderes'
    if 'clima' in tipos: return 'clima'
    return 'extra'

paquetes = {}
for e in datos['efectos']:
    g = grupo(e); e['paquete'] = g
    buf = paquetes.setdefault(g, bytearray())
    for p in e['paginas']:
        b = open(os.path.join(ORIGEN, p['archivo']), 'rb').read()
        p['ubic'] = [g, len(buf), len(b)]
        buf.extend(b)
for g, buf in paquetes.items():
    # en base64: el artifact no sirve binarios sueltos, el texto sí (el juego lo decodifica una vez)
    open(os.path.join(SALIDA, f'pfx_{g}.txt'), 'w').write(base64.b64encode(bytes(buf)).decode())
    print(f'pfx_{g}.txt', len([e for e in datos['efectos'] if e['paquete'] == g]), 'efectos', round(len(buf) / 1e6, 2), 'MB')
json.dump(datos, open(os.path.join(SALIDA, 'efectos_pfx.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
shutil.copy(os.path.join(ORIGEN, 'luz_efectos_pfx.json'), SALIDA)
for f in ('LICENSE-pixelfx.txt', 'NOTICE-pixelfx.md'): shutil.copy(os.path.join(ORIGEN, f), SALIDA)
print('archivos en fx/:', len(os.listdir(SALIDA)))
