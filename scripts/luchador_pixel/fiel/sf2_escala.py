"""La escala pareja en la fuente: lo que el juego medía y corregía al cargar, ahora se aplica al bajar cada cuadro.

El juego (Street_Family_Fighter_2, src/logica/escalas.ts) midió cuadro a cuadro cuánto había que escalar cada uno para
que la cabeza quedara del tamaño de la guardia. Reescalar el pixel ya hecho le quita nitidez, así que aquí esa misma
tabla se pasa de (anim, cuadro) del juego a (hoja, cuadro) de Higgsfield y sf2.py la usa al bajar la hoja grande a su
pixel. Cuando una hoja sale corregida de aquí, el juego borra su línea.

Factor: menos de 1 es que el cuadro venía grande, más de 1 que venía chico. Un número vale para toda la anim, una
lista va cuadro por cuadro (en el orden de los pasos de la anim).
"""
import math
from sf2_juego import comunes, poderes

# la tabla del juego tal como quedó con el arte 0fa2506 (sin el mareado de Thor, que ya se corrigió aquí)
ESCALA_JUEGO = {
    'rick': {
        'puño_debil': [0.85, 0.85, 0.85, 1], 'puño_fuerte': 0.9, 'patada_debil': 0.85, 'patada_fuerte': 0.85,
        'agachado_puño_debil': 0.92, 'agachado_puño_fuerte': 0.9, 'salto': 0.85, 'salto_adelante': 0.85, 'aire_puño': 0.85,
        'aire_patada': 0.9, 'recibe_aire': [1, 1.15], 'cae': [1, 1.15, 1.15, 1.3, 1.3], 'levanta': [1.15, 1.15, 0.9, 0.85],
        'intro': 0.9, 'victoria': 0.9, 'poder1': 0.95, 'poder2': 0.9, 'poder3': [0.9, 0.9, 0.9, 0.9, 1],
    },
    'steph': {
        'avanza': 1.1, 'agacharse': 1.06, 'patada_fuerte': [0.9, 0.9, 0.9, 0.9, 1], 'aire_puño': 1.1,
        'recibe_alto': [1, 1.1, 1.1], 'recibe_aire': [1.15, 1.3], 'cae': [1.15, 1.3, 1.3, 1.45, 1.45],
        'levanta': [1.3, 1.3, 1.1, 1], 'mareado': 1.1,
    },
    'sophie': {
        'avanza': 0.92, 'retrocede': 0.95, 'agacharse': 0.95, 'agachado': 0.95, 'patada_debil': 0.9, 'patada_fuerte': 0.9,
        'aire_patada': 0.94, 'recibe_aire': [1, 1.1], 'cae': [1, 1.1, 1.1, 1.2, 1.2], 'levanta': [1.15, 1.15, 1, 0.95],
        'victoria': 0.94, 'intro': 0.94, 'poder1': 0.85, 'poder2': 0.9, 'poder3': 0.85,
    },
    'alana': {
        'retrocede': 0.9, 'bloqueo': 0.9, 'puño_fuerte': [1, 1, 0.9, 1],
        'recibe_aire': [1.3, 1.3], 'cae': [1.3, 1.3, 1.45, 1.6, 1.6], 'levanta': [1.15, 1.15, 0.85, 0.9],
        'mareado': 0.9, 'poder1': 0.85,
    },
    'thor': {
        'retrocede': 0.93, 'agacharse': 0.8, 'agachado': 0.85, 'bloqueo': 0.8, 'salto': [1, 0.8, 1, 1, 0.87],
        'puño_debil': [0.88, 0.85, 0.85, 0.9], 'puño_fuerte': [0.75, 0.8, 0.78, 1], 'patada_fuerte': [0.75, 0.78, 0.75, 0.8, 0.9],
        'agachado_puño_debil': 0.8, 'agachado_puño_fuerte': [0.8, 0.7, 0.7, 0.8], 'agachado_patada_fuerte': 1.25,
        'recibe_alto': [1, 0.8, 0.8], 'recibe_aire': [0.9, 0.9], 'cae': [0.9, 0.9, 1, 0.9, 1.15],
        'victoria': 0.85, 'poder3': [1, 0.93, 0.85, 0.85, 1],
    },
}


# lo que el juego midió con el lote F, cuadro a cuadro de la hoja (no de la anim): va encima de la tabla de arriba
EXTRA = {
    'rick': {'carrera': {0: 0.9}},
    'thor': {'carrera': {1: 0.92}},
    'sophie': {'avanza': {0: 0.92}, 'agarre': {0: 0.92}},
}


# lote G: la estatura. La tabla de arriba medía solo la cabeza y en patadas, saltos y caídas dejaba el cuerpo corto
# (Rick "con enanismo"). El juego midió el largo de cabeza a pie por dentro de la silueta y esto va encima, por anim
ESTATURA = {
    'rick': {'intro': [1.08, 1.12, 1.1, 1.18], 'victoria': 1.1, 'patada_fuerte': [1.08, 1.08, 1, 1, 1], 'cae': [1, 1, 1.1, 1.14, 1.29],
             'salto': [1.05, 1, 1.12, 1.12, 1], 'salto_adelante': [1, 1.25, 1.25, 1.25, 1.05], 'aire_puño': 1.12,
             'aire_patada': [1.12, 1.05], 'levanta': [1.12, 1, 1.05, 1]},
    'steph': {'intro': [1, 1, 1, 1.05], 'victoria': [1, 1, 1.1, 1], 'patada_fuerte': [1.08, 1.08, 1.05, 1.08, 1], 'recibe_alto': 0.89, 'mareado': 0.92, 'carrera': 1.08,
              'cae': [1, 1, 1.17, 1.14, 1.18], 'salto': [1, 1, 1.15, 1.15, 1], 'salto_adelante': [1, 1.2, 1.2, 1.2, 1],
              'aire_patada': [1.12, 1]},
    'sophie': {'victoria': [1, 1.07, 1.07, 1.07], 'puño_fuerte': 0.92, 'agarrado': 0.92, 'bloqueo': 0.91, 'cae': [1, 1, 1, 1.1, 1],
               'patada_debil': [1, 1.06, 1.06, 1.06], 'salto': [1, 1, 1, 1, 0.92], 'salto_adelante': [1, 1.15, 1.1, 1.1, 1]},
    'alana': {'victoria': [1, 1.12, 1, 1.08], 'patada_debil': 1.04, 'cae': [1, 1, 1.11, 1.1, 1.1], 'salto_adelante': [1, 1.12, 1.12, 1.12, 1]},
    'thor': {'intro': [1, 0.92, 1, 1], 'recibe_alto': [1, 1.1, 1.1], 'mareado': 0.95, 'agarre': 0.91, 'recibe_aire': 1.1,
             'cae': [1.15, 1, 1.2, 1.2, 1], 'salto_adelante': [1, 1.1, 1.1, 1.1, 1]},
    # la Abuela, medida por el juego con el arte de 1de73a8 (acostada salía al 60 %)
    'abuela': {'cae': [1.3, 1.35, 1.5, 1.55, 1.55], 'recibe_aire': [1.3, 1.4], 'victoria': [0.85, 0.85, 0.85, 0.8],
               'levanta': [0.85, 0.85, 0.85, 0.83], 'poder3': [1, 0.87, 0.9, 0.92, 0.92], 'salto': [1, 1, 1.1, 1.1, 1],
               'salto_adelante': [1, 1.2, 1.2, 1.15, 1]},
    # Tío Bao, medido por el juego con el arte de 00fa071 (acostado medía 55 % de su estatura)
    # La tabla del juego era [1.5, 1.6, 1.65, 1.7, 1.7] para cae y [1, 1, 1.1, 1.1, 1] para salto, pero desde el
    # separador nuevo (manchas pegadas repartidas) la caja de esas hojas cambió y la escala base con ella: estos
    # números ya traen esa diferencia, medidos para que el resultado quede igual a lo que pidió el juego
    'bao': {'cae': [1.64, 1.43, 1.815, 1.85, 1.85], 'recibe_aire': [1.64, 1.43], 'intro': [1, 0.92, 1, 1],
            'poder3': [1, 0.87, 0.87, 1, 1], 'salto': [0.885, 1, 1.11, 1.11, 1], 'salto_adelante': [1, 1.2, 1.2, 1.15, 1]},
}
# la patada débil de Rick no va en la tabla: se redibujó con las piernas de largo normal (y la fuerte también, sus
# factores de cabeza ya no aplican a la hoja nueva)
REDIBUJADAS = {'rick': {'patada_debil', 'patada_fuerte'}}


def _por_hoja(pid, tabla, anims):
    junta = {}
    for nombre, v in tabla.get(pid, {}).items():
        a = anims.get(nombre)
        if a is None:
            continue
        for k, p in enumerate(a['pasos']):
            f = v if not isinstance(v, list) else (v[k] if k < len(v) else 1)
            junta.setdefault(p['hoja'], {}).setdefault(p['i'], []).append(f)
    return {h: {i: math.exp(sum(map(math.log, fs)) / len(fs)) for i, fs in cs.items()} for h, cs in junta.items()}


def factores(pid):
    """{hoja: {cuadro: factor}}. Si un cuadro de la hoja lo usan dos anims con factores distintos, va la media
    geométrica de los dos."""
    anims = {**comunes(), **poderes(pid)}
    out = _por_hoja(pid, ESCALA_JUEGO, anims)
    for tabla in (EXTRA, ):
        for h, cs in tabla.get(pid, {}).items():
            for i, f in cs.items():
                out.setdefault(h, {})[i] = out.get(h, {}).get(i, 1) * f
    for h, cs in _por_hoja(pid, ESTATURA, anims).items():
        for i, f in cs.items():
            out.setdefault(h, {})[i] = out.get(h, {}).get(i, 1) * f
    for h in REDIBUJADAS.get(pid, ()):
        out.pop(h, None)
    return out


if __name__ == '__main__':
    for pid in ESCALA_JUEGO:
        print(pid, {h: {i: round(f, 3) for i, f in sorted(cs.items())} for h, cs in factores(pid).items()})
