/**
 * Catálogo de los efectos de pixelfx mudados al taller gótico: qué efecto, con qué paleta, cómo se orienta y para qué
 * sirve en Réquiem de Ceniza. El adaptador está en efectos_pfx.ts.
 *
 * Los usos nombran las habilidades del juego (juego/src/datos/clases.ts), los estados, las zonas por acto
 * (juego/src/mundo/actos.ts y actos67.ts), el botín, las muertes y las cinemáticas.
 */
import type { CfgPfx } from './efectos_pfx';
import { rampa, tramo } from './efectos_pfx_paletas';

/** Chispas de forja: brasa clara que se apaga en rojo (para golpes de acero). */
const CHISPAS = () => tramo('fuego', 4, 1, 0.45);
/** Piedra del piso y de los escombros (pixelfx la tenía violeta). */
export const PIEDRA = '#3a3431';

export const CATALOGO_PFX: CfgPfx[] = [
  // ============================================================ fuego
  {
    id: 'fx_bola_fuego', origen: 'fire/fireball', nombre: ['Bola de fuego', 'Fireball'], categoria: 'fuego', elemento: 'fuego',
    dir: { modo: 'vuelo' }, ancla: [0, 21], opciones: { palette: rampa('fuego', 9) },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['bola_fuego', 'saeta_ignea'], nota: 'el proyectil en vuelo; al pegar, fx_explosion_chica' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['virote_dragon'] },
      { tipo: 'monstruo', monstruos: ['brujo_diablillo', 'cultista'], nota: 'bola de fuego de los lanzadores' },
    ],
  },
  // ============================================================ hielo
  {
    id: 'fx_nova_escarcha', origen: 'ice/frost-nova', nombre: ['Nova de escarcha', 'Frost nova'], categoria: 'hielo', elemento: 'hielo', capa: 'piso', enLanzador: true,
    opciones: { palette: rampa('hielo', 8) },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['nova_escarcha', 'edad_hielo'], nota: 'centrada en la arcanista; el anillo de cristales llega a ~2 personas de radio' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['canto_invierno'] },
      { tipo: 'monstruo', monstruos: ['gigante_helado', 'espectro'], nota: 'pisotón o grito helado del acto 4' },
    ],
  },
  // ============================================================ cuerpo a cuerpo
  {
    id: 'fx_tajo_espada', origen: 'melee/sword-slash', nombre: ['Tajo de espada', 'Sword slash'], categoria: 'cuerpo_a_cuerpo', elemento: 'acero',
    dir: { modo: 'vuelo', pivote: [0, -22], giro: 1 }, detrasEn: ['no', 'n', 'ne'],
    opciones: { palette: rampa('acero', 7), sparks: CHISPAS() },
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['celo', 'corte_sello'], nota: 'el arco del tajo delante del templario, en la dirección del golpe' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['tajo_salvaje', 'doble_golpe'] },
      { tipo: 'monstruo', monstruos: ['esqueleto', 'caballero_muerto', 'bandido'], nota: 'tajo de los espadachines' },
    ],
  },
  // ============================================================ estados
  {
    id: 'fx_envenenado', origen: 'status/poisoned', nombre: ['Envenenado', 'Poisoned'], categoria: 'estado', elemento: 'veneno',
    opciones: { palette: rampa('veneno', 8), veins: '#10180a' },
    cuerpo: { quitar: 'silueta', tinte: { color: '#5c7c1e', fuerza: 0.35, nota: 'teñir el sprite del envenenado con pulso lento' } },
    uso: [
      { tipo: 'estado', estado: 'veneno', nota: 'en bucle sobre el afectado mientras dure el veneno' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['virote_veneno', 'frasco_peste', 'miasma'], nota: 'sobre los que alcanza' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['toque_putrido'] },
    ],
  },
  // ============================================================ clima
  {
    id: 'fx_lluvia', origen: 'weather/rain', nombre: ['Lluvia', 'Rain'], categoria: 'clima', elemento: 'agua', capa: 'pantalla',
    opciones: { palette: rampa('agua', 8) }, gradacion: { tope: 0.3 },
    uso: [
      { tipo: 'clima', actos: [1], zonas: ['a1_refugio', 'a1_paramo', 'a1_bosque'], nota: 'las zonas con lluvia del acto 1' },
      { tipo: 'clima', actos: [3], zonas: ['a3_muelle', 'a3_selva', 'a3_pantano'] },
      { tipo: 'clima', actos: [6], zonas: ['a6_costa', 'a6_barrio1', 'a6_barrio2'] },
    ],
  },
  // ============================================================ criaturas
  {
    id: 'fx_murcielago', origen: 'critters/bat', nombre: ['Murciélago', 'Bat'], categoria: 'criaturas', elemento: 'carne',
    ancla: [0, 30], opciones: { palette: tramo('ceniza', 7, 0, 0.8), eyes: ['#2a0303', '#5a0808', '#9a2418', '#d08050'] },
    uso: [
      { tipo: 'ambiente', zonas: ['a1_cripta', 'a1_cata1', 'a1_guarida', 'a2_escarabajos', 'a3_nido'], nota: 'bandadas que cruzan el techo de las mazmorras' },
      { tipo: 'cinematica', nota: 'murciélagos que salen de la cripta en las tomas de entrada' },
    ],
  },
];
