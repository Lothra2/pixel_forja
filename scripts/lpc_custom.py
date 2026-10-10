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
        # de espalda el pelo baja hasta la nuca (si no, se ve la cabeza pelada por detrás)
        'fill_head': {'up': (27, 31)},
        # sin huecos de piel: sienes, sobre las orejas y la nuca quedan cubiertas (lados cortos pero con pelo)
        'pixels': {
            'down': [(18, 8, '2'), (18, 23, '2'), (18, 24, '0'), (20, 6, '7'), (20, 7, '7'), (21, 6, '7'), (21, 7, '7'),
                     (20, 24, '7'), (20, 25, '7'), (21, 24, '7'), (21, 25, '7')],
            'right': [(21, 16, '1'), (21, 17, '1')] + [(y, x, '7') for y in range(20, 26) for x in (6, 7)] + [(26, 7, '7'), (26, 9, '7'), (26, 10, '7'), (26, 11, '7')],
            'up': [(19, 8, '2'), (19, 23, '2'), (19, 24, '0'), (20, 23, '7')] + [(y, 7, '7') for y in range(21, 27)] + [(y, x, '7') for y in range(21, 27) for x in (23, 24)],
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
            # rellena filas sobre la forma de la cabeza (la de todas las cabezas de hombre, para no sobresalir)
            if dn in spec.get('fill_head', {}):
                y0, y1 = spec['fill_head'][dn]
                heads = [decode(data['parts'][f'head/{h}']['dirs'][dn]) for h in ('male', 'male_gaunt', 'male_plump', 'male_elderly')]
                common = set(heads[0]).intersection(*[set(h) for h in heads[1:]])
                for (x, y) in common:
                    if y0 <= y <= y1 and (x, y) not in pix:
                        edge = (x - 1, y) not in common or (x + 1, y) not in common or y == y1
                        pix[(x, y)] = RAMP[1] if edge else RAMP[7]
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
