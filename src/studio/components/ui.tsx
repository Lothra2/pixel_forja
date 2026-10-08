import type { Key } from '../i18n';

export function Seg({ label, value, set, opts, testid }: { label?: string; value: string; set: (v: string) => void; opts: [string, string][]; testid?: string }) {
  return (
    <div className="field">
      {label && <span>{label}</span>}
      <div className="seg" data-testid={testid}>
        {opts.map(([v, l]) => (
          <button key={v} className={v === value ? 'on' : ''} onClick={() => set(v)} aria-pressed={v === value}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export function Select({ label, value, set, opts, testid }: { label: string; value: string; set: (v: string) => void; opts: [string, string][]; testid?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)} data-testid={testid}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function Toggle({ label, on, set, testid }: { label: string; on: boolean; set: (v: boolean) => void; testid?: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} data-testid={testid} />
      {label}
    </label>
  );
}

export function Slider({ label, value, set, min, max, step = 0.01, fmt }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step?: number; fmt?: (v: number) => string }) {
  return (
    <label className="field">
      <span>{label} <output>{fmt ? fmt(value) : value}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(+e.target.value)} />
    </label>
  );
}

export type T = (k: Key) => string;

/** Cruceta de 8 direcciones (vista isométrica): cada botón es una dirección. */
const PAD: (string | null)[] = ['nw', 'back', 'ne', 'left', null, 'side', 'sw', 'front', 'se'];
const ARROW: Record<string, string> = { nw: '↖', back: '↑', ne: '↗', left: '←', side: '→', sw: '↙', front: '↓', se: '↘' };
export function DirPad<V extends string>({ label, value, set, name }: { label: string; value: V; set: (v: V) => void; name: (v: V) => string }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="dirpad" data-testid="view" role="group" aria-label={label}>
        {PAD.map((v, i) => v === null
          ? <span key={i} className="hub" aria-hidden>8</span>
          : <button key={v} className={v === value ? 'on' : ''} onClick={() => set(v as V)} aria-pressed={v === value} aria-label={name(v as V)} title={name(v as V)}>{ARROW[v]}</button>)}
      </div>
    </div>
  );
}

/** Logo: un yunque de pixeles con una chispa. */
export function Logo() {
  return (
    <svg viewBox="0 0 13 13" shapeRendering="crispEdges" aria-hidden>
      <rect x="9" y="1" width="1" height="1" fill="#ffd166" />
      <rect x="10" y="2" width="1" height="1" fill="#ff8a3d" />
      <rect x="8" y="2" width="1" height="1" fill="#ff8a3d" />
      <rect x="9" y="3" width="1" height="1" fill="#ff4f6d" />
      <rect x="1" y="5" width="11" height="2" fill="#ff8a3d" />
      <rect x="0" y="5" width="1" height="1" fill="#ff8a3d" />
      <rect x="1" y="5" width="11" height="1" fill="#ffb347" />
      <rect x="3" y="7" width="7" height="1" fill="#ff4f6d" />
      <rect x="5" y="8" width="3" height="2" fill="#c23a5a" />
      <rect x="3" y="10" width="7" height="2" fill="#8f7bff" />
      <rect x="3" y="10" width="7" height="1" fill="#b3a6ff" />
    </svg>
  );
}
