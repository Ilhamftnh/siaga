// Shared demonstration data layer.
// The house prototype and the resident and technician apps read and write the same state.
// It is kept in the browser (localStorage) and synchronised between open tabs, so the house
// can run in one tab and the apps in another. A real deployment would replace this with a backend API.

import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { seedState, DEMO_HOME, techName, catName, STATUS } from '../data/seed.js';

const KEY = 'siaga-demo-v4';

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 4) return s;
  } catch (e) { /* storage unavailable */ }
  return seedState();
}

let seq = 0;
const uid = (p) => p + Date.now().toString(36) + (seq++).toString(36);

function notify(s, n) {
  // n.pref: which resident preference controls this notification
  if (n.pref && s.prefs[n.pref] === false) return s;
  return { ...s, notifications: [{ id: uid('N'), at: Date.now(), read: false, kind: 'info', ...n }, ...s.notifications].slice(0, 80) };
}
function logEvent(s, deviceId, text, tone) {
  return { ...s, events: [{ id: uid('E'), at: Date.now(), deviceId, text, tone }, ...s.events].slice(0, 120) };
}
function setDevice(s, id, patch) {
  return { ...s, devices: { ...s.devices, [id]: { ...s.devices[id], ...patch } } };
}
function setWo(s, id, fn) {
  return { ...s, workOrders: s.workOrders.map((w) => (w.id === id ? { ...fn(w), updated: Date.now() } : w)) };
}
const line = (w, text) => [...(w.timeline || []), { at: Date.now(), text }];
const where = (d) => d.spot.charAt(0).toLowerCase() + d.spot.slice(1);

// Resident-facing update when a job for the demo home changes
function residentUpdate(s, w, title, body) {
  if (w.home !== DEMO_HOME) return s;
  return notify(s, { title, body: `${w.id}, ${w.title.toLowerCase()}: ${body}`, kind: 'update', link: 'maintenance/' + w.id, pref: 'maintenance' });
}

function reducer(s, a) {
  switch (a.type) {
    case 'hydrate':
      return a.state;

    // ---------- house prototype (simulated hardware) ----------
    case 'sim/leak': {
      const d = s.devices[a.id];
      if (!d || d.wet === a.wet) return s;
      let n = setDevice(s, a.id, { wet: a.wet, ack: false, lastSeen: Date.now() });
      if (!d.online || !s.devices.hub.online) return n; // an offline sensor (or hub) cannot report
      if (a.wet) {
        n = logEvent(n, a.id, 'Water detected', 'bad');
        if (d.alerts) n = notify(n, { title: 'Water detected', body: `The leak sensor ${where(d)} is wet. Check the area now.`, kind: 'alert', link: 'devices/' + a.id, pref: 'leakAlerts' });
      } else {
        n = logEvent(n, a.id, 'Dry again', 'ok');
        if (d.alerts) n = notify(n, { title: 'Sensor dry again', body: `The leak sensor ${where(d)} no longer detects water.`, kind: 'info', link: 'devices/' + a.id, pref: 'leakAlerts' });
      }
      return n;
    }
    case 'sim/online': {
      const d = s.devices[a.id];
      if (!d || d.online === a.online) return s;
      let n = setDevice(s, a.id, { online: a.online, lastSeen: Date.now() });
      n = logEvent(n, a.id, a.online ? 'Back online' : 'Stopped responding', a.online ? 'ok' : 'warn');
      const label = d.kind === 'hub' ? 'The SIAGA hub' : `The ${d.name.toLowerCase()} ${where(d)}`;
      n = notify(n, a.online
        ? { title: 'Device back online', body: `${label} is reporting again.`, kind: 'info', link: 'devices/' + a.id, pref: 'device' }
        : { title: 'Device offline', body: `${label} has stopped responding. Check its power and Wi-Fi.`, kind: 'device', link: 'devices/' + a.id, pref: 'device' });
      return n;
    }
    case 'sim/crack':
      return { ...s, sim: { ...s.sim, crackMm: a.mm } };
    case 'tick': {
      const d = s.devices['crack-w3'];
      const now = Date.now();
      if (now - (s.lastTick || 0) < 1800) return s;
      let n = { ...s, lastTick: now };
      if (!d.installed || !d.online || !s.devices.hub.online) return n;
      const mm = Math.max(0, +(s.sim.crackMm - d.base).toFixed(2));
      const readings = [...d.readings, { at: now, mm }].slice(-90);
      const over = d.limit != null && mm > d.limit;
      n = setDevice(n, 'crack-w3', { readings, lastSeen: now, over });
      if (over && !d.over) {
        n = logEvent(n, 'crack-w3', `Movement ${mm.toFixed(2)} mm passed the ${d.limit} mm limit`, 'bad');
        if (d.alerts) n = notify(n, { title: 'Crack movement above limit', body: `The crack monitor at window W3 recorded ${mm.toFixed(2)} mm, above the ${d.limit} mm limit set by your technician. They have been told.`, kind: 'alert', link: 'devices/crack-w3', pref: 'device' });
        if (d.woId) n = setWo(n, d.woId, (w) => ({ ...w, priority: w.priority === 'urgent' ? 'urgent' : 'high', timeline: line(w, `Crack monitor passed the ${d.limit} mm limit; priority raised to high`) }));
      }
      if (!over && d.over) n = logEvent(n, 'crack-w3', 'Movement back under the limit', 'ok');
      return n;
    }

    // ---------- resident ----------
    case 'device/alerts': {
      return logEvent(setDevice(s, a.id, { alerts: a.on }), a.id, a.on ? 'Alerts turned on by resident' : 'Alerts turned off by resident');
    }
    case 'device/ack':
      return logEvent(setDevice(s, a.id, { ack: true }), a.id, 'Alert acknowledged by resident');
    case 'device/test': {
      const d = s.devices[a.id];
      const ok = d.online && s.devices.hub.online;
      let n = setDevice(s, a.id, ok ? { lastTest: Date.now(), lastSeen: Date.now() } : { lastTest: Date.now() });
      n = logEvent(n, a.id, ok ? 'Test passed: sensor responded' : 'Test failed: no response', ok ? 'ok' : 'warn');
      return n;
    }
    case 'notif/read':
      return { ...s, notifications: s.notifications.map((x) => (a.id === 'all' || x.id === a.id ? { ...x, read: true } : x)) };
    case 'prefs':
      return { ...s, prefs: { ...s.prefs, ...a.prefs } };
    case 'wo/create': {
      const id = 'WO-' + s.nextWo;
      const now = Date.now();
      const w = {
        id, home: DEMO_HOME, status: 'new', assignee: null, appointment: null, notes: [], findings: [], completion: null,
        followUp: null, aiAgree: null, firstResponse: null, created: now, updated: now, sample: false, ...a.wo,
        timeline: [{ at: now, text: a.wo.source === 'leak_sensor' ? 'Request sent by resident after a leak sensor alert' : 'Request sent by resident' }],
      };
      let n = { ...s, workOrders: [w, ...s.workOrders], nextWo: s.nextWo + 1, lastCreated: id };
      if (a.wo.deviceId) n = setDevice(n, a.wo.deviceId, { ack: true });
      return n;
    }
    case 'wo/cancel': {
      let n = setWo(s, a.id, (w) => ({ ...w, status: 'cancelled', timeline: line(w, 'Cancelled by resident' + (a.reason ? ': ' + a.reason : '')) }));
      return n;
    }

    // ---------- technician ----------
    case 'wo/assign': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      let n = setWo(s, a.id, (w) => ({ ...w, assignee: a.tech, status: w.status === 'new' ? 'assigned' : w.status, firstResponse: w.firstResponse || Date.now(), timeline: line(w, 'Assigned to ' + techName(a.tech)) }));
      return residentUpdate(n, w0, 'Technician assigned', `${techName(a.tech)} will handle your request.`);
    }
    case 'wo/schedule': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      const when = new Date(a.at).toLocaleString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      let n = setWo(s, a.id, (w) => ({ ...w, appointment: a.at, status: ['new', 'assigned', 'scheduled'].includes(w.status) ? 'scheduled' : w.status, firstResponse: w.firstResponse || Date.now(), timeline: line(w, (w.appointment ? 'Visit rescheduled to ' : 'Visit scheduled for ') + when) }));
      return residentUpdate(n, w0, w0.appointment ? 'Visit rescheduled' : 'Visit scheduled', `${techName(w0.assignee)} will visit on ${when}.`);
    }
    case 'wo/start': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      const n = setWo(s, a.id, (w) => ({ ...w, status: 'in_progress', followUp: null, timeline: line(w, w.status === 'follow_up' ? 'Work resumed' : 'Work started') }));
      return residentUpdate(n, w0, 'Work started', `${techName(w0.assignee)} has started work.`);
    }
    case 'wo/priority':
      return setWo(s, a.id, (w) => ({ ...w, priority: a.priority, timeline: line(w, 'Priority set to ' + a.priority) }));
    case 'wo/note':
      return setWo(s, a.id, (w) => ({ ...w, notes: [...w.notes, { at: Date.now(), by: a.by, kind: a.kind, text: a.text }], timeline: line(w, a.kind === 'action' ? 'Action recorded' : 'Inspection note added') }));
    case 'wo/aiAgree':
      return setWo(s, a.id, (w) => ({ ...w, aiAgree: a.value, timeline: line(w, 'Technician checked the AI label: ' + a.value.toLowerCase()) }));
    case 'wo/followUp': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      const n = setWo(s, a.id, (w) => ({ ...w, status: 'follow_up', followUp: { reason: a.reason, text: a.text }, timeline: line(w, 'Follow-up needed: ' + a.text) }));
      return residentUpdate(n, w0, 'Follow-up needed', a.text);
    }
    case 'wo/fitMonitor': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      let n = setDevice(s, 'crack-w3', { installed: true, limit: a.limit, base: s.sim.crackMm, readings: [{ at: Date.now(), mm: 0 }], over: false, woId: a.id, online: true, installedAt: Date.now() });
      n = logEvent(n, 'crack-w3', `Crack monitor fitted by ${techName(w0.assignee)}, alert limit ${a.limit} mm`, 'ok');
      n = setWo(n, a.id, (w) => ({ ...w, deviceId: 'crack-w3', status: 'follow_up', followUp: { reason: 'monitoring', text: `Crack monitor fitted at window W3. Alert limit ${a.limit} mm of movement.` }, timeline: line(w, `Crack monitor fitted, alert limit ${a.limit} mm`) }));
      return residentUpdate(n, w0, 'Crack monitor fitted', `A crack monitor is now measuring movement at window W3. You'll be told if it passes ${a.limit} mm.`);
    }
    case 'wo/complete': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      let n = setWo(s, a.id, (w) => ({ ...w, status: 'completed', followUp: null, completion: { at: Date.now(), by: w.assignee, summary: a.summary }, timeline: line(w, 'Completed') }));
      if (a.removeMonitor) {
        n = setDevice(n, 'crack-w3', { installed: false, limit: null, readings: [], over: false, woId: null });
        n = logEvent(n, 'crack-w3', 'Crack monitor removed', 'ok');
      }
      return residentUpdate(n, w0, 'Maintenance completed', `${techName(w0.assignee)} completed the work. ${a.summary}`);
    }
    case 'wo/decline': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      const n = setWo(s, a.id, (w) => ({ ...w, status: 'declined', completion: { at: Date.now(), by: a.by, summary: a.reason }, timeline: line(w, 'Declined: ' + a.reason) }));
      return residentUpdate(n, w0, 'Request declined', a.reason);
    }
    case 'inspection/save': {
      const id = 'INS-0' + s.nextIns;
      let n = { ...s, inspections: [{ id, at: Date.now(), ...a.record }, ...s.inspections], nextIns: s.nextIns + 1 };
      if (a.record.woId) n = setWo(n, a.record.woId, (w) => ({ ...w, findings: [...w.findings, ...a.record.items], timeline: line(w, `Inspection ${id} recorded`) }));
      return n;
    }
    case 'reset':
      return seedState();
    default:
      return s;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children, ticks = false }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) { fromOtherTab.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked: demo keeps working in memory */ }
  }, [state]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== KEY || !e.newValue) return;
      try { const s = JSON.parse(e.newValue); if (s && s.v === 4) { fromOtherTab.current = true; dispatch({ type: 'hydrate', state: s }); } } catch (err) { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!ticks) return undefined;
    const t = setInterval(() => dispatch({ type: 'tick' }), 2000);
    return () => clearInterval(t);
  }, [ticks]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

// Derived helpers shared by both apps
export function deviceState(d, hubOnline = true) {
  if (d.kind === 'crack' && !d.installed) return { key: 'unavailable', text: 'Not installed', tone: 'off' };
  if (!d.online || (d.kind !== 'hub' && !hubOnline)) return { key: 'offline', text: 'Offline', tone: 'off' };
  if (d.kind === 'leak' && d.wet) return { key: 'alert', text: 'Water detected', tone: 'bad' };
  if (d.kind === 'crack' && d.over) return { key: 'alert', text: 'Above limit', tone: 'bad' };
  if (d.kind !== 'hub' && !d.alerts) return { key: 'inactive', text: 'Alerts off', tone: 'off' };
  if (d.kind === 'leak') return { key: 'active', text: 'Dry', tone: 'ok' };
  if (d.kind === 'crack') return { key: 'active', text: 'Monitoring', tone: 'ok' };
  return { key: 'active', text: 'Online', tone: 'ok' };
}
export const lastReading = (d) => (d.readings && d.readings.length ? d.readings[d.readings.length - 1].mm : null);
export { STATUS, catName };
