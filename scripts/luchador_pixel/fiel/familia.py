"""Alana, Steph y Thor: de las imágenes de Higgsfield a sus hojas de pixel, igual que Rick y Sophie.

1. La guardia: se encuentra la grilla de pixeles de la imagen, se baja a la altura que le toca al personaje y se saca
   su paleta de 48 tonos.
2. Cada pose: se baja a su grilla, se pasa a la paleta de la guardia y se iguala la escala midiendo la cara contra la
   de la guardia. Las poses de pie llevan además la cabeza exacta de la guardia (como en cabezas.py).
3. Se escriben `<id>.ts` (la hoja, una sola pieza) y `<id>Dibujos.ts` (las poses enteras).

Las imágenes grandes van en datos/familia/crudo/ y no se suben; lo que se guarda es el resultado en
datos/familia/<id>/ (una matriz por pose y la paleta), y con eso se regeneran los .ts sin bajar nada:
    python3 familia.py          # escribe los .ts desde datos/familia
    python3 familia.py --crudo  # rehace datos/familia desde las imágenes
"""
import numpy as np, json, os, sys, cv2
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
import lib
from grilla import cortes
from limpiar import regiones_fondo
from paleta import srgb2lab, kmeans
D = os.path.join(AQUI, 'datos', 'familia')
CRUDO = os.path.join(D, 'crudo')
SRC = os.path.join(AQUI, '..', '..', '..', 'src', 'engine', 'luchador', 'pixel')

# alto: la altura de la guardia en pixeles. cara: la caja de la cara en la guardia (fracciones de su caja: y0, y1, x0, x1).
# erguidas: las poses que llevan la cabeza de la guardia. aire: las poses que no pisan (el ancla va al centro de abajo).
PERSONAJES = {
    'alana': {
        'nombre': 'Alana', 'pref': 'a', 'alto': 128, 'cara': (0.12, 0.42, 0.25, 0.75),
        'poses': ['paso', 'agacha', 'salto', 'golpe', 'patada', 'hechizo_carga', 'hechizo', 'giro', 'super', 'recibe', 'tendida', 'victoria', 'bloqueo'],
        'erguidas': ['paso', 'golpe', 'patada', 'hechizo', 'giro', 'victoria'],
        'aire': ['salto', 'super', 'tendida'],
    },
    'steph': {
        'nombre': 'Steph', 'pref': 's', 'alto': 182, 'cara': (0.04, 0.15, 0.40, 0.63),
        'poses': ['paso', 'agacha', 'salto', 'batazo_carga', 'batazo', 'patada', 'voltereta', 'barrida', 'super', 'recibe', 'tendida', 'victoria', 'bloqueo'],
        'erguidas': ['paso', 'batazo', 'patada', 'victoria'],
        'aire': ['salto', 'tendida', 'voltereta'],
    },
    'thor': {
        'nombre': 'Thor', 'pref': 't', 'alto': 118, 'cara': (0.0, 0.42, 0.66, 1.0),
        'poses': ['corre', 'agacha', 'salto', 'mordida', 'zarpazo', 'ladrido', 'embestida', 'aullido', 'recibe', 'tendido', 'victoria', 'bloqueo'],
        'erguidas': [],
        'aire': ['salto', 'embestida', 'tendido'],
    },
}


def periodo(d, lo=3.5, hi=9.0):
    d = d - d.mean()
    best = (0, 0)
    for p in np.arange(lo, hi, 0.02):
        v = abs((d * np.exp(2j * np.pi * np.arange(len(d)) / p)).sum())
        if v > best[0]:
            best = (v, p)
    return best[1]


def leer(nombre):
    return np.asarray(Image.open(os.path.join(CRUDO, nombre + '.png')).convert('RGB')).astype(float)


def periodo_de(a, ref=None):
    """El tamaño del pixel de la imagen. Si los dos ejes no coinciden, el más cercano al de referencia."""
    dx = np.abs(np.diff(a, axis=1)).sum(2).sum(0)
    dy = np.abs(np.diff(a, axis=0)).sum(2).sum(1)
    px, py = periodo(dx), periodo(dy)
    if abs(px - py) / min(px, py) < 0.12:
        return (px + py) / 2
    if ref is None:
        return min(px, py)
    return px if abs(px - ref) < abs(py - ref) else py


def celdas(a, P):
    """La mediana del centro de cada celda de la grilla de tamaño P."""
    dx = np.abs(np.diff(a, axis=1)).sum(2).sum(0)
    dy = np.abs(np.diff(a, axis=0)).sum(2).sum(1)
    cx = sorted(set([0] + [c + 1 for c in cortes(dx, P)] + [a.shape[1]]))
    cy = sorted(set([0] + [c + 1 for c in cortes(dy, P)] + [a.shape[0]]))
    cx = [c for i, c in enumerate(cx) if i == 0 or c - cx[i - 1] >= 2]
    cy = [c for i, c in enumerate(cy) if i == 0 or c - cy[i - 1] >= 2]
    out = np.zeros((len(cy) - 1, len(cx) - 1, 3))
    for j in range(len(cy) - 1):
        for i in range(len(cx) - 1):
            y0, y1, x0, x1 = cy[j], cy[j + 1], cx[i], cx[i + 1]
            m0, m1 = max(1, (y1 - y0) // 4), max(1, (x1 - x0) // 4)
            blk = a[y0 + m0:max(y0 + m0 + 1, y1 - m0), x0 + m1:max(x0 + m1 + 1, x1 - m1)].reshape(-1, 3)
            out[j, i] = np.median(blk, axis=0)
    return out


def fondo_de(a):
    return np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]), axis=0)


def recortar(o, bg):
    m = regiones_fondo(o, bg)
    # fuera los pedacitos sueltos (destellos, estrellitas de mareo): solo quedan las partes grandes del cuerpo
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    if n > 2:
        grande = st[1:, cv2.CC_STAT_AREA].max()
        for i in range(1, n):
            if st[i, cv2.CC_STAT_AREA] < max(12, 0.03 * grande):
                m[lab == i] = False
    ys, xs = np.where(m)
    return o[ys.min():ys.max() + 1, xs.min():xs.max() + 1], m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def bajar(o, m, k):
    """Achica las celdas por k promediando por área (con el fondo fuera) y deja opaco lo que queda cubierto a medias."""
    if abs(k - 1) < 0.01:
        return o, m
    H, W = m.shape
    h, w = max(1, int(round(H * k))), max(1, int(round(W * k)))
    pm = (o * m[..., None]).astype(np.float32)
    rgb = cv2.resize(pm, (w, h), interpolation=cv2.INTER_AREA)
    al = cv2.resize(m.astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    m2 = al >= 0.5
    o2 = rgb / np.maximum(al[..., None], 1e-3)
    return o2.astype(float), m2


def a_paleta(o, m, pal):
    P = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in pal], float)
    LP = srgb2lab(P)
    L = srgb2lab(o.reshape(-1, 3)).reshape(o.shape)
    d = np.linalg.norm(L[:, :, None, :] - LP[None, None], axis=3)
    return np.where(m, d.argmin(2), -1)


def motas(idx, pal, bg):
    """Los pixeles sueltos del color del fondo toman el de sus vecinos."""
    P = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in pal], float)
    L = srgb2lab(P)
    Lb = srgb2lab(np.array([bg], float))[0]
    azul = {i for i in range(len(pal)) if np.linalg.norm(L[i] - Lb) < 0.08}
    H, W = idx.shape
    b = idx.copy()
    for y in range(H):
        for x in range(W):
            if idx[y, x] not in azul:
                continue
            v = [idx[yy, xx] for yy in (y - 1, y, y + 1) for xx in (x - 1, x, x + 1)
                 if (yy, xx) != (y, x) and 0 <= yy < H and 0 <= xx < W and idx[yy, xx] >= 0 and idx[yy, xx] not in azul]
            if len(v) >= 5:
                vals, c = np.unique(v, return_counts=True)
                b[y, x] = vals[c.argmax()]
    return b


def lab_img(idx, pal):
    """La imagen en Lab (float32) con lo transparente lejos de todo color."""
    P = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in pal], float)
    LP = srgb2lab(P).astype(np.float32)
    L = np.full(idx.shape + (3,), 3.0, np.float32)
    L[idx >= 0] = LP[idx[idx >= 0]]
    return L


def escalar(idx, s):
    H, W = idx.shape
    h, w = max(1, int(round(H * s))), max(1, int(round(W * s)))
    ys = np.minimum((np.arange(h) / s).astype(int), H - 1)
    xs = np.minimum((np.arange(w) / s).astype(int), W - 1)
    return idx[ys][:, xs]


def cara_de(g, caja):
    H, W = g.shape
    y0, y1, x0, x1 = int(H * caja[0]), int(H * caja[1]), int(W * caja[2]), int(W * caja[3])
    return g[y0:y1, x0:x1], (y0, x0)


def buscar(T, Q, pal, escalas):
    """La escala y el lugar donde la cara T mejor calza en Q. Devuelve (distancia, escala, y, x)."""
    LQ = lab_img(Q, pal)
    pad = max(T.shape) * 2
    LQ = cv2.copyMakeBorder(LQ, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(3.0, 3.0, 3.0))
    best = (9.0, 1.0, 0, 0)
    for s in escalas:
        Ts = escalar(T, s)
        if Ts.shape[0] >= LQ.shape[0] or Ts.shape[1] >= LQ.shape[1]:
            continue
        LT = lab_img(Ts, pal)
        mask = np.repeat((Ts >= 0)[:, :, None], 3, axis=2).astype(np.float32)
        r = cv2.matchTemplate(LQ, LT, cv2.TM_SQDIFF, mask=mask)
        n = max(1, (Ts >= 0).sum())
        _, _, mn, _ = cv2.minMaxLoc(r)
        v = r[mn[1], mn[0]] / n
        if v < best[0]:
            best = (float(v), float(s), mn[1] - pad, mn[0] - pad)
    return best


def trasplante(b, g, caja, m):
    """Pega la cabeza de la guardia (todo lo que está por encima del mentón de su cara) sobre la pose."""
    T, (ty, tx) = cara_de(g, caja)
    H0 = g[:ty + T.shape[0]].copy()   # de la coronilla al mentón, en todo el ancho de la cara
    H0[:, :tx] = -1
    H0[:, tx + T.shape[1]:] = -1
    # sin lo que no es cabeza: se queda el componente conectado que toca la cara
    s = m['escala']
    oy, ox = int(round(m['y'] - ty * s)), int(round(m['x'] - tx * s))
    vieja = escalar(H0, s) >= 0
    borrar = np.zeros(b.shape, bool)
    for yy, xx in zip(*np.where(vieja)):
        Y, X = yy + oy, xx + ox
        if 0 <= Y < b.shape[0] and 0 <= X < b.shape[1]:
            borrar[Y, X] = True
    menton = m['y'] + T.shape[0] * s
    borrar[max(0, int(menton) - 2):] = False
    out = b.copy()
    out[borrar] = -1
    ny = int(round(menton - H0.shape[0]))
    nx = int(round(m['x'] + T.shape[1] * s / 2 - (tx + T.shape[1] / 2)))
    pt, pl = max(0, -ny), max(0, -nx)
    pr = max(0, nx + H0.shape[1] - out.shape[1])
    if pt or pl or pr:
        out = np.pad(out, ((pt, 0), (pl, pr)), constant_values=-1)
        ny += pt
        nx += pl
    op = H0 >= 0
    for yy, xx in zip(*np.where(op)):
        # el borde de abajo del corte no se pinta sobre el cuello de la pose
        if yy >= H0.shape[0] - 3 and out[yy + ny, xx + nx] >= 0:
            continue
        out[yy + ny, xx + nx] = H0[yy, xx]
    return out


def caja_cruda(a):
    """La caja del personaje en la imagen grande, sin destellos sueltos."""
    m = np.abs(a - fondo_de(a)).sum(2) > 45
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    g = st[1:, cv2.CC_STAT_AREA].max()
    keep = np.zeros_like(m)
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] >= 0.03 * g:
            keep |= lab == k
    ys, xs = np.where(keep)
    return ys.min(), ys.max() + 1, xs.min(), xs.max() + 1


def cara_cruda(a, caja):
    y0, y1, x0, x1 = caja_cruda(a)
    H, W = y1 - y0, x1 - x0
    return a[y0 + int(H * caja[0]):y0 + int(H * caja[1]), x0 + int(W * caja[2]):x0 + int(W * caja[3])], (int(H * caja[0]), int(W * caja[2]))


def buscar_cara(T, b):
    """La escala y el lugar (en la imagen grande) donde la cara T de la guardia mejor correlaciona en la pose b."""
    t0 = cv2.cvtColor(T.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    g = cv2.cvtColor(b.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    best = (-1.0, 1.0, (0, 0))
    for s in np.arange(0.55, 1.6, 0.025):
        t = cv2.resize(t0, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        if t.shape[0] >= g.shape[0] or t.shape[1] >= g.shape[1]:
            continue
        r = cv2.matchTemplate(g, t, cv2.TM_CCOEFF_NORMED)
        _, v, _, loc = cv2.minMaxLoc(r)
        if v > best[0]:
            best = (float(v), float(s), (loc[1], loc[0]))
    return best


def crudo(pid):
    c = PERSONAJES[pid]
    pref = c['pref']
    os.makedirs(os.path.join(D, pid), exist_ok=True)
    a = leer(f'{pref}_guardia')
    bg = fondo_de(a)
    P = periodo_de(a)
    o, m = recortar(celdas(a, P), bg)
    gy0, gy1, _, _ = caja_cruda(a)
    f = c['alto'] / (gy1 - gy0)          # de pixeles de la imagen a pixeles del arte
    o, m = bajar(o, m, c['alto'] / o.shape[0])
    X = srgb2lab(o[m])
    C, lab = kmeans(X, 48)
    rgb = np.array([np.median(o[m][lab == j], axis=0) for j in range(48)])
    orden = np.argsort(C[:, 0])
    inv = np.argsort(orden)
    g = np.full(m.shape, -1, int)
    g[m] = inv[lab]
    pal = ['#%02x%02x%02x' % tuple(int(v) for v in rgb[j]) for j in orden]
    g = motas(g, pal, bg)
    np.save(os.path.join(D, pid, 'guardia.npy'), g.astype(np.int8))
    json.dump(pal, open(os.path.join(D, pid, 'pal.json'), 'w'))
    print(pid, 'guardia', g.shape, 'periodo', round(P, 2))
    T, (fy, fx) = cara_cruda(a, c['cara'])
    Tc, (ty, tx) = cara_de(g, c['cara'])
    medidas = {}
    for n in c['poses']:
        b = leer(f'{pref}_{n}')
        bgp = fondo_de(b)
        Pp = periodo_de(b, P)
        corr, s, (cy, cx) = buscar_cara(T, b)
        # la escala: la de la cara si se encontró bien; si no, la del tamaño del pixel; si tampoco, la misma
        if corr >= 0.6 and 0.75 <= s <= 1.3:
            esc, como = s, 'cara'
        elif 0.85 <= Pp / P <= 1.2:
            esc, como = Pp / P, 'pixel'
        else:
            esc, como = 1.0, 'igual'
        o, mm = recortar(celdas(b, Pp), bgp)
        by0, by1, bx0, _ = caja_cruda(b)
        ff = f / esc                      # de pixeles de esta imagen a pixeles del arte
        # la grilla puede salir más fina que el pixel real (las medias de malla engañan al detector): se usa el alto
        # real de la figura en la imagen para saber cuánto achicar
        o, mm = bajar(o, mm, (by1 - by0) * ff / o.shape[0])
        q = motas(a_paleta(o, mm, pal), pal, bgp)
        if n in c['erguidas'] and como == 'cara':
            # la pose ya está a la escala de la guardia: se busca dónde está la cara, en la mitad de arriba
            alto = int(q.shape[0] * 0.6)
            d, s2, yy, xx = buscar(Tc, q[:alto], pal, [0.96, 1.0, 1.04])
            # solo si la cara calza de verdad; si no, la pose queda con su cabeza
            if d < 0.12:
                q = trasplante(q, g, c['cara'], {'escala': s2, 'y': yy, 'x': xx})
                como += f' cabeza {d:.3f}' 
        np.save(os.path.join(D, pid, f'{n}.npy'), q.astype(np.int8))
        print(f'  {n:14s} corr {corr:.2f} escala {esc:.2f} ({como})  {q.shape}', flush=True)


def medir(a, en_aire, de_cabeza=False):
    """El ancla en el piso, los puntos (cabeza, puños, pies) y las franjas de la cabeza y el cuerpo."""
    H, W = a.shape
    op = a >= 0
    ys, xs = np.where(op)
    y1 = ys.max()
    if en_aire:
        ancla = (float(xs.mean()), float(y1 + 1))
    else:
        py, px = np.where(op[y1 - 8:y1 + 1])
        ancla = (float(px.mean()), float(y1 + 1))
    filas = np.arange(H)[:, None] * np.ones((1, W))
    def centro(mask):
        yy, xx = np.where(mask & op)
        return (float(xx.mean()), float(yy.mean()))
    pts = {'cabeza': centro(filas < ys.min() + 0.14 * H)}
    sup = op & (filas < ys.min() + 0.6 * (y1 - ys.min()))
    yy, xx = np.where(sup)
    mx = xx.max()
    pts['puñoL'] = (float(mx - 3), float(yy[xx >= mx - 4].mean()))
    pts['puñoC'] = pts['puñoL']
    inf = op & (filas >= ys.min() + 0.35 * (y1 - ys.min()))
    yy, xx = np.where(inf)
    mx = xx.max()
    pts['pieL'] = (float(mx - 4), float(yy[xx >= mx - 5].mean()))
    mn = xx.min()
    pts['pieC'] = (float(mn + 4), float(yy[xx <= mn + 5].mean()))
    h = y1 - ys.min()
    zonas = (int(ys.min() + 0.24 * h), int(ys.min() + 0.58 * h))
    return ancla, pts, zonas


def escribir(pid):
    c = PERSONAJES[pid]
    pal = json.load(open(os.path.join(D, pid, 'pal.json')))
    g = np.load(os.path.join(D, pid, 'guardia.npy')).astype(int)
    H, W = g.shape
    const = pid.upper()
    ancla, pts, zonas = medir(g, False)
    cx = int(round(ancla[0]))
    q = lambda s: "'" + s + "'"
    # la hoja: una sola pieza con la guardia entera (respira con `respira`, sin costuras)
    L = [f"import {{ {const}_DIBUJOS }} from './{pid}Dibujos';", "import type { MunecoPixel } from './muneco';", "",
         "/**", f" * {c['nombre']} en pixel, fiel a su referencia de Higgsfield: la guardia a su grilla original ({W} x {H})",
         f" * con su paleta de {len(pal)} tonos. Es una sola pieza: respira recogiendo filas y los golpes son poses dibujadas enteras.",
         " */", f"export const {const}_PIXEL: MunecoPixel = {{", f"  nombre: '{c['nombre']}',", f"  dibujos: {const}_DIBUJOS,",
         "  paleta: [" + ", ".join(q(p) for p in pal) + "],", f"  w: {W}, h: {H}, piso: {H}, centro: {cx},", "  orden: ['torso'],",
         "  puntos: { " + ", ".join(f"{k}: {{ pieza: 'torso', en: [{v[0]:.0f}, {v[1]:.0f}] }}" for k, v in pts.items()) + " },",
         "  zonas: { torso: 'cuerpo' },", "  piezas: {", "    torso: {", f"      x: 0, y: 0, pivote: [{cx}, {int(H * 0.5)}], padre: null,", "      filas: ["]
    L += [f"        {q(f)}," for f in lib.a_filas(g)]
    L += ["      ],", "    },", "  },", "};", ""]
    open(os.path.join(SRC, f'{pid}.ts'), 'w').write('\n'.join(L))
    # las poses, con la guardia también como dibujo (sus cajas salen por franjas)
    M = ["import type { DibujoPixel } from './muneco';", "",
         f"/** Las poses clave de {c['nombre']} dibujadas enteras, fieles a su referencia y con la paleta de su hoja. */",
         f"export const {const}_DIBUJOS: Record<string, DibujoPixel> = {{"]
    for n in ['guardia'] + c['poses']:
        a = g if n == 'guardia' else np.load(os.path.join(D, pid, f'{n}.npy')).astype(int)
        ys, xs = np.where(a >= 0)
        a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        an, pt, zo = medir(a, n in c['aire'])
        M.append(f"  {n}: {{")
        M.append(f"    ancla: [{an[0]:.1f}, {an[1]:.0f}], zonas: [{zo[0]}, {zo[1]}],")
        M.append("    puntos: { " + ", ".join(f"{k}: [{v[0]:.0f}, {v[1]:.0f}]" for k, v in pt.items()) + " },")
        M.append("    filas: [")
        M += [f"      {q(f)}," for f in lib.a_filas(a)]
        M.append("    ],")
        M.append("  },")
    M.append("};")
    open(os.path.join(SRC, f'{pid}Dibujos.ts'), 'w').write('\n'.join(M) + '\n')
    print(pid, 'ts', W, H)


if __name__ == '__main__' and '--extras' not in sys.argv:
    quien = [a for a in sys.argv[1:] if not a.startswith('--')] or list(PERSONAJES)
    for pid in quien:
        if '--crudo' in sys.argv:
            crudo(pid)
        escribir(pid)


# poses nuevas para Rick y Sophie (la patada y el puño que faltaban): a la escala y la paleta de su hoja de siempre
EXTRAS = {
    'r_patada': ('rick', 'r_patada', (0.0, 0.2, 0.38, 0.72)),
    's_puno': ('sophie', 's_puno_sophie', (0.04, 0.34, 0.37, 1.0)),
}


def extras():
    F0 = os.path.join(AQUI, 'datos')
    for nom, (n, archivo, caja) in EXTRAS.items():
        pal = json.load(open(f'{F0}/fiel/{n}_pal.json'))
        g = np.load(f'{F0}/fiel/{n}_idx.npy').astype(int)
        ref = np.asarray(Image.open(f'{F0}/ref/{n}_ref.png').convert('RGB')).astype(float)
        ry0, ry1, _, _ = caja_cruda(ref)
        f = g.shape[0] / (ry1 - ry0)
        T, _ = cara_cruda(ref, caja)
        b = leer(archivo)
        corr, s, _ = buscar_cara(T, b)
        esc = s if corr >= 0.6 and 0.75 <= s <= 1.3 else 1.0
        o, mm = recortar(celdas(b, periodo_de(b)), fondo_de(b))
        by0, by1, _, _ = caja_cruda(b)
        o, mm = bajar(o, mm, (by1 - by0) * f / esc / o.shape[0])
        q = motas(a_paleta(o, mm, pal), pal, fondo_de(b))
        np.save(f'{F0}/poses/{nom}.npy', q.astype(np.int8))
        print(nom, 'corr', round(corr, 2), 'escala', round(esc, 2), q.shape)


if __name__ == '__main__' and '--extras' in sys.argv:
    extras()
