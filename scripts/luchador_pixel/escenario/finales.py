"""Las ilustraciones del final del modo arcade (lote G): una por luchador y una de la familia, a 768 x 432 en pixel.

Entrada: fiel/datos/familia/crudo/finales/<id>.png (Higgsfield, 16:9, no van al repo).
Salida: docs/pelea/JUEGO/assets/finales/<id>.png. Igual que el fondo del título: se baja a 384 x 216 por cajas, se
deja en 96 tonos y se agranda x2 sin suavizar, para que el pixel sea del mismo tamaño que el de la pelea.
"""
import os, glob
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
ENTRA = os.path.join(AQUI, '..', 'fiel', 'datos', 'familia', 'crudo', 'finales')
SALE = os.path.join(AQUI, '..', '..', '..', 'docs', 'pelea', 'JUEGO', 'assets', 'finales')


def final(ruta):
    im = Image.open(ruta).convert('RGB')
    # recorte al 16:9 exacto, centrado
    w, h = im.size
    if w / h > 16 / 9:
        nw = round(h * 16 / 9)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * 9 / 16)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    chico = im.resize((384, 216), Image.BOX)
    chico = chico.quantize(96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    return chico.resize((768, 432), Image.NEAREST)


if __name__ == '__main__':
    os.makedirs(SALE, exist_ok=True)
    for r in sorted(glob.glob(os.path.join(ENTRA, '*.png'))):
        n = os.path.basename(r)
        final(r).save(os.path.join(SALE, n), optimize=True)
        print(n)
