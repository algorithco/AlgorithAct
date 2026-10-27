import { ArrowLeft, MousePointer2, Sparkles } from 'lucide-react';
import { useRef } from 'react';

export type WorkspaceMode = 'manual' | 'ai';

export function WorkspaceModes({ value, onChange }: { value: WorkspaceMode; onChange: (mode: WorkspaceMode) => void }) {
  const manualRef = useRef<HTMLButtonElement>(null);
  const aiRef = useRef<HTMLButtonElement>(null);
  return <div className="workspace-modes" role="tablist" aria-label="Yaratish rejimi" onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'manual' : event.key === 'End' ? 'ai' : value === 'manual' ? 'ai' : 'manual';
    onChange(next);
    (next === 'manual' ? manualRef : aiRef).current?.focus();
  }}>
    <button ref={manualRef} id="manual-tab" role="tab" aria-selected={value === 'manual'} aria-controls="manual-workspace" tabIndex={value === 'manual' ? 0 : -1} onClick={() => onChange('manual')}><MousePointer2 size={18}/>Manual</button>
    <button ref={aiRef} id="ai-tab" role="tab" aria-selected={value === 'ai'} aria-controls="ai-workspace" tabIndex={value === 'ai' ? 0 : -1} onClick={() => onChange('ai')}><Sparkles size={18}/>AI<span className="mode-soon">Tez kunda</span></button>
  </div>;
}

export function AIWorkspace({ hidden, onManual }: { hidden: boolean; onManual: () => void }) {
  return <main className="ai-workspace" id="ai-workspace" role="tabpanel" aria-labelledby="ai-tab" tabIndex={0} hidden={hidden}>
    <div className="ai-page-heading"><span><Sparkles size={18}/>AI Build</span><span className="coming-soon-badge">Tez kunda</span></div>
    <section className="ai-empty-state">
      <div className="ai-artwork" aria-hidden="true"><div className="ai-frame ai-frame-back"/><div className="ai-frame ai-frame-front"><Sparkles size={42} strokeWidth={1.3}/><span/></div><span className="ai-orbit-dot"/></div>
      <span className="ai-eyebrow">YARATISHNING YANGI USULI</span>
      <h1>AI bilan yarating</h1>
      <p>G‘oyangizdan animatsiyagacha.<br/>AI Build ustida ishlayapmiz — tez orada shu yerda.</p>
      <button className="primary-button" onClick={onManual}><ArrowLeft size={18}/>Manualga qaytish</button>
      <span className="ai-footnote">Hozircha Manual rejimida ijod qilishda davom eting.</span>
    </section>
    <div className="ai-page-footer">AlgorithAct <span>·</span> Tasavvurdan harakatga</div>
  </main>;
}
