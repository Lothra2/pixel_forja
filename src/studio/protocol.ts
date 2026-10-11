import type {
  BrushStroke, HeadSpec, ZoneEdit, Ficha, HumanFicha, CellSize, QAReport, BuildReport, Species, Proportions, ViewName, FloorPropKind,
  ExportKind, ExportPlan, Variant, ImageMode, Avatar, AvatarPart, PhotoColors, AnimEvent,
} from '../engine/index';

export interface AnalyzeParams {
  /** cuerpo entero o busto; sin valor, lo detecta el motor */
  mode?: ImageMode;
  bgTolerance: number;
  bgStrokes: BrushStroke[];
  head?: HeadSpec;
  zoneEdits: ZoneEdit[];
}

export interface AnalyzeResult {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  mask: Uint8Array;
  zone: Uint8Array;
  head: HeadSpec;
  headGuessed: boolean;
  mode: ImageMode;
}

export interface FrameSet {
  name: string;
  fps: number;
  cell: CellSize;
  view: ViewName;
  loop: boolean;
  /** con qué perfil de movimiento se dibujó */
  profile: 'classic' | 'premium';
  /** pasos y golpes (premium), con el cuadro donde caen */
  events?: { type: AnimEvent['type']; frame: number }[];
  /** cuánto sube el juego el sprite en cada cuadro (saltos que no caben en la celda) */
  rise?: number[];
  /** datos por cuadro, desde el pivote, para el interruptor "Ver datos" (los mismos que exporta el kit) */
  data?: ClipData;
  frames: Uint8ClampedArray[];
}

type Pt = [number, number];
export interface ClipData {
  cajas: ([number, number, number, number] | null)[];
  /** solo la persona, sin implementos ni efectos (el hurtbox) */
  cuerpo?: ([number, number, number, number] | null)[];
  /** dónde se apoya lo que carga */
  carga?: (Pt | null)[];
  /** el arma en la mano: agarre, ángulo y si va detrás */
  arma?: ([number, number, number, number] | null)[];
  manos?: [Pt, Pt][];
  cabeza?: Pt[];
  pies?: [Pt, Pt][];
  /** de dónde sale el golpe o la suelta en su cuadro */
  puntos: { frame: number; at: Pt }[];
}

export type ImagePayload = { png?: Uint8Array; rgba?: Uint8ClampedArray; w?: number; h?: number };

export type Request =
  | ({ type: 'load' } & ImagePayload)
  | ({ type: 'loadExtra'; view: 'side' | 'back' } & ImagePayload)
  | { type: 'clearExtra'; view: 'side' | 'back' }
  | { type: 'analyze'; params: AnalyzeParams }
  | { type: 'build'; params: AnalyzeParams; name: string; outfit?: Partial<HumanFicha['outfit']>; face?: Partial<HumanFicha['face']>; proportions?: Proportions }
  | { type: 'buildAnimal'; name: string; species: Species; bgTolerance: number; bgStrokes: BrushStroke[] }
  | { type: 'render'; ficha: Ficha; cell: CellSize; anim: string; view: ViewName; props: boolean; key?: string; held?: { kind: FloorPropKind; variant?: number } }
  | { type: 'variants'; ficha: HumanFicha; params: AnalyzeParams | null; seed: number; n: number }
  | { type: 'export'; ficha: Ficha; kind: ExportKind; plan: ExportPlan; force: boolean }
  | { type: 'qa'; ficha: Ficha; plan: ExportPlan }
  | { type: 'avatarThumbs'; key: string; avatar: Avatar; part: AvatarPart }
  | ({ type: 'photoColors' } & ImagePayload);

export interface Thumb { id: string; w: number; h: number; rgba: Uint8ClampedArray }

export type Response =
  | { type: 'loaded'; w: number; h: number }
  | { type: 'analyzed'; result: AnalyzeResult }
  | { type: 'built'; ficha: Ficha; report?: BuildReport }
  | { type: 'rendered'; clip: FrameSet; qa: QAReport }
  | { type: 'variants'; variants: Variant[]; thumbs: Uint8ClampedArray[] }
  | { type: 'exported'; files: { name: string; bytes: Uint8Array; mime: string }[] }
  | { type: 'qa'; reports: QAReport[]; missing: string[] }
  | { type: 'avatarThumbs'; part: AvatarPart; thumbs: Thumb[] }
  | { type: 'photoColors'; colors: PhotoColors }
  | { type: 'error'; message: string };
