/** El módulo de pelea estilo SF2: el luchador por volúmenes, el muñeco de pixel a mano, sus golpes y los datos por cuadro. */
export { type LuchadorFicha, type Rampa6, type Ropa, type TorsoRopa, type PiernasRopa, type PiesRopa, rampa6, RICK_LUCHADOR, SOPHIE_LUCHADORA, TRAJES } from './ficha';
export { type Pose as PoseLuchador, type Medidas as MedidasLuchador, type Articulaciones as ArticulacionesLuchador, medidas as medidasLuchador, resolver as resolverLuchador } from './esqueleto';
export { pintarLuchador, ropaDe, type CuadroLuchador, type OpcionesPintar } from './render';
export { type AnimLuchador, type CuadroAnim, type Fase as FaseGolpe, con as conPose, GUARDIA, animGuardia, animPuñoFuerte, animRecibeAlto, animVictoria, animAvanza, animOnda, animBloqueo, animCae, entre as entrePoses, ANIMS_PILOTO, ANIMS_RICK } from './golpes';
export { pintarAnim, chispaGolpe, dibujarCajas, type AnimRender, type DatosCuadro, type Caja as CajaPelea, type Zona as ZonaGolpe } from './datos';
export { GUARDIA_SOPHIE, ANIMS_SOPHIE, animGuardiaSophie, animSaltoSophie, animPatadaVoladora, animMilPatadas, animRemolino, animRecibeSophie, animVictoriaSophie } from './golpesSophie';
export { ESCENARIO, CAPAS_ESCENARIO, capasEscenario, escenarioJapones, type CapaEscenario } from './escenario';
export { ondaEnergia, chispaBloqueo, vientoRemolino, polvoCaida } from './efectos';
export { girar as girarLuchador } from './esqueleto';
export { componerPixel, pintarPixel, pintarAnimPixel, type MunecoPixel, type PiezaPixel, type PosePixel, type ParchePixel, type CuadroPixel, type LienzoPixel, type AnimPixel, type CuadroAnimPixel } from './pixel/muneco';
export { RICK_PIXEL, RICK_CARAS } from './pixel/rick';
export { SOPHIE_PIXEL } from './pixel/sophie';
export { apuntar as apuntarPixel, ANIMS_RICK_PIXEL, ANIMS_SOPHIE_PIXEL } from './pixel/golpesPixel';
export { VISTA as VISTA_PARALLAX, prepararEscenario, escenarioDesdeManifest, pintarFondo as pintarFondoParallax, pintarFrente as pintarFrenteParallax, petalos as petalosParallax, seguirCamara, factorFila, estadoFarol, type CapaParallax, type EscenarioParallax, type ManifestEscenario } from './pixel/parallax';
