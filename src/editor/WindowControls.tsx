import { Copy, Minus, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DesktopWindowControls, DesktopWindowState } from '../contracts';
import './window-controls.css';

export function WindowControls({ controls, onError }: { controls: DesktopWindowControls; onError: (error: unknown) => void }) {
  const [state, setState] = useState<DesktopWindowState>({ maximized: false });
  useEffect(() => {
    let active = true;
    const unsubscribe = controls.onStateChange(next => { if (active) setState(next); });
    void controls.getState().then(next => { if (active) setState(next); }).catch(onError);
    return () => { active = false; unsubscribe(); };
  }, [controls, onError]);
  return <div className="window-controls" role="group" aria-label="Oyna boshqaruvi">
    <button type="button" className="window-control" aria-label="Oynani kichraytirish" title="Kichraytirish" onClick={() => { void controls.minimize().catch(onError); }}><Minus size={15}/></button>
    <button type="button" className="window-control" aria-label={state.maximized ? 'Oynani tiklash' : 'Oynani kattalashtirish'} title={state.maximized ? 'Tiklash' : 'Kattalashtirish'} onClick={() => { void controls.toggleMaximize().catch(onError); }}>{state.maximized ? <Copy size={13}/> : <Square size={13}/>}</button>
    <button type="button" className="window-control window-close" aria-label="Ilovani yopish" title="Yopish · Alt+F4" onClick={() => { void controls.requestClose().catch(onError); }}><X size={17}/></button>
  </div>;
}

export function CloseWindowDialog({ name, dirty, exporting, busy, onCancel, onDiscard, onSave }: {
  name: string; dirty: boolean; exporting: boolean; busy: boolean;
  onCancel: () => void; onDiscard: () => void; onSave: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null), cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    cancelRef.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <div className="modal-backdrop close-window-backdrop" onPointerDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section ref={dialogRef} className="modal close-window-dialog" role="dialog" aria-modal="true" aria-labelledby="close-window-title" aria-describedby="close-window-description" aria-busy={busy} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy) onCancel(); }
      if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) { event.preventDefault(); return; }
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
      <div className="modal-eyebrow"><span className="close-dialog-dot"/> ALGORITHACT</div>
      <button type="button" className="modal-close" aria-label="Chiqishni bekor qilish" disabled={busy} onClick={onCancel}><X size={18}/></button>
      <h2 id="close-window-title">{dirty ? 'Chiqishdan oldin saqlaysizmi?' : exporting ? 'Eksportni to‘xtatasizmi?' : 'Ilovani yopasizmi?'}</h2>
      <p id="close-window-description">{dirty ? `«${name}» loyihasida saqlanmagan o‘zgarishlar bor.` : exporting ? 'Video hali tayyorlanmoqda. Ilovani yopish eksportni to‘xtatadi.' : 'Loyihangiz saqlangan. Ilovani yopishingiz mumkin.'}</p>
      {dirty && exporting && <p className="close-export-note">Ilovani yopish joriy video eksportini ham to‘xtatadi.</p>}
      <div className="close-dialog-actions">
        <button ref={cancelRef} type="button" className="secondary-button" disabled={busy} onClick={onCancel}>Bekor qilish</button>
        <button type="button" className="close-discard-button" disabled={busy} onClick={onDiscard}>{dirty ? 'Saqlamasdan chiqish' : exporting ? 'To‘xtatib chiqish' : 'Chiqish'}</button>
        {dirty && <button type="button" className="primary-button" disabled={busy} onClick={onSave}>{busy ? 'Kutilmoqda…' : 'Saqlash va chiqish'}</button>}
      </div>
    </section>
  </div>;
}
