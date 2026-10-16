"""La cabeza de la guardia en las poses clave.

Las poses pedidas a Higgsfield traen la cara entre un 15 y un 20 % más chica que la guardia. Al animar, la cabeza
se achica y vuelve a crecer en cada golpe, y se ve deformada. Aquí se busca la cara de la guardia dentro de cada
pose (a varias escalas), se borra la cabeza de la pose y se pega la de la guardia a su tamaño, asentada en el mismo
mentón. Las poses que gritan llevan la cara de grito.

La búsqueda es lenta, así que el resultado queda en datos/poses/cabezas.json y solo se repite con --medir.
"""
import numpy as np, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import lib
from paleta import srgb2lab
S = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'datos')
JSON = f'{S}/poses/cabezas.json'
# qué cara lleva cada pose (las que no están conservan su cabeza: giradas, de cabeza o con los brazos delante)
PLAN = {
    'r_paso': 'normal', 'r_paso_largo': 'normal', 'r_puno_carga': 'grito', 'r_puno': 'grito',
    'r_onda_carga': 'grito', 'r_onda': 'grito', 'r_victoria': 'normal',
    's_agacha': 'normal', 's_sube': 'normal', 's_patada': 'normal', 's_patada_alta': 'normal',
    's_patada_media': 'normal', 's_patada_baja': 'normal',
    'r_patada': 'normal', 's_puno': 'normal',
}
CARAS = {'rick': {'grito': [(69, 14, ["EE", " EE"]), (70, 26, [" AA ", "AAAA", "AKKA", "AHHA", " AA "])]}}
CARA = 0.45  # la cara es la parte de adelante de la cabeza, desde este ancho


def paleta_lab(n):
    pal = json.load(open(f'{S}/fiel/{n}_pal.json'))
    P = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in pal], float)
    return srgb2lab(P)


def cabeza(n, cara='normal'):
    """La cabeza de la guardia recortada a su caja, con la cara pedida."""
    partes, _ = np.load(f'{S}/fiel/{n}_partes.npy', allow_pickle=True)
    c = partes['cabeza'].copy()
    m = c >= 0
    for (x, y, filas) in CARAS.get(n, {}).get(cara, []):
        lib.parche(c, x, y, filas)
    c = np.where(m, c, -1)
    ys, xs = np.where(c >= 0)
    return c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def escalar(idx, s):
    H, W = idx.shape
    h, w = max(1, int(round(H * s))), max(1, int(round(W * s)))
    ys = np.minimum((np.arange(h) / s).astype(int), H - 1)
    xs = np.minimum((np.arange(w) / s).astype(int), W - 1)
    return idx[ys][:, xs]


def lab_de(idx, LP):
    L = np.full(idx.shape + (3,), np.nan)
    m = idx >= 0
    L[m] = LP[idx[m]]
    return L


def buscar(T, P, LP):
    """La posición de la plantilla T en P con menor distancia Lab media (lo transparente cuenta 0.6)."""
    h, w = T.shape
    Pp = np.full((P.shape[0] + 2 * h, P.shape[1] + 2 * w), -1)
    Pp[h:h + P.shape[0], w:w + P.shape[1]] = P
    LT, LPp, mt = lab_de(T, LP), lab_de(Pp, LP), T >= 0
    best = (9, 0, 0)
    for y in range(Pp.shape[0] - h + 1):
        for x in range(Pp.shape[1] - w + 1):
            d = np.linalg.norm(LT[mt] - LPp[y:y + h, x:x + w][mt], axis=1)
            d = np.where(np.isnan(d), 0.6, d).mean()
            if d < best[0]:
                best = (d, y - h, x - w)
    return best


def medir(todo=False):
    out = {} if todo or not os.path.exists(JSON) else json.load(open(JSON))
    for nom in PLAN:
        if nom in out:
            continue
        n = 'rick' if nom[0] == 'r' else 'sophie'
        LP = paleta_lab(n)
        H0 = cabeza(n)
        F = H0[:, int(H0.shape[1] * CARA):]
        Q = np.load(f'{S}/poses/{nom}.npy')
        ys, _ = np.where(Q >= 0)
        top = Q[:ys.min() + int((ys.max() - ys.min()) * 0.45)]
        res = []
        for s in np.arange(0.76, 1.05, 0.02):
            res.append((buscar(escalar(F, s), top, LP), round(float(s), 2)))
        (d, y, x), s = min(res)
        out[nom] = {'escala': s, 'y': int(y), 'x': int(x), 'dist': round(float(d), 3)}
        print(nom, out[nom], flush=True)
    json.dump(out, open(JSON, 'w'), indent=1)


def trasplantar(nom, a):
    """La pose con la cabeza de la guardia. Si la pose no está en el plan, vuelve igual."""
    if nom not in PLAN or not os.path.exists(JSON):
        return a
    n = 'rick' if nom[0] == 'r' else 'sophie'
    m = json.load(open(JSON))[nom]
    H0 = cabeza(n)
    H1 = cabeza(n, PLAN[nom])
    fx = int(H0.shape[1] * CARA)
    Fh, Fw = H0.shape[0], H0.shape[1] - fx
    s = m['escala']
    # el mentón de la pose: abajo al centro de la cara encontrada
    menton = (m['y'] + Fh * s, m['x'] + Fw * s / 2)
    # la cabeza vieja: la de la guardia a la escala de la pose, en su lugar, un poco agrandada
    vieja = escalar(H0, s) >= 0
    oy, ox = int(round(m['y'])), int(round(m['x'] - fx * s))
    b = a.copy()
    borrar = np.zeros(a.shape, bool)
    for yy, xx in zip(*np.where(vieja)):
        Y, X = yy + oy, xx + ox
        if 0 <= Y < a.shape[0] and 0 <= X < a.shape[1]:
            borrar[Y, X] = True
    for _ in range(2):
        g = borrar.copy()
        g[1:] |= borrar[:-1]; g[:-1] |= borrar[1:]; g[:, 1:] |= borrar[:, :-1]; g[:, :-1] |= borrar[:, 1:]
        borrar = g
    # solo se borra arriba del mentón, con margen: el cuello y los hombros de la pose quedan
    borrar[int(menton[0]) - 3:] = False
    b[borrar] = -1
    # la cabeza nueva, con el mentón en el mismo lugar
    ny, nx = int(round(menton[0] - Fh)), int(round(menton[1] - fx - Fw / 2))
    # si la cabeza se sale por arriba o por los lados, la pose crece con borde transparente
    pt, pl = max(0, -ny), max(0, -nx)
    pr = max(0, nx + H1.shape[1] - b.shape[1])
    if pt or pl or pr:
        b = np.pad(b, ((pt, 0), (pl, pr)), constant_values=-1)
        ny += pt; nx += pl
    # el borde de abajo de la cabeza de la guardia es un corte contra su torso: donde cae sobre el cuello de la pose
    # no se pinta, así no queda una raya oscura cruzando el cuello
    op = H1 >= 0
    borde = op & ~(np.pad(op, 1)[:-2, 1:-1] & np.pad(op, 1)[2:, 1:-1] & np.pad(op, 1)[1:-1, :-2] & np.pad(op, 1)[1:-1, 2:])
    for yy, xx in zip(*np.where(op)):
        if borde[yy, xx] and yy >= 0.55 * H1.shape[0] and b[yy + ny, xx + nx] >= 0:
            continue
        b[yy + ny, xx + nx] = H1[yy, xx]
    # tapa las rendijas que quedan entre la cabeza nueva y el cuello: un hueco con pixeles a los dos lados
    # (en la fila o en la columna) toma el color del vecino de abajo, o el de arriba
    y0, y1 = max(1, ny), min(b.shape[0] - 1, ny + H1.shape[0] + 4)
    for _ in range(2):
        c = b.copy()
        for y in range(y0, y1):
            for x in range(max(1, nx - 2), min(b.shape[1] - 1, nx + H1.shape[1] + 2)):
                if b[y, x] >= 0:
                    continue
                fila = (b[y, max(0, x - 3):x] >= 0).any() and (b[y, x + 1:x + 4] >= 0).any()
                col = y + 1 < b.shape[0] and b[y - 1, x] >= 0 and b[y + 1, x] >= 0
                if fila and col:
                    c[y, x] = b[y + 1, x] if b[y + 1, x] >= 0 else b[y - 1, x]
        b = c
    return b


if __name__ == '__main__':
    if '--medir' in sys.argv or not os.path.exists(JSON):
        medir(todo=True)
    elif '--nuevas' in sys.argv:
        medir()
