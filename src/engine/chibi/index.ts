/** El segmento chibi de PixelForja: muñecos por piezas a 32 y 48 px, sus animaciones, efectos, familia y escenarios. */
export * from './look';
export * from './metrics';
export { pintarCabeza, type Vista, type Gesto } from './head';
export { pintarPose, POSE_BASE, cajaGolpe, type Pose, type Render, type Parte, type Mano } from './body';
export * from './clips';
export * from './anim';
export * from './fx';
export * from './family';
export * from './export';
export { pintarPerro, clipsPerro, type PosePerro } from './dog';
export * from './stage/assets';
export * from './stage/stages';
export { pintarMolde, clipsVideo, escala2x, MOLDES, CELDA_VIDEO, PISO_VIDEO, CLIPS_VIDEO_NOMBRES } from './video';
export { pintarCabezaVideo } from './cabezaVideo';
export { paint } from './paintExport';
export { ESTILOS, ESTILO_DE, movimiento, PROYECTILES, DANO, type EstiloId, type Boton, type Estilo } from './estilos';
