import { registrar } from '../objeto';
import { pintarPortal, pintarLuzPortal, piezasPortal, TIPOS_PORTAL, CUADROS_PORTAL, type TipoPortal } from '../portales';

/**
 * Portales vivos (portales.ts): `com_portal_vivo` es el portal (arco gótico o grieta, vórtice, chispas y la luz sobre
 * las piedras) y `com_portal_luz` la luz que derrama en el piso, aparte, para sumar en 'screen' debajo de todo.
 * Variantes: pueblo (cálido, la vuelta a casa), mazmorra (grieta fría) e infierno (arco roto, rojo).
 */
registrar(
  {
    id: 'com_portal_vivo', nombre: ['Portal vivo', 'Living portal'], tema: 'comun', variantes: [...TIPOS_PORTAL], cuadros: CUADROS_PORTAL, t: 3,
    huella: [2, 1], bloquea: false,
    armar: (v) => piezasPortal(v as TipoPortal),
    pintar: (v, f, seed) => pintarPortal(v as TipoPortal, f, seed),
  },
  {
    id: 'com_portal_luz', nombre: ['Luz del portal en el piso', 'Portal floor light'], tema: 'comun', variantes: [...TIPOS_PORTAL], cuadros: CUADROS_PORTAL, t: 3,
    huella: [1, 1], bloquea: false, plano: true,
    armar: (_v, _f, a) => [a.cilindro(0, 0, -0.5, 4, 0.4, { mat: 'magia' })],
    pintar: (v, f) => pintarLuzPortal(v as TipoPortal, f),
  },
);
