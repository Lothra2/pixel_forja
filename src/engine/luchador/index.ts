/** El módulo de pelea estilo SF2: el luchador por volúmenes, sus golpes y los datos por cuadro. */
export { type LuchadorFicha, type Rampa6, type Ropa, type TorsoRopa, type PiernasRopa, type PiesRopa, rampa6, RICK_LUCHADOR, TRAJES } from './ficha';
export { type Pose as PoseLuchador, type Medidas as MedidasLuchador, type Articulaciones as ArticulacionesLuchador, medidas as medidasLuchador, resolver as resolverLuchador } from './esqueleto';
export { pintarLuchador, ropaDe, type CuadroLuchador, type OpcionesPintar } from './render';
export { type AnimLuchador, type CuadroAnim, type Fase as FaseGolpe, con as conPose, GUARDIA, animGuardia, animPuñoFuerte, animRecibeAlto, animVictoria, ANIMS_PILOTO } from './golpes';
export { pintarAnim, chispaGolpe, dibujarCajas, type AnimRender, type DatosCuadro, type Caja as CajaPelea, type Zona as ZonaGolpe } from './datos';
