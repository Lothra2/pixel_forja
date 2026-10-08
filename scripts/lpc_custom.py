"""Peinados propios de PixelForja, derivados de piezas LPC (misma licencia, crédito a los autores originales).

Uso: python3 scripts/lpc_custom.py   (después de lpc_import.py; es idempotente)

Cada peinado parte de un peinado LPC y reemplaza filas o pixeles a mano. Los dígitos son tonos de la rampa
LPC de pelo (0 contorno ... 5 brillo), 7 es el tono de los lados rapados, '.' borra el pixel (se ve la cabeza).
Las columnas van de x=16 a x=47 del cuadro de 64 de LPC, igual que el volcado de scripts/lpc_board.ts.
"""
import base64, json, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'engine', 'parts', 'lpc-data.json')
RAMP = ['#260d14', '#6a1108', '#a42600', '#bf4000', '#e55600', '#ff8a00', None, '#a22600']
X0 = 16

CUSTOM = {
    # lados cortos, arriba con volumen peinado hacia atrás y un poco de entradas (el de Rick)
    'swept_back': {
        'base': 'high_and_tight',
        'rows': {
            'down': {
                12: (13, '1111111'),
                13: (11, '11345543211'),
                14: (10, '1345554432211'),
                15: (9, '13445544332211'),
                16: (9, '134444443322111'),
            },
            'right': {
                12: (16, '1111111'),
                13: (12, '111234555541'),
                14: (10, '113333444554431'),
                15: (9, '1222333444443221'),
                16: (9, '1122224433222221'),
            },
            'up': {
                13: (13, '111111'),
                14: (11, '1123333211'),
                15: (10, '112344443211'),
                16: (9, '12234444332211'),
            },
        },
        # entradas: las esquinas de la frente suben
        'pixels': {
            'down': [(20, 10, '.'), (20, 11, '.'), (20, 20, '.'), (19, 10, '0'), (19, 11, '0'), (19, 19, '0')],
        },
    },
}


def decode(p):
    px = base64.b64decode(p['px'])
    out = {}
    for y in range(p['h']):
        for x in range(p['w']):
            v = px[y * p['w'] + x]
            if v:
                out[(p['x'] + x, p['y'] + y)] = p['colors'][v - 1]
    return out


def encode(pix):
    xs = [x for x, _ in pix]
    ys = [y for _, y in pix]
    x0, y0 = min(xs), min(ys)
    w, h = max(xs) - x0 + 1, max(ys) - y0 + 1
    colors = sorted(set(pix.values()))
    buf = bytearray(w * h)
    for (x, y), c in pix.items():
        buf[(y - y0) * w + (x - x0)] = colors.index(c) + 1
    return {'x': x0, 'y': y0, 'w': w, 'h': h, 'colors': colors, 'px': base64.b64encode(bytes(buf)).decode()}


def main():
    data = json.load(open(OUT))
    for name, spec in CUSTOM.items():
        base = data['parts']['hair/' + spec['base']]
        dirs = {}
        for dn, pd in base['dirs'].items():
            pix = decode(pd)
            for y, (start, s) in spec['rows'].get(dn, {}).items():
                for x in [x for x, yy in pix if yy == y]:
                    del pix[(x, y)]
                for i, ch in enumerate(s):
                    if ch not in '. ':
                        pix[(X0 + start + i, y)] = RAMP[int(ch)]
            for y, i, ch in spec['pixels'].get(dn, []):
                if ch == '.':
                    pix.pop((X0 + i, y), None)
                else:
                    pix[(X0 + i, y)] = RAMP[int(ch)]
            dirs[dn] = encode(pix)
        rel = f'pixelforja/hair/{name}/idle.png'
        src = base['file'].replace('spritesheets/', '')
        c = data['credits'][src]
        data['parts']['hair/' + name] = {'file': 'spritesheets/' + rel, 'dirs': dirs}
        data['credits'][rel] = {
            'authors': c['authors'] + ',PixelForja (edición del peinado ' + spec['base'] + ')',
            'licenses': c['licenses'],
            'urls': c['urls'],
        }
    with open(OUT, 'w') as fh:
        json.dump(data, fh, separators=(',', ':'))
    print('peinados propios', list(CUSTOM))


main()
