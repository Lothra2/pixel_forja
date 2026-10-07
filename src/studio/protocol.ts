import type { BrushStroke, HeadSpec, ZoneEdit, Ficha, CellSize, QAReport, BuildReport } from '../engine/index';

export interface AnalyzeParams {
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
}

export interface FrameSet {
  name: string;
  fps: number;
  cell: CellSize;
  frames: Uint8ClampedArray[];
}

export type Request =
  | { type: 'load'; png?: Uint8Array; rgba?: Uint8ClampedArray; w?: number; h?: number }
  | { type: 'analyze'; params: AnalyzeParams }
  | { type: 'build'; params: AnalyzeParams; name: string; outfit?: Partial<Ficha['outfit']>; face?: Partial<Ficha['face']> }
  | { type: 'render'; ficha: Ficha; cell: CellSize }
  | { type: 'export'; ficha: Ficha; cell: CellSize; kind: 'sheet' | 'ffgg' | 'gif'; anim?: string };

export type Response =
  | { type: 'loaded'; w: number; h: number }
  | { type: 'analyzed'; result: AnalyzeResult }
  | { type: 'built'; ficha: Ficha; report: BuildReport }
  | { type: 'rendered'; clips: FrameSet[]; qa: QAReport[] }
  | { type: 'exported'; files: { name: string; bytes: Uint8Array; mime: string }[] }
  | { type: 'error'; message: string };
