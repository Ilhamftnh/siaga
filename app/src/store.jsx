import { createContext, useContext, useEffect, useReducer } from 'react';
import { seedState, DEMO_HOME } from './data/seed.js';

// One shared store for all three views. In the prototype it lives in the browser;
// in a real deployment these actions become calls to the backend API.
const KEY = 'siaga-demo-v3';

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 3) return s;
  } catch (e) { /* storage unavailable */ }
  return seedState();
}

function stamp(r, text) { return [...(r.timeline || []), { at: Date.now(), text }]; }

function reducer(s, a) {
  switch (a.type) {
    case 'leak': {
      const was = s.leaks[a.sensor];
      const leaks = { ...s.leaks, [a.sensor]: a.wet };
      let alerts = s.alerts;
      if (a.wet && !was) alerts = [{ id: 'A' + Date.now(), sensor: a.sensor, at: Date.now(), cleared: false, reportId: null }, ...alerts];
      if (!a.wet && was) alerts = alerts.map((x) => (x.sensor === a.sensor && !x.cleared ? { ...x, cleared: true, clearedAt: Date.now() } : x));
      return { ...s, leaks, alerts };
    }
    case 'crack':
      return { ...s, crackMm: a.mm };
    case 'tick': {
      const reports = s.reports.map((r) =>
        r.home === DEMO_HOME && r.status === 'monitor'
          ? { ...r, readings: [...(r.readings || []), { at: Date.now(), mm: s.crackMm }].slice(-80) }
          : r);
      return { ...s, reports };
    }
    case 'submit': {
      const id = 'R-' + String(s.nextId).padStart(4, '0');
      const r = { id, home: DEMO_HOME, created: Date.now(), status: 'submitted', ...a.report };
      r.timeline = [{ at: r.created, text: 'Submitted by homeowner' }];
      const alerts = a.alertId ? s.alerts.map((x) => (x.id === a.alertId ? { ...x, reportId: id } : x)) : s.alerts;
      return { ...s, reports: [r, ...s.reports], nextId: s.nextId + 1, alerts, lastSubmitted: id };
    }
    case 'decide':
      return {
        ...s,
        reports: s.reports.map((r) => (r.id !== a.id ? r : {
          ...r, status: a.status, decided: r.decided || Date.now(),
          limitMm: a.limitMm ?? r.limitMm, techNote: a.note ?? r.techNote,
          readings: a.status === 'monitor' ? [{ at: Date.now(), mm: s.crackMm }] : r.readings,
          timeline: stamp(r, a.log),
        })),
      };
    case 'agree':
      return { ...s, reports: s.reports.map((r) => (r.id !== a.id ? r : { ...r, techAgree: a.value, timeline: stamp(r, 'Technician feedback on AI label: ' + a.value) })) };
    case 'close':
      return { ...s, reports: s.reports.map((r) => (r.id !== a.id ? r : { ...r, status: 'closed', closeNote: a.note, timeline: stamp(r, 'Repair completed: ' + a.note) })) };
    case 'reset':
      return seedState();
    default:
      return s;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }, [state]);
  useEffect(() => { const t = setInterval(() => dispatch({ type: 'tick' }), 2000); return () => clearInterval(t); }, []);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export function fmtTime(ms) {
  const d = new Date(ms);
  return d.toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
export function fmtDuration(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' min';
  const h = m / 60;
  return h < 48 ? h.toFixed(1) + ' h' : (h / 24).toFixed(1) + ' days';
}
