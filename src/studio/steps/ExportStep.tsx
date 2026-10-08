import { useEffect, useMemo, useState } from 'react';
import { type Ficha, type CellSize, type ExportKind, type ExportPlan, type ViewName, type QAReport, animsFor, isHuman, VIEW_NAMES } from '../../engine/index';
import type { Key } from '../i18n';
import { Seg, Toggle, type T } from '../components/ui';

interface Props {
  t: T;
  ficha: Ficha;
  cell: CellSize;
  qa: (plan: ExportPlan) => Promise<{ reports: QAReport[]; missing: string[] } | null>;
  doExport: (kind: ExportKind, plan: ExportPlan, force: boolean) => Promise<void>;
  artifact: boolean;
}

const KINDS: ExportKind[] = ['sheet', 'ffgg', 'aseprite', 'godot', 'unity', 'frames', 'gif', 'ficha'];

export function ExportStep({ t, ficha, cell: cell0, qa, doExport, artifact }: Props) {
  const all = useMemo(() => animsFor(ficha), [ficha]);
  const packs = useMemo(() => [...new Set(all.map((a) => a.pack))], [all]);
  const human = isHuman(ficha);
  const [sel, setSel] = useState<Set<string>>(() => new Set(human ? ['basic', 'football'] : ['animal']));
  const [views, setViews] = useState<Set<ViewName>>(new Set(['side']));
  const [cell, setCell] = useState<CellSize>(cell0);
  const [props, setProps] = useState(true);
  const [kind, setKind] = useState<ExportKind>(human ? 'sheet' : 'sheet');
  const [force, setForce] = useState(false);
  const [scale, setScale] = useState(1);
  const [report, setReport] = useState<{ reports: QAReport[]; missing: string[] } | null>(null);
  const plan: ExportPlan = useMemo(
    () => ({ cell, anims: all.filter((a) => sel.has(a.pack)).map((a) => a.name), views: human ? VIEW_NAMES.filter((v) => views.has(v)) : ['side'], props, scale: kind === 'sheet' ? scale : 1 }),
    [cell, all, sel, views, props, human, kind, scale],
  );
  const usesPlan = kind !== 'ffgg' && kind !== 'ficha';

  useEffect(() => {
    if (!usesPlan || !plan.anims.length || !plan.views.length) { setReport(null); return; }
    let live = true;
    const id = setTimeout(() => qa(plan).then((r) => live && r && setReport(r)), 250);
    return () => { live = false; clearTimeout(id); };
  }, [plan, usesPlan, qa]);

  const bad = report?.reports.filter((r) => !r.ok) ?? [];
  const toggle = <V,>(s: Set<V>, v: V) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; };

  return (
    <div className="exports">
      <div className="field">
        <span>{t('exportFormat')}</span>
        <div className="formats">
          {KINDS.filter((k) => human || k !== 'ffgg').map((k) => (
            <label key={k} className={`radio ${k === kind ? 'on' : ''}`}>
              <input type="radio" name="fmt" checked={k === kind} onChange={() => setKind(k)} data-testid={`fmt-${k}`} />
              {t(`fmt_${k}` as Key)}
            </label>
          ))}
        </div>
      </div>
      {usesPlan && (
        <>
          <div className="field">
            <span>{t('exportWhat')}</span>
            <div className="chips">
              {packs.map((p) => (
                <button key={p} className={`chip ${sel.has(p) ? 'on' : ''}`} onClick={() => setSel(toggle(sel, p))} data-testid={`pack-${p}`}>
                  {t(`pack_${p}` as Key)} · {all.filter((a) => a.pack === p).length}
                </button>
              ))}
              <button className="chip" onClick={() => setSel(new Set(packs))}>{t('selectAll')}</button>
            </div>
          </div>
          {human && (
            <div className="field">
              <span>{t('view')}</span>
              <div className="chips">
                {VIEW_NAMES.map((v) => (
                  <button key={v} className={`chip ${views.has(v) ? 'on' : ''}`} onClick={() => setViews(toggle(views, v))}>{t(`view_${v}` as Key)}</button>
                ))}
              </div>
            </div>
          )}
          <Seg label={t('size')} value={String(cell)} set={(v) => setCell(+v as CellSize)} opts={[['32', '32'], ['48', '48'], ['64', '64']]} />
          {kind === 'sheet' && <Seg label={t('sheetScale')} value={String(scale)} set={(v) => setScale(+v)} opts={[['1', '1x'], ['2', '2x'], ['4', '4x']]} testid="sheet-scale" />}
          {human && <Toggle label={t('props')} on={props} set={setProps} />}
          <div className="qa-sum" data-testid="qa-summary">
            <strong>{t('qaSummary')}:</strong>{' '}
            {report ? (bad.length ? <span className="bad">{bad.length}/{report.reports.length} {t('qaErrors')}: {bad.slice(0, 6).map((b) => b.clip).join(', ')}</span> : <span className="ok">{t('qaAllOk')} · {report.reports.length}</span>) : '…'}
          </div>
          {bad.length > 0 && <Toggle label={t('force')} on={force} set={setForce} />}
        </>
      )}
      {artifact && <p className="error">{t('noDownloads')}</p>}
      <button
        className="btn"
        data-testid="export-go"
        disabled={(usesPlan && (!plan.anims.length || !plan.views.length)) || (bad.length > 0 && !force)}
        onClick={() => doExport(kind, plan, force)}
      >{t('download')} · {t(`fmt_${kind}` as Key)}</button>
      <p className="muted small">{t('exportHelp')}</p>
    </div>
  );
}
