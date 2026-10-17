"""Las hojas SF2 (ver sf2_plan.py) a cuadros de pixel, a la escala y con la paleta de la guardia de cada luchador.

Por hoja:
1. Se separan los cuadros: lo que no es fondo, en grupos por columnas (cada cuadro es un grupo de manchas que se tocan
   en x). Tiene que salir el número de cuadros que se pidió.
2. Una sola escala para toda la hoja: la cara de la guardia se busca en cada cuadro y se toma la mediana de las escalas
   que calzan bien. Si no calza ninguna (Thor, poses de espalda), sale del tamaño del pixel de la imagen.
3. Cada cuadro se baja a su grilla, a la escala del arte, a la paleta de la guardia, y las poses de pie llevan la cabeza
   exacta de la guardia (solo si la cara calza de verdad, como en familia.py).
4. Se guarda la tira en datos/sf2/<id>/<hoja>.png (RGBA, colores de la paleta) con <hoja>.json: por cuadro su caja en
   la tira, su ancla (el pivote: la cadera sobre el piso) y cuánto queda sobre el piso en la hoja.

    python3 sf2.py                 # todas las hojas que estén bajadas
    python3 sf2.py rick sophie     # solo esos
"""
import numpy as np, json, os, sys, glob, cv2
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from familia import (PERSONAJES, celdas, recortar, bajar, a_paleta, motas, fondo_de, periodo_de, caja_cruda, cara_cruda,
                     buscar_cara, cara_de, buscar, trasplante)
from sf2_plan import hojas as plan_hojas, PREF
from paleta import srgb2lab, kmeans

D = os.path.join(AQUI, 'datos')
HOJAS = os.path.join(D, 'familia', 'crudo', 'hojas')
SALE = os.path.join(D, 'sf2')
# las hojas cuyos cuadros van en el aire: el ancla es el centro de abajo de cada cuadro, sin altura
AIRE = {'salto', 'salto_adelante', 'aire'}
# las hojas donde la altura sobre el piso de la hoja se respeta (la caída vuela en arco)
CON_ALTURA = {'cae'}
# en estas no se pega la cabeza de la guardia (la cabeza va de lado, de espaldas o al revés)
SIN_CABEZA = {'cae', 'levanta', 'salto_adelante', 'mareado', 'recibe'}


def guardia(pid):
    """La paleta, la guardia en pixel, la imagen grande de la guardia y la caja de su cara."""
    if pid in ('rick', 'sophie'):
        pal = json.load(open(f'{D}/fiel/{pid}_pal.json'))
        g = np.load(f'{D}/fiel/{pid}_idx.npy').astype(int)
        ref = np.asarray(Image.open(f'{D}/ref/{pid}_ref.png').convert('RGB')).astype(float)
        caja = {'rick': (0.0, 0.2, 0.38, 0.72), 'sophie': (0.04, 0.34, 0.37, 1.0)}[pid]
        cabeza = False
    else:
        c = PERSONAJES[pid]
        pal = json.load(open(f'{D}/familia/{pid}/pal.json'))
        g = np.load(f'{D}/familia/{pid}/guardia.npy').astype(int)
        ref = np.asarray(Image.open(f'{D}/familia/crudo/{c["pref"]}_guardia.png').convert('RGB')).astype(float)
        caja = c['cara']
        cabeza = False
    return pal, g, ref, caja, cabeza


def _rangos(m, cajas, n):
    """Los rangos en x de cada cuadro: las manchas juntas por x, o el corte por el valle de columnas si no salen n."""
    # se juntan las manchas que se pisan en x
    grupos = []
    for c in cajas:
        if grupos and c[0] <= grupos[-1][2] + 4:
            u = grupos[-1]
            grupos[-1] = [min(u[0], c[0]), min(u[1], c[1]), max(u[2], c[2]), max(u[3], c[3])]
        else:
            grupos.append(list(c))
    # fuera los grupos chiquitos (chispas sueltas)
    area = lambda g: (g[2] - g[0]) * (g[3] - g[1])
    gm = max(area(g) for g in grupos)
    grupos = [g for g in grupos if area(g) >= 0.06 * gm]
    if len(grupos) != n:
        # no salió limpio (un pie o un bate se mete en el cuadro de al lado): se corta por el valle de columnas más
        # cercano a cada borde esperado entre cuadros parejos
        x0, x1 = min(g[0] for g in grupos), max(g[2] for g in grupos)
        col = m[:, x0:x1].sum(0).astype(float)
        col = np.convolve(col, np.ones(9) / 9, mode='same')
        paso = (x1 - x0) / n
        cortes = [x0]
        for k in range(1, n):
            b = int(k * paso)
            v = int(paso * 0.22)
            lo, hi = max(1, b - v), min(len(col) - 1, b + v)
            cortes.append(x0 + lo + int(np.argmin(col[lo:hi])))
        cortes.append(x1)
        return list(zip(cortes[:-1], cortes[1:]))
    while len(grupos) > n:
        h = [grupos[i + 1][0] - grupos[i][2] for i in range(len(grupos) - 1)]
        i = int(np.argmin(h))
        u, v = grupos[i], grupos[i + 1]
        grupos[i:i + 2] = [[min(u[0], v[0]), min(u[1], v[1]), max(u[2], v[2]), max(u[3], v[3])]]
    return [(g[0], g[2]) for g in grupos]


def separar_mascaras(a, n):
    """Los cuadros de la hoja, de izquierda a derecha: su caja (x0, y0, x1, y1) en la imagen grande y su máscara.

    Cada mancha va entera al cuadro donde cae su centro, aunque se salga de su rango en x: así el pie o el bate que
    se mete por encima del cuadro de al lado sigue pegado a su dueño y no aparece cortado ni suelto en el vecino.
    Solo una mancha que de verdad toca al vecino (más ancha que un cuadro) se corta en el borde."""
    bg = fondo_de(a)
    m = np.abs(a - bg).sum(2) > 45
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    k, lab, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    if k < 2:
        return [], []
    grande = st[1:, cv2.CC_STAT_AREA].max()
    fuertes = [i for i in range(1, k) if st[i, cv2.CC_STAT_AREA] >= 0.01 * grande]
    cajas = sorted([[st[i, 0], st[i, 1], st[i, 0] + st[i, 2], st[i, 1] + st[i, 3]] for i in fuertes])
    rangos = _rangos(m, cajas, n)
    paso = np.mean([b - a_ for a_, b in rangos])
    mascaras = [np.zeros(m.shape, bool) for _ in rangos]
    es_fuerte = np.isin(lab, fuertes)
    for i in range(1, k):
        if st[i, cv2.CC_STAT_AREA] < 30:
            continue
        cx = cen[i][0]
        j = min(range(len(rangos)), key=lambda r: 0 if rangos[r][0] <= cx < rangos[r][1] else
                min(abs(cx - rangos[r][0]), abs(cx - rangos[r][1])))
        pieza = lab == i
        if st[i, cv2.CC_STAT_WIDTH] > 0.9 * paso:
            # dos cuadros pegados (la canasta de Bao toca el pie del vecino): cada rango se queda con su pedazo
            x0_, x1_ = st[i, 0], st[i, 0] + st[i, 2]
            for r, (ra, rb) in enumerate(rangos):
                if rb <= x0_ or ra >= x1_:
                    continue
                corte = np.zeros(m.shape, bool)
                corte[:, ra:rb] = True
                mascaras[r] |= pieza & corte
            continue
        mascaras[j] |= pieza
    salen, mas = [], []
    for j, mk in enumerate(mascaras):
        if not mk.any():
            continue
        # la caja la marcan las manchas grandes, las chispas chiquitas solo cuentan si caen dentro
        gr = mk & es_fuerte
        if not gr.any():
            continue
        ys, xs = np.where(gr)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        caja = np.zeros(m.shape, bool)
        caja[y0:y1, x0:x1] = True
        mk = mk & caja
        salen.append([int(x0), int(y0), int(x1), int(y1)])
        mas.append(mk)
    # el borde suave del pixel (lo que no pasó el umbral) se recupera con un poco de margen, sin pisar al vecino
    ker = np.ones((7, 7), np.uint8)
    gordas = [cv2.dilate(mk.astype(np.uint8), ker) > 0 for mk in mas]
    for j in range(len(gordas)):
        for o in range(len(mas)):
            if o != j:
                gordas[j] &= ~mas[o]
    return salen, gordas


def separar(a, n):
    """Los cuadros de la hoja, de izquierda a derecha: cajas (x0, y0, x1, y1) en la imagen grande."""
    return separar_mascaras(a, n)[0]


def cadera(q, aire):
    """El ancla del cuadro: x en la cadera (la franja del medio del cuerpo), y en el piso (abajo del todo)."""
    op = q >= 0
    ys, xs = np.where(op)
    y0, y1 = ys.min(), ys.max()
    if aire:
        return float(xs.mean()), float(y1 + 1)
    h = y1 - y0
    banda = op[int(y0 + 0.45 * h):int(y0 + 0.62 * h) + 1]
    yy, xx = np.where(banda)
    if len(xx) == 0:
        xx = xs
    return float(np.median(xx)), float(y1 + 1)


# la altura de la guardia nueva de cada uno en pixeles del arte (los demás cuadros salen a la misma escala)
ALTO = {'rick': 188, 'sophie': 156, 'alana': 124, 'steph': 180, 'thor': 112,
        # los jefes: la Abuela un poco más baja que Steph y ancha, Tío Bao como Rick
        'abuela': 170, 'bao': 190}
# la caja de la cara dentro de la guardia nueva (fracciones de su caja: y0, y1, x0, x1)
CARA = {'rick': (0.0, 0.17, 0.42, 0.78), 'sophie': (0.03, 0.30, 0.38, 0.95), 'alana': (0.04, 0.36, 0.25, 0.85),
        'steph': (0.0, 0.16, 0.38, 0.72), 'thor': (0.0, 0.42, 0.62, 1.0),
        'abuela': (0.04, 0.24, 0.40, 0.80), 'bao': (0.08, 0.22, 0.45, 0.80)}
_CANON = {}
# la altura que se espera de cada hoja comparada con la guardia (la mediana de sus cuadros). Sirve de control: si la
# escala por la cara se aleja mucho de esto (o no hay cara), manda la altura
ALTURA = {'guardia': 1.0, 'avanza': 1.0, 'retrocede': 1.0, 'agacha': 0.8, 'salto': 1.0, 'salto_adelante': 0.75,
          'puno_debil': 1.0, 'puno_fuerte': 0.97, 'patada_debil': 1.0, 'patada_fuerte': 1.0, 'agachado_puno': 0.75,
          'agachado_patada': 0.65, 'barrida': 0.62, 'aire': 0.8, 'recibe': 0.86, 'cae': 0.45, 'levanta': 0.75,
          'mareado': 0.9, 'poder1': 1.0, 'poder2': 0.95, 'poder3': 1.0, 'victoria': 1.0, 'intro': 1.0}
ALTURA_THOR = {'agacha': 0.85, 'salto': 1.05, 'salto_adelante': 0.8, 'puno_fuerte': 1.25, 'patada_debil': 1.0,
               'patada_fuerte': 1.2, 'agachado_puno': 0.85, 'agachado_patada': 0.75, 'barrida': 0.6, 'aire': 0.95,
               'recibe': 1.0, 'cae': 0.75, 'levanta': 0.8, 'poder3': 1.15, 'victoria': 1.1, 'mareado': 1.0, 'agarrado': 1.35}


def leer_hoja(pid, hoja):
    return np.asarray(Image.open(os.path.join(HOJAS, f'{PREF[pid]}_{hoja}.png')).convert('RGB')).astype(float)


def canon(pid):
    """La guardia nueva: la cara que sirve de regla, cuánto mide, el tamaño de su pixel y la paleta de todo el luchador."""
    if pid in _CANON:
        return _CANON[pid]
    a = leer_hoja(pid, 'guardia')
    cajas = separar(a, 4)
    x0, y0, x1, y1 = cajas[0]
    H, W = y1 - y0, x1 - x0
    c = CARA[pid]
    T = a[y0 + int(H * c[0]):y0 + int(H * c[1]), x0 + int(W * c[2]):x0 + int(W * c[3])]
    P = periodo_de(a[:, cajas[0][0]:cajas[-1][2]])
    # la paleta: 64 tonos sacados de la guardia y de varias hojas más, para que no falten colores (bocas, suelas)
    ff = ALTO[pid] / H
    muestras = []
    for hoja in ['guardia', 'avanza', 'puno_fuerte', 'cae', 'poder1', 'recibe', 'victoria']:
        if not os.path.exists(os.path.join(HOJAS, f'{PREF[pid]}_{hoja}.png')):
            continue
        b = leer_hoja(pid, hoja)
        for cx0, cy0, cx1, cy1 in separar(b, 4)[:4]:
            o, mm = recortar(celdas(b[cy0:cy1, cx0:cx1], P), fondo_de(b))
            o, mm = bajar(o, mm, (cy1 - cy0) * ff / o.shape[0])
            muestras.append(o[mm])
    X = np.concatenate(muestras)
    L = srgb2lab(X)
    C, lab = kmeans(L, 64)
    rgb = np.array([np.median(X[lab == j], axis=0) if (lab == j).any() else [0, 0, 0] for j in range(64)])
    orden = np.argsort(C[:, 0])
    pal = ['#%02x%02x%02x' % tuple(int(v) for v in rgb[j]) for j in orden]
    _CANON[pid] = (T, H, P, pal)
    return _CANON[pid]


SIN_SUELTOS = {('bao', 'poder1')}


def procesar(pid, hoja, n, ref=None):
    """ref: el cuadro parado de la hoja que manda la escala (las hojas de acostados traen uno de referencia)."""
    T, Hg, Pg, pal = canon(pid)
    a = leer_hoja(pid, hoja)
    cajas, mascaras = separar_mascaras(a, n)
    if (pid, hoja) in SIN_SUELTOS:
        # lo que vuela suelto (el nón lá de Bao) lo pinta el juego como bola: en el cuadro queda solo el cuerpo
        for i, (x0, y0, x1, y1) in enumerate(cajas):
            k, lab, st, _ = cv2.connectedComponentsWithStats(mascaras[i].astype(np.uint8), connectivity=8)
            if k > 2:
                mayor = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
                quedan = [j for j in range(1, k) if j == mayor or st[j, cv2.CC_STAT_AREA] < 0.02 * st[mayor, cv2.CC_STAT_AREA]]
                mascaras[i] = np.isin(lab, quedan)
                ys, xs = np.where(lab == mayor)
                cajas[i] = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    if len(cajas) != n:
        print(f'  {hoja}: salieron {len(cajas)} cuadros y se pidieron {n}', flush=True)
        if len(cajas) < n:
            return None
    # una escala para toda la hoja: el tamaño de la cara contra la de la guardia nueva
    escalas = []
    for x0, y0, x1, y1 in (cajas if ref is None else [cajas[ref]]):
        b = a[max(0, y0 - 8):y1 + 8, max(0, x0 - 8):x1 + 8]
        corr, s, _ = buscar_cara(T, b)
        if corr >= 0.5 and 0.55 <= s <= 1.6:
            escalas.append((corr, s))
    P = periodo_de(a[:, cajas[0][0]:cajas[-1][2]], Pg)
    # por altura: la mediana de los cuadros contra la guardia y lo que se espera de esta hoja
    propia = {'thor': ALTURA_THOR, 'rick': {'poder2': 0.7, 'mareado': 0.88}}.get(pid, {})
    esperada = propia.get(hoja, ALTURA.get(hoja, 1.0))
    esc_h = float(np.median([y1 - y0 for x0, y0, x1, y1 in cajas])) / (Hg * esperada)
    if ref is not None:
        # parado derecho mide un poco más que en guardia
        esc_h = (cajas[ref][3] - cajas[ref][1]) / (Hg * 1.05)
    buenas = sorted([e for e in escalas if e[0] >= 0.62], reverse=True)
    if buenas:
        mejores = [s for c_, s in buenas[:max(2, len(buenas) // 2)]]
        esc, como = float(np.median(mejores)), f'cara x{len(buenas)} {buenas[0][0]:.2f}'
        # una cara que calza fuerte manda; si calza a medias, la altura la controla
        if buenas[0][0] < 0.72 and not 0.78 <= esc / esc_h <= 1.28:
            esc, como = esc_h, f'altura (la cara daba {esc:.2f})'
    else:
        esc, como = esc_h, 'altura'
    if ref is not None:
        # en la hoja de acostados manda el alto del cuadro parado: la cara de frente calza flojo y la achicaba
        esc, como = esc_h, 'alto del parado'
    ff = ALTO[pid] / Hg / esc
    # la escala pareja que midió el juego, cuadro a cuadro (sf2_escala.py): se aplica aquí, al bajar la hoja grande
    from sf2_escala import factores
    fac = factores(pid).get(hoja, {}) if ref is None else {}
    out = []
    bg = fondo_de(a)
    for i, (x0, y0, x1, y1) in enumerate(cajas):
        pad = 10
        # solo lo de este cuadro: lo del vecino que cae en la caja pasa a fondo
        a_ = np.where(mascaras[i][..., None], a, bg)
        b = a_[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]
        o, mm = recortar(celdas(b, P), bg)
        o, mm = bajar(o, mm, (y1 - y0) * ff * fac.get(i, 1) / o.shape[0])
        q = motas(a_paleta(o, mm, pal), pal, bg)
        ys, xs = np.where(q >= 0)
        q = q[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        ax, ay = cadera(q, hoja in AIRE)
        out.append({'q': q, 'ancla': [ax, ay], 'sobre': 0, 'nota': ''})
    print(f'  {hoja:16s} {len(out)} cuadros  escala {esc:.2f} ({como})  alto {max(o["q"].shape[0] for o in out)}', flush=True)
    return out, pal


# los acostados redibujados (Rick los vio "muy gordos": agrandar el cuadro arreglaba el largo pero no el grosor). La hoja
# <pref>_acostado trae un cuadro parado de referencia y los acostados al largo de la estatura; cada uno reemplaza su
# cuadro en la tira ya hecha: {pid: (cuadros de la hoja, {(tira, cuadro): cuadro de la hoja})}
ACOSTADOS = {
    'rick': (4, {('cae', 3): 1, ('cae', 4): 2, ('levanta', 0): 3}),
    'steph': (3, {('cae', 3): 1, ('cae', 4): 2}),
    'sophie': (3, {('cae', 3): 1, ('cae', 4): 2}),
}


def leer_tira(pid, hoja, pal):
    """La tira guardada de vuelta a cuadros de índices de la paleta."""
    P = {tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)): k for k, c in enumerate(pal)}
    img = np.asarray(Image.open(os.path.join(SALE, pid, f'{hoja}.png')).convert('RGBA'))
    out = []
    for c in json.load(open(os.path.join(SALE, pid, f'{hoja}.json'))):
        x, y, w, h = c['caja']
        r = img[y:y + h, x:x + w]
        q = np.full((h, w), -1, int)
        op = r[..., 3] > 0
        q[op] = [P[tuple(v)] for v in r[op][:, :3]]
        out.append({'q': q, 'ancla': c['ancla'], 'sobre': c['sobre']})
    return out


def acostados(pid):
    n, cambios = ACOSTADOS[pid]
    r = procesar(pid, 'acostado', n, ref=0)
    if not r:
        return
    nuevos, pal = r
    for hoja in sorted({h for h, _ in cambios}):
        tira = leer_tira(pid, hoja, pal)
        for (h, i), j in cambios.items():
            if h == hoja:
                tira[i] = nuevos[j]
        guardar(pid, hoja, tira, pal)
        print(f'  {hoja}: acostados {[i for (h, i) in cambios if h == hoja]} redibujados', flush=True)


def guardar(pid, hoja, cuadros, pal):
    os.makedirs(os.path.join(SALE, pid), exist_ok=True)
    P = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in pal], np.uint8)
    H = max(c['q'].shape[0] for c in cuadros)
    W = sum(c['q'].shape[1] + 2 for c in cuadros)
    tira = np.zeros((H, W, 4), np.uint8)
    info, x = [], 0
    for c in cuadros:
        q = c['q']
        h, w = q.shape
        y = H - h
        rgba = np.zeros((h, w, 4), np.uint8)
        rgba[q >= 0, :3] = P[q[q >= 0]]
        rgba[q >= 0, 3] = 255
        tira[y:y + h, x:x + w] = rgba
        info.append({'caja': [x, y, w, h], 'ancla': [round(c['ancla'][0], 1), c['ancla'][1]], 'sobre': c['sobre']})
        x += w + 2
    Image.fromarray(tira).save(os.path.join(SALE, pid, f'{hoja}.png'), optimize=True)
    json.dump(info, open(os.path.join(SALE, pid, f'{hoja}.json'), 'w'))


def guardia_tira(pid):
    """La guardia de siempre también como tira de un cuadro, con su ancla medida igual que los demás."""
    pal, g, _, _, _ = guardia(pid)
    ax, ay = cadera(g, False)
    guardar(pid, 'guardia', [{'q': g, 'ancla': [ax, ay], 'sobre': 0}], pal)


if __name__ == '__main__':
    quien = [x for x in sys.argv[1:] if not x.startswith('--')] or list(PREF)
    solo = [x[2:] for x in sys.argv[1:] if x.startswith('--')]
    for pid in quien:
        print(pid, flush=True)
        todas = [(h[0], h[1]) for h in plan_hojas(pid)]
        # las que se hicieron antes del plan
        extra = {'rick': [('puno_debil', 4)], 'sophie': [('avanza', 6), ('agachado_patada', 4)]}.get(pid, [])
        if not os.path.exists(os.path.join(HOJAS, f'{PREF[pid]}_guardia.png')):
            print('  falta la guardia nueva')
            continue
        # las que se rehicieron con otra cantidad de cuadros
        cambia = {('steph', 'barrida'): 4}
        todas = [(h, cambia.get((pid, h), n)) for h, n in todas]
        for hoja, n in todas + extra:
            if solo and hoja not in solo:
                continue
            if not os.path.exists(os.path.join(HOJAS, f'{PREF[pid]}_{hoja}.png')):
                continue
            r = procesar(pid, hoja, n)
            if r:
                guardar(pid, hoja, *r)
        if pid in ACOSTADOS and os.path.exists(os.path.join(HOJAS, f'{PREF[pid]}_acostado.png')) and \
                (not solo or {'cae', 'levanta', 'acostado'} & set(solo)):
            acostados(pid)
