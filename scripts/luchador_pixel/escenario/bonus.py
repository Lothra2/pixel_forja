"""Los minijuegos del juego (lote E): el carro que se destruye en 6 etapas, el barril y los pedazos que vuelan.

Lote H: carro nuevo al doble (un sedán americano de los 70, de los que ruedan en Venezuela) con `python3 bonus.py
carro`. Sale de datos/bonus/carro_nuevo.png (6 etapas en 3 columnas y 2 filas) y piezas.png (retrovisor, capó, puerta,
caucho, parachoques y vidrio en fila): carro_0.png a carro_5.png de 340 x 150 y pieza_<nombre>.png a su tamaño.

Entrada: escenario/datos/bonus/{carro,barril}.png, hojas de Higgsfield sobre magenta (no van en el repo).
Salida: docs/pelea/JUEGO/assets/bonus/carro_0.png a carro_5.png (130 x 70), barril.png (26 x 32) y los pedazos de 8 x 8
(pedazo_lata, pedazo_vidrio, pedazo_rueda, pedazo_madera, pedazo_aro). Todo a la misma escala dentro de su grupo,
parado sobre la base y centrado, con una paleta común de 48 tonos.
"""
import numpy as np, os, sys, cv2
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.path.insert(0, os.path.join(AQUI, '..', 'fiel'))
from ciudades import elementos
from paleta import srgb2lab, kmeans
SALE = os.path.join(AQUI, '..', '..', '..', 'docs', 'pelea', 'JUEGO', 'assets', 'bonus')


def leer(n):
    return np.asarray(Image.open(os.path.join(AQUI, 'datos', 'bonus', n + '.png')).convert('RGB')).astype(float)


def achicar(a, m, k):
    h, w = max(1, round(a.shape[0] * k)), max(1, round(a.shape[1] * k))
    rgb = cv2.resize((a * m[..., None]).astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    al = cv2.resize(m.astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    return rgb / np.maximum(al[..., None], 1e-3), al >= 0.5


def en_lienzo(o, m, W, H):
    """Centrado en x y apoyado en la base del lienzo. Lo que pase de alto (el humo del motor) se corta arriba."""
    out, mm = np.zeros((H, W, 3)), np.zeros((H, W), bool)
    o, m = o[-H:], m[-H:]
    h, w = o.shape[:2]
    x, y = (W - w) // 2, H - h
    out[y:, x:x + w], mm[y:, x:x + w] = o, m
    return out, mm


def main():
    os.makedirs(SALE, exist_ok=True)
    carros = elementos(leer('carro'))
    sueltos = elementos(leer('barril'))
    assert len(carros) == 6, f'salieron {len(carros)} carros'
    # una escala para los seis carros: el nuevo llena el ancho del lienzo (con 2 px de aire)
    k = 126 / carros[0][0].shape[1]
    piezas = [(f'carro_{i}', *en_lienzo(*achicar(a, m, k), 130, 70)) for i, (a, m) in enumerate(carros)]
    a, m = sueltos[0]
    piezas.append(('barril', *en_lienzo(*achicar(a, m, 31 / a.shape[0]), 26, 32)))
    for n, (a, m) in zip(['pedazo_lata', 'pedazo_vidrio', 'pedazo_rueda', 'pedazo_madera', 'pedazo_aro'], sueltos[1:6]):
        piezas.append((n, *en_lienzo(*achicar(a, m, 8 / max(a.shape[:2])), 8, 8)))
    X = np.concatenate([srgb2lab(o[m]) for _, o, m in piezas])
    C, _ = kmeans(X, 48, it=25)
    suma, cuenta = np.zeros((48, 3)), np.zeros(48)
    idx = {}
    for n, o, m in piezas:
        L = srgb2lab(o.reshape(-1, 3)).reshape(o.shape)
        idx[n] = ((L[:, :, None, :] - C[None, None]) ** 2).sum(3).argmin(2)
        for j in range(48):
            sel = (idx[n] == j) & m
            suma[j] += o[sel].sum(0)
            cuenta[j] += sel.sum()
    pal = (suma / np.maximum(cuenta, 1)[:, None]).clip(0, 255).astype('uint8')
    for n, o, m in piezas:
        rgba = np.zeros(o.shape[:2] + (4,), 'uint8')
        rgba[..., :3] = pal[idx[n]]
        rgba[..., 3] = np.where(m, 255, 0)
        Image.fromarray(rgba).save(os.path.join(SALE, n + '.png'))
        print(n, rgba.shape[1], 'x', rgba.shape[0])


PIEZAS = [('retrovisor', 14), ('capo', 100), ('puerta', 74), ('caucho', 30), ('parachoques', 104), ('vidrio', 12)]


def magenta(a):
    return (a[..., 0] > 200) & (a[..., 2] > 200) & (a[..., 1] < 90)


def por_celdas(a, cols, filas):
    """Las manchas de la hoja repartidas por la celda donde cae su centro (el humo va con su carro)."""
    m = ~magenta(a)
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    k, lab, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    H, W = m.shape
    celdas = [np.zeros(m.shape, bool) for _ in range(cols * filas)]
    for i in range(1, k):
        if st[i, cv2.CC_STAT_AREA] < 60:
            continue
        c = min(int(cen[i][0] / W * cols), cols - 1) + cols * min(int(cen[i][1] / H * filas), filas - 1)
        celdas[c] |= lab == i
    out = []
    for mk in celdas:
        ys, xs = np.where(mk)
        out.append((a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], mk[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
    return out


def vidrios(o, m):
    """El vidrio salió morado (refleja el fondo magenta): pasa a azul oscuro de parabrisas."""
    r, g, b = o[..., 0], o[..., 1], o[..., 2]
    mor = m & (b > g + 30) & (b >= r - 8)
    o = o.copy()
    lum = (r + g + b)[mor] / 3
    o[mor] = np.stack([lum * 0.45, lum * 0.6, lum * 0.95], 1)
    return o


def carro():
    os.makedirs(SALE, exist_ok=True)
    carros = por_celdas(leer('carro_nuevo'), 3, 2)
    # la escala la pone el carro entero: 336 de largo en el lienzo de 340
    k = 336 / carros[0][0].shape[1]
    piezas = [(f'carro_{i}', *en_lienzo(*achicar(vidrios(a, m), m, k), 340, 150)) for i, (a, m) in enumerate(carros)]
    sueltas = elementos(leer('piezas'))
    assert len(sueltas) == 6, f'salieron {len(sueltas)} piezas'
    for (n, ancho), (a, m) in zip(PIEZAS, sueltas):
        a = a.copy()
        ros = m & (a[..., 0] > a[..., 1] + 40) & (a[..., 2] > a[..., 1] + 20) & (a[..., 0] > a[..., 2])
        a[ros, 2] *= 0.55
        a[ros, 1] *= 0.8
        a[ros, 0] *= 0.82
        o, mm = achicar(vidrios(a, m), m, ancho / a.shape[1])
        ys, xs = np.where(mm)
        piezas.append((f'pieza_{n}', o[ys.min():ys.max() + 1, xs.min():xs.max() + 1], mm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
    X = np.concatenate([srgb2lab(o[m]) for _, o, m in piezas])
    C, _ = kmeans(X[np.random.default_rng(0).choice(len(X), min(len(X), 40000), replace=False)], 64, it=25)
    suma, cuenta, idx = np.zeros((64, 3)), np.zeros(64), {}
    for n, o, m in piezas:
        L = srgb2lab(o.reshape(-1, 3)).reshape(o.shape)
        idx[n] = ((L[:, :, None, :] - C[None, None]) ** 2).sum(3).argmin(2)
        for j in range(64):
            sel = (idx[n] == j) & m
            suma[j] += o[sel].sum(0)
            cuenta[j] += sel.sum()
    pal = (suma / np.maximum(cuenta, 1)[:, None]).clip(0, 255).astype('uint8')
    for n, o, m in piezas:
        rgba = np.zeros(o.shape[:2] + (4,), 'uint8')
        rgba[..., :3] = pal[idx[n]]
        rgba[..., 3] = np.where(m, 255, 0)
        Image.fromarray(rgba).save(os.path.join(SALE, n + '.png'))
        print(n, rgba.shape[1], 'x', rgba.shape[0])


if __name__ == '__main__':
    carro() if sys.argv[1:] == ['carro'] else main()
