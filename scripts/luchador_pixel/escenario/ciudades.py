"""Las ciudades por capas: Caracas, Ho Chi Minh y Bogotá, igual que el castillo japonés (capas.py), y además:

1. **Cada capa se apila sobre la de adelante.** Las capas que se piden aparte no siempre salen a la misma altura.
   Se corren solo en vertical: el muro se para sobre el piso, el río va al pie del muro, la ciudad esconde su base
   detrás del muro (o del río) y los montes esconden la suya detrás de la ciudad.
2. **Los extras animados** (guacamayas, teleféricos, botes, palomas, globos) vienen en una hoja aparte sobre magenta.
   Cada uno se recorta solo y se guarda como su propio PNG.

Entrada: escenario/datos/<ciudad>/{maestra,cielo,...,frente,elementos}.png (no van en el repo, son grandes).
Salida: public/escenarios/<ciudad>/<capa>.png a 611 x 262 con una paleta común de 96 tonos, y elementos/*.png.
"""
import numpy as np, sys, os, json, cv2
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..', 'fiel'))
from paleta import srgb2lab, kmeans
F = 2.2
CIUDADES = {
    'caracas': {'ajuste': {}, 'capas': ['cielo', 'montes', 'ciudad', 'muro', 'piso', 'frente'],
                'elementos': ['guacamaya_roja_1', 'guacamaya_roja_2', 'guacamaya_roja_3', 'guacamaya_azul_1', 'guacamaya_azul_2', 'teleferico'],
                'altos': [15, 9, 13, 15, 13, 11]},
    'hochiminh': {'ajuste': {'ciudad': -50}, 'capas': ['cielo', 'ciudad', 'rio', 'muro', 'piso', 'frente'],
                  'elementos': ['sampan', 'crucero', 'loto_1', 'loto_2', 'ferry'],
                  'altos': [9, 14, 5, 5, 9]},
    'bogota': {'ajuste': {}, 'capas': ['cielo', 'montes', 'ciudad', 'muro', 'piso', 'frente'],
               'elementos': ['paloma_1', 'paloma_2', 'paloma_3', 'paloma_suelo', 'teleferico', 'globos'],
               'altos': [8, 5, 7, 6, 10, 26]},
    # el mundo celestial de Alana: islas que flotan donde las ciudades tienen montes, y un mar de nubes donde van los
    # edificios. Su capa del piso trae la baranda pegada: se queda solo el mármol (piso_solo)
    'celestial': {'ajuste': {'ciudad': 195}, 'piso_solo': True, 'capas': ['cielo', 'montes', 'ciudad', 'muro', 'piso', 'frente'],
                  'elementos': ['farol', 'mariposa_1', 'mariposa_2', 'estrella_fugaz', 'isla', 'grulla'],
                  'altos': [11, 9, 9, 10, 30, 16]},
    # los seis mundos del lote E del juego (sus manifests ya existen allá: aquí solo salen los PNG con esos nombres).
    # En Río, Guiza y el Polo Norte la ciudad va delante del agua (rio_atras): se para en el muro y el agua queda detrás.
    # Venecia, Río y Guiza llevan sus capas de fondo más arriba (ajuste, en pixeles de la maestra) para que el muro alto
    # no tape los palacios, los edificios de Copacabana ni las pirámides
    'china': {'ajuste': {}, 'capas': ['cielo', 'montes', 'ciudad', 'muro', 'piso', 'frente'],
              'elementos': ['cometa_1', 'cometa_2', 'ave_1', 'ave_2'], 'altos': [12, 12, 6, 6]},
    'italia': {'ajuste': {'ciudad': -176, 'rio': -110}, 'capas': ['cielo', 'ciudad', 'rio', 'muro', 'piso', 'frente'],
               'elementos': ['gondola'], 'altos': [14]},
    'usa': {'ajuste': {}, 'capas': ['cielo', 'ciudad', 'rio', 'muro', 'piso', 'frente'],
            'elementos': ['carguero', 'remolcador', 'velero', 'ave_1', 'ave_2'], 'altos': [22, 16, 28, 6, 6]},
    'brasil': {'ajuste': {'ciudad': -400}, 'rio_atras': True, 'capas': ['cielo', 'montes', 'rio', 'ciudad', 'muro', 'piso', 'frente'],
               'elementos': ['teleferico', 'guacamaya_1', 'guacamaya_2'], 'altos': [12, 8, 8]},
    'egipto': {'ajuste': {'montes': -220, 'rio': -200, 'ciudad': -220, 'muro': 150}, 'rio_atras': True, 'capas': ['cielo', 'montes', 'rio', 'ciudad', 'muro', 'piso', 'frente'],
               'elementos': ['faluca', 'camello', 'halcon_1', 'halcon_2'], 'altos': [26, 20, 8, 8]},
    # los mundos de los jefes (lote G): Hạ Long con su templo flotante y el Salto Ángel con la tormenta del Catatumbo.
    # No llevan extras animados: el juego los pinta con código
    'halong': {'ajuste': {'montes': -260}, 'capas': ['cielo', 'montes', 'ciudad', 'muro', 'piso', 'frente'], 'elementos': [], 'altos': []},
    'salto_angel': {'ajuste': {'montes': -170}, 'capas': ['cielo', 'montes', 'ciudad', 'muro', 'piso', 'frente'], 'elementos': [], 'altos': []},
    # la casa va en espejo y un poco más arriba: así la ventana con la novela queda libre de la hamaca y del muro
    'casa_abuela': {'ajuste': {'ciudad': -160}, 'espejo': ['ciudad'], 'capas': ['cielo', 'montes', 'ciudad', 'muro', 'piso', 'frente'], 'elementos': [], 'altos': []},
    # la cocina de Rosita: la ventana de la pared (ciudad) es un hueco y por ahí se ven el cielo y el Ávila
    'casa_rosita': {'ajuste': {}, 'capas': ['cielo', 'montes', 'ciudad', 'muro', 'piso', 'frente'], 'elementos': [], 'altos': []},
    'cancha': {'ajuste': {}, 'capas': ['cielo', 'montes', 'ciudad', 'muro', 'piso', 'frente'], 'elementos': [], 'altos': []},
    'polo_norte': {'ajuste': {}, 'rio_atras': True, 'capas': ['cielo', 'montes', 'rio', 'ciudad', 'muro', 'piso', 'frente'],
                   'elementos': ['oso_1', 'oso_2'], 'altos': [16, 16]},
}


def magenta(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return ((r + b) / 2 - g > 120) & (np.abs(r - b) < 70) & (g < 110)


def filas(m, umbral=0.02):
    """La primera y la última fila con algo opaco."""
    f = np.where(m.mean(1) > umbral)[0]
    return int(f.min()), int(f.max())


def apilar(capas, rio_atras=False):
    """Cuánto bajar (o subir) cada capa para que se tapen bien una con otra."""
    dy = {}
    piso_top = int(np.where(capas['piso'][1].mean(1) > 0.5)[0].min())
    _, muro_bot = filas(capas['muro'][1])
    dy['muro'] = piso_top + 3 - muro_bot
    base = muro_bot + dy['muro']
    if rio_atras:
        # la ciudad delante del agua: las dos se paran detrás del muro y los montes esconden su base tras el agua
        _, rio_bot = filas(capas['rio'][1])
        dy['rio'] = base - rio_bot
        _, cbot = filas(capas['ciudad'][1])
        dy['ciudad'] = base - cbot
        rio_top, _ = filas(capas['rio'][1], 0.5)
        if 'montes' in capas:
            _, mbot = filas(capas['montes'][1])
            dy['montes'] = rio_top + dy['rio'] + 6 - mbot
        base = None
    if 'rio' in capas and base is not None:
        _, rio_bot = filas(capas['rio'][1])
        dy['rio'] = base - rio_bot
        rio_top, _ = filas(capas['rio'][1], 0.5)
        base = rio_top + dy['rio'] + 6
    if base is not None:
        _, cbot = filas(capas['ciudad'][1])
        dy['ciudad'] = base - cbot
        if 'montes' in capas:
            mtop, mbot = filas(capas['montes'][1])
            dy['montes'] = cbot + dy['ciudad'] - mbot
    # lo más alto (la cruz del Ávila, Monserrate, las torres) tiene que quedar a la vista con la cámara en reposo,
    # que muestra de la fila 38 del arte para abajo
    tope = int(46 * F)
    for n in ('montes', 'ciudad'):
        if n in capas:
            t, _ = filas(capas[n][1])
            if t + dy[n] < tope:
                dy[n] = tope - t
    return dy


def mover(capa, m, dy, W, H):
    A = np.float32([[1, 0, 0], [0, 1, dy]])
    c = cv2.warpAffine(capa.astype(np.float32), A, (W, H), flags=cv2.INTER_NEAREST, borderValue=(255, 0, 255))
    mm = cv2.warpAffine(m.astype(np.uint8), A, (W, H), flags=cv2.INTER_NEAREST, borderValue=0) > 0
    return c, mm


def bajar(a, m):
    H, W = a.shape[:2]
    h, w = int(round(H / F)), int(round(W / F))
    out = np.zeros((h, w, 3))
    al = np.zeros((h, w))
    ys = np.linspace(0, H, h + 1).astype(int)
    xs = np.linspace(0, W, w + 1).astype(int)
    for j in range(h):
        for i in range(w):
            blk = a[ys[j]:ys[j + 1], xs[i]:xs[i + 1]].reshape(-1, 3)
            mk = m[ys[j]:ys[j + 1], xs[i]:xs[i + 1]].reshape(-1)
            al[j, i] = mk.mean()
            if mk.any():
                out[j, i] = np.median(blk[mk], axis=0)
    return out, al >= 0.5


def elementos(a):
    """Los sprites de la hoja de elementos, de izquierda a derecha: (imagen, máscara)."""
    m = ~magenta(a)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    grandes = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 300]
    # se juntan los pedazos que se tocan en x (un ala, la estela) con su sprite
    cajas = sorted([[st[i, 0], st[i, 1], st[i, 0] + st[i, 2], st[i, 1] + st[i, 3]] for i in grandes])
    unidas = []
    for c in cajas:
        if unidas and c[0] <= unidas[-1][2] + 6:
            u = unidas[-1]
            unidas[-1] = [min(u[0], c[0]), min(u[1], c[1]), max(u[2], c[2]), max(u[3], c[3])]
        else:
            unidas.append(c)
    return [(a[y0:y1, x0:x1], m[y0:y1, x0:x1]) for x0, y0, x1, y1 in unidas]


def ciudad(nombre):
    c = CIUDADES[nombre]
    ENTRA = os.path.join(AQUI, 'datos', nombre)
    SALE = os.path.join(AQUI, '..', '..', '..', 'public', 'escenarios', nombre)
    os.makedirs(os.path.join(SALE, 'elementos'), exist_ok=True)
    leer = lambda n: np.asarray(Image.open(os.path.join(ENTRA, n + '.png')).convert('RGB')).astype(float)
    maestra = leer('maestra')
    H, W = maestra.shape[:2]
    # el tamaño del pixel del arte sale del ancho de la maestra: el escenario siempre queda de 611 de ancho (las
    # maestras de Higgsfield en 2k son el doble de grandes que las de antes)
    global F
    F = W / 611
    crudas, info = {}, {}
    for n in c['capas']:
        a = leer(n)
        m = np.ones(a.shape[:2], bool) if n == 'cielo' else ~magenta(a)
        if n == 'piso' and c.get('piso_solo'):
            # el piso es el tramo lleno que llega hasta abajo: lo de arriba de su último hueco (la baranda) se va
            llenas = m.mean(1) > 0.97
            m[:int(np.where(~llenas)[0].max()) + 1] = False
        if n in c.get('espejo', ()):
            a, m = a[:, ::-1].copy(), m[:, ::-1].copy()
        crudas[n] = (a, m)
    dy = apilar(crudas, c.get('rio_atras', False))
    bajadas = {}
    for n in c['capas']:
        a, m = crudas[n]
        d = dy.get(n, 0) + c['ajuste'].get(n, 0)
        if d:
            a, m = mover(a, m, d, W, H)
        info[n] = d
        bajadas[n] = bajar(a, m)
        print(nombre, n, 'dy', d, round(float(bajadas[n][1].mean()), 2), flush=True)
    # cada extra a su tamaño en la escena (la hoja los trae grandes)
    sprites = []
    hoja_el = os.path.join(ENTRA, 'elementos.png')
    for i, (a, m) in enumerate(elementos(leer('elementos')) if os.path.exists(hoja_el) else []):
        alto = c['altos'][i] if i < len(c['altos']) else 12
        k = alto / a.shape[0]
        w = max(1, int(round(a.shape[1] * k)))
        rgb = cv2.resize((a * m[..., None]).astype(np.float32), (w, alto), interpolation=cv2.INTER_AREA)
        al = cv2.resize(m.astype(np.float32), (w, alto), interpolation=cv2.INTER_AREA)
        sprites.append(((rgb / np.maximum(al[..., None], 1e-3)).astype(float), al >= 0.5))
    print(nombre, 'elementos', len(sprites), [s[0].shape[:2] for s in sprites])
    # una paleta para todo el escenario, con los extras
    X = np.concatenate([srgb2lab(o[m]) for o, m in list(bajadas.values()) + sprites])
    rng = np.random.default_rng(0)
    C, _ = kmeans(X[rng.choice(len(X), min(len(X), 40000), replace=False)], 96, it=25)
    todos = list(bajadas.items()) + [(f'elementos/{i}', s) for i, s in enumerate(sprites)]
    idxs = {}
    suma, cuenta = np.zeros((96, 3)), np.zeros(96)
    for n, (o, m) in todos:
        L = srgb2lab(o.reshape(-1, 3)).reshape(o.shape)
        idxs[n] = ((L[:, :, None, :] - C[None, None]) ** 2).sum(3).argmin(2)
        for k in range(96):
            sel = (idxs[n] == k) & m
            suma[k] += o[sel].sum(0)
            cuenta[k] += sel.sum()
    pal = (suma / np.maximum(cuenta, 1)[:, None]).clip(0, 255).astype('uint8')
    nombres = c['elementos']
    for n, (o, m) in todos:
        rgba = np.zeros(o.shape[:2] + (4,), 'uint8')
        rgba[..., :3] = pal[idxs[n]]
        rgba[..., 3] = np.where(m, 255, 0)
        if n.startswith('elementos/'):
            i = int(n.split('/')[1])
            ys, xs = np.where(m)
            rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            n = 'elementos/' + (nombres[i] if i < len(nombres) else f'extra_{i}')
        Image.fromarray(rgba).save(os.path.join(SALE, n + '.png'))
    json.dump(info, open(os.path.join(SALE, '_alineacion.json'), 'w'), indent=1)


if __name__ == '__main__':
    for n in (sys.argv[1:] or list(CIUDADES)):
        ciudad(n)
