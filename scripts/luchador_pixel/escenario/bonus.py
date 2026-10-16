"""Los minijuegos del juego (lote E): el carro que se destruye en 6 etapas, el barril y los pedazos que vuelan.

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


if __name__ == '__main__':
    main()
