"""Exporta los luchadores SF2 (las tiras de sf2.py) al contrato de arte del juego Street Family Fighter 2.

Por luchador escribe docs/pelea/JUEGO/assets/luchadores/<id>/: una hoja PNG por animación (los cuadros en fila, todos
del mismo lienzo con el pivote en el mismo lugar) y manifest.json con, por cuadro, los ticks, la fase, las cajas que
reciben (cabeza, cuerpo, piernas y el brazo o la pierna que pega), las que pegan, la de empuje y el avance. Por
animación de golpe va además `golpe`: daño, nivel (débil, fuerte, poder, súper), tipo (alto, medio, bajo), si tumba,
la pausa del impacto y el aturdimiento. Los poderes van en `poderes` con su animación, su nombre y su proyectil.

Todo sale medido sobre el pixel de cada cuadro: las cajas que pegan van donde está de verdad el puño, el pie, el bate o
la varita en el cuadro activo.

    python3 sf2_juego.py            # los cinco
    python3 sf2_juego.py rick       # uno
"""
import numpy as np, json, os, sys, glob
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(AQUI, 'datos', 'sf2')
FX = os.path.join(AQUI, 'datos', 'familia', 'crudo', 'hojas')
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))
SALE = os.path.join(RAIZ, 'docs', 'pelea', 'JUEGO', 'assets')

NOMBRES = {'rick': 'Rick', 'sophie': 'Sophie', 'alana': 'Alana', 'steph': 'Steph', 'thor': 'Thor'}
# los jefes del modo arcade (lote G): se exportan aparte, no van en la lista de luchadores del índice
JEFES = {'abuela': 'La Abuela', 'bao': 'Tío Bao, el Comerciante'}
CIUDAD = {'rick': 'caracas', 'sophie': 'hochiminh', 'alana': 'celestial', 'steph': 'bogota', 'thor': 'japon',
          'abuela': 'casa_abuela', 'bao': 'halong'}
PODERES = {
    'rick': [('Onda', 'fx_onda'), ('Embestida', None), ('Súper Onda', 'fx_super_onda')],
    'sophie': [('Ráfaga de Hojas', 'fx_hojas'), ('Mil Patadas', None), ('Furia de la Selva', 'fx_selva')],
    'alana': [('Estrella Mágica', 'fx_estrella'), ('Giro de Princesa', None), ('Corona Estelar', 'fx_corona')],
    'steph': [('Jonrón', 'fx_pelota'), ('Voltereta Loca', None), ('Tornado de Bate', None)],
    'thor': [('Súper Ladrido', 'fx_ladrido'), ('Rayo Veloz', None), ('Aullido Trueno', 'fx_trueno')],
    'abuela': [('Chancletazo', 'fx_chancla'), ('¡Ven acá!', None), ('Lluvia de Chancletas', None)],
    'bao': [('Nón Lá Bumerán', 'fx_non_la'), ('Golpe de Vara', None), ('Lluvia de Mangos', None)],
}
SONIDO_PODER = {'fx_onda': 'poder_onda', 'fx_super_onda': 'poder_onda', 'fx_hojas': 'poder_hojas', 'fx_selva': 'poder_hojas',
                'fx_estrella': 'poder_estrella', 'fx_corona': 'poder_estrella', 'fx_pelota': 'poder_pelota',
                'fx_ladrido': 'poder_ladrido', 'fx_trueno': 'poder_trueno', 'fx_chancla': 'poder_pelota',
                'fx_non_la': 'poder_pelota'}
# el alto de cada efecto en pixeles del arte (los luchadores miden unos 170)
ALTO_FX = {'fx_onda': 46, 'fx_super_onda': 92, 'fx_hojas': 54, 'fx_selva': 120, 'fx_estrella': 44, 'fx_corona': 96,
           'fx_pelota': 26, 'fx_ladrido': 70, 'fx_trueno': 110, 'fx_golpe': 56, 'fx_bloqueo': 50, 'fx_polvo': 30, 'fx_mareo': 30,
           'fx_chancla': 22, 'fx_non_la': 30}

# golpes: (daño, nivel, tipo, tumba)
DEBIL, FUERTE, PODER, SUPER = 'debil', 'fuerte', 'poder', 'super'
PAUSA = {DEBIL: 6, FUERTE: 10, PODER: 12, SUPER: 16}
ATURDE = {DEBIL: 12, FUERTE: 18, PODER: 20, SUPER: 30}


def c(h, i, t, fase='neutral', **kw):
    """Un paso de animación: hoja, cuadro, ticks, fase y extras (avance en px por tick, bola que sale)."""
    return dict(hoja=h, i=i, t=t, fase=fase, **kw)


def comunes():
    """Las animaciones que comparten los cinco. Los nombres siguen el contrato acordado con el juego."""
    return {
        'guardia': dict(bucle=True, pasos=[c('guardia', i, 8) for i in (0, 1, 2, 3)]),
        'avanza': dict(bucle=True, pasos=[c('avanza', i, 5) for i in range(6)]),
        'retrocede': dict(bucle=True, pasos=[c('retrocede', i, 5) for i in range(6)]),
        'agacharse': dict(bucle=False, pasos=[c('agacha', 0, 3)]),
        'agachado': dict(bucle=True, pasos=[c('agacha', 1, 60)]),
        'bloqueo': dict(bucle=False, pasos=[c('agacha', 2, 4), c('agacha', 2, 10)]),
        'bloqueo_bajo': dict(bucle=False, pasos=[c('agacha', 3, 4), c('agacha', 3, 10)]),
        'salto': dict(bucle=False, pasos=[c('salto', 0, 3), c('salto', 1, 6), c('salto', 2, 10), c('salto', 3, 10), c('salto', 4, 10)]),
        'salto_adelante': dict(bucle=False, pasos=[c('salto_adelante', 0, 4), c('salto_adelante', 1, 8), c('salto_adelante', 2, 8), c('salto_adelante', 3, 8), c('salto_adelante', 4, 10)]),
        'puño_debil': dict(golpe=(5, DEBIL, 'medio', False), pega='frente', pasos=[c('puno_debil', 1, 2, 'inicio'), c('puno_debil', 2, 4, 'activo'), c('puno_debil', 3, 4, 'recuperacion'), c('puno_debil', 0, 3, 'recuperacion')]),
        'puño_fuerte': dict(golpe=(11, FUERTE, 'medio', False), pega='frente', pasos=[c('puno_fuerte', 0, 4, 'inicio'), c('puno_fuerte', 1, 3, 'inicio'), c('puno_fuerte', 2, 6, 'activo'), c('puno_fuerte', 3, 9, 'recuperacion')]),
        'patada_debil': dict(golpe=(6, DEBIL, 'medio', False), pega='frente', pasos=[c('patada_debil', 0, 3, 'inicio'), c('patada_debil', 1, 2, 'inicio'), c('patada_debil', 2, 5, 'activo'), c('patada_debil', 3, 6, 'recuperacion')]),
        'patada_fuerte': dict(golpe=(12, FUERTE, 'medio', False), pega='frente', pasos=[c('patada_fuerte', 0, 4, 'inicio'), c('patada_fuerte', 1, 3, 'inicio'), c('patada_fuerte', 2, 6, 'activo'), c('patada_fuerte', 3, 7, 'recuperacion'), c('patada_fuerte', 4, 6, 'recuperacion')]),
        'agachado_puño_debil': dict(golpe=(5, DEBIL, 'medio', False), pega='frente', pasos=[c('agachado_puno', 1, 2, 'inicio'), c('agachado_puno', 0, 4, 'activo'), c('agachado_puno', 1, 4, 'recuperacion')]),
        'agachado_puño_fuerte': dict(golpe=(11, FUERTE, 'medio', False), pega='arriba', pasos=[c('agachado_puno', 2, 4, 'inicio'), c('agachado_puno', 3, 6, 'activo'), c('agachado_puno', 3, 6, 'recuperacion'), c('agachado_puno', 2, 6, 'recuperacion')]),
        'agachado_patada_debil': dict(golpe=(5, DEBIL, 'bajo', False), pega='abajo', pasos=[c('agachado_patada', 1, 2, 'inicio'), c('agachado_patada', 2, 5, 'activo'), c('agachado_patada', 3, 5, 'recuperacion')]),
        'agachado_patada_fuerte': dict(golpe=(11, FUERTE, 'bajo', True), pega='abajo', pasos=[c('barrida', 0, 4, 'inicio'), c('barrida', 1, 3, 'inicio'), c('barrida', 2, 6, 'activo'), c('barrida', 3, 7, 'recuperacion'), c('barrida', 4, 9, 'recuperacion')]),
        'aire_puño': dict(golpe=(8, FUERTE, 'alto', False), pega='frente', pasos=[c('aire', 0, 3, 'inicio'), c('aire', 1, 14, 'activo')]),
        'aire_patada': dict(golpe=(9, FUERTE, 'alto', False), pega='frente', pasos=[c('aire', 2, 3, 'inicio'), c('aire', 3, 16, 'activo')]),
        'recibe_alto': dict(bucle=False, pasos=[c('recibe', 0, 4, 'golpeado'), c('recibe', 1, 10, 'golpeado'), c('recibe', 1, 4, 'golpeado')]),
        'recibe_bajo': dict(bucle=False, pasos=[c('recibe', 2, 4, 'golpeado'), c('recibe', 3, 10, 'golpeado'), c('recibe', 3, 4, 'golpeado')]),
        'recibe_aire': dict(bucle=False, pasos=[c('cae', 0, 8, 'golpeado'), c('cae', 1, 40, 'golpeado')]),
        'cae': dict(bucle=False, pasos=[c('cae', 0, 6, 'golpeado'), c('cae', 1, 8, 'golpeado'), c('cae', 2, 5, 'golpeado'), c('cae', 3, 10, 'golpeado'), c('cae', 4, 30, 'golpeado')]),
        'levanta': dict(bucle=False, pasos=[c('levanta', 0, 6), c('levanta', 1, 6), c('levanta', 2, 6), c('levanta', 3, 6)]),
        'mareado': dict(bucle=True, pasos=[c('mareado', 0, 10), c('mareado', 1, 10), c('mareado', 2, 10), c('mareado', 1, 10)]),
        'victoria': dict(bucle=True, pasos=[c('victoria', 0, 14), c('victoria', 1, 14), c('victoria', 2, 16), c('victoria', 3, 40)]),
        'intro': dict(bucle=False, pasos=[c('intro', 0, 16), c('intro', 1, 14), c('intro', 2, 14), c('intro', 3, 12)]),
        # lote F: carrera (doble toque adelante), saltito atrás, agarre y el que es agarrado. Si la hoja no está, el
        # juego usa su respaldo (avanza, retrocede, puño_fuerte y recibe_alto)
        'carrera': dict(bucle=True, pasos=[c('carrera', i, 4) for i in range(4)]),
        'carrera_atras': dict(bucle=False, pasos=[c('carrera_atras', 0, 3), c('carrera_atras', 1, 10), c('carrera_atras', 2, 6)]),
        'agarre': dict(golpe=(13, FUERTE, 'medio', True), pega='frente', pasos=[c('agarre', 0, 4, 'inicio'), c('agarre', 1, 8, 'activo'), c('agarre', 2, 8, 'recuperacion'), c('agarre', 3, 12, 'recuperacion')]),
        'agarrado': dict(bucle=False, pasos=[c('agarrado', 0, 8, 'golpeado'), c('agarrado', 1, 20, 'golpeado')]),
    }


def bola(h, i, t, bola, **kw):
    return c(h, i, t, 'activo', bola=bola, **kw)


def poderes(pid):
    """Los tres poderes de cada uno: la animación con la fase, el avance y el cuadro donde sale el proyectil."""
    P = {}
    # los de proyectil comparten la forma: carga, suelta en el cuadro activo y se recupera
    def proyectil(hoja, act, fx, nivel, daño):
        pasos = [c(hoja, k, 6 if nivel == PODER else 8, 'inicio') for k in range(act)]
        pasos += [bola(hoja, act, 4, fx), c(hoja, act + 1, 14, 'recuperacion')]
        if act + 2 < 5:
            pasos.append(c(hoja, act + 2, 8, 'recuperacion'))
        return dict(golpe=(daño, nivel, 'medio', nivel == SUPER), pega='frente', pasos=pasos)
    if pid == 'rick':
        P['poder1'] = proyectil('poder1', 2, 'fx_onda', PODER, 12)
        P['poder2'] = dict(golpe=(14, PODER, 'medio', True), pega='frente', pasos=[c('poder2', 0, 6, 'inicio'), c('poder2', 1, 5, 'activo', avance=5), c('poder2', 2, 10, 'activo', avance=6), c('poder2', 3, 6, 'activo', avance=2), c('poder2', 4, 12, 'recuperacion', avance=1)])
        P['poder3'] = proyectil('poder3', 3, 'fx_super_onda', SUPER, 30)
    elif pid == 'sophie':
        P['poder1'] = proyectil('poder1', 2, 'fx_hojas', PODER, 12)
        orden = [1, 2, 3, 4, 2, 3, 1, 4, 3, 2]
        P['poder2'] = dict(golpe=(3, PODER, 'medio', False), pega='frente', multi=True, pasos=[c('poder2', 0, 5, 'inicio')] + [c('poder2', k, 3, 'activo') for k in orden] + [c('poder2', 0, 12, 'recuperacion')])
        P['poder3'] = proyectil('poder3', 3, 'fx_selva', SUPER, 30)
    elif pid == 'alana':
        P['poder1'] = proyectil('poder1', 2, 'fx_estrella', PODER, 11)
        giro = [0, 1, 2, 3] * 3
        P['poder2'] = dict(golpe=(4, PODER, 'medio', False), pega='ambos', multi=True, pasos=[c('poder2', 0, 4, 'inicio')] + [c('poder2', k, 3, 'activo', avance=2) for k in giro] + [c('poder2', 4, 12, 'recuperacion')])
        P['poder3'] = proyectil('poder3', 3, 'fx_corona', SUPER, 30)
    elif pid == 'steph':
        P['poder1'] = proyectil('poder1', 3, 'fx_pelota', PODER, 12)
        P['poder2'] = dict(golpe=(13, PODER, 'alto', True), pega='frente', pasos=[c('poder2', 0, 5, 'inicio', avance=3), c('poder2', 1, 5, 'inicio', avance=4), c('poder2', 2, 5, 'activo', avance=4), c('poder2', 3, 6, 'activo', avance=3), c('poder2', 4, 12, 'recuperacion')])
        giro = [0, 1, 2, 3] * 4
        P['poder3'] = dict(golpe=(5, SUPER, 'medio', False), pega='ambos', multi=True, pasos=[c('poder3', 0, 6, 'inicio')] + [c('poder3', k, 3, 'activo', avance=2) for k in giro] + [c('poder3', 4, 16, 'activo')])
    elif pid == 'thor':
        P['poder1'] = proyectil('poder1', 2, 'fx_ladrido', PODER, 11)
        P['poder2'] = dict(golpe=(13, PODER, 'medio', True), pega='frente', pasos=[c('poder2', 0, 6, 'inicio'), c('poder2', 1, 4, 'activo', avance=7), c('poder2', 2, 10, 'activo', avance=8), c('poder2', 3, 6, 'activo', avance=3), c('poder2', 4, 12, 'recuperacion', avance=1)])
        P['poder3'] = proyectil('poder3', 2, 'fx_trueno', SUPER, 30)
    elif pid == 'abuela':
        P['poder1'] = proyectil('poder1', 2, 'fx_chancla', PODER, 12)
        # ¡Ven acá!: agarra la oreja con el brazo estirado; el jalón lo hace el juego
        P['poder2'] = dict(golpe=(14, PODER, 'medio', False), pega='frente', pasos=[c('poder2', 0, 5, 'inicio'), c('poder2', 1, 8, 'activo'), c('poder2', 2, 10, 'recuperacion'), c('poder2', 3, 8, 'recuperacion'), c('poder2', 4, 8, 'recuperacion')])
        # la lluvia de chancletas: basta la pose, las que caen las pinta el juego con chancla_bola
        P['poder3'] = dict(golpe=(30, SUPER, 'alto', True), pasos=[c('poder3', 0, 8, 'inicio'), c('poder3', 1, 10, 'activo'), c('poder3', 2, 14, 'activo'), c('poder3', 3, 14, 'recuperacion'), c('poder3', 4, 12, 'recuperacion')])
    elif pid == 'bao':
        P['poder1'] = proyectil('poder1', 2, 'fx_non_la', PODER, 12)
        giro = [1, 2, 3, 2]
        P['poder2'] = dict(golpe=(5, PODER, 'medio', False), pega='ambos', multi=True, pasos=[c('poder2', 0, 5, 'inicio')] + [c('poder2', k, 4, 'activo', avance=4) for k in giro] + [c('poder2', 4, 12, 'recuperacion')])
        P['poder3'] = dict(golpe=(30, SUPER, 'alto', True), pasos=[c('poder3', 0, 8, 'inicio'), c('poder3', 1, 10, 'activo'), c('poder3', 2, 14, 'activo'), c('poder3', 3, 14, 'recuperacion'), c('poder3', 4, 12, 'recuperacion')])
    for k, (nombre, fx) in zip(('poder1', 'poder2', 'poder3'), PODERES[pid]):
        P[k]['nombre'] = nombre
    return P


# ------------------------------------------------------------------ medidas sobre el pixel

def leer_tira(pid, hoja):
    p = os.path.join(D, pid, f'{hoja}.png')
    if not os.path.exists(p):
        return None
    t = np.asarray(Image.open(p).convert('RGBA'))
    info = json.load(open(os.path.join(D, pid, f'{hoja}.json')))
    out = []
    for c_ in info:
        x, y, w, h = c_['caja']
        out.append((t[y:y + h, x:x + w], c_['ancla']))
    return out


def caja_de(m, ax, ay):
    ys, xs = np.where(m)
    if len(xs) == 0:
        return None
    return [int(xs.min() - ax), int(ys.min() - ay), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]


def recibe(img, ax, ay):
    op = img[..., 3] > 0
    ys, _ = np.where(op)
    y0, y1 = ys.min(), ys.max() + 1
    h = y1 - y0
    filas = np.arange(op.shape[0])[:, None]
    zonas = []
    for nombre, a, b in (('cabeza', 0, 0.24), ('cuerpo', 0.24, 0.58), ('piernas', 0.58, 1.0)):
        m = op & (filas >= y0 + a * h) & (filas < y0 + b * h)
        k = caja_de(m, ax, ay)
        if k:
            zonas.append({'zona': nombre, 'caja': k})
    return zonas


def punta(img, ax, ay, modo):
    """El punto que pega: lo más adelante (frente), lo más alto (arriba), lo más adelante abajo (abajo)."""
    op = img[..., 3] > 0
    ys, xs = np.where(op)
    if modo == 'arriba':
        y = ys.min()
        x = xs[ys <= y + 4].mean()
        return float(x - ax), float(y + 6 - ay)
    if modo == 'abajo':
        corte = ys.min() + 0.6 * (ys.max() - ys.min())
        sel = ys >= corte
        xs, ys = xs[sel], ys[sel]
    x = xs.max()
    y = ys[xs >= x - 5].mean()
    return float(x - 4 - ax), float(y - ay)


def pega(img, ax, ay, modo):
    if modo == 'ambos':
        k = caja_de(img[..., 3] > 0, ax, ay)
        return [[k[0] - 6, k[1] + k[3] // 4, k[2] + 12, k[3] // 2]], None
    px, py = punta(img, ax, ay, modo)
    caja = [round(px - 18), round(py - 14), 34, 28]
    brazo = [round(px - 12), round(py - 9), 20, 18]
    return [caja], brazo


# ------------------------------------------------------------------ exportar

# donde nace el proyectil cuando la punta medida no sirve (el juego lo midió a ojo): la pelota de Steph salía del piso
# porque la punta más adelante es el pie, y medio trueno de Thor quedaba bajo el piso
BOLA_FIJA = {('steph', 'poder1', 3): (70, -133), ('thor', 'poder3', 2): (58, -66)}


def exportar(pid):
    anims = {**comunes(), **poderes(pid)}
    if pid == 'thor' and os.path.exists(os.path.join(D, pid, 'trote.png')):
        # el trote de 8 cuadros con las patas en pares diagonales (los 6 de avanza eran casi iguales y patinaba)
        anims['avanza'] = dict(bucle=True, pasos=[c('trote', i, 4) for i in range(8)])
        anims['retrocede'] = dict(bucle=True, pasos=[c('trote_atras', i, 5) for i in range(6)])
    tiras = {}
    for a in anims.values():
        for p in a['pasos']:
            if p['hoja'] not in tiras:
                tiras[p['hoja']] = leer_tira(pid, p['hoja'])
    faltan = sorted(h for h, t in tiras.items() if t is None)
    if faltan:
        print(pid, 'faltan hojas:', faltan)
    tiras = {h: t for h, t in tiras.items() if t is not None}
    # el lienzo: lo que más sobresale del pivote en todos los cuadros
    izq = der = arr = abj = 0
    for t in tiras.values():
        for img, (ax, ay) in t:
            izq, der = max(izq, ax), max(der, img.shape[1] - ax)
            arr, abj = max(arr, ay), max(abj, img.shape[0] - ay)
    W = int(2 * max(izq, der)) + 8
    H = int(arr + abj) + 12
    W += W % 2
    ox, oy = W // 2, int(arr) + 6
    g0, (gx, gy) = tiras['guardia'][0]
    gk = caja_de(g0[..., 3] > 0, gx, gy)
    empuje_w = int(gk[2] * 0.45)
    dir_ = os.path.join(SALE, 'luchadores', pid)
    os.makedirs(dir_, exist_ok=True)
    for f in glob.glob(os.path.join(dir_, '*.png')):
        os.remove(f)
    man = {'id': pid, 'nombre': {**NOMBRES, **JEFES}[pid], 'alto': int(-gk[1]), 'retrato': 'retrato.png', 'ciudad': CIUDAD[pid],
           'poderes': {}, 'anims': {}}
    bolas = set()
    for nombre, a in anims.items():
        pasos = [p for p in a['pasos'] if p['hoja'] in tiras and p['i'] < len(tiras[p['hoja']])]
        if not pasos:
            continue
        hoja = np.zeros((H, W * len(pasos), 4), np.uint8)
        cuadros = []
        for k, p in enumerate(pasos):
            img, (ax, ay) = tiras[p['hoja']][p['i']]
            x0, y0 = int(round(k * W + ox - ax)), int(round(oy - ay))
            hoja[y0:y0 + img.shape[0], x0:x0 + img.shape[1]] = np.where(img[..., 3:] > 0, img, hoja[y0:y0 + img.shape[0], x0:x0 + img.shape[1]])
            rec = recibe(img, ax, ay)
            golpes = []
            if p['fase'] == 'activo' and 'pega' in a:
                golpes, brazo = pega(img, ax, ay, a['pega'])
                if brazo:
                    rec.append({'zona': 'brazo', 'caja': brazo})
            alto = -min(z['caja'][1] for z in rec)
            cu = {'ticks': p['t'], 'fase': p['fase'], 'recibe': rec, 'pega': golpes,
                  'empuje': [-empuje_w // 2, -alto, empuje_w, alto]}
            if p.get('avance'):
                cu['avance'] = p['avance']
            if p.get('bola'):
                px, py = punta(img, ax, ay, 'frente')
                cu['bola'] = {'anim': p['bola'], 'x': round(px + 10), 'y': round(py)}
                if (pid, nombre, k) in BOLA_FIJA:
                    cu['bola']['x'], cu['bola']['y'] = BOLA_FIJA[(pid, nombre, k)]
                bolas.add(p['bola'])
            cuadros.append(cu)
        Image.fromarray(hoja).save(os.path.join(dir_, f'{nombre}.png'), optimize=True)
        an = {'bucle': a.get('bucle', False), 'hoja': f'{nombre}.png', 'w': W, 'h': H, 'ox': ox, 'oy': oy, 'cuadros': cuadros}
        if 'golpe' in a:
            daño, nivel, tipo, tumba = a['golpe']
            an['golpe'] = {'daño': daño, 'nivel': nivel, 'tipo': tipo, 'tumba': tumba, 'pausa': PAUSA[nivel],
                           'aturde': ATURDE[nivel], 'multi': a.get('multi', False)}
        man['anims'][nombre] = an
        if nombre.startswith('poder'):
            fx = PODERES[pid][int(nombre[-1]) - 1][1]
            man['poderes'][nombre] = {'anim': nombre, 'nombre': a['nombre'], 'bola': fx and f'{fx[3:]}_bola',
                                      'sonido': SONIDO_PODER.get(fx, 'golpe_super' if nombre == 'poder3' else 'silbido_fuerte'),
                                      'costo': 100 if nombre == 'poder3' else (25 if nombre == 'poder1' else 35)}
    # los proyectiles van con el nombre <fx>_bola
    for fx in sorted(bolas):
        r = efecto(fx)
        if r is None:
            print(pid, 'falta el efecto', fx)
            continue
        cs, w, h = r
        n = f'{fx[3:]}_bola'
        Image.fromarray(np.concatenate(cs, axis=1)).save(os.path.join(dir_, f'{n}.png'), optimize=True)
        man['anims'][n] = {'bucle': True, 'hoja': f'{n}.png', 'w': w, 'h': h, 'ox': w // 2, 'oy': h // 2,
                           'cuadros': [{'ticks': 4, 'fase': 'activo', 'recibe': [], 'pega': [[-w // 3, -h // 3, 2 * w // 3, 2 * h // 3]], 'empuje': [0, 0, 0, 0]} for _ in cs]}
        for p in man['anims'].values():
            for cu in p['cuadros']:
                if cu.get('bola', {}).get('anim') == fx:
                    cu['bola']['anim'] = n
    # el retrato: la cabeza de la guardia
    lado = int(round(-gk[1] * 0.42))
    ys, xs = np.where(g0[..., 3] > 0)
    top = ys.min()
    cx = int(np.median(xs[ys < top + lado * 0.6])) + lado // 8
    ret = np.zeros((lado, lado, 4), np.uint8)
    sub = g0[max(0, top - 2):top - 2 + lado, max(0, cx - lado // 2):cx + lado // 2]
    ret[:sub.shape[0], :sub.shape[1]] = sub
    Image.fromarray(ret).save(os.path.join(dir_, 'retrato.png'))
    rg = retrato_grande(pid)
    if rg is not None:
        Image.fromarray(rg).save(os.path.join(dir_, 'retrato_grande.png'))
        man['retratoGrande'] = 'retrato_grande.png'
    json.dump(man, open(os.path.join(dir_, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    print(pid, 'lienzo', W, H, 'anims', len(man['anims']), 'alto', man['alto'])
    return man


def efecto(fx):
    """Una hoja de efecto sobre negro: se separan los 4 cuadros, se recortan por brillo y se bajan a su alto."""
    p = os.path.join(FX, f'{fx}.png')
    if not os.path.exists(p):
        return None
    import cv2
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
    lum = a.max(2)
    m = lum > 38
    cols = m.any(0)
    # los cuadros: tramos de columnas con algo, separados por huecos
    tramos, x = [], 0
    while x < len(cols):
        if cols[x]:
            x0 = x
            while x < len(cols) and (cols[x] or (x + 12 < len(cols) and cols[x:x + 12].any())):
                x += 1
            tramos.append((x0, x))
        x += 1
    tramos = sorted(tramos, key=lambda t: t[1] - t[0], reverse=True)[:4]
    tramos.sort()
    alto = ALTO_FX.get(fx, 48)
    cuadros = []
    for x0, x1 in tramos:
        sub, mm = a[:, x0:x1], m[:, x0:x1]
        ys = np.where(mm.any(1))[0]
        sub, mm = sub[ys.min():ys.max() + 1], mm[ys.min():ys.max() + 1]
        k = alto / sub.shape[0]
        w, h = max(1, round(sub.shape[1] * k)), alto
        rgb = cv2.resize(sub * mm[..., None], (w, h), interpolation=cv2.INTER_AREA)
        al = cv2.resize(mm.astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
        rgb = np.clip(rgb / np.maximum(al[..., None], 1e-3), 0, 255)
        # pocos tonos: se cuantiza a 5 niveles por canal (se ve a pixel art, no a foto)
        rgb = (np.round(rgb / 51) * 51).clip(0, 255)
        rgba = np.zeros((h, w, 4), np.uint8)
        rgba[..., :3] = rgb.astype(np.uint8)
        rgba[..., 3] = np.where(al >= 0.45, 255, 0)
        cuadros.append(rgba)
    W = max(c_.shape[1] for c_ in cuadros) + 2
    W += W % 2
    H = alto + 2
    out = []
    for c_ in cuadros:
        f = np.zeros((H, W, 4), np.uint8)
        y0, x0 = (H - c_.shape[0]) // 2, (W - c_.shape[1]) // 2
        f[y0:y0 + c_.shape[0], x0:x0 + c_.shape[1]] = c_
        out.append(f)
    return out, W, H


def retrato_grande(pid, lado=160):
    """El retrato del selector y del VS: el busto de Higgsfield a su grilla, a `lado` pixeles, sin el fondo azul."""
    import cv2
    from familia import celdas, recortar, fondo_de, periodo_de
    from paleta import srgb2lab, kmeans
    ruta = os.path.join(AQUI, 'datos', 'familia', 'crudo', 'retratos', f'{pid}.png')
    if not os.path.exists(ruta):
        return None
    a = np.asarray(Image.open(ruta).convert('RGB')).astype(float)
    bg = fondo_de(a)
    k = lado / a.shape[0]
    rgb = cv2.resize(a.astype(np.float32), (lado, lado), interpolation=cv2.INTER_AREA).astype(float)
    m = np.abs(rgb - bg).sum(2) > 60
    # el fondo que toca el borde se va; lo de adentro que se parece al fondo se queda
    n_, lab, st, _ = cv2.connectedComponentsWithStats((~m).astype(np.uint8), connectivity=4)
    for i in range(1, n_):
        x, y, w, h = st[i, :4]
        if x == 0 or y == 0 or x + w == lado or y + h == lado:
            pass
        else:
            m[lab == i] = True
    X = srgb2lab(rgb[m])
    C, l = kmeans(X, 48)
    pal = np.array([np.median(rgb[m][l == j], axis=0) if (l == j).any() else [0, 0, 0] for j in range(48)])
    out = np.zeros((lado, lado, 4), np.uint8)
    out[m, :3] = pal[l].clip(0, 255).astype(np.uint8)
    out[m, 3] = 255
    return out


def efectos_comunes():
    """Chispas de golpe y bloqueo, polvo y mareo: en assets/efectos/ con su manifest."""
    dir_ = os.path.join(SALE, 'efectos')
    os.makedirs(dir_, exist_ok=True)
    man = {}
    for fx in ('fx_golpe', 'fx_bloqueo', 'fx_polvo', 'fx_mareo'):
        r = efecto(fx)
        if r is None:
            continue
        cs, w, h = r
        n = fx[3:]
        Image.fromarray(np.concatenate(cs, axis=1)).save(os.path.join(dir_, f'{n}.png'), optimize=True)
        man[n] = {'bucle': n == 'mareo', 'hoja': f'{n}.png', 'w': w, 'h': h, 'ox': w // 2, 'oy': h // 2 if n != 'polvo' else h - 2,
                  'cuadros': [{'ticks': 3 if n in ('golpe', 'bloqueo') else 5} for _ in cs]}
    json.dump(man, open(os.path.join(dir_, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    print('efectos', list(man))


MALVADOS = {'rick': 'rick_oscuro', 'steph': 'steph_oscura', 'sophie': 'sophie_oscura', 'alana': 'alana_oscura',
            'thor': 'thor_infernal'}


def malvados():
    """Los retratos de las versiones malvadas (el juego les cambia la paleta a las hojas): el busto de Higgsfield en
    retrato_grande.png y su cabeza en retrato.png, al mismo tamaño que el retrato del luchador normal."""
    for pid, mid in MALVADOS.items():
        rg = retrato_grande(mid)
        if rg is None:
            continue
        dir_ = os.path.join(SALE, 'luchadores', mid)
        os.makedirs(dir_, exist_ok=True)
        Image.fromarray(rg).save(os.path.join(dir_, 'retrato_grande.png'))
        # la cabeza: el cuadrado de arriba del busto donde está la cara, al lado del retrato normal
        normal = os.path.join(SALE, 'luchadores', pid, 'retrato.png')
        lado = Image.open(normal).size[0] if os.path.exists(normal) else 80
        ys, xs = np.where(rg[..., 3] > 0)
        t = int(ys.min())
        cara = Image.fromarray(rg).crop((24, t, 24 + 112, t + 112)).resize((lado, lado), Image.NEAREST)
        cara.save(os.path.join(dir_, 'retrato.png'))
        print('malvado', mid)


def empaquetar():
    """Lo que no es de un luchador: los 5 escenarios, el logo, el video, el índice y el índice de audio con los nombres
    que pide el juego (docs/CONTRATO_ARTE.md de Street_Family_Fighter_2)."""
    import shutil
    for e in ('japon', 'caracas', 'hochiminh', 'bogota', 'celestial'):
        src, dst = os.path.join(RAIZ, 'public', 'escenarios', e), os.path.join(SALE, 'escenarios', e)
        if os.path.exists(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns('_alineacion.json'))
    # los seis mundos del lote E: solo los PNG, porque sus manifest.json los escribió el juego
    for e in ('china', 'italia', 'usa', 'brasil', 'egipto', 'polo_norte', 'halong', 'salto_angel', 'casa_abuela'):
        src, dst = os.path.join(RAIZ, 'public', 'escenarios', e), os.path.join(SALE, 'escenarios', e)
        if not os.path.exists(os.path.join(src, 'piso.png')):
            continue
        if os.path.exists(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns('_alineacion.json', 'manifest.json', 'extra_*'))
    malvados()
    pant = os.path.join(SALE, 'pantallas')
    if os.path.exists(os.path.join(pant, 'logo.png')):
        shutil.copy(os.path.join(pant, 'logo.png'), os.path.join(SALE, 'logo.png'))
    jefes = [j for j in JEFES if os.path.exists(os.path.join(SALE, 'luchadores', j, 'manifest.json'))]
    # los jefes van también en luchadores: así el juego deja la silueta y usa el arte
    mundos = ['caracas', 'hochiminh', 'bogota', 'japon', 'celestial', 'china', 'italia', 'usa', 'brasil', 'egipto',
              'polo_norte', 'halong', 'salto_angel', 'casa_abuela']
    mundos = [e for e in mundos if os.path.exists(os.path.join(SALE, 'escenarios', e, 'piso.png'))]
    json.dump({'luchadores': list(NOMBRES) + jefes, 'jefes': jefes, 'escenarios': mundos,
               'ciudad': CIUDAD}, open(os.path.join(SALE, 'indice.json'), 'w'), ensure_ascii=False, indent=1)
    indice_audio()
    print('empaquetado: escenarios, logo, indice, audio')


def indice_audio():
    """Solo audio/indice.json: los nombres del juego apuntan a los archivos de la banda sonora sintetizada y a la voz.
    Aparte de empaquetar() para poder rehacerlo sin volver a copiar escenarios ni exportar luchadores."""
    A = os.path.join(SALE, 'audio')
    m = lambda n: f'musica/{n}.m4a'
    f = lambda *ns: [f'sfx/{n}.m4a' for n in ns]
    v = lambda n: f'voz/{n}.m4a'
    sfx = {
        'golpe_debil': f('golpe_debil_1', 'golpe_debil_2', 'golpe_debil_3'),
        'golpe_fuerte': f('golpe_fuerte_1', 'golpe_fuerte_2', 'golpe_fuerte_3'),
        'golpe_poder': f('golpe_fuerte_2', 'golpe_super'), 'golpe_super': f('golpe_super'),
        'bloqueo': f('bloqueo'), 'barrida': f('barrida'), 'silbido': f('silbido_debil'), 'silbido_fuerte': f('silbido_fuerte'),
        'salto': f('salto'), 'aterriza': f('aterriza'), 'cae': f('cae'), 'mareado': f('mareo'), 'super': f('super_flash'),
        'lleno': f('lleno'), 'proyectil': f('poder_onda'), 'choque': f('choque'), 'carga': f('carga'),
        'elige': f('elige'), 'mueve': f('mueve'), 'ruleta': f('ruleta'),
        'poder_rick': f('poder_onda'), 'poder_sophie': f('poder_hojas'), 'poder_alana': f('poder_estrella'),
        'poder_steph': f('poder_pelota'), 'poder_thor': f('poder_ladrido'), 'ladrido': f('ladrido_corto'), 'trueno': f('poder_trueno'),
        # la voz del anunciador
        'round': [v('round_1')], 'round_1': [v('round_1')], 'round_2': [v('round_2')], 'round_3': [v('round_3')],
        'round_final': [v('round_final')], 'fight': [v('fight')], 'ko': [v('ko')], 'ko_golpe': f('ko'), 'perfect': [v('perfect')],
        'gana': [v('gana')], 'pierde': [v('pierde')], 'tiempo': [v('tiempo')], 'doble_ko': [v('doble_ko')], 'titulo': [v('titulo')],
        # lote E: los bonus (el carro, los barriles), el luchador oscuro y las voces nuevas del anunciador
        'golpe_lata': f('golpe_lata'), 'vidrio': f('vidrio'), 'madera': f('madera'), 'teletransporte': f('teletransporte'),
        'furia_oscura': f('furia_oscura'),
        'counter': [v('counter')], 'reversal': [v('reversal')], 'escape': [v('escape')], 'bonus_carro': [v('bonus_carro')],
        'bonus_barriles': [v('bonus_barriles')],
    }
    musica = {n: m(n) for n in ('titulo', 'selector', 'vs', 'victoria', 'caracas', 'hochiminh', 'bogota', 'japon', 'celestial',
                                'china', 'italia', 'usa', 'brasil', 'egipto', 'polo_norte')}
    faltan = [x for lst in list(sfx.values()) + [[y] for y in musica.values()] for x in lst if not os.path.exists(os.path.join(A, x))]
    if faltan:
        print('audio que falta:', faltan)
    json.dump({'musica': musica, 'sfx': sfx}, open(os.path.join(A, 'indice.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    quien = [x for x in sys.argv[1:] if not x.startswith('--')] or list(NOMBRES)
    for pid in quien:
        exportar(pid)
    efectos_comunes()
    empaquetar()
