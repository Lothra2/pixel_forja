"""Revisión de un luchador exportado: un GIF con todas sus animaciones a velocidad real (60 ticks por segundo) y
una lámina con un cuadro de cada una, con las cajas encima (verde recibe, rojo pega, azul empuje).

    python3 sf2_ver.py rick [carpeta de salida]
"""
import json, os, sys
from PIL import Image, ImageDraw
AQUI = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(AQUI, '..', '..', '..', 'docs', 'pelea', 'JUEGO', 'assets', 'luchadores')


def cuadros(pid):
    m = json.load(open(os.path.join(A, pid, 'manifest.json')))
    for n, a in m['anims'].items():
        if n.endswith('_bola'):
            continue
        hoja = Image.open(os.path.join(A, pid, a['hoja'])).convert('RGBA')
        for k, c in enumerate(a['cuadros']):
            yield n, a, k, c, hoja.crop((k * a['w'], 0, (k + 1) * a['w'], a['h']))


def gif(pid, sale):
    frames, durs = [], []
    for n, a, k, c, img in cuadros(pid):
        f = Image.new('RGBA', (a['w'], a['h'] + 14), (52, 60, 84, 255))
        d = ImageDraw.Draw(f)
        d.line([(0, a['oy']), (a['w'], a['oy'])], fill=(90, 100, 120, 255))
        f.alpha_composite(img, (0, 0))
        d.text((4, a['h'] + 2), f'{n} {k}', fill=(255, 255, 255, 255))
        frames.append(f.convert('P', palette=Image.ADAPTIVE))
        durs.append(max(20, round(c['ticks'] * 1000 / 60 / 10) * 10))
    frames[0].save(os.path.join(sale, f'{pid}_anims.gif'), save_all=True, append_images=frames[1:], duration=durs, loop=0, disposal=2)


def lamina(pid, sale):
    celdas = []
    vistos = set()
    for n, a, k, c, img in cuadros(pid):
        if n in vistos and c['fase'] != 'activo':
            continue
        if n in vistos:
            continue
        if any(cc['fase'] == 'activo' for cc in a['cuadros']) and c['fase'] != 'activo':
            continue
        vistos.add(n)
        f = Image.new('RGBA', (a['w'], a['h'] + 14), (52, 60, 84, 255))
        f.alpha_composite(img, (0, 0))
        d = ImageDraw.Draw(f)
        ox, oy = a['ox'], a['oy']
        for z in c['recibe']:
            x, y, w, h = z['caja']
            d.rectangle([ox + x, oy + y, ox + x + w, oy + y + h], outline=(80, 255, 120, 255))
        for x, y, w, h in c['pega']:
            d.rectangle([ox + x, oy + y, ox + x + w, oy + y + h], outline=(255, 60, 60, 255), width=2)
        x, y, w, h = c['empuje']
        d.rectangle([ox + x, oy + y, ox + x + w, oy + y + h], outline=(80, 140, 255, 255))
        d.text((4, a['h'] + 2), n, fill=(255, 255, 255, 255))
        celdas.append(f)
    cols = 8
    W, H = celdas[0].size
    o = Image.new('RGBA', (W * cols, H * ((len(celdas) + cols - 1) // cols)), (20, 20, 20, 255))
    for i, c in enumerate(celdas):
        o.alpha_composite(c, ((i % cols) * W, (i // cols) * H))
    o.save(os.path.join(sale, f'{pid}_lamina.png'))


if __name__ == '__main__':
    pid = sys.argv[1]
    sale = sys.argv[2] if len(sys.argv) > 2 else '.'
    os.makedirs(sale, exist_ok=True)
    gif(pid, sale)
    lamina(pid, sale)
