import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { STATUS, PRIORITY } from '../../shared/data/seed.js';

// ---------- badges ----------
const TONE_ICON = { ok: 'check', warn: 'clock', bad: 'alert', off: null, brand: null };
export function Badge({ tone = 'off', children, icon }) {
  const ic = icon === undefined ? TONE_ICON[tone] : icon;
  return <span className={'badge t-' + tone}>{ic && <Icon name={ic} size={13} />}{children}</span>;
}
export function StatusBadge({ status }) {
  const s = STATUS[status] || { text: status, tone: 'off' };
  return <Badge tone={s.tone} icon={null}>{s.text}</Badge>;
}
export function PriorityBadge({ p }) {
  const s = PRIORITY[p] || PRIORITY.normal;
  return <span className={'prio p-' + p}><i aria-hidden="true" />{s.text}</span>;
}

// ---------- controls ----------
export function Button({ variant = 'secondary', size, icon, children, className = '', ...rest }) {
  return (
    <button type="button" className={`btn btn-${variant}${size ? ' btn-' + size : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}{children}
    </button>
  );
}

export function Switch({ checked, onChange, label, disabled, id }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} id={id}
      className="switch" disabled={disabled} onClick={() => onChange(!checked)}>
      <span className="switch-knob" />
    </button>
  );
}

export function Field({ label, hint, error, children, htmlFor, optional }) {
  return (
    <div className={'field' + (error ? ' has-error' : '')}>
      <label htmlFor={htmlFor} className="field-label">{label}{optional && <span className="optional"> (optional)</span>}</label>
      {hint && <p className="field-hint">{hint}</p>}
      {children}
      {error && <p className="field-error" role="alert"><Icon name="alert" size={14} />{error}</p>}
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([v, t, n]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {t}{n != null && <span className="count">{n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon = 'info', title, children, action }) {
  return (
    <div className="empty">
      <Icon name={icon} size={22} />
      <p className="empty-title">{title}</p>
      {children && <p className="empty-body">{children}</p>}
      {action}
    </div>
  );
}

// Workflow stepper for maintenance requests
export function Stepper({ steps, current, stopped }) {
  return (
    <ol className={'stepper' + (stopped ? ' stopped' : '')}>
      {steps.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'now' : ''}>
          <span className="dot">{i < current && <Icon name="check" size={12} />}</span>
          <span className="lbl">{s}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------- dialog ----------
export function Dialog({ open, title, children, onClose, actions, wide }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const el = ref.current;
    const first = el && el.querySelector('input, textarea, select, button:not(.dialog-x)');
    (first || el)?.focus();
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev && prev.focus && prev.focus(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'dialog' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-labelledby="dlg-title" ref={ref} tabIndex={-1}>
        <div className="dialog-head">
          <h2 id="dlg-title">{title}</h2>
          <button type="button" className="dialog-x" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="dialog-body">{children}</div>
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, title, body, confirmLabel, danger, onConfirm, onClose }) {
  return (
    <Dialog open={open} title={title} onClose={onClose}
      actions={<><Button onClick={onClose}>Go back</Button><Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}>
      <p>{body}</p>
    </Dialog>
  );
}

// ---------- toasts ----------
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={'toast t-' + t.tone}><Icon name={t.tone === 'ok' ? 'check' : 'info'} size={18} />{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// Relative-time text that refreshes itself
export function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
