"""
Importa piezas dibujadas del Universal LPC Spritesheet Character Generator (arte libre con créditos)
y las guarda como datos compactos para el motor: src/engine/parts/lpc-data.json

  python3 scripts/lpc_import.py [carpeta_cache]

Toma el primer cuadro de la animación idle en tres direcciones (de frente, de lado, de espalda).
Cada pieza guarda sus colores originales y los pixeles como índices: el motor las recolorea
manteniendo el sombreado del artista. Cada archivo usado queda con sus autores y licencias.
Fuente: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
"""
import base64, csv, io, json, os, subprocess, sys, urllib.request
from PIL import Image

REPO = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master'
CACHE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/lpc_cache'
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'engine', 'parts', 'lpc-data.json')
os.makedirs(CACHE, exist_ok=True)
# filas de idle.png: arriba, izquierda, abajo, derecha
ROWS = {'down': 2, 'right': 3, 'up': 0}


def fetch(path):
    local = os.path.join(CACHE, path.replace('/', '_'))
    if not os.path.exists(local):
        subprocess.run(['curl', '-s', '-f', '-m', '60', f'{REPO}/{path}', '-o', local], check=False)
    return local if os.path.exists(local) and os.path.getsize(local) > 0 else None


def credits():
    local = fetch('CREDITS.csv')
    rows = list(csv.reader(open(local, encoding='utf-8')))
    return {r[0].strip(): {'authors': r[2].strip(), 'licenses': r[3].strip(), 'urls': r[4].strip()} for r in rows[1:]}


def encode(img_path):
    try:
        im = Image.open(img_path).convert('RGBA')
    except Exception:
        return None
    dirs = {}
    for name, row in ROWS.items():
        fr = im.crop((0, row * 64, 64, row * 64 + 64))
        bb = fr.getbbox()
        if not bb:
            continue
        fr = fr.crop(bb)
        colors, px = [], bytearray()
        index = {}
        for y in range(fr.height):
            for x in range(fr.width):
                r, g, b, a = fr.getpixel((x, y))
                if a < 128:
                    px.append(0)
                    continue
                k = (r, g, b)
                if k not in index:
                    index[k] = len(colors)
                    colors.append('#%02x%02x%02x' % k)
                px.append(index[k] + 1)
        dirs[name] = {'x': bb[0], 'y': bb[1], 'w': fr.width, 'h': fr.height, 'colors': colors, 'px': base64.b64encode(bytes(px)).decode()}
    return dirs or None


def main():
    cred = credits()
    parts, used = {}, {}

    def add(key, path):
        local = fetch(path)
        if not local:
            print('falta', path)
            return
        d = encode(local)
        if not d:
            print('vacío', path)
            return
        parts[key] = {'file': path, 'dirs': d}
        rel = path.replace('spritesheets/', '')
        c = cred.get(rel)
        if not c and rel.startswith('head/faces/'):
            p2 = rel.split('/')
            c = cred.get('/'.join(p2[:2] + ['${head}'] + p2[3:]))
        if c:
            used[rel] = c
        else:
            print('sin crédito', rel)

    S = 'spritesheets/'
    for h in ['male', 'female', 'male_elderly', 'female_elderly', 'male_plump', 'male_gaunt']:
        add(f'head/{h}', f'{S}head/heads/human/{h}/idle.png')
    for sex in ['male', 'female']:
        for e in ['neutral', 'happy', 'closed', 'anger', 'sad', 'shock', 'blush']:
            add(f'face/{sex}/{e}', f'{S}head/faces/{sex}/{e}/idle.png')
    for b in ['thick', 'thin']:
        add(f'brows/{b}', f'{S}eyes/eyebrows/{b}/adult/idle.png')
    for n in ['straight', 'button', 'big', 'large', 'elderly']:
        add(f'nose/{n}', f'{S}head/nose/{n}/adult/idle.png')
    for b in ['5oclock_shadow', 'trimmed', 'basic', 'medium']:
        add(f'beard/{b}', f'{S}beards/beard/{b}/idle.png')
    add('beard/winter', f'{S}beards/beard/winter/male/idle.png')
    for m in ['basic', 'bigstache', 'chevron', 'french', 'handlebar', 'horseshoe', 'lampshade', 'walrus']:
        add(f'mustache/{m}', f'{S}beards/mustache/{m}/idle.png')
    for g in ['glasses', 'nerd', 'round', 'halfmoon', 'secretary', 'shades', 'sunglasses']:
        add(f'glasses/{g}', f'{S}facial/glasses/{g}/adult/idle.png')
    # peinados: los de adulto; algunos traen capa de atrás (bg) y de adelante (fg)
    files = [k for k in cred if k.startswith('hair/') and k.endswith('/idle.png') and '/adult/' in k and not k.startswith('hair/extensions')]
    for f in sorted(files):
        parts_ = f.split('/')
        style = parts_[1]
        layer = parts_[3] if len(parts_) > 4 and parts_[3] in ('bg', 'fg') else 'fg'
        add(f'hair{"bg" if layer == "bg" else ""}/{style}', S + f)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    data = {
        'source': 'Universal LPC Spritesheet Character Generator, https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator',
        'frame': 64,
        'parts': parts,
        'credits': used,
    }
    with open(OUT, 'w') as fh:
        json.dump(data, fh, separators=(',', ':'))
    print('piezas', len(parts), 'créditos', len(used), 'bytes', os.path.getsize(OUT))


main()
