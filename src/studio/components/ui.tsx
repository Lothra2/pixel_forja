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
