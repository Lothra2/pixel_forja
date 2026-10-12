import type { ObliqueLayout } from './layout';
import { boxesOf } from './layout';
import { NOMBRES, USO_VIETNAM, VIETNAM_MANANA, type Paleta } from './paleta';

/**
 * Ficha de arte de un escenario: la puerta 1 del pedido. Paleta de 24 colores, de 8 a 12 elementos icónicos y los
 * detalles de vida, más qué dibujo va en cada caja del layout. Se arma desde el layout y el estilo del país.
 */
export interface Icono { id: string; nombre: string; donde: string }
export interface Vida { id: string; detalle: string }
export interface FichaArte {
  id: string;
  nombre: string;
  estilo: string;
  hora: string;
  paleta: { nombre: string; hex: string; uso: string }[];
  iconos: Icono[];
  vida: Vida[];
  cajas: { tipo: string; medida: string; dibujo: string; cuantas: number }[];
  letreros: string[];
}

interface Estilo {
  paleta: Paleta;
  uso: Record<string, string>;
  iconos: Icono[];
  vida: Record<string, string>;
  cajas: Record<string, string>;
  letreros: string[];
}

const VIETNAM: Estilo = {
  paleta: VIETNAM_MANANA,
  uso: USO_VIETNAM,
  iconos: [
    { id: 'casa_tubo', nombre: 'Casas tubo angostas de 3 a 5 pisos', donde: 'cerca: la fila de fachadas de todo el tramo' },
    { id: 'tienda', nombre: 'Planta baja con tienda: tạp hóa, phở, café, taller de motos', donde: 'cerca, con letrero de texto real' },
    { id: 'reja', nombre: 'Rejas plegables (cửa xếp)', donde: 'cerca, en las casas cerradas' },
    { id: 'altar', nombre: 'Altar de la tierra con incienso', donde: 'cerca, al pie de las casas' },
    { id: 'cables', nombre: 'Cables enredados y postes de luz', donde: 'cerca y frente: de poste a poste y a las casas' },
    { id: 'motos', nombre: 'Motos tipo Cub paradas', donde: 'caja moto_estacionada y garajes' },
    { id: 'sillas', nombre: 'Sillas y mesas plásticas rojas y azules', donde: 'caja mesas_plasticas y los cafés' },
    { id: 'banhmi', nombre: 'Carrito de bánh mì', donde: 'caja puesto_banhmi' },
    { id: 'ba_gac', nombre: 'Xe ba gác, el triciclo de carga', donde: 'caja carro' },
    { id: 'balcones', nombre: 'Balcones con matas, buganvilla, aires y ropa tendida', donde: 'cerca, pisos de arriba' },
    { id: 'tanques', nombre: 'Tanques de agua de acero', donde: 'techos y la caja tanque_agua' },
    { id: 'ciudad', nombre: 'Landmark 81 y Bitexco en la bruma', donde: 'lejos' },
  ],
  vida: {
    motos_fondo: 'Motos que cruzan al fondo del hẻm, de un lado al otro',
    ropa_tendida: 'Ropa tendida que se mueve con el viento, 2 cuadros',
    palomas: 'Palomas paradas en los cables y el piso, que salen volando',
    cables_viento: 'Cables que se mecen apenas, 2 cuadros',
    incienso: 'Humo del incienso de los altares',
  },
  cajas: {
    carro: 'Xe ba gác: plataforma de tablas a la altura de la caja, ruedas abajo y la moto adelante',
    puesto_banhmi: 'Carrito de bánh mì: vitrina con los panes y el letrero BÁNH MÌ',
    cajas: 'Guacales verdes de cerveza. Con dos capas, cajas de anime arriba',
    moto_estacionada: 'Dos motos Cub, con el asiento a la altura de la caja',
    mesas_plasticas: 'Bajas: mesitas azules con banquitos. Altas: columnas de banquitos rojos',
    tanque_agua: 'Tanque de acero parado, con anillos y tapa',
    kiosco: 'Kiosco de lámina de tarjetas de teléfono (SIM THẺ)',
    muro_bajo: 'Muro repellado con el ladrillo pelado y moho abajo',
    muro_alto: 'Muro con tejas y vidrios rotos arriba, y el portón de hierro plegado contra el frente',
  },
  letreros: ['TẠP HÓA', 'PHỞ 24', 'CÀ PHÊ SỮA ĐÁ', 'SỬA XE', 'BÁNH MÌ', 'CƠM TẤM', 'GỘI ĐẦU', 'NHÀ THUỐC', 'SIM THẺ'],
};

const ESTILOS: Record<string, Estilo> = { vietnam: VIETNAM };

/** El estilo de fachada que va con cada país. */
export const estiloDe = (L: ObliqueLayout) => (L.pais === 'vietnam' ? 'vietnam' : L.pais);

export function fichaArte(L: ObliqueLayout): FichaArte {
  const estilo = estiloDe(L), E = ESTILOS[estilo];
  if (!E) throw new Error(`El estilo "${estilo}" todavía no tiene ficha. Hoy está: ${Object.keys(ESTILOS).join(', ')}.`);
  const cajas = new Map<string, { medidas: string[]; cuantas: number }>();
  for (const b of boxesOf(L)) {
    const k = b.tipo ?? b.lista, m = `${b.w} x ${b.d}, z ${b.z}`;
    const c = cajas.get(k) ?? { medidas: [], cuantas: 0 };
    c.cuantas++;
    if (!c.medidas.includes(m)) c.medidas.push(m);
    cajas.set(k, c);
  }
  const vida = [...L.vida, 'incienso'].filter((v, i, a) => a.indexOf(v) === i).map((id) => ({ id, detalle: E.vida[id] ?? 'Sin dibujo todavía: se propone en la ficha' }));
  return {
    id: L.id,
    nombre: L.nombre ?? L.id,
    estilo,
    hora: L.hora,
    paleta: NOMBRES.map((n) => ({ nombre: n, hex: E.paleta[n], uso: E.uso[n] })),
    iconos: E.iconos,
    vida,
    cajas: [...cajas].map(([tipo, c]) => ({ tipo, medida: c.medidas.join(' y '), cuantas: c.cuantas, dibujo: E.cajas[tipo] ?? 'Muro genérico del estilo' })),
    letreros: E.letreros,
  };
}

/** La ficha en Markdown, para `ficha_arte.md`. */
export function fichaMarkdown(f: FichaArte): string {
  const out: string[] = [];
  out.push(`# Ficha de arte: ${f.id}`, '');
  out.push(`${f.nombre}. Estilo \`${f.estilo}\`, hora \`${f.hora}\`.`, '');
  out.push('## Paleta: 24 colores', '', 'Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.', '');
  out.push('| Color | Hex | Para qué |', '|---|---|---|');
  for (const c of f.paleta) out.push(`| \`${c.nombre}\` | \`${c.hex}\` | ${c.uso} |`);
  out.push('', `## Elementos icónicos (${f.iconos.length})`, '');
  out.push('| Elemento | Dónde va |', '|---|---|');
  for (const i of f.iconos) out.push(`| ${i.nombre} | ${i.donde} |`);
  out.push('', `## Vida (${f.vida.length})`, '');
  for (const v of f.vida) out.push(`- \`${v.id}\`: ${v.detalle}.`);
  out.push('', '## Cada caja del layout', '', 'El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.', '');
  out.push('| Tipo | Medida | Cuántas | Dibujo |', '|---|---|---|---|');
  for (const c of f.cajas) out.push(`| \`${c.tipo}\` | ${c.medida} | ${c.cuantas} | ${c.dibujo} |`);
  out.push('', '## Letreros', '', `Texto real y corto, con los acentos: ${f.letreros.map((t) => `"${t}"`).join(', ')}.`, '');
  return out.join('\n');
}
